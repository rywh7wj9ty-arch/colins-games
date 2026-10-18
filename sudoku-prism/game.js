// Sudoku Prism v2 — main game
import * as THREE from 'three';
import {generate,generateKiller,dailySeed,DIFFS,PEERS,UNITS,findHint} from './logic.js?v=20261018141852';
import {Audio} from './audio.js?v=20261018141852';
const $=id=>document.getElementById(id);
const audio=new Audio();
const LS='sudokuPrism.';
const load=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(LS+k));return v??d;}catch(e){return d;}};
const save=(k,v)=>{try{localStorage.setItem(LS+k,JSON.stringify(v));}catch(e){}};
const settings=Object.assign({music:50,sfx:70,bright:100,mist:true,auto:true,same:true,haptics:true,theme:'crystal',mode:'classic'},load('settings',{}));
const emptyStats=()=>({per:Object.fromEntries(Object.keys(DIFFS).map(k=>[k,{played:0,won:0,best:null,total:0}])),daily:{played:0,won:0,best:null,last:null,streak:0,bestStreak:0},winStreak:0,bestWinStreak:0,playTime:0,hints:0,
 killer:{played:0,won:0,best:null},zen:{played:0,won:0},ach:{},themes:[]});
const stats=Object.assign(emptyStats(),load('stats',{}));
for(const k of Object.keys(DIFFS))if(!stats.per[k])stats.per[k]={played:0,won:0,best:null,total:0};
let G=null;let notesMode=false,sel=-1,paused=true,hintHL=null,curHint=null;

// ---------- themes ----------
const THEMES={
 crystal:{name:'Crystal',hues:[0xff9cc4,0x8ccbff,0xaee88a,0xffd76a,0xbfa8ff,0xffb382,0x7fe6d0,0xff9e9e,0x9fc4ff],mix:0.72,slab:0xffffff,ridge:0x8fa8e8,
  given:'#1c2652',user:'#1f5fe0',note:'#5544c8',sel:0xffd54a,peer:0xfff4c4,same:0x9fd0ff,hint:0x9ff0c8,accent:0x7a6ad8,env:[0xffffff,0xffc6e0,0xa8dcff,0xfff1b0],irid:0.45,ground:0xffd6ea,
  pal:['#ff6fae','#ffcf3f','#4fc3ff','#6fe39a','#a98bff','#ff9a4f'],sw:['#9fd4ff','#ffd9ec']},
 candy:{name:'Candy',hues:[0xff8fc8,0xffc2a8,0x8ff0cc,0xffe07a,0xc9a6ff,0xffa8c8,0x8fe3ff,0xffcf8f,0xb6f59a],mix:0.75,slab:0xfff3f9,ridge:0xff86c0,
  given:'#4a1640',user:'#8a2ff0',note:'#c0398a',sel:0xfff07a,peer:0xfff0f6,same:0xffc0e8,hint:0xb0ffd8,accent:0xff5fa8,env:[0xffffff,0xffb0d8,0xb0fff0,0xfff0a0],irid:0.2,ground:0xffc8e8,
  pal:['#ff5fa8','#ffd23f','#5fe8c8','#b38bff','#ff9a6f','#7fd8ff'],sw:['#ffc6e6','#c6fff0']},
 ocean:{name:'Ocean',hues:[0x6fd6e8,0x8fb8ff,0x7fe8c0,0xa8e0ff,0x7fc8ff,0xa0f0e0,0x9fd8ff,0x80e0d0,0xb0d0ff],mix:0.72,slab:0xf3fcff,ridge:0x3fa6c8,
  given:'#0b3150',user:'#0a6fd0',note:'#137a8a',sel:0xffe066,peer:0xe8fbff,same:0xffd8a0,hint:0xb8ffd0,accent:0x14a3c7,env:[0xffffff,0x9ff0ff,0x60c8ff,0xe0fff0],irid:0.3,ground:0xc8f4ff,
  pal:['#27c4e8','#ffe066','#6fe3b0','#7fa8ff','#ff9f80','#ffffff'],sw:['#6fd0ff','#e9fff6']},
 night:{name:'Night',hues:[0xffb3e6,0xa8e6ff,0xc4ffb0,0xfff0a0,0xd8c4ff,0xffd0a8,0xa0fff0,0xffc4d0,0xb8d0ff],mix:0.7,slab:0xeceaff,ridge:0x8a84f0,
  given:'#1d1a4f',user:'#3330d0',note:'#5a3fc0',sel:0xffe45a,peer:0xfff7d6,same:0xb8e4ff,hint:0xb0ffd8,accent:0xffc83a,env:[0xffffff,0xc8b8ff,0x9fb8ff,0xffe8a8],irid:0.5,ground:0xb8b0ff,
  pal:['#ffd84a','#ff8fd8','#7fe8ff','#b8ff8a','#c8a8ff','#ffffff'],sw:['#4f55c9','#a493ec']},
};
let TH=THEMES[settings.theme]||THEMES.crystal;

// ---------- three.js scene ----------
const canvas=$('c'),wrap=$('wrap');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setClearColor(0x000000,0);
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
renderer.toneMapping=THREE.NeutralToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const maxAniso=renderer.capabilities.getMaxAnisotropy();
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(36,1,0.1,200);
const hemi=new THREE.HemisphereLight(0xffffff,TH.ground,1.0);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,1.6);sun.position.set(-5,14,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:2,far:30});sun.shadow.radius=4;sun.shadow.bias=-0.0008;sun.shadow.normalBias=0.02;scene.add(sun);
const rim=new THREE.DirectionalLight(0xdfeaff,0.6);rim.position.set(8,5,-8);scene.add(rim);
let envTex=null;function buildEnv(){const pm=new THREE.PMREMGenerator(renderer);const es=new THREE.Scene();es.background=new THREE.Color(0xeef4ff);
 const add=(c,p,s=3)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(s,16,8),new THREE.MeshBasicMaterial({color:c}));m.position.set(...p);es.add(m);};
 add(TH.env[0],[0,20,0],5);add(TH.env[1],[18,4,0]);add(TH.env[2],[-18,4,0]);add(TH.env[3],[0,4,18]);add(TH.env[0],[0,6,-18],2);
 if(envTex)envTex.dispose();envTex=pm.fromScene(es,0.04).texture;scene.environment=envTex;pm.dispose();es.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}
