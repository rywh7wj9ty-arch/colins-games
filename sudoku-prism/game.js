// Sudoku Prism — main game
import * as THREE from 'three';
import {generate,dailySeed,DIFFS,PEERS} from './logic.js?v=20261016223446';
import {Audio} from './audio.js?v=20261016223446';
const $=id=>document.getElementById(id);
const audio=new Audio();
const LS='sudokuPrism.';
const load=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(LS+k));return v??d;}catch(e){return d;}};
const save=(k,v)=>{try{localStorage.setItem(LS+k,JSON.stringify(v));}catch(e){}};
const settings=Object.assign({music:50,sfx:70,bright:100,mist:true,auto:true},load('settings',{}));
const emptyStats=()=>({per:Object.fromEntries(Object.keys(DIFFS).map(k=>[k,{played:0,won:0,best:null,total:0}])),daily:{played:0,won:0,best:null,last:null,streak:0,bestStreak:0},winStreak:0,bestWinStreak:0,playTime:0,hints:0});
const stats=Object.assign(emptyStats(),load('stats',{}));
let G=null; // current game
let notesMode=false,sel=-1,paused=true;

// ---------- three.js scene ----------
const canvas=$('c'),wrap=$('wrap');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();
{const cv=document.createElement('canvas');cv.width=4;cv.height=256;const x=cv.getContext('2d');const g=x.createLinearGradient(0,0,0,256);
 g.addColorStop(0,'#9fd4ff');g.addColorStop(0.55,'#d9ecff');g.addColorStop(1,'#ffd9ec');x.fillStyle=g;x.fillRect(0,0,4,256);
 const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;scene.background=t;}
const camera=new THREE.PerspectiveCamera(40,1,0.1,200);
scene.add(new THREE.HemisphereLight(0xffffff,0xffd6ea,0.9));
const sun=new THREE.DirectionalLight(0xffffff,1.5);sun.position.set(-6,14,8);scene.add(sun);
const fill=new THREE.DirectionalLight(0xbfe0ff,0.7);fill.position.set(8,6,-6);scene.add(fill);
// environment map for glossy reflections (simple gradient room)
{const pm=new THREE.PMREMGenerator(renderer);const es=new THREE.Scene();es.background=new THREE.Color(0xeef6ff);
 const add=(c,p)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(3,16,8),new THREE.MeshBasicMaterial({color:c}));m.position.set(...p);es.add(m);};
 add(0xffffff,[0,20,0]);add(0xffc6e0,[18,4,0]);add(0xa8dcff,[-18,4,0]);add(0xfff1b0,[0,4,18]);
 scene.environment=pm.fromScene(es,0.04).texture;}
const board=new THREE.Group();scene.add(board);
// base slab
const slab=new THREE.Mesh(new THREE.BoxGeometry(10.3,0.5,10.3),new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:0.25,clearcoat:1,clearcoatRoughness:0.2}));
slab.position.y=-0.35;board.add(slab);
// box dividers (raised ridges)
const ridgeMat=new THREE.MeshStandardMaterial({color:0x8fa8e8,roughness:0.4});
for(const k of [-1.5,1.5]){const a=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.12,9.9),ridgeMat);a.position.set(k*1.02,-0.08,0);board.add(a);const b=a.clone();b.rotation.y=Math.PI/2;b.position.set(0,-0.08,k*1.02);board.add(b);}
const BOXHUE=[0xff9cc4,0x8ccbff,0xaee88a,0xffd76a,0xbfa8ff,0xffb382,0x7fe6d0,0xff9e9e,0x9fc4ff];
function tileBase(i){const r=Math.floor(i/9),c=i%9;return new THREE.Color(0xffffff).lerp(new THREE.Color(BOXHUE[Math.floor(r/3)*3+Math.floor(c/3)]),0.85);}
const tileGeo=(()=>{const g=new THREE.BoxGeometry(0.94,0.32,0.94,1,1,1);return g;})();
const labelGeo=new THREE.PlaneGeometry(0.9,0.9);
const tiles=[];
function posOf(i){const r=Math.floor(i/9),c=i%9;const gx=c+Math.floor(c/3)*0.06-4.06,gz=r+Math.floor(r/3)*0.06-4.06;return[gx*1.0,gz*1.0];}
for(let i=0;i<81;i++){
 const mat=new THREE.MeshPhysicalMaterial({color:tileBase(i),roughness:0.12,metalness:0,clearcoat:1,clearcoatRoughness:0.05,sheen:0.3,envMapIntensity:0.6});
 const m=new THREE.Mesh(tileGeo,mat);const[x,z]=posOf(i);m.position.set(x,0,z);m.userData.i=i;
 const cv=document.createElement('canvas');cv.width=cv.height=128;const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
 const lab=new THREE.Mesh(labelGeo,new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));lab.rotation.x=-Math.PI/2;lab.position.y=0.165;m.add(lab);
 board.add(m);tiles.push({m,mat,cv,ctx:cv.getContext('2d'),tex,lab,base:tileBase(i),y:0,ty:0,s:1,pop:0,spin:0,key:''});}
