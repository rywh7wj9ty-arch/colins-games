// Stitchling: The Craftyard Dash. Original handmade-craft 3D runner (three.js). One level.
import * as THREE from './vendor/three/three.module.js';
import { DT, buildLevel, newState, step, platY, pendPos, speedAt, medalFor, PW } from './logic.js?v=202610242200';
import { Audio } from './audio.js?v=202610242200';

const VERSION = 'v1.0';
const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const L = buildLevel();
const audio = new Audio();

// ---------------- save ----------------
const SKEY = 'stitchling.v1';
const save = Object.assign({ music: 0.7, sfx: 0.8, bright: 0.5, reduced: 0, shake: 1, a2hs: 0,
  st: { runs: 0, fin: 0, best: 0, bestMedal: 0, bestTime: 0, bubbles: 0, deaths: 0, jumps: 0, slides: 0, play: 0, prizes: [] } }, (() => { try { return JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) { return {}; } })());
save.st = Object.assign({ runs: 0, fin: 0, best: 0, bestMedal: 0, bestTime: 0, bubbles: 0, deaths: 0, jumps: 0, slides: 0, play: 0, prizes: [] }, save.st);
const persist = () => { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) {} };
audio.music = save.music; audio.sfx = save.sfx;

// ---------------- renderer ----------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
let dprMax = Math.min(2, window.devicePixelRatio || 1), dpr = dprMax;
renderer.setPixelRatio(dpr);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = !save.reduced;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('game').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const SKY = new THREE.Color('#ffeccc');
scene.fog = new THREE.Fog(SKY, 70, 190);
const camera = new THREE.PerspectiveCamera(38, 2, 0.5, 400);
function applyBright() { renderer.toneMappingExposure = 0.78 + save.bright * 0.6; }
applyBright();

// ---------------- procedural craft textures ----------------
const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = ANISO; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
let seed = 1234; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const rr = (a, b) => a + (b - a) * rnd();
function fibres(g, w, h, n, light, dark, len = 6) {
  for (let i = 0; i < n; i++) { const x = rnd() * w, y = rnd() * h, a = rnd() * Math.PI * 2, l = len * (0.4 + rnd());
    g.strokeStyle = rnd() < 0.5 ? light : dark; g.lineWidth = 0.6 + rnd() * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
}
function speckle(g, w, h, n, cols, r0 = 0.5, r1 = 1.6) { for (let i = 0; i < n; i++) { g.fillStyle = cols[(rnd() * cols.length) | 0]; g.beginPath(); g.arc(rnd() * w, rnd() * h, r0 + rnd() * (r1 - r0), 0, 7); g.fill(); } }
const TX = {};
TX.felt = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, w, h); speckle(g, w, h, 2500, ['rgba(255,255,255,.35)', 'rgba(0,0,0,.06)'], 0.4, 1.4); fibres(g, w, h, 2600, 'rgba(255,255,255,.4)', 'rgba(0,0,0,.08)', 5); });
TX.feltStitch = canvasTex(256, 64, (g, w, h) => { g.drawImage(TX.felt.image, 0, 0, w, h, 0, 0, w, h); g.strokeStyle = 'rgba(255,255,250,.95)'; g.lineWidth = 4; g.lineCap = 'round'; g.setLineDash([14, 12]); g.beginPath(); g.moveTo(0, h * 0.5); g.lineTo(w, h * 0.5); g.stroke();
  g.setLineDash([]); g.strokeStyle = 'rgba(0,0,0,.18)'; for (let x = 7; x < w; x += 26) { g.beginPath(); g.arc(x + 7, h * 0.5 + 3, 3, 0, Math.PI); g.stroke(); } });
TX.burlap = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c9a36b'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { const o = ((x + y) / 8) % 2; const s = 0.85 + rnd() * 0.3;
    g.fillStyle = o ? `rgba(110,75,35,${0.25 * s})` : `rgba(255,235,190,${0.25 * s})`; g.fillRect(x, y + 1, 8, 5); g.fillStyle = o ? `rgba(255,235,190,${0.22 * s})` : `rgba(110,75,35,${0.22 * s})`; g.fillRect(x + 1, y, 5, 8); }
  fibres(g, w, h, 900, 'rgba(255,240,200,.25)', 'rgba(80,50,20,.18)', 7); });
TX.card = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d29a5c'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 9) { const gr = g.createLinearGradient(x, 0, x + 9, 0); gr.addColorStop(0, 'rgba(120,70,30,.10)'); gr.addColorStop(.5, 'rgba(255,230,180,.12)'); gr.addColorStop(1, 'rgba(120,70,30,.10)'); g.fillStyle = gr; g.fillRect(x, 0, 9, h); }
  speckle(g, w, h, 500, ['rgba(90,50,20,.18)', 'rgba(255,240,200,.2)'], 0.3, 1.2); g.fillStyle = 'rgba(90,50,20,.12)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 10 + rnd() * 20, 5 + rnd() * 8, rnd() * 3, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(240,225,180,.55)'; g.fillRect(0, 200, w, 26); g.strokeStyle = 'rgba(120,80,40,.25)'; g.lineWidth = 1; g.strokeRect(-2, 200, w + 4, 26);
  g.font = 'bold 20px Fredoka, sans-serif'; g.fillStyle = 'rgba(80,45,20,.35)'; g.fillText('↑ THIS WAY UP ↑', 40, 120); });
TX.cork = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c08a52'; g.fillRect(0, 0, w, h); speckle(g, w, h, 5000, ['#8b5a2b', '#e0b07a', '#a26a36', '#f2c995', '#6e4520'], 0.4, 2.0); });
TX.denim = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#4874b4'; g.fillRect(0, 0, w, h); g.lineWidth = 2;
  for (let i = -h; i < w; i += 5) { g.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,.13)' : 'rgba(10,30,70,.18)'; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); }
  speckle(g, w, h, 700, ['rgba(255,255,255,.25)'], 0.3, 0.9); g.strokeStyle = '#f2b33c'; g.lineWidth = 3; g.setLineDash([10, 7]); [18, 238].forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }); });
TX.sponge = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffd84f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 420; i++) { const x = rnd() * w, y = rnd() * h, r = 1 + rnd() * 4.5; g.fillStyle = 'rgba(190,130,10,.45)'; g.beginPath(); g.ellipse(x, y, r, r * 0.8, rnd() * 3, 0, 7); g.fill(); g.fillStyle = 'rgba(255,250,200,.5)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.4, r * 0.35, 0, 7); g.fill(); } });
TX.stripe = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#fff3d6'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2a33a'; for (let i = -w; i < w * 2; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 16 + h, h); g.lineTo(i + h, h); g.fill(); } fibres(g, w, h, 400, 'rgba(255,255,255,.3)', 'rgba(0,0,0,.08)', 4); });
TX.wood = canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#d8a865'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 3) { g.strokeStyle = `rgba(120,70,30,${0.05 + rnd() * 0.12})`; g.beginPath(); g.moveTo(x + rnd() * 2, 0); g.bezierCurveTo(x + rnd() * 6, h * .3, x - rnd() * 6, h * .7, x, h); g.stroke(); } });
TX.check = canvasTex(64, 64, (g, w, h) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#3b2a20' : '#fff8ea'; g.fillRect(x * 16, y * 16, 16, 16); } });
const sky = canvasTex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8fd0ff'); gr.addColorStop(0.55, '#cdeaff'); gr.addColorStop(0.85, '#fff0d4'); gr.addColorStop(1, '#ffe2b0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });

function boxUV(geo, w, h, d, s = 2) {
  const uv = geo.attributes.uv; const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / s, uv.getY(i) * dims[f][1] / s); }
  uv.needsUpdate = true; return geo;
}
const matCache = {};
function mat(key, o) { return matCache[key] || (matCache[key] = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.92, metalness: 0 }, o))); }
const M = {
  burlap: mat('burlap', { map: TX.burlap, bumpMap: TX.burlap, bumpScale: 1.5, color: '#f0dcc0' }),
  card: mat('card', { map: TX.card, bumpMap: TX.card, bumpScale: 0.8 }),
  cork: mat('cork', { map: TX.cork, bumpMap: TX.cork, bumpScale: 2 }),
  denim: mat('denim', { map: TX.denim, bumpMap: TX.denim, bumpScale: 1 }),
  sponge: mat('sponge', { map: TX.sponge, bumpMap: TX.sponge, bumpScale: 3, roughness: 1 }),
  wood: mat('wood', { map: TX.wood }),
  stripe: mat('stripe', { map: TX.stripe }),
  check: mat('check', { map: TX.check }),
};
const feltCache = {};
function felt(color, stitched) { const k = color + (stitched ? 's' : ''); return feltCache[k] || (feltCache[k] = new THREE.MeshStandardMaterial({ map: stitched ? TX.feltStitch : TX.felt, bumpMap: TX.felt, bumpScale: 1.2, color, roughness: 1 })); }

// ---------------- lights ----------------
const hemi = new THREE.HemisphereLight('#fff6e6', '#b98c5e', 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffe7c2', 2.1); sun.position.set(-8, 18, 14); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 14, bottom: -10, near: 1, far: 60 }); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#cfe6ff', 0.55); fill.position.set(10, 6, 12); scene.add(fill);

// ---------------- zones / palette ----------------
const ZCOL = { 'Felt Meadow': ['#7cc45a', '#9ad46f', '#c3e6a3'], 'Cardboard Town': ['#f0a04b', '#f5bd78', '#f9d9ae'], 'Swing Workshop': ['#47b5ab', '#7ccdc4', '#b7e5df'],
  'Collapse Canyon': ['#a98ad8', '#c3aee6', '#ddd0f0'], 'Sock Drawer Hills': ['#ef8fb5', '#f5b1cd', '#f9d3e2'], 'Funfair Finale': ['#f2c13d', '#f6d679', '#fae8b5'] };
function zoneAt(x) { let z = L.ZONES[0]; for (const q of L.ZONES) if (x >= q.x - 2) z = q; return z; }
const zcol = (x, i = 0) => ZCOL[zoneAt(x).name][i];

