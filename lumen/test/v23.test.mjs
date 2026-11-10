/* v2.3 rules, settings compatibility, and the pure parts of the new switches.
   Run: node lumen/test/v23.test.mjs */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, kicksFor, clearScore, lockDelayFor } from '../js/rules.js';
import { mergeSettings, recordGame, newStats, sanitizeStats, DEFAULT_SETTINGS } from '../js/stats.js';
import { preciseIntent, dragColumns, softRows, runGrade, FEATURES23 } from '../js/v23.js';

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('ok  ', name); }
  catch (e) { fail++; console.log('FAIL', name, '-', e && e.stack || e); }
}
const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const boardOf = (g) => g.board.map(r => Array.from(r).join('')).join('\n');
function script(handling) {
  const g = new Game({ seed: 99, handling, das: 133, arr: 10, sdf: 30 });
  for (let n = 0; n < 25 && !g.over; n++) {
    g.rotate(n % 2 ? 1 : -1);
    if (n % 3 === 0) g.moveLeft(); else if (n % 3 === 1) g.moveRight();
    if (n % 5 === 0) g.rotate(2);
    g.hardDrop();
  }
  return JSON.stringify(g.summary()) + '\n' + boardOf(g);
}

t('handling flag alone does not change a scripted game', () => {
  assert.equal(script(false), script(true));
});

t('IRS rotates the next piece only while handling is on', () => {
  const on = new Game({ seed: 1, handling: true });
  on.setQueue(['T', 'T', 'T', 'T', 'T', 'T', 'T']);
  on.rotHeld = 1; on.hardDrop();
  assert.equal(on.cur.type, 'T'); assert.equal(on.cur.rot, 1);
  const off = new Game({ seed: 1, handling: false });
  off.setQueue(['T', 'T', 'T', 'T', 'T', 'T', 'T']);
  off.rotHeld = 1; off.hardDrop();
  assert.equal(off.cur.rot, 0);
});

t('a successful rotate is not also applied to the next piece', () => {
  const g = new Game({ seed: 2, handling: true });
  g.setQueue(['T', 'T', 'T', 'T', 'T', 'T', 'T']);
  assert.equal(g.queueRotate(1), true);
  assert.equal(g.pendingRot, 0);
  g.hardDrop();
  assert.equal(g.cur.type, 'T'); assert.equal(g.cur.rot, 0);
});

t('rotate pressed with no piece is banked for the spawn', () => {
  const g = new Game({ seed: 1, handling: true });
  g.cur = null; g.queueRotate(1); g.spawn('T');
  assert.equal(g.cur.rot, 1); assert.equal(g.pendingRot, 0);
  const off = new Game({ seed: 1, handling: false });
  off.cur = null; off.queueRotate(1); off.spawn('T');
  assert.equal(off.cur.rot, 0);
});

t('IHS banks a hold that could not be used', () => {
  const g = new Game({ seed: 3, handling: true });
  g.setQueue(['J', 'L', 'O', 'S', 'T', 'Z', 'I']);
  const first = g.cur.type;
  assert.equal(g.holdPiece(), true);
  assert.equal(g.hold, first); assert.equal(g.cur.type, 'J');
  assert.equal(g.queueHold(), false); assert.equal(g.pendingHold, true);
  g.hardDrop();
  assert.equal(g.hold, 'L'); assert.equal(g.cur.type, first); assert.equal(g.pendingHold, false);
  const off = new Game({ seed: 3, handling: false });
  off.setQueue(['J', 'L', 'O', 'S', 'T', 'Z', 'I']);
  const first2 = off.cur.type;
  off.holdPiece(); off.queueHold(); off.hardDrop();
  assert.equal(off.pendingHold, false); assert.equal(off.hold, first2); assert.equal(off.cur.type, 'L');
});

t('SRS kicks and lock delay are unchanged', () => {
  assert.deepEqual(kicksFor('T', 0, 1)[0], [0, 0]);
  assert.deepEqual(kicksFor('T', 0, 1)[1], [-1, 0]);
  assert.deepEqual(kicksFor('I', 0, 1)[1], [-2, 0]);
  assert.equal(kicksFor('T', 0, 2).length >= 5, true);
  assert.equal(clearScore({ lines: 4, level: 1 }), 800);
  assert.equal(lockDelayFor(1), 500);
  const g = new Game({ seed: 4 });
  g.setPiece('T', 0, 0, 20);
  assert.equal(g.rotate(1), true);
});

