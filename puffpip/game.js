'use strict';
(function(){
const VER='1.0', T=40, H=24, F=21;
const SAVE='puffpip.save.v1';
const $=id=>document.getElementById(id);
const cv=$('cv'), ctx=cv.getContext('2d');
// ---------- save ----------
let S={music:0.6,sfx:0.8,bright:1,shake:true,stats:{plays:0,clears:0,best:0,berries:0,bestBerries:0,stars:0,pops:0,puffs:0,time:0,starSet:[]}};
try{const s=JSON.parse(localStorage.getItem(SAVE));if(s){Object.assign(S,s);S.stats=Object.assign({plays:0,clears:0,best:0,berries:0,bestBerries:0,stars:0,pops:0,puffs:0,time:0,starSet:[]},s.stats||{});}}catch(e){}
const save=()=>{try{localStorage.setItem(SAVE,JSON.stringify(S))}catch(e){}};
// ---------- audio ----------
let AC=null,mG,sG,musicOn=false,nextNote=0,step=0;
function ac(){if(AC)return AC;try{AC=new (window.AudioContext||window.webkitAudioContext)();mG=AC.createGain();sG=AC.createGain();mG.connect(AC.destination);sG.connect(AC.destination);setVol();}catch(e){}return AC}
function setVol(){if(!AC)return;mG.gain.value=S.music*0.35;sG.gain.value=S.sfx*0.6}
function tone(f,d,type,vol,dest,t0,f2){if(!AC)return;const t=t0||AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol||0.3,t+0.012);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(dest||sG);o.start(t);o.stop(t+d+0.05)}
const sfx={
 berry(){tone(880,0.12,'triangle',0.3);tone(1320,0.15,'sine',0.2,null,AC&&AC.currentTime+0.05)},
 star(){[784,988,1175,1568].forEach((f,i)=>tone(f,0.3,'triangle',0.25,null,AC&&AC.currentTime+i*0.07))},
 puff(){tone(300,0.25,'sine',0.12,null,null,520)},
 deflate(){tone(500,0.2,'sine',0.08,null,null,240)},
 pop(){tone(600,0.18,'square',0.15,null,null,90);tone(200,0.3,'triangle',0.2,null,null,60)},
 flag(){tone(660,0.15,'triangle',0.25);tone(990,0.25,'triangle',0.25,null,AC&&AC.currentTime+0.1)},
 bump(){tone(160,0.08,'sine',0.15)},
 win(){[523,659,784,1047,784,1047,1319].forEach((f,i)=>tone(f,0.35,'triangle',0.25,null,AC&&AC.currentTime+i*0.11))},
 ui(){tone(700,0.06,'sine',0.15)}
};
const MEL=[72,76,79,76,74,77,81,77,72,76,79,84,83,79,76,74],BAS=[48,48,53,53,55,55,48,43];
const mtof=m=>440*Math.pow(2,(m-69)/12);
function musicTick(){if(!AC||!musicOn)return;const bt=0.19;while(nextNote<AC.currentTime+0.25){const i=step%64;
 if(i%2===0)tone(mtof(MEL[(i>>1)%16]),0.17,'triangle',0.16,mG,nextNote);
 if(i%8===0)tone(mtof(BAS[(i>>3)%8]),0.6,'sine',0.3,mG,nextNote);
 if(i%4===2)tone(mtof(MEL[((i>>1)+2)%16]+12),0.08,'sine',0.05,mG,nextNote);
 nextNote+=bt;step++;}}
function startMusic(){if(!ac())return;if(AC.state==='suspended')AC.resume();if(!musicOn){musicOn=true;nextNote=AC.currentTime+0.1}}
// ---------- level ----------
let G,W;const items=[];let checkpoints=[],goalX=0,startPos;
function build(){
 W=170;G=[];for(let y=0;y<H;y++){G.push(new Array(W).fill('.'))}
 items.length=0;checkpoints=[];
 const sol=(x0,x1,y0,y1,c)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(x>=0&&x<W&&y>=0&&y<H)G[y][x]=c||'#'};
 const clr=(x0,x1,y0,y1)=>sol(x0,x1,y0,y1,'.');
 const th=(x0,x1,y)=>sol(x0,x1,y,y,'^');
 const ve=(x0,x1,y0,y1)=>sol(x0,x1,y0,y1,'v');
 const it=(t,x,y)=>items.push({t,x:x*T+T/2,y:y*T+T/2,got:false,id:items.length});
 const brow=(x0,x1,y)=>{for(let x=x0;x<=x1;x++)it('b',x,y)};
 sol(0,W-1,F,H-1);sol(0,W-1,0,0);sol(0,0,0,H-1);sol(W-1,W-1,0,H-1);
 startPos={x:3*T,y:(F-1)*T};
 // 1 flat intro
 brow(6,10,F-1);brow(13,16,F-3);
 // 2 step up ledge (needs a puff)
 sol(20,25,F-3,F);brow(21,24,F-4);
 sol(29,31,F-5,F);it('b',30,F-6);it('b',30,F-7);
 // 3 squeeze tunnel
 sol(37,48,1,F-2);brow(38,47,F-1);
 // 4 thorn pit float
 clr(52,64,F,F+1);th(52,64,F+1);sol(52,64,F+2,H-1);
 sol(57,59,F-4,F-3);brow(53,56,F-5);it('b',58,F-5);brow(60,63,F-5);
 // 5 checkpoint + vent up the cliff
 checkpoints.push({x:67*T,y:(F-1)*T,on:false});
 ve(70,72,7,F-1);sol(73,82,8,F);it('*',71,5);brow(70,72,F-6);
 // 6 thorn ceiling flutter corridor on top of cliff
 sol(83,104,8,F);for(let x=74;x<=104;x++)G[1][x]='#';th(78,104,2);
 clr(86,88,8,9);th(86,88,9);clr(93,96,8,9);th(93,96,9);clr(100,102,8,9);th(100,102,9);
 brow(84,85,6);brow(89,92,5);brow(97,99,6);brow(103,104,7);
 // 7 drop down shaft + low bramble tunnel (stay small!)
 sol(107,130,1,F-1);clr(107,130,F-3,F-1);
 for(let x=107;x<=130;x++){if(((x-107)%8)<4)G[F-3][x]='^'}
 brow(108,109,F-1);brow(111,115,F-1);brow(117,121,F-1);brow(123,127,F-1);
 // secret star nook off the shaft (float up at x105)
 clr(107,111,12,13);it('*',110,13);it('b',108,13);it('b',109,12);
 checkpoints.push({x:133*T,y:(F-1)*T,on:false});
 // 8 vent chain over big thorn sea
 clr(137,156,F,F+1);th(137,156,F+1);sol(137,156,F+2,H-1);
 ve(138,139,8,F);sol(142,144,9,9);ve(146,147,8,F);sol(150,152,9,9);
 for(let x=137;x<=156;x++)G[3][x]='^';
 brow(141,145,7);brow(149,153,7);it('*',148,5);
 // 9 goal
 goalX=162*T;brow(158,161,F-1);
}
const isSol=c=>c==='#';
const cell=(x,y)=>(x<0||y<0||x>=W||y>=H)?'#':G[y][x];
// ---------- state ----------
let P,state='title',paused=false,run,camX=0,camY=0,shake=0,parts=[],tipT=0,lastT=0,acc=0;
function reset(full){
 const cp=full?null:checkpoints.filter(c=>c.on).pop();
 const s=cp||startPos;
 P={x:s.x,y:s.y-6,vx:0,vy:0,p:0,r:13,ground:false,dead:0,face:1,sq:1,blink:0,holding:false};
 if(full){items.forEach(i=>i.got=false);checkpoints.forEach(c=>c.on=false);run={t:0,berries:0,stars:[],pops:0,puffs:0,done:false};}
 camX=P.x;camY=P.y;
}
function startGame(){ac();startMusic();build();reset(true);state='play';paused=false;S.stats.plays++;save();show(null);$('hud').classList.add('on');setTouch();tip('Hold PUFF to puff up and float!',4);}
// ---------- input ----------
const K={};let pad={l:0,r:0,puff:0,x:0},touch={l:0,r:0,puff:0},usingTouch=false;
addEventListener('keydown',e=>{K[e.code]=1;if(state==='play'&&(e.code==='Escape'||e.code==='KeyP'))togglePause();if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();menuKey(e)});
addEventListener('keyup',e=>{K[e.code]=0});
function tTouch(e){usingTouch=true;setTouch();if(state!=='play'||paused)return;let l=0,r=0,pf=0;const w=innerWidth;
 for(const t of e.touches){if(t.clientX>w*0.5)pf=1;else if(t.clientX<w*0.13+40)l=1;else r=1}
 touch={l,r,puff:pf};$('tL').classList.toggle('on',!!l);$('tR').classList.toggle('on',!!r);$('tP').classList.toggle('on',!!pf);if(e.target===cv)e.preventDefault();ac();}
