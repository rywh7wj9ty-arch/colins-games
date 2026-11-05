// node test/unit.test.js  -- physics, progression, save, and route checks against the real core in index.html
const assert=require('assert'); const LD=require('./load-core.js')(); const C=LD.C;
let pass=0,fail=0; function t(name,fn){try{fn();pass++;console.log('ok  ',name);}catch(e){fail++;console.log('FAIL',name,'-',e.message);}}
function world(solids){const L={solids:solids.map((s,i)=>Object.assign({id:i,h:40,type:'g'},s)),winds:[]};return {L,env:{grid:new LD.Grid(L.solids),winds:L.winds,active:()=>true}};}
const NONE={double:false,dash:false,wall:false,glide:false}, ALL={double:true,dash:true,wall:true,glide:true};
function run(p,env,ab,frames,inpFn){const evs=[];for(let f=0;f<frames;f++){const e=LD.step(p,inpFn?inpFn(f,p):{x:0},ab,env,[]);evs.push(...e.map(x=>f+':'+x));}return evs;}
function settle(p,env,ab){run(p,env,ab,60);assert(p.onGround,'should settle on ground');}
function peak(ab,hold,dj){const {env}=world([{x:-500,y:500,w:2000}]);const p=LD.newPlayer(0,500);settle(p,env,ab);const y0=p.y;let min=p.y;
  run(p,env,ab,200,(f)=>({x:0,jumpP:f===0||(dj&&f===40),jump:f<hold||(dj&&f>=40&&f<80)}));
  return y0-Math.min(min,...[p.y]);}
function maxRise(ab,hold,dj){const {env}=world([{x:-500,y:500,w:2000}]);const p=LD.newPlayer(0,500);settle(p,env,ab);const y0=p.y;let best=0;
  for(let f=0;f<220;f++){LD.step(p,{x:0,jumpP:f===0||(dj&&f===40),jump:f<hold||(dj&&f>=40&&f<80)},ab,env,[]);best=Math.max(best,y0-p.y);}return best;}

t('full jump reaches ~110-135px',()=>{const h=maxRise(NONE,999);assert(h>105&&h<140,'h='+h);});
t('variable jump: tap is much lower than hold',()=>{const lo=maxRise(NONE,4),hi=maxRise(NONE,999);assert(lo<hi*0.6,`lo=${lo} hi=${hi}`);});
t('double jump requires ability and adds height',()=>{const a=maxRise(NONE,999,true),b=maxRise({...NONE,double:true},999,true);assert(Math.abs(a-maxRise(NONE,999))<1,'no dj without ability');assert(b>a+70,`a=${a} b=${b}`);});
t('coyote time: jump allowed shortly after leaving a ledge',()=>{
  for(const [delay,expect] of [[6,true],[20,false]]){const {env}=world([{x:0,y:500,w:100}]);const p=LD.newPlayer(80,500);settle(p,env,NONE);
    let left=-1,jumped=false;for(let f=0;f<200;f++){const evs=LD.step(p,{x:1,jumpP:left>=0&&f===left+delay,jump:left>=0&&f>=left+delay},NONE,env,[]);if(left<0&&!p.onGround)left=f;if(evs.includes('jump'))jumped=true;}
    assert.strictEqual(jumped,expect,'delay '+delay);}});
t('jump buffer: early press still jumps on landing',()=>{
  for(const [early,expect] of [[10,true],[30,false]]){const {env}=world([{x:-500,y:500,w:2000}]);const p=LD.newPlayer(0,300);let land=-1;
    // find landing frame first
    const q=LD.newPlayer(0,300);for(let f=0;f<300;f++){LD.step(q,{x:0},NONE,env,[]);if(q.onGround){land=f;break;}}
    let jumped=false;for(let f=0;f<300;f++){const evs=LD.step(p,{x:0,jumpP:f===land-early,jump:f>=land-early&&f<land+30},NONE,env,[]);if(evs.includes('jump'))jumped=true;}
    assert.strictEqual(jumped,expect,'early '+early);}});
t('air control: can steer mid-air',()=>{const {env}=world([{x:-500,y:500,w:2000}]);const a=LD.newPlayer(0,500),b=LD.newPlayer(0,500);
  run(a,env,NONE,60,f=>({x:0,jumpP:f===0,jump:true}));run(b,env,NONE,60,f=>({x:f>5?1:0,jumpP:f===0,jump:true}));assert(b.x-a.x>60);});
t('dash: fast, flat, ~85-110px, once per air time',()=>{const {env}=world([{x:-500,y:900,w:3000}]);const p=LD.newPlayer(0,500);p.y=400;p.airT=1;
  const y0=p.y;const x0=p.x;let evs=run(p,env,{...NONE,dash:true},21,f=>({x:1,dashP:f===0}));assert(evs.some(e=>e.endsWith('dash')));
  const dx=p.x-x0;assert(dx>85&&dx<125,'dx='+dx);
  evs=run(p,env,{...NONE,dash:true},30,f=>({x:1,dashP:f===2}));assert(!evs.some(e=>e.endsWith('dash')),'no second air dash');
  const n=LD.newPlayer(0,500);n.y=400;evs=run(n,env,NONE,10,f=>({x:1,dashP:f===0}));assert(!evs.some(e=>e.endsWith('dash')),'locked without ability');});
