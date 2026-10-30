/* Hushwick v1.0 - a moody platformer. Player physics copied from Bobbin's Button Box v1.7 (same constants, coyote time, jump buffer, variable jump, apex hang, rolling, rope hang/pump, thread swing). */
(function(){
'use strict';
var VERSION='1.0';
var pl=planck,V=pl.Vec2;
// --- Bobbin v1.7 physics constants (unchanged) ---
var PDENS=1.33,G=30,STEP=1/120,R=0.48,JUMP_V=11.2,MAXRUN=6.4;
var CAT={GROUND:1,PLAYER:2,OBJ:4,LEVER:8,HAND:16,ROPE:32};
var cv=document.getElementById('cv'),g=cv.getContext('2d');
var dk=document.createElement('canvas'),dg=dk.getContext('2d');
var W=800,H=450,DPR=1,S=40;
var isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
function $(id){return document.getElementById(id)}
/* ---------------- save ---------------- */
var SKEY='hushwick-save-v1';
var save={music:0.6,sfx:0.8,bright:1,feat:{flicker:1,shake:1,hush:1,gloom:1,hints:1},best:null,bestEmb:0,keeps:{},stats:{plays:0,finishes:0,jumps:0,deaths:0,embers:0,swings:0,stomps:0,dist:0,time:0,hushEsc:0}};
try{var sv=JSON.parse(localStorage.getItem(SKEY)||'null');if(sv&&typeof sv==='object'){for(var k in sv)if(k!=='stats'&&k!=='feat')save[k]=sv[k];if(sv.stats)for(var k2 in sv.stats)save.stats[k2]=sv.stats[k2];if(sv.feat)for(var k3 in sv.feat)save.feat[k3]=sv.feat[k3]}}catch(e){}
function persist(){try{localStorage.setItem(SKEY,JSON.stringify(save))}catch(e){}}
function feat(k){return !!save.feat[k]}
/* ---------------- audio ---------------- */
var SND=(function(){var ac=null,mg,sg,master,noiseBuf,started=false,nextNote=0,heart=0,heartT=0;
  function unlock(){if(!ac){try{ac=new (window.AudioContext||window.webkitAudioContext)()}catch(e){return}master=ac.createGain();master.connect(ac.destination);mg=ac.createGain();sg=ac.createGain();mg.connect(master);sg.connect(master);vol();
      noiseBuf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);var d=noiseBuf.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1}
    if(ac.state==='suspended')ac.resume();if(!started){started=true;drone()}}
  function vol(){if(!ac)return;mg.gain.value=save.music*0.9;sg.gain.value=save.sfx}
  function drone(){var lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=260;lp.Q.value=4;var dgn=ac.createGain();dgn.gain.value=0.16;lp.connect(dgn);dgn.connect(mg);
    [55,55.35,82.4].forEach(function(f,i){var o=ac.createOscillator();o.type=i<2?'sawtooth':'triangle';o.frequency.value=f;var gg=ac.createGain();gg.gain.value=i<2?0.5:0.25;o.connect(gg);gg.connect(lp);o.start()});
    var l=ac.createOscillator();l.frequency.value=0.07;var lg=ac.createGain();lg.gain.value=120;l.connect(lg);lg.connect(lp.frequency);l.start();
    var n=ac.createBufferSource();n.buffer=noiseBuf;n.loop=true;var bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.value=500;bp.Q.value=0.8;var ng=ac.createGain();ng.gain.value=0.05;n.connect(bp);bp.connect(ng);ng.connect(mg);n.start();
    var l2=ac.createOscillator();l2.frequency.value=0.11;var l2g=ac.createGain();l2g.gain.value=300;l2.connect(l2g);l2g.connect(bp.frequency);l2.start()}
  var SCALE=[440,523.25,587.33,622.25,659.25,783.99,880,1046.5,1244.5];
  function box(f,t,v,dest){var o=ac.createOscillator(),o2=ac.createOscillator(),gg=ac.createGain();o.type='sine';o2.type='sine';o.frequency.value=f;o2.frequency.value=f*2.01;var g2=ac.createGain();g2.gain.value=0.25;
    o.connect(gg);o2.connect(g2);g2.connect(gg);gg.connect(dest||mg);gg.gain.setValueAtTime(0,t);gg.gain.linearRampToValueAtTime(v,t+0.005);gg.gain.exponentialRampToValueAtTime(0.0008,t+1.6);o.start(t);o2.start(t);o.stop(t+1.7);o2.stop(t+1.7)}
  function tick(dt,chase,near){if(!ac||!started)return;var t=ac.currentTime;
    if(t>nextNote){var f=SCALE[(Math.random()*SCALE.length)|0]*(Math.random()<0.3?0.5:1);box(f,t+0.02,0.06*(chase?0.6:1));if(Math.random()<0.35)box(f*(Math.random()<0.5?1.189:0.94),t+0.32,0.04);nextNote=t+(chase?0.55:1.3+Math.random()*1.4);if(Math.random()<0.12)nextNote+=2.5}
    if(chase){heartT-=dt;if(heartT<=0){var iv=Math.max(0.32,0.9-near*0.6);heartT=iv;thump(t,0.5);thump(t+0.16,0.35)}}
    if(Math.random()<dt*0.05)sfx('creak')}
  function thump(t,v){var o=ac.createOscillator(),gg=ac.createGain();o.frequency.setValueAtTime(70,t);o.frequency.exponentialRampToValueAtTime(38,t+0.15);gg.gain.setValueAtTime(v*0.6,t);gg.gain.exponentialRampToValueAtTime(0.001,t+0.2);o.connect(gg);gg.connect(mg);o.start(t);o.stop(t+0.22)}
  function nz(t,dur,f,q,v,type,f2){var n=ac.createBufferSource();n.buffer=noiseBuf;var bf=ac.createBiquadFilter();bf.type=type||'bandpass';bf.frequency.setValueAtTime(f,t);if(f2)bf.frequency.exponentialRampToValueAtTime(f2,t+dur);bf.Q.value=q;var gg=ac.createGain();gg.gain.setValueAtTime(v,t);gg.gain.exponentialRampToValueAtTime(0.001,t+dur);n.connect(bf);bf.connect(gg);gg.connect(sg);n.start(t,Math.random());n.stop(t+dur+0.05)}
  function tone(t,f1,f2,dur,v,type){var o=ac.createOscillator(),gg=ac.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+dur);gg.gain.setValueAtTime(v,t);gg.gain.exponentialRampToValueAtTime(0.001,t+dur);o.connect(gg);gg.connect(sg);o.start(t);o.stop(t+dur+0.02)}
  function sfx(n,a){if(!ac||ac.state!=='running')return;var t=ac.currentTime;
    if(n==='jump')tone(t,300,560,0.12,0.12);
    else if(n==='land')nz(t,0.08,300,1,Math.min(0.35,0.05+(a||0)*0.02),'lowpass');
    else if(n==='grab')nz(t,0.05,2200,4,0.15);
    else if(n==='release')tone(t,500,320,0.1,0.08,'triangle');
    else if(n==='ember'){box(1318.5,t,0.12,sg);box(1975.5,t+0.06,0.06,sg)}
    else if(n==='keep'){[659,784,988,1318].forEach(function(f,i){box(f,t+i*0.09,0.12,sg)})}
    else if(n==='lantern'){[220,277,330].forEach(function(f){tone(t,f,f,1.2,0.07,'triangle')});nz(t,0.4,900,1,0.12,'bandpass',300)}
    else if(n==='die'){tone(t,420,60,0.7,0.2,'triangle');nz(t,0.6,600,0.7,0.25,'lowpass',80)}
    else if(n==='creak'){var o=ac.createOscillator(),gg=ac.createGain(),bf=ac.createBiquadFilter();o.type='sawtooth';var f=70+Math.random()*60;o.frequency.setValueAtTime(f,t);o.frequency.linearRampToValueAtTime(f*1.4,t+0.7);bf.type='bandpass';bf.frequency.value=900;bf.Q.value=12;gg.gain.setValueAtTime(0,t);gg.gain.linearRampToValueAtTime(0.05,t+0.2);gg.gain.linearRampToValueAtTime(0,t+0.8);o.connect(bf);bf.connect(gg);gg.connect(sg);o.start(t);o.stop(t+0.85)}
    else if(n==='crumble')nz(t,0.35,400,0.8,0.25,'lowpass',120);
    else if(n==='stomp'){tone(t,200,60,0.25,0.2);nz(t,0.3,1500,2,0.1,'bandpass',400)}
    else if(n==='whisper')nz(t,0.9,2400,6,0.06,'bandpass',1600);
    else if(n==='hush'){nz(t,2.2,180,1,0.4,'lowpass',60);tone(t,98,92,2.2,0.12,'sawtooth')}
    else if(n==='door'){tone(t,90,60,1.2,0.15,'sawtooth');nz(t,1.2,700,8,0.12,'bandpass',300)}
    else if(n==='zip')nz(t,0.15,3000,3,0.12,'bandpass',900)}
  return {unlock:unlock,vol:vol,sfx:sfx,tick:tick}})();
