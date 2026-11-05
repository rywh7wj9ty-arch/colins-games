// ---------- UI ----------
let curScr='title',prevScr='title',focusI=0;
function showScr(id){document.querySelectorAll('.scr').forEach(e=>e.classList.remove('on'));if(id){$(id).classList.add('on');prevScr=curScr==='settings'?prevScr:curScr;curScr=id;focusI=0;setFocus();}else curScr=null;
  $('a2hs').style.display=(id==='title'&&isIOS()&&!standalone())?'block':'none';$('ver').style.display=id==='title'?'block':'none';$('touch').classList.toggle('on',touchOn&&!id&&G.mode==='play');}
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=()=>navigator.standalone||matchMedia('(display-mode: fullscreen)').matches||matchMedia('(display-mode: standalone)').matches;
function focusables(){return curScr?[...$(curScr).querySelectorAll('.btn,.lv:not(.lock),input[type=range],a.ov,.feat')]:[];}
function setFocus(){const f=focusables();f.forEach((e,i)=>e.classList.toggle('f',i===focusI&&usingPad));}
let usingPad=false;
function menuKey(m,e){
  if(!curScr)return; if(e===null)usingPad=true; else if(['u','d','l','r','j','ent'].includes(m))usingPad=true;
  const f=focusables();if(!f.length)return;const el=f[focusI];
  if(m==='u'||m==='l'){if(el&&el.type==='range'&&m==='l'){el.value=+el.value-5;el.dispatchEvent(new Event('input'));}else focusI=(focusI-1+f.length)%f.length;}
  else if(m==='d'||m==='r'){if(el&&el.type==='range'&&m==='r'){el.value=+el.value+5;el.dispatchEvent(new Event('input'));}else focusI=(focusI+1)%f.length;}
  else if(m==='j'||m==='ent'){if(el&&el.type!=='range'){el.click();if(e)e.preventDefault();}}
  else if(m==='p'){if(curScr==='pause')act('resume');else if(curScr!=='title'&&curScr!=='result')act('back');}
  setFocus();
}
function act(a,el){
  sfx('click');audioInit();
  if(a==='levels'){buildLevels();showScr('levels');}
  else if(a==='endless')startLevel(0,true);
  else if(a==='stats'){buildStats();showScr('stats');}
  else if(a==='settings'){syncSettings();showScr('settings');}
  else if(a==='back'){if(curScr==='settings'&&prevScr==='pause')showScr('pause');else toTitle();}
  else if(a==='resume'){G.mode='play';showScr(null);}
  else if(a==='restart'){startLevel(G.li,G.endless);}
  else if(a==='restartcp'){G.mode='play';showScr(null);if(G.endless)startLevel(0,true);else respawn();}
  else if(a==='quit'||a==='menu')toTitle();
  else if(a==='next'){startLevel(Math.min(LEVELS.length-1,G.li+1));}
  else if(a==='fx'){S.fx=S.fx==='auto'?'high':S.fx==='high'?'low':'auto';applyFx();save();syncSettings();}
  else if(a==='shake'){S.shake=!S.shake;save();syncSettings();}
  else if(a==='touchsz'){S.touchsz=S.touchsz===1?1.2:S.touchsz===1.2?0.85:1;applyTouchSize();save();syncSettings();}
  else if(a==='allon'||a==='alloff'){const v=a==='allon'?1:0;for(const k in FEAT){FEAT[k]=v;S.feat[k]=v;}applyFeat();save();syncSettings();}
  else if(a&&a.startsWith('lv'))startLevel(+a.slice(2));
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b){usingPad=false;act(b.dataset.a,b);}});
$('pauseB').addEventListener('click',()=>pauseGame());
$('pauseB').addEventListener('touchstart',e=>{e.stopPropagation();},{passive:true});
function pauseGame(){if(G.mode!=='play')return;G.mode='pause';showScr('pause');}
function toTitle(){G.mode='menu';$('hud').classList.remove('on');setTouch(touchOn);W=makeWorld(LEVELS[0]);resetPlayer();snapCam();
  if(FEAT.ui){const v=G.view;W.cam.x=clamp(W.cam.x+300,v.w/2,Math.max(v.w/2,W.cols.length*T-v.w/2));}
  setSong('title');showScr('title');}
