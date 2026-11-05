// node test/human-reach.js  -- route check with HUMAN margins: ~20% less jump height/run/dash distance,
// minimal coyote time, and double-jump/dash presses that must still work ~100ms early AND late.
const LD=require('./load-core.js')(); const C=LD.C;
const H={height:0.8,dist:0.8};
C.JUMP_V*=Math.sqrt(H.height); C.DJUMP_V*=Math.sqrt(H.height); C.WALLJ_VY*=Math.sqrt(H.height);
C.RUN*=H.dist; C.DASH_V*=H.dist; C.WALLJ_VX*=H.dist; C.COYOTE=0.02;
const reach=require('./reach.js');
const t0=Date.now(); const r=reach(LD,{jitter:12,log:true});
const L=r.L; const miss=L.echoes.filter(e=>!r.order.find(o=>o.id===e.id));
console.log('HUMAN route: got',r.got,'/',r.total,'endAt',r.endAt,'secs',((Date.now()-t0)/1000)|0);
miss.forEach(e=>console.log('  MISSING echo',e.id,'at',e.x,e.y,LD.BIOMES[LD.biomeAt(e.x)].name));
console.log('ORDER',JSON.stringify(r.order.map(o=>[o.id,o.count])));
module.exports=r; if(require.main===module) process.exit(r.got>=r.endAt&&!miss.length?0:1);
