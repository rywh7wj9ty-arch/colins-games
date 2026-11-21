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
const URL = process.env.SPINDLE_URL || 'http://127.0.0.1:8765/spindle-isle/';

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

async function run(browserType, name) {
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
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__spindle && window.__spindle.ready, null, { timeout: 30000 });
  await page.evaluate(() => window.__spindle.lockTier(0));

  if (name === 'chromium') await shot(page, 'spindle_title.png');

  // Settings: sliders, mute really silences, empty older-versions list.
  await page.click('#btn-settings');
  await page.waitForSelector('#settings:not(.hidden)');
  const settingsInfo = await page.evaluate(() => ({
    music: document.getElementById('music').value,
    sfx: document.getElementById('sfx').value,
    bright: document.getElementById('bright').value,
    older: document.getElementById('older').children.length,
    empty: document.getElementById('older-empty').textContent,
  }));
  if (settingsInfo.older !== 0) throw new Error('older versions list should be empty');
  await page.evaluate(() => window.__spindle.setMuted(true));
  const muted = await page.evaluate(() => window.__spindle.audio());
  if (muted.master !== 0 || !muted.muted) throw new Error('mute did not zero the master gain: ' + JSON.stringify(muted));
  await page.evaluate(() => window.__spindle.setMuted(false));
  if (name === 'chromium') await shot(page, 'spindle_settings.png');
  await page.click('#settings-back');

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

  if (name === 'chromium') await shot(page, 'spindle_meadow.png');

  let s = await hold(page, 0, 1, (st) => st.checkpoint >= 1 || st.fallen, 16000);
  if (!s || s.fallen) throw new Error(name + ' fell on the seesaw ' + JSON.stringify(s && { x: s.x, y: s.y, z: s.z }));
  if (name === 'chromium') await shot(page, 'spindle_seesaw.png');

  s = await hold(page, 0, 1, (st) => st.z > 2.6 && st.z < 3.4 || st.fallen, 8000);
  await settle(page, 500);
  await turn(page, 1);
  s = await hold(page, 0, 1, (st) => st.checkpoint >= 2 || st.fallen, 12000);
  if (!s || s.fallen) throw new Error(name + ' fell at the gear ' + JSON.stringify(s));

  s = await hold(page, 1, 0.2, (st) => st.x > 2.6 || st.fallen, 8000);
  s = await hold(page, 0, 1, (st) => st.seeds.includes('s4') || st.fallen, 8000);
  if (!s || !s.seeds.includes('s4')) throw new Error(name + ' missed the pool seed');
  if (name === 'chromium') await shot(page, 'spindle_water.png');
  await turn(page, 1);
  s = await hold(page, 0, -1, (st) => st.z < 6.7 || st.fallen, 6000);
  await settle(page, 400);
  s = await hold(page, 0, 1, (st) => st.z > 5.9 || st.fallen, 5000);
  await settle(page, 250);
  s = await hold(page, 1, 0, (st) => st.checkpoint >= 3 || st.fallen, 14000);
  if (!s || s.fallen) throw new Error(name + ' did not ride the channel ' + JSON.stringify(s && { x: s.x, z: s.z, seeds: s.seeds }));

  await settle(page, 400);
  await turn(page, 1);
  await page.waitForFunction(() => window.__spindle.state.windCharge > 0.7, null, { timeout: 4000 });
  s = await hold(page, 0, 1, (st) => st.y > 1.65 || st.checkpoint >= 4 || st.fallen, 8000);
  await page.evaluate(() => window.__spindle.release());
  await page.waitForFunction(() => {
    const st = window.__spindle.state;
    return st.fallen || (st.checkpoint >= 4 && st.onGround && st.y > 2 && Math.hypot(st.vx, st.vz) < 0.35);
  }, null, { timeout: 8000 });
  s = await state(page);
  if (s.fallen || s.checkpoint < 4) throw new Error(name + ' missed the gust ' + JSON.stringify({ x: s.x, y: s.y, z: s.z, fallen: s.fallen }));
  if (name === 'chromium') await shot(page, 'spindle_garden.png');
  if (s.z > 11.45) {
    await hold(page, 0, -1, (st) => st.z < 11.3 || st.fallen, 4000);
    await settle(page, 400);
  }
  s = await hold(page, -1, 0, (st) => st.won || st.fallen || st.bloom > 0.2, 12000);
  if (!s || s.fallen || !(s.won || s.bloom > 0.2)) throw new Error(name + ' did not reach the flower ' + JSON.stringify(s && { x: s.x, y: s.y, z: s.z, won: s.won }));

  await page.waitForFunction(() => window.__spindle.state.bloom > 0.72, null, { timeout: 8000 });
  if (name === 'chromium') await shot(page, 'spindle_bloom.png');
  await page.waitForFunction(() => window.__spindle.mode === 'complete', null, { timeout: 8000 });
  const done = await state(page);
  if (done.seeds.length < 8) throw new Error(name + ' seeds ' + done.seeds.join(','));
  console.log(name, 'won', done.seeds.length + '/8', 'time', done.time.toFixed(1), 'tier', done.tier);

  // Service worker and its own cache.
  const sw = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { ok: false, reason: 'no sw' };
    const reg = await navigator.serviceWorker.ready;
    const keys = await caches.keys();
    const name = keys.find(k => k.startsWith('spindle-isle-v10-'));
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

  if (name === 'webkit') {
    const iphone = await browser.newContext({
      viewport: { width: 844, height: 390 },
      deviceScaleFactor: 2,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    });
    const p2 = await iphone.newPage();
    await p2.goto(URL, { waitUntil: 'domcontentloaded' });
    await p2.waitForSelector('#a2hs:not(.hidden)', { timeout: 8000 });
    await iphone.close();
    console.log('webkit a2hs hint visible');
  }

  await browser.close();
  console.log(name, 'ok');
}

const which = process.argv[2] || 'both';
if (which === 'chromium' || which === 'both') await run(chromium, 'chromium');
if (which === 'webkit' || which === 'both') await run(webkit, 'webkit');
