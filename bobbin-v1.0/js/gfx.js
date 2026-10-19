/* Bobbin's Button Box - procedural craft textures and drawing */
var GFX=(function(){
  var TP=64; // texture pixels per metre
  var pats={},texCanvases={};
  function rng(seed){var a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function mk(w,h,fn){var c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);return c}
  function shade(hex,amt){var c=hex.replace('#','');var n=parseInt(c,16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    if(amt>0){r+=(255-r)*amt;g+=(255-g)*amt;b+=(255-b)*amt}else{r*=1+amt;g*=1+amt;b*=1+amt}
    return 'rgb('+(r|0)+','+(g|0)+','+(b|0)+')'}
  function fibres(g,w,h,n,seed,light,dark,len){var R=rng(seed);g.lineWidth=1;for(var i=0;i<n;i++){var x=R()*w,y=R()*h,a=R()*Math.PI*2,l=(len||5)*(0.4+R());
      g.strokeStyle=R()<0.5?light:dark;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+Math.cos(a+1)*l*0.5,y+Math.sin(a+1)*l*0.5,x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}}
  function texCard(){return mk(256,256,function(g,w,h){g.fillStyle='#d9ab6c';g.fillRect(0,0,w,h);
      for(var y=0;y<h;y+=8){g.fillStyle='rgba(255,236,200,0.18)';g.fillRect(0,y,w,3);g.fillStyle='rgba(120,75,30,0.08)';g.fillRect(0,y+5,w,2)}
      var R=rng(7);for(var i=0;i<900;i++){g.fillStyle=R()<0.5?'rgba(120,70,25,0.12)':'rgba(255,240,210,0.15)';g.fillRect(R()*w,R()*h,1+R()*2,1)}
      fibres(g,w,h,250,3,'rgba(255,240,210,0.12)','rgba(110,70,30,0.10)',8)})}
  function texFelt(col,seed){return mk(256,256,function(g,w,h){g.fillStyle=col;g.fillRect(0,0,w,h);
      var R=rng(seed||11);for(var i=0;i<1600;i++){g.fillStyle=R()<0.5?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.05)';var s=2+R()*5;g.beginPath();g.arc(R()*w,R()*h,s,0,7);g.fill()}
      fibres(g,w,h,2200,seed||5,'rgba(255,255,255,0.13)','rgba(0,0,0,0.09)',5)})}
  function texSponge(){return mk(256,256,function(g,w,h){g.fillStyle='#ffd65c';g.fillRect(0,0,w,h);var R=rng(21);
      for(var i=0;i<260;i++){var x=R()*w,y=R()*h,r=2+R()*6;g.fillStyle='rgba(200,140,20,0.45)';g.beginPath();g.ellipse(x,y,r,r*(0.6+R()*0.5),R()*3,0,7);g.fill();
        g.fillStyle='rgba(255,245,190,0.6)';g.beginPath();g.ellipse(x-1,y-r*0.5,r*0.7,r*0.3,0,0,7);g.fill()}})}
  function texPaper(col){return mk(256,256,function(g,w,h){g.fillStyle=col;g.fillRect(0,0,w,h);fibres(g,w,h,500,9,'rgba(255,255,255,0.4)','rgba(150,110,60,0.06)',10)})}
  function texWood(){return mk(256,256,function(g,w,h){g.fillStyle='#f1c88a';g.fillRect(0,0,w,h);var R=rng(33);
      for(var y=0;y<h;y+=3){g.strokeStyle='rgba(170,110,50,'+(0.05+R()*0.12)+')';g.lineWidth=1+R()*1.5;g.beginPath();g.moveTo(0,y);
        for(var x=0;x<=w;x+=32)g.lineTo(x,y+Math.sin(x*0.02+y)*2);g.stroke()}})}
  function texCork(){return mk(256,256,function(g,w,h){g.fillStyle='#e2b47c';g.fillRect(0,0,w,h);var R=rng(44);
      for(var i=0;i<2200;i++){g.fillStyle=R()<0.6?'rgba(150,90,40,0.25)':'rgba(255,230,190,0.3)';g.fillRect(R()*w,R()*h,1+R()*2.5,1+R()*2)}})}
  function texPeg(){return mk(128,128,function(g,w,h){g.fillStyle='#f0d2a4';g.fillRect(0,0,w,h);for(var y=16;y<h;y+=32)for(var x=16;x<w;x+=32){
      g.fillStyle='rgba(140,95,50,0.35)';g.beginPath();g.arc(x,y,4,0,7);g.fill();g.fillStyle='rgba(255,245,225,0.6)';g.beginPath();g.arc(x+1,y+1.5,3,0,3.1);g.fill()}})}
  function texDots(bg,dot){return mk(128,128,function(g,w,h){g.fillStyle=bg;g.fillRect(0,0,w,h);g.fillStyle=dot;
      for(var y=0;y<h;y+=32)for(var x=0;x<w;x+=32){g.beginPath();g.arc(x+((y/32)%2?16:0)+8,y+8,5,0,7);g.fill()}})}
  function texGingham(c1,c2){return mk(128,128,function(g,w,h){g.fillStyle='#fffaf3';g.fillRect(0,0,w,h);g.fillStyle=c1;for(var x=0;x<w;x+=32)g.fillRect(x,0,16,h);for(var y=0;y<h;y+=32)g.fillRect(0,y,w,16);
      g.fillStyle=c2;for(var x2=0;x2<w;x2+=32)for(var y2=0;y2<h;y2+=32)g.fillRect(x2,y2,16,16);fibres(g,w,h,300,13,'rgba(255,255,255,0.25)','rgba(0,0,0,0.04)',6)})}
  function texStripes(c1,c2){return mk(128,128,function(g,w,h){g.fillStyle=c1;g.fillRect(0,0,w,h);g.fillStyle=c2;for(var x=0;x<w;x+=32){g.fillRect(x,0,12,h)}g.fillStyle='rgba(255,255,255,0.5)';
      for(var y=10;y<h;y+=32)for(var x3=22;x3<w;x3+=32){g.beginPath();g.arc(x3,y,3,0,7);g.fill()}})}
  function texPlanks(){return mk(256,128,function(g,w,h){g.fillStyle='#f3d9ad';g.fillRect(0,0,w,h);var R=rng(71);for(var y=0;y<h;y+=32){g.fillStyle='rgba(150,100,50,'+(0.05+R()*0.08)+')';g.fillRect(0,y,w,32);
      g.fillStyle='rgba(120,80,40,0.25)';g.fillRect(0,y+30,w,2);for(var x=R()*60;x<w;x+=90+R()*60){g.fillRect(x,y,2,30);g.beginPath();g.arc(x+20,y+15,2,0,7);g.fill()}}})}
  function texConfetti(){return mk(128,128,function(g,w,h){g.fillStyle='#fff6e0';g.fillRect(0,0,w,h);var R=rng(91),C=['#ff9fc4','#ffd75e','#7fe0c0','#8fd3ff','#b79cff','#ffad5c'];
      for(var i=0;i<40;i++){g.fillStyle=C[i%6];g.save();g.translate(R()*w,R()*h);g.rotate(R()*3);g.fillRect(-4,-2,8,4);g.restore()}})}
  var FELT={green:'#7fcf6a',grass:'#8ed46f',blue:'#5ab4ff',sky:'#8fd3ff',pink:'#ff9fc4',yellow:'#ffd75e',orange:'#ffad5c',purple:'#b79cff',mint:'#7fe0c0',cream:'#fff0d6',teal:'#5fd0c8',red:'#ff8a7a'};
  function init(ctx){
    var M=(typeof DOMMatrix!=='undefined')?new DOMMatrix().scale(1/TP,1/TP):null;
    function P(name,c){texCanvases[name]=c;var p=ctx.createPattern(c,'repeat');if(M&&p.setTransform)p.setTransform(M);pats[name]=p}
    P('card',texCard());P('sponge',texSponge());P('wood',texWood());P('cork',texCork());P('paper',texPaper('#fff8ea'));
    for(var k in FELT)P('felt_'+k,texFelt(FELT[k],k.length*13+k.charCodeAt(0)));
    var M2=M?new DOMMatrix().scale(1/40,1/40):null;
    var pg=ctx.createPattern(texPeg(),'repeat');if(M2&&pg.setTransform)pg.setTransform(M2);pats.peg=pg;
    var dt=ctx.createPattern(texDots('#dff4ef','#c7ebe4'),'repeat');if(M2&&dt.setTransform)dt.setTransform(M2);pats.dots=dt;
    function P2(name,c){var p=ctx.createPattern(c,'repeat');if(M2&&p.setTransform)p.setTransform(M2);pats[name]=p}
    P2('fabric',texDots('#ffe6ef','#ffc8da'));P2('gingham',texGingham('rgba(120,180,240,0.28)','rgba(90,150,230,0.4)'));P2('stripes',texStripes('#f1e6ff','#e4d4fb'));
    P2('planks',texPlanks());P2('confetti',texConfetti());P2('ginghamR',texGingham('rgba(255,120,140,0.22)','rgba(255,110,130,0.36)'));
  }
  function pat(n){return pats[n]||'#d9ab6c'}
  function rr(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function stitch(g,col,lw,dash){g.save();g.strokeStyle=col||'rgba(255,248,230,0.9)';g.lineWidth=lw||0.045;g.setLineDash(dash||[0.13,0.09]);g.lineCap='round';g.stroke();g.restore()}
  var INK='#5a3a28';
  function wtext(g,t,x,y,size,col){g.save();g.translate(x,y);g.scale(size/40,size/40);g.font='bold 40px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle=col;g.fillText(t,0,0);g.restore()}
  /* ---------- static solids ---------- */
  function solidShadow(g,s){g.fillStyle='rgba(110,70,30,0.16)';if(s.poly){g.beginPath();s.poly.forEach(function(p,i){i?g.lineTo(p[0]+0.12,p[1]+0.14):g.moveTo(p[0]+0.12,p[1]+0.14)});g.fill()}
    else{rr(g,s.x+0.12,s.y+0.14,s.w,s.h,0.1);g.fill()}}
  function drawSolid(g,s){
    if(s.inv)return;
    var mat=s.mat||'card';
    if(s.poly){g.beginPath();s.poly.forEach(function(p,i){i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])});g.closePath();
      g.fillStyle=mat==='wood'?pat('wood'):mat==='felt'?pat('felt_'+(s.col||'green')):pat('card');g.fill();
      g.strokeStyle='rgba(110,70,30,0.55)';g.lineWidth=0.05;g.stroke();
      if(s.topCol){g.save();g.clip();g.beginPath();var a=s.poly[0],b=s.poly[1];g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.lineWidth=0.5;g.strokeStyle=pat('felt_'+s.topCol);g.stroke();g.restore();
        g.beginPath();g.moveTo(a[0],a[1]+0.18);g.lineTo(b[0],b[1]+0.18);stitch(g)}
      return}
    var x=s.x,y=s.y,w=s.w,h=s.h;
    if(mat==='felt'){rr(g,x,y,w,h,0.14);g.fillStyle=pat('felt_'+(s.col||'blue'));g.fill();g.strokeStyle='rgba(60,40,30,0.35)';g.lineWidth=0.04;g.stroke();
      rr(g,x+0.1,y+0.1,w-0.2,h-0.2,0.1);stitch(g);return}
    if(mat==='wood'){rr(g,x,y,w,h,0.06);g.fillStyle=pat('wood');g.fill();g.strokeStyle='rgba(140,90,40,0.6)';g.lineWidth=0.04;g.stroke();return}
    rr(g,x,y,w,h,0.07);g.fillStyle=pat('card');g.fill();
    g.fillStyle='rgba(255,236,200,0.35)';g.fillRect(x+0.04,y+0.03,w-0.08,0.07);
    g.strokeStyle='rgba(120,75,35,0.6)';g.lineWidth=0.045;rr(g,x,y,w,h,0.07);g.stroke();
    if(s.topCol){var th=Math.min(0.42,h);g.save();rr(g,x,y,w,h,0.07);g.clip();g.fillStyle=pat('felt_'+s.topCol);g.fillRect(x,y,w,th);
      // pinking-shear zigzag edge
      g.beginPath();g.moveTo(x,y+th);for(var zx=x;zx<x+w;zx+=0.16){g.lineTo(zx+0.08,y+th+0.08);g.lineTo(zx+0.16,y+th)}g.lineTo(x+w,y);g.lineTo(x,y);g.closePath();g.fill();g.restore();
      g.beginPath();g.moveTo(x+0.06,y+th*0.5);g.lineTo(x+w-0.06,y+th*0.5);stitch(g,'rgba(255,250,235,0.85)',0.04)}
    if(s.tape){g.save();g.translate(x+s.tape*w,y);g.rotate(0.08);g.fillStyle='rgba(255,246,214,0.55)';g.fillRect(-0.22,-0.1,0.44,Math.min(0.8,h*0.6));g.restore()}
  }
  /* ---------- character: Bobbin, a little yarn ball ---------- */
  var WR=[[0.3,0.95],[0.9,0.7],[-0.5,0.85],[1.6,0.55],[-1.1,0.6],[2.3,0.9]];
  function drawBobbin(g,p){
    var r=p.r||0.5,col=p.col||'#4aa8ff',dk=shade(col,-0.32),lt=shade(col,0.35);
    g.save();g.translate(p.x,p.y+r);g.scale(p.sx||1,p.sy||1);g.translate(0,-r);
    if(p.tilt)g.rotate(p.tilt);
    var f=p.face||1,run=p.run||0,air=p.air;
    // feet
    var fo=air?0:Math.sin(run)*0.14,lift1=air?-0.04:Math.max(0,Math.sin(run))*-0.08,lift2=air?-0.04:Math.max(0,-Math.sin(run))*-0.08;
    g.fillStyle=dk;g.strokeStyle=INK;g.lineWidth=0.035;
    g.beginPath();g.ellipse(-0.19+fo,r*0.86+lift1,0.17,0.1,0,0,7);g.fill();g.stroke();
    g.beginPath();g.ellipse(0.19-fo,r*0.86+lift2,0.17,0.1,0,0,7);g.fill();g.stroke();
    // back arm
    var armY=0.12+(air?-0.12:0);
    if(!p.grab){g.fillStyle=dk;g.beginPath();g.arc(-f*(r*0.92),armY+Math.sin(run+1.5)*0.04,0.12,0,7);g.fill();g.stroke()}
    // body ball
    g.beginPath();g.arc(0,0,r*0.94,0,7);g.fillStyle=col;g.fill();
    g.save();g.clip();
    g.lineWidth=0.05;
    for(var i=0;i<WR.length;i++){var w=WR[i];g.save();g.rotate(w[0]+(p.spin||0)*0.1);g.beginPath();g.ellipse(0,0,r*w[1],r*0.98,0,0,7);g.strokeStyle='rgba(255,255,255,0.22)';g.stroke();
      g.beginPath();g.ellipse(0.04,0.03,r*w[1],r*0.98,0,0,7);g.strokeStyle='rgba(0,0,0,0.13)';g.lineWidth=0.03;g.stroke();g.lineWidth=0.05;g.restore()}
    var gr=g.createRadialGradient(-0.18,-0.22,0.02,0,0,r);gr.addColorStop(0,'rgba(255,255,255,0.45)');gr.addColorStop(0.45,'rgba(255,255,255,0.05)');gr.addColorStop(1,'rgba(40,20,10,0.25)');
    g.fillStyle=gr;g.fillRect(-r,-r,2*r,2*r);g.restore();
    g.beginPath();g.arc(0,0,r*0.94,0,7);g.strokeStyle=INK;g.lineWidth=0.04;g.stroke();
    // tuft
    var tw=p.tuft||0;g.beginPath();g.moveTo(0.02,-r*0.9);g.bezierCurveTo(0.05,-r*1.25,-0.15+tw*0.2,-r*1.35,-0.22+tw*0.35,-r*1.18);
    g.strokeStyle=dk;g.lineWidth=0.07;g.lineCap='round';g.stroke();g.beginPath();g.arc(-0.24+tw*0.35,-r*1.16,0.06,0,7);g.fillStyle=lt;g.fill();g.lineWidth=0.03;g.strokeStyle=INK;g.stroke();
    // face patch
    var fx=f*0.13,fy=-0.03+(p.look||0)*0.05;
    g.beginPath();g.ellipse(fx,fy,0.29,0.24,0,0,7);g.fillStyle='#fff3df';g.fill();g.strokeStyle='rgba(90,58,40,0.45)';g.lineWidth=0.025;g.stroke();
    g.beginPath();g.ellipse(fx,fy,0.24,0.19,0,0,7);stitch(g,'rgba(200,150,110,0.7)',0.02,[0.05,0.04]);
    // eyes (sewn buttons)
    var ex=0.105,ey=fy-0.04,blink=p.blink,ex1=fx-ex,ex2=fx+ex,expr=p.expr||'happy';
    function eye(x){if(blink||expr==='joy'){g.beginPath();g.arc(x,ey+0.02,0.05,Math.PI*1.1,Math.PI*1.9);g.strokeStyle='#2b2230';g.lineWidth=0.035;g.stroke();return}
      var er=expr==='wow'?0.075:0.064;g.beginPath();g.arc(x,ey,er,0,7);g.fillStyle='#2b2230';g.fill();
      g.fillStyle='rgba(255,255,255,0.35)';g.beginPath();g.arc(x-0.022,ey,0.012,0,7);g.arc(x+0.022,ey,0.012,0,7);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(x-0.024,ey-0.028,0.016,0,7);g.fill()}
    eye(ex1);eye(ex2);
    if(expr==='effort'){g.strokeStyle='#2b2230';g.lineWidth=0.03;g.beginPath();g.moveTo(ex1-0.06,ey-0.1);g.lineTo(ex1+0.04,ey-0.075);g.moveTo(ex2+0.06,ey-0.1);g.lineTo(ex2-0.04,ey-0.075);g.stroke()}
    // cheeks
    g.fillStyle='rgba(255,130,160,0.45)';g.beginPath();g.ellipse(fx-0.19,fy+0.07,0.05,0.032,0,0,7);g.ellipse(fx+0.19,fy+0.07,0.05,0.032,0,0,7);g.fill();
    // mouth
    g.strokeStyle='#7a3b2e';g.lineWidth=0.03;g.lineCap='round';var my=fy+0.08;g.beginPath();
    if(expr==='wow'){g.ellipse(fx,my+0.02,0.035,0.045,0,0,7);g.fillStyle='#7a3b2e';g.fill()}
    else if(expr==='effort'){g.moveTo(fx-0.07,my+0.02);g.lineTo(fx-0.035,my);g.lineTo(fx,my+0.02);g.lineTo(fx+0.035,my);g.lineTo(fx+0.07,my+0.02);g.stroke()}
    else if(expr==='joy'){g.moveTo(fx-0.08,my-0.01);g.quadraticCurveTo(fx,my+0.12,fx+0.08,my-0.01);g.closePath();g.fillStyle='#7a3b2e';g.fill();g.fillStyle='#ff9bb0';g.beginPath();g.ellipse(fx,my+0.05,0.03,0.015,0,0,7);g.fill()}
    else if(expr==='sleepy'){g.moveTo(fx-0.03,my+0.01);g.lineTo(fx+0.03,my+0.01);g.stroke()}
    else{g.moveTo(fx-0.07,my-0.005);g.quadraticCurveTo(fx,my+0.07,fx+0.07,my-0.005);g.stroke();
      for(var s=-1;s<=1;s+=2){g.beginPath();g.moveTo(fx+s*0.035,my+0.015);g.lineTo(fx+s*0.04,my+0.05);g.lineWidth=0.012;g.stroke()}g.lineWidth=0.03}
    // front arm / grab arm
    g.fillStyle=dk;g.strokeStyle=INK;g.lineWidth=0.035;
    if(p.grab){var gx=p.grab[0],gy=p.grab[1];var L=Math.hypot(gx,gy)||1,ux=gx/L,uy=gy/L,reach=Math.min(L,0.78);
      var sx2=ux*r*0.7,sy2=uy*r*0.7+0.05;g.beginPath();g.moveTo(sx2,sy2);g.lineTo(ux*reach,uy*reach);g.lineCap='round';g.lineWidth=0.14;g.strokeStyle=INK;g.stroke();g.lineWidth=0.09;g.strokeStyle=dk;g.stroke();
      g.beginPath();g.arc(ux*reach,uy*reach,0.13,0,7);g.fill();g.lineWidth=0.035;g.strokeStyle=INK;g.stroke();
      g.strokeStyle='rgba(255,255,255,0.7)';g.lineWidth=0.02;g.beginPath();g.arc(ux*reach,uy*reach,0.07,0,3);g.stroke()}
    else{g.beginPath();g.arc(f*(r*0.95),armY+Math.sin(run)*0.05,0.12,0,7);g.fill();g.stroke()}
    g.restore();
  }
  /* ---------- objects ---------- */
  function drawBox(g,o,b){var w=o.w,h=o.h;g.save();
    if(o.kind==='sponge'){rr(g,-w/2,-h/2,w,h,0.16);g.fillStyle=pat('sponge');g.fill();g.strokeStyle='#b8861c';g.lineWidth=0.05;g.stroke();
      rr(g,-w/2+0.04,-h/2+0.04,w-0.08,h*0.22,0.12);g.fillStyle='rgba(255,250,210,0.35)';g.fill();
      if(o.heavy){wtext(g,'HEAVY',0,0.02,0.34,'rgba(90,58,40,0.55)')}}
    else if(o.kind==='bag'){g.beginPath();g.moveTo(-w/2+0.05,h/2);g.quadraticCurveTo(-w/2-0.05,-h/4,-w*0.2,-h/2+0.05);g.lineTo(w*0.2,-h/2+0.05);g.quadraticCurveTo(w/2+0.05,-h/4,w/2-0.05,h/2);g.closePath();
      g.fillStyle=pat('felt_purple');g.fill();g.strokeStyle='rgba(60,30,70,0.6)';g.lineWidth=0.04;g.stroke();
      g.beginPath();g.moveTo(-w*0.22,-h/2+0.14);g.lineTo(w*0.22,-h/2+0.14);g.strokeStyle='#ffd75e';g.lineWidth=0.08;g.stroke();
      g.beginPath();g.ellipse(0,-h/2+0.02,0.14,0.08,0,0,7);g.fillStyle=pat('felt_purple');g.fill();
      [[-0.15,0.1,'#ffd75e'],[0.18,0.2,'#7fe0c0'],[0,0.32,'#ff9fc4']].forEach(function(c){g.beginPath();g.arc(c[0],c[1],0.09,0,7);g.fillStyle=c[2];g.fill();g.fillStyle='rgba(0,0,0,0.3)';
        g.beginPath();g.arc(c[0]-0.025,c[1],0.014,0,7);g.arc(c[0]+0.025,c[1],0.014,0,7);g.fill()})}
    else{rr(g,-w/2,-h/2,w,h,0.06);g.fillStyle=pat('card');g.fill();g.strokeStyle='rgba(120,75,35,0.7)';g.lineWidth=0.045;g.stroke();
      g.fillStyle='rgba(255,246,214,0.6)';g.fillRect(-0.16,-h/2,0.32,h);g.strokeStyle='rgba(150,100,50,0.25)';g.lineWidth=0.02;g.strokeRect(-0.16,-h/2,0.32,h);
      g.strokeStyle='rgba(110,70,30,0.55)';g.lineWidth=0.04;g.beginPath();var ax=-w*0.3,ay=0;g.moveTo(ax,ay+0.18);g.lineTo(ax,ay-0.14);g.moveTo(ax-0.08,ay-0.06);g.lineTo(ax,ay-0.16);g.lineTo(ax+0.08,ay-0.06);g.stroke();
      g.beginPath();g.moveTo(w*0.3,0.18);g.lineTo(w*0.3,-0.14);g.moveTo(w*0.22,-0.06);g.lineTo(w*0.3,-0.16);g.lineTo(w*0.38,-0.06);g.stroke()}
    g.restore()}
  var BALLCOL=['#ff9fc4','#ffd75e','#7fe0c0','#8fd3ff','#b79cff'];
  function drawBall(g,o){var r=o.r;g.beginPath();g.arc(0,0,r,0,7);g.fillStyle=o.heavy?pat('felt_orange'):pat('felt_pink');g.fill();
    g.save();g.clip();for(var i=0;i<3;i++){g.beginPath();g.ellipse(0,0,r*(0.35+i*0.3),r*1.05,i*1.05,0,7);g.strokeStyle='rgba(255,250,235,0.8)';g.lineWidth=0.035;g.setLineDash([0.08,0.06]);g.stroke()}g.setLineDash([]);
    var gr=g.createRadialGradient(-r*0.35,-r*0.4,0.02,0,0,r);gr.addColorStop(0,'rgba(255,255,255,0.4)');gr.addColorStop(1,'rgba(60,30,10,0.25)');g.fillStyle=gr;g.fillRect(-r,-r,2*r,2*r);g.restore();
    g.beginPath();g.arc(0,0,r,0,7);g.strokeStyle=INK;g.lineWidth=0.04;g.stroke();
    if(o.heavy){g.save();g.rotate(-o.body.getAngle());wtext(g,'HEAVY',0,0.02,0.22,'rgba(90,40,10,0.6)');g.restore()}}
  function drawRopeSegs(g,pts){if(pts.length<2)return;g.lineCap='round';g.lineJoin='round';
    g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(var i=1;i<pts.length-1;i++){var mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;g.quadraticCurveTo(pts[i][0],pts[i][1],mx,my)}
    g.lineTo(pts[pts.length-1][0],pts[pts.length-1][1]);g.strokeStyle='rgba(90,40,20,0.35)';g.lineWidth=0.15;g.stroke();g.strokeStyle='#ff8fa8';g.lineWidth=0.1;g.stroke();
    g.strokeStyle='rgba(255,255,255,0.55)';g.lineWidth=0.035;g.setLineDash([0.07,0.09]);g.stroke();g.setLineDash([]);
    var e=pts[pts.length-1];g.beginPath();g.arc(e[0],e[1],0.17,0,7);g.fillStyle=pat('felt_yellow');g.fill();g.strokeStyle=INK;g.lineWidth=0.03;g.stroke();
    var a=pts[0];g.beginPath();g.arc(a[0],a[1],0.14,0,7);g.fillStyle='#c9c9d6';g.fill();g.stroke()}
  function drawString(g,x1,y1,x2,y2,sag){g.beginPath();g.moveTo(x1,y1);g.quadraticCurveTo((x1+x2)/2,(y1+y2)/2+(sag||0.2),x2,y2);g.strokeStyle='rgba(255,255,255,0.9)';g.lineWidth=0.05;g.stroke();g.strokeStyle='rgba(120,80,60,0.6)';g.lineWidth=0.02;g.setLineDash([0.05,0.05]);g.stroke();g.setLineDash([])}
  function spool(g,x,y,s,col){g.save();g.translate(x,y);g.scale(s,s);g.fillStyle=pat('wood');rr(g,-0.5,-0.55,1,0.14,0.05);g.fill();rr(g,-0.5,0.41,1,0.14,0.05);g.fill();
    g.fillStyle=col||'#ff9fc4';g.fillRect(-0.36,-0.41,0.72,0.82);g.strokeStyle='rgba(255,255,255,0.35)';g.lineWidth=0.03;for(var y2=-0.36;y2<0.4;y2+=0.07){g.beginPath();g.moveTo(-0.36,y2);g.lineTo(0.36,y2+0.03);g.stroke()}
    g.strokeStyle='rgba(90,58,40,0.5)';g.lineWidth=0.04;g.strokeRect(-0.36,-0.41,0.72,0.82);g.restore()}
  function sewButton(g,x,y,r,col,holes){g.beginPath();g.arc(x,y,r,0,7);g.fillStyle=col;g.fill();g.strokeStyle='rgba(60,30,20,0.4)';g.lineWidth=r*0.08;g.stroke();
    g.beginPath();g.arc(x,y,r*0.75,0,7);g.strokeStyle='rgba(0,0,0,0.12)';g.lineWidth=r*0.1;g.stroke();
    g.fillStyle='rgba(60,30,20,0.55)';var hs=holes||4,d=r*0.28;for(var i=0;i<hs;i++){var a=i/hs*Math.PI*2+Math.PI/4;g.beginPath();g.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,r*0.11,0,7);g.fill()}
    g.fillStyle='rgba(255,255,255,0.35)';g.beginPath();g.ellipse(x-r*0.35,y-r*0.4,r*0.3,r*0.15,-0.5,0,7);g.fill()}
  function bubble(g,x,y,r,t,kind){g.save();g.translate(x,y);var s=1+Math.sin(t*3)*0.04;g.scale(s,1/s);
    var gl=g.createRadialGradient(0,0,r*0.5,0,0,r*1.7);gl.addColorStop(0,'rgba(255,255,220,0.5)');gl.addColorStop(1,'rgba(255,255,220,0)');g.fillStyle=gl;g.beginPath();g.arc(0,0,r*1.7,0,7);g.fill();
    var gr=g.createRadialGradient(-r*0.3,-r*0.35,r*0.05,0,0,r);gr.addColorStop(0,'rgba(255,255,255,0.95)');gr.addColorStop(0.25,'rgba(255,255,255,0.25)');gr.addColorStop(0.75,'rgba(150,225,255,0.35)');gr.addColorStop(1,'rgba(120,190,255,0.75)');
    g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,7);g.fill();
    g.rotate(Math.sin(t*2)*0.3);
    if(kind===0){g.fillStyle='#ffcf3a';g.beginPath();for(var i=0;i<10;i++){var a=i*Math.PI/5-Math.PI/2,rr2=i%2?r*0.22:r*0.5;g.lineTo(Math.cos(a)*rr2,Math.sin(a)*rr2)}g.closePath();g.fill();g.strokeStyle='#d08a10';g.lineWidth=0.025;g.stroke()}
    else if(kind===1){sewButton(g,0,0,r*0.45,'#ff8fbc',4)}
    else{g.fillStyle='#ff7fae';g.beginPath();g.moveTo(0,r*0.35);g.bezierCurveTo(-r*0.6,-r*0.05,-r*0.3,-r*0.55,0,-r*0.2);g.bezierCurveTo(r*0.3,-r*0.55,r*0.6,-r*0.05,0,r*0.35);g.fill()}
    g.rotate(-Math.sin(t*2)*0.3);
    g.strokeStyle='rgba(255,255,255,0.85)';g.lineWidth=0.03;g.beginPath();g.arc(0,0,r*0.98,-2.6,-1.2);g.stroke();
    g.strokeStyle='rgba(120,190,255,0.6)';g.lineWidth=0.02;g.beginPath();g.arc(0,0,r,0,7);g.stroke();g.restore()}
  return {wtext:wtext,init:init,pat:pat,rr:rr,stitch:stitch,shade:shade,rng:rng,drawSolid:drawSolid,solidShadow:solidShadow,drawBobbin:drawBobbin,drawBox:drawBox,drawBall:drawBall,
    drawRopeSegs:drawRopeSegs,drawString:drawString,spool:spool,sewButton:sewButton,bubble:bubble,INK:INK,FELT:FELT,texCanvases:texCanvases};
})();
