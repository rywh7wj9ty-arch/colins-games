'use strict';
const VERSION='v1.1';
const $=id=>document.getElementById(id);
const cv=$('cv'),ctx=cv.getContext('2d');
$('ver').textContent='Novastack '+VERSION;
// ---------- settings / stats ----------
const LS='novastack.';
const FEATS=[['gl','3D graphics (WebGL)'],['bloom','Bloom glow'],['reflect','Glass reflections'],['tilt','Holo chamber tilt'],['camera','Camera motion'],['hyperspace','Hyperspace streaks'],['nebula','Nebula sky'],['city','Neon megacity'],['reactive','Backdrop reacts to music'],['trails','Hard-drop trails'],['levelfx','Level-up warp'],['laser','Laser line clears'],['shatter','Shatter particles'],['shake','Screen shake'],['callouts','Big callouts'],['ghost','Ghost piece'],['hold','Hold'],['adaptive','Adaptive music'],['gesturehelp','Gesture tips on start'],['lite','Low graphics (faster)']];
const DEF={mus:60,sfx:75,bri:100,f:{gl:1,bloom:1,reflect:1,tilt:1,camera:1,hyperspace:1,nebula:1,city:1,reactive:1,trails:1,levelfx:1,laser:1,shatter:1,shake:1,callouts:1,ghost:1,hold:1,adaptive:1,gesturehelp:1,lite:0,glow:1,grid:1}};
let S;try{S=Object.assign({},DEF,JSON.parse(localStorage.getItem(LS+'set')||'{}'));S.f=Object.assign({},DEF.f,S.f||{});}catch(e){S=JSON.parse(JSON.stringify(DEF));}
const ST0={games:0,lines:0,pieces:0,novabursts:0,tspins:0,maxCombo:0,maxB2B:0,time:0,best:{marathon:0,ultra:0,zen:0},sprint:0,bestLevel:0};
let STATS;try{STATS=Object.assign({},ST0,JSON.parse(localStorage.getItem(LS+'stats')||'{}'));STATS.best=Object.assign({},ST0.best,STATS.best||{});}catch(e){STATS=JSON.parse(JSON.stringify(ST0));}
const save=()=>{try{localStorage.setItem(LS+'set',JSON.stringify(S));localStorage.setItem(LS+'stats',JSON.stringify(STATS));}catch(e){}};
const OLDS=[['v1.1','../novastack-v1.1/'],['v1.0','../novastack-v1.0/']];
function applyBright(){const b=S.bri/100;const el=$('bright');el.style.background=b<1?`rgba(0,0,0,${1-b})`:`rgba(255,255,255,${(b-1)*0.45})`;el.style.mixBlendMode=b<1?'normal':'soft-light';}
applyBright();
// ---------- audio ----------
let AC=null,mGain,sGain,musicOn=false,nextNote=0,step=0;
function initAudio(){if(AC){if(AC.state==='suspended')AC.resume();return;}
 try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
 mGain=AC.createGain();sGain=AC.createGain();mGain.connect(AC.destination);sGain.connect(AC.destination);setVols();}
function setVols(){if(!AC)return;mGain.gain.value=(S.mus/100)*0.35;sGain.gain.value=(S.sfx/100)*0.5;}
function tone(t,f,d,type,v,dest,slide){const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+d);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(dest);o.start(t);o.stop(t+d+0.05);}
function noise(t,d,v,dest,hp){const n=AC.sampleRate*d|0,b=AC.createBuffer(1,n,AC.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;const s=AC.createBufferSource();s.buffer=b;const f=AC.createBiquadFilter();f.type='highpass';f.frequency.value=hp||6000;const g=AC.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.0001,t+d);s.connect(f);f.connect(g);g.connect(dest);s.start(t);}
const mid=n=>440*Math.pow(2,(n-69)/12);
// synthwave progression: Am F C G (no minor dread, bright-ish)
const PROG=[[57,60,64],[53,57,60],[60,64,67],[55,59,62]];
const ARP=[0,1,2,1,0,2,1,2];
function music(){if(!AC||!musicOn)return;const lvl=G?Math.min(G.level,20):1;const danger=G?G.danger:0;
 const bpm=S.f.adaptive?(100+lvl*2.5+danger*14):108;const sp=60/bpm/2;
 while(nextNote<AC.currentTime+0.15){const t=nextNote,bar=(step>>4)%4,ch=PROG[bar],s=step%16;
  if(s%2===0)tone(t,mid(ch[0]-24),sp*1.6,'sawtooth',0.12,mGain);
  const inten=S.f.adaptive?Math.min(1,0.3+lvl/12+danger*.4):0.6;
  if(inten>0.35)tone(t,mid(ch[ARP[s%8]]+12),sp*0.9,'square',0.035*inten,mGain);
  if(s===0)ch.forEach(n=>tone(t,mid(n),sp*15,'triangle',0.03,mGain));
  if(s%4===0){tone(t,110,0.18,'sine',0.35,mGain,40);const bt=performance.now()/1000+(t-AC.currentTime);setTimeout(()=>{window.NS_BEAT=bt;},Math.max(0,(t-AC.currentTime)*1000));}
  if(s%8===4)noise(t,0.15,0.18,mGain,1800);
  if(inten>0.55&&s%2===1)noise(t,0.04,0.06,mGain,8000);
  nextNote+=sp;step++;}}
