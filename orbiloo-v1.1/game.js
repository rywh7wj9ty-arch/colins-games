/* Orbiloo v1.0 - loop round tiny planets and leap between them. */
(function(){'use strict';
const VERSION='v1.1';
const $=id=>document.getElementById(id);
const cv=$('cv'),cx=cv.getContext('2d');
let W=0,H=0,DPR=1,S=1;
function resize(){DPR=Math.min(window.devicePixelRatio||1,2.5);W=innerWidth;H=innerHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);S=H/500;}
addEventListener('resize',resize);resize();
const sp=document.createElement('div');sp.style.cssText='position:fixed;left:0;top:0;padding-left:env(safe-area-inset-left);padding-top:env(safe-area-inset-top);visibility:hidden;pointer-events:none';document.body.appendChild(sp);
const SAFE={get l(){return parseFloat(getComputedStyle(sp).paddingLeft)||0},get t(){return parseFloat(getComputedStyle(sp).paddingTop)||0}};
// ---------- save ----------
const KEY='orbiloo-save-v1';
let SV={lv:{},mus:60,sfx:80,bri:100,feat:{aim:true,help:true,shake:true,spark:true,timer:true,rings:true,worms:true,flip:true},st:{plays:0,clears:0,best:0,bestStars:0,leaps:0,stars:0,misses:0,crowns:0,time:0}};
try{const o=JSON.parse(localStorage.getItem(KEY)||'null');if(o){Object.assign(SV,o);SV.feat=Object.assign({aim:true,help:true,shake:true,spark:true,timer:true,rings:true,worms:true,flip:true},o.feat||{});SV.lv=o.lv||{};SV.st=Object.assign({plays:0,clears:0,best:0,bestStars:0,leaps:0,stars:0,misses:0,crowns:0,time:0},o.st||{})}}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(SV))}catch(e){}}
const FEATS=[['aim','Aim guide (dotted line showing your leap)'],['help','Helper gravity (after 3 misses)'],['shake','Screen shake'],['spark','Sparkles and trails'],['timer','Show timer'],['rings','Boost rings (from level 6)'],['worms','Wormholes (from level 11)'],['flip','Flip planets that swap spin (from level 16)']];
const OLDS=[['v1.1','Current (20 levels)','../orbiloo-v1.1/'],['v1.0','First demo (1 level)','../orbiloo-v1.0/']];
// ---------- audio ----------
let AC=null,mG,sG,musT=0,musStep=0;
function audio(){if(AC){if(AC.state==='suspended')AC.resume();return}try{AC=new (window.AudioContext||window.webkitAudioContext)();mG=AC.createGain();sG=AC.createGain();mG.connect(AC.destination);sG.connect(AC.destination);vol();musT=AC.currentTime+.1}catch(e){AC=null}}
function vol(){if(!AC)return;mG.gain.value=(SV.mus/100)*.35;sG.gain.value=(SV.sfx/100)*.5}
function tone(f,t0,d,type,g,dest,f2){const o=AC.createOscillator(),e=AC.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t0);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t0+d);e.gain.setValueAtTime(0,t0);e.gain.linearRampToValueAtTime(g,t0+.01);e.gain.exponentialRampToValueAtTime(.0001,t0+d);o.connect(e);e.connect(dest);o.start(t0);o.stop(t0+d+.05)}
function sfx(n,p){if(!AC||SV.sfx<=0)return;const t=AC.currentTime;
 if(n==='leap')tone(380,t,.18,'triangle',.5,sG,820);
 else if(n==='land')tone(520,t,.12,'sine',.5,sG,300);
 else if(n==='star'){const f=880*Math.pow(2,Math.min(p||0,12)/12);tone(f,t,.15,'triangle',.35,sG);tone(f*1.5,t+.05,.15,'sine',.25,sG)}
 else if(n==='bonk')tone(220,t,.3,'square',.25,sG,90);
 else if(n==='miss')tone(600,t,.5,'sine',.35,sG,150);
 else if(n==='cp'){[523,659,784].forEach((f,i)=>tone(f,t+i*.08,.2,'triangle',.35,sG))}
 else if(n==='win'){[523,659,784,1047,1319].forEach((f,i)=>tone(f,t+i*.1,.35,'triangle',.4,sG))}
 else if(n==='boost'){tone(500,t,.25,'sawtooth',.18,sG,1400);tone(1000,t+.05,.2,'sine',.2,sG,1600)}
 else if(n==='worm'){tone(1200,t,.4,'sine',.3,sG,200);tone(300,t+.1,.4,'triangle',.25,sG,900)}
 else if(n==='flip')tone(900,t,.08,'square',.12,sG,600);
 else if(n==='ui')tone(700,t,.06,'sine',.25,sG)}
const SC=[0,2,4,7,9,12,14,16];const CH=[[0,4,7],[5,9,12],[7,11,14],[3,7,10]];
function music(){if(!AC||SV.mus<=0){if(AC)musT=AC.currentTime+.05;return}
 while(musT<AC.currentTime+.3){const bar=Math.floor(musStep/8)%4,ch=CH[[0,1,0,2][bar]],b=48+ch[0];
  if(musStep%8===0)tone(110*Math.pow(2,ch[0]/12),musT,.9,'sine',.35,mG);
  if(musStep%2===0)tone(262*Math.pow(2,ch[(musStep/2)%3]/12),musT,.25,'triangle',.12,mG);
  if([1,3,6].includes(musStep%8)){const n=SC[(musStep*5+bar*3)%SC.length];tone(523*Math.pow(2,n/12),musT,.3,'sine',.1,mG)}
  musT+=.2;musStep++}}
