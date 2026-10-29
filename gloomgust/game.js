/* GLOOMGUST v1.0 — an original ghost-hotel vacuum adventure.
   Hero: Wendel (nervous ghost hunter, green cap with a "W", Gustmaster vacuum pack).
   Structure:
     1. Settings / save / stats      5. World builder (rooms are data modules in FLOORS)
     2. Audio (Web Audio synth)      6. Entities: hero, clone, ghosts, peekers, boss
     3. Input (kbd+mouse, pad, touch) 7. Tools: flash, suck, blow, burst, slam, plunger, dark-light
     4. Three.js scene + particles   8. HUD, menus, main loop
   To add a floor: push a new object into FLOORS (see FLOORS.lobby) with rooms[], doors[], props[], ghosts[], boss. */
'use strict';
const VERSION = '202610291815';
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

/* ---------- 1. settings, save, stats ---------- */
const SKEY = 'gloomgust-v1';
const DEF = { music: 0.6, sfx: 0.8, bright: 0.6, shake: true, follow: true, assist: true, glow: true, hints: true };
let OPT = Object.assign({}, DEF, JSON.parse(localStorage.getItem(SKEY + '-opt') || '{}'));
const saveOpt = () => localStorage.setItem(SKEY + '-opt', JSON.stringify(OPT));
const NEWSAVE = () => ({ money: 0, gems: [], button: false, cleared: false, flags: {}, maxHp: 100, charge: 1, seen: {} });
let SAVE = Object.assign(NEWSAVE(), JSON.parse(localStorage.getItem(SKEY + '-save') || '{}'));
const writeSave = () => localStorage.setItem(SKEY + '-save', JSON.stringify(SAVE));
const STDEF = { ghosts: 0, tough: 0, peekers: 0, slams: 0, flashes: 0, moneyTotal: 0, faints: 0, bossWins: 0, bestTime: 0, playTime: 0, bursts: 0, plungers: 0 };
let STATS = Object.assign({}, STDEF, JSON.parse(localStorage.getItem(SKEY + '-stats') || '{}'));
const saveStats = () => localStorage.setItem(SKEY + '-stats', JSON.stringify(STATS));

/* ---------- 2. audio ---------- */
const AU = { ctx: null, music: null, sfx: null, next: 0, step: 0, vac: null, vacG: null, mood: 'calm' };
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  const c = AU.ctx = new C();
  AU.music = c.createGain(); AU.music.connect(c.destination);
  AU.sfx = c.createGain(); AU.sfx.connect(c.destination);
  applyVol();
  // continuous vacuum noise (filtered noise loop), gain driven each frame
  const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  AU.noise = nb;
  const src = c.createBufferSource(); src.buffer = nb; src.loop = true;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8;
  AU.vacG = c.createGain(); AU.vacG.gain.value = 0; AU.vacF = f;
  src.connect(f); f.connect(AU.vacG); AU.vacG.connect(AU.sfx); src.start();
  AU.next = c.currentTime + 0.1;
}
function applyVol() { if (!AU.ctx) return; AU.music.gain.value = OPT.music * 0.35; AU.sfx.gain.value = OPT.sfx * 0.7; }
function tone(f, t0, dur, type = 'square', vol = 0.2, f2, dest) {
  const c = AU.ctx; if (!c) return; const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(dest || AU.sfx); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noiseHit(t0, dur, vol = 0.3, freq = 800) {
  const c = AU.ctx; if (!c) return; const s = c.createBufferSource(); s.buffer = AU.noise;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; const g = c.createGain();
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(AU.sfx); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur);
}
const SFX = {
  flash(p) { const t = AU.ctx && AU.ctx.currentTime; if (!t) return; tone(800, t, 0.25, 'sine', 0.25, 2400); noiseHit(t, 0.2, 0.25 * p, 5000); },
  charge() { const t = AU.ctx && AU.ctx.currentTime; if (t) tone(500, t, 0.08, 'sine', 0.06, 700); },
  coin() { const t = AU.ctx && AU.ctx.currentTime; if (!t) return; tone(1320, t, 0.07, 'square', 0.08); tone(1760, t + 0.06, 0.12, 'square', 0.08); },
  gem() { const t = AU.ctx && AU.ctx.currentTime; if (!t) return; [880, 1109, 1319, 1760].forEach((f, i) => tone(f, t + i * 0.08, 0.3, 'triangle', 0.15)); },
  stun() { const t = AU.ctx && AU.ctx.currentTime; if (t) tone(600, t, 0.4, 'triangle', 0.15, 200); },
  capture() { const t = AU.ctx && AU.ctx.currentTime; if (!t) return; tone(300, t, 0.5, 'sawtooth', 0.08, 1500); [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + 0.4 + i * 0.07, 0.25, 'square', 0.08)); },
  slam() { const t = AU.ctx && AU.ctx.currentTime; if (!t) return; tone(140, t, 0.3, 'sine', 0.5, 40); noiseHit(t, 0.3, 0.5, 600); },
  hurt() { const t = AU.ctx && AU.ctx.currentTime; if (!t) return; tone(500, t, 0.3, 'square', 0.12, 150); },
  burst() { const t = AU.ctx && AU.ctx.currentTime; if (!t) return; noiseHit(t, 0.5, 0.5, 2000); tone(200, t, 0.4, 'sine', 0.3, 60); },
  pop() { const t = AU.ctx && AU.ctx.currentTime; if (t) { tone(400, t, 0.1, 'sine', 0.2, 900); } },
  thunk() { const t = AU.ctx && AU.ctx.currentTime; if (t) { tone(220, t, 0.12, 'square', 0.15, 90); } },
  door() { const t = AU.ctx && AU.ctx.currentTime; if (t) { tone(180, t, 0.5, 'sawtooth', 0.08, 120); noiseHit(t, 0.4, 0.15, 400); } },
  solve() { const t = AU.ctx && AU.ctx.currentTime; if (!t) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.1, 0.35, 'triangle', 0.15)); },
  boo() { const t = AU.ctx && AU.ctx.currentTime; if (t) { tone(300, t, 0.6, 'sine', 0.12, 520); } },
  laugh() { const t = AU.ctx && AU.ctx.currentTime; if (!t) return; for (let i = 0; i < 4; i++) tone(420 - i * 30, t + i * 0.11, 0.1, 'square', 0.08, 300); },
  dark() { const t = AU.ctx && AU.ctx.currentTime; if (t) tone(200, t, 0.3, 'sine', 0.1, 400); },
  goo() { const t = AU.ctx && AU.ctx.currentTime; if (t) { tone(300, t, 0.2, 'sine', 0.2, 120); tone(150, t + 0.1, 0.25, 'sine', 0.15, 500); } },
  tick() { const t = AU.ctx && AU.ctx.currentTime; if (t) tone(1000, t, 0.04, 'square', 0.05); },
};
// music: bouncy spooky loop (minor key, walking bass + celesta melody). Mood 'boss' is faster.
const MEL = [69, 0, 72, 71, 69, 0, 64, 0, 65, 0, 69, 68, 69, 0, 0, 0, 69, 0, 72, 74, 76, 0, 74, 72, 71, 0, 68, 0, 69, 0, 0, 0];
const BAS = [45, 52, 45, 52, 41, 48, 41, 48, 40, 47, 40, 47, 45, 52, 44, 40];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function musicTick() {
  const c = AU.ctx; if (!c || !GAME.running) return;
  const spd = AU.mood === 'boss' ? 0.13 : 0.19;
  while (AU.next < c.currentTime + 0.25) {
    const s = AU.step, t = AU.next;
    if (s % 2 === 0) tone(mtof(BAS[(s / 2) % 16] - (AU.mood === 'boss' ? 0 : 0)), t, spd * 1.6, 'triangle', 0.22, null, AU.music);
    const m = MEL[s % 32]; if (m) tone(mtof(m + 12), t, spd * 1.5, 'sine', 0.09, null, AU.music);
    if (AU.mood === 'boss' && s % 4 === 2) { const nt = t; const g = c.createGain(); noiseHitTo(nt, 0.05, 0.12); }
    if (s % 8 === 4 && AU.mood !== 'boss') tone(mtof(m ? m + 24 : 88), t, 0.4, 'sine', 0.03, null, AU.music);
    AU.step++; AU.next += spd;
  }
}
function noiseHitTo(t0, dur, vol) { const c = AU.ctx; const s = c.createBufferSource(); s.buffer = AU.noise; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000; const g = c.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); s.connect(f); f.connect(g); g.connect(AU.music); s.start(t0); s.stop(t0 + dur); }

/* ---------- 3. input ---------- */
const K = {};          // keyboard state by e.code
const IN = { mx: 0, my: 0, ax: 0, ay: 0, aimActive: false, suck: false, blow: false, flash: false, slamP: false, plungeP: false, darkP: false, gooP: false, camL: false, camR: false, pauseP: false, mouseAim: false, mouseX: 0, mouseY: 0 };
const PAD = { prev: {} };
const TOUCH = { L: null, R: null, btn: {}, lx: 0, ly: 0, rx: 0, ry: 0 };
addEventListener('keydown', e => {
  if (e.repeat) return; K[e.code] = true; audioInit();
  if (e.code === 'Space') IN.slamQ = true; if (e.code === 'KeyE') IN.plungeQ = true;
  if (e.code === 'KeyR') IN.darkQ = true; if (e.code === 'KeyG') IN.gooQ = true;
  if (e.code === 'Escape' || e.code === 'KeyP') IN.pauseQ = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { K[e.code] = false; });
const MB = {};
addEventListener('mousedown', e => { if (e.target.id !== 'cv') return; MB[e.button] = true; audioInit(); IN.mouseAim = true; });
addEventListener('mouseup', e => { MB[e.button] = false; });
addEventListener('mousemove', e => { IN.mouseX = e.clientX; IN.mouseY = e.clientY; IN.mouseAim = true; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('wheel', e => { CAM.dist = clamp(CAM.dist + e.deltaY * 0.01, 7, 18); }, { passive: true });
addEventListener('blur', () => { for (const k in K) K[k] = false; for (const k in MB) MB[k] = false; });

function setupTouch() {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouch) document.body.classList.add('touch');
  const stick = (el, side) => {
    const knob = el.querySelector('i');
    const upd = (t) => { const r = el.getBoundingClientRect(); let dx = (t.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (t.clientY - (r.top + r.height / 2)) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } TOUCH[side + 'x'] = dx; TOUCH[side + 'y'] = dy; knob.style.transform = `translate(${dx * 36}px,${dy * 36}px)`; };
    el.addEventListener('touchstart', e => { e.preventDefault(); audioInit(); const t = e.changedTouches[0]; TOUCH[side] = t.identifier; upd(t); }, { passive: false });
    el.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === TOUCH[side]) upd(t); }, { passive: false });
    const end = e => { for (const t of e.changedTouches) if (t.identifier === TOUCH[side]) { TOUCH[side] = null; TOUCH[side + 'x'] = TOUCH[side + 'y'] = 0; knob.style.transform = ''; } };
    el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
  };
  stick($('stickL'), 'l'); stick($('stickR'), 'r');
  document.querySelectorAll('.tb').forEach(b => {
    const n = b.dataset.b;
    b.addEventListener('touchstart', e => { e.preventDefault(); audioInit(); TOUCH.btn[n] = true; b.classList.add('on'); if (n === 'slam') IN.slamQ = true; if (n === 'plunge') IN.plungeQ = true; if (n === 'dark') IN.darkQ = true; if (n === 'goo') IN.gooQ = true; }, { passive: false });
    const up = e => { e.preventDefault(); TOUCH.btn[n] = false; b.classList.remove('on'); };
    b.addEventListener('touchend', up); b.addEventListener('touchcancel', up);
  });
}
function readPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []; let p = null;
  for (const q of pads) if (q && q.connected) { p = q; break; }
  if (!p) return null;
  const b = i => p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.4);
  const st = { a: b(0), b: b(1), x: b(2), y: b(3), lb: b(4), rb: b(5), lt: b(6), rt: b(7), sel: b(8), start: b(9), up: b(12), down: b(13), left: b(14), right: b(15) };
  const dz = v => Math.abs(v) < 0.18 ? 0 : v;
  st.lx = dz(p.axes[0] || 0) + (st.right ? 1 : 0) - (st.left ? 1 : 0); st.ly = dz(p.axes[1] || 0) + (st.down ? 1 : 0) - (st.up ? 1 : 0);
  st.rx = dz(p.axes[2] || 0); st.ry = dz(p.axes[3] || 0);
  const pr = PAD.prev, edge = k => st[k] && !pr[k];
  if (edge('a')) IN.slamQ = true; if (edge('b')) IN.plungeQ = true; if (edge('y')) IN.darkQ = true; if (edge('sel')) IN.gooQ = true; if (edge('start')) IN.pauseQ = true;
  if (edge('a') || edge('start')) PAD.menuA = true;
  PAD.prev = st; audioInit(); return st;
}

/* ---------- 4. three.js scene, materials, particles ---------- */
const cv = $('cv');
const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
R.setPixelRatio(Math.min(devicePixelRatio, 2)); R.outputEncoding = THREE.sRGBEncoding;
R.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0e0b1c);   // no fog: characters stay crisp
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
const hemi = new THREE.HemisphereLight(0x9fa8ff, 0x3b2a4a, 0.35); scene.add(hemi);
const amb = new THREE.AmbientLight(0x6a5f9a, 0.15); scene.add(amb);
const flashL = new THREE.SpotLight(0xfff3c8, 3.2, 26, 0.52, 0.45, 1.0); scene.add(flashL); scene.add(flashL.target);
const fillL = new THREE.PointLight(0xbfd2ff, 0.7, 7, 1.5); scene.add(fillL);   // soft light around the hero so he always reads clearly
const darkL = new THREE.SpotLight(0x9d4dff, 0, 14, 0.45, 0.5, 1.2); scene.add(darkL); scene.add(darkL.target);
function resize() { const w = innerWidth, h = innerHeight; R.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1.3 ? 65 : 55; camera.updateProjectionMatrix(); }
addEventListener('resize', resize);

const MAT = {};
const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.05 }, o));
function canvasTex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t; }
function initMats() {
  const carpet = (base, pat) => canvasTex(128, 128, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); g.fillStyle = pat; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(i * 32 + 16, j * 32 + 16, 6, 0, TAU); g.fill(); g.fillRect(i * 32 + 14, j * 32, 4, 32); } }, true);
  const boards = (a, b) => canvasTex(128, 128, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(0, i * 16, w, 16); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, i * 16 + 15, w, 1); g.fillRect((i * 37) % 128, i * 16, 2, 16); } }, true);
  const paper = (a, b) => canvasTex(128, 128, (g, w, h) => { g.fillStyle = a; g.fillRect(0, 0, w, h); g.fillStyle = b; for (let i = 0; i < 8; i++) g.fillRect(i * 16 + 6, 0, 4, h); g.fillStyle = 'rgba(255,255,255,.15)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.moveTo(i * 32 + 16, j * 32 + 6); g.lineTo(i * 32 + 22, j * 32 + 16); g.lineTo(i * 32 + 16, j * 32 + 26); g.lineTo(i * 32 + 10, j * 32 + 16); g.fill(); } }, true);
  MAT.tex = { lab: canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#7b8aa0'; g.fillRect(0, 0, w, h); g.fillStyle = '#6a7890'; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32); }, true),
    lobby: carpet('#7a2f55', '#c99a3c'), lounge: boards('#8a5a34', '#7a4c2a'), office: carpet('#2f5a6a', '#9cc7d0'), ballroom: canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a3050'; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32); }, true), closet: boards('#6a6a7a', '#5a5a6a'),
    wLab: paper('#9aa8c0', '#8a98b2'), wLobby: paper('#4a3a7a', '#5a4a8c'), wLounge: paper('#2f6a5a', '#3a7a68'), wOffice: paper('#6a5a3a', '#7a6a48'), wBall: paper('#5a3a6a', '#6c4a7c'), wCloset: paper('#555', '#606060') };
  MAT.trim = std(0xd8b25a, { metalness: 0.4, roughness: 0.4 }); MAT.wood = std(0x7a4a2a); MAT.darkwood = std(0x4a2c1a); MAT.gold = std(0xffcf3a, { metalness: 0.6, roughness: 0.3, emissive: 0x3a2a00 });
  MAT.bars = std(0x9aa0b0, { metalness: 0.7, roughness: 0.3 }); MAT.red = std(0xc0405a); MAT.cream = std(0xf2e6c8); MAT.white = std(0xffffff, { roughness: 0.4 }); MAT.black = std(0x111111, { roughness: 0.3 });
  MAT.glass = std(0xbfe8ff, { transparent: true, opacity: 0.35 }); MAT.curtain = std(0x8a1f4a, { side: THREE.DoubleSide }); MAT.curtain2 = std(0x1f6a5a, { side: THREE.DoubleSide });
}

/* particles: one additive Points cloud, fixed pool */
const PN = 1400; const PT = { pos: new Float32Array(PN * 3), col: new Float32Array(PN * 3), v: new Float32Array(PN * 3), life: new Float32Array(PN), max: new Float32Array(PN), grav: new Float32Array(PN), n: 0 };
let pGeo, pPts;
function initParticles() {
  pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(PT.pos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(PT.col, 3));
  const sp = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
  pPts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.35, map: sp, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pPts.frustumCulled = false; scene.add(pPts);
  for (let i = 0; i < PN; i++) PT.pos[i * 3 + 1] = -999;
}
const _c = new THREE.Color();
function emit(x, y, z, vx, vy, vz, col, life = 0.6, grav = 0) {
  const i = PT.n; PT.n = (PT.n + 1) % PN; _c.set(col);
  PT.pos[i * 3] = x; PT.pos[i * 3 + 1] = y; PT.pos[i * 3 + 2] = z; PT.v[i * 3] = vx; PT.v[i * 3 + 1] = vy; PT.v[i * 3 + 2] = vz;
  PT.col[i * 3] = _c.r; PT.col[i * 3 + 1] = _c.g; PT.col[i * 3 + 2] = _c.b; PT.life[i] = life; PT.max[i] = life; PT.grav[i] = grav;
}
function burstFx(x, y, z, n, col, spd = 4, life = 0.7, grav = 0) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, b = rnd(-1, 1), s = rnd(0.3, 1) * spd; emit(x, y, z, Math.cos(a) * s * Math.sqrt(1 - b * b), b * s + spd * 0.3, Math.sin(a) * s * Math.sqrt(1 - b * b), col, life * rnd(0.6, 1.2), grav); } }
function updParticles(dt) {
  for (let i = 0; i < PN; i++) {
    if (PT.life[i] <= 0) continue; PT.life[i] -= dt;
    if (PT.life[i] <= 0) { PT.pos[i * 3 + 1] = -999; continue; }
    PT.v[i * 3 + 1] -= PT.grav[i] * dt;
    PT.pos[i * 3] += PT.v[i * 3] * dt; PT.pos[i * 3 + 1] += PT.v[i * 3 + 1] * dt; PT.pos[i * 3 + 2] += PT.v[i * 3 + 2] * dt;
    const f = PT.life[i] / PT.max[i]; if (f < 0.3) { PT.col[i * 3] *= 0.92; PT.col[i * 3 + 1] *= 0.92; PT.col[i * 3 + 2] *= 0.92; }
  }
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
}

