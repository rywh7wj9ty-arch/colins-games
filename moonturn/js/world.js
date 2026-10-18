// Moonturn — builds a stage (meshes + colliders) from level data
import * as THREE from '../vendor/three/three.module.js';
import {dir,D2R,SDF,arcParams,arcGeometry,paint,rboxGeometry} from './sdf.js';
import {PAL,WORLDS} from './levels.js';
const V3=THREE.Vector3;
export const FACES={py:{n:[0,1,0],u:[1,0,0],v:[0,0,-1]},ny:{n:[0,-1,0],u:[1,0,0],v:[0,0,1]},pz:{n:[0,0,1],u:[1,0,0],v:[0,1,0]},
 nz:{n:[0,0,-1],u:[-1,0,0],v:[0,1,0]},px:{n:[1,0,0],u:[0,0,-1],v:[0,1,0]},nx:{n:[-1,0,0],u:[0,0,1],v:[0,1,0]}};
for(const k in FACES){const F=FACES[k];F.N=new V3(...F.n);F.U=new V3(...F.u);F.V=new V3(...F.v);}
export const CAM={D:8.6,H:5.0,S:1.45};
// ---------- shared textures ----------
function canvasTex(draw,s=256){const c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');draw(g,s);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
const TEX={};
export function textures(){ if(TEX.soft)return TEX;
 TEX.soft=canvasTex((g,s)=>{const r=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(0.4,'rgba(255,255,255,.5)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,s,s);},64);
 TEX.shadow=canvasTex((g,s)=>{const r=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);r.addColorStop(0,'rgba(40,30,80,.75)');r.addColorStop(0.6,'rgba(40,30,80,.35)');r.addColorStop(1,'rgba(40,30,80,0)');g.fillStyle=r;g.fillRect(0,0,s,s);},64);
 const ring=(g,s,col)=>{g.lineWidth=s*0.05;g.strokeStyle=col;g.beginPath();g.arc(s/2,s/2,s*0.44,0,Math.PI*2);g.stroke();};
 TEX.pad=canvasTex((g,s)=>{g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.arc(s/2,s/2,s*.46,0,7);g.fill();ring(g,s,'#ffffff');
   g.strokeStyle='#ff8fc8';g.lineWidth=s*0.07;g.lineCap='round';for(let k=0;k<3;k++){g.beginPath();g.arc(s/2,s/2,s*0.28,k*2.09,k*2.09+1.4);g.stroke();
   const a=k*2.09+1.4,x=s/2+Math.cos(a)*s*.28,y=s/2+Math.sin(a)*s*.28;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a-2.2)*s*.1,y+Math.sin(a-2.2)*s*.1);g.stroke();}
   g.fillStyle='#ffffff';g.beginPath();g.arc(s/2,s/2,s*.08,0,7);g.fill();});
 TEX.eye=canvasTex((g,s)=>{g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.arc(s/2,s/2,s*.46,0,7);g.fill();ring(g,s,'#ffffff');
   g.fillStyle='#ffffff';g.beginPath();g.ellipse(s/2,s*.58,s*.26,s*.15,0,0,7);g.fill();g.fillStyle='#3aa9ff';g.beginPath();g.arc(s/2,s*.58,s*.11,0,7);g.fill();g.fillStyle='#24305e';g.beginPath();g.arc(s/2,s*.58,s*.05,0,7);g.fill();
   g.fillStyle='#ffffff';g.beginPath();g.moveTo(s/2,s*.08);g.lineTo(s*.36,s*.3);g.lineTo(s*.64,s*.3);g.closePath();g.fill();});
 TEX.eyeFaint=canvasTex((g,s)=>{g.globalAlpha=.45;g.drawImage(TEX.eye.image,0,0,s,s);},256);
 TEX.jump=canvasTex((g,s)=>{g.fillStyle='rgba(255,255,255,.3)';g.beginPath();g.arc(s/2,s/2,s*.46,0,7);g.fill();ring(g,s,'#ffffff');
   g.strokeStyle='#ffffff';g.lineWidth=s*.08;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(s*.25,s*.72);g.quadraticCurveTo(s*.5,s*.05,s*.75,s*.5);g.stroke();
   g.beginPath();g.moveTo(s*.62,s*.42);g.lineTo(s*.76,s*.5);g.lineTo(s*.8,s*.34);g.stroke();});
 TEX.hop=canvasTex((g,s)=>{g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.arc(s/2,s/2,s*.46,0,7);g.fill();ring(g,s,'#ffffff');
   g.fillStyle='#ffffff';for(let k=0;k<2;k++){const y=s*(.22+k*.24);g.beginPath();g.moveTo(s/2,y);g.lineTo(s*.28,y+s*.2);g.lineTo(s*.72,y+s*.2);g.closePath();g.fill();}});
 TEX.wing=canvasTex((g,s)=>{const r=g.createRadialGradient(s*.3,s*.5,0,s*.3,s*.5,s*.7);r.addColorStop(0,'#ffffff');r.addColorStop(.5,'#9fdcff');r.addColorStop(1,'#6a8cff');g.fillStyle=r;g.beginPath();g.ellipse(s*.5,s*.5,s*.48,s*.36,0,0,7);g.fill();g.fillStyle='#fff6c8';g.beginPath();g.arc(s*.6,s*.45,s*.09,0,7);g.fill();});
 return TEX; }
// ---------- helpers ----------
const _q=new V3(),_m=new THREE.Matrix4();
export function upAt(b,p,out){ out.copy(p).sub(b.c); _q.copy(out).clamp(b.eN,b.e); out.sub(_q); const l=out.length(); if(l<1e-6)out.set(0,1,0); else out.multiplyScalar(1/l); return out; }
export function surfDist(b,p){ _q.copy(p).sub(b.c); const cx=Math.max(-b.e.x,Math.min(b.e.x,_q.x)),cy=Math.max(-b.e.y,Math.min(b.e.y,_q.y)),cz=Math.max(-b.e.z,Math.min(b.e.z,_q.z)); return Math.hypot(_q.x-cx,_q.y-cy,_q.z-cz)-b.r-b.top; }
function isCube(spec){return typeof spec[0]==='string';}
export function makeResolver(bodies){
 return function res(spec,local=false){ // returns {p (world unless local), up, b}
  if(isCube(spec)){ const b=bodies[0],F=FACES[spec[0]]; const h=spec[3]||0; const p=new V3().copy(F.N).multiplyScalar(b.e.x+b.r+h).addScaledVector(F.U,spec[1]).addScaledVector(F.V,spec[2]);
    if(!local)p.add(b.c); return {p,up:F.N.clone(),b,F}; }
  const b=bodies[spec[3]||0]; const d=dir(spec[0],spec[1]); const p=d.clone().multiplyScalar(b.R+(spec[2]===undefined?1:spec[2])); if(!local)p.add(b.c); return {p,up:d,b}; };
}
function basisMatrix(up,fwdHint){ const y=up.clone().normalize(); let x=new V3().crossVectors(fwdHint||new V3(0,1,0),y); if(x.lengthSq()<1e-6)x=new V3().crossVectors(new V3(1,0,0.3),y); x.normalize(); const z=new V3().crossVectors(x,y); return new THREE.Matrix4().makeBasis(x,y,z); }
function tangentToward(p,up,q){ const d=q.clone().sub(p); d.addScaledVector(up,-d.dot(up)); return d.lengthSq()<1e-8?new V3(1,0,0).addScaledVector(up,-up.x).normalize():d.normalize(); }
function mergeGeos(list){ let n=0; for(const g of list)n+=g.attributes.position.count; const P=new Float32Array(n*3),N=new Float32Array(n*3),C=new Float32Array(n*3); let o=0;
 for(const g of list){ const p=g.attributes.position,nn=g.attributes.normal,c=g.attributes.color; P.set(p.array,o*3); N.set(nn.array,o*3); if(c)C.set(c.array,o*3); o+=p.count; }
 const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(P,3)); g.setAttribute('normal',new THREE.BufferAttribute(N,3)); g.setAttribute('color',new THREE.BufferAttribute(C,3)); return g; }
