/* Prismfuse v1.0 - a falling-block puzzle with hidden fuses. Original game for Colin. */
(function(){'use strict';
const VERSION='1.0',KEY='prismfuse-v1';
const W=10,H=22,HID=2;
const COLS=[['#4ff0ff','#13a9d6'],['#ffe45c','#f0a800'],['#c08bff','#7a3fe6'],['#86ff8f','#25c25a'],['#ff7ad9','#d23aa8'],['#6c9dff','#2d58e0'],['#ffb052','#f07a14']];
const STAR=['#fff3a0','#ffc21a'];
const SHAPES=[[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],[[1,1],[1,1]],[[0,1,0],[1,1,1],[0,0,0]],[[0,1,1],[1,1,0],[0,0,0]],[[1,1,0],[0,1,1],[0,0,0]],[[1,0,0],[1,1,1],[0,0,0]],[[0,0,1],[1,1,1],[0,0,0]]];
const NUMC=['rgba(255,255,255,.35)','#ffffff','#7ff6ff','#ffe45c','#ff9ef0','#b8a0ff','#9dff9d','#ffffff','#ffffff'];
const FEATS=[['ghost','Ghost piece (shows where it lands)'],['hold','Hold slot'],['hints','Safe-gem hints (ticks next to a 0)'],['freeze','Scan freezes time (off = slow motion)'],['shake','Screen shake'],['parts','Sparkles and particles'],['tips','Helpful tips']];
const OLDS=[['v1.0 (current)','../prismfuse-v1.0/']];
const $=id=>document.getElementById(id);
let S=load();
function load(){let d={};try{d=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){}
 d.mus=d.mus??60;d.sfx=d.sfx??80;d.bri=d.bri??100;d.f=Object.assign({ghost:1,hold:1,hints:1,freeze:1,shake:1,parts:1,tips:1},d.f||{});
 d.st=Object.assign({games:0,best:0,bestLv:0,lines:0,zaps:0,wrong:0,pops:0,time:0,stars:0},d.st||{});return d}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

/* ---------- audio ---------- */
let AC=null,mG,sG,noiseB,musT=0,step=0;
function audio(){if(AC){if(AC.state==='suspended')AC.resume();return}
 try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){return}
 mG=AC.createGain();sG=AC.createGain();mG.connect(AC.destination);sG.connect(AC.destination);vols();
 noiseB=AC.createBuffer(1,AC.sampleRate*.5,AC.sampleRate);const d=noiseB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;musT=AC.currentTime+.1}
function vols(){if(!AC)return;mG.gain.value=(S.mus/100)**2*.5;sG.gain.value=(S.sfx/100)**2*.7}
function tone(f,d,type,v,slide,when,dest){if(!AC)return;const t=when||AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+d);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v||.2,t+.008);g.gain.exponentialRampToValueAtTime(.0008,t+d);o.connect(g);g.connect(dest||sG);o.start(t);o.stop(t+d+.05)}
function noise(d,v,fq,when,dest){if(!AC)return;const t=when||AC.currentTime,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=noiseB;f.type='bandpass';f.frequency.value=fq||3000;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(f);f.connect(g);g.connect(dest||sG);s.start(t);s.stop(t+d)}
const SFX={move:()=>tone(520,.05,'triangle',.08),rot:()=>tone(760,.07,'triangle',.1,980),land:()=>{tone(180,.12,'sine',.25,90);noise(.06,.1,1200)},
 drop:()=>{tone(300,.18,'sine',.3,70);noise(.12,.15,800)},hold:()=>tone(440,.1,'sine',.12,660),
 clear:n=>{[0,1,2,3].slice(0,n+1).forEach((i,k)=>tone([523,659,784,1047][k],.25,'triangle',.15,0,AC&&AC.currentTime+k*.06))},
 zap:()=>{tone(880,.3,'square',.06,1760);[1047,1319,1568,2093].forEach((f,k)=>tone(f,.3,'sine',.12,0,AC&&AC.currentTime+.05*k))},
 wrong:()=>{tone(220,.3,'sawtooth',.08,140);noise(.2,.15,500)},pop:()=>{tone(120,.5,'sine',.4,40);noise(.4,.35,600)},
 scan:()=>tone(600,.15,'sine',.1,1200),unscan:()=>tone(900,.12,'sine',.08,500),lvl:()=>[523,659,784,1047,1319].forEach((f,k)=>tone(f,.3,'triangle',.14,0,AC&&AC.currentTime+k*.08)),
 over:()=>[784,659,523,392].forEach((f,k)=>tone(f,.4,'triangle',.14,0,AC&&AC.currentTime+k*.15)),ui:()=>tone(700,.05,'sine',.08)};
function sfx(n,a){if(AC&&S.sfx>0)try{SFX[n](a)}catch(e){}}
const CH=[[60,64,67,71],[55,59,62,67],[57,60,64,69],[53,57,60,65]];const mf=m=>440*Math.pow(2,(m-69)/12);
function music(){if(!AC||S.mus<=0){if(AC)musT=AC.currentTime+.1;return}
 const bpm=104+Math.min(30,(G.lv-1)*3),sx=60/bpm/4;if(musT<AC.currentTime)musT=AC.currentTime+.05;
 while(musT<AC.currentTime+.2){const bar=Math.floor(step/16)%4,s=step%16,ch=CH[bar];
  if(G.mode==='play'||G.mode==='scan'||G.mode==='clear'){
   const pat=[0,1,2,3,2,1,2,3,0,2,1,3,2,1,3,2];tone(mf(ch[pat[s]]+12),.18,'triangle',.07,0,musT,mG);
   if(s%8==0)tone(mf(ch[0]-24),.4,'sine',.25,0,musT,mG);if(s%4==2)noise(.04,.05,8000,musT,mG);if(s%8==4)tone(90,.15,'sine',.2,45,musT,mG);
  }else if(s%4==0)tone(mf(ch[(s/4)%4]+12),.6,'sine',.06,0,musT,mG);
  if(s==0)ch.forEach(n=>tone(mf(n),sx*16,'sine',.025,0,musT,mG));
  musT+=sx;step++}}