function startMusic(){initAudio();if(!AC)return;musicOn=true;nextNote=AC.currentTime+0.05;}
const SFX={
 move(){tone(AC.currentTime,880,0.04,'square',0.05,sGain);},
 rot(){tone(AC.currentTime,1200,0.05,'triangle',0.08,sGain,1600);},
 lock(){tone(AC.currentTime,180,0.09,'sine',0.25,sGain,90);},
 hard(){const t=AC.currentTime;tone(t,320,0.14,'sawtooth',0.12,sGain,60);noise(t,0.08,0.1,sGain,3000);},
 hold(){tone(AC.currentTime,660,0.1,'triangle',0.1,sGain,990);},
 clear(n){const t=AC.currentTime;for(let i=0;i<n+1;i++)tone(t+i*0.05,mid(72+[0,4,7,12,16][i]),0.25,'square',0.07,sGain);noise(t,0.3,0.12,sGain,4000);},
 nova(){const t=AC.currentTime;tone(t,200,0.7,'sawtooth',0.15,sGain,1600);[72,76,79,84,88].forEach((n,i)=>tone(t+i*0.06,mid(n),0.4,'square',0.07,sGain));},
 tspin(){const t=AC.currentTime;[79,83,86,91].forEach((n,i)=>tone(t+i*0.04,mid(n),0.3,'triangle',0.1,sGain));},
 level(){const t=AC.currentTime;[67,72,76,79,84].forEach((n,i)=>tone(t+i*0.08,mid(n),0.3,'square',0.07,sGain));},
 over(){const t=AC.currentTime;tone(t,400,1.2,'sawtooth',0.12,sGain,60);},
 ui(){tone(AC.currentTime,1000,0.05,'sine',0.08,sGain);}
};
const sfx=(k,a)=>{if(AC&&S.sfx>0)try{SFX[k](a);}catch(e){}};
// ---------- pieces / SRS ----------
const SHAPES={I:[[0,1],[1,1],[2,1],[3,1]],O:[[1,0],[2,0],[1,1],[2,1]],T:[[1,0],[0,1],[1,1],[2,1]],S:[[1,0],[2,0],[0,1],[1,1]],Z:[[0,0],[1,0],[1,1],[2,1]],J:[[0,0],[0,1],[1,1],[2,1]],L:[[2,0],[0,1],[1,1],[2,1]]};
const COL={I:['#3ff6ff','#0a8fb5'],O:['#ffe74a','#c49a00'],T:['#c77dff','#6a2fc0'],S:['#5dff9a','#14a85a'],Z:['#ff6ae0','#b0249a'],J:['#5b8cff','#2741c9'],L:['#ffb04a','#c06a10'],X:['#9ab0d8','#4a5a88']};
function cells(t,r){const sz=t==='I'||t==='O'?4:3;return SHAPES[t].map(([x,y])=>{for(let i=0;i<r;i++){const nx=sz-1-y;y=x;x=nx;}return[x,y];});}
const KJLSTZ={'01':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],'10':[[0,0],[1,0],[1,-1],[0,2],[1,2]],'12':[[0,0],[1,0],[1,-1],[0,2],[1,2]],'21':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],'23':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],'32':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],'30':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],'03':[[0,0],[1,0],[1,1],[0,-2],[1,-2]]};
const KI={'01':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],'10':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],'12':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]],'21':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],'23':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],'32':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],'30':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],'03':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]]};
const K180=[[0,0],[0,-1],[1,0],[-1,0],[0,1]];
const W=10,H=40,VIS=20;
// ---------- game ----------
let G=null,state='title',lastT=0;
function newGame(mode){
 G={mode,board:Array.from({length:H},()=>Array(W).fill(null)),bag:[],queue:[],hold:null,canHold:true,cur:null,score:0,lines:0,level:1,
  combo:-1,b2b:-1,time:0,pieces:0,drop:0,lockT:0,resets:0,lowY:0,lastRot:false,lastKick:0,clearing:null,clearT:0,are:0,danger:0,
  novabursts:0,tspins:0,maxCombo:0,maxB2B:0,over:false,callout:null,ultraLeft:120};
 for(let i=0;i<6;i++)G.queue.push(nextBag());
 spawn();state='play';showOv(null);startMusic();showTut();hud(true);
 parts.length=0;lasers.length=0;
}
function nextBag(){if(!G.bag.length){G.bag='IOTSZJL'.split('');for(let i=6;i>0;i--){const j=Math.random()*(i+1)|0;[G.bag[i],G.bag[j]]=[G.bag[j],G.bag[i]];}}return G.bag.pop();}
function fits(t,r,x,y){for(const[cx,cy]of cells(t,r)){const X=x+cx,Y=y+cy;if(X<0||X>=W||Y>=H)return false;if(Y>=0&&G.board[Y][X])return false;}return true;}
function spawn(t){t=t||G.queue.shift();if(G.queue.length<6)G.queue.push(nextBag());
 const p={t,r:0,x:3,y:H-VIS-2};if(!fits(t,0,p.x,p.y)){p.y--;if(!fits(t,0,p.x,p.y)){topOut();return false;}}
 G.cur=p;G.lockT=0;G.resets=0;G.lowY=p.y;G.lastRot=false;G.drop=0;
 if(fits(t,0,p.x,p.y+1)){p.y++;} // spawn and drop one row immediately (guideline)
 return true;}
function topOut(){
 if(G.mode==='zen'){ // never end: clear bottom half
  for(let y=0;y<H;y++)G.board[y].fill(null);toast('Zen reset: board cleared');G.combo=-1;spawn();return;}
 endGame(false);}
function gravity(){if(G.mode==='zen')return 1;const L=Math.min(G.level,20);return Math.pow(0.8-(L-1)*0.007,L-1);} // seconds per row
function tryMove(dx,dy){const p=G.cur;if(fits(p.t,p.r,p.x+dx,p.y+dy)){p.x+=dx;p.y+=dy;if(dx)G.lastRot=false;if(dx)lockReset();if(dy>0&&p.y>G.lowY){G.lowY=p.y;G.resets=0;}return true;}return false;}
function lockReset(){if(onGround()&&G.resets<15){G.lockT=0;G.resets++;}}
function onGround(){const p=G.cur;return !fits(p.t,p.r,p.x,p.y+1);}
function rotate(dir){const p=G.cur;if(p.t==='O'){sfx('rot');return;}const nr=(p.r+dir+4)%4;
 const kicks=dir===2?K180:(p.t==='I'?KI:KJLSTZ)[''+p.r+nr];
 for(let i=0;i<kicks.length;i++){const[kx,ky]=kicks[i];if(fits(p.t,nr,p.x+kx,p.y-ky)){p.x+=kx;p.y-=ky;p.r=nr;G.lastRot=true;G.lastKick=i;lockReset();sfx('rot');return true;}}
 return false;}
function tCorners(){const p=G.cur;const c=[[0,0],[2,0],[2,2],[0,2]].map(([x,y])=>{const X=p.x+x,Y=p.y+y;return X<0||X>=W||Y>=H||(Y>=0&&!!G.board[Y][X]);});
 const front=[[0,1],[1,2],[2,3],[3,0]][p.r];const f=c[front[0]]+c[front[1]];const tot=c.filter(Boolean).length;return{tot,f};}
function hardDrop(){const p0=G.cur,y0=p0.y;let n=0;while(tryMove(0,1))n++;if(use3D&&n>0){const cols={};for(const[a,b]of cells(p0.t,p0.r)){const X=p0.x+a;const yy=b+(H-VIS);if(!cols[X])cols[X]={x:X,y0:y0+b-(H-VIS),y1:G.cur.y+b-(H-VIS)};else{cols[X].y0=Math.min(cols[X].y0,y0+b-(H-VIS));cols[X].y1=Math.max(cols[X].y1,G.cur.y+b-(H-VIS));}}R3D.FX.hard(Object.values(cols),p0.t);}G.score+=n*2;if(n>0)G.lastRot=false;sfx('hard');if(S.f.shake)shake(4);lockPiece(true);}
function holdPiece(){if(!S.f.hold||!G.canHold||G.clearing)return;const t=G.cur.t;if(G.hold){const h=G.hold;G.hold=t;spawn(h);}else{G.hold=t;spawn();}G.canHold=false;sfx('hold');}
function lockPiece(){const p=G.cur;let spin=null;
 if(p.t==='T'&&G.lastRot){const{tot,f}=tCorners();if(tot>=3)spin=(f===2||G.lastKick===4)?'full':'mini';}
 let above=true;for(const[cx,cy]of cells(p.t,p.r)){const Y=p.y+cy;if(Y>=0)G.board[Y][p.x+cx]=p.t;if(Y>=H-VIS)above=false;}
 G.pieces++;sfx('lock');if(use3D)R3D.FX.lock();
 const full=[];for(let y=0;y<H;y++)if(G.board[y].every(Boolean))full.push(y);
 const n=full.length;let pts=0,label='';const L=G.level;
 if(spin){G.tspins+=n||spin==='full'?1:0;pts=spin==='full'?[400,800,1200,1600][n]:[100,200,400][n]||400;label=(spin==='mini'?'T-SPIN MINI':'T-SPIN')+(n?' '+['','SINGLE','DOUBLE','TRIPLE'][n]:'');sfx('tspin');}
 else if(n)pts=[0,100,300,500,800][n];
 if(n===4)label='NOVABURST';
 const diff=n===4||(spin&&n>0);
 if(n){if(diff){G.b2b++;if(G.b2b>0){pts*=1.5;label='B2B '+label;}}else G.b2b=-1;
  G.combo++;if(G.combo>0){pts+=50*G.combo*L;}G.maxCombo=Math.max(G.maxCombo,G.combo);G.maxB2B=Math.max(G.maxB2B,G.b2b);}
 else G.combo=-1;
 G.score+=Math.round(pts*L);
 if(n){let pc=true;for(let y=0;y<H&&pc;y++)if(!full.includes(y)&&G.board[y].some(Boolean))pc=false;if(pc){G.score+=[0,800,1200,1800,2000][n]*L;label='PERFECT CLEAR';}}
 if(label||G.combo>0)callout(label||'',G.combo>0?G.combo+' COMBO':'');
 if(n===4){G.novabursts++;sfx('nova');}
 if(n){G.clearing=full;G.clearT=0;sfx('clear',n);fxClear(full,n);if(S.f.shake)shake(n===4?10:3+n*2);}
 G.cur=null;G.canHold=true;
 if(above&&!n){topOut();return;}
 if(!n)afterLock();}