function buildLevels(){const g=$('lvgrid');g.innerHTML='';LEVELS.forEach((L,i)=>{const b=document.createElement('button');const lock=i>=S.unlocked&&!QS.has('all');b.className='lv'+(lock?' lock':'');
  const be=S.best[L.id];b.innerHTML=`<b>${i+1}. ${L.name}</b><small>${lock?'Reach the garden before to unlock':L.sub}</small><small>${be?`★ ${be.stones}/3 · best ${be.score} · ${be.time}s`:''}</small>`;if(!lock)b.dataset.a='lv'+i;g.appendChild(b);});
  const e=document.createElement('button');e.className='lv endless';e.dataset.a='endless';e.innerHTML=`<b>☁ Sky Garden</b><small>Endless, gets faster</small><small>${S.hi[0]?'High score '+S.hi[0].s:'No score yet'}</small>`;g.appendChild(e);}
function buildStats(){const st=S.st,m=Math.floor(st.time/60);const rows=[['Games started',st.plays],['Gardens reached',st.clears],['Sun motes collected',st.motes],['Sunstones found',st.stones],['Jumps',st.jumps],['Dashes',st.dashes],['Plants grown',st.plants],['Bounces',st.bounced],['Falls',st.falls],['Sky Garden runs',st.endlessRuns],['Sky Garden distance',st.distance+' m'],['Time played',m+' min']];
  LEVELS.forEach(L=>{const b=S.best[L.id];rows.push([L.name+' best',b?`${b.score} pts · ★${b.stones}/3 · ${b.time}s`:'—']);});
  S.hi.forEach((h,i)=>rows.push(['Sky Garden #'+(i+1),h.s+' ('+h.d+')']));
  $('statT').innerHTML=rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');}
function showResult(r,nb){
  G.mode='result';setTouch(touchOn);$('hud').classList.remove('on');const t=$('resTab');
  if(r.endless){$('resT').textContent=nb?'New high score!':'Sky Garden run';t.innerHTML=[['Score',r.score],['Distance',r.dist+' m'],['Sun motes',r.motes],['Best combo','x'+r.combo],['High score',S.hi[0].s]].map(a=>`<tr><td>${a[0]}</td><td>${a[1]}</td></tr>`).join('');
    $('resBtns').innerHTML='<button class="btn" data-a="restart">Again</button><button class="btn alt" data-a="menu">Menu</button>';}
  else{$('resT').textContent='Garden reached!'+(nb?' New best!':'');t.innerHTML=[['Score',r.score],['Time',r.time+'s'],['Sun motes',r.motes+' / '+r.total],['Sunstones','★ '+r.stones+' / '+r.totalS],['Best combo','x'+r.combo]].map(a=>`<tr><td>${a[0]}</td><td>${a[1]}</td></tr>`).join('');
    $('resBtns').innerHTML=(G.li<LEVELS.length-1?'<button class="btn" data-a="next">Next garden</button>':'<button class="btn sky" data-a="endless">Sky Garden</button>')+'<button class="btn sky" data-a="restart">Replay</button><button class="btn alt" data-a="levels">Gardens</button>';}
  showScr('result');}
function applyFeat(){document.body.classList.toggle('ui11',!!FEAT.ui);}
function buildFeats(){const g=$('feats');if(!g)return;g.innerHTML=FEAT_META.map(([k,label])=>`<button type="button" class="feat${FEAT[k]?'':' off'}" data-feat="${k}">${FEAT[k]?'On':'Off'} · ${label}</button>`).join('');}
function syncSettings(){$('sMusic').value=S.music;$('sSfx').value=S.sfx;$('sBright').value=S.bright;$('sFx').textContent='Effects: '+S.fx[0].toUpperCase()+S.fx.slice(1);$('sShake').textContent='Shake: '+(S.shake?'On':'Off');
  $('sTouch').textContent=S.touchsz===1?'Normal':S.touchsz>1?'Large':'Small';
  buildFeats();
  $('older').innerHTML=VERSIONS.map(v=>v.v===GAME_VERSION?`<div class="row" style="margin:4px 0"><b>v${v.v}</b> — ${v.note} <span class="note">(this version)</span></div>`:`<div class="row"><a class="ov" href="${v.url}">v${v.v}</a> — ${v.note}</div>`).join('');}
$('feats').addEventListener('click',e=>{const b=e.target.closest('[data-feat]');if(!b)return;const k=b.dataset.feat;if(!(k in FEAT))return;FEAT[k]=FEAT[k]?0:1;S.feat[k]=FEAT[k];applyFeat();save();sfx('click');audioInit();syncSettings();});
$('ver').addEventListener('click',()=>{if(curScr==='title'||G.mode==='menu')act('settings');});
$('sMusic').addEventListener('input',e=>{S.music=+e.target.value;setVol();save();});
$('sSfx').addEventListener('input',e=>{S.sfx=+e.target.value;setVol();save();sfx('mote',3);});
$('sBright').addEventListener('input',e=>{S.bright=+e.target.value;applyBright();save();});
function applyBright(){cv.style.filter=S.bright===100?'':`brightness(${S.bright/100})`;}
function applyFx(){G.fxScale=S.fx==='low'?0.4:1;}
function applyTouchSize(){$('touch').style.setProperty('zoom',S.touchsz);}
// HUD
let hudCache={};
function hudFull(){hudCache={};hudTick();}
function hudTick(){if(!W)return;const set=(k,v,f)=>{if(hudCache[k]!==v){hudCache[k]=v;f(v);}};
  set('m',P.motes,v=>$('moteN').textContent=v);
  set('p',P.petals,v=>$('petals').innerHTML='<span style="color:#ff9ec0">❀</span>'.repeat(Math.max(0,v))+'<span style="opacity:.35">❀</span>'.repeat(Math.max(0,3-v)));
  set('s',G.endless?'':P.stones+'/'+W.totalStones,v=>$('stones').textContent=v?'★ '+v:'');
  set('sc',G.endless?endlessScore():'',v=>$('score').textContent=v===''?'':v);
  const cm=P.combo>=3?'x'+P.combo+(P.combo>=10?' Sunny!':P.combo>=5?' Nice!':''):'';set('c',cm,v=>{$('combo').textContent=v;$('combo').style.opacity=v?1:0;});
  const pw=P.power?PW[P.power].n+' '+Math.ceil(P.powerT):'';set('pw',pw,v=>{$('power').style.display=v?'block':'none';$('power').textContent=v;});}
// ---------- main loop ----------
let last=performance.now(),fpsAcc=0,fpsN=0,lowT=0;
function frame(now){
  const dt=Math.min(1/30,(now-last)/1000);last=now;
  fpsAcc+=dt;fpsN++;if(fpsAcc>1){G.fps=fpsN/fpsAcc;fpsAcc=0;fpsN=0;if(S.fx==='auto'){if(G.fps<48){lowT++;if(lowT>=2)G.fxScale=Math.max(0.35,G.fxScale-0.2);}else{lowT=0;if(G.fps>57)G.fxScale=Math.min(1,G.fxScale+0.05);}}}
  try{
    if(G.mode==='menu'){readInput();G.t+=dt;if(W){W.cam.x+=dt*40;if(W.cam.x>W.cols.length*T-G.view.w/2)W.cam.x=G.view.w/2;W.cam.y=lerp(W.cam.y,W.H*T-G.view.h/2,0.05);}}
    else update(dt);
    if(!window.__NOR)render();musicTick();
  }catch(err){console.error(err);showErr(err);}
  requestAnimationFrame(frame);
}
let errShown=false;function showErr(e){if(errShown)return;errShown=true;const d=document.createElement('div');d.style.cssText='position:fixed;left:10px;bottom:10px;z-index:99;background:#fff;padding:10px;border-radius:10px;font:13px sans-serif;max-width:80%';d.innerHTML='Oops: '+String(e&&e.message||e).replace(/</g,'&lt;')+' <button onclick="location.reload()">Tap to reload</button>';document.body.appendChild(d);}
addEventListener('error',e=>showErr(e.error||e.message));
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseGame();if(AU.ctx)AU.ctx.suspend();}else if(AU.ctx)AU.ctx.resume();});
document.addEventListener('gesturestart',e=>e.preventDefault());
// boot
resize();applyBright();applyFx();applyTouchSize();applyFeat();toTitle();
if('ontouchstart' in window&&matchMedia('(pointer:coarse)').matches)touchOn=true;
requestAnimationFrame(frame);
if('serviceWorker' in navigator&&!QS.has('nosw')&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
window.SL={G,P,get W(){return W;},startLevel,K,pressQ,IN,S,LEVELS,FEAT,FEAT_META,parts:PARTS,GAME_VERSION,tp(x,y){P.x=x*T+T/2;P.y=y*T;P.vx=P.vy=0;snapCam();},act};
</script>
</body></html>