/* ---------------- input ---------------- */
var input={x:0,jump:false,grab:false,jumpQ:false,keys:{},padX:0,touchX:0};
function keyAxis(){var k=input.keys,a=0;if(k.ArrowLeft||k.KeyA)a-=1;if(k.ArrowRight||k.KeyD)a+=1;return a}
function refreshInput(){var ka=keyAxis();input.x=ka!==0?ka:input.touchX?input.touchX:(input.padX||0);
  input.jump=!!(input.keys.Space||input.keys.ArrowUp||input.keys.KeyW||input.touchJump||input.padJump);
  input.grab=!!(input.keys.ShiftLeft||input.keys.ShiftRight||input.keys.KeyX||input.keys.KeyK||input.touchGrab||input.padGrab)}
window.addEventListener('keydown',function(e){if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.code)>=0&&state==='play')e.preventDefault();if(e.repeat)return;
  SND.unlock();input.keys[e.code]=true;
  if((e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW')&&state==='play')input.jumpQ=true;
  if(e.code==='Escape'||e.code==='KeyP'){if(state==='play')pauseGame();else if(state==='pause')resumeGame();else if(curScreen&&curScreen!=='title'&&curScreen!=='finish')back()}
  refreshInput()});
window.addEventListener('keyup',function(e){input.keys[e.code]=false;refreshInput()});
window.addEventListener('blur',function(){input.keys={};input.touchJump=input.touchGrab=false;input.touchX=0;refreshInput();if(state==='play')pauseGame()});
document.addEventListener('visibilitychange',function(){if(document.hidden&&state==='play')pauseGame()});
// touch buttons (multi-touch)
(function(){var map={tL:'l',tR:'r',tJ:'j',tG:'g'},held={};
  function upd(){var l=0,r=0,j=0,gg=0;for(var id in held){var v=held[id];if(v==='l')l=1;if(v==='r')r=1;if(v==='j')j=1;if(v==='g')gg=1}
    input.touchX=r-l;if(j&&!input.touchJump&&state==='play')input.jumpQ=true;input.touchJump=!!j;input.touchGrab=!!gg;
    ['tL','tR','tJ','tG'].forEach(function(id){$(id).classList.toggle('on',Object.keys(held).some(function(k){return held[k]===map[id]}))});refreshInput()}
  function which(x,y){var el=document.elementFromPoint(x,y);while(el&&!map[el.id])el=el.parentElement;return el?map[el.id]:null}
  function tch(e){if(state!=='play')return;e.preventDefault();SND.unlock();held={};for(var i=0;i<e.touches.length;i++){var t=e.touches[i],w=which(t.clientX,t.clientY);if(w)held[t.identifier]=w}upd()}
  var tz=$('touch');['touchstart','touchmove','touchend','touchcancel'].forEach(function(n){document.addEventListener(n,function(e){if(state==='play'&&e.target.closest&&!e.target.closest('button'))tch(e)},{passive:false})});
})();
/* ---------------- gamepad ---------------- */
var PAD={prev:[],on:false,navT:0,f:null};
function padGet(){var ps=null;try{ps=navigator.getGamepads?navigator.getGamepads():null}catch(e){}if(!ps)return null;for(var i=0;i<ps.length;i++){var p=ps[i];if(p&&p.connected!==false&&p.buttons&&p.buttons.length>=4)return p}return null}
function padPoll(dt){var p=padGet();if(!p){if(PAD.on){PAD.on=false;input.padX=0;input.padJump=input.padGrab=false;refreshInput()}return}
  var b=function(i){var x=p.buttons[i];return !!(x&&(x.pressed||x.value>0.5))},pr=PAD.prev,edge=function(i){return b(i)&&!pr[i]};
  var ax=p.axes[0]||0;if(Math.abs(ax)<0.25)ax=0;var ay=p.axes[1]||0;if(Math.abs(ay)<0.4)ay=0;
  var dx=(b(15)?1:0)-(b(14)?1:0)||ax,dy=(b(13)?1:0)-(b(12)?1:0)||ay;
  var any=false;for(var i=0;i<p.buttons.length;i++)if(b(i))any=true;if(any||ax||ay){if(!PAD.on){PAD.on=true}SND.unlock()}
  if(state==='play'){input.padX=dx;if(b(0)&&!pr[0])input.jumpQ=true;input.padJump=b(0);input.padGrab=b(1)||b(2)||b(5)||b(7);if(edge(9)||edge(8))pauseGame();refreshInput()}
  else{input.padX=0;input.padJump=input.padGrab=false;refreshInput();
    PAD.navT-=dt;var items=navItems();if(items.length){if(!PAD.f||items.indexOf(PAD.f)<0)padFocus(items[0]);
      if(PAD.navT<=0&&(dy||dx)){var el=PAD.f;if(el&&el.type==='range'&&dx){var st=parseFloat(el.step)||0.05;el.value=Math.max(+el.min,Math.min(+el.max,+el.value+st*Math.sign(dx)));el.dispatchEvent(new Event('input'))}
        else if(dy||dx){var ix=items.indexOf(el)+Math.sign(dy||dx);ix=(ix+items.length)%items.length;padFocus(items[ix])}PAD.navT=0.2}
      if(!dy&&!dx)PAD.navT=0;
      if(edge(0)&&PAD.f){if(PAD.f.type!=='range')PAD.f.click()}
      if(edge(1)){if(curScreen==='pause')resumeGame();else if(curScreen!=='title'&&curScreen!=='finish')back()}
      if(edge(9)&&curScreen==='pause')resumeGame()}}
  PAD.prev=p.buttons.map(function(x){return !!(x&&(x.pressed||x.value>0.5))})}
function navItems(){var sc=curScreen&&$(curScreen);if(!sc||sc.classList.contains('hidden'))return [];var l=[];sc.querySelectorAll('button,input,a[href]').forEach(function(e){var r=e.getBoundingClientRect();if(r.width>1)l.push(e)});var a=$('a2hs');if(!a.classList.contains('hidden'))l.push($('a2x'));return l}
function padFocus(el){if(PAD.f)PAD.f.classList.remove('padFocus');PAD.f=el;if(el){el.classList.add('padFocus');try{el.scrollIntoView({block:'nearest'})}catch(e){}}}
window.addEventListener('gamepadconnected',function(){toast('🎮 Controller connected')});
/* ---------------- level ---------------- */
var L=null,player=null,state='title',curScreen='title',prevScreen='title',cam={x:0,y:-4,shake:0,sx:0,sy:0};
var LEVEL_W=170;
function buildLevel(){
  var lv={world:new pl.World({gravity:V(0,G)}),solids:[],ropes:[],planks:[],gloom:[],embers:[],keeps:[],lanterns:[],brambles:[],anchors:[],signs:[],deco:[],t:0,cp:0,finished:false,emb:0,kept:0,deaths:0,jumps0:save.stats.jumps,time:0,hush:null,flick:1,dark:0};
  lv.ground=lv.world.createBody({type:'static'});
  var gf={friction:0.7,filterCategoryBits:CAT.GROUND,filterMaskBits:0xFFFF};
  function rect(x,y,w,h,kind){lv.solids.push({x:x,y:y,w:w,h:h,kind:kind||'earth'});lv.ground.createFixture(pl.Box(w/2,h/2,V(x+w/2,y+h/2),0),gf).setUserData({type:'solid'})}
  function ground(a,b){rect(a,0,b-a,6,'earth')}
  function block(x,y,w,h,k){rect(x,y,w,h,k||'stone')}
  function rope(ax,ay,n,sl){var segs=[],prev=lv.ground,rp={ax:ax,ay:ay,segs:segs,sl:sl};
    for(var i=0;i<n;i++){var bd=lv.world.createBody({type:'dynamic',position:V(ax,ay+sl*(i+0.5)),linearDamping:0.15,angularDamping:0.6});
      var f=bd.createFixture(pl.Box(0.06,sl/2),{density:1.4,friction:0.2,filterCategoryBits:CAT.ROPE,filterMaskBits:CAT.HAND});
      f.setUserData({type:'rope',rope:rp,idx:i,grab:true});bd.setUserData({kind:'rope'});
      lv.world.createJoint(pl.RevoluteJoint({},prev,bd,V(ax,ay+sl*i)));segs.push(bd);prev=bd}
    lv.ropes.push(rp)}
  function plank(x,y,w){var bd=lv.world.createBody({type:'static',position:V(x+w/2,y+0.2)});bd.createFixture(pl.Box(w/2,0.2),gf).setUserData({type:'solid'});lv.planks.push({x:x,y:y,w:w,body:bd,t:-1,gone:0,fall:0})}
  function ember(x,y){lv.embers.push({x:x,y:y,got:false,ph:Math.random()*6})}
  function emberRow(x,y,n,dx,arc){for(var i=0;i<n;i++)ember(x+i*(dx||1),y-(arc?Math.sin(i/(n-1)*Math.PI)*arc:0))}
  function lantern(x,y){lv.lanterns.push({x:x,y:y||0,on:lv.lanterns.length===0,fl:Math.random()*6})}
  function gloom(a,b,y){lv.gloom.push({a:a,b:b,x:(a+b)/2,y:y||0,d:1,gone:0,ph:Math.random()*6,blink:0})}
  function bramble(x,w,y){lv.brambles.push({x:x,w:w,y:y||0})}
  function hook(x,y){lv.anchors.push({x:x,y:y})}
  function sign(x,y,t){lv.signs.push({x:x,y:y,t:t})}
  function keep(x,y,n){lv.keeps.push({x:x,y:y,got:!!save.keeps[n],n:n,id:n})}
  // --- The Hollow Lane ---
  lv.spawn={x:3,y:-1};
  ground(-6,20.5);lantern(3);sign(7,-0.1,'Hold jump to leap higher');emberRow(9,-1.2,4,1.2);
  block(14,-1.2,3,1.2);emberRow(14.5,-2.6,3,1);
  // pit 1
  ground(24,42);emberRow(20.2,-2.4,4,1,1.4);
  block(30,-1.4,2.5,1.4);gloom(33,40.5);sign(26,-0.1,'Land on Gloomlings to send them away');emberRow(34,-3,4,1.3);
  block(35.6,-2.9,2.2,0.5,"wood");keep(36.7,-3.9,"k1");
  // rope gap
  rope(44.2,-7.8,10,0.56);sign(41.6,-0.1,'Jump at the rope · tap jump to let go');emberRow(43.6,-1.8,5,1,1.2);
  ground(48,70);lantern(55);gloom(60,68);block(62,-1.2,1.6,1.2);emberRow(63,-2.6,4,1.1);
  // crumbling bridge
  sign(68,-0.1,'Old boards… don\'t linger');for(var i=0;i<6;i++)plank(70.1+i*2,0,1.8);emberRow(71,-1.6,5,2);
  ground(82,100);lantern(84);
  // dark stretch: brambles + ledges + a hook
  bramble(88,2.2);block(90.5,-1.5,3,0.5,"wood");bramble(94,2.5);emberRow(90.8,-2.6,3,1);
  block(96.8,-2.9,2.4,0.5,"wood");keep(98,-3.9,"k2");gloom(95.5,99.5);
  // double rope + hook over long pit
  rope(102.2,-7.8,10,0.56);rope(107.6,-7.8,10,0.56);block(112,-1.5,2.2,0.5,"wood");hook(116.4,-5.2);sign(100,-0.1,'Mid-air: hold Grab near a hook to swing');emberRow(104.6,-2.4,3,1.2,0.8);emberRow(115.4,-3.6,3,0.9);
  ground(118.5,175);lantern(121);
  // the hush chase
  block(128,-1.2,2,1.2);bramble(133.3,1.5);block(138,-1.3,3,1.3);gloom(142.5,147);
  ember(129,-2.6);ember(139.5,-2.8);ember(149,-1.2);
  block(150,-1.5,2,0.5,'wood');keep(151,-2.6,'k3');
  bramble(153.5,1.8);block(157,-1.2,2.5,1.2);
  lv.door={x:163,y:0};lv.hushStart=124;lv.hushStop=149;
  lv.pits=[[20.5,24],[42,48],[70,82],[100,118.5]];
  // deco: dead trees, gravestones, fence posts
  for(var x=-4;x<LEVEL_W;x+=3+Math.random()*5){var inPit=lv.pits.some(function(p){return x>p[0]-0.5&&x<p[1]+0.5});if(!inPit)lv.deco.push({x:x,k:Math.random()<0.25?'stone':Math.random()<0.5?'post':'grass',s:0.7+Math.random()*0.6})}
  return lv}
