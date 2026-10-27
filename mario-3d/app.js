'use strict';
var Q=(function(){var m=location.search.match(/[?&]q=(low|medium|high)/);if(m)return m[1];var mob=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||Math.min(screen.width,screen.height)<700;return mob?'medium':'high';})();
var QS={low:{dpr:1,shadow:1024,seg:0.55,bloom:false,soft:false},medium:{dpr:1.6,shadow:2048,seg:0.8,bloom:true,soft:true},high:{dpr:2,shadow:4096,seg:1,bloom:true,soft:true}}[Q];
var $=function(id){return document.getElementById(id)};
var canvas=$('c');
var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,powerPreference:'high-performance'});
var DPR=Math.min(window.devicePixelRatio||1,QS.dpr);renderer.setPixelRatio(DPR);
renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.9;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=QS.soft?THREE.PCFSoftShadowMap:THREE.PCFShadowMap;
renderer.physicallyCorrectLights=false;
var scene=new THREE.Scene();
var camera=new THREE.PerspectiveCamera(32,1,0.05,400);
var SEG=function(n){return Math.max(8,Math.round(n*QS.seg))};
function lin(h){return new THREE.Color(h).convertSRGBToLinear()}
var TAU=Math.PI*2,clamp=function(v,a,b){return v<a?a:v>b?b:v},lerp=function(a,b,t){return a+(b-a)*t},ss=function(t){t=clamp(t,0,1);return t*t*(3-2*t)};

// ---------- sky + IBL ----------
var skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color(0x3d9cf0)},mid:{value:new THREE.Color(0xa8e4ff)},bot:{value:new THREE.Color(0xfff1d6)}},
vertexShader:'varying vec3 vp;void main(){vp=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
fragmentShader:'uniform vec3 top,mid,bot;varying vec3 vp;void main(){float h=vp.y;vec3 c=h>0.?mix(mid,top,pow(h,.6)):mix(mid,bot,pow(-h,.5));gl_FragColor=vec4(c,1.);}'});
var sky=new THREE.Mesh(new THREE.SphereGeometry(200,32,16),skyMat);scene.add(sky);
(function(){var W=512,H=256,c=document.createElement('canvas');c.width=W;c.height=H;var x=c.getContext('2d');var g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#3d8fe0');g.addColorStop(.45,'#bfe6ff');g.addColorStop(.5,'#f2efe4');g.addColorStop(.56,'#9a9a80');g.addColorStop(1,'#6a6450');x.fillStyle=g;x.fillRect(0,0,W,H);
 function blob(cx,cy,r,col){var gg=x.createRadialGradient(cx,cy,0,cx,cy,r);gg.addColorStop(0,col);gg.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gg;x.fillRect(cx-r,cy-r,r*2,r*2)}
 blob(W*0.62,H*0.18,60,'rgba(255,250,235,1)');blob(W*0.12,H*0.3,50,'rgba(220,235,255,.8)');blob(W*0.88,H*0.32,40,'rgba(255,220,190,.7)');
 var t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;t.encoding=THREE.sRGBEncoding;
 var pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromEquirectangular(t).texture;pm.dispose();t.dispose()})();

// ---------- lights ----------
scene.add(new THREE.HemisphereLight(0xcfeaff,0x5b7a3a,0.2));
var key=new THREE.DirectionalLight(0xfff1dc,1.25);key.position.set(3.5,6,4.5);key.castShadow=true;
key.shadow.mapSize.set(QS.shadow,QS.shadow);key.shadow.bias=-0.0004;key.shadow.normalBias=0.012;key.shadow.radius=4;
var sc=key.shadow.camera;sc.left=-1.6;sc.right=1.6;sc.top=2.4;sc.bottom=-0.6;sc.near=1;sc.far=20;scene.add(key);scene.add(key.target);
var rim=new THREE.DirectionalLight(0xbfe3ff,1.1);rim.position.set(-3,3.5,-5);scene.add(rim);
var rim2=new THREE.DirectionalLight(0xffd2a8,0.5);rim2.position.set(4,1.5,-4);scene.add(rim2);
var fill=new THREE.DirectionalLight(0xffffff,0.15);fill.position.set(-3,1,4);scene.add(fill);

// ---------- procedural textures ----------
function cv(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c}
function rnd(s){return function(){s=(s*16807)%2147483647;return (s-1)/2147483646}}
function toNormal(src,strength){var w=src.width,h=src.height,d=src.getContext('2d').getImageData(0,0,w,h).data,o=cv(w,h),ox=o.getContext('2d'),od=ox.createImageData(w,h);
 function H(x,y){x=(x+w)%w;y=(y+h)%h;return d[(y*w+x)*4]/255}
 for(var y=0;y<h;y++)for(var x=0;x<w;x++){var dx=(H(x-1,y)-H(x+1,y))*strength,dy=(H(x,y-1)-H(x,y+1))*strength,l=Math.sqrt(dx*dx+dy*dy+1),i=(y*w+x)*4;od.data[i]=(dx/l*.5+.5)*255;od.data[i+1]=(-dy/l*.5+.5)*255;od.data[i+2]=(1/l*.5+.5)*255;od.data[i+3]=255}
 ox.putImageData(od,0,0);return o}
function tex(c,rep,srgb){var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;if(rep)t.repeat.set(rep[0],rep[1]);if(srgb)t.encoding=THREE.sRGBEncoding;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t}
// denim twill
var denim=(function(){var S=256,c=cv(S,S),x=c.getContext('2d'),hc=cv(S,S),hx=hc.getContext('2d'),r=rnd(7);
 x.fillStyle='#2f55c4';x.fillRect(0,0,S,S);hx.fillStyle='#808080';hx.fillRect(0,0,S,S);
 for(var i=-S;i<S*2;i+=4){var l=0.85+r()*0.3;x.strokeStyle='rgba('+(60*l|0)+','+(100*l|0)+','+(215*l|0)+',.55)';x.lineWidth=2;x.beginPath();x.moveTo(i,0);x.lineTo(i+S*0.6,S);x.stroke();
  hx.strokeStyle='#d0d0d0';hx.lineWidth=2;hx.beginPath();hx.moveTo(i,0);hx.lineTo(i+S*0.6,S);hx.stroke();hx.strokeStyle='#404040';hx.lineWidth=1;hx.beginPath();hx.moveTo(i+2,0);hx.lineTo(i+2+S*0.6,S);hx.stroke();}
 for(i=0;i<5000;i++){var px=r()*S,py=r()*S,b=r();x.fillStyle=b>0.5?'rgba(170,195,255,.25)':'rgba(10,25,90,.25)';x.fillRect(px,py,1+r()*3,1);}
 for(i=0;i<18;i++){x.fillStyle='rgba(120,150,235,.10)';x.fillRect(0,r()*S,S,2+r()*6)}
 return{map:tex(c,[6,6],true),normal:tex(toNormal(hc,2.2),[6,6])}})();
// shirt cotton + folds
var cloth=(function(){var S=256,hc=cv(S,S),hx=hc.getContext('2d'),r=rnd(3);hx.fillStyle='#808080';hx.fillRect(0,0,S,S);
 for(var i=0;i<26;i++){var y=r()*S,g=hx.createLinearGradient(0,y-10,0,y+10);g.addColorStop(0,'rgba(128,128,128,0)');g.addColorStop(.5,r()>.5?'rgba(200,200,200,.5)':'rgba(60,60,60,.5)');g.addColorStop(1,'rgba(128,128,128,0)');hx.fillStyle=g;hx.save();hx.translate(S/2,y);hx.rotate((r()-.5)*.6);hx.fillRect(-S,-10,S*2,20);hx.restore()}
 var d=hx.getImageData(0,0,S,S);for(i=0;i<d.data.length;i+=4){var n=(r()-.5)*30;d.data[i]+=n;d.data[i+1]+=n;d.data[i+2]+=n}hx.putImageData(d,0,0);
 return tex(toNormal(hc,1.6),[3,2])})();
var leatherN=(function(){var S=128,hc=cv(S,S),hx=hc.getContext('2d'),r=rnd(11);hx.fillStyle='#808080';hx.fillRect(0,0,S,S);for(var i=0;i<900;i++){hx.fillStyle='rgba('+(r()>.5?255:0)+','+(r()>.5?255:0)+',128,.12)';hx.beginPath();hx.arc(r()*S,r()*S,1+r()*2.5,0,TAU);hx.fill()}
 var d=hx.getImageData(0,0,S,S);for(i=0;i<d.data.length;i+=4){d.data[i+1]=d.data[i+2]=d.data[i]}hx.putImageData(d,0,0);return tex(toNormal(hc,1.2),[3,3])})();
var hairN=(function(){var S=128,hc=cv(S,S),hx=hc.getContext('2d'),r=rnd(5);hx.fillStyle='#808080';hx.fillRect(0,0,S,S);for(var i=0;i<500;i++){var v=r()>.5?220:40;hx.strokeStyle='rgba('+v+','+v+','+v+',.35)';hx.lineWidth=1;var x0=r()*S;hx.beginPath();hx.moveTo(x0,0);hx.bezierCurveTo(x0+r()*10-5,S*.3,x0+r()*10-5,S*.6,x0+r()*12-6,S);hx.stroke()}return tex(toNormal(hc,2.5),[4,2])})();
var skinN=(function(){var S=128,hc=cv(S,S),hx=hc.getContext('2d'),r=rnd(9);hx.fillStyle='#808080';hx.fillRect(0,0,S,S);var d=hx.getImageData(0,0,S,S);for(var i=0;i<d.data.length;i+=4){var n=(r()-.5)*14;d.data[i]+=n;d.data[i+1]+=n;d.data[i+2]+=n}hx.putImageData(d,0,0);return tex(toNormal(hc,0.6),[6,6])})();

// ---------- materials ----------
var M={};
M.skin=new THREE.MeshPhysicalMaterial({color:0xffae78,roughness:0.5,normalMap:skinN,normalScale:new THREE.Vector2(.25,.25),sheen:0.0,sheenColor:new THREE.Color(0xff8a6a),sheenRoughness:0.5,emissive:0x5a1a08,emissiveIntensity:0.12,clearcoat:0.08});
M.skin.onBeforeCompile=function(s){ // wrapped diffuse = cheap subsurface glow
 s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\n reflectedLight.indirectDiffuse += vec3(0.11,0.025,0.01)*diffuseColor.rgb*(1.0-max(dot(normal,vec3(0.,0.,1.)),0.0));');};
M.nose=M.skin.clone();M.nose.color.set(0xffa77e);M.nose.roughness=0.32;M.nose.clearcoat=0.35;M.nose.clearcoatRoughness=0.25;M.nose.onBeforeCompile=M.skin.onBeforeCompile;
M.red=new THREE.MeshPhysicalMaterial({color:0xd8100e,roughness:0.6,normalMap:cloth,normalScale:new THREE.Vector2(.5,.5),sheen:0.25,sheenColor:new THREE.Color(0xff3020),sheenRoughness:0.6});
M.denim=new THREE.MeshPhysicalMaterial({color:0xffffff,map:denim.map,normalMap:denim.normal,normalScale:new THREE.Vector2(.9,.9),roughness:0.82,sheen:0.2,sheenColor:new THREE.Color(0x4a70ff),sheenRoughness:0.7});
M.gold=new THREE.MeshPhysicalMaterial({color:0xffd02a,metalness:0.7,roughness:0.22,clearcoat:1,envMapIntensity:1.6,emissive:0x6a4800});
M.glove=new THREE.MeshPhysicalMaterial({color:0xf6f5ef,roughness:0.72,normalMap:cloth,normalScale:new THREE.Vector2(.25,.25),sheen:0.7,sheenColor:new THREE.Color(0xffffff)});
M.gloveDk=new THREE.MeshStandardMaterial({color:0xcfcdc4,roughness:0.85});
M.shoe=new THREE.MeshPhysicalMaterial({color:0x7a3a17,roughness:0.42,normalMap:leatherN,normalScale:new THREE.Vector2(.4,.4),clearcoat:0.5,clearcoatRoughness:0.35});
M.sole=new THREE.MeshStandardMaterial({color:0xd09a62,roughness:0.75});M.heel=new THREE.MeshStandardMaterial({color:0x5a2a12,roughness:0.7});
M.hair=new THREE.MeshStandardMaterial({color:0x3d1f0e,roughness:0.6,normalMap:hairN,normalScale:new THREE.Vector2(1,1)});
M.mouth=new THREE.MeshStandardMaterial({color:0x5c0d10,roughness:0.5});
M.tongue=new THREE.MeshPhysicalMaterial({color:0xe2525a,roughness:0.35,clearcoat:0.4});
M.teeth=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.3});
M.white=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:0.55,sheen:0.5,sheenColor:new THREE.Color(0xffffff)});
M.stitch=new THREE.MeshStandardMaterial({color:0xf2b84b,roughness:0.7});
M.stitchR=new THREE.MeshStandardMaterial({color:0xa50f0c,roughness:0.8});
var BASE={};for(var k in M)BASE[k]={color:M[k].color.getHex()};
// ================= MARIO MODEL =================
var PARTS=[]; // meshes for raycast
function mesh(g,m,part,parent){var o=new THREE.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;if(part){o.userData.part=part;PARTS.push(o)}if(parent)parent.add(o);return o}
function ell(rx,ry,rz,m,part,parent,ws,hs){var o=mesh(new THREE.SphereGeometry(1,SEG(ws||48),SEG(hs||32)),m,part,parent);o.scale.set(rx,ry,rz);return o}
function smoothPts(arr,n){var v=arr.map(function(p){return new THREE.Vector3(p[0],p[1],0)});var c=new THREE.CatmullRomCurve3(v,false,'centripetal');return c.getPoints(n).map(function(p){return new THREE.Vector2(Math.max(0.0001,p.x),p.y)})}
function lathe(prof,m,part,parent,segs,ps,pl){var g=new THREE.LatheGeometry(smoothPts(prof,SEG(48)),SEG(segs||64),ps||0,pl||TAU);g.computeVertexNormals();return mesh(g,m,part,parent)}
function J(name,parent,x,y,z){var g=new THREE.Group();g.name=name;g.position.set(x||0,y||0,z||0);parent.add(g);JOINTS[name]=g;return g}
function sculpt(g,fn){var p=g.attributes.position,v=new THREE.Vector3();for(var i=0;i<p.count;i++){v.fromBufferAttribute(p,i);fn(v);p.setXYZ(i,v.x,v.y,v.z)}g.computeVertexNormals();return g}
function gauss(d,c,w){var dx=d.x-c[0],dy=d.y-c[1],dz=d.z-c[2];return Math.exp(-(dx*dx+dy*dy+dz*dz)/(w*w))}
// stitches along a curve: tiny instanced dashes
function stitches(curve,count,mat,parent,size){var g=new THREE.BoxGeometry(size||0.012,0.0035,0.0035),im=new THREE.InstancedMesh(g,mat,count),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),X=new THREE.Vector3(1,0,0),s=new THREE.Vector3(1,1,1);
 for(var i=0;i<count;i++){var t=(i+0.5)/count,p=curve.getPointAt(t),tn=curve.getTangentAt(t);q.setFromUnitVectors(X,tn);m4.compose(p,q,s);im.setMatrixAt(i,m4)}parent.add(im);return im}

