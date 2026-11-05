// ---------- rendering ----------
const cv=$('cv'),ctx=cv.getContext('2d');let DPR=1,CW=0,CH=0;const SPR={};
const SKIES=[['#6fd0ff','#bfeeff','#fff1c4'],['#7ac8f5','#c8ecff','#ffe3b8'],['#65c2ff','#b4e8ff','#fff6d0'],['#58b4ff','#a8deff','#ffeec8']];
const SKIES_W=[['#7ed6ff','#e9f8ff','#ffe7b2'],['#78d0fa','#e7f6ff','#ffdfaa'],['#72ccff','#e8f7ff','#ffebc0'],['#6cc4ff','#e4f5ff','#ffe0ae']];
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);CW=innerWidth;CH=innerHeight;cv.width=Math.round(CW*DPR);cv.height=Math.round(CH*DPR);
  const s=Math.min(CH/440,CW/780);G.view={s,w:CW/s,h:CH/s};buildSprites();
}
function mk(w,h,f){const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));const x=c.getContext('2d');f(x,c.width,c.height);return c;}
function rr(x,X,Y,w,h,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath();}
function buildSprites(){
  const k=G.view.s*DPR,ts=Math.ceil(T*k);
  const body=(x,s)=>{const g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,'#e0a35a');g.addColorStop(1,'#c27a3c');x.fillStyle=g;x.fillRect(0,0,s,s);
    x.fillStyle='rgba(255,230,180,0.35)';for(let i=0;i<3;i++){x.beginPath();x.ellipse(s*(0.2+0.3*i),s*(0.3+0.25*((i*7)%3)),s*0.08,s*0.05,0,0,7);x.fill();}
    x.fillStyle='rgba(120,60,20,0.18)';x.beginPath();x.ellipse(s*0.7,s*0.75,s*0.1,s*0.06,0,0,7);x.fill();};
  SPR.body=mk(ts,ts,(x,w)=>body(x,w));
  const top=(L,R)=>mk(ts,ts,(x,s)=>{body(x,s);const g=x.createLinearGradient(0,0,0,s*0.5);g.addColorStop(0,'#7ff06a');g.addColorStop(1,'#2fb35a');x.fillStyle=g;
    x.beginPath();x.moveTo(0,s*0.05);x.lineTo(s,s*0.05);x.lineTo(s,s*0.38);for(let i=4;i>=0;i--){x.quadraticCurveTo(s*(i/4+0.125),s*0.55,s*(i/4),s*0.4);}x.closePath();x.fill();
    x.fillStyle='#a9ff8f';x.fillRect(0,s*0.05,s,s*0.07);
    if(L){x.globalCompositeOperation='destination-out';x.beginPath();x.moveTo(0,0);x.lineTo(s*0.22,0);x.arc(s*0.22,s*0.22,s*0.22,-Math.PI/2,Math.PI,true);x.closePath();x.fill();x.globalCompositeOperation='source-over';}
    if(R){x.globalCompositeOperation='destination-out';x.beginPath();x.moveTo(s,0);x.lineTo(s*0.78,0);x.arc(s*0.78,s*0.22,s*0.22,-Math.PI/2,0,false);x.closePath();x.fill();x.globalCompositeOperation='source-over';}
    // tiny grass blades on the rim
    x.strokeStyle='#5fd85a';x.lineWidth=s*0.04;for(let i=0;i<5;i++){const bx=s*(0.1+i*0.2);x.beginPath();x.moveTo(bx,s*0.08);x.lineTo(bx+s*0.03,-s*0.02);x.stroke();}});
  SPR.top=top(0,0);SPR.topL=top(1,0);SPR.topR=top(0,1);SPR.topLR=top(1,1);
  SPR.plank=mk(ts,ts*0.5,(x,s,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#ffd27a');g.addColorStop(1,'#d48e3c');x.fillStyle=g;rr(x,1,2,s-2,h*0.62,h*0.25);x.fill();
    x.fillStyle='#5fd85a';rr(x,0,0,s,h*0.22,h*0.1);x.fill();x.strokeStyle='rgba(120,60,20,0.3)';x.lineWidth=2;x.beginPath();x.moveTo(s*0.5,h*0.25);x.lineTo(s*0.5,h*0.6);x.stroke();});
  SPR.mush=mk(ts,ts,(x,s)=>{x.fillStyle='#fff3dd';rr(x,s*0.3,s*0.45,s*0.4,s*0.55,s*0.12);x.fill();const g=x.createLinearGradient(0,0,0,s*0.55);g.addColorStop(0,'#ffb7cf');g.addColorStop(1,'#f0789f');
    x.fillStyle=g;x.beginPath();x.ellipse(s/2,s*0.5,s*0.5,s*0.42,0,Math.PI,0);x.closePath();x.fill();x.fillStyle='#fff';[[0.3,0.3,0.08],[0.62,0.22,0.1],[0.75,0.4,0.06]].forEach(([a,b,r])=>{x.beginPath();x.arc(s*a,s*b,s*r,0,7);x.fill();});});
  SPR.thorn=mk(ts,ts,(x,s)=>{x.fillStyle='#4f8f3a';x.beginPath();x.ellipse(s/2,s*0.9,s*0.5,s*0.18,0,0,7);x.fill();x.fillStyle='#7a5fa8';
    for(let i=0;i<3;i++){const bx=s*(0.17+i*0.33);x.beginPath();x.moveTo(bx-s*0.14,s*0.92);x.lineTo(bx,s*0.38+(i%2)*s*0.1);x.lineTo(bx+s*0.14,s*0.92);x.fill();}
    x.fillStyle='#c9b6ff';for(let i=0;i<3;i++){const bx=s*(0.17+i*0.33);x.beginPath();x.moveTo(bx-s*0.03,s*0.6);x.lineTo(bx,s*0.4+(i%2)*s*0.1);x.lineTo(bx+s*0.03,s*0.6);x.fill();}});
  SPR.hedge=mk(ts,ts,(x,s)=>{x.fillStyle='#2fa957';x.fillRect(0,0,s,s);x.fillStyle='#46c46a';for(let i=0;i<6;i++){x.beginPath();x.arc(s*((i%3)*0.4+0.1),s*(Math.floor(i/3)*0.5+0.25),s*0.24,0,7);x.fill();}});
  const glow=(c,a)=>mk(128,128,(x)=>{const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,c.replace('A',a));g.addColorStop(0.4,c.replace('A',a*0.35));g.addColorStop(1,c.replace('A',0));x.fillStyle=g;x.fillRect(0,0,128,128);});
  SPR.gGold=glow('rgba(255,215,90,A)',0.9);SPR.gWhite=glow('rgba(255,255,235,A)',0.8);SPR.gGreen=glow('rgba(150,255,150,A)',0.7);SPR.gPink=glow('rgba(255,180,210,A)',0.7);
  // parallax layers (built at screen scale)
  const lw=Math.ceil(1400*G.view.s*DPR),lh=Math.ceil(540*G.view.s*DPR);
  SPR.far=mk(lw,lh,(x,w,h)=>{const u=w/1400;for(let i=0;i<5;i++){const cx=(i*290+120)*u,cy=(150+((i*97)%120))*u,r=(70+((i*53)%40))*u;
      x.fillStyle='rgba(120,190,215,0.55)';x.beginPath();x.moveTo(cx-r,cy);x.quadraticCurveTo(cx,cy+r*1.4,cx+r,cy);x.closePath();x.fill();
      x.fillStyle='rgba(160,225,190,0.75)';x.beginPath();x.ellipse(cx,cy,r,r*0.28,0,0,7);x.fill();
      x.fillStyle='rgba(120,205,160,0.7)';for(let j=0;j<4;j++){x.beginPath();x.arc(cx-r*0.6+j*r*0.4,cy-r*0.15,r*0.22,0,7);x.fill();}
      x.strokeStyle='rgba(140,200,210,0.5)';x.lineWidth=2*u;x.beginPath();x.moveTo(cx+r*0.3,cy+r*0.2);x.quadraticCurveTo(cx+r*0.4,cy+r*0.9,cx+r*0.2,cy+r*1.2);x.stroke();}});
  SPR.hills=mk(lw,lh,(x,w,h)=>{const u=w/1400;x.fillStyle='rgba(110,205,120,0.85)';x.beginPath();x.moveTo(0,h);for(let i=0;i<=14;i++){x.quadraticCurveTo((i*100-50)*u,(360-((i*71)%60))*u,i*100*u,(390-((i*37)%40))*u);}x.lineTo(w,h);x.closePath();x.fill();
      x.fillStyle='rgba(70,175,95,0.9)';x.beginPath();x.moveTo(0,h);for(let i=0;i<=10;i++){x.quadraticCurveTo((i*140-70)*u,(410-((i*53)%50))*u,i*140*u,(440-((i*29)%30))*u);}x.lineTo(w,h);x.closePath();x.fill();
      for(let i=0;i<9;i++){const tx=(i*160+60)*u,ty=(400-((i*41)%50))*u;x.fillStyle='rgba(150,95,50,0.8)';x.fillRect(tx-5*u,ty-60*u,10*u,60*u);x.fillStyle=i%3===0?'rgba(255,170,200,0.9)':'rgba(60,170,90,0.95)';x.beginPath();x.arc(tx,ty-70*u,32*u,0,7);x.arc(tx-22*u,ty-55*u,22*u,0,7);x.arc(tx+22*u,ty-55*u,22*u,0,7);x.fill();}});
  SPR.cloud=mk(260*G.view.s*DPR,110*G.view.s*DPR,(x,w,h)=>{x.fillStyle='rgba(255,255,255,0.92)';const u=w/260;[[70,70,40],[120,52,52],[175,68,40],[120,80,45],[215,82,26]].forEach(([a,b,r])=>{x.beginPath();x.arc(a*u,b*u,r*u,0,7);x.fill();});x.fillStyle='rgba(200,230,255,0.5)';x.fillRect(30*u,88*u,200*u,4*u);});
  SPR.fg=mk(lw,Math.ceil(160*G.view.s*DPR),(x,w,h)=>{const u=w/1400;for(let i=0;i<22;i++){const fx=(i*64+((i*37)%30))*u,fh=(60+((i*53)%80))*u;x.strokeStyle='rgba(30,120,60,0.92)';x.lineWidth=7*u;x.beginPath();x.moveTo(fx,h);x.quadraticCurveTo(fx+18*u,h-fh*0.6,fx+6*u,h-fh);x.stroke();
      x.fillStyle='rgba(40,150,75,0.95)';x.beginPath();x.ellipse(fx+16*u,h-fh*0.5,20*u,8*u,-0.6,0,7);x.fill();
      if(i%3===0){x.fillStyle=['#ff9ec0','#ffd45e','#ffffff'][i%9/3|0];for(let p=0;p<5;p++){const a=p/5*Math.PI*2;x.beginPath();x.ellipse(fx+6*u+Math.cos(a)*10*u,h-fh+Math.sin(a)*10*u,8*u,5*u,a,0,7);x.fill();}x.fillStyle='#f3a83a';x.beginPath();x.arc(fx+6*u,h-fh,6*u,0,7);x.fill();}}});
  const cut=(x,s,L,R)=>{
    if(L){x.globalCompositeOperation='destination-out';x.beginPath();x.moveTo(0,0);x.lineTo(s*0.22,0);x.arc(s*0.22,s*0.22,s*0.22,-Math.PI/2,Math.PI,true);x.closePath();x.fill();x.globalCompositeOperation='source-over';}
    if(R){x.globalCompositeOperation='destination-out';x.beginPath();x.moveTo(s,0);x.lineTo(s*0.78,0);x.arc(s*0.78,s*0.22,s*0.22,-Math.PI/2,0,false);x.closePath();x.fill();x.globalCompositeOperation='source-over';}
  };
  const bodyM=(x,s)=>{
    const g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,'#f3c98a');g.addColorStop(0.4,'#e2a45c');g.addColorStop(1,'#c88844');
    x.fillStyle=g;x.fillRect(0,0,s,s);
    x.fillStyle='rgba(255,240,210,0.32)';
    x.beginPath();x.ellipse(s*0.28,s*0.38,s*0.09,s*0.035,0.2,0,7);x.fill();
    x.beginPath();x.ellipse(s*0.72,s*0.58,s*0.07,s*0.028,-0.2,0,7);x.fill();
    x.fillStyle='rgba(130,74,28,0.16)';
    x.beginPath();x.ellipse(s*0.5,s*0.78,s*0.08,s*0.03,0,0,7);x.fill();
  };
  SPR.mBody=mk(ts,ts,(x,w)=>bodyM(x,w));
  const topM=(L,R)=>mk(ts,ts,(x,s)=>{bodyM(x,s);
    const g=x.createLinearGradient(0,0,0,s*0.7);g.addColorStop(0,'#f3ffc4');g.addColorStop(0.28,'#8cf06e');g.addColorStop(0.7,'#2fbe58');g.addColorStop(1,'#1b8a42');
    x.fillStyle=g;x.beginPath();x.moveTo(0,s*0.02);x.lineTo(s,s*0.02);x.lineTo(s,s*0.32);
    for(let i=7;i>=0;i--)x.quadraticCurveTo(s*(i/7+1/14),s*0.58,s*(i/7),s*0.34);
    x.closePath();x.fill();
    x.fillStyle='rgba(255,255,230,0.9)';x.fillRect(s*0.04,s*0.03,s*0.92,s*0.045);
    x.fillStyle='rgba(210,255,160,0.55)';x.beginPath();x.moveTo(0,s*0.1);x.lineTo(s,s*0.08);
    for(let i=5;i>=0;i--)x.quadraticCurveTo(s*(i/5+0.1),s*0.26,s*(i/5),s*0.12);
    x.fill();
    x.strokeStyle='#c6ff88';x.lineWidth=Math.max(1,s*0.03);
    for(let i=0;i<6;i++){const bx=s*(0.1+i*0.15);x.beginPath();x.moveTo(bx,s*0.1);x.quadraticCurveTo(bx+s*0.04,s*0.02,bx+s*0.01,s*0.005);x.stroke();}
    cut(x,s,L,R);
  });
  SPR.mTop=topM(0,0);SPR.mTopL=topM(1,0);SPR.mTopR=topM(0,1);SPR.mTopLR=topM(1,1);
  SPR.mPlank=mk(ts,ts*0.5,(x,s,h)=>{
    const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#ffe6b0');g.addColorStop(0.45,'#f0b15e');g.addColorStop(1,'#c47c34');
    x.fillStyle=g;rr(x,1,h*0.18,s-2,h*0.68,h*0.28);x.fill();
    x.strokeStyle='rgba(150,78,24,0.28)';x.lineWidth=1.2;
    for(let i=0;i<3;i++){x.beginPath();x.moveTo(s*0.12,h*(0.4+i*0.14));x.quadraticCurveTo(s*0.5,h*(0.34+i*0.14),s*0.88,h*(0.42+i*0.12));x.stroke();}
    const mg=x.createLinearGradient(0,0,0,h*0.45);mg.addColorStop(0,'#eaffb4');mg.addColorStop(1,'#3cba58');
    x.fillStyle=mg;rr(x,0,0,s,h*0.3,h*0.14);x.fill();
    x.fillStyle='rgba(255,255,255,0.4)';x.fillRect(s*0.1,h*0.06,s*0.42,Math.max(1,h*0.05));
  });
  SPR.mMush=mk(ts,ts,(x,s)=>{
    const stem=x.createLinearGradient(s*0.32,0,s*0.7,0);stem.addColorStop(0,'#fff8ea');stem.addColorStop(0.5,'#ffe8c4');stem.addColorStop(1,'#e4c49a');
    x.fillStyle=stem;rr(x,s*0.34,s*0.42,s*0.32,s*0.56,s*0.14);x.fill();
    const g=x.createRadialGradient(s*0.38,s*0.22,s*0.05,s*0.5,s*0.34,s*0.55);g.addColorStop(0,'#ffd0e0');g.addColorStop(0.55,'#ff9ec0');g.addColorStop(1,'#e56b96');
    x.fillStyle=g;x.beginPath();x.ellipse(s/2,s*0.42,s*0.5,s*0.36,0,Math.PI,0);x.closePath();x.fill();
    x.fillStyle='rgba(255,255,255,0.85)';[[0.32,0.24,0.07],[0.58,0.18,0.09],[0.74,0.32,0.05]].forEach(([a,b,r])=>{x.beginPath();x.arc(s*a,s*b,s*r,0,7);x.fill();});
    x.fillStyle='rgba(255,255,255,0.35)';x.beginPath();x.ellipse(s*0.4,s*0.2,s*0.16,s*0.06,-0.4,0,7);x.fill();
  });
  SPR.mThorn=mk(ts,ts,(x,s)=>{
    x.fillStyle='#3f9a48';x.beginPath();x.ellipse(s/2,s*0.9,s*0.46,s*0.16,0,0,7);x.fill();
    x.fillStyle='#6fe08a';x.beginPath();x.ellipse(s*0.28,s*0.86,s*0.16,s*0.07,-0.4,0,7);x.ellipse(s*0.72,s*0.86,s*0.16,s*0.07,0.4,0,7);x.fill();
    for(let i=0;i<3;i++){const bx=s*(0.2+i*0.3),tip=s*(0.34+(i%2)*0.08);
      const g=x.createLinearGradient(bx,tip,bx,s*0.92);g.addColorStop(0,'#d7c6ff');g.addColorStop(1,'#6d4f9e');
      x.fillStyle=g;x.beginPath();x.moveTo(bx-s*0.13,s*0.9);x.quadraticCurveTo(bx-s*0.02,s*0.6,bx,tip);x.quadraticCurveTo(bx+s*0.02,s*0.6,bx+s*0.13,s*0.9);x.fill();}
  });
  SPR.mHedge=mk(ts,ts,(x,s)=>{
    const blobs=[[0.22,0.62,0.28],[0.55,0.48,0.32],[0.8,0.66,0.26],[0.4,0.78,0.24],[0.68,0.3,0.22]];
    blobs.forEach(([a,b,r],i)=>{const g=x.createRadialGradient(s*(a-0.08),s*(b-0.1),s*0.02,s*a,s*b,s*r);g.addColorStop(0,i%2?'#d8ffb0':'#b6f58a');g.addColorStop(1,'#2f9a4c');x.fillStyle=g;x.beginPath();x.arc(s*a,s*b,s*r,0,7);x.fill();});
  });
  SPR.hillsW=mk(lw,lh,(x,w,h)=>{const u=w/1400;x.fillStyle='rgba(150,214,96,0.9)';x.beginPath();x.moveTo(0,h);for(let i=0;i<=14;i++){x.quadraticCurveTo((i*100-50)*u,(360-((i*71)%60))*u,i*100*u,(390-((i*37)%40))*u);}x.lineTo(w,h);x.closePath();x.fill();
    x.fillStyle='rgba(96,186,72,0.92)';x.beginPath();x.moveTo(0,h);for(let i=0;i<=10;i++){x.quadraticCurveTo((i*140-70)*u,(410-((i*53)%50))*u,i*140*u,(440-((i*29)%30))*u);}x.lineTo(w,h);x.closePath();x.fill();
    for(let i=0;i<9;i++){const tx=(i*160+60)*u,ty=(400-((i*41)%50))*u;x.fillStyle='rgba(176,112,58,0.85)';x.fillRect(tx-5*u,ty-64*u,10*u,64*u);
      x.fillStyle=i%3===0?'rgba(255,186,206,0.95)':'rgba(92,196,78,0.96)';x.beginPath();x.arc(tx,ty-74*u,34*u,0,7);x.arc(tx-24*u,ty-56*u,24*u,0,7);x.arc(tx+24*u,ty-56*u,24*u,0,7);x.fill();
      x.fillStyle='rgba(255,255,230,0.35)';x.beginPath();x.ellipse(tx+8*u,ty-86*u,12*u,6*u,-0.4,0,7);x.fill();}});
}
addEventListener('resize',resize);
const POLLEN=[];for(let i=0;i<70;i++)POLLEN.push({x:Math.random(),y:Math.random(),s:rnd(1,3),v:rnd(0.2,1),ph:Math.random()*6,leaf:i%9===0});
function hash(n){n=(n^61)^(n>>>16);n=n+(n<<3);n=n^(n>>>4);n=Math.imul(n,0x27d4eb2d);n=n^(n>>>15);return (n>>>0)/4294967296;}
function drawBlob(x,y,r,c0,c1){const g=ctx.createRadialGradient(x-r*0.28,y-r*0.32,r*0.08,x,y,r);g.addColorStop(0,c0);g.addColorStop(1,c1);ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();}
function drawCanopy(tm,which){
  if(!FEAT.layers)return;
  const cam=W?W.cam:{x:tm*40,y:270},s=G.view.s;
  const bands=[
    {par:0.14,n:6,gap:520,base:0.36,r:64,a:0.42,c0:'#eaffd0',c1:'#9ed4aa',trunk:0},
    {par:0.34,n:7,gap:440,base:0.5,r:54,a:0.78,c0:'#f4ffc8',c1:'#46b25e',trunk:1},
    {par:0.5,n:8,gap:360,base:0.64,r:40,a:0.88,c0:'#f8ffd8',c1:'#2f9a4c',trunk:1}
  ];
  bands.forEach((b,bi)=>{
    if(which===0&&bi!==0)return; if(which===1&&bi===0)return;
    ctx.globalAlpha=b.a; const span=b.n*b.gap*s;
    for(let i=0;i<b.n;i++){
      let sx=CW/2+(i*b.gap-cam.x*b.par)*s; sx=((sx%span)+span)%span;
      const sway=FEAT.flora?Math.sin(tm*(0.55+b.par)+i*1.3)*(b.par>0.4?4:7):0;
      const y=CH*b.base+sway-(cam.y-270)*b.par*0.45*s;
      const rr=b.r*(0.86+hash(i+bi*17)*0.3)*Math.max(0.7,s);
      if(b.trunk){ctx.fillStyle='rgba(168,104,52,0.88)';ctx.fillRect(sx-4*s,y,8*s,rr*0.85);}
      drawBlob(sx,y,rr,b.c0,b.c1);drawBlob(sx-rr*0.52,y+rr*0.12,rr*0.7,b.c0,b.c1);drawBlob(sx+rr*0.48,y+rr*0.1,rr*0.66,b.c0,b.c1);
      ctx.fillStyle='rgba(255,255,236,0.38)';ctx.beginPath();ctx.ellipse(sx+rr*0.18,y-rr*0.32,rr*0.26,rr*0.14,-0.4,0,7);ctx.fill();
    }
    ctx.globalAlpha=1;
  });
}
function drawAtmo(tm){
  if(!FEAT.atmo)return;
  const sunX=CW*0.82,sunY=CH*0.12,rad=Math.max(26,CH*0.05);
  const g=ctx.createRadialGradient(sunX-rad*0.2,sunY-rad*0.2,rad*0.1,sunX,sunY,rad);
  g.addColorStop(0,'#fffef8');g.addColorStop(0.55,FEAT.warm?'#ffe7a4':'#fff4cc');g.addColorStop(1,'rgba(255,226,150,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(sunX,sunY,rad,0,7);ctx.fill();
  const haze=ctx.createLinearGradient(0,CH*0.3,0,CH*0.58);haze.addColorStop(0,'rgba(255,252,240,0)');haze.addColorStop(0.55,'rgba(255,248,226,0.1)');haze.addColorStop(1,'rgba(255,248,226,0)');
  ctx.fillStyle=haze;ctx.fillRect(0,0,CW,CH);
  const fog=ctx.createLinearGradient(0,CH*0.62,0,CH);fog.addColorStop(0,'rgba(255,246,220,0)');fog.addColorStop(1,'rgba(255,236,196,0.12)');
  ctx.fillStyle=fog;ctx.fillRect(0,0,CW,CH);
  const vig=ctx.createRadialGradient(CW*0.5,CH*0.42,CH*0.2,CW*0.5,CH*0.45,Math.max(CW,CH)*0.72);
  vig.addColorStop(0,'rgba(255,244,210,0)');vig.addColorStop(1,'rgba(255,214,150,0.08)');
  ctx.fillStyle=vig;ctx.fillRect(0,0,CW,CH);
}
function drawTufts(tm){
  if(!FEAT.flora||!W)return;
  const v=G.view,cam=W.cam;
  const c0=Math.floor((cam.x-v.w/2)/T)-1,c1=Math.ceil((cam.x+v.w/2)/T)+1;
  const r0=Math.max(0,Math.floor((cam.y-v.h/2)/T)-1),r1=Math.min(W.H-1,Math.ceil((cam.y+v.h/2)/T)+1);
  for(let c=c0;c<=c1;c++){const col=W.cols[c];if(!col)continue;for(let r=r0;r<=r1;r++){
    if(col[r]!=='#')continue; if(tileAt(c,r-1)==='#'||tileAt(c,r-1)==='h'||tileAt(c,r-1)==='^')continue;
    const hsh=hash(c*13+r*5); if(hsh>0.8)continue;
    const x=c*T+8+hash(c+9)*24,y=r*T+1,wind=Math.sin(tm*2.1+c*0.7)*0.22;
    ctx.save();ctx.translate(x,y);ctx.rotate(wind);
    ctx.strokeStyle=hsh<0.4?'#8ef07a':'#3cba58';ctx.lineWidth=2;
    for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(i*3.5,0);ctx.quadraticCurveTo(i*4+wind*12,-8,i*3.2,-15-Math.abs(i)*2);ctx.stroke();}
    if(hsh<0.22){ctx.fillStyle='#ffd45e';ctx.beginPath();ctx.arc(2,-16,2.4,0,7);ctx.fill();}
    ctx.restore();
  }}
}
function drawFrameLeaves(tm){
  if(!FEAT.layers)return;
  const leaf=(x,y,sc,rot,col)=>{ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(sc,sc);ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,-14);ctx.bezierCurveTo(12,-10,14,4,0,7);ctx.bezierCurveTo(-14,4,-12,-10,0,-14);ctx.fill();ctx.fillStyle='rgba(255,255,240,0.5)';ctx.beginPath();ctx.ellipse(-1,-3,4,1.6,-0.5,0,7);ctx.fill();ctx.restore();};
  const sw=i=>FEAT.flora?Math.sin(tm*1.2+i)*0.22:0;
  leaf(16,18,0.85,0.9+sw(1),'#7edc96');
  leaf(40,10,0.6,0.25+sw(2),'#d7f7b0');
  leaf(CW-16,20,0.9,-0.85+sw(3),'#8ee7ae');
  leaf(CW-42,8,0.58,-0.2+sw(4),'#c8f6a4');
}
function render(){
  const v=G.view,s=v.s,tm=G.t+performance.now()/1000*(G.mode==='play'?0:1);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const sk=(FEAT.warm?SKIES_W:SKIES)[W&&W.def?W.def.sky:3];const gr=ctx.createLinearGradient(0,0,0,CH);gr.addColorStop(0,sk[0]);gr.addColorStop(0.65,sk[1]);gr.addColorStop(1,sk[2]);ctx.fillStyle=gr;ctx.fillRect(0,0,CW,CH);
  const cam=W?W.cam:{x:tm*40,y:270};
  // sun + shafts
  ctx.globalCompositeOperation='lighter';const sunX=CW*0.82,sunY=CH*0.12;ctx.drawImage(SPR.gGold,sunX-CH*0.45,sunY-CH*0.45,CH*0.9,CH*0.9);ctx.drawImage(SPR.gWhite,sunX-CH*0.12,sunY-CH*0.12,CH*0.24,CH*0.24);
  if(G.fxScale>0.3){for(let i=0;i<4;i++){const a=0.05+0.03*Math.sin(tm*0.5+i*1.7),bx=sunX-CW*(0.15+i*0.2);const g2=ctx.createLinearGradient(sunX,0,bx-CH*0.5,CH);g2.addColorStop(0,`rgba(255,245,200,${a})`);g2.addColorStop(1,'rgba(255,245,200,0)');ctx.fillStyle=g2;
    ctx.beginPath();ctx.moveTo(sunX-20,sunY);ctx.lineTo(bx-CH*0.55,CH);ctx.lineTo(bx-CH*0.55+CW*0.08,CH);ctx.lineTo(sunX+20,sunY);ctx.fill();}}
  if(FEAT.warm){ctx.globalAlpha=0.28;ctx.drawImage(SPR.gGold,sunX-CH*0.62,sunY-CH*0.42,CH*1.15,CH*0.9);ctx.globalAlpha=1;}
  ctx.globalCompositeOperation='source-over';
  if(FEAT.atmo)drawAtmo(tm);
  const layer=(img,par,yoff,alpha)=>{const iw=img.width/DPR,ox=-((cam.x*par*s)%iw+iw)%iw,oy=yoff-(cam.y-270)*par*0.5*s;ctx.globalAlpha=alpha||1;for(let x=ox;x<CW;x+=iw)ctx.drawImage(img,x,oy,iw,img.height/DPR);ctx.globalAlpha=1;};
  layer(SPR.far,0.1,0);
  drawCanopy(tm,0);
  const cw=SPR.cloud.width/DPR,chh=SPR.cloud.height/DPR;for(let i=0;i<6;i++){const span=CW+cw*2;const x=((i*397-cam.x*0.2*s-tm*8*(1+i%3))%span+span)%span-cw;ctx.globalAlpha=0.75+0.25*(i%2);ctx.drawImage(SPR.cloud,x,CH*(0.08+((i*0.13)%0.4))-(cam.y-270)*0.08*s,cw*(0.7+0.15*(i%3)),chh*(0.7+0.15*(i%3)));}ctx.globalAlpha=1;
  layer(FEAT.warm?SPR.hillsW:SPR.hills,0.35,CH-540*s+20*s);
  drawCanopy(tm,1);
  if(!W){drawPollen(tm);return;}
  // ----- world -----
  const ox=CW/2-cam.x*s,oy=CH/2-cam.y*s;
  let sh=0;if(S.shake&&G.shake>0){sh=G.shake*G.shake*14;}
  ctx.setTransform(DPR*s,0,0,DPR*s,DPR*(ox+rnd(-sh,sh)),DPR*(oy+rnd(-sh,sh)));
  const c0=Math.floor((cam.x-v.w/2)/T)-1,c1=Math.ceil((cam.x+v.w/2)/T)+1,r0=Math.max(0,Math.floor((cam.y-v.h/2)/T)-1),r1=Math.min(W.H-1,Math.ceil((cam.y+v.h/2)/T)+1);
  const near=(c,r)=>Math.abs(c*T+T/2-P.x)<T*2.2&&Math.abs(r*T+T/2-P.y)<T*2.5;
  const mat=!!FEAT.materials;
  for(let c=c0;c<=c1;c++){const col=W.cols[c];if(!col)continue;for(let r=r0;r<=r1;r++){const ch=col[r];if(ch===' '||!ch)continue;const X=c*T,Y=r*T;
    if(ch==='#'){if(tileAt(c,r-1)!=='#'&&tileAt(c,r-1)!=='h'){const L=!solid(tileAt(c-1,r)),R=!solid(tileAt(c+1,r));
        const spr=mat?(L&&R?SPR.mTopLR:L?SPR.mTopL:R?SPR.mTopR:SPR.mTop):(L&&R?SPR.topLR:L?SPR.topL:R?SPR.topR:SPR.top);
        ctx.drawImage(spr,X,Y,T+0.6,T+0.6);
        const hh=hash(c*131+r);if(hh<0.35)drawFlower(X+T*hash(c+7),Y+2,hh,tm);}else ctx.drawImage(mat?SPR.mBody:SPR.body,X,Y,T+0.6,T+0.6);}
    else if(ch==='=')ctx.drawImage(mat?SPR.mPlank:SPR.plank,X,Y,T+0.6,T/2);
    else if(ch==='M'){ctx.drawImage(mat?SPR.mBody:SPR.body,X,Y,T+0.6,T+0.6);ctx.drawImage(mat?SPR.mMush:SPR.mush,X-6,Y-T*0.75,T+12,T+4);}
    else if(ch==='^')ctx.drawImage(mat?SPR.mThorn:SPR.thorn,X,Y,T+0.6,T+0.6);
    else if(ch==='h'){ctx.globalAlpha=near(c,r)?0.35:1;ctx.drawImage(mat?SPR.mHedge:SPR.hedge,X,Y,T+0.6,T+0.6);ctx.globalAlpha=1;}}}
  drawTufts(tm);
  // signs
  ctx.font='800 15px "Avenir Next",Nunito,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  for(const sg of W.signs){if(Math.abs(sg.x-cam.x)>v.w)continue;const tw=ctx.measureText(sg.text).width+20;ctx.fillStyle='#b87333';ctx.fillRect(sg.x-3,sg.y-26,6,26);ctx.fillStyle='#fff6dc';rr(ctx,sg.x-tw/2,sg.y-56,tw,30,10);ctx.fill();ctx.strokeStyle='#e0a35a';ctx.lineWidth=2.5;ctx.stroke();ctx.fillStyle='#5a3a10';ctx.fillText(sg.text,sg.x,sg.y-41);}
  // checkpoints + goal
  for(const c of W.checks)drawCheck(c,tm);
  if(W.goal)drawGoal(W.goal,tm);
  // plants
  for(const pl of W.plants)drawPlant(pl,tm);
  // collectibles (glow pass additive, then crisp cores)
  ctx.globalCompositeOperation='lighter';
  for(const m of W.motes){if(m.got||Math.abs(m.x-cam.x)>v.w/2+60)continue;const yy=m.y+Math.sin(m.b*3)*4;ctx.drawImage(SPR.gGold,m.x-26,yy-26,52,52);}
  for(const st of W.stones)if(!st.got)ctx.drawImage(SPR.gWhite,st.x-50,st.y-50,100,100);
  ctx.globalCompositeOperation='source-over';
  for(const m of W.motes){if(m.got||Math.abs(m.x-cam.x)>v.w/2+60)continue;const yy=m.y+Math.sin(m.b*3)*4;ctx.fillStyle='#ffd23a';ctx.beginPath();ctx.arc(m.x,yy,7.5,0,7);ctx.fill();ctx.fillStyle='#fffbe0';ctx.beginPath();ctx.arc(m.x-2,yy-2,3.5,0,7);ctx.fill();}
  for(const st of W.stones)if(!st.got)drawStar(st.x,st.y+Math.sin(tm*2)*5,17,tm);
  for(const p of W.powers)if(!p.got)drawPower(p,tm);
  for(const e of W.enemies)if(e.alive&&Math.abs(e.x-cam.x)<v.w)drawEnemy(e,tm);
  if(FEAT.atmo&&G.fxScale>0.35){
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=0.07;
    for(let i=0;i<5;i++){const dx=((cam.x*0.25+i*210+Math.sin(tm*0.35+i)*36)%(v.w+240))-80;ctx.drawImage(SPR.gGold,cam.x-v.w/2+dx,cam.y-v.h*0.35+i*18,100,70);}
    ctx.restore();
  }
  if(FEAT.atmo){
    ctx.save();ctx.setTransform(DPR,0,0,DPR,0,0);
    const wash=ctx.createLinearGradient(0,CH*0.74,0,CH);wash.addColorStop(0,'rgba(255,248,230,0)');wash.addColorStop(1,'rgba(255,244,214,0.1)');
    ctx.fillStyle=wash;ctx.fillRect(0,0,CW,CH);ctx.restore();
  }
  // player + trail
  drawPlayer(tm);
  // particles
  for(const p of PARTS){const a=p.life/p.max;
    if(p.kind===2){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=a;ctx.drawImage(SPR.gGold,p.x-p.size*2,p.y-p.size*2,p.size*4,p.size*4);ctx.globalCompositeOperation='source-over';ctx.fillStyle='#fffbe0';ctx.fillRect(p.x-p.size*0.25,p.y-p.size*0.25,p.size*0.5,p.size*0.5);}
    else if(p.kind===3){ctx.globalAlpha=a;ctx.fillStyle=p.col;ctx.beginPath();ctx.ellipse(p.x,p.y,p.size,p.size*0.5,p.rot,0,7);ctx.fill();}
    else if(p.kind===4){ctx.globalAlpha=a;ctx.strokeStyle=p.col;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(p.x,p.y,p.size*(1+(1-a)*5),0,7);ctx.stroke();}
    else{ctx.globalAlpha=a*0.9;ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.size*(p.kind===1?(1.4-a*0.6):1),0,7);ctx.fill();}}
  ctx.globalAlpha=1;
  if(G.pops.length){ctx.save();ctx.font='900 16px "Avenir Next",Nunito,system-ui,sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.lineJoin='round';
    for(const p of G.pops){ctx.globalAlpha=Math.max(0,1-p.t/0.75);ctx.strokeStyle='rgba(40,90,40,0.45)';ctx.strokeText(p.txt,p.x,p.y);ctx.fillStyle=p.col;ctx.fillText(p.txt,p.x,p.y);}ctx.restore();ctx.globalAlpha=1;}
  // ----- screen space foreground -----
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const fw=SPR.fg.width/DPR,fh=SPR.fg.height/DPR,fox=-((cam.x*1.35*s)%fw+fw)%fw+(FEAT.flora?Math.sin(tm*1.5)*7:0);const fyo=CH-fh*0.5+Math.max(0,(W.H*T-cam.y-v.h/2))*s*0.6;
  if(fyo<CH)for(let x=fox;x<CW;x+=fw)ctx.drawImage(SPR.fg,x,fyo,fw,fh);
  drawFrameLeaves(tm);
  drawPollen(tm);
  if(G.endless){const g3=ctx.createLinearGradient(0,0,CW*0.08,0);g3.addColorStop(0,'rgba(255,255,255,0.55)');g3.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g3;ctx.fillRect(0,0,CW*0.08,CH);}
  if(G.pulse>0){ctx.fillStyle=`rgba(255,250,220,${G.pulse*0.22})`;ctx.fillRect(0,0,CW,CH);}
  if(P.deadT>0&&!G.endless){ctx.fillStyle=`rgba(255,255,240,${clamp(1-P.deadT/0.9,0,1)*0.8})`;ctx.fillRect(0,0,CW,CH);}
}
function drawPollen(tm){const n=Math.floor(POLLEN.length*G.fxScale),cx=W?W.cam.x*G.view.s*0.6:0;ctx.globalCompositeOperation='lighter';
  for(let i=0;i<n;i++){const p=POLLEN[i];const x=((p.x*CW-cx*p.v*0.5+Math.sin(G.t*0.6+p.ph)*20+performance.now()*0.01*p.v)%CW+CW)%CW,y=((p.y*CH+performance.now()*0.012*p.v)%CH);
    if(p.leaf||(FEAT.flora&&i%5===0)){ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(120,210,90,0.8)';ctx.beginPath();ctx.ellipse(x,y,7,3.5,performance.now()/700+p.ph,0,7);ctx.fill();ctx.globalCompositeOperation='lighter';}
    else{ctx.fillStyle='rgba(255,240,170,0.65)';ctx.beginPath();ctx.arc(x,y,p.s,0,7);ctx.fill();}}ctx.globalCompositeOperation='source-over';}
function drawFlower(x,y,h,tm){const sw=Math.sin(tm*(FEAT.flora?2.6:2)+x*0.05)*(FEAT.flora?0.22:0.12);ctx.save();ctx.translate(x,y);ctx.rotate(sw);ctx.strokeStyle='#3fae55';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-12);ctx.stroke();
  ctx.fillStyle=h<0.12?'#ff9ec0':h<0.24?'#fff':'#ffd45e';for(let i=0;i<5;i++){const a=i/5*6.28;ctx.beginPath();ctx.arc(Math.cos(a)*4,-14+Math.sin(a)*4,3,0,7);ctx.fill();}ctx.fillStyle='#f3a83a';ctx.beginPath();ctx.arc(0,-14,2.4,0,7);ctx.fill();ctx.restore();}