/* ---------- canvas & layout ---------- */
const cv=$('cv'),cx=cv.getContext('2d');let VW=0,VH=0,DPR=1,CS=20,BX=0,BY=0,ins={t:0,r:0,b:0,l:0},spr=[],sprStar=null,touchOn=false;
const probe=document.createElement('div');probe.style.cssText='position:fixed;top:env(safe-area-inset-top);right:env(safe-area-inset-right);bottom:env(safe-area-inset-bottom);left:env(safe-area-inset-left);pointer-events:none;visibility:hidden';document.body.appendChild(probe);
function resize(){VW=innerWidth;VH=innerHeight;DPR=Math.min(3,devicePixelRatio||1);cv.width=VW*DPR|0;cv.height=VH*DPR|0;
 const r=probe.getBoundingClientRect();ins={t:r.top,l:r.left,r:VW-r.right,b:VH-r.bottom};
 const ah=VH-ins.t-ins.b-16;CS=Math.max(10,Math.floor(Math.min(ah/20,(VW-ins.l-ins.r)*.4/10)));
 BX=Math.round(VW/2-CS*5);BY=Math.round(ins.t+8+(ah-CS*20)/2);makeSprites();layoutTouch()}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function gem(col){const s=Math.ceil(CS*DPR),o=document.createElement('canvas');o.width=o.height=s;const c=o.getContext('2d'),p=s*.06,w=s-2*p,r=s*.24;
 let g=c.createLinearGradient(0,p,0,s-p);g.addColorStop(0,col[0]);g.addColorStop(1,col[1]);rr(c,p,p,w,w,r);c.fillStyle=g;c.fill();
 c.lineWidth=Math.max(1,s*.05);c.strokeStyle='rgba(255,255,255,.55)';c.stroke();
 g=c.createLinearGradient(0,p,0,s*.55);g.addColorStop(0,'rgba(255,255,255,.75)');g.addColorStop(1,'rgba(255,255,255,0)');rr(c,p*2.2,p*1.8,w-p*2.4,w*.42,r*.7);c.fillStyle=g;c.fill();
 c.fillStyle='rgba(255,255,255,.8)';c.beginPath();c.arc(s*.28,s*.27,s*.07,0,7);c.fill();return o}
function makeSprites(){spr=COLS.map(gem);sprStar=gem(STAR)}

/* ---------- game state ---------- */
const G={mode:'title',lv:1};let bag=[];
function newGame(){Object.assign(G,{mode:'play',board:Array.from({length:H},()=>Array(W).fill(null)),score:0,lines:0,lv:1,hearts:3,next:[],holdP:null,canHold:true,cur:null,
 grav:0,lock:0,lockN:0,energy:1,scan:null,clr:null,time:0,pieces:0,zaps:0,wrongs:0,pops:0,stars:0,combo:0,tipShown:{},fx:[],pops2:[],shake:0,banner:null});bag=[];
 for(let i=0;i<5;i++)G.next.push(gen());spawn();S.st.games++;save();tip('move','Fill rows to clear them. Numbers show how many hidden fuses touch each gem.')}
function gen(){if(!bag.length){bag=[0,1,2,3,4,5,6];for(let i=6;i>0;i--){const j=Math.random()*(i+1)|0;[bag[i],bag[j]]=[bag[j],bag[i]]}}
 const t=bag.pop(),p=Math.min(.3,.07+.022*(G.lv-1)),noMine=(G.pieces||0)<3;
 const m=SHAPES[t].map(r=>r.map(v=>v?(!noMine&&Math.random()<p?2:1):0));return{t,m}}
function spawn(){const p=G.next.shift();G.next.push(gen());G.pieces++;G.cur={t:p.t,m:p.m,x:p.m.length==2?4:3,y:0};G.lock=0;G.lockN=0;G.grav=0;G.canHold=true;
 if(hit(G.cur.m,G.cur.x,G.cur.y))gameOver(false)}
function hit(m,x,y){for(let j=0;j<m.length;j++)for(let i=0;i<m.length;i++)if(m[j][i]){const X=x+i,Y=y+j;if(X<0||X>=W||Y>=H||(Y>=0&&G.board[Y][X]))return true}return false}
function move(dx){if(!G.cur)return;if(!hit(G.cur.m,G.cur.x+dx,G.cur.y)){G.cur.x+=dx;sfx('move');touchLock();return true}}
function touchLock(){if(G.lock>0&&G.lockN<15){G.lock=0;G.lockN++}}
function rotM(m,dir){const n=m.length;return m.map((r,j)=>r.map((_,i)=>dir>0?m[n-1-i][j]:m[i][n-1-j]))}
function rotate(dir){if(!G.cur||G.cur.t==1)return;const m=rotM(G.cur.m,dir);for(const [kx,ky] of [[0,0],[-1,0],[1,0],[0,-1],[-2,0],[2,0],[0,1]])if(!hit(m,G.cur.x+kx,G.cur.y+ky)){G.cur.m=m;G.cur.x+=kx;G.cur.y+=ky;sfx('rot');touchLock();return}}
function ghostY(){let y=G.cur.y;while(!hit(G.cur.m,G.cur.x,y+1))y++;return y}
function hardDrop(){if(!G.cur)return;const y=ghostY(),d=y-G.cur.y;G.score+=d*2;
 if(S.f.parts)for(let j=0;j<G.cur.m.length;j++)for(let i=0;i<G.cur.m.length;i++)if(G.cur.m[j][i])for(let k=0;k<3;k++)G.fx.push({x:BX+(G.cur.x+i+.5)*CS,y:BY+(y+j-HID+Math.random())*CS,vx:(Math.random()-.5)*30,vy:-40-Math.random()*60,l:.5,c:COLS[G.cur.t][0],s:3});
 G.cur.y=y;sfx('drop');if(S.f.shake)G.shake=Math.max(G.shake,4);lockPiece()}