var JOINTS={};
var mario=new THREE.Group();scene.add(mario);
var root=J('root',mario,0,0,0);
var hips=J('hips',root,0,0.6,0);
var spine=J('spine',hips,0,0.02,0);
// ---- torso (shirt) ----
var torsoProf=[[0.001,-0.12],[0.17,-0.1],[0.255,0.0],[0.30,0.14],[0.305,0.25],[0.285,0.34],[0.24,0.42],[0.16,0.47],[0.07,0.5],[0.001,0.505]];
var torso=lathe([[0.001,0.16]].concat(torsoProf.filter(function(p){return p[1]>=0.17})),M.red,'belly',spine);torso.scale.set(0.975,1,0.9);
function torsoR(y){for(var i=0;i<torsoProf.length-1;i++){var a=torsoProf[i],b=torsoProf[i+1];if(y>=a[1]&&y<=b[1]){return lerp(a[0],b[0],(y-a[1])/(b[1]-a[1]))}}return 0.1}
var PT=0.3,BT=0.425;
var pp=[[0.001,-0.165],[0.13,-0.155]];for(var y=-0.12;y<=PT+0.001;y+=0.03)pp.push([torsoR(y)+0.008,y]);pp.push([torsoR(PT)+0.002,PT+0.004]);
var pants=lathe(pp,M.denim,'belly',spine);pants.scale.set(1,1,0.92);
var bibProf=[];for(var y=PT-0.02;y<=BT+0.001;y+=0.02)bibProf.push([torsoR(y)+0.01,y]);bibProf.push([torsoR(BT)+0.002,BT+0.004]);
var bib=lathe(bibProf,M.denim,'belly',spine,48,-0.62,1.24);bib.scale.set(1,1,0.92);
function ringCurve(r,y,a0,a1,zs,n){var pts=[];for(var i=0;i<=n;i++){var a=lerp(a0,a1,i/n);pts.push(new THREE.Vector3(Math.sin(a)*r,y,Math.cos(a)*r*zs))}return new THREE.CatmullRomCurve3(pts)}
stitches(ringCurve(torsoR(PT-0.015)+0.012,PT-0.015,0.62,TAU-0.62,0.92,64),130,M.stitch,spine);
// bib edges stitching
(function(){var top=[],l=[],r=[];for(var i=0;i<=20;i++){var a=lerp(-0.56,0.56,i/20);top.push(new THREE.Vector3(Math.sin(a)*(torsoR(BT-0.015)+0.014),BT-0.015,Math.cos(a)*(torsoR(BT-0.015)+0.014)*0.92))}
 for(i=0;i<=10;i++){var yy=lerp(PT-0.01,BT-0.015,i/10),rr=torsoR(yy)+0.014;l.push(new THREE.Vector3(Math.sin(-0.56)*rr,yy,Math.cos(-0.56)*rr*0.92));r.push(new THREE.Vector3(Math.sin(0.56)*rr,yy,Math.cos(0.56)*rr*0.92))}
 stitches(new THREE.CatmullRomCurve3(top),46,M.stitch,spine);stitches(new THREE.CatmullRomCurve3(l),20,M.stitch,spine);stitches(new THREE.CatmullRomCurve3(r),20,M.stitch,spine);
 // bib pocket (U-shape)
 var pk=[];for(i=0;i<=24;i++){var t=i/24,a,yy2;if(t<0.3){a=-0.22;yy2=lerp(0.40,0.33,t/0.3)}else if(t<0.7){a=lerp(-0.22,0.22,(t-0.3)/0.4);yy2=0.33-Math.sin((t-0.3)/0.4*Math.PI)*0.012}else{a=0.22;yy2=lerp(0.33,0.40,(t-0.7)/0.3)}var rr2=torsoR(yy2)+0.014;pk.push(new THREE.Vector3(Math.sin(a)*rr2,yy2,Math.cos(a)*rr2*0.92))}
 stitches(new THREE.CatmullRomCurve3(pk),48,M.stitch,spine);})();
// straps
var straps=[];[-1,1].forEach(function(s){var a=0.47*s,yy=BT-0.01,rr=torsoR(yy)+0.012;
 var pts=[new THREE.Vector3(Math.sin(a)*rr,yy,Math.cos(a)*rr*0.92),new THREE.Vector3(s*0.15,0.48,0.13),new THREE.Vector3(s*0.15,0.525,0.0),new THREE.Vector3(s*0.14,0.47,-0.16),new THREE.Vector3(s*0.1,0.38,-0.25),new THREE.Vector3(s*0.07,0.29,-0.29)];
 var c=new THREE.CatmullRomCurve3(pts);var g=new THREE.TubeGeometry(c,SEG(40),0.032,SEG(10),false);
 // flatten tube into strap: squash along local normal approx by scaling distance to centre
 var p=g.attributes.position,v=new THREE.Vector3();for(var i=0;i<p.count;i++){v.fromBufferAttribute(p,i);var t=Math.floor(i/(SEG(10)+1))/SEG(40),cp=c.getPointAt(Math.min(1,t));var d=v.clone().sub(cp);var out=new THREE.Vector3(cp.x,0,cp.z).normalize();if(cp.y>0.44)out.set(0,1,0);var along=d.dot(out);d.addScaledVector(out,-along*0.7);p.setXYZ(i,cp.x+d.x,cp.y+d.y,cp.z+d.z)}g.computeVertexNormals();
 straps.push(mesh(g,M.denim,'belly',spine));
 // gold button
 var btn=lathe([[0.001,0.03],[0.03,0.027],[0.046,0.016],[0.054,0.0],[0.05,-0.005],[0.001,-0.005]],M.gold,'button',spine,32);
 btn.position.set(Math.sin(a)*(rr+0.012),yy-0.01,Math.cos(a)*(rr+0.012)*0.92);btn.lookAt(btn.position.x*3,btn.position.y+0.05,btn.position.z*3);btn.rotateX(Math.PI/2);
});
// back pockets
[-1,1].forEach(function(s){var pk=[];for(var i=0;i<=16;i++){var t=i/16,a,yy;if(t<.33){a=Math.PI+s*0.2;yy=lerp(0.15,0.03,t/.33)}else if(t<.66){a=Math.PI+s*lerp(0.2,0.55,(t-.33)/.33);yy=0.03-Math.sin((t-.33)/.33*Math.PI)*0.02}else{a=Math.PI+s*0.55;yy=lerp(0.03,0.15,(t-.66)/.34)}var rr=0.318;pk.push(new THREE.Vector3(Math.sin(a)*rr,yy,Math.cos(a)*rr*0.92))}stitches(new THREE.CatmullRomCurve3(pk),36,M.stitch,spine)});
// shirt collar
var collar=mesh(new THREE.TorusGeometry(0.085,0.03,10,SEG(32)),M.red,null,spine);collar.rotation.x=Math.PI/2;collar.position.y=0.49;

// ---- legs ----
function buildLeg(s){var th=J(s<0?'thR':'thL',hips,0.135*s,-0.05,0);
 lathe([[0.001,0.06],[0.10,0.05],[0.145,0.0],[0.15,-0.1],[0.14,-0.2],[0.122,-0.29],[0.112,-0.31],[0.001,-0.32]],M.denim,'leg',th,40);
 var kn=J(s<0?'knR':'knL',th,0,-0.3,0);
 ell(0.1,0.05,0.1,M.denim,'leg',kn,24,16);
 lathe([[0.001,0.03],[0.11,0.02],[0.112,-0.08],[0.12,-0.17],[0.135,-0.24],[0.142,-0.255],[0.001,-0.26]],M.denim,'leg',kn,40);
 var cuff=mesh(new THREE.TorusGeometry(0.135,0.014,8,SEG(40)),M.denim,'leg',kn);cuff.rotation.x=Math.PI/2;cuff.position.y=-0.245;
 stitches(ringCurve(0.141,-0.225,-Math.PI,Math.PI,1,40),70,M.stitch,kn);
 // outer seam stitches
 var sp=[];for(var i=0;i<=10;i++){var yy=lerp(0.0,-0.29,i/10);sp.push(new THREE.Vector3(s*(0.148-Math.abs(yy+0.08)*0.08),yy,0))}stitches(new THREE.CatmullRomCurve3(sp),30,M.stitch,th);
 var ft=J(s<0?'ftR':'ftL',kn,0,-0.27,0);
 var shoe=new THREE.SphereGeometry(1,SEG(48),SEG(32));sculpt(shoe,function(v){var f=v.z>0?1+v.z*0.25:1;v.x*=f;if(v.y<-0.2)v.y=-0.2-(-(v.y)-0.2)*0.4;if(v.z>0.2&&v.y>0)v.y*=1-(v.z-0.2)*0.35});
 var sh=mesh(shoe,M.shoe,'shoe',ft);sh.scale.set(0.13,0.11,0.215);sh.position.set(0,-0.02,0.075);
 var sole=new THREE.CylinderGeometry(1,1,1,SEG(40),1);var so=mesh(sole,M.sole,'shoe',ft);so.scale.set(0.14,0.03,0.225);so.position.set(0,-0.068,0.08);
 var heel=ell(0.115,0.035,0.08,M.heel,'shoe',ft,24,12);heel.position.set(0,-0.07,-0.06);
 // sole tread rings
 var tr=mesh(new THREE.TorusGeometry(1,0.06,6,SEG(40)),M.sole,null,ft);tr.rotation.x=Math.PI/2;tr.scale.set(0.13,0.215,0.4);tr.position.set(0,-0.082,0.08);

}
buildLeg(1);buildLeg(-1);