function drawStar(x,y,r,tm){ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(tm*1.5)*0.3);ctx.beginPath();for(let i=0;i<10;i++){const a=i/10*6.283-1.57,rr2=i%2?r*0.48:r;ctx.lineTo(Math.cos(a)*rr2,Math.sin(a)*rr2);}ctx.closePath();
  const g=ctx.createLinearGradient(0,-r,0,r);g.addColorStop(0,'#fff6b0');g.addColorStop(1,'#f3a83a');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.stroke();ctx.restore();}
function drawPower(p,tm){const y=p.y+Math.sin(tm*2.5)*5;ctx.globalCompositeOperation='lighter';ctx.drawImage(SPR.gWhite,p.x-40,y-40,80,80);ctx.globalCompositeOperation='source-over';
  ctx.fillStyle='rgba(255,255,255,0.55)';ctx.beginPath();ctx.arc(p.x,y,18,0,7);ctx.fill();ctx.strokeStyle=PW[p.k].c;ctx.lineWidth=3;ctx.stroke();ctx.fillStyle=PW[p.k].c;ctx.beginPath();
  if(p.k==='F'){ctx.ellipse(p.x,y,5,11,0.6,0,7);}else if(p.k==='D'){ctx.moveTo(p.x-8,y+6);ctx.lineTo(p.x+2,y-10);ctx.lineTo(p.x,y-1);ctx.lineTo(p.x+8,y-4);ctx.lineTo(p.x-2,y+11);ctx.lineTo(p.x,y+2);}
  else if(p.k==='B'){ctx.arc(p.x,y+3,8,Math.PI,0);}else{ctx.ellipse(p.x-5,y,9,4,-0.4,0,7);ctx.ellipse(p.x+5,y,9,4,0.4,0,7);}ctx.fill();ctx.strokeStyle='rgba(90,60,20,0.5)';ctx.lineWidth=1.5;ctx.stroke();}