t('v2.2 settings and stats still load', () => {
  const raw = {
    das: 167, arr: 0, music: 0.4, sfx: 0.5, brightness: 1.1, ghost: false, pieceStyle: 'neon',
    features: { journey: false, beat: true, shatter: false, versus: true, challenges: true, skins: false, tspin: true, relax: true, replays: false, levelfeel: true },
  };
  const m = mergeSettings(raw);
  assert.equal(m.das, 167); assert.equal(m.arr, 0); assert.equal(m.music, 0.4); assert.equal(m.sfx, 0.5);
  assert.equal(m.brightness, 1.1); assert.equal(m.ghost, false); assert.equal(m.pieceStyle, 'neon');
  assert.equal(m.features.journey, false); assert.equal(m.features.beat, true); assert.equal(m.features.shatter, false);
  assert.equal(m.features.skins, false); assert.equal(m.features.versus, true);
  for (const [k] of FEATURES23) assert.equal(m.features23[k], true, k);
  const wiped = { ...m, features: {} };
  for (const k of Object.keys(DEFAULT_SETTINGS.features)) wiped.features[k] = false;
  assert.equal(wiped.features23.handling, true, 'v2.2 all-off must not clear 2.3 switches');
  const st = sanitizeStats({ version: 1, lifetime: { lines: 12, score: 400, clears: { tetris: 2 }, tspin: { full1: 1 } }, modes: { marathon: { played: 3, best: { score: 400, lines: 12, level: 2, timeMs: 1000, pps: 1 }, top: [{ score: 400, lines: 12 }] } }, achievements: { first_light: '2026-01-01' }, extra: { ghostWins: 2 } });
  assert.equal(st.lifetime.lines, 12); assert.equal(st.lifetime.clears.tetris, 2); assert.equal(st.extra.ghostWins, 2);
  assert.equal(st.modes.marathon.best.score, 400); assert.equal(st.modes.journey.played, 0);
  const out = recordGame(st, { mode: 'marathon', score: 900, lines: 8, level: 2, timeMs: 20000, pieces: 30, pps: 1.5, apm: 10, attack: 4, clears: { single: 0, double: 0, triple: 0, tetris: 2 }, tspin: { mini0: 0, mini1: 0, mini2: 0, full0: 0, full1: 0, full2: 0, full3: 0 }, pcs: 0, maxCombo: 1, maxB2B: 1, result: 'topout' });
  assert.equal(out.stats.modes.marathon.best.score, 900);
  assert.equal(out.stats.lifetime.lines, 20);
  assert.equal(out.records.score, true);
});

t('precise touch ignores a short fast flick that used to hard-drop', () => {
  assert.equal(preciseIntent(0, 30, 0, 1.2, 30), 'v');
  assert.equal(preciseIntent(0, 70, 0.1, 1.4, 30), 'hard');
  assert.equal(preciseIntent(40, 8, 0.4, 0.05, 30), 'h');
  assert.equal(preciseIntent(8, 6, 0, 0, 30), 'none');
  assert.equal(preciseIntent(0, -70, 0, -1, 30), 'hold');
  assert.equal(dragColumns(18, 30, 0), 0);
  assert.equal(dragColumns(20, 30, 0), 1);
  assert.equal(dragColumns(18, 30, 1), 1);
  assert.equal(softRows(10, 30), 0);
  assert.equal(softRows(22, 30), 1);
});

t('run grade', () => {
  assert.equal(runGrade({ mode: 'puzzle', lines: 4 }), null);
  assert.equal(runGrade({ mode: 'tspin', lines: 2 }), null);
  const s = runGrade({ mode: 'marathon', lines: 40, pps: 1.6, pcs: 1, maxCombo: 5, maxB2B: 3, clears: { tetris: 6, triple: 1, double: 2, single: 4 }, tspin: { full1: 1, full2: 1, full3: 0, mini1: 0, mini2: 0 } });
  assert.equal(s.grade, 'S'); assert.equal(s.best, 'Perfect clear');
  const d = runGrade({ mode: 'zen', lines: 0, pps: 0, clears: {}, tspin: {} });
  assert.equal(d.grade, 'D');
});

t('service-worker caches stay on separate prefixes', () => {
  const main = read('../sw.js');
  assert.match(main, /const VERSION = '2\.3\.0'/);
  assert.match(main, /const CACHE_PREFIX = 'lumen23-'/);
  assert.match(main, /k\.startsWith\(CACHE_PREFIX\)/);
  assert.match(main, /js\/v23\.js/);
  assert.doesNotMatch(main, /startsWith\('lumen-'\)/);
  const expect = [
    ['../../lumen-v1.0/sw.js', 'lumenv10-', '2026.10.09-2'],
    ['../../lumen-v2.0/sw.js', 'lumenv20-', '2.0.2'],
    ['../../lumen-v2.1/sw.js', 'lumenv21-', '2.1.1'],
    ['../../lumen-v2.2/sw.js', 'lumenv22-', '2.2.1'],
  ];
  for (const [file, prefix, ver] of expect) {
    const src = read(file);
    assert.match(src, new RegExp("const CACHE = '" + prefix + "'"), file);
    assert.match(src, new RegExp(ver.replace(/\./g, '\\.')), file);
    assert.match(src, new RegExp("startsWith\\('" + prefix + "'\\)"), file);
  }
  const frozen = read('../../lumen-v2.3/sw.js');
  assert.match(frozen, /const CACHE_PREFIX = 'lumenv23-'/);
  assert.match(frozen, /const VERSION = '2\.3\.0'/);
  assert.doesNotMatch(frozen, /const CACHE_PREFIX = 'lumen23-'/);
  for (const file of ['../../lumen-v2.2/game.js', '../../lumen-v2.1/game.js', '../../lumen-v2.0/game.js', '../../lumen-v1.0/game.js']) {
    assert.match(read(file), /lumen-v2\.3\//, file);
  }
  const live = read('../game.js');
  assert.match(live, /VERSION = '2\.3'/);
  assert.match(live, /lumen-v2\.2\//);
});

console.log(fail ? `\n${pass} passed, ${fail} failed` : `\n${pass} passed`);
process.exit(fail ? 1 : 0);