// ---- arms + gloves ----
var HANDS={};
function buildArm(s){var L=s>0?'L':'R';
 var sh=J('sh'+L,spine,0.255*s,0.365,0);
 ell(0.078,0.08,0.078,M.red,'arm',sh,24,16);
 lathe([[0.001,0.0],[0.08,-0.01],[0.078,-0.14],[0.07,-0.28],[0.066,-0.3],[0.001,-0.305]],M.red,'arm',sh,32);
 var el=J('el'+L,sh,0,-0.29,0);ell(0.068,0.068,0.068,M.red,'arm',el,20,14);
 lathe([[0.001,0.0],[0.066,-0.01],[0.064,-0.14],[0.062,-0.23],[0.001,-0.24]],M.red,'arm',el,32);
 var ha=J('ha'+L,el,0,-0.23,0);ha.scale.setScalar(1.35);
 // glove cuff: flared + rolled
 lathe([[0.058,0.025],[0.068,0.0],[0.085,-0.05],[0.092,-0.065]],M.glove,'hand',ha,40);
 var roll=mesh(new THREE.TorusGeometry(0.08,0.017,12,SEG(40)),M.glove,'hand',ha);roll.rotation.x=Math.PI/2;roll.position.y=-0.06;
 var roll2=mesh(new THREE.TorusGeometry(0.07,0.008,8,SEG(32)),M.gloveDk,null,ha);roll2.rotation.x=Math.PI/2;roll2.position.y=-0.035;
 var palm=new THREE.SphereGeometry(1,SEG(32),SEG(24));sculpt(palm,function(v){if(v.y<0)v.x*=1+(-v.y)*0.12});
 var pm=mesh(palm,M.glove,'hand',ha);pm.scale.set(0.072,0.085,0.058);pm.position.set(0,-0.135,0);
 var fingers=[],X=[-0.045,-0.015,0.015,0.045],len=[0.05,0.058,0.055,0.045];
 for(var i=0;i<4;i++){var k=new THREE.Group();k.position.set(X[i],-0.19,0.01);ha.add(k);
  ell(0.022,0.03,0.022,M.glove,'hand',k,14,10).position.y=-0.01;
  var s1=mesh(new THREE.CylinderGeometry(0.02,0.021,len[i],SEG(14)),M.glove,'hand',k);s1.position.y=-len[i]/2;
  var crease=mesh(new THREE.TorusGeometry(0.0205,0.0025,6,SEG(16)),M.gloveDk,null,k);crease.rotation.x=Math.PI/2;crease.position.y=-len[i]*0.55;
  var k2=new THREE.Group();k2.position.y=-len[i];k.add(k2);
  ell(0.0195,0.02,0.0195,M.glove,'hand',k2,12,10);
  var s2=mesh(new THREE.CylinderGeometry(0.0185,0.0195,len[i]*0.75,SEG(14)),M.glove,'hand',k2);s2.position.y=-len[i]*0.37;
  ell(0.0185,0.021,0.0185,M.glove,'hand',k2,12,10).position.y=-len[i]*0.75;
  fingers.push([k,k2])}
 var th=new THREE.Group();th.position.set(-0.055*s,-0.13,0.035);ha.add(th);th.rotation.set(0.3,0,0.6*s);
 ell(0.024,0.035,0.024,M.glove,'hand',th,14,10).position.y=-0.02;var t2=ell(0.021,0.03,0.021,M.glove,'hand',th,12,10);t2.position.y=-0.06;
 HANDS[L]={fingers:fingers,thumb:th,s:s};
}
buildArm(1);buildArm(-1);
function setCurl(L,c){var h=HANDS[L];h.fingers.forEach(function(f,i){f[0].rotation.x=-1.55*c;f[1].rotation.x=-1.7*c;f[0].rotation.z=(i-1.5)*0.05*(1-c)*h.s});h.thumb.rotation.x=0.3+c*0.9;h.thumb.rotation.z=(0.6-0.3*c)*h.s}
// ---- neck + head ----
var neck=J('neck',spine,0,0.5,0);ell(0.1,0.08,0.1,M.skin,null,neck,16,12).position.y=0.02;
var head=J('head',neck,0,0.05,0);
var HC=new THREE.Group();HC.position.set(0,0.27,0.0);HC.scale.setScalar(1.12);head.add(HC); // head centre
var face={};
(function(){
 var g=new THREE.SphereGeometry(1,SEG(96),SEG(72));
 sculpt(g,function(v){var d=v.clone();var r=1;
  r+=0.13*gauss(d,[0.55,-0.32,0.72],0.42)+0.13*gauss(d,[-0.55,-0.32,0.72],0.42); // cheeks
  r+=0.06*gauss(d,[0,-0.75,0.55],0.45); // chin
  r-=0.05*gauss(d,[0,0.2,1],0.35); // brow/eye socket flatten
  r+=0.05*gauss(d,[0,-0.2,-1],0.6); // back of skull
  r-=0.06*gauss(d,[0,-0.95,-0.2],0.5); // under jaw tuck
  v.multiplyScalar(r);v.x*=1.02;v.y*=0.94;v.z*=0.93;
 });
 face.skull=mesh(g,M.skin,'head',HC);face.skull.scale.setScalar(0.31);
 // nose
 var ng=new THREE.SphereGeometry(1,SEG(48),SEG(36));sculpt(ng,function(v){if(v.y<0)v.x*=1+(-v.y)*0.12;v.z*=1+0.08*v.y});
 face.nose=mesh(ng,M.nose,'nose',HC);face.nose.scale.set(0.12,0.1,0.105);face.nose.position.set(0,-0.055,0.29);
 // ears
 [-1,1].forEach(function(s){var eg=new THREE.SphereGeometry(1,SEG(28),SEG(20));var e=mesh(eg,M.skin,'head',HC);e.scale.set(0.035,0.085,0.06);e.position.set(0.318*s,-0.01,-0.03);e.rotation.set(0,-0.5*s,0.12*s);
  var fold=mesh(new THREE.TorusGeometry(0.045,0.012,8,SEG(24),Math.PI*1.4),M.skin,null,HC);fold.position.set(0.335*s,-0.01,-0.02);fold.rotation.set(0,Math.PI/2*s-0.5*s,Math.PI*0.3);fold.scale.set(0.8,1.3,1);
  var inner=ell(0.012,0.05,0.03,M.nose,null,HC,12,10);inner.position.set(0.34*s,-0.012,-0.02);inner.rotation.y=-0.5*s;
  // sideburns
  var sb=new THREE.SphereGeometry(1,SEG(24),SEG(16));var b=mesh(sb,M.hair,'head',HC);b.scale.set(0.03,0.075,0.045);b.position.set(0.29*s,0.03,-0.0);b.rotation.set(0.15,0.25*s,0.05*s);
 });
 // hair tufts at back/sides under cap
 var hairG=new THREE.SphereGeometry(1,SEG(16),SEG(12));sculpt(hairG,function(v){if(v.y<0){v.x*=1+v.y*0.6;v.z*=1+v.y*0.6}});
 for(var i=0;i<11;i++){var a=lerp(-1.55,1.55,i/10)+Math.PI;var h=mesh(hairG,M.hair,'head',HC);h.scale.set(0.055,0.07,0.04);h.position.set(Math.sin(a)*0.285,0.02-Math.abs(Math.cos(a))*0.0+((i%2)*0.015),Math.cos(a)*0.27);h.lookAt(HC.position.x+Math.sin(a)*2,0,Math.cos(a)*2);h.rotateX(0.5)}
 // eyes
 var ec=cv(1024,512),ex=ec.getContext('2d');var gr=ex.createLinearGradient(0,0,0,512);gr.addColorStop(0,'#d9dde8');gr.addColorStop(.35,'#ffffff');gr.addColorStop(1,'#eef0f6');ex.fillStyle=gr;ex.fillRect(0,0,1024,512);
 function iris(cx){var cy=256;var ig=ex.createRadialGradient(cx,cy-10,4,cx,cy,100);ig.addColorStop(0,'#7fd0ff');ig.addColorStop(.45,'#2f8ef0');ig.addColorStop(.8,'#1555c4');ig.addColorStop(1,'#0b2c78');
  ex.save();ex.translate(cx,cy);ex.scale(0.72,1);ex.beginPath();ex.arc(0,0,100,0,TAU);ex.fillStyle=ig;ex.fill();ex.lineWidth=7;ex.strokeStyle='#0a215c';ex.stroke();
  for(var k=0;k<40;k++){ex.strokeStyle='rgba(180,230,255,.18)';ex.lineWidth=2;var a=k/40*TAU;ex.beginPath();ex.moveTo(Math.cos(a)*40,Math.sin(a)*40);ex.lineTo(Math.cos(a)*92,Math.sin(a)*92);ex.stroke()}
  ex.beginPath();ex.arc(0,0,48,0,TAU);ex.fillStyle='#050a1a';ex.fill();ex.restore();
  ex.fillStyle='#fff';ex.beginPath();ex.ellipse(cx+16,cy-46,14,20,0.3,0,TAU);ex.fill();ex.globalAlpha=.8;ex.beginPath();ex.ellipse(cx-20,cy+40,7,9,0,0,TAU);ex.fill();ex.globalAlpha=1}
 iris(256);
 var eyeTex=tex(ec,null,true);eyeTex.wrapS=THREE.RepeatWrapping;eyeTex.wrapT=THREE.ClampToEdgeWrapping;
 face.eyes=[];
 [-1,1].forEach(function(s){var eg=new THREE.Group();eg.position.set(0.068*s,0.05,0.243);eg.scale.setScalar(1.15);eg.rotation.y=0.18*s;HC.add(eg);
  var et=eyeTex.clone();et.needsUpdate=true;
  var em=new THREE.MeshPhysicalMaterial({map:et,roughness:0.12,clearcoat:1,clearcoatRoughness:0.05,emissive:0xffffff,emissiveMap:et,emissiveIntensity:0.12});
  var ball=mesh(new THREE.SphereGeometry(1,SEG(48),SEG(32)),em,'eye',eg);ball.scale.set(0.062,0.098,0.052);ball.castShadow=false;
  var lidG=new THREE.SphereGeometry(1.1,SEG(32),SEG(16),0,TAU,0,Math.PI/2);
  var lidP=new THREE.Group();lidP.scale.set(0.062,0.098,0.052);eg.add(lidP);
  var lid=mesh(lidG,M.skin,'eye',lidP);lid.castShadow=false;
  var lowP=new THREE.Group();lowP.scale.set(0.062,0.098,0.052);eg.add(lowP);var low=mesh(lidG,M.skin,'eye',lowP);low.rotation.x=Math.PI;low.castShadow=false;
  // lash line
  var lash=mesh(new THREE.TorusGeometry(1.1,0.05,6,SEG(32),Math.PI),M.hair,null,lidP);lash.castShadow=false;
  // brow
  var bc=new THREE.CatmullRomCurve3([new THREE.Vector3(-0.055*s,-0.01,0),new THREE.Vector3(-0.01*s,0.02,0.01),new THREE.Vector3(0.04*s,0.025,0),new THREE.Vector3(0.075*s,0.0,-0.02)]);
  var brow=new THREE.Group();brow.position.set(0.078*s,0.175,0.258);HC.add(brow);
  var bg=new THREE.TubeGeometry(bc,SEG(24),0.03,SEG(10),false);var bm=mesh(bg,M.hair,'head',brow);bm.scale.set(1.1,0.85,0.7);
  [-0.055,0.075].forEach(function(xx){ell(0.022,0.018,0.016,M.hair,null,brow,10,8).position.set(xx*s,xx<0?-0.01:0,xx<0?0:-0.02)});
  face.eyes.push({g:eg,tex:et,lid:lid,low:low,lash:lash,brow:brow,s:s});
 });
 // mouth
 face.mouth=new THREE.Group();face.mouth.position.set(0,-0.175,0.228);HC.add(face.mouth);
 var mg=new THREE.SphereGeometry(1,SEG(32),SEG(20),0,TAU,Math.PI/2,Math.PI/2);var mm=mesh(mg,M.mouth,'mouth',face.mouth);mm.scale.set(0.11,0.09,0.055);mm.rotation.x=0;
 var tg=ell(0.055,0.025,0.035,M.tongue,'mouth',face.mouth,20,12);tg.position.set(0,-0.055,0.025);
 var teeth=mesh(new THREE.BoxGeometry(0.11,0.016,0.02),M.teeth,null,face.mouth);teeth.position.set(0,-0.006,0.03);
 var lip=mesh(new THREE.TorusGeometry(1,0.08,8,SEG(32),Math.PI),M.nose,'mouth',face.mouth);lip.scale.set(0.09,0.075,0.6);lip.rotation.z=Math.PI;lip.position.z=0.02;
 face.mouthIn=mm;face.tongue=tg;face.teeth=teeth;face.lip=lip;
 // moustache: thick tufts sweeping out & up
 face.stache=new THREE.Group();face.stache.position.set(0,-0.13,0.262);face.stache.scale.setScalar(1.3);HC.add(face.stache);
 var tuftG=new THREE.SphereGeometry(1,SEG(28),SEG(18));sculpt(tuftG,function(v){v.y+=v.x*v.x*0.25;if(v.x>0.3)v.y*=1-(v.x-0.3)*0.5});
 [-1,1].forEach(function(s){var L=[[0.035,0.0,0.035,0.06,0.048,0.045,0.25],[0.085,-0.005,0.02,0.055,0.046,0.042,0.05],[0.13,0.012,-0.01,0.05,0.04,0.038,-0.25],[0.165,0.04,-0.04,0.04,0.032,0.03,-0.6],[0.06,-0.04,0.02,0.05,0.032,0.035,0.15],[0.11,-0.035,0.0,0.045,0.03,0.032,-0.1]];
  L.forEach(function(t){var m=mesh(tuftG,M.hair,'stache',face.stache);m.position.set(t[0]*s,t[1],t[2]);m.scale.set(t[3]*1.2,t[4]*1.2,t[5]*1.15);m.rotation.set(0.1,0.35*s,t[6]*s)});
  // little strand tips
  for(var i=0;i<5;i++){var c=mesh(new THREE.ConeGeometry(0.012,0.05,6),M.hair,null,face.stache);c.position.set((0.06+i*0.028)*s,-0.06+i*0.008,0.0-i*0.006);c.rotation.z=Math.PI+0.3*s-i*0.12*s}
 });
 // cap
 face.cap=new THREE.Group();face.cap.position.set(0,0.075,-0.01);HC.add(face.cap);
 var capInner=new THREE.Group();capInner.rotation.x=-0.38;capInner.scale.setScalar(1.07);face.cap.add(capInner);
 var CL=1.56,W=2048,H=1024,cc=cv(W,H),cx=cc.getContext('2d'),bc2=cv(W,H),bx=bc2.getContext('2d');
 cx.fillStyle='#e01b18';cx.fillRect(0,0,W,H);bx.fillStyle='#808080';bx.fillRect(0,0,W,H);
 // fabric noise
 var r=rnd(21);for(var i2=0;i2<9000;i2++){cx.fillStyle=r()>.5?'rgba(255,90,80,.10)':'rgba(120,0,0,.10)';cx.fillRect(r()*W,r()*H,2,2)}
 // panel seams + stitches
 [0.25+1/6,0.25-1/6,0.25+1/3+0.0,0.25-1/3,0.75].forEach(function(u){var x=((u%1)+1)%1*W;bx.strokeStyle='#3a3a3a';bx.lineWidth=10;bx.beginPath();bx.moveTo(x,0);bx.lineTo(x,H);bx.stroke();
  cx.strokeStyle='rgba(90,0,0,.55)';cx.lineWidth=6;cx.beginPath();cx.moveTo(x,0);cx.lineTo(x,H);cx.stroke();
  cx.strokeStyle='#ff7a6e';cx.lineWidth=3;cx.setLineDash([14,10]);[-16,16].forEach(function(o){cx.beginPath();cx.moveTo(x+o,H*0.08);cx.lineTo(x+o,H);cx.stroke()});cx.setLineDash([])});
 // band stitch near edge
 cx.strokeStyle='#ff7a6e';cx.lineWidth=3;cx.setLineDash([14,10]);cx.beginPath();cx.moveTo(0,H*0.93);cx.lineTo(W,H*0.93);cx.stroke();cx.setLineDash([]);
 // emblem
 var th0=0.98,ey=th0/CL*H,ex0=W*0.25,ang=0.235,ry=ang/CL*H,rx=ang/Math.sin(th0)/TAU*W;
 function emb(c,fillC,fillM,edge){c.save();c.translate(ex0,ey);c.scale(rx/100,ry/100);c.beginPath();c.arc(0,0,100,0,TAU);c.fillStyle=fillC;c.fill();if(edge){c.lineWidth=7;c.strokeStyle=edge;c.stroke()}
  c.fillStyle=fillM;c.beginPath();c.moveTo(-58,55);c.lineTo(-48,-58);c.lineTo(-24,-58);c.lineTo(0,-8);c.lineTo(24,-58);c.lineTo(48,-58);c.lineTo(58,55);c.lineTo(34,55);c.lineTo(28,-12);c.lineTo(6,30);c.lineTo(-6,30);c.lineTo(-28,-12);c.lineTo(-34,55);c.closePath();c.fill();c.restore()}
 emb(cx,'#ffffff','#e01b18','#d8d8d8');emb(bx,'#d0d0d0','#e8e8e8',null);
 var capMap=tex(cc,null,true);capMap.wrapS=THREE.RepeatWrapping;var capBump=tex(toNormal(bc2,3.5));capBump.wrapS=THREE.RepeatWrapping;
 M.cap=new THREE.MeshPhysicalMaterial({map:capMap,normalMap:capBump,normalScale:new THREE.Vector2(1,1),roughness:0.62,sheen:0.2,sheenColor:new THREE.Color(0xff3020),sheenRoughness:0.5});
 face.capMat=M.cap;face.capCanvas=cc;face.capCtx=cx;face.emb=emb;
 var dome=new THREE.SphereGeometry(0.338,SEG(96),SEG(48),0,TAU,0,CL);
 sculpt(dome,function(v){v.x*=1.05;v.z*=1.06;if(v.y>0.15)v.y=0.15+(v.y-0.15)*1.12; if(v.z>0)v.y+=0.02*(v.z/0.35)});
 var capm=mesh(dome,M.cap,'hat',capInner);capm.material.side=THREE.DoubleSide;
 var btn=ell(0.03,0.016,0.03,M.cap,'hat',capInner,16,10);btn.position.y=0.39;
 // brim
 var sh=new THREE.Shape(),N=40,a0=-1.3,a1=1.3;
 for(var i=0;i<=N;i++){var a=lerp(a0,a1,i/N),ca=Math.cos(a);var x=Math.sin(a)*0.355*1.05,z=Math.cos(a)*0.355*1.06+0.17*Math.pow(Math.max(0,ca),2.2);if(i==0)sh.moveTo(x,z);else sh.lineTo(x,z)}
 for(i=N;i>=0;i--){a=lerp(a0,a1,i/N);sh.lineTo(Math.sin(a)*0.33*1.05,Math.cos(a)*0.33*1.06)}
 var bg2=new THREE.ExtrudeGeometry(sh,{depth:0.012,bevelEnabled:true,bevelThickness:0.01,bevelSize:0.012,bevelSegments:4,curveSegments:24});
 bg2.rotateX(Math.PI/2);sculpt(bg2,function(v){var f=Math.max(0,v.z-0.3);v.y-=f*f*1.6+Math.abs(v.x)*Math.abs(v.x)*0.25*f*4});
 var brimMat=M.cap.clone();brimMat.map=null;brimMat.normalMap=cloth;brimMat.color.set(0xd81a17);M.brim=brimMat;
 var brim=mesh(bg2,brimMat,'hat',capInner);brim.position.y=0.015;
 // brim stitching rows
 [0.05,0.09,0.13].forEach(function(o){var pts=[];for(var i=0;i<=30;i++){var a=lerp(-1.15,1.15,i/30),ca=Math.cos(a);var z=Math.cos(a)*0.355*1.06+0.17*Math.pow(Math.max(0,ca),2.2)-0.03,x=Math.sin(a)*0.355*1.05*0.97;var t=(o-0.05)/0.1;var zi=lerp(z,Math.cos(a)*0.345*1.06,t*0.8+0.0),xi=lerp(x,Math.sin(a)*0.345,t*0.8);var f=Math.max(0,zi-0.3);pts.push(new THREE.Vector3(xi,0.016-f*f*1.6-xi*xi*0.25*f*4,zi))}
  if(o<0.12)stitches(new THREE.CatmullRomCurve3(pts),60,M.stitchR,capInner,0.014)});
 face.capInner=capInner;
})();
// ================= POSES & ACTIONS =================
var JN=['hips','spine','neck','head','shL','elL','haL','shR','elR','haR','thL','knL','ftL','thR','knR','ftR'];
function P(o){var p={};JN.forEach(function(n){p[n]=[0,0,0]});p.cL=0;p.cR=0;for(var k in o)p[k]=o[k];return p}
var REST=P({shL:[0.05,0,0.22],shR:[0.05,0,-0.22],elL:[-0.25,0,0],elR:[-0.25,0,0],haL:[0,-0.3,0],haR:[0,0.3,0],cL:0.35,cR:0.35,thL:[0,0,0.04],thR:[0,0,-0.04]});
var POSES={
 rest:REST,
 jump:P({spine:[-0.08,0.15,0.04],neck:[0,0,0],head:[0.06,-0.12,0.12],shL:[-0.15,0,2.55],elL:[-0.05,0,0.1],haL:[0,0,0],cL:1,shR:[-0.85,0.2,-0.55],elR:[-1.95,0,0],haR:[0,0.4,0],cR:1,thR:[-1.5,0,-0.15],knR:[1.15,0,0],ftR:[-1.0,0,0],thL:[0.25,0,0.08],knL:[0.55,0,0],ftL:[0.35,0,0]}),
 crouch:P({hips:[0,0,0],spine:[0.25,0,0],head:[-0.15,0,0],shL:[0.5,0,0.4],shR:[0.5,0,-0.4],elL:[-0.6,0,0],elR:[-0.6,0,0],thL:[-0.9,0,0.1],thR:[-0.9,0,-0.1],knL:[1.6,0,0],knR:[1.6,0,0],ftL:[-0.6,0,0],ftR:[-0.6,0,0],cL:1,cR:1}),
 tuck:P({spine:[0.4,0,0],head:[0.2,0,0],shL:[-1.2,0,0.3],shR:[-1.2,0,-0.3],elL:[-1.6,0,0],elR:[-1.6,0,0],thL:[-1.8,0,0.15],thR:[-1.8,0,-0.15],knL:[2.2,0,0],knR:[2.2,0,0],cL:1,cR:1}),
 wave:P({spine:[0,0,-0.05],head:[0,0.15,-0.1],shR:[-0.2,0,-2.5],elR:[-0.4,0,-0.3],cR:0,shL:[0.05,0,0.25],elL:[-0.3,0,0]}),
 starfish:P({shL:[0,0,1.6],shR:[0,0,-1.6],elL:[0,0,0],elR:[0,0,0],cL:0,cR:0,thL:[0,0,0.35],thR:[0,0,-0.35]}),
 punchL:P({spine:[0,-0.45,0],head:[0,0.35,0],shL:[-1.55,0,0.15],elL:[-0.05,0,0],cL:1,shR:[-0.6,0,-0.3],elR:[-2.1,0,0],cR:1,thL:[-0.3,0,0.1],knL:[0.3,0,0],thR:[0.25,0,-0.1]}),
 punchR:P({spine:[0,0.45,0],head:[0,-0.35,0],shR:[-1.55,0,-0.15],elR:[-0.05,0,0],cR:1,shL:[-0.6,0,0.3],elL:[-2.1,0,0],cL:1,thR:[-0.3,0,-0.1],knR:[0.3,0,0],thL:[0.25,0,0.1]}),
 upper:P({spine:[-0.25,0.2,0],head:[-0.3,0,0],shL:[-0.3,0,2.9],elL:[-0.1,0,0],cL:1,shR:[0.3,0,-0.4],elR:[-1.2,0,0],cR:1,thL:[-0.2,0,0.1],thR:[0.3,0,-0.1],knR:[0.6,0,0]}),
 pound:P({spine:[0.3,0,0],head:[0.1,0,0],shL:[0.2,0,1.2],shR:[0.2,0,-1.2],elL:[-0.4,0,0],elR:[-0.4,0,0],thL:[-1.5,0,0.3],thR:[-1.5,0,-0.3],knL:[2.0,0,0],knR:[2.0,0,0],cL:1,cR:1}),
 victory:P({spine:[-0.1,0,0],head:[-0.2,0,0],shL:[-0.1,0,2.8],elL:[-0.2,0,0],cL:0,shR:[-0.1,0,-1.4],elR:[-1.2,0,0],cR:1,thL:[-0.1,0,0.15],thR:[0,0,-0.15]})
};
var cur=P({});copyPose(REST,cur);
function copyPose(a,b){JN.forEach(function(n){b[n]=a[n].slice()});b.cL=a.cL;b.cR=a.cR}
function mix(a,b,t,out){out=out||P({});JN.forEach(function(n){out[n]=[lerp(a[n][0],b[n][0],t),lerp(a[n][1],b[n][1],t),lerp(a[n][2],b[n][2],t)]});out.cL=lerp(a.cL,b.cL,t);out.cR=lerp(a.cR,b.cR,t);return out}
function applyPose(p){JN.forEach(function(n){var j=JOINTS[n],r=p[n];j.rotation.set(r[0],r[1],r[2])});setCurl('L',p.cL);setCurl('R',p.cR)}
var ROOT={y:0,rx:0,ry:0,rz:0,sy:1};
// keyframed action: keys [[t,poseName or pose, rootObj]]
function seq(keys,dur,extra){return{dur:dur,keys:keys,extra:extra}}
function samplePose(a,t){var k=a.keys,i=0;while(i<k.length-1&&k[i+1][0]<=t)i++;var A=k[i],B=k[Math.min(i+1,k.length-1)];var pa=typeof A[1]=='string'?POSES[A[1]]:A[1],pb=typeof B[1]=='string'?POSES[B[1]]:B[1];var u=B[0]>A[0]?ss((t-A[0])/(B[0]-A[0])):1;return mix(pa,pb,u)}
var action=null,actT=0,actQueue=[];
var EXPR_OVERRIDE=null;
function arc(t,t0,t1,h){if(t<t0||t>t1)return 0;var u=(t-t0)/(t1-t0);return 4*h*u*(1-u)}
var ACTIONS={
 jump:function(){sfx.jump();setTimeout(function(){voice.yahoo()},120);say('Yahoo!');return seq([[0,'rest'],[0.12,'crouch'],[0.25,'jump'],[0.95,'jump'],[1.1,'crouch'],[1.35,'rest']],1.35,function(t){ROOT.y=arc(t,0.2,1.08,0.95);ROOT.sy=t<0.2?1-0.12*Math.sin(t/0.2*Math.PI):t>1.08&&t<1.3?1-0.1*Math.sin((t-1.08)/0.22*Math.PI):1;expression('happy')})},
 triple:function(){var tt=[0,0.85,1.75];return seq([[0,'rest'],[0.1,'crouch'],[0.2,'jump'],[0.65,'jump'],[0.8,'crouch'],[0.95,P({shL:[-0.4,0,2.6],shR:[-0.4,0,-2.6],cL:1,cR:1,thL:[-0.9,0,0],knL:[1,0,0],thR:[0.3,0,0]})],[1.55,'crouch'],[1.75,'crouch'],[1.9,'tuck'],[2.45,'tuck'],[2.7,'starfish'],[2.95,'crouch'],[3.25,'rest']],3.25,function(t,first){if(first){sfx.jump();voice.say('wa',1.0);setTimeout(function(){sfx.jump(1.2);voice.say('hoo',1.15)},850);setTimeout(function(){sfx.jump(1.45);voice.yahoo(1.25);say('Wahoo!')},1750)}
   ROOT.y=arc(t,0.15,0.78,0.7)+arc(t,0.95,1.6,0.95)+arc(t,1.8,2.85,1.5);ROOT.rx=t>1.85&&t<2.7?ss((t-1.85)/0.85)*TAU:0;expression('determined')})},
 backflip:function(){sfx.jump(0.8);setTimeout(function(){voice.say('hup',1.1)},100);return seq([[0,'rest'],[0.2,'crouch'],[0.35,'starfish'],[0.5,'tuck'],[1.05,'tuck'],[1.2,'starfish'],[1.3,'crouch'],[1.6,'rest']],1.6,function(t){ROOT.y=arc(t,0.3,1.3,1.4);ROOT.rx=t>0.35&&t<1.2?-ss((t-0.35)/0.85)*TAU:0;expression(t<0.35?'determined':'surprised')})},
 wave:function(){voice.say('hi',1.2);setTimeout(function(){voice.say('ya',1.05)},220);say("It's-a me!");return seq([[0,'rest'],[0.3,'wave'],[2.2,'wave'],[2.6,'rest']],2.6,function(t,f,p){if(t>0.3&&t<2.2){p.elR[2]=-0.3+Math.sin(t*14)*0.5;p.haR[2]=Math.sin(t*14+0.5)*0.3}ROOT.ry=Math.sin(t*2)*0.08;expression('happy')})},
 punch:function(){[0,330,660].forEach(function(d,i){setTimeout(function(){sfx.punch();voice.say(['ha','hu','haaa'][i],1+i*0.1)},d+90)});return seq([[0,'rest'],[0.1,'punchL'],[0.25,'rest'],[0.42,'punchR'],[0.58,'rest'],[0.72,'crouch'],[0.85,'upper'],[1.2,'upper'],[1.5,'rest']],1.5,function(t){ROOT.y=arc(t,0.8,1.35,0.55);ROOT.ry=t>0.8&&t<1.3?ss((t-0.8)/0.5)*TAU:0;expression('angry')})},
 dance:function(){music.dance();var D=4.2;return seq([[0,'rest'],[D,'rest']],D,function(t){var b=t*Math.PI*2*2.2;var p=P({});copyPose(REST,p);
   p.hips=[0,Math.sin(b/2)*0.35,Math.sin(b)*0.12];p.spine=[0,0,-Math.sin(b)*0.18];p.head=[0,Math.sin(b/2)*0.3,Math.sin(b)*0.15];
   var ph=Math.floor(t/1.05)%4;if(ph==0||ph==2){p.shL=[-0.2,0,1.2+Math.sin(b)*0.9];p.shR=[-0.2,0,-1.2+Math.sin(b)*0.9];p.elL=[-1,0,0];p.elR=[-1,0,0];p.cL=p.cR=0.2}else{p.shL=[-1.2+Math.sin(b)*0.6,0,0.3];p.shR=[-1.2-Math.sin(b)*0.6,0,-0.3];p.elL=[-0.8,0,0];p.elR=[-0.8,0,0];p.cL=p.cR=1}
   p.thL=[-Math.max(0,Math.sin(b))*0.7,0,0.06];p.knL=[Math.max(0,Math.sin(b))*1.1,0,0];p.thR=[-Math.max(0,-Math.sin(b))*0.7,0,-0.06];p.knR=[Math.max(0,-Math.sin(b))*1.1,0,0];
   ROOT.y=Math.abs(Math.sin(b))*0.06;ROOT.ry=ph==3?ss((t%1.05)/1.05)*TAU:Math.sin(b/4)*0.4;expression(ph==1?'wink':'happy');return p})},
 spin:function(){sfx.spin();voice.say('wheee',1.3);return seq([[0,'rest'],[0.3,'starfish'],[1.7,'starfish'],[2.0,'rest']],2.0,function(t){ROOT.ry=ss(t/1.9)*TAU*3;ROOT.y=arc(t,0.2,1.8,0.35);expression('happy')})},
 pound:function(){sfx.jump(0.9);setTimeout(function(){sfx.spin()},300);setTimeout(function(){sfx.thud();shake=0.35;dustRing()},1020);return seq([[0,'rest'],[0.15,'crouch'],[0.3,'jump'],[0.45,'tuck'],[0.75,'tuck'],[0.85,'pound'],[1.0,'pound'],[1.15,'crouch'],[1.6,'crouch'],[1.9,'rest']],1.9,function(t){ROOT.y=t<0.75?arc(t,0.15,1.35,1.3):t<0.88?arc(0.75,0.15,1.35,1.3):Math.max(0,arc(0.75,0.15,1.35,1.3)*(1-(t-0.88)/0.13));ROOT.rx=t>0.4&&t<0.78?ss((t-0.4)/0.38)*TAU:0;expression(t<1?'determined':'surprised')})},
 victory:function(){music.fanfare();voice.yahoo(1.1);say('Wahoo!');return seq([[0,'rest'],[0.25,'crouch'],[0.5,'victory'],[2.4,'victory'],[2.8,'rest']],2.8,function(t){ROOT.y=arc(t,0.35,1.0,0.6);ROOT.ry=t>0.35&&t<1.0?ss((t-0.35)/0.65)*TAU:0;expression('happy')})}
};
function play(name){if(mode==='pose')return;action=ACTIONS[name]();action.name=name;actT=0;action.first=true}
// ---- facial expressions ----
var EXPR={happy:{brow:0.0,browR:0.1,lid:0.05,mouth:1,wide:1,smile:1},determined:{brow:-0.025,browR:-0.35,lid:0.3,mouth:0.5,wide:1.05,smile:0.6},surprised:{brow:0.035,browR:0.3,lid:-0.15,mouth:1.5,wide:0.7,smile:0.2},angry:{brow:-0.035,browR:-0.55,lid:0.38,mouth:0.4,wide:1.1,smile:0},sleepy:{brow:-0.01,browR:0.15,lid:0.7,mouth:0.25,wide:0.8,smile:0.3},wink:{brow:0.01,browR:0.2,lid:0.05,mouth:1.1,wide:1.05,smile:1,wink:1},laugh:{brow:0.03,browR:0.25,lid:0.8,mouth:1.6,wide:1.1,smile:1},sad:{brow:0.02,browR:0.55,lid:0.35,mouth:0.3,wide:0.75,smile:-0.6}};
var exprName='happy',exprHold=0,baseExpr='happy',fx={brow:0,browR:0.1,lid:0.05,mouth:1,wide:1,smile:1,wink:0};
function expression(n,hold){exprName=n;if(hold)exprHold=hold}
var blinkT=2,blinkV=0,look=new THREE.Vector2(0,0),lookTarget=new THREE.Vector2(0,0);
function updateFace(dt){var e=EXPR[exprName]||EXPR.happy;for(var k in fx){var tv=e[k]||0;fx[k]=lerp(fx[k],tv,1-Math.exp(-dt*12))}
 if(exprHold>0){exprHold-=dt;if(exprHold<=0)exprName=baseExpr}else if(!action)exprName=baseExpr;
 blinkT-=dt;if(blinkT<0){blinkV=1;blinkT=1.8+Math.random()*3.5}blinkV=Math.max(0,blinkV-dt*7);var bl=blinkV>0?Math.sin(blinkV*Math.PI):0;
 look.lerp(lookTarget,1-Math.exp(-dt*10));
 face.eyes.forEach(function(E,i){var lidv=clamp(fx.lid+bl*(1-fx.lid)+(fx.wink&&i==0?fx.wink*(1-fx.lid):0),-0.2,1);E.lid.rotation.x=-0.95+lidv*2.4;E.lash.rotation.x=E.lid.rotation.x;E.low.rotation.x=Math.PI+0.95-(fx.smile>0.5?0.3:0);
  E.brow.position.y=0.175+fx.brow;E.brow.rotation.z=fx.browR*E.s*-1;E.tex.offset.set(-look.x*0.075,look.y*0.06)});
 face.mouth.scale.set(0.85*fx.wide,0.45+0.5*fx.mouth,1);face.mouth.position.y=-0.175-0.012*fx.mouth;
}
// ---- outfits ----
var tail=null,ears=null,hardhat=null;
function setOutfit(n){var C={classic:{cap:0xe01b18,shirt:0xe11a17,denim:0xffffff,glove:0xf6f5ef,shoe:0x7a3a17,emb:['#ffffff','#e01b18'],hair:0x2a160c},
 fire:{cap:0xf4f1ea,shirt:0xf4f1ea,denim:0xff4a3a,glove:0xf6f5ef,shoe:0x7a3a17,emb:['#e01b18','#ffffff'],hair:0x2a160c},
 builder:{cap:0xf3c21b,shirt:0xe11a17,denim:0xffffff,glove:0xf6f5ef,shoe:0x5a3a1c,emb:['#ffffff','#e01b18'],hair:0x2a160c},
 tanooki:{cap:0xb8742c,shirt:0xb8742c,denim:0xffcf8a,glove:0xf6f5ef,shoe:0x6a3313,emb:['#ffffff','#e01b18'],hair:0x2a160c},
 wario:{cap:0xf5d21c,shirt:0xf5d21c,denim:0xb07aff,glove:0xf6f5ef,shoe:0x2f8a2a,emb:['#ffffff','#2a62d0'],hair:0x2a160c}}[n];
 M.red.color.copy(lin(C.shirt));M.denim.color.copy(lin(C.denim));M.glove.color.copy(lin(C.glove));M.shoe.color.copy(lin(C.shoe));M.brim.color.copy(lin(C.cap));
 var c=face.capCtx,W=2048,H=1024;c.fillStyle='#'+new THREE.Color(C.cap).getHexString();c.fillRect(0,0,W,H);var r=rnd(21);for(var i=0;i<9000;i++){c.fillStyle=r()>.5?'rgba(255,255,255,.07)':'rgba(0,0,0,.08)';c.fillRect(r()*W,r()*H,2,2)}
 [0.25+1/6,0.25-1/6,0.25+1/3,(0.25-1/3+1)%1,0.75].forEach(function(u){var x=u*W;c.strokeStyle='rgba(0,0,0,.3)';c.lineWidth=6;c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=3;c.setLineDash([14,10]);[-16,16].forEach(function(o){c.beginPath();c.moveTo(x+o,H*.08);c.lineTo(x+o,H);c.stroke()});c.setLineDash([])});
 if(n==='wario'){face.capCtx.save();face.emb(c,C.emb[0],'rgba(0,0,0,0)','#d8d8d8');c.restore();c.save();var th0=0.98,ey=th0/1.56*H;c.translate(W*.25,ey);c.scale(1.05,1.6);c.fillStyle=C.emb[1];c.font='900 150px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText('W',0,6);c.restore()}else face.emb(c,C.emb[0],C.emb[1],'#d8d8d8');
 M.cap.map.needsUpdate=true;
 face.capInner.visible=n!=='builder';hardhat.visible=n==='builder';
 tail.visible=ears.visible=n==='tanooki';
 sparkles.visible=n==='fire';
 outfit=n;
}
var outfit='classic';
// hard hat
hardhat=new THREE.Group();face.cap.add(hardhat);(function(){var hm=new THREE.MeshPhysicalMaterial({color:0xf6c218,roughness:0.3,clearcoat:0.8});var d=mesh(new THREE.SphereGeometry(0.35,SEG(48),SEG(24),0,TAU,0,Math.PI/2),hm,'hat',hardhat);d.scale.set(1.04,1.05,1.08);
 var ridge=mesh(new THREE.BoxGeometry(0.06,0.06,0.7),hm,'hat',hardhat);ridge.position.y=0.32;ridge.scale.set(1,1,0.95);
 var b=mesh(new THREE.CylinderGeometry(0.44,0.44,0.025,SEG(48)),hm,'hat',hardhat);b.position.set(0,0.0,0.05);b.scale.set(1,1,1.05);hardhat.position.y=0.02;hardhat.rotation.x=-0.15;hardhat.visible=false})();
// tanooki tail & ears
tail=new THREE.Group();spine.add(tail);tail.position.set(0,0.0,-0.27);(function(){var tm=new THREE.MeshPhysicalMaterial({color:0xb8742c,roughness:0.9,sheen:1,sheenColor:new THREE.Color(0xffd9a0)});var dm=new THREE.MeshStandardMaterial({color:0x3b2412,roughness:0.9});
 for(var i=0;i<7;i++){var s=0.07+Math.sin(i/6*Math.PI)*0.05;var m=ell(s,s,s*1.2,i%2?dm:tm,'tail',tail,16,12);m.position.set(0,-0.02+i*0.05+Math.pow(i,2)*0.004,-0.05-i*0.06)}tail.visible=false})();
ears=new THREE.Group();face.cap.add(ears);[-1,1].forEach(function(s){var e=mesh(new THREE.ConeGeometry(0.08,0.17,SEG(16)),new THREE.MeshStandardMaterial({color:0xb8742c,roughness:0.9}),'hat',ears);e.position.set(0.2*s,0.33,-0.05);e.rotation.z=-0.4*s;e.scale.z=0.5});ears.visible=false;
// fire sparkles
var sparkles=new THREE.Group();scene.add(sparkles);sparkles.visible=false;var SP=[];for(var i=0;i<18;i++){var sm=new THREE.Mesh(new THREE.SphereGeometry(0.02,6,4),new THREE.MeshBasicMaterial({color:new THREE.Color(1,0.5,0.1).multiplyScalar(4),toneMapped:false}));sparkles.add(sm);SP.push({m:sm,a:Math.random()*TAU,h:Math.random()*1.7,s:0.5+Math.random()})}
// ================= AUDIO (all original, synthesized) =================
var AC=null,master=null,muted=false;
function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=0.5;master.connect(AC.destination)}catch(e){return null}}if(AC.state==='suspended')AC.resume();return muted?null:AC}
function tone(type,f0,f1,dur,vol,when,dest){var a=ac();if(!a)return;var t=a.currentTime+(when||0),o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);g.gain.setValueAtTime(vol||0.2,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);o.connect(g);g.connect(dest||master);o.start(t);o.stop(t+dur+0.02)}
function noise(dur,vol,fc,when){var a=ac();if(!a)return;var t=a.currentTime+(when||0),b=a.createBuffer(1,a.sampleRate*dur,a.sampleRate),d=b.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;var s=a.createBufferSource();s.buffer=b;var f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=fc||800;var g=a.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);s.connect(f);f.connect(g);g.connect(master);s.start(t)}
var sfx={jump:function(m){m=m||1;tone('square',260*m,820*m,0.22,0.09)},coin:function(){tone('square',988,0,0.08,0.09);tone('square',1319,0,0.45,0.09,0.08)},
 bump:function(){tone('triangle',180,90,0.12,0.3);noise(0.08,0.2,600)},punch:function(){noise(0.1,0.35,1500);tone('sine',140,60,0.12,0.3)},spin:function(){tone('square',300,1200,0.35,0.05);tone('square',600,2400,0.35,0.03,0.05)},
 thud:function(){tone('sine',120,35,0.45,0.6);noise(0.35,0.5,400)},pop:function(){tone('sine',500,1400,0.12,0.2)},honk:function(){tone('sawtooth',330,280,0.18,0.12);tone('square',332,270,0.18,0.06)},
 star:function(){[523,659,784,1047,1319,1568].forEach(function(f,i){tone('square',f,0,0.15,0.07,i*0.06)})},boing:function(){tone('sine',200,600,0.15,0.2);tone('sine',600,300,0.2,0.15,0.15)},
 shutter:function(){noise(0.06,0.4,3000);noise(0.05,0.3,2000,0.08)},block:function(){tone('square',392,0,0.06,0.08);tone('square',523,0,0.06,0.08,0.06)}};
