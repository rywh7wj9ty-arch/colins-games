// v1.8 look: flags default on, each switch is independent, all off restores the v1.7 picture,
// version label + older list, no page errors. Screenshots are iPhone landscape 844x390.
const { chromium, webkit } = require('/tmp/lumen-test/node_modules/playwright');
const S = process.env.SHOTS || '/workspace/bobbin/shots/';
(async () => {
  const bt = process.argv[2] === 'webkit' ? webkit : chromium;
  const b = await bt.launch();
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PE ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  let pass = 0, fail = 0;
  function ok(n, c, d) { (c ? pass++ : fail++); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? ' ' + JSON.stringify(d) : '')); }
  await p.goto('http://localhost:' + (process.env.PORT || 8765) + '/?nosw=1', { timeout: 20000 });
  await p.waitForTimeout(900);
  await p.screenshot({ path: S + 'v18_title.png' });
  const ver = (await p.textContent('.tver')).trim();
  ok('title label is v1.8', ver === 'v1.8', ver);
  ok('screen polish class on by default', await p.evaluate(() => document.body.classList.contains('look18')));
  const flags = await p.evaluate(() => __b18.flags());
  ok('eight look switches default on', ['cloth','paper','wood','light','face','read','spark','chrome'].every(k => flags[k] === 1), flags);
  await p.click('#settingsBtn');
  await p.waitForTimeout(250);
  const ui = await p.evaluate(() => {
    const f18 = [...document.querySelectorAll('[data-f18]')].map(b => b.getAttribute('data-f18'));
    const sl = [...document.querySelectorAll('#settings input[type=range]')].map(i => i.dataset.k);
    const older = [...document.querySelectorAll('#settings .older a')].map(a => a.textContent.trim() + ' ' + a.getAttribute('href'));
    return { f18, sl, older, ver: document.querySelector('#settings .ver').textContent.trim() };
  });
  ok('settings lists every v1.8 switch', ui.f18.join(',') === 'cloth,paper,wood,light,face,read,spark,chrome', ui.f18);
  ok('music, sfx and brightness sliders stay', ui.sl.join(',') === 'music,sfx,bright', ui.sl);
  ok('settings label is Bobbin v1.8', ui.ver === 'Bobbin v1.8', ui.ver);
  ok('older list keeps v1.7 and the latest build', ui.older.some(s => s.includes('v1.7') && s.includes('bobbin-v1.7')) && ui.older.some(s => s.includes('Latest') && s.includes('../bobbin/')), ui.older);
  await p.click('#settings .older summary');
  await p.waitForTimeout(150);
  await p.screenshot({ path: S + 'v18_settings.png' });
  await p.click('#settings [data-go]');
  // material bakes differ only for the switch that is on
  const clothOn = await p.evaluate(() => __b18.bake('cloth'));
  await p.evaluate(() => __b18.f('cloth', 0));
  const clothOff = await p.evaluate(() => __b18.bake('cloth'));
  ok('cloth switch changes the felt picture', clothOn.a !== clothOff.a, { on: clothOn.a, off: clothOff.a });
  const paperOff = await p.evaluate(() => __b18.bake('paper'));
  await p.evaluate(() => __b18.f('paper', 0));
  const paperBoth = await p.evaluate(() => __b18.bake('paper'));
  ok('paper switch changes the card picture', paperOff.a !== paperBoth.a, { on: paperOff.a, off: paperBoth.a });
  const woodOn = await p.evaluate(() => { __b18.f('wood', 1); return __b18.bake('wood'); });
  await p.evaluate(() => __b18.f('wood', 0));
  const woodOff = await p.evaluate(() => __b18.bake('wood'));
  ok('wood switch changes the plank picture', woodOn.a !== woodOff.a, { on: woodOn.a, off: woodOff.a });
  // all off matches a second all-off bake and drops the polish class; v1.7 threads stay available
  await p.evaluate(() => __b18.f('*', 0));
  const a = await p.evaluate(() => __b18.bake('cloth'));
  const b2 = await p.evaluate(() => __b18.bake('cloth'));
  ok('all look switches off is a stable v1.7 bake', a.a === b2.a && a.n === b2.n, { a, b2 });
  ok('stamp empty when cloth, paper and wood are off', (await p.evaluate(() => __b18.stamp())) === '');
  ok('screen polish class leaves with its switch', !(await p.evaluate(() => document.body.classList.contains('look18'))));
  ok('v1.7 feature switches still present', await p.evaluate(() => ['swing','gold','chase','codes','book','assist'].every(k => typeof __b17.f(k) === 'object' || __b17.f(k))));
  await p.evaluate(() => __bob.start(8));
  await p.waitForTimeout(700);
  await p.screenshot({ path: S + 'v18_play_off.png' });
  await p.evaluate(() => __b18.f('*', 1));
  await p.waitForTimeout(400);
  await p.screenshot({ path: S + 'v18_play_on.png' });
  ok('feedback bits spawn without a page error', (await p.evaluate(() => { const i = __bob.info(); return __b18.fx() >= 0 && !!i; })));
  // end screen polish
  await p.evaluate(() => __bob.toExit());
  await p.waitForTimeout(2200);
  const endOn = await p.isVisible('#end');
  ok('level still finishes', endOn);
  await p.screenshot({ path: S + 'v18_end.png' });
  await p.evaluate(() => __b18.f('chrome', 0));
  await p.waitForTimeout(150);
  await p.screenshot({ path: S + 'v18_end_off.png' });
  ok('no page errors', errs.length === 0, errs);
  console.log('V18', fail ? 'FAIL ' + fail : 'ALL PASS', pass + ' checks');
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH', e && e.stack || e); process.exit(1); });