function colored(geo,col,mat){ geo=geo.index?geo.toNonIndexed():geo; if(mat)geo.applyMatrix4(mat); geo.computeVertexNormals(); const c=new THREE.Color(col),n=geo.attributes.position.count,a=new Float32Array(n*3); for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;} geo.setAttribute('color',new THREE.BufferAttribute(a,3)); return geo; }
// SDF normals (smooth lighting that matches collision)
function sdfNormals(geo,f,P){ const p=geo.attributes.position,n=new Float32Array(p.count*3),q=new V3(),e=0.015; const tr=[];
 for(let i=0;i<p.count;i++){ q.fromBufferAttribute(p,i); const x=q.x,y=q.y,z=q.z;
  const dx=f(q.set(x+e,y,z),P)-f(q.set(x-e,y,z),P), dy=f(q.set(x,y+e,z),P)-f(q.set(x,y-e,z),P), dz=f(q.set(x,y,z+e),P)-f(q.set(x,y,z-e),P); const l=Math.hypot(dx,dy,dz)||1; n[i*3]=dx/l;n[i*3+1]=dy/l;n[i*3+2]=dz/l; }
 // fix winding to match normals
 const a=p.array; for(let t=0;t<p.count;t+=3){ const ax=a[t*3],ay=a[t*3+1],az=a[t*3+2]; const ux=a[t*3+3]-ax,uy=a[t*3+4]-ay,uz=a[t*3+5]-az,vx=a[t*3+6]-ax,vy=a[t*3+7]-ay,vz=a[t*3+8]-az;
  const cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx; const nx=n[t*3]+n[t*3+3]+n[t*3+6],ny=n[t*3+1]+n[t*3+4]+n[t*3+7],nz=n[t*3+2]+n[t*3+5]+n[t*3+8];
  if(cx*nx+cy*ny+cz*nz<0){ for(let k=0;k<3;k++){const s=a[(t+1)*3+k];a[(t+1)*3+k]=a[(t+2)*3+k];a[(t+2)*3+k]=s; const sn=n[(t+1)*3+k];n[(t+1)*3+k]=n[(t+2)*3+k];n[(t+2)*3+k]=sn;} } }
 geo.setAttribute('normal',new THREE.BufferAttribute(n,3)); return geo; }