function afterLock(){G.are=0.03;}
function finishClear(){const full=G.clearing;for(const y of full.slice().sort((a,b)=>a-b)){G.board.splice(y,1);G.board.unshift(Array(W).fill(null));}
 const n=full.length;G.lines+=n;G.clearing=null;
 if(G.mode==='marathon'||G.mode==='zen'){const nl=Math.floor(G.lines/10)+1;if(G.mode==='marathon'&&nl>G.level){G.level=nl;sfx('level');callout('LEVEL '+nl,'');if(use3D)R3D.FX.level();}}
 if(G.mode==='sprint'&&G.lines>=40){endGame(true);return;}
 afterLock();}
function endGame(win){if(G.over)return;G.over=true;state='over';musicOn=false;if(!win)sfx('over');else sfx('level');
 STATS.games++;STATS.lines+=G.lines;STATS.pieces+=G.pieces;STATS.novabursts+=G.novabursts;STATS.tspins+=G.tspins;STATS.maxCombo=Math.max(STATS.maxCombo,G.maxCombo);STATS.maxB2B=Math.max(STATS.maxB2B,G.maxB2B);STATS.time+=G.time;STATS.bestLevel=Math.max(STATS.bestLevel,G.mode==='marathon'?G.level:0);
 let rec=false;
 if(G.mode==='sprint'){if(win&&(!STATS.sprint||G.time<STATS.sprint)){STATS.sprint=G.time;rec=true;}}
 else if(G.score>(STATS.best[G.mode]||0)){STATS.best[G.mode]=G.score;rec=true;}
 save();
 const tt={marathon:'Game over',sprint:win?'Sprint complete':'Sprint failed',ultra:"Time's up",zen:'Zen session'}[G.mode];
 $('oTitle').textContent=tt+(rec?' · New record!':'');
 const rows=[['Score',G.score.toLocaleString()],['Lines',G.lines],['Time',fmt(G.time)],['Level',G.level],['Pieces/sec',(G.pieces/Math.max(1,G.time)).toFixed(2)],['Novabursts',G.novabursts],['T-spins',G.tspins],['Best combo',Math.max(0,G.maxCombo)]];
 $('oT').innerHTML=rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
 setTimeout(()=>showOv('over'),win?300:700);}
const fmt=s=>{const m=Math.floor(s/60),x=(s%60);return m+':'+(x<10?'0':'')+x.toFixed(2);};
// ---------- effects ----------
const parts=[],lasers=[];let shakeA=0,calloutT=0;
function shake(a){shakeA=Math.max(shakeA,a);}
function callout(a,b){if(!S.f.callouts)return;const el=$('callout');el.innerHTML=(a?'<div class=ca>'+a+'</div>':'')+(b?'<div class=cb>'+b+'</div>':'');el.classList.remove('go');void el.offsetWidth;el.classList.add('go');}
function fxClear(rows,n){if(use3D){R3D.FX.clear(rows.map(y=>y-(H-VIS)),n,rows.map(y=>G.board[y].slice()));return;}for(const y of rows){if(S.f.laser)lasers.push({y,t:0,n});
 if(S.f.shatter){const cnt=S.f.lite?2:5;for(let x=0;x<W;x++){const t=G.board[y][x];for(let k=0;k<cnt;k++)if(parts.length<(S.f.lite?150:500))parts.push({x:x+Math.random(),y:y-(H-VIS)+Math.random(),vx:(Math.random()-.5)*14+(x-4.5)*0.8,vy:-Math.random()*10-2,r:Math.random()*Math.PI,vr:(Math.random()-.5)*10,s:0.18+Math.random()*0.3,c:COL[t||'X'][0],life:1+Math.random()*0.6});}}}}
let toastT=null;function toast(m){const el=$('toast');el.textContent=m;el.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>el.style.opacity=0,1800);}
// ---------- rendering ----------
let DPR=1,VW=0,VH=0,cs=24,bx=0,by=0,sprites={},glowSpr={},bgLayers=null,safe={l:0,r:0,t:0,b:0};
function readSafe(){const d=document.createElement('div');d.style.cssText='position:fixed;left:env(safe-area-inset-left);right:env(safe-area-inset-right);top:env(safe-area-inset-top);bottom:env(safe-area-inset-bottom)';document.body.appendChild(d);const r=d.getBoundingClientRect();safe={l:r.left,t:r.top,r:innerWidth-r.right,b:innerHeight-r.bottom};d.remove();}
let use3D=false,cellPx=20,gl3=null;
function resize(){readSafe();VW=innerWidth;VH=innerHeight;
 if(use3D){cv.width=1;cv.height=1;const Lr=R3D.resize(VW,VH,window.devicePixelRatio||1,!!S.f.lite,safe);applyLayout(Lr);return;}
 DPR=Math.min(window.devicePixelRatio||1,S.f.lite?1.25:2);cv.width=VW*DPR|0;cv.height=VH*DPR|0;
 const availH=VH-safe.t-safe.b-16;cs=Math.floor(Math.min(availH/VIS,(VW-safe.l-safe.r)/24));cs=Math.max(cs,10);
 bx=Math.round(VW/2-cs*W/2);by=Math.round(safe.t+8+(availH-cs*VIS)/2);
 buildSprites();bgLayers=null;
 const pw=cs*4.4;applyLayout({cellPx:cs,board:{l:bx,t:by,r:bx+cs*W,b:by+cs*VIS},hud:{l:bx-pw-cs*0.6,t:by+cs*4.3,r:bx-cs*0.6,b:by+cs*VIS},holdTop:by});}
