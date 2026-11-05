// ---------- game state ----------
const G={mode:'menu',li:0,endless:false,t:0,shake:0,pulse:0,toastT:0,fxScale:1,fps:60,slow:0,view:{w:1000,h:520,s:1},won:false,runStats:null,speed:0,pops:[],landDip:0};
const PARTS=[];let PMAX=700;
function part(x,y,vx,vy,life,size,col,kind,grav){if(PARTS.length>=PMAX*G.fxScale){return;}PARTS.push({x,y,vx,vy,life,max:life,size,col,kind:kind||0,grav:grav||0,rot:Math.random()*6});}
function burst(x,y,n,col,spd,size,kind,grav){n=Math.ceil(n*G.fxScale);for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=rnd(0.3,1)*spd;part(x,y,Math.cos(a)*s,Math.sin(a)*s,rnd(0.35,0.8),size*rnd(0.6,1.2),col,kind,grav);}}
function dust(x,y,n,dir){for(let i=0;i<n;i++)part(x+rnd(-10,10),y-2,(dir||rnd(-1,1))*rnd(40,140),-rnd(20,90),rnd(0.3,0.55),rnd(5,10),'rgba(255,250,230,0.9)',1,200);}
function toast(t,d){const el=$('toast');el.textContent=t;el.style.opacity=1;G.toastT=d||1.4;}
function addCombo(n,x,y){P.combo+=n;P.comboT=1.8;if(P.combo>P.bestCombo)P.bestCombo=P.combo;
  if(P.combo>=10&&Math.floor(P.combo/10)>Math.floor((P.combo-n)/10)){P.motes+=3;sfx('combo',P.combo/10);G.pulse=0.5;burst(P.x,P.y-16,14,'#ffe36a',260,7,2);}}
