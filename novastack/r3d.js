// Novastack v1.1 WebGL renderer (Three.js r160). Exposes window.R3D.
import * as THREE from 'three';
import {RoundedBoxGeometry} from './vendor/three/addons/geometries/RoundedBoxGeometry.js';
import {EffectComposer} from './vendor/three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from './vendor/three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from './vendor/three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from './vendor/three/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from './vendor/three/addons/environments/RoomEnvironment.js';

const COLS={I:0x3ff6ff,O:0xffe14a,T:0xb879ff,S:0x4dffa0,Z:0xff5fd8,J:0x4f7dff,L:0xffa03c,X:0x8fa6d6};
const TYPES=Object.keys(COLS);
let R,scene,cam,composer,bloom,board,chamber,mats={},inst={},ghost,ghostMat,previews=[],sky,streaks,city,cityMat,ground,lasers=[],shardMesh,shards=[],trails=[],rings=[],envTex,pmrem,F,W=0,H=0,pr=1.5;
const tmpM=new THREE.Matrix4(),tmpQ=new THREE.Quaternion(),tmpS=new THREE.Vector3(),tmpP=new THREE.Vector3(),tmpC=new THREE.Color();
const camBase=new THREE.Vector3(),camOff=new THREE.Vector3(),camVel=new THREE.Vector3();let shakeAmt=0,levelBurst=0,hueT=0,warp=0;
const cx=x=>x-4.5,cy=y=>9.5-y;

function edgeTex(){const s=256,c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');g.fillStyle='#2a2a2a';g.fillRect(0,0,s,s);const rg=g.createRadialGradient(s*.35,s*.3,0,s/2,s/2,s*.7);rg.addColorStop(0,'rgba(120,120,120,.6)');rg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=rg;g.fillRect(0,0,s,s);
 g.strokeStyle='#fff';g.lineWidth=14;g.strokeRect(12,12,s-24,s-24);
 g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=3;g.strokeRect(46,46,s-92,s-92);
 g.fillStyle='rgba(255,255,255,.55)';[[46,46],[s-46,46],[46,s-46],[s-46,s-46]].forEach(([x,y])=>{g.beginPath();g.arc(x,y,6,0,7);g.fill();});
 g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=2;g.beginPath();g.moveTo(46,s/2);g.lineTo(90,s/2);g.lineTo(110,s/2-20);g.moveTo(s-46,s/2);g.lineTo(s-90,s/2);g.lineTo(s-110,s/2+20);g.stroke();
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
function faceTex(){const s=256,c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,s,s);gr.addColorStop(0,'#e8e8f0');gr.addColorStop(.5,'#8a8aa0');gr.addColorStop(1,'#46465e');g.fillStyle=gr;g.fillRect(0,0,s,s);
 g.globalAlpha=.08;g.fillStyle='#000';for(let y=0;y<s;y+=6)g.fillRect(0,y,s,2);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function glowTex(){const s=128,c=document.createElement('canvas');c.width=4;c.height=s;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,0,s);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.45,'rgba(255,255,255,.6)');gr.addColorStop(.5,'#fff');gr.addColorStop(.55,'rgba(255,255,255,.6)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,4,s);return new THREE.CanvasTexture(c);}
function windowsTex(){const c=document.createElement('canvas');c.width=64;c.height=256;const g=c.getContext('2d');g.fillStyle='#0b1036';g.fillRect(0,0,64,256);
 for(let y=4;y<256;y+=8)for(let x=4;x<64;x+=8)if(Math.random()<.4){g.fillStyle=['#7ff6ff','#b9a2ff','#ffe9a8','#8fb8ff'][Math.random()*4|0];g.globalAlpha=.5+Math.random()*.5;g.fillRect(x,y,4,4);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}

const skyVS=`varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const skyFS=`varying vec3 vP;uniform float uT,uPulse,uHue,uOn;
float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n3(p);p*=2.03;a*=.5;}return s;}
vec3 hueRot(vec3 c,float a){const vec3 k=vec3(.57735);float ca=cos(a);return c*ca+cross(k,c)*sin(a)+k*dot(k,c)*(1.-ca);}
void main(){vec3 d=normalize(vP);float y=d.y;
 vec3 top=vec3(.03,.05,.22),mid=vec3(.16,.12,.48),hor=vec3(.08,.38,.62);
 vec3 c=mix(hor,mid,smoothstep(-.05,.25,y));c=mix(c,top,smoothstep(.25,.8,y));
 if(uOn>.5){float n=fbm(d*3.+vec3(uT*.02,0.,uT*.015));float n2=fbm(d*6.-vec3(0.,uT*.03,0.));
  vec3 neb=mix(vec3(.45,.2,.9),vec3(.1,.8,1.),n2);c+=neb*pow(n,2.6)*0.9*(1.+uPulse*.5);
  float st=pow(h(floor(d*400.)),60.)*step(.0,y+.2);c+=vec3(st)*(.7+.3*sin(uT*3.+h(floor(d*400.))*40.));}
 c=hueRot(c,uHue);c*=.92+uPulse*.12;
 gl_FragColor=vec4(c,1.);}`;
const gridFS=`varying vec2 vU;uniform float uT,uPulse;void main(){vec2 g=vU*vec2(80.,80.);g.y+=uT*2.;vec2 f=abs(fract(g)-.5);float l=smoothstep(.47,.5,max(f.x,f.y));
 float fade=smoothstep(0.,.35,vU.y)*smoothstep(1.,.6,vU.y);vec3 c=mix(vec3(.25,.95,1.),vec3(.7,.5,1.),vU.x)*l*fade*(1.+uPulse*.8);gl_FragColor=vec4(c,l*fade*.9);}`;
const backFS=`varying vec2 vU;uniform float uT,uDanger;void main(){vec2 g=vU*vec2(10.,20.);vec2 f=abs(fract(g)-.5);float l=smoothstep(.46,.5,max(f.x,f.y));
 float scan=.5+.5*sin(vU.y*200.+uT*4.);float v=smoothstep(0.,1.,1.-vU.y);vec3 base=mix(vec3(.01,.02,.09),vec3(.03,.06,.18),v);
 vec3 lc=mix(vec3(.3,.85,1.),vec3(.75,.55,1.),uDanger);vec3 c=base+lc*l*.18+lc*.015*scan;gl_FragColor=vec4(c,.9);}`;
const vsUV=`varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