function applyLayout(Lr){cellPx=Lr.cellPx;const h=$('hud'),b=Lr.board;const left=Math.max(safe.l+10,Math.min(Lr.hud.l,b.l-200));const w=b.l-left-Math.max(10,cellPx*0.8);
 h.style.left=left+'px';h.style.width=Math.max(90,w)+'px';h.style.top=Math.max(Lr.hud.t,safe.t+4)+'px';h.style.height=Math.max(80,b.b-Lr.hud.t)+'px';
 const fs=Math.max(12,Math.min(20,cellPx*0.85,w/7.5));h.style.fontSize=fs+'px';
 const r=$('rhud');r.style.left=(b.r+Math.max(10,cellPx*0.8))+'px';r.style.top=(b.t+cellPx*16.2)+'px';r.style.fontSize=fs+'px';
 const c=$('callout');c.style.left=(b.l+b.r)/2+'px';c.style.top=(b.t+(b.b-b.t)*0.32)+'px';c.style.fontSize=Math.max(18,cellPx*1.05)+'px';
 const hl=$('holdLbl');hl.style.left=left+'px';hl.style.top=(Lr.holdTop+2)+'px';hl.style.fontSize=fs*0.8+'px';
 const nl=$('nextLbl');nl.style.left=(b.r+Math.max(10,cellPx*0.8))+'px';nl.style.top=(Lr.holdTop+2)+'px';nl.style.fontSize=fs*0.8+'px';}
let hudKey='';
function hud(force){if(!G)return;const md={marathon:'MARATHON',sprint:'SPRINT 40',ultra:'ULTRA',zen:'ZEN'}[G.mode];
 const tm=G.mode==='ultra'?fmt(Math.max(0,G.ultraLeft)):fmt(G.time);const ln=G.mode==='sprint'?Math.max(0,40-G.lines)+' <small>left</small>':G.lines;
 const best=G.mode==='sprint'?(STATS.sprint?fmt(STATS.sprint):'–'):(STATS.best[G.mode]?STATS.best[G.mode].toLocaleString():'–');
 const k=[md,G.score,ln,tm,G.level,best,G.b2b,G.combo,G.lines%10].join('|');if(k===hudKey&&!force)return;hudKey=k;
 $('hud').innerHTML=`<div class="hm">${md}</div><div class="hl">SCORE</div><div class="hv big">${G.score.toLocaleString()}</div>
 <div class="hg"><div><div class="hl">LINES</div><div class="hv">${ln}</div></div><div><div class="hl">LEVEL</div><div class="hv">${G.level}</div></div></div>
 <div class="hg"><div><div class="hl">${G.mode==='ultra'?'LEFT':'TIME'}</div><div class="hv">${tm}</div></div><div><div class="hl">BEST</div><div class="hv">${best}</div></div></div>
 ${G.mode==='marathon'?`<div class="bar"><i style="width:${(G.lines%10)*10}%"></i></div>`:''}`;
 $('rhud').innerHTML=(G.b2b>0?`<div class="tag y">B2B ×${G.b2b}</div>`:'')+(G.combo>0?`<div class="tag p">COMBO ${G.combo}</div>`:'');}

function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function blockSprite(col,size,ghost){const s=Math.ceil(size*DPR),c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');const[a,b]=col;const r=s*0.16,m=s*0.04;
 if(ghost){g.strokeStyle=a;g.globalAlpha=.75;g.lineWidth=Math.max(1,s*0.07);rr(g,m*2,m*2,s-m*4,s-m*4,r);g.stroke();g.globalAlpha=.15;g.fillStyle=a;g.fill();return c;}
 // base body: dark glass with coloured gradient = 3D cube face
 let gr=g.createLinearGradient(0,0,s,s);gr.addColorStop(0,a);gr.addColorStop(1,b);g.fillStyle=gr;rr(g,m,m,s-2*m,s-2*m,r);g.fill();
 // bevel: top-left light, bottom-right shade
 g.save();g.clip();g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.moveTo(0,0);g.lineTo(s,0);g.lineTo(s*0.8,s*0.2);g.lineTo(s*0.2,s*0.2);g.lineTo(s*0.2,s*0.8);g.lineTo(0,s);g.fill();
 g.fillStyle='rgba(10,0,60,.32)';g.beginPath();g.moveTo(s,s);g.lineTo(s,0);g.lineTo(s*0.8,s*0.2);g.lineTo(s*0.8,s*0.8);g.lineTo(s*0.2,s*0.8);g.lineTo(0,s);g.fill();
 // inner holo face
 gr=g.createLinearGradient(0,s*0.2,0,s*0.8);gr.addColorStop(0,'rgba(255,255,255,.55)');gr.addColorStop(0.5,'rgba(255,255,255,.08)');gr.addColorStop(1,'rgba(255,255,255,.22)');g.fillStyle=gr;rr(g,s*0.22,s*0.22,s*0.56,s*0.56,s*0.08);g.fill();
 // scanlines
 g.globalAlpha=.12;g.fillStyle='#fff';for(let y=s*0.25;y<s*0.78;y+=Math.max(2,s/10))g.fillRect(s*0.24,y,s*0.52,Math.max(1,s/40));g.restore();
 // crisp neon rim
 g.globalAlpha=1;g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=Math.max(1,s*0.045);rr(g,m+1,m+1,s-2*m-2,s-2*m-2,r);g.stroke();
 return c;}
function glowSprite(col,size){const pad=size*0.7,s=Math.ceil((size+pad*2)*DPR),c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');
 const gr=g.createRadialGradient(s/2,s/2,size*DPR*0.3,s/2,s/2,s/2);gr.addColorStop(0,col[0]+'aa');gr.addColorStop(1,col[0]+'00');g.fillStyle=gr;g.fillRect(0,0,s,s);return c;}
