// node playall.js <chromium|webkit> <on|off> [level,level...]
// Fixed-step playthrough. Prints one line per level: DONE or STUCK.
const { chromium, webkit } = require('/tmp/lumen-test/node_modules/playwright');
const path = require('path');
const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 101, 102, 103, 104, 105];
(async () => {
  const bn = process.argv[2] || 'chromium';
  const mode = process.argv[3] || 'on';
  const ids = process.argv[4] ? process.argv[4].split(',').map(Number) : ALL;
  const flags = mode === 'off' ? 0 : 1;
  const bt = bn === 'webkit' ? webkit : chromium;
  const b = await bt.launch();
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => { if (!/audio device/i.test(e.message)) errs.push('PE ' + e.message); });
  p.on('console', m => { if (m.type() === 'error' && !/audio device/i.test(m.text())) errs.push(m.text()); });
  await p.goto('http://localhost:' + (process.env.PORT || 8765) + '/bobbin/?nosw=1', { timeout: 20000 });
  await p.addScriptTag({ path: path.join(__dirname, 'solve.js') });
  await p.waitForTimeout(400);
  let pass = 0;
  for (const id of ids) {
    const t0 = Date.now();
    let res;
    try {
      res = await p.evaluate(({ id, flags }) => {
        __b19.f('*', flags);
        __b19.hold(1);
        __bob.start(id);
        const r = BOT.run();
        __b19.hold(0);
        return r;
      }, { id, flags });
    } catch (e) {
      res = { finished: false, err: String(e.message || e) };
    }
    const ok = !!(res && res.finished);
    if (ok) pass++;
    const tail = (res && res.log ? res.log.slice(-3).join(' | ') : '') + (res && res.err ? ' ' + res.err : '');
    console.log((ok ? 'DONE ' : 'STUCK') + ' ' + bn + ' ' + mode + ' L' + id +
      ' x=' + (res && res.x != null ? (+res.x).toFixed(1) : '?') +
      ' t=' + (res && res.t != null ? (+res.t).toFixed(1) : '?') +
      ' deaths=' + (res && res.deaths != null ? res.deaths : '?') +
      ' ' + (Date.now() - t0) + 'ms ' + tail);
  }
  console.log('SUMMARY', bn, mode, pass + '/' + ids.length, 'errs', errs.length ? errs.slice(0, 4) : 'none');
  await b.close();
  process.exit(pass === ids.length && !errs.length ? 0 : 1);
})().catch(e => { console.log('CRASH', e && e.stack || e); process.exit(1); });