// ---------- shaders ----------
export function skyMaterial(){ return new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new THREE.Color()},mid:{value:new THREE.Color()},low:{value:new THREE.Color()},up:{value:new V3(0,1,0)},sun:{value:new V3(0.4,0.7,0.3)},exposure:{value:1},aur:{value:0},time:{value:0}},
 vertexShader:`varying vec3 vD; void main(){ vD=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; }`,
 fragmentShader:`uniform vec3 top,mid,low,up,sun; uniform float exposure,aur,time; varying vec3 vD;
 void main(){ float h=dot(normalize(vD),up); vec3 c=h>0.?mix(mid,top,smoothstep(0.,.75,h)):mix(mid,low,smoothstep(0.,-.6,h));
  float s=max(dot(normalize(vD),normalize(sun)),0.); c+=vec3(1.,.95,.85)*(pow(s,40.)*.6+pow(s,6.)*.12);
  float cl=sin(vD.x*7.+time*.03)*sin(vD.z*6.+vD.y*5.)*.5+.5; c=mix(c,vec3(1.),smoothstep(.72,1.,cl)*.18*(1.-abs(h)));
  if(aur>0.){ float a=sin(vD.x*9.+time*.6+sin(vD.z*5.+time*.4)*2.)*.5+.5; c+=aur*mix(vec3(.4,1.,.85),vec3(1.,.6,.95),a)*smoothstep(.1,.7,h)*a*.45; }
  gl_FragColor=vec4(c*exposure,1.);
  #include <colorspace_fragment>
 }`}); }
export function seaMaterial(c1,c2){ return new THREE.ShaderMaterial({uniforms:{a:{value:new THREE.Color(c1)},b:{value:new THREE.Color(c2)},time:{value:0},exposure:{value:1},fogColor:{value:new THREE.Color()},fogNear:{value:30},fogFar:{value:120}},
 vertexShader:`varying vec3 vP,vN,vV; varying float vDist; void main(){ vec4 w=modelMatrix*vec4(position,1.); vP=position; vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); vec4 mv=viewMatrix*w; vDist=-mv.z; gl_Position=projectionMatrix*mv; }`,
 fragmentShader:`uniform vec3 a,b,fogColor; uniform float time,exposure,fogNear,fogFar; varying vec3 vP,vN,vV; varying float vDist;
 void main(){ vec3 p=vP*1.3; float w=sin(p.x*1.7+time*1.1+sin(p.z*1.3+time*.7))*sin(p.z*1.9-time*.9+sin(p.y*1.5))*.5+.5;
  float w2=sin(p.y*3.1+time*1.7+p.x*2.)*.5+.5; float f=pow(1.-max(dot(normalize(vN),normalize(vV)),0.),2.);
  vec3 c=mix(a,b,w*.55+w2*.15); c+=vec3(1.)*smoothstep(.86,.98,w*w2)*.35; c=mix(c,vec3(1.,1.,1.),f*.45);
  c=mix(c,fogColor,smoothstep(fogNear,fogFar,vDist)); gl_FragColor=vec4(c*exposure,1.);
  #include <colorspace_fragment>
 }`}); }
