// Orbiloo v1.5 checks. WebKit, iPhone landscape (844x390).
// node orbiloo/test/playthrough.mjs
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(fs.existsSync('/tmp/pw/node_modules/playwright/package.json')
  ? '/tmp/pw/node_modules/playwright/package.json'
  : import.meta.url);
const { webkit } = require('playwright');

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const shots = '/opt/cursor/artifacts';
fs.mkdirSync(shots, { recursive: true });
const port = 8791;
let pass = 0, fail = 0;
const bad = [];
function ok(c, m) { if (c) { pass++; console.log('  ok  ', m); } else { fail++; bad.push(m); console.log('  FAIL', m); } }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const fp = path.join(repo, u === '/' ? 'index.html' : u);
  if (!fp.startsWith(repo)) { res.writeHead(403); res.end(); return; }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end('no'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  });
});
await new Promise(r => server.listen(port, '127.0.0.1', r));

function read(rel) { return fs.readFileSync(path.join(repo, rel), 'utf8'); }
const mainSw = read('orbiloo/sw.js');
const v14Sw = read('orbiloo-v1.4/sw.js');
const v13Sw = read('orbiloo-v1.3/sw.js');
ok(mainSw.includes("PREFIX='orbiloo-main-'") && mainSw.includes('202611131600'), 'main cache orbiloo-main-202611131600');
ok(v14Sw.includes("PREFIX='orbiloo-v14-'") && v14Sw.includes('202611051800'), 'frozen v1.4 cache orbiloo-v14-202611051800');
ok(v13Sw.includes("PREFIX='orbiloo-v13-'"), 'v1.3 keeps its own prefix');
ok(!mainSw.includes('orbiloo-v14-') && !v14Sw.includes("PREFIX='orbiloo-main-'"), 'cache prefixes do not overlap');
for (const dir of ['orbiloo-v1.0', 'orbiloo-v1.1', 'orbiloo-v1.2', 'orbiloo-v1.3', 'orbiloo-v1.4']) {
  const html = read(dir + '/index.html');
  ok(html.includes('Newer versions') && html.includes("../orbiloo/"), dir + ' links forward to the latest');
}
ok(read('orbiloo/game.js').includes("VERSION='v1.5'"), 'game version constant v1.5');
ok(read('orbiloo-v1.4/game.js').includes("VERSION='v1.4'"), 'frozen copy stays v1.4');
ok(read('orbiloo/index.html').includes('>v1.5<'), 'title screen shows v1.5');

const BOT = `
function norm(a){a%=Math.PI*2;if(a<0)a+=Math.PI*2;return a}
function ahead(cur,target,d){const c=norm(cur),t=norm(target);if(d>0){let x=t-c;if(x<0)x+=Math.PI*2;return x}let x=c-t;if(x<0)x+=Math.PI*2;return x}
function score(r,ti,cur){if(!r)return -1;if(r.kind==='win'||r.kind==='hit')return 5000;if(r.kind!=='land')return -1;if(r.on===ti)return 500-r.steps*0.05;if(r.on>cur)return 80+r.on*2;return -1}
const NEW=['snap','coach','tunes','ice','pads','bells','shards','whirl','sea','medals','charms','kind','assist','bloom','parade'];
function setNew(on){NEW.forEach(k=>{OB.feat[k]=!!on})}
function play(n,maxT){
  OB.start(n);
  let guard=0,cached=null;
  const maxSteps=Math.floor((maxT||320)*120);
  while(guard<maxSteps){
    let G=OB.G;
    if(!G)return {win:0,why:'nogame'};
    if(G.mode==='win'||G.mode==='done')return {win:1,t:+G.t.toFixed(2),misses:G.misses,stars:G.stars,lv:G.lv,on:G.on};
    if(G.dead){OB.step(4);guard+=4;continue}
    if(G.fly){OB.step(2);guard+=2;continue}
    const p=G.P[G.on];
    if(p.o.goal){OB.step(3);guard+=3;continue}
    const ti=OB.tgt(G.on),tp=G.P[ti],on=G.on,misses=G.misses,ang0=G.ang,t0=G.t;
    const d=Math.sign(p.spin)||1;
    const moving=!!(tp.o.mv||tp.o.flip||p.o.flip||p.o.moons||tp.o.moons);
    if(!cached||cached.on!==on||cached.misses!==misses||(moving&&t0>cached.until)||(!cached.best&&t0>cached.until)){
      let best=null;
      const sweep=(shift,nAng)=>{for(let i=0;i<nAng;i++){const ang=(i+shift)/nAng*Math.PI*2;const wait=ahead(ang0,ang,d);
        for(const pw of [0,1]){const r=OB.probe(ang,pw,240);const sc=score(r,ti,on)-wait*3-pw*2;if(sc>0&&(!best||sc>best.sc))best={ang,pw,sc}}}}
      sweep(0,12); if(!best)sweep(0.5,12); if(!best&&(tp.o.boss||tp.o.moons||tp.o.flip))sweep(0.25,20);
      cached={on,misses,until:t0+(best&&!moving?1.4:.3),best};
    }
    if(cached.best){G=OB.G;const w=ahead(G.ang,cached.best.ang,d);if(w<0.05){const chk=OB.probe(G.ang,cached.best.pw,240);if(score(chk,ti,OB.G.on)>0){OB.leap(cached.best.pw);cached=null}else if(w<0.015)cached=null;OB.step(1);guard+=1;continue}const steps=w<0.45?1:Math.max(1,Math.min(5,Math.floor(w/0.08)));OB.step(steps);guard+=steps;continue}
    OB.step(8);guard+=8;
  }
  const G=OB.G;return {win:0,t:+G.t.toFixed(2),misses:G.misses,on:G.on,reached:G.reached,main:G.main,lv:G.lv};
}
`;
const inject = `{ ${BOT}\nwindow.play=play;window.setNew=setNew;window.NEW=NEW; }`;

