(function(){
'use strict';
var V=THREE.Vector3,$=function(i){return document.getElementById(i)};
var qs=new URLSearchParams(location.search);
var Q=qs.get('q')||(/iPhone|Android/.test(navigator.userAgent)?'medium':'high');
var QS={low:{pr:1,seg:.5,parts:250},medium:{pr:Math.min(devicePixelRatio,1.75),seg:.75,parts:600},high:{pr:Math.min(devicePixelRatio,2.5),seg:1,parts:1200}}[Q]||{pr:1.5,seg:.75,parts:600};
$('qbtn').textContent={low:'LO',medium:'MD',high:'HD'}[Q];
$('qbtn').onclick=function(){var n={low:'medium',medium:'high',high:'low'}[Q];qs.set('q',n);location.search=qs.toString()};
function S(n){return Math.max(4,Math.round(n*QS.seg))}

var renderer=new THREE.WebGLRenderer({canvas:$('c'),antialias:Q!=='low',powerPreference:'high-performance'});
renderer.setPixelRatio(QS.pr);renderer.setSize(innerWidth,innerHeight);
renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
var scene=new THREE.Scene();
scene.background=new THREE.Color(0x050914);scene.fog=new THREE.FogExp2(0x050914,0.06);
var camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,0.002,400);
scene.add(new THREE.HemisphereLight(0x9cc8ff,0x201030,0.75));
var key=new THREE.DirectionalLight(0xffffff,1.1);key.position.set(2,4,3);scene.add(key);
var rim=new THREE.DirectionalLight(0x4ab8ff,0.9);rim.position.set(-3,2,-3);scene.add(rim);
var pl=new THREE.PointLight(0xff6b86,0.8,3);pl.position.set(0,1.3,0.4);scene.add(pl);

// ---------- helpers ----------
function glowTex(c1){var cv=document.createElement('canvas');cv.width=cv.height=64;var g=cv.getContext('2d');var gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.25,c1);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);var t=new THREE.CanvasTexture(cv);return t}
var GT={red:glowTex('rgba(255,60,90,.8)'),blue:glowTex('rgba(80,160,255,.8)'),gold:glowTex('rgba(255,210,90,.85)'),white:glowTex('rgba(200,230,255,.7)'),green:glowTex('rgba(90,255,160,.8)')};
function sprite(tex,s,col){var m=new THREE.SpriteMaterial({map:tex,color:col||0xffffff,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});var sp=new THREE.Sprite(m);sp.scale.set(s,s,s);return sp}
function noisy(geo,amt,freq){var p=geo.attributes.position,v=new V();for(var i=0;i<p.count;i++){v.fromBufferAttribute(p,i);var n=Math.sin(v.x*freq)*Math.sin(v.y*freq*1.3+1)*Math.sin(v.z*freq*.9+2);v.multiplyScalar(1+n*amt);p.setXYZ(i,v.x,v.y,v.z)}geo.computeVertexNormals();return geo}
function std(c,o){o=o||{};var m=new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.55,metalness:.05},o));m.color.convertSRGBToLinear();m.emissive.convertSRGBToLinear();return m}
function tube(pts,r,mat,seg,rs){var cur=new THREE.CatmullRomCurve3(pts.map(function(a){return new V(a[0],a[1],a[2])}));var m=new THREE.Mesh(new THREE.TubeGeometry(cur,S(seg||40),r,S(rs||8),false),mat);m.userData.curve=cur;return m}
function limb(a,b,r,mat){var A=new V(a[0],a[1],a[2]),B=new V(b[0],b[1],b[2]);var len=A.distanceTo(B);var g=new THREE.CylinderGeometry(r[1]||r,r[0]||r,len,S(16),1);var m=new THREE.Mesh(g,mat);m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new V(0,1,0),B.clone().sub(A).normalize());return m}
function ell(p,s,mat,seg){var m=new THREE.Mesh(new THREE.SphereGeometry(1,S(seg||24),S((seg||24)*.75)),mat);m.position.set(p[0],p[1],p[2]);m.scale.set(s[0],s[1],s[2]);return m}
function mirror(fn){fn(1);fn(-1)}
function tag(m,id){m.userData.id=id;pick.push(m);return m}
var pick=[];

// ---------- facts ----------
var F={
skin:{k:'Skin · Integumentary',c:'#9fd8ff',h:'Skin',p:'Your largest organ – about 2 m² and roughly 4 kg in an adult.',u:['Renews its outer layer every 4 weeks or so','Holds about 5 million hairs across the body','Sweat glands keep you at a steady 37 °C']},
brain:{k:'Organ · Nervous',c:'#ff9ec7',h:'Brain',p:'About 86 billion neurons, using roughly 20% of your energy while weighing only 2% of you.',u:['Runs on about 20 watts – less than a light bulb','Signals travel at up to 120 m/s','Around 75% water']},
heart:{k:'Organ · Circulatory',c:'#ff4d6d',h:'Heart',p:'A fist-sized pump with four chambers. It beats around 100,000 times a day.',u:['Pumps about 5 litres a minute at rest','Up to 25 litres a minute during hard exercise','Has its own electrical pacemaker, the SA node']},
lungL:{k:'Organ · Respiratory',c:'#ffb3c1',h:'Left lung',p:'Slightly smaller than the right to make room for the heart. It has two lobes.',u:['Around 300 million alveoli across both lungs','Alveoli would cover a tennis court if laid flat','You breathe about 22,000 times a day']},
lungR:{k:'Organ · Respiratory',c:'#ffb3c1',h:'Right lung',p:'Three lobes. Oxygen crosses into your blood through walls just one cell thick.',u:['Gas exchange happens in about 0.25 seconds','Exhaled air still holds about 16% oxygen','The lungs are the only organs that can float']},
liver:{k:'Organ · Digestive',c:'#c96b4f',h:'Liver',p:'Your chemical factory, doing over 500 jobs including cleaning the blood and making bile.',u:['Largest internal organ – about 1.5 kg','Can regrow from as little as 25% of itself','Stores vitamins, iron and sugar']},
stomach:{k:'Organ · Digestive',c:'#f2a65a',h:'Stomach',p:'A muscular bag that churns food with acid strong enough to dissolve metal.',u:['Holds about 1 to 1.5 litres','Makes a new lining every few days so it doesn\'t digest itself','Food stays here 2 to 4 hours']},
intestine:{k:'Organ · Digestive',c:'#f7c77b',h:'Small intestine',p:'About 6 metres long, folded neatly into your belly. Most nutrients are absorbed here.',u:['Lined with millions of finger-like villi','Total surface area around 30 m²','Home to trillions of helpful microbes nearby']},
colon:{k:'Organ · Digestive',c:'#d9a066',h:'Large intestine',p:'About 1.5 m long. It reclaims water and is home to your gut microbiome.',u:['Around 38 trillion bacteria live in your gut','Absorbs about 1.5 litres of water a day','Makes vitamin K with help from bacteria']},
kidney:{k:'Organ · Urinary',c:'#b85a6a',h:'Kidneys',p:'Two bean-shaped filters that clean all your blood around 40 times a day.',u:['Filter about 180 litres of fluid a day','Each has about a million tiny filters (nephrons)','You can live well with just one']},
bladder:{k:'Organ · Urinary',c:'#e6c36a',h:'Bladder',p:'A stretchy muscular store that holds up to about half a litre.',u:['Stretch sensors tell your brain when it\'s filling','Wall folds flatten out as it fills']},
eye:{k:'Sense organ',c:'#7fe0ff',h:'Eye',p:'Can tell apart around 10 million colours and adjusts focus in milliseconds.',u:['Your blink lasts about a tenth of a second','The retina has around 120 million rods']},
skull:{k:'Bone · Skeleton',c:'#f3ead8',h:'Skull',p:'22 bones fused together (apart from the jaw) to protect the brain.',u:['The jaw is the only skull bone that moves','At birth the skull has soft gaps that close later']},
spine:{k:'Bone · Skeleton',c:'#f3ead8',h:'Spine',p:'33 vertebrae stacked in an S-curve that absorbs shocks and protects the spinal cord.',u:['7 neck, 12 chest and 5 lower back vertebrae','Discs between them act like cushions','You\'re about 1 cm taller in the morning']},
ribs:{k:'Bone · Skeleton',c:'#f3ead8',h:'Rib cage',p:'12 pairs of ribs form a flexible cage around the heart and lungs.',u:['Moves up and out with each breath','The lowest two pairs are "floating" ribs']},
pelvis:{k:'Bone · Skeleton',c:'#f3ead8',h:'Pelvis',p:'A strong bowl of bone that carries your upper body\'s weight to your legs.',u:['Made of several bones fused together','Anchors the strongest muscles in the body']},
femur:{k:'Bone · Skeleton',c:'#f3ead8',h:'Femur',p:'The longest and strongest bone in your body – about a quarter of your height.',u:['Stronger, weight for weight, than steel','Its marrow makes red blood cells']},
humerus:{k:'Bone · Skeleton',c:'#f3ead8',h:'Humerus',p:'The upper arm bone. The "funny bone" is actually the ulnar nerve passing near it.',u:['Connects shoulder to elbow']},
tibia:{k:'Bone · Skeleton',c:'#f3ead8',h:'Tibia & fibula',p:'Your shin bones. The tibia carries most of the weight.',u:['The tibia is the second longest bone']},
radius:{k:'Bone · Skeleton',c:'#f3ead8',h:'Radius & ulna',p:'The two forearm bones twist around each other when you turn your hand.',u:['Each hand has 27 bones']},
bones:{k:'Bone · Skeleton',c:'#f3ead8',h:'Skeleton',p:'206 bones in an adult. Babies start with around 270 that fuse over time.',u:['Bone is living tissue that remodels itself','Over half your bones are in your hands and feet']},
muscle:{k:'Muscular system',c:'#e0606b',h:'Muscles',p:'Over 600 muscles make up around 40% of your body weight.',u:['Muscles can only pull, never push','The busiest muscles are in your eyes','The biggest is the gluteus maximus']},
biceps:{k:'Muscle',c:'#e0606b',h:'Biceps',p:'Bends your elbow. Works in a pair with the triceps, which straightens it.',u:['Muscle pairs like this are called antagonists']},
quads:{k:'Muscle',c:'#e0606b',h:'Quadriceps',p:'Four muscles at the front of the thigh – among the strongest in the body.',u:['They straighten your knee for walking, running and jumping']},
pecs:{k:'Muscle',c:'#e0606b',h:'Pectorals',p:'Chest muscles that pull your arms across your body.',u:['Help lift the ribs when you breathe hard']},
abs:{k:'Muscle',c:'#e0606b',h:'Abdominals',p:'The core muscles that hold you upright and protect the organs.',u:['The "six-pack" is one muscle split by tendons']},
calf:{k:'Muscle',c:'#e0606b',h:'Calf',p:'Lifts your heel. It connects to the Achilles, the strongest tendon in the body.',u:['Also helps push blood back up from your legs']},
delt:{k:'Muscle',c:'#e0606b',h:'Deltoid',p:'The rounded shoulder muscle that lifts your arm.',u:['Has three parts: front, side and back']},
artery:{k:'Circulatory · Arteries',c:'#ff4d6d',h:'Arteries',p:'Carry oxygen-rich blood away from the heart under high pressure.',u:['The aorta is about as wide as a garden hose','Your blood vessels would stretch about 100,000 km']},
vein:{k:'Circulatory · Veins',c:'#5aa0ff',h:'Veins',p:'Bring blood back to the heart. One-way valves stop it flowing backwards.',u:['Blood is never really blue – it is dark red','About 70% of your blood is in veins at any moment']},
nerve:{k:'Nervous system',c:'#ffd45a',h:'Nerves',p:'Cables of nerve fibres carrying signals between the brain and every part of you.',u:['The longest, the sciatic nerve, runs down each leg','Nerves would stretch about 72 km end to end']},
cord:{k:'Nervous system',c:'#ffd45a',h:'Spinal cord',p:'A finger-thick bundle of nerves running down inside the spine.',u:['Handles reflexes without waiting for the brain','31 pairs of nerves branch off it']}
};

