/* Bobbin's Button Box - engine, controller, devices */
(function(){
'use strict';
var pl=planck,V=pl.Vec2;
var G=30,STEP=1/120,R=0.48,JUMP_V=11.2,BOING_V=16.8,MAXRUN=6.4;
var CAT={GROUND:1,PLAYER:2,OBJ:4,LEVER:8,HAND:16,ROPE:32};var BELT_SIGN=-1;
var COSTUMES=[['Sky','#4aa8ff'],['Marigold','#ff9f43'],['Mint','#3cc893'],['Berry','#ff6fa8'],['Lilac','#9f82ff'],['Sunny','#f5c518'],['Teal','#25b8c4'],['Cocoa','#b07a52']];
var cv=document.getElementById('cv'),g=cv.getContext('2d');
var W=800,H=450,DPR=1,S=40,viewW=20,viewH=11,portrait=false;
var isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
var Q=new URLSearchParams(location.search);
/* ---------------- save ---------------- */
var SKEY='bobbin-save-v1';
var save={costume:0,music:0.6,sfx:0.8,bright:1,best:{},stats:{play:0,jumps:0,prizes:0,grabs:0,boings:0,levers:0,switches:0,respawns:0,finishes:0,dist:0},resume:null,rotDismiss:false};
try{var sv=JSON.parse(localStorage.getItem(SKEY)||'null');if(sv&&typeof sv==='object'){for(var k in sv)if(k!=='stats')save[k]=sv[k];if(sv.stats)for(var k2 in sv.stats)save.stats[k2]=sv.stats[k2]}}catch(e){}
function persist(){try{localStorage.setItem(SKEY,JSON.stringify(save))}catch(e){}}
/* ---------------- input ---------------- */
var input={x:0,jump:false,grab:false,jumpQ:false,keys:{},stickX:0,lastAny:0};
function keyAxis(){var k=input.keys,a=0;if(k.ArrowLeft||k.KeyA)a-=1;if(k.ArrowRight||k.KeyD)a+=1;return a}
function refreshInput(){var ka=keyAxis();input.x=ka!==0?ka:input.stickX;
  input.jump=!!(input.keys.Space||input.keys.ArrowUp||input.keys.KeyW||input.touchJump);
  input.grab=!!(input.keys.ShiftLeft||input.keys.ShiftRight||input.keys.KeyX||input.keys.KeyK||input.touchGrab)}
window.addEventListener('keydown',function(e){if(e.repeat){if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.code)>=0)e.preventDefault();return}
  SND.unlock();input.keys[e.code]=true;input.lastAny=performance.now();
  if((e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW')&&state==='play')input.jumpQ=true;
  if((e.code==='Escape'||e.code==='KeyP')){if(state==='play')pauseGame();else if(state==='paused')resumeGame()}
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.code)>=0)e.preventDefault();refreshInput()});
window.addEventListener('keyup',function(e){input.keys[e.code]=false;refreshInput()});
window.addEventListener('blur',function(){input.keys={};input.touchJump=input.touchGrab=false;input.stickX=0;refreshInput();if(state==='play')pauseGame()});
/* touch controls */
var stickZone=document.getElementById('stickZone'),stickBase=document.getElementById('stickBase'),stickKnob=document.getElementById('stickKnob');
var jumpBtn=document.getElementById('jumpBtn'),grabBtn=document.getElementById('grabBtn');
var stick={id:null,ox:0,oy:0};
function baseHome(){stickBase.style.left='';stickBase.style.bottom='';stickBase.style.top='';stickKnob.style.transform=''}
stickZone.addEventListener('pointerdown',function(e){SND.unlock();if(stick.id!==null)return;stick.id=e.pointerId;try{stickZone.setPointerCapture(e.pointerId)}catch(_){ }
  var r=stickZone.getBoundingClientRect();stick.ox=e.clientX;stick.oy=e.clientY;
  stickBase.style.left=(e.clientX-r.left-64)+'px';stickBase.style.top=(e.clientY-r.top-64)+'px';stickBase.style.bottom='auto';stickZone.classList.add('active');moveStick(e);e.preventDefault()});
function moveStick(e){if(e.pointerId!==stick.id)return;var dx=e.clientX-stick.ox,dy=e.clientY-stick.oy,L=Math.hypot(dx,dy),m=48;
  if(L>m){dx*=m/L;dy*=m/L}stickKnob.style.transform='translate('+dx+'px,'+dy+'px)';var ax=dx/40;if(Math.abs(ax)<0.18)ax=0;input.stickX=Math.max(-1,Math.min(1,ax*1.15));refreshInput();input.lastAny=performance.now()}
stickZone.addEventListener('pointermove',function(e){moveStick(e);e.preventDefault()});
function endStick(e){if(e.pointerId!==stick.id)return;stick.id=null;input.stickX=0;stickZone.classList.remove('active');baseHome();refreshInput()}
stickZone.addEventListener('pointerup',endStick);stickZone.addEventListener('pointercancel',endStick);
function holdBtn(el,prop,onDown){var id=null;
  el.addEventListener('pointerdown',function(e){SND.unlock();id=e.pointerId;try{el.setPointerCapture(e.pointerId)}catch(_){ }input[prop]=true;el.classList.add('down');if(onDown)onDown();refreshInput();input.lastAny=performance.now();e.preventDefault()});
  function up(e){if(id!==null&&e.pointerId!==id)return;id=null;input[prop]=false;el.classList.remove('down');refreshInput()}
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up);
  el.addEventListener('contextmenu',function(e){e.preventDefault()})}
holdBtn(jumpBtn,'touchJump',function(){if(state==='play')input.jumpQ=true});
holdBtn(grabBtn,'touchGrab');
document.addEventListener('touchmove',function(e){if(!e.target.closest||!e.target.closest('.screen'))e.preventDefault()},{passive:false});
document.addEventListener('gesturestart',function(e){e.preventDefault()});
document.addEventListener('dblclick',function(e){e.preventDefault()});
/* ---------------- world state ---------------- */
var L=null; // current level runtime
var state='title',player=null,cam={x:10,y:-4,sh:0},particles=[],floaters=[],time=0,clock=0;
function newLevel(def){
  var lv={def:def,w:def.w,world:new pl.World({gravity:V(0,G)}),solids:[],objs:[],ropes:[],levers:[],gates:[],buttons:[],boings:[],springs:[],seesaws:[],bridges:[],baskets:[],
    prizes:[],cps:[],signs:[],pits:[],exit:null,spawn:{x:2,y:-1},signals:{},bounceQ:[],deco:[],t:0,got:0,cp:0,finished:false,finishT:0,top:def.top||-14,bottom:2.8};mechInit(lv);
  lv.ground=lv.world.createBody({type:'static'});lv.ground.setUserData({kind:'ground'});
  crushHook(lv);
  var gf={friction:0.7,filterCategoryBits:CAT.GROUND,filterMaskBits:0xFFFF};
  function addRect(x,y,w,h,ud){var f=lv.ground.createFixture(pl.Box(w/2,h/2,V(x+w/2,y+h/2),0),gf);f.setUserData(ud||{type:'solid'});return f}
  var b={
    spawn:function(x,y){lv.spawn={x:x,y:y}},
    ground:function(x1,x2,top){var s={x:x1,y:0,w:x2-x1,h:4,mat:'card',topCol:top};lv.solids.push(s);addRect(x1,0,x2-x1,4)},
    block:function(x,y,w,h,o){o=o||{};var s={x:x,y:y,w:w,h:h,mat:o.mat||'card',topCol:o.topCol,col:o.col,tape:o.tape,skin:o.skin};lv.solids.push(s);addRect(x,y,w,h)},
    poly:function(pts,o){o=o||{};var s={poly:pts,mat:o.mat||'card',topCol:o.topCol};lv.solids.push(s);var f=lv.ground.createFixture(pl.Polygon(pts.map(function(p){return V(p[0],p[1])})),gf);f.setUserData({type:'solid'})},
    pit:function(x,y,w,h){lv.pits.push({x:x,y:y,w:w,h:h})},
    cp:function(x,y){lv.cps.push({x:x,y:y,on:lv.cps.length===0,t:0})},
    prize:function(x,y){lv.prizes.push({x:x,y:y,got:false,k:lv.prizes.length%3,ph:Math.random()*6,id:lv.prizes.length})},
    sign:function(x,y,t){lv.signs.push({x:x,y:y,text:t})},
    exit:function(x,y){lv.exit={x:x,y:y,t:0}},
    box:function(name,x,y,w,h,o){o=o||{};var bd=lv.world.createBody({type:'dynamic',position:V(x,y),angularDamping:0.4,linearDamping:0.05});
      var f=bd.createFixture(pl.Box(w/2-0.02,h/2-0.02),{density:o.density||0.5,friction:o.kind==='sponge'?0.7:o.kind==='bag'?0.95:0.55,restitution:o.kind==='sponge'?0.12:0.02,filterCategoryBits:CAT.OBJ,filterMaskBits:CAT.GROUND|CAT.PLAYER|CAT.OBJ|CAT.HAND});
      var ob={name:name,type:'box',kind:o.kind||'card',w:w,h:h,body:bd,home:{x:x,y:y},grab:!!o.grab,heavy:!!o.heavy,zone:o.zone,ext:Math.max(w,h)/2,still:0,flash:0};
      f.setUserData({type:'obj',obj:ob,grab:!!o.grab});bd.setUserData({kind:'obj',obj:ob});lv.objs.push(ob);return ob},
    ball:function(name,x,y,r,o){o=o||{};var bd=lv.world.createBody({type:'dynamic',position:V(x,y),angularDamping:o.heavy?0.6:0.25,linearDamping:0.05,bullet:true});
      var f=bd.createFixture(pl.Circle(r),{density:o.density||0.5,friction:0.8,restitution:0.18,filterCategoryBits:CAT.OBJ,filterMaskBits:CAT.GROUND|CAT.PLAYER|CAT.OBJ|CAT.HAND});
      var ob={name:name,type:'ball',r:r,body:bd,home:{x:x,y:y},grab:!!o.grab,heavy:!!o.heavy,zone:o.zone,ext:r,still:0,flash:0};
      f.setUserData({type:'obj',obj:ob,grab:!!o.grab});bd.setUserData({kind:'obj',obj:ob});lv.objs.push(ob);return ob},
    rope:function(ax,ay,n,sl){var segs=[],prev=lv.ground,rp={ax:ax,ay:ay,segs:segs,sl:sl};
      for(var i=0;i<n;i++){var bd=lv.world.createBody({type:'dynamic',position:V(ax,ay+sl*(i+0.5)),linearDamping:0.15,angularDamping:0.6});
        var f=bd.createFixture(pl.Box(0.06,sl/2),{density:1.4,friction:0.2,filterCategoryBits:CAT.ROPE,filterMaskBits:CAT.HAND});
        f.setUserData({type:'rope',rope:rp,idx:i,grab:true});bd.setUserData({kind:'rope'});
        lv.world.createJoint(pl.RevoluteJoint({},prev,bd,V(ax,ay+sl*i)));segs.push(bd);prev=bd}
      lv.ropes.push(rp)},
    lever:function(sig,x,y,o){var bd=lv.world.createBody({type:'dynamic',position:V(x,y),angularDamping:2});
      bd.createFixture(pl.Box(0.08,0.7,V(0,-0.7),0),{density:0.5,filterCategoryBits:CAT.LEVER,filterMaskBits:CAT.HAND});
      var lvObj={sig:sig,x:x,y:y,body:bd,on:false,start:o.start||0.55,flash:0};
      var kf=bd.createFixture(pl.Circle(V(0,-1.4),0.24),{density:0.5,filterCategoryBits:CAT.LEVER,filterMaskBits:CAT.HAND});kf.setUserData({type:'lever',lever:lvObj,grab:true});
      lvObj.joint=lv.world.createJoint(pl.RevoluteJoint({enableLimit:true,lowerAngle:-0.6,upperAngle:0.6,enableMotor:true,motorSpeed:0,maxMotorTorque:1.4},lv.ground,bd,V(x,y)));
      bd.setTransform(V(x,y),lvObj.start);lv.levers.push(lvObj)},
    gate:function(sig,x,y,w,h,o){var bd=lv.world.createBody({type:'kinematic',position:V(x+w/2,y+h/2)});
      bd.createFixture(pl.Box(w/2,h/2),{friction:0.5,filterCategoryBits:CAT.GROUND,filterMaskBits:0xFFFF}).setUserData({type:'solid'});
      lv.gates.push({sig:sig,x:x,y:y,w:w,h:h,dy:o.dy,mode:o.mode||'latch',body:bd,thin:!!o.thin,open:0,wasOpen:false})},
    button:function(sig,x,y,w,o){o=o||{};var bt={sig:sig,x:x,y:y,w:w,minMass:o.minMass||0.5,heavy:!!o.heavy,pocket:!!o.pocket,pressed:false,held:0,rel:0,mass:0,dep:0,latched:false,mode:o.mode||((sig==='door1')?'hold':'latch'),secs:o.secs||6,timer:0,wob:0};lv.buttons.push(bt);return bt},
    boing:function(x,y,w,o){o=o||{};var bo={x:x,y:y,w:w,look:o.look||null,sig:o.sig||null,active:!o.sig,sq:0,pop:o.sig?0:1,fix:null};
      if(bo.active)bo.fix=addRect(x,y-0.2,w,0.2,{type:'boing',boing:bo});lv.boings.push(bo)},
    spring:function(x,y,w){var bd=lv.world.createBody({type:'dynamic',position:V(x+w/2,y+0.15),fixedRotation:true});
      bd.createFixture(pl.Box(w/2,0.15),{density:0.6,friction:0.9,filterCategoryBits:CAT.GROUND,filterMaskBits:CAT.PLAYER|CAT.OBJ|CAT.HAND}).setUserData({type:'spring'});
      lv.world.createJoint(pl.PrismaticJoint({enableLimit:true,lowerTranslation:-0.3,upperTranslation:1.3},lv.ground,bd,V(x+w/2,y+0.15),V(0,1)));
      lv.springs.push({x:x,y0:y+0.15,w:w,body:bd})},
    seesaw:function(name,px,py,left,right,o){var bd=lv.world.createBody({type:'dynamic',position:V(px,py),angularDamping:0.15});
      var fd={density:0.5,friction:0.7,filterCategoryBits:CAT.GROUND,filterMaskBits:CAT.PLAYER|CAT.OBJ|CAT.HAND};
      bd.createFixture(pl.Box((left+right)/2,0.15,V((right-left)/2,0),0),fd).setUserData({type:'plank'});
      bd.createFixture(pl.Box(0.08,0.25,V(-left+0.08,-0.4),0),fd).setUserData({type:'plank'});
      bd.createFixture(pl.Box(0.07,0.22,V(-left+1.42,-0.37),0),fd).setUserData({type:'plank'});
      var lim=o.limit||0.3;
      var j=lv.world.createJoint(pl.RevoluteJoint({enableLimit:true,lowerAngle:-lim,upperAngle:lim},lv.ground,bd,V(px,py)));
      bd.setTransform(V(px,py),-lim);
      lv.seesaws.push({name:name,px:px,py:py,left:left,right:right,body:bd,lim:lim,cool:0,wmax:0})},
    bridge:function(sig,hx,hy,len){var bd=lv.world.createBody({type:'kinematic',position:V(hx,hy),angle:-Math.PI/2});
      bd.createFixture(pl.Box(len/2,0.175,V(len/2,0.175),0),{friction:0.8,filterCategoryBits:CAT.GROUND,filterMaskBits:0xFFFF}).setUserData({type:'solid'});
      lv.bridges.push({sig:sig,x:hx,y:hy,len:len,body:bd,done:false})},
    basket:function(sig,cx,by,w,h){addRect(cx-w/2,by,w,0.12);addRect(cx-w/2,by-h,0.1,h);addRect(cx+w/2-0.1,by-h,0.1,h);
      lv.baskets.push({sig:sig,x:cx,y:by,w:w,h:h,in:0,done:false,sag:0})},
    deco:function(d){lv.deco.push(d)}
  };
  mechBuilder(lv,b,addRect);
  def.build(b);
  mechThreads(lv);
  cpSafe(lv);
  if(def.boss)bossInit(lv);
  // invisible bounds
  addRect(-1,-30,1,40,{type:'solid'});addRect(def.w,-30,1,40,{type:'solid'});addRect(-1,lv.top-1,def.w+2,1,{type:'solid'});
  lv.world.on('begin-contact',function(c){var fa=c.getFixtureA(),fb=c.getFixtureB(),ua=fa.getUserData(),ub=fb.getUserData();
    if(ua&&ua.type==='boing'&&fb.getBody().getUserData()&&fb.getBody().getUserData().kind==='obj')lv.bounceQ.push([fb.getBody(),ua.boing]);
    if(ub&&ub.type==='boing'&&fa.getBody().getUserData()&&fa.getBody().getUserData().kind==='obj')lv.bounceQ.push([fa.getBody(),ub.boing]);
    // thuds for objects landing
    var ba=fa.getBody(),bb=fb.getBody();var ob=(ba.getUserData()&&ba.getUserData().kind==='obj')?ba:(bb.getUserData()&&bb.getUserData().kind==='obj')?bb:null;
    if(ob&&!fa.isSensor()&&!fb.isSensor()){var vv=ob.getLinearVelocity();var sp=Math.hypot(vv.x,vv.y);if(sp>3)lv.thudQ=(lv.thudQ||0)+sp}});
  lv.world.on('pre-solve',function(c){var fa=c.getFixtureA(),fb=c.getFixtureB(),ua=fa.getUserData(),ub=fb.getUserData();
    if(ua&&ua.type==='belt'&&fb.getBody().getType()==='dynamic')c.setTangentSpeed(ua.belt.v*BELT_SIGN);else if(ub&&ub.type==='belt'&&fa.getBody().getType()==='dynamic')c.setTangentSpeed(-ub.belt.v*BELT_SIGN);
    if((ua&&ua.type==='jelly'&&ub&&ub.type==='player')||(ub&&ub.type==='jelly'&&ua&&ua.type==='player'))c.setRestitution(0)});
  // background decor
  lv.bg=makeBackground(def);lv.B=b;
  return lv;
}
/* ---------------- player ---------------- */
function makePlayer(lv,x,y){var bd=lv.world.createBody({type:'dynamic',position:V(x,y),fixedRotation:true,bullet:true});
  var f=bd.createFixture(pl.Circle(R),{density:1.33,friction:0,restitution:0,filterCategoryBits:CAT.PLAYER,filterMaskBits:CAT.GROUND|CAT.OBJ});f.setUserData({type:'player'});
  var hand=bd.createFixture(pl.Circle(R+0.26),{isSensor:true,filterCategoryBits:CAT.HAND,filterMaskBits:CAT.GROUND|CAT.OBJ|CAT.LEVER|CAT.ROPE});hand.setUserData({type:'hand'});
  bd.setUserData({kind:'player'});
  return {body:bd,fix:f,hand:hand,face:1,grounded:false,groundFix:null,groundBody:null,coyote:0,buffer:0,cut:true,grab:null,grabCool:0,catchCool:0,
    sx:1,sy:1,vsx:0,vsy:0,run:0,blink:0,blinkT:2,expr:'happy',exprT:0,idle:0,tuft:0,tuftV:0,lastVy:0,airT:0,stepT:0,cand:null,inv:0,boingT:0,mass:bd.getMass(),hidden:false}}
function groundCheck(p){p.grounded=false;p.groundFix=null;p.groundBody=null;var best=-1;
  for(var e=p.body.getContactList();e;e=e.next){var c=e.contact;if(!c.isTouching())continue;var fa=c.getFixtureA(),fb=c.getFixtureB();
    if(fa.isSensor()||fb.isSensor())continue;var mine=fa===p.fix,other=mine?fb:fa;if(!mine&&fb!==p.fix)continue;
    var wm=c.getWorldManifold(null);if(!wm)continue;var ny=mine?wm.normal.y:-wm.normal.y;
    if(ny>0.55&&ny>best){best=ny;p.grounded=true;p.groundFix=other;p.groundBody=other.getBody()}}}
function grabCandidates(p){var best=null,bs=1e9,pp=p.body.getPosition();
  for(var e=p.body.getContactList();e;e=e.next){var c=e.contact;if(!c.isTouching())continue;var fa=c.getFixtureA(),fb=c.getFixtureB();
    var other=fa===p.hand?fb:fb===p.hand?fa:null;if(!other)continue;var ud=other.getUserData();if(!ud||!ud.grab)continue;
    if(ud.type==='lever'&&ud.lever.on&&!ud.lever.momentary)continue;
    var bp=other.getBody().getPosition(),pt=closestPoint(other,pp);var dx=pt.x-pp.x,dy=pt.y-pp.y,d=Math.hypot(dx,dy);
    var score=d-(Math.sign(dx)===p.face?0.3:0)-(ud.type==='lever'?0.4:0);if(score<bs){bs=score;best={fix:other,ud:ud,body:other.getBody(),pt:pt}}}
  return best}
function closestPoint(fix,pp){var ud=fix.getUserData(),bd=fix.getBody();
  if(ud&&ud.type==='lever'){return bd.getWorldPoint(V(0,-1.4))}
  if(ud&&ud.type==='toggle'){return V(ud.tg.x,ud.tg.y-1.15)}
  if(ud&&ud.type==='zip'){var zc=bd.getWorldPoint(V(0,0.55)),zx=pp.x-zc.x,zy=pp.y-zc.y,zd=Math.hypot(zx,zy)||1;return V(zc.x+zx/zd*0.32,zc.y+zy/zd*0.32)}
  if(ud&&ud.type==='rope'){var lp=bd.getLocalPoint(pp);var ly=Math.max(-ud.rope.sl/2,Math.min(ud.rope.sl/2,lp.y));return bd.getWorldPoint(V(0,ly))}
  var sh=fix.getShape();if(sh.getType&&sh.getType()==='circle'){var c=bd.getPosition(),dx=pp.x-c.x,dy=pp.y-c.y,d=Math.hypot(dx,dy)||1,r=sh.getRadius();return V(c.x+dx/d*r,c.y+dy/d*r)}
  var lp2=bd.getLocalPoint(pp),ob=ud&&ud.obj;var hw=ob?ob.w/2:0.5,hh=ob?ob.h/2:0.5;return bd.getWorldPoint(V(Math.max(-hw,Math.min(hw,lp2.x)),Math.max(-hh,Math.min(hh,lp2.y))))}
function attach(p,c){var lv=L,w=lv.world,pt=c.pt;
  var j=w.createJoint(pl.RevoluteJoint({collideConnected:false},p.body,c.body,pt));
  var gr={joint:j,body:c.body,ud:c.ud,local:c.body.getLocalPoint(pt),mode:'drag',held:input.grab,rj:null,t:0};
  if(c.ud.type==='rope'){gr.mode='hang';var rp=c.ud.rope;var len=rp.sl*(c.ud.idx+0.5)+Math.hypot(pt.x-p.body.getPosition().x,pt.y-p.body.getPosition().y)+0.25;
    gr.rj=w.createJoint(pl.RopeJoint({maxLength:len,localAnchorA:V(rp.ax,rp.ay),localAnchorB:V(0,0)},lv.ground,p.body));gr.rope=rp}
  else if(c.body.getType()==='static')gr.mode='hang';
  if(c.ud.type==='lever')gr.mode='lever';
  if(c.ud.type==='zip')gr.mode='hang';
  p.grab=gr;save.stats.grabs++;SND.sfx('grab');burst(pt.x,pt.y,'fluff',5,'#fff3df');p.sx=1.12;p.sy=0.9}
function release(p,quiet){if(!p.grab)return;var w=L.world;try{w.destroyJoint(p.grab.joint)}catch(e){}if(p.grab.rj)try{w.destroyJoint(p.grab.rj)}catch(e){}
  p.grab=null;p.grabCool=0.12;if(!quiet)SND.sfx('release')}
function approach(v,t,d){return v<t?Math.min(t,v+d):Math.max(t,v-d)}
function updatePlayer(p,dt){var b=p.body,v=b.getLinearVelocity(),vx=v.x,vy=v.y,pp=b.getPosition();
  groundCheck(p);
  var wasAir=p.airT>0.06;
  if(p.grounded){if(wasAir){var imp=Math.min(1,Math.max(0,p.lastVy-3)/14);if(p.lastVy>3){p.sy=1-0.36*imp-0.07;p.sx=1+0.34*imp+0.06;p.wob=Math.max(p.wob||0,0.05+imp*0.12);SND.sfx('land',p.lastVy);burst(pp.x,pp.y+R,'dust',3+Math.round(imp*6),'#f6e3c4');if(p.lastVy>15)cam.sh=Math.min(0.25,p.lastVy*0.012)}}
    p.coyote=0.1;p.airT=0;p.noCatch=null}else{p.coyote-=dt;p.airT+=dt}
  // anti-wedge: if we are stuck motionless in the air (pinned between things), allow a jump
  if(!p.grounded&&Math.abs(vx)<0.35&&Math.abs(vy)<0.35&&!(p.grab&&p.grab.mode==='hang')){p.stuckT=(p.stuckT||0)+dt;if(p.stuckT>0.25)p.coyote=0.1}else p.stuckT=0;
  if(input.jumpQ){p.buffer=0.13;input.jumpQ=false}else p.buffer-=dt;
  p.grabCool-=dt;p.catchCool-=dt;
  // boing pads
  if(p.grounded&&p.groundFix&&p.groundFix.getUserData()&&p.groundFix.getUserData().type==='boing'&&p.boingT<=0){var bo=p.groundFix.getUserData().boing;
    if(pp.y<bo.y-0.25){vy=-(input.jump?BOING_V*1.08:BOING_V);p.cut=true;p.coyote=0;p.buffer=0;bo.sq=1;p.sy=1.35;p.sx=0.75;p.boingT=0.15;save.stats.boings++;SND.sfx('boing');
      floatText(bo.x+bo.w/2,bo.y-0.6,'Boing!','#ff7fae');burst(bo.x+bo.w/2,bo.y-0.2,'spark',8,'#ffd75e');setExpr(p,'joy',0.7)}}
  p.boingT-=dt;
  if(p.grounded&&wasAir&&p.groundFix&&p.groundFix.getUserData()&&p.groundFix.getUserData().type==='jelly'&&p.lastVy>3.5){var jl=p.groundFix.getUserData().jelly;
    vy=-Math.min(17,Math.max(6,p.lastVy*0.72+(input.jump?3.4:0)));p.cut=true;p.coyote=0;p.buffer=0;jl.sq=1;p.sy=1.3;p.sx=0.78;save.stats.boings++;SND.sfx('jelly',Math.min(20,-vy));
    burst(pp.x,pp.y+R,'spark',5,'#ffd0e0');if(-vy>12)setExpr(p,'wow',0.6)}
  var gr=p.grab;
  if(gr){gr.t+=dt;var anc=gr.body.getWorldPoint(gr.local);var dd=Math.hypot(anc.x-pp.x,anc.y-pp.y);
    if(dd>2.2){release(p)}else if(gr.mode==='hang'){if(gr.held&&!input.grab)release(p);else if(!gr.held&&input.grab)gr.held=true}
    else if(!input.grab)release(p)}
  gr=p.grab;
  if(!input.grab)p.togLatch=false;
  if(!gr&&input.grab&&p.grabCool<=0){var c=grabCandidates(p);if(c){if(c.ud.type==='toggle'){if(!p.togLatch){p.togLatch=true;mechToggle(c.ud.tg)}}else if(!(c.ud.type==='zip'&&p.togLatch))attach(p,c)}}
  else if(!gr&&!p.grounded&&p.catchCool<=0){var c2=grabCandidates(p);if(c2&&c2.ud.type==='rope'&&c2.ud.rope!==p.noCatch)attach(p,c2)}
  gr=p.grab;
  if(input.x>0.2)p.face=1;else if(input.x<-0.2)p.face=-1;
  if(gr&&gr.mode==='hang'){
    b.applyForceToCenter(V(input.x*15*p.mass,0),true);
    if(p.buffer>0){p.noCatch=gr.rope;release(p,true);vx=b.getLinearVelocity().x+input.x*2.5;vy=Math.min(b.getLinearVelocity().y,0)-JUMP_V*0.85;p.buffer=0;p.catchCool=0.4;p.cut=false;p.sy=1.25;p.sx=0.8;save.stats.jumps++;SND.sfx('jump')}
    else{vx=b.getLinearVelocity().x;vy=b.getLinearVelocity().y}
  }else{
    var heavy=gr?Math.min(1,gr.body.getType()==='dynamic'?gr.body.getMass():0):0;
    var max=MAXRUN*(gr&&gr.mode==='drag'?(0.72-0.12*heavy):1);
    var gvl=mechGroundVel(p);var target=input.x*max+(gvl?gvl.x:0),acc;
    if(p.grounded)acc=(Math.abs(target)>0.01&&(Math.sign(target)===Math.sign(vx)||Math.abs(vx)<0.3))?58:72;else acc=34;
    if(gr&&gr.mode==='lever')acc=40;
    vx=approach(vx,target,acc*dt);
    if(gvl&&gvl.y>0&&!(p.buffer>0))vy=Math.max(vy,gvl.y);
    if(p.buffer>0&&p.coyote>0){vy=-JUMP_V+(gvl&&gvl.y<0?gvl.y*0.5:0);p.coyote=0;p.buffer=0;p.cut=false;p.sy=1.28;p.sx=0.78;save.stats.jumps++;SND.sfx('jump');burst(pp.x,pp.y+R,'dust',4,'#f6e3c4');
      if(p.groundBody&&p.groundBody.getType()==='dynamic')p.groundBody.applyLinearImpulse(V(0,p.mass*JUMP_V*0.4),V(pp.x,pp.y+R),true)}
  }
  if(!p.cut&&!input.jump&&vy<-2){vy*=0.5;p.cut=true}
  if(vy>=0)p.cut=true;
  var mvv=mechPlayerVel(p,vx,vy,dt);vx=mvv[0];vy=mvv[1];
  if(!(gr&&gr.mode==='hang')&&!p.wind){if(vy>0)b.applyForceToCenter(V(0,p.mass*G*0.55),true);else if(Math.abs(vy)<2.2&&input.jump)b.applyForceToCenter(V(0,-p.mass*G*0.3),true)}
  if(vy>19)vy=19;
  b.setLinearVelocity(V(vx,vy));
  if(!p.grounded)p.lastVy=vy;else p.lastVy=0;
  // anim
  var sp=Math.abs(vx);if(p.grounded&&sp>0.5){p.run+=dt*(5+sp*2.1);p.stepT-=dt;if(p.stepT<=0){p.stepT=0.26;SND.sfx('step')}save.stats.dist+=sp*dt}else if(p.grounded)p.run*=0.85;
  var k=180,d=12;p.vsx+=((1-p.sx)*k-p.vsx*d)*dt;p.vsy+=((1-p.sy)*k-p.vsy*d)*dt;p.sx+=p.vsx*dt;p.sy+=p.vsy*dt;
  if(!p.grounded&&!(gr&&gr.mode==='hang')){var st=Math.max(-0.12,Math.min(0.14,-vy*0.012));p.sy+=(1+st-p.sy)*0.15;p.sx+=(1-st*0.8-p.sx)*0.15}
  p.tuftV+=((-vx*0.08-p.tuft)*60-p.tuftV*6)*dt;p.tuft+=p.tuftV*dt;p.tuft=Math.max(-1.2,Math.min(1.2,p.tuft));
  p.blinkT-=dt;if(p.blinkT<0){p.blink=0.12;p.blinkT=1.8+Math.random()*3}p.blink-=dt;
  if(input.x||input.jump||input.grab)p.idle=0;else p.idle+=dt;
  p.exprT-=dt;
  if(p.exprT<=0){if(gr&&gr.mode!=='hang'&&Math.abs(input.x)>0.2)p.expr='effort';else if(!p.grounded&&vy>12)p.expr='wow';else if(p.idle>9)p.expr='sleepy';else if(p.idle>6.6&&p.idle<7.6)p.expr='yawn';else p.expr='happy'}
  vLively(p,dt,pp,vx);
  p.cand=(!p.grab)?grabCandidates(p):null;
  if(p.inv>0)p.inv-=dt;
}
function setExpr(p,e,t){p.expr=e;p.exprT=t}
// v1.2 liveliness (purely visual): eyes follow nearby prizes, landing wobble, idle breathing / look-around / bounce
function vLively(p,dt,pp,vx){p.wob=Math.max(0,(p.wob||0)-dt*0.45);p.wobT=(p.wobT||0)+dt;p.lkT=(p.lkT||0)-dt;
  if(p.lkT<=0){p.lkT=0.1;var best=null,bd=25;if(L&&L.prizes)for(var i=0;i<L.prizes.length;i++){var z=L.prizes[i];if(z.got)continue;var dx=z.x-pp.x,dy=z.y-pp.y,d=dx*dx+dy*dy;if(d<bd){bd=d;best=[dx,dy]}}
    if(best){var l=Math.sqrt(bd)||1;p.lkx=best[0]/l;p.lky=best[1]/l}else if(p.idle>3.5){var a=Math.sin(p.wobT*0.7);p.lkx=a>0.4?1:a<-0.4?-1:0;p.lky=-0.2}else{p.lkx=Math.max(-1,Math.min(1,vx*0.2))*0.8;p.lky=0}}
  p.eyeX=(p.eyeX||0)+((p.lkx||0)-(p.eyeX||0))*Math.min(1,dt*8);p.eyeY=(p.eyeY||0)+((p.lky||0)-(p.eyeY||0))*Math.min(1,dt*8);
  var id=p.grounded&&!p.grab?p.idle:0;p.breath=id>2.5?Math.sin(p.wobT*2.6)*0.025*Math.min(1,(id-2.5)):0;
  var hc=id>4&&id<9?((id-4)%4.5):9;p.hopY=hc<0.55?-Math.sin(hc/0.55*Math.PI)*0.16:0}
/* ---------------- devices ---------------- */
function sig(name){return !!L.signals[name]}
function setSig(name,v,x,y){if(!!L.signals[name]===v)return;L.signals[name]=v;if(v){save.stats.switches++;SND.sfx('switch');if(x!==undefined){burst(x,y,'spark',14,'#ffd75e');burst(x,y,'ring',1,'#fff')}setExpr(player,'joy',0.8)}else SND.sfx('unswitch')}
function bodyMassIn(x1,x2,yTop,yBot){var m=0,list=[];
  var pp=player.body.getPosition();if(!player.hidden&&pp.x>x1-0.2&&pp.x<x2+0.2&&pp.y+R>yTop&&pp.y+R<yBot){m+=player.mass;list.push('player')}
  L.objs.forEach(function(o){var p=o.body.getPosition();var bot=p.y+(o.type==='ball'?o.r:o.ext);if(p.x>x1-0.15&&p.x<x2+0.15&&bot>yTop&&bot<yBot){m+=o.body.getMass();list.push(o.name)}});
  return {m:m,list:list}}
function updateDevices(dt){var lv=L;
  lv.levers.forEach(function(lo){var a=lo.body.getAngle();lo.flash=Math.max(0,lo.flash-dt);if(lo.momentary){lo.on=a<-0.2;return}
    if(!lo.on&&a<-0.22){lo.on=true;lo.flash=1;save.stats.levers++;SND.sfx('click');var tip=lo.body.getWorldPoint(V(0,-1.4));setSig(lo.sig,true,tip.x,tip.y);
      if(player.grab&&player.grab.ud.type==='lever'&&player.grab.ud.lever===lo){setTimeout(function(){if(player&&player.grab&&player.grab.ud.type==='lever')release(player,true)},250)}}});
  lv.buttons.forEach(function(bt){var r=bodyMassIn(bt.x,bt.x+bt.w,bt.y-0.5,bt.y+0.12);bt.mass=r.m;var press=r.m>=bt.minMass-1e-6;
    bt.wob=(r.m>0&&!press)?bt.wob+dt:0;
    if(bt.wob>0.4&&!bt.warned){bt.warned=true;floatText(bt.x+bt.w/2,bt.y-1.5,'Too light! Needs something heavy','#c65a00')}
    if(r.m===0)bt.warned=false;
    bt.dep+=((press?1:r.m>0?0.35:0)-bt.dep)*Math.min(1,dt*14);
    if(bt.mode==='timer'){if(press){bt.timer=bt.secs;if(!bt.pressed){bt.pressed=true;setSig(bt.sig,true,bt.x+bt.w/2,bt.y-0.3)}}else if(bt.pressed){var pv=bt.timer;bt.timer-=dt;if(Math.ceil(pv)!==Math.ceil(bt.timer))SND.sfx(bt.timer<2.5?'tock':'tick');if(bt.timer<=0){bt.pressed=false;setSig(bt.sig,false)}}}
    else if(bt.mode==='hold'){if(press){bt.rel=0.25;if(!bt.pressed){bt.pressed=true;setSig(bt.sig,true,bt.x+bt.w/2,bt.y-0.3)}}else if(bt.pressed){bt.rel-=dt;if(bt.rel<=0){bt.pressed=false;setSig(bt.sig,false)}}}
    else{if(press&&!bt.latched){bt.held+=dt;if(bt.held>0.2){bt.latched=true;bt.pressed=true;setSig(bt.sig,true,bt.x+bt.w/2,bt.y-0.3)}}else if(!press)bt.held=0}});
  lv.baskets.forEach(function(bk){var inside=false;lv.objs.forEach(function(o){if(o.type!=='ball')return;var p=o.body.getPosition();if(Math.abs(p.x-bk.x)<bk.w/2&&p.y<bk.y&&p.y>bk.y-bk.h-0.3)inside=true});
    bk.sag+=((inside?0.25:0)-bk.sag)*Math.min(1,dt*6);
    if(inside&&!bk.done){bk.in+=dt;if(bk.in>0.3){bk.done=true;setSig(bk.sig,true,bk.x,bk.y-bk.h);floatText(bk.x,bk.y-bk.h-0.8,'Swish!','#2f9e74')}}else if(!inside)bk.in=0});
  lv.gates.forEach(function(gt){var open=sig(gt.sig),bd=gt.body,p=bd.getPosition(),cy=gt.y+gt.h/2,ty=open?cy+gt.dy:cy,vy=(ty-p.y)*7;
    if(open&&!gt.wasOpen){SND.sfx('door');if(gt.thin){lv.objs.forEach(function(o){var q=o.body.getPosition();if(o.type==='ball'&&Math.abs(q.x-gt.x)<2.2&&Math.abs(q.y-gt.y-gt.h/2)<1){o.body.setLinearVelocity(V(2.6,-0.5));o.body.setAwake(true)}})}}gt.wasOpen=open;
    var lim=4;vy=Math.max(-lim,Math.min(lim,vy));if(Math.abs(ty-p.y)<0.005){vy=0;bd.setTransform(V(p.x,ty),0)}
    if(!open&&vy>0){var bot=p.y+gt.h/2;var blk=bodyMassIn(gt.x-0.3,gt.x+gt.w+0.3,bot-0.2,gt.y+gt.h+0.3);
      var pp=player.body.getPosition();var under=(pp.x>gt.x-R&&pp.x<gt.x+gt.w+R&&pp.y-R<gt.y+gt.h&&pp.y+R>bot-0.05);
      L.objs.forEach(function(o){var op=o.body.getPosition();if(op.x>gt.x-o.ext&&op.x<gt.x+gt.w+o.ext&&op.y+o.ext>bot-0.05&&op.y-o.ext<gt.y+gt.h)under=true});
      if(under)vy=0}
    bd.setLinearVelocity(V(0,vy));gt.open=Math.min(1,Math.abs(p.y-cy)/Math.abs(gt.dy))});
  lv.bridges.forEach(function(br){var a=br.body.getAngle();if(sig(br.sig)){var w=Math.max(0.35,Math.min(1.6,(0-a)*3));if(a>=-0.004){br.body.setTransform(V(br.x,br.y),0);br.body.setAngularVelocity(0);
      if(!br.done){br.done=true;SND.sfx('thud',10);cam.sh=0.15;burst(br.x+br.len,br.y,'dust',10,'#f6e3c4')}}else br.body.setAngularVelocity(w)}else br.body.setAngularVelocity(0)});
  lv.springs.forEach(function(sp){var b=sp.body,p=b.getPosition(),v=b.getLinearVelocity();var f=-b.getMass()*G-110*(p.y-sp.y0)-6*v.y;b.applyForceToCenter(V(0,f),true)});
  lv.boings.forEach(function(bo){bo.sq=Math.max(0,bo.sq-dt*3);if(bo.sig&&!bo.active&&sig(bo.sig)){bo.active=true;bo.fix=lv.ground.createFixture(pl.Box(bo.w/2,0.1,V(bo.x+bo.w/2,bo.y-0.1),0),{friction:0.7,filterCategoryBits:CAT.GROUND,filterMaskBits:0xFFFF});
      bo.fix.setUserData({type:'boing',boing:bo});burst(bo.x+bo.w/2,bo.y-0.3,'spark',12,'#7fe0c0');floatText(bo.x+bo.w/2,bo.y-1.2,'A boing pad popped up!','#2f9e74');
      lv.objs.forEach(function(o){var op=o.body.getPosition();if(op.x>bo.x-o.ext&&op.x<bo.x+bo.w+o.ext&&op.y>bo.y-2)o.body.setLinearVelocity(V(o.body.getLinearVelocity().x,-6))})}
    if(bo.active)bo.pop=Math.min(1,bo.pop+dt*4)});
  // object bounce queue
  lv.bounceQ.forEach(function(q){var b=q[0],bo=q[1];if(!bo.active)return;var p=b.getPosition(),v=b.getLinearVelocity();if(p.y<bo.y-0.2){b.setLinearVelocity(V(v.x,-Math.min(11,Math.max(6.5,Math.abs(v.y)*0.9))));bo.sq=1;SND.sfx('boing')}});
  lv.bounceQ.length=0;
  if(lv.thudQ){SND.sfx('thud',lv.thudQ);lv.thudQ=0}
  mechUpdate(lv,dt);
  // see-saw fling assist
  lv.seesaws.forEach(function(ss){var b=ss.body,a=b.getAngle(),w=b.getAngularVelocity();ss.cool-=dt;
    ss.wmax=Math.max(ss.wmax*Math.pow(0.02,dt),w);
    if(ss.cool<=0&&a>-0.12&&ss.wmax>1.0){var ball=null;lv.objs.forEach(function(o){if(o.type!=='ball'||o.heavy)return;var lp=b.getLocalPoint(o.body.getPosition());if(lp.x<-ss.left+1.6&&lp.x>-ss.left-0.4&&lp.y<0.2&&lp.y>-1.4)ball=o});
      if(ball&&!(player.grab&&player.grab.body===ball.body)&&lv.baskets.length){var bk=lv.baskets[0],bp=ball.body.getPosition(),T=1.15,tx=bk.x,ty=bk.y-bk.h-0.2;
        var vx=(tx-bp.x)/T,vy=(ty-bp.y-0.5*G*T*T)/T;ball.body.setLinearVelocity(V(vx,vy));ball.body.setAngularVelocity(6);ss.cool=1.4;ss.wmax=0;ss.fly={o:ball,t:0,T:T,tx:tx,ty:ty};
        SND.sfx('launch');burst(bp.x,bp.y,'spark',10,'#fff');floatText(bp.x,bp.y-1,'Whee!','#3a8fe0');lv.launches=(lv.launches||0)+1}}
    if(ss.fly){var fl=ss.fly;fl.t+=dt;var rem=fl.T-fl.t;if(fl.t>0.3||rem<0.4){ss.fly=null}else{var q=fl.o.body.getPosition();fl.o.body.setLinearVelocity(V((fl.tx-q.x)/rem,(fl.ty-q.y-0.5*G*rem*rem)/rem))}}
    lv.lastW=w});
}
/* ---------------- respawn / watchdog ---------------- */
function inPit(x,y){for(var i=0;i<L.pits.length;i++){var p=L.pits[i];if(x>p.x&&x<p.x+p.w&&y>p.y&&y<p.y+p.h)return true}return false}
function respawnObj(o,pos){var p=o.body.getPosition();burst(p.x,p.y,'fluff',10,'#fff3df');if(player&&player.grab&&player.grab.body===o.body)release(player,true);
  pos=pos||o.home;if(o.fill!==undefined){o.fill=0;o.full=false;var pfx=o.body.getFixtureList();pfx.setDensity(o.d0);o.body.resetMassData()}if(o.toy){o.toy.dir=o.toy.d0}
  o.body.setTransform(V(pos.x,pos.y),0);o.body.setLinearVelocity(V(0,0));o.body.setAngularVelocity(0);o.body.setAwake(true);o.still=0;o.flash=1;
  burst(pos.x,pos.y,'spark',8,'#ffd75e')}
function objRespawnPos(o){if(L.def.id===2&&o.name==='ball'&&sig('post'))return {x:25.0,y:-3.1};return o.home}
function objValid(o){var p=o.body.getPosition(),lv=L;
  if(lv.def.id===2&&o.name==='ball'){if(lv.baskets[0]&&lv.baskets[0].done&&p.y<-5)return true;
    if(p.x<24.2&&p.y<-2.4)return true; if(p.x>=23.8&&p.x<29.4&&p.y<-0.9)return true;
    var ss=lv.seesaws[0],lp=ss.body.getLocalPoint(p);if(lp.x>-ss.left-0.3&&lp.x<-ss.left+1.6&&lp.y<0.3&&lp.y>-1.5)return true;
    if(p.y<-3)return true; return false}
  if(lv.def.id===2&&o.name==='bigball'){if(p.x>60.5&&p.x<68.3&&p.y<-3.9)return true;if(p.x>=68&&p.x<79.6)return true;if(p.x>=79.6&&p.x<83&&p.y<0.2)return 'slow';return false}
  return true}
function watchdog(dt){L.objs.forEach(function(o){var p=o.body.getPosition(),v=o.body.getLinearVelocity(),sp=Math.hypot(v.x,v.y);
    o.flash=Math.max(0,o.flash-dt);
    if(mechWatch(o,dt))return;
    if(inPit(p.x,p.y)||p.y>8||p.x<-2||p.x>L.w+2||(o.zone&&(p.x<o.zone[0]||p.x>o.zone[0]+o.zone[2]||p.y<o.zone[1]||p.y>o.zone[1]+o.zone[3]))){respawnObj(o,objRespawnPos(o));return}
    var ok=objValid(o);if(player.grab&&player.grab.body===o.body){o.still=0;return}
    if(ok===true){o.still=0;return}
    if(sp<0.6)o.still+=dt;else o.still=Math.max(0,o.still-dt*0.5);
    if(o.still>(ok==='slow'?4:1.6))respawnObj(o,objRespawnPos(o))})}
// v1.2: checkpoints must never respawn Bobbin next to a drop. Surface height under x from static solids (rects + polys).
function surfAt(lv,x){var best=null;for(var i=0;i<lv.solids.length;i++){var s=lv.solids[i],y=null;
    if(s.poly){var P=s.poly;for(var k=0;k<P.length;k++){var a=P[k],c=P[(k+1)%P.length];if((a[0]-x)*(c[0]-x)<=0&&a[0]!==c[0]){var yy=a[1]+(c[1]-a[1])*(x-a[0])/(c[0]-a[0]);if(y===null||yy<y)y=yy}}}
    else if(x>=s.x&&x<=s.x+s.w)y=s.y;
    if(y!==null&&(best===null||y<best))best=y}return best}
// walk from x in direction d; distance to first drop (surface >0.3m lower or none), or Infinity if a wall/level edge comes first
function cpClear(lv,c,d){for(var t=0.05;t<=4;t+=0.05){var x=c.x+d*t;if(x<0.3||x>lv.w-0.3)return {d:Infinity,wall:t};var y=surfAt(lv,x);if(y===null||y>c.y+0.3)return {d:t};if(y<c.y-0.3)return {d:Infinity,wall:t}}return {d:Infinity}}
var CP_CLEAR=1.5;
function cpSafe(lv){lv.cpLog=[];lv.cps.forEach(function(c,i){var l=cpClear(lv,c,-1),r=cpClear(lv,c,1),x0=c.x;
  var y=surfAt(lv,c.x);if(y!==null&&Math.abs(y-c.y)<0.3)c.y=y;
  if(l.d>=CP_CLEAR&&r.d>=CP_CLEAR)return;
  // usable span on this platform; aim to sit CP_CLEAR from any drop, ~0.7 from walls
  var a=c.x-(l.d<Infinity?l.d:(l.wall||4)),bb=c.x+(r.d<Infinity?r.d:(r.wall||4));
  var M=CP_CLEAR+0.1,lo=a+(l.d<Infinity?M:0.7),hi=bb-(r.d<Infinity?M:0.7);
  var nx=lo<=hi?Math.max(lo,Math.min(hi,c.x)):(lo+hi)/2;c.x=Math.round(nx*100)/100;
  var l2=cpClear(lv,c,-1),r2=cpClear(lv,c,1);lv.cpLog.push({i:i,from:x0,to:c.x,y:c.y,before:[+l.d.toFixed(2),+r.d.toFixed(2)],after:[+l2.d.toFixed(2),+r2.d.toFixed(2)],ok:l2.d>=CP_CLEAR-0.01&&r2.d>=CP_CLEAR-0.01})})}
// v1.2: respawn grace. For ~1s after a respawn, inputs that were already held when Bobbin died are ignored until
// released and pressed again (fresh presses work immediately), so a held direction can't walk him straight off.
var RESPAWN_GRACE=1.0;
function graceInput(p,dt){if(!(p.grace>0))return null;p.grace-=dt;var g=p.gHeld,sx=input.x>0.2?1:input.x<-0.2?-1:0;
  if(g.x&&sx!==g.x)g.x=0;if(g.jump&&!input.jump)g.jump=false;if(g.grab&&!input.grab)g.grab=false;
  if(p.grace<=0||(!g.x&&!g.jump&&!g.grab)){p.grace=0;return null}
  var saved={x:input.x,jump:input.jump,grab:input.grab};if(g.x)input.x=0;if(g.jump)input.jump=false;if(g.grab)input.grab=false;return saved}
function respawnPlayer(){var p=player,b=p.body,c=L.cps[L.cp]||L.cps[0];var pp=b.getPosition();
  burst(pp.x,pp.y,'fluff',14,'#fff3df');release(p,true);b.setTransform(V(c.x,c.y-R-0.05),0);b.setLinearVelocity(V(0,0));p.inv=1;p.sy=0.6;p.sx=1.3;p.airT=0;p.lastVy=0;
  p.grace=RESPAWN_GRACE;p.gHeld={x:input.x>0.2?1:input.x<-0.2?-1:0,jump:!!input.jump,grab:!!input.grab};input.jumpQ=false;
  save.stats.respawns++;SND.sfx('respawn');burst(c.x,c.y-0.6,'spark',10,'#ffd75e');cam.x+=(c.x-cam.x)*0.6;
  // keep puzzle objects that wandered off-screen near the checkpoint sensible
}
/* ---------------- lives / squash (v1.1) ---------------- */
var LIVES=3,CRUSH_F=3.2,CRUSH_J=13,CRUSH_M=1.0,CRUSH_T=0.07;
function crushHook(lv){lv.pc=[];lv.crushT=0;lv.crushPk={f:0};lv.lives=LIVES;lv.deaths=0;lv.deathLog=[];
  lv.world.on('post-solve',function(c,imp){var p=player;if(!p||L!==lv)return;var fa=c.getFixtureA(),fb=c.getFixtureB(),mine=fa===p.fix;if(!mine&&fb!==p.fix)return;
    var other=mine?fb:fa;if(other.isSensor())return;var wm=c.getWorldManifold(null);if(!wm)return;var n=c.getManifold().pointCount,j=0,i;for(i=0;i<n;i++)j+=(imp.normalImpulses&&imp.normalImpulses[i])||0;if(j<=0)return;
    var s=mine?-1:1,sep=0;if(wm.separations)for(i=0;i<n;i++)sep=Math.min(sep,wm.separations[i]||0);lv.pc.push({nx:wm.normal.x*s,ny:wm.normal.y*s,j:j,b:other.getBody(),sep:sep})})}
function crushMover(b){if(!b||b===L.ground)return false;var t=b.getType();if(player.grab&&player.grab.body===b)return false;
  if(t==='dynamic')return true;if(t==='kinematic'){var v=b.getLinearVelocity();return Math.abs(v.x)+Math.abs(v.y)+Math.abs(b.getAngularVelocity())>0.05}return false}
function bodyName(b){var u=b&&b.getUserData();if(!u)return b&&b.getType();return (u.obj&&u.obj.name)||(u.mover&&u.mover.name)||u.name||u.kind||u.type||b.getType()}
function crushCheck(dt){var lv=L,p=player,pc=lv.pc;lv.pc=[];if(!pc||p.squash||lv.finished||p.inv>0||lv.out)return;
  var W=p.mass*G*dt,best=0,ba=null,bo=null,hit=0,polite=false,i,k;
  for(i=0;i<pc.length;i++){var a=pc[i];if(!crushMover(a.b))continue;
    for(k=0;k<pc.length;k++){var o=pc[k];if(k===i||o.b===a.b)continue;if(a.nx*o.nx+a.ny*o.ny>-0.5)continue;if(p.grab&&p.grab.body===o.b)continue;
      var jm=Math.min(a.j,o.j),f=jm/W;
      var ud=a.b.getUserData(),mv=ud&&ud.mover;if(mv&&mv.polite&&a.b.getType()==='kinematic'){if(f>0.8){politeBack(mv,a);polite=true}continue}
      if(f>best){best=f;ba=a;bo=o}
      if(jm>=CRUSH_J&&(a.b.getType()==='kinematic'||a.b.getMass()>=CRUSH_M))hit=Math.max(hit,jm)}}
  if(best>lv.crushPk.f)lv.crushPk={f:+best.toFixed(2),j:+(best*W).toFixed(2),by:bodyName(ba&&ba.b),m:ba?+ba.b.getMass().toFixed(2):0,on:bodyName(bo&&bo.b),t:+lv.t.toFixed(1)};
  if(best>CRUSH_F&&(!lv.crushPk2||best>lv.crushPk2.f)&&ba&&(ba.b.getType()==='kinematic'||ba.b.getMass()>=CRUSH_M))lv.crushPk2={f:+best.toFixed(2),by:bodyName(ba.b),t:+lv.t.toFixed(1),sus:+lv.crushT.toFixed(3)};
  if(best>CRUSH_F)lv.crushT+=dt;else lv.crushT=Math.max(0,lv.crushT-dt*2);
  if(polite){lv.politeN=(lv.politeN||0)+1}
  if(window.__bobNoCrush)return;
  if(hit||lv.crushT>=CRUSH_T)squashPlayer(ba,bo,best)}
// moving platforms (lifts, trains, spools) are padded: they back off instead of pinning Bobbin. Cupcake pistons are not.
function politeBack(mv,a){var d=0.05,p0=moverPos(mv,mv.s),pu=moverPos(mv,Math.min(mv.total,mv.s+d)),dx=pu[0]-p0[0],dy=pu[1]-p0[1];
  var sg=(dx*a.nx+dy*a.ny)<0?1:-1;mv.s=Math.max(0,Math.min(mv.total,mv.s+sg*d));if(mv.mode==='loop'){mv.dir=sg;mv.waitT=Math.max(mv.waitT,0.35)}else{mv.holdT=0.9;mv.holdDir=sg;mv.idle=0}}
function squashPlayer(a,o,f){var p=player,lv=L,pp=p.body.getPosition();if(p.squash)return;
  var vert=a?Math.abs(a.ny)>=Math.abs(a.nx)-0.15:true;p.squash={t:0,vert:vert,by:bodyName(a&&a.b),f:f};lv.crushT=0;
  release(p,true);p.body.setLinearVelocity(V(0,0));p.body.setActive(false);p.hidden=false;
  SND.sfx('squish');setExpr(p,'dizzy',3);cam.sh=Math.max(cam.sh||0,0.18);
  var fy=vert?pp.y+R*0.75:pp.y,fx=vert?pp.x:pp.x;burst(fx,fy,'dust',10,'#f6e3c4');burst(fx,pp.y-0.2,'spark',8,'#ffd75e');floatText(pp.x,pp.y-1.1,'Squish!','#e0567a')}
function squashUpdate(p,dt){var s=p.squash;s.t+=dt;var k=Math.min(1,s.t/0.09),wob=s.t>0.09?Math.sin((s.t-0.09)*22)*Math.exp(-(s.t-0.09)*7)*0.12:0;
  if(s.vert){p.sy=1-(1-0.24)*k+wob*0.5;p.sx=1+(1.85-1)*k-wob}else{p.sx=1-(1-0.3)*k+wob*0.5;p.sy=1+(1.3-1)*k-wob*0.4}
  p.expr='dizzy';p.exprT=1;p.blink=0;
  if(s.t>1.05){p.squash=null;p.body.setActive(true);p.sx=1;p.sy=1;loseLife('squash')}}
function livesHud(popIdx){var el=document.getElementById('livesHud');if(!el)return;var n=L?L.lives:LIVES;
  Array.prototype.forEach.call(el.children,function(c,i){if(i===popIdx){c.classList.remove('gone');c.classList.add('pop');setTimeout(function(){c.classList.remove('pop');c.classList.add('gone')},760)}else{c.classList.remove('pop');c.classList.toggle('gone',i>=n)}})}
function loseLife(cause){var lv=L,p=player;if(lv.out||lv.finished)return;var pp=p.body.getPosition();
  lv.deaths++;lv.deathLog.push({cause:cause,t:+lv.t.toFixed(1),x:+pp.x.toFixed(1),y:+pp.y.toFixed(1)});save.stats.deaths=(save.stats.deaths||0)+1;if(cause==='squash')save.stats.squashes=(save.stats.squashes||0)+1;
  lv.lives=Math.max(0,lv.lives-1);livesHud(lv.lives);SND.sfx('lifeLost');
  if(lv.lives<=0){outOfLives();return}
  respawnPlayer();var c=L.cps[L.cp]||L.cps[0];floatText(c.x,c.y-2.2,lv.lives===1?'Last life!':lv.lives+' lives left','#e0567a')}
function outOfLives(){var lv=L,p=player,pp=p.body.getPosition();lv.out=true;release(p,true);burst(pp.x,pp.y,'fluff',16,'#fff3df');p.hidden=true;p.body.setLinearVelocity(V(0,0));p.body.setActive(false);
  save.resume=null;persist();setTimeout(function(){if(L!==lv||!lv.out)return;state='out';touchUI.classList.add('hidden');showScreen('outLives');SND.sfx('outLives')},700)}
function resetPieces(){L.objs.forEach(function(o){respawnObj(o,objRespawnPos(o))});toast('Puzzle pieces are back where they started')}
/* ---------------- particles ---------------- */
function burst(x,y,type,n,col){for(var i=0;i<n;i++){var a=Math.random()*Math.PI*2,s=type==='dust'?1+Math.random()*2:type==='fluff'?1+Math.random()*3:2+Math.random()*4;
  particles.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-(type==='dust'?1:1.5),life:0,max:type==='ring'?0.45:0.5+Math.random()*0.5,type:type,col:col,size:type==='fluff'?0.12+Math.random()*0.14:0.06+Math.random()*0.08,rot:Math.random()*6})}
  if(particles.length>260)particles.splice(0,particles.length-260)}
function confetti(x,y,n){var cols=['#ff7fae','#ffd23f','#4fd1a5','#4aa8ff','#a98bff','#ff9f43'];for(var i=0;i<n;i++){var a=-Math.PI/2+(Math.random()-0.5)*2.2,s=5+Math.random()*7;
  particles.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0,max:1.6+Math.random(),type:'confetti',col:cols[i%cols.length],size:0.09+Math.random()*0.07,rot:Math.random()*6,vr:(Math.random()-0.5)*14})}}
function floatText(x,y,t,col){floaters.push({x:x,y:y,t:t,col:col||'#5a3a28',life:0,max:1.5})}
function updateParticles(dt){for(var i=particles.length-1;i>=0;i--){var p=particles[i];p.life+=dt;if(p.life>p.max){particles.splice(i,1);continue}
    if(p.type==='drop'){p.vy+=22*dt}else if(p.type==='confetti'){p.vy+=9*dt;p.vx*=0.985;p.vy*=0.985;p.rot+=p.vr*dt}else if(p.type==='fluff'||p.type==='dust'){p.vx*=0.94;p.vy=p.vy*0.94-0.4*dt}else{p.vy+=4*dt}
    p.x+=p.vx*dt;p.y+=p.vy*dt}
  for(var j=floaters.length-1;j>=0;j--){var f=floaters[j];f.life+=dt;f.y-=dt*0.6;if(f.life>f.max)floaters.splice(j,1)}}
/* ---------------- extra mechanics (worlds 2-6) ---------------- */
function mechInit(lv){['movers','belts','jellies','zips','toys','pulleys','balloons','fans','wheels','cans','pots','magnets','toggles','segWatch','route','threads'].forEach(function(k){lv[k]=[]})}
function moverPos(mv,s){var p=mv.path;s=Math.max(0,Math.min(mv.total,s));for(var i=0;i<mv.segs.length;i++){if(s<=mv.segs[i]||i===mv.segs.length-1){var k=mv.segs[i]?Math.min(1,s/mv.segs[i]):0;
  return [p[i][0]+(p[i+1][0]-p[i][0])*k,p[i][1]+(p[i+1][1]-p[i][1])*k]}s-=mv.segs[i]}return p[0]}
function mechBuilder(lv,b,addRect){var w=lv.world;
  b.route=function(r){lv.route.push(r);return r};
  b.setW=function(x){lv.w=x;lv.def.w=x};
  b.watch=function(fn){lv.segWatch.push(fn)};
  // kinematic platform following a path of top-centre points. modes: loop | ride | sig
  b.mover=function(name,o){var path=o.path,mw=o.w||2,mh=o.h||0.4,segs=[],tot=0;
    for(var i=1;i<path.length;i++){var l=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);segs.push(l);tot+=l}
    var mv={name:name,path:path,segs:segs,total:tot,w:mw,h:mh,speed:o.speed||2,mode:o.mode||'loop',sig:o.sig||null,wait:o.wait===undefined?0.6:o.wait,waitT:0,dir:1,s:0,
      look:o.look||'spool',polite:(o.look||'spool')!=='cupcake',holdT:0,col:o.col||'pink',ret:o.ret||2.2,idle:0,rideT:0,ridden:false,base:o.base,ph:Math.random()*6};
    var ph=o.phase||0;if(ph>1){mv.s=(2-ph)*tot;mv.dir=-1}else mv.s=ph*tot;
    var p=moverPos(mv,mv.s);var bd=w.createBody({type:'kinematic',position:V(p[0],p[1]+mh/2)});
    bd.createFixture(pl.Box(mw/2,mh/2),{friction:0.9,filterCategoryBits:CAT.GROUND,filterMaskBits:0xFFFF}).setUserData({type:'solid',mover:mv});
    mv.body=bd;bd.setUserData({kind:'mover',mover:mv});lv.movers.push(mv);return mv};
  // ferris wheel / windmill with level seats
  b.wheel=function(name,cx,cy,r,n,o){o=o||{};var wh={name:name,cx:cx,cy:cy,r:r,n:n,a:o.a0||0,speed:o.speed||0.4,sig:o.sig||null,seats:[],sw:o.seatW||1.8,look:o.look||'windmill',col:o.col||'yellow'};
    for(var i=0;i<n;i++){var a=wh.a+i*Math.PI*2/n;var bd=w.createBody({type:'kinematic',position:V(cx+Math.cos(a)*r,cy+Math.sin(a)*r+0.2)});
      bd.createFixture(pl.Box(wh.sw/2,0.2),{friction:0.9,filterCategoryBits:CAT.GROUND,filterMaskBits:0xFFFF}).setUserData({type:'solid'});bd.setUserData({kind:'seat'});wh.seats.push(bd)}
    lv.wheels.push(wh);return wh};
  // conveyor belt, top surface at y. sigMode 'rev' (signal reverses) or 'on' (signal starts it)
  b.belt=function(x,y,bw,speed,o){o=o||{};var bt={x:x,y:y,w:bw,speed:speed,v:(o.sig&&o.sigMode==='on')?0:speed,sig:o.sig||null,sigMode:o.sigMode||'rev',ph:0};
    addRect(x,y,bw,0.4,{type:'belt',belt:bt});lv.belts.push(bt);return bt};
  b.jelly=function(x,y,jw,jh,o){o=o||{};var j={x:x,y:y,w:jw,h:jh,sq:0,col:o.col||'#ff7f9f'};var f=addRect(x,y,jw,jh,{type:'jelly',jelly:j});f.setRestitution(0.72);lv.jellies.push(j);return j};
  // zip line: handle slides from (x1,y1) to (x2,y2) while held
  b.zip=function(name,x1,y1,x2,y2,o){o=o||{};var dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
    var z={name:name,x1:x1,y1:y1,x2:x2,y2:y2,len:len,ux:ux,uy:uy,speed:o.speed||6,held:false,idle:9,col:o.col||'#ff7fae'};
    var sx=x1+ux*0.5,sy=y1+uy*0.5;var bd=w.createBody({type:'dynamic',position:V(sx,sy),fixedRotation:true,linearDamping:0.3});
    bd.createFixture(pl.Circle(V(0,0.55),0.32),{density:0.6,filterCategoryBits:CAT.ROPE,filterMaskBits:CAT.HAND}).setUserData({type:'zip',zip:z,grab:true});
    z.joint=w.createJoint(pl.PrismaticJoint({enableLimit:true,lowerTranslation:0,upperTranslation:len-1.1,enableMotor:true,maxMotorForce:30,motorSpeed:0},lv.ground,bd,V(sx,sy),V(ux,uy)));
    z.body=bd;lv.zips.push(z);return z};
  b.toy=function(name,x,y,o){o=o||{};var ob=b.box(name,x,y,o.w||1.3,o.h||0.8,{kind:'toy',density:o.density||0.9,grab:true,zone:o.zone});ob.body.setFixedRotation(true);ob.body.getFixtureList().setFriction(0.05);ob.ext=(o.h||0.8)/2;
    ob.toy={speed:o.speed||1.8,dir:o.dir||1,sig:o.sig||null,stopSig:o.stopSig||null,range:o.range||null,blk:0,key:0,look:o.look||'mouse',d0:o.dir||1};lv.toys.push(ob);return ob};
  // pulley: pan A (left) goes down when heavier, pan B goes up by the same amount
  b.pulley=function(name,xa,xb,y,pw,o){o=o||{};var pu={name:name,xa:xa,xb:xb,y:y,w:pw,d:0,dmin:o.dmin||0,dmax:o.dmax||3,speed:o.speed||1.7,top:o.top===undefined?y-7:o.top,mA:0,mB:0};
    function pan(x,rims){var bd=w.createBody({type:'kinematic',position:V(x+pw/2,y+0.2)});var fd={friction:0.9,filterCategoryBits:CAT.GROUND,filterMaskBits:0xFFFF};
      bd.createFixture(pl.Box(pw/2,0.2),fd).setUserData({type:'solid'});
      if(rims){bd.createFixture(pl.Box(0.08,0.35,V(-pw/2+0.08,-0.5),0),fd).setUserData({type:'solid'});bd.createFixture(pl.Box(0.08,0.35,V(pw/2-0.08,-0.5),0),fd).setUserData({type:'solid'})}
      bd.setUserData({kind:'pan'});return bd}
    pu.A=pan(xa,!!o.rimsA);pu.B=pan(xb,!!o.rimsB);pu.rimsA=!!o.rimsA;pu.rimsB=!!o.rimsB;lv.pulleys.push(pu);return pu};
  // balloon tied to a peg at (x,y); grab it to float upward
  b.balloon=function(name,x,y,o){o=o||{};var teth=o.tether||2.2;var bd=w.createBody({type:'dynamic',position:V(x,y-teth),linearDamping:1.5,angularDamping:3});
    var f=bd.createFixture(pl.Circle(0.55),{density:0.12,friction:0.3,restitution:0.2,filterCategoryBits:CAT.OBJ,filterMaskBits:CAT.GROUND|CAT.HAND|CAT.OBJ});
    var ob={name:name,type:'balloon',r:0.55,body:bd,home:{x:x,y:y-teth},grab:true,zone:o.zone,ext:0.55,still:0,flash:0,peg:{x:x,y:y},teth:teth,col:o.col||'#ff7fae',rise:o.rise||2.4,joint:null,free:false,freeT:0};
    f.setUserData({type:'obj',obj:ob,grab:true});bd.setUserData({kind:'obj',obj:ob});lv.objs.push(ob);lv.balloons.push(ob);mechTie(lv,ob);return ob};
  // fan: wind zone x..x+fw, from y up to y-fh (dir up) or sideways
  b.fan=function(x,y,fw,fh,o){o=o||{};var fn={x:x,y:y,w:fw,h:fh,dir:o.dir||'up',power:o.power||7,sig:o.sig||null,period:o.period||0,on:true,spin:0,amt:1};lv.fans.push(fn);
    if(fn.dir==='up')addRect(x,y-0.45,fw,0.45,{type:'solid'});return fn};
  // flower pot (pushable) and planter (static) both fill with water
  b.pot=function(name,x,y,o){o=o||{};var ob=b.box(name,x,y,o.w||1.1,o.h||1.0,{kind:'pot',density:0.45,grab:true,zone:o.zone});ob.fill=0;ob.full=false;ob.sig=o.sig||null;ob.d0=0.45;lv.pots.push(ob);return ob};
  b.planter=function(sig,x,y,pw,o){o=o||{};var ph=o.h||1.2;addRect(x,y-ph,pw,ph,{type:'solid'});var pt={planter:true,sig:sig,x:x,y:y,w:pw,h:ph,fill:0,full:false};lv.pots.push(pt);return pt};
  // watering can on a tipping post: grab and pull back to pour
  b.can=function(name,x,y,o){o=o||{};b.lever('can_'+name,x,y,{start:0.5});var lo=lv.levers[lv.levers.length-1];lo.momentary=true;lo.look='can';
    var cn={name:name,lever:lo,rate:o.rate||0.42,pour:0};lv.cans.push(cn);return cn};
  b.tin=function(name,x,y,o){o=o||{};var ob=b.box(name,x,y,o.w||0.9,o.h||0.9,{kind:'tin',density:o.density||0.9,grab:true,heavy:!!o.heavy,zone:o.zone});ob.metal=true;return ob};
  b.magnet=function(name,x1,x2,y,o){o=o||{};var mg={name:name,x1:x1,x2:x2,y:y,speed:o.speed||1.6,s:o.phase?o.phase*(x2-x1):0,dir:1,wait:o.wait===undefined?0.5:o.wait,waitT:0,sig:o.sig,radius:o.radius||3.4,on:false,hold:null};
    var bd=w.createBody({type:'kinematic',position:V(x1+mg.s,y+0.3)});bd.createFixture(pl.Box(0.55,0.25),{filterCategoryBits:CAT.GROUND,filterMaskBits:CAT.OBJ}).setUserData({type:'solid'});
    mg.body=bd;lv.magnets.push(mg);return mg};
  b.toggle=function(sig,x,y,o){var tg={sig:sig,x:x,y:y,flash:0,on:false};var f=lv.ground.createFixture(pl.Circle(V(x,y-1.15),0.36),{isSensor:true,filterCategoryBits:CAT.LEVER,filterMaskBits:CAT.HAND});
    f.setUserData({type:'toggle',tg:tg,grab:true});lv.toggles.push(tg);return tg};
}
var WAPI={pos:function(){var p=player.body.getPosition();return {x:p.x,y:p.y,g:player.grounded,on:player.groundBody}},respawnPlayer:function(){respawnPlayer()},
  obj:function(n){for(var i=0;i<L.objs.length;i++)if(L.objs[i].name===n)return L.objs[i];return null},respawnObj:function(o){respawnObj(o,o.home)},
  resetLever:function(sg){L.levers.forEach(function(l){if(l.sig===sg)resetLever(l)})},pulley:function(n){for(var i=0;i<L.pulleys.length;i++)if(L.pulleys[i].name===n)return L.pulleys[i]},
  held:function(o){return !!(player.grab&&player.grab.body===o.body)},sig:function(s){return sig(s)}};
function mechTie(lv,ob){if(ob.joint)return;ob.joint=lv.world.createJoint(pl.RopeJoint({maxLength:ob.teth,localAnchorA:V(ob.peg.x,ob.peg.y),localAnchorB:V(0,0.5)},lv.ground,ob.body));ob.free=false;ob.freeT=0}
function mechUntie(lv,ob){if(ob.joint){try{lv.world.destroyJoint(ob.joint)}catch(e){}ob.joint=null}ob.free=true}
function mechThreads(lv){var src=[];
  lv.levers.forEach(function(l){if(!l.momentary)src.push({sig:l.sig,x:l.x,y:l.y-0.3})});
  lv.buttons.forEach(function(b){src.push({sig:b.sig,x:b.x+b.w/2,y:b.y-0.15})});
  lv.toggles.forEach(function(t){src.push({sig:t.sig,x:t.x,y:t.y-1.15})});
  lv.pots.forEach(function(p){if(p.planter&&p.sig)src.push({sig:p.sig,x:p.x+p.w/2,y:p.y-p.h})});
  var tg=[];lv.gates.forEach(function(g){tg.push({sig:g.sig,get:function(){var p=g.body.getPosition();return [p.x,p.y-g.h/2]}})});
  lv.movers.forEach(function(m){if(m.sig)tg.push({sig:m.sig,get:function(){var p=m.body.getPosition();return [p.x,p.y]}})});
  lv.belts.forEach(function(b){if(b.sig)tg.push({sig:b.sig,get:function(){return [b.x+b.w/2,b.y]}})});
  lv.fans.forEach(function(f){if(f.sig)tg.push({sig:f.sig,get:function(){return [f.x+f.w/2,f.dir==='up'?f.y-0.3:f.y]}})});
  lv.boings.forEach(function(b){if(b.sig)tg.push({sig:b.sig,get:function(){return [b.x+b.w/2,b.y]}})});
  lv.toys.forEach(function(o){if(o.toy.sig)tg.push({sig:o.toy.sig,get:function(){return [o.home.x,o.home.y]}})});
  lv.magnets.forEach(function(m){if(m.sig)tg.push({sig:m.sig,get:function(){var p=m.body.getPosition();return [p.x,p.y]}})});
  lv.wheels.forEach(function(m){if(m.sig)tg.push({sig:m.sig,get:function(){return [m.cx,m.cy]}})});
  lv.bridges.forEach(function(b){tg.push({sig:b.sig,get:function(){return [b.x,b.y]},skip:true})});
  tg.forEach(function(t){if(t.skip)return;src.forEach(function(s){if(s.sig===t.sig){var p=t.get();if(Math.abs(p[0]-s.x)<34)lv.threads.push({sig:s.sig,s:s,t:t})}})})}
/* ---- update (before world step) ---- */
function mechUpdate(lv,dt){
  lv.movers.forEach(function(mv){var bd=mv.body,on=!!(player&&player.grounded&&player.groundBody===bd);mv.ridden=on;var active=!mv.sig||sig(mv.sig);
    if(mv.holdT>0){mv.holdT-=dt;mv.idle=0;mv.rideT=0}
    else if(mv.mode==='loop'){if(active){if(mv.waitT>0)mv.waitT-=dt;else{mv.s+=mv.dir*mv.speed*dt;if(mv.s>=mv.total){mv.s=mv.total;mv.dir=-1;mv.waitT=mv.wait}else if(mv.s<=0){mv.s=0;mv.dir=1;mv.waitT=mv.wait}}}}
    else if(mv.mode==='ride'){if(on){mv.rideT+=dt;mv.idle=0}else{mv.rideT=0;mv.idle+=dt}var goal=mv.s;
      if(!active)goal=0;else if(on&&mv.rideT>0.3)goal=mv.total;else if(!on&&mv.idle>mv.ret)goal=0;
      var was=mv.s;mv.s=approach(mv.s,goal,mv.speed*dt);if(was===0&&mv.s>0&&mv.look==='train')SND.sfx('train')}
    else{mv.s=approach(mv.s,active?mv.total:0,mv.speed*dt)}
    var p=moverPos(mv,mv.s),c=bd.getPosition();bd.setLinearVelocity(V((p[0]-c.x)/dt,(p[1]+mv.h/2-c.y)/dt))});
  lv.wheels.forEach(function(wh){var active=!wh.sig||sig(wh.sig);wh.spin=approach(wh.spin||0,active?wh.speed:0,dt*0.5);wh.a+=wh.spin*dt;
    wh.seats.forEach(function(bd,i){var a=wh.a+i*Math.PI*2/wh.n,c=bd.getPosition();bd.setLinearVelocity(V((wh.cx+Math.cos(a)*wh.r-c.x)/dt,(wh.cy+Math.sin(a)*wh.r+0.2-c.y)/dt))})});
  lv.belts.forEach(function(bt){var tv=bt.speed;if(bt.sig){if(bt.sigMode==='rev')tv=sig(bt.sig)?-bt.speed:bt.speed;else tv=sig(bt.sig)?bt.speed:0}bt.v=approach(bt.v,tv,dt*4);bt.ph+=bt.v*dt;if(Math.abs(bt.v)>0.05)lv.objs.forEach(function(o){var q=o.body.getPosition();if(q.x>bt.x-0.6&&q.x<bt.x+bt.w+0.6&&q.y<bt.y&&q.y>bt.y-1.6&&!o.body.isAwake())o.body.setAwake(true)})});
  lv.jellies.forEach(function(j){j.sq=Math.max(0,j.sq-dt*2.2)});
  lv.zips.forEach(function(z){var held=!!(player&&player.grab&&player.grab.ud.type==='zip'&&player.grab.ud.zip===z);
    if(held&&!z.held)SND.sfx('zip');z.held=held;if(held)z.idle=0;else z.idle+=dt;
    var j=z.joint;if(held){j.setMotorSpeed(z.speed);j.setMaxMotorForce(260)}else if(z.idle>0.9){j.setMotorSpeed(-4);j.setMaxMotorForce(40)}else{j.setMotorSpeed(0);j.setMaxMotorForce(40)}});
  lv.toys.forEach(function(o){var t=o.toy,bd=o.body,v=bd.getLinearVelocity(),p=bd.getPosition();
    var active=(!t.sig||sig(t.sig))&&!(t.stopSig&&sig(t.stopSig))&&!(player.grab&&player.grab.body===bd);t.active=active;
    if(!active)return;t.key+=dt*5;if(Math.abs(v.y)<1.5)bd.setLinearVelocity(V(approach(v.x,t.dir*t.speed,40*dt),v.y));
    if(Math.abs(v.x)<0.25){t.blk+=dt;if(t.blk>0.45){t.dir=-t.dir;t.blk=0}}else t.blk=0;
    if(t.range){if(p.x<t.range[0]&&t.dir<0)t.dir=1;if(p.x>t.range[1]&&t.dir>0)t.dir=-1}
    t.wt=(t.wt||0)-dt;if(t.wt<=0){t.wt=0.55;var pp=player.body.getPosition();if(Math.abs(pp.x-p.x)<12)SND.sfx('whir')}});
  lv.pulleys.forEach(function(pu){var ta=pu.y+pu.d,tb=pu.y-pu.d;pu.mA=bodyMassIn(pu.xa,pu.xa+pu.w,ta-0.7,ta+0.15).m;pu.mB=bodyMassIn(pu.xb,pu.xb+pu.w,tb-0.7,tb+0.15).m;
    var diff=pu.mA-pu.mB,goal=diff>0.2?pu.dmax:diff<-0.2?pu.dmin:(pu.mA<0.05&&pu.mB<0.05?0:pu.d);
    pu.d=approach(pu.d,Math.max(pu.dmin,Math.min(pu.dmax,goal)),pu.speed*dt);
    var a=pu.A.getPosition(),bb=pu.B.getPosition();pu.A.setLinearVelocity(V(0,(pu.y+pu.d+0.2-a.y)/dt));pu.B.setLinearVelocity(V(0,(pu.y-pu.d+0.2-bb.y)/dt))});
  lv.balloons.forEach(function(ob){var bd=ob.body,held=!!(player.grab&&player.grab.body===bd);
    if(held&&ob.joint)mechUntie(lv,ob);if(held){var pp=player.body.getPosition(),q=bd.getPosition();bd.setLinearVelocity(V((pp.x-q.x)*8,(pp.y-1.25-q.y)*8))}bd.applyForceToCenter(V(0,-bd.getMass()*G*(held?1.0:1.6)),true)});
  lv.fans.forEach(function(fn){var on=fn.sig?sig(fn.sig):true;if(fn.period)on=on&&((lv.t%fn.period)<fn.period*0.6);fn.on=on;fn.amt=approach(fn.amt,on?1:0,dt*2.5);fn.spin+=fn.amt*dt*14;
    if(fn.amt<0.05)return;
    lv.objs.forEach(function(o){if(!(o.type==='balloon'||o.kind==='paper'||o.light))return;var p=o.body.getPosition();if(!fanIn(fn,p.x,p.y))return;var m=o.body.getMass();
      if(fn.dir==='up')o.body.applyForceToCenter(V(0,-m*G*1.5*fn.amt*fanK(fn,p.y)),true);else o.body.applyForceToCenter(V((fn.dir==='right'?1:-1)*m*fn.power*2.5*fn.amt,0),true)})});
  lv.cans.forEach(function(cn){var lo=cn.lever,a=lo.body.getAngle(),held=!!(player.grab&&player.grab.ud.type==='lever'&&player.grab.ud.lever===lo);
    if(!held)lo.body.setAngularVelocity((lo.start-a)*2.5);var tip=a<0;cn.pour=approach(cn.pour,tip?1:0,dt*4);
    if(cn.pour>0.3){var kq=lo.body.getWorldPoint(V(0,-1.4)),sp={x:kq.x-1.1,y:kq.y+0.25};if(Math.random()<dt*40)particles.push({x:sp.x+(Math.random()-0.5)*0.15,y:sp.y,vx:-0.4+Math.random()*0.3,vy:0.5,life:0,max:0.9,type:'drop',col:'#6cc6ff',size:0.07+Math.random()*0.04,rot:0});
      cn.splashT=(cn.splashT||0)-dt;if(cn.splashT<=0){cn.splashT=0.18;SND.sfx('splash',2)}
      lv.pots.forEach(function(pt){if(pt.full)return;var px,top;if(pt.planter){px=pt.x+pt.w/2;top=pt.y-pt.h}else{var q=pt.body.getPosition();px=q.x;top=q.y-pt.h/2}
        if(Math.abs(px-sp.x)<(pt.planter?pt.w/2+0.2:0.62)&&top>sp.y-0.6&&top<sp.y+5){pt.fill=Math.min(1,pt.fill+cn.rate*dt*cn.pour);
          if(!pt.planter){var fx=pt.body.getFixtureList();fx.setDensity(pt.d0*(1+pt.fill*3.6));pt.body.resetMassData()}
          if(pt.fill>=1){pt.full=true;SND.sfx('full');var cx=pt.planter?px:pt.body.getPosition().x;floatText(cx,top-0.8,'Full!','#2f8fe0');burst(cx,top-0.2,'spark',10,'#8fd3ff');if(pt.sig)setSig(pt.sig,true,cx,top)}}})}});
  lv.magnets.forEach(function(mg){var bd=mg.body,len=mg.x2-mg.x1,son=sig(mg.sig);if(son&&!mg.on&&mg.s<0.05){mg.waitT=1.3;mg.dir=1}if(!son){mg.s=Math.max(0,mg.s-mg.speed*1.4*dt);mg.dir=1}else if(mg.waitT>0)mg.waitT-=dt;else{mg.s+=mg.dir*mg.speed*dt;if(mg.s>=len){mg.s=len;mg.dir=-1;mg.waitT=mg.wait}else if(mg.s<=0){mg.s=0;mg.dir=1;mg.waitT=mg.wait}}
    var c=bd.getPosition(),mvx=(mg.x1+mg.s-c.x)/dt;bd.setLinearVelocity(V(mvx,(mg.y+0.3-c.y)/dt));var on=sig(mg.sig);if(on&&!mg.on)SND.sfx('magnet');mg.on=on;
    if(!on)return;lv.objs.forEach(function(o){if(!o.metal)return;if(player.grab&&player.grab.body===o.body)return;var p=o.body.getPosition(),tx=c.x,ty=c.y+0.25+o.h/2+0.02,dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy);
      if(d>mg.radius||p.y<c.y)return;if(d<0.5){o.body.setLinearVelocity(V(mvx+dx*12,dy*12));o.body.setAngularVelocity(-o.body.getAngle()*8)}
      else{var sp=Math.min(7,3+d*1.2);var v=o.body.getLinearVelocity();o.body.setLinearVelocity(V(v.x+(dx/d*sp-v.x)*Math.min(1,dt*8),v.y+(dy/d*sp-v.y)*Math.min(1,dt*12)))}})});
  lv.toggles.forEach(function(tg){tg.on=sig(tg.sig);tg.flash=Math.max(0,tg.flash-dt)});
  lv.segWatch.forEach(function(fn){try{fn(dt,WAPI)}catch(e){}});
}
function fanIn(fn,x,y){if(fn.dir==='up')return x>fn.x&&x<fn.x+fn.w&&y<fn.y&&y>fn.y-fn.h;return x>fn.x&&x<fn.x+fn.w&&y<fn.y&&y>fn.y-fn.h}
function fanK(fn,y){var f=(fn.y-y)/fn.h;return Math.max(0,1-f*1.12)}
function mechToggle(tg){var v=!sig(tg.sig);setSig(tg.sig,v,tg.x,tg.y-1.15);tg.flash=1;SND.sfx('toggle',v?1:0);save.stats.switches++}
function resetLever(lo){lo.on=false;lo.body.setTransform(V(lo.x,lo.y),lo.start);lo.body.setAngularVelocity(0);if(L.signals[lo.sig])setSig(lo.sig,false)}
// ground velocity under the player (moving platforms + belts)
function mechGroundVel(p){if(!p.grounded||!p.groundFix)return null;var ud=p.groundFix.getUserData();if(ud&&ud.type==='belt')return {x:ud.belt.v,y:0};
  var gb=p.groundBody;if(gb&&gb.getType()==='kinematic'){var v=gb.getLinearVelocity();return {x:v.x,y:v.y}}return null}
// velocity tweaks applied after the normal controller (balloons, fans)
function mechPlayerVel(p,vx,vy,dt){var lv=L;p.wind=false;var pp=p.body.getPosition();
  if(p.grab&&p.grab.ud.obj&&p.grab.ud.obj.type==='balloon'){var ob=p.grab.ud.obj;vy=approach(vy,-ob.rise,95*dt);p.wind=true;p.coyote=0}
  lv.fans.forEach(function(fn){if(fn.amt<0.05||!fanIn(fn,pp.x,pp.y))return;p.wind=true;
    if(fn.dir==='up'){var tgt=-fn.power*fanK(fn,pp.y)*fn.amt;if(vy>tgt)vy=approach(vy,tgt,48*dt)}else{vx+=(fn.dir==='right'?1:-1)*fn.power*2.4*fn.amt*dt}});
  return [vx,vy]}
/* ---- watchdog extras ---- */
function mechWatch(o,dt){if(o.type==='balloon'){var held=!!(player.grab&&player.grab.body===o.body);if(held){o.freeT=0;return true}
    if(o.free){o.freeT+=dt;if(o.freeT>1.1){respawnObj(o,o.home);mechTie(L,o)}return true}return true}return false}
/* ---- drawing ---- */
function mechRenderBack(g,lv,t,wl,wr){
  // signal threads
  lv.threads.forEach(function(th){var s=th.s,p=th.t.get();if(Math.max(s.x,p[0])<wl-2||Math.min(s.x,p[0])>wr+2)return;var on=sig(th.sig);
    g.beginPath();g.moveTo(s.x,s.y);var mx=(s.x+p[0])/2,my=Math.max(s.y,p[1])+0.6;g.quadraticCurveTo(mx,my,p[0],p[1]);g.save();g.setLineDash([0.18,0.12]);g.lineDashOffset=on?-t*0.8:0;
    g.strokeStyle=on?'rgba(70,200,160,0.85)':'rgba(255,120,170,0.55)';g.lineWidth=0.06;g.lineCap='round';g.stroke();g.restore()});
  lv.fans.forEach(function(fn){if(fn.x>wr||fn.x+fn.w<wl)return;if(fn.amt>0.05){g.save();g.globalAlpha=0.45*fn.amt;g.strokeStyle='#ffffff';g.lineWidth=0.06;g.lineCap='round';
      for(var i=0;i<7;i++){var k=((t*0.9+i/7)%1);if(fn.dir==='up'){var x=fn.x+0.25+(i*0.37%1)*(fn.w-0.5),y=fn.y-0.5-k*(fn.h-0.6);g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+0.18*Math.sin(t*3+i),y-0.4,x,y-0.8);g.stroke()}
        else{var y2=fn.y-0.3-(i*0.41%1)*(fn.h-0.6),x2=fn.dir==='right'?fn.x+k*fn.w:fn.x+fn.w-k*fn.w;g.beginPath();g.moveTo(x2,y2);g.lineTo(x2+(fn.dir==='right'?0.8:-0.8),y2+0.1*Math.sin(t*3+i));g.stroke()}}g.restore()}});
  lv.zips.forEach(function(z){if(Math.max(z.x1,z.x2)<wl-1||Math.min(z.x1,z.x2)>wr+1)return;g.beginPath();g.moveTo(z.x1,z.y1);g.lineTo(z.x2,z.y2);g.strokeStyle='rgba(110,70,30,0.35)';g.lineWidth=0.11;g.stroke();
    g.strokeStyle='#fffaf0';g.lineWidth=0.06;g.stroke();g.save();g.setLineDash([0.12,0.12]);g.strokeStyle=z.col;g.lineWidth=0.06;g.stroke();g.restore();
    [[z.x1,z.y1],[z.x2,z.y2]].forEach(function(e){GFX.sewButton(g,e[0],e[1],0.2,'#ffd75e',2)})});
  lv.pulleys.forEach(function(pu){if(pu.xb+pu.w<wl||pu.xa>wr)return;var ta=pu.y+pu.d,tb=pu.y-pu.d,ca=pu.xa+pu.w/2,cb=pu.xb+pu.w/2,wy=pu.top;
    g.strokeStyle='rgba(255,255,255,0.9)';g.lineWidth=0.06;[[ca,ta],[cb,tb]].forEach(function(e){g.beginPath();g.moveTo(e[0]-pu.w/2+0.15,e[1]-0.05);g.lineTo(e[0],e[1]-1.2);g.lineTo(e[0]+pu.w/2-0.15,e[1]-0.05);g.stroke();g.beginPath();g.moveTo(e[0],e[1]-1.2);g.lineTo(e[0],wy);g.stroke()});
    g.beginPath();g.moveTo(ca,wy);g.lineTo(cb,wy);g.stroke();GFX.spool(g,ca,wy,0.7,'#ff9fc4');GFX.spool(g,cb,wy,0.7,'#8fd3ff')});
}
function mechRender(g,lv,t,wl,wr,plr){
  lv.belts.forEach(function(bt){if(bt.x>wr||bt.x+bt.w<wl)return;GFX.rr(g,bt.x,bt.y,bt.w,0.4,0.2);g.fillStyle='#6b6f86';g.fill();g.save();GFX.rr(g,bt.x+0.04,bt.y+0.04,bt.w-0.08,0.32,0.16);g.clip();
    g.fillStyle=GFX.pat('felt_'+(bt.v>=0?'orange':'blue'));g.fillRect(bt.x,bt.y,bt.w,0.4);g.strokeStyle='rgba(255,255,255,0.75)';g.lineWidth=0.06;var off=((bt.ph%0.8)+0.8)%0.8,dr=bt.v>=0?1:-1;
    for(var x=bt.x-0.8+off;x<bt.x+bt.w+0.8;x+=0.8){g.beginPath();g.moveTo(x-0.12*dr,bt.y+0.1);g.lineTo(x+0.1*dr,bt.y+0.2);g.lineTo(x-0.12*dr,bt.y+0.3);g.stroke()}g.restore();
    for(var r=bt.x+0.2;r<bt.x+bt.w;r+=1.2){g.fillStyle='#c9c9d6';g.beginPath();g.arc(r,bt.y+0.2,0.09,0,7);g.fill()}});
  lv.jellies.forEach(function(j){if(j.x>wr||j.x+j.w<wl)return;var sq=j.sq*Math.sin(j.sq*14)*0.18,hh=j.h,top=j.y-sq*0.4;g.save();g.globalAlpha=0.9;GFX.rr(g,j.x-sq*0.1,top,j.w+sq*0.2,hh+(j.y-top),0.3);
    var gr=g.createLinearGradient(0,top,0,j.y+hh);gr.addColorStop(0,GFX.shade(j.col,0.35));gr.addColorStop(1,j.col);g.fillStyle=gr;g.fill();g.globalAlpha=1;g.strokeStyle=GFX.shade(j.col,-0.3);g.lineWidth=0.05;g.stroke();
    g.fillStyle='rgba(255,255,255,0.55)';GFX.rr(g,j.x+0.18,top+0.12,Math.min(0.9,j.w*0.35),0.12,0.06);g.fill();g.beginPath();g.arc(j.x+j.w-0.35,top+0.3,0.08,0,7);g.fill();g.restore()});
  lv.movers.forEach(function(mv){var p=mv.body.getPosition();if(p.x+mv.w<wl-1||p.x-mv.w>wr+1)return;drawMover(g,mv,p,t)});
  lv.wheels.forEach(function(wh){if(wh.cx+wh.r+2<wl||wh.cx-wh.r-2>wr)return;drawWheel(g,wh,t)});
  lv.pulleys.forEach(function(pu){[[pu.A,pu.rimsA],[pu.B,pu.rimsB]].forEach(function(e){var p=e[0].getPosition();if(p.x<wl-3||p.x>wr+3)return;g.save();g.translate(p.x,p.y);
    GFX.rr(g,-pu.w/2,-0.2,pu.w,0.4,0.1);g.fillStyle=GFX.pat('wood');g.fill();g.strokeStyle='rgba(140,90,40,0.7)';g.lineWidth=0.04;g.stroke();
    if(e[1]){g.fillStyle=GFX.pat('wood');GFX.rr(g,-pu.w/2,-0.85,0.16,0.7,0.05);g.fill();GFX.rr(g,pu.w/2-0.16,-0.85,0.16,0.7,0.05);g.fill()}g.restore()})});
  lv.fans.forEach(function(fn){if(fn.x>wr||fn.x+fn.w<wl)return;if(fn.dir!=='up'){g.save();g.translate(fn.dir==='right'?fn.x-0.2:fn.x+fn.w+0.2,fn.y-fn.h/2);drawFanFace(g,Math.min(1.2,fn.h/2.6),fn.spin,fn.on);g.restore();return}
    g.save();g.translate(fn.x+fn.w/2,fn.y-0.22);GFX.rr(g,-fn.w/2,-0.23,fn.w,0.46,0.12);g.fillStyle=GFX.pat('felt_sky');g.fill();g.strokeStyle='rgba(40,80,120,0.5)';g.lineWidth=0.04;g.stroke();
    g.strokeStyle='rgba(255,255,255,0.8)';g.lineWidth=0.05;for(var i=-fn.w/2+0.25;i<fn.w/2;i+=0.3){g.beginPath();g.moveTo(i,-0.18);g.lineTo(i+0.08*Math.sin(fn.spin+i*3),0.18);g.stroke()}
    g.fillStyle=fn.on?'#7fe0c0':'#ff9fc4';g.beginPath();g.arc(fn.w/2-0.22,0,0.08,0,7);g.fill();g.restore()});
  lv.magnets.forEach(function(mg){if(mg.x2<wl-2||mg.x1>wr+2)return;g.fillStyle=GFX.pat('wood');g.fillRect(mg.x1-0.8,mg.y-0.12,mg.x2-mg.x1+1.6,0.16);g.strokeStyle='rgba(140,90,40,0.6)';g.lineWidth=0.03;g.strokeRect(mg.x1-0.8,mg.y-0.12,mg.x2-mg.x1+1.6,0.16);
    var p=mg.body.getPosition();g.save();g.translate(p.x,p.y);g.fillStyle='#c9c9d6';g.fillRect(-0.06,-0.3,0.12,0.2);
    g.beginPath();g.moveTo(-0.5,-0.1);g.lineTo(0.5,-0.1);g.lineTo(0.5,0.3);g.lineTo(0.22,0.3);g.lineTo(0.22,0.05);g.lineTo(-0.22,0.05);g.lineTo(-0.22,0.3);g.lineTo(-0.5,0.3);g.closePath();g.fillStyle='#ff6f6f';g.fill();
    g.fillStyle='#e6e6ef';g.fillRect(-0.5,0.16,0.28,0.14);g.fillRect(0.22,0.16,0.28,0.14);g.strokeStyle='rgba(90,40,40,0.5)';g.lineWidth=0.03;g.strokeRect(-0.5,-0.1,1,0.4);
    if(mg.on){g.strokeStyle='rgba(255,215,94,'+(0.5+0.4*Math.sin(t*10))+')';g.lineWidth=0.05;for(var k=1;k<4;k++){g.beginPath();g.arc(0,0.35,0.25*k+((t*1.5)%0.25),0.3,Math.PI-0.3);g.stroke()}}g.restore()});
  lv.toggles.forEach(function(tg){if(tg.x<wl-1||tg.x>wr+1)return;g.fillStyle=GFX.pat('wood');g.fillRect(tg.x-0.06,tg.y-0.9,0.12,0.9);g.save();g.translate(tg.x,tg.y-1.15);
    GFX.rr(g,-0.3,-0.36,0.6,0.72,0.12);g.fillStyle=GFX.pat('felt_cream');g.fill();g.strokeStyle='rgba(110,70,30,0.55)';g.lineWidth=0.035;g.stroke();
    g.rotate(tg.on?0.5:-0.5);g.fillStyle=GFX.pat('wood');GFX.rr(g,-0.05,-0.42,0.1,0.42,0.04);g.fill();g.beginPath();g.arc(0,-0.42,0.13,0,7);g.fillStyle=tg.on?'#7fe0c0':'#ff7fae';g.fill();g.strokeStyle='#5a3a28';g.lineWidth=0.025;g.stroke();g.restore();
    GFX.wtext(g,tg.on?'ON':'OFF',tg.x,tg.y-1.75,0.26,tg.on?'#2f9e74':'#c0466f')});
  lv.pots.forEach(function(pt){if(!pt.planter||pt.x>wr||pt.x+pt.w<wl)return;drawPot(g,pt.x+pt.w/2,pt.y-pt.h/2,pt.w,pt.h,pt.fill,t,true)});
  lv.zips.forEach(function(z){var p=z.body.getPosition();if(p.x<wl-2||p.x>wr+2)return;g.save();g.translate(p.x,p.y);g.strokeStyle='#fffaf0';g.lineWidth=0.05;g.beginPath();g.moveTo(0,0);g.lineTo(0,0.3);g.stroke();
    GFX.spool(g,0,-0.02,0.3,'#ffd75e');GFX.rr(g,-0.42,0.42,0.84,0.26,0.13);g.fillStyle=GFX.pat('wood');g.fill();g.strokeStyle='rgba(140,90,40,0.7)';g.lineWidth=0.03;g.stroke();g.restore()});
  // timer buttons: countdown pie
  lv.buttons.forEach(function(bt){if(bt.mode!=='timer'||bt.x>wr||bt.x+bt.w<wl)return;var k=bt.pressed?Math.max(0,bt.timer/bt.secs):1,cx=bt.x+bt.w/2,cy=bt.y-1.25;
    g.beginPath();g.arc(cx,cy,0.36,0,7);g.fillStyle='#fffaf0';g.fill();g.strokeStyle='rgba(110,70,30,0.6)';g.lineWidth=0.04;g.stroke();
    g.beginPath();g.moveTo(cx,cy);g.arc(cx,cy,0.3,-Math.PI/2,-Math.PI/2+k*Math.PI*2);g.closePath();g.fillStyle=bt.pressed?(k<0.3?'#ffad5c':'#7fe0c0'):'#ffd75e';g.fill();
    g.strokeStyle='#5a3a28';g.lineWidth=0.04;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx,cy-0.24);g.stroke();
    g.fillStyle=GFX.pat('wood');g.fillRect(cx-0.04,cy+0.36,0.08,bt.y-0.3-cy-0.36)});
  // watering cans (drawn on lever)
  lv.cans.forEach(function(cn){var lo=cn.lever,p=lo.body.getPosition();if(p.x<wl-2||p.x>wr+2)return;var kp=lo.body.getWorldPoint(V(0,-1.4));g.save();g.translate(kp.x,kp.y);g.rotate(lo.body.getAngle()*1.2);
    GFX.rr(g,-0.42,-0.32,0.84,0.62,0.12);g.fillStyle=GFX.pat('felt_teal');g.fill();g.strokeStyle='rgba(30,80,80,0.6)';g.lineWidth=0.04;g.stroke();
    g.beginPath();g.moveTo(-0.38,0.05);g.lineTo(-0.85,-0.28);g.lineTo(-0.78,-0.36);g.lineTo(-0.36,-0.1);g.closePath();g.fill();g.stroke();
    g.beginPath();g.ellipse(-0.84,-0.33,0.1,0.06,-0.6,0,7);g.fillStyle='#c9c9d6';g.fill();
    g.beginPath();g.arc(0.25,-0.3,0.25,Math.PI,0);g.strokeStyle='#4aa8a0';g.lineWidth=0.08;g.stroke();GFX.sewButton(g,0,0,0.11,'#ffd75e',2);g.restore()});
}
function drawFanFace(g,s,spin,on){g.save();g.scale(s,s);g.beginPath();g.arc(0,0,1,0,7);g.fillStyle='#fffaf0';g.fill();g.strokeStyle='rgba(110,70,30,0.55)';g.lineWidth=0.06;g.stroke();
  g.rotate(spin);for(var i=0;i<4;i++){g.rotate(Math.PI/2);g.beginPath();g.ellipse(0.45,0,0.42,0.2,0,0,7);g.fillStyle=on?'#8fd3ff':'#d6dbe6';g.fill();g.strokeStyle='rgba(40,80,120,0.4)';g.lineWidth=0.04;g.stroke()}
  GFX.sewButton(g,0,0,0.16,on?'#7fe0c0':'#ff9fc4',2);g.restore()}
function drawPot(g,cx,cy,w,h,fill,t,big){g.save();g.translate(cx,cy);g.beginPath();g.moveTo(-w/2,-h/2+0.18);g.lineTo(w/2,-h/2+0.18);g.lineTo(w/2-0.15,h/2);g.lineTo(-w/2+0.15,h/2);g.closePath();
  g.fillStyle='#e58a5a';g.fill();g.strokeStyle='rgba(120,50,20,0.6)';g.lineWidth=0.04;g.stroke();GFX.rr(g,-w/2-0.06,-h/2,w+0.12,0.26,0.06);g.fillStyle='#f0a070';g.fill();g.stroke();
  if(fill>0){var lv2=(h-0.4)*fill;g.fillStyle='rgba(108,198,255,0.85)';g.fillRect(-w/2+0.2,h/2-0.08-lv2,w-0.4,lv2)}
  g.strokeStyle='rgba(255,255,255,0.5)';g.lineWidth=0.04;g.beginPath();g.moveTo(-w/2+0.18,-h/2+0.4);g.lineTo(-w/2+0.25,h/2-0.15);g.stroke();
  if(big){g.strokeStyle='#4fa84a';g.lineWidth=0.07;g.beginPath();g.moveTo(0,-h/2);g.quadraticCurveTo(0.1,-h/2-0.3-fill*0.4,0,-h/2-0.4-fill*0.6);g.stroke();g.fillStyle='#7fcf6a';g.beginPath();g.ellipse(0.16,-h/2-0.35-fill*0.5,0.16,0.08,-0.5,0,7);g.fill()}
  g.restore()}
function drawMover(g,mv,p,t){var w=mv.w,h=mv.h,x=p.x,y=p.y-h/2;g.save();
  if(mv.base!==undefined&&mv.base>y+h){var bx=x;if(mv.look==='cupcake'){g.strokeStyle='#9aa0b4';g.lineWidth=0.08;g.beginPath();var n=10,top=y+h;for(var i=0;i<=n;i++)g.lineTo(bx+(i%2?0.3:-0.3),top+(mv.base-top)*i/n);g.stroke()}
    else if(mv.look==='leaf'){g.strokeStyle='#4fa84a';g.lineWidth=0.18;g.beginPath();g.moveTo(bx,mv.base);g.bezierCurveTo(bx+0.4,(mv.base+y)/2+0.5,bx-0.4,(mv.base+y)/2-0.5,bx,y+h);g.stroke()}
    else{g.fillStyle=GFX.pat('wood');g.fillRect(bx-0.1,y+h,0.2,mv.base-y-h)}}
  if(mv.look==='pot'){g.strokeStyle='rgba(255,255,255,0.9)';g.lineWidth=0.05;g.beginPath();g.moveTo(x-w/2+0.1,y);g.lineTo(x,y-1.6);g.lineTo(x+w/2-0.1,y);g.moveTo(x,y-1.6);g.lineTo(x,L.top);g.stroke()}
  switch(mv.look){
    case 'spool':GFX.rr(g,x-w/2,y,w,h,0.08);g.fillStyle=GFX.pat('wood');g.fill();g.strokeStyle='rgba(140,90,40,0.7)';g.lineWidth=0.04;g.stroke();
      GFX.rr(g,x-w/2+0.18,y+0.06,w-0.36,h-0.12,0.05);g.fillStyle=GFX.pat('felt_'+mv.col);g.fill();g.strokeStyle='rgba(255,255,255,0.45)';g.lineWidth=0.025;
      for(var k=x-w/2+0.3;k<x+w/2-0.2;k+=0.12){g.beginPath();g.moveTo(k,y+0.07);g.lineTo(k+0.06,y+h-0.07);g.stroke()}break;
    case 'cupcake':g.beginPath();g.moveTo(x-w/2+0.1,y+0.15);g.lineTo(x+w/2-0.1,y+0.15);g.lineTo(x+w/2-0.3,y+h+0.25);g.lineTo(x-w/2+0.3,y+h+0.25);g.closePath();g.fillStyle=GFX.pat('felt_'+mv.col);g.fill();g.strokeStyle='rgba(110,40,70,0.5)';g.lineWidth=0.04;g.stroke();
      GFX.rr(g,x-w/2,y-0.15,w,0.35,0.17);g.fillStyle='#fff3f8';g.fill();g.stroke();for(var s2=0;s2<4;s2++){g.fillStyle=['#ff7fae','#7fe0c0','#ffd75e','#8fd3ff'][s2];g.fillRect(x-w/2+0.3+s2*(w-0.6)/4,y-0.08,0.12,0.05)}
      g.beginPath();g.arc(x,y-0.25,0.14,0,7);g.fillStyle='#ff5f7f';g.fill();break;
    case 'train':GFX.rr(g,x-w/2,y,w,h,0.08);g.fillStyle=GFX.pat('felt_'+mv.col);g.fill();g.strokeStyle='rgba(90,40,40,0.55)';g.lineWidth=0.04;g.stroke();
      for(var wx=x-w/2+0.45;wx<x+w/2;wx+=(w-0.9)/2){g.beginPath();g.arc(wx,y+h+0.08,0.24,0,7);g.fillStyle=GFX.pat('wood');g.fill();g.stroke();GFX.sewButton(g,wx,y+h+0.08,0.08,'#ffd75e',2)}
      if(mv.ridden||mv.s>0){g.fillStyle='rgba(255,255,255,0.8)';g.beginPath();g.arc(x+w/2-0.3,y-0.5-((t*2)%1)*0.6,0.18+((t*2)%1)*0.1,0,7);g.fill()}break;
    case 'pot':drawPot(g,x,y+0.45,w,0.9+h-0.4,0,t,false);break;
    case 'leaf':g.fillStyle='#7fcf6a';g.beginPath();g.ellipse(x,y+h/2,w/2,h/2+0.08,0,0,7);g.fill();g.strokeStyle='#3f8f3a';g.lineWidth=0.04;g.stroke();g.beginPath();g.moveTo(x-w/2+0.1,y+h/2);g.lineTo(x+w/2-0.1,y+h/2);g.stroke();break;
    default:GFX.rr(g,x-w/2,y,w,h,0.1);g.fillStyle=GFX.pat('felt_'+mv.col);g.fill();g.strokeStyle='rgba(60,40,30,0.4)';g.lineWidth=0.04;g.stroke();GFX.rr(g,x-w/2+0.08,y+0.07,w-0.16,h-0.14,0.06);GFX.stitch(g)}
  g.restore()}
function drawWheel(g,wh,t){var cx=wh.cx,cy=wh.cy,r=wh.r;g.save();g.translate(cx,cy);g.rotate(wh.a);
  for(var i=0;i<wh.n;i++){var a=i*Math.PI*2/wh.n;g.save();g.rotate(a);g.fillStyle=GFX.pat('wood');g.fillRect(0,-0.07,r,0.14);if(wh.look==='windmill'){g.beginPath();g.moveTo(0.6,0.08);g.lineTo(r-0.4,0.08);g.lineTo(r-0.6,0.9);g.lineTo(0.8,0.5);g.closePath();g.fillStyle=['#ff9fc4','#8fd3ff','#ffd75e','#7fe0c0','#b79cff','#ffad5c'][i%6];g.globalAlpha=0.75;g.fill();g.globalAlpha=1;g.strokeStyle='rgba(110,70,30,0.4)';g.lineWidth=0.03;g.stroke()}g.restore()}
  g.beginPath();g.arc(0,0,r,0,7);g.strokeStyle='rgba(255,255,255,0.6)';g.lineWidth=0.05;g.setLineDash([0.15,0.12]);g.stroke();g.setLineDash([]);g.restore();
  g.fillStyle=GFX.pat('wood');g.beginPath();g.moveTo(cx-0.3,cy);g.lineTo(cx-1.2,cy+r+1.6);g.lineTo(cx-0.9,cy+r+1.6);g.lineTo(cx,cy+0.4);g.lineTo(cx+0.9,cy+r+1.6);g.lineTo(cx+1.2,cy+r+1.6);g.lineTo(cx+0.3,cy);g.closePath();g.fill();
  GFX.sewButton(g,cx,cy,0.35,'#ffd75e',4);
  wh.seats.forEach(function(bd){var p=bd.getPosition();g.strokeStyle='rgba(255,255,255,0.85)';g.lineWidth=0.04;g.beginPath();g.moveTo(p.x-wh.sw/2+0.1,p.y-0.2);g.lineTo(p.x,p.y-0.9);g.lineTo(p.x+wh.sw/2-0.1,p.y-0.2);g.stroke();
    GFX.rr(g,p.x-wh.sw/2,p.y-0.2,wh.sw,0.4,0.15);g.fillStyle=GFX.pat('felt_'+wh.col);g.fill();g.strokeStyle='rgba(110,70,30,0.5)';g.lineWidth=0.04;g.stroke();GFX.rr(g,p.x-wh.sw/2+0.08,p.y-0.13,wh.sw-0.16,0.26,0.1);GFX.stitch(g)})}
function mechDrawObj(g,o,t){
  if(o.type==='balloon'){var r=o.r;g.save();g.scale(1,1.12);g.beginPath();g.arc(0,0,r,0,7);var gr=g.createRadialGradient(-r*0.35,-r*0.4,r*0.1,0,0,r);gr.addColorStop(0,GFX.shade(o.col,0.5));gr.addColorStop(1,o.col);g.fillStyle=gr;g.fill();
    g.strokeStyle=GFX.shade(o.col,-0.3);g.lineWidth=0.04;g.stroke();g.fillStyle='rgba(255,255,255,0.6)';g.beginPath();g.ellipse(-r*0.35,-r*0.4,r*0.18,r*0.1,-0.6,0,7);g.fill();g.restore();
    g.beginPath();g.moveTo(-0.08,r*1.12+0.08);g.lineTo(0.08,r*1.12+0.08);g.lineTo(0,r*1.12-0.04);g.closePath();g.fillStyle=GFX.shade(o.col,-0.2);g.fill();return true}
  if(o.kind==='toy'){var w=o.w,h=o.h,tk=o.toy;g.save();if(tk.dir<0)g.scale(-1,1);
    g.beginPath();g.ellipse(0,0.05,w/2,h/2,0,0,7);g.fillStyle=GFX.pat(tk.look==='car'?'felt_red':'felt_purple');g.fill();g.strokeStyle='rgba(60,40,60,0.5)';g.lineWidth=0.04;g.stroke();
    g.beginPath();g.arc(w*0.28,-h*0.32,0.16,0,7);g.fillStyle=GFX.pat('felt_pink');g.fill();g.beginPath();g.arc(w*0.36,-0.02,0.05,0,7);g.fillStyle='#2b2230';g.fill();g.beginPath();g.arc(w/2-0.02,0.08,0.06,0,7);g.fillStyle='#ff7fae';g.fill();
    g.strokeStyle='#ff9fc4';g.lineWidth=0.05;g.beginPath();g.moveTo(-w/2,0.1);g.quadraticCurveTo(-w/2-0.4,0.3,-w/2-0.3,-0.15);g.stroke();
    g.save();g.translate(-w*0.1,-h/2-0.08);g.rotate(tk.key);g.fillStyle='#ffd75e';g.fillRect(-0.04,-0.05,0.08,0.1);g.beginPath();g.ellipse(0,-0.16,0.14,0.07,0,0,7);g.fill();g.beginPath();g.ellipse(0,0.16,0.14,0.07,0,0,7);g.fill();g.restore();
    for(var i=-1;i<=1;i+=2){g.beginPath();g.arc(i*w*0.25,h/2,0.1,0,7);g.fillStyle='#5a3a28';g.fill()}g.restore();return true}
  if(o.kind==='pot'){drawPot(g,0,0,o.w,o.h,o.fill,t,false);return true}
  if(o.kind==='tin'){var w2=o.w,h2=o.h;GFX.rr(g,-w2/2,-h2/2,w2,h2,0.08);var gr2=g.createLinearGradient(-w2/2,0,w2/2,0);gr2.addColorStop(0,'#b8bccb');gr2.addColorStop(0.4,'#f2f3f7');gr2.addColorStop(1,'#a4a8b8');g.fillStyle=gr2;g.fill();
    g.strokeStyle='rgba(70,70,90,0.6)';g.lineWidth=0.04;g.stroke();g.fillStyle=GFX.pat('felt_'+(o.heavy?'orange':'mint'));g.fillRect(-w2/2,-h2*0.2,w2,h2*0.4);
    g.strokeStyle='rgba(70,70,90,0.35)';for(var yy=-h2/2+0.1;yy<h2/2;yy+=0.12){g.beginPath();g.moveTo(-w2/2,yy);g.lineTo(-w2/2+0.1,yy);g.stroke()}return true}
  return false}
/* ---------------- background ---------------- */
function makeBackground(def){var R=GFX.rng(def.id*977+3),far=[],mid=[],i,x;
  var span=def.w*0.3+40;
  var TH=THEMES[def.theme]||THEMES.workshop;
  if(TH.far){var fl=TH.far;for(x=-12;x<span;x+=4.5+R()*5){far.push({t:fl[Math.floor(R()*fl.length)],x:x,y:-6.5+R()*3.2,r:(R()-0.5)*0.3,s:0.8+R()*0.5,k:Math.floor(R()*4),c:Math.floor(R()*6),dir:R()<0.5?1:-1})}
  }else if(def.theme==='workshop'){
    for(x=-12;x<span;x+=5+R()*5){var t=R();far.push({t:t<0.3?'drawing':t<0.5?'scissors':t<0.68?'ruler':t<0.85?'window':'spools',x:x,y:-6.5+R()*3.2,r:(R()-0.5)*0.3,s:0.8+R()*0.5,k:Math.floor(R()*4),c:Math.floor(R()*6)})}
  }else{
    for(x=-12;x<span;x+=5+R()*6){var t2=R();far.push({t:t2<0.42?'cog':t2<0.62?'pipe':t2<0.8?'clock':'poster',x:x,y:-6.8+R()*3.4,r:R()*6,s:0.8+R()*0.7,k:Math.floor(R()*4),c:Math.floor(R()*6),dir:R()<0.5?1:-1})}
  }
  var span2=def.w*0.6+40;
  for(x=-10;x<span2;x+=2.6+R()*3){var isT=R()<0.3;mid.push({t:isT?'tree':'hill',x:x,y:0.6,s:isT?0.9+R()*0.6:1.2+R()*1.6,c:Math.floor(R()*5)})}
  var bunt=[];for(x=-8;x<span2;x+=9+R()*5)bunt.push({x:x,w:7+R()*3,y:-6.2-R()*1.4,c:Math.floor(R()*3)});
  return {far:far,mid:mid,bunt:bunt}}
var PAL=['#ff9fc4','#ffd75e','#7fe0c0','#8fd3ff','#b79cff','#ffad5c'];
var THEMES={
  workshop:{sky:['#ffe4b8','#fff3dc'],wall:'peg',wa:0.55,mid:['#a6dc84','#8ed46f','#ffd98a','#bfe7a0','#9fd6a0']},
  machine:{sky:['#d4f2ec','#fff3df'],wall:'dots',wa:0.8,mid:['#9fe6d8','#ffe08a','#a6d8ff','#c9b8ff','#8fe0c0']},
  sewing:{sky:['#ffdbe8','#fff6f0'],wall:'fabric',wa:0.75,mid:['#ffc2d6','#f7b0cb','#ffd98a','#d4c4ff','#bfe7a0'],far:['spools','button','pincushion','tape','scissors','needle','button']},
  kitchen:{sky:['#d9f1ff','#fffaf0'],wall:'gingham',wa:0.7,mid:['#ffd9a8','#ffeab0','#c7ecff','#ffd0e0','#d4f2c4'],far:['cup','plate','whisk','jar','cup','spoon','window']},
  attic:{sky:['#efe2ff','#fff4e6'],wall:'stripes',wa:0.85,mid:['#d9c8ff','#ffd6a5','#bde8ff','#ffc9de','#c8f0d8'],far:['roundwin','teddy','blocks','kite','blocks','drawing']},
  shed:{sky:['#d8f3d0','#fffbe6'],wall:'planks',wa:0.6,mid:['#a6dc84','#8ed46f','#c9e98a','#bfe7a0','#ffd98a'],far:['pot','can','seed','window','pot','seed']},
  finale:{sky:['#fff0c4','#ffe4f2'],wall:'confetti',wa:0.55,mid:['#ffc2d6','#ffe08a','#a6d8ff','#c9b8ff','#8fe0c0'],far:['spools','cup','teddy','pot','button','kite','jar','cog']}};
function drawFarItem(g,it,t){g.save();g.translate(it.x,it.y);g.rotate(it.t==='cog'?it.r+t*0.25*it.dir:it.r);g.scale(it.s,it.s);
  var INK='rgba(110,70,40,0.45)';g.lineWidth=0.05;
  switch(it.t){
    case 'drawing':g.fillStyle='rgba(110,70,30,0.15)';g.fillRect(-0.95,-0.7,2,1.5);g.fillStyle='#fffaf0';g.fillRect(-1,-0.75,2,1.5);
      g.strokeStyle=PAL[it.c];g.lineWidth=0.08;g.lineCap='round';
      if(it.k===0){g.beginPath();g.arc(0,-0.05,0.35,0,7);g.stroke();for(var a=0;a<8;a++){g.beginPath();g.moveTo(Math.cos(a*0.785)*0.5,-0.05+Math.sin(a*0.785)*0.5);g.lineTo(Math.cos(a*0.785)*0.65,-0.05+Math.sin(a*0.785)*0.65);g.stroke()}}
      else if(it.k===1){g.beginPath();g.moveTo(-0.5,0.5);g.lineTo(-0.5,0);g.lineTo(0,-0.45);g.lineTo(0.5,0);g.lineTo(0.5,0.5);g.closePath();g.stroke();g.strokeStyle=PAL[(it.c+2)%6];g.strokeRect(-0.15,0.15,0.3,0.35)}
      else if(it.k===2){g.beginPath();g.moveTo(0,0.55);g.lineTo(0,-0.05);g.stroke();g.strokeStyle=PAL[(it.c+1)%6];for(var p=0;p<5;p++){g.beginPath();g.arc(Math.cos(p*1.256)*0.2,-0.2+Math.sin(p*1.256)*0.2,0.14,0,7);g.stroke()}}
      else{g.beginPath();g.moveTo(-0.7,0.2);for(var q=0;q<6;q++)g.quadraticCurveTo(-0.6+q*0.25,q%2?0.5:-0.2,-0.45+q*0.25,0.2);g.stroke()}
      g.fillStyle='#ff6f91';g.beginPath();g.arc(0,-0.65,0.08,0,7);g.fill();break;
    case 'scissors':g.strokeStyle=PAL[it.c];g.lineWidth=0.14;g.beginPath();g.arc(-0.3,0.55,0.25,0,7);g.arc(0.3,0.55,0.25,0,7);g.stroke();
      g.fillStyle='#d6dbe6';g.beginPath();g.moveTo(-0.15,0.35);g.lineTo(0.08,-1.1);g.lineTo(0.12,0.25);g.closePath();g.fill();g.beginPath();g.moveTo(0.15,0.35);g.lineTo(-0.08,-1.1);g.lineTo(-0.12,0.25);g.closePath();g.fill();
      g.strokeStyle='rgba(110,110,130,0.5)';g.lineWidth=0.03;g.stroke();break;
    case 'ruler':g.fillStyle='rgba(110,70,30,0.15)';g.fillRect(-0.15,-1.4,0.5,2.8);g.fillStyle=GFX.pat('wood');g.fillRect(-0.2,-1.45,0.5,2.8);g.strokeStyle='rgba(110,70,30,0.5)';g.lineWidth=0.025;
      for(var y=-1.35;y<1.3;y+=0.14){g.beginPath();g.moveTo(-0.2,y);g.lineTo(-0.2+((Math.round((y+2)/0.14))%5===0?0.22:0.12),y);g.stroke()}break;
    case 'window':g.fillStyle='#fffaf0';GFX.rr(g,-1.25,-1.05,2.5,2.1,0.12);g.fill();var sk=g.createLinearGradient(0,-0.9,0,0.9);sk.addColorStop(0,'#9fdcff');sk.addColorStop(1,'#e6f7ff');g.fillStyle=sk;g.fillRect(-1.08,-0.88,2.16,1.76);
      g.fillStyle='#fff';[[-0.5,-0.3,0.25],[-0.25,-0.35,0.3],[0.05,-0.3,0.22],[0.45,0.25,0.2],[0.65,0.22,0.24]].forEach(function(c){g.beginPath();g.arc(c[0],c[1],c[2],0,7);g.fill()});
      g.fillStyle='#ffd75e';g.beginPath();g.arc(0.6,-0.5,0.22,0,7);g.fill();g.fillStyle='#fffaf0';g.fillRect(-0.04,-0.9,0.08,1.8);g.fillRect(-1.08,-0.04,2.16,0.08);
      g.fillStyle=GFX.pat('felt_pink');g.fillRect(-1.45,-1.2,0.4,2.3);g.fillRect(1.05,-1.2,0.4,2.3);break;
    case 'spools':g.fillStyle=GFX.pat('wood');g.fillRect(-1.3,0.45,2.6,0.16);for(var s2=0;s2<3;s2++)GFX.spool(g,-0.8+s2*0.8,0.1,0.65,PAL[(it.c+s2)%6]);break;
    case 'cog':var n=10,r1=1,r2=1.25;g.beginPath();for(var k=0;k<n*2;k++){var a1=k*Math.PI/n,rr2=k%2?r1:r2;g.lineTo(Math.cos(a1-0.12)*rr2,Math.sin(a1-0.12)*rr2);g.lineTo(Math.cos(a1+0.12)*rr2,Math.sin(a1+0.12)*rr2)}g.closePath();
      g.fillStyle=it.c%2?GFX.pat('card'):PAL[it.c];g.fill();g.strokeStyle=INK;g.stroke();g.beginPath();g.arc(0,0,0.35,0,7);g.fillStyle='rgba(255,250,240,0.8)';g.fill();g.stroke();
      g.fillStyle='#c9c9d6';g.beginPath();g.arc(0,0,0.12,0,7);g.fill();break;
    case 'pipe':g.strokeStyle=PAL[it.c];g.lineWidth=0.45;g.lineCap='round';g.beginPath();g.moveTo(-2,-1.5);g.lineTo(-2,0);g.quadraticCurveTo(-2,0.8,-1.2,0.8);g.lineTo(1.6,0.8);g.stroke();
      g.strokeStyle='rgba(255,255,255,0.4)';g.lineWidth=0.1;g.stroke();g.fillStyle='#c9c9d6';g.fillRect(-0.3,0.5,0.25,0.6);break;
    case 'clock':g.fillStyle=PAL[it.c];g.beginPath();g.arc(0,0,0.85,0,7);g.fill();g.fillStyle='#fffaf0';g.beginPath();g.arc(0,0,0.68,0,7);g.fill();g.strokeStyle='#5a3a28';g.lineWidth=0.06;
      g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(t*0.5)*0.45,Math.sin(t*0.5)*0.45);g.moveTo(0,0);g.lineTo(Math.cos(t*0.05)*0.3,Math.sin(t*0.05)*0.3);g.stroke();break;
    case 'button':GFX.sewButton(g,0,0,0.7,PAL[it.c],4);break;
    case 'pincushion':g.fillStyle='#ff7f7f';g.beginPath();g.ellipse(0,0,0.9,0.7,0,0,7);g.fill();g.strokeStyle='rgba(140,40,40,0.4)';g.lineWidth=0.05;for(var pc=-2;pc<=2;pc++){g.beginPath();g.moveTo(pc*0.3,-0.68);g.quadraticCurveTo(pc*0.36,0,pc*0.3,0.68);g.stroke()}
      for(var pn=0;pn<5;pn++){var pa=-2.4+pn*0.45;g.strokeStyle='#c9c9d6';g.beginPath();g.moveTo(Math.cos(pa)*0.6,Math.sin(pa)*0.5);g.lineTo(Math.cos(pa)*1.2,Math.sin(pa)*1.0);g.stroke();g.fillStyle=PAL[(it.c+pn)%6];g.beginPath();g.arc(Math.cos(pa)*1.2,Math.sin(pa)*1.0,0.12,0,7);g.fill()}
      g.fillStyle='#7fcf6a';g.beginPath();g.ellipse(0,-0.7,0.3,0.12,0,0,7);g.fill();break;
    case 'tape':g.fillStyle='#ffd75e';g.beginPath();g.arc(0,0,0.75,0,7);g.fill();g.strokeStyle='rgba(110,70,30,0.4)';g.lineWidth=0.05;g.stroke();g.fillStyle='#fffaf0';g.beginPath();g.arc(0,0,0.25,0,7);g.fill();
      g.fillStyle='#ffe59a';g.fillRect(0,0.55,2.2,0.3);g.strokeStyle='rgba(110,70,30,0.5)';g.lineWidth=0.025;for(var tx=0.1;tx<2.2;tx+=0.15){g.beginPath();g.moveTo(tx,0.55);g.lineTo(tx,0.65);g.stroke()}break;
    case 'needle':g.strokeStyle='#b8bccb';g.lineWidth=0.09;g.beginPath();g.moveTo(-1.2,0.8);g.lineTo(1.1,-0.9);g.stroke();g.strokeStyle=PAL[it.c];g.lineWidth=0.05;g.beginPath();g.moveTo(1.0,-0.8);g.bezierCurveTo(1.6,-0.2,0.2,0.4,0.8,1.0);g.stroke();break;
    case 'cup':g.fillStyle=PAL[it.c];g.beginPath();g.moveTo(-0.7,-0.4);g.lineTo(0.7,-0.4);g.quadraticCurveTo(0.65,0.5,0,0.55);g.quadraticCurveTo(-0.65,0.5,-0.7,-0.4);g.fill();g.strokeStyle='rgba(110,70,30,0.35)';g.lineWidth=0.05;g.stroke();
      g.beginPath();g.arc(0.75,0,0.25,-1.2,1.2);g.strokeStyle=PAL[it.c];g.lineWidth=0.1;g.stroke();g.fillStyle='#fffaf0';g.beginPath();g.ellipse(0,0.6,1.0,0.14,0,0,7);g.fill();
      g.fillStyle='#fff';[[-0.3,0],[0.2,0.15],[0,-0.15]].forEach(function(d){g.beginPath();g.arc(d[0],d[1],0.08,0,7);g.fill()});break;
    case 'plate':g.fillStyle='#fffaf0';g.beginPath();g.arc(0,0,0.95,0,7);g.fill();g.strokeStyle=PAL[it.c];g.lineWidth=0.1;g.beginPath();g.arc(0,0,0.78,0,7);g.stroke();g.strokeStyle='rgba(110,70,30,0.25)';g.lineWidth=0.04;g.beginPath();g.arc(0,0,0.95,0,7);g.stroke();break;
    case 'whisk':g.strokeStyle='#c9c9d6';g.lineWidth=0.05;for(var wk=-2;wk<=2;wk++){g.beginPath();g.ellipse(0,-0.4,0.12+Math.abs(wk)*0.14,0.8,0,0,7);g.stroke()}g.fillStyle=PAL[it.c];g.fillRect(-0.1,0.35,0.2,0.9);break;
    case 'jar':g.fillStyle='rgba(220,240,255,0.8)';GFX.rr(g,-0.6,-0.6,1.2,1.4,0.2);g.fill();g.strokeStyle='rgba(110,110,140,0.4)';g.lineWidth=0.04;g.stroke();g.fillStyle=PAL[it.c];g.fillRect(-0.62,-0.8,1.24,0.25);
      g.fillStyle=PAL[(it.c+2)%6];GFX.rr(g,-0.5,0,1,0.6,0.15);g.fill();g.fillStyle='#fffaf0';g.fillRect(-0.4,-0.3,0.8,0.25);break;
    case 'spoon':g.fillStyle='#d6dbe6';g.beginPath();g.ellipse(0,-0.8,0.32,0.45,0,0,7);g.fill();g.fillRect(-0.06,-0.4,0.12,1.6);break;
    case 'roundwin':g.fillStyle='#fffaf0';g.beginPath();g.arc(0,0,1.0,0,7);g.fill();var sk2=g.createLinearGradient(0,-0.85,0,0.85);sk2.addColorStop(0,'#9fdcff');sk2.addColorStop(1,'#e6f7ff');g.fillStyle=sk2;g.beginPath();g.arc(0,0,0.85,0,7);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(-0.2,0.1,0.25,0,7);g.arc(0.15,0.15,0.2,0,7);g.fill();g.fillStyle='#fffaf0';g.fillRect(-0.05,-0.85,0.1,1.7);g.fillRect(-0.85,-0.05,1.7,0.1);break;
    case 'teddy':g.fillStyle='#d9a25e';[[-0.45,-0.5,0.25],[0.45,-0.5,0.25],[0,0,0.6]].forEach(function(c){g.beginPath();g.arc(c[0],c[1],c[2],0,7);g.fill()});g.fillStyle='#f3d2a0';g.beginPath();g.ellipse(0,0.18,0.28,0.2,0,0,7);g.fill();
      g.fillStyle='#5a3a28';[[-0.2,-0.1],[0.2,-0.1],[0,0.1]].forEach(function(c){g.beginPath();g.arc(c[0],c[1],0.06,0,7);g.fill()});g.fillStyle=PAL[it.c];g.beginPath();g.moveTo(-0.3,0.55);g.lineTo(0,0.45);g.lineTo(0.3,0.55);g.lineTo(0,0.65);g.fill();break;
    case 'blocks':[[0,0],[0.85,0],[0.42,-0.8]].forEach(function(c,i){g.fillStyle=PAL[(it.c+i)%6];g.fillRect(c[0]-0.4,c[1]-0.4,0.8,0.8);g.strokeStyle='rgba(110,70,30,0.35)';g.lineWidth=0.04;g.strokeRect(c[0]-0.4,c[1]-0.4,0.8,0.8);GFX.wtext(g,'ABC'[i],c[0],c[1],0.5,'#fffaf0')});break;
    case 'kite':g.fillStyle=PAL[it.c];g.beginPath();g.moveTo(0,-1);g.lineTo(0.6,0);g.lineTo(0,1);g.lineTo(-0.6,0);g.closePath();g.fill();g.strokeStyle='rgba(110,70,30,0.35)';g.lineWidth=0.04;g.stroke();
      g.strokeStyle='#fffaf0';g.beginPath();g.moveTo(0,1);g.bezierCurveTo(0.4,1.5,-0.4,1.9,0.1,2.4);g.stroke();break;
    case 'pot':g.fillStyle='#e58a5a';g.beginPath();g.moveTo(-0.6,-0.1);g.lineTo(0.6,-0.1);g.lineTo(0.45,0.8);g.lineTo(-0.45,0.8);g.closePath();g.fill();g.fillStyle='#f0a070';g.fillRect(-0.68,-0.25,1.36,0.22);
      g.strokeStyle='#4fa84a';g.lineWidth=0.08;g.beginPath();g.moveTo(0,-0.25);g.lineTo(0,-1.2);g.stroke();g.fillStyle=PAL[it.c];for(var pe=0;pe<5;pe++){g.beginPath();g.arc(Math.cos(pe*1.256)*0.25,-1.3+Math.sin(pe*1.256)*0.25,0.17,0,7);g.fill()}g.fillStyle='#ffd75e';g.beginPath();g.arc(0,-1.3,0.13,0,7);g.fill();break;
    case 'can':g.fillStyle=PAL[it.c];GFX.rr(g,-0.6,-0.4,1.2,1,0.15);g.fill();g.beginPath();g.moveTo(-0.55,0.1);g.lineTo(-1.3,-0.6);g.lineTo(-1.2,-0.7);g.lineTo(-0.5,-0.2);g.fill();g.strokeStyle=PAL[it.c];g.lineWidth=0.1;g.beginPath();g.arc(0.2,-0.4,0.4,Math.PI,0);g.stroke();break;
    case 'seed':g.fillStyle='#fffaf0';g.fillRect(-0.55,-0.8,1.1,1.6);g.strokeStyle='rgba(110,70,30,0.35)';g.lineWidth=0.04;g.strokeRect(-0.55,-0.8,1.1,1.6);g.fillStyle=PAL[it.c];for(var sd=0;sd<5;sd++){g.beginPath();g.arc(Math.cos(sd*1.256)*0.22,-0.2+Math.sin(sd*1.256)*0.22,0.15,0,7);g.fill()}
      g.fillStyle='#7fcf6a';g.fillRect(-0.03,0,0.06,0.6);break;
    case 'poster':g.fillStyle='#fffaf0';g.fillRect(-0.8,-1,1.6,2);g.strokeStyle=PAL[it.c];g.lineWidth=0.06;g.beginPath();g.arc(0,-0.3,0.35,0,7);g.stroke();
      g.beginPath();g.moveTo(-0.5,0.3);g.lineTo(0.5,0.3);g.moveTo(-0.5,0.5);g.lineTo(0.3,0.5);g.moveTo(-0.5,0.7);g.lineTo(0.4,0.7);g.stroke();g.fillStyle='#ffd75e';g.beginPath();g.arc(0,-0.95,0.08,0,7);g.fill();break;
  }
  g.restore()}
function drawMidItem(g,it,theme){var cols=(THEMES[theme]||THEMES.workshop).mid;
  if(it.t==='hill'){var w=it.s*2.2,h=it.s*1.3;g.beginPath();g.moveTo(it.x-w,it.y);g.quadraticCurveTo(it.x-w*0.5,it.y-h*1.25,it.x,it.y-h);g.quadraticCurveTo(it.x+w*0.6,it.y-h*0.85,it.x+w,it.y);g.closePath();
    g.fillStyle=cols[it.c];g.fill();g.strokeStyle='rgba(110,70,30,0.25)';g.lineWidth=0.05;g.stroke();
    g.beginPath();g.moveTo(it.x-w*0.75,it.y-0.15);g.quadraticCurveTo(it.x-w*0.45,it.y-h*0.95,it.x,it.y-h*0.8);GFX.stitch(g,'rgba(255,255,255,0.55)',0.04)}
  else{g.fillStyle=GFX.pat('card');g.fillRect(it.x-0.12,it.y-it.s*1.6,0.24,it.s*1.6);var r=it.s*0.6;
    g.fillStyle=cols[(it.c+1)%5];[[0,-1.9,1],[-0.45,-1.55,0.75],[0.45,-1.6,0.8]].forEach(function(c){g.beginPath();g.arc(it.x+c[0]*it.s,it.y+c[1]*it.s,r*c[2],0,7);g.fill()});
    g.strokeStyle='rgba(110,70,30,0.2)';g.lineWidth=0.04;g.beginPath();g.arc(it.x,it.y-1.9*it.s,r,0,7);g.stroke()}}
function drawBunting(g,b){var n=Math.floor(b.w/0.7);g.beginPath();g.moveTo(b.x,b.y);g.quadraticCurveTo(b.x+b.w/2,b.y+0.9,b.x+b.w,b.y);g.strokeStyle='rgba(255,255,255,0.9)';g.lineWidth=0.04;g.stroke();
  for(var i=1;i<n;i++){var t=i/n,x=b.x+b.w*t,y=b.y+2*(1-t)*t*0.9+0.0;g.beginPath();g.moveTo(x-0.24,y);g.lineTo(x+0.24,y);g.lineTo(x,y+0.5);g.closePath();g.fillStyle=PAL[(i+b.c)%6];g.fill();
    g.strokeStyle='rgba(110,70,30,0.25)';g.lineWidth=0.02;g.stroke()}}
/* ---------------- scene render ---------------- */
function renderScene(g,W,H,dpr,S,cx,cy,lv,plr,t,opts){opts=opts||{};
  var th=lv.def.theme;
  g.setTransform(dpr,0,0,dpr,0,0);
  var TH=THEMES[th]||THEMES.workshop;var sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,TH.sky[0]);sky.addColorStop(1,TH.sky[1]);
  g.fillStyle=sky;g.fillRect(0,0,W,H);
  function layer(d,yd){g.setTransform(dpr*S,0,0,dpr*S,dpr*(W/2-cx*d*S),dpr*(H/2-cy*yd*S))}
  var CQ=opts.cache?vq():null,vs=dpr*S,TC=CQ?vCaches(lv):null;
  if(CQ){TC.far.draw(g,lv._ff||(lv._ff=vFarTile(lv,TH)),vs*CQ.far,vs,dpr,W,H,cx*0.25,cy*0.35);
    layer(0.25,0.35);var fl=cx*0.25-W/2/S-3,fr=cx*0.25+W/2/S+3;lv.bg.far.forEach(function(it){if((it.t==='cog'||it.t==='clock')&&it.x>fl&&it.x<fr)drawFarItem(g,it,t)});
    if(CQ.amb)vDrawAmbient(g,lv,t,fl,fr,cy*0.35-H/2/S-1,cy*0.35+H/2/S+1,CQ.amb);
    TC.mid.draw(g,lv._fm||(lv._fm=vMidTile(lv)),vs*CQ.mid,vs,dpr,W,H,cx*0.55,cy*0.6)}
  else{
  // far wall pattern
  layer(0.25,0.35);var x0=cx*0.25-W/2/S-2,y0=cy*0.35-H/2/S-2;g.globalAlpha=TH.wa;g.fillStyle=GFX.pat(TH.wall);g.fillRect(x0,y0,W/S+4,H/S+4);g.globalAlpha=1;
  var vl=x0-3,vr=x0+W/S+7;
  lv.bg.far.forEach(function(it){if(it.x>vl&&it.x<vr)drawFarItem(g,it,t)});
  layer(0.55,0.6);var x1=cx*0.55-W/2/S-4,x2=x1+W/S+8;
  lv.bg.bunt.forEach(function(b){if(b.x+b.w>x1&&b.x<x2)drawBunting(g,b)});
  lv.bg.mid.forEach(function(it){if(it.x>x1-4&&it.x<x2+4)drawMidItem(g,it,th)});
  }
  // world
  g.setTransform(dpr*S,0,0,dpr*S,dpr*(W/2-cx*S),dpr*(H/2-cy*S));
  var wl=cx-W/2/S-1,wr=cx+W/2/S+1,wt=cy-H/2/S-1,wb=cy+H/2/S+1;
  if(CQ){TC.back.draw(g,lv._fb||(lv._fb=vBackTile(lv)),vs*CQ.world,vs,dpr,W,H,cx,cy);g.setTransform(dpr*S,0,0,dpr*S,dpr*(W/2-cx*S),dpr*(H/2-cy*S))}
  // pits: cotton wool
  if(!CQ)lv.pits.forEach(function(p){if(p.x+p.w<wl||p.x>wr)return;g.fillStyle='rgba(255,255,255,0.95)';for(var x=p.x+0.3;x<p.x+p.w;x+=0.7){g.beginPath();g.arc(x,p.y+1.5+Math.sin(x*3)*0.15,0.55,0,7);g.fill()}
    g.fillStyle='rgba(220,200,255,0.35)';for(var x3=p.x+0.6;x3<p.x+p.w;x3+=0.9){g.beginPath();g.arc(x3,p.y+1.9,0.45,0,7);g.fill()}});
  // signs posts (behind)
  lv.signs.forEach(function(s){if(s.x<wl-3||s.x>wr+3)return;g.fillStyle=GFX.pat('wood');g.fillRect(s.x-0.06,s.y-1.35,0.12,1.35);g.strokeStyle='rgba(110,70,30,0.5)';g.lineWidth=0.03;g.strokeRect(s.x-0.06,s.y-1.35,0.12,1.35)});
  // checkpoints
  lv.cps.forEach(function(c,i){if(c.x<wl||c.x>wr)return;var on=c.on;GFX.spool(g,c.x,c.y-0.32,0.55,on?'#7fe0c0':'#e8d6bf');g.fillStyle=GFX.pat('wood');g.fillRect(c.x-0.05,c.y-1.9,0.1,1.4);
    var fy=on?c.y-1.88:c.y-0.95,wv=Math.sin(t*4+i)*0.08;g.beginPath();g.moveTo(c.x+0.05,fy);g.quadraticCurveTo(c.x+0.4,fy+0.12+wv,c.x+0.75,fy+0.22+wv);g.lineTo(c.x+0.05,fy+0.48);g.closePath();
    g.fillStyle=on?GFX.pat('felt_yellow'):GFX.pat('felt_cream');g.fill();g.strokeStyle='rgba(110,70,30,0.45)';g.lineWidth=0.03;g.stroke();
    if(on){GFX.sewButton(g,c.x+0.3,fy+0.22,0.08,'#ff7fae',2)}});
  mechRenderBack(g,lv,t,wl,wr);
  // shadows then solids
  if(!CQ)lv.solids.forEach(function(s){if(s.poly||(s.x<wr&&s.x+s.w>wl&&s.y<wb&&s.y+s.h>wt))GFX.solidShadow(g,s)});
  // gates (behind their frames)
  lv.gates.forEach(function(gt){var p=gt.body.getPosition();if(p.x<wl-1||p.x>wr+1)return;g.save();g.translate(p.x,p.y);
    if(gt.thin){GFX.rr(g,-gt.w/2,-gt.h/2,gt.w,gt.h,0.12);g.fillStyle=GFX.pat('felt_red');g.fill();g.strokeStyle='rgba(110,40,30,0.5)';g.lineWidth=0.03;g.stroke()}
    else{GFX.rr(g,-gt.w/2,-gt.h/2,gt.w,gt.h,0.06);g.fillStyle=GFX.pat('felt_teal');g.fill();g.strokeStyle='rgba(30,80,80,0.55)';g.lineWidth=0.04;g.stroke();
      GFX.rr(g,-gt.w/2+0.08,-gt.h/2+0.08,gt.w-0.16,gt.h-0.16,0.04);GFX.stitch(g);for(var k=0;k<3;k++)GFX.sewButton(g,0,-gt.h/2+0.6+k*((gt.h-1.2)/2),0.13,'#ffd75e',2)}
    g.restore()});
  if(CQ){TC.front.draw(g,lv._fw||(lv._fw=vFrontTile(lv)),vs*CQ.world,vs,dpr,W,H,cx,cy);
    if(CQ.lamp){g.setTransform(1,0,0,1,0,0);g.drawImage(vOverlay('lamp',W,H,th),0,0,W*dpr,H*dpr)}
    g.setTransform(dpr*S,0,0,dpr*S,dpr*(W/2-cx*S),dpr*(H/2-cy*S))}
  else lv.solids.forEach(function(s){if(s.poly||(s.x<wr&&s.x+s.w>wl&&s.y<wb&&s.y+s.h>wt))GFX.drawSolid(g,s)});
  // boing pads
  lv.boings.forEach(function(bo){if(bo.x>wr||bo.x+bo.w<wl)return;var cxp=bo.x+bo.w/2;
    if(!bo.active){g.fillStyle=GFX.pat('card');g.fillRect(bo.x,bo.y-0.05,bo.w,0.08);g.strokeStyle='rgba(110,70,30,0.55)';g.lineWidth=0.03;g.setLineDash([0.1,0.08]);g.strokeRect(bo.x,bo.y-0.05,bo.w,0.08);g.setLineDash([]);
      g.save();g.globalAlpha=0.55;GFX.wtext(g,'?',cxp,bo.y-0.5,0.5,'#5a3a28');g.restore();return}
    var sq=bo.sq*Math.sin(bo.sq*12)*0.12,h=(0.42+sq)*bo.pop;g.save();g.translate(cxp,bo.y);
    g.strokeStyle='#9aa0b4';g.lineWidth=0.06;g.beginPath();for(var i=0;i<=8;i++){var yy=-i/8*h*0.6;g.lineTo((i%2?0.3:-0.3)*bo.w/1.7,yy)}g.stroke();
    GFX.rr(g,-bo.w/2,-h-0.06,bo.w,0.34,0.15);g.fillStyle=GFX.pat(bo.look==='pin'?'felt_red':bo.look==='jelly'?'felt_pink':'sponge');g.fill();g.strokeStyle=bo.look==='pin'?'#b84a4a':'#b8861c';g.lineWidth=0.04;g.stroke();
    if(bo.look==='pin'){for(var pi=0;pi<3;pi++){GFX.sewButton(g,-bo.w/2+0.35+pi*(bo.w-0.7)/2,-h+0.1,0.07,'#fffaf0',2)}}
    g.fillStyle='rgba(255,255,255,0.4)';g.fillRect(-bo.w/2+0.15,-h-0.02,bo.w-0.3,0.05);g.restore()});
  // buttons
  lv.buttons.forEach(function(bt){if(bt.x>wr||bt.x+bt.w<wl)return;var cxp=bt.x+bt.w/2,dep=bt.dep*0.12,y=bt.y;g.save();
    GFX.rr(g,bt.x-0.1,y-0.12,bt.w+0.2,0.16,0.06);g.fillStyle=GFX.pat('felt_cream');g.fill();
    var on=bt.pressed;if(on){var gl=g.createRadialGradient(cxp,y-0.2,0.1,cxp,y-0.2,1.4);gl.addColorStop(0,'rgba(255,240,150,0.6)');gl.addColorStop(1,'rgba(255,240,150,0)');g.fillStyle=gl;g.fillRect(cxp-1.5,y-1.6,3,1.8)}
    g.translate(cxp,y-0.16+dep);g.scale(1,0.38);GFX.sewButton(g,0,0,bt.w/2,on?'#7fe0c0':bt.heavy?'#ffad5c':'#ff9fc4',4);g.restore();
    if(bt.heavy){g.save();g.translate(cxp,y-0.75);if(bt.wob>0)g.rotate(Math.sin(t*20)*0.15);g.fillStyle='rgba(90,58,40,0.8)';g.beginPath();g.moveTo(-0.22,0.2);g.lineTo(0.22,0.2);g.lineTo(0.15,-0.08);g.lineTo(-0.15,-0.08);g.closePath();g.fill();
      g.beginPath();g.arc(0,-0.12,0.07,0,7);g.strokeStyle='rgba(90,58,40,0.8)';g.lineWidth=0.04;g.stroke();g.restore()}});
  // basket
  lv.baskets.forEach(function(bk){if(bk.x+3<wl||bk.x-3>wr)return;var sg=bk.sag;GFX.drawString(g,bk.x-bk.w/2+0.05,bk.y-bk.h,bk.x,lv.top+0.2,0);GFX.drawString(g,bk.x+bk.w/2-0.05,bk.y-bk.h,bk.x,lv.top+0.2,0);
    g.save();g.translate(bk.x,bk.y+sg*0.0);g.beginPath();g.moveTo(-bk.w/2,-bk.h);g.lineTo(bk.w/2,-bk.h);g.lineTo(bk.w/2-0.12,0.12);g.lineTo(-bk.w/2+0.12,0.12);g.closePath();g.fillStyle='#d9a25e';g.fill();
    g.save();g.clip();g.strokeStyle='rgba(120,70,30,0.55)';g.lineWidth=0.05;for(var yy=-bk.h;yy<0.2;yy+=0.16){g.beginPath();g.moveTo(-bk.w,yy);g.lineTo(bk.w,yy);g.stroke()}
    g.strokeStyle='rgba(255,230,180,0.5)';for(var xx=-bk.w;xx<bk.w;xx+=0.2){g.beginPath();g.moveTo(xx,-bk.h);g.lineTo(xx+0.05,0.2);g.stroke()}g.restore();
    g.strokeStyle='rgba(110,60,25,0.8)';g.lineWidth=0.05;g.stroke();g.fillStyle='#c58a45';GFX.rr(g,-bk.w/2-0.06,-bk.h-0.08,bk.w+0.12,0.16,0.08);g.fill();
    if(bk.done){GFX.sewButton(g,0,-bk.h-0.45,0.18,'#7fe0c0',2)}g.restore();
    // pull-string to the door
    var gt=lv.gates.filter(function(q){return q.sig===bk.sig})[0];if(gt){var gp=gt.body.getPosition();GFX.drawString(g,bk.x,lv.top+0.2,gp.x,lv.top+0.2,0.2);GFX.drawString(g,gp.x,lv.top+0.2,gp.x,gp.y-gt.h/2,0)}});
  // see-saw
  lv.seesaws.forEach(function(ss){if(ss.px+5<wl||ss.px-5>wr)return;var b=ss.body,p=b.getPosition();GFX.spool(g,ss.px,ss.py+0.65,1.25,'#8fd3ff');
    g.save();g.translate(p.x,p.y);g.rotate(b.getAngle());var x0=-ss.left,len=ss.left+ss.right;
    g.fillStyle=GFX.pat('wood');GFX.rr(g,x0,-0.15,len,0.3,0.05);g.fill();g.strokeStyle='rgba(140,90,40,0.7)';g.lineWidth=0.035;g.stroke();
    g.strokeStyle='rgba(110,70,30,0.6)';g.lineWidth=0.02;for(var i=0;i<=len*10;i++){var xx=x0+i*0.1;g.beginPath();g.moveTo(xx,-0.15);g.lineTo(xx,-0.15+(i%10===0?0.16:i%5===0?0.11:0.06));g.stroke()}
    for(var n=1;n<len;n++)GFX.wtext(g,String(n),x0+n,0.06,0.13,'rgba(110,70,30,0.7)');
    g.fillStyle=GFX.pat('felt_blue');GFX.rr(g,x0,-0.65,0.16,0.52,0.05);g.fill();GFX.rr(g,x0+1.35,-0.59,0.14,0.46,0.05);g.fill();g.strokeStyle='rgba(30,60,110,0.5)';g.lineWidth=0.03;GFX.rr(g,x0,-0.65,0.16,0.52,0.05);g.stroke();
    g.restore();GFX.sewButton(g,p.x,p.y,0.16,'#ffd75e',4)});
  // bridges
  lv.bridges.forEach(function(br){if(br.x-1>wr||br.x+br.len+1<wl)return;var b=br.body;g.save();g.translate(br.x,br.y);g.rotate(b.getAngle());
    for(var i=0;i<br.len;i+=0.6){g.fillStyle=GFX.pat('wood');GFX.rr(g,i+0.02,0,0.56,0.35,0.12);g.fill();g.strokeStyle='rgba(140,90,40,0.6)';g.lineWidth=0.03;g.stroke()}
    g.strokeStyle='rgba(255,255,255,0.85)';g.lineWidth=0.05;g.beginPath();g.moveTo(0,0.12);g.lineTo(br.len,0.12);g.stroke();g.restore();
    if(!br.done){var tip=b.getWorldPoint(V(br.len,0));GFX.drawString(g,tip.x,tip.y,br.x+1.4,br.y-br.len-0.6,0.3)}
    GFX.sewButton(g,br.x,br.y+0.15,0.2,'#ffd75e',2)});
  // springs
  lv.springs.forEach(function(sp){var p=sp.body.getPosition();if(p.x+2<wl||p.x-2>wr)return;var top=p.y+0.15,base=sp.y0+2.4;
    g.strokeStyle='#9aa0b4';g.lineWidth=0.07;g.beginPath();for(var i=0;i<=10;i++){g.lineTo(p.x+(i%2?0.35:-0.35),top+(base-top)*i/10)}g.stroke();
    g.save();g.translate(p.x,p.y);GFX.rr(g,-sp.w/2,-0.15,sp.w,0.3,0.12);g.fillStyle=GFX.pat('felt_purple');g.fill();g.strokeStyle='rgba(60,30,90,0.5)';g.lineWidth=0.035;g.stroke();
    GFX.rr(g,-sp.w/2+0.07,-0.08,sp.w-0.14,0.16,0.06);GFX.stitch(g,'rgba(255,255,255,0.8)',0.03);g.restore()});
  // levers
  lv.levers.forEach(function(lo){var b=lo.body,p=b.getPosition();if(p.x+2<wl||p.x-2>wr)return;g.save();g.translate(p.x,p.y);g.rotate(b.getAngle());
    g.fillStyle=GFX.pat('wood');GFX.rr(g,-0.08,-1.42,0.16,1.42,0.08);g.fill();g.strokeStyle='rgba(140,90,40,0.7)';g.lineWidth=0.03;g.stroke();
    var hl=plr&&plr.cand&&plr.cand.ud.lever===lo;
    g.beginPath();g.arc(0,-1.4,0.26,0,7);g.fillStyle=lo.on?GFX.pat('felt_mint'):GFX.pat('felt_pink');g.fill();g.strokeStyle='#5a3a28';g.lineWidth=0.03;g.stroke();
    for(var k=0;k<6;k++){g.beginPath();g.arc(Math.cos(k)*0.14,-1.4+Math.sin(k)*0.14,0.07,0,7);g.fillStyle='rgba(255,255,255,0.25)';g.fill()}
    g.restore();g.save();g.translate(p.x,p.y);g.fillStyle=GFX.pat('card');g.beginPath();g.arc(0,0.02,0.42,Math.PI,0);g.closePath();g.fill();g.strokeStyle='rgba(110,70,30,0.6)';g.lineWidth=0.04;g.stroke();
    g.fillStyle=lo.on?'#7fe0c0':'#ffad5c';g.beginPath();g.arc(0,-0.12,0.08,0,7);g.fill();g.restore();
    if(!lo.on){var ar=Math.sin(t*5)*0.08;g.save();g.translate(p.x-0.95+ar,p.y-1.75);g.fillStyle='rgba(255,127,174,0.9)';g.beginPath();g.moveTo(0.25,-0.14);g.lineTo(-0.05,0);g.lineTo(0.25,0.14);g.closePath();g.fill();g.restore()}});
  // ropes
  lv.ropes.forEach(function(rp){if(rp.ax+7<wl||rp.ax-7>wr)return;var pts=[[rp.ax,rp.ay]];rp.segs.forEach(function(s){var q=s.getWorldPoint(V(0,rp.sl/2));pts.push([q.x,q.y])});GFX.drawRopeSegs(g,pts)});
  mechRender(g,lv,t,wl,wr,plr);
  // objects
  lv.objs.forEach(function(o){var b=o.body,p=b.getPosition();if(p.x+2<wl||p.x-2>wr)return;
    g.fillStyle='rgba(110,70,30,0.14)';g.beginPath();g.ellipse(p.x+0.1,p.y+0.12,o.ext,o.ext,0,0,7);g.fill();
    if(o.type==='balloon'){var hb=plr&&plr.grab&&plr.grab.body===b;var sx0=hb?plr.body.getPosition().x:o.peg.x,sy0=hb?plr.body.getPosition().y-0.3:o.peg.y;if(o.joint||hb){GFX.drawString(g,p.x,p.y+o.r*1.2,sx0,sy0,0.15)}if(o.joint){g.fillStyle=GFX.pat('wood');g.fillRect(o.peg.x-0.07,o.peg.y-0.4,0.14,0.4)}}
    g.save();g.translate(p.x,p.y);g.rotate(b.getAngle());if(!mechDrawObj(g,o,t)){if(o.type==='ball')GFX.drawBall(g,o);else GFX.drawBox(g,o)}g.restore();
    if(o.flash>0){g.globalAlpha=o.flash;g.strokeStyle='#fff';g.lineWidth=0.08;g.beginPath();g.arc(p.x,p.y,o.ext+0.2+(1-o.flash)*0.6,0,7);g.stroke();g.globalAlpha=1}});
  // grab highlight
  if(plr&&plr.cand&&!plr.grab){var c=plr.cand,pulse=0.5+0.5*Math.sin(t*8);g.save();g.strokeStyle='rgba(255,255,255,'+(0.65+pulse*0.35)+')';g.lineWidth=0.07;g.setLineDash([0.16,0.1]);g.lineDashOffset=-t*0.6;
    var cb=c.body,cp=cb.getPosition(),ud=c.ud;
    if(ud.type==='lever'){var kp=cb.getWorldPoint(V(0,-1.4));g.beginPath();g.arc(kp.x,kp.y,0.42+pulse*0.05,0,7);g.stroke()}
    else if(ud.type==='rope'||ud.type==='toggle'||ud.type==='zip'){g.beginPath();g.arc(c.pt.x,c.pt.y,(ud.type==='rope'?0.32:0.45)+pulse*0.05,0,7);g.stroke()}
    else{var o2=ud.obj;g.translate(cp.x,cp.y);g.rotate(cb.getAngle());if(o2.type==='ball'){g.beginPath();g.arc(0,0,o2.r+0.12,0,7);g.stroke()}else{GFX.rr(g,-o2.w/2-0.12,-o2.h/2-0.12,o2.w+0.24,o2.h+0.24,0.2);g.stroke()}}
    g.restore();
    if(!isTouch||true){g.save();g.fillStyle='rgba(255,255,255,0.9)';var lx=c.pt.x,ly=c.pt.y-0.6-pulse*0.05;g.beginPath();g.arc(lx,ly,0.18,0,7);g.fill();GFX.wtext(g,'✋',lx,ly+0.01,0.22,'#5a3a28');g.restore()}}
  // prizes
  lv.prizes.forEach(function(pz){if(pz.got||pz.x<wl||pz.x>wr)return;GFX.bubble(g,pz.x,pz.y+Math.sin(t*2+pz.ph)*0.1,0.32,t+pz.ph,pz.k)});
  if(lv.boss)bossDraw(g,lv,t);
  // exit
  if(lv.exit)drawExit(g,lv.exit,t,lv);
  // player
  // falling-object shadows (telegraph drops)
  if(CQ&&CQ.cshadow)vObjShadows(g,lv,wl,wr);else if(lv.objs)lv.objs.forEach(function(o){var b=o.body;if(b.getType()!=='dynamic')return;var v=b.getLinearVelocity();if(v.y<1.2)return;var q=b.getPosition(),hy=null;
    lv.world.rayCast(V(q.x,q.y+0.3),V(q.x,q.y+12),function(f,pt,n,fr){if(f.isSensor()||f.getBody()===b)return -1;var u=f.getUserData();if(u&&(u.type==='player'||u.type==='hand'))return -1;hy=pt.y;return fr});
    if(hy===null)return;var d=hy-q.y;if(d<0.7)return;var k=Math.max(0,1-d/12),w=(o.w||o.r*2||1)*0.5*(0.55+0.45*k);g.fillStyle='rgba(70,40,20,'+(0.12+0.28*k)+')';g.beginPath();g.ellipse(q.x,hy-0.02,Math.max(0.25,w),0.1+0.05*k,0,0,7);g.fill()});
  if(lv.ghost)vGhostDraw(g,lv);
  if(plr&&!plr.hidden){var pp=plr.body.getPosition();
    // shadow via raycast
    var gy=null;lv.world.rayCast(V(pp.x,pp.y),V(pp.x,pp.y+8),function(f,pt,n,fr){var u=f.getUserData();if(f.isSensor()||(u&&(u.type==='player'||u.type==='hand')))return -1;gy=pt.y;return fr});
    if(gy!==null){var dd=gy-pp.y-R,a=Math.max(0,0.25-dd*0.04),sw=0.45*Math.max(0.4,1-dd*0.08);if(CQ&&CQ.cshadow)vContactShadow(g,pp.x,gy,sw*1.25,a*2.1);else{g.fillStyle='rgba(90,55,25,'+a+')';g.beginPath();g.ellipse(pp.x,gy-0.02,sw,0.09,0,0,7);g.fill()}}
    if(plr.inv>0&&Math.floor(t*14)%2===0)g.globalAlpha=0.55;
    var gr=plr.grab,gv=null;if(gr){var an=gr.body.getWorldPoint(gr.local);gv=[an.x-pp.x,an.y-pp.y]}
    var br=plr.squash?0:(plr.breath||0),wb=plr.squash?0:(plr.wob||0)*Math.sin((plr.wobT||0)*26);GFX.drawBobbin(g,{x:pp.x,y:pp.y+(plr.squash?0:(plr.hopY||0)),r:R,sx:plr.sx*(plr.shrink||1)*(1-br*0.6),sy:plr.sy*(plr.shrink||1)*(1+br),eyeX:plr.eyeX||0,eyeY:plr.eyeY||0,face:plr.face,run:plr.run,air:!plr.grounded,col:COSTUMES[save.costume%COSTUMES.length][1],hat:wardDraw().hat,pat:wardDraw().pat,pcol:wardDraw().pcol,grab:gv,
      blink:plr.blink>0,expr:plr.expr,tuft:plr.tuft,look:gr&&gr.mode==='hang'?-0.5:0,tilt:(plr.squash||plr.grounded?0:Math.max(-0.2,Math.min(0.2,plr.body.getLinearVelocity().x*0.02))+(plr.idle>2&&plr.grounded?Math.sin(t*2.2)*0.05:0))+wb});
    if(plr.expr==='sleepy'&&!plr.squash){g.save();for(var zi=0;zi<2;zi++){var zp=((t*0.5+zi*0.5)%1);g.globalAlpha=Math.sin(zp*Math.PI);GFX.wtext(g,'z',pp.x+0.35+zp*0.45,pp.y-0.55-zp*0.8,0.22+zp*0.14,'#7a5cff')}g.restore()}
    g.globalAlpha=1;
    if(plr.squash){var sq=plr.squash,cy=sq.vert?pp.y+R*0.35:pp.y-R*1.1,rr=sq.vert?0.62:0.42;for(var si=0;si<3;si++){var an=t*5+si*2.094,sxx=pp.x+Math.cos(an)*rr,syy=cy+Math.sin(an)*0.16-0.12;
      g.save();g.translate(sxx,syy);g.rotate(an);g.beginPath();for(var sk=0;sk<10;sk++){var ra=sk%2?0.05:0.12,aa=sk*Math.PI/5;g.lineTo(Math.cos(aa)*ra,Math.sin(aa)*ra)}g.closePath();g.fillStyle=si===1?'#ff9bb0':'#ffd23f';g.fill();g.strokeStyle='rgba(90,58,40,.6)';g.lineWidth=0.02;g.stroke();g.restore()}}}
  // particles
  particles.forEach(function(p){var k=1-p.life/p.max;g.globalAlpha=Math.max(0,Math.min(1,k*1.5));
    if(p.type==='spark'){g.fillStyle=p.col;g.save();g.translate(p.x,p.y);g.rotate(p.rot+p.life*4);var s=p.size*1.6;g.beginPath();for(var i=0;i<8;i++){var r=i%2?s*0.35:s;g.lineTo(Math.cos(i*Math.PI/4)*r,Math.sin(i*Math.PI/4)*r)}g.closePath();g.fill();g.restore()}
    else if(p.type==='ring'){g.strokeStyle=p.col;g.lineWidth=0.08*k;g.beginPath();g.arc(p.x,p.y,0.3+(1-k)*1.4,0,7);g.stroke()}
    else if(p.type==='confetti'){g.fillStyle=p.col;g.save();g.translate(p.x,p.y);g.rotate(p.rot);g.fillRect(-p.size,-p.size*0.5,p.size*2,p.size);g.restore()}
    else{g.fillStyle=p.col;g.beginPath();g.arc(p.x,p.y,p.size*(p.type==='fluff'?1+0.5*(1-k):1),0,7);g.fill()}});
  g.globalAlpha=1;
  if(CQ&&CQ.fg)vDrawFg(g,lv,dpr,W,H,S,cx,cy);
  // screen-space: signs + floaters
  g.setTransform(dpr,0,0,dpr,0,0);
  function toS(x,y){return [W/2+(x-cx)*S,H/2+(y-cy)*S]}
  var fs=Math.max(11,Math.min(20,S*0.3));g.textAlign='center';g.textBaseline='middle';
  if(!opts.noSigns&&opts.cache)lv.signs.forEach(function(s){if(s.x<wl-4||s.x>wr+4)return;var sp=vSignSprite(s,fs,dpr),q=toS(s.x,s.y-1.35);
    g.save();g.translate(q[0],q[1]-sp.ph/2);g.rotate(((s.x*7)%3-1)*0.015);g.drawImage(sp.c,-sp.pw/2-sp.pad,-sp.ph/2-sp.pad,sp.c.width/dpr,sp.c.height/dpr);g.restore()});
  else if(!opts.noSigns)lv.signs.forEach(function(s){if(s.x<wl-4||s.x>wr+4)return;var lines=signText(s.text).split('\n');g.font=fs+'px '+FONT;var wmax=0;lines.forEach(function(l){wmax=Math.max(wmax,g.measureText(l).width)});
    var pw=wmax+fs*1.3,ph=lines.length*fs*1.25+fs*0.8,sp=toS(s.x,s.y-1.35),x=sp[0]-pw/2,y=sp[1]-ph;
    g.save();g.translate(sp[0],sp[1]-ph/2);g.rotate(((s.x*7)%3-1)*0.015);g.translate(-sp[0],-(sp[1]-ph/2));
    g.fillStyle='rgba(110,70,30,0.18)';g.fillRect(x+3,y+4,pw,ph);g.fillStyle='#fffaf0';g.fillRect(x,y,pw,ph);
    g.strokeStyle='rgba(120,170,220,0.25)';g.lineWidth=1;for(var ly=y+fs*0.9;ly<y+ph-4;ly+=fs*1.25){g.beginPath();g.moveTo(x+4,ly+fs*0.62);g.lineTo(x+pw-4,ly+fs*0.62);g.stroke()}
    g.fillStyle='#ff7fae';g.beginPath();g.arc(sp[0],y+5,4,0,7);g.fill();
    g.fillStyle='#5a3a28';lines.forEach(function(l,i){g.fillText(l,sp[0],y+fs*0.9+i*fs*1.25)});g.restore()});
  floaters.forEach(function(f){var sp=toS(f.x,f.y),k=f.life/f.max;g.globalAlpha=Math.min(1,(1-k)*2.5);var fz=Math.round(fs*1.15*(1+Math.max(0,0.25-f.life)*1.5));g.font='bold '+fz+'px '+FONT;
    g.lineWidth=4;g.strokeStyle='rgba(255,250,240,0.95)';g.strokeText(f.t,sp[0],sp[1]);g.fillStyle=f.col;g.fillText(f.t,sp[0],sp[1])});g.globalAlpha=1;
  // vignette
  if(!opts.noVig&&CQ){g.drawImage(vOverlay('vig',W,H,th),0,0,W,H)}
  else if(!opts.noVig){var vg=g.createRadialGradient(W/2,H/2,Math.min(W,H)*0.35,W/2,H/2,Math.max(W,H)*0.75);vg.addColorStop(0,'rgba(120,70,30,0)');vg.addColorStop(1,'rgba(120,70,30,0.2)');g.fillStyle=vg;g.fillRect(0,0,W,H)}
}
var FONT='"Chalkboard SE","Marker Felt","Comic Neue","Trebuchet MS",sans-serif';
function signText(t){return t.replace(/\{MOVE\}/g,isTouch?'Use the stick':'Press ← →').replace(/\{JUMP\}/g,isTouch?'Jump':'Space').replace(/\{GRAB\}/g,isTouch?'Grab':'Shift')}
function drawExit(g,e,t,lv){var x=e.x,y=e.y;g.save();g.translate(x,y);
  var gl=g.createRadialGradient(0,0,0.2,0,0,2.6);gl.addColorStop(0,'rgba(255,250,200,0.9)');gl.addColorStop(0.5,'rgba(255,220,240,0.45)');gl.addColorStop(1,'rgba(255,220,240,0)');g.fillStyle=gl;g.beginPath();g.arc(0,0,2.6,0,7);g.fill();
  g.save();g.rotate(t*0.8);for(var i=0;i<6;i++){g.rotate(Math.PI/3);g.fillStyle=i%2?'rgba(255,255,255,0.55)':'rgba(255,215,94,0.45)';g.beginPath();g.moveTo(0,0);g.arc(0,0,1.05,0,0.5);g.closePath();g.fill()}g.restore();
  var cols=['#ff9fc4','#ffad5c','#ffd75e','#7fe0c0','#8fd3ff','#b79cff'];for(var k=0;k<12;k++){var a0=k/12*Math.PI*2,a1=(k+1)/12*Math.PI*2;g.beginPath();g.arc(0,0,1.45,a0,a1+0.02);g.lineWidth=0.62;g.strokeStyle=cols[k%6];g.stroke()}
  g.beginPath();g.arc(0,0,1.45,0,7);g.lineWidth=0.03;g.setLineDash([0.12,0.09]);g.strokeStyle='rgba(255,255,255,0.9)';g.stroke();g.setLineDash([]);
  g.beginPath();g.arc(0,0,1.78,0,7);g.strokeStyle='rgba(110,70,30,0.35)';g.lineWidth=0.04;g.stroke();g.beginPath();g.arc(0,0,1.13,0,7);g.stroke();
  for(var b=0;b<6;b++){var ab=b/6*Math.PI*2+t*0.2;GFX.sewButton(g,Math.cos(ab)*1.45,Math.sin(ab)*1.45,0.14,'#fffaf0',4)}
  GFX.rr(g,-1.9,1.5,3.8,0.5,0.25);g.fillStyle=GFX.pat('felt_pink');g.fill();g.strokeStyle='rgba(110,40,70,0.4)';g.lineWidth=0.04;g.stroke();
  GFX.wtext(g,'EXIT',0,-2.15,0.42,'#ff7fae');g.restore()}
/* ================= v1.2 "the look": quality fallback, cached layers, lighting, ambient life ================= */
var VQ={lvl:2,force:null,ema:16.7,rs:0,badT:0,goodT:0,warm:1,ups:0,changes:[]};
(function(){var q=Q.get('q');if(q!==null&&q!==''&&!isNaN(+q))VQ.force=Math.max(0,Math.min(2,Math.round(+q)))})();
// quality levels: tile resolution (fraction of screen px/m), ambient animation amount, lamp light, blurred foreground, soft contact shadows
var QL=[{world:0.62,far:0.3,mid:0.42,amb:0,lamp:0,fg:0,cshadow:0},{world:0.8,far:0.36,mid:0.55,amb:0.5,lamp:1,fg:1,cshadow:1},{world:1,far:0.45,mid:0.7,amb:1,lamp:1,fg:1,cshadow:1}];
function vqLevel(){return VQ.force!==null?VQ.force:VQ.lvl}
function vq(){return QL[vqLevel()]}
function vqTick(dt,ms){if(VQ.warm>0){VQ.warm-=dt;return}VQ.ema+=(dt*1000-VQ.ema)*0.05;VQ.rs+=(ms-VQ.rs)*0.05;if(VQ.force!==null)return;
  if(VQ.ema>25){VQ.badT+=dt;VQ.goodT=0}else if(VQ.ema<14.5){VQ.goodT+=dt;VQ.badT=Math.max(0,VQ.badT-dt)}else{VQ.badT=Math.max(0,VQ.badT-dt*0.5);VQ.goodT=0}
  if(VQ.badT>2.5&&VQ.lvl>0){VQ.lvl--;VQ.badT=0;VQ.goodT=0;VQ.warm=1.5;VQ.changes.push(['down',VQ.lvl,+VQ.ema.toFixed(1)]);VQ.ema=16.7}
  else if(VQ.goodT>20&&VQ.lvl<2&&VQ.ups<2){VQ.lvl++;VQ.ups++;VQ.goodT=0;VQ.warm=1.5;VQ.changes.push(['up',VQ.lvl,+VQ.ema.toFixed(1)])}}
window.__bobQ=function(){return {lvl:vqLevel(),auto:VQ.lvl,force:VQ.force,ema:+VQ.ema.toFixed(1),render:+VQ.rs.toFixed(2),changes:VQ.changes.slice()}};
/* ---------- tile cache: a layer is drawn once into offscreen tiles, then blitted ---------- */
function TileCache(T,max){this.T=T;this.max=max;this.m={};this.n=0;this.key=null;this.fr=0}
TileCache.prototype.draw=function(g,fn,res,vs,dpr,W,H,cx,cy){var key=res.toFixed(3);if(key!==this.key){this.m={};this.n=0;this.key=key}this.fr++;
  var T=this.T,P=2,tm=T/res,sc=vs/res,hw=W*dpr/2/vs,hh=H*dpr/2/vs;
  var i0=Math.floor((cx-hw)/tm),i1=Math.floor((cx+hw)/tm),j0=Math.floor((cy-hh)/tm),j1=Math.floor((cy+hh)/tm);
  var bx=W*dpr/2-cx*vs,by=H*dpr/2-cy*vs,one=Math.abs(sc-1)<1e-6,ext=one?0:0.75;if(one){bx=Math.round(bx);by=Math.round(by)}
  g.setTransform(1,0,0,1,0,0);
  for(var i=i0;i<=i1;i++)for(var j=j0;j<=j1;j++){var k=i+','+j,t=this.m[k];
    if(!t){var c=document.createElement('canvas');c.width=c.height=T+2*P;var x=c.getContext('2d');x.setTransform(res,0,0,res,P-i*tm*res,P-j*tm*res);
      var drew=fn(x,{x0:i*tm-P/res,y0:j*tm-P/res,x1:(i+1)*tm+P/res,y1:(j+1)*tm+P/res});t=this.m[k]={c:drew?c:null,u:0};if(drew)this.n++}
    t.u=this.fr;if(t.c)g.drawImage(t.c,P,P,T,T,one?bx+i*T:bx+i*tm*vs,one?by+j*T:by+j*tm*vs,T*sc+ext,T*sc+ext)}
  if(this.n>this.max){var self=this,ks=Object.keys(this.m).filter(function(q){return self.m[q].c&&self.m[q].u!==self.fr}).sort(function(a,b){return self.m[a].u-self.m[b].u});
    while(this.n>this.max&&ks.length){delete this.m[ks.shift()];this.n--}}};
function vCaches(lv){return lv._tc||(lv._tc={far:new TileCache(256,30),mid:new TileCache(256,30),back:new TileCache(512,24),front:new TileCache(512,24)})}
/* ---------- materials: stitched card, felt, denim, burlap, gingham ---------- */
function vSkin(s,theme){if(s.skin)return s.skin;var h=((Math.floor(s.x*7.3)+Math.floor((s.y||0)*3.1))%7+7)%7,sk='card';
  if(s.mat==='wood')sk='wood';else if(s.mat==='felt')sk='felt';else if(s.y===0&&s.h===4)sk='ground';
  else if(theme==='sewing')sk=h<4?'denim':'feltblk';else if(theme==='shed')sk=h<4?'burlap':'card';else if(theme==='attic')sk=h<2?'denim':'card';else if(theme==='finale')sk=h<2?'denim':h<4?'burlap':'card';
  return s.skin=sk}
function vPinked(g,x0,y,x1,step,dep){g.lineTo(x0,y);for(var x=x0;x<x1-1e-6;x+=step){g.lineTo(Math.min(x1,x+step/2),y+dep);g.lineTo(Math.min(x1,x+step),y)}}
function vTopFabric(g,s,theme){var x=s.x,y=s.y,w=s.w,th=Math.min(0.42,s.h),fab=theme==='kitchen'?GFX.pat(((Math.floor(x)%2)?'gingham_t':'gingham_b')):GFX.pat('felt_'+s.topCol);
  g.save();GFX.rr(g,x,y,w,s.h,0.07);g.clip();
  g.fillStyle='rgba(80,45,20,0.22)';g.beginPath();g.moveTo(x,y);vPinked(g,x,y+th+0.05,x+w,0.16,0.09);g.lineTo(x+w,y);g.closePath();g.fill();
  g.fillStyle=fab;g.beginPath();g.moveTo(x,y);vPinked(g,x,y+th,x+w,0.16,0.08);g.lineTo(x+w,y);g.closePath();g.fill();
  if(theme==='kitchen'){g.fillStyle='rgba(255,255,255,0.35)';g.fillRect(x,y,w,th)}
  g.fillStyle='rgba(255,255,255,0.22)';g.fillRect(x,y,w,0.05);g.restore();
  g.beginPath();g.moveTo(x+0.06,y+th*0.5);g.lineTo(x+w-0.06,y+th*0.5);GFX.stitch(g,'rgba(255,250,235,0.9)',0.04);
  if(w>1.2){g.strokeStyle='rgba(255,250,235,0.75)';g.lineWidth=0.025;g.lineCap='round';for(var cx=x+0.45;cx<x+w-0.3;cx+=1.3){g.beginPath();g.moveTo(cx-0.05,y+th*0.5-0.05);g.lineTo(cx+0.05,y+th*0.5+0.05);g.moveTo(cx+0.05,y+th*0.5-0.05);g.lineTo(cx-0.05,y+th*0.5+0.05);g.stroke()}}}
function vTorn(g,s){var x=s.x,y=s.y,w=s.w,R=GFX.rng(Math.floor(x*31+y*17)+5),d=Math.min(0.28,s.h*0.35);g.beginPath();g.moveTo(x+0.05,y+0.04);g.lineTo(x+w-0.05,y+0.04);
  for(var xx=x+w-0.05;xx>x+0.05;xx-=0.09+R()*0.08)g.lineTo(xx,y+d*(0.55+R()*0.45));g.lineTo(x+0.05,y+d*0.8);g.closePath();g.fillStyle=GFX.pat('paper');g.fill();g.strokeStyle='rgba(150,110,70,0.35)';g.lineWidth=0.02;g.stroke()}
function vCardEdges(g,s){var x=s.x,y=s.y,w=s.w,h=s.h;if(h<0.7)return;[x+0.02,x+w-0.12].forEach(function(ex){g.fillStyle='rgba(255,232,190,0.55)';g.fillRect(ex,y+0.12,0.1,h-0.14);
  g.beginPath();for(var yy=y+0.14;yy<y+h-0.02;yy+=0.02)g.lineTo(ex+0.05+Math.sin(yy*42)*0.035,yy);g.strokeStyle='rgba(130,85,40,0.55)';g.lineWidth=0.018;g.stroke();
  g.fillStyle='rgba(120,75,35,0.4)';g.fillRect(ex,y+0.12,0.012,h-0.14);g.fillRect(ex+0.088,y+0.12,0.012,h-0.14)})}
function vDrawSolid(g,s,theme){if(s.inv)return;if(s.poly){GFX.drawSolid(g,s);return}
  var sk=vSkin(s,theme),x=s.x,y=s.y,w=s.w,h=s.h;
  if(sk==='wood'){GFX.drawSolid(g,s);g.fillStyle='rgba(120,80,40,0.7)';if(w>0.5&&h>0.5)[[x+0.12,y+0.12],[x+w-0.12,y+0.12],[x+0.12,y+h-0.12],[x+w-0.12,y+h-0.12]].forEach(function(n){g.beginPath();g.arc(n[0],n[1],0.035,0,7);g.fill()});return}
  if(sk==='felt'||sk==='feltblk'){var fc=['cream','sky','mint','purple','orange','pink'].filter(function(c){return c!==s.topCol}),col=s.col||(sk==='feltblk'?fc[Math.abs(Math.floor(x*3))%fc.length]:s.topCol||'pink');
    g.fillStyle='rgba(80,45,20,0.18)';g.beginPath();g.moveTo(x,y+0.05);vPinked(g,x,y+0.05,x+w,0.16,-0.07);g.lineTo(x+w,y+h);g.lineTo(x,y+h);g.closePath();g.fill();
    g.fillStyle=GFX.pat('felt_'+col);g.beginPath();g.moveTo(x,y);vPinked(g,x,y,x+w,0.16,-0.07);g.lineTo(x+w,y+h);g.lineTo(x,y+h);g.closePath();g.fill();
    GFX.rr(g,x+0.12,y+0.12,w-0.24,h-0.24,0.08);GFX.stitch(g);if(sk==='feltblk'&&w>0.8&&h>1.2)GFX.sewButton(g,x+w/2,y+Math.min(h/2,1.0),0.14,'#fffaf0',4);if(sk==='feltblk'&&s.topCol)vTopFabric(g,s,theme);return}
  if(sk==='denim'){GFX.rr(g,x,y,w,h,0.08);g.fillStyle=GFX.pat('denim');g.fill();g.strokeStyle='rgba(30,50,100,0.6)';g.lineWidth=0.04;g.stroke();
    g.fillStyle='rgba(255,255,255,0.18)';g.fillRect(x+0.04,y+0.03,w-0.08,0.05);
    GFX.rr(g,x+0.1,y+0.1,w-0.2,h-0.2,0.06);GFX.stitch(g,'rgba(242,163,58,0.95)',0.035,[0.1,0.06]);if(w>0.6&&h>0.6){GFX.rr(g,x+0.17,y+0.17,w-0.34,h-0.34,0.05);GFX.stitch(g,'rgba(242,163,58,0.8)',0.03,[0.1,0.06])}
    if(w>0.7&&h>0.5){g.fillStyle='#c98a3a';[[x+0.2,y+0.2],[x+w-0.2,y+0.2]].forEach(function(n){g.beginPath();g.arc(n[0],n[1],0.06,0,7);g.fill();g.fillStyle='rgba(255,230,170,0.8)';g.beginPath();g.arc(n[0]-0.015,n[1]-0.015,0.02,0,7);g.fill();g.fillStyle='#c98a3a'})}
    if(s.topCol)vTopFabric(g,s,theme);return}
  if(sk==='burlap'){var R=GFX.rng(Math.floor(x*13)+3);g.beginPath();g.moveTo(x,y+0.04);for(var bx=x;bx<x+w;bx+=0.12)g.lineTo(bx,y+0.02+R()*0.05);g.lineTo(x+w,y+0.04);g.lineTo(x+w,y+h);g.lineTo(x,y+h);g.closePath();
    g.fillStyle=GFX.pat('burlap');g.fill();g.strokeStyle='rgba(110,70,30,0.5)';g.lineWidth=0.035;g.stroke();
    g.strokeStyle='rgba(150,100,45,0.6)';g.lineWidth=0.015;for(var fx=x+0.05;fx<x+w;fx+=0.07+R()*0.1){g.beginPath();g.moveTo(fx,y+0.04);g.lineTo(fx+(R()-0.5)*0.06,y-0.03-R()*0.04);g.stroke()}
    g.strokeStyle='rgba(120,70,30,0.8)';g.lineWidth=0.03;for(var sx=x+0.25;sx<x+w-0.15;sx+=0.35){g.beginPath();g.moveTo(sx-0.07,y+0.14);g.lineTo(sx+0.07,y+0.28);g.moveTo(sx+0.07,y+0.14);g.lineTo(sx-0.07,y+0.28);g.stroke()}
    if(s.topCol)vTopFabric(g,s,theme);return}
  // corrugated card (default + ground)
  GFX.rr(g,x,y,w,h,0.07);g.fillStyle=GFX.pat('card');g.fill();g.save();g.clip();g.fillStyle=GFX.pat('corr');g.fillRect(x,y,w,h);g.restore();
  g.fillStyle='rgba(255,236,200,0.35)';g.fillRect(x+0.04,y+0.03,w-0.08,0.07);
  if(sk!=='ground')vCardEdges(g,s);
  g.strokeStyle='rgba(120,75,35,0.6)';g.lineWidth=0.045;GFX.rr(g,x,y,w,h,0.07);g.stroke();
  if(s.topCol)vTopFabric(g,s,theme);else if(w>=0.9&&h>=0.6)vTorn(g,s);
  if(s.tape){g.save();g.translate(x+s.tape*w,y);g.rotate(0.08);g.fillStyle='rgba(255,246,214,0.6)';g.fillRect(-0.22,-0.1,0.44,Math.min(0.8,h*0.6));g.strokeStyle='rgba(200,180,140,0.35)';g.lineWidth=0.015;g.strokeRect(-0.22,-0.1,0.44,Math.min(0.8,h*0.6));g.restore()}}
function vShadowSolid(g,s){var o=[[0.05,0.07,0.08],[0.11,0.15,0.07],[0.19,0.25,0.05]];o.forEach(function(q){g.fillStyle='rgba(100,60,25,'+q[2]+')';
  if(s.poly){g.beginPath();s.poly.forEach(function(p,i){i?g.lineTo(p[0]+q[0],p[1]+q[1]):g.moveTo(p[0]+q[0],p[1]+q[1])});g.fill()}else{GFX.rr(g,s.x+q[0],s.y+q[1],s.w,s.h,0.12);g.fill()}})}
function vBB(s){if(!s._bb){if(s.poly){var a=1e9,b=1e9,c=-1e9,d=-1e9;s.poly.forEach(function(p){a=Math.min(a,p[0]);b=Math.min(b,p[1]);c=Math.max(c,p[0]);d=Math.max(d,p[1])});s._bb=[a,b,c,d]}else s._bb=[s.x,s.y,s.x+s.w,s.y+s.h]}return s._bb}
function vHit(s,b,m){var q=vBB(s);return q[0]-m<b.x1&&q[2]+m>b.x0&&q[1]-m<b.y1&&q[3]+m>b.y0}
function vBackTile(lv){return function(g,b){var drew=false;
  lv.pits.forEach(function(p){if(p.x+p.w<b.x0-1||p.x>b.x1+1||p.y+3<b.y0||p.y>b.y1)return;drew=true;g.fillStyle='rgba(255,255,255,0.95)';for(var x=p.x+0.3;x<p.x+p.w;x+=0.7){g.beginPath();g.arc(x,p.y+1.5+Math.sin(x*3)*0.15,0.55,0,7);g.fill()}
    g.fillStyle='rgba(220,200,255,0.35)';for(var x3=p.x+0.6;x3<p.x+p.w;x3+=0.9){g.beginPath();g.arc(x3,p.y+1.9,0.45,0,7);g.fill()}});
  lv.solids.forEach(function(s){if(!s.inv&&vHit(s,b,0.4)){vShadowSolid(g,s);drew=true}});return drew}}
function vFrontTile(lv){var th=lv.def.theme;return function(g,b){var drew=false;lv.solids.forEach(function(s){if(!s.inv&&vHit(s,b,0.15)){vDrawSolid(g,s,th);drew=true}});return drew}}
function vFarTile(lv,TH){return function(g,b){g.globalAlpha=TH.wa;g.fillStyle=GFX.pat(TH.wall);g.fillRect(b.x0,b.y0,b.x1-b.x0,b.y1-b.y0);g.globalAlpha=1;
  lv.bg.far.forEach(function(it){if(it.t!=='cog'&&it.t!=='clock'&&it.x>b.x0-3&&it.x<b.x1+3)drawFarItem(g,it,0)});
  g.globalCompositeOperation='source-atop';g.fillStyle=TH.sky[1];g.globalAlpha=0.1;g.fillRect(b.x0,b.y0,b.x1-b.x0,b.y1-b.y0);g.globalAlpha=1;g.globalCompositeOperation='source-over';return true}}
function vMidTile(lv){var th=lv.def.theme,TH=THEMES[th]||THEMES.workshop;return function(g,b){var drew=false;
  lv.bg.bunt.forEach(function(q){if(q.x+q.w>b.x0&&q.x<b.x1){drawBunting(g,q);drew=true}});
  lv.bg.mid.forEach(function(it){if(it.x>b.x0-5&&it.x<b.x1+5){drawMidItem(g,it,th);drew=true}});
  if(drew){g.globalCompositeOperation='source-atop';g.fillStyle=TH.sky[1];g.globalAlpha=0.04;g.fillRect(b.x0,b.y0,b.x1-b.x0,b.y1-b.y0);g.globalAlpha=1;g.globalCompositeOperation='source-over'}return drew}}
/* ---------- soft sprites ---------- */
var VS={};
function vSprite(k,w,h,fn){var s=VS[k];if(!s){s=document.createElement('canvas');s.width=w;s.height=h;fn(s.getContext('2d'),w,h);VS[k]=s}return s}
function vSoftShadow(){return vSprite('shadow',64,24,function(g,w,h){var gr=g.createRadialGradient(w/2,h/2,1,w/2,h/2,w/2);gr.addColorStop(0,'rgba(80,45,20,0.9)');gr.addColorStop(0.55,'rgba(80,45,20,0.45)');gr.addColorStop(1,'rgba(80,45,20,0)');g.setTransform(1,0,0,h/w,0,0);g.fillStyle=gr;g.fillRect(0,0,w,w)})}
function vPuff(){return vSprite('puff',48,48,function(g,w,h){var gr=g.createRadialGradient(24,24,2,24,24,24);gr.addColorStop(0,'rgba(255,255,255,0.9)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h)})}
function vBeam(){return vSprite('beam',64,256,function(g,w,h){var gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(255,248,215,0.75)');gr.addColorStop(1,'rgba(255,248,215,0)');g.fillStyle=gr;g.beginPath();g.moveTo(w*0.3,0);g.lineTo(w*0.7,0);g.lineTo(w,h);g.lineTo(0,h);g.closePath();g.fill()})}
function vContactShadow(g,x,y,w,a){if(a<=0.01)return;g.globalAlpha=Math.min(1,a);g.drawImage(vSoftShadow(),x-w,y-w*0.19,w*2,w*0.38);g.globalAlpha=1}
// soft shadows under Bobbin and every loose piece (bigger + darker the closer they are; falling things stand out)
function vObjShadows(g,lv,wl,wr){lv.objs.forEach(function(o){var b=o.body;if(b.getType()!=='dynamic'||(o.hidden))return;var q=b.getPosition();if(q.x<wl-2||q.x>wr+2)return;var ext=o.ext||0.5,hy=null;
  lv.world.rayCast(V(q.x,q.y+ext*0.6),V(q.x,q.y+12),function(f,pt,n,fr){if(f.isSensor()||f.getBody()===b)return -1;var u=f.getUserData();if(u&&(u.type==='player'||u.type==='hand'))return -1;hy=pt.y;return fr});
  if(hy===null)return;var d=Math.max(0,hy-q.y-ext),v=b.getLinearVelocity(),fall=v.y>1.2&&d>0.7,k=Math.max(0,1-d/(fall?12:6)),w=(o.w||(o.r||0.5)*2)*0.55*(0.6+0.4*k);
  vContactShadow(g,q.x,hy,Math.max(0.3,w),(fall?0.25+0.45*k:0.42*k))})}
/* ---------- ambient life per world (drawn in the far-layer space) ---------- */
function vAmbient(lv,t){var a=lv._amb;if(a)return a;var R=GFX.rng(lv.def.id*131+7),th=lv.def.theme,span=lv.def.w*0.3+40;a=lv._amb={planes:[],spools:[],conf:[]};
  if(th==='workshop'||th==='machine'){for(var i=0;i<3;i++)a.planes.push({off:R()*40,sp:0.8+R()*0.6,y:-6+R()*2.2,c:Math.floor(R()*6)})}
  if(th==='sewing'){for(var x=-4;x<span;x+=13+R()*7)a.spools.push({x:x,y:-2.6-R()*1.6,d:2.4+R()*1.2,r1:0.55+R()*0.2,r2:0.4+R()*0.2,c1:Math.floor(R()*6),c2:Math.floor(R()*6),sp:(0.8+R()*0.8)*(R()<0.5?1:-1)})}
  if(th==='finale'){for(var k=0;k<26;k++)a.conf.push({u:R(),v:R(),sp:0.25+R()*0.35,c:k%6,r:R()*6})}
  return a}
function vDrawAmbient(g,lv,t,vl,vr,vt,vb,amt){var th=lv.def.theme,a=vAmbient(lv),i;
  if(a.planes.length){a.planes.forEach(function(p,n){if(n>=Math.ceil(3*amt))return;var span=vr-vl+8,x=vl-4+((t*p.sp+p.off)%span+span)%span,y=p.y+Math.sin(t*0.8+p.off)*0.5,sl=Math.cos(t*0.8+p.off)*0.4;
    g.save();g.translate(x,y);g.rotate(sl*0.35);g.fillStyle='#fffaf0';g.strokeStyle='rgba(110,70,40,0.4)';g.lineWidth=0.03;g.beginPath();g.moveTo(0.55,0);g.lineTo(-0.45,-0.22);g.lineTo(-0.3,0.02);g.lineTo(-0.45,0.16);g.closePath();g.fill();g.stroke();
    g.fillStyle=PAL[p.c];g.beginPath();g.moveTo(0.55,0);g.lineTo(-0.3,0.02);g.lineTo(-0.45,0.16);g.closePath();g.fill();g.restore()})}
  if(th==='sewing')a.spools.forEach(function(s){if(s.x+s.d+1<vl||s.x-1>vr)return;var x2=s.x+s.d,y2=s.y-0.35,ang=t*s.sp;
    g.strokeStyle=PAL[s.c2];g.lineWidth=0.06;g.setLineDash([0.18,0.12]);g.lineDashOffset=-t*s.sp*0.5;g.beginPath();g.moveTo(s.x,s.y-s.r2);g.lineTo(x2,y2-s.r2*0.8);g.moveTo(s.x,s.y+s.r2);g.lineTo(x2,y2+s.r2*0.8);g.stroke();g.setLineDash([]);
    [[s.x,s.y,s.r1,s.c1,s.r2],[x2,y2,s.r1*0.8,s.c2,s.r2*0.8]].forEach(function(q,k){g.save();g.translate(q[0],q[1]);g.rotate(ang*(k?1.25:1));g.fillStyle='#f1c88a';g.beginPath();g.arc(0,0,q[2],0,7);g.fill();g.strokeStyle='rgba(140,90,40,0.6)';g.lineWidth=0.03;g.stroke();
      g.fillStyle=PAL[q[3]];g.beginPath();g.arc(0,0,q[4],0,7);g.fill();g.strokeStyle='rgba(255,255,255,0.35)';g.lineWidth=0.02;for(var r=q[4]*0.45;r<q[4];r+=0.07){g.beginPath();g.arc(0,0,r,0,7);g.stroke()}
      g.fillStyle='#e2b47c';g.beginPath();g.arc(0,0,q[4]*0.38,0,7);g.fill();g.fillStyle='rgba(90,58,40,0.7)';for(var hh=0;hh<3;hh++){g.beginPath();g.arc(Math.cos(hh*2.094)*q[4]*0.2,Math.sin(hh*2.094)*q[4]*0.2,0.035,0,7);g.fill()}g.restore()})});
  if(th==='kitchen'){var pf=vPuff();lv.bg.far.forEach(function(it){if(it.t!=='cup'||it.x<vl-2||it.x>vr+2)return;for(var k=0;k<Math.ceil(4*amt);k++){var ph=((t*0.3+k/4+it.x*0.13)%1+1)%1,r=(0.25+ph*0.55)*it.s;
    g.globalAlpha=Math.sin(ph*Math.PI)*0.55;g.drawImage(pf,it.x+Math.sin(ph*5+k*1.7+t*0.7)*0.25*it.s-r,it.y-0.55*it.s-ph*2.2*it.s-r,r*2,r*2)}g.globalAlpha=1})}
  if(th==='attic'){var bm=vBeam();lv.bg.far.forEach(function(it){if(it.t!=='roundwin'||it.x<vl-6||it.x>vr+3)return;g.save();g.translate(it.x,it.y);g.rotate(-0.42);g.globalAlpha=0.42;g.drawImage(bm,-1.1*it.s,0,2.2*it.s,8*it.s);g.globalAlpha=1;
    for(var k=0;k<Math.ceil(16*amt);k++){var u=((k*0.618+t*0.025)%1),v=(k*0.37%1)-0.5,px=v*(0.5+u*1.6)*it.s*1.4+Math.sin(t*0.6+k)*0.12,py=u*7.5*it.s,tw=0.35+0.65*Math.abs(Math.sin(t*1.3+k*2.1));
      g.fillStyle='rgba(255,252,230,'+(0.75*tw*(1-u*0.8))+')';g.beginPath();g.arc(px,py,0.035+0.02*(k%3),0,7);g.fill()}g.restore()})}
  if(th==='shed'){lv.bg.far.forEach(function(it){if(it.t!=='window'||it.x<vl-2||it.x>vr+2)return;g.save();g.translate(it.x,it.y);g.rotate(it.r);g.scale(it.s,it.s);g.beginPath();g.rect(-1.08,-0.88,2.16,1.76);g.clip();
    g.fillStyle='rgba(120,150,190,0.16)';g.fillRect(-1.1,-0.9,2.2,1.8);g.strokeStyle='rgba(110,160,215,0.6)';g.lineWidth=0.022;g.lineCap='round';
    for(var k=0;k<Math.ceil(18*amt);k++){var rx=-1.2+((k*0.413+t*0.08)%1)*2.6,ry=-1+((k*0.687+t*1.6)%1)*2.1;g.beginPath();g.moveTo(rx,ry);g.lineTo(rx-0.06,ry+0.22);g.stroke()}
    g.fillStyle='rgba(200,225,255,0.85)';for(var d=0;d<4;d++){var dx=-0.85+d*0.55,dy=-0.9+((t*0.12+d*0.31)%1)*1.9;g.beginPath();g.arc(dx,dy,0.045,0,7);g.fill();g.fillRect(dx-0.012,dy-0.25,0.024,0.25)}g.restore()})}
  if(th==='finale'&&a.conf.length){var hgt=vb-vt;a.conf.forEach(function(c,n){if(n>=Math.ceil(26*amt))return;var x=vl+c.u*(vr-vl)+Math.sin(t*0.9+n)*0.4,y=vt+((c.v+t*c.sp/hgt*2)%1)*hgt;g.save();g.translate(x,y);g.rotate(c.r+t*1.5);g.fillStyle=PAL[c.c];g.globalAlpha=0.7;g.fillRect(-0.09,-0.05,0.18,0.1);g.restore()});g.globalAlpha=1}}
/* ---------- lamp light + vignette (cached, quarter resolution) ---------- */
function vOverlay(kind,W,H,th){var k=kind+'|'+Math.round(W)+'x'+Math.round(H)+'|'+th;return vSprite(k,Math.max(8,Math.round(W/4)),Math.max(8,Math.round(H/4)),function(g,w,h){
  if(kind==='lamp'){var gr=g.createRadialGradient(w*0.3,-h*0.3,0,w*0.3,-h*0.3,Math.max(w,h)*1.15);gr.addColorStop(0,'rgba(255,230,170,0.13)');gr.addColorStop(0.45,'rgba(255,226,170,0.05)');gr.addColorStop(1,'rgba(255,220,160,0)');g.fillStyle=gr;g.fillRect(0,0,w,h)}
  else{var vg=g.createRadialGradient(w/2,h*0.45,Math.min(w,h)*0.42,w/2,h*0.45,Math.max(w,h)*0.78);vg.addColorStop(0,'rgba(120,75,35,0)');vg.addColorStop(1,'rgba(120,75,35,0.17)');g.fillStyle=vg;g.fillRect(0,0,w,h)}})}
/* ---------- out-of-focus foreground (big soft craft bits passing close to the lens) ---------- */
function vFgItems(lv){if(lv._fg)return lv._fg;var R=GFX.rng(lv.def.id*53+11),a=[],span=lv.def.w*1.35+30;for(var x=-6;x<span;x+=12+R()*10)a.push({x:x,y:3.5+R()*0.7,s:0.9+R()*0.7,k:Math.floor(R()*4),c:Math.floor(R()*6)});return lv._fg=a}
function vFgSprite(k,c){return vSprite('fg'+k+'_'+c,40,40,function(g,w,h){g.translate(w/2,h/2);g.scale(w/2.6,w/2.6);var col=PAL[c];
  if(k===0){g.fillStyle=col;g.beginPath();g.arc(0,0,1.1,0,7);g.fill();g.strokeStyle='rgba(255,255,255,0.45)';g.lineWidth=0.12;for(var i=0;i<4;i++){g.beginPath();g.arc(0,0,0.9,i*0.8,i*0.8+2);g.stroke()}}
  else if(k===1){g.fillStyle=col;g.beginPath();g.arc(0,0,1.1,0,7);g.fill();g.fillStyle='rgba(90,58,40,0.55)';[[-0.3,-0.3],[0.3,-0.3],[-0.3,0.3],[0.3,0.3]].forEach(function(p){g.beginPath();g.arc(p[0],p[1],0.16,0,7);g.fill()})}
  else if(k===2){g.fillStyle='#d8dbe6';g.beginPath();g.moveTo(-0.8,1);g.lineTo(-0.65,-0.9);g.quadraticCurveTo(0,-1.2,0.65,-0.9);g.lineTo(0.8,1);g.closePath();g.fill();g.fillStyle='rgba(120,120,140,0.4)';for(var y=-0.6;y<0.9;y+=0.3)for(var x=-0.6;x<0.7;x+=0.3){g.beginPath();g.arc(x,y,0.07,0,7);g.fill()}}
  else{g.fillStyle=col;g.beginPath();g.ellipse(0,0,1.15,0.75,0,0,7);g.fill();g.strokeStyle='rgba(255,255,255,0.5)';g.lineWidth=0.1;g.setLineDash([0.25,0.18]);g.beginPath();g.ellipse(0,0,0.9,0.52,0,0,7);g.stroke()}})}
function vDrawFg(g,lv,dpr,W,H,S,cx,cy){var d=1.32,yd=1.12;g.setTransform(dpr*S,0,0,dpr*S,dpr*(W/2-cx*d*S),dpr*(H/2-cy*yd*S));var x0=cx*d-W/2/S-3,x1=cx*d+W/2/S+3,yb=cy*yd+H/2/S;
  vFgItems(lv).forEach(function(it){if(it.x<x0||it.x>x1||it.y-it.s>yb)return;var s=it.s*1.3;g.globalAlpha=0.72;g.drawImage(vFgSprite(it.k,it.c),it.x-s,it.y-s,s*2,s*2)});g.globalAlpha=1}
/* ---------- signs: cached sprites (text measuring every frame is slow on iPhone) ---------- */
function vSignSprite(s,fs,dpr){var k=fs+'|'+dpr;if(s._spr&&s._spr.k===k)return s._spr;var lines=signText(s.text).split('\n'),c=document.createElement('canvas'),x=c.getContext('2d');x.font=fs+'px '+FONT;var wmax=0;
  lines.forEach(function(l){wmax=Math.max(wmax,x.measureText(l).width)});var pw=wmax+fs*1.3,ph=lines.length*fs*1.25+fs*0.8,pad=6;c.width=Math.ceil((pw+pad*2)*dpr);c.height=Math.ceil((ph+pad*2)*dpr);
  x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,pad*dpr,pad*dpr);x.font=fs+'px '+FONT;x.textAlign='center';x.textBaseline='middle';
  x.fillStyle='rgba(110,70,30,0.18)';x.fillRect(3,4,pw,ph);x.fillStyle='#fffaf0';x.fillRect(0,0,pw,ph);x.strokeStyle='rgba(120,170,220,0.25)';x.lineWidth=1;
  for(var ly=fs*0.9;ly<ph-4;ly+=fs*1.25){x.beginPath();x.moveTo(4,ly+fs*0.62);x.lineTo(pw-4,ly+fs*0.62);x.stroke()}
  x.fillStyle='rgba(120,75,35,0.12)';x.beginPath();x.moveTo(0,ph);for(var zx=0;zx<pw;zx+=8){x.lineTo(zx+4,ph+3);x.lineTo(zx+8,ph)}x.fill();
  x.fillStyle='#ff7fae';x.beginPath();x.arc(pw/2,5,4,0,7);x.fill();x.fillStyle='#5a3a28';lines.forEach(function(l,i){x.fillText(l,pw/2,fs*0.9+i*fs*1.25)});
  return s._spr={k:k,c:c,pw:pw,ph:ph,pad:pad}}
/* ---------------- v1.3 progression: prize wallet, wardrobe, star ratings + par times, time-trial ghosts, world map, stickers ----------------
   Save compatibility: everything new lives in NEW top-level save keys (wallet, ward, own, stars, tt, stickers, stickInv, mapAt).
   v1.0-v1.2 copy unknown keys through untouched, keep save.costume an index into the original 8 colours and save.best in its old shape.
   Ghosts are stored under their own localStorage keys (bobbin-ghost-v1-<level>), which older versions never read. */
var PAR={101:115,102:70,103:75,104:55,105:80,1:35,2:45,3:60,4:60,5:85,6:100,7:95,8:100,9:110,10:115,11:125,12:130,13:120,14:140,15:145,16:145,17:150,18:160,19:170,20:205};
var STAR_PRIZE=2/3,STAR_LIVES=2,GH_HZ=12,GH_Q=0.04,GKEY='bobbin-ghost-v1-';
function parOf(id){return PAR[id]||120}
function runStars(id,got,total,t,lives){var c=starCrit(id,got,total,t,lives);return 1+(c.prizes?1:0)+(c.par?1:0)}
function starCrit(id,got,total,t,lives){return {finish:true,prizes:got>=Math.ceil(total*STAR_PRIZE),par:t<=parOf(id)&&lives>=STAR_LIVES}}
function starsFor(id){var b=save.best[id];if(!b||!b.done)return 0;var s=+((save.stars||{})[id])||0;var c=1+((b.prizes||0)>=Math.ceil((b.total||1)*STAR_PRIZE)?1:0);return Math.max(Math.min(3,s),c)}
/* ---- wardrobe catalogue ---- */
var HAT_ITEMS=[['thimble','Thimble',15],['bow','Ribbon bow',20],['flower','Daisy',20],['sprout','Sprout',25],['party','Party hat',30],['beanie','Bobble beanie',40],['acorn','Acorn cap',45],['chef','Chef hat',60],['tophat','Top hat',80],['crown','Button crown',120],['gearcap','Robo cap',0,101],['pincap','Pincushion cap',0,102],['jellycrown','Jelly crown',0,103],['shako','Captain\u2019s shako',0,104],['gnomehat','Gnome hat',0,105]];
var PAT_ITEMS=[['dots','Polka dots',15],['stripes','Stripes',15],['gingham','Gingham',25],['zigzag','Zig-zag stitch',25],['hearts','Hearts',35],['stars','Stars',40],['patch','Patchwork',50]];
var PAT_COLS=[['Snow','#ffffff'],['Butter','#ffd23f'],['Rose','#ff7fae'],['Cocoa','#5a3a28'],['Mint','#4fd1a5'],['Lilac','#9f82ff']];
var STICKERS=[['star','⭐',5],['heart','💖',5],['button','🔘',6],['flower','🌸',8],['bee','🐝',8],['lady','🐞',8],['shroom','🍄',10],['cake','🧁',10],['balloon','🎈',12],['rainbow','🌈',15],['butterfly','🦋',15],['crown','👑',25]];
function stickerEmoji(id){var s=STICKERS.filter(function(x){return x[0]===id})[0];return s?s[1]:'⭐'}
/* ---- save migration (idempotent; tolerates saves written by older versions, which keep these keys verbatim) ---- */
function progInit(){var s=save;
  if(typeof s.wallet!=='number'||!isFinite(s.wallet)||s.wallet<0){var sum=0;for(var k in s.best){var b=s.best[k];if(b&&b.done)sum+=Math.max(0,+b.prizes||0)}s.wallet=sum;s.walletBackfill=sum}
  s.wallet=Math.floor(s.wallet);
  if(!s.ward||typeof s.ward!=='object')s.ward={hat:'',pat:'',pcol:'#ffffff'};if(typeof s.ward.hat!=='string')s.ward.hat='';if(typeof s.ward.pat!=='string')s.ward.pat='';if(typeof s.ward.pcol!=='string')s.ward.pcol='#ffffff';
  if(!s.own||typeof s.own!=='object')s.own={};if(!s.stars||typeof s.stars!=='object')s.stars={};if(!s.tt||typeof s.tt!=='object')s.tt={};
  if(!Array.isArray(s.stickers))s.stickers=[];s.stickers=s.stickers.filter(function(q){return q&&typeof q.id==='string'&&isFinite(q.x)&&isFinite(q.y)});
  if(!s.stickInv||typeof s.stickInv!=='object')s.stickInv={};
  if(!s.v14||typeof s.v14!=='object'||!(s.v14.g>=1)){var mx=0;for(var kk in s.best){var bq=s.best[kk];if(bq&&bq.done&&+kk<100&&+kk>mx)mx=+kk}s.v14={g:mx+1}}
  if(!(s.mapAt>=1&&s.mapAt<=LEVELS.length))s.mapAt=1;if(s.mapBoss!==undefined&&!(typeof BOSS_INFO!=='undefined'&&BOSS_INFO[s.mapBoss]))delete s.mapBoss;
  if(!(s.costume>=0&&s.costume<COSTUMES.length))s.costume=0;
  if(s.ward.hat&&!s.own['hat_'+s.ward.hat])s.ward.hat='';if(s.ward.pat&&!s.own['pat_'+s.ward.pat])s.ward.pat=''}
// what Bobbin wears right now; in the wardrobe an item awaiting 'Buy?' is tried on live
function wardDraw(){var w=save.ward||{},o={hat:w.hat||'',pat:w.pat||'',pcol:w.pcol||'#ffffff'};if(state==='costume'&&WARD.confirm){var k=WARD.confirm.split('_');if(k[0]==='hat')o.hat=k[1];else if(k[0]==='pat')o.pat=k[1]}return o}
function wardLook(){var w=save.ward||{};return {col:COSTUMES[save.costume%COSTUMES.length][1],hat:w.hat||'',pat:w.pat||'',pcol:w.pcol||'#ffffff'}}
/* ---- ghost recording (12 Hz; 3 chars/sample: dx, dy in 4 cm units as chr(79+d), pose; '~' + 6 base-94 chars = absolute jump) ---- */
var EXPRS=['happy','joy','effort','wow'];
function b94(n,len){var s='';for(var i=0;i<len;i++){s=String.fromCharCode(33+n%94)+s;n=Math.floor(n/94)}return s}
function u94(s){var n=0;for(var i=0;i<s.length;i++)n=n*94+(s.charCodeAt(i)-33);return n}
function poseOf(p){var e=EXPRS.indexOf(p.expr);return 35+(p.face>0?1:0)+(p.grounded?0:2)+(p.grab?4:0)+((p.squash||p.hidden)?8:0)+(e<0?0:e)*16}
function ghostRecStart(lv){lv.rec={s:'',n:0,acc:0,qx:null,qy:null,look:wardLook()}}
function ghostRecStep(lv,dt){var r=lv.rec;if(!r)return;r.acc+=dt;if(r.acc<1/GH_HZ-1e-6&&r.n>0)return;r.acc=r.n>0?r.acc-1/GH_HZ:0;
  var pp=player.body.getPosition(),qx=Math.round(pp.x/GH_Q),qy=Math.round(pp.y/GH_Q),dx=r.qx===null?999:qx-r.qx,dy=r.qx===null?999:qy-r.qy;
  if(Math.abs(dx)>46||Math.abs(dy)>46){r.s+='~'+b94(qx+400000,3)+b94(qy+400000,3);r.qx=qx;r.qy=qy}else{r.s+=String.fromCharCode(79+dx)+String.fromCharCode(79+dy);r.qx+=dx;r.qy+=dy}
  if(r.n===0)r.t0=lv.t;r.s+=String.fromCharCode(poseOf(player));r.n++;if(r.n>GH_HZ*600)lv.rec=null}
function ghostDecode(g){var xs=[],ys=[],ps=[],s=g.s,i=0,qx=0,qy=0;while(i<s.length){var c=s[i];if(c==='~'){qx=u94(s.substr(i+1,3))-400000;qy=u94(s.substr(i+4,3))-400000;i+=7}else{qx+=s.charCodeAt(i)-79;qy+=s.charCodeAt(i+1)-79;i+=2}
  xs.push(qx*GH_Q);ys.push(qy*GH_Q);ps.push(s.charCodeAt(i)-35);i++}return {t:g.t,t0:+g.t0||0,xs:xs,ys:ys,ps:ps,look:g.look||{},hz:g.hz||GH_HZ}}
function ghostLoad(id){try{var g=JSON.parse(localStorage.getItem(GKEY+id)||'null');if(g&&typeof g.s==='string'&&g.t>0)return g}catch(e){}return null}
function ghostSave(id,lv){var r=lv.rec;if(!r||r.n<2)return false;ghostRecStep(lv,1);var g={v:1,t:+lv.t.toFixed(3),t0:+(r.t0||0).toFixed(4),hz:GH_HZ,look:r.look,s:r.s,at:Date.now()};
  try{localStorage.setItem(GKEY+id,JSON.stringify(g));return true}catch(e){return false}}
function vGhostDraw(g,lv){var G=lv.ghost;if(!G||!G.xs.length)return;var f=Math.max(0,lv.t-G.t0)*G.hz,i=Math.floor(f),k=f-i;if(i>=G.xs.length-1){if(lv.t>G.t+0.6)return;i=G.xs.length-2;k=1}
  var p=G.ps[i]|0;if(p&8)return;if(Math.abs(G.xs[i+1]-G.xs[i])+Math.abs(G.ys[i+1]-G.ys[i])>1.5)k=k<0.5?0:1;var x=G.xs[i]+(G.xs[i+1]-G.xs[i])*k,y=G.ys[i]+(G.ys[i+1]-G.ys[i])*k,air=!!(p&2),face=(p&1)?1:-1,ex=EXPRS[(p>>4)&3]||'happy';
  G.run=(G.run||0)+Math.abs(x-(G.lx===undefined?x:G.lx))*3.2;G.lx=x;var fin=lv.t>G.t?Math.max(0,1-(lv.t-G.t)*1.6):1;
  g.save();g.globalAlpha=0.42*fin;var L2=G.look;
  GFX.drawBobbin(g,{x:x,y:y,r:R,sx:fin,sy:fin,face:face,run:G.run,air:air,col:L2.col||'#4aa8ff',hat:L2.hat||'',pat:L2.pat||'',pcol:L2.pcol||'#fff',expr:ex,tuft:air?-0.3:0,tilt:air?face*0.06:0});
  g.globalAlpha=0.5*fin;GFX.wtext(g,'👻',x,y-R-(L2.hat?0.95:0.65),0.3,'#fff');g.restore()}
/* ---- per-level hooks called from game_c ---- */
function progStart(lv,resume){lv.tt=!!save.tt[lv.def.id];lv.ghost=null;lv.rec=null;lv.ttFresh=!resume||resume.lvl!==lv.def.id;
  if(lv.tt){var gs=ghostLoad(lv.def.id);if(gs)lv.ghost=ghostDecode(gs);if(lv.ttFresh)ghostRecStart(lv)}
  document.body.classList.toggle('tt',lv.tt);var gh=document.getElementById('ghostHud');if(gh){gh.classList.toggle('hidden',!lv.tt);gh.textContent=lv.ghost?'👻 '+fmt2(lv.ghost.t):'👻 —'}}
function progStep(lv,dt){if(lv.rec)ghostRecStep(lv,dt)}
function fmt2(t){t=Math.max(0,t);var m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(1)}
function progFinish(lv){var id=lv.def.id,lives=lv.lives==null?3:lv.lives,tot=lv.prizes.length;
  lv.crit=starCrit(id,lv.got,tot,lv.t,lives);lv.runStars=runStars(id,lv.got,tot,lv.t,lives);
  save.stars[id]=Math.max(+save.stars[id]||0,lv.runStars);
  lv.earned=lv.got;save.wallet=(save.wallet||0)+lv.got;mapSetAt(id);
  lv.ghostRes=null;if(lv.tt&&lv.rec){var old=lv.ghost;if(!old||lv.t<old.t){var ok=ghostSave(id,lv);lv.ghostRes={beat:!!old,by:old?old.t-lv.t:0,saved:ok}}else lv.ghostRes={beat:false,behind:lv.t-old.t}}
  persist()}
/* ---------------- World map ---------------- */
var MAP={k:1,W:0,H:600,regions:[],nodes:[],path:[],cum:[],built:false,bob:{s:0,to:null,face:1,t:0,run:0,cb:null},drag:null,walkQ:null};
var MAP_ART={workshop:{bg:'cork',tag:'The Workshop'},sewing:{bg:'felt_pink',tag:'Sewing Basket'},kitchen:{bg:'gingham_b',tag:'Paper Kitchen'},attic:{bg:'felt_purple',tag:'Toy Attic'},shed:{bg:'burlap',tag:'Garden Shed'},finale:{bg:'felt_yellow',tag:'Grand Finale'}};
function mapLayout(){var x=0,regs=[],nodes=[],ys=[[400,250],[420,240,400,230],[250,410,230,400],[420,250,410,240],[240,400,250,420],[300,420]];
  WORLDS.forEach(function(wd,wi){var lv=LEVELS.filter(function(d){return (d.world||0)===wd.id});var bo=BOSS_OF_WORLD[wd.id];if(bo&&stageDef(bo))lv=lv.concat([stageDef(bo)]);var w=lv.length<=2?330:lv.length*110+50;regs.push({x:x,w:w,wd:wd,theme:wd.theme});
    lv.forEach(function(d,j){var yy=d.boss?325:(ys[wi]||[300])[j%(ys[wi]||[300]).length];nodes.push({id:d.id,x:x+w*(j+0.7)/(lv.length+0.45)-(d.boss?6:0),y:yy,world:wi,boss:!!d.boss})});x+=w});
  MAP.W=x+60;MAP.regions=regs;MAP.nodes=nodes;
  var pts=[[30,470]].concat(nodes.map(function(n){return [n.x,n.y]})).concat([[x+30,320]]);var P=[];
  for(var i=0;i<pts.length-1;i++){var p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];for(var s=0;s<16;s++){var t=s/16,t2=t*t,t3=t2*t;
    P.push([0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)])}}
  P.push(pts[pts.length-1]);var cum=[0];for(var j=1;j<P.length;j++)cum.push(cum[j-1]+Math.hypot(P[j][0]-P[j-1][0],P[j][1]-P[j-1][1]));
  MAP.path=P;MAP.cum=cum;nodes.forEach(function(n,i){n.s=cum[(i+1)*16]})}
function mapPt(s){var c=MAP.cum,P=MAP.path,lo=0,hi=c.length-1;s=Math.max(0,Math.min(c[hi],s));while(hi-lo>1){var m=(lo+hi)>>1;if(c[m]<=s)lo=m;else hi=m}var k=(s-c[lo])/((c[hi]-c[lo])||1);return [P[lo][0]+(P[hi][0]-P[lo][0])*k,P[lo][1]+(P[hi][1]-P[lo][1])*k]}
function mapNode(id){return MAP.nodes.filter(function(n){return n.id===id})[0]||MAP.nodes[0]}
function mapScale(){var sc=document.getElementById('mapScroll');var h=sc.clientHeight||window.innerHeight;return Math.max(0.5,Math.min(1.25,h/MAP.H))}
function texPat(g,name,sc){var c=GFX.texCanvases[name];if(!c)return '#e9c99a';var p=g.createPattern(c,'repeat');if(p.setTransform&&typeof DOMMatrix!=='undefined')p.setTransform(new DOMMatrix().scale(sc,sc));return p}
function mapDrawRegion(cv,rg,k){var dpr=Math.min(2,window.devicePixelRatio||1),w=rg.w,h=MAP.H;cv.width=Math.round(w*k*dpr);cv.height=Math.round(h*k*dpr);cv.style.width=Math.round(w*k)+'px';cv.style.height=Math.round(h*k)+'px';cv.style.left=Math.round(rg.x*k)+'px';
  var g=cv.getContext('2d');g.setTransform(k*dpr,0,0,k*dpr,0,0);var art=MAP_ART[rg.theme]||MAP_ART.workshop;
  g.fillStyle='#e7c08a';g.fillRect(0,0,w,h);g.fillStyle=texPat(g,'wood',0.9);g.fillRect(0,0,w,h);
  // world mat: a felt / fabric piece with pinked edges and stitching, laid on the craft table
  var mx=14,my=40,mw=w-28,mh=h-80;g.save();g.translate(3,6);g.fillStyle='rgba(70,40,15,0.22)';g.fillRect(mx,my,mw,mh);g.restore();
  g.beginPath();var zz=9;for(var x=mx;x<=mx+mw;x+=zz)g.lineTo(x,my+((x-mx)/zz%2?0:-5));for(var y=my;y<=my+mh;y+=zz)g.lineTo(mx+mw+((y-my)/zz%2?0:5),y);for(var x2=mx+mw;x2>=mx;x2-=zz)g.lineTo(x2,my+mh+((x2-mx)/zz%2?0:5));for(var y2=my+mh;y2>=my;y2-=zz)g.lineTo(mx+((y2-my)/zz%2?0:-5),y2);g.closePath();
  g.fillStyle=rg.wd.col;g.fill();g.save();g.clip();g.globalAlpha=0.9;g.fillStyle=texPat(g,art.bg,0.8);g.fillRect(0,0,w,h);g.globalAlpha=1;
  g.fillStyle='rgba(255,250,240,0.18)';g.fillRect(0,0,w,h);g.restore();
  g.save();g.setLineDash([9,7]);g.strokeStyle='rgba(255,250,240,0.85)';g.lineWidth=3;g.strokeRect(mx+12,my+12,mw-24,mh-24);g.restore();
  mapDoodles(g,rg,w,h);
  // world name tag
  g.save();g.translate(w/2,my+30);g.rotate(-0.03);g.font='bold 26px '+FONT;var tw=g.measureText(rg.wd.name).width+34;g.fillStyle='rgba(70,40,15,0.2)';GFX.rr(g,-tw/2+3,-19,tw,40,12);g.fill();
  g.fillStyle='#fffaf0';GFX.rr(g,-tw/2,-22,tw,40,12);g.fill();g.strokeStyle=rg.wd.col;g.lineWidth=3;g.setLineDash([6,5]);GFX.rr(g,-tw/2+5,-17,tw-10,30,9);g.stroke();g.setLineDash([]);
  g.fillStyle='#5a3a28';g.textAlign='center';g.textBaseline='middle';g.fillText(rg.wd.name,0,-1);g.restore();
  // the string path: a dotted cardboard trail with a thread running through it
  g.save();g.translate(-rg.x,0);g.lineCap='round';g.lineJoin='round';g.beginPath();MAP.path.forEach(function(p,i){if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1])});
  g.strokeStyle='rgba(70,40,15,0.25)';g.lineWidth=20;g.stroke();g.strokeStyle='#e9c48e';g.lineWidth=16;g.stroke();g.setLineDash([2,10]);g.strokeStyle='#b9874f';g.lineWidth=6;g.stroke();
  g.setLineDash([10,8]);g.strokeStyle='#ff7fae';g.lineWidth=3;g.stroke();g.restore()}
function mapDoodles(g,rg,w,h){var th=rg.theme,R2=GFX.rng(rg.x+7);function sp(x,y,s,c){g.save();g.translate(x,y);g.scale(s,s);GFX.spool(g,0,0,1,c);g.restore()}
  g.save();g.globalAlpha=0.95;
  if(th==='workshop'){[[60,140,'#ff9f43'],[w-70,520,'#4aa8ff']].forEach(function(b){GFX.sewButton(g,b[0],b[1],22,b[2],4)});g.fillStyle='#fff8ea';g.save();g.translate(w-90,130);g.rotate(0.2);g.fillRect(-30,-22,60,44);g.fillStyle='#ff6f9f';g.beginPath();g.arc(0,-18,5,0,7);g.fill();g.restore();
    g.strokeStyle='#9aa3ad';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(90,540);g.lineTo(150,500);g.stroke()}
  if(th==='sewing'){sp(70,150,34,'#ff6f9f');sp(w-60,530,30,'#4aa8ff');sp(w-80,140,26,'#ffd23f');g.strokeStyle='#ff6f9f';g.lineWidth=2;g.beginPath();g.moveTo(70,150);g.bezierCurveTo(140,240,40,330,120,520);g.stroke()}
  if(th==='kitchen'){g.save();g.translate(80,520);g.fillStyle='#fffaf0';g.beginPath();g.ellipse(0,18,42,9,0,0,7);g.fill();g.fillStyle='#ff9fc0';g.beginPath();g.moveTo(-26,-22);g.lineTo(26,-22);g.lineTo(18,14);g.lineTo(-18,14);g.closePath();g.fill();g.strokeStyle='#5a3a28';g.lineWidth=2;g.stroke();
    g.strokeStyle='rgba(255,255,255,0.8)';g.lineWidth=3;for(var k=0;k<3;k++){g.beginPath();g.moveTo(-10+k*10,-30);g.quadraticCurveTo(-18+k*10,-44,-8+k*10,-56);g.stroke()}g.restore();
    g.fillStyle='#ffd23f';g.beginPath();g.arc(w-70,130,24,0,7);g.fill();g.fillStyle='#fff';[[-8,-6],[6,-9],[2,7]].forEach(function(q){g.beginPath();g.arc(w-70+q[0],130+q[1],3,0,7);g.fill()})}
  if(th==='attic'){g.save();g.translate(w-80,520);g.fillStyle='#c98f5a';g.beginPath();g.arc(0,0,26,0,7);g.arc(-20,-22,10,0,7);g.arc(20,-22,10,0,7);g.fill();g.fillStyle='#f3d2a8';g.beginPath();g.ellipse(0,6,12,9,0,0,7);g.fill();g.fillStyle='#3a2d3a';[-9,9].forEach(function(e){g.beginPath();g.arc(e,-6,3,0,7);g.fill()});g.restore();
    g.fillStyle='rgba(255,250,220,0.35)';g.beginPath();g.moveTo(60,60);g.lineTo(120,60);g.lineTo(260,560);g.lineTo(110,560);g.closePath();g.fill()}
  if(th==='shed'){[[70,530],[w-70,140]].forEach(function(q){g.save();g.translate(q[0],q[1]);g.fillStyle='#e07a4f';g.beginPath();g.moveTo(-24,-10);g.lineTo(24,-10);g.lineTo(18,26);g.lineTo(-18,26);g.closePath();g.fill();g.fillStyle='#5fd17a';[-10,0,10].forEach(function(l,i){g.beginPath();g.ellipse(l,-22-(i%2)*6,6,14,l*0.05,0,7);g.fill()});g.restore()});
    g.strokeStyle='rgba(120,180,240,0.6)';g.lineWidth=2;for(var r=0;r<14;r++){var rx=R2()*w,ry=60+R2()*480;g.beginPath();g.moveTo(rx,ry);g.lineTo(rx-4,ry+12);g.stroke()}}
  if(th==='finale'){var cols=['#ff7fae','#4aa8ff','#4fd1a5','#ffd23f','#9f82ff'];for(var c=0;c<60;c++){g.fillStyle=cols[c%5];g.save();g.translate(30+R2()*(w-60),70+R2()*480);g.rotate(R2()*6);g.fillRect(-4,-2,8,4);g.restore()}
    g.save();g.translate(w-90,470);g.fillStyle='#ffad5c';g.fillRect(-40,-30,80,60);g.fillStyle='#ff7fae';g.fillRect(-6,-30,12,60);g.fillRect(-40,-6,80,12);g.strokeStyle='#5a3a28';g.lineWidth=2;g.strokeRect(-40,-30,80,60);g.restore()}
  g.restore()}
function mapBuild(){if(!MAP.nodes.length)mapLayout();var k=MAP.k=mapScale(),inner=document.getElementById('mapInner');inner.style.width=Math.round(MAP.W*k)+'px';inner.style.height=Math.round(MAP.H*k)+'px';
  inner.querySelectorAll('canvas.mReg,.mNode,.mSticker').forEach(function(e){e.remove()});
  MAP.regions.forEach(function(rg){var cv=document.createElement('canvas');cv.className='mReg';inner.insertBefore(cv,inner.firstChild);mapDrawRegion(cv,rg,k)});
  MAP.nodes.forEach(function(n){var d=stageDef(n.id),b=save.best[n.id],un=stageUnlocked(n.id),st=starsFor(n.id),done=!!(b&&b.done);
    var el=document.createElement('button');el.className='mNode '+(done?'done':un?'open':'locked')+(save.tt[n.id]?' ttOn':'')+(n.boss?' boss':'');el.setAttribute('data-lv',n.id);el.style.left=Math.round(n.x*k)+'px';el.style.top=Math.round(n.y*k)+'px';el.style.setProperty('--wc',WORLDS[n.world].col);
    el.innerHTML='<b>'+(n.boss?(un?BOSS_INFO[n.id].icon:'🔒'):(un?n.id:'🔒'))+'</b>'+(done?'<span class="mSt">'+'★★★'.slice(0,st)+'<i>'+'★★★'.slice(st)+'</i></span>':un?'<span class="mSt new">new</span>':'');
    el.setAttribute('aria-label',(n.boss?'Boss '+BOSS_INFO[n.id].name:'Level '+n.id+' '+(d?d.name:''))+(un?'':' (locked)'));
    el.addEventListener('click',function(e){e.stopPropagation();if(MAP.drag&&MAP.drag.moved)return;SND.unlock();if(!un){SND.sfx('unswitch');toast(lockMsg(n.id));return}SND.sfx('tap');mapWalkTo(n.id,function(){mapPop(n.id)})});inner.appendChild(el)});
  save.stickers.forEach(function(q,i){inner.appendChild(mapStickerEl(q,i))});
  var tot=levelTotals();document.getElementById('mapStars').textContent='★ '+tot.stars+'/'+tot.starMax;document.getElementById('mapWallet').textContent=save.wallet;
  mapBobPlace();MAP.built=true}
function mapBobPlace(){var bb=MAP.bob,cv=document.getElementById('mapBob'),p=mapPt(bb.s),k=MAP.k,still=bb.to===null;cv.style.left=Math.round(p[0]*k-cv.offsetWidth/2-(still?34:0))+'px';cv.style.top=Math.round(p[1]*k-cv.offsetHeight+(still?6:14))+'px'}
function mapDrawBob(dt){var cv=document.getElementById('mapBob');if(!cv)return;var bb=MAP.bob,dpr=Math.min(2,window.devicePixelRatio||1),w=cv.offsetWidth||70,h=cv.offsetHeight||80;
  if(cv.width!==Math.round(w*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}var g2=cv.getContext('2d');g2.setTransform(1,0,0,1,0,0);g2.clearRect(0,0,cv.width,cv.height);
  var sc=h*dpr/1.9;g2.setTransform(sc,0,0,sc,cv.width/2,cv.height-0.16*sc);var walking=bb.to!==null,hop=walking?Math.abs(Math.sin(bb.run*0.9))*0.12:Math.max(0,Math.sin(bb.t*2.4))*0.03;
  g2.fillStyle='rgba(70,40,15,0.25)';g2.beginPath();g2.ellipse(0,0.06,0.42,0.09,0,0,7);g2.fill();var lk=wardLook();
  GFX.drawBobbin(g2,{x:0,y:-0.48-hop,r:0.48,sx:1,sy:1,face:bb.face,run:bb.run,air:walking&&hop>0.06,col:lk.col,hat:lk.hat,pat:lk.pat,pcol:lk.pcol,expr:walking?'joy':'happy',blink:(bb.t%3.4)<0.12,tuft:Math.sin(bb.t*3)*0.2})}
function mapSetAt(id){if(isBossId(id)){save.mapBoss=id;var lv=LEVELS.filter(function(d){return d.world===BOSS_INFO[id].w});if(lv.length)save.mapAt=lv[lv.length-1].id}else{save.mapAt=id;delete save.mapBoss}}
function mapAtNow(){return (save.mapBoss&&BOSS_INFO[save.mapBoss])?save.mapBoss:(save.mapAt||1)}
function mapWalkTo(id,cb){var n=mapNode(id),bb=MAP.bob;if(Math.abs(bb.s-n.s)<1){mapSetAt(id);cb&&cb();return}bb.from=bb.s;bb.to=n.s;bb.wt=0;bb.dur=Math.min(1.6,Math.max(0.35,Math.abs(n.s-bb.s)/650));bb.face=n.s>bb.s?1:-1;bb.cb=cb;bb.dest=id;SND.sfx('jump')}
function mapTick(dt){var bb=MAP.bob;bb.t+=dt;if(bb.to!==null){bb.wt+=dt;var k=Math.min(1,bb.wt/bb.dur),e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2;bb.s=bb.from+(bb.to-bb.from)*e;bb.run+=dt*14;mapBobPlace();mapFollow();
    if(k>=1){bb.to=null;bb.s=mapNode(bb.dest).s;mapSetAt(bb.dest);persist();SND.sfx('pop',3);var cb=bb.cb;bb.cb=null;mapBobPlace();cb&&cb()}}
  mapDrawBob(dt)}
function mapFollow(){var sc=document.getElementById('mapScroll'),p=mapPt(MAP.bob.s),x=p[0]*MAP.k,y=p[1]*MAP.k,m=sc.clientWidth*0.25;
  if(x<sc.scrollLeft+m)sc.scrollLeft=x-m;else if(x>sc.scrollLeft+sc.clientWidth-m)sc.scrollLeft=x-sc.clientWidth+m;var my=sc.clientHeight*0.2;if(y<sc.scrollTop+my)sc.scrollTop=y-my;else if(y>sc.scrollTop+sc.clientHeight-my)sc.scrollTop=y-sc.clientHeight+my}
function mapCenterOn(id){var sc=document.getElementById('mapScroll'),n=mapNode(id);sc.scrollLeft=Math.max(0,n.x*MAP.k-sc.clientWidth/2);sc.scrollTop=Math.max(0,n.y*MAP.k-sc.clientHeight/2)}
function openMap(fromLevel){if(SND.setTrack){SND.setTrack('map');if(SND.ctx())SND.startMusic()}state='map';hud.classList.add('hidden');touchUI.classList.add('hidden');showScreen('map');if(!MAP.nodes.length)mapLayout();
  var at=mapAtNow();MAP.bob.s=mapNode(at).s;MAP.bob.to=null;mapBuild();mapCenterOn(at);mapPopClose();
  // after finishing a level, Bobbin trots on to the newly opened node
  if(fromLevel&&save.best[at]&&save.best[at].done){var nx=stageDef(nextStage(at));if(nx&&stageUnlocked(nx.id)&&!(save.best[nx.id]&&save.best[nx.id].done))setTimeout(function(){if(state==='map'&&MAP.bob.to===null)mapWalkTo(nx.id)},450)}}
function mapPop(id){var d=stageDef(id),b=save.best[id],st=starsFor(id),gh=ghostLoad(id),pop=document.getElementById('lvPop');
  pop.setAttribute('data-lv',id);pop.style.setProperty('--wc',WORLDS[d.world||0].col);
  var bi=isBossId(id)&&BOSS_INFO[id];document.getElementById('lpWorld').textContent=WORLDS[d.world||0].name+(bi?' · '+bi.icon+' Boss':' · Level '+id);document.getElementById('lpName').textContent=d.name;document.getElementById('lpBlurb').textContent=(d.blurb||'')+(bi?' Reward: '+bi.hatName+(save.own['hat_'+bi.hat]?' (won!)':'')+'.':'');pop.classList.toggle('bossPop',!!bi);
  document.getElementById('lpStars').innerHTML='<span class="'+(st>=1?'on':'')+'">★</span><span class="'+(st>=2?'on':'')+'">★</span><span class="'+(st>=3?'on':'')+'">★</span>';
  document.getElementById('lpBest').textContent=b&&b.done?fmt(b.time):'—';document.getElementById('lpPar').textContent=fmt(parOf(id));document.getElementById('lpPrizes').textContent=b&&b.done?b.prizes+' / '+b.total:'—';
  document.getElementById('lpGhost').textContent=gh?fmt2(gh.t):'none yet';
  var tg=document.getElementById('lpTT');tg.checked=!!save.tt[id];
  document.getElementById('lpHow').textContent='★ finish · ★ pop '+Math.round(STAR_PRIZE*100)+'% of the prizes · ★ beat par '+fmt(parOf(id))+' losing at most one life';
  pop.classList.remove('hidden')}
function mapPopClose(){var p=document.getElementById('lvPop');if(p)p.classList.add('hidden')}
/* ---- stickers on the map: drag from the tray to place, drag placed ones to move, drop on the tray to put back ---- */
function mapStickerEl(q,i){var el=document.createElement('div');el.className='mSticker';el.textContent=stickerEmoji(q.id);el.style.left=Math.round(q.x*MAP.k)+'px';el.style.top=Math.round(q.y*MAP.k)+'px';el.style.transform='translate(-50%,-50%) rotate('+(q.r||0)+'deg)';el.setAttribute('data-i',i);
  el.addEventListener('pointerdown',function(e){stickDragStart(e,{placed:i,id:q.id})});return el}
function stickInvLeft(id){var n=+save.stickInv[id]||0;return n-save.stickers.filter(function(q){return q.id===id}).length}
function buildTray(){var h=document.getElementById('trayItems');h.innerHTML='';var any=false;
  STICKERS.forEach(function(s){var left=stickInvLeft(s[0]);if((+save.stickInv[s[0]]||0)<=0)return;any=true;var el=document.createElement('div');el.className='tItem'+(left>0?'':' empty');el.innerHTML='<span>'+s[1]+'</span><b>'+left+'</b>';
    el.addEventListener('pointerdown',function(e){if(stickInvLeft(s[0])<=0){toast('All your '+s[1]+' stickers are on the map');return}stickDragStart(e,{id:s[0]})});h.appendChild(el)});
  document.getElementById('trayEmpty').classList.toggle('hidden',any)}
function stickDragStart(e,info){e.preventDefault();e.stopPropagation();var fl=document.getElementById('stickFloat');fl.textContent=stickerEmoji(info.id);fl.classList.remove('hidden');
  MAP.drag={info:info,x0:e.clientX,y0:e.clientY,moved:false,pid:e.pointerId};stickMove(e);
  if(info.placed!==undefined){var el=document.querySelector('.mSticker[data-i="'+info.placed+'"]');if(el)el.style.opacity='0.25'}}
function stickMove(e){var d=MAP.drag;if(!d)return;if(Math.abs(e.clientX-d.x0)+Math.abs(e.clientY-d.y0)>6)d.moved=true;var fl=document.getElementById('stickFloat');fl.style.left=e.clientX+'px';fl.style.top=e.clientY+'px'}
function stickEnd(e){var d=MAP.drag;if(!d)return;MAP.drag=null;document.getElementById('stickFloat').classList.add('hidden');
  var tray=document.getElementById('stickTray'),tr=tray.getBoundingClientRect(),overTray=!tray.classList.contains('hidden')&&e.clientX>=tr.left&&e.clientX<=tr.right&&e.clientY>=tr.top&&e.clientY<=tr.bottom;
  var sc=document.getElementById('mapScroll').getBoundingClientRect(),inner=document.getElementById('mapInner').getBoundingClientRect(),overMap=e.clientX>=sc.left&&e.clientX<=sc.right&&e.clientY>=sc.top&&e.clientY<=sc.bottom;
  var ux=(e.clientX-inner.left)/MAP.k,uy=(e.clientY-inner.top)/MAP.k;
  if(d.info.placed!==undefined){var q=save.stickers[d.info.placed];if(!q)return;if(overTray){save.stickers.splice(d.info.placed,1);SND.sfx('unswitch')}else if(overMap&&d.moved){q.x=Math.max(10,Math.min(MAP.W-10,ux));q.y=Math.max(10,Math.min(MAP.H-10,uy));SND.sfx('pop',2)}}
  else if(overMap&&!overTray){save.stickers.push({id:d.info.id,x:Math.max(10,Math.min(MAP.W-10,ux)),y:Math.max(10,Math.min(MAP.H-10,uy)),r:Math.round((Math.random()-0.5)*24)});SND.sfx('pop',4)}
  persist();mapRefreshStickers();buildTray()}
function mapRefreshStickers(){var inner=document.getElementById('mapInner');inner.querySelectorAll('.mSticker').forEach(function(e){e.remove()});save.stickers.forEach(function(q,i){inner.appendChild(mapStickerEl(q,i))})}
window.addEventListener('pointermove',function(e){if(MAP.drag)stickMove(e)});window.addEventListener('pointerup',function(e){if(MAP.drag)stickEnd(e)});window.addEventListener('pointercancel',function(e){if(MAP.drag){MAP.drag=null;document.getElementById('stickFloat').classList.add('hidden');mapRefreshStickers()}});
/* ---------------- Wardrobe ---------------- */
var WARD={tab:'col',confirm:null};
function wardOwned(kind,id){return !!save.own[kind+'_'+id]}
function buildWardrobe(){document.querySelectorAll('#wardTabs button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-tab')===WARD.tab)});
  document.getElementById('wardWallet').textContent=save.wallet;var sw=document.getElementById('swatches'),it=document.getElementById('wardItems'),pc=document.getElementById('patCols'),hint=document.getElementById('wardHint');
  sw.classList.toggle('hidden',WARD.tab!=='col');it.classList.toggle('hidden',WARD.tab==='col');pc.classList.toggle('hidden',WARD.tab!=='pat');
  hint.textContent={col:'Pick a yarn colour (free)',hat:'Tap a hat to try it on · tap again to buy with prize bubbles',pat:'Tap a pattern to try it on · tap again to buy · pick a thread colour below',stk:'Stickers go on the World Map: open Map → Stickers and drag them on'}[WARD.tab];
  if(WARD.tab==='col'){buildSwatches();return}
  it.innerHTML='';var list=WARD.tab==='hat'?HAT_ITEMS:WARD.tab==='pat'?PAT_ITEMS:STICKERS,kind=WARD.tab;
  if(kind!=='stk'){var none=document.createElement('button');none.className='wItem'+((kind==='hat'?save.ward.hat:save.ward.pat)?'':' on');none.innerHTML='<canvas width="88" height="88"></canvas><span>None</span><em>free</em>';
    wardIcon(none.querySelector('canvas'),kind,'');none.addEventListener('click',function(){SND.unlock();SND.sfx('tap');if(kind==='hat')save.ward.hat='';else save.ward.pat='';WARD.confirm=null;persist();buildWardrobe();wardBounce()});it.appendChild(none)}
  list.forEach(function(x){var id=x[0],nm=kind==='stk'?x[1]+' sticker':x[1],cost=x[2],bossLock=kind==='hat'&&x[3]&&!wardOwned('hat',id)?x[3]:0,own=kind==='stk'?(+save.stickInv[id]||0):wardOwned(kind,id),on=kind==='hat'?save.ward.hat===id:kind==='pat'?save.ward.pat===id:false,cf=WARD.confirm===kind+'_'+id;
    var el=document.createElement('button');el.className='wItem'+(on?' on':'')+(own?' own':'')+(cf?' confirm':'')+(!own&&save.wallet<cost?' poor':'');el.setAttribute('data-id',id);el.setAttribute('data-kind',kind);
    el.innerHTML=(kind==='stk'?'<i class="stkI">'+x[1]+'</i>':'<canvas width="88" height="88"></canvas>')+'<span>'+nm+'</span><em>'+(cf?(save.wallet>=cost?'Buy for 🫧'+cost+'?':'trying on · 🫧'+cost):kind==='stk'?'🫧'+cost+(own?' · have '+own:''):own?(on?'wearing':'owned'):'🫧'+cost)+'</em>';
    if(kind!=='stk')wardIcon(el.querySelector('canvas'),kind,id);
    if(kind==='hat'&&x[3]){el.classList.add('bossHat');if(bossLock){el.classList.add('locked');el.querySelector('em').textContent='🏆 Beat '+BOSS_INFO[x[3]].short}}
    el.addEventListener('click',function(){SND.unlock();if(bossLock){SND.sfx('unswitch');toast('Beat '+BOSS_INFO[bossLock].name+' to win this hat!');return}wardTap(kind,id,cost)});it.appendChild(el)});
  if(WARD.tab==='pat'){pc.innerHTML='';PAT_COLS.forEach(function(c){var b=document.createElement('button');b.className='pcol'+(save.ward.pcol===c[1]?' on':'');b.style.background=c[1];b.title=c[0];b.setAttribute('aria-label',c[0]);
    b.addEventListener('click',function(){SND.unlock();SND.sfx('pop',2);save.ward.pcol=c[1];persist();buildWardrobe();wardBounce()});pc.appendChild(b)})}}
function wardTap(kind,id,cost){var key=kind+'_'+id;
  if(kind!=='stk'&&wardOwned(kind,id)){SND.sfx('pop',3);if(kind==='hat')save.ward.hat=save.ward.hat===id?'':id;else save.ward.pat=save.ward.pat===id?'':id;WARD.confirm=null;persist();buildWardrobe();wardBounce();return}
  if(WARD.confirm!==key){WARD.confirm=key;SND.sfx('tap');buildWardrobe();if(kind!=='stk')wardBounce();if(save.wallet<cost)toast('Trying it on! You need 🫧'+cost+' to keep it (you have '+save.wallet+')');return}
  if(save.wallet<cost){SND.sfx('unswitch');toast('You need 🫧'+cost+' (you have '+save.wallet+'). Pop more prize bubbles!');return}
  save.wallet-=cost;WARD.confirm=null;SND.sfx('full');
  if(kind==='stk'){save.stickInv[id]=(+save.stickInv[id]||0)+1;toast('Sticker bought! Place it on the World Map')}else{save.own[key]=1;if(kind==='hat')save.ward.hat=id;else save.ward.pat=id;toast('New '+(kind==='hat'?'hat':'pattern')+'! Bobbin loves it')}
  persist();buildWardrobe();wardBounce()}
function wardBounce(){if(player){player.sy=1.3;player.sx=0.8;setExpr(player,'joy',0.8);var pp=player.body.getPosition();burst(pp.x,pp.y-0.4,'spark',10,'#ffd75e')}}
function wardIcon(cv,kind,id){var g2=cv.getContext('2d');g2.setTransform(1,0,0,1,0,0);g2.clearRect(0,0,88,88);g2.setTransform(80,0,0,80,44,64);var lk=wardLook();
  GFX.drawBobbin(g2,{x:0,y:0,r:0.48,sx:1,sy:1,face:1,col:lk.col,hat:kind==='hat'?id:'',pat:kind==='pat'?id:'',pcol:lk.pcol,expr:'happy',tuft:0})}
/* ---------------- v1.4 bosses: one friendly puzzle boss at the end of each world ----------------
   Boss stages are extra stages with ids 101..105 (world 0..4) kept in BOSSES (LEVELS stays the 20 levels, so
   v1.0-v1.3 never see them). The boss is a scripted (non-physical) character; the puzzle props are real physics
   pieces from that world. 3 hits, a checkpoint between phases, every attack is telegraphed. */
var BOSSES=[];
var BOSS_INFO={
  101:{w:0,kind:'robot',name:'Clank the Toolbox Robot',short:'Clank',icon:'🤖',hat:'gearcap',hatName:'Robo cap',blurb:'Drop crates on his noggin! Pull a lever when he clanks under a hatch.'},
  102:{w:1,kind:'sewing',name:'Reela the Runaway Sewing Machine',short:'Reela',icon:'🧵',hat:'pincap',hatName:'Pincushion cap',blurb:'Wait until she runs out of thread, then zip down onto her OFF button.'},
  103:{w:2,kind:'jelly',name:'Wibble the Wobbly Jelly',short:'Wibble',icon:'🍮',hat:'jellycrown',hatName:'Jelly crown',blurb:'Feed him the dough ball! Start the conveyor so it lands in his open mouth.'},
  104:{w:3,kind:'soldier',name:'Captain Tock the Wind-Up Soldier',short:'Captain Tock',icon:'💂',hat:'shako',hatName:'Captain\u2019s shako',blurb:'Wind up the toy mouse. He marches without looking down\u2026'},
  105:{w:4,kind:'gnome',name:'Grumble the Grumpy Gnome',short:'Grumble',icon:'🪴',hat:'gnomehat',hatName:'Gnome hat',blurb:'He sneezes dandelion puffs at you. Flip the fan to blow them right back!'}};
var BOSS_OF_WORLD={0:101,1:102,2:103,3:104,4:105};
var STAGE_ORDER=[1,2,101,3,4,5,6,102,7,8,9,10,103,11,12,13,14,104,15,16,17,18,105,19,20];
function isBossId(id){return id>100&&id<200}
function stageDef(id){if(typeof id==='string'&&typeof CR!=='undefined'&&CR.def&&CR.def.id===id)return CR.def;var d=LEVELS.filter(function(q){return q.id===id})[0];if(d)return d;return BOSSES.filter(function(q){return q.id===id})[0]||null}
function allStages(){return STAGE_ORDER.map(stageDef).filter(function(d){return !!d})}
function nextStage(id){var i=STAGE_ORDER.indexOf(id);return i>=0&&i<STAGE_ORDER.length-1?STAGE_ORDER[i+1]:null}
function prevStage(id){var i=STAGE_ORDER.indexOf(id);return i>0?STAGE_ORDER[i-1]:null}
function stageDone(id){var b=save.best[id];return !!(b&&b.done)}
function stageLabel(id){var d=stageDef(id);return isBossId(id)?'Boss: '+BOSS_INFO[id].short:'Level '+id+(d?' '+d.name:'')}
// v1.4 unlock rule: a stage opens when the stage before it (in STAGE_ORDER) is done. Already-finished stages stay open,
// and so does anything in a world you have already played in (saves from v1.0-v1.3 never lose access to a level).
function stageUnlocked(id){if(id===1)return true;if(stageDone(id))return true;if(!isBossId(id)&&save.v14&&id<=save.v14.g&&stageDone(id-1))return true;var pv=prevStage(id);if(pv===null)return false;if(stageDone(pv))return true;
  if(!isBossId(id)){var d=stageDef(id);if(d&&LEVELS.some(function(q){return q.world===d.world&&q.id>id&&stageDone(q.id)}))return true;
    if(isBossId(pv)&&stageDone(id-1)){var dd=stageDef(id);if(dd&&LEVELS.some(function(q){return q.world===dd.world&&stageDone(q.id)}))return true}}
  return false}
function lockMsg(id){var pv=prevStage(id);return pv?(isBossId(pv)?'Beat '+BOSS_INFO[pv].short+' to open the next world':'Finish '+(isBossId(pv)?'the boss':'level '+pv)+' to unlock this one'):'Locked'}
/* ---------------- shared boss runtime ---------------- */
function bossInit(lv){var info=BOSS_INFO[lv.def.id],K=BK[info.kind];var B={id:lv.def.id,info:info,kind:info.kind,K:K,hp:3,phase:0,state:'intro',st:0,t:0,x:0,y:0,w:2,h:2,dir:-1,face:-1,
    shots:[],q:[],calm:0,hurtT:0,anim:0,bob:0,flash:0,bang:0,excl:0,atkT:2.5,won:false,wonT:0,hits:[],log:[]};
  lv.boss=B;lv.noCpWalk=true;K.init(lv,B);return B}
function bossLater(B,dl,fn){B.q.push({at:B.t+dl,fn:fn})}
function bossRunQ(B){for(var i=0;i<B.q.length;i++){if(B.q[i].at<=B.t){var f=B.q[i].fn;B.q.splice(i,1);i--;f()}}}
function bossSay(lv,B,txt,col){floatText(B.x,B.y-B.h-0.9,txt,col||'#5a3a28')}
function bossHurtPlayer(lv,why){var p=player,B=lv.boss;if(!p||p.inv>0||p.squash||p.hidden||lv.finished||lv.out||B.won)return false;
  var pp=p.body.getPosition();burst(pp.x,pp.y,'spark',10,'#ff9fc0');floatText(pp.x,pp.y-1,why||'Ouch!','#e0567a');B.calm=1.8;B.shots=[];B.log.push('hurt '+why+' t='+lv.t.toFixed(1));
  loseLife('boss');return true}
function bossBump(lv,B){var p=player;if(!p||p.hidden||p.squash)return;var pp=p.body.getPosition(),dx=pp.x-B.x;
  if(Math.abs(dx)<B.w/2+R*0.8&&pp.y+R>B.y-B.h+0.4&&pp.y-R<B.y){if(B.danger&&B.danger()){bossHurtPlayer(lv,'Bonk!');return}
    var s=dx>=0?1:-1;p.body.setLinearVelocity(V(s*6.2,-4.5));p.sx=0.8;p.sy=1.2;if(!B.bumpT||lv.t-B.bumpT>0.4){SND.sfx('boing');B.bumpT=lv.t}}}
// generic lobbed attack, aimed at a spot; a marker on the floor shows where (and when) it will land
function bossLob(lv,B,x0,y0,tx,spr,T,o){o=o||{};tx=Math.max(1,Math.min(lv.w-1,tx));var ty=surfAt(lv,tx);if(ty===null)ty=0;
  B.shots.push({k:'lob',spr:spr,x0:x0,y0:y0,tx:tx,ty:ty,T:T,t:0,h:o.h||3,r:o.r||0.35,hitR:o.hitR||0.9,air:!!o.air,x:x0,y:y0,rot:0});SND.sfx('launch')}
function bossShots(lv,B,dt){var p=player,pp=p.body.getPosition();
  for(var i=B.shots.length-1;i>=0;i--){var s=B.shots[i];if(!s)continue;s.t+=dt;
    if(s.k==='lob'){var u=Math.min(1,s.t/s.T);s.x=s.x0+(s.tx-s.x0)*u;s.y=s.y0+(s.ty-s.y0)*u-s.h*4*u*(1-u);s.rot+=dt*9;
      if(u<1){if(s.air&&Math.hypot(pp.x-s.x,pp.y-s.y)<s.r+R*0.85&&bossHurtPlayer(lv,'Ouch!'))return;continue}
      burst(s.tx,s.ty-0.1,'dust',8,'#f6e3c4');burst(s.tx,s.ty-0.2,'spark',6,s.spr==='blob'?'#ff9fc0':'#ffd75e');SND.sfx(s.spr==='blob'?'jelly':s.spr==='pot'?'thud':'click',6);
      B.shots.splice(i,1);if(Math.abs(pp.x-s.tx)<s.hitR&&pp.y+R>s.ty-1.1&&pp.y+R<s.ty+0.4){if(bossHurtPlayer(lv,s.spr==='blob'?'Splat!':'Ouch!'))return}}
    else if(s.k==='line'){s.x+=s.vx*dt;s.rot+=dt*12;var sy=surfAt(lv,s.x);if(s.x<0.5||s.x>lv.w-0.5||(sy!==null&&sy<s.y+s.r*0.5)){burst(s.x,s.y,'spark',6,'#ffd75e');SND.sfx('click');B.shots.splice(i,1);continue}
      if(Math.hypot(pp.x-s.x,pp.y-s.y)<s.r+R*0.8){B.shots.splice(i,1);if(bossHurtPlayer(lv,'Pop!'))return}}
    else if(s.k==='puff'){B.K.puff(lv,B,s,dt,i);if(B.shots.indexOf(s)<0)continue;if(!s.blown&&Math.hypot(pp.x-s.x,pp.y-s.y)<s.r+R*0.75){B.shots.splice(i,1);burst(s.x,s.y,'fluff',14,'#ffffff');if(bossHurtPlayer(lv,'Achoo!'))return}}}}
function bossHit(lv,B,how){if(B.won||B.state==='hurt')return;B.hp--;B.state='hurt';B.st=0;B.hurtT=0;B.flash=1;B.shots=[];B.calm=0;B.hits.push({t:+lv.t.toFixed(1),how:how});
  cam.sh=0.3;SND.sfx('squish');SND.sfx('switch');burst(B.x,B.y-B.h,'spark',22,'#ffd75e');burst(B.x,B.y-B.h*0.6,'ring',1,'#fff');confetti(B.x,B.y-B.h,24);
  floatText(B.x,B.y-B.h-1.1,B.hp>0?['Bonk!','Boing!','Whoops!'][2-B.hp]:'Ta-da!',B.hp>0?'#ff7fae':'#2f9e74');setExpr(player,'joy',1.2);
  if(B.hp<=0){bossWin(lv,B);return}
  // checkpoint between phases: respawn here from now on
  var c=lv.cps[3-B.hp];if(c){lv.cp=3-B.hp;c.on=true;SND.sfx('check');burst(c.x+0.3,c.y-1.6,'spark',10,'#7fe0c0')}
  if(SND.sting)SND.sting('hit')}
function bossWin(lv,B){B.won=true;B.wonT=0;B.state='won';B.st=0;
  var id=B.id,hat=B.info.hat,fresh=!save.own['hat_'+hat];save.own['hat_'+hat]=1;lv.reward={hat:hat,name:B.info.hatName,fresh:fresh};persist();
  B.q=[];[0.3,0.8,1.3,1.8,2.4].forEach(function(dl,k){bossLater(B,dl,function(){confetti(B.x+(k%2?-2:2),B.y-B.h-1-k*0.3,60);SND.sfx(k%2?'full':'pop',k*2);burst(B.x,B.y-B.h,'spark',14,['#ffd75e','#7fe0c0','#ff9fc4'][k%3])})});
  floatText(B.x,B.y-B.h-1.6,B.info.short+' is happy again!','#2f9e74');if(SND.sting)SND.sting('win');
  bossLater(B,2.6,function(){var ex=B.K.exitAt(lv,B);lv.exit={x:ex[0],y:ex[1],t:0};burst(ex[0],ex[1],'spark',20,'#fff');floatText(ex[0],ex[1]-2.4,'Hop in!','#ff7fae')})}
function bossStep(lv,dt){var B=lv.boss;if(!B)return;B.t+=dt;B.st+=dt;B.anim+=dt;B.flash=Math.max(0,B.flash-dt*2);B.excl=Math.max(0,B.excl-dt);
  if(lv.out||!player)return;bossRunQ(B);
  if(B.won){B.wonT+=dt;B.K.wonStep&&B.K.wonStep(lv,B,dt);return}
  if(lv.finished)return;
  if(B.calm>0)B.calm-=dt;
  if(B.state==='hurt'){B.hurtT+=dt;if(B.hurtT>(B.K.hurtTime||2.0)){B.phase=3-B.hp;B.state='go';B.st=0;B.K.phase(lv,B);toast(B.info.short+' · round '+(B.phase+1)+' of 3')}else{B.K.hurtStep&&B.K.hurtStep(lv,B,dt)}return}
  B.K.step(lv,B,dt);bossShots(lv,B,dt);if(!lv.out)bossBump(lv,B)}
/* ---- drawing helpers ---- */
function bossDrawShots(g,lv,B,t){B.shots.forEach(function(s){
  if(s.k==='lob'){var u=Math.min(1,s.t/s.T),a=0.35+0.5*u;g.save();g.strokeStyle='rgba(224,86,122,'+a+')';g.fillStyle='rgba(255,127,174,'+(0.1+0.25*u)+')';g.lineWidth=0.06;g.setLineDash([0.16,0.1]);
      g.beginPath();g.ellipse(s.tx,s.ty-0.04,s.hitR*(0.55+0.45*u),0.16,0,0,7);g.fill();g.stroke();g.setLineDash([]);
      g.globalAlpha=0.5+0.5*u;GFX.wtext(g,'!',s.tx,s.ty-0.5-Math.sin(t*10)*0.06,0.34,'#e0567a');g.restore();
      g.save();g.translate(s.x,s.y);g.rotate(s.rot);bossSprite(g,s.spr,t);g.restore()}
  else if(s.k==='line'){g.save();g.translate(s.x,s.y);g.rotate(s.rot);bossSprite(g,s.spr,t);g.restore();g.save();g.globalAlpha=0.35;g.strokeStyle='#fffaf0';g.lineWidth=0.08;g.beginPath();g.moveTo(s.x-Math.sign(s.vx)*0.4,s.y);g.lineTo(s.x-Math.sign(s.vx)*1.4,s.y);g.stroke();g.restore()}
  else if(s.k==='puff'){g.save();g.translate(s.x,s.y);bossSprite(g,s.blown?'puffb':'puff',t+s.ph);g.restore()}})}
function bossSprite(g,k,t){switch(k){
  case 'spanner':g.fillStyle='#b8bccb';g.strokeStyle='#5a5f70';g.lineWidth=0.03;GFX.rr(g,-0.07,-0.32,0.14,0.64,0.05);g.fill();g.stroke();[[0,-0.34],[0,0.34]].forEach(function(q){g.beginPath();g.arc(q[0],q[1],0.13,0,7);g.fill();g.stroke()});
    g.fillStyle='#fffaf0';g.fillRect(-0.04,-0.47,0.08,0.12);g.fillRect(-0.04,0.35,0.08,0.12);break;
  case 'button':GFX.sewButton(g,0,0,0.26,['#ff7fae','#ffd75e','#7fe0c0','#8fd3ff'][Math.floor(t*3)%4],4);break;
  case 'blob':g.fillStyle='rgba(255,127,159,0.92)';g.beginPath();g.ellipse(0,0,0.34,0.3,0,0,7);g.fill();g.strokeStyle='#d0587a';g.lineWidth=0.03;g.stroke();g.fillStyle='rgba(255,255,255,0.7)';g.beginPath();g.ellipse(-0.1,-0.1,0.08,0.05,-0.5,0,7);g.fill();break;
  case 'pot':drawPot(g,0,0,0.6,0.55,0,t,false);break;
  case 'cork':g.fillStyle='#d9a25e';GFX.rr(g,-0.3,-0.26,0.6,0.52,0.14);g.fill();g.strokeStyle='#8a5a2e';g.lineWidth=0.03;g.stroke();g.fillStyle='rgba(120,70,30,0.35)';[[-0.12,-0.08],[0.1,0.06],[-0.02,0.12]].forEach(function(q){g.beginPath();g.arc(q[0],q[1],0.04,0,7);g.fill()});break;
  case 'puff':case 'puffb':var r=0.42;g.fillStyle='rgba(255,255,255,0.95)';for(var i=0;i<10;i++){var a=i*0.628+t*0.6;g.beginPath();g.arc(Math.cos(a)*r*0.62,Math.sin(a)*r*0.62,0.15,0,7);g.fill()}
    g.strokeStyle='rgba(200,190,150,0.8)';g.lineWidth=0.025;for(var j=0;j<12;j++){var b=j*0.524+t*0.6;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(b)*r,Math.sin(b)*r);g.stroke()}
    g.fillStyle=k==='puffb'?'#7fe0c0':'#ffd23f';g.beginPath();g.arc(0,0,0.09,0,7);g.fill();break}}
function bossExcl(g,x,y,t){g.save();g.translate(x,y+Math.sin(t*12)*0.05);g.fillStyle='#fffaf0';g.beginPath();g.arc(0,0,0.34,0,7);g.fill();g.strokeStyle='#e0567a';g.lineWidth=0.05;g.stroke();GFX.wtext(g,'!',0,0.02,0.44,'#e0567a');g.restore()}
function bossDizzy(g,x,y,t){for(var i=0;i<3;i++){var a=t*5+i*2.094;g.save();g.translate(x+Math.cos(a)*0.7,y+Math.sin(a)*0.18);g.rotate(a);g.beginPath();for(var k=0;k<10;k++){var ra=k%2?0.06:0.15,aa=k*Math.PI/5;g.lineTo(Math.cos(aa)*ra,Math.sin(aa)*ra)}g.closePath();g.fillStyle=i===1?'#ff9bb0':'#ffd23f';g.fill();g.strokeStyle='rgba(90,58,40,.6)';g.lineWidth=0.02;g.stroke();g.restore()}}
function bossEyes(g,x,y,sp,r,happy,look,blink){[-1,1].forEach(function(s){var ex=x+s*sp;if(blink||happy){g.beginPath();g.arc(ex,y+0.02,r*0.8,Math.PI*1.1,Math.PI*1.9);g.strokeStyle='#2b2230';g.lineWidth=r*0.45;g.lineCap='round';g.stroke();return}
  g.beginPath();g.arc(ex+look*r*0.25,y,r,0,7);g.fillStyle='#2b2230';g.fill();g.fillStyle='#fff';g.beginPath();g.arc(ex+look*r*0.25-r*0.35,y-r*0.35,r*0.3,0,7);g.fill()})}
function bossCheeks(g,x,y,sp,r){g.fillStyle='rgba(255,130,160,0.5)';g.beginPath();g.ellipse(x-sp,y,r,r*0.6,0,0,7);g.ellipse(x+sp,y,r,r*0.6,0,0,7);g.fill()}
function bossDraw(g,lv,t){var B=lv.boss;if(!B)return;B.K.drawBack&&B.K.drawBack(g,lv,B,t);g.save();if(B.flash>0&&Math.floor(t*20)%2===0)g.globalAlpha=0.6;B.K.draw(g,lv,B,t);g.restore();
  if(B.state==='hurt'||(B.won&&B.wonT<1.4))bossDizzy(g,B.x,B.y-B.h-0.25,t);
  if(B.excl>0&&!B.won)bossExcl(g,B.x+(B.exclDx||0),B.y-B.h-0.75,t);
  bossDrawShots(g,lv,B,t)}
function bossHud(g,W,H,lv){var B=lv.boss;if(!B||lv.finished)return;var fs=Math.max(12,Math.min(18,W/48)),y=fs*1.1+6;g.save();g.font='bold '+fs+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
  var nm=B.info.short,tw=g.measureText(nm).width,hw=3*fs*1.15,w=tw+hw+fs*1.6,x=W/2-w/2;g.fillStyle='rgba(255,250,240,0.92)';GFX.rr(g,x,y-fs*0.85,w,fs*1.7,fs*0.85);g.fill();g.strokeStyle='rgba(110,70,30,0.35)';g.lineWidth=1.5;g.stroke();
  g.fillStyle='#5a3a28';g.fillText(nm,x+fs*0.7+tw/2,y+1);for(var i=0;i<3;i++){var cx=x+fs*0.9+tw+fs*0.5+i*fs*1.15+fs*0.4;GFX.sewButton(g,cx,y,fs*0.42,i<B.hp?'#ff7fae':'#e8d6bf',4)}g.restore()}
/* ---- per-boss kinds ---- */
var BK={};
// ---------- B1 · Clank the Toolbox Robot (Workshop): levers open crate hatches above his walk path ----------
BK.robot={hurtTime:2.0,camY:-3.0,
  build:function(b,d){b.spawn(2.5,-0.6);b.ground(0,34,'yellow');b.sign(10.9,0,'Pull a lever when\nClank walks under\nits crate!');
    [2.6,3.2,3.8].forEach(function(x){b.cp(x,0)});
    b.block(10.6,-7.3,19.0,0.4,{mat:'wood'});
    [[13.5,'r0',4.4],[20,'r1',6.8],[26.5,'r2',9.2]].forEach(function(h,i){b.box('crate'+i,h[0],-6.05,1.25,1.25,{kind:'card',density:0.9});b.lever(h[1],h[2],0,{start:0.55})});
    b.boing(0.6,0,1.6,{look:'sponge'});
    [[1.4,-3.2],[1.4,-4.6],[1.4,-6.0],[5.6,-1.6],[8.0,-1.6],[13.5,-1.2],[16.8,-2.6],[20,-1.2],[23.2,-2.6],[26.5,-1.2],[29.5,-1.4],[31.5,-2.4],[32.5,-1.2]].forEach(function(q){b.prize(q[0],q[1])});
    b.setW(34);b.route({t:'boss',kind:'robot'})},
  init:function(lv,B){B.x=22;B.y=0;B.w=2.2;B.h=2.5;B.dir=-1;B.range=[12.2,29.6];B.hatches=[13.5,20,26.5];B.sigs=['r0','r1','r2'];B.leverX=[4.4,6.8,9.2];
    B.crates=[0,1,2].map(function(i){var o=lv.objs.filter(function(q){return q.name==='crate'+i})[0];o.held=true;o.hook={x:B.hatches[i],y:-6.05};o.relT=0;return o});
    B.crates.forEach(function(o){var f=o.body.getFixtureList();f.setFilterData({categoryBits:CAT.OBJ,maskBits:CAT.GROUND|CAT.OBJ,groupIndex:0})});
    B.levers=B.sigs.map(function(s){return lv.levers.filter(function(l){return l.sig===s})[0]});this.phase(lv,B);B.state='walk';B.atkT=3.2},
  phase:function(lv,B){var P=[{v:1.35,n:1,every:4.6,T:1.05},{v:1.9,n:2,every:4.1,T:1.0},{v:2.45,n:3,every:3.7,T:0.95}][B.phase];B.P=P;B.state='walk';B.st=0;B.atkT=Math.min(B.atkT,2.6);
    B.crates.forEach(function(o){if(!o.held){respawnObj(o,o.hook);o.held=true}});B.levers.forEach(function(l){if(l.on)resetLever(l)})},
  danger:null,
  step:function(lv,B,dt){var self=this,P=B.P;
    // props: held crates hang on their hooks; a pulled lever drops its crate, then springs back
    B.crates.forEach(function(o,i){var lvr=B.levers[i];
      if(o.held){o.body.setTransform(V(o.hook.x,o.hook.y),0);o.body.setLinearVelocity(V(0,0));o.body.setAngularVelocity(0);
        if(lvr.on){o.held=false;o.relT=0;o.body.setAwake(true);o.body.setLinearVelocity(V(0,1.5));SND.sfx('door');lvr.relT=0}}
      else{o.relT+=dt;var p=o.body.getPosition(),v=o.body.getLinearVelocity();
        if(!o.spent&&v.y>2&&Math.abs(p.x-B.x)<B.w/2+0.45&&p.y+0.62>B.y-B.h-0.2&&p.y<B.y-B.h+0.6&&B.state!=='hurt'){o.spent=true;o.body.setLinearVelocity(V((p.x<B.x?-1:1)*3.5,-7));o.body.setAngularVelocity(6);bossHit(lv,B,'crate'+i);return}
        if(o.relT>(o.spent?1.6:2.4)){respawnObj(o,o.hook);o.held=true;o.spent=false}}
      if(lvr.on){lvr.relT=(lvr.relT||0)+dt;if(lvr.relT>1.0&&!(player.grab&&player.grab.ud.lever===lvr))resetLever(lvr)}});
    if(B.state==='hurt'||B.won)return;
    // brain: walk the floor, stop to wind up and toss spanners at Bobbin
    B.atkT-=dt;if(B.calm>0)B.atkT=Math.max(B.atkT,0.8);
    if(B.state==='walk'){B.x+=B.dir*P.v*dt;if(B.x<B.range[0]){B.x=B.range[0];B.dir=1}if(B.x>B.range[1]){B.x=B.range[1];B.dir=-1}B.face=B.dir;
      if(B.atkT<=0&&B.calm<=0){B.state='wind';B.st=0;B.excl=1.0;SND.sfx('whir')}}
    else if(B.state==='wind'){var pp=player.body.getPosition();B.face=pp.x<B.x?-1:1;if(B.st>1.0){B.state='toss';B.st=0;var offs=P.n===1?[0]:P.n===2?[0,(pp.x<6?1:-1)*1.9]:[-1.9,0,1.9];
        offs.forEach(function(o,k){bossLater(B,k*0.09,function(){if(B.state==='hurt'||B.won||B.calm>0)return;bossLob(lv,B,B.x+B.face*0.9,B.y-B.h+0.2,pp.x+o,'spanner',P.T+k*0.08,{h:3.2})})})}}
    else if(B.state==='toss'){if(B.st>0.45){B.state='walk';B.st=0;B.atkT=P.every}}},
  hurtStep:function(lv,B,dt){this.stepProps(lv,B,dt)},
  stepProps:function(lv,B,dt){var Bk=B.state;B.state='hurt';this.step(lv,B,dt);B.state=Bk},
  info:function(lv,B){return {levOn:B.levers.map(function(l){return l.on}),ready:B.crates.map(function(o){return o.held}),range:B.range,hatches:B.hatches,leverX:B.leverX,crates:B.crates.map(function(o){return o.held})}},
  exitAt:function(lv,B){return [Math.max(14,Math.min(29,B.x+(B.x>20?-4:4))),-1.7]},
  wonStep:function(lv,B,dt){B.crates.forEach(function(o){if(!o.held&&o.relT!==undefined){o.relT+=dt;if(o.relT>1.6){respawnObj(o,o.hook);o.held=true}}else if(o.held){o.body.setTransform(V(o.hook.x,o.hook.y),0);o.body.setLinearVelocity(V(0,0))}})},
  drawBack:function(g,lv,B,t){// hatches, strings and lever threads
    B.hatches.forEach(function(hx,i){var o=B.crates[i],lvr=B.levers[i],ahead=B.state==='walk'?B.x+B.dir*B.P.v*0.55:B.x,near=Math.abs(ahead-hx)<1.3&&!B.won&&B.state!=='hurt';
      g.fillStyle=GFX.pat('wood');g.fillRect(hx-0.9,-7.0,1.8,0.22);GFX.sewButton(g,hx,-6.86,0.13,near?'#7fe0c0':'#ffd75e',2);
      if(o.held){GFX.drawString(g,hx-0.4,-6.85,hx-0.4,-6.65,0);GFX.drawString(g,hx+0.4,-6.85,hx+0.4,-6.65,0)}
      g.save();g.setLineDash([0.12,0.14]);g.strokeStyle=near?'rgba(70,200,160,0.85)':'rgba(255,255,255,0.45)';g.lineWidth=near?0.07:0.04;g.beginPath();g.moveTo(hx,-5.3);g.lineTo(hx,-0.1);g.stroke();
      g.strokeStyle=lvr.on?'rgba(70,200,160,0.85)':'rgba(255,120,170,0.55)';g.lineWidth=0.05;g.lineDashOffset=lvr.on?-t:0;g.beginPath();g.moveTo(B.leverX[i],-0.35);g.quadraticCurveTo((B.leverX[i]+hx)/2,-8.6,hx-0.9,-7.0);g.stroke();g.restore();
      GFX.wtext(g,String(i+1),B.leverX[i],-2.35,0.32,'#5a3a28');GFX.wtext(g,String(i+1),hx,-7.6,0.32,'#5a3a28')})},
  draw:function(g,lv,B,t){var x=B.x,y=B.y,f=B.face,st=B.state,walk=st==='walk',bob=walk?Math.abs(Math.sin(B.anim*6))*0.08:0,hurt=st==='hurt',won=B.won;
    var sq=hurt?0.86+Math.sin(B.hurtT*16)*0.04:1;g.save();g.translate(x,y);g.scale(1,sq);
    g.fillStyle='rgba(90,55,25,0.22)';g.beginPath();g.ellipse(0,-0.02,1.25,0.14,0,0,7);g.fill();
    // legs
    var lp=walk?Math.sin(B.anim*6)*0.18:0;g.fillStyle='#8a90a4';[[-0.5,lp],[0.5,-lp]].forEach(function(q){GFX.rr(g,q[0]-0.15,-0.62+Math.max(0,q[1])*-0.3,0.3,0.55,0.08);g.fill();g.fillStyle='#5a5f70';GFX.rr(g,q[0]-0.26,-0.12,0.52,0.14,0.06);g.fill();g.fillStyle='#8a90a4'});
    g.translate(0,-bob);
    // toolbox body
    var by=-0.6,bh=1.45,bw=2.2;GFX.rr(g,-bw/2,by-bh,bw,bh,0.16);g.fillStyle=GFX.pat('felt_red');g.fill();g.strokeStyle='rgba(110,30,30,0.6)';g.lineWidth=0.05;g.stroke();
    g.fillStyle='rgba(255,255,255,0.18)';g.fillRect(-bw/2+0.12,by-bh+0.1,bw-0.24,0.12);g.fillStyle='#c9c9d6';g.fillRect(-0.3,by-bh*0.55,0.6,0.14);
    // arms
    var wind=st==='wind',arm=wind?-1.5:st==='toss'?0.6:Math.sin(B.anim*6)*0.3;g.strokeStyle='#8a90a4';g.lineWidth=0.16;g.lineCap='round';
    g.save();g.translate(f*bw/2,by-bh*0.6);g.rotate(f*arm);g.beginPath();g.moveTo(0,0);g.lineTo(f*0.55,0.15);g.stroke();if(wind){g.save();g.translate(f*0.6,0.1);g.rotate(t*8);bossSprite(g,'spanner',t);g.restore()}else{g.fillStyle='#5a5f70';g.beginPath();g.arc(f*0.6,0.16,0.13,0,7);g.fill()}g.restore();
    g.save();g.translate(-f*bw/2,by-bh*0.6);g.beginPath();g.moveTo(0,0);g.lineTo(-f*0.45,0.35);g.stroke();g.restore();
    // head: the lid with a handle, screen face
    var hy=by-bh-0.05,hh=0.75;GFX.rr(g,-0.95,hy-hh,1.9,hh,0.14);g.fillStyle=GFX.pat('felt_orange');g.fill();g.strokeStyle='rgba(120,60,20,0.6)';g.stroke();
    g.strokeStyle='#5a5f70';g.lineWidth=0.09;g.beginPath();g.moveTo(-0.45,hy-hh);g.quadraticCurveTo(0,hy-hh-0.5,0.45,hy-hh);g.stroke();
    var lit=Math.sin(t*6)>0;g.fillStyle=wind?'#ff6f6f':lit?'#7fe0c0':'#4fa88a';g.beginPath();g.arc(0,hy-hh-0.55,0.1,0,7);g.fill();
    GFX.rr(g,-0.72,hy-hh+0.12,1.44,0.5,0.1);g.fillStyle='#2f3b48';g.fill();
    bossEyes(g,f*0.12,hy-hh+0.33,0.3,0.09,won||hurt,f,(t%3.1)<0.12);bossCheeks(g,f*0.12,hy-hh+0.48,0.44,0.08);
    g.restore()}
};

// ---------- B2 · Reela the Runaway Sewing Machine (Sewing Basket): zip over her, drop on her OFF button while she's out of thread ----------
BK.sewing={hurtTime:2.0,camY:-3.3,
  build:function(b,d){b.spawn(1.4,-0.6);b.ground(0,40,'pink');[1.2,1.8,2.4].forEach(function(x){b.cp(x,0)});
    b.block(3,-1.4,2,5.4,{topCol:'pink'});b.block(5,-2.8,3,6.8,{topCol:'pink',tape:0.5});b.block(8,-1.4,1.4,5.4,{topCol:'pink'});
    b.zip('zipA',7.0,-5.25,28.5,-4.75,{speed:7,col:'#ff7fae'});
    b.block(26,-1.4,1.6,5.4,{topCol:'sky'});b.block(27.6,-2.9,1.6,6.9,{topCol:'sky'});b.block(29.2,-4.4,6.2,8.4,{topCol:'sky',tape:0.5});
    b.zip('zipB',34.4,-6.85,6.6,-6.3,{speed:7,col:'#8fd3ff'});
    b.sign(1.0,0,'Zip over Reela.\nWhen she runs out of\nthread, drop on her!');
    [[4,-2.6],[6.5,-4.0],[11,-4.0],[14,-4.0],[17,-3.9],[23,-3.8],[26.8,-2.6],[28.4,-4.1],[31,-5.6],[33,-5.6],[22,-7.4],[16,-7.5],[10.5,-7.6],[37.5,-1.2]].forEach(function(q){b.prize(q[0],q[1])});
    b.setW(40);b.route({t:'boss',kind:'sewing'})},
  init:function(lv,B){B.rest=20;B.x=20;B.y=0;B.w=3.0;B.h=2.6;B.dir=-1;B.face=-1;B.dashTo=13.2;B.needle=0;B.trail=[];this.phase(lv,B)},
  phase:function(lv,B){B.P=[{sew:5.0,tired:5.0,lob:0,v:9},{sew:5.5,tired:4.2,lob:1,v:10},{sew:5.5,tired:3.5,lob:2,v:11}][B.phase];B.state='sew';B.st=0;B.x=B.rest;B.lobT=1.6},
  danger:function(){return this.state==='dash'||this.state==='back'},
  step:function(lv,B,dt){var P=B.P,p=player,pp=p.body.getPosition(),v=p.body.getLinearVelocity();
    B.danger=BK.sewing.danger;
    if(B.state==='sew'){B.needle+=dt*14;B.v=0;if(Math.random()<dt*6)B.trail.push({x:B.x-1.1+Math.random()*0.2,t:0});
      if(P.lob&&B.calm<=0){B.lobT-=dt;if(B.lobT<=0){B.lobT=P.lob===2?1.9:2.5;var n=P.lob;B.excl=0.6;B.exclDx=-1.1;for(var k=0;k<n;k++)bossLater(B,0.55+k*0.6,function(){if(B.state!=='sew'||B.calm>0)return;var q=player.body.getPosition();bossLob(lv,B,B.x-1.1,B.y-B.h-0.2,q.x,'button',1.05,{h:2.6})})}}
      if(B.st>P.sew){B.state='rev';B.st=0;B.excl=1.2;B.exclDx=0;SND.sfx('whir');floatText(B.x,B.y-B.h-1.0,'Vroom!','#e0567a')}}
    else if(B.state==='rev'){B.v=0;if(B.st>1.2){B.state='dash';B.st=0;B.dir=-1;SND.sfx('train')}}
    else if(B.state==='dash'){B.x-=P.v*dt;B.v=P.v;B.dir=-1;if(B.x<=B.dashTo){B.x=B.dashTo;B.state='back';B.st=0;cam.sh=0.15;SND.sfx('thud');burst(B.x-B.w/2,-0.3,'dust',10,'#f6e3c4')}}
    else if(B.state==='back'){B.x+=P.v*0.75*dt;B.v=P.v*0.75;B.dir=1;if(B.x>=B.rest){B.x=B.rest;B.state='tired';B.st=0;B.dir=-1;SND.sfx('unswitch');floatText(B.x,B.y-B.h-1.0,'Out of thread!','#2f9e74')}}
    else if(B.state==='tired'){B.v=0;if(B.st>P.tired){B.state='sew';B.st=0;B.lobT=1.2;SND.sfx('switch')}}
    B.trail.forEach(function(q){q.t+=dt});B.trail=B.trail.filter(function(q){return q.t<2.5});
    // landing on top
    var top=B.y-B.h;if(!p.squash&&!p.hidden&&Math.abs(pp.x-B.x)<B.w/2+0.15&&pp.y+R>top-0.25&&pp.y+R<top+0.45&&v.y>0.5){
      if(B.state==='tired'){p.body.setLinearVelocity(V(5.5,-10));p.sy=0.7;p.sx=1.3;bossHit(lv,B,'stomp')}
      else{p.body.setLinearVelocity(V(pp.x<B.x?-4:4,-9));p.sy=0.7;p.sx=1.3;SND.sfx('boing');floatText(B.x,top-0.7,'Boing!','#5a3a28')}}},
  hurtStep:function(lv,B,dt){B.needle+=dt*3},
  info:function(lv,B){return {rest:B.rest,top:B.y-B.h,tiredLeft:B.state==='tired'?B.P.tired-B.st:0,sewLeft:B.state==='sew'?B.P.sew-B.st:0}},
  exitAt:function(lv,B){return [24.0,-1.7]},
  drawBack:function(g,lv,B,t){g.save();g.strokeStyle='rgba(255,111,168,0.7)';g.lineWidth=0.05;g.setLineDash([0.14,0.1]);g.beginPath();g.moveTo(B.dashTo-1.5,-0.06);g.lineTo(B.rest+1.6,-0.06);g.stroke();g.restore();
    if(B.state==='rev'||B.state==='dash'){g.save();g.globalAlpha=0.25+0.2*Math.sin(t*18);g.fillStyle='#ff7fae';g.fillRect(B.dashTo-1.5,-0.25,B.x-B.dashTo,0.2);g.restore()}},
  draw:function(g,lv,B,t){var x=B.x,y=B.y,st=B.state,tired=st==='tired',hurt=st==='hurt',won=B.won;var shake=st==='rev'?Math.sin(t*60)*0.05:0,lean=st==='dash'?-0.08:st==='back'?0.05:0;
    g.save();g.translate(x+shake,y);g.fillStyle='rgba(90,55,25,0.22)';g.beginPath();g.ellipse(0,-0.02,1.7,0.14,0,0,7);g.fill();g.rotate(lean);
    // little wheels
    [-1.0,1.0].forEach(function(wx){g.save();g.translate(wx,-0.22);g.rotate((st==='dash'?-1:st==='back'?1:0)*t*14);GFX.sewButton(g,0,0,0.22,'#8fd3ff',4);g.restore()});
    // base
    GFX.rr(g,-1.5,-0.6,3.0,0.42,0.12);g.fillStyle=GFX.pat('felt_teal');g.fill();g.strokeStyle='rgba(30,90,90,0.5)';g.lineWidth=0.04;g.stroke();
    // pillar (right) + arm (top) + head (left)
    var sq=tired?0.94:1;g.save();g.scale(1,sq);
    GFX.rr(g,0.55,-2.2,0.95,1.65,0.2);g.fillStyle=GFX.pat('felt_pink');g.fill();g.stroke();
    GFX.rr(g,-1.45,-2.6,2.95,0.62,0.28);g.fillStyle=GFX.pat('felt_pink');g.fill();g.stroke();
    GFX.rr(g,-1.45,-2.6,0.62,1.25,0.18);g.fill();g.stroke();
    // OFF button on top (the target)
    var gl=tired&&!won?0.6+0.4*Math.sin(t*8):0;g.fillStyle=tired?'#7fe0c0':'#ffd75e';GFX.rr(g,-0.25,-2.78,0.5,0.2,0.08);g.fill();if(gl){g.strokeStyle='rgba(70,200,160,'+gl+')';g.lineWidth=0.06;g.beginPath();g.ellipse(0,-2.7,0.7,0.24,0,0,7);g.stroke();GFX.wtext(g,'OFF',0,-3.15-Math.sin(t*6)*0.06,0.26,'#2f9e74')}
    // spool on top
    g.save();g.translate(0.95,-2.9);g.rotate(st==='sew'?t*6:0);GFX.spool(g,0,0,0.42,tired?'#e8d6bf':'#ff7fae');g.restore();
    // needle
    var ny=st==='sew'?Math.sin(B.needle)*0.18:tired?0.1:0;g.strokeStyle='#c9c9d6';g.lineWidth=0.06;g.beginPath();g.moveTo(-1.14,-1.35);g.lineTo(-1.14,-0.85+ny);g.stroke();
    g.restore();
    // face on the pillar side
    var fy=-1.55*sq;bossEyes(g,1.02,fy,0.2,0.08,won||hurt,-0.6,tired||(t%2.7)<0.12);bossCheeks(g,1.02,fy+0.16,0.3,0.07);
    g.strokeStyle='#2b2230';g.lineWidth=0.04;g.beginPath();if(st==='rev'||st==='dash')g.arc(1.02,fy+0.22,0.09,0,Math.PI);else if(tired)g.arc(1.02,fy+0.3,0.06,Math.PI,0);else g.arc(1.02,fy+0.18,0.08,0.2,Math.PI-0.2);g.stroke();
    g.restore();
    if(tired&&!won)for(var zi=0;zi<2;zi++){var zp=((t*0.6+zi*0.5)%1);g.save();g.globalAlpha=Math.sin(zp*Math.PI);GFX.wtext(g,'z',x+1.4+zp*0.5,y-2.4-zp*0.8,0.24+zp*0.14,'#7a5cff');g.restore()}
    if(st==='dash'){g.save();g.strokeStyle='rgba(255,255,255,0.8)';g.lineWidth=0.06;for(var k=0;k<3;k++){g.beginPath();g.moveTo(x+1.8+k*0.3,-0.6-k*0.6);g.lineTo(x+2.6+k*0.3,-0.6-k*0.6);g.stroke()}g.restore()}
    if(st==='rev'&&Math.random()<0.4)burst(x+1.6,-0.4,'dust',1,'#f6e3c4');
    B.trail.forEach(function(q){g.fillStyle='rgba(255,111,168,'+(1-q.t/2.5)*0.8+')';g.fillRect(q.x-q.t*0.8,-0.09,0.14,0.05)})}
};

// ---------- B3 · Wibble the Wobbly Jelly (Paper Kitchen): start the conveyor so the dough ball drops into his open mouth ----------
BK.jelly={hurtTime:2.2,camY:-3.0,
  build:function(b,d){b.spawn(1.6,-0.6);b.ground(0,38,'blue');[1.0,1.6,2.2].forEach(function(x){b.cp(x,0)});
    b.block(3.5,-1.3,1.8,5.3,{topCol:'blue'});b.block(5.3,-2.6,6.0,0.4,{mat:'wood'});
    b.lever('feed',7.4,-2.6,{start:0.55});
    b.belt(11.3,-2.6,6.0,4.5,{sig:'feed',sigMode:'on'});
    b.ball('dough',11.95,-3.35,0.72,{density:0.7});
    b.sign(1.2,0,'Wibble is hungry!\nPull the lever to send\nthe dough ball along');
    [[4.4,-2.4],[6.4,-3.8],[9.6,-3.8],[12.5,-4.2],[15,-4.2],[3.0,-4.4],[8.0,-1.1],[10.4,-1.1],[24,-1.2],[28,-1.2],[32,-1.2],[36,-1.4],[26,-4.0],[30,-4.4]].forEach(function(q){b.prize(q[0],q[1])});
    b.setW(38);b.route({t:'boss',kind:'jelly'})},
  init:function(lv,B){B.feed=20.3;B.x=27;B.y=0;B.w=3.0;B.h=2.4;B.dir=-1;B.face=-1;B.mouth=0;B.hop=0;B.wob=0;
    B.ball=lv.objs.filter(function(o){return o.name==='dough'})[0];B.lever=lv.levers.filter(function(l){return l.sig==='feed'})[0];B.offT=0;B.levT=0;B.mmf=0;this.phase(lv,B)},
  phase:function(lv,B){B.P=[{roam:7.5,open:4.0,lobs:1,every:2.6,v:2.2},{roam:8.5,open:3.2,lobs:2,every:2.4,v:2.8},{roam:9.0,open:2.6,lobs:3,every:2.2,v:3.3}][B.phase];
    B.state='roam';B.st=0;B.tx=24+Math.random()*9;B.lobT=1.8;BK.jelly.resetBall(lv,B)},
  resetBall:function(lv,B){if(B.lever.on)resetLever(B.lever);B.levT=0;if(lv.belts[0])lv.belts[0].v=0;respawnObj(B.ball,B.ball.home);B.offT=0},
  mouthAt:function(B){return {x:B.x-1.05,y:B.y-1.25-B.hop}},
  step:function(lv,B,dt){var P=B.P,K=BK.jelly;B.wob+=dt;
    // ball bookkeeping
    var bp=B.ball.body.getPosition(),bv=B.ball.body.getLinearVelocity();
    if(B.lever.on){B.levT+=dt;if(B.levT>3.2&&!(player.grab&&player.grab.ud.lever===B.lever)){resetLever(B.lever);B.levT=0}}
    var onBelt=bp.x>11.2&&bp.x<17.4&&bp.y<-2.9&&bp.y>-3.9,bt=lv.belts[0];
    if(onBelt&&bt&&bt.v>0.3){B.ball.body.setLinearVelocity(V(approach(bv.x,bt.v*0.9,9*dt),bv.y))}if(!onBelt&&bp.x>11)B.offT+=dt;else B.offT=0;
    if(B.offT>2.4||bp.y>1)K.resetBall(lv,B);
    var m=K.mouthAt(B),dm=Math.hypot(bp.x-m.x,bp.y-m.y);
    if(dm<1.15&&bp.x>17.3){if(B.state==='open'){burst(m.x,m.y,'spark',16,'#ffd75e');floatText(m.x,m.y-1.4,'Yum!','#2f9e74');B.ball.body.setTransform(V(-5,-20),0);B.ball.body.setLinearVelocity(V(0,0));B.ball.body.setAwake(false);bossHit(lv,B,'gulp');return}
      else if(B.mmf<=0){B.ball.body.setLinearVelocity(V(-2.5,-6));B.mmf=0.6;SND.sfx('jelly');floatText(m.x,m.y-1.2,B.state==='hungry'?'Not yet!':'Mmf! Not hungry','#5a3a28')}}
    B.mmf-=dt;
    if(B.state==='roam'){var d=B.tx-B.x;B.dir=d<0?-1:1;B.face=B.dir;var sp=P.v;if(Math.abs(d)<0.2){B.tx=22.5+Math.random()*11;}else B.x+=Math.sign(d)*Math.min(Math.abs(d),sp*dt);
      B.hop=Math.abs(Math.sin(B.wob*5))*0.35;
      B.lobT-=dt;if(B.lobT<=0&&B.calm<=0){B.lobT=P.every;B.excl=0.7;B.exclDx=0;var n=P.lobs;for(var k=0;k<n;k++)(function(k){bossLater(B,0.65+k*0.35,function(){if(B.state!=='roam'||B.calm>0)return;var q=player.body.getPosition();bossLob(lv,B,B.x,B.y-B.h-0.3,q.x+(k===0?0:(k%2?1:-1)*1.7),'blob',1.15,{h:3.4})})})(k)}
      if(B.st>P.roam){B.state='go';B.st=0}}
    else if(B.state==='go'){B.hop=Math.abs(Math.sin(B.wob*6))*0.25;var d2=B.feed-B.x;B.dir=d2<0?-1:1;B.face=-1;B.x+=Math.sign(d2)*Math.min(Math.abs(d2),4*dt);if(Math.abs(d2)<0.05){B.x=B.feed;B.state='hungry';B.st=0;B.excl=1.4;B.exclDx=-0.8;SND.sfx('whir');floatText(B.x,B.y-B.h-1.1,'Rumble\u2026 hungry!','#e0567a')}}
    else if(B.state==='hungry'){B.hop=0;B.mouth=Math.min(1,B.st/1.4)*0.6;if(B.st>1.4){B.state='open';B.st=0}}
    else if(B.state==='open'){B.mouth=1;B.hop=0;if(B.st>P.open){B.state='roam';B.st=0;B.tx=26+Math.random()*7;B.lobT=1.2;floatText(B.x,B.y-B.h-1.0,'Hmph!','#5a3a28')}}
    if(B.state!=='open'&&B.state!=='hungry')B.mouth=Math.max(0,B.mouth-dt*3)},
  hurtStep:function(lv,B,dt){B.mouth=Math.max(0,B.mouth-dt*2);B.hop=0;B.wob+=dt*3;if(B.lever.on&&!(player.grab&&player.grab.ud.lever===B.lever))resetLever(B.lever);if(lv.belts[0])lv.belts[0].v=0;if(B.ball.body.getPosition().y<-10||B.ball.body.getPosition().x<0)BK.jelly.resetBall(lv,B)},
  info:function(lv,B){var bp=B.ball.body.getPosition();return {feed:B.feed,openLeft:B.state==='open'?B.P.open-B.st:0,ball:[+bp.x.toFixed(2),+bp.y.toFixed(2)],levOn:B.lever.on,lever:7.4}},
  exitAt:function(lv,B){return [25.5,-1.7]},
  draw:function(g,lv,B,t){var x=B.x,y=B.y-B.hop,st=B.state,won=B.won,hurt=st==='hurt';var ws=Math.sin(B.wob*(st==='hurt'?16:7))*(hurt?0.09:0.045),w=B.w*(1+ws),h=B.h*(1-ws);
    g.fillStyle='rgba(90,55,25,0.2)';g.beginPath();g.ellipse(B.x,-0.02,1.6-B.hop*0.6,0.14,0,0,7);g.fill();
    g.save();g.translate(x,y);
    // plate
    g.fillStyle='#fffaf0';g.beginPath();g.ellipse(0,-0.06,w*0.62,0.16,0,0,7);g.fill();g.strokeStyle='rgba(90,140,200,0.6)';g.lineWidth=0.04;g.stroke();
    // jelly dome (jelly-mould ridges)
    var gr=g.createLinearGradient(0,-h,0,0);gr.addColorStop(0,'rgba(255,150,180,0.95)');gr.addColorStop(1,'rgba(240,90,130,0.95)');g.fillStyle=gr;
    g.beginPath();g.moveTo(-w/2,-0.1);g.bezierCurveTo(-w/2,-h*0.7,-w*0.36,-h,0,-h);g.bezierCurveTo(w*0.36,-h,w/2,-h*0.7,w/2,-0.1);g.closePath();g.fill();
    g.strokeStyle='rgba(200,60,100,0.35)';g.lineWidth=0.05;[-0.5,0,0.5].forEach(function(k){g.beginPath();g.moveTo(k*w*0.62,-0.12);g.quadraticCurveTo(k*w*0.5,-h*0.6,k*w*0.28,-h*0.95);g.stroke()});
    g.fillStyle='rgba(255,255,255,0.45)';g.beginPath();g.ellipse(-w*0.22,-h*0.68,0.18,0.42,-0.4,0,7);g.fill();
    // cherry
    g.strokeStyle='#4f8a3a';g.lineWidth=0.05;g.beginPath();g.moveTo(0.05,-h-0.25);g.quadraticCurveTo(0.2,-h-0.6,0.35,-h-0.65);g.stroke();g.fillStyle='#e8344f';g.beginPath();g.arc(0,-h-0.18,0.2,0,7);g.fill();g.fillStyle='rgba(255,255,255,0.7)';g.beginPath();g.arc(-0.06,-h-0.25,0.05,0,7);g.fill();
    // face (looks left at the belt)
    var fx=-0.35,fy=-h*0.62;bossEyes(g,fx,fy,0.3,0.1,won||hurt,-1,(t%3.3)<0.12);bossCheeks(g,fx,fy+0.24,0.48,0.09);
    var mo=B.mouth,mx=-w*0.35,my=-1.25;if(mo>0.05){g.fillStyle='#7a1f3d';g.beginPath();g.ellipse(mx,my,0.25+0.4*mo,0.12+0.45*mo,0,0,7);g.fill();g.fillStyle='#ff9fb8';g.beginPath();g.ellipse(mx,my+0.25*mo,0.2*mo+0.1,0.12*mo,0,0,7);g.fill();
      if(st==='open'&&!won){g.strokeStyle='rgba(255,215,94,'+(0.5+0.5*Math.sin(t*8))+')';g.lineWidth=0.07;g.beginPath();g.ellipse(mx,my,0.95,0.95,0,0,7);g.stroke()}}
    else{g.strokeStyle='#7a1f3d';g.lineWidth=0.06;g.beginPath();g.arc(mx+0.1,my-0.1,0.18,0.3,Math.PI-0.3);g.stroke()}
    g.restore();
    if(st==='hungry'||st==='open'){GFX.wtext(g,st==='open'?'Aaah!':'grumble\u2026',x+0.4,y-B.h-0.5+Math.sin(t*5)*0.05,0.28,'#e0567a')}}
};

// ---------- B4 · Captain Tock the Wind-Up Soldier (Toy Attic): wind up the toy mouse so he trips over it ----------
BK.soldier={hurtTime:2.2,camY:-2.6,
  build:function(b,d){b.spawn(1.4,-0.6);b.ground(0,38,'purple');[0.9,1.5,2.1].forEach(function(x){b.cp(x,0)});
    b.block(5.6,-1.4,2.0,5.4,{topCol:'yellow'});
    b.lever('mouse',10.4,0,{start:0.55});
    b.toy('mouse',12.0,-0.4,{w:1.2,h:0.7,sig:'mouse',speed:4.0,look:'mouse'});
    b.sign(3.4,0,'Wind up the mouse!\nCaptain Tock never\nlooks down\u2026');
    [[6.6,-2.6],[6.6,-3.8],[9.0,-1.4],[11.5,-2.4],[14,-2.2],[18,-4.6],[22,-4.6],[26,-4.6],[30,-4.6],[34,-4.6],[36.5,-1.2],[1.2,-3.0]].forEach(function(q){b.prize(q[0],q[1])});
    b.setW(38);b.route({t:'boss',kind:'soldier'})},
  init:function(lv,B){B.x=30;B.y=0;B.w=1.6;B.h=3.4;B.dir=-1;B.face=-1;B.range=[15,36];B.fall=0;B.hopY=0;B.hopV=0;B.drum=0;
    B.mouse=lv.objs.filter(function(o){return o.name==='mouse'})[0];B.lever=lv.levers.filter(function(l){return l.sig==='mouse'})[0];B.mT=0;this.phase(lv,B)},
  phase:function(lv,B){B.P=[{v:1.3,every:5.2,corks:1,sp:7.0},{v:1.7,every:4.8,corks:2,sp:7.5},{v:2.1,every:4.4,corks:2,sp:8.0}][B.phase];B.state=B.phase?'regroup':'march';B.st=0;B.atkT=B.phase?1.6:2.8;B.fall=0;BK.soldier.resetMouse(lv,B);if(B.phase)floatText(B.x,B.y-B.h-1,'Left, right, left!','#5a3a28')},
  resetMouse:function(lv,B){if(B.lever.on)resetLever(B.lever);respawnObj(B.mouse,B.mouse.home);B.mouse.toy.dir=1;B.mT=0},
  step:function(lv,B,dt){var P=B.P,K=BK.soldier,mp=B.mouse.body.getPosition();
    // hop physics (he hops over the mouse when he sees it)
    if(B.hopY<0||B.hopV<0){B.hopV+=30*dt;B.hopY+=B.hopV*dt;if(B.hopY>=0){B.hopY=0;B.hopV=0}}
    if(B.lever.on){B.mT+=dt;var ma=B.mouse.toy;if(mp.x>B.range[1]+0.6||B.mT>9||(ma&&ma.dir<0&&mp.x<13)){K.resetMouse(lv,B)}}
    // meet the mouse
    var near=Math.abs(mp.x-B.x)<B.w/2+0.5&&mp.y>-1.2&&B.lever.on&&B.hopY===0;
    if(near){var toward=(mp.x<B.x&&B.dir<0)||(mp.x>B.x&&B.dir>0);var trips=B.phase===0||(B.state==='march'&&toward);
      if(trips){B.fall=0.001;B.trip=mp.x<B.x?-1:1;bossHit(lv,B,'trip');B.mouse.body.setLinearVelocity(V(3,-3));return}
      else{B.hopV=-8.5;B.hopY=-0.01;floatText(B.x,B.y-B.h-0.8,'Hup!','#5a3a28');SND.sfx('jump')}}
    if(B.state==='regroup'){B.dir=1;B.face=1;B.x+=2.6*dt;if(B.x>=33){B.x=33;B.state='march';B.dir=-1;B.st=0}}
    else if(B.state==='march'){B.x+=B.dir*P.v*dt;if(B.x<B.range[0]){B.x=B.range[0];B.dir=1}if(B.x>B.range[1]){B.x=B.range[1];B.dir=-1}B.face=B.dir;
      B.atkT-=dt;if(B.atkT<=0&&B.calm<=0){B.state='aim';B.st=0;var pp=player.body.getPosition();B.face=pp.x<B.x?-1:1;B.excl=1.1;B.exclDx=B.face*0.4;SND.sfx('tick')}}
    else if(B.state==='aim'){B.drum+=dt*20;if(B.st>1.1){B.state='fire';B.st=0;for(var k=0;k<P.corks;k++)bossLater(B,k*0.95,function(){if(B.state==='hurt'||B.won)return;B.shots.push({k:'line',spr:'cork',x:B.x+B.face*0.9,y:-0.62,vx:B.face*P.sp,r:0.3,rot:0,t:0});SND.sfx('pop',2);burst(B.x+B.face*1.0,-0.6-0,'dust',4,'#fff')})}}
    else if(B.state==='fire'){if(B.st>0.4+0.95*(P.corks-1)){B.state='march';B.st=0;B.atkT=P.every}}},
  hurtStep:function(lv,B,dt){B.fall=Math.min(1,B.fall+dt*4);if(B.hurtT>1.5)B.fall=Math.max(0,1-(B.hurtT-1.5)*2.5);if(B.lever.on&&!(player.grab&&player.grab.ud.lever===B.lever))resetLever(B.lever)},
  info:function(lv,B){var mp=B.mouse.body.getPosition();return {mouse:[+mp.x.toFixed(2),+mp.y.toFixed(2)],levOn:B.lever.on,lever:10.4,range:B.range,hop:B.hopY}},
  exitAt:function(lv,B){return [Math.max(17,Math.min(34,B.x-3)),-1.7]},
  draw:function(g,lv,B,t){var x=B.x,y=B.y+B.hopY,f=B.face,st=B.state,won=B.won,hurt=st==='hurt',mar=st==='march'&&B.hopY===0;var step=mar?Math.sin(B.t*(st==='regroup'?10:B.P.v*4)):0;
    g.fillStyle='rgba(90,55,25,0.22)';g.beginPath();g.ellipse(B.x,-0.02,0.9,0.12,0,0,7);g.fill();
    g.save();g.translate(x,y);if(B.fall>0){g.rotate((B.trip||1)*B.fall*1.35)}
    // legs
    g.fillStyle='#2f3b6e';[[-0.28,step],[0.28,-step]].forEach(function(q){g.save();g.translate(q[0],-1.1);g.rotate(q[1]*0.3);GFX.rr(g,-0.16,0,0.32,1.0,0.08);g.fill();g.fillStyle='#1d1d2b';GFX.rr(g,-0.2,0.88,0.44,0.16,0.07);g.fill();g.restore();g.fillStyle='#2f3b6e'});
    // body (red coat)
    GFX.rr(g,-0.62,-2.45,1.24,1.45,0.22);g.fillStyle=GFX.pat('felt_red');g.fill();g.strokeStyle='rgba(120,30,30,0.6)';g.lineWidth=0.04;g.stroke();
    g.strokeStyle='#ffd23f';g.lineWidth=0.08;g.beginPath();g.moveTo(-0.55,-2.35);g.lineTo(0.55,-1.15);g.stroke();
    [-2.1,-1.7,-1.3].forEach(function(by){GFX.sewButton(g,0.0,by,0.07,'#ffd23f',2)});
    // drum
    g.save();g.translate(-f*0.15,-1.35);GFX.rr(g,-0.38,-0.25,0.76,0.5,0.1);g.fillStyle='#fffaf0';g.fill();g.strokeStyle='#e0567a';g.lineWidth=0.05;g.stroke();
    g.beginPath();g.moveTo(-0.38,-0.25);g.lineTo(0,0.25);g.lineTo(0.38,-0.25);g.stroke();g.restore();
    // arms with drumsticks (drum roll = telegraph)
    var dr=st==='aim'?Math.sin(B.drum)*0.5:0;g.strokeStyle='#ff8a7a';g.lineWidth=0.18;g.lineCap='round';[-1,1].forEach(function(s2){g.save();g.translate(s2*0.62,-2.2);g.rotate(s2*0.4+(s2>0?dr:-dr));g.beginPath();g.moveTo(0,0);g.lineTo(0,0.6);g.stroke();g.strokeStyle='#8a5a2e';g.lineWidth=0.05;g.beginPath();g.moveTo(0,0.6);g.lineTo(-s2*0.3,0.95);g.stroke();g.restore();g.strokeStyle='#ff8a7a';g.lineWidth=0.18});
    // cork gun on the back (pops corks)
    if(st==='aim'||st==='fire'){g.fillStyle='#8a5a2e';GFX.rr(g,f>0?0.35:-1.15,-0.78,0.8,0.26,0.08);g.fill()}
    // head
    g.fillStyle='#ffe1c4';g.beginPath();g.arc(0,-2.8,0.42,0,7);g.fill();g.strokeStyle='rgba(120,70,40,0.4)';g.lineWidth=0.03;g.stroke();
    bossEyes(g,f*0.08,-2.82,0.16,0.065,won||hurt,f,(t%3.7)<0.12);bossCheeks(g,f*0.08,-2.66,0.24,0.06);
    g.fillStyle='#5a3a28';g.fillRect(f*0.08-0.12,-2.62,0.24,0.04);
    // tall shako hat
    GFX.rr(g,-0.36,-3.75,0.72,0.75,0.08);g.fillStyle='#2b2230';g.fill();g.fillStyle='#ffd23f';g.fillRect(-0.36,-3.08,0.72,0.08);g.beginPath();g.arc(0,-3.4,0.1,0,7);g.fill();
    g.fillStyle='#ff6f9a';g.beginPath();g.ellipse(0,-3.85,0.1,0.16,0,0,7);g.fill();
    // wind-up key on his back
    g.save();g.translate(-f*0.7,-1.9);g.rotate(won?0:t*3);g.fillStyle='#c9c9d6';g.strokeStyle='#5a5f70';g.lineWidth=0.03;g.beginPath();g.ellipse(-0.18,0,0.17,0.1,0,0,7);g.ellipse(0.18,0,0.17,0.1,0,0,7);g.fill();g.stroke();g.restore();
    g.restore()}
};

// ---------- B5 · Grumble the Grumpy Gnome (Garden Shed): flip the fan to blow his sneeze-puffs right back at him ----------
BK.gnome={hurtTime:2.2,camY:-2.4,
  build:function(b,d){b.spawn(1.6,-0.6);b.ground(0,38,'green');[1.0,1.6,2.2].forEach(function(x){b.cp(x,0)});
    b.block(3.6,-1.3,1.8,5.3,{topCol:'grass'});
    b.toggle('fan',10.6,0);b.fan(12.6,-0.05,8.5,2.4,{dir:'right',power:5,sig:'fan'});
    b.sign(6.6,0,'Flip the fan switch to\nblow Grumble\u2019s sneezes\nright back at him!');
    [[4.5,-2.5],[4.5,-3.7],[8.4,-1.6],[13,-3.2],[15,-3.4],[17,-3.6],[19,-3.4],[24,-3.6],[28,-3.8],[32,-3.6],[36,-1.2],[1.0,-3.0]].forEach(function(q){b.prize(q[0],q[1])});
    b.setW(38);b.route({t:'boss',kind:'gnome'})},
  init:function(lv,B){B.x=28;B.y=0;B.w=1.6;B.h=2.1;B.dir=-1;B.face=-1;B.range=[23.5,33.5];B.umb=0;B.umbUp=false;B.umbT=0;B.fanT=0;B.tx=27;B.potT=4;
    B.fan=lv.fans[0];this.phase(lv,B)},
  phase:function(lv,B){B.P=[{v:1.0,every:3.8,pair:false,umbU:0,umbD:0,pot:0},{v:1.4,every:3.4,pair:false,umbU:3.0,umbD:2.6,pot:7},{v:1.8,every:3.4,pair:true,umbU:2.6,umbD:2.0,pot:6}][B.phase];
    B.state='walk';B.st=0;B.atkT=2.2;B.umbUp=false;B.umbT=B.P.umbD||0;B.potT=B.P.pot||99;if(sig('fan'))setSig('fan',false)},
  puff:function(lv,B,s,dt,i){var fn=B.fan;s.t+=dt;
    if(!s.blown){s.x+=s.vx*dt;s.y=s.y0+Math.sin(s.t*3+s.ph)*0.12;if(fn.amt>0.5&&fanIn(fn,s.x,s.y)){s.blown=true;s.vx=7.5;SND.sfx('whir');burst(s.x,s.y,'fluff',6,'#fff')}
      if(s.x<0.4){B.shots.splice(i,1);return}}
    else{s.x+=s.vx*dt;s.y+=(s.y0-0.3-s.y)*dt*2;
      if(Math.abs(s.x-B.x)<B.w/2+0.35&&B.state!=='hurt'){B.shots.splice(i,1);
        if(B.umbUp){burst(s.x,s.y,'fluff',10,'#fff');floatText(B.x,B.y-B.h-0.9,'Ha! Umbrella!','#5a3a28');SND.sfx('boing');B.umbBlock=(B.umbBlock||0)+1;return}
        burst(s.x,s.y,'fluff',18,'#fff');floatText(B.x,B.y-B.h-1.2,'Hee-hee! Tickles!','#2f9e74');bossHit(lv,B,'puff');return}
      if(s.x>lv.w-0.5){B.shots.splice(i,1)}}},
  step:function(lv,B,dt){var P=B.P;
    // fan switch springs back after a moment
    if(sig('fan')){B.fanT+=dt;if(B.fanT>2.2){setSig('fan',false);B.fanT=0}}else B.fanT=0;
    // umbrella rhythm (phases 2-3)
    if(P.umbU){B.umbT-=dt;if(B.umbT<=0){B.umbUp=!B.umbUp;B.umbT=B.umbUp?P.umbU:P.umbD;SND.sfx(B.umbUp?'pop':'unswitch')}}
    B.umb=approach(B.umb,B.umbUp?1:0,dt*6);
    if(P.pot){B.potT-=dt;if(B.potT<=0&&B.calm<=0&&B.state==='walk'){B.potT=P.pot;var q=player.body.getPosition();B.excl=0.8;B.exclDx=0;bossLater(B,0.8,function(){if(B.state==='hurt'||B.won)return;bossLob(lv,B,B.x,B.y-B.h,q.x,'pot',1.2,{h:3.6,hitR:0.85})})}}
    if(B.state==='walk'){var d=B.tx-B.x;if(Math.abs(d)<0.15)B.tx=B.range[0]+Math.random()*(B.range[1]-B.range[0]);else{B.x+=Math.sign(d)*Math.min(Math.abs(d),P.v*dt);B.face=-1}
      B.atkT-=dt;if(B.atkT<=0&&B.calm<=0){B.state='ahh';B.st=0;B.excl=1.0;B.exclDx=-0.3;floatText(B.x,B.y-B.h-0.8,'Ah\u2026 ahh\u2026','#5a3a28')}}
    else if(B.state==='ahh'){if(B.st>1.0){B.state='choo';B.st=0;SND.sfx('pop',0);floatText(B.x-0.6,B.y-B.h-0.6,'CHOO!','#e0567a');
        var n=P.pair?2:1;for(var k=0;k<n;k++)B.shots.push({k:'puff',x:B.x-1.0-k*0.85,y:-1.0,y0:-1.0,vx:-1.8,r:0.42,t:0,ph:Math.random()*6,blown:false})}}
    else if(B.state==='choo'){if(B.st>0.5){B.state='walk';B.st=0;B.atkT=P.every}}},
  hurtStep:function(lv,B,dt){if(sig('fan'))setSig('fan',false);B.umb=approach(B.umb,0,dt*6);B.umbUp=false},
  info:function(lv,B){return {umbUp:B.umbUp,umbT:+B.umbT.toFixed(2),umbU:B.P.umbU,umbD:B.P.umbD,fan:sig('fan'),amt:B.fan.amt,toggle:10.6,fanX:[12.6,21.1]}},
  exitAt:function(lv,B){return [Math.max(22,Math.min(33,B.x-3)),-1.7]},
  draw:function(g,lv,B,t){var x=B.x,y=B.y,st=B.state,won=B.won,hurt=st==='hurt';var bob=st==='walk'?Math.abs(Math.sin(B.t*7))*0.06:0,ahh=st==='ahh'?B.st:0,lean=st==='ahh'?-0.12*Math.min(1,ahh):st==='choo'?0.18:0;
    g.fillStyle='rgba(90,55,25,0.22)';g.beginPath();g.ellipse(x,-0.02,0.95,0.12,0,0,7);g.fill();
    g.save();g.translate(x,y-bob);g.rotate(lean);
    // boots
    g.fillStyle='#6b4a2e';GFX.rr(g,-0.55,-0.22,0.5,0.22,0.08);g.fill();GFX.rr(g,0.05,-0.22,0.5,0.22,0.08);g.fill();
    // body (blue coat) + belt
    g.fillStyle=GFX.pat('felt_blue');GFX.rr(g,-0.62,-1.25,1.24,1.05,0.3);g.fill();g.fillStyle='#5a3a28';g.fillRect(-0.62,-0.62,1.24,0.12);g.fillStyle='#ffd23f';g.fillRect(-0.1,-0.64,0.2,0.16);
    // head + beard
    g.fillStyle='#ffd9bd';g.beginPath();g.arc(0,-1.45,0.4,0,7);g.fill();
    g.fillStyle='#fffaf0';g.beginPath();g.moveTo(-0.42,-1.4);g.quadraticCurveTo(-0.5,-0.7,0,-0.55);g.quadraticCurveTo(0.5,-0.7,0.42,-1.4);g.quadraticCurveTo(0,-1.15,-0.42,-1.4);g.fill();g.strokeStyle='rgba(150,130,110,0.4)';g.lineWidth=0.03;g.stroke();
    // nose (goes red when about to sneeze)
    g.fillStyle=ahh?'#ff6f6f':'#ffaf9a';g.beginPath();g.arc(-0.12,-1.38,0.13+ahh*0.04,0,7);g.fill();
    // eyes + grumpy brows (soft)
    bossEyes(g,-0.08,-1.56,0.15,0.055,won||hurt||st==='choo',-1,(t%3.1)<0.12);
    if(!won&&!hurt){g.strokeStyle='#8a6a50';g.lineWidth=0.05;g.lineCap='round';g.beginPath();g.moveTo(-0.33,-1.72);g.lineTo(-0.15,-1.67);g.moveTo(0.0,-1.67);g.lineTo(0.18,-1.72);g.stroke()}
    bossCheeks(g,-0.08,-1.42,0.26,0.06);
    // tall red hat
    g.fillStyle=GFX.pat('felt_red');g.beginPath();g.moveTo(-0.46,-1.62);g.quadraticCurveTo(-0.2,-2.5,0.35,-2.85+Math.sin(t*2)*0.05);g.quadraticCurveTo(0.2,-2.2,0.46,-1.62);g.closePath();g.fill();g.strokeStyle='rgba(120,30,30,0.5)';g.lineWidth=0.03;g.stroke();
    // umbrella
    if(B.umb>0.02){var u=B.umb;g.save();g.translate(-0.65,-1.0);g.strokeStyle='#5a3a28';g.lineWidth=0.05;g.beginPath();g.moveTo(0,0.5);g.lineTo(0,-1.2*u);g.stroke();
      g.translate(0,-1.2*u);g.rotate(-1.2+0.0*u);g.scale(u,1);g.fillStyle='#ff7fae';g.beginPath();g.arc(0,0,0.95,Math.PI,0);g.closePath();g.fill();g.fillStyle='#fffaf0';[-0.55,0,0.55].forEach(function(dx){g.beginPath();g.arc(dx,-0.32,0.1,0,7);g.fill()});g.restore()}
    g.restore()}
};
/* ---------------- boss level defs ---------------- */
(function(){Object.keys(BOSS_INFO).forEach(function(k){var id=+k,inf=BOSS_INFO[id];
  var d={id:id,world:inf.w,boss:true,kind:inf.kind,name:inf.name,blurb:inf.blurb,theme:WORLDS[inf.w].theme,w:40,intro:null};
  d.build=function(b){(BK[inf.kind].build||function(){})(b,d)};BOSSES.push(d)})})();
/* ---------------- v1.4 Level Creator ----------------
   Levels are lists of craft pieces {t,x,y,w,h,e} in metres (0.5 m grid). They are built with the same level builder as the
   real levels, play with the normal 3-lives rules, live in their own localStorage key and share as a compact, versioned,
   checksummed code (BBX1-...). Nothing here touches the main save's progress. */
var CKEY='bobbin-creator-v1',CODE_PRE='BBX1-',ED_MAX=400,ED_W_MIN=24,ED_W_MAX=240;
var PIECES=[
  {t:'plat',nm:'Platform',w:4,h:1,rw:1,rh:1,opt:5},{t:'rope',nm:'Rope',h:4,rh:1},{t:'spring',nm:'Spring',w:1.5,rw:1,opt:2},{t:'crate',nm:'Crate',w:1.2},
  {t:'belt',nm:'Conveyor',w:5,rw:1,rot:2},{t:'jelly',nm:'Jelly',w:3,h:1,rw:1,rh:1},{t:'fan',nm:'Fan',w:2,h:5,rw:1,rh:1,rot:3},{t:'lift',nm:'Lift',w:2,h:4,rw:1,rh:1,rot:2},
  {t:'piston',nm:'Piston',h:3,rh:1},{t:'prize',nm:'Prize'},{t:'cp',nm:'Checkpoint'},{t:'pit',nm:'Pit',w:3,rw:1},{t:'start',nm:'Start'},{t:'exit',nm:'Exit'}];
var PT={};PIECES.forEach(function(p,i){p.code=i;PT[p.t]=p});
var MATS=['card','wood','felt','denim','burlap'],FELTC=['pink','sky','mint','yellow','purple','orange'];
var CR={store:null,cur:null,undo:[],sel:-1,cx:12,cy:-3,zoom:1,drag:null,pts:{},def:null,dirty:false,pal:null,testing:false,lastErr:null};
function crLoad(){if(CR.store)return CR.store;var st=null;try{st=JSON.parse(localStorage.getItem(CKEY)||'null')}catch(e){st=null}
  if(!st||typeof st!=='object'||!Array.isArray(st.levels))st={v:1,levels:[],cur:null};st.levels=st.levels.filter(function(l){return l&&typeof l.id==='string'&&Array.isArray(l.items)}).map(crSanitize);CR.store=st;return st}
function crPersist(){try{localStorage.setItem(CKEY,JSON.stringify(CR.store))}catch(e){toast('Could not save (storage full?)')}}
function crNum(v,lo,hi,d){v=+v;if(!isFinite(v))v=d;v=Math.round(v*2)/2;return Math.max(lo,Math.min(hi,v))}
// clamp every field to something the builder can always handle
function crItem(it){if(!it||!PT[it.t])return null;var p=PT[it.t],o={t:it.t,x:crNum(it.x,0,ED_W_MAX,2),y:crNum(it.y,-13,0,0)};
  if(p.w!==undefined)o.w=crNum(it.w,0.5,it.t==='pit'?20:40,p.w);if(p.h!==undefined)o.h=crNum(it.h,0.5,it.t==='rope'?9:12,p.h);if(it.t==='crate')o.w=crNum(it.w,0.5,2.5,1.2);
  o.e=Math.max(0,Math.min(15,(+it.e|0)));if(it.t==='pit')o.y=0;return o}
function crSanitize(l){var items=(l.items||[]).slice(0,ED_MAX).map(crItem).filter(Boolean);var th=+l.theme;if(!(th>=0&&th<=5))th=0;
  return {id:String(l.id).slice(0,40),name:String(l.name||'My level').replace(/[<>]/g,'').slice(0,24)||'My level',theme:th|0,items:items,upd:+l.upd||Date.now()}}
function crNew(name){var l={id:'L'+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36),name:name||'My level',theme:0,upd:Date.now(),
  items:[{t:'start',x:2,y:0},{t:'plat',x:7,y:-1.5,w:4,h:1.5,e:0},{t:'prize',x:9,y:-2.8},{t:'spring',x:13,y:0,w:1.5,e:0},{t:'plat',x:15,y:-4,w:5,h:1,e:1},{t:'prize',x:17.5,y:-5.3},{t:'cp',x:22,y:0},{t:'exit',x:28,y:0}].map(crItem)};return l}
function crWidth(l){var mx=0;l.items.forEach(function(it){var r=it.x+(it.w||0)+(it.t==='lift'&&it.e===1?it.h:0)+(it.t==='fan'&&it.e===1?it.w:0);if(r>mx)mx=r});return Math.max(ED_W_MIN,Math.min(ED_W_MAX,Math.ceil(mx+6)))}
/* ---- build an engine level def from items (never throws: bad pieces are skipped) ---- */
function crDef(l,tag){var th=Math.max(0,Math.min(5,l.theme|0)),w=crWidth(l),id='c_'+(tag||'test');
  var def={id:id,custom:true,world:th,theme:WORLDS[th].theme,name:l.name,blurb:'Your own level',w:w,crLevel:l,
    build:function(b){var st=l.items.filter(function(i){return i.t==='start'})[0]||{x:2,y:0},ex=l.items.filter(function(i){return i.t==='exit'})[0];
      b.spawn(st.x,st.y-0.6);b.cp(st.x,st.y);
      // the floor, with holes for pits
      var pits=l.items.filter(function(i){return i.t==='pit'}).map(function(i){return [i.x,i.x+i.w]}).sort(function(a,c){return a[0]-c[0]}),x0=0,tc=['yellow','pink','sky','purple','grass','orange'][th];
      pits.forEach(function(p){if(p[0]>x0+0.25)b.ground(x0,p[0],tc);b.pit(p[0],0.7,p[1]-p[0],6);x0=Math.max(x0,p[1])});if(w>x0+0.25)b.ground(x0,w,tc);
      var nm=0;l.items.forEach(function(it){try{crBuildItem(b,it,nm++)}catch(e){CR.lastErr=String(e&&e.message||e)}});
      if(ex)b.exit(ex.x,ex.y-1.25);else b.exit(w-3,-1.25)}};
  return def}
function crBuildItem(b,it,n){var x=it.x,y=it.y,w=it.w,h=it.h,e=it.e|0;switch(it.t){
  case 'plat':var m=MATS[e%MATS.length];b.block(x,y,w,h,{skin:m==='card'?undefined:m,mat:m==='wood'?'wood':m==='felt'?'felt':'card',col:FELTC[e%FELTC.length],topCol:m==='card'?FELTC[n%FELTC.length]:undefined});break;
  case 'rope':b.rope(x,y,Math.max(2,Math.round(h/0.5)),0.5);break;
  case 'spring':b.boing(x,y,w,{look:e%2?'pin':'sponge'});break;
  case 'crate':b.box('crate'+n,x,y-w/2,w,w,{grab:true,kind:'card'});break;
  case 'belt':b.belt(x,y,w,(e%2?-1:1)*3);break;
  case 'jelly':b.jelly(x,y,w,h);break;
  case 'fan':var dir=['up','right','left'][e%3];if(dir==='up')b.fan(x,y,w,h,{dir:'up',power:7});else b.fan(x,y,w,Math.min(h,4),{dir:dir,power:6});break;
  case 'lift':var cx=x+w/2;b.mover('lift'+n,{path:e%2?[[cx,y],[cx+h,y]]:[[cx,y],[cx,y-h]],w:w,speed:1.6,wait:1.0,look:'spool',col:'pink'});break;
  case 'piston':b.mover('pis'+n,{path:[[x,y],[x,y-h]],w:1.8,speed:1.6,wait:1.0,look:'cupcake',col:'pink',base:Math.min(0.4,y+3)});break;
  case 'prize':b.prize(x,y);break;
  case 'cp':b.cp(x,y);break}}
/* ---- share codes: version byte, theme, name, items (half-metre ints), 16-bit checksum, base64url ---- */
function crEncode(l){var by=[1,l.theme&7],nm=unescape(encodeURIComponent(l.name||'')).slice(0,24);by.push(nm.length);for(var i=0;i<nm.length;i++)by.push(nm.charCodeAt(i)&255);
  var items=l.items.slice(0,ED_MAX);by.push(items.length&255,items.length>>8);
  items.forEach(function(it){var x=Math.round(it.x*2),y=Math.round(-it.y*2);by.push(PT[it.t].code,x&255,(x>>8)&255,y&255,Math.round((it.w||0)*2)&255,Math.round((it.h||0)*2)&255,(it.e|0)&255)});
  var a=0,c=0;by.forEach(function(v){a=(a+v)%255;c=(c+a)%255});by.push(a,c);
  var bin='';by.forEach(function(v){bin+=String.fromCharCode(v)});return CODE_PRE+btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function crDecode(code){try{code=String(code||'').replace(/\s+/g,'');var k=code.toUpperCase().indexOf('BBX');if(k<0)return {err:'That doesn\u2019t look like a Bobbin level code (they start with BBX1-).'};code=code.slice(k);
    if(code.slice(0,5).toUpperCase()!==CODE_PRE)return {err:'This code is from a newer version of the game.'};
    var s=code.slice(5).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';var bin=atob(s),by=[];for(var i=0;i<bin.length;i++)by.push(bin.charCodeAt(i));
    if(by.length<7)return {err:'The code is too short \u2013 part of it may be missing.'};
    var a=0,c=0;for(i=0;i<by.length-2;i++){a=(a+by[i])%255;c=(c+a)%255}if(a!==by[by.length-2]||c!==by[by.length-1])return {err:'The code is damaged (checksum doesn\u2019t match). Copy it again?'};
    if(by[0]!==1)return {err:'This code is from a newer version of the game.'};var p=1,th=by[p++],nl=by[p++],nm='';if(th>5)return {err:'Unknown theme in code.'};
    for(i=0;i<nl;i++)nm+=String.fromCharCode(by[p++]);try{nm=decodeURIComponent(escape(nm))}catch(e){nm='Shared level'}
    var n=by[p]|(by[p+1]<<8);p+=2;if(n>ED_MAX||p+n*7!==by.length-2)return {err:'The code is damaged (wrong length).'};
    var items=[];for(i=0;i<n;i++){var tc=by[p],x=(by[p+1]|(by[p+2]<<8))/2,y=-(by[p+3]>127?by[p+3]-256:by[p+3])/2,pc=PIECES[tc];
      if(!pc)return {err:'The code has a piece this version doesn\u2019t know.'};var it={t:pc.t,x:x,y:y,e:by[p+6]};if(pc.w!==undefined||pc.t==='crate')it.w=by[p+4]/2;if(pc.h!==undefined)it.h=by[p+5]/2;items.push(it);p+=7}
    var l=crSanitize({id:'L'+Date.now().toString(36),name:nm||'Shared level',theme:th,items:items});
    if(!l.items.some(function(q){return q.t==='start'}))return {err:'The level in this code has no start.'};return {level:l}}
  catch(e){return {err:'That code couldn\u2019t be read. Make sure you copied all of it.'}}}
/* ---- editor ---- */
function crCurLevel(){var st=crLoad();var l=st.levels.filter(function(q){return q.id===st.cur})[0];if(!l){l=st.levels[0];if(!l){l=crNew('My level');st.levels.push(l)}st.cur=l.id}return l}
function openCreator(){var st=crLoad(),prev=CR.cur;CR.cur=crCurLevel();crPersist();if(prev!==CR.cur){CR.undo=[];CR.sel=-1}var keepView=!!(prev&&prev===CR.cur&&CR.testing);CR.testing=false;state='edit';hud.classList.add('hidden');touchUI.classList.add('hidden');showScreen('creator');
  if(SND.setTrack){SND.setTrack('map');if(SND.ctx())SND.startMusic()}crBuildPalette();crRebuild(!keepView);crUI()}
function crRebuild(center){var l=CR.cur;try{CR.def=crDef(l,'edit');particles=[];floaters=[];L=newLevel(CR.def);player=null;CR.err=null}catch(e){CR.err=String(e&&e.message||e);try{L=newLevel(crDef({name:l.name,theme:l.theme,items:[{t:'start',x:2,y:0}]},'edit'))}catch(e2){}}
  if(center){CR.zoom=1;var pe=document.getElementById('edPal'),ph=pe&&pe.offsetHeight||90,s=edScale();CR.cx=Math.max(W/s/2-1,Math.min(12,L.w/2));CR.cy=Math.min(-3.5,1.0-(H-ph-6-H/2)/s)}}
function crChanged(){CR.cur.items=(CR.cur.items||[]).slice(0,ED_MAX).map(crItem).filter(Boolean);if(CR.sel>=CR.cur.items.length)CR.sel=-1;CR.cur.upd=Date.now();crPersist();crRebuild(false);crUI()}
function crPush(){CR.undo.push(JSON.stringify(CR.cur.items));if(CR.undo.length>60)CR.undo.shift()}
function crUndo(){if(!CR.undo.length){toast('Nothing to undo');return}CR.cur.items=JSON.parse(CR.undo.pop()).map(crItem).filter(Boolean);CR.sel=-1;crChanged();SND.sfx('unswitch')}
function edScale(){return S*CR.zoom}
function edToWorld(px,py){var s=edScale();return [CR.cx+(px-W/2)/s,CR.cy+(py-H/2)/s]}
function edBox(it){var p=PT[it.t],x=it.x,y=it.y,w=it.w||0,h=it.h||0;switch(it.t){
  case 'plat':case 'jelly':return [x,y,w,h];case 'belt':return [x,y,w,0.4];case 'rope':return [x-0.35,y,0.7,h];case 'spring':return [x,y-0.55,w,0.6];
  case 'crate':return [x-w/2,y-w,w,w];case 'fan':return it.e%3===0?[x,y-h,w,h]:[x,y-Math.min(h,4),w,Math.min(h,4)];
  case 'lift':return it.e%2?[x,y-0.2,w+h,0.6]:[x,y-h,w,h+0.4];case 'piston':return [x-0.9,y-h,1.8,h+0.5];case 'pit':return [x,-0.4,w,1.1];
  case 'prize':return [x-0.45,y-0.45,0.9,0.9];case 'cp':return [x-0.5,y-2.4,1.0,2.4];case 'start':return [x-0.6,y-1.2,1.2,1.2];case 'exit':return [x-0.9,y-2.5,1.8,2.5]}return [x-0.5,y-0.5,1,1]}
function edHit(wx,wy){var best=-1,ba=1e9;CR.cur.items.forEach(function(it,i){var b=edBox(it),m=0.25;if(wx>b[0]-m&&wx<b[0]+b[2]+m&&wy>b[1]-m&&wy<b[1]+b[3]+m){var a=b[2]*b[3];if(a<ba){ba=a;best=i}}});return best}
function edSnap(v){return Math.round(v*2)/2}
function crPlace(t,wx,wy){var p=PT[t],l=CR.cur;if(l.items.length>=ED_MAX){toast('That\u2019s a lot of pieces! ('+ED_MAX+' max)');return}
  if((t==='start'||t==='exit')){var ex=l.items.filter(function(q){return q.t===t})[0];if(ex){crPush();ex.x=edSnap(wx);ex.y=Math.min(0,edSnap(wy));CR.sel=l.items.indexOf(ex);crChanged();return}}
  var it={t:t,x:edSnap(wx-(p.w&&t!=='spring'&&t!=='crate'?p.w/2:0)),y:Math.min(0,edSnap(wy)),w:p.w,h:p.h,e:0};if(t==='crate')it.w=1.2;
  it=crItem(it);if(!it)return;crPush();l.items.push(it);CR.sel=l.items.length-1;SND.sfx('pop',2);crChanged()}
function crSet(items){crPush();CR.cur.items=items;CR.sel=-1;crChanged()}
function crAct(a){var l=CR.cur,it=l.items[CR.sel];if(!it)return;var p=PT[it.t];crPush();
  if(a==='del'){l.items.splice(CR.sel,1);CR.sel=-1;SND.sfx('unswitch')}
  else if(a==='dup'){var c=crItem(JSON.parse(JSON.stringify(it)));c.x=Math.min(ED_W_MAX,c.x+1);l.items.push(c);CR.sel=l.items.length-1;SND.sfx('pop',3)}
  else if(a==='rot'){if(p.rot){it.e=((it.e|0)+1)%p.rot;if(it.t==='fan'){var tw=it.w;it.w=it.h;it.h=tw}}else if(p.rw&&p.rh){var t2=it.w;it.w=it.h;it.h=t2}SND.sfx('click')}
  else if(a==='opt'){if(p.opt)it.e=((it.e|0)+1)%p.opt;SND.sfx('tap')}
  else if(a==='w+'||a==='w-'){if(it.w!==undefined)it.w+=a==='w+'?0.5:-0.5;SND.sfx('tap')}
  else if(a==='h+'||a==='h-'){if(it.h!==undefined)it.h+=a==='h+'?0.5:-0.5;SND.sfx('tap')}
  if(l.items[CR.sel])l.items[CR.sel]=crItem(l.items[CR.sel]);crChanged()}
function crUI(){var it=CR.cur.items[CR.sel],sel=document.getElementById('edSel');sel.classList.toggle('hidden',!it);
  if(it){var p=PT[it.t];sel.querySelectorAll('button').forEach(function(b){var a=b.getAttribute('data-a'),on=true;if(a==='rot')on=!!(p.rot||(p.rw&&p.rh));if(a==='opt')on=!!p.opt;if(a==='w-'||a==='w+')on=it.w!==undefined&&it.t!=='crate'||it.t==='crate';if(a==='h-'||a==='h+')on=it.h!==undefined;
    if((a==='del'||a==='dup')&&it.t==='start')on=a==='dup'?false:false;if(a==='dup'&&it.t==='exit')on=false;b.style.display=on?'':'none'})}
  document.getElementById('edName').textContent=CR.cur.name;document.getElementById('edUndo').disabled=!CR.undo.length}
function crBuildPalette(){var h=document.getElementById('edPal');if(h.childNodes.length)return;PIECES.forEach(function(p){var b=document.createElement('div');b.className='edItem';b.setAttribute('data-t',p.t);b.innerHTML='<canvas width="80" height="60"></canvas><span>'+p.nm+'</span>';
    h.appendChild(b);crIcon(b.querySelector('canvas'),p.t);
    b.addEventListener('pointerdown',function(e){e.preventDefault();SND.unlock();CR.pal={t:p.t,id:e.pointerId,x0:e.clientX,y0:e.clientY,moved:false,el:b};b.classList.add('on');try{b.setPointerCapture(e.pointerId)}catch(_){} });
    b.addEventListener('pointermove',function(e){var d=CR.pal;if(!d||d.id!==e.pointerId)return;var dx=e.clientX-d.x0,dy=e.clientY-d.y0;
      if(!d.moved&&!d.scroll){if(dy<-14||Math.abs(dy)>24)d.moved=true;else if(Math.abs(dx)>14&&Math.abs(dy)<10){d.scroll=true;d.sl=h.scrollLeft}}
      if(d.scroll){h.scrollLeft=d.sl-dx;return}d.cx=e.clientX;d.cy=e.clientY});
    b.addEventListener('pointerup',function(e){var d=CR.pal;if(!d||d.id!==e.pointerId)return;CR.pal=null;b.classList.remove('on');if(d.scroll)return;var r=document.getElementById('edTouch').getBoundingClientRect(),ar=app.getBoundingClientRect();
      if(d.moved&&e.clientY<r.bottom&&e.clientY>r.top){var w=edToWorld(e.clientX-ar.left,e.clientY-ar.top);crPlace(p.t,w[0],w[1])}
      else if(!d.moved){var vb=edToWorld(W/2,H*0.55);crPlace(p.t,vb[0],Math.min(0,vb[1]))}});
    b.addEventListener('pointercancel',function(){CR.pal=null;b.classList.remove('on')})})}
function crIcon(cv,t){var g2=cv.getContext('2d');g2.setTransform(10,0,0,10,40,48);try{var it=crItem({t:t,x:0,y:0,w:PT[t].w,h:PT[t].h,e:0});crDrawItem(g2,it,0,true)}catch(e){}}
// lightweight piece drawing used for palette icons and drag ghosts
function crDrawItem(g,it,t,icon){var b=edBox(it);if(icon){var sc=Math.min(6.5/Math.max(1,b[2]),4.2/Math.max(1,b[3]));g.scale(sc,sc);g.translate(-(b[0]+b[2]/2),-(b[1]+b[3]/2)+(icon?-0.6:0))}
  var col={plat:'#e9c99a',rope:'#b07a52',spring:'#ffd75e',crate:'#d9a25e',belt:'#6b6f86',jelly:'#ff8fb0',fan:'#8fd3ff',lift:'#ff9fc4',piston:'#ffad5c',prize:'#bfeaff',cp:'#7fe0c0',pit:'#5a3a28',start:'#4aa8ff',exit:'#ffd23f'}[it.t]||'#ccc';
  g.fillStyle=col;g.strokeStyle='#5a3a28';g.lineWidth=0.08;
  if(it.t==='prize'||it.t==='start'){g.beginPath();g.arc(b[0]+b[2]/2,b[1]+b[3]/2,b[2]/2,0,7);g.fill();g.stroke()}
  else if(it.t==='rope'){g.beginPath();g.moveTo(it.x,it.y);g.lineTo(it.x,it.y+it.h);g.lineWidth=0.15;g.strokeStyle=col;g.stroke()}
  else{GFX.rr(g,b[0],b[1],b[2],b[3],Math.min(0.2,b[2]/3,b[3]/3));g.fill();g.stroke()}
  if(it.t==='exit'){GFX.wtext(g,'★',b[0]+b[2]/2,b[1]+b[3]/2,1.0,'#5a3a28')}if(it.t==='fan'||it.t==='belt'||it.t==='lift'){var dirs=it.t==='fan'?['↑','→','←'][it.e%3]:it.t==='belt'?(it.e%2?'←':'→'):(it.e%2?'↔':'↕');GFX.wtext(g,dirs,b[0]+b[2]/2,b[1]+b[3]/2,Math.min(1.2,b[3]*0.9+0.4),'#fff')}}
function edFrame(dt){if(!L)return;var s=edScale();renderScene(g,W,H,DPR,s,CR.cx,CR.cy,L,null,clock,{cache:false,noSigns:true});
  g.setTransform(DPR*s,0,0,DPR*s,DPR*(W/2-CR.cx*s),DPR*(H/2-CR.cy*s));
  // grid + level bounds
  var vw=W/s,vh=H/s,x0=Math.floor((CR.cx-vw/2)),x1=Math.ceil(CR.cx+vw/2),y0=Math.floor(CR.cy-vh/2),y1=Math.ceil(CR.cy+vh/2);g.lineWidth=1/s;
  for(var x=x0;x<=x1;x++){g.strokeStyle=x%5===0?'rgba(90,58,40,0.22)':'rgba(90,58,40,0.08)';g.beginPath();g.moveTo(x,y0);g.lineTo(x,y1);g.stroke()}
  for(var y=y0;y<=y1;y++){g.strokeStyle=y%5===0?'rgba(90,58,40,0.22)':'rgba(90,58,40,0.08)';g.beginPath();g.moveTo(x0,y);g.lineTo(x1,y);g.stroke()}
  g.fillStyle='rgba(90,58,40,0.12)';g.fillRect(L.w,y0,x1-L.w+1,y1-y0);g.fillRect(x0-1,y0,Math.max(0,0-x0+1),y1-y0);
  // markers for pieces that are hard to see in the static preview
  CR.cur.items.forEach(function(it,i){var b=edBox(it);if(it.t==='start'){g.save();g.globalAlpha=0.9;GFX.drawBobbin(g,{x:it.x,y:it.y-0.5,r:0.48,sx:1,sy:1,face:1,col:wardLook().col,hat:wardLook().hat,expr:'happy',tuft:0});g.restore()}
    if(it.t==='lift'||it.t==='piston'||(it.t==='fan')||it.t==='pit'||it.t==='cp'){g.save();g.setLineDash([0.18,0.12]);g.strokeStyle='rgba(255,255,255,0.8)';g.lineWidth=0.05;g.strokeRect(b[0],b[1],b[2],b[3]);g.restore()}
    if(i===CR.sel){g.save();g.strokeStyle='#ff4f8f';g.lineWidth=0.09;g.setLineDash([0.22,0.14]);g.lineDashOffset=-clock*0.8;g.strokeRect(b[0]-0.1,b[1]-0.1,b[2]+0.2,b[3]+0.2);g.restore()}});
  var d=CR.drag;if(d&&d.ghost){g.save();g.globalAlpha=0.55;crDrawItem(g,d.ghost,clock,false);g.restore()}
  var pd=CR.pal;if(pd&&pd.moved&&pd.cx!==undefined){var ar=app.getBoundingClientRect(),w=edToWorld(pd.cx-ar.left,pd.cy-ar.top),p=PT[pd.t];var gi=crItem({t:pd.t,x:edSnap(w[0]-(p.w&&pd.t!=='spring'&&pd.t!=='crate'?p.w/2:0)),y:Math.min(0,edSnap(w[1])),w:p.w,h:p.h,e:0});if(gi){g.save();g.globalAlpha=0.6;crDrawItem(g,gi,clock,false);g.restore()}}
  g.setTransform(DPR,0,0,DPR,0,0);if(CR.err){g.fillStyle='#c0392b';g.font='14px '+FONT;g.fillText('Preview problem: '+CR.err,12,H-90)}}
// touch: one finger drags a piece (or pans the table), two fingers pinch-zoom + pan
(function(){var el=document.getElementById('edTouch');if(!el)return;
  function pos(e){var ar=app.getBoundingClientRect();return [e.clientX-ar.left,e.clientY-ar.top]}
  el.addEventListener('pointerdown',function(e){e.preventDefault();SND.unlock();try{el.setPointerCapture(e.pointerId)}catch(_){}var p=pos(e);CR.pts[e.pointerId]=p;var ids=Object.keys(CR.pts);
    if(ids.length===2){CR.drag=null;var a=CR.pts[ids[0]],b=CR.pts[ids[1]];CR.pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1]),z:CR.zoom,mx:(a[0]+b[0])/2,my:(a[1]+b[1])/2,cx:CR.cx,cy:CR.cy};return}
    var w=edToWorld(p[0],p[1]),hit=edHit(w[0],w[1]);
    if(hit>=0){var it=CR.cur.items[hit];CR.drag={mode:'move',i:hit,w0:w,ox:it.x,oy:it.y,moved:false,ghost:null,p0:p};}
    else CR.drag={mode:'pan',p0:p,cx:CR.cx,cy:CR.cy,moved:false}});
  el.addEventListener('pointermove',function(e){if(!CR.pts[e.pointerId])return;var p=pos(e);CR.pts[e.pointerId]=p;var ids=Object.keys(CR.pts);
    if(ids.length===2&&CR.pinch){var a=CR.pts[ids[0]],b=CR.pts[ids[1]],d=Math.hypot(a[0]-b[0],a[1]-b[1]),pc=CR.pinch;CR.zoom=Math.max(0.35,Math.min(2.2,pc.z*d/Math.max(20,pc.d)));
      var s=edScale();CR.cx=pc.cx-(((a[0]+b[0])/2)-pc.mx)/s;CR.cy=pc.cy-(((a[1]+b[1])/2)-pc.my)/s;edClamp();return}
    var dr=CR.drag;if(!dr)return;if(Math.hypot(p[0]-dr.p0[0],p[1]-dr.p0[1])>7)dr.moved=true;if(!dr.moved)return;var s2=edScale();
    if(dr.mode==='pan'){CR.cx=dr.cx-(p[0]-dr.p0[0])/s2;CR.cy=dr.cy-(p[1]-dr.p0[1])/s2;edClamp()}
    else{var w=edToWorld(p[0],p[1]),it=CR.cur.items[dr.i];if(!it)return;var gh=JSON.parse(JSON.stringify(it));gh.x=edSnap(dr.ox+w[0]-dr.w0[0]);gh.y=Math.min(0,edSnap(dr.oy+w[1]-dr.w0[1]));dr.ghost=crItem(gh)}});
  function up(e){if(!CR.pts[e.pointerId])return;delete CR.pts[e.pointerId];if(CR.pinch){if(Object.keys(CR.pts).length<2)CR.pinch=null;CR.drag=null;return}
    var dr=CR.drag;CR.drag=null;if(!dr)return;
    if(!dr.moved){var w=edToWorld(dr.p0[0],dr.p0[1]),hit=edHit(w[0],w[1]);CR.sel=hit;if(hit>=0)SND.sfx('tap');crUI();return}
    if(dr.mode==='move'&&dr.ghost){crPush();CR.cur.items[dr.i]=dr.ghost;CR.sel=dr.i;SND.sfx('land',2);crChanged()}}
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  el.addEventListener('wheel',function(e){e.preventDefault();CR.zoom=Math.max(0.35,Math.min(2.2,CR.zoom*(e.deltaY>0?0.9:1.1)));edClamp()},{passive:false})})();
function edClamp(){if(!L)return;CR.cx=Math.max(-2,Math.min(L.w+2,CR.cx));CR.cy=Math.max(-14,Math.min(3,CR.cy))}
/* ---- panels: levels, theme, share/import, rename ---- */
function crPanel(html){document.getElementById('edPBody').innerHTML=html;document.getElementById('edPanel').classList.remove('hidden')}
function crPanelClose(){document.getElementById('edPanel').classList.add('hidden')}
function crEsc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function crLevels(){var st=crLoad();var h='<h3>Your levels</h3>'+st.levels.map(function(l){return '<div class="edLv'+(l.id===CR.cur.id?' cur':'')+'" data-id="'+crEsc(l.id)+'"><b>'+crEsc(l.name)+'</b><small>'+l.items.length+' pieces</small><button class="mBtn" data-a="open">Edit</button><button class="mBtn" data-a="play">▶</button><button class="mBtn" data-a="del">🗑</button></div>'}).join('')+
    '<div class="row"><button class="btn" id="edNewLv">+ New level</button><button class="btn" id="edImp">Import code</button></div>';
  crPanel(h);var body=document.getElementById('edPBody');
  body.querySelectorAll('.edLv button').forEach(function(b){b.addEventListener('click',function(){SND.sfx('tap');var id=b.parentNode.getAttribute('data-id'),a=b.getAttribute('data-a'),l=st.levels.filter(function(q){return q.id===id})[0];if(!l)return;
    if(a==='open'){st.cur=id;CR.cur=l;CR.undo=[];CR.sel=-1;crPersist();crPanelClose();crRebuild(true);crUI()}
    else if(a==='play'){st.cur=id;CR.cur=l;crPersist();crPanelClose();crTest()}
    else if(a==='del'){if(b.getAttribute('data-sure')){st.levels=st.levels.filter(function(q){return q!==l});if(!st.levels.length)st.levels.push(crNew('My level'));if(st.cur===id){st.cur=st.levels[0].id;CR.cur=st.levels[0];CR.undo=[];CR.sel=-1;crRebuild(true);crUI()}crPersist();crLevels()}else{b.setAttribute('data-sure','1');b.textContent='Sure?'}}})});
  document.getElementById('edNewLv').addEventListener('click',function(){SND.sfx('pop',2);var l=crNew('Level '+(st.levels.length+1));st.levels.push(l);st.cur=l.id;CR.cur=l;CR.undo=[];CR.sel=-1;crPersist();crPanelClose();crRebuild(true);crUI()});
  document.getElementById('edImp').addEventListener('click',function(){SND.sfx('tap');crImport()})}
function crImport(){crPanel('<h3>Import a level code</h3><textarea id="edCodeIn" placeholder="Paste a BBX1-\u2026 code here" autocapitalize="off" autocomplete="off" spellcheck="false"></textarea><div class="msg" id="edMsg"></div><div class="row"><button class="btn" id="edDoImp">Import</button></div>');
  document.getElementById('edDoImp').addEventListener('click',function(){var r=crDecode(document.getElementById('edCodeIn').value),m=document.getElementById('edMsg');
    if(r.err){m.className='msg';m.textContent=r.err;SND.sfx('unswitch');return}var st=crLoad();if(st.levels.length>=60){m.className='msg';m.textContent='You have lots of levels already \u2013 delete one first.';return}
    st.levels.push(r.level);st.cur=r.level.id;CR.cur=r.level;CR.undo=[];CR.sel=-1;crPersist();m.className='msg ok';m.textContent='Imported \u201c'+r.level.name+'\u201d!';SND.sfx('full');crRebuild(true);crUI();setTimeout(crPanelClose,700)})}
function crShare(){var code=crEncode(CR.cur);crPanel('<h3>Share \u201c'+crEsc(CR.cur.name)+'\u201d</h3><p>Copy this code and send it to a friend. They can paste it in Level Creator \u2192 Levels \u2192 Import code.</p><textarea id="edCodeOut" readonly>'+code+'</textarea><div class="msg ok" id="edMsg"></div><div class="row"><button class="btn" id="edCopy">Copy code</button><button class="btn" id="edImp2">Import a code</button></div>');
  document.getElementById('edCopy').addEventListener('click',function(){var ta=document.getElementById('edCodeOut'),m=document.getElementById('edMsg');function done(){m.textContent='Copied!';SND.sfx('pop',4)}
    try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(code).then(done,function(){ta.select();try{document.execCommand('copy');done()}catch(e){m.textContent='Select the code and copy it.'}});return}}catch(e){}
    ta.focus();ta.select();try{document.execCommand('copy');done()}catch(e){m.textContent='Select the code and copy it.'}});
  document.getElementById('edImp2').addEventListener('click',function(){crImport()})}
function crTheme(){crPanel('<h3>Theme</h3><div class="edThemes">'+WORLDS.map(function(w,i){return '<button data-i="'+i+'" style="background:'+w.col+'">'+w.name+'</button>'}).join('')+'</div><h3 style="margin-top:12px">Name</h3><div class="row"><input id="edNm" maxlength="24" style="flex:1;font-size:17px;padding:8px;border-radius:10px;border:2px dashed rgba(90,58,40,.35)"><button class="btn" id="edNmOk">OK</button></div>');
  document.getElementById('edNm').value=CR.cur.name;
  document.querySelectorAll('.edThemes button').forEach(function(b){b.addEventListener('click',function(){SND.sfx('pop',2);CR.cur.theme=+b.getAttribute('data-i');crChanged();crPanelClose()})});
  document.getElementById('edNmOk').addEventListener('click',function(){var v=document.getElementById('edNm').value.replace(/[<>]/g,'').trim().slice(0,24);if(v){CR.cur.name=v;crChanged()}crPanelClose()})}
function crTest(){var l=CR.cur;var hasExit=l.items.some(function(q){return q.t==='exit'});if(!hasExit){toast('Add an Exit first!');return}
  CR.testing=true;CR.def=crDef(l,'play');crPersist();try{startLevel(CR.def.id)}catch(e){toast('Couldn\u2019t start that level: '+(e&&e.message||e));openCreator()}}
function crBackToEditor(){openCreator()}
(function(){function on2(id,fn){var el=document.getElementById(id);if(el)el.addEventListener('click',function(e){SND.unlock();SND.sfx('tap');fn(e)})}
  on2('creatorBtn',openCreator);on2('mapCreate',function(){goTitle();openCreator()});on2('edBack',function(){crPanelClose();goTitle()});on2('edUndo',crUndo);on2('edTheme',crTheme);on2('edName',crTheme);
  on2('edLevels',crLevels);on2('edShare',crShare);on2('edTest',crTest);on2('edPClose',crPanelClose);
  on2('edZin',function(){CR.zoom=Math.min(2.2,CR.zoom*1.25)});on2('edZout',function(){CR.zoom=Math.max(0.35,CR.zoom/1.25)});
  document.querySelectorAll('#edSel button').forEach(function(b){b.addEventListener('click',function(){SND.unlock();crAct(b.getAttribute('data-a'))})})})();
/* ---------------- camera / sizing ---------------- */
var app=document.getElementById('app');
function resize(){var r=app.getBoundingClientRect();W=Math.max(1,r.width);H=Math.max(1,r.height);
  var dpr=Math.min(window.devicePixelRatio||1,2);if(W*H*dpr*dpr>3.2e6)dpr=Math.sqrt(3.2e6/(W*H));DPR=dpr;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);portrait=H>W*1.05;document.body.classList.toggle('portrait',portrait);
  S=portrait?W/8.6:Math.min(W/17,H/9.4);viewW=W/S;viewH=H/S;updateRotateTip()}
window.addEventListener('resize',resize);window.addEventListener('orientationchange',function(){setTimeout(resize,200)});
if(window.visualViewport)window.visualViewport.addEventListener('resize',resize);
var camZoom=1,camLook=0;
function updateCamera(dt,snap){if(!player)return;var pp=player.body.getPosition(),v=player.body.getLinearVelocity();
  var s=S*camZoom,vw=W/s,vh=H/s;
  camLook+=((player.face*1.3+v.x*0.12)-camLook)*Math.min(1,dt*2);
  var tx=pp.x+camLook,ty=pp.y-(portrait?1.4:0.9);
  if(L&&L.boss&&state!=='title'&&state!=='costume'){var bm=vw*0.28;tx=pp.x+camLook*0.5+Math.max(-bm,Math.min(bm,(L.boss.x-pp.x)*0.45));if(L.boss.K.camY!==undefined)ty=Math.min(ty,L.boss.K.camY)}
  if(state==='title'){tx=pp.x-(portrait?0:vw*0.36);ty=pp.y-(portrait?vh*0.36:vh*0.18)}
  if(state==='costume'){if(portrait){tx=pp.x;ty=pp.y+vh*0.22}else{tx=pp.x+vw*0.24;ty=pp.y+vh*0.06}}
  if(snap){cam.x=tx;cam.y=ty}else{cam.x+=(tx-cam.x)*(1-Math.exp(-dt*4.5));var dy=ty-cam.y;cam.y+=dy*(1-Math.exp(-dt*(Math.abs(dy)>2?5:3)))}
  if(state!=='title'&&state!=='costume'){cam.x=Math.max(vw/2-0.5,Math.min(L.w-vw/2+0.5,cam.x))}
  if(state==='title'||state==='costume')return;
  var bot=L.bottom,top=L.top;if(vh>bot-top)cam.y=(bot+top)/2;else cam.y=Math.max(top+vh/2,Math.min(bot-vh/2,cam.y))}
/* ---------------- gameplay ---------------- */
var hud=document.getElementById('hud'),touchUI=document.getElementById('touch'),prizeCount=document.getElementById('prizeCount'),prizeTotal=document.getElementById('prizeTotal'),timeHud=document.getElementById('timeHud');
function fmt(t){t=Math.max(0,t);var m=Math.floor(t/60),s=Math.floor(t%60);return m+':'+(s<10?'0':'')+s}
function stepGame(dt){var lv=L,p=player;
  if(lv.out){}else if(!lv.finished){if(p.squash)squashUpdate(p,dt);else{var gs=graceInput(p,dt);updatePlayer(p,dt);if(gs){input.x=gs.x;input.jump=gs.jump;input.grab=gs.grab}}}else{p.body.setLinearVelocity(V(0,0))}
  updateDevices(dt);
  if(lv.boss)bossStep(lv,dt);
  lv.world.step(dt,10,6);
  crushCheck(dt);
  watchdog(dt);
  var pp=p.body.getPosition();
  if(!lv.finished&&!lv.out){
    if(!p.squash&&(inPit(pp.x,pp.y)||pp.y>9))loseLife('pit');
    lv.prizes.forEach(function(pz){if(pz.got)return;var dx=pz.x-pp.x,dy=pz.y-pp.y;if(dx*dx+dy*dy<0.85*0.85){pz.got=true;lv.got++;save.stats.prizes++;SND.sfx('pop',lv.got%8);
      burst(pz.x,pz.y,'spark',10,'#ffd75e');burst(pz.x,pz.y,'ring',1,'#bfeaff');floatText(pz.x,pz.y-0.5,'+1','#2f8fe0');setExpr(p,'joy',0.5);bumpHud()}});
    lv.cps.forEach(function(c,i){if(!lv.boss&&i>lv.cp&&Math.abs(pp.x-c.x)<0.9&&pp.y<c.y+0.3&&pp.y>c.y-2.5){lv.cp=i;c.on=true;SND.sfx('check');burst(c.x+0.3,c.y-1.6,'spark',10,'#7fe0c0');floatText(c.x,c.y-2.4,'Checkpoint!','#2f9e74');
      if(!lv.def.custom)save.resume={lvl:lv.def.id,cp:i,got:lv.prizes.filter(function(z){return z.got}).map(function(z){return z.id}),t:lv.t};persist()}});
    if(lv.exit){var dx=lv.exit.x-pp.x,dy=lv.exit.y-pp.y;if(dx*dx+dy*dy<1.35*1.35)finishLevel()}
    lv.t+=dt;save.stats.play+=dt;progStep(lv,dt);
    if(SND.setLift){var lk=0;if(lv.exit&&!lv.boss){var ed=Math.hypot(lv.exit.x-pp.x,lv.exit.y-pp.y);lk=Math.max(0,Math.min(1,1-(ed-3)/14))}if(((lv.liftN=(lv.liftN||0)+1)%6)===0)SND.setLift(lk)}}
  else if(lv.finished){lv.finishT+=dt;var e=lv.exit;p.shrink=Math.max(0,1-lv.finishT*1.4);var b=p.body;b.setTransform(V(pp.x+(e.x-pp.x)*Math.min(1,dt*6),pp.y+(e.y-pp.y)*Math.min(1,dt*6)),0);
    if(p.shrink<=0)p.hidden=true;if(lv.finishT>1.8&&!lv.endShown){lv.endShown=true;showEnd()}}
}
function bumpHud(){prizeCount.textContent=L.got;prizeCount.classList.add('bump');setTimeout(function(){prizeCount.classList.remove('bump')},160)}
function startLevel(id,resume){var def=stageDef(id)||LEVELS[0];if(def.boss||def.custom)resume=null;
  particles=[];floaters=[];L=newLevel(def);VQ.warm=Math.max(VQ.warm,1);
  var sp=L.spawn;var cpi=0;
  if(resume&&resume.lvl===id){cpi=Math.min(resume.cp,L.cps.length-1);L.cp=cpi;for(var i=0;i<=cpi;i++)L.cps[i].on=true;(resume.got||[]).forEach(function(gid){var z=L.prizes[gid];if(z){z.got=true;L.got++}});L.t=resume.t||0;
    var c=L.cps[cpi];sp={x:c.x,y:c.y-R-0.05}}
  player=makePlayer(L,sp.x,sp.y);progStart(L,resume);
  prizeTotal.textContent=L.prizes.length;prizeCount.textContent=L.got;livesHud();
  state='play';showScreen(null);hud.classList.remove('hidden');if(isTouch)touchUI.classList.remove('hidden');
  input.jumpQ=false;updateCamera(0,true);if(SND.setTrack)SND.setTrack(def.boss?'boss':'world',def.world||0);SND.startMusic();updateRotateTip(true);
  if(!def.custom&&(!resume||resume.lvl!==id)){save.resume=null;persist()}
  SND.setWorld(def.world||0);var wd=(typeof WORLDS!=='undefined')&&WORLDS[def.world||0];
  if(def.custom)toast('✏️ '+def.name+' · test play');else if(def.boss){var bi=BOSS_INFO[def.id];toast(bi.icon+' Boss: '+bi.name);setTimeout(function(){if(L&&L.def===def&&state==='play')toast(bi.blurb)},2200)}else toast((wd&&def.id>2?wd.name+' · ':'')+def.id+'. '+def.name)}
function isUnlocked(id){return stageUnlocked(id)}
function finishLevel(){var lv=L;if(lv.finished)return;lv.finished=true;lv.finishT=0;release(player,true);SND.sfx('finish');confetti(lv.exit.x,lv.exit.y,70);if(lv.def.finale){[0.5,1.1,1.7,2.3].forEach(function(dl,k){setTimeout(function(){if(L===lv){confetti(lv.exit.x+(k%2?-3:3),lv.exit.y-2-k*0.6,60);SND.sfx(k%2?'full':'pop',k*2)}},dl*1000)})}setExpr(player,'joy',3);
  var id=lv.def.id;if(lv.def.custom){var lvs=lv.lives==null?3:lv.lives;lv.crit={finish:true,prizes:lv.got>=Math.ceil(lv.prizes.length*STAR_PRIZE),par:lvs>=STAR_LIVES};lv.runStars=1+(lv.crit.prizes?1:0)+(lv.crit.par?1:0);lv.earned=0;save.stats.finishes++;return}
  var b=save.best[id]||{};var total=lv.prizes.length;lv.newBest=!b.time||lv.t<b.time;
  save.best[id]={time:lv.newBest?lv.t:b.time,prizes:Math.max(b.prizes||0,lv.got),total:total,done:true};
  save.stats.finishes++;save.resume=null;progFinish(lv)}
function showEnd(){var lv=L,id=lv.def.id,b=save.best[id];state='end';hud.classList.add('hidden');touchUI.classList.add('hidden');if(lv.def.custom){showEndCustom(lv);return}
  document.getElementById('endTitle').textContent=lv.def.boss?BOSS_INFO[id].short+' is happy again!':lv.def.name+' complete!';
  document.getElementById('endPrizes').textContent=lv.got+' / '+lv.prizes.length;document.getElementById('endTime').textContent=fmt(lv.t);
  document.getElementById('endBest').textContent=b&&b.time?fmt(b.time):'-';
  var stars=lv.runStars||1,cr=lv.crit||{finish:true};
  document.getElementById('endCrit').innerHTML='<li class="ok">★ Finished</li><li class="'+(cr.prizes?'ok':'')+'">★ Prizes '+lv.got+'/'+lv.prizes.length+' (need '+Math.ceil(lv.prizes.length*STAR_PRIZE)+')</li><li class="'+(cr.par?'ok':'')+'">★ Par '+fmt(parOf(id))+' with 2+ lives'+(cr.par?'':' · you: '+fmt(lv.t)+', '+(lv.lives==null?3:lv.lives)+' left')+'</li>';
  document.getElementById('endPar').textContent=fmt(parOf(id));document.getElementById('endEarn').textContent='+'+(lv.earned||0)+' 🫧 (wallet '+save.wallet+')';
  var gr=lv.ghostRes,ge=document.getElementById('endGhost');ge.classList.toggle('hidden',!lv.tt);if(lv.tt)ge.textContent=!gr?'Time trial: no ghost saved (started from a checkpoint)':gr.beat?'👻 Ghost beaten by '+gr.by.toFixed(1)+'s! New ghost saved.':gr.behind!==undefined?'👻 Ghost wins by '+gr.behind.toFixed(1)+'s. Try again!':'👻 First time-trial run saved as your ghost!';
  var se=document.getElementById('endStars');se.innerHTML='<span class="st">★</span><span class="st">★</span><span class="st">★</span>';
  for(var i=0;i<stars;i++)(function(i){setTimeout(function(){se.children[i].classList.add('on');SND.sfx('pop',i*2)},350+i*280)})(i);
  var note=lv.newBest?'New best time!':'';if(lv.got===lv.prizes.length)note=(note?note+' ':'')+'Every prize bubble popped!';if(stars===3)note=(note?note+' ':'')+'Three stars!';if(lv.reward)note=(lv.reward.fresh?'🎩 New hat won: '+lv.reward.name+'! Wear it in the Wardrobe. ':'🏆 Boss beaten again! ')+note;
  document.getElementById('endNote').textContent=note;
  var ec=document.getElementById('endingCard'),last=LEVELS[LEVELS.length-1].id===id;if(ec){if(last){var tt=levelTotals();document.getElementById('ecText').textContent=(tt.done===LEVELS.length?'Bobbin sewed up all '+LEVELS.length+' boxes!':'You reached the very last box!')+' Levels '+tt.done+'/'+LEVELS.length+' · Prizes '+tt.prizes+'/'+tt.total+' · Total best time '+fmt(tt.time);ec.classList.remove('hidden')}else ec.classList.add('hidden')}
  var nx=document.getElementById('nextBtn');var nxi=nextStage(id),nxt=nxi&&stageDef(nxi);nx.textContent=nxt?(nxt.boss?'Boss: '+BOSS_INFO[nxi].short:'Next level'):'Back to start';
  showScreen('end')}
function showEndCustom(lv){document.getElementById('endTitle').textContent=lv.def.name+' complete!';document.getElementById('endPrizes').textContent=lv.got+' / '+lv.prizes.length;document.getElementById('endTime').textContent=fmt(lv.t);document.getElementById('endBest').textContent='-';
  var cr=lv.crit;document.getElementById('endCrit').innerHTML='<li class="ok">★ Finished</li><li class="'+(cr.prizes?'ok':'')+'">★ Prizes '+lv.got+'/'+lv.prizes.length+'</li><li class="'+(cr.par?'ok':'')+'">★ 2+ lives left</li>';
  document.getElementById('endPar').textContent='-';document.getElementById('endEarn').textContent='Your own level';document.getElementById('endGhost').classList.add('hidden');var ec=document.getElementById('endingCard');if(ec)ec.classList.add('hidden');
  var se=document.getElementById('endStars');se.innerHTML='<span class="st">★</span><span class="st">★</span><span class="st">★</span>';for(var i=0;i<lv.runStars;i++)se.children[i].classList.add('on');
  document.getElementById('endNote').textContent='Test play done! Share it from the editor with the Share button.';document.getElementById('nextBtn').textContent='Back to editor';showScreen('end')}
function pauseGame(){if(state!=='play')return;state='paused';showScreen('pause');release(player,true);persist()}
function resumeGame(){if(state!=='paused')return;state='play';showScreen(null);input.jumpQ=false}
function toCheckpoint(){if(!L)return;respawnPlayer();resumeGame()}
/* ---------------- UI ---------------- */
var screens=['title','levels','costume','stats','settings','pause','end','outLives','map','creator'];
function showScreen(n){screens.forEach(function(s){document.getElementById(s).classList.toggle('hidden',s!==n)});
  if(n==='levels')buildLevelCards();if(n==='stats')buildStats();if(n==='costume')buildWardrobe();if(n==='title')document.getElementById('playBtn').textContent=save.resume?'Continue':'Play'}
var toastEl=document.getElementById('toast'),toastT=null;
function toast(t){toastEl.textContent=t;toastEl.classList.add('show');clearTimeout(toastT);toastT=setTimeout(function(){toastEl.classList.remove('show')},1800)}
function goTitle(){if(SND.setTrack){SND.setTrack('map');if(SND.ctx())SND.startMusic()}state='title';hud.classList.add('hidden');touchUI.classList.add('hidden');makeShowroom();showScreen('title')}
function makeShowroom(){L=newLevel(LEVELS[0]);player=makePlayer(L,5.2,-0.6);particles=[];floaters=[];camZoom=1;updateCamera(0,true)}
function on(id,fn){document.getElementById(id).addEventListener('click',function(e){SND.unlock();SND.sfx('tap');fn(e)})}
on('playBtn',function(){if(save.resume&&!isBossId(save.resume.lvl)&&isUnlocked(save.resume.lvl))startLevel(save.resume.lvl,save.resume);else{var first=allStages().filter(function(d){return !(save.best[d.id]&&save.best[d.id].done)&&stageUnlocked(d.id)})[0]||LEVELS[0];startLevel(first.id)}});
on('levelsBtn',function(){openMap()});
on('costumeBtn',function(){state='costume';camZoom=portrait?1.5:1.9;showScreen('costume')});
on('statsBtn',function(){showScreen('stats')});
on('settingsBtn',function(){showScreen('settings')});
document.querySelectorAll('[data-go]').forEach(function(b){b.addEventListener('click',function(){SND.unlock();SND.sfx('tap');if(state==='costume'){state='title';camZoom=1;WARD.confirm=null}showScreen(b.getAttribute('data-go'))})});
on('pauseBtn',function(){pauseGame()});
on('resumeBtn',function(){resumeGame()});
on('cpBtn',function(){toCheckpoint()});
on('resetPiecesBtn',function(){resetPieces();resumeGame()});
on('restartBtn',function(){startLevel(L.def.id)});
on('quitBtn',function(){if(L&&L.def.custom){openCreator();return}goTitle();openMap()});
on('nextBtn',function(){if(L&&L.def.custom){openCreator();return}var nxi=nextStage(L.def.id);if(nxi&&stageUnlocked(nxi))startLevel(nxi);else if(nxi){goTitle();openMap(true)}else goTitle()});
on('replayBtn',function(){startLevel(L.def.id)});
on('retryBtn',function(){startLevel(L.def.id)});
on('outLevelsBtn',function(){if(L&&L.def.custom){openCreator();return}goTitle();openMap()});
on('endLevelsBtn',function(){if(L&&L.def.custom){openCreator();return}goTitle();openMap(true)});
on('mapBack',function(){goTitle()});
on('mapList',function(){goTitle();showScreen('levels')});
on('mapStick',function(){var t=document.getElementById('stickTray');t.classList.toggle('hidden');if(!t.classList.contains('hidden'))buildTray()});
on('trayClose',function(){document.getElementById('stickTray').classList.add('hidden')});
on('lpClose',function(){mapPopClose()});
on('lpPlay',function(){var id=+document.getElementById('lvPop').getAttribute('data-lv');mapPopClose();if(save.resume&&save.resume.lvl===id&&!save.tt[id])startLevel(id,save.resume);else startLevel(id)});
document.getElementById('lpTT').addEventListener('change',function(e){var id=+document.getElementById('lvPop').getAttribute('data-lv');SND.unlock();SND.sfx('tap');if(e.target.checked)save.tt[id]=1;else delete save.tt[id];persist();var nd=document.querySelector('.mNode[data-lv="'+id+'"]');if(nd)nd.classList.toggle('ttOn',!!save.tt[id])});
document.querySelectorAll('#wardTabs button').forEach(function(b){b.addEventListener('click',function(){SND.unlock();SND.sfx('tap');WARD.tab=b.getAttribute('data-tab');WARD.confirm=null;buildWardrobe()})});
window.addEventListener('resize',function(){if(state==='map'&&MAP.built){var sc=document.getElementById('mapScroll'),cx=(sc.scrollLeft+sc.clientWidth/2)/MAP.k;mapBuild();sc.scrollLeft=cx*MAP.k-sc.clientWidth/2}});
on('rotateOk',function(){document.getElementById('rotateTip').classList.add('hidden');save.rotDismiss=true;persist()});
var rotShownAt=0;
function updateRotateTip(fresh){var el=document.getElementById('rotateTip');var show=portrait&&isTouch&&state==='play'&&!save.rotDismiss;
  if(show&&fresh){rotShownAt=performance.now();el.classList.remove('hidden')}else if(!show)el.classList.add('hidden')}
function levelTotals(){var t={done:0,prizes:0,total:0,stars:0,time:0,all:true,bosses:0,starMax:allStages().length*3};LEVELS.forEach(function(d){var b=save.best[d.id];if(b&&b.done){t.done++;t.prizes+=b.prizes||0;t.stars+=starsFor(d.id);t.time+=b.time||0}else t.all=false;t.total+=(b&&b.total)||0});
  BOSSES.forEach(function(d){if(stageDone(d.id)){t.bosses++;t.stars+=starsFor(d.id)}});return t}
function buildLevelCards(){var host=document.getElementById('levelCards');host.innerHTML='';var tot=levelTotals();
  document.getElementById('levelTotals').innerHTML='<span>Levels <b>'+tot.done+'/'+LEVELS.length+'</b></span><span>Prizes <b>'+tot.prizes+'</b></span><span>Bosses <b>'+tot.bosses+'/'+BOSSES.length+'</b></span><span>Stars <b>'+tot.stars+'/'+tot.starMax+'</b></span><span>Total best time <b>'+(tot.done?fmt(tot.time):'-')+'</b></span>';
  var worlds=(typeof WORLDS!=='undefined')?WORLDS:[{id:0,name:'Levels',col:'#ffad5c'}];var pv=[];
  worlds.forEach(function(wd){var lv=LEVELS.filter(function(d){return (d.world||0)===wd.id});if(!lv.length)return;var bo=BOSS_OF_WORLD[wd.id]&&stageDef(BOSS_OF_WORLD[wd.id]);var done=lv.filter(function(d){return save.best[d.id]&&save.best[d.id].done}).length;
    var sec=document.createElement('div');sec.className='world';sec.style.setProperty('--wc',wd.col);
    sec.innerHTML='<div class="wHead"><canvas width="240" height="120"></canvas><div><h3>'+wd.name+'</h3><p>'+(wd.blurb||'')+'</p><p class="wDone">'+done+' / '+lv.length+' done</p></div></div><div class="wLevels"></div>';
    var grid=sec.querySelector('.wLevels');
    lv.forEach(function(d){var b=save.best[d.id],un=isUnlocked(d.id),st=starsFor(d.id);var el=document.createElement('button');el.className='lvTile'+(un?'':' locked')+(b&&b.done?' done':'');
      el.innerHTML='<span class="num">'+d.id+'</span><span class="nm">'+d.name+'</span>'+(un?(b&&b.done?'<span class="info">'+fmt(b.time)+' · '+b.prizes+'/'+b.total+'</span><span class="stars">'+'★★★'.slice(0,st)+'<i>'+'★★★'.slice(st)+'</i></span>':'<span class="info new">New!</span>'):'<span class="info">🔒 Finish '+(d.id-1)+' first</span>');
      el.setAttribute('data-lv',d.id);
      el.addEventListener('click',function(){SND.unlock();if(!isUnlocked(d.id)){SND.sfx('unswitch');toast(lockMsg(d.id));return}SND.sfx('tap');startLevel(d.id)});grid.appendChild(el)});
    if(bo){var bi=BOSS_INFO[bo.id],bb=save.best[bo.id],bun=stageUnlocked(bo.id),bst=starsFor(bo.id);var be=document.createElement('button');be.className='lvTile bossTile'+(bun?'':' locked')+(bb&&bb.done?' done':'');be.setAttribute('data-lv',bo.id);
      be.innerHTML='<span class="num">'+(bun?bi.icon:'🔒')+'</span><span class="nm">Boss: '+bi.short+'</span>'+(bun?(bb&&bb.done?'<span class="info">'+fmt(bb.time)+' · 🎩 won</span><span class="stars">'+'★★★'.slice(0,bst)+'<i>'+'★★★'.slice(bst)+'</i></span>':'<span class="info new">Boss!</span>'):'<span class="info">🔒 '+lockMsg(bo.id)+'</span>');
      be.addEventListener('click',function(){SND.unlock();if(!stageUnlocked(bo.id)){SND.sfx('unswitch');toast(lockMsg(bo.id));return}SND.sfx('tap');startLevel(bo.id)});grid.appendChild(be)}
    host.appendChild(sec);pv.push([sec.querySelector('canvas'),lv[0]])});
  var k=0;(function next(){if(k>=pv.length||state!=='title')return;var it=pv[k++];try{var cg=it[0].getContext('2d');var lv2=newLevel(it[1]);var r=lv2.route&&lv2.route[1];var sx=it[1].id===1?27:it[1].id===2?31:(r?(r.x0||r.edge||r.btn||r.tower||r.pad||r.wall||20)+3:20);
      renderScene(cg,240,120,1,12,sx,-3.2,lv2,null,1,{noSigns:true,noVig:true})}catch(e){}setTimeout(next,30)})()}
function buildStats(){var s=save.stats,h=document.getElementById('statsList');var rows=[['Time played',fmt(s.play)],['Levels finished',s.finishes],['Prize bubbles popped',s.prizes],['Jumps',s.jumps],['Grabs',s.grabs],['Boings',s.boings],
  ['Levers pulled',s.levers],['Switches flipped',s.switches],['Soft respawns',s.respawns],['Lives lost',s.deaths||0],['Squishes',s.squashes||0],['Distance waddled',Math.round(s.dist)+' m']];
  var tot=levelTotals();rows.push(['Levels done',tot.done+' / '+LEVELS.length],['Bosses befriended',tot.bosses+' / '+BOSSES.length],['Stars',tot.stars+' / '+tot.starMax],['Best-run prizes',tot.prizes]);
  if(typeof WORLDS!=='undefined')WORLDS.forEach(function(wd){var lv=LEVELS.filter(function(d){return (d.world||0)===wd.id}),dn=0,tt=0;lv.forEach(function(d){var b=save.best[d.id];if(b&&b.done){dn++;tt+=b.time}});rows.push([wd.name,dn+'/'+lv.length+(dn?' · '+fmt(tt):'')])});
  h.innerHTML=rows.map(function(r){return '<span>'+r[0]+'</span><b>'+r[1]+'</b>'}).join('')}
function buildSwatches(){var h=document.getElementById('swatches');h.innerHTML='';COSTUMES.forEach(function(c,i){var b=document.createElement('button');b.className='sw'+(i===save.costume?' on':'');b.style.background=c[1];b.innerHTML='<span>'+c[0]+'</span>';
  b.addEventListener('click',function(){SND.unlock();save.costume=i;persist();SND.sfx('pop',i);buildSwatches();if(player){player.sy=1.3;player.sx=0.8;setExpr(player,'joy',0.8);var pp=player.body.getPosition();burst(pp.x,pp.y,'spark',10,c[1])}});h.appendChild(b)})}
function buildSliders(){document.querySelectorAll('.sliders').forEach(function(host){host.innerHTML='';
  [['music','Music',0,1,0.05],['sfx','Sounds',0,1,0.05],['bright','Brightness',0.7,1.3,0.05]].forEach(function(d){var row=document.createElement('label');row.className='sl';
    row.innerHTML='<span>'+d[1]+'</span><input type="range" min="'+d[2]+'" max="'+d[3]+'" step="'+d[4]+'" data-k="'+d[0]+'"><output></output>';host.appendChild(row)})});
  document.querySelectorAll('.sliders input').forEach(function(inp){inp.value=save[inp.dataset.k];inp.addEventListener('input',function(){var k=inp.dataset.k,v=parseFloat(inp.value);save[k]=v;applySettings();
    document.querySelectorAll('.sliders input[data-k="'+k+'"]').forEach(function(o){if(o!==inp)o.value=v});persist();if(k==='sfx'){SND.unlock();SND.sfx('pop',3)}})});applySettings()}
function applySettings(){SND.setVol('music',save.music);SND.setVol('sfx',save.sfx);cv.style.filter=Math.abs(save.bright-1)<0.01?'':'brightness('+save.bright+')';
  document.querySelectorAll('.sliders input').forEach(function(inp){var k=inp.dataset.k,v=save[k];inp.parentNode.querySelector('output').textContent=k==='bright'?Math.round(v*100)+'%':v<=0.001?'Off':Math.round(v*100)+'%'})}
/* ---------------- main loop ---------------- */
var last=performance.now(),acc=0,saveT=0,fpsA=[];
function frame(now){requestAnimationFrame(frame);var dt=Math.min(0.1,(now-last)/1000);last=now;clock+=dt;fpsA.push(dt);if(fpsA.length>120)fpsA.shift();
  if(!L)return;
  if(state==='play'||state==='end'||(state==='title'||state==='costume')){acc+=dt*(window.__bobSpeed||1);var n=0;while(acc>=STEP&&n<14){if(state==='play'||state==='end')stepGame(STEP);else idleStep(STEP);acc-=STEP;n++}if(n>=14)acc=0}
  updateParticles(dt);
  if(state==='play'){timeHud.textContent=fmt(L.t);saveT+=dt;if(saveT>10){saveT=0;persist()}
    if(rotShownAt&&performance.now()-rotShownAt>7000){rotShownAt=0;document.getElementById('rotateTip').classList.add('hidden')}}
  if(state==='edit'){try{edFrame(dt)}catch(e){CR.err=String(e&&e.message||e)}return}
  if(state==='map'){mapTick(dt);return}
  updateCamera(dt);var sh=cam.sh>0?cam.sh:0;cam.sh=Math.max(0,cam.sh-dt*1.2);
  var s=S*camZoom,r0=performance.now();renderScene(g,W,H,DPR,s,cam.x+(Math.random()-0.5)*sh,cam.y+(Math.random()-0.5)*sh,L,player,clock,{cache:Math.abs(camZoom-1)<1e-3&&!Q.get('nocache')});if(L.boss&&(state==='play'||state==='paused')){g.setTransform(DPR,0,0,DPR,0,0);bossHud(g,W,H,L)}vqTick(dt,performance.now()-r0)}
function idleStep(dt){var p=player;input.jumpQ=false;var saved={x:input.x,jump:input.jump,grab:input.grab};input.x=0;input.jump=false;input.grab=false;updatePlayer(p,dt);input.x=saved.x;input.jump=saved.jump;input.grab=saved.grab;updateDevices(dt);L.world.step(dt,8,3);
  if(Math.random()<dt*0.25&&p.grounded){p.body.setLinearVelocity(V(0,-7));p.sy=1.2;p.sx=0.85}}
document.addEventListener('visibilitychange',function(){if(document.hidden){persist();if(state==='play')pauseGame()}});
window.addEventListener('pagehide',persist);
/* ---------------- boot ---------------- */
document.body.classList.toggle('touch',isTouch);
window.addEventListener('pointerdown',function(e){if(e.pointerType==='touch'&&!isTouch){isTouch=true;document.body.classList.add('touch');if(state==='play')touchUI.classList.remove('hidden')}},true);
resize();GFX.init(g);progInit();buildSliders();
if(Q.get('icon')||Q.get('card')){renderArt()}else{goTitle();requestAnimationFrame(frame)}
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')&&!Q.get('nosw')){navigator.serviceWorker.register('sw.js').catch(function(){})}
function renderArt(){document.querySelectorAll('.screen,#hud,#touch').forEach(function(e){e.classList.add('hidden')});
  var isIcon=!!Q.get('icon');var w=isIcon?512:800,h=isIcon?512:450;cv.style.width=w+'px';cv.style.height=h+'px';cv.style.inset='auto';cv.width=w;cv.height=h;
  var lv=newLevel(LEVELS[isIcon?0:1]);var col=COSTUMES[parseInt(Q.get('c')||'0',10)%COSTUMES.length][1];
  if(isIcon){var sky=g.createRadialGradient(256,230,40,256,256,380);sky.addColorStop(0,'#fff6dc');sky.addColorStop(1,'#ffc98a');g.fillStyle=sky;g.fillRect(0,0,512,512);
    g.setTransform(215,0,0,215,256,300);g.fillStyle='rgba(120,70,30,0.18)';g.beginPath();g.ellipse(0,0.55,0.55,0.1,0,0,7);g.fill();
    GFX.drawBobbin(g,{x:0,y:-0.05,r:0.5,col:col,face:1,expr:'joy',tuft:-0.4,sx:1,sy:1});
    g.setTransform(1,0,0,1,0,0);for(var i=0;i<5;i++){var a=-2.6+i*0.55;GFX.bubble?0:0}
    g.setTransform(60,0,0,60,0,0);GFX.bubble(g,1.3,1.5,0.45,1,0);GFX.bubble(g,7.2,1.8,0.38,2,2);GFX.bubble(g,6.9,6.9,0.3,3,1);
  }else{var pl2={body:{getPosition:function(){return V(66.6,-4.6)},getLinearVelocity:function(){return V(0,0)}},sx:1,sy:1,face:1,run:0,grounded:true,expr:'joy',tuft:-0.3,idle:0,inv:0,blink:0};
    player=null;renderScene(g,w,h,1,44,66.4,-6.0,lv,null,2,{noSigns:true,noVig:false});
    g.setTransform(44,0,0,44,w/2-66.4*44,h/2+6.0*44);GFX.drawBobbin(g,{x:64.6,y:-4.5,r:0.5,col:col,face:1,expr:'joy',tuft:-0.4,sx:1,sy:1});
    g.setTransform(1,0,0,1,0,0);g.textAlign='left';g.save();g.translate(30,36);g.rotate(-0.03);g.fillStyle='#ffd23f';GFX.rr(g,0,0,250,50,14);g.fill();g.fillStyle='#5a3a28';g.font='bold 34px '+FONT;g.textBaseline='middle';g.fillText("Bobbin's",22,27);g.restore();
    g.save();g.translate(30,94);g.font='bold 64px '+FONT;g.lineWidth=10;g.strokeStyle='#5a3a28';g.lineJoin='round';g.strokeText('Button Box',0,40);g.fillStyle='#fff';g.fillText('Button Box',0,40);g.restore()}
  document.title='art-ready'}
/* ---------------- test hook ---------------- */
window.__bob={
  info:function(){if(!L||!player)return null;var p=player.body.getPosition(),v=player.body.getLinearVelocity();
    return {state:state,lvl:L.def.id,x:p.x,y:p.y,vx:v.x,vy:v.y,grounded:player.grounded,grab:player.grab?player.grab.mode:null,grabName:player.grab&&player.grab.ud.obj?player.grab.ud.obj.name:player.grab?player.grab.ud.type:null,
      cand:player.cand?(player.cand.ud.obj?player.cand.ud.obj.name:player.cand.ud.type):null,cp:L.cp,got:L.got,total:L.prizes.length,t:L.t,finished:L.finished,signals:JSON.parse(JSON.stringify(L.signals)),
      objs:L.objs.map(function(o){var q=o.body.getPosition(),vv=o.body.getLinearVelocity();return {name:o.name,x:q.x,y:q.y,vx:vv.x,vy:vv.y,m:o.body.getMass()}}),
      seesaw:L.seesaws.map(function(s){return {a:s.body.getAngle(),w:s.body.getAngularVelocity(),wmax:s.wmax}}),launches:L.launches||0,respawns:save.stats.respawns,lives:L.lives,deaths:L.deaths,deathLog:L.deathLog,crushPk:L.crushPk,crushPk2:L.crushPk2||null,polN:L.politeN||0,squash:player.squash?player.squash.by:null,out:!!L.out,
      prizes:L.prizes.filter(function(z){return !z.got}).map(function(z){return [z.x,z.y]}),music:SND.vol.music,sfx:SND.vol.sfx,musicGain:SND.musicGain(),fps:fpsA.length?fpsA.length/fpsA.reduce(function(a,b){return a+b},0):0}},
  save:function(){return JSON.parse(localStorage.getItem(SKEY)||'null')},
  start:function(id){startLevel(id)},
  route:function(){return L?JSON.parse(JSON.stringify(L.route)):null},
  info2:function(){if(!L)return null;var pg=player.groundBody;return {on:pg&&pg.getUserData()&&pg.getUserData().mover?pg.getUserData().mover.name:null,
    movers:L.movers.map(function(m){var p=m.body.getPosition();return {name:m.name,x:p.x,y:p.y-m.h/2,s:m.s,total:m.total,dir:m.dir,waitT:m.waitT}}),
    zips:L.zips.map(function(z){return {name:z.name,t:z.joint.getJointTranslation(),max:z.len-1.1,held:z.held}}),
    buttons:L.buttons.map(function(b){return {sig:b.sig,pressed:b.pressed,timer:b.timer,mode:b.mode}}),
    cans:L.cans.map(function(c){var a=c.lever.body.getAngle(),sp=c.lever.body.getWorldPoint(V(0,-1.4));return {a:a,pour:c.pour,sx:sp.x,sy:sp.y}}),pots2:L.pots.map(function(p){return {fill:p.fill,x:p.planter?p.x+p.w/2:p.body.getPosition().x,top:p.planter?p.y-p.h:0}}),toys:L.toys.map(function(o){return {name:o.name,active:o.toy.active,dir:o.toy.dir,aw:o.body.isAwake(),type:o.body.getType()}}),pulleys:L.pulleys.map(function(p){return {name:p.name,d:p.d,mA:p.mA,mB:p.mB}}),magnets:L.magnets.map(function(m){var p=m.body.getPosition();return {name:m.name,x:p.x,on:m.on}}),
    wheels:L.wheels.map(function(w){return {name:w.name,a:w.a,seats:w.seats.map(function(s){var p=s.getPosition();return [p.x,p.y-0.2]})}}),pots:L.pots.map(function(p){return {fill:p.fill,full:p.full}}),cp:L.cp,cps:L.cps.length,w:L.w}},
  cpRespawn:function(){respawnPlayer()},
  lively:function(){return player?{ex:+(player.eyeX||0).toFixed(2),ey:+(player.eyeY||0).toFixed(2),br:+(player.breath||0).toFixed(3),hop:+(player.hopY||0).toFixed(3),wob:+(player.wob||0).toFixed(3),expr:player.expr,idle:+(player.idle||0).toFixed(1),sx:+player.sx.toFixed(2),sy:+player.sy.toFixed(2)}:null},
  cpAudit:function(l){startLevel(l);return {w:L.w,cps:L.cps.map(function(c){var a=cpClear(L,c,-1),b=cpClear(L,c,1);return [c.x,c.y,a.d,b.d]}),log:L.cpLog}},
  grace:function(){return player?{grace:+(player.grace||0).toFixed(2),held:player.gHeld||null}:null},
  prog:function(){return {wallet:save.wallet,ward:save.ward,own:save.own,stars:save.stars,tt:save.tt,stickers:save.stickers,stickInv:save.stickInv,mapAt:save.mapAt,starsFor:LEVELS.map(function(d){return starsFor(d.id)})}},
  setSave:function(o){for(var k in o)save[k]=o[k];progInit();persist()},
  runStars:function(id,got,total,t,lives){return {stars:runStars(id,got,total,t,lives),crit:starCrit(id,got,total,t,lives),par:parOf(id)}},
  grabPrizes:function(n){var k=0;L.prizes.forEach(function(z){if(!z.got&&k<n){z.got=true;L.got++;k++}});prizeCount.textContent=L.got;return L.got},
  slowFinish:function(t){if(L&&!L.finished){L.t=t;finishLevel()}},
  finishNow:function(){if(L&&!L.finished)finishLevel()},
  lvState:function(){return L?{tt:!!L.tt,rec:L.rec?{n:L.rec.n,len:L.rec.s.length}:null,ghost:L.ghost?{t:L.ghost.t,n:L.ghost.xs.length}:null,runStars:L.runStars||null,crit:L.crit||null,earned:L.earned||0,ghostRes:L.ghostRes||null,lives:L.lives,t:L.t}:null},
  ghostRaw:function(id){return localStorage.getItem(GKEY+id)},
  ghostPosAt:function(t){var G=L&&L.ghost;if(!G)return null;var f=Math.max(0,t-G.t0)*G.hz,i=Math.min(G.xs.length-2,Math.floor(f)),k=Math.min(1,f-i);if(Math.abs(G.xs[i+1]-G.xs[i])+Math.abs(G.ys[i+1]-G.ys[i])>1.5)k=k<0.5?0:1;return [G.xs[i]+(G.xs[i+1]-G.xs[i])*k,G.ys[i]+(G.ys[i+1]-G.ys[i])*k]},
  ghostAt:function(){var G=L&&L.ghost;if(!G)return null;var i=Math.min(G.xs.length-1,Math.floor(Math.max(0,L.t-G.t0)*G.hz));return [G.xs[i],G.ys[i]]},
  map:function(){var sc=document.getElementById('mapScroll');return {state:state,k:MAP.k,W:MAP.W,nodes:Array.prototype.map.call(document.querySelectorAll('.mNode'),function(e){var r=e.getBoundingClientRect();return {lv:+e.getAttribute('data-lv'),cls:e.className,x:r.left+r.width/2,y:r.top+r.height/2,w:r.width}}),bob:{s:MAP.bob.s,walking:MAP.bob.to!==null,at:save.mapAt},scroll:[sc.scrollLeft,sc.scrollTop,sc.scrollWidth,sc.scrollHeight,sc.clientWidth,sc.clientHeight],stickers:document.querySelectorAll('.mSticker').length,pop:!document.getElementById('lvPop').classList.contains('hidden')}},
  farX:function(type,dflt){if(!type)return dflt;var w=L.def.w,c=L.bg.far.filter(function(it){return it.t===type&&it.x/0.25>12&&it.x/0.25<w-12}).map(function(it){return it.x/0.25-3})[0];return c===undefined?dflt:c},
  drop:function(x,y,w,h,d,kind,vy){var o=L.B.box('drop'+L.objs.length,x,y,w,h,{density:d,kind:kind||'card'});o.zone=null;if(vy)o.body.setLinearVelocity(V(0,vy));return +o.body.getMass().toFixed(2)},
  moveObj:function(n,x,y){var o=L.objs.filter(function(q){return q.name===n})[0];o.body.setTransform(V(x,y),0);o.body.setLinearVelocity(V(0,0));o.body.setAwake(true)},
  warp:function(x,y){player.body.setTransform(V(x,y),0);player.body.setLinearVelocity(V(0,0))}
};
/* v1.4 boss test hook */
window.__bob.nearExit=function(){if(L&&L.exit){player.body.setTransform(V(L.exit.x-4,L.exit.y-0.2),0)}};
window.__bob.bossWin=function(){if(L&&L.boss&&!L.boss.won){L.boss.hp=0;bossWin(L,L.boss)}};window.__bob.toExit=function(){if(L&&L.exit){player.body.setTransform(V(L.exit.x,L.exit.y),0);player.body.setLinearVelocity(V(0,0))}};
window.__bob.cr={CR:CR,set:crSet,enc:crEncode,dec:crDecode,def:crDef,test:crTest,open:openCreator,place:crPlace,act:crAct,undo:crUndo,load:crLoad,box:edBox,world2px:function(x,y){var s=S*CR.zoom;return [W/2+(x-CR.cx)*s,H/2+(y-CR.cy)*s]}};
__bob.boss=function(){var B=L&&L.boss;if(!B)return null;return {id:B.id,kind:B.kind,state:B.state,st:+B.st.toFixed(2),x:+B.x.toFixed(2),y:B.y,w:B.w,h:B.h,dir:B.dir,face:B.face,v:B.P?B.P.v:0,hp:B.hp,phase:B.phase,atkT:+B.atkT.toFixed(2),calm:+B.calm.toFixed(2),won:B.won,
  shots:B.shots.map(function(s){return {k:s.k,x:+s.x.toFixed(2),y:+s.y.toFixed(2),tx:s.tx,t:s.t,T:s.T,vx:s.vx,blown:!!s.blown}}),hits:B.hits,log:B.log,extra:B.K.info?B.K.info(L,B):null,exit:L.exit?{x:L.exit.x,y:L.exit.y}:null,t:L.t}};
})();
