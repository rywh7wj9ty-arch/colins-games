/* LUMEN v2.2: Journey, Versus CPU, Challenges, Relax, Replays, skins, T-spin tutorial, beat music, shatter and level feel.
   Everything here is installed onto the App and only runs when its switch in Settings → Features is on.
   With every switch off the game behaves exactly like v2.1. */
import { Game, COLS, ROWS, HIDDEN, SHAPES, TYPES, hashString, localDateStr } from './rules.js';
import { WORLDS } from './worlds.js';
import * as S from './stats.js';

export const FEATURES = [
  ['journey', 'Journey', 'A story path through the six worlds, each with its own rule'],
  ['beat', 'Music plays along', 'Turns, drops and clears add notes on the beat'],
  ['shatter', 'Big line clears', 'Glass cracks, light bursts through, a sunburst for a Tetris'],
  ['versus', 'Versus CPU', 'Battle an easy, medium or hard opponent with garbage lines'],
  ['challenges', 'Challenges', 'Daily and weekly special rules, a calendar and streaks'],
  ['skins', 'Skins', 'Unlockable piece styles and board skins'],
  ['tspin', 'T-spin coach', 'T-spin glow, callout, +50% bonus points and a tutorial'],
  ['relax', 'Relax', 'No game over, slow ambient music, soft visuals'],
  ['replays', 'Replays', 'Your best game in each mode is saved to watch back'],
  ['levelfeel', 'Level-up feel', 'Every 10 lines the sky, colours and tempo shift'],
];
export const MODE_INFO22 = {
  journey: { name: 'Journey', desc: 'Six worlds, six rules. A story in light.' },
  versus: { name: 'Versus CPU', desc: 'Send garbage, survive theirs.' },
  relax: { name: 'Relax', desc: 'No game over. Slow and soft.' },
  challenge: { name: 'Challenge', desc: 'Special rules, new every day and week.' },
  tspin: { name: 'T-spin tutorial', desc: 'Learn the twist.' },
};
export const STAGES = [
  { w: 0, goal: 10, level: 1, rule: 'none', title: 'I · Dawn Tide', story: 'The sea is quiet. Wake the light: clear 10 lines.' },
  { w: 1, goal: 12, level: 2, rule: 'tide', tide: 15000, title: 'II · Aurora Veil', story: 'The tide is rising. A grey line pushes up every 15 seconds.' },
  { w: 2, goal: 14, level: 3, rule: 'fast', gravityAdd: 4, title: 'III · Neon Rain', story: 'The storm is fast. Pieces fall quicker in the rain.' },
  { w: 3, goal: 14, level: 4, rule: 'nohold', title: 'IV · Crystal Hollow', story: 'Stone keeps what it is given. No Hold in the Hollow.' },
  { w: 4, goal: 16, level: 4, rule: 'dark', title: 'V · Deep Field', story: 'The stack fades into the dark. It glows only when a piece lands.' },
  { w: 5, goal: 20, level: 5, rule: 'sun', gravityAdd: 3, tide: 20000, title: 'VI · Solar Crown', story: 'Fall upward into the sun: fast, and the tide still rises.' },
];
export const RULES = {
  onlyI: { name: 'Only I pieces', d: 'Every piece is a long I.' },
  flip: { name: 'Upside down', d: 'The well is turned over: pieces fall upward.' },
  invisible: { name: 'Invisible', d: 'The stack vanishes. It flashes back when a piece lands.' },
  nohold: { name: 'No hold', d: 'Hold is switched off.' },
  fast: { name: 'Fast fall', d: 'Pieces fall much faster.' },
  tide: { name: 'Rising tide', d: 'A grey line rises every 10 seconds.' },
};
const RULE_IDS = Object.keys(RULES);
export const SKIN_TIERS = [ // lifetime lines needed
  { id: 'crystal', name: 'Crystal', lines: 40 }, { id: 'neon', name: 'Neon', lines: 150 },
  { id: 'stained', name: 'Stained glass', lines: 400 }, { id: 'frost', name: 'Frosted ice', lines: 800 },
];
export const CPU_LEVELS = {
  easy: { name: 'Easy', think: 1150, miss: 0.25, top: 5, hold: false, min: 700 },
  medium: { name: 'Medium', think: 620, miss: 0.12, top: 3, hold: false, min: 380 },
  hard: { name: 'Hard', think: 300, miss: 0, top: 1, hold: true, min: 170 },
};
export const TUT_BOARD = ['###.......', '##...#####', '###.######'];
const K = { journey: 'lumen.journey.v22', chal: 'lumen.challenges.v22', vs: 'lumen.versus.v22', rep: 'lumen.replays.v22' };
const REPLAYABLE = ['marathon', 'sprint', 'ultra', 'zen', 'daily', 'journey', 'relax', 'challenge'];
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtT = ms => { const t = Math.max(0, ms); return Math.floor(t / 60000) + ':' + String(Math.floor(t / 1000) % 60).padStart(2, '0') + '.' + String(Math.floor(t / 10) % 100).padStart(2, '0'); };
const fmtInt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ---------------- pure helpers (also used by the tests) ----------------
export function isoWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); const wk = Math.ceil(((t - y0) / 86400000 + 1) / 7);
  return t.getUTCFullYear() + '-W' + String(wk).padStart(2, '0');
}
export function challengeFor(kind, key) {
  const h = hashString((kind === 'daily' ? 'lumen-chal:' : 'lumen-week:') + key);
  if (kind === 'daily') return { kind, key, rules: [RULE_IDS[h % RULE_IDS.length]], goal: 20, level: 3, seed: h };
  const a = RULE_IDS[h % RULE_IDS.length]; let b = RULE_IDS[(h >>> 8) % RULE_IDS.length]; if (b === a || (a === 'onlyI' && b === 'nohold') || (b === 'onlyI' && a === 'nohold')) b = RULE_IDS[(RULE_IDS.indexOf(a) + 2) % RULE_IDS.length];
  return { kind, key, rules: [a, b], goal: 40, level: 3, seed: h };
}
/** Build Game options and view flags from a list of rules. */
export function rulesToOpts(rules, base = {}) {
  const def = { id: base.id, name: base.name, levelUp: false, goalLines: base.goal };
  const o = { def, startLevel: base.level || 1 }; const view = { flip: false, stackAlpha: 1, tide: 0 };
  for (const r of rules) {
    if (r === 'onlyI') o.bagTypes = ['I'];
    if (r === 'flip') view.flip = true;
    if (r === 'invisible') view.stackAlpha = 0;
    if (r === 'dark') view.stackAlpha = 0.18;
    if (r === 'nohold') o.noHold = true;
    if (r === 'fast') def.gravityAdd = 4;
    if (r === 'tide') view.tide = base.tide || 10000;
  }
  return { o, view };
}
// CPU: Pierre Dellacherie-style heuristics (aggregate height, holes, bumpiness, lines)
function evalBoard(b, lines) {
  let agg = 0, holes = 0, bump = 0, prev = -1, maxH = 0, wells = 0;
  const hs = new Array(COLS);
  for (let x = 0; x < COLS; x++) {
    let h = 0; for (let y = 0; y < ROWS; y++) if (b[y][x]) { h = ROWS - y; break; }
    hs[x] = h; agg += h; maxH = Math.max(maxH, h);
    for (let y = ROWS - h + 1; y < ROWS; y++) if (!b[y][x]) holes++;
    if (prev >= 0) bump += Math.abs(h - prev); prev = h;
  }
  for (let x = 0; x < COLS; x++) { const l = x ? hs[x - 1] : 99, r = x < COLS - 1 ? hs[x + 1] : 99; const d = Math.min(l, r) - hs[x]; if (d > 2) wells += d - 2; }
  return lines * 0.76 - agg * 0.51 - holes * 0.36 * 2 - bump * 0.18 - wells * 0.2 - (maxH > 14 ? (maxH - 14) * 2 : 0);
}
export function cpuCandidates(game, type) {
  const out = []; const b = game.board;
  for (let rot = 0; rot < (type === 'O' ? 1 : 4); rot++) {
    for (let x = -2; x < COLS; x++) {
      let y = HIDDEN - 2; if (!game.fits(type, rot, x, y)) continue;
      while (game.fits(type, rot, x, y + 1)) y++;
      const nb = b.map(r => r.slice());
      for (const [cx, cy] of SHAPES[type][rot]) nb[y + cy][x + cx] = 1;
      let lines = 0; for (let yy = ROWS - 1; yy >= 0; yy--) if (nb[yy].every(v => v)) { lines++; nb.splice(yy, 1); nb.unshift(new Uint8Array(COLS)); yy++; }
      out.push({ rot, x, score: evalBoard(nb, lines) });
    }
  }
  return out.sort((a, b2) => b2.score - a.score);
}
export function cpuChoose(game, lv, rnd = Math.random) {
  if (!game.cur) return null;
  const L = CPU_LEVELS[lv] || CPU_LEVELS.medium;
  let best = cpuCandidates(game, game.cur.type).map(c => ({ ...c, hold: false }));
  if (L.hold && !game.holdUsed) {
    const ht = game.hold || game.queue[0];
    if (ht) { const hb = cpuCandidates(game, ht).map(c => ({ ...c, hold: true })); best = best.concat(hb).sort((a, b) => b.score - a.score); }
  }
  if (!best.length) return null;
  if (L.miss && rnd() < L.miss) return best[Math.min(best.length - 1, Math.floor(rnd() * L.top))];
  return best[0];
}
export function cpuPlay(game, lv, rnd) {
  const m = cpuChoose(game, lv, rnd);
  if (!m) { game.hardDrop(); return; }
  if (m.hold) game.holdPiece();
  const p = game.cur; if (!p) return;
  if (game.fits(p.type, m.rot, m.x, p.y)) { p.rot = m.rot; p.x = m.x; }
  game.hardDrop();
}

