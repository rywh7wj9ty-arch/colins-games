// node test/v11.test.js — v1.1 switches, forgiving drift, and gates that must still hold.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const LD = require('./load-core.js')();
const C = LD.C;
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('ok  ', name); } catch (e) { fail++; console.log('FAIL', name, '-', e.message); } }
function world(solids) {
  const L = { solids: solids.map((s, i) => Object.assign({ id: i, h: 40, type: 'g' }, s)), winds: [] };
  return { env: { grid: new LD.Grid(L.solids), winds: L.winds, active: () => true } };
}
const NONE = { double: false, dash: false, wall: false, glide: false };
const FORGIVE = { forgive: true };

t('v1.0 coyote unchanged: 16 frames late is too late', () => {
  const { env } = world([{ x: 0, y: 500, w: 80 }]);
  const p = LD.newPlayer(60, 500);
  for (let f = 0; f < 40; f++) LD.step(p, { x: 0 }, NONE, env, []);
  let left = -1, jumped = false;
  for (let f = 0; f < 200; f++) {
    const evs = LD.step(p, { x: 1, jumpP: left >= 0 && f === left + 16, jump: left >= 0 && f >= left + 16 }, NONE, env, []);
    if (left < 0 && !p.onGround) left = f;
    if (evs.includes('jump')) jumped = true;
  }
  assert.strictEqual(jumped, false);
});

t('forgiving drift extends coyote so the same late jump still works', () => {
  const { env } = world([{ x: 0, y: 500, w: 80 }]);
  const p = LD.newPlayer(60, 500);
  for (let f = 0; f < 40; f++) LD.step(p, { x: 0 }, NONE, env, [], FORGIVE);
  let left = -1, jumped = false;
  for (let f = 0; f < 200; f++) {
    const evs = LD.step(p, { x: 1, jumpP: left >= 0 && f === left + 16, jump: left >= 0 && f >= left + 16 }, NONE, env, [], FORGIVE);
    if (left < 0 && !p.onGround) left = f;
    if (evs.includes('jump')) jumped = true;
  }
  assert.strictEqual(jumped, true, 'left=' + left);
});

t('lip step only with forgiving drift', () => {
  function run(opt) {
    const { env } = world([{ x: 100, y: 494, w: 160, h: 80 }]);
    const p = LD.newPlayer(0, 0);
    p.x = 78; p.y = 500 - C.PH; p.vx = 220; p.vy = 30; p.onGround = false; p.airT = 0.2;
    for (let f = 0; f < 50; f++) LD.step(p, { x: 1 }, NONE, env, [], opt);
    return p;
  }
  const nice = run(FORGIVE), plain = run();
  assert.ok(Math.abs((nice.y + C.PH) - 494) < 1.5, 'forgive feet ' + (nice.y + C.PH));
  assert.ok(plain.onGround === false || plain.y + C.PH > 520, 'v1.0 should miss the lip, feet ' + (plain.y + C.PH) + ' ground ' + plain.onGround);
});

t('full jump height stays in the v1.0 band even with forgiving drift', () => {
  function maxRise(opt) {
    const { env } = world([{ x: -500, y: 500, w: 2000 }]);
    const p = LD.newPlayer(0, 500);
    for (let f = 0; f < 30; f++) LD.step(p, { x: 0 }, NONE, env, [], opt);
    const y0 = p.y; let best = 0;
    for (let f = 0; f < 220; f++) { LD.step(p, { x: 0, jumpP: f === 0, jump: true }, NONE, env, [], opt); best = Math.max(best, y0 - p.y); }
    return best;
  }
  const a = maxRise(), b = maxRise(FORGIVE);
  assert.ok(a > 105 && a < 140, 'v1.0 h=' + a);
  assert.ok(Math.abs(a - b) < 8, 'forgive should not rewrite jump height ' + a + ' vs ' + b);
});