t('wall cling + wall jump only on moss walls',()=>{
  for(const type of ['w','g']){const {env}=world([{x:100,y:0,w:40,h:800,type},{x:-500,y:900,w:2000}]);const p=LD.newPlayer(70,400);p.x=100-C.PW;p.y=300;p.airT=1;
    let maxVy=0,evs=[];for(let f=0;f<60;f++){evs.push(...LD.step(p,{x:1},ALL,env,[]));if(f>30)maxVy=Math.max(maxVy,p.vy);}
    if(type==='w'){assert(maxVy<=C.WALL_SLIDE+1,'slides slowly '+maxVy);const e2=LD.step(p,{x:1,jumpP:true,jump:true},ALL,env,[]);assert(e2.includes('walljump'));assert(p.vx<0&&p.vy<0,'kicks away');}
    else assert(maxVy>C.WALL_SLIDE*2,'no cling on plain rock '+maxVy);}});
t('glide: holding jump caps fall speed once unlocked',()=>{const {env}=world([{x:-500,y:3000,w:2000}]);
  const p=LD.newPlayer(0,0);p.y=0;p.airT=1;run(p,env,{...NONE,glide:true},120,()=>({x:0,jump:true}));assert(p.vy<=C.GLIDE_FALL+1,'vy '+p.vy);
  const q=LD.newPlayer(0,0);q.y=0;q.airT=1;run(q,env,NONE,120,()=>({x:0,jump:true}));assert(q.vy>500,'no glide w/o ability');});
t('collection, unlock thresholds, ending flag',()=>{const L=LD.buildLevel(),pr=LD.newProgress();const unlocked=[];let endAt=-1;
  L.echoes.forEach(e=>{const r=LD.collect(L,pr,e.id);if(r.unlocked)unlocked.push(r.unlocked.id+'@'+pr.count);if(r.ending&&endAt<0)endAt=pr.count;});
  assert.deepStrictEqual(unlocked,['double@4','dash@10','wall@18','glide@26']);assert.strictEqual(endAt,L.endAt);assert(L.total>=40&&L.total<=60,'total '+L.total);
  assert.strictEqual(LD.collect(L,pr,0),null,'no double collect');});
t('save roundtrip',()=>{const L=LD.buildLevel(),pr=LD.newProgress();[0,3,7,12].forEach(i=>LD.collect(L,pr,i));pr.runes[1]=true;pr.cp=2;
  const q=LD.deserialize(LD.serialize(pr));assert.strictEqual(q.count,4);assert(q.got[7]&&q.runes[1]);assert.strictEqual(q.cp,2);assert.strictEqual(LD.deserialize('garbage').count,0);});
t('TUNNEL (Crystal Hollows dash gate): human hop+dash window works, on foot never does',()=>{
  const L=LD.buildLevel(),prog=LD.newProgress(),env=LD.makeEnv(L,prog);
  const storm=L.solids.find(s=>s.x===5070&&s.y===770), floor=L.solids.find(s=>s.x===4580&&s.y===770);
  const edgeX=floor.x+floor.w;
  function run(plan,ab){const p=LD.newPlayer(4700,770);for(let f=0;f<20;f++)LD.step(p,{x:1},ab,env,[]);
    let edge=-1;for(let f=0;f<600;f++){if(edge<0&&p.x>edgeX-1)edge=f;LD.step(p,plan(f,edge),ab,env,[]);if(p.onGround&&p.standing===storm)return true;if(p.y>1200)return false;}return false;}
  // find edge frame (when running at full speed the left edge reaches the floor end)
  const p0=LD.newPlayer(4700,770);for(let f=0;f<20;f++)LD.step(p0,{x:1},{},env,[]);let E=0;while(p0.x<=edgeX-C.PW/2){LD.step(p0,{x:1},{},env,[]);E++;}
  const AB={double:true,dash:true}, fails=[];
  for(let early=-6;early<=10;early+=2)for(let dl=6;dl<=21;dl+=3){const a=E-early;if(!run(f=>({x:1,jumpP:f===a,jump:true,dashP:f===a+dl}),AB))fails.push(early+'f early/dash+'+dl+'f');}
  assert(!fails.length,'hop+dash misses: '+fails.join(', '));
  let ok=0;for(let a=E-20;a<E+14;a++)for(let b=a+2;b<a+60;b+=2){if(run(f=>({x:1,jumpP:f===a||f===b,jump:true}),{double:true,dash:false}))ok++;}
  assert.strictEqual(ok,0,'crossed on foot '+ok+' ways');});
const reach=require('./reach.js');
let full;
t('ROUTE: every Echo reachable with abilities available at that time; ending reachable',()=>{full=reach(LD);
  assert.strictEqual(full.missing.length,0,'missing '+full.missing.join(' '));assert(full.got>=full.endAt);console.log('      passes:',full.order.reduce((m,o)=>Math.max(m,o.pass),0),'total',full.got);});
t('GATING: without Dash the Stormbreak Edge is unreachable',()=>{const r=reach(LD,{cap:()=>({dash:false})});const storm=r.L.echoes.filter(e=>e.x>5100).map(e=>e.id);
  const got=r.order.map(o=>o.id);assert(!storm.some(i=>got.includes(i)),'storm echo reached w/o dash');console.log('      without dash:',r.got);});
t('GATING: without Wall Leap the upper storm is unreachable; without Glide the far Steppe is',()=>{
  const r=reach(LD,{cap:()=>({wall:false})});assert(r.got<26,'got '+r.got+' (glide never unlocks)');console.log('      without wall:',r.got);
  const g=reach(LD,{cap:()=>({glide:false})});const far=g.L.echoes.filter(e=>e.x>9200&&e.y<700).map(e=>e.id);const got=g.order.map(o=>o.id);
  assert(!far.every(i=>got.includes(i)),'far steppe all reached without glide');console.log('      without glide:',g.got,'far reached',far.filter(i=>got.includes(i)).length,'/',far.length);});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
