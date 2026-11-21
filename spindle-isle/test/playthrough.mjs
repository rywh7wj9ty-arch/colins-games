// Headless playthrough at an iPhone landscape size. Drives the same tilt and
// turn actions a player would, and checks the flower blooms.
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const pwPath = process.env.PLAYWRIGHT_PATH || '/tmp/tools/node_modules/playwright/index.js';
const pwMod = await import(pathToFileURL(pwPath).href);
const { chromium, webkit } = pwMod.chromium ? pwMod : pwMod.default;

const OUT = '/opt/cursor/artifacts';
fs.mkdirSync(OUT, { recursive: true });
const PAGE = process.env.SPINDLE_URL || 'http://127.0.0.1:8765/spindle-isle/';
const URL_V10 = new URL('../spindle-isle-v1.0/', PAGE).href;
const FEATS = ['sky', 'water', 'foliage', 'light', 'pip', 'life', 'juice', 'feel', 'results'];

function predFactory() {
  return null;
}

async function state(page) {
  return page.evaluate(() => window.__spindle.state);
}

async function hold(page, dx, dz, pred, ms = 14000) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < ms) {
    await page.evaluate(([x, z]) => window.__spindle.tiltLocal(x, z), [dx, dz]);
    last = await state(page);
    if (pred(last)) return last;
    await page.waitForTimeout(80);
  }
  return null;
}

async function settle(page, ms = 700) {
  await page.evaluate(() => window.__spindle.release());
  await page.waitForTimeout(ms);
  return state(page);
}

async function turn(page, dir) {
  const before = (await state(page)).turns;
  await page.evaluate(() => window.__spindle.release());
  await page.evaluate((d) => window.__spindle.rotate(d), dir);
  await page.waitForFunction((n) => {
    const s = window.__spindle.state;
    return s.turns === n && Math.abs(s.yaw - n * Math.PI / 2) < 0.08;
  }, before + dir, { timeout: 4000 });
  await page.waitForTimeout(200);
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file });
  console.log('shot', file);
}

