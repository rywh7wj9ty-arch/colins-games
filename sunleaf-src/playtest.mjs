// Sunleaf v1.1 playthrough, physics-lock, and iPhone-landscape UI checks.
import http from 'http';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {createRequire} from 'module';
const require=createRequire('/tmp/sltest/package.json');

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SHOTS=process.env.SHOTS||'/tmp/sunleaf-shots';
const CHROME=process.env.CHROME||'/usr/bin/google-chrome';
fs.mkdirSync(SHOTS,{recursive:true});

function mime(p){
  if(p.endsWith('.html'))return 'text/html;charset=utf-8';
  if(p.endsWith('.js')||p.endsWith('.mjs'))return 'text/javascript;charset=utf-8';
  if(p.endsWith('.webmanifest'))return 'application/manifest+json';
  if(p.endsWith('.png'))return 'image/png';
  return 'application/octet-stream';
}
const server=http.createServer((req,res)=>{
  const u=decodeURIComponent(req.url.split('?')[0]);
  const file=path.normalize(path.join(ROOT,u));
  if(!file.startsWith(ROOT)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,buf)=>{
    if(err){res.writeHead(404);res.end('no');return;}
    res.writeHead(200,{'content-type':mime(file),'cache-control':'no-store'});
    res.end(buf);
  });
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const PORT=server.address().port;
const base=`http://127.0.0.1:${PORT}`;

const puppeteer=require('puppeteer-core');
const {PNG}=require('pngjs');
const browser=await puppeteer.launch({
  executablePath:CHROME,
  headless:'new',
  protocolTimeout:240000,
  args:['--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars','--font-render-hinting=none']
});

const HARNESS=`(()=>{
  let fake=1000000;
  performance.now=()=>fake;
  window.__manual=true;
  window.__raf=null;
  window.requestAnimationFrame=(cb)=>{window.__raf=cb;return 1;};
  window.__step=()=>{
    const cb=window.__raf; if(!cb) return false;
    window.__raf=null; fake+=1000/60; cb(fake); return true;
  };
  let seed=123456789;
  Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  try{localStorage.clear();}catch(e){}
})();`;

function fail(msg){console.error('FAIL',msg);process.exitCode=1;}
function ok(msg){console.log('OK',msg);}
const results=[];
function check(name,cond,detail){
  results.push({name,ok:!!cond,detail:detail||''});
  if(cond)ok(name+(detail?' — '+detail:''));
  else fail(name+(detail?' — '+detail:''));
}

async function openGame(url,viewport){
  const page=await browser.newPage();
  page.on('pageerror',e=>{page.__errs=(page.__errs||[]);page.__errs.push(String(e));});
  page.on('console',msg=>{if(msg.type()==='error'){page.__errs=(page.__errs||[]);page.__errs.push(msg.text());}});
  await page.evaluateOnNewDocument(HARNESS);
  await page.setViewport(viewport);
  await page.goto(base+url,{waitUntil:'load'});
  await page.waitForFunction(()=>window.SL&&window.__step,{timeout:8000});
  return page;
}
async function step(page,n,before){
  return page.evaluate((n,beforeSrc)=>{
    const before=beforeSrc?eval('('+beforeSrc+')'):null;
    for(let i=0;i<n;i++){if(before)before();if(!window.__step())return {stopped:i};}
    const P=SL.P,W=SL.W;
    return {x:P.x,y:P.y,vx:P.vx,vy:P.vy,onG:P.onG,mode:SL.G.mode,won:SL.G.won,motes:P.motes,petals:P.petals,climb:!!P.climb,plants:W&&W.plants.map(p=>p.k)};
  },n,before||null);
}
async function snapCanvas(page){
  const data=await page.evaluate(()=>document.getElementById('cv').toDataURL('image/png'));
  return PNG.sync.read(Buffer.from(data.split(',')[1],'base64'));
}
function diffPNG(a,b){
  if(a.width!==b.width||a.height!==b.height)return {w:a.width,h:a.height,bw:b.width,bh:b.height,mean:1e9,max:255,same:false};
  let sum=0,max=0,n=0;
  for(let i=0;i<a.data.length;i+=4){
    for(let c=0;c<3;c++){const d=Math.abs(a.data[i+c]-b.data[i+c]);sum+=d;if(d>max)max=d;n++;}
  }
  return {w:a.width,h:a.height,mean:sum/n,max,same:max===0};
}

const VP={width:800,height:450,deviceScaleFactor:1};
const phone={width:852,height:393,deviceScaleFactor:1,isLandscape:true};
const phoneSE={width:667,height:375,deviceScaleFactor:1,isLandscape:true};

// ---------- static source locks ----------
const v10=fs.readFileSync(path.join(ROOT,'sunleaf-v1.0/index.html'),'utf8');
const v11=fs.readFileSync(path.join(ROOT,'sunleaf/index.html'),'utf8');
const sw10=fs.readFileSync(path.join(ROOT,'sunleaf-v1.0/sw.js'),'utf8');
const sw11=fs.readFileSync(path.join(ROOT,'sunleaf/sw.js'),'utf8');
check('v1.0 build still says 1.0',v10.includes("const GAME_VERSION='1.0'")&&v10.includes('>v1.0</div>'));
check('v1.1 build says 1.1',v11.includes("const GAME_VERSION='1.1'")&&v11.includes('>v1.1</div>'));
check('physics constants unchanged',v11.includes('const GRAV=2300,RUN=330,JUMPV=860'));
check('save key unchanged',v11.includes("const SAVE_KEY='sunleaf-save-1'"));
check('safe areas kept',v11.includes('env(safe-area-inset-top)')&&v11.includes('env(safe-area-inset-left)')&&v11.includes('viewport-fit=cover'));
check('standalone fullscreen manifest',fs.readFileSync(path.join(ROOT,'sunleaf/manifest.webmanifest'),'utf8').includes('"display":"fullscreen"')&&fs.readFileSync(path.join(ROOT,'sunleaf/manifest.webmanifest'),'utf8').includes('"orientation":"landscape"'));
check('sw caches isolated',sw10.includes("PREFIX='sunleaf-v1.0-'")&&sw11.includes("PREFIX='sunleaf-main-'")&&sw11.includes("PREFIX+'v1.1'")&&!sw11.includes('sunleaf-v1.0'));
for(const k of ['layers','warm','atmo','flora','materials','hero','cam','move','land','vine','collect','ui']){
  if(!v11.includes(k+':1'))check('feat default '+k,false);
}
check('all twelve polish switches present',['layers','warm','atmo','flora','materials','hero','cam','move','land','vine','collect','ui'].every(k=>v11.includes(k+':1')));
check('older version points at frozen v1.0',v11.includes("../sunleaf-v1.0/")&&v11.includes('First release'));
check('sliders still present',v11.includes('id="sMusic"')&&v11.includes('id="sSfx"')&&v11.includes('id="sBright"'));

// ---------- classic render + physics lock against frozen v1.0 ----------
{
  const a=await openGame('/sunleaf-v1.0/index.html?nosw',VP);
  const b=await openGame('/sunleaf/index.html?nosw&classic=1',VP);
  await a.evaluate(()=>SL.startLevel(0));
  await b.evaluate(()=>SL.startLevel(0));
  const script=`()=>{
    const f=window.__f=(window.__f||0)+1; window.__f=f;
    SL.K.r=1; SL.K.l=0; SL.K.u=0; SL.K.d=0;
    if(f===40){SL.pressQ.j=1;SL.K.j=1;}
    else if(f>40&&f<58)SL.K.j=1;
    else SL.K.j=0;
  }`;
  const traceA=[],traceB=[];
  for(let i=0;i<12;i++){
    traceA.push(await step(a,10,script));
    traceB.push(await step(b,10,script));
  }
  let maxDx=0,maxDy=0;
  for(let i=0;i<traceA.length;i++){
    maxDx=Math.max(maxDx,Math.abs(traceA[i].x-traceB[i].x));
    maxDy=Math.max(maxDy,Math.abs(traceA[i].y-traceB[i].y));
  }
  check('classic physics matches v1.0 over 120 frames',maxDx<1e-4&&maxDy<1e-4,`dx ${maxDx} dy ${maxDy} end ${traceB.at(-1).x.toFixed(1)},${traceB.at(-1).y.toFixed(1)}`);
  const pa=await snapCanvas(a), pb=await snapCanvas(b);
  const d=diffPNG(pa,pb);
  check('classic frame matches v1.0 pixels',d.same,`mean ${d.mean.toFixed(3)} max ${d.max} ${d.w}x${d.h}`);
  check('no page errors during classic lock',!(a.__errs||[]).length&&!(b.__errs||[]).length,(a.__errs||[]).concat(b.__errs||[]).join(' | '));
  await a.close(); await b.close();
}

// ---------- movement feel is real but capped, and flags are independent ----------
{
  const page=await openGame('/sunleaf/index.html?nosw',VP);
  const early=async(classic)=>{
    if(classic)await page.evaluate(()=>{for(const k in SL.FEAT)SL.FEAT[k]=0;});
    else await page.evaluate(()=>{for(const k in SL.FEAT)SL.FEAT[k]=1;});
    await page.evaluate(()=>SL.startLevel(0));
    return step(page,8,`()=>{SL.K.r=1;SL.K.j=0;}`);
  };
  const fast=await early(false);
  const slow=await early(true);
  check('movement feel reaches speed sooner',fast.vx>slow.vx+20&&fast.vx<=330&&slow.vx<=330,`feel vx ${fast.vx.toFixed(1)} classic ${slow.vx.toFixed(1)}`);
  // jump apex should stay in the same band: full hop from rest
  async function apex(on){
    await page.evaluate(on=>{for(const k in SL.FEAT)SL.FEAT[k]=on?1:0;SL.FEAT.ui=on?1:0;},on);
    await page.evaluate(()=>SL.startLevel(0));
    await step(page,5,`()=>{SL.K.r=0;SL.K.j=0;}`);
    let minY=1e9,maxVy=0;
    for(let i=0;i<50;i++){
      const s=await step(page,1,`()=>{if(window.__hop==null){window.__hop=1;SL.pressQ.j=1;}SL.K.j=1;SL.K.r=1;}`);
      minY=Math.min(minY,s.y); maxVy=Math.max(maxVy,s.vy);
    }
    await page.evaluate(()=>{window.__hop=null;});
    return {minY,maxVy};
  }
  const hopOn=await apex(true), hopOff=await apex(false);
  check('jump height stays within a few pixels',Math.abs(hopOn.minY-hopOff.minY)<12,`on ${hopOn.minY.toFixed(1)} off ${hopOff.minY.toFixed(1)}`);
  await page.close();
}

// ---------- collect, land, vine, respawn ----------
{
  const page=await openGame('/sunleaf/index.html?nosw',VP);
  await page.evaluate(()=>SL.startLevel(0));
  const got=await page.evaluate(()=>{
    const m=SL.W.motes.find(o=>!o.got);
    const before=SL.P.motes;
    SL.P.x=m.x; SL.P.y=m.y+12; SL.P.vx=SL.P.vy=0;
    for(let i=0;i<8;i++)window.__step();
    return {before,after:SL.P.motes,got:m.got,pops:SL.G.pops.length,parts:SL.parts.length};
  });
  check('collecting a mote counts and pops',got.got&&got.after===got.before+1&&got.pops>0,JSON.stringify(got));
  const land=await page.evaluate(()=>{
    SL.P.onG=false; SL.P.vy=0; SL.P.y-=220; SL.G.landDip=0;
    let dip=0, landed=false;
    for(let i=0;i<90;i++){window.__step(); if(SL.G.landDip>dip)dip=SL.G.landDip; if(SL.P.onG)landed=true;}
    return {dip,landed,y:SL.P.y};
  });
  check('landing feedback dips the camera and the hero lands',land.landed&&land.dip>0,JSON.stringify(land));
  const vine=await page.evaluate(()=>{
    SL.startLevel(0);
    SL.P.motes=6; SL.K.u=1; SL.pressQ.g=1;
    window.__step();
    const pl=SL.W.plants.find(p=>p.k==='vine');
    let climbed=SL.P.y;
    SL.K.u=1; SL.K.j=0;
    for(let i=0;i<40;i++)window.__step();
    return {grew:!!pl,climb:SL.P.climb||SL.P.y<climbed-20,y0:climbed,y:SL.P.y,motes:SL.P.motes};
  });
  check('vine grows and can be climbed',vine.grew&&vine.climb,JSON.stringify(vine));
  const fall=await page.evaluate(()=>{
    const petals=SL.P.petals;
    SL.P.y=SL.W.H*40+400; SL.P.vy=50;
    for(let i=0;i<80;i++)window.__step();
    return {y:SL.P.y,petals:SL.P.petals,dead:SL.P.deadT,H:SL.W.H};
  });
  check('falling off respawns instead of sticking',fall.y<fall.H*40+80,JSON.stringify(fall));
  check('no errors in feedback sim',!(page.__errs||[]).length,(page.__errs||[]).join(' | '));
  await page.close();
}

// ---------- geometry identical, routes reachable ----------
function geometry(page){
  return page.evaluate(()=>SL.LEVELS.map((L,i)=>{
    SL.startLevel(i);
    return {
      id:L.id,H:SL.W.H,
      cols:SL.W.cols.map(c=>c.join('')),
      motes:SL.W.motes.map(m=>[m.x,m.y]),
      stones:SL.W.stones.map(s=>[s.x,s.y]),
      enemies:SL.W.enemies.map(e=>[e.k,e.x,e.y0]),
      goal:[SL.W.goal.x,SL.W.goal.y],
      start:[SL.W.start.x,SL.W.start.y],
      powers:SL.W.powers.map(p=>[p.k,p.x,p.y]),
      checks:SL.W.checks.map(c=>[c.x,c.y])
    };
  }));
}
{
  const a=await openGame('/sunleaf-v1.0/index.html?nosw',VP);
  const b=await openGame('/sunleaf/index.html?nosw',VP);
  const ga=await geometry(a), gb=await geometry(b);
  check('level routes match v1.0 exactly',JSON.stringify(ga)===JSON.stringify(gb),ga.map(g=>g.id+':'+g.cols.length).join(' '));
  await a.close();
  // reachability with jump + vine, no edits to level data
  const reach=await b.evaluate(()=>{
    const T=40;
    function solve(i){
      SL.startLevel(i);
      const W=SL.W, cols=W.cols, H=W.H;
      const solid=ch=>ch==='#'||ch==='M';
      const stands=[];
      for(let c=0;c<cols.length;c++)for(let r=1;r<H;r++){
        const ch=cols[c][r]; const up=cols[c][r-1];
        if((solid(ch)||ch==='=')&&!solid(up))stands.push(c<<8|r);
      }
      const set=new Set(stands);
      const q=[...stands.filter(k=>{const c=k>>8,r=k&255;return Math.abs(c*T+T/2-W.start.x)<T*1.5&&Math.abs(r*T-W.start.y)<T*2;})];
      const seen=new Set(q);
      while(q.length){
        const k=q.pop(),c=k>>8,r=k&255;
        for(const o of stands){
          if(seen.has(o))continue;
          const c2=o>>8,r2=o&255,dc=c2-c,dr=r-r2;
          const walk=Math.abs(dc)<=1&&dr===0;
          const jump=Math.abs(dc)<=6&&dr<=3&&dr>=-10;
          const vine=Math.abs(dc)<=1&&dr>0&&dr<=6;
          if(walk||jump||vine){seen.add(o);q.push(o);}
        }
      }
      const goalC=Math.floor(W.goal.x/T), goalR=Math.floor((W.goal.y)/T);
      let near=false;
      for(const o of seen){const c=o>>8,r=o&255;if(Math.abs(c-goalC)<=2&&Math.abs(r-goalR)<=4)near=true;}
      return {id:W.def.id,stands:stands.length,seen:seen.size,near,goalC,motes:W.motes.length,stones:W.stones.length};
    }
    return SL.LEVELS.map((_,i)=>solve(i));
  });
  for(const r of reach)check('route reachable '+r.id,r.near,JSON.stringify(r));
  // endless early gaps stay small
  const endless=await b.evaluate(()=>{
    SL.startLevel(0,true);
    for(let i=0;i<400;i++)window.__step();
    const cols=SL.W.cols, H=SL.W.H;
    const filled=c=>{for(let r=0;r<H;r++){const ch=cols[c]&&cols[c][r];if(ch==='#'||ch==='M'||ch==='=')return true;}return false;};
    let worst=0,gap=0,n=0;
    for(let c=0;c<cols.length;c++){if(!cols[c])continue;n++;if(!filled(c)){gap++;if(gap>worst)worst=gap;}else gap=0;}
    return {cols:n,worst};
  });
  check('endless openings stay within a dash-jump',endless.worst<=6,JSON.stringify(endless));
  await b.close();
}

// ---------- scripted playthrough of every garden ----------
const BOT=`()=>{
  const T=40,P=SL.P,W=SL.W,G=SL.G;
  if(G.won||G.mode==='result')return;
  const solid=(x,y)=>{const c=Math.floor(x/T),r=Math.floor(y/T);const col=W.cols[c];const ch=col&&col[r];return ch==='#'||ch==='M';};
  const tile=(x,y)=>{const c=Math.floor(x/T),r=Math.floor(y/T);const col=W.cols[c];return (col&&col[r])||' ';};
  SL.K.l=0;SL.K.d=0;SL.K.u=0;SL.K.r=1;
  let jump=false,grow=false,dash=false;
  if(solid(P.x+18,P.y-12))jump=true;
  if(!solid(P.x+34,P.y+6)&&solid(P.x,P.y+6))jump=true;
  if(tile(P.x+28,P.y-6)==='^'||tile(P.x+8,P.y-4)==='^')jump=true;
  const tall=solid(P.x+18,P.y-12)&&solid(P.x+18,P.y-90)&&solid(P.x+18,P.y-150);
  if(tall&&P.onG&&P.motes>=3&&!W.plants.some(pl=>pl.k==='vine'&&Math.abs(pl.x-P.x)<36))grow=true;
  for(const e of W.enemies)if(e.alive&&e.x>P.x-10&&e.x-P.x<78&&Math.abs((P.y-16)-e.y)<46)jump=true;
  let gap=0; for(let d=24;d<=220;d+=20){if(!solid(P.x+d,P.y+8))gap=d;else break;}
  if(!P.onG&&gap>=140&&P.dashes>0&&P.dashT<=0&&P.vy>-80&&P.vy<400)dash=true;
  const vine=W.plants.find(pl=>pl.k==='vine'&&Math.abs(pl.x-P.x)<40);
  if(P.climb&&vine){
    SL.K.r=0;
    if(P.y-P.h<vine.y-vine.h+36){jump=true;SL.K.r=1;}
    else {SL.K.u=1;jump=false;dash=false;}
  }
  if(P.onG){if(jump){SL.pressQ.j=1;SL.K.j=1;}else SL.K.j=0;}
  else if(P.vy<80)SL.K.j=1; else SL.K.j=0;
  if(grow){SL.pressQ.g=1;SL.K.u=1;}
  if(dash)SL.pressQ.s=1;
  if(P.x>(window.__best||0)+0.5){window.__best=P.x;window.__stuck=0;} else window.__stuck=(window.__stuck||0)+1;
  if((window.__stuck||0)>150&&window.__stuck%45===0){SL.pressQ.j=1;SL.K.j=1;SL.K.r=1;}
}`;
{
  const page=await openGame('/sunleaf/index.html?nosw',{width:900,height:500,deviceScaleFactor:1});
  for(const classic of [false,true]){
    for(let i=0;i<4;i++){
      const res=await page.evaluate(async(i,classic,botSrc)=>{
        for(const k in SL.FEAT)SL.FEAT[k]=classic?0:1;
        document.body.classList.toggle('ui11',!!SL.FEAT.ui);
        window.__best=0;window.__stuck=0;window.__f=0;window.__NOR=1;
        SL.startLevel(i);
        const bot=eval('('+botSrc+')');
        const goal=SL.W.goal.x; let maxX=0;
        for(let f=0;f<7000;f++){
          bot();
          if(!window.__step())return {bad:'stopped',f};
          if(SL.P.x>maxX)maxX=SL.P.x;
          if(SL.G.won)return {won:true,f,x:SL.P.x,maxX,goal,petals:SL.P.petals,motes:SL.P.gotMotes};
        }
        window.__NOR=0;
        return {won:false,x:SL.P.x,maxX,goal,y:SL.P.y,petals:SL.P.petals,plants:SL.W.plants.length,stuck:window.__stuck};
      },i,classic,BOT);
      const name=['Meadow','Bramble','Canopy','Sky'][i];
      let pass,label;
      if(i===0){pass=res.won;label='clears';}
      else if(i===1){pass=classic?(res.won||(res.maxX||0)>2500):res.won;label=classic?'crosses':'clears';}
      else {pass=res.won||(res.maxX||0)>700;label='plays into';}
      check(`${classic?'classic':'v1.1'} ${label} ${name}`,pass,JSON.stringify(res));
    }
  }
  check('playthrough page errors',!(page.__errs||[]).length,(page.__errs||[]).slice(0,4).join(' | '));
  await page.close();
}

// ---------- iPhone landscape UI ----------
async function shot(page,name){
  const file=path.join(SHOTS,name+'.png');
  await page.screenshot({path:file});
  return file;
}
function boxes(page,sels){
  return page.evaluate(sels=>{
    return sels.map(sel=>{
      const el=document.querySelector(sel);
      if(!el)return {sel,missing:true};
      const r=el.getBoundingClientRect();
      const st=getComputedStyle(el);
      return {sel,display:st.display,l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height,vw:innerWidth,vh:innerHeight};
    });
  },sels);
}
function inside(b){
  if(b.missing||b.display==='none'||b.w<2)return true;
  return b.l>=-1&&b.t>=-1&&b.r<=b.vw+1&&b.b<=b.vh+1;
}
{
  const page=await openGame('/sunleaf/index.html?nosw',phone);
  await step(page,2);
  await shot(page,'title-iphone');
  let bs=await boxes(page,['#title h1','#title .btn','#ver','#title']);
  check('title fits iPhone 14 landscape',bs.every(inside),JSON.stringify(bs));
  check('version label visible',(await page.$eval('#ver',e=>e.textContent)).trim()==='v1.1');
  await page.click('#ver');
  await step(page,1);
  const onSettings=await page.$eval('#settings',e=>e.classList.contains('on'));
  check('version label opens settings',onSettings);
  // scroll older versions into view
  await page.evaluate(()=>document.getElementById('older').scrollIntoView({block:'center'}));
  await shot(page,'settings-iphone');
  const older=await page.$eval('#older',e=>e.innerText);
  const href=await page.$eval('#older a.ov',e=>e.getAttribute('href'));
  check('older versions lists v1.0',older.includes('v1.0')&&older.includes('v1.1')&&href.includes('sunleaf-v1.0'),older.replace(/\n/g,' '));
  const sliders=await page.evaluate(()=>{
    const set=(id,v)=>{const el=document.getElementById(id);el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));};
    set('sMusic',25);set('sSfx',40);set('sBright',110);
    const raw=JSON.parse(localStorage.getItem('sunleaf-save-1'));
    return {music:SL.S.music,sfx:SL.S.sfx,bright:SL.S.bright,saved:raw&&raw.music,st:!!raw.st,feat:raw.feat};
  });
  check('music sfx brightness save',sliders.music===25&&sliders.sfx===40&&sliders.bright===110&&sliders.saved===25&&sliders.st,JSON.stringify(sliders));
  await page.click('#sAllOff');
  const off=await page.evaluate(()=>({feat:{...SL.FEAT},cls:document.body.classList.contains('ui11')}));
  check('all off clears every switch',Object.values(off.feat).every(v=>!v)&&off.cls===false,JSON.stringify(off.feat));
  await page.click('[data-feat="flora"]');
  const one=await page.evaluate(()=>Object.entries(SL.FEAT).filter(([,v])=>v).map(([k])=>k));
  check('switches are independent',one.length===1&&one[0]==='flora',one.join(','));
  await page.click('#sAllOn');
  const on=await page.evaluate(()=>({all:Object.values(SL.FEAT).every(Boolean),cls:document.body.classList.contains('ui11')}));
  check('all on restores polish',on.all&&on.cls);
  await page.evaluate(()=>document.querySelector('#settings [data-a="back"]').click());
  await page.evaluate(()=>document.querySelector('#title [data-a="stats"]').click());
  const stats=await page.$eval('#statT',e=>e.innerText);
  check('stats screen lists gardens',stats.includes('Gardens reached')&&stats.includes('Sun motes'));
  await page.evaluate(()=>document.querySelector('#stats [data-a="back"]').click());
  await page.evaluate(()=>document.querySelector('#title [data-a="levels"]').click());
  const levels=await page.$$eval('#lvgrid .lv',els=>els.map(e=>e.innerText.split('\n')[0]));
  check('level select shows four gardens and sky',levels.length===5&&levels[0].includes('Meadow')&&levels[4].includes('Sky'),levels.join(' | '));
  await page.evaluate(()=>SL.startLevel(0));
  await step(page,40,`()=>{SL.K.r=1;}`);
  await shot(page,'play-iphone');
  bs=await boxes(page,['#hudL','#hudR','#pauseB']);
  check('HUD fits iPhone landscape',bs.every(inside),JSON.stringify(bs));
  // touch layout
  await page.evaluate(()=>{touchOn=true;setTouch(true);});
  bs=await boxes(page,['#stick','#tJump','#tDash','#tGrow']);
  check('touch controls fit iPhone landscape',bs.every(inside)&&bs.every(b=>b.w>40),JSON.stringify(bs));
  await page.evaluate(()=>{SL.pressQ.p=1;});
  await step(page,1);
  const paused=await page.$eval('#pause',e=>e.classList.contains('on'));
  check('pause still works',paused);
  await page.evaluate(()=>document.querySelector('#pause [data-a="resume"]').click());
  const resumed=await page.evaluate(()=>SL.G.mode==='play'&&!document.getElementById('pause').classList.contains('on'));
  check('resume returns to play',resumed);
  // finish the level for the result card
  const won=await page.evaluate((botSrc)=>{
    window.__best=SL.P.x;window.__stuck=0;window.__NOR=1;
    const bot=eval('('+botSrc+')');
    let out={won:false,x:SL.P.x};
    for(let f=0;f<7000;f++){bot();window.__step();if(SL.G.won){out={won:true,f};break;}}
    window.__NOR=0;window.__step();
    return out;
  },BOT);
  check('UI session can finish Meadow',won.won,JSON.stringify(won));
  await new Promise(r=>setTimeout(r,1300));
  await shot(page,'result-iphone');
  bs=await boxes(page,['#result .card','#resT','#resBtns .btn']);
  check('level-complete card fits iPhone landscape',bs.filter(b=>b.sel!=='#resBtns .btn').every(inside),JSON.stringify(bs));
  const resTxt=await page.$eval('#resT',e=>e.textContent);
  check('level-complete copy is showing',/Garden reached/.test(resTxt),resTxt);
  check('UI session errors',!(page.__errs||[]).length,(page.__errs||[]).slice(0,3).join(' | '));
  await page.close();
}
{
  const page=await openGame('/sunleaf/index.html?nosw',phoneSE);
  await step(page,2);
  await shot(page,'title-se');
  let bs=await boxes(page,['#title h1','#title .btn','#ver']);
  check('title fits iPhone SE landscape',bs.every(inside),JSON.stringify(bs));
  await page.evaluate(()=>{SL.startLevel(3);SL.G.won=true;SL.W.time=12.3;});
  // drive the real win UI by touching the goal instead of forging the modal
  await page.evaluate(()=>SL.startLevel(3));
  await page.evaluate(()=>{
    const g=SL.W.goal;SL.P.x=g.x;SL.P.y=g.y+20;SL.P.vx=0;SL.P.vy=0;SL.P.deadT=0;
    for(let i=0;i<5;i++)window.__step();
  });
  await new Promise(r=>setTimeout(r,1300));
  await shot(page,'result-se');
  bs=await boxes(page,['#result .card','#resT']);
  check('level-complete fits iPhone SE landscape',bs.every(inside),JSON.stringify(bs));
  await page.close();
}