function roundedBox(w,h,d,r,bev){const s=new THREE.Shape();const x=-w/2+bev,y=-d/2+bev,W=w-2*bev,D=d-2*bev,R=Math.min(r,W/2);
 s.moveTo(x+R,y);s.lineTo(x+W-R,y);s.quadraticCurveTo(x+W,y,x+W,y+R);s.lineTo(x+W,y+D-R);s.quadraticCurveTo(x+W,y+D,x+W-R,y+D);s.lineTo(x+R,y+D);s.quadraticCurveTo(x,y+D,x,y+D-R);s.lineTo(x,y+R);s.quadraticCurveTo(x,y,x+R,y);
 const g=new THREE.ExtrudeGeometry(s,{depth:h-2*bev,bevelEnabled:true,bevelThickness:bev,bevelSize:bev,bevelSegments:3,curveSegments:4});g.rotateX(-Math.PI/2);g.center();g.computeVertexNormals();return g;}
const board=new THREE.Group();scene.add(board);
const slabMat=new THREE.MeshPhysicalMaterial({color:TH.slab,roughness:0.3,clearcoat:1,clearcoatRoughness:0.15});
const slab=new THREE.Mesh(roundedBox(10.4,0.5,10.4,0.5,0.12),slabMat);slab.position.y=-0.36;slab.receiveShadow=true;board.add(slab);
// soft contact shadow under the board
{const cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d');const g=x.createRadialGradient(64,64,10,64,64,64);g.addColorStop(0,'rgba(40,50,110,.35)');g.addColorStop(1,'rgba(40,50,110,0)');x.fillStyle=g;x.fillRect(0,0,128,128);
 const m=new THREE.Mesh(new THREE.PlaneGeometry(16,16),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=-1.1;board.add(m);}
const ridgeMat=new THREE.MeshStandardMaterial({color:TH.ridge,roughness:0.35});
for(const k of [-1.5,1.5]){const a=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.1,9.9),ridgeMat);a.position.set(k*1.04,-0.09,0);board.add(a);const b=a.clone();b.rotation.y=Math.PI/2;b.position.set(0,-0.09,k*1.04);board.add(b);}
const tileGeo=roundedBox(0.94,0.32,0.94,0.16,0.05);
const labelGeo=new THREE.PlaneGeometry(0.92,0.92);
const tiles=[];
function posOf(i){const r=Math.floor(i/9),c=i%9;return[c+Math.floor(c/3)*0.08-4.08,r+Math.floor(r/3)*0.08-4.08];}
for(let i=0;i<81;i++){
 const mat=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:0.2,metalness:0,clearcoat:1,clearcoatRoughness:0.06,iridescence:TH.irid,iridescenceIOR:1.3,envMapIntensity:0.75});
 const m=new THREE.Mesh(tileGeo,mat);const[x,z]=posOf(i);m.position.set(x,0,z);m.userData.i=i;m.castShadow=true;
 const cv=document.createElement('canvas');cv.width=cv.height=256;const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=maxAniso;
 const lab=new THREE.Mesh(labelGeo,new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,toneMapped:false}));lab.rotation.x=-Math.PI/2;lab.position.y=0.168;m.add(lab);
 board.add(m);tiles.push({m,mat,cv,ctx:cv.getContext('2d'),tex,lab,base:new THREE.Color(),y:0,ty:0,pop:0,spin:0,stamp:0,flash:0,shake:0,key:''});}
// selection + hint outlines
function outlineTex(){const cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d');x.strokeStyle='#fff';x.lineWidth=10;x.beginPath();x.roundRect(8,8,112,112,26);x.stroke();const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;}
const oTex=outlineTex();
const selRing=new THREE.Mesh(new THREE.PlaneGeometry(1.12,1.12),new THREE.MeshBasicMaterial({map:oTex,transparent:true,depthWrite:false,color:0xffffff,toneMapped:false}));selRing.rotation.x=-Math.PI/2;board.add(selRing);
// placement shock rings
const ringGeo=new THREE.RingGeometry(0.42,0.5,40);const rings=[];
function shock(i,color){const m=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color,transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;
 const p=tiles[i].m.position;m.position.set(p.x,p.y+0.2,p.z);board.add(m);rings.push({m,life:0});}
// floating decorations
const decos=[];{const shapes=[new THREE.IcosahedronGeometry(0.7,0),new THREE.TorusGeometry(0.6,0.22,12,32),new THREE.OctahedronGeometry(0.7),new THREE.SphereGeometry(0.55,24,16),new THREE.TorusKnotGeometry(0.45,0.15,64,8)];
 for(let k=0;k<16;k++){const m=new THREE.Mesh(shapes[k%shapes.length],new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:0.2,clearcoat:1,iridescence:0.4}));
  const a=k/16*Math.PI*2,r=9.5+(k%3)*2.5;m.position.set(Math.cos(a)*r,-3.5+(k%4)*2.2,Math.sin(a)*r);m.userData={y0:m.position.y,ph:k*1.7,sp:0.3+(k%5)*0.1};m.scale.setScalar(0.7+(k%3)*0.35);scene.add(m);decos.push(m);}}
// particles
const sprite=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#fff');g.addColorStop(0.45,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(cv);})();
const bursts=[];
function burst(at,n,spread,palette,up=4,size=0.3){const pos=new Float32Array(n*3),col=new Float32Array(n*3),vel=[];
 for(let k=0;k<n;k++){const p=at[k%at.length];pos.set([p.x,p.y+0.3,p.z],k*3);const c=new THREE.Color(palette[k%palette.length]);col.set([c.r,c.g,c.b],k*3);
  vel.push(new THREE.Vector3((Math.random()-.5)*spread,Math.random()*up+1,(Math.random()-.5)*spread));}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
 const pts=new THREE.Points(g,new THREE.PointsMaterial({size,map:sprite,vertexColors:true,transparent:true,depthWrite:false,toneMapped:false}));board.add(pts);bursts.push({pts,vel,life:0,max:1.6});}

function applyTheme(){TH=THEMES[settings.theme]||THEMES.crystal;document.body.dataset.theme=settings.theme;
 hemi.groundColor.setHex(TH.ground);slabMat.color.setHex(TH.slab);ridgeMat.color.setHex(TH.ridge);
 for(const t of tiles)t.mat.iridescence=TH.irid;decos.forEach((d,k)=>d.material.color.setHex(TH.hues[k%9]));selRing.material.color.setHex(0xffffff);
 const mc=document.querySelector('meta[name=theme-color]');if(mc)mc.content=TH.sw[0];
 buildEnv();computeBases();for(const t of tiles)t.key='';refreshTiles();
 if(!stats.themes.includes(settings.theme)){stats.themes.push(settings.theme);save('stats',stats);}}
function cageColors(){const col=new Array(G.cages.length).fill(-1);const adj=G.cages.map(()=>new Set());
 for(let i=0;i<81;i++){const a=G.cageOf[i];const r=Math.floor(i/9),c=i%9;for(const j of [c<8?i+1:-1,r<8?i+9:-1])if(j>=0&&G.cageOf[j]!==a){adj[a].add(G.cageOf[j]);adj[G.cageOf[j]].add(a);}}
 G.cages.forEach((cg,k)=>{const used=new Set([...adj[k]].map(n=>col[n]));let c=0;while(used.has(c))c++;col[k]=c;});return col;}