// formant voice: sawtooth -> parallel bandpass formants
var VOW={a:[800,1250,2600],e:[500,1900,2600],i:[320,2300,3000],o:[500,900,2400],u:[350,800,2300],h:[600,1500,2500]};
function syl(when,dur,p0,p1,v0,v1,vol,breath){var a=ac();if(!a)return;var t=a.currentTime+when,o=a.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(p0,t);o.frequency.linearRampToValueAtTime(p1,t+dur);
 var vib=a.createOscillator(),vg=a.createGain();vib.frequency.value=6;vg.gain.value=p0*0.02;vib.connect(vg);vg.connect(o.frequency);
 var out=a.createGain();out.gain.setValueAtTime(0.0001,t);out.gain.exponentialRampToValueAtTime(vol,t+0.03);out.gain.setValueAtTime(vol,t+dur*0.7);out.gain.exponentialRampToValueAtTime(0.0001,t+dur);out.connect(master);
 [0,1,2].forEach(function(k){var f=a.createBiquadFilter();f.type='bandpass';f.Q.value=[7,9,11][k];f.frequency.setValueAtTime(VOW[v0][k],t);f.frequency.linearRampToValueAtTime(VOW[v1][k],t+dur*0.6);var g=a.createGain();g.gain.value=[1,0.6,0.25][k]*3;o.connect(f);f.connect(g);g.connect(out)});
 if(breath)noise(0.07,0.12,2500,when);o.start(t);vib.start(t);o.stop(t+dur+0.05);vib.stop(t+dur+0.05)}