const browser = await webkit.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://127.0.0.1:${port}/orbiloo/index.html`);
await page.waitForFunction(() => window.OB);
await page.evaluate(async () => { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister())); });
await page.screenshot({ path: path.join(shots, 'orbiloo-v15-title.png') });

const info = await page.evaluate(() => {
  const feats = [...document.querySelectorAll('#feats .tog')].map(b => b.dataset.f);
  const html = document.documentElement.innerHTML;
  return {
    version: document.getElementById('ver').textContent,
    title: document.querySelector('#title .sub').textContent,
    feats,
    olds: document.getElementById('olds').innerText,
    a2hs: document.getElementById('a2hs').textContent,
    safe: html.includes('safe-area-inset'),
    viewport: document.querySelector('meta[name=viewport]').content,
    standalone: html.includes('apple-mobile-web-app-capable'),
    sliders: ['sMus', 'sSfx', 'sBri'].map(id => document.getElementById(id) && document.getElementById(id).type),
    a2hsOn: getComputedStyle(document.getElementById('a2hs')).display !== 'none',
  };
});
ok(info.version === 'Orbiloo v1.5', 'badge says Orbiloo v1.5 (' + info.version + ')');
ok(info.title.includes('v1.5'), 'title subtitle is v1.5');
ok(info.feats.length === 40, '40 feature switches (' + info.feats.length + ')');
for (const k of ['aim', 'help', 'charge', 'nudge', 'sphere', 'cinema', 'juice', 'expressive', 'glide', 'ribbon', 'snap', 'sea', 'assist']) ok(info.feats.includes(k), 'switch ' + k);
ok(info.olds.includes('v1.4') && info.olds.includes('v1.0'), 'older versions include v1.4 through v1.0');
ok(/Add to Home Screen/.test(info.a2hs), 'Add to Home Screen reminder is in the page');
ok(info.safe && info.viewport.includes('viewport-fit=cover') && info.standalone, 'safe-area, viewport-fit and standalone meta');
ok(info.sliders.every(t => t === 'range'), 'music, effects and brightness sliders');
ok(info.a2hsOn, 'iPhone Safari shows the Add to Home Screen reminder');

await page.evaluate(inject);

