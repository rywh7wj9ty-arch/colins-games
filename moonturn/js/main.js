// Moonturn — main game
import * as THREE from '../vendor/three/three.module.js';
import {STAGES,WORLDS,PAL,ORDER} from './levels.js';
import {buildStage,skyMaterial,upAt,surfDist,CAM,textures,bloomMesh,FACES} from './world.js';
import {Audio} from './audio.js';
const V3=THREE.Vector3,Q=THREE.Quaternion; const $=id=>document.getElementById(id);
const QS=new URLSearchParams(location.search); const TEST=QS.has('test'); let SPEED=+(QS.get('speed')||1);
const PR=0.42, RUN=7.0, JV=11.8, FIELD=9;
// ---------------- save ----------------
const KEY='moonturn-save-v1';
function freshSave(old){return {v:1,done:{},notes:{},moths:{},stats:{time:0,jumps:0,twists:0,sights:0,rewinds:0,stomps:0,dist:0,notes:0},cur:'hub',settings:old?old.settings:{music:0.6,sfx:0.8,bright:1},ended:false,helpSeen:old?old.helpSeen:false,opened:{1:true}};}
let save=null; try{save=JSON.parse(localStorage.getItem(KEY));}catch(e){} if(!save||save.v!==1)save=freshSave(); 
function persist(){ try{localStorage.setItem(KEY,JSON.stringify(save));}catch(e){} }
const hasProgress=()=>Object.keys(save.done).length>0||Object.keys(save.notes).length>0||save.stats.time>20;
// ---------------- renderer ----------------
const app=$('app'),canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2)); renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene(); const camera=new THREE.PerspectiveCamera(55,1,0.1,900);
const skyM=skyMaterial(); const sky=new THREE.Mesh(new THREE.SphereGeometry(600,32,16),skyM); sky.frustumCulled=false; sky.renderOrder=-10; scene.add(sky);
const hemi=new THREE.HemisphereLight(0xffffff,0xffe0c0,0.8); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff2dc,0.95); scene.add(sun,sun.target);
scene.fog=new THREE.Fog(0xdfefff,45,150);
let portrait=false,camK=1;
function resize(){ const r=app.getBoundingClientRect(); const w=Math.max(1,r.width),h=Math.max(1,r.height); renderer.setSize(w,h,false); camera.aspect=w/h; portrait=w<h; camera.fov=portrait?64:52; camK=portrait?1.22:1; camera.updateProjectionMatrix(); }
addEventListener('resize',resize); addEventListener('orientationchange',()=>setTimeout(resize,200)); if(window.visualViewport)visualViewport.addEventListener('resize',resize); resize();
// ---------------- shared materials ----------------
const mats={ground:new THREE.MeshLambertMaterial({vertexColors:true}),decor:new THREE.MeshLambertMaterial({vertexColors:true}),
 note:new THREE.MeshLambertMaterial({color:'#ffd34d',emissive:new THREE.Color('#ffb21a'),emissiveIntensity:0.35})};
{ const s=new THREE.Shape(); for(let i=0;i<10;i++){ const a=i/10*Math.PI*2+Math.PI/2, r=i%2?0.13:0.32; const x=Math.cos(a)*r,y=Math.sin(a)*r; i?s.lineTo(x,y):s.moveTo(x,y);} s.closePath();
  mats.starGeo=new THREE.ExtrudeGeometry(s,{depth:0.1,bevelEnabled:true,bevelThickness:0.05,bevelSize:0.04,bevelSegments:2}); mats.starGeo.center(); }
const TX=textures();
// ---------------- Tobi ----------------
function makeTobi(){ const root=new THREE.Group(), pivot=new THREE.Group(); root.add(pivot);
 const L=(c,e)=>new THREE.MeshLambertMaterial({color:c,emissive:new THREE.Color(e||'#000000'),emissiveIntensity:e?0.12:0});
 const bodyG=new THREE.SphereGeometry(0.42,28,20); const body=new THREE.Mesh(bodyG,L('#fff1dc')); body.scale.set(1,1.04,1); body.position.y=0.44; pivot.add(body);
 const ol=new THREE.Mesh(bodyG,new THREE.MeshBasicMaterial({color:'#3a2f63',side:THREE.BackSide})); ol.scale.set(1.09,1.13,1.09); ol.position.y=0.44; pivot.add(ol);
 const eyeM=new THREE.MeshBasicMaterial({color:'#2a2346'}), shine=new THREE.MeshBasicMaterial({color:'#ffffff'}), cheek=new THREE.MeshBasicMaterial({color:'#ffa9b8'});
 for(const x of [-0.15,0.15]){ const e=new THREE.Mesh(new THREE.SphereGeometry(0.075,12,10),eyeM); e.scale.set(0.8,1.25,0.6); e.position.set(x,0.52,0.37); pivot.add(e);
  const s=new THREE.Mesh(new THREE.SphereGeometry(0.025,8,6),shine); s.position.set(x+0.02,0.56,0.41); pivot.add(s);
  const c=new THREE.Mesh(new THREE.SphereGeometry(0.05,8,6),cheek); c.scale.set(1,0.6,0.4); c.position.set(x*1.65,0.42,0.33); pivot.add(c); }
 const leafM=L('#6fcf5a'); const lg=new THREE.SphereGeometry(0.16,12,8); lg.scale(0.55,0.12,1); 
 const sprout=new THREE.Group(); sprout.position.set(0,0.86,0); pivot.add(sprout); const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.025,0.16,6),leafM); stem.position.y=0.06; sprout.add(stem);
 for(const s of [-1,1]){ const l=new THREE.Mesh(lg,leafM); l.position.set(s*0.11,0.14,0); l.rotation.set(0,Math.PI/2,s*0.5); sprout.add(l); }
 const scarfM=L('#ff9a3c','#ff7a1a'); const sc=new THREE.Mesh(new THREE.TorusGeometry(0.33,0.075,10,28),scarfM); sc.rotation.x=Math.PI/2; sc.position.y=0.25; pivot.add(sc);
 const tail=[]; let par=pivot; for(let i=0;i<3;i++){ const t=new THREE.Group(); t.position.set(i?0:0.12,i?0:0.26,i?-0.2:-0.3); par.add(t); const m=new THREE.Mesh(new THREE.BoxGeometry(0.13,0.05,0.22),scarfM); m.position.z=-0.1; t.add(m); tail.push(t); par=t; }
 const footM=L('#e88a4a'); const feet=[]; for(const x of [-0.17,0.17]){ const f=new THREE.Mesh(new THREE.SphereGeometry(0.11,10,8),footM); f.scale.set(1,0.6,1.35); f.position.set(x,0.06,0.04); pivot.add(f); feet.push(f); }
 return {root,pivot,body,tail,feet,sprout}; }
const tobi=makeTobi(); scene.add(tobi.root);
const shadow=new THREE.Mesh(new THREE.CircleGeometry(0.55,24),new THREE.MeshBasicMaterial({map:TX.shadow,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-6,fog:false})); shadow.renderOrder=3; scene.add(shadow);
const wisp=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.soft,color:'#9fe8ff',transparent:true,depthWrite:false,opacity:0.9,fog:false})); wisp.scale.setScalar(0.7); wisp.visible=false; scene.add(wisp);
// ---------------- particles ----------------
const PN=420; const pGeo=new THREE.BufferGeometry(); const pPos=new Float32Array(PN*3),pCol=new Float32Array(PN*3),pSz=new Float32Array(PN),pA=new Float32Array(PN);
pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));pGeo.setAttribute('color',new THREE.BufferAttribute(pCol,3));pGeo.setAttribute('size',new THREE.BufferAttribute(pSz,1));pGeo.setAttribute('alpha',new THREE.BufferAttribute(pA,1));
const pMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{map:{value:TX.soft},scale:{value:300}},
 vertexShader:`attribute float size,alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float scale; void main(){ vC=color; vA=alpha; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*scale/max(-mv.z,0.1); gl_Position=projectionMatrix*mv; }`,
 fragmentShader:`uniform sampler2D map; varying vec3 vC; varying float vA; void main(){ vec4 t=texture2D(map,gl_PointCoord); gl_FragColor=vec4(vC,t.a*vA); 
 #include <colorspace_fragment>
 }`});