// ---------------- App mixin ----------------
export function installV22(App) {
  const P = App.prototype;
  P.feat = function (k) { const f = this.settings.features; return !!(f && f[k]); };
  P.loadK = function (k, d) { return S.loadJSON(K[k], d) || d; };
  P.saveK = function (k, v) { S.saveJSON(K[k], v); };

  // ---- title / menus ----
  P.v22Modes = function () {
    let h = '';
    const card = (mode, name, desc, best, cls = '') => `<button class="mode v22 ${cls}" data-mode="${mode}"><span class="glint"></span><span class="m-name">${name}</span><span class="m-desc">${desc}</span><span class="m-best">${best}</span></button>`;
    if (this.feat('journey')) { const J = this.loadK('journey', { done: {} }); const n = Object.keys(J.done).length; h += card('journey', 'Journey', MODE_INFO22.journey.desc, n ? `${n} / 6 worlds lit` : 'Begin the story'); }
    if (this.feat('versus')) { const V = this.loadK('vs', {}); const w = Object.values(V).reduce((a, r) => a + (r.w | 0), 0); h += card('versus', 'Versus CPU', MODE_INFO22.versus.desc, w ? `${w} wins` : 'Easy · Medium · Hard'); }
    if (this.feat('challenges')) { const c = challengeFor('daily', this.dailyDate()); const C = this.loadK('chal', { days: {}, weeks: {} }); h += card('challenge', 'Challenges', `Today: ${RULES[c.rules[0]].name}`, C.days[c.key] ? 'Today done · streak ' + (C.streak | 0) : 'Daily + weekly rules'); }
    if (this.feat('relax')) h += card('relax', 'Relax', MODE_INFO22.relax.desc, 'Breathe out');
    return h;
  };
  P.v22TitleNav = function () {
    const nav = $('.title-nav'); if (!nav) return;
    let b = $('#nav-replays');
    if (this.feat('replays')) { if (!b) { b = document.createElement('button'); b.id = 'nav-replays'; b.dataset.go = 'replays'; b.textContent = 'Replays'; nav.insertBefore(b, nav.children[1] || null); } }
    else if (b) b.remove();
  };
  P.v22ModeClick = function (mode) {
    if (mode === 'journey') { this.show('journey', true); return true; }
    if (mode === 'versus') { this.show('versus', true); return true; }
    if (mode === 'challenge') { this.show('challenges', true); return true; }
    return false;
  };
  P.v22Show = function (name) {
    if (name === 'journey') this.buildJourney();
    if (name === 'versus') this.buildVersus();
    if (name === 'challenges') this.buildChallenges();
    if (name === 'replays') this.buildReplays();
    if (name === 'howto') { const b = $('#tut-btn'); if (b) b.hidden = !this.feat('tspin'); }
  };

  // ---- game options per mode ----
  P.v22Opts = function (mode, extra) {
    this.view22 = { flip: false, stackAlpha: 1, tide: 0, world: null };
    const fb = this.feat('tspin') ? { tspinBonus: 0.5 } : {};
    if (extra && extra.replay) { const d = extra.replay; this.view22 = { ...this.view22, ...(d.view || {}) }; return { ...d.opts, seed: d.seed, tspinBonus: d.opts.tspinBonus || 0 }; }
    if (mode === 'journey') {
      const st = STAGES[this.jStage | 0];
      const { o, view } = rulesToOpts(st.rule === 'sun' ? ['flip', 'tide'] : [st.rule], { id: 'journey', name: 'Journey', goal: st.goal, level: st.level, tide: st.tide });
      if (st.gravityAdd) o.def.gravityAdd = st.gravityAdd;
      this.view22 = { ...this.view22, ...view, world: st.w }; return { ...o, ...fb };
    }
    if (mode === 'challenge') {
      const c = this.chal; const { o, view } = rulesToOpts(c.rules, { id: 'challenge', name: 'Challenge', goal: c.goal, level: c.level });
      this.view22 = { ...this.view22, ...view, world: hashString(c.key) % WORLDS.length }; return { ...o, seed: c.seed, ...fb };
    }
    if (mode === 'relax') return { def: { id: 'relax', name: 'Relax', levelUp: false, maxGravityLevel: 1, relax: true, noTopOut: true }, ...fb };
    if (mode === 'versus') return { def: { id: 'versus', name: 'Versus', levelUp: true }, ...fb };
    if (mode === 'tspin') return { def: { id: 'tspin', name: 'T-spin tutorial', levelUp: false, maxGravityLevel: 1 }, tspinBonus: 0.5 };
    return fb;
  };
  P.v22WorldFor = function (g) {
    if (this.view22 && this.view22.world != null) return this.view22.world;
    if (this.mode === 'relax') return Math.floor(g.lines / 15) % WORLDS.length;
    if (this.mode === 'tspin') return 3;
    return null;
  };

  // ---- start / stop ----
  P.v22Start = function () {
    const g = this.game, v = this.view22 || {};
    this.fx.flip = !!v.flip; this.fx.stackAlpha = v.stackAlpha; this.fx.reveal = 0; this.fx.cracks = [];
    this.tideNext = v.tide ? v.tide : 0;
    this.lfTier = 0; this.sound.tempoMul = 1;
    document.body.classList.toggle('relax', this.mode === 'relax');
    this.fx.shakeOn = this.mode !== 'relax' && this.settings.shake && !this.reducedMotion;
    if (this.replay) $('#ghostcv').style.display = 'none';
    $('#cpucv').style.display = 'none'; $('#gmeter').style.display = 'none';
    $('#replay-bar').hidden = !this.replay; $('#tut-tip').hidden = true;
    this.cpu = null;
    if (this.mode === 'versus') {
      const lv = this.settings.cpuLevel || 'medium';
      this.cpu = new Game({ mode: 'versus', seed: (g.seed ^ 0x5bd1e995) >>> 0, def: { id: 'versus', levelUp: false } });
      this.cpuLv = lv; this.cpuT = 0; this.cpuThink = CPU_LEVELS[lv].think; this.cpuRnd = Math.random;
      $('#cpucv').style.display = ''; $('#gmeter').style.display = ''; this.placeV22(); this.drawCpu();
    }
    if (this.mode === 'tspin') this.tutReset(true);
    if (this.mode === 'journey' && !this.replay) { const st = STAGES[this.jStage | 0]; this.popup(st.title, st.story, 'world', WORLDS[st.w].accent); }
    if (this.mode === 'challenge' && !this.replay) this.popup(this.chal.rules.map(r => RULES[r].name).join(' + '), `clear ${this.chal.goal} lines`, 'world', WORLDS[this.world].accent);
    this.rec = null;
    if (this.feat('replays') && !this.replay && REPLAYABLE.includes(this.mode)) {
      this.rec = { mode: this.mode, seed: g.seed, opts: this.lastOpts, view: { ...v }, r: [], last: '' };
    }
  };
  P.v22Stop = function () {
    this.cpu = null; this.replay = null; this.rec = null;
    this.fx.flip = false; this.fx.stackAlpha = 1; this.fx.cracks = [];
    this.sound.tempoMul = 1; document.body.classList.remove('relax'); this.fx.shakeOn = this.settings.shake && !this.reducedMotion;
    const ids = ['#cpucv', '#gmeter']; ids.forEach(i => { const e = $(i); if (e) e.style.display = 'none'; });
    const tc = $('#tspin-call'); if (tc) tc.classList.remove('on'); const rb = $('#replay-bar'); if (rb) rb.hidden = true; const tt = $('#tut-tip'); if (tt) tt.hidden = true;
  };
  P.placeV22 = function () {
    const L = this.L; if (!L) return; const cv = $('#cpucv'); const c = L.cell;
    let cell;
    if (L.side) {
      cell = Math.max(4, Math.floor(Math.min(L.hold.w * 0.95 / 10, (L.h - (L.next.y + L.next.h + c * 1.2) - 40) / 20)));
      cv.style.left = Math.round(L.next.x + 4) + 'px'; cv.style.top = Math.round(L.next.y + L.next.h + c * 1.2) + 'px';
    } else {
      cell = Math.max(3, Math.floor(c * 0.32)); cv.style.left = Math.round(L.bx + L.bw - cell * 10 - 4) + 'px'; cv.style.top = Math.round(L.by + 4) + 'px';
    }
    cv.width = cell * 10; cv.height = cell * 20 + 16; cv.style.width = cell * 10 + 'px'; cv.style.height = (cell * 20 + 16) + 'px'; this.cpuCell = cell;
    const gm = $('#gmeter'); gm.style.left = Math.round(L.bx - Math.max(6, c * 0.28) - 6) + 'px'; gm.style.top = L.by + 'px'; gm.style.height = L.bh + 'px'; gm.style.setProperty('--cell', c + 'px');
  };
  P.drawCpu = function () {
    const cv = $('#cpucv'); const cpu = this.cpu; if (!cpu || cv.style.display === 'none') return; const x = cv.getContext('2d'), c = this.cpuCell || 4;
    x.clearRect(0, 0, cv.width, cv.height);
    x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(0, 16, cv.width, c * 20);
    const pal = WORLDS[this.world].pieces;
    for (let y = 0; y < 20; y++) for (let i = 0; i < 10; i++) { const id = cpu.board[y + HIDDEN][i]; if (id) { x.fillStyle = id === 8 ? '#c9d3ea' : pal[id - 1]; x.fillRect(i * c, 16 + y * c, c - 1, c - 1); } }
    const pend = cpu.pendingGarbage; if (pend) { x.fillStyle = '#ffd36b'; x.fillRect(0, 16 + c * (20 - Math.min(20, pend)), 2, c * Math.min(20, pend)); }
    x.fillStyle = '#ffffff'; const lab = 'CPU · ' + CPU_LEVELS[this.cpuLv].name.toUpperCase(); let fs = 11; x.font = `600 ${fs}px Outfit, sans-serif`; while (fs > 7 && x.measureText(lab).width > cv.width) { fs--; x.font = `600 ${fs}px Outfit, sans-serif`; } x.fillText(lab, 0, 11);
  };

  // ---- per frame ----
  P.v22Frame = function (dt, slow) {
    const g = this.game; if (!g || g.over) return;
    if (this.cpu) {
      this.cpuT += dt * 1000 * slow;
      if (!this.cpu.over && this.cpuT >= this.cpuThink) { this.cpuT = 0; cpuPlay(this.cpu, this.cpuLv, this.cpuRnd); this.cpuThink = Math.max(CPU_LEVELS[this.cpuLv].min, this.cpuThink * 0.994); }
      let changed = false;
      for (const e of this.cpu.drainEvents()) {
        if (e.type === 'clear' && e.attack) { const rem = this.cpu.cancelGarbage(e.attack); if (rem) { g.queueGarbage(rem); this.popup('Incoming', rem + (rem > 1 ? ' lines' : ' line'), 'combo', '#ffe27a', 0.8, 0.12); } }
        if (e.type === 'end') { g.end('win'); }
        if (e.type === 'lock' || e.type === 'garbage') changed = true;
      }
      if (changed) this.drawCpu();
    }
    if (this.tideNext && !this.replay && g.time >= this.tideNext) { g.queueGarbage(1); this.tideNext += this.view22.tide; }
    const gm = $('#gmeter'); if (this.cpu) { const p = Math.min(20, g.pendingGarbage); gm.style.setProperty('--n', p); }
  };
  P.v22Sample = function () {
    const r = this.rec, g = this.game; if (!r || !g || !g.cur) return;
    const p = g.cur, k = p.x + ',' + p.y + ',' + p.rot;
    if (k !== r.last) { r.last = k; r.r.push([0, Math.round(g.time), p.x, p.y, p.rot]); if (r.r.length > 60000) this.rec = null; }
  };

  // ---- per event ----
  P.v22Event = function (e, g) {
    const r = this.rec;
    if (r) {
      if (e.type === 'lock') r.r.push([1, Math.round(g.time), e.rot, e.x, e.y, e.lr ? 1 : 0, e.lk, g.score, e.piece]);
      else if (e.type === 'hold') r.r.push([2, Math.round(g.time)]);
      else if (e.type === 'gq') r.r.push([3, Math.round(g.time), e.n, e.hole]);
    }
    if (this.feat('beat')) {
      if (e.type === 'rotate') this.sound.beatNote('rot');
      else if (e.type === 'harddrop') this.sound.beatNote('drop', e.dist);
      else if (e.type === 'lock' && !e.lines) this.sound.beatNote('lock');
      else if (e.type === 'hold') this.sound.beatNote('hold');
      else if (e.type === 'clear' && e.lines) this.sound.beatNote('clear', e.lines);
    }
    if (e.type === 'lock' && this.fx.stackAlpha != null && this.fx.stackAlpha < 1) this.fx.reveal = 0.9;
    if (e.type === 'garbage') { this.fx.stackDirty = true; this.input.rumble(0.5, 120); this.sound.hold(); }
    if (e.type === 'clear') {
      if (this.feat('shatter') && (e.lines || e.pc)) {
        const tet = e.lines === 4 || e.pc;
        if (e.lines) this.fx.addCracks(e.rows, e.lines, tet);
        if (!this.reducedMotion) this.slowT = Math.max(this.slowT || 0, tet ? 0.95 : e.lines >= 2 ? 0.25 : 0);
        if (tet) { this.bg.flash = 0.9; this.fx.addShake(7, 0.4); this.megaFlash(); }
      }
      if (e.spin !== 'none' && (this.feat('tspin') || this.mode === 'tspin')) this.tspinCall(e);
      if (this.cpu && e.attack) { const rem = g.cancelGarbage(e.attack); if (rem) { this.cpu.queueGarbage(rem); this.popup('Sent', '+' + rem, 'combo', '#ffffff', 0.8, 0.12); this.drawCpu(); } }
      if (this.feat('levelfeel') && this.mode !== 'tspin') {
        const tier = Math.floor(g.lines / 10);
        if (tier > (this.lfTier | 0)) { this.lfTier = tier; this.levelFeel(tier); }
      }
    }
    if (e.type === 'lock' && this.mode === 'tspin' && !this.replay) this.tutLock(e, g);
  };
  P.megaFlash = function () {
    const el = document.createElement('div'); el.className = 'mega-flash'; document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  };
  P.tspinCall = function (e) {
    const el = $('#tspin-call'); if (!el) return;
    el.innerHTML = `<span class="tc-main">${esc(e.name)}</span>${e.bonus ? `<span class="tc-sub">T-spin bonus +${fmtInt(e.bonus)}</span>` : ''}`;
    const L = this.L; const yy = e.rows && e.rows.length ? L.by + (e.rows[0] - HIDDEN) * L.cell : L.by + L.bh * 0.55;
    el.style.left = (L.bx + L.bw / 2) + 'px'; el.style.top = Math.max(L.by + 40, yy - L.cell * 2) + 'px';
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  };
  P.levelFeel = function (tier) {
    const hue = ((tier % 5) - 2) * 0.13 || 0.08;
    this.bg.setWorld(this.world, false, hue);
    this.sound.tempoMul = 1 + 0.025 * (tier % 6);
    this.fx.prevWorld = this.fx.world; this.fx.wave = 0; this.fx.pulseBoard = Math.max(this.fx.pulseBoard, 0.6);
    const r = document.documentElement.style; const w = WORLDS[this.world];
    r.setProperty('--accent', tier % 2 ? w.accent2 : w.accent); r.setProperty('--accent2', tier % 2 ? w.accent : w.accent2);
  };

  // ---- T-spin tutorial ----
  P.tutReset = function (first) {
    const g = this.game; g.setBoard(TUT_BOARD); g.setQueue(['T', 'T', 'T', 'T', 'T', 'T']); g.setPiece('T', 0, 3, HIDDEN - 1); g.lowest = g.cur.y;
    this.fx.stackDirty = true; this.fx.vis = null; this.tutTries = first ? 0 : (this.tutTries | 0) + 1;
    const tip = $('#tut-tip'); tip.hidden = false;
    tip.innerHTML = this.tutTries ? '<b>So close.</b> Turn the T once, slide it so its long side sits over the narrow gap, <b>soft drop</b> (not hard drop) to the bottom, then turn it the same way again to twist it under the ledge.'
      : '<b>T-spin tutorial.</b> A T-spin is when the T twists into a slot it could not drop into. 1&nbsp;Turn the T once (right). 2&nbsp;Slide it left one step so its stem lines up with the narrow gap. 3&nbsp;<b>Soft drop</b> to the bottom. 4&nbsp;Turn right again: it twists under the ledge.';
  };
  P.tutLock = function (e, g) {
    if (e.spin === 'full' && e.lines >= 2) {
      $('#tut-tip').innerHTML = '<b>T-spin double!</b> That is worth 1,200 points at level 1 plus the bonus. In real games, leave a T-shaped slot under an overhang and twist into it.';
      this.sound.success(); g.end('complete');
    } else setTimeout(() => { if (this.game === g && !g.over) this.tutReset(false); }, 50);
  };

  // ---- end of game ----
  P.v22End = function (e, g, summary) {
    if (this.replay) {
      this.running = false; this.popup('Replay over', '', 'big', '#ffffff');
      this.timers.push(setTimeout(() => { this.quit(); this.show('replays', false); }, 1600)); return true;
    }
    if (this.mode === 'tspin') {
      this.running = false; this.popup(e.result === 'complete' ? 'T-Spin Double' : 'Tutorial', 'tutorial complete', 'big', WORLDS[this.world].pieces[5]);
      const S2 = this.stats; S2.extra.tspinTut = 1; S.saveStats(S2);
      this.timers.push(setTimeout(() => { this.quit(); this.show('howto', false); }, 2600)); return true;
    }
    return false;
  };
  P.v22Record = function (e, summary) { // after stats are recorded, for every normal game
    this.saveReplay(summary);
    if (this.mode === 'journey' && e.result === 'complete') {
      const J = this.loadK('journey', { done: {} }); const st = STAGES[this.jStage | 0];
      const stars = summary.timeMs <= st.goal * 5500 ? 3 : summary.timeMs <= st.goal * 9000 ? 2 : 1;
      const prev = J.done[this.jStage] || { stars: 0, ms: null };
      J.done[this.jStage] = { stars: Math.max(prev.stars, stars), ms: prev.ms == null ? summary.timeMs : Math.min(prev.ms, summary.timeMs) };
      this.saveK('journey', J); this.jStars = stars;
    }
    if (this.mode === 'challenge' && e.result === 'complete') {
      const C = this.loadK('chal', { days: {}, weeks: {} }); const c = this.chal;
      if (c.kind === 'daily') {
        const had = C.days[c.key]; C.days[c.key] = Math.min(had || Infinity, summary.timeMs);
        if (!had) { C.streak = C.last && S.addDays(C.last, 1) === c.key ? (C.streak | 0) + 1 : (C.last === c.key ? C.streak | 0 : 1); C.last = c.key; C.best = Math.max(C.best | 0, C.streak); }
        const ks = Object.keys(C.days).sort(); while (ks.length > 400) delete C.days[ks.shift()];
      } else C.weeks[c.key] = Math.min(C.weeks[c.key] || Infinity, summary.timeMs);
      this.saveK('chal', C);
    }
    if (this.mode === 'versus') {
      const V = this.loadK('vs', {}); const r = V[this.cpuLv] || { w: 0, l: 0 };
      if (e.result === 'win') r.w++; else r.l++; V[this.cpuLv] = r; this.saveK('vs', V);
    }
  };
  P.v22Results = function () {
    const s = this.lastResult && this.lastResult.summary; if (!s) return;
    const nx = $('#res-next');
    if (s.mode === 'versus') { $('#res-title').textContent = s.result === 'win' ? 'You win' : 'CPU wins'; const V = this.loadK('vs', {})[this.cpuLv] || { w: 0, l: 0 }; $('#res-sub').textContent = `${CPU_LEVELS[this.cpuLv].name} CPU · you ${V.w} – ${V.l} CPU`; $('#res-record').hidden = true; }
    if (s.mode === 'journey') {
      const st = STAGES[this.jStage | 0]; const ok = s.result === 'complete';
      $('#res-mode').textContent = 'Journey · ' + st.title;
      $('#res-title').textContent = ok ? (this.jStage === STAGES.length - 1 ? 'Journey complete' : 'World lit') : 'The light fades';
      $('#res-sub').textContent = ok ? '★'.repeat(this.jStars || 1) + '☆'.repeat(3 - (this.jStars || 1)) + ' · ' + fmtT(s.timeMs) : 'Try again: ' + st.story;
      nx.hidden = !(ok && this.jStage < STAGES.length - 1); nx.textContent = 'Next world';
      if (ok && this.jStage === STAGES.length - 1) this.celebrate();
    }
    if (s.mode === 'challenge') {
      const ok = s.result === 'complete'; const C = this.loadK('chal', { days: {}, weeks: {} });
      $('#res-mode').textContent = (this.chal.kind === 'daily' ? 'Daily challenge · ' : 'Weekly challenge · ') + this.chal.key;
      $('#res-title').textContent = ok ? 'Challenge complete' : 'Not this time';
      $('#res-sub').textContent = (ok ? fmtT(s.timeMs) + ' · ' : `${s.lines} of ${this.chal.goal} lines · `) + 'streak ' + (C.streak | 0);
      $('#res-record').hidden = true;
    }
    if (s.mode === 'relax') { $('#res-title').textContent = 'Rested'; $('#res-record').hidden = true; }
  };
  P.v22Next = function () { if (this.mode === 'journey') { this.jStage = Math.min(STAGES.length - 1, (this.jStage | 0) + 1); this.startGame('journey'); return true; } return false; };

  // ---- replays ----
  P.saveReplay = function (s) {
    const r = this.rec; this.rec = null; if (!r || !this.feat('replays') || s.pieces < 5) return;
    const all = this.loadK('rep', {}); const old = all[r.mode];
    const timed = r.mode === 'sprint' || r.mode === 'challenge' || r.mode === 'journey';
    const ok = timed ? s.result === 'complete' : true;
    if (!ok) return;
    const better = !old || (timed ? s.timeMs < old.timeMs : s.score > old.score);
    if (!better) return;
    all[r.mode] = { mode: r.mode, seed: r.seed, opts: r.opts, view: r.view, r: r.r, score: s.score, lines: s.lines, timeMs: s.timeMs, date: new Date().toISOString(), label: r.mode === 'journey' ? STAGES[this.jStage | 0].title : r.mode === 'challenge' ? this.chal.rules.map(x => RULES[x].name).join(' + ') : '' };
    try { this.saveK('rep', all); if (old) this.toast('Replay saved', 'Your new best ' + (MODE_INFO22[r.mode] ? MODE_INFO22[r.mode].name : r.mode) + ' game'); }
    catch (err) { /* storage full: keep the old one */ }
  };
  P.buildReplays = function () {
    const all = this.loadK('rep', {}); const el = $('#rep-list'); const keys = Object.keys(all);
    const nameOf = m => (MODE_INFO22[m] || {}).name || ({ marathon: 'Marathon', sprint: 'Sprint 40', ultra: 'Ultra', zen: 'Zen', daily: 'Daily' })[m] || m;
    el.innerHTML = keys.length ? keys.map(m => { const d = all[m]; const timed = m === 'sprint' || m === 'challenge' || m === 'journey';
      return `<div class="rep"><div><span class="rn">${esc(nameOf(m))}${d.label ? ' · ' + esc(d.label) : ''}</span><span class="rd">${timed ? fmtT(d.timeMs) : fmtInt(d.score)} · ${d.lines} lines · ${new Date(d.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span></div><button class="primary" data-rep="${m}">Watch</button></div>`; }).join('')
      : '<p class="empty">Finish a game and your best one in each mode is saved here.</p>';
    $$('[data-rep]', el).forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); this.watchReplay(b.dataset.rep); }));
  };
  P.watchReplay = function (m) {
    const d = this.loadK('rep', {})[m]; if (!d) return;
    this.replay = { data: d, i: 0, clock: 0, speed: 1, doneT: 0 };
    if (m === 'journey' && d.view && d.view.world != null) this.jStage = STAGES.findIndex(s => s.w === d.view.world);
    this.startGame(m, undefined, { replay: d });
    this.game.noGravity = true; $('#replay-bar').hidden = false; this.setReplaySpeed(1);
  };
  P.setReplaySpeed = function (s) { if (!this.replay) return; this.replay.speed = s; $$('#replay-bar [data-rs]').forEach(b => b.classList.toggle('on', +b.dataset.rs === s)); };
  P.stepReplay = function (dt, slow) {
    const R = this.replay, g = this.game; if (!R || !g || g.over) return;
    R.clock += dt * 1000 * R.speed * slow;
    const recs = R.data.r;
    while (R.i < recs.length && recs[R.i][1] <= R.clock && !g.over) {
      const q = recs[R.i++];
      if (q[0] === 0 && g.cur) { if (g.fits(g.cur.type, q[4], q[2], q[3])) { g.cur.x = q[2]; g.cur.y = q[3]; g.cur.rot = q[4]; } }
      else if (q[0] === 1) {
        if (!g.cur) continue;
        if (q[8] && g.cur.type !== q[8]) g.setPiece(q[8], q[2], q[3], q[4]);
        g.cur.rot = q[2]; g.cur.x = q[3]; g.cur.y = q[4]; g.lastRot = !!q[5]; g.lastKick = q[6];
        if (g.fits(g.cur.type, g.cur.rot, g.cur.x, g.cur.y)) { g.lock(); g.score = q[7]; }
      } else if (q[0] === 2) g.holdPiece();
      else if (q[0] === 3) g.queueGarbage(q[2], q[3]);
    }
    g.time = Math.min(R.clock, Math.max(g.time, R.clock));
    if (R.i >= recs.length && !g.over) { R.doneT += dt; if (R.doneT > 1.2) g.end('replay'); }
  };

  // ---- screens ----
  P.buildJourney = function () {
    const J = this.loadK('journey', { done: {} }); const el = $('#jr-list');
    let open = 0; while (open < STAGES.length - 1 && J.done[open]) open++;
    el.innerHTML = STAGES.map((st, i) => { const d = J.done[i]; const lock = i > open; const W = WORLDS[st.w];
      return `<button class="jr${lock ? ' locked' : ''}${d ? ' done' : ''}" data-st="${i}" ${lock ? 'disabled' : ''} style="--c1:${W.sky[1]};--c2:${W.accent}"><span class="jt">${esc(st.title)}</span><span class="js">${lock ? 'Locked: light the world before it' : esc(st.story)}</span><span class="jg">${d ? '★'.repeat(d.stars) + '☆'.repeat(3 - d.stars) + ' · ' + fmtT(d.ms) : st.goal + ' lines'}</span></button>`; }).join('');
    $$('[data-st]', el).forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); this.jStage = +b.dataset.st; this.startGame('journey'); }));
  };
  P.buildVersus = function () {
    const V = this.loadK('vs', {}); const el = $('#vs-list');
    el.innerHTML = Object.entries(CPU_LEVELS).map(([k, L]) => { const r = V[k] || { w: 0, l: 0 };
      return `<button class="mode" data-lv="${k}"><span class="m-name">${L.name}</span><span class="m-desc">${k === 'easy' ? 'Slow and forgiving.' : k === 'medium' ? 'Steady, a fair fight.' : 'Fast and sharp. Uses Hold.'}</span><span class="m-best">You ${r.w} – ${r.l} CPU</span></button>`; }).join('');
    $$('[data-lv]', el).forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); this.settings.cpuLevel = b.dataset.lv; S.saveSettings(this.settings); this.startGame('versus'); }));
  };
  P.buildChallenges = function () {
    const today = this.dailyDate(); const C = this.loadK('chal', { days: {}, weeks: {} });
    const d = challengeFor('daily', today), w = challengeFor('weekly', isoWeek(today));
    const card = (c, title) => `<div class="chal"><div><span class="ct">${title}</span><span class="cr">${c.rules.map(r => `<b>${RULES[r].name}</b> ${RULES[r].d}`).join('<br>')}</span><span class="cg">Clear ${c.goal} lines${(c.kind === 'daily' ? C.days[c.key] : C.weeks[c.key]) ? ' · best ' + fmtT(c.kind === 'daily' ? C.days[c.key] : C.weeks[c.key]) : ''}</span></div><button class="primary" data-ch="${c.kind}">Play</button></div>`;
    let streak = C.streak | 0; if (C.last && C.last !== today && S.addDays(C.last, 1) !== today) streak = 0;
    let html = card(d, 'Today · ' + today) + card(w, 'This week · ' + w.key);
    html += `<p class="sub">Streak ${streak} ${streak === 1 ? 'day' : 'days'} · best ${C.best | 0}</p>`;
    const [y, m] = today.split('-').map(Number); const first = new Date(y, m - 1, 1); const days = new Date(y, m, 0).getDate(); const off = (first.getDay() + 6) % 7;
    html += `<div class="cal"><div class="cal-h">${first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<i class="dn">${x}</i>`).join('')}${'<i></i>'.repeat(off)}`;
    for (let i = 1; i <= days; i++) { const k = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`; html += `<i class="${C.days[k] ? 'ok' : ''}${k === today ? ' today' : ''}">${i}</i>`; }
    html += '</div>';
    $('#ch-body').innerHTML = html;
    $$('[data-ch]', $('#ch-body')).forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); this.chal = b.dataset.ch === 'daily' ? d : w; this.startGame('challenge'); }));
  };

  // ---- settings: Features section ----
  P.v22Settings = function () {
    const s = this.settings; const lines = this.stats.lifetime.lines | 0;
    let h = '<h3>Features <span class="dim">new in 2.2 · switch any off to play it like 2.1</span></h3>';
    for (const [k, label, hint] of FEATURES) h += `<div class="set-row"><div><span class="l">${label}</span><span class="h">${hint}</span></div><button class="ftoggle toggle${this.feat(k) ? ' on' : ''}" data-f="${k}" aria-label="${label}"></button></div>`;
    h += `<div class="set-row"><div><span class="l">All features</span><span class="h">Switch every 2.2 feature on or off at once</span></div><div class="seg2"><button data-fall="1">All on</button><button data-fall="0">All off</button></div></div>`;
    if (this.feat('skins')) {
      const opt = (key, cur, list) => `<div class="seg skinseg" data-skey="${key}">${list.map(([v, t, need]) => `<button data-v="${v}" class="${cur === v ? 'on' : ''}" ${need > lines ? 'disabled title="Clear ' + need + ' lines to unlock"' : ''}>${t}${need > lines ? ' 🔒' : ''}</button>`).join('')}</div>`;
      const tiers = SKIN_TIERS.map(t => [t.id, t.name, t.lines]);
      h += `<div class="set-row"><div><span class="l">Piece style</span><span class="h">Unlock more by clearing lines (${fmtInt(lines)} so far)</span></div>${opt('pieceStyle', s.pieceStyle, [['glass', 'Glass', 0], ...tiers])}</div>`;
      h += `<div class="set-row"><div><span class="l">Board skin</span><span class="h">Crystal 40 · Neon 150 · Stained 400 · Frost 800 lines</span></div>${opt('boardSkin', s.boardSkin, [['classic', 'Classic', 0], ...tiers])}</div>`;
    }
    return h;
  };
  P.v22BindSettings = function (body) {
    $$('.ftoggle', body).forEach(t => t.addEventListener('click', e => { e.stopPropagation(); const k = t.dataset.f; this.settings.features = { ...this.settings.features, [k]: !this.feat(k) }; S.saveSettings(this.settings); this.applySettings(); this.buildSettings(); this.sound.ui(); }));
    $$('[data-fall]', body).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const on = b.dataset.fall === '1'; const f = {}; for (const [k] of FEATURES) f[k] = on; this.settings.features = f; S.saveSettings(this.settings); this.applySettings(); this.buildSettings(); }));
    $$('.skinseg', body).forEach(seg => seg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled) return; e.stopPropagation(); this.setSetting(seg.dataset.skey, b.dataset.v); $$('button', seg).forEach(x => x.classList.toggle('on', x === b)); }));
  };
  P.v22Apply = function () {
    const s = this.settings, lines = this.stats ? this.stats.lifetime.lines | 0 : 0;
    const okSkin = v => !SKIN_TIERS.find(t => t.id === v && t.lines > lines);
    const on = this.feat('skins');
    this.fx.pieceStyle = on && okSkin(s.pieceStyle) ? s.pieceStyle : 'glass';
    this.fx.boardSkin = on && okSkin(s.boardSkin) ? s.boardSkin : 'classic';
    this.fx.tspinHint = this.feat('tspin');
  };
}