const units = await page.evaluate(() => {
  const out = {};
  OB.feat.snap = true; OB.feat.charge = true; OB.start(1); OB.press(); OB.step(Math.round(0.48 * 120));
  out.chargeOn = OB.G.charge;
  OB.feat.snap = false; OB.start(1); OB.press(); OB.step(Math.round(0.48 * 120));
  out.chargeOff = OB.G.charge;
  OB.feat.snap = true;
  OB.feat.kind = false; OB.start(2); OB.G.dead = 0.02; OB.step(8); out.angOff = OB.G.ang;
  OB.feat.kind = true; OB.start(2); OB.G.dead = 0.02; OB.step(8); out.angOn = OB.G.ang;
  OB.feat.charms = true; OB.start(4); out.charmOn = !!OB.G.charm;
  OB.feat.charms = false; OB.start(4); out.charmOff = OB.G.charm;
  OB.feat.charms = true;
  OB.feat.pads = true; OB.start(26); out.padsOn = OB.G.pads.length;
  OB.feat.pads = false; OB.start(26); out.padsOff = OB.G.pads.length;
  OB.feat.pads = true;
  let iced = null;
  OB.feat.ice = true;
  for (const n of [7, 8, 9, 10, 11, 12, 13, 14, 18]) { OB.start(n); iced = OB.G.P.find(p => p.ice); if (iced) break; }
  if (iced) { const fast = OB.spinMul(iced); OB.feat.ice = false; const slow = OB.spinMul(iced); OB.feat.ice = true; out.iceFaster = fast > slow + 0.05; }
  else out.iceFaster = false;
  OB.feat.sea = true; OB.openMap(); out.seaOn = !!document.querySelector('[data-n="25"]');
  OB.feat.sea = false; OB.openMap(); out.seaOff = !!document.querySelector('[data-n="25"]'); out.seaLantern = document.getElementById('mapG').innerText.includes('Lantern');
  OB.feat.sea = true; OB.show('title');
  OB.feat.sea = false; OB.start(25); out.redirect = OB.G.lv;
  OB.feat.sea = true;
  out.medal = OB.medalName(1, 20);
  out.assistKeys = NEW.every(k => k in OB.feat);
  return out;
});
ok(units.chargeOn > 0.95 && units.chargeOff < 0.8, 'snappier charge fills in 0.48s (' + units.chargeOn.toFixed(2) + ' vs ' + units.chargeOff.toFixed(2) + ')');
ok(Math.abs(units.angOff + Math.PI / 2) < 0.2, 'kinder checkpoints off respawns at the top');
ok(Math.abs(units.angOn + Math.PI / 2) > 0.3, 'kinder checkpoints on faces the way onward');
ok(units.charmOn && !units.charmOff, 'moon charms spawn only while their switch is on');
ok(units.padsOn > 0 && units.padsOff === 0, 'launch pads appear on Glow Tide only while their switch is on');
ok(units.iceFaster, 'ice planets speed the orbit only while their switch is on');
ok(units.seaOn && !units.seaOff && !units.seaLantern, 'Lantern Sea is hidden when its switch is off');
ok(units.redirect === 1, 'starting a sea level with the switch off stays on the classic campaign');
ok(units.medal === 'Gold', 'time trial medal for a fast Pebble Belt is Gold');
ok(units.assistKeys, 'every new switch key exists on the save');

await page.evaluate(() => {
  localStorage.setItem('orbiloo-save-v1', JSON.stringify({
    lv: { 1: { c: 2, b: 21.5, s: 8 }, 20: { c: 1, b: 100, s: 4 } },
    gold: { 3: 1 },
    daily: { last: '20261101', streak: 4, best: 6, done: 9 },
    hat: 2, trailC: 3, bestScore: { 1: 400 },
    mus: 42, sfx: 55, bri: 120,
    feat: { aim: false, ribbon: false, juice: true },
    st: { plays: 7, clears: 4, best: 21.5, bestStars: 12, leaps: 80, stars: 40, misses: 9, crowns: 2, time: 100 },
  }));
});
await page.reload();
await page.waitForFunction(() => window.OB);
await page.evaluate(inject);
const saved = await page.evaluate(() => ({
  aim: OB.feat.aim, ribbon: OB.feat.ribbon, snap: OB.feat.snap, sea: OB.feat.sea,
  hat: OB.SV.hat, trail: OB.SV.trailC, mus: OB.SV.mus, sfx: OB.SV.sfx, bri: OB.SV.bri,
  c: OB.SV.lv[1].c, b: OB.SV.lv[1].b, gold: OB.SV.gold[3], streak: OB.SV.daily.streak, plays: OB.SV.st.plays,
}));
ok(saved.aim === false && saved.ribbon === false, 'v1.4 switch choices survive the load');
ok(saved.snap === true && saved.sea === true, 'new switches default on when an older save has no opinion');
ok(saved.hat === 2 && saved.trail === 3 && saved.mus === 42 && saved.sfx === 55 && saved.bri === 120, 'hat, trail and the three sliders load');
ok(saved.c === 2 && saved.b === 21.5 && saved.gold === 1 && saved.streak === 4 && saved.plays === 7, 'level records, golden star, streak and stats load');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForFunction(() => window.OB);
await page.evaluate(inject);

const input = await page.evaluate(() => {
  OB.show(null); OB.start(1);
  document.getElementById('cv').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 3, pointerType: 'touch', clientX: 200, clientY: 200 }));
  const held = !!OB.G.holding;
  document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 3 }));
  OB.G.holding = false; OB.G.wantHold = 0; OB.G.fly = null;
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
  const keyed = !!OB.G.holding;
  document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }));
  const buttons = Array.from({ length: 24 }, () => ({ pressed: false }));
  navigator.getGamepads = () => [{ connected: true, buttons, axes: [0, 0, 0, 0] }];
  OB.G.holding = false; OB.G.fly = null;
  buttons[0].pressed = true; OB.poll();
  const padHeld = !!OB.G.holding;
  buttons[0].pressed = false; OB.poll();
  const padUp = !OB.G.holding;
  OB.show('title');
  return { held, keyed, padHeld, padUp };
});
ok(input.held, 'touch on the canvas starts a charge');
ok(input.keyed, 'Space starts a charge');
ok(input.padHeld && input.padUp, 'controller face button starts and releases a charge');

