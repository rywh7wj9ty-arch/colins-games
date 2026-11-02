(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
var qp=(location.search.match(/q=(low|medium|high)/)||[])[1];
var isPhone=/iPhone|iPod|Android/.test(navigator.userAgent)||Math.min(innerWidth,innerHeight)<500;
var Q=qp||(isPhone?'medium':'high');
var DPR=Math.min(devicePixelRatio||1,Q=='low'?1:Q=='medium'?1.5:2);
var N=Q=='low'?0.35:Q=='medium'?0.65:1;

/* ---------- renderer ---------- */
var R=new THREE.WebGLRenderer({antialias:Q!='low',powerPreference:'high-performance',preserveDrawingBuffer:false});
R.setPixelRatio(DPR);R.setSize(innerWidth,innerHeight);R.setClearColor(0x05010d);
document.body.insertBefore(R.domElement,document.body.firstChild);
var scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x05010d,0.012);
var cam=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,0.1,2000);
var composer=null,bloom=null;
if(Q!='low'&&THREE.EffectComposer&&THREE.UnrealBloomPass){
  composer=new THREE.EffectComposer(R);composer.addPass(new THREE.RenderPass(scene,cam));
  var bs=Q=='high'?1:0.5;
  bloom=new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth*bs,innerHeight*bs),0.7,0.4,0.6);composer.addPass(bloom);
}
function resize(){R.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();if(composer)composer.setSize(innerWidth,innerHeight)}
addEventListener('resize',resize);

/* ---------- palettes ---------- */
var PALS=[
 {n:'Neon',c:[0xff2fa8,0x7b2cff,0x2bd2ff]},
 {n:'Sunset',c:[0xff6a00,0xff2e63,0xffd36b]},
 {n:'Aurora',c:[0x00ffa3,0x00b3ff,0xb36bff]},
 {n:'Ice',c:[0x9be8ff,0x3a7bff,0xffffff]},
 {n:'Lava',c:[0xff2200,0xff9900,0xffee66]}];
var pal=0;var C=[new THREE.Color(),new THREE.Color(),new THREE.Color()];
function setPal(i){pal=i;for(var k=0;k<3;k++)C[k].setHex(PALS[i].c[k]);worlds.forEach(function(w){w.pal&&w.pal()})}

/* ---------- audio ---------- */
var AC=null,an=null,fd=null,src='',demo=null,micStream=null;
var A={bass:0,mid:0,high:0,lvl:0,beat:0,drop:0,t:0};
var avgB=0,lastBeat=0,longE=0,shortE=0,lastDrop=-20;
function ensureAC(){if(!AC){var K=window.AudioContext||window.webkitAudioContext;AC=new K();an=AC.createAnalyser();an.fftSize=1024;an.smoothingTimeConstant=0.6;fd=new Uint8Array(an.frequencyBinCount)}
  if(AC.state!='running')AC.resume();return AC}
