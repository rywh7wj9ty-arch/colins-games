// node test/settings.js <chromium|webkit> [port]  -- settings persist & work, stats increment, stats screen, compass, no console errors
const {chromium,webkit}=require('playwright');
const eng=process.argv[2]||'chromium', URL='http://localhost:'+(process.argv[3]||8804)+'/index.html';
let pass=0,fail=0;function ok(c,m){if(c){pass++;console.log('  ok  ',m);}else{fail++;console.log('  FAIL',m);}}
async function launchEng(name){ if(name==='webkit') return webkit.launch(); try{ return await chromium.launch({channel:'chrome'}); }catch(e){ return chromium.launch(); } }
(async()=>{const b=await launchEng(eng);
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:eng==='chromium'});const p=await ctx.newPage();const errs=[];
 p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto(URL);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForFunction(()=>window.__ldBooted);await p.waitForTimeout(400);
 // title stats button opens stats without starting
 await p.tap('#titleStats');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>document.getElementById('statsOv').classList.contains('show')&&!LD.state.started),'title Journey stats opens without starting game');
 ok(await p.evaluate(()=>/0 of 46/.test(document.getElementById('statsBody').textContent)),'stats shows echo totals');
 await p.tap('#statsClose');await p.waitForTimeout(200);
 await p.tap('#title');await p.waitForTimeout(300);ok(await p.evaluate(()=>LD.state.started),'game starts');
 // stats increment
 const s0=await p.evaluate(()=>({...LD.stats}));
 await p.evaluate(()=>{LD.freezeTime(true);LD.setTime(0.3);LD.teleport(40,900)});await p.waitForTimeout(400);
 const jb=await p.evaluate(()=>{const r=document.getElementById('btnJump').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
 const fire=(t,id,x,y)=>p.evaluate(([t,id,x,y])=>document.getElementById('touch').dispatchEvent(new PointerEvent(t,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true})),[t,id,x,y]);
 await fire('pointerdown',11,80,640);await fire('pointermove',11,140,640);await p.waitForTimeout(300);
 await fire('pointerdown',12,jb.x,jb.y);await p.waitForTimeout(200);await fire('pointerup',12,jb.x,jb.y);await p.waitForTimeout(700);await fire('pointerup',11,140,640);
 await p.evaluate(()=>LD.teleport(40,3000));await p.waitForTimeout(2500); // fall -> respawn
 const s1=await p.evaluate(()=>({...LD.stats}));
 ok(s1.jumps>s0.jumps,`jumps increment (${s0.jumps}->${s1.jumps})`);ok(s1.dist>20,`distance increments (${s1.dist.toFixed(0)})`);
 ok(s1.play>1,`play time increments (${s1.play.toFixed(1)}s)`);ok(s1.falls>s0.falls,`falls increment (${s1.falls})`);ok(s1.first>0,'first-played date set');
 // settings: open pause by tapping pause button
 await p.tap('#pauseBtn');await p.waitForTimeout(300);ok(await p.evaluate(()=>LD.state.paused),'pause button opens menu by touch');
 const setR=(id,v)=>p.evaluate(([id,v])=>{const el=document.getElementById(id);el.value=v;el.dispatchEvent(new Event('input'));},[id,v]);
 await setR('bright',130);await setR('glowS',20);await setR('music',0);await setR('sfx',0);
 await p.tap('#tWind');await p.tap('#tHint');await p.waitForTimeout(400);
 const g=await p.evaluate(()=>({m:LD.gain('music'),s:LD.gain('sfx')}));ok(g.m===0&&g.s===0,`music/sfx 0 -> gain 0 (${g.m},${g.s})`);
 const st=await p.evaluate(()=>({...LD.settings}));ok(Math.abs(st.bright-1.3)<1e-6&&Math.abs(st.glow-0.2)<1e-6&&st.wind===false&&st.hint===false,'settings applied in memory');
 // brightness visibly changes the frame
 await p.tap('#resume');await p.waitForTimeout(300);
 const lum=()=>p.evaluate(()=>{const c=document.getElementById('game'),t=document.createElement('canvas');t.width=40;t.height=40;const g=t.getContext('2d');g.drawImage(c,0,0,40,40);const d=g.getImageData(0,0,40,40).data;let s=0;for(let i=0;i<d.length;i+=4)s+=d[i]+d[i+1]+d[i+2];return s/(d.length/4)/3;});
 await p.evaluate(()=>{LD.setTime(0.8);LD.teleport(700,860)});await p.waitForTimeout(800);const hi=await lum();
 await p.evaluate(()=>{LD.settings.bright=0.6});await p.waitForTimeout(300);const lo=await lum();ok(hi>lo+8,`brightness changes frame luminance (${hi.toFixed(0)} vs ${lo.toFixed(0)})`);
 // persistence
 await p.evaluate(()=>LD.saveStats());await p.reload();await p.waitForFunction(()=>window.__ldBooted);await p.waitForTimeout(300);
 const st2=await p.evaluate(()=>({...LD.settings}));ok(Math.abs(st2.bright-1.3)<1e-6&&Math.abs(st2.glow-0.2)<1e-6&&!st2.wind&&!st2.hint&&st2.music===0,'settings persist after reload');
 ok(await p.evaluate(()=>document.getElementById('bright').value==='130'),'slider UI restored');
 const s2=await p.evaluate(()=>({...LD.stats}));ok(s2.jumps===s1.jumps&&s2.falls>=s1.falls,'stats persist after reload');
 // stats screen from pause
 await p.tap('#title');await p.waitForTimeout(300);await p.tap('#pauseBtn');await p.waitForTimeout(300);await p.tap('#statsBtn');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>document.getElementById('statsOv').classList.contains('show')&&document.querySelectorAll('#statsBody .grid div').length===10),'stats screen from pause with 10 stat cards');
 await p.screenshot({path:`/tmp/ld-test/stats-${eng}.png`});await p.tap('#statsClose');
 await p.evaluate(()=>{for(const id of ['music','sfx']){const el=document.getElementById(id);el.value=70;el.dispatchEvent(new Event('input'));}});
 await p.screenshot({path:`/tmp/ld-test/menu-${eng}.png`,fullPage:false});
 // compass gating
 await p.evaluate(()=>{LD.settings.hint=true;LD.give(31)});ok(await p.evaluate(()=>!!LD.nearestEcho()),'nearest uncollected Echo found for compass');
 ok(errs.length===0,'no console errors '+JSON.stringify(errs.slice(0,3)));
 await b.close();console.log(`\n[${eng}] settings: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);})().catch(e=>{console.error(e);process.exit(2)});