const mult=()=>1+Math.floor(P.combo/5)*0.5;
function startLevel(i,endless){
  G.endless=!!endless;G.li=i;W=makeWorld(endless?null:LEVELS[i],endless);PARTS.length=0;
  P.motes=6;P.gotMotes=0;P.stones=0;P.combo=0;P.comboT=0;P.bestCombo=0;P.power=null;P.powerT=0;P.check=null;P.stomps=0;P.fallT=0;
  G.pops.length=0;G.landDip=0;
  resetPlayer();P.hurtT=0.5;G.t=0;G.won=false;G.speed=110;W.scroll=0;
  W.cam.x=P.x;W.cam.y=P.y;snapCam();
  setSong(endless?'sky':LEVELS[i].song);S.st.plays++;save();
  for(const k in pressQ)delete pressQ[k];
  G.mode='play';showScr(null);$('hud').classList.add('on');setTouch(touchOn);hudFull();
  if(!endless)toast(LEVELS[i].name,1.8);else toast('Sky Garden — keep ahead!',1.8);
}
function hurt(dir){
  if(P.hurtT>0||P.deadT>0)return; P.petals--;P.hurtT=1.3;P.vy=-620;P.vx=(dir||-P.face)*260;P.dashT=0;P.climb=false;G.shake=Math.max(G.shake,0.35);sfx('hurt');
  burst(P.x,P.y-16,10,'#ffc0d6',200,6,3,300);P.combo=0;P.comboT=0;hudFull();
  if(P.petals<=0)die();
}
function die(){
  if(P.deadT>0)return;P.deadT=0.9;burst(P.x,P.y-16,26,'#9ef08a',320,7,3,200);sfx('fail');
  if(G.endless){P.deadT=0.01;}
}
function win(){
  G.won=true;sfx('win');G.pulse=1;burst(W.goal.x,W.goal.y,60,'#ffe36a',420,8,2);
  if(FEAT.flora)burst(W.goal.x,W.goal.y+16,22,'#ffb7d0',240,6,3,30);
  const id=W.def.id,b=S.best[id]||{};const tm=Math.round(W.time*10)/10;
  const res={time:tm,motes:P.gotMotes,total:W.totalMotes,stones:P.stones,totalS:W.totalStones,combo:P.bestCombo,score:Math.round(W.score)};
  const nb={time:b.time?Math.min(b.time,tm):tm,motes:Math.max(b.motes||0,res.motes),stones:Math.max(b.stones||0,res.stones),score:Math.max(b.score||0,res.score),combo:Math.max(b.combo||0,res.combo)};
  const newBest=!b.score||res.score>b.score;S.best[id]=nb;S.st.clears++;S.unlocked=Math.max(S.unlocked,G.li+2);save();
  setTimeout(()=>showResult(res,newBest),1100);
}
function endRun(){
  const sc=endlessScore();S.st.endlessRuns++;S.st.distance+=Math.round(W.scroll/T);
  S.hi.push({s:sc,d:new Date().toISOString().slice(0,10)});S.hi.sort((a,b)=>b.s-a.s);S.hi=S.hi.slice(0,5);save();
  G.mode='over';setTimeout(()=>showResult({score:sc,dist:Math.round(W.scroll/T),motes:P.gotMotes,combo:P.bestCombo,endless:true},S.hi[0].s===sc),700);
}
function update(dt){
  readInput();
  if(IN.pauseP&&G.mode==='play'){pauseGame();return;}
  if(G.mode!=='play'&&G.mode!=='over'){return;}
  G.t+=dt;W.time+=dt; S.st.time+=dt;
  if(G.toastT>0){G.toastT-=dt;if(G.toastT<=0)$('toast').style.opacity=0;}
  G.shake=Math.max(0,G.shake-dt*1.6);G.pulse=Math.max(0,G.pulse-dt*1.8);
  if(G.mode==='play'&&!G.won){
    if(IN.rsP&&!G.endless){respawn();}
    updatePlayer(dt);
  }
  updateWorld(dt);
  // particles
  for(let i=PARTS.length-1;i>=0;i--){const p=PARTS[i];p.life-=dt;if(p.life<=0){PARTS[i]=PARTS[PARTS.length-1];PARTS.pop();continue;}
    p.vy+=p.grav*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.985;p.rot+=dt*3;}
  for(let i=G.pops.length-1;i>=0;i--){const p=G.pops[i];p.t+=dt;p.y-=30*dt;if(p.t>0.75)G.pops.splice(i,1);}
  updateCam(dt);
  hudTick();
}
function respawn(){const c=P.check;resetPlayer(c?{x:c.x,y:c.y+T/2}:null);snapCam();}
function updatePlayer(dt){
  if(P.deadT>0){P.deadT-=dt;if(P.deadT<=0){if(G.endless){endRun();return;}S.st.falls++;respawn();hudFull();}return;}
  P.hurtT=Math.max(0,P.hurtT-dt);P.coyote-=dt;P.buf-=dt;P.dashCD-=dt;
  if(P.power){P.powerT-=dt;if(P.powerT<=0){P.power=null;toast('Power faded');}}
  if(P.comboT>0){P.comboT-=dt;if(P.comboT<=0){if(P.combo>=5)toast('Combo x'+P.combo+'!',1);P.combo=0;}}
  if(IN.jumpP)P.buf=FEAT.move?0.15:0.13;
  if(IN.x)P.face=Math.sign(IN.x);
  // ----- grow plants -----
  if(IN.growP)growPlant();
  // ----- dash -----
  const zoom=P.power==='D';
  if(IN.dashP&&P.dashes>0&&P.dashCD<=0){
    let dx=IN.x,dy=IN.y;if(!dx&&!dy)dx=P.face;const l=Math.hypot(dx,dy);dx/=l;dy/=l;
    const sp=zoom?1050:780;P.vx=dx*sp;P.vy=dy*sp*0.92;P.dashT=zoom?0.19:0.15;P.dashes--;P.dashCD=0.08;P.climb=false;
    sfx('dash');G.shake=Math.max(G.shake,0.12);S.st.dashes++;addCombo(1);P.sx=1.45;P.sy=0.7;
    burst(P.x,P.y-16,8,'rgba(255,255,255,0.9)',160,6,1);
  }
  // ----- vine climbing -----
  const vine=W.plants.find(pl=>pl.k==='vine'&&pl.g>0.5&&Math.abs(pl.x-P.x)<24&&P.y>pl.y-pl.h&&P.y-P.h<pl.y);
  P.vineCD=(P.vineCD||0)-dt;
  if(vine&&IN.y<0&&P.dashT<=0&&!P.climb&&P.vineCD<=0){P.climb=true;P.vx=0;}
  if(P.climb&&!vine)P.climb=false;
    if(P.climb){
    P.x=lerp(P.x,vine.x,0.3);P.vy=IN.y<0?-230:IN.y>0?230:0;P.vx=0;P.dashes=zoom?2:1;
    if(FEAT.vine&&(P.leafT=(P.leafT||0)-dt)<=0){P.leafT=0.12;part(vine.x+rnd(-8,8),P.y-18,rnd(-24,24),rnd(-36,12),0.5,5,'#8ef07a',3,30);}
    if(P.y-P.h-4<vine.y-vine.h&&P.vy<0)P.vy=0;
    if(P.buf>0){P.climb=false;P.buf=0;P.vineCD=0.4;P.vy=-JUMPV*0.92;P.vx=(IN.x||P.face)*240;sfx('jump');S.st.jumps++;addCombo(1);P.sx=0.7;P.sy=1.35;}
  }else if(P.dashT>0){
    P.dashT-=dt;if(P.trail.length===0||G.t-P.trail[P.trail.length-1].t>0.018)P.trail.push({x:P.x,y:P.y,t:G.t,sx:P.sx,sy:P.sy,f:P.face});
    if(P.dashT<=0){P.vx*=0.62;if(P.vy<0)P.vy*=0.45;}
  }else{
    const target=IN.x*RUN*(P.hurtT>1?0.4:1);
    const acc=P.onG?(IN.x?(FEAT.move?3800:2900):3000):(IN.x?(FEAT.move?2100:1800):420);
    if(P.vx<target)P.vx=Math.min(target,P.vx+acc*dt);else if(P.vx>target)P.vx=Math.max(target,P.vx-acc*dt);
    let g=GRAV*(P.power==='F'?0.55:1);
    if(P.vy<0&&!IN.jumpHeld)g*=2.1; else if(Math.abs(P.vy)<90&&IN.jumpHeld)g*=0.55;
    P.vy+=g*dt;
    let maxF=P.power==='F'?520:950;
    P.glide=P.power==='L'&&IN.jumpHeld&&P.vy>0;if(P.glide){maxF=95;P.vx=clamp(P.vx+P.face*500*dt,-RUN*1.1,RUN*1.1);}
    if(P.vy>maxF)P.vy=maxF;
    if(P.buf>0&&(P.onG||P.coyote>0)){
      P.vy=-JUMPV*(P.power==='B'?1.3:1);P.onG=false;P.coyote=0;P.buf=0;P.sx=0.68;P.sy=1.38;sfx('jump');dust(P.x,P.y,5);S.st.jumps++;
      if(Math.abs(P.vx)>RUN*0.9)addCombo(1);
    }
    if(Math.abs(P.vx)>RUN*1.2||P.vy<-1000)if(P.trail.length===0||G.t-P.trail[P.trail.length-1].t>0.03)P.trail.push({x:P.x,y:P.y,t:G.t,sx:P.sx,sy:P.sy,f:P.face});
  }
  // ----- integrate with collision (substeps) -----
  const wasG=P.onG,impact=P.vy;P.onG=false;
  const steps=Math.ceil(Math.max(Math.abs(P.vx),Math.abs(P.vy))*dt/12)||1,sdt=dt/steps;
  for(let s=0;s<steps;s++){
    let nx=P.x+P.vx*sdt;
    if(rectHitsSolid(nx,P.y,P.w,P.h-2)){
      if(P.vx>0)nx=Math.floor((nx+P.w/2)/T)*T-P.w/2-0.01;else nx=(Math.floor((nx-P.w/2)/T)+1)*T+P.w/2+0.01;
      if(rectHitsSolid(nx,P.y,P.w,P.h-2))nx=P.x; P.vx=0;
    }
    P.x=Math.max(P.w/2,nx);
    if(G.endless&&P.x<W.scroll+P.w/2){P.x=W.scroll+P.w/2;if(rectHitsSolid(P.x,P.y,P.w,P.h-2)){die();return;}}
    let ny=P.y+P.vy*sdt;
    if(P.vy>=0){
      const ow=oneWayTop(P.x,P.y,ny,P.w);
      if(rectHitsSolid(P.x,ny,P.w,P.h)){const top=Math.floor(ny/T)*T;const ow2=ow&&ow.y<top?ow:null;
        if(ow2){ny=ow2.y;landOn(ow2);}else{ny=top;landOn({k:'#',y:top});}}
      else if(ow){ny=ow.y;landOn(ow);}
    }else{
      if(rectHitsSolid(P.x,ny,P.w,P.h)){ny=(Math.floor((ny-P.h)/T)+1)*T+P.h+0.01;P.vy=0;}
    }
    P.y=ny;
  }
  if(P.onG&&!wasG){
    const v=clamp(impact/900,0,1);P.sx=1+0.45*v;P.sy=1-0.38*v;if(impact>300){dust(P.x,P.y,Math.round(3+v*6));sfx('land',v);}
    if(FEAT.land&&impact>180){
      P.sx=1+0.62*v;P.sy=1-0.5*v;
      burst(P.x,P.y,Math.round(5+v*8),'#b6f5a0',150,5,3,60);
      part(P.x,P.y,0,0,0.42,7,'rgba(255,255,236,0.95)',4,0);
      G.landDip=Math.min(16,4+v*14);
      if(impact>520)tone(170,0.1,'sine',0.06,80);
    }
  }
  if(P.onG){P.coyote=FEAT.move?0.12:0.1;P.dashes=zoom?2:1;}
  // pads (trigger zone so grounded pads work too)
  for(const pl of W.plants)if(pl.k==='pad'&&pl.g>0.6&&P.vy>=0&&Math.abs(P.x-pl.x)<pl.w/2+P.w/2-4&&P.y>=pl.y-3&&P.y<=pl.y+16)padBounce(pl.y,1220);
  // squash-stretch spring back
  P.sx=lerp(P.sx,1,Math.min(1,dt*12));P.sy=lerp(P.sy,1,Math.min(1,dt*12));
  if(!P.onG&&!P.climb&&P.dashT<=0){const st=clamp(-P.vy/1400,-0.12,0.18);P.sy=lerp(P.sy,1+st,0.2);P.sx=lerp(P.sx,1-st*0.7,0.2);}
  while(P.trail.length&&G.t-P.trail[0].t>0.28)P.trail.shift();
  // hazards: thorns
  const c0=Math.floor((P.x-P.w/2+4)/T),c1=Math.floor((P.x+P.w/2-4)/T),r0=Math.floor((P.y-P.h)/T),r1=Math.floor((P.y-1)/T);
  for(let c=c0;c<=c1;c++)for(let r=r0;r<=r1;r++)if(tileAt(c,r)==='^'&&P.y>r*T+T*0.45)hurt(P.x<c*T+T/2?-1:1);
  // fell out
  if(P.y>W.H*T+120)die();
  // idle blink
  P.blink-=dt;if(P.blink<-0.12)P.blink=rnd(2,4.5);
  if(FEAT.move){
    P.lean=lerp(P.lean||0,clamp(-P.vx/700,-0.32,0.32),Math.min(1,dt*12));
    if(P.onG&&Math.abs(P.vx)>180&&(P.stepT=(P.stepT||0)-dt)<=0){P.stepT=0.14;dust(P.x-P.face*6,P.y,2,-P.face);}
    if(P.onG&&IN.x&&Math.sign(IN.x)!==Math.sign(P.vx)&&Math.abs(P.vx)>90&&(P.skidT=(P.skidT||0)-dt)<=0){P.skidT=0.12;dust(P.x,P.y,4,Math.sign(P.vx));}
  }else P.lean=0;
}
function landOn(o){
  P.onG=true;
  if(o.k==='#'){ // mushroom cap below?
    const c=Math.floor(P.x/T),r=Math.round(o.y/T);if(tileAt(c,r)==='M'||tileAt(Math.floor((P.x-8)/T),r)==='M'||tileAt(Math.floor((P.x+8)/T),r)==='M'){padBounce(o.y,1180);return;}
  }
  if(o.k==='pad'){padBounce(o.y,1220);return;}
  P.vy=0;
}
function padBounce(y,v){P.vy=-v*(P.power==='B'?1.2:1);P.onG=false;P.coyote=0;P.dashes=P.power==='D'?2:1;P.sx=0.6;P.sy=1.5;sfx('boing');addCombo(1);S.st.bounced++;
  burst(P.x,y,10,'#ffb3cf',220,6,3,300);G.pulse=Math.max(G.pulse,0.25);}