var voice={yahoo:function(m){m=m||1;syl(0,0.2,330*m,370*m,'i','a',0.5);syl(0.21,0.42,430*m,560*m,'u','u',0.55,true)},
 say:function(w,m){m=m||1;var map={wa:['u','a',300,360],hoo:['u','u',400,480],hup:['a','u',360,330],hi:['a','i',320,380],ya:['i','a',360,330],ha:['a','a',330,300],hu:['u','u',340,300],haaa:['a','a',380,460],wheee:['i','i',420,560],ow:['a','u',420,300],mamma:['a','a',300,260],hehe:['e','e',420,400],oh:['o','o',300,240],yum:['i','u',300,260]};var s=map[w]||['a','a',300,300];var d=w.length>3?0.42:0.2;syl(0,d,s[2]*m,s[3]*m,s[0],s[1],0.5,w[0]=='h')},
 giggle:function(){for(var i=0;i<4;i++)syl(i*0.13,0.1,460-i*15,430-i*15,'e','e',0.4,true)},
 mamma:function(){syl(0,0.16,330,320,'a','a',0.45);syl(0.17,0.32,300,240,'a','a',0.45)}};
// music: original chiptune loops
var music={on:false,timer:null,step:0,
 loop:function(){var a=ac();if(!a||!music.on)return;
  // original melody in C major, 8th notes
  var mel=[72,0,76,79,0,77,76,74, 72,74,76,0,79,81,79,0, 77,0,81,84,0,83,81,79, 77,76,74,0,76,74,72,0];
  var bas=[48,55,52,55,53,57,55,59];
  var n=mel[music.step%32],t=0.16;if(n)tone('square',440*Math.pow(2,(n-69)/12),0,t*0.9,0.035);if(music.step%4==0)tone('triangle',440*Math.pow(2,(bas[(music.step/4|0)%8]-69)/12),0,t*3.6,0.12);if(music.step%2==1)noise(0.03,0.04,6000);
  music.step++;music.timer=setTimeout(music.loop,t*1000)},
 start:function(){if(music.on)return;music.on=true;music.step=0;music.loop()},stop:function(){music.on=false;clearTimeout(music.timer)},
 dance:function(){var seqn=[64,67,72,67,65,69,72,69,64,67,72,76,74,72,71,72];seqn.forEach(function(n,i){tone('square',440*Math.pow(2,(n-69)/12),0,0.2,0.05,i*0.26);if(i%2==0)tone('triangle',440*Math.pow(2,(n-24-69)/12),0,0.25,0.12,i*0.26)})},
 fanfare:function(){[60,64,67,72,0,67,72].forEach(function(n,i){if(n)tone('square',440*Math.pow(2,(n-69)/12),0,i==6?0.6:0.14,0.07,i*0.13)})}};