['touchstart','touchmove','touchend','touchcancel'].forEach(n=>addEventListener(n,tTouch,{passive:false}));
function setTouch(){$('touch').classList.toggle('on',usingTouch&&state==='play'&&!paused)}
let padPrev={};
function pollPad(){const ps=navigator.getGamepads?navigator.getGamepads():[];pad={l:0,r:0,puff:0,x:0};let btn={};
 for(const g of ps){if(!g)continue;const ax=g.axes[0]||0,b=i=>g.buttons[i]&&g.buttons[i].pressed;
  if(ax<-0.3||b(14))pad.l=1;if(ax>0.3||b(15))pad.r=1;if(Math.abs(ax)>0.3)pad.x=ax;
  if(b(0)||b(7)||b(5)||b(1)&&false)pad.puff=1;
  btn={a:b(0),b:b(1),start:b(9),up:b(12)||(g.axes[1]||0)<-0.5,down:b(13)||(g.axes[1]||0)>0.5,left:b(14)||ax<-0.5,right:b(15)||ax>0.5};break;}
 const pr=k=>btn[k]&&!padPrev[k];
 if(pr('start')){if(state==='play')togglePause();}
 if(menuOpen()){if(pr('up')||pr('left')&&!isRange())moveFocus(-1);if(pr('down')||pr('right')&&!isRange())moveFocus(1);if(isRange()){if(pr('left'))nudge(-1);if(pr('right'))nudge(1)}if(pr('a'))clickFocus();if(pr('b'))back();}
 padPrev=btn;}