function hold(){if(!S.f.hold||!G.canHold||!G.cur)return;const c={t:G.cur.t,m:SHAPES[G.cur.t].map((r,j)=>r.map((v,i)=>v?1:0))};
 // keep the fuses: re-place the mine count on the base shape
 const mines=G.cur.m.flat().filter(v=>v==2).length;let k=0;c.m.forEach(r=>r.forEach((v,i)=>{if(v&&k<mines){r[i]=2;k++}}));
 if(G.holdP){const h=G.holdP;G.holdP=c;G.cur={t:h.t,m:h.m,x:h.m.length==2?4:3,y:0};G.lock=0;G.lockN=0;if(hit(G.cur.m,G.cur.x,G.cur.y))return gameOver(false)}else{G.holdP=c;spawn()}G.canHold=false;sfx('hold')}
function lockPiece(){const c=G.cur;let top=false;for(let j=0;j<c.m.length;j++)for(let i=0;i<c.m.length;i++)if(c.m[j][i]){const Y=c.y+j;if(Y<0){top=true;continue}if(Y<HID)top=true;G.board[Y][c.x+i]={c:c.t,mine:c.m[j][i]==2,star:false,safe:false,born:G.time}}
 G.cur=null;sfx('land');if(top)return gameOver(false);
 const rows=[];for(let y=0;y<H;y++)if(G.board[y].every(v=>v))rows.push(y);
 if(rows.length){G.clr={rows,t:0};G.mode=G.mode=='scan'?'scan':'clear';if(G.mode=='scan')exitScan();G.mode='clear';sfx('clear',rows.length-1)}
 else{G.combo=0;spawn();if(G.pieces==6)tip('scan','Think a gem hides a fuse? Press Scan, pick it, then Zap it for a golden star.')}}
function finishClear(){const rows=G.clr.rows;let live=0,stars=0;
 for(const y of rows)for(let x=0;x<W;x++){const c=G.board[y][x];const px=BX+(x+.5)*CS,py=BY+(y-HID+.5)*CS;
  if(c.mine&&!c.star){live++;burst(px,py,['#ffe45c','#ff9ef0','#ffffff','#b8a0ff'],26,220);G.pops2.push({x:px,y:py,t:0,txt:'POP!',c:'#ffe45c'})}
  else if(c.star){stars++;burst(px,py,['#fff3a0','#ffc21a','#ffffff'],18,160)}else burst(px,py,COLS[c.c],6,120)}
 rows.forEach(y=>{G.board.splice(y,1);G.board.unshift(Array(W).fill(null))});
 const n=rows.length;G.combo++;const pts=[0,100,300,500,800][n]*G.lv+stars*500*G.lv+(G.combo>1?50*G.combo*G.lv:0);G.score+=pts;G.lines+=n;G.stars+=stars;
 G.pops2.push({x:BX+CS*5,y:BY+(rows[0]-HID)*CS,t:0,txt:(n==4?'PRISM! ':n>1?n+' rows! ':'')+'+'+pts,c:'#ffffff',big:1});
 if(live){G.hearts-=live;G.pops+=live;S.st.pops+=live;sfx('pop');if(S.f.shake)G.shake=14;tip('pop','A live fuse popped. Zap fuses before their row clears!')}
 G.clr=null;if(G.hearts<=0){G.hearts=0;return gameOver(false)}
 const nl=1+Math.floor(G.lines/8);if(nl>G.lv){G.lv=nl;G.hearts=Math.min(3,G.hearts+1);G.banner={t:0,txt:'Level '+G.lv};sfx('lvl');if(G.lv==2)tip('lv','Each level falls faster and hides more fuses. You also get a heart back.')}
 G.mode='play';spawn()}
function burst(x,y,cols,n,sp){if(!S.f.parts)return;for(let i=0;i<n;i++){const a=Math.random()*6.28,v=sp*(.3+Math.random());G.fx.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-60,l:.6+Math.random()*.6,c:cols[i%cols.length],s:2+Math.random()*4})}}
function locked(){for(let y=HID;y<H;y++)for(let x=0;x<W;x++)if(G.board[y][x])return true;return false}
function enterScan(x,y){if(G.mode!=='play')return;if(!locked()){toast('Nothing to scan yet. Land some gems first.');return}
 if(G.energy<.08){toast('Scanner is recharging…');return}
 if(x==null){let best=null;for(let yy=HID;yy<H&&!best;yy++)for(let xx=0;xx<W;xx++)if(G.board[yy][xx]&&!G.board[yy][xx].star){best=[xx,yy];break}if(!best)for(let yy=HID;yy<H&&!best;yy++)for(let xx=0;xx<W;xx++)if(G.board[yy][xx]){best=[xx,yy];break}[x,y]=best}
 G.scan={x,y};G.mode='scan';sfx('scan')}