// ---------- BODY ----------
var body=new THREE.Group();scene.add(body);
var L={};['skin','muscle','skeleton','organs','circ','nerve'].forEach(function(k){L[k]=new THREE.Group();body.add(L[k])});
// skeleton point map
var P={head:[0,1.62,0],neck:[0,1.49,-.01],shL:[.2,1.43,-.01],elL:[.27,1.13,-.02],wrL:[.31,.86,.02],hipL:[.1,.94,0],knL:[.1,.5,.01],anL:[.1,.08,-.01]};
function pm(p,s){return [p[0]*s,p[1],p[2]]}

// skin shader (holographic fresnel)
var skinMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.FrontSide,blending:THREE.NormalBlending,uniforms:{op:{value:1},t:{value:0}},
vertexShader:'varying vec3 vN;varying vec3 vV;varying float vY;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vY=(modelMatrix*vec4(position,1.)).y;gl_Position=projectionMatrix*mv;}',
fragmentShader:'uniform float op;uniform float t;varying vec3 vN;varying vec3 vV;varying float vY;void main(){float f=pow(1.-abs(dot(vN,vV)),2.2);float scan=smoothstep(.0,.02,abs(fract(vY*1.2-t*.25)-.5)-.47);vec3 c=mix(vec3(.25,.55,.9),vec3(.75,.92,1.),f);float a=(.06+f*.55+scan*.25)*op;gl_FragColor=vec4(c*(1.+scan),a);}'});
(function(){
 var prof=[[.0,.9],[.13,.9],[.165,.97],[.155,1.06],[.14,1.14],[.16,1.24],[.19,1.36],[.17,1.43],[.07,1.47],[.055,1.5],[.0,1.5]].map(function(a){return new THREE.Vector2(a[0],a[1])});
 var tor=new THREE.Mesh(new THREE.LatheGeometry(prof,S(40)),skinMat);tor.scale.z=.62;L.skin.add(tag(tor,'skin'));
 var hd=ell([0,1.62,.005],[.088,.115,.1],skinMat,32);L.skin.add(tag(hd,'skin'));
 L.skin.add(tag(limb([0,1.46,0],[0,1.56,0],[.052,.05],skinMat),'skin'));
 mirror(function(s){
  [[P.shL,P.elL,[.05,.042]],[P.elL,P.wrL,[.04,.03]],[P.hipL,P.knL,[.085,.055]],[P.knL,P.anL,[.055,.035]]].forEach(function(a){L.skin.add(tag(limb(pm(a[0],s),pm(a[1],s),a[2],skinMat),'skin'))});
  L.skin.add(tag(ell(pm(P.shL,s),[.055,.055,.055],skinMat),'skin'));
  L.skin.add(tag(ell([s*.325,.79,.025],[.025,.06,.035],skinMat),'skin'));
  L.skin.add(tag(ell([s*.1,.035,.04],[.04,.035,.11],skinMat),'skin'));
 });
})();

// muscles
var mMat=std(0xa8303c,{roughness:.4,emissive:0x220204});var tMat=std(0xe8d3c0,{roughness:.4});
(function(){
 var M=L.muscle;
 mirror(function(s){
  M.add(tag(ell([s*.075,1.33,.075],[.075,.055,.03],mMat),'pecs'));
  M.add(tag(ell([s*.205,1.4,0],[.05,.07,.05],mMat),'delt'));
  M.add(tag(ell([s*.23,1.27,.02],[.035,.09,.035],mMat),'biceps'));
  M.add(tag(ell([s*.23,1.27,-.03],[.035,.09,.03],mMat),'muscle'));
  M.add(tag(limb(pm(P.elL,s),pm(P.wrL,s),[.036,.022],mMat),'muscle'));
  M.add(tag(ell([s*.1,.74,.035],[.07,.19,.06],mMat),'quads'));
  M.add(tag(ell([s*.1,.74,-.03],[.065,.18,.055],mMat),'muscle'));
  M.add(tag(ell([s*.1,.33,-.025],[.045,.12,.045],mMat),'calf'));
  M.add(tag(limb([s*.1,.47,.02],[s*.1,.1,.0],[.03,.022],mMat),'muscle'));
  M.add(tag(ell([s*.12,1.12,.04],[.04,.13,.045],mMat),'muscle'));
  M.add(tag(ell([s*.08,.97,-.07],[.075,.07,.05],mMat),'muscle'));
  M.add(tag(ell([s*.09,1.3,-.07],[.08,.13,.035],mMat),'muscle'));
  M.add(tag(limb([s*.03,1.47,.01],[s*.18,1.42,0],[.025,.02],mMat),'muscle'));
  M.add(ell([s*.1,.5,.06],[.03,.03,.012],tMat));
 });
 for(var r=0;r<3;r++)mirror(function(s){M.add(tag(ell([s*.03,1.18-r*.075,.085],[.027,.033,.014],mMat),'abs'))});
 M.add(tag(ell([0,1.01,.075],[.05,.04,.014],mMat),'abs'));
 M.add(tag(limb([0,1.44,0],[0,1.56,.0],[.045,.04],mMat),'muscle'));
})();

