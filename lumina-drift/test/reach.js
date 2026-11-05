// Route checker: BFS over landing/cling states using the REAL physics step, with ability fixed-point.
module.exports=function(LD,opts){
  opts=opts||{};
  const L=LD.buildLevel(), C=LD.C;
  const prog=LD.newProgress();
  const order=[]; // echo ids in discovery order with ability set at that time
  let pass=0;
  while(true){
    pass++;
    const ab=opts.cap?Object.assign({},LD.abilitiesFor(prog.count),opts.cap(prog.count)):LD.abilitiesFor(prog.count);
    const env=LD.makeEnv(L,prog);
    const seen=new Set(); const queue=[]; const standDone=new Set();
    const before=prog.count;
    const newly=[];
    function push(kind,s,v,side){const k=kind+':'+s.id+':'+Math.round(v)+':'+(side||0);if(seen.has(k))return;seen.add(k);queue.push({kind,s,v,side});}
    function pushStand(s){ if(s.type==='x')return; for(let x=s.x-C.PW+3;x<=s.x+s.w-3;x+=30) push('s',s,x); push('s',s,s.x+s.w-3); push('s',s,s.x-C.PW+3);}
    // start
    const st=LD.newPlayer(L.start.x,900); 
    const standOn=s=>pushStand(s);
    // locate starting solid
    const s0=(L.solids.find(s=>s.x<=L.start.x&&s.x+s.w>=L.start.x&&s.y===900)); standDone.add(s0.id); pushStand(s0);

    function touch(p){
      for(const e of L.echoes){ if(Math.abs(e.x-p.x)>40||Math.abs(e.y-p.y)>40)continue; if(!prog.got[e.id]&&!newly.includes(e.id)&&LD.echoHit(p,e)) newly.push(e.id); }
      for(const r of L.runes){ if(!prog.runes[r.id]&&p.x<r.x+16&&p.x+C.PW>r.x-16&&p.y<r.y&&p.y+C.PH>r.y-40) {prog.runes['n'+r.id]=true;} }
    }
    function sim(p,plan,maxF){
      for(let f=0;f<maxF;f++){
        const inp=plan(f,p); LD.step(p,inp,ab,env,[],opts.stepOpt); touch(p);
        if(p.y>C.DEATH_Y) return null;
        if(f>3&&p.onGround&&p.standing) return {kind:'s',s:p.standing,v:p.x};
        if(f>3&&p.sliding&&p.vy>0){ // cling
          const q=env.grid.query(p.x-4,p.y,C.PW+8,C.PH,[]).find(s=>s.type==='w');
          if(q) return {kind:'w',s:q,v:p.y,side:p.wallDir,x:p.x};
        }
      }
      return null;
    }
    function plans(fromWall,wallDir){
      const out=[];
      const dirs=[-1,0,1];
      const seconds=[null];
      for(const t of [10,22,36,52,72]) seconds.push({dj:t});
      for(const t of [4,18,34,54]) seconds.push({dash:t});
      for(const t of [12,30,50]) seconds.push({dj:t,dash:t+14});
      for(const t of [6,24]) seconds.push({dash:t,dj:t+22});
      for(const t of [0,8]) { seconds.push({dash:t}); seconds.push({dash:t,dj:t+40}); }
      for(const d of dirs) for(const pre of (fromWall?[0]:[0,16])) for(const h of (fromWall?[1,14,999]:[0,10,24,999])) for(const sc of seconds){
        if(h===0&&sc&&sc.dj===10)continue;
        out.push({d,pre,h,sc});
      }
      return out;
    }
    function mk(a,fromWall){
      return function(f){
        const g=f-a.pre; const inp={x:(f<a.pre?a.d:a.d),jump:false,jumpP:false,dashP:false};
        if(g>=0&&a.h>0){ if(g===0) inp.jumpP=true; if(g<a.h) inp.jump=true; }
        if(a.sc){ if(a.sc.dj!==undefined){ if(g===a.sc.dj) {inp.jumpP=true;inp.jump=true;} if(g>a.sc.dj&&(a.h===999||g<a.sc.dj+20)) inp.jump=true; }
          if(a.sc.dash!==undefined&&g===a.sc.dash) inp.dashP=true; }
        if(a.h===999&&g>=0) inp.jump=true;
        return inp;
      };
    }
    const stdPlans=plans(false), wallPlans=plans(true);
    let sims=0;
    while(queue.length){
      const n=queue.shift();
      if(n.kind==='s'){ const key=n.s.id; if(!standDone.has(key)){standDone.add(key); pushStand(n.s);} }
      const list=n.kind==='s'?stdPlans:wallPlans;
      for(const a of list){
        const p=LD.newPlayer(0,0);
        if(n.kind==='s'){ p.x=n.v; p.y=n.s.y-C.PH; p.onGround=true; p.standing=n.s; }
        else { p.x=n.side>0? n.s.x-C.PW : n.s.x+n.s.w; p.y=n.v; p.vy=40; p.onGround=false; p.airT=0.3; p.jumps=1; p.canDash=true; }
        let d=a.d; if(n.kind==='w'){ /* d relative: -1 = away from wall */ d = a.d===0?0:(a.d<0?-n.side:n.side); }
        const p0=Object.assign({},p);
        let r=sim(p,mk(Object.assign({},a,{d}),n.kind==='w'),opts.maxF||560); sims++;
        if(!r) continue;
        if(opts.jitter&&a.sc){ // human timing: second press (double jump / dash) may be ~100ms early or late
          for(const off of [-opts.jitter,opts.jitter]){ const sc={}; for(const k in a.sc) sc[k]=Math.max(1,a.sc[k]+off);
            const q=Object.assign({},p0); const r2=sim(q,mk(Object.assign({},a,{d,sc}),n.kind==='w'),opts.maxF||560); sims++;
            if(!r2||r2.kind!==r.kind||r2.s.id!==r.s.id){ r=null; break; } } if(!r) continue; }
        if(r.kind==='s'){ if(r.s.type!=='x'&&!standDone.has(r.s.id)){standDone.add(r.s.id);pushStand(r.s);} }
        else push('w',r.s,Math.round(r.v/20)*20,r.side);
      }
    }
    // apply
    let litRunes=false;
    for(const k of Object.keys(prog.runes)) if(k[0]==='n'){ const id=+k.slice(1); delete prog.runes[k]; if(!prog.runes[id]){prog.runes[id]=true;litRunes=true;} }
    for(const id of newly){ LD.collect(L,prog,id); order.push({id,pass,count:prog.count,ab:Object.keys(ab).filter(k=>ab[k])}); }
    if(opts.log) console.log('pass',pass,'sims',sims,'nodes',seen.size,'echoes',prog.count,'/',L.total);
    if(prog.count===before&&!litRunes) break;
  }
  const missing=L.echoes.filter(e=>!prog.got[e.id]).map(e=>e.id+'@'+e.x+','+e.y);
  return {total:L.total,endAt:L.endAt,got:prog.count,missing,order,runes:Object.keys(prog.runes).length,L};
};