/* ---------- models (all primitives, rounded and smooth) ---------- */
const SPH = (r, m, seg = 24) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), m);
const CYL = (r1, r2, h, m, seg = 20) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m);
const BOX = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const CAPS = (r, len, m) => { const g = new THREE.Group(); const c = CYL(r, r, len, m); g.add(c); const a = SPH(r, m, 16); a.position.y = len / 2; const b = SPH(r, m, 16); b.position.y = -len / 2; g.add(a, b); return g; };
function blobShadow(r) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.02; return m; }

// Wendel: round-faced nervous hunter. Green flat cap with a "W" badge, round glasses, orange scarf,
// teal zip jacket, mustard trousers, brown boots, mittens, and the Gustmaster pack on his back.
function makeHero(goo) {
  const G = new THREE.Group(), body = new THREE.Group(); G.add(body);
  const gm = c => goo ? std(0x3fe07a, { transparent: true, opacity: 0.82, roughness: 0.15, emissive: 0x0a5a22 }) : std(c);
  const skin = gm(0xffd2a8), jacket = gm(0x2a9a9a), pants = gm(0xd8a83a), boot = gm(0x6a3f22), cap = gm(0x3cbf4a), scarf = gm(0xff8a2a), mitt = gm(0xf4f4f4);
  const torso = SPH(0.48, jacket); torso.scale.set(1, 1.15, 0.9); torso.position.y = 1.05; body.add(torso);
  const hips = SPH(0.42, pants); hips.scale.set(1.05, 0.7, 0.95); hips.position.y = 0.62; body.add(hips);
  const legs = []; for (const s of [-1, 1]) { const l = new THREE.Group(); l.position.set(0.2 * s, 0.6, 0); const leg = CAPS(0.14, 0.3, pants); leg.position.y = -0.25; l.add(leg); const b = SPH(0.17, boot); b.scale.set(1, 0.7, 1.4); b.position.set(0, -0.52, 0.06); l.add(b); body.add(l); legs.push(l); }
  const arms = []; for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.set(0.5 * s, 1.3, 0); const arm = CAPS(0.12, 0.3, jacket); arm.position.y = -0.25; a.add(arm); const h = SPH(0.16, mitt); h.position.y = -0.52; a.add(h); a.rotation.z = 0.25 * s; body.add(a); arms.push(a); }
  const sc = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.1, 10, 24), scarf); sc.rotation.x = Math.PI / 2; sc.position.y = 1.5; body.add(sc);
  const tail = CAPS(0.08, 0.3, scarf); tail.position.set(0.25, 1.32, 0.25); tail.rotation.z = 0.4; body.add(tail);
  const head = new THREE.Group(); head.position.y = 1.95; body.add(head);
  const face = SPH(0.5, skin, 32); head.add(face);
  const nose = SPH(0.1, gm(0xffb38a)); nose.position.set(0, -0.05, 0.49); head.add(nose);
  for (const s of [-1, 1]) {
    const eye = SPH(0.13, goo ? gm(0xffffff) : MAT.white); eye.scale.set(1, 1.25, 0.6); eye.position.set(0.17 * s, 0.08, 0.42); head.add(eye);
    const pu = SPH(0.06, MAT.black); pu.position.set(0.17 * s, 0.07, 0.5); head.add(pu); head.userData['pu' + s] = pu;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 8, 24), gm(0x333344)); rim.position.set(0.17 * s, 0.08, 0.5); head.add(rim);
    const brow = BOX(0.16, 0.04, 0.04, gm(0x5a3a22)); brow.position.set(0.17 * s, 0.3, 0.45); brow.rotation.z = 0.35 * s; head.add(brow);   // worried brows
    const ear = SPH(0.09, skin); ear.position.set(0.49 * s, 0, 0); head.add(ear);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 8, 16, Math.PI), gm(0x7a2a2a)); mouth.position.set(0, -0.23, 0.45); head.add(mouth);   // nervous little "o" frown
  const capTop = SPH(0.53, cap, 32); capTop.scale.set(1, 0.55, 1); capTop.position.y = 0.2; head.add(capTop);
  const brim = CYL(0.36, 0.36, 0.05, cap); brim.scale.set(1, 1, 0.65); brim.position.set(0, 0.17, 0.42); head.add(brim);
  const badgeT = canvasTex(64, 64, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(32, 32, 30, 0, TAU); g.fill(); g.fillStyle = '#2a8a3a'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('W', 32, 35); });
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.14, 24), new THREE.MeshStandardMaterial({ map: badgeT, transparent: true, opacity: goo ? 0.8 : 1 })); badge.position.set(0, 0.37, 0.44); badge.rotation.x = -0.45; head.add(badge);
  // Gustmaster pack
  const pack = new THREE.Group(); pack.position.set(0, 1.1, -0.5); body.add(pack);
  const tank = CYL(0.32, 0.32, 0.85, gm(0x8a95b0)); pack.add(tank); const cap1 = SPH(0.32, gm(0x8a95b0)); cap1.scale.y = 0.5; cap1.position.y = 0.42; pack.add(cap1);
  const band = CYL(0.335, 0.335, 0.12, gm(0x3cbf4a)); pack.add(band);
  const lamp = SPH(0.09, std(0xffee88, { emissive: 0xffcc33, emissiveIntensity: 1.2 })); lamp.position.set(0, 0.55, 0); pack.add(lamp);
  const nozzle = new THREE.Group(); nozzle.position.set(0.45, 0.95, 0.35); body.add(nozzle);
  const nz = CYL(0.09, 0.16, 0.7, gm(0x6a7590)); nz.rotation.x = Math.PI / 2; nz.position.z = 0.35; nozzle.add(nz);
  const tip = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 8, 20), gm(0x3cbf4a)); tip.position.z = 0.72; nozzle.add(tip);
  const sh = blobShadow(0.6); G.add(sh);
  G.userData = { body, legs, arms, head, nozzle, mouth, sh };
  return G;
}
const GHOSTGEO = (() => { const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; const y = 1 - t * 1.6; const r = t < 0.5 ? Math.sin(Math.acos(1 - t * 2)) * 0.7 : 0.7 - (t - 0.5) * 1.1 + 0.07 * Math.sin(t * 30); pts.push(new THREE.Vector2(Math.max(0.02, r), y)); } return new THREE.LatheGeometry(pts, 28); })();
function makeGhost(kind) {
  const col = { goob: 0x7dffb0, tough: 0xffa04a, peeker: 0xf0e8ff, mini: 0xa8f0ff }[kind];
  const G = new THREE.Group(), body = new THREE.Group(); G.add(body);
  const m = std(col, { emissive: col, emissiveIntensity: 0.35, transparent: true, opacity: 0.92, roughness: 0.3 });
  const b = new THREE.Mesh(GHOSTGEO, m); body.add(b);
  const glow = new THREE.Mesh(GHOSTGEO, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18, side: THREE.BackSide, depthWrite: false })); glow.scale.setScalar(1.12); body.add(glow);
  for (const s of [-1, 1]) {
    const e = SPH(0.15, MAT.white); e.scale.set(0.8, 1.15, 0.5); e.position.set(0.22 * s, 0.6, 0.55); body.add(e);
    const p = SPH(0.07, MAT.black); p.position.set(0.22 * s, 0.58, 0.63); body.add(p);
    const arm = SPH(0.17, m); arm.scale.set(0.7, 1, 0.7); arm.position.set(0.72 * s, 0.1, 0.1); body.add(arm);
  }
  const mouth = SPH(0.15, std(0x3a1030)); mouth.scale.set(1.3, 0.6, 0.4); mouth.position.set(0, 0.25, 0.62); body.add(mouth);
  if (kind === 'peeker') { const tongue = SPH(0.1, std(0xff6a9a)); tongue.scale.set(1, 1.5, 0.4); tongue.position.set(0, 0.12, 0.66); body.add(tongue); }
  let shades = null;
  if (kind === 'tough') { shades = new THREE.Group(); const lm = std(0x111122, { metalness: 0.6, roughness: 0.2 }); for (const s of [-1, 1]) { const l = BOX(0.3, 0.18, 0.06, lm); l.position.set(0.22 * s, 0.62, 0.66); shades.add(l); } const br = BOX(0.2, 0.05, 0.05, lm); br.position.set(0, 0.66, 0.67); shades.add(br); body.add(shades); body.scale.setScalar(1.25); }
  const sh = blobShadow(0.55); G.add(sh);
  G.userData = { body, mat: m, glow, shades, sh };
  return G;
}
function makeBoss() {
  const G = makeGhost('goob'); const u = G.userData; u.mat.color.set(0xb889ff); u.mat.emissive.set(0x7a3aff); u.glow.material.color.set(0xb889ff);
  u.body.scale.setScalar(2.1);
  const hat = new THREE.Group(); hat.position.set(0, 1.0, 0); u.body.add(hat);
  hat.add(CYL(0.42, 0.42, 0.4, MAT.red)); const top = CYL(0.45, 0.45, 0.06, MAT.gold); top.position.y = 0.2; hat.add(top); const bb = CYL(0.44, 0.44, 0.06, MAT.gold); bb.position.y = -0.17; hat.add(bb);
  const bow = SPH(0.12, MAT.red); bow.scale.set(2, 1, 0.6); bow.position.set(0, -0.1, 0.62); u.body.add(bow);   // little bow tie
  const must = SPH(0.12, std(0x3a2050)); must.scale.set(3, 0.7, 0.6); must.position.set(0, 0.4, 0.66); u.body.add(must);
  // serving-tray shield held in front
  const tray = new THREE.Group(); const disc = CYL(1.25, 1.25, 0.1, std(0xd0d6e0, { metalness: 0.85, roughness: 0.2 }), 32); disc.rotation.x = Math.PI / 2; tray.add(disc);
  const knob = SPH(0.2, MAT.gold); knob.position.z = 0.1; tray.add(knob);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.07, 8, 32), MAT.gold); tray.add(rim);
  tray.position.set(0, 1.4, 1.7); G.add(tray); u.tray = tray;
  u.sh.scale.setScalar(2.4);
  return G;
}

/* ---------- 5. world: floor modules ----------
   A floor = { id, name, label, rooms[], doors[], props[], ghosts[], boss, start }.
   rooms: axis-aligned boxes (x0,x1,z0,z1) with floor/wall texture keys; walls are generated automatically
   with gaps wherever a door sits on that wall. doors: {x,z,axis:'x'|'z',w,lock:<prop id or null>}.
   props: interactable objects, built by PROPS[type]. ghosts: {room,kind,x,z}. */
const FLOORS = {
  lobby: {
    id: 'lobby', name: '1F · Lobby', start: { x: -26, z: 0, room: 'lab' },
    rooms: [
      { id: 'lab', name: 'Fizzwick\'s Lab', x0: -30, x1: -16, z0: -6, z1: 6, floor: 'lab', wall: 'wLab', light: 0x9fd8ff },
      { id: 'lobby', name: 'Grand Lobby', x0: -16, x1: 16, z0: -12, z1: 12, floor: 'lobby', wall: 'wLobby', light: 0xffd89a },
      { id: 'lounge', name: 'Moonlight Lounge', x0: 16, x1: 32, z0: -12, z1: 4, floor: 'lounge', wall: 'wLounge', light: 0x9affd8 },
      { id: 'closet', name: 'Linen Closet', x0: 24, x1: 32, z0: 4, z1: 11, floor: 'closet', wall: 'wCloset', light: 0xd0d0ff },
      { id: 'office', name: 'Front Office', x0: -16, x1: 0, z0: 12, z1: 27, floor: 'office', wall: 'wOffice', light: 0xffe0a0 },
      { id: 'ballroom', name: 'Starlight Ballroom', x0: 0, x1: 32, z0: 12, z1: 34, floor: 'ballroom', wall: 'wBall', light: 0xd8a8ff },
    ],
    doors: [
      { x: -16, z: 0, axis: 'z', w: 3.2 },                         // lab <-> lobby
      { x: 16, z: 0, axis: 'z', w: 3.2, lock: 'boards' },          // lobby <-> lounge (plunger the boards)
      { x: 27.5, z: 4, axis: 'x', w: 3, lock: 'shutter' },         // lounge <-> closet (blow the pinwheel)
      { x: -8.5, z: 12, axis: 'x', w: 3.2 },                       // lobby <-> office
      { x: 8, z: 12, axis: 'x', w: 4, lock: 'balldoor' },          // lobby <-> ballroom (light 3 lamps)
      { x: 0, z: -12, axis: 'x', w: 3.6, lock: 'elevator' },       // elevator on the lobby's north wall
    ],
    props: [
      { t: 'prof', x: -27, z: -3.5 }, { t: 'shopsign', x: -27, z: -5.6 },
      { t: 'sign', x: -22, z: 3.8, text: 'Hold FLASH (F / X) to charge, let go to stun! Then SUCK (left click / RT) and pull the opposite way.' },
      { t: 'vase', x: -29, z: 5 }, { t: 'vase', x: -18, z: -5 }, { t: 'labdesk', x: -23, z: -4.8 },
      // lobby
      { t: 'rug', id: 'rug1', x: -6, z: 4, w: 6, d: 4, gem: 'g1' },
      { t: 'sign', x: -12, z: -2.5, text: 'That rug looks lumpy... SUCK up one edge to roll it!' },
      { t: 'lamp', id: 'lamp1', x: 13, z: -10.5 },
      { t: 'sign', x: 10, z: -9, text: 'An eye lamp! FLASH it to light it. Three lit lamps open the Ballroom.' },
      { t: 'boards', id: 'boards', x: 16, z: 0, axis: 'z' },
      { t: 'sign', x: 13, z: 2.6, text: 'Boarded up! Fire the PLUNGER (E / B) at the boards, then SUCK to yank them off.' },
      { t: 'curtain', x: -14, z: -11.6, axis: 'x' }, { t: 'curtain', x: 6, z: -11.6, axis: 'x' }, { t: 'curtain', x: -6, z: -11.6, axis: 'x' },
      { t: 'desk', x: 8, z: 4, w: 5, d: 1.6 }, { t: 'vase', x: 11.5, z: 4 }, { t: 'vase', x: -14.5, z: 10.5 }, { t: 'vase', x: 14.5, z: 10.5 }, { t: 'vase', x: 14.5, z: -6 },
      { t: 'pillar', x: -9, z: -6 }, { t: 'pillar', x: 9, z: -6 }, { t: 'pillar', x: -9, z: 8 },
      { t: 'dust', x: 2, z: 9, n: 8 }, { t: 'dust', x: -13, z: -8, n: 6 },
      { t: 'hiddenchest', x: 3, z: -4, money: 'bag' },
      { t: 'balldoor', id: 'balldoor', x: 8, z: 12 },
      { t: 'elevator', id: 'elevator', x: 0, z: -12 },
      { t: 'crate', x: -2, z: -9 }, { t: 'crate', x: -1, z: -9.9 },
      // lounge
      { t: 'painting', id: 'paint1', x: 24, z: -11.7, gem: 'g3' },
      { t: 'sign', x: 22, z: -8, text: 'Something is trapped in that painting... toggle DARK-LIGHT (R / Y) and shine it there.' },
      { t: 'pinwheel', id: 'pin1', x: 31.2, z: -2 },
      { t: 'shutter', id: 'shutter', x: 27.5, z: 4 },
      { t: 'sign', x: 27, z: -4.5, text: 'A pinwheel hooked to the closet shutter. BLOW on it (right click / LT)!' },
      { t: 'sofa', x: 20, z: -2 }, { t: 'sofa', x: 26, z: -8 }, { t: 'table', x: 23, z: -5 },
      { t: 'curtain', x: 31.6, z: -8, axis: 'z' }, { t: 'curtain', x: 18, z: -11.6, axis: 'x' },
      { t: 'vase', x: 17, z: 3 }, { t: 'vase', x: 31, z: -11 }, { t: 'dust', x: 20, z: -9, n: 6 },
      // closet
      { t: 'lamp', id: 'lamp2', x: 31.3, z: 10.3 }, { t: 'chest', x: 25.5, z: 9.5, money: 'bag' }, { t: 'heartbox', x: 30, z: 6 },
      // office
      { t: 'bars', id: 'bars', z: 19, x0: -16, x1: 0, gate: [-6, -3] },
      { t: 'sign', x: -11, z: 16.5, text: 'Bars! Press GOO (G / Select) to become Gloopel - goo slides right through. Stand on the plate.' },
      { t: 'plate', id: 'plate', x: -12, z: 23.5 },
      { t: 'chest', x: -3, z: 25.5, gem: 'g2' },
      { t: 'pile', id: 'pile', x: -3, z: 14.5 },
      { t: 'lamp', id: 'lamp3', x: -3, z: 14.5, hidden: 'pile', floorLamp: true },
      { t: 'sign', x: -6.5, z: 13.5, text: 'A wobbly suitcase pile. SUCK and BLOW together for a BURST!' },
      { t: 'desk', x: -12, z: 14.5, w: 4, d: 1.4 }, { t: 'vase', x: -15, z: 13 }, { t: 'vase', x: -1, z: 21 }, { t: 'vase', x: -15, z: 26 },
      // ballroom
      { t: 'chandelier', x: 16, z: 23 },
      { t: 'pillar', x: 4, z: 16 }, { t: 'pillar', x: 28, z: 16 }, { t: 'pillar', x: 4, z: 30 }, { t: 'pillar', x: 28, z: 30 },
    ],
    ghosts: [
      { room: 'lab', kind: 'mini', x: -20, z: 2 },
      { room: 'lobby', kind: 'goob', x: 2, z: -3 }, { room: 'lobby', kind: 'goob', x: 10, z: 8 },
      { room: 'lobby', kind: 'peeker', x: -12, z: 9 },
      { room: 'lounge', kind: 'goob', x: 22, z: -4 }, { room: 'lounge', kind: 'goob', x: 28, z: -10 }, { room: 'lounge', kind: 'tough', x: 25, z: 0 },
      { room: 'lounge', kind: 'peeker', x: 30, z: -1 },
      { room: 'office', kind: 'goob', x: -8, z: 16 }, { room: 'office', kind: 'tough', x: -12, z: 15 },
    ],
    boss: { room: 'ballroom', x: 16, z: 28 },
    gems: ['g1', 'g2', 'g3'],
  },
};