// ================= WORLD: Mushroom-Kingdom-style island =================
var world=new THREE.Group();scene.add(world);
var grassTex=(function(){var S=512,c=cv(S,S),x=c.getContext('2d'),r=rnd(4);for(var i=0;i<8;i++)for(var j=0;j<8;j++){x.fillStyle=(i+j)%2?'#5cc23a':'#6fd147';x.fillRect(i*64,j*64,64,64)}
 for(i=0;i<9000;i++){x.fillStyle=r()>.5?'rgba(255,255,160,.12)':'rgba(0,70,0,.14)';x.fillRect(r()*S,r()*S,2,3+r()*4)}var t=tex(c,[14,14],true);return t})();
var dirtTex=(function(){var S=256,c=cv(S,S),x=c.getContext('2d'),r=rnd(8);x.fillStyle='#c9803f';x.fillRect(0,0,S,S);for(var i=0;i<6;i++){x.fillStyle=i%2?'#b56d31':'#d99050';x.fillRect(0,i*44,S,22)}for(i=0;i<60;i++){x.fillStyle='rgba(90,45,15,.35)';x.beginPath();x.arc(r()*S,r()*S,3+r()*8,0,TAU);x.fill()}return tex(c,[10,1],true)})();
var ISL=13;
var islTop=new THREE.Mesh(new THREE.CylinderGeometry(ISL,ISL,0.4,SEG(96)),[new THREE.MeshStandardMaterial({map:dirtTex,roughness:0.9}),new THREE.MeshStandardMaterial({map:grassTex,roughness:0.85}),new THREE.MeshStandardMaterial({color:0x8a5a2b})]);islTop.position.y=-0.2;islTop.receiveShadow=true;world.add(islTop);
var under=new THREE.Mesh(new THREE.CylinderGeometry(ISL,ISL*0.6,4,SEG(64)),new THREE.MeshStandardMaterial({map:dirtTex,roughness:0.95}));under.position.y=-2.4;world.add(under);
var lip=new THREE.Mesh(new THREE.TorusGeometry(ISL,0.18,10,SEG(96)),new THREE.MeshStandardMaterial({color:0x48a92c,roughness:0.8}));lip.rotation.x=Math.PI/2;lip.position.y=-0.02;world.add(lip);
var water=new THREE.Mesh(new THREE.CircleGeometry(160,48),new THREE.MeshPhysicalMaterial({color:0x1386d0,roughness:0.15,metalness:0,clearcoat:0.6}));water.rotation.x=-Math.PI/2;water.position.y=-1.1;world.add(water);
// contact shadow (AO blob) under Mario
var blob=(function(){var c=cv(128,128),x=c.getContext('2d'),g=x.createRadialGradient(64,64,4,64,64,64);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,128,128);var m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=0.006;m.scale.set(0.9,0.9,1);scene.add(m);return m})();
var HILLS=[[-7,-5,3.2,1.3],[6,-7,2.6,1.0],[8,4,2.2,0.8]];
HILLS.forEach(function(h){var m=new THREE.Mesh(new THREE.SphereGeometry(1,SEG(48),SEG(24),0,TAU,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0x3fae2c,roughness:0.8}));m.scale.set(h[2],h[3],h[2]);m.position.set(h[0],0,h[1]);m.receiveShadow=m.castShadow=true;world.add(m);
 [[0.3,0.5],[-0.35,0.3]].forEach(function(e){var d=new THREE.Mesh(new THREE.SphereGeometry(0.09,10,8),new THREE.MeshBasicMaterial({color:0x111111}));d.scale.y=2;d.position.set(h[0]+e[0]*h[2]*0.5,h[3]*0.55,h[1]+h[2]*0.82);world.add(d)})});
function groundH(x,z){var y=0;HILLS.forEach(function(h){var dx=(x-h[0])/h[2],dz=(z-h[1])/h[2],d=dx*dx+dz*dz;if(d<1)y=Math.max(y,h[3]*Math.sqrt(1-d))});return y}
var PIPES=[[4,-2,0.6,1.0],[-4,4,0.6,1.6],[2,7,0.6,0.7]];var pipeMat=new THREE.MeshPhysicalMaterial({color:0x22b33a,roughness:0.25,clearcoat:0.7});
PIPES.forEach(function(p){var b=new THREE.Mesh(new THREE.CylinderGeometry(p[2]*0.85,p[2]*0.85,p[3],SEG(32)),pipeMat);b.position.set(p[0],p[3]/2,p[1]);var t=new THREE.Mesh(new THREE.CylinderGeometry(p[2],p[2],0.32,SEG(32)),pipeMat);t.position.set(p[0],p[3]-0.16,p[1]);var h=new THREE.Mesh(new THREE.CircleGeometry(p[2]*0.75,SEG(24)),new THREE.MeshBasicMaterial({color:0x061a08}));h.rotation.x=-Math.PI/2;h.position.set(p[0],p[3]+0.002,p[1]);[b,t].forEach(function(m){m.castShadow=m.receiveShadow=true;world.add(m)});world.add(h)});
// trees + flowers + clouds
var leafM=new THREE.MeshStandardMaterial({color:0x2f9a2a,roughness:0.8}),trunkM=new THREE.MeshStandardMaterial({color:0x8a5a2b,roughness:0.9});
[[-10,-1],[-9,6],[10,-3],[0,-10],[-3,-9],[9,8]].forEach(function(p,i){var t=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.2,1.2,8),trunkM);t.position.set(p[0],0.6,p[1]);var l=new THREE.Mesh(new THREE.SphereGeometry(0.9,SEG(20),SEG(14)),leafM);l.position.set(p[0],1.7,p[1]);l.scale.y=1.2;[t,l].forEach(function(m){m.castShadow=m.receiveShadow=true;world.add(m)})});
var flowerCols=[0xff4d4d,0xffe14d,0xffffff,0xff8ad8];var fr=rnd(33);for(var i=0;i<40;i++){var a=fr()*TAU,r=3+fr()*9;var f=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,5),new THREE.MeshStandardMaterial({color:flowerCols[i%4],roughness:0.5}));f.position.set(Math.cos(a)*r,0.08+groundH(Math.cos(a)*r,Math.sin(a)*r),Math.sin(a)*r);world.add(f)}
var clouds=new THREE.Group();scene.add(clouds);for(i=0;i<9;i++){var cg=new THREE.Group();for(var k=0;k<4;k++){var s=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,emissive:0xffffff,emissiveIntensity:0.25}));s.position.set(k*1.2-1.8,Math.sin(k*1.3)*0.4,0);s.scale.setScalar(1.1+Math.sin(k*2.1)*0.3);cg.add(s)}var a2=i/9*TAU;cg.position.set(Math.cos(a2)*45,12+Math.sin(i*3)*4,Math.sin(a2)*45);cg.lookAt(0,12,0);clouds.add(cg)}
// ? blocks
function qTex(used){var c=cv(128,128),x=c.getContext('2d');x.fillStyle=used?'#a0672a':'#f6b21a';x.fillRect(0,0,128,128);x.strokeStyle=used?'#5a3412':'#b5740c';x.lineWidth=8;x.strokeRect(4,4,120,120);x.fillStyle=used?'#5a3412':'#7a3e05';[[14,14],[114,14],[14,114],[114,114]].forEach(function(p){x.beginPath();x.arc(p[0],p[1],5,0,TAU);x.fill()});if(!used){x.font='900 84px Arial';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#7a3e05';x.fillText('?',68,70);x.fillStyle='#fff';x.fillText('?',64,66)}var t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t}
var QT=qTex(false),UT=qTex(true);
var BLOCKS=[];[[2,2.3,3],[3,2.3,3],[-2,2.3,-3],[-6,2.3,1],[6,2.3,3],[0,2.3,-6]].forEach(function(p,i){var m=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.6,0.6),new THREE.MeshStandardMaterial({map:QT,roughness:0.4,emissive:0x442200,emissiveIntensity:0.25}));m.position.set(p[0],p[1],p[2]);m.castShadow=m.receiveShadow=true;world.add(m);BLOCKS.push({m:m,y0:p[1],used:false,bt:0,star:i==5})});
// coins
var coinGeo=new THREE.CylinderGeometry(0.22,0.22,0.05,SEG(28));coinGeo.rotateX(Math.PI/2);var coinMat=new THREE.MeshStandardMaterial({color:0xffcc22,metalness:1,roughness:0.2,emissive:0x664400,emissiveIntensity:0.6});
var COINS=[];function addCoin(x,y,z,popped){var m=new THREE.Mesh(coinGeo,coinMat);m.position.set(x,y,z);m.castShadow=true;world.add(m);var c={m:m,got:false,pop:popped?0:-1,y0:y};COINS.push(c);return c}
for(i=0;i<10;i++){var ca=i/10*TAU;addCoin(Math.cos(ca)*5.5,0.6+groundH(Math.cos(ca)*5.5,Math.sin(ca)*5.5),Math.sin(ca)*5.5)}
[[-7,-5],[6,-7]].forEach(function(h){addCoin(h[0],groundH(h[0],h[1])+0.6,h[1])});PIPES.forEach(function(p){addCoin(p[0],p[3]+0.6,p[1])});
// stars
var starShape=new THREE.Shape();for(i=0;i<10;i++){var rr=i%2?0.15:0.34,aa=i/10*TAU+Math.PI/2;if(i==0)starShape.moveTo(Math.cos(aa)*rr,Math.sin(aa)*rr);else starShape.lineTo(Math.cos(aa)*rr,Math.sin(aa)*rr)}
var starGeo=new THREE.ExtrudeGeometry(starShape,{depth:0.1,bevelEnabled:true,bevelSize:0.04,bevelThickness:0.05,bevelSegments:3});starGeo.center();
var starMat=new THREE.MeshStandardMaterial({color:0xffe34a,metalness:0.3,roughness:0.25,emissive:0xffb000,emissiveIntensity:0.9});
var STARS=[];function addStar(x,y,z){var g=new THREE.Group();var m=new THREE.Mesh(starGeo,starMat);m.castShadow=true;g.add(m);[-1,1].forEach(function(s){var e=new THREE.Mesh(new THREE.SphereGeometry(0.025,8,6),new THREE.MeshBasicMaterial({color:0x111111}));e.scale.y=2.2;e.position.set(0.05*s,0.03,0.1);g.add(e)});g.position.set(x,y,z);world.add(g);STARS.push({m:g,got:false,y0:y});return g}
addStar(-4,PIPES[1][3]+0.7,4);addStar(-7,HILLS[0][3]+0.8,-5);var hiddenStar=null;
var coinCount=0,starCount=0;
// ================= CAMERA / INPUT =================
var orb={th:0.35,ph:1.42,d:4.6,tgt:new THREE.Vector3(0,0.95,0)},orbT={th:0.35,ph:1.42,d:4.6};
var mode='act',turntable=false,shake=0;
var ptrs={},pinch0=0,downInfo=null,lastMove=0,ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
canvas.addEventListener('pointerdown',function(e){canvas.setPointerCapture(e.pointerId);ptrs[e.pointerId]={x:e.clientX,y:e.clientY};var ks=Object.keys(ptrs);if(ks.length==2){var a=ptrs[ks[0]],b=ptrs[ks[1]];pinch0=Math.hypot(a.x-b.x,a.y-b.y)}downInfo={x:e.clientX,y:e.clientY,t:performance.now(),moved:false};ac();hideHint()});
canvas.addEventListener('pointermove',function(e){lookAtScreen(e.clientX,e.clientY);var p=ptrs[e.pointerId];if(!p)return;var ks=Object.keys(ptrs);
 if(ks.length==2){var a=ptrs[ks[0]],b=ptrs[ks[1]];p.x=e.clientX;p.y=e.clientY;var d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch0>0){orbT.d=clamp(orbT.d*pinch0/d,1.4,14);pinch0=d}if(downInfo)downInfo.moved=true;return}
 var dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;if(downInfo&&Math.hypot(e.clientX-downInfo.x,e.clientY-downInfo.y)>8)downInfo.moved=true;
 if(downInfo&&downInfo.moved){orbT.th-=dx*0.008;orbT.ph=clamp(orbT.ph-dy*0.006,0.35,1.75)}});
