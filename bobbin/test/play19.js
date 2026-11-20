// Automated playthrough of all 20 levels and 5 bosses, switches on then off.
// A level counts as finished when Bobbin reaches the exit. iPhone-landscape WebKit or Chromium.
const { chromium, webkit } = require('/tmp/lumen-test/node_modules/playwright');
const PORT = process.env.PORT || 8765;
const IDS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,101,102,103,104,105];
(async () => {
  const bt = process.argv[2] === 'webkit' ? webkit : chromium;
  const b = await bt.launch();
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:' + PORT + '/bobbin/?nosw=1', { timeout: 20000 });
  await p.addScriptTag({ path: __dirname + '/bot.js' });
  await p.waitForTimeout(200);
  const summary = [];
  for (const flags of [1, 0]) {
    for (const id of IDS) {
      const t0 = Date.now();
      const r = await p.evaluate(({ id, flags }) => { window.__playFlags = flags; return __play19.play(id); }, { id, flags });
      r.flags = flags ? 'on' : 'off';
      r.wall = Date.now() - t0;
      summary.push(r);
      console.log((r.ok ? 'DONE ' : 'STUCK') + ' ' + r.flags + ' ' + id + ' x=' + r.x + ' t=' + r.t + ' deaths=' + r.deaths + ' ' + (r.note || r.reason || '') + ' ' + r.wall + 'ms');
    }
  }
  const doneOn = summary.filter(r => r.flags === 'on' && r.ok).map(r => r.id);
  const doneOff = summary.filter(r => r.flags === 'off' && r.ok).map(r => r.id);
  console.log('ON ', doneOn.length + '/' + IDS.length, doneOn.join(','));
  console.log('OFF', doneOff.length + '/' + IDS.length, doneOff.join(','));
  console.log('page errors', errs.length ? errs : 'none');
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.log('CRASH', e && e.stack || e); process.exit(1); });