// ---------- stage build ----------
export function buildStage(def,mats){
 const T=textures(); const pal=PAL[def.pal]; const root=new THREE.Group();
 const st={def,root,bodies:[],ground:[],hazards:[],groups:{},pads:[],notes:[],moth:null,sights:[],bugs:[],portals:[],glyphs:[],goal:null,anim:[],decorPts:[]};
 const seaMat=seaMaterial(pal.sea[0],pal.sea[1]); st.seaMat=seaMat;
 const ground=mats.ground;
 for(const bd of def.bodies){ const b={c:new V3(...bd.c),R:bd.R||0,e:new V3(...(bd.e||[0,0,0])),r:bd.r||bd.R,kind:bd.kind||'sea',top:bd.kind==='ground'?0:1,field:(bd.R||bd.e[0]+bd.r)+9};
  b.eN=b.e.clone().negate(); b.node=new THREE.Group(); b.node.position.copy(b.c); root.add(b.node); b.node.updateWorldMatrix(true,true); b.R=b.R||(b.e.x+b.r);
  if(b.kind==='sea'){ const m=new THREE.Mesh(new THREE.SphereGeometry(b.r,72,48),seaMat); b.node.add(m); }
  else{ const P={e:b.e.clone(),r:b.r}; let g=rboxGeometry(b.e,b.r,30); g=g.toNonIndexed(); sdfNormals(g,SDF.rbox,P);
   g=paint(g,{top:pal.top,side:pal.side,edge:pal.edge,upFn:(p,o)=>upAt({c:new V3(),e:b.e,eN:b.eN},p,o),scale:0.5});
   sdfNormals(g,SDF.rbox,P); const m=new THREE.Mesh(g,ground); b.node.add(m); addObj(st,{f:SDF.rbox,P,node:m,body:b,kind:'ground'}); }
  st.bodies.push(b); }
 const res=makeResolver(st.bodies); st.res=res;
 const decorSurf=[]; // [{b, local point sampler}]
 function buildParts(parts,parent,grp,b0){
  for(const pt of parts){ const spec=pt.at; const b=st.bodies[(spec&&!isCube(spec)&&spec[3])||((pt.from&&pt.from[3])||0)]||st.bodies[0]; if(pt.t==='tree'&&!pt.s)pt.s=0.78; const node=parent||b.node;
   switch(pt.t){
   case 'disc': case 'arc': { const R=b.R; const rt=R+pt.h, rb=pt.thick?rt-pt.thick:R-0.45; let P;
     if(pt.t==='disc'){ const a=dir(pt.at[0],pt.at[1]); P=arcParams(a,a,rt,rb,pt.ang*D2R*rt); }
     else P=arcParams(dir(pt.from[0],pt.from[1]),dir(pt.to[0],pt.to[1]),rt,rb,pt.w);
     const m=solidMesh(P,b,pal,ground,pt.col); node.add(m); addObj(st,{f:SDF.arc,P,node:m,body:b,kind:'ground',grp});
     decorSurf.push({b,P,node,grp}); break; }
   case 'pillar': { const d=dir(pt.at[0],pt.at[1]); const r0=b.R-0.45,r1=b.R+pt.top; const P={r:pt.r,hh:(r1-r0)/2};
     const g=new THREE.CylinderGeometry(pt.r,pt.r,r1-r0,28,4); const mt=basisMatrix(d).setPosition(d.clone().multiplyScalar((r0+r1)/2));
     let gg=g.toNonIndexed(); sdfNormals(gg,SDF.cyl,P); gg=paint(gg,{top:pal.top,side:pal.side,edge:pal.edge,upFn:(p,o)=>o.set(0,1,0)}); const m=new THREE.Mesh(gg,ground); m.applyMatrix4(mt); node.add(m);
     addObj(st,{f:SDF.cyl,P,node:m,body:b,kind:'ground',grp}); break; }
   case 'tree': { const lp=res(pt.at.length>2||isCube(pt.at)?pt.at:[pt.at[0],pt.at[1],1,pt.at[3]],true); const up=lp.up; let base=lp.p;
     if(!isCube(pt.at)) base=up.clone().multiplyScalar(b.R+(pt.h||1)); const s=pt.s||1; const P={r:0.24*s,hh:1.0*s};
     const x=new THREE.Object3D(); x.matrixAutoUpdate=false; x.matrix.copy(basisMatrix(up).setPosition(base.clone().addScaledVector(up,0.9*s))); node.add(x); x.updateMatrixWorld(true);
     addObj(st,{f:SDF.cyl,P,node:x,body:b,kind:'ground',grp,r:1.3*s});
     st.decorPts.push({tree:true,base:base.clone().add(b.c),up,s,node}); break; }
   case 'hedges': buildHedges(pt,b,node,grp); break;
   case 'wall': { const F=FACES[pt.f]; const lenU=pt.u1-pt.u0; const cu=(pt.u0+pt.u1)/2; boxPart(b,F,cu,pt.v,lenU/2,1.3,0.24,0,node,grp,pal,'hedge'); break; }
   case 'pool': { const F=FACES[pt.f]; const P={hx:(pt.u1-pt.u0)/2,hy:0.13,hz:(pt.v1-pt.v0)/2}; const g=new THREE.BoxGeometry(P.hx*2,P.hy*2,P.hz*2,8,1,8);
     const m=new THREE.Mesh(g,seaMat); const pos=F.N.clone().multiplyScalar(b.e.x+b.r-0.07).addScaledVector(F.U,(pt.u0+pt.u1)/2).addScaledVector(F.V,(pt.v0+pt.v1)/2);
     m.matrixAutoUpdate=false; m.matrix.copy(faceMatrix(F)).setPosition(pos); node.add(m); m.updateMatrixWorld(true); addObj(st,{f:SDF.box,P,node:m,body:b,kind:'hazard'}); break; }
   case 'stone': { const F=FACES[pt.at[0]]; boxPart(b,F,pt.at[1],pt.at[2],pt.size/2,pt.top/2+0.1,pt.size/2,-0.2,node,grp,pal,'stone'); break; }
   case 'pad': { const r=res(pt.at,true); const m=decal(T.pad,1.0,r.p,r.up,null); node.add(m); st.pads.push({mesh:m,g:pt.g,up:r.up.clone()}); break; }
   case 'glyph': { const r=res(pt.at,true); const tw=pt.toward?res(pt.toward.length===2?[pt.toward[0],pt.toward[1],1]:pt.toward,true).p:null; const m=decal(pt.icon==='jump'?T.jump:T.hop,0.95,r.p,r.up,tw); node.add(m); st.glyphs.push({mesh:m,icon:pt.icon,up:r.up.clone()}); break; }
   case 'glyphdecal': { const r=res(pt.at,true); const sd=def.sights.find(s=>s.id===pt.sight); const lk=res(sd.look.length===2?[sd.look[0],sd.look[1],1]:sd.look,true).p;
     // look target is world-static; decal arrow drawn toward the target as seen when aligned (rotate back by group's aligned angle)
     const m=decal(T.eye,0.95,r.p,r.up,null); m.userData.sight=pt.sight; node.add(m); st.pendingDecals=(st.pendingDecals||[]).concat([{m,sight:pt.sight,local:r}]); break; }
   case 'note': { const r=pt.raw?{p:new V3(...pt.at).sub(b.c),up:new V3(0,1,0)}:res(pt.at,true); const m=new THREE.Mesh(mats.starGeo,mats.note); m.position.copy(r.p); node.add(m);
     st.notes.push({mesh:m,idx:st.notes.length,got:false,up:r.up.clone(),base:r.p.clone(),grp}); break; }
   case 'moth': { const r=res(pt.at,true); const m=mothMesh(mats); m.position.copy(r.p); m.userData.up=r.up.clone(); node.add(m); st.moth={mesh:m,got:false,base:r.p.clone(),up:r.up.clone()}; break; }
   }
  }
 }
 function faceMatrix(F){ return new THREE.Matrix4().makeBasis(F.U,F.N,new V3().crossVectors(F.U,F.N)); }
 function boxPart(b,F,u,v,hx,hy,hz,base,node,grp,pal,kind,yaw){ const P={hx,hy,hz}; const g=new THREE.BoxGeometry(hx*2,hy*2,hz*2,Math.max(1,Math.ceil(hx*2)),2,Math.max(1,Math.ceil(hz*2)));
  const M=faceMatrix(F); if(yaw){M.multiply(new THREE.Matrix4().makeRotationY(yaw));}
  const pos=F.N.clone().multiplyScalar(b.e.x+b.r+base+hy).addScaledVector(F.U,u).addScaledVector(F.V,v); M.setPosition(pos);
  let gg=g.toNonIndexed(); sdfNormals(gg,SDF.box,P);
  const top=kind==='hedge'?'#5fbf6a':kind==='stone'?'#f4e7cf':pal.top, side=kind==='hedge'?'#3f9f62':kind==='stone'?'#d9bfa0':pal.side;
  gg=paint(gg,{top,side,upFn:(p,o)=>o.set(0,1,0),scale:1.2,var:0.16});
  const m=new THREE.Mesh(gg,ground); m.matrixAutoUpdate=false; m.matrix.copy(M); node.add(m); m.updateMatrixWorld(true); addObj(st,{f:SDF.box,P,node:m,body:b,kind:'ground',grp}); return m; }
 function buildHedges(pt,b,node,grp){ const F=FACES[pt.f]; const E=b.e.x, L=E-0.22; const sides={'+u':[1,0],'-u':[-1,0],'+v':[0,1],'-v':[0,-1]};
  for(const sk in sides){ const [su,sv]=sides[sk]; const opens=(pt.open||[]).filter(o=>o[0]===sk).map(o=>[o[1],o[2]]).sort((a,b)=>a[0]-b[0]);
   let segs=[[-E,E]]; for(const [o0,o1] of opens){ const ns=[]; for(const [s0,s1] of segs){ if(o1<=s0||o0>=s1){ns.push([s0,s1]);continue;} if(o0>s0)ns.push([s0,o0]); if(o1<s1)ns.push([o1,s1]); } segs=ns; }
   for(const [s0,s1] of segs){ if(s1-s0<0.2)continue; const c=(s0+s1)/2,h=(s1-s0)/2; if(su) boxPart(b,F,su*L,c,0.22,1.3,h,0,node,grp,pal,'hedge'); else boxPart(b,F,c,sv*L,h,1.3,0.22,0,node,grp,pal,'hedge'); } } }
 buildParts(def.parts||[],null,null);
 // groups
 for(const gd of def.groups||[]){ const b=st.bodies[0]; const node=new THREE.Group(); b.node.add(node); const axis=new V3(...gd.axis).normalize();
  const G={id:gd.id,axis,step:gd.step*D2R,angle:gd.init*D2R,from:0,target:gd.init*D2R,t:1,dur:gd.dur||0.8,node,objs:[],n:Math.round(360/gd.step),b};
  st.groups[gd.id]=G; node.quaternion.setFromAxisAngle(axis,G.angle); node.updateMatrixWorld(true);
  const before=st.ground.length; buildParts(gd.parts||[],node,G);
  if(gd.ring){ const F=FACES[gd.ring.f]; const N=18,R=gd.ring.half; const opens=gd.ring.open.map(o=>({'+u':0,'+v':90,'-u':180,'-v':270})[o]);
   for(let i=0;i<N;i++){ const a=(i+0.5)/N*360; if(opens.some(o=>{let d=Math.abs(((a-o+540)%360)-180);return d<24;}))continue;
    const ar=a*D2R; const u=Math.cos(ar)*R,v=Math.sin(ar)*R; const len=2*Math.PI*R/N*0.56; boxPart(b,F,u,v,0.24,1.3,len,0,node,G,pal,'hedge',ar); }
   // fix orientation: boxPart yaw rotates about face normal; tangent alignment handled below
  }
  for(let i=before;i<st.ground.length;i++)G.objs.push(st.ground[i]);
  st.notes.filter(n=>n.grp===G); }
 // re-orient ring boxes tangentially (yaw about face normal so long side follows the circle)
 // sights
 for(const sd of def.sights||[]){ const b=st.bodies[0]; const g=res(sd.glyph); const look=res(sd.look.length===2?[sd.look[0],sd.look[1],1]:sd.look);
  const v=tangentToward(g.p,g.up,look.p); const Gc=g.p.clone().addScaledVector(g.up,0.42); const E=Gc.clone().addScaledVector(g.up,CAM.H*CAM.S).addScaledVector(v,-CAM.D*CAM.S); const El=E.clone().sub(b.c);
  const S={id:sd.id,glyphP:g.p.clone(),up:g.up.clone(),v,E,done:false,hold:0,t:0,shards:[],obj:null,faint:sd.faint,align:0};
  let P,f; if(sd.bridge.t==='arc'){ const bt=sd.bridge; const rt=b.R+bt.h; P=arcParams(dir(bt.from[0],bt.from[1]),dir(bt.to[0],bt.to[1]),rt,rt-0.55,bt.w); f=SDF.arc;
    const N=6; const sc=[0.62,1.16,0.78,1.1,0.7,0.9]; for(let i=0;i<N;i++){ let geo=arcGeometry(P,{phi0:P.th*i/N,phi1:P.th*(i+1)/N}); sdfNormals(geo,SDF.arc,P); geo=paint(geo,{top:'#f6f0ff',side:'#b9a6ff',upFn:(p,o)=>o.copy(p).normalize()});
     const mt=new THREE.MeshLambertMaterial({vertexColors:true,emissive:new THREE.Color('#7fd7ff'),emissiveIntensity:0.15,transparent:true,opacity:0.92}); const m=new THREE.Mesh(geo,mt); m.userData.s=sc[i]; b.node.add(m); S.shards.push(m); }
    const coll=new THREE.Object3D(); b.node.add(coll); coll.updateMatrixWorld(true); S.obj=addObj(st,{f,P,node:coll,body:b,kind:'ground',r:P.rt*P.th+2,lbc:dir(0,0).clone(),off:true});
    // bounding: use mid dir
    const mid=P.a.clone().multiplyScalar(Math.cos(P.th/2)).addScaledVector(P.t,Math.sin(P.th/2)).multiplyScalar(rt); S.obj.lbc.copy(mid); S.obj.br=P.th*rt/2+P.wA*rt+1; S.obj.bc.copy(mid).add(b.c); }
  else{ const bt=sd.bridge,F=FACES[bt.f]; const hy=0.25; P={hx:(bt.u1-bt.u0)/2,hy:(bt.top+0.25)/2,hz:(bt.v1-bt.v0)/2}; f=SDF.box; const M=faceMatrix(F);
    const cpos=F.N.clone().multiplyScalar(b.e.x+b.r+(bt.top-0.25)/2).addScaledVector(F.U,(bt.u0+bt.u1)/2).addScaledVector(F.V,(bt.v0+bt.v1)/2); M.setPosition(cpos);
    const coll=new THREE.Object3D(); coll.matrixAutoUpdate=false; coll.matrix.copy(M); b.node.add(coll); coll.updateMatrixWorld(true); S.obj=addObj(st,{f,P,node:coll,body:b,kind:'ground',off:true});
    const N=6; const sc=[0.62,1.16,0.78,1.1,0.7,0.9]; for(let i=0;i<N;i++){ const v0=bt.v0+(bt.v1-bt.v0)*i/N, v1=bt.v0+(bt.v1-bt.v0)*(i+1)/N; const sp={hx:P.hx,hy:P.hy,hz:(v1-v0)/2*1.01};
     let geo=new THREE.BoxGeometry(sp.hx*2,sp.hy*2,sp.hz*2,2,1,2).toNonIndexed(); sdfNormals(geo,SDF.box,sp); const Mi=faceMatrix(F).setPosition(F.N.clone().multiplyScalar(b.e.x+b.r+(bt.top-0.25)/2).addScaledVector(F.U,(bt.u0+bt.u1)/2).addScaledVector(F.V,(v0+v1)/2));
     geo=paint(geo,{top:'#f6f0ff',side:'#b9a6ff',upFn:(p,o)=>o.set(0,1,0)}); geo.applyMatrix4(Mi);
     const mt=new THREE.MeshLambertMaterial({vertexColors:true,emissive:new THREE.Color('#7fd7ff'),emissiveIntensity:0.15,transparent:true,opacity:0.92}); const m=new THREE.Mesh(geo,mt); m.userData.s=sc[i]; b.node.add(m); S.shards.push(m); } }
  for(const m of S.shards){ const s=m.userData.s; m.scale.setScalar(s); m.position.copy(El).multiplyScalar(1-s); }
  // glyph decal (unless it lives on a group platform)
  if(!sd.decalInGroup){ const gl=res(sd.glyph,true); const lkl=look.p.clone().sub(b.c); const m=decal(sd.faint?T.eyeFaint:T.eye,0.95,gl.p,gl.up,lkl); b.node.add(m); S.decal=m; }
  else{ const pd=(st.pendingDecals||[]).find(x=>x.sight===sd.id); S.decal=pd.m; // orient arrow: compute in group-local using aligned rotation
    const G=Object.values(st.groups).find(G=>G.node===pd.m.parent); const k=Math.round(((sd.glyph[1]-0)/(G.step/D2R)))%G.n; const q=new THREE.Quaternion().setFromAxisAngle(G.axis,-k*G.step); const lkl=look.p.clone().sub(b.c).applyQuaternion(q);
    pd.m.parent.remove(pd.m); const m2=decal(T.eye,0.95,pd.local.p,pd.local.up,lkl); G.node.add(m2); S.decal=m2; }
  st.sights.push(S); }
 // goal / portals
 if(def.goal){ const r=res(def.goal,true); const b=r.b; const w=WORLDS[def.world-1]; const m=bloomMesh(w?w.color:'#ffd27a',w?w.petal:'#fff',def.finale?1.6:1.15); m.position.copy(r.p); orient(m,r.up); b.node.add(m); st.goal={mesh:m,up:r.up.clone()}; }
 for(const pd of def.portals||[]){ const r=res(pd.at,true); const w=WORLDS[pd.w-1]; const m=bloomMesh(w.color,w.petal,1.05); m.position.copy(r.p); orient(m,r.up); st.bodies[0].node.add(m);
  st.portals.push({w:pd.w,mesh:m,up:r.up.clone()}); }
 // bugs
 for(const bg of def.bugs||[]){ const a=res(bg.from,true),c=res(bg.to,true); const m=bugMesh(); st.bodies[0].node.add(m); st.bugs.push({a:a.p,c:c.p,b:a.b,period:bg.period,mesh:m,dead:0,t:0,cube:isCube(bg.from),h:bg.from[2]}); }
 // decor (merged)
 buildDecor(st,decorSurf,pal,mats);
 // ambient motes
 const N=160,pp=new Float32Array(N*3); const rad=st.bodies.reduce((m,b)=>Math.max(m,b.c.length()+b.R+8),0); const cen=st.bodies.reduce((a,b)=>a.add(b.c),new V3()).multiplyScalar(1/st.bodies.length);
 for(let i=0;i<N;i++){ const d=new V3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(rad*(0.55+Math.random()*0.6)); pp.set([d.x+cen.x,d.y+cen.y,d.z+cen.z],i*3); }
 const pg=new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.BufferAttribute(pp,3)); const motes=new THREE.Points(pg,new THREE.PointsMaterial({size:0.16,map:T.soft,transparent:true,opacity:0.75,depthWrite:false,color:'#fffbe8'}));
 root.add(motes); st.motes=motes; st.center=cen; st.radius=rad;
 return st;
}
function orient(m,up){ m.quaternion.setFromUnitVectors(new V3(0,1,0),up); }
function addObj(st,o){ o.inv=new THREE.Matrix4(); o.on=!o.off; o.node.updateWorldMatrix(true,true); o.inv.copy(o.node.matrixWorld).invert();
 if(!o.lbc){ if(o.node.geometry){ o.node.geometry.computeBoundingSphere(); o.lbc=o.node.geometry.boundingSphere.center.clone(); o.br=o.node.geometry.boundingSphere.radius+0.2; } else { o.lbc=new V3(); o.br=o.r||(o.P.hx?Math.hypot(o.P.hx,o.P.hy,o.P.hz):3); } }
 o.bc=o.lbc.clone().applyMatrix4(o.node.matrixWorld); if(o.kind==='hazard')st.hazards.push(o); else st.ground.push(o); return o; }
