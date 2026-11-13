/* Orbiloo v1.5 - loop round tiny planets and leap between them. */
(function(){'use strict';
const VERSION='v1.5';
let PROBE=0;
const $=id=>document.getElementById(id);
const cv=$('cv'),cx=cv.getContext('2d');
let W=0,H=0,DPR=1,S=1;
function resize(){DPR=Math.min(window.devicePixelRatio||1,2.5);W=innerWidth;H=innerHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);S=H/500;}
addEventListener('resize',()=>{resize();BG.key=''});resize();
const sp=document.createElement('div');sp.style.cssText='position:fixed;left:0;top:0;padding-left:env(safe-area-inset-left);padding-top:env(safe-area-inset-top);visibility:hidden;pointer-events:none';document.body.appendChild(sp);
const SAFE={get l(){return parseFloat(getComputedStyle(sp).paddingLeft)||0},get t(){return parseFloat(getComputedStyle(sp).paddingTop)||0}};
// ---------- save ----------
const KEY='orbiloo-save-v1';
const FEAT0={aim:true,help:true,shake:true,spark:true,timer:true,rings:true,worms:true,flip:true,fancy:true,grav:true,charge:true,nudge:true,weight:true,jelly:true,combo:true,ghost:true,gold:true,outfit:true,daily:true,sphere:true,cinema:true,juice:true,expressive:true,glide:true,ribbon:true,snap:true,coach:true,tunes:true,ice:true,pads:true,bells:true,shards:true,whirl:true,sea:true,medals:true,charms:true,kind:true,assist:true,bloom:true,parade:true};
let SV={gold:{},charms:{},extra:0,saw:{},daily:{last:'',streak:0,best:0,done:0},hat:0,trailC:0,bestScore:{},lv:{},mus:60,sfx:80,bri:100,feat:Object.assign({},FEAT0),st:{plays:0,clears:0,best:0,bestStars:0,leaps:0,stars:0,misses:0,crowns:0,time:0}};
try{const o=JSON.parse(localStorage.getItem(KEY)||'null');if(o){Object.assign(SV,o);SV.feat=Object.assign({},FEAT0,o.feat||{});SV.lv=o.lv||{};SV.gold=o.gold||{};SV.charms=o.charms||{};SV.extra=o.extra||0;SV.saw=o.saw||{};SV.daily=o.daily||{last:'',streak:0,best:0,done:0};SV.hat=o.hat||0;SV.trailC=o.trailC||0;SV.bestScore=o.bestScore||{};SV.st=Object.assign({plays:0,clears:0,best:0,bestStars:0,leaps:0,stars:0,misses:0,crowns:0,time:0},o.st||{})}}catch(e){}
function save(){if(PROBE)return;try{localStorage.setItem(KEY,JSON.stringify(SV))}catch(e){}}
const FEATS=[['aim','Aim guide (dotted line showing your leap)'],['help','Helper gravity (after 3 misses)'],['shake','Screen shake'],['spark','Sparkles and trails'],['timer','Show timer'],['rings','Boost rings (from level 6)'],['worms','Wormholes (from level 11)'],['flip','Flip planets that swap spin (from level 16)'],['fancy','Fancy 3D backgrounds and planets (off = v1.1 look)'],
 ['grav','Smoother gravity + slingshots'],['charge','Charge leap (hold to power up)'],['nudge','Mid-air nudge (one per leap)'],['weight','Planet weights (big = strong + slow)'],
 ['jelly','Jelly bumpers and mossy planets'],['combo','Combo chains and score'],['ghost','Ghost race (your best run)'],['gold','Golden stars and bonus levels'],['outfit','Outfits (hats and trails)'],['daily','Daily Orbit'],
 ['sphere','Rounder planets (shaded spheres that squish)'],['cinema','Deeper sky (extra layers, bright, light haze)'],['juice','Leap flourishes (launch, capture, combo)'],['expressive','Expressive Loo (blinks, ears, steps)'],['glide','Smoother camera'],['ribbon','Heading ribbon (shows flight, not the answer)'],
 ['snap','Snappier leaps (faster charge, hold through a landing)'],['coach','Guided first steps'],['tunes','Per-world music'],['ice','Ice planets (Loo runs faster)'],['pads','Launch pads'],['bells','Bell moons (a friendly bounce)'],['shards','Crystal shards (off the main line)'],['whirl','Whirl planets (a faster orbit)'],['sea','Lantern Sea (levels 25–30 and Luma)'],['medals','Time trial medals'],['charms','Moon charms and extra outfits'],['kind','Kinder checkpoints'],['assist','Assist (wider catch and a sweet-spot glow)'],['bloom','Crisp sparkle pops'],['parade','World map path']];
const OLDS=[['v1.4','Rounder planets and expressive Loo','../orbiloo-v1.4/'],['v1.3','Charge, ghost and daily orbit','../orbiloo-v1.3/'],['v1.2','3D backgrounds','../orbiloo-v1.2/'],['v1.1','20 levels, flat backgrounds','../orbiloo-v1.1/'],['v1.0','First demo (1 level)','../orbiloo-v1.0/']];
// ---------- audio ----------
let AC=null,mG,sG,musT=0,musStep=0;
function audio(){if(AC){if(AC.state==='suspended')AC.resume().catch(()=>{});return}try{AC=new (window.AudioContext||window.webkitAudioContext)();mG=AC.createGain();sG=AC.createGain();mG.connect(AC.destination);sG.connect(AC.destination);vol();musT=AC.currentTime+.1}catch(e){AC=null}}
function vol(){if(!AC)return;mG.gain.value=(SV.mus/100)*.35;sG.gain.value=(SV.sfx/100)*.5}
function tone(f,t0,d,type,g,dest,f2){try{const o=AC.createOscillator(),e=AC.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t0);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t0+d);e.gain.setValueAtTime(0,t0);e.gain.linearRampToValueAtTime(g,t0+.01);e.gain.exponentialRampToValueAtTime(.0001,t0+d);o.connect(e);e.connect(dest);o.start(t0);o.stop(t0+d+.05)}catch(e){}}
function sfx(n,p){if(PROBE||!AC||SV.sfx<=0)return;const t=AC.currentTime;
 if(n==='leap')tone(380,t,.18,'triangle',.5,sG,820);
 else if(n==='land')tone(520*Math.pow(2,(p||0)*2/12),t,.12,'sine',.5,sG,300*Math.pow(2,(p||0)*2/12));
 else if(n==='boing')tone(300,t,.25,'sine',.45,sG,700);
 else if(n==='nudge')tone(700,t,.08,'triangle',.25,sG,900);
 else if(n==='gold'){[784,988,1175,1568,1976].forEach((f,i)=>tone(f,t+i*.07,.3,'triangle',.35,sG))}
 else if(n==='star'){const f=880*Math.pow(2,Math.min(p||0,12)/12);tone(f,t,.15,'triangle',.35,sG);tone(f*1.5,t+.05,.15,'sine',.25,sG)}
 else if(n==='bonk')tone(220,t,.3,'square',.25,sG,90);
 else if(n==='miss')tone(600,t,.5,'sine',.35,sG,150);
 else if(n==='cp'){[523,659,784].forEach((f,i)=>tone(f,t+i*.08,.2,'triangle',.35,sG))}
 else if(n==='win'){[523,659,784,1047,1319].forEach((f,i)=>tone(f,t+i*.1,.35,'triangle',.4,sG))}
 else if(n==='boost'){tone(500,t,.25,'sawtooth',.18,sG,1400);tone(1000,t+.05,.2,'sine',.2,sG,1600)}
 else if(n==='worm'){tone(1200,t,.4,'sine',.3,sG,200);tone(300,t+.1,.4,'triangle',.25,sG,900)}
 else if(n==='flip')tone(900,t,.08,'square',.12,sG,600);
 else if(n==='pop')tone(880,t,.1,'sine',.18,sG,1320);
 else if(n==='ui')tone(700,t,.06,'sine',.25,sG)}
const SC=[0,2,4,7,9,12,14,16];const CH=[[0,4,7],[5,9,12],[7,11,14],[3,7,10]];
const TUNES=[
 {step:.18,bass:118,mid:294,lead:587,ch:CH,pick:[0,1,0,2]},
 {step:.21,bass:92,mid:247,lead:494,ch:[[0,3,7],[5,8,12],[7,10,14],[3,7,10]],pick:[0,2,0,1]},
 {step:.19,bass:87,mid:220,lead:440,ch:[[0,4,9],[5,9,14],[7,11,16],[2,6,11]],pick:[0,1,0,3]},
 {step:.16,bass:104,mid:277,lead:554,ch:[[0,5,7],[5,9,12],[7,12,15],[3,7,10]],pick:[0,2,1,2]},
 {step:.17,bass:98,mid:262,lead:523,ch:[[0,4,7],[5,9,12],[7,11,16],[4,7,11]],pick:[0,1,0,2]},
 {step:.2,bass:82,mid:247,lead:494,ch:[[0,4,7],[3,7,10],[5,9,12],[7,11,14]],pick:[0,2,1,2]}];
function music(){if(!AC||SV.mus<=0){if(AC)musT=AC.currentTime+.05;return}
 const themed=!!(SV.feat.tunes&&G);
 while(musT<AC.currentTime+.3){const bar=Math.floor(musStep/8)%4;
  if(!themed){const ch=CH[[0,1,0,2][bar]];
   if(musStep%8===0)tone(110*Math.pow(2,ch[0]/12),musT,.9,'sine',.35,mG);
   if(musStep%2===0)tone(262*Math.pow(2,ch[(musStep/2)%3]/12),musT,.25,'triangle',.12,mG);
   if([1,3,6].includes(musStep%8)){const n=SC[(musStep*5+bar*3)%SC.length];tone(523*Math.pow(2,n/12),musT,.3,'sine',.1,mG)}
   musT+=.2;musStep++;continue}
  const tn=TUNES[Math.max(0,Math.min(TUNES.length-1,themeW(G.lv)))],ch=tn.ch[tn.pick[bar]%tn.ch.length];
  if(musStep%8===0)tone(tn.bass*Math.pow(2,ch[0]/12),musT,.9,'sine',.32,mG);
  if(musStep%2===0)tone(tn.mid*Math.pow(2,ch[(musStep/2)%3]/12),musT,.22,'triangle',.11,mG);
  if([1,3,6].includes(musStep%8)){const n=SC[(musStep*5+bar*3)%SC.length];tone(tn.lead*Math.pow(2,n/12),musT,.28,'sine',.09,mG)}
  musT+=tn.step;musStep++}}
// ---------- level ----------
// x,y,r,spin,{cp,goal,mv:[ax,ay,sp],moons}
const L=[[0,0,82,1.5,{cp:1}],[330,-40,72,1.6],[650,30,70,1.75],[960,-60,66,-1.85],[1290,20,62,1.95,{cp:1}],
 [1610,-90,58,-2.05],[1910,40,58,2.15],[2250,-40,62,-2.2,{mv:[0,70,.9]}],[2590,60,58,2.3,{mv:[0,90,1.1]}],[2920,-30,62,-2.3,{cp:1}],
 [3260,0,58,2.4,{mv:[60,60,1]}],[3600,-80,62,-2.4,{moons:1}],[3940,30,62,2.5,{moons:1}],[4280,-40,64,-2.5,{cp:1}],
 [4620,40,58,2.6,{moons:2,mv:[0,70,.9]}],[4960,-60,54,-2.7,{mv:[0,100,1.2]}],[5300,20,58,2.8,{moons:2}],[5640,-30,62,-2.85,{cp:1}],
 [5980,50,54,2.95,{moons:2,mv:[0,90,1]}],[6320,-50,52,-3,{moons:3}],[6700,0,115,1.1,{goal:1}]];
const COLS=[['#ffd36b','#f7a43b'],['#7fe0a8','#3cbf7a'],['#8fd3ff','#4a9ff0'],['#c9a6ff','#8f68f0'],['#ffb0d8','#f27ab8'],['#a8f0e6','#4cc8b8']];
const WORLDS=['Pebble Belt','Comet Coast','Wormhole Wood','Flipside Stars','Lantern Sea'];
const SEAN=['Lantern Shore','Glow Tide','Bell Harbor','Shard Narrows','Whirl Atoll','Luma\'s Lantern'];
const NAMES=['Pebble Belt','Pebble Pathway','Bouncy Boulders','Wobble Way','Spike Spiral','Comet Coast','Zoom Lagoon','Ring Reef','Sprint Shoals','Comet Crown','Wormhole Wood','Twisty Thicket','Portal Grove','Swirl Hollow','Burrow Glade','Flipside Stars','Topsy Turvy','Switchback Sky','Dizzy Drift','Grumbo\'s Lair'];
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const LVC={};function hz(L){return L.P.reduce((a,p)=>a+(p.o.mv?1:0)+(p.o.moons||0)+(p.o.flip?1.5:0),0)}
const BNAMES=['Sunny Sideloop','Comet Candy','Wormhole Waltz','Flipside Fiesta'];
function today(){const d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()}
function dayStr(v){v=v||today();return String(v).slice(0,4)+'-'+String(v).slice(4,6)+'-'+String(v).slice(6)}
function lvName(n){if(n===99)return 'Daily Orbit '+dayStr();if(n>=25&&n<=30)return SEAN[n-25];if(n>20)return 'Bonus: '+BNAMES[n-21];return NAMES[n-1]}
function themeW(n){return n===99?today()%4:n>=25&&n<=30?5:n>20?n-21:n===20?4:Math.min(3,(n-1)/5|0)}
function seaGeom(n){if(n===30)return lumaArena();
 const idx=n-25,R=rng(12000+n*97),cnt=15+idx*2,P=[];let x=0,y=0,sg=1;
 for(let i=0;i<cnt-1;i++){const o={};if(i===0||(i%5===0&&i<cnt-4))o.cp=1;
  const r=i===0?80:Math.max(58,74-idx*1.5+(R()-.5)*6);if(i>1&&R()<0.18+idx*0.05)sg=-sg;const sp=(1.35+idx*.1+R()*.12)*sg;
  if(!o.cp&&i>2){if(idx>=1&&R()<0.1+idx*.04)o.mv=[0,36+idx*8,.55];if(idx>=2&&R()<0.12+idx*.03)o.moons=1;if(idx>=4&&R()<0.16)o.flip=1;if(R()<0.22)o.ice=1;if(idx>=3&&!o.ice&&R()<0.18)o.whirl=1}
  P.push({x,y,r,spin:sp,o});x+=328+idx*14+R()*24;y=Math.max(-120,Math.min(120,y+(R()-.5)*(50+idx*16)))}
 P.push({x:x+70,y:0,r:114,spin:1,o:{goal:1}});
 const pads=[],bells=[],shards=[],worms=[],rings=[],main=P.length-1;
 const clear=(x,y,m)=>P.every(q=>Math.hypot(q.x-x,q.y-y)>q.r+m+((q.o.moons||0)?70:0)+(q.o.mv?Math.abs(q.o.mv[1]||0):0));
 if(idx>=1){for(let i=2;i<main-1;i+=4){const a=P[i],b=P[i+1];if(!b)continue;const ox=-(b.y-a.y),oy=b.x-a.x,l=Math.hypot(ox,oy)||1,px=(a.x+b.x)/2+ox/l*200,py=(a.y+b.y)/2+oy/l*200;if(clear(px,py,80))pads.push({x:px,y:py,tx:b.x,ty:b.y})}}
 if(idx>=2){for(let i=3;i<main-1;i+=5){const a=P[i],b=P[i+1];if(!b||a.o.moons)continue;bells.push({host:i,ang:Math.atan2(a.y-b.y,a.x-b.x),rad:a.r+96,r:16})}}
 if(idx>=3){for(let i=2;i<main-2;i+=6){const a=P[i],b=P[i+1];if(!b)continue;const ox=-(b.y-a.y),oy=b.x-a.x,l=Math.hypot(ox,oy)||1;const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;if(clear(mx+ox/l*185,my+oy/l*185,50))shards.push({x:mx+ox/l*185,y:my+oy/l*185,ux:ox/l,uy:oy/l,ph:i})}}
 if(idx>=3){const i=5,a=P[i],b=P[i+1],c=P[i+3];if(a&&b&&c&&!a.o.mv&&!c.o.mv){const ox=-(b.y-a.y),oy=b.x-a.x,l=Math.hypot(ox,oy)||1,ux=c.x-b.x,uy=c.y-b.y,ul=Math.hypot(ux,uy)||1;worms.push({ax:(a.x+b.x)/2+ox/l*170,ay:(a.y+b.y)/2+oy/l*170,bx:c.x-ux/ul*(c.r+120),by:c.y-uy/ul*(c.r+120),ux:ux/ul,uy:uy/ul,gap:i})}}
 if(idx>=2){for(let i=4;i<main-1;i+=7){const a=P[i],b=P[i+1];if(!b)continue;const ox=-(b.y-a.y),oy=b.x-a.x,l=Math.hypot(ox,oy)||1;rings.push({x:(a.x+b.x)/2+ox/l*165,y:(a.y+b.y)/2+oy/l*165,a:Math.atan2(b.y-a.y,b.x-a.x),gap:i})}}
 return{P,rings,worms,main,pads,bells,shards}}