const KPAL=[0,2,4,6,8,1,3,5,7];
function computeBases(){const kc=G&&G.cages?cageColors():null;
 for(let i=0;i<81;i++){const r=Math.floor(i/9),c=i%9;const h=kc?TH.hues[KPAL[kc[G.cageOf[i]]%9]]:TH.hues[Math.floor(r/3)*3+Math.floor(c/3)];
  tiles[i].base.set(0xffffff).lerp(new THREE.Color(h),kc?0.62:TH.mix);}}

// ---------- view / camera ----------
const view={pad:0,h:1,yaw:0,pitch:0.4,tyaw:0,tpitch:0.4,base:0.4,dist:16,lx:0,lz:0,ox:0,oy:0};
const ori={x:0,y:0};
const corners=[];for(const x of [-5.25,5.25])for(const z of [-5.25,5.25])for(const y of [-0.6,0.45])corners.push(new THREE.Vector3(x,y,z));
const _v=new THREE.Vector3();
function setCam(yaw,p,d){camera.position.set(Math.sin(yaw)*Math.sin(p)*d+view.lx,Math.cos(p)*d,Math.cos(yaw)*Math.sin(p)*d+view.lz);camera.lookAt(view.lx,-0.15,view.lz);camera.updateMatrixWorld();}
function fitDist(yaw,p){let lo=4,hi=90;const sx=0.97,sy=0.95*(1-view.pad/Math.max(1,view.h));for(let k=0;k<18;k++){const d=(lo+hi)/2;setCam(yaw,p,d);let ok=true;for(const c of corners){_v.copy(c).project(camera);if(Math.abs(_v.x)>sx||Math.abs(_v.y)>sy||_v.z>1){ok=false;break;}}if(ok)hi=d;else lo=d;}return hi;}
function resize(){const r=wrap.getBoundingClientRect();const w=Math.max(1,r.width),h=Math.max(1,r.height);renderer.setSize(w,h,false);camera.aspect=w/h;view.w=w;view.h=h;if(view.pad>0)camera.setViewOffset(w,h,0,-view.pad/2,w,h);camera.updateProjectionMatrix();
 const nb=camera.aspect<0.85?0.34:0.4;if(Math.abs(view.tpitch-view.base)<0.001)view.tpitch=nb;view.base=nb;}
new ResizeObserver(resize).observe(wrap);window.addEventListener('resize',resize);resize();
window.addEventListener('deviceorientation',e=>{if(e.gamma==null)return;ori.x=THREE.MathUtils.clamp(e.gamma/35,-1,1);ori.y=THREE.MathUtils.clamp(((e.beta||45)-45)/35,-1,1);});

// ---------- labels ----------
const FONT='-apple-system,"SF Pro Rounded","Segoe UI",Roboto,sans-serif';
function drawTile(i){const t=tiles[i],v=G?G.values[i]:0,given=G?G.given[i]:0,notes=G?G.notes[i]:0;
 const sv=settings.same&&sel>=0&&G?G.values[sel]:0;
 const wrong=G&&v&&!given&&showMist()&&v!==G.solution[i];const key=v+'|'+given+'|'+notes+'|'+wrong+'|'+(notes?sv:0)+'|'+(G&&G.cages?1:0)+settings.theme;if(t.key===key)return;t.key=key;
 const x=t.ctx;x.clearRect(0,0,256,256);x.textAlign='center';x.textBaseline='middle';
 const killer=G&&G.cages;
 if(killer){const a=G.cageOf[i],r=Math.floor(i/9),c=i%9;x.strokeStyle='rgba(28,38,90,.7)';x.lineWidth=7;x.setLineDash([14,9]);x.beginPath();const m=11;
  if(r===0||G.cageOf[i-9]!==a){x.moveTo(m,m);x.lineTo(256-m,m);}if(r===8||G.cageOf[i+9]!==a){x.moveTo(m,256-m);x.lineTo(256-m,256-m);}
  if(c===0||G.cageOf[i-1]!==a){x.moveTo(m,m);x.lineTo(m,256-m);}if(c===8||G.cageOf[i+1]!==a){x.moveTo(256-m,m);x.lineTo(256-m,256-m);}x.stroke();x.setLineDash([]);
  if(G.cages[a].cells[0]===i){const s=String(G.cages[a].sum);x.font='800 72px '+FONT;const w=x.measureText(s).width+20;x.fillStyle='rgba(255,255,255,.95)';x.beginPath();x.roundRect(4,4,w,74,18);x.fill();x.fillStyle='#1c2652';x.textAlign='left';x.fillText(s,14,44);x.textAlign='center';}}
 const cy=killer?156:132;
 if(v){x.font=`800 ${killer?150:184}px ${FONT}`;x.lineJoin='round';x.lineWidth=14;x.strokeStyle='rgba(255,255,255,.85)';x.strokeText(v,128,cy);
  x.fillStyle=given?TH.given:(wrong?'#d62f4b':TH.user);x.fillText(v,128,cy);
  if(!given&&!wrong){x.fillStyle='rgba(255,255,255,.35)';x.beginPath();x.arc(128,cy+92,7,0,7);x.fill();}}
 else if(notes){x.font=`800 ${killer?64:78}px ${FONT}`;for(let d=1;d<=9;d++)if(notes&(1<<d)){const nx=(killer?76:46)+((d-1)%3)*(killer?66:82),ny=(killer?110:46)+Math.floor((d-1)/3)*(killer?56:82);
   if(d===sv){x.fillStyle='rgba(255,213,74,.95)';x.beginPath();x.arc(nx,ny,killer?30:38,0,7);x.fill();}x.fillStyle=TH.note;x.fillText(d,nx,ny+3);}}
 t.tex.needsUpdate=true;}
const showMist=()=>settings.mist&&G&&G.mode!=='zen';
const C_WRONG=new THREE.Color(0xffc4cc);
function refreshTiles(){const sv=sel>=0&&G?G.values[sel]:0;const peers=sel>=0?new Set(PEERS[sel]):new Set();
 const CS=new THREE.Color(TH.sel),CP=new THREE.Color(TH.peer),CM=new THREE.Color(TH.same),CH=new THREE.Color(TH.hint),CA=new THREE.Color(TH.accent);
 for(let i=0;i<81;i++){const t=tiles[i];drawTile(i);let c=t.base.clone();const v=G?G.values[i]:0;
  if(G&&showMist()&&v&&!G.given[i]&&v!==G.solution[i])c.lerp(C_WRONG,0.75);
  if(peers.has(i))c.lerp(CP,0.45);
  let ty=0;
  if(hintHL){if(hintHL.area.has(i))c.lerp(CH,0.8);if(hintHL.key.has(i)){c.lerp(CA,0.55);ty=0.12;}}
  if(settings.same&&sv&&v===sv&&i!==sel){c.lerp(CM,0.75);ty=0.1;}
  if(i===sel){c=CS.clone();ty=0.22;}
  t.mat.color.copy(c);t.ty=ty;}
 updatePad();updateProg();}