t('dash gate: forgiving drift still cannot cross the crystal gap on foot', () => {
  const L = LD.buildLevel(), prog = LD.newProgress(), env = LD.makeEnv(L, prog);
  const storm = L.solids.find(s => s.x === 5070 && s.y === 770), floor = L.solids.find(s => s.x === 4580 && s.y === 770);
  const edgeX = floor.x + floor.w;
  function cross(plan, ab) {
    const p = LD.newPlayer(4700, 770);
    for (let f = 0; f < 20; f++) LD.step(p, { x: 1 }, ab, env, [], FORGIVE);
    for (let f = 0; f < 700; f++) {
      LD.step(p, plan(f, p), ab, env, [], FORGIVE);
      if (p.onGround && p.standing === storm) return true;
      if (p.y > 1200) return false;
    }
    return false;
  }
  const p0 = LD.newPlayer(4700, 770);
  for (let f = 0; f < 20; f++) LD.step(p0, { x: 1 }, {}, env, [], FORGIVE);
  let E = 0; while (p0.x <= edgeX - C.PW / 2) { LD.step(p0, { x: 1 }, {}, env, [], FORGIVE); E++; }
  let foot = 0;
  for (let a = E - 24; a < E + 30; a += 2) for (let b = a + 2; b < a + 70; b += 4) {
    if (cross(f => ({ x: 1, jumpP: f === a || f === b, jump: true }), { double: true, dash: false })) foot++;
  }
  assert.strictEqual(foot, 0, 'crossed on foot ' + foot);
  const hopped = cross(f => ({ x: 1, jumpP: f === E, jump: true, dashP: f === E + 10 }), { double: true, dash: true });
  assert.strictEqual(hopped, true, 'hop+dash should still clear');
});

t('wall leap and glide gates still require the ability under forgiving drift', () => {
  const L = LD.buildLevel(), env = LD.makeEnv(L, LD.newProgress());
  function climb(ab) {
    const p = LD.newPlayer(0, 0);
    p.x = 5900 - C.PW; p.y = 560; p.vy = 80; p.onGround = false; p.airT = 0.4; p.facing = 1;
    let best = p.y;
    for (let n = 0; n < 6; n++) {
      for (let f = 0; f < 70; f++) {
        const ev = LD.step(p, { x: 1, jumpP: f === 8, jump: f >= 8 && f < 30 }, ab, env, [], FORGIVE);
        if (p.y < best) best = p.y;
        if (p.y > 1100) return best;
        if (ev.includes('walljump')) break;
      }
    }
    return best;
  }
  const withWall = climb({ double: true, dash: true, wall: true, glide: false });
  const noWall = climb({ double: true, dash: true, wall: false, glide: false });
  assert.ok(withWall < noWall - 40, 'wall ' + withWall + ' vs ' + noWall);
  function rise(ab) {
    const p = LD.newPlayer(8900, 420); p.y = 300; p.airT = 1; p.vy = 40;
    for (let f = 0; f < 180; f++) LD.step(p, { x: 0, jump: true }, ab, env, [], FORGIVE);
    return p.y;
  }
  const gl = rise({ double: true, dash: true, wall: true, glide: true });
  const ng = rise({ double: true, dash: true, wall: true, glide: false });
  assert.ok(gl < ng - 30, 'glide y ' + gl + ' vs no glide ' + ng);
});

t('shell, cache prefixes and feature switches are in the build', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const old = fs.readFileSync(path.join(root, '..', 'lumina-drift-v1.0', 'sw.js'), 'utf8');
  assert.ok(html.includes('Lumina Drift v1.1'), 'visible v1.1 label');
  assert.ok(html.includes('../lumina-drift-v1.0/'), 'older version link');
  assert.ok(html.includes('id="fScenery"') && html.includes('id="fForgive"') && html.includes('id="fFeedback"') && html.includes('id="fProgress"') && html.includes('id="fStage"'));
  assert.ok(sw.includes('lumina-drift-main-'), sw.slice(0, 120));
  assert.ok(old.includes('lumina-drift-v1.0-'), old.slice(0, 80));
  assert.ok(!/k\.indexOf\('lumina-drift-'\)/.test(sw), 'latest worker must not wipe every lumina-drift cache');
  assert.ok(!/k\.indexOf\('lumina-drift-'\)/.test(old), 'frozen worker must not wipe every lumina-drift cache');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
