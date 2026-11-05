<script>
'use strict';
// ===== Sunleaf v1.1 — single-file canvas platformer =====
const GAME_VERSION='1.1';
const VERSIONS=[
  {v:'1.1',url:'../sunleaf/',note:'Brighter woodland, softer light, better feel'},
  {v:'1.0',url:'../sunleaf-v1.0/',note:'First release'}
];
// Each flag is independent. All off restores the v1.0 look, camera and feel.
const FEAT_DEF={layers:1,warm:1,atmo:1,flora:1,materials:1,hero:1,cam:1,move:1,land:1,vine:1,collect:1,ui:1};
const FEAT_META=[['layers','Layered foliage'],['warm','Warm bright colour'],['atmo','Soft light & light fog'],['flora','Animated plants'],['materials','Richer materials'],['hero','Crisp hero'],['cam','Camera feel'],['move','Movement feel'],['land','Landing feedback'],['vine','Vine feedback'],['collect','Collect feedback'],['ui','Screen polish']];
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, rnd=(a,b)=>a+Math.random()*(b-a);
const QS=new URLSearchParams(location.search);

// ---------- save ----------
const SAVE_KEY='sunleaf-save-1';
const DEF={music:60,sfx:80,bright:100,fx:'auto',shake:true,touchsz:1,unlocked:1,best:{},hi:[],
  st:{plays:0,motes:0,jumps:0,dashes:0,plants:0,bounced:0,stones:0,clears:0,time:0,falls:0,bestCombo:0,endlessRuns:0,distance:0}};
let S;
try{S=Object.assign({},DEF,JSON.parse(localStorage.getItem(SAVE_KEY)||'{}'));S.st=Object.assign({},DEF.st,S.st||{});}catch(e){S=JSON.parse(JSON.stringify(DEF));}
S.feat=S.feat||{};
const FEAT={};
for(const k in FEAT_DEF){const v=S.feat[k];S.feat[k]=(v===0||v===false)?0:1;FEAT[k]=S.feat[k];}
if(QS.has('classic')||QS.get('polish')==='0'){for(const k in FEAT)FEAT[k]=0;}
for(const k of (QS.get('off')||'').split(','))if(k in FEAT)FEAT[k]=0;
for(const k of (QS.get('on')||'').split(','))if(k in FEAT)FEAT[k]=1;
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(S));}catch(e){}}