// ---------- haptics ----------
const hapEl=(()=>{const l=document.createElement('label');l.style.cssText='position:fixed;left:-200px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';l.setAttribute('aria-hidden','true');
 const i=document.createElement('input');i.type='checkbox';i.setAttribute('switch','');i.tabIndex=-1;l.appendChild(i);document.body.appendChild(l);return l;})();
function haptic(kind){if(!settings.haptics)return;try{if(navigator.vibrate)navigator.vibrate(kind==='win'?[20,60,20,60,40]:kind==='error'?[25,40,25]:kind==='unit'?[15,30,15]:8);else hapEl.click();}catch(e){}}

// ---------- achievements ----------
const ACH=[['first','First Solve','Solve any puzzle'],['flawless','Flawless','Solve with no mistakes'],['solo','Self-Made','Solve without hints'],['perfect','Perfect Prism','No mistakes and no hints'],
 ['speedy','Speedy','Solve Easy in under 5 minutes'],['swift','Swift Mind','Solve Medium in under 10 minutes'],['hard','Hard Hitter','Solve a Hard puzzle'],['expert','Grandmaster','Solve an Expert puzzle'],
 ['killer','Cage Crusher','Solve a Killer puzzle'],['killerx','Killer Instinct','Solve a Hard or Expert Killer'],['zen','Inner Calm','Solve a puzzle in Zen mode'],['daily','Early Bird','Solve a Daily puzzle'],
 ['streak3','On a Roll','3-day daily streak'],['streak7','Unstoppable','7-day daily streak'],['wins10','Ten Down','Win 10 puzzles'],['wins50','Half Century','Win 50 puzzles'],
 ['notes','Note Taker','Pencil in 25 notes in one puzzle'],['styler','Stylist','Try every theme']];
function totalWins(){return Object.values(stats.per).reduce((a,s)=>a+s.won,0)+stats.daily.won+stats.killer.won+stats.zen.won;}
function grant(id,quiet){if(stats.ach[id])return false;stats.ach[id]=Date.now();save('stats',stats);if(!quiet){const a=ACH.find(a=>a[0]===id);toast('🏆 '+a[1]);}return true;}
function checkMeta(quiet){const w=totalWins();if(w>=1)grant('first',quiet);if(w>=10)grant('wins10',quiet);if(w>=50)grant('wins50',quiet);
 if(stats.per.hard.won)grant('hard',quiet);if(stats.per.expert.won)grant('expert',quiet);if(stats.daily.won)grant('daily',quiet);
 if(stats.daily.bestStreak>=3)grant('streak3',quiet);if(stats.daily.bestStreak>=7)grant('streak7',quiet);if(stats.killer.won)grant('killer',quiet);if(stats.zen.won)grant('zen',quiet);
 if(Object.keys(THEMES).every(k=>stats.themes.includes(k)))grant('styler',quiet);}

// ---------- game state ----------
const MODES={classic:'Classic sudoku. Fill every row, column and 3×3 box with 1–9.',killer:'Killer: few clues, but dashed cages show the sum of their digits. No repeats inside a cage.',zen:'Zen: no timer and no mistake count. Just relax and solve.'};
function newGame(diff,daily=false){const mode=daily?'classic':settings.mode;const seed=daily?dailySeed()*7+13:undefined;const d=daily?'medium':diff;
 const p=mode==='killer'?generateKiller(d,seed):generate(d,seed);
 if(G&&!G.done&&G.moves>0)abandon();
 G={diff:d,daily,mode,dailyKey:daily?dailySeed():null,puzzle:p.puzzle,solution:p.solution,given:p.puzzle.map(v=>v?1:0),values:p.puzzle.slice(),notes:new Array(81).fill(0),hist:[],mistakes:0,hints:0,time:0,moves:0,done:false,units:[],noteCount:0};
 if(p.cages){G.cages=p.cages;G.cageOf=p.cageOf;}
 const s=statFor(G);s.played++;save('stats',stats);
 sel=-1;clearHint();computeBases();intro();persist();refreshTiles();updateHud();closeAll();paused=false;}
function statFor(g){return g.daily?stats.daily:g.mode==='killer'?stats.killer:g.mode==='zen'?stats.zen:stats.per[g.diff];}
function abandon(){stats.winStreak=0;save('stats',stats);}
function persist(){if(G)save('game',{...G,hist:G.hist.slice(-200)});}
function snapshot(){G.hist.push([G.values.slice(),G.notes.slice()]);if(G.hist.length>400)G.hist.shift();}
function unitsOf(i){const r=Math.floor(i/9),c=i%9,b=Math.floor(r/3)*3+Math.floor(c/3);return [UNITS[r],UNITS[9+c],UNITS[18+b]];}
function input(d,asNote=false){if(!G||G.done||sel<0)return;audio.unlock();if(G.given[sel]){audio.play('tap');tiles[sel].shake=0.5;return;}
 const T=tiles[sel];
 if(notesMode||asNote){if(G.values[sel])return;snapshot();G.notes[sel]^=(1<<d);if(G.notes[sel]&(1<<d))G.noteCount=(G.noteCount||0)+1;if((G.noteCount||0)>=25)grant('notes');
  audio.play('note');T.pop=0.5;G.moves++;haptic();}
 else{if(G.values[sel]===d)return;snapshot();G.values[sel]=d;G.notes[sel]=0;G.moves++;
  const ok=d===G.solution[sel];T.pop=1;T.stamp=1;
  if(!ok&&showMist()){G.mistakes++;audio.play('error');T.shake=1;haptic('error');}
  else{audio.play('place',d);haptic();shock(sel,new THREE.Color(TH.accent));
   if(ok){if(settings.auto)for(const p of PEERS[sel])G.notes[p]&=~(1<<d);
    let n=0;for(const u of unitsOf(sel)){const id=u.kind[0]+u.n;if(!G.units.includes(id)&&u.cells.every(c=>G.values[c]===G.solution[c])){G.units.push(id);celebrateUnit(u,sel,n++);}}
    burst([T.m.position],12,2,TH.pal,2.2,0.26);}}
  clearHint();checkWin();}
 persist();refreshTiles();updateHud();}