function solidMesh(P,b,pal,mat,col){ let g=arcGeometry(P); sdfNormals(g,SDF.arc,P); g=paint(g,{top:col||pal.top,side:pal.side,edge:pal.edge,upFn:(p,o)=>o.copy(p).normalize()}); sdfNormals(g,SDF.arc,P); return new THREE.Mesh(g,mat); }
function decal(tex,r,p,up,toward){ const m=new THREE.Mesh(new THREE.CircleGeometry(r,40),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4,fog:false}));
 const z=up.clone().normalize(); let y=toward?toward.clone().sub(p):new V3(0,1,0).addScaledVector(z,-z.y); y.addScaledVector(z,-y.dot(z)); if(y.lengthSq()<1e-6)y=new V3(1,0,0).addScaledVector(z,-z.x); y.normalize(); const x=new V3().crossVectors(y,z);
 m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)); m.position.copy(p).addScaledVector(z,0.035); m.renderOrder=2; return m; }
export function bloomMesh(col,petal,s){ const g=new THREE.Group(); const pm=new THREE.MeshLambertMaterial({color:col,emissive:new THREE.Color(col),emissiveIntensity:0.18}); const pm2=new THREE.MeshLambertMaterial({color:petal});
 const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.06*s,0.09*s,1.1*s,8),new THREE.MeshLambertMaterial({color:'#6cc46a'})); stem.position.y=0.55*s; g.add(stem);
 const head=new THREE.Group(); head.position.y=1.2*s; g.add(head); const pg=new THREE.SphereGeometry(0.5*s,16,10); pg.scale(0.55,0.16,1); pg.translate(0,0,0.42*s);
 for(let i=0;i<7;i++){ const p=new THREE.Mesh(pg,i%2?pm:pm2); p.rotation.set(-0.45,i/7*Math.PI*2,0,'YXZ'); head.add(p); }
 const c=new THREE.Mesh(new THREE.SphereGeometry(0.24*s,16,12),new THREE.MeshLambertMaterial({color:'#fff6c0',emissive:new THREE.Color('#ffd86b'),emissiveIntensity:0.35})); head.add(c);
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.5*s,0.9*s,7*s,24,1,true),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.13,depthWrite:false,side:THREE.DoubleSide,fog:false}));
 beam.position.y=3.6*s; g.add(beam); g.userData={head,beam,s}; return g; }