// ---------- level ----------
// x,y,r,spin,{cp,goal,mv:[ax,ay,sp],moons}
const L=[[0,0,82,1.5,{cp:1}],[330,-40,72,1.6],[650,30,70,1.75],[960,-60,66,-1.85],[1290,20,62,1.95,{cp:1}],
 [1610,-90,58,-2.05],[1910,40,58,2.15],[2250,-40,62,-2.2,{mv:[0,70,.9]}],[2590,60,58,2.3,{mv:[0,90,1.1]}],[2920,-30,62,-2.3,{cp:1}],
 [3260,0,58,2.4,{mv:[60,60,1]}],[3600,-80,62,-2.4,{moons:1}],[3940,30,62,2.5,{moons:1}],[4280,-40,64,-2.5,{cp:1}],
 [4620,40,58,2.6,{moons:2,mv:[0,70,.9]}],[4960,-60,54,-2.7,{mv:[0,100,1.2]}],[5300,20,58,2.8,{moons:2}],[5640,-30,62,-2.85,{cp:1}],
 [5980,50,54,2.95,{moons:2,mv:[0,90,1]}],[6320,-50,52,-3,{moons:3}],[6700,0,115,1.1,{goal:1}]];
const COLS=[['#ffd36b','#f7a43b'],['#7fe0a8','#3cbf7a'],['#8fd3ff','#4a9ff0'],['#c9a6ff','#8f68f0'],['#ffb0d8','#f27ab8'],['#a8f0e6','#4cc8b8']];
const WORLDS=['Pebble Belt','Comet Coast','Wormhole Wood','Flipside Stars'];
const NAMES=['Pebble Belt','Pebble Pathway','Bouncy Boulders','Wobble Way','Spike Spiral','Comet Coast','Zoom Lagoon','Ring Reef','Sprint Shoals','Comet Crown','Wormhole Wood','Twisty Thicket','Portal Grove','Swirl Hollow','Burrow Glade','Flipside Stars','Topsy Turvy','Switchback Sky','Dizzy Drift','Grumbo\'s Lair'];
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const LVC={};function hz(L){return L.P.reduce((a,p)=>a+(p.o.mv?1:0)+(p.o.moons||0)+(p.o.flip?1.5:0),0)}
function genLevel(n){if(LVC[n])return LVC[n];if(n===1)return LVC[1]={P:L.map(p=>({x:p[0],y:p[1],r:p[2],spin:p[3],o:Object.assign({},p[4]||{})})),rings:[],worms:[]};
 const T=17.5+(n-1)*1.8;let best=null,bd=1e9;for(let k=0;k<600;k++){const L=genOne(n,n*7919+13+k*101);if(n>=11&&L.worms.length<1+(n>=15?1:0))continue;if(n>=6&&L.rings.length<2)continue;const d=Math.abs(hz(L)-T);if(d<bd){bd=d;best=L}if(d<.5)break}return LVC[n]=best}
function genOne(n,seed){const R=rng(seed),d=(n-1)/19,cnt=21+n,P=[];let x=0,y=0,sg=1;
 for(let i=0;i<cnt-1;i++){const o={},cp=i===0||(i%5===0&&i<cnt-4);if(cp)o.cp=1;
  const r=i===0?80:Math.max(42,68-d*22+(R()-.5)*12);if(i>0&&R()<.3+d*.45)sg=-sg;const sp=(1.7+d*1.5+R()*.3)*sg;
  if(!cp&&i>1){if(R()<.28+d*.3)o.mv=[0,(55+d*65),.8+d*.6+R()*.2];if(R()<.32+d*.28)o.moons=1+(d>.4&&R()<.45?1:0)+(d>.75&&R()<.3?1:0);
   if(n>=16&&R()<.22+(n-16)*.06)o.flip=1}
  P.push({x,y,r,spin:sp,o});x+=310+d*90+R()*40;y=Math.max(-170,Math.min(170,y+(R()-.5)*2*(60+d*90)));}
 x+=60;const B=P.length;
 if(n<20)P.push({x,y,r:115,spin:1.1,o:{goal:1}});
 else{P.push({x:x+40,y:0,r:110,spin:1.2,o:{goal:1,boss:1}});const bx=x+40;[125,235].forEach(a=>{a*=Math.PI/180;P.push({x:bx+430*Math.cos(a),y:430*Math.sin(a),r:56,spin:2.5,o:{cp:1,next:B}})})}
 const rings=[],worms=[],used={};const st=i=>P[i]&&!P[i].o.mv&&!P[i].o.goal&&!P[i].o.next;
 if(n>=11){let k=0;for(let i=3;i<B-3&&k<(n>=15?2:1);i++){if(st(i)&&st(i+1)&&st(i+2)&&!P[i+1].o.cp&&!P[i+1].o.moons&&!P[i+2].o.moons&&!used[i]&&R()<.5){const a=P[i],b=P[i+1],c=P[i+2],ux=c.x-b.x,uy=c.y-b.y,l=Math.hypot(ux,uy);
   worms.push({ax:(a.x+b.x)/2,ay:(a.y+b.y)/2,bx:c.x-ux/l*(c.r+130),by:c.y-uy/l*(c.r+130),ux:ux/l,uy:uy/l,gap:i});used[i]=used[i+1]=used[i-1]=1;k++;i+=4}}}
 if(n>=6){for(let i=1;i<B-1;i++){if(!used[i]&&st(i)&&st(i+1)&&R()<.22+d*.2){const a=P[i],b=P[i+1];rings.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2,a:Math.atan2(b.y-a.y,b.x-a.x),gap:i});used[i]=1}}}
 return{P,rings,worms,main:B}}
let G=null;
function build(n){const Lv=genLevel(n);if(!SV.feat.rings)Lv.rings=[];if(!SV.feat.worms)Lv.worms=[];
 const P=Lv.P.map((p,i)=>({i,bx:p.x,by:p.y,x:p.x,y:p.y,r:p.r,spin:p.spin,s0:p.spin,o:p.o,c:COLS[i%COLS.length],ph:Math.random()*6,blink:Math.random()*4,squ:0}));
 const ST=[],wg={};Lv.worms.forEach(w=>wg[w.gap]=w);const nxt=i=>P[i].o.next!=null?P[i].o.next:i+1;for(let i=0;i<P.length;i++){if(P[i].o.goal)continue;if(wg[i-1])continue;const a=P[i],b=P[nxt(i)];if(!b)continue;const n=wg[i]?1:(i<3?2:3);for(let k=0;k<n;k++){const f=(k+1)/(n+1),ox=-(b.by-a.by),oy=b.bx-a.bx,l=Math.hypot(ox,oy);const bend=Math.sin(f*Math.PI)*(i%2?40:-40);ST.push({x:a.bx+(b.bx-a.bx)*f+ox/l*bend,y:a.by+(b.by-a.by)*f+oy/l*bend,got:0,t:Math.random()*6})}}
 Lv.worms.forEach(w=>{for(let k=1;k<=2;k++)ST.push({x:w.bx+w.ux*k*45,y:w.by+w.uy*k*45,got:0,t:k})});
 return {P,ST,rings:Lv.rings,worms:Lv.worms,main:Lv.main||P.length-1}}