function lumaArena(){const P=[{x:0,y:0,r:78,spin:1.4,o:{cp:1}},{x:340,y:18,r:68,spin:1.5,o:{}},{x:680,y:-12,r:64,spin:-1.45,o:{cp:1}}];
 const bx=1040,B=3;P.push({x:bx,y:0,r:120,spin:.8,o:{goal:1,boss:1,luma:1}});
 [155,205].forEach(deg=>{const a=deg*Math.PI/180;P.push({x:bx+420*Math.cos(a),y:420*Math.sin(a),r:60,spin:1.7,o:{cp:1,next:B}})});
 return{P,rings:[],worms:[],main:B,pads:[],bells:[{host:1,ang:Math.PI,rad:168,r:16}],shards:[]}}
function genLevel(n){if(n>=25&&n<=30)return LVC[n]||(LVC[n]=seaGeom(n));if(n===99){const ds=today(),k='d'+ds;return LVC[k]||(LVC[k]=genOne(6+ds%9,ds*7+1))}if(n>20){return LVC[n]||(LVC[n]=genOne((n-21)*5+4,4242+n*977))}if(LVC[n])return LVC[n];if(n===1)return LVC[1]={P:L.map(p=>({x:p[0],y:p[1],r:p[2],spin:p[3],o:Object.assign({},p[4]||{})})),rings:[],worms:[]};
 const T=17.5+(n-1)*1.8;let best=null,bd=1e9;for(let k=0;k<600;k++){const L=genOne(n,n*7919+13+k*101);if(n>=11&&L.worms.length<1+(n>=15?1:0))continue;if(n>=6&&L.rings.length<2)continue;const d=Math.abs(hz(L)-T);if(d<bd){bd=d;best=L}if(d<.5)break}return LVC[n]=soften(n,best)}
// Timing-bot playtests: L12 planet 26's twin moons blocked the checkpoint exit (about 40 fails per success and the level never finished). One moon stays. L15 planet 4 spun so fast the moon gap could not be read, so the opening sent you back to the start; the spin is eased and both moons stay.
function soften(n,L){if(!L)return L;if(n===12){const p=L.P[26];if(p&&p.o&&p.o.moons>1)p.o.moons=1}else if(n===15){const p=L.P[4];if(p&&!p.o.goal)p.spin*=.8}return L}
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
function dress(n,P,pack){if(n===99||(n>=21&&n<=24)||n>=25)return;const R=rng(8000+n*53);
 if(SV.feat.ice&&n>=7){for(const p of P){if(p.i>1&&!p.o.cp&&!p.o.goal&&!p.o.boss&&!p.o.moons&&R()<.16)p.ice=1}}
 if(SV.feat.whirl&&n>=18){for(const p of P){if(p.i>2&&!p.o.cp&&!p.o.goal&&!p.ice&&!p.o.moons&&R()<.14)p.whirl=1}}
 const main=P.findIndex(p=>p.o.goal);const clear=(x,y,m)=>P.every(q=>Math.hypot(q.x-x,q.y-y)>q.r+m+((q.o.moons||q.o.boss)?80:0)+(q.o.mv?90:0));
 if(SV.feat.pads&&n>=8){let k=0;for(let i=3;i<main-1&&k<(n>=14?2:1);i+=3){const a=P[i],b=P[i+1];if(!b)continue;const ox=-(b.by-a.by),oy=b.bx-a.bx,l=Math.hypot(ox,oy)||1,sg=R()<.5?1:-1;const x=(a.bx+b.bx)/2+ox/l*200*sg,y=(a.by+b.by)/2+oy/l*200*sg;if(clear(x,y,70)){pack.pads.push({x,y,tx:b.bx,ty:b.by,cool:0});k++}}}
 if(SV.feat.bells&&n>=10){let k=0;for(let i=4;i<main-1&&k<(n>=16?2:1);i+=4){const a=P[i],b=P[i+1];if(!b||a.o.moons||a.o.boss||a.o.cp)continue;pack.bells.push({host:a.i,ang:Math.atan2(a.by-b.by,a.bx-b.bx),rad:a.r+100,r:16});k++}}
 if(SV.feat.shards&&n>=14){let k=0;for(let i=3;i<main-2&&k<(n>=18?2:1);i+=5){const a=P[i],b=P[i+1];if(!b)continue;const ox=-(b.by-a.by),oy=b.bx-a.bx,l=Math.hypot(ox,oy)||1;const x=(a.bx+b.bx)/2+ox/l*185,y=(a.by+b.by)/2+oy/l*185;if(clear(x,y,50)){pack.shards.push({x,y,ux:ox/l,uy:oy/l,ph:i});k++}}}}
function build(n){const Lv=genLevel(n);if(!SV.feat.rings)Lv.rings=[];if(!SV.feat.worms)Lv.worms=[];
 const P=Lv.P.map((p,i)=>({i,bx:p.x,by:p.y,x:p.x,y:p.y,r:p.r,spin:p.spin,s0:p.spin,o:p.o,c:COLS[i%COLS.length],ph:Math.random()*6,blink:Math.random()*4,squ:0,ice:(SV.feat.ice&&p.o.ice)?1:0,whirl:(SV.feat.whirl&&p.o.whirl&&!p.o.ice)?1:0}));
 const ST=[],wg={};Lv.worms.forEach(w=>wg[w.gap]=w);const nxt=i=>P[i].o.next!=null?P[i].o.next:i+1;for(let i=0;i<P.length;i++){if(P[i].o.goal)continue;if(wg[i-1])continue;const a=P[i],b=P[nxt(i)];if(!b)continue;const n=wg[i]?1:(i<3?2:3);for(let k=0;k<n;k++){const f=(k+1)/(n+1),ox=-(b.by-a.by),oy=b.bx-a.bx,l=Math.hypot(ox,oy);const bend=Math.sin(f*Math.PI)*(i%2?40:-40);ST.push({x:a.bx+(b.bx-a.bx)*f+ox/l*bend,y:a.by+(b.by-a.by)*f+oy/l*bend,got:0,t:Math.random()*6})}}
 Lv.worms.forEach(w=>{for(let k=1;k<=2;k++)ST.push({x:w.bx+w.ux*k*45,y:w.by+w.uy*k*45,got:0,t:k})});
 const rr=rng((n===99?today():n)*53+9),J=[];let gold=null;const main=Lv.main||P.length-1;
 const clear=(x,y,m)=>P.every(q=>Math.hypot(q.x-x,q.y-y)>q.r+m+((q.o.moons||q.o.boss)?75:0)+(q.o.mv?Math.abs(q.o.mv[1]):0));
 if(SV.feat.jelly){for(let i=2;i<main-1;i++){const a=P[i];if(!a.o.cp&&!a.o.mv&&!a.o.flip&&n>=3&&rr()<.16)a.moss=1;
   if(n>=4&&i%5===2&&rr()<.8){const b=P[i+1],ox=-(b.by-a.by),oy=b.bx-a.bx,l=Math.hypot(ox,oy),sg=rr()<.5?1:-1;for(const off of[170,200,230]){const x=(a.bx+b.bx)/2+ox/l*off*sg,y=(a.by+b.by)/2+oy/l*off*sg;if(clear(x,y,90)){J.push({x,y,r:30,w:0});break}}}}}
 if(SV.feat.gold&&n!==99){const c=[];for(let i=Math.floor(main/3);i<main-1;i++){const a=P[i];if(a.o.mv||a.o.moons||a.o.goal||a.o.next!=null)continue;for(const off of[175,215])for(const sg of[-1,1]){const x=a.x,y=a.y+sg*(a.r+off);if(clear(x,y,70)&&J.every(j=>Math.hypot(j.x-x,j.y-y)>110))c.push({x,y,i})}}if(!c.length)for(let i=1;i<main-1;i++){const a=P[i];if(a.o.mv||a.o.moons)continue;for(const sg of[-1,1]){const x=a.x,y=a.y+sg*(a.r+175);if(clear(x,y,55))c.push({x,y,i})}}
  if(c.length)gold=Object.assign(c[Math.floor(rr()*c.length)],{got:0,t:0})}
 let charm=null;if(SV.feat.charms&&n!==99){const cs=[];for(let i=2;i<main-1;i++){const a=P[i];if(a.o.mv||a.o.moons||a.o.goal||a.o.next!=null)continue;for(const sg of[-1,1]){const x=a.x+sg*(a.r+160),y=a.y;if(clear(x,y,60)&&(!gold||Math.hypot(gold.x-x,gold.y-y)>90)&&J.every(j=>Math.hypot(j.x-x,j.y-y)>80))cs.push({x,y})}}if(cs.length)charm=Object.assign(cs[Math.floor(rr()*cs.length)],{got:0,t:0})}
 const pads=(SV.feat.pads&&Lv.pads)?Lv.pads.map(p=>Object.assign({cool:0},p)):[];
 const bells=(SV.feat.bells&&Lv.bells)?Lv.bells.map(b=>Object.assign({},b)):[];
 const shards=(SV.feat.shards&&Lv.shards)?Lv.shards.map(s=>Object.assign({},s)):[];
 dress(n,P,{pads,bells,shards});
 return {P,ST,J,gold,charm,rings:Lv.rings,worms:Lv.worms,main,pads,bells,shards}}
function newGame(n){const b=build(n);let gh=null;if(SV.feat.ghost){try{gh=JSON.parse(localStorage.getItem(ghostKey(n))||'null')}catch(e){}}G={J:b.J,gold:b.gold,charm:b.charm,pads:b.pads,bells:b.bells,shards:b.shards,score:0,chain:0,bestChain:0,lastLand:-9,charge:0,holding:false,wantHold:0,shield:0,coach:0,rec:[],ghost:gh,lv:n,rings:b.rings,worms:b.worms,main:b.main,bossHp:3,boost:0,mode:'play',P:b.P,ST:b.ST,t:0,stars:0,leaps:0,misses:0,missCp:0,cp:0,on:0,ang:-Math.PI/2,fly:null,ox:0,oy:0,vx:0,vy:0,cam:{x:0,y:0},shake:0,parts:[],flash:0,combo:0,lastLeave:-1,leaveT:0,winT:0,dead:0,squash:0,trail:[],reached:0,hintT:0,bursts:[],floats:[],face:null,ear:0,run:0,dust:0};placeOn(0,-Math.PI/2);G.cam.x=G.px;G.cam.y=G.py;}
function ghostKey(n){return 'orbiloo-ghost-'+(n===99?'d'+today():n)}
function placeOn(i,a){G.on=i;G.ang=a;G.fly=null;const p=G.P[i];G.px=p.x+Math.cos(a)*(p.r+15);G.py=p.y+Math.sin(a)*(p.r+15)}
function respawn(){const p=G.P[G.cp];G.combo=0;let a=-Math.PI/2;if(SV.feat.kind){const n=G.P[tgt(G.cp)];if(n){const aim=Math.atan2(n.y-p.y,n.x-p.x),d=Math.sign(p.spin)||1;a=aim-d*Math.PI/2-d*.55}G.shield=.7}placeOn(G.cp,a);G.dead=0;puff(G.px,G.py,'#ffffff',14);if(SV.feat.bloom)G.bursts.push({x:G.px,y:G.py,c:'#ffffff',r:10,l:.45,w:18});if(SV.feat.snap&&SV.feat.charge&&G.wantHold){G.holding=true;G.charge=0}}
// ---------- particles ----------
function puff(x,y,c,n,sp){if(!SV.feat.spark&&n>6)n=6;for(let i=0;i<n;i++){const a=Math.random()*6.283,v=(sp||120)*(.4+Math.random());G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:.6+Math.random()*.4,m:1,c,r:3+Math.random()*4})}}
function toast(t,ms){if(PROBE)return;const el=$('toast');el.textContent=t;el.style.opacity=1;clearTimeout(toast.h);toast.h=setTimeout(()=>el.style.opacity=0,ms||1400)}
function seen(k,msg){if(PROBE||!SV.feat.coach||SV.saw[k])return;SV.saw[k]=1;save();toast(msg,2000)}
// ---------- update ----------
const SPEED=540,ORB=15;
function leap(pw){if(!G||G.mode!=='play'||G.fly||G.dead)return;const p=G.P[G.on];if(p.o.goal)return;const d=Math.sign(p.spin);const SPD=pw==null?SPEED:SPEED*(.85+.4*pw);
 const tx=-Math.sin(G.ang)*d,ty=Math.cos(G.ang)*d;const pv=planetVel(p);
 G.fly={t:0,sl:{},nudged:0,pw:pw==null?0:pw};G.vx=tx*SPD+pv.x*.5;G.vy=ty*SPD+pv.y*.5;G.holding=false;G.charge=0;if(pw!=null&&pw>.8){if(SV.feat.shake)G.shake=3;puff(G.px,G.py,'#ffe45c',8,140)}G.lastLeave=G.on;G.leaps++;SV.st.leaps++;G.squash=1;sfx('leap');puff(G.px,G.py,'#ffffff',6,80);if(SV.feat.juice){G.bursts.push({x:G.px,y:G.py,c:'#ffffff',r:8,l:.42,w:12});if((pw||0)>.6)G.bursts.push({x:G.px,y:G.py,c:'#ffe45c',r:14,l:.4,w:20})}G.hintT=99}
function nudge(dx,dy){if(!SV.feat.nudge||!G||!G.fly||G.fly.nudged||G.mode!=='play')return false;
 if(dx==null){let best=null,bd=1e9;for(const p of G.P){if(p.i===G.lastLeave)continue;const ex=p.x-G.px,ey=p.y-G.py,dd=Math.hypot(ex,ey);if(ex*G.vx+ey*G.vy<=0)continue;if(dd<bd){bd=dd;best=p}}if(!best)return false;dx=best.x-G.px;dy=best.y-G.py}
 const l=Math.hypot(dx,dy)||1,sp=Math.hypot(G.vx,G.vy);G.vx+=dx/l*190;G.vy+=dy/l*190;const s2=Math.hypot(G.vx,G.vy);G.vx*=sp/s2;G.vy*=sp/s2;G.fly.nudged=1;sfx('nudge');puff(G.px,G.py,'#ffffff',7,90);return true}
