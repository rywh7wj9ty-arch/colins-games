/* Bobbin's Button Box - engine, controller, devices */
(function(){
'use strict';
var pl=planck,V=pl.Vec2;
var G=30,STEP=1/120,R=0.48,JUMP_V=11.2,BOING_V=16.8,MAXRUN=6.4;
var CAT={GROUND:1,PLAYER:2,OBJ:4,LEVER:8,HAND:16,ROPE:32};
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
    prizes:[],cps:[],signs:[],pits:[],exit:null,spawn:{x:2,y:-1},signals:{},bounceQ:[],deco:[],t:0,got:0,cp:0,finished:false,finishT:0,top:-14,bottom:2.8};
  lv.ground=lv.world.createBody({type:'static'});lv.ground.setUserData({kind:'ground'});
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
    button:function(sig,x,y,w,o){lv.buttons.push({sig:sig,x:x,y:y,w:w,minMass:o.minMass||0.5,heavy:!!o.heavy,pocket:!!o.pocket,pressed:false,held:0,rel:0,mass:0,dep:0,latched:false,mode:(sig==='door1')?'hold':'latch',wob:0})},
    boing:function(x,y,w,o){var bo={x:x,y:y,w:w,sig:o.sig||null,active:!o.sig,sq:0,pop:o.sig?0:1,fix:null};
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
  def.build(b);
  // invisible bounds
  addRect(-1,-30,1,40,{type:'solid'});addRect(def.w,-30,1,40,{type:'solid'});addRect(-1,lv.top-1,def.w+2,1,{type:'solid'});
  lv.world.on('begin-contact',function(c){var fa=c.getFixtureA(),fb=c.getFixtureB(),ua=fa.getUserData(),ub=fb.getUserData();
    if(ua&&ua.type==='boing'&&fb.getBody().getUserData()&&fb.getBody().getUserData().kind==='obj')lv.bounceQ.push([fb.getBody(),ua.boing]);
    if(ub&&ub.type==='boing'&&fa.getBody().getUserData()&&fa.getBody().getUserData().kind==='obj')lv.bounceQ.push([fa.getBody(),ub.boing]);
    // thuds for objects landing
    var ba=fa.getBody(),bb=fb.getBody();var ob=(ba.getUserData()&&ba.getUserData().kind==='obj')?ba:(bb.getUserData()&&bb.getUserData().kind==='obj')?bb:null;
    if(ob&&!fa.isSensor()&&!fb.isSensor()){var vv=ob.getLinearVelocity();var sp=Math.hypot(vv.x,vv.y);if(sp>3)lv.thudQ=(lv.thudQ||0)+sp}});
  // background decor
  lv.bg=makeBackground(def);
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
    if(ud.type==='lever'&&ud.lever.on)continue;
    var bp=other.getBody().getPosition(),pt=closestPoint(other,pp);var dx=pt.x-pp.x,dy=pt.y-pp.y,d=Math.hypot(dx,dy);
    var score=d-(Math.sign(dx)===p.face?0.3:0)-(ud.type==='lever'?0.4:0);if(score<bs){bs=score;best={fix:other,ud:ud,body:other.getBody(),pt:pt}}}
  return best}
function closestPoint(fix,pp){var ud=fix.getUserData(),bd=fix.getBody();
  if(ud&&ud.type==='lever'){return bd.getWorldPoint(V(0,-1.4))}
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
  p.grab=gr;save.stats.grabs++;SND.sfx('grab');burst(pt.x,pt.y,'fluff',5,'#fff3df');p.sx=1.12;p.sy=0.9}
function release(p,quiet){if(!p.grab)return;var w=L.world;try{w.destroyJoint(p.grab.joint)}catch(e){}if(p.grab.rj)try{w.destroyJoint(p.grab.rj)}catch(e){}
  p.grab=null;p.grabCool=0.12;if(!quiet)SND.sfx('release')}