// skeleton
var bMat=std(0xf1e7d2,{roughness:.6,emissive:0x15120c});
(function(){
 var K=L.skeleton;
 var sk=new THREE.Mesh(new THREE.SphereGeometry(.082,S(32),S(24)),bMat);sk.position.set(0,1.64,-.005);sk.scale.set(.92,1,1.12);K.add(tag(sk,'skull'));
 var jaw=new THREE.Mesh(new THREE.TorusGeometry(.045,.012,S(8),S(20),Math.PI),bMat);jaw.position.set(0,1.555,.02);jaw.rotation.x=Math.PI/2+.4;jaw.rotation.z=Math.PI;K.add(tag(jaw,'skull'));
 mirror(function(s){var e=new THREE.Mesh(new THREE.TorusGeometry(.017,.005,6,S(16)),bMat);e.position.set(s*.03,1.63,.075);K.add(tag(e,'skull'))});
 for(var i=0;i<24;i++){var y=.96+i*.023;var z=-.055-Math.sin((y-.96)/.56*Math.PI*1.5)*.018;var v=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.016,S(10)),bMat);v.position.set(0,y,z);K.add(tag(v,'spine'));var pr=new THREE.Mesh(new THREE.BoxGeometry(.008,.01,.025),bMat);pr.position.set(0,y,z-.02);K.add(tag(pr,'spine'))}
 for(i=0;i<12;i++){var ry=1.4-i*.032,rr=.07+Math.sin(Math.min(i,7)/7*Math.PI/2)*.065-(i>8?(i-8)*.02:0);
  mirror(function(s){var g=new THREE.TorusGeometry(rr,.006,S(6),S(24),Math.PI*(i>9?.6:.9));var m=new THREE.Mesh(g,bMat);m.position.set(0,ry,-.03);m.rotation.x=Math.PI/2+.35;m.rotation.z=s>0?-.15:Math.PI+.15;if(s<0)m.scale.y=-1;m.scale.y*=1.05;m.scale.x=1;var w=new THREE.Group();w.add(m);w.scale.set(1,1,1);K.add(tag(m,'ribs'))});}
 K.add(tag(limb([0,1.4,.075],[0,1.19,.085],[.013,.01],bMat),'ribs'));
 var pel=new THREE.Mesh(new THREE.TorusGeometry(.085,.025,S(10),S(28)),bMat);pel.position.set(0,.96,0);pel.rotation.x=Math.PI/2-.4;pel.scale.set(1.3,1,.8);K.add(tag(pel,'pelvis'));
 mirror(function(s){
  K.add(tag(limb([s*.02,1.45,.04],[s*.19,1.44,-.01],[.008,.009],bMat),'bones'));
  K.add(tag(ell([s*.12,1.38,-.08],[.06,.07,.01],bMat),'bones'));
  K.add(tag(limb(pm(P.shL,s),pm(P.elL,s),[.017,.014],bMat),'humerus'));
  K.add(tag(ell(pm(P.shL,s),[.024,.024,.024],bMat),'humerus'));
  K.add(tag(limb([s*.265,1.13,-.01],[s*.3,.86,.03],[.008,.01],bMat),'radius'));
  K.add(tag(limb([s*.275,1.13,-.03],[s*.315,.86,.01],[.009,.007],bMat),'radius'));
  for(var f=0;f<5;f++){K.add(tag(limb([s*(.3+f*.006),.84,.03-f*.008],[s*(.305+f*.012),.76+Math.abs(f-2)*.012,.03-f*.012],[.004,.004],bMat),'bones'))}
  K.add(tag(limb([s*.085,.94,0],[s*.1,.52,.01],[.018,.015],bMat),'femur'));
  K.add(tag(ell([s*.085,.93,0],[.026,.026,.026],bMat),'femur'));
  K.add(tag(ell([s*.1,.505,.03],[.024,.026,.012],bMat),'bones'));
  K.add(tag(limb([s*.1,.49,.01],[s*.1,.09,-.01],[.012,.017],bMat),'tibia'));
  K.add(tag(limb([s*.125,.48,-.005],[s*.122,.1,-.015],[.006,.007],bMat),'tibia'));
  K.add(tag(ell([s*.1,.03,.035],[.03,.015,.09],bMat),'bones'));
 });
})();

// organs
var heartG=new THREE.Group(),lungs=[],brain,stomach,intestine,colon;
(function(){
 var O=L.organs;
 var bm=std(0xf3a2c0,{roughness:.5,emissive:0x40142a});
 brain=new THREE.Mesh(noisy(new THREE.SphereGeometry(.072,S(48),S(36)),.06,90),bm);brain.position.set(0,1.665,-.005);brain.scale.set(.9,.78,1.1);O.add(tag(brain,'brain'));
 var cb=ell([0,1.615,-.06],[.04,.025,.03],bm);O.add(tag(cb,'brain'));
 mirror(function(s){var e=ell([s*.03,1.635,.08],[.013,.013,.013],std(0xffffff,{emissive:0x113344,roughness:.2}));O.add(tag(e,'eye'));var ir=ell([s*.03,1.635,.092],[.007,.007,.003],std(0x2a8fd0,{emissive:0x0a3050}));O.add(tag(ir,'eye'))});
 // heart
 var hm=std(0xd92b4a,{roughness:.35,emissive:0x50081a});
 var hg=new THREE.SphereGeometry(.05,S(40),S(30));var p=hg.attributes.position,v=new V();for(var i=0;i<p.count;i++){v.fromBufferAttribute(p,i);var k=v.y<0?1-(-v.y/.05)*.45:1;v.x*=k;v.z*=k*.85;v.y*=v.y<0?1.25:1;var lob=v.y>.02?Math.abs(v.x)/.05*.012:0;v.y-=lob*0;p.setXYZ(i,v.x,v.y,v.z)}hg.computeVertexNormals();
 var hmesh=new THREE.Mesh(noisy(hg,.04,60),hm);heartG.add(hmesh);
 heartG.add(tube([[.0,.035,0],[.01,.075,0],[-.03,.085,-.01],[-.04,.05,-.02]],.012,std(0xe0405c,{emissive:0x400010})));
 heartG.add(tube([[-.015,.03,.01],[-.02,.07,.02],[.03,.08,.0]],.01,std(0x4a7fd8,{emissive:0x081a40})));
 heartG.position.set(.025,1.29,.035);heartG.rotation.z=-.45;heartG.rotation.x=.2;O.add(heartG);heartG.children.forEach(function(c){tag(c,'heart')});
 mirror(function(s){var lg=new THREE.SphereGeometry(.07,S(36),S(28));var lp=lg.attributes.position;for(var i=0;i<lp.count;i++){v.fromBufferAttribute(lp,i);v.y*=1.6;if(v.y>0)v.x*=1-v.y/.112*.45;if(s*v.x<0)v.x*=.55;v.z*=.9;lp.setXYZ(i,v.x,v.y,v.z)}lg.computeVertexNormals();
  var l=new THREE.Mesh(noisy(lg,.03,70),std(0xf0a0ae,{roughness:.6,emissive:0x3a1018,transparent:true,opacity:.92}));l.position.set(s*.085,1.31,-.005);l.userData.side=s;O.add(tag(l,s>0?'lungL':'lungR'));lungs.push(l);
  // bronchi
  O.add(tag(tube([[0,1.42,.0],[s*.02,1.38,0],[s*.06,1.33,0],[s*.08,1.28,0]],.006,std(0xe8d8d0)),s>0?'lungL':'lungR'));
 });
 O.add(tag(limb([0,1.42,0],[0,1.52,.0],[.009,.009],std(0xe8d8d0)),'lungR'));
 var liv=new THREE.Mesh(noisy(new THREE.SphereGeometry(.08,S(32),S(24)),.03,40),std(0x8e3b2a,{roughness:.4,emissive:0x200805}));liv.position.set(-.06,1.14,.02);liv.scale.set(1.25,.55,.8);liv.rotation.z=-.2;O.add(tag(liv,'liver'));
 stomach=new THREE.Mesh(noisy(new THREE.SphereGeometry(.05,S(32),S(24)),.04,50),std(0xe8946a,{roughness:.45,emissive:0x301000}));stomach.position.set(.065,1.115,.035);stomach.scale.set(1.1,.85,.7);stomach.rotation.z=.6;O.add(tag(stomach,'stomach'));
 O.add(tag(tube([[0,1.52,-.02],[0,1.4,-.035],[.01,1.25,-.02],[.04,1.15,.02]],.007,std(0xe8a080)),'stomach'));
 // small intestine coil
 var ip=[];for(i=0;i<=120;i++){var t=i/120;var a=t*Math.PI*14;var rr=.03+.04*Math.abs(Math.sin(t*Math.PI*3.5));ip.push([Math.cos(a)*rr*.95+.0,1.06-t*.11+Math.sin(a*.5)*.008,.04+Math.sin(a)*rr*.35])}
 intestine=tube(ip,.0095,std(0xf2b38a,{roughness:.5,emissive:0x2a0e04}),300,8);O.add(tag(intestine,'intestine'));
 colon=tube([[-.1,.94,.03],[-.11,1.04,.04],[-.1,1.08,.05],[0,1.085,.06],[.1,1.08,.05],[.11,1.0,.04],[.09,.93,.03],[.03,.92,.0]],.015,std(0xd28c5c,{roughness:.6,emissive:0x200a02}),80,10);O.add(tag(colon,'colon'));
 mirror(function(s){var kd=ell([s*.06,1.07,-.045],[.022,.04,.018],std(0xa0384a,{roughness:.4,emissive:0x200008}));kd.rotation.z=s*.2;O.add(tag(kd,'kidney'))});
 O.add(tag(ell([0,.92,.04],[.03,.025,.025],std(0xe2c070,{transparent:true,opacity:.85})),'bladder'));
})();

