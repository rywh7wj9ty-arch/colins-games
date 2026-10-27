// HUE DASH core simulation: deterministic fixed-timestep physics shared by the game and the Node tests.
export const DT = 1 / 120;
export const G = 60, JUMP = 18, DJUMP = 16, PAD = 27, HOLD_T = 0.22, HOLD_G = 0.42;
export const PW = 0.3, PH = 1.4;
// forgiveness windows (seconds): coyote jump after leaving a ledge, buffered jump before landing, colour-touch grace
// v1.1: coyote time on (every level route re-verified by the solver), longer buffer, apex hang, step-up ledges
export const COYOTE = 0.09, BUFFER = 0.14, GRACE = 0.08, APEX_V = 4, APEX_G = 0.62, STEP_UP = 0.42, RAMP_T = 0.7;
export const COLORS = [null, 'magenta', 'gold', 'cyan'];
// v1.4 "tight" physics (Settings > Features): snappier jump, faster fall, wall-slide + one wall-jump per air time.
// Off = exact v1.3 physics. Levels are solved under both (tools/resolve.mjs).
export const PHYS = { tight: false };
export function setPhysics(on) { PHYS.tight = !!on; }
export const TIGHT = { JUMP: 19.2, DJUMP: 16.8, FALL_G: 1.3, SLIDE_V: 3.5, WALL_T: 2.5 };
// v1.4 boss chase: colour cycles on a beat; while you match it the boss falls back, otherwise it gains
export function bossCol(lvl, t) { return 1 + (Math.floor(t / lvl.boss.cp) % lvl.ncol); }

export function nextColor(c, n) { return (c % n) + 1; }

export function colorAt(p, t) {
  if (!p.fp) return p.c;
  return Math.floor((t + (p.fo || 0)) / p.fp) % 2 ? p.c2 : p.c;
}
export function platY(p, t, st) {
  let y = p.y;
  if (p.ma) y += p.ma * Math.sin((Math.PI * 2 * t) / p.mp + (p.ph || 0));
  if (p.fall && st && st.fallT[p.i] !== undefined) {
    const d = t - st.fallT[p.i] - 0.4;
    if (d > 0) y -= 12.5 * d * d;
  }
  return y;
}

// Build lookup buckets for a level once.
export function prepare(lvl) {
  if (lvl._b) return lvl;
  const B = 4, buckets = [];
  lvl.els.forEach((e, i) => {
    e.i = i;
    const x0 = e.x - 1, x1 = e.x + (e.w || 1) + 1;
    for (let k = Math.max(0, Math.floor(x0 / B)); k <= Math.floor(x1 / B); k++) (buckets[k] || (buckets[k] = [])).push(e);
  });
  Object.defineProperty(lvl, '_b', { value: buckets, enumerable: false });
  return lvl;
}

export function newState(lvl) {
  return { t: 0, step: 0, x: lvl.start || 2, y: 0, vy: 0, gs: 1, col: 1, jumps: 1, grounded: true, holdT: 0, holding: false,
    dead: false, cause: '', fin: false, onWall: false, wallPrev: false, wj: 1, wallT: 0, walls: 0, key: 0, bonus: 0, bx: lvl.boss ? (lvl.start || 2) - lvl.boss.gap : 0, gems: 0, boosts: 0, boostT: 0, switches: 0, jumpsN: 0, fallT: {}, grav: 0, padT: 0, events: null, airT: 0, bufT: 0, graceT: 0, coy: true, saves: 0 };
}
export function clone(s) { const c = { ...s }; c.fallT = { ...s.fallT }; return c; }
// smooth acceleration: eases up from 55% speed over the first RAMP_T seconds; boosts fade in and out
export function speedAt(lvl, s) {
  const k = Math.min(1, s.t / RAMP_T), ease = 0.55 + 0.45 * k * k * (3 - 2 * k);
  const b = s.boostT > 0 ? 4 * Math.min(1, (1.4 - s.boostT) / 0.18, s.boostT / 0.35) : 0;
  return (lvl.v0 + (lvl.v1 - lvl.v0) * Math.min(1, s.x / lvl.end)) * ease + b;
}

function die(s, cause) { s.dead = true; s.cause = cause; }

