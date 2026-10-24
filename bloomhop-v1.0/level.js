// Bloomhop level data: Sunsprout Meadow. Tile units; y is up. Built by code so it is easy to tune.
// Tile types: 1 ground, 2 block, 3 power block, 4 used block, 5 pipe, 6 hidden block, 7 coin block, 8 cloud, 9 wall
export const W = 236, H = 18;
export const MAIN_END = 192, ROOM = { x0: 199, x1: 234 };
export function buildLevel() {
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
  return L;
}