// floating decorations
const decos=[];{const shapes=[new THREE.IcosahedronGeometry(0.7,0),new THREE.TorusGeometry(0.6,0.22,12,32),new THREE.OctahedronGeometry(0.7),new THREE.SphereGeometry(0.55,24,16),new THREE.TorusKnotGeometry(0.45,0.15,64,8)];
 for(let k=0;k<16;k++){const m=new THREE.Mesh(shapes[k%shapes.length],new THREE.MeshPhysicalMaterial({color:BOXHUE[k%9],roughness:0.2,clearcoat:1}));
  const a=k/16*Math.PI*2,r=9+(k%3)*2.5;m.position.set(Math.cos(a)*r,-3+(k%4)*2.2,Math.sin(a)*r);m.userData={y0:m.position.y,ph:k*1.7,sp:0.3+(k%5)*0.1};m.scale.setScalar(0.8+(k%3)*0.35);scene.add(m);decos.push(m);}}
// particles
const sprite=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#fff');g.addColorStop(0.5,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(cv);})();
const bursts=[];
function burst(at,n,spread,palette,up=4){const pos=new Float32Array(n*3),col=new Float32Array(n*3),vel=[];
 for(let k=0;k<n;k++){const p=at[k%at.length];pos.set([p.x,p.y+0.3,p.z],k*3);const c=new THREE.Color(palette[k%palette.length]);col.set([c.r,c.g,c.b],k*3);
  vel.push(new THREE.Vector3((Math.random()-.5)*spread,Math.random()*up+1,(Math.random()-.5)*spread));}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
 const pts=new THREE.Points(g,new THREE.PointsMaterial({size:0.32,map:sprite,vertexColors:true,transparent:true,depthWrite:false}));board.add(pts);bursts.push({pts,vel,life:0,max:1.6});}
const PAL=['#ff6fae','#ffcf3f','#4fc3ff','#6fe39a','#a98bff','#ff9a4f'];

// ---------- view / camera ----------
const view={yaw:0,pitch:0.45,tyaw:0,tpitch:0.45,dist:16};
function resize(){const r=wrap.getBoundingClientRect();const w=Math.max(1,r.width),h=Math.max(1,r.height);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
 const half=5.25,fit=half/Math.tan(THREE.MathUtils.degToRad(camera.fov/2));view.dist=fit*Math.max(1,1/camera.aspect)+0.4;}
new ResizeObserver(resize).observe(wrap);window.addEventListener('resize',resize);resize();
function placeCamera(){const p=view.pitch,y=view.yaw,d=view.dist;camera.position.set(Math.sin(y)*Math.sin(p)*d,Math.cos(p)*d,Math.cos(y)*Math.sin(p)*d);camera.lookAt(0,-0.3,0);}

// ---------- labels ----------
function drawTile(i){const t=tiles[i],v=G?G.values[i]:0,given=G?G.given[i]:0,notes=G?G.notes[i]:0;
 const wrong=G&&v&&!given&&settings.mist&&v!==G.solution[i];const key=v+'|'+given+'|'+notes+'|'+wrong;if(t.key===key)return;t.key=key;
 const x=t.ctx;x.clearRect(0,0,128,128);x.textAlign='center';x.textBaseline='middle';
 if(v){x.font='800 92px -apple-system,"SF Pro Rounded","Segoe UI",Roboto,sans-serif';x.fillStyle='rgba(255,255,255,.7)';x.fillText(v,64,70);
  x.fillStyle=given?'#1f2a55':(wrong?'#e0405a':'#2563eb');x.fillText(v,64,66);}
 else if(notes){x.font='700 34px -apple-system,Roboto,sans-serif';x.fillStyle='#5b4fc4';for(let d=1;d<=9;d++)if(notes&(1<<d))x.fillText(d,22+((d-1)%3)*42,24+Math.floor((d-1)/3)*41);}
 t.tex.needsUpdate=true;}