function buildSprites(){sprites={};glowSpr={};for(const k in COL){sprites[k]=blockSprite(COL[k],cs);sprites[k+'g']=blockSprite(COL[k],cs,true);sprites[k+'s']=blockSprite(COL[k],Math.round(cs*0.62));glowSpr[k]=glowSprite(COL[k],cs);}}
function buildBg(){const w=cv.width,h=cv.height,L=[];
 const mk=()=>{const c=document.createElement('canvas');c.width=w*1.2|0;c.height=h;return c;};
 // sky
 const sky=document.createElement('canvas');sky.width=w;sky.height=h;let g=sky.getContext('2d');let gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#0a1650');gr.addColorStop(0.45,'#2a2a9a');gr.addColorStop(0.7,'#6a49c8');gr.addColorStop(1,'#1fb7d6');g.fillStyle=gr;g.fillRect(0,0,w,h);
 for(let i=0;i<(S.f.lite?120:260);i++){g.fillStyle=`rgba(255,255,255,${Math.random()*0.8})`;const r=Math.random()*1.6*DPR;g.fillRect(Math.random()*w,Math.random()*h*0.6,r,r);}
 // gas giant + ringed station
 gr=g.createRadialGradient(w*0.78,h*0.22,0,w*0.78,h*0.22,h*0.22);gr.addColorStop(0,'#9ff7ff');gr.addColorStop(0.5,'#5a8cff');gr.addColorStop(1,'rgba(90,100,255,0)');g.fillStyle=gr;g.beginPath();g.arc(w*0.78,h*0.22,h*0.22,0,7);g.fill();
 g.strokeStyle='rgba(200,240,255,.6)';g.lineWidth=2*DPR;g.beginPath();g.ellipse(w*0.78,h*0.22,h*0.3,h*0.05,-0.3,0,7);g.stroke();
 g.save();g.translate(w*0.18,h*0.2);g.strokeStyle='rgba(180,230,255,.75)';g.lineWidth=3*DPR;g.beginPath();g.ellipse(0,0,h*0.09,h*0.03,0.2,0,7);g.stroke();g.fillStyle='#bfe8ff';g.fillRect(-2*DPR,-h*0.05,4*DPR,h*0.1);g.restore();
 L.push({c:sky,sp:0});
 // city layers
 const cols=[['#3a3aa8','#8ac8ff',0.15],['#26207a','#b08bff',0.35],['#120f4a','#5ff0ff',0.7]];
 cols.forEach(([body,win,sp],li)=>{const c=mk(),g=c.getContext('2d');const base=h*(0.62+li*0.07);let x=0;
  while(x<c.width){const bw=(20+Math.random()*50)*DPR*(1+li*0.5),bh=(h*0.12+Math.random()*h*0.25)*(1-li*0.15);g.fillStyle=body;g.fillRect(x,base-bh,bw,h);
   if(Math.random()<0.3){g.fillRect(x+bw/2-DPR,base-bh-20*DPR,2*DPR,20*DPR);g.fillStyle=win;g.fillRect(x+bw/2-2*DPR,base-bh-22*DPR,4*DPR,4*DPR);}
   g.fillStyle=win;g.globalAlpha=0.55;for(let wy=base-bh+6*DPR;wy<base;wy+=7*DPR)for(let wx=x+4*DPR;wx<x+bw-4*DPR;wx+=6*DPR)if(Math.random()<0.35)g.fillRect(wx,wy,2.5*DPR,3*DPR);
   g.globalAlpha=0.9;g.fillRect(x,base-bh,bw,1.5*DPR);g.globalAlpha=1;x+=bw+Math.random()*8*DPR;}
  // light fog band
  gr=g.createLinearGradient(0,base-h*0.1,0,base+h*0.05);gr.addColorStop(0,'rgba(160,220,255,0)');gr.addColorStop(1,'rgba(160,220,255,.12)');g.fillStyle=gr;g.fillRect(0,base-h*0.1,c.width,h*0.2);
  L.push({c,sp});});
 bgLayers=L;}