// ---------------- instanced batching for decor ----------------
const batches = new Map();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
function inst(key, geo, material, pos, rot = [0, 0, 0], scl = [1, 1, 1], color, shadow = false) {
  let b = batches.get(key); if (!b) batches.set(key, b = { geo, material, list: [], shadow });
  b.list.push({ p: pos, r: rot, s: scl, c: color });
}
function flushBatches() {
  for (const [k, b] of batches) {
    const im = new THREE.InstancedMesh(b.geo, b.material, b.list.length);
    b.list.forEach((it, i) => { _m.compose(_v.set(...it.p), _q.setFromEuler(_e.set(...it.r)), _s.set(...it.s)); im.setMatrixAt(i, _m); im.setColorAt(i, _c.set(it.c || '#ffffff')); });
    im.castShadow = b.shadow; im.receiveShadow = true; im.frustumCulled = false; scene.add(im);
  }
}

// ---------------- level meshes ----------------
const D = 4.2; // platform depth
const platMeshes = [];
const SCALLOP = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 10, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2);
const TUFT = (() => { const g = new THREE.ConeGeometry(0.12, 0.6, 5); g.translate(0, 0.3, 0); return g; })();
const FLOWER = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 6);
const STEM = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 4);
function makePlatform(p) {
  const g = new THREE.Group(); const w = p.x1 - p.x0, top = p.y, bot = Math.max(p.b, -9);
  const capT = p.t === 'sponge' ? 0 : 0.3;
  const bodyMat = { felt: M.burlap, card: M.card, cork: M.cork, denim: M.denim, sponge: M.sponge }[p.t];
  const bh = top - capT - bot;
  const body = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, bh, D), w, bh, D, p.t === 'card' ? 3 : 2), bodyMat);
  body.position.set(w / 2, -capT - bh / 2, 0); body.castShadow = true; body.receiveShadow = true; g.add(body);
  if (capT) {
    const col = p.collapse ? '#f4e2bf' : zcol(p.x0 + 1);
    const cw = w + 0.24, cd = D + 0.24;
    const cap = new THREE.Mesh(boxUV(new THREE.BoxGeometry(cw, capT, cd), cw, capT, cd, 1.1), [felt(col, 1), felt(col, 1), felt(col), felt(col), felt(col, 1), felt(col, 1)]);
    const uv = cap.geometry.attributes.uv; for (const f of [0, 1, 4, 5]) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setY(i, uv.getY(i) > 0 ? 1 : 0); }
    cap.position.set(w / 2, -capT / 2, 0); cap.castShadow = true; cap.receiveShadow = true; g.add(cap);
    if (!p.collapse) for (let x = 0.3; x < w - 0.1; x += 0.56) inst('scallop', SCALLOP, felt('#ffffff'), [p.x0 + x, top - capT, D / 2 + 0.08], [0, 0, 0], [1, 1, 1], col);
    if (p.t !== 'sponge' && !p.collapse && bot < -5) for (let x = rr(1, 4); x < w - 0.5; x += rr(2.5, 6)) {
      const z = rr(-1.8, -0.9); inst('tuft', TUFT, felt('#ffffff'), [p.x0 + x, top, z], [0, rr(0, 3), rr(-0.2, 0.2)], [1, rr(0.7, 1.3), 1], zcol(p.x0 + x, 1));
      inst('tuft', TUFT, felt('#ffffff'), [p.x0 + x + 0.18, top, z + 0.1], [0, 0, -0.35], [0.8, rr(0.6, 1), 0.8], zcol(p.x0 + x, 0));
      if (rnd() < 0.45) { inst('flower', FLOWER, felt('#ffffff'), [p.x0 + x + 0.5, top + 0.47, z - 0.2], [Math.PI / 2 - 0.4, 0, 0], [1, 1, 1], ['#ffffff', '#ffd84f', '#8fd0ff', '#ffb0d0'][(rnd() * 4) | 0]); inst('stem', STEM, felt('#5aa040'), [p.x0 + x + 0.5, top + 0.22, z - 0.2]); }
    }
  }
  if (p.collapse) for (let x = 1; x < w; x += 3) { const tape = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, D + 0.3), mat('tape', { color: '#efe0b8', roughness: 0.5, transparent: true, opacity: 0.85 })); tape.position.set(x, -0.15, 0); g.add(tape); }
  g.position.set(p.x0, top, 0); scene.add(g);
  platMeshes.push({ p, g, w });
}
for (const p of L.P) makePlatform(p);

// springs
const springs = L.SP.map(sp => {
  const g = new THREE.Group(); g.position.set(sp.x, sp.y, 0);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.15, 20), felt('#5b88d6')); base.position.y = 0.07; g.add(base);
  const pts = []; for (let i = 0; i <= 80; i++) { const a = i / 80 * Math.PI * 10; pts.push(new THREE.Vector3(Math.cos(a) * 0.45, i / 80 * 0.5, Math.sin(a) * 0.45)); }
  const coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.05, 6), mat('coil', { color: '#d9dde4', metalness: 0.6, roughness: 0.3 })); coil.position.y = 0.12; g.add(coil);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.18, 24), felt('#ff8a3d', 1)); pad.position.y = 0.7; g.add(pad);
  const star = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.02, 5), felt('#fff3a0')); star.position.y = 0.8; g.add(star);
  g.traverse(o => { o.castShadow = true; }); scene.add(g); return { sp, g, coil, pad, star };
});

// hazards
const pends = [], thistles = [];
const feltCoral = felt('#e8664a');
for (const z of L.HZ) {
  if (z.k === 'pend') {
    const g = new THREE.Group(); g.position.set(z.x, z.py, 0);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 3.6), M.wood); beam.position.z = -1.0; g.add(beam);
    const arm = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, z.L, 8), M.wood); rod.position.y = -z.L / 2; arm.add(rod);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(z.r, z.r, 1.5, 20), M.stripe); head.rotation.x = Math.PI / 2; head.position.y = -z.L; arm.add(head);
    for (const s of [-1, 1]) { const capm = new THREE.Mesh(new THREE.CylinderGeometry(z.r + 0.05, z.r + 0.05, 0.15, 20), feltCoral); capm.rotation.x = Math.PI / 2; capm.position.set(0, -z.L, s * 0.75); arm.add(capm); }
    g.add(arm); g.traverse(o => o.castShadow = true); scene.add(g); pends.push({ z, arm });
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, z.py - 0.2, 8), M.wood); post.position.set(z.x + s * 1.0, z.py / 2 + 0.05, -2.6); post.castShadow = true; scene.add(post); }
  } else if (z.k === 'bar') {
    const w = z.x1 - z.x0, g = new THREE.Group();
    const beam = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, z.y1 - z.y0, 3.6), w, 0.5, 3.6, 1), M.stripe); g.add(beam);
    for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4, 4), mat('string', { color: '#fff6e0' })); st.position.set(0, 2.2, s * 1.6); g.add(st); }
    g.position.set((z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2, 0); g.traverse(o => o.castShadow = true); scene.add(g);
  } else {
    const g = new THREE.Group(); g.position.set(z.x, z.y, 0);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(z.r * 0.75, 1), felt('#9b6fd6')); g.add(core);
    const sg = new THREE.ConeGeometry(0.09, 0.42, 5); sg.translate(0, 0.21, 0);
    const ico = new THREE.IcosahedronGeometry(1, 0).attributes.position;
    for (let i = 0; i < ico.count; i += 3) { const n = new THREE.Vector3().fromBufferAttribute(ico, i).add(new THREE.Vector3().fromBufferAttribute(ico, i + 1)).add(new THREE.Vector3().fromBufferAttribute(ico, i + 2)).normalize(); const sp = new THREE.Mesh(sg, felt('#c9a6f2')); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); sp.position.copy(n).multiplyScalar(z.r * 0.6); g.add(sp); }
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat('eyeW', { color: '#ffffff', roughness: 0.4 })); e.position.set(s * 0.13, 0.08, z.r * 0.72); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), mat('eyeB', { color: '#24160e' })); pu.position.set(s * 0.13 - 0.02, 0.07, z.r * 0.72 + 0.07); g.add(e, pu); }
    g.traverse(o => o.castShadow = true); scene.add(g); thistles.push({ z, g });
  }
}

// score bubbles (instanced) + highlights + little gold cores
const bubMat = new THREE.MeshStandardMaterial({ color: '#bfe8ff', emissive: '#4fb3ff', emissiveIntensity: 0.35, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.82 });
const bubs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 20, 14), bubMat, L.B.length);
const his = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), L.B.length);
const cores = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.13, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffc94a', emissiveIntensity: 0.7, roughness: 0.4 }), L.B.length);
for (const im of [bubs, his, cores]) { im.frustumCulled = false; scene.add(im); }
const bubHidden = new Uint8Array(L.B.length);
let bubFirst = true;
function updBubbles(t, cx) {
  for (const b of L.B) {
    const i = b.id; if (!bubFirst && Math.abs(b.x - cx) > 45) continue;
    const s = bubHidden[i] ? 0 : 1, bob = Math.sin(t * 3 + b.x * 0.9) * 0.08;
    _m.compose(_v.set(b.x, b.y + bob, 0), _q.identity(), _s.set(s, s, s)); bubs.setMatrixAt(i, _m);
    _m.compose(_v.set(b.x - 0.11, b.y + bob + 0.12, 0.22), _q.identity(), _s.set(s, s * 0.8, s)); his.setMatrixAt(i, _m);
    _m.compose(_v.set(b.x, b.y + bob, 0), _q.setFromEuler(_e.set(0, t * 2 + b.x, 0)), _s.set(s, s, s)); cores.setMatrixAt(i, _m);
  }
  bubFirst = false;
  bubs.instanceMatrix.needsUpdate = his.instanceMatrix.needsUpdate = cores.instanceMatrix.needsUpdate = true;
}

// prize bubbles with stickers
const PICON = { 'Felt Crown': '👑', 'Button Badge': '🔘', 'Zip Sticker': '⚡', 'Thimble Hat': '🎩', 'Sock Puppet': '🧦', 'Golden Spool': '🧵' };
const prizes = L.PR.map(pr => {
  const g = new THREE.Group(); g.position.set(pr.x, pr.y, 0);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.85, 28, 20), new THREE.MeshStandardMaterial({ color: '#fff4c8', emissive: '#ffbf3a', emissiveIntensity: 0.25, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.5, depthWrite: false }));
  const tex = canvasTex(128, 128, (c) => { c.fillStyle = '#ffe07a'; c.beginPath(); c.arc(64, 64, 58, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 6; c.setLineDash([10, 7]); c.beginPath(); c.arc(64, 64, 50, 0, 7); c.stroke(); c.font = '62px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(PICON[pr.name] || '★', 64, 70); });
  const st = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.25 }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.05, 6, 40), new THREE.MeshBasicMaterial({ color: '#fff2a8', transparent: true, opacity: 0.6 }));
  g.add(st, ball, ring); scene.add(g); return { pr, g, st, ring, gone: 0 };
});