function newGame(n){const b=build(n);G={lv:n,rings:b.rings,worms:b.worms,main:b.main,bossHp:3,boost:0,mode:'play',P:b.P,ST:b.ST,t:0,stars:0,leaps:0,misses:0,missCp:0,cp:0,on:0,ang:-Math.PI/2,fly:null,ox:0,oy:0,vx:0,vy:0,cam:{x:0,y:0},shake:0,parts:[],flash:0,combo:0,lastLeave:-1,leaveT:0,winT:0,dead:0,squash:0,trail:[],reached:0,hintT:0};placeOn(0,-Math.PI/2);G.cam.x=G.px;G.cam.y=G.py;}
function placeOn(i,a){G.on=i;G.ang=a;G.fly=null;const p=G.P[i];G.px=p.x+Math.cos(a)*(p.r+15);G.py=p.y+Math.sin(a)*(p.r+15)}
function respawn(){const p=G.P[G.cp];G.combo=0;placeOn(G.cp,-Math.PI/2);G.dead=0;puff(G.px,G.py,'#ffffff',14)}
// ---------- particles ----------
function puff(x,y,c,n,sp){if(!SV.feat.spark&&n>6)n=6;for(let i=0;i<n;i++){const a=Math.random()*6.283,v=(sp||120)*(.4+Math.random());G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:.6+Math.random()*.4,m:1,c,r:3+Math.random()*4})}}
function toast(t,ms){const el=$('toast');el.textContent=t;el.style.opacity=1;clearTimeout(toast.h);toast.h=setTimeout(()=>el.style.opacity=0,ms||1400)}
// ---------- update ----------
const SPEED=540,ORB=15;
function leap(){if(!G||G.mode!=='play'||G.fly||G.dead)return;const p=G.P[G.on];if(p.o.goal)return;const d=Math.sign(p.spin);
 const tx=-Math.sin(G.ang)*d,ty=Math.cos(G.ang)*d;const pv=planetVel(p);
 G.fly={t:0};G.vx=tx*SPEED+pv.x*.5;G.vy=ty*SPEED+pv.y*.5;G.lastLeave=G.on;G.leaps++;SV.st.leaps++;G.squash=1;sfx('leap');puff(G.px,G.py,'#ffffff',6,80);G.hintT=99}
function planetVel(p){if(!p.o.mv)return{x:0,y:0};const [ax,ay,sp]=p.o.mv;return{x:Math.cos(G.t*sp+p.i)*ax*sp,y:Math.cos(G.t*sp+p.i)*ay*sp}}
function update(dt){if(!G)return;
 if(G.mode==='play'||G.mode==='win'){G.t+=G.mode==='play'?dt:0;}
 const T=G.t;
 for(const p of G.P){if(p.o.flip&&SV.feat.flip){p.spin=p.s0*(Math.floor((T+p.i*.7)/2.6)%2?-1:1)}if(p.o.mv){const [ax,ay,sp]=p.o.mv;p.x=p.bx+Math.sin(T*sp+p.i)*ax;p.y=p.by+Math.sin(T*sp+p.i)*ay}p.squ*=Math.pow(.02,dt);p.blink-=dt;if(p.blink<-.15)p.blink=2+Math.random()*4}
 for(const s of G.ST)s.t+=dt;for(const r of G.rings)if(r.hit)r.hit=Math.max(0,r.hit-dt)>0?r.hit-dt:0;
 for(let i=G.parts.length-1;i>=0;i--){const q=G.parts[i];q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.96;q.vy*=.96;q.l-=dt;if(q.l<=0)G.parts.splice(i,1)}
 G.shake*=Math.pow(.001,dt);G.squash*=Math.pow(.004,dt);G.flash=Math.max(0,G.flash-dt);
 if(G.mode==='win'){G.winT+=dt;const p=G.P[G.on];G.ang+=p.spin*dt;G.px=p.x+Math.cos(G.ang)*(p.r+ORB);G.py=p.y+Math.sin(G.ang)*(p.r+ORB);if(Math.random()<.5)puff(p.x+(Math.random()-.5)*400,p.y-200-Math.random()*100,COLS[(Math.random()*6)|0][0],1,60);if(G.winT>1.6&&G.mode==='win'){G.mode='done';showOver()}camera(dt);return}
 if(G.mode!=='play')return;
 if(G.dead){G.dead-=dt;if(G.dead<=0)respawn();camera(dt);return}
 if(!G.fly){const p=G.P[G.on];G.ang+=p.spin*dt;G.px=p.x+Math.cos(G.ang)*(p.r+ORB);G.py=p.y+Math.sin(G.ang)*(p.r+ORB);G.hintT+=dt}
 else{G.fly.t+=dt;const help=SV.feat.help&&G.missCp>=3;
  for(const p of G.P){if(p.i===G.lastLeave&&G.fly.t<.3)continue;const dx=p.x-G.px,dy=p.y-G.py,d=Math.hypot(dx,dy),rng=p.r*(help?3.4:2.6);
   if(d<rng){const a=(help?95000:62000)*p.r/(d*d);G.vx+=dx/d*a*dt;G.vy+=dy/d*a*dt}
   if(d<p.r+ORB+(help?30:16)){land(p);break}}
  if(G.fly){G.boost=Math.max(0,G.boost-dt);const cap=SPEED*(G.boost>0?1.6:1.15),sp=Math.hypot(G.vx,G.vy);if(sp>cap){G.vx*=cap/sp;G.vy*=cap/sp}
   for(const r of G.rings){if(!r.hit&&Math.hypot(r.x-G.px,r.y-G.py)<40){r.hit=.6;G.vx*=1.4;G.vy*=1.4;G.boost=.7;sfx('boost');puff(r.x,r.y,'#ffe45c',10,160);if(SV.feat.shake)G.shake=4}}
   for(const w of G.worms){if(Math.hypot(w.ax-G.px,w.ay-G.py)<36){G.px=w.bx;G.py=w.by;G.vx=w.ux*SPEED;G.vy=w.uy*SPEED;G.fly.t=0;G.lastLeave=-1;G.trail.length=0;sfx('worm');puff(w.ax,w.ay,'#c9a6ff',12,150);puff(w.bx,w.by,'#8ff0e6',12,150);break}}
   G.px+=G.vx*dt;G.py+=G.vy*dt;if(SV.feat.spark)G.trail.push({x:G.px,y:G.py,l:.35});
   let near=1e9;for(const p of G.P)near=Math.min(near,Math.hypot(p.x-G.px,p.y-G.py)-p.r);
   if(G.fly.t>3||near>800)miss()}}
 for(let i=G.trail.length-1;i>=0;i--){G.trail[i].l-=dt;if(G.trail[i].l<=0)G.trail.splice(i,1)}
 // moons
 for(const p of G.P){const n=moonN(p);for(let k=0;k<n;k++){const a=-T*1.3*Math.sign(p.spin)+k*6.283/n+p.i,mr=p.r+58;const mx=p.x+Math.cos(a)*mr,my=p.y+Math.sin(a)*mr;
  if(!G.dead&&Math.hypot(mx-G.px,my-G.py)<17+12){bonk(mx,my)}}}
 // stars
 for(const s of G.ST){if(!s.got&&Math.hypot(s.x-G.px,s.y-G.py)<28){s.got=1;G.stars++;SV.st.stars++;G.combo++;sfx('star',G.combo);puff(s.x,s.y,'#ffe45c',8,140)}}
 camera(dt)}
