// node test/e2e.js <chromium|webkit> [port]   (run from a dir whose node_modules has playwright)
const {chromium,webkit}=require('playwright');
const eng=process.argv[2]||'chromium', URL='http://localhost:'+(process.argv[3]||8801)+'/index.html';
const devices=[
 {name:'iphone-portrait',viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:eng==='chromium',hasTouch:true},
 {name:'iphone-landscape',viewport:{width:844,height:390},deviceScaleFactor:3,isMobile:eng==='chromium',hasTouch:true},
 {name:'ipad',viewport:{width:1180,height:820},deviceScaleFactor:2,isMobile:eng==='chromium',hasTouch:true},
 {name:'desktop',viewport:{width:1280,height:720},deviceScaleFactor:1,hasTouch:false}];
let pass=0,fail=0;const results=[];
function ok(c,msg){if(c){pass++;console.log('  ok  ',msg);}else{fail++;console.log('  FAIL',msg);}}
(async()=>{
 async function launchEng(name){ if(name==='webkit') return webkit.launch(); try{ return await chromium.launch({channel:'chrome'}); }catch(e){ return chromium.launch(); } }
 const browser=await launchEng(eng);
 for(const d of devices){
  console.log(`[${eng}] ${d.name}`);
  const ctx=await browser.newContext({viewport:d.viewport,deviceScaleFactor:d.deviceScaleFactor,isMobile:d.isMobile,hasTouch:d.hasTouch});
  const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto(URL); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForFunction(()=>window.__ldBooted,null,{timeout:10000});
  await p.waitForTimeout(600);
  const r=await p.evaluate(()=>{const c=document.getElementById('game').getBoundingClientRect();return {w:c.width,h:c.height,iw:innerWidth,ih:innerHeight};});
  ok(Math.abs(r.w-r.iw)<2&&Math.abs(r.h-r.ih)<2,`canvas fills viewport from bounding rect (${r.w}x${r.h})`);
  // start via tap/click on title (also unlocks audio)
  if(d.hasTouch) await p.tap('#title'); else await p.click('#title');
  await p.waitForTimeout(400);
  const st0=await p.evaluate(()=>LD.state); ok(st0.started,'title tap starts game');
  await p.evaluate(()=>{LD.freezeTime(true);LD.setTime(0.3);LD.teleport(40,900);});await p.waitForTimeout(500);
  if(d.hasTouch){
    const vis=await p.evaluate(()=>getComputedStyle(document.getElementById('touch')).display); ok(vis==='block','touch controls visible in touch mode');
    // multitouch: hold stick right (id 11) + press jump (id 12)
    const jb=await p.evaluate(()=>{const r=document.getElementById('btnJump').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
    const fire=(type,id,x,y)=>p.evaluate(([type,id,x,y])=>{document.getElementById('touch').dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true,isPrimary:id===11}));},[type,id,x,y]);
    const sx=d.viewport.width*0.18, sy=d.viewport.height*0.75;
    const x0=(await p.evaluate(()=>LD.state)).x;
    await fire('pointerdown',11,sx,sy); await fire('pointermove',11,sx+60,sy); await p.waitForTimeout(600);
    const mid=await p.evaluate(()=>LD.state); ok(mid.input.x>0.5&&mid.x>x0+20,`stick drives right (input ${mid.input.x.toFixed(2)}, moved ${(mid.x-x0).toFixed(0)}px)`);
    await p.evaluate(()=>{window.__jm=null;(function f(){const s=LD.state;if(s.vy<0&&!s.onGround){window.__jm=s;return;}requestAnimationFrame(f);})();});
    await fire('pointerdown',12,jb.x,jb.y); await p.waitForTimeout(500);
    const jm=await p.evaluate(()=>window.__jm||LD.state); ok(jm.vy<0&&!jm.onGround&&jm.input.x>0.5,`jump while holding stick (multitouch) vy=${jm.vy.toFixed(0)}`);
    await fire('pointerup',12,jb.x,jb.y); await p.waitForTimeout(500);
    // dash button after unlocking
    await p.evaluate(()=>{LD.give(10);LD.teleport(40,900);}); await p.waitForTimeout(300);
    const db=await p.evaluate(()=>{const r=document.getElementById('btnDash').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,o:getComputedStyle(document.getElementById('btnDash')).opacity};});
    ok(+db.o>0.5,'dash button appears once Dash is unlocked');
    await p.evaluate(()=>{window.__mvx=0;(function f(){window.__mvx=Math.max(window.__mvx,Math.abs(LD.state.vx));if(window.__mvx<400)requestAnimationFrame(f);})();});
    await fire('pointerdown',13,db.x,db.y); await p.waitForTimeout(400);
    const ds={vx:await p.evaluate(()=>window.__mvx)}; ok(Math.abs(ds.vx)>400,`dash via button while stick held (vx=${ds.vx.toFixed(0)})`);
    await fire('pointerup',13,db.x,db.y); await fire('pointerup',11,sx+60,sy); await p.waitForTimeout(300);
    const rel=await p.evaluate(()=>LD.state.input.x); ok(rel===0,'releasing stick stops input');
  } else {
    await p.keyboard.down('ArrowRight'); await p.waitForTimeout(300); await p.keyboard.press('Space'); await p.waitForTimeout(80);
    const ks=await p.evaluate(()=>LD.state); ok(ks.x>60&&ks.vy<0,`keyboard move + jump (x=${ks.x.toFixed(0)}, vy=${ks.vy.toFixed(0)})`);
    await p.keyboard.up('ArrowRight');
    const hid=await p.evaluate(()=>getComputedStyle(document.getElementById('touch')).display); ok(hid==='none','touch controls hidden with keyboard');
    await p.waitForTimeout(400); await p.keyboard.press('Escape'); ok(await p.evaluate(()=>LD.state.paused),'Esc pauses'); await p.keyboard.press('Escape');
  }
  // echo collection + persistence
  await p.evaluate(()=>{localStorage.clear();});
  const before=await p.evaluate(()=>LD.state.count);
  await p.evaluate(()=>{const e=LD.level.echoes.find(e=>!LD.isGot(e.id)&&e.y>700&&e.x<2400);LD.teleport(e.x-9,e.y+20);}); await p.waitForTimeout(500);
  const after=await p.evaluate(()=>LD.state.count); ok(after===before+1,`Echo collects (${before}->${after})`);
  if(d.name==='iphone-portrait'||d.name==='desktop') await p.screenshot({path:`/tmp/ld-test/e2e-${eng}-${d.name}-collect.png`});
  await p.reload(); await p.waitForFunction(()=>window.__ldBooted); await p.waitForTimeout(300);
  ok((await p.evaluate(()=>LD.state.count))===after,'save persists after reload');
  // audio sliders to 0 give exactly 0 gain
  if(d.hasTouch) await p.tap('#title'); else await p.click('#title');
  await p.waitForTimeout(300);
  await p.evaluate(()=>LD.pause(true)); await p.waitForTimeout(200);
  const menuVis=await p.evaluate(()=>getComputedStyle(document.getElementById('menu')).display); ok(menuVis==='flex','pause menu opens');
  await p.evaluate(()=>{for(const id of ['music','sfx']){const el=document.getElementById(id);el.value=0;el.dispatchEvent(new Event('input'));}});
  await p.waitForTimeout(400);
  const g=await p.evaluate(()=>({m:LD.gain('music'),s:LD.gain('sfx'),ctx:!!LD.audio.ctx}));
  ok(g.m===0&&g.s===0,`music/sfx sliders at 0 -> gain exactly 0 (music ${g.m}, sfx ${g.s}, audioCtx ${g.ctx})`);
  if(d.name==='ipad') await p.screenshot({path:`/tmp/ld-test/e2e-${eng}-ipad-menu.png`});
  await p.evaluate(()=>{for(const id of ['music','sfx']){const el=document.getElementById(id);el.value=70;el.dispatchEvent(new Event('input'));}});
  await p.click('#resume'); await p.waitForTimeout(200);
  // fps sample
  await p.evaluate(()=>{LD.teleport(1200,780);}); await p.waitForTimeout(3200);
  const fps=await p.evaluate(()=>LD.state.fpsHist.slice(-3)); const avg=fps.reduce((a,b)=>a+b,0)/fps.length;
  console.log(`  info  fps ~${avg.toFixed(1)} (quality ${await p.evaluate(()=>LD.state.quality)}, render ${await p.evaluate(()=>LD.state.W+'x'+LD.state.H)})`);
  results.push({dev:d.name,fps:+avg.toFixed(1)});
  await p.screenshot({path:`/tmp/ld-test/e2e-${eng}-${d.name}.png`});
  ok(errs.length===0,'no console errors '+(errs.length?JSON.stringify(errs.slice(0,3)):''));
  await ctx.close();
 }
 // offline after first load (chromium; WebKit's offline mode crashes on this box)
 if(eng==='chromium'){
  const ctx=await browser.newContext({viewport:{width:844,height:390}});const p=await ctx.newPage();
  await p.goto(URL); await p.waitForFunction(()=>navigator.serviceWorker&&navigator.serviceWorker.controller||false,null,{timeout:10000}).catch(()=>{});
  await p.reload(); await p.waitForTimeout(1000);
  const ctrl=await p.evaluate(()=>!!navigator.serviceWorker.controller);
  await ctx.setOffline(true); let booted=false;
  try{await p.reload();await p.waitForFunction(()=>window.__ldBooted,null,{timeout:8000});booted=true;}catch(e){}
  ok(ctrl&&booted,'works offline after first load (service worker)');
  const caches=await p.evaluate(()=>caches.keys()); console.log('  info  caches',caches);
  await ctx.close();
 }
 await browser.close();
 console.log(`\n[${eng}] ${pass} passed, ${fail} failed`, JSON.stringify(results)); process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