// checkpoints
const cps = L.CP.slice(1).map(c => {
  const g = new THREE.Group(); g.position.set(c.x, c.y, -1.2);
  for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 4.2, 10), M.card); post.position.set(s * 1.6, 2.1, 0); g.add(post); const knob = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), felt('#ffffff')); knob.position.set(s * 1.6, 4.3, 0); g.add(knob); }
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.0, 12, 1), felt('#d8cfc0', 1).clone()); banner.material.side = THREE.DoubleSide; banner.position.set(0, 3.6, 0); g.add(banner);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6, 6, 1), felt('#cfc4b0').clone()); flag.material.side = THREE.DoubleSide; flag.position.set(2.1, 4.0, 0); g.add(flag);
  g.traverse(o => o.castShadow = true); scene.add(g); return { c, g, banner, flag, on: 0 };
});
// finish gate
const finish = (() => {
  const g = new THREE.Group(); const gy = L.P.find(p => p.x0 <= L.FIN && p.x1 >= L.FIN).y; g.position.set(L.FIN, gy, 0);
  for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6.5, 0.7), M.stripe); post.position.set(0, 3.25, s * 2.4); g.add(post); }
  const top = new THREE.Mesh(boxUV(new THREE.BoxGeometry(1.0, 1.4, 5.6), 1, 1.4, 5.6, 0.7), M.check); top.position.set(0, 6.6, 0); g.add(top);
  const tex = canvasTex(512, 128, (c, w, h) => { c.fillStyle = '#5fae52'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 6; c.setLineDash([18, 12]); c.strokeRect(10, 10, w - 20, h - 20); c.font = 'bold 76px Fredoka, sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('FINISH!', w / 2, h / 2 + 4); });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })); sign.position.set(0, 8.0, 0.4); g.add(sign);
  g.traverse(o => o.castShadow = true); scene.add(g); return { g, gy };
})();

// signs
for (const s of L.SIGNS) {
  const tex = canvasTex(256, 128, (c, w, h) => { c.drawImage(TX.card.image, 0, 0, 256, 128, 0, 0, w, h); c.fillStyle = 'rgba(255,240,210,.35)'; c.fillRect(0, 0, w, h); c.strokeStyle = '#7a4524'; c.lineWidth = 6; c.setLineDash([12, 8]); c.strokeRect(10, 10, w - 20, h - 20);
    c.font = 'bold 56px Fredoka, sans-serif'; c.fillStyle = '#6b3b1d'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s.text, w / 2, h / 2 + 4); });
  const g = new THREE.Group(); g.position.set(s.x, s.y, -1.9);
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.08), [M.card, M.card, M.card, M.card, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), M.card]); board.position.y = 2.0; board.rotation.z = rr(-0.08, 0.08);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2, 6), M.wood); stick.position.y = 1.0; g.add(board, stick); g.traverse(o => o.castShadow = true); scene.add(g);
}

// ---------------- dioramic background ----------------
const X0 = -60, X1 = L.END + 80;
const STITCH = new THREE.BoxGeometry(0.7, 0.09, 0.04);
function hillLayer(z, yBase, amp, freq, colIdx, alt, stitch) {
  const zones = L.ZONES.map((q, i) => ({ x0: i ? q.x : X0, x1: L.ZONES[i + 1] ? L.ZONES[i + 1].x : X1, name: q.name }));
  for (const zn of zones) {
    const sh = new THREE.Shape(); sh.moveTo(zn.x0 - 1, -14); const pts = [];
    for (let x = zn.x0 - 1; x <= zn.x1 + 1.5; x += 1.5) { const y = yBase + amp * (0.55 * Math.sin(x * freq + alt) + 0.3 * Math.sin(x * freq * 2.3 + alt * 2) + 0.15 * Math.sin(x * freq * 5.1)); pts.push([x, y]); sh.lineTo(x, y); }
    sh.lineTo(pts[pts.length - 1][0], -14); sh.lineTo(zn.x0 - 1, -14);
    const geo = new THREE.ShapeGeometry(sh); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 6, uv.getY(i) / 6);
    const mesh = new THREE.Mesh(geo, felt(ZCOL[zn.name][colIdx])); mesh.position.z = z; mesh.receiveShadow = colIdx === 0; scene.add(mesh);
    if (stitch) for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i]; const a = Math.atan2(by - ay, bx - ax);
      inst('stitch' + z, STITCH, mat('stitchW', { color: '#fffaf0' }), [(ax + bx) / 2, (ay + by) / 2 - 0.35, z + 0.05], [0, 0, a], [1, 1, 1]); }
  }
}
hillLayer(-9, -2.2, 3.2, 0.11, 0, 0.5, true);
hillLayer(-22, 1.0, 5.0, 0.06, 1, 2.0, true);
hillLayer(-44, 5.0, 8.5, 0.03, 2, 4.0, false);
const skyMesh = new THREE.Mesh(new THREE.PlaneGeometry(700, 200), new THREE.MeshBasicMaterial({ map: sky, fog: false, depthWrite: false }));
skyMesh.position.set(0, 30, -130); scene.add(skyMesh);
const sunG = new THREE.Group(); {
  const disc = new THREE.Mesh(new THREE.CircleGeometry(5, 40), new THREE.MeshBasicMaterial({ color: '#ffd45a', fog: false })); sunG.add(disc);
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.1, 4.3, 40), new THREE.MeshBasicMaterial({ color: '#fff4c2', fog: false })); ring.position.z = 0.05; sunG.add(ring);
  for (let i = 0; i < 12; i++) { const ray = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.6), new THREE.MeshBasicMaterial({ color: '#ffe37e', fog: false })); const a = i / 12 * Math.PI * 2; ray.position.set(Math.cos(a) * 7, Math.sin(a) * 7, -0.05); ray.rotation.z = a - Math.PI / 2; sunG.add(ray); }
  sunG.position.set(0, 26, -100); scene.add(sunG);
}
const CLOUD = (() => { const s = new THREE.Shape(); s.moveTo(-3, 0); s.absarc(-1.8, 0.6, 1.3, Math.PI, Math.PI / 2, true); s.absarc(0.2, 1.3, 1.7, Math.PI, 0.2, true); s.absarc(2.2, 0.5, 1.2, Math.PI * 0.6, 0, true); s.lineTo(3.4, 0); s.lineTo(-3, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.25, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 }); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4); return g; })();
const clouds = [];
for (let x = X0; x < X1; x += rr(18, 30)) { const m = new THREE.Mesh(CLOUD, felt('#ffffff')); const z = rr(-34, -26); m.position.set(x, rr(13, 19), z); m.scale.setScalar(rr(0.9, 1.5)); scene.add(m);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 20, 4), M.wood); stick.position.set(x, m.position.y - 10, z - 0.2); scene.add(stick); clouds.push({ m, stick, y0: m.position.y, ph: rnd() * 6 }); }

const TREE_C = new THREE.ConeGeometry(1, 1.6, 9); const TRUNK = new THREE.CylinderGeometry(0.18, 0.22, 1.6, 7);
const BUTTON = new THREE.CylinderGeometry(1, 1, 0.22, 28).rotateX(Math.PI / 2);
const HOLE = new THREE.CylinderGeometry(0.13, 0.13, 0.25, 8).rotateX(Math.PI / 2);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const ROOF = new THREE.CylinderGeometry(0.75, 0.75, 1, 3).rotateX(Math.PI / 2).rotateZ(Math.PI / 2);
const SPOOL = new THREE.CylinderGeometry(1, 1, 1, 24); const SPOOLR = new THREE.CylinderGeometry(1.25, 1.25, 0.18, 24);
const YARN = new THREE.SphereGeometry(1, 20, 14); const SOCK = new THREE.BoxGeometry(0.8, 2.2, 0.15); const TOE = new THREE.BoxGeometry(1.3, 0.7, 0.16);
const TENT = new THREE.ConeGeometry(1, 1, 10), TENTB = new THREE.CylinderGeometry(1, 1, 1, 10), POLE = new THREE.CylinderGeometry(0.1, 0.1, 1, 6), BULB = new THREE.SphereGeometry(0.16, 10, 8);
const FLAG = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-0.35, 0, 0, 0.35, 0, 0, 0, -0.7, 0], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, .5, 0], 2)); g.computeVertexNormals(); return g; })();
const flagMat = new THREE.MeshStandardMaterial({ map: TX.felt, side: THREE.DoubleSide, roughness: 1 });
const gears = [], wheels = [];
const flagCols = ['#ff9e57', '#ffd84f', '#7cc45a', '#5bc0eb', '#b48cf2', '#ff8fc8'];
const pick = a => a[(rnd() * a.length) | 0];
function groundY(x) { let y = -2; for (const p of L.P) if (x >= p.x0 && x <= p.x1 && p.b < -5) y = Math.max(y, p.y); return y; }
function gearGeo(r) { const s = new THREE.Shape(); const n = Math.round(r * 6); s.moveTo(r + 0.35, 0); for (let i = 0; i < n * 2; i++) { const a0 = i / (n * 2) * Math.PI * 2, a1 = (i + 1) / (n * 2) * Math.PI * 2, r2 = i % 2 ? r : r + 0.35; s.lineTo(Math.cos(a0) * r2, Math.sin(a0) * r2); s.lineTo(Math.cos(a1) * r2, Math.sin(a1) * r2); }
  const h = new THREE.Path(); h.absarc(0, 0, r * 0.3, 0, Math.PI * 2, true); s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false }); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3); return g; }
function ferris() { const g = new THREE.Group(); const R = 6; const hub = new THREE.Group(); hub.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.18, 8, 48), felt('#ff9e57'))); const cars = [];
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const sp = new THREE.Mesh(new THREE.BoxGeometry(0.12, R, 0.12), M.wood); sp.position.set(Math.cos(a) * R / 2, Math.sin(a) * R / 2, 0); sp.rotation.z = a - Math.PI / 2; hub.add(sp);
    const car = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.5, 0.8, 10), felt(flagCols[i % 6])); car.position.set(Math.cos(a) * R, Math.sin(a) * R - 0.5, 0); hub.add(car); cars.push(car); }
  g.add(hub); for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 9, 0.3), M.wood); leg.position.set(s * 2.2, -4, -0.5); leg.rotation.z = s * 0.25; g.add(leg); }
  return { g, hub, cars }; }