/* ---------------- player (Bobbin v1.7) ---------------- */
function makePlayer(lv,x,y){var bd=lv.world.createBody({type:'dynamic',position:V(x,y),fixedRotation:false,bullet:true,angularDamping:0.05});
  var f=bd.createFixture(pl.Circle(R),{density:PDENS,friction:0,restitution:0,filterCategoryBits:CAT.PLAYER,filterMaskBits:CAT.GROUND|CAT.OBJ});f.setUserData({type:'player'});
  var hand=bd.createFixture(pl.Circle(R+0.26),{isSensor:true,filterCategoryBits:CAT.HAND,filterMaskBits:CAT.GROUND|CAT.OBJ|CAT.LEVER|CAT.ROPE});hand.setUserData({type:'hand'});
  bd.setUserData({kind:'player'});
  return {body:bd,fix:f,hand:hand,face:1,grounded:false,groundFix:null,groundBody:null,coyote:0,buffer:0,cut:true,grab:null,grabCool:0,catchCool:0,sx:1,sy:1,lastVy:0,airT:0,mass:bd.getMass(),blink:0,blinkT:2,dead:0,thread:null,threadCool:0,spin:0}}
function groundCheck(p){p.grounded=false;p.groundFix=null;p.groundBody=null;var best=-1;
  for(var e=p.body.getContactList();e;e=e.next){var c=e.contact;if(!c.isTouching())continue;var fa=c.getFixtureA(),fb=c.getFixtureB();
    if(fa.isSensor()||fb.isSensor()||!c.isEnabled())continue;var mine=fa===p.fix,other=mine?fb:fa;if(!mine&&fb!==p.fix)continue;
    var wm=c.getWorldManifold(null);if(!wm)continue;var ny=mine?wm.normal.y:-wm.normal.y;
    if(ny>0.55&&ny>best){best=ny;p.grounded=true;p.groundFix=other;p.groundBody=other.getBody();p.gnx=mine?wm.normal.x:-wm.normal.x;p.gny=ny}}}
function grabCandidates(p){var best=null,bs=1e9,pp=p.body.getPosition();
  for(var e=p.body.getContactList();e;e=e.next){var c=e.contact;if(!c.isTouching())continue;var fa=c.getFixtureA(),fb=c.getFixtureB();
    var other=fa===p.hand?fb:fb===p.hand?fa:null;if(!other)continue;var ud=other.getUserData();if(!ud||!ud.grab)continue;
    var pt=closestPoint(other,pp);var dx=pt.x-pp.x,dy=pt.y-pp.y,d=Math.hypot(dx,dy);
    var score=d-(Math.sign(dx)===p.face?0.3:0);if(score<bs){bs=score;best={fix:other,ud:ud,body:other.getBody(),pt:pt}}}
  return best}
function closestPoint(fix,pp){var ud=fix.getUserData(),bd=fix.getBody();
  if(ud&&ud.type==='rope'){var lp=bd.getLocalPoint(pp);var ly=Math.max(-ud.rope.sl/2,Math.min(ud.rope.sl/2,lp.y));return bd.getWorldPoint(V(0,ly))}
  return bd.getPosition()}
function attach(p,c){var lv=L,w=lv.world,pt=c.pt;
  var j=w.createJoint(pl.RevoluteJoint({collideConnected:false},p.body,c.body,pt));
  var gr={joint:j,body:c.body,ud:c.ud,local:c.body.getLocalPoint(pt),mode:'hang',held:input.grab,rj:null,t:0};
  var rp=c.ud.rope;var len=rp.sl*(c.ud.idx+0.5)+Math.hypot(pt.x-p.body.getPosition().x,pt.y-p.body.getPosition().y)+0.25;
  gr.rj=w.createJoint(pl.RopeJoint({maxLength:len,localAnchorA:V(rp.ax,rp.ay),localAnchorB:V(0,0)},lv.ground,p.body));gr.rope=rp;
  p.grab=gr;p.body.setFixedRotation(true);p.body.setAngularVelocity(0);SND.sfx('grab');burst(pt.x,pt.y,'mote',5,'#cfd6ff');p.sx=1.12;p.sy=0.9}
function release(p,quiet){if(!p.grab)return;var w=L.world;p.body.setFixedRotation(false);
  try{w.destroyJoint(p.grab.joint)}catch(e){}if(p.grab.rj)try{w.destroyJoint(p.grab.rj)}catch(e){}
  p.grab=null;p.grabCool=0.12;if(!quiet)SND.sfx('release')}
