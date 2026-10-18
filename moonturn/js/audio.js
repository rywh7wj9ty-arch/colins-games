// Moonturn — procedural music + SFX (WebAudio). Volume 0 = gain 0 and nothing scheduled.
export class Audio{
  constructor(){this.ctx=null;this.music=0.6;this.sfx=0.8;this.song=0;this.nextT=0;this.step=0;this.noteIdx=0;this.on=false;}
  unlock(){ if(this.ctx){ if(this.ctx.state!=='running')this.ctx.resume(); return;}
    const C=window.AudioContext||window.webkitAudioContext; if(!C)return; const c=this.ctx=new C();
    this.master=c.createGain();this.master.gain.value=0.9;this.master.connect(c.destination);
    this.mg=c.createGain();this.sg=c.createGain();this.mg.connect(this.master);this.sg.connect(this.master);
    // soft echo for music
    this.dl=c.createDelay(1);this.dl.delayTime.value=0.33;this.fb=c.createGain();this.fb.gain.value=0.32;this.wet=c.createGain();this.wet.gain.value=0.35;
    this.mbus=c.createGain();this.mbus.connect(this.mg);this.mbus.connect(this.dl);this.dl.connect(this.fb);this.fb.connect(this.dl);this.dl.connect(this.wet);this.wet.connect(this.mg);
    this.setVolumes(this.music,this.sfx); this.nextT=c.currentTime+0.1; this.on=true;
    this.timer=setInterval(()=>this.tick(),90);
    document.addEventListener('visibilitychange',()=>{ if(!this.ctx)return; if(document.hidden)this.ctx.suspend(); else this.ctx.resume(); });
  }
  setVolumes(m,s){ this.music=m;this.sfx=s; if(!this.ctx)return; const t=this.ctx.currentTime;
    this.mg.gain.cancelScheduledValues(t);this.sg.gain.cancelScheduledValues(t);
    const mv=m<=0?0:m*m*0.55, sv=s<=0?0:s*s*0.9; this.mg.gain.value=mv; this.sg.gain.value=sv; this.mg.gain.setValueAtTime(mv,t); this.sg.gain.setValueAtTime(sv,t); }
  setSong(i){ this.song=i; }
  // ---- music ----
  tick(){ const c=this.ctx; if(!c||c.state!=='running')return; if(this.music<=0){this.nextT=c.currentTime+0.05;return;}
    const songs=[ {root:62,bpm:84,sc:[0,2,4,7,9],prog:[0,5,3,4]},{root:64,bpm:92,sc:[0,2,4,7,9],prog:[0,3,4,0]},{root:65,bpm:100,sc:[0,2,4,7,9],prog:[0,4,5,3]},
      {root:60,bpm:80,sc:[0,2,4,7,11],prog:[0,5,3,4]},{root:63,bpm:76,sc:[0,2,3,7,9],prog:[0,3,5,4]} ];
    const S=songs[this.song%songs.length]; const spb=60/S.bpm/2; // eighth notes
    while(this.nextT<c.currentTime+0.35){ const t=this.nextT,st=this.step; const bar=Math.floor(st/16)%4; const chord=S.prog[bar];
      const deg=[0,2,4,5,7,9,11]; const cr=S.root+deg[chord%7]-12;
      if(st%16===0){ [0,4,7].forEach((iv,k)=>this.pad(cr+iv+(chord===5&&k===1?-1:0)+(k===2?12:0),t,spb*16,0.05)); this.pluck(cr-12,t,0.09,'triangle',1.2); }
      if(st%8===4) this.pluck(cr-12+7,t,0.05,'triangle',0.6);
      const pat=[0,1,2,3,2,1,4,2]; if(st%2===0||Math.random()<0.25){ const k=pat[(st>>1)%8]; const n=S.root+S.sc[(k+chord)%5]+(((k+chord)>=5)?12:0); this.pluck(n,t,0.045,'sine',0.5); }
      if(st%32===28&&Math.random()<0.6) this.bell(S.root+24+S.sc[Math.floor(Math.random()*5)],t,0.03);
      this.nextT+=spb; this.step++; } }
  f(m){return 440*Math.pow(2,(m-69)/12);}
  pad(m,t,d,v){ const c=this.ctx,o=c.createOscillator(),o2=c.createOscillator(),g=c.createGain(),lp=c.createBiquadFilter(); lp.type='lowpass';lp.frequency.value=1400;
    o.type='triangle';o2.type='sine';o.frequency.value=this.f(m);o2.frequency.value=this.f(m)*1.003; g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+d*0.3);g.gain.linearRampToValueAtTime(0,t+d);
    o.connect(lp);o2.connect(lp);lp.connect(g);g.connect(this.mbus);o.start(t);o2.start(t);o.stop(t+d+0.05);o2.stop(t+d+0.05); }
  pluck(m,t,v,type,d){ const c=this.ctx,o=c.createOscillator(),g=c.createGain(); o.type=type;o.frequency.value=this.f(m);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.008);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(this.mbus);o.start(t);o.stop(t+d+0.02); }
  bell(m,t,v){ [1,2.76,5.4].forEach((r,i)=>{ const c=this.ctx,o=c.createOscillator(),g=c.createGain(); o.frequency.value=this.f(m)*r; g.gain.setValueAtTime(v/(i+1),t); g.gain.exponentialRampToValueAtTime(0.0001,t+1.6/(i+1)); o.connect(g);g.connect(this.mbus);o.start(t);o.stop(t+1.7);}); }
  // ---- sfx ----
  ok(){ return this.ctx&&this.ctx.state==='running'&&this.sfx>0; }
  tone(type,f0,f1,d,v,dest){ const c=this.ctx,t=c.currentTime,o=c.createOscillator(),g=c.createGain(); o.type=type; o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+d);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+d); o.connect(g);g.connect(dest||this.sg);o.start(t);o.stop(t+d+0.03); }
  noise(d,v,f0,f1,q=1){ const c=this.ctx,t=c.currentTime; const b=c.createBuffer(1,Math.ceil(c.sampleRate*d),c.sampleRate),a=b.getChannelData(0); for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;
    const s=c.createBufferSource();s.buffer=b; const bp=c.createBiquadFilter();bp.type='bandpass';bp.Q.value=q;bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+d);
    const g=c.createGain(); g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.0001,t+d); s.connect(bp);bp.connect(g);g.connect(this.sg);s.start(t);s.stop(t+d); }
  play(n,arg){ if(!this.ok())return; const P=[0,2,4,7,9,12,14,16,19,21,24];
    switch(n){
      case 'jump': this.tone('sine',330,720,0.16,0.22); this.tone('triangle',660,1100,0.1,0.06); break;
      case 'land': this.noise(0.09,0.12,600,180,0.8); break;
      case 'note': { const m=74+P[(arg||0)%P.length]; this.tone('sine',this.f(m),this.f(m),0.5,0.2); this.tone('sine',this.f(m+12),this.f(m+12),0.3,0.06); break; }
      case 'twist': this.noise(0.5,0.16,300,1800,1.4); this.tone('triangle',180,140,0.35,0.15); setTimeout(()=>this.ok()&&this.tone('square',520,500,0.06,0.04),420); break;
      case 'align': [0,4,7,12,16].forEach((k,i)=>setTimeout(()=>this.ok()&&this.tone('sine',this.f(67+k),this.f(67+k),0.7,0.12),i*70)); break;
      case 'hum': this.tone('sine',this.f(60+(arg||0)*12),this.f(60+(arg||0)*12),0.2,0.03); break;
      case 'rewind': this.tone('sine',900,200,0.7,0.12); this.noise(0.7,0.08,3000,400,0.7); break;
      case 'launch': this.tone('sine',200,1200,1.2,0.16); this.noise(1.2,0.08,400,4000,0.6); [0,4,7,12].forEach((k,i)=>setTimeout(()=>this.ok()&&this.tone('triangle',this.f(72+k),this.f(72+k),0.6,0.08),200+i*110)); break;
      case 'moth': [0,7,12,16,19,24].forEach((k,i)=>setTimeout(()=>this.ok()&&this.tone('sine',this.f(76+k),this.f(76+k),0.5,0.1),i*60)); break;
      case 'stomp': this.tone('square',300,90,0.18,0.08); this.tone('sine',500,900,0.2,0.12); break;
      case 'ui': this.tone('sine',880,990,0.06,0.07); break;
      case 'locked': this.tone('triangle',300,250,0.18,0.1); break;
      case 'fanfare': [0,4,7,12,7,12,16,19,24].forEach((k,i)=>setTimeout(()=>this.ok()&&(this.tone('triangle',this.f(60+k),this.f(60+k),0.6,0.1),this.tone('sine',this.f(72+k),this.f(72+k),0.5,0.06)),i*120)); break;
    } }
}