for (let x = X0 + 10; x < X1 - 10; x += rr(5, 9)) {
  const zn = zoneAt(x).name, gy = Math.min(groundY(x), 3) - 0.6, z = rr(-7.5, -4.5), r = rnd();
  if (zn === 'Felt Meadow' || r < 0.12) {
    const h = rr(0.8, 1.4), col = pick([ZCOL[zn][0], '#5fae52', '#8fcf5a']);
    inst('trunk', TRUNK, M.card, [x, gy + 0.8 * h, z], [0, 0, 0], [h, h, h], null, true);
    for (let k = 0; k < 3; k++) inst('treec', TREE_C, felt('#ffffff'), [x, gy + (1.9 + k * 0.85) * h, z], [0, rnd() * 3, 0], [h * (1.3 - k * 0.3), h, h * (1.3 - k * 0.3)], col, true);
  } else if (zn === 'Cardboard Town') {
    const w = rr(2, 3.5), h = rr(2.5, 5);
    inst('house', BOX, M.card, [x, gy + h / 2, z - 1], [0, 0, 0], [w, h, 2], null, true);
    inst('roof', ROOF, felt('#ffffff'), [x, gy + h + 0.37, z - 1], [0, 0, 0], [w * 0.75, 1, 1.4], pick(['#e8664a', '#4f8fd1', '#5fae52', '#f2c13d']), true);
    for (let k = 0; k < 2; k++) inst('win', BOX, mat('win', { color: '#fff3c4', emissive: '#ffcf6a', emissiveIntensity: 0.4 }), [x + (k ? 0.25 : -0.25) * w, gy + h * 0.62, z], [0, 0, 0], [0.55, 0.65, 0.05]);
  } else if (zn === 'Swing Workshop') {
    if (r < 0.55) { const gm = new THREE.Mesh(gearGeo(rr(1.4, 2.4)), M.card); gm.position.set(x, gy + rr(3, 6), z - 1.5); gm.castShadow = true; scene.add(gm); gears.push({ g: gm, s: (rnd() < 0.5 ? -1 : 1) * rr(0.3, 0.8) }); }
    else { const h = rr(1.2, 2.2); inst('spool', SPOOL, felt('#ffffff'), [x, gy + h / 2 + 0.1, z], [0, 0, 0], [0.7, h, 0.7], pick(flagCols), true); inst('spoolr', SPOOLR, M.wood, [x, gy + 0.1, z], [0, 0, 0], [0.75, 1, 0.75], null, true); inst('spoolr', SPOOLR, M.wood, [x, gy + h + 0.1, z], [0, 0, 0], [0.75, 1, 0.75], null, true); }
  } else if (zn === 'Collapse Canyon') {
    const h = rr(3, 7); inst('pillar', BOX, M.cork, [x, gy + h / 2 - 1, z - 1], [0, rr(-0.3, 0.3), 0], [rr(1.5, 3), h, 2], null, true);
    if (rnd() < 0.5) inst('yarn', YARN, felt('#ffffff'), [x + 1, gy + 0.6, z + 1], [0, 0, 0], [0.7, 0.7, 0.7], pick(flagCols), true);
  } else if (zn === 'Sock Drawer Hills') {
    inst('yarn', YARN, felt('#ffffff'), [x, gy + 0.9, z], [0, 0, 0], [1, 1, 1], pick(flagCols), true);
    const c = pick(flagCols), sx = x + 2.5, sy = gy + rr(5, 7); inst('sock', SOCK, felt('#ffffff'), [sx, sy, z - 1], [0, 0, 0], [1, 1, 1], c, true); inst('sock', TOE, felt('#ffffff'), [sx + 0.25, sy - 1.3, z - 1], [0, 0, 0], [1, 1, 1], c, true);
    inst('sockband', BOX, felt('#ffffff'), [sx, sy + 0.95, z - 0.92], [0, 0, 0], [0.82, 0.3, 0.05]);
  } else {
    if (!wheels.length || r < 0.05) { const w = ferris(); w.g.position.set(x, gy + 7.5, -14); scene.add(w.g); wheels.push(w); }
    else { const h = rr(2.5, 4); inst('tent', TENT, M.stripe, [x, gy + h + 0.7, z - 1], [0, 0, 0], [2, 1.4, 2], null, true); inst('tentb', TENTB, M.stripe, [x, gy + h / 2, z - 1], [0, 0, 0], [1.9, h, 1.9], null, true); }
  }
  if (rnd() < 0.3) { const bx = x + 2, by = gy + 1.0; inst('btn', BUTTON, felt('#ffffff'), [bx, by, z - 0.5], [0, 0, rnd()], [1.1, 1.1, 1], pick(flagCols), true);
    for (const [hx, hy] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) inst('hole', HOLE, mat('holeM', { color: '#5a3a24' }), [bx + hx, by + hy, z - 0.45]); }
}
const bulbs = [];
for (let x = X0 + 20; x < X1 - 20; x += rr(26, 40)) {
  const z = -3.2, y0 = Math.max(groundY(x), groundY(x + 14)) + 6.2, span = 14;
  for (const px of [x, x + span]) { const gy = groundY(px); inst('pole', POLE, M.wood, [px, (gy + y0) / 2, z], [0, 0, 0], [1, y0 - gy + 0.3, 1], null, true); }
  for (let i = 1; i < 14; i++) { const f = i / 14, fx = x + span * f, fy = y0 - Math.sin(f * Math.PI) * 1.4;
    if (zoneAt(x).name === 'Funfair Finale' || i % 2) inst('flag', FLAG, flagMat, [fx, fy, z], [0, 0, 0], [1, 1, 1], flagCols[i % 6]); else bulbs.push([fx, fy - 0.25, z]); }
  const pts = []; for (let i = 0; i <= 20; i++) { const f = i / 20; pts.push(new THREE.Vector3(x + span * f, y0 - Math.sin(f * Math.PI) * 1.4, z)); }
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.025, 4), mat('string', { color: '#fff6e0' })));
}
for (const b of bulbs) inst('bulb', BULB, new THREE.MeshStandardMaterial({ color: '#fff4c4', emissive: '#ffcc55', emissiveIntensity: 1.1 }), b, [0, 0, 0], [1, 1.3, 1], pick(flagCols));
flushBatches();

// ---------------- Stitchling (the hero) ----------------
// Built facing local +z, then turned three-quarters toward the run direction (+x).
// Every hero material ignores fog, has an ink outline, and renders after the world so he always reads crisp.
const hero = new THREE.Group(); scene.add(hero);
const heroParts = new THREE.Group(); hero.add(heroParts);
const outlineMat = new THREE.MeshBasicMaterial({ color: '#3a2212', side: THREE.BackSide, fog: false });
outlineMat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normalize(normal) * 0.026;'); };
const sackTex = TX.burlap.clone(); sackTex.repeat.set(2.5, 2.5); sackTex.needsUpdate = true;
const sackMat = new THREE.MeshStandardMaterial({ map: sackTex, bumpMap: sackTex, bumpScale: 1.4, color: '#fff3df', roughness: 0.95, fog: false });
function hpart(geo, material, parent, outline = true) { const m = new THREE.Mesh(geo, material); m.castShadow = true; m.renderOrder = 10; parent.add(m);
  if (outline) { const o = new THREE.Mesh(geo, outlineMat); o.renderOrder = 9; m.add(o); } return m; }
const body = new THREE.Group(); heroParts.add(body);
const torso = hpart(new THREE.SphereGeometry(0.4, 28, 20), sackMat, body); torso.scale.set(1, 1.12, 0.92); torso.position.y = 0.74;
const head = new THREE.Group(); head.position.y = 1.36; body.add(head);
const skull = hpart(new THREE.SphereGeometry(0.47, 32, 24), sackMat, head); skull.scale.set(1, 0.94, 0.96);
const darkM = new THREE.MeshStandardMaterial({ color: '#24160d', roughness: 0.3, metalness: 0.1, fog: false });
const threadM = new THREE.MeshStandardMaterial({ color: '#5a3520', roughness: 0.9, fog: false });
// seam over the top of the head, with cross stitches
const seam = hpart(new THREE.TorusGeometry(0.455, 0.014, 6, 48, Math.PI), threadM, head, false); seam.rotation.y = Math.PI / 2; seam.rotation.z = 0;
for (let i = 1; i < 16; i++) { const a = i / 16 * Math.PI; const st = hpart(new THREE.CapsuleGeometry(0.011, 0.07, 2, 4), threadM, head, false); st.position.set(0, Math.sin(a) * 0.455 * 0.94, Math.cos(a) * 0.455 * 0.96); st.rotation.x = a; st.rotation.z = Math.PI / 2; }
// button eyes
const eyes = [];
for (const s of [-1, 1]) {
  const a = s * 0.36, eg = new THREE.Group(); eg.position.set(Math.sin(a) * 0.43, 0.07, Math.cos(a) * 0.43); eg.lookAt(Math.sin(a) * 3, 0.25, Math.cos(a) * 3);
  const btn = hpart(new THREE.CylinderGeometry(0.115, 0.115, 0.06, 24), darkM, eg); btn.rotation.x = Math.PI / 2;
  const rim = hpart(new THREE.TorusGeometry(0.1, 0.02, 6, 24), new THREE.MeshStandardMaterial({ color: '#4a2e1c', roughness: 0.3, fog: false }), eg, false); rim.position.z = 0.03;
  for (const [hx, hy] of [[-0.033, -0.033], [0.033, -0.033], [-0.033, 0.033], [0.033, 0.033]]) { const h = hpart(new THREE.CircleGeometry(0.017, 8), new THREE.MeshBasicMaterial({ color: '#0b0604', fog: false }), eg, false); h.position.set(hx, hy, 0.033); }
  const shine = hpart(new THREE.CircleGeometry(0.028, 10), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }), eg, false); shine.position.set(-0.055, 0.055, 0.034);
  head.add(eg); eyes.push(eg);
}
// stitched smile
{ const smile = hpart(new THREE.TorusGeometry(0.12, 0.016, 6, 20, Math.PI * 0.8), threadM, head, false); smile.position.set(0, -0.14, 0.43); smile.rotation.set(-0.35, 0, Math.PI + Math.PI * 0.1);
  for (let i = 0; i < 5; i++) { const a = Math.PI + Math.PI * 0.1 + (i + 0.5) / 5 * Math.PI * 0.8; const t = hpart(new THREE.BoxGeometry(0.012, 0.05, 0.012), threadM, smile, false); t.position.set(Math.cos(a - Math.PI - Math.PI * 0.1) * 0.12, Math.sin(a - Math.PI - Math.PI * 0.1) * 0.12, 0); t.rotation.z = a - Math.PI * 1.1; } }