function approach(v,t,d){return v<t?Math.min(t,v+d):Math.max(t,v-d)}
function updatePlayerCore(p,dt){var b=p.body,v=b.getLinearVelocity(),vx=v.x,vy=v.y,pp=b.getPosition();
  groundCheck(p);
  var wasAir=p.airT>0.06;
  if(p.grounded){if(wasAir){var imp=Math.min(1,Math.max(0,p.lastVy-3)/14);if(p.lastVy>3){p.sy=1-0.36*imp-0.07;p.sx=1+0.34*imp+0.06;SND.sfx('land',p.lastVy);burst(pp.x,pp.y+R,'dust',3+Math.round(imp*6),'#8a8fae');if(p.lastVy>9)kick(Math.min(0.22,(p.lastVy-6)*0.012))}}
    p.coyote=0.1;p.airT=0;p.noCatch=null}else{p.coyote-=dt;p.airT+=dt}
  if(!p.grounded&&Math.abs(vx)<0.35&&Math.abs(vy)<0.35&&!(p.grab&&p.grab.mode==='hang')){p.stuckT=(p.stuckT||0)+dt;if(p.stuckT>0.25)p.coyote=0.1}else p.stuckT=0;
  if(input.jumpQ){p.buffer=0.13;input.jumpQ=false}else p.buffer-=dt;
  p.grabCool-=dt;p.catchCool-=dt;
  var gr=p.grab;
  if(gr){gr.t+=dt;var anc=gr.body.getWorldPoint(gr.local);var dd=Math.hypot(anc.x-pp.x,anc.y-pp.y);
    if(dd>2.2){release(p)}else if(gr.mode==='hang'){if(gr.held&&!input.grab)release(p);else if(!gr.held&&input.grab)gr.held=true}}
  gr=p.grab;
  if(!gr&&input.grab&&p.grabCool<=0){var c=grabCandidates(p);if(c)attach(p,c)}
  else if(!gr&&!p.grounded&&p.catchCool<=0){var c2=grabCandidates(p);if(c2&&c2.ud.type==='rope'&&c2.ud.rope!==p.noCatch)attach(p,c2)}
  gr=p.grab;
  if(input.x>0.2)p.face=1;else if(input.x<-0.2)p.face=-1;
  if(gr&&gr.mode==='hang'){
    var sv=b.getLinearVelocity().x,pm=(input.x*sv>0)?1.1:0.95;b.applyForceToCenter(V(input.x*15*pm*p.mass,0),true);
    if(p.buffer>0){p.noCatch=gr.rope;release(p,true);vx=b.getLinearVelocity().x+input.x*2.5;vy=Math.min(b.getLinearVelocity().y,0)-JUMP_V*0.85;p.buffer=0;p.catchCool=0.4;p.cut=false;p.sy=1.25;p.sx=0.8;save.stats.jumps++;SND.sfx('jump')}
    else{vx=b.getLinearVelocity().x;vy=b.getLinearVelocity().y}
  }else{
    var max=MAXRUN;var tin=input.x*max,target=tin,acc,grip=1;
    var gtx=p.grounded&&p.gny!==undefined?-G*p.gny*p.gnx:0;if(Math.abs(gtx)<0.8)gtx=0;
    if(gtx){vx+=gtx*dt*0.85;if(tin*gtx<0)target*=Math.max(0.55,1-Math.abs(p.gnx)*0.9);else if(tin*gtx>0)target*=1+Math.abs(p.gnx)*0.45}
    if(p.grounded){var same=Math.abs(target)>0.01&&(Math.sign(target)===Math.sign(vx)||Math.abs(vx)<0.3);acc=(same?58:72)*Math.min(1.2,grip);
      if(same&&gtx*vx>0&&Math.abs(vx)>Math.abs(target))acc=8*grip}else acc=36;
    vx=approach(vx,target,acc*dt);
    if(p.buffer>0&&p.coyote>0){var jv=JUMP_V;vy=-jv;p.coyote=0;p.buffer=0;p.cut=false;p.sy=1.28;p.sx=0.78;save.stats.jumps++;SND.sfx('jump');burst(pp.x,pp.y+R,'dust',4,'#8a8fae')}
  }
  var w0=b.getAngularVelocity(),gp=1;
  if(p.grab)b.setAngularVelocity(0);else if(p.grounded){if(wasAir){var slip=w0*R-vx;vx+=Math.max(-2.2,Math.min(2.2,slip*0.3*Math.min(1,gp)))}b.setAngularVelocity(approach(w0,vx/R,90*dt*gp*R*10))}
  else b.setAngularVelocity(w0*(1-dt*0.15)+input.x*7*dt);
  p.spin=b.getAngularVelocity();
  if(!p.cut&&!input.jump&&vy<-2){vy*=0.5;p.cut=true}
  if(vy>=0)p.cut=true;
  if(!(gr&&gr.mode==='hang')){if(vy>0)b.applyForceToCenter(V(0,p.mass*G*(vy>1.5?0.55:0.45)),true);else if(Math.abs(vy)<2.4&&input.jump)b.applyForceToCenter(V(0,-p.mass*G*0.34),true)}
  if(vy>19)vy=19;
  if(!isFinite(vx)||!isFinite(vy)){vx=0;vy=0}
  b.setLinearVelocity(V(vx,vy));
  if(!p.grounded)p.lastVy=vy;else p.lastVy=0;
  p.sx+=(1-p.sx)*Math.min(1,dt*12);p.sy+=(1-p.sy)*Math.min(1,dt*12)}
// thread swing (Bobbin v1.7)
function threadTry(p,pp){if(!L.anchors.length||p.grab||p.thread||p.grounded)return false;var best=null,bd=6.6;
  L.anchors.forEach(function(a){var dx=a.x-pp.x,dy=a.y-pp.y,dd=Math.hypot(dx,dy);if(dy<-0.4&&dd<bd){bd=dd;best=a}});if(!best)return false;
  p.thread={a:best,len:Math.max(1.8,Math.min(5.6,bd)),t:0,shoot:0};SND.sfx('zip');burst(best.x,best.y,'mote',8,'#ffd27a');save.stats.swings++;return true}
function threadRelease(p,fling){var th=p.thread;if(!th)return;p.thread=null;if(fling&&L&&!L.finished){var v=p.body.getLinearVelocity();var sp=Math.hypot(v.x,v.y);var k=sp>2?1.12:1;p.body.setLinearVelocity(V(v.x*k,Math.min(v.y*k,0)-2.6));p.coyote=0;p.buffer=0;p.cut=true;p.sy=1.25;p.sx=0.8;SND.sfx('release')}
  p.threadCool=0.25}
function updatePlayer(p,dt){p.threadCool-=dt;if(input.grab&&!p.g17&&p.threadCool<=0&&!p.thread){if(!grabCandidates(p))threadTry(p,p.body.getPosition())}p.g17=input.grab;
  if(!p.thread){updatePlayerCore(p,dt);return}
  var b=p.body,v0=b.getLinearVelocity(),vx=v0.x,vy=v0.y;updatePlayerCore(p,dt);if(!p.thread)return;
  var pp=b.getPosition(),a=p.thread.a,dx=pp.x-a.x,dy=pp.y-a.y,Ln=Math.hypot(dx,dy)||1,tx=-dy/Ln,ty=dx/Ln;if(tx<0){tx=-tx;ty=-ty}
  var pump=(input.x||0)*10*dt;vx+=tx*pump;vy+=ty*pump;var sp=Math.hypot(vx,vy);if(sp>15){vx*=15/sp;vy*=15/sp}b.setLinearVelocity(V(vx,vy));b.setAngularVelocity(vx/R*0.6)}
function threadPost(dt){var p=player;if(!p||!p.thread)return;var th=p.thread;th.t+=dt;th.shoot=Math.min(1,th.shoot+dt*9);
  if(L.finished||p.dead||p.grab){threadRelease(p,false);return}
  if(!input.grab&&th.t>0.08){threadRelease(p,true);return}if(input.jumpQ||(input.jump&&th.t>0.25&&!th.j0)){threadRelease(p,true);input.jumpQ=false;return}if(!input.jump)th.j0=false;else if(th.t<0.05)th.j0=true;
  if(p.grounded){th.gt=(th.gt||0)+dt;if(th.gt>0.2){threadRelease(p,false);return}}else th.gt=0;
  var b=p.body,pp=b.getPosition(),a=th.a,dx=pp.x-a.x,dy=pp.y-a.y,Ln=Math.hypot(dx,dy);if(Ln>th.len&&Ln>0){var nx=dx/Ln,ny=dy/Ln;b.setTransform(V(a.x+nx*th.len,a.y+ny*th.len),b.getAngle());
    var v=b.getLinearVelocity(),rv=v.x*nx+v.y*ny;if(rv>0)b.setLinearVelocity(V(v.x-rv*nx,v.y-rv*ny))}
  if(input.x===0&&th.len>2.0)th.len=Math.max(2.0,th.len-dt*0.6)}
/* ---------------- particles / fx ---------------- */
var parts=[],floats=[];
function burst(x,y,k,n,col){for(var i=0;i<n;i++){var a=Math.random()*Math.PI*2,s=1+Math.random()*3;parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-(k==='dust'?1:0.5),t:0,life:0.5+Math.random()*0.5,col:col,k:k,r:0.05+Math.random()*0.08})}}
function kick(a){if(feat('shake'))cam.shake=Math.max(cam.shake,a)}
var toastT=0;function toast(t){var e=$('toast');e.textContent=t;e.style.opacity=1;toastT=2.6}
/* ---------------- game flow ---------------- */
function startLevel(){if(L){release(player,true)}L=buildLevel();var sp=L.spawn;player=makePlayer(L,sp.x,sp.y);cam.x=sp.x;cam.y=-4;parts=[];save.stats.plays++;persist();
  showScreen(null);state='play';$('hud').classList.remove('hidden');$('touch').classList.toggle('hidden',!isTouch);hud();
  if(feat('hints'))toast('Find the door at the end of the lane');}
function respawn(){var p=player,lt=L.lanterns[L.cp];if(p.grab)release(p,true);p.thread=null;var b=p.body;b.setTransform(V(lt.x+0.8,lt.y-1.2),0);b.setLinearVelocity(V(0,0));b.setAngularVelocity(0);p.dead=0;p.lastVy=0;p.airT=0;
  L.gloom.forEach(function(g){g.x=(g.a+g.b)/2;g.gone=0});if(L.hush){L.hush=null}L.planks.forEach(function(k){k.t=-1;k.gone=0;k.fall=0;k.body.setActive(true)})}
function die(why){var p=player;if(p.dead||L.finished)return;p.dead=0.0001;L.deaths++;save.stats.deaths++;persist();SND.sfx('die');kick(0.3);var pp=p.body.getPosition();burst(pp.x,pp.y,'mote',16,'#ffcf7a');
  if(p.grab)release(p,true);p.thread=null;if(why==='hush')toast('The Hush caught you… back to the lantern');}