function up(e){var wasTap=downInfo&&!downInfo.moved&&performance.now()-downInfo.t<400&&Object.keys(ptrs).length==1;delete ptrs[e.pointerId];if(wasTap)tap(e.clientX,e.clientY);if(Object.keys(ptrs).length==0)downInfo=null;pinch0=0}
canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',function(e){delete ptrs[e.pointerId];downInfo=null});
canvas.addEventListener('wheel',function(e){e.preventDefault();orbT.d=clamp(orbT.d*(1+e.deltaY*0.001),1.4,14)},{passive:false});
var _hc=new THREE.Vector3();
function lookAtScreen(x,y){lastMove=performance.now();HC.getWorldPosition(_hc);_hc.project(camera);var nx=x/innerWidth*2-1,ny=-(y/innerHeight)*2+1;lookTarget.set(clamp((nx-_hc.x)*1.6,-1,1),clamp((ny-_hc.y)*1.6,-1,1))}
// ---- tap reactions ----
var R={cap:-1,nose:-1,stache:-1,belly:-1};
function tap(x,y){ndc.set(x/innerWidth*2-1,-(y/innerHeight)*2+1);ray.setFromCamera(ndc,camera);var hits=ray.intersectObjects(PARTS,false);if(!hits.length)return;var part=hits[0].object.userData.part;if(!hits[0].object.visible)return;
 if(mode==='play'||mode==='pose')return;
 switch(part){
 case 'hat':if(R.cap<0){R.cap=0;sfx.pop();voice.say('oh',1.2);expression('surprised',1.6);say('My hat!')}break;
 case 'nose':R.nose=0;sfx.honk();expression('wink',0.8);say('Honk!');break;
 case 'belly':case 'button':R.belly=0;voice.giggle();expression('laugh',1.4);say('Hehe! That tickles!');break;
 case 'eye':blinkV=1;voice.say('ow',1.1);expression('angry',1.2);say('Hey! My eye!');break;
 case 'stache':case 'mouth':R.stache=0;voice.mamma();expression('happy',1);say('Mamma mia!');break;
 case 'hand':play('wave');break;
 case 'shoe':case 'leg':sfx.boing();play('jump');break;
 case 'tail':sfx.spin();play('spin');break;
 default:voice.say('yum',1.1);expression('laugh',0.9);say('Ha-ha!');}
}
var bubbleT=null;function say(t){var b=$('bubble');b.textContent=t;b.classList.add('on');clearTimeout(bubbleT);bubbleT=setTimeout(function(){b.classList.remove('on')},1300)}
var hintHidden=false;function hideHint(){if(hintHidden)return;hintHidden=true;setTimeout(function(){$('hint').style.opacity=0},2500)}
function dustRing(){var g=new THREE.Group();g.position.copy(mario.position);scene.add(g);for(var i=0;i<14;i++){var m=new THREE.Mesh(new THREE.SphereGeometry(0.09,8,6),new THREE.MeshStandardMaterial({color:0xf4ead6,roughness:1,transparent:true}));var a=i/14*TAU;m.userData.v=new THREE.Vector3(Math.cos(a),0.3,Math.sin(a));m.position.y=0.08;g.add(m)}FX.push({g:g,t:0,dur:0.7,dust:true})}
var FX=[];
// ================= UI =================
var PANELS={act:[['Jump','jump'],['Triple jump','triple'],['Backflip','backflip'],['Wave','wave'],['Punch combo','punch'],['Dance','dance'],['Spin','spin'],['Ground pound','pound'],['Victory','victory']],
 face:[['😄 Happy','happy'],['😠 Determined','determined'],['😮 Surprised','surprised'],['😡 Angry','angry'],['😉 Wink','wink'],['😆 Laugh','laugh'],['😴 Sleepy','sleepy'],['😢 Sad','sad']],
 outfit:[['Classic','classic'],['🔥 Fire','fire'],['👷 Builder','builder'],['🦝 Tanooki','tanooki'],['💛 Wario-ish','wario']],
 pose:[['Reset','rest'],['Jump pose','jump'],['Wave','wave'],['Victory','victory'],['Starfish','starfish'],['Punch','punchR'],['Crouch','crouch']],
 play:[['🎵 Music','music'],['↺ Restart','restart']],photo:[]};
function buildPanel(t){var p=$('panel');p.innerHTML='';(PANELS[t]||[]).forEach(function(b){var el=document.createElement('button');el.textContent=b[0];if((t=='face'&&b[1]==baseExpr)||(t=='outfit'&&b[1]==outfit))el.className='on';el.onclick=function(){ac();panelClick(t,b[1],el)};p.appendChild(el)})}
function panelClick(t,v,el){if(t=='act')play(v);else if(t=='face'){baseExpr=v;expression(v);buildPanel('face');if(v=='laugh')voice.giggle();if(v=='surprised')voice.say('oh');}
 else if(t=='outfit'){setOutfit(v);buildPanel('outfit');sfx.star();say({classic:"It's-a me!",fire:'Fire power!',builder:"Let's-a build!",tanooki:'Tanooki!',wario:'Wa-ha-ha!'}[v])}
 else if(t=='pose'){copyPose(POSES[v],cur);applyPose(cur);syncSliders()}
 else if(t=='play'){if(v=='music'){music.on?music.stop():music.start();el.classList.toggle('on',music.on)}else restartPlay()}}
document.querySelectorAll('#tabs button').forEach(function(b){b.onclick=function(){ac();setMode(b.dataset.t)}});
function setMode(t){if(t==='photo'){document.body.classList.add('photo');return}
 var prev=mode;mode=t;document.querySelectorAll('#tabs button').forEach(function(b){b.classList.toggle('on',b.dataset.t==t)});buildPanel(t);
 $('posebox').style.display=t=='pose'?'block':'none';['joy','jumpb','poundb'].forEach(function(id){$(id).style.display=t=='play'?'block':'none'});$('hud').style.display=t=='play'?'flex':'none';
 if(t=='pose'){action=null;ROOT.y=ROOT.rx=ROOT.ry=ROOT.rz=0;syncSliders();$('hint').style.opacity=1;$('hint').textContent='Pick a body part, then drag the sliders. Use Photo to snap it!';hintHidden=false;hideHint()}
 if(t=='play'){action=null;orbT.d=7;orbT.ph=1.18;$('hint').style.opacity=1;$('hint').textContent='Move with the stick. Hit ? blocks from below, grab coins & find 3 stars!';hintHidden=false;hideHint();music.start();var mb=$('panel').firstChild;if(mb)mb.classList.add('on')}
 if(prev=='play'&&t!='play'){music.stop();mario.position.set(0,0,0);mario.rotation.y=0;orbT.d=4.6;orbT.ph=1.42}}
$('exitphoto').onclick=function(){document.body.classList.remove('photo')};
$('shutter').onclick=function(){sfx.shutter();renderFrame();try{var url=canvas.toDataURL('image/png');var a=document.createElement('a');a.href=url;a.download='mario-'+Date.now()+'.png';document.body.appendChild(a);a.click();a.remove()}catch(e){}var f=$('flash');f.style.opacity=1;setTimeout(function(){f.style.opacity=0},80)};
$('snd').onclick=function(){muted=!muted;this.textContent=muted?'🔇':'🔊';if(muted)music.stop()};
$('spinb').onclick=function(){turntable=!turntable;this.style.background=turntable?'#e3201b':''};
$('qb').textContent=Q=='high'?'HQ':Q=='medium'?'MQ':'LQ';$('qb').onclick=function(){var n={low:'medium',medium:'high',high:'low'}[Q];location.search='?q='+n};
// pose sliders
var jsel=$('jsel');[['head','Head'],['neck','Neck'],['spine','Body'],['hips','Hips'],['shL','Left shoulder'],['elL','Left elbow'],['haL','Left hand'],['shR','Right shoulder'],['elR','Right elbow'],['haR','Right hand'],['thL','Left hip'],['knL','Left knee'],['ftL','Left foot'],['thR','Right hip'],['knR','Right knee'],['ftR','Right foot']].forEach(function(o){var op=document.createElement('option');op.value=o[0];op.textContent=o[1];jsel.appendChild(op)});
jsel.value='shR';jsel.onchange=syncSliders;
function syncSliders(){var r=cur[jsel.value];$('sx').value=r[0];$('sy').value=r[1];$('sz').value=r[2]}
['sx','sy','sz'].forEach(function(id,i){$(id).oninput=function(){cur[jsel.value][i]=parseFloat(this.value);applyPose(cur)}});
// joystick
var joy={x:0,y:0,id:null};(function(){var J0=$('joy'),K=$('knob');function mv(e){var r=J0.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,l=Math.hypot(dx,dy),m=48;if(l>m){dx*=m/l;dy*=m/l}joy.x=dx/m;joy.y=dy/m;K.style.transform='translate('+dx+'px,'+dy+'px)'}
 J0.addEventListener('pointerdown',function(e){ac();joy.id=e.pointerId;J0.setPointerCapture(e.pointerId);mv(e)});J0.addEventListener('pointermove',function(e){if(e.pointerId===joy.id)mv(e)});
 function end(){joy.id=null;joy.x=joy.y=0;K.style.transform=''}J0.addEventListener('pointerup',end);J0.addEventListener('pointercancel',end)})();
var keys={};addEventListener('keydown',function(e){keys[e.code]=1;if(e.code=='Space'){wantJump=true;e.preventDefault()}});addEventListener('keyup',function(e){keys[e.code]=0});
var wantJump=false,wantPound=false;$('jumpb').addEventListener('pointerdown',function(e){e.preventDefault();ac();wantJump=true});$('poundb').addEventListener('pointerdown',function(e){e.preventDefault();ac();wantPound=true});
// ================= PLAY PHYSICS =================
var PL={vy:0,ground:true,jumps:0,lastLand:0,pounding:false,runPhase:0,speed:0,flip:0,jumpKind:0};
function restartPlay(){mario.position.set(0,0,0);PL.vy=0;coinCount=0;starCount=0;COINS.forEach(function(c){if(c.pop>=0){world.remove(c.m);c.got=true;return}c.got=false;c.m.visible=true});STARS.forEach(function(s){s.got=false;s.m.visible=!s.hidden});BLOCKS.forEach(function(b){b.used=false;b.m.material.map=QT});updHud()}
function updHud(){$('coinc').textContent='🪙 '+coinCount;$('starc').textContent='⭐ '+starCount+'/3'}
function supportAt(x,z,y){var h=groundH(x,z);PIPES.forEach(function(p){if(Math.hypot(x-p[0],z-p[1])<p[2]+0.15&&y>=p[3]-0.25)h=Math.max(h,p[3])});BLOCKS.forEach(function(b){var bp=b.m.position;if(Math.abs(x-bp.x)<0.45&&Math.abs(z-bp.z)<0.45&&y>=bp.y+0.05)h=Math.max(h,bp.y+0.3)});return h}
var camF=new THREE.Vector3(),camR=new THREE.Vector3();
function updatePlay(dt,time){var ix=joy.x+((keys.KeyD||keys.ArrowRight)?1:0)-((keys.KeyA||keys.ArrowLeft)?1:0),iy=joy.y+((keys.KeyS||keys.ArrowDown)?1:0)-((keys.KeyW||keys.ArrowUp)?1:0);var mag=Math.min(1,Math.hypot(ix,iy));
 camera.getWorldDirection(camF);camF.y=0;camF.normalize();camR.crossVectors(camF,new THREE.Vector3(0,1,0));
 var mv=new THREE.Vector3().addScaledVector(camR,ix).addScaledVector(camF,-iy);if(mv.lengthSq()>1)mv.normalize();
 var spd=4.6;var pos=mario.position;var nx=pos.x+mv.x*spd*dt,nz=pos.z+mv.z*spd*dt;
 // pipe side collision
 PIPES.forEach(function(p){var dx=nx-p[0],dz=nz-p[1],d=Math.hypot(dx,dz),rr=p[2]+0.3;if(d<rr&&pos.y<p[3]-0.2){nx=p[0]+dx/d*rr;nz=p[1]+dz/d*rr}});
 var step=groundH(nx,nz)-groundH(pos.x,pos.z);pos.x=nx;pos.z=nz;
 if(Math.hypot(pos.x,pos.z)>ISL+0.8&&pos.y<0.1){}// will fall
 if(mag>0.1){var want=Math.atan2(mv.x,mv.z);var d=((want-mario.rotation.y+Math.PI*3)%TAU)-Math.PI;mario.rotation.y+=d*Math.min(1,dt*12)}
 PL.speed=lerp(PL.speed,mag,dt*10);
 if(wantJump&&PL.ground){var now=time;PL.jumps=(now-PL.lastLand<0.35&&mag>0.5)?(PL.jumps%3)+1:1;PL.jumpKind=PL.jumps;PL.vy=[0,7,8.2,9.6][PL.jumps];PL.ground=false;PL.flip=0;sfx.jump(1+(PL.jumps-1)*0.2);if(PL.jumps==3){voice.yahoo(1.2);say('Wahoo!')}else if(PL.jumps==2)voice.say('hoo',1.1);else voice.say('ya',1.1)}
 wantJump=false;
 if(wantPound&&!PL.ground&&!PL.pounding){PL.pounding=true;PL.vy=0;PL.poundT=0;sfx.spin()}wantPound=false;
 if(PL.pounding){PL.poundT+=dt;if(PL.poundT>0.25)PL.vy=-16}else PL.vy-=20*dt;
 var oldY=pos.y;pos.y+=PL.vy*dt;
 // head bump blocks
 if(PL.vy>0)BLOCKS.forEach(function(b){var bp=b.m.position;if(Math.abs(pos.x-bp.x)<0.5&&Math.abs(pos.z-bp.z)<0.5&&oldY+1.65<=bp.y-0.3&&pos.y+1.65>bp.y-0.3){pos.y=bp.y-0.3-1.65;PL.vy=-1;b.bt=0.0001;sfx.bump();if(!b.used){b.used=true;b.m.material.map=UT;b.m.material.needsUpdate=true;if(b.star){var s=addStar(bp.x,bp.y+0.7,bp.z);sfx.star();say('A star!')}else{var c=addCoin(bp.x,bp.y+0.5,bp.z,true);coinCount++;sfx.coin();updHud()}}}});
 var sup=Math.hypot(pos.x,pos.z)<ISL?supportAt(pos.x,pos.z,oldY):-50;
 if(pos.y<=sup&&PL.vy<=0){if(!PL.ground){PL.lastLand=time;if(PL.pounding){sfx.thud();shake=0.3;dustRing();PL.pounding=false;BLOCKS.forEach(function(b){})}}pos.y=sup;PL.vy=0;PL.ground=true}else if(pos.y>sup+0.02)PL.ground=false;
 if(pos.y<-3){pos.set(0,3,0);PL.vy=0;voice.mamma();say('Mamma mia!')}
 // collect
 COINS.forEach(function(c){if(c.got||c.pop>=0)return;if(c.m.position.distanceTo(new THREE.Vector3(pos.x,pos.y+0.7,pos.z))<0.75){c.got=true;c.m.visible=false;coinCount++;sfx.coin();updHud()}});
 STARS.forEach(function(s){if(s.got)return;if(s.m.position.distanceTo(new THREE.Vector3(pos.x,pos.y+0.8,pos.z))<0.9){s.got=true;s.m.visible=false;starCount++;updHud();sfx.star();if(starCount>=3){var w=$('win');w.style.display='flex';music.fanfare();voice.yahoo();setTimeout(function(){w.style.display='none'},3200)}else{voice.yahoo(1.1);say('Got a star!')}}});
 // run / air pose
 var p=P({});copyPose(REST,p);
 if(PL.ground){PL.runPhase+=dt*PL.speed*13;var s=Math.sin(PL.runPhase),k=PL.speed;
  p.thL=[-s*0.9*k,0,0.04];p.thR=[s*0.9*k,0,-0.04];p.knL=[Math.max(0,s)*1.3*k+0.1*k,0,0];p.knR=[Math.max(0,-s)*1.3*k+0.1*k,0,0];
  p.shL=[s*0.9*k,0,0.25];p.shR=[-s*0.9*k,0,-0.25];p.elL=[-0.4-0.9*k,0,0];p.elR=[-0.4-0.9*k,0,0];p.spine=[0.15*k,s*0.12*k,0];p.cL=p.cR=0.6+0.4*k;ROOT.y=Math.abs(Math.cos(PL.runPhase))*0.06*k;ROOT.rx=0;
 }else if(PL.pounding){copyPose(PL.poundT>0.25?POSES.pound:POSES.tuck,p);ROOT.y=0;ROOT.rx=PL.poundT<0.25?PL.poundT/0.25*TAU:0}
 else{copyPose(PL.jumpKind==3?POSES.tuck:POSES.jump,p);ROOT.y=0;if(PL.jumpKind==3){PL.flip=Math.min(TAU,PL.flip+dt*9);ROOT.rx=PL.flip}else ROOT.rx=0;if(PL.jumpKind==2){copyPose(POSES.victory,p);p.thR=[-1.2,0,0];p.knR=[1.4,0,0]}}
 ROOT.ry=0;ROOT.sy=1;
 return p}