// zip down the chest
const zip = new THREE.Group(); zip.position.set(0, 0.74, 0.37); zip.rotation.x = -0.12; body.add(zip);
let zipPull;
{ const zm = new THREE.MeshStandardMaterial({ color: '#cfd5de', metalness: 0.8, roughness: 0.25, fog: false });
  hpart(new THREE.BoxGeometry(0.08, 0.6, 0.02), new THREE.MeshStandardMaterial({ color: '#e08a3d', roughness: 0.9, fog: false }), zip, false);
  for (let i = 0; i < 11; i++) { const t = hpart(new THREE.BoxGeometry(0.05, 0.024, 0.03), zm, zip, false); t.position.set(i % 2 ? 0.012 : -0.012, -0.27 + i * 0.054, 0.012); }
  zipPull = new THREE.Group(); zipPull.position.set(0, 0.25, 0.03); zip.add(zipPull); const rg = hpart(new THREE.TorusGeometry(0.03, 0.011, 6, 14), zm, zipPull, false); rg.position.y = -0.04; const tab = hpart(new THREE.BoxGeometry(0.055, 0.1, 0.018), zm, zipPull, false); tab.position.y = -0.11; }
function limb(r, len, x, y, z) { const pivot = new THREE.Group(); pivot.position.set(x, y, z); const m = hpart(new THREE.CapsuleGeometry(r, len, 6, 12), sackMat, pivot); m.position.y = -len / 2 - r * 0.3; body.add(pivot); return pivot; }
const armL = limb(0.105, 0.3, -0.38, 0.98, 0), armR = limb(0.105, 0.3, 0.38, 0.98, 0);
const legL = limb(0.13, 0.2, -0.17, 0.4, 0), legR = limb(0.13, 0.2, 0.17, 0.4, 0);
armL.rotation.z = -0.25; armR.rotation.z = 0.25;
{ const patch = hpart(new THREE.CircleGeometry(0.13, 5), new THREE.MeshStandardMaterial({ map: TX.felt, color: '#ff9e57', fog: false }), body, false); patch.position.set(0, 0.8, -0.375); patch.rotation.y = Math.PI;
  const tuft = hpart(new THREE.ConeGeometry(0.05, 0.2, 6), threadM, head); tuft.position.set(0.05, 0.47, -0.05); tuft.rotation.z = -0.4; }
const FACE_RUN = 0.95, FACE_IDLE = 0.35;
body.rotation.y = FACE_IDLE;
const blob = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ color: '#3a2212', transparent: true, opacity: 0.22, depthWrite: false }));
blob.rotation.x = -Math.PI / 2; scene.add(blob);

// ---------------- particles ----------------
const PN = 420;
const pMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: TX.felt, side: THREE.DoubleSide, transparent: true, depthWrite: false, fog: false }), PN); pMesh.frustumCulled = false; pMesh.renderOrder = 11;
const parts = []; for (let i = 0; i < PN; i++) { parts.push({ life: 0 }); pMesh.setColorAt(i, _c.set('#ffffff')); } let pIdx = 0;
scene.add(pMesh);
function emit(x, y, z, n, o) { for (let k = 0; k < n; k++) { const p = parts[pIdx = (pIdx + 1) % PN]; const a = rnd() * Math.PI * 2, sp = rr(o.sp0 ?? 1, o.sp1 ?? 4);
  Object.assign(p, { x, y, z: z + rr(-0.3, 0.3), vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp * (o.up ?? 1) + (o.vy || 0), vz: rr(-1, 1), life: rr(o.l0 ?? 0.5, o.l1 ?? 1), size: rr(o.s0 ?? 0.08, o.s1 ?? 0.2), g: o.g ?? 6, spin: rr(-8, 8), rot: rnd() * 6, drag: o.drag ?? 1.5 });
  p.max = p.life; pMesh.setColorAt(pIdx, _c.set(Array.isArray(o.col) ? pick(o.col) : o.col)); } pMesh.instanceColor.needsUpdate = true; }
function updParts(dt) {
  for (let i = 0; i < PN; i++) { const p = parts[i];
    if (p.life <= 0) { if (p.dead) continue; p.dead = 1; _m.makeScale(0, 0, 0); pMesh.setMatrixAt(i, _m); continue; }
    p.dead = 0; p.life -= dt; p.vy -= p.g * dt; const d = Math.exp(-p.drag * dt); p.vx *= d; p.vz *= d; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.spin * dt;
    const s = p.size * Math.min(1, p.life / p.max * 3); _m.compose(_v.set(p.x, p.y, p.z), _q.setFromEuler(_e.set(p.rot * 0.5, p.rot, p.rot * 0.3)), _s.set(s, s, s)); pMesh.setMatrixAt(i, _m); }
  pMesh.instanceMatrix.needsUpdate = true;
}
const rings = []; for (let i = 0; i < 10; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 32), new THREE.MeshBasicMaterial({ color: '#dff4ff', transparent: true, opacity: 0, depthWrite: false, fog: false })); r.renderOrder = 11; scene.add(r); rings.push({ r, t: 1, size: 1 }); }
let ringI = 0; function ring(x, y, col = '#dff4ff', size = 1) { const o = rings[ringI = (ringI + 1) % rings.length]; o.r.position.set(x, y, 0.3); o.r.material.color.set(col); o.t = 0; o.size = size; }
const floaters = []; for (let i = 0; i < 10; i++) { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;top:0;font:700 20px Fredoka,sans-serif;color:#fff;-webkit-text-stroke:2px #3f7fc0;paint-order:stroke fill;pointer-events:none;z-index:6;opacity:0;will-change:transform'; document.body.appendChild(d); floaters.push({ d, t: 1, x: 0, y: 0 }); }
let flI = 0; function floater(x, y, text, color = '#3f7fc0') { const f = floaters[flI = (flI + 1) % floaters.length]; f.d.textContent = text; f.d.style.webkitTextStroke = '2px ' + color; f.x = x; f.y = y; f.t = 0; }

// ---------------- UI ----------------
const ui = { screen: 'title', modal: null };
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; $('toasts').appendChild(d); setTimeout(() => d.remove(), 2200); }
function buildSliders() {
  document.querySelectorAll('.sliders').forEach(c => { c.innerHTML = '';
    for (const [k, label] of [['music', 'Music'], ['sfx', 'Sound effects'], ['bright', 'Brightness']]) {
      const row = document.createElement('label'); row.className = 'row'; row.innerHTML = `<span>${label}</span>`; const inp = document.createElement('input'); inp.type = 'range'; inp.min = 0; inp.max = 100; inp.value = Math.round(save[k] * 100); inp.dataset.k = k; inp.setAttribute('data-nav', '');
      inp.addEventListener('input', () => { save[k] = inp.value / 100; document.querySelectorAll(`input[data-k=${k}]`).forEach(o => { if (o !== inp) o.value = inp.value; }); audio.setVol(save.music, save.sfx); applyBright(); persist(); if (k === 'sfx') audio.play('tick', 4); });
      row.appendChild(inp); c.appendChild(row); } });
}
buildSliders();
$('optReduced').checked = !!save.reduced; $('optShake').checked = !!save.shake;
$('optReduced').onchange = e => { save.reduced = e.target.checked ? 1 : 0; persist(); renderer.shadowMap.enabled = !save.reduced; dprMax = save.reduced ? Math.min(1.5, window.devicePixelRatio || 1) : Math.min(2, window.devicePixelRatio || 1); dpr = dprMax; renderer.setPixelRatio(dpr); resize(); scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); };
$('optShake').onchange = e => { save.shake = e.target.checked ? 1 : 0; persist(); };
const click = (id, fn) => $(id).addEventListener('click', e => { audio.init(); audio.play('click'); fn(e); });
function openModal(id) { $(id).classList.add('on'); ui.modal = id; navFocus(0); }
function closeModal(id) { $(id).classList.remove('on'); ui.modal = null; navFocus(0); }
click('bPlay', () => startRun());
click('bSettings', () => openModal('settings'));
click('sClose', () => closeModal('settings'));
click('bStats', () => { renderStats(); openModal('stats'); });
click('stClose', () => closeModal('stats'));
click('bPause', () => pause(true));
click('pResume', () => pause(false));
click('pRestart', () => { pause(false); startRun(); });
click('pQuit', () => { pause(false); toTitle(); });
click('rRetry', () => { $('results').classList.remove('on'); startRun(); });
click('rTitleB', () => { $('results').classList.remove('on'); toTitle(); });
$('a2hsX').onclick = () => { save.a2hs = 1; persist(); $('a2hs').classList.remove('on'); };
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
if ((isIOS && !standalone && !save.a2hs) || Q.has('a2hs')) $('a2hs').classList.add('on');
$('verLabel').textContent = VERSION;
for (let i = 0; i < L.PR.length; i++) $('hPrizes').appendChild(document.createElement('i'));
const MAXS = L.MEDALS[2] * 1.2;
L.MEDALS.forEach((m, i) => { $('mk' + i).style.left = (m / MAXS * 100) + '%'; });
function fmtT(t) { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); }
const MEDAL = ['—', '🥉', '🥈', '🥇'], MEDALN = ['No medal yet', 'Bronze', 'Silver', 'Gold'];
function renderStats() {
  const st = save.st;
  const items = [['Runs started', st.runs], ['Finishes', st.fin], ['Best score', st.best.toLocaleString()], ['Best medal', MEDAL[st.bestMedal] + ' ' + MEDALN[st.bestMedal]], ['Fastest finish', st.bestTime ? fmtT(st.bestTime) : '—'],
    ['Bubbles popped', st.bubbles.toLocaleString()], ['Prize stickers', st.prizes.length + ' / ' + L.PR.length], ['Jumps', st.jumps.toLocaleString()], ['Slides', st.slides.toLocaleString()], ['Times unstitched', st.deaths], ['Time played', Math.round(st.play / 60) + ' min']];
  $('statGrid').innerHTML = items.map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('');
  $('stickerList').innerHTML = L.PR.map(p => `<span class="sticker ${st.prizes.includes(p.name) ? 'got' : ''}">${st.prizes.includes(p.name) ? PICON[p.name] + ' ' + p.name : '? ? ?'}</span>`).join('');
}