let COL = [];          // colliders {x0,x1,z0,z1,on,goo(passable by goo clone),solidFor:'all'}
let PROPS = [];        // live props
let ROOMS = [];
const WALLH = 4.6;
const world = new THREE.Group(); scene.add(world);
const addCol = (x0, x1, z0, z1, o = {}) => { const c = Object.assign({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), on: true }, o); COL.push(c); return c; };
function roomAt(x, z) { for (const r of ROOMS) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return r; return null; }

function buildFloor(F) {
  world.clear(); COL = []; PROPS = []; ROOMS = F.rooms;
  const wallSeg = (x0, z0, x1, z1, mat, gaps) => {
    // a straight wall from (x0,z0) to (x1,z1) along one axis, minus door gaps
    const alongX = z0 === z1; const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1), a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
    const cuts = gaps.filter(g => alongX ? (g.axis === 'x' && Math.abs(g.z - z0) < 0.01 && g.x > a0 && g.x < a1) : (g.axis === 'z' && Math.abs(g.x - x0) < 0.01 && g.z > a0 && g.z < a1)).map(g => [(alongX ? g.x : g.z) - g.w / 2, (alongX ? g.x : g.z) + g.w / 2]).sort((p, q) => p[0] - q[0]);
    let s = a0; const segs = []; for (const c of cuts) { segs.push([s, c[0]]); s = c[1]; } segs.push([s, a1]);
    for (const [p, q] of segs) {
      if (q - p < 0.05) continue; const L = q - p, mid = (p + q) / 2, T = 0.4;
      const tex = mat.map.clone(); tex.needsUpdate = true; tex.repeat.set(L / 3, WALLH / 3);
      const m = new THREE.Mesh(new THREE.BoxGeometry(alongX ? L : T, WALLH, alongX ? T : L), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
      m.position.set(alongX ? mid : x0, WALLH / 2, alongX ? z0 : mid); world.add(m);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(alongX ? L : T + 0.1, 0.3, alongX ? T + 0.1 : L), MAT.trim); trim.position.set(m.position.x, 0.15, m.position.z); world.add(trim);
      const trim2 = trim.clone(); trim2.position.y = WALLH - 0.1; world.add(trim2);
      if (alongX) addCol(p, q, z0 - T / 2, z0 + T / 2); else addCol(x0 - T / 2, x0 + T / 2, p, q);
    }
    // door frames
    for (const c of cuts) for (const e of c) { const post = BOX(0.5, WALLH, 0.6, MAT.trim); if (alongX) post.position.set(e, WALLH / 2, z0); else { post.position.set(x0, WALLH / 2, e); post.rotation.y = Math.PI / 2; } world.add(post); }
  };
  for (const r of F.rooms) {
    const ft = MAT.tex[r.floor].clone(); ft.needsUpdate = true; ft.repeat.set((r.x1 - r.x0) / 4, (r.z1 - r.z0) / 4);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(r.x1 - r.x0, r.z1 - r.z0), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.85 }));
    fl.rotation.x = -Math.PI / 2; fl.position.set((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2); world.add(fl);
    const wm = { map: MAT.tex[r.wall] };
    wallSeg(r.x0, r.z0, r.x1, r.z0, wm, F.doors); wallSeg(r.x0, r.z1, r.x1, r.z1, wm, F.doors);
    wallSeg(r.x0, r.z0, r.x0, r.z1, wm, F.doors); wallSeg(r.x1, r.z0, r.x1, r.z1, wm, F.doors);
    // room light: warm point lights near the ceiling (cheap; one or two per room)
    const n = 1;
    for (let i = 0; i < n; i++) { const L = new THREE.PointLight(r.light, 0.75, Math.max(r.x1 - r.x0, r.z1 - r.z0) * 1.0, 1.2); L.position.set(lerp(r.x0, r.x1, n === 1 ? 0.5 : (i ? 0.72 : 0.28)), 3.8, (r.z0 + r.z1) / 2); world.add(L); r.lights = (r.lights || []).concat(L); }
    // wall sconces for charm
    for (const s of [0.25, 0.75]) { const sc = SPH(0.18, std(0xffe9a0, { emissive: 0xffc860, emissiveIntensity: 1 })); sc.position.set(lerp(r.x0, r.x1, s), 3, r.z0 + 0.3); world.add(sc); }
  }
  for (const p of F.props) { const fn = PROPDEF[p.t]; if (fn) { const o = Object.assign({ ...p }, { done: !!(p.id && SAVE.flags[p.id]) }); fn(o); PROPS.push(o); } }
}

/* ---------- props: each builder adds meshes/colliders and optional hooks
   onSuck(dt), onBlow(dt), onBurst(), onFlash(power), onDark(dt), onPull() (after plunger), touch(), update(dt) ---------- */