function press(){if(!G||cur()||G.mode!=='play'||G.dead)return;if(SV.feat.snap)G.wantHold=1;if(G.fly){nudge();return}if(SV.feat.charge){G.holding=true;G.charge=0}else leap()}
function release(){if(G)G.wantHold=0;if(!G||!G.holding)return;G.holding=false;if(G.fly||G.dead||cur())return;leap(G.charge)}
function planetVel(p){if(!p.o.mv)return{x:0,y:0};const [ax,ay,sp]=p.o.mv;return{x:Math.cos(G.t*sp+p.i)*ax*sp,y:Math.cos(G.t*sp+p.i)*ay*sp}}
function animLoo(dt){if(G.mode!=='play'&&G.mode!=='win')return;let up=0;if(G.fly)up=Math.atan2(G.vy,G.vx);else if(G.P[G.on])up=Math.atan2(G.py-G.P[G.on].y,G.px-G.P[G.on].x);const target=up+Math.PI/2;if(G.face==null||!isFinite(G.face))G.face=target;let d=target-G.face;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;G.face+=d*(1-Math.pow(.0015,dt));const earT=G.fly?.5:0;G.ear+=(earT-(G.ear||0))*(1-Math.pow(.02,dt));if(!G.fly&&G.P[G.on])G.run=(G.run||0)+Math.abs(G.P[G.on].spin)*dt*spinMul(G.P[G.on])}
function update(dt){if(!G)return;
 if(SV.feat.expressive)animLoo(dt);
 if(G.bursts){for(let i=G.bursts.length-1;i>=0;i--){G.bursts[i].l-=dt;if(G.bursts[i].l<=0)G.bursts.splice(i,1)}}
 if(G.floats){for(let i=G.floats.length-1;i>=0;i--){const f=G.floats[i];f.y+=f.vy*dt;f.l-=dt;if(f.l<=0)G.floats.splice(i,1)}}
 if(G.mode==='play'||G.mode==='win'){G.t+=G.mode==='play'?dt:0;}
 const T=G.t;
 for(const p of G.P){if(p.o.flip&&SV.feat.flip){p.spin=p.s0*(Math.floor((T+p.i*.7)/2.6)%2?-1:1)}if(p.o.mv){const [ax,ay,sp]=p.o.mv;p.x=p.bx+Math.sin(T*sp+p.i)*ax;p.y=p.by+Math.sin(T*sp+p.i)*ay}p.squ*=Math.pow(.02,dt);p.blink-=dt;if(p.blink<-.15)p.blink=2+Math.random()*4}
 for(const s of G.ST)s.t+=dt;for(const r of G.rings)if(r.hit)r.hit=Math.max(0,r.hit-dt)>0?r.hit-dt:0;
 for(let i=G.parts.length-1;i>=0;i--){const q=G.parts[i];q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.96;q.vy*=.96;q.l-=dt;if(q.l<=0)G.parts.splice(i,1)}
 G.shake*=Math.pow(.001,dt);G.squash*=Math.pow(.004,dt);G.flash=Math.max(0,G.flash-dt);
 if(G.mode==='win'){G.winT+=dt;const p=G.P[G.on];G.ang+=p.spin*dt;G.px=p.x+Math.cos(G.ang)*(p.r+ORB);G.py=p.y+Math.sin(G.ang)*(p.r+ORB);if(Math.random()<.5)puff(p.x+(Math.random()-.5)*400,p.y-200-Math.random()*100,COLS[(Math.random()*6)|0][0],1,60);if(G.winT>1.6&&G.mode==='win'){G.mode='done';if(!PROBE)showOver()}camera(dt);return}
 if(G.mode!=='play')return;
 if(G.dead){G.dead-=dt;if(G.dead<=0)respawn();camera(dt);return}
 if(G.shield>0)G.shield-=dt;if(G.holding&&!G.fly)G.charge=Math.min(1,G.charge+dt/(SV.feat.snap?.48:.7));
 if(SV.feat.ghost&&G.mode==='play'){G.rt=(G.rt||0)+dt;if(G.rt>=.1){G.rt-=.1;G.rec.push(Math.round(G.px),Math.round(G.py))}}
 if(!G.fly){const p=G.P[G.on];G.ang+=p.spin*dt*spinMul(p);G.px=p.x+Math.cos(G.ang)*(p.r+ORB);G.py=p.y+Math.sin(G.ang)*(p.r+ORB);G.hintT+=dt;if(SV.feat.juice&&!G.dead){G.dust+=dt;if(G.dust>.09){G.dust=0;const d=Math.sign(p.spin)||1,tx=Math.sin(G.ang)*d,ty=-Math.cos(G.ang)*d;G.parts.push({x:G.px+tx*12,y:G.py+ty*12,vx:tx*50,vy:ty*50,l:.32,c:p.c[0],r:2.4})}}}
 else{G.fly.t+=dt;const help=SV.feat.help&&G.missCp>=3;
  for(const p of G.P){if(p.i===G.lastLeave&&G.fly.t<.3)continue;const dx=p.x-G.px,dy=p.y-G.py,d=Math.hypot(dx,dy),GV=SV.feat.grav,as=SV.feat.assist?1.08:1,rng=p.r*(GV?(help?3.6:3):(help?3.4:2.6))*as,wm=SV.feat.weight?Math.pow(p.r/64,.8):1;
   if(d<rng){const a=(GV?900*p.r/d*(1.15-d/rng)*(help?1.5:1):(help?95000:62000)*p.r/(d*d))*wm;G.vx+=dx/d*a*dt;G.vy+=dy/d*a*dt;if(GV)G.fly.sl[p.i]=Math.min(G.fly.sl[p.i]||1e9,d);if(SV.feat.juice&&d<p.r*1.5){G.fly.zap=G.fly.zap||{};if(!G.fly.zap[p.i]){G.fly.zap[p.i]=1;G.bursts.push({x:p.x,y:p.y,c:p.c[0],r:p.r*.25,l:.32,w:p.r*.65})}}}
   else if(GV&&G.fly.sl[p.i]!=null){if(G.fly.sl[p.i]<p.r*2.1){G.vx*=1.18;G.vy*=1.18;G.boost=.6;sfx('boost');puff(G.px,G.py,'#8ff0ff',8,120);toast('Slingshot!',700);if(SV.feat.combo)G.score+=50}delete G.fly.sl[p.i]}
   if(d<p.r+ORB+(help?30:16)+(SV.feat.assist?8:0)){land(p);break}}
  if(G.fly){G.boost=Math.max(0,G.boost-dt);const cap=SPEED*(G.boost>0?1.6:1.15),sp=Math.hypot(G.vx,G.vy);if(sp>cap){G.vx*=cap/sp;G.vy*=cap/sp}
   for(const r of G.rings){if(!r.hit&&Math.hypot(r.x-G.px,r.y-G.py)<40){r.hit=.6;G.vx*=1.4;G.vy*=1.4;G.boost=.7;sfx('boost');puff(r.x,r.y,'#ffe45c',10,160);if(SV.feat.shake)G.shake=4}}
   for(const w of G.worms){if(Math.hypot(w.ax-G.px,w.ay-G.py)<36){G.px=w.bx;G.py=w.by;G.vx=w.ux*SPEED;G.vy=w.uy*SPEED;G.fly.t=0;G.lastLeave=-1;G.trail.length=0;sfx('worm');puff(w.ax,w.ay,'#c9a6ff',12,150);puff(w.bx,w.by,'#8ff0e6',12,150);break}}
   for(const j of G.J){const ex=G.px-j.x,ey=G.py-j.y,dd=Math.hypot(ex,ey);if(dd<j.r+14){const nx=ex/dd,ny=ey/dd,vn=G.vx*nx+G.vy*ny;if(vn<0){G.vx-=2*vn*nx;G.vy-=2*vn*ny;G.vx*=1.08;G.vy*=1.08;G.boost=.4}G.px=j.x+nx*(j.r+15);G.py=j.y+ny*(j.r+15);j.w=1;G.fly.t=Math.min(G.fly.t,1.6);G.fly.nudged=0;sfx('boing');puff(G.px,G.py,'#ff9ad5',8,110)}}
   for(const pad of G.pads){if(pad.cool>0)continue;if(Math.hypot(pad.x-G.px,pad.y-G.py)<28){const dx=pad.tx-pad.x,dy=pad.ty-pad.y,L=Math.hypot(dx,dy)||1,sp=Math.max(Math.hypot(G.vx,G.vy),SPEED*1.05);G.vx=dx/L*sp;G.vy=dy/L*sp;G.boost=.45;pad.cool=.8;G.fly.nudged=0;sfx('boost');puff(pad.x,pad.y,'#7ef0ff',8,130);seen('pad','Launch pad! It flings you toward the next planet.')}}
   for(const b of G.bells){if(b.x==null)continue;const ex=G.px-b.x,ey=G.py-b.y,dd=Math.hypot(ex,ey);if(dd<b.r+14){const nx=ex/(dd||1),ny=ey/(dd||1),vn=G.vx*nx+G.vy*ny;if(vn<0){G.vx-=2*vn*nx;G.vy-=2*vn*ny;G.vx*=1.05;G.vy*=1.05}G.px=b.x+nx*(b.r+16);G.py=b.y+ny*(b.r+16);G.fly.nudged=0;sfx('boing');puff(b.x,b.y,'#ffe08a',8,110);seen('bell','Bell moon! A friendly bounce, and your nudge comes back.')}}
   G.px+=G.vx*dt;G.py+=G.vy*dt;if(SV.feat.spark)G.trail.push({x:G.px,y:G.py,l:.35,c:G.chain>=3?COLS[(G.t*8|0)%6][0]:null});
   let near=1e9;for(const p of G.P)near=Math.min(near,Math.hypot(p.x-G.px,p.y-G.py)-p.r);
   if(G.fly.t>3||near>800)miss()}}
 for(let i=G.trail.length-1;i>=0;i--){G.trail[i].l-=dt;if(G.trail[i].l<=0)G.trail.splice(i,1)}
 // moons
 for(const b of G.bells){const host=G.P[b.host];if(!host)continue;const w=Math.sin(T*1.2)*.35;b.x=host.x+Math.cos(b.ang+w)*b.rad;b.y=host.y+Math.sin(b.ang+w)*b.rad}
 for(const s of G.shards){const w=Math.sin(T*1.3+s.ph)*34;s.dx=s.x+s.ux*w;s.dy=s.y+s.uy*w}
 for(const pad of G.pads)if(pad.cool>0)pad.cool=Math.max(0,pad.cool-dt);
 for(const p of G.P){const n=moonN(p);for(let k=0;k<n;k++){const a=-T*1.3*Math.sign(p.spin)+k*6.283/n+p.i,mr=p.r+58;const mx=p.x+Math.cos(a)*mr,my=p.y+Math.sin(a)*mr;
  if(!G.dead&&!(G.shield>0)&&Math.hypot(mx-G.px,my-G.py)<17+12){bonk(mx,my)}}}
 for(const s of G.shards){if(!G.dead&&!(G.shield>0)&&Math.hypot(s.dx-G.px,s.dy-G.py)<16+12)bonk(s.dx,s.dy)}
 for(const j of G.J)j.w*=Math.pow(.03,dt);
 if(G.gold&&!G.gold.got){G.gold.t+=dt;if(Math.hypot(G.gold.x-G.px,G.gold.y-G.py)<34){G.gold.got=1;SV.gold[G.lv]=1;save();sfx('gold');if(SV.feat.shake)G.shake=6;for(let i=0;i<24;i++)puff(G.gold.x,G.gold.y,'#ffd36b',1,240);toast(G.lv<=20?'Golden star found! ('+goldN(themeW(G.lv))+'/5 in this world)':'Golden star!',1800)}}
 if(G.charm&&!G.charm.got){G.charm.t+=dt;if(Math.hypot(G.charm.x-G.px,G.charm.y-G.py)<30){G.charm.got=1;SV.charms[G.lv]=1;save();sfx('gold');toast('Moon charm! ('+charmCount()+' found)',1600);if(SV.feat.bloom)G.bursts.push({x:G.charm.x,y:G.charm.y,c:'#fff6c8',r:8,l:.5,w:18})}}
 // stars
 for(const s of G.ST){if(!s.got&&Math.hypot(s.x-G.px,s.y-G.py)<28){s.got=1;G.stars++;SV.st.stars++;if(SV.feat.combo)G.score+=10*Math.max(1,Math.min(G.chain,8));G.combo++;sfx('star',G.combo);puff(s.x,s.y,'#ffe45c',8,140);if(SV.feat.coach&&G.lv<=2)G.coach=Math.max(G.coach,2);if(SV.feat.bloom){G.bursts.push({x:s.x,y:s.y,c:'#ffe45c',r:6,l:.45,w:16});for(let i=0;i<6;i++){const a=i/6*6.283;G.parts.push({x:s.x,y:s.y,vx:Math.cos(a)*150,vy:Math.sin(a)*150,l:.4,c:i%2?'#fff':'#ffe45c',r:3.2})}}}}
 if(G.parts.length>120)G.parts.splice(0,G.parts.length-120);if(G.bursts&&G.bursts.length>28)G.bursts.splice(0,G.bursts.length-28);
 camera(dt)}
function spinMul(p){let m=1;if(SV.feat.weight)m*=Math.pow(64/p.r,.6);if(p.moss&&SV.feat.jelly)m*=.55;if(p.ice&&SV.feat.ice)m*=1.32;if(p.whirl&&SV.feat.whirl)m*=1.18;return m}
function goldN(w){let c=0;for(let k=w*5+1;k<=w*5+5;k++)if(SV.gold[k])c++;return c}
function bonusOpen(w){return goldN(w)>=3}
function moonN(p){return p.o.boss?1+(3-G.bossHp):(p.o.moons||0)}
function tgt(i){const p=G.P[i];return p.o.next!=null?p.o.next:Math.min(i+1,G.P.length-1)}
function land(p){G.fly=null;G.on=p.i;G.ang=Math.atan2(G.py-p.y,G.px-p.x);G.squash=1;p.squ=1;if(SV.feat.combo){G.chain=(G.t-G.lastLand<2.2)?G.chain+1:1;G.lastLand=G.t;G.bestChain=Math.max(G.bestChain,G.chain);G.score+=100*Math.min(G.chain,8);if(G.chain>=2)toast('Combo x'+Math.min(G.chain,8)+'!',600)}sfx('land',SV.feat.combo?Math.min(G.chain-1,10):0);puff(G.px,G.py,p.c[0],8,90);G.combo=0;G.hintT=0;
 if(p.o.cp&&p.i>G.cp&&p.o.next==null){G.cp=p.i;G.missCp=0;sfx('cp');toast('Checkpoint!');if(SV.feat.coach&&G.lv<=2&&p.i>0)G.coach=Math.max(G.coach,4);if(SV.feat.bloom)G.bursts.push({x:G.px,y:G.py-p.r,c:'#9dffc8',r:8,l:.5,w:20})}
 if(SV.feat.juice){G.bursts.push({x:G.px,y:G.py,c:'#ffffff',r:6,l:.38,w:10});G.bursts.push({x:p.x,y:p.y,c:p.c[0],r:p.r*.15,l:.46,w:p.r*.5});if(G.chain>=2){G.floats.push({x:G.px,y:G.py-24,t:'x'+Math.min(G.chain,8),l:.85,vy:-36});sfx('pop')}if(SV.feat.shake)G.shake=Math.max(G.shake,G.chain>=3?2.2:1)}
 if(p.i>G.reached&&p.i<=G.main)G.reached=p.i;
 if(p.i>0&&SV.feat.coach&&G.lv<=2)G.coach=Math.max(G.coach,1);if(p.ice)seen('ice','Ice planet. Loo runs faster, so the leap comes round sooner.');if(p.whirl)seen('whirl','Whirl planet. The orbit is quicker.');
 if(p.o.boss&&G.bossHp>1){G.bossHp--;const o=G.P.filter(q=>q.o.next!=null)[2-G.bossHp];sfx('bonk');sfx('cp');if(SV.feat.shake)G.shake=14;G.flash=.3;for(let i=0;i<30;i++)puff(p.x,p.y,COLS[i%6][0],1,280);o.squ=1;G.cp=o.i;placeOn(o.i,Math.PI);toast(p.o.luma?(G.bossHp===2?'Luma flickers! Two more lands':'One more land! The fireflies multiply'):(G.bossHp===2?'Grumbo wobbles! 2 more hits':'One more hit! Watch the extra moons'),2000);if(SV.feat.snap&&SV.feat.charge&&G.wantHold){G.holding=true;G.charge=0}return}
 if(p.o.goal){if(p.o.boss)G.bossHp=0;G.mode='win';G.winT=0;sfx('win');if(SV.feat.shake)G.shake=8;for(let i=0;i<40;i++)puff(p.x,p.y-p.r,COLS[i%6][0],1,300)}
 else if(SV.feat.snap&&SV.feat.charge&&G.wantHold){G.holding=true;G.charge=0}}