// ---------------- input ----------------
const inp = { jump: false, down: false, jumpP: false, downP: false };
const key = { jump: false, down: false }, touch = { jump: false, down: false }, pad = { jump: false, down: false };
function press(kind) { if (kind === 'jump') inp.jumpP = true; else inp.downP = true; }
const JK = ['Space', 'ArrowUp', 'KeyW', 'KeyZ'], DK = ['ArrowDown', 'KeyS', 'KeyX', 'ShiftLeft', 'ShiftRight'];
addEventListener('keydown', e => {
  audio.init();
  if (ui.screen === 'play' && !ui.modal) {
    if (JK.includes(e.code)) { if (!e.repeat) press('jump'); key.jump = true; e.preventDefault(); }
    if (DK.includes(e.code)) { if (!e.repeat) press('down'); key.down = true; e.preventDefault(); }
    if (e.code === 'Escape' || e.code === 'KeyP') pause(true);
    return;
  }
  if (e.code === 'Escape') { back(); return; }
  const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.code];
  if (dir) { navMove(dir); e.preventDefault(); }
  if (e.code === 'Enter' || e.code === 'Space') { const f = navList()[navI]; if (f && usingNav) { e.preventDefault(); activate(f); } else if (ui.screen === 'title' && !ui.modal) startRun(); }
});
addEventListener('keyup', e => { if (JK.includes(e.code)) key.jump = false; if (DK.includes(e.code)) key.down = false; });
const tids = {};
function tsync() { const v = Object.values(tids); touch.jump = v.some(o => o.side === 'R'); touch.down = v.some(o => o.side === 'L'); }
for (const [el, side] of [[$('touchL'), 'L'], [$('touchR'), 'R']]) {
  el.addEventListener('touchstart', e => { e.preventDefault(); audio.init(); for (const t of e.changedTouches) { tids[t.identifier] = { side, y: t.clientY, sw: 0 }; press(side === 'R' ? 'jump' : 'down'); } tsync(); }, { passive: false });
  el.addEventListener('touchmove', e => { for (const t of e.changedTouches) { const o = tids[t.identifier]; if (o && !o.sw && t.clientY - o.y > 35) { o.sw = 1; press('down'); } } }, { passive: true });
  const end = e => { for (const t of e.changedTouches) delete tids[t.identifier]; tsync(); };
  el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
  el.addEventListener('mousedown', () => { audio.init(); press(side === 'R' ? 'jump' : 'down'); touch[side === 'R' ? 'jump' : 'down'] = true; });
  el.addEventListener('mouseup', () => { touch.jump = touch.down = false; });
}
document.addEventListener('gesturestart', e => e.preventDefault());
let padPrev = [], padAy = 0, navRepeat = 0, padOn = false;
function pollPad(dt) {
  const gps = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null; for (const g of gps) if (g && g.connected) { gp = g; break; }
  padOn = !!gp; if (!gp) { pad.jump = pad.down = false; return; }
  const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), was = i => !!padPrev[i], edge = i => b(i) && !was(i);
  const ay = gp.axes[1] || 0, ax = gp.axes[0] || 0;
  if (ui.screen === 'play' && !ui.modal) {
    pad.jump = b(0) || b(3) || b(5); pad.down = b(1) || b(2) || b(13) || b(4) || b(6) || b(7) || ay > 0.6;
    if (edge(0) || edge(3) || edge(5)) press('jump');
    if (edge(1) || edge(2) || edge(13) || edge(4) || edge(6) || edge(7) || (ay > 0.6 && padAy <= 0.6)) press('down');
    if (edge(9) || edge(8)) pause(true);
  } else {
    let dir = null; if (b(14) || ax < -0.6) dir = [-1, 0]; if (b(15) || ax > 0.6) dir = [1, 0]; if (b(12) || ay < -0.6) dir = [0, -1]; if (b(13) || ay > 0.6) dir = [0, 1];
    navRepeat -= dt; if (dir && navRepeat <= 0) { navMove(dir); navRepeat = 0.22; } if (!dir) navRepeat = 0;
    if (edge(0)) { const l = navList(); if (!usingNav) { usingNav = true; navFocus(navI); } else if (l[navI]) activate(l[navI]); }
    if (edge(1)) back();
    if (edge(9)) { if (ui.modal === 'pause') pause(false); else if (ui.screen === 'title' && !ui.modal) startRun(); }
  }
  padPrev = gp.buttons.map(x => x.pressed); padAy = ay;
}
let navI = 0, usingNav = false;
function navList() { const scr = ui.modal ? $(ui.modal) : (ui.screen === 'title' ? $('title') : null); if (!scr) return []; return [...scr.querySelectorAll('[data-nav]')].filter(e => e.offsetParent !== null); }
function navFocus(i) { const l = navList(); document.querySelectorAll('.focus').forEach(e => e.classList.remove('focus')); if (!l.length) return; navI = ((i % l.length) + l.length) % l.length; if (usingNav) { l[navI].classList.add('focus'); l[navI].scrollIntoView && l[navI].scrollIntoView({ block: 'nearest' }); } }
function navMove(dir) { const l = navList(); if (!l.length) return; if (!usingNav) { usingNav = true; navFocus(navI); return; } const f = l[navI];
  if (f && f.type === 'range' && dir[0]) { f.value = +f.value + dir[0] * 10; f.dispatchEvent(new Event('input')); return; }
  navFocus(navI + (dir[0] || dir[1])); audio.play('tick', navI); }
function activate(f) { if (f.type === 'checkbox') { f.checked = !f.checked; f.dispatchEvent(new Event('change')); } else if (f.type !== 'range') f.click(); }
function back() { if (ui.modal === 'pause') pause(false); else if (ui.modal === 'settings') closeModal('settings'); else if (ui.modal === 'stats') closeModal('stats'); }
addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && usingNav && Math.abs(e.movementX) + Math.abs(e.movementY) > 3) { usingNav = false; document.querySelectorAll('.focus').forEach(x => x.classList.remove('focus')); } });