function exitScan(){if(G.mode==='scan'){G.mode='play';G.scan=null;sfx('unscan')}}
function moveScan(dx,dy){const s=G.scan;s.x=Math.max(0,Math.min(W-1,s.x+dx));s.y=Math.max(HID,Math.min(H-1,s.y+dy));sfx('move')}
function zap(){const s=G.scan;if(!s)return;const c=G.board[s.y][s.x];const px=BX+(s.x+.5)*CS,py=BY+(s.y-HID+.5)*CS;
 if(!c){toast('Pick a gem to zap.');return}if(c.star||c.safe){toast('That one is already checked.');return}
 if(c.mine){c.star=true;G.zaps++;S.st.zaps++;G.score+=300*G.lv;G.energy=Math.min(1,G.energy+.3);sfx('zap');burst(px,py,['#fff3a0','#ffc21a','#ffffff','#7ff6ff'],30,200);G.pops2.push({x:px,y:py,t:0,txt:'Fuse zapped! +'+300*G.lv,c:'#ffe45c'})}
 else{c.safe=true;G.hearts--;G.wrongs++;S.st.wrong++;sfx('wrong');if(S.f.shake)G.shake=8;G.pops2.push({x:px,y:py,t:0,txt:'Safe gem… -1 heart',c:'#ffffff'});if(G.hearts<=0){G.hearts=0;G.scan=null;return gameOver(false)}}
 exitScan()}
function count(x,y){let n=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){if(!i&&!j)continue;const X=x+i,Y=y+j;if(X<0||X>=W||Y<0||Y>=H)continue;const c=G.board[Y][X];if(c&&c.mine&&!c.star)n++}return n}
function gameOver(){G.mode='over';$('toast').style.opacity=0;toastT=0;G.cur=null;G.scan=null;G.revealT=0;sfx('over');const st=S.st;st.best=Math.max(st.best,G.score);st.bestLv=Math.max(st.bestLv,G.lv);st.lines+=G.lines;st.time+=G.time;st.stars+=G.stars;save();
 setTimeout(()=>{if(G.mode!=='over')return;$('oTitle').textContent=G.score>=st.best&&G.score>0?'New best!':'Run over';
  $('oT').innerHTML=row('Score',G.score)+row('Level',G.lv)+row('Rows cleared',G.lines)+row('Fuses zapped',G.zaps)+row('Best score',st.best);show('over')},1600)}
const row=(a,b)=>'<tr><td>'+a+'</td><td>'+b+'</td></tr>';
let toastT=0;function toast(t){const e=$('toast');e.textContent=t;e.style.opacity=1;toastT=3}
function tip(k,t){if(!S.f.tips||G.tipShown[k])return;G.tipShown[k]=1;toast(t);toastT=5}

/* ---------- update ---------- */
let rep={},last=performance.now();
function update(dt){music();if(toastT>0&&(toastT-=dt)<=0)$('toast').style.opacity=0;
 G.bgT=(G.bgT||0)+dt;if(!G.board)return;
 let gdt=dt;if(G.mode==='scan'){G.energy-=dt/8;if(G.energy<=0){G.energy=0;exitScan();toast('Scanner empty. It refills as you play.')}gdt=S.f.freeze?0:dt*.25}
 else if(G.mode==='play'||G.mode==='clear')G.energy=Math.min(1,G.energy+dt/25);
 if(G.mode==='play'||G.mode==='scan'||G.mode==='clear')G.time+=dt;
 if(G.mode==='clear'){G.clr.t+=dt;if(G.clr.t>.35)finishClear()}
 if((G.mode==='play'||(G.mode==='scan'&&gdt>0))&&G.cur){
  const soft=G.mode==='play'&&held('down');const gi=soft?.03:Math.max(.05,Math.pow(.84,G.lv-1));G.grav+=gdt;
  if(hit(G.cur.m,G.cur.x,G.cur.y+1)){G.lock+=gdt;if(G.lock>.5)lockPiece()}
  else while(G.grav>=gi&&G.cur){G.grav-=gi;if(!hit(G.cur.m,G.cur.x,G.cur.y+1)){G.cur.y++;if(soft)G.score++}else break}
  if(G.grav>gi)G.grav=0}
 if(G.mode==='play'){for(const d of ['left','right']){if(held(d)){rep[d]=(rep[d]||0)+dt;if(rep[d]>.17){rep[d]-=.05;move(d=='left'?-1:1)}}else rep[d]=0}}
 if(G.mode==='scan'){for(const d of ['left','right','up','down']){if(held(d)){rep[d]=(rep[d]||0)+dt;if(rep[d]>.25){rep[d]-=.09;moveScan(d=='left'?-1:d=='right'?1:0,d=='up'?-1:d=='down'?1:0)}}else rep[d]=0}}
 if(G.mode==='over')G.revealT+=dt;
 G.fx=G.fx.filter(p=>(p.l-=dt)>0&&(p.x+=p.vx*dt,p.y+=p.vy*dt,p.vy+=260*dt,true));G.pops2=G.pops2.filter(p=>(p.t+=dt)<1.3);
 if(G.banner&&(G.banner.t+=dt)>2)G.banner=null;G.shake*=Math.pow(.02,dt)}