function miss(){G.chain=0;G.misses++;G.missCp++;SV.st.misses++;sfx('miss');G.dead=.8;G.fly=null;puff(G.px,G.py,'#ffffff',10);if(SV.feat.help&&G.missCp===3)toast('Helper gravity on: planets pull harder now',2200);else toast('Whoops! Back to the flag')}
function bonk(x,y){G.chain=0;G.misses++;G.missCp++;SV.st.misses++;sfx('bonk');if(SV.feat.shake)G.shake=10;G.flash=.25;G.dead=.8;G.fly=null;puff(G.px,G.py,'#c9a6ff',14,200);if(SV.feat.help&&G.missCp===3)toast('Helper gravity on: planets pull harder now',2200);else toast('Bonk! Dodge the spike moons')}
function camera(dt){const p=G.P[tgt(G.on)];let tx,ty,k;
 if(!SV.feat.glide){tx=G.fly?G.px+G.vx*.25:(G.px*.6+p.x*.4);ty=G.fly?G.py:(G.py*.6+p.y*.4);k=1-Math.pow(.03,dt);G.cam.x+=(tx-G.cam.x)*k;G.cam.y+=(ty-G.cam.y)*k;return}
 if(G.fly){const sp=Math.hypot(G.vx,G.vy)||1,lead=Math.min(130,sp*.16);tx=G.px+G.vx/sp*lead;ty=G.py+G.vy/sp*Math.min(42,lead*.32)}
 else{const pl=G.P[G.on],d=Math.sign(pl.spin)||1,fx=-Math.sin(G.ang)*d,fy=Math.cos(G.ang)*d;tx=G.px*.66+p.x*.34+fx*34;ty=G.py*.8+p.y*.2+fy*14}
 k=1-Math.pow(.08,dt);G.cam.x+=(tx-G.cam.x)*k;G.cam.y+=(ty-G.cam.y)*(1-Math.pow(.1,dt))}
// ---------- draw ----------

// ---------- fancy backgrounds (cached offscreen layers) ----------
const THEMES=[
 {sky:['#4fa8ff','#9cc4ff','#f6cbff'],neb:['#ff9ad5','#7ff0e6','#c9a6ff'],hero:['#7fe0c8','#4aa8d8'],ring:'#ffe6a8',rock:'#b8a6e8',comets:.25,rays:'#fff4d0'},
 {sky:['#2fb8e8','#86e6e2','#ffe4a8'],neb:['#8ff0ff','#ffe08a','#9ad0ff'],hero:['#5ac8ff','#2a7ad8'],ring:'#ffffff',rock:'#9ad8e8',comets:1.2,rays:'#fff8d8'},
 {sky:['#6a62e8','#64cdd2','#c4f2c0'],neb:['#a8ff9a','#c08bff','#6ff0d8'],hero:['#9aef7a','#3aa86a'],ring:'#d8b8ff',rock:'#8ad8a8',comets:.3,rays:'#e8ffe0'},
 {sky:['#3e52d8','#8f86f6','#ffd0f2'],neb:['#ff9ae8','#8fb8ff','#ffe68a'],hero:['#ffc86a','#d880e8'],ring:'#9af0ff',rock:'#c8b0ff',comets:.5,rays:'#fff0ff'},
 {sky:['#5a4ee0','#b88aff','#ffd98a'],neb:['#ffd86a','#ff9ad5','#a88bff'],hero:['#ffd36b','#f0a040'],ring:'#fff2c0',rock:'#d8b8ff',comets:.6,rays:'#fff2b8'},
 {sky:['#49c8ff','#b6f3ff','#ffe7a8'],neb:['#8ff6ff','#ffe08a','#b8ffd8'],hero:['#ffe07a','#3ec0e0'],ring:'#fff3c0',rock:'#9ad4f0',comets:.7,rays:'#fff6d0'}];
function hsl(hex,dh,dl){let r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0,l=(mx+mn)/2;
 if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60}
 h=(h+dh+360)%360;if(h<25||h>335)h=h<25?25:335;l=Math.max(0,Math.min(1,l+(dl||0)));return 'hsl('+h.toFixed(0)+','+(s*100).toFixed(0)+'%,'+(l*100).toFixed(0)+'%)'}
function mk(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w|0);c.height=Math.max(1,h|0);return c}
const BG={key:''};
function sphere(c2,R,base,dark,o){const x=c2;const g=x.createRadialGradient(-R*.4,-R*.45,R*.05,-R*.1,-R*.1,R*1.05);g.addColorStop(0,'#ffffff');g.addColorStop(.18,base);g.addColorStop(.75,dark);g.addColorStop(1,dark);
 x.fillStyle=g;x.beginPath();x.arc(0,0,R,0,6.283);x.fill();
 if(o&&o.bands){x.save();x.beginPath();x.arc(0,0,R,0,6.283);x.clip();x.globalAlpha=.22;for(let k=-3;k<=3;k++){x.fillStyle=k%2?'#ffffff':dark;x.beginPath();x.ellipse(0,k*R*.28,R*1.2,R*.09,-.25,0,6.283);x.fill()}x.restore()}
 const sh=x.createRadialGradient(-R*.5,-R*.55,R*.6,-R*.3,-R*.3,R*1.7);sh.addColorStop(0,'rgba(20,10,80,0)');sh.addColorStop(.55,'rgba(20,10,80,0)');sh.addColorStop(1,'rgba(20,10,80,.55)');x.fillStyle=sh;x.beginPath();x.arc(0,0,R,0,6.283);x.fill();
 x.strokeStyle='rgba(200,250,255,.55)';x.lineWidth=Math.max(2,R*.04);x.beginPath();x.arc(0,0,R*.97,.1,1.7);x.stroke()}
function heroSprite(th,R,rnd,kind){const pad=R*1.1,c=mk(R*2+pad*2,R*2+pad*2),x=c.getContext('2d');x.translate(c.width/2,c.height/2);
 const glow=x.createRadialGradient(0,0,R*.9,0,0,R*1.45);glow.addColorStop(0,th.neb[1]+'aa');glow.addColorStop(1,th.neb[1]+'00');x.fillStyle=glow;x.beginPath();x.arc(0,0,R*1.45,0,6.283);x.fill();
 const ringed=kind!==1,tilt=-.35+rnd()*.3;
 const ringDraw=(front)=>{x.save();x.rotate(tilt);x.scale(1,.28);for(let k=0;k<3;k++){x.strokeStyle=k===1?th.ring+'cc':th.ring+'77';x.lineWidth=R*.09;x.beginPath();x.arc(0,0,R*(1.45+k*.14),front?0:Math.PI,front?Math.PI:6.283);x.stroke()}x.restore()};
 if(ringed)ringDraw(false);
 const base=hsl(th.hero[0],(rnd()-.5)*30),dark=hsl(th.hero[1],(rnd()-.5)*30,-.08);sphere(x,R,base,dark,{bands:kind===2});
 if(kind===1){x.save();x.beginPath();x.arc(0,0,R,0,6.283);x.clip();x.fillStyle='rgba(255,255,255,.18)';for(let k=0;k<6;k++){x.beginPath();x.arc((rnd()-.5)*R*1.4,(rnd()-.5)*R*1.4,R*(.08+rnd()*.12),0,6.283);x.fill()}x.restore()}
 if(ringed)ringDraw(true);return c}
function rockSprite(col,R){const c=mk(R*2.6,R*2.6),x=c.getContext('2d');x.translate(c.width/2,c.height/2);x.beginPath();for(let k=0;k<9;k++){const a=k/9*6.283,rr=R*(.8+.2*Math.sin(k*2.3));x.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}x.closePath();
 const g=x.createRadialGradient(-R*.4,-R*.4,1,0,0,R);g.addColorStop(0,'#ffffff');g.addColorStop(.3,col);g.addColorStop(1,'#5a4a9a');x.fillStyle=g;x.fill();x.fillStyle='rgba(60,40,120,.25)';x.beginPath();x.arc(R*.25,R*.1,R*.2,0,6.283);x.fill();return c}
function shadeHex(hex,k){let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);r=Math.round(r+(28-r)*k);g=Math.round(g+(40-g)*k);b=Math.round(b+(96-b)*k);return 'rgb('+r+','+g+','+b+')'}
function buildBG(n){const key=n+'|'+W+'|'+H+'|'+(n===99?today():'')+'|'+(SV.feat.cinema?'C':'');if(BG.key===key)return;BG.key=key;const w=themeW(n),th=THEMES[w],rnd=rng(n*31+7),dh=(rnd()-.5)*22;
 const sky=[0,1,2].map(i=>hsl(th.sky[i],dh));const nb=th.neb.map(c=>c);
 // sky + nebula at half res
 const sc=DPR,c=mk(W*sc,H*sc),x=c.getContext('2d');const gr=x.createLinearGradient(0,0,0,c.height);gr.addColorStop(0,sky[0]);gr.addColorStop(.6,sky[1]);gr.addColorStop(1,sky[2]);x.fillStyle=gr;x.fillRect(0,0,c.width,c.height);
 for(let k=0;k<9;k++){const px=rnd()*c.width,py=rnd()*c.height*.8,rr=(.25+rnd()*.35)*c.height;const g=x.createRadialGradient(px,py,0,px,py,rr);g.addColorStop(0,nb[k%3]+'66');g.addColorStop(.5,nb[k%3]+'22');g.addColorStop(1,nb[k%3]+'00');x.fillStyle=g;x.fillRect(0,0,c.width,c.height)}
 {const hz=x.createLinearGradient(0,c.height*.45,0,c.height);hz.addColorStop(0,'rgba(255,255,255,0)');hz.addColorStop(1,'rgba(255,255,255,.12)');x.fillStyle=hz;x.fillRect(0,0,c.width,c.height)}BG.sky=c;
 // star tiles with depth
 BG.tiles=[[.03,220,.6,1.1],[.08,90,1,1.8],[.14,30,1.6,2.6]].map(([d,cnt,r0,r1])=>{const t=mk(512,512),y=t.getContext('2d');for(let k=0;k<cnt;k++){const px=rnd()*512,py=rnd()*512,rr=r0+rnd()*(r1-r0);y.globalAlpha=.5+rnd()*.5;y.fillStyle=k%7===0?nb[k%3]:'#ffffff';y.beginPath();y.arc(px,py,rr,0,6.283);y.fill();if(rr>2.2){y.globalAlpha=.35;y.fillRect(px-rr*3,py-.6,rr*6,1.2);y.fillRect(px-.6,py-rr*3,1.2,rr*6)}}return{c:t,d}});
 // hero planets spread across level, depth layers
 const L=genLevel(n),len=(L.P[L.P.length-1].x||6000)+800;BG.heroes=[];const cnt=4+(n%3);
 for(let k=0;k<cnt;k++){const d=k%2?.18:.3,R=(d>.2?120:70)+rnd()*60,kind=(n+k)%3;BG.heroes.push({c:heroSprite(th,R,rnd,kind),x:(k+.3+rnd()*.4)/cnt*len*d,y:(rnd()-.5)*500*d-60,d,spin:(rnd()-.5)*.1})}
 BG.heroes.sort((a,b)=>a.d-b.d);
 BG.rocks=[0,1,2,3,4].map(k=>rockSprite(hsl(th.rock,(rnd()-.5)*20),10+rnd()*16));BG.rockSeed=n*13;
 // light rays
 const rc=mk(512,512),ry=rc.getContext('2d');ry.translate(256,256);for(let k=0;k<14;k++){ry.rotate(6.283/14);const g=ry.createLinearGradient(0,0,256,0);g.addColorStop(0,th.rays+'aa');g.addColorStop(1,th.rays+'00');ry.fillStyle=g;ry.beginPath();ry.moveTo(0,0);ry.lineTo(256,-18-k%3*8);ry.lineTo(256,18+k%3*8);ry.closePath();ry.fill()}
 const sg=ry.createRadialGradient(0,0,0,0,0,70);sg.addColorStop(0,'#ffffffee');sg.addColorStop(1,'#ffffff00');ry.fillStyle=sg;ry.beginPath();ry.arc(0,0,70,0,6.283);ry.fill();BG.rays=rc;
 BG.sunX=.12+rnd()*.25;{const k=BG.sky.getContext('2d');k.save();k.globalAlpha=.32;k.translate(BG.sky.width*BG.sunX,BG.sky.height*.08);const rs=Math.max(BG.sky.width,BG.sky.height)*1.1;k.drawImage(rc,-rs/2,-rs/2,rs,rs);k.restore()}BG.th=th;BG.w=w;BG.comets=[];BG.cT=0;BG.far=null;BG.vig=null;BG.farHeroes=null;if(SV.feat.cinema)buildCinema(n,th)}
function buildCinema(n,th){const rnd=rng(n*17+3);const tw=Math.max(8,W*.55|0),thh=Math.max(8,H*.55|0),t=mk(tw,thh),y=t.getContext('2d');
 for(let k=0;k<6;k++){const px=rnd()*tw,py=rnd()*thh,rr=thh*(.28+rnd()*.4);const g=y.createRadialGradient(px,py,0,px,py,rr);const col=th.neb[k%3];g.addColorStop(0,col+'55');g.addColorStop(1,col+'00');y.fillStyle=g;y.beginPath();y.arc(px,py,rr,0,6.283);y.fill()}
 y.globalAlpha=.22;y.fillStyle=th.rays;y.beginPath();y.ellipse(tw*.5,thh*.62,tw*.46,thh*.09,-.2,0,6.283);y.fill();y.globalAlpha=1;BG.far=t;BG.vig=null;
 const sk=BG.sky.getContext('2d'),vg=sk.createRadialGradient(BG.sky.width/2,BG.sky.height*.46,Math.min(BG.sky.width,BG.sky.height)*.3,BG.sky.width/2,BG.sky.height*.5,Math.max(BG.sky.width,BG.sky.height)*.74);
 vg.addColorStop(0,'rgba(10,24,70,0)');vg.addColorStop(1,'rgba(16,32,84,.18)');sk.fillStyle=vg;sk.fillRect(0,0,BG.sky.width,BG.sky.height);
 const L=genLevel(n),len=(L.P[L.P.length-1].x||6000)+800;BG.farHeroes=[];
 for(let k=0;k<2;k++){const R=34+rnd()*22;BG.farHeroes.push({c:heroSprite(th,R,rnd,k%3),x:(k+.45)/2*len*.08,y:(rnd()-.5)*240,d:.055})}}
