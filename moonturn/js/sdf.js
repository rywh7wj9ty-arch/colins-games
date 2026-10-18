// Moonturn — SDF primitives + matching geometry builders
import * as THREE from '../vendor/three/three.module.js';
const V3=THREE.Vector3;
const _a=new V3(),_b=new V3(),_c=new V3();
export const D2R=Math.PI/180;
export function dir(lat,lon,out=new V3()){lat*=D2R;lon*=D2R;return out.set(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon));}
function comb(a,b){const ox=Math.max(a,0),oy=Math.max(b,0);return Math.hypot(ox,oy)+Math.min(Math.max(a,b),0);}
// ---- SDFs in local space (q is a Vector3, never modified) ----
export function sdArc(q,P){ // P:{a,b,n,t,th,wA,rt,rb}
  const r=q.length()||1e-6; let lat;
  if(P.th<1e-4){ const c=Math.min(1,Math.max(-1,(q.x*P.a.x+q.y*P.a.y+q.z*P.a.z)/r)); lat=Math.acos(c)-P.wA; }
  else{ const un=(q.x*P.n.x+q.y*P.n.y+q.z*P.n.z)/r; const beta=Math.asin(Math.min(1,Math.max(-1,un)));
    const ua=(q.x*P.a.x+q.y*P.a.y+q.z*P.a.z)/r, ut=(q.x*P.t.x+q.y*P.t.y+q.z*P.t.z)/r; const phi=Math.atan2(ut,ua);
    const e=Math.max(-phi,phi-P.th); lat=Math.max(Math.abs(beta)-P.wA,e); }
  return comb(lat*r, Math.max(r-P.rt,P.rb-r));
}
export function sdBox(q,P){ const dx=Math.abs(q.x)-P.hx,dy=Math.abs(q.y)-P.hy,dz=Math.abs(q.z)-P.hz;
  return Math.hypot(Math.max(dx,0),Math.max(dy,0),Math.max(dz,0))+Math.min(Math.max(dx,dy,dz),0); }
export function sdCyl(q,P){ return comb(Math.hypot(q.x,q.z)-P.r, Math.abs(q.y)-P.hh); }
export function sdSphere(q,P){ return q.length()-P.r; }
export function sdRBox(q,P){ const dx=Math.abs(q.x)-P.e.x,dy=Math.abs(q.y)-P.e.y,dz=Math.abs(q.z)-P.e.z;
  return Math.hypot(Math.max(dx,0),Math.max(dy,0),Math.max(dz,0))+Math.min(Math.max(dx,dy,dz),0)-P.r; }
export const SDF={arc:sdArc,box:sdBox,cyl:sdCyl,sphere:sdSphere,rbox:sdRBox};

export function arcParams(a,b,rt,rb,w){ // a,b unit dirs; w half width (units at rt)
  a=a.clone().normalize(); b=b.clone().normalize(); const th=a.angleTo(b);
  const P={a,b,th,rt,rb,wA:w/rt};
  if(th>1e-4){ P.n=new V3().crossVectors(a,b).normalize(); P.t=new V3().crossVectors(P.n,a).normalize(); }
  return P;
}
// ---- painterly vertex colour ----
function hash(x,y,z){ const s=Math.sin(x*12.9898+y*78.233+z*37.719)*43758.5453; return s-Math.floor(s); }
function vnoise(x,y,z){ const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi;
  const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf); let r=0;
  for(let i=0;i<2;i++)for(let j=0;j<2;j++)for(let k=0;k<2;k++){ r+=hash(xi+i,yi+j,zi+k)*(i?u:1-u)*(j?v:1-v)*(k?w:1-w);} return r; }