function moonN(p){return p.o.boss?1+(3-G.bossHp):(p.o.moons||0)}
function tgt(i){const p=G.P[i];return p.o.next!=null?p.o.next:Math.min(i+1,G.P.length-1)}
function land(p){G.fly=null;G.on=p.i;G.ang=Math.atan2(G.py-p.y,G.px-p.x);G.squash=1;p.squ=1;sfx('land');puff(G.px,G.py,p.c[0],8,90);G.combo=0;G.hintT=0;
 if(p.o.cp&&p.i>G.cp&&p.o.next==null){G.cp=p.i;G.missCp=0;sfx('cp');toast('Checkpoint!');}
 if(p.i>G.reached&&p.i<=G.main)G.reached=p.i;
 if(p.o.boss&&G.bossHp>1){G.bossHp--;const o=G.P.filter(q=>q.o.next!=null)[2-G.bossHp];sfx('bonk');sfx('cp');if(SV.feat.shake)G.shake=14;G.flash=.3;for(let i=0;i<30;i++)puff(p.x,p.y,COLS[i%6][0],1,280);o.squ=1;G.cp=o.i;placeOn(o.i,Math.PI);toast(G.bossHp===2?'Grumbo wobbles! 2 more hits':'One more hit! Watch the extra moons',2000);return}
 if(p.o.goal){if(p.o.boss)G.bossHp=0;G.mode='win';G.winT=0;sfx('win');if(SV.feat.shake)G.shake=8;for(let i=0;i<40;i++)puff(p.x,p.y-p.r,COLS[i%6][0],1,300)}}
function miss(){G.misses++;G.missCp++;SV.st.misses++;sfx('miss');G.dead=.8;G.fly=null;puff(G.px,G.py,'#ffffff',10);if(SV.feat.help&&G.missCp===3)toast('Helper gravity on: planets pull harder now',2200);else toast('Whoops! Back to the flag')}
function bonk(x,y){G.misses++;G.missCp++;SV.st.misses++;sfx('bonk');if(SV.feat.shake)G.shake=10;G.flash=.25;G.dead=.8;G.fly=null;puff(G.px,G.py,'#c9a6ff',14,200);if(SV.feat.help&&G.missCp===3)toast('Helper gravity on: planets pull harder now',2200);else toast('Bonk! Dodge the spike moons')}
function camera(dt){const p=G.P[tgt(G.on)];const tx=G.fly?G.px+G.vx*.25:(G.px*.6+p.x*.4),ty=G.fly?G.py:(G.py*.6+p.y*.4);const k=1-Math.pow(.03,dt);G.cam.x+=(tx-G.cam.x)*k;G.cam.y+=(ty-G.cam.y)*k}
// ---------- draw ----------
function circ(x,y,r){cx.beginPath();cx.arc(x,y,r,0,6.2832)}
function draw(){cx.setTransform(DPR,0,0,DPR,0,0);
 const gr=cx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#5fb4ff');gr.addColorStop(.6,'#a7c8ff');gr.addColorStop(1,'#f3c9ff');cx.fillStyle=gr;cx.fillRect(0,0,W,H);
 const cmx=G?G.cam.x:performance.now()*.03,cmy=G?G.cam.y:0,T=performance.now()/1000;
 // far stars & bubbles
 for(let i=0;i<50;i++){const px=((i*137.5-cmx*.1)%(W+40)+W+40)%(W+40)-20,py=((i*71.3-cmy*.1)%H+H)%H;cx.globalAlpha=.5+.4*Math.sin(T*2+i);cx.fillStyle='#fff';circ(px,py,1.2+(i%3)*.6);cx.fill()}
 cx.globalAlpha=1;
 for(let i=0;i<6;i++){const px=((i*420-cmx*.25)%(W+400)+W+400)%(W+400)-200,py=H*(.2+.12*(i%4))-cmy*.08;cx.fillStyle=['#ffffff33','#ffe6fa44','#d8f0ff44'][i%3];circ(px,py,60+i%3*30);cx.fill()}
 if(!G){return}
 cx.save();let sx=0,sy=0;if(G.shake>.2){sx=(Math.random()-.5)*G.shake;sy=(Math.random()-.5)*G.shake}
 cx.translate(W/2+sx,H/2+sy);cx.scale(S,S);cx.translate(-G.cam.x,-G.cam.y);
 // aim guide
 if(SV.feat.aim&&!G.fly&&!G.dead&&G.mode==='play'&&!G.P[G.on].o.goal){const p=G.P[G.on],d=Math.sign(p.spin),tx=-Math.sin(G.ang)*d,ty=Math.cos(G.ang)*d;const len=G.on<4?300:200;
  for(let i=1;i<12;i++){const f=i/12*len;cx.globalAlpha=.75*(1-i/12);cx.fillStyle='#fff';circ(G.px+tx*f,G.py+ty*f,4);cx.fill()}cx.globalAlpha=1}
 // orbit rings
 for(const p of G.P){cx.strokeStyle='rgba(255,255,255,.35)';cx.lineWidth=2;cx.setLineDash([6,10]);circ(p.x,p.y,p.r+ORB);cx.stroke();cx.setLineDash([])}
 // stars
 for(const s of G.ST){if(s.got)continue;const b=Math.sin(s.t*3)*4;star(s.x,s.y+b,13,'#ffe45c','#f2a91c',s.t)}
 // trail
 for(const q of G.trail){cx.globalAlpha=q.l/.35*.7;cx.fillStyle='#fff6c8';circ(q.x,q.y,7*q.l/.35);cx.fill()}cx.globalAlpha=1;
 for(const r of G.rings)ring(r,T);for(const w of G.worms)worm(w,T);
 for(const p of G.P)planet(p,T);
 // moons
 for(const p of G.P){const n=moonN(p);for(let k=0;k<n;k++){const a=-G.t*1.3*Math.sign(p.spin)+k*6.283/n+p.i,mr=p.r+58;moon(p.x+Math.cos(a)*mr,p.y+Math.sin(a)*mr,a)}}
 if(!G.dead)hero();
 for(const q of G.parts){cx.globalAlpha=Math.min(1,q.l*2);cx.fillStyle=q.c;circ(q.x,q.y,q.r);cx.fill()}cx.globalAlpha=1;
 cx.restore();
 // light fog
 const fg=cx.createLinearGradient(0,H*.75,0,H);fg.addColorStop(0,'rgba(255,255,255,0)');fg.addColorStop(1,'rgba(255,255,255,.28)');cx.fillStyle=fg;cx.fillRect(0,H*.75,W,H*.25);
 if(G.flash>0){cx.fillStyle='rgba(255,255,255,'+(G.flash*1.6)+')';cx.fillRect(0,0,W,H)}
 hud()}