function inp(){return{l:K.ArrowLeft||K.KeyA||touch.l||pad.l,r:K.ArrowRight||K.KeyD||touch.r||pad.r,puff:K.Space||K.ArrowUp||K.KeyW||K.KeyZ||touch.puff||pad.puff}}
// ---------- menus ----------
let focusI=0;
function topScreen(){const o=[...document.querySelectorAll('.screen.on')];return o[o.length-1]}
function menuOpen(){return !!topScreen()}
function focusables(){const s=topScreen();return s?[...s.querySelectorAll('button,a,input')].filter(e=>e.offsetParent!==null&&e.id!=='a2hsX'):[]}
function moveFocus(d){const f=focusables();if(!f.length)return;focusI=(focusI+d+f.length)%f.length;f.forEach(e=>e.classList.remove('focus'));f[focusI].classList.add('focus');f[focusI].focus({preventScroll:true});sfx.ui()}
function isRange(){const f=focusables()[focusI];return f&&f.type==='range'}
function nudge(d){const f=focusables()[focusI];f.value=Math.max(0,Math.min(+f.max,+f.value+d*+f.step*5));f.dispatchEvent(new Event('input'))}
function clickFocus(){const f=focusables()[focusI];if(!f)return;if(f.type==='checkbox'){f.checked=!f.checked;f.dispatchEvent(new Event('change'))}else f.click()}
function back(){const s=topScreen();if(!s)return;if(s.id==='pause')togglePause();else if(s.id!=='title'&&s.id!=='results'){s.classList.remove('on');focusI=0}}
function menuKey(e){if(!menuOpen())return;if(e.code==='ArrowDown'||e.code==='Tab'&&!e.shiftKey){moveFocus(1);e.preventDefault()}else if(e.code==='ArrowUp'){moveFocus(-1);e.preventDefault()}else if((e.code==='ArrowLeft'||e.code==='ArrowRight')&&isRange()){nudge(e.code==='ArrowLeft'?-1:1)}else if(e.code==='Enter'){const f=focusables()[focusI];if(f&&document.activeElement!==f)clickFocus()}else if(e.code==='Escape')back()}
function show(id){document.querySelectorAll('.screen').forEach(s=>{if(s.id!==id)s.classList.remove('on')});if(id)$(id).classList.add('on');focusI=0;setTouch()}
function openModal(id){$(id).classList.add('on');focusI=0;setTouch()}
function sliders(el){el.innerHTML='';[['music','Music'],['sfx','Sound effects'],['bright','Brightness']].forEach(([k,n])=>{const l=document.createElement('label');l.className='row';const mx=k==='bright'?1.5:1,mn=k==='bright'?0.6:0;l.innerHTML='<span>'+n+'</span>';const i=document.createElement('input');i.type='range';i.min=mn;i.max=mx;i.step=0.02;i.value=S[k];i.oninput=()=>{S[k]=+i.value;setVol();applyBright();save()};l.appendChild(i);el.appendChild(l)})}
function applyBright(){cv.style.filter=S.bright===1?'':'brightness('+S.bright+')'}
function togglePause(){if(state!=='play')return;paused=!paused;if(paused){sliders($('pause').querySelector('.sliders'));openModal('pause')}else{$('pause').classList.remove('on');lastT=performance.now()}setTouch()}
const fmt=t=>{t=Math.max(0,t);const m=Math.floor(t/60),s=(t%60);return m+':'+(s<10?'0':'')+s.toFixed(1)};
function renderStats(){const st=S.stats;const rows=[['Runs started',st.plays],['Runs finished',st.clears],['Best time',st.best?fmt(st.best):'—'],['Most berries in a run',st.bestBerries+' / '+items.filter(i=>i.t==='b').length],['Stars found (ever)',(st.starSet||[]).length+' / 3'],['Berries collected',st.berries],['Puffs taken',st.puffs],['Pops',st.pops],['Time played',Math.floor(st.time/60)+' min']];$('statGrid').innerHTML=rows.map(r=>'<span>'+r[0]+'</span><b>'+r[1]+'</b>').join('')}
$('bPlay').onclick=startGame;$('rAgain').onclick=startGame;
$('bStats').onclick=()=>{sfx.ui();build();renderStats();openModal('stats')};$('stClose').onclick=()=>back();
$('stReset').onclick=()=>{if(confirm('Reset all stats?')){S.stats={plays:0,clears:0,best:0,berries:0,bestBerries:0,stars:0,pops:0,puffs:0,time:0,starSet:[]};save();renderStats()}};
$('bSettings').onclick=()=>{ac();sfx.ui();sliders($('settings').querySelector('.sliders'));$('optShake').checked=S.shake;openModal('settings')};$('sClose').onclick=()=>back();
$('optShake').onchange=e=>{S.shake=e.target.checked;save()};
$('bPause').onclick=togglePause;$('pResume').onclick=togglePause;$('pRestart').onclick=()=>{togglePause();startGame()};
const toTitle=()=>{state='title';paused=false;$('hud').classList.remove('on');show('title')};
$('pQuit').onclick=toTitle;$('rTitle').onclick=toTitle;
const standalone=navigator.standalone||matchMedia('(display-mode: standalone),(display-mode: fullscreen)').matches;
if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!standalone&&!localStorage.getItem('puffpip.a2hs'))$('a2hs').style.display='block';
$('a2hsX').onclick=()=>{$('a2hs').style.display='none';localStorage.setItem('puffpip.a2hs','1')};
function tip(t,d){$('tip').textContent=t;$('tip').classList.add('on');tipT=d||3}
// ---------- physics ----------
const RMIN=13,RMAX=38;
function overlapAt(x,y,r){let best=null;const x0=Math.floor((x-r)/T),x1=Math.floor((x+r)/T),y0=Math.floor((y-r)/T),y1=Math.floor((y+r)/T);let n=0;
 for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){if(!isSol(cell(tx,ty)))continue;const cx=Math.max(tx*T,Math.min(x,tx*T+T)),cy=Math.max(ty*T,Math.min(y,ty*T+T));const dx=x-cx,dy=y-cy,d2=dx*dx+dy*dy;if(d2<r*r-0.01){n++;const d=Math.sqrt(d2)||0.0001;const pen=r-d;if(!best||pen>best.pen)best={pen,nx:d2?dx/d:0,ny:d2?dy/d:-1}}}
 return best}