function approach(v,t,d){return v<t?Math.min(t,v+d):Math.max(t,v-d)}
function updatePlayer(p,dt){var b=p.body,v=b.getLinearVelocity(),vx=v.x,vy=v.y,pp=b.getPosition();
  groundCheck(p);
  var wasAir=p.airT>0.06;
  if(p.grounded){if(wasAir){var imp=Math.min(1,Math.max(0,p.lastVy-3)/14);if(p.lastVy>3){p.sy=1-0.32*imp-0.06;p.sx=1+0.3*imp+0.05;SND.sfx('land',p.lastVy);burst(pp.x,pp.y+R,'dust',3+Math.round(imp*6),'#f6e3c4');if(p.lastVy>15)cam.sh=Math.min(0.25,p.lastVy*0.012)}}
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
  var gr=p.grab;
  if(gr){gr.t+=dt;var anc=gr.body.getWorldPoint(gr.local);var dd=Math.hypot(anc.x-pp.x,anc.y-pp.y);
    if(dd>2.2){release(p)}else if(gr.mode==='hang'){if(gr.held&&!input.grab)release(p);else if(!gr.held&&input.grab)gr.held=true}
    else if(!input.grab)release(p)}
  gr=p.grab;
  if(!gr&&input.grab&&p.grabCool<=0){var c=grabCandidates(p);if(c&&(c.ud.type!=='rope'||true))attach(p,c)}
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
    var target=input.x*max,acc;
    if(p.grounded)acc=(Math.abs(target)>0.01&&(Math.sign(target)===Math.sign(vx)||Math.abs(vx)<0.3))?58:72;else acc=34;
    if(gr&&gr.mode==='lever')acc=40;
    vx=approach(vx,target,acc*dt);
    if(p.buffer>0&&p.coyote>0){vy=-JUMP_V;p.coyote=0;p.buffer=0;p.cut=false;p.sy=1.28;p.sx=0.78;save.stats.jumps++;SND.sfx('jump');burst(pp.x,pp.y+R,'dust',4,'#f6e3c4');
      if(p.groundBody&&p.groundBody.getType()==='dynamic')p.groundBody.applyLinearImpulse(V(0,p.mass*JUMP_V*0.4),V(pp.x,pp.y+R),true)}
  }
  if(!p.cut&&!input.jump&&vy<-2){vy*=0.5;p.cut=true}
  if(vy>=0)p.cut=true;
  if(!(gr&&gr.mode==='hang')){if(vy>0)b.applyForceToCenter(V(0,p.mass*G*0.55),true);else if(Math.abs(vy)<2.2&&input.jump)b.applyForceToCenter(V(0,-p.mass*G*0.3),true)}
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
  if(p.exprT<=0){if(gr&&gr.mode!=='hang'&&Math.abs(input.x)>0.2)p.expr='effort';else if(!p.grounded&&vy>12)p.expr='wow';else if(p.idle>9)p.expr='sleepy';else p.expr='happy'}
  p.cand=(!p.grab)?grabCandidates(p):null;
  if(p.inv>0)p.inv-=dt;
}
function setExpr(p,e,t){p.expr=e;p.exprT=t}
/* ---------------- devices ---------------- */
function sig(name){return !!L.signals[name]}
function setSig(name,v,x,y){if(!!L.signals[name]===v)return;L.signals[name]=v;if(v){save.stats.switches++;SND.sfx('switch');if(x!==undefined){burst(x,y,'spark',14,'#ffd75e');burst(x,y,'ring',1,'#fff')}setExpr(player,'joy',0.8)}else SND.sfx('unswitch')}
function bodyMassIn(x1,x2,yTop,yBot){var m=0,list=[];
  var pp=player.body.getPosition();if(!player.hidden&&pp.x>x1-0.2&&pp.x<x2+0.2&&pp.y+R>yTop&&pp.y+R<yBot){m+=player.mass;list.push('player')}
  L.objs.forEach(function(o){var p=o.body.getPosition();var bot=p.y+(o.type==='ball'?o.r:o.ext);if(p.x>x1-0.15&&p.x<x2+0.15&&bot>yTop&&bot<yBot){m+=o.body.getMass();list.push(o.name)}});
  return {m:m,list:list}}