function erase(){if(!G||G.done||sel<0||G.given[sel])return;if(!G.values[sel]&&!G.notes[sel])return;snapshot();G.values[sel]=0;G.notes[sel]=0;audio.play('erase');haptic();tiles[sel].pop=0.6;clearHint();persist();refreshTiles();}
function undo(){if(!G||G.done||!G.hist.length)return;const[v,n]=G.hist.pop();for(let i=0;i<81;i++)if(G.values[i]!==v[i]||G.notes[i]!==n[i])tiles[i].pop=0.5;G.values=v;G.notes=n;audio.play('erase');haptic();clearHint();persist();refreshTiles();}
// ---------- smart hints ----------
const KIND={row:'row',column:'column',box:'3×3 box'};
function hint(){if(!G||G.done)return;audio.unlock();const h=findHint(G.values,G.solution,sel>=0&&!G.given[sel]?sel:-1,G.cages?{cages:G.cages}:null);if(!h)return;
 G.hints++;stats.hints++;save('stats',stats);sel=h.cell;curHint=h;audio.play('hint');haptic();
 const area=new Set(),key=new Set();let txt='';
 if(h.type==='wrong'){h.clash.forEach(c=>key.add(c));txt=h.clash.length?`<b>Check this one.</b> That ${h.digit} clashes with another ${h.digit} in the same row, column or box (highlighted).`:`<b>Not quite.</b> That ${h.digit} doesn't fit this puzzle's solution. Erase it and look again.`;}
 else if(h.type==='naked'){h.seen.forEach(c=>key.add(c));PEERS[h.cell].forEach(c=>area.add(c));txt=`<b>Naked single.</b> This cell's row, column and box already use every digit except <b>${h.digit}</b>. The highlighted tiles show them.`;}
 else if(h.type==='hidden'){h.unit.cells.forEach(c=>area.add(c));h.block.forEach(c=>key.add(c));txt=`<b>Hidden single.</b> In this ${KIND[h.unit.kind]}, <b>${h.digit}</b> can only go here. Every other empty cell already sees a ${h.digit} (highlighted).`;}
 else if(h.type==='cage'){h.cage.forEach(c=>area.add(c));txt=`<b>Cage sum.</b> This cage adds up to ${h.sum}. The other cells already make ${h.sum-h.digit}, so the last one must be <b>${h.digit}</b>.`;}
 else {PEERS[h.cell].forEach(c=>area.add(c));txt=`<b>Tricky spot.</b> No simple single right now. This cell can only be ${h.options.join(' or ')}, and the answer is <b>${h.digit}</b>.`;}
 hintHL={area,key};key.forEach(c=>{tiles[c].flash=0.9;});$('hintText').innerHTML=txt;$('hintGo').textContent=h.type==='wrong'?'Erase it':'Place '+h.digit;$('hintBox').classList.add('on');
 tiles[h.cell].pop=0.6;persist();refreshTiles();}
function clearHint(){hintHL=null;curHint=null;$('hintBox').classList.remove('on');}
$('hintGo').onclick=()=>{const h=curHint;if(!h)return;sel=h.cell;if(h.type==='wrong')erase();else{const n=notesMode;notesMode=false;input(h.digit);notesMode=n;}clearHint();refreshTiles();};
$('hintX').onclick=()=>{clearHint();refreshTiles();};
function celebrateUnit(u,from,n){audio.play('unit',n*2+(u.kind==='row'?0:u.kind==='column'?1:2));haptic('unit');
 const cells=u.cells.slice().sort((a,b)=>Math.abs(a-from)-Math.abs(b-from));
 cells.forEach((c,k)=>{setTimeout(()=>{const T=tiles[c];T.pop=1;T.spin=1;T.flash=1;},k*45);});
 burst(u.cells.map(c=>tiles[c].m.position),70,2.6,TH.pal,4.5);toast(`${KIND[u.kind][0].toUpperCase()+KIND[u.kind].slice(1)} complete ✨`);}
let spinT=-1,spinStart=0;
function checkWin(){if(!G.values.every((v,i)=>v===G.solution[i]))return;G.done=true;paused=true;clearHint();
 const s=statFor(G);s.won++;if('best' in s&&G.mode!=='zen'&&(s.best==null||G.time<s.best))s.best=Math.floor(G.time);if(!G.daily&&G.mode==='classic')s.total+=G.time;
 stats.winStreak++;stats.bestWinStreak=Math.max(stats.bestWinStreak,stats.winStreak);
 if(G.daily){const y=new Date(Date.now()-864e5);const yk=y.getFullYear()*10000+(y.getMonth()+1)*100+y.getDate();
  if(stats.daily.last!==G.dailyKey){stats.daily.streak=stats.daily.last===yk?stats.daily.streak+1:1;stats.daily.last=G.dailyKey;stats.daily.bestStreak=Math.max(stats.daily.bestStreak,stats.daily.streak);}}
 const before=new Set(Object.keys(stats.ach));
 if(G.mistakes===0&&G.mode!=='zen')grant('flawless',1);if(G.hints===0)grant('solo',1);if(G.mistakes===0&&G.hints===0&&G.mode!=='zen')grant('perfect',1);
 if(G.mode!=='zen'&&!G.daily){if(G.diff==='easy'&&G.time<300)grant('speedy',1);if(G.diff==='medium'&&G.time<600)grant('swift',1);}
 if(G.mode==='killer'&&(G.diff==='hard'||G.diff==='expert'))grant('killerx',1);
 checkMeta(1);const fresh=ACH.filter(a=>stats.ach[a[0]]&&!before.has(a[0]));
 save('stats',stats);save('game',{...G,hist:[]});audio.play('win');haptic('win');sel=-1;refreshTiles();
 for(let i=0;i<81;i++){const r=Math.floor(i/9)-4,c=i%9-4;setTimeout(()=>{tiles[i].pop=1;tiles[i].spin=1;tiles[i].flash=0.8;},Math.hypot(r,c)*90);}
 for(let k=0;k<6;k++)setTimeout(()=>burst([new THREE.Vector3((Math.random()-.5)*8,1,(Math.random()-.5)*8)],140,6,TH.pal,8,0.34),300+k*320);
 spinT=0;spinStart=performance.now();view.tpitch=view.base;view.tyaw=0;
 const stars=1+(G.mistakes===0||G.mode==='zen'?1:0)+(G.hints===0?1:0);
 setTimeout(()=>{$('stars').innerHTML=[0,1,2].map(k=>`<span class="${k<stars?'on':''}" style="animation-delay:${k*0.18}s">★</span>`).join('');
  const best=('best' in s)&&s.best===Math.floor(G.time)&&G.mode!=='zen';
  const name=G.daily?'Daily puzzle':(G.mode==='killer'?'Killer ':G.mode==='zen'?'Zen ':'')+DIFFS[G.diff].name;
  $('winBody').innerHTML=`<div class="kv">${G.mode==='zen'?'':`<div>Time<b>${fmt(G.time)}</b></div><div>Mistakes<b>${G.mistakes}</b></div>`}<div>Hints<b>${G.hints}</b></div><div>Win streak<b>${stats.winStreak}</b></div></div>
  <p>${name} solved${G.daily?' · Daily streak '+stats.daily.streak:''}${best?' · New best time! 🏆':''}</p>${fresh.length?`<div class="newach">${fresh.map(a=>`<div>🏆 <b>${a[1]}</b><small>${a[2]}</small></div>`).join('')}</div>`:''}`;show('ovWin');},2600);}
