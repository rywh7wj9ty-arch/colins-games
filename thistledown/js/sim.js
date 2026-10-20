// Thistledown - deterministic simulation (no DOM). 1 unit = 1 tile.
(function(root){
'use strict';
var CH={'.':0,'#':1,'I':2,'=':3,'^':4,'C':5,'T':6,'D':7,'w':8,'h':9,'U':10};
var K={RUN:8,GRAV:45,JUMP:15,DJ:13,MAXFALL:18,SLIDE:2.8,WJX:8.5,WJY:14,DASH:21,DASHT:0.17,GLIDE:2.6,BASH:18.5,BASHR:3.3,GRAPR:7.5,SWIM:6.5};
var HW=0.3,HH=0.42;

function build(def){ // static data shared between worlds of an area
  var w=def.w,h=def.h,g=new Uint8Array(w*h),door=new Int8Array(w*h);
  for(var y=0;y<h;y++){var r=def.rows[y];for(var x=0;x<w;x++){g[y*w+x]=CH[r.charAt(x)]||0;}}
  for(var k in def.doors)door[+k]=def.doors[k];
  var upd=new Uint8Array(w*h);
  for(var i=0;i<w*h;i++)if(g[i]===10){var x0=i%w,y0=(i/w)|0;for(var yy=y0;yy>=Math.max(0,y0-14);yy--){var t=g[yy*w+x0];if(t===1||t===2||t===6||t===7)break;upd[yy*w+x0]=1;}}
  var st={def:def,w:w,h:h,g0:g,door:door,upd:upd};
  st.entry={};
  def.ents.forEach(function(e,i){if(e.t==='x'&&!st.entry.prev)st.entry.prev={x:e.x+2.2,y:e.y};if(e.t==='X')st.entry.next={x:e.x-2.2,y:e.y};if(e.t==='P')st.entry.start={x:e.x,y:e.y};});
  return st;
}

function create(st,opt){
  opt=opt||{};var def=st.def;
  var s={t:0,g:new Uint8Array(st.g0),col:new Float32Array(st.w*st.h),flood:!!opt.flood,latch:opt.latch?opt.latch.slice():[],ab:opt.ab||{},
    e:[],crates:[],seeds:[],ev:[],beams:[],open:{},chase:null,boss:null,won:false,exit:null,rng:12345,stats:opt.stats||{}};
  def.ents.forEach(function(d,i){
    var o={t:d.t,x:d.x,y:d.y,i:i};
    for(var k in d)if(!(k in o))o[k]=d[k];
    if(opt.got&&opt.got.indexOf(i)>=0)o.got=true;
    if(d.t==='B'){s.crates.push({x:d.x,y:d.y+0.05,x0:d.x,y0:d.y+0.05,vx:0,vy:0,i:i});return;}
    if(d.t==='M')o.st=0; if(d.t==='N')o.st=1; // 0='/',1='\'
    if(d.t==='M'||d.t==='N'){o.t='M';if(opt.mir&&opt.mir[i]!=null)o.st=opt.mir[i];}
    if(d.t==='e'){o.hp=2;o.cd=1+((i*7)%10)/10;}
    if(d.t==='O'){s.boss={x:d.x,y:d.y,bx:d.x,by:d.y,hp:opt.bossDone?0:3,t:0,cd:2,fl:0,on:false,ax0:d.ax0,ax1:d.ax1,i:i};if(opt.bossDone)s.won=true;return;}
    s.e.push(o);
  });
  var sp=opt.spawn||st.entry.start||{x:3,y:3};
  s.p={x:sp.x,y:sp.y,vx:0,vy:0,face:1,gr:false,co:0,jb:0,jumps:0,cut:false,cling:0,wall:0,nocl:0,lock:0,dashT:0,canDash:true,dcd:0,bashT:0,aim:null,aimT:0,ax:0,ay:-1,grap:-1,grapT:0,inv:0,water:false,glide:false,
    hp:opt.hp||3,maxHp:opt.maxHp||3,en:opt.en!=null?opt.en:(opt.maxEn||1),maxEn:opt.maxEn||1,sq:0,land:0,push:false,wcd:0};
  s.cp={x:sp.x,y:sp.y};s.shrine={x:sp.x,y:sp.y};
  return s;
}
function clone(s){return structuredClone(s);}

// ---------- tiles ----------
function tile(st,s,tx,ty){if(tx<0||tx>=st.w)return 1;if(ty<0||ty>=st.h)return 0;return s.g[ty*st.w+tx];}
function doorOpen(st,s,idx){var g=st.door[idx];return !!s.open[g];}
function solidT(st,s,tx,ty){
  if(tx<0||tx>=st.w)return true;if(ty<0||ty>=st.h)return false;
  var i=ty*st.w+tx,t=s.g[i];
  if(t===1||t===2||t===6)return true;
  if(t===7)return !doorOpen(st,s,i);
  if(t===5)return s.col[i]>=0;
  return false;
}
function isWater(st,s,x,y){var tx=Math.floor(x),ty=Math.floor(y);if(tx<0||tx>=st.w||ty<0||ty>=st.h)return false;var t=s.g[ty*st.w+tx];return t===8||(t===9&&s.flood);}
function rectSolid(st,s,x0,y0,x1,y1){
  var a=Math.floor(x0),b=Math.floor(x1-1e-6),c=Math.floor(y0),d=Math.floor(y1-1e-6);
  for(var ty=c;ty<=d;ty++)for(var tx=a;tx<=b;tx++)if(solidT(st,s,tx,ty))return true;return false;
}
function rectCrate(s,x0,y0,x1,y1,skip){for(var i=0;i<s.crates.length;i++){if(i===skip)continue;var c=s.crates[i];if(x1>c.x-0.45&&x0<c.x+0.45&&y1>c.y-0.45&&y0<c.y+0.45)return i;}return -1;}
function onewayBelow(st,s,x0,x1,oldB,newB){
  var ty=Math.floor(newB);if(ty<0||ty>=st.h)return -1;if(oldB>ty+0.02)return -1;
  for(var tx=Math.floor(x0);tx<=Math.floor(x1-1e-6);tx++){var t=tile(st,s,tx,ty);if(t===3)return ty;}
  return -1;
}

// ---------- crates ----------
function crateMoveX(st,s,i,dx){
  var c=s.crates[i];var nx=c.x+dx;
  if(rectSolid(st,s,nx-0.45,c.y-0.45,nx+0.45,c.y+0.45)||rectCrate(s,nx-0.45,c.y-0.45,nx+0.45,c.y+0.45,i)>=0)return 0;
  c.x=nx;return dx;
}
function stepCrates(st,s,dt){
  for(var i=0;i<s.crates.length;i++){var c=s.crates[i];
    var wet=isWater(st,s,c.x,c.y);
    if(wet){c.vy+=(-14-c.vy*3)*dt;if(!isWater(st,s,c.x,c.y-0.3))c.vy*=0.8;} else c.vy=Math.min(c.vy+40*dt,16);
    var ny=c.y+c.vy*dt;
    if(c.vy>0){
      var hit=rectSolid(st,s,c.x-0.45,ny-0.45,c.x+0.45,ny+0.45)||onewayBelow(st,s,c.x-0.45,c.x+0.45,c.y+0.45,ny+0.45)>=0;
      var cj=rectCrate(s,c.x-0.45,ny-0.45,c.x+0.45,ny+0.45,i);
      if(hit){ny=Math.floor(ny+0.45)-0.45-1e-4;c.vy=0;} else if(cj>=0){ny=s.crates[cj].y-0.9-1e-4;c.vy=0;}
    } else if(c.vy<0){ if(rectSolid(st,s,c.x-0.45,ny-0.45,c.x+0.45,ny+0.45)){ny=Math.floor(ny-0.45)+1+0.45+1e-4;c.vy=0;} }
    c.y=ny;
    if(c.y>st.h+3){c.x=c.x0;c.y=c.y0;c.vy=0;s.ev.push(['crateReset']);}
  }
}

// ---------- player movement ----------
function moveP(st,s,dx,dy,inp){
  var p=s.p,res={hx:0,hy:0};
  if(dx){var nx=p.x+dx;
    if(rectSolid(st,s,nx-HW,p.y-HH,nx+HW,p.y+HH)){ if(dx>0)nx=Math.floor(nx+HW)-HW-1e-4;else nx=Math.floor(nx-HW)+1+HW+1e-4; if(rectSolid(st,s,nx-HW,p.y-HH,nx+HW,p.y+HH))nx=p.x; res.hx=dx>0?1:-1;}
    var ci=rectCrate(s,nx-HW,p.y-HH,nx+HW,p.y+HH,-1);
    if(ci>=0){var c=s.crates[ci];
      if(p.y+HH>c.y-0.4){ // side contact -> push
        if(p.gr){crateMoveX(st,s,ci,dx);p.push=true;}
        if(dx>0)nx=Math.min(nx,c.x-0.45-HW-1e-4);else nx=Math.max(nx,c.x+0.45+HW+1e-4);
        res.hx=dx>0?1:-1;
      }
    }
    p.x=nx;
  }
  if(dy){var ny=p.y+dy;
    if(rectSolid(st,s,p.x-HW,ny-HH,p.x+HW,ny+HH)){ if(dy>0){ny=Math.floor(ny+HH)-HH-1e-4;res.hy=1;} else {ny=Math.floor(ny-HH)+1+HH+1e-4;res.hy=-1;} if(rectSolid(st,s,p.x-HW,ny-HH,p.x+HW,ny+HH)){ny=p.y;} }
    else if(dy>0&&!(inp.y>0.6&&inp.jump)){var ow=onewayBelow(st,s,p.x-HW,p.x+HW,p.y+HH,ny+HH);if(ow>=0){ny=ow-HH-1e-4;res.hy=1;}}
    var ci=rectCrate(s,p.x-HW+0.05,ny-HH,p.x+HW-0.05,ny+HH,-1);
    if(ci>=0){var c=s.crates[ci];if(dy>0&&p.y+HH<=c.y-0.45+0.05){ny=c.y-0.45-HH-1e-4;res.hy=1;}else if(dy<0&&p.y-HH>=c.y+0.4){ny=c.y+0.45+HH+1e-4;res.hy=-1;}}
    p.y=ny;
  }
  return res;
}
function clingable(st,s,tx,ty){if(tx<0||tx>=st.w)return true;if(ty<0||ty>=st.h)return false;var t=s.g[ty*st.w+tx];if(t===2)return false;return solidT(st,s,tx,ty);}
function wallSide(st,s){
  var p=s.p,y0=Math.floor(p.y-HH+0.1),y1=Math.floor(p.y+HH-0.1);
  var r=Math.floor(p.x+HW+0.06),l=Math.floor(p.x-HW-0.06);
  for(var ty=y0;ty<=y1;ty++){if(clingable(st,s,r,ty))return 1;}
  for(ty=y0;ty<=y1;ty++){if(clingable(st,s,l,ty))return -1;}
  return 0;
}
function los(st,s,x0,y0,x1,y1){var d=Math.hypot(x1-x0,y1-y0),n=Math.ceil(d*3);for(var i=1;i<n;i++){var f=i/n;if(solidT(st,s,Math.floor(x0+(x1-x0)*f),Math.floor(y0+(y1-y0)*f)))return false;}return true;}

function hurt(st,s,respawn,why){
  var p=s.p;
  if(!respawn&&p.inv>0)return;
  p.hp--;s.stats.hits=(s.stats.hits||0)+1;
  s.ev.push(['hurt',why||'']);
  if(p.hp<=0){p.hp=p.maxHp;p.en=p.maxEn;s.stats.deaths=(s.stats.deaths||0)+1;s.ev.push(['die']);toPoint(st,s,s.shrine);}
  else if(respawn){toPoint(st,s,s.cp);p.inv=1.2;}
  else {p.inv=1.2;p.vy=-9;p.vx=-p.face*6;p.lock=0.15;p.dashT=0;p.grap=-1;p.aim=null;}
}
function toPoint(st,s,pt){
  var p=s.p;p.x=pt.x;p.y=pt.y;p.vx=p.vy=0;p.dashT=p.bashT=0;p.aim=null;p.grap=-1;p.lock=0;p.inv=1.0;p.cling=0;p.glide=false;
  s.crates.forEach(function(c){c.x=c.x0;c.y=c.y0;c.vy=0;});
  s.seeds=s.seeds.filter(function(q){return false;});
  for(var i=0;i<s.col.length;i++)if(s.col[i]!==0)s.col[i]=0;
  if(s.chase&&!s.chase.done){s.chase=null;}
  s.ev.push(['respawn']);
}

// ---------- beams / doors ----------
var DX=[1,0,-1,0],DY=[0,-1,0,1]; // 0 right,1 up,2 left,3 down
function traceBeams(st,s){
  s.beams=[];var hitR={};
  var mir={};s.e.forEach(function(e,i){if(e.t==='M')mir[Math.floor(e.y)*st.w+Math.floor(e.x)]=e;if(e.t==='R')hitR[Math.floor(e.y)*st.w+Math.floor(e.x)]=e;e.lit&&(e.lit=false);});
  s.e.forEach(function(em){if(em.t!=='K')return;
    var x=Math.floor(em.x),y=Math.floor(em.y),d=em.d||0,pts=[[em.x,em.y]];
    for(var n=0;n<400;n++){x+=DX[d];y+=DY[d];
      if(x<0||y<0||x>=st.w||y>=st.h){pts.push([x+0.5,y+0.5]);break;}
      var idx=y*st.w+x,m=mir[idx];
      if(m){pts.push([x+0.5,y+0.5]);if(m.st===0)d=[1,0,3,2][d];else d=[3,2,1,0][d];continue;}
      var r=hitR[idx];if(r){r.lit=true;pts.push([x+0.5,y+0.5]);break;}
      if(solidT(st,s,x,y)&&s.g[idx]!==3){pts.push([x+0.5-DX[d]*0.5,y+0.5-DY[d]*0.5]);break;}
      if(rectCrate(s,x+0.2,y+0.2,x+0.8,y+0.8,-1)>=0){pts.push([x+0.5,y+0.5]);break;}
    }
    s.beams.push(pts);
  });
}
function updateDoors(st,s){
  var trig={};
  s.e.forEach(function(e){
    if(e.t==='_'){var on=rectCrate(s,e.x-0.5,e.y-0.1,e.x+0.5,e.y+0.5,-1)>=0;e.on=on;trig[e.g]=(trig[e.g]!==false)&&on;}
    if(e.t==='R'){trig[e.g]=(trig[e.g]!==false)&&!!e.lit;}
  });
  for(var g in trig){if(trig[g]&&s.latch.indexOf(+g)<0){s.latch.push(+g);s.ev.push(['door',+g]);}}
  s.open={};s.latch.forEach(function(g){s.open[g]=true;});
}

function near(p,e,r){var dx=p.x-e.x,dy=p.y-e.y;return dx*dx+dy*dy<r*r;}
function rnd(s){s.rng=(s.rng*1103515245+12345)&0x7fffffff;return s.rng/0x7fffffff;}

// ---------- main step ----------
function step(st,s,inp,dt){
  dt=dt||1/60;s.ev.length=0;s.exit=null;
  var p=s.p,ab=s.ab;
  var wdt=p.aim?dt*0.08:dt; s.t+=wdt;
  traceBeams(st,s);updateDoors(st,s);
  p.inv=Math.max(0,p.inv-dt);p.lock=Math.max(0,p.lock-dt);p.dcd=Math.max(0,p.dcd-dt);p.sq*=Math.pow(0.0001,dt);
  p.push=false;
  // ---- bash aim ----
  if(p.aim){
    p.aimT+=dt;var tg=bashTarget(s,p.aim);
    if(!tg){p.aim=null;} else {
      p.x+= (tg.x-p.x)*Math.min(1,dt*12);p.y+=(tg.y-p.y)*Math.min(1,dt*12);p.vx=p.vy=0;
      var mx=inp.x,my=inp.y,ml=Math.hypot(mx,my);
      if(ml>0.35){p.ax=mx/ml;p.ay=my/ml;}
      if(!inp.bash||p.aimT>2.5){
        p.vx=p.ax*K.BASH;p.vy=p.ay*K.BASH;p.bashT=0.2;p.jumps=0;p.canDash=true;p.nocl=0;p.cling=0;p.lock=0.12;
        if(p.ax)p.face=p.ax>0?1:-1;
        if(p.aim.k==='s'){tg.vx=-p.ax*15;tg.vy=-p.ay*15;tg.friend=true;tg.life=4;}
        if(tg.t==='e'){tg.hp-=1;tg.stun=1;if(tg.hp<=0){tg.dead=true;s.ev.push(['enemyDie',tg.x,tg.y]);}}
        p.aim=null;s.stats.bashes=(s.stats.bashes||0)+1;s.ev.push(['bash',p.x,p.y]);
        // nudge out of solids
        if(rectSolid(st,s,p.x-HW,p.y-HH,p.x+HW,p.y+HH)){p.y-=0.5;}
      }
      stepWorld(st,s,wdt,inp);return s;
    }
  }
  if(ab.bash&&inp.bashP&&!p.aim){
    var best=null,bd=K.BASHR;
    s.e.forEach(function(e,i){if((e.t==='L'||(e.t==='e'&&!e.dead))){var d=Math.hypot(e.x-p.x,e.y-p.y);if(d<bd){bd=d;best={k:'e',i:i};}}});
    s.seeds.forEach(function(q,i){if(q.friend)return;var d=Math.hypot(q.x-p.x,q.y-p.y);if(d<bd){bd=d;best={k:'s',i:i,id:q.id};}});
    if(best){p.aim=best;p.aimT=0;p.ax=0;p.ay=-1;p.dashT=0;p.grap=-1;s.ev.push(['aim']);stepWorld(st,s,dt*0.08,inp);return s;}
  }
  // ---- grapple ----
  if(ab.grapple&&inp.grapP&&p.grap<0){
    var gb=-1,gd=K.GRAPR;
    s.e.forEach(function(e,i){if(e.t==='G'){var d=Math.hypot(e.x-p.x,e.y-p.y);if(d<gd&&d>0.8&&los(st,s,p.x,p.y,e.x,e.y)){gd=d;gb=i;}}});
    if(gb>=0){p.grap=gb;p.grapT=0;p.dashT=0;p.cling=0;s.stats.grapples=(s.stats.grapples||0)+1;s.ev.push(['grap',s.e[gb].x,s.e[gb].y]);}
  }
  if(p.grap>=0){
    var an=s.e[p.grap];p.grapT+=dt;var gx=an.x-p.x,gy=an.y-p.y,gl=Math.hypot(gx,gy)||1;
    var ux=gx/gl,uy=gy/gl;
    if(gl<0.7||p.grapT>0.9){
      p.vx=ux*14;p.vy=uy*14-7;p.grap=-1;p.jumps=0;p.canDash=true;p.nocl=0;p.bashT=0.12;p.lock=0.1;s.ev.push(['grapEnd']);
    } else {
      p.vx=ux*25;p.vy=uy*25;var ox=p.x,oy=p.y;var r=subMove(st,s,dt,inp);
      if(Math.hypot(p.x-ox,p.y-oy)<0.05){p.grap=-1;p.jumps=0;p.canDash=true;}
      after(st,s,inp,dt,r);stepWorld(st,s,dt,inp);return s;
    }
  }
  // ---- normal movement ----
  var wet=isWater(st,s,p.x,p.y);
  if(wet&&!p.water){s.ev.push(['splash',p.x,p.y]);p.dashT=0;}
  if(!wet&&p.water&&p.vy<0)s.ev.push(['splash',p.x,p.y]);
  p.water=wet;
  if(inp.x>0.3)p.face=1;else if(inp.x<-0.3)p.face=-1;
  p.jb=inp.jumpP?0.12:Math.max(0,p.jb-dt);
  // dash
  if(ab.dash&&inp.dashP&&p.canDash&&p.dcd<=0){
    var dd=Math.abs(inp.x)>0.3?(inp.x>0?1:-1):p.face;p.face=dd;
    p.dashT=K.DASHT;p.vx=dd*K.DASH;p.vy=wet?inp.y*8:0;p.canDash=wet;p.dcd=0.28;p.cling=0;p.glide=false;
    s.stats.dashes=(s.stats.dashes||0)+1;s.ev.push(['dash',p.x,p.y,dd]);
  }
  p.glide=false;
  if(p.dashT>0){
    p.dashT-=dt;if(!wet)p.vy=0;
    // break brambles
    var bx=Math.floor(p.x+p.face*(HW+0.35)),y0=Math.floor(p.y-HH),y1=Math.floor(p.y+HH);
    for(var ty=y0;ty<=y1;ty++){if(tile(st,s,bx,ty)===6){s.g[ty*st.w+bx]=0;s.ev.push(['bramble',bx+0.5,ty+0.5]);
      for(var yy=ty-3;yy<=ty+3;yy++)if(tile(st,s,bx,yy)===6){s.g[yy*st.w+bx]=0;s.ev.push(['bramble',bx+0.5,yy+0.5]);}}}
    if(p.dashT<=0){p.vx*=0.45;}
  } else if(wet){
    var tx=inp.x*K.SWIM,ty2=inp.y*K.SWIM-0.6;
    p.vx+=(tx-p.vx)*Math.min(1,dt*5);p.vy+=(ty2-p.vy)*Math.min(1,dt*5);
    p.jumps=0;p.canDash=true;p.nocl=0;p.clx=-99;
    if(p.jb>0&&!isWater(st,s,p.x,p.y-0.75)){p.vy=-14;p.jb=0;p.jumps=0;s.ev.push(['jump',p.x,p.y]);s.stats.jumps=(s.stats.jumps||0)+1;}
  } else {
    var target=inp.x*K.RUN;if(Math.abs(inp.x)<0.2)target=0;
    if(p.lock<=0&&p.bashT<=0){var acc=p.gr?(target===0?60:75):42;var dv=target-p.vx;var m=acc*dt;p.vx+=Math.max(-m,Math.min(m,dv));}
    else if(p.bashT>0){p.vx+= (target-p.vx)*dt*1.5;}
    if(p.push)p.vx=Math.max(-3,Math.min(3,p.vx));
    var g=K.GRAV*(p.bashT>0?0.35:1);
    p.bashT=Math.max(0,p.bashT-dt);
    var updr=st.upd[Math.floor(p.y)*st.w+Math.floor(p.x)]&&p.y>0;
    var gliding=ab.glide&&inp.jump&&p.vy>-1&&!p.gr&&!p.cling&&p.bashT<=0;
    if(gliding){p.glide=true;if(updr){p.vy=Math.max(p.vy-80*dt,-9.5);}else{p.vy=Math.min(p.vy+g*dt,K.GLIDE);if(p.vy>K.GLIDE)p.vy=K.GLIDE;}}
    else {p.vy=Math.min(p.vy+g*dt,K.MAXFALL);}
    if(p.cling)p.vy=Math.min(p.vy,K.SLIDE);
    // jumping
    if(p.jb>0){
      if(p.gr||p.co>0){p.vy=-K.JUMP;p.cut=true;p.jb=0;p.co=0;p.gr=false;p.sq=0.35;s.ev.push(['jump',p.x,p.y]);s.stats.jumps=(s.stats.jumps||0)+1;}
      else if(p.cling||p.wcd>0){var side=p.cling||p.wall;p.vx=-side*K.WJX;p.vy=-K.WJY;p.lock=0.13;p.face=-side;p.nocl=side;p.cling=0;p.wcd=0;p.jb=0;p.cut=false;s.ev.push(['walljump',p.x,p.y]);s.stats.jumps=(s.stats.jumps||0)+1;}
      else if(ab.dj&&p.jumps<1&&inp.jumpP){p.vy=-K.DJ;p.jumps=1;p.jb=0;p.cut=false;p.sq=0.3;s.ev.push(['djump',p.x,p.y]);s.stats.jumps=(s.stats.jumps||0)+1;}
    }
    if(p.cut&&!inp.jump&&p.vy<-4){p.vy*=0.5;p.cut=false;}
    if(p.vy>=0)p.cut=false;
  }
  var r=subMove(st,s,dt,inp);
  after(st,s,inp,dt,r);
  stepWorld(st,s,dt,inp);
  return s;
}
function subMove(st,s,dt,inp){
  var p=s.p,n=Math.max(1,Math.ceil(Math.max(Math.abs(p.vx),Math.abs(p.vy))*dt/0.35)),hx=0,hy=0;
  for(var i=0;i<n;i++){var r=moveP(st,s,p.vx*dt/n,p.vy*dt/n,inp);if(r.hx){hx=r.hx;}if(r.hy){hy=r.hy;}}
  if(hx&&p.grap<0){if(p.dashT<=0)p.vx=0;}
  if(hy){if(hy>0&&p.vy>6){p.sq=-Math.min(0.4,p.vy/40);s.ev.push(['land',p.x,p.y+HH,p.vy]);}p.vy=0;if(hy<0&&p.grap>=0)p.grap=-1;}
  return {hx:hx,hy:hy};
}
function after(st,s,inp,dt,r){
  var p=s.p;
  // ground check
  var wasGr=p.gr;
  p.gr=!p.water&&(r.hy>0||(p.vy>=0&&(rectSolid(st,s,p.x-HW,p.y+HH,p.x+HW,p.y+HH+0.06)||rectCrate(s,p.x-HW+0.05,p.y+HH,p.x+HW-0.05,p.y+HH+0.06,-1)>=0||onewayBelow(st,s,p.x-HW,p.x+HW,p.y+HH-0.01,p.y+HH+0.05)>=0)));
  if(p.gr){p.jumps=0;p.canDash=true;p.nocl=0;p.co=0.1;p.cling=0;p.clx=-99;
    // collapse trigger
    var by=Math.floor(p.y+HH+0.05);for(var tx=Math.floor(p.x-HW);tx<=Math.floor(p.x+HW-1e-6);tx++){var idx=by*st.w+tx;if(tile(st,s,tx,by)===5&&s.col[idx]===0){s.col[idx]=0.0001;s.ev.push(['crack',tx+0.5,by+0.5]);}}
  } else p.co=Math.max(0,p.co-dt);
  p.wall=wallSide(st,s);
  p.wcd=Math.max(0,p.wcd-dt);
  if(!p.gr&&!p.water&&p.wall&&p.grap<0&&p.dashT<=0&&p.bashT<=0.05&&p.wall!==p.nocl&&(inp.x*p.wall>0.3||(p.cling&&inp.x*p.wall>-0.3))&&p.vy>-2){
    if(!p.cling)s.ev.push(['cling']);p.cling=p.wall;p.wcd=0.1;var wx=Math.floor(p.x+p.wall*(HW+0.06));if(p.clx!==wx){p.clx=wx;p.jumps=0;p.canDash=true;}
    if(p.nocl&&p.nocl!==p.wall)p.nocl=0;
  } else p.cling=0;
  if(p.cling&&p.nocl===-p.cling)p.nocl=0;
}
function bashTarget(s,a){if(a.k==='e')return s.e[a.i];for(var i=0;i<s.seeds.length;i++)if(s.seeds[i].id===a.id)return s.seeds[i];return null;}

function stepWorld(st,s,dt,inp){
  var p=s.p;
  stepCrates(st,s,dt);
  // collapse timers
  for(var i=0;i<s.col.length;i++){var c=s.col[i];if(c>0){c+=dt;if(c>0.5){c=-3.2;s.ev.push(['collapse',i%st.w+0.5,((i/st.w)|0)+0.5]);}s.col[i]=c;}
    else if(c<0){c+=dt;if(c>=0){var tx=i%st.w,ty=(i/st.w)|0;if(rectSolid(st,s,0,0,0,0)||(p.x+HW>tx&&p.x-HW<tx+1&&p.y+HH>ty&&p.y-HH<ty+1))c=-0.2;else c=0;}s.col[i]=c;}}
  // enemies & seeds
  s.e.forEach(function(e){
    if(e.t==='e'&&!e.dead){
      e.stun=Math.max(0,(e.stun||0)-dt);
      var d=Math.hypot(p.x-e.x,p.y-e.y);
      if(d<11&&e.stun<=0){e.cd-=dt;if(e.cd<=0){e.cd=2.4;var ux=(p.x-e.x)/d,uy=(p.y-0.2-e.y)/d;s.sid=(s.sid||0)+1;s.seeds.push({id:s.sid,x:e.x,y:e.y-0.3,vx:ux*5.5,vy:uy*5.5,life:4,friend:false,r:0.3});s.ev.push(['spit',e.x,e.y]);}}
      if(d<0.75)hurt(st,s,false,'enemy');
    }
  });
  var b=s.boss;
  if(b&&b.hp>0){
    if(!b.on&&p.x>b.ax0){b.on=true;s.ev.push(['bossOn']);}
    if(b.on){b.t+=dt;b.fl=Math.max(0,b.fl-dt);
      b.x=(b.ax0+b.ax1)/2+Math.sin(b.t*0.45)*(b.ax1-b.ax0)*0.38;b.y=b.by+Math.sin(b.t*1.3)*1.2;
      b.cd-=dt;if(b.cd<=0&&b.fl<=0){var nseed=4-b.hp;b.cd=[0,2.0,2.5,2.9][b.hp];
        for(var k=0;k<nseed;k++){s.sid=(s.sid||0)+1;s.seeds.push({id:s.sid,x:b.x+(k-(nseed-1)/2)*1.6,y:b.y+1.5,vx:(k-(nseed-1)/2)*0.8,vy:1.4,life:8,friend:false,r:0.45,boss:true});}
        s.ev.push(['bossSeed',b.x,b.y]);}
    }
  }
  for(i=s.seeds.length-1;i>=0;i--){var q=s.seeds[i];q.life-=dt;
    if(q.boss&&!q.friend){q.vx+=((p.x>q.x?1:-1)*1.2-q.vx)*dt*0.6;q.vy=Math.min(q.vy+0.3*dt,2.2);}
    if(q.friend&&b&&b.hp>0){var bx=b.x-q.x,by=b.y-q.y,bl=Math.hypot(bx,by);if(q.boss){q.vx+=bx/bl*30*dt;q.vy+=by/bl*30*dt;var sp=Math.hypot(q.vx,q.vy);if(sp>16){q.vx*=16/sp;q.vy*=16/sp;}}
      if(bl<1.8){b.hp--;b.fl=1.6;b.cd=2.2;s.seeds=[];s.ev.push(['bossHit',b.hp]);if(b.hp<=0){s.won=true;s.ev.push(['bossDone']);}break;}}
    q.x+=q.vx*dt;q.y+=q.vy*dt;
    if(q.friend){s.e.forEach(function(e){if(e.t==='e'&&!e.dead&&Math.hypot(e.x-q.x,e.y-q.y)<0.8){e.dead=true;q.life=0;s.ev.push(['enemyDie',e.x,e.y]);}});}
    if(q.life<=0||solidT(st,s,Math.floor(q.x),Math.floor(q.y))){s.seeds.splice(i,1);s.ev.push(['pop',q.x,q.y]);continue;}
    if(!q.friend&&!p.aim&&Math.hypot(q.x-p.x,q.y-p.y)<q.r+0.35){s.seeds.splice(i,1);hurt(st,s,false,'seed');}
  }
  // hazards
  var tx0=Math.floor(p.x-HW+0.12),tx1=Math.floor(p.x+HW-0.12),ty0=Math.floor(p.y-HH+0.15),ty1=Math.floor(p.y+HH-0.1);
  outer:for(var ty=ty0;ty<=ty1;ty++)for(var tx=tx0;tx<=tx1;tx++)if(tile(st,s,tx,ty)===4){hurt(st,s,true,'thorn');break outer;}
  if(p.y>st.h+1.5)hurt(st,s,true,'fall');
  // chase
  if(s.chase&&s.chase.on){var ch=s.chase;ch.pos+=(ch.dir==='up'?-1:1)*ch.speed*dt;
    if(ch.dir==='right'&&p.x-0.3<ch.pos)hurt(st,s,true,'chase');
    if(ch.dir==='up'&&p.y+0.4>ch.pos)hurt(st,s,true,'chase');
  }
  // entities
  for(i=0;i<s.e.length;i++){var e=s.e[i];if(e.got)continue;
    switch(e.t){
      case 'o':if(near(p,e,0.8)){e.got=true;s.stats.light=(s.stats.light||0)+1;s.ev.push(['orb',e.x,e.y,i]);}break;
      case 'H':if(near(p,e,0.9)){e.got=true;p.maxHp++;p.hp=p.maxHp;s.ev.push(['hcell',e.x,e.y,i]);}break;
      case 'E':if(near(p,e,0.9)){e.got=true;p.maxEn++;p.en=p.maxEn;s.ev.push(['ecell',e.x,e.y,i]);}break;
      case 'A':if(near(p,e,1.0)){e.got=true;s.ab[e.ab]=true;s.ev.push(['ability',e.ab,i]);}break;
      case 'c':if(near(p,e,1.2)&&!(s.chase&&s.chase.on)){s.cp={x:e.x,y:e.y};}break;
      case 'S':if(near(p,e,1.3)&&!(s.chase&&s.chase.on)){if(s.shrine.x!==e.x||s.shrine.y!==e.y||p.hp<p.maxHp){s.ev.push(['shrine',e.x,e.y,i]);}s.shrine={x:e.x,y:e.y};s.cp={x:e.x,y:e.y};p.hp=p.maxHp;p.en=p.maxEn;}break;
      case 'X':if(near(p,e,0.8))s.exit='next';break;
      case 'x':if(near(p,e,0.8))s.exit='prev';break;
      case 'Z':if(!s.chaseDone&&!(s.chase)){var trig=e.dir==='up'?near(p,e,1.4):(p.x>e.x&&Math.abs(p.y-e.y)<4);
        if(trig){s.chase={on:true,dir:e.dir,speed:e.speed,pos:e.dir==='up'?e.y+e.lead:e.x-e.lead};s.cp={x:e.x,y:e.y};s.ev.push(['chase']);}}break;
      case 'z':if(s.chase&&s.chase.on&&near(p,e,1.6)){s.chase.on=false;s.chase.done=true;s.chaseDone=true;s.cp={x:e.x,y:e.y};s.ev.push(['chaseDone']);}break;
    }
  }
  // interactables (use)
  s.use=null;var ub=2.6;
  for(i=0;i<s.e.length;i++){e=s.e[i];if(e.t==='M'||e.t==='v'){var d=Math.hypot(e.x-p.x,e.y-p.y);if(d<ub){ub=d;s.use=i;}}}
  if(inp.useP&&s.use!=null){e=s.e[s.use];if(e.t==='M'){e.st=1-e.st;s.ev.push(['mirror',e.x,e.y]);}else{s.flood=!s.flood;s.ev.push(['lever',s.flood]);}}
  // flare
  if(inp.flareP&&p.en>=1){p.en--;s.ev.push(['flare',p.x,p.y]);
    s.e.forEach(function(e){if(e.t==='e'&&!e.dead&&Math.hypot(e.x-p.x,e.y-p.y)<4){e.dead=true;s.ev.push(['enemyDie',e.x,e.y]);}});
    s.seeds=s.seeds.filter(function(q){return Math.hypot(q.x-p.x,q.y-p.y)>=4||q.boss;});
  }
}

root.TD_SIM={build:build,create:create,step:step,clone:clone,isWater:isWater,solidT:solidT,tile:tile,K:K,HW:HW,HH:HH,CH:CH};
})(typeof window!=='undefined'?window:globalThis);