// circulatory
var flowCurves=[];
(function(){
 var C=L.circ,am=std(0xff3355,{emissive:0x600012,roughness:.3}),vm=std(0x3c7fff,{emissive:0x0a2060,roughness:.3});
 function A(pts,r,id,dir){var m=tube(pts,r,id==='artery'?am:vm,48,6);C.add(tag(m,id));flowCurves.push({c:m.userData.curve,a:id==='artery'});return m}
 A([[.02,1.33,.04],[.0,1.38,.02],[-.03,1.39,-.01],[-.035,1.32,-.04],[-.02,1.15,-.04],[0,.98,-.03]],.008,'artery');
 mirror(function(s){
  A([[0,.98,-.03],[s*.06,.93,.0],[s*.09,.7,.03],[s*.1,.5,-.01],[s*.105,.25,-.02],[s*.1,.06,.03]],.005,'artery');
  A([[-.01,1.385,0],[s*.03,1.47,.0],[s*.035,1.58,.02],[s*.03,1.66,.02],[0,1.69,0]],.0045,'artery');
  A([[-.02,1.39,-.005],[s*.12,1.43,0],[s*.22,1.37,0],[s*.26,1.15,.0],[s*.3,.9,.03],[s*.31,.8,.03]],.0042,'artery');
  A([[s*.095,.06,-.03],[s*.11,.28,-.04],[s*.11,.5,-.03],[s*.1,.75,0],[s*.05,.93,-.01],[0,1.0,-.01]],.0055,'vein');
  A([[s*.33,.8,.0],[s*.31,.95,-.02],[s*.28,1.14,-.04],[s*.22,1.36,-.03],[s*.1,1.42,-.02],[0,1.38,.01]],.0042,'vein');
  A([[s*.045,1.66,0],[s*.045,1.56,-.01],[s*.03,1.47,-.01],[0,1.38,.01]],.0045,'vein');
 });
 A([[0,1.0,-.01],[.005,1.15,-.02],[.01,1.27,.02]],.009,'vein');
})();
// flow particles
var NP=QS.parts,pgeo=new THREE.BufferGeometry(),ppos=new Float32Array(NP*3),pcol=new Float32Array(NP*3),pinfo=[];
for(var i=0;i<NP;i++){var fc=flowCurves[i%flowCurves.length];pinfo.push({c:fc,t:Math.random(),s:.6+Math.random()*.6});var c=fc.a?[1,.35,.45]:[.4,.65,1];pcol.set(c,i*3)}
pgeo.setAttribute('position',new THREE.BufferAttribute(ppos,3));pgeo.setAttribute('color',new THREE.BufferAttribute(pcol,3));
var flowPts=new THREE.Points(pgeo,new THREE.PointsMaterial({size:.012,map:GT.white,vertexColors:true,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));L.circ.add(flowPts);

// nervous
var nerveCurves=[];
(function(){
 var N=L.nerve,nm=std(0xffcf4a,{emissive:0x806000,roughness:.3});
 function Nv(pts,r,id){var m=tube(pts,r,nm,40,5);N.add(tag(m,id||'nerve'));nerveCurves.push(m.userData.curve)}
 Nv([[0,1.6,-.02],[0,1.5,-.04],[0,1.3,-.055],[0,1.1,-.05],[0,.95,-.045]],.006,'cord');
 mirror(function(s){
  Nv([[0,1.42,-.05],[s*.12,1.42,-.02],[s*.23,1.3,-.03],[s*.28,1.1,-.01],[s*.31,.88,.02],[s*.33,.78,.03]],.0028);
  Nv([[0,.97,-.045],[s*.08,.9,-.05],[s*.1,.7,-.05],[s*.1,.5,-.03],[s*.11,.25,-.04],[s*.1,.05,.0]],.0035);
  Nv([[0,1.2,-.05],[s*.08,1.2,0],[s*.15,1.15,.05]],.002);
  Nv([[0,1.32,-.055],[s*.09,1.31,.0],[s*.16,1.28,.04]],.002);
  Nv([[0,1.6,-.02],[s*.04,1.6,.04],[s*.06,1.56,.07]],.002);
 });
 var glow=sprite(GT.gold,.25,0xffd45a);glow.position.set(0,1.66,0);glow.material.opacity=.5;N.add(glow);
})();
var NS=Q==='low'?24:60,nsp=[];for(i=0;i<NS;i++){var sp=sprite(GT.gold,.03,0xffe08a);L.nerve.add(sp);nsp.push({s:sp,c:nerveCurves[i%nerveCurves.length],t:Math.random(),v:.4+Math.random()})}

// platform
var ring=new THREE.Mesh(new THREE.RingGeometry(.35,.37,S(64)),new THREE.MeshBasicMaterial({color:0x4ab8ff,transparent:true,opacity:.5,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.001;body.add(ring);
var disc=new THREE.Mesh(new THREE.CircleGeometry(.6,S(64)),new THREE.MeshBasicMaterial({map:glowTex('rgba(40,120,220,.35)'),transparent:true,depthWrite:false}));disc.rotation.x=-Math.PI/2;body.add(disc);
// star dust
(function(){var n=Q==='low'?300:900,g=new THREE.BufferGeometry(),a=new Float32Array(n*3);for(var i=0;i<n;i++){var r=3+Math.random()*30,th=Math.random()*6.28,ph=Math.acos(Math.random()*2-1);a.set([r*Math.sin(ph)*Math.cos(th),r*Math.cos(ph)+1,r*Math.sin(ph)*Math.sin(th)],i*3)}g.setAttribute('position',new THREE.BufferAttribute(a,3));scene.add(new THREE.Points(g,new THREE.PointsMaterial({size:.06,map:GT.blue,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:.6})))})();

// ---------- FLY (blood cell ride) ----------
var flyPath=new THREE.CatmullRomCurve3([[.1,.3,-.02],[.11,.6,-.03],[.06,.92,-.01],[.005,1.15,-.02],[.01,1.27,.03],[.025,1.29,.04],[.06,1.32,.03],[.1,1.33,0],[.11,1.28,-.01],[.08,1.3,.02],[.03,1.3,.04],[.01,1.33,.04],[-.02,1.39,0],[-.03,1.47,.0],[-.035,1.58,.02],[-.02,1.66,.02],[.0,1.69,.0]].map(function(a){return new V(a[0],a[1],a[2])}),false,'catmullrom',.3);
var flyTubeMat=new THREE.ShaderMaterial({side:THREE.BackSide,transparent:true,depthWrite:false,uniforms:{t:{value:0},o2:{value:0}},
vertexShader:'varying vec2 vU;varying vec3 vN;varying vec3 vV;void main(){vU=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
fragmentShader:'uniform float t;uniform float o2;varying vec2 vU;varying vec3 vN;varying vec3 vV;void main(){float r=sin(vU.x*900.-t*6.)*.5+.5;float c=sin(vU.y*6.283*6.+vU.x*200.)*.5+.5;vec3 blue=vec3(.25,.15,.45),red=vec3(.85,.12,.2);vec3 col=mix(blue,red,o2)*(.5+.5*r)+vec3(1.,.5,.5)*pow(c,8.)*.4;float f=pow(1.-abs(dot(vN,vV)),1.5);gl_FragColor=vec4(col,.1+f*.3+pow(c,8.)*.2);}'});
var flyTube=new THREE.Mesh(new THREE.TubeGeometry(flyPath,S(400),.012,S(16),false),flyTubeMat);flyTube.visible=false;scene.add(flyTube);
function rbcGeo(r){var pts=[];for(var i=0;i<=20;i++){var t=i/20,x=t*r;var h=r*.42*(.25+1.2*t*t-t*t*t*t*.95)*Math.sqrt(Math.max(0,1-t*t));pts.push(new THREE.Vector2(x,h))}for(i=20;i>=0;i--){var p=pts[i];pts.push(new THREE.Vector2(p.x,-p.y))}return new THREE.LatheGeometry(pts,S(32))}
var rbcMat=std(0x8a1830,{roughness:.35,emissive:0x300010});
var rbc=new THREE.Mesh(rbcGeo(.0035),rbcMat);rbc.visible=false;scene.add(rbc);
var cells=new THREE.Group();scene.add(cells);cells.visible=false;var cellArr=[];
for(i=0;i<(Q==='low'?40:110);i++){var cm=new THREE.Mesh(rbcGeo(.0025+Math.random()*.001),std(0x8a1830,{roughness:.35,emissive:0x300010}));cm.userData={t:Math.random(),o:new V((Math.random()-.5)*.016,(Math.random()-.5)*.016,(Math.random()-.5)*.016),r:new V(Math.random(),Math.random(),Math.random()),v:.5+Math.random()};cells.add(cm);cellArr.push(cm)}
var o2s=[];for(i=0;i<40;i++){var os=sprite(GT.blue,.004,0x9fe0ff);os.visible=false;scene.add(os);o2s.push(os)}

// ---------- NEURON world ----------
var NW=new THREE.Group();NW.position.set(60,0,0);NW.rotation.z=-Math.PI/2;scene.add(NW);
var axonPts=[],pulse,neuronMats=[];
(function(){
 var nm=std(0x7a5cff,{emissive:0x2a1080,roughness:.3});neuronMats.push(nm);
 var soma=new THREE.Mesh(noisy(new THREE.SphereGeometry(.5,S(48),S(36)),.12,4),nm);NW.add(soma);
 NW.add(ell([0,0,0],[.22,.22,.22],std(0xc0a0ff,{emissive:0x6040c0})));
 function branch(o,dir,len,r,d){if(d>3)return;var e=o.clone().add(dir.clone().multiplyScalar(len));var mid=o.clone().lerp(e,.5).add(new V(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(len*.3));NW.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([o,mid,e]),S(12),r,S(6)),nm));for(var k=0;k<2;k++){var nd=dir.clone().add(new V(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(1.1)).normalize();branch(e,nd,len*.7,r*.6,d+1)}}
 for(var i=0;i<6;i++){var a=i/6*6.28;branch(new V(0,0,0),new V(Math.cos(a)-.6,Math.sin(a),Math.sin(a*2)*.5).normalize(),1.1,.09,0)}
 for(i=0;i<=40;i++){var t=i/40;axonPts.push(new V(.4+t*9,Math.sin(t*5)*.4,Math.cos(t*3)*.3))}
 var ac=new THREE.CatmullRomCurve3(axonPts);NW.userData.ac=ac;
 NW.add(new THREE.Mesh(new THREE.TubeGeometry(ac,S(160),.07,S(8)),nm));
 var my=std(0xf2ecff,{emissive:0x303050,roughness:.3});
 for(i=1;i<12;i++){var t0=i/12;var p=ac.getPointAt(t0),tg=ac.getTangentAt(t0);var m=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.55,S(20)),my);m.position.copy(p);m.quaternion.setFromUnitVectors(new V(0,1,0),tg);NW.add(m)}
 var end=ac.getPointAt(1);for(i=0;i<5;i++){var d=new V(1,(i-2)*.5,Math.sin(i)*.5).normalize();var e2=end.clone().add(d.multiplyScalar(1));NW.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([end,end.clone().lerp(e2,.5).add(new V(0,.1,0)),e2]),S(10),.04,S(6)),nm));NW.add(ell([e2.x,e2.y,e2.z],[.12,.12,.12],std(0xa080ff,{emissive:0x4020a0})))}
 var nm2=std(0x3cc0ff,{emissive:0x0a4080,roughness:.3});
 var n2=new THREE.Mesh(noisy(new THREE.SphereGeometry(.45,S(40),S(30)),.12,4),nm2);n2.position.set(end.x+3.2,end.y,end.z);NW.add(n2);
 for(i=0;i<5;i++){var e3=end.clone().add(new V(1.35,(i-2)*.55,Math.sin(i)*.55));NW.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([e3,e3.clone().lerp(n2.position,.5).add(new V(0,(i-2)*.1,0)),n2.position]),S(12),.05,S(6)),nm2))}
 NW.userData.syn=end;
 pulse=sprite(GT.gold,1.2,0xfff0a0);pulse.visible=false;NW.add(pulse);
 var lt=new THREE.PointLight(0x9a7cff,1.5,12);lt.position.set(3,2,3);NW.add(lt);
})();
var vesicles=[];for(i=0;i<30;i++){var vs=sprite(GT.green,.18,0x90ffc0);vs.visible=false;NW.add(vs);vesicles.push(vs)}