function band(f0,f1){var hz=AC.sampleRate/an.fftSize,a=Math.max(1,Math.floor(f0/hz)),b=Math.min(fd.length-1,Math.ceil(f1/hz)),s=0;for(var i=a;i<=b;i++)s+=fd[i];return s/((b-a+1)*255)}
function readAudio(now){
  if(!an){A.bass*=.9;A.mid*=.9;A.high*=.9;return}
  an.getByteFrequencyData(fd);
  var b=band(25,160),m=band(160,2000),h=band(2000,11000);
  if(src=='mic'){b=Math.min(1,b*1.25);m=Math.min(1,m*1.6);h=Math.min(1,h*2.4)}
  A.bass+= (b-A.bass)*(b>A.bass?.6:.15);A.mid+=(m-A.mid)*.3;A.high+=(h-A.high)*.35;
  A.lvl=(A.bass+A.mid+A.high)/3;
  avgB=avgB*.97+b*.03;
  if(b>avgB*1.25&&b>0.25&&now-lastBeat>0.24){lastBeat=now;A.beat=1;onBeat()}
  A.beat*=.88;
  var e=A.lvl;shortE=shortE*.9+e*.1;longE=longE*.995+e*.005;
  if(shortE>longE*1.45&&shortE>0.22&&now-lastDrop>8){lastDrop=now;onDrop()}
}
/* demo beat: synthwave 120bpm with build-ups and drops */
function startDemo(){
  ensureAC();stopMic();src='demo';
  var out=AC.createGain();out.gain.value=0.8;out.connect(AC.destination);out.connect(an);
  var comp=AC.createDynamicsCompressor();comp.connect(out);
  var bpm=120,sp=60/bpm/4,step=0,nt=AC.currentTime+0.1,alive=true;
  var nb=AC.createBuffer(1,AC.sampleRate,AC.sampleRate),d=nb.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  function kick(t){var o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(40,t+.15);g.gain.setValueAtTime(1,t);g.gain.exponentialRampToValueAtTime(.001,t+.4);o.connect(g);g.connect(comp);o.start(t);o.stop(t+.45)}
  function noise(t,len,f,vol,type){var s=AC.createBufferSource();s.buffer=nb;var fl=AC.createBiquadFilter();fl.type=type||'highpass';fl.frequency.value=f;var g=AC.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+len);s.connect(fl);fl.connect(g);g.connect(comp);s.start(t,Math.random()*.5);s.stop(t+len+.05)}
  function tone(t,f,len,vol,type,cut){var o=AC.createOscillator(),g=AC.createGain(),fl=AC.createBiquadFilter();o.type=type;o.frequency.value=f;fl.type='lowpass';fl.frequency.setValueAtTime(cut,t);fl.frequency.exponentialRampToValueAtTime(cut*.3,t+len);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+len);o.connect(fl);fl.connect(g);g.connect(comp);o.start(t);o.stop(t+len+.05)}
  var roots=[45,41,48,43];// A F C G (midi-ish offsets)
  function mf(n){return 440*Math.pow(2,(n-69)/12)}
  var arp=[0,7,12,15,12,7,3,7];
  function sched(){
    while(alive&&nt<AC.currentTime+0.2){
      var bar=Math.floor(step/16),s=step%16,sec=Math.floor(bar/4)%8;// 32-bar cycle
      var phase=sec<2?'intro':sec<4?'groove':sec==4?'build':'drop';
      if(sec==7&&bar%4==3)phase='break';
      var r=roots[bar%4];
      if((phase!='intro'||s%8==0)&&phase!='build'&&phase!='break'&&s%4==0)kick(nt);
      if(phase=='build'&&(s%4==0||(bar%4==3&&s%2==0)))kick(nt);
      if(phase=='build')noise(nt,.08,800+(bar%4*16+s)*120,.06+(bar%4)*.04,'bandpass');
      if((phase=='groove'||phase=='drop')&&(s==4||s==12))noise(nt,.18,1500,.5,'bandpass');
      if(phase!='intro'&&s%2==1)noise(nt,.04,7000,phase=='drop'?.25:.12);
      if(phase=='drop'&&s%4==2)noise(nt,.1,9000,.2);
      if(phase!='intro'&&phase!='break')tone(nt,mf(r-12+(s%4==2?12:0)),sp*.9,.35,'sawtooth',phase=='drop'?1400:600);
      if(phase=='drop'||phase=='groove'||phase=='break')tone(nt,mf(r+24+arp[s%8]),sp*1.5,.08,'square',phase=='drop'?4000:2000);
      if(s==0){[0,3,7].forEach(function(iv){tone(nt,mf(r+12+iv),sp*16,.05,'sawtooth',1800)})}
      nt+=sp;step++;
    }
  }
  var iv=setInterval(sched,25);sched();
  demo={stop:function(){alive=false;clearInterval(iv);try{out.disconnect()}catch(e){}}};
  label();
}
function stopDemo(){if(demo){demo.stop();demo=null}}
function stopMic(){if(micStream){micStream.getTracks().forEach(function(t){t.stop()});micStream=null}}
function startMic(){
  ensureAC();
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){return Promise.reject(new Error('nomic'))}
  return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}}).then(function(st){
    stopDemo();micStream=st;var s=AC.createMediaStreamSource(st);s.connect(an);src='mic';label();
  });
}
function label(){$('src').textContent=src=='mic'?'🎤 Listening to your microphone':'🎧 Demo beat';$('swap').textContent=src=='mic'?'🎧 Demo':'🎤 Mic'}