/* ---------- render ---------- */
const bubbles=Array.from({length:22},()=>({x:Math.random(),y:Math.random(),r:.03+Math.random()*.09,h:[190,270,310,50,140][Math.random()*5|0],s:.01+Math.random()*.03}));
function draw(){const c=cx,t=G.bgT||0;c.setTransform(DPR,0,0,DPR,0,0);
 const hue=250+Math.sin(t*.05)*25;let g=c.createLinearGradient(0,0,VW,VH);g.addColorStop(0,`hsl(${hue},75%,52%)`);g.addColorStop(.5,`hsl(${hue+40},70%,55%)`);g.addColorStop(1,`hsl(${hue-70},80%,50%)`);c.fillStyle=g;c.fillRect(0,0,VW,VH);
 for(const b of bubbles){b.y-=b.s*.016;if(b.y<-.2)b.y=1.2;const x=b.x*VW+Math.sin(t*.3+b.r*50)*20,y=b.y*VH,r=b.r*Math.max(VW,VH);const rg=c.createRadialGradient(x,y,0,x,y,r);rg.addColorStop(0,`hsla(${b.h},100%,80%,.22)`);rg.addColorStop(1,`hsla(${b.h},100%,80%,0)`);c.fillStyle=rg;c.fillRect(x-r,y-r,2*r,2*r)}
 if(!G.board){return}
 c.save();if(G.shake>.3)c.translate((Math.random()-.5)*G.shake,(Math.random()-.5)*G.shake);
 // board well
 rr(c,BX-8,BY-8,CS*10+16,CS*20+16,18);c.fillStyle='rgba(30,15,90,.55)';c.fill();c.lineWidth=3;c.strokeStyle='rgba(255,255,255,.5)';c.stroke();
 c.strokeStyle='rgba(255,255,255,.07)';c.lineWidth=1;c.beginPath();for(let i=1;i<10;i++){c.moveTo(BX+i*CS,BY);c.lineTo(BX+i*CS,BY+20*CS)}for(let j=1;j<20;j++){c.moveTo(BX,BY+j*CS);c.lineTo(BX+10*CS,BY+j*CS)}c.stroke();
 // locked gems
 const fs=Math.round(CS*.55);c.font=`900 ${fs}px ui-rounded,"SF Pro Rounded",Nunito,system-ui,sans-serif`;c.textAlign='center';c.textBaseline='middle';
 const safeN=new Set();if(S.f.hints)for(let y=HID;y<H;y++)for(let x=0;x<W;x++){const b=G.board[y][x];if(b&&!b.star&&count(x,y)==0)for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){if(i||j)safeN.add((y+j)*W+x+i)}}
 const clrRows=G.clr?G.clr.rows:[];
 for(let y=HID;y<H;y++)for(let x=0;x<W;x++){const b=G.board[y][x];if(!b)continue;const px=BX+x*CS,py=BY+(y-HID)*CS;const age=G.time-b.born;
  let sc=age<.12?1+(.12-age)*1.2:1;c.save();c.translate(px+CS/2,py+CS/2);c.scale(sc,1/sc);
  if(G.mode==='over'&&b.mine&&!b.star&&G.revealT>.3){drawFuse(c,CS)}else{c.drawImage(b.star?sprStar:spr[b.c],-CS/2,-CS/2,CS,CS);
   if(b.star)drawStar(c,CS*.3);else{const n=count(x,y);c.lineWidth=Math.max(2,CS*.14);c.strokeStyle='rgba(30,10,80,.75)';c.strokeText(n,0,CS*.04);c.fillStyle=NUMC[n];c.fillText(n,0,CS*.04);
    if(b.safe||safeN.has(y*W+x)){c.fillStyle='rgba(255,255,255,.9)';c.beginPath();c.arc(CS*.32,-CS*.32,CS*.13,0,7);c.fill();c.strokeStyle='#22b863';c.lineWidth=CS*.06;c.beginPath();c.moveTo(CS*.26,-CS*.32);c.lineTo(CS*.31,-CS*.27);c.lineTo(CS*.39,-CS*.38);c.stroke()}}}
  c.restore();
  if(clrRows.includes(y)){c.fillStyle=`rgba(255,255,255,${.85*Math.min(1,G.clr.t/.2)})`;rr(c,px+1,py+1,CS-2,CS-2,CS*.22);c.fill()}}
 // ghost + current
 if(G.cur){const m=G.cur.m,gy=ghostY();if(S.f.ghost){c.lineWidth=2;c.strokeStyle=COLS[G.cur.t][0];c.globalAlpha=.6;for(let j=0;j<m.length;j++)for(let i=0;i<m.length;i++)if(m[j][i]&&gy+j>=HID){rr(c,BX+(G.cur.x+i)*CS+3,BY+(gy+j-HID)*CS+3,CS-6,CS-6,CS*.2);c.stroke()}c.globalAlpha=1}
  c.shadowColor=COLS[G.cur.t][0];c.shadowBlur=14;for(let j=0;j<m.length;j++)for(let i=0;i<m.length;i++)if(m[j][i]&&G.cur.y+j>=HID)c.drawImage(spr[G.cur.t],BX+(G.cur.x+i)*CS,BY+(G.cur.y+j-HID)*CS,CS,CS);c.shadowBlur=0}
 // scan cursor
 if(G.mode==='scan'&&G.scan){c.fillStyle='rgba(120,240,255,.12)';c.fillRect(BX,BY,CS*10,CS*20);const p=.5+.5*Math.sin(t*8),sx=BX+G.scan.x*CS,sy=BY+(G.scan.y-HID)*CS;
  c.lineWidth=3+p*2;c.strokeStyle='#ffe45c';c.shadowColor='#ffe45c';c.shadowBlur=12;rr(c,sx-3,sy-3,CS+6,CS+6,CS*.3);c.stroke();c.shadowBlur=0;
  c.fillStyle='#fff';c.font=`800 ${Math.max(12,CS*.6)}px ui-rounded,Nunito,system-ui,sans-serif`;c.fillText(touchOn?'Tap it again to zap':'Zap: Space / A',BX+CS*5,BY-CS*.1+ (BY>CS?-CS*.4:CS*20+CS*.9))}
 c.restore();
 // side panels
 const pw=Math.min(CS*5.5,BX-ins.l-24),lx=BX-16-pw,rx=BX+CS*10+16;c.textAlign='left';
 const lab=(s,x,y,sz)=>{c.font=`800 ${sz}px ui-rounded,Nunito,system-ui,sans-serif`;c.fillStyle='#fff';c.fillText(s,x,y)};const ls=Math.max(12,Math.min(20,CS*.75));
 if(pw>40){panel(lx,BY,pw,CS*7.2);lab('Score',lx+10,BY+ls,ls*.8);lab(G.score,lx+10,BY+ls*2.2,ls*1.25);lab('Level '+G.lv+'  ·  Rows '+G.lines,lx+10,BY+ls*3.5,ls*.75);
  for(let i=0;i<3;i++)heart(c,lx+16+i*ls*1.5,BY+ls*4.8,ls*.55,i<G.hearts);
  lab('Scan',lx+10,BY+ls*6.1,ls*.7);rr(c,lx+10+ls*2.4,BY+ls*5.75,pw-30-ls*2.4,ls*.6,ls*.3);c.fillStyle='rgba(255,255,255,.2)';c.fill();rr(c,lx+10+ls*2.4,BY+ls*5.75,Math.max(ls*.6,(pw-30-ls*2.4)*G.energy),ls*.6,ls*.3);c.fillStyle='#7ff6ff';c.fill();
  if(S.f.hold){panel(lx,BY+CS*7.6,pw,CS*4.2);lab('Hold',lx+10,BY+CS*7.6+ls,ls*.8);if(G.holdP)mini(G.holdP,lx+pw/2,BY+CS*7.6+CS*2.6,CS*.7,G.canHold?1:.4)}}
 const npw=Math.min(CS*4.5,VW-ins.r-rx-12);if(npw>40){panel(rx,BY,npw,CS*11.5);lab('Next',rx+10,BY+ls,ls*.8);for(let i=0;i<4;i++)mini(G.next[i],rx+npw/2,BY+CS*2.6+i*CS*2.3,CS*(i?.55:.7),1)}
 // popups
 c.textAlign='center';for(const p of G.pops2){c.globalAlpha=Math.min(1,1.3-p.t);c.font=`900 ${Math.max(14,CS*(p.big?.9:.7))}px ui-rounded,Nunito,system-ui,sans-serif`;c.lineWidth=4;c.strokeStyle='rgba(40,10,100,.8)';c.strokeText(p.txt,p.x,p.y-p.t*40);c.fillStyle=p.c;c.fillText(p.txt,p.x,p.y-p.t*40)}c.globalAlpha=1;
 for(const p of G.fx){c.globalAlpha=Math.min(1,p.l*2);c.fillStyle=p.c;c.beginPath();c.arc(p.x,p.y,p.s,0,7);c.fill()}c.globalAlpha=1;
 if(G.banner){const a=Math.min(1,G.banner.t*4,(2-G.banner.t)*3);c.globalAlpha=a;c.font=`900 ${CS*2}px ui-rounded,Nunito,system-ui,sans-serif`;c.lineWidth=8;c.strokeStyle='rgba(60,20,140,.8)';c.strokeText(G.banner.txt,VW/2,BY+CS*8);const lg=c.createLinearGradient(VW/2-CS*5,0,VW/2+CS*5,0);lg.addColorStop(0,'#7ff6ff');lg.addColorStop(.5,'#ffe45c');lg.addColorStop(1,'#ff9ef0');c.fillStyle=lg;c.fillText(G.banner.txt,VW/2,BY+CS*8);c.globalAlpha=1}
}
function panel(x,y,w,h){rr(cx,x,y,w,h,16);cx.fillStyle='rgba(30,15,90,.45)';cx.fill();cx.lineWidth=2;cx.strokeStyle='rgba(255,255,255,.35)';cx.stroke()}
function mini(p,mx,my,s,a){if(!p)return;const m=p.m,n=m.length;let x0=n,x1=0,y0=n,y1=0;m.forEach((r,j)=>r.forEach((v,i)=>{if(v){x0=Math.min(x0,i);x1=Math.max(x1,i);y0=Math.min(y0,j);y1=Math.max(y1,j)}}));
 cx.globalAlpha=a;m.forEach((r,j)=>r.forEach((v,i)=>{if(v)cx.drawImage(spr[p.t],mx+(i-(x0+x1+1)/2)*s,my+(j-(y0+y1+1)/2)*s,s,s)}));cx.globalAlpha=1}