function star(x,y,r,c1,c2,t){cx.save();cx.translate(x,y);cx.rotate(Math.sin(t*2)*.2);cx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.5:r;cx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}cx.closePath();cx.fillStyle=c1;cx.fill();cx.lineJoin='round';cx.lineWidth=3;cx.strokeStyle=c2;cx.stroke();cx.fillStyle='#fff';circ(-r*.25,-r*.3,r*.18);cx.fill();cx.restore()}
function planet(p,T){const r=p.r*(1+p.squ*.06);cx.save();cx.translate(p.x,p.y);
 if(p.o.goal){const rb=['#ff9ad5','#ffd36b','#8ff0a0','#8fd3ff','#c9a6ff'];rb.forEach((c,i)=>{cx.strokeStyle=c;cx.lineWidth=9;circ(0,0,r+30+i*9);cx.globalAlpha=.55;cx.stroke()});cx.globalAlpha=1}
 if(p.o.flip&&SV.feat.flip){const ph=((T+p.i*.7)%2.6);const warn=ph>2.0;cx.strokeStyle=warn?'rgba(255,255,255,'+(.5+.5*Math.sin(T*30))+')':'rgba(255,255,255,.6)';cx.lineWidth=5;cx.lineCap='round';const d=Math.sign(p.spin);for(let k=0;k<2;k++){const a0=k*Math.PI+T*p.spin*.6;cx.beginPath();cx.arc(0,0,r+28,a0,a0+1.1*d,d<0);cx.stroke();const ae=a0+1.1*d,ex=Math.cos(ae)*(r+28),ey=Math.sin(ae)*(r+28);cx.beginPath();cx.arc(ex,ey,5,0,6.3);cx.fillStyle=cx.strokeStyle;cx.fill()}}
 cx.fillStyle='rgba(40,60,140,.15)';circ(6,8,r);cx.fill();
 const g=cx.createRadialGradient(-r*.35,-r*.4,r*.1,0,0,r);g.addColorStop(0,'#ffffff');g.addColorStop(.25,p.c[0]);g.addColorStop(1,p.c[1]);cx.fillStyle=g;circ(0,0,r);cx.fill();
 cx.lineWidth=4;cx.strokeStyle='rgba(60,40,120,.35)';cx.stroke();
 cx.rotate(T*p.spin*.5);cx.fillStyle='rgba(255,255,255,.25)';for(let i=0;i<3;i++){circ(Math.cos(i*2.1)*r*.5,Math.sin(i*2.1)*r*.5,r*.14);cx.fill()}cx.rotate(-T*p.spin*.5);
 // face
 const bl=p.blink<0?.15:1;cx.fillStyle='#3a2a6a';cx.beginPath();cx.ellipse(-r*.25,-r*.05,r*.08,r*.11*bl,0,0,6.3);cx.ellipse(r*.25,-r*.05,r*.08,r*.11*bl,0,0,6.3);cx.fill();
 cx.fillStyle='#ff8fbf88';circ(-r*.42,r*.15,r*.09);cx.fill();circ(r*.42,r*.15,r*.09);cx.fill();
 cx.strokeStyle='#3a2a6a';cx.lineWidth=3;cx.lineCap='round';cx.beginPath();cx.arc(0,r*.08,r*.12,.3,Math.PI-.3);cx.stroke();
 if(p.o.cp){const on=G.cp>=p.i;cx.strokeStyle='#5a4a8a';cx.lineWidth=4;cx.beginPath();cx.moveTo(0,-r);cx.lineTo(0,-r-42);cx.stroke();cx.fillStyle=on?'#5ef08a':'#ffffff';cx.beginPath();cx.moveTo(0,-r-42);cx.quadraticCurveTo(18,-r-40+Math.sin(T*5)*3,30,-r-34);cx.lineTo(0,-r-24);cx.closePath();cx.fill();cx.lineWidth=2.5;cx.stroke()}
 if(p.o.boss){cx.strokeStyle='#3a2a6a';cx.lineWidth=6;cx.beginPath();cx.moveTo(-r*.42,-r*.3);cx.lineTo(-r*.12,-r*.16);cx.moveTo(r*.42,-r*.3);cx.lineTo(r*.12,-r*.16);cx.stroke();cx.font='800 20px ui-rounded,Nunito,sans-serif';cx.textAlign='center';cx.fillStyle='#fff';cx.fillText('GRUMBO '+'●'.repeat(G.bossHp),0,r*.62)}
 else if(p.o.goal){cx.font='800 22px ui-rounded,Nunito,sans-serif';cx.textAlign='center';cx.fillStyle='#fff';cx.fillText('HOME',0,r*.6)}
 cx.restore()}