function mothMesh(mats){ const T=textures(); const g=new THREE.Group(); const wm=new THREE.MeshBasicMaterial({map:T.wing,transparent:true,side:THREE.DoubleSide,depthWrite:false});
 const wg=new THREE.PlaneGeometry(0.62,0.5); wg.translate(0.31,0,0); const l=new THREE.Mesh(wg,wm),r=new THREE.Mesh(wg,wm); r.scale.x=-1; g.add(l,r);
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.06,0.25,4,8),new THREE.MeshLambertMaterial({color:'#5b6cc9'})); body.rotation.x=Math.PI/2; g.add(body); g.userData={l,r}; return g; }
function bugMesh(){ const g=new THREE.Group(); const sh=new THREE.Mesh(new THREE.SphereGeometry(0.5,20,14),new THREE.MeshLambertMaterial({color:'#7b6cf0'})); sh.scale.set(1,0.62,1.15); sh.position.y=0.32; g.add(sh);
 const spots=new THREE.MeshLambertMaterial({color:'#ffe46b'}); for(const [x,z] of [[0.22,0.1],[-0.22,0.1],[0,-0.28]]){ const s=new THREE.Mesh(new THREE.SphereGeometry(0.1,8,6),spots); s.position.set(x,0.6,z); s.scale.y=0.4; g.add(s); }
 const em=new THREE.MeshLambertMaterial({color:'#ffffff'}),pm=new THREE.MeshBasicMaterial({color:'#20203a'}); for(const x of [0.16,-0.16]){ const e=new THREE.Mesh(new THREE.SphereGeometry(0.11,10,8),em); e.position.set(x,0.42,0.5); g.add(e); const p=new THREE.Mesh(new THREE.SphereGeometry(0.055,8,6),pm); p.position.set(x,0.42,0.6); g.add(p); }
 return g; }