function resolve(){P.ground=false;for(let k=0;k<6;k++){const o=overlapAt(P.x,P.y,P.r);if(!o)break;P.x+=o.nx*o.pen;P.y+=o.ny*o.pen;const vn=P.vx*o.nx+P.vy*o.ny;if(vn<0){if(vn<-260)sfx.bump(),P.sq=1-Math.min(0.3,-vn/1500);P.vx-=vn*o.nx*1.15;P.vy-=vn*o.ny*1.15}if(o.ny<-0.6)P.ground=true}}
function hazard(){const x0=Math.floor((P.x-P.r)/T),x1=Math.floor((P.x+P.r)/T),y0=Math.floor((P.y-P.r)/T),y1=Math.floor((P.y+P.r)/T);
 for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){if(cell(tx,ty)!=='^')continue;const m=9;const cx=Math.max(tx*T+m,Math.min(P.x,tx*T+T-m)),cy=Math.max(ty*T+m,Math.min(P.y,ty*T+T-m));if((P.x-cx)**2+(P.y-cy)**2<(P.r*0.85)**2)return true}return false}
function inVent(){const c=cell(Math.floor(P.x/T),Math.floor(P.y/T));return c==='v'}
function pop(){P.dead=1;run.pops++;S.stats.pops++;sfx.pop();if(S.shake)shake=10;for(let i=0;i<26;i++){const a=Math.random()*6.28,s=100+Math.random()*300;parts.push({x:P.x,y:P.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:0.8,c:i%2?'#ffd84a':'#fff6c0',r:4+Math.random()*5})}}
function update(dt){
 run.t+=dt;S.stats.time+=dt;if(tipT>0){tipT-=dt;if(tipT<=0)$('tip').classList.remove('on')}
 if(P.dead){P.dead+=dt;if(P.dead>1.1){reset(false);tip('Pop! Back to the flag',1.5)}return}
 const I=inp();
 const want=I.puff?1:0;if(I.puff&&!P.holding){run.puffs++;S.stats.puffs++;sfx.puff()}if(!I.puff&&P.holding&&P.p>0.3)sfx.deflate();P.holding=!!I.puff;
 const oldP=P.p,oldR=P.r;P.p+=want?Math.min(1-P.p,1.5*dt):-Math.min(P.p,2.6*dt);P.r=RMIN+(RMAX-RMIN)*P.p;
 // can't grow into walls: if blocked both sides, undo
 if(P.r>oldR){const sx=P.x,sy=P.y;resolve();const o=overlapAt(P.x,P.y,P.r);if(o&&o.pen>0.5){P.x=sx;P.y=sy;P.p=oldP;P.r=oldR}}
 const dir=(I.r?1:0)-(I.l?1:0);if(dir)P.face=dir;
 const max=330-170*P.p,a=P.ground?1800:900;
 if(dir)P.vx+=Math.max(-a*dt,Math.min(a*dt,dir*max-P.vx));else P.vx*=Math.pow(P.ground?0.0015:0.4,dt);
 let ay=1800*(0.42-P.p);const v=inVent();if(v)ay-=500+1700*P.p;
 P.vy+=ay*dt;const upCap=v?-560:-250;P.vy=Math.max(upCap,Math.min(720,P.vy));if(!v&&P.p>0.5)P.vy*=Math.pow(0.6,dt);
 const n=Math.ceil(Math.max(Math.abs(P.vx),Math.abs(P.vy))*dt/8)||1;
 for(let i=0;i<n;i++){P.x+=P.vx*dt/n;P.y+=P.vy*dt/n;resolve()}
 P.sq+=(1-P.sq)*Math.min(1,dt*10);
 if(hazard())return pop();
 for(const it of items){if(it.got)continue;if((it.x-P.x)**2+(it.y-P.y)**2<(P.r+14)**2){it.got=true;if(it.t==='b'){run.berries++;S.stats.berries++;sfx.berry();burst(it.x,it.y,'#7ab8ff',6)}else{run.stars.push(it.id);sfx.star();burst(it.x,it.y,'#ffd84a',16);tip('Star found! ★',2);const ss=S.stats.starSet||(S.stats.starSet=[]);if(!ss.includes(it.id))ss.push(it.id);save()}}}
 for(const c of checkpoints){if(!c.on&&P.x>c.x-10){c.on=true;sfx.flag();burst(c.x,c.y-40,'#5fd68a',14);tip('Checkpoint!',1.5)}}
 if(P.x>goalX&&!run.done)finish();
 if(P.y>H*T+100)pop();
 // contextual tips
 const tx=P.x/T;if(!run.tip1&&tx>33&&tx<36){run.tip1=1;tip('Too big? Let go of PUFF to shrink and squeeze through!',4)}
 if(!run.tip2&&tx>66&&tx<69){run.tip2=1;tip('Updrafts lift you far higher when you puff up',3.5)}
 if(!run.tip3&&tx>77&&tx<80&&P.y<9*T){run.tip3=1;tip('Thorns above! Tap PUFF to hover low',3.5)}
 if(!run.tip4&&tx>131&&tx<134){run.tip4=1;tip('Ride the updrafts across. Big = lift, small = drop',3.5)}
}
function burst(x,y,c,n){for(let i=0;i<n;i++){const a=Math.random()*6.28,s=60+Math.random()*180;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-60,l:0.6,c,r:3+Math.random()*3})}}
function finish(){run.done=true;sfx.win();burst(P.x,P.y-30,'#ffd84a',40);const st=S.stats;st.clears++;if(!st.best||run.t<st.best)st.best=run.t;st.bestBerries=Math.max(st.bestBerries,run.berries);save();
 setTimeout(()=>{if(state!=='play')return;state='results';const nb=items.filter(i=>i.t==='b').length;$('resGrid').innerHTML=[['Time',fmt(run.t)],['Berries',run.berries+' / '+nb],['Stars',run.stars.length+' / 3'],['Pops',run.pops],['Puffs',run.puffs],['Best time',fmt(st.best)]].map(r=>'<span>'+r[0]+'</span><b>'+r[1]+'</b>').join('');$('hud').classList.remove('on');openModal('results')},1400)}