// ---------- CELL & DNA world ----------
var CW=new THREE.Group();CW.position.set(120,0,0);scene.add(CW);var dna;
(function(){
 var mem=new THREE.Mesh(new THREE.SphereGeometry(3,S(64),S(48)),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{},vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',fragmentShader:'varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-abs(dot(vN,vV)),2.);gl_FragColor=vec4(mix(vec3(.2,.8,.7),vec3(.6,1.,.9),f),.05+f*.6);}'}));CW.add(mem);
 var nuc=new THREE.Mesh(noisy(new THREE.SphereGeometry(1,S(48),S(36)),.04,3),std(0x7a4cff,{transparent:true,opacity:.55,emissive:0x301080,depthWrite:false}));CW.add(nuc);CW.userData.nuc=nuc;
 var nl=ell([.3,.2,.2],[.3,.3,.3],std(0xff70c0,{emissive:0x601040}));CW.add(nl);CW.userData.nl=nl;
 var mm=std(0xff9a3c,{emissive:0x502000,roughness:.4});
 for(var i=0;i<(Q==='low'?6:12);i++){var m=ell([0,0,0],[.18,.18,.42],mm);var d=new V(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(1.6+Math.random()*1);m.position.copy(d);m.rotation.set(Math.random()*3,Math.random()*3,0);CW.add(m)}
 var er=std(0x4fd0ff,{emissive:0x104060,transparent:true,opacity:.8});
 for(i=0;i<5;i++){var g=new THREE.TorusGeometry(1.25+i*.12,.03,S(6),S(60),Math.PI*1.1);var t=new THREE.Mesh(g,er);t.rotation.set(.3*i,1+i*.2,0);CW.add(t)}
 var rg=new THREE.BufferGeometry(),n=Q==='low'?300:900,a=new Float32Array(n*3);for(i=0;i<n;i++){var v=new V(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(1.2+Math.random()*1.7);a.set([v.x,v.y,v.z],i*3)}rg.setAttribute('position',new THREE.BufferAttribute(a,3));CW.add(new THREE.Points(rg,new THREE.PointsMaterial({size:.06,map:GT.white,color:0xaaffee,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true})));
 // DNA
 dna=new THREE.Group();CW.add(dna);
 var cols=[0xff5a7a,0x5ad1ff,0xffd45a,0x7aff9a],pairs=[[0,3],[3,0],[1,2],[2,1]];
 var nb=Q==='low'?40:80,sm=std(0xdfe8ff,{emissive:0x203050,roughness:.3});
 var sg=new THREE.SphereGeometry(.022,S(10),S(8));
 for(i=0;i<nb;i++){var y=(i-nb/2)*.03,ang=i*.6;var pr=pairs[(i*7+3)%4];
  var A=new V(Math.cos(ang)*.12,y,Math.sin(ang)*.12),B=new V(-Math.cos(ang)*.12,y,-Math.sin(ang)*.12);
  var sa=new THREE.Mesh(sg,sm);sa.position.copy(A);dna.add(sa);var sb=new THREE.Mesh(sg,sm);sb.position.copy(B);dna.add(sb);
  var mid=A.clone().lerp(B,.5);
  var r1=limb([A.x,A.y,A.z],[mid.x,mid.y,mid.z],[.012,.012],std(cols[pr[0]],{emissive:cols[pr[0]],emissiveIntensity:.35}));dna.add(r1);
  var r2=limb([mid.x,mid.y,mid.z],[B.x,B.y,B.z],[.012,.012],std(cols[pr[1]],{emissive:cols[pr[1]],emissiveIntensity:.35}));dna.add(r2)}
 dna.rotation.z=.3;
 var lt=new THREE.PointLight(0x80ffe0,1.2,10);lt.position.set(2,2,3);CW.add(lt);
})();

// ---------- camera control ----------
var cam={th:.35,ph:1.45,r:3.3,tg:new V(0,.92,0)},camT={th:.35,ph:1.45,r:3.3,tg:new V(0,.92,0)},free=true,manualCam=null;
var ptrs={},lastPinch=0,dragged=0,cv=$('c');
cv.addEventListener('pointerdown',function(e){ptrs[e.pointerId]={x:e.clientX,y:e.clientY};dragged=0;cv.setPointerCapture(e.pointerId);if(Object.keys(ptrs).length===2){var k=Object.values(ptrs);lastPinch=Math.hypot(k[0].x-k[1].x,k[0].y-k[1].y)}});
cv.addEventListener('pointermove',function(e){var p=ptrs[e.pointerId];if(!p)return;var dx=e.clientX-p.x,dy=e.clientY-p.y;var n=Object.keys(ptrs).length;dragged+=Math.abs(dx)+Math.abs(dy);
 if(n===1&&free){camT.th-=dx*.008;camT.ph=Math.max(.25,Math.min(2.9,camT.ph-dy*.006))}
 p.x=e.clientX;p.y=e.clientY;
 if(n===2&&free){var k=Object.values(ptrs);var d=Math.hypot(k[0].x-k[1].x,k[0].y-k[1].y);if(lastPinch)camT.r=Math.max(.25,Math.min(5,camT.r*lastPinch/d));lastPinch=d;var my=(k[0].y+k[1].y)/2;}
});
function up(e){var was=ptrs[e.pointerId];delete ptrs[e.pointerId];lastPinch=0;if(was&&dragged<8&&Object.keys(ptrs).length===0)tap(e)}
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',function(e){delete ptrs[e.pointerId]});
cv.addEventListener('wheel',function(e){if(free)camT.r=Math.max(.25,Math.min(5,camT.r*(1+e.deltaY*.001)))},{passive:true});
var ray=new THREE.Raycaster(),mv=new THREE.Vector2();
function tap(e){if(mode!=='body'&&mode!=='tour')return;mv.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);ray.setFromCamera(mv,camera);
 var vis=pick.filter(function(m){var o=m;while(o){if(!o.visible)return false;o=o.parent}return true});
 var hits=ray.intersectObjects(vis,false);
 // skip skin if anything behind it besides skin
 var h=hits.find(function(x){return x.object.userData.id!=='skin'})||hits[0];
 if(h){showCard(h.object.userData.id);focusOn(h.point)}else hideCard()}