function drawBG(n,cmx,cmy,T){buildBG(n);cx.drawImage(BG.sky,0,0,W,H);
 if(SV.feat.cinema&&BG.far){const d=.02,ox=Math.max(-W*.08,Math.min(W*.08,-cmx*d*S*.2)),oy=Math.max(-H*.08,Math.min(H*.08,-cmy*d*S*.2));cx.drawImage(BG.far,ox-W*.08,oy-H*.08,W*1.16,H*1.16);
  if(BG.farHeroes)for(const h of BG.farHeroes){const sc=S*(.42+h.d*2),x=W/2+(h.x-cmx*h.d)*S,y=H*.4+(h.y-cmy*h.d)*S,w=h.c.width*sc*.5;if(x<-w||x>W+w)continue;cx.drawImage(h.c,x-w/2,y-w/2,w,w)}}
 // rays (slow rotation) from a soft sun
 // star layers
 for(const t of BG.tiles){const ox=((-cmx*t.d*S)%512+512)%512,oy=((-cmy*t.d*S)%512+512)%512;for(let x=ox-512;x<W;x+=512)for(let y=oy-512;y<H;y+=512)cx.drawImage(t.c,x,y)}
 // twinkles
 for(let i=0;i<14;i++){const px=((i*233.7-cmx*.06*S)%(W+40)+W+40)%(W+40)-20,py=((i*97.1-cmy*.06*S)%H+H)%H,a=Math.max(0,Math.sin(T*1.7+i*1.3));if(a<.2)continue;cx.globalAlpha=a;cx.fillStyle='#fff';cx.fillRect(px-5*a,py-.8,10*a,1.6);cx.fillRect(px-.8,py-5*a,1.6,10*a)}cx.globalAlpha=1;
 // hero planets (camera-relative depth)
 for(const h of BG.heroes){const sc=S*(.55+h.d*1.2),x=W/2+(h.x-cmx*h.d)*S,y=H*.42+(h.y-cmy*h.d)*S,w=h.c.width*sc*.6;if(x<-w||x>W+w)continue;cx.drawImage(h.c,x-w/2,y-w/2,w,w)}
 // comets
 BG.cT-=1/60;if(BG.cT<=0&&BG.comets.length<3){BG.comets.push({x:W*(.2+Math.random()*.9),y:-30,vx:-(120+Math.random()*120),vy:60+Math.random()*80,l:0});BG.cT=(2+Math.random()*5)/BG.th.comets}
 for(let i=BG.comets.length-1;i>=0;i--){const c=BG.comets[i];c.x+=c.vx/60;c.y+=c.vy/60;c.l+=1/60;if(c.y>H+40||c.x<-200){BG.comets.splice(i,1);continue}const g=cx.createLinearGradient(c.x,c.y,c.x-c.vx*.6,c.y-c.vy*.6);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');cx.strokeStyle=g;cx.lineWidth=4;cx.lineCap='round';cx.beginPath();cx.moveTo(c.x,c.y);cx.lineTo(c.x-c.vx*.6,c.y-c.vy*.6);cx.stroke();cx.fillStyle='#fff';cx.beginPath();cx.arc(c.x,c.y,3.5,0,6.283);cx.fill()}
 // mid-depth drifting asteroids
 const d=.45,sp=520;const base=Math.floor((cmx*d-W/S)/sp);for(let k=base;k<base+Math.ceil(2*W/S/sp)+3;k++){const r=rng(k*977+BG.rockSeed);if(r()<.35)continue;const spr=BG.rocks[(r()*5)|0],wx=k*sp+r()*sp,wy=(r()-.5)*900+Math.sin(T*.4+k)*12;const x=W/2+(wx-cmx*d)*S,y=H/2+(wy-cmy*d)*S;if(x<-60||x>W+60)continue;cx.save();cx.translate(x,y);cx.rotate(T*(r()-.5)*.6+k);cx.globalAlpha=.85;const s2=S*(.7+r()*.4);cx.drawImage(spr,-spr.width*s2/2,-spr.height*s2/2,spr.width*s2,spr.height*s2);cx.restore()}cx.globalAlpha=1;
}
function circ(x,y,r){cx.beginPath();cx.arc(x,y,r,0,6.2832)}
function draw(){cx.setTransform(DPR,0,0,DPR,0,0);
 const cmx=G?G.cam.x:performance.now()*.03,cmy=G?G.cam.y:0,T=performance.now()/1000;
 if(SV.feat.fancy)drawBG(G?G.lv:1,cmx,cmy,T);else{ const gr=cx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#5fb4ff');gr.addColorStop(.6,'#a7c8ff');gr.addColorStop(1,'#f3c9ff');cx.fillStyle=gr;cx.fillRect(0,0,W,H);
 // far stars & bubbles
 for(let i=0;i<50;i++){const px=((i*137.5-cmx*.1)%(W+40)+W+40)%(W+40)-20,py=((i*71.3-cmy*.1)%H+H)%H;cx.globalAlpha=.5+.4*Math.sin(T*2+i);cx.fillStyle='#fff';circ(px,py,1.2+(i%3)*.6);cx.fill()}
 cx.globalAlpha=1;
 for(let i=0;i<6;i++){const px=((i*420-cmx*.25)%(W+400)+W+400)%(W+400)-200,py=H*(.2+.12*(i%4))-cmy*.08;cx.fillStyle=['#ffffff33','#ffe6fa44','#d8f0ff44'][i%3];circ(px,py,60+i%3*30);cx.fill()}
}
 if(!G){return}
 cx.save();let sx=0,sy=0;if(G.shake>.2){sx=(Math.random()-.5)*G.shake;sy=(Math.random()-.5)*G.shake}
 cx.translate(W/2+sx,H/2+sy);cx.scale(S,S);cx.translate(-G.cam.x,-G.cam.y);
 // aim guide
 if(SV.feat.aim&&!G.fly&&!G.dead&&G.mode==='play'&&!G.P[G.on].o.goal){const p=G.P[G.on],d=Math.sign(p.spin),tx=-Math.sin(G.ang)*d,ty=Math.cos(G.ang)*d;const len=G.on<4?300:200;
  for(let i=1;i<12;i++){const f=i/12*len;cx.globalAlpha=.75*(1-i/12);cx.fillStyle='#fff';circ(G.px+tx*f,G.py+ty*f,4);cx.fill()}cx.globalAlpha=1}
 if(SV.feat.assist&&!G.fly&&!G.dead&&G.mode==='play'&&!G.P[G.on].o.goal){const p=G.P[G.on],a=sweetAng(p);if(a!=null){cx.strokeStyle='rgba(255,244,160,.95)';cx.lineWidth=6;cx.lineCap='round';cx.beginPath();cx.arc(p.x,p.y,p.r+ORB,a-.22,a+.22);cx.stroke()}}
 if(SV.feat.ribbon&&G.mode==='play'&&!G.dead){if(G.fly){const sp=Math.hypot(G.vx,G.vy)||1,ux=G.vx/sp,uy=G.vy/sp;cx.lineCap='round';for(let i=1;i<=5;i++){cx.globalAlpha=.5*(1-i/6);cx.strokeStyle='#e7fbff';cx.lineWidth=7-i;cx.beginPath();cx.moveTo(G.px+ux*10,G.py+uy*10);cx.lineTo(G.px+ux*(16+i*14),G.py+uy*(16+i*14));cx.stroke()}cx.globalAlpha=1}else if(!G.P[G.on].o.goal){const p=G.P[G.on],d=Math.sign(p.spin)||1;cx.strokeStyle='rgba(255,255,255,.5)';cx.lineWidth=5;cx.lineCap='round';cx.beginPath();cx.arc(p.x,p.y,p.r+ORB,G.ang,G.ang+d*.8,d<0);cx.stroke()}}
 // orbit rings
 for(const p of G.P){cx.strokeStyle='rgba(255,255,255,.35)';cx.lineWidth=2;cx.setLineDash([6,10]);circ(p.x,p.y,p.r+ORB);cx.stroke();cx.setLineDash([])}
 // stars
 for(const s of G.ST){if(s.got)continue;const b=Math.sin(s.t*3)*4;star(s.x,s.y+b,13,'#ffe45c','#f2a91c',s.t)}
 // trail
 const TRC=['#fff6c8','#ffd36b','#8ff0c0','#c9a6ff','#8fd3ff',null][SV.feat.outfit?SV.trailC:0];for(const q of G.trail){cx.globalAlpha=q.l/.35*.7;cx.fillStyle=q.c||(TRC||COLS[(q.x/40|0)%6][0]);circ(q.x,q.y,7*q.l/.35);cx.fill()}cx.globalAlpha=1;
 for(const r of G.rings)ring(r,T);for(const w of G.worms)worm(w,T);
 for(const pad of G.pads||[]){cx.save();cx.translate(pad.x,pad.y);cx.rotate(Math.atan2(pad.ty-pad.y,pad.tx-pad.x));cx.fillStyle='#7ef0ff';circ(0,0,16);cx.fill();cx.strokeStyle='#1f7f8c';cx.lineWidth=3;cx.stroke();cx.fillStyle='#ffe45c';circ(10,0,7);cx.fill();cx.fillStyle='#fff';circ(-5,-5,3.5);cx.fill();cx.restore()}
 for(const s of G.shards||[]){const x=s.dx==null?s.x:s.dx,y=s.dy==null?s.y:s.dy;cx.save();cx.translate(x,y);cx.rotate(T+(s.ph||0));cx.beginPath();cx.moveTo(0,-13);cx.lineTo(7,0);cx.lineTo(0,13);cx.lineTo(-7,0);cx.closePath();cx.fillStyle='#c8fff6';cx.fill();cx.strokeStyle='#1f7f8c';cx.lineWidth=2;cx.stroke();cx.restore()}
 for(const p of G.P)planet(p,T);for(const j of G.J)jelly(j,T);if(G.gold&&!G.gold.got)goldStar(G.gold,T);if(G.charm&&!G.charm.got)charmDraw(G.charm,T);if(G.ghost&&SV.feat.ghost)ghost();
 // moons
 for(const p of G.P){const n=moonN(p);for(let k=0;k<n;k++){const a=-G.t*1.3*Math.sign(p.spin)+k*6.283/n+p.i,mr=p.r+58;moon(p.x+Math.cos(a)*mr,p.y+Math.sin(a)*mr,a)}}
 for(const b of G.bells||[]){if(b.x==null)continue;cx.save();cx.translate(b.x,b.y);cx.fillStyle='#ffe08a';circ(0,0,b.r);cx.fill();cx.strokeStyle='#c8962a';cx.lineWidth=2.5;cx.stroke();cx.fillStyle='#fff';circ(-4,-4,3);cx.fill();cx.fillStyle='#3a2a6a';circ(-3,1,1.5);cx.fill();circ(3,1,1.5);cx.fill();cx.restore()}
 for(const p of G.P)if(p.o.luma){for(let k=0;k<7;k++){const a=T*.6+k*.9;cx.fillStyle=k%2?'#fff6c0':'#d8fff4';circ(p.x+Math.cos(a)*(p.r+64),p.y+Math.sin(a*1.2)*(p.r+48),3.2);cx.fill()}}
 if(G.shield>0&&!G.dead){cx.strokeStyle='rgba(255,255,255,.95)';cx.lineWidth=3;circ(G.px,G.py,22);cx.stroke()}
 if(!G.dead){if(G.holding&&!G.fly){cx.lineWidth=5;cx.lineCap='round';cx.strokeStyle='rgba(60,40,140,.35)';circ(G.px,G.py,27);cx.stroke();cx.strokeStyle=G.charge>=1?'#8ff0a0':'#ffe45c';cx.beginPath();cx.arc(G.px,G.py,27,-Math.PI/2,-Math.PI/2+G.charge*6.283);cx.stroke();G.squash=Math.max(G.squash,G.charge*.6)}hero()}
 for(const q of G.parts){cx.globalAlpha=Math.min(1,q.l*2);cx.fillStyle=q.c;circ(q.x,q.y,q.r);cx.fill()}cx.globalAlpha=1;
 if((SV.feat.juice||SV.feat.bloom)&&G.bursts){for(const b of G.bursts){cx.globalAlpha=Math.max(0,Math.min(1,b.l*2.2));cx.strokeStyle=b.c;cx.lineWidth=3.5;circ(b.x,b.y,(b.w||16)+(.5-b.l)*70);cx.stroke()}cx.globalAlpha=1;cx.font='800 20px ui-rounded,Nunito,sans-serif';cx.textAlign='center';cx.lineWidth=4;for(const f of G.floats||[]){cx.globalAlpha=Math.min(1,f.l*2);cx.strokeStyle='rgba(40,30,100,.55)';cx.strokeText(f.t,f.x,f.y);cx.fillStyle='#fff';cx.fillText(f.t,f.x,f.y)}cx.globalAlpha=1}
 cx.restore();
 // light fog
 const fg=cx.createLinearGradient(0,H*.75,0,H);fg.addColorStop(0,'rgba(255,255,255,0)');fg.addColorStop(1,'rgba(255,255,255,.28)');cx.fillStyle=fg;cx.fillRect(0,H*.75,W,H*.25);
 if(G.flash>0){cx.fillStyle='rgba(255,255,255,'+(G.flash*1.6)+')';cx.fillRect(0,0,W,H)}
 hud()}
function star(x,y,r,c1,c2,t){cx.save();cx.translate(x,y);cx.rotate(Math.sin(t*2)*.2);cx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.5:r;cx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}cx.closePath();cx.fillStyle=c1;cx.fill();cx.lineJoin='round';cx.lineWidth=3;cx.strokeStyle=c2;cx.stroke();cx.fillStyle='#fff';circ(-r*.25,-r*.3,r*.18);cx.fill();cx.restore()}
function sphereSprite(p){const r=p.r,sc=3,pad=r*1.5,c=mk(pad*2*sc,pad*2*sc),x=c.getContext('2d');c.sc=sc;x.scale(sc,sc);x.translate(pad,pad);
 const au=x.createRadialGradient(0,0,r*.9,0,0,r*1.26);au.addColorStop(0,p.c[0]+'00');au.addColorStop(.45,p.c[0]+'55');au.addColorStop(1,p.c[0]+'00');x.fillStyle=au;x.beginPath();x.arc(0,0,r*1.26,0,6.283);x.fill();
 const body=x.createRadialGradient(-r*.46,-r*.5,r*.04,r*.1,r*.14,r*1.02);body.addColorStop(0,'#ffffff');body.addColorStop(.12,p.c[0]);body.addColorStop(.5,p.c[0]);body.addColorStop(.8,p.c[1]);body.addColorStop(1,shadeHex(p.c[1],.34));x.fillStyle=body;x.beginPath();x.arc(0,0,r,0,6.283);x.fill();
 x.save();x.beginPath();x.arc(0,0,r,0,6.283);x.clip();
 const tm=x.createRadialGradient(-r*.1,-r*.15,r*.2,r*.4,r*.42,r*1.15);tm.addColorStop(0,'rgba(255,255,255,0)');tm.addColorStop(.55,'rgba(16,24,70,0)');tm.addColorStop(1,'rgba(18,28,72,.30)');x.fillStyle=tm;x.fillRect(-r*2,-r*2,r*4,r*4);
 x.globalAlpha=.07;for(let k=-1;k<=1;k++){x.fillStyle=k%2?'#ffffff':p.c[1];x.beginPath();x.ellipse(0,k*r*.28,r*1.15,r*.045,-.15,0,6.283);x.fill()}x.restore();
 x.fillStyle='rgba(255,255,255,.88)';x.beginPath();x.ellipse(-r*.4,-r*.46,r*.2,r*.11,-.65,0,6.283);x.fill();x.fillStyle='rgba(255,255,255,.45)';x.beginPath();x.ellipse(-r*.22,-r*.28,r*.08,r*.04,-.65,0,6.283);x.fill();
 x.strokeStyle='rgba(236,252,255,.95)';x.lineWidth=Math.max(2.4,r*.055);x.beginPath();x.arc(0,0,r*.94,.2,2.15);x.stroke();x.strokeStyle='rgba(255,255,255,.45)';x.lineWidth=Math.max(1.5,r*.025);x.beginPath();x.arc(0,0,r*.86,2.8,4.3);x.stroke();
 x.beginPath();x.arc(0,0,r,0,6.283);x.lineWidth=2.5;x.strokeStyle='rgba(48,40,110,.32)';x.stroke();return c}
function planetSprite(p){if(SV.feat.sphere)return sphereSprite(p);const r=p.r,sc=3,pad=r*1.35,c=mk(pad*2*sc,pad*2*sc),x=c.getContext('2d');c.sc=sc;x.scale(sc,sc);x.translate(pad,pad);
 const au=x.createRadialGradient(0,0,r*.9,0,0,r*1.3);au.addColorStop(0,p.c[0]+'88');au.addColorStop(1,p.c[0]+'00');x.fillStyle=au;x.beginPath();x.arc(0,0,r*1.3,0,6.283);x.fill();
 const sh=x.createRadialGradient(r*.25,r*.35,r*.6,r*.25,r*.35,r*1.25);sh.addColorStop(0,'rgba(30,30,110,.28)');sh.addColorStop(1,'rgba(30,30,110,0)');x.fillStyle=sh;x.beginPath();x.arc(r*.25,r*.35,r*1.25,0,6.283);x.fill();
 const g=x.createRadialGradient(-r*.35,-r*.4,r*.1,0,0,r);g.addColorStop(0,'#ffffff');g.addColorStop(.25,p.c[0]);g.addColorStop(1,p.c[1]);x.fillStyle=g;x.beginPath();x.arc(0,0,r,0,6.283);x.fill();
 const tm=x.createRadialGradient(-r*.45,-r*.5,r*.5,-r*.3,-r*.35,r*1.55);tm.addColorStop(0,'rgba(40,20,110,0)');tm.addColorStop(.6,'rgba(40,20,110,0)');tm.addColorStop(1,'rgba(40,20,110,.42)');x.fillStyle=tm;x.beginPath();x.arc(0,0,r,0,6.283);x.fill();
 x.strokeStyle='rgba(210,250,255,.75)';x.lineWidth=3;x.beginPath();x.arc(0,0,r-2,.15,1.75);x.stroke();x.fillStyle='rgba(255,255,255,.55)';x.beginPath();x.ellipse(-r*.38,-r*.48,r*.2,r*.11,-.6,0,6.283);x.fill();
 x.beginPath();x.arc(0,0,r,0,6.283);x.lineWidth=4;x.strokeStyle='rgba(60,40,120,.35)';x.stroke();return c}