function init(canvas,opts){
 try{R=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){return false;}
 if(!R.getContext())return false;
 F=opts;R.outputColorSpace=THREE.SRGBColorSpace;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=0.95;
 scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x2a3a8a,0.0045);
 cam=new THREE.PerspectiveCamera(32,1,0.5,900);
 pmrem=new THREE.PMREMGenerator(R);envTex=pmrem.fromScene(new RoomEnvironment(R),0.04).texture;scene.environment=envTex;
 scene.add(new THREE.HemisphereLight(0x9fd8ff,0x30206a,0.7));
 const key=new THREE.DirectionalLight(0xffffff,1.6);key.position.set(6,12,14);scene.add(key);
 const pl1=new THREE.PointLight(0x40e8ff,40,40,1.6);pl1.position.set(-9,6,6);scene.add(pl1);
 const pl2=new THREE.PointLight(0xc070ff,25,40,1.6);pl2.position.set(12,-6,9);scene.add(pl2);
 // sky
 sky=new THREE.Mesh(new THREE.SphereGeometry(500,48,24),new THREE.ShaderMaterial({vertexShader:skyVS,fragmentShader:skyFS,side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{uT:{value:0},uPulse:{value:0},uHue:{value:0},uOn:{value:1}}}));scene.add(sky);
 // hyperspace streaks
 const N=700,pos=new Float32Array(N*6),col=new Float32Array(N*6);streaks={N,data:[]};
 for(let i=0;i<N;i++){const a=Math.random()*Math.PI*2,r=14+Math.random()*60;const d={x:Math.cos(a)*r,y:Math.sin(a)*r*0.6+4,z:-40-Math.random()*360,len:2+Math.random()*6};streaks.data.push(d);
  tmpC.setHSL(0.5+Math.random()*0.28,1,0.7);for(let k=0;k<2;k++){col[i*6+k*3]=tmpC.r*(k?1:0.1);col[i*6+k*3+1]=tmpC.g*(k?1:0.1);col[i*6+k*3+2]=tmpC.b*(k?1:0.1);}}
 const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(pos,3));sg.setAttribute('color',new THREE.BufferAttribute(col,3));
 streaks.mesh=new THREE.LineSegments(sg,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));streaks.mesh.frustumCulled=false;scene.add(streaks.mesh);
 // megacity
 const bg=new THREE.BoxGeometry(1,1,1);bg.translate(0,0.5,0);cityMat=new THREE.MeshLambertMaterial({map:windowsTex(),emissive:0xffffff,emissiveMap:null});
 const wt=cityMat.map;cityMat.emissiveMap=wt;cityMat.emissiveIntensity=0.9;cityMat.color.set(0x8090c0);
 const CN=360;city=new THREE.InstancedMesh(bg,cityMat,CN);
 for(let i=0;i<CN;i++){const side=Math.random()<.5?-1:1;const z=-70-Math.random()*330,x=side*(10+Math.random()*(60-z*0.6));const w=5+Math.random()*12,h=15+Math.random()*(z<-200?75:45);
  tmpM.compose(tmpP.set(x,-75,z),tmpQ.identity(),tmpS.set(w,h,w));city.setMatrixAt(i,tmpM);tmpC.setHSL(0.6+Math.random()*0.15,0.5,0.55+Math.random()*0.3);city.setColorAt(i,tmpC);}
 scene.add(city);
 ground=new THREE.Mesh(new THREE.PlaneGeometry(600,600),new THREE.ShaderMaterial({vertexShader:vsUV,fragmentShader:gridFS,transparent:true,depthWrite:false,uniforms:{uT:{value:0},uPulse:{value:0}}}));ground.rotation.x=-Math.PI/2;ground.position.set(0,-75,-200);scene.add(ground);
 // board chamber
 board=new THREE.Group();scene.add(board);chamber=new THREE.Group();board.add(chamber);
 const back=new THREE.Mesh(new THREE.PlaneGeometry(10,20),new THREE.ShaderMaterial({vertexShader:vsUV,fragmentShader:backFS,transparent:true,uniforms:{uT:{value:0},uDanger:{value:0}}}));back.position.z=-0.62;chamber.add(back);chamber.userData.back=back;
 const frameMat=new THREE.MeshBasicMaterial({color:new THREE.Color(0x5ff0ff).multiplyScalar(2.2),toneMapped:false});chamber.userData.frame=frameMat;
 const fb=(w,h,x,y)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,0.16),frameMat);m.position.set(x,y,-0.1);chamber.add(m);};
 fb(0.12,20.4,-5.12,0);fb(0.12,20.4,5.12,0);fb(10.36,0.12,0,-10.12);
 const metal=new THREE.MeshPhysicalMaterial({color:0x2a3470,metalness:.9,roughness:.25,clearcoat:1});
 const side=(x)=>{const m=new THREE.Mesh(new RoundedBoxGeometry(0.5,21,1.4,3,0.15),metal);m.position.set(x,0,-0.5);chamber.add(m);};side(-5.5);side(5.5);
 const base=new THREE.Mesh(new RoundedBoxGeometry(12,0.7,2.2,3,0.2),metal);base.position.set(0,-10.6,-0.4);chamber.add(base);
 const baseGlow=new THREE.Mesh(new THREE.BoxGeometry(11.4,0.08,0.05),frameMat);baseGlow.position.set(0,-10.3,0.72);chamber.add(baseGlow);
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(6.5,2,8,40,1,true),new THREE.MeshBasicMaterial({color:0x3ad8ff,transparent:true,opacity:.08,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));beam.position.set(0,-15,-0.5);chamber.add(beam);
 // panels for hold/next
 const panelMat=new THREE.MeshPhysicalMaterial({color:0x1a2a70,metalness:.2,roughness:.1,transmission:0,transparent:true,opacity:.55,clearcoat:1});
 const pn=(w,h,x,y)=>{const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,0.2,2,0.08),panelMat);m.position.set(x,y,-0.7);board.add(m);const e=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w,h)),new THREE.LineBasicMaterial({color:new THREE.Color(0x7ff6ff).multiplyScalar(1.6),toneMapped:false}));e.position.set(x,y,-0.58);board.add(e);};
 pn(4.6,4,-8.6,7.9);pn(4.6,15.6,8.6,2.1);
 // blocks
 const geo=new RoundedBoxGeometry(0.94,0.94,0.94,3,0.13);const et=edgeTex(),ft=faceTex();
 for(const t of TYPES){const c=new THREE.Color(COLS[t]);mats[t]=new THREE.MeshPhysicalMaterial({color:c.clone().multiplyScalar(0.55),map:ft,metalness:.4,roughness:.12,clearcoat:1,clearcoatRoughness:.06,emissive:c,emissiveMap:et,emissiveIntensity:1.5,envMapIntensity:0.7});
  inst[t]=new THREE.InstancedMesh(geo,mats[t],230);inst[t].count=0;inst[t].frustumCulled=false;board.add(inst[t]);}
 ghostMat=new THREE.MeshBasicMaterial({map:et,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false,color:0xffffff});
 ghost=new THREE.InstancedMesh(new THREE.BoxGeometry(0.9,0.9,0.9),ghostMat,4);ghost.frustumCulled=false;board.add(ghost);
 for(let s=0;s<6;s++){const g=new THREE.Group();const ms=[];for(let k=0;k<4;k++){const m=new THREE.Mesh(geo,mats.I);g.add(m);ms.push(m);}g.scale.setScalar(0.62);board.add(g);previews.push({g,ms,t:null});}
 previews[0].g.position.set(-8.6,7.4,0);for(let i=0;i<5;i++)previews[i+1].g.position.set(8.6,7.6-i*2.75,0);
 // shards
 shardMesh=new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.2),new THREE.MeshBasicMaterial({toneMapped:false}),500);shardMesh.count=0;shardMesh.frustumCulled=false;board.add(shardMesh);
 shardMesh.setColorAt(0,tmpC.set(1,1,1));
 // post
 composer=new EffectComposer(R);composer.addPass(new RenderPass(scene,cam));bloom=new UnrealBloomPass(new THREE.Vector2(256,256),0.55,0.35,0.9);composer.addPass(bloom);composer.addPass(new OutputPass());
 return true;}
