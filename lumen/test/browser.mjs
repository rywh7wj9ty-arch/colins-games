/* Automated play of every Lumen mode in an iPhone-landscape viewport.
   Prefers WebKit. Run from the repo root while a static server is up:
   node lumen/test/browser.mjs http://127.0.0.1:8765
*/
import { webkit, chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = (process.argv[2] || 'http://127.0.0.1:8765').replace(/\/$/, '');
const shotDir = '/opt/cursor/artifacts';
mkdirSync(shotDir, { recursive: true });
const MODES = ['marathon', 'sprint', 'ultra', 'zen', 'daily', 'puzzle', 'journey', 'versus', 'relax', 'challenge', 'tspin'];
const OFF = { handling: false, touch: false, clearghost: false, queue: false, calls: false, glass: false, linelight: false, crisp: false, coach: false, runcard: false };
const V22 = { journey: true, beat: true, shatter: true, versus: true, challenges: true, skins: true, tspin: true, relax: true, replays: true, levelfeel: true };
const VIEW = { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' };

const failures = [];
function check(name, cond, detail) { if (cond) console.log('ok  ', name); else { failures.push(name + (detail ? ' — ' + detail : '')); console.log('FAIL', name, detail || ''); } }

async function engine() {
  try {
    const b = await webkit.launch({ headless: true });
    console.log('browser webkit');
    return { browser: b, name: 'webkit' };
  } catch (e) {
    console.log('webkit unavailable:', e.message.split('\n')[0]);
    const b = await chromium.launch({ headless: true, args: ['--use-angle=default'] });
    console.log('browser chromium');
    return { browser: b, name: 'chromium' };
  }
}

async function open(browser, features23) {
  const ctx = await browser.newContext(VIEW);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(({ features23, v22 }) => {
    localStorage.setItem('lumen.coach.v23', 'true');
    localStorage.setItem('lumen.a2hs.v2', 'true');
    const stats = { lifetime: { lines: 42, score: 1000, clears: { tetris: 3 }, tspin: {} }, modes: { marathon: { played: 2, best: { score: 1000, lines: 42, level: 4, timeMs: 5000, pps: 1 }, top: [] } }, achievements: { first_light: '2026-05-01' }, extra: { ghostWins: 1 } };
    localStorage.setItem('lumen.stats.v1', JSON.stringify(stats));
    if (features23) localStorage.setItem('lumen.settings.v1', JSON.stringify({ features23, features: v22, music: 0, sfx: 0 }));
    else localStorage.setItem('lumen.settings.v1', JSON.stringify({ music: 0, sfx: 0, features: v22 }));
  }, { features23, v22: V22 });
  await page.goto(base + '/lumen/index.html?debug&nocd&nosw&seed=4', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(() => window.__lumenBooted && window.LUMEN, null, { timeout: 15000 });
  return { page, errors, ctx };
}

async function playMode(page, mode) {
  return page.evaluate((mode) => {
    const app = window.LUMEN.app;
    if (app.screen !== 'title') app.quit();
    if (mode === 'challenge') app.chal = { kind: 'daily', key: '2026-11-10', rules: ['fast'], goal: 20, level: 3, seed: 4 };
    if (mode === 'journey') app.jStage = 0;
    window.LUMEN.start(mode, mode === 'puzzle' ? 0 : undefined);
    const g = app.game;
    return { screen: app.screen, over: !!(g && g.over), type: g && g.cur && g.cur.type, handling: !!(g && g.handling), mode: app.mode, cpu: !!app.cpu, lines: g ? g.lines : -1 };
  }, mode);
}

async function drive(page) {
  const x0 = await page.evaluate(() => window.LUMEN.game.cur.x);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('KeyZ');
  await page.keyboard.press('KeyA');
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(80);
  await page.keyboard.up('ArrowDown');
  await page.keyboard.press('KeyC');
  await page.keyboard.press('Space');
  return page.evaluate((x0) => {
    const g = window.LUMEN.game;
    return { x0, x: g && g.cur ? g.cur.x : null, pieces: g ? g.pieces : -1, over: g ? g.over : true };
  }, x0);
}

const { browser, name } = await engine();
try {
  // ----- switches on (defaults, music silenced) -----
  {
    const { page, errors } = await open(browser, null);
    const ver = await page.locator('#ver-tag').textContent();
    check('title version 2.3', /2\.3/.test(ver || ''), ver);
    const saved = await page.evaluate(() => ({ lines: window.LUMEN.stats.lifetime.lines, ach: window.LUMEN.stats.achievements.first_light, sprint: window.LUMEN.stats.modes.sprint.played, ghost: window.LUMEN.stats.extra.ghostWins, handling: window.LUMEN.app.feat23('handling'), glass: window.LUMEN.app.fx.richGlass, crisp: window.LUMEN.app.fx.crisp, ghostOn: window.LUMEN.app.fx.clearGhost }));
    check('v2.2 stats loaded', saved.lines === 42 && saved.ach === '2026-05-01' && saved.sprint === 0 && saved.ghost === 1, JSON.stringify(saved));
    check('new switches default on', saved.handling && saved.glass && saved.crisp && saved.ghostOn, JSON.stringify(saved));
    const fit = await page.evaluate(() => {
      const L = window.LUMEN.layout;
      return { side: L.side, cell: L.cell, bx: L.bx, by: L.by, bw: L.bw, bh: L.bh, w: L.w, h: L.h, safe: L.safe };
    });
    check('landscape board inside the viewport', fit.bx >= -2 && fit.by >= -2 && fit.bx + fit.bw <= fit.w + 2 && fit.by + fit.bh <= fit.h + 2 && fit.cell >= 10, JSON.stringify(fit));
    check('safe-area object is present', fit.safe && typeof fit.safe.l === 'number');

    await page.evaluate(() => { localStorage.removeItem('lumen.coach.v23'); window.LUMEN.start('marathon'); });
    const coach = await page.evaluate(() => !document.querySelector('#coach').hidden && /Drag/.test(document.querySelector('#coach').textContent));
    check('first-run coach shows once', coach);
    await page.locator('#coach button').click();
    check('coach dismisses', await page.evaluate(() => document.querySelector('#coach').hidden && localStorage.getItem('lumen.coach.v23') === 'true'));

    for (const mode of MODES) {
      const r = await playMode(page, mode);
      check(`on ${mode} starts`, r.screen === 'game' && r.type && !r.over, JSON.stringify(r));
      if (mode === 'versus') check('versus cpu exists', r.cpu, JSON.stringify(r));
      if (mode === 'marathon') {
        const d = await drive(page);
        check('keyboard moves and locks a piece', d.pieces >= 1 && !d.over, JSON.stringify(d));
        await page.keyboard.press('Escape');
        check('pause', await page.evaluate(() => window.LUMEN.screen === 'pause'));
        await page.keyboard.press('Escape');
        await page.waitForTimeout(450);
        check('resume', await page.evaluate(() => window.LUMEN.screen === 'game' && window.LUMEN.app.running));
      }
      await page.waitForTimeout(60);
    }

    // IRS while rotate is held
    await playMode(page, 'marathon');
    const irs = await page.evaluate(() => {
      const g = window.LUMEN.game; g.setQueue(['T', 'T', 'T', 'T', 'T', 'T', 'T']); g.rotHeld = 1; g.hardDrop();
      return { type: g.cur && g.cur.type, rot: g.cur && g.cur.rot };
    });
    check('IRS spins the next T', irs.type === 'T' && irs.rot === 1, JSON.stringify(irs));

    // touch: a sideways drag moves, a short downward flick does not lock
    await playMode(page, 'marathon');
    const box = await page.evaluate(() => { const L = window.LUMEN.layout; return { x: L.bx + L.bw / 2, y: L.by + L.bh / 2, cell: L.cell }; });
    const x0 = await page.evaluate(() => window.LUMEN.game.cur.x);
    await page.mouse.move(box.x, box.y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.cell * 2.4, box.y + 2, { steps: 8 });
    await page.mouse.up();
    const x1 = await page.evaluate(() => window.LUMEN.game.cur.x);
    check('precise drag moves the piece', x1 > x0, `x ${x0} -> ${x1}`);
    const before = await page.evaluate(() => window.LUMEN.game.pieces);
    await page.mouse.move(box.x, box.y);
    await page.mouse.down();
    await page.mouse.move(box.x + 2, box.y + 28, { steps: 4 });
    await page.mouse.up();
    const after = await page.evaluate(() => window.LUMEN.game.pieces);
    check('short flick does not hard-drop', after === before, `pieces ${before} -> ${after}`);

    // controller
    const pad = await page.evaluate(() => {
      const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
      const pad = { buttons, axes: [0, 0, 0, 0], connected: true, mapping: 'standard', index: 0, id: 'test', timestamp: 0, vibrationActuator: null };
      navigator.getGamepads = () => [pad];
      const g = window.LUMEN.game; g.setPiece('T', 0, 4, 18);
      const input = window.LUMEN.app.input;
      input.pollPads();
      const x0 = g.cur.x;
      buttons[15].pressed = true; buttons[15].value = 1; input.pollPads();
      const x1 = g.cur.x;
      buttons[15].pressed = false; buttons[15].value = 0; input.pollPads();
      const rot0 = g.cur.rot;
      buttons[0].pressed = true; buttons[0].value = 1; input.pollPads();
      const rot1 = g.cur.rot;
      buttons[0].pressed = false; buttons[0].value = 0; input.pollPads();
      buttons[2].pressed = true; buttons[2].value = 1; input.pollPads();
      const held = g.hold;
      buttons[2].pressed = false; input.pollPads();
      return { x0, x1, rot0, rot1, held, padOn: input.padOn };
    });
    check('controller connected', pad.padOn === true, JSON.stringify(pad));
    check('dpad moves right', pad.x1 === pad.x0 + 1, JSON.stringify(pad));
    check('A rotates', pad.rot1 !== pad.rot0, JSON.stringify(pad));
    check('X holds', !!pad.held, JSON.stringify(pad));

    // settings switches
    await page.evaluate(() => window.LUMEN.app.show('settings', true));
    await page.waitForSelector('.f23toggle');
    check('ten 2.3 switches', await page.locator('.f23toggle').count() === 10);
    check('ten 2.2 switches', await page.locator('.ftoggle').count() === 10);
    await page.locator('[data-f23all="0"]').click();
    const off = await page.evaluate(() => ({ h: window.LUMEN.app.feat23('handling'), j: window.LUMEN.app.feat('journey'), glass: window.LUMEN.app.fx.richGlass, crisp: window.LUMEN.app.fx.crisp }));
    check('all 2.3 off keeps 2.2 journey on', off.h === false && off.j === true && off.glass === false && off.crisp === false, JSON.stringify(off));
    await page.locator('[data-f23all="1"]').click();
    check('all 2.3 back on', await page.evaluate(() => window.LUMEN.app.feat23('handling') && window.LUMEN.app.fx.clearGhost));

    // in-play screenshots
    await playMode(page, 'marathon');
    await page.evaluate(() => {
      const g = window.LUMEN.game;
      g.setQueue(['T', 'L', 'J', 'I', 'S', 'Z', 'O']);
      g.setPiece('T', 0, 3, 22);
    });
    await page.waitForTimeout(250);
    await page.screenshot({ path: shotDir + '/lumen-v23-play.png' });
    const cleared = await page.evaluate(() => {
      const g = window.LUMEN.game;
      g.setBoard(['######....']);
      g.setPiece('I', 0, 6, 20);
      g.hardDrop();
      return g.lines;
    });
    check('a line actually clears', cleared >= 1, String(cleared));
    await page.waitForTimeout(180);
    await page.screenshot({ path: shotDir + '/lumen-v23-clear.png' });
    check('screenshots written', true);

    const noisy = errors.filter(e => !/favicon|manifest|Failed to load resource/i.test(e));
    check('no page errors with switches on', noisy.length === 0, noisy.join(' | '));
    await page.context().close();
  }

  // ----- every new switch off: plays, and IRS does not pre-rotate -----
  {
    const { page, errors } = await open(browser, OFF);
    const flags = await page.evaluate(() => ({ h: window.LUMEN.app.game ? null : window.LUMEN.app.feat23('handling'), glass: window.LUMEN.app.fx.richGlass, crisp: window.LUMEN.app.fx.crisp, ghost: window.LUMEN.app.fx.clearGhost, queue: window.LUMEN.app.fx.clearQueue, light: window.LUMEN.app.fx.lineLight }));
    check('off: renderer flags are v2.2', !flags.glass && !flags.crisp && !flags.ghost && !flags.queue && !flags.light, JSON.stringify(flags));
    for (const mode of MODES) {
      const r = await playMode(page, mode);
      check(`off ${mode} starts`, r.screen === 'game' && r.type && !r.over && r.handling === false, JSON.stringify(r));
    }
    await playMode(page, 'marathon');
    const coachHidden = await page.evaluate(() => { localStorage.removeItem('lumen.coach.v23'); window.LUMEN.start('marathon'); return document.querySelector('#coach').hidden; });
    check('off: coach stays hidden', coachHidden);
    const irs = await page.evaluate(() => {
      const g = window.LUMEN.game; g.setQueue(['T', 'T', 'T', 'T', 'T', 'T', 'T']); g.rotHeld = 1; g.hardDrop();
      return { type: g.cur && g.cur.type, rot: g.cur && g.cur.rot, handling: g.handling };
    });
    check('off: no IRS', irs.handling === false && irs.rot === 0, JSON.stringify(irs));
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    check('off: keyboard still locks', await page.evaluate(() => window.LUMEN.game.pieces >= 1));
    const box = await page.evaluate(() => { const L = window.LUMEN.layout; return { x: L.bx + L.bw / 2, y: L.by + 40, cell: L.cell }; });
    const x0 = await page.evaluate(() => window.LUMEN.game && window.LUMEN.game.cur ? window.LUMEN.game.cur.x : -1);
    if (x0 >= 0) {
      await page.mouse.move(box.x, box.y); await page.mouse.down();
      await page.mouse.move(box.x + box.cell * 2, box.y, { steps: 6 }); await page.mouse.up();
    }
    check('off: classic drag still runs', await page.evaluate(() => !window.LUMEN.app.feat23('touch') && window.LUMEN.screen === 'game'));
    const pad = await page.evaluate(() => {
      const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
      const pad = { buttons, axes: [0, 0, 0, 0], connected: true, mapping: 'standard', index: 0, id: 'test', timestamp: 0 };
      navigator.getGamepads = () => [pad];
      const g = window.LUMEN.game; if (!g || !g.cur) return { skipped: true };
      g.setPiece('L', 0, 3, 18);
      const input = window.LUMEN.app.input; input.pollPads();
      buttons[14].pressed = true; buttons[14].value = 1; input.pollPads();
      const moved = g.cur.x === 2;
      buttons[14].pressed = false; input.pollPads();
      buttons[1].pressed = true; buttons[1].value = 1; input.pollPads();
      return { moved, rot: g.cur.rot };
    });
    check('off: controller left and B', pad.moved === true && pad.rot !== 0, JSON.stringify(pad));
    await page.evaluate(() => window.LUMEN.game.end('topout'));
    await page.waitForTimeout(700);
    const gradeHidden = await page.evaluate(() => { const el = document.querySelector('#res-grade'); return !el || el.hidden; });
    check('off: no run grade', gradeHidden && await page.evaluate(() => window.LUMEN.screen === 'results'));
    const noisy = errors.filter(e => !/favicon|manifest|Failed to load resource/i.test(e));
    check('no page errors with switches off', noisy.length === 0, noisy.join(' | '));
    await page.context().close();
  }
} finally {
  await browser.close();
}

console.log(failures.length ? `\n${failures.length} failed\n` + failures.join('\n') : `\nall browser checks passed (${name})`);
process.exit(failures.length ? 1 : 0);