function planet(p,T){const F=SV.feat.fancy,ball=!!(F&&SV.feat.sphere);const r=ball?p.r:p.r*(1+p.squ*.06);{const sx=W/2+(p.x-G.cam.x)*S,sy=H/2+(p.y-G.cam.y)*S,m=(r+90)*S;if(sx<-m||sx>W+m||sy<-m||sy>H+m)return}cx.save();cx.translate(p.x,p.y);if(ball){const q=Math.min(1,p.squ);cx.scale(1+q*.11,1-q*.13);cx.fillStyle='rgba(20,32,84,.22)';cx.beginPath();cx.ellipse(r*.08,r*.86,r*.95,r*.22,0,0,6.283);cx.fill()}
 if(p.o.goal){const rb=['#ff9ad5','#ffd36b','#8ff0a0','#8fd3ff','#c9a6ff'];rb.forEach((c,i)=>{cx.strokeStyle=c;cx.lineWidth=9;circ(0,0,r+30+i*9);cx.globalAlpha=.55;cx.stroke()});cx.globalAlpha=1}
 if(p.o.luma){cx.strokeStyle='#ffe08a';cx.lineWidth=5;circ(0,0,r+16);cx.stroke()}
 if(p.o.flip&&SV.feat.flip){const ph=((T+p.i*.7)%2.6);const warn=ph>2.0;cx.strokeStyle=warn?'rgba(255,255,255,'+(.5+.5*Math.sin(T*30))+')':'rgba(255,255,255,.6)';cx.lineWidth=5;cx.lineCap='round';const d=Math.sign(p.spin);for(let k=0;k<2;k++){const a0=k*Math.PI+T*p.spin*.6;cx.beginPath();cx.arc(0,0,r+28,a0,a0+1.1*d,d<0);cx.stroke();const ae=a0+1.1*d,ex=Math.cos(ae)*(r+28),ey=Math.sin(ae)*(r+28);cx.beginPath();cx.arc(ex,ey,5,0,6.3);cx.fillStyle=cx.strokeStyle;cx.fill()}}
 if(F){if(!p.spr)p.spr=planetSprite(p);const q=p.spr,k=r/p.r;cx.drawImage(q,-q.width/q.sc/2*k,-q.height/q.sc/2*k,q.width/q.sc*k,q.height/q.sc*k)}else{cx.fillStyle='rgba(40,60,140,.15)';circ(6,8,r);cx.fill();
 const g=cx.createRadialGradient(-r*.35,-r*.4,r*.1,0,0,r);g.addColorStop(0,'#ffffff');g.addColorStop(.25,p.c[0]);g.addColorStop(1,p.c[1]);cx.fillStyle=g;circ(0,0,r);cx.fill();
/*x*/ if(0){const tm=cx.createRadialGradient(-r*.45,-r*.5,r*.5,-r*.3,-r*.35,r*1.55);tm.addColorStop(0,'rgba(40,20,110,0)');tm.addColorStop(.6,'rgba(40,20,110,0)');tm.addColorStop(1,'rgba(40,20,110,.42)');cx.fillStyle=tm;circ(0,0,r);cx.fill();cx.strokeStyle='rgba(210,250,255,.75)';cx.lineWidth=3;cx.beginPath();cx.arc(0,0,r-2,.15,1.75);cx.stroke();cx.fillStyle='rgba(255,255,255,.55)';cx.beginPath();cx.ellipse(-r*.38,-r*.48,r*.2,r*.11,-.6,0,6.283);cx.fill()}
 circ(0,0,r);cx.lineWidth=4;cx.strokeStyle='rgba(60,40,120,.35)';cx.stroke();
}
 cx.rotate(T*p.spin*.5);if(ball){for(let i=0;i<4;i++){const a=i*2.5+p.i,rr=r*(.055+(i%2)*.018),px=Math.cos(a)*r*.42,py=Math.sin(a)*r*.42;cx.fillStyle='rgba(255,255,255,.28)';circ(px-rr*.2,py-rr*.2,rr);cx.fill();cx.fillStyle='rgba(24,28,72,.2)';circ(px+rr*.28,py+rr*.28,rr*.55);cx.fill()}}else{cx.fillStyle='rgba(255,255,255,.25)';for(let i=0;i<3;i++){circ(Math.cos(i*2.1)*r*.5,Math.sin(i*2.1)*r*.5,r*.14);cx.fill()}}cx.rotate(-T*p.spin*.5);
 // face
 const bl=p.blink<0?.15:1;cx.fillStyle='#3a2a6a';cx.beginPath();cx.ellipse(-r*.25,-r*.05,r*.08,r*.11*bl,0,0,6.3);cx.ellipse(r*.25,-r*.05,r*.08,r*.11*bl,0,0,6.3);cx.fill();
 cx.fillStyle='#ff8fbf88';circ(-r*.42,r*.15,r*.09);cx.fill();circ(r*.42,r*.15,r*.09);cx.fill();
 cx.strokeStyle='#3a2a6a';cx.lineWidth=3;cx.lineCap='round';cx.beginPath();cx.arc(0,r*.08,r*.12,.3,Math.PI-.3);cx.stroke();
 if(p.o.cp){const on=G.cp>=p.i;cx.strokeStyle='#5a4a8a';cx.lineWidth=4;cx.beginPath();cx.moveTo(0,-r);cx.lineTo(0,-r-42);cx.stroke();cx.fillStyle=on?'#5ef08a':'#ffffff';cx.beginPath();cx.moveTo(0,-r-42);cx.quadraticCurveTo(18,-r-40+Math.sin(T*5)*3,30,-r-34);cx.lineTo(0,-r-24);cx.closePath();cx.fill();cx.lineWidth=2.5;cx.stroke()}
 if(p.moss&&SV.feat.jelly){cx.fillStyle='#6ad06a';for(let k=0;k<7;k++){const a=-Math.PI/2+(k-3)*.32;circ(Math.cos(a)*(r-3),Math.sin(a)*(r-3),r*.16);cx.fill()}cx.fillStyle='#9af08a';for(let k=0;k<4;k++){const a=-Math.PI/2+(k-1.5)*.4;circ(Math.cos(a)*(r-1),Math.sin(a)*(r-1),r*.07);cx.fill()}}
 if(p.ice){cx.strokeStyle='rgba(255,255,255,.92)';cx.lineWidth=2.5;cx.beginPath();cx.arc(0,-r*.12,r*.55,3.5,5.9);cx.stroke();cx.fillStyle='#fff';circ(-r*.1,-r*.62,Math.max(2,r*.05));cx.fill()}
 if(p.whirl){cx.save();cx.rotate(T*1.3);cx.strokeStyle='rgba(255,255,255,.8)';cx.lineWidth=3;cx.setLineDash([7,9]);circ(0,0,r+32);cx.stroke();cx.setLineDash([]);cx.restore()}
 if(p.o.boss){cx.strokeStyle='#3a2a6a';cx.lineWidth=6;cx.beginPath();cx.moveTo(-r*.42,-r*.3);cx.lineTo(-r*.12,-r*.16);cx.moveTo(r*.42,-r*.3);cx.lineTo(r*.12,-r*.16);cx.stroke();cx.font='800 20px ui-rounded,Nunito,sans-serif';cx.textAlign='center';cx.fillStyle='#fff';cx.fillText((p.o.luma?'LUMA ':'GRUMBO ')+'●'.repeat(G.bossHp),0,r*.62)}
 else if(p.o.goal){cx.font='800 22px ui-rounded,Nunito,sans-serif';cx.textAlign='center';cx.fillStyle='#fff';cx.fillText('HOME',0,r*.6)}
 cx.restore()}
function ring(r,T){cx.save();cx.translate(r.x,r.y);cx.rotate(r.a);const s=1+(r.hit||0)*.5;cx.scale(.45*s,1*s);cx.lineWidth=9;['#ffd36b','#ff9ad5','#8fd3ff'].forEach((c,i)=>{cx.strokeStyle=c;circ(0,0,40-i*8);cx.stroke()});cx.restore();
 cx.save();cx.translate(r.x,r.y);cx.rotate(r.a);cx.fillStyle='rgba(255,255,255,'+(.5+.4*Math.sin(T*8))+')';for(let k=-1;k<=1;k++){cx.beginPath();cx.moveTo(k*14-6,-8);cx.lineTo(k*14+6,0);cx.lineTo(k*14-6,8);cx.closePath();cx.fill()}cx.restore()}
function worm(w,T){[[w.ax,w.ay,'#a36bff','#5ef0ff'],[w.bx,w.by,'#5ef0e0','#c9a6ff']].forEach(([x,y,a,b],j)=>{cx.save();cx.translate(x,y);cx.rotate(T*(j?-3:3));const g=cx.createRadialGradient(0,0,4,0,0,38);g.addColorStop(0,'#ffffff');g.addColorStop(.35,a);g.addColorStop(1,a+'00');cx.fillStyle=g;circ(0,0,38);cx.fill();cx.strokeStyle=b;cx.lineWidth=4;cx.lineCap='round';for(let k=0;k<3;k++){cx.beginPath();cx.arc(0,0,14+k*7,k*2.1,k*2.1+2.2);cx.stroke()}cx.restore()})}
function jelly(j,T){const s=1+j.w*.25*Math.sin(T*30);cx.save();cx.translate(j.x,j.y);cx.scale(s,2-s);const g=cx.createRadialGradient(-9,-10,3,0,0,j.r);g.addColorStop(0,'#ffffff');g.addColorStop(.3,'#ffb0e0');g.addColorStop(1,'#e870c0');cx.fillStyle=g;circ(0,0,j.r);cx.fill();cx.lineWidth=3;cx.strokeStyle='#a04a9a';cx.stroke();
 cx.fillStyle='rgba(255,255,255,.7)';cx.beginPath();cx.ellipse(-10,-12,8,4,-.5,0,6.3);cx.fill();cx.fillStyle='#4a2a6a';circ(-8,0,3);cx.fill();circ(8,0,3);cx.fill();cx.strokeStyle='#4a2a6a';cx.lineWidth=2.5;cx.beginPath();cx.arc(0,5,5,.2,Math.PI-.2);cx.stroke();cx.restore()}
function goldStar(g,T){cx.save();cx.globalAlpha=.35+.15*Math.sin(T*4);cx.fillStyle='#fff4b0';circ(g.x,g.y,34+4*Math.sin(T*3));cx.fill();cx.restore();star(g.x,g.y+Math.sin(T*2)*5,22,'#ffd23a','#e0901a',T*1.5);}
function charmDraw(c,T){cx.save();cx.translate(c.x,c.y+Math.sin(T*2)*4);cx.strokeStyle='#ffe45c';cx.lineWidth=4;cx.lineCap='round';cx.beginPath();cx.arc(0,0,10,.7,5.5);cx.stroke();cx.fillStyle='#fff';circ(-3,-3,2);cx.fill();cx.restore()}
function sweetAng(p){const tp=G.P[tgt(G.on)];if(!tp)return null;const d=Math.sign(p.spin)||1;let best=-2,a=0;for(let i=0;i<36;i++){const ang=i/36*6.2832;const px=p.x+Math.cos(ang)*(p.r+15),py=p.y+Math.sin(ang)*(p.r+15);const vx=-Math.sin(ang)*d,vy=Math.cos(ang)*d;const dx=tp.x-px,dy=tp.y-py,L=Math.hypot(dx,dy)||1;const sc=(vx*dx+vy*dy)/L;if(sc>best){best=sc;a=ang}}return a}
function extraFit(R){if(!SV.feat.charms||!SV.feat.outfit)return;const e=SV.extra||0;if(!e)return;cx.lineWidth=2.5;cx.strokeStyle='#4a3a8a';cx.lineJoin='round';
 if(e===1){cx.fillStyle='#9ad8ff';[-1,1].forEach(s=>{cx.beginPath();cx.moveTo(s*6,6);cx.quadraticCurveTo(s*16,16,s*9,24);cx.quadraticCurveTo(s*3,14,s*6,6);cx.fill();cx.stroke()})}
 else if(e===2){cx.fillStyle='#c9a6ff';cx.beginPath();cx.moveTo(-12,2);cx.quadraticCurveTo(-18,20,0,24);cx.quadraticCurveTo(18,20,12,2);cx.closePath();cx.fill();cx.stroke()}
 else if(e===3){cx.fillStyle='#ff9ad5';circ(-12,-8,5);cx.fill();cx.stroke();circ(2,-8,5);cx.fill();cx.stroke();cx.fillStyle='#ffe45c';circ(-5,-8,2.2);cx.fill()}
 else if(e===4){cx.fillStyle='#ffe08a';circ(16,6,6);cx.fill();cx.stroke();cx.fillStyle='#fff6c0';circ(14,4,2.2);cx.fill()}
 else if(e===5){cx.fillStyle='#fff';for(let k=1;k<=3;k++){circ(-8,8+k*5,3.4-k*.45);cx.fill()}}}
function ghost(){const a=G.ghost,i=Math.floor(G.t/.1)*2;if(i+3>=a.length)return;const f=(G.t/.1)%1,x=a[i]+(a[i+2]-a[i])*f,y=a[i+1]+(a[i+3]-a[i+1])*f;cx.save();cx.globalAlpha=.4;cx.translate(x,y);cx.fillStyle='#ffffff';cx.strokeStyle='#7a5ab0';cx.lineWidth=2;circ(0,0,14);cx.fill();cx.stroke();[-1,1].forEach(s=>{cx.beginPath();cx.ellipse(s*8,-14,4,8,s*.4,0,6.3);cx.fill();cx.stroke()});cx.fillStyle='#2e2457';circ(-4,-1,2);cx.fill();circ(4,-1,2);cx.fill();cx.restore()}
function hat(R){const h=SV.feat.outfit?SV.hat:0;if(!h)return;cx.lineWidth=2.5;cx.strokeStyle='#4a3a8a';cx.lineJoin='round';
 if(h===1){cx.fillStyle='#ffd36b';cx.beginPath();cx.moveTo(-9,-R+2);cx.lineTo(0,-R-20);cx.lineTo(9,-R+2);cx.closePath();cx.fill();cx.stroke();cx.fillStyle='#8fd3ff';circ(0,-R-20,4);cx.fill();cx.fillStyle='#ff9ad5';circ(-3,-R-6,2);cx.fill();circ(3,-R-12,2);cx.fill()}
 else if(h===2){for(let k=0;k<6;k++){cx.fillStyle=k%2?'#ffb0d8':'#ffe45c';const a=k*1.047;circ(10+Math.cos(a)*5,-R+2+Math.sin(a)*5,4);cx.fill()}cx.fillStyle='#ff9a3a';circ(10,-R+2,3);cx.fill()}
 else if(h===3){cx.fillStyle='#5a4ab0';cx.beginPath();cx.ellipse(0,-R+1,14,4,0,0,6.3);cx.fill();cx.stroke();cx.fillRect(-8,-R-17,16,18);cx.strokeRect(-8,-R-17,16,18);cx.fillStyle='#ffd36b';cx.fillRect(-8,-R-5,16,4)}
 else if(h===4){cx.fillStyle='#ffd23a';cx.beginPath();cx.moveTo(-11,-R+2);cx.lineTo(-11,-R-10);cx.lineTo(-5,-R-4);cx.lineTo(0,-R-14);cx.lineTo(5,-R-4);cx.lineTo(11,-R-10);cx.lineTo(11,-R+2);cx.closePath();cx.fill();cx.stroke();cx.fillStyle='#8fd3ff';circ(0,-R-3,2.5);cx.fill()}
 else if(h===5){cx.fillStyle='#8f68f0';cx.beginPath();cx.moveTo(-12,-R+3);cx.quadraticCurveTo(2,-R-10,6,-R-28);cx.quadraticCurveTo(6,-R-8,12,-R+3);cx.closePath();cx.fill();cx.stroke();cx.fillStyle='#ffe45c';star(0,-R-8,4,'#ffe45c','#f2a91c',0)}
 else if(h===6){cx.fillStyle='rgba(200,240,255,.35)';circ(0,-2,R+6);cx.fill();cx.strokeStyle='rgba(255,255,255,.9)';cx.lineWidth=2.5;cx.stroke();cx.fillStyle='rgba(255,255,255,.7)';cx.beginPath();cx.ellipse(-8,-12,5,3,-.6,0,6.3);cx.fill()}}