await page.evaluate(() => { OB.show('title'); });
await page.click('#bPlay');
await page.waitForSelector('#map.on');
await page.click('#mapG .lvb');
await page.waitForTimeout(400);
const box = await page.locator('#cv').boundingBox();
await page.mouse.move(box.x + 420, box.y + 180);
await page.mouse.down();
await page.waitForTimeout(180);
await page.mouse.up();
await page.waitForTimeout(280);
await page.screenshot({ path: path.join(shots, 'orbiloo-v15-leap.png') });

const look = await page.evaluate(() => {
  OB.feat.sea = true; OB.start(27);
  const cv = document.getElementById('cv'), x = cv.getContext('2d');
  const im = x.getImageData(0, 0, cv.width, cv.height).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < im.length; i += 16) { r += im[i]; g += im[i + 1]; b += im[i + 2]; n++; }
  return { r: r / n, g: g / n, b: b / n, lv: OB.G.lv };
});
ok(look.b > look.r + 8 && look.g > look.r, 'Lantern Sea sky is blue and green, not red (' + [look.r, look.g, look.b].map(v => v.toFixed(0)).join(',') + ')');
await page.screenshot({ path: path.join(shots, 'orbiloo-v15-lantern.png') });
await page.evaluate(() => OB.start(30));
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(shots, 'orbiloo-v15-luma.png') });

const fps = await page.evaluate(() => new Promise(res => {
  OB.start(8);
  let n = 0; const t0 = performance.now();
  function frame(t) { n++; if (t - t0 < 1000) requestAnimationFrame(frame); else res(n); }
  requestAnimationFrame(frame);
}));
ok(fps >= 30, 'frame callback about ' + fps + '/s while a level is up');

await page.evaluate(() => { OB.show('title'); document.getElementById('bSet').click(); });
await page.waitForSelector('#settings.on');
await page.evaluate(() => { const b = document.querySelector('[data-f="snap"]'); if (b) b.scrollIntoView({ block: 'center' }); });
await page.screenshot({ path: path.join(shots, 'orbiloo-v15-settings.png') });

const v14 = await ctx.newPage();
await v14.goto(`http://127.0.0.1:${port}/orbiloo-v1.4/index.html`);
await v14.waitForFunction(() => window.OB);
const levelsGeom = [1, 12, 15, 20];
const geom = await page.evaluate(levels => {
  const mine = {};
  for (const n of levels) mine[n] = OB.genLevel(n).P.map(p => [Math.round(p.x), Math.round(p.y), Math.round(p.r), +p.spin.toFixed(3), p.o.moons || 0, p.o.flip || 0]);
  return mine;
}, levelsGeom);
const geom14 = await v14.evaluate(levels => {
  const mine = {};
  for (const n of levels) mine[n] = OB.genLevel(n).P.map(p => [Math.round(p.x), Math.round(p.y), Math.round(p.r), +p.spin.toFixed(3), p.o.moons || 0, p.o.flip || 0]);
  return mine;
}, levelsGeom);
ok(JSON.stringify(geom) === JSON.stringify(geom14), 'levels 1, 12, 15 and 20 match the frozen v1.4 layout');
await v14.close();

const campaign = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 99];
const table = [];
for (const mode of ['on', 'off']) {
  await page.evaluate(on => setNew(on), mode === 'on');
  const list = mode === 'on' ? campaign : campaign.filter(n => n < 25 || n === 99);
  console.log('playthrough', mode);
  for (const n of list) {
    const r = await page.evaluate(n => play(n, 320), n);
    const label = mode + ' L' + n + (r.win ? ' clear ' + r.t + 's misses ' + r.misses : ' FAIL stuck ' + r.on + '/' + r.main + ' t=' + r.t);
    ok(r.win === 1, label);
    table.push({ mode, n, win: r.win, t: r.t, misses: r.misses, on: r.on, main: r.main });
  }
}
fs.writeFileSync(path.join(shots, 'orbiloo-v15-results.json'), JSON.stringify(table, null, 2));
ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));

await browser.close();
server.close();
console.log(`\n${pass} passed, ${fail} failed`);
if (bad.length) console.log(bad.join('\n'));
process.exit(fail ? 1 : 0);
