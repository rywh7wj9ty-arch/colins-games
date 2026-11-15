// One golden-hour diorama. +Z is "away" across the table at yaw 0.
// Slabs are static boxes. The seesaw, gear bridge, sluice and ramp are special.

export const PIP_R = 0.34;
export const TOP = 0.9;
const TH = 0.82;

export function slab(id, x, z, w, d, top = TOP, mat = 'grass') {
  return { id, pos: [x, top - TH / 2, z], half: [w / 2, TH / 2, d / 2], mat, top, w, d };
}

export function curb(id, x, z, w, d, baseTop, h = 0.34, mat = 'grass') {
  return { id, pos: [x, baseTop + h / 2, z], half: [w / 2, h / 2, d / 2], mat, curb: true };
}

function rotZ(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { ax: [c, s, 0], ay: [-s, c, 0], az: [0, 0, 1] };
}

/** A sloping walkway. (x0,y0,z0) and (x1,y1,z1) are the top surface ends. */
export function ramp(id, x0, y0, z0, x1, y1, z1, width, thick, mat = 'wood') {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  const len = Math.hypot(dx, dy, dz) || 1;
  const ax = [dx / len, dy / len, dz / len];
  let zx = -dz, zz = dx;
  const zl = Math.hypot(zx, zz) || 1;
  zx /= zl; zz /= zl;
  let ay = [ax[1] * zz - ax[2] * 0, ax[2] * zx - ax[0] * zz, ax[0] * 0 - ax[1] * zx];
  const al = Math.hypot(ay[0], ay[1], ay[2]) || 1;
  ay = ay.map(v => v / al);
  let az = [zx, 0, zz];
  if (ay[1] < 0) {
    ay = ay.map(v => -v);
    az = az.map(v => -v);
  }
  const h = thick / 2;
  return {
    id, mat,
    pos: [(x0 + x1) / 2 - ay[0] * h, (y0 + y1) / 2 - ay[1] * h, (z0 + z1) / 2 - ay[2] * h],
    half: [len / 2, h, width / 2],
    ax, ay, az,
  };
}

const SEE_HY = 0.09;
const SEE_HZ = 1.52;
const SEE_REST = -0.09;
const SEE_MAX = 0.1;

function seePoint(angle, localZ, posY, pivotZ) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return {
    y: posY + SEE_HY * c - localZ * s,
    z: pivotZ + SEE_HY * s + localZ * c,
  };
}

// Rest the south tip on the meadow height.
const SEE_POS_Y = TOP - SEE_HY * Math.cos(SEE_REST) - SEE_HZ * Math.sin(SEE_REST);
const SEE_PIVOT_Z = -0.55;
const southTip = seePoint(SEE_REST, -SEE_HZ, SEE_POS_Y, SEE_PIVOT_Z);
const northTip = seePoint(SEE_MAX, SEE_HZ, SEE_POS_Y, SEE_PIVOT_Z);

const meadowNorth = southTip.z - 0.06;
const meadowSouth = -6.55;
const meadowZ = (meadowNorth + meadowSouth) / 2;
const meadowD = meadowNorth - meadowSouth;

const afterSouth = northTip.z + 0.06;
const afterNorth = afterSouth + 2.55;
const afterZ = (afterSouth + afterNorth) / 2;
const afterD = afterNorth - afterSouth;

const bridgeZ = (afterNorth + (afterNorth + 1.25)) / 2;
const landSouth = afterNorth + 1.25;
const landNorth = landSouth + 2.35;
const landZ = (landSouth + landNorth) / 2;
const landD = landNorth - landSouth;

const WTOP = 0.74;
const basinX = 3.35;
const basinZ = landZ;

const highTop = 2.32;
const highX = 9.2;
const highZ = 11.05;

const flowerTop = 0.96;
const flowerX = 4.35;
const flowerZ = 11.05;