function moon(x,y,a){cx.save();cx.translate(x,y);cx.rotate(a*2);cx.fillStyle='#8a7cc8';for(let i=0;i<8;i++){cx.save();cx.rotate(i*Math.PI/4);cx.beginPath();cx.moveTo(-5,-13);cx.lineTo(0,-22);cx.lineTo(5,-13);cx.fill();cx.restore()}
 const g=cx.createRadialGradient(-4,-5,2,0,0,15);g.addColorStop(0,'#e8e0ff');g.addColorStop(1,'#9a8ad8');cx.fillStyle=g;circ(0,0,15);cx.fill();cx.lineWidth=2.5;cx.strokeStyle='#5a4a9a';cx.stroke();if(SV.feat.sphere){cx.fillStyle='rgba(255,255,255,.78)';circ(-5,-6,3.1);cx.fill()}cx.rotate(-a*2);
 cx.strokeStyle='#3a2a6a';cx.lineWidth=2.5;cx.beginPath();cx.moveTo(-8,-6);cx.lineTo(-2,-3);cx.moveTo(8,-6);cx.lineTo(2,-3);cx.stroke();cx.fillStyle='#3a2a6a';circ(-4,1,2);cx.fill();circ(4,1,2);cx.fill();cx.restore()}
function hero(){let up;if(G.fly){up=Math.atan2(G.vy,G.vx)}else{const p=G.P[G.on];up=Math.atan2(G.py-p.y,G.px-p.x)}
 const expr=!!SV.feat.expressive;cx.save();cx.translate(G.px,G.py);cx.rotate(expr?(G.face==null?up+Math.PI/2:G.face):up+Math.PI/2);
 const sq=G.squash;let sxk=G.fly?1-sq*.15:1+sq*.25,syk=G.fly?1+sq*.25:1-sq*.25;if(expr&&!G.fly)cx.translate(0,Math.sin((G.run||0)*6)*.7);cx.scale(sxk,syk);
 const R=15;cx.fillStyle='rgba(40,40,120,.18)';circ(2,4,R);cx.fill();
 cx.fillStyle='#ffd6ec';cx.strokeStyle='#7a5ab0';cx.lineWidth=2.5;
 if(expr){const e=G.ear||0;[-1,1].forEach(s=>{cx.save();cx.translate(s*9,-R+1);cx.rotate(s*e);cx.beginPath();cx.ellipse(0,0,5,9,s*.4,0,6.283);cx.fill();cx.stroke();cx.restore()})}
 else [-1,1].forEach(s=>{cx.beginPath();cx.ellipse(s*9,-R+1,5,9,s*.4,0,6.283);cx.fill();cx.stroke()});
 const g=cx.createRadialGradient(-5,-6,2,0,0,R);g.addColorStop(0,'#ffffff');g.addColorStop(1,'#ffe0f2');cx.fillStyle=g;circ(0,0,R);cx.fill();cx.stroke();
 cx.fillStyle='#fff';circ(-6,-R+2,5);cx.fill();circ(0,-R,6);cx.fill();circ(6,-R+2,5);cx.fill();hat(R);extraFit(R);
 const look=G.fly?0:Math.sign(G.P[G.on].spin)*2;
 let eye=1;if(expr&&!G.fly&&!G.holding){const ph=G.t%3.8;if(ph>3.64)eye=.12;else if(ph>3.5)eye=.42}if(expr&&G.holding&&!G.fly)eye=.7;
 cx.fillStyle='#2e2457';cx.beginPath();cx.ellipse(-5+look,-1,2.6,3.6*eye,0,0,6.283);cx.ellipse(5+look,-1,2.6,3.6*eye,0,0,6.283);cx.fill();
 if(eye>.4){cx.fillStyle='#fff';circ(-4.2+look,-2.4,1);cx.fill();circ(5.8+look,-2.4,1);cx.fill()}
 cx.fillStyle='#ff9ac8';circ(-9,4,2.6);cx.fill();circ(9,4,2.6);cx.fill();
 if(expr&&!G.fly){const st=Math.sin((G.run||0)*6);cx.fillStyle='#fff';cx.strokeStyle='#7a5ab0';cx.lineWidth=2;[-1,1].forEach((s,i)=>{const o=(i?st:-st)*2.2;cx.beginPath();cx.arc(s*6.5,11+o,3.1,0,6.283);cx.fill();cx.stroke()})}
 cx.strokeStyle='#2e2457';cx.lineWidth=2;cx.lineCap='round';cx.beginPath();
 if(G.fly){if(expr){cx.ellipse(look,6,2.4,2.8,0,0,6.283);cx.stroke()}else{circ(look,6,2.6);cx.stroke()}}
 else if(expr&&G.holding){cx.moveTo(-3.2+look,6);cx.quadraticCurveTo(look,7.4,3.2+look,6);cx.stroke()}
 else if(expr&&(G.chain||0)>=3){cx.arc(look,3,4.2,.12,Math.PI-.12);cx.stroke()}
 else{cx.arc(look,4,3,.2,Math.PI-.2);cx.stroke()}
 cx.restore()}
function pill(x,y,w,h){cx.beginPath();cx.roundRect?cx.roundRect(x,y,w,h,h/2):cx.rect(x,y,w,h)}
function hud(){if(G.mode!=='play'&&G.mode!=='win')return;const sl=SAFE.l;
 const x0=Math.max(14,sl+14),y0=12+SAFE.t;cx.fillStyle='rgba(40,60,160,.35)';pill(x0,y0,150,36);cx.fill();star(x0+20,y0+18,11,'#ffe45c','#f2a91c',0);
 cx.fillStyle='#fff';cx.font='800 20px ui-rounded,Nunito,sans-serif';cx.textAlign='left';cx.textBaseline='middle';cx.fillText(G.stars+' / '+G.ST.length,x0+38,y0+19);
 if(SV.feat.timer){cx.fillStyle='rgba(40,60,160,.35)';pill(x0+160,y0,92,36);cx.fill();cx.fillStyle='#fff';cx.fillText(fmt(G.t),x0+174,y0+19)}
 cx.textAlign='center';cx.font='800 17px ui-rounded,Nunito,sans-serif';cx.fillStyle='rgba(40,60,160,.35)';const nm=((G.lv<=20||(G.lv>=25&&G.lv<=30))?G.lv+'. ':'')+lvName(G.lv),tw=cx.measureText(nm).width+28;pill(W/2-tw/2,y0,tw,32);cx.fill();cx.fillStyle='#fff';cx.fillText(nm,W/2,y0+17);cx.textAlign='left';
 if(SV.feat.combo){cx.textAlign='right';const sr=W-Math.max(14,SAFE.l+14)-62;const t2=G.score+(G.chain>=2?'  x'+Math.min(G.chain,8):'');cx.font='800 18px ui-rounded,Nunito,sans-serif';const w2=cx.measureText(t2).width+26;cx.fillStyle=G.chain>=2?'rgba(255,140,200,.55)':'rgba(40,60,160,.35)';pill(sr-w2,y0,w2,32);cx.fill();cx.fillStyle='#fff';cx.fillText(t2,sr-13,y0+17);cx.textAlign='left'}
 if(G.gold&&SV.feat.gold){star(x0+270,y0+18,11,G.gold.got||SV.gold[G.lv]?'#ffd23a':'rgba(255,255,255,.35)',G.gold.got||SV.gold[G.lv]?'#e0901a':'rgba(255,255,255,.5)',0)}
 // progress bar
 const bw=Math.min(300,W*.35),bx=W/2-bw/2,by=H-22;cx.fillStyle='rgba(40,60,160,.3)';pill(bx,by,bw,10);cx.fill();const f=G.mode==='win'?1:G.reached/Math.max(1,G.main);cx.fillStyle='#ffe45c';pill(bx,by,Math.max(10,bw*f),10);cx.fill();
 const coachOn=SV.feat.coach&&G.lv<=2&&G.mode==='play'&&G.coach<4;
 if(coachOn){const lines=['Loo runs by himself. Tap and hold, then let go to leap.','Get close. Gravity does the catching.','Star berries count toward your crowns.','Flags are checkpoints. A miss brings you back.'];const msg=lines[G.coach];cx.textAlign='center';cx.font='800 22px ui-rounded,Nunito,sans-serif';cx.lineWidth=5;cx.lineJoin='round';cx.strokeStyle='rgba(50,40,140,.6)';cx.strokeText(msg,W/2,H-50);cx.fillStyle='#fff';cx.fillText(msg,W/2,H-50)}
 else if(G.hintT>1.6&&G.on<2&&!G.fly&&G.mode==='play'){cx.textAlign='center';cx.font='800 22px ui-rounded,Nunito,sans-serif';cx.lineWidth=5;cx.lineJoin='round';cx.strokeStyle='rgba(50,40,140,.6)';cx.strokeText('Tap to leap when the dots point at the next planet!',W/2,H-50);cx.fillStyle='rgba(255,255,255,'+(0.75+0.25*Math.sin(G.t*5))+')';cx.fillText('Tap to leap when the dots point at the next planet!',W/2,H-50)}}
function fmt(t){const m=Math.floor(t/60),s=t%60;return m+':'+(s<10?'0':'')+s.toFixed(1)}
// ---------- loop ----------
let last=performance.now(),acc=0;const DT=1/120;
function frame(now){let d=Math.min(.1,(now-last)/1000);last=now;if(state()==='play'){acc+=d;while(acc>=DT){update(DT);acc-=DT}}else{acc=0;if(G&&G.mode==='win')update(d)}
 pollPad();music();draw();requestAnimationFrame(frame)}
// ---------- UI ----------
const OVS=['title','how','stats','settings','pause','over','map','ward'];let back=null;
function show(id){if(id==='title')titleUI();OVS.forEach(o=>$(o).classList.toggle('on',o===id));$('touch').classList.toggle('on',!id&&!!G);$('ver').style.display=id==='title'?'block':'none';focusIdx=0;setTimeout(()=>focusFirst(),0)}
function cur(){return OVS.find(o=>$(o).classList.contains('on'))||null}
function state(){const c=cur();if(c)return c;return G?G.mode:'none'}
function start(n){n=n||(G&&G.lv)||1;if(n>=25&&n<=30&&!SV.feat.sea)n=1;audio();newGame(n);SV.st.plays++;save();show(null)}
function pause(){if(!G||cur()||G.mode!=='play')return;show('pause')}
function showOver(){const st=SV.st;let extra='';if(SV.feat.combo){const bs=SV.bestScore[G.lv]||0;if(G.score>bs)SV.bestScore[G.lv]=G.score;extra+=row('Score',G.score+(G.score>bs?' (best!)':''))+row('Best combo','x'+Math.min(G.bestChain,8))}
 if(SV.feat.ghost){const gk=ghostKey(G.lv);let old=null;try{old=JSON.parse(localStorage.getItem(gk)||'null')}catch(e){}if(!old||G.rec.length<old.length){try{localStorage.setItem(gk,JSON.stringify(G.rec));extra+=row('Ghost','New best run saved')}catch(e){}}}
 if(G.gold&&SV.feat.gold)extra+=row('Golden star',SV.gold[G.lv]?'Found ★':'Not yet');
 if(SV.feat.medals)extra+=row('Medal',medalName(G.lv,G.t));
 if(G.charm&&SV.feat.charms)extra+=row('Moon charm',SV.charms[G.lv]?'Found ☾':'Not yet');
 if(G.lv===99){const t=today(),D=SV.daily;if(D.last!==t){const y=new Date();y.setDate(y.getDate()-1);const yv=y.getFullYear()*10000+(y.getMonth()+1)*100+y.getDate();D.streak=D.last===yv?D.streak+1:1;D.last=t;D.done++;D.best=Math.max(D.best,D.streak)}extra+=row('Daily streak',D.streak+' day'+(D.streak>1?'s':''))}
st.clears++;st.time+=G.t;if(G.lv===1&&(!st.best||G.t<st.best))st.best=G.t;if(G.stars>st.bestStars)st.bestStars=G.stars;
 let cr=1;if(G.stars>=G.ST.length*.5)cr++;if(G.stars>=G.ST.length*.5&&G.misses<=3)cr++;if(cr>st.crowns)st.crowns=cr;const rec=SV.lv[G.lv]||{c:0,b:0,s:0};rec.c=Math.max(rec.c,cr);rec.b=rec.b?Math.min(rec.b,G.t):G.t;rec.s=Math.max(rec.s,G.stars);const first=!SV.lv[G.lv];if(G.lv!==99)SV.lv[G.lv]=rec;save();
 const nx=nextMain(G.lv);$('oTitle').textContent=G.lv===30?'Luma shines!':G.lv===20?'You beat Grumbo!':G.lv===99?'Daily Orbit clear!':G.lv>20&&G.lv<25?'Bonus clear!':'Level '+G.lv+' clear!';$('bNext').style.display=nx?'block':'none';$('bOTitle').textContent=G.lv===99?'Title':'World map';if(first&&nx)setTimeout(()=>toast('Level '+nx+' unlocked!'),300);
 $('oCrowns').textContent='👑'.repeat(cr)+'◌'.repeat(3-cr);
 $('oT').innerHTML=row('Time',fmt(G.t))+row('Star berries',G.stars+' / '+G.ST.length)+row('Leaps',G.leaps)+row('Misses',G.misses)+row('Best time',fmt(rec.b))+extra+'<tr><td colspan=2 style="font-size:13px;opacity:.8;text-align:center">Crowns: finish, grab half the berries, and miss 3 times or fewer.</td></tr>';show('over')}
function row(a,b){return '<tr><td>'+a+'</td><td>'+b+'</td></tr>'}
function statsT(){const s=SV.st;const crowns=totalCrowns(),gMax=SV.feat.sea?30:24;const outfitN=HATS.filter(h=>crowns>=h[1]).length+TRAILS.filter(h=>crowns>=h[1]).length+(SV.feat.charms?EXTRAS.filter(h=>h[1]>0&&charmCount()>=h[1]).length:0);const outfitD=HATS.length+TRAILS.length+(SV.feat.charms?EXTRAS.length-1:0);
 $('statT').innerHTML=row('Runs started',s.plays)+row('Level wins',s.clears)+row('Levels cleared',mainCleared()+' / '+(SV.feat.sea?26:20))+row('Crowns',crowns+' / '+(SV.feat.sea?90:72))+row('Golden stars',Object.keys(SV.gold).filter(k=>+k<=gMax).length+' / '+gMax)+row('Bonus levels cleared',[21,22,23,24].filter(k=>SV.lv[k]).length+' / 4')+row('Daily streak',SV.daily.streak+' (best '+SV.daily.best+')')+row('Dailies done',SV.daily.done)+(SV.feat.charms?row('Moon charms',charmCount()+' / '+gMax):'')+row('Outfits unlocked',outfitN+' / '+outfitD)+row('Furthest unlocked',unlocked())+row('Fastest Pebble Belt',s.best?fmt(s.best):'-')+row('Most berries in a run',s.bestStars)+row('Best crowns',s.crowns+' / 3')+row('Total leaps',s.leaps)+row('Total berries',s.stars)+row('Total misses',s.misses)+row('Time flying',fmt(s.time))}