function focusOn(p){camT.tg.copy(p);camT.r=Math.min(camT.r,1.1)}
var hl=null,hlOld=null;
function showCard(id){var f=F[id];if(!f)return;$('card').style.setProperty('--c',f.c);$('ck').textContent=f.k;$('ch').textContent=f.h;$('cp').textContent=f.p;$('cu').innerHTML=f.u.map(function(x){return '<li>'+x+'</li>'}).join('');$('card').classList.add('on');
 if(hl)hl.forEach(function(m){if(m.material.emissiveIntensity!==undefined)m.material.emissiveIntensity=1});
 hl=pick.filter(function(m){return m.userData.id===id&&m.material.isMeshStandardMaterial});hlT=0}
var hlT=0;
function hideCard(){$('card').classList.remove('on');if(hl)hl.forEach(function(m){m.material.emissiveIntensity=1});hl=null}
$('cx').onclick=hideCard;

// ---------- UI ----------
var layerDefs=[['skin','Skin','#9fd8ff'],['muscle','Muscles','#ff6b77'],['skeleton','Skeleton','#f3ead8'],['organs','Organs','#ffb3c1'],['circ','Blood','#ff4d6d'],['nerve','Nerves','#ffd45a']];
var layerOn={skin:true,muscle:false,skeleton:true,organs:true,circ:true,nerve:false};
var layerA={};for(var k in L)layerA[k]=layerOn[k]?1:0;
function setLayer(k,v){layerOn[k]=v;renderPanel()}
function renderPanel(){var pn=$('panel');pn.innerHTML='';
 if(mode==='body'){
  var pr=document.createElement('button');pr.className='chip';pr.textContent='✨ Peel';pr.onclick=peel;pn.appendChild(pr);
  layerDefs.forEach(function(d){var b=document.createElement('button');b.className='chip'+(layerOn[d[0]]?' on':'');b.style.setProperty('--c',d[2]);b.textContent=d[1];b.onclick=function(){setLayer(d[0],!layerOn[d[0]])};pn.appendChild(b)});
 }}
var peelI=0;function peel(){var seq=[{skin:1,muscle:0,skeleton:0,organs:0,circ:0,nerve:0},{skin:.0,muscle:1,skeleton:0,organs:0,circ:0,nerve:0},{skin:1,muscle:0,skeleton:0,organs:0,circ:1,nerve:1},{skin:1,muscle:0,skeleton:1,organs:0,circ:0,nerve:0},{skin:1,muscle:0,skeleton:1,organs:1,circ:0,nerve:0},{skin:1,muscle:0,skeleton:1,organs:1,circ:1,nerve:0}];var s=seq[peelI++%seq.length];for(var k in s)layerOn[k]=!!s[k];renderPanel()}
var bpm=68;$('bpm').oninput=function(){bpm=+this.value;$('bpmv').textContent=bpm};
function setBpm(v){var st=bpm,t0=performance.now();(function a(){var k=Math.min(1,(performance.now()-t0)/1200);bpm=Math.round(st+(v-st)*k);$('bpm').value=bpm;$('bpmv').textContent=bpm;if(k<1)requestAnimationFrame(a)})()}
$('rest').onclick=function(){setBpm(65)};$('ex').onclick=function(){setBpm(155)};

var mode='body',modeT=0;
function caption(k,m,d){var c=$('cap');if(!m){c.classList.remove('on');return}if($('capm').textContent===m&&c.classList.contains('on'))return;c.classList.remove('on');setTimeout(function(){$('capk').textContent=k||'';$('capm').textContent=m;$('capd').textContent=d||'';c.classList.add('on')},250)}
function flash(){var f=$('flash');f.style.transition='none';f.style.opacity=.85;requestAnimationFrame(function(){f.style.transition='opacity .7s';f.style.opacity=0})}
function ctl(btns){var c=$('ctl');c.innerHTML='';if(!btns){c.style.display='none';return}c.style.display='flex';btns.forEach(function(b){var e=document.createElement('button');e.textContent=b[0];if(b[2])e.className='hot';e.onclick=b[1];c.appendChild(e)})}
document.querySelectorAll('#tabs button').forEach(function(b){b.onclick=function(){setMode(b.dataset.m)}});
var subs={body:'EXPLORE · TAP ANY PART',fly:'RIDE A RED BLOOD CELL',neuron:'A NERVE SIGNAL FIRING',digest:'THE DIGESTION JOURNEY',cell:'ZOOM TO CELL & DNA',tour:'GUIDED CINEMATIC TOUR',quiz:'TEST YOURSELF'};
var flyT=0,flyPaused=false,digT=0,digPaused=false,cellZoom=0,tourI=0,tourT=0;
function setMode(m){if(m==='quiz'){openQuiz();return}
 document.querySelectorAll('#tabs button').forEach(function(b){b.classList.toggle('on',b.dataset.m===m)});
 var prev=mode;mode=m;modeT=0;$('sub').textContent=subs[m];hideCard();caption();ctl();flash();
 free=(m==='body'||m==='neuron'||m==='cell');
 $('hr').style.display=(m==='body')?'flex':'none';
 $('hint').style.opacity=m==='body'?.6:0;
 flyTube.visible=rbc.visible=cells.visible=m==='fly';o2s.forEach(function(o){o.visible=false});
 food.visible=m==='digest';
 if(m==='body'){camT.th=.35;camT.ph=1.45;camT.r=3.3;camT.tg.set(0,.92,0);}
 if(m==='fly'){flyT=0;flyPaused=false;ctl([['⏸ Pause',function(){flyPaused=!flyPaused;this.textContent=flyPaused?'▶ Play':'⏸ Pause'}],['⟲ Restart',function(){flyT=0}],['💨 Exercise',function(){setBpm(bpm>100?65:155)},true]]);layerOn.skin=true;layerOn.organs=true;}
 if(m==='neuron'){camT.th=.35;camT.ph=1.4;camT.r=17;camT.tg.set(60.3,-4.4,0);ctl([['⚡ Fire signal',fire,true],['🔁 Auto',function(){autoFire=!autoFire;this.textContent=autoFire?'🔁 Auto on':'🔁 Auto off'}]]);caption('Neuron','Tap ⚡ to fire a signal','Electrical pulses jump between gaps in the fatty myelin – up to 120 m/s.');}
 if(m==='digest'){digT=0;digPaused=false;layerOn.organs=true;layerOn.skin=true;ctl([['⏸ Pause',function(){digPaused=!digPaused;this.textContent=digPaused?'▶ Play':'⏸ Pause'}],['⟲ Restart',function(){digT=0}]]);}
 if(m==='cell'){cellZoom=0;camT.th=.4;camT.ph=1.3;camT.r=8;camT.tg.set(120,0,0);ctl([['🔬 Zoom to DNA',function(){cellZoom=cellZoom?0:1;this.textContent=cellZoom?'🔭 Back to cell':'🔬 Zoom to DNA';if(cellZoom){camT.r=2.3;camT.tg.set(120,0,0);caption('DNA','The double helix','About 2 metres of DNA is packed into every cell nucleus. A pairs with T, C pairs with G.')}else{camT.r=8;cellCap()}},true]]);cellCap()}
 if(m==='tour'){tourI=0;tourT=0;ctl([['⏭ Next',function(){tourT=99}],['⏹ Stop',function(){setMode('body')}]]);}
 if(prev!==m)renderPanel();else renderPanel()}
function cellCap(){caption('Cell','One of your 37 trillion cells','Purple: nucleus · orange: mitochondria (power stations) · blue: endoplasmic reticulum.')}
$('resetb').onclick=function(){peelI=0;layerOn={skin:true,muscle:false,skeleton:true,organs:true,circ:true,nerve:false};setBpm(68);setMode('body')};