function drawCheck(c,tm){const x=c.x,y=c.y+T/2;ctx.strokeStyle='#3fae55';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+6,y-30,x,y-56);ctx.stroke();
  ctx.fillStyle='#46c46a';ctx.beginPath();ctx.ellipse(x+10,y-28,10,5,-0.5,0,7);ctx.fill();
  if(c.on){ctx.globalCompositeOperation='lighter';ctx.drawImage(SPR.gGold,x-40,y-96,80,80);ctx.globalCompositeOperation='source-over';ctx.fillStyle='#ffd23a';for(let i=0;i<10;i++){const a=i/10*6.283+tm*0.6;ctx.beginPath();ctx.ellipse(x+Math.cos(a)*13,y-56+Math.sin(a)*13,9,4.5,a,0,7);ctx.fill();}ctx.fillStyle='#b8692b';ctx.beginPath();ctx.arc(x,y-56,9,0,7);ctx.fill();}
  else{ctx.fillStyle='#7cd36a';ctx.beginPath();ctx.ellipse(x,y-60,9,13,0,0,7);ctx.fill();ctx.fillStyle='#ffd45e';ctx.beginPath();ctx.ellipse(x,y-68,4,5,0,0,7);ctx.fill();}}
function drawGoal(g,tm){const x=g.x,y=g.y+T*1.5;ctx.globalCompositeOperation='lighter';ctx.drawImage(SPR.gGold,x-110,y-230,220,220);ctx.globalCompositeOperation='source-over';
  ctx.strokeStyle='#2f9e57';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x-14,y-60,x,y-120);ctx.stroke();ctx.fillStyle='#46c46a';ctx.beginPath();ctx.ellipse(x-20,y-60,22,9,0.5,0,7);ctx.ellipse(x+20,y-80,22,9,-0.5,0,7);ctx.fill();
  for(let l=0;l<2;l++){ctx.fillStyle=l?'#ffd23a':'#ff9ec0';const n=12,R=l?30:42;for(let i=0;i<n;i++){const a=i/n*6.283+tm*(l?-0.5:0.35);ctx.beginPath();ctx.ellipse(x+Math.cos(a)*R,y-130+Math.sin(a)*R,R*0.55,R*0.24,a,0,7);ctx.fill();}}
  ctx.fillStyle='#fff6c0';ctx.beginPath();ctx.arc(x,y-130,20,0,7);ctx.fill();ctx.fillStyle='#f3a83a';ctx.beginPath();ctx.arc(x,y-130,12,0,7);ctx.fill();}