// ---------- render ----------
let VW,VH,DPR,Z;
function resize(){DPR=Math.min(3,devicePixelRatio||1);VW=innerWidth;VH=innerHeight;cv.width=Math.round(VW*DPR);cv.height=Math.round(VH*DPR);Z=Math.max(0.55,Math.min(1.4,VH/480));}
addEventListener('resize',resize);resize();applyBright();
const clouds=[];for(let i=0;i<14;i++)clouds.push({x:Math.random()*3000,y:30+Math.random()*200,s:0.6+Math.random()*0.8,d:0.15+Math.random()*0.2});
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):ctx.rect(x,y,w,h)}
function drawBG(t){const g=ctx.createLinearGradient(0,0,0,VH);g.addColorStop(0,'#6cc8ff');g.addColorStop(0.6,'#bfeaff');g.addColorStop(1,'#fff3cf');ctx.fillStyle=g;ctx.fillRect(0,0,VW,VH);
 ctx.fillStyle='#fff7b0';ctx.beginPath();ctx.arc(VW*0.82,VH*0.18,44,0,7);ctx.fill();ctx.fillStyle='#fff7b055';ctx.beginPath();ctx.arc(VW*0.82,VH*0.18,70,0,7);ctx.fill();
 for(const c of clouds){const x=((c.x-camX*c.d+t*8*c.s)%(VW+400)+VW+400)%(VW+400)-200;ctx.fillStyle='#ffffffdd';const s=c.s*30;ctx.beginPath();ctx.arc(x,c.y,s,0,7);ctx.arc(x+s,c.y+5,s*0.8,0,7);ctx.arc(x-s,c.y+6,s*0.7,0,7);ctx.fill()}
 [[0.25,'#a8e6a0',VH*0.62,90],[0.45,'#7fd88a',VH*0.72,70]].forEach(([d,c,b,a])=>{ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(0,VH);for(let x=0;x<=VW+20;x+=20){const wx=x+camX*d;ctx.lineTo(x,b-Math.sin(wx/260)*a*0.5-Math.sin(wx/97)*a*0.2)}ctx.lineTo(VW,VH);ctx.fill()})}
