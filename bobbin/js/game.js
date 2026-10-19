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
    block:function(x,y,w,h,o){o=o||{};var s={x:x,y:y,w:w,h:h,mat:o.mat||'card',topCol:o.topCol,col:o.col,tape:o.tape};lv.solids.push(s);addRect(x,y,w,h)},
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
function respawnObj(o,pos){var p=o.body.getPosition();burst(p.x,p.y,'fluff',10,'#fff3df');if(player.grab&&player.grab.body===o.body)release(player,true);
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
  // exit
  if(lv.exit)drawExit(g,lv.exit,t,lv);
  // player
  // falling-object shadows (telegraph drops)
  if(CQ&&CQ.cshadow)vObjShadows(g,lv,wl,wr);else if(lv.objs)lv.objs.forEach(function(o){var b=o.body;if(b.getType()!=='dynamic')return;var v=b.getLinearVelocity();if(v.y<1.2)return;var q=b.getPosition(),hy=null;
    lv.world.rayCast(V(q.x,q.y+0.3),V(q.x,q.y+12),function(f,pt,n,fr){if(f.isSensor()||f.getBody()===b)return -1;var u=f.getUserData();if(u&&(u.type==='player'||u.type==='hand'))return -1;hy=pt.y;return fr});
    if(hy===null)return;var d=hy-q.y;if(d<0.7)return;var k=Math.max(0,1-d/12),w=(o.w||o.r*2||1)*0.5*(0.55+0.45*k);g.fillStyle='rgba(70,40,20,'+(0.12+0.28*k)+')';g.beginPath();g.ellipse(q.x,hy-0.02,Math.max(0.25,w),0.1+0.05*k,0,0,7);g.fill()});
  if(plr&&!plr.hidden){var pp=plr.body.getPosition();
    // shadow via raycast
    var gy=null;lv.world.rayCast(V(pp.x,pp.y),V(pp.x,pp.y+8),function(f,pt,n,fr){var u=f.getUserData();if(f.isSensor()||(u&&(u.type==='player'||u.type==='hand')))return -1;gy=pt.y;return fr});
    if(gy!==null){var dd=gy-pp.y-R,a=Math.max(0,0.25-dd*0.04),sw=0.45*Math.max(0.4,1-dd*0.08);if(CQ&&CQ.cshadow)vContactShadow(g,pp.x,gy,sw*1.25,a*2.1);else{g.fillStyle='rgba(90,55,25,'+a+')';g.beginPath();g.ellipse(pp.x,gy-0.02,sw,0.09,0,0,7);g.fill()}}
    if(plr.inv>0&&Math.floor(t*14)%2===0)g.globalAlpha=0.55;
    var gr=plr.grab,gv=null;if(gr){var an=gr.body.getWorldPoint(gr.local);gv=[an.x-pp.x,an.y-pp.y]}
    var br=plr.squash?0:(plr.breath||0),wb=plr.squash?0:(plr.wob||0)*Math.sin((plr.wobT||0)*26);GFX.drawBobbin(g,{x:pp.x,y:pp.y+(plr.squash?0:(plr.hopY||0)),r:R,sx:plr.sx*(plr.shrink||1)*(1-br*0.6),sy:plr.sy*(plr.shrink||1)*(1+br),eyeX:plr.eyeX||0,eyeY:plr.eyeY||0,face:plr.face,run:plr.run,air:!plr.grounded,col:COSTUMES[save.costume%COSTUMES.length][1],grab:gv,
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
  if(state==='title'){tx=pp.x-(portrait?0:vw*0.36);ty=pp.y-(portrait?vh*0.36:vh*0.18)}
  if(state==='costume'){tx=pp.x;ty=pp.y+vh*0.22}
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
  lv.world.step(dt,10,6);
  crushCheck(dt);
  watchdog(dt);
  var pp=p.body.getPosition();
  if(!lv.finished&&!lv.out){
    if(!p.squash&&(inPit(pp.x,pp.y)||pp.y>9))loseLife('pit');
    lv.prizes.forEach(function(pz){if(pz.got)return;var dx=pz.x-pp.x,dy=pz.y-pp.y;if(dx*dx+dy*dy<0.85*0.85){pz.got=true;lv.got++;save.stats.prizes++;SND.sfx('pop',lv.got%8);
      burst(pz.x,pz.y,'spark',10,'#ffd75e');burst(pz.x,pz.y,'ring',1,'#bfeaff');floatText(pz.x,pz.y-0.5,'+1','#2f8fe0');setExpr(p,'joy',0.5);bumpHud()}});
    lv.cps.forEach(function(c,i){if(i>lv.cp&&Math.abs(pp.x-c.x)<0.9&&pp.y<c.y+0.3&&pp.y>c.y-2.5){lv.cp=i;c.on=true;SND.sfx('check');burst(c.x+0.3,c.y-1.6,'spark',10,'#7fe0c0');floatText(c.x,c.y-2.4,'Checkpoint!','#2f9e74');
      save.resume={lvl:lv.def.id,cp:i,got:lv.prizes.filter(function(z){return z.got}).map(function(z){return z.id}),t:lv.t};persist()}});
    if(lv.exit){var dx=lv.exit.x-pp.x,dy=lv.exit.y-pp.y;if(dx*dx+dy*dy<1.35*1.35)finishLevel()}
    lv.t+=dt;save.stats.play+=dt}
  else if(lv.finished){lv.finishT+=dt;var e=lv.exit;p.shrink=Math.max(0,1-lv.finishT*1.4);var b=p.body;b.setTransform(V(pp.x+(e.x-pp.x)*Math.min(1,dt*6),pp.y+(e.y-pp.y)*Math.min(1,dt*6)),0);
    if(p.shrink<=0)p.hidden=true;if(lv.finishT>1.8&&!lv.endShown){lv.endShown=true;showEnd()}}
}
function bumpHud(){prizeCount.textContent=L.got;prizeCount.classList.add('bump');setTimeout(function(){prizeCount.classList.remove('bump')},160)}
function startLevel(id,resume){var def=LEVELS.filter(function(d){return d.id===id})[0]||LEVELS[0];
  particles=[];floaters=[];L=newLevel(def);VQ.warm=Math.max(VQ.warm,1);
  var sp=L.spawn;var cpi=0;
  if(resume&&resume.lvl===id){cpi=Math.min(resume.cp,L.cps.length-1);L.cp=cpi;for(var i=0;i<=cpi;i++)L.cps[i].on=true;(resume.got||[]).forEach(function(gid){var z=L.prizes[gid];if(z){z.got=true;L.got++}});L.t=resume.t||0;
    var c=L.cps[cpi];sp={x:c.x,y:c.y-R-0.05}}
  player=makePlayer(L,sp.x,sp.y);
  prizeTotal.textContent=L.prizes.length;prizeCount.textContent=L.got;livesHud();
  state='play';showScreen(null);hud.classList.remove('hidden');if(isTouch)touchUI.classList.remove('hidden');
  input.jumpQ=false;updateCamera(0,true);SND.startMusic();updateRotateTip(true);
  if(!resume||resume.lvl!==id){save.resume=null;persist()}
  SND.setWorld(def.world||0);var wd=(typeof WORLDS!=='undefined')&&WORLDS[def.world||0];toast((wd&&def.id>2?wd.name+' · ':'')+def.id+'. '+def.name)}
function isUnlocked(id){if(id<=1)return true;var p=save.best[id-1];return !!(p&&p.done)||!!(save.best[id]&&save.best[id].done)}
function finishLevel(){var lv=L;if(lv.finished)return;lv.finished=true;lv.finishT=0;release(player,true);SND.sfx('finish');confetti(lv.exit.x,lv.exit.y,70);if(lv.def.finale){[0.5,1.1,1.7,2.3].forEach(function(dl,k){setTimeout(function(){if(L===lv){confetti(lv.exit.x+(k%2?-3:3),lv.exit.y-2-k*0.6,60);SND.sfx(k%2?'full':'pop',k*2)}},dl*1000)})}setExpr(player,'joy',3);
  var id=lv.def.id,b=save.best[id]||{};var total=lv.prizes.length;lv.newBest=!b.time||lv.t<b.time;
  save.best[id]={time:lv.newBest?lv.t:b.time,prizes:Math.max(b.prizes||0,lv.got),total:total,done:true};
  save.stats.finishes++;save.resume=null;persist()}
function showEnd(){var lv=L,id=lv.def.id,b=save.best[id];state='end';hud.classList.add('hidden');touchUI.classList.add('hidden');
  document.getElementById('endTitle').textContent=lv.def.name+' complete!';
  document.getElementById('endPrizes').textContent=lv.got+' / '+lv.prizes.length;document.getElementById('endTime').textContent=fmt(lv.t);
  document.getElementById('endBest').textContent=b&&b.time?fmt(b.time):'-';
  var stars=1+(lv.got>=Math.ceil(lv.prizes.length*0.6)?1:0)+(lv.got===lv.prizes.length?1:0);
  var se=document.getElementById('endStars');se.innerHTML='<span class="st">★</span><span class="st">★</span><span class="st">★</span>';
  for(var i=0;i<stars;i++)(function(i){setTimeout(function(){se.children[i].classList.add('on');SND.sfx('pop',i*2)},350+i*280)})(i);
  var note=lv.newBest?'New best time!':'';if(lv.got===lv.prizes.length)note=(note?note+' ':'')+'Every prize bubble popped!';
  document.getElementById('endNote').textContent=note;
  var ec=document.getElementById('endingCard'),last=LEVELS[LEVELS.length-1].id===id;if(ec){if(last){var tt=levelTotals();document.getElementById('ecText').textContent=(tt.done===LEVELS.length?'Bobbin sewed up all '+LEVELS.length+' boxes!':'You reached the very last box!')+' Levels '+tt.done+'/'+LEVELS.length+' · Prizes '+tt.prizes+'/'+tt.total+' · Total best time '+fmt(tt.time);ec.classList.remove('hidden')}else ec.classList.add('hidden')}
  var nx=document.getElementById('nextBtn');var nxt=LEVELS.filter(function(d){return d.id===id+1})[0];nx.textContent=nxt?'Next level':'Back to start';
  showScreen('end')}
function pauseGame(){if(state!=='play')return;state='paused';showScreen('pause');release(player,true);persist()}
function resumeGame(){if(state!=='paused')return;state='play';showScreen(null);input.jumpQ=false}
function toCheckpoint(){if(!L)return;respawnPlayer();resumeGame()}
/* ---------------- UI ---------------- */
var screens=['title','levels','costume','stats','settings','pause','end','outLives'];
function showScreen(n){screens.forEach(function(s){document.getElementById(s).classList.toggle('hidden',s!==n)});
  if(n==='levels')buildLevelCards();if(n==='stats')buildStats();if(n==='costume')buildSwatches();if(n==='title')document.getElementById('playBtn').textContent=save.resume?'Continue':'Play'}
var toastEl=document.getElementById('toast'),toastT=null;
function toast(t){toastEl.textContent=t;toastEl.classList.add('show');clearTimeout(toastT);toastT=setTimeout(function(){toastEl.classList.remove('show')},1800)}
function goTitle(){state='title';hud.classList.add('hidden');touchUI.classList.add('hidden');makeShowroom();showScreen('title')}
function makeShowroom(){L=newLevel(LEVELS[0]);player=makePlayer(L,5.2,-0.6);particles=[];floaters=[];camZoom=1;updateCamera(0,true)}
function on(id,fn){document.getElementById(id).addEventListener('click',function(e){SND.unlock();SND.sfx('tap');fn(e)})}
on('playBtn',function(){if(save.resume&&isUnlocked(save.resume.lvl))startLevel(save.resume.lvl,save.resume);else{var first=LEVELS.filter(function(d){return !(save.best[d.id]&&save.best[d.id].done)&&isUnlocked(d.id)})[0]||LEVELS[0];startLevel(first.id)}});
on('levelsBtn',function(){showScreen('levels')});
on('costumeBtn',function(){state='costume';camZoom=portrait?1.5:1.9;showScreen('costume')});
on('statsBtn',function(){showScreen('stats')});
on('settingsBtn',function(){showScreen('settings')});
document.querySelectorAll('[data-go]').forEach(function(b){b.addEventListener('click',function(){SND.unlock();SND.sfx('tap');if(state==='costume'){state='title';camZoom=1}showScreen(b.getAttribute('data-go'))})});
on('pauseBtn',function(){pauseGame()});
on('resumeBtn',function(){resumeGame()});
on('cpBtn',function(){toCheckpoint()});
on('resetPiecesBtn',function(){resetPieces();resumeGame()});
on('restartBtn',function(){startLevel(L.def.id)});
on('quitBtn',function(){goTitle();showScreen('levels')});
on('nextBtn',function(){var nxt=LEVELS.filter(function(d){return d.id===L.def.id+1})[0];if(nxt)startLevel(nxt.id);else goTitle()});
on('replayBtn',function(){startLevel(L.def.id)});
on('retryBtn',function(){startLevel(L.def.id)});
on('outLevelsBtn',function(){goTitle();showScreen('levels')});
on('endLevelsBtn',function(){goTitle();showScreen('levels')});
on('rotateOk',function(){document.getElementById('rotateTip').classList.add('hidden');save.rotDismiss=true;persist()});
var rotShownAt=0;
function updateRotateTip(fresh){var el=document.getElementById('rotateTip');var show=portrait&&isTouch&&state==='play'&&!save.rotDismiss;
  if(show&&fresh){rotShownAt=performance.now();el.classList.remove('hidden')}else if(!show)el.classList.add('hidden')}
function starsOf(b){return b&&b.done?1+(b.prizes>=Math.ceil(b.total*0.6)?1:0)+(b.prizes===b.total?1:0):0}
function levelTotals(){var t={done:0,prizes:0,total:0,stars:0,time:0,all:true};LEVELS.forEach(function(d){var b=save.best[d.id];if(b&&b.done){t.done++;t.prizes+=b.prizes||0;t.stars+=starsOf(b);t.time+=b.time||0}else t.all=false;t.total+=(b&&b.total)||0});return t}
function buildLevelCards(){var host=document.getElementById('levelCards');host.innerHTML='';var tot=levelTotals();
  document.getElementById('levelTotals').innerHTML='<span>Levels <b>'+tot.done+'/'+LEVELS.length+'</b></span><span>Prizes <b>'+tot.prizes+'</b></span><span>Stars <b>'+tot.stars+'/'+LEVELS.length*3+'</b></span><span>Total best time <b>'+(tot.done?fmt(tot.time):'-')+'</b></span>';
  var worlds=(typeof WORLDS!=='undefined')?WORLDS:[{id:0,name:'Levels',col:'#ffad5c'}];var pv=[];
  worlds.forEach(function(wd){var lv=LEVELS.filter(function(d){return (d.world||0)===wd.id});if(!lv.length)return;var done=lv.filter(function(d){return save.best[d.id]&&save.best[d.id].done}).length;
    var sec=document.createElement('div');sec.className='world';sec.style.setProperty('--wc',wd.col);
    sec.innerHTML='<div class="wHead"><canvas width="240" height="120"></canvas><div><h3>'+wd.name+'</h3><p>'+(wd.blurb||'')+'</p><p class="wDone">'+done+' / '+lv.length+' done</p></div></div><div class="wLevels"></div>';
    var grid=sec.querySelector('.wLevels');
    lv.forEach(function(d){var b=save.best[d.id],un=isUnlocked(d.id),st=starsOf(b);var el=document.createElement('button');el.className='lvTile'+(un?'':' locked')+(b&&b.done?' done':'');
      el.innerHTML='<span class="num">'+d.id+'</span><span class="nm">'+d.name+'</span>'+(un?(b&&b.done?'<span class="info">'+fmt(b.time)+' · '+b.prizes+'/'+b.total+'</span><span class="stars">'+'★★★'.slice(0,st)+'<i>'+'★★★'.slice(st)+'</i></span>':'<span class="info new">New!</span>'):'<span class="info">🔒 Finish '+(d.id-1)+' first</span>');
      el.setAttribute('data-lv',d.id);
      el.addEventListener('click',function(){SND.unlock();if(!isUnlocked(d.id)){SND.sfx('unswitch');toast('Finish level '+(d.id-1)+' to unlock this one');return}SND.sfx('tap');startLevel(d.id)});grid.appendChild(el)});
    host.appendChild(sec);pv.push([sec.querySelector('canvas'),lv[0]])});
  var k=0;(function next(){if(k>=pv.length||state!=='title')return;var it=pv[k++];try{var cg=it[0].getContext('2d');var lv2=newLevel(it[1]);var r=lv2.route&&lv2.route[1];var sx=it[1].id===1?27:it[1].id===2?31:(r?(r.x0||r.edge||r.btn||r.tower||r.pad||r.wall||20)+3:20);
      renderScene(cg,240,120,1,12,sx,-3.2,lv2,null,1,{noSigns:true,noVig:true})}catch(e){}setTimeout(next,30)})()}
function buildStats(){var s=save.stats,h=document.getElementById('statsList');var rows=[['Time played',fmt(s.play)],['Levels finished',s.finishes],['Prize bubbles popped',s.prizes],['Jumps',s.jumps],['Grabs',s.grabs],['Boings',s.boings],
  ['Levers pulled',s.levers],['Switches flipped',s.switches],['Soft respawns',s.respawns],['Lives lost',s.deaths||0],['Squishes',s.squashes||0],['Distance waddled',Math.round(s.dist)+' m']];
  var tot=levelTotals();rows.push(['Levels done',tot.done+' / '+LEVELS.length],['Stars',tot.stars+' / '+LEVELS.length*3],['Best-run prizes',tot.prizes]);
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
  updateCamera(dt);var sh=cam.sh>0?cam.sh:0;cam.sh=Math.max(0,cam.sh-dt*1.2);
  var s=S*camZoom,r0=performance.now();renderScene(g,W,H,DPR,s,cam.x+(Math.random()-0.5)*sh,cam.y+(Math.random()-0.5)*sh,L,player,clock,{cache:Math.abs(camZoom-1)<1e-3&&!Q.get('nocache')});vqTick(dt,performance.now()-r0)}
function idleStep(dt){var p=player;input.jumpQ=false;var saved={x:input.x,jump:input.jump,grab:input.grab};input.x=0;input.jump=false;input.grab=false;updatePlayer(p,dt);input.x=saved.x;input.jump=saved.jump;input.grab=saved.grab;updateDevices(dt);L.world.step(dt,8,3);
  if(Math.random()<dt*0.25&&p.grounded){p.body.setLinearVelocity(V(0,-7));p.sy=1.2;p.sx=0.85}}
document.addEventListener('visibilitychange',function(){if(document.hidden){persist();if(state==='play')pauseGame()}});
window.addEventListener('pagehide',persist);
/* ---------------- boot ---------------- */
document.body.classList.toggle('touch',isTouch);
window.addEventListener('pointerdown',function(e){if(e.pointerType==='touch'&&!isTouch){isTouch=true;document.body.classList.add('touch');if(state==='play')touchUI.classList.remove('hidden')}},true);
resize();GFX.init(g);buildSliders();
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
  farX:function(type,dflt){if(!type)return dflt;var w=L.def.w,c=L.bg.far.filter(function(it){return it.t===type&&it.x/0.25>12&&it.x/0.25<w-12}).map(function(it){return it.x/0.25-3})[0];return c===undefined?dflt:c},
  drop:function(x,y,w,h,d,kind,vy){var o=L.B.box('drop'+L.objs.length,x,y,w,h,{density:d,kind:kind||'card'});o.zone=null;if(vy)o.body.setLinearVelocity(V(0,vy));return +o.body.getMass().toFixed(2)},
  moveObj:function(n,x,y){var o=L.objs.filter(function(q){return q.name===n})[0];o.body.setTransform(V(x,y),0);o.body.setLinearVelocity(V(0,0));o.body.setAwake(true)},
  warp:function(x,y){player.body.setTransform(V(x,y),0);player.body.setLinearVelocity(V(0,0))}
};
})();