function drawBg(t){const w=cv.width,h=cv.height;
 if(!S.f.city){const gr=ctx.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#0b1650');gr.addColorStop(1,'#3a3aa8');ctx.fillStyle=gr;ctx.fillRect(0,0,w,h);}
 else{if(!bgLayers)buildBg();ctx.drawImage(bgLayers[0].c,0,0);
  for(let i=1;i<bgLayers.length;i++){const l=bgLayers[i];const ox=-((t*8*l.sp*DPR)%(l.c.width-w));ctx.drawImage(l.c,ox,0);if(ox+l.c.width<w)ctx.drawImage(l.c,ox+l.c.width,0);}
  // flying cars
  if(!S.f.lite)for(let i=0;i<6;i++){const y=h*(0.35+i*0.05),x=((t*(60+i*25)+i*400)*DPR)%(w+200)-100;ctx.fillStyle=i%2?'#7ff6ff':'#ffd0ff';ctx.fillRect(i%2?x:w-x,y,10*DPR,2*DPR);}}
 if(S.f.grid){const hz=h*0.84;ctx.save();ctx.beginPath();ctx.rect(0,hz,w,h-hz);ctx.clip();const gr=ctx.createLinearGradient(0,hz,0,h);gr.addColorStop(0,'rgba(20,10,80,.9)');gr.addColorStop(1,'rgba(40,20,140,.9)');ctx.fillStyle=gr;ctx.fillRect(0,hz,w,h-hz);
  ctx.strokeStyle='rgba(95,240,255,.55)';ctx.lineWidth=1.2*DPR;const off=(t*0.6)%1;
  for(let i=0;i<12;i++){const z=(i+off)/12;const y=hz+(h-hz)*z*z;ctx.globalAlpha=z;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  ctx.globalAlpha=0.6;for(let i=-20;i<=20;i++){ctx.beginPath();ctx.moveTo(w/2+i*w*0.01,hz);ctx.lineTo(w/2+i*w*0.12,h);ctx.stroke();}ctx.restore();}}
function drawBlock(k,x,y,alpha,size){const s=size||cs;if(alpha!==undefined)ctx.globalAlpha=alpha;ctx.drawImage(sprites[k],x*DPR,y*DPR,s*DPR,s*DPR);ctx.globalAlpha=1;}
function drawGlow(k,x,y){const g=glowSpr[k];const pad=cs*0.7;ctx.drawImage(g,(x-pad)*DPR,(y-pad)*DPR,(cs+pad*2)*DPR,(cs+pad*2)*DPR);}
function ghostY(){const p=G.cur;let y=p.y;while(fits(p.t,p.r,p.x,y+1))y++;return y;}
function panel(x,y,w,h,label){ctx.save();ctx.fillStyle='rgba(15,25,90,.55)';ctx.strokeStyle='rgba(110,240,255,.8)';ctx.lineWidth=1.5*DPR;ctx.beginPath();const c=8*DPR;x*=DPR;y*=DPR;w*=DPR;h*=DPR;ctx.moveTo(x+c,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h-c);ctx.lineTo(x+w-c,y+h);ctx.lineTo(x,y+h);ctx.lineTo(x,y+c);ctx.closePath();ctx.fill();ctx.stroke();
 if(label){ctx.fillStyle='#7ff6ff';ctx.font=`800 ${Math.max(9,cs*0.42)*DPR}px "Avenir Next",system-ui`;ctx.textAlign='left';ctx.fillText(label,x+c,y+cs*0.6*DPR);}ctx.restore();}
function drawMini(t,cx,cy,dim){const s=Math.round(cs*0.62),cl=cells(t,0);let mnx=9,mxx=0,mny=9,mxy=0;cl.forEach(([x,y])=>{mnx=Math.min(mnx,x);mxx=Math.max(mxx,x);mny=Math.min(mny,y);mxy=Math.max(mxy,y);});
 const ox=cx-(mxx-mnx+1)*s/2,oy=cy-(mxy-mny+1)*s/2;cl.forEach(([x,y])=>{ctx.globalAlpha=dim?0.35:1;ctx.drawImage(sprites[t+'s'],(ox+(x-mnx)*s)*DPR,(oy+(y-mny)*s)*DPR,s*DPR,s*DPR);});ctx.globalAlpha=1;}
function text(s,x,y,size,col,align,weight){ctx.font=`${weight||800} ${size*DPR}px "Avenir Next",system-ui`;ctx.textAlign=align||'left';ctx.fillStyle=col||'#eaffff';ctx.fillText(s,x*DPR,y*DPR);}
function render(t,dt){if(use3D){R3D.frame(t,dt,G,state);return;}ctx.setTransform(1,0,0,1,0,0);drawBg(t);
 if(!G||state==='title'){return;}
 let sx=0,sy=0;if(shakeA>0.1){sx=(Math.random()-.5)*shakeA;sy=(Math.random()-.5)*shakeA;}ctx.setTransform(1,0,0,1,sx*DPR,sy*DPR);
 // well
 const wx=bx,wy=by,ww=cs*W,wh=cs*VIS;
 ctx.fillStyle='rgba(8,14,60,.72)';ctx.fillRect(wx*DPR,wy*DPR,ww*DPR,wh*DPR);
 ctx.strokeStyle='rgba(120,200,255,.12)';ctx.lineWidth=1;for(let x=1;x<W;x++){ctx.beginPath();ctx.moveTo((wx+x*cs)*DPR,wy*DPR);ctx.lineTo((wx+x*cs)*DPR,(wy+wh)*DPR);ctx.stroke();}
 for(let y=1;y<VIS;y++){ctx.beginPath();ctx.moveTo(wx*DPR,(wy+y*cs)*DPR);ctx.lineTo((wx+ww)*DPR,(wy+y*cs)*DPR);ctx.stroke();}
 // danger tint (cyan->violet, never red)
 const dz=G.danger;const bc=dz>0.5?`rgba(${200},${140},255,${0.8+0.2*Math.sin(t*8)})`:'rgba(95,240,255,.9)';
 ctx.strokeStyle=bc;ctx.lineWidth=2.5*DPR;ctx.shadowColor=bc;ctx.shadowBlur=S.f.glow&&!S.f.lite?14*DPR:0;ctx.strokeRect((wx-2)*DPR,(wy-2)*DPR,(ww+4)*DPR,(wh+4)*DPR);ctx.shadowBlur=0;
 // glow pass (additive), then crisp blocks
 const off=H-VIS;
 if(S.f.glow){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=S.f.lite?0.25:0.4;for(let y=off;y<H;y++)for(let x=0;x<W;x++){const k=G.board[y][x];if(k)drawGlow(k,wx+x*cs,wy+(y-off)*cs);}
  if(G.cur){for(const[cx,cy]of cells(G.cur.t,G.cur.r)){const Y=G.cur.y+cy-off;if(Y>=0)drawGlow(G.cur.t,wx+(G.cur.x+cx)*cs,wy+Y*cs);}}ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';}
 for(let y=off;y<H;y++)for(let x=0;x<W;x++){const k=G.board[y][x];if(k){let a=1;if(G.clearing&&G.clearing.includes(y))a=1-G.clearT/0.35;drawBlock(k,wx+x*cs,wy+(y-off)*cs,Math.max(0,a));
   if(G.clearing&&G.clearing.includes(y)){ctx.fillStyle=`rgba(255,255,255,${0.8*(1-G.clearT/0.35)})`;ctx.fillRect((wx+x*cs)*DPR,(wy+(y-off)*cs)*DPR,cs*DPR,cs*DPR);}}}
 if(G.cur){const p=G.cur;if(S.f.ghost){const gy=ghostY();for(const[cx,cy]of cells(p.t,p.r)){const Y=gy+cy-off;if(Y>=0)drawBlock(p.t+'g',wx+(p.x+cx)*cs,wy+Y*cs);}}
  const lockFade=onGround()?0.75+0.25*Math.cos(G.lockT*20):1;
  for(const[cx,cy]of cells(p.t,p.r)){const Y=p.y+cy-off;if(Y>=-1)drawBlock(p.t,wx+(p.x+cx)*cs,wy+Y*cs,Y<0?0.5:lockFade);}}
 // lasers
 for(const L of lasers){const y=(wy+(L.y-off+0.5)*cs)*DPR,k=L.t/0.45;const xw=(wx-cs)*DPR+(ww+cs*2)*DPR*Math.min(1,k*2.2);
  ctx.globalCompositeOperation='lighter';const hgt=cs*DPR*(0.9-k*0.8);const gr=ctx.createLinearGradient(0,y-hgt,0,y+hgt);gr.addColorStop(0,'rgba(80,240,255,0)');gr.addColorStop(0.5,L.n===4?'rgba(255,240,140,.95)':'rgba(140,250,255,.95)');gr.addColorStop(1,'rgba(180,120,255,0)');
  ctx.fillStyle=gr;ctx.fillRect((wx-cs)*DPR,y-hgt,xw-(wx-cs)*DPR,hgt*2);ctx.fillStyle='#fff';ctx.fillRect((wx-cs)*DPR,y-1.5*DPR,xw-(wx-cs)*DPR,3*DPR);ctx.globalCompositeOperation='source-over';}
 // particles
 for(const q of parts){ctx.save();ctx.globalAlpha=Math.min(1,q.life);ctx.translate((wx+q.x*cs)*DPR,(wy+q.y*cs)*DPR);ctx.rotate(q.r);ctx.fillStyle=q.c;const s=q.s*cs*DPR;ctx.beginPath();ctx.moveTo(-s,-s*0.6);ctx.lineTo(s,-s*0.2);ctx.lineTo(-s*0.2,s);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=DPR;ctx.stroke();ctx.restore();}
 // side panels
 const pw=cs*4.4,lx=wx-pw-cs*0.6,rx=wx+ww+cs*0.6;
 panel(lx,wy,pw,cs*3.6,'');if(G.hold&&S.f.hold)drawMini(G.hold,lx+pw/2,wy+cs*2.1,!G.canHold);
 panel(rx,wy,pw,cs*15.6,'');for(let i=0;i<5;i++)drawMini(G.queue[i],rx+pw/2,wy+cs*(2.6+i*2.7));
 if(G.mode==='ultra'&&G.ultraLeft<10&&G.ultraLeft>0)text(Math.ceil(G.ultraLeft),wx+ww/2,wy+wh*0.6,cs*2,'rgba(255,255,255,.35)','center',900);
 ctx.setTransform(1,0,0,1,0,0);}
// ---------- input ----------
const held={};let das={dir:0,t:0,arr:0},softOn=false;
const DAS=0.15,ARR=0.035;
function act(a){if(state!=='play'||!G.cur||G.clearing)return;initAudio();
 switch(a){case'left':if(tryMove(-1,0))sfx('move');das={dir:-1,t:0,arr:0};break;case'right':if(tryMove(1,0))sfx('move');das={dir:1,t:0,arr:0};break;
  case'cw':rotate(1);break;case'ccw':rotate(-1);break;case'180':rotate(2);break;case'hard':hardDrop();break;case'hold':holdPiece();break;}}
function release(a){if((a==='left'&&das.dir===-1)||(a==='right'&&das.dir===1)){das.dir=held.left?-1:held.right?1:0;das.t=0;}}
const KEYMAP={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'soft',ArrowUp:'cw',KeyX:'cw',KeyZ:'ccw',KeyA:'180',Space:'hard',KeyC:'hold',ShiftLeft:'hold',ShiftRight:'hold'};
addEventListener('keydown',e=>{initAudio();if(e.repeat&&state==='play'){e.preventDefault();return;}
 if(state!=='play'){menuKey(e);return;}
 if(e.code==='Escape'||e.code==='KeyP'){pauseGame();return;}
 const a=KEYMAP[e.code];if(!a)return;e.preventDefault();held[a]=true;if(a==='soft')softOn=true;else act(a);});
addEventListener('keyup',e=>{const a=KEYMAP[e.code];if(!a)return;held[a]=false;if(a==='soft')softOn=false;release(a);});
// menus: focus nav
function curOv(){return document.querySelector('.ov.on');}
function focusables(){const o=curOv();return o?[...o.querySelectorAll('.btn,.set,.tog')].filter(el=>!(el.classList.contains('tog')&&el.closest('.set'))&&el.offsetParent!==null):[];}
let fi=0;
function setFocus(i){const f=focusables();if(!f.length)return;fi=(i+f.length)%f.length;f.forEach(el=>el.classList.remove('f'));f[fi].classList.add('f');f[fi].scrollIntoView({block:'nearest'});}
function menuNav(dir){const f=focusables();if(!f.length)return;if(!f.some(el=>el.classList.contains('f'))){setFocus(0);return;}setFocus(fi+dir);sfx('ui');}
function menuAct(){const f=focusables(),el=f[fi];if(!el||!el.classList.contains('f')){setFocus(0);return;}const tg=el.querySelector('.tog');if(tg){tg.click();return;}if(el.tagName==='BUTTON'){el.click();return;}}
function menuAdj(d){const el=focusables()[fi];if(!el)return;const r=el.querySelector('input[type=range]');if(r){r.value=+r.value+d*5;r.dispatchEvent(new Event('input'));}else if(el.closest('.modes')||el.closest('.row'))menuNav(d);}
function menuBack(){const o=curOv();if(!o)return;const b=o.querySelector('.back');if(b)b.click();else if(o.id==='pause')resume();}
function menuKey(e){const k=e.code;if(k==='ArrowDown'){menuNav(1);e.preventDefault();}else if(k==='ArrowUp'){menuNav(-1);e.preventDefault();}else if(k==='ArrowLeft')menuAdj(-1);else if(k==='ArrowRight')menuAdj(1);
 else if(k==='Enter'||k==='Space'){if(document.activeElement&&document.activeElement.tagName==='BUTTON'&&!document.querySelector('.f'))return;e.preventDefault();menuAct();}else if(k==='Escape'||k==='Backspace')menuBack();}
// gamepad
let padPrev={},padRep={};
function pollPad(dt){const pads=navigator.getGamepads?navigator.getGamepads():[];let p=null;for(const q of pads)if(q&&q.connected){p=q;break;}if(!p)return;
 const b=i=>p.buttons[i]&&p.buttons[i].pressed;const ax=p.axes[0]||0,ay=p.axes[1]||0;
 const cur={left:b(14)||ax<-0.5,right:b(15)||ax>0.5,down:b(13)||ay>0.5,up:b(12)||ay<-0.5,a:b(0),b:b(1),x:b(2),y:b(3),lb:b(4)||b(6),rb:b(5)||b(7),start:b(9)||b(8)};
 const pr=k=>cur[k]&&!padPrev[k],rl=k=>!cur[k]&&padPrev[k];
 if(Object.values(cur).some(Boolean)){initAudio();if(!$('touch').classList.contains('on')){} }
 if(state==='play'){if(pr('start')){pauseGame();}else{
  if(pr('left')){held.left=true;act('left');}if(rl('left')){held.left=false;release('left');}
  if(pr('right')){held.right=true;act('right');}if(rl('right')){held.right=false;release('right');}
  softOn=cur.down||held.soft||touchSoft;if(pr('up'))act('hard');if(pr('a'))act('cw');if(pr('b'))act('ccw');if(pr('x'))act('180');if(pr('y'))act('hard');if(pr('lb')||pr('rb'))act('hold');}}
 else{for(const[k,d]of[['up',-1],['down',1]]){if(pr(k)){menuNav(d);padRep[k]=0.35;}else if(cur[k]){padRep[k]-=dt;if(padRep[k]<=0){menuNav(d);padRep[k]=0.12;}}}
  if(pr('left'))menuAdj(-1);if(pr('right'))menuAdj(1);if(pr('a'))menuAct();if(pr('b'))menuBack();if(pr('start')&&state==='paused')resume();}
 padPrev=cur;}
// touch: gestures only (no on-screen controls)
let touchSoft=false;const isTouch='ontouchstart'in window||navigator.maxTouchPoints>0;
$('pauseBtn').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(state==='play')pauseGame();});
function layoutTouch(){}
// board gestures
let gest=null,ptrs=new Map(),twoTap=null;
cv.parentNode.addEventListener('pointerdown',e=>{if(state!=='play'||e.target.closest('#pauseBtn'))return;initAudio();if($('tut').classList.contains('on')){hideTut();return;}ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,t:performance.now()});
 if(ptrs.size===2){twoTap=performance.now();gest=null;return;}
 if(ptrs.size>2)return;gest={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now(),moved:false,soft:false,lastY:e.clientY,lastT:performance.now(),vy:0,id:e.pointerId};});