function updateDevices(dt){var lv=L;
  lv.levers.forEach(function(lo){var a=lo.body.getAngle();lo.flash=Math.max(0,lo.flash-dt);
    if(!lo.on&&a<-0.22){lo.on=true;lo.flash=1;save.stats.levers++;SND.sfx('click');var tip=lo.body.getWorldPoint(V(0,-1.4));setSig(lo.sig,true,tip.x,tip.y);
      if(player.grab&&player.grab.ud.type==='lever'&&player.grab.ud.lever===lo){setTimeout(function(){if(player&&player.grab&&player.grab.ud.type==='lever')release(player,true)},250)}}});
  lv.buttons.forEach(function(bt){var r=bodyMassIn(bt.x,bt.x+bt.w,bt.y-0.5,bt.y+0.12);bt.mass=r.m;var press=r.m>=bt.minMass-1e-6;
    bt.wob=(r.m>0&&!press)?bt.wob+dt:0;
    if(bt.wob>0.4&&!bt.warned){bt.warned=true;floatText(bt.x+bt.w/2,bt.y-1.5,'Too light! Needs something heavy','#c65a00')}
    if(r.m===0)bt.warned=false;
    bt.dep+=((press?1:r.m>0?0.35:0)-bt.dep)*Math.min(1,dt*14);
    if(bt.mode==='hold'){if(press){bt.rel=0.25;if(!bt.pressed){bt.pressed=true;setSig(bt.sig,true,bt.x+bt.w/2,bt.y-0.3)}}else if(bt.pressed){bt.rel-=dt;if(bt.rel<=0){bt.pressed=false;setSig(bt.sig,false)}}}
    else{if(press&&!bt.latched){bt.held+=dt;if(bt.held>0.2){bt.latched=true;bt.pressed=true;setSig(bt.sig,true,bt.x+bt.w/2,bt.y-0.3)}}else if(!press)bt.held=0}});
  lv.baskets.forEach(function(bk){var inside=false;lv.objs.forEach(function(o){if(o.type!=='ball')return;var p=o.body.getPosition();if(Math.abs(p.x-bk.x)<bk.w/2&&p.y<bk.y&&p.y>bk.y-bk.h-0.3)inside=true});
    bk.sag+=((inside?0.25:0)-bk.sag)*Math.min(1,dt*6);
    if(inside&&!bk.done){bk.in+=dt;if(bk.in>0.3){bk.done=true;setSig(bk.sig,true,bk.x,bk.y-bk.h);floatText(bk.x,bk.y-bk.h-0.8,'Swish!','#2f9e74')}}else if(!inside)bk.in=0});
  lv.gates.forEach(function(gt){var open=sig(gt.sig),bd=gt.body,p=bd.getPosition(),cy=gt.y+gt.h/2,ty=open?cy+gt.dy:cy,vy=(ty-p.y)*7;
    if(open&&!gt.wasOpen){SND.sfx('door');if(gt.thin){lv.objs.forEach(function(o){var q=o.body.getPosition();if(o.type==='ball'&&Math.abs(q.x-gt.x)<2.2&&Math.abs(q.y-gt.y-gt.h/2)<1){o.body.setLinearVelocity(V(2.6,-0.5));o.body.setAwake(true)}})}}gt.wasOpen=open;
    var lim=4;vy=Math.max(-lim,Math.min(lim,vy));if(Math.abs(ty-p.y)<0.005){vy=0;bd.setTransform(V(p.x,ty),0)}
    if(!open&&gt.mode==='hold'&&vy>0){var bot=p.y+gt.h/2;var blk=bodyMassIn(gt.x-0.3,gt.x+gt.w+0.3,bot-0.2,gt.y+gt.h+0.3);
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
  pos=pos||o.home;o.body.setTransform(V(pos.x,pos.y),0);o.body.setLinearVelocity(V(0,0));o.body.setAngularVelocity(0);o.body.setAwake(true);o.still=0;o.flash=1;
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
    if(inPit(p.x,p.y)||p.y>8||p.x<-2||p.x>L.w+2||(o.zone&&(p.x<o.zone[0]||p.x>o.zone[0]+o.zone[2]||p.y<o.zone[1]||p.y>o.zone[1]+o.zone[3]))){respawnObj(o,objRespawnPos(o));return}
    var ok=objValid(o);if(player.grab&&player.grab.body===o.body){o.still=0;return}
    if(ok===true){o.still=0;return}
    if(sp<0.6)o.still+=dt;else o.still=Math.max(0,o.still-dt*0.5);
    if(o.still>(ok==='slow'?4:1.6))respawnObj(o,objRespawnPos(o))})}
function respawnPlayer(){var p=player,b=p.body,c=L.cps[L.cp]||L.cps[0];var pp=b.getPosition();
  burst(pp.x,pp.y,'fluff',14,'#fff3df');release(p,true);b.setTransform(V(c.x,c.y-R-0.05),0);b.setLinearVelocity(V(0,0));p.inv=1;p.sy=0.6;p.sx=1.3;p.airT=0;p.lastVy=0;
  save.stats.respawns++;SND.sfx('respawn');burst(c.x,c.y-0.6,'spark',10,'#ffd75e');cam.x+=(c.x-cam.x)*0.6;
  // keep puzzle objects that wandered off-screen near the checkpoint sensible
}
function resetPieces(){L.objs.forEach(function(o){respawnObj(o,objRespawnPos(o))});toast('Puzzle pieces are back where they started')}
/* ---------------- particles ---------------- */
function burst(x,y,type,n,col){for(var i=0;i<n;i++){var a=Math.random()*Math.PI*2,s=type==='dust'?1+Math.random()*2:type==='fluff'?1+Math.random()*3:2+Math.random()*4;
  particles.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-(type==='dust'?1:1.5),life:0,max:type==='ring'?0.45:0.5+Math.random()*0.5,type:type,col:col,size:type==='fluff'?0.12+Math.random()*0.14:0.06+Math.random()*0.08,rot:Math.random()*6})}
  if(particles.length>260)particles.splice(0,particles.length-260)}
function confetti(x,y,n){var cols=['#ff7fae','#ffd23f','#4fd1a5','#4aa8ff','#a98bff','#ff9f43'];for(var i=0;i<n;i++){var a=-Math.PI/2+(Math.random()-0.5)*2.2,s=5+Math.random()*7;
  particles.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0,max:1.6+Math.random(),type:'confetti',col:cols[i%cols.length],size:0.09+Math.random()*0.07,rot:Math.random()*6,vr:(Math.random()-0.5)*14})}}
function floatText(x,y,t,col){floaters.push({x:x,y:y,t:t,col:col||'#5a3a28',life:0,max:1.5})}
function updateParticles(dt){for(var i=particles.length-1;i>=0;i--){var p=particles[i];p.life+=dt;if(p.life>p.max){particles.splice(i,1);continue}
    if(p.type==='confetti'){p.vy+=9*dt;p.vx*=0.985;p.vy*=0.985;p.rot+=p.vr*dt}else if(p.type==='fluff'||p.type==='dust'){p.vx*=0.94;p.vy=p.vy*0.94-0.4*dt}else{p.vy+=4*dt}
    p.x+=p.vx*dt;p.y+=p.vy*dt}
  for(var j=floaters.length-1;j>=0;j--){var f=floaters[j];f.life+=dt;f.y-=dt*0.6;if(f.life>f.max)floaters.splice(j,1)}}