export function paint(geo,{top,side,upFn,mat=null,scale=0.6,var:vr=0.13,edge=null}){
  geo=geo.index?geo.toNonIndexed():geo; if(!geo.attributes.normal)geo.computeVertexNormals();
  const pos=geo.attributes.position,nor=geo.attributes.normal,n=pos.count; const col=new Float32Array(n*3);
  const ct=new THREE.Color(top),cs=new THREE.Color(side),ce=edge?new THREE.Color(edge):null,tmp=new THREE.Color();
  const p=new V3(),nn=new V3(),u=new V3(); const nm=mat?new THREE.Matrix3().getNormalMatrix(mat):null;
  for(let i=0;i<n;i++){ p.fromBufferAttribute(pos,i); nn.fromBufferAttribute(nor,i); if(mat){p.applyMatrix4(mat); nn.applyMatrix3(nm).normalize();}
    upFn(p,u); const d=nn.dot(u); const t=THREE.MathUtils.smoothstep(d,0.45,0.8);
    tmp.copy(cs).lerp(ct,t); if(ce&&t>0.01&&t<0.99) tmp.lerp(ce,0.35*(1-Math.abs(t-.5)*2));
    const nz=vnoise(p.x*scale,p.y*scale,p.z*scale)*0.7+vnoise(p.x*scale*3.1,p.y*scale*3.1,p.z*scale*3.1)*0.3;
    const k=1+(nz-0.5)*2*vr; tmp.r*=k;tmp.g*=k*(1+(nz-.5)*0.04);tmp.b*=k*(1-(nz-.5)*0.08);
    col[i*3]=Math.min(1,tmp.r);col[i*3+1]=Math.min(1,tmp.g);col[i*3+2]=Math.min(1,tmp.b); }
  geo.setAttribute('color',new THREE.BufferAttribute(col,3)); return geo;
}
// ---- geometry for arc / disc (body-local coordinates) ----
export function arcGeometry(P,{segDeg=3,phi0=0,phi1=null}={}){
  const pts=[]; const quads=[];
  if(P.th<1e-4){ // disc: lathe around a
    const axis=P.a; const ref=Math.abs(axis.y)<0.9?new V3(0,1,0):new V3(1,0,0);
    const e1=new V3().crossVectors(axis,ref).normalize(), e2=new V3().crossVectors(axis,e1);
    const NR=Math.max(4,Math.ceil(P.wA/(segDeg*D2R))), NS=Math.max(24,Math.min(64,Math.ceil(P.wA*P.rt*6)+16));
    const pos=[]; const ring=(ang,rad)=>{const row=[];for(let j=0;j<=NS;j++){const s=j/NS*Math.PI*2;
      const d=new V3().copy(axis).multiplyScalar(Math.cos(ang)).addScaledVector(e1,Math.sin(ang)*Math.cos(s)).addScaledVector(e2,Math.sin(ang)*Math.sin(s));row.push(d.multiplyScalar(rad));}return row;};
    const rows=[]; for(let i=0;i<=NR;i++) rows.push(ring(P.wA*i/NR,P.rt));
    rows.push(ring(P.wA,P.rt-0.12)); rows.push(ring(P.wA*1.004,(P.rt+P.rb)/2)); rows.push(ring(P.wA,P.rb));
    const tri=[]; for(let i=0;i<rows.length-1;i++)for(let j=0;j<NS;j++){const a=rows[i][j],b=rows[i][j+1],c=rows[i+1][j+1],d=rows[i+1][j]; if(i===0){tri.push(a,d,c);} else tri.push(a,d,c,a,c,b);}
    const g=new THREE.BufferGeometry(); const arr=new Float32Array(tri.length*3); tri.forEach((v,i)=>{arr[i*3]=v.x;arr[i*3+1]=v.y;arr[i*3+2]=v.z;}); g.setAttribute('position',new THREE.BufferAttribute(arr,3)); return g;
  }
  const p1=phi1===null?P.th:phi1; const N=Math.max(2,Math.ceil((p1-phi0)/(segDeg*D2R)));
  const W=4; // columns across top
  const sec=[]; // per step list of corner points around section (top cols..., right side, bottom, left side)
  for(let i=0;i<=N;i++){ const phi=phi0+(p1-phi0)*i/N; const dc=new V3().copy(P.a).multiplyScalar(Math.cos(phi)).addScaledVector(P.t,Math.sin(phi));
    const at=(al,r)=>new V3().copy(dc).multiplyScalar(Math.cos(al)).addScaledVector(P.n,Math.sin(al)).multiplyScalar(r);
    const row=[]; for(let j=0;j<=W;j++) row.push(at(P.wA*(1-2*j/W),P.rt)); // left->right top
    row.push(at(-P.wA,P.rt-0.12)); row.push(at(-P.wA,P.rb)); row.push(at(P.wA,P.rb)); row.push(at(P.wA,P.rt-0.12)); row.push(row[0].clone());
    sec.push(row); }
  const tri=[]; const M=sec[0].length;
  for(let i=0;i<N;i++)for(let j=0;j<M-1;j++){const a=sec[i][j],b=sec[i][j+1],c=sec[i+1][j+1],d=sec[i+1][j]; tri.push(a,b,c,a,c,d);}
  // end caps
  for(const [i,flip] of [[0,true],[N,false]]){ const s=sec[i]; // polygon: top row + 4 corners
    const cen=new V3(); for(let j=0;j<M-1;j++)cen.add(s[j]); cen.multiplyScalar(1/(M-1));
    for(let j=0;j<M-1;j++){ if(flip)tri.push(cen,s[j+1],s[j]); else tri.push(cen,s[j],s[j+1]); } }
  const g=new THREE.BufferGeometry(); const arr=new Float32Array(tri.length*3); tri.forEach((v,i)=>{arr[i*3]=v.x;arr[i*3+1]=v.y;arr[i*3+2]=v.z;}); g.setAttribute('position',new THREE.BufferAttribute(arr,3)); return g;
}
export function rboxGeometry(e,r,seg=28){ const s=e.clone().addScalar(r); const g=new THREE.BoxGeometry(s.x*2,s.y*2,s.z*2,seg,seg,seg);
  const p=g.attributes.position,v=new V3(),c=new V3(); for(let i=0;i<p.count;i++){ v.fromBufferAttribute(p,i); c.copy(v).clamp(_a.copy(e).negate(),_b.copy(e)); v.sub(c); if(v.lengthSq()<1e-9)v.set(0,1,0); v.normalize().multiplyScalar(r).add(c); p.setXYZ(i,v.x,v.y,v.z);} g.computeVertexNormals(); return g; }