function ring(r,T){cx.save();cx.translate(r.x,r.y);cx.rotate(r.a);const s=1+(r.hit||0)*.5;cx.scale(.45*s,1*s);cx.lineWidth=9;['#ffd36b','#ff9ad5','#8fd3ff'].forEach((c,i)=>{cx.strokeStyle=c;circ(0,0,40-i*8);cx.stroke()});cx.restore();
 cx.save();cx.translate(r.x,r.y);cx.rotate(r.a);cx.fillStyle='rgba(255,255,255,'+(.5+.4*Math.sin(T*8))+')';for(let k=-1;k<=1;k++){cx.beginPath();cx.moveTo(k*14-6,-8);cx.lineTo(k*14+6,0);cx.lineTo(k*14-6,8);cx.closePath();cx.fill()}cx.restore()}
function worm(w,T){[[w.ax,w.ay,'#a36bff','#5ef0ff'],[w.bx,w.by,'#5ef0e0','#c9a6ff']].forEach(([x,y,a,b],j)=>{cx.save();cx.translate(x,y);cx.rotate(T*(j?-3:3));const g=cx.createRadialGradient(0,0,4,0,0,38);g.addColorStop(0,'#ffffff');g.addColorStop(.35,a);g.addColorStop(1,a+'00');cx.fillStyle=g;circ(0,0,38);cx.fill();cx.strokeStyle=b;cx.lineWidth=4;cx.lineCap='round';for(let k=0;k<3;k++){cx.beginPath();cx.arc(0,0,14+k*7,k*2.1,k*2.1+2.2);cx.stroke()}cx.restore()})}
function moon(x,y,a){cx.save();cx.translate(x,y);cx.rotate(a*2);cx.fillStyle='#8a7cc8';for(let i=0;i<8;i++){cx.save();cx.rotate(i*Math.PI/4);cx.beginPath();cx.moveTo(-5,-13);cx.lineTo(0,-22);cx.lineTo(5,-13);cx.fill();cx.restore()}
 const g=cx.createRadialGradient(-4,-5,2,0,0,15);g.addColorStop(0,'#e8e0ff');g.addColorStop(1,'#9a8ad8');cx.fillStyle=g;circ(0,0,15);cx.fill();cx.lineWidth=2.5;cx.strokeStyle='#5a4a9a';cx.stroke();cx.rotate(-a*2);
 cx.strokeStyle='#3a2a6a';cx.lineWidth=2.5;cx.beginPath();cx.moveTo(-8,-6);cx.lineTo(-2,-3);cx.moveTo(8,-6);cx.lineTo(2,-3);cx.stroke();cx.fillStyle='#3a2a6a';circ(-4,1,2);cx.fill();circ(4,1,2);cx.fill();cx.restore()}
function hero(){let x=G.px,y=G.py,up;if(G.fly){up=Math.atan2(G.vy,G.vx)}else{const p=G.P[G.on];up=Math.atan2(G.py-p.y,G.px-p.x)}
 cx.save();cx.translate(x,y);cx.rotate(up+Math.PI/2);const sq=G.squash;const sxk=G.fly?1-sq*.15:1+sq*.25,syk=G.fly?1+sq*.25:1-sq*.25;cx.scale(sxk,syk);
 const R=15;cx.fillStyle='rgba(40,40,120,.18)';circ(2,4,R);cx.fill();
 // ears
 cx.fillStyle='#ffd6ec';cx.strokeStyle='#7a5ab0';cx.lineWidth=2.5;[-1,1].forEach(s=>{cx.beginPath();cx.ellipse(s*9,-R+1,5,9,s*.4,0,6.3);cx.fill();cx.stroke()});
 const g=cx.createRadialGradient(-5,-6,2,0,0,R);g.addColorStop(0,'#ffffff');g.addColorStop(1,'#ffe0f2');cx.fillStyle=g;circ(0,0,R);cx.fill();cx.stroke();
 // fluff tufts
 cx.fillStyle='#fff';circ(-6,-R+2,5);cx.fill();circ(0,-R,6);cx.fill();circ(6,-R+2,5);cx.fill();
 const look=G.fly?0:Math.sign(G.P[G.on].spin)*2;
 cx.fillStyle='#2e2457';cx.beginPath();cx.ellipse(-5+look,-1,2.6,3.6,0,0,6.3);cx.ellipse(5+look,-1,2.6,3.6,0,0,6.3);cx.fill();cx.fillStyle='#fff';circ(-4.2+look,-2.4,1);cx.fill();circ(5.8+look,-2.4,1);cx.fill();
 cx.fillStyle='#ff9ac8';circ(-9,4,2.6);cx.fill();circ(9,4,2.6);cx.fill();
 cx.strokeStyle='#2e2457';cx.lineWidth=2;cx.beginPath();if(G.fly){circ(look,6,2.6);cx.stroke()}else{cx.arc(look,4,3,.2,Math.PI-.2);cx.stroke()}
 cx.restore()}