function intro(){for(let i=0;i<81;i++){const t=tiles[i];const r=Math.floor(i/9)-4,c=i%9-4;t.y=5+Math.hypot(r,c)*0.7+Math.random()*0.6;t.spin=1;t.key='';}
 board.rotation.y=0;spinT=-1;view.tyaw=0;view.tpitch=view.base;view.yaw=-0.7;view.pitch=0.75;}

// ---------- HUD ----------
const fmt=s=>{s=Math.floor(s);const h=Math.floor(s/3600),m=Math.floor(s/60)%60,x=s%60;return(h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0');};
function updateHud(){if(!G)return;const zen=G.mode==='zen';
 $('lDiff').textContent=G.daily?'Daily · '+new Date().toLocaleDateString(undefined,{day:'numeric',month:'short'}):(G.mode==='killer'?'Killer · ':zen?'Zen · ':'')+DIFFS[G.diff].name;
 $('lTime').textContent=zen?'No timer':fmt(G.time);$('lSep').style.display=$('lMist').style.display=(zen||!settings.mist)?'none':'';
 $('lMist').textContent=G.mistakes+(G.mistakes===1?' mistake':' mistakes');}
function updateProg(){if(!G)return;let n=0,e=0;for(let i=0;i<81;i++)if(!G.given[i]){e++;if(G.values[i]===G.solution[i])n++;}$('prog').firstChild.style.width=(e?n/e*100:0)+'%';}
const pad=$('pad');for(let d=1;d<=9;d++){const b=document.createElement('button');b.className='nk';b.dataset.d=d;b.innerHTML=d+'<small></small>';pad.appendChild(b);}
function updatePad(){if(!G)return;const sv=sel>=0?G.values[sel]:0;for(const b of pad.children){const d=+b.dataset.d;let n=0;for(let i=0;i<81;i++)if(G.values[i]===d&&G.values[i]===G.solution[i])n++;
 b.querySelector('small').textContent=9-n||'';b.classList.toggle('done',n>=9);b.classList.toggle('cur',sv===d);}}
let tt;function toast(s){const e=$('toast');e.textContent=s;e.classList.remove('on');void e.offsetWidth;e.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('on'),1600);}
function show(id){closeAll();$(id).classList.add('on');paused=true;}
function closeAll(){document.querySelectorAll('.ov').forEach(o=>o.classList.remove('on'));if(G&&!G.done)paused=false;}
function setMode(m){settings.mode=m;save('settings',settings);document.querySelectorAll('#modeSeg button').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));$('modeDesc').textContent=MODES[m];}
function openMenu(){const c=$('bCont');if(G&&!G.done){c.style.display='block';c.textContent='Continue · '+$('lDiff').textContent+(G.mode==='zen'?'':' · '+fmt(G.time));}else c.style.display='none';
 const dk=dailySeed();$('bDaily').textContent=stats.daily.last===dk?'☀ Daily Puzzle ✓ (replay)':'☀ Daily Puzzle';setMode(settings.mode);show('ovMenu');}
function renderStats(){const rows=Object.entries(DIFFS).map(([k,d])=>{const s=stats.per[k];return`<tr><td>${d.name}</td><td>${s.played}</td><td>${s.won}</td><td>${s.played?Math.round(s.won/s.played*100):0}%</td><td>${s.best!=null?fmt(s.best):'–'}</td><td>${s.won?fmt(s.total/s.won):'–'}</td></tr>`;}).join('');
 const dd=stats.daily,K=stats.killer,Z=stats.zen;const tot=Object.values(stats.per).reduce((a,s)=>a+s.played,0)+dd.played+K.played+Z.played,won=totalWins();
 const row=(n,s,best)=>`<tr><td>${n}</td><td>${s.played}</td><td>${s.won}</td><td>${s.played?Math.round(s.won/s.played*100):0}%</td><td>${best&&s.best!=null?fmt(s.best):'–'}</td><td>–</td></tr>`;
 $('statBody').innerHTML=`<div class="kv"><div>Games<b>${tot}</b></div><div>Wins<b>${won}</b></div><div>Win streak<b>${stats.winStreak}</b></div><div>Best streak<b>${stats.bestWinStreak}</b></div><div>Daily streak<b>${dd.streak}</b></div><div>Play time<b>${fmt(stats.playTime)}</b></div></div>
 <table><tr><th></th><th>Played</th><th>Won</th><th>Win%</th><th>Best</th><th>Avg</th></tr>${rows}${row('Daily',dd,1)}${row('Killer',K,1)}${row('Zen',Z,0)}</table><p style="font-size:13px;opacity:.7">Hints used: ${stats.hints} · Best daily streak: ${dd.bestStreak} · Awards: ${Object.keys(stats.ach).length}/${ACH.length}</p>`;show('ovStats');}
function renderAch(){$('achCount').textContent=`${ACH.filter(a=>stats.ach[a[0]]).length}/${ACH.length}`;
 $('achBody').innerHTML=ACH.map(([id,n,d])=>`<div class="ach ${stats.ach[id]?'got':''}"><i>${stats.ach[id]?'🏆':'🔒'}</i><div><b>${n}</b><small>${d}</small></div></div>`).join('');show('ovAch');}

// ---------- settings ----------
function applySettings(){audio.setMusic(settings.music/100);audio.setSfx(settings.sfx/100);renderer.toneMappingExposure=settings.bright/100;
 $('oMusic').textContent=settings.music;$('oSfx').textContent=settings.sfx;$('oBright').textContent=settings.bright+'%';save('settings',settings);}
