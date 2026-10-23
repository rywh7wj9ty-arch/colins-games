// Thistledown - main: input, save, UI, loop.
(function(){
'use strict';
var VERSION='v1.3',OLDER=[{v:'v1.2',url:'../thistledown-v1.2/'},{v:'v1.1',url:'../thistledown-v1.1/'},{v:'v1.0',url:'../thistledown-v1.0/'}]; // e.g. {v:'v1.0',url:'../thistledown-v1.0/'}
var S=TD_SIM,R=TD_R,AU=TD_AUDIO,AREAS=TD_AREAS,KEY='thistledown_save_v13',OLDKEY='thistledown_save_v1',SKEY='thistledown_settings_v1';
var $=function(id){return document.getElementById(id);};
var set=Object.assign({music:0.7,sfx:0.8,bright:1,q:2,shake:1},JSON.parse(localStorage.getItem(SKEY)||'{}'));
function saveSet(){localStorage.setItem(SKEY,JSON.stringify(set));AU.setVol(set.music,set.sfx);R.shakeOn=!!set.shake;$('cv').style.filter=set.bright!==1?'brightness('+set.bright+')':'';}
function newSave(){return {ver:3,area:0,spawn:null,ab:{},maxHp:3,maxEn:1,got:{},latch:{},flood:{},mir:{},chase:{},bossDone:{},explored:{},night:{},up:{},spent:0,bonus:0,trials:{},seen:{},trueEnd:false,stats:{time:0,deaths:0,jumps:0,dashes:0,bashes:0,grapples:0,light:0,hits:0},done:false,started:Date.now()};}
var save=null;try{save=JSON.parse(localStorage.getItem(KEY)||'null');if(!save)save=JSON.parse(localStorage.getItem(OLDKEY)||'null');}catch(e){} // v1.3 keeps its own save so older frozen versions keep theirs
// v1.3 save migration: old 5-area saves -> connected world
function migrate(sv){if(!sv||sv.ver>=3)return sv;var M=TD_OLDMAP||[0,2,4,6,9];
  function remap(o){var n={};for(var k in (o||{}))if(M[+k]!=null)n[M[+k]]=o[k];return n;}
  ['got','latch','flood','mir','chase','explored'].forEach(function(k){sv[k]=remap(sv[k]);});
  var oldArea=sv.area||0;sv.area=M[oldArea]!=null?M[oldArea]:0;var ub=!!sv.bossDone;sv.bossDone={};
  [1,3,5,7].forEach(function(b){if(sv.area>b)sv.bossDone[b]=true;});if(ub){sv.bossDone[9]=true;}
  sv.night={};sv.up={};sv.spent=0;sv.bonus=0;sv.trials={};sv.seen={intro:1};sv.trueEnd=false;sv.ver=3;return sv;}
save=migrate(save);if(save)try{localStorage.setItem(KEY,JSON.stringify(save));}catch(e){}
var UPG=[{k:'hp',n:'Heartwood',d:'+1 life (max 2)',c:15,max:2},{k:'en',n:'Starseed',d:'+1 energy for Flare',c:12,max:1},{k:'glide',n:'Featherleaf+',d:'Longer, floatier glide',c:15,max:1,need:'glide'},{k:'dash',n:'Quickstep+',d:'Stronger, longer dash',c:15,max:1,need:'dash'},{k:'magnet',n:'Light Lure',d:'Pull in spirit light from further away',c:8,max:1},{k:'regen',n:'Dewdrop',d:'Checkpoints refill your life',c:12,max:1}];
var TRIALS=[{n:'Whisperglade Dash',g:3.6,sv:4.4,b:5.9},{n:'Crumbling Weir',g:5.3,sv:6.5,b:8.6},{n:'Lantern Chain',g:3.7,sv:4.5,b:6.0}];
var BOSSN={mole:'Tumble',heron:'Mira',owl:'Gale',crab:'Glim',moth:'Grandmoth Ulma'};
function lightAvail(){return (save.stats.light||0)+(save.bonus||0)-(save.spent||0);}
function petalCount(){var n=0;for(var a in save.got)save.got[a].forEach(function(i){var e=AREAS[a]&&AREAS[a].ents[i];if(e&&e.t==='p')n++;});return n;}
function upLv(k){return (save.up&&save.up[k])||0;}
function writeSave(){if(save)localStorage.setItem(KEY,JSON.stringify(save));}
var st=null,s=null,ai=0,mode='title',paused=false,msg=null,msgT=0,signT=null;
var TOTAL={o:0,H:0,E:0};AREAS.forEach(function(a){a.ents.forEach(function(e){if(TOTAL[e.t]!=null)TOTAL[e.t]++;});});
function loadArea(i,spawn){
  ai=i;st=S.build(AREAS[i]);
  s=S.create(st,{ab:save.ab,got:save.got[i]||[],latch:save.latch[i]||[],flood:save.flood[i],mir:save.mir[i],spawn:spawn,maxHp:save.maxHp+upLv('hp'),hp:save.maxHp+upLv('hp'),maxEn:save.maxEn+upLv('en'),stats:save.stats,bossDone:!!save.bossDone[i],night:!!save.night[i],up:save.up,petals:petalCount()});ghost=null;trialRec=null;$('trial').classList.remove('on');
  if(save.chase[i])s.chaseDone=true;
  save.area=i;R.setArea(st,AREAS[i].reg,AREAS[i]);R.snap(s);AU.setArea(AREAS[i].reg,AREAS[i]);toast(AREAS[i].name);
}
function persist(){if(!s)return;var g=[];s.e.forEach(function(e){if(e.got)g.push(e.i);});save.got[ai]=g;save.latch[ai]=s.latch.slice();save.flood[ai]=s.flood;var m={};s.e.forEach(function(e){if(e.t==='M')m[e.i]=e.st;});save.mir[ai]=m;if(s.chaseDone)save.chase[ai]=true;save.night[ai]=s.night;}
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
  b.jump=keys.Space||keys.KeyZ;b.dash=keys.KeyX||keys.ShiftLeft||keys.ShiftRight;b.bash=keys.KeyC||keys.KeyK;b.grap=keys.KeyV||keys.KeyL;b.use=keys.KeyE;b.flare=keys.KeyF;b.shoot=keys.KeyR||keys.KeyJ;
  var pads=navigator.getGamepads?navigator.getGamepads():[];
  for(var i=0;i<pads.length;i++){var g=pads[i];if(!g)continue;var bt=function(n){return g.buttons[n]&&g.buttons[n].pressed;};
    if(Math.abs(g.axes[0])>0.25)x=g.axes[0];if(Math.abs(g.axes[1])>0.25)y=g.axes[1];
    if(bt(14))x=-1;if(bt(15))x=1;if(bt(12))y=-1;if(bt(13))y=1;
    b.jump=b.jump||bt(0);b.dash=b.dash||bt(2)||bt(7);b.bash=b.bash||bt(1);b.shoot=b.shoot||bt(5);b.grap=b.grap||bt(4)||bt(6);b.use=b.use||bt(3);b.flare=b.flare||bt(10)||bt(11);
    if(bt(9)&&!prevB.start)togglePause();prevB.start=bt(9);if(bt(8)&&!prevB.sel&&mode==='play')openMap();prevB.sel=bt(8);
    if(mode!=='play'||paused)navPad(g,bt);
  }
  if(Math.abs(touch.x)>0.15||Math.abs(touch.y)>0.15){x=touch.x;y=touch.y;}
  for(var k in touch.btn)if(touch.btn[k])b[k]=true;
  var o={x:Math.max(-1,Math.min(1,x)),y:Math.max(-1,Math.min(1,y)),jump:!!b.jump,jumpP:!!b.jump&&!prevB.jump,dashP:!!b.dash&&!prevB.dash,bash:!!b.bash,bashP:!!b.bash&&!prevB.bash,grapP:!!b.grap&&!prevB.grap,useP:(!!b.use&&!prevB.use),flareP:!!b.flare&&!prevB.flare,shootP:!!b.shoot&&!prevB.shoot};
  ['jump','dash','bash','grap','use','flare','shoot'].forEach(function(k){prevB[k]=!!b[k];});
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
function openMap(){if(mode!=='play')return;paused=true;document.body.classList.add('paused');show('map');var mc=$('mapcv');mc.width=mc.clientWidth*2;mc.height=mc.clientHeight*2;R.drawMap(mc,AREAS,save,ai,s.p);$('mapPct').textContent=pct()+'% complete · Petals '+petalCount()+'/5 · Spirit light to spend: '+lightAvail();}
function startGame(fresh){
  AU.start();if(fresh||!save){save=newSave();writeSave();}
  mode='play';paused=false;show(null);document.body.classList.add('playing');document.body.classList.remove('paused');
  loadArea(save.area||0,save.spawn);if(fresh||!save.seen.intro){save.seen.intro=1;writeSave();story('intro');}
}
function statsHTML(){var t=save?save.stats:newSave().stats,sv=save||newSave();var got=0,h=0,en=0;
  for(var a in sv.got)sv.got[a].forEach(function(i){var e=AREAS[a].ents[i];if(!e)return;if(e.t==='o')got++;if(e.t==='H')h++;if(e.t==='E')en++;});
  var ab=['dj','dash','glide','bash','grapple','arrow'].filter(function(k){return sv.ab[k];}).length;var bd=sv.bossDone||{};var nb=0;for(var bk in bd)if(bd[bk])nb++;var tm=0;for(var tk in (sv.trials||{}))if(sv.trials[tk])tm++;var pe=0;for(var pa in sv.got)sv.got[pa].forEach(function(i){var e=AREAS[pa]&&AREAS[pa].ents[i];if(e&&e.t==='p')pe++;});var m=Math.floor((t.time||0)/60);
  var rows=[['Play time',Math.floor(m/60)+'h '+(m%60)+'m'],['Spirit light',got+' / '+TOTAL.o],['Life cells',h+' / '+TOTAL.H],['Energy cells',en+' / '+TOTAL.E],['Abilities',ab+' / 6'],['Spirit petals',pe+' / 5'],['Lost souls calmed',nb+' / 5'],['Trial medals',tm+' / 3'],['Jumps',t.jumps||0],['Dashes',t.dashes||0],['Bashes',t.bashes||0],['Grapples',t.grapples||0],['Bumps taken',t.hits||0],['Times restored at a shrine',t.deaths||0],['Complete',pctOf(sv)+'%'],['True ending',sv.trueEnd?'Seen':'Not yet']];
  return '<table>'+rows.map(function(r){return '<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>';}).join('')+'</table>';}
function pctOf(sv){var tot=TOTAL.o+TOTAL.H+TOTAL.E+5+5+6+3+AREAS.length,n=0;
  for(var a in sv.got)sv.got[a].forEach(function(i){var e=AREAS[a]&&AREAS[a].ents[i];if(e&&'oHEp'.indexOf(e.t)>=0)n++;});
  for(var b in (sv.bossDone||{}))if(sv.bossDone[b])n++;['dj','dash','glide','bash','grapple','arrow'].forEach(function(k){if(sv.ab[k])n++;});
  for(var t in (sv.trials||{}))if(sv.trials[t])n++;for(var x in (sv.explored||{}))n++;return Math.min(100,Math.floor(n/tot*100));}
function pct(){return pctOf(save);}
// ---------- storybook ----------
var STORY={
 intro:[['tree','Once, the Elder Tree lit the whole forest with its warm spirit light.'],['dark','But one long winter the light grew thin, and the forest creatures fell into sad, heavy dreams.'],['pip','From the last glowing seed came Pip: small, curious, and brave. Pip set off to wake the forest.']],
 mole:[['mole','Tumble stops, blinks, and sniffs the air. "Light? Real light?"'],['mole2','He remembers the warm tunnels and the friends who visited. He curls up in a soft burrow and finally sleeps without fear.']],
 heron:[['heron','Mira lands softly. In your glow she sees the far bank of the weir...'],['heron2','...and three small grey chicks, safe and waiting. She flies to them, and the mist begins to lift.']],
 owl:[['owl','Gale lets go of the storm-seeds. "I only wanted to keep everyone warm," he hoots.'],['owl2','The seeds sprout into a ring of soft trees around his roost. The cold wind goes quiet.']],
 crab:[['crab','Glim peeks out from her cracked shell. Your light shines straight through it, and it sparkles.'],['crab2','"It is not broken," you seem to say. "It is beautiful." For the first time in years, Glim walks out into the open.']],
 moth:[['moth','Grandmoth Ulma blinks awake, and her bad dreams drift away like dandelion seeds.'],['tree','Light runs up the roots, through every branch, and out into the whole forest. "Thank you, little Pip."']],
 trueEnd:[['petals','Pip places the five spirit petals around the Elder Heart.'],['bloom','They open into a great silver flower, and every creature Pip met comes to see it.'],['all','Tumble, Mira and her chicks, Gale, Glim and Ulma. The forest is not just awake now. It is home.']]
};
var stQ=[],stPage=0,stTxt='',stShown=0,stCb=null,stWas=null;
function story(key,cb){var pages=STORY[key];if(!pages){if(cb)cb();return;}stQ=pages;stPage=0;stCb=cb||null;stWas=paused;paused=true;document.body.classList.add('paused');show('story');AU.mood('quiet');stOpen();}
function stOpen(){var pg=stQ[stPage];stTxt=pg[1];stShown=0;var cvs=$('storycv');cvs.width=cvs.clientWidth*2||640;cvs.height=cvs.clientHeight*2||300;R.storyArt(cvs,pg[0]);$('storyTxt').textContent='';$('stNext').textContent=stPage<stQ.length-1?'Next':'Continue';}
function stDone(){show(null);paused=false;document.body.classList.remove('paused');var cb=stCb;stCb=null;if(cb)cb();}
function stNext(){if(stShown<stTxt.length){stShown=stTxt.length;$('storyTxt').textContent=stTxt;return;}stPage++;if(stPage>=stQ.length)stDone();else stOpen();}
function stTick(){if($('story').classList.contains('on')&&stShown<stTxt.length){stShown=Math.min(stTxt.length,stShown+1.2);$('storyTxt').textContent=stTxt.slice(0,Math.floor(stShown));}}
// ---------- spirit wells: upgrades + fast travel ----------
function openWell(){paused=true;document.body.classList.add('paused');save.spawn={x:s.p.x,y:s.p.y};persist();writeSave();renderWell();show('well');}
function renderWell(){$('wellLight').textContent=lightAvail();var h='';UPG.forEach(function(u){var lv=upLv(u.k),max=lv>=u.max,locked=u.need&&!save.ab[u.need];
  h+='<button class="upg" data-k="'+u.k+'"'+(max||locked||lightAvail()<u.c?' disabled':'')+'><b>'+u.n+(u.max>1?' '+lv+'/'+u.max:'')+'</b><span>'+(locked?'Find the ability first':u.d)+'</span><em>'+(max?'Owned':u.c+' light')+'</em></button>';});
  $('wellUp').innerHTML=h;
  var tl='';AREAS.forEach(function(a,i){if(!save.explored[i]&&i!==ai)return;a.ents.forEach(function(e,j){if(e.t==='S')tl+='<button class="ft" data-a="'+i+'" data-x="'+e.x+'" data-y="'+e.y+'">'+a.name+(a.ents.filter(function(q){return q.t==='S';}).length>1?' · well '+(a.ents.slice(0,j).filter(function(q){return q.t==='S';}).length+1):'')+(i===ai?' (here)':'')+'</button>';});});
  $('wellTravel').innerHTML=tl;
  document.querySelectorAll('#wellUp .upg').forEach(function(b){b.onclick=function(){var u=UPG.filter(function(q){return q.k===b.getAttribute('data-k');})[0];if(lightAvail()<u.c||upLv(u.k)>=u.max)return;save.spent=(save.spent||0)+u.c;save.up[u.k]=upLv(u.k)+1;s.up=save.up;
    if(u.k==='hp'){s.p.maxHp++;s.p.hp=s.p.maxHp;}if(u.k==='en'){s.p.maxEn++;s.p.en=s.p.maxEn;updButtons();}AU.sfx_('ability');writeSave();renderWell();b=null;};});
  document.querySelectorAll('#wellTravel .ft').forEach(function(b){b.onclick=function(){var a=+b.getAttribute('data-a');persist();loadArea(a,{x:+b.getAttribute('data-x'),y:+b.getAttribute('data-y')});save.spawn={x:s.p.x,y:s.p.y};writeSave();closeWell();R.flash(0.4);};});
  var f=document.querySelector('#well button:not([disabled])');if(f)f.focus();}
function closeWell(){show(null);paused=false;document.body.classList.remove('paused');}
// ---------- spirit trials ----------
var ghost=null,trialRec=null,trialId=-1;
function ghostKey(id){return 'thistledown_ghost_v1_'+id;}
function medal(id,t){var T=TRIALS[id];return t<=T.g?'gold':t<=T.sv?'silver':t<=T.b?'bronze':'';}
function trialInfo(id){var T=TRIALS[id],b=save.trials&&save.trials['b'+id];return 'Spirit Trial: '+T.n+'. Press Use to race. Gold '+T.g.toFixed(1)+'s · Silver '+T.sv.toFixed(1)+'s · Bronze '+T.b.toFixed(1)+'s'+(b?' · Your best '+b.toFixed(2)+'s ('+(medal(id,b)||'no medal')+')':'');}
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
  if(!save||!save.ab)updButtons();
  $('bTitle').onclick=function(){persist();writeSave();mode='title';paused=false;document.body.classList.remove('playing','paused');$('bContinue').style.display='';show('title');};
  $('stNext').onclick=stNext;$('stSkip').onclick=stDone;$('wellClose').onclick=closeWell;$('bTrue').onclick=function(){show(null);mode='play';paused=false;document.body.classList.remove('paused');};
  $('mapClose').onclick=function(){paused=false;document.body.classList.remove('paused');show(null);};
  [['sMusic','music'],['sSfx','sfx'],['sBright','bright']].forEach(function(p){var el=$(p[0]);el.value=set[p[1]];var lab=$(p[0]+'V');function up(){set[p[1]]=+el.value;lab.textContent=p[1]==='bright'?Math.round(el.value*100)+'%':(+el.value===0?'Off':Math.round(el.value*100)+'%');saveSet();}el.oninput=up;up();});
  var shb=$('sShake');function shl(){shb.textContent='Screen shake: '+(set.shake?'On':'Off');}shl();shb.onclick=function(){set.shake=set.shake?0:1;shl();saveSet();};
  var qb=$('sQ');function ql(){qb.textContent='Quality: '+['Low','Medium','High'][set.q];}ql();qb.onclick=function(){set.q=(set.q+2)%3;R.q=set.q;R.resize();ql();saveSet();};
  $('older').innerHTML=OLDER.length?OLDER.map(function(o){return '<a class="oldv" href="'+o.url+'">Thistledown '+o.v+'</a>';}).join(''):'<p class="dim">None yet. Earlier versions will appear here after updates.</p>';
  $('bEnd').onclick=function(){show(null);mode='play';paused=false;document.body.classList.remove('paused');};
  // add to home screen hint
  var ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  var standalone=navigator.standalone||matchMedia('(display-mode: standalone)').matches;
  if(ios&&!standalone&&!localStorage.getItem('td_a2hs')){$('a2hs').classList.add('on');}
  $('a2hsX').onclick=function(){$('a2hs').classList.remove('on');localStorage.setItem('td_a2hs','1');};
}
// ---------- events -> fx ----------
var ABN={dj:'Twinbloom (Double Jump)',dash:'Quickstep (Dash)',glide:'Featherleaf (Glide)',bash:'Flarebound (Bash)',grapple:'Thornvine (Grapple)',arrow:'Lightbow (Light Arrow)'};
function handle(ev){
  ev.forEach(function(e){var n=e[0];AU.sfx_(n);
    switch(n){
     case 'orb':R.burst(e[1],e[2],'rgba(255,240,160,0.9)',8,3,0.6);break;
     case 'hcell':R.burst(e[1],e[2],'rgba(170,255,190,0.9)',24,5,1.2);toast('Life cell! You can take one more bump.');persist();writeSave();break;
     case 'ecell':R.burst(e[1],e[2],'rgba(160,220,255,0.9)',24,5,1.2);toast('Energy cell! Press Flare to clear nearby sprouts.');persist();writeSave();break;
     case 'ability':R.flash(0.5);rumble(0.5,300);R.burst(s.p.x,s.p.y,'rgba(255,255,230,0.95)',40,7,1.4);var a=AREAS[ai].ents[e[2]];toast(a.text||ABN[e[1]],true);updButtons();persist();writeSave();break;
     case 'shrine':R.burst(e[1],e[2],'rgba(170,255,230,0.9)',20,4,1);save.spawn={x:e[1],y:e[2]};persist();writeSave();toast('Saved · Press Use at a spirit well to grow or travel');break;
     case 'checkpoint':case 'cp':if(upLv('regen'))s.p.hp=s.p.maxHp;break;
     case 'well':openWell();break;
     case 'warp':persist();break;
     case 'warpLocked':toast(e[1],true);break;
     case 'petal':R.flash(0.35);R.burst(e[1],e[2],'rgba(235,225,255,0.95)',36,6,1.4);save.bonus=(save.bonus||0)+3;persist();writeSave();toast('Spirit petal! ('+petalCount()+' / 5)',true);break;
     case 'night':R.flash(0.3);toast(e[1]?'Night falls. The moonblooms open.':'Morning returns.');persist();writeSave();break;
     case 'shoot':R.burst(e[1]+e[3]*0.4,e[2]+e[4]*0.4,'rgba(230,245,255,0.9)',5,2,0.3);break;
     case 'switch':R.burst(e[1],e[2],'rgba(240,250,200,0.95)',20,5,0.9);rumble(0.3,120);break;
     case 'shatter':R.burst(e[1],e[2],'rgba(200,230,255,0.9)',10,5,0.7);R.shake(0.25);break;
     case 'arrowHit':R.burst(e[1],e[2],'rgba(220,240,255,0.8)',5,2,0.3);break;
     case 'chaseCp':toast('Checkpoint');break;
     case 'trialStart':trialId=e[1];trialRec=[];var gs=null;try{gs=JSON.parse(localStorage.getItem(ghostKey(e[1]))||'null');}catch(_){}ghost=gs?{pts:gs.pts,i:0}:null;$('trial').classList.add('on');toast('Go!');break;
     case 'trialFail':trialRec=null;ghost=null;$('trial').classList.remove('on');toast('Trial over. Try again at the stone!');break;
     case 'trialDone':var tt=e[2],id=e[1],md=medal(id,tt),best=save.trials['b'+id];$('trial').classList.remove('on');
       if(!best||tt<best){save.trials['b'+id]=tt;try{localStorage.setItem(ghostKey(id),JSON.stringify({t:tt,pts:trialRec}));}catch(_){}}
       if(md){var rank={bronze:1,silver:2,gold:3};var old=save.trials[id]||'';if(!old||rank[md]>rank[old])save.trials[id]=md;}
       toast(tt.toFixed(2)+'s · '+(md?md.toUpperCase()+' medal!':'No medal yet. The ghost will race you next time.')+(best&&tt<best?' New best!':''),true);trialRec=null;ghost=null;writeSave();break;
     case 'altar':toast(e[1]>=5?'The Elder Heart waits. Wake Grandmoth Ulma first.':'The Elder Heart has five empty cups. Spirit petals: '+e[1]+' / 5. Secret caves hide the rest.',true);break;
     case 'trueEnd':save.trueEnd=true;writeSave();story('trueEnd',function(){mode='end';paused=true;document.body.classList.add('paused');show('trueend');});break;
     case 'gustTell':toast(e[1]<0?'The leaves blow left...':'The leaves blow right...');break;
     case 'bossTell':break;
     case 'hurt':hitStop(0.09);R.shake(0.8);R.burst(s.p.x,s.p.y,'rgba(255,255,255,0.9)',12,4,0.6);if(navigator.vibrate)navigator.vibrate(30);rumble(0.4,120);break;
     case 'die':R.flash(0.4);toast('Restored at the shrine');break;
     case 'respawn':R.snap(s);break;
     case 'bash':hitStop(0.05);R.burst(e[1],e[2],'rgba(255,230,170,0.9)',16,6,0.6);R.shake(0.35);rumble(0.45,90);break;
     case 'dash':R.burst(e[1],e[2],'rgba(220,255,250,0.8)',8,2,0.4);R.leaves(e[1],e[2],8,e[3]);R.dust(e[1],e[2]+0.4,4,2.5);rumble(0.2,60);break;
     case 'djump':R.burst(e[1],e[2]+0.4,'rgba(220,255,240,0.8)',10,3,0.5);R.dust(e[1],e[2]+0.4,4,1.5,'rgba(220,255,245,0.7)');break;
     case 'jump':if(!s.p.water)R.dust(e[1],e[2]+0.42,5,1.8);break;
     case 'walljump':R.dust(e[1]+(s.p.face<0?0.3:-0.3),e[2],5,1.6);rumble(0.15,40);break;
     case 'land':if(e[3]>12){R.shake(0.2);rumble(0.25,60);}R.dust(e[1],e[2],Math.min(10,3+Math.round(e[3]/3)),1.5+e[3]/10);break;
     case 'bramble':R.burst(e[1],e[2],'rgba(210,170,240,0.9)',8,4,0.6);break;
     case 'door':R.shake(0.5);rumble(0.4,200);toast('A root door opens.');persist();writeSave();break;
     case 'lever':R.shake(0.4);toast(e[1]?'Water rushes in!':'The water drains away.');persist();writeSave();break;
     case 'enemyDie':hitStop(0.06);rumble(0.35,80);R.burst(e[1],e[2],'rgba(200,180,255,0.9)',14,4,0.7);break;
     case 'flare':R.flash(0.25);R.burst(e[1],e[2],'rgba(200,240,255,0.9)',30,7,0.6);break;
     case 'chase':toast('Run!');R.shake(0.6);break;
     case 'chaseDone':toast('Safe!');persist();writeSave();break;
     case 'bossOn':toast(BOSSN[e[1]]+(e[1]==='moth'?' stirs in her sleep...':' notices you...'),true);break;
     case 'bossHit':hitStop(0.14);rumble(0.8,250);R.shake(0.7);R.flash(0.3);toast(['Calm at last.','Almost there...','It is working!'][e[1]]||'');break;
     case 'bossDone':var kd=e[1];save.bossDone[ai]=true;save.bonus=(save.bonus||0)+5;if(AREAS[ai].final)save.done=true;persist();writeSave();
       setTimeout(function(){story(kd,function(){if(AREAS[ai].final){mode='end';paused=true;document.body.classList.add('paused');show('ending');}else toast('The way ahead is open.',true);});},1600);break;
     case 'splash':R.burst(e[1],e[2],'rgba(220,250,255,0.9)',14,4,0.6);var wy=Math.floor(e[2]);while(wy>0&&S.isWater(st,s,e[1],wy-0.5))wy--;R.ripple(e[1],wy+0.05,true);R.ripple(e[1]+0.3,wy+0.05,false);rumble(0.15,50);break;
    }
  });
}
var hs=0;function hitStop(v){hs=Math.max(hs,v);}
function rumble(m,ms){if(!set.shake)m*=0.5;try{var pads=navigator.getGamepads?navigator.getGamepads():[];var g=null;for(var pi=0;pi<pads.length;pi++)if(pads[pi]){g=pads[pi];break;}if(g&&g.vibrationActuator)g.vibrationActuator.playEffect('dual-rumble',{duration:ms,strongMagnitude:m,weakMagnitude:m});}catch(e){}}
function updButtons(){var ab=save?save.ab:{};['dash','bash','grapple','arrow'].forEach(function(k){var b=document.querySelector('.tb[data-k="'+(k==='grapple'?'grap':k==='arrow'?'shoot':k)+'"]');if(b)b.style.display=ab[k]?'':'none';});var f=document.querySelector('.tb[data-k="flare"]');if(f)f.style.display=(s&&s.p.maxEn>0)?'':'none';}
// ---------- HUD ----------
function hud(){var p=s.p,h='';for(var i=0;i<p.maxHp;i++)h+='<i class="lf'+(i<p.hp?'':' e')+'"></i>';$('hp').innerHTML=h;var e='';for(i=0;i<p.maxEn;i++)e+='<i class="en'+(i<p.en?'':' e')+'"></i>';$('en').innerHTML=e;$('light').textContent=save.stats.light||0;
  $('useBtn').classList.toggle('on',s.use!=null||!!signT);
  if(s.trial)$('trialT').textContent=s.trial.t.toFixed(2)+'s';
  if(msgT>0){msgT-=1/60;if(msgT<=0)$('toast').classList.remove('on');}}
// ---------- loop ----------
var lowN=0,prevVx=0,last=performance.now(),acc=0,fpsA=[],frames=0;window.TD_FPS=0;
function frame(now){
  requestAnimationFrame(frame);var dt=Math.min(0.1,(now-last)/1000);last=now;frames++;fpsA.push(dt);if(fpsA.length>60)fpsA.shift();
  if(frames%30===0){var a=0;fpsA.forEach(function(x){a+=x;});window.TD_FPS=Math.round(fpsA.length/a);}
  // auto resolution: keep 60fps on phones by gently lowering render scale if frames drop
  if(mode==='play'&&!paused&&frames%60===0&&frames>180){if(window.TD_FPS<50&&(R.as||1)>0.62){lowN=(lowN||0)+1;if(lowN>=2){R.as=Math.max(0.6,(R.as||1)-0.13);R.resize();lowN=0;}}else lowN=0;}
  var I=readInput();
  if(mode==='play'&&!paused&&s){
    if(hs>0){hs-=dt;acc=0;}else acc+=dt;var n=0;
    if(s.p.gr&&Math.abs(s.p.vx)>6&&Math.random()<dt*7)R.dust(s.p.x-s.p.face*0.2,s.p.y+0.42,1,1);
    if(s.p.gr&&prevVx*s.p.vx<0&&Math.abs(prevVx)>4)R.dust(s.p.x,s.p.y+0.42,4,2);prevVx=s.p.vx;
    while(acc>=1/60&&n<4){S.step(st,s,I,1/60);if(trialRec&&s.trial&&(frames&1)===0&&trialRec.length<9000)trialRec.push([+s.p.x.toFixed(2),+s.p.y.toFixed(2)]);if(ghost&&s.trial){ghost.i++;}I.jumpP=I.dashP=I.bashP=I.grapP=I.useP=I.flareP=I.shootP=false;handle(s.ev.slice());save.stats.time=(save.stats.time||0)+1/60;acc-=1/60;n++;
      if(s.exit==='warp'){var w=s.warp;persist();loadArea(w.to,w.sp);save.spawn=null;writeSave();R.flash(0.5);if(AREAS[w.to].secret&&!save.seen['c'+w.to]){save.seen['c'+w.to]=1;toast('Secret found: '+AREAS[w.to].name,true);}break;}
      if(s.exit){persist();var nxt=s.exit==='next'?ai+1:ai-1;if(nxt>=0&&nxt<AREAS.length&&!AREAS[nxt].secret){var tst=S.build(AREAS[nxt]);loadArea(nxt,s.exit==='next'?tst.entry.prev:tst.entry.next);save.spawn=null;writeSave();}break;}}
    if(acc>1)acc=0;
    signT=null;s.e.forEach(function(e){var d=Math.hypot(e.x-s.p.x,e.y-s.p.y);if(e.t==='!'&&d<2.2)signT=e.text;if(e.t==='tr'&&d<1.6&&!s.trial)signT=trialInfo(e.id);if(e.t==='W'&&d<1.5)signT='A hidden passage to '+(e.name||'somewhere')+'. Press Use.';if(e.t==='Q'&&d<1.5)signT='Moon dial: press Use to turn '+(s.night?'morning':'night')+'.';if(e.t==='S'&&d<1.5&&!signT)signT='Spirit well: press Use to grow stronger or travel.';});
    var mood=s.chase&&s.chase.on?'chase':(s.boss&&s.boss.on&&s.boss.hp>0)?'boss':(AREAS[ai].secret||s.night||signT)?'quiet':'normal';AU.mood(mood);
    R.zoomT=s.chase&&s.chase.on?0.78:(AREAS[ai].boss||AREAS[ai].final&&s.boss&&s.boss.on&&s.boss.hp>0)?0.86:1;
    var sb=$('sign');if(signT){sb.textContent=signT;sb.classList.add('on');}else sb.classList.remove('on');
    if(frames%20===0)explore();if(frames%600===0){persist();writeSave();}
    var near=null;if(save.ab.bash){var bd=3.3;s.e.forEach(function(e){if(e.t==='L'){var d=Math.hypot(e.x-s.p.x,e.y-s.p.y);if(d<bd){bd=d;near=e;}}});s.seeds.forEach(function(q){if(!q.friend){var d=Math.hypot(q.x-s.p.x,q.y-s.p.y);if(d<bd){bd=d;near=q;}}});}
    hud();
    R.draw(s,dt,{bashNear:near,ghost:ghost&&s.trial?ghost.pts[Math.min(ghost.pts.length-1,ghost.i>>1)]:null,night:s.night});
  } else if(s){R.draw(s,paused?0:dt*0.3,{night:s.night});}
  else titleDraw(dt);
  stTick();
}
var tw=null,ts=null;
function titleDraw(dt){if(!tw){tw=S.build(AREAS[0]);ts=S.create(tw,{});ts.p.x=50;ts.p.y=4.5;R.setArea(tw,0);R.snap(ts);}ts.p.x=50+Math.sin(performance.now()/3000)*3;R.draw(ts,dt,{});}
window.addEventListener('resize',function(){R.resize();});
window.addEventListener('pagehide',function(){if(mode==='play'){persist();writeSave();}});
document.addEventListener('visibilitychange',function(){if(document.hidden&&mode==='play'){persist();writeSave();if(!paused)togglePause();}});
R.init($('cv'));R.q=set.q;R.resize();saveSet();setupUI();setupTouch();updButtons();show('title');
requestAnimationFrame(frame);
// test hooks
window.TD={get s(){return s;},get save(){return save;},start:startGame,loadArea:function(i,sp){if(!save)save=newSave();mode='play';show(null);document.body.classList.add('playing');loadArea(i,sp);updButtons();},openMap:openMap,story:story,stNext:stNext,stDone:stDone,openWell:openWell,closeWell:closeWell,pct:pct,migrate:migrate,TRIALS:TRIALS,stats:function(){$('statsBody').innerHTML=statsHTML();show('stats');},show:show};
if('serviceWorker' in navigator&&!/nosw/.test(location.search))addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});
})();