/* ---------------- background ---------------- */
function makeBackground(def){var R=GFX.rng(def.id*977+3),far=[],mid=[],i,x;
  var span=def.w*0.3+40;
  if(def.theme==='workshop'){
    for(x=-12;x<span;x+=5+R()*5){var t=R();far.push({t:t<0.3?'drawing':t<0.5?'scissors':t<0.68?'ruler':t<0.85?'window':'spools',x:x,y:-6.5+R()*3.2,r:(R()-0.5)*0.3,s:0.8+R()*0.5,k:Math.floor(R()*4),c:Math.floor(R()*6)})}
  }else{
    for(x=-12;x<span;x+=5+R()*6){var t2=R();far.push({t:t2<0.42?'cog':t2<0.62?'pipe':t2<0.8?'clock':'poster',x:x,y:-6.8+R()*3.4,r:R()*6,s:0.8+R()*0.7,k:Math.floor(R()*4),c:Math.floor(R()*6),dir:R()<0.5?1:-1})}
  }
  var span2=def.w*0.6+40;
  for(x=-10;x<span2;x+=2.6+R()*3){var isT=R()<0.3;mid.push({t:isT?'tree':'hill',x:x,y:0.6,s:isT?0.9+R()*0.6:1.2+R()*1.6,c:Math.floor(R()*5)})}
  var bunt=[];for(x=-8;x<span2;x+=9+R()*5)bunt.push({x:x,w:7+R()*3,y:-6.2-R()*1.4,c:Math.floor(R()*3)});
  return {far:far,mid:mid,bunt:bunt}}
var PAL=['#ff9fc4','#ffd75e','#7fe0c0','#8fd3ff','#b79cff','#ffad5c'];
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
    case 'poster':g.fillStyle='#fffaf0';g.fillRect(-0.8,-1,1.6,2);g.strokeStyle=PAL[it.c];g.lineWidth=0.06;g.beginPath();g.arc(0,-0.3,0.35,0,7);g.stroke();
      g.beginPath();g.moveTo(-0.5,0.3);g.lineTo(0.5,0.3);g.moveTo(-0.5,0.5);g.lineTo(0.3,0.5);g.moveTo(-0.5,0.7);g.lineTo(0.4,0.7);g.stroke();g.fillStyle='#ffd75e';g.beginPath();g.arc(0,-0.95,0.08,0,7);g.fill();break;
  }
  g.restore()}
