// Thistledown - main: input, save, UI, loop.
(function(){
'use strict';
var VERSION='v1.0',OLDER=[]; // e.g. {v:'v1.0',url:'../thistledown-v1.0/'}
var S=TD_SIM,R=TD_R,AU=TD_AUDIO,AREAS=TD_AREAS,KEY='thistledown_save_v1',SKEY='thistledown_settings_v1';
var $=function(id){return document.getElementById(id);};
var set=Object.assign({music:0.7,sfx:0.8,bright:1,q:2},JSON.parse(localStorage.getItem(SKEY)||'{}'));
function saveSet(){localStorage.setItem(SKEY,JSON.stringify(set));AU.setVol(set.music,set.sfx);$('cv').style.filter=set.bright!==1?'brightness('+set.bright+')':'';}
function newSave(){return {area:0,spawn:null,ab:{},maxHp:3,maxEn:1,got:{},latch:{},flood:{},mir:{},chase:{},bossDone:false,explored:{},stats:{time:0,deaths:0,jumps:0,dashes:0,bashes:0,grapples:0,light:0,hits:0},done:false,started:Date.now()};}
var save=null;try{save=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}
function writeSave(){if(save)localStorage.setItem(KEY,JSON.stringify(save));}
var st=null,s=null,ai=0,mode='title',paused=false,msg=null,msgT=0,signT=null;
var TOTAL={o:0,H:0,E:0};AREAS.forEach(function(a){a.ents.forEach(function(e){if(TOTAL[e.t]!=null)TOTAL[e.t]++;});});
function loadArea(i,spawn){
  ai=i;st=S.build(AREAS[i]);
  s=S.create(st,{ab:save.ab,got:save.got[i]||[],latch:save.latch[i]||[],flood:save.flood[i],mir:save.mir[i],spawn:spawn,maxHp:save.maxHp,maxEn:save.maxEn,stats:save.stats,bossDone:save.bossDone});
  if(save.chase[i])s.chaseDone=true;
  save.area=i;R.setArea(st,i);R.snap(s);AU.setArea(i);toast(AREAS[i].name);
}
function persist(){if(!s)return;var g=[];s.e.forEach(function(e){if(e.got)g.push(e.i);});save.got[ai]=g;save.latch[ai]=s.latch.slice();save.flood[ai]=s.flood;var m={};s.e.forEach(function(e){if(e.t==='M')m[e.i]=e.st;});save.mir[ai]=m;if(s.chaseDone)save.chase[ai]=true;save.maxHp=s.p.maxHp;save.maxEn=s.p.maxEn;}
function explore(){var bw=Math.ceil(st.w/4),bh=Math.ceil(st.h/4),ex=save.explored[ai]||'';if(ex.length<bw*bh)ex=ex+'0'.repeat(bw*bh-ex.length);var a=ex.split(''),cx=Math.floor(s.p.x/4),cy=Math.floor(s.p.y/4),ch=false;
  for(var y=cy-2;y<=cy+2;y++)for(var x=cx-3;x<=cx+3;x++){if(x<0||y<0||x>=bw||y>=bh)continue;var k=y*bw+x;if(a[k]!=='1'){a[k]='1';ch=true;}}if(ch)save.explored[ai]=a.join('');}
function toast(t,long){msg=t;msgT=long?4:2.4;var el=$('toast');el.textContent=t;el.classList.add('on');}
// ---------- input ----------
var keys={},prevB={},inp={x:0,y:0},touch={x:0,y:0,btn:{}},tPrev={};
addEventListener('keydown',function(e){keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.code)>=0)e.preventDefault();if(e.code==='Escape'||e.code==='KeyP')togglePause();if(e.code==='KeyM'&&mode==='play')openMap();AU.start();});
addEventListener('keyup',function(e){keys[e.code]=false;});
function readInput(){
  var x=0,y=0,b={};
  if(keys.ArrowLeft||keys.KeyA)x-=1;if(keys.ArrowRight||keys.KeyD)x+=1;if(keys.ArrowUp||keys.KeyW)y-=1;if(keys.ArrowDown||keys.KeyS)y+=1;
  b.jump=keys.Space||keys.KeyZ;b.dash=keys.KeyX||keys.ShiftLeft||keys.ShiftRight;b.bash=keys.KeyC||keys.KeyK;b.grap=keys.KeyV||keys.KeyL;b.use=keys.KeyE;b.flare=keys.KeyF;
  var pads=navigator.getGamepads?navigator.getGamepads():[];
  for(var i=0;i<pads.length;i++){var g=pads[i];if(!g)continue;var bt=function(n){return g.buttons[n]&&g.buttons[n].pressed;};
    if(Math.abs(g.axes[0])>0.25)x=g.axes[0];if(Math.abs(g.axes[1])>0.25)y=g.axes[1];
    if(bt(14))x=-1;if(bt(15))x=1;if(bt(12))y=-1;if(bt(13))y=1;
    b.jump=b.jump||bt(0);b.dash=b.dash||bt(2)||bt(7);b.bash=b.bash||bt(1)||bt(5);b.grap=b.grap||bt(4)||bt(6);b.use=b.use||bt(3);b.flare=b.flare||bt(10)||bt(11);
    if(bt(9)&&!prevB.start)togglePause();prevB.start=bt(9);if(bt(8)&&!prevB.sel&&mode==='play')openMap();prevB.sel=bt(8);
    if(mode!=='play'||paused)navPad(g,bt);
  }
  if(Math.abs(touch.x)>0.15||Math.abs(touch.y)>0.15){x=touch.x;y=touch.y;}
  for(var k in touch.btn)if(touch.btn[k])b[k]=true;
  var o={x:Math.max(-1,Math.min(1,x)),y:Math.max(-1,Math.min(1,y)),jump:!!b.jump,jumpP:!!b.jump&&!prevB.jump,dashP:!!b.dash&&!prevB.dash,bash:!!b.bash,bashP:!!b.bash&&!prevB.bash,grapP:!!b.grap&&!prevB.grap,useP:(!!b.use&&!prevB.use),flareP:!!b.flare&&!prevB.flare};
  ['jump','dash','bash','grap','use','flare'].forEach(function(k){prevB[k]=!!b[k];});
  if(o.useP&&s&&s.use==null&&signT){toast(signT,true);}
  return o;
}
// gamepad menu nav
var navCd=0;
function navPad(g,bt){var list=[].slice.call(document.querySelectorAll('.panel.on button, .panel.on input'));if(!list.length)return;navCd-=1/60;
  var cur=list.indexOf(document.activeElement);var y=g.axes[1]||0;if(bt(12))y=-1;if(bt(13))y=1;var x=g.axes[0]||0;if(bt(14))x=-1;if(bt(15))x=1;
  if(navCd<=0&&Math.abs(y)>0.5){cur=(cur+(y>0?1:-1)+list.length)%list.length;list[cur].focus();navCd=0.22;}
  var el=document.activeElement;if(el&&el.type==='range'&&navCd<=0&&Math.abs(x)>0.5){el.value=Math.max(0,Math.min(+el.max,+el.value+(x>0?1:-1)*(+el.step||0.1)));el.dispatchEvent(new Event('input'));navCd=0.12;}
  if(bt(0)&&!prevB.menuA&&el&&el.tagName==='BUTTON')el.click();prevB.menuA=bt(0);
  if(bt(1)&&!prevB.menuB){var bk=document.querySelector('.panel.on .back');if(bk)bk.click();}prevB.menuB=bt(1);
}
// touch: floating stick on left half, buttons on right
var stickId=null,sc={x:0,y:0};
function setupTouch(){
  var zone=$('stickzone'),knob=$('knob'),base=$('stickbase');
  zone.addEventListener('pointerdown',function(e){e.preventDefault();stickId=e.pointerId;zone.setPointerCapture(e.pointerId);sc={x:e.clientX,y:e.clientY};base.style.left=e.clientX+'px';base.style.top=e.clientY+'px';base.classList.add('on');mv(e);AU.start();});
  function mv(e){if(e.pointerId!==stickId)return;var dx=e.clientX-sc.x,dy=e.clientY-sc.y,r=50,l=Math.hypot(dx,dy);if(l>r){sc.x+=dx*(1-r/l)*0.5;sc.y+=dy*(1-r/l)*0.5;base.style.left=sc.x+'px';base.style.top=sc.y+'px';dx=e.clientX-sc.x;dy=e.clientY-sc.y;l=Math.hypot(dx,dy);}var k=Math.min(1,l/r);touch.x=l?dx/l*k:0;touch.y=l?dy/l*k:0;if(Math.abs(touch.x)<0.2)touch.x=0;knob.style.transform='translate('+(touch.x*r)+'px,'+(touch.y*r)+'px)';}
  zone.addEventListener('pointermove',mv);
  function up(e){if(e.pointerId!==stickId)return;stickId=null;touch.x=touch.y=0;knob.style.transform='';base.classList.remove('on');}
  zone.addEventListener('pointerup',up);zone.addEventListener('pointercancel',up);
  document.querySelectorAll('.tb').forEach(function(b){var k=b.getAttribute('data-k');
    b.addEventListener('pointerdown',function(e){e.preventDefault();b.setPointerCapture(e.pointerId);touch.btn[k]=true;b.classList.add('down');AU.start();});
    ['pointerup','pointercancel','lostpointercapture'].forEach(function(n){b.addEventListener(n,function(){touch.btn[k]=false;b.classList.remove('down');});});
  });
  $('pauseBtn').addEventListener('click',togglePause);$('mapBtn').addEventListener('click',openMap);
}
// ---------- panels ----------
function show(id){document.querySelectorAll('.panel').forEach(function(p){p.classList.toggle('on',p.id===id);});var f=id&&document.querySelector('#'+id+' button');if(f)f.focus();}
function togglePause(){if(mode!=='play')return;paused=!paused;show(paused?'pause':null);document.body.classList.toggle('paused',paused);}
function openMap(){if(mode!=='play')return;paused=true;document.body.classList.add('paused');show('map');var mc=$('mapcv');mc.width=mc.clientWidth*2;mc.height=mc.clientHeight*2;R.drawMap(mc,AREAS,save,ai,s.p);}
function startGame(fresh){
  AU.start();if(fresh||!save){save=newSave();writeSave();}
  mode='play';paused=false;show(null);document.body.classList.add('playing');document.body.classList.remove('paused');
  loadArea(save.area||0,save.spawn);if(fresh)toast('The Elder Tree is fading. Find its heart.',true);
}
function statsHTML(){var t=save?save.stats:newSave().stats,sv=save||newSave();var got=0,h=0,en=0;
  for(var a in sv.got)sv.got[a].forEach(function(i){var e=AREAS[a].ents[i];if(!e)return;if(e.t==='o')got++;if(e.t==='H')h++;if(e.t==='E')en++;});
  var ab=['dj','dash','glide','bash','grapple'].filter(function(k){return sv.ab[k];}).length;var m=Math.floor((t.time||0)/60);
  var rows=[['Play time',Math.floor(m/60)+'h '+(m%60)+'m'],['Spirit light',got+' / '+TOTAL.o],['Life cells',h+' / '+TOTAL.H],['Energy cells',en+' / '+TOTAL.E],['Abilities',ab+' / 5'],['Jumps',t.jumps||0],['Dashes',t.dashes||0],['Bashes',t.bashes||0],['Grapples',t.grapples||0],['Bumps taken',t.hits||0],['Times restored at a shrine',t.deaths||0],['Grandmoth Ulma',sv.bossDone?'Woken gently':'Still dreaming']];
  return '<table>'+rows.map(function(r){return '<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>';}).join('')+'</table>';}