for(const[k,id]of[['music','sMusic'],['sfx','sSfx'],['bright','sBright']]){const e=$(id);e.value=settings[k];e.addEventListener('input',()=>{settings[k]=+e.value;audio.unlock();applySettings();if(k==='sfx')audio.play('tap');});}
for(const[k,id]of[['mist','tMist'],['auto','tAuto'],['same','tSame'],['haptics','tHap']]){const e=$(id);e.checked=!!settings[k];e.onchange=()=>{settings[k]=e.checked;applySettings();for(const t of tiles)t.key='';refreshTiles();updateHud();if(k==='haptics')haptic();};}
{const th=$('themes');for(const[k,t]of Object.entries(THEMES)){const b=document.createElement('button');b.className='thm';b.dataset.theme=k;b.innerHTML=`<i style="background:linear-gradient(135deg,${t.sw[0]},${t.sw[1]})"></i>${t.name}`;
  b.onclick=()=>{settings.theme=k;applySettings();applyTheme();markTheme();audio.unlock();audio.play('tap');haptic();checkMeta();};th.appendChild(b);}}
function markTheme(){document.querySelectorAll('.thm').forEach(b=>b.classList.toggle('on',b.dataset.theme===settings.theme));}
applySettings();

// ---------- input ----------
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let drag=null;const tileMeshes=tiles.map(t=>t.m);
const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-0.16),_p=new THREE.Vector3(),_inv=new THREE.Matrix4();
canvas.addEventListener('pointerdown',e=>{audio.unlock();if(drag&&drag.id!==e.pointerId)return;try{canvas.setPointerCapture(e.pointerId);}catch(_){}drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:view.tyaw,pitch:view.tpitch,moved:false};});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>12)drag.moved=true;
 if(drag.moved){view.tyaw=THREE.MathUtils.clamp(drag.yaw-dx*0.006,-1.2,1.2);view.tpitch=THREE.MathUtils.clamp(drag.pitch-dy*0.005,0.0,0.95);}});
canvas.addEventListener('pointerup',e=>{if(drag&&drag.id===e.pointerId&&!drag.moved)pick(e.clientX,e.clientY);drag=null;});
canvas.addEventListener('pointercancel',()=>drag=null);
function cellAt(x,y){const r=canvas.getBoundingClientRect();ndc.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);
 const h=ray.intersectObjects(tileMeshes,false)[0];if(h&&h.face&&h.face.normal.y>0.5)return h.object.userData.i;
 // generous fallback: nearest tile on the board plane (covers gaps and edges)
 board.updateMatrixWorld();_inv.copy(board.matrixWorld).invert();const rr=ray.ray.clone().applyMatrix4(_inv);if(!rr.intersectPlane(plane,_p))return -1;
 let best=-1,bd=1e9;for(let i=0;i<81;i++){const[px,pz]=posOf(i);const d=Math.max(Math.abs(px-_p.x),Math.abs(pz-_p.z));if(d<bd){bd=d;best=i;}}return bd<0.85?best:-1;}
function pick(x,y){if(G&&G.done)return;const i=cellAt(x,y);if(i<0){if(sel>=0){sel=-1;refreshTiles();}return;}
 sel=i;if(curHint&&curHint.cell!==i)clearHint();audio.play('tap');haptic();tiles[sel].pop=0.35;refreshTiles();}
let lp=null,lpFired=false,padDown=null;const LP_MS=430;
function longPress(b){lpFired=true;if(G&&sel>=0&&!G.given[sel]&&!G.values[sel]){input(+b.dataset.d,true);b.classList.add('lp');setTimeout(()=>b.classList.remove('lp'),350);}}
pad.addEventListener('pointerdown',e=>{const b=e.target.closest('.nk');if(!b)return;audio.unlock();lpFired=false;padDown={b,t:performance.now()};clearTimeout(lp);
 lp=setTimeout(()=>{if(padDown&&padDown.b===b&&!lpFired)longPress(b);},LP_MS);});
pad.addEventListener('pointerup',()=>{clearTimeout(lp);if(padDown&&!lpFired&&performance.now()-padDown.t>=LP_MS)longPress(padDown.b);padDown=null;});
for(const ev of['pointercancel','pointerleave'])pad.addEventListener(ev,()=>{padDown=null;clearTimeout(lp);});
pad.addEventListener('contextmenu',e=>e.preventDefault());
pad.addEventListener('click',e=>{const b=e.target.closest('.nk');if(!b)return;if(lpFired){lpFired=false;return;}input(+b.dataset.d);});
$('bErase').onclick=erase;$('bUndo').onclick=undo;$('bHint').onclick=hint;
function setNotes(on){notesMode=on;$('bNotes').classList.toggle('on',notesMode);$('lNotes').textContent=notesMode?'ON':'OFF';pad.classList.toggle('notes',notesMode);}
$('bNotes').onclick=()=>{setNotes(!notesMode);audio.unlock();audio.play('tap');haptic();};
$('bView').onclick=()=>{view.tyaw=0;view.tpitch=view.base;audio.unlock();audio.play('tap');};
$('bMenu').onclick=()=>{audio.unlock();openMenu();};$('bSet').onclick=$('bSet2').onclick=()=>{audio.unlock();markTheme();show('ovSet');};
$('bStats').onclick=renderStats;$('bAch').onclick=renderAch;$('bCont').onclick=closeAll;
document.querySelectorAll('#modeSeg button').forEach(b=>b.onclick=()=>{audio.unlock();setMode(b.dataset.mode);audio.play('tap');haptic();});
document.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>{audio.unlock();newGame(b.dataset.diff);});
$('bDaily').onclick=()=>{audio.unlock();newGame('medium',true);};
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>{if(!G||G.done)openMenu();else closeAll();});
$('bAgain').onclick=()=>{if(!G.daily)settings.mode=G.mode;newGame(G.daily?'medium':G.diff);};$('bWinMenu').onclick=openMenu;
window.addEventListener('keydown',e=>{if(e.key>='1'&&e.key<='9')input(+e.key,e.shiftKey);else if(e.key==='Backspace'||e.key==='Delete'||e.key==='0')erase();else if(e.key==='n')$('bNotes').onclick();else if(e.key==='h')hint();
 else if(e.key.startsWith('Arrow')&&G){if(sel<0)sel=40;const r=Math.floor(sel/9),c=sel%9;const m={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]}[e.key];sel=((r+m[0]+9)%9)*9+(c+m[1]+9)%9;refreshTiles();}
 else if(e.key==='z'&&(e.metaKey||e.ctrlKey))undo();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){persist();save('stats',stats);}});
document.addEventListener('gesturestart',e=>e.preventDefault());