const solve = (p, msg) => { if (p.id) { SAVE.flags[p.id] = true; writeSave(); } p.done = true; SFX.solve(); if (msg) toast(msg, 3); };
const PROPDEF = {
  prof(p) {
    const g = new THREE.Group(); const coat = std(0xf4f4f4), skin = std(0xffd8b0);
    const b = SPH(0.55, coat); b.scale.set(1, 1.3, 1); b.position.y = 0.8; g.add(b);
    const h = SPH(0.42, skin); h.position.y = 1.75; g.add(h);
    const hair = SPH(0.3, std(0xdddddd)); hair.position.set(0, 1.95, -0.25); hair.scale.set(1.6, 0.8, 1); g.add(hair);
    for (const s of [-1, 1]) { const gl = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 8, 20), std(0x333333)); gl.position.set(0.17 * s, 1.8, 0.38); g.add(gl); const lens = SPH(0.12, std(0xaaddff, { emissive: 0x3388aa })); lens.scale.z = 0.3; lens.position.set(0.17 * s, 1.8, 0.38); g.add(lens); }
    const bow = SPH(0.1, std(0x3a6aff)); bow.scale.set(2, 1, 0.6); bow.position.set(0, 1.35, 0.5); g.add(bow);
    g.position.set(p.x, 0, p.z); world.add(g); p.mesh = g; addCol(p.x - 0.6, p.x + 0.6, p.z - 0.6, p.z + 0.6);
    p.update = dt => { g.rotation.y = Math.atan2(HERO.x - p.x, HERO.z - p.z); g.position.y = Math.abs(Math.sin(GAME.t * 2)) * 0.05; };
    p.near = 2.4; p.touch = () => openTalk();
  },
  shopsign(p) { const s = BOX(1.6, 0.8, 0.1, std(0x3a6aff)); s.position.set(p.x, 2.6, p.z); world.add(s); },
  labdesk(p) { const d = BOX(4, 1, 1.4, std(0x9aa8c0, { metalness: 0.5 })); d.position.set(p.x, 0.5, p.z); world.add(d); for (let i = 0; i < 3; i++) { const j = CYL(0.2, 0.2, 0.6, std([0x7dffb0, 0xffb07d, 0x7db0ff][i], { emissive: [0x2a8a4a, 0x8a4a2a, 0x2a4a8a][i] })); j.position.set(p.x - 1.2 + i * 1.2, 1.3, p.z); world.add(j); } addCol(p.x - 2, p.x + 2, p.z - 0.7, p.z + 0.7); },
  sign(p) {
    const g = new THREE.Group(); const post = CYL(0.06, 0.06, 1.2, MAT.wood); post.position.y = 0.6; g.add(post);
    const board = BOX(0.9, 0.6, 0.08, std(0xffe9a0, { emissive: 0x3a3010 })); board.position.y = 1.4; g.add(board);
    const q = canvasTex(64, 64, g2 => { g2.fillStyle = '#3a2a10'; g2.font = 'bold 50px sans-serif'; g2.textAlign = 'center'; g2.fillText('?', 32, 50); });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: q, transparent: true })); f.position.set(0, 1.4, 0.05); g.add(f); const f2 = f.clone(); f2.rotation.y = Math.PI; f2.position.z = -0.05; g.add(f2);
    g.position.set(p.x, 0, p.z); world.add(g); p.mesh = g; p.near = 2.6;
    p.update = () => { g.visible = OPT.hints; g.rotation.y = Math.atan2(HERO.x - p.x, HERO.z - p.z); };
    p.touch = () => { if (OPT.hints) tip(p.text); };
  },
  vase(p) {
    const g = new THREE.Group(); const m = std([0x3a7aff, 0xff7aa0, 0xffd04a][Math.floor(Math.random() * 3)], { roughness: 0.3 });
    const b = SPH(0.38, m); b.scale.y = 1.2; b.position.y = 0.45; g.add(b); const n = CYL(0.15, 0.22, 0.35, m); n.position.y = 0.95; g.add(n);
    g.position.set(p.x, 0, p.z); world.add(g); p.mesh = g; p.col = addCol(p.x - 0.4, p.x + 0.4, p.z - 0.4, p.z + 0.4);
    p.hp = 1; p.small = true;
    const brk = () => { if (p.done) return; p.done = true; p.col.on = false; g.visible = false; SFX.pop(); burstFx(p.x, 0.6, p.z, 20, '#ffffff', 3, 0.6, 6); spawnMoney(p.x, p.z, Math.random() < 0.3 ? 'bill' : 'coin', 3 + (Math.random() * 4 | 0)); if (Math.random() < 0.35) spawnPickup('heart', p.x, p.z); };
    p.onSuck = dt => { p.wob = (p.wob || 0) + dt; g.rotation.z = Math.sin(GAME.t * 30) * 0.15; if (p.wob > 0.9) brk(); };
    p.onBurst = brk; p.onSlam = brk; p.onBlow = dt => { g.rotation.z = Math.sin(GAME.t * 25) * 0.1; };
  },
  desk(p) { const d = BOX(p.w, 1.1, p.d, MAT.darkwood); d.position.set(p.x, 0.55, p.z); world.add(d); const top = BOX(p.w + 0.2, 0.1, p.d + 0.2, MAT.trim); top.position.set(p.x, 1.12, p.z); world.add(top); const bell = SPH(0.15, MAT.gold); bell.scale.y = 0.6; bell.position.set(p.x + 0.5, 1.22, p.z); world.add(bell); addCol(p.x - p.w / 2, p.x + p.w / 2, p.z - p.d / 2, p.z + p.d / 2); },
  pillar(p) { const c = CYL(0.6, 0.6, WALLH, std(0xe8dcc0, { roughness: 0.4 })); c.position.set(p.x, WALLH / 2, p.z); world.add(c); const b = BOX(1.5, 0.4, 1.5, MAT.trim); b.position.set(p.x, 0.2, p.z); world.add(b); addCol(p.x - 0.7, p.x + 0.7, p.z - 0.7, p.z + 0.7); },
  sofa(p) { const g = new THREE.Group(); const m = std(0x9a3a6a); const s = BOX(3, 0.6, 1.2, m); s.position.y = 0.4; g.add(s); const back = BOX(3, 0.9, 0.3, m); back.position.set(0, 0.9, -0.5); g.add(back); for (const x of [-1.5, 1.5]) { const a = CAPS(0.25, 0.8, m); a.rotation.x = Math.PI / 2; a.position.set(x, 0.75, 0); g.add(a); } g.position.set(p.x, 0, p.z); world.add(g); addCol(p.x - 1.7, p.x + 1.7, p.z - 0.7, p.z + 0.7); },
  table(p) { const t = CYL(1, 1, 0.1, MAT.wood); t.position.set(p.x, 0.9, p.z); world.add(t); const l = CYL(0.12, 0.3, 0.9, MAT.darkwood); l.position.set(p.x, 0.45, p.z); world.add(l); const c = SPH(0.2, std(0xffe9a0, { emissive: 0xffaa33, emissiveIntensity: 0.8 })); c.position.set(p.x, 1.15, p.z); world.add(c); addCol(p.x - 1, p.x + 1, p.z - 1, p.z + 1); },
  crate(p) { const c = BOX(0.9, 0.9, 0.9, MAT.wood); c.position.set(p.x, 0.45, p.z); world.add(c); p.mesh = c; p.vx = 0; p.vz = 0; p.small = true;
    p.onBlow = dt => { const d = Math.hypot(p.x - HERO.ax, p.z - HERO.az) || 1; p.vx += (p.x - HERO.ax) / d * 9 * dt; p.vz += (p.z - HERO.az) / d * 9 * dt; };
    p.onBurst = () => { const d = Math.hypot(p.x - HERO.ax, p.z - HERO.az) || 1; p.vx += (p.x - HERO.ax) / d * 6; p.vz += (p.z - HERO.az) / d * 6; };
    p.update = dt => { p.x += p.vx * dt; p.z += p.vz * dt; const o = { x: p.x, z: p.z, r: 0.45 }; collide(o, false); p.x = o.x; p.z = o.z; p.vx *= Math.pow(0.05, dt); p.vz *= Math.pow(0.05, dt); c.position.x = p.x; c.position.z = p.z; c.rotation.y += (Math.abs(p.vx) + Math.abs(p.vz)) * dt * 0.5; if (Math.hypot(p.x - HERO.x, p.z - HERO.z) < 1.0) { const d = Math.hypot(p.x - HERO.x, p.z - HERO.z) || 1; p.x += (p.x - HERO.x) / d * 0.05; p.z += (p.z - HERO.z) / d * 0.05; } };
  },
  rug(p) {
    // a rug that rolls up when you suck an edge; a floor hatch with a gem hides beneath
    const tex = canvasTex(128, 96, (g, w, h) => { g.fillStyle = '#b8323a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffd04a'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#ffd04a'; g.beginPath(); g.arc(w / 2, h / 2, 16, 0, TAU); g.fill(); });
    const pivot = new THREE.Group(); pivot.position.set(p.x - p.w / 2, 0.07, p.z); world.add(pivot);
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })); rug.rotation.x = -Math.PI / 2; rug.position.x = p.w / 2; pivot.add(rug);
    const roll = CYL(0.3, 0.3, p.d, new THREE.MeshStandardMaterial({ map: tex })); roll.rotation.x = Math.PI / 2; roll.position.set(0, 0.3, 0); roll.visible = false; pivot.add(roll);
    const hatch = BOX(1.4, 0.06, 1.4, MAT.darkwood); hatch.position.set(p.x + 1, 0.0, p.z); world.add(hatch);
    p.k = 0; p.mesh = pivot; p.range = 8.5;
    const bump = SPH(0.35, new THREE.MeshStandardMaterial({ map: tex })); bump.scale.y = 0.4; bump.position.set(p.x + 1, 0.1, p.z); world.add(bump); p.bump = bump;
    const setK = () => { rug.scale.x = 1 - p.k * 0.95; rug.position.x = p.w * (1 - p.k * 0.95) / 2 + p.k * p.w * 0.95; roll.visible = p.k > 0.05; roll.position.x = p.k * p.w * 0.95; roll.scale.setScalar(1); roll.scale.y = 1; const r = 0.3 + p.k * 0.25; roll.scale.x = r / 0.3; roll.scale.z = r / 0.3; roll.position.y = r; bump.visible = p.k < 0.6; };
    p.cx = p.x - p.w / 2 + 0.4; p.cz = p.z;   // the edge you suck
    if (p.done) { p.k = 1; setK(); }
    p.onSuck = dt => { if (p.k >= 1) return; p.k = Math.min(1, p.k + dt * 1.1); setK(); if (Math.random() < 0.4) emit(p.x - p.w / 2 + p.k * p.w, 0.3, p.z + rnd(-p.d / 2, p.d / 2), 0, 1, 0, '#ffd04a', 0.4); if (p.k >= 1 && !p.done) { solve(p, 'A hidden hatch! Something sparkly popped out.'); spawnPickup('gem', p.x + 1, p.z, p.gem); spawnMoney(p.x + 1, p.z, 'coin', 6); } };
    p.onBlow = dt => { if (p.k > 0 && p.done) { p.k = Math.max(0, p.k - dt * 1.2); setK(); } };
    p.hitPoint = () => ({ x: p.x - p.w / 2 + p.k * p.w, z: p.z });
  },
  curtain(p) {
    const g = new THREE.Group(); const rod = CYL(0.05, 0.05, 3, MAT.gold); rod.rotation.z = Math.PI / 2; rod.position.y = 3.6; g.add(rod);
    const win = BOX(2.4, 2.6, 0.05, std(0x2a3a7a, { emissive: 0x1a2a6a, emissiveIntensity: 0.8 })); win.position.set(0, 2.2, -0.12); g.add(win);
    const moon = SPH(0.3, std(0xfff6c8, { emissive: 0xfff0a0 })); moon.scale.z = 0.1; moon.position.set(0.6, 2.9, -0.08); g.add(moon);
    const cm = Math.random() < 0.5 ? MAT.curtain : MAT.curtain2; const panes = [];
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.4, 6, 1), cm); c.position.set(0.7 * s, 1.85, 0.05); const pos = c.geometry.attributes.position; for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 8) * 0.08); c.geometry.computeVertexNormals(); g.add(c); panes.push(c); }
    g.position.set(p.x, 0, p.z); if (p.axis === 'z') g.rotation.y = p.x > 0 ? -Math.PI / 2 : Math.PI / 2; world.add(g); p.mesh = g; p.panes = panes; p.small = true; p.y = 1.8;
    p.onSuck = dt => { if (p.done) return; p.t2 = (p.t2 || 0) + dt; for (const c of panes) c.rotation.y = Math.sin(GAME.t * 20) * 0.2; if (p.t2 > 1.0) { p.done = true; SFX.pop(); for (const c of panes) c.visible = false; burstFx(p.x, 2, p.z, 25, '#ff7aa0', 3, 0.6, 3); const ox = p.axis === 'z' ? (p.x > 0 ? -1 : 1) : 0, oz = p.axis === 'x' ? 1 : 0; spawnMoney(p.x + ox, p.z + oz, Math.random() < 0.5 ? 'bill' : 'coin', 5); } };
    p.onBlow = dt => { if (!p.done) for (const c of panes) c.rotation.y = Math.sin(GAME.t * 12) * 0.3; };
  },
  dust(p) {
    const g = new THREE.Group(); const m = std(0x8a8098, { roughness: 1 });
    for (let i = 0; i < p.n; i++) { const d = SPH(rnd(0.2, 0.4), m, 10); d.scale.y = 0.4; d.position.set(rnd(-1, 1), 0.05, rnd(-1, 1)); g.add(d); }
    g.position.set(p.x, 0, p.z); world.add(g); p.mesh = g; p.small = true;
    p.onBlow = dt => { if (p.done) return; p.t2 = (p.t2 || 0) + dt; g.scale.setScalar(Math.max(0.01, 1 - p.t2)); if (Math.random() < 0.6) emit(p.x + rnd(-1, 1), 0.3, p.z + rnd(-1, 1), rnd(-2, 2), 1, rnd(-2, 2), '#b0a8c0', 0.8); if (p.t2 > 1) { p.done = true; g.visible = false; toast('Blown away! Coins underneath.', 2); spawnMoney(p.x, p.z, 'coin', 5); } };
    p.onSuck = p.onBlow;
  },
  hiddenchest(p) {
    // only visible with dark-light; touch to open
    const g = makeChest(); g.position.set(p.x, 0, p.z); world.add(g); p.mesh = g; p.reveal = 0;
    g.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0; } });
    p.onDark = dt => { if (p.reveal < 1) { p.reveal = Math.min(1, p.reveal + dt * 1.2); if (p.reveal >= 1) { toast('Dark-light revealed a hidden chest!', 2.5); SFX.solve(); p.col = addCol(p.x - 0.6, p.x + 0.6, p.z - 0.5, p.z + 0.5); } } };
    p.update = () => g.traverse(o => { if (o.material) o.material.opacity = p.done ? 1 : p.reveal; });
    if (p.done) p.reveal = 1;
    p.near = 1.6; p.touch = () => { if (p.reveal >= 1 && !p.opened && !p.done) openChest(p); };
    p.y = 0.5;
  },
  chest(p) { const g = makeChest(); g.position.set(p.x, 0, p.z); world.add(g); p.mesh = g; p.col = addCol(p.x - 0.6, p.x + 0.6, p.z - 0.5, p.z + 0.5); p.near = 1.7; p.id = p.id || ('chest' + p.x + p.z); p.done = !!SAVE.flags[p.id]; if (p.done) g.userData.lid.rotation.x = -1.6; p.touch = () => { if (!p.done) openChest(p); }; },
  heartbox(p) { if (!SAVE.flags['hb' + p.x]) spawnPickup('heart', p.x, p.z); },
  lamp(p) {
    // eye lamp: flash it to light it. Three lamps open the ballroom.
    const g = new THREE.Group(); const post = CYL(0.12, 0.2, 2, MAT.trim); post.position.y = 1; g.add(post);
    const bulbM = std(0x555566, { emissive: 0x000000 }); const bulb = SPH(0.38, bulbM); bulb.position.y = 2.3; g.add(bulb);
    const iris = SPH(0.15, std(0x2a6aff)); iris.scale.z = 0.4; iris.position.set(0, 2.3, 0.33); g.add(iris);
    const lid = SPH(0.4, std(0x4a3a7a)); lid.scale.set(1, 0.55, 1); lid.position.y = 2.48; g.add(lid);
    g.position.set(p.x, 0, p.z); world.add(g); p.mesh = g; p.y = 2.3; p.bulbM = bulbM; p.lid = lid;
    p.pl = { intensity: 0 };   // no real light (keeps the light count low for phones); the bulb glows instead
    if (!p.floorLamp) p.col = addCol(p.x - 0.3, p.x + 0.3, p.z - 0.3, p.z + 0.3);
    const lit = () => { bulbM.color.set(0xfff0a0); bulbM.emissive.set(0xffd040); lid.visible = false; p.pl.intensity = 1.3; };
    if (p.done) lit();
    p.update = () => { if (p.hidden) { const pile = PROPS.find(q => q.id === p.hidden); g.visible = !pile || pile.done; } if (!p.done) g.rotation.y = Math.atan2(HERO.x - p.x, HERO.z - p.z); };
    p.onFlash = pw => { if (p.done) return; if (p.hidden) { const pile = PROPS.find(q => q.id === p.hidden); if (pile && !pile.done) return; } lit(); solve(p); const n = ['lamp1', 'lamp2', 'lamp3'].filter(k => SAVE.flags[k]).length; toast(`Eye lamp lit! ${n}/3` + (n === 3 ? ' — the Ballroom doors creak open!' : ''), 3); burstFx(p.x, 2.3, p.z, 30, '#fff0a0', 4); };
  },
  boards(p) {
    const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const b = BOX(0.15, 0.35, 3.6, MAT.wood); b.position.set(0, 0.8 + i * 1.1, 0); b.rotation.x = (i - 1) * 0.25; g.add(b); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.06, 8, 16), std(0xff4a6a, { emissive: 0x8a1a2a })); ring.position.set(-0.15, 1.9, 0); ring.rotation.y = Math.PI / 2; g.add(ring);
    g.position.set(p.x, 0, p.z); world.add(g); p.mesh = g; p.col = addCol(p.x - 0.3, p.x + 0.3, p.z - 1.6, p.z + 1.6); p.plungeable = true; p.y = 1.9;
    if (p.done) { g.visible = false; p.col.on = false; }
    p.onPull = () => { if (p.done) return; p.done = true; solve(p, 'The boards came flying off! The Lounge is open.'); p.col.on = false; p.fly = 1; SFX.thunk(); STATS.plungers++; };
    p.update = dt => { if (p.fly > 0) { p.fly -= dt; g.position.x -= dt * 8; g.position.y += dt * 3; g.rotation.z += dt * 4; if (p.fly <= 0) g.visible = false; } };
  },
  shutter(p) { const s = BOX(3, 3.4, 0.2, std(0x6a7a8a, { metalness: 0.6 })); s.position.set(p.x, 1.7, p.z); world.add(s); p.mesh = s; p.col = addCol(p.x - 1.6, p.x + 1.6, p.z - 0.2, p.z + 0.2); p.open = p.done ? 1 : 0; p.update = () => { s.position.y = 1.7 + p.open * 3.3; p.col.on = p.open < 0.8; }; },
  pinwheel(p) {
    const g = new THREE.Group(); const post = CYL(0.08, 0.08, 2.4, MAT.trim); post.position.y = 1.2; g.add(post);
    const w = new THREE.Group(); w.position.y = 2.4; g.add(w);
    for (let i = 0; i < 4; i++) { const b = BOX(0.9, 0.35, 0.04, std([0xff5a8a, 0xffd04a, 0x5ad0ff, 0x7dff7a][i])); b.position.x = 0.45; const h = new THREE.Group(); h.rotation.z = i * Math.PI / 2; h.add(b); w.add(h); }
    g.position.set(p.x, 0, p.z); g.rotation.y = -Math.PI / 2; world.add(g); p.mesh = g; p.w = w; p.prog = p.done ? 1 : 0; p.spin = 0; p.y = 2.4; p.col = addCol(p.x - 0.3, p.x + 0.3, p.z - 0.3, p.z + 0.3);
    p.onBlow = dt => { p.spin = Math.min(25, p.spin + dt * 40); };
    p.update = dt => { w.rotation.z += p.spin * dt; p.spin *= Math.pow(0.4, dt); const sh = PROPS.find(q => q.id === 'shutter'); if (!p.done) { if (p.spin > 8) p.prog += dt * 0.45; else p.prog = Math.max(0, p.prog - dt * 0.15); if (sh) sh.open = clamp(p.prog, 0, 1); if (p.prog >= 1) { solve(p, 'The closet shutter rolls up!'); if (sh) { sh.done = true; SAVE.flags.shutter = true; writeSave(); } } } else if (sh) sh.open = Math.min(1, sh.open + dt); };
  },
  bars(p) {
    // a row of bars across the room; goo passes, the hero does not. Gate opens via the pressure plate.
    const g = new THREE.Group(); const [g0, g1] = p.gate;
    for (let x = p.x0 + 0.3; x < p.x1; x += 0.45) { const b = CYL(0.06, 0.06, WALLH, MAT.bars, 8); b.position.set(x, WALLH / 2, p.z); if (x > g0 && x < g1) { p.gateBars = p.gateBars || []; p.gateBars.push(b); } g.add(b); }
    const top = BOX(p.x1 - p.x0, 0.2, 0.2, MAT.bars); top.position.set((p.x0 + p.x1) / 2, WALLH - 0.3, p.z); g.add(top);
    world.add(g); p.mesh = g;
    addCol(p.x0, g0, p.z - 0.15, p.z + 0.15, { goo: true }); addCol(g1, p.x1, p.z - 0.15, p.z + 0.15, { goo: true });
    p.gateCol = addCol(g0, g1, p.z - 0.15, p.z + 0.15, { goo: true });
    p.update = dt => { const pl = PROPS.find(q => q.id === 'plate'); const open = pl && pl.done; p.gateCol.on = !open; for (const b of p.gateBars) b.position.y = lerp(b.position.y, open ? WALLH * 1.5 : WALLH / 2, dt * 3); };
  },
  plate(p) { const m = std(0xffd04a, { metalness: 0.5, emissive: 0x3a2a00 }); const pl = CYL(0.7, 0.8, 0.12, m); pl.position.set(p.x, 0.06, p.z); world.add(pl); p.mesh = pl;
    p.update = () => { if (p.done) { pl.position.y = 0.02; return; } const a = activeBody(); if (Math.hypot(a.x - p.x, a.z - p.z) < 0.9) { solve(p, 'Click! The gate in the bars slides up.'); pl.position.y = 0.02; } }; },
  pile(p) {
    const g = new THREE.Group(); p.cases = [];
    for (let i = 0; i < 7; i++) { const c = BOX(rnd(0.8, 1.2), rnd(0.4, 0.6), rnd(0.6, 0.8), std([0x8a4a2a, 0x3a6a8a, 0x8a2a4a, 0x6a8a3a][i % 4])); c.position.set(rnd(-0.6, 0.6), 0.3 + i * 0.35, rnd(-0.5, 0.5)); c.rotation.y = rnd(0, 3); g.add(c); p.cases.push({ m: c, vx: 0, vy: 0, vz: 0 }); }
    g.position.set(p.x, 0, p.z); world.add(g); p.mesh = g; p.col = addCol(p.x - 0.9, p.x + 0.9, p.z - 0.9, p.z + 0.9);
    if (p.done) { g.visible = false; p.col.on = false; }
    p.onBlow = dt => { if (!p.done) g.rotation.z = Math.sin(GAME.t * 20) * 0.03; };
    p.onBurst = () => { if (p.done) return; solve(p, 'The suitcases went flying! There was an eye lamp under there.'); p.col.on = false; for (const c of p.cases) { c.vx = rnd(-5, 5); c.vy = rnd(4, 8); c.vz = rnd(-5, 5); } p.fly = 1.5; };
    p.update = dt => { if (p.fly > 0) { p.fly -= dt; for (const c of p.cases) { c.vy -= 20 * dt; c.m.position.x += c.vx * dt; c.m.position.y = Math.max(0.25, c.m.position.y + c.vy * dt); c.m.position.z += c.vz * dt; c.m.rotation.x += dt * 5; } if (p.fly <= 0) g.visible = false; } };
  },
  painting(p) {
    // a portrait whose frame hides a trapped gem; shine dark-light on it to free the gem
    const g = new THREE.Group(); const frame = BOX(2.4, 3, 0.2, MAT.gold); g.add(frame);
    const art = canvasTex(96, 120, (c, w, h) => { c.fillStyle = '#2a3a6a'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8c890'; c.beginPath(); c.arc(48, 50, 26, 0, TAU); c.fill(); c.fillStyle = '#4a2a1a'; c.fillRect(22, 74, 52, 46); c.fillStyle = '#222'; c.fillRect(38, 45, 5, 5); c.fillRect(54, 45, 5, 5); c.fillRect(40, 60, 16, 3); });
    const canvasM = new THREE.MeshStandardMaterial({ map: art, emissive: 0x000000 }); const pic = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.6), canvasM); pic.position.z = 0.11; g.add(pic);
    const gem = makeGemMesh(0x5affd0); gem.position.set(0.6, -0.8, 0.15); gem.scale.setScalar(0.6); g.add(gem); gem.visible = false;
    g.position.set(p.x, 2.2, p.z + 0.15); world.add(g); p.mesh = g; p.y = 2.2; p.prog = 0; p.canvasM = canvasM; p.gemM = gem;
    p.onDark = dt => { if (p.done) return; p.prog += dt; gem.visible = true; gem.rotation.y += dt * 3; canvasM.emissive.setRGB(0.3 * Math.min(1, p.prog), 0.1, 0.4 * Math.min(1, p.prog)); g.position.x = p.x + Math.sin(GAME.t * 40) * 0.03 * p.prog; if (p.prog > 1.6) { solve(p, 'The painting let go of a gem!'); gem.visible = false; spawnPickup('gem', p.x, p.z + 1.5, p.gem); burstFx(p.x, 1.4, p.z + 0.8, 40, '#c48aff', 4); } };
    p.update = dt => { if (!p.done && p.prog > 0) { p.prog = Math.max(0, p.prog - dt * 0.3); if (!DARK.on) gem.visible = false; } };
  },
  balldoor(p) {
    const g = new THREE.Group(); const m = std(0x7a2a5a, { roughness: 0.5 });
    for (const s of [-1, 1]) { const d = BOX(2, 3.8, 0.2, m); d.position.set(s * 1, 1.9, 0); const h = new THREE.Group(); h.position.x = s * 2; d.position.x = -s * 1; h.add(d); const k = SPH(0.12, MAT.gold); k.position.set(-s * 1.8, 1.8, 0.15); h.add(k); g.add(h); p['h' + s] = h; }
    const eyes = []; for (let i = 0; i < 3; i++) { const e = SPH(0.17, std(0x333344)); e.position.set(-0.6 + i * 0.6, 4.2, -0.2); g.add(e); eyes.push(e); }
    g.position.set(p.x, 0, p.z); world.add(g); p.mesh = g; p.eyes = eyes; p.col = addCol(p.x - 2, p.x + 2, p.z - 0.2, p.z + 0.2); p.open = 0;
    p.update = dt => { const n = ['lamp1', 'lamp2', 'lamp3'].filter(k => SAVE.flags[k]).length; eyes.forEach((e, i) => { e.material.color.set(i < n ? 0xfff0a0 : 0x333344); e.material.emissive && e.material.emissive.set(i < n ? 0xffc040 : 0); }); const want = n >= 3 && !BOSS.locked ? 1 : 0; p.open = lerp(p.open, want, dt * 2); p.h1.rotation.y = p.open * 1.4; p['h-1'].rotation.y = -p.open * 1.4; p.col.on = p.open < 0.7; };
    p.near = 2.5; p.touch = () => { const n = ['lamp1', 'lamp2', 'lamp3'].filter(k => SAVE.flags[k]).length; if (n < 3) tip(`Ballroom doors: ${n}/3 eye lamps lit. Find and FLASH the eye lamps.`); };
  },
  elevator(p) {
    const g = new THREE.Group(); const fr = BOX(4.4, WALLH, 0.3, MAT.gold); fr.position.set(0, WALLH / 2, 0.2); g.add(fr);
    const doorM = std(0xb8a060, { metalness: 0.8, roughness: 0.25 }); const dl = BOX(1.8, 3.4, 0.2, doorM), dr = dl.clone(); dl.position.set(-0.9, 1.7, 0.4); dr.position.set(0.9, 1.7, 0.4); g.add(dl, dr);
    const ind = BOX(1.6, 0.5, 0.1, std(0x1a1a2a, { emissive: 0x111122 })); ind.position.set(0, 3.9, 0.4); g.add(ind);
    const btn = SPH(0.16, std(0xff4a4a, { emissive: 0x6a1010 })); btn.position.set(2.3, 1.4, 0.45); g.add(btn);
    g.position.set(p.x, 0, p.z); world.add(g); p.mesh = g; p.btn = btn; p.col = addCol(p.x - 2, p.x + 2, p.z - 0.2, p.z + 0.5);
    p.open = 0; p.update = dt => { const ok = SAVE.button; btn.material.color.set(ok ? 0x4aff6a : 0xff4a4a); btn.material.emissive.set(ok ? 0x106a20 : 0x6a1010); const near = ok && Math.hypot(HERO.x - p.x, HERO.z - p.z) < 4; p.open = lerp(p.open, near ? 1 : 0, dt * 3); dl.position.x = -0.9 - p.open * 1.4; dr.position.x = 0.9 + p.open * 1.4; };
    p.near = 3.3; p.touch = () => { if (!SAVE.button) tip('The elevator needs the floor\'s Elevator Button. The boss in the Ballroom has it!'); else if (!GAME.ending) finishFloor(); };
  },
  chandelier(p) { const g = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.1, 8, 32), MAT.gold); ring.rotation.x = Math.PI / 2; g.add(ring); for (let i = 0; i < 8; i++) { const c = SPH(0.15, std(0xfff0c0, { emissive: 0xffd080 })); c.position.set(Math.cos(i / 8 * TAU) * 1.6, 0.2, Math.sin(i / 8 * TAU) * 1.6); g.add(c); } g.position.set(p.x, 4.1, p.z); world.add(g); p.mesh = g; p.update = dt => { g.rotation.y += dt * 0.2; }; },
};
function makeChest() { const g = new THREE.Group(); const b = BOX(1.1, 0.6, 0.8, MAT.wood); b.position.y = 0.3; g.add(b); const lid = new THREE.Group(); lid.position.set(0, 0.6, -0.4); const l = BOX(1.12, 0.3, 0.82, MAT.darkwood); l.position.set(0, 0.15, 0.4); lid.add(l); const lock = BOX(0.2, 0.25, 0.05, MAT.gold); lock.position.set(0, 0, 0.82); lid.add(lock); g.add(lid); g.userData.lid = lid; return g; }
function makeGemMesh(col) { return new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), std(col, { emissive: col, emissiveIntensity: 0.5, metalness: 0.3, roughness: 0.1 })); }
function openChest(p) { p.done = true; SAVE.flags[p.id] = true; writeSave(); p.mesh.userData.lid.rotation.x = -1.6; SFX.solve(); const dz = -1.2; if (p.gem) spawnPickup('gem', p.x, p.z + dz, p.gem); if (p.money) spawnMoney(p.x, p.z + dz, p.money, p.money === 'bag' ? 1 : 6); spawnMoney(p.x, p.z + dz, 'coin', 6); }