// neuron firing
var fireT=-1,autoFire=true,lastFire=0,synT=-1;
function fire(){fireT=0}
// food bolus
var food=ell([0,0,0],[.012,.012,.012],std(0x7fe07a,{emissive:0x206010}));food.visible=false;scene.add(food);
var foodGlow=sprite(GT.green,.05,0x9fff9a);food.add(foodGlow);foodGlow.scale.set(1.3,1.3,1.3);
var digPath=new THREE.CatmullRomCurve3([[0,1.565,.07],[0,1.56,.02],[0,1.52,-.02],[0,1.4,-.035],[.01,1.25,-.02],[.04,1.15,.02],[.07,1.12,.04],[.08,1.1,.03],[.05,1.08,.04]].map(function(a){return new V(a[0],a[1],a[2])}));
var digStages=[[0,'Mouth','Chewing & saliva','Teeth crush food while saliva starts breaking down starch.'],[.12,'Oesophagus','Swallowed – a 25 cm squeeze','Waves of muscle (peristalsis) push food down in about 7 seconds – even upside down!'],[.32,'Stomach','Churned in acid','Strong acid and enzymes turn food into a thick liquid called chyme.'],[.48,'Small intestine','6 metres of absorbing','Villi soak up sugars, proteins and fats into the blood.'],[.82,'Large intestine','Water reclaimed','Gut bacteria help finish the job and water is absorbed.']];
function digPos(t,out){if(t<.42){digPath.getPointAt(Math.min(1,t/.42),out)}else if(t<.8){intestine.userData.curve.getPointAt((t-.42)/.38,out)}else{colon.userData.curve.getPointAt(Math.min(1,(t-.8)/.2),out)}return out}

// tour
var tour=[
 {cam:[.35,1.45,2.7,0,1,0],L:{skin:1,skeleton:0,organs:0,circ:0,nerve:0,muscle:0},k:'Welcome',m:'Welcome inside the human body',d:'37 trillion cells working together, every second of your life.'},
 {cam:[.9,1.4,2.6,0,1.05,0],L:{skin:1,muscle:1},k:'Muscles',m:'Over 600 muscles',d:'Around 40% of your weight – and they can only pull, never push.'},
 {cam:[2.6,1.35,2.9,0,.95,0],L:{skin:1,skeleton:1},k:'Skeleton',m:'206 bones hold you up',d:'Your femur is stronger, weight for weight, than steel.'},
 {cam:[.1,1.4,.75,0,1.28,0],L:{skin:1,skeleton:1,organs:1},k:'Heart',m:'The heart: 100,000 beats a day',d:'Watch it speed up – we\'re switching to exercise mode.',fx:function(){setBpm(150)}},
 {cam:[-.4,1.35,.8,0,1.3,0],L:{skin:1,organs:1},k:'Lungs',m:'Lungs: 300 million air sacs',d:'Breathing speeds up with your heart to deliver more oxygen.'},
 {cam:[.5,1.5,3,0,.95,0],L:{skin:1,circ:1},k:'Blood',m:'100,000 km of blood vessels',d:'Red: arteries leaving the heart. Blue: veins returning.',fx:function(){setBpm(70)}},
 {cam:[3.4,1.4,2.8,0,1,0],L:{skin:1,nerve:1},k:'Nerves',m:'Your body\'s wiring',d:'Signals race from the brain, down the spinal cord to every fingertip.'},
 {cam:[.2,1.25,.55,0,1.65,0],L:{skin:1,organs:1,skeleton:0},k:'Brain',m:'86 billion neurons',d:'Runs on about 20 watts – less than a light bulb.'},
 {cam:[.6,1.5,.95,0,1.07,.03],L:{skin:1,organs:1},k:'Digestion',m:'A 9-metre food journey',d:'From mouth to colon, food takes 24 to 72 hours to pass through.'},
 {cam:[.35,1.45,2.6,0,1,0],L:{skin:1,skeleton:1,organs:1,circ:1},k:'The end',m:'Now explore it yourself',d:'Try Fly mode to ride a blood cell, or take the quiz.'}];
function applyTour(i){var s=tour[i];camT.th=s.cam[0];camT.ph=s.cam[1];camT.r=s.cam[2];camT.tg.set(s.cam[3],s.cam[4],s.cam[5]);for(var k in layerOn)layerOn[k]=!!s.L[k];caption(s.k+' · '+(i+1)+'/'+tour.length,s.m,s.d);if(s.fx)s.fx();renderPanel()}

// ---------- QUIZ ----------
var QZ=[
['How many bones are in an adult human body?',['106','206','306','186'],1,'206 – babies start with around 270, and some fuse together as they grow.'],
['Which is the largest organ of the body?',['Liver','Brain','Skin','Lungs'],2,'Your skin – about 2 m² and 4 kg.'],
['Roughly how many times does your heart beat each day?',['10,000','50,000','100,000','1 million'],2,'About 100,000 beats – that\'s over 2.5 billion in a lifetime.'],
['Where does oxygen pass into your blood?',['Alveoli','Villi','Nephrons','Ventricles'],0,'Tiny air sacs called alveoli, with walls just one cell thick.'],
['What is the longest bone?',['Tibia','Humerus','Spine','Femur'],3,'The femur (thigh bone) – about a quarter of your height.'],
['How long is your small intestine?',['About 1 m','About 6 m','About 20 m','About 50 cm'],1,'Around 6 metres, folded up inside your belly.'],
['How fast can nerve signals travel?',['1 m/s','12 m/s','120 m/s','1,200 m/s'],2,'Up to about 120 m/s – over 260 mph – in fast, myelinated nerves.'],
['Which organ can regrow itself?',['Heart','Liver','Kidney','Brain'],1,'The liver can regrow from as little as a quarter of its tissue.'],
['DNA base A always pairs with…',['C','G','T','A'],2,'A pairs with T, and C pairs with G.'],
['What do red blood cells carry?',['Oxygen','Electricity','Food','Bile'],0,'Oxygen, held by a protein called haemoglobin – about 270 million per cell.']];
var qi=0,qs2=0,qorder=[];
function openQuiz(){qorder=QZ.map(function(_,i){return i}).sort(function(){return Math.random()-.5});qi=0;qs2=0;$('quiz').style.display='flex';showQ()}
function showQ(){var b=$('qbox');if(qi>=qorder.length){var msg=qs2>=9?'Brain of Britain! 🧠':qs2>=7?'Brilliant – a natural anatomist':qs2>=5?'Nicely done':'Have a look round and try again';b.innerHTML='<div class="n">Your score</div><h2 style="font-size:44px;margin:10px 0">'+qs2+' / '+QZ.length+'</h2><div class="why">'+msg+'</div><button class="go" id="qa">Play again</button><button class="go" id="qc" style="background:#ffffff1a">Close</button>';$('qa').onclick=openQuiz;$('qc').onclick=function(){$('quiz').style.display='none'};return}
 var q=QZ[qorder[qi]];b.innerHTML='<div class="n">Question '+(qi+1)+' of '+QZ.length+' · Score '+qs2+'</div><h2>'+q[0]+'</h2>'+q[1].map(function(a,i){return '<button class="a" data-i="'+i+'">'+a+'</button>'}).join('')+'<div class="why" id="why"></div><button class="go" id="qn" style="display:none">Next</button><button class="go" id="qx" style="background:#ffffff1a">Exit quiz</button>';
 var done=false;b.querySelectorAll('.a').forEach(function(e){e.onclick=function(){if(done)return;done=true;var i=+e.dataset.i;if(i===q[2]){e.classList.add('ok');qs2++}else{e.classList.add('no');b.querySelectorAll('.a')[q[2]].classList.add('ok')}$('why').textContent=q[3];$('qn').style.display='block'}});
 $('qn').onclick=function(){qi++;showQ()};$('qx').onclick=function(){$('quiz').style.display='none'}}

