// ---------- world / levels ----------
const T=40;
// Level builder: columns of chars, row 0 = top. h = tiles above the bottom.
function Builder(H){
  const b={H,cols:[],x:0,signs:[],last:0};
  const blank=()=>new Array(H).fill(' ');
  b.ensure=c=>{while(b.cols.length<=c)b.cols.push(blank());};
  b.set=(c,h,ch)=>{if(h<0||h>=H)return;b.ensure(c);b.cols[c][H-1-h]=ch;};
  b.get=(c,h)=>(b.cols[c]?b.cols[c][H-1-h]:' ');
  // ground run: n columns, height ht; deco placed on the surface row (h=ht)
  b.g=(n,ht,deco)=>{b.last=b.x;for(let i=0;i<n;i++){b.ensure(b.x+i);for(let h=0;h<ht;h++)b.set(b.x+i,h,'#');
      if(deco&&deco[i]&&deco[i]!==' ')b.set(b.x+i,ht,deco[i]);}b.x+=n;b.gh=ht;return b;};
  b.gap=(n,h,deco)=>{if(n>5)throw new Error('gap too wide '+n+' at '+b.x);b.last=b.x;b.ensure(b.x+n-1);if(deco)for(let i=0;i<n;i++)if(deco[i]&&deco[i]!==' ')b.set(b.x+i,h,deco[i]);b.x+=n;return b;};
  // place a string relative to the start of the last segment
  b.p=(dx,h,str)=>{for(let i=0;i<str.length;i++)if(str[i]!==' ')b.set(b.last+dx+i,h,str[i]);return b;};
  b.sign=(dx,h,text)=>{b.signs.push({x:(b.last+dx)*T+T/2,y:(H-h)*T,text});return b;};
  return b;
}
const LEVELS=[
 {id:'meadow',name:'Meadow Steps',sub:'Learn to leap, dash and grow',song:'meadow',sky:0,build(){
  const b=Builder(15);
  b.g(14,3,'  S  ooo    o ').sign(5,5,'Jump: Space / A / JUMP');
  b.g(6,4,' ooo  ').g(6,5,'  oo  ');
  b.gap(3,8,' o ').g(8,5,'o  b   o').sign(2,7,'Bounce on beetles!');
  b.g(4,3,'    ').p(0,6,' ooo');
  b.gap(4,8,'oooo').g(10,3,' C    oo ').sign(3,6,'Dash in the air: X / DASH');
  b.gap(5,7,'o   o').g(8,3,'o  M   ').p(3,9,'ooo').p(3,10,' * ');
  b.g(6,3,'  oo  ').sign(2,8,'Grow a leaf: C / GROW');
  b.p(1,9,'      ').g(2,6,'  ').p(0,9,'oo').g(6,3,'      ');
  b.g(3,3,'   ');// wall ahead: grow a vine (hold up) or leaf
  b.g(6,7,'  o   ').p(1,11,'o*o').sign(-6,10,'Hold UP + GROW for a vine');
  b.g(5,5,' ooo ').gap(3,7,'ooo').g(8,4,' C  oo  ');
  b.g(6,4,'   ^^ ').p(2,7,'oo').sign(0,6,'Thorns sting!');
  b.gap(2,6,'oo').g(6,4,'o b  o').g(4,6,' oo ').g(4,8,'oo  ');
  b.gap(4,11,'oooo').g(6,6,'  o   ').p(0,9,'hhhhh').p(0,8,'hhhhh').p(1,8,' * ');
  b.g(10,6,'  oo   G  ');
  return b;}},
 {id:'bramble',name:'Bramble Hollow',sub:'Thorns, beetles and bouncy caps',song:'bramble',sky:1,build(){
  const b=Builder(16);
  b.g(10,3,'  S   oo  ').g(6,3,'  ^^  ').p(1,6,'oooo');
  b.g(6,4,'  b   ').gap(3,7,'ooo').g(5,5,' M   ').p(0,10,' ooo ');
  b.g(8,4,'   ^^^  ').p(2,8,'ooo').gap(4,8,'o  o').g(6,4,'  F   ');
  b.gap(5,9,'ooooo').g(5,3,'  C  ').g(6,3,' ^^^^ ').p(1,10,'====').p(1,11,'oooo');
  b.g(6,3,' b  b ').g(4,6,' oo ').gap(3,9,' o ').g(4,7,'    ');
  b.p(1,12,'===').p(1,13,' * ');
  b.g(6,5,'  M   ').p(0,13,'oooooo').g(6,3,'^^^^^^').p(0,11,'======');
  b.g(6,4,' C oo ').gap(4,9,'    ').p(0,7,'====').p(0,8,'oooo');
  b.g(8,4,' b   D  ').g(5,4,'  ^^ ').gap(5,10,'ooooo').g(6,5,'   b  ');
  b.g(3,5,'   ').p(0,4,'hhh').p(0,3,'hhh').p(0,2,'h*h');
  b.g(4,7,'oooo').gap(3,9,'o o').g(6,5,'  oo  ').g(8,6,'  ^^ C  ');
  b.g(5,6,' o o ').gap(4,10,'oooo').g(6,6,' ^^^^ ').p(0,12,'hhhhhh').p(0,11,'======').p(2,13,'*');
  b.g(6,7,'o b  o').g(10,7,'   oo  G  ');
  return b;}},
 {id:'canopy',name:'Breezy Canopy',sub:'Climb vines up the giant stems',song:'canopy',sky:2,build(){
  const b=Builder(24);
  b.g(8,3,' S  oo  ').g(4,6,'oo  ').g(4,9,'  oo').sign(-4,12,'Climb: grow a vine and hold UP');
  b.gap(3,12,'ooo').g(4,9,' C  ').p(0,14,'====').p(0,15,'oooo');
  b.gap(4,14,'    ').p(0,17,'====').p(0,18,' L  ');
  b.g(6,9,'  b   ').g(4,12,'oo  ').gap(4,16,'oooo').g(5,13,'  oo ');
  b.g(3,16,'   ').p(0,20,' * ').p(-1,19,'=====');
  b.g(6,13,' C  oo').gap(5,15,'ooooo').g(4,11,' M  ').p(0,19,'oooo');
  b.g(5,14,'  b  ').gap(4,17,'    ').p(0,16,'====').g(6,15,'  oo B').gap(4,18,'oooo');
  b.g(4,12,'^^^^').p(0,16,'===').p(0,17,'oo ').g(6,12,' C  o ');
  b.g(3,17,'   ').p(0,21,'o*o').sign(-3,13,'Too tall? UP + GROW a vine');
  b.g(6,15,' oo   ').p(2,20,'*').p(1,19,'ooo').gap(4,18,'oooo').g(6,15,'  b  o').g(10,15,'  oo  G   ');
  return b;}},
 {id:'sky',name:'Floating Gardens',sub:'Island-hop high above the clouds',song:'sky',sky:3,build(){
  const b=Builder(16);
  b.g(8,4,' S  oo  ').gap(3,7,'ooo').g(4,4,' oo ').gap(4,7,'oooo').g(4,5,'  w ');
  b.gap(3,8,'ooo').g(5,4,' C L ').gap(5,9,'ooooo').g(3,6,'o o').gap(5,9,' w   ');
  b.g(4,6,'oooo').p(0,12,'====').p(1,13,'**').gap(4,9,'    ').p(0,7,'====').p(0,8,'oooo');
  b.g(6,5,'  C  w').gap(5,10,'oooo ').g(3,4,' M ').p(0,12,'ooo');
  b.gap(4,12,'    ').p(0,10,'====').g(5,7,'^ o ^').gap(5,10,'o w o').g(5,6,'  D  ');
  b.gap(5,12,'ooooo').g(4,6,'  C ').gap(5,11,' w   ').g(3,5,'ooo').gap(5,10,'ooooo');
  b.g(4,7,' oo ').p(-2,3,'hhhh').p(-1,2,'o*').gap(4,10,'    ').p(0,8,'====').g(10,8,' oo   G  ');
  return b;}},
];
// fix: level 4 has 4 stones placed by '**' — keep only 3 per level when counting
let W=null; // current world
function makeWorld(def,endless){
  const w={def,endless,cols:[],H:16,motes:[],stones:[],enemies:[],powers:[],checks:[],signs:[],plants:[],goal:null,start:{x:100,y:100},
    totalMotes:0,totalStones:0,score:0,time:0,cam:{x:0,y:0},scroll:0,genX:0,deco:[]};
  if(endless){w.H=16;w.genX=0;endlessGen(w,40);w.start={x:3*T,y:(w.H-6)*T};return w;}
  const b=def.build();w.H=b.H;w.signs=b.signs;
  for(let c=0;c<b.cols.length;c++){const col=b.cols[c];for(let r=0;r<b.H;r++){const ch=col[r];if(extract(w,ch,c,r))col[r]=' ';}}
  w.cols=b.cols;
  // keep at most 3 sunstones
  w.stones=w.stones.slice(0,3);w.totalStones=w.stones.length;w.totalMotes=w.motes.length;
  return w;
}
function extract(w,ch,c,r){
  const x=c*T+T/2,y=r*T+T/2;
  if(ch==='o'){w.motes.push({x,y,b:Math.random()*6,got:false});return true;}
  if(ch==='*'){w.stones.push({x,y,got:false});return true;}
  if(ch==='S'){w.start={x,y:y};return true;}
  if(ch==='G'){w.goal={x,y:y-T};return true;}
  if(ch==='C'){w.checks.push({x,y,on:false,t:0});return true;}
  if(ch==='b'){w.enemies.push({k:'b',x,y:y+T/2-14,vx:-55,w:30,h:24,alive:true,t:Math.random()*5,y0:y});return true;}
  if(ch==='w'){w.enemies.push({k:'w',x,y,vx:0,w:30,h:26,alive:true,t:Math.random()*5,y0:y});return true;}
  if('FDBL'.includes(ch)){w.powers.push({k:ch,x,y,got:false,t:0});return true;}
  return false;
}
function tileAt(c,r){if(r<0)return ' ';if(!W)return ' ';const col=W.cols[c];if(!col)return ' ';if(r>=W.H)return ' ';return col[r]||' ';}
const solid=ch=>ch==='#'||ch==='M';
// ---------- endless sky garden generator ----------
function endlessGen(w,upto){
  const H=w.H; let lvl=w.genH||5;
  while(w.cols.length<upto){
    const c0=w.cols.length,diff=Math.min(1,c0/700);
    const add=(n,ht)=>{for(let i=0;i<n;i++){const col=new Array(H).fill(' ');for(let h=0;h<ht;h++)col[H-1-h]='#';w.cols.push(col);}};
    const put=(c,h,ch)=>{if(w.cols[c]&&h>=0&&h<H){if(!extract(w,ch,c,H-1-h))w.cols[c][H-1-h]=ch;}};
    if(c0<12){add(12,lvl);for(let i=4;i<10;i+=2)put(i,lvl,'o');continue;}
    const kind=Math.random();
    if(kind<0.45){ // island
      const n=Math.floor(rnd(4,9-diff*2)); lvl=clamp(lvl+Math.floor(rnd(-2,3)),3,8); add(n,lvl);
      for(let i=1;i<n-1;i++)if(Math.random()<0.5)put(c0+i,lvl,'o');
      const r=Math.random(); if(r<0.12+diff*0.15)put(c0+Math.floor(n/2),lvl,'b');else if(r<0.2+diff*0.2&&n>4)put(c0+2,lvl,'^');else if(r<0.3)put(c0+n-2,lvl,'M');
      if(Math.random()<0.06)put(c0+1,lvl,'FDBL'[Math.floor(Math.random()*4)]);
    }else if(kind<0.75){ // gap with mote arc
      const n=Math.floor(rnd(2,3+diff*2.5)); for(let i=0;i<n;i++)w.cols.push(new Array(H).fill(' '));
      for(let i=0;i<n;i++)put(c0+i,lvl+2+Math.round(Math.sin((i+0.5)/n*Math.PI)*2),'o');
      if(Math.random()<0.15+diff*0.2)put(c0+Math.floor(n/2),lvl+4,'w');
    }else{ // floating platforms over gap
      const n=Math.floor(rnd(4,6)); for(let i=0;i<n;i++)w.cols.push(new Array(H).fill(' '));
      const ph=clamp(lvl+Math.floor(rnd(-1,3)),3,10); for(let i=1;i<n-1;i++){w.cols[c0+i][H-1-ph]='=';put(c0+i,ph+1,'o');}
      lvl=clamp(ph-1,3,8);
    }
  }
  w.genH=lvl;
}
// ---------- player ----------
const P={x:0,y:0,vx:0,vy:0,w:24,h:32,face:1,onG:false,coyote:0,buf:0,dashT:0,dashes:1,dashCD:0,climb:false,hurtT:0,petals:3,motes:0,
  sx:1,sy:1,trail:[],power:null,powerT:0,combo:0,comboT:0,bestCombo:0,deadT:0,check:null,stones:0,gotMotes:0,lastGroundY:0,jumpHold:0,stomps:0,blink:0,fallT:0,idleT:0,glide:false};