function pill(x,y,w,h){cx.beginPath();cx.roundRect?cx.roundRect(x,y,w,h,h/2):cx.rect(x,y,w,h)}
function hud(){if(G.mode!=='play'&&G.mode!=='win')return;const sl=SAFE.l;
 const x0=Math.max(14,sl+14),y0=12+SAFE.t;cx.fillStyle='rgba(40,60,160,.35)';pill(x0,y0,150,36);cx.fill();star(x0+20,y0+18,11,'#ffe45c','#f2a91c',0);
 cx.fillStyle='#fff';cx.font='800 20px ui-rounded,Nunito,sans-serif';cx.textAlign='left';cx.textBaseline='middle';cx.fillText(G.stars+' / '+G.ST.length,x0+38,y0+19);
 if(SV.feat.timer){cx.fillStyle='rgba(40,60,160,.35)';pill(x0+160,y0,92,36);cx.fill();cx.fillStyle='#fff';cx.fillText(fmt(G.t),x0+174,y0+19)}
 cx.textAlign='center';cx.font='800 17px ui-rounded,Nunito,sans-serif';cx.fillStyle='rgba(40,60,160,.35)';const nm=G.lv+'. '+NAMES[G.lv-1],tw=cx.measureText(nm).width+28;pill(W/2-tw/2,y0,tw,32);cx.fill();cx.fillStyle='#fff';cx.fillText(nm,W/2,y0+17);cx.textAlign='left';
 // progress bar
 const bw=Math.min(300,W*.35),bx=W/2-bw/2,by=H-22;cx.fillStyle='rgba(40,60,160,.3)';pill(bx,by,bw,10);cx.fill();const f=G.mode==='win'?1:G.reached/Math.max(1,G.main);cx.fillStyle='#ffe45c';pill(bx,by,Math.max(10,bw*f),10);cx.fill();
 if(G.hintT>1.6&&G.on<2&&!G.fly&&G.mode==='play'){cx.textAlign='center';cx.font='800 22px ui-rounded,Nunito,sans-serif';cx.lineWidth=5;cx.lineJoin='round';cx.strokeStyle='rgba(50,40,140,.6)';cx.strokeText('Tap to leap when the dots point at the next planet!',W/2,H-50);cx.fillStyle='rgba(255,255,255,'+(0.75+0.25*Math.sin(G.t*5))+')';cx.fillText('Tap to leap when the dots point at the next planet!',W/2,H-50)}}
function fmt(t){const m=Math.floor(t/60),s=t%60;return m+':'+(s<10?'0':'')+s.toFixed(1)}
// ---------- loop ----------
let last=performance.now(),acc=0;const DT=1/120;
function frame(now){let d=Math.min(.1,(now-last)/1000);last=now;if(state()==='play'){acc+=d;while(acc>=DT){update(DT);acc-=DT}}else{acc=0;if(G&&G.mode==='win')update(d)}
 pollPad();music();draw();requestAnimationFrame(frame)}
// ---------- UI ----------
const OVS=['title','how','stats','settings','pause','over','map'];let back=null;
function show(id){OVS.forEach(o=>$(o).classList.toggle('on',o===id));$('touch').classList.toggle('on',!id&&!!G);$('ver').style.display=id==='title'?'block':'none';focusIdx=0;setTimeout(()=>focusFirst(),0)}
function cur(){return OVS.find(o=>$(o).classList.contains('on'))||null}
function state(){const c=cur();if(c)return c;return G?G.mode:'none'}
function start(n){audio();newGame(n||G&&G.lv||1);SV.st.plays++;save();show(null)}
function pause(){if(!G||cur()||G.mode!=='play')return;show('pause')}
function showOver(){const st=SV.st;st.clears++;st.time+=G.t;if(G.lv===1&&(!st.best||G.t<st.best))st.best=G.t;if(G.stars>st.bestStars)st.bestStars=G.stars;
 let cr=1;if(G.stars>=G.ST.length*.5)cr++;if(G.stars>=G.ST.length*.5&&G.misses<=3)cr++;if(cr>st.crowns)st.crowns=cr;const rec=SV.lv[G.lv]||{c:0,b:0,s:0};rec.c=Math.max(rec.c,cr);rec.b=rec.b?Math.min(rec.b,G.t):G.t;rec.s=Math.max(rec.s,G.stars);const first=!SV.lv[G.lv];SV.lv[G.lv]=rec;save();
 $('oTitle').textContent=G.lv===20?'You beat Grumbo!':'Level '+G.lv+' clear!';$('bNext').style.display=G.lv<20?'block':'none';if(first&&G.lv<20)setTimeout(()=>toast('Level '+(G.lv+1)+' unlocked!'),300);
 $('oCrowns').textContent='👑'.repeat(cr)+'◌'.repeat(3-cr);
 $('oT').innerHTML=row('Time',fmt(G.t))+row('Star berries',G.stars+' / '+G.ST.length)+row('Leaps',G.leaps)+row('Misses',G.misses)+row('Best time',fmt(rec.b))+'<tr><td colspan=2 style="font-size:13px;opacity:.8;text-align:center">Crowns: finish, grab half the berries, and miss 3 times or fewer.</td></tr>';show('over')}
