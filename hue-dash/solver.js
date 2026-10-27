import { prepare, newState, clone, step, bossCol } from './logic.js?v=202610271655';
// Beam search over jump decisions; colour taps chosen just-in-time (one step dry run).
export function solve(lvl, opts = {}) {
  const { width = 260, K = 4 } = opts;
  prepare(lvl);
  const holds = [1, 9, 18, 27];
  let beam = [{ s: newState(lvl), hold: 0, hist: null }];
  let best = null;
  const maxSteps = 120 * 70;
  for (let tick = 0; beam.length && tick * K < maxSteps; tick++) {
    const next = new Map();
    for (const b of beam) {
      const acts = [-1];
      if (b.hold <= 0 && (b.s.grounded || b.s.jumps > 0)) acts.push(...holds);
      for (const a of acts) {
        let s = clone(b.s), hold = b.hold, hist = b.hist, ok = true;
        for (let k = 0; k < K; k++) {
          let jp = false;
          if (k === 0 && a > 0) { jp = true; hold = a; hist = { p: hist, e: [s.step, 'd'] }; }
          const jh = hold > 0;
          // just-in-time colour
          let sw = 0;
          for (let tries = 0; tries < lvl.ncol; tries++) {
            const d = clone(s); step(d, lvl, { jp, jh, sw: tries });
            if (!(d.dead && d.cause === 'color')) { sw = tries; break; }
            sw = tries;
          }
          // v1.4 boss levels: if another colour is also safe and matches the boss, prefer it
          if (lvl.boss) { const bc = bossCol(lvl, s.t); for (let tries = 0; tries < lvl.ncol; tries++) { const d = clone(s); step(d, lvl, { jp, jh, sw: tries }); if (!d.dead && d.col === bc) { sw = tries; break; } } }
          for (let q = 0; q < sw; q++) hist = { p: hist, e: [s.step, 's'] };
          const st0 = s.step;
          step(s, lvl, { jp, jh, sw });
          if (hold > 0) { hold--; if (hold === 0) hist = { p: hist, e: [st0 + 1, 'u'] }; }
          if (s.dead) { ok = false; break; }
          if (s.fin) break;
        }
        if (!ok) continue;
        const nb = { s, hold, hist };
        if (s.fin) {
          const sc = (opts.bonus ? s.bonus * 1e8 : 0) + s.gems * 1e6 - s.t * 1000 - s.switches;
          if (!best || sc > best.sc) best = { sc, nb };
          continue;
        }
        const key = [Math.round(s.y * 3), Math.round(s.vy / 3), s.jumps, s.gs, s.gems, s.boosts, hold > 0 ? 1 : 0, Math.round(s.x * 2), s.wj, s.key, s.bonus, lvl.boss ? Math.round((s.x - s.bx) / 2) : 0].join(',');
        const sc = (opts.bonus ? (s.bonus * 4e6 + s.key * 2e6) : 0) + popcount(s.gems) * 1e6 + popcount(s.boosts) * 1e4 + s.x * 10 - s.switches * 0.5 + (s.grounded ? 1 : 0) + (lvl.boss ? (s.x - s.bx) * 2 : 0);
        const o = next.get(key);
        if (!o || o.sc < sc) next.set(key, { ...nb, sc });
      }
    }
    beam = [...next.values()].sort((a, b) => b.sc - a.sc).slice(0, width);
  }
  if (!best) return null;
  const ev = []; for (let h = best.nb.hist; h; h = h.p) ev.push(h.e);
  ev.reverse();
  const s = best.nb.s;
  return { script: ev, gems: s.gems, time: s.t, switches: s.switches, boosts: s.boosts, bonus: s.bonus, key: s.key };
}
function popcount(v) { let c = 0; while (v) { c += v & 1; v >>= 1; } return c; }