function setupUI(){
  $('ver').textContent=VERSION;
  $('bContinue').style.display=save?'':'none';
  $('bContinue').onclick=function(){startGame(false);};
  $('bNew').onclick=function(){if(save&&!confirm('Start a new journey? Your current save will be replaced.'))return;startGame(true);};
  document.querySelectorAll('.bSettings').forEach(function(b){b.onclick=function(){show('settings');};});
  document.querySelectorAll('.bStats').forEach(function(b){b.onclick=function(){$('statsBody').innerHTML=statsHTML();show('stats');};});
  document.querySelectorAll('.back').forEach(function(b){b.onclick=function(){show(mode==='play'?'pause':'title');};});
  $('bResume').onclick=togglePause;$('bMap').onclick=function(){openMap();};
  $('bCheckpoint').onclick=function(){paused=false;show(null);document.body.classList.remove('paused');s.p.x=s.cp.x;s.p.y=s.cp.y;s.ev=[];S.step(st,s,{x:0,y:0});s.crates.forEach(function(c){c.x=c.x0;c.y=c.y0;});s.chase=null;R.snap(s);};
  $('bTitle').onclick=function(){persist();writeSave();mode='title';paused=false;document.body.classList.remove('playing','paused');$('bContinue').style.display='';show('title');};
  $('mapClose').onclick=function(){paused=false;document.body.classList.remove('paused');show(null);};
  [['sMusic','music'],['sSfx','sfx'],['sBright','bright']].forEach(function(p){var el=$(p[0]);el.value=set[p[1]];var lab=$(p[0]+'V');function up(){set[p[1]]=+el.value;lab.textContent=p[1]==='bright'?Math.round(el.value*100)+'%':(+el.value===0?'Off':Math.round(el.value*100)+'%');saveSet();}el.oninput=up;up();});
  var qb=$('sQ');function ql(){qb.textContent='Quality: '+['Low','Medium','High'][set.q];}ql();qb.onclick=function(){set.q=(set.q+2)%3;R.q=set.q;R.resize();ql();saveSet();};
  $('older').innerHTML=OLDER.length?OLDER.map(function(o){return '<a href="'+o.url+'">'+o.v+'</a>';}).join(''):'<p class="dim">None yet. Earlier versions will appear here after updates.</p>';
  $('bEnd').onclick=function(){show(null);mode='play';paused=false;document.body.classList.remove('paused');};
  // add to home screen hint
  var ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  var standalone=navigator.standalone||matchMedia('(display-mode: standalone)').matches;
  if(ios&&!standalone&&!localStorage.getItem('td_a2hs')){$('a2hs').classList.add('on');}
  $('a2hsX').onclick=function(){$('a2hs').classList.remove('on');localStorage.setItem('td_a2hs','1');};
}
// ---------- events -> fx ----------
var ABN={dj:'Twinbloom (Double Jump)',dash:'Quickstep (Dash)',glide:'Featherleaf (Glide)',bash:'Flarebound (Bash)',grapple:'Thornvine (Grapple)'};
function handle(ev){
  ev.forEach(function(e){var n=e[0];AU.sfx_(n);
    switch(n){
     case 'orb':R.burst(e[1],e[2],'rgba(255,240,160,0.9)',8,3,0.6);break;
     case 'hcell':R.burst(e[1],e[2],'rgba(170,255,190,0.9)',24,5,1.2);toast('Life cell! You can take one more bump.');persist();writeSave();break;
     case 'ecell':R.burst(e[1],e[2],'rgba(160,220,255,0.9)',24,5,1.2);toast('Energy cell! Press Flare to clear nearby sprouts.');persist();writeSave();break;
     case 'ability':R.flash(0.5);R.burst(s.p.x,s.p.y,'rgba(255,255,230,0.95)',40,7,1.4);var a=AREAS[ai].ents[e[2]];toast(a.text||ABN[e[1]],true);updButtons();persist();writeSave();break;
     case 'shrine':R.burst(e[1],e[2],'rgba(170,255,230,0.9)',20,4,1);save.spawn={x:e[1],y:e[2]};persist();writeSave();toast('Saved');break;
     case 'hurt':R.shake(0.8);R.burst(s.p.x,s.p.y,'rgba(255,255,255,0.9)',12,4,0.6);if(navigator.vibrate)navigator.vibrate(30);rumble(0.4,120);break;
     case 'die':R.flash(0.4);toast('Restored at the shrine');break;
     case 'respawn':R.snap(s);break;
     case 'bash':R.burst(e[1],e[2],'rgba(255,230,170,0.9)',16,6,0.6);R.shake(0.3);rumble(0.3,80);break;
     case 'dash':R.burst(e[1],e[2],'rgba(220,255,250,0.8)',8,2,0.4);break;
     case 'djump':R.burst(e[1],e[2]+0.4,'rgba(220,255,240,0.8)',10,3,0.5);break;
     case 'land':if(e[3]>12)R.shake(0.15);R.burst(e[1],e[2],'rgba(255,255,240,0.6)',5,2,0.35);break;
     case 'bramble':R.burst(e[1],e[2],'rgba(210,170,240,0.9)',8,4,0.6);break;
     case 'door':R.shake(0.5);toast('A root door opens.');persist();writeSave();break;
     case 'lever':R.shake(0.4);toast(e[1]?'Water rushes in!':'The water drains away.');persist();writeSave();break;
     case 'enemyDie':R.burst(e[1],e[2],'rgba(200,180,255,0.9)',14,4,0.7);break;
     case 'flare':R.flash(0.25);R.burst(e[1],e[2],'rgba(200,240,255,0.9)',30,7,0.6);break;
     case 'chase':toast('Run!');R.shake(0.6);break;
     case 'chaseDone':toast('Safe!');persist();writeSave();break;
     case 'bossOn':toast('Grandmoth Ulma stirs in her sleep...',true);break;
     case 'bossHit':R.shake(0.7);R.flash(0.3);toast(['She wakes! Thank you, little one.','Almost awake...','The dream is breaking!'][e[1]]||'');break;
     case 'bossDone':save.bossDone=true;save.done=true;persist();writeSave();setTimeout(function(){mode='end';paused=true;show('ending');},2200);break;
     case 'splash':R.burst(e[1],e[2],'rgba(220,250,255,0.9)',10,4,0.5);break;
    }
  });
}
function rumble(m,ms){try{var g=navigator.getGamepads&&navigator.getGamepads()[0];if(g&&g.vibrationActuator)g.vibrationActuator.playEffect('dual-rumble',{duration:ms,strongMagnitude:m,weakMagnitude:m});}catch(e){}}
function updButtons(){var ab=save?save.ab:{};['dash','bash','grapple'].forEach(function(k){var b=document.querySelector('.tb[data-k="'+(k==='grapple'?'grap':k)+'"]');if(b)b.style.display=ab[k]?'':'none';});var f=document.querySelector('.tb[data-k="flare"]');if(f)f.style.display=(s&&s.p.maxEn>0)?'':'none';}
// ---------- HUD ----------
function hud(){var p=s.p,h='';for(var i=0;i<p.maxHp;i++)h+='<i class="lf'+(i<p.hp?'':' e')+'"></i>';$('hp').innerHTML=h;var e='';for(i=0;i<p.maxEn;i++)e+='<i class="en'+(i<p.en?'':' e')+'"></i>';$('en').innerHTML=e;$('light').textContent=save.stats.light||0;
  $('useBtn').classList.toggle('on',s.use!=null||!!signT);
  if(msgT>0){msgT-=1/60;if(msgT<=0)$('toast').classList.remove('on');}}