const slabs = [
  slab('meadow', 0, meadowZ, 4.15, meadowD),
  slab('after', 0, afterZ, 3.7, afterD),
  slab('land', 0, landZ, 3.55, landD),
  slab('basin', basinX, basinZ, 2.7, 2.45, WTOP, 'stone'),
  slab('pool', basinX, basinZ + 2.02, 2.15, 1.85, WTOP, 'stone'),
  slab('channel', 6.45, basinZ, 3.7, 1.4, WTOP, 'stone'),
  slab('windpad', 9.15, basinZ, 2.7, 2.55, WTOP, 'stone'),
  slab('high', highX, highZ, 3.45, 3.05, highTop),
  slab('flower', flowerX, flowerZ, 3.3, 2.7, flowerTop, 'petal'),
];

function byId(id) { return slabs.find(s => s.id === id); }
const meadow = byId('meadow');
const after = byId('after');
const land = byId('land');
const basin = byId('basin');
const pool = byId('pool');
const channel = byId('channel');
const windpad = byId('windpad');
const high = byId('high');
const flower = byId('flower');

const edge = (s, side) => {
  if (side === 'n') return s.pos[2] + s.half[2];
  if (side === 's') return s.pos[2] - s.half[2];
  if (side === 'e') return s.pos[0] + s.half[0];
  return s.pos[0] - s.half[0];
};

const curbs = [
  curb('mL', edge(meadow, 'w') + 0.02, meadow.pos[2], 0.3, meadow.d - 0.3, TOP),
  curb('mR', edge(meadow, 'e') - 0.02, meadow.pos[2], 0.3, meadow.d - 0.3, TOP),
  curb('mB', 0, edge(meadow, 's') + 0.02, 4.15, 0.3, TOP),

  curb('aL', edge(after, 'w') + 0.02, after.pos[2], 0.32, after.d, TOP),
  curb('aR', edge(after, 'e') - 0.02, after.pos[2], 0.32, after.d, TOP),
  // Wooden stop across the gear gap. Removed while the bridge is out.
  curb('gearstop', 0, edge(after, 'n') - 0.02, 3.05, 0.28, TOP, 0.4, 'wood'),

  curb('lW', edge(land, 'w') + 0.02, land.pos[2], 0.3, land.d, TOP),
  curb('lN', 0, edge(land, 'n') - 0.02, 3.55, 0.28, TOP),
  curb('lE1', edge(land, 'e') - 0.02, land.pos[2] + 0.78, 0.28, 0.7, TOP),
  curb('lE2', edge(land, 'e') - 0.02, land.pos[2] - 0.78, 0.28, 0.7, TOP),

  curb('bS', basin.pos[0], edge(basin, 's') + 0.04, basin.w, 0.28, WTOP, 0.5, 'stone'),
  curb('bE1', edge(basin, 'e') - 0.02, edge(basin, 's') + 0.28, 0.28, 0.56, WTOP, 0.55, 'stone'),
  curb('bE2', edge(basin, 'e') - 0.02, edge(basin, 'n') - 0.42, 0.28, 0.7, WTOP, 0.55, 'stone'),
  curb('pW', edge(pool, 'w') + 0.02, pool.pos[2], 0.26, pool.d, WTOP, 0.48, 'stone'),
  curb('pE', edge(pool, 'e') - 0.02, pool.pos[2], 0.26, pool.d, WTOP, 0.48, 'stone'),
  curb('pN', pool.pos[0], edge(pool, 'n') - 0.02, pool.w, 0.26, WTOP, 0.48, 'stone'),

  curb('cN', channel.pos[0] + 0.55, edge(channel, 'n') - 0.02, channel.w - 1.1, 0.26, WTOP, 0.5, 'stone'),
  curb('cS', channel.pos[0] + 0.55, edge(channel, 's') + 0.02, channel.w - 1.1, 0.26, WTOP, 0.5, 'stone'),

  curb('wE', edge(windpad, 'e') - 0.02, windpad.pos[2] - 0.15, 0.28, windpad.d - 0.55, WTOP, 0.5, 'stone'),
  curb('wS', windpad.pos[0], edge(windpad, 's') + 0.02, windpad.w, 0.28, WTOP, 0.48, 'stone'),

  // Gust walls — they keep a leap from spilling sideways.
  curb('gustL', edge(windpad, 'w') + 0.15, (edge(windpad, 'n') + edge(high, 's')) / 2, 0.28, (edge(high, 's') - edge(windpad, 'n')) + 0.4, 0.2, 2.6, 'stone'),
  curb('gustR', edge(windpad, 'e') - 0.05, (edge(windpad, 'n') + edge(high, 's')) / 2, 0.28, (edge(high, 's') - edge(windpad, 'n')) + 0.4, 0.2, 2.6, 'stone'),

  curb('hN', high.pos[0] + 0.15, edge(high, 'n') - 0.02, high.w - 0.4, 0.28, highTop, 0.55),
  curb('hE', edge(high, 'e') - 0.02, high.pos[2], 0.28, high.d, highTop, 0.55),
  curb('hWn', edge(high, 'w') + 0.02, edge(high, 'n') - 0.48, 0.28, 0.9, highTop, 0.5),

  curb('fN', flower.pos[0], edge(flower, 'n') - 0.02, flower.w, 0.3, flowerTop, 0.55, 'petal'),
  curb('fS', flower.pos[0], edge(flower, 's') + 0.02, flower.w, 0.3, flowerTop, 0.5, 'petal'),
  curb('fW', edge(flower, 'w') + 0.02, flower.pos[2], 0.3, flower.d, flowerTop, 0.55, 'petal'),
];