function pauseGame(){if(state!=='play')return;state='pause';showScreen('pause');input.keys={};input.touchX=0;input.touchJump=input.touchGrab=false;refreshInput()}
function resumeGame(){if(state!=='pause')return;state='play';showScreen(null);last=performance.now()}
function finish(){L.finished=true;state='finish';SND.sfx('door');var t=L.time;save.stats.finishes++;save.stats.hushEsc++;if(!save.best||t<save.best)save.best=t;save.bestEmb=Math.max(save.bestEmb,L.emb);persist();
  setTimeout(function(){$('hud').classList.add('hidden');$('touch').classList.add('hidden');var kp=L.keeps.filter(function(k){return k.got}).length;
    $('finTab').innerHTML=row('Time',fmt(t))+row('Best time',fmt(save.best))+row('Embers',L.emb+' / '+L.embers.length)+row('Keepsakes (all-time)',kp+' / 3')+row('Lantern returns',L.deaths);showScreen('finish')},900)}
function row(a,b){return '<tr><td>'+a+'</td><td>'+b+'</td></tr>'}
function fmt(t){if(t==null)return '—';var m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(1)}
function hud(){if(!L)return;$('hEmb').textContent='✦ '+L.emb+'/'+L.embers.length;$('hKeep').textContent='◈ '+L.keeps.filter(function(k){return k.got}).length+'/3';$('hTime').textContent=fmt(L.time).replace(/\.\d$/,'')}
function stepGame(dt){var lv=L,p=player;lv.t+=dt;
  if(p.dead){p.dead+=dt;p.body.setLinearVelocity(V(0,0));if(p.dead>1.1)respawn()}else if(!lv.finished){lv.time+=dt;save.stats.time+=dt;updatePlayer(p,dt)}else p.body.setLinearVelocity(V(0,0));
  var pp=p.body.getPosition();
  // planks
  lv.planks.forEach(function(k){if(k.gone){k.gone-=dt;k.fall+=dt;if(k.gone<=0){k.gone=0;k.fall=0;k.t=-1;k.body.setActive(true)}return}
    if(k.t<0&&p.grounded&&p.groundBody===k.body){k.t=0.45;SND.sfx('creak')}if(k.t>=0){k.t-=dt;if(k.t<0){k.gone=4;k.fall=0;k.body.setActive(false);SND.sfx('crumble');burst(k.x+k.w/2,k.y,'dust',6,'#5a4a3a')}}});
  lv.world.step(dt,10,6);
  threadPost(dt);
  pp=p.body.getPosition();
  if(!p.dead&&!lv.finished){
    if(pp.y>3)die('fall');
    lv.brambles.forEach(function(b){if(pp.x>b.x-0.15&&pp.x<b.x+b.w+0.15&&pp.y>b.y-0.95-0.0&&pp.y<b.y+0.5)die('bramble')});
    var pv=p.body.getLinearVelocity();
    if(feat('gloom'))lv.gloom.forEach(function(gl){if(gl.gone>0)return;var gy=gl.y-0.55,dx=pp.x-gl.x,dy=pp.y-gy,d=Math.hypot(dx,dy);if(d<R+0.5){if(pv.y>0.5&&dy<-0.3){gl.gone=5;p.body.setLinearVelocity(V(pv.x,-JUMP_V*0.85));p.cut=false;p.sy=1.3;p.sx=0.75;save.stats.stomps++;SND.sfx('stomp');burst(gl.x,gy,'shadow',14,'#11131f');kick(0.12)}else die('gloom')}});
    lv.embers.forEach(function(e){if(!e.got&&Math.hypot(pp.x-e.x,pp.y-e.y)<0.75){e.got=true;lv.emb++;save.stats.embers++;SND.sfx('ember');burst(e.x,e.y,'mote',6,'#ffd27a');hud()}});
    lv.keeps.forEach(function(k){if(!k.got&&Math.hypot(pp.x-k.x,pp.y-k.y)<0.9){k.got=true;save.keeps[k.n]=1;persist();SND.sfx('keep');toast('◈ Keepsake found! ('+lv.keeps.filter(function(q){return q.got}).length+'/3)');burst(k.x,k.y,'mote',14,'#bfe3ff');hud()}});
    lv.lanterns.forEach(function(l,i){if(i>lv.cp&&pp.x>l.x-0.6){lv.cp=i;l.on=true;SND.sfx('lantern');toast('🏮 Lantern lit');burst(l.x,l.y-1.6,'mote',10,'#ffcf7a')}});
    if(pp.x>lv.door.x-0.6&&pp.y>-2)finish();
    // the hush
    if(feat('hush')){if(!lv.hush&&!lv.hushDone&&pp.x>lv.hushStart&&lv.cp>=3){lv.hush={x:pp.x-7.5,v:2.6,t:0};SND.sfx('hush');kick(0.25);toast('It’s gone quiet… RUN!')}
      if(lv.hush){var h=lv.hush;h.t+=dt;h.v=Math.min(4.6,2.6+h.t*0.45);var gap=pp.x-h.x;if(gap>14)h.v+=3;h.x+=h.v*dt;if(h.x>lv.hushStop){h.x=lv.hushStop}if(pp.x<h.x+0.4)die('hush');if(pp.x>lv.hushStop+3&&!lv.hushDone){lv.hushDone=true}}}
  }
  if(lv.hush&&lv.hushDone){lv.hush.fade=(lv.hush.fade||0)+dt}
  // gloomlings
  lv.gloom.forEach(function(gl){gl.ph+=dt;if(gl.gone>0){gl.gone-=dt;return}var sp=1.5;var near=Math.abs(pp.x-gl.x)<6&&Math.abs(pp.y-gl.y)<4;if(near)sp=2.1;gl.x+=gl.d*sp*dt;if(gl.x>gl.b){gl.x=gl.b;gl.d=-1}if(gl.x<gl.a){gl.x=gl.a;gl.d=1}
    if(near&&Math.random()<dt*0.3)SND.sfx('whisper')});
  // flicker / darkness
  lv.flick=1;if(feat('flicker')){var dsec=pp.x>84&&pp.x<100;var f=Math.sin(lv.t*13)*Math.sin(lv.t*3.1);if(dsec){var cyc=(lv.t%5);lv.flick=cyc<0.7?0.25+Math.random()*0.3:1}else if(f>0.93)lv.flick=0.65}
  // particles
  for(var i=parts.length-1;i>=0;i--){var q=parts[i];q.t+=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=(q.k==='dust'?6:q.k==='shadow'?-3:-1)*dt;q.vx*=0.98;if(q.t>q.life)parts.splice(i,1)}
  save.stats.dist+=Math.abs(p.body.getLinearVelocity().x)*dt;
}
/* ---------------- rendering ---------------- */
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);W=window.innerWidth;H=window.innerHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);dk.width=Math.round(W/2);dk.height=Math.round(H/2);S=H/12.5;if(W/S<16)S=W/16}
window.addEventListener('resize',resize);resize();
var stars=[];for(var i=0;i<90;i++)stars.push([Math.random(),Math.random()*0.6,Math.random()]);
var trees=[];for(var i2=0;i2<40;i2++)trees.push({x:i2*9+Math.random()*6,h:5+Math.random()*5,s:Math.random()});
function wx(x){return (x-cam.x)*S+W/2+cam.sx}
function wy(y){return (y-cam.y)*S+H*0.58+cam.sy}
function render(t){var lv=L;g.setTransform(DPR,0,0,DPR,0,0);
  // sky
  var sk=g.createLinearGradient(0,0,0,H);sk.addColorStop(0,'#0c1230');sk.addColorStop(0.6,'#1a2348');sk.addColorStop(1,'#2a3358');g.fillStyle=sk;g.fillRect(0,0,W,H);
  var cx=lv?cam.x:t*0.5;
  stars.forEach(function(s){var a=0.3+0.5*Math.abs(Math.sin(t*0.7+s[2]*20));g.fillStyle='rgba(220,226,255,'+a+')';g.fillRect(((s[0]*W*1.3-cx*2)%(W*1.3)+W*1.3)%(W*1.3)-W*0.15,s[1]*H,1.5,1.5)});
  // moon (pale, cool)
  var mx=W*0.78-cx*0.6%40,my=H*0.2;var mgr=g.createRadialGradient(mx,my,0,mx,my,H*0.3);mgr.addColorStop(0,'rgba(220,230,255,0.35)');mgr.addColorStop(1,'rgba(220,230,255,0)');g.fillStyle=mgr;g.fillRect(0,0,W,H);
  g.fillStyle='#e6ebff';g.beginPath();g.arc(mx,my,H*0.06,0,7);g.fill();g.fillStyle='#c9d1ef';g.beginPath();g.arc(mx-H*0.015,my-H*0.01,H*0.012,0,7);g.arc(mx+H*0.02,my+H*0.018,H*0.008,0,7);g.fill();
  // far hills + dead trees (parallax)
  [[0.15,'#141a36',0.62],[0.35,'#0f1430',0.7]].forEach(function(L2,li){var par=L2[0];g.fillStyle=L2[1];g.beginPath();g.moveTo(0,H);for(var x=0;x<=W+20;x+=20){var wx2=x/S+cx*par;g.lineTo(x,H*L2[2]+Math.sin(wx2*0.25+li)*S*0.8+Math.sin(wx2*0.07)*S*1.2)}g.lineTo(W,H);g.fill();
    trees.forEach(function(tr){var x=((tr.x*S*(li?1.4:1)-cx*S*par)%(W+400)+W+400)%(W+400)-200;if((tr.s>0.5)!==(li===1))return;var base=H*L2[2]+S*0.3;drawTree(x,base,tr.h*S*(li?0.55:0.4),L2[1])})});
  // house silhouette with one window
  var hx=(1200-cx*S*0.3)%(W*3);if(hx<-300)hx+=W*3;g.fillStyle='#0b0f26';g.fillRect(hx,H*0.38,S*4,S*4);g.beginPath();g.moveTo(hx-S*0.5,H*0.38);g.lineTo(hx+S*2,H*0.38-S*2);g.lineTo(hx+S*4.5,H*0.38);g.fill();
  var wf=0.4+0.3*Math.sin(t*1.7)*Math.sin(t*0.37);g.fillStyle='rgba(180,200,255,'+wf+')';g.fillRect(hx+S*1.6,H*0.38+S*1,S*0.8,S*1);
  // light fog bands (behind the world, never over the character)
  for(var f=0;f<3;f++){var fy=H*(0.55+f*0.12),fo=g.createLinearGradient(0,fy-S,0,fy+S);fo.addColorStop(0,'rgba(170,185,230,0)');fo.addColorStop(0.5,'rgba(170,185,230,0.06)');fo.addColorStop(1,'rgba(170,185,230,0)');g.fillStyle=fo;g.fillRect(0,fy-S,W,S*2)}
  if(!lv)return;
  var wl=cam.x-W/2/S-3,wr=cam.x+W/2/S+3;
  // deco
  lv.deco.forEach(function(d){if(d.x<wl||d.x>wr)return;var x=wx(d.x),y=wy(0);if(d.k==='stone'){g.fillStyle='#232842';rr(x-S*0.35*d.s,y-S*0.9*d.s,S*0.7*d.s,S*0.9*d.s,S*0.3*d.s);g.fill();g.fillStyle='#2e3454';g.fillRect(x-S*0.18*d.s,y-S*0.6*d.s,S*0.36*d.s,S*0.06)}
    else if(d.k==='post'){g.fillStyle='#1d2038';g.fillRect(x-S*0.06,y-S*1.1*d.s,S*0.12,S*1.1*d.s);g.fillRect(x-S*0.6,y-S*0.8*d.s,S*1.2,S*0.08)}
    else{g.strokeStyle='#2c3a4a';g.lineWidth=1.5;g.beginPath();for(var i=-2;i<=2;i++){g.moveTo(x+i*3,y);g.quadraticCurveTo(x+i*4,y-S*0.3,x+i*5+Math.sin(t*1.5+d.x)*2,y-S*0.45*d.s)}g.stroke()}});
  // solids
  lv.solids.forEach(function(s){if(s.x+s.w<wl||s.x>wr)return;var x=wx(s.x),y=wy(s.y),w=s.w*S,h=s.h*S;
    if(s.kind==='earth'){var gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,'#2b2f4a');gr.addColorStop(0.3,'#1a1d33');gr.addColorStop(1,'#0c0e1c');g.fillStyle=gr;g.fillRect(x,y,w,h);g.fillStyle='#3a4a5e';rr(x,y-2,w,S*0.18,4);g.fill();
      g.fillStyle='rgba(120,140,170,0.15)';for(var k=0;k<w;k+=S*0.9){g.fillRect(x+k+((s.x*7+k)%13),y+S*0.6+((k*3)%S),3,3)}}
    else if(s.kind==='wood'){g.fillStyle='#3b3040';rr(x,y,w,h,4);g.fill();g.fillStyle='#4a3d50';g.fillRect(x+2,y+2,w-4,2);g.strokeStyle='#241c2a';g.lineWidth=1;for(var k2=S*0.8;k2<w;k2+=S*0.8){g.beginPath();g.moveTo(x+k2,y);g.lineTo(x+k2,y+h);g.stroke()}g.fillStyle='#1c1520';g.fillRect(x+w*0.15,y+h,3,S*0.3);g.fillRect(x+w*0.8,y+h,3,S*0.3)}
    else{g.fillStyle='#262a40';rr(x,y,w,h,6);g.fill();g.fillStyle='#343a56';rr(x,y,w,S*0.16,4);g.fill();g.strokeStyle='#1a1d30';g.lineWidth=1;g.strokeRect(x+w*0.1,y+h*0.4,w*0.35,h*0.3)}});
  // pit thorns
  lv.pits.forEach(function(pt){if(pt[1]<wl||pt[0]>wr)return;var y=wy(2.8);g.fillStyle='#120f1e';for(var x=pt[0];x<pt[1];x+=0.5){g.beginPath();g.moveTo(wx(x),y+S);g.lineTo(wx(x+0.25),y-S*0.5);g.lineTo(wx(x+0.5),y+S);g.fill()}});
  // brambles
  lv.brambles.forEach(function(b){if(b.x+b.w<wl||b.x>wr)return;var y=wy(b.y);g.strokeStyle='#2a1f3a';g.lineWidth=2.5;g.beginPath();for(var x=b.x;x<=b.x+b.w;x+=0.3){var hh=0.5+0.3*Math.sin(x*7);g.moveTo(wx(x),y);g.quadraticCurveTo(wx(x+0.2),wy(-hh*0.6),wx(x+0.1+Math.sin(t+x)*0.05),wy(-hh))}g.stroke();
    g.fillStyle='rgba(170,120,255,'+(0.35+0.25*Math.sin(t*3+b.x))+')';for(var x2=b.x+0.15;x2<b.x+b.w;x2+=0.45){g.beginPath();g.moveTo(wx(x2),wy(-0.75));g.lineTo(wx(x2+0.08),wy(-0.55));g.lineTo(wx(x2-0.08),wy(-0.55));g.fill()}});
  // planks
  lv.planks.forEach(function(k){if(k.x>wr||k.x+k.w<wl)return;var dy=k.gone?k.fall*k.fall*12:0;if(dy>8)return;var sh=k.t>=0?(Math.random()-0.5)*0.08:0;var x=wx(k.x+sh),y=wy(k.y+dy);g.save();g.translate(x+k.w*S/2,y);g.rotate(k.gone?k.fall*0.8*(k.x%2?1:-1):0);
    g.fillStyle=k.t>=0?'#5a4258':'#43344a';rr(-k.w*S/2,0,k.w*S,S*0.4,3);g.fill();g.fillStyle='#2a2030';g.fillRect(-k.w*S/2+4,S*0.15,k.w*S-8,1.5);g.restore()});
  // ropes
  lv.ropes.forEach(function(rp){if(rp.ax+7<wl||rp.ax-7>wr)return;g.strokeStyle='#8a7f72';g.lineWidth=Math.max(2,S*0.09);g.lineCap='round';g.beginPath();g.moveTo(wx(rp.ax),wy(rp.ay));rp.segs.forEach(function(s){var q=s.getWorldPoint(V(0,rp.sl/2));g.lineTo(wx(q.x),wy(q.y))});g.stroke();
    g.fillStyle='#2a2d40';g.fillRect(wx(rp.ax)-S*0.6,wy(rp.ay)-S*0.25,S*1.2,S*0.25)});
  // hooks
  var p=player,pp=p.body.getPosition();
  lv.anchors.forEach(function(a){var x=wx(a.x),y=wy(a.y);g.strokeStyle='#4a4e66';g.lineWidth=2;g.beginPath();g.moveTo(x,y-S*7);g.lineTo(x,y-S*0.3);g.stroke();g.strokeStyle='#b8bcd6';g.lineWidth=S*0.1;g.beginPath();g.arc(x,y,S*0.3,Math.PI*1.1,Math.PI*2.4);g.stroke();
    var inR=!p.grounded&&!p.thread&&Math.hypot(a.x-pp.x,a.y-pp.y)<6.6&&a.y<pp.y-0.4;if(inR){g.strokeStyle='rgba(255,210,122,'+(0.5+0.4*Math.sin(t*6))+')';g.lineWidth=2;g.beginPath();g.arc(x,y,S*0.6,0,7);g.stroke()}});
  if(p.thread){var a=p.thread.a;g.strokeStyle='rgba(255,236,200,0.9)';g.lineWidth=2;g.beginPath();g.moveTo(wx(a.x),wy(a.y));g.lineTo(wx(a.x+(pp.x-a.x)*p.thread.shoot),wy(a.y+(pp.y-a.y)*p.thread.shoot));g.stroke()}
  // lanterns
  lv.lanterns.forEach(function(l){if(l.x<wl||l.x>wr)return;var x=wx(l.x),y=wy(l.y);g.fillStyle='#1e2134';g.fillRect(x-3,y-S*2.2,6,S*2.2);g.fillRect(x-S*0.1,y-S*2.2,S*0.5,4);
    g.fillStyle=l.on?'#ffcf7a':'#3a3f5a';rr(x+S*0.2,y-S*2.1,S*0.42,S*0.55,4);g.fill();g.strokeStyle='#14162a';g.lineWidth=2;g.stroke()});
  // door
  var d=lv.door;if(d.x<wr+3){var x=wx(d.x),y=wy(0);g.fillStyle='#0d0f1e';g.fillRect(x-S*2,y-S*6,S*5,S*6);g.fillStyle='#2e2438';rr(x-S*0.8,y-S*2.6,S*1.6,S*2.6,S*0.8);g.fill();g.fillStyle='rgba(255,214,140,'+(0.5+0.2*Math.sin(t*2))+')';g.fillRect(x-S*0.6,y-S*0.1,S*1.2,S*0.1);g.fillStyle='#c9a76a';g.beginPath();g.arc(x+S*0.45,y-S*1.2,S*0.08,0,7);g.fill()}
  // embers + keepsakes
  lv.embers.forEach(function(e){if(e.got||e.x<wl||e.x>wr)return;var x=wx(e.x),y=wy(e.y+Math.sin(t*2+e.ph)*0.08),r=S*0.16;g.fillStyle='rgba(255,190,90,0.25)';g.beginPath();g.arc(x,y,r*2.2,0,7);g.fill();g.fillStyle='#ffd27a';g.beginPath();g.moveTo(x,y-r*1.4);g.lineTo(x+r,y);g.lineTo(x,y+r*1.4);g.lineTo(x-r,y);g.fill()});
  lv.keeps.forEach(function(k){if(k.x<wl||k.x>wr)return;var x=wx(k.x),y=wy(k.y+Math.sin(t*1.5)*0.1);g.globalAlpha=k.got?0.25:1;g.fillStyle='rgba(190,225,255,0.25)';g.beginPath();g.arc(x,y,S*0.5,0,7);g.fill();g.fillStyle='#e8eefc';rr(x-S*0.24,y-S*0.3,S*0.48,S*0.6,S*0.08);g.fill();g.fillStyle='#6a7090';g.beginPath();g.arc(x,y-S*0.05,S*0.12,0,7);g.fill();g.globalAlpha=1});
  // gloomling bodies (dark shapes)
  lv.gloom.forEach(function(gl){if(gl.x<wl||gl.x>wr||gl.gone>0||!feat('gloom'))return;var x=wx(gl.x),y=wy(gl.y),wob=Math.sin(gl.ph*5)*0.06;g.fillStyle='#07080f';g.beginPath();g.moveTo(x-S*0.55,y);
    for(var i=0;i<=8;i++){var a=Math.PI+i/8*Math.PI;g.lineTo(x+Math.cos(a)*S*(0.52+wob),y-S*0.25+Math.sin(a)*S*(0.75+(i%2)*0.08))}g.lineTo(x+S*0.55,y);for(var j=0;j<5;j++){g.lineTo(x+S*0.55-j*S*0.22-S*0.11,y-S*0.12*(j%2))}g.fill()});
  // particles
  parts.forEach(function(q){var a=1-q.t/q.life;g.globalAlpha=Math.max(0,a);g.fillStyle=q.col;g.beginPath();g.arc(wx(q.x),wy(q.y),q.r*S,0,7);g.fill()});g.globalAlpha=1;
  // the hush (wall of dark)
  if(lv.hush){var h=lv.hush,hx=wx(h.x),fa=Math.max(0,1-(h.fade||0));g.globalAlpha=fa;var hg=g.createLinearGradient(hx-S*3,0,hx+S*1.2,0);hg.addColorStop(0,'rgba(2,2,6,1)');hg.addColorStop(0.7,'rgba(2,2,6,0.95)');hg.addColorStop(1,'rgba(2,2,6,0)');g.fillStyle=hg;g.fillRect(0,0,Math.max(0,hx+S*1.2),H);
    g.fillStyle='#020206';for(var i3=0;i3<9;i3++){var ty=H*i3/8,tl=S*(0.6+0.5*Math.sin(t*4+i3*1.7));g.beginPath();g.arc(hx+tl*0.6,ty,S*0.45,0,7);g.fill()}g.globalAlpha=1}
  // ---- darkness overlay ----
  var bright=save.bright,base=Math.max(0.35,Math.min(0.9,0.8-(bright-1)*0.5));var dkA=base+(1-lv.flick)*0.15;
  var dw=dk.width,dh=dk.height,ks=dw/W;dg.globalCompositeOperation='source-over';dg.clearRect(0,0,dw,dh);dg.fillStyle='rgba(3,4,12,'+dkA+')';dg.fillRect(0,0,dw,dh);dg.globalCompositeOperation='destination-out';
  function hole(x,y,r,a){var gr=dg.createRadialGradient(x*ks,y*ks,0,x*ks,y*ks,r*ks);gr.addColorStop(0,'rgba(0,0,0,'+a+')');gr.addColorStop(0.55,'rgba(0,0,0,'+(a*0.6)+')');gr.addColorStop(1,'rgba(0,0,0,0)');dg.fillStyle=gr;dg.beginPath();dg.arc(x*ks,y*ks,r*ks,0,7);dg.fill()}
  var pf=p.dead?Math.max(0,1-p.dead*1.5):1;var fl=(0.92+0.08*Math.sin(t*17)*Math.sin(t*7.3))*lv.flick;
  hole(wx(pp.x),wy(pp.y)-S*0.4,S*4.6*fl*pf+S*0.6,1);
  lv.lanterns.forEach(function(l){if(l.on&&l.x>wl-6&&l.x<wr+6){var lf=feat('flicker')?(0.85+0.15*Math.sin(t*9+l.fl)*Math.sin(t*2.3+l.fl)):1;hole(wx(l.x+0.4),wy(l.y-1.8),S*4.2*lf*(0.6+0.4*lv.flick),0.95)}});
  lv.embers.forEach(function(e){if(!e.got&&e.x>wl&&e.x<wr)hole(wx(e.x),wy(e.y),S*0.9,0.7)});
  lv.keeps.forEach(function(k){if(!k.got&&k.x>wl&&k.x<wr)hole(wx(k.x),wy(k.y),S*1.2,0.6)});
  lv.brambles.forEach(function(b){if(b.x>wl-3&&b.x<wr)for(var x=b.x;x<b.x+b.w;x+=0.8)hole(wx(x+0.3),wy(-0.5),S*0.8,0.35)});
  if(d.x<wr+3)hole(wx(d.x),wy(-0.4),S*2,0.6);
  hole(mx,my,H*0.12,0.6);
  g.drawImage(dk,0,0,W,H);
  // signs
  if(feat('hints'))lv.signs.forEach(function(s){if(s.x<wl||s.x>wr)return;var x=wx(s.x),y=wy(s.y);g.fillStyle='#2c2436';g.fillRect(x-2,y-S*1.3,4,S*1.3);g.font='700 '+Math.round(S*0.32)+'px ui-rounded,system-ui,sans-serif';g.textAlign='center';var tw=g.measureText(s.t).width+S*0.5;g.fillStyle='rgba(40,34,56,0.85)';rr(x-tw/2,y-S*1.9,tw,S*0.62,6);g.fill();g.fillStyle='#cfc8e2';g.fillText(s.t,x,y-S*1.48)});
  // warm candle tint near the player (subtle, not red)
  var wg=g.createRadialGradient(wx(pp.x),wy(pp.y),0,wx(pp.x),wy(pp.y),S*3);wg.addColorStop(0,'rgba(255,214,150,'+(0.10*pf)+')');wg.addColorStop(1,'rgba(255,214,150,0)');g.fillStyle=wg;g.fillRect(wx(pp.x)-S*3,wy(pp.y)-S*3,S*6,S*6);
  // gloomling eyes glow through the dark
  lv.gloom.forEach(function(gl){if(gl.x<wl||gl.x>wr||gl.gone>0||!feat('gloom'))return;gl.blink-=1/60;var open=(Math.sin(gl.ph*0.9)>-0.95)?1:0.15;var x=wx(gl.x),y=wy(gl.y-0.75),lk=Math.max(-1,Math.min(1,(pp.x-gl.x)/3))*S*0.08;
    g.fillStyle='rgba(200,230,255,0.95)';[-1,1].forEach(function(s){g.beginPath();g.ellipse(x+s*S*0.17+lk,y,S*0.09,S*0.11*open,0,0,7);g.fill()})});
  if(lv.hush){var h2=lv.hush,hx2=wx(h2.x),fa2=Math.max(0,1-(h2.fade||0));for(var e2=0;e2<7;e2++){var ex=hx2-S*(0.6+((e2*37)%5)*0.5),ey=H*(0.15+e2*0.12)+Math.sin(t*1.3+e2)*S*0.2,o2=Math.sin(t*0.8+e2*2.1)>-0.3?1:0.1;g.fillStyle='rgba(225,235,255,'+(0.85*fa2)+')';
    g.beginPath();g.ellipse(ex,ey,S*0.12,S*0.07*o2,0,0,7);g.ellipse(ex+S*0.4,ey,S*0.12,S*0.07*o2,0,0,7);g.fill()}}
  // ---- player: drawn last, crisp, never under fog or darkness ----
  drawWick(p,t,pf);
}
function rr(x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function drawTree(x,base,h,col){g.strokeStyle=col;g.lineCap='round';g.lineWidth=h*0.06;g.beginPath();g.moveTo(x,base);g.lineTo(x,base-h);g.stroke();g.lineWidth=h*0.025;g.beginPath();
  g.moveTo(x,base-h*0.6);g.lineTo(x-h*0.3,base-h*0.9);g.moveTo(x,base-h*0.75);g.lineTo(x+h*0.25,base-h*1.05);g.moveTo(x-h*0.18,base-h*0.78);g.lineTo(x-h*0.3,base-h*0.7);g.moveTo(x,base-h*0.9);g.lineTo(x+h*0.1,base-h*1.15);g.stroke()}
function drawWick(p,t,pf){var b=p.body,pp=b.getPosition(),x=wx(pp.x),y=wy(pp.y),r=R*S;if(pf<=0)return;g.save();g.globalAlpha=pf;g.translate(x,y);
  var sx=p.sx,sy=p.sy;g.translate(0,r*(1-sy));g.scale(sx,sy);
  // body: smooth rounded wax ball
  var bg=g.createRadialGradient(-r*0.35,-r*0.4,r*0.1,0,0,r*1.05);bg.addColorStop(0,'#fffaf0');bg.addColorStop(0.6,'#efe6d4');bg.addColorStop(1,'#c9bda6');g.fillStyle=bg;g.beginPath();g.arc(0,0,r,0,7);g.fill();
  g.lineWidth=Math.max(1.5,r*0.06);g.strokeStyle='#8f8470';g.stroke();
  // wax drip that rolls with the spin
  var ang=b.getAngle();g.save();g.rotate(ang);g.fillStyle='#fffdf6';g.beginPath();g.ellipse(r*0.55,-r*0.45,r*0.13,r*0.22,0.6,0,7);g.fill();g.restore();
  // face
  var lk=p.face*r*0.12;p.blinkT-=1/60;if(p.blinkT<0){p.blink=0.12;p.blinkT=2+Math.random()*3}if(p.blink>0)p.blink-=1/60;var eh=p.blink>0?0.15:1;
  g.fillStyle='#222238';[-1,1].forEach(function(s){g.beginPath();g.ellipse(lk+s*r*0.3,r*0.05,r*0.11,r*0.16*eh,0,0,7);g.fill()});
  if(eh===1){g.fillStyle='#fff';[-1,1].forEach(function(s){g.beginPath();g.arc(lk+s*r*0.3+r*0.04,r*0.0,r*0.045,0,7);g.fill()})}
  g.fillStyle='rgba(255,170,150,0.35)';[-1,1].forEach(function(s){g.beginPath();g.ellipse(lk+s*r*0.52,r*0.3,r*0.12,r*0.07,0,0,7);g.fill()});
  g.strokeStyle='#222238';g.lineWidth=Math.max(1.2,r*0.05);g.beginPath();var scared=L&&L.hush&&!L.hushDone;if(scared){g.ellipse(lk,r*0.38,r*0.08,r*0.1,0,0,7)}else{g.arc(lk,r*0.28,r*0.12,0.2,Math.PI-0.2)}g.stroke();
  // wick + flame (flame leans against motion)
  var v=b.getLinearVelocity();g.strokeStyle='#2a2230';g.lineWidth=Math.max(1.5,r*0.07);g.beginPath();g.moveTo(0,-r);g.lineTo(0,-r*1.22);g.stroke();
  var lean=Math.max(-0.6,Math.min(0.6,-v.x*0.06)),fh=r*(0.62+0.08*Math.sin(t*23)+0.05*Math.sin(t*37));g.save();g.translate(0,-r*1.2);g.rotate(lean);
  var fg=g.createRadialGradient(0,-fh*0.4,0,0,-fh*0.4,fh*1.4);fg.addColorStop(0,'rgba(255,220,150,0.45)');fg.addColorStop(1,'rgba(255,220,150,0)');g.fillStyle=fg;g.beginPath();g.arc(0,-fh*0.4,fh*1.4,0,7);g.fill();
  g.fillStyle='#ffb54a';g.beginPath();g.moveTo(0,-fh);g.quadraticCurveTo(r*0.26,-fh*0.35,0,0);g.quadraticCurveTo(-r*0.26,-fh*0.35,0,-fh);g.fill();
  g.fillStyle='#fff3c4';g.beginPath();g.moveTo(0,-fh*0.6);g.quadraticCurveTo(r*0.12,-fh*0.2,0,0);g.quadraticCurveTo(-r*0.12,-fh*0.2,0,-fh*0.6);g.fill();g.restore();
  g.restore()}
function updateCam(dt){if(!L)return;var pp=player.body.getPosition(),v=player.body.getLinearVelocity();var tx=pp.x+Math.max(-2,Math.min(2,v.x*0.3)),ty=Math.min(-2.5,pp.y-1.2);
  cam.x+=(tx-cam.x)*Math.min(1,dt*5);cam.y+=(ty-cam.y)*Math.min(1,dt*3);var minX=-6+W/2/S;if(cam.x<minX)cam.x=minX;
  if(cam.shake>0){cam.shake-=dt;var m=cam.shake*S;cam.sx=(Math.random()-0.5)*m;cam.sy=(Math.random()-0.5)*m}else{cam.sx=cam.sy=0}}
/* ---------------- menus ---------------- */
function showScreen(n){['title','how','stats','settings','pause','finish'].forEach(function(id){$(id).classList.toggle('hidden',id!==n)});if(n&&n!==curScreen)prevScreen=curScreen||prevScreen;curScreen=n;padFocus(null);if(n==='stats')fillStats();if(n==='settings')fillSettings()}
var backTo='title';
function go(n){backTo=curScreen;showScreen(n)}
function back(){showScreen(backTo==='pause'?'pause':'title');if(backTo!=='pause')backTo='title'}
function fillStats(){var s=save.stats;$('stTab').innerHTML=row('Plays',s.plays)+row('Escapes (finishes)',s.finishes)+row('Best time',fmt(save.best))+row('Most embers in a run',save.bestEmb+' / '+EMB_TOTAL)+row('Keepsakes found',Object.keys(save.keeps).length+' / 3')+row('Jumps',s.jumps)+row('Thread swings',s.swings)+row('Gloomlings stomped',s.stomps)+row('Lantern returns',s.deaths)+row('Embers collected',s.embers)+row('Distance rolled',Math.round(s.dist)+' m')+row('Time played',fmt(s.time).replace(/\.\d$/,''))}
var FEATS=[['flicker','Flickering lights'],['shake','Screen shake'],['hush','The Hush (chase at the end)'],['gloom','Gloomlings'],['hints','Hint signs']];
function fillSettings(){$('sMus').value=save.music;$('sSfx').value=save.sfx;$('sBri').value=save.bright;var f=$('feats');f.innerHTML='';
  FEATS.forEach(function(F){var d=document.createElement('div');d.className='row';d.innerHTML='<span>'+F[1]+'</span>';var b=document.createElement('button');b.className='sw'+(feat(F[0])?' on':'');b.textContent=feat(F[0])?'On':'Off';
    b.onclick=function(){save.feat[F[0]]=feat(F[0])?0:1;persist();b.className='sw'+(feat(F[0])?' on':'');b.textContent=feat(F[0])?'On':'Off';if(F[0]==='hush'&&!feat('hush')&&L)L.hush=null};d.appendChild(b);f.appendChild(d)})}
$('sMus').oninput=function(){save.music=+this.value;SND.vol();persist()};$('sSfx').oninput=function(){save.sfx=+this.value;SND.vol();persist()};$('sBri').oninput=function(){save.bright=+this.value;applyBright();persist()};
function applyBright(){cv.style.filter=save.bright!==1?'brightness('+save.bright+')':''}applyBright();
function clk(id,f){$(id).addEventListener('click',function(){SND.unlock();f()})}
clk('bPlay',startLevel);clk('bHow',function(){go('how')});clk('bStats',function(){go('stats')});clk('bSet',function(){go('settings')});
document.querySelectorAll('.back').forEach(function(b){b.addEventListener('click',back)});
clk('bResume',resumeGame);clk('bRetry',function(){state='play';showScreen(null);die('retry');});clk('bRestart',startLevel);clk('bPSet',function(){go('settings')});
clk('bQuit',function(){state='title';L=null;$('hud').classList.add('hidden');$('touch').classList.add('hidden');showScreen('title')});
clk('bAgain',startLevel);clk('bFinTitle',function(){state='title';L=null;showScreen('title')});
$('pauseBtn').addEventListener('click',function(){pauseGame()});
// add to home screen hint (iOS Safari, not installed)
(function(){var standalone=window.navigator.standalone||matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches;var ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(ios&&!standalone&&!localStorage.getItem('hushwick-a2hs'))$('a2hs').classList.remove('hidden');$('a2x').onclick=function(){$('a2hs').classList.add('hidden');try{localStorage.setItem('hushwick-a2hs','1')}catch(e){}}})();
var EMB_TOTAL=buildLevel().embers.length;
/* ---------------- loop ---------------- */
var last=performance.now(),acc=0;
function frame(now){var dt=Math.min(0.1,(now-last)/1000);last=now;padPoll(dt);
  if(state==='play'&&L){acc+=dt;var n=0;while(acc>=STEP&&n<14){stepGame(STEP);acc-=STEP;n++}if(n>=14)acc=0;updateCam(dt);hud()}else if(state==='finish'&&L){updateCam(dt)}
  if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').style.opacity=0}
  SND.tick(dt,!!(L&&L.hush&&!L.hushDone&&state==='play'),L&&L.hush?Math.max(0,1-(player.body.getPosition().x-L.hush.x)/10):0);
  if(L)render(now/1000);else{render(now/1000);}
  requestAnimationFrame(frame)}
requestAnimationFrame(frame);
window.HUSH={get L(){return L},get player(){return player},input:input,start:startLevel,step:function(n,k){for(var i=0;i<n;i++){if(k){input.x=k.x||0;input.jump=!!k.j;input.grab=!!k.g}stepGame(STEP)}updateCam(1)},state:function(){return state},die:die,version:VERSION};
})();
