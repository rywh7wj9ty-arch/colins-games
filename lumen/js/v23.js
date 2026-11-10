/* LUMEN v2.3. Every behaviour here is off unless its switch in Settings → Features is on.
   With every 2.3 switch off the game behaves exactly like v2.2. */
import * as S from './stats.js';

export const FEATURES23 = [
  ['handling', 'Guideline handling', 'Hold rotate to pre-spin the next piece. Press hold again to bank it for the piece after this one.'],
  ['touch', 'Precise touch', 'Sideways drags stay on one column at a time. A hard drop needs a long, straight flick, so a soft drop does not misfire.'],
  ['clearghost', 'Clear ghost', 'A brighter landing ghost and a thin guide in the piece colour.'],
  ['queue', 'Clear next queue', 'The next piece and an available hold sit on a bright plate.'],
  ['calls', 'Combo calls', 'Back-to-back, combo and perfect clear get a readout beside the well.'],
  ['glass', 'Richer glass', 'Sharper highlights in the same colours. No blur and no red tint.'],
  ['linelight', 'Line-clear light', 'A clean flash along a cleared line, and a frame for a perfect clear.'],
  ['crisp', 'Crisp 60', 'Pieces are drawn on whole pixels, without motion blur, so the glass stays sharp.'],
  ['coach', 'First-run coach', 'A short note the first time you play.'],
  ['runcard', 'Run grade', 'A grade on the results screen, from Tetrises, spins, combos and pace.'],
];
const COACH_KEY = 'lumen.coach.v23';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** What a finger is doing, for the precise-touch switch. 'none' until the gesture is clearly one thing. */
export function preciseIntent(dx, dy, vx, vy, step) {
  const ax = Math.abs(dx), ay = Math.abs(dy), s = step || 28;
  if (dy > Math.max(52, s * 1.35) && vy > 1.15 && ay > ax * 2.1 && vy > Math.abs(vx) * 2) return 'hard';
  if (dy < -Math.max(46, s * 1.35) && vy < -0.75 && ay > ax * 1.8 && Math.abs(vy) > Math.abs(vx) * 1.6) return 'hold';
  if (ax < 20 && ay < 20) return 'none';
  if (ax >= 20 && ax >= ay * 1.15) return 'h';
  if (ay >= 22 && ay > ax * 1.15) return 'v';
  return 'none';
}
/** Column count for a sideways drag, with a little hysteresis so a shaky finger does not flicker. */
export function dragColumns(dx, step, prev) {
  const raw = dx / (step || 1);
  let t = prev | 0, guard = 0;
  while (raw > t + 0.62 && guard++ < 12) t++;
  while (raw < t - 0.62 && guard++ < 24) t--;
  return t;
}
/** Soft-drop rows. The first row waits until the finger has clearly moved down. */
export function softRows(dy, step) {
  const s = step || 28;
  if (dy < s * 0.7) return 0;
  return 1 + Math.floor((dy - s * 0.7) / (s * 0.85));
}

const ORDER = 'DCBAS';
/** Grade a finished game. Null for modes that are not a run. */
export function runGrade(s) {
  if (!s || s.mode === 'puzzle' || s.mode === 'tspin') return null;
  const c = s.clears || {}, t = s.tspin || {};
  let pts = (c.tetris || 0) * 4 + (c.triple || 0) * 2 + (c.double || 0);
  pts += ((t.full1 || 0) + (t.full2 || 0) * 2 + (t.full3 || 0) * 3 + (t.mini1 || 0) + (t.mini2 || 0)) * 3;
  pts += (s.pcs || 0) * 6 + Math.min(8, s.maxCombo || 0) + Math.min(6, Math.max(0, s.maxB2B || 0));
  if ((s.pps || 0) >= 1.5) pts += 4; else if ((s.pps || 0) >= 0.8) pts += 2;
  const per = s.lines > 0 ? pts / s.lines : 0;
  const grade = per >= 1.05 || pts >= 36 ? 'S' : per >= 0.65 ? 'A' : per >= 0.35 ? 'B' : per >= 0.15 ? 'C' : 'D';
  let best = 'A steady run';
  if (s.pcs) best = 'Perfect clear';
  else if (t.full3) best = 'T-spin triple';
  else if (t.full2) best = 'T-spin double';
  else if (t.full1) best = 'T-spin';
  else if (c.tetris) best = c.tetris > 1 ? c.tetris + ' Tetrises' : 'Tetris';
  else if ((s.maxCombo || 0) >= 2) best = 'Combo ×' + ((s.maxCombo | 0) + 1);
  return { grade, pts, best, line: grade + ' · ' + best };
}

