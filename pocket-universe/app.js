(function(){'use strict';
var $=function(i){return document.getElementById(i)};
var Q=(new URLSearchParams(location.search).get('q'))||((/iPhone|Android/.test(navigator.userAgent))?'medium':'high');
var N={low:14000,medium:30000,high:60000}[Q]||30000;
var PR=Math.min(window.devicePixelRatio||1,{low:1,medium:1.6,high:2}[Q]||1.6);
var renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
renderer.setPixelRatio(PR);renderer.setSize(innerWidth,innerHeight);document.body.insertBefore(renderer.domElement,document.body.firstChild);
var scene=new THREE.Scene();var camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.05,4000);
function rnd(){return Math.random()}function gauss(){return (rnd()+rnd()+rnd()+rnd()-2)/2}
// ---------- cosmology ----------
var H0=67.7*1000/3.0857e22, Or=9.1e-5, Om=0.3111, OL=0.6889, YR=3.15576e7, GLY=9.4607e24, OBS=8.8e26;
var TA=[],LA=[];(function(){var la=Math.log(1e-30),a=Math.exp(la),t=a*a/(2*H0*Math.sqrt(Or)),st=(0-la)/6000;
for(var i=0;i<=6000;i++){TA.push(Math.log10(t));LA.push(la);var a0=Math.exp(la),a1=Math.exp(la+st),am=Math.exp(la+st/2);
var f=function(a){return 1/(H0*Math.sqrt(Or/(a*a*a*a)+Om/(a*a*a)+OL))};t+=st/6*(f(a0)+4*f(am)+f(a1));la+=st}})();
var LOGNOW=TA[TA.length-1];
function aOf(lt){if(lt<-32){ if(lt<-36) return Math.exp(LA[0])*Math.pow(10,-26); var f=(lt+36)/4; return Math.exp(LA[0])*Math.pow(10,-26*(1-f));}
 if(lt<=TA[0]){return Math.exp(LA[0])*Math.pow(10,(lt-TA[0])/2)}
 var lo=0,hi=TA.length-1;while(hi-lo>1){var m=(lo+hi)>>1;if(TA[m]<lt)lo=m;else hi=m}var f=(lt-TA[lo])/(TA[hi]-TA[lo]);return Math.exp(LA[lo]+f*(LA[hi]-LA[lo]))}
function fmtE(x,u){if(x===0)return '0 '+u;var e=Math.floor(Math.log10(x)),m=x/Math.pow(10,e);if(e>=-2&&e<6)return (x<10?x.toPrecision(3):Math.round(x).toLocaleString('en-GB'))+' '+u;return m.toFixed(1)+'×10'+sup(e)+' '+u}
function sup(e){return String(e).split('').map(function(c){return '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)]||'⁻'}).join('')}
function fmtAge(lt){var t=Math.pow(10,lt);if(lt<=-43.5)return '0 s';if(t<1)return fmtE(t,'s');if(t<60)return t.toFixed(1)+' s';if(t<3600)return (t/60).toFixed(1)+' min';if(t<86400*3)return (t/3600).toFixed(1)+' hours';var y=t/YR;if(y<1)return (t/86400).toFixed(0)+' days';if(y<1e3)return y.toFixed(0)+' years';if(y<1e6)return Math.round(y).toLocaleString('en-GB')+' years';if(y<1e9)return (y/1e6).toFixed(y<1e7?1:0)+' million yrs';return (y/1e9).toFixed(2)+' billion yrs'}
function fmtLen(m){if(m<1e-3)return fmtE(m,'m');if(m<1)return (m*100).toFixed(1)+' cm';if(m<1000)return m.toFixed(1)+' m';if(m<1e8)return fmtE(m/1000,'km');var ly=m/9.4607e15;if(ly<1e6)return fmtE(ly,'light-yrs');if(ly<1e9)return (ly/1e6).toFixed(1)+' million ly';return (ly/1e9).toFixed(1)+' billion ly'}
function fmtT(K){if(K>1e6)return fmtE(K,'K');if(K>200)return Math.round(K).toLocaleString('en-GB')+' K';return K.toFixed(2)+' K ('+(K-273.15).toFixed(0)+'°C)'}
// ---------- eras ----------
var ERAS=[
 {n:'The Beginning',a:-43.5,b:-36,L:0,w:'t = 0 to 10⁻³⁶ s',c:'Everything you will ever see — every galaxy, star and atom — is packed into a region far smaller than a proton, hotter than anything since.',f:[['Planck time','10⁻⁴³ s is the Planck time: the earliest moment our physics can describe. Before it, gravity and quantum mechanics must merge into a theory we do not yet have.'],['One force?','At these energies gravity, electromagnetism and the nuclear forces may have been a single unified force, splitting apart as the universe cooled.']]},
 {n:'Inflation',a:-36,b:-32,L:1,w:'10⁻³⁶ to 10⁻³² s',c:'Inflation: space itself balloons by a factor of about 10²⁶ in a trillionth of a trillionth of a trillionth of a second. Tiny quantum jitters are stretched into the seeds of every future galaxy.',f:[['Faster than light?','Nothing moves through space faster than light — but space itself can stretch at any rate. A region smaller than an atom grows to the size of a grapefruit or more.'],['Why so smooth?','Inflation explains why the sky looks the same temperature in every direction to 1 part in 100,000: it all came from one tiny, well-mixed patch.']]},
 {n:'Quark Soup',a:-32,b:-6,L:2,w:'10⁻³² s to 1 microsecond',c:'Inflation ends and its energy floods out as a seething quark–gluon plasma: quarks, gluons, electrons and photons in a trillion-degree soup.',f:[['Recreated on Earth','CERN\'s Large Hadron Collider recreates droplets of quark–gluon plasma by smashing lead nuclei together at near light-speed.'],['Matter wins','For every billion antimatter particles there were a billion and one matter particles. Everything that exists today is that one-in-a-billion leftover.']]},
 {n:'Protons & Neutrons',a:-6,b:2,L:3,w:'1 µs to 100 s',c:'At about a millionth of a second the soup cools enough for quarks to lock together in threes — the first protons and neutrons.',f:[['Ghost particles','At around one second, neutrinos stop interacting and stream away freely. A cosmic neutrino background from this moment still fills space today.'],['Annihilation','Matter and antimatter annihilate in a blaze of light, leaving roughly a billion photons for every proton.']]},
 {n:'Nucleosynthesis',a:2,b:3.3,L:4,w:'100 s to 20 minutes',c:'The whole universe becomes a nuclear reactor for twenty minutes, fusing about a quarter of all matter into helium, plus traces of lithium.',f:[['Recipe check','The predicted ratio — about 75% hydrogen, 25% helium by mass — matches what astronomers measure in the oldest gas clouds. A triumph of the Big Bang theory.'],['Not heavier','Expansion cooled things too fast to make carbon, oxygen or iron. Those had to wait for stars.']]},
 {n:'Photon Fog',a:3.3,b:13.05,L:5,w:'20 min to 380,000 years',c:'For 380,000 years the universe is an opaque glowing fog: light cannot travel far before bouncing off free electrons.',f:[['Like the Sun\'s surface','The whole universe glowed like the surface of a star — and was just as impossible to see through.'],['Radiation to matter','About 50,000 years in, matter overtakes radiation as the dominant ingredient — watch the readout bar shift.']]},
 {n:'The First Light (CMB)',a:13.05,b:13.4,L:6,w:'≈380,000 years',c:'At 3,000 K electrons join nuclei to make atoms, and the fog clears. That released light still reaches us today as the Cosmic Microwave Background.',f:[['Baby picture','The mottled pattern you see is the CMB: hot and cold spots differ by just 0.001%. They are the stretched quantum seeds from inflation.'],['On old TVs','About 1% of the static on an untuned analogue TV was CMB light from the Big Bang.']]},
 {n:'The Dark Ages',a:13.4,b:15.5,L:7,w:'380,000 to 100 million years',c:'No stars yet. In total darkness, dark matter\'s gravity quietly pulls gas into a vast web of filaments.',f:[['Dark matter','About 85% of matter is invisible dark matter. Without its extra gravity, galaxies would not have formed in time.'],['21 cm','Radio telescopes like LOFAR and SKA hunt for the faint 21 cm glow of hydrogen from this era.']]},
 {n:'The First Stars',a:15.5,b:16.1,L:8,w:'100 to 400 million years',c:'Cosmic dawn: the first giant blue stars ignite in the densest knots of the web, forging carbon, oxygen and iron and exploding as supernovae.',f:[['Monsters','The first stars may have been hundreds of times the Sun\'s mass, living just a few million years.'],['JWST','The James Webb Space Telescope has seen galaxies from just 300 million years after the Big Bang.']]},
 {n:'Galaxies & the Cosmic Web',a:16.1,b:17.15,L:9,w:'400 million to 4.5 billion years',c:'Galaxies merge and grow along the filaments of the cosmic web — the largest structure in existence.',f:[['Cosmic web','Galaxies sit on filaments hundreds of millions of light-years long, surrounding enormous empty voids.'],['Dark energy wakes','Around 9.8 billion years in, dark energy overtakes matter and the expansion starts to speed up.']]},
 {n:'The Milky Way',a:17.15,b:17.464,L:10,w:'4.5 to 9.2 billion years',c:'Our galaxy settles into a barred spiral 100,000 light-years across, with a few hundred billion stars and a black hole at its heart.',f:[['Sagittarius A*','A black hole of 4 million Suns sits at the centre. It was photographed by the Event Horizon Telescope in 2022.'],['One lap','The Sun takes about 230 million years to orbit the galaxy once — the last time it was here, dinosaurs were just appearing.']]},
 {n:'The Sun & Earth',a:17.464,b:17.5,L:11,w:'9.2 to 10 billion years',c:'4.6 billion years ago a gas cloud collapses into the Sun. Leftover dust clumps into planets — including a small rocky one, third from the Sun.',f:[['Stardust','The iron in your blood and the calcium in your bones were forged in stars that died before the Sun was born.'],['The Moon','A Mars-sized planet hit the young Earth; the debris formed the Moon.']]},
 {n:'Life & Today',a:17.5,b:17.6393,L:12,w:'3.8 billion years ago to now',c:'Life appears within a few hundred million years. Oxygen, plants, dinosaurs, then us — 13.8 billion years after the Big Bang.',f:[['The cosmic calendar','Squash the universe\'s history into one year: Earth forms in early September, and all of human history happens in the final 14 seconds of 31 December.'],['Still expanding','Today dark energy makes up about 69% of the universe, and distant galaxies are flying away faster every year.']]}
];
var NE=ERAS.length;
function ltOf(u){u=Math.max(0,Math.min(0.99999,u))*NE;var i=Math.floor(u),f=u-i,e=ERAS[i];return {i:i,f:f,lt:e.a+f*(e.b-e.a)}}
(function(){var t=$('ticks'),labs=['0','10⁻³²s','1s','380k yr','1 Gyr','now'],pos=[0,2,4,6.5,9,13];labs.forEach(function(l,k){var s=document.createElement('span');s.textContent=l;s.style.left=Math.min(97,Math.max(3,pos[k]/NE*100))+'%';t.appendChild(s)})})();
// ---------- layouts ----------
var C=new THREE.Color();
function mk(){return {p:new Float32Array(N*3),c:new Float32Array(N*3),s:new Float32Array(N)}}
function put(L,i,x,y,z,col,sz){L.p[i*3]=x;L.p[i*3+1]=y;L.p[i*3+2]=z;L.c[i*3]=col.r;L.c[i*3+1]=col.g;L.c[i*3+2]=col.b;L.s[i]=sz}
function sph(r){var u=rnd()*2-1,t=rnd()*6.283,s=Math.sqrt(1-u*u);return [s*Math.cos(t)*r,u*r,s*Math.sin(t)*r]}
function ball(R,pw){return sph(R*Math.pow(rnd(),pw||1/3))}
function noise3(x,y,z){return Math.sin(x*1.7+Math.sin(y*2.3))*Math.cos(y*1.3+z*.7)+Math.sin(z*2.1+x*.9)*.6+Math.sin((x+y+z)*3.1)*.25}
var W=[];(function(){for(var k=0;k<70;k++)W.push(ball(45,0.5))})();
var EDGES=[];W.forEach(function(a,i){var d=W.map(function(b,j){return [(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2,j]}).sort(function(x,y){return x[0]-y[0]});for(var k=1;k<4;k++)if(d[k][1]>i)EDGES.push([i,d[k][1]])});
function webPt(spread){var r=rnd();if(r<0.35){var n=W[(rnd()*W.length)|0],q=ball(spread*2.2,0.8);return [n[0]+q[0],n[1]+q[1],n[2]+q[2],2]}if(r<0.92){var e=EDGES[(rnd()*EDGES.length)|0],a=W[e[0]],b=W[e[1]],t=rnd(),q=ball(spread,0.6);return [a[0]+(b[0]-a[0])*t+q[0],a[1]+(b[1]-a[1])*t+q[1],a[2]+(b[2]-a[2])*t+q[2],1]}var q=ball(48);return [q[0],q[1],q[2],0]}
var GEN=[
 function(L){for(var i=0;i<N;i++){var q=ball(1.2,0.6),r=Math.hypot(q[0],q[1],q[2]);C.setRGB(.6,.55-r*0.2,.45-r*0.3);put(L,i,q[0],q[1],q[2],C,.7)}},
 function(L){for(var i=0;i<N;i++){var q=ball(30),h=0.03*noise3(q[0]*.2,q[1]*.2,q[2]*.2);C.setRGB(1,0.85+h,0.6+h*4);put(L,i,q[0],q[1],q[2],C,1.3)}},
 function(L){var cols=[[1,.25,.2],[.25,1,.35],[.3,.45,1],[1,1,1],[1,.8,.3]];for(var i=0;i<N;i++){var q=ball(28),c=cols[(rnd()*5)|0];C.setRGB(c[0],c[1],c[2]);put(L,i,q[0],q[1],q[2],C,1.4)}},
 function(L){var i=0;while(i<N){var c=ball(28),n=rnd()<0.5;for(var k=0;k<3&&i<N;k++,i++){var q=ball(0.35);if(k==2&&n)C.setRGB(.6,.6,.7);else C.setRGB(1,.4+(k==0?0:.3),.25);if(rnd()<0.3){q=ball(28);C.setRGB(1,1,.85);put(L,i,q[0],q[1],q[2],C,.6);continue}put(L,i,c[0]+q[0],c[1]+q[1],c[2]+q[2],C,2.2)}}},
 function(L){var i=0;while(i<N){var c=ball(28),he=rnd()<0.08;var m=he?4:1;for(var k=0;k<m&&i<N;k++,i++){var q=ball(0.3);if(he)C.setRGB(1,.85,.3);else C.setRGB(1,.45,.35);if(!he&&rnd()<0.5){q=ball(28);C.setRGB(1,.95,.7);put(L,i,q[0],q[1],q[2],C,.7);continue}put(L,i,c[0]+q[0],c[1]+q[1],c[2]+q[2],C,he?1.8:2.4)}}},
 function(L){for(var i=0;i<N;i++){var q=ball(30),h=noise3(q[0]*.15,q[1]*.15,q[2]*.15)*.08;C.setRGB(1,.55+h,.25+h);put(L,i,q[0],q[1],q[2],C,1.5)}},
 function(L){for(var i=0;i<N;i++){var q=sph(30+rnd()*.6),v=noise3(q[0]*.18,q[1]*.18,q[2]*.18)+0.5*noise3(q[0]*.5,q[1]*.5,q[2]*.5);v=Math.max(-1,Math.min(1,v/1.5));if(v>0)C.setRGB(1,1-v*.5,.3-v*.3);else C.setRGB(.2+(1+v)*.6,.45+(1+v)*.4,1);put(L,i,q[0],q[1],q[2],C,3.2)}},
 function(L){for(var i=0;i<N;i++){var q=webPt(4),b=.18+rnd()*.15;C.setRGB(b*.8,b*.6,b*1.2);put(L,i,q[0],q[1],q[2],C,1.6)}},
 function(L){for(var i=0;i<N;i++){var q=webPt(3);if(q[3]==2&&rnd()<0.25){C.setRGB(.55,.75,1);put(L,i,q[0],q[1],q[2],C,2.4)}else{var b=.2+rnd()*.2;C.setRGB(b*.7,b*.6,b*1.3);put(L,i,q[0],q[1],q[2],C,1.3)}}},
 function(L){for(var i=0;i<N;i++){var q=webPt(2.2),g=q[3]==2;if(g&&rnd()<.5)C.setRGB(1,.9,.75);else if(q[3]==1)C.setRGB(.55,.65,1);else C.setRGB(.25,.25,.45);put(L,i,q[0],q[1],q[2],C,g?1.5:1)}},
 function(L){for(var i=0;i<N;i++){var r=rnd();if(r<0.15){var q=ball(5,.5);q[1]*=.6;C.setRGB(1,.8,.5);put(L,i,q[0],q[1],q[2],C,.9)}else if(r<0.9){var arm=(rnd()*2)|0,d=6+Math.pow(rnd(),.8)*42,th=arm*Math.PI+Math.log(d/6)*2.2+gauss()*0.35,y=gauss()*0.8;var x=Math.cos(th)*d,z=Math.sin(th)*d;var hot=rnd()<0.25;if(hot)C.setRGB(.6,.75,1);else if(rnd()<.08)C.setRGB(1,.4,.6);else C.setRGB(.95,.9,1);put(L,i,x,y,z,C,hot?1.4:1)}else{var q=ball(55,.4);C.setRGB(.6,.6,.8);put(L,i,q[0],q[1]*.5,q[2],C,.7)}}},
 function(L){var pl=[[6,.9,.8,.7],[9,.95,.8,.5],[12.5,.3,.6,1],[16,1,.45,.3],[24,1,.8,.6],[31,1,.9,.6],[37,.6,.9,1],[42,.4,.6,1]];for(var i=0;i<N;i++){var r=rnd();if(r<0.3){var q=ball(3,.5);C.setRGB(1,.85+rnd()*.15,.4);put(L,i,q[0],q[1],q[2],C,1.6)}else if(r<0.5){var p=pl[(rnd()*8)|0],th=rnd()*6.283;C.setRGB(p[1]*.35,p[2]*.35,p[3]*.35);put(L,i,Math.cos(th)*p[0],0,Math.sin(th)*p[0],C,.6)}else if(r<0.75){var k=(rnd()*8)|0,p=pl[k],ang=k*1.3,q=ball(k==4||k==5?1.1:.5,.5);C.setRGB(p[1],p[2],p[3]);put(L,i,Math.cos(ang)*p[0]+q[0],q[1],Math.sin(ang)*p[0]+q[2],C,1.1)}else{var d=19+rnd()*3,th=rnd()*6.283;C.setRGB(.5,.45,.4);put(L,i,Math.cos(th)*d,gauss()*.4,Math.sin(th)*d,C,.6)}}},
 function(L){for(var i=0;i<N;i++){var r=rnd();if(r<0.72){var q=sph(10),n=noise3(q[0]*.22,q[1]*.22,q[2]*.22)+.4*noise3(q[0]*.6,q[1]*.6,q[2]*.6),lat=Math.abs(q[1])/10;if(lat>.88)C.setRGB(.95,.97,1);else if(n>.35)C.setRGB(.25+n*.2,.55-n*.15,.2);else C.setRGB(.05,.2,.8);put(L,i,q[0],q[1],q[2],C,1.6)}else if(r<0.9){var q=sph(10.35);if(noise3(q[0]*.4+5,q[1]*.4,q[2]*.4)>.5){C.setRGB(1,1,1);put(L,i,q[0],q[1],q[2],C,1.2)}else{q=sph(10.7);C.setRGB(.1,.3,.7);put(L,i,q[0],q[1],q[2],C,.9)}}else{var q=sph(2.7);C.setRGB(.7,.7,.7);put(L,i,q[0]+30,q[1]+3,q[2]-10,C,1)}}}
];
var CAMD=[7,70,62,60,60,62,100,95,95,100,105,70,42];
var HERE=[null,null,null,null,null,null,null,null,null,[0,0,0],[26,0,8],[12.5*Math.cos(2*1.3),0,12.5*Math.sin(2*1.3)],[ -3.5,6,8.6]];
var LAY=[];var lt=$('lt');
// ---------- particles ----------
var geo=new THREE.BufferGeometry();var A={pA:3,pB:3,cA:3,cB:3,sA:1,sB:1};var rr=new Float32Array(N);for(var i=0;i<N;i++)rr[i]=rnd();
Object.keys(A).forEach(function(k){geo.setAttribute(k,new THREE.BufferAttribute(new Float32Array(N*A[k]),A[k]))});geo.setAttribute('position',geo.attributes.pA);geo.setAttribute('rr',new THREE.BufferAttribute(rr,1));
var U={uM:{value:0},uT:{value:0},uS:{value:1},uPR:{value:PR*innerHeight/800},uJ:{value:0},uHeat:{value:0},uRip:{value:0},uBr:{value:1},uSpin:{value:0}};
var mat=new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
vertexShader:'attribute vec3 pA,pB,cA,cB;attribute float sA,sB,rr;uniform float uM,uT,uS,uPR,uJ,uHeat,uRip,uSpin;varying vec3 vC;varying float vA;'+
'void main(){float m=smoothstep(0.,1.,uM);vec3 p=mix(pA,pB,m);float sw=sin(m*3.1416)*8.;p+=normalize(p+vec3(.01))*sw*(rr-.5);'+
'float a=uSpin*(1.2/(1.+length(p.xz)*.05));float cs=cos(a),sn=sin(a);p.xz=mat2(cs,-sn,sn,cs)*p.xz;p*=uS;'+
'p+=uJ*vec3(sin(uT*3.+rr*40.),cos(uT*2.7+rr*31.),sin(uT*3.3+rr*17.));p+=normalize(p+vec3(.01))*uRip*rr*rr*60.;'+
'vec3 c=mix(cA,cB,m);c=mix(c,vec3(1.,.7+.3*rr,.5),uHeat);vC=c;vA=1.-uRip*.6;vec4 mv=modelViewMatrix*vec4(p,1.);'+
'gl_PointSize=clamp(mix(sA,sB,m)*uPR*90./-mv.z*(.7+.6*rr),1.,64.);gl_Position=projectionMatrix*mv;}',
fragmentShader:'uniform float uBr;varying vec3 vC;varying float vA;void main(){vec2 d=gl_PointCoord-.5;float r=dot(d,d)*4.;if(r>1.)discard;float g=exp(-r*3.5);gl_FragColor=vec4(vC*g*uBr*.75,1.)*vA;}'});
var pts=new THREE.Points(geo,mat);pts.frustumCulled=false;scene.add(pts);
// background stars
(function(){var n=Q=='low'?1500:3000,g=new THREE.BufferGeometry(),p=new Float32Array(n*3);for(var i=0;i<n;i++){var q=sph(1500+rnd()*500);p.set(q,i*3)}g.setAttribute('position',new THREE.BufferAttribute(p,3));
window.__bg=new THREE.Points(g,new THREE.PointsMaterial({color:0x8899cc,size:1.5,sizeAttenuation:false,transparent:true,opacity:0}));scene.add(__bg)})();
var curL=-1,mixT=1,from=-1;
function setFromCurrent(){var m=Math.min(1,mixT);m=m*m*(3-2*m);['p','c','s'].forEach(function(k,ix){var a=geo.attributes[k+'A'],b=geo.attributes[k+'B'];for(var i=0;i<a.array.length;i++)a.array[i]+= (b.array[i]-a.array[i])*m;a.needsUpdate=true})}
function goLayout(L,instant){if(L===curL)return;if(curL<0||instant){['p','c','s'].forEach(function(k){geo.attributes[k+'A'].array.set(LAY[L][k]);geo.attributes[k+'B'].array.set(LAY[L][k]);geo.attributes[k+'A'].needsUpdate=geo.attributes[k+'B'].needsUpdate=true});mixT=1}
 else{setFromCurrent();['p','c','s'].forEach(function(k){geo.attributes[k+'B'].array.set(LAY[L][k]);geo.attributes[k+'B'].needsUpdate=true});mixT=0}curL=L}
// ---------- camera ----------
var cam={yaw:0.6,pitch:0.35,dist:60,tgt:new THREE.Vector3(),dT:60,tT:new THREE.Vector3()};var fly=false,flyPos=new THREE.Vector3(0,10,90),flyYaw=0,flyPitch=0,flyV=0,autoRot=true;
var ptrs={},pinch0=0,downAt=0,downXY=null,moved=0;
var cv=renderer.domElement;
cv.addEventListener('pointerdown',function(e){ptrs[e.pointerId]=[e.clientX,e.clientY];downAt=performance.now();downXY=[e.clientX,e.clientY];moved=0;autoRot=false;var k=Object.keys(ptrs);if(k.length==2){var a=ptrs[k[0]],b=ptrs[k[1]];pinch0=Math.hypot(a[0]-b[0],a[1]-b[1])}});
cv.addEventListener('pointermove',function(e){if(!ptrs[e.pointerId])return;var o=ptrs[e.pointerId],dx=e.clientX-o[0],dy=e.clientY-o[1];ptrs[e.pointerId]=[e.clientX,e.clientY];moved+=Math.abs(dx)+Math.abs(dy);var k=Object.keys(ptrs);
 if(k.length==2){var a=ptrs[k[0]],b=ptrs[k[1]],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch0){var f=pinch0/d;if(fly)flyPos.addScaledVector(fwdVec(),(1-f)*40);else cam.dT=Math.max(.5,Math.min(400,cam.dT*f))}pinch0=d;return}
 if(fly){flyYaw-=dx*.005;flyPitch=Math.max(-1.5,Math.min(1.5,flyPitch-dy*.005))}else{cam.yaw-=dx*.006;cam.pitch=Math.max(-1.45,Math.min(1.45,cam.pitch+dy*.006))}});
function up(e){delete ptrs[e.pointerId];pinch0=0;if(moved<10&&performance.now()-downAt<350&&downXY)tap(downXY[0],downXY[1])}
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',function(e){delete ptrs[e.pointerId]});
cv.addEventListener('wheel',function(e){cam.dT=Math.max(.5,Math.min(400,cam.dT*(1+e.deltaY*.001)))},{passive:true});
function fwdVec(){return new THREE.Vector3(-Math.sin(flyYaw)*Math.cos(flyPitch),Math.sin(flyPitch),-Math.cos(flyYaw)*Math.cos(flyPitch))}
function hold(id,v){var b=$(id);b.addEventListener('pointerdown',function(e){e.preventDefault();flyV=v});['pointerup','pointerleave','pointercancel'].forEach(function(ev){b.addEventListener(ev,function(){flyV=0})})}hold('fwd',1);hold('back',-1);
// ---------- UI state ----------
var u=0,era=-1,lastLt=-43.5,mode='explore',tour=null,zoom=null,sand=null;
var scrub=$('scrub');scrub.addEventListener('input',function(){stopAuto();setU(+scrub.value)});
function caption(t,ms){var c=$('cap');c.textContent=t;c.style.opacity=t?1:0;clearTimeout(caption.h);if(t&&ms)caption.h=setTimeout(function(){c.style.opacity=0},ms)}
function setU(v){u=v;scrub.value=v;var r=ltOf(v);lastLt=r.lt;if(r.i!==era){era=r.i;var e=ERAS[era];$('en').textContent=e.n;$('ew').textContent=e.w;goLayout(e.L);cam.dT=CAMD[e.L];cam.tT.set(0,0,0);if(!tour&&!zoom)caption(e.c,7000);audioEra()}readouts(r.lt)}
function readouts(l){var a=aOf(l),inf=l>=-36&&l<-32,pre=l<-36;$('rAge').textContent=fmtAge(l);
 var T=pre?1.4e32*Math.pow(10,(-43-Math.max(l,-43))/2):inf?0:2.725/a;$('rT').textContent=inf?'≈0 (supercooled)':fmtT(T);
 $('rS').textContent=fmtLen(OBS*a);var m,r,L;if(pre||inf){m=0;r=pre?100:0;L=inf?100:0}else{var x=Om/(a*a*a),y=Or/(a*a*a*a),z=OL,s=x+y+z;m=100*x/s;r=100*y/s;L=100*z/s}
 $('bM').style.width=m+'%';$('bR').style.width=r+'%';$('bL').style.width=L+'%';$('lM').textContent='Matter '+m.toFixed(m<1&&m>0?2:0)+'%';$('lR').textContent='Rad. '+r.toFixed(r<1&&r>0?2:0)+'%';$('lL').textContent=(inf?'Inflaton ':'DE ')+L.toFixed(L<1&&L>0?2:0)+'%'}
$('read').title='*Size: today\'s observable universe, scaled back to that moment';
// facts
function tap(x,y){if(document.body.classList.contains('photo'))return;var e=ERAS[era];var i=Math.min(1,Math.floor(rnd()*2));if(x<innerWidth/2)i=0;else i=1;showFact(e.f[i][0],e.f[i][1])}
function showFact(h,b){$('fh').textContent=h;$('fb').textContent=b;$('fact').style.display='block'}
$('fx').onclick=function(){$('fact').style.display='none'};
$('bFact').onclick=function(){var e=ERAS[era];showFact(e.n,e.c+'  '+e.f.map(function(f){return '• '+f[0]+': '+f[1]}).join('  '))};
// tour
function stopAuto(){if(tour){tour=null;$('bTour').classList.remove('on');$('bTour').textContent='▶ Tour';caption('')}if(zoom){zoom=null;$('bHere').classList.remove('on');$('here').style.display='none'}}
$('bTour').onclick=function(){if(tour){stopAuto();return}stopAuto();closeSand();tour={t:0};autoRot=true;$('bTour').classList.add('on');$('bTour').textContent='■ Stop';setU(0)};
var TOURSEC=9;
// you are here
$('bHere').onclick=function(){if(zoom){stopAuto();return}stopAuto();closeSand();zoom={t:0,k:-1};$('bHere').classList.add('on')};
var ZS=[{L:9,u:9.6,cap:'The cosmic web: billions of galaxies strung along filaments. We live in one small knot of it.',d:110,d2:45},{L:10,u:10.95,cap:'Zooming in: the Milky Way. Our Sun sits on a spiral arm, about 26,000 light-years from the centre.',d:110,d2:20},{L:11,u:11.5,cap:'The Solar System: eight planets around an ordinary star. We are the third rock from the Sun.',d:70,d2:12},{L:12,u:12.98,cap:'Earth. Pale blue dot, home of everyone you have ever known.',d:40,d2:24}];
// fly
$('bFly').onclick=function(){fly=!fly;$('bFly').classList.toggle('on',fly);$('flyb').style.display=fly?'flex':'none';if(fly){stopAuto();var p=camera.position.clone();flyPos.copy(p);var d=p.clone().negate().normalize();flyYaw=Math.atan2(-d.x,-d.z);flyPitch=Math.asin(d.y);caption('Free-fly: drag to look, hold ▲ ▼ to move, pinch to dash.',4000)}};
// ---------- sandbox ----------
var SB={L:1,w:-1,g:1};
function sv(){SB.L=+$('sL').value;SB.w=+$('sW').value;SB.g=+$('sG').value;$('vL').textContent=SB.L.toFixed(2)+'×';$('vW').textContent=SB.w.toFixed(2).replace('-','−');$('vG').textContent=SB.g.toFixed(1)+'×';sim()}
['sL','sW','sG'].forEach(function(i){$(i).addEventListener('input',sv)});
function preset(L,w,g){$('sL').value=L;$('sW').value=w;$('sG').value=g;sv();run()}
$('pCrunch').onclick=function(){preset(-0.5,-1,4)};$('pRip').onclick=function(){preset(1.5,-1.6,1)};$('pFreeze').onclick=function(){preset(1,-1,1)};
var SIM=null;
function sim(){var h=1/14.4,Ok=1-Om-OL,a=1,t=0,dt=0.02,H2=h*h*(Om*SB.g+OL*SB.L+Ok),ad=H2>0?Math.sqrt(H2):0,out=[[0,1]],res='freeze',tend=150;
 function acc(a){return -h*h/2*a*(Om*SB.g/(a*a*a)+(1+3*SB.w)*OL*SB.L*Math.pow(a,-3*(1+SB.w)))}
 while(t<tend){var k1=acc(a);var a2=a+ad*dt/2,ad2=ad+k1*dt/2,k2=acc(a2);a+=ad2*dt;ad+=k2*dt;t+=dt;if(a<0.03){res='crunch';out.push([t,0.03]);break}if(a>500){res='rip';out.push([t,500]);break}if(((t*50)|0)%10==0)out.push([t,a])}
 if(res=='rip'&&SB.w>=-1)res='freeze';SIM={out:out,res:res,tEnd:t};plot();
 var v=res=='crunch'?'💥 Big Crunch in '+t.toFixed(0)+' billion years — gravity wins, everything falls back into a fireball.':res=='rip'?'🌀 Big Rip in '+t.toFixed(0)+' billion years — phantom dark energy tears apart galaxies, stars, planets and finally atoms.':(SB.L>0?'❄️ Eternal expansion (Big Freeze) — galaxies drift out of sight; stars burn out over trillions of years.':'🫧 Expands forever, slowing down — a cold, coasting universe.');$('verdict').textContent=v}
function plot(){var c=$('plot'),w=c.width=c.clientWidth*2,hh=c.height=180,x=c.getContext('2d');x.clearRect(0,0,w,hh);x.strokeStyle='#234';x.beginPath();for(var i=0;i<6;i++){x.moveTo(i*w/5,0);x.lineTo(i*w/5,hh)}x.stroke();
 x.fillStyle='#8ab';x.font='18px sans-serif';x.fillText('size of universe →  time (0–150 billion yrs from now)',10,20);x.strokeStyle=SIM.res=='crunch'?'#ff6a4a':SIM.res=='rip'?'#c98aff':'#6cf';x.lineWidth=4;x.beginPath();
 SIM.out.forEach(function(p,i){var X=p[0]/150*w,Y=hh-10-Math.min(1,Math.log10(p[1]*10+1)/2.5)*(hh-30);i?x.lineTo(X,Y):x.moveTo(X,Y)});x.stroke()}
function openSand(){stopAuto();sand={t:0,run:false};$('panel').style.display='block';$('bottom').style.display='none';setU(12.5/NE);goLayout(9,false);cam.dT=110;sv();caption('Sandbox: tweak the constants, then run the future.',4000)}
function closeSand(){if(!sand)return;sand=null;$('panel').style.display='none';$('bottom').style.display='block';U.uS.value=1;U.uHeat.value=0;U.uRip.value=0;U.uJ.value=0;var e=era;era=-1;curL=-2;setU(u)}
function run(){if(!sand)return;sand.run=true;sand.t=0}
$('bSand').onclick=function(){sand?closeSand():openSand()};$('sx').onclick=closeSand;$('sRun').onclick=run;
// ---------- photo ----------
var filt=0;$('bPhoto').onclick=function(){stopAuto();document.body.classList.add('photo');['shutter','pexit'].forEach(function(i){$(i).style.display='block'});$('pfx').style.display='flex';$('fact').style.display='none'};
$('pexit').onclick=function(){document.body.classList.remove('photo');['shutter','pexit','pfx'].forEach(function(i){$(i).style.display='none'});cv.style.filter=''};
var FL=['','saturate(1.8) contrast(1.15)','grayscale(1) contrast(1.3)','sepia(.45) saturate(1.4) hue-rotate(-10deg)'];
[].forEach.call(document.querySelectorAll('#pfx button'),function(b){b.onclick=function(){filt=+b.dataset.f;cv.style.filter=FL[filt];[].forEach.call(document.querySelectorAll('#pfx button'),function(x){x.classList.toggle('on',x===b)})}});
var wantShot=false,lastBlob=null;$('shutter').onclick=function(){wantShot=true};
function capture(){var w=cv.width,h=cv.height,o=document.createElement('canvas');o.width=w;o.height=h;var x=o.getContext('2d');x.filter=FL[filt]||'none';x.drawImage(cv,0,0);x.filter='none';
 var g=x.createLinearGradient(0,h*.85,0,h);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.6)');x.fillStyle=g;x.fillRect(0,h*.85,w,h*.15);x.fillStyle='#fff';x.font=(w/26|0)+'px -apple-system,sans-serif';x.fillText(ERAS[era].n+' · '+fmtAge(lastLt),w*.04,h*.95);x.globalAlpha=.6;x.font=(w/40|0)+'px sans-serif';x.fillText('Pocket Universe',w*.04,h*.975);
 var f=$('flash');f.style.opacity=1;setTimeout(function(){f.style.opacity=0},80);var url=o.toDataURL('image/jpeg',.92);$('shotimg').src=url;$('shot').style.display='flex';o.toBlob(function(b){lastBlob=b},'image/jpeg',.92)}
$('shotx').onclick=function(){$('shot').style.display='none'};
$('share').onclick=function(){if(lastBlob&&navigator.canShare){var fi=new File([lastBlob],'pocket-universe.jpg',{type:'image/jpeg'});if(navigator.canShare({files:[fi]})){navigator.share({files:[fi],title:'Pocket Universe'}).catch(function(){});return}}var a=document.createElement('a');a.href=$('shotimg').src;a.download='pocket-universe.jpg';a.click()};
// ---------- audio ----------
var AC=null,ag=null,oscs=[];$('bAudio').onclick=function(){if(!AC){var C2=window.AudioContext||window.webkitAudioContext;AC=new C2();ag=AC.createGain();ag.gain.value=0;var lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;ag.connect(lp);lp.connect(AC.destination);
 [55,82.4,110,164.8].forEach(function(f,i){var o=AC.createOscillator(),g=AC.createGain(),l=AC.createOscillator(),lg=AC.createGain();o.type=i%2?'triangle':'sine';o.frequency.value=f;g.gain.value=.18/(i+1);l.frequency.value=.07+i*.05;lg.gain.value=.08/(i+1);l.connect(lg);lg.connect(g.gain);o.connect(g);g.connect(ag);o.start();l.start();oscs.push(o)});window.__ac=AC}
 var on=ag.gain.value<.01;if(AC.state=='suspended')AC.resume();ag.gain.setTargetAtTime(on?.5:0,AC.currentTime,.4);$('bAudio').textContent=on?'🔊 Sound':'🔇 Sound';$('bAudio').classList.toggle('on',on);audioEra()};
function audioEra(){if(!AC)return;var k=Math.max(0,era)/NE,base=[1.5,1.33,1.2,1,.9,.75,.67][Math.min(6,(k*7)|0)];oscs.forEach(function(o,i){o.frequency.setTargetAtTime([55,82.4,110,164.8][i]*base*(era<3?1.5:1),AC.currentTime,1.5)})}
// ---------- loop ----------
var clock=new THREE.Clock(),T=0,BG=new THREE.Color(),BGs=[[.25,.2,.15],[.2,.12,.06],[.12,.04,.02],[.08,.03,.01],[.06,.02,.01],[.07,.03,.01],[0,0,0],[0,0,0],[0,0,.01],[0,0,.01],[0,0,.01],[0,0,0],[0,0,0]];
function frame(){requestAnimationFrame(frame);var dt=Math.min(.05,clock.getDelta());T+=dt;U.uT.value=T;if(mixT<1){mixT+=dt/2.2;U.uM.value=Math.min(1,mixT)}else U.uM.value=1;
 // tour
 if(tour){tour.t+=dt;var v=Math.min(0.99999,tour.t/(TOURSEC*NE));var r=ltOf(v);if(r.i!==era||!tour.c){tour.c=1;setU(v);caption(ERAS[era].c)}else setU(v);if(tour.t>TOURSEC*NE+2){stopAuto();caption('That\'s 13.8 billion years. Tap anywhere for facts, or try the Sandbox to change the fate of the universe.',7000)}}
 if(zoom){zoom.t+=dt;var k=Math.min(3,Math.floor(zoom.t/5)),f=(zoom.t%5)/5;if(k!==zoom.k){zoom.k=k;var s=ZS[k];setU(s.u/NE);goLayout(s.L);caption(s.cap)}var s=ZS[k],h=HERE[s.L];cam.tT.set(h[0],h[1],h[2]);cam.dT=s.d+(s.d2-s.d)*Math.min(1,f*1.4);
  var p=new THREE.Vector3(h[0],h[1],h[2]).project(camera),hd=$('here');hd.style.display=p.z<1?'block':'none';hd.style.left=(p.x+1)/2*innerWidth+'px';hd.style.top=(1-p.y)/2*innerHeight+'px';if(zoom.t>21){zoom.t=21}}
 // per-era dynamics
 var r=ltOf(u),e=ERAS[era];if(!sand){U.uS.value=e.L==1?(0.05+r.f*0.95):e.L==0?(0.4+r.f*.8):1;U.uJ.value=e.L<=2?(e.L==2?0.6:0.25):e.L<=5?0.15:0;U.uBr.value=e.L==7?0.7:e.L==6?0.8:e.L==12?0.85:1;U.uSpin.value+=e.L==10?dt*.05:e.L==11?dt*.12:e.L==12?dt*.05:0}
 if(sand&&sand.run&&SIM){sand.t+=dt;var p=Math.min(1,sand.t/10),idx=Math.min(SIM.out.length-1,Math.floor(p*SIM.out.length)),a=SIM.out[idx][1];var end=idx>=SIM.out.length-1;
  if(SIM.res=='crunch'){U.uS.value=Math.max(.03,a);U.uHeat.value=Math.min(1,Math.max(0,(0.5-a)*2));U.uJ.value=U.uHeat.value*1.5;U.uRip.value=0}
  else if(SIM.res=='rip'){U.uS.value=Math.min(3,Math.pow(a,.35));U.uRip.value=Math.min(1,Math.max(0,Math.log10(a)/2.7-.15));U.uHeat.value=0}
  else{U.uS.value=Math.min(3,Math.pow(a,.3));U.uBr.value=Math.max(.25,1-p*.7);U.uRip.value=0;U.uHeat.value=0}
  var BGc=SIM.res=='crunch'?U.uHeat.value*.4:0;renderer.setClearColor(new THREE.Color(BGc,BGc*.3,BGc*.1));}
 else{var b0=BGs[era],b1=BGs[Math.min(NE-1,era+1)],ff=Math.max(0,(r.f-.8)/.2);BG.setRGB(b0[0]+(b1[0]-b0[0])*ff,b0[1]+(b1[1]-b0[1])*ff,b0[2]+(b1[2]-b0[2])*ff);renderer.setClearColor(BG)}
 __bg.material.opacity=era>=7?.7:0;
 // camera
 if(fly){flyPos.addScaledVector(fwdVec(),flyV*dt*Math.max(8,flyPos.length()*.6));camera.position.copy(flyPos);camera.lookAt(flyPos.clone().add(fwdVec()))}
 else{if(autoRot||tour||zoom)cam.yaw+=dt*.06;var kk=1-Math.pow(.02,dt);cam.dist+=(cam.dT-cam.dist)*kk;cam.tgt.lerp(cam.tT,kk);var cp=Math.cos(cam.pitch);camera.position.set(cam.tgt.x+Math.sin(cam.yaw)*cp*cam.dist,cam.tgt.y+Math.sin(cam.pitch)*cam.dist,cam.tgt.z+Math.cos(cam.yaw)*cp*cam.dist);camera.lookAt(cam.tgt)}
 renderer.render(scene,camera);if(wantShot){wantShot=false;capture()}}
addEventListener('resize',function(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);U.uPR.value=PR*innerHeight/800});
// build layouts progressively
var gi=0;function build(){if(gi<GEN.length){var L=mk();GEN[gi](L);LAY.push(L);gi++;lt.textContent='Forging era '+gi+' of '+GEN.length+'…';setTimeout(build,0);return}
 setU(0);frame();caption('Drag to spin, pinch to zoom, tap for facts. Slide through 13.8 billion years — or press ▶ Tour.',6000);var l=$('load');l.style.opacity=0;setTimeout(function(){l.style.display='none'},1000);window.__pu={setU:setU,ERAS:ERAS,openSand:openSand,preset:preset,here:function(){$('bHere').onclick()},tour:function(){$('bTour').onclick()}}}
build();
})();