addEventListener('pointermove',e=>{if(!gest||state!=='play'||e.pointerId!==gest.id)return;const step=Math.max(14,cellPx*0.85);
 while(Math.abs(e.clientX-gest.x)>=step){const d=Math.sign(e.clientX-gest.x);if(G.cur&&!G.clearing&&tryMove(d,0))sfx('move');gest.x+=d*step;gest.moved=true;}
 const now=performance.now(),dtm=Math.max(1,now-gest.lastT);gest.vy=gest.vy*0.5+0.5*(e.clientY-gest.lastY)/dtm;gest.lastY=e.clientY;gest.lastT=now;
 const dy=e.clientY-gest.sy,dx=e.clientX-gest.sx;if(!gest.soft&&dy>cellPx*1.3&&Math.abs(dy)>Math.abs(dx)*1.4&&gest.vy<1.2){gest.soft=true;touchSoft=true;gest.moved=true;}
 if(gest.soft&&gest.vy<-0.2){gest.soft=false;touchSoft=false;}});
const endG=e=>{const pd=ptrs.get(e.pointerId);ptrs.delete(e.pointerId);
 if(twoTap){if(ptrs.size===0){if(performance.now()-twoTap<350&&state==='play')pauseGame();twoTap=null;}return;}
 if(!gest||e.pointerId!==gest.id)return;const dt=performance.now()-gest.t,dy=e.clientY-gest.sy,dx=e.clientX-gest.sx;
 if(gest.soft){touchSoft=false;}
 else if(dt<320&&dy>cellPx*2&&Math.abs(dy)>Math.abs(dx)*1.5&&!gest.movedX)act('hard');
 else if(dt<320&&dy<-cellPx*2&&Math.abs(dy)>Math.abs(dx)*1.5)act('hold');
 else if(!gest.moved&&dt<300&&Math.abs(dx)<12&&Math.abs(dy)<12)act(e.clientX<VW/2?'ccw':'cw');
 gest=null;};
addEventListener('pointerup',endG);addEventListener('pointercancel',endG);
// first-run gesture tutorial
function showTut(){if(!isTouch||!S.f.gesturehelp)return;$('tut').classList.add('on');clearTimeout(showTut.t);showTut.t=setTimeout(hideTut,6500);}
function hideTut(){$('tut').classList.remove('on');if(!S.tutSeen){S.tutSeen=1;S.f.gesturehelp=0;save();}}
// ---------- UI ----------
function showOv(id){document.querySelectorAll('.ov').forEach(o=>o.classList.toggle('on',o.id===id));document.querySelectorAll('.f').forEach(x=>x.classList.remove('f'));fi=0;
 $('ver').style.display=id==='title'?'':'none';$('pauseBtn').style.display=id===null?'':'none';$('hud').style.display=(id===null||id==='pause')&&G?'block':'none';document.body.classList.toggle('playing',(id===null||id==='pause')&&!!G);$('rhud').style.display=$('hud').style.display;if(id!==null)$('tut').classList.remove('on');
 if(id&&navigator.getGamepads&&[...navigator.getGamepads()].some(p=>p&&p.connected))setFocus(0);}