function buildDecor(st,surfs,pal,mats){ const list=[]; const flowerCols=['#ffffff','#fff07a','#ffb3d9','#c9b3ff','#9fe0ff','#ffd0a0']; const avoid=[];
 const wp=(o)=>{const v=new V3();o.getWorldPosition(v);return v;};
 for(const p of st.pads)avoid.push(wp(p.mesh)); for(const g of st.glyphs)avoid.push(wp(g.mesh)); if(st.goal)avoid.push(wp(st.goal.mesh)); for(const p of st.portals)avoid.push(wp(p.mesh));
 const stem=new THREE.CylinderGeometry(0.025,0.035,0.34,4).translate(0,0.17,0), head=new THREE.IcosahedronGeometry(0.1,0).translate(0,0.36,0), tuft=new THREE.ConeGeometry(0.07,0.32,4).translate(0,0.16,0);
 let count=0; const tmpM=new THREE.Matrix4(),q=new THREE.Quaternion();
 const place=(local,up,node)=>{ // local in node space (body or group node)
   const w=local.clone().applyMatrix4(node.matrixWorld); for(const a of avoid) if(a.distanceTo(w)<1.25)return; 
   const k=Math.random(); q.setFromUnitVectors(new V3(0,1,0),up); const yaw=new THREE.Quaternion().setFromAxisAngle(up,Math.random()*6.28); q.premultiply(yaw);
   const s=0.75+Math.random()*0.6; tmpM.compose(w,q,new V3(s,s,s));
   if(k<0.55){ list.push(colored(stem.clone(),'#5fb35a',tmpM)); list.push(colored(head.clone(),flowerCols[Math.floor(Math.random()*flowerCols.length)],tmpM)); }
   else{ for(let j=0;j<3;j++){ const m2=tmpM.clone().multiply(new THREE.Matrix4().makeRotationZ((j-1)*0.35)); list.push(colored(tuft.clone(),j===1?'#7fd06a':'#6cc25e',m2)); } } count++; };
 for(const s of surfs){ if(s.grp)continue; const P=s.P; const area=P.th<1e-4?Math.PI*Math.pow(P.wA*P.rt,2):P.th*P.rt*P.wA*P.rt*2; const n=Math.min(40,Math.floor(area*0.55));
  for(let i=0;i<n;i++){ let d; if(P.th<1e-4){ const ref=Math.abs(P.a.y)<0.9?new V3(0,1,0):new V3(1,0,0); const e1=new V3().crossVectors(P.a,ref).normalize(),e2=new V3().crossVectors(P.a,e1); const an=Math.sqrt(Math.random())*P.wA*0.88,ph=Math.random()*6.283;
     d=P.a.clone().multiplyScalar(Math.cos(an)).addScaledVector(e1,Math.sin(an)*Math.cos(ph)).addScaledVector(e2,Math.sin(an)*Math.sin(ph)); }
   else{ const ph=Math.random()*P.th,al=(Math.random()*2-1)*P.wA*0.8; d=P.a.clone().multiplyScalar(Math.cos(ph)).addScaledVector(P.t,Math.sin(ph)); d.multiplyScalar(Math.cos(al)).addScaledVector(P.n,Math.sin(al)); }
   d.normalize(); place(d.clone().multiplyScalar(P.rt),d,s.b.node); } }
 // cube faces: scatter on open areas (avoid ground objects above surface)
 const cube=st.bodies.find(b=>b.kind==='ground'); if(cube){ for(const fk in FACES){ const F=FACES[fk]; for(let i=0;i<45;i++){ const u=(Math.random()*2-1)*(cube.e.x-0.5),v=(Math.random()*2-1)*(cube.e.x-0.5);
   const lp=F.N.clone().multiplyScalar(cube.e.x+cube.r).addScaledVector(F.U,u).addScaledVector(F.V,v); const w=lp.clone().add(cube.c);
   let blocked=false; const probe=w.clone().addScaledVector(F.N,0.3); for(const o of st.ground){ if(o.node===undefined||o.f===SDF.rbox)continue; const q2=probe.clone().applyMatrix4(o.inv); if(o.f(q2,o.P)<0.35){blocked=true;break;} }
   for(const o of st.hazards){ const q2=probe.clone().applyMatrix4(o.inv); if(o.f(q2,o.P)<0.4){blocked=true;break;} } if(!blocked) place(lp,F.N,cube.node); } } }
 // trees: merged trunk+canopy
 const trunk=new THREE.CylinderGeometry(0.17,0.26,1.9,7).translate(0,0.95,0), can=new THREE.IcosahedronGeometry(0.85,1);
 const canCols=['#7fd36a','#9be37a','#ffc4dd','#ffe08a']; for(const t of st.decorPts){ if(!t.tree)continue; const q2=new THREE.Quaternion().setFromUnitVectors(new V3(0,1,0),t.up); const M=new THREE.Matrix4().compose(t.base,q2,new V3(t.s,t.s,t.s));
  list.push(colored(trunk.clone(),'#c98f62',M)); const cc=canCols[(Math.random()*canCols.length)|0]; for(const [x,y,z,s] of [[0,2.3,0,1],[0.45,1.95,0.2,0.7],[-0.4,2.0,-0.25,0.72],[0.05,2.85,0.05,0.62]]){ const g=can.clone().scale(s,s*0.9,s).translate(x,y,z); list.push(colored(g,cc,M)); } }
 if(list.length){ const g=mergeGeos(list); const m=new THREE.Mesh(g,mats.decor); st.root.add(m); st.decor=m; }
}