function drawMidItem(g,it,theme){var cols=theme==='workshop'?['#a6dc84','#8ed46f','#ffd98a','#bfe7a0','#9fd6a0']:['#9fe6d8','#ffe08a','#a6d8ff','#c9b8ff','#8fe0c0'];
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
  var sky=g.createLinearGradient(0,0,0,H);if(th==='workshop'){sky.addColorStop(0,'#ffe4b8');sky.addColorStop(1,'#fff3dc')}else{sky.addColorStop(0,'#d4f2ec');sky.addColorStop(1,'#fff3df')}
  g.fillStyle=sky;g.fillRect(0,0,W,H);
  function layer(d,yd){g.setTransform(dpr*S,0,0,dpr*S,dpr*(W/2-cx*d*S),dpr*(H/2-cy*yd*S))}
  // far wall pattern
  layer(0.25,0.35);var x0=cx*0.25-W/2/S-2,y0=cy*0.35-H/2/S-2;g.globalAlpha=th==='workshop'?0.55:0.8;g.fillStyle=GFX.pat(th==='workshop'?'peg':'dots');g.fillRect(x0,y0,W/S+4,H/S+4);g.globalAlpha=1;
  var vl=x0-3,vr=x0+W/S+7;
  lv.bg.far.forEach(function(it){if(it.x>vl&&it.x<vr)drawFarItem(g,it,t)});
  layer(0.55,0.6);var x1=cx*0.55-W/2/S-4,x2=x1+W/S+8;
  lv.bg.bunt.forEach(function(b){if(b.x+b.w>x1&&b.x<x2)drawBunting(g,b)});
  lv.bg.mid.forEach(function(it){if(it.x>x1-4&&it.x<x2+4)drawMidItem(g,it,th)});
  // world
  g.setTransform(dpr*S,0,0,dpr*S,dpr*(W/2-cx*S),dpr*(H/2-cy*S));
  var wl=cx-W/2/S-1,wr=cx+W/2/S+1,wt=cy-H/2/S-1,wb=cy+H/2/S+1;
  // pits: cotton wool
  lv.pits.forEach(function(p){if(p.x+p.w<wl||p.x>wr)return;g.fillStyle='rgba(255,255,255,0.95)';for(var x=p.x+0.3;x<p.x+p.w;x+=0.7){g.beginPath();g.arc(x,p.y+1.5+Math.sin(x*3)*0.15,0.55,0,7);g.fill()}
    g.fillStyle='rgba(220,200,255,0.35)';for(var x3=p.x+0.6;x3<p.x+p.w;x3+=0.9){g.beginPath();g.arc(x3,p.y+1.9,0.45,0,7);g.fill()}});
  // signs posts (behind)
  lv.signs.forEach(function(s){if(s.x<wl-3||s.x>wr+3)return;g.fillStyle=GFX.pat('wood');g.fillRect(s.x-0.06,s.y-1.35,0.12,1.35);g.strokeStyle='rgba(110,70,30,0.5)';g.lineWidth=0.03;g.strokeRect(s.x-0.06,s.y-1.35,0.12,1.35)});
  // checkpoints
  lv.cps.forEach(function(c,i){if(c.x<wl||c.x>wr)return;var on=c.on;GFX.spool(g,c.x,c.y-0.32,0.55,on?'#7fe0c0':'#e8d6bf');g.fillStyle=GFX.pat('wood');g.fillRect(c.x-0.05,c.y-1.9,0.1,1.4);
    var fy=on?c.y-1.88:c.y-0.95,wv=Math.sin(t*4+i)*0.08;g.beginPath();g.moveTo(c.x+0.05,fy);g.quadraticCurveTo(c.x+0.4,fy+0.12+wv,c.x+0.75,fy+0.22+wv);g.lineTo(c.x+0.05,fy+0.48);g.closePath();
    g.fillStyle=on?GFX.pat('felt_yellow'):GFX.pat('felt_cream');g.fill();g.strokeStyle='rgba(110,70,30,0.45)';g.lineWidth=0.03;g.stroke();
    if(on){GFX.sewButton(g,c.x+0.3,fy+0.22,0.08,'#ff7fae',2)}});
  // shadows then solids
  lv.solids.forEach(function(s){if(s.poly||(s.x<wr&&s.x+s.w>wl&&s.y<wb&&s.y+s.h>wt))GFX.solidShadow(g,s)});
  // gates (behind their frames)
  lv.gates.forEach(function(gt){var p=gt.body.getPosition();if(p.x<wl-1||p.x>wr+1)return;g.save();g.translate(p.x,p.y);
    if(gt.thin){GFX.rr(g,-gt.w/2,-gt.h/2,gt.w,gt.h,0.12);g.fillStyle=GFX.pat('felt_red');g.fill();g.strokeStyle='rgba(110,40,30,0.5)';g.lineWidth=0.03;g.stroke()}
    else{GFX.rr(g,-gt.w/2,-gt.h/2,gt.w,gt.h,0.06);g.fillStyle=GFX.pat('felt_teal');g.fill();g.strokeStyle='rgba(30,80,80,0.55)';g.lineWidth=0.04;g.stroke();
      GFX.rr(g,-gt.w/2+0.08,-gt.h/2+0.08,gt.w-0.16,gt.h-0.16,0.04);GFX.stitch(g);for(var k=0;k<3;k++)GFX.sewButton(g,0,-gt.h/2+0.6+k*((gt.h-1.2)/2),0.13,'#ffd75e',2)}
    g.restore()});
  lv.solids.forEach(function(s){if(s.poly||(s.x<wr&&s.x+s.w>wl&&s.y<wb&&s.y+s.h>wt))GFX.drawSolid(g,s)});
  // boing pads
  lv.boings.forEach(function(bo){if(bo.x>wr||bo.x+bo.w<wl)return;var cxp=bo.x+bo.w/2;
    if(!bo.active){g.fillStyle=GFX.pat('card');g.fillRect(bo.x,bo.y-0.05,bo.w,0.08);g.strokeStyle='rgba(110,70,30,0.55)';g.lineWidth=0.03;g.setLineDash([0.1,0.08]);g.strokeRect(bo.x,bo.y-0.05,bo.w,0.08);g.setLineDash([]);
      g.save();g.globalAlpha=0.55;GFX.wtext(g,'?',cxp,bo.y-0.5,0.5,'#5a3a28');g.restore();return}
    var sq=bo.sq*Math.sin(bo.sq*12)*0.12,h=(0.42+sq)*bo.pop;g.save();g.translate(cxp,bo.y);
    g.strokeStyle='#9aa0b4';g.lineWidth=0.06;g.beginPath();for(var i=0;i<=8;i++){var yy=-i/8*h*0.6;g.lineTo((i%2?0.3:-0.3)*bo.w/1.7,yy)}g.stroke();
    GFX.rr(g,-bo.w/2,-h-0.06,bo.w,0.34,0.15);g.fillStyle=GFX.pat('sponge');g.fill();g.strokeStyle='#b8861c';g.lineWidth=0.04;g.stroke();
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
  // objects
  lv.objs.forEach(function(o){var b=o.body,p=b.getPosition();if(p.x+2<wl||p.x-2>wr)return;
    g.fillStyle='rgba(110,70,30,0.14)';g.beginPath();g.ellipse(p.x+0.1,p.y+0.12,o.ext,o.ext,0,0,7);g.fill();
    g.save();g.translate(p.x,p.y);g.rotate(b.getAngle());if(o.type==='ball')GFX.drawBall(g,o);else GFX.drawBox(g,o);g.restore();
    if(o.flash>0){g.globalAlpha=o.flash;g.strokeStyle='#fff';g.lineWidth=0.08;g.beginPath();g.arc(p.x,p.y,o.ext+0.2+(1-o.flash)*0.6,0,7);g.stroke();g.globalAlpha=1}});
  // grab highlight
  if(plr&&plr.cand&&!plr.grab){var c=plr.cand,pulse=0.5+0.5*Math.sin(t*8);g.save();g.strokeStyle='rgba(255,255,255,'+(0.65+pulse*0.35)+')';g.lineWidth=0.07;g.setLineDash([0.16,0.1]);g.lineDashOffset=-t*0.6;
    var cb=c.body,cp=cb.getPosition(),ud=c.ud;
    if(ud.type==='lever'){var kp=cb.getWorldPoint(V(0,-1.4));g.beginPath();g.arc(kp.x,kp.y,0.42+pulse*0.05,0,7);g.stroke()}
    else if(ud.type==='rope'){g.beginPath();g.arc(c.pt.x,c.pt.y,0.32+pulse*0.05,0,7);g.stroke()}
    else{var o2=ud.obj;g.translate(cp.x,cp.y);g.rotate(cb.getAngle());if(o2.type==='ball'){g.beginPath();g.arc(0,0,o2.r+0.12,0,7);g.stroke()}else{GFX.rr(g,-o2.w/2-0.12,-o2.h/2-0.12,o2.w+0.24,o2.h+0.24,0.2);g.stroke()}}
    g.restore();
    if(!isTouch||true){g.save();g.fillStyle='rgba(255,255,255,0.9)';var lx=c.pt.x,ly=c.pt.y-0.6-pulse*0.05;g.beginPath();g.arc(lx,ly,0.18,0,7);g.fill();GFX.wtext(g,'✋',lx,ly+0.01,0.22,'#5a3a28');g.restore()}}
  // prizes
  lv.prizes.forEach(function(pz){if(pz.got||pz.x<wl||pz.x>wr)return;GFX.bubble(g,pz.x,pz.y+Math.sin(t*2+pz.ph)*0.1,0.32,t+pz.ph,pz.k)});
  // exit
  if(lv.exit)drawExit(g,lv.exit,t,lv);
  // player
  if(plr&&!plr.hidden){var pp=plr.body.getPosition();
    // shadow via raycast
    var gy=null;lv.world.rayCast(V(pp.x,pp.y),V(pp.x,pp.y+8),function(f,pt,n,fr){var u=f.getUserData();if(f.isSensor()||(u&&(u.type==='player'||u.type==='hand')))return -1;gy=pt.y;return fr});
    if(gy!==null){var dd=gy-pp.y-R,a=Math.max(0,0.25-dd*0.04),sw=0.45*Math.max(0.4,1-dd*0.08);g.fillStyle='rgba(90,55,25,'+a+')';g.beginPath();g.ellipse(pp.x,gy-0.02,sw,0.09,0,0,7);g.fill()}
    if(plr.inv>0&&Math.floor(t*14)%2===0)g.globalAlpha=0.55;
    var gr=plr.grab,gv=null;if(gr){var an=gr.body.getWorldPoint(gr.local);gv=[an.x-pp.x,an.y-pp.y]}
    GFX.drawBobbin(g,{x:pp.x,y:pp.y,r:R,sx:plr.sx*(plr.shrink||1),sy:plr.sy*(plr.shrink||1),face:plr.face,run:plr.run,air:!plr.grounded,col:COSTUMES[save.costume%COSTUMES.length][1],grab:gv,
      blink:plr.blink>0,expr:plr.expr,tuft:plr.tuft,look:gr&&gr.mode==='hang'?-0.5:0,tilt:plr.grounded?0:Math.max(-0.2,Math.min(0.2,plr.body.getLinearVelocity().x*0.02))+(plr.idle>2&&plr.grounded?Math.sin(t*2.2)*0.05:0)});
    g.globalAlpha=1}
  // particles
  particles.forEach(function(p){var k=1-p.life/p.max;g.globalAlpha=Math.max(0,Math.min(1,k*1.5));
    if(p.type==='spark'){g.fillStyle=p.col;g.save();g.translate(p.x,p.y);g.rotate(p.rot+p.life*4);var s=p.size*1.6;g.beginPath();for(var i=0;i<8;i++){var r=i%2?s*0.35:s;g.lineTo(Math.cos(i*Math.PI/4)*r,Math.sin(i*Math.PI/4)*r)}g.closePath();g.fill();g.restore()}
    else if(p.type==='ring'){g.strokeStyle=p.col;g.lineWidth=0.08*k;g.beginPath();g.arc(p.x,p.y,0.3+(1-k)*1.4,0,7);g.stroke()}
    else if(p.type==='confetti'){g.fillStyle=p.col;g.save();g.translate(p.x,p.y);g.rotate(p.rot);g.fillRect(-p.size,-p.size*0.5,p.size*2,p.size);g.restore()}
    else{g.fillStyle=p.col;g.beginPath();g.arc(p.x,p.y,p.size*(p.type==='fluff'?1+0.5*(1-k):1),0,7);g.fill()}});
  g.globalAlpha=1;
  // screen-space: signs + floaters
  g.setTransform(dpr,0,0,dpr,0,0);
  function toS(x,y){return [W/2+(x-cx)*S,H/2+(y-cy)*S]}
  var fs=Math.max(11,Math.min(20,S*0.3));g.textAlign='center';g.textBaseline='middle';
  if(!opts.noSigns)lv.signs.forEach(function(s){if(s.x<wl-4||s.x>wr+4)return;var lines=signText(s.text).split('\n');g.font=fs+'px '+FONT;var wmax=0;lines.forEach(function(l){wmax=Math.max(wmax,g.measureText(l).width)});
    var pw=wmax+fs*1.3,ph=lines.length*fs*1.25+fs*0.8,sp=toS(s.x,s.y-1.35),x=sp[0]-pw/2,y=sp[1]-ph;
    g.save();g.translate(sp[0],sp[1]-ph/2);g.rotate(((s.x*7)%3-1)*0.015);g.translate(-sp[0],-(sp[1]-ph/2));
    g.fillStyle='rgba(110,70,30,0.18)';g.fillRect(x+3,y+4,pw,ph);g.fillStyle='#fffaf0';g.fillRect(x,y,pw,ph);
    g.strokeStyle='rgba(120,170,220,0.25)';g.lineWidth=1;for(var ly=y+fs*0.9;ly<y+ph-4;ly+=fs*1.25){g.beginPath();g.moveTo(x+4,ly+fs*0.62);g.lineTo(x+pw-4,ly+fs*0.62);g.stroke()}
    g.fillStyle='#ff7fae';g.beginPath();g.arc(sp[0],y+5,4,0,7);g.fill();
    g.fillStyle='#5a3a28';lines.forEach(function(l,i){g.fillText(l,sp[0],y+fs*0.9+i*fs*1.25)});g.restore()});
  floaters.forEach(function(f){var sp=toS(f.x,f.y),k=f.life/f.max;g.globalAlpha=Math.min(1,(1-k)*2.5);var fz=Math.round(fs*1.15*(1+Math.max(0,0.25-f.life)*1.5));g.font='bold '+fz+'px '+FONT;
    g.lineWidth=4;g.strokeStyle='rgba(255,250,240,0.95)';g.strokeText(f.t,sp[0],sp[1]);g.fillStyle=f.col;g.fillText(f.t,sp[0],sp[1])});g.globalAlpha=1;
  // vignette
  if(!opts.noVig){var vg=g.createRadialGradient(W/2,H/2,Math.min(W,H)*0.35,W/2,H/2,Math.max(W,H)*0.75);vg.addColorStop(0,'rgba(120,70,30,0)');vg.addColorStop(1,'rgba(120,70,30,0.2)');g.fillStyle=vg;g.fillRect(0,0,W,H)}
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
  if(!lv.finished){updatePlayer(p,dt)}else{p.body.setLinearVelocity(V(0,0))}
  updateDevices(dt);
  lv.world.step(dt,10,6);
  watchdog(dt);
  var pp=p.body.getPosition();
  if(!lv.finished){
    if(inPit(pp.x,pp.y)||pp.y>9)respawnPlayer();
    lv.prizes.forEach(function(pz){if(pz.got)return;var dx=pz.x-pp.x,dy=pz.y-pp.y;if(dx*dx+dy*dy<0.85*0.85){pz.got=true;lv.got++;save.stats.prizes++;SND.sfx('pop',lv.got%8);
      burst(pz.x,pz.y,'spark',10,'#ffd75e');burst(pz.x,pz.y,'ring',1,'#bfeaff');floatText(pz.x,pz.y-0.5,'+1','#2f8fe0');setExpr(p,'joy',0.5);bumpHud()}});
    lv.cps.forEach(function(c,i){if(i>lv.cp&&Math.abs(pp.x-c.x)<0.9&&pp.y<c.y+0.3&&pp.y>c.y-2.5){lv.cp=i;c.on=true;SND.sfx('check');burst(c.x+0.3,c.y-1.6,'spark',10,'#7fe0c0');floatText(c.x,c.y-2.4,'Checkpoint!','#2f9e74');
      save.resume={lvl:lv.def.id,cp:i,got:lv.prizes.filter(function(z){return z.got}).map(function(z){return z.id}),t:lv.t};persist()}});
    if(lv.exit){var dx=lv.exit.x-pp.x,dy=lv.exit.y-pp.y;if(dx*dx+dy*dy<1.35*1.35)finishLevel()}
    lv.t+=dt;save.stats.play+=dt}
  else{lv.finishT+=dt;var e=lv.exit;p.shrink=Math.max(0,1-lv.finishT*1.4);var b=p.body;b.setTransform(V(pp.x+(e.x-pp.x)*Math.min(1,dt*6),pp.y+(e.y-pp.y)*Math.min(1,dt*6)),0);
    if(p.shrink<=0)p.hidden=true;if(lv.finishT>1.8&&!lv.endShown){lv.endShown=true;showEnd()}}
}
function bumpHud(){prizeCount.textContent=L.got;prizeCount.classList.add('bump');setTimeout(function(){prizeCount.classList.remove('bump')},160)}
function startLevel(id,resume){var def=LEVELS.filter(function(d){return d.id===id})[0]||LEVELS[0];
  particles=[];floaters=[];L=newLevel(def);
  var sp=L.spawn;var cpi=0;
  if(resume&&resume.lvl===id){cpi=Math.min(resume.cp,L.cps.length-1);L.cp=cpi;for(var i=0;i<=cpi;i++)L.cps[i].on=true;(resume.got||[]).forEach(function(gid){var z=L.prizes[gid];if(z){z.got=true;L.got++}});L.t=resume.t||0;
    var c=L.cps[cpi];sp={x:c.x,y:c.y-R-0.05}}
  player=makePlayer(L,sp.x,sp.y);
  prizeTotal.textContent=L.prizes.length;prizeCount.textContent=L.got;
  state='play';showScreen(null);hud.classList.remove('hidden');if(isTouch)touchUI.classList.remove('hidden');
  input.jumpQ=false;updateCamera(0,true);SND.startMusic();updateRotateTip(true);
  if(!resume||resume.lvl!==id){save.resume=null;persist()}
  toast(def.name)}
function finishLevel(){var lv=L;if(lv.finished)return;lv.finished=true;lv.finishT=0;release(player,true);SND.sfx('finish');confetti(lv.exit.x,lv.exit.y,70);setExpr(player,'joy',3);
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
  var nx=document.getElementById('nextBtn');var nxt=LEVELS.filter(function(d){return d.id===id+1})[0];nx.textContent=nxt?'Next level':'Back to start';
  showScreen('end')}
function pauseGame(){if(state!=='play')return;state='paused';showScreen('pause');release(player,true);persist()}
function resumeGame(){if(state!=='paused')return;state='play';showScreen(null);input.jumpQ=false}
function toCheckpoint(){if(!L)return;respawnPlayer();resumeGame()}
/* ---------------- UI ---------------- */
var screens=['title','levels','costume','stats','settings','pause','end'];
function showScreen(n){screens.forEach(function(s){document.getElementById(s).classList.toggle('hidden',s!==n)});
  if(n==='levels')buildLevelCards();if(n==='stats')buildStats();if(n==='costume')buildSwatches();if(n==='title')document.getElementById('playBtn').textContent=save.resume?'Continue':'Play'}
var toastEl=document.getElementById('toast'),toastT=null;
function toast(t){toastEl.textContent=t;toastEl.classList.add('show');clearTimeout(toastT);toastT=setTimeout(function(){toastEl.classList.remove('show')},1800)}
function goTitle(){state='title';hud.classList.add('hidden');touchUI.classList.add('hidden');makeShowroom();showScreen('title')}
function makeShowroom(){L=newLevel(LEVELS[0]);player=makePlayer(L,5.2,-0.6);particles=[];floaters=[];camZoom=1;updateCamera(0,true)}
function on(id,fn){document.getElementById(id).addEventListener('click',function(e){SND.unlock();SND.sfx('tap');fn(e)})}
on('playBtn',function(){if(save.resume)startLevel(save.resume.lvl,save.resume);else{var first=LEVELS.filter(function(d){return !(save.best[d.id]&&save.best[d.id].done)})[0]||LEVELS[0];startLevel(first.id)}});
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
on('endLevelsBtn',function(){goTitle();showScreen('levels')});
on('rotateOk',function(){document.getElementById('rotateTip').classList.add('hidden');save.rotDismiss=true;persist()});
var rotShownAt=0;
function updateRotateTip(fresh){var el=document.getElementById('rotateTip');var show=portrait&&isTouch&&state==='play'&&!save.rotDismiss;
  if(show&&fresh){rotShownAt=performance.now();el.classList.remove('hidden')}else if(!show)el.classList.add('hidden')}
function buildLevelCards(){var host=document.getElementById('levelCards');host.innerHTML='';
  LEVELS.forEach(function(d){var b=save.best[d.id];var el=document.createElement('div');el.className='lvCard';
    var stars=b&&b.done?1+(b.prizes>=Math.ceil(b.total*0.6)?1:0)+(b.prizes===b.total?1:0):0;
    el.innerHTML='<canvas width="480" height="270"></canvas><h3>'+d.id+'. '+d.name+'</h3><p>'+d.blurb+'</p><p>'+(b&&b.done?'Best: <b>'+fmt(b.time)+'</b> · Prizes <b>'+b.prizes+'/'+b.total+'</b> · '+'★★★'.slice(0,stars)+'<span style="opacity:.3">'+'★★★'.slice(stars)+'</span>':'Not finished yet')+'</p>'+(b&&b.done?'':'<span class="tag">New!</span>');
    el.addEventListener('click',function(){SND.unlock();SND.sfx('tap');startLevel(d.id)});host.appendChild(el);
    var c=el.querySelector('canvas'),cg=c.getContext('2d');try{var lv=newLevel(d);var sx=d.id===1?27:31,sy=-3.2;renderScene(cg,480,270,1,24,sx,sy,lv,null,1,{noSigns:true})}catch(e){}})}
function buildStats(){var s=save.stats,h=document.getElementById('statsList');var rows=[['Time played',fmt(s.play)],['Levels finished',s.finishes],['Prize bubbles popped',s.prizes],['Jumps',s.jumps],['Grabs',s.grabs],['Boings',s.boings],
  ['Levers pulled',s.levers],['Switches flipped',s.switches],['Soft respawns',s.respawns],['Distance waddled',Math.round(s.dist)+' m']];
  LEVELS.forEach(function(d){var b=save.best[d.id];rows.push([d.name+' best',b&&b.time?fmt(b.time)+' ('+b.prizes+'/'+b.total+')':'-'])});
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
  var s=S*camZoom;renderScene(g,W,H,DPR,s,cam.x+(Math.random()-0.5)*sh,cam.y+(Math.random()-0.5)*sh,L,player,clock)}
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
      seesaw:L.seesaws.map(function(s){return {a:s.body.getAngle(),w:s.body.getAngularVelocity(),wmax:s.wmax}}),launches:L.launches||0,respawns:save.stats.respawns,
      prizes:L.prizes.filter(function(z){return !z.got}).map(function(z){return [z.x,z.y]}),music:SND.vol.music,sfx:SND.vol.sfx,musicGain:SND.musicGain(),fps:fpsA.length?fpsA.length/fpsA.reduce(function(a,b){return a+b},0):0}},
  save:function(){return JSON.parse(localStorage.getItem(SKEY)||'null')},
  start:function(id){startLevel(id)},
  moveObj:function(n,x,y){var o=L.objs.filter(function(q){return q.name===n})[0];o.body.setTransform(V(x,y),0);o.body.setLinearVelocity(V(0,0));o.body.setAwake(true)},
  warp:function(x,y){player.body.setTransform(V(x,y),0);player.body.setLinearVelocity(V(0,0))}
};
})();
