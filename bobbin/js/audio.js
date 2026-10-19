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
    ctx.onstatechange=function(){if(ctx.state!=='running'&&!document.hidden)setTimeout(tryResume,250)};
    var sr=ctx.sampleRate,n=sr*1;noiseBuf=ctx.createBuffer(1,n,sr);var d=noiseBuf.getChannelData(0);for(var i=0;i<n;i++)d[i]=Math.random()*2-1;
  }
  function unlock(){init();if(!ctx)return;if(ctx.state!=='running'){ctx.resume&&ctx.resume()}
    if(!started){started=true;try{var b=ctx.createBuffer(1,1,22050),s=ctx.createBufferSource();s.buffer=b;s.connect(ctx.destination);s.start(0)}catch(e){}}if(!playing)startMusic()}
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
  /* ---- more instruments (v1.4) ---- */
  function synth(key,dur,fn){if(bufCache[key])return bufCache[key];var sr=ctx.sampleRate,n=Math.floor(sr*dur),b=ctx.createBuffer(1,n,sr),d=b.getChannelData(0);
    for(var i=0;i<n;i++){var t=i/sr;d[i]=fn(t,i,n)*Math.min(1,i/90)*(i>n-600?(n-i)/600:1)}bufCache[key]=b;return b}
  var TAU=2*Math.PI;
  function glock(m){var f=mtof(m);return synth('g'+m,1.2,function(t){return (Math.sin(TAU*f*t)*Math.exp(-t*3.2)+0.45*Math.sin(TAU*f*2.76*t)*Math.exp(-t*9)+0.2*Math.sin(TAU*f*5.4*t)*Math.exp(-t*20))*0.42})}
  function musicbox(m){var f=mtof(m);return synth('x'+m,0.9,function(t){return (Math.sin(TAU*f*t)*Math.exp(-t*4.5)+0.3*Math.sin(TAU*f*3.01*t)*Math.exp(-t*12)+0.12*Math.sin(TAU*f*6.2*t)*Math.exp(-t*30))*0.4})}
  function harp(m){var key='h'+m;if(bufCache[key])return bufCache[key];var sr=ctx.sampleRate,f=mtof(m),n=Math.floor(sr*1.6),b=ctx.createBuffer(1,n,sr),d=b.getChannelData(0);
    var N=Math.max(2,Math.round(sr/f)),ring=new Float32Array(N),i,last=0;for(i=0;i<N;i++){var r=Math.random()*2-1;last=last*0.8+r*0.2;ring[i]=last*2.2}
    var idx=0;for(i=0;i<n;i++){var a2=ring[idx],nx=ring[(idx+1)%N];ring[idx]=(a2+nx)*0.5*0.9985;idx=(idx+1)%N;var e=i<120?i/120:1;if(i>n-4000)e*=(n-i)/4000;d[i]=a2*e*0.6}bufCache[key]=b;return b}
  function toypiano(m){var f=mtof(m);return synth('t'+m,1.0,function(t){return (Math.sin(TAU*f*t)*Math.exp(-t*4)+0.5*Math.sin(TAU*f*2.0*t+0.3)*Math.exp(-t*7)+0.28*Math.sin(TAU*f*3.6*t)*Math.exp(-t*14)+0.12*Math.sin(TAU*f*1.003*t)*Math.exp(-t*3))*0.38})}
  function whistle(m){var f=mtof(m);return synth('w'+m,0.42,function(t,i,n){var a=Math.min(1,t/0.04)*Math.min(1,(0.42-t)/0.08);var vib=Math.sin(TAU*5.5*t)*0.006*Math.min(1,t/0.12);return Math.sin(TAU*f*t*(1+vib))*a*0.34+0.04*(Math.random()*2-1)*a*Math.exp(-t*20)})}
  function accordion(m){var f=mtof(m);return synth('a'+m,0.5,function(t){var a=Math.min(1,t/0.03)*Math.min(1,(0.5-t)/0.1)*(1+0.12*Math.sin(TAU*6*t)),v=0;for(var h=1;h<=6;h++)v+=(Math.sin(TAU*f*h*t)+Math.sin(TAU*f*1.004*h*t))/h;return v*a*0.07})}
  function tom(m){var f=mtof(m);return synth('o'+m,0.35,function(t){return Math.sin(TAU*f*t*(1+0.6*Math.exp(-t*30)))*Math.exp(-t*9)*0.5})}
  /* ---- music (v1.4: one bus per track, crossfaded; per-world lead instruments) ---- */
  var LEADS={uke:function(m){return pluck(m)},harp:harp,marimba:marimba,toypiano:toypiano,whistle:whistle,musicbox:musicbox,glock:glock};
  // chords in F major (midi), by degree
  var CHD={I:[53,57,60,65],V:[48,55,60,64],vi:[50,57,62,65],IV:[46,53,58,62],V7:[48,55,60,67],ii:[50,53,57,62]};
  var BAS={I:41,V:36,vi:38,IV:34,V7:36,ii:38};
  var PROG={A:['I','V','vi','IV','I','V','IV','V7'],B:['I','IV','I','V','vi','IV','V7','I'],C:['vi','IV','I','V','vi','IV','ii','V7'],M:['I','IV','I','IV','vi','IV','V','I']};
  var MELS={
    A:[[[0,77],[2,74],[3,72],[4,74],[6,77]],[[0,79],[3,76],[4,74],[6,72]],[[0,74],[2,77],[3,74],[4,72],[6,69]],[[0,70],[2,72],[4,74],[5,72],[6,70]],[[0,77],[1,79],[2,81],[4,79],[6,77]],[[0,76],[2,79],[4,84],[6,81]],[[0,82],[2,81],[3,79],[4,77],[6,74]],[[0,76],[2,79],[4,77]]],
    B:[[[0,72],[1,74],[2,77],[4,81],[6,79]],[[0,77],[2,74],[4,70],[6,74]],[[0,72],[2,77],[3,79],[4,81],[6,84]],[[0,79],[2,76],[4,72],[6,74]],[[0,74],[2,77],[4,81],[5,79],[6,77]],[[0,74],[2,70],[3,72],[4,74],[6,77]],[[0,79],[1,81],[2,79],[4,76],[6,72]],[[0,77],[4,77],[6,72]]],
    C:[[[0,81],[2,77],[3,74],[4,77],[6,81]],[[0,82],[2,81],[4,77],[6,74]],[[0,72],[2,76],[4,79],[6,84]],[[0,83],[2,79],[4,76],[6,74]],[[0,81],[1,79],[2,77],[4,74],[6,77]],[[0,82],[2,77],[4,74],[6,70]],[[0,74],[2,77],[3,79],[4,81],[6,77]],[[0,79],[2,76],[4,72],[6,76]]],
    M:[[[0,77],[4,81]],[[0,82],[4,77]],[[0,77],[3,79],[4,81]],[[0,79],[6,77]],[[0,74],[4,77]],[[0,70],[4,74]],[[0,72],[2,76],[4,79]],[[0,77]]]};
  var WT=[{bpm:104,tr:0,lead:'uke',prog:'A',mel:'A',oct:12},{bpm:98,tr:2,lead:'harp',prog:'B',mel:'B',oct:0,counter:'musicbox'},{bpm:112,tr:-3,lead:'marimba',prog:'C',mel:'C',oct:0},
          {bpm:100,tr:5,lead:'toypiano',prog:'A',mel:'B',oct:0},{bpm:108,tr:-2,lead:'whistle',prog:'B',mel:'C',oct:0,pad:'accordion'},{bpm:116,tr:4,lead:'toypiano',prog:'A',mel:'A',oct:0,counter:'glock'}];
  function trackDef(key){var k=+key.slice(1)||0;if(key==='map')return {key:key,bpm:84,tr:0,lead:'musicbox',prog:'M',mel:'M',oct:0,calm:true,glock:0.6};
    var w=WT[Math.max(0,Math.min(WT.length-1,k))];var d={key:key,bpm:w.bpm,tr:w.tr,lead:w.lead,prog:w.prog,mel:w.mel,oct:w.oct,counter:w.counter,pad:w.pad};
    if(key[0]==='b'){d.bpm+=16;d.boss=true}return d}
  var tracks=[],cur=null,timer=null,playing=false,lift=0,liftT=0,stats={notes:0,switches:0,resync:0},sting=null;
  function mkTrack(key){var d=trackDef(key);d.bus=ctx.createGain();d.bus.gain.value=0;d.bus.connect(musicG);d.step=0;d.nextT=ctx.currentTime+0.06;d.alive=true;d.fade=1;return d}
  function nb(b,t,g,tr,rate){stats.notes++;return playBuf(b,t,g,tr.bus,rate)}
  function schedTrack(tr,horizon){var now=ctx.currentTime;if(tr.nextT<now-0.05){tr.nextT=now+0.05;stats.resync++}
    while(tr.nextT<now+horizon){var bar=Math.floor(tr.step/8)%8,e=tr.step%8,phrase=Math.floor(tr.step/64)%4,t=tr.nextT,deg=PROG[tr.prog][bar],ch=CHD[deg],TR=tr.tr;
      var lf=tr===cur?lift:0,bpm=tr.bpm*(1+0.06*lf),eighth=60/bpm/2;t+=(e%2)?eighth*0.12:0;
      if(tr.calm){if(e===0||e===4){for(var k=0;k<ch.length;k++)nb(pluck(ch[k]+12+TR),t+k*0.03,0.16,tr)}if(e===0)nb(pluck(BAS[deg]+12+TR),t,0.3,tr,0.5);
        var mm=MELS.M[bar];for(var j=0;j<mm.length;j++)if(mm[j][0]===e)nb(musicbox(mm[j][1]+TR),t,0.26,tr);
        if(phrase>=1&&e===6)nb(glock(ch[3]+24+TR),t,0.1,tr)}
      else{
        var STRUM=tr.boss?[1,1,1,1,1,1,1,1]:[1,0,1,1,0,1,1,1],DOWN=[1,0,1,0,0,0,1,0];
        if(STRUM[e]&&!(tr.pad&&e%2)){var down=DOWN[e]||e===0,g=(e===0?0.3:0.18)*(tr.boss?0.85:1);for(var k2=0;k2<ch.length;k2++){var ii=down?k2:ch.length-1-k2;nb(pluck(ch[ii]+12+TR),t+k2*0.012,g*(down?1:0.75),tr)}}
        if(tr.pad&&(e===0||e===4))for(var q=0;q<3;q++)nb(accordion(ch[q]+12+TR),t,0.22,tr);
        if(tr.boss){nb(pluck(BAS[deg]+12+TR+(e%2?12:0)),t,0.36,tr,0.5);if(e===0||e===4)nb(tom(45+TR%12),t,0.5,tr);if(e===6||e===7)nb(tom(50+TR%12),t,0.35,tr)}
        else if(e===0||e===4)nb(pluck(BAS[deg]+12+TR),t,0.42,tr,0.5);
        if(phrase!==0||bar>=4||tr.boss){var mel=MELS[tr.mel][bar],L=LEADS[tr.lead];for(var j2=0;j2<mel.length;j2++)if(mel[j2][0]===e){nb(L(mel[j2][1]+TR+tr.oct),t,(tr.lead==='whistle'?0.42:0.3)*(phrase===3?0.8:1),tr);
            if(tr.counter&&phrase>=2)nb(LEADS[tr.counter](mel[j2][1]+TR+12),t+eighth,0.12,tr)}}
        if((phrase>=1||tr.boss)&&(e%2===1)){var s=ctx.createBufferSource();s.buffer=noiseBuf;var hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=6500;stats.notes++;
          var g2=ctx.createGain();g2.gain.setValueAtTime(0.0001,t);g2.gain.exponentialRampToValueAtTime(tr.boss?0.08:0.06,t+0.005);g2.gain.exponentialRampToValueAtTime(0.0001,t+0.06);s.connect(hp);hp.connect(g2);g2.connect(tr.bus);s.start(t,Math.random()*0.5,0.08)}
        // glockenspiel layer: always a little sparkle on the downbeat; full countermelody near the exit
        if(e===0&&bar%2===0)nb(glock(ch[3]+24+TR),t,0.1,tr);
        if(lf>0.05&&(e%2===0)){var arp=[ch[1],ch[2],ch[3],ch[2]];nb(glock(arp[(e/2)%4]+24+TR),t,0.16*lf,tr)}}
      tr.nextT+=eighth;tr.step++}}
  function schedule(){if(!ctx)return;if(vol.music<=0.001||ctx.state!=='running'){var n0=ctx.currentTime+0.05;tracks.forEach(function(tr){tr.nextT=n0});return}
    for(var i=tracks.length-1;i>=0;i--){var tr=tracks[i];if(!tr.alive&&ctx.currentTime>tr.dieAt){try{tr.bus.disconnect()}catch(e){}tracks.splice(i,1);continue}schedTrack(tr,0.15)}}
  function ensureTimer(){if(!timer)timer=setInterval(schedule,40)}
  function switchTo(key){if(!ctx)return;if(cur&&cur.key===key&&cur.alive)return;var t=ctx.currentTime;
    if(cur){cur.alive=false;cur.dieAt=t+1.6;cur.bus.gain.cancelScheduledValues(t);cur.bus.gain.setValueAtTime(cur.bus.gain.value,t);cur.bus.gain.setTargetAtTime(0,t,0.28)}
    var ex=tracks.filter(function(q){return q.key===key&&!q.alive})[0];if(ex){ex.alive=true;cur=ex}else{cur=mkTrack(key);tracks.push(cur)}
    cur.bus.gain.cancelScheduledValues(t);cur.bus.gain.setValueAtTime(cur.bus.gain.value,t);cur.bus.gain.setTargetAtTime(1,t+0.05,0.32);stats.switches++}
  var want='w0';
  function setTrack(kind,world){want=kind==='map'?'map':(kind==='boss'?'b':'w')+Math.max(0,Math.min(5,world|0));if(playing)switchTo(want)}
  function startMusic(){init();if(!ctx)return;playing=true;ensureTimer();switchTo(want)}
  function setWorld(k){if(want[0]!=='b')want='w'+Math.max(0,Math.min(5,k|0))}
  function stopMusic(){playing=false;if(cur&&ctx){var t=ctx.currentTime;cur.alive=false;cur.dieAt=t+1.6;cur.bus.gain.setTargetAtTime(0,t,0.2);cur=null}}
  function setLift(k){k=Math.max(0,Math.min(1,k||0));lift+=(k-lift)*0.08}
  function stingMus(kind){if(!ctx||vol.music<=0.001||ctx.state!=='running'||!cur)return;var t=ctx.currentTime+0.02,TR=cur.tr;
    if(kind==='hit'){[72,76,79,84].forEach(function(m,i){nb(glock(m+TR),t+i*0.07,0.22,cur)})}
    else if(kind==='win'){[65,69,72,77,81,84,89].forEach(function(m,i){nb(glock(m+TR),t+i*0.08,0.24,cur)});[53,57,60,65].forEach(function(m,i){nb(pluck(m+12+TR),t+0.6+i*0.015,0.32,cur)});nb(tom(45),t+0.6,0.4,cur)}}
  // iOS: the context can be 'interrupted' (calls, Siri, other apps) or suspended; resume on the next gesture / when we come back
  var wantRun=false;function tryResume(){if(!ctx||document.hidden)return;if(ctx.state!=='running'&&ctx.resume){var pr=ctx.resume();if(pr&&pr.catch)pr.catch(function(){})}}
  ['pointerdown','touchend','keydown','focus','pageshow'].forEach(function(ev){window.addEventListener(ev,function(){if(ctx&&started)tryResume()},true)});
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
      case 'imp':{var q=p||{},v=Math.max(0.02,Math.min(1,q.v||0.3)),sp=q.s||5,m=q.m||'card',pi=Math.min(1.6,0.7+sp*0.05);
        if(m==='foil'){for(var k=0;k<4;k++)noise('highpass',3200+k*900,2000,2,0.035,0.1*v,t+k*0.022)}
        else if(m==='wax')tone('triangle',1500*pi,900*pi,0.06,0.07*v,t);
        else if(m==='felt'||m==='denim'||m==='burlap')noise('lowpass',380*pi,160,0.6,0.08,0.13*v,t);
        else if(m==='sponge')noise('bandpass',260,120,3,0.14,0.12*v,t);
        else if(m==='elastic'){tone('sine',140,420*pi,0.18,0.18*v,t);tone('triangle',280,840*pi,0.12,0.05*v,t)}
        else if(m==='wood'||m==='cork'){tone('sine',420*pi,300*pi,0.07,0.16*v,t);noise('bandpass',1200,800,4,0.04,0.06*v,t)}
        else if(m==='paper')noise('highpass',2500,1500,1,0.06,0.07*v,t);
        else noise('lowpass',300*pi,130,0.7,0.1,0.16*v,t);break}
      case 'snip':tone('square',2400,1800,0.02,0.06,t);noise('highpass',4000,0,1,0.05,0.08,t+0.03);tone('square',2000,1500,0.02,0.05,t+0.07);break;
      case 'snap':noise('bandpass',1600,600,2,0.08,0.18,t);tone('triangle',500,200,0.08,0.08,t);break;
      case 'tear':for(var k2=0;k2<6;k2++)noise('bandpass',900+k2*250,600,3,0.05,0.12,t+k2*0.035);break;
      case 'crumple':for(var k3=0;k3<5;k3++)noise('highpass',2600+k3*300,1800,1.5,0.04,0.09,t+k3*0.03);break;
      case 'rip':for(var k4=0;k4<7;k4++)noise('bandpass',1800+k4*120,1200,5,0.03,0.11,t+k4*0.02);break;
      case 'velcro':noise('bandpass',1400,900,4,0.06,0.08,t);break;
      case 'thud':noise('lowpass',260,120,0.7,0.12,0.12+Math.min(0.2,p*0.02),t);break;
    }
  }
  document.addEventListener('visibilitychange',function(){if(!ctx)return;if(document.hidden){ctx.suspend&&ctx.suspend()}else{tryResume();setTimeout(tryResume,300)}});
  return {init:init,unlock:unlock,setVol:setVol,vol:vol,startMusic:startMusic,stopMusic:stopMusic,setWorld:setWorld,setTrack:setTrack,setLift:setLift,sting:stingMus,sfx:sfx,ctx:function(){return ctx},musicGain:function(){return musicG?musicG.gain.value:-1},
    track:function(){return {want:want,cur:cur?cur.key:null,lead:cur?cur.lead:null,bpm:cur?cur.bpm:0,lift:+lift.toFixed(3),tracks:tracks.map(function(q){return q.key+(q.alive?'':'~')}),state:ctx?ctx.state:'none',playing:playing}},stats:function(){return stats}};
})();