const PW={F:{n:'Feather Float',c:'#bfefff'},D:{n:'Zoom Dash',c:'#ffd45e'},B:{n:'Boing Boots',c:'#ffa9c0'},L:{n:'Petal Glide',c:'#c9b6ff'}};
const GRAV=2300,RUN=330,JUMPV=860;
function resetPlayer(at){
  const s=at||W.start;P.x=s.x;P.y=s.y-6;P.vx=P.vy=0;P.dashT=0;P.dashes=1;P.climb=false;P.hurtT=1;P.petals=3;P.trail.length=0;P.deadT=0;P.sx=0.6;P.sy=1.4;P.onG=false;
  if(P.motes<6)P.motes=6; // never stuck without seeds after a respawn
  W.plants.length=0;
}
function rectHitsSolid(x,y,w,h){
  const c0=Math.floor((x-w/2)/T),c1=Math.floor((x+w/2-0.01)/T),r0=Math.floor((y-h)/T),r1=Math.floor((y-0.01)/T);
  for(let c=c0;c<=c1;c++)for(let r=r0;r<=r1;r++)if(solid(tileAt(c,r)))return true;return false;
}
// one-way tops: tiles '=' and plant leaves/pads; returns top y or null
function oneWayTop(px,prevBottom,newBottom,w){
  let best=null;
  const c0=Math.floor((px-w/2)/T),c1=Math.floor((px+w/2-0.01)/T);
  const r0=Math.floor(prevBottom/T),r1=Math.floor(newBottom/T);
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){const ch=tileAt(c,r);if(ch==='='){const top=r*T;if(prevBottom<=top+0.5&&newBottom>=top){if(best===null||top<best.y)best={y:top,k:'='};}}}
  for(const pl of W.plants){if(pl.k==='vine')continue;const top=pl.y;if(px+w/2>pl.x-pl.w/2&&px-w/2<pl.x+pl.w/2&&prevBottom<=top+0.5&&newBottom>=top){if(best===null||top<best.y)best={y:top,k:pl.k,pl};}}
  return best;
}