// ---------------- game flow ----------------
let S = null, prevS = { x: 0, y: 0 }, acc = 0, endT = 0, lastZone = '', scoreShown = 0;
let squash = 0, squashV = 0, deathT = 0, lastLandT = -1, camSnap = true;
function startRun() {
  $('fade').style.opacity = 1;
  setTimeout(() => {
    audio.init(); if (!audio.playing) audio.start();
    S = newState(L); prevS = { x: S.x, y: S.y }; acc = 0; endT = 0; lastZone = ''; scoreShown = 0;
    bubHidden.fill(0); bubFirst = true; for (const p of prizes) { p.gone = 0; p.g.visible = true; p.g.scale.setScalar(1); }
    for (const c of cps) { c.on = 0; c.flag.material.color.set('#cfc4b0'); c.banner.material.color.set('#d8cfc0'); }
    $('hPrizes').querySelectorAll('i').forEach(i => i.classList.remove('got')); ['mk0', 'mk1', 'mk2'].forEach(m => $(m).classList.remove('got'));
    resetPlats(-99);
    ui.screen = 'play'; ui.modal = null; document.body.classList.add('playing');
    ['title', 'results', 'pause', 'settings', 'stats'].forEach(s => $(s).classList.remove('on')); $('hud').classList.add('on');
    save.st.runs++; persist(); camSnap = true;
    $('fade').style.opacity = 0;
  }, 260);
}
function toTitle() { ui.screen = 'title'; ui.modal = null; S = null; document.body.classList.remove('playing'); $('hud').classList.remove('on'); $('title').classList.add('on'); camSnap = true; navFocus(0); audio.intensity = 0; resetPlats(-99); bubHidden.fill(0); bubFirst = true; for (const p of prizes) { p.gone = 0; p.g.visible = true; p.g.scale.setScalar(1); } }
function pause(on) { if (ui.screen !== 'play') return; if (on) { $('pause').classList.add('on'); ui.modal = 'pause'; navFocus(2); } else { $('pause').classList.remove('on'); ui.modal = null; for (const k in tids) delete tids[k]; tsync(); } }
document.addEventListener('visibilitychange', () => { if (document.hidden && ui.screen === 'play' && !ui.modal && S && !S.done) pause(true); });
function resetPlats(fromX) { for (const pm of platMeshes) if (pm.p.x0 > fromX) { pm.g.position.y = pm.p.y; pm.g.rotation.z = 0; pm.g.visible = true; pm.fallV = 0; } }
const shake = { t: 0, a: 0 };
function doShake(a, t) { if (!save.shake) return; shake.a = Math.max(shake.a, a); shake.t = Math.max(shake.t, t); }
const MULTC = ['#3f7fc0', '#3f7fc0', '#4c9a3c', '#2b8bb8', '#7a52c8', '#c04f8d'];
function handleEvents(ev) {
  for (const e of ev) {
    const [k, a] = e.split(':');
    if (k === 'bub') { const b = L.B[+a]; bubHidden[+a] = 1; audio.play('pop', S.chain); ring(b.x, b.y, '#dff4ff', 0.55);
      emit(b.x, b.y, 0.2, 7, { col: ['#bfe8ff', '#ffffff', '#ffe68a'], sp0: 2, sp1: 5, g: 2, l0: 0.25, l1: 0.5, s0: 0.06, s1: 0.13 });
      floater(b.x, b.y + 0.4, '+' + 10 * S.mult, MULTC[S.mult]); bumpScore();
      if (S.chain % 8 === 0 && S.mult > 1) { audio.play('mult', S.mult); floater(S.x, S.y + 2.2, 'x' + S.mult + '!', MULTC[S.mult]); } }
    else if (k === 'prize') { const p = prizes[+a]; p.gone = 1; audio.play('prize'); ring(p.pr.x, p.pr.y, '#ffe68a', 2); emit(p.pr.x, p.pr.y, 0.3, 50, { col: flagCols, sp0: 3, sp1: 9, g: 5, l0: 0.8, l1: 1.6, s0: 0.12, s1: 0.26 });
      toast(PICON[p.pr.name] + ' Prize! ' + p.pr.name); $('hPrizes').children[+a].classList.add('got'); if (!save.st.prizes.includes(p.pr.name)) save.st.prizes.push(p.pr.name); bumpScore(); floater(p.pr.x, p.pr.y + 1, '+500', '#d08a10'); }
    else if (k === 'cp') { const c = cps[+a - 1]; if (c) { c.on = 1; c.flag.material.color.set('#5fae52'); c.banner.material.color.set('#8fd36a'); emit(c.c.x, c.c.y + 4, -1, 30, { col: flagCols, sp0: 2, sp1: 6, g: 4, l0: 0.8, l1: 1.4, s0: 0.1, s1: 0.2 }); }
      audio.play('cp'); toast('✓ Checkpoint'); }
    else if (k === 'die') { audio.play('die'); deathT = 0; doShake(0.35, 0.3); emit(S.x, Math.max(S.y, -3) + 0.8, 0.3, 36, { col: ['#fff6e6', '#f4e2c3', '#e5cfa6'], sp0: 2, sp1: 7, g: 3, l0: 0.6, l1: 1.2, s0: 0.12, s1: 0.28, drag: 2.5 }); save.st.deaths++; }
    else if (k === 'respawn') { audio.play('respawn'); resetPlats(L.CP[S.cp].x - 2); emit(S.x, S.y + 0.8, 0.3, 24, { col: ['#ffe68a', '#ffffff', '#bfe8ff'], sp0: 1, sp1: 4, g: -1, l0: 0.4, l1: 0.8 }); squash = -0.3; prevS = { x: S.x, y: S.y }; camSnap = true; }
    else if (k === 'jump') { audio.play('jump'); squash = -0.28; save.st.jumps++; emit(S.x, S.y + 0.05, 0.2, 5, { col: '#e9d3ad', sp0: 0.5, sp1: 2, up: 0.4, g: 1, l0: 0.3, l1: 0.6 }); }
    else if (k === 'land') { if (S.t - lastLandT > 0.15) { audio.play('land'); squash = 0.3; emit(S.x, S.y + 0.05, 0.2, 7, { col: '#e9d3ad', sp0: 1, sp1: 3, up: 0.3, g: 1, l0: 0.3, l1: 0.6 }); } lastLandT = S.t; }
    else if (k === 'spring') { audio.play('spring'); squash = -0.45; doShake(0.12, 0.15); const sp = springs.find(o => Math.abs(o.sp.x - S.x) < 1.6); if (sp) sp.hitT = 0; }
    else if (k === 'sponge') { audio.play('sponge'); squash = 0.4; const pm = platMeshes.find(o => o.p.sponge && S.x > o.p.x0 - 1 && S.x < o.p.x1 + 1); if (pm) pm.squish = 1; }
    else if (k === 'slide') { audio.play('slide'); save.st.slides++; }
    else if (k === 'bonk') { audio.play('bonk'); doShake(0.15, 0.15); squash = 0.25; }
    else if (k === 'creak') audio.play('creak');
    else if (k === 'finish') { audio.play('finish'); endT = 0; emit(L.FIN, finish.gy + 6, 1, 140, { col: flagCols, sp0: 4, sp1: 12, g: 6, l0: 1.2, l1: 2.4, s0: 0.12, s1: 0.28, vy: 4 }); }
  }
}
function bumpScore() { const el = $('hScore'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
function showResults() {
  const st = save.st, sc = S.score, medal = medalFor(sc, L), got = S.got.reduce((a, b) => a + b, 0), pz = S.prizes.reduce((a, b) => a + b, 0);
  const newBest = sc > st.best;
  st.fin++; st.bubbles += got; st.best = Math.max(st.best, sc); st.bestMedal = Math.max(st.bestMedal, medal); if (!st.bestTime || S.runT < st.bestTime) st.bestTime = S.runT; persist();
  ui.screen = 'results'; document.body.classList.remove('playing'); $('hud').classList.remove('on'); $('results').classList.add('on'); ui.modal = 'results'; navFocus(1);
  $('rTitle').textContent = medal === 3 ? 'Gold! Beautifully stitched!' : medal ? 'Level Complete!' : 'You made it!';
  $('rMedal').textContent = ''; $('rMedal').classList.remove('on');
  $('rRows').innerHTML = [['Score bubbles', got + ' / ' + L.B.length], ['Prize bubbles', pz + ' / ' + L.PR.length], ['Best multiplier', 'x' + S.maxMult], ['Time', fmtT(S.runT)], ['Times unstitched', S.deaths], ['Best score', (newBest ? '★ NEW ' : '') + st.best.toLocaleString()],
    ['Next medal', medal < 3 ? MEDALN[medal + 1] + ' at ' + L.MEDALS[medal].toLocaleString() : 'You got them all!']].map(([k, v]) => `<span>${k}</span><span class="v">${v}</span>`).join('');
  const t0 = performance.now(), dur = 1400;
  const tick = () => { const f = Math.min(1, (performance.now() - t0) / dur); $('rScore').textContent = Math.round(sc * (1 - Math.pow(1 - f, 3))).toLocaleString(); if (f < 1) { if (Math.random() < 0.3) audio.play('tick', f * 12); requestAnimationFrame(tick); }
    else { $('rMedal').textContent = MEDAL[medal]; $('rMedal').classList.add('on'); if (medal) audio.play('medal', medal); } };
  tick();
}

// ---------------- camera ----------------
const cam = { x: 0, y: 3 };
function updCamera(px, py, dt, title, t) {
  const aspect = innerWidth / innerHeight; const dist = 16 + Math.max(0, 1.9 - aspect) * 9;
  const tx = title ? px + 1.2 : px + 5.2, ty = title ? py + 1.6 : py * 0.75 + 2.4;
  const k = camSnap ? 1 : 1 - Math.exp(-dt * 6), ky = camSnap ? 1 : 1 - Math.exp(-dt * 2.8);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * ky; camSnap = false;
  let sx = 0, sy = 0; if (shake.t > 0) { shake.t -= dt; sx = (Math.random() - 0.5) * shake.a; sy = (Math.random() - 0.5) * shake.a; } else shake.a = 0;
  if (title) { camera.position.set(cam.x - 2.5 + Math.sin(t * 0.25) * 0.8, cam.y + 1.4, 9.5); camera.lookAt(cam.x + 0.8, cam.y - 0.3, 0); }
  else { camera.position.set(cam.x - 1.2 + sx, cam.y + 2.4 + sy, dist); camera.lookAt(cam.x + sx, cam.y, 0); }
  camera.aspect = aspect; camera.updateProjectionMatrix();
  sun.position.set(cam.x - 8, 20, 14); sun.target.position.set(cam.x, 0, 0); fill.position.set(cam.x + 10, 6, 12);
  skyMesh.position.x = cam.x; sunG.position.set(cam.x * 0.92 + 30, 26, -100);
}

// ---------------- hero animation ----------------
let runPhase = 0, blinkT = 2;
function animHero(dt, t, x, y, st) {
  hero.position.set(x, y, 0);
  const dead = st && st.dead > 0, slide = st && st.slide > 0 && !dead, air = st && !st.ground && !dead && !(st.ready > 0);
  runPhase += dt * (st ? st.vx : 0) * 1.6;
  squashV += (-squash * 160 - squashV * 13) * dt; squash += squashV * dt;
  let sy = 1 + squash, sxz = 1 - squash * 0.45;
  let lean = 0, bodyY = 0, aL = 0, aR = 0, lL = 0, lR = 0, roll = 0, faceY = FACE_RUN, armOut = 0.25;
  if (!st) { faceY = FACE_IDLE; bodyY = Math.sin(t * 2) * 0.03; aR = -2.6 + Math.sin(t * 7) * 0.35; armOut = 0.5; sy += Math.sin(t * 2) * 0.015; }
  else if (st.done) { faceY = FACE_IDLE; aR = -2.7 + Math.sin(t * 9) * 0.4; aL = -2.7 - Math.sin(t * 9) * 0.4; armOut = 0.6; bodyY = Math.abs(Math.sin(t * 6)) * 0.3; }
  else if (dead) { const k = Math.min(1, deathT / 0.22); sy = sxz = Math.max(0.001, 1 - k); }
  else if (st.ready > 0 && st.vx < 0.1) { faceY = 0.6; bodyY = Math.sin(t * 6) * 0.02; aL = aR = -0.3; }
  else if (slide) { roll = -1.2; bodyY = -0.05; aL = aR = -2.9; lL = lR = -0.2; }
  else if (air) { const up = st.vy > 0; aL = up ? -2.7 : -2.0; aR = up ? -2.3 : -1.7; lL = up ? -0.9 : -0.3; lR = up ? 0.5 : 0.2; lean = up ? 0.1 : -0.05; armOut = 0.6;
    if (st.spr && st.vy > 4) roll = -((t * 9) % (Math.PI * 2)) * 0; }
  else { const s = Math.sin(runPhase); lL = s * 0.95; lR = -s * 0.95; aL = -s * 0.9; aR = s * 0.9; bodyY = Math.abs(Math.cos(runPhase)) * 0.09; lean = 0.2; }
  const sm = Math.min(1, dt * 18);
  body.rotation.y += (faceY - body.rotation.y) * Math.min(1, dt * 6);
  for (const [o, v] of [[legL, lL], [legR, lR], [armL, aL], [armR, aR]]) o.rotation.x += (v - o.rotation.x) * sm;
  armL.rotation.z += (-armOut - armL.rotation.z) * sm; armR.rotation.z += (armOut - armR.rotation.z) * sm;
  heroParts.rotation.z += (-lean + roll - heroParts.rotation.z) * Math.min(1, dt * 14);
  heroParts.position.y = bodyY + (roll ? 0.3 : 0);
  heroParts.scale.set(sxz, Math.max(0.001, sy), sxz);
  head.rotation.z = Math.sin(t * 2.3) * 0.04; head.rotation.x = air ? -0.12 : 0;
  zipPull.rotation.x = Math.sin(t * 9) * 0.35 * (st ? 1 : 0.3);
  blinkT -= dt; const bl = blinkT < 0.12 ? 0.12 : 1; if (blinkT < 0) blinkT = rr(2, 4.5);
  for (const e of eyes) e.scale.y = bl;
  const gyy = st ? groundUnder(st, x, y) : 0; blob.position.set(x, gyy + 0.33, 0); const hgt = Math.max(0, y - gyy); blob.scale.setScalar(Math.max(0.3, 1 - hgt * 0.12)); blob.visible = !dead && gyy > -50;
}
function groundUnder(st, x, y) { let best = -99; for (const p of L.P) { if (x < p.x0 || x > p.x1) continue; const c = st.col[p.id]; if (p.collapse && c !== undefined && st.t - c > 0.3 + (p.x1 - p.x0) / 8) continue; const py = platY(p, st.t); if (py <= y + 0.05 && py > best) best = py; } return best; }

// ---------------- main loop ----------------
let last = performance.now(), tAll = 0, fpsAcc = 0, fpsN = 0, slowT = 0;
window.ST_FPS = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; tAll += dt;
  fpsAcc += dt; fpsN++; if (fpsAcc > 1) { window.ST_FPS = Math.round(fpsN / fpsAcc);
    if (window.ST_FPS < 50 && ui.screen === 'play' && !ui.modal) { if (++slowT >= 2 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); resize(); slowT = 0; } } else slowT = 0; fpsAcc = 0; fpsN = 0; }
  pollPad(dt);
  audio.tick();
  let hx, hy, st = null;
  if (ui.screen === 'play' && S) {
    if (!ui.modal) {
      inp.jump = key.jump || touch.jump || pad.jump; inp.down = key.down || touch.down || pad.down;
      acc += dt * (window.ST_TURBO ? 4 : 1); let n = 0;
      while (acc >= DT && n < (window.ST_TURBO || 5)) { if (window.ST_BOT) Object.assign(inp, window.ST_BOT(S)); prevS = { x: S.x, y: S.y }; step(L, S, inp); inp.jumpP = inp.downP = false; handleEvents(S.ev); acc -= DT; n++; if (S.dead) deathT += DT; }
      save.st.play += dt; if (S.done) { endT += dt; if (endT > 2.4) showResults(); }
      audio.intensity = S.x > L.ZONES[L.ZONES.length - 1].x ? 1 : 0;
    }
    const a = ui.modal ? 1 : Math.min(1, acc / DT); hx = prevS.x + (S.x - prevS.x) * a; hy = prevS.y + (S.y - prevS.y) * a; st = S;
    hudUpdate();
  } else if (ui.screen === 'results' && S) { hx = S.x; hy = S.y; st = S; }
  else { hx = L.CP[0].x + 2; hy = 0; }
  const tt = S ? S.t : tAll;
  for (const pm of platMeshes) {
    const p = pm.p; if (p.x0 - hx > 70 || hx - p.x1 > 40) continue;
    if (p.move) pm.g.position.y = platY(p, tt);
    if (p.collapse && S) { const c = S.col[p.id]; const lim = 0.3 + (p.x1 - p.x0) / 8;
      if (c !== undefined) { const e = S.t - c; if (e < lim) pm.g.position.y = p.y + Math.sin(e * 60) * 0.035 * (e / lim) - (e / lim) * 0.08; else { pm.fallV = (pm.fallV || 0) + 30 * dt; pm.g.position.y -= pm.fallV * dt; pm.g.rotation.z -= dt * 0.4; if (pm.g.position.y < -25) pm.g.visible = false; } } }
    if (pm.squish) { pm.squish = Math.max(0, pm.squish - dt * 2.5); const s = Math.sin(pm.squish * Math.PI * 3) * pm.squish * 0.3; pm.g.scale.set(1 + s * 0.2, 1 - s, 1); }
  }
  for (const s of springs) { if (s.hitT !== undefined) { s.hitT += dt; const k = Math.max(0, 1 - s.hitT * 2.5); const sq = Math.sin(s.hitT * 30) * k * 0.4; s.coil.scale.y = 1 + sq; s.pad.position.y = 0.7 + sq * 0.5; s.star.position.y = 0.8 + sq * 0.5; } s.star.rotation.y = tAll * 2; }
  for (const p of pends) p.arm.rotation.z = pendPos(p.z, tt).th;
  for (const th of thistles) { th.g.position.y = th.z.y + Math.abs(Math.sin(tAll * 3 + th.z.x)) * 0.08; th.g.rotation.y = Math.sin(tAll + th.z.x) * 0.4; }
  for (const p of prizes) { if (p.gone) { if (p.g.visible) { p.g.scale.multiplyScalar(Math.exp(-dt * 10)); if (p.g.scale.x < 0.05) p.g.visible = false; } continue; }
    p.g.position.y = p.pr.y + Math.sin(tAll * 2 + p.pr.x) * 0.15; p.st.rotation.y = Math.sin(tAll * 1.5) * 0.6; p.ring.rotation.z = tAll; p.ring.scale.setScalar(1 + Math.sin(tAll * 4) * 0.05); }
  for (const c of cps) { if (Math.abs(c.c.x - hx) > 50) continue; const pa = c.banner.geometry.attributes.position; for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i) * 2 + tAll * (c.on ? 5 : 2)) * 0.08); pa.needsUpdate = true;
    const fa = c.flag.geometry.attributes.position; for (let i = 0; i < fa.count; i++) { const x = fa.getX(i) + 0.45; fa.setZ(i, Math.sin(x * 5 - tAll * 7) * 0.12 * x); } fa.needsUpdate = true; }
  for (const g of gears) g.g.rotation.z += g.s * dt;
  for (const w of wheels) { w.hub.rotation.z += dt * 0.25; for (const c of w.cars) c.rotation.z = -w.hub.rotation.z; }
  for (const c of clouds) { c.m.position.y = c.y0 + Math.sin(tAll * 0.6 + c.ph) * 0.4; c.m.rotation.z = Math.sin(tAll * 0.4 + c.ph) * 0.04; c.stick.position.y = c.m.position.y - 10; }
  sunG.rotation.z = tAll * 0.05;
  for (const r of rings) { if (r.t < 1) { r.t += dt * 3; r.r.scale.setScalar((0.4 + r.t * 1.2) * r.size); r.r.material.opacity = Math.max(0, 1 - r.t) * 0.9; } else r.r.material.opacity = 0; }
  updBubbles(tAll, hx);
  updParts(dt);
  animHero(dt, tAll, hx, hy, st);
  updCamera(hx, hy, dt, ui.screen === 'title', tAll);
  for (const f of floaters) { if (f.t >= 1) { if (f.d.style.opacity !== '0') f.d.style.opacity = 0; continue; } f.t += dt * 1.6; _v.set(f.x, f.y + f.t * 1.2, 0).project(camera);
    f.d.style.opacity = Math.max(0, Math.min(1, (1 - f.t) * 2)); f.d.style.transform = `translate(${(_v.x * 0.5 + 0.5) * innerWidth - 16}px,${(-_v.y * 0.5 + 0.5) * innerHeight - 12}px) scale(${0.8 + Math.min(f.t * 4, 0.4)})`; }
  renderer.render(scene, camera);
}
const TIPS = [[-9, 8, 'Tap the right side to jump · hold for higher', 'Press A to jump · hold for higher'],
  [L.SIGNS[1].x - 3, L.SIGNS[1].x + 10, 'Tap the left side (or swipe down) to slide under', 'Press B or ↓ to slide under'],
  [L.SIGNS[2].x - 3, L.SIGNS[2].x + 6, 'Springs fling you sky-high!', 'Springs fling you sky-high!'],
  [L.SIGNS[3].x - 3, L.SIGNS[3].x + 8, 'Slide under the swinging mallets!', 'Slide (B) under the swinging mallets!']];