async function run(browserType, name, opts = {}) {
  const features = opts.features !== false;
  const shots = opts.shots || false;
  const errors = [];
  const browser = await browserType.launch({
    headless: true,
    args: name === 'chromium' ? ['--enable-unsafe-swiftshader'] : [],
  });
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    hasTouch: true,
  });
  await context.addInitScript((on) => {
    if (localStorage.getItem('spindle-isle-v11-settings')) return;
    const ids = ['sky', 'water', 'foliage', 'light', 'pip', 'life', 'juice', 'feel', 'results'];
    const feats = {};
    ids.forEach((id) => { feats[id] = on; });
    localStorage.setItem('spindle-isle-v11-settings', JSON.stringify({
      music: 0.7, sfx: 0.85, bright: 1, muted: false, feats,
    }));
  }, features);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__spindle && window.__spindle.ready, null, { timeout: 30000 });
  await page.evaluate(() => window.__spindle.lockTier(0));

  const ver = await page.evaluate(() => document.querySelector('.ver').textContent.trim());
  if (ver !== 'v1.1') throw new Error(name + ' title version ' + ver);
  const booted = await page.evaluate(() => ({
    feats: window.__spindle.features(),
    look: window.__spindle.look(),
  }));
  for (const id of FEATS) {
    if (!!booted.feats[id] !== features) throw new Error(name + ' feat ' + id + '=' + booted.feats[id]);
  }
  if (features) {
    if (booted.look.sky !== 'painted' || booted.look.water !== 'sparkle') {
      throw new Error(name + ' expected painted look ' + JSON.stringify(booted.look));
    }
    for (const id of ['foliage', 'light', 'pip', 'life', 'juice', 'feel']) {
      if (!booted.look[id]) throw new Error(name + ' look.' + id + ' off');
    }
  } else if (booted.look.sky !== 'plain' || booted.look.water !== 'plain'
    || booted.look.foliage || booted.look.light || booted.look.pip || booted.look.life || booted.look.juice || booted.look.feel) {
    throw new Error(name + ' switches off should match v1.0 look ' + JSON.stringify(booted.look));
  }
  if (shots === 'full') await shot(page, 'spindle_title.png');
  if (shots === 'plain') await shot(page, 'spindle_title_classic.png');

  // Settings: sliders, mute really silences, v1.1 switches, older-versions link.
  await page.click('#btn-settings');
  await page.waitForSelector('#settings:not(.hidden)');
  const settingsInfo = await page.evaluate((on) => {
    const buttons = [...document.querySelectorAll('#feats button')];
    const link = document.querySelector('#older a');
    return {
      music: document.getElementById('music').value,
      sfx: document.getElementById('sfx').value,
      bright: document.getElementById('bright').value,
      older: document.getElementById('older').children.length,
      href: link ? link.getAttribute('href') : '',
      label: link ? link.textContent : '',
      switches: buttons.length,
      ons: buttons.filter((b) => b.classList.contains('on')).length,
      head: document.querySelector('#settings h3') ? document.querySelector('#settings h3').textContent : '',
      expectOn: on,
    };
  }, features);
  if (settingsInfo.head !== 'New in 1.1') throw new Error('missing New in 1.1 group');
  if (settingsInfo.switches !== FEATS.length) throw new Error('switch count ' + settingsInfo.switches);
  if (settingsInfo.ons !== (features ? FEATS.length : 0)) throw new Error('switch states ' + settingsInfo.ons);
  if (settingsInfo.older !== 1 || !String(settingsInfo.href).includes('spindle-isle-v1.0')) {
    throw new Error('older versions link missing ' + JSON.stringify(settingsInfo));
  }
  if (settingsInfo.label !== 'v1.0') throw new Error('older label ' + settingsInfo.label);
  await page.evaluate(() => window.__spindle.setMuted(true));
  const muted = await page.evaluate(() => window.__spindle.audio());
  if (muted.master !== 0 || !muted.muted) throw new Error('mute did not zero the master gain: ' + JSON.stringify(muted));
  await page.evaluate(() => window.__spindle.setMuted(false));
  if (shots === 'full') await shot(page, 'spindle_settings.png');
  if (shots === 'plain') await shot(page, 'spindle_settings_off.png');
  await page.click('#settings-back');

  if (features && shots === 'full') {
    await page.evaluate(() => window.__spindle.setFeatures({ sky: false }));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__spindle && window.__spindle.ready, null, { timeout: 30000 });
    const kept = await page.evaluate(() => window.__spindle.features());
    if (kept.sky !== false || kept.water !== true) throw new Error('switches did not persist ' + JSON.stringify(kept));
    await page.evaluate(() => window.__spindle.setFeatures({ sky: true }));
    await page.evaluate(() => window.__spindle.lockTier(0));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const back = await page.evaluate(() => window.__spindle.look());
    if (back.sky !== 'painted') throw new Error('sky did not turn back on');
  }

  // Safe areas are part of the layout, not just a comment.
  const css = await page.evaluate(async () => {
    const sheet = [...document.styleSheets].find(s => (s.href || '').includes('style.css')) || document.styleSheets[0];
    let text = '';
    try { text = [...sheet.cssRules].map(r => r.cssText).join('\n'); } catch (e) { text = ''; }
    return text;
  });
  for (const token of ['safe-area-inset-top', 'safe-area-inset-left', 'safe-area-inset-bottom', 'safe-area-inset-right']) {
    if (!css.includes(token)) throw new Error('missing ' + token);
  }

  await page.evaluate(() => window.__spindle.lockTier(2));
  await page.click('#btn-play');
  await page.waitForFunction(() => window.__spindle.mode === 'play');

  const z0 = (await state(page)).z;
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowUp');
  const afterKey = await state(page);
  if (!(afterKey.z > z0 + 0.04)) throw new Error('ArrowUp did not roll Pip forward ' + z0 + ' -> ' + afterKey.z);
  await page.evaluate(() => window.__spindle.release());

  // A Bluetooth pad's left stick tilts, and a shoulder button turns.
  await page.evaluate(() => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
    window.__spindle.setDebugPad({ axes: [0.85, -0.1], buttons });
  });
  await page.waitForTimeout(400);
  const padTilt = await state(page);
  await page.evaluate(() => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
    buttons[5] = { pressed: true, value: 1 };
    window.__spindle.setDebugPad({ axes: [0, 0], buttons });
  });
  await page.waitForTimeout(200);
  const padTurn = await state(page);
  await page.evaluate(() => window.__spindle.setDebugPad(null));
  await page.evaluate(() => window.__spindle.release());
  if (Math.abs(padTilt.roll) < 0.05 && Math.abs(padTilt.pitch) < 0.05) {
    throw new Error('gamepad stick did not tilt');
  }
  if (padTurn.turns < 1 && padTurn.yawIndex !== 1) {
    // The edge might land between polls. Nudge once more if needed.
    await page.evaluate(() => {
      const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
      window.__spindle.setDebugPad({ axes: [0, 0], buttons });
    });
    await page.waitForTimeout(50);
    await page.evaluate(() => {
      const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
      buttons[5] = { pressed: true, value: 1 };
      window.__spindle.setDebugPad({ axes: [0, 0], buttons });
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__spindle.setDebugPad(null));
  }
  const turned = await state(page);
  if (turned.turns < 1) throw new Error('gamepad shoulder did not turn the isle, turns=' + turned.turns);
  // Put the isle back to the start facing so the route is the one we rehearsed.
  await page.click('#btn-pause');
  await page.click('#pause-restart');
  await page.waitForFunction(() => window.__spindle.state.turns === 0 && window.__spindle.state.z < -4);

  if (shots === 'full') await shot(page, 'spindle_meadow.png');

  let s = await hold(page, 0, 1, (st) => st.checkpoint >= 1 || st.fallen, 28000);
  if (!s || s.fallen) throw new Error(name + ' fell on the seesaw ' + JSON.stringify(s && { x: s.x, y: s.y, z: s.z }));
  if (shots === 'full') await shot(page, 'spindle_seesaw.png');

  s = await hold(page, 0, 1, (st) => st.z > 2.6 && st.z < 3.4 || st.fallen, 14000);
  await settle(page, 500);
  await turn(page, 1);
  s = await hold(page, 0, 1, (st) => st.checkpoint >= 2 || st.fallen, 22000);
  if (!s || s.fallen) throw new Error(name + ' fell at the gear ' + JSON.stringify(s));

  s = await hold(page, 1, 0.2, (st) => st.x > 2.6 || st.fallen, 14000);
  s = await hold(page, 0, 1, (st) => st.seeds.includes('s4') || st.fallen, 14000);
  if (!s || !s.seeds.includes('s4')) throw new Error(name + ' missed the pool seed');
  if (shots === 'full') await shot(page, 'spindle_water.png');
  await turn(page, 1);
  s = await hold(page, 0, -1, (st) => st.z < 6.7 || st.fallen, 12000);
  await settle(page, 400);
  s = await hold(page, 0, 1, (st) => st.z > 5.9 || st.fallen, 10000);
  await settle(page, 250);
  s = await hold(page, 1, 0, (st) => st.checkpoint >= 3 || st.fallen, 26000);
  if (!s || s.fallen) throw new Error(name + ' did not ride the channel ' + JSON.stringify(s && { x: s.x, z: s.z, seeds: s.seeds }));

  await settle(page, 400);
  await turn(page, 1);
  await page.waitForFunction(() => window.__spindle.state.windCharge > 0.7, null, { timeout: 8000 });
  s = await hold(page, 0, 1, (st) => st.y > 1.65 || st.checkpoint >= 4 || st.fallen, 14000);
  await page.evaluate(() => window.__spindle.release());
  await page.waitForFunction(() => {
    const st = window.__spindle.state;
    return st.fallen || (st.checkpoint >= 4 && st.onGround && st.y > 2 && Math.hypot(st.vx, st.vz) < 0.35);
  }, null, { timeout: 14000 });
  s = await state(page);
  if (s.fallen || s.checkpoint < 4) throw new Error(name + ' missed the gust ' + JSON.stringify({ x: s.x, y: s.y, z: s.z, fallen: s.fallen }));
  if (shots === 'full') await shot(page, 'spindle_garden.png');
  if (s.z > 11.45) {
    await hold(page, 0, -1, (st) => st.z < 11.3 || st.fallen, 8000);
    await settle(page, 400);
  }
  // Line up with the last seed before rolling into the flower, so a wide goal doesn't skip it.
  {
    const start = Date.now();
    let last = null;
    while (Date.now() - start < 22000) {
      last = await state(page);
      if (last.fallen || last.seeds.includes('s8')) break;
      if (last.won) break;
      const off = 11.05 - last.z;
      const lined = Math.abs(off) < 0.18;
      const dx = last.x > 6.7 && !lined ? 0 : -1;
      const dz = Math.max(-1, Math.min(1, off * (lined ? 1.2 : 3)));
      await page.evaluate(([x, z]) => window.__spindle.tiltLocal(x, z), [dx, dz]);
      await page.waitForTimeout(80);
    }
    s = last;
  }
  if (!s || s.fallen || !s.seeds.includes('s8')) {
    throw new Error(name + ' missed the flower seed ' + JSON.stringify(s && { x: s.x, y: s.y, z: s.z, won: s.won, seeds: s.seeds }));
  }
  if (!s.won) {
    s = await hold(page, -1, 0, (st) => st.won || st.fallen || st.bloom > 0.2, 16000);
  }
  if (!s || s.fallen || !(s.won || s.bloom > 0.2)) throw new Error(name + ' did not reach the flower ' + JSON.stringify(s && { x: s.x, y: s.y, z: s.z, won: s.won }));

  await page.waitForFunction(() => window.__spindle.state.bloom > 0.72, null, { timeout: 14000 });
  if (shots === 'full') await shot(page, 'spindle_bloom.png');
  await page.waitForFunction(() => window.__spindle.mode === 'complete', null, { timeout: 14000 });
  const done = await state(page);
  if (done.seeds.length < 8) throw new Error(name + ' seeds ' + done.seeds.join(','));
  const card = await page.evaluate(() => ({
    starsHidden: document.getElementById('res-stars').classList.contains('hidden'),
    stars: document.getElementById('res-stars').textContent,
    bestHidden: document.getElementById('res-best').classList.contains('hidden'),
    best: document.getElementById('res-best').textContent,
    saved: localStorage.getItem('spindle-isle-best'),
  }));
  if (features) {
    if (card.starsHidden || card.stars.indexOf('★★★') !== 0) throw new Error(name + ' stars ' + card.stars);
    if (card.bestHidden || card.best.indexOf('Best') !== 0) throw new Error(name + ' best ' + card.best);
    if (!card.saved) throw new Error(name + ' best time was not saved');
    if (shots === 'full') await shot(page, 'spindle_results.png');
  } else if (!card.starsHidden || !card.bestHidden || card.saved) {
    throw new Error(name + ' results should match v1.0 ' + JSON.stringify(card));
  }
  console.log(name, features ? 'v1.1' : 'classic', 'won', done.seeds.length + '/8', 'time', done.time.toFixed(1), 'tier', done.tier);

  // Service worker and its own cache.
  const sw = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { ok: false, reason: 'no sw' };
    const reg = await navigator.serviceWorker.ready;
    const keys = await caches.keys();
    const name = keys.find(k => k.startsWith('spindle-isle-v11-'));
    let hasStyle = false;
    if (name) {
      const cache = await caches.open(name);
      const list = await cache.keys();
      hasStyle = list.some(r => r.url.includes('style.css'));
    }
    return { ok: !!(reg && name && hasStyle), name, keys };
  });
  if (!sw.ok) throw new Error('service worker cache missing ' + JSON.stringify(sw));
  console.log(name, 'cache', sw.name);

  if (errors.length) throw new Error(name + ' console errors:\n' + errors.join('\n'));

  if (name === 'webkit' && features) {
    const iphone = await browser.newContext({
      viewport: { width: 844, height: 390 },
      deviceScaleFactor: 2,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    });
    const p2 = await iphone.newPage();
    await p2.goto(PAGE, { waitUntil: 'domcontentloaded' });
    await p2.waitForSelector('#a2hs:not(.hidden)', { timeout: 8000 });
    await iphone.close();
    console.log('webkit a2hs hint visible');
  }

  if (name === 'chromium' && features) {
    const frozen = await context.newPage();
    const frozenErrors = [];
    frozen.on('pageerror', (e) => frozenErrors.push(e.message));
    frozen.on('console', (m) => { if (m.type() === 'error') frozenErrors.push(m.text()); });
    await frozen.goto(URL_V10, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await frozen.waitForFunction(() => window.__spindle && window.__spindle.ready, null, { timeout: 30000 });
    const frozenInfo = await frozen.evaluate(async () => {
      const ver = document.querySelector('.ver').textContent.trim();
      const reg = await navigator.serviceWorker.ready;
      const keys = await caches.keys();
      return { ver, keys, scope: reg.scope };
    });
    if (frozenInfo.ver !== 'v1.0') throw new Error('frozen title ' + frozenInfo.ver);
    if (!frozenInfo.keys.some((k) => k.startsWith('spindle-isle-v10-'))) throw new Error('v1.0 cache missing ' + frozenInfo.keys.join(','));
    if (!frozenInfo.keys.some((k) => k.startsWith('spindle-isle-v11-'))) throw new Error('v1.0 worker deleted the v1.1 cache ' + frozenInfo.keys.join(','));
    if (!frozenInfo.scope.includes('/spindle-isle-v1.0/')) throw new Error('v1.0 scope ' + frozenInfo.scope);
    if (frozenErrors.length) throw new Error('v1.0 console errors:\n' + frozenErrors.join('\n'));
    console.log('v1.0 standalone ok', frozenInfo.scope);
  }

  await browser.close();
  console.log(name, features ? 'v1.1' : 'classic', 'ok');
}

const which = process.argv[2] || 'both';
const mode = process.argv[3] || 'all';
async function go(browserType, name) {
  if (mode === 'on' || mode === 'all') await run(browserType, name, { features: true, shots: name === 'chromium' ? 'full' : false });
  if (mode === 'off' || mode === 'all') await run(browserType, name, { features: false, shots: name === 'chromium' ? 'plain' : false });
}
if (which === 'chromium' || which === 'both') await go(chromium, 'chromium');
if (which === 'webkit' || which === 'both') await go(webkit, 'webkit');