function drawPlant(pl,tm){const g=pl.g,ease=1-Math.pow(1-g,3)*(1-Math.sin(g*6)*0.2),fade=pl.life-pl.t<1.4&&Math.floor(pl.t*8)%2===0?0.45:1;ctx.globalAlpha=fade;
  if(pl.k==='leaf'){const w=pl.w*ease;ctx.fillStyle='#3fbf5e';ctx.beginPath();ctx.moveTo(pl.x-w/2,pl.y);ctx.quadraticCurveTo(pl.x,pl.y-14*ease,pl.x+w/2,pl.y);ctx.quadraticCurveTo(pl.x,pl.y+24*ease,pl.x-w/2,pl.y);ctx.fill();
    ctx.fillStyle='#8ff07a';ctx.beginPath();ctx.moveTo(pl.x-w/2,pl.y);ctx.quadraticCurveTo(pl.x,pl.y-14*ease,pl.x+w/2,pl.y);ctx.quadraticCurveTo(pl.x,pl.y+5,pl.x-w/2,pl.y);ctx.fill();
    ctx.strokeStyle='#2a8f48';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(pl.x-w/2+6,pl.y+2);ctx.lineTo(pl.x+w/2-6,pl.y+2);ctx.stroke();}
  else if(pl.k==='pad'){const sq=1+Math.sin(pl.t*12)*0.06*Math.max(0,1-pl.t);ctx.fillStyle='#3fae55';ctx.fillRect(pl.x-4,pl.y-2,8,14);const w=pl.w*ease*sq;ctx.fillStyle='#ff9ec0';ctx.beginPath();ctx.ellipse(pl.x,pl.y-2,w/2,13*ease/sq,0,Math.PI,0);ctx.closePath();ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(pl.x-w*0.18,pl.y-8*ease,3.5,0,7);ctx.arc(pl.x+w*0.15,pl.y-6*ease,2.5,0,7);ctx.fill();}
  else{const h=pl.h*ease,rich=!!FEAT.vine;ctx.strokeStyle=rich?'#248a48':'#2f9e57';ctx.lineWidth=rich?8:7;ctx.beginPath();ctx.moveTo(pl.x,pl.y);for(let i=1;i<=12;i++){const yy=pl.y-h*i/12;ctx.lineTo(pl.x+Math.sin(i*1.3+tm*(rich?2.4:2))*(rich?6:5),yy);}ctx.stroke();
    if(rich){ctx.strokeStyle='#8ef0a0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(pl.x,pl.y);for(let i=1;i<=12;i++){const yy=pl.y-h*i/12;ctx.lineTo(pl.x+Math.sin(i*1.3+tm*2.4)*6,yy);}ctx.stroke();}
    ctx.fillStyle=rich?'#7aee78':'#6fe06a';for(let i=1;i<6;i++){const yy=pl.y-h*i/6,sd=i%2?1:-1;ctx.beginPath();ctx.ellipse(pl.x+sd*(rich?13:11),yy,rich?13:11,5,sd*0.5+(rich?Math.sin(tm*2+i)*0.08:0),0,7);ctx.fill();}
    ctx.fillStyle='#ffd45e';ctx.beginPath();ctx.arc(pl.x,pl.y-h,(rich?7:6)*ease,0,7);ctx.fill();
    if(rich){ctx.fillStyle='#fff3a8';ctx.beginPath();ctx.arc(pl.x-2,pl.y-h-2,2.2*ease,0,7);ctx.fill();}}
  ctx.globalAlpha=1;}
function drawEnemy(e,tm){ctx.save();ctx.translate(e.x,e.y);
  if(e.k==='b'){const f=Math.sign(e.vx)||1;ctx.scale(f,1);const st=Math.sin(e.t*14);ctx.strokeStyle='#2a4a6a';ctx.lineWidth=2.5;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(i*8,6);ctx.lineTo(i*8+st*3*(i%2?1:-1),13);ctx.stroke();}
    ctx.fillStyle='#4fb4ec';ctx.beginPath();ctx.ellipse(0,0,17,13,0,Math.PI,0);ctx.lineTo(17,6);ctx.lineTo(-17,6);ctx.closePath();ctx.fill();ctx.strokeStyle='#1f6a9a';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-5,-6,3,0,7);ctx.arc(6,-9,2.4,0,7);ctx.fill();ctx.fillStyle='#2a4a6a';ctx.beginPath();ctx.arc(14,0,6,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(16,-1,2.6,0,7);ctx.fill();}
  else{const fl=Math.sin(e.t*40);ctx.fillStyle='rgba(255,255,255,0.8)';ctx.beginPath();ctx.ellipse(-4,-14,8,12*Math.abs(fl)+2,-0.4,0,7);ctx.ellipse(6,-14,8,12*Math.abs(fl)+2,0.4,0,7);ctx.fill();
    ctx.fillStyle='#ffd23a';ctx.beginPath();ctx.ellipse(0,0,16,13,0,0,7);ctx.fill();ctx.fillStyle='#6a4a20';ctx.fillRect(-6,-12,4,24);ctx.fillRect(3,-12,4,24);ctx.strokeStyle='#b8792b';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,16,13,0,0,7);ctx.stroke();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-9,-3,4,0,7);ctx.fill();ctx.fillStyle='#2a2a2a';ctx.beginPath();ctx.arc(-10,-3,2,0,7);ctx.fill();}
  ctx.restore();}