const parts=new THREE.Points(pGeo,pMat); parts.frustumCulled=false; scene.add(parts); const P=[]; for(let i=0;i<PN;i++)P.push({life:0});
let pNext=0; const _c=new THREE.Color();
function spawn(p,v,col,size,life,grav){ const o=P[pNext]; pNext=(pNext+1)%PN; o.p=(o.p||new V3()).copy(p); o.v=(o.v||new V3()).copy(v); _c.set(col); o.r=_c.r;o.g=_c.g;o.b=_c.b; o.s=size; o.life=o.max=life; o.grav=grav||null; }
function burst(p,col,n,sp,size=0.35,life=0.9){ for(let i=0;i<n;i++){ const v=new V3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(sp*(0.4+Math.random()*0.6)); spawn(p,v,col,size*(0.6+Math.random()*0.6),life*(0.6+Math.random()*0.6)); } }
function updParts(dt){ for(let i=0;i<PN;i++){ const o=P[i]; if(o.life>0){ o.life-=dt; o.v.multiplyScalar(Math.pow(0.35,dt)); if(o.grav)o.v.addScaledVector(o.grav,dt); o.p.addScaledVector(o.v,dt); pPos[i*3]=o.p.x;pPos[i*3+1]=o.p.y;pPos[i*3+2]=o.p.z; pCol[i*3]=o.r;pCol[i*3+1]=o.g;pCol[i*3+2]=o.b; pSz[i]=o.s; pA[i]=Math.min(1,o.life/o.max*1.6)*0.9; } else pA[i]=0; }
 pGeo.attributes.position.needsUpdate=pGeo.attributes.color.needsUpdate=pGeo.attributes.size.needsUpdate=pGeo.attributes.alpha.needsUpdate=true; }
// ---------------- audio ----------------
const audio=new Audio(); audio.setVolumes(save.settings.music,save.settings.sfx);
// ---------------- state ----------------
const G={state:'boot',st:null,id:null,time:0,lt:0,hint:null,idle:0,hintShow:0,nearPad:null,auto:null,card:null,ended:false,frames:0,toastT:0};
window.__mtErrors=window.__mtErrors||[];
const pl={pos:new V3(),vel:new V3(),up:new V3(0,1,0),visUp:new V3(0,1,0),face:new V3(0,0,1),grounded:false,gObj:null,coyote:0,buf:0,air:0,body:null,noField:0,inv:0,squash:0,phase:0,safe:null,hist:[],jumping:false,lastBody:null};
const cam={up:new V3(0,1,0),f:new V3(0,0,-1),tgt:new V3(),snap:0,k:1,kT:1,orbit:null};
const inp={mx:0,my:0,jump:false,jumpEdge:false,twistEdge:false,yaw:0,kx:0,ky:0,stick:{x:0,y:0},tj:false,kj:false};
// ---------------- SDF queries ----------------
let hitObj=null; const _t=new V3();
function sceneDist(p){ let best=1e9,bo=null; const gr=G.st.ground; for(let i=0;i<gr.length;i++){ const o=gr[i]; if(!o.on)continue; const dx=p.x-o.bc.x,dy=p.y-o.bc.y,dz=p.z-o.bc.z; if(Math.sqrt(dx*dx+dy*dy+dz*dz)-o.br>best)continue; _t.copy(p).applyMatrix4(o.inv); const d=o.f(_t,o.P); if(d<best){best=d;bo=o;} } hitObj=bo; return best; }
const _g=new V3();
function grad(p,out){ const e=0.004,x=p.x,y=p.y,z=p.z; out.set(sceneDist(_g.set(x+e,y,z))-sceneDist(_g.set(x-e,y,z)),sceneDist(_g.set(x,y+e,z))-sceneDist(_g.set(x,y-e,z)),sceneDist(_g.set(x,y,z+e))-sceneDist(_g.set(x,y,z-e))); const l=out.length(); if(l<1e-9)out.copy(pl.up); else out.multiplyScalar(1/l); return out; }
function hazardDist(p){ let best=1e9; for(const o of G.st.hazards){ _t.copy(p).applyMatrix4(o.inv); best=Math.min(best,o.f(_t,o.P)); } for(const b of G.st.bodies){ if(b.kind==='sea'){ best=Math.min(best,p.distanceTo(b.c)-b.r);} } return best; }
function wpos(o,out=new V3()){ return o.getWorldPosition(out); }
// ---------------- stage loading ----------------
function disposeStage(){ if(!G.st)return; scene.remove(G.st.root); G.st.root.traverse(o=>{ if(o.geometry&&o.geometry!==mats.starGeo)o.geometry.dispose(); if(o.material&&!Object.values(mats).includes(o.material)){ (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose()); } }); G.st=null; }
const isOpen=w=>w===1||!!save.done[WORLDS[w-2].stages.at(-1)];
function labelSprite(text,sub,locked){ const c=document.createElement('canvas'); c.width=512;c.height=160; const g=c.getContext('2d'); g.fillStyle='rgba(255,255,255,0.86)'; const r=40; g.beginPath(); g.roundRect(8,8,496,144,r); g.fill();
 g.fillStyle=locked?'#8a86a8':'#3a2f63'; g.font='700 50px system-ui,-apple-system,sans-serif'; g.textAlign='center'; g.fillText(text,256,76); g.font='500 34px system-ui,-apple-system,sans-serif'; g.fillStyle=locked?'#9a96b8':'#6a5fa0'; g.fillText(sub,256,124);
 const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,fog:false})); s.scale.set(3.4,1.06,1); return s; }
function loadStage(id,opt={}){
 disposeStage(); G.auto=null; const def=STAGES[id]; const st=buildStage(def,mats); G.st=st; G.id=id; scene.add(st.root);
 const pal=PAL[def.pal]; skyM.uniforms.top.value.set(pal.skyTop); skyM.uniforms.mid.value.set(pal.skyMid); skyM.uniforms.low.value.set(pal.skyLow); skyM.uniforms.aur.value=0; scene.fog.color.set(pal.fog);
 hemi.color.set(pal.hemiS); hemi.groundColor.set(pal.hemiG); sun.color.set(pal.sun); st.seaMat.uniforms.fogColor.value.set(pal.fog);
 const got=save.notes[id]||[]; for(const n of st.notes){ if(got.includes(n.idx)){n.got=true;n.mesh.visible=false;} }
 if(st.moth&&save.moths[id]){st.moth.got=true;st.moth.mesh.visible=false;}
 for(const p of st.portals){ const open=isOpen(p.w); p.open=open; const w=WORLDS[p.w-1]; const h=p.mesh.userData.head;
  if(!open){ h.scale.setScalar(0.5); p.mesh.userData.beam.visible=false; h.children.forEach(c=>{ if(c.material&&c.material.color){ c.material=c.material.clone(); c.material.color.lerp(new THREE.Color('#d8d4e8'),0.6); if(c.material.emissive)c.material.emissiveIntensity=0; } }); }
  const done=w.stages.filter(s=>save.done[s]).length; const nt=w.stages.reduce((a,s)=>a+(save.notes[s]||[]).length,0); const ntot=w.stages.reduce((a,s)=>a+STAGES[s].parts.filter(x=>x.t==='note').length+(STAGES[s].groups||[]).reduce((b,g)=>b+(g.parts||[]).filter(x=>x.t==='note').length,0),0);
  const lab=labelSprite(p.w+' · '+w.name,open?('★ '+done+'/'+w.stages.length+'   ♪ '+nt+'/'+ntot+(w.stages.some(s=>save.moths[s])?'   ✦':'')):'Opens after World '+(p.w-1),!open); const pp=wpos(p.mesh); lab.position.copy(pp).addScaledVector(p.up,3.3); st.root.add(lab); }
 const r=st.res(def.start); pl.pos.copy(r.p).addScaledVector(r.up,PR+0.05+(opt.drop===false?0:2.2)); pl.vel.set(0,0,0); pl.up.copy(r.up); pl.visUp.copy(r.up); pl.grounded=false; pl.gObj=null; pl.hist.length=0; pl.inv=0.5; pl.noField=0; pl.body=r.b;
 const fr=st.res(def.face); const f=fr.p.clone().sub(r.p); f.addScaledVector(r.up,-f.dot(r.up)).normalize(); pl.face.copy(f); cam.up.copy(r.up); cam.f.copy(f); cam.tgt.copy(pl.pos); cam.k=cam.kT=1; cam.ahead=0; cam.orbit=null; cam.snap=0;
 pl.safe={p:r.p.clone().addScaledVector(r.up,PR+0.02),f:f.clone()};
 G.hint=null; G.hintIdx=0; G.idle=0; G.hintShow=0; G.reach={}; G.stageT=0; audio.setSong(def.world);
 if(!opt.title){ save.cur=id; persist(); } updateHud();
 const wn=def.world?WORLDS[def.world-1]:null; showBanner(def.world?(def.world+'-'+(wn.stages.indexOf(id)+1)):'', def.name);
 G.state='play'; fade(0); hideScreens(); $('hud').classList.remove('hidden'); $('touch').classList.remove('hidden');
 if(id==='hub'&&!save.helpSeen&&!TEST){ setTimeout(()=>{ if(G.state==='play'){ openScreen('help'); G.state='paused'; } },900); }
 if(id==='hub'&&opt.newOpen) setTimeout(()=>toast('A new bloom has opened in the meadow!'),1600);
}
// ---------------- HUD / UI helpers ----------------
function stageNoteTotals(id){ const st=STAGES[id]; const n=st.parts.filter(x=>x.t==='note').length+(st.groups||[]).reduce((b,g)=>b+(g.parts||[]).filter(x=>x.t==='note').length,0); return n; }
const ALLNOTES=ORDER.reduce((a,s)=>a+stageNoteTotals(s),0);
function updateHud(){ const st=G.st; if(!st)return; const tot=st.notes.length,got=st.notes.filter(n=>n.got).length; $('hudNotes').textContent=tot?('♪ '+got+'/'+tot):'';
 $('hudStars').textContent='★ '+Object.keys(save.done).length+'/'+ORDER.length; $('hudMoth').style.display=(st.moth&&st.moth.got)?'inline':'none'; }