function heart(c,x,y,r,on){c.save();c.translate(x,y);c.beginPath();c.moveTo(0,r*.9);c.bezierCurveTo(-r*1.6,-r*.2,-r*.6,-r*1.3,0,-r*.4);c.bezierCurveTo(r*.6,-r*1.3,r*1.6,-r*.2,0,r*.9);c.fillStyle=on?'#ff7ad9':'rgba(255,255,255,.2)';c.fill();if(on){c.fillStyle='rgba(255,255,255,.6)';c.beginPath();c.arc(-r*.45,-r*.45,r*.2,0,7);c.fill()}c.restore()}
function drawStar(c,r){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rad=i%2?r*.45:r;c.lineTo(Math.cos(a)*rad,Math.sin(a)*rad)}c.closePath();c.fillStyle='#fff';c.fill();c.lineWidth=2;c.strokeStyle='#f0a800';c.stroke()}
function drawFuse(c,s){const g=c.createRadialGradient(-s*.12,-s*.12,1,0,0,s*.42);g.addColorStop(0,'#9a7bff');g.addColorStop(1,'#3a1f8c');c.fillStyle=g;c.beginPath();c.arc(0,s*.05,s*.36,0,7);c.fill();c.strokeStyle='#fff';c.lineWidth=2;c.stroke();
 c.fillStyle='#ffe45c';c.beginPath();c.arc(s*.25,-s*.33,s*.1+Math.sin((G.bgT||0)*20)*s*.03,0,7);c.fill()}

