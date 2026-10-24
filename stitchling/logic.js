// Stitchling: pure game logic (no DOM) so it can be tested headlessly in node.
export const DT = 1 / 60;
const G_UP_HELD = 24, G = 44, JUMP_V = 12.6, SPRING_V = 21, SPONGE_V = 15.5, TERM = -30;
export const PW = 0.8, PH = 1.5, PH_SLIDE = 0.75;

export function buildLevel() {
  const SC = 1.3;
  const P = [], SP = [], HZ = [], B = [], PR = [], CP = [], SIGNS = [], ZONES = [];
  let x = -14, gy = 0, id = 0;
  const plat = (x0, x1, y, t, o = {}) => { const p = { id: id++, x0, x1, y, b: o.b ?? -9, t, ...o }; P.push(p); return p; };
  const ground = (len, t = 'felt', o) => { len = Math.round(len * SC); const p = plat(x, x + len, gy, t, o); x += len; return p; };
  const gap = len => { x += len; };
  const bub = (bx, by) => B.push({ id: B.length, x: bx, y: by });
  const line = (x0, x1, y, dx = 1.25) => { for (let q = x0; q <= x1 + 1e-6; q += dx) bub(q, y); };
  const arc = (x0, x1, y0, y1, h, n) => { for (let i = 0; i <= n; i++) { const f = i / n; bub(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f + 4 * h * f * (1 - f)); } };
  const spring = (sx, sy) => SP.push({ x: sx, y: sy, w: 1.3 });
  const pend = (px, gyy, period = 2.6, phase = 0, amp = 1.0) => HZ.push({ k: 'pend', x: px, py: gyy + 7.2, L: 5.4, r: 0.72, amp, period, phase });
  const bar = (x0, x1, gyy) => HZ.push({ k: 'bar', x0, x1, y0: gyy + 1.05, y1: gyy + 1.55 });
  const thistle = (tx, gyy) => HZ.push({ k: 'thistle', x: tx, y: gyy + 0.45, r: 0.45 });
  const prize = (px, py, name) => PR.push({ id: PR.length, x: px, y: py, name });
  const cp = () => CP.push({ x: x - 3, y: gy });
  const zone = (name) => ZONES.push({ x, name });

  // ---- 1. Felt Meadow: learn to jump
  zone('Felt Meadow');
  CP.push({ x: -8, y: 0 });
  ground(42); SIGNS.push({ x: 4, y: 0, text: 'JUMP!' });
  line(2, 22, 1.0);
  arc(30, 36, 1.0, 1.0, 2.0, 5);
  gap(3.5); arc(36.8, 42.5, 1.0, 1.0, 2.2, 5);
  ground(18); line(x - 14, x - 3, 1.0);
  thistle(x - 6, gy); arc(x - 8, x - 4, 1.0, 1.0, 2.2, 4);
  gy = 1.2; ground(12, 'card'); line(x - 10, x - 2, gy + 1);
  gy = 2.4; ground(12, 'card'); line(x - 10, x - 2, gy + 1);
  gap(4.5); arc(x - 4.5, x + 1, gy + 1, gy - 0.4, 2.5, 5);
  gy = 1.2; ground(16, 'felt');
  plat(x - 9, x - 6, gy + 3.4, 'sponge', { b: gy + 2.6, sponge: 1 });
  prize(x - 7.5, gy + 7.0, 'Felt Crown');
  line(x - 13, x - 2, gy + 1);
  gap(4); arc(x - 4, x, gy + 1, gy + 1, 2.2, 4);
  ground(14); cp(); line(x - 10, x - 1, gy + 1);
  // ---- 2. Cardboard Town: springs, sliding, wobbly bridges
  zone('Cardboard Town');
  ground(10, 'card'); SIGNS.push({ x: x - 8, y: gy, text: 'SLIDE ↓' });
  bar(x - 3, x - 1.4, gy); line(x - 6, x + 6, gy + 0.55, 1.1);
  ground(14, 'card'); bar(x - 8, x - 6.4, gy);
  spring(x - 2.5, gy); SIGNS.push({ x: x - 5, y: gy, text: 'BOING' });
  arc(x - 2.5, x + 9, gy + 1.5, gy + 1, 6.5, 9);
  gap(10);
  ground(18, 'denim'); line(x - 15, x - 3, gy + 1);
  bar(x - 10, x - 8.6, gy); bar(x - 5, x - 3.6, gy);
  gap(1.0); { const c = ground(10, 'card', { collapse: 1, b: gy - 0.5 }); }
  line(x - 9, x - 1, gy + 1);
  gap(1.0); ground(10, 'card', { collapse: 1, b: gy - 0.5 }); line(x - 9, x - 1, gy + 1.0);
  ground(16, 'felt'); thistle(x - 10, gy); arc(x - 12, x - 8, gy + 1, gy + 1, 2.4, 4);
  gy = 2.6; ground(10, 'cork'); gy = 1.2;
  spring(x + 0.0, gy - 0.0); ground(6, 'cork'); spring(x - 2, gy);
  arc(x - 2, x + 11, gy + 1.5, gy + 1, 6.8, 10);
  prize(x + 4.5, gy + 9.3, 'Button Badge');
  gap(10); gy = 0.6; ground(18); cp(); line(x - 14, x - 2, gy + 1);
  // ---- 3. Swing Workshop: swinging mallets (slide under), lifts
  zone('Swing Workshop');
  ground(12, 'card'); pend(x - 5, gy, 2.6, 0); line(x - 10, x - 1, gy + 0.55, 1.1);
  SIGNS.push({ x: x - 11, y: gy, text: 'DUCK!' });
  ground(16, 'cork'); pend(x - 11, gy, 2.6, 1.3); pend(x - 4, gy, 2.6, 2.6); line(x - 15, x - 1, gy + 0.55, 1.1);
  gap(3.5); arc(x - 3.5, x + 1, gy + 1, gy + 1, 2.4, 4);
  plat(x, x + 7, gy, 'sponge', { b: gy - 0.9, move: { amp: 1.0, period: 3.2, phase: 0 } }); x += 7;
  gap(3.0); arc(x - 3.5, x + 1, gy + 1.5, gy + 1, 2.4, 4);
  plat(x, x + 7, gy, 'sponge', { b: gy - 0.9, move: { amp: 1.0, period: 3.2, phase: 1.6 } }); x += 7;
  gap(3.2); ground(14, 'denim'); thistle(x - 9, gy); thistle(x - 4, gy);
  arc(x - 11, x - 7, gy + 1, gy + 1, 2.4, 4); arc(x - 6, x - 2, gy + 1, gy + 1, 2.4, 4);
  ground(12, 'card'); pend(x - 7, gy, 2.4, 0.5); bar(x - 4.2, x - 2.6, gy); line(x - 11, x + 1, gy + 0.55, 1.1);
  gy = 1.8; ground(10, 'cork'); gy = 3.0; ground(10, 'cork');
  plat(x - 6, x - 3, gy + 3.3, 'sponge', { b: gy + 2.5, sponge: 1 });
  prize(x - 4.5, gy + 7.2, 'Zip Sticker');
  gap(5); arc(x - 5, x + 1, gy + 1, gy - 0.8, 2.6, 6);
  gy = 1.0; ground(16, 'felt'); cp(); line(x - 12, x - 2, gy + 1);
  // ---- 4. Collapse Canyon: crumbly bridges and springs
  zone('Collapse Canyon');
  ground(6, 'felt');
  for (let i = 0; i < 4; i++) { gap(1.2); ground(8, 'card', { collapse: 1, b: gy - 0.5 }); line(x - 7, x - 1, gy + 1); }
  ground(8, 'cork'); spring(x - 2, gy); arc(x - 2, x + 9, gy + 1.5, gy + 2, 6.5, 8);
  gap(9); gy = 2.5; ground(12, 'denim'); line(x - 10, x - 2, gy + 1);
  thistle(x - 9.5, gy); bar(x - 1.6, x, gy);
  gy = 2.5; ground(10, 'card', { collapse: 1, b: gy - 0.5 }); line(x - 9, x - 1, gy + 1.0);
  gap(2.0); ground(10, 'card', { collapse: 1, b: gy - 0.5 }); line(x - 9, x - 1, gy + 1.0);
  ground(10, 'felt'); spring(x - 3, gy);
  plat(x + 4, x + 14, gy + 5.2, 'cork', { b: gy + 4.4 }); line(x + 5, x + 13, gy + 6.2);
  prize(x + 12.5, gy + 7.5, 'Thimble Hat');
  gap(5); gy = 1.5; ground(20); line(x - 16, x - 3, gy + 1); cp();
  // ---- 4b. Sock Drawer Hills: a longer mixed stretch (seeded so it's the same every run)
  zone('Sock Drawer Hills');
  { let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const types = ['felt', 'denim', 'cork', 'card'];
    for (let i = 0; i < 16; i++) {
      const t = types[i % 4], r = rnd(), k = i % 8;
      if (k === 0) { ground(10, t); line(x - 10, x - 1, gy + 1); gap(3 + rnd() * 1.5); arc(x - 4, x + 1, gy + 1, gy + 1, 2.4, 4); }
      else if (k === 1) { ground(9, t); pend(x - 5, gy, 2.5, rnd() * 3); line(x - 9, x, gy + 0.55, 1.1); }
      else if (k === 2) { gy += 1.1; ground(7, 'cork'); line(x - 7, x - 1, gy + 1); gy += 1.1; ground(7, 'cork'); line(x - 7, x - 1, gy + 1); }
      else if (k === 3) { gap(3); gy -= 1.6; arc(x - 3.5, x + 1, gy + 2.6, gy + 1, 2, 4); ground(9, t); thistle(x - 5, gy); arc(x - 7, x - 3, gy + 1, gy + 1, 2.4, 4); }
      else if (k === 4) { ground(8, t); bar(x - 4, x - 2.4, gy); bar(x - 1.6, x, gy); line(x - 7, x + 1, gy + 0.55, 1.1); }
      else if (k === 5) { ground(6, t); gap(1.2); ground(8, 'card', { collapse: 1, b: gy - 0.5 }); line(x - 8, x - 1, gy + 1); gap(1.2); ground(8, 'card', { collapse: 1, b: gy - 0.5 }); line(x - 8, x - 1, gy + 1); }
      else if (k === 6) { ground(8, t); spring(x - 2, gy); arc(x - 2, x + 9, gy + 1.5, gy + 1, 6.5, 9); gap(9); ground(10, t); line(x - 9, x - 1, gy + 1); }
      else { gap(3); plat(x, x + 7, gy, 'sponge', { b: gy - 0.9, move: { amp: 0.9, period: 3.0, phase: r * 2 } }); x += 7; gap(3); ground(8, t); line(x - 7, x - 1, gy + 1); }
      if (i === 7) { ground(12, 'felt'); cp(); }
      if (i === 11) { plat(x - 8, x - 5, gy + 3.3, 'sponge', { b: gy + 2.5, sponge: 1 }); prize(x - 6.5, gy + 7.2, 'Sock Puppet'); }
    }
    gy = Math.max(gy, 0.5); ground(16, 'felt'); cp(); }
  // ---- 5. Funfair Finale: everything, a bit quicker
  zone('Funfair Finale');
  ground(12, 'denim'); pend(x - 6, gy, 2.2, 0.2); line(x - 10, x - 1, gy + 0.55, 1.1);
  gap(4); arc(x - 4, x + 1, gy + 1, gy + 1, 2.4, 4);
  ground(10, 'card', { collapse: 1, b: gy - 0.5 }); line(x - 9, x - 1, gy + 1);
  gap(1.2); plat(x, x + 7, gy, 'sponge', { b: gy - 0.9, move: { amp: 1.1, period: 2.8, phase: 0.8 } }); x += 7;
  gap(3); gy = 2.0; ground(14, 'cork'); thistle(x - 9, gy); bar(x - 4, x - 2.4, gy);
  arc(x - 11, x - 7, gy + 1, gy + 1, 2.4, 4); line(x - 6, x, gy + 0.55, 1.1);
  ground(10, 'felt'); spring(x - 2.5, gy); arc(x - 2.5, x + 8, gy + 1.5, gy + 1, 6.2, 9);
  gap(9); gy = 1.0; ground(14, 'card'); pend(x - 8, gy, 2.4, 1.0); pend(x - 3, gy, 2.4, 2.2); line(x - 12, x, gy + 0.55, 1.1);
  gy = 2.2; ground(8, 'cork'); gy = 3.4; ground(8, 'cork');
  plat(x - 5, x - 2, gy + 3.3, 'sponge', { b: gy + 2.5, sponge: 1 });
  prize(x - 3.5, gy + 7.1, 'Golden Spool');
  gap(4.5); gy = 1.0; arc(x - 4.5, x + 1, gy + 3.4, gy + 1, 2.0, 5);
  ground(12, 'denim'); thistle(x - 6, gy); arc(x - 8, x - 4, gy + 1, gy + 1, 2.4, 4);
  ground(46, 'felt'); line(x - 44, x - 30, gy + 1); line(x - 30, x - 22, gy + 2.2);
  const FIN = x - 26;
  return { P, SP, HZ, B, PR, CP, SIGNS, ZONES, FIN, END: x, MEDALS: [8000, 15000, 21000] };
}