function growPlant(){
  if(P.motes<3){toast('Need 3 sun motes to grow',1);sfx('hurt');return;}
  P.motes-=3;S.st.plants++;addCombo(1);let pl;
  if(IN.y<0){pl={k:'vine',x:P.x,y:P.onG?P.y:P.y+10,h:240,w:28,life:6.5};sfx('vine');}
  else if(IN.y>0){pl={k:'pad',x:P.onG?P.x+P.face*56:P.x,y:P.onG?P.y:P.y+18,w:64,life:6};sfx('grow');}
  else if(P.onG){pl={k:'leaf',x:P.x+P.face*84,y:P.y-100,w:100,life:5};sfx('grow');}
  else{pl={k:'leaf',x:P.x+P.vx*0.08,y:P.y+6,w:100,life:5};sfx('grow');}
  pl.g=0;pl.t=0;W.plants.push(pl);if(W.plants.length>4)W.plants.shift();
  if(pl.k==='vine'&&P.dashT<=0){P.climb=true;P.vx=0;P.vy=0;}
  if(FEAT.vine&&pl.k==='vine'){for(let i=0;i<10;i++)part(pl.x+rnd(-12,12),pl.y-Math.random()*pl.h*0.85,rnd(-40,40),rnd(-90,-10),rnd(0.45,0.9),rnd(4,7),'#9cf08a',3,16);tone(540,0.16,'sine',0.05,900);}
  const top=pl.k==='vine'?pl.y-pl.h/2:pl.y;
  for(let i=0;i<14*G.fxScale;i++)part(pl.x+rnd(-pl.w/2,pl.w/2),top+rnd(-10,10),rnd(-60,60),rnd(-160,-40),rnd(0.5,1),rnd(4,8),Math.random()<0.5?'#8ef07a':'#fff3a0',3,120);
  G.pulse=Math.max(G.pulse,0.2);
}
function updateWorld(dt){
  const pc={x:P.x,y:P.y-P.h/2};const alive=P.deadT<=0&&G.mode==='play'&&!G.won;
  // plants
  for(let i=W.plants.length-1;i>=0;i--){const pl=W.plants[i];pl.t+=dt;pl.g=Math.min(1,pl.t/0.22);
    if(pl.t>pl.life){W.plants.splice(i,1);burst(pl.x,pl.y-(pl.k==='vine'?pl.h/2:0),10,'#bdf5a6',120,6,3,80);if(P.climb&&pl.k==='vine')P.climb=false;}}
  // motes
  const mag=P.combo>=5?95:40;
  for(const m of W.motes){if(m.got)continue;m.b+=dt;
    if(alive){const dx=pc.x-m.x,dy=pc.y-m.y,d=Math.hypot(dx,dy);
      if(d<mag&&d>30){m.x+=dx/d*360*dt;m.y+=dy/d*360*dt;}
      if(d<mag&&d>30&&FEAT.collect&&Math.random()<0.35*G.fxScale)part(m.x,m.y,0,0,0.22,3,'#fff1a8',2,0);
      if(d<32){m.got=true;P.motes++;P.gotMotes++;S.st.motes++;addCombo(1);W.score+=10*mult();sfx('mote',P.gotMotes);
        burst(m.x,m.y,6,'#ffe36a',150,5,2);G.pulse=Math.max(G.pulse,0.08);
        if(FEAT.collect){burst(m.x,m.y,8,'#fff6b0',230,5,2);part(m.x,m.y,0,0,0.42,9,'rgba(255,246,190,0.95)',4,0);G.pops.push({x:m.x,y:m.y-8,t:0,txt:'+1',col:'#fffbe8'});G.pulse=Math.max(G.pulse,0.18);
          const el=$('moteN');if(el){el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');}}}}}
  for(const s of W.stones){if(s.got||!alive)continue;if(Math.hypot(pc.x-s.x,pc.y-s.y)<40){s.got=true;P.stones++;S.st.stones++;W.score+=500;sfx('stone');toast('Sunstone '+P.stones+'/'+W.totalStones+'!');burst(s.x,s.y,30,'#fff0a0',300,8,2);G.pulse=0.7;hudFull();
    if(FEAT.collect){part(s.x,s.y,0,0,0.6,16,'rgba(255,250,210,0.95)',4,0);G.pops.push({x:s.x,y:s.y-10,t:0,txt:'★',col:'#fff6c0'});}}}
  for(const p of W.powers){if(p.got||!alive)continue;p.t+=dt;if(Math.hypot(pc.x-p.x,pc.y-p.y)<38){p.got=true;P.power=p.k;P.powerT=10;sfx('power');toast(PW[p.k].n+'!');burst(p.x,p.y,24,PW[p.k].c,260,7,2);if(p.k==='D')P.dashes=2;}}
  for(const c of W.checks){c.t+=dt;if(!c.on&&alive&&Math.abs(pc.x-c.x)<36&&Math.abs(pc.y-c.y)<70){W.checks.forEach(o=>{if(o.x<c.x)o.on=true;});c.on=true;P.check=c;P.petals=3;if(P.motes<6)P.motes=6;sfx('check');toast('Checkpoint!',1);burst(c.x,c.y-20,20,'#ffd45e',200,6,2);hudFull();}}
  if(W.goal&&alive&&Math.abs(pc.x-W.goal.x)<44&&Math.abs(pc.y-W.goal.y)<80)win();
  // enemies
  for(const e of W.enemies){if(!e.alive)continue;e.t+=dt;
    if(e.k==='b'){const nx=e.x+e.vx*dt,ahead=nx+Math.sign(e.vx)*16,r=Math.floor(e.y/T),rb=Math.floor((e.y+e.h/2+4)/T);
      if(solid(tileAt(Math.floor(ahead/T),r))||!solid(tileAt(Math.floor(ahead/T),rb))||tileAt(Math.floor(ahead/T),r)==='^')e.vx=-e.vx;else e.x=nx;}
    else{e.y=e.y0+Math.sin(e.t*2.2)*34;e.x+=Math.cos(e.t*0.9)*26*dt;}
    if(!alive)continue;
    const dx=P.x-e.x,dy=(P.y-P.h/2)-e.y;
    if(Math.abs(dx)<(P.w+e.w)/2-2&&Math.abs(dy)<(P.h+e.h)/2-2){
      if(P.dashT>0||(P.vy>40&&P.y-6<e.y)){e.alive=false;P.vy=IN.jumpHeld?-900:-700;P.dashT=0;P.dashes=P.power==='D'?2:1;P.sx=0.7;P.sy=1.35;
        sfx('stomp');addCombo(2);P.stomps++;W.score+=50*mult();G.shake=Math.max(G.shake,0.15);burst(e.x,e.y,18,e.k==='b'?'#7fd3ff':'#ffd45e',260,7,3,200);
        for(let i=0;i<2;i++){P.motes++;P.gotMotes++;}S.st.bounced++;}
      else hurt(Math.sign(dx)||1);
    }}
  // endless scrolling
  if(G.endless){
    G.speed=Math.min(360,110+W.time*2.6);
    if(G.mode==='play'){W.scroll+=G.speed*dt;const ahead=P.x-G.view.w*0.55;if(ahead>W.scroll)W.scroll=lerp(W.scroll,ahead,Math.min(1,dt*3));}
    W.score=Math.max(W.score,0);W.distScore=Math.floor(W.scroll/T);
    const need=Math.floor((W.scroll+G.view.w+T*8)/T);if(W.cols.length<need)endlessGen(W,need+30);
    const lc=Math.floor(W.scroll/T)-12;for(let c=Math.max(0,lc-40);c<lc;c++)W.cols[c]=null;
    if(G.t%2<dt){const lx=W.scroll-300;W.motes=W.motes.filter(m=>m.x>lx);W.enemies=W.enemies.filter(e=>e.x>lx);W.powers=W.powers.filter(p=>p.x>lx);}
  }
}
function endlessScore(){return Math.round(W.score+(W.distScore||0)*5);}
function snapCam(){const t=camTarget();W.cam.x=t.x;W.cam.y=t.y;}
function camTarget(){
  const v=G.view;let x=P.x+P.face*60+P.vx*0.2,y=P.y-30;
  if(FEAT.cam){
    const sp=Math.abs(P.vx);
    x=P.x+P.face*(72+Math.min(46,sp*0.11))+P.vx*0.2;
    y=P.y-38+clamp(P.vy*0.032,-22,40)+(G.landDip||0);
    if(P.climb)y-=46;
    if(P.vy<-380)y-=14;
  }
  const ww=W.endless?1e9:W.cols.length*T,wh=W.H*T;
  if(W.endless)x=W.scroll+v.w/2;else x=clamp(x,v.w/2,Math.max(v.w/2,ww-v.w/2));
  y=wh<=v.h?wh-v.h/2:clamp(y,v.h/2,wh-v.h/2);
  return{x,y};
}
function updateCam(dt){
  const t=camTarget();
  if(W.endless)W.cam.x=t.x;
  else if(!FEAT.cam)W.cam.x=lerp(W.cam.x,t.x,Math.min(1,dt*6));
  else{const dx=Math.abs(t.x-W.cam.x);W.cam.x=lerp(W.cam.x,t.x,Math.min(1,dt*(4.2+Math.min(7,dx/36))));}
  if(!FEAT.cam)W.cam.y=lerp(W.cam.y,t.y,Math.min(1,dt*(P.vy>600?9:4.5)));
  else{const dy=Math.abs(t.y-W.cam.y);W.cam.y=lerp(W.cam.y,t.y,Math.min(1,dt*((P.vy>600?7.5:3.6)+Math.min(6,dy/48))));}
  if(G.landDip)G.landDip=Math.max(0,G.landDip-dt*26);
}