// inp: {jp: jump pressed this step, jh: jump held, sw: number of colour taps this step}
export function step(s, lvl, inp) {
  if (s.dead || s.fin) return s;
  const n = lvl.ncol;
  for (let k = 0; k < (inp.sw || 0); k++) { s.col = nextColor(s.col, n); s.switches++; }
  if (inp.jp) s.bufT = BUFFER;
  if (s.bufT > 0) {
    const coyote = !s.grounded && s.coy && s.airT < COYOTE && s.vy * s.gs <= 0;
    if (s.grounded || coyote) { s.vy = (PHYS.tight ? TIGHT.JUMP : JUMP) * s.gs; s.grounded = false; s.coy = false; s.holdT = 0; s.holding = !!inp.jh; s.jumpsN++; s.bufT = 0; }
    else if (inp.jp && PHYS.tight && s.wallPrev && s.wj > 0) { s.wj = 0; s.vy = TIGHT.JUMP * s.gs; s.holdT = 0; s.holding = true; s.jumpsN++; s.walls++; s.bufT = 0; }
    else if (inp.jp && s.jumps > 0) { s.jumps--; s.vy = (PHYS.tight ? TIGHT.DJUMP : DJUMP) * s.gs; s.holdT = 0; s.holding = true; s.jumpsN++; s.bufT = 0; }
    else s.bufT -= DT;
  }
  if (!inp.jh) s.holding = false;
  let g = G;
  if (s.holding && s.vy * s.gs > 0 && s.holdT < HOLD_T) { g *= HOLD_G; s.holdT += DT; }
  else if (Math.abs(s.vy) < APEX_V) g *= APEX_G;   // a little hang time at the top of every arc
  else if (PHYS.tight && s.vy * s.gs < 0) g *= TIGHT.FALL_G;   // v1.4: faster fall
  s.vy -= g * s.gs * DT;
  const t = s.t;
  const px = s.x, py = s.y;
  s.x += speedAt(lvl, s) * DT;
  s.y += s.vy * DT;
  if (s.boostT > 0) s.boostT -= DT;
  const wasG = s.grounded; s._mis = false; s.wallPrev = s.onWall; s.onWall = false;
  s.grounded = false;
  const bk = lvl._b[Math.floor(s.x / 4)] || [];
  let support = null;
  const gs = s.gs;
  for (const p of bk) {
    if (p.t !== 'p') continue;
    if (p.bon && !s.key) continue;   // v1.4 bonus route beams only exist once you hold the key
    const top = platY(p, t, s), bot = top - p.h;
    const xmin = s.x - PW, xmax = s.x + PW;
    const ymin = gs > 0 ? s.y : s.y - PH, ymax = gs > 0 ? s.y + PH : s.y;
    if (!(xmax > p.x && xmin < p.x + p.w && ymax > bot && ymin < top)) continue;
    const eps = p.ma ? 0.16 : 0.06;
    if (gs > 0) {
      if (s.vy <= 0 && py >= top - eps) { s.y = top; s.vy = 0; s.grounded = true; if (!support || (s.x >= p.x && s.x <= p.x + p.w)) support = p; }
      else if (s.vy > 0 && py + PH <= bot + eps) { s.y = bot - PH; s.vy = 0; touch(s, p, t); }
      else if (top - s.y <= STEP_UP) { s.y = top; s.vy = 0; s.grounded = true; s.stepUps = (s.stepUps || 0) + 1; if (!support) support = p; }   // forgiving edge: clipped a lip, pop up onto it
      else if (PHYS.tight && px + PW <= p.x + 0.08) { s.x = p.x - PW - 0.001; s.onWall = true; }   // v1.4 wall contact instead of a crash
      else { die(s, 'crash'); return s; }
    } else {
      if (s.vy >= 0 && py <= bot + eps) { s.y = bot; s.vy = 0; s.grounded = true; if (!support || (s.x >= p.x && s.x <= p.x + p.w)) support = p; }
      else if (s.vy < 0 && py - PH >= top - eps) { s.y = top + PH; s.vy = 0; touch(s, p, t); }
      else if (s.y - bot <= STEP_UP) { s.y = bot; s.vy = 0; s.grounded = true; s.stepUps = (s.stepUps || 0) + 1; if (!support) support = p; }
      else if (PHYS.tight && px + PW <= p.x + 0.08) { s.x = p.x - PW - 0.001; s.onWall = true; }
      else { die(s, 'crash'); return s; }
    }
    if (s.dead) return s;
  }
  if (s.onWall) { if (!s.grounded && !support && s.vy * gs < -TIGHT.SLIDE_V) s.vy = -TIGHT.SLIDE_V * gs; s.wallT += DT; if (s.wallT > TIGHT.WALL_T) { die(s, 'crash'); return s; } } else s.wallT = 0;
  if (support) {
    s.jumps = 1; s.coy = true; s.airT = 0; s.wj = 1;
    touch(s, support, t);
    if (s.dead) return s;
    if (support.fall && s.fallT[support.i] === undefined) s.fallT[support.i] = t;
    if (support.pad && s._mis) { die(s, 'color'); return s; }
    if (support.pad) { s.vy = PAD * gs; s.grounded = false; s.holding = false; s.padT = 0.3; }
  }
  else { s.airT += DT; if (wasG && s.vy * s.gs <= 0) s.coy = true; }
  let mis = s._mis;
  // non-solid elements
  const ymin = gs > 0 ? s.y : s.y - PH, ymax = gs > 0 ? s.y + PH : s.y;
  for (const e of bk) {
    if (e.t === 'w') {
      if (s.x + PW > e.x - 0.12 && s.x - PW < e.x + 0.12 && ymax > e.y && ymin < e.y + e.h && e.c !== s.col) { mis = true; }
    } else if (e.t === 's') {
      const sy = gs > 0 || !e.up ? e.y : e.y;
      const y0 = e.up ? sy - 0.6 : sy, y1 = e.up ? sy : sy + 0.6;
      if (s.x + PW - 0.1 > e.x && s.x - PW + 0.1 < e.x + e.w && ymax > y0 + 0.05 && ymin < y1 - 0.05) { die(s, 'spike'); return s; }
    } else if (e.t === 'e') {
      const bit = 1 << e.k;
      if (!(s.gems & bit) && Math.abs(s.x - e.x) < 0.8 && e.y > ymin - 0.6 && e.y < ymax + 0.6) s.gems |= bit;
    } else if (e.t === 'b') {
      const bit = 1 << e.k;
      if (!(s.boosts & bit) && Math.abs(s.x - e.x) < 0.7 && e.y > ymin - 0.7 && e.y < ymax + 0.7) { s.boosts |= bit; s.boostT = 1.4; }
    } else if (e.t === 'K') {
      if (!s.key && s.col === e.c && Math.abs(s.x - e.x) < 0.8 && e.y > ymin - 0.6 && e.y < ymax + 0.6) s.key = 1;
    } else if (e.t === 'B') {
      if (s.key && !s.bonus && Math.abs(s.x - e.x) < 0.8 && e.y > ymin - 0.6 && e.y < ymax + 0.6) s.bonus = 1;
    } else if (e.t === 'G') {
      const bit = 1 << e.k;
      if (!(s.grav & bit) && s.x >= e.x) { s.grav |= bit; s.gs = -s.gs; s.grounded = false; s.jumps = 1; s.y += s.gs < 0 ? PH : -PH; s.vy = 0; }
    }
  }
  if (mis) { s.graceT += DT; if (s.graceT > GRACE) { die(s, 'color'); return s; } } else if (s.graceT > 0) { s.saves++; s.graceT = 0; }
  if (s.y < (lvl.minY ?? -14) || s.y > (lvl.maxY ?? 30)) { die(s, 'fall'); return s; }
  if (lvl.boss) { const sp = speedAt(lvl, s) * (s.col === bossCol(lvl, s.t) ? lvl.boss.slow : lvl.boss.fast); s.bx += sp * DT; if (s.bx > s.x - 0.8) { die(s, 'caught'); return s; } }
  s.t += DT; s.step++;
  if (s.x >= lvl.end) s.fin = true;
  return s;
}
function touch(s, p, t) {
  const c = colorAt(p, t);
  if (c && c !== s.col) s._mis = true;
}

// Script = sorted events [step, kind] kind: 'd' jump down, 'u' jump up, 's' colour tap.
export function runScript(lvl, script, opts = {}) {
  prepare(lvl);
  const s = newState(lvl);
  let i = 0, held = false;
  const max = opts.maxSteps || 120 * 120;
  const frames = opts.record ? [] : null;
  while (!s.dead && !s.fin && s.step < max) {
    let jp = false, sw = 0;
    while (i < script.length && script[i][0] <= s.step) {
      const k = script[i][1];
      if (k === 'd') { jp = true; held = true; } else if (k === 'u') held = false; else if (k === 's') sw++;
      i++;
    }
    step(s, lvl, { jp, jh: held, sw });
    if (frames) frames.push([s.x, s.y, s.col]);
  }
  return opts.record ? { s, frames } : s;
}

export function starsFor(lvl, r) {
  return [r.gems === 7, r.switches <= lvl.par, r.time <= lvl.target];
}