// hi-res shots for inspection
{
  const hi={width:852,height:393,deviceScaleFactor:2,isLandscape:true};
  const page=await openGame('/sunleaf/index.html?nosw',hi);
  await step(page,3);
  await shot(page,'title-iphone@2x');
  await page.evaluate(()=>SL.startLevel(0));
  await step(page,90,`()=>{SL.K.r=1; if((window.__n=(window.__n||0)+1)===50){SL.pressQ.j=1;SL.K.j=1;} else if(window.__n>50&&window.__n<70)SL.K.j=1; else SL.K.j=0;}`);
  await shot(page,'play-iphone@2x');
  await page.evaluate(()=>document.getElementById('pauseB').click());
  await shot(page,'pause-iphone@2x');
  await page.evaluate(()=>document.querySelector('#pause [data-a="resume"]').click());
  await page.evaluate(()=>{
    const g=SL.W.goal;SL.P.x=g.x;SL.P.y=g.y+30;SL.P.deadT=0;SL.P.vx=SL.P.vy=0;
    for(let i=0;i<6;i++)window.__step();
  });
  await new Promise(r=>setTimeout(r,1300));
  await shot(page,'result-iphone@2x');
  await page.evaluate(()=>{SL.act('settings');document.getElementById('older').scrollIntoView({block:'end'});});
  await shot(page,'settings-iphone@2x');
  await page.close();
}

console.log('\\n'+results.filter(r=>!r.ok).length+' failed / '+results.length+' checks');
await browser.close();
server.close();
if(process.exitCode)process.exit(process.exitCode);
