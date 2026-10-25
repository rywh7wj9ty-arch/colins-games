// Bloomhop level data: Sunsprout Meadow. Tile units; y is up. Built by code so it is easy to tune.
// Tile types: 1 ground, 2 block, 3 power block, 4 used block, 5 pipe, 6 hidden block, 7 coin block, 8 cloud, 9 wall
const W1 = 236, H = 18;
function level1() {
  const W = W1, MAIN_END = 192, ROOM = { x0: 199, x1: 234 };
  const t = new Uint8Array(W * H);
  const set = (x, y, v) => { if (x >= 0 && x < W && y >= 0 && y < H) t[y * W + x] = v; };
  const g = (x0, x1, top) => { for (let x = x0; x < x1; x++) for (let y = 0; y < top; y++) set(x, y, 1); };
  const L = { t, coins: [], enemies: [], blocks: [], pipes: [], medals: [], hidden: [], bloom: null, checkpoints: [], pole: null, deco: [] };
  const coin = (x, y, wonder = false) => L.coins.push({ x: x + 0.5, y: y + 0.5, wonder });
  const arc = (x0, n, y0, hgt, wonder) => { for (let i = 0; i < n; i++) { const k = n > 1 ? i / (n - 1) : 0.5; coin(x0 + i, y0 + Math.sin(k * Math.PI) * hgt, wonder); } };
  const block = (x, y, v, content) => { set(x, y, v); L.blocks.push({ x, y, v, content }); };
  const pipe = (x, top, warp) => { for (let y = 3; y < top; y++) { set(x, y, 5); set(x + 1, y, 5); } L.pipes.push({ x, top, warp }); };
  const en = (type, x, y) => L.enemies.push({ type, x: x + 0.5, y });

  // --- start meadow
  g(0, 22, 3);
  arc(5, 5, 4.2, 1.6);
  block(11, 6, 7, 'coin'); block(12, 6, 3, 'grow'); block(13, 6, 2); block(14, 6, 7, 'coin');
  block(17, 6, 6, 'coin'); L.hidden.push({ x: 17, y: 6 });
  en('walker', 19, 3);
  // --- first hill and gap
  g(22, 30, 3); g(30, 36, 4); en('walker', 26, 3); en('walker', 33, 4);
  arc(36, 3, 6, 1.2);              // over the gap
  g(39, 62, 3);
  // --- tube garden
  pipe(43, 5); arc(43, 2, 6, 0);
  en('hopper', 46, 3);
  pipe(49, 6, 'down');             // secret warp: press down on top
  coin(49, 7.2); coin(50, 7.2);
  en('hopper', 52, 3);
  pipe(55, 6, 'exit');
  arc(57, 4, 5, 1);
  // --- platforms over the brook
  g(62, 64, 3); block(64, 6, 2); block(65, 6, 7, 'coin'); block(66, 6, 2);
  g(67, 74, 3); en('flier', 70, 6.2);
  block(71, 7, 6, 'coin'); L.hidden.push({ x: 71, y: 7 });             // hidden block leads up to medal 1
  for (let x = 72; x <= 75; x++) set(x, 10, 8);
  L.medals.push({ x: 74, y: 12, id: 0 });
  arc(72, 4, 11, 0);
  g(74, 78, 3); g(80, 92, 4);
  L.checkpoints.push({ x: 82, y: 4 });
  L.bloom = { x: 86.5, y: 4 };
  // --- Dazzle stretch
  g(92, 108, 3);
  en('walker', 97, 3); en('walker', 101, 3); en('hopper', 105, 3);
  for (let i = 0; i < 4; i++) for (let y = 0; y <= i; y++) set(108 + i, 3 + y, 2);
  g(108, 116, 3); for (let y = 3; y < 7; y++) for (let x = 112; x < 116; x++) set(x, y, 2);
  g(119, 140, 3);
  block(124, 7, 2); block(125, 7, 7, 'coin'); block(126, 7, 2);
  for (let x = 129; x <= 131; x++) set(x, 10, 8);
  L.medals.push({ x: 130.5, y: 13.6, id: 1 });
  en('flier', 128, 5.2); en('flier', 136, 6); en('hopper', 138, 3);
  g(140, 146, 3); g(149, 160, 3);
  en('walker', 153, 3); en('walker', 157, 3);
  arc(146, 3, 6, 1.5);
  // wonder-only coin rainbow (appear during Dazzle time)
  arc(93, 9, 6, 3, true); arc(119, 5, 5, 2, true); arc(141, 8, 6, 3.5, true); arc(150, 8, 5, 2, true);
  // --- final staircase and goal
  g(160, 169, 3);
  for (let i = 0; i < 8; i++) for (let y = 0; y <= i; y++) set(160 + i, 3 + y, 2);
  g(171, MAIN_END, 3);
  L.pole = { x: 173, y0: 3, y1: 13 };
  L.house = { x: 180 };
  for (let y = 0; y < H; y++) set(MAIN_END, y, 9);
  // --- secret sky garden (reached by the tube at x 49)
  g(ROOM.x0, ROOM.x1, 3);
  for (let y = 0; y < H; y++) { set(ROOM.x0, y, 9); set(ROOM.x1 - 1, y, 9); }
  for (let x = 203; x < 227; x += 1) { coin(x, x % 2 ? 4 : 5); }
  for (let x = 207; x <= 209; x++) set(x, 6, 8);
  for (let x = 213; x <= 215; x++) set(x, 10, 8);
  for (let x = 219; x <= 221; x++) set(x, 12, 8);
  arc(207, 3, 7.6, 0); arc(213, 3, 11.5, 0); arc(219, 3, 13.5, 0);
  L.medals.push({ x: 223.5, y: 15, id: 2 });
  pipe(229, 5, 'back');
  Object.assign(L, { W, H, MAIN_END, ROOM, start: { x: 4, y: 3 } });
  return L;
}