export function platY(p, t) { return p.move ? p.y + p.move.amp * Math.sin(2 * Math.PI * t / p.move.period + p.move.phase * Math.PI) : p.y; }
export function pendPos(h, t) { const th = h.amp * Math.sin(2 * Math.PI * t / h.period + h.phase); return { x: h.x + h.L * Math.sin(th), y: h.py - h.L * Math.cos(th), th }; }

export function newState(L) {
  const c = L.CP[0];
  return { t: 0, x: c.x, y: c.y, vx: 0, vy: 0, ground: null, coy: 0, buf: 0, slide: 0, held: 0, cp: 0, dead: 0, ready: 0.6, score: 0, chain: 0, chainT: 0, mult: 1,
    got: new Uint8Array(L.B.length), prizes: new Uint8Array(L.PR.length), col: {}, deaths: 0, done: 0, ev: [], jumps: 0, maxMult: 1, runT: 0, bonk: 0, fastfall: 0 };
}
export function clone(s) { return { ...s, got: s.got.slice(), prizes: s.prizes.slice(), col: { ...s.col }, ev: [] }; }

function solid(L, s, p) { if (!p.collapse) return true; const c = s.col[p.id]; return c === undefined || s.t - c < 0.3 + (p.x1 - p.x0) / 8; }
export function speedAt(L, x) { const f = Math.min(1, Math.max(0, x / L.FIN)); return 8.2 + 3.0 * f; }
export function playerH(s) { return s.slide > 0 ? PH_SLIDE : PH; }

