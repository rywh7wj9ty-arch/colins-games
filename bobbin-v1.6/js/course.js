/* Course builder: levels 3-20 are made of tested, parametric puzzle segments laid end to end.
   Every segment starts and ends on the floor (y=0), gets its own checkpoint, and records a
   route entry (used by the automated playtest bot). */
var COURSE=(function(){
var TOPS={sewing:['pink','purple','yellow','sky','mint'],kitchen:['sky','yellow','pink','mint','orange'],attic:['purple','orange','sky','pink','yellow'],shed:['green','yellow','orange','mint','sky'],finale:['pink','yellow','mint','sky','purple','orange']};
var SEEN={};
function mk(b,def){var ro=b.route;b.route=function(r){c.last=r;return ro(r)};var c={b:b,x:0,def:def,k:0,first:{},pz:0,cols:TOPS[def.theme]||TOPS.sewing,n:0};
  c.col=function(){return c.cols[(c.k++)%c.cols.length]};
  c.G=function(x1,x2,col){b.ground(x1,x2,col||c.col())};
  c.P=function(x,y){b.prize(x,y);c.pz++};
  c.hint=function(type,text){if(c.first[type])return null;c.first[type]=1;return text};
  c.lead=function(len,signText){var x=c.x;c.G(x,x+len);b.cp(x+1.2,0);if(signText)b.sign(x+Math.min(len-0.8,2.9),0,signText);c.x+=len;return x};
  return c}
var S={};
/* ---------- basic movement ---------- */
S.hops=function(c,P){var b=c.b,n=P.n||3,gap=P.gap||1.8,w=P.w||1.6,rise=P.rise||0.9;var x0=c.lead(3.5,c.hint('hops','Hop across the\ncotton-reel posts'));
  var spots=[],cur=0,x=x0+3.5+gap;var pitX=x0+3.5;
  for(var i=0;i<n;i++){cur=(i%3===2)?Math.min(-0.6,cur+rise*0.9):Math.max(-2.4,cur-rise*0.8);if(cur>-0.6)cur=-0.6;b.block(x,cur,w,4-cur,{topCol:c.col(),tape:0.3});spots.push([x+w/2,cur]);
    if(i%2===0)c.P(x+w/2,cur-1.1);x+=w+gap}
  b.pit(pitX,0.7,x-pitX,6);c.x=x;spots.push([x+1.2,0]);b.route({t:'hops',x0:pitX,spots:spots});c.G(x,x+2.5);c.x=x+2.5};
S.pit=function(c,P){var b=c.b,w=P.w||3;var x0=c.lead(4);var e=c.x;b.pit(e,0.7,w,6);c.P(e+w/2,-2.2);c.P(e+w/2-1,-1.6);c.P(e+w/2+1,-1.6);c.x=e+w;c.G(c.x,c.x+2.5);b.route({t:'pit',x0:e,x1:e+w});c.x+=2.5};
/* push box to a wall, climb */
S.boxwall=function(c,P){var b=c.b,h=P.h||2.6;var x0=c.lead(3,c.hint('box','Walk into boxes to push them'));
  var x=c.x;c.G(x,x+12);b.box('box'+c.n,x+3,-0.6,1.2,1.2,{kind:'card',density:0.5,zone:[x0,-10,x+9-x0,10]});b.block(x+9,-h,2.2,h,{topCol:c.col(),tape:0.5});c.P(x+10.1,-h-1);
  b.route({t:'boxwall',box:'box'+c.n,wall:x+9,h:h});c.G(x+11.2,x+14);c.x=x+14};
S.levergate=function(c,P){var b=c.b;var x0=c.lead(3,c.hint('lever','Grab the lever ({GRAB})\nand pull it back'));var x=c.x,sg='lg'+c.n;c.G(x,x+8);
  b.lever(sg,x+2,0,{start:0.55});b.gate(sg,x+4.2,-3.1,0.6,3.1,{dy:-3.2,mode:'latch'});b.block(x+4.1,-14,0.8,10.9,{mat:'wood'});c.P(x+6,-1);
  b.route({t:'lever',lx:x+2,sig:sg,gate:x+4.2});c.x=x+8};
S.boingwall=function(c,P){var b=c.b,h=P.h||4.2;var x0=c.lead(3.5,c.hint('boing',P.look==='pin'?'Bounce on the pincushion!':'Sponges are bouncy. Boing!'));var x=c.x;c.G(x,x+6);
  b.boing(x+1.3,0,1.7,{look:P.look});c.P(x+2.15,-3);c.P(x+2.15,-4.8);b.block(x+3,-h,3.2,h,{topCol:c.col(),tape:0.5});c.P(x+4.6,-h-1);
  b.route({t:'boingwall',pad:x+1.3,wall:x+3,h:h});c.G(x+6.2,x+8.5);c.x=x+8.5};
S.bagdoor=function(c,P){var b=c.b;var x0=c.lead(3,c.hint('bag','Keep something on\nthe big button'));var x=c.x,sg='bd'+c.n;c.G(x,x+12);
  b.box('bag'+c.n,x+1.8,-0.56,1.1,1.1,{kind:'bag',density:1.0,grab:true,zone:[x0,-10,x+9-x0,10]});b.button(sg,x+3.6,0,2.4,{minMass:0.6,mode:'hold'});
  b.gate(sg,x+9,-3.2,0.7,3.2,{dy:-3.1,mode:'hold'});b.block(x+8.9,-14,0.9,10.8,{mat:'wood'});c.P(x+7,-1.2);
  b.route({t:'bagdoor',bag:'bag'+c.n,btn:x+3.6,sig:sg,door:x+9});c.x=x+12};
/* ---------- sewing basket ---------- */
// rope / ribbon chain over a wide gap between two ledges
S.ropes=function(c,P){var b=c.b,n=P.n||1,sp=P.sp||4.6;var x0=c.lead(3,c.hint('ropes',n>1?'Swing from ribbon to ribbon.\nTap {JUMP} to let go':'Jump at the ribbon to swing.\nTap {JUMP} to let go!'));var x=c.x;
  c.G(x,x+3);b.block(x+3,-1.3,2,5.3,{topCol:c.col()});var top=c.col();b.block(x+5,-2.6,5,6.6,{topCol:top,tape:0.3});var e=x+10,anc=[];
  for(var i=0;i<n;i++){var ax=e+3+i*sp;b.rope(ax,-10.6,10,0.56);anc.push(ax);c.P(ax,-3.4);if(i>0)c.P(ax-sp/2,-6)}
  var land=anc[n-1]+3;b.pit(e,0.7,land-e,6);b.block(land,-2.6,5,6.6,{topCol:top,tape:0.6});b.cp(land+1.6,-2.6);b.block(land+5,-1.3,2,5.3,{topCol:c.col()});c.G(land+7,land+9.5);
  b.route({t:'ropes',edge:e,anchors:anc,land:land});c.x=land+9.5};
// horizontal spool platforms across a gap (meeting at the ends)
S.movers=function(c,P){var b=c.b,n=P.n||1,span=P.span||5,sp=P.speed||1.6,wait=P.wait===undefined?0.9:P.wait,mw=P.mw||2.0;
  var x0=c.lead(3.5,c.hint('movers','Ride the moving spools.\nThey carry you along'));var e=c.x,names=[],L0=e+mw/2+0.12,stops=[];
  for(var i=0;i<n;i++){var top=(P.up&&i%2===1)?-0.7:0;var nm='mv'+c.n+'_'+i;b.mover(nm,{path:[[L0,top],[L0+span,top]],w:mw,speed:sp,wait:wait,phase:i%2?1:0,look:'spool',col:c.col()});
    names.push(nm);stops.push([L0,L0+span,top]);c.P(L0+span/2,top-1.4);L0+=span+mw+0.35}
  var gEnd=L0-mw/2-0.35+0.12;b.pit(e,0.7,gEnd-e,6);c.G(gEnd,gEnd+3);b.route({t:'movers',edge:e,names:names,stops:stops,land:gEnd});c.x=gEnd+3};
// vertical spool lift up a tall wall
S.lift=function(c,P){var b=c.b,h=P.h||4,sp=P.speed||1.5;var x0=c.lead(4,c.hint('lift','Stand on the spool lift\nto ride up'));var x=c.x,nm='lift'+c.n;
  b.block(x,0.4,2.1,3.6,{});b.mover(nm,{path:[[x+1.05,0],[x+1.05,-h]],w:2.0,speed:sp,wait:1.1,look:'spool',col:c.col(),base:0.4});
  b.block(x+2.15,-h,5,4+h,{topCol:c.col(),tape:0.4});c.P(x+1.05,-h*0.5);c.P(x+4.5,-h-1);b.cp(x+3.4,-h);c.G(x+7.15,x+9.5);
  b.route({t:'lift',name:nm,cx:x+1.05,top:-h,wall:x+2.15,end:x+7.15});c.x=x+9.5};
// zip line from a tower across a gap
S.zip=function(c,P){var b=c.b,len=P.len||12,drop=Math.min(2.4,P.drop||1.6),sp=P.speed||5.5;var x0=c.lead(3,c.hint('zip','Jump up and hold {GRAB}\nto ride the zip-line'));var x=c.x;
  c.G(x,x+3);b.block(x+3,-1.4,2,5.4,{topCol:c.col()});b.block(x+5,-2.8,3,6.8,{topCol:c.col(),tape:0.5});b.cp(x+6,-2.8);
  var yL=-5.25,x1=x+7.0,x2=x+8+len,y2=yL+drop,nm='zip'+c.n;b.zip(nm,x1,yL,x2,y2,{speed:sp,col:'#ff7fae'});
  for(var k=1;k<=3;k++){var px=x1+(x2-x1)*k/4;c.P(px,yL+(y2-yL)*k/4+1.55)}
  var yE=Math.min(0,y2+0.55+2.05);if(yE>-0.45)yE=0;var land=x2-2.4;b.pit(x+8,0.7,land-(x+8),6);
  if(yE<0){b.block(land,yE,5.5,4-yE,{topCol:c.col(),tape:0.4});var cur=yE,xx=land+5.5;while(cur<-1.3){cur=cur+1.3;b.block(xx,cur,1.6,4-cur,{topCol:c.col()});xx+=1.6}c.G(xx,xx+2.5);c.x=xx+2.5}
  else{c.G(land,land+6);c.x=land+6}
  b.route({t:'zip',name:nm,tower:x+5,x1:x1,x2:x2,land:land,yE:yE});};
// timed button: race to the door before it closes
S.timed=function(c,P){var b=c.b,n=P.n||2,slack=P.slack||2.0;var x0=c.lead(3,c.hint('timed','Timer button! Run before\nthe door closes'));var x=c.x,sg='tm'+c.n;
  c.G(x,x+3.2);var btn=b.button(sg,x+0.6,0,1.8,{minMass:0.5,mode:'timer',secs:6});var obs=[],xx=x+3.2;
  for(var i=0;i<n;i++){if(i%2===0){var w=P.pw||2.4;b.pit(xx+1.5,0.7,w,6);c.G(xx,xx+1.5);obs.push({t:'pit',x0:xx+1.5,x1:xx+1.5+w});c.P(xx+1.5+w/2,-1.8);xx+=1.5+w}
    else{c.G(xx,xx+4);var bh=P.bh||1.0;b.block(xx+1.4,-bh,1.3,bh,{topCol:c.col()});obs.push({t:'block',x0:xx+1.4,x1:xx+2.7});xx+=4}}
  c.G(xx,xx+3);var door=xx+1.6;b.gate(sg,door,-3.2,0.7,3.2,{dy:-3.1,mode:'hold'});b.block(door-0.1,-14,0.9,10.8,{mat:'wood'});c.P(door+2.4,-1.2);
  var dist=door-(x+1.5);var secs=Math.max(3,Math.round((dist/5.6+n*0.45+0.9)*slack*2)/2);btn.secs=secs;
  b.route({t:'timed',btn:x+1.5,sig:sg,obs:obs,door:door,secs:secs});c.G(xx+3,xx+6);c.x=xx+6};
/* ---------- paper kitchen ---------- */
// conveyor platforms over a pit (some carry you forward, some push back)
S.belts=function(c,P){var b=c.b,n=P.n||3,w=P.w||3.4,gap=P.gap||1.5,sp=P.speed||2.2;var x0=c.lead(3.5,c.hint('belts','Conveyor belts carry you.\nWatch the arrows!'));var e=c.x,x=e+gap,spots=[],cur=0;
  for(var i=0;i<n;i++){var top=(i%2===1)?-0.7:(i%3===2?-1.2:0);var v=(P.back&&i%2===1)?-sp*0.8:sp;b.belt(x,top,w,v);spots.push([x+w*0.55,top]);if(i%2===0)c.P(x+w/2,top-1.2);x+=w+gap}
  b.pit(e,0.7,x-e,6);spots.push([x+1.3,0]);c.G(x,x+3);b.route({t:'hops',x0:e,spots:spots});c.x=x+3};
// a strong backwards belt: flip it with the lever
S.beltlever=function(c,P){var b=c.b,len=P.len||11,sp=P.speed||8.5;var x0=c.lead(3,c.hint('beltlever','Too fast! Pull the lever\nto flip the conveyor'));var x=c.x,sg='bl'+c.n;
  c.G(x,x+4);b.lever(sg,x+2,0,{start:0.55});b.belt(x+4,0,len,-sp,{sig:sg,sigMode:'rev'});c.G(x+4,x+4+len,'sky');
  for(var k=1;k<4;k++)c.P(x+4+len*k/4,-1.3);c.G(x+4+len,x+7+len);b.route({t:'beltlever',lx:x+2,sig:sg,end:x+5+len});c.x=x+7+len};
// a chain of jelly blocks over a pit: hold jump to keep bouncing
S.jelly=function(c,P){var b=c.b,n=P.n||3,sp=P.sp||3.6,jw=P.jw||2.2;var x0=c.lead(3.5,c.hint('jelly','Jelly is wobbly! Hold {JUMP}\nto bounce higher'));var e=c.x,xs=[];
  for(var i=0;i<n;i++){var jx=e+0.9+i*sp;b.jelly(jx,-0.25,jw,4.2,{col:['#ff7f9f','#7fd4ff','#ffd75e','#9fe08f'][i%4]});xs.push(jx+jw/2);c.P(jx+jw/2,-3.2)}
  var land=xs[n-1]+jw/2+1.6;var lt=P.top||-1.4;b.pit(e,0.7,land-e,6);b.block(land,lt,4,4-lt,{topCol:c.col(),tape:0.4});b.cp(land+1.2,lt);
  var xx=land+4,cur=lt;while(cur<-0.7){cur+=1.2;if(cur>-0.4)break;b.block(xx,cur,1.6,4-cur,{topCol:c.col()});xx+=1.6}c.G(xx,xx+3);
  b.route({t:'jelly',edge:e,jx:xs,land:land+1.4,top:lt});c.x=xx+3};
// jump down from a tall stack onto jelly to bounce up a big wall
S.jellydrop=function(c,P){var b=c.b,h=P.h||4.4;var x0=c.lead(3,c.hint('jellydrop','Fall from high up\nto bounce extra high!'));var x=c.x;
  c.G(x,x+2.5);var st=[-1.25,-2.5,-3.75],xx=x+2.5;st.forEach(function(t){b.block(xx,t,1.7,4-t,{topCol:c.col()});xx+=1.7});var tw=xx;b.block(xx,-3.75,1.6,7.75,{topCol:c.col(),tape:0.4});xx+=1.6;
  var e=xx;b.jelly(e+1.4,-0.25,2.2,4.2,{col:'#ff7f9f'});var wall=e+1.4+2.2+1.3;b.pit(e,0.7,wall-e,6);c.P(e+2.5,-3.5);c.P(e+3.5,-5.6);
  b.block(wall,-h,3.4,4+h,{topCol:c.col(),tape:0.5});b.cp(wall+1.6,-h);c.P(wall+2.4,-h-1);xx=wall+3.4;var cur=-h;while(cur<-1.3){cur+=1.3;b.block(xx,cur,1.6,4-cur,{topCol:c.col()});xx+=1.6}c.G(xx,xx+3);
  b.route({t:'jellydrop',steps:[x+2.5+0.85,x+4.2+0.85,x+5.9+0.85,tw+0.8],tops:st.concat([-3.75]),jx:e+2.5,wall:wall,h:h});c.x=xx+3};
// cupcake pistons pumping up and down in a pit
S.pistons=function(c,P){var b=c.b,n=P.n||3,sp=P.sp||3.3,lo=0.6,hi=P.hi||-1.2,speed=P.speed||1.5,wait=P.wait===undefined?1.1:P.wait;
  var x0=c.lead(3.5,c.hint('pistons','Cupcake pistons pump up and down.\nHop on when they rise')),e=c.x,names=[],xs=[];
  for(var i=0;i<n;i++){var px=e+1.8+i*sp,nm='ps'+c.n+'_'+i,so=(P.stair&&i%2===1)?0.5:0,top=hi-so;b.mover(nm,{path:[[px,lo-so],[px,top]],w:1.8,speed:speed,wait:wait,phase:((1.0-i*0.16)%2+2)%2,look:'cupcake',col:c.col(),base:4});
    names.push(nm);xs.push(px);c.P(px,top-1.3)}
  var land=xs[n-1]+0.9+1.1;b.pit(e,0.7,land-e,6);c.G(land,land+3);b.route({t:'pistons',edge:e,names:names,px:xs,land:land});c.x=land+3};
// push the dough ball off the shelf into the bowl to lower the bridge (optionally via a belt)
S.rollpin=function(c,P){var b=c.b,bw=P.belt||0;var x0=c.lead(3,c.hint('rollpin','Roll the dough ball\ninto the mixing bowl'));var x=c.x,sg='rp'+c.n,nm='dough'+c.n;
  c.G(x,x+3);b.block(x+3,-1.3,1.8,5.3,{topCol:c.col()});b.block(x+4.8,-2.6,5.4,6.6,{topCol:c.col(),tape:0.4});var edge=x+10.2;
  var bx=edge+1.75;if(bw){b.belt(edge,-1.2,bw,2.4);b.block(edge,-0.8,bw,0.8,{mat:'wood'});bx=edge+bw+1.75}
  c.G(edge,bx+5);b.basket(sg,bx,0,3.3,0.8);b.ball(nm,x+7.4,-3.4,0.72,{density:0.7,grab:true,zone:[x0,-12,bx+2.5-x0,12]});
  var pitX=bx+5,len=4.2;b.pit(pitX,0.7,len,6);b.bridge(sg,pitX,0,len);c.P(pitX+len/2,-1.2);c.G(pitX+len,pitX+len+3.5);
  b.route({t:'rollpin',bw:bw,ball:nm,sig:sg,edge:edge,bx:bx,pit:pitX,end:pitX+len+1.4,step:x+3,shelf:x+4.8});c.x=pitX+len+3.5};
/* ---------- toy attic ---------- */
// wind up the toy with the lever; it trundles through a low tunnel onto the button that opens the door
S.toybtn=function(c,P){var b=c.b;var x0=c.lead(3,c.hint('toy','Pull the lever to wind up\nthe toy. It fits the tunnel!'));var x=c.x,sg='ty'+c.n,bs='tb'+c.n,nm='toy'+c.n,tl=P.tl||6;
  c.G(x,x+tl+9);b.lever(sg,x+1.5,0,{start:0.55});b.toy(nm,x+3.4,-0.36,{w:1.1,h:0.7,sig:sg,speed:P.speed||1.7,look:P.look||'mouse',zone:[x0,-10,tl+12,10]});
  b.block(x+5,-1.3,tl,0.5,{topCol:c.col(),tape:0.3});c.P(x+5+tl/2,-2.3);var g=x+5+tl+0.6;b.button(bs,g-1.75,0,1.6,{minMass:0.4});
  b.gate(bs,g,-3.2,0.7,3.2,{dy:-3.1,mode:'latch'});b.block(g-0.1,-14,0.9,10.8,{mat:'wood'});c.P(g+2,-1.2);
  b.route({t:'toybtn',lx:x+1.5,sig:sg,bsig:bs,gate:g,roof:x+5});c.x=x+tl+9};
// a toy train that sets off when you stand on it
S.train=function(c,P){var b=c.b,len=P.len||14,sp=P.speed||3.2;var x0=c.lead(3.5,c.hint('train','All aboard! Stand on the\ntrain to make it go'));var e=c.x,nm='tr'+c.n,mw=3.0;
  var L0=e+mw/2+0.12,top=P.top||0;b.mover(nm,{path:[[L0,top],[L0+len,top]],w:mw,mode:'ride',speed:sp,ret:1.6,look:'train',col:c.col()});
  for(var k2=1;k2<4;k2++)c.P(L0+len*k2/4,top-1.6);
  var gEnd=L0+len+mw/2+0.12;b.pit(e,0.7,gEnd-e,6);c.G(gEnd,gEnd+3);b.route({t:'movers',edge:e,names:[nm],stops:[[L0,L0+len,top]],land:gEnd,ride:1});c.x=gEnd+3};
// grab a balloon and float up a tall wall
S.balloon=function(c,P){var b=c.b,h=P.h||5.5;var x0=c.lead(3,c.hint('balloon','Hold {GRAB} on a balloon\nto float up. Let go to drop'));var x=c.x,nm='bl'+c.n;
  c.G(x,x+4);var px=x+2.4;b.balloon(nm,px,0,{tether:0.45,rise:P.rise||2.6,col:['#ff7fae','#7fd4ff','#ffd75e','#9fe08f'][c.n%4]});b.block(x+4,-h,4,4+h,{topCol:c.col(),tape:0.5});
  b.cp(x+5.6,-h);c.P(px,-h*0.5);c.P(px,-h+0.4);var xx=x+8,cur=-h;while(cur<-1.3){cur+=1.3;b.block(xx,cur,1.6,4-cur,{topCol:c.col()});xx+=1.6}c.G(xx,xx+3);
  b.route({t:'balloon',name:nm,px:px,wall:x+4,h:h});c.x=xx+3};
// pulley: stand on the right pan, pull the lever and the falling ball lifts you up
S.pulley=function(c,P){var b=c.b,dm=P.d||3.2;var x0=c.lead(4.5,c.hint('pulley','Stand on the right pan,\nthen pull the lever'));var x=c.x,sg='pu'+c.n,nm='pl'+c.n,bn='pb'+c.n;
  b.poly([[x-3.4,-5.5],[x+3.0,-4.7],[x+3.0,-4.3],[x-3.4,-4.3]],{topCol:c.col()});b.ball(bn,x-2.6,-6.2,0.55,{density:2.6});
  b.gate(sg,x+3.0,-6.3,0.35,1.6,{dy:-1.8,mode:'latch'});b.block(x+2.95,-14,0.45,7.7,{mat:'wood'});
  b.block(x+3.2,dm+0.45,2,1);c.G(x,x+3.2);c.G(x+5.2,x+7);b.lever(sg,x+6.75,0,{start:0.55});
  b.pulley(nm,x+3.2,x+7,0,2,{dmax:dm,rimsA:true});b.block(x+7,0.4,2,3.6,{});b.block(x+9,-dm,5,4+dm,{topCol:c.col(),tape:0.4});b.cp(x+10.4,-dm);c.P(x+8,-dm-1.2);c.P(x+8,-1.4);
  var xx=x+14,cur=-dm;while(cur<-1.3){cur+=1.3;b.block(xx,cur,1.6,4-cur,{topCol:c.col()});xx+=1.6}c.G(xx,xx+3);
  var stuck=0,shaft=0;b.watch(function(dt,A){var p=A.pos(),pu=A.pulley(nm);
    if(p.x>x+3.2&&p.x<x+5.2&&p.y>0.2){shaft+=dt;if(shaft>1.0){shaft=0;A.respawnPlayer()}}else shaft=0;
    if(pu.d>dm-0.3&&p.g&&p.y>-1&&p.x<x+7&&p.x>x0-1){stuck+=dt;if(stuck>2.5){stuck=0;A.resetLever(sg);A.respawnObj(A.obj(bn))}}else stuck=0});
  b.route({t:'pulley',xa:x+3.2,lx:x+6.75,sig:sg,name:nm,xb:x+7,top:-dm,d:dm});c.x=xx+3};
/* ---------- garden shed ---------- */
function canPlanter(c,x,sg){var b=c.b;b.planter(sg,x+0.2,0,1.8,{h:0.55});b.can('cn'+c.n,x+3.2,0,{rate:P_RATE})}
var P_RATE=0.5;
// water the planter with the can to open the shed door
S.can=function(c,P){var b=c.b;var x0=c.lead(3,c.hint('can','Pull the watering can back\nand hold it to pour'));var x=c.x,sg='wc'+c.n;c.G(x,x+9);canPlanter(c,x,sg);
  b.gate(sg,x+5.6,-3.2,0.7,3.2,{dy:-3.1,mode:'latch'});b.block(x+5.5,-14,0.9,10.8,{mat:'wood'});c.P(x+7.4,-1.2);
  b.route({t:'can',pe:x+2.0,lx:x+3.2,sig:sg,gate:x+5.6});c.x=x+9};
// water the planter to wake the flowerpot lift, then ride it up
S.potlift=function(c,P){var b=c.b,h=P.h||4.4;var x0=c.lead(3,c.hint('potlift','Water the planter to\nwake up the flowerpot lift'));var x=c.x,sg='pl'+c.n,nm='pot'+c.n;c.G(x,x+4.4);canPlanter(c,x,sg);
  var lx=x+4.4;b.block(lx,0.4,2.1,3.6,{});b.mover(nm,{path:[[lx+1.05,0],[lx+1.05,-h]],w:2.0,speed:P.speed||1.6,mode:'ride',sig:sg,ret:2,look:'pot',col:c.col(),base:0.4});
  b.block(lx+2.15,-h,5,4+h,{topCol:c.col(),tape:0.4});c.P(lx+1.05,-h*0.5);c.P(lx+4.5,-h-1);b.cp(lx+3.4,-h);var xx=lx+7.15,cur=-h;while(cur<-1.3){cur+=1.3;b.block(xx,cur,1.6,4-cur,{topCol:c.col()});xx+=1.6}c.G(xx,xx+3);
  b.route({t:'potlift',pe:x+2.0,lx:x+3.2,sig:sg,name:nm,cx:lx+1.05,top:-h,wall:lx+2.15,end:lx+7.15});c.x=xx+3};
// flip the toggle to start the fan, then float up the draught
S.fan=function(c,P){var b=c.b,h=P.h||5;var x0=c.lead(3,c.hint('fan','Flip the switch ({GRAB})\nand ride the breeze up'));var x=c.x,sg='fn'+c.n;c.G(x,x+4.8);
  b.toggle(sg,x+1.0,0);var fh=(h+1.6)/0.89;b.fan(x+2.3,0,2.4,fh,{dir:'up',power:P.power||7,sig:sg});if(b.cloth)b.cloth(x+5.6,-2.4,1.1,0.7,'#ffd23f');c.P(x+3.5,-h*0.5);c.P(x+3.5,-h-0.6);
  b.block(x+4.8,-h,4,4+h,{topCol:c.col(),tape:0.5});b.cp(x+6.2,-h);var xx=x+8.8,cur=-h;while(cur<-1.3){cur+=1.3;b.block(xx,cur,1.6,4-cur,{topCol:c.col()});xx+=1.6}c.G(xx,xx+3);
  b.route({t:'fan',tx:x+1.0,sig:sg,fx:x+3.5,wall:x+4.8,h:h});c.x=xx+3};
// fan blows a light seed packet onto the button
S.fanpush=function(c,P){var b=c.b;var x0=c.lead(3,c.hint('fanpush','Fans blow light things.\nSwitch it on!'));var x=c.x,sg='fp'+c.n,bs='fb'+c.n,nm='seed'+c.n;c.G(x,x+13);
  b.toggle(sg,x+0.9,0);b.fan(x+2,-0.05,7.9,0.85,{dir:'right',power:P.power||5,sig:sg});if(b.cloth)b.cloth(x+6.6,-2.6,1.0,0.6,'#8fd3ff');var o=b.box(nm,x+3.4,-0.36,0.9,0.7,{kind:'paper',density:0.3,grab:true,zone:[x0,-10,16,10]});o.light=true;o.body.getFixtureList().setFriction(0.15);o.ext=0.35;
  b.block(x+2,-1.35,8,0.5,{topCol:c.col(),tape:0.3});b.button(bs,x+8.1,0,1.8,{minMass:0.15});var g=x+10;b.gate(bs,g,-3.2,0.7,3.2,{dy:-3.1,mode:'latch'});b.block(g-0.1,-14,0.9,10.8,{mat:'wood'});c.P(x+5,-2.9);c.P(g+2,-1.2);
  b.route({t:'fanpush',tx:x+0.9,sig:sg,bsig:bs,gate:g,roof:x+2});c.x=x+13};
// magnet crane: switch it on to lift the tin over the fence, switch off over the button
S.magnet=function(c,P){var b=c.b;var x0=c.lead(3,c.hint('magnet','Switch the magnet on to grab\nthe tin, off to drop it'));var x=c.x,sg='mg'+c.n,bs='mb'+c.n,nm='tin'+c.n;c.G(x,x+17);
  b.toggle(sg,x+0.8,0);b.tin(nm,x+3,-0.45,{zone:[x0,-12,20,12]});b.magnet('mag'+c.n,x+3,x+11.2,-4.3,{speed:P.speed||1.5,wait:0.9,sig:sg,radius:4.4});
  b.block(x+5.6,-1.1,1.4,1.1,{topCol:c.col()});b.block(x+7,-2.2,0.9,2.2,{topCol:c.col(),tape:0.3});b.button(bs,x+10.2,0,2.0,{minMass:0.5});b.toggle(sg,x+13.2,0);
  var g=x+14.6;b.gate(bs,g,-3.2,0.7,3.2,{dy:-3.1,mode:'latch'});b.block(g-0.1,-14,0.9,10.8,{mat:'wood'});c.P(x+7.45,-3.2);c.P(g+1.8,-1.2);
  b.route({t:'magnet',t1:x+0.8,t2:x+13.2,sig:sg,bsig:bs,tin:nm,mag:'mag'+c.n,step:x+5.6,fence:x+7,btn:x+11.2,gate:g});c.x=x+17};
/* ---------- grand finale: Rube Goldberg chains ---------- */
// water -> planter starts the belt -> belt carries the dough ball into the bowl -> bridge drops
S.chain1=function(c,P){var b=c.b;var x0=c.lead(3,c.hint('chain1','Water the planter... then\nwatch the chain reaction!'));var x=c.x,sa='ca'+c.n,sb='cb'+c.n,nm='cd'+c.n;
  c.G(x,x+4.4);canPlanter(c,x,sa);var bx=x+4.4;c.G(bx,bx+16);b.block(bx,-1.0,7,1.0,{mat:'wood'});b.belt(bx,-1.4,7,2.2,{sig:sa,sigMode:'on'});
  b.box(nm,bx+1.2,-2.0,1.1,1.1,{kind:'bag',density:1.0,zone:[x0,-12,22,12]});b.button(sb,bx+7.3,0,2.6,{minMass:0.6});
  var pitX=bx+16,len=4.2;b.pit(pitX,0.7,len,6);b.bridge(sb,pitX,0,len);c.P(pitX+len/2,-1.2);c.P(bx+3.5,-2.6);c.G(pitX+len,pitX+len+3.5);
  b.route({t:'chain1',pe:x+2.0,lx:x+3.2,sig:sa,bsig:sb,belt:bx,btn:bx+7.3,pit:pitX,end:pitX+len+1.4});c.x=pitX+len+3.5};
// switch the fan -> seed packet presses the button -> the button wakes the toy -> the toy opens the door
S.chain2=function(c,P){var b=c.b;var x0=c.lead(3,c.hint('chain2','One switch starts it all.\nFollow the threads!'));var x=c.x,sg='cf'+c.n,bs='cs'+c.n,bt='ct'+c.n,nm='cp'+c.n,tn='cy'+c.n;c.G(x,x+24);
  b.toggle(sg,x+0.9,0);b.fan(x+2,-0.05,7.9,0.85,{dir:'right',power:5,sig:sg});var o=b.box(nm,x+3.4,-0.36,0.9,0.7,{kind:'paper',density:0.3,grab:true,zone:[x0,-10,13,10]});o.light=true;o.body.getFixtureList().setFriction(0.15);o.ext=0.35;
  b.block(x+2,-1.35,17.4,0.5,{topCol:c.col(),tape:0.3});b.button(bs,x+8.1,0,1.8,{minMass:0.15});b.block(x+10,-0.85,0.6,0.85,{mat:'wood'});
  b.toy(tn,x+11.6,-0.36,{w:1.1,h:0.7,sig:bs,speed:1.8,look:'car',zone:[x+10,-10,14,10]});
  var g=x+20;b.button(bt,g-1.75,0,1.6,{minMass:0.4});b.gate(bt,g,-3.2,0.7,3.2,{dy:-3.1,mode:'latch'});b.block(g-0.1,-14,0.9,10.8,{mat:'wood'});c.P(x+6,-2.3);c.P(x+16,-2.3);c.P(g+2,-1.2);
  b.route({t:'chain2',tx:x+0.9,sig:sg,bsig:bs,tsig:bt,roof:x+2,gate:g});c.x=x+24};
/* ---------- v1.6 physics segments ---------- */
// soft body: a felt tunnel lower than Bobbin – he squishes through
S.squeeze=function(c,P){var b=c.b,len=P.len||3.5,gh=P.gh||0.76;var x0=c.lead(3.5,c.hint('squeeze','Bobbin is squishy!\nPush into the felt gap'));var x=c.x;c.G(x,x+len+5);
  b.block(x+2,-14,len,14-3.4,{mat:'wood'});b.squeeze(x+2,-3.4,len,3.4-gh);c.P(x+2+len/2,-0.5);if(P.slot){}
  b.route({t:'squeeze',x1:x+2,x2:x+2+len});c.x=x+len+5};
// real weight: plank-and-string bridge over a wide pit
S.planks=function(c,P){var b=c.b,w=P.w||7;var x0=c.lead(3.5,c.hint('planks','Wobbly plank bridge.\nIt dips under your weight!'));var x=c.x;b.pit(x,0.7,w,6);b.plankBridge(x,x+w,0,P.n||Math.round(w/0.85));c.P(x+w/2,-1.4);c.P(x+w*0.25,-1.2);c.P(x+w*0.75,-1.2);
  c.G(x+w,x+w+3);b.route({t:'planks',x1:x,x2:x+w});c.x=x+w+3};
// sprung platforms over a pit
S.sprung=function(c,P){var b=c.b,n=P.n||3,gap=P.gap||1.6,pw=P.pw||1.8;var x0=c.lead(3.5,c.hint('sprung','Spring platforms sink\nunder you. Keep hopping!'));var x=c.x,px=x+gap,spots=[];
  for(var i=0;i<n;i++){var ty=-0.9-(i%2)*0.7;b.sprung(px,ty,pw,{k:P.k||70});spots.push([px+pw/2,ty]);if(i%2===0)c.P(px+pw/2,ty-1.2);px+=pw+gap}
  b.pit(x,0.7,px-x,6);spots.push([px+1.2,0]);c.G(px,px+3);b.route({t:'sprung',x0:x,spots:spots});c.x=px+3};
// elastic band trampoline up to a high ledge
S.elastic=function(c,P){var b=c.b,h=P.h||4.6;var x0=c.lead(3,c.hint('elastic','Elastic bands fling you.\nFall from higher, hold jump!'));var x=c.x;c.G(x,x+9);
  b.block(x+0.6,-1.6,1.8,1.6,{topCol:c.col(),tape:0.4});b.mat(x+2.6,-0.3,2.4,0.3,'elastic');b.block(x+5.4,-h,3.6,h,{topCol:c.col(),tape:0.5});c.P(x+3.8,-3.2);c.P(x+3.8,-5);c.P(x+7,-h-1);
  b.route({t:'elastic',step:x+0.6,band:x+2.6,wall:x+5.4,h:h});c.G(x+9,x+12);c.x=x+12};
// wax paper: a slippery downhill slide, then a gap
S.wax=function(c,P){var b=c.b,h=P.h||2.2,len=P.len||6;var x0=c.lead(3,c.hint('wax','Wax paper is slippery!\nSlide down and jump'));var x=c.x;c.G(x,x+3.2);
  b.block(x+0.6,-1.1,1.4,1.1,{topCol:c.col()});b.block(x+2,-h,1.8,h,{topCol:c.col(),tape:0.4});b.wedge([[x+3.8,-h],[x+3.8+len,0],[x+3.8,0]],'wax');var e=x+3.8+len;
  c.P(x+3.8+len*0.5,-h*0.5-1);var pw=P.gap||3.2;b.pit(e,0.7,pw,6);c.P(e+pw/2,-2);c.G(e+pw,e+pw+3);b.route({t:'wax',top:x+2,h:h,edge:e,x1:e+pw});c.x=e+pw+3};
// soggy Bobbin: a heavy button only a tea-soaked Bobbin can press
S.tea=function(c,P){var b=c.b,sg='tb'+c.n;var x0=c.lead(3,c.hint('tea','Too light for the heavy button?\nSoak up some tea first!'));var x=c.x;c.G(x,x+1.5);
  var pw=P.pw||4.6;b.block(x+1.5,1.3,pw,2.7,{mat:'wood'});b.tea(x+1.5,-0.25,pw,1.55);b.cork('cork'+c.n,x+1.5+pw*0.7,-0.6,0.28);var e=x+1.5+pw;c.G(e,e+9);
  b.button(sg,e+2.2,0,2,{minMass:1.25,heavy:true});var g=e+6;b.gate(sg,g,-3.2,0.7,3.2,{dy:-3.1,mode:'latch'});b.block(g-0.1,-14,0.9,10.8,{mat:'wood'});c.P(e+3.2,-1.4);c.P(g+1.6,-1.2);
  b.route({t:'tea',p1:x+1.5,p2:e,btn:e+3.2,sig:sg,gate:g});c.x=e+9};
// duck raft drifting across a wide tea pool (you can also swim, slowly and soggily)
S.duck=function(c,P){var b=c.b,pw=P.pw||8;var x0=c.lead(3,c.hint('duck','Ride the rubber duck raft\nacross the tea'));var x=c.x;c.G(x,x+1.5);
  b.block(x+1.5,1.3,pw,2.7,{mat:'wood'});var T=b.tea(x+1.5,-0.25,pw,1.55);T.flow=P.flow||1.3;var o=b.duck('duck'+c.n,x+2.9,-0.55,2.2);T.raft=o;var e=x+1.5+pw;c.G(e,e+3);c.P(x+1.5+pw/2,-1.6);c.P(x+1.5+pw*0.75,-1.6);
  b.route({t:'duck',p1:x+1.5,p2:e,raft:'duck'+c.n});c.x=e+3};
// velcro wall: cling and wall-hop to the top
S.velcro=function(c,P){var b=c.b,h=P.h||4.6;var x0=c.lead(3.5,c.hint('velcro','Velcro is grippy! Jump at it,\nhold towards it and hop up'));var x=c.x;c.G(x,x+10);
  b.velcro(x+3,-h,0.5,h);b.block(x+3.5,-h,3.4,h,{topCol:c.col(),tape:0.5});c.P(x+2.4,-2.6);c.P(x+5,-h-1);c.G(x+10,x+12);b.route({t:'velcro',wall:x+3,h:h,top:x+3.5});c.x=x+12};
// sticky tape on the ceiling over a pit: jump up, hang, shimmy across
S.tape=function(c,P){var b=c.b,w=P.w||5;var x0=c.lead(3.5,c.hint('tape','Jump up to the sticky tape\nand shimmy across. Jump to let go'));var x=c.x;c.G(x,x+1.2);
  b.block(x-0.6,-14,w+2.4,14-3.05-0.22,{mat:'wood'});b.tape(x-0.6,-3.05,w+2.4);b.pit(x+1.2,0.7,w,6);c.P(x+1.2+w/2,-1.8);c.G(x+1.2+w,x+w+4.5);
  b.route({t:'tape',x1:x+1.2,x2:x+1.2+w});c.x=x+w+4.5};
// cardboard wall: roll the heavy ball down the wax slide to tear through
S.tearwall=function(c,P){var b=c.b,nm='ball'+c.n;var x0=c.lead(3,c.hint('tear','Cardboard tears!\nRoll the heavy ball into it'));var x=c.x;c.G(x,x+16);
  b.block(x+1.4,-2,3,2,{topCol:c.col(),tape:0.4});var o=b.ball(nm,x+3.6,-2.5,0.45,{density:3,grab:true,zone:[x0,-12,20,12]});b.wedge([[x+4.4,-2],[x+8.6,0],[x+4.4,0]],'wax');
  var T=b.tear(x+11,-3.4,0.5,3.4,{thr:6});b.block(x+10.9,-14,0.7,10.6,{mat:'wood'});c.P(x+3,-3.4);c.P(x+13,-1.2);
  b.segWatch(function(dt){var q=o.body.getPosition(),v=o.body.getLinearVelocity();if(T.whole&&q.x>x+8.8&&Math.abs(v.x)+Math.abs(v.y)<0.1){o.rs=(o.rs||0)+dt;if(o.rs>2.2){o.rs=0;b.api.home(o)}}else o.rs=0});
  b.route({t:'tearwall',ledge:x+1.4,ball:nm,wall:x+11});c.x=x+16};
// topple a taped card tower onto the big button
S.tower=function(c,P){var b=c.b,sg='tw'+c.n,n=P.n||5;var x0=c.lead(3,c.hint('tower','Push the tall tower over.\nWatch where it lands!'));var x=c.x;c.G(x,x+16);
  b.block(x+3.5,-0.15,0.3,0.15,{mat:'wood'});var list=b.tower('tower'+c.n,x+3,0,n,{w:0.9,h:0.95,thr:60,density:0.15});b.button(sg,x+5,0,4,{minMass:0.3});var g=x+11;b.gate(sg,g,-3.2,0.7,3.2,{dy:-3.1,mode:'latch'});b.block(g-0.1,-14,0.9,10.8,{mat:'wood'});c.P(x+7,-1.3);c.P(g+2,-1.2);
  var still=0,stray=0;b.segWatch(function(dt){if(b.api.sig(sg)){if(list.some(function(o){var q=o.body.getPosition();return q.x>g-0.3||q.y>1})){stray+=dt;if(stray>1){stray=0;b.api.towerReset(list,x+3,0.95)}}else stray=0;return}var moving=list.some(function(o){var v=o.body.getLinearVelocity();return Math.abs(v.x)+Math.abs(v.y)>0.08}),fallen=list.some(function(o){return Math.abs(o.body.getAngle())>0.5});
    if(fallen&&!moving){still+=dt;if(still>2.5){still=0;b.api.towerReset(list,x+3,0.95)}}else still=0});
  b.route({t:'tower',base:x+3,btn:x+5,sig:sg,gate:g});c.x=x+16};
// dominoes: knock the first one, the last one flips the gate
S.domino=function(c,P){var b=c.b,sg='dm'+c.n,n=P.n||8;var x0=c.lead(3,c.hint('domino','Nudge the first domino...'));var x=c.x;c.G(x,x+n*0.85+10.5);
  b.dominoes('dom'+c.n,x+2.5,0,n,0.85,{sig:sg,h:1.3,grow:0.05});var g=x+2.5+n*0.85+3;b.gate(sg,g,-3.2,0.7,3.2,{dy:-3.1,mode:'latch'});b.block(g-0.1,-14,0.9,10.8,{mat:'wood'});c.P(x+2.5+n*0.4,-2.4);c.P(g+2,-1.2);
  b.route({t:'domino',first:x+2.5,sig:sg,gate:g});c.x=g+5};
// scissors: pull the lever, the scissors snip the rope, the weight drops on the heavy button
S.snip=function(c,P){var b=c.b,sl='sl'+c.n,sb='sb'+c.n;var x0=c.lead(3,c.hint('snip','Pull the lever to make\nthe scissors snip!'));var x=c.x;c.G(x,x+14);
  b.lever(sl,x+1.5,0,{start:0.55});b.peg(x+5.2,-6.6,0.22);var rp=b.srope(x+4.4,-7.4,7,0.5,{weight:'weight'+c.n,wd:2.6});b.scissors(rp,1,sl);b.button(sb,x+3.6,0,2.4,{minMass:0.8,heavy:true});
  var g=x+9;b.gate(sb,g,-3.2,0.7,3.2,{dy:-3.1,mode:'latch'});b.block(g-0.1,-14,0.9,10.8,{mat:'wood'});c.P(x+4.8,-2);c.P(g+2,-1.2);
  b.route({t:'snip',lx:x+1.5,sig:sl,bsig:sb,gate:g});c.x=x+14};
// marble run: pull the lever, the marble rolls down the ramps into the cup button
S.marble=function(c,P){var b=c.b,sl='ml'+c.n,sb='mb'+c.n,nm='marble'+c.n;var x0=c.lead(3,c.hint('marble','Pull the lever and watch\nthe marble run!'));var x=c.x;c.G(x,x+16);
  b.lever(sl,x+1.5,0,{start:0.55});b.wedge([[x+3,-5.2],[x+9,-4.2],[x+9,-4.0],[x+3,-5.0]],'wood');b.wedge([[x+10.4,-3.0],[x+4.6,-1.9],[x+4.6,-1.7],[x+10.4,-2.8]],'wood');
  b.block(x+10.6,-5.4,0.3,2.6,{mat:'wood'});b.block(x+3,-6.2,0.3,1.2,{mat:'wood'});b.gate(sl,x+4.2,-6.2,0.25,1.25,{dy:-1.3,mode:'latch'});
  var o=b.ball(nm,x+3.6,-5.4,0.24,{density:2.2,zone:[x,-12,16,12]});b.button(sb,x+3.2,0,1.8,{minMass:0.3,pocket:true});var g=x+12;b.gate(sb,g,-3.2,0.7,3.2,{dy:-3.1,mode:'latch'});b.block(g-0.1,-14,0.9,10.8,{mat:'wood'});
  b.block(x+3.55,-2.9,0.22,1.75,{mat:'wood'});c.P(x+7,-0.9);c.P(g+2,-1.2);
  var rs=0;b.segWatch(function(dt){if(b.api.sig(sb))return;var v=o.body.getLinearVelocity(),q=o.body.getPosition();if(b.api.b.api.sig(sl)&&Math.abs(v.x)+Math.abs(v.y)<0.05&&q.x>x+4.3){rs+=dt;if(rs>2.5){rs=0;b.api.home(o)}}else rs=0});
  b.route({t:'marble',lx:x+1.5,sig:sl,bsig:sb,gate:g});c.x=x+16};
/* ---------- level assembly ---------- */
function build(b,def){var c=mk(b,def);b.spawn(2.5,-0.6);
  c.G(0,6.5);c.x=6.5;
  if(def.intro)b.sign(4.4,0,def.intro);
  def.segs.forEach(function(sp,i){c.n=i;var f=S[sp.s];if(!f)throw new Error('segment '+sp.s);var xs=c.x;f(c,sp);if(c.last){c.last.xs=xs;c.last.xe=c.x}});
  var x=c.x;if(def.finale){c.G(x,x+30);b.cp(x+1.2,0);b.sign(x+3.4,0,'You did it! Bounce down the\nvictory parade to the big box!');
    for(var k=0;k<3;k++){var px=x+6+k*5.2;b.boing(px,0,1.7,{look:'pin'});c.P(px+0.85,-3);c.P(px+0.85,-4.6);c.P(px+3.4,-3.6)}
    c.P(x+23,-1.3);c.P(x+24.6,-2.3);c.P(x+26.2,-3.3);b.exit(x+27,-1.7);b.setW(x+30);
    b.route({t:'parade',pads:[x+6,x+11.2,x+16.4],exit:x+27});return c}
  c.G(x,x+16);b.cp(x+1.2,0);b.sign(x+4,0,'Hop into the\ncomfy exit!');c.P(x+7,-1.3);c.P(x+8.6,-2.3);c.P(x+10.2,-3.3);b.exit(x+12.5,-1.7);b.setW(x+16);
  return c}
return {build:build,S:S}})();