function drawTiles(t){const x0=Math.max(0,Math.floor((camX-VW/2/Z)/T)-1),x1=Math.min(W-1,Math.ceil((camX+VW/2/Z)/T)+1),y0=Math.max(0,Math.floor((camY-VH/2/Z)/T)-1),y1=Math.min(H-1,Math.ceil((camY+VH/2/Z)/T)+1);
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const c=G[y][x],px=x*T,py=y*T;
  if(c==='#'){ctx.fillStyle=((x+y)&1)?'#f2c27e':'#eeb873';ctx.fillRect(px,py,T+0.5,T+0.5);ctx.fillStyle='#e3a865';if((x*7+y*3)%5===0){ctx.beginPath();ctx.arc(px+12,py+26,4,0,7);ctx.fill()}
   if(!isSol(cell(x,y-1))){ctx.fillStyle='#6fdc6f';rr(px-1,py-4,T+2,14,7);ctx.fill();ctx.fillStyle='#9cf09a';ctx.fillRect(px,py-2,T,4)}
   if(!isSol(cell(x,y+1))&&y<H-1){ctx.fillStyle='#d99a5a';ctx.fillRect(px,py+T-5,T,5)}}
  else if(c==='^'){const up=isSol(cell(x,y+1))||cell(x,y+1)==='#'||!isSol(cell(x,y-1));const dn=isSol(cell(x,y-1))&&!isSol(cell(x,y+1));ctx.fillStyle='#9a6be0';ctx.strokeStyle='#6f44b8';ctx.lineWidth=2;
   for(let k=0;k<3;k++){const bx=px+k*13+1;ctx.beginPath();if(dn){ctx.moveTo(bx,py);ctx.lineTo(bx+6.5,py+T-6);ctx.lineTo(bx+13,py)}else{ctx.moveTo(bx,py+T);ctx.lineTo(bx+6.5,py+6);ctx.lineTo(bx+13,py+T)}ctx.closePath();ctx.fill();ctx.stroke()}
   ctx.fillStyle='#c9a8ff';ctx.fillRect(px,dn?py:py+T-6,T,6)}
  else if(c==='v'){ctx.fillStyle='#ffffff22';ctx.fillRect(px,py,T,T);ctx.strokeStyle='#ffffffaa';ctx.lineWidth=3;ctx.lineCap='round';const o=((t*140+x*17)%T);ctx.beginPath();ctx.moveTo(px+10,py+T-o);ctx.lineTo(px+10,py+T-o-12);ctx.moveTo(px+28,py+(T-o+20)%T);ctx.lineTo(px+28,py+(T-o+20)%T-10);ctx.stroke()}}}