let prevOv='title';
function pauseGame(){if(state!=='play')return;state='paused';musicOn=false;showOv('pause');}
function resume(){state='play';showOv(null);startMusic();lastT=performance.now();}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{initAudio();sfx('ui');newGame(b.dataset.mode);});
$('bHow').onclick=()=>{prevOv='title';showOv('how');};
$('bStats').onclick=()=>{prevOv='title';renderStats();showOv('stats');};
$('bSet').onclick=()=>{prevOv='title';renderSet();showOv('settings');};
$('bPSet').onclick=()=>{prevOv='pause';renderSet();showOv('settings');};
document.querySelectorAll('.back').forEach(b=>b.onclick=()=>{sfx('ui');showOv(prevOv);});
$('bRes').onclick=resume;$('bRestart').onclick=()=>newGame(G.mode);$('bQuit').onclick=()=>{state='title';G=null;showOv('title');};
$('bAgain').onclick=()=>newGame(G.mode);$('bOTitle').onclick=()=>{state='title';G=null;showOv('title');};
function renderStats(){const r=[['Games played',STATS.games],['Lines cleared',STATS.lines],['Pieces placed',STATS.pieces],['Novabursts',STATS.novabursts],['T-spins',STATS.tspins],['Best combo',STATS.maxCombo],['Best back-to-back',STATS.maxB2B],['Best Marathon score',STATS.best.marathon.toLocaleString()],['Highest Marathon level',STATS.bestLevel],['Best Sprint 40',STATS.sprint?fmt(STATS.sprint):'–'],['Best Ultra score',STATS.best.ultra.toLocaleString()],['Best Zen score',STATS.best.zen.toLocaleString()],['Time played',Math.round(STATS.time/60)+' min']];
 $('statT').innerHTML=r.map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td></tr>`).join('');}
function renderSet(){['mus','sfx','bri'].forEach(k=>{const el=$('s'+k[0].toUpperCase()+k.slice(1));el.value=S[k];el.oninput=()=>{S[k]=+el.value;setVols();applyBright();save();};});
 $('feats').innerHTML=FEATS.map(([k,n])=>`<div class="set">${n}<button class="tog ${S.f[k]?'on':''}" data-k="${k}">${S.f[k]?'On':'Off'}</button></div>`).join('');
 $('feats').querySelectorAll('.tog').forEach(b=>b.onclick=()=>{const k=b.dataset.k;S.f[k]=S.f[k]?0:1;b.classList.toggle('on',!!S.f[k]);b.textContent=S.f[k]?'On':'Off';save();sfx('ui');if(k==='gl'){location.reload();return;}if(k==='reflect'&&use3D)R3D.setEnv(!!S.f.reflect);if(k==='lite'||k==='city')resize();});
 $('olds').innerHTML=OLDS.map(([v,u])=>`<button class="btn alt" onclick="location.href='${u}'">${v}${v===VERSION?' (this one)':''}</button>`).join('');}
$('sMus').addEventListener('input',()=>{});
// iPhone A2HS hint
const standalone=navigator.standalone||matchMedia('(display-mode: fullscreen)').matches||matchMedia('(display-mode: standalone)').matches;
if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!standalone)$('a2hs').style.display='block';
// ---------- loop ----------
function update(dt){if(state!=='play'||!G||$('tut').classList.contains('on'))return;G.time+=dt;
 if(G.mode==='ultra'){G.ultraLeft-=dt;if(G.ultraLeft<=0){G.ultraLeft=0;endGame(true);return;}}
 if(G.clearing){G.clearT+=dt;if(G.clearT>=0.35)finishClear();return;}
 if(!G.cur){G.are-=dt;if(G.are<=0)spawn();return;}
 // DAS
 const dir=held.left&&!held.right?-1:held.right&&!held.left?1:held.left&&held.right?das.dir:0;
 if(dir){if(das.dir!==dir){das={dir,t:0,arr:0};}das.t+=dt;if(das.t>DAS){das.arr+=dt;while(das.arr>=ARR){das.arr-=ARR;if(!tryMove(dir,0))break;}}}
 // gravity
 const soft=softOn||touchSoft;let g=gravity();if(soft)g=Math.min(g,0.03);
 G.drop+=dt;while(G.drop>=g){G.drop-=g;if(tryMove(0,1)){if(soft)G.score+=1;G.lastRot=false;}else{G.drop=0;break;}}
 if(onGround()){G.lockT+=dt;if(G.lockT>=0.5||G.resets>=15&&G.lockT>=0.5)lockPiece();}else G.lockT=0;
 // danger: stack height
 let top=H;for(let y=H-VIS;y<H;y++)if(G.board[y].some(Boolean)){top=y;break;}G.danger=Math.max(0,Math.min(1,(H-top-12)/6));}
function fxUpdate(dt){shakeA*=Math.pow(0.002,dt);calloutT-=dt;
 for(let i=parts.length-1;i>=0;i--){const q=parts[i];q.vy+=22*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.r+=q.vr*dt;q.life-=dt;if(q.life<=0)parts.splice(i,1);}
 for(let i=lasers.length-1;i>=0;i--){lasers[i].t+=dt;if(lasers[i].t>0.45)lasers.splice(i,1);}}
let fpsAcc=0,fpsN=0,autoLite=false;
function loop(now){const dt=Math.min(0.05,(now-lastT)/1000||0);lastT=now;
 try{pollPad(dt);update(dt);fxUpdate(dt);music();render(now/1000,dt);if(state==='play')hud();}catch(e){console.error(e);}
 // auto fallback if slow: 3D full -> 3D lite (no bloom, lower res) -> 2D
 if(state==='play'){fpsAcc+=dt;fpsN++;if(fpsN===180){const avg=fpsAcc/fpsN;fpsAcc=0;fpsN=0;
  if(avg>1/40){if(use3D&&!S.f.lite){S.f.lite=1;S.f.bloom=0;save();resize();toast('Lighter 3D for smoother play');}
   else if(use3D&&S.f.lite){use3D=false;$('gl').style.display='none';resize();toast('Switched to 2D graphics for smoother play');}
   else if(!S.f.lite){S.f.lite=1;save();resize();}}}}
 requestAnimationFrame(loop);}
addEventListener('resize',()=>setTimeout(resize,50));addEventListener('orientationchange',()=>setTimeout(resize,250));
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(state==='play')pauseGame();if(AC)AC.suspend();}else if(AC)AC.resume();});
function boot3D(){if(boot3D.done)return;boot3D.done=true;
 if(S.f.gl&&window.R3D){try{const ok=R3D.init($('gl'),{S,cells,ghostY,onGround:()=>G&&G.cur&&onGround()});if(ok){use3D=true;$('gl').style.display='block';R3D.setEnv(!!S.f.reflect);}}catch(e){console.warn('3D init failed',e);use3D=false;}}
 resize();}
if(window.R3D)boot3D();else{addEventListener('r3d-ready',boot3D);setTimeout(boot3D,4000);}
resize();showOv('title');requestAnimationFrame(loop);
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
window.__ns={get use3D(){return use3D},get G(){return G},newGame,act,cells,fits,update,get state(){return state}};