export function installV23(App) {
  const P = App.prototype;
  P.feat23 = function (k) { const f = this.settings && this.settings.features23; return !!(f && f[k]); };

  P.v23Apply = function () {
    if (this.game) this.game.handling = this.feat23('handling');
    const b = $('#buttons');
    if (b) b.classList.toggle('show-180', this.feat23('handling') && this.settings.controls === 'buttons');
    if (!this.feat23('coach')) { const c = $('#coach'); if (c) c.hidden = true; }
    const call = $('#v23-call'); if (call && !this.feat23('calls')) call.classList.remove('on');
  };
  P.v23Start = function () {
    this.fx.lights = [];
    const c = $('#coach'); if (!c) return;
    if (!this.feat23('coach') || this.replay || this.mode === 'tspin' || S.loadJSON(COACH_KEY, false)) { c.hidden = true; return; }
    c.hidden = false;
    c.innerHTML = '<p><b>Drag</b> sideways to move. <b>Tap</b> to turn. <b>Flick down</b> to drop, <b>flick up</b> to hold. Each new option in 2.3 has its own switch in Settings.</p><button type="button">Got it</button>';
    c.querySelector('button').onclick = (e) => { e.stopPropagation(); S.saveJSON(COACH_KEY, true); c.hidden = true; };
  };
  P.v23Stop = function () { const c = $('#coach'); if (c) c.hidden = true; const call = $('#v23-call'); if (call) call.classList.remove('on'); };
  P.v23Call = function (e) {
    const el = $('#v23-call'); if (!el || !this.feat23('calls')) return;
    const parts = [];
    if (e.pc) parts.push('Perfect clear');
    if (e.b2b) parts.push('Back-to-back ×' + Math.max(1, e.b2bCount | 0));
    if ((e.combo | 0) >= 1) parts.push('Combo ×' + (e.combo + 1));
    if (!parts.length) return;
    const L = this.L; if (!L) return;
    el.style.left = Math.round(L.bx + 8) + 'px';
    el.style.top = Math.round(L.by + 8) + 'px';
    el.innerHTML = parts.map(p => `<span>${esc(p)}</span>`).join('');
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  };
  P.v23Results = function () {
    const el = $('#res-grade'); if (!el) return;
    if (!this.feat23('runcard') || !this.lastResult) { el.hidden = true; return; }
    const g = runGrade(this.lastResult.summary);
    if (!g) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `<span class="rg">${esc(g.grade)}</span><span class="rd">${esc(g.line)}</span>`;
    const prev = (this.stats.extra && this.stats.extra.bestGrade) || '';
    if (ORDER.indexOf(g.grade) > ORDER.indexOf(prev)) {
      this.stats.extra = this.stats.extra || {};
      this.stats.extra.bestGrade = g.grade;
      S.saveStats(this.stats);
    }
  };
  P.v23StatsExtra = function () {
    if (!this.feat23('runcard')) return;
    const g = this.stats.extra && this.stats.extra.bestGrade; if (!g) return;
    const grid = $('#life-grid'); if (grid) grid.insertAdjacentHTML('beforeend', `<div><span class="k">Best grade</span><span class="v">${esc(g)}</span></div>`);
  };
  P.v23Settings = function () {
    let h = '<h3>Features <span class="dim">new in 2.3 · switch any off to play that part like 2.2</span></h3>';
    for (const [k, label, hint] of FEATURES23) h += `<div class="set-row"><div><span class="l">${label}</span><span class="h">${hint}</span></div><button class="f23toggle${this.feat23(k) ? ' on' : ''}" data-f23="${k}" aria-label="${label}"></button></div>`;
    h += `<div class="set-row"><div><span class="l">All 2.3 features</span><span class="h">Does not change the 2.2 switches above</span></div><div class="seg2"><button data-f23all="1">All on</button><button data-f23all="0">All off</button></div></div>`;
    return h;
  };
  P.v23BindSettings = function (body) {
    const $$ = (s, r) => Array.from(r.querySelectorAll(s));
    $$('.f23toggle', body).forEach(t => t.addEventListener('click', e => {
      e.stopPropagation(); const k = t.dataset.f23;
      this.settings.features23 = { ...this.settings.features23, [k]: !this.feat23(k) };
      S.saveSettings(this.settings); this.applySettings(); this.buildSettings(); this.sound.ui();
    }));
    $$('[data-f23all]', body).forEach(b => b.addEventListener('click', e => {
      e.stopPropagation(); const on = b.dataset.f23all === '1'; const f = { ...this.settings.features23 };
      for (const [k] of FEATURES23) f[k] = on;
      this.settings.features23 = f; S.saveSettings(this.settings); this.applySettings(); this.buildSettings();
    }));
  };
}