/* ---------- input ---------- */
const keys={},pads={},tch={};
function held(a){return keys[a]||pads[a]||tch[a]}
const KM={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'down',ArrowUp:'up',KeyA:'left',KeyD:'right'};
function act(a){audio();if(G.mode==='play'){({left:()=>{move(-1);rep.left=0},right:()=>{move(1);rep.right=0},rot:()=>rotate(1),ccw:()=>rotate(-1),drop:hardDrop,hold,scan:()=>enterScan(),pause})[a]?.()}
 else if(G.mode==='scan'){({left:()=>{moveScan(-1,0);rep.left=0},right:()=>{moveScan(1,0);rep.right=0},up:()=>{moveScan(0,-1);rep.up=0},down:()=>{moveScan(0,1);rep.down=0},rot:zap,drop:zap,zap,scan:exitScan,back:exitScan,pause})[a]?.()}
 else if(G.mode==='clear'&&a==='pause')pause()}
addEventListener('keydown',e=>{audio();if(menuOpen()){menuKey(e);return}const k=e.code;if(KM[k]){keys[KM[k]]=1;if(!e.repeat)act(KM[k]=='up'&&G.mode==='play'?'rot':KM[k])}
 if(e.repeat)return;({KeyX:'rot',KeyZ:'ccw',KeyW:'rot',Space:'drop',KeyC:'hold',ShiftLeft:'hold',KeyS:'scan',KeyF:'scan',Enter:'zap',Escape:G.mode==='scan'?'back':'pause',KeyP:'pause'})[k]&&act(({KeyX:'rot',KeyZ:'ccw',KeyW:'rot',Space:'drop',KeyC:'hold',ShiftLeft:'hold',KeyS:'scan',KeyF:'scan',Enter:'zap',Escape:G.mode==='scan'?'back':'pause',KeyP:'pause'})[k]);
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k))e.preventDefault()});
addEventListener('keyup',e=>{if(KM[e.code])keys[KM[e.code]]=0});
// touch buttons
const TB={tL:'left',tR:'right',tD:'down',tH:'hold',tRot:'rot',tCcw:'ccw',tDrop:'drop',tScan:'scan',tPause:'pause'};
for(const id in TB){const el=$(id),a=TB[id];el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();el.classList.add('dn');if(['left','right','down'].includes(a))tch[a]=1;if(G.mode==='scan'&&a==='down'){act('down');return}act(a)});
 const up=()=>{el.classList.remove('dn');tch[a]=0};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('pointerleave',up)}
function layoutTouch(){const bs=Math.round(Math.max(46,Math.min(66,VH*.15))),gap=bs*.22,b=VH-ins.b-12-bs,lx=ins.l+14,rx=VW-ins.r-14-bs;
 const P=(id,x,y)=>{const e=$(id).style;e.width=e.height=bs+'px';e.left=x+'px';e.top=y+'px'};
 P('tL',lx,b);P('tR',lx+(bs+gap)*2,b);P('tD',lx+bs+gap,b);P('tH',lx+bs+gap,b-bs-gap);
 P('tRot',rx,b-bs-gap);P('tCcw',rx-bs-gap,b);P('tDrop',rx,b);P('tScan',rx-bs-gap,b-bs-gap);P('tPause',VW-ins.r-14-bs*.8,ins.t+10);$('tPause').style.width=$('tPause').style.height=bs*.8+'px';$('tH').style.display=S.f.hold?'flex':'none'}
cv.addEventListener('pointerdown',e=>{audio();if(e.pointerType!=='mouse'){touchOn=true;$('touch').classList.add('on')}
 if(G.mode!=='play'&&G.mode!=='scan')return;const x=Math.floor((e.clientX-BX)/CS),y=Math.floor((e.clientY-BY)/CS)+HID;const inB=x>=0&&x<W&&y>=HID&&y<H;
 if(G.mode==='scan'){if(!inB)return exitScan();if(G.scan.x==x&&G.scan.y==y)zap();else{G.scan.x=x;G.scan.y=y;sfx('move')}}
 else if(inB&&G.board[y][x])enterScan(x,y)});
addEventListener('touchstart',()=>{touchOn=true;$('touch').classList.toggle('on',G.mode==='play'||G.mode==='scan'||G.mode==='clear')},{passive:true});
// gamepad
let padPrev={};
function pollPad(){const ps=navigator.getGamepads?navigator.getGamepads():[];let gp=null;for(const p of ps)if(p&&p.connected){gp=p;break}if(!gp)return;
 const B=i=>gp.buttons[i]&&gp.buttons[i].pressed,ax=gp.axes||[];
 const st={left:B(14)||ax[0]<-.5,right:B(15)||ax[0]>.5,up:B(12)||ax[1]<-.5,down:B(13)||ax[1]>.5,a:B(0),b:B(1),x:B(2),y:B(3),lb:B(4),rb:B(5),lt:B(6),rt:B(7),start:B(9),sel:B(8)};
 const pr=k=>st[k]&&!padPrev[k];if(st.a||st.b||st.start)audio();
 if(menuOpen()){for(const k of ['up','down','left','right'])if(pr(k))menuNav(k);if(pr('a'))menuAct();if(pr('b'))menuBack();if(pr('start')&&$('pause').classList.contains('on'))resume();padPrev=st;return}
 pads.left=st.left;pads.right=st.right;pads.down=st.down;pads.up=st.up;
 if(G.mode==='scan'){if(pr('left'))act('left');if(pr('right'))act('right');if(pr('up'))act('up');if(pr('down'))act('down');if(pr('a'))zap();if(pr('b')||pr('x'))exitScan();if(pr('start'))pause()}
 else if(G.mode==='play'){if(pr('left'))act('left');if(pr('right'))act('right');if(pr('a')||pr('up'))act('rot');if(pr('b'))act('ccw');if(pr('y'))act('drop');if(pr('lb')||pr('rb')||pr('lt'))act('hold');if(pr('x')||pr('rt'))act('scan');if(pr('start')||pr('sel'))pause()}
 else if(G.mode==='clear'&&pr('start'))pause();padPrev=st}