function leafBody(x,y,sx,sy,f,fill,stroke,sw){ctx.save();ctx.translate(x,y);ctx.scale(sx*f,sy);ctx.beginPath();ctx.moveTo(0,-34);ctx.bezierCurveTo(13,-30,18,-16,17,-10);ctx.bezierCurveTo(17,-2,10,0,0,0);ctx.bezierCurveTo(-10,0,-17,-2,-17,-10);ctx.bezierCurveTo(-18,-16,-13,-30,0,-34);ctx.closePath();
  ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=(sw||2.4)/Math.max(0.6,sx);ctx.stroke();}ctx.restore();}
function drawPlayer(tm){
  if(P.deadT>0&&!G.endless)return;
  const tr=P.trail;for(let i=0;i<tr.length;i++){const t=tr[i],a=(1-(G.t-t.t)/0.28)*0.5;ctx.globalAlpha=Math.max(0,a);leafBody(t.x,t.y,t.sx*1.22,t.sy*1.22,t.f,P.power?PW[P.power].c:'#b8ffcf');}ctx.globalAlpha=1;
  if(P.hurtT>0&&Math.floor(P.hurtT*14)%2===0)return;
  ctx.save();ctx.translate(P.x,P.y);ctx.scale(1.22,1.22);ctx.translate(-P.x,-P.y);drawPlayerBody(tm);ctx.restore();}
