// v1.9 play: each switch defaults on, each one changes only its own behaviour,
// and every switch off matches a second all-off run (the v1.8 path).
// iPhone landscape 844x390. Serves the repo root: /bobbin/ and /bobbin-v1.8/.
const { chromium, webkit } = require('/tmp/lumen-test/node_modules/playwright');
const S = process.env.SHOTS || '/tmp/bobbin-shots/';
const PORT = process.env.PORT || 8765;
const fs = require('fs');
try { fs.mkdirSync(S, { recursive: true }); } catch (e) {}
(async () => {
  const bt = process.argv[2] === 'webkit' ? webkit : chromium;
  const b = await bt.launch();
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PE ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  let pass = 0, fail = 0;
  function ok(n, c, d) { (c ? pass++ : fail++); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? ' ' + JSON.stringify(d) : '')); }
  const root = 'http://localhost:' + PORT;
  await p.goto(root + '/bobbin/?nosw=1', { timeout: 20000 });
  await p.waitForTimeout(700);
  await p.screenshot({ path: S + 'v19_title.png' });
  const ver = (await p.textContent('.tver')).trim();
  ok('title label is v1.9', ver === 'v1.9', ver);
  const flags = await p.evaluate(() => __b19.flags());
  const names = ['coyote','hop','steer','zip','snap','fair','ledge','ribbon','pace','coach'];
  ok('ten play switches default on', names.every(k => flags[k] === 1), flags);
  await p.click('#settingsBtn');
  await p.waitForTimeout(200);
  const ui = await p.evaluate(() => {
    const f19 = [...document.querySelectorAll('[data-f19]')].map(b => b.getAttribute('data-f19'));
    const f18 = [...document.querySelectorAll('[data-f18]')].map(b => b.getAttribute('data-f18'));
    const sl = [...document.querySelectorAll('#settings input[type=range]')].map(i => i.dataset.k);
    const older = [...document.querySelectorAll('#settings .older a')].map(a => a.textContent.trim() + ' ' + a.getAttribute('href'));
    return { f19, f18, sl, older, ver: document.querySelector('#settings .ver').textContent.trim() };
  });
  ok('settings lists every v1.9 switch', ui.f19.join(',') === names.join(','), ui.f19);
  ok('v1.8 look switches still listed', ui.f18.join(',') === 'cloth,paper,wood,light,face,read,spark,chrome', ui.f18);
  ok('music, sfx and brightness sliders stay', ui.sl.join(',') === 'music,sfx,bright', ui.sl);
  ok('settings label is Bobbin v1.9', ui.ver === 'Bobbin v1.9', ui.ver);
  ok('older list links the frozen v1.8', ui.older.some(s => s.includes('v1.8') && s.includes('../bobbin-v1.8/')), ui.older);
  await p.click('#settings .older summary');
  await p.waitForTimeout(150);
  await p.screenshot({ path: S + 'v19_settings.png' });
  await p.click('#settings [data-go]');

  // wardrobe hat count (catalogue is 15; older suites that expected 11 are stale)
  await p.click('#costumeBtn');
  await p.waitForTimeout(200);
  await p.click('#wardTabs [data-tab=hat]');
  await p.waitForTimeout(200);
  const hats = await p.evaluate(() => document.querySelectorAll('#wardItems .wItem').length);
  ok('wardrobe lists 15 hats plus None', hats === 16, hats);
  await p.click('#costume [data-go]');

  // creator: live share codes are BB2-, the old encoder still emits BBX1-
  const codes = await p.evaluate(() => { __bob.cr.open(); const cur = __bob.cr.CR.cur; return { bb2: __b17.enc2(cur).slice(0, 4), bbx: __bob.cr.enc(cur).slice(0, 5) }; });
  ok('creator share code starts with BB2-', codes.bb2 === 'BB2-', codes);
  ok('legacy encoder still starts with BBX1-', codes.bbx === 'BBX1-', codes);
  await p.evaluate(() => { const back = document.getElementById('edBack'); if (back) back.click(); });
  await p.waitForTimeout(200);

  // a v1.8-shaped save (no f19 key) still loads and keeps its best level
  const oldSave = JSON.stringify({
    costume: 2, music: 0.4, sfx: 0.5, bright: 0.9,
    best: { 1: { time: 40, prizes: 3, total: 12, done: true } },
    stats: { play: 12, jumps: 4, prizes: 3, grabs: 1, boings: 0, levers: 0, switches: 0, respawns: 0, finishes: 1, dist: 8 },
    f17: { swing: 1, gold: 1, chase: 1, codes: 1, book: 1, assist: 1 },
    f18: { cloth: 1, paper: 1, wood: 1, light: 1, face: 1, read: 1, spark: 1, chrome: 1 }
  });
  await p.addInitScript(s => { localStorage.setItem('bobbin-save-v1', s); }, oldSave);
  await p.goto(root + '/bobbin/?nosw=1', { timeout: 20000 });
  await p.waitForTimeout(500);
  const migrated = await p.evaluate(() => { const s = __bob.save(); return { done: s.best[1] && s.best[1].done, music: s.music, f19: __b19.flags(), costume: s.costume }; });
  ok('v1.8 save keeps its cleared level', migrated.done === true && migrated.music === 0.4 && migrated.costume === 2, migrated);
  ok('missing f19 keys default on', names.every(k => migrated.f19[k] === 1), migrated.f19);

  // coyote / buffer / hop / steer, switches on vs off
  async function feel(flag) {
    return p.evaluate(async (flag) => {
      __b19.f('*', flag ? 1 : 0);
      __bob.start(1);
      __b19.lives(9);
      __b19.drive({ x: 0 });
      __b19.tick(30);
      const coy = __b19.coyote();
      __bob.warp(8, -8);
      __b19.drive({ x: 0 });
      __b19.tick(40);
      __b19.drive({ tap: true });
      __b19.tick(1);
      const buf = __b19.buffer();
      __bob.warp(6, -0.5);
      __b19.drive({ x: 0 });
      __b19.tick(40);
      __b19.drive({ x: 0, jump: true, tap: true });
      __b19.tick(8);
      __b19.drive({ x: 0, jump: false });
      let apex = 99;
      for (let i = 0; i < 80; i++) { const info = __b19.tick(1); if (info.y < apex) apex = info.y; }
      __bob.warp(12, -4);
      __b19.drive({ x: 1 });
      let vx = 0;
      for (let i = 0; i < 12; i++) vx = __b19.tick(1).vx;
      return { coy, buf: +buf.toFixed(3), apex: +apex.toFixed(2), vx: +vx.toFixed(2) };
    }, flag);
  }
  const on = await feel(true);
  const off = await feel(false);
  ok('coyote is longer with its switch on', on.coy >= 0.15 && off.coy <= 0.11, { on: on.coy, off: off.coy });
  ok('jump buffer is longer with its switch on', on.buf >= 0.18 && off.buf <= 0.14 && off.buf > 0.05, { on: on.buf, off: off.buf });
  ok('a released hop hangs higher with softer hops on', on.apex < off.apex - 0.15, { on: on.apex, off: off.apex });
  ok('air steering reaches speed sooner', on.vx > off.vx + 0.25, { on: on.vx, off: off.vx });

  // one jump does not become two
  const dub = await p.evaluate(() => {
    __b19.f('*', 1);
    __bob.start(1); __b19.drive({ x: 0 }); __b19.tick(20);
    __b19.drive({ jump: true, tap: true }); __b19.tick(2);
    __b19.drive({ x: 0, jump: false });
    let ups = 0, prev = 0;
    for (let i = 0; i < 90; i++) { const info = __b19.tick(1); if (info.vy < -4 && prev >= -1) ups++; prev = info.vy; }
    return ups;
  });
  ok('forgiving jumps do not add a second hop', dub === 1, dub);

  // a boing launch must not be rewritten as an ordinary hop
  const boing = await p.evaluate(() => {
    __b19.f('*', 1); __b19.hold(1); __bob.start(3); __b19.lives(9);
    const pad = (__bob.route() || []).find(s => s.t === 'boingwall');
    __bob.warp(pad.pad - 1.1, -0.6);
    __b19.drive({ x: 0 }); __b19.tick(12);
    __b19.drive({ x: 1, jump: true });
    let min = 0;
    for (let i = 0; i < 40; i++) { const q = __b19.tick(1); if (q.vy < min) min = q.vy; }
    __b19.hold(0);
    return +min.toFixed(2);
  });
  ok('coyote time does not cancel a boing launch', boing < -16, boing);

  // snap: respawn grace
  const grace = await p.evaluate(() => {
    __bob.start(1);
    __b19.f('snap', 1);
    __b19.drive({ x: 1, jump: true });
    __bob.cpRespawn();
    const on = __b19.grace();
    __b19.f('snap', 0);
    __bob.cpRespawn();
    const off = __b19.grace();
    __b19.f('snap', 1);
    return { on, off };
  });
  ok('quicker get-ups shorten the respawn grace', grace.on <= 0.45 && grace.off >= 0.9, grace);

  // fair: more checkpoints and easier timers, off matches the frozen build's posts
  const fair = await p.evaluate(() => {
    __b19.f('fair', 0); __bob.start(6);
    const offC = __b19.cps().length, offT = __b19.timers().slice();
    __b19.f('fair', 1); __bob.start(6);
    const onC = __b19.cps().length, onT = __b19.timers().slice();
    __b19.f('fair', 1); __bob.start(9);
    const wOn = __b19.waits().slice();
    __b19.f('fair', 0); __bob.start(9);
    const wOff = __b19.waits().slice();
    return { offC, onC, offT, onT, wOn, wOff };
  });
  ok('fairer courses add checkpoints on a long level', fair.onC > fair.offC, { on: fair.onC, off: fair.offC });
  ok('fairer courses ease timer buttons', fair.onT.length && fair.onT.every((s, i) => s > fair.offT[i]), fair);
  ok('fairer courses ease the sharpest pistons', fair.wOff.some(w => w < 0.9) && fair.wOn.every(w => w >= 0.95), fair);

  const p2 = await ctx.newPage();
  p2.on('pageerror', e => errs.push('v18 PE ' + e.message));
  await p2.goto(root + '/bobbin-v1.8/?nosw=1', { timeout: 20000 });
  await p2.waitForTimeout(500);
  const frozenVer = (await p2.textContent('.tver')).trim();
  ok('frozen copy is still labelled v1.8', frozenVer === 'v1.8', frozenVer);
  const cacheName = await p2.evaluate(() => fetch('sw.js').then(r => r.text()).then(t => (t.match(/var P="([^"]+)",V=P\+"(\d+)"/) || []).slice(1).join('')));
  ok('frozen cache prefix is bobbin-v1.8-', cacheName.indexOf('bobbin-v1.8-') === 0, cacheName);
  const parity = await p.evaluate(() => { __b19.f('*', 0); const o = {}; for (let id = 1; id <= 20; id++) { const a = __bob.cpAudit(id); o[id] = a.cps.map(c => [+c[0].toFixed(2), +c[1].toFixed(2)]); } return o; });
  const parity8 = await p2.evaluate(() => { const o = {}; for (let id = 1; id <= 20; id++) { const a = __bob.cpAudit(id); o[id] = a.cps.map(c => [+c[0].toFixed(2), +c[1].toFixed(2)]); } return o; });
  let cpMismatch = null;
  for (let id = 1; id <= 20; id++) if (JSON.stringify(parity[id]) !== JSON.stringify(parity8[id])) { cpMismatch = id; break; }
  ok('checkpoints match v1.8 when every v1.9 switch is off', !cpMismatch, cpMismatch ? { id: cpMismatch, v19: parity[cpMismatch], v18: parity8[cpMismatch] } : '1-20');
  await p2.close();

  // ledge mercy on level 1's first pit (x=17..20)
  const ledge = await p.evaluate(() => {
    function drop(on) {
      __b19.f('*', 0); __b19.f('ledge', on ? 1 : 0);
      __bob.start(1); __b19.lives(3);
      const before = __b19.b19().mercies;
      __b19.drive({ x: 0 });
      __b19.tick(20);
      __bob.warp(16.55, -0.5);
      __b19.tick(20);
      __bob.warp(17.25, -0.2);
      __b19.drive({ x: 0 });
      let lives = 3;
      for (let i = 0; i < 90; i++) { const info = __b19.tick(1); lives = info.lives; if (info.y > 2) break; }
      return { lives, y: +__bob.info().y.toFixed(2), mercies: __b19.b19().mercies - before };
    }
    const a = drop(true), b = drop(false);
    return { on: a, off: b };
  });
  ok('ledge mercy saves a slow toe over the lip', ledge.on.lives === 3 && ledge.on.mercies >= 1 && ledge.on.y < 1, ledge);
  ok('the same toe is a fall with ledge mercy off', ledge.off.lives < 3, ledge.off);

  // ribbons
  const rib = await p.evaluate(() => {
    __b19.f('*', 1);
    const w0 = __b19.wallet();
    __bob.start(1); __b19.lives(9);
    const prizes = __bob.info().prizes.slice(0, 3);
    prizes.forEach((q, i) => { __bob.warp(q[0], q[1]); __b19.tick(3); });
    const r = __b19.rib();
    return { n: r.n, bonus: r.bonus, gained: __b19.wallet() - w0 };
  });
  ok('three quick bubbles make a ribbon and a bonus', rib.n >= 3 && rib.bonus >= 1 && rib.gained >= 1, rib);

  // boss tempo
  const pace = await p.evaluate(() => {
    __b19.f('pace', 0); __bob.start(101); __b19.tick(5); const off = __b19.bossP();
    __b19.f('pace', 1); __bob.start(101); __b19.tick(5); const on = __b19.bossP();
    __b19.f('pace', 0); __bob.start(102); __b19.tick(5); const sewOff = __b19.bossP();
    __b19.f('pace', 1); __bob.start(102); __b19.tick(5); const sewOn = __b19.bossP();
    return { off, on, sewOff, sewOn };
  });
  ok('boss tempo shortens the wait between chances', pace.on.every < pace.off.every && pace.sewOn.sew < pace.sewOff.sew && pace.sewOn.tired > pace.sewOff.tired, pace);

  // coach goal line
  const goal = await p.evaluate(() => {
    __b19.f('coach', 1); __bob.start(1); __b19.tick(5); const on = __b19.goal();
    __b19.f('coach', 0); __b19.tick(2); const off = __b19.goal();
    return { on, off };
  });
  ok('quiet coach shows the exit distance', goal.on && !goal.on.hidden && /Exit/.test(goal.on.text), goal);
  ok('quiet coach hides when its switch is off', goal.off && goal.off.hidden, goal);

  // zip magnet on level 5
  const zip = await p.evaluate(() => {
    function grab(on) {
      __b19.f('*', 0); __b19.f('zip', on ? 1 : 0);
      __bob.start(5); __b19.lives(9); __b19.tick(5);
      const z = __b19.zips()[0];
      __bob.warp(z.x + 1.5, z.y + 0.55);
      __b19.drive({ x: 0, grab: true });
      let mode = null, d0 = null;
      for (let i = 0; i < 20; i++) { const info = __b19.tick(1); mode = info.grab; if (i === 0) d0 = +Math.hypot(info.x - z.x, info.y - (z.y + 0.55)).toFixed(2); if (mode === 'hang') break; }
      return { mode, d0, catches: __b19.b19().zips };
    }
    return { on: grab(true), off: grab(false) };
  });
  ok('zip magnet catches a carriage the hands miss', zip.on.mode === 'hang' && zip.off.mode !== 'hang', zip);

  // all off is stable, and a scripted second matches the first
  const stable = await p.evaluate(() => {
    function trace() {
      __b19.f('*', 0); __bob.start(1); __b19.drive({ x: 1 });
      const xs = [];
      for (let i = 0; i < 8; i++) { __b19.drive({ x: 1, jump: i === 3, tap: i === 3 }); xs.push(+__b19.tick(15).x.toFixed(3)); }
      return xs;
    }
    const a = trace(), b = trace();
    return { a, b, same: a.join() === b.join() };
  });
  ok('all play switches off is a stable v1.8 trace', stable.same, stable);

  await p.evaluate(() => __b19.f('*', 1));
  await p.evaluate(() => __bob.start(3));
  await p.waitForTimeout(400);
  await p.screenshot({ path: S + 'v19_play.png' });
  ok('no page errors', errs.length === 0, errs);
  console.log('V19', fail ? 'FAIL ' + fail : 'ALL PASS', pass + ' checks');
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH', e && e.stack || e); process.exit(1); });