// ---------- loop ----------
var clock=new THREE.Clock(),T=0,beatPh=0,breathPh=0,tmp=new V(),tmp2=new V();
function beatShape(p){var a=Math.exp(-Math.pow((p-.08)/.05,2)),b=Math.exp(-Math.pow((p-.3)/.07,2))*.6;return a*.14+b*.1}
function lerpCam(k){cam.th+=(camT.th-cam.th)*k;cam.ph+=(camT.ph-cam.ph)*k;cam.r+=(camT.r-cam.r)*k;cam.tg.lerp(camT.tg,k);camera.position.set(cam.tg.x+cam.r*Math.sin(cam.ph)*Math.sin(cam.th),cam.tg.y+cam.r*Math.cos(cam.ph),cam.tg.z+cam.r*Math.sin(cam.ph)*Math.cos(cam.th));camera.lookAt(cam.tg)}
function setOp(g,a){g.visible=a>.01;g.traverse(function(o){if(o.material&&o.material!==skinMat&&o.material.uniforms===undefined){if(o.material.userData.bo===undefined){o.material.userData.bo=o.material.opacity;o.material.userData.bt=o.material.transparent}o.material.transparent=a<.99||o.material.userData.bt;o.material.opacity=o.material.userData.bo*a;o.material.depthWrite=a>.99}})}
function loop(){requestAnimationFrame(loop);var dt=Math.min(clock.getDelta(),.05);T+=dt;modeT+=dt;scene.fog.density=(mode==='neuron'||mode==='cell')?.008:mode==='fly'?.0:.06;
 var hz=bpm/60;beatPh=(beatPh+dt*hz)%1;var br=Math.max(10,Math.min(40,bpm/4.6));breathPh=(breathPh+dt*br/60)%1;
 var bs=beatShape(beatPh);heartG.scale.setScalar(1+bs);pl.intensity=.5+bs*6;
 var bre=.5-.5*Math.cos(breathPh*Math.PI*2);lungs.forEach(function(l){l.scale.set(1+bre*.08,1+bre*.06,1+bre*.1)});
 brain.material.emissiveIntensity=1+Math.sin(T*2)*.25;
 skinMat.uniforms.t.value=T;flyTubeMat.uniforms.t.value=T;
 stomach.scale.set(1.1+Math.sin(T*1.6)*.04,.85,.7);
 // layers fade
 for(var k in L){var tgt=layerOn[k]?1:0;layerA[k]+=(tgt-layerA[k])*Math.min(1,dt*5);if(k==='skin'){skinMat.uniforms.op.value=layerA[k]*(mode==='digest'||mode==='fly'?.35:1);L.skin.visible=layerA[k]>.01}else setOp(L[k],layerA[k])}
 // highlight
 if(hl){hlT+=dt;hl.forEach(function(m){m.material.emissiveIntensity=1+(Math.sin(hlT*6)*.5+.5)*2.5})}
 // flow
 if(L.circ.visible){var sp=dt*hz*.22;for(var i=0;i<NP;i++){var pi=pinfo[i];pi.t=(pi.t+sp*pi.s)%1;pi.c.c.getPointAt(pi.t,tmp);ppos[i*3]=tmp.x;ppos[i*3+1]=tmp.y;ppos[i*3+2]=tmp.z}pgeo.attributes.position.needsUpdate=true}
 if(L.nerve.visible)nsp.forEach(function(n){n.t+=dt*n.v*.5;if(n.t>1)n.t=0;n.c.getPointAt(n.t,n.s.position);n.s.material.opacity=Math.sin(n.t*Math.PI)});
 ring.material.opacity=.3+Math.sin(T*2)*.15;
 if(mode==='body'){if(free&&!Object.keys(ptrs).length&&modeT>6&&!$('card').classList.contains('on'))camT.th+=dt*.08;lerpCam(Math.min(1,dt*4))}
 else if(mode==='tour'){tourT+=dt;if(modeT<.1||tourT>7.5){if(modeT>=.1)tourI++;tourT=0;if(tourI>=tour.length){setMode('body');return}applyTour(tourI)}camT.th+=dt*.05;lerpCam(Math.min(1,dt*1.4));$('prog').style.width=((tourI+tourT/7.5)/tour.length*100)+'%'}
 else if(mode==='fly'){if(!flyPaused)flyT+=dt*(.018+hz*.008);if(flyT>1)flyT=0;
  var t=flyT;flyPath.getPointAt(t,tmp);flyPath.getPointAt(Math.min(1,t+.012),tmp2);
  camera.position.copy(tmp);camera.up.set(0,1,0);camera.lookAt(tmp2);
  var o2=t<.38?0:t<.48?(t-.38)/.1:1;flyTubeMat.uniforms.o2.value=o2;
  rbcMat.color.setRGB(.45+o2*.5,.08+o2*.04,.15);rbcMat.emissive.setRGB(.15+o2*.2,0,.05);
  flyPath.getPointAt(Math.min(1,t+.006),rbc.position);rbc.position.y-=.002;rbc.rotation.set(T*.7,T*.5,0);
  cellArr.forEach(function(c){var u=c.userData;u.t=(u.t+dt*.004*u.v+1)%1;var ct=(t+u.t*.15)%1;flyPath.getPointAt(ct,c.position);c.position.addScaledVector(u.o,.6);c.rotation.set(T*u.r.x,T*u.r.y,0);var oo=ct<.38?0:ct<.48?(ct-.38)/.1:1;c.material.color.setRGB(.45+oo*.5,.08+oo*.04,.15)});
  var inLung=t>.36&&t<.5;o2s.forEach(function(o,i){o.visible=inLung;if(inLung){var a=T*2+i;o.position.copy(rbc.position).add(new V(Math.sin(a*1.3+i)*.01,Math.cos(a+i*2)*.01,Math.sin(a*.7+i)*.01).multiplyScalar(1-((T*.6+i/40)%1)))}});
  var beatK=1+bs*.3;flyTube.scale.set(1,1,1);
  if(t<.2)caption('Vein · 1/5','Riding back to the heart','I\'m low on oxygen, so I\'m a darker red. Valves stop me slipping backwards.');
  else if(t<.33)caption('Heart · 2/5','Through the right side of the heart','Squeezed '+bpm+' times a minute – it\'s pumping me towards the lungs.');
  else if(t<.52)caption('Lungs · 3/5','Gas exchange!','Carbon dioxide out, oxygen in – my haemoglobin turns bright red in a quarter of a second.');
  else if(t<.72)caption('Heart · 4/5','Back to the left side – the power pump','The strongest chamber launches me into the aorta.');
  else caption('Brain · 5/5','Up the carotid artery to the brain','Your brain takes about 15% of all your blood – delivery complete!');
  $('prog').style.width=(t*100)+'%'}
 else if(mode==='neuron'){
  if(autoFire&&T-lastFire>3&&fireT<0){fireT=0}
  var ac=NW.userData.ac;
  if(fireT>=0){if(fireT===0)lastFire=T;fireT+=dt*.45;var ft=Math.min(1,fireT);var jump=Math.floor(ft*12)/12+Math.pow((ft*12)%1,4)/12;pulse.visible=true;ac.getPointAt(Math.min(1,jump),pulse.position);pulse.scale.setScalar(1+Math.sin(T*30)*.2);neuronMats[0].emissiveIntensity=1+(fireT<.1?(1-fireT*10)*3:0);if(fireT>=1){fireT=-1;pulse.visible=false;synT=0}}
  if(synT>=0){synT+=dt*.7;var sy=NW.userData.syn;vesicles.forEach(function(v,i){v.visible=synT<1;var a=i*2.4;v.position.set(sy.x+.5+synT*2.2*((i%5)/5+.6),sy.y+Math.sin(a)*synT*1.4,sy.z+Math.cos(a)*synT*1.4);v.material.opacity=1-synT});if(synT>1)synT=-1;caption('Synapse','Chemical messengers cross the gap','Neurotransmitters leap a 20-nanometre gap to excite the next neuron.')}
  else if(fireT>=0)caption('Action potential','Signal racing down the axon','It jumps between gaps in the white myelin sheath – that\'s what makes it so fast.');
  lerpCam(Math.min(1,dt*3))}
 else if(mode==='digest'){if(!digPaused)digT+=dt*.028;if(digT>1)digT=0;digPos(digT,food.position);var sc=digT<.32?1:digT<.48?1-(digT-.32)/.16*.5:.5;food.scale.setScalar(sc*.02);
  var st=digStages[0];digStages.forEach(function(s){if(digT>=s[0])st=s});caption(st[1]+' · '+(digStages.indexOf(st)+1)+'/5',st[2],st[3]);
  camT.tg.copy(food.position);camT.r=.75;camT.ph=1.35;camT.th=.6+Math.sin(T*.2)*.4;lerpCam(Math.min(1,dt*2.5));$('prog').style.width=(digT*100)+'%';
  for(var k2 in layerOn)layerOn[k2]=(k2==='organs')}
 else if(mode==='cell'){dna.rotation.y+=dt*.6;dna.visible=true;CW.userData.nuc.material.opacity=.55-cellZoom*.47;CW.userData.nl.visible=!cellZoom;CW.rotation.y+=dt*.04;lerpCam(Math.min(1,dt*2))}
 if(mode!=='fly'&&mode!=='tour'&&mode!=='digest')$('prog').style.width='0';
 renderer.render(scene,camera)}
addEventListener('resize',function(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
renderPanel();lerpCam(1);
setTimeout(function(){$('load').style.opacity=0;setTimeout(function(){$('load').style.display='none'},800)},400);
setTimeout(function(){$('hint').style.opacity=0},7000);
window.__hb={scene:scene,setMode:setMode,showCard:showCard,layerOn:layerOn,renderPanel:renderPanel,peel:peel,setBpm:setBpm,openQuiz:openQuiz};
loop();
})();