// ---------- audio ----------
const AU={ctx:null,m:null,s:null,mus:null,next:0,step:0,on:false};
function audioInit(){
  if(AU.ctx){if(AU.ctx.state!=='running')AU.ctx.resume();return;}
  const C=window.AudioContext||window.webkitAudioContext; if(!C)return;
  AU.ctx=new C(); AU.m=AU.ctx.createGain(); AU.s=AU.ctx.createGain();
  AU.m.connect(AU.ctx.destination); AU.s.connect(AU.ctx.destination); setVol();
}
function setVol(){if(!AU.ctx)return;AU.m.gain.value=Math.pow(S.music/100,1.5)*0.5;AU.s.gain.value=Math.pow(S.sfx/100,1.3)*0.7;}
function tone(f,dur,type,vol,slide,when,dest){
  if(!AU.ctx)return; const c=AU.ctx,t=when||c.currentTime;
  const o=c.createOscillator(),g=c.createGain(); o.type=type||'sine'; o.frequency.setValueAtTime(f,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,slide),t+dur);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol||0.2,t+0.012); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(dest||AU.s); o.start(t); o.stop(t+dur+0.05);
}
function noise(dur,vol,freq,when){
  if(!AU.ctx)return; const c=AU.ctx,t=when||c.currentTime;
  if(!AU.nb){const b=c.createBuffer(1,c.sampleRate*0.5,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;AU.nb=b;}
  const s=c.createBufferSource(); s.buffer=AU.nb; const f=c.createBiquadFilter(); f.type='bandpass'; f.frequency.value=freq||1200; f.Q.value=0.8;
  const g=c.createGain(); g.gain.setValueAtTime(vol||0.2,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(f); f.connect(g); g.connect(AU.s); s.start(t); s.stop(t+dur+0.05);
}
const PENTA=[0,2,4,7,9];
const SFX={
  jump(){tone(420,0.14,'triangle',0.16,760);},
  djump(){tone(520,0.16,'triangle',0.15,980);},
  land(v){noise(0.08,0.06+v*0.08,500);},
  dash(){noise(0.18,0.16,2200);tone(300,0.16,'sawtooth',0.04,900);},
  mote(n){const k=PENTA[n%5]+12*Math.floor((n%10)/5);tone(880*Math.pow(2,k/12),0.16,'sine',0.13);tone(1760*Math.pow(2,k/12),0.08,'sine',0.04);},
  stone(){[0,4,7,12,16].forEach((k,i)=>tone(660*Math.pow(2,k/12),0.4,'triangle',0.12,null,AU.ctx&&AU.ctx.currentTime+i*0.07));},
  grow(){tone(200,0.3,'sine',0.14,600);noise(0.25,0.05,3000);},
  vine(){tone(160,0.4,'triangle',0.13,520);},
  boing(){tone(220,0.3,'sine',0.2,880);},
  stomp(){tone(600,0.1,'square',0.07,200);tone(900,0.15,'triangle',0.1,1400);},
  hurt(){tone(500,0.25,'triangle',0.15,180);},
  power(){[0,7,12,19].forEach((k,i)=>tone(523*Math.pow(2,k/12),0.25,'sine',0.12,null,AU.ctx&&AU.ctx.currentTime+i*0.06));},
  check(){tone(660,0.15,'triangle',0.12);tone(990,0.3,'triangle',0.1,null,AU.ctx&&AU.ctx.currentTime+0.1);},
  win(){[0,4,7,12,7,12,16,19].forEach((k,i)=>tone(523*Math.pow(2,k/12),0.35,'triangle',0.12,null,AU.ctx&&AU.ctx.currentTime+i*0.1));},
  click(){tone(700,0.06,'sine',0.1);},
  fail(){tone(400,0.5,'triangle',0.12,150);},
  combo(n){tone(700+n*40,0.12,'square',0.05,900+n*60);}
};
function sfx(n,a){if(AU.ctx&&S.sfx>0)try{SFX[n](a);}catch(e){}}
// light generative music: pentatonic melody, soft bass + pad, 4-bar loop with variations
const SONGS={
  meadow:{root:60,bpm:104,prog:[0,5,3,4]},bramble:{root:57,bpm:98,prog:[0,3,5,4]},
  canopy:{root:62,bpm:110,prog:[0,4,5,3]},sky:{root:64,bpm:118,prog:[0,5,4,3]},title:{root:60,bpm:92,prog:[0,3,4,0]}
};
let song=SONGS.title;
function musicTick(){
  if(!AU.ctx||!AU.on)return; const c=AU.ctx; const sp=60/song.bpm/2;
  if(AU.next<c.currentTime-0.5)AU.next=c.currentTime+0.05;
  while(AU.next<c.currentTime+0.25){
    const st=AU.step,bar=Math.floor(st/8)%4,b8=st%8,t=AU.next,chord=song.prog[bar];
    const deg=[0,2,4,5,7,9,11],sc=k=>song.root+deg[((k%7)+7)%7]+12*Math.floor(k/7);
    const mf=n=>440*Math.pow(2,(n-69)/12);
    if(b8===0||b8===4)tone(mf(sc(chord)-24),sp*3.5,'triangle',0.13,null,t,AU.m);
    if(b8===0){[0,2,4].forEach(k=>tone(mf(sc(chord+k)),sp*7.5,'sine',0.035,null,t,AU.m));}
    const seed=(st*7919+bar*31)%17;
    if(seed%3!==0||b8===0){const k=chord+[0,2,4,7,4,2,1,0][(st+Math.floor(st/32))%8]+(seed%5===0?2:0);tone(mf(sc(k)+12),sp*1.6,'triangle',0.055,null,t,AU.m);}
    if(b8%2===1)noise(0.04,0.025,7000,t);
    AU.step++; AU.next+=sp;
  }
}
function setSong(n){song=SONGS[n]||SONGS.title;AU.on=true;}

// ---------- input ----------
const K={};
const IN={x:0,y:0,jump:false,jumpP:false,dashP:false,growP:false,pauseP:false,jumpHeld:false};
let touchOn=false;
const KEYMAP={ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r',ArrowUp:'u',KeyW:'u',ArrowDown:'d',KeyS:'d',Space:'j',KeyZ:'j',KeyJ:'j',KeyX:'s',ShiftLeft:'s',ShiftRight:'s',KeyK:'s',KeyC:'g',KeyL:'g',KeyE:'g',Escape:'p',KeyP:'p',KeyR:'rs',Enter:'ent'};
const pressQ={};
addEventListener('keydown',e=>{const m=KEYMAP[e.code];if(!m)return;if(!K[m])pressQ[m]=1;K[m]=1;audioInit();if(touchOn&&!QS.has('touch'))setTouch(false);
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();menuKey(m,e);});
addEventListener('keyup',e=>{const m=KEYMAP[e.code];if(m)K[m]=0;});
// touch controls
const TS={stick:null,sx:0,sy:0,ax:0,ay:0,jump:false,dash:false,grow:false};
function setTouch(on){touchOn=on;$('touch').classList.toggle('on',on&&G.mode!=='menu');}
(function(){
  const st=$('stick'),kn=$('knob');
  function stickPos(t){const r=st.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=t.clientX-cx,dy=t.clientY-cy;const R=r.width*0.42,d=Math.hypot(dx,dy);if(d>R){dx*=R/d;dy*=R/d;}
    TS.ax=dx/R;TS.ay=dy/R;kn.style.transform=`translate(${dx}px,${dy}px)`;}
  const tz=$('touch');
  tz.addEventListener('touchstart',e=>{e.preventDefault();audioInit();for(const t of e.changedTouches){const el=document.elementFromPoint(t.clientX,t.clientY);
    if(el&&el.id==='tJump'){TS.jump=t.identifier;pressQ.j=1;K.j=1;el.classList.add('on');}
    else if(el&&el.id==='tDash'){pressQ.s=1;el.classList.add('on');TS.dash=t.identifier;}
    else if(el&&el.id==='tGrow'){pressQ.g=1;el.classList.add('on');TS.grow=t.identifier;}
    else if(t.clientX<innerWidth*0.5&&TS.stick===null){TS.stick=t.identifier;stickPos(t);}}},{passive:false});
  tz.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches)if(t.identifier===TS.stick)stickPos(t);},{passive:false});
  const end=e=>{for(const t of e.changedTouches){if(t.identifier===TS.stick){TS.stick=null;TS.ax=TS.ay=0;kn.style.transform='';}
    if(t.identifier===TS.jump){TS.jump=false;K.j=0;$('tJump').classList.remove('on');}
    if(t.identifier===TS.dash){TS.dash=false;$('tDash').classList.remove('on');}
    if(t.identifier===TS.grow){TS.grow=false;$('tGrow').classList.remove('on');}}};
  tz.addEventListener('touchend',end);tz.addEventListener('touchcancel',end);
  addEventListener('touchstart',()=>{if(!touchOn)setTouch(true);audioInit();},{passive:true});
})();
// gamepad
const GP={prev:{},ax:0,ay:0,held:{}};
function pollPad(){
  const ps=navigator.getGamepads?navigator.getGamepads():[];let p=null;for(const q of ps)if(q&&q.connected){p=q;break;}
  GP.ax=GP.ay=0; if(!p)return;
  const b=i=>!!(p.buttons[i]&&p.buttons[i].pressed);
  let ax=p.axes[0]||0,ay=p.axes[1]||0; if(Math.abs(ax)<0.25)ax=0; if(Math.abs(ay)<0.25)ay=0;
  if(b(14))ax=-1;if(b(15))ax=1;if(b(12))ay=-1;if(b(13))ay=1; GP.ax=ax;GP.ay=ay;
  const map={j:b(0),s:b(2)||b(1)||b(7),g:b(3)||b(5)||b(4),p:b(9)};
  for(const k in map){if(map[k]&&!GP.prev[k]){pressQ[k]=1;audioInit();if(touchOn)setTouch(false);menuKey(k,null);}GP.held[k]=map[k];}
  // menu nav from stick
  const nav=ax<-0.5?'l':ax>0.5?'r':ay<-0.5?'u':ay>0.5?'d':null;
  if(nav&&nav!==GP.prev.nav)menuKey(nav,null); GP.prev=Object.assign({},map,{nav});
}
function readInput(){
  pollPad();
  let x=(K.r?1:0)-(K.l?1:0),y=(K.d?1:0)-(K.u?1:0);
  if(TS.stick!==null){x=Math.abs(TS.ax)>0.28?Math.sign(TS.ax)*Math.min(1,Math.abs(TS.ax)*1.35):0;y=Math.abs(TS.ay)>0.45?Math.sign(TS.ay):0;}
  if(GP.ax||GP.ay){x=GP.ax;y=Math.abs(GP.ay)>0.5?Math.sign(GP.ay):0;}
  IN.x=clamp(x,-1,1);IN.y=y;IN.jumpHeld=!!(K.j||GP.held.j);
  IN.jumpP=!!pressQ.j;IN.dashP=!!pressQ.s;IN.growP=!!pressQ.g;IN.pauseP=!!pressQ.p;IN.rsP=!!pressQ.rs;
  for(const k in pressQ)delete pressQ[k];
}