const C_SEL=new THREE.Color(0xffd54a),C_PEER=new THREE.Color(0xfff6c8),C_SAME=new THREE.Color(0x9fd0ff),C_WRONG=new THREE.Color(0xffc4cc);
function refreshTiles(){const sv=sel>=0&&G?G.values[sel]:0;const peers=sel>=0?new Set(PEERS[sel]):new Set();
 for(let i=0;i<81;i++){const t=tiles[i];drawTile(i);let c=t.base.clone();const v=G?G.values[i]:0;
  if(G&&settings.mist&&v&&!G.given[i]&&v!==G.solution[i])c.lerp(C_WRONG,0.7);
  if(peers.has(i))c.lerp(C_PEER,0.55);if(sv&&v===sv)c.lerp(C_SAME,0.75);if(i===sel)c=C_SEL.clone();
  t.mat.color.copy(c);t.ty=i===sel?0.22:(sv&&v===sv?0.1:0);}
 updatePad();}

// ---------- game state ----------
function newGame(diff,daily=false){const seed=daily?dailySeed()*7+13:undefined;const d=daily?'medium':diff;const p=generate(d,seed);
 if(G&&!G.done&&G.moves>0)abandon();
 G={diff:d,daily,dailyKey:daily?dailySeed():null,puzzle:p.puzzle,solution:p.solution,given:p.puzzle.map(v=>v?1:0),values:p.puzzle.slice(),notes:new Array(81).fill(0),hist:[],mistakes:0,hints:0,time:0,moves:0,done:false,units:[]};
 const s=daily?stats.daily:stats.per[d];s.played++;save('stats',stats);
 sel=-1;intro();persist();refreshTiles();updateHud();closeAll();paused=false;}
function abandon(){stats.winStreak=0;save('stats',stats);}
function persist(){if(G)save('game',{...G,hist:G.hist.slice(-200)});}
function snapshot(){G.hist.push([G.values.slice(),G.notes.slice()]);if(G.hist.length>400)G.hist.shift();}
function unitsOf(i){const r=Math.floor(i/9),c=i%9,b=Math.floor(r/3)*3+Math.floor(c/3);return [['r',r,[...Array(9)].map((_,k)=>r*9+k)],['c',c,[...Array(9)].map((_,k)=>k*9+c)],['b',b,[...Array(9)].map((_,k)=>(Math.floor(b/3)*3+Math.floor(k/3))*9+(b%3)*3+k%3)]];}
function input(d){if(!G||G.done||sel<0)return;audio.unlock();if(G.given[sel]){audio.play('tap');return;}
 if(notesMode){if(G.values[sel])return;snapshot();G.notes[sel]^=(1<<d);audio.play('note');tiles[sel].pop=0.5;G.moves++;}
 else{if(G.values[sel]===d)return;snapshot();G.values[sel]=d;G.notes[sel]=0;G.moves++;
  const ok=d===G.solution[sel];tiles[sel].pop=1;
  if(!ok){G.mistakes++;if(settings.mist){audio.play('error');tiles[sel].shake=1;}else audio.play('place',d);}
  else{audio.play('place',d);
   if(settings.auto)for(const p of PEERS[sel])G.notes[p]&=~(1<<d);
   for(const[k,n,cells]of unitsOf(sel)){const id=k+n;if(!G.units.includes(id)&&cells.every(c=>G.values[c]===G.solution[c])){G.units.push(id);celebrateUnit(cells,k==='r'?0:k==='c'?1:2);}}
   burst([tiles[sel].m.position],14,2.2,PAL,2.5);}
  checkWin();}
 persist();refreshTiles();updateHud();}
function erase(){if(!G||G.done||sel<0||G.given[sel])return;if(!G.values[sel]&&!G.notes[sel])return;snapshot();G.values[sel]=0;G.notes[sel]=0;audio.play('erase');tiles[sel].pop=0.6;persist();refreshTiles();}
function undo(){if(!G||G.done||!G.hist.length)return;const[v,n]=G.hist.pop();for(let i=0;i<81;i++)if(G.values[i]!==v[i]||G.notes[i]!==n[i])tiles[i].pop=0.5;G.values=v;G.notes=n;audio.play('erase');persist();refreshTiles();}
function hint(){if(!G||G.done)return;audio.unlock();let i=sel;if(i<0||G.given[i]||G.values[i]===G.solution[i]){const e=[];for(let k=0;k<81;k++)if(G.values[k]!==G.solution[k])e.push(k);
  // prefer the cell with fewest candidates for a useful hint
  if(!e.length)return;i=e[Math.floor(Math.random()*e.length)];sel=i;}
 G.hints++;stats.hints++;const n=notesMode;notesMode=false;audio.play('hint');input(G.solution[i]);notesMode=n;toast('Hint: '+G.solution[i]);}