let hudZT = 0;
function hudUpdate() {
  scoreShown += (S.score - scoreShown) * 0.25; if (Math.abs(S.score - scoreShown) < 1) scoreShown = S.score;
  const sc = Math.round(scoreShown).toLocaleString(); if ($('hScore').textContent !== sc) $('hScore').textContent = sc;
  const m = $('hMult'); const mt = 'x' + S.mult; if (m.textContent !== mt) { m.textContent = mt; m.className = 'mult m' + S.mult; }
  $('hFill').style.width = Math.min(100, S.score / MAXS * 100) + '%';
  L.MEDALS.forEach((v, i) => { const e = $('mk' + i); if (S.score >= v && !e.classList.contains('got')) { e.classList.add('got'); audio.play('medal', i); toast(['🥉 Bronze', '🥈 Silver', '🥇 Gold'][i] + ' score reached!'); } });
  $('hProg').style.width = Math.min(100, Math.max(0, (S.x - L.CP[0].x) / (L.FIN - L.CP[0].x) * 100)) + '%';
  const z = zoneAt(S.x).name; if (z !== lastZone) { lastZone = z; const zn = $('zoneName'); zn.textContent = z; zn.classList.add('on'); clearTimeout(hudZT); hudZT = setTimeout(() => zn.classList.remove('on'), 2200); }
  let tip = ''; for (const [a, b, t1, t2] of TIPS) if (S.x > a && S.x < b) tip = padOn ? t2 : t1;
  if (S.ready > 0 && S.deaths && !S.done) tip = 'Back to the checkpoint!';
  const te = $('tip'); if (tip && te.textContent !== tip) te.textContent = tip; te.classList.toggle('on', !!tip);
}
function resize() { renderer.setSize(innerWidth, innerHeight, false); }
addEventListener('resize', resize); resize();
$('title').classList.add('on');
$('loading').style.display = 'none';
window.__booted = true;
requestAnimationFrame(frame);
['pointerdown', 'keydown', 'touchstart'].forEach(e => addEventListener(e, () => { audio.init(); if (!audio.playing) audio.start(); }, { once: true }));
if ('serviceWorker' in navigator && !Q.has('nosw')) navigator.serviceWorker.register('sw.js').catch(() => {});
window.ST = { L, get S() { return S; }, start: startRun, toTitle, openModal, renderStats, results: () => showResults(), inp, press, pause,
  warp(x) { if (!S) return; S.x = x; S.y = groundY(x) + 0.05; S.vy = 0; S.ground = null; prevS = { x: S.x, y: S.y }; camSnap = true; for (let i = S.cp + 1; i < L.CP.length; i++) if (x >= L.CP[i].x) S.cp = i; } };