function star(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?r*0.45:r;ctx.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q)}ctx.fill()}
function drawItems(t){for(const it of items){if(it.got)continue;const b=Math.sin(t*3+it.id)*4;if(it.t==='b'){ctx.fillStyle='#3f86e8';ctx.beginPath();ctx.arc(it.x,it.y+b,10,0,7);ctx.fill();ctx.fillStyle='#8fc3ff';ctx.beginPath();ctx.arc(it.x-3,it.y+b-3,4,0,7);ctx.fill();ctx.fillStyle='#4fbf5a';ctx.beginPath();ctx.ellipse(it.x+2,it.y+b-10,5,2.5,0.5,0,7);ctx.fill()}
 else{ctx.fillStyle='#fff3a066';ctx.beginPath();ctx.arc(it.x,it.y+b,26+Math.sin(t*5)*3,0,7);ctx.fill();star(it.x,it.y+b,18,'#ffc928');star(it.x-2,it.y+b-2,9,'#fff1a0')}}
 for(const c of checkpoints){ctx.fillStyle='#8a6a4a';ctx.fillRect(c.x-3,c.y-70,6,90);ctx.fillStyle=c.on?'#5fd68a':'#ffffff';ctx.beginPath();ctx.moveTo(c.x+3,c.y-70);ctx.lineTo(c.x+40,c.y-58+Math.sin(t*4)*3);ctx.lineTo(c.x+3,c.y-46);ctx.fill()}
 const gx=goalX+20,gy=F*T;ctx.fillStyle='#4fbf5a';ctx.fillRect(gx-4,gy-120,8,120);ctx.save();ctx.translate(gx,gy-130);ctx.rotate(t*0.6);for(let i=0;i<12;i++){ctx.rotate(Math.PI/6);ctx.fillStyle='#ffd23a';ctx.beginPath();ctx.ellipse(0,-26,9,18,0,0,7);ctx.fill()}ctx.restore();ctx.fillStyle='#a8642a';ctx.beginPath();ctx.arc(gx,gy-130,16,0,7);ctx.fill()}