let bannerT=0; function showBanner(a,b){ const el=$('banner'); el.innerHTML=(a?'<small>'+a+'</small>':'')+b; el.classList.add('show'); clearTimeout(bannerT); bannerT=setTimeout(()=>el.classList.remove('show'),2600); }
let toastT=0; function toast(s,ms=2600){ const el=$('toast'); el.textContent=s; el.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove('show'),ms); }
function fade(a,white=true){ const el=$('fade'); el.style.opacity=a; }
function hideScreens(){ document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden')); }
function openScreen(id){ hideScreens(); $(id).classList.remove('hidden'); }
// ---------------- gameplay ----------------
function die(){ if(G.state!=='play'||pl.inv>0)return; save.stats.rewinds++; audio.play('rewind');
 let k=-1; for(let i=pl.hist.length-1;i>=0;i--){ if(pl.hist[i].safe&&pl.hist.length-i>24){k=i;break;} }
 const path=[]; if(k>=0){ for(let i=pl.hist.length-1;i>=k;i-=2)path.push(pl.hist[i].p); } else { const a=pl.pos.clone(),b=pl.safe.p.clone(); for(let i=0;i<=40;i++)path.push(a.clone().lerp(b,i/40)); }
 G.rw={path,t:0,dur:Math.max(0.45,Math.min(1.1,path.length/90)),f:k>=0?pl.hist[k].f.clone():pl.safe.f.clone()}; G.state='rewind'; $('rewindFx').classList.add('on'); pl.vel.set(0,0,0); }
function twist(){ const pad=G.nearPad; if(!pad)return false; const g=G.st.groups[pad.g]; if(!g||g.t<1)return false; g.from=g.angle; g.target=g.angle+g.step; g.t=0; save.stats.twists++; audio.play('twist'); G.idle=0;
 const wp=wpos(pad.mesh); burst(wp.addScaledVector(pad.wup||pl.up,0.3),'#ffb3e0',18,4,0.3,0.6); return true; }
const _dq=new Q(),_pq=new Q(),_v=new V3(),_v2=new V3(),_n=new V3(),_fw=new V3(),_rt=new V3();
function groupsStep(dt,spin){ for(const id in G.st.groups){ const g=G.st.groups[id]; if(g.t>=1&&!spin)continue; _pq.copy(g.node.quaternion);
  if(spin){ g.angle+=dt*spin; } else { g.t=Math.min(1,g.t+dt/g.dur); const e=g.t<1?(1-Math.cos(Math.PI*g.t))/2:1; g.angle=g.from+(g.target-g.from)*e; if(g.t>=1){ g.angle=g.target; } }
  g.node.quaternion.setFromAxisAngle(g.axis,g.angle); g.node.updateMatrixWorld(true); for(const o of g.objs){ o.inv.copy(o.node.matrixWorld).invert(); o.bc.copy(o.lbc).applyMatrix4(o.node.matrixWorld); }
  if(pl.gObj&&pl.gObj.grp===g&&pl.grounded&&G.state==='play'){ _dq.copy(g.node.quaternion).multiply(_pq.invert()); const c=g.b.c; pl.pos.sub(c).applyQuaternion(_dq).add(c); pl.vel.applyQuaternion(_dq); pl.face.applyQuaternion(_dq); cam.f.applyQuaternion(_dq); cam.tgt.sub(c).applyQuaternion(_dq).add(c); } } }
function rotIndex(g){ return ((Math.round(g.angle/g.step)%g.n)+g.n)%g.n; }
function physStep(dt){ const st=G.st; G.time+=dt; G.stageT+=dt; save.stats.time+=dt;
 groupsStep(dt,0);
 // autopilot writes inputs
 if(G.auto)autoStep(dt);
 // gravity body
 let best=null,bd=1e9; for(const b of st.bodies){ const d=surfDist(b,pl.pos); if(d<FIELD&&d<bd){bd=d;best=b;} }
 if(best){ pl.body=best; upAt(best,pl.pos,pl.up); pl.noField=0; } else pl.noField+=dt;
 const up=pl.up;
 // input to world move
 _fw.copy(cam.f).addScaledVector(up,-cam.f.dot(up)); if(_fw.lengthSq()<1e-6)_fw.copy(pl.face); _fw.normalize(); _rt.crossVectors(_fw,up);
 const mx=inp.mx,my=inp.my; _v.copy(_rt).multiplyScalar(mx).addScaledVector(_fw,my); let mag=_v.length(); if(mag>1){_v.multiplyScalar(1/mag);mag=1;}
 const vu=pl.vel.dot(up); _v2.copy(pl.vel).addScaledVector(up,-vu); // horizontal
 const des=_v.multiplyScalar(RUN); const acc=pl.grounded?(mag>0.05?62:48):30; des.sub(_v2); const dl=des.length(),mxd=acc*dt; if(dl>mxd)des.multiplyScalar(mxd/dl); _v2.add(des);
 if(mag>0.08){ const tf=_v.copy(_rt).multiplyScalar(mx).addScaledVector(_fw,my).normalize(); pl.face.lerp(tf,Math.min(1,dt*14)); }
 pl.face.addScaledVector(up,-pl.face.dot(up)); if(pl.face.lengthSq()<1e-6)pl.face.copy(_fw); pl.face.normalize();
 let nvu=vu; if(inp.jumpEdge){pl.buf=0.14;inp.jumpEdge=false;} else pl.buf-=dt;
 if(pl.buf>0&&(pl.grounded||pl.coyote>0)){ nvu=JV; pl.grounded=false; pl.coyote=0; pl.buf=0; pl.jumping=true; save.stats.jumps++; audio.play('jump'); pl.squash=-0.25; const fp=pl.pos.clone().addScaledVector(up,-PR); for(let i=0;i<6;i++)spawn(fp,_n.randomDirection().multiplyScalar(1.5).addScaledVector(up,0.5),'#ffffff',0.3,0.4); }
 const gv=nvu>0?(inp.jump?30:64):42; if(best||pl.noField<0.01) nvu-=gv*dt; nvu=Math.max(nvu,-24);
 pl.vel.copy(_v2).addScaledVector(up,nvu);
 const wasG=pl.grounded; const fallSp=-nvu; pl.pos.addScaledVector(pl.vel,dt);
 // collide
 pl.grounded=false; for(let it=0;it<4;it++){ const d=sceneDist(pl.pos); if(d>=PR)break; const ho=hitObj; grad(pl.pos,_n); const nu=_n.dot(up);
  if(wasG&&nu<0.55&&nu>-0.3&&mag>0.1){ _v.copy(pl.pos).addScaledVector(up,0.36); if(sceneDist(_v)>=PR*0.99){ pl.pos.copy(_v); pl.vel.addScaledVector(up,-Math.min(0,pl.vel.dot(up))); continue; } }
  pl.pos.addScaledVector(_n,PR-d+0.0005); const vn=pl.vel.dot(_n); if(vn<0)pl.vel.addScaledVector(_n,-vn); if(_n.dot(up)>0.55){pl.grounded=true;pl.gObj=ho;} }
 if(!pl.grounded&&pl.vel.dot(up)<=0.5){ _v.copy(pl.pos).addScaledVector(up,-0.07); const d=sceneDist(_v); if(d<PR){ const ho=hitObj; grad(_v,_n); if(_n.dot(up)>0.55){pl.grounded=true;pl.gObj=ho;} } }
 if(pl.grounded){ if(!wasG){ if(pl.air>0.18){ pl.squash=Math.min(0.32,0.1+fallSp*0.018); if(fallSp>5)audio.play('land'); const fp=pl.pos.clone().addScaledVector(up,-PR+0.05); for(let i=0;i<8;i++)spawn(fp,_n.randomDirection().multiplyScalar(2).addScaledVector(up,-_n.dot(up)*2+0.4),'#fff8ea',0.32,0.45); } pl.jumping=false; }
  pl.coyote=0.12; pl.air=0; save.stats.dist+=_v2.length()*dt; } else { pl.coyote-=dt; pl.air+=dt; if(pl.air>0.05)pl.gObj=pl.gObj; }
 if(!pl.grounded&&pl.air>0.3)pl.gObj=null;
 if(pl.inv>0)pl.inv-=dt;
 // history / safe spot
 const safe=pl.grounded&&pl.gObj&&!pl.gObj.grp&&pl.air===0&&hazardDist(pl.pos)>1.0+PR;
 pl.hist.push({p:pl.pos.clone(),f:pl.face.clone(),safe}); if(pl.hist.length>540)pl.hist.shift(); if(safe&&G.frames%6===0){ pl.safe={p:pl.pos.clone(),f:pl.face.clone()}; }
 // hazards
 if(hazardDist(pl.pos)<PR+0.05||pl.noField>1.0){ die(); return; }
 // pickups etc
 interactions(dt);
 cameraStep(dt);
}
function interactions(dt){ const st=G.st; const p=pl.pos;
 for(const n of st.notes){ if(n.got)continue; const w=wpos(n.mesh,_v); if(w.distanceTo(p)<1.2){ n.got=true; n.mesh.visible=false; const arr=save.notes[G.id]||(save.notes[G.id]=[]); if(!arr.includes(n.idx))arr.push(n.idx); save.stats.notes=Object.values(save.notes).reduce((a,b)=>a+b.length,0);
   audio.play('note',st.notes.filter(x=>x.got).length-1); burst(w,'#ffe066',22,5,0.35,0.7); G.idle=0; updateHud(); persist(); } }
 if(st.moth&&!st.moth.got){ const w=wpos(st.moth.mesh,_v); if(w.distanceTo(p)<1.35){ st.moth.got=true; st.moth.mesh.visible=false; save.moths[G.id]=true; audio.play('moth'); burst(w,'#9fdcff',36,6,0.4,1); toast('You found a Moonmoth! ✦'); updateHud(); persist(); } }
 // pads
 let np=null,nd=1.75; for(const pd of st.pads){ const w=wpos(pd.mesh,_v); const d=w.distanceTo(p); if(d<nd){nd=d;np=pd;} } G.nearPad=pl.grounded||pl.air<0.2?np:null; if(np){ np.wup=np.wup||new V3(); np.wup.copy(np.up).applyQuaternion(np.mesh.parent.getWorldQuaternion(_pq)); }
 if(inp.twistEdge){ inp.twistEdge=false; if(G.nearPad)twist(); else if(st.pads.length) toast('Twist works on a swirl pad ⟳',1500); }
 // sights
 G.onGlyph=false; G.showBridge=false; for(const S of st.sights){ const near=wpos(S.decal,_v).distanceTo(p)<2.4; if(!S.done&&near)G.onGlyph=true; if(S.done&&S.post>0){ S.post-=dt; if(near)G.showBridge=true; } }
 for(const S of st.sights){ if(S.done){ if(S.t<1){ S.t=Math.min(1,S.t+dt/0.9); const e=1-Math.pow(1-S.t,3); for(const m of S.shards){ const s0=m.userData.s,s=s0+(1-s0)*e; m.scale.setScalar(s); m.position.copy(S.E).sub(G.st.bodies[0].c).multiplyScalar(1-s); } if(S.t>=1){ for(const m of S.shards){m.material.opacity=1;m.material.transparent=false;m.material.emissiveIntensity=0.05;m.material.needsUpdate=true;} } } continue; }
  const gp=wpos(S.decal,_v); const gup=_v2.copy(S.up); const d=gp.distanceTo(p); let al=0;
  if(d<2.0&&pl.grounded){ const cf=_n.copy(cam.f).addScaledVector(gup,-cam.f.dot(gup)).normalize(); const dot=cf.dot(S.v); al=THREE.MathUtils.smoothstep(dot,0.7,0.96); if(dot>0.955){ S.hold+=dt; if(S.hold>0.35){ S.done=true; S.post=1.8; S.obj.on=true; save.stats.sights++; audio.play('align'); G.idle=0; for(const m of S.shards)burst(wpos(m,new V3()),'#bff3ff',8,3,0.35,0.7); } } else S.hold=0; }
  S.align+= (al-S.align)*Math.min(1,dt*8); for(const m of S.shards)m.material.emissiveIntensity=0.15+S.align*0.55; if(al>0.2&&G.frames%20===0)audio.play('hum',S.align); }
 // bugs
 for(const bg of st.bugs){ if(bg.dead>0){ bg.dead-=dt; bg.mesh.visible=bg.dead<=0; if(bg.dead>0)continue; }
  const bp=wpos(bg.mesh,_v); const bup=upAt(bg.b,bp,_v2); const rel=_n.copy(p).sub(bp); if(rel.length()<0.95&&pl.inv<=0){ const vu=pl.vel.dot(bup); if(rel.dot(bup)>0.3&&vu<1.5){ bg.dead=5; bg.mesh.visible=false; save.stats.stomps++; audio.play('stomp'); pl.vel.addScaledVector(bup,-vu+10.5); pl.grounded=false; pl.jumping=true; burst(bp,'#b9a8ff',20,5,0.35,0.6); } else { die(); return; } } }
 // goal
 if(st.goal){ const w=wpos(st.goal.mesh,_v).addScaledVector(st.goal.up,0.7); if(w.distanceTo(p)<1.6) reachGoal(); }
 for(const po of st.portals){ const w=wpos(po.mesh,_v).addScaledVector(po.up,0.7); if(w.distanceTo(p)<1.6){ if(po.open) enterWorld(po.w); else if(!po.warned){ po.warned=true; audio.play('locked'); toast('This bloom opens after you finish World '+(po.w-1)+'.'); setTimeout(()=>po.warned=false,3000); } } }
 hints(dt);
}
function hints(dt){ const st=G.st,def=st.def; const hs=def.hints||[]; G.idle+=dt; let cur=null;
 for(const h of hs){ const r=st.res(h.at); const key=JSON.stringify(h.at); if(r.p.distanceTo(pl.pos)<2.5)G.reach[key]=true; let done=false; const dn=h.done||'reach';
  if(dn==='reach')done=!!G.reach[key]; else if(dn[0]==='g'){ const [gid,k]=dn.slice(2).split('='); done=rotIndex(st.groups[gid])===+k; } else if(dn[0]==='s'){ done=st.sights.find(s=>s.id===dn.slice(2)).done; }
  if(!done){cur={h,r};break;} }
 if(G.hint!==(cur&&cur.h)){ if(G.hint&&cur)G.idle=Math.min(G.idle,8); G.hint=cur&&cur.h; G.hintAt=cur&&cur.r.p; }
 const show=cur&&(G.idle>32||G.hintShow>0); if(G.hintShow>0)G.hintShow-=dt;
 const el=$('hint'); if(show){ el.textContent=cur.h.text; el.classList.add('show'); wisp.visible=true; } else { el.classList.remove('show'); wisp.visible=false; } }
function reachGoal(){ if(G.state!=='play')return; const def=G.st.def; const first=!save.done[G.id]; save.done[G.id]=true; persist(); G.state='launch'; G.lt=0; audio.play('launch'); updateHud(); G.launchFrom=pl.pos.clone(); G.launchUp=pl.up.clone();
 const w=WORLDS[def.world-1]; const idx=w.stages.indexOf(G.id); G.next=idx<w.stages.length-1?w.stages[idx+1]:null; G.worldEnd=!G.next; G.firstWorldEnd=first&&G.worldEnd; }
function enterWorld(wn){ if(G.state!=='play')return; const w=WORLDS[wn-1]; const s=w.stages.find(s=>!save.done[s])||w.stages[0]; G.state='launch'; G.lt=0; G.next=s; G.worldEnd=false; G.launchFrom=pl.pos.clone(); G.launchUp=pl.up.clone(); audio.play('launch'); }
// ---------------- camera ----------------
const _ax=new V3(),_q=new Q();
function cameraStep(dt){ const ang=cam.up.angleTo(pl.up); if(ang>1e-5){ _ax.crossVectors(cam.up,pl.up); if(_ax.lengthSq()<1e-8){ _ax.crossVectors(cam.f,cam.up); } _ax.normalize(); const a=Math.min(ang,ang*Math.min(1,dt*5.5)+dt*0.25); _q.setFromAxisAngle(_ax,a); cam.up.applyQuaternion(_q); cam.f.applyQuaternion(_q); }
 cam.f.addScaledVector(cam.up,-cam.f.dot(cam.up)); if(cam.f.lengthSq()<1e-6)cam.f.copy(pl.face); cam.f.normalize();
 let yaw=inp.yaw; inp.yaw=0; if(cam.snap!==0){ const s=Math.sign(cam.snap)*Math.min(Math.abs(cam.snap),dt*5); cam.snap-=s; yaw+=s; } if(yaw){ _q.setFromAxisAngle(cam.up,yaw); cam.f.applyQuaternion(_q); }
 // target smoothing: tangential fast, vertical slower
 _v.copy(pl.pos).sub(cam.tgt); const vu=_v.dot(cam.up); const k1=Math.min(1,dt*12),k2=Math.min(1,dt*(pl.grounded?9:4)); cam.tgt.addScaledVector(_v,k1).addScaledVector(cam.up,vu*(k2-k1));
 if(G.state==='play'){ cam.kT=G.showBridge?2.2:G.onGlyph?CAM.S:1; cam.ahead=(cam.ahead||0)+((G.showBridge?5:G.onGlyph?3.2:0)-(cam.ahead||0))*Math.min(1,dt*3); }
 cam.k+=(cam.kT-cam.k)*Math.min(1,dt*3); }
function placeCamera(){ const K=camK*cam.k; if(cam.orbit){ const o=cam.orbit; camera.position.copy(o.c).addScaledVector(o.u,o.h).addScaledVector(o.dir,o.d); camera.up.copy(o.u); camera.lookAt(o.c); return; }
 camera.position.copy(cam.tgt).addScaledVector(cam.up,CAM.H*K).addScaledVector(cam.f,-CAM.D*K);
 if(G.st) for(const b of G.st.bodies){ const sd=surfDist(b,camera.position); if(sd<1.4){ upAt(b,camera.position,_v2); camera.position.addScaledVector(_v2,1.4-sd); } }
 camera.up.copy(cam.up); camera.lookAt(_v.copy(cam.tgt).addScaledVector(cam.up,0.9).addScaledVector(cam.f,cam.ahead||0)); }
// ---------------- visuals per frame ----------------
const _m=new THREE.Matrix4(),_x=new V3(),_z=new V3();
function updateVisuals(dt){ const st=G.st; const t=G.time;
 // tobi
 pl.visUp.lerp(pl.up,Math.min(1,dt*12)).normalize(); _z.copy(pl.face).addScaledVector(pl.visUp,-pl.face.dot(pl.visUp)).normalize(); _x.crossVectors(pl.visUp,_z).normalize(); _m.makeBasis(_x,pl.visUp,_z);
 tobi.root.quaternion.setFromRotationMatrix(_m); tobi.root.position.copy(pl.pos).addScaledVector(pl.visUp,-PR);
 const hs=_v.copy(pl.vel).addScaledVector(pl.up,-pl.vel.dot(pl.up)).length(); pl.squash+=(0-pl.squash)*Math.min(1,dt*9);
 let sy=1-pl.squash, sxz=1+pl.squash*0.5; if(!pl.grounded){ const vu=pl.vel.dot(pl.up); sy=1+Math.min(0.18,Math.abs(vu)*0.012); sxz=1/Math.sqrt(sy); }
 tobi.pivot.scale.set(sxz,sy,sxz); pl.phase+=dt*(pl.grounded?hs*2.3:0); const run=Math.min(1,hs/RUN);
 tobi.feet[0].position.z=0.04+Math.sin(pl.phase)*0.16*run; tobi.feet[1].position.z=0.04-Math.sin(pl.phase)*0.16*run; tobi.feet[0].position.y=0.06+Math.max(0,Math.cos(pl.phase))*0.08*run; tobi.feet[1].position.y=0.06+Math.max(0,-Math.cos(pl.phase))*0.08*run;
 tobi.body.position.y=0.44+Math.abs(Math.sin(pl.phase))*0.05*run; tobi.pivot.rotation.x=run*0.12; tobi.sprout.rotation.z=Math.sin(t*3)*0.12+Math.sin(pl.phase)*0.1*run;
 for(let i=0;i<3;i++){ tobi.tail[i].rotation.x=-0.25-run*0.45+(pl.grounded?0:0.5)+Math.sin(t*6+i)*0.12; tobi.tail[i].rotation.y=Math.sin(t*4+i*0.8)*0.25; }
 tobi.root.visible=true;
 // blob shadow
 let tt=0,hit=false; const gp=_v.copy(pl.pos); for(let i=0;i<28;i++){ _v2.copy(gp).addScaledVector(pl.up,-tt); let d=sceneDist(_v2); for(const b of st.bodies)if(b.kind==='sea')d=Math.min(d,_v2.distanceTo(b.c)-b.r); if(d<0.02){hit=true;break;} tt+=Math.max(d,0.04); if(tt>12)break; }
 shadow.visible=hit&&G.state!=='launch'; if(hit){ shadow.position.copy(pl.pos).addScaledVector(pl.up,-tt+0.03); shadow.quaternion.setFromUnitVectors(new V3(0,0,1),pl.up); const k=Math.max(0.35,1-(tt-PR)/7); shadow.scale.setScalar(k); shadow.material.opacity=0.85*k; }
 // world anim
 for(const n of st.notes){ if(n.got)continue; n.mesh.quaternion.setFromUnitVectors(new V3(0,1,0),n.up); n.mesh.rotateY(t*2+n.idx); n.mesh.rotateX(Math.PI/2*0); n.mesh.position.copy(n.base).addScaledVector(n.up,Math.sin(t*2.5+n.idx)*0.1); }
 if(st.moth&&!st.moth.got){ const m=st.moth.mesh; const u=st.moth.up; m.position.copy(st.moth.base).addScaledVector(u,Math.sin(t*1.7)*0.18); m.quaternion.setFromUnitVectors(new V3(0,1,0),u); m.rotateY(t*0.8); m.userData.l.rotation.y=Math.sin(t*14)*0.9; m.userData.r.rotation.y=-Math.sin(t*14)*0.9; }
 const blooms=[st.goal,...st.portals].filter(Boolean); for(const bl of blooms){ const h=bl.mesh.userData.head; h.rotation.y=t*0.6; if(bl.mesh.userData.beam.visible)bl.mesh.userData.beam.material.opacity=0.1+Math.sin(t*2)*0.04; if(Math.random()<dt*6&&(bl.open!==false)) spawn(wpos(h,new V3()).addScaledVector(bl.up,(Math.random())*0.6),_n.copy(bl.up).multiplyScalar(1.2+Math.random()).add(new V3((Math.random()-.5),(Math.random()-.5),(Math.random()-.5))),'#fff3b0',0.28,1.4); }
 for(const pd of st.pads){ const near=G.nearPad===pd; pd.mesh.material.opacity=near?1:0.75+Math.sin(t*3)*0.12; pd.mesh.scale.setScalar(near?1.08+Math.sin(t*8)*0.04:1); }
 for(const bg of st.bugs){ if(G.state==='play'){ bg.t+=dt/bg.period; } const ph=(Math.sin(bg.t*Math.PI*2)+1)/2; const p=_v.copy(bg.a).lerp(bg.c,ph); let up;
  if(bg.cube){ up=upAt({c:new V3(),e:bg.b.e,eN:bg.b.eN},p,_v2).clone(); } else { up=p.clone().normalize(); p.copy(up).multiplyScalar(bg.b.R+(bg.h||1)); }
  bg.mesh.position.copy(p); const dirv=_n.copy(bg.c).sub(bg.a).multiplyScalar(Math.cos(bg.t*Math.PI*2)>=0?1:-1); dirv.addScaledVector(up,-dirv.dot(up)).normalize(); const xx=new V3().crossVectors(up,dirv); bg.mesh.quaternion.setFromRotationMatrix(_m.makeBasis(xx,up,dirv)); bg.mesh.scale.y=1+Math.sin(t*12)*0.06; }
 st.seaMat.uniforms.time.value=t; skyM.uniforms.time.value=t;
 if(st.motes){ st.motes.rotation.y=t*0.01; }
 // guide wisp
 if(wisp.visible&&G.hintAt){ const k=(t*0.5)%1; const a=pl.pos.clone().addScaledVector(pl.up,1.2), b=G.hintAt.clone().addScaledVector(pl.up,1.2); wisp.position.copy(a).lerp(b,k).addScaledVector(pl.up,Math.sin(k*Math.PI)*1.5); wisp.material.opacity=Math.sin(k*Math.PI)*0.9; if(G.frames%3===0)spawn(wisp.position,new V3(),'#bff0ff',0.25,0.6); }
 // twist / jump readiness
 $('btnTwist').classList.toggle('ready',!!G.nearPad); const onHop=st.glyphs.some(g=>g.icon==='hop'&&wpos(g.mesh,_v).distanceTo(pl.pos)<1.4); $('btnJump').classList.toggle('ready',onHop);
 // lights follow camera so the visible side is always lit
 const B=save.settings.bright; hemi.intensity=1.55*B; sun.intensity=1.75*B; skyM.uniforms.exposure.value=0.85+0.15*B; st.seaMat.uniforms.exposure.value=0.8+0.2*B;
 if(cam.orbit){ const o=cam.orbit; sun.position.copy(o.c).addScaledVector(o.u,o.h+14).addScaledVector(o.dir,o.d+6); sun.target.position.copy(o.c); sun.target.updateMatrixWorld(); } else { _rt.crossVectors(cam.f,cam.up); sun.position.copy(cam.tgt).addScaledVector(cam.up,14).addScaledVector(cam.f,-7).addScaledVector(_rt,6); sun.target.position.copy(cam.tgt); sun.target.updateMatrixWorld(); }
 hemi.position.copy(cam.up); skyM.uniforms.up.value.copy(cam.up); skyM.uniforms.sun.value.copy(sun.position).sub(cam.tgt).normalize(); sky.position.copy(camera.position);
}
// ---------------- launch / spectacle ----------------
function launchStep(dt){ G.lt+=dt; const u=G.launchUp; const t=G.lt; pl.pos.copy(G.launchFrom).addScaledVector(u,t*t*7+t*1.5); pl.face.applyAxisAngle(u,dt*10); cam.kT=1.9; cam.tgt.lerp(pl.pos,Math.min(1,dt*3)); cameraStep(0);
 if(G.frames%2===0)spawn(pl.pos,new V3(),G.worldEnd?'#fff6a8':'#ffffff',0.4,0.8);
 if(G.worldEnd){ if(t>0.9){ startSpectacle(); } return; }
 if(t>1.0)fade(Math.min(1,(t-1.0)/0.5)); if(t>1.55){ const nx=G.next; loadStage(nx); fade(1); G.fadeIn=0.6; } }
function startSpectacle(){ const st=G.st; G.state='spectacle'; G.lt=0; audio.play('fanfare'); const w=st.def.world; const c=st.center.clone(); const u=cam.up.clone();
 const dir=cam.f.clone().negate(); cam.orbit={c,u,dir,d:st.radius*0.9,h:st.radius*0.35,spin:0}; tobi.root.visible=false; G.spec={w,c};
 if(st.def.finale){ sproutField(st); } }
function spectacleStep(dt){ G.lt+=dt; const st=G.st,S=G.spec,o=cam.orbit,t=G.lt; o.d+=(st.radius*2.1-o.d)*Math.min(1,dt*0.8); o.h+=(st.radius*0.6-o.h)*Math.min(1,dt*0.8); o.dir.applyAxisAngle(o.u,dt*0.35);
 const R=st.radius; const rnd=()=>new V3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize();
 if(S.w===1){ for(let i=0;i<5;i++){ const b=st.bodies[(Math.random()*st.bodies.length)|0]; const d=rnd(); spawn(b.c.clone().addScaledVector(d,b.R+1.1),d.clone().multiplyScalar(2+Math.random()*3).add(rnd().multiplyScalar(0.8)),'#ffffff',0.32,3); } }
 if(S.w===2){ groupsStep(dt,1.6); for(let i=0;i<4;i++){ const d=rnd(); spawn(st.bodies[0].c.clone().addScaledVector(d,st.bodies[0].R+1.4),d.clone().multiplyScalar(3),['#ffb3d0','#fff0a0','#ffffff'][i%3],0.4,2); } }
 if(S.w===3){ st.seaMat.uniforms.b.value.lerp(new THREE.Color('#ffffff'),dt*0.3); for(let i=0;i<3;i++){ const d=rnd(); spawn(st.bodies[0].c.clone().addScaledVector(d,st.bodies[0].R+0.3),d.clone().multiplyScalar(1.4),'#ffd88a',0.55,4.5); } }
 if(S.w===4){ skyM.uniforms.aur.value=Math.min(1,t*0.25); if(st.field){ const f=st.field; f.t+=dt; const prog=Math.min(1,f.t/5); for(let i=0;i<f.n;i++){ const k=THREE.MathUtils.clamp((prog*1.25-f.delay[i])*4,0,1); const s=k*(1+0.15*Math.sin(t*3+i)); f.dummy.position.copy(f.pos[i]); f.dummy.quaternion.copy(f.q[i]); f.dummy.scale.setScalar(Math.max(0.0001,s*f.sc[i])); f.dummy.updateMatrix(); f.mesh.setMatrixAt(i,f.dummy.matrix); } f.mesh.instanceMatrix.needsUpdate=true; }
  if(st.ghosts){ st.ghosts.forEach((g,i)=>{ g.material.opacity=Math.min(0.95,t*0.25); const a=t*0.2+i/st.ghosts.length*Math.PI*2; g.position.set(Math.cos(a)*R*1.6,Math.sin(a*1.3)*R*0.3,Math.sin(a)*R*1.6); }); }
  for(let i=0;i<3;i++){ const d=rnd(); spawn(st.bodies[0].c.clone().addScaledVector(d,R*0.6),d.clone().multiplyScalar(4),['#ffe6ff','#c9fff3','#fff6b0'][i],0.5,3); } }
 const dur=st.def.finale?9:5.2; if(t>dur){ G.state='card'; showCard(); } }
function sproutField(st){ const b=st.bodies[0]; const n=900; const geo=new THREE.ConeGeometry(0.0001,0.0001,3); // placeholder replaced below
 const fg=new THREE.IcosahedronGeometry(0.22,0); fg.translate(0,0.3,0); const m=new THREE.InstancedMesh(fg,new THREE.MeshLambertMaterial({color:'#ffffff'}),n); const col=new THREE.Color(); const cols=['#ffb3d9','#fff07a','#c9b3ff','#9fe0ff','#ffffff','#ffd0a0'];
 const pos=[],q=[],sc=[],delay=[]; const keys=Object.keys(FACES); for(let i=0;i<n;i++){ const F=FACES[keys[i%6]]; const u=(Math.random()*2-1)*(b.e.x+0.6),v=(Math.random()*2-1)*(b.e.x+0.6); const p=F.N.clone().multiplyScalar(b.e.x).addScaledVector(F.U,u).addScaledVector(F.V,v); const up=upAt({c:new V3(),e:b.e,eN:b.eN},p,new V3()).clone();
  const lp=p.clone(); lp.copy(lp.clone().clamp(b.eN,b.e)).addScaledVector(up,b.r); pos.push(lp.add(b.c)); q.push(new Q().setFromUnitVectors(new V3(0,1,0),up)); sc.push(0.6+Math.random()*0.9); delay.push(lp.distanceTo(pl.pos)/(b.e.x*4)); m.setColorAt(i,col.set(cols[i%cols.length])); m.setMatrixAt(i,new THREE.Matrix4().makeScale(0.0001,0.0001,0.0001)); }
 st.root.add(m); st.field={mesh:m,n,pos,q,sc,delay,t:0,dummy:new THREE.Object3D()};
 st.ghosts=WORLDS.slice(0,3).map(w=>{ const g=new THREE.Mesh(new THREE.SphereGeometry(2.2,32,20),new THREE.MeshLambertMaterial({color:w.color,emissive:new THREE.Color(w.color),emissiveIntensity:0.25,transparent:true,opacity:0})); st.root.add(g); return g; }); }
function showCard(){ const def=G.st.def; const w=WORLDS[def.world-1]; const nt=w.stages.reduce((a,s)=>a+(save.notes[s]||[]).length,0), ntot=w.stages.reduce((a,s)=>a+stageNoteTotals(s),0); const moth=w.stages.some(s=>save.moths[s]);
 if(def.finale){ save.ended=true; persist(); $('cardTitle').textContent='The Heartstar shines again!'; $('cardBody').innerHTML='Tobi relit the Heartstar and the meadow blooms on every face.<br><br>'+statsHTML(true); $('cardBtn').textContent='Back to the meadow'; }
 else{ $('cardTitle').textContent='World '+def.world+' complete!'; $('cardBody').innerHTML='<b>'+w.name+'</b><br>♪ Star Notes: '+nt+'/'+ntot+'<br>✦ Moonmoth: '+(moth?'found':'still hiding somewhere…')+'<br><br>'+(def.world<4?'A new bloom has opened in the meadow.':''); $('cardBtn').textContent='Continue'; }
 openScreen('card'); $('touch').classList.add('hidden'); }
// ---------------- rewind ----------------
function rewindStep(dt){ const R=G.rw; R.t+=dt/R.dur; const k=Math.min(1,R.t); const e=1-Math.pow(1-k,2); const i=Math.min(R.path.length-1,Math.floor(e*(R.path.length-1))); pl.pos.copy(R.path[i]);
 let best=null,bd=1e9; for(const b of G.st.bodies){ const d=surfDist(b,pl.pos); if(d<bd){bd=d;best=b;} } if(best)upAt(best,pl.pos,pl.up); cameraStep(dt); if(G.frames%2===0)spawn(pl.pos,new V3(),'#cdefff',0.35,0.5);
 if(k>=1){ pl.pos.copy(R.path[R.path.length-1]); pl.vel.set(0,0,0); pl.face.copy(R.f); pl.inv=0.8; pl.hist.length=0; G.state='play'; $('rewindFx').classList.remove('on'); pl.grounded=false; pl.air=0; } }
// ---------------- autopilot (test harness: drives the same input channels as touch) ----------------
let seed=7; const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
function startAuto(route){ G.auto={route,i:0,t:0,phase:0,status:'running',log:[],rew0:save.stats.rewinds,react:0.15}; }
function autoP(spec){ const r=G.st.res(spec.length===2?[spec[0],spec[1],1]:spec); return r.p; }
function steerTo(P,slow){ const d=_v.copy(P).sub(pl.pos); d.addScaledVector(pl.up,-d.dot(pl.up)); const dist=d.length(); if(dist<1e-4){inp.mx=inp.my=0;return 0;} d.normalize();
 _fw.copy(cam.f).addScaledVector(pl.up,-cam.f.dot(pl.up)).normalize(); _rt.crossVectors(_fw,pl.up); let m=slow?Math.min(1,0.25+dist*0.8):1; inp.mx=d.dot(_rt)*m; inp.my=d.dot(_fw)*m; return dist; }
function autoStep(dt){ const A=G.auto; if(A.status!=='running')return; const s=A.route[A.i]; if(!s){ A.status='routeEnd'; inp.mx=inp.my=0; return; } A.t+=dt; const typ=s[0];
 const next=()=>{ A.i++; A.t=0; A.phase=0; A.react=0.12+rnd()*0.1; inp.jump=false; };
 const fail=(m)=>{ A.status='fail: step '+A.i+' '+JSON.stringify(s)+' '+m; inp.mx=inp.my=0; inp.jump=false; };
 if(A.t>14&&typ!=='wait'){ fail('timeout'); return; }
 if(typ==='go'){ const tol=s[2]||0.6; const d=steerTo(autoP(s[1]),tol<0.5); if(d<tol&&pl.grounded){ next(); } }
 else if(typ==='jump'){ const P=autoP(s[1]); if(A.phase===0){ steerTo(P); if(A.t>0.02){ inp.jumpEdge=true; inp.jump=true; A.phase=1; A.jt=0; } }
  else { steerTo(P,A.phase===2); A.jt+=dt; if(A.jt>(s[2]||0.24))inp.jump=false; if(A.phase===1&&!pl.grounded)A.phase=2; if(A.phase===2&&pl.grounded)next(); if(A.phase===1&&A.jt>0.4)fail('no takeoff'); } }
 else if(typ==='hop'){ inp.mx=inp.my=0; if(A.phase===0){ if(A.t>A.react){ inp.jumpEdge=true; inp.jump=true; A.phase=1; A.jt=0; A.b0=pl.body; } } else { A.jt+=dt; if(A.jt>0.32)inp.jump=false; if(pl.grounded&&pl.body!==A.b0&&A.jt>0.3)next(); if(A.jt>4)fail('hop failed'); } }
 else if(typ==='twist'){ inp.mx=inp.my=0; if(A.phase===0){ if(A.t>A.react){ if(!G.nearPad){fail('no pad in range');return;} inp.twistEdge=true; A.phase=1; } } else { const busy=Object.values(G.st.groups).some(g=>g.t<1); if(!busy&&A.t>A.react+0.1)next(); } }
 else if(typ==='look'){ inp.mx=inp.my=0; const P=autoP(s[1]); const d=_v.copy(P).sub(pl.pos); d.addScaledVector(pl.up,-d.dot(pl.up)).normalize(); _fw.copy(cam.f).addScaledVector(pl.up,-cam.f.dot(pl.up)).normalize();
  const cr=_rt.crossVectors(_fw,d).dot(pl.up); const dot=_fw.dot(d); if(dot>0.985){ A.phase+=dt; if(A.phase>0.25)next(); } else { const rate=2.4; inp.yaw+=Math.sign(cr||1)*Math.min(rate*dt,Math.acos(Math.min(1,dot))); } }
 else if(typ==='waitsight'){ inp.mx=inp.my=0; const S=G.st.sights.find(x=>x.id===s[1]); if(S.done&&S.t>=1)next(); else if(A.t>3)fail('sight did not align'); }
 else if(typ==='waitfar'){ inp.mx=inp.my=0; const P=autoP(s[1]); const ok=G.st.bugs.every(b=>b.dead>0||wpos(b.mesh,_v2).distanceTo(P)>s[2]); if(ok&&A.t>0.1)next(); }
 else if(typ==='wait'){ inp.mx=inp.my=0; if(A.t>s[1]/1000)next(); }
}
// ---------------- input ----------------
const keys={}; addEventListener('keydown',e=>{ if(e.repeat)return; keys[e.code]=true; if(e.code==='Space'){inp.jumpEdge=true;inp.kj=true;e.preventDefault();} if(e.code==='KeyF'||e.code==='Enter'){ if(G.state==='play'){inp.twistEdge=true;} }
 if(e.code==='KeyQ')cam.snap+=Math.PI/4; if(e.code==='KeyE')cam.snap-=Math.PI/4; if(e.code==='Escape'||e.code==='KeyP'){ if(G.state==='play')pause(); else if(G.state==='paused')resume(); } audio.unlock(); });
addEventListener('keyup',e=>{ keys[e.code]=false; if(e.code==='Space')inp.kj=false; });
function readKeys(){ let x=0,y=0; if(keys.KeyA||keys.ArrowLeft)x-=1; if(keys.KeyD||keys.ArrowRight)x+=1; if(keys.KeyW||keys.ArrowUp)y+=1; if(keys.KeyS||keys.ArrowDown)y-=1; inp.kx=x; inp.ky=y; }
// touch / pointer
const stickZone=$('stickZone'),stickBase=$('stickBase'),knob=$('stickKnob'); let stickId=null,sx=0,sy=0; const SR=58;
stickZone.addEventListener('pointerdown',e=>{ e.preventDefault(); audio.unlock(); if(stickId!==null)return; stickId=e.pointerId; try{stickZone.setPointerCapture(e.pointerId);}catch(_){} const r=app.getBoundingClientRect(); sx=e.clientX; sy=e.clientY; stickBase.style.left=(sx-r.left)+'px'; stickBase.style.top=(sy-r.top)+'px'; stickBase.classList.add('on'); knob.style.transform='translate(-50%,-50%)'; });
stickZone.addEventListener('pointermove',e=>{ if(e.pointerId!==stickId)return; let dx=e.clientX-sx,dy=e.clientY-sy; const l=Math.hypot(dx,dy); if(l>SR){ // drag the base along so it never feels stuck
  sx+=dx*(1-SR/l); sy+=dy*(1-SR/l); const r=app.getBoundingClientRect(); stickBase.style.left=(sx-r.left)+'px'; stickBase.style.top=(sy-r.top)+'px'; dx=e.clientX-sx; dy=e.clientY-sy; }
 knob.style.transform='translate(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px))'; let x=dx/SR,y=-dy/SR; const m=Math.hypot(x,y); if(m<0.14){x=y=0;} inp.stick.x=x; inp.stick.y=y; });
const endStick=e=>{ if(e.pointerId!==stickId)return; stickId=null; inp.stick.x=inp.stick.y=0; stickBase.classList.remove('on'); };
stickZone.addEventListener('pointerup',endStick); stickZone.addEventListener('pointercancel',endStick);
const camZone=$('camZone'); let camId=null,cx0=0; camZone.addEventListener('pointerdown',e=>{ e.preventDefault(); audio.unlock(); camId=e.pointerId; try{camZone.setPointerCapture(e.pointerId);}catch(_){} cx0=e.clientX; });
camZone.addEventListener('pointermove',e=>{ if(e.pointerId!==camId)return; const dx=e.clientX-cx0; cx0=e.clientX; inp.yaw+=dx*0.0075; });
const endCam=e=>{ if(e.pointerId===camId)camId=null; }; camZone.addEventListener('pointerup',endCam); camZone.addEventListener('pointercancel',endCam);
function btn(id,down,up){ const el=$(id); el.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); audio.unlock(); el.classList.add('down'); down(); }); const u=e=>{ el.classList.remove('down'); up&&up(); }; el.addEventListener('pointerup',u); el.addEventListener('pointercancel',u); el.addEventListener('pointerleave',u); }
btn('btnJump',()=>{inp.jumpEdge=true;inp.tj=true;},()=>{inp.tj=false;});
btn('btnTwist',()=>{ if(G.state==='play')inp.twistEdge=true; });
btn('btnCamL',()=>{cam.snap+=Math.PI/4;}); btn('btnCamR',()=>{cam.snap-=Math.PI/4;});
btn('btnPause',()=>{ if(G.state==='play')pause(); });
document.addEventListener('gesturestart',e=>e.preventDefault()); document.addEventListener('dblclick',e=>e.preventDefault());
// ---------------- menus ----------------
function pause(){ G.state='paused'; openScreen('pause'); syncSliders(); persist(); }
function resume(){ hideScreens(); G.state='play'; }
function syncSliders(){ $('sMusic').value=Math.round(save.settings.music*100); $('sSfx').value=Math.round(save.settings.sfx*100); $('sBright').value=Math.round(save.settings.bright*100); $('vMusic').textContent=$('sMusic').value; $('vSfx').textContent=$('sSfx').value; $('vBright').textContent=$('sBright').value; }
$('sMusic').addEventListener('input',e=>{ save.settings.music=e.target.value/100; audio.setVolumes(save.settings.music,save.settings.sfx); syncSliders(); persist(); });
$('sSfx').addEventListener('input',e=>{ save.settings.sfx=e.target.value/100; audio.setVolumes(save.settings.music,save.settings.sfx); syncSliders(); persist(); });
$('sSfx').addEventListener('change',()=>audio.play('note',3));
$('sBright').addEventListener('input',e=>{ save.settings.bright=e.target.value/100; syncSliders(); persist(); });
const click=(id,f)=>$(id).addEventListener('click',e=>{ audio.unlock(); audio.play('ui'); f(e); });
click('bResume',resume); click('bHint',()=>{ resume(); G.hintShow=9; if(!G.hint)toast('Explore! Walk into the bloom to finish this planet.'); });
click('bRestart',()=>{ loadStage(G.id); }); click('bHub',()=>{ loadStage('hub'); }); click('bStats',()=>{ showStats('pause'); }); click('bHelp',()=>{ openScreen('help'); G.helpFrom='pause'; });
click('bHelpOk',()=>{ save.helpSeen=true; persist(); if(G.helpFrom==='pause'){ G.helpFrom=null; openScreen('pause'); } else resume(); });
click('bStatsBack',()=>{ openScreen(G.statsFrom==='title'?'title':'pause'); });
click('cardBtn',()=>{ const wasFinale=G.st.def.finale; loadStage('hub',{newOpen:!wasFinale&&G.firstWorldEnd}); });
click('bPlay',()=>{ startGame(false); }); click('bNew',()=>{ if(hasProgress()&&!confirm('Start a new game? Your progress will be reset (settings are kept).'))return; save=freshSave(save); persist(); startGame(true); });
click('bTitleStats',()=>showStats('title'));
function startGame(fresh){ audio.unlock(); const id=fresh?'hub':(STAGES[save.cur]?save.cur:'hub'); loadStage(id); }
function fmtTime(s){ s=Math.floor(s); const h=Math.floor(s/3600),m=Math.floor(s/60)%60,ss=s%60; return (h?h+'h ':'')+m+'m '+String(ss).padStart(2,'0')+'s'; }
function statsHTML(short){ const s=save.stats; const notes=Object.values(save.notes).reduce((a,b)=>a+b.length,0); const moths=Object.keys(save.moths).length;
 const rows=[['Play time',fmtTime(s.time)],['Planets cleared',Object.keys(save.done).length+' / '+ORDER.length],['Star Notes',notes+' / '+ALLNOTES],['Moonmoths',moths+' / 4'],['Jumps',s.jumps],['Twists',s.twists],['Sightlines aligned',s.sights],['Grumblebugs bopped',s.stomps],['Rewinds (falls)',s.rewinds],['Distance walked',Math.round(s.dist)+' m']];
 return '<table class="stats">'+rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>').join('')+'</table>'; }
function showStats(from){ G.statsFrom=from; $('statsBody').innerHTML=statsHTML(); openScreen('stats'); }
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ persist(); if(G.state==='play')pause(); } });
// ---------------- title ----------------
function toTitle(){ loadStage('hub',{drop:false,title:true}); G.state='title'; $('banner').classList.remove('show'); openScreen('title'); $('hud').classList.add('hidden'); $('touch').classList.add('hidden'); $('bPlay').textContent=hasProgress()?'Continue':'Play'; $('bNew').style.display=hasProgress()?'':'none'; tobi.root.visible=true; }
// ---------------- main loop ----------------
let last=performance.now(),acc=0; const STEP=1/120;
function frame(now){ requestAnimationFrame(frame); let dt=Math.min(0.05,(now-last)/1000); last=now; G.frames++;
 try{ readKeys(); const autoOn=G.auto&&G.auto.status==='running';
  if(!autoOn){ inp.mx=THREE.MathUtils.clamp(inp.stick.x+inp.kx,-1,1); inp.my=THREE.MathUtils.clamp(inp.stick.y+inp.ky,-1,1); inp.jump=inp.tj||inp.kj; }
  const sdt=dt*SPEED;
  if(G.state==='play'){ acc+=sdt; let n=0; while(acc>=STEP&&n<12*SPEED){ physStep(STEP); acc-=STEP; n++; if(G.state!=='play')break; } }
  else acc=0;
  if(G.state==='rewind'){ let n=Math.max(1,Math.round(sdt/STEP)); for(let i=0;i<n&&G.state==='rewind';i++)rewindStep(STEP); }
  if(G.state==='launch')launchStep(sdt);
  if(G.state==='spectacle')spectacleStep(sdt);
  if(G.state==='title'){ G.time+=dt; cam.orbit=cam.orbit||{c:new V3(),u:new V3(0,1,0),dir:new V3(0,0.35,1).normalize(),d:21,h:7}; cam.orbit.dir.applyAxisAngle(cam.orbit.u,dt*0.12); pl.phase+=dt*3; }
  else if(G.state!=='spectacle'&&G.state!=='photo') cam.orbit=null;
  if(G.fadeIn>0){ G.fadeIn-=dt; fade(Math.max(0,G.fadeIn/0.6)); }
  if(G.st){ updateVisuals(G.state==='photo'||G.state==='play'||G.state==='title'||G.state==='spectacle'||G.state==='launch'||G.state==='rewind'?sdt:0); }
  updParts(sdt); placeCamera(); renderer.render(scene,camera);
  if(G.frames%600===0)persist();
 }catch(err){ window.__mtErrors.push(String(err&&err.stack||err)); console.error(err); }
}
// ---------------- test API ----------------
window.MT={ get state(){return G.state;}, get id(){return G.id;}, G, pl, cam, save:()=>save, inp,
 load(id){ hideScreens(); loadStage(id); }, auto(){ startAuto(G.st.def.route||[]); }, autoStatus(){ return G.auto?G.auto.status+' @'+G.auto.i:'none'; },
 setSpeed(s){SPEED=s;}, info(){ const st=G.st; return {id:G.id,state:G.state,notes:st.notes.filter(n=>n.got).length,notesTotal:st.notes.length,moth:st.moth?st.moth.got:null,done:!!save.done[G.id],rewinds:save.stats.rewinds,pos:pl.pos.toArray(),grounded:pl.grounded}; },
 rewindCount(){return save.stats.rewinds;}, sd:(x,y,z)=>sceneDist(new V3(x,y,z)), hz:(x,y,z)=>hazardDist(new V3(x,y,z)), toTitle, pause, resume, audio, settings:()=>save.settings, finishCard(){ $('cardBtn').click(); },
 photo(kind){ G.state='photo'; hideScreens(); $('hud').classList.add('hidden'); $('touch').classList.add('hidden'); $('banner').classList.remove('show'); const u=pl.up.clone(); const f=pl.face.clone(); if(kind==='icon'){ cam.orbit={c:pl.pos.clone().addScaledVector(u,0.12),u,dir:f.clone(),d:1.75,h:0.3}; } else { const o=kind||{}; cam.orbit={c:pl.pos.clone().addScaledVector(u,o.lift||0.3),u,dir:f.clone().applyAxisAngle(u,o.yaw||0.6),d:o.d||6.5,h:o.h||2.6}; } } };
toTitle(); requestAnimationFrame(frame); window.__mtReady=true;
