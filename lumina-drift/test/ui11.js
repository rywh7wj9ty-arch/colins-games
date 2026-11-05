// node test/ui11.js [port] — iPhone landscape UI: version, switches, safe layout, screenshots.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const URL = 'http://localhost:' + (process.argv[2] || '8807') + '/index.html';
const OUT = process.env.LD_SHOTS || '/tmp/ld-shots';
fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ok  ', m); } else { fail++; console.log('  FAIL', m); } }
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => window.__ldBooted);
  await p.waitForTimeout(500);
  const title = await p.evaluate(() => {
    const lab = document.querySelector('.vlabel');
    const link = document.querySelector('#title .older a');
    const r = lab.getBoundingClientRect();
    const lr = link.getBoundingClientRect();
    return {
      text: lab.textContent, href: link.getAttribute('href'), linkText: link.textContent,
      labIn: r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1 && r.width > 40,
      linkIn: lr.top >= -1 && lr.bottom <= innerHeight + 1 && lr.left >= 0 && lr.right <= innerWidth,
      overflow: document.documentElement.scrollWidth > innerWidth + 2
    };
  });
  ok(/v1\.1/.test(title.text), 'visible v1.1 label: ' + title.text);
  ok(title.href === '../lumina-drift-v1.0/' && /v1\.0/.test(title.linkText), 'older versions link ' + title.href);
  ok(title.labIn && title.linkIn, 'label and older link sit inside the landscape viewport');
  ok(!title.overflow, 'title does not overflow horizontally');
  await p.screenshot({ path: path.join(OUT, 'iphone-ls-title.png') });
  await p.tap('#title');
  await p.waitForTimeout(400);
  await p.evaluate(() => { LD.freezeTime(true); LD.setTime(0.22); LD.setQuality('high'); LD.teleport(420, 900); document.getElementById('toast').classList.remove('show'); });
  await p.waitForTimeout(500);
  const hud = await p.evaluate(() => {
    const ids = ['hud', 'pauseBtn', 'btnJump', 'btnDash', 'track'];
    const box = id => { const r = document.getElementById(id).getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, w: r.width, h: r.height }; };
    const b = {}; ids.forEach(id => b[id] = box(id));
    const trackOn = document.getElementById('track').classList.contains('on');
    return { b, trackOn, stage: document.body.classList.contains('feat-stage'), progress: document.body.classList.contains('feat-progress'), ver: LD.version };
  });
  ok(hud.ver === '1.1' && hud.stage && hud.progress && hud.trackOn, 'v1.1 stage + ability guide on by default');
  function inside(r) { return r.top >= -2 && r.left >= -2 && r.right <= 846 && r.bottom <= 392 && r.w > 8 && r.h > 8; }
  ok(inside(hud.b.hud) && inside(hud.b.pauseBtn) && inside(hud.b.btnJump), 'HUD, pause and jump sit in the landscape screen');
  ok(hud.b.pauseBtn.left > hud.b.hud.right - 8, 'pause button does not cover the echo counter');
  await p.screenshot({ path: path.join(OUT, 'iphone-ls-lanternwood.png') });
  await p.evaluate(() => { LD.setTime(0.75); LD.teleport(3000, 740); document.getElementById('toast').classList.remove('show'); });
  await p.waitForTimeout(450);
  await p.screenshot({ path: path.join(OUT, 'iphone-ls-crystals.png') });
  await p.evaluate(() => { LD.give(20); LD.teleport(5600, 650); document.getElementById('toast').classList.remove('show'); });
  await p.waitForTimeout(450);
  await p.screenshot({ path: path.join(OUT, 'iphone-ls-storm.png') });
  await p.evaluate(() => { LD.give(30); LD.teleport(8200, 420); document.getElementById('toast').classList.remove('show'); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(OUT, 'iphone-ls-aurora.png') });
  await p.tap('#pauseBtn');
  await p.waitForTimeout(300);
  const menu = await p.evaluate(() => {
    const panel = document.getElementById('panel').getBoundingClientRect();
    const ids = ['fScenery', 'fForgive', 'fFeedback', 'fProgress', 'fStage', 'music', 'sfx', 'bright', 'resume'];
    const vis = ids.map(id => { const r = document.getElementById(id).getBoundingClientRect(); return { id, top: r.top, bottom: r.bottom, h: r.height }; });
    return { panelH: panel.height, panelTop: panel.top, panelBottom: panel.bottom, vis, paused: LD.state.paused };
  });
  ok(menu.paused && menu.panelBottom <= 392 && menu.panelTop >= -1, 'pause panel fits the landscape screen');
  ok(menu.vis.every(v => v.h > 10), 'music, sfx, brightness and v1.1 switches are present');
  const resume = menu.vis.find(v => v.id === 'resume');
  ok(resume && resume.top >= 0 && resume.bottom <= 392, 'Resume is on screen in landscape without scrolling');
  await p.screenshot({ path: path.join(OUT, 'iphone-ls-menu.png') });
  await p.evaluate(() => { ['scenery', 'forgive', 'feedback', 'progress', 'stage'].forEach(id => LD.setFeat(id, false)); });
  await p.waitForTimeout(200);
  const off = await p.evaluate(() => ({
    feats: ['scenery', 'forgive', 'feedback', 'progress', 'stage'].map(id => LD.feat(id)),
    stage: document.body.classList.contains('feat-stage'),
    progress: document.body.classList.contains('feat-progress'),
    track: document.getElementById('track').classList.contains('on')
  }));
  ok(off.feats.every(v => v === false) && !off.stage && !off.progress && !off.track, 'all v1.1 switches off restores the plain HUD');
  await p.screenshot({ path: path.join(OUT, 'iphone-ls-menu-v10.png') });
  await p.evaluate(() => { ['scenery', 'forgive', 'feedback', 'progress', 'stage'].forEach(id => LD.setFeat(id, true)); });
  await p.tap('#resume');
  await p.waitForTimeout(200);
  await p.tap('#pauseBtn');
  await p.tap('#statsBtn');
  await p.waitForTimeout(250);
  const stats = await p.evaluate(() => {
    const r = document.getElementById('statsPanel').getBoundingClientRect();
    return { show: document.getElementById('statsOv').classList.contains('show'), cards: document.querySelectorAll('#statsBody .grid div').length, bottom: r.bottom, top: r.top };
  });
  ok(stats.show && stats.cards === 10 && stats.bottom <= 392 && stats.top >= -1, 'journey stats fit landscape and keep 10 cards');
  await p.screenshot({ path: path.join(OUT, 'iphone-ls-stats.png') });
  // Wick stays a crisp sprite: sample the player body against a blurred copy and expect a hard edge.
  await p.tap('#statsClose');
  await p.tap('#resume');
  await p.evaluate(() => { LD.setTime(0.3); LD.teleport(200, 900); LD.setQuality('high'); });
  await p.waitForTimeout(400);
  const crisp = await p.evaluate(() => {
    const s = LD.toScreen(LD.player().x + 9, LD.player().y + 8);
    const c = document.getElementById('game');
    const scale = c.width / c.getBoundingClientRect().width;
    const t = document.createElement('canvas'); t.width = 24; t.height = 24;
    const g = t.getContext('2d');
    g.drawImage(c, (s[0] - 12) * scale, (s[1] - 12) * scale, 24 * scale, 24 * scale, 0, 0, 24, 24);
    const d = g.getImageData(0, 0, 24, 24).data;
    let edge = 0;
    for (let y = 1; y < 23; y++) for (let x = 1; x < 23; x++) {
      const i = (y * 24 + x) * 4, j = i - 4;
      const dlt = Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i + 2] - d[j + 2]);
      if (dlt > 80) edge++;
    }
    return edge;
  });
  ok(crisp > 8, 'player body keeps a crisp edge (edge samples ' + crisp + ')');
  await p.screenshot({ path: path.join(OUT, 'iphone-ls-wick.png') });
  ok(errs.length === 0, 'no console errors ' + JSON.stringify(errs.slice(0, 3)));
  await browser.close();
  console.log(`\nui11: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
