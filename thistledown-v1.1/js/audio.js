// Thistledown - procedural audio (original). Piano/strings ambient + SFX.
(function(root){
'use strict';
var A={ctx:null,music:0.7,sfx:0.8,area:-1,on:false};
var ctx,mG,sG,rev,master,nextT=0,step=0,timer=null;
var SONGS=[
 {root:57,ch:[[0,4,7,11],[-3,0,4,7],[-7,-3,0,4],[-5,-1,2,7]],tempo:0.42},  // A-ish major, gentle
 {root:55,ch:[[0,3,7,10],[-4,0,3,7],[-9,-5,0,3],[-2,2,5,9]],tempo:0.46},   // watery minor-ish
 {root:60,ch:[[0,4,7,14],[5,9,12,16],[-3,0,4,9],[7,11,14,19]],tempo:0.38}, // airy
 {root:58,ch:[[0,4,7,11],[2,5,9,12],[-3,0,4,7],[5,9,12,16]],tempo:0.44},   // crystal
 {root:53,ch:[[0,4,7,12],[-3,0,4,9],[-7,-3,0,5],[-5,-1,2,7]],tempo:0.5}   // heartfelt
];
function mtof(m){return 440*Math.pow(2,(m-69)/12);}
function init(){
  if(ctx)return;var AC=root.AudioContext||root.webkitAudioContext;if(!AC)return;
  ctx=A.ctx=new AC();master=ctx.createGain();master.connect(ctx.destination);
  mG=ctx.createGain();sG=ctx.createGain();mG.gain.value=A.music*0.5;sG.gain.value=A.sfx*0.6;
  rev=ctx.createConvolver();var len=ctx.sampleRate*2.6,b=ctx.createBuffer(2,len,ctx.sampleRate);
  for(var c=0;c<2;c++){var d=b.getChannelData(c);for(var i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.4);}
  rev.buffer=b;var rg=ctx.createGain();rg.gain.value=0.55;rev.connect(rg);rg.connect(master);
  mG.connect(master);mG.connect(rev);sG.connect(master);var sr=ctx.createGain();sr.gain.value=0.25;sG.connect(sr);sr.connect(rev);
}
function piano(t,m,v,dur){
  var f=mtof(m),g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.008);g.gain.exponentialRampToValueAtTime(v*0.3,t+0.4);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  [[1,1],[2,0.35],[3,0.12],[4.02,0.05]].forEach(function(h){var o=ctx.createOscillator(),og=ctx.createGain();o.type='sine';o.frequency.value=f*h[0];og.gain.value=h[1];o.connect(og);og.connect(g);o.start(t);o.stop(t+dur+0.05);});
  var lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2600;g.connect(lp);lp.connect(mG);
}
function strings(t,ms,dur,v){
  var g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+dur*0.4);g.gain.linearRampToValueAtTime(0,t+dur);
  var lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;lp.Q.value=0.3;g.connect(lp);lp.connect(mG);
  ms.forEach(function(m){[-6,6].forEach(function(dt){var o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=mtof(m);o.detune.value=dt;var og=ctx.createGain();og.gain.value=0.12;o.connect(og);og.connect(g);o.start(t);o.stop(t+dur+0.1);});});
}
function sched(){
  if(!ctx||A.area<0)return;var S=SONGS[A.area%SONGS.length];
  while(nextT<ctx.currentTime+0.6){
    var bar=Math.floor(step/8),ch=S.ch[bar%4],pos=step%8,t=nextT;
    if(pos===0){strings(t,[S.root-12+ch[0],S.root+ch[1],S.root+ch[2]],S.tempo*8.4,0.18);piano(t,S.root-12+ch[0],0.22,3.5);}
    var pat=[0,2,1,3,2,1,3,2];var r=(step*7919+bar*13)%11;
    if(pos!==7||r>4){var n=S.root+12+ch[pat[pos]%ch.length]+(r===3&&pos===4?12:0);piano(t+(r%3)*0.012,n,0.11+(pos===0?0.05:0),2.4);}
    if(bar%4===3&&pos===6)piano(t,S.root+24+ch[3%ch.length],0.06,3);
    nextT+=S.tempo;step++;
  }
}
A.start=function(){init();if(!ctx)return;if(ctx.state==='suspended')ctx.resume();if(!timer){nextT=ctx.currentTime+0.1;timer=setInterval(sched,150);}A.on=true;};
A.setArea=function(i){if(A.area!==i){A.area=i;step=0;if(ctx)nextT=ctx.currentTime+0.3;}};
A.setVol=function(m,s){A.music=m;A.sfx=s;if(mG){mG.gain.value=m*0.5;sG.gain.value=s*0.6;}};
function tone(type,f0,f1,dur,v,delay){if(!ctx||A.sfx<=0)return;var t=ctx.currentTime+(delay||0),o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(sG);o.start(t);o.stop(t+dur+0.02);}
function noise(dur,f,v,q){if(!ctx||A.sfx<=0)return;var t=ctx.currentTime,len=Math.floor(ctx.sampleRate*dur),b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);for(var i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);var s=ctx.createBufferSource();s.buffer=b;var bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=f;bp.Q.value=q||1;var g=ctx.createGain();g.gain.value=v;s.connect(bp);bp.connect(g);g.connect(sG);s.start(t);}
var last={};
A.sfx_=function(n,a){
  if(!ctx)return;var now=ctx.currentTime;if(last[n]&&now-last[n]<0.05)return;last[n]=now;
  switch(n){
   case 'jump':tone('sine',420,760,0.14,0.18);break;
   case 'djump':tone('sine',600,1100,0.18,0.16);tone('triangle',900,1500,0.12,0.06);break;
   case 'walljump':tone('triangle',380,700,0.12,0.14);noise(0.06,2000,0.1);break;
   case 'land':noise(0.08,500,0.12);break;
   case 'dash':noise(0.22,1400,0.3,0.7);tone('sine',300,900,0.15,0.08);break;
   case 'orb':var m=[84,88,91,96][Math.floor(Math.random()*4)];tone('sine',mtof(m),mtof(m),0.5,0.14);tone('sine',mtof(m+12),mtof(m+12),0.3,0.05);break;
   case 'hcell':case 'ecell':case 'ability':[72,76,79,84,88].forEach(function(m,i){tone('sine',mtof(m),mtof(m),0.9,0.13,i*0.09);});break;
   case 'shrine':[67,71,74,79].forEach(function(m,i){tone('triangle',mtof(m),mtof(m),1.2,0.08,i*0.12);});break;
   case 'hurt':tone('triangle',500,180,0.3,0.2);break;
   case 'die':tone('sine',600,120,0.9,0.2);break;
   case 'aim':tone('sine',200,320,0.4,0.1);break;
   case 'bash':tone('sawtooth',180,900,0.22,0.12);noise(0.2,2600,0.2);break;
   case 'grap':tone('square',900,1400,0.08,0.05);noise(0.15,3000,0.1);break;
   case 'splash':noise(0.35,900,0.25,0.6);break;
   case 'bramble':noise(0.25,700,0.3,0.5);break;
   case 'crack':noise(0.12,1800,0.12);break;
   case 'collapse':noise(0.3,400,0.2);break;
   case 'door':tone('sine',90,60,1.0,0.25);noise(0.8,300,0.15);break;
   case 'mirror':tone('triangle',1200,1600,0.15,0.08);break;
   case 'lever':tone('sine',140,80,0.6,0.2);noise(1.2,500,0.12);break;
   case 'spit':tone('sine',300,500,0.1,0.08);break;
   case 'pop':tone('sine',800,300,0.1,0.06);break;
   case 'enemyDie':tone('triangle',700,1400,0.25,0.1);break;
   case 'flare':tone('sine',300,1200,0.4,0.15);noise(0.4,4000,0.1);break;
   case 'chase':tone('sawtooth',110,80,1.2,0.12);break;
   case 'chaseDone':[72,79,84].forEach(function(m,i){tone('sine',mtof(m),mtof(m),1,0.12,i*0.1);});break;
   case 'bossHit':tone('sine',500,250,0.6,0.2);[79,83].forEach(function(m,i){tone('sine',mtof(m),mtof(m),0.8,0.1,0.2+i*0.1);});break;
   case 'bossDone':[60,64,67,72,76,79,84].forEach(function(m,i){tone('sine',mtof(m),mtof(m),2,0.12,i*0.15);});break;
  }
};
root.TD_AUDIO=A;
})(window);