/* ---------- shared helpers ---------- */
function glowTex(){var c=document.createElement('canvas');c.width=c.height=64;var g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.6)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)}
var GT=glowTex();
function sprite(col,s){var m=new THREE.Sprite(new THREE.SpriteMaterial({map:GT,color:col,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));m.scale.set(s,s,1);return m}
function stars(n,r){var g=new THREE.BufferGeometry(),p=new Float32Array(n*3);for(var i=0;i<n;i++){var v=new THREE.Vector3().randomDirection?new THREE.Vector3().randomDirection():new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize();v.multiplyScalar(r*(0.6+Math.random()*.4));p.set([v.x,Math.abs(v.y)*0.9+5,v.z],i*3)}g.setAttribute('position',new THREE.BufferAttribute(p,3));return new THREE.Points(g,new THREE.PointsMaterial({size:1.6,map:GT,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,color:0xffffff,sizeAttenuation:true}))}

/* bursts (tap) */
var BN=Math.round(600*N)+200,bG=new THREE.BufferGeometry(),bP=new Float32Array(BN*3),bV=new Float32Array(BN*3),bL=new Float32Array(BN),bC=new Float32Array(BN*3),bi=0;
bG.setAttribute('position',new THREE.BufferAttribute(bP,3));bG.setAttribute('color',new THREE.BufferAttribute(bC,3));
var bM=new THREE.PointsMaterial({size:1.2,map:GT,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
var bursts=new THREE.Points(bG,bM);bursts.frustumCulled=false;scene.add(bursts);
for(var i=0;i<BN;i++)bP[i*3+1]=-9999;
function burst(pos,n,spd){for(var k=0;k<n;k++){var i=bi++%BN;bP[i*3]=pos.x;bP[i*3+1]=pos.y;bP[i*3+2]=pos.z;var v=new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(spd*(0.3+Math.random()));bV[i*3]=v.x;bV[i*3+1]=v.y;bV[i*3+2]=v.z;bL[i]=1;var c=C[k%3];bC[i*3]=c.r;bC[i*3+1]=c.g;bC[i*3+2]=c.b}}
function updBursts(dt){for(var i=0;i<BN;i++){if(bL[i]<=0)continue;bL[i]-=dt*.7;bP[i*3]+=bV[i*3]*dt;bP[i*3+1]+=bV[i*3+1]*dt;bP[i*3+2]+=bV[i*3+2]*dt;bV[i*3]*=.97;bV[i*3+1]*=.97;bV[i*3+2]*=.97;var f=Math.max(0,bL[i])*.985;bC[i*3]*=f>0?.985:0;bC[i*3+1]*=f>0?.985:0;bC[i*3+2]*=f>0?.985:0;if(bL[i]<=0)bP[i*3+1]=-9999}bG.attributes.position.needsUpdate=true;bG.attributes.color.needsUpdate=true}

/* ---------- worlds ---------- */
var worlds=[];
/* 1. Synthwave */
(function(){
  var g=new THREE.Group(),W=Math.round(60*Math.sqrt(N))+20;
  var geo=new THREE.PlaneGeometry(240,240,W,W);geo.rotateX(-Math.PI/2);
  var u={t:{value:0},bass:{value:0},c1:{value:C[0]},c2:{value:C[1]},hi:{value:0}};
  var mat=new THREE.ShaderMaterial({uniforms:u,transparent:true,vertexShader:
   'uniform float t,bass;varying vec3 vp;varying float vh;float h(vec2 p){return sin(p.x*.08+t*.2)*cos(p.y*.07)*3.+sin(p.x*.21)*sin(p.y*.19+t)*1.2;}void main(){vec3 p=position;float side=smoothstep(8.,40.,abs(p.x));vec2 q=vec2(p.x,p.z-t*30.);float y=(h(q)+3.)*side*(1.6+bass*3.5);p.y+=y;vh=y;vp=vec3(p.x,p.y,q.y);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
   fragmentShader:'uniform vec3 c1,c2;uniform float hi;varying vec3 vp;varying float vh;void main(){vec2 g=abs(fract(vp.xz/4.)-.5);float l=1.-smoothstep(0.,.06+hi*.05,min(g.x,g.y));vec3 col=mix(c2*.08,mix(c1,c2,clamp(vh/14.,0.,1.))*1.6,l);float f=1.-smoothstep(40.,118.,length(vp.xz-vec2(0.,vp.z)) );gl_FragColor=vec4(col,1.);}'});
  var terr=new THREE.Mesh(geo,mat);terr.position.z=-90;g.add(terr);
  var su={c1:{value:C[2]},c2:{value:C[0]},t:{value:0},b:{value:0}};
  var sun=new THREE.Mesh(new THREE.CircleGeometry(38,64),new THREE.ShaderMaterial({uniforms:su,transparent:true,fog:false,vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 c1,c2;uniform float t,b;varying vec2 v;void main(){float y=v.y;float s=step(.5,fract(y*14.-t*.6));float cut=y<.55?s:1.;vec3 c=mix(c2,c1,y)*(.9+b*.4);gl_FragColor=vec4(c,cut);if(cut<.5)discard;}'}));
  sun.position.set(0,22,-200);g.add(sun);
  var halo=sprite(0xff3cac,190);halo.position.copy(sun.position);halo.position.z-=2;halo.material.opacity=.55;g.add(halo);
  g.add(stars(Math.round(800*N),400));
  worlds.push({name:'Neon Highway',g:g,fog:0.006,home:{r:16,y:7,yaw:0,pitch:.05,tx:0,ty:6,tz:-40,fov:70},
    pal:function(){halo.material.color.copy(C[0])},
    up:function(t,a){u.t.value=t;u.bass.value=a.bass;u.hi.value=a.high;su.t.value=t;su.b.value=a.beat*.6;var s=1+a.bass*.12;sun.scale.set(s,s,1);halo.material.opacity=.12+a.bass*.25}});
})();
/* 2. Galaxy */
(function(){
  var g=new THREE.Group(),n=Math.round(60000*N),geo=new THREE.BufferGeometry(),p=new Float32Array(n*3),r=new Float32Array(n),c=new Float32Array(n);
  for(var i=0;i<n;i++){var arm=i%4,d=Math.pow(Math.random(),1.6)*60+1,ang=arm*Math.PI/2+d*.12+(Math.random()-.5)*(.9/Math.sqrt(d)*3);var sc=(Math.random()-.5)*(3+d*.05);
    p[i*3]=Math.cos(ang)*d+sc;p[i*3+1]=(Math.random()-.5)*(6/Math.sqrt(d+1))*3;p[i*3+2]=Math.sin(ang)*d+(Math.random()-.5)*(3+d*.05);r[i]=d;c[i]=Math.random()}
  geo.setAttribute('position',new THREE.BufferAttribute(p,3));geo.setAttribute('rad',new THREE.BufferAttribute(r,1));geo.setAttribute('rnd',new THREE.BufferAttribute(c,1));
  var u={t:{value:0},bass:{value:0},mid:{value:0},hi:{value:0},c1:{value:C[0]},c2:{value:C[1]},c3:{value:C[2]},px:{value:DPR}};
  var mat=new THREE.ShaderMaterial({uniforms:u,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:
   'attribute float rad,rnd;uniform float t,bass,mid,hi,px;varying vec3 vc;uniform vec3 c1,c2,c3;void main(){vec3 p=position;float a=t*(.6/ (sqrt(rad)+.5));float cs=cos(a),sn=sin(a);p.xz=mat2(cs,-sn,sn,cs)*p.xz;float wave=sin(rad*.35-t*4.)*.5+.5;p*=1.+bass*.18*wave;p.y+=sin(rad*.5-t*3.)*mid*2.;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float s=(1.+rnd*2.)*(1.+bass*1.5*wave+hi*step(.93,rnd)*3.);gl_PointSize=s*px*45./-mv.z;vc=mix(mix(c3,c1,smoothstep(0.,25.,rad)),c2,smoothstep(25.,60.,rad))*(.35+wave*bass*.6);}',
   fragmentShader:'varying vec3 vc;void main(){vec2 q=gl_PointCoord-.5;float d=length(q);if(d>.5)discard;gl_FragColor=vec4(vc*(1.-d*2.),1.);}'});
  var pts=new THREE.Points(geo,mat);g.add(pts);
  var core=sprite(0xffffff,8);g.add(core);g.add(stars(Math.round(1500*N),500));
  worlds.push({name:'Pulse Galaxy',g:g,fog:0.002,home:{r:75,y:0,yaw:.4,pitch:.55,tx:0,ty:0,tz:0,fov:60},
    pal:function(){core.material.color.copy(C[2])},
    up:function(t,a){u.t.value=t;u.bass.value=a.bass;u.mid.value=a.mid;u.hi.value=a.high;var s=6+a.bass*10;core.scale.set(s,s,1);pts.rotation.z=Math.sin(t*.1)*.2}});
})();
/* 3. Crystal cave */
(function(){
  var g=new THREE.Group(),n=Math.round(700*N)+100;
  var geo=new THREE.OctahedronGeometry(1,0);geo.scale(.5,2.2,.5);
  var mat=new THREE.MeshStandardMaterial({color:0xffffff,metalness:.3,roughness:.15,emissive:0xffffff,emissiveIntensity:.1,flatShading:true});
  var im=new THREE.InstancedMesh(geo,mat,n),base=[],dm=new THREE.Object3D(),col=new THREE.Color();
  for(var i=0;i<n;i++){var z=(Math.random()-.5)*160,ang=Math.random()*Math.PI*2,rr=9+Math.random()*3,s=.6+Math.random()*2.2;
    var pos=new THREE.Vector3(Math.cos(ang)*rr,Math.sin(ang)*rr*.75,z);base.push({p:pos,ang:ang,s:s,k:i%3,f:Math.random(),tilt:(Math.random()-.5)*.6})}
  g.add(im);
  var rock=new THREE.Mesh(new THREE.CylinderGeometry(12,12,170,24,40,true),new THREE.MeshStandardMaterial({color:0x140a22,roughness:1,side:THREE.BackSide,flatShading:true}));
  var rp=rock.geometry.attributes.position;for(i=0;i<rp.count;i++){var x=rp.getX(i),zz=rp.getZ(i),k=1+(Math.random()-.5)*.25;rp.setX(i,x*k);rp.setZ(i,zz*k*.78)}rock.geometry.computeVertexNormals();
  rock.rotation.x=Math.PI/2;g.add(rock);
  var amb=new THREE.AmbientLight(0x332244,.6);g.add(amb);
  var L=[0,1,2].map(function(k){var l=new THREE.PointLight(0xffffff,2,40,1.6);g.add(l);return l});
  var motes=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({size:.25,map:GT,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:0xffffff}));
  var mp=new Float32Array(Math.round(800*N)*3);for(i=0;i<mp.length;i++)mp[i]=(Math.random()-.5)*(i%3==2?160:16);motes.geometry.setAttribute('position',new THREE.BufferAttribute(mp,3));g.add(motes);
  function paint(){for(var i=0;i<n;i++){im.setColorAt(i,C[base[i].k])}im.instanceColor.needsUpdate=true}
  worlds.push({name:'Crystal Cave',g:g,fog:0.035,home:{r:6,y:0,yaw:0,pitch:0,tx:0,ty:0,tz:-20,fov:75},fly:1,
    pal:function(){paint();L.forEach(function(l,k){l.color.copy(C[k])})},
    up:function(t,a){var z0=(t*6)%160;
      for(var i=0;i<n;i++){var b=base[i],e=b.k==0?a.bass:b.k==1?a.mid:a.high;var s=b.s*(1+e*1.4*(.5+b.f));dm.position.set(b.p.x,b.p.y,((b.p.z+z0+80)%160)-80);dm.rotation.set(b.tilt,0,b.ang-Math.PI/2);dm.scale.set(s*.8,s,s*.8);dm.updateMatrix();im.setMatrixAt(i,dm.matrix)}
      im.instanceMatrix.needsUpdate=true;mat.emissiveIntensity=.05+a.beat*.25+a.high*.2;
      L.forEach(function(l,k){l.position.set(Math.sin(t*(.7+k*.3)+k*2)*5,Math.cos(t*(.5+k*.2)+k)*4,-10-k*12+Math.sin(t)*6);l.intensity=.8+(k==0?a.bass:k==1?a.mid:a.high)*2.5});motes.rotation.z=t*.05}});
})();
/* 4. Ocean */
(function(){
  var g=new THREE.Group(),S=Math.round(160*Math.sqrt(N))+40;
  var geo=new THREE.PlaneGeometry(300,300,S,S);geo.rotateX(-Math.PI/2);
  var u={t:{value:0},bass:{value:0},mid:{value:0},hi:{value:0},c1:{value:C[0]},c2:{value:C[1]},c3:{value:C[2]},ring:{value:0}};
  var mat=new THREE.ShaderMaterial({uniforms:u,vertexShader:
   'uniform float t,bass,mid,ring;varying float vh;varying vec3 vw;float w(vec2 p){return sin(p.x*.15+t*1.2)*1.2+sin(p.y*.11+t*.9)*1.1+sin((p.x+p.y)*.32+t*2.)*.4*(1.+mid*3.);}void main(){vec3 p=position;float r=length(p.xz);float h=w(p.xz)*(1.+bass*2.2)+sin(r*.4-ring*9.)*exp(-abs(r-ring*40.)*.15)*3.*step(.01,ring);p.y+=h;vh=h;vw=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
   fragmentShader:'uniform vec3 c1,c2,c3;uniform float hi;varying float vh;varying vec3 vw;void main(){vec3 n=normalize(cross(dFdx(vw),dFdy(vw)));float fres=pow(1.-abs(n.y),2.);vec3 deep=c2*.15;vec3 col=mix(deep,c1*.45,smoothstep(-2.,6.,vh));col+=c3*smoothstep(4.,7.,vh)*(.4+hi*1.2);col+=fres*c2*.25;float g=1.-smoothstep(0.,.05,abs(fract(vw.x*.1)-.5)*abs(fract(vw.z*.1)-.5)*4.);gl_FragColor=vec4(col,1.);}',extensions:{derivatives:true}});
  var sea=new THREE.Mesh(geo,mat);g.add(sea);
  var moon=sprite(0xffffff,30);moon.position.set(0,40,-160);g.add(moon);
  var moon2=new THREE.Mesh(new THREE.CircleGeometry(9,48),new THREE.MeshBasicMaterial({color:0xffffff,fog:false}));moon2.position.set(0,40,-158);g.add(moon2);
  g.add(stars(Math.round(1500*N),450));
  var ringT=0;
  worlds.push({name:'Ocean of Sound',g:g,fog:0.009,home:{r:30,y:9,yaw:0,pitch:.18,tx:0,ty:2,tz:0,fov:65},
    pal:function(){moon.material.color.copy(C[2])},
    beat:function(){ringT=.001},
    up:function(t,a,dt){u.t.value=t;u.bass.value=a.bass;u.mid.value=a.mid;u.hi.value=a.high;if(ringT>0){ringT+=dt*.5;if(ringT>2)ringT=0}u.ring.value=ringT;var s=22+a.bass*12;moon.scale.set(s,s,1)}});
})();
/* 5. Tunnel */
(function(){
  var g=new THREE.Group(),rings=40,per=Math.round(24*Math.sqrt(N))+8,n=rings*per;
  var geo=new THREE.BoxGeometry(.6,.6,3);
  var mat=new THREE.MeshBasicMaterial({color:0x999999});
  var im=new THREE.InstancedMesh(geo,mat,n),dm=new THREE.Object3D();g.add(im);
  var spec=new Float32Array(64);
  var tu={t:{value:0},c1:{value:C[0]},c2:{value:C[1]},b:{value:0}};
  var tube=new THREE.Mesh(new THREE.CylinderGeometry(14,14,400,32,1,true),new THREE.ShaderMaterial({uniforms:tu,side:THREE.BackSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float t,b;uniform vec3 c1,c2;varying vec2 v;void main(){float s=pow(abs(sin(v.y*120.+t*14.)),30.)*.6+pow(abs(sin(v.x*3.1416*16.)),60.)*.3;gl_FragColor=vec4(mix(c1,c2,v.x)*s*(.15+b*.3),1.);}'}));
  tube.rotation.x=Math.PI/2;g.add(tube);
  function paint(){var k=0;for(var r=0;r<rings;r++)for(var j=0;j<per;j++){im.setColorAt(k++,C[(r+j)%3])}im.instanceColor.needsUpdate=true}
  worlds.push({name:'Hyper Tunnel',g:g,fog:0.02,home:{r:.1,y:0,yaw:0,pitch:0,tx:0,ty:0,tz:-10,fov:80},
    pal:paint,
    up:function(t,a){tu.t.value=t;tu.b.value=a.bass;var speed=t*(30);if(fd){for(var i=0;i<64;i++)spec[i]=fd[2+i*3]/255}
      var k=0;for(var r=0;r<rings;r++){var z=((r*5+speed)%200)-180,tw=t*.4+r*.12+a.mid*.5;
        for(var j=0;j<per;j++){var ang=j/per*Math.PI*2+tw,e=spec[(j*3+r)%64]||a.lvl,rad=10-e*5-a.beat*1.5;dm.position.set(Math.cos(ang)*rad,Math.sin(ang)*rad,z);dm.rotation.set(0,0,ang);dm.scale.set(.6+e*1.5,.6+e*1.5,.6+a.bass*1.5);dm.updateMatrix();im.setMatrixAt(k++,dm.matrix)}}
      im.instanceMatrix.needsUpdate=true;g.rotation.z=Math.sin(t*.3)*.4}});
})();
worlds.forEach(function(w){w.g.visible=false;scene.add(w.g)});
var hemi=new THREE.HemisphereLight(0x8866ff,0x110022,.5);scene.add(hemi);
setPal(0);

/* ---------- camera / interaction ---------- */
var cur=-1,orbit={yaw:0,pitch:0,dy:0,dp:0},kick={v:0,roll:0},fovK=0,auto=true,lastSwitch=0,tNow=0;
function setWorld(i,quiet){i=(i+worlds.length)%worlds.length;if(cur>=0)worlds[cur].g.visible=false;cur=i;var w=worlds[i];w.g.visible=true;scene.fog.density=w.fog;orbit.yaw=0;orbit.pitch=0;$('wname').textContent=w.name;lastSwitch=tNow;if(!quiet)flash(.5)}
function flash(o){var f=$('flash');f.style.transition='none';f.style.opacity=o;requestAnimationFrame(function(){f.style.transition='opacity .6s';f.style.opacity=0})}
function onBeat(){var w=worlds[cur];if(w&&w.beat)w.beat();kick.v+=.6}
function onDrop(){kick.roll=(Math.random()<.5?-1:1)*0.6;fovK=14;flash(.35);var w=worlds[cur];burst(camFwd(15),Math.round(200*N)+60,25);if(auto&&tNow-lastSwitch>20)setWorld(cur+1)}
function camFwd(d){var v=new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion).multiplyScalar(d);return v.add(cam.position)}
var drag=null,moved=0;
R.domElement.addEventListener('pointerdown',function(e){drag={x:e.clientX,y:e.clientY};moved=0});
addEventListener('pointermove',function(e){if(!drag)return;var dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;moved+=Math.abs(dx)+Math.abs(dy);orbit.dy-=dx*.005;orbit.dp+=dy*.004});
addEventListener('pointerup',function(e){if(drag&&moved<10){var v=new THREE.Vector3((e.clientX/innerWidth)*2-1,-(e.clientY/innerHeight)*2+1,.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(14).add(cam.position);burst(v,Math.round(120*N)+40,14);kick.v+=.5}drag=null});
function placeCam(t,dt){var w=worlds[cur],h=w.home;
  orbit.yaw+=orbit.dy;orbit.pitch=Math.max(-.6,Math.min(.9,orbit.pitch+orbit.dp));orbit.dy*=.85;orbit.dp*=.85;
  if(!drag){orbit.yaw*=.995;orbit.pitch*=.995}
  var drift=Math.sin(t*.13)*.35,yaw=h.yaw+orbit.yaw+drift,pitch=h.pitch+orbit.pitch+Math.sin(t*.17)*.05;
  kick.v*=.9;kick.roll*=.97;fovK*=.95;
  var tgt=new THREE.Vector3(h.tx,h.ty,h.tz);
  if(w.fly){cam.position.set(Math.sin(t*.4)*1.5+Math.sin(yaw)*3,Math.cos(t*.3)*1.2+pitch*3,0);cam.lookAt(tgt.x+Math.sin(yaw)*8,tgt.y+pitch*8,tgt.z)}
  else if(h.r<1){cam.position.set(0,0,0);cam.lookAt(Math.sin(yaw)*10,pitch*10,-10)}
  else{var r=h.r*(1-kick.v*.03);cam.position.set(tgt.x+Math.sin(yaw)*r*Math.cos(pitch),h.y+Math.sin(pitch)*r,tgt.z+Math.cos(yaw)*r*Math.cos(pitch));if(h.tz<-5)cam.position.z=Math.cos(yaw)*r;cam.lookAt(tgt)}
  cam.rotateZ(kick.roll*Math.sin(t*2)+(Math.random()-.5)*kick.v*.01);
  var f=h.fov+fovK+A.bass*3;if(Math.abs(cam.fov-f)>.05){cam.fov=f;cam.updateProjectionMatrix()}
}

/* ---------- loop ---------- */
var last=performance.now()/1000,t0=last,meters=[$('m0'),$('m1'),$('m2'),$('m3')],palTimer=0;
function frame(){requestAnimationFrame(frame);var now=performance.now()/1000,dt=Math.min(.05,now-last);last=now;tNow=now-t0;
  readAudio(tNow);var w=worlds[cur];w.up(tNow,A,dt);placeCam(tNow,dt);updBursts(dt);
  if(auto&&tNow-lastSwitch>45)setWorld(cur+1);
  if(auto){palTimer+=dt;if(palTimer>30){palTimer=0;setPal((pal+1)%PALS.length)}}
  if(bloom){bloom.strength=.45+A.bass*.35+A.beat*.35;bloom.radius=.35+A.high*.2}
  var v=[A.bass,A.mid,A.high,A.beat];for(var i=0;i<4;i++){meters[i].style.height=(2+v[i]*20)+'px';meters[i].style.background='#'+C[i%3].getHexString()}
  if(composer)composer.render(dt);else R.render(scene,cam);
  if(wantShot){wantShot=false;showPhoto(R.domElement.toDataURL('image/jpeg',.92))}
}
var wantShot=false;
function showPhoto(url){$('pimg').src=url;$('photo').style.display='flex';flash(.8)}
setWorld(+(location.hash.match(/w=(\d)/)||[0,0])[1]||0,true);
frame();

/* ---------- UI ---------- */
function toast(m){var t=$('toast');t.textContent=m;t.style.opacity=1;clearTimeout(toast.h);toast.h=setTimeout(function(){t.style.opacity=0},1600)}
function go(){$('start').style.opacity=0;setTimeout(function(){$('start').style.display='none'},600);$('hud').style.display='flex';$('top').style.display='block'}
$('bDemo').onclick=function(){startDemo();go()};
$('bMic').onclick=function(){ensureAC();$('msg').textContent='Asking for microphone…';startMic().then(go,function(err){
  var n=err&&err.name;$('msg').innerHTML=(n=='NotAllowedError'||n=='SecurityError')?'Microphone access was blocked. On iPhone: Settings → Safari → Microphone → Allow (or tap ᴀA in the address bar → Website Settings). Or just tap <b>Play demo beat</b>.':'This browser can\'t use the microphone here. Tap <b>Play demo beat</b> instead.'})};
$('next').onclick=function(){setWorld(cur+1);toast(worlds[cur].name)};$('prev').onclick=function(){setWorld(cur-1);toast(worlds[cur].name)};
$('auto').onclick=function(){auto=!auto;this.classList.toggle('on',auto);toast(auto?'Auto-cycle on':'Auto-cycle off')};
$('pal').onclick=function(){setPal((pal+1)%PALS.length);toast('🎨 '+PALS[pal].n)};
$('swap').onclick=function(){if(src=='mic')startDemo();else startMic().then(function(){toast('🎤 Listening')},function(){toast('Mic blocked — staying on demo')})};
$('fs').onclick=function(){var d=document.documentElement,rq=d.requestFullscreen||d.webkitRequestFullscreen;
  if(document.fullscreenElement||document.webkitFullscreenElement){(document.exitFullscreen||document.webkitExitFullscreen).call(document);return}
  if(rq&&!/iPhone|iPod/.test(navigator.userAgent)){rq.call(d)}else{document.body.classList.add('clean');toast('Tap the top of the screen to bring buttons back')}};
addEventListener('pointerup',function(e){if(document.body.classList.contains('clean')&&e.clientY<90)document.body.classList.remove('clean')});
$('shot').onclick=function(){wantShot=true};
$('pclose').onclick=function(){$('photo').style.display='none'};
$('psave').onclick=function(){var url=$('pimg').src;fetch(url).then(function(r){return r.blob()}).then(function(b){var f=new File([b],'music-world.jpg',{type:'image/jpeg'});
  if(navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f],title:'Music World'}).catch(function(){});else{var a=document.createElement('a');a.href=url;a.download='music-world.jpg';a.click()}})};
document.addEventListener('visibilitychange',function(){if(!document.hidden&&AC&&AC.state!='running')AC.resume()});
window.__mw={ready:true,setWorld:setWorld,startDemo:startDemo,go:go,A:A,worlds:worlds,setPal:setPal};
})();