/* ---------- 6. entities ---------- */
const GAME = { running: false, paused: false, t: 0, time: 0, ending: false, floor: null, room: null, shake: 0 };
const mkBody = goo => ({ x: 0, z: 0, y: 0, vy: 0, vx: 0, vz: 0, r: 0.5, face: 0, aim: 0, walk: 0, mesh: null, goo, hp: 100, inv: 0 });
const HERO = mkBody(false); const GOOB = mkBody(true); const GOO = { on: false };
const activeBody = () => GOO.on ? GOOB : HERO;
let GHOSTS = [], PICK = [], SHOTS = [];
const BOSS = { g: null, locked: false, done: false };
const DARK = { on: false };
const TOOL = { flashCharge: 0, flashHeld: false, flashCd: 0, burstCd: 0, caught: null, meter: 0, slamT: 0, plunger: null, sucking: false, blowing: false, flashT: 0 };

function collide(o, goo) {
  for (const c of COL) {
    if (!c.on || (goo && c.goo)) continue;
    const nx = clamp(o.x, c.x0, c.x1), nz = clamp(o.z, c.z0, c.z1); const dx = o.x - nx, dz = o.z - nz; const d2 = dx * dx + dz * dz;
    if (d2 < o.r * o.r) {
      if (d2 > 1e-6) { const d = Math.sqrt(d2), p = (o.r - d) / d; o.x += dx * p; o.z += dz * p; }
      else { // centre inside box: push out along the shallowest axis
        const l = o.x - c.x0, r = c.x1 - o.x, t = o.z - c.z0, b = c.z1 - o.z, m = Math.min(l, r, t, b);
        if (m === l) o.x = c.x0 - o.r; else if (m === r) o.x = c.x1 + o.r; else if (m === t) o.z = c.z0 - o.r; else o.z = c.z1 + o.r;
      }
    }
  }
}
function lineBlocked(x0, z0, x1, z1) { // is there a solid collider between two points? (for flash/suck line of sight)
  const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.3);
  for (let i = 1; i < n; i++) { const x = lerp(x0, x1, i / n), z = lerp(z0, z1, i / n); if (Math.hypot(x1 - x, z1 - z) < 0.9) break; for (const c of COL) if (c.on && !c.goo && x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return true; }
  return false;
}

/* pickups */
const PMESH = {};
function spawnPickup(type, x, z, id, vel = true) {
  if (type === 'gem' && SAVE.gems.includes(id)) return;
  let m; if (type === 'coin') { m = CYL(0.22, 0.22, 0.06, MAT.gold, 16); m.rotation.x = Math.PI / 2; }
  else if (type === 'bill') m = BOX(0.5, 0.04, 0.26, std(0x6ad06a, { emissive: 0x1a4a1a }));
  else if (type === 'bag') { m = new THREE.Group(); const s = SPH(0.4, std(0xc8a060)); s.scale.y = 0.9; m.add(s); const t = SPH(0.15, std(0xc8a060)); t.position.y = 0.4; m.add(t); }
  else if (type === 'heart') { m = new THREE.Group(); const hm = std(0xff4a7a, { emissive: 0x8a1030 }); for (const s of [-1, 1]) { const b = SPH(0.2, hm); b.position.set(0.14 * s, 0.1, 0); m.add(b); } const c = new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.4, 16), hm); c.rotation.z = Math.PI; c.position.y = -0.14; m.add(c); }
  else if (type === 'gem') m = makeGemMesh([0xff4a8a, 0x4affd0, 0xb04aff][['g1', 'g2', 'g3'].indexOf(id)] || 0xffffff);
  else if (type === 'button') { m = new THREE.Group(); const b = CYL(0.5, 0.55, 0.25, MAT.gold, 24); b.rotation.x = Math.PI / 2; m.add(b); const t = SPH(0.3, std(0xff4a4a, { emissive: 0xaa2020 })); t.scale.z = 0.5; t.position.z = 0.15; m.add(t); }
  scene.add(m);
  const p = { type, id, x, z, y: 0.6, vx: vel ? rnd(-2.5, 2.5) : 0, vy: vel ? rnd(3, 6) : 0, vz: vel ? rnd(-2.5, 2.5) : 0, m, age: 0, val: { coin: 5, bill: 20, bag: 100 }[type] || 0 };
  if (type === 'gem' || type === 'button') { p.vx = p.vz = 0; p.vy = 5; }
  PICK.push(p); return p;
}
function spawnMoney(x, z, type, n) { for (let i = 0; i < n; i++) spawnPickup(type, x, z); }
function updPickups(dt) {
  const B = activeBody();
  for (let i = PICK.length - 1; i >= 0; i--) {
    const p = PICK[i]; p.age += dt;
    p.vy -= 16 * dt; p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
    if (p.y < 0.35) { p.y = 0.35; p.vy = Math.abs(p.vy) > 1.5 ? -p.vy * 0.4 : 0; p.vx *= 0.8; p.vz *= 0.8; }
    const o = { x: p.x, z: p.z, r: 0.25 }; collide(o, false); p.x = o.x; p.z = o.z;
    // suction pulls pickups toward the nozzle
    if (TOOL.sucking && p.age > 0.3) { const dx = HERO.ax - p.x, dz = HERO.az - p.z, d = Math.hypot(dx, dz); if (d < 7 && inCone(p.x, p.z, 0.6, 7)) { p.vx = dx / d * 12; p.vz = dz / d * 12; p.vy = 1; if (Math.random() < 0.3) emit(p.x, p.y, p.z, 0, 0, 0, '#fff6a0', 0.2); } }
    if (TOOL.blowing && p.type !== 'gem' && p.type !== 'button' && inCone(p.x, p.z, 0.5, 6)) { p.vx += Math.cos(HERO.aimA) * 12 * dt; p.vz += Math.sin(HERO.aimA) * 12 * dt; }
    const d = Math.hypot(B.x - p.x, B.z - p.z);
    if (d < 1.4 && p.age > 0.35 && !(p.type === 'heart' && B.goo)) { p.vx += (B.x - p.x) * 20 * dt; p.vz += (B.z - p.z) * 20 * dt; }
    if (d < 0.7 && p.age > 0.35) { collect(p); scene.remove(p.m); PICK.splice(i, 1); continue; }
    p.m.position.set(p.x, p.y + (p.type === 'gem' || p.type === 'button' ? 0.5 + Math.sin(GAME.t * 3) * 0.15 : 0), p.z); p.m.rotation.y += dt * 3;
    if ((p.type === 'gem' || p.type === 'button') && Math.random() < 0.2) emit(p.x + rnd(-0.4, 0.4), p.y + 0.6, p.z + rnd(-0.4, 0.4), 0, 1, 0, '#ffffff', 0.5);
  }
}
function collect(p) {
  if (p.val) { SAVE.money += p.val; STATS.moneyTotal += p.val; SFX.coin(); emit(p.x, 1, p.z, 0, 3, 0, '#ffe060', 0.4); }
  else if (p.type === 'heart') { HERO.hp = Math.min(SAVE.maxHp, HERO.hp + 25); SFX.gem(); toast('+25 health', 1.2); SAVE.flags['hb30'] = true; }
  else if (p.type === 'gem') { if (!SAVE.gems.includes(p.id)) SAVE.gems.push(p.id); SFX.gem(); toast(`💎 Gem found! ${SAVE.gems.length}/3`, 2.5); burstFx(p.x, 1, p.z, 40, '#ffffff', 5); }
  else if (p.type === 'button') { SAVE.button = true; SFX.solve(); SFX.gem(); toast('🛗 Elevator Button get! Take it to the elevator in the Grand Lobby.', 4); burstFx(p.x, 1, p.z, 60, '#ffd040', 6); }
  writeSave();
}

/* ghosts */
const GDEF = { mini: { hp: 30, spd: 1.5, dmg: 6 }, goob: { hp: 60, spd: 2.2, dmg: 10 }, tough: { hp: 110, spd: 2.8, dmg: 16 }, peeker: { hp: 40, spd: 3.2, dmg: 0 } };
function spawnGhost(def) {
  const d = GDEF[def.kind]; const m = makeGhost(def.kind); scene.add(m);
  const g = { kind: def.kind, x: def.x, z: def.z, y: 1, hp: d.hp, max: d.hp, spd: d.spd, dmg: d.dmg, room: def.room, st: def.kind === 'peeker' ? 'hidden' : 'idle', t: rnd(0, 2), m, face: 0, stun: 0, shades: def.kind === 'tough', cd: 1, reveal: 0, vx: 0, vz: 0, home: { x: def.x, z: def.z } };
  if (g.kind === 'peeker') m.visible = false;
  GHOSTS.push(g); return g;
}
function ghostHitBody(g, dmg) {
  const B = activeBody(); if (B.inv > 0) return;
  if (B.goo) { toast('Gloopel splatted! Back to Wendel.', 2); burstFx(B.x, 1, B.z, 30, '#4aff7a', 5, 0.7, 8); setGoo(false); return; }
  hurt(dmg, g.x, g.z);
}
function hurt(dmg, fx, fz) {
  if (HERO.inv > 0 || GAME.ending) return; HERO.hp -= dmg; HERO.inv = 1.2; SFX.hurt(); shake(0.4);
  const dx = HERO.x - fx, dz = HERO.z - fz, d = Math.hypot(dx, dz) || 1; HERO.vx = dx / d * 8; HERO.vz = dz / d * 8;
  if (TOOL.caught && TOOL.caught !== BOSS.g) releaseCatch();
  if (HERO.hp <= 0) faint();
}
function updGhost(g, dt) {
  const B = activeBody(); const dx = B.x - g.x, dz = B.z - g.z, dist = Math.hypot(dx, dz); const inRoom = GAME.room && GAME.room.id === g.room;
  g.t += dt; g.cd -= dt; const u = g.m.userData;
  if (g.st === 'caught') return;  // handled by vacuum code
  if (g.st === 'captured') { g.cap -= dt; const s = Math.max(0.01, g.cap / 0.5); g.m.scale.setScalar(s); g.x = lerp(g.x, HERO.ax, dt * 8); g.z = lerp(g.z, HERO.az, dt * 8); g.y = lerp(g.y, 1, dt * 8); if (g.cap <= 0) { scene.remove(g.m); g.dead = true; } return; }
  if (g.st === 'hidden') { // peeker: invisible; faint shimmer and giggle hint when close
    g.m.visible = false; g.x = g.home.x + Math.sin(g.t * 0.7) * 1.5; g.z = g.home.z + Math.cos(g.t * 0.5) * 1.5;
    if (inRoom && dist < 6 && Math.random() < dt * 0.6) { SFX.laugh(); for (let i = 0; i < 6; i++) emit(g.x + rnd(-.5, .5), 1.2 + rnd(0, 1), g.z + rnd(-.5, .5), 0, 0.5, 0, '#c48aff', 0.6); if (!SAVE.seen.peekTip) { SAVE.seen.peekTip = 1; toast('Giggling from nowhere? A hidden Peeker! Try DARK-LIGHT (R / Y).', 4); } }
    return;
  }
  if (g.kind === 'peeker') { g.reveal -= dt; if (g.reveal <= 0 && g.st !== 'stunned') { g.st = 'hidden'; SFX.boo(); return; } }
  if (g.st === 'stunned') { g.stun -= dt; u.body.rotation.z = Math.sin(g.t * 12) * 0.15; if (Math.random() < dt * 6) emit(g.x + rnd(-.5, .5), g.y + 1.2, g.z + rnd(-.5, .5), 0, 1, 0, '#fff6a0', 0.4); if (g.stun <= 0) { g.st = 'chase'; u.body.rotation.z = 0; } }
  else if (g.st === 'windup') { u.body.position.y = 0.3; u.body.rotation.x = -0.4; if (g.t > 0.6) { g.st = 'lunge'; g.t = 0; const d = dist || 1; g.vx = dx / d * 9; g.vz = dz / d * 9; } }
  else if (g.st === 'lunge') { u.body.rotation.x = 0.4; g.x += g.vx * dt; g.z += g.vz * dt; if (dist < 1.3) { ghostHitBody(g, g.dmg); g.st = 'chase'; g.cd = 2; } if (g.t > 0.35) { g.st = 'chase'; g.cd = 1.6; } }
  else if (!inRoom) { g.x = lerp(g.x, g.home.x, dt * 0.5); g.z = lerp(g.z, g.home.z, dt * 0.5); }
  else if (g.kind === 'peeker') { // flee from the light
    const d = dist || 1; g.x -= dx / d * g.spd * dt; g.z -= dz / d * g.spd * dt;
  } else {
    // chase with a wobbly orbit; mini ghosts are lazy (tutorial)
    const d = dist || 1; const want = g.kind === 'mini' ? 3 : 1.2; const sp = g.spd * (dist > want ? 1 : -0.3);
    const side = Math.sin(g.t * 1.3 + g.home.x) * 0.7; g.x += (dx / d * sp + -dz / d * side) * dt; g.z += (dz / d * sp + dx / d * side) * dt;
    if (dist < 2.2 && g.cd <= 0 && g.kind !== 'mini') { g.st = 'windup'; g.t = 0; SFX.boo(); }
    if (g.kind === 'mini' && dist < 1.4 && g.cd <= 0) { ghostHitBody(g, g.dmg); g.cd = 2.5; }
  }
  if (g.st !== 'windup' && g.st !== 'lunge') { u.body.rotation.x = lerp(u.body.rotation.x, 0, dt * 5); u.body.position.y = 0; }
  g.x += g.vx * (g.st === 'lunge' ? 0 : dt); g.z += g.vz * (g.st === 'lunge' ? 0 : dt); g.vx *= Math.pow(0.02, dt); g.vz *= Math.pow(0.02, dt);
  const o = { x: g.x, z: g.z, r: 0.6 }; collide(o, false); g.x = o.x; g.z = o.z;
  const rm = ROOMS.find(r => r.id === g.room); if (rm) { g.x = clamp(g.x, rm.x0 + 0.8, rm.x1 - 0.8); g.z = clamp(g.z, rm.z0 + 0.8, rm.z1 - 0.8); }
  g.face = Math.atan2(dx, dz);
}
function drawGhost(g, dt) {
  if (g.dead) return; const u = g.m.userData;
  g.y = (g.st === 'stunned' ? 0.7 : 1.0) + Math.sin(g.t * 2.5) * 0.15;
  g.m.position.set(g.x, g.y, g.z); u.sh.position.y = -g.y + 0.02; u.sh.material.opacity = 0.3;
  g.m.rotation.y = lerp(g.m.rotation.y, g.face + angDiff(g.face, g.face), 1); g.m.rotation.y = g.face;
  if (g.kind !== 'peeker') g.m.visible = true; else g.m.visible = g.st !== 'hidden';
  u.glow.visible = OPT.glow;
  if (u.shades) u.shades.visible = g.shades;
  if (g.kind === 'peeker' && g.m.visible) u.mat.opacity = clamp(g.reveal / 1.5, 0.35, 0.92);
}