// ================= POST: bloom + ACES =================
var post=null;
function makePost(){var gl2=renderer.capabilities.isWebGL2;var opts={type:THREE.HalfFloatType,format:THREE.RGBAFormat};
 var rt=(gl2&&THREE.WebGLMultisampleRenderTarget)?new THREE.WebGLMultisampleRenderTarget(4,4,opts):new THREE.WebGLRenderTarget(4,4,opts);if(rt.samples!==undefined)rt.samples=Q=='high'?4:2;
 var a=new THREE.WebGLRenderTarget(4,4,opts),b=new THREE.WebGLRenderTarget(4,4,opts);
 var cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2)),ps=new THREE.Scene();ps.add(quad);
 var vs='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
 var bright=new THREE.ShaderMaterial({uniforms:{t:{value:null}},vertexShader:vs,fragmentShader:'uniform sampler2D t;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb;float l=dot(c,vec3(.2126,.7152,.0722));gl_FragColor=vec4(c*smoothstep(.85,1.6,l),1.);}'});
 var blur=new THREE.ShaderMaterial({uniforms:{t:{value:null},d:{value:new THREE.Vector2()}},vertexShader:vs,fragmentShader:'uniform sampler2D t;uniform vec2 d;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb*.227;c+=(texture2D(t,vUv+d*1.38).rgb+texture2D(t,vUv-d*1.38).rgb)*.316;c+=(texture2D(t,vUv+d*3.23).rgb+texture2D(t,vUv-d*3.23).rgb)*.07;gl_FragColor=vec4(c,1.);}'});
 var comp=new THREE.ShaderMaterial({uniforms:{t:{value:null},bl:{value:null},ex:{value:renderer.toneMappingExposure},str:{value:0.3}},vertexShader:vs,fragmentShader:[
 'uniform sampler2D t,bl;uniform float ex,str;varying vec2 vUv;',
 'vec3 RRT(vec3 v){vec3 a=v*(v+0.0245786)-0.000090537;vec3 b=v*(0.983729*v+0.4329510)+0.238081;return a/b;}',
 'vec3 aces(vec3 c){const mat3 i=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777));const mat3 o=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602));c*=ex/0.6;c=i*c;c=RRT(c);c=o*c;return clamp(c,0.,1.);}',
 'vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-0.055,step(vec3(0.0031308),c));}',
 'void main(){vec3 c=texture2D(t,vUv).rgb+texture2D(bl,vUv).rgb*str;c=aces(c);vec2 q=vUv-.5;c*=1.-dot(q,q)*.35;gl_FragColor=vec4(srgb(c),1.);}'].join('\n')});
 post={rt:rt,a:a,b:b,cam:cam,quad:quad,ps:ps,bright:bright,blur:blur,comp:comp,
  size:function(w,h){var d=renderer.getPixelRatio();rt.setSize(w*d,h*d);a.setSize(Math.max(1,w*d/4|0),Math.max(1,h*d/4|0));b.setSize(Math.max(1,w*d/4|0),Math.max(1,h*d/4|0))}};
 // sky colours are authored in sRGB; linearise for HDR path
 [skyMat].forEach(function(m){['top','mid','bot'].forEach(function(k){m.uniforms[k].value.convertSRGBToLinear()})});
}
function renderFrame(){if(!post){renderer.setRenderTarget(null);renderer.render(scene,camera);return}
 var p=post;renderer.setRenderTarget(p.rt);renderer.render(scene,camera);
 p.quad.material=p.bright;p.bright.uniforms.t.value=p.rt.texture;renderer.setRenderTarget(p.a);renderer.render(p.ps,p.cam);
 for(var i=0;i<2;i++){p.quad.material=p.blur;p.blur.uniforms.t.value=p.a.texture;p.blur.uniforms.d.value.set(1/p.a.width*(1+i),0);renderer.setRenderTarget(p.b);renderer.render(p.ps,p.cam);
  p.blur.uniforms.t.value=p.b.texture;p.blur.uniforms.d.value.set(0,1/p.a.height*(1+i));renderer.setRenderTarget(p.a);renderer.render(p.ps,p.cam)}
 p.quad.material=p.comp;p.comp.uniforms.t.value=p.rt.texture;p.comp.uniforms.bl.value=p.a.texture;renderer.setRenderTarget(null);renderer.render(p.ps,p.cam)}
if(QS.bloom)makePost();
function resize(){var w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?40:30;camera.updateProjectionMatrix();if(post)post.size(w,h)}
addEventListener('resize',resize);resize();
// ================= LOOP =================
hips.position.y=-0.04;
var clock=new THREE.Clock(),T=0,fpsAcc=0,fpsN=0,perfT=0;
function idlePose(t){var p=P({});copyPose(REST,p);var b=Math.sin(t*2.2);p.spine[0]=0.02*b;p.shL[2]+=0.03*b;p.shR[2]-=0.03*b;p.head[1]=Math.sin(t*0.6)*0.08+look.x*0.25;p.head[0]=-look.y*0.15;p.neck[2]=Math.sin(t*0.9)*0.03;ROOT.y=0;ROOT.sy=1+0.008*b;return p}
function frame(){requestAnimationFrame(frame);var dt=Math.min(clock.getDelta(),0.05);T+=dt;
 var target;
 if(mode==='play'){target=updatePlay(dt,T)}
 else if(mode==='pose'){target=null}
 else if(action){actT+=dt;var a=action;target=samplePose(a,Math.min(actT,a.dur));ROOT.rx=ROOT.ry=ROOT.rz=0;ROOT.sy=1;ROOT.y=0;var r=a.extra&&a.extra(actT,a.first,target);a.first=false;if(r)target=r;if(actT>=a.dur){action=null;ROOT.y=ROOT.rx=ROOT.ry=0;ROOT.sy=1}}
 else{target=idlePose(T);ROOT.rx=0;ROOT.ry=lerp(ROOT.ry,0,dt*5)}
 if(target){var k=1-Math.exp(-dt*(action||mode=='play'?22:8));mix(cur,target,k,cur);applyPose(cur)}
 // reactions
 if(R.belly>=0){R.belly+=dt;ROOT.rz=Math.sin(R.belly*40)*0.06*(1-R.belly/1.2);if(R.belly>1.2){R.belly=-1;ROOT.rz=0}}
 root.position.y=0.8+ROOT.y;root.rotation.set(ROOT.rx,ROOT.ry,ROOT.rz||0);root.scale.set(1/Math.sqrt(ROOT.sy||1),ROOT.sy||1,1/Math.sqrt(ROOT.sy||1));
 if(R.cap>=0){R.cap+=dt;var u=R.cap/1.6;face.cap.position.y=0.075+Math.sin(Math.min(u,1)*Math.PI)*0.9;face.cap.rotation.y=ss(u)*TAU*2;face.cap.position.z=-0.01+Math.sin(Math.min(u,1)*Math.PI)*0.15;if(u>=1){R.cap=-1;face.cap.position.set(0,0.075,-0.01);face.cap.rotation.y=0;sfx.pop();expression('happy',0.6)}}
 if(R.nose>=0){R.nose+=dt;var q=Math.exp(-R.nose*6)*Math.sin(R.nose*30);face.nose.scale.set(0.12*(1+q*0.25),0.1*(1-q*0.3),0.105*(1-q*0.35));if(R.nose>1){R.nose=-1;face.nose.scale.set(0.12,0.1,0.105)}}
 if(R.stache>=0){R.stache+=dt;var w=Math.exp(-R.stache*4)*Math.sin(R.stache*28);face.stache.rotation.z=w*0.12;face.stache.scale.set(1.3*(1+w*0.08),1.3*(1-w*0.06),1.3);if(R.stache>1.4){R.stache=-1;face.stache.rotation.z=0;face.stache.scale.setScalar(1.3)}}
 if(performance.now()-lastMove>2500)lookTarget.set(0,0);
 updateFace(dt);
 // fire sparkles
 if(sparkles.visible){sparkles.position.copy(mario.position);SP.forEach(function(s){s.a+=dt*s.s*2;s.h=(s.h+dt*0.6*s.s)%1.9;s.m.position.set(Math.cos(s.a)*0.55,s.h,Math.sin(s.a)*0.55);s.m.scale.setScalar(Math.sin(s.h/1.9*Math.PI))})}
 // world anims
 COINS.forEach(function(c){c.m.rotation.y+=dt*3;if(c.pop>=0){c.pop+=dt;c.m.position.y=c.y0+Math.sin(Math.min(c.pop,0.6)/0.6*Math.PI)*0.9;c.m.rotation.y+=dt*15;if(c.pop>0.6){c.m.visible=false}}});
 STARS.forEach(function(s){s.m.rotation.y+=dt*1.6;s.m.position.y=s.y0+Math.sin(T*2.5)*0.12});
 BLOCKS.forEach(function(b){if(b.bt>0){b.bt+=dt;b.m.position.y=b.y0+Math.sin(Math.min(b.bt,0.2)/0.2*Math.PI)*0.18;if(b.bt>0.2){b.bt=0;b.m.position.y=b.y0}}else b.m.rotation.y=0});
 clouds.rotation.y+=dt*0.01;
 for(var i=FX.length-1;i>=0;i--){var f=FX[i];f.t+=dt;var uu=f.t/f.dur;f.g.children.forEach(function(m){m.position.addScaledVector(m.userData.v,dt*2.2);m.scale.setScalar(1+uu*2);m.material.opacity=1-uu});if(uu>=1){scene.remove(f.g);FX.splice(i,1)}}
 // camera
 if(turntable&&mode!='play')orbT.th+=dt*0.4;
 orb.th=lerp(orb.th,orbT.th,1-Math.exp(-dt*8));orb.ph=lerp(orb.ph,orbT.ph,1-Math.exp(-dt*8));orb.d=lerp(orb.d,orbT.d,1-Math.exp(-dt*8));
 var tg=mode=='play'?new THREE.Vector3(mario.position.x,mario.position.y+1.0,mario.position.z):new THREE.Vector3(0,window.__focusY||0.92,0);orb.tgt.lerp(tg,1-Math.exp(-dt*(mode=='play'?6:4)));
 camera.position.set(orb.tgt.x+orb.d*Math.sin(orb.ph)*Math.sin(orb.th),orb.tgt.y+orb.d*Math.cos(orb.ph),orb.tgt.z+orb.d*Math.sin(orb.ph)*Math.cos(orb.th));
 if(camera.position.y<0.15)camera.position.y=0.15;camera.lookAt(orb.tgt);
 if(shake>0){shake=Math.max(0,shake-dt);camera.position.y+=(Math.random()-.5)*shake*0.3;camera.position.x+=(Math.random()-.5)*shake*0.3}
 // shadows follow Mario
 var mp=mario.position;key.position.set(mp.x+3.5,mp.y+6,mp.z+4.5);key.target.position.copy(mp);
 blob.position.set(mp.x,(mode=='play'?supportAt(mp.x,mp.z,mp.y+0.01):0)+0.006,mp.z);var hh=root.position.y-0.8+(mp.y-blob.position.y);blob.scale.setScalar(Math.max(0.3,0.95-hh*0.3));blob.material.opacity=Math.max(0.2,1-hh*0.5);
 renderFrame();
 // adaptive quality
 fpsAcc+=dt;fpsN++;perfT+=dt;if(perfT>2.5){var avg=fpsAcc/fpsN;fpsAcc=fpsN=0;perfT=0;if(avg>1/42&&!window.__noAdapt){if(DPR>1.0){DPR=Math.max(1,DPR-0.2);renderer.setPixelRatio(DPR);resize()}else if(post){post=null}}}
}
// start
var _seen=new Set();scene.traverse(function(o){var ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];ms.forEach(function(m){if(_seen.has(m)||m.isShaderMaterial)return;_seen.add(m);if(m.color)m.color.convertSRGBToLinear();if(m.emissive)m.emissive.convertSRGBToLinear();if(m.sheenColor)m.sheenColor.convertSRGBToLinear()})});
setOutfit('classic');applyPose(cur);buildPanel('act');
requestAnimationFrame(frame);
setTimeout(function(){var l=$('load');l.style.opacity=0;setTimeout(function(){l.remove()},700)},300);
window.__mario={play:play,setMode:setMode,setOutfit:setOutfit,expression:expression,orbT:orbT,orb:orb,cur:cur,POSES:POSES,applyPose:applyPose,copyPose:copyPose,tap:tap,R:R,mario:mario,lookTarget:lookTarget,get baseExpr(){return baseExpr},set baseExpr(v){baseExpr=v}};
scene.traverse(function(o){if(o.material&&o.material.envMapIntensity!==undefined&&o.material!==M.gold)o.material.envMapIntensity=0.6});