function celebrateUnit(cells,kind){audio.play('unit',kind*2);cells.forEach((c,k)=>{setTimeout(()=>{tiles[c].pop=1;tiles[c].spin=1;},k*45);});
 burst(cells.map(c=>tiles[c].m.position),90,3,PAL,4.5);}
function checkWin(){if(G.values.every((v,i)=>v===G.solution[i])){G.done=true;paused=true;
 const s=G.daily?stats.daily:stats.per[G.diff];s.won++;if(s.best==null||G.time<s.best)s.best=Math.floor(G.time);if(!G.daily)s.total+=G.time;
 stats.winStreak++;stats.bestWinStreak=Math.max(stats.bestWinStreak,stats.winStreak);
 if(G.daily){const y=new Date(Date.now()-864e5);const yk=y.getFullYear()*10000+(y.getMonth()+1)*100+y.getDate();
  if(stats.daily.last!==G.dailyKey){stats.daily.streak=stats.daily.last===yk?stats.daily.streak+1:1;stats.daily.last=G.dailyKey;stats.daily.bestStreak=Math.max(stats.daily.bestStreak,stats.daily.streak);}}
 save('stats',stats);audio.play('win');winShow=0;sel=-1;
 for(let i=0;i<81;i++){const r=Math.floor(i/9),c=i%9;setTimeout(()=>{tiles[i].pop=1;tiles[i].spin=1;},(r+c)*60);}
 for(let k=0;k<5;k++)setTimeout(()=>burst([new THREE.Vector3((Math.random()-.5)*8,1,(Math.random()-.5)*8)],160,6,PAL,8),k*350);
 setTimeout(()=>{$('winBody').innerHTML=`<div class="kv"><div>Time<b>${fmt(G.time)}</b></div><div>Mistakes<b>${G.mistakes}</b></div><div>Hints<b>${G.hints}</b></div><div>Win streak<b>${stats.winStreak}</b></div></div><p>${G.daily?'Daily puzzle complete! Daily streak: '+stats.daily.streak:DIFFS[G.diff].name+' solved'}${(G.daily?stats.daily:stats.per[G.diff]).best===Math.floor(G.time)?' · New best time! 🏆':''}</p>`;show('ovWin');},2400);}}
let winShow=-1;
function intro(){for(let i=0;i<81;i++){const t=tiles[i];t.y=6+Math.random()*3;t.spin=1;t.key='';}view.tyaw=0;view.tpitch=0.45;view.yaw=-0.6;view.pitch=0.7;}