$('bPlay').onclick=()=>{audio();sfx('ui');openMap()};$('bNext').onclick=()=>{const n=nextMain(G&&G.lv);if(n)start(n)};$('bHow').onclick=()=>{audio();back='title';show('how')};$('bStats').onclick=()=>{statsT();back='title';show('stats')};
$('bSet').onclick=()=>{audio();back='title';show('settings')};$('bPSet').onclick=()=>{back='pause';show('settings')};
document.querySelectorAll('.back').forEach(b=>b.onclick=()=>{sfx('ui');show(back||'title')});
$('bRes').onclick=()=>{show(null);last=performance.now()};$('bRestart').onclick=()=>start();$('bQuit').onclick=()=>{const d=G&&G.lv===99;G=null;if(d)show('title');else openMap()};
$('bAgain').onclick=()=>start();$('bOTitle').onclick=()=>{const d=G&&G.lv===99;G=null;if(d)show('title');else openMap()};
function totalCrowns(){let t=0;const m=SV.feat.sea?30:24;for(const k in SV.lv)if(+k<=m)t+=SV.lv[k].c;return t}
function unlocked(){let u=1;while(u<20&&SV.lv[u])u++;if(SV.feat.sea&&SV.lv[20]){u=25;while(u<30&&SV.lv[u])u++}return u}
function mainCleared(){let c=0;for(let k=1;k<=20;k++)if(SV.lv[k])c++;if(SV.feat.sea)for(let k=25;k<=30;k++)if(SV.lv[k])c++;return c}
function nextMain(n){if(n>=1&&n<20)return n+1;if(n===20&&SV.feat.sea)return 25;if(n>=25&&n<30&&SV.feat.sea)return n+1;return 0}
function charmCount(){let c=0;for(const k in SV.charms)if(SV.charms[k])c++;return c}
const PAR={1:36,2:35,3:46,4:44,5:47,6:43,7:49,8:49,9:56,10:55,11:51,12:54,13:62,14:74,15:63,16:63,17:71,18:75,19:66,20:220,21:38,22:53,23:56,24:81,25:22,26:28,27:32,28:36,29:40,30:12,99:56};
function medalName(n,t){const p=PAR[n];if(!p)return 'Clear';if(t<=p)return 'Gold';if(t<=p*1.35)return 'Silver';if(t<=p*1.8)return 'Bronze';return 'Clear'}
function medalMark(n,t){const m=medalName(n,t);return m==='Gold'?'★★★':m==='Silver'?'★★':m==='Bronze'?'★':''}
function openMap(){const u=unlocked();let h='';if(SV.feat.parade){h+='<div class="parade">';const worlds=SV.feat.sea?5:4;for(let w=0;w<worlds;w++)h+='<button type="button" class="pb" data-w="'+w+'">'+(w+1)+' '+WORLDS[w]+'</button>';h+='</div>'}
 const medal=(n,rc)=>SV.feat.medals&&rc&&rc.b?'<em>'+fmt(rc.b)+' '+medalMark(n,rc.b)+'</em>':'';
 for(let w=0;w<4;w++){h+='<div class="wr"'+(SV.feat.parade?' id="w'+w+'"':'')+'><div class="wn">World '+(w+1)+': '+WORLDS[w]+'</div>';for(let k=1;k<=5;k++){const n=w*5+k,rc=SV.lv[n],lock=n>u;h+='<button class="lvb'+(lock?' lk':'')+'" data-n="'+n+'"'+(lock?' disabled':'')+'><b>'+n+'</b><span>'+(lock?'🔒':(rc?'👑'.repeat(rc.c)+'◌'.repeat(3-rc.c):'New!'))+(SV.feat.gold&&SV.gold[n]?' ★':'')+'</span><i>'+NAMES[n-1]+'</i>'+medal(n,rc)+'</button>'}h+='</div>'}
 if(SV.feat.sea){h+='<div class="wr"'+(SV.feat.parade?' id="w4"':'')+'><div class="wn">World 5: '+WORLDS[4]+'</div>';for(let n=25;n<=30;n++){const rc=SV.lv[n],lock=n>u;h+='<button class="lvb'+(lock?' lk':'')+'" data-n="'+n+'"'+(lock?' disabled':'')+'><b>'+n+'</b><span>'+(lock?'🔒':(rc?'👑'.repeat(rc.c)+'◌'.repeat(3-rc.c):'New!'))+(SV.feat.gold&&SV.gold[n]?' ★':'')+'</span><i>'+SEAN[n-25]+'</i>'+medal(n,rc)+'</button>'}h+='</div>'}
 if(SV.feat.gold){h+='<div class="wr"><div class="wn">Bonus levels (find 3 golden stars in a world)</div>';for(let w=0;w<4;w++){const n=21+w,rc=SV.lv[n],lock=!bonusOpen(w);h+='<button class="lvb'+(lock?' lk':'')+'" data-n="'+n+'"'+(lock?' disabled':'')+'><b>★'+(w+1)+'</b><span>'+(lock?'★ '+goldN(w)+'/3':(rc?'👑'.repeat(rc.c)+'◌'.repeat(3-rc.c):'New!'))+'</span><i>'+BNAMES[w]+'</i>'+medal(n,rc)+'</button>'}h+='</div>'}
 const gMax=SV.feat.sea?30:24;$('mapG').innerHTML=h;$('mapC').textContent=totalCrowns()+' crowns'+(SV.feat.gold?' · '+Object.keys(SV.gold).filter(k=>+k<=gMax).length+' golden stars':'')+(SV.feat.charms?' · '+charmCount()+' charms':'');$('mapG').querySelectorAll('.lvb').forEach(b=>b.onclick=()=>{sfx('ui');start(+b.dataset.n)});$('mapG').querySelectorAll('.pb').forEach(b=>b.onclick=()=>{const el=document.getElementById('w'+b.dataset.w);if(el)el.scrollIntoView({block:'nearest'})});back='title';show('map');setTimeout(()=>{const b=$('mapG').querySelector('[data-n="'+u+'"]');if(b){b.focus();b.scrollIntoView({block:'nearest'})}},30)}
const HATS=[['No hat',0],['Party hat',1],['Flower',5],['Top hat',10],['Crown',20],['Wizard hat',30],['Space bubble',45]];
const TRAILS=[['Cream',0],['Sunny gold',3],['Mint',8],['Lilac',15],['Sky blue',25],['Rainbow',40]];
const EXTRAS=[['No extra',0],['Scarf',2],['Cape',6],['Bow',12],['Lantern',20],['Comet cloak',28]];
function openWard(){const c=totalCrowns();const mk2=(list,cur,kind)=>list.map((h,i)=>{const lock=c<h[1];return '<button class="lvb'+(lock?' lk':'')+(i===cur?' sel':'')+'" data-k="'+kind+'" data-i="'+i+'"'+(lock?' disabled':'')+'><b>'+(i===cur?'✓ ':'')+h[0]+'</b><span>'+(lock?'🔒 '+h[1]+' 👑':'')+'</span></button>'}).join('');
 let html='<div class="wn">Hats</div>'+mk2(HATS,SV.hat,'h')+'<div class="wn">Trails</div>'+mk2(TRAILS,SV.trailC,'t');
 if(SV.feat.charms){const cc=charmCount();html+='<div class="wn">From moon charms</div>'+EXTRAS.map((h,i)=>{const lock=cc<h[1];return '<button class="lvb'+(lock?' lk':'')+(i===(SV.extra||0)?' sel':'')+'" data-k="e" data-i="'+i+'"'+(lock?' disabled':'')+'><b>'+(i===(SV.extra||0)?'✓ ':'')+h[0]+'</b><span>'+(lock?'🔒 '+h[1]+' ☾':'')+'</span></button>'}).join('')}
 $('wardG').innerHTML=html;$('wardC').textContent='You have '+c+' crowns'+(SV.feat.charms?' and '+charmCount()+' charms':'')+(SV.feat.outfit?'':' (Outfits switch is off)');
 $('wardG').querySelectorAll('.lvb').forEach(b=>b.onclick=()=>{if(b.dataset.k==='h')SV.hat=+b.dataset.i;else if(b.dataset.k==='t')SV.trailC=+b.dataset.i;else SV.extra=+b.dataset.i;save();sfx('ui');const k=b.dataset.k,i=b.dataset.i;openWard();setTimeout(()=>{const nb=$('wardG').querySelector('[data-k="'+k+'"][data-i="'+i+'"]');if(nb)nb.focus()},20)});back='title';if(cur()!=='ward')show('ward')}
function titleUI(){$('bDaily').style.display=SV.feat.daily?'':'none';$('bWard').style.display=SV.feat.outfit?'':'none';const D=SV.daily;$('dInfo').textContent=SV.feat.daily?(D.last===today()?'Daily Orbit done today! Streak: '+D.streak:'Daily Orbit streak: '+(D.streak||0)):'';}
$('bDaily').onclick=()=>{sfx('ui');start(99)};$('bWard').onclick=()=>{audio();sfx('ui');openWard()};
$('tPause').addEventListener('pointerdown',e=>{e.stopPropagation();pause()});
function bindR(id,k){const el=$(id);el.value=SV[k];el.oninput=()=>{SV[k]=+el.value;save();vol();bri()}}
bindR('sMus','mus');bindR('sSfx','sfx');bindR('sBri','bri');
function bri(){cv.style.filter=SV.bri===100?'':'brightness('+SV.bri/100+')'}bri();
$('feats').innerHTML=FEATS.map(f=>'<div class="set">'+f[1]+'<button class="tog" data-f="'+f[0]+'"></button></div>').join('');
function togs(){document.querySelectorAll('#feats .tog').forEach(b=>{const on=SV.feat[b.dataset.f];b.classList.toggle('on',on);b.textContent=on?'On':'Off'})}togs();
document.querySelectorAll('#feats .tog').forEach(b=>b.onclick=()=>{SV.feat[b.dataset.f]=!SV.feat[b.dataset.f];if(G)G.P.forEach(p=>{delete p.spr});BG.key='';save();togs();sfx('ui');titleUI()});
$('olds').innerHTML=OLDS.map(o=>'<div class="set">'+o[0]+' <span style="opacity:.8;font-weight:600">'+o[1]+'</span><button class="tog on" onclick="location.href=\''+o[2]+'\'">Open</button></div>').join('');
$('ver').textContent='Orbiloo '+VERSION;
const standalone=navigator.standalone||matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches;
if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!standalone)$('a2hs').style.display='block';
// ---------- input ----------
cv.addEventListener('pointerdown',e=>{e.preventDefault();audio();if(!cur()&&G)press()});addEventListener('pointerup',()=>release());addEventListener('pointercancel',()=>release());
addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter'||e.code==='ArrowUp'||e.code==='KeyW')release()});
addEventListener('keydown',e=>{audio();const c=cur();
 if(!c&&G){const ND={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.code];if(ND&&G.fly&&SV.feat.nudge){e.preventDefault();if(!e.repeat)nudge(ND[0],ND[1]);return}
  if(e.code==='Space'||e.code==='Enter'||e.code==='ArrowUp'||e.code==='KeyW'){e.preventDefault();if(!e.repeat)press()}else if(e.code==='Escape'||e.code==='KeyP')pause();return}
 if(c){if(e.code==='ArrowDown'){e.preventDefault();moveF(1)}else if(e.code==='ArrowUp'){e.preventDefault();moveF(-1)}else if(e.code==='ArrowLeft'||e.code==='ArrowRight'){if(adj(e.code==='ArrowRight'?1:-1))e.preventDefault()}
  else if(e.code==='Escape'){escape()}else if((e.code==='Enter'||e.code==='Space')&&document.activeElement&&document.activeElement.tagName==='INPUT'){e.preventDefault()}}});
function escape(){const c=cur();if(c==='pause'){show(null);last=performance.now()}else if(c==='how'||c==='stats'||c==='settings')show(back||'title');else if(c==='map'||c==='ward')show('title')}
let focusIdx=0;function focusables(){const c=cur();if(!c)return[];return [...$(c).querySelectorAll('button,input')].filter(e=>e.offsetParent!==null&&!e.disabled)}
function focusFirst(){const f=focusables();if(f[0])f[0].focus({preventScroll:true})}
function moveF(d){const f=focusables();if(!f.length)return;let i=f.indexOf(document.activeElement);i=(i+d+f.length)%f.length;f[i].focus();f[i].scrollIntoView({block:'nearest'});sfx('ui')}
function adj(d){const a=document.activeElement;if(a&&a.type==='range'){a.value=+a.value+d*5;a.oninput();return true}return false}
let pPrev=[];function pollPad(){const ps=navigator.getGamepads?navigator.getGamepads():[];let p=null;for(const q of ps)if(q&&q.connected){p=q;break}if(!p)return;
 const b=p.buttons.map(x=>x.pressed),ax=p.axes||[];b[20]=ax[1]<-.6;b[21]=ax[1]>.6;b[22]=ax[0]<-.6;b[23]=ax[0]>.6;const pr=i=>b[i]&&!pPrev[i];
 const c=cur();if(!c&&G){if(G.fly&&SV.feat.nudge){const sx=ax[0]||0,sy=ax[1]||0;let dx=(b[15]?1:0)-(b[14]?1:0),dy=(b[13]?1:0)-(b[12]?1:0);if(Math.hypot(sx,sy)>.6){dx=sx;dy=sy}if((dx||dy)&&!G.padN){nudge(dx,dy);G.padN=1}if(!dx&&!dy)G.padN=0}
  if(pr(0)||pr(1)||pr(2)||pr(3)){audio();press()}if([0,1,2,3].some(i=>pPrev[i]&&!b[i]))release();if(pr(9)||pr(8))pause()}
 else if(c){if(pr(13)||pr(21))moveF(1);if(pr(12)||pr(20))moveF(-1);if(pr(14)||pr(22))adj(-1);if(pr(15)||pr(23))adj(1);if(pr(0)){audio();const a=document.activeElement;if(a&&a.tagName==='BUTTON')a.click()}if(pr(1))escape();if(pr(9)&&c==='pause')escape()}
 pPrev=b}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
function probe(ang,pw,maxSteps){if(!G)return{kind:'none'};PROBE++;const spr=G.P.map(p=>p.spr);G.P.forEach(p=>{delete p.spr});let gSnap;try{gSnap=structuredClone(G)}catch(e){G.P.forEach((p,i)=>{if(spr[i])p.spr=spr[i]});PROBE--;return{kind:'err',e:String(e)}}G.P.forEach((p,i)=>{if(spr[i])p.spr=spr[i]});const svSnap=structuredClone(SV);try{const startOn=G.on,hp0=G.bossHp;G.fly=null;G.dead=0;G.holding=false;G.charge=0;G.ang=ang;const p=G.P[G.on];G.px=p.x+Math.cos(ang)*(p.r+ORB);G.py=p.y+Math.sin(ang)*(p.r+ORB);leap(pw==null?0:pw);let steps=0;const lim=maxSteps||260;while(steps<lim&&G.fly&&!G.dead&&G.mode==='play'){update(DT);steps++}let kind='miss';if(G.mode==='win'||G.mode==='done')kind='win';else if(G.bossHp<hp0)kind='hit';else if(G.dead)kind='dead';else if(!G.fly&&G.on!==startOn)kind='land';else if(!G.fly)kind='back';return{kind,on:G.on,steps,mode:G.mode}}finally{G=gSnap;for(const k in SV)delete SV[k];Object.assign(SV,svSnap);PROBE--}}
window.OB={press,release,nudge,openWard,today,genLevel,tgt:i=>tgt(i),openMap,start,leap,probe,poll:()=>pollPad(),step:n=>{for(let i=0;i<n;i++)update(DT)},get G(){return G},get SV(){return SV},get feat(){return SV.feat},spinMul,medalName,charmCount,nextMain,unlocked,state,show,VERSION};
titleUI();requestAnimationFrame(frame)})();