// input: {jump: held bool, jumpP: pressed edge, down: held bool, downP: pressed edge}
export function step(L, s, inp) {
  s.ev.length = 0; s.t += DT;
  if (s.done) { s.vx *= 0.94; s.x += s.vx * DT; return s; }
  if (s.dead) { s.dead -= DT; if (s.dead <= 0) respawn(L, s); return s; }
  if (s.ready > 0) { s.ready -= DT; if (inp.jumpP) s.buf = 0.12; return s; }
  s.runT += DT;
  // horizontal: auto-run, quick recovery after a bonk
  const target = speedAt(L, s.x);
  s.vx += (target - s.vx) * Math.min(1, DT * (s.vx < target - 1 ? 5 : 2));
  if (inp.jumpP) s.buf = 0.13;
  if (s.buf > 0) s.buf -= DT;
  if (s.ground) s.coy = 0.1; else if (s.coy > 0) s.coy -= DT;
  // slide
  if (inp.downP) { if (s.ground) { if (s.slide <= 0) s.ev.push('slide'); s.slide = 0.55; } else { s.fastfall = 1; s.downQueued = 1; } }
  if (s.slide > 0) { if (inp.down && s.slide < 0.2 && s.slideHeld < 0.9) s.slide = 0.2; s.slideHeld = (s.slideHeld || 0) + DT; s.slide -= DT;
    if (s.slide <= 0) { if (underBar(L, s)) s.slide = 0.05; else s.slideHeld = 0; } }
  // jump
  if (s.buf > 0 && (s.ground || s.coy > 0) && !(s.slide > 0 && underBar(L, s))) {
    s.vy = JUMP_V; s.ground = null; s.coy = 0; s.buf = 0; s.slide = 0; s.slideHeld = 0; s.held = 1; s.jumps++; s.ev.push('jump');
  }
  if (!inp.jump) s.held = 0;
  if (s.vy <= 0 || s.ground) s.spr = 0;
  const g = (s.vy > 0 && (s.held || s.spr)) ? G_UP_HELD : G;
  if (!s.ground) { s.vy -= g * DT; if (s.fastfall && s.vy > -22) s.vy = Math.min(s.vy, -22); if (s.vy < TERM) s.vy = TERM; }
  // carry with moving platform
  if (s.ground) {
    const p = s.ground;
    if (!solid(L, s, p) || s.x + PW / 2 < p.x0 || s.x - PW / 2 > p.x1) { s.ground = null; }
    else s.y = platY(p, s.t);
  }
  // move x with side collisions
  const ox = s.x; s.x += s.vx * DT;
  const h = playerH(s);
  for (const p of L.P) {
    if (!solid(L, s, p)) continue;
    const top = platY(p, s.t), bot = p.move ? top - (p.y - p.b) : p.b;
    if (s.x + PW / 2 > p.x0 && ox + PW / 2 <= p.x0 + 1e-6 && s.y < top - 0.02 && s.y + h > bot) {
      if (top - s.y <= 0.45 && (s.ground || s.vy <= 0)) { s.y = top; s.ground = p; s.vy = 0; }
      else { s.x = p.x0 - PW / 2 - 1e-4; if (s.vx > 3) { s.ev.push('bonk'); s.bonk = 0.25; } s.vx = 0; }
    }
  }
  // move y
  if (!s.ground) {
    const oy = s.y; s.y += s.vy * DT;
    for (const p of L.P) {
      if (!solid(L, s, p)) continue;
      if (s.x + PW / 2 <= p.x0 || s.x - PW / 2 >= p.x1) continue;
      const top = platY(p, s.t), bot = p.move ? top - (p.y - p.b) : p.b;
      const topPrev = platY(p, s.t - DT);
      if (s.vy <= 0 && oy >= topPrev - 0.05 && s.y <= top) {
        s.y = top; s.vy = 0; s.ground = p; s.fastfall = 0; s.ev.push('land');
        if (p.sponge) { s.vy = SPONGE_V; s.ground = null; s.held = inp.jump ? 1 : 0; s.ev.push('sponge'); }
        else if (s.downQueued) { s.slide = 0.55; }
        s.downQueued = 0;
        break;
      }
      if (s.vy > 0 && oy + h <= bot + 0.05 && s.y + h > bot) { s.y = bot - h; s.vy = 0; s.ev.push('head'); }
    }
  }
  if (s.ground && s.ground.collapse && s.col[s.ground.id] === undefined) { s.col[s.ground.id] = s.t; s.ev.push('creak'); }
  // springs
  for (const sp of L.SP) {
    if (Math.abs(s.x - sp.x) < sp.w / 2 + PW / 2 && s.y <= sp.y + 0.5 && s.y >= sp.y - 0.05 && (s.vy <= 0)) {
      s.vy = SPRING_V; s.ground = null; s.held = 1; s.spr = 1; s.slide = 0; s.y = sp.y + 0.5; s.ev.push('spring'); sp.hit = s.t;
    }
  }
  // collectables
  const hh = playerH(s);
  if (s.chainT > 0) { s.chainT -= DT; if (s.chainT <= 0) { s.chain = 0; s.mult = 1; } }
  for (const b of L.B) {
    if (s.got[b.id]) continue;
    if (Math.abs(b.x - s.x) > 1.0) continue;
    if (b.y > s.y - 0.35 && b.y < s.y + hh + 0.4) {
      s.got[b.id] = 1; s.chain++; s.chainT = 1.6; s.mult = Math.min(5, 1 + Math.floor(s.chain / 8)); s.maxMult = Math.max(s.maxMult, s.mult);
      s.score += 10 * s.mult; s.ev.push('bub:' + b.id);
    }
  }
  for (const pr of L.PR) {
    if (s.prizes[pr.id]) continue;
    if (Math.abs(pr.x - s.x) < 1.3 && pr.y > s.y - 0.9 && pr.y < s.y + hh + 0.9) { s.prizes[pr.id] = 1; s.score += 500; s.ev.push('prize:' + pr.id); }
  }
  // hazards
  for (const z of L.HZ) {
    if (z.k === 'bar') { if (s.x + PW / 2 > z.x0 && s.x - PW / 2 < z.x1 && s.y + hh > z.y0 && s.y < z.y1) return die(s, 'bar'); }
    else {
      const c = z.k === 'pend' ? pendPos(z, s.t) : z;
      if (Math.abs(c.x - s.x) > 3) continue;
      const nx = Math.max(s.x - PW / 2 + 0.1, Math.min(c.x, s.x + PW / 2 - 0.1)), ny = Math.max(s.y + 0.1, Math.min(c.y, s.y + hh - 0.1));
      if ((nx - c.x) ** 2 + (ny - c.y) ** 2 < z.r * z.r) return die(s, z.k);
    }
  }
  if (s.y < -7) return die(s, 'fall');
  // anti-softlock: wedged against a wall while ducking under a bar for a second -> pop back to checkpoint
  if (s.ground && s.vx < 0.5 && !(s.ready > 0) && !s.done) { s.wallT = (s.wallT || 0) + DT; if (s.wallT > 4) { s.wallT = 0; return die(s, 'stuck'); } } else s.wallT = 0;
  if (s.slide > 0 && s.vx < 0.5) { s.stuck = (s.stuck || 0) + DT; if (s.stuck > 1) { s.stuck = 0; return die(s, 'stuck'); } } else s.stuck = 0;
  // checkpoints
  for (let i = s.cp + 1; i < L.CP.length; i++) if (s.x >= L.CP[i].x) { s.cp = i; s.ev.push('cp:' + i); }
  if (s.x >= L.FIN) { s.done = 1; s.ev.push('finish'); }
  return s;
}
function underBar(L, s) { for (const z of L.HZ) if (z.k === 'bar' && s.x + PW / 2 > z.x0 - 0.3 && s.x - PW / 2 < z.x1 + 0.3 && s.y + PH > z.y0) return true; return false; }
function die(s, why) { s.dead = 1.0; s.deaths++; s.chain = 0; s.mult = 1; s.chainT = 0; s.ev.push('die:' + why); return s; }
function respawn(L, s) {
  const c = L.CP[s.cp];
  s.dead = 0; s.x = c.x; s.y = c.y; s.vx = 0; s.vy = 0; s.ground = null; s.slide = 0; s.slideHeld = 0; s.held = 0; s.fastfall = 0; s.ready = 0.7; s.buf = 0;
  for (const p of L.P) if (p.x0 > c.x - 2) delete s.col[p.id];
  s.ev.push('respawn');
}
export function medalFor(score, L) { const m = L.MEDALS; return score >= m[2] ? 3 : score >= m[1] ? 2 : score >= m[0] ? 1 : 0; }