// ---------------- v1.1: nine more worlds, generated from a seeded segment library ----------------
export const LEVELS = [
  { name: 'Sunsprout Meadow', theme: 'meadow', wonder: 'stampede' },
  { name: 'Bubbly Beach', theme: 'beach', wonder: 'float' },
  { name: 'Crystal Caves', theme: 'cave', wonder: 'tilt' },
  { name: 'Cloudtop Heights', theme: 'sky', wonder: 'zoom' },
  { name: 'Honeydune Desert', theme: 'desert', wonder: 'speed' },
  { name: 'Frostberry Peaks', theme: 'snow', wonder: 'float' },
  { name: 'Mushroom Grove', theme: 'grove', wonder: 'tilt' },
  { name: 'Candy Castle', theme: 'castle', wonder: 'speed' },
  { name: 'Sunset Ridge', theme: 'sunset', wonder: 'zoom' },
  { name: 'Bramble Keep', theme: 'keep', wonder: 'tilt', boss: true },
];
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function buildLevel(n) {
  if (!n) return level1();
  const meta = LEVELS[n], R = rng(1234 + n * 7919), ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const d = n / 9;                                // 0.11 .. 1 difficulty
  const len = meta.boss ? 200 : Math.round(200 + n * 16);   // main stretch grows each level
  const MAIN_END = len + (meta.boss ? 40 : 0), ROOM = { x0: MAIN_END + 7, x1: MAIN_END + 42 }, W = ROOM.x1 + 2;
  const t = new Uint8Array(W * H);
  const set = (x, y, v) => { if (x >= 0 && x < W && y >= 0 && y < H) t[y * W + x] = v; };
  const get = (x, y) => t[y * W + x];
  const g = (x0, x1, top) => { for (let x = x0; x < x1; x++) for (let y = 0; y < top; y++) set(x, y, 1); };
  const L = { t, coins: [], enemies: [], blocks: [], pipes: [], medals: [], hidden: [], bloom: null, checkpoints: [], pole: null, deco: [], springs: [], theme: meta.theme, wonderKind: meta.wonder, name: meta.name };
  const coin = (x, y, wonder = false) => L.coins.push({ x: x + 0.5, y: y + 0.5, wonder });
  const arc = (x0, k, y0, hgt, wonder) => { for (let i = 0; i < k; i++) { const q = k > 1 ? i / (k - 1) : 0.5; coin(x0 + i, y0 + Math.sin(q * Math.PI) * hgt, wonder); } };
  const block = (x, y, v, content) => { set(x, y, v); L.blocks.push({ x, y, v, content }); };
  const pipe = (x, base, top, warp) => { for (let y = base; y < top; y++) { set(x, y, 5); set(x + 1, y, 5); } L.pipes.push({ x, top, base, warp }); };
  const en = (type, x, y) => L.enemies.push({ type, x: x + 0.5, y });
  const enemyFor = () => { const r = R(); return r < 0.45 - d * 0.15 ? 'walker' : r < 0.75 ? 'hopper' : 'flier'; };
  const cave = meta.theme === 'cave';
  let x = 0, top = 3;
  g(0, 16, 3); arc(5, 4, 4.2, 1.4);
  block(8, 6, 7, 'coin'); block(9, 6, 3, 'grow'); block(10, 6, 7, 'coin');
  x = 16;
  const medalSegs = ['tower', 'spring', 'secret']; let medalId = 0;
  const loopEnd = len - 56, half = Math.round(loopEnd * 0.45);
  let bloomPlaced = false, cpPlaced = false, secretDone = false;
  const ground = (k) => { g(x, x + k, top); x += k; };
  const segs = {
    flat() { const k = ri(7, 10); const x0 = x; ground(k); const ne = 1 + (R() < d ? 1 : 0); for (let i = 0; i < ne; i++) en(enemyFor() === 'flier' ? 'walker' : enemyFor(), x0 + 2 + i * 3, top); arc(x0 + 1, 4, top + 2, 1.3); },
    gap() { const w = Math.min(5, 2 + ri(0, 1 + Math.round(d * 2))); arc(x, w, top + 3, 1.2); x += w; const k = ri(4, 6); ground(k); },
    up() { if (top >= 6) return segs.down(); top += ri(1, 2); ground(ri(5, 8)); },
    down() { if (top <= 3) return segs.up(); top = Math.max(3, top - ri(1, 2)); ground(ri(5, 8)); },
    pipes() { const x0 = x; ground(12); pipe(x0 + 2, top, top + ri(2, 3)); en('hopper', x0 + 6, top); pipe(x0 + 9, top, top + ri(2, 3)); coin(x0 + 2, top + 4.5); coin(x0 + 3, top + 4.5); },
    fliers() { const x0 = x; ground(10); en('flier', x0 + 4, top + 3.2); if (d > 0.4) en('flier', x0 + 8, top + 4); arc(x0 + 2, 6, top + 1, 0.5); },
    blocks() { const x0 = x; ground(10); for (let i = 0; i < 5; i++) block(x0 + 3 + i, top + 3, i === 2 ? 7 : 2, i === 2 ? 'coin' : undefined); arc(x0 + 3, 5, top + 4.5, 0.6); en('walker', x0 + 8, top); },
    stairs() { const x0 = x; const h = ri(3, 4); ground(h + 4); for (let i = 0; i < h; i++) for (let y = 0; y <= i; y++) set(x0 + i, top + y, 2); for (let i = h; i < h + 3; i++) for (let y = 0; y < h; y++) set(x0 + i, top + y, 2); const w = Math.min(4, 2 + Math.round(d * 2)); x += w; ground(5); },
    clouds() { // chain of cloud platforms over a pit
      const n2 = 2 + Math.round(d * 2); x += 2;
      for (let i = 0; i < n2; i++) { for (let k = 0; k < 3; k++) set(x + k, top + (i % 2), 8); coin(x + 1, top + 2 + (i % 2)); x += 3 + ri(1, 2); }
      ground(6);
    },
    hoppers() { const x0 = x; ground(12); en('hopper', x0 + 4, top); en('hopper', x0 + 9, top); arc(x0 + 3, 7, top + 3, 1.5); },
  };
  const theme = meta.theme;
  const pool = ['flat', 'gap', 'up', 'down', 'pipes', 'fliers', 'blocks', 'stairs', 'hoppers', 'gap', 'flat'];
  if (theme === 'sky' || theme === 'sunset') pool.push('clouds', 'clouds', 'gap');
  if (theme === 'beach' || theme === 'desert') pool.push('gap', 'hoppers');
  if (theme === 'castle' || theme === 'keep') pool.push('stairs', 'fliers', 'blocks');
  const medalAt = [Math.round(loopEnd * 0.2), Math.round(loopEnd * 0.6), Math.round(loopEnd * 0.86)];
  let last = '';
  while (x < loopEnd || medalId < 3) {
    if (!bloomPlaced && x >= half) { // pedestal with the Dazzle Bloom + checkpoint before it
      ground(3); L.checkpoints.push({ x: x - 2, y: top }); g(x, x + 8, top + 1); L.bloom = { x: x + 4.5, y: top + 1 }; x += 8; bloomPlaced = true;
      // wonder-only coin rainbow
      arc(x + 1, 9, top + 3, 3, true); arc(x + 14, 8, top + 3, 2.5, true); arc(x + 28, 8, top + 3, 3, true);
      continue;
    }
    if (!cpPlaced && x >= loopEnd * 0.76) { cpPlaced = true; ground(4); L.checkpoints.push({ x: x - 3, y: top }); continue; }
    if (medalId < 3 && x >= medalAt[medalId]) {
      const kind = medalSegs[medalId]; const x0 = x;
      if (kind === 'tower') { // hidden block -> cloud -> medal (same reach as level 1)
        ground(10); block(x0 + 3, top + 4, 6, 'coin'); L.hidden.push({ x: x0 + 3, y: top + 4 });
        for (let k = 4; k <= 7; k++) set(x0 + k, top + 7, 8); L.medals.push({ x: x0 + 6.5, y: top + 9, id: medalId });
      } else if (kind === 'spring') { // bouncy spring launches you to a high cloud
        ground(10); set(x0 + 2, top, 10); L.springs.push({ x: x0 + 2, y: top });
        for (let k = 3; k <= 6; k++) set(x0 + k, top + 8, 8); L.medals.push({ x: x0 + 5.5, y: top + 10, id: medalId }); arc(x0 + 3, 4, top + 9, 0);
      } else { // tube to the secret garden; the exit tube pops you out a little further on
        ground(16); pipe(x0 + 3, top, top + 2, 'down'); pipe(x0 + 11, top, top + 2, 'exit'); coin(x0 + 3, top + 3); coin(x0 + 4, top + 3);
        L.medals.push({ x: ROOM.x1 - 10.5, y: 15, id: medalId }); secretDone = true;
      }
      medalId++; continue;
    }
    let s; do { s = pool[Math.floor(R() * pool.length)]; } while (s === last && (s === 'gap' || s === 'clouds'));
    last = s; segs[s]();
  }
  if (top > 3) { top = 3; }
  if (meta.boss) {
    // calm run-up, checkpoint, then the arena
    const a0 = MAIN_END - 30; g(x, a0, top); L.checkpoints.push({ x: a0 - 5, y: top });
    g(a0, MAIN_END, 3);
    L.arena = { x0: a0, x1: MAIN_END, top: 3 };
    for (let y = 8; y < H; y++) for (let k = a0; k < MAIN_END; k++) if (y >= 14) set(k, y, 0);
    block(a0 + 6, 7, 2); block(a0 + 7, 7, 2); block(MAIN_END - 9, 7, 2); block(MAIN_END - 8, 7, 2);
    L.house = { x: MAIN_END + 3.5 }; // tucked behind the arena wall
    x = MAIN_END;
  } else {
    // final staircase + pole
    g(x, x + 10, 3); const st = Math.min(8, 5 + Math.round(d * 3));
    for (let i = 0; i < st; i++) for (let y = 0; y <= i; y++) set(x + i, 3 + y, 2);
    x += 10; x += 2; g(x, MAIN_END, 3);
    L.pole = { x: x + 4, y0: 3, y1: 13 }; L.house = { x: x + 11 };
  }
  for (let y = 0; y < H; y++) set(MAIN_END, y, 9);
  if (cave) for (let xx = 0; xx < MAIN_END; xx++) for (let y = 14; y < H; y++) if (!get(xx, y)) set(xx, y, 1);
  // secret garden
  g(ROOM.x0, ROOM.x1, 3);
  for (let y = 0; y < H; y++) { set(ROOM.x0, y, 9); set(ROOM.x1 - 1, y, 9); }
  const r0 = ROOM.x0;
  for (let k = r0 + 4; k < ROOM.x1 - 7; k++) coin(k, k % 2 ? 4 : 5);
  for (let k = 8; k <= 10; k++) set(r0 + k, 6, 8);
  for (let k = 14; k <= 16; k++) set(r0 + k, 10, 8);
  for (let k = 20; k <= 22; k++) set(r0 + k, 12, 8);
  arc(r0 + 8, 3, 7.6, 0); arc(r0 + 14, 3, 11.5, 0); arc(r0 + 20, 3, 13.5, 0);
  pipe(ROOM.x1 - 5, 3, 5, 'back');
  Object.assign(L, { W, H, MAIN_END, ROOM, start: { x: 4, y: 3 } });
  return L;
}