// ---------- loop ----------
var last=performance.now(),acc=0,fpsA=[],frames=0;window.TD_FPS=0;
function frame(now){
  requestAnimationFrame(frame);var dt=Math.min(0.1,(now-last)/1000);last=now;frames++;fpsA.push(dt);if(fpsA.length>60)fpsA.shift();
  if(frames%30===0){var a=0;fpsA.forEach(function(x){a+=x;});window.TD_FPS=Math.round(fpsA.length/a);}
  var I=readInput();
  if(mode==='play'&&!paused&&s){
    acc+=dt;var n=0;
    while(acc>=1/60&&n<4){S.step(st,s,I,1/60);I.jumpP=I.dashP=I.bashP=I.grapP=I.useP=I.flareP=false;handle(s.ev.slice());save.stats.time=(save.stats.time||0)+1/60;acc-=1/60;n++;
      if(s.exit){persist();var nxt=s.exit==='next'?ai+1:ai-1;if(nxt>=0&&nxt<AREAS.length){var tst=S.build(AREAS[nxt]);loadArea(nxt,s.exit==='next'?tst.entry.prev:tst.entry.next);save.spawn=null;writeSave();}break;}}
    if(acc>1)acc=0;
    signT=null;s.e.forEach(function(e){if(e.t==='!'&&Math.hypot(e.x-s.p.x,e.y-s.p.y)<2.2)signT=e.text;});
    var sb=$('sign');if(signT){sb.textContent=signT;sb.classList.add('on');}else sb.classList.remove('on');
    if(frames%20===0)explore();if(frames%600===0){persist();writeSave();}
    var near=null;if(save.ab.bash){var bd=3.3;s.e.forEach(function(e){if(e.t==='L'){var d=Math.hypot(e.x-s.p.x,e.y-s.p.y);if(d<bd){bd=d;near=e;}}});s.seeds.forEach(function(q){if(!q.friend){var d=Math.hypot(q.x-s.p.x,q.y-s.p.y);if(d<bd){bd=d;near=q;}}});}
    hud();
    R.draw(s,dt,{bashNear:near});
  } else if(s){R.draw(s,paused?0:dt*0.3,{});}
  else titleDraw(dt);
}
var tw=null,ts=null;
function titleDraw(dt){if(!tw){tw=S.build(AREAS[0]);ts=S.create(tw,{});ts.p.x=50;ts.p.y=4.5;R.setArea(tw,0);R.snap(ts);}ts.p.x=50+Math.sin(performance.now()/3000)*3;R.draw(ts,dt,{});}
window.addEventListener('resize',function(){R.resize();});
window.addEventListener('pagehide',function(){if(mode==='play'){persist();writeSave();}});
document.addEventListener('visibilitychange',function(){if(document.hidden&&mode==='play'){persist();writeSave();if(!paused)togglePause();}});
R.init($('cv'));R.q=set.q;R.resize();saveSet();setupUI();setupTouch();updButtons();show('title');
requestAnimationFrame(frame);
// test hooks
window.TD={get s(){return s;},get save(){return save;},start:startGame,loadArea:function(i,sp){if(!save)save=newSave();mode='play';show(null);document.body.classList.add('playing');loadArea(i,sp);updButtons();},openMap:openMap,stats:function(){$('statsBody').innerHTML=statsHTML();show('stats');},show:show};
if('serviceWorker' in navigator&&!/nosw/.test(location.search))addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});
})();