/* ---------- 7. tools ---------- */
function inCone(x, z, half, range) {
  const dx = x - HERO.ax, dz = z - HERO.az, d = Math.hypot(dx, dz); if (d > range) return false; if (d < 0.9) return true;
  return Math.abs(angDiff(HERO.aimA, Math.atan2(dz, dx))) < half;
}
function shake(a) { if (OPT.shake) GAME.shake = Math.max(GAME.shake, a); }
function stunGhost(g, t) { if (g.st === 'caught' || g.st === 'captured' || g.dead) return false; g.st = 'stunned'; g.stun = t; SFX.stun(); return true; }
function doFlash(power) {
  const B = activeBody(); STATS.flashes++; TOOL.flashT = 0.25 + power * 0.2; SFX.flash(power); shake(0.1);
  const range = 8 + power * 4, half = 0.5 + power * 0.35; let hit = 0;
  for (const g of GHOSTS) {
    if (g.dead || g.st === 'hidden') continue;
    if (!inCone(g.x, g.z, half, range) || lineBlocked(HERO.ax, HERO.az, g.x, g.z)) continue;
    if (g.shades) { toast('Those shades block the flash! BLOW or BURST them off.', 2.5); continue; }
    if (stunGhost(g, 3 + power * 1.5)) hit++;
  }
  if (BOSS.g && !BOSS.g.dead) bossFlash(power, range, half);
  for (const p of PROPS) if (p.onFlash && inCone(p.x, p.z, half + 0.2, range + 1) && !lineBlocked(HERO.ax, HERO.az, p.x, p.z)) p.onFlash(power);
  for (let i = 0; i < 40; i++) { const a = HERO.aimA + rnd(-half, half), s = rnd(4, 14); emit(HERO.ax, 1.2, HERO.az, Math.cos(a) * s, rnd(-1, 1), Math.sin(a) * s, '#fff8c0', 0.3); }
}
function releaseCatch() { const g = TOOL.caught; if (!g) return; if (g.isBoss) bossRelease(); else { g.st = 'chase'; g.cd = 1; } TOOL.caught = null; TOOL.meter = 0; }
function captureGhost(g) {
  TOOL.caught = null; TOOL.meter = 0; g.st = 'captured'; g.cap = 0.5; SFX.capture(); shake(0.25);
  burstFx(g.x, g.y, g.z, 50, '#7dffb0', 6, 0.8); spawnMoney(g.x, g.z, 'coin', g.kind === 'tough' ? 10 : 5); spawnMoney(g.x, g.z, 'bill', g.kind === 'tough' ? 3 : 1);
  if (g.kind === 'peeker') { STATS.peekers++; spawnMoney(g.x, g.z, 'bag', 1); toast('Peeker caught! 👻', 2); }
  else if (g.kind === 'tough') STATS.tough++; STATS.ghosts++;
  if (Math.random() < 0.3) spawnPickup('heart', g.x, g.z);
}
function doSlam() {
  const g = TOOL.caught; if (!g || TOOL.meter < 0.5 || TOOL.slamT > 0) return;
  TOOL.meter -= 0.5; TOOL.slamT = 0.42; TOOL.slamFrom = { x: g.x, z: g.z }; STATS.slams++;
  // slam lands on the opposite side of the hero
  const dx = g.x - HERO.ax, dz = g.z - HERO.az, d = Math.hypot(dx, dz) || 1; TOOL.slamTo = { x: HERO.x - dx / d * 2.4, z: HERO.z - dz / d * 2.4 };
  const o = { x: TOOL.slamTo.x, z: TOOL.slamTo.z, r: 0.6 }; collide(o, false); TOOL.slamTo.x = o.x; TOOL.slamTo.z = o.z;
}
function slamImpact(g) {
  SFX.slam(); shake(0.6); const x = g.x, z = g.z; burstFx(x, 0.3, z, 40, '#ffd080', 7, 0.6, 10);
  for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; emit(x, 0.2, z, Math.cos(a) * 8, 0.5, Math.sin(a) * 8, '#ffffff', 0.35); }
  const dmg = g.isBoss ? 18 : 22; g.hp -= dmg; floatNum(x, z, dmg);
  for (const o of GHOSTS) if (o !== g && !o.dead && o.st !== 'hidden' && Math.hypot(o.x - x, o.z - z) < 4.5) { o.hp -= 10; o.shades = false; stunGhost(o, 3); if (o.hp <= 0) captureGhost(o); }
  for (const p of PROPS) if (p.onSlam && !p.done && Math.hypot(p.x - x, p.z - z) < 3) p.onSlam();
}
function floatNum(x, z, n) { for (let i = 0; i < Math.min(12, n); i++) emit(x + rnd(-.3, .3), 1.8, z + rnd(-.3, .3), rnd(-1, 1), 3, rnd(-1, 1), '#ff9d3c', 0.6, 4); }
function doBurst() {
  TOOL.burstCd = 1.2; STATS.bursts++; SFX.burst(); shake(0.4); const B = activeBody(); B.vy = 6.5;
  for (let i = 0; i < 60; i++) { const a = i / 60 * TAU; emit(B.x, 0.4, B.z, Math.cos(a) * 10, 0.6, Math.sin(a) * 10, '#bfe8ff', 0.45); }
  for (const g of GHOSTS) { if (g.dead || g.st === 'hidden' || g.st === 'caught') continue; const dx = g.x - B.x, dz = g.z - B.z, d = Math.hypot(dx, dz); if (d < 5) { g.vx = dx / (d || 1) * 12; g.vz = dz / (d || 1) * 12; if (g.shades) { g.shades = false; toast('Shades blown off! Now FLASH it!', 2); } if (g.st === 'windup' || g.st === 'lunge') g.st = 'chase'; stunGhost(g, 1.0); } }
  if (BOSS.g && !BOSS.g.dead) { const b = BOSS.g, d = Math.hypot(b.x - B.x, b.z - B.z); if (d < 5.5 && b.st === 'charge') { b.st = 'float'; b.t = 0; } }
  for (const p of PROPS) if (p.onBurst && !p.done && Math.hypot(p.x - B.x, p.z - B.z) < 4.8) p.onBurst();
  for (const p of PICK) { const dx = p.x - B.x, dz = p.z - B.z, d = Math.hypot(dx, dz); if (d < 5) { p.vx += dx / (d || 1) * 6; p.vz += dz / (d || 1) * 6; p.vy = 4; } }
}
// plunger: a suction-cup on a rope. Fires along the aim; sticks to plungeable things; then hold SUCK to yank.
function firePlunger() {
  if (TOOL.plunger) { dropPlunger(); return; }
  STATS.plungers++;
  const m = new THREE.Group(); const cup = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.25, 16, 1, true), std(0xff4a6a, { side: THREE.DoubleSide })); cup.rotation.z = -Math.PI / 2; m.add(cup); const stick = CYL(0.04, 0.04, 0.5, MAT.wood); stick.rotation.z = Math.PI / 2; stick.position.x = -0.3; m.add(stick); scene.add(m);
  const rope = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xffe0a0 })); scene.add(rope);
  TOOL.plunger = { m, rope, x: HERO.ax, z: HERO.az, y: 1.2, vx: Math.cos(HERO.aimA) * 24, vz: Math.sin(HERO.aimA) * 24, st: 'fly', t: 0, target: null, pull: 0 };
  SFX.pop();
}
function dropPlunger() { const P = TOOL.plunger; if (!P) return; scene.remove(P.m); scene.remove(P.rope); TOOL.plunger = null; }
function updPlunger(dt) {
  const P = TOOL.plunger; if (!P) return; P.t += dt;
  if (P.st === 'fly') {
    const steps = 4; for (let s = 0; s < steps && P.st === 'fly'; s++) {
      P.x += P.vx * dt / steps; P.z += P.vz * dt / steps;
      // plungeable props
      for (const p of PROPS) if (p.plungeable && !p.done && Math.hypot(P.x - p.x, P.z - p.z) < 1.8) { P.st = 'stuck'; P.target = p; SFX.thunk(); toast('Stuck! Now hold SUCK to pull!', 1.5); }
      // the boss's tray
      const b = BOSS.g; if (P.st === 'fly' && b && !b.dead && b.tray && Math.hypot(P.x - b.trayX, P.z - b.trayZ) < 1.6) { P.st = 'stuck'; P.target = 'tray'; SFX.thunk(); toast('Plunger on the tray! Hold SUCK and pull away!', 2); }
      if (P.st === 'fly') for (const c of COL) if (c.on && !c.goo && P.x > c.x0 && P.x < c.x1 && P.z > c.z0 && P.z < c.z1) { P.st = 'wall'; P.t = 0; SFX.thunk(); break; }
    }
    if (P.t > 0.6 && P.st === 'fly') { P.st = 'wall'; P.t = 0; }
  } else if (P.st === 'wall') { if (P.t > 0.8) { dropPlunger(); return; } }
  else if (P.st === 'stuck') {
    if (P.target === 'tray') { const b = BOSS.g; if (!b || !b.tray) { dropPlunger(); return; } P.x = b.trayX; P.z = b.trayZ; }
    if (TOOL.sucking) {
      // pull harder by walking away from the target
      const dx = HERO.x - P.x, dz = HERO.z - P.z, d = Math.hypot(dx, dz) || 1; const away = (MOVE.x * dx + MOVE.z * dz) / d;
      P.pull += dt * (0.8 + Math.max(0, away) * 1.4); HERO.vx -= dx / d * 3 * dt; HERO.vz -= dz / d * 3 * dt; shake(0.05);
      if (P.pull >= 1) { if (P.target === 'tray') bossTrayYank(); else P.target.onPull(); dropPlunger(); return; }
    } else P.pull = Math.max(0, P.pull - dt * 0.5);
    if (Math.hypot(HERO.x - P.x, HERO.z - P.z) > 16 || P.t > 12) { dropPlunger(); return; }
  }
  P.m.position.set(P.x, P.y, P.z); P.m.rotation.y = -Math.atan2(P.vz, P.vx);
  const a = P.rope.geometry.attributes.position; a.setXYZ(0, HERO.ax, 1.1, HERO.az); a.setXYZ(1, P.x, P.y, P.z); a.needsUpdate = true;
  P.rope.material.color.set(P.st === 'stuck' && TOOL.sucking ? 0xff9d3c : 0xffe0a0);
}
function setGoo(on) {
  if (on === GOO.on) return;
  if (on) {
    if (TOOL.caught) releaseCatch(); dropPlunger();
    GOO.on = true; GOOB.x = HERO.x + Math.cos(HERO.aimA) * 1.2; GOOB.z = HERO.z + Math.sin(HERO.aimA) * 1.2; GOOB.aimA = HERO.aimA; GOOB.vx = GOOB.vz = 0;
    const o = { x: GOOB.x, z: GOOB.z, r: 0.45 }; collide(o, true); GOOB.x = o.x; GOOB.z = o.z;
    GOOB.mesh.visible = true; SFX.goo(); burstFx(GOOB.x, 1, GOOB.z, 30, '#4aff7a', 4);
    if (!SAVE.seen.goo) { SAVE.seen.goo = 1; toast('You\'re Gloopel! Goo slips through bars. Press GOO again to swap back.', 3.5); }
  } else { GOO.on = false; GOOB.mesh.visible = false; SFX.goo(); burstFx(GOOB.x, 1, GOOB.z, 30, '#4aff7a', 4); }
}

/* the vacuum each frame: suck, blow, catch, pull and drain */
function updVacuum(dt, suck, blow) {
  const B = activeBody();
  TOOL.sucking = suck && !blow; TOOL.blowing = blow && !suck;
  if (suck && blow && TOOL.burstCd <= 0) doBurst();
  TOOL.burstCd -= dt;
  const vacOn = TOOL.sucking || TOOL.blowing;
  if (AU.vacG) { AU.vacG.gain.value = lerp(AU.vacG.gain.value, vacOn ? (TOOL.caught ? 0.5 : 0.3) : 0, dt * 10); AU.vacF.frequency.value = TOOL.blowing ? 1500 : 800 + (TOOL.caught ? 300 * Math.sin(GAME.t * 20) : 0); }
  // stream particles
  if (vacOn) {
    for (let i = 0; i < 4; i++) {
      const a = HERO.aimA + rnd(-0.4, 0.4), d = rnd(1, 6), x = HERO.ax + Math.cos(a) * d, z = HERO.az + Math.sin(a) * d;
      if (TOOL.sucking) emit(x, 1 + rnd(-.4, .4), z, (HERO.ax - x) * 2.5, 0, (HERO.az - z) * 2.5, B.goo ? '#7dff9a' : '#bfe8ff', 0.4);
      else emit(HERO.ax, 1.1, HERO.az, Math.cos(a) * 12, rnd(-.5, .5), Math.sin(a) * 12, '#ffffff', 0.4);
    }
  }
  // props
  for (const p of PROPS) {
    if (p.done && !p.onBlow) continue;
    const hp = p.hitPoint ? p.hitPoint() : p;
    if (TOOL.sucking && p.onSuck && inCone(hp.x, hp.z, 0.5, p.range || (p.small ? 4.5 : 3.5))) p.onSuck(dt);
    if (TOOL.blowing && p.onBlow && inCone(hp.x, hp.z, 0.5, 6)) p.onBlow(dt);
  }
  // blow pushes ghosts and pops off shades
  if (TOOL.blowing) for (const g of GHOSTS) {
    if (g.dead || g.st === 'hidden' || g.st === 'caught') continue;
    if (inCone(g.x, g.z, 0.5, 6)) { g.vx += Math.cos(HERO.aimA) * 14 * dt; g.vz += Math.sin(HERO.aimA) * 14 * dt; if (g.shades) { g.shT = (g.shT || 0) + dt; if (g.shT > 0.8) { g.shades = false; SFX.pop(); toast('Shades blown off! Now FLASH it!', 2); burstFx(g.x, 1.6, g.z, 10, '#333344', 3, 0.5, 8); } } }
  }
  // catching
  if (TOOL.sucking && !TOOL.caught) {
    const half = OPT.assist ? 0.6 : 0.45;
    for (const g of GHOSTS) {
      if (g.dead) continue;
      const ok = g.st === 'stunned' || (g.kind === 'peeker' && g.st !== 'hidden');
      if (ok && inCone(g.x, g.z, half, 6.5) && !lineBlocked(HERO.ax, HERO.az, g.x, g.z)) { TOOL.caught = g; g.st = 'caught'; g.fd = Math.atan2(g.z - HERO.z, g.x - HERO.x); g.fdT = 0; TOOL.meter = 0; SFX.boo(); break; }
    }
    if (!TOOL.caught && BOSS.g && !BOSS.g.dead && BOSS.g.st === 'stunned' && inCone(BOSS.g.x, BOSS.g.z, half + 0.1, 7.5)) { TOOL.caught = BOSS.g; BOSS.g.st = 'caught'; BOSS.g.fd = Math.atan2(BOSS.g.z - HERO.z, BOSS.g.x - HERO.x); BOSS.g.fdT = 0; TOOL.meter = 0; SFX.boo(); }
  }
  if (TOOL.caught && !TOOL.sucking && TOOL.slamT <= 0) releaseCatch();
  const g = TOOL.caught; $('pullMeter').style.display = g ? 'block' : 'none';
  if (!g) return;
  // the caught ghost tugs in a direction; holding the move stick the other way drains it faster
  g.fdT -= dt; if (g.fdT <= 0) { const base = Math.atan2(g.z - HERO.z, g.x - HERO.x); g.fd = base + rnd(-1.4, 1.4); g.fdT = rnd(1.0, 1.8); SFX.tick(); }
  const fx = Math.cos(g.fd), fz = Math.sin(g.fd);
  if (TOOL.slamT > 0) {
    TOOL.slamT -= dt; const k = 1 - TOOL.slamT / 0.42; g.x = lerp(TOOL.slamFrom.x, TOOL.slamTo.x, k); g.z = lerp(TOOL.slamFrom.z, TOOL.slamTo.z, k); g.y = 0.5 + Math.sin(k * Math.PI) * 4;
    if (TOOL.slamT <= 0) { g.y = 0.4; slamImpact(g); if (g.hp <= 0) { if (g.isBoss) bossDefeat(); else captureGhost(g); return; } }
  } else {
    const spd = g.isBoss ? 3.6 : 3; g.x += fx * spd * dt; g.z += fz * spd * dt;
    const dx = g.x - HERO.ax, dz = g.z - HERO.az, d = Math.hypot(dx, dz), maxD = g.isBoss ? 5.5 : 4.5;
    if (d > maxD) { g.x = HERO.ax + dx / d * maxD; g.z = HERO.az + dz / d * maxD; }
    if (d < 1.8) { g.x = HERO.ax + dx / (d || 1) * 1.8; g.z = HERO.az + dz / (d || 1) * 1.8; }
    const o = { x: g.x, z: g.z, r: 0.6 }; collide(o, false); g.x = o.x; g.z = o.z;
    // tug the hero
    const tug = g.isBoss ? 2.4 : 1.4; HERO.vx += fx * tug * dt * 4; HERO.vz += fz * tug * dt * 4;
    const pulling = (MOVE.x * -fx + MOVE.z * -fz) > 0.45;
    const drain = (g.isBoss ? 4 : 9) * (pulling ? 3.2 : 1) * (B.goo ? 0.8 : 1);
    g.hp -= drain * dt; TOOL.meter = Math.min(1, TOOL.meter + dt * (pulling ? 0.75 : 0.12));
    if (Math.random() < 0.5) emit(g.x, g.y, g.z, (HERO.ax - g.x) * 2, 0, (HERO.az - g.z) * 2, pulling ? '#ffe27a' : '#bfe8ff', 0.3);
    $('pullTxt').textContent = pulling ? 'PULLING!' : 'PULL the other way!';
    $('pullTxt').style.color = pulling ? '#7dff9a' : '#ffe27a';
    g.y = 1 + Math.sin(GAME.t * 8) * 0.2;
    g.m.userData.body.rotation.z = Math.sin(GAME.t * 25) * 0.2;
    if (g.isBoss) bossCaughtTick(dt);
    if (g.hp <= 0 && !g.dead) { if (g.isBoss) bossDefeat(); else captureGhost(g); }
  }
  if (TOOL.caught) { $('pullFill').style.width = (TOOL.meter * 100) + '%'; $('slamTxt').style.visibility = TOOL.meter >= 0.5 ? 'visible' : 'hidden'; g.face = Math.atan2(HERO.x - g.x, HERO.z - g.z); }
}

/* ---------- boss: Baron Bellhop ----------
   Pattern: floats behind a silver serving tray that blocks the flash, throws suitcases (more each phase),
   and charges across the ballroom. Weakness: PLUNGER the tray and SUCK to yank it away (or make him
   charge into a pillar). Then FLASH, SUCK, PULL and SLAM. 3 phases: each lost 1/3 of HP he grabs a new tray. */