const GT=glowTex;let _gt=null;const gt=()=>_gt||(_gt=GT());
function resize(w,h,dpr,lite,safe){W=w;H=h;pr=Math.min(dpr,lite?1:1.75);R.setPixelRatio(pr);R.setSize(w,h,false);composer.setPixelRatio(pr);composer.setSize(w,h);bloom.resolution.set(w*pr/2,h*pr/2);
 cam.aspect=w/h;
 // fit: board height 21.5 world units within usable height
 const usableH=h-safe.t-safe.b,fitH=22.4*h/usableH;const needW=25.5;const vf=THREE.MathUtils.degToRad(cam.fov);
 let dist=fitH/2/Math.tan(vf/2);const hw=needW/2/Math.tan(vf/2)/cam.aspect;dist=Math.max(dist,hw);
 camBase.set(0,(safe.b-safe.t)/h*fitH*0.5*-1,dist);cam.position.copy(camBase);cam.lookAt(0,camBase.y,0);cam.updateProjectionMatrix();
 return layout();}
function proj(x,y){tmpP.set(x,y,0).applyMatrix4(board.matrixWorld).project(cam);return{x:(tmpP.x+1)/2*W,y:(1-tmpP.y)/2*H};}
function layout(){cam.updateMatrixWorld();board.updateMatrixWorld();const a=proj(-5,10),b=proj(5,-10),c=proj(-10.9,5.7),d=proj(-6.3,-10),e=proj(-5,9),f=proj(-4,9),hl=proj(-10.9,9.9);
 return{cellPx:Math.abs(f.x-e.x),board:{l:a.x,t:a.y,r:b.x,b:b.y},hud:{l:c.x,t:c.y,r:d.x,b:d.y},holdTop:hl.y};}