function drawPlayerBody(tm){
  const x=P.x,y=P.y,f=P.face,run=P.onG&&Math.abs(P.vx)>30,ph=G.t*Math.abs(P.vx)*0.05;
  if(FEAT.hero){ctx.fillStyle='rgba(30,70,36,0.2)';ctx.beginPath();ctx.ellipse(x,y+2,16*P.sx,4.4,0,0,7);ctx.fill();}
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=FEAT.hero?0.28:0.55;ctx.drawImage(P.power?SPR.gWhite:SPR.gGreen,x-40,y-56,80,80);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  if(FEAT.move&&P.dashT>0){ctx.globalAlpha=0.5;ctx.strokeStyle='#fff';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x-f*(18+i*8),y-24+i*6);ctx.lineTo(x-f*(34+i*10),y-24+i*6);ctx.stroke();}ctx.globalAlpha=1;}
  if(P.glide){ctx.fillStyle='#c9b6ff';ctx.beginPath();ctx.ellipse(x,y-44,30,8,0,Math.PI,0);ctx.fill();}
  // feet
  ctx.fillStyle='#f3a83a';const fa=run?Math.sin(ph)*5:0;ctx.beginPath();ctx.ellipse(x-7*P.sx+fa,y-2,6,4,0,0,7);ctx.ellipse(x+7*P.sx-fa,y-2,6,4,0,0,7);ctx.fill();
  const bob=run?Math.abs(Math.sin(ph))*-2:Math.sin(tm*3)*0.8;
  // sprout
  ctx.save();ctx.translate(x,y-34*P.sy+bob);ctx.rotate((FEAT.move?(P.lean||0):clamp(-P.vx/900,-0.5,0.5))+Math.sin(tm*4)*0.08);ctx.strokeStyle='#2a8f48';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(0,2);ctx.lineTo(0,-8);ctx.stroke();
  ctx.fillStyle='#5fd85a';ctx.beginPath();ctx.ellipse(-7,-10,8,4,0.5,0,7);ctx.fill();ctx.fillStyle='#8ff07a';ctx.beginPath();ctx.ellipse(7,-12,9,4.2,-0.5,0,7);ctx.fill();ctx.restore();
  if(FEAT.hero)leafBody(x,y+bob,P.sx*1.065,P.sy*1.065,f,'#f7fff1',null);
  const g=ctx.createLinearGradient(x,y-34,x,y);g.addColorStop(0,'#a9ff8f');g.addColorStop(1,'#2fb35a');leafBody(x,y+bob,P.sx,P.sy,f,g,'#1d6b39',FEAT.hero?3.15:2.4);
  // face
  const ey=y-14*P.sy+bob,ex=x+f*4*P.sx;const look=f*1.5;
  ctx.fillStyle='#fff';const eh=P.blink<0?1:6;ctx.beginPath();ctx.ellipse(ex-5,ey,3.6,eh,0,0,7);ctx.ellipse(ex+5,ey,3.6,eh,0,0,7);ctx.fill();
  if(eh>2){ctx.fillStyle='#1d3324';ctx.beginPath();ctx.ellipse(ex-5+look,ey+1,2.2,3.6,0,0,7);ctx.ellipse(ex+5+look,ey+1,2.2,3.6,0,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ex-4.2+look,ey-1,1,0,7);ctx.arc(ex+5.8+look,ey-1,1,0,7);ctx.fill();}
  ctx.fillStyle='rgba(255,150,180,0.75)';ctx.beginPath();ctx.ellipse(ex-10,ey+6,3.2,2,0,0,7);ctx.ellipse(ex+10,ey+6,3.2,2,0,0,7);ctx.fill();
  ctx.strokeStyle='#1d3324';ctx.lineWidth=1.6;ctx.beginPath();if(P.hurtT>0.8){ctx.arc(ex,ey+9,2.5,0,7);}else ctx.arc(ex,ey+5,3,0.2,Math.PI-0.2);ctx.stroke();
}
