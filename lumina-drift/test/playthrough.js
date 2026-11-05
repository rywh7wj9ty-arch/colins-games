// node test/playthrough.js <chromium|webkit> [port] -- drives the REAL game with touch (iPhone portrait) through each tall wall / gate
const {chromium,webkit}=require('playwright');
const eng=process.argv[2]||'webkit', URL='http://localhost:'+(process.argv[3]||8804)+'/index.html';
let pass=0,fail=0;function ok(c,m){if(c){pass++;console.log('  ok  ',m);}else{fail++;console.log('  FAIL',m);}}
async function launchEng(name){ if(name==='webkit') return webkit.launch(); try{ return await chromium.launch({channel:'chrome'}); }catch(e){ return chromium.launch(); } }
(async()=>{const b=await launchEng(eng);
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:eng==='chromium'});const p=await ctx.newPage();const errs=[];
 p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto(URL);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForFunction(()=>window.__ldBooted);await p.waitForTimeout(400);
 await p.tap('#title');await p.waitForTimeout(400);await p.evaluate(()=>{LD.freezeTime(true);LD.setTime(0.3);LD.setQuality('low')});
 const btn=id=>p.evaluate(id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};},id);
 const J=await btn('btnJump');
 const fire=(t,id,x,y)=>p.evaluate(([t,id,x,y])=>document.getElementById('touch').dispatchEvent(new PointerEvent(t,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true})),[t,id,x,y]);
 const SX=80,SY=650; let stick=0;
 const hold=async dir=>{ if(stick){await fire('pointerup',11,SX,SY);stick=0;} if(dir){await fire('pointerdown',11,SX,SY);await fire('pointermove',11,SX+dir*60,SY);stick=1;} };
 const press=async(id,ms)=>{const B=id==='J'?J:await btn('btnDash');const pid=id==='J'?12:13;await fire('pointerdown',pid,B.x,B.y);await p.waitForTimeout(ms);await fire('pointerup',pid,B.x,B.y);};
 const st=()=>p.evaluate(()=>LD.state);
 const settle=async()=>{await hold(0);for(let i=0;i<30;i++){const s=await st();if(s.onGround)return s;await p.waitForTimeout(100);}return st();};
 const at=async(n,x,y)=>{await hold(0);await p.evaluate(([n,x,y])=>{const c=LD.state.count;if(n>c)LD.give(n);LD.teleport(x,y)},[n,x,y]);await p.waitForTimeout(500);return settle();};

 // the box's software renderer runs slowly, so every step waits on GAME state (never wall-clock timing)
 const until=async(fn,arg,ms)=>{const t=Date.now();while(Date.now()-t<(ms||30000)){if(await p.evaluate(fn,arg))return true;await p.waitForTimeout(30);}return false;};
 const jdown=async()=>fire('pointerdown',12,J.x,J.y), jup=async()=>fire('pointerup',12,J.x,J.y);
 const feet=async()=>{const s=await st();return s.y+22;};
 // 1. Lanternwood high branch (lowered 40px): standing below-right, double jump up-left onto it
 await at(4,1415,780); await hold(-1); await jdown(); await until(()=>!LD.state.onGround); await until(()=>LD.state.vy>-150); await jup(); await jdown(); await until(()=>LD.state.vy>0||LD.state.onGround); await until(()=>LD.state.onGround); await jup(); await hold(0); let s=await settle();
 ok(Math.abs(s.y+22-640)<2,`Lanternwood: double jump onto the high branch (feet y=${(s.y+22).toFixed(0)})`);
 // late double jump (~100ms after apex) still makes it
 await at(4,1370,780); await hold(-1); await jdown(); await until(()=>!LD.state.onGround); await until(()=>LD.state.vy>120); await jup(); await jdown(); await until(()=>LD.state.onGround); await jup(); await hold(0); s=await settle();
 ok(Math.abs(s.y+22-640)<2,`Lanternwood: late double jump still lands on the branch (feet y=${(s.y+22).toFixed(0)})`);
 // 2. Crystal tunnel (Colin's spot, 20 Echoes): run under the arch, dash across the gap
 const D=await btn('btnDash');
 for(const [label,trig] of [['hop at the edge, dash at the top of the hop',4923],['hop a little early, dash',4914],['hop slightly late (coyote), dash',4926]]){
  await at(20,4640,770); await hold(1); await until(t=>LD.state.x>t,trig); await jdown(); await until(()=>!LD.state.onGround,null,3000); const jx=(await st()).x; await until(x=>LD.state.x>x+20,jx,3000); /* dash ~100ms after the hop, game time */ await fire('pointerdown',13,D.x,D.y); await until(()=>Math.abs(LD.state.vx)>400,null,3000); await fire('pointerup',13,D.x,D.y); await jup();
  await until(()=>LD.state.onGround&&LD.state.x>5060||LD.state.y>1000,null,15000); await hold(0); s=await st();
  ok(s.x>5060&&Math.abs(s.y+22-770)<2,`Crystal tunnel: ${label} crosses to Stormbreak (x=${s.x.toFixed(0)}, feet ${(s.y+22).toFixed(0)})`); }
 // without Dash: gate intact, and the hint stone says what's needed
 await p.evaluate(()=>{localStorage.clear()}); await p.reload(); await p.waitForFunction(()=>window.__ldBooted); await p.tap('#title'); await p.waitForTimeout(300); await p.evaluate(()=>{LD.freezeTime(true);LD.setTime(0.3);LD.setQuality('low')});
 await at(8,4100,775); await p.waitForTimeout(2500); await at(8,4640,770); await until(()=>/Echo/.test(document.getElementById('toast').textContent),null,5000);
 const toast=await p.evaluate(()=>document.getElementById('toast').textContent);
 ok(/more Echo/.test(toast)&&/Dash/.test(toast),`hint stone explains the Dash gate: "${toast.trim()}"`);
 await hold(1); await until(()=>LD.state.x>4920); await jdown(); await until(()=>LD.state.y>1000||LD.state.onGround&&LD.state.x>5060,null,8000); await jup(); s=await st();
 ok(!(s.x>5060&&s.y<760),'gate intact: running jump without Dash cannot cross');
 // 3. assist: struggling in the tunnel with Dash for ~20s game time -> helping ledge
 await at(10,4700,770); await until(()=>!!LD.prog.assist[0],null,90000);
 ok(await p.evaluate(()=>!!LD.prog.assist[0]),'assist: helping ledge appears after ~20s stuck');
 await p.evaluate(()=>{LD.settings.assist=false});
 // 4. Stormbreak moss shaft with Wall Leap: alternate wall jumps up the chimney
 await at(20,5800,740); let dir=1, best=1e9;
 for(let i=0;i<16;i++){ await hold(dir); await jdown(); await until(()=>!LD.player().sliding,null,5000); await until(()=>{const q=LD.player();return q.sliding||q.onGround&&q.y<300;},null,30000); await jup();
   best=Math.min(best,await feet()); if(best<=300) break; dir=-dir; }
 ok(best<=320,`Stormbreak shaft: wall-leaps climb the moss walls (highest feet y=${best.toFixed(0)}, top 300)`);
 await at(26,7120,420); dir=1; best=1e9;
 for(let i=0;i<16;i++){ await hold(dir); await jdown(); await until(()=>!LD.player().sliding,null,5000); await until(()=>{const q=LD.player();return q.sliding||q.onGround&&q.y<120;},null,30000); await jup();
   best=Math.min(best,await feet()); if(best<=120) break; dir=-dir; }
 ok(best<=140,`Stormbreak upper chimney: wall-leaps reach the top (highest feet y=${best.toFixed(0)}, top 120)`);
 ok(errs.length===0,'no console errors '+JSON.stringify(errs.slice(0,3)));
 await b.close();console.log(`\n[${eng}] playthrough: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);})().catch(e=>{console.error(e);process.exit(2)});