const join = ramp(
  'join',
  edge(land, 'e') - 0.08, TOP, land.pos[2],
  edge(basin, 'w') + 0.28, WTOP + 0.01, basin.pos[2],
  1.45, 0.16, 'stone'
);
const petal = ramp(
  'petal',
  edge(high, 'w') - 0.05, highTop, high.pos[2],
  edge(flower, 'e') + 0.15, flowerTop + 0.01, flower.pos[2],
  1.45, 0.16, 'wood'
);

function railFor(box, side, id) {
  const lift = 0.2;
  const oz = side * (box.half[2] + 0.1);
  return {
    id, mat: 'wood',
    pos: [
      box.pos[0] + box.az[0] * oz + box.ay[0] * lift,
      box.pos[1] + box.az[1] * oz + box.ay[1] * lift,
      box.pos[2] + box.az[2] * oz + box.ay[2] * lift,
    ],
    half: [box.half[0] * 0.92, 0.12, 0.1],
    ax: box.ax, ay: box.ay, az: box.az,
  };
}

const yPip = (top) => top + PIP_R + 0.02;

export const LEVEL = {
  top: TOP,
  waterTop: WTOP,
  highTop,
  spawn: { x: 0, y: yPip(TOP), z: meadowSouth + 0.85 },
  slabs,
  curbs,
  seesaw: {
    id: 'seesaw',
    x: 0,
    pivotZ: SEE_PIVOT_Z,
    posY: SEE_POS_Y,
    hy: SEE_HY,
    halfX: 0.82,
    halfZ: SEE_HZ,
    rest: SEE_REST,
    min: -0.11,
    max: SEE_MAX,
  },
  bridge: {
    id: 'bridge',
    pos: [0, TOP - 0.07, (edge(after, 'n') + edge(land, 's')) / 2],
    half: [1.42, 0.07, (edge(land, 's') - edge(after, 'n')) / 2 + 0.22],
    yaw: 1,
  },
  gate: {
    id: 'gate',
    pos: [edge(basin, 'e') - 0.02, WTOP + 0.32, basin.pos[2]],
    half: [0.12, 0.32, 0.62],
    openYaw: 2,
  },
  ramps: [join, petal],
  rails: [railFor(petal, 1, 'petalL'), railFor(petal, -1, 'petalR')],
  water: [
    { id: 'basin', x: basin.pos[0], z: basin.pos[2], hw: basin.half[0], hd: basin.half[2], y: WTOP + 0.35 },
    { id: 'pool', x: pool.pos[0], z: pool.pos[2], hw: pool.half[0], hd: pool.half[2], y: WTOP + 0.35 },
    { id: 'channel', x: channel.pos[0], z: channel.pos[2], hw: channel.half[0], hd: channel.half[2], y: WTOP + 0.35 },
  ],
  currents: {
    1: [
      { x: basin.pos[0], z: (basin.pos[2] + pool.pos[2]) / 2, hw: 1.4, hd: 2.5, ax: 0, az: 3.1 },
    ],
    2: [
      { x: pool.pos[0], z: pool.pos[2], hw: pool.half[0], hd: pool.half[2], ax: 0, az: -3.3 },
      { x: (basin.pos[0] + windpad.pos[0]) / 2, z: basinZ, hw: 4.4, hd: 0.85, ax: 3.15, az: 0 },
    ],
  },
  wind: {
    x: windpad.pos[0],
    z: (edge(windpad, 'n') + edge(high, 's')) / 2 + 0.35,
    hw: 1.2,
    hd: (edge(high, 's') - edge(windpad, 'n')) / 2 + 0.95,
    y0: 0.35,
    y1: highTop + 1.1,
    yaw: 3,
    home: { x: high.pos[0], y: highTop + PIP_R, z: edge(high, 's') + 1.05 },
  },
  goal: { x: flowerX - 0.35, z: flowerZ + 0.15, r: 1.15, y: yPip(flowerTop), yTol: 1.3 },
  seeds: [
    { id: 's1', x: 0.15, z: meadowZ + 0.2, y: TOP + 0.72 },
    { id: 's2', x: -0.55, z: afterZ, y: TOP + 0.72 },
    { id: 's3', x: 1.15, z: landZ, y: TOP + 0.72 },
    { id: 's4', x: pool.pos[0], z: pool.pos[2] + 0.15, y: WTOP + 0.7 },
    { id: 's5', x: channel.pos[0], z: channel.pos[2], y: WTOP + 0.7 },
    { id: 's6', x: windpad.pos[0] - 0.15, z: windpad.pos[2] + 0.15, y: WTOP + 0.7 },
    { id: 's7', x: high.pos[0] - 0.15, z: edge(high, 's') + 1.2, y: highTop + 0.72 },
    { id: 's8', x: edge(flower, 'e') - 0.7, z: flowerZ, y: flowerTop + 0.7 },
  ],
  checkpoints: [
    { id: 'c0', x: 0, z: meadowSouth + 0.85, y: yPip(TOP), r: 1.4, yaw: 0 },
    { id: 'c1', x: 0, z: afterZ - 0.15, y: yPip(TOP), r: 1.05, yaw: 0 },
    { id: 'c2', x: 0, z: landZ, y: yPip(TOP), r: 1.05, yaw: 1 },
    { id: 'c3', x: windpad.pos[0], z: windpad.pos[2] - 0.15, y: yPip(WTOP), r: 1.05, yaw: 2 },
    { id: 'c4', x: high.pos[0], z: edge(high, 's') + 1.05, y: yPip(highTop), r: 1.15, yaw: 3 },
  ],
  // Props the picture needs and the physics ignores.
  props: {
    gear: { x: 0, z: bridgeZ, y: TOP - 0.15 },
    mill: { x: edge(windpad, 'e') - 0.35, z: edge(windpad, 'n') - 0.15, y: WTOP },
    wheel: { x: edge(channel, 'e') - 0.15, z: basinZ, y: WTOP },
    flower: { x: flowerX - 0.15, z: flowerZ + 0.25, y: flowerTop },
    plinth: { x: 4.6, z: 2.2 },
  },
};

export const LAYOUT = { southTip, northTip, meadowNorth, afterSouth, afterNorth, landSouth, bridgeZ };