// ---------- HUD ----------
const fmt=s=>{s=Math.floor(s);const h=Math.floor(s/3600),m=Math.floor(s/60)%60,x=s%60;return(h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0');};
function updateHud(){if(!G)return;$('lDiff').textContent=G.daily?'Daily · '+new Date().toLocaleDateString(undefined,{day:'numeric',month:'short'}):DIFFS[G.diff].name;
 $('lTime').textContent=fmt(G.time);$('lMist').textContent=G.mistakes+(G.mistakes===1?' mistake':' mistakes');}
const pad=$('pad');for(let d=1;d<=9;d++){const b=document.createElement('button');b.className='nk';b.dataset.d=d;b.innerHTML=d+'<small></small>';pad.appendChild(b);}
function updatePad(){if(!G)return;for(const b of pad.children){const d=+b.dataset.d;let n=0;for(let i=0;i<81;i++)if(G.values[i]===d&&G.values[i]===G.solution[i])n++;b.querySelector('small').textContent=9-n||'';b.classList.toggle('done',n>=9);}}
let tt;function toast(s){const e=$('toast');e.textContent=s;e.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('on'),1400);}
function show(id){closeAll();$(id).classList.add('on');paused=true;}
function closeAll(){document.querySelectorAll('.ov').forEach(o=>o.classList.remove('on'));if(G&&!G.done)paused=false;}
function openMenu(){$('bCont').style.display=G&&!G.done?'block':'none';const dk=dailySeed();$('bDaily').textContent=stats.daily.last===dk?'☀ Daily Puzzle ✓ (replay)':'☀ Daily Puzzle';show('ovMenu');}
function renderStats(){const rows=Object.entries(DIFFS).map(([k,d])=>{const s=stats.per[k];return`<tr><td>${d.name}</td><td>${s.played}</td><td>${s.won}</td><td>${s.played?Math.round(s.won/s.played*100):0}%</td><td>${s.best!=null?fmt(s.best):'–'}</td><td>${s.won?fmt(s.total/s.won):'–'}</td></tr>`;}).join('');
 const dd=stats.daily;const tot=Object.values(stats.per).reduce((a,s)=>a+s.played,0)+dd.played,won=Object.values(stats.per).reduce((a,s)=>a+s.won,0)+dd.won;
 $('statBody').innerHTML=`<div class="kv"><div>Games<b>${tot}</b></div><div>Wins<b>${won}</b></div><div>Win streak<b>${stats.winStreak}</b></div><div>Best streak<b>${stats.bestWinStreak}</b></div><div>Daily streak<b>${dd.streak}</b></div><div>Play time<b>${fmt(stats.playTime)}</b></div></div>
 <table><tr><th></th><th>Played</th><th>Won</th><th>Win%</th><th>Best</th><th>Avg</th></tr>${rows}<tr><td>Daily</td><td>${dd.played}</td><td>${dd.won}</td><td>${dd.played?Math.round(dd.won/dd.played*100):0}%</td><td>${dd.best!=null?fmt(dd.best):'–'}</td><td>–</td></tr></table><p style="font-size:13px;opacity:.7">Hints used: ${stats.hints} · Best daily streak: ${dd.bestStreak}</p>`;show('ovStats');}

// ---------- settings ----------
function applySettings(){audio.setMusic(settings.music/100);audio.setSfx(settings.sfx/100);renderer.toneMappingExposure=0.85*settings.bright/100;
 $('oMusic').textContent=settings.music;$('oSfx').textContent=settings.sfx;$('oBright').textContent=settings.bright+'%';save('settings',settings);}
for(const[k,id]of[['music','sMusic'],['sfx','sSfx'],['bright','sBright']]){const e=$(id);e.value=settings[k];e.addEventListener('input',()=>{settings[k]=+e.value;audio.unlock();applySettings();if(k==='sfx')audio.play('tap');});}
$('tMist').checked=settings.mist;$('tAuto').checked=settings.auto;
$('tMist').onchange=e=>{settings.mist=e.target.checked;applySettings();refreshTiles();};$('tAuto').onchange=e=>{settings.auto=e.target.checked;applySettings();};
applySettings();

// ---------- input ----------
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let drag=null;
canvas.addEventListener('pointerdown',e=>{audio.unlock();canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,yaw:view.tyaw,pitch:view.tpitch,moved:false};});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>10)drag.moved=true;
 if(drag.moved){view.tyaw=THREE.MathUtils.clamp(drag.yaw-dx*0.006,-1.2,1.2);view.tpitch=THREE.MathUtils.clamp(drag.pitch-dy*0.005,0.02,0.95);}});
canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved)pick(e.clientX,e.clientY);drag=null;});
canvas.addEventListener('pointercancel',()=>drag=null);
function pick(x,y){const r=canvas.getBoundingClientRect();ndc.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);
 const h=ray.intersectObjects(tiles.map(t=>t.m),false)[0];if(h){sel=h.object.userData.i;audio.play('tap');tiles[sel].pop=0.35;refreshTiles();}}
pad.addEventListener('click',e=>{const b=e.target.closest('.nk');if(b)input(+b.dataset.d);});
$('bErase').onclick=erase;$('bUndo').onclick=undo;$('bHint').onclick=hint;
$('bNotes').onclick=()=>{notesMode=!notesMode;$('bNotes').classList.toggle('on',notesMode);$('lNotes').textContent=notesMode?'ON':'OFF';pad.classList.toggle('notes',notesMode);audio.unlock();audio.play('tap');};
$('bView').onclick=()=>{view.tyaw=0;view.tpitch=0.45;audio.unlock();audio.play('tap');};
$('bMenu').onclick=()=>{audio.unlock();openMenu();};$('bSet').onclick=$('bSet2').onclick=()=>{audio.unlock();show('ovSet');};
$('bStats').onclick=renderStats;$('bCont').onclick=closeAll;
document.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>{audio.unlock();newGame(b.dataset.diff);});
$('bDaily').onclick=()=>{audio.unlock();newGame('medium',true);};
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>{if(!G||G.done)openMenu();else closeAll();});
$('bAgain').onclick=()=>newGame(G.daily?'medium':G.diff);$('bWinMenu').onclick=openMenu;
window.addEventListener('keydown',e=>{if(e.key>='1'&&e.key<='9')input(+e.key);else if(e.key==='Backspace'||e.key==='Delete'||e.key==='0')erase();else if(e.key==='n')$('bNotes').onclick();
 else if(e.key.startsWith('Arrow')&&G){if(sel<0)sel=40;const r=Math.floor(sel/9),c=sel%9;const m={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]}[e.key];sel=((r+m[0]+9)%9)*9+(c+m[1]+9)%9;refreshTiles();}
 else if(e.key==='z'&&(e.metaKey||e.ctrlKey))undo();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){persist();save('stats',stats);}});
