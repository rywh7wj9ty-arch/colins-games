// Thistledown - painterly Canvas2D renderer (all procedural).
(function(root){
'use strict';
var PAL=[
 {sky:['#86dbe2','#e4f8d4'],far:'#79c3c6',mid:'#4f9ea4',gr:['#3f8e96','#2e7380'],moss:'#9be77f',glow:'#fff3b0',tint:'#bff7e0'},
 {sky:['#8ccdf2','#e2f4ff'],far:'#7cb6dc',mid:'#5590c0',gr:['#4580b0','#356a98'],moss:'#86ead6',glow:'#d4f8ff',tint:'#c6ecff'},
 {sky:['#a2def0','#fff4cf'],far:'#93c9c9',mid:'#68a3a0',gr:['#4f928a','#3c7a74'],moss:'#d0ec80',glow:'#ffe7a0',tint:'#fff1c4'},
 {sky:['#adcaf9','#f4e2ff'],far:'#9eb2ec',mid:'#7a8bd0',gr:['#5c74b6','#4a62a0'],moss:'#b2f2ff',glow:'#f4d8ff',tint:'#e8dcff'},
 {sky:['#a2eacf','#fff3c6'],far:'#84cfb4',mid:'#59a594',gr:['#4a9282','#3a7c6e'],moss:'#f2e488',glow:'#fff7b8',tint:'#fff4cc'}
];
var MOOD=[
 {tint:'rgba(255,214,120,0.10)',beam:'255,236,170',mist:'255,246,214',fog:'#f7e6b8',cave:0,wind:1.0},
 {tint:'rgba(120,220,230,0.10)',beam:'210,250,255',mist:'226,250,255',fog:'#c8eef2',cave:0,wind:0.7},
 {tint:'rgba(255,200,160,0.08)',beam:'255,240,200',mist:'255,244,232',fog:'#fbe4d0',cave:0,wind:1.8},
 {tint:'rgba(200,170,255,0.10)',beam:'236,220,255',mist:'240,232,255',fog:'#e6dcff',cave:1,wind:0.5},
 {tint:'rgba(255,226,140,0.12)',beam:'255,244,190',mist:'255,250,220',fog:'#fff0c0',cave:0,wind:0.8}
];
var R={q:2,pal:PAL,mood:MOOD,shakeOn:true,dbg:{}};
var grass=[],vines=[],branches=[],ripples=[],leaves=[],dust=[],ghosts=[],lastP=null;
var cv,c,W,H,TS,cam={x:0,y:0},layers=null,terr=null,terrTS=24,parts=[],ffl=[],trail=[],tail=[],shake=0,flash=0,t=0;
function rng(seed){var s=seed|0||1;return function(){s=(s*16807)%2147483647;return (s-1)/2147483646;};}
R.init=function(canvas){cv=canvas;c=cv.getContext('2d');};
R.resize=function(){var dpr=Math.max(0.75,Math.min(root.devicePixelRatio||1,[1,1.5,2][R.q]||2)*(R.as||1));W=cv.width=Math.round(innerWidth*dpr);H=cv.height=Math.round(innerHeight*dpr);TS=H/14.5;if(W/TS<20)TS=W/20;layers=null;};
R.ts=function(){return TS;};
// ---------- prerender ----------
function blobTree(g,x,base,h,col,r){g.fillStyle=col;g.beginPath();g.moveTo(x-h*0.05,base);g.quadraticCurveTo(x-h*0.02,base-h*0.5,x-h*0.012,base-h*0.9);g.lineTo(x+h*0.012,base-h*0.9);g.quadraticCurveTo(x+h*0.02,base-h*0.5,x+h*0.05,base);g.fill();
  for(var i=0;i<7;i++){var a=r()*Math.PI*2,d=r()*h*0.22;g.beginPath();g.arc(x+Math.cos(a)*d*1.4,base-h*0.9+Math.sin(a)*d*0.7,h*(0.12+r()*0.12),0,7);g.fill();}}
function mkLayers(ai){
  var P=PAL[ai],L={},lw=Math.round(W*1.6),lh=H;
  function cnv(){var k=document.createElement('canvas');k.width=lw;k.height=lh;return k;}
  // sky
  var s=cnv(),g=s.getContext('2d');var gr=g.createLinearGradient(0,0,0,lh);gr.addColorStop(0,P.sky[0]);gr.addColorStop(1,P.sky[1]);g.fillStyle=gr;g.fillRect(0,0,lw,lh);
  var sg=g.createRadialGradient(lw*0.62,lh*0.18,0,lw*0.62,lh*0.18,lh*0.8);sg.addColorStop(0,'rgba(255,250,220,0.9)');sg.addColorStop(0.3,'rgba(255,245,200,0.3)');sg.addColorStop(1,'rgba(255,245,200,0)');g.fillStyle=sg;g.fillRect(0,0,lw,lh);
  L.sky=s;
  // distant peaks (layer 2)
  var r0=rng(ai*53+11),dp=cnv();g=dp.getContext('2d');g.globalAlpha=0.38;g.fillStyle=P.far;g.beginPath();g.moveTo(0,lh);
  for(var x0=0;x0<=lw;x0+=lw/24){g.lineTo(x0,lh*(0.42+r0()*0.2));}g.lineTo(lw,lh);g.fill();
  g.globalAlpha=0.5;g.fillStyle='rgba(255,255,255,0.7)';for(var c0=0;c0<6;c0++){var cx0=r0()*lw,cy0=lh*(0.12+r0()*0.2);for(var c1=0;c1<5;c1++){g.beginPath();g.arc(cx0+c1*lh*0.05,cy0+Math.sin(c1)*lh*0.015,lh*(0.04+r0()*0.03),0,7);g.fill();}}
  L.dist=dp;
  // far hills + trees
  var r=rng(ai*97+3);
  var f=cnv();g=f.getContext('2d');g.globalAlpha=0.55;
  for(var i=0;i<14;i++)blobTree(g,r()*lw,lh*(0.78+r()*0.1),lh*(0.55+r()*0.35),P.far,r);
  g.fillStyle=P.far;g.beginPath();g.moveTo(0,lh);for(var x=0;x<=lw;x+=20)g.lineTo(x,lh*0.78+Math.sin(x/lw*Math.PI*4+ai)*lh*0.04+Math.sin(x/lw*Math.PI*10)*lh*0.015);g.lineTo(lw,lh);g.fill();
  // seamless: copy edge
  L.far=f;
  var m=cnv();g=m.getContext('2d');g.globalAlpha=0.8;
  for(i=0;i<9;i++)blobTree(g,r()*lw,lh*(0.95+r()*0.05),lh*(0.7+r()*0.4),P.mid,r);
  g.fillStyle=P.mid;g.beginPath();g.moveTo(0,lh);for(x=0;x<=lw;x+=20)g.lineTo(x,lh*0.9+Math.sin(x/lw*Math.PI*6+ai*2)*lh*0.03);g.lineTo(lw,lh);g.fill();
  L.mid=m;
  // near trunks + hanging moss (layer 5)
  var n=cnv();g=n.getContext('2d');g.globalAlpha=0.55;
  for(i=0;i<5;i++){var nx=r()*lw,nw=lh*(0.05+r()*0.04);var ng=g.createLinearGradient(nx-nw,0,nx+nw,0);ng.addColorStop(0,P.mid);ng.addColorStop(0.5,P.far);ng.addColorStop(1,P.mid);g.fillStyle=ng;g.beginPath();g.moveTo(nx-nw,lh);g.quadraticCurveTo(nx-nw*0.6,lh*0.4,nx-nw*0.5,-5);g.lineTo(nx+nw*0.5,-5);g.quadraticCurveTo(nx+nw*0.6,lh*0.4,nx+nw,lh);g.fill();
    g.strokeStyle=P.moss;g.globalAlpha=0.35;g.lineWidth=2;for(k=0;k<6;k++){var mx=nx+(r()-0.5)*nw*5,ml=lh*(0.08+r()*0.2);g.beginPath();g.moveTo(mx,0);g.quadraticCurveTo(mx+6,ml*0.5,mx,ml);g.stroke();}g.globalAlpha=0.55;}
  L.near=n;
  // foreground ferns
  var fg=cnv();g=fg.getContext('2d');g.fillStyle='rgba(60,120,120,0.30)';
  for(i=0;i<12;i++){var fh=lh*(0.06+r()*0.07),fx=fh+r()*(lw-2*fh);for(var k=0;k<7;k++){var an=-Math.PI/2+(k-3)*0.32;g.beginPath();g.ellipse(fx+Math.cos(an)*fh*0.5,lh+Math.sin(an)*fh*0.5,fh*0.55,fh*0.07,an,0,7);g.fill();}}
  // misty foreground silhouettes (big soft leaves/branches at top)
  g.fillStyle='rgba(70,130,130,0.22)';for(i=0;i<5;i++){var tx0=r()*lw,tl=lh*(0.15+r()*0.15);g.beginPath();g.ellipse(tx0,-tl*0.2,tl*0.9,tl*0.6,r()-0.5,0,7);g.fill();}
  var mf=g.createLinearGradient(0,lh*0.7,0,lh);mf.addColorStop(0,'rgba('+MOOD[ai].mist+',0)');mf.addColorStop(1,'rgba('+MOOD[ai].mist+',0.35)');g.fillStyle=mf;g.fillRect(0,lh*0.7,lw,lh*0.3);
  [s,dp,f,m,n].forEach(function(cv2){var g2=cv2.getContext('2d');g2.globalAlpha=1;g2.globalCompositeOperation='source-atop';g2.fillStyle=MOOD[ai].tint;g2.fillRect(0,0,lw,lh);});
  L.fg=fg;L.w=lw;
  return L;
}
function mkTerrain(st,ai){
  var P=PAL[ai],k=document.createElement('canvas'),T=terrTS;k.width=st.w*T;k.height=st.h*T;var g=k.getContext('2d');
  var g0=st.g0,w=st.w,h=st.h;function at(x,y){if(x<0||x>=w)return 1;if(y<0||y>=h)return 0;return g0[y*w+x];}
  function sol(v){return v===1||v===2;}
  var gr=g.createLinearGradient(0,0,0,h*T);gr.addColorStop(0,P.gr[0]);gr.addColorStop(1,P.gr[1]);
  var r=rng(ai*31+7);
  g.fillStyle=gr;
  for(var y=0;y<h;y++)for(var x=0;x<w;x++){var v=at(x,y);if(v===1){g.fillRect(x*T-0.5,y*T-0.5,T+1,T+1);}}
  // rounded bumps along exposed edges
  for(y=0;y<h;y++)for(x=0;x<w;x++){if(at(x,y)!==1)continue;
    if(!sol(at(x,y-1))){for(var j=0;j<2;j++){g.beginPath();g.arc(x*T+T*(0.25+j*0.5),y*T+T*0.35,T*(0.38+r()*0.12),0,7);g.fill();}}
    if(!sol(at(x-1,y))){g.beginPath();g.arc(x*T+T*0.3,y*T+T*0.5,T*0.42,0,7);g.fill();}
    if(!sol(at(x+1,y))){g.beginPath();g.arc(x*T+T*0.7,y*T+T*0.5,T*0.42,0,7);g.fill();}
  }
  // inner texture speckles
  g.globalAlpha=0.12;g.fillStyle='#ffffff';
  for(y=0;y<h;y++)for(x=0;x<w;x++){if(at(x,y)===1&&r()<0.35){g.beginPath();g.arc(x*T+r()*T,y*T+r()*T,T*0.08+r()*T*0.1,0,7);g.fill();}}
  g.globalAlpha=1;
  // moss and grass
  for(y=0;y<h;y++)for(x=0;x<w;x++){if(at(x,y)!==1||sol(at(x,y-1)))continue;
    g.fillStyle=P.moss;g.beginPath();g.ellipse(x*T+T/2,y*T+T*0.08,T*0.62,T*0.2,0,0,7);g.fill();

    if(r()<0.18){g.fillStyle=P.glow;g.beginPath();g.arc(x*T+r()*T,y*T-T*0.25,T*0.09,0,7);g.fill();}
  }
  // crystal (unclingable) walls
  for(y=0;y<h;y++)for(x=0;x<w;x++){if(at(x,y)!==2)continue;var cg=g.createLinearGradient(x*T,0,x*T+T,0);cg.addColorStop(0,'#cfe9ff');cg.addColorStop(0.5,'#9fc8f0');cg.addColorStop(1,'#d8f0ff');g.fillStyle=cg;g.fillRect(x*T,y*T,T,T);g.strokeStyle='rgba(255,255,255,0.7)';g.beginPath();g.moveTo(x*T+T*0.2,y*T);g.lineTo(x*T+T*0.6,y*T+T);g.stroke();}
  // one-way branches

  // thorns (soft violet, not red)
  for(y=0;y<h;y++)for(x=0;x<w;x++){if(at(x,y)!==4)continue;g.fillStyle='#b48ae0';for(var q=0;q<3;q++){g.beginPath();g.moveTo(x*T+q*T/3,y*T+T);g.lineTo(x*T+q*T/3+T/6,y*T+T*0.15);g.lineTo(x*T+(q+1)*T/3,y*T+T);g.fill();}}
  // vents
  for(y=0;y<h;y++)for(x=0;x<w;x++){if(at(x,y)!==10)continue;g.fillStyle='#f4e2a0';g.beginPath();g.ellipse(x*T+T/2,y*T+T*0.9,T*0.5,T*0.15,0,0,7);g.fill();}
  g.globalCompositeOperation='source-atop';g.fillStyle=MOOD[ai].tint;g.fillRect(0,0,k.width,k.height);g.globalCompositeOperation='source-over';
  return k;
}
R.setArea=function(st,ai){R.st=st;R.ai=ai;terr=mkTerrain(st,ai);layers=null;parts.length=0;ffl=[];var r=rng(5+ai);for(var i=0;i<60;i++)ffl.push({x:r()*st.w,y:r()*st.h,p:r()*7,s:0.3+r()*0.7});tail=[];
  grass=[];vines=[];branches=[];ripples=[];leaves=[];dust=[];ghosts=[];
  var g0=st.g0,w=st.w,h=st.h;function at(x,y){if(x<0||x>=w)return 1;if(y<0||y>=h)return 0;return g0[y*w+x];}
  for(var y=0;y<h;y++)for(var x=0;x<w;x++){var v=at(x,y);
    if(v===1&&at(x,y-1)===0){for(var b=0;b<3;b++)grass.push({x:x+0.15+b*0.33+r()*0.15,y:y,h:0.25+r()*0.4,p:r()*7,o:0,f:r()<0.12});}
    if(v===1&&at(x,y+1)===0&&r()<0.45){vines.push({x:x+0.2+r()*0.6,y:y+1,l:0.6+r()*1.6,p:r()*7,o:0,ov:0});}
    if(v===3)branches.push({x:x,y:y,b:0,bv:0});}
  // bucket grass by column for fast culling
  grass.sort(function(a,b){return a.x-b.x;});vines.sort(function(a,b){return a.x-b.x;});};
function from(arr,x0){var lo=0,hi=arr.length;while(lo<hi){var m=(lo+hi)>>1;if(arr[m].x<x0)lo=m+1;else hi=m;}return lo;}
R.ripple=function(x,y,big){ripples.push({x:x,y:y,t:0,m:big?1.2:0.7,big:big});if(ripples.length>24)ripples.shift();};
R.dust=function(x,y,n,sp,col){if(R.q===0)n=Math.ceil(n/2);for(var i=0;i<n;i++){var a=-Math.PI*Math.random();dust.push({x:x+(Math.random()-0.5)*0.4,y:y,vx:Math.cos(a)*(sp||2)*(0.5+Math.random()),vy:Math.sin(a)*(sp||2)*0.5,l:0.45,m:0.45,r:0.12+Math.random()*0.12,c:col||'rgba(255,250,235,0.75)'});}};
R.leaves=function(x,y,n,dir){var P2=PAL[R.ai];if(R.q===0)n=Math.ceil(n/2);for(var i=0;i<n;i++){leaves.push({x:x+(Math.random()-0.5),y:y+(Math.random()-0.5)*0.8,vx:dir*(2+Math.random()*4)+(Math.random()-0.5)*2,vy:-2-Math.random()*3,a:Math.random()*7,va:(Math.random()-0.5)*12,l:1.6,c:Math.random()<0.5?P2.moss:'#f6e7a0'});}if(leaves.length>80)leaves.splice(0,leaves.length-80);
  // brush nearby grass hard
  for(var j=from(grass,x-2.5);j<grass.length&&grass[j].x<x+2.5;j++){var gg=grass[j];if(Math.abs(gg.y-y)<1.6)gg.o+=dir*1.2;}};
R.snap=function(s){cam.x=s.p.x;cam.y=s.p.y;};
R.burst=function(x,y,col,n,sp,life){if(R.q===0)n=Math.ceil(n/2);for(var i=0;i<n;i++){var a=Math.random()*7,v=(0.3+Math.random())*(sp||4);parts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:life||0.8,m:life||0.8,c:col||'#fff6c0',r:0.06+Math.random()*0.1});}};
R.shake=function(v){shake=Math.max(shake,v);};R.flash=function(v){flash=Math.max(flash,v);};
var GC={},GN=0;
function glowSpr(col){var m=/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/.exec(col),key,al=1;if(m){key=m[1]+','+m[2]+','+m[3];al=+m[4];}else key=col;var k=GC[key];
  if(!k){if(GN>80){GC={};GN=0;}k=document.createElement('canvas');k.width=k.height=64;var g=k.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);var cc=m?'rgba('+key+',1)':col;gr.addColorStop(0,cc);gr.addColorStop(1,m?'rgba('+key+',0)':'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);GC[key]=k;GN++;}
  return [k,al];}
function glow(x,y,r,col,a){if(r<=0)return;var q=glowSpr(col);c.globalAlpha=(a==null?1:a)*q[1];c.drawImage(q[0],x-r,y-r,r*2,r*2);c.globalAlpha=1;}
R.draw=function(s,dt,ui){
  var st=R.st,P=PAL[R.ai],M=MOOD[R.ai],p=s.p;t+=dt;if(!layers)layers=mkLayers(R.ai);
  // camera
  var vw=W/TS,vh=H/TS;var tx=p.x+p.face*2+p.vx*0.15,ty=p.y-1;if(s.boss&&s.boss.on&&s.boss.hp>0){tx=(p.x+s.boss.x)/2;ty=(p.y+s.boss.y)/2;}
  cam.x+=(tx-cam.x)*Math.min(1,dt*4);cam.y+=(ty-cam.y)*Math.min(1,dt*4);
  cam.x=Math.max(vw/2,Math.min(st.w-vw/2,cam.x));cam.y=Math.max(vh/2-2,Math.min(st.h-vh/2,cam.y));
  shake*=Math.pow(0.02,dt);if(!R.shakeOn)shake=0;var sx=(Math.random()-0.5)*shake*TS*0.3,sy=(Math.random()-0.5)*shake*TS*0.3;
  var ox=Math.round(W/2-cam.x*TS+sx),oy=Math.round(H/2-cam.y*TS+sy);
  function X(x){return ox+x*TS;}function Y(y){return oy+y*TS;}
  // parallax background
  c.drawImage(layers.sky,0,0,layers.w,H,0,0,W*1.6/1.6*1,H);
  (R.dbg.L?[]:[[layers.dist,0.05]]).concat([[layers.far,0.15],[layers.mid,0.35]]).concat(R.q>0&&!R.dbg.N?[[layers.near,0.6]]:[]).forEach(function(L){var off=((-cam.x*TS*L[1])%layers.w+layers.w)%layers.w;var yo=(-(cam.y-st.h/2)*TS*L[1]*0.3);c.drawImage(L[0],off-layers.w,yo);c.drawImage(L[0],off,yo);if(off+layers.w<W)c.drawImage(L[0],off+layers.w,yo);});
  // light shafts
  if(R.q>0){c.globalCompositeOperation='lighter';for(var i=0;i<5;i++){var bx=((i*W*0.31+t*8)%(W*1.4))-W*0.2-cam.x*TS*0.05%W,sw=W*(0.06+0.03*Math.sin(t*0.3+i));var gg=c.createLinearGradient(0,0,0,H);gg.addColorStop(0,'rgba('+M.beam+','+(0.16+0.07*Math.sin(t*0.7+i*1.3))+')');gg.addColorStop(1,'rgba('+M.beam+',0)');c.fillStyle=gg;c.beginPath();c.moveTo(bx,0);c.lineTo(bx+sw,0);c.lineTo(bx+sw+W*0.25,H);c.lineTo(bx+W*0.18,H);c.fill();}c.globalCompositeOperation='source-over';}
  // mist band
  var mg=c.createLinearGradient(0,H*0.45,0,H);mg.addColorStop(0,'rgba(255,255,255,0)');mg.addColorStop(1,'rgba('+M.mist+',0.35)');c.fillStyle=mg;c.fillRect(0,H*0.45,W,H*0.55);
  if(R.q>1){c.globalAlpha=0.18;c.fillStyle=M.fog;for(var mi=0;mi<4;mi++){var mxx=((mi*W*0.45-cam.x*TS*0.25+t*TS*0.25*M.wind)%(W*1.8)+W*1.8)%(W*1.8)-W*0.4;c.beginPath();c.ellipse(mxx,H*(0.55+mi*0.1),W*0.35,H*0.06,0,0,7);c.fill();}c.globalAlpha=1;}
  // updraft columns
  var x0=Math.max(0,Math.floor(cam.x-vw/2-1)),x1=Math.min(st.w-1,Math.ceil(cam.x+vw/2+1)),y0=Math.max(0,Math.floor(cam.y-vh/2-1)),y1=Math.min(st.h-1,Math.ceil(cam.y+vh/2+1));
  c.globalCompositeOperation='lighter';
  for(var yy=y0;yy<=y1;yy++)for(var xx=x0;xx<=x1;xx++){if(st.upd[yy*st.w+xx]){c.fillStyle='rgba(255,240,190,0.06)';c.fillRect(X(xx),Y(yy),TS,TS);if(((xx*13+yy*7+Math.floor(t*6))%17)===0){c.fillStyle='rgba(255,250,220,0.5)';c.fillRect(X(xx+0.5),Y(yy+1-((t*2)%1)),2,TS*0.4);}}}
  c.globalCompositeOperation='source-over';
  // terrain
  var sxp=(cam.x-vw/2)*terrTS,syp=(cam.y-vh/2)*terrTS;
  c.drawImage(terr,sxp,syp,vw*terrTS,vh*terrTS,ox+(cam.x-vw/2)*TS,oy+(cam.y-vh/2)*TS,vw*TS,vh*TS);
  if(!R.dbg.G){
  // living world: bending branches
  var wind=Math.sin(t*0.8)*0.5+Math.sin(t*2.1)*0.25,WM=M.wind;
  branches.forEach(function(br){if(br.x<x0-1||br.x>x1+1||br.y<y0-1||br.y>y1+1)return;
    var on=p.gr&&Math.abs(p.y+0.42-br.y)<0.1&&p.x>br.x-0.35&&p.x<br.x+1.35;var tgt=on?0.13:0;br.bv+=((tgt-br.b)*140-br.bv*10)*Math.min(dt,0.05);br.b+=br.bv*Math.min(dt,0.05);
    var bxx=X(br.x),byy=Y(br.y),bend=br.b*TS;c.fillStyle='#8a7656';c.beginPath();c.moveTo(bxx,byy+TS*0.05);c.quadraticCurveTo(bxx+TS*0.5,byy+TS*0.05+bend*2,bxx+TS,byy+TS*0.05);c.lineTo(bxx+TS,byy+TS*0.27);c.quadraticCurveTo(bxx+TS*0.5,byy+TS*0.27+bend*2,bxx,byy+TS*0.27);c.fill();
    c.fillStyle=P.moss;c.beginPath();c.moveTo(bxx,byy+TS*0.06);c.quadraticCurveTo(bxx+TS*0.5,byy+bend*2-TS*0.02,bxx+TS,byy+TS*0.06);c.lineTo(bxx+TS,byy+TS*0.1);c.quadraticCurveTo(bxx+TS*0.5,byy+bend*2+TS*0.08,bxx,byy+TS*0.1);c.fill();});
  // grass that sways and parts around Pip
  c.strokeStyle=P.moss;c.lineWidth=Math.max(1.2,TS*0.05);c.lineCap='round';c.beginPath();var flw=[];
  for(var gi=from(grass,x0-1);gi<grass.length&&grass[gi].x<x1+1;gi++){var gq=grass[gi];if(gq.y<y0-1||gq.y>y1+1)continue;
    var dx=gq.x-p.x,dyy=gq.y-(p.y+0.42);if(Math.abs(dx)<0.9&&Math.abs(dyy)<0.9){gq.o+=(Math.sign(dx)||1)*(0.9-Math.abs(dx))*(Math.abs(p.vx)*0.25+1)*dt*14;}
    gq.o*=Math.pow(0.04,dt);if(gq.o>1.4)gq.o=1.4;if(gq.o<-1.4)gq.o=-1.4;
    var sw=(Math.sin(t*1.7*WM+gq.x*0.7+gq.p)*0.18+wind*0.15)*WM+gq.o*0.9,gx=X(gq.x),gy=Y(gq.y)+2,gh=gq.h*TS;
    c.moveTo(gx,gy);c.quadraticCurveTo(gx+sw*gh*0.3,gy-gh*0.55,gx+sw*gh*0.85,gy-gh*(1-Math.abs(sw)*0.25));if(gq.f)flw.push([gx+sw*gh*0.85,gy-gh*(1-Math.abs(sw)*0.25)]);}
  c.stroke();c.fillStyle=P.glow;flw.forEach(function(f){c.beginPath();c.arc(f[0],f[1],TS*0.07,0,7);c.fill();});
  // hanging vines and moss
  c.strokeStyle=P.moss;c.globalAlpha=0.85;c.lineWidth=Math.max(1.2,TS*0.06);c.beginPath();
  for(var vi=from(vines,x0-1);vi<vines.length&&vines[vi].x<x1+1;vi++){var vq=vines[vi];if(vq.y<y0-1||vq.y>y1+3)continue;
    var vdx=p.x-vq.x,vdy=p.y-(vq.y+vq.l*0.6);if(Math.abs(vdx)<0.7&&Math.abs(vdy)<vq.l*0.6+0.4)vq.ov+=p.vx*dt*3;vq.ov+=(-vq.o*30-vq.ov*3)*dt;vq.o+=vq.ov*dt;
    var vs=Math.sin(t*1.3*WM+vq.p)*0.12*WM+wind*0.08+vq.o,vx=X(vq.x),vy=Y(vq.y),vl=vq.l*TS;c.moveTo(vx,vy);c.quadraticCurveTo(vx+vs*vl*0.3,vy+vl*0.5,vx+vs*vl,vy+vl);
    c.moveTo(vx+vs*vl*0.5,vy+vl*0.55);c.lineTo(vx+vs*vl*0.5+TS*0.12,vy+vl*0.62);}
  c.stroke();c.globalAlpha=1;}
  // dynamic tiles
  for(yy=y0;yy<=y1;yy++)for(xx=x0;xx<=x1;xx++){var idx=yy*st.w+xx,v=s.g[idx],orig=st.g0[idx];
    if(v===5){var cl=s.col[idx];if(cl>=0){var wob=cl>0?Math.sin(t*60)*TS*0.04:0;c.fillStyle='#f6eec8';c.beginPath();c.ellipse(X(xx+0.5)+wob,Y(yy+0.25),TS*0.55,TS*0.22,0,0,7);c.fill();c.fillStyle='rgba(255,230,160,0.6)';c.fillRect(X(xx)+wob,Y(yy+0.2),TS,TS*0.08);} }
    else if(v===6){c.fillStyle='#8a5aa8';c.fillRect(X(xx),Y(yy),TS,TS);c.strokeStyle='#d2a8f0';c.lineWidth=2;c.beginPath();c.moveTo(X(xx),Y(yy+0.3));c.lineTo(X(xx+1),Y(yy+0.7));c.moveTo(X(xx+1),Y(yy+0.2));c.lineTo(X(xx),Y(yy+0.8));c.stroke();}
    else if(v===7){var op=s.open[st.door[idx]];if(!op){c.fillStyle='#6b5a3e';c.fillRect(X(xx+0.15),Y(yy),TS*0.7,TS);c.fillStyle='#a8e8a0';c.fillRect(X(xx+0.15),Y(yy+0.45),TS*0.7,TS*0.1);}else{c.fillStyle='rgba(107,90,62,0.25)';c.fillRect(X(xx+0.15),Y(yy),TS*0.7,TS*0.15);}}
  }
  // entities
  s.e.forEach(function(e){if(e.got)return;if(e.x<x0-2||e.x>x1+2||e.y<y0-2||e.y>y1+2)return;var ex=X(e.x),ey=Y(e.y),bob=Math.sin(t*2+e.x)*TS*0.08;
    if(!R.dbg.B&&R.q>0&&'oHEAGKLS'.indexOf(e.t)>=0||(e.t==='R'&&e.lit)){c.globalCompositeOperation='lighter';glow(ex,ey+bob,TS*(e.t==='A'?3:1.8),'rgba(255,250,225,'+(0.16+0.05*Math.sin(t*2.5+e.x))+')');c.globalCompositeOperation='source-over';}
    switch(e.t){
     case 'o':glow(ex,ey+bob,TS*0.6,'rgba(255,236,150,0.8)');c.fillStyle='#fffbe0';c.beginPath();c.arc(ex,ey+bob,TS*0.13,0,7);c.fill();break;
     case 'H':glow(ex,ey+bob,TS*0.9,'rgba(170,255,190,0.8)');c.fillStyle='#e8fff0';leaf(ex,ey+bob,TS*0.3);break;
     case 'E':glow(ex,ey+bob,TS*0.9,'rgba(160,220,255,0.8)');c.fillStyle='#e6f6ff';c.beginPath();c.moveTo(ex,ey+bob-TS*0.3);c.lineTo(ex+TS*0.2,ey+bob);c.lineTo(ex,ey+bob+TS*0.3);c.lineTo(ex-TS*0.2,ey+bob);c.fill();break;
     case 'A':glow(ex,ey+bob,TS*1.6,'rgba(255,250,210,0.9)');c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.arc(ex,ey+bob,TS*(0.35+0.05*Math.sin(t*4)),0,7);c.stroke();c.fillStyle='#fff';c.beginPath();c.arc(ex,ey+bob,TS*0.18,0,7);c.fill();break;
     case 'S':c.fillStyle='#d8e6e0';c.beginPath();c.ellipse(ex,ey+TS*0.35,TS*0.55,TS*0.18,0,0,7);c.fill();var sa=(s.shrine.x===e.x&&s.shrine.y===e.y);glow(ex,ey-TS*0.2,TS*(sa?1.6:1),sa?'rgba(170,255,230,0.85)':'rgba(220,240,255,0.5)');c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.arc(ex,ey-TS*0.2,TS*0.3,t%7,t%7+4.5);c.stroke();break;
     case 'L':glow(ex,ey,TS*1.1,'rgba(255,214,140,0.85)');c.fillStyle='#ffe9b8';c.beginPath();c.ellipse(ex,ey,TS*0.22,TS*0.3,0,0,7);c.fill();c.strokeStyle='#8a6e48';c.lineWidth=2;c.beginPath();c.moveTo(ex,ey-TS*0.3);c.lineTo(ex,ey-TS*0.7);c.stroke();if(ui.bashNear===e){c.strokeStyle='rgba(255,255,255,0.8)';c.beginPath();c.arc(ex,ey,TS*0.6,0,7);c.stroke();}break;
     case 'G':glow(ex,ey,TS*1.0,'rgba(140,255,240,0.8)');c.strokeStyle='#e0fffa';c.lineWidth=3;c.beginPath();c.arc(ex,ey,TS*0.28,0,7);c.stroke();break;
     case '_':c.fillStyle=e.on?'#c8ffd8':'#b8c8c0';c.fillRect(ex-TS*0.45,ey+TS*0.3,TS*0.9,TS*0.2);if(e.on)glow(ex,ey+TS*0.35,TS*0.8,'rgba(170,255,200,0.6)');break;
     case 'v':c.strokeStyle='#7a5e3c';c.lineWidth=4;c.beginPath();c.moveTo(ex,ey+TS*0.45);var la=s.flood?0.6:-0.6;c.lineTo(ex+Math.sin(la)*TS*0.6,ey+TS*0.45-Math.cos(la)*TS*0.6);c.stroke();c.fillStyle='#ffe6a0';c.beginPath();c.arc(ex+Math.sin(la)*TS*0.6,ey+TS*0.45-Math.cos(la)*TS*0.6,TS*0.12,0,7);c.fill();break;
     case 'M':c.save();c.translate(ex,ey);c.rotate(e.st===0?-Math.PI/4:Math.PI/4);c.fillStyle='#fdfcff';c.strokeStyle='#6a5ab0';c.lineWidth=2;c.fillRect(-TS*0.5,-TS*0.1,TS*1.0,TS*0.2);c.strokeRect(-TS*0.5,-TS*0.1,TS*1.0,TS*0.2);c.restore();glow(ex,ey,TS*1.0,'rgba(230,210,255,0.7)');if(s.use!=null&&s.e[s.use]===e){c.strokeStyle='rgba(255,255,255,0.9)';c.lineWidth=2;c.beginPath();c.arc(ex,ey,TS*0.75,0,7);c.stroke();}break;
     case 'K':glow(ex,ey,TS*0.9,'rgba(255,250,200,0.8)');c.fillStyle='#fff6d0';c.beginPath();c.arc(ex,ey,TS*0.25,0,7);c.fill();break;
     case 'R':glow(ex,ey,TS*(e.lit?1.4:0.7),e.lit?'rgba(255,250,190,0.95)':'rgba(200,190,255,0.5)');c.fillStyle=e.lit?'#fffbe0':'#c8c0f0';c.beginPath();c.ellipse(ex,ey,TS*0.3,TS*0.2,0,0,7);c.fill();c.fillStyle='#5a4a90';c.beginPath();c.arc(ex,ey,TS*0.09,0,7);c.fill();break;
     case 'e':if(e.dead)break;var sq=1+Math.sin(t*5+e.x)*0.06;c.fillStyle='#b8a0e8';c.beginPath();c.ellipse(ex,ey+TS*0.1,TS*0.38*sq,TS*0.34/sq,0,0,7);c.fill();c.fillStyle='#8fd88a';c.beginPath();c.ellipse(ex-TS*0.18,ey-TS*0.3,TS*0.2,TS*0.08,-0.6,0,7);c.ellipse(ex+TS*0.18,ey-TS*0.3,TS*0.2,TS*0.08,0.6,0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(ex-TS*0.1,ey+TS*0.05,TS*0.07,0,7);c.arc(ex+TS*0.1,ey+TS*0.05,TS*0.07,0,7);c.fill();c.fillStyle='#3a2a60';c.beginPath();c.arc(ex-TS*0.1+(p.x>e.x?2:-2),ey+TS*0.06,TS*0.035,0,7);c.arc(ex+TS*0.1+(p.x>e.x?2:-2),ey+TS*0.06,TS*0.035,0,7);c.fill();break;
     case '!':c.fillStyle='#cfd8d0';c.beginPath();c.moveTo(ex-TS*0.25,ey+TS*0.5);c.lineTo(ex-TS*0.2,ey-TS*0.2);c.quadraticCurveTo(ex,ey-TS*0.4,ex+TS*0.2,ey-TS*0.2);c.lineTo(ex+TS*0.25,ey+TS*0.5);c.fill();glow(ex,ey,TS*0.5,'rgba(170,255,230,'+(0.4+0.3*Math.sin(t*3))+')');break;
     case 'X':case 'x':glow(ex,ey,TS*1.2,'rgba(255,255,230,0.35)');break;
    }
  });
  function leaf(x,y,r){c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x+r,y,x,y+r);c.quadraticCurveTo(x-r,y,x,y-r);c.fill();}
  // beams
  c.globalCompositeOperation='lighter';
  s.beams.forEach(function(b){c.strokeStyle='rgba(255,246,200,0.35)';c.lineWidth=TS*0.35;c.beginPath();b.forEach(function(q,i){i?c.lineTo(X(q[0]),Y(q[1])):c.moveTo(X(q[0]),Y(q[1]));});c.stroke();c.strokeStyle='rgba(255,255,240,0.9)';c.lineWidth=TS*0.08;c.stroke();});
  c.globalCompositeOperation='source-over';
  // crates
  s.crates.forEach(function(k){c.fillStyle='#8a7350';c.fillRect(X(k.x-0.45),Y(k.y-0.45),TS*0.9,TS*0.9);c.strokeStyle='#5e4c34';c.lineWidth=2;c.strokeRect(X(k.x-0.4),Y(k.y-0.4),TS*0.8,TS*0.8);c.fillStyle='#9be77f';c.fillRect(X(k.x-0.45),Y(k.y-0.47),TS*0.9,TS*0.12);});
  // seeds
  s.seeds.forEach(function(q){glow(X(q.x),Y(q.y),TS*(q.boss?1.1:0.7),q.friend?'rgba(255,255,220,0.9)':'rgba(220,170,255,0.8)');c.fillStyle=q.friend?'#fffbe8':'#e2c8ff';c.beginPath();c.arc(X(q.x),Y(q.y),TS*q.r,0,7);c.fill();if(ui.bashNear===q){c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.arc(X(q.x),Y(q.y),TS*0.7,0,7);c.stroke();}});
  // boss
  var b=s.boss;if(b){var bx2=X(b.x),by2=Y(b.y);
    if(b.hp>0){var fl=b.fl>0&&Math.floor(t*14)%2;var wing=Math.sin(t*3)*0.25;glow(bx2,by2,TS*5,'rgba(230,210,255,0.55)');
      c.fillStyle=fl?'#ffffff':'#d8c8f4';[-1,1].forEach(function(sd){c.save();c.translate(bx2,by2);c.scale(sd,1);c.rotate(wing);c.beginPath();c.ellipse(TS*1.6,-TS*0.3,TS*1.8,TS*1.1,-0.3,0,7);c.fill();c.fillStyle='rgba(255,240,200,0.8)';c.beginPath();c.arc(TS*1.8,-TS*0.4,TS*0.45,0,7);c.fill();c.fillStyle=fl?'#fff':'#d8c8f4';c.restore();});
      c.fillStyle='#f4ecff';c.beginPath();c.ellipse(bx2,by2,TS*0.7,TS*1.1,0,0,7);c.fill();
      var sleepy=b.fl>0?0.2:1;c.strokeStyle='#4a3a70';c.lineWidth=3;c.beginPath();c.arc(bx2-TS*0.25,by2-TS*0.4,TS*0.12,0.2,Math.PI-0.2);c.moveTo(bx2+TS*0.37,by2-TS*0.4);c.arc(bx2+TS*0.25,by2-TS*0.4,TS*0.12,0.2,Math.PI-0.2);c.stroke();
    } else {glow(bx2,by2,TS*4,'rgba(255,250,210,0.6)');c.fillStyle='#fffaf0';c.beginPath();c.ellipse(bx2,by2+Math.sin(t)*TS*0.3,TS*0.6,TS*0.9,0,0,7);c.fill();}
  }
  // player trail + tail
  var px=X(p.x),py=Y(p.y);
  if(Math.random()<(Math.hypot(p.vx,p.vy)>9?1:0.3))trail.push({x:p.x,y:p.y,l:0.6});
  tail.unshift({x:p.x-p.face*0.25,y:p.y+0.05});if(tail.length>9)tail.length=9;
  c.globalCompositeOperation='lighter';
  trail=trail.filter(function(q){q.l-=dt;if(q.l<=0)return false;glow(X(q.x),Y(q.y),TS*0.45*q.l,'rgba(200,255,250,0.6)');return true;});
  c.globalCompositeOperation='source-over';
  if(p.dashT>0&&R.q>0&&Math.random()<0.8)ghosts.push({x:p.x,y:p.y,f:p.face,l:0.25});
  ghosts=ghosts.filter(function(q){q.l-=dt;if(q.l<=0)return false;c.globalAlpha=q.l*2.4;c.fillStyle='rgba(190,255,245,1)';c.beginPath();c.ellipse(X(q.x),Y(q.y)+TS*0.05,TS*0.32,TS*0.28,0,0,7);c.fill();c.globalAlpha=1;return true;});
  dust=dust.filter(function(q){q.l-=dt;if(q.l<=0)return false;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=0.9;q.vy*=0.9;var k=q.l/q.m;c.fillStyle=q.c;c.globalAlpha=k;c.beginPath();c.arc(X(q.x),Y(q.y),TS*q.r*(1.6-k*0.6),0,7);c.fill();c.globalAlpha=1;return true;});
  var blink=p.inv>0&&Math.floor(t*16)%2;
  if(!blink){
    c.globalCompositeOperation='lighter';glow(px,py,TS*(R.q>0?3.2:2.2),'rgba(255,246,205,0.10)');glow(px,py,TS*1.1,'rgba(200,255,250,0.16)');c.globalCompositeOperation='source-over';
    // tail
    c.strokeStyle='rgba(255,255,255,0.85)';c.lineCap='round';
    for(i=1;i<tail.length;i++){c.lineWidth=TS*0.22*(1-i/tail.length);c.beginPath();c.moveTo(X(tail[i-1].x),Y(tail[i-1].y)+Math.sin(t*8+i)*2);c.lineTo(X(tail[i].x),Y(tail[i].y)+Math.sin(t*8+i+1)*2);c.stroke();}
    var sq2=p.sq,stx=1+sq2*0.6,sty=1-sq2*0.5;if(!p.gr&&!p.water&&p.dashT<=0){var vs2=Math.min(0.18,Math.abs(p.vy)/90);stx*=1-vs2*0.6;sty*=1+vs2;}if(p.glide){stx*=1.15;sty*=0.85;}if(p.dashT>0){stx*=1.35;sty*=0.75;}
    c.save();c.translate(px,py+TS*0.05);c.scale(stx*p.face,sty);
    c.fillStyle='#ffffff';c.strokeStyle='rgba(90,170,190,0.55)';c.lineWidth=Math.max(1.5,TS*0.05);c.beginPath();c.ellipse(0,TS*0.08,TS*0.26,TS*0.3,0,0,7);c.stroke();c.beginPath();c.ellipse(TS*0.04,-TS*0.22,TS*0.24,TS*0.21,0,0,7);c.stroke();c.beginPath();c.ellipse(0,TS*0.08,TS*0.26,TS*0.3,0,0,7);c.fill();
    c.beginPath();c.ellipse(TS*0.04,-TS*0.22,TS*0.24,TS*0.21,0,0,7);c.fill();
    // ears
    c.beginPath();c.moveTo(-TS*0.12,-TS*0.35);c.quadraticCurveTo(-TS*0.3,-TS*0.75,-TS*0.02,-TS*0.4);c.fill();c.beginPath();c.moveTo(TS*0.1,-TS*0.36);c.quadraticCurveTo(TS*0.24,-TS*0.78,TS*0.2,-TS*0.34);c.fill();
    c.fillStyle='#2c4a6a';c.beginPath();c.ellipse(TS*0.13,-TS*0.22,TS*0.05,TS*0.07,0,0,7);c.fill();
    if(p.glide){c.fillStyle='rgba(200,255,200,0.9)';c.beginPath();c.ellipse(0,-TS*0.65,TS*0.55,TS*0.12,0,0,7);c.fill();}
    c.restore();
  }
  if(p.aim){c.strokeStyle='rgba(255,255,255,0.9)';c.lineWidth=3;c.setLineDash([6,6]);c.beginPath();c.moveTo(px,py);c.lineTo(px+p.ax*TS*3,py+p.ay*TS*3);c.stroke();c.setLineDash([]);}
  if(p.grap>=0){var an=s.e[p.grap];c.strokeStyle='rgba(180,255,240,0.9)';c.lineWidth=3;c.beginPath();c.moveTo(px,py);c.lineTo(X(an.x),Y(an.y));c.stroke();}
  // water (drawn over everything in it)
  for(yy=y0;yy<=y1;yy++)for(xx=x0;xx<=x1;xx++){var vv=s.g[yy*st.w+xx];if(vv===8||(vv===9&&s.flood)){var top=yy===0||!(s.g[(yy-1)*st.w+xx]===8||(s.g[(yy-1)*st.w+xx]===9&&s.flood));c.fillStyle='rgba(110,210,235,0.42)';c.fillRect(Math.floor(X(xx)),Math.floor(Y(yy)),Math.floor(X(xx+1))-Math.floor(X(xx)),Math.floor(Y(yy+1))-Math.floor(Y(yy)));if(top){var wv=Math.sin(t*2+xx*0.9)*TS*0.05;c.fillStyle='rgba(240,255,255,0.75)';c.fillRect(X(xx),Y(yy)+wv,TS+1,TS*0.07);}}}
  ripples=ripples.filter(function(q){q.t+=dt;if(q.t>q.m)return false;var k=q.t/q.m;c.strokeStyle='rgba(255,255,255,'+(0.8*(1-k))+')';c.lineWidth=2;c.beginPath();c.ellipse(X(q.x),Y(q.y),TS*(0.2+k*(q.big?1.8:1.0)),TS*(0.06+k*0.18),0,0,7);c.stroke();return true;});
  if(p.water&&Math.abs(p.vx)>1&&Math.random()<dt*6){var sy=Math.floor(p.y);while(sy>0&&TD_SIM.isWater(st,s,p.x,sy-0.5))sy--;if(Math.abs(sy-p.y)<1.2)R.ripple(p.x,sy+0.05,false);}
  // chase wave
  if(s.chase&&s.chase.on){var ch=s.chase;c.globalAlpha=0.9;
    if(ch.dir==='right'){var wx=X(ch.pos);var wg=c.createLinearGradient(wx-TS*6,0,wx+TS,0);wg.addColorStop(0,'rgba(150,90,200,0.95)');wg.addColorStop(1,'rgba(200,150,240,0)');c.fillStyle=wg;c.fillRect(0,0,Math.max(0,wx+TS),H);for(i=0;i<12;i++){c.fillStyle='#a070d0';c.beginPath();c.moveTo(wx,i*H/12);c.lineTo(wx+TS*0.8+Math.sin(t*9+i)*TS*0.3,i*H/12+H/24);c.lineTo(wx,(i+1)*H/12);c.fill();}}
    else{var wy=Y(ch.pos);var wg2=c.createLinearGradient(0,wy-TS,0,wy+TS*5);wg2.addColorStop(0,'rgba(200,170,255,0)');wg2.addColorStop(0.3,'rgba(170,130,240,0.9)');wg2.addColorStop(1,'rgba(140,100,220,1)');c.fillStyle=wg2;c.fillRect(0,wy-TS,W,H);}
    c.globalAlpha=1;}
  // particles + fireflies
  c.globalCompositeOperation='lighter';
  parts=parts.filter(function(q){q.l-=dt;if(q.l<=0)return false;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=0.96;q.vy=q.vy*0.96+dt*2;glow(X(q.x),Y(q.y),TS*q.r*4*(q.l/q.m),q.c);return true;});
  c.globalCompositeOperation='source-over';
  leaves=leaves.filter(function(q){q.l-=dt;if(q.l<=0)return false;q.vy=Math.min(q.vy+dt*6,1.8);q.vx*=Math.pow(0.3,dt);q.x+=(q.vx+Math.sin(t*3+q.a)*0.6)*dt;q.y+=q.vy*dt;q.a+=q.va*dt;c.save();c.translate(X(q.x),Y(q.y));c.rotate(q.a);c.globalAlpha=Math.min(1,q.l);c.fillStyle=q.c;c.beginPath();c.ellipse(0,0,TS*0.13,TS*0.06,0,0,7);c.fill();c.restore();return true;});c.globalAlpha=1;
  c.globalCompositeOperation='lighter';
  // fireflies drift toward Pip
  var nf=R.q===0?20:ffl.length;for(i=0;i<nf;i++){var f=ffl[i];var fdx=p.x-f.x,fdy=p.y-f.y,fd=Math.hypot(fdx,fdy);if(fd<5&&fd>1.2){f.x+=fdx/fd*dt*0.6;f.y+=fdy/fd*dt*0.6;}var fx=X(f.x+Math.sin(t*0.3*f.s+f.p)*2),fy=Y(f.y+Math.cos(t*0.25*f.s+f.p)*1.5);if(fx<-20||fx>W+20||fy<-20||fy>H+20)continue;glow(fx,fy,TS*0.35,'rgba(255,245,170,'+(0.35+0.35*Math.sin(t*2+f.p))+')');}
  c.globalCompositeOperation='source-over';
  // foreground silhouettes
  if(R.q>0){var off=((-cam.x*TS*1.3)%layers.w+layers.w)%layers.w;c.drawImage(layers.fg,off-layers.w,0);c.drawImage(layers.fg,off,0);}
  // tint vignette (light, never dark)
  var vg=c.createRadialGradient(W/2,H/2,H*0.4,W/2,H/2,W*0.75);vg.addColorStop(0,'rgba(255,255,255,0)');vg.addColorStop(1,'rgba(255,255,255,0.18)');c.fillStyle=vg;c.fillRect(0,0,W,H);
  if(M.cave){var cg2=c.createRadialGradient(px,py,TS*1.5,px,py,TS*7);cg2.addColorStop(0,'rgba(255,255,255,0)');cg2.addColorStop(1,'rgba(220,210,252,0.2)');c.fillStyle=cg2;c.fillRect(0,0,W,H);}
  if(flash>0){c.fillStyle='rgba(255,255,240,'+flash+')';c.fillRect(0,0,W,H);flash=Math.max(0,flash-dt*2);}
};
R.drawMap=function(mc,areas,save,cur,pp){
  var g=mc.getContext('2d');var mw=mc.width,mh=mc.height;g.clearRect(0,0,mw,mh);
  var tot=0;areas.forEach(function(a){tot+=a.w;});var sc=Math.min((mw-40)/tot,(mh-40)/50),x=20;
  areas.forEach(function(a,ai){var ex=save.explored[ai]||'';var P=PAL[ai];var y0=mh/2-a.h*sc/2+(ai%2?20:-20);
    g.fillStyle='rgba(255,255,255,0.15)';g.fillRect(x,y0,a.w*sc,a.h*sc);
    for(var by=0;by<Math.ceil(a.h/4);by++)for(var bx=0;bx<Math.ceil(a.w/4);bx++){var k=by*Math.ceil(a.w/4)+bx;if(ex.charAt(k)!=='1')continue;
      for(var yy=by*4;yy<Math.min(a.h,by*4+4);yy++)for(var xx=bx*4;xx<Math.min(a.w,bx*4+4);xx++){var ch=a.rows[yy].charAt(xx);g.fillStyle=(ch==='#'||ch==='I')?P.gr[0]:(ch==='w'||ch==='h')?'#9adcf0':'rgba(255,255,240,0.7)';g.fillRect(x+xx*sc,y0+yy*sc,sc+0.5,sc+0.5);}}
    a.ents.forEach(function(e){if(e.t==='S'){g.fillStyle='#4fe0c0';g.beginPath();g.arc(x+e.x*sc,y0+e.y*sc,3,0,7);g.fill();}});
    g.fillStyle='#2a4a5a';g.font='bold '+Math.round(Math.max(11,mh/30))+'px sans-serif';g.fillText(a.name,x,y0-6);
    if(ai===cur){g.fillStyle='#ffffff';g.strokeStyle='#ff9ad0';g.lineWidth=2;g.beginPath();g.arc(x+pp.x*sc,y0+pp.y*sc,5,0,7);g.fill();g.stroke();}
    x+=a.w*sc;
  });
};
root.TD_R=R;
})(window);