function bossSpawn() {
  const F = GAME.floor.boss; const m = makeBoss(); scene.add(m);
  BOSS.g = { isBoss: true, x: F.x, z: F.z, y: 1, hp: 300, max: 300, st: 'intro', t: 0, tray: true, trayX: F.x, trayZ: F.z, phase: 1, m, face: Math.PI, vx: 0, vz: 0, cd: 2, dead: false, stun: 0 };
  BOSS.locked = true; AU.mood = 'boss'; $('bossBar').style.display = 'block';
  toast('Baron Bellhop: "Checking out so soon? I think NOT!"', 3.5); SFX.laugh();
}
function bossReset() {
  if (BOSS.g) { scene.remove(BOSS.g.m); BOSS.g = null; } SHOTS.forEach(s => scene.remove(s.m)); SHOTS = [];
  BOSS.locked = false; AU.mood = 'calm'; $('bossBar').style.display = 'none';
}
function bossFlash(power, range, half) {
  const b = BOSS.g; if (b.st === 'caught' || b.st === 'stunned' || b.st === 'intro') return;
  if (!inCone(b.x, b.z, half, range + 2)) return;
  if (b.tray) { SFX.thunk(); toast(b.phase === 1 && !SAVE.seen.trayTip ? 'The tray blocks the flash! PLUNGER the tray (E / B), then SUCK to yank it.' : 'Blocked by the tray!', 2.5); SAVE.seen.trayTip = 1; burstFx(b.trayX, 1.4, b.trayZ, 15, '#ffffff', 3); return; }
  b.st = 'stunned'; b.stun = 3 + power; SFX.stun(); toast('Stunned! SUCK him up!', 1.5);
}
function bossTrayYank() {
  const b = BOSS.g; if (!b || !b.tray) return; b.tray = false; b.m.userData.tray.visible = false; b.st = 'dazed'; b.t = 0; SFX.door(); shake(0.5);
  burstFx(b.trayX, 1.4, b.trayZ, 40, '#e0e8ff', 6); toast('Tray yanked away! Quick, FLASH him!', 2.5);
  const tr = b.m.userData.tray.clone(); scene.add(tr); tr.position.set(b.trayX, 1.4, b.trayZ); SHOTS.push({ m: tr, x: b.trayX, z: b.trayZ, y: 1.4, vx: (HERO.x - b.x) * 0.6, vz: (HERO.z - b.z) * 0.6, vy: 5, deco: true, t: 0 });
}
function bossRelease() { const b = BOSS.g; if (!b) return; b.st = 'float'; b.t = 0; b.cd = 1.5; }
function bossCaughtTick(dt) {
  const b = BOSS.g; const thr = b.max * (3 - b.phase) / 3;
  if (b.hp <= thr && b.phase < 3 && b.hp > 0) { // breaks free, new phase
    b.phase++; TOOL.caught = null; TOOL.meter = 0; b.st = 'rage'; b.t = 0; b.tray = true; b.m.userData.tray.visible = true; SFX.laugh(); shake(0.6);
    const d = Math.hypot(HERO.x - b.x, HERO.z - b.z) || 1; HERO.vx = (HERO.x - b.x) / d * 10; HERO.vz = (HERO.z - b.z) / d * 10;
    toast(b.phase === 2 ? 'Baron Bellhop: "Room service! Have some LUGGAGE!"' : 'Baron Bellhop: "Final call! No tipping!"', 3);
  }
}
function bossDefeat() {
  const b = BOSS.g; b.dead = true; TOOL.caught = null; TOOL.meter = 0; SFX.capture(); shake(0.8); STATS.bossWins++; STATS.ghosts++;
  burstFx(b.x, 1.5, b.z, 120, '#c48aff', 8, 1.2); scene.remove(b.m); $('pullMeter').style.display = 'none';
  spawnMoney(b.x, b.z, 'bag', 3); spawnMoney(b.x, b.z, 'bill', 6); spawnPickup('heart', b.x, b.z);
  if (!SAVE.button) spawnPickup('button', b.x, b.z);
  SAVE.flags.bossDown = true; writeSave(); BOSS.locked = false; AU.mood = 'calm'; $('bossBar').style.display = 'none';
  toast('Baron Bellhop captured! He dropped the Elevator Button!', 4);
}
function throwCase(b) {
  const m = BOX(0.9, 0.6, 0.35, std([0x8a4a2a, 0x3a6a8a, 0x8a2a4a][Math.random() * 3 | 0])); scene.add(m);
  const tx = HERO.x + rnd(-2.5, 2.5) * (b.phase > 1 ? 1 : 0.4), tz = HERO.z + rnd(-2.5, 2.5) * (b.phase > 1 ? 1 : 0.4), T = 1.1;
  const mark = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.75, 24), new THREE.MeshBasicMaterial({ color: 0xff6a6a, transparent: true, opacity: 0.7, depthWrite: false })); mark.rotation.x = -Math.PI / 2; mark.position.set(tx, 0.04, tz); scene.add(mark);
  SHOTS.push({ m, mark, x: b.x, z: b.z, y: 2.5, vx: (tx - b.x) / T, vz: (tz - b.z) / T, vy: 8, g: (2.5 + 8 * T) * 2 / (T * T), t: 0, T });
}
function updShots(dt) {
  for (let i = SHOTS.length - 1; i >= 0; i--) {
    const s = SHOTS[i]; s.t += dt; s.x += s.vx * dt; s.z += s.vz * dt; s.vy -= (s.g || 16) * dt; s.y += s.vy * dt; s.m.position.set(s.x, s.y, s.z); s.m.rotation.x += dt * 6;
    if (s.y <= 0.3) {
      if (!s.deco) { burstFx(s.x, 0.3, s.z, 15, '#d0b090', 3, 0.5, 8); SFX.thunk(); if (Math.hypot(HERO.x - s.x, HERO.z - s.z) < 1.3 && !GOO.on) hurt(12, s.x, s.z); if (GOO.on && Math.hypot(GOOB.x - s.x, GOOB.z - s.z) < 1.3) setGoo(false); }
      scene.remove(s.m); if (s.mark) scene.remove(s.mark); SHOTS.splice(i, 1);
    } else if (s.mark) s.mark.scale.setScalar(0.6 + s.t / s.T * 0.6);
  }
}
function updBoss(dt) {
  const b = BOSS.g; if (!b || b.dead) return; b.t += dt; const u = b.m.userData; const B = activeBody();
  const dx = B.x - b.x, dz = B.z - b.z, dist = Math.hypot(dx, dz) || 1; const R = ROOMS.find(r => r.id === 'ballroom'); const sp = 1 + (b.phase - 1) * 0.25;
  if (b.st !== 'caught') b.face = lerp(b.face, b.face + angDiff(b.face, Math.atan2(dx, dz)), dt * (b.st === 'charge' ? 0.5 : 4));
  switch (b.st) {
    case 'intro': b.y = 1 + Math.sin(b.t * 3) * 0.3; if (b.t > 2) { b.st = 'float'; b.t = 0; } break;
    case 'rage': b.m.rotation.z = Math.sin(b.t * 30) * 0.1; if (b.t > 1.2) { b.m.rotation.z = 0; b.st = 'float'; b.t = 0; b.cd = 1; } break;
    case 'float': {
      const want = 8; const k = dist > want ? 1 : -1; b.x += (dx / dist * k * 2 + -dz / dist * 1.5) * dt * sp; b.z += (dz / dist * k * 2 + dx / dist * 1.5) * dt * sp;
      b.cd -= dt; if (b.cd <= 0) { const r = Math.random(); if (r < 0.55) { b.st = 'throw'; b.t = 0; b.n = 2 + b.phase * 1; } else { b.st = 'aim'; b.t = 0; SFX.boo(); } }
      break; }
    case 'throw': if (b.t > 0.5) { throwCase(b); b.n--; b.t = 0.5 - 0.45 / sp; if (b.n <= 0) { b.st = 'float'; b.cd = 2.6 / sp; } } break;
    case 'aim': b.m.rotation.x = -0.3; if (b.t > 1.0 / sp + 0.2) { b.st = 'charge'; b.t = 0; b.cx = dx / dist; b.cz = dz / dist; b.m.rotation.x = 0.3; SFX.boo(); } break;
    case 'charge': {
      const s2 = 11 * sp; b.x += b.cx * s2 * dt; b.z += b.cz * s2 * dt; if (Math.random() < 0.5) emit(b.x, 1, b.z, 0, 1, 0, '#c48aff', 0.4);
      if (dist < 2.2) { ghostHitBody(b, 18); }
      // crash into a pillar or wall: dazed and the tray clatters away
      let crash = false; for (const p of PROPS) if (p.t === 'pillar' && Math.hypot(p.x - b.x, p.z - b.z) < 1.9) crash = true;
      if (b.x < R.x0 + 2 || b.x > R.x1 - 2 || b.z < R.z0 + 2 || b.z > R.z1 - 2) { if (crash || b.t > 0.4) { b.st = 'float'; b.cd = 1.5; } }
      if (crash) { shake(0.6); SFX.slam(); if (b.tray) { b.tray = false; u.tray.visible = false; burstFx(b.x, 1.5, b.z, 30, '#e0e8ff', 5); toast('BONK! He hit a pillar and dropped the tray! FLASH him!', 2.5); } b.st = 'dazed'; b.t = 0; }
      if (b.t > 1.6) { b.st = 'float'; b.cd = 1.8 / sp; }
      b.m.rotation.x = 0.3; break; }
    case 'dazed': b.m.rotation.x = 0; b.m.rotation.z = Math.sin(b.t * 10) * 0.2; if (Math.random() < dt * 8) emit(b.x + rnd(-1, 1), 4.2, b.z + rnd(-1, 1), 0, 0.5, 0, '#fff6a0', 0.5); if (b.t > 6) { b.m.rotation.z = 0; b.st = 'float'; b.t = 0; b.cd = 1; b.tray = true; u.tray.visible = true; toast('He grabbed another tray!', 1.5); } break;
    case 'stunned': b.stun -= dt; b.m.rotation.z = Math.sin(b.t * 12) * 0.15; if (Math.random() < dt * 8) emit(b.x + rnd(-1, 1), 4.2, b.z + rnd(-1, 1), 0, 0.5, 0, '#fff6a0', 0.5); if (b.stun <= 0) { b.m.rotation.z = 0; b.st = 'dazed'; b.t = 3; } break;
    case 'caught': break;
  }
  if (b.st !== 'aim' && b.st !== 'charge' && b.st !== 'dazed') b.m.rotation.x = lerp(b.m.rotation.x, 0, dt * 4);
  if (b.st !== 'caught') { b.x = clamp(b.x, R.x0 + 1.6, R.x1 - 1.6); b.z = clamp(b.z, R.z0 + 1.6, R.z1 - 1.6); for (const p of PROPS) if (p.t === 'pillar') { const ex = b.x - p.x, ez = b.z - p.z, e = Math.hypot(ex, ez); if (e < 1.8) { b.x = p.x + ex / e * 1.8; b.z = p.z + ez / e * 1.8; } } b.y = lerp(b.y, b.st === 'stunned' || b.st === 'dazed' ? 0.6 : 1.1 + Math.sin(b.t * 2) * 0.2, dt * 5); }
  b.m.position.set(b.x, b.y, b.z); b.m.rotation.y = b.face; u.sh.position.y = -b.y + 0.02;
  b.trayX = b.x + Math.sin(b.face) * 1.7; b.trayZ = b.z + Math.cos(b.face) * 1.7;
  $('bossFill').style.width = Math.max(0, b.hp / b.max * 100) + '%';
}

/* ---------- 8. camera, hero update, HUD, menus, loop ---------- */
const CAM = { yaw: 0, dist: 13, pitch: 0.92, x: 0, z: 0 };
const MOVE = { x: 0, z: 0 };
let WALLMESH = [];
const ray = new THREE.Raycaster(), v2 = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1), hitV = new THREE.Vector3();
let tipT = 0, toastT = 0;
function tip(t) { $('tip').textContent = t; $('tip').classList.add('on'); tipT = 0.25; }
function toast(t, d = 2) { $('tip').textContent = t; $('tip').classList.add('on'); toastT = d; tipT = 0; }

function startGame(fresh) {
  audioInit(); if (fresh) { SAVE = NEWSAVE(); writeSave(); }
  GAME.floor = FLOORS.lobby; buildFloor(GAME.floor);
  WALLMESH = []; world.traverse(o => { if (o.isMesh && o.geometry.parameters && o.geometry.parameters.height === WALLH) { o.material = o.material.clone(); o.material.transparent = true; WALLMESH.push(o); } });
  GHOSTS.forEach(g => scene.remove(g.m)); GHOSTS = []; PICK.forEach(p => scene.remove(p.m)); PICK = []; bossReset(); BOSS.done = !!SAVE.flags.bossDown;
  for (const d of GAME.floor.ghosts) spawnGhost(d);
  if (SAVE.flags.bossDown && !SAVE.button) spawnPickup('button', GAME.floor.boss.x, GAME.floor.boss.z, null, false);
  const S = GAME.floor.start; HERO.x = S.x; HERO.z = S.z; HERO.hp = SAVE.maxHp; HERO.aim = 0; HERO.cp = { x: S.x, z: S.z }; HERO.y = 0;
  setGoo(false); GOOB.mesh.visible = false; dropPlunger(); TOOL.caught = null; DARK.on = false;
  GAME.room = null; GAME.running = true; GAME.paused = false; GAME.ending = false; GAME.time = 0; CAM.x = HERO.x; CAM.z = HERO.z;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  if (!SAVE.seen.intro) { SAVE.seen.intro = 1; writeSave(); setTimeout(() => openTalk(), 400); }
}
function faint() {
  STATS.faints++; saveStats(); GAME.paused = true; releaseCatch(); dropPlunger(); setGoo(false);
  if (BOSS.g && !BOSS.g.dead) bossReset();
  $('dead').classList.add('on');
}
function respawn() { HERO.hp = SAVE.maxHp; HERO.x = HERO.cp.x; HERO.z = HERO.cp.z; HERO.vx = HERO.vz = 0; HERO.inv = 2; GAME.room = null; $('dead').classList.remove('on'); GAME.paused = false; }
function finishFloor() {
  GAME.ending = true; GAME.paused = true; SAVE.cleared = true; writeSave(); if (!STATS.bestTime || GAME.time < STATS.bestTime) STATS.bestTime = GAME.time; saveStats();
  const caught = GHOSTS.filter(g => g.dead).length;
  $('resGrid').innerHTML = [['Time', fmtT(GAME.time)], ['Money', '💰 ' + SAVE.money], ['Gems', `💎 ${SAVE.gems.length}/3`], ['Ghosts caught', `${caught}/${GHOSTS.length} + the Baron`], ['Peekers', `${GHOSTS.filter(g => g.dead && g.kind === 'peeker').length}/2`]].map(r => `<span>${r[0]}</span><b>${r[1]}</b>`).join('');
  $('results').classList.add('on'); SFX.gem();
}
const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function openTalk() {
  GAME.paused = true; const n = ['lamp1', 'lamp2', 'lamp3'].filter(k => SAVE.flags[k]).length;
  let msg;
  if (!SAVE.flags.lab1) { SAVE.flags.lab1 = 1; msg = 'Wendel, my boy! The Hotel Gloaming is full of ghosts, and they\'ve gone and stolen the elevator button! Your Gustmaster pack is ready: FLASH to stun a ghost, SUCK to grab it, pull AGAINST it to drain it, and SLAM it when the meter fills. Practise on the little fellow in here, then head east into the Grand Lobby!'; }
  else if (SAVE.button) msg = 'You got the button! Take it to the elevator on the north wall of the Grand Lobby. Splendid work!';
  else if (n < 3) msg = `The Ballroom doors are sealed by three eye lamps (${n}/3 lit). FLASH each one. I spotted one in the Lobby, one behind a shutter in the Lounge and one buried in the Front Office!`;
  else msg = 'The Ballroom is open! Baron Bellhop hides behind his silver tray. PLUNGER it and pull it away... or trick him into charging into a pillar!';
  $('talkH').textContent = 'Prof. Fizzwick'; $('talkP').textContent = msg;
  const items = [{ id: 'hp', name: '❤ Bigger heart (+25 max health)', cost: 300, ok: SAVE.maxHp < 150, buy: () => { SAVE.maxHp += 25; HERO.hp = SAVE.maxHp; } },
    { id: 'ch', name: '⚡ Quick charger (flash charges 2× faster)', cost: 250, ok: SAVE.charge < 2, buy: () => { SAVE.charge = 2; } },
    { id: 'fill', name: '🩹 Patch up (full health)', cost: 40, ok: HERO.hp < SAVE.maxHp, buy: () => { HERO.hp = SAVE.maxHp; } }];
  const shop = $('shop'); shop.innerHTML = `<h3>Lab shop · 💰 ${SAVE.money}</h3>`;
  for (const it of items) { const b = document.createElement('button'); b.className = 'btn small'; b.textContent = `${it.name} · ${it.cost}`; b.disabled = !it.ok || SAVE.money < it.cost; if (b.disabled) b.style.opacity = 0.5; b.onclick = () => { if (SAVE.money >= it.cost && it.ok) { SAVE.money -= it.cost; it.buy(); writeSave(); SFX.gem(); openTalk(); } }; shop.appendChild(b); }
  $('talk').classList.add('on');
}

function readInputs(dt) {
  const pad = readPad();
  let ix = 0, iy = 0;
  if (K.KeyA || K.ArrowLeft) ix -= 1; if (K.KeyD || K.ArrowRight) ix += 1; if (K.KeyW || K.ArrowUp) iy -= 1; if (K.KeyS || K.ArrowDown) iy += 1;
  if (pad) { ix += pad.lx; iy += pad.ly; } ix += TOUCH.lx; iy += TOUCH.ly;
  const l = Math.hypot(ix, iy); if (l > 1) { ix /= l; iy /= l; }
  const sy = Math.sin(CAM.yaw), cy = Math.cos(CAM.yaw);
  MOVE.x = ix * cy + iy * sy; MOVE.z = -ix * sy + iy * cy;
  // aim
  let ax = 0, ay = 0, aimSrc = null;
  if (pad && Math.hypot(pad.rx, pad.ry) > 0.3) { ax = pad.rx; ay = pad.ry; aimSrc = 'stick'; IN.mouseAim = false; }
  if (Math.hypot(TOUCH.rx, TOUCH.ry) > 0.25) { ax = TOUCH.rx; ay = TOUCH.ry; aimSrc = 'stick'; }
  const inp = {
    suck: !!(MB[0] || K.KeyJ || (pad && pad.rt) || TOUCH.btn.suck),
    blow: !!(MB[2] || K.KeyK || (pad && pad.lt) || TOUCH.btn.blow),
    flash: !!(K.KeyF || K.ShiftLeft || K.ShiftRight || (pad && pad.x) || TOUCH.btn.flash),
    aimSrc, ax: ax * cy + ay * sy, az: -ax * sy + ay * cy,
  };
  if (TOUCH.rx || TOUCH.ry) { if (Math.hypot(TOUCH.rx, TOUCH.ry) > 0.85 && !TOUCH.btn.blow) inp.suck = inp.suck; }
  const camTurn = ((K.KeyC || K.KeyX || (pad && pad.rb)) ? 1 : 0) - ((K.KeyZ || K.KeyQ || (pad && pad.lb)) ? 1 : 0);
  CAM.yaw += camTurn * dt * 1.8;
  return inp;
}