function setType(m,t){m.material=mats[t];}
function fillInst(G,clearSet,clearK,tNow){for(const t of TYPES)inst[t].count=0;const off=40-20;
 const put=(t,x,y,sc,z)=>{const im=inst[t];if(im.count>=230)return;tmpM.compose(tmpP.set(cx(x),cy(y),z||0),tmpQ.identity(),tmpS.setScalar(sc));im.setMatrixAt(im.count++,tmpM);};
 for(let y=off;y<40;y++){const row=G.board[y];const cl=clearSet&&clearSet.has(y);for(let x=0;x<10;x++){const k=row[x];if(!k)continue;let sc=1,z=0;if(cl){sc=Math.max(0.001,1-clearK*clearK);z=clearK*1.5;}put(k,x,y-off,sc,z);}}
 if(G.cur){const p=G.cur;for(const[a,b]of F.cells(p.t,p.r)){const Y=p.y+b-off;if(Y>=-1)put(p.t,p.x+a,Y,1,0.02);}
  ghost.count=0;if(F.S.f.ghost){const gy=F.ghostY();ghostMat.color.set(COLS[p.t]);for(const[a,b]of F.cells(p.t,p.r)){const Y=gy+b-off;if(Y>=0){tmpM.compose(tmpP.set(cx(p.x+a),cy(Y),0),tmpQ.identity(),tmpS.setScalar(1));ghost.setMatrixAt(ghost.count++,tmpM);}}}ghost.instanceMatrix.needsUpdate=true;}
 else ghost.count=0;
 for(const t of TYPES)inst[t].instanceMatrix.needsUpdate=true;}