// ---------- loop ----------
const clock=new THREE.Clock();let saveT=0;const bgL=[...document.querySelectorAll('#bg div')];const _sp=new THREE.Vector3();
function frame(){requestAnimationFrame(frame);const dt=Math.min(0.05,clock.getDelta()),t=clock.elapsedTime;
 if(G&&!paused&&!G.done&&!document.hidden){G.time+=dt;stats.playTime+=dt;saveT+=dt;if(saveT>5){saveT=0;persist();save('stats',stats);}
  if(G.mode!=='zen'){const lt=fmt(G.time);if($('lTime').textContent!==lt)$('lTime').textContent=lt;}}
 if(G){const filled=G.values.filter((v,i)=>v&&v===G.solution[i]).length;audio.intensity=G.done?1:Math.max(0,(filled-30)/51)*(G.mode==='zen'?0.4:1);}
 const k=Math.min(1,dt*7);view.yaw+=(view.tyaw-view.yaw)*k;view.pitch+=(view.tpitch-view.pitch)*k;
 // subtle lean toward the selected tile + device tilt parallax
 let tx=0,tz=0;if(sel>=0&&!(G&&G.done)){const[px,pz]=posOf(sel);tx=px*0.035;tz=pz*0.035;}view.lx+=(tx-view.lx)*Math.min(1,dt*3);view.lz+=(tz-view.lz)*Math.min(1,dt*3);
 view.ox+=(ori.x*0.05-view.ox)*Math.min(1,dt*4);view.oy+=(ori.y*0.04-view.oy)*Math.min(1,dt*4);
 const tp=$('hintBox').classList.contains('on')?$('hintBox').offsetHeight+14:0;if(Math.abs(tp-view.pad)>0.5){view.pad+=(tp-view.pad)*Math.min(1,dt*9);camera.setViewOffset(view.w,view.h,0,-view.pad/2,view.w,view.h);}else if(view.pad!==tp){view.pad=tp;if(tp)camera.setViewOffset(view.w,view.h,0,-tp/2,view.w,view.h);else camera.clearViewOffset();}
 const Y=view.yaw+view.ox,P=Math.max(0,view.pitch+view.oy);const fd=fitDist(Y,P);view.dist+=(fd-view.dist)*(view.dist>30?1:Math.min(1,dt*8));setCam(Y,P,view.dist);
 for(let j=0;j<bgL.length;j++){const f=(j+1)*14;bgL[j].style.transform=`translate3d(${(-Y*f).toFixed(1)}px,${((P-0.4)*f*1.4).toFixed(1)}px,0)`;}
 const idle=!drag;board.rotation.x=idle?Math.sin(t*0.5)*0.01:0;board.rotation.z=idle?Math.cos(t*0.4)*0.01:0;
 if(spinT>=0){spinT=(performance.now()-spinStart)/1000;const u=Math.min(1,spinT/2.4);board.rotation.y=(u<0.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2)*Math.PI*2;if(u>=1){spinT=-1;board.rotation.y=0;}}
 for(let i=0;i<81;i++){const T=tiles[i];T.y+=(T.ty-T.y)*Math.min(1,dt*(T.y>1?5:14));
  T.pop=Math.max(0,T.pop-dt*3);T.spin=Math.max(0,T.spin-dt*1.6);T.stamp=Math.max(0,T.stamp-dt*4);
  const s=1+Math.sin(T.pop*Math.PI)*0.16*Math.min(1,T.pop*2);
  let sx=0;if(T.shake){T.shake=Math.max(0,T.shake-dt*2.5);sx=Math.sin(T.shake*40)*0.08*T.shake;}
  if(T.flash>0){T.flash=Math.max(0,T.flash-dt*2.2);T.mat.emissive.setRGB(T.flash*0.28,T.flash*0.28,T.flash*0.28);}else if(T.mat.emissive.r)T.mat.emissive.setRGB(0,0,0);
  const[x,z]=posOf(i);T.m.position.set(x+sx,T.y+Math.sin(T.pop*Math.PI)*0.22,z);T.m.scale.set(s,1+(s-1)*1.4,s);T.m.rotation.y=(1-Math.cos(T.spin*Math.PI))*Math.PI*0.5*(T.spin>0?1:0);
  const ls=1+T.stamp*T.stamp*0.6;T.lab.scale.set(ls,ls,1);}
 if(sel>=0&&!(G&&G.done)){const T=tiles[sel];selRing.visible=true;selRing.position.set(T.m.position.x,T.m.position.y+0.19,T.m.position.z);const s=1+Math.sin(t*5)*0.035;selRing.scale.set(s,s,1);selRing.material.opacity=0.85+Math.sin(t*5)*0.15;}else selRing.visible=false;
 for(let j=rings.length-1;j>=0;j--){const r=rings[j];r.life+=dt;const u=r.life/0.55;const s=1+u*1.6;r.m.scale.set(s,s,1);r.m.material.opacity=Math.max(0,1-u)*0.9;if(u>=1){board.remove(r.m);r.m.material.dispose();rings.splice(j,1);}}
 for(const d of decos){d.position.y=d.userData.y0+Math.sin(t*d.userData.sp+d.userData.ph)*0.6;d.rotation.x+=dt*0.2;d.rotation.y+=dt*d.userData.sp*0.5;}
 for(let j=bursts.length-1;j>=0;j--){const b=bursts[j];b.life+=dt;const p=b.pts.geometry.attributes.position;
  for(let q=0;q<b.vel.length;q++){const v=b.vel[q];v.y-=9*dt;p.array[q*3]+=v.x*dt;p.array[q*3+1]+=v.y*dt;p.array[q*3+2]+=v.z*dt;}
  p.needsUpdate=true;b.pts.material.opacity=Math.max(0,1-b.life/b.max);if(b.life>b.max){board.remove(b.pts);b.pts.geometry.dispose();b.pts.material.dispose();bursts.splice(j,1);}}
 renderer.render(scene,camera);}
// ---------- boot ----------
const saved=load('game',null);
if(saved&&saved.values&&!saved.done){G=saved;G.mode=G.mode||'classic';G.hist=G.hist||[];G.units=G.units||[];G.noteCount=G.noteCount||0;sel=-1;}else G=null;
checkMeta(true);applyTheme();markTheme();
if(G){computeBases();intro();refreshTiles();updateHud();}
openMenu();
frame();
window.__sp={get G(){return G;},get sel(){return sel;},get hint(){return curHint;},cellScreen(i){const v=tiles[i].m.getWorldPosition(new THREE.Vector3());v.y+=0.16;v.project(camera);const r=canvas.getBoundingClientRect();return{x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};},
 cellAt,audio,stats,settings,pointScreen(i,dx,dz){const v=tiles[i].m.getWorldPosition(new THREE.Vector3());v.x+=dx;v.z+=dz;v.y+=0.16;v.project(camera);const r=canvas.getBoundingClientRect();return{x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};},
 get settled(){return tiles.every(t=>Math.abs(t.y-t.ty)<0.02)&&Math.abs(view.yaw-view.tyaw)<0.01&&Math.abs(view.pitch-view.tpitch)<0.01&&spinT<0;}};
if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