function updBody(B, dt, inp, control) {
  const caught = TOOL.caught && !B.goo === !GOO.on;
  let spd = B.goo ? 5.8 : 5.2; if (control && TOOL.caught) spd = 2.4; if (control && (TOOL.sucking || TOOL.blowing) && !TOOL.caught) spd = 4;
  const mx = control ? MOVE.x : 0, mz = control ? MOVE.z : 0;
  B.vx = lerp(B.vx, mx * spd, Math.min(1, dt * 12)) ; B.vz = lerp(B.vz, mz * spd, Math.min(1, dt * 12));
  if (!control) { B.vx *= 0.8; B.vz *= 0.8; }
  B.x += B.vx * dt; B.z += B.vz * dt; B.vy -= 22 * dt; B.y = Math.max(0, B.y + B.vy * dt); if (B.y === 0) B.vy = 0;
  const o = { x: B.x, z: B.z, r: 0.5 }; collide(o, B.goo); B.x = o.x; B.z = o.z;
  B.inv = Math.max(0, B.inv - dt);
  const moving = Math.hypot(B.vx, B.vz) > 0.4; if (moving) B.walk += dt * Math.hypot(B.vx, B.vz) * 2.2;
  if (control) {
    if (TOOL.caught) B.aim = Math.atan2(TOOL.caught.z - B.z, TOOL.caught.x - B.x);
    else if (inp.aimSrc) B.aim = Math.atan2(inp.az, inp.ax);
    else if (IN.mouseAim && !document.body.classList.contains('touch')) {
      v2.set(IN.mouseX / innerWidth * 2 - 1, -(IN.mouseY / innerHeight) * 2 + 1); ray.setFromCamera(v2, camera);
      if (ray.ray.intersectPlane(plane, hitV)) B.aim = Math.atan2(hitV.z - B.z, hitV.x - B.x);
    } else if (Math.hypot(MOVE.x, MOVE.z) > 0.2) B.aim = B.aim + angDiff(B.aim, Math.atan2(MOVE.z, MOVE.x)) * Math.min(1, dt * 12);
    // aim assist: nudge toward the nearest visible ghost when using a tool
    if (OPT.assist && !TOOL.caught && (inp.suck || inp.flash)) {
      let best = null, bd = 0.5; for (const g of GHOSTS.concat(BOSS.g && !BOSS.g.dead ? [BOSS.g] : [])) { if (g.dead || g.st === 'hidden') continue; const d = Math.hypot(g.x - B.x, g.z - B.z); if (d > 9) continue; const a = Math.abs(angDiff(B.aim, Math.atan2(g.z - B.z, g.x - B.x))); if (a < bd) { bd = a; best = g; } }
      if (best) B.aim += angDiff(B.aim, Math.atan2(best.z - B.z, best.x - B.x)) * Math.min(1, dt * 6);
    }
  }
  // animate: bouncy waddle, nervous shiver when ghosts are near
  const u = B.mesh.userData; B.mesh.position.set(B.x, B.y, B.z);
  B.face = B.face + angDiff(B.face, Math.PI / 2 - B.aim) * Math.min(1, dt * 14); B.mesh.rotation.y = B.face;
  const sw = moving ? Math.sin(B.walk * 3) : 0;
  u.body.position.y = moving ? Math.abs(Math.sin(B.walk * 3)) * 0.14 : Math.sin(GAME.t * 2) * 0.02;
  u.legs[0].rotation.x = sw * 0.6; u.legs[1].rotation.x = -sw * 0.6;
  const using = control && (TOOL.sucking || TOOL.blowing);
  u.arms[0].rotation.x = using ? -1.2 : -sw * 0.5; u.arms[1].rotation.x = using ? -1.3 : sw * 0.5;
  let scared = 0; for (const g of GHOSTS) if (!g.dead && g.st !== 'hidden' && Math.hypot(g.x - B.x, g.z - B.z) < 4) scared = 1;
  u.head.rotation.z = scared ? Math.sin(GAME.t * 40) * 0.03 : 0; u.head.rotation.x = TOOL.caught && control ? -0.15 : 0;
  u.mouth.scale.set(1, scared ? 1.6 : 1, 1);
  u.body.rotation.z = TOOL.caught && control ? Math.sin(GAME.t * 18) * 0.06 : 0;
  u.nozzle.rotation.y = using ? Math.sin(GAME.t * 30) * 0.05 : 0;
  u.sh.position.y = -B.y + 0.02; u.sh.scale.setScalar(1 - Math.min(0.5, B.y * 0.3));
  B.mesh.visible = B.goo ? GOO.on : (B.inv <= 0 || Math.floor(GAME.t * 15) % 2 === 0);
}

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; step(dt);
  if (GAME.running) R.render(scene, camera);
}
function step(dt) {
  GAME.t += dt;
  musicTick();
  if (PAD.menuA) { PAD.menuA = false; const s = [...document.querySelectorAll('.screen.on')].pop(); if (s) { const b = s.querySelector('.btn.green'); if (b) b.click(); } }
  if (IN.pauseQ) { IN.pauseQ = false; if (GAME.running && !GAME.ending) togglePause(); }
  if (!GAME.running || GAME.paused) { IN.slamQ = IN.plungeQ = IN.darkQ = IN.gooQ = false; return; }
  GAME.time += dt; STATS.playTime += dt;
  const inp = readInputs(dt); const B = activeBody();
  if (IN.gooQ) { IN.gooQ = false; setGoo(!GOO.on); }
  if (IN.darkQ) { IN.darkQ = false; DARK.on = !DARK.on; SFX.dark(); if (DARK.on && TOOL.caught) releaseCatch(); }
  if (IN.plungeQ) { IN.plungeQ = false; if (!GOO.on && !DARK.on) firePlunger(); }
  if (IN.slamQ) { IN.slamQ = false; doSlam(); }
  updBody(HERO, dt, inp, !GOO.on); updBody(GOOB, dt, inp, GOO.on);
  HERO.aimA = B.aim; HERO.ax = B.x + Math.cos(B.aim) * 1.0; HERO.az = B.z + Math.sin(B.aim) * 1.0;
  // flash: hold to charge, release to fire
  TOOL.flashCd -= dt;
  if (!DARK.on) {
    if (inp.flash && TOOL.flashCd <= 0) { const was = TOOL.flashCharge; TOOL.flashCharge = Math.min(1, TOOL.flashCharge + dt * 0.9 * SAVE.charge); TOOL.flashHeld = true; if (Math.floor(was * 4) !== Math.floor(TOOL.flashCharge * 4)) SFX.charge(); }
    else if (TOOL.flashHeld) { doFlash(TOOL.flashCharge > 0.35 ? TOOL.flashCharge : 0); TOOL.flashHeld = false; TOOL.flashCharge = 0; TOOL.flashCd = 0.5; }
  } else { TOOL.flashHeld = false; TOOL.flashCharge = 0; }
  $('chargeRing').style.display = TOOL.flashHeld ? 'block' : 'none'; $('chargeRing').style.setProperty('--p', (TOOL.flashCharge * 100) + '%');
  updVacuum(dt, inp.suck && !DARK.on || (inp.suck && inp.blow), inp.blow);
  if (DARK.on) for (const p of PROPS) if (p.onDark && inCone(p.x, p.z, 0.5, 9)) p.onDark(dt);
  if (DARK.on) for (const g of GHOSTS) if (g.kind === 'peeker' && !g.dead && inCone(g.x, g.z, 0.5, 8) && g.st !== 'caught') { if (g.st === 'hidden') { g.st = 'chase'; SFX.boo(); toast('A Peeker! Switch off DARK-LIGHT and SUCK it before it hides!', 2.5); } g.reveal = 5; }
  updPlunger(dt);
  for (const g of GHOSTS) { if (!g.dead) { updGhost(g, dt); drawGhost(g, dt); } }
  GHOSTS.forEach(g => { if (g.dead && g.m.parent) scene.remove(g.m); });
  updBoss(dt); updShots(dt); updPickups(dt);
  for (const p of PROPS) { if (p.update) p.update(dt); if (p.touch && Math.hypot(p.x - B.x, p.z - B.z) < (p.near || 2)) { if (p.t === 'prof' || p.t === 'elevator') { if (!p.cool) { p.cool = 1; p.touch(); } } else p.touch(); } else if (p.cool && Math.hypot(p.x - B.x, p.z - B.z) > (p.near || 2) + 1) p.cool = 0; }
  // rooms / checkpoints / boss trigger
  const rm = roomAt(B.x, B.z);
  if (rm && rm !== GAME.room) {
    GAME.room = rm; $('hFloor').textContent = '1F · ' + rm.name;
    if (!B.goo) { HERO.cp = rm.id === 'ballroom' ? { x: 8, z: 9 } : { x: HERO.x, z: HERO.z }; }
    if (rm.id === 'ballroom' && !SAVE.flags.bossDown && !BOSS.g && !B.goo) bossSpawn();
    if (!SAVE.seen['r' + rm.id]) { SAVE.seen['r' + rm.id] = 1; writeSave(); toast(rm.name, 1.8); }
  }
  // lights
  flashL.position.set(B.x, 1.6 + B.y, B.z); flashL.target.position.set(B.x + Math.cos(B.aim) * 8, 0, B.z + Math.sin(B.aim) * 8);
  TOOL.flashT = Math.max(0, TOOL.flashT - dt);
  flashL.intensity = DARK.on ? 0.4 : 3.2 + TOOL.flashT * 40 + TOOL.flashCharge * 2; flashL.angle = 0.52 + TOOL.flashT * 1.5; flashL.color.set(TOOL.flashT > 0 ? 0xffffff : 0xfff3c8);
  darkL.intensity = DARK.on ? 4 : 0; darkL.position.copy(flashL.position); darkL.target.position.copy(flashL.target.position);
  fillL.position.set(B.x, 3, B.z);
  amb.intensity = 0.12 + OPT.bright * 0.1 + TOOL.flashT * 2;
  updParticles(dt);
  // HUD
  $('hpFill').style.width = clamp(HERO.hp / SAVE.maxHp * 100, 0, 100) + '%'; $('hMoney').textContent = '💰 ' + SAVE.money; $('hGems').textContent = `💎 ${SAVE.gems.length}/3`; $('hBtn').textContent = `🛗 ${SAVE.button ? 1 : 0}/1`;
  $('hMode').textContent = (GOO.on ? '🟢 Gloopel ' : '') + (DARK.on ? '🟣 Dark-light' : '');
  if (tipT > 0) { tipT -= dt; if (tipT <= 0 && toastT <= 0) $('tip').classList.remove('on'); }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('tip').classList.remove('on'); }
  // camera
  CAM.x = lerp(CAM.x, B.x, Math.min(1, dt * 6)); CAM.z = lerp(CAM.z, B.z, Math.min(1, dt * 6));
  if (OPT.follow && Math.hypot(MOVE.x, MOVE.z) > 0.5 && !TOOL.caught) { /* gentle drift only; never spins */ }
  const cp = Math.cos(CAM.pitch) * CAM.dist, sh = GAME.shake; GAME.shake = Math.max(0, GAME.shake - dt * 2);
  camera.position.set(CAM.x + Math.sin(CAM.yaw) * cp + rnd(-sh, sh) * 0.3, Math.sin(CAM.pitch) * CAM.dist + rnd(-sh, sh) * 0.3, CAM.z + Math.cos(CAM.yaw) * cp);
  camera.lookAt(CAM.x, 1, CAM.z);
  // fade walls between camera and the hero
  for (const w of WALLMESH) w.material.opacity = 1;
  ray.set(camera.position, new THREE.Vector3(B.x, 1.2, B.z).sub(camera.position).normalize()); ray.far = camera.position.distanceTo(new THREE.Vector3(B.x, 1.2, B.z)) - 0.5;
  for (const h of ray.intersectObjects(WALLMESH, false)) h.object.material.opacity = 0.22;
  // walls on the camera's side of the hero (within a few metres) fade so he is never hidden
  const cx = Math.sin(CAM.yaw), cz = Math.cos(CAM.yaw);
  for (const w of WALLMESH) { const rx = w.position.x - B.x, rz = w.position.z - B.z; const along = rx * cx + rz * cz; const side = Math.abs(rx * cz - rz * cx); const p = w.geometry.parameters; const half = Math.max(p.width, p.depth) / 2; if (along > 0.3 && along < 9 && side < half + 6) w.material.opacity = Math.min(w.material.opacity, 0.2); w.material.depthWrite = w.material.opacity > 0.9; }
}
function togglePause() {
  GAME.paused = !GAME.paused; $('pause').classList.toggle('on', GAME.paused);
  if (GAME.paused) $('roomList').innerHTML = ROOMS.map(r => `<span class="${GAME.room === r ? 'here' : ''}">${r.name}</span>`).join('') + `<span>💎 ${SAVE.gems.length}/3</span><span>Lamps ${['lamp1', 'lamp2', 'lamp3'].filter(k => SAVE.flags[k]).length}/3</span><span>🛗 ${SAVE.button ? 'Button found' : 'Button: Ballroom boss'}</span>`;
  saveStats();
}
function buildSliders() {
  document.querySelectorAll('.sliders').forEach(box => {
    box.innerHTML = ''; for (const [k, label] of [['music', 'Music'], ['sfx', 'Sound effects'], ['bright', 'Brightness']]) {
      const row = document.createElement('label'); row.className = 'row'; row.innerHTML = `<span>${label}</span><input type="range" min="0" max="1" step="0.05" value="${OPT[k]}">`;
      row.querySelector('input').oninput = e => { OPT[k] = +e.target.value; saveOpt(); applyVol(); applyBright(); document.querySelectorAll('.sliders input').forEach((i, n) => { }); };
      box.appendChild(row);
    }
  });
}
function applyBright() { R.toneMappingExposure = 0.75 + OPT.bright * 1.0; hemi.intensity = 0.2 + OPT.bright * 0.3; }
function showStats() {
  const rows = [['Ghosts caught', STATS.ghosts], ['Tough ghosts', STATS.tough], ['Peekers', STATS.peekers], ['Slams', STATS.slams], ['Flashes', STATS.flashes], ['Bursts', STATS.bursts], ['Plunger shots', STATS.plungers], ['Money earned', STATS.moneyTotal], ['Bosses beaten', STATS.bossWins], ['Faints', STATS.faints], ['Best floor time', STATS.bestTime ? fmtT(STATS.bestTime) : '—'], ['Time played', fmtT(STATS.playTime)], ['Gems', `${SAVE.gems.length}/3`]];
  $('statGrid').innerHTML = rows.map(r => `<span>${r[0]}</span><b>${r[1]}</b>`).join(''); $('stats').classList.add('on');
}
function init() {
  initMats(); initParticles(); resize(); applyBright(); buildSliders(); setupTouch();
  const hm = makeHero(false); HERO.mesh = hm; scene.add(hm); const gm = makeHero(true); GOOB.mesh = gm; gm.visible = false; scene.add(gm);
  // title backdrop: build the floor so the title has a scene behind it later
  for (const [id, k] of [['optShake', 'shake'], ['optFollow', 'follow'], ['optAssist', 'assist'], ['optGlow', 'glow'], ['optHints', 'hints']]) { $(id).checked = OPT[k]; $(id).onchange = e => { OPT[k] = e.target.checked; saveOpt(); }; }
  $('bPlay').onclick = () => startGame(false); $('bNew').onclick = () => { if (confirm('Start a new game? Your money, gems and progress will be reset.')) startGame(true); };
  $('bStats').onclick = showStats; $('stClose').onclick = () => $('stats').classList.remove('on'); $('stReset').onclick = () => { if (confirm('Reset stats?')) { STATS = Object.assign({}, STDEF); saveStats(); showStats(); } };
  $('bSettings').onclick = () => $('settings').classList.add('on'); $('sClose').onclick = () => { $('settings').classList.remove('on'); };
  $('bPause').onclick = () => togglePause(); $('pResume').onclick = () => togglePause(); $('pSet').onclick = () => $('settings').classList.add('on');
  $('pQuit').onclick = () => { GAME.running = false; GAME.paused = false; saveStats(); bossReset(); document.querySelectorAll('.screen').forEach(s => s.classList.remove('on')); $('title').classList.add('on'); if (AU.vacG) AU.vacG.gain.value = 0; };
  $('talkOk').onclick = () => { $('talk').classList.remove('on'); GAME.paused = false; };
  $('dOk').onclick = respawn;
  $('rAgain').onclick = () => { $('results').classList.remove('on'); GAME.paused = false; GAME.ending = false; HERO.z += 3; };
  $('rTitle').onclick = () => { $('results').classList.remove('on'); $('pQuit').onclick(); };
  $('bPlay').textContent = SAVE.flags.lab1 ? '▶ Continue' : '▶ Play';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && !navigator.standalone && !localStorage.getItem(SKEY + '-a2hs')) $('a2hs').style.display = 'block';
  $('a2hsX').onclick = () => { localStorage.setItem(SKEY + '-a2hs', 1); $('a2hs').style.display = 'none'; };
  if ('serviceWorker' in navigator && !location.search.includes('nosw')) navigator.serviceWorker.register('sw.js').catch(() => { });
  setInterval(saveStats, 10000);
  requestAnimationFrame(loop);
}
// test hooks for the scripted checks
window.GG = { PICK: () => PICK, sim: s => { for (let t = 0; t < s; t += 1 / 30) step(1 / 30); }, step, startGame, HERO, GOOB, GHOSTS: () => GHOSTS, PROPS: () => PROPS, BOSS, SAVE: () => SAVE, TOOL, K, MB, IN, doFlash, doBurst, setGoo, firePlunger, finishFloor, tp: (x, z) => { const B = activeBody(); B.x = x; B.z = z; CAM.x = x; CAM.z = z; }, aim: a => { activeBody().aim = a; }, DARK, OPT, GAME };
init(); if (window.__bootOK) window.__bootOK();