function drawPip(t){if(P.dead)return;const r=P.r,sq=P.sq*(P.ground?1:1)+(P.ground&&Math.abs(P.vx)>40&&P.p<0.3?Math.sin(t*22)*0.04:0);const sx=r*(2-sq),sy=r*sq;
 ctx.save();ctx.translate(P.x,P.y+(r-sy));
 ctx.fillStyle='#0000001a';ctx.beginPath();ctx.ellipse(0,sy-2,sx*0.8,4,0,0,7);ctx.fill();
 if(P.p<0.5){ctx.fillStyle='#f0a030';const fo=Math.sin(t*20)*(Math.abs(P.vx)>40&&P.ground?4:0);ctx.beginPath();ctx.ellipse(-r*0.45+fo,sy-1,6,4,0,0,7);ctx.ellipse(r*0.45-fo,sy-1,6,4,0,0,7);ctx.fill()}
 const g=ctx.createRadialGradient(-sx*0.35,-sy*0.4,r*0.1,0,0,Math.max(sx,sy));g.addColorStop(0,'#fffbe0');g.addColorStop(0.5,'#ffe066');g.addColorStop(1,'#ffb43c');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,sx,sy,0,0,7);ctx.fill();ctx.strokeStyle='#e8962a';ctx.lineWidth=2;ctx.stroke();
 if(P.p>0.15){ctx.strokeStyle='#ffffffaa';ctx.lineWidth=2;ctx.beginPath();ctx.arc(-sx*0.2,-sy*0.1,r*0.7,3.6,4.4);ctx.stroke()}
 ctx.fillStyle='#ffffffcc';ctx.beginPath();ctx.ellipse(-sx*0.38,-sy*0.45,sx*0.18,sy*0.12,-0.5,0,7);ctx.fill();
 const ex=P.face*r*0.18,es=Math.max(3.2,r*0.16);P.blink-=0.016;if(P.blink<-3)P.blink=0.12;const bl=P.blink>0;
 [-1,1].forEach(s=>{const x=ex+s*r*0.3,y=-r*0.12;ctx.fillStyle='#24406b';ctx.beginPath();if(bl)ctx.ellipse(x,y,es,1.5,0,0,7);else ctx.ellipse(x,y,es*0.8,es*1.1,0,0,7);ctx.fill();if(!bl){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x-es*0.25,y-es*0.4,es*0.35,0,7);ctx.fill()}});
 ctx.fillStyle='#ff9fbf99';[-1,1].forEach(s=>{ctx.beginPath();ctx.ellipse(ex+s*r*0.55,r*0.18,r*0.14,r*0.09,0,0,7);ctx.fill()});
 ctx.strokeStyle='#24406b';ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();if(P.holding){ctx.ellipse(ex,r*0.28,r*0.09,r*0.11,0,0,7)}else ctx.arc(ex,r*0.15,r*0.14,0.3,2.84);ctx.stroke();
 ctx.restore()}
function render(t){ctx.setTransform(DPR,0,0,DPR,0,0);drawBG(t);
 const sh=shake>0?(Math.random()-0.5)*shake:0;
 ctx.setTransform(DPR*Z,0,0,DPR*Z,DPR*(VW/2-camX*Z+sh),DPR*(VH/2-camY*Z+sh));
 drawTiles(t);drawItems(t);drawPip(t);
 for(const p of parts){ctx.globalAlpha=Math.max(0,p.l/0.8);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill()}ctx.globalAlpha=1}
function hud(){const nb=items.filter(i=>i.t==='b').length;$('hBerry').textContent='🫐 '+run.berries+'/'+nb;$('hStar').textContent='★'.repeat(run.stars.length)+'☆'.repeat(3-run.stars.length);$('hTime').textContent=fmt(run.t)}
let hudT=0;
function frame(now){requestAnimationFrame(frame);const t=now/1000;let dt=Math.min(0.05,(now-lastT)/1000||0);lastT=now;pollPad();musicTick();
 if(state==='play'||state==='results'){if(state==='play'&&!paused){acc+=dt*(window.PP_TURBO||1);while(acc>=1/120){update(1/120);acc-=1/120}}
  for(const p of parts){p.l-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=500*dt}parts=parts.filter(p=>p.l>0);shake*=Math.pow(0.02,dt);
  const lx=P.x+P.vx*0.25;camX+=(lx-camX)*Math.min(1,dt*4);camY+=(P.y-30-camY)*Math.min(1,dt*3.5);
  const hw=VW/2/Z,hh=VH/2/Z;camX=Math.max(hw,Math.min(W*T-hw,camX));camY=Math.max(hh,Math.min(H*T-hh,camY));
  render(t);if((hudT+=dt)>0.1){hudT=0;hud()}}
 else{camX+=dt*30;if(camX>(W-12)*T)camX=12*T;camY=(F-4)*T;if(!G)build();if(!P)reset(true),run.t=0;render(t)}}
build();reset(true);requestAnimationFrame(frame);
if('serviceWorker' in navigator&&!/nosw/.test(location.search))navigator.serviceWorker.register('sw.js');
window.PP={get P(){return P},get run(){return run},startGame,tp:(x,y)=>{P.x=x*T;P.y=y*T;P.vx=P.vy=0},K,openModal,renderStats,get state(){return state},items,finish};
})();