function setPreview(pv,t,dim,tNow,i){pv.t=t;pv.g.visible=!!t;if(!t)return;const cl=F.cells(t,0);let mx=0,my=0;cl.forEach(([a,b])=>{mx+=a;my+=b;});mx/=4;my/=4;
 cl.forEach(([a,b],k)=>{const m=pv.ms[k];setType(m,dim?'X':t);m.position.set(a-mx,my-b,0);});pv.g.rotation.y=F.S.f.tilt?Math.sin(tNow*0.8+i)*0.35:0;pv.g.rotation.x=0.15;}
// ---- fx api ----
function addLaser(row,n){const y=cy(row);const c=new THREE.Color(n===4?0xfff0a0:0x9ff8ff).multiplyScalar(3);const m=new THREE.Mesh(new THREE.PlaneGeometry(14,1.6),new THREE.MeshBasicMaterial({map:gt(),color:c,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));m.position.set(0,y,0.7);m.scale.x=0.01;board.add(m);lasers.push({m,t:0});}
function addShards(row,colors){for(let x=0;x<10;x++){const n=F.S.f.lite?2:6;for(let k=0;k<n;k++){if(shards.length>=480)break;shards.push({x:cx(x)+(Math.random()-.5)*.8,y:cy(row)+(Math.random()-.5)*.8,z:0,vx:(Math.random()-.5)*10+(x-4.5)*.6,vy:Math.random()*8+1,vz:Math.random()*10+2,r:Math.random()*6,vr:(Math.random()-.5)*12,c:new THREE.Color(COLS[colors[x]||'X']).multiplyScalar(1.6),life:1+Math.random()*.6});}}}
function addTrail(cols,t){for(const c of cols){const h=Math.max(0.5,c.y1-c.y0);const col=new THREE.Color(COLS[t]).multiplyScalar(2);const m=new THREE.Mesh(new THREE.PlaneGeometry(0.85,h),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));m.position.set(cx(c.x),cy(c.y0+h/2-0.5),-0.05);board.add(m);trails.push({m,t:0});}}
function addRing(col,y){if(rings.length>3)return;const m=new THREE.Mesh(new THREE.RingGeometry(0.9,1,64),new THREE.MeshBasicMaterial({color:new THREE.Color(col).multiplyScalar(3),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));m.position.set(0,y||0,0.5);board.add(m);rings.push({m,t:0});}
const FX={
 hard(cols,t){if(F.S.f.camera){camVel.y-=6;camVel.z-=10;}if(F.S.f.trails)addTrail(cols,t);},
 clear(rows,n,colors){rows.forEach((r,i)=>{if(F.S.f.laser)addLaser(r,n);if(F.S.f.shatter)addShards(r,colors[i]);});if(F.S.f.camera){shakeAmt=Math.max(shakeAmt,0.12+n*0.08);camVel.z+=n*6;}if(n===4&&F.S.f.levelfx){addRing(0xfff0a0,cy(rows[0]));warp=Math.max(warp,0.6);}},
 level(){if(!F.S.f.levelfx)return;levelBurst=1.5;warp=1.5;addRing(0x7ff6ff,0);setTimeout(()=>addRing(0xc79bff,0),180);},
 lock(){if(F.S.f.camera)camVel.y-=1.2;}
};
let lastReal=0;function frame(t,_dt,G,st){const nowR=performance.now()/1000;const dt=lastReal?Math.min(0.25,nowR-lastReal):_dt;lastReal=nowR;const f=F.S.f,pulse=Math.exp(-Math.max(0,t-(window.NS_BEAT||-9))*7)*(f.reactive?1:0);
 // backdrop
 sky.material.uniforms.uT.value=t;sky.material.uniforms.uPulse.value=pulse;sky.material.uniforms.uOn.value=f.nebula?1:0;
 const lvl=G?G.level:1;hueT+=((f.reactive?((lvl-1)%6)*0.12:0)-hueT)*Math.min(1,dt*1.5);sky.material.uniforms.uHue.value=hueT;
 streaks.mesh.visible=f.hyperspace;if(f.hyperspace){warp=Math.max(0,warp-dt*0.8);const sp=(30+lvl*4+(G&&G.danger||0)*20)*(1+warp*5)*(st==='play'?1:0.5);const pa=streaks.mesh.geometry.attributes.position.array;
  for(let i=0;i<streaks.N;i++){const d=streaks.data[i];d.z+=sp*dt;if(d.z>30){d.z-=390;}const L=d.len*(1+warp*6+pulse*0.6);pa[i*6]=d.x;pa[i*6+1]=d.y;pa[i*6+2]=d.z-L;pa[i*6+3]=d.x;pa[i*6+4]=d.y;pa[i*6+5]=d.z;}
  streaks.mesh.geometry.attributes.position.needsUpdate=true;streaks.mesh.material.opacity=0.65+pulse*0.35;}
 city.visible=ground.visible=f.city;if(f.city){ground.material.uniforms.uT.value=t*(1+lvl*0.05);ground.material.uniforms.uPulse.value=pulse;cityMat.emissiveIntensity=0.8+pulse*0.5;}
 // chamber
 board.rotation.y=f.tilt?-0.13+Math.sin(t*0.25)*0.02:0;board.rotation.x=f.tilt?0.035:0;
 const fr=chamber.userData.frame;const dz=G?G.danger:0;fr.color.setRGB(0.37+dz*0.4,0.94-dz*0.35,1).multiplyScalar(2+pulse*0.8+levelBurst);levelBurst=Math.max(0,levelBurst-dt*2);
 chamber.userData.back.material.uniforms.uT.value=t;chamber.userData.back.material.uniforms.uDanger.value=dz;
 const showBoard=!!G&&st!=='title';board.visible=showBoard;
 if(G&&showBoard){const clearSet=G.clearing?new Set(G.clearing):null;fillInst(G,clearSet,G.clearing?Math.min(1,G.clearT/0.35):0,t);
  setPreview(previews[0],f.hold?G.hold:null,!G.canHold,t,0);for(let i=0;i<5;i++)setPreview(previews[i+1],G.queue[i],false,t,i+1);
  for(const tt of TYPES)mats[tt].emissiveIntensity=1.5+pulse*0.5;
  if(G.cur&&F.onGround()){const k=0.5+0.5*Math.cos(G.lockT*20);mats[G.cur.t].emissiveIntensity=1.5+k*1.2;}}
 // fx update
 for(let i=lasers.length-1;i>=0;i--){const L=lasers[i];L.t+=dt;const k=L.t/0.45;L.m.scale.x=Math.min(1,k*2.5);L.m.scale.y=Math.max(0.05,1-k);L.m.material.opacity=1-k;if(k>=1){board.remove(L.m);L.m.geometry.dispose();L.m.material.dispose();lasers.splice(i,1);}}
 for(let i=trails.length-1;i>=0;i--){const T=trails[i];T.t+=dt;T.m.material.opacity=0.4*(1-T.t/0.3);T.m.scale.x=1-T.t/0.3*0.6;if(T.t>=0.3){board.remove(T.m);T.m.geometry.dispose();T.m.material.dispose();trails.splice(i,1);}}
 for(let i=rings.length-1;i>=0;i--){const Q=rings[i];Q.t+=dt;const s=1+Q.t*30;Q.m.scale.setScalar(s);Q.m.material.opacity=1-Q.t/0.8;if(Q.t>=0.8){board.remove(Q.m);Q.m.geometry.dispose();Q.m.material.dispose();rings.splice(i,1);}}
 let n=0;for(let i=shards.length-1;i>=0;i--){const s=shards[i];s.vy-=20*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;s.r+=s.vr*dt;s.life-=dt;if(s.life<=0){shards.splice(i,1);continue;}}
 for(const s of shards){tmpQ.setFromEuler(new THREE.Euler(s.r,s.r*0.7,0));tmpM.compose(tmpP.set(s.x,s.y,s.z),tmpQ,tmpS.setScalar(Math.min(1,s.life)));shardMesh.setMatrixAt(n,tmpM);shardMesh.setColorAt(n,s.c);n++;}
 shardMesh.count=n;shardMesh.instanceMatrix.needsUpdate=true;if(shardMesh.instanceColor)shardMesh.instanceColor.needsUpdate=true;
 // camera spring
 camVel.addScaledVector(camOff,-90*dt);camVel.clampLength(0,10);camOff.clampLength(0,1.2);camVel.multiplyScalar(Math.pow(0.0006,dt));camOff.addScaledVector(camVel,dt);
 shakeAmt*=Math.pow(0.004,dt);const sw=f.camera?0.25:0;
 cam.position.set(camBase.x+camOff.x+Math.sin(t*0.3)*sw+(Math.random()-.5)*shakeAmt,camBase.y+camOff.y+Math.cos(t*0.23)*sw*0.5+(Math.random()-.5)*shakeAmt,camBase.z+camOff.z*0.3);
 cam.lookAt(camBase.x*0.5,camBase.y,0);
 bloom.enabled=!!f.bloom;
 if(f.bloom)composer.render();else{R.setRenderTarget(null);R.render(scene,cam);}
 R.toneMapping=THREE.ACESFilmicToneMapping;
 mats.X.emissiveIntensity=1;
 sky.visible=true;}
function setEnv(on){scene.environment=on?envTex:null;for(const t of TYPES){mats[t].clearcoat=on?1:0;mats[t].needsUpdate=true;}}
window.R3D={init,resize,frame,FX,setEnv,layout};
window.dispatchEvent(new Event('r3d-ready'));
