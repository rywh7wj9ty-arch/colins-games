// Sudoku Prism — WebAudio synth: SFX + gentle dynamic soundtrack
export class Audio{
 constructor(){this.ctx=null;this.music=0.5;this.sfx=0.7;this.intensity=0;this.next=0;this.step=0;}
 unlock(){if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.ctx=new C();
   this.mg=this.ctx.createGain();this.sg=this.ctx.createGain();this.mg.connect(this.ctx.destination);this.sg.connect(this.ctx.destination);this.apply();
   setInterval(()=>this.tick(),100);}
  if(this.ctx.state!=='running')this.ctx.resume();}
 setMusic(v){this.music=v;this.apply();}setSfx(v){this.sfx=v;this.apply();}
 apply(){if(!this.ctx)return;const t=this.ctx.currentTime;this.mg.gain.setTargetAtTime(this.music*0.32,t,0.05);this.sg.gain.setTargetAtTime(this.sfx*0.6,t,0.02);
  if(this.music===0){this.mg.gain.cancelScheduledValues(0);this.mg.gain.value=0;}if(this.sfx===0){this.sg.gain.cancelScheduledValues(0);this.sg.gain.value=0;}}
 tone(f,t,dur,type,vol,dest,att=0.005){const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+att);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+0.05);}
 play(name,arg=0){if(!this.ctx||this.sfx===0||this.ctx.state!=='running')return;const t=this.ctx.currentTime,d=this.sg;
  const sc=[523.25,587.33,659.25,783.99,880,1046.5,1174.66,1318.5,1568];
  switch(name){
   case 'tap':this.tone(1400,t,0.05,'sine',0.15,d);break;
   case 'place':{const f=sc[(arg-1)%9];this.tone(f,t,0.35,'sine',0.35,d);this.tone(f*2,t,0.15,'triangle',0.08,d);break;}
   case 'note':this.tone(2000,t,0.04,'triangle',0.08,d);break;
   case 'erase':this.tone(500,t,0.08,'sine',0.15,d);break;
   case 'error':this.tone(220,t,0.22,'triangle',0.25,d);this.tone(207,t+0.06,0.2,'triangle',0.18,d);break;
   case 'unit':[0,2,4,7].forEach((k,i)=>this.tone(sc[Math.min(8,k+arg)],t+i*0.07,0.5,'sine',0.25,d));break;
   case 'hint':[4,6,8].forEach((k,i)=>this.tone(sc[k],t+i*0.05,0.4,'sine',0.18,d));break;
   case 'win':[0,2,4,5,7,8].forEach((k,i)=>{this.tone(sc[k],t+i*0.12,0.9,'sine',0.3,d);this.tone(sc[k]/2,t+i*0.12,0.9,'triangle',0.1,d);});break;
  }}
 tick(){const c=this.ctx;if(!c||c.state!=='running'||this.music===0){if(c)this.next=c.currentTime;return;}
  if(this.next<c.currentTime)this.next=c.currentTime+0.05;
  const beat=0.42,chords=[[261.63,329.63,392],[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66]];
  while(this.next<c.currentTime+0.4){const t=this.next,s=this.step,ch=chords[Math.floor(s/8)%4],m=this.mg;
   if(s%8===0){ch.forEach(f=>{this.tone(f/2,t,beat*8.5,'triangle',0.06,m,0.8);this.tone(f*1.003/2,t,beat*8.5,'sine',0.06,m,0.8);});this.tone(ch[0]/4,t,beat*4,'sine',0.12,m,0.05);}
   const dens=0.35+this.intensity*0.6, pat=[0,2,1,2,0,1,2,1];
   if(s%2===0||Math.random()<dens*0.5){const f=ch[pat[s%8]]*(s%4===3?4:2);this.tone(f,t,0.6,'sine',0.05+this.intensity*0.04,m);}
   if(this.intensity>0.5&&s%4===2)this.tone(ch[2]*4,t,0.3,'triangle',0.025,m);
   this.step++;this.next+=beat/ (1+this.intensity*0.15);}}
}