/* ---------- menus ---------- */
let ovStack=[];
function menuOpen(){return document.querySelector('.ov.on')}
function show(id){document.querySelectorAll('.ov').forEach(o=>o.classList.remove('on'));if(id){$(id).classList.add('on');ovStack.push(id);setTimeout(()=>focusables()[0]?.focus(),30)}
 $('touch').classList.toggle('on',touchOn&&!id&&G.board&&G.mode!=='over');$('ver').style.display=id==='title'?'block':'none'}
function focusables(){const o=menuOpen();return o?[...o.querySelectorAll('button,input')]:[]}
function menuNav(d){const f=focusables();if(!f.length)return;let i=f.indexOf(document.activeElement);const el=f[i];
 if((d==='left'||d==='right')&&el&&el.type==='range'){el.value=+el.value+(d==='right'?5:-5);el.dispatchEvent(new Event('input'));return}
 if(d==='left'||d==='up')i=i<=0?f.length-1:i-1;else i=(i+1)%f.length;f[i].focus();f[i].scrollIntoView({block:'nearest'});sfx('ui')}
function menuAct(){const e=document.activeElement;if(e&&e.tagName==='BUTTON')e.click();else focusables()[0]?.focus()}
function menuBack(){const o=menuOpen();if(!o)return;const b=o.querySelector('.back');if(b)b.click();else if(o.id==='pause')resume()}
function menuKey(e){const k=e.code;if(k==='ArrowUp'||k==='ArrowDown'){e.preventDefault();menuNav(k==='ArrowUp'?'up':'down')}
 else if((k==='ArrowLeft'||k==='ArrowRight')&&document.activeElement?.type!=='range'){e.preventDefault();menuNav(k==='ArrowLeft'?'left':'right')}
 else if(k==='Escape'||k==='Backspace'){e.preventDefault();menuBack()}}
let backTo='title';
function pause(){if(G.mode==='over'||!G.board)return;G.prevMode=G.mode;G.mode='paused';show('pause')}
function resume(){G.mode=G.prevMode||'play';show(null);last=performance.now()}
function start(){audio();show(null);newGame();if(touchOn)$('touch').classList.add('on')}
$('bPlay').onclick=start;$('bAgain').onclick=start;$('bRestart').onclick=start;$('bRes').onclick=resume;
$('bOTitle').onclick=$('bQuit').onclick=()=>{G.board=null;G.mode='title';show('title')};
$('bHow').onclick=()=>{backTo='title';show('how')};$('bStats').onclick=()=>{backTo='title';fillStats();show('stats')};
$('bSet').onclick=()=>{backTo='title';show('settings')};$('bPSet').onclick=()=>{backTo='pause';show('settings')};
document.querySelectorAll('.back').forEach(b=>b.onclick=()=>{sfx('ui');show(backTo)});
function fillStats(){const s=S.st,m=Math.round(s.time/60);$('statT').innerHTML=row('Games played',s.games)+row('Best score',s.best)+row('Highest level',s.bestLv)+row('Rows cleared',s.lines)+row('Fuses zapped',s.zaps)+row('Wrong zaps',s.wrong)+row('Fuses popped',s.pops)+row('Time played',m+' min')}
for(const [id,k] of [['sMus','mus'],['sSfx','sfx'],['sBri','bri']]){const el=$(id);el.value=S[k];el.oninput=()=>{S[k]=+el.value;vols();bright();save()}}
function bright(){const b=S.bri,e=$('bright');e.style.background=b<100?`rgba(0,0,30,${(100-b)/100})`:`rgba(255,255,255,${(b-100)/200})`}
const fe=$('feats');for(const [k,label] of FEATS){const d=document.createElement('div');d.className='set';d.innerHTML='<span>'+label+'</span>';const b=document.createElement('button');b.className='tog';
 const upd=()=>{b.textContent=S.f[k]?'On':'Off';b.classList.toggle('on',!!S.f[k])};upd();b.onclick=()=>{S.f[k]=S.f[k]?0:1;upd();save();layoutTouch();sfx('ui')};d.appendChild(b);fe.appendChild(d)}
for(const [l,u] of OLDS){const b=document.createElement('button');b.className='btn alt';b.textContent=l;b.onclick=()=>{location.href=u};$('olds').appendChild(b)}
$('ver').textContent='v'+VERSION;bright();
if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!navigator.standalone&&!matchMedia('(display-mode: standalone)').matches&&!matchMedia('(display-mode: fullscreen)').matches)$('a2hs').style.display='block';
if(matchMedia('(pointer:coarse)').matches){touchOn=true}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(G.mode==='play'||G.mode==='scan'))pause()});
addEventListener('resize',resize);resize();show('title');
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;try{pollPad();if(G.mode!=='paused')update(dt);draw()}catch(e){console.error(e)}requestAnimationFrame(frame)}requestAnimationFrame(frame);
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
window.PF={G,start,act,zap,enterScan,exitScan,step:n=>{for(let i=0;i<n;i++)update(1/60)},state:()=>G.mode,show,fillStats};
})();