function row(a,b){return '<tr><td>'+a+'</td><td>'+b+'</td></tr>'}
function statsT(){const s=SV.st;$('statT').innerHTML=row('Runs started',s.plays)+row('Level wins',s.clears)+row('Levels cleared',Object.keys(SV.lv).length+' / 20')+row('Crowns',totalCrowns()+' / 60')+row('Furthest unlocked',unlocked())+row('Fastest Pebble Belt',s.best?fmt(s.best):'-')+row('Most berries in a run',s.bestStars)+row('Best crowns',s.crowns+' / 3')+row('Total leaps',s.leaps)+row('Total berries',s.stars)+row('Total misses',s.misses)+row('Time flying',fmt(s.time))}
$('bPlay').onclick=()=>{audio();sfx('ui');openMap()};$('bNext').onclick=()=>start(G.lv+1);$('bHow').onclick=()=>{audio();back='title';show('how')};$('bStats').onclick=()=>{statsT();back='title';show('stats')};
$('bSet').onclick=()=>{audio();back='title';show('settings')};$('bPSet').onclick=()=>{back='pause';show('settings')};
document.querySelectorAll('.back').forEach(b=>b.onclick=()=>{sfx('ui');show(back||'title')});
$('bRes').onclick=()=>{show(null);last=performance.now()};$('bRestart').onclick=()=>start();$('bQuit').onclick=()=>{G=null;openMap()};
$('bAgain').onclick=()=>start();$('bOTitle').onclick=()=>{G=null;openMap()};
function totalCrowns(){let t=0;for(const k in SV.lv)t+=SV.lv[k].c;return t}
function unlocked(){let u=1;while(u<20&&SV.lv[u])u++;return u}
function openMap(){const u=unlocked();let h='';for(let w=0;w<4;w++){h+='<div class="wr"><div class="wn">World '+(w+1)+': '+WORLDS[w]+'</div>';for(let k=1;k<=5;k++){const n=w*5+k,rc=SV.lv[n],lock=n>u;h+='<button class="lvb'+(lock?' lk':'')+'" data-n="'+n+'"'+(lock?' disabled':'')+'><b>'+n+'</b><span>'+(lock?'🔒':(rc?'👑'.repeat(rc.c)+'◌'.repeat(3-rc.c):'New!'))+'</span><i>'+NAMES[n-1]+'</i></button>'}h+='</div>'}
 $('mapG').innerHTML=h;$('mapC').textContent=totalCrowns()+' / 60 crowns';$('mapG').querySelectorAll('.lvb').forEach(b=>b.onclick=()=>{sfx('ui');start(+b.dataset.n)});back='title';show('map');setTimeout(()=>{const b=$('mapG').querySelector('[data-n="'+u+'"]');if(b){b.focus();b.scrollIntoView({block:'nearest'})}},30)}
$('tPause').addEventListener('pointerdown',e=>{e.stopPropagation();pause()});
function bindR(id,k){const el=$(id);el.value=SV[k];el.oninput=()=>{SV[k]=+el.value;save();vol();bri()}}
bindR('sMus','mus');bindR('sSfx','sfx');bindR('sBri','bri');
function bri(){cv.style.filter=SV.bri===100?'':'brightness('+SV.bri/100+')'}bri();
$('feats').innerHTML=FEATS.map(f=>'<div class="set">'+f[1]+'<button class="tog" data-f="'+f[0]+'"></button></div>').join('');
function togs(){document.querySelectorAll('.tog').forEach(b=>{const on=SV.feat[b.dataset.f];b.classList.toggle('on',on);b.textContent=on?'On':'Off'})}togs();
document.querySelectorAll('.tog').forEach(b=>b.onclick=()=>{SV.feat[b.dataset.f]=!SV.feat[b.dataset.f];save();togs();sfx('ui')});
$('olds').innerHTML=OLDS.map(o=>'<div class="set">'+o[0]+' <span style="opacity:.8;font-weight:600">'+o[1]+'</span><button class="tog on" onclick="location.href=\''+o[2]+'\'">Open</button></div>').join('');
$('ver').textContent='Orbiloo '+VERSION;
const standalone=navigator.standalone||matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches;
if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!standalone)$('a2hs').style.display='block';
// ---------- input ----------
cv.addEventListener('pointerdown',e=>{e.preventDefault();audio();if(!cur()&&G)leap()});
addEventListener('keydown',e=>{audio();const c=cur();
 if(!c&&G){if(e.code==='Space'||e.code==='Enter'||e.code==='ArrowUp'||e.code==='KeyW'){e.preventDefault();if(!e.repeat)leap()}else if(e.code==='Escape'||e.code==='KeyP')pause();return}
 if(c){if(e.code==='ArrowDown'){e.preventDefault();moveF(1)}else if(e.code==='ArrowUp'){e.preventDefault();moveF(-1)}else if(e.code==='ArrowLeft'||e.code==='ArrowRight'){if(adj(e.code==='ArrowRight'?1:-1))e.preventDefault()}
  else if(e.code==='Escape'){escape()}else if((e.code==='Enter'||e.code==='Space')&&document.activeElement&&document.activeElement.tagName==='INPUT'){e.preventDefault()}}});
function escape(){const c=cur();if(c==='pause'){show(null);last=performance.now()}else if(c==='how'||c==='stats'||c==='settings')show(back||'title');else if(c==='map')show('title')}
let focusIdx=0;function focusables(){const c=cur();if(!c)return[];return [...$(c).querySelectorAll('button,input')].filter(e=>e.offsetParent!==null&&!e.disabled)}
function focusFirst(){const f=focusables();if(f[0])f[0].focus({preventScroll:true})}
function moveF(d){const f=focusables();if(!f.length)return;let i=f.indexOf(document.activeElement);i=(i+d+f.length)%f.length;f[i].focus();f[i].scrollIntoView({block:'nearest'});sfx('ui')}
function adj(d){const a=document.activeElement;if(a&&a.type==='range'){a.value=+a.value+d*5;a.oninput();return true}return false}
let pPrev=[];function pollPad(){const ps=navigator.getGamepads?navigator.getGamepads():[];let p=null;for(const q of ps)if(q&&q.connected){p=q;break}if(!p)return;
 const b=p.buttons.map(x=>x.pressed),ax=p.axes||[];b[20]=ax[1]<-.6;b[21]=ax[1]>.6;b[22]=ax[0]<-.6;b[23]=ax[0]>.6;const pr=i=>b[i]&&!pPrev[i];
 const c=cur();if(!c&&G){if(pr(0)||pr(1)||pr(2)||pr(3)){audio();leap()}if(pr(9)||pr(8))pause()}
 else if(c){if(pr(13)||pr(21))moveF(1);if(pr(12)||pr(20))moveF(-1);if(pr(14)||pr(22))adj(-1);if(pr(15)||pr(23))adj(1);if(pr(0)){audio();const a=document.activeElement;if(a&&a.tagName==='BUTTON')a.click()}if(pr(1))escape();if(pr(9)&&c==='pause')escape()}
 pPrev=b}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
window.OB={genLevel,tgt:i=>tgt(i),openMap,start,leap,step:n=>{for(let i=0;i<n;i++)update(DT)},get G(){return G},state,show};
requestAnimationFrame(frame)})();