document.addEventListener('gesturestart',e=>e.preventDefault());

// ---------- loop ----------
const clock=new THREE.Clock();let saveT=0;
function frame(){requestAnimationFrame(frame);const dt=Math.min(0.05,clock.getDelta()),t=clock.elapsedTime;
 if(G&&!paused&&!G.done&&!document.hidden){G.time+=dt;stats.playTime+=dt;saveT+=dt;if(saveT>5){saveT=0;persist();save('stats',stats);}
  const lt=fmt(G.time);if($('lTime').textContent!==lt)$('lTime').textContent=lt;}
 if(G){const filled=G.values.filter((v,i)=>v&&v===G.solution[i]).length;audio.intensity=G.done?1:Math.max(0,(filled-30)/51);}
 view.yaw+=(view.tyaw-view.yaw)*Math.min(1,dt*6);view.pitch+=(view.tpitch-view.pitch)*Math.min(1,dt*6);
 const idle=!drag;placeCamera();
 board.rotation.x=idle?Math.sin(t*0.5)*0.012:0;board.rotation.z=idle?Math.cos(t*0.4)*0.012:0;
 for(let i=0;i<81;i++){const T=tiles[i];T.y+=(T.ty-T.y)*Math.min(1,dt*(T.y>1?5:12));
  T.pop=Math.max(0,T.pop-dt*3);T.spin=Math.max(0,T.spin-dt*1.6);const s=1+Math.sin(T.pop*Math.PI)*0.18*Math.min(1,T.pop*2);
  let sx=0;if(T.shake){T.shake=Math.max(0,T.shake-dt*2.5);sx=Math.sin(T.shake*40)*0.08*T.shake;}
  const[x,z]=posOf(i);T.m.position.set(x+sx,T.y+Math.sin(T.pop*Math.PI)*0.25,z);T.m.scale.set(s,1+(s-1)*1.5,s);T.m.rotation.y=(1-Math.cos(T.spin*Math.PI))*Math.PI*0.5*(T.spin>0?1:0);}
 for(const d of decos){d.position.y=d.userData.y0+Math.sin(t*d.userData.sp+d.userData.ph)*0.6;d.rotation.x+=dt*0.2;d.rotation.y+=dt*d.userData.sp*0.5;}
 for(let k=bursts.length-1;k>=0;k--){const b=bursts[k];b.life+=dt;const p=b.pts.geometry.attributes.position;
  for(let j=0;j<b.vel.length;j++){const v=b.vel[j];v.y-=9*dt;p.array[j*3]+=v.x*dt;p.array[j*3+1]+=v.y*dt;p.array[j*3+2]+=v.z*dt;}
  p.needsUpdate=true;b.pts.material.opacity=Math.max(0,1-b.life/b.max);if(b.life>b.max){board.remove(b.pts);b.pts.geometry.dispose();b.pts.material.dispose();bursts.splice(k,1);}}
 renderer.render(scene,camera);}
// ---------- boot ----------
const saved=load('game',null);
if(saved&&saved.values&&!saved.done){G=saved;G.hist=G.hist||[];G.units=G.units||[];sel=-1;intro();refreshTiles();updateHud();openMenu();}
else{G=null;refreshTiles();openMenu();}
frame();
window.__sp={get G(){return G;},cellScreen(i){const v=tiles[i].m.getWorldPosition(new THREE.Vector3());v.y+=0.16;v.project(camera);const r=canvas.getBoundingClientRect();return{x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};},audio,get settled(){return tiles.every(t=>Math.abs(t.y-t.ty)<0.02)&&Math.abs(view.yaw-view.tyaw)<0.01&&Math.abs(view.pitch-view.tpitch)<0.01;}};
if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
