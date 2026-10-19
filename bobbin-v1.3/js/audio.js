/* Bobbin's Button Box - WebAudio music + sfx (all generated) */
var SND=(function(){
  var ctx=null,master,musicG,sfxG,noiseBuf,started=false;
  var vol={music:0.6,sfx:0.8};
  var bufCache={};
  function mtof(m){return 440*Math.pow(2,(m-69)/12)}
  function init(){
    if(ctx)return;
    var AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
    try{ctx=new AC();}catch(e){ctx=null;return}
    master=ctx.createGain();master.gain.value=0.9;master.connect(ctx.destination);
    var comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=3;comp.connect(master);
    musicG=ctx.createGain();musicG.connect(comp);
    sfxG=ctx.createGain();sfxG.connect(comp);
    applyVol();
    var sr=ctx.sampleRate,n=sr*1;noiseBuf=ctx.createBuffer(1,n,sr);var d=noiseBuf.getChannelData(0);for(var i=0;i<n;i++)d[i]=Math.random()*2-1;
  }
  function unlock(){init();if(!ctx)return;if(ctx.state!=='running'){ctx.resume&&ctx.resume()}
    if(!started){started=true;try{var b=ctx.createBuffer(1,1,22050),s=ctx.createBufferSource();s.buffer=b;s.connect(ctx.destination);s.start(0)}catch(e){}}}
  function applyVol(){if(!ctx)return;var t=ctx.currentTime;
    musicG.gain.cancelScheduledValues(t);musicG.gain.setTargetAtTime(vol.music<=0.001?0:vol.music*vol.music*0.55,t,0.05);
    sfxG.gain.cancelScheduledValues(t);sfxG.gain.setTargetAtTime(vol.sfx<=0.001?0:vol.sfx*vol.sfx*0.9,t,0.03);
    if(vol.music<=0.001)musicG.gain.setValueAtTime(0,t+0.3);if(vol.sfx<=0.001)sfxG.gain.setValueAtTime(0,t+0.2);}
  function setVol(k,v){vol[k]=v;applyVol();}
  /* ---- pre-rendered instrument buffers ---- */
  function pluck(m){var key='p'+m;if(bufCache[key])return bufCache[key];
    var sr=ctx.sampleRate,f=mtof(m),dur=1.1,n=Math.floor(sr*dur),b=ctx.createBuffer(1,n,sr),d=b.getChannelData(0);
    var N=Math.max(2,Math.round(sr/f)),ring=new Float32Array(N),i,last=0;
    for(i=0;i<N;i++){var r=Math.random()*2-1;last=last*0.5+r*0.5;ring[i]=last}
    var idx=0,decay=0.9965;
    for(i=0;i<n;i++){var a=ring[idx],nx=ring[(idx+1)%N];var v=(a+nx)*0.5*decay;ring[idx]=v;idx=(idx+1)%N;
      var env=i<60?i/60:1;if(i>n-3000)env*=(n-i)/3000;d[i]=a*env*0.8}
    bufCache[key]=b;return b}
  function marimba(m){var key='m'+m;if(bufCache[key])return bufCache[key];
    var sr=ctx.sampleRate,f=mtof(m),dur=0.9,n=Math.floor(sr*dur),b=ctx.createBuffer(1,n,sr),d=b.getChannelData(0);
    for(var i=0;i<n;i++){var t=i/sr;var a=Math.min(1,t/0.003);
      d[i]=a*(Math.sin(2*Math.PI*f*t)*Math.exp(-t*5.5)+0.35*Math.sin(2*Math.PI*f*3.93*t)*Math.exp(-t*22)+0.12*Math.sin(2*Math.PI*f*9.2*t)*Math.exp(-t*60))*0.55}
    bufCache[key]=b;return b}
  function playBuf(b,t,g,dest,rate){var s=ctx.createBufferSource();s.buffer=b;if(rate)s.playbackRate.value=rate;var gg=ctx.createGain();gg.gain.value=g;s.connect(gg);gg.connect(dest);s.start(t);return s}
  /* ---- music ---- */
  var BPM=104,TR=0,eighth=60/BPM/2,nextT=0,step=0,timer=null,playing=false;
  // F major: F C Dm Bb | F C Bb C   (chord tones as midi)
  var CH=[[53,57,60,65],[48,55,60,64],[50,57,62,65],[46,53,58,62],[53,57,60,65],[48,55,60,64],[46,53,58,62],[48,55,60,67]];
  var BASS=[41,36,38,34,41,36,34,36];
  // melody per bar: [eighth, midi] (pentatonic F G A C D)
  var MEL=[
    [[0,77],[2,74],[3,72],[4,74],[6,77]],
    [[0,79],[3,76],[4,74],[6,72]],
    [[0,74],[2,77],[3,74],[4,72],[6,69]],
    [[0,70],[2,72],[4,74],[5,72],[6,70]],
    [[0,77],[1,79],[2,81],[4,79],[6,77]],
    [[0,76],[2,79],[4,84],[6,81]],
    [[0,82],[2,81],[3,79],[4,77],[6,74]],
    [[0,76],[2,79],[4,77]]];
  var STRUM=[1,0,1,1,0,1,1,1]; var DOWN=[1,0,1,0,0,0,1,0];
  function schedule(){
    if(!ctx||vol.music<=0.001){nextT=ctx?ctx.currentTime+0.05:0;return}
    while(nextT<ctx.currentTime+0.15){
      var bar=Math.floor(step/8)%8,e=step%8,phrase=Math.floor(step/64)%4,t=nextT;
      var sw=(e%2)?eighth*0.12:0; t+=sw;
      if(STRUM[e]){var ch=CH[bar],down=DOWN[e]||e===0;var g=(e===0?0.32:0.2);
        for(var k=0;k<ch.length;k++){var ii=down?k:ch.length-1-k;playBuf(pluck(ch[ii]+12+TR),t+k*0.012,g*(down?1:0.75),musicG)}}
      if(e===0||e===4)playBuf(pluck(BASS[bar]+12+TR),t,0.42,musicG,0.5);
      if(phrase!==0||bar>=4){var mel=MEL[bar];for(var j=0;j<mel.length;j++)if(mel[j][0]===e){playBuf(marimba(mel[j][1]+TR),t,phrase===3?0.22:0.3,musicG)}}
      if(phrase>=1&&(e%2===1)){var s=ctx.createBufferSource();s.buffer=noiseBuf;var hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=6500;
        var g2=ctx.createGain();g2.gain.setValueAtTime(0.0001,t);g2.gain.exponentialRampToValueAtTime(0.06,t+0.005);g2.gain.exponentialRampToValueAtTime(0.0001,t+0.06);
        s.connect(hp);hp.connect(g2);g2.connect(musicG);s.start(t,Math.random()*0.5,0.08)}
      if(e===0&&bar===0&&phrase===2){[84,88,91,96].forEach(function(m,i){playBuf(marimba(m+TR),t+i*0.08,0.12,musicG)})}
      nextT+=eighth;step++}
  }
  function startMusic(){init();if(!ctx||playing)return;playing=true;nextT=ctx.currentTime+0.1;step=0;timer=setInterval(schedule,40)}
  function setWorld(k){var T=[0,2,-3,5,-2,4],B=[104,100,112,96,100,118];k=k%T.length;TR=T[k];BPM=B[k];eighth=60/BPM/2}
  function stopMusic(){playing=false;if(timer)clearInterval(timer);timer=null}
  /* ---- sfx ---- */
  function env(g,t,a,peak,d){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+d)}
  function tone(type,f0,f1,dur,peak,t,dest){var o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);
    if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);env(g,t,0.006,peak,dur);o.connect(g);g.connect(dest||sfxG);o.start(t);o.stop(t+dur+0.05);return o}
  function noise(fType,f0,f1,q,dur,peak,t){var s=ctx.createBufferSource();s.buffer=noiseBuf;var fl=ctx.createBiquadFilter();fl.type=fType;fl.frequency.setValueAtTime(f0,t);
    if(f1)fl.frequency.exponentialRampToValueAtTime(f1,t+dur);fl.Q.value=q||1;var g=ctx.createGain();env(g,t,0.01,peak,dur);s.connect(fl);fl.connect(g);g.connect(sfxG);s.start(t,Math.random()*0.4,dur+0.1)}
  var last={};
  function sfx(name,p){
    if(!ctx||vol.sfx<=0.001)return; if(ctx.state!=='running')return;
    var t=ctx.currentTime+0.005; var now=performance.now(); if(last[name]&&now-last[name]<40)return; last[name]=now; p=p||0;
    switch(name){
      case 'jump':tone('sine',330,660,0.13,0.22,t);tone('triangle',660,990,0.08,0.06,t);break;
      case 'land':noise('lowpass',500,200,0.7,0.09,0.12+Math.min(0.25,p*0.03),t);break;
      case 'boing':{var o=ctx.createOscillator(),g=ctx.createGain(),l=ctx.createOscillator(),lg=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(160,t);
        o.frequency.exponentialRampToValueAtTime(520,t+0.12);o.frequency.exponentialRampToValueAtTime(300,t+0.45);l.frequency.value=17;lg.gain.value=45;l.connect(lg);lg.connect(o.frequency);
        env(g,t,0.008,0.32,0.5);o.connect(g);g.connect(sfxG);o.start(t);l.start(t);o.stop(t+0.6);l.stop(t+0.6);break}
      case 'pop':tone('sine',900+p*60,1700+p*80,0.07,0.22,t);noise('highpass',3000,0,0.5,0.04,0.06,t);playBuf(marimba(84+[0,2,4,7,9][Math.floor(Math.random()*5)]),t+0.03,0.25,sfxG);break;
      case 'grab':noise('bandpass',380,220,1.2,0.1,0.22,t);tone('sine',210,150,0.09,0.16,t);break;
      case 'release':noise('bandpass',600,900,1.2,0.07,0.08,t);break;
      case 'click':tone('square',1400,900,0.025,0.07,t);tone('triangle',700,500,0.05,0.12,t+0.01);break;
      case 'switch':[72,76,79,84].forEach(function(m,i){playBuf(marimba(m),t+i*0.06,0.32,sfxG)});noise('highpass',5000,0,0.5,0.25,0.05,t);break;
      case 'unswitch':playBuf(marimba(72),t,0.2,sfxG);playBuf(marimba(67),t+0.07,0.18,sfxG);break;
      case 'door':noise('bandpass',220,700,2,0.55,0.12,t);break;
      case 'check':playBuf(marimba(79),t,0.35,sfxG);playBuf(marimba(84),t+0.1,0.35,sfxG);playBuf(pluck(72),t+0.1,0.25,sfxG);break;
      case 'respawn':noise('bandpass',1500,300,1,0.35,0.12,t);playBuf(pluck(67),t+0.15,0.3,sfxG);playBuf(pluck(72),t+0.25,0.3,sfxG);break;
      case 'launch':noise('bandpass',300,2400,1.5,0.4,0.16,t);tone('sine',200,700,0.3,0.12,t);break;
      case 'finish':[65,69,72,77,81,84].forEach(function(m,i){playBuf(marimba(m+7),t+i*0.09,0.32,sfxG)});[53,57,60,65].forEach(function(m,i){playBuf(pluck(m+12),t+0.55+i*0.015,0.3,sfxG)});break;
      case 'tap':playBuf(marimba(84),t,0.18,sfxG);break;
      case 'step':noise('lowpass',300,0,0.6,0.04,0.035,t);break;
      case 'tick':tone('square',2200,1800,0.02,0.05,t);tone('sine',1100,0,0.04,0.06,t);break;
      case 'tock':tone('square',1500,1200,0.02,0.05,t);tone('sine',750,0,0.05,0.07,t);break;
      case 'zip':noise('bandpass',900,2600,3,0.35,0.07,t);tone('triangle',300,520,0.3,0.05,t);break;
      case 'jelly':{var o2=ctx.createOscillator(),g3=ctx.createGain();o2.type='sine';o2.frequency.setValueAtTime(120,t);o2.frequency.exponentialRampToValueAtTime(380+p*10,t+0.1);o2.frequency.exponentialRampToValueAtTime(180,t+0.35);env(g3,t,0.01,0.3,0.35);o2.connect(g3);g3.connect(sfxG);o2.start(t);o2.stop(t+0.45);noise('lowpass',700,200,2,0.2,0.08,t);break}
      case 'splash':noise('bandpass',1800,600,1.5,0.18,0.06+Math.min(0.06,p*0.01),t);break;
      case 'whir':tone('sawtooth',90,140,0.25,0.03,t);noise('bandpass',700,900,4,0.2,0.04,t);break;
      case 'toggle':tone('square',900,600,0.03,0.08,t);playBuf(marimba(p?79:72),t+0.02,0.25,sfxG);break;
      case 'wind':noise('bandpass',500,1200,0.8,0.6,0.08,t);break;
      case 'magnet':tone('sine',220,440,0.25,0.1,t);tone('sine',223,446,0.25,0.08,t);break;
      case 'train':playBuf(marimba(76),t,0.25,sfxG);playBuf(marimba(72),t+0.18,0.25,sfxG);break;
      case 'full':[72,76,79].forEach(function(m,i){playBuf(marimba(m+12),t+i*0.07,0.28,sfxG)});break;
      case 'squish':{var o5=ctx.createOscillator(),g5=ctx.createGain();o5.type='sine';o5.frequency.setValueAtTime(420,t);o5.frequency.exponentialRampToValueAtTime(70,t+0.22);env(g5,t,0.005,0.35,0.26);o5.connect(g5);g5.connect(sfxG);o5.start(t);o5.stop(t+0.3);noise('lowpass',900,150,1.2,0.22,0.2,t);noise('bandpass',2400,800,2,0.1,0.06,t+0.02);break}
      case 'lifeLost':playBuf(marimba(76),t,0.3,sfxG);playBuf(marimba(71),t+0.11,0.28,sfxG);playBuf(marimba(67),t+0.22,0.3,sfxG);tone('sine',800,1500,0.06,0.12,t);break;
      case 'outLives':[72,67,64,60].forEach(function(m,i){playBuf(marimba(m),t+i*0.16,0.3,sfxG)});playBuf(pluck(48),t+0.64,0.3,sfxG);break;
      case 'thud':noise('lowpass',260,120,0.7,0.12,0.12+Math.min(0.2,p*0.02),t);break;
    }
  }
  document.addEventListener('visibilitychange',function(){if(!ctx)return;if(document.hidden){ctx.suspend&&ctx.suspend()}else{ctx.resume&&ctx.resume()}});
  return {init:init,unlock:unlock,setVol:setVol,vol:vol,startMusic:startMusic,stopMusic:stopMusic,setWorld:setWorld,sfx:sfx,ctx:function(){return ctx},musicGain:function(){return musicG?musicG.gain.value:-1}};
})();
