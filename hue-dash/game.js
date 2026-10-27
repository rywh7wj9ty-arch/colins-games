// HUE DASH: rendering, input, UI, progress. Physics lives in logic.js (deterministic, tested in Node).
import * as THREE from './vendor/three/three.module.js';
import { DT, prepare, newState, step, clone, colorAt, platY, starsFor, speedAt, setPhysics, bossCol } from './logic.js?v=202610271655';
import { LEVELS, WORLDS, BOSSES } from './levels.js?v=202610271655';
import { Audio } from './audio.js?v=202610271655';

const $ = id => document.getElementById(id);
const HEX = [0xd3dbe2, 0xf0367f, 0xf7b520, 0x26c6da];
const CSS = ['#8a9aab', '#f0367f', '#f7b520', '#26c6da'];
// v1.1 misty look: hazy blue-grey worlds, heavy fog, a bright glow far down the track
const THEMES = [
  { top: 0x435c7a, hor: 0x93a9bf, fog: 0x7d95ae, neutral: 0xd5dde5, back: [0x7f95aa, 0x8ea3b6, 0x6d859c], sun: 0xfff3e0, glow: 0xfff7ea, water: 0x6a8199, hemiG: 0x6d7f93 },
  { top: 0x4b607a, hor: 0x9db0c2, fog: 0x889db1, neutral: 0xd0d9e2, back: [0x72899f, 0x8399ad, 0x637a91], sun: 0xf2f6ff, glow: 0xf4f8ff, water: 0x5f7790, hemiG: 0x667a8f },
  { top: 0x65678a, hor: 0xc6bccb, fog: 0xaaa4b9, neutral: 0xdcd8e4, back: [0x8a86a3, 0x9893ad, 0x7a7896], sun: 0xffe9d6, glow: 0xffefe0, water: 0x726f8f, hemiG: 0x77738f },
  { top: 0x34436a, hor: 0x7a8db0, fog: 0x62749a, neutral: 0xb9c3d6, back: [0x4b5b82, 0x55678f, 0x435276], sun: 0xd9e2ff, glow: 0xe6ecff, water: 0x3f4f74, hemiG: 0x3c4a6c, night: true },
];
// v1.4 four worlds (Settings > Features > worlds): distinct looks, lighter haze
const THEMES4 = [
  { kind: 'lake', name: 'Misty Lake', top: 0x4f7396, hor: 0xa9c4d6, fog: 0x93b2c6, neutral: 0xdde6ec, back: [0x7c9db3, 0x8eaebf, 0x6a8ca3], sun: 0xfff3e0, glow: 0xfff7ea, water: 0x5f8aa6, hemiG: 0x6d8496 },
  { kind: 'city', name: 'Neon City', top: 0x1d1838, hor: 0x5a3f7a, fog: 0x3c2c5c, neutral: 0xb7b4d6, back: [0x2e2950, 0x3a3361, 0x252145], sun: 0xd9c6ff, glow: 0xff7ab0, water: 0x231d40, hemiG: 0x3a2f5c, night: true },
  { kind: 'desert', name: 'Sunset Desert', top: 0x6a5a9a, hor: 0xffb98a, fog: 0xe8a885, neutral: 0xf2e2cc, back: [0xd99a6c, 0xe6ae7c, 0xc4835c], sun: 0xffd9a8, glow: 0xffe1b0, water: 0xc98f6a, hemiG: 0xa86f58 },
  { kind: 'sky', name: 'Starry Sky', top: 0x0b1030, hor: 0x2c3a78, fog: 0x1e2a5a, neutral: 0xc6cff0, back: [0x2a3670, 0x34418a, 0x222c60], sun: 0xc8d6ff, glow: 0xb8c8ff, water: 0x141c48, hemiG: 0x2a3462, night: true },
];
const themeFor = w => FX.worlds ? THEMES4[w] : THEMES[w];
const worldName = w => FX.worlds ? THEMES4[w].name : WORLDS[w].name;
// v1.4 gem-unlocked scarves and trail colours
const SCARVES = [{ id: 'none', name: 'None', gems: 0 }, { id: 'red', name: 'Cherry', c: 0xe2424f, gems: 6 }, { id: 'sky', name: 'Sky', c: 0x5ab8f0, gems: 15 }, { id: 'sun', name: 'Sunny', c: 0xf7c23c, gems: 30 }, { id: 'mint', name: 'Mint', c: 0x45d3a5, gems: 45 }, { id: 'night', name: 'Midnight', c: 0x3a3f7a, gems: 65 }];
const TRAILS = [{ id: 'hue', name: 'Your colour', gems: 0 }, { id: 'snow', name: 'Snow', c: 0xffffff, gems: 10 }, { id: 'rose', name: 'Rose', c: 0xff8fc0, gems: 24 }, { id: 'lime', name: 'Lime', c: 0xb8f060, gems: 40 }, { id: 'violet', name: 'Violet', c: 0xa58cff, gems: 55 }, { id: 'rainbow', name: 'Rainbow', gems: 80 }];
const OUTFITS = [
  { id: 'cap', name: 'Cap', stars: 0 }, { id: 'beanie', name: 'Beanie', stars: 6 }, { id: 'phones', name: 'Headphones', stars: 15 },
  { id: 'crown', name: 'Crown', stars: 30 }, { id: 'helmet', name: 'Helmet', stars: 45 }, { id: 'halo', name: 'Halo', stars: 70 },
];
const BOARDS = [
  { id: 'snow', name: 'Snow', c: 0xffffff, s: 0xd6246e, stars: 0 }, { id: 'mint', name: 'Mint', c: 0xbfeee0, s: 0x2fa58a, stars: 4 },
  { id: 'wood', name: 'Maple', c: 0xd9a36a, s: 0x8a5a2b, stars: 10 }, { id: 'ink', name: 'Ink', c: 0x35303d, s: 0xe2a21d, stars: 20 },
  { id: 'sky', name: 'Sky', c: 0x9fd0f5, s: 0xffffff, stars: 36 }, { id: 'gold', name: 'Gilded', c: 0xf2c84b, s: 0xffffff, stars: 55 },
  { id: 'prism', name: 'Prism', c: 0xffffff, s: 0x1fb5c9, stars: 84 },
];
const ACH = [
  { id: 'first', i: '🏁', n: 'First Finish', d: 'Finish any level' },
  { id: 'gems10', i: '💎', n: 'Gem Hunter', d: 'Collect 10 gems' },
  { id: 'perfect', i: '⭐', n: 'Perfectionist', d: 'Get 3 stars on a level' },
  { id: 'deaths50', i: '🧊', n: 'Shatterproof', d: 'Shatter 50 times and keep going' },
  { id: 'w1', i: '🌅', n: 'Dawn Rider', d: 'Finish Dawn Drift' },
  { id: 'w2', i: '🏔', n: 'Cloud Walker', d: 'Finish Misty Peaks' },
  { id: 'w3', i: '🏜', n: 'Dune Surfer', d: 'Finish Dune Dusk' },
  { id: 'w4', i: '🌃', n: 'Night Owl', d: 'Finish Neon Night' },
  { id: 'switch500', i: '🎨', n: 'Chromatic', d: 'Switch colour 500 times' },
  { id: 'all3', i: '👑', n: 'Hue Master', d: 'Get every star' },
];

// ---------- save ----------
const KEY = 'huedash.v1';
let save;
function loadSave() {
  try { save = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { save = {}; }
  save.levels = save.levels || {}; save.ach = save.ach || {};
  save.tot = Object.assign({ deaths: 0, jumps: 0, switches: 0, play: 0, runs: 0, finishes: 0 }, save.tot);
  save.set = Object.assign({ music: 0.7, sfx: 0.8, musicOn: true, sfxOn: true, reduced: false, ghost: true, bright: 1 }, save.set);
// v1.3 feature toggles (Settings > Features); each off = v1.2 behaviour
save.set.fx = Object.assign({ anim: true, land: true, colour: true, chunky: true, trans: true }, save.set.fx || {});
  // v1.4 features (all on by default except Assist); off = v1.3 behaviour
  save.set.fx = Object.assign({ worlds: true, tight: true, combo: true, race: true, keys: true, boss: true, daily: true, outfits: true, photo: true, checkpoints: true, assist: false }, save.set.fx);
  save.daily = Object.assign({ last: '', streak: 0, best: {} }, save.daily);
  globalThis.FX = save.set.fx;
  save.look = Object.assign({ outfit: 'cap', board: 'snow', scarf: 'none', trail: 'hue' }, save.look);
  setPhysics(save.set.fx.tight);
}
function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }
const lvSave = id => save.levels[id] || (save.levels[id] = { done: false, stars: [false, false, false], gems: 0 });
const starCount = id => { const l = save.levels[id]; return l ? l.stars.filter(Boolean).length : 0; };
const totalStars = () => LEVELS.reduce((a, l) => a + starCount(l.id), 0);
const totalGems = () => LEVELS.reduce((a, l) => a + popc((save.levels[l.id] || {}).gems || 0), 0);
const bonusGems = () => Object.values(save.levels).filter(l => l.bonus).length;
const allGems = () => totalGems() + bonusGems();
const popc = v => (v & 1) + ((v >> 1) & 1) + ((v >> 2) & 1);
const unlocked = id => id === 0 || !!(save.levels[id - 1] && save.levels[id - 1].done);

// ---------- renderer ----------
loadSave();
const audio = new Audio();
Object.assign(audio, { music: save.set.music, sfx: save.set.sfx, musicOn: save.set.musicOn, sfxOn: save.set.sfxOn });
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
const QS = new URLSearchParams(location.search);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('game').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(44, 1, 0.5, 320);
const hemi = new THREE.HemisphereLight(0xffffff, 0xd8cfc8, 1.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.9);
function curTheme() { try { return theme; } catch (e) { return null; } }
function applyBright() { const b = save.set.bright || 1, n = !!(curTheme() && curTheme().night); hemi.intensity = (n ? 1.3 : 1.15) * b; sun.intensity = (n ? 1.0 : 1.7) * b; document.documentElement.style.setProperty('--bright', b); } sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 12, bottom: -12, near: 1, far: 60 });
sun.shadow.bias = -0.0006; sun.shadow.radius = 4; scene.add(sun); scene.add(sun.target);
hemi.layers.enable(1); sun.layers.enable(1); sun.shadow.camera.layers.enable(1);   // v1.2: light + shadow the crisp player layer
scene.fog = new THREE.FogExp2(0x9cb0c2, 0.0078);   // v1.4: haze dialled back (was 0.0125)
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, glow: { value: new THREE.Color() }, gdir: { value: new THREE.Vector3(0.82, 0.12, -0.56).normalize() } },
  vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 glow; uniform vec3 gdir; varying vec3 vp; void main(){ float h = clamp(vp.y*1.6+0.2,0.0,1.0); vec3 c = mix(hor, top, h*h); float g = max(dot(normalize(vp), gdir), 0.0); c = mix(c, glow, pow(g, 18.0)*0.6 + pow(g, 80.0)*0.45); c = mix(c, hor, (1.0-smoothstep(-0.05,0.12,vp.y))*0.6); gl_FragColor = vec4(c,1.0);\n#include <colorspace_fragment>\n}' });
const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 24, 12), skyMat); sky.renderOrder = -1; scene.add(sky);

function resize() {
  const rc = $('game').getBoundingClientRect(); const w = Math.max(1, Math.round(rc.width || innerWidth)), h = Math.max(1, Math.round(rc.height || innerHeight)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (window.__postReady) sizePost();
}
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 120)); if (window.visualViewport) visualViewport.addEventListener('resize', resize); resize();

// ---------- v1.1 post: depth-of-field haze + soft bloom from one quarter-res blur chain ----------
// Quality tiers (auto-drops when frames run slow; 'Reduced effects' pins tier 1):
// 3: DPR<=2, DOF+bloom, MSAA, shadows, reflections · 2: DPR<=1.5, DOF+bloom, reflections · 1: DPR<=1.25, no post · 0: DPR 1, no post, no reflections
const Q = { level: QS.has('q') ? +QS.get('q') : (save.set.reduced ? 1 : 3), locked: QS.has('q'), slow: 0, win: 0, frames: 0 };
const fsGeo = new THREE.PlaneGeometry(2, 2), fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
function fsPass(frag, uniforms) { const m = new THREE.ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: frag, depthTest: false, depthWrite: false }); const sc = new THREE.Scene(); const q = new THREE.Mesh(fsGeo, m); q.frustumCulled = false; sc.add(q); return { m, sc }; }
const pDown = fsPass('uniform sampler2D t; uniform vec2 px; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv + px*vec2(-1.0,-1.0)).rgb + texture2D(t, vUv + px*vec2(1.0,-1.0)).rgb + texture2D(t, vUv + px*vec2(-1.0,1.0)).rgb + texture2D(t, vUv + px*vec2(1.0,1.0)).rgb; gl_FragColor = vec4(c*0.25, 1.0); }', { t: { value: null }, px: { value: new THREE.Vector2() } });
const pBlur = fsPass('uniform sampler2D t; uniform vec2 dir; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb*0.227027; c += (texture2D(t, vUv + dir*1.3846).rgb + texture2D(t, vUv - dir*1.3846).rgb)*0.3162162; c += (texture2D(t, vUv + dir*3.2308).rgb + texture2D(t, vUv - dir*3.2308).rgb)*0.0702703; gl_FragColor = vec4(c, 1.0); }', { t: { value: null }, dir: { value: new THREE.Vector2() } });
const pComp = fsPass(`uniform sampler2D tS; uniform sampler2D tB; uniform sampler2D tD; uniform float cn; uniform float cf; uniform float focus; uniform float bloom;
varying vec2 vUv;
float lin(float d){ float z = d*2.0 - 1.0; return 2.0*cn*cf/(cf + cn - z*(cf - cn)); }
void main(){
  vec3 sh = texture2D(tS, vUv).rgb; vec3 bl = texture2D(tB, vUv).rgb; float z = lin(texture2D(tD, vUv).r);
  float far = smoothstep(focus + 12.0, focus + 75.0, z)*0.8, near = 1.0 - smoothstep(focus*0.55, focus*0.85, z);
  vec3 c = mix(sh, bl, clamp(max(far*0.92, near), 0.0, 1.0));
  c += max(bl - vec3(0.58), vec3(0.0))*bloom;
  gl_FragColor = vec4(c, 1.0);
  gl_FragDepth = texture2D(tD, vUv).r;
  #include <colorspace_fragment>
}`, { tS: { value: null }, tB: { value: null }, tD: { value: null }, cn: { value: camera.near }, cf: { value: camera.far }, focus: { value: 16 }, bloom: { value: 0.7 } });
pComp.m.depthTest = true; pComp.m.depthWrite = true; pComp.m.depthFunc = THREE.AlwaysDepth;
let rtMain = null, rtA = null, rtB = null;
const PLAYER_LAYER = 1;
function sizePost() {
  const v = renderer.getDrawingBufferSize(new THREE.Vector2()), w = Math.max(4, v.x), h = Math.max(4, v.y);
  const usePost = Q.level >= 2;
  if (!usePost) { if (rtMain) { rtMain.dispose(); rtA.dispose(); rtB.dispose(); rtMain = rtA = rtB = null; } return; }
  const ty = THREE.HalfFloatType;
  if (!rtMain || rtMain.width !== w || rtMain.height !== h || rtMain.samples !== (Q.level >= 3 ? 4 : 0)) {
    if (rtMain) { rtMain.dispose(); rtA.dispose(); rtB.dispose(); }
    rtMain = new THREE.WebGLRenderTarget(w, h, { type: ty, samples: Q.level >= 3 ? 4 : 0 }); rtMain.depthTexture = new THREE.DepthTexture(w, h);
    const qw = Math.max(2, Math.round(w / 4)), qh = Math.max(2, Math.round(h / 4));
    rtA = new THREE.WebGLRenderTarget(qw, qh, { type: ty }); rtB = new THREE.WebGLRenderTarget(qw, qh, { type: ty });
  }
}
function renderFrame() {
  camera.layers.set(0);
  if (!rtMain) { renderer.setRenderTarget(null); renderer.render(scene, camera); }
  else { renderer.setRenderTarget(rtMain); renderer.render(scene, camera);
  pDown.m.uniforms.t.value = rtMain.texture; pDown.m.uniforms.px.value.set(1.5 / rtMain.width, 1.5 / rtMain.height);
  renderer.setRenderTarget(rtA); renderer.render(pDown.sc, fsCam);
  const iw = 1 / rtA.width, ih = 1 / rtA.height;
  for (const k of [1, 2]) {
    pBlur.m.uniforms.t.value = rtA.texture; pBlur.m.uniforms.dir.value.set(iw * k, 0); renderer.setRenderTarget(rtB); renderer.render(pBlur.sc, fsCam);
    pBlur.m.uniforms.t.value = rtB.texture; pBlur.m.uniforms.dir.value.set(0, ih * k); renderer.setRenderTarget(rtA); renderer.render(pBlur.sc, fsCam);
  }
  const u = pComp.m.uniforms; u.tS.value = rtMain.texture; u.tB.value = rtA.texture; u.tD.value = rtMain.depthTexture; u.cn.value = camera.near; u.cf.value = camera.far;
  renderer.setRenderTarget(null); renderer.render(pComp.sc, fsCam); }
  // v1.2: the runner is drawn last, straight to the antialiased canvas: no DOF blur, no bloom smear, no fog
  const ac = renderer.autoClear, su = renderer.shadowMap.autoUpdate, bg = scene.background;
  renderer.autoClear = false; renderer.shadowMap.autoUpdate = false; scene.background = null; camera.layers.set(PLAYER_LAYER);
  renderer.render(scene, camera);
  renderer.autoClear = ac; renderer.shadowMap.autoUpdate = su; scene.background = bg; camera.layers.enableAll();
}
function setQuality(l) {
  Q.level = Math.max(0, Math.min(3, l));
  renderer.setPixelRatio(Math.min([1.5, 1.5, 1.75, 2][Q.level], devicePixelRatio || 1));   // v1.2: higher floor so the runner never goes soft
  renderer.shadowMap.enabled = Q.level >= 3; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  if (reflGroup) reflGroup.visible = Q.level >= 2;
  resize(); sizePost(); window.__quality = Q.level;
}
// called every frame while a level is running: two slow 2-second windows in a row drop one tier
function autoQuality(dt) {
  if (Q.locked || Q.level === 0) return;
  Q.win += dt; Q.frames++;
  if (Q.win >= 2) { const fps = Q.frames / Q.win; Q.win = 0; Q.frames = 0; Q.slow = fps < 50 ? Q.slow + 1 : 0; if (Q.slow >= 2) { Q.slow = 0; setQuality(Q.level - 1); } }
}

window.__postReady = true;

// ---------- materials ----------
const matCache = {};
const mat = (hex, o = {}) => { const k = hex + JSON.stringify(o); return matCache[k] || (matCache[k] = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, metalness: 0, flatShading: true, ...o })); };
let platMats = [];
let capMats = [];
function setThemeMats(th) {
  // soft satin beams: emissive lift keeps them saturated through the fog, like the reference
  platMats = [mat(th.neutral, { roughness: 0.8, emissive: th.neutral, emissiveIntensity: 0.12 }), ...[1, 2, 3].map(i => mat(HEX[i], { roughness: 0.7, emissive: HEX[i], emissiveIntensity: th.night ? 0.4 : 0.16 }))];
  platMats.forEach(m => m.userData.baseE = m.emissiveIntensity);
  // v1.3 chunky: a lighter, slightly proud top slab on every beam reads as a clean walkable surface
  capMats = [th.neutral, ...HEX.slice(1)].map((h, i) => { const c = new THREE.Color(h).lerp(new THREE.Color(0xffffff), i ? 0.3 : 0.45); return new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, flatShading: true, emissive: c, emissiveIntensity: i ? 0.22 : 0.15 }); });
}
const box = new THREE.BoxGeometry(1, 1, 1);

// ---------- soft particle texture & smoke ----------
function softTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  // v1.1: a cartoony cloud puff, lit from the top left with a soft shaded underside
  c.width = c.height = 128;
  const lobes = [[64, 70, 40], [40, 74, 26], [88, 74, 26], [54, 48, 26], [78, 50, 24]];
  g.fillStyle = '#fff'; g.filter = 'blur(3px)'; lobes.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }); g.filter = 'none';
  g.globalCompositeOperation = 'source-atop';
  const sh = g.createLinearGradient(30, 20, 96, 118); sh.addColorStop(0, 'rgba(255,255,255,1)'); sh.addColorStop(0.55, 'rgba(236,240,246,1)'); sh.addColorStop(1, 'rgba(178,188,204,1)');
  g.fillStyle = sh; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const SOFT = softTex();
class Smoke {
  constructor(n) {
    this.n = n; const geo = new THREE.PlaneGeometry(1, 1);
    this.alpha = new THREE.InstancedBufferAttribute(new Float32Array(n), 1); geo.setAttribute('aAlpha', this.alpha);
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { map: { value: SOFT } },
      vertexShader: 'attribute float aAlpha; varying float va; varying vec3 vc; varying vec2 vu; void main(){ va=aAlpha; vc=instanceColor; vu=uv; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}',
      fragmentShader: 'uniform sampler2D map; varying float va; varying vec3 vc; varying vec2 vu; void main(){ vec4 t=texture2D(map,vu); gl_FragColor=vec4(vc*t.rgb, t.a*va);\n#include <colorspace_fragment>\n}' });
    this.mesh = new THREE.InstancedMesh(geo, m, n); this.mesh.frustumCulled = false; this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.p = Array.from({ length: n }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, s: 1, gs: 1, c: new THREE.Color(), grey: new THREE.Color() }));
    this.i = 0; this.m4 = new THREE.Matrix4(); this.col = new THREE.Color(); scene.add(this.mesh);
  }
  emit(x, y, z, hex, o = {}) {
    const p = this.p[this.i = (this.i + 1) % this.n];
    p.life = p.max = o.life || 1.3 + Math.random() * 0.6; p.x = x; p.y = y; p.z = z; p.vx = o.vx ?? (-1.5 - Math.random()); p.vy = o.vy ?? (0.3 + Math.random() * 1.1);
    p.s = o.s || 0.7 + Math.random() * 0.5; p.gs = o.gs || 3.6; p.c.setHex(hex); p.grey.setHex(o.grey ?? 0xf4f6fa); p.a = o.a ?? 0.85;
  }
  clear() { this.p.forEach(p => p.life = 0); }
  update(dt) {
    const q = new THREE.Quaternion(); const camQ = camera.quaternion;
    for (let k = 0; k < this.n; k++) {
      const p = this.p[k];
      if (p.life > 0) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.985; }
      const f = Math.max(0, p.life / p.max), age = 1 - f, s = p.life > 0 ? p.s + age * p.gs : 0;
      this.m4.compose(new THREE.Vector3(p.x, p.y, p.z), camQ, new THREE.Vector3(s, s, s)); this.mesh.setMatrixAt(k, this.m4);
      this.col.copy(p.c).lerp(p.grey, Math.min(1, age * 3.2 + 0.15)); this.mesh.setColorAt(k, this.col);
      this.alpha.array[k] = p.life > 0 ? p.a * Math.min(1, f * 2.2) * Math.min(1, age * 10 + 0.3) : 0;
    }
    this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true; this.alpha.needsUpdate = true;
  }
}
class Cubes {
  constructor(n) {
    this.n = n; this.mesh = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true }), n);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); this.mesh.castShadow = true; this.mesh.frustumCulled = false;
    this.p = Array.from({ length: n }, () => ({ life: 0 })); this.i = 0; this.m4 = new THREE.Matrix4(); this.e = new THREE.Euler(); this.q = new THREE.Quaternion(); scene.add(this.mesh);
  }
  burst(x, y, hex, n, o = {}) {
    const c = new THREE.Color(hex);
    for (let k = 0; k < n; k++) {
      const p = this.p[this.i = (this.i + 1) % this.n];
      Object.assign(p, { life: o.life || 1.4, x: x + (Math.random() - .5) * 0.6, y: y + Math.random() * 1.2, z: (Math.random() - .5) * 0.6,
        vx: (Math.random() - .3) * (o.v || 9), vy: Math.random() * (o.v || 9) + 2, vz: (Math.random() - .5) * 8, r: Math.random() * 6, vr: (Math.random() - .5) * 14, s: o.s || 0.12 + Math.random() * 0.2, g: o.g ?? 26 });
      this.mesh.setColorAt(this.i, Math.random() < 0.25 ? new THREE.Color(0xffffff) : c);
    }
    this.mesh.instanceColor.needsUpdate = true;
  }
  clear() { this.p.forEach(p => p.life = 0); }
  update(dt) {
    for (let k = 0; k < this.n; k++) {
      const p = this.p[k], alive = p.life > 0;
      if (alive) { p.life -= dt; p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.r += p.vr * dt; }
      const s = alive ? p.s * Math.min(1, p.life * 2) : 0;
      this.q.setFromEuler(this.e.set(p.r || 0, (p.r || 0) * 0.7, 0)); this.m4.compose(new THREE.Vector3(p.x || 0, p.y || 0, p.z || 0), this.q, new THREE.Vector3(s, s, s)); this.mesh.setMatrixAt(k, this.m4);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
let smoke = new Smoke(save.set.reduced ? 140 : 360), cubes = new Cubes(160);
const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide });
const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), ringMat); ring.visible = false; scene.add(ring);
const ring2Mat = ringMat.clone(); const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), ring2Mat); ring2.visible = false; scene.add(ring2); let ring2T = 0, skyPulse = 0, hitStop = 0;
const skyBase = { top: new THREE.Color(), hor: new THREE.Color() }, tint = new THREE.Color();
// DOM-level instant feedback: a ripple under the finger and a soft colour flash (no WebGL cost)
function tapFx(x, y) { if (!$('hud').classList.contains('on')) return; const d = document.createElement('i'); d.className = 'ripple'; d.style.left = x + 'px'; d.style.top = y + 'px'; $('fx').appendChild(d); setTimeout(() => d.remove(), 420); }
function flash(col, a) { if (save.set.reduced) a *= 0.5; const f = $('flash'); f.style.transition = 'none'; f.style.background = col; f.style.opacity = a; void f.offsetWidth; f.style.transition = 'opacity .28s ease-out'; f.style.opacity = 0; }
let ringT = 0;

// ---------- runner ----------
// v1.2 crisp runner: own materials (no fog, a touch of self-light), a thin dark outline, drawn in the player layer after post
const rmat = (hex, o = {}) => mat(hex, { roughness: 0.55, emissive: hex, emissiveIntensity: 0.12, ...o, fog: false, flatShading: false });   // v1.4: smooth (soft-shaded) runner
// v1.4 rounded runner: rounded boxes with true smooth normals (each vertex pushed onto an inner box + radius)
const RGEO = {};
function roundBox(w, h, d, r, seg = 4) {
  const k = [w, h, d, r].map(v => v.toFixed(3)).join(); if (RGEO[k]) return RGEO[k];
  r = Math.min(r, w / 2, h / 2, d / 2) * 0.999; const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2), P = g.attributes.position, N = g.attributes.normal, v = new THREE.Vector3(), c = new THREE.Vector3();
  const hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); c.set(Math.max(-hw, Math.min(hw, v.x)), Math.max(-hh, Math.min(hh, v.y)), Math.max(-hd, Math.min(hd, v.z))); const n = v.sub(c).normalize(); N.setXYZ(i, n.x, n.y, n.z); P.setXYZ(i, c.x + n.x * r, c.y + n.y * r, c.z + n.z * r); }
  g.computeBoundingBox(); g.computeBoundingSphere(); return RGEO[k] = g;
}
const capsule = (r, len) => RGEO['c' + r + len] || (RGEO['c' + r + len] = new THREE.CapsuleGeometry(r, len, 6, 16));
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x2b3442, side: THREE.BackSide, fog: false });
function crispRunner() {
  const r = runner; window.__runnerRef = r;
  r.g.traverse(o => { if (o.isMesh && !o.userData.outline && !o.userData.hasOutline) {
    // v1.4: hull uses the part's own (rounded) geometry, grown by a constant world-space thickness
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox.getSize(new THREE.Vector3());
    const s = o.scale, t = 0.032, ol = new THREE.Mesh(o.geometry, outlineMat); ol.userData.outline = true;
    ol.scale.set(1 + 2 * t / Math.max(0.02, bb.x * s.x), 1 + 2 * t / Math.max(0.02, bb.y * s.y), 1 + 2 * t / Math.max(0.02, bb.z * s.z)); o.add(ol); o.userData.hasOutline = true; } });
  r.g.traverse(o => o.layers.set(PLAYER_LAYER));
}
// v1.3 Nintendo-style character animation: spring squash/stretch, anticipation, run cycle with bob, legs and arm swing, flip on double jump
const AN = { s: 1, v: 0, antic: 0, ph: 0, spin: 0 };
function animRunner(dt, air, pop, sim) {
  const p = runner.parts; dt = Math.min(dt, 0.05);
  AN.v += (-170 * (AN.s - 1) - 13 * AN.v) * dt; AN.s += AN.v * dt; AN.s = Math.max(0.6, Math.min(1.45, AN.s));
  let sy = AN.s; if (AN.antic > 0) { AN.antic -= dt; sy = Math.min(sy, 0.78); }
  const sx = 1 / Math.sqrt(sy);
  runner.body.scale.set(sx + pop, sy + pop, sx + pop);
  const run = !air && mode !== MODE.dead; AN.ph += dt * (run ? 15 : 4);
  const sw = Math.sin(AN.ph);
  runner.body.position.y = run ? Math.abs(Math.cos(AN.ph)) * 0.07 : 0;
  p.legB.rotation.z = THREE.MathUtils.lerp(p.legB.rotation.z, run ? sw * 0.35 : 0.45, Math.min(1, dt * 18));
  p.legF.rotation.z = THREE.MathUtils.lerp(p.legF.rotation.z, run ? -sw * 0.35 : -0.25, Math.min(1, dt * 18));
  p.armB.rotation.z = THREE.MathUtils.lerp(p.armB.rotation.z, air ? 2.3 : 0.55 + sw * 0.7, Math.min(1, dt * 16));
  p.armF.rotation.z = THREE.MathUtils.lerp(p.armF.rotation.z, air ? -2.3 : -0.45 - sw * 0.7, Math.min(1, dt * 16));
  p.head.rotation.z = THREE.MathUtils.lerp(p.head.rotation.z, air ? -sim.vy * sim.gs * 0.012 : Math.sin(AN.ph * 0.5) * 0.05, Math.min(1, dt * 10));
  if (AN.spin > 0) { AN.spin = Math.max(0, AN.spin - dt * 3.2); runner.body.rotation.y = (1 - AN.spin) * Math.PI * 2 * (AN.spin > 0 ? 1 : 0); } else runner.body.rotation.y = 0;
}
// v1.3 landing / pickup ring that lies flat on the beam
const lrMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
const lrPool = [...Array(4)].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 40), lrMat.clone()); m.rotation.x = -Math.PI / 2; m.visible = false; m.userData.t = 9; scene.add(m); return m; });
function landRing(x, y, k, col = 0xffffff) { const m = lrPool.find(r => !r.visible) || lrPool[0]; m.visible = true; m.userData = { t: 0, k }; m.position.set(x, y + 0.03, 0); m.material.color.setHex(col); }
function updateRings(dt, gs) { for (const m of lrPool) if (m.visible) { const d = m.userData; d.t += dt; const e = 1 - Math.pow(1 - Math.min(1, d.t / 0.35), 3); m.scale.setScalar(0.3 + e * 1.6 * d.k); m.material.opacity = 0.85 * (1 - d.t / 0.35); m.rotation.x = gs < 0 ? Math.PI / 2 : -Math.PI / 2; if (d.t > 0.35) m.visible = false; } }
// v1.3 colour guide: beams matching the runner's colour glow up, the others settle back
const CG = [0, 0, 0, 0];
function colourGuide(dt, col) { for (let i = 1; i < 4; i++) { const m = platMats[i]; if (!m) continue; const tgt = !FX.colour ? 0 : (i === col ? 1 : -1); CG[i] += (tgt - CG[i]) * Math.min(1, dt * 8); const b = m.userData.baseE ?? 0.16; m.emissiveIntensity = b + (CG[i] > 0 ? CG[i] * 0.15 : CG[i] * b * 0.5); } }
function applyFx() { document.body.classList.toggle('fxbtn', FX.trans); setPhysics(FX.tight); ['daily', 'photo', 'outfits'].forEach(k => document.body.classList.toggle('fx' + k, !!FX[k])); if (typeof updateDailyInfo === 'function') updateDailyInfo(); if (lvlGroup) lvlGroup.traverse(o => { if (o.userData && o.userData.cap) o.userData.cap.visible = FX.chunky; }); }
function iris() { if (!FX.trans || save.set.reduced) return; const w = $('wipe'); w.classList.remove('go'); void w.offsetWidth; w.classList.add('go'); }
function makeRunner(ghost) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const m = o => ghost ? new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false }) : rmat(o);
  const parts = {};
  // v1.4: rounded, soft-shaded parts (capsule limbs, pill torso, near-sphere head, rounded board)
  const add = (name, geo, x, y, z, color, parent = body) => { const ms = new THREE.Mesh(geo, m(color)); ms.position.set(x, y, z); ms.castShadow = !ghost; parent.add(ms); parts[name] = ms; return ms; };
  add('board', roundBox(1.35, 0.13, 0.5, 0.065), 0, 0.1, 0, 0xffffff); add('stripe', roundBox(1.0, 0.04, 0.52, 0.02), 0, 0.17, 0, 0xd6246e);
  add('legB', capsule(0.1, 0.36), -0.2, 0.45, 0, 0xcfc9cc); add('legF', capsule(0.1, 0.36), 0.22, 0.45, 0, 0xcfc9cc);
  add('torso', roundBox(0.5, 0.58, 0.4, 0.19), 0, 0.98, 0, 0xd6246e);
  add('armB', capsule(0.075, 0.3), -0.3, 0.98, -0.12, 0xd6246e); add('armF', capsule(0.075, 0.3), 0.32, 0.98, 0.12, 0xd6246e);
  add('head', roundBox(0.44, 0.42, 0.42, 0.19), 0.04, 1.49, 0, 0xf4f1f0);
  if (!ghost) { const em = new THREE.MeshBasicMaterial({ color: 0x2b3442, fog: false }); for (const z of [-0.08, 0.08]) { const e = new THREE.Mesh(capsule(0.03, 0.06), em); e.position.set(0.21, 0.03, z); e.userData.outline = true; parts.head.add(e); } }   // little eyes
  const scarf = new THREE.Group(); scarf.position.set(0, 1.27, 0); body.add(scarf); parts.scarf = scarf;
  const hat = new THREE.Group(); hat.position.set(0.04, 1.7, 0); body.add(hat); parts.hat = hat;
  return { g, body, parts, ghost, m };
}
function dressRunner(r) {
  const hat = r.parts.hat; while (hat.children.length) hat.remove(hat.children[0]);
  const hm = (w, h, d, rr = Math.min(w, h, d) * 0.45) => { const ms = new THREE.Mesh(roundBox(w, h, d, rr), r.m(0xd6246e)); ms.castShadow = !r.ghost; hat.add(ms); return ms; };
  const o = save.look.outfit; let a, b;
  if (o === 'cap') { a = hm(0.47, 0.16, 0.45, 0.075); b = hm(0.26, 0.05, 0.36, 0.024); b.position.set(0.3, -0.05, 0); }
  else if (o === 'beanie') { a = hm(0.47, 0.25, 0.45, 0.12); a.position.y = 0.04; b = hm(0.15, 0.15, 0.15, 0.074); b.position.y = 0.24; }
  else if (o === 'phones') { a = hm(0.5, 0.08, 0.12, 0.04); b = hm(0.14, 0.24, 0.5, 0.07); b.position.y = -0.18; }
  else if (o === 'crown') { a = hm(0.45, 0.17, 0.43, 0.06); a.position.y = 0.02; b = hm(0.11, 0.3, 0.11, 0.05); b.position.y = 0.14; }
  else if (o === 'helmet') { a = hm(0.53, 0.31, 0.51, 0.15); a.position.y = -0.04; b = hm(0.1, 0.18, 0.44, 0.05); b.position.set(0.26, -0.12, 0); }
  else { a = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 10, 32), r.m(0xd6246e)); a.rotation.x = Math.PI / 2; a.position.y = 0.2; hat.add(a); b = hm(0.05, 0.2, 0.05, 0.024); b.position.y = 0.08; }
  r.hatParts = [a, b];
  // v1.4 scarf (gem unlock): a soft ring round the neck with a tail that flutters
  const sg = r.parts.scarf; while (sg.children.length) sg.remove(sg.children[0]); r.scarfTail = null;
  const sc = FX.outfits && SCARVES.find(x => x.id === save.look.scarf);
  if (sc && sc.c !== undefined) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.065, 10, 28), r.m(sc.c)); ring.rotation.x = Math.PI / 2; ring.scale.set(1.1, 1, 1); sg.add(ring);
    const tail = new THREE.Mesh(roundBox(0.34, 0.09, 0.14, 0.04), r.m(sc.c)); tail.geometry = tail.geometry.clone(); tail.geometry.translate(-0.17, 0, 0); tail.position.set(-0.18, 0, 0.12); sg.add(tail); r.scarfTail = tail; }
  const bd = BOARDS.find(x => x.id === save.look.board) || BOARDS[0];
  if (!r.ghost) { r.parts.board.material = rmat(bd.c); r.parts.stripe.material = rmat(bd.s); if (r === window.__runnerRef) crispRunner(); }
}
function paintRunner(r, c) {
  if (r.ghost) return;
  const m = rmat(HEX[c], { roughness: 0.55 });
  ['torso', 'armB', 'armF'].forEach(k => r.parts[k].material = m); r.hatParts.forEach(p => p.material = m);
  const bd = BOARDS.find(x => x.id === save.look.board); if (bd.id === 'snow' || bd.id === 'prism') r.parts.stripe.material = m;
}
const runner = makeRunner(false); scene.add(runner.g); dressRunner(runner); const RUN_S = 0.95; runner.g.scale.setScalar(RUN_S); crispRunner();
const ghost = makeRunner(true); scene.add(ghost.g); dressRunner(ghost); ghost.g.visible = false; ghost.g.scale.setScalar(RUN_S);

// ---------- level building ----------
let keyMesh = null, bonusMesh = null, bonMeshes = [], cpMesh = null, bossMesh = null;
let level = null, lvlGroup = null, dyn = [], gemMeshes = [], boostMeshes = [], backGroup = null, theme = THEMES[0], finishMesh = null;
const gemGeo = new THREE.OctahedronGeometry(0.42, 0), torus = new THREE.TorusGeometry(0.7, 0.12, 8, 24), cone = new THREE.ConeGeometry(0.4, 0.6, 4);
function applyTheme(wi) {
  theme = themeFor(wi); setThemeMats(theme);
  skyMat.uniforms.top.value.setHex(theme.top); skyMat.uniforms.hor.value.setHex(theme.hor); skyMat.uniforms.glow.value.setHex(theme.glow); scene.fog.color.setHex(theme.fog);
  hemi.color.setHex(theme.night ? 0xb8c4ee : 0xf2f6ff); hemi.groundColor.setHex(theme.hemiG); hemi.intensity = theme.night ? 1.7 : 1.6;
  if (water) water.material.uniforms.col.value.setHex(theme.water), water.material.uniforms.sky.value.setHex(theme.hor), water.material.uniforms.glow.value.setHex(theme.glow);
  sun.color.setHex(theme.sun); applyBright(); skyBase.top.setHex(theme.top); skyBase.hor.setHex(theme.hor); skyBase.ok = true;
  document.documentElement.style.setProperty('--ink', '#4a4f5c');
}
let water = null, reflGroup = null;
const waterMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false,
  uniforms: { col: { value: new THREE.Color(0x6a8199) }, sky: { value: new THREE.Color(0xb4c4d2) }, glow: { value: new THREE.Color(0xfff7ea) }, time: { value: 0 }, cam: { value: new THREE.Vector3() } },
  vertexShader: 'varying vec3 wp; void main(){ vec4 w = modelMatrix*vec4(position,1.0); wp = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
  fragmentShader: `uniform vec3 col; uniform vec3 sky; uniform vec3 glow; uniform float time; uniform vec3 cam; varying vec3 wp;
  void main(){ vec3 v = normalize(cam - wp); float d = length(cam.xz - wp.xz);
    float r = sin(wp.x*0.9 + time*1.7 + sin(wp.z*0.7 + time)*1.6)*0.5 + sin(wp.x*2.3 - wp.z*1.9 + time*2.4)*0.25;
    float fres = pow(1.0 - clamp(v.y, 0.0, 1.0), 3.0);
    vec3 c = mix(col, sky, clamp(fres*0.9 + r*0.07, 0.0, 1.0));
    c += glow * smoothstep(0.55, 1.0, r) * 0.12 * (1.0 - fres);
    float fogk = 1.0 - exp(-d*d*0.00006);
    c = mix(c, sky, fogk);
    gl_FragColor = vec4(c, mix(0.74, 0.97, fogk));
    #include <colorspace_fragment>
  }` });
function buildBackdrop(wi, len, lowY) {
  if (backGroup) scene.remove(backGroup);
  backGroup = new THREE.Group(); scene.add(backGroup);
  const th = themeFor(wi); let seed = wi * 99 + 1; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // instanced blocky structures: stacked slabs and towers far behind, a few out-of-focus blocks in the foreground
  const blocks = [];
  for (let x = -80; x < len + 160; x += 5 + R() * 8) {
    const kd = FX.worlds ? th.kind : '';
    let z = -30 - R() * 95, w = 4 + R() * 12, h = 3 + R() * (wi === 1 ? 26 : 16), d = 4 + R() * 10, base = lowY - 6 + R() * 8;
    if (kd === 'city') { w = 3 + R() * 6; h = 14 + R() * 38; d = 3 + R() * 6; }   // tall towers
    else if (kd === 'desert') { w = 14 + R() * 26; h = 1.5 + R() * 5; d = 10 + R() * 16; base = lowY - 4 + R() * 3; }   // long low dunes / mesas
    else if (kd === 'sky') { base = lowY - 4 + R() * 30; h = 1 + R() * 3; }   // floating islands
    blocks.push([x, base + h / 2, z, w, h, d, th.back[Math.floor(R() * 3)]]);
    if (R() < 0.55) { const w2 = w * (0.4 + R() * 0.5), h2 = 1.5 + R() * 5; blocks.push([x + (R() - .5) * w * 0.5, base + h + h2 / 2, z + (R() - .5) * 2, w2, h2, d * (0.5 + R() * 0.5), th.back[Math.floor(R() * 3)]]); }
    if (R() < 0.3) blocks.push([x + R() * 6, lowY + 10 + R() * 18, z - 10, 6 + R() * 10, 1.5 + R() * 2.5, 4 + R() * 6, th.back[Math.floor(R() * 3)]]);   // floating slab
  }
  for (let x = -40; x < len + 80; x += 18 + R() * 26) {   // near blocks, blurred by depth of field
    const z = 3 + R() * 4, h = 2 + R() * 4; blocks.push([x, lowY - 9 + h / 2, z, 2 + R() * 4, h, 1.5 + R() * 2, th.back[Math.floor(R() * 3)]]);   // kept low so they never hide the track
  }
  const im = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), blocks.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  blocks.forEach((b, i) => { m4.compose(new THREE.Vector3(b[0], b[1], b[2]), q, new THREE.Vector3(b[3], b[4], b[5])); im.setMatrixAt(i, m4); im.setColorAt(i, c.setHex(b[6])); });
  backGroup.add(im);
  if (FX.worlds && th.kind === 'sky') {   // v1.4 starry sky: a field of stars
    const n = 700, pos = new Float32Array(n * 3); for (let k = 0; k < n; k++) { const a = R() * Math.PI, b = R() * 0.9 + 0.05; pos[k * 3] = len / 2 + Math.cos(a) * 170; pos[k * 3 + 1] = lowY + Math.sin(b * Math.PI / 2) * 150; pos[k * 3 + 2] = -Math.sin(a) * 150 - 20; }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    backGroup.add(new THREE.Points(gg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.9 })));
  }
  if (FX.worlds && th.kind === 'desert') { const sunM = new THREE.Mesh(new THREE.CircleGeometry(16, 48), new THREE.MeshBasicMaterial({ color: 0xffd08a, fog: false })); sunM.position.set(len * 0.7, lowY + 14, -150); backGroup.add(sunM); }
  if (th.night && !(FX.worlds && th.kind === 'sky')) for (let k = 0; k < (FX.worlds && th.kind === 'city' ? 120 : 40); k++) { const g = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: [0xff7ab0, 0xffd27a, 0x8ee8ff][k % 3], fog: true })); g.scale.set(1.5 + R() * 3, 0.25, 0.1); g.position.set(-40 + R() * (len + 120), lowY + R() * 20, -25 - R() * 60); backGroup.add(g); }
  water = new THREE.Mesh(new THREE.PlaneGeometry(len + 600, 500), waterMat); water.rotation.x = -Math.PI / 2; water.position.set(len / 2, lowY - 5, -60); water.renderOrder = -1;   // drawn before the smoke, which doesn't write depth
  waterMat.uniforms.col.value.setHex(th.water); waterMat.uniforms.sky.value.setHex(th.hor); waterMat.uniforms.glow.value.setHex(th.glow);
  backGroup.add(water);
}
function buildLevel(lvl) {
  if (lvlGroup) scene.remove(lvlGroup);
  lvlGroup = new THREE.Group(); scene.add(lvlGroup); dyn = []; gemMeshes = []; boostMeshes = []; keyMesh = bonusMesh = cpMesh = null; bonMeshes = [];
  applyTheme(lvl.world);
  for (const e of lvl.els) {
    if (e.t === 'p') {
      const ms = new THREE.Mesh(box, platMats[e.fp ? e.c : e.c]); ms.scale.set(e.w, e.h, BEAM_D); ms.position.set(e.x + e.w / 2, e.y - e.h / 2, 0);
      ms.receiveShadow = true; ms.castShadow = e.h < 3; lvlGroup.add(ms);
      { const cap = new THREE.Mesh(box, capMats[e.c]), t = 0.16, o = 0.06; cap.scale.set(1 + 2 * o / e.w, t / e.h, 1 + 2 * o / BEAM_D); cap.position.y = 0.5 - t / e.h / 2 + 0.012 / e.h; cap.receiveShadow = true; cap.visible = FX.chunky; ms.add(cap); ms.userData.cap = cap; }
      if (e.pad) for (let k = 0; k < 2; k++) { const a = new THREE.Mesh(cone, mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.3 })); a.scale.set(0.8, 0.6, 0.8); a.position.set(e.x + e.w / 2, e.y + 0.35 + k * 0.45, 0); a.rotation.y = Math.PI / 4; lvlGroup.add(a); e._arrows = (e._arrows || []).concat(a); }
      if (e.ma || e.fp || e.fall || e.pad) dyn.push({ e, ms }); e._ms = ms;
      if (e.bon) { ms.material = new THREE.MeshStandardMaterial({ color: HEX[e.c], emissive: HEX[e.c], emissiveIntensity: 0.3, transparent: true, opacity: 0.22, depthWrite: false }); ms.castShadow = false; ms.userData.cap.visible = false; bonMeshes.push(ms); }
    } else if (e.t === 'w') {
      const ms = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: HEX[e.c], transparent: true, opacity: 0.62, emissive: HEX[e.c], emissiveIntensity: 0.4, depthWrite: false }));
      ms.scale.set(0.18, e.h, BEAM_D + 0.15); ms.position.set(e.x, e.y + e.h / 2, 0); lvlGroup.add(ms);
    } else if (e.t === 's') {
      const n = Math.max(1, Math.round(e.w / 0.8));
      for (let k = 0; k < n; k++) { const sp = new THREE.Mesh(cone, mat(0x5f5866)); sp.position.set(e.x + 0.4 + k * 0.8, e.up ? e.y - 0.3 : e.y + 0.3, 0); if (e.up) sp.rotation.z = Math.PI; sp.castShadow = true; lvlGroup.add(sp);
        const sp2 = sp.clone(); sp2.position.z = 0.5; lvlGroup.add(sp2); const sp3 = sp.clone(); sp3.position.z = -0.5; lvlGroup.add(sp3); }
    } else if (e.t === 'e') {
      const ms = new THREE.Mesh(gemGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x9fe8ff, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.3, flatShading: true }));
      ms.position.set(e.x, e.y, 0); ms.castShadow = true; lvlGroup.add(ms); gemMeshes[e.k] = ms;
    } else if (e.t === 'b') {
      const ms = new THREE.Mesh(torus, new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffc94a, emissiveIntensity: 0.7 })); ms.position.set(e.x, e.y, 0); ms.rotation.y = Math.PI / 2; lvlGroup.add(ms); boostMeshes[e.k] = ms;
    } else if (e.t === 'K') {   // v1.4 hidden key: grab it in its colour
      const kg = new THREE.Group(), km = new THREE.MeshStandardMaterial({ color: HEX[e.c], emissive: HEX[e.c], emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.4 });
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 10, 24), km); bow.position.y = 0.25; kg.add(bow);
      const sh = new THREE.Mesh(roundBox(0.1, 0.5, 0.1, 0.04), km); sh.position.y = -0.12; kg.add(sh); const tooth = new THREE.Mesh(roundBox(0.18, 0.08, 0.08, 0.03), km); tooth.position.set(0.1, -0.3, 0); kg.add(tooth);
      kg.position.set(e.x, e.y, 0); lvlGroup.add(kg); keyMesh = kg;
    } else if (e.t === 'B') {
      const ms = new THREE.Mesh(gemGeo, new THREE.MeshStandardMaterial({ color: 0xfff1b0, emissive: 0xffc23c, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.4, flatShading: true }));
      ms.scale.setScalar(1.35); ms.position.set(e.x, e.y, 0); lvlGroup.add(ms); bonusMesh = ms;
    } else if (e.t === 'G') {
      const ms = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: 0xb48cff, emissive: 0x8a5cff, emissiveIntensity: 0.8, transparent: true, opacity: 0.45, depthWrite: false }));
      ms.scale.set(0.3, 12, BEAM_D + 0.3); ms.position.set(e.x, e.y + 3.5, 0); lvlGroup.add(ms);
      for (let k = 0; k < 3; k++) { const a = new THREE.Mesh(cone, new THREE.MeshBasicMaterial({ color: 0xffffff })); a.scale.setScalar(0.7); a.position.set(e.x, e.y + 1 + k * 2, BEAM_D / 2 + 0.2); a.rotation.z = e.k % 2 ? Math.PI : 0; lvlGroup.add(a); }
    }
  }
  // finish arch
  const f = new THREE.Group(), fy = lvl.els.filter(e => e.t === 'p' && e.x <= lvl.end && e.x + e.w >= lvl.end).map(e => e.y)[0] ?? 0;
  for (const z of [-1.2, 1.2]) { const p = new THREE.Mesh(box, mat(0xffffff)); p.scale.set(0.3, 5, 0.3); p.position.set(0, 2.5, z); p.castShadow = true; f.add(p); }
  for (let k = 0; k < 8; k++) { const t = new THREE.Mesh(box, mat(HEX[1 + (k % lvl.ncol)])); t.scale.set(0.35, 0.6, 2.8 / 8); t.position.set(0, 4.8, -1.2 + 0.175 + k * 0.35); f.add(t); }
  f.position.set(lvl.end, fy, 0); lvlGroup.add(f); finishMesh = f;
  // v1.4 checkpoint flag
  if (lvl.cp) { const fl = new THREE.Group(), pole = new THREE.Mesh(capsule(0.05, 2.6), mat(0xffffff)); pole.position.y = 1.4; fl.add(pole);
    const cloth = new THREE.Mesh(roundBox(0.8, 0.5, 0.05, 0.02), new THREE.MeshStandardMaterial({ color: 0xbfc6d0, emissive: 0xffffff, emissiveIntensity: 0.1 })); cloth.position.set(0.42, 2.4, 0); fl.add(cloth);
    fl.position.set(lvl.cp.x, lvl.cp.y, -0.6); lvlGroup.add(fl); cpMesh = cloth; }
  // v1.4 boss: a giant colour-shifting blob creature
  bossMesh = null;
  if (lvl.boss) { const bg = new THREE.Group(), bm = new THREE.MeshStandardMaterial({ color: HEX[1], emissive: HEX[1], emissiveIntensity: 0.35, roughness: 0.35 });
    const bodyB = new THREE.Mesh(new THREE.SphereGeometry(2.6, 32, 20), bm); bodyB.scale.set(1.2, 1, 0.9); bg.add(bodyB);
    const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }), dark = new THREE.MeshBasicMaterial({ color: 0x1b1e2a });
    for (const z of [-0.9, 0.9]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 14), white); e.position.set(2.2, 0.9, z); bg.add(e); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10), dark); pu.position.set(2.7, 0.9, z); bg.add(pu); }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.16, 8, 24, Math.PI), dark); mouth.position.set(2.7, -0.4, 0); mouth.rotation.set(0, Math.PI / 2, Math.PI); bg.add(mouth);
    for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 12), bm); sp.position.set(-1.6 + k * 0.9, 2.4 - Math.abs(k - 2) * 0.2, 0); sp.rotation.z = 0.3 - k * 0.15; bg.add(sp); }
    bg.userData.mat = bm; lvlGroup.add(bg); bossMesh = bg; }
  const lowY = Math.min(...lvl.els.filter(e => e.t === 'p').map(e => e.y)) - 3;
  buildBackdrop(lvl.world, lvl.end, lowY);
  buildReflection(lowY - 5);
}
const BEAM_D = 1.7;
// mirrored copy of the beams under the water plane (cheap planar reflection; skipped on low quality)
function buildReflection(wy) {
  if (reflGroup) scene.remove(reflGroup); reflGroup = new THREE.Group(); reflGroup.position.y = 2 * wy; reflGroup.scale.y = -1; scene.add(reflGroup);
  for (const e of level.els) if (e.t === 'p' && e._ms) { const m = new THREE.Mesh(box, e._ms.material); m.scale.copy(e._ms.scale); m.position.copy(e._ms.position); reflGroup.add(m); e._rm = m; }
  reflGroup.visible = Q.level >= 2;
}

// ---------- game state ----------
const MODE = { title: 0, play: 1, dead: 2, finish: 3, replay: 4 };
let mode = MODE.title, S = null, G = null, ghostScript = null, input = { held: false, jp: false, sw: 0 }, script = [], acc = 0, deadT = 0, finT = 0, lastCol = 1, paused = false, timeScale = 1, attract = null, runStats = null;
let switchPop = 0, stretch = 0, camVY = 0, camLX = 0, shake = 0, camY = 2, camX = 0, lastGrounded = true, squash = 0, emitAcc = 0, replayScript = null, replayIdx = 0, replayHeld = false;

// v1.4: level source (main 0-27, bosses 28-31, daily 100); keys stripped and checkpoints added per toggles
let dailyLvl = null;
function levelData(id) {
  const src = id === 100 ? dailyLvl : id >= 28 ? BOSSES[id - 28] : LEVELS[id];
  const l = JSON.parse(JSON.stringify(src)); delete l._b;
  if (!FX.keys) l.els = l.els.filter(e => !e.bon && e.t !== 'K' && e.t !== 'B');
  if (FX.checkpoints && l.end > 250) {
    const ps = l.els.filter(e => e.t === 'p' && !e.c && !e.ma && !e.fp && !e.fall && !e.pad && !e.bon && e.w >= 4 && e.x > l.end * 0.38 && e.x < l.end * 0.66);
    const firstG = Math.min(...l.els.filter(e => e.t === 'G').map(e => e.x), Infinity);
    const p = ps.filter(e => e.x + e.w < firstG || e.x > firstG + 30).sort((a, b) => Math.abs(a.x - l.end / 2) - Math.abs(b.x - l.end / 2))[0];
    if (p) l.cp = { x: p.x + Math.min(2, p.w / 2), y: p.y };
  }
  return l;
}
const bestKey = () => FX.tight ? 'bestT' : 'best', bestTimeKey = () => FX.tight ? 'bestTT' : 'bestTC';
let cpState = null, usedCp = false, combo = 0, runCombo = 0, lastBossCol = 0, assistK = 1, assistUsed = false, raceShown = false;
function startLevel(id, opts = {}) {
  level = prepare(levelData(id)); level.id = id; buildLevel(level);
  const ls = save.levels[id]; if (ls && ls.best && ls.bestTC === undefined) ls.bestTC = ls.bestTime;
  ghostScript = ls && ls[bestKey()] ? ls[bestKey()] : null;
  replayScript = opts.replay ? (ghostScript || null) : null;
  showScreen(null); $('hud').classList.add('on'); $('replayTag').classList.toggle('on', !!replayScript);
  restart(true);
  banner(`${level.name}<small>${level.boss ? 'Boss chase · match its colour to outrun it' : id === 100 ? 'Daily Dash · ' + level.daily : worldName(level.world) + ' · ' + (level.id % 7 + 1) + ' / 7'}</small>`);
  audio.start(level.world, FX.worlds); audio.alt = FX.worlds; audio.world = level.world;
  if (id === 0 && !save.tot.runs) { $('hint').classList.add('on'); setTimeout(() => $('hint').classList.remove('on'), 5000); }
}
function restart(first) {
  if (window.__deathAt) { window.__restartMs = performance.now() - window.__deathAt; window.__deathAt = 0; }
  S = newState(level); G = ghostScript && save.set.ghost && !replayScript ? { s: newState(level), i: 0, held: false } : null;
  cpState = null; usedCp = false; combo = 0; runCombo = 0; assistK = 1; assistUsed = false; lastBossCol = 0; $('hCombo').classList.remove('on');
  if (keyMesh) keyMesh.visible = true; if (bonusMesh) bonusMesh.visible = true; bonMeshes.forEach(m => { m.material.opacity = 0.22; m.material.depthWrite = false; });
  if (cpMesh) cpMesh.material.color.setHex(0xbfc6d0);
  $('hRace').classList.toggle('on', !!(G && FX.race)); $('hBoss').classList.toggle('on', !!level.boss); $('hAssist').classList.toggle('on', !!FX.assist); $('hKey').textContent = '';
  ghost.g.visible = !!G; script = []; acc = 0; input = { held: input.held, jp: false, sw: 0 }; replayIdx = 0; replayHeld = false;
  mode = replayScript ? MODE.replay : MODE.play; smoke.clear(); lastCol = 1; paintRunner(runner, 1); runner.g.visible = true;
  gemMeshes.forEach(m => m && (m.visible = true)); boostMeshes.forEach(m => m && (m.visible = true));
  AN.s = 1; AN.v = 0; AN.spin = 0; iris(); camX = S.x; camY = 2; timeScale = 1; save.tot.runs++; setAccent(1); updateHud(true);
}
// v1.4 checkpoint respawn: restore the snapshot taken at the flag (no time star, no ghost save)
function respawn() {
  if (!cpState || (replayScript && !replayScript.__test) || !FX.checkpoints) { restart(); return; }
  S = clone(cpState); usedCp = true; G = null; ghost.g.visible = false; $('hRace').classList.remove('on');
  mode = MODE.play; acc = 0; input = { held: false, jp: false, sw: 0 }; smoke.clear(); lastCol = S.col; paintRunner(runner, S.col); setAccent(S.col); runner.g.visible = true;
  gemMeshes.forEach((m, k) => m && (m.visible = !(S.gems & (1 << k)))); boostMeshes.forEach((m, k) => m && (m.visible = !(S.boosts & (1 << k))));
  if (keyMesh) keyMesh.visible = !S.key; combo = 0; AN.s = 1; AN.v = 0; AN.spin = 0; camX = S.x; camY = S.y + 1; iris(); updateHud(true);
}
function setAccent(c) { document.documentElement.style.setProperty('--accent', CSS[c]); }
function scriptInput(sc, st, sim) {
  let jp = false, sw = 0;
  while (sim.i < sc.length && sc[sim.i][0] <= st.step) { const k = sc[sim.i][1]; if (k === 'd') { jp = true; sim.held = true; } else if (k === 'u') sim.held = false; else sw++; sim.i++; }
  return { jp, jh: sim.held, sw };
}
const replaySim = { i: 0, held: false };
function simStep() {
  let inp;
  if (mode === MODE.replay) { if (S.step === 0) { replaySim.i = 0; replaySim.held = false; } inp = scriptInput(replayScript, S, replaySim); }
  else {
    const jh = input.held || input.jp;
    inp = { jp: input.jp, jh, sw: input.sw };
    if (input.jp) script.push([S.step, 'd']);
    for (let k = 0; k < input.sw; k++) script.push([S.step, 's']);
    if (!jh && input.wasHeld) script.push([S.step, 'u']);
    if (input.jp && !input.held) { script.push([S.step + 1, 'u']); input.wasHeld = false; } else input.wasHeld = jh;
    input.jp = false; input.sw = 0;
  }
  const pre = { g: S.grounded, gems: S.gems, boosts: S.boosts, gs: S.gs, jn: S.jumpsN, col: S.col, pad: S.padT, sv: S.saves, vy: S.vy, key: S.key, bonus: S.bonus, wall: S.onWall };
  step(S, level, inp);
  if (G && !G.s.dead && !G.s.fin) step(G.s, level, scriptInput(ghostScript, G.s, G));
  // events -> juice
  if (S.col !== pre.col) onSwitch(S.col);
  if (S.jumpsN > pre.jn) { AN.antic = 0.07; AN.v += 9; if (!pre.g) AN.spin = 1; audio.sfxPlay('jump', pre.g ? 0 : 1); stretch = 1; if (!pre.g) puff(8, S.col); else dust(0.6); if (mode !== MODE.replay) save.tot.jumps++; }
  if (S.grounded && !pre.g) { AN.v -= 6 + Math.min(10, Math.abs(pre.vy || 0) * 0.45); if (FX.land) landRing(S.x, S.y, Math.min(1.5, 0.6 + Math.abs(pre.vy || 0) / 18)); squash = 1; if (pre.vy && Math.abs(pre.vy) > 14) shake = Math.max(shake, 0.15); audio.sfxPlay('land'); cubes.burst(S.x - 0.3, S.y, 0xffffff, save.set.reduced ? 2 : 5, { v: 4, s: 0.06, life: 0.4, g: 20 }); dust(Math.min(1.6, 0.6 + Math.abs(pre.vy) / 22)); squash = Math.min(1.2, 0.5 + Math.abs(pre.vy) / 30); }
  if (S.padT && !pre.pad) { audio.sfxPlay('pad'); puff(14, S.col); }
  if (S.gems !== pre.gems) { const k = Math.log2(S.gems ^ pre.gems); const gm = gemMeshes[k]; if (gm) { gm.visible = false; cubes.burst(gm.position.x, gm.position.y - 0.5, 0x9fe8ff, 18, { v: 6, s: 0.1, g: 6, life: 0.9 }); if (FX.land) { cubes.burst(gm.position.x, gm.position.y - 0.5, 0xffffff, save.set.reduced ? 6 : 14, { v: 9, s: 0.07, g: 2, life: 0.6 }); landRing(gm.position.x, gm.position.y - 0.6, 1.2, 0x9fe8ff); } }
    if (FX.land) { const h = $('hGems'); h.classList.remove('bump'); void h.offsetWidth; h.classList.add('bump'); } audio.sfxPlay('gem'); }
  if (S.boosts !== pre.boosts) { const k = Math.log2(S.boosts ^ pre.boosts); if (boostMeshes[k]) boostMeshes[k].visible = false; audio.sfxPlay('boost'); }
  if (S.saves > (pre.sv || 0) && mode === MODE.play) { banner('<small>close one!</small>'); audio.sfxPlay('star', 0); }
  if (S.gs !== pre.gs) { audio.sfxPlay('grav'); shake = 0.3; }
  if (S.padT > 0) S.padT -= DT;
  // v1.4 events
  if (S.grounded && !pre.g) { combo = 0; $('hCombo').classList.remove('on'); }
  if (S.onWall && !pre.wall) { dust(0.5); audio.sfxPlay('land'); }
  if (S.key && !pre.key) { if (keyMesh) { keyMesh.visible = false; cubes.burst(keyMesh.position.x, keyMesh.position.y, HEX[S.col], 20, { v: 7, s: 0.1, g: 6, life: 0.9 }); } bonMeshes.forEach(m => { m.material.opacity = 0.95; m.material.depthWrite = true; }); audio.sfxPlay('key'); banner('🗝<small>Key found! A <b>bonus route</b> opened above</small>'); $('hKey').textContent = '🗝'; }
  if (S.bonus && !pre.bonus) { if (bonusMesh) { bonusMesh.visible = false; cubes.burst(bonusMesh.position.x, bonusMesh.position.y, 0xffc23c, 26, { v: 8, s: 0.12, g: 5, life: 1 }); } audio.sfxPlay('gem'); audio.sfxPlay('star', 2); $('hKey').textContent = '💎'; }
  if (level.cp && !cpState && S.grounded && S.x >= level.cp.x && !S.dead && (mode === MODE.play || (replayScript && replayScript.__test))) { cpState = clone(S); if (cpMesh) cpMesh.material.color.setHex(HEX[S.col]); audio.sfxPlay('flag'); banner('<small>Checkpoint!</small>'); }
  if (level.boss) { const bc = bossCol(level, S.t); if (bc !== lastBossCol) { if (lastBossCol) audio.sfxPlay('boss'); lastBossCol = bc; } }
  if (S.dead) onDeath(); else if (S.fin) onFinish();
}
function onSwitch(c) {
  switchPop = 1;
  // v1.4 mid-air colour-swap combo
  if (FX.combo && !S.grounded && mode !== MODE.title) { combo++; runCombo = Math.max(runCombo, combo);
    if (combo >= 2) { const h = $('hCombo'); h.textContent = '×' + combo; h.classList.add('on'); h.classList.remove('pop'); void h.offsetWidth; h.classList.add('pop'); setTimeout(() => h.classList.remove('pop'), 140); audio.sfxPlay('combo', combo); } }
  audio.sfxPlay('switch', c); setAccent(c); paintRunner(runner, c); puff(save.set.reduced ? 6 : 14, c);
  ring.visible = true; ringT = 0; ringMat.color.setHex(HEX[c]); if (mode !== MODE.replay) save.tot.switches++;
  ring2.visible = true; ring2T = 0; ring2Mat.color.setHex(HEX[c]); flash(CSS[c], 0.16); skyPulse = 1; shake = Math.max(shake, 0.12);
  cubes.burst(S.x, S.y + S.gs * 0.7, HEX[c], save.set.reduced ? 4 : 10, { v: 7, s: 0.08, g: 4, life: 0.5 });
}
function dust(k) {   // landing / take-off dust: soft clouds rolling out both ways along the beam
  const n = Math.round((save.set.reduced ? 4 : 9) * k);
  for (let i = 0; i < n; i++) { const dir = i % 2 ? 1 : -1; smoke.emit(S.x + dir * 0.2, S.y + S.gs * 0.1, (Math.random() - .5) * 1.2, 0xe9edf3, { vx: dir * (1.5 + Math.random() * 2.5) * k, vy: S.gs * (0.2 + Math.random() * 0.6), s: 0.3 + Math.random() * 0.3, gs: 1.4 * k, life: 0.45 + Math.random() * 0.35, a: 0.9 }); }
}
function puff(n, c) { for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2; smoke.emit(S.x + Math.cos(a) * 0.4, S.y + S.gs * 0.8 + Math.sin(a) * 0.5, (Math.random() - .5), HEX[c], { vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, s: 0.4, gs: 1.6, life: 0.6 + Math.random() * 0.4 }); } }
let deathStreak = {};
function onDeath() {
  window.__deaths = (window.__deaths || []).concat([[level.id, S.cause, +S.x.toFixed(1), +S.y.toFixed(1), S.step]]);
  window.__deathAt = performance.now();
  mode = MODE.dead; deadT = 0; runner.g.visible = false; audio.sfxPlay('shatter'); shake = 0.6; hitStop = 0.06; flash('#ffffff', 0.35);
  const why = { caught: 'Caught! <b>Match its colour</b> to pull away', color: 'Match the colour, <b>tap left</b> before you touch it', spike: 'Spikes! <b>Jump</b> over them', crash: '<b>Jump</b> sooner to clear that ledge', fall: 'Hold <b>jump</b> longer, or double-jump' }[S.cause];
  deathStreak = (deathStreak.id === level.id ? deathStreak : { id: level.id, n: 0 }); deathStreak.n++;
  if (why && !replayScript && (deathStreak.n <= 2 || deathStreak.n % 4 === 0)) setTimeout(() => mode === MODE.play && banner('<small>' + why + '</small>'), 280);
  cubes.burst(S.x, S.y - (S.gs < 0 ? 1.4 : 0), HEX[S.col], save.set.reduced ? 26 : 50); cubes.burst(S.x, S.y, 0xffffff, 12);
  if (!replayScript) { save.tot.deaths++; if (save.tot.deaths >= 50) ach('deaths50'); }
}
function onFinish() {
  mode = MODE.finish; finT = 0; audio.sfxPlay('finish');
  for (let k = 0; k < 4; k++) cubes.burst(level.end, S.y + 3, HEX[1 + (k % level.ncol)], 16, { v: 10, s: 0.15, g: 10, life: 2 });
  if (replayScript && !replayScript.__test) return;
  const r = { gems: S.gems, switches: S.switches, time: S.t }, st = starsFor(level, r);
  if (usedCp) st[2] = false;
  let race = null; const gt = G ? ((save.levels[level.id] || {})[bestTimeKey()]) : undefined; if (FX.race && gt !== undefined && !usedCp) race = r.time - gt;
  if (level.id === 100) {   // v1.4 Daily Dash: streak + today's best
    const d = save.daily, today = level.daily, y = dayStr(-1);
    if (d.last !== today) { d.streak = d.last === y ? d.streak + 1 : 1; d.last = today; }
    const first = d.best[today] === undefined; if (first || r.time < d.best[today]) d.best[today] = r.time;
    Object.keys(d.best).sort().slice(0, -14).forEach(k => delete d.best[k]); persist();
    runStats = { r, st, first, daily: true, combo: runCombo, race: null }; return;
  }
  const ls = lvSave(level.id);
  if (S.bonus) { if (!ls.bonus) toast('💎 <b>Bonus gem!</b> · secret route found'); ls.bonus = true; }
  if (!usedCp) { const bk = bestKey(), tk = bestTimeKey(); if (ls[tk] === undefined || r.time < ls[tk]) { ls[tk] = r.time; ls[bk] = (replayScript && replayScript.__test ? replayScript : script).slice(); } }
  const first = !ls.done; ls.done = true; ls.gems |= S.gems; ls.stars = ls.stars.map((v, i) => v || st[i]);
  if (!usedCp && (ls.bestTime === undefined || r.time < ls.bestTime)) ls.bestTime = r.time;
  if (ls.fewestSw === undefined || r.switches < ls.fewestSw) ls.fewestSw = r.switches;
  save.tot.finishes++;
  ach('first'); if (totalGems() >= 10) ach('gems10'); if (st.every(Boolean)) ach('perfect'); if (save.tot.switches >= 500) ach('switch500');
  for (let w = 0; w < 4; w++) if (LEVELS.filter(l => l.world === w).every(l => lvSave(l.id).done)) ach('w' + (w + 1));
  if (totalStars() === 84) ach('all3');
  persist();
  runStats = { r, st, first, combo: runCombo, race, cp: usedCp, assist: assistUsed };
}
function ach(id) { if (save.ach[id]) return; save.ach[id] = Date.now(); const a = ACH.find(x => x.id === id); toast(`${a.i} <b>${a.n}</b> · ${a.d}`); persist(); }
function toast(html) { const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = html; $('toasts').appendChild(d); setTimeout(() => d.remove(), 3100); }
function banner(html) { const b = $('banner'); b.innerHTML = html; b.classList.add('on'); clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.remove('on'), 1800); }

function showResults() {
  const { r, st } = runStats, ls = level.id === 100 ? { bestTime: save.daily.best[level.daily] } : lvSave(level.id);
  $('rTitle').textContent = (level.id === 100 ? 'Daily Dash' : level.name) + ' clear!';
  $('rStars').innerHTML = st.map((v, i) => v ? `<i style="animation-delay:${0.15 + i * 0.2}s">★</i>` : '★').join('');
  st.forEach((v, i) => v && setTimeout(() => audio.sfxPlay('star', i), 150 + i * 200));
  const g = (ok, label, val) => `<div class="goal ${ok ? 'ok' : ''}"><span>${label}</span><b>${val}</b></div>`;
  $('rGoals').innerHTML = g(st[0], 'Collect all 3 gems', '◆'.repeat(popc(r.gems)) + '◇'.repeat(3 - popc(r.gems))) +
    g(st[1], `Switch colour ${level.par} times or fewer`, r.switches) + g(st[2], `Finish under ${level.target.toFixed(1)}s`, r.time.toFixed(2) + 's') +
    `<div class="goal"><span>Best time</span><b style="color:var(--ink)">${ls.bestTime !== undefined ? ls.bestTime.toFixed(2) + 's' : '—'}</b></div>` +
    (runStats.combo >= 2 ? `<div class="goal ok"><span>Best mid-air combo</span><b>×${runStats.combo}</b></div>` : '') +
    (runStats.race !== null && runStats.race !== undefined ? `<div class="goal ${runStats.race < 0 ? 'ok' : ''}"><span>${runStats.race < 0 ? 'You beat your ghost!' : 'Ghost wins this time'}</span><b>${runStats.race < 0 ? '−' : '+'}${Math.abs(runStats.race).toFixed(2)}s</b></div>` : '') +
    (S.bonus ? '<div class="goal ok"><span>Secret bonus gem</span><b>💎</b></div>' : '') +
    (runStats.daily ? `<div class="goal ok"><span>Daily streak</span><b>🔥 ${save.daily.streak} day${save.daily.streak === 1 ? '' : 's'}</b></div>` : '') +
    (runStats.cp ? '<div class="goal"><span>Checkpoint used (no time star)</span><b>⚑</b></div>' : '') + (runStats.assist ? '<div class="goal"><span>Assist mode</span><b>✓</b></div>' : '');
  $('rNext').style.display = nextId() !== null ? '' : 'none'; $('rWatch').style.display = level.id === 100 ? 'none' : '';
  showScreen('results');
}

// ---------- input ----------
function jumpDown() { audio.unlock(); if (mode === MODE.replay) { stopReplay(); return; } if (mode !== MODE.play || paused) return; input.jp = true; input.held = true; }
function jumpUp() { input.held = false; }
function switchTap() { audio.unlock(); if (mode === MODE.replay) { stopReplay(); return; } if (mode !== MODE.play || paused) return; input.sw++; }
function stopReplay() { replayScript = null; $('replayTag').classList.remove('on'); showResultsOrLevels(); }
function showResultsOrLevels() { mode = MODE.title; $('hud').classList.remove('on'); if (runStats) showResults(); else openLevels(level.world); }
const pointers = new Map();
const cv = renderer.domElement;
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); if (!$('hud').classList.contains('on')) { audio.unlock(); return; }
  tapFx(e.clientX, e.clientY); const rc = cv.getBoundingClientRect(); if (e.clientX >= rc.left + rc.width / 2) { pointers.set(e.pointerId, 'j'); jumpDown(); } else { pointers.set(e.pointerId, 's'); switchTap(); }
}, { passive: false });
const pUp = e => { if (pointers.get(e.pointerId) === 'j') { pointers.delete(e.pointerId); if (![...pointers.values()].includes('j')) jumpUp(); } else pointers.delete(e.pointerId); };
cv.addEventListener('pointerup', pUp); cv.addEventListener('pointercancel', pUp);
document.addEventListener('touchmove', e => { if (!e.target.closest('.card')) e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
const JK = ['Space', 'ArrowUp', 'KeyW', 'KeyK', 'ArrowRight', 'KeyL'], SK = ['ArrowLeft', 'KeyA', 'KeyJ', 'ShiftLeft', 'ShiftRight', 'KeyF', 'ArrowDown', 'KeyS'];
addEventListener('keydown', e => {
  if (e.repeat) { if (JK.includes(e.code) || SK.includes(e.code)) e.preventDefault(); return; }
  if (JK.includes(e.code)) { e.preventDefault(); if ($('hud').classList.contains('on')) jumpDown(); else if (e.code === 'Space' && $('title').classList.contains('on')) openLevels(); }
  else if (SK.includes(e.code)) { e.preventDefault(); if ($('hud').classList.contains('on')) switchTap(); }
  else if (e.code === 'Escape' || e.code === 'KeyP') { if (mode === MODE.play) setPause(!paused); }
  else if (e.code === 'KeyR' && mode === MODE.play && !paused) restart();
});
addEventListener('keyup', e => { if (JK.includes(e.code)) jumpUp(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === MODE.play) setPause(true); if (document.hidden) persist(); });


// ---------- v1.1 game controller (Gamepad API; works over AirPlay to Apple TV with a Bluetooth pad) ----------
const GP = { prev: [], focus: null, navT: 0 };
const GP_JUMP = [0, 1, 5, 7, 12], GP_SW = [2, 3, 4, 6, 13];
function activeScreen() { for (const id of ['pause', 'results', 'stats', 'wardrobe', 'settings', 'levels', 'title']) if ($(id).classList.contains('on')) return $(id); return null; }
function gpButtons(scr) { return [...scr.querySelectorAll('button, a.pill, input')].filter(b => b.offsetParent !== null && !b.disabled); }
function gpMove(dx, dy) {
  const scr = activeScreen(); if (!scr) return; const list = gpButtons(scr); if (!list.length) return;
  if (!GP.focus || !list.includes(GP.focus)) { gpSetFocus(list.find(b => b.id === 'bPlay' || b.id === 'pResume' || b.id === 'rNext' && b.style.display !== 'none') || list[0]); return; }
  const r0 = GP.focus.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  let best = null, bd = 1e9;
  for (const b of list) { if (b === GP.focus) continue; const r = b.getBoundingClientRect(), x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy;
    const along = x * dx + y * dy; if (along <= 4) continue; const d = along + Math.abs(x * dy - y * dx) * 2.5; if (d < bd) { bd = d; best = b; } }
  if (best) gpSetFocus(best);
}
function gpSetFocus(b) { if (GP.focus) GP.focus.classList.remove('gpfocus'); GP.focus = b; if (b) { b.classList.add('gpfocus'); b.scrollIntoView && b.scrollIntoView({ block: 'nearest' }); } }
function gpBack() { for (const id of ['pResume', 'sClose', 'stClose', 'wClose', 'rLevels', 'bBack1']) { const b = $(id); if (b && b.offsetParent !== null) { b.click(); return; } } }
function pollPad(dt) {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []; if (!pads.length) return;
  const p = pads[0], bt = i => !!(p.buttons[i] && p.buttons[i].pressed), was = i => !!GP.prev[i], pressed = i => bt(i) && !was(i);
  const hud = $('hud').classList.contains('on') && !paused;
  if (hud) {
    if (GP_JUMP.some(pressed)) jumpDown();
    const held = GP_JUMP.some(bt); if (!held && GP_JUMP.some(was)) jumpUp();
    if (GP_SW.some(pressed)) switchTap();
    if (pressed(9) || pressed(8)) { if (mode === MODE.play) setPause(true); else if (mode === MODE.replay) stopReplay(); }
  } else {
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0; GP.navT -= dt;
    let dx = (bt(15) ? 1 : 0) - (bt(14) ? 1 : 0) + (Math.abs(ax) > 0.55 ? Math.sign(ax) : 0), dy = (bt(13) ? 1 : 0) - (bt(12) ? 1 : 0) + (Math.abs(ay) > 0.55 ? Math.sign(ay) : 0);
    if (GP.focus && GP.focus.type === 'range' && dx && !dy) dx = 0;
    if ((dx || dy) && GP.navT <= 0) { gpMove(Math.sign(dx), dx ? 0 : Math.sign(dy)); GP.navT = 0.22; } else if (!dx && !dy) GP.navT = 0;
    if (pressed(0)) { const scr = activeScreen(); if (!GP.focus || !scr || !gpButtons(scr).includes(GP.focus)) gpMove(0, 0); else if (GP.focus.type === 'checkbox') { GP.focus.checked = !GP.focus.checked; GP.focus.dispatchEvent(new Event('change')); GP.focus.dispatchEvent(new Event('input', { bubbles: true })); } else if (GP.focus.type === 'range') { /* use left/right */ } else GP.focus.click(); }
    if (GP.focus && GP.focus.type === 'range' && (pressed(14) || pressed(15))) { GP.focus.value = +GP.focus.value + (pressed(15) ? 10 : -10); GP.focus.dispatchEvent(new Event('input', { bubbles: true })); }
    if (pressed(1)) gpBack();
    if (pressed(9) && paused) setPause(false);
  }
  GP.prev = p.buttons.map(b => b.pressed);
}
addEventListener('gamepadconnected', () => toast('🎮 <b>Controller connected</b> · A jump · X change colour'));

// ---------- UI ----------
function showScreen(id) { ['title', 'levels', 'pause', 'results', 'stats', 'wardrobe', 'settings'].forEach(s => $(s).classList.toggle('on', s === id)); }
const click = f => () => { audio.unlock(); audio.sfxPlay('click'); f(); };
function audioPanel(el) {
  el.innerHTML = `<label class="row"><span>Music</span><input type="checkbox" data-k="musicOn"><input type="range" min="0" max="100" data-k="music"></label>
  <label class="row"><span>Sound effects</span><input type="checkbox" data-k="sfxOn"><input type="range" min="0" max="100" data-k="sfx"></label>
  <label class="row"><span>Brightness</span><input type="range" min="60" max="140" data-k="bright"></label>`;
  el.querySelectorAll('input').forEach(i => {
    const k = i.dataset.k; if (i.type === 'checkbox') i.checked = save.set[k]; else i.value = Math.round(save.set[k] * 100);
    i.addEventListener('input', () => { audio.unlock(); save.set[k] = i.type === 'checkbox' ? i.checked : i.value / 100; if (k === 'bright') applyBright(); else { audio[k] = save.set[k]; audio.apply(); } persist(); syncAudioPanels(); if (k === 'sfx' || k === 'sfxOn') audio.sfxPlay('click'); });
  });
}
function syncAudioPanels() { document.querySelectorAll('.audio input').forEach(i => { const k = i.dataset.k; if (i.type === 'checkbox') i.checked = save.set[k]; else if (document.activeElement !== i) i.value = Math.round(save.set[k] * 100); }); }
document.querySelectorAll('.audio').forEach(audioPanel);
function setPause(p) {
  paused = p; persist(); if (p) { $('optGhost').checked = save.set.ghost; syncAudioPanels(); showScreen('pause'); } else { showScreen(null); input.held = false; }
}
let curWorld = 0;
function openLevels(w = curWorld) {
  mode = MODE.title; $('hud').classList.remove('on'); paused = false; curWorld = Math.max(0, Math.min(3, w)); attractWorld(curWorld);
  const lv = LEVELS.filter(l => l.world === curWorld), ws = lv.reduce((a, l) => a + starCount(l.id), 0);
  $('wName').textContent = `${curWorld + 1}. ${worldName(curWorld)}`; $('wStars').textContent = `★ ${ws} / 21`;
  $('lgrid').innerHTML = lv.map(l => { const s = save.levels[l.id], ul = unlocked(l.id);
    return `<button class="lv ${ul ? '' : 'locked'}" data-id="${l.id}"><div class="n">${ul ? l.id % 7 + 1 : '🔒'}</div><div class="nm">${l.name}</div><div class="st">${[0, 1, 2].map(i => s && s.stars[i] ? '<i>★</i>' : '★').join('')}</div><div class="bt">${s && s.bestTime ? s.bestTime.toFixed(2) + 's' : '&nbsp;'}${FX.keys && l.els.some(e => e.t === 'K') ? ` <span class="key">${s && s.bonus ? '💎' : '🗝'}</span>` : ''}</div></button>`; }).join('') +
    (FX.boss ? (() => { const b = BOSSES[curWorld], s = save.levels[b.id], ul = lv.every(l => lvSave(l.id).done) || !!(s && s.done);
      return `<button class="lv boss ${ul ? '' : 'locked'}" data-id="${b.id}"><div class="n">${ul ? '👾' : '🔒'}</div><div class="nm">${b.name}</div><div class="st">${[0, 1, 2].map(i => s && s.stars[i] ? '<i>★</i>' : '★').join('')}</div><div class="bt">${s && s.bestTime ? s.bestTime.toFixed(2) + 's' : 'Boss'}</div></button>`; })() : '');
  $('lgrid').querySelectorAll('.lv').forEach(b => b.onclick = click(() => { const id = +b.dataset.id; if (id >= 28 ? !b.classList.contains('locked') : unlocked(id)) startLevel(id); else toast(id >= 28 ? 'Finish all 7 levels to face the boss' : 'Finish the level before it to unlock'); }));
  showScreen('levels');
}
$('bPlay').onclick = click(() => { const next = LEVELS.find(l => !lvSave(l.id).done && unlocked(l.id)); openLevels(next ? next.world : 0); });
$('bBack1').onclick = click(() => goTitle());
$('wPrev').onclick = click(() => openLevels(curWorld - 1)); $('wNext').onclick = click(() => openLevels(curWorld + 1));
$('bPause').onclick = e => { e.stopPropagation(); audio.sfxPlay('click'); if (mode === MODE.play) setPause(true); else if (mode === MODE.replay) stopReplay(); };
$('pResume').onclick = click(() => setPause(false));
$('pRestart').onclick = click(() => { setPause(false); restart(); });
$('pQuit').onclick = click(() => { setPause(false); runStats = null; openLevels(level.world); });
applyFx(); document.querySelectorAll('[data-fx]').forEach(i => { i.checked = FX[i.dataset.fx]; i.onchange = () => { FX[i.dataset.fx] = i.checked; applyFx(); persist(); if (i.dataset.fx === 'outfits') { dressRunner(runner); dressRunner(ghost); paintRunner(runner, lastCol); } if (i.dataset.fx === 'worlds' && mode === MODE.title) { level = null; attractWorld(0); } }; });
$('optGhost').onchange = () => { save.set.ghost = $('optGhost').checked; persist(); };
$('optGhost2').onchange = () => { save.set.ghost = $('optGhost2').checked; persist(); };
$('optReduced').onchange = () => { save.set.reduced = $('optReduced').checked; applyQuality(); persist(); };
$('bSettings').onclick = click(() => { $('optReduced').checked = save.set.reduced; $('optGhost2').checked = save.set.ghost; syncAudioPanels(); showScreen('settings'); });
$('sClose').onclick = click(() => goTitle());
$('rRetry').onclick = click(() => { runStats = null; startLevel(level.id); });
$('rWatch').onclick = click(() => startLevel(level.id, { replay: true }));
$('rLevels').onclick = click(() => { runStats = null; if (level.id === 100) goTitle(); else openLevels(level.world); });
function nextId() { const id = level.id; if (id === 100) return null; if (id >= 28) return id - 28 < 3 ? (id - 27) * 7 : null; if (FX.boss && id % 7 === 6) return 28 + Math.floor(id / 7); return id < 27 ? id + 1 : null; }
$('rNext').onclick = click(() => { runStats = null; startLevel(nextId()); });
$('bStats').onclick = click(() => { renderStats(); showScreen('stats'); });
$('stClose').onclick = click(() => goTitle());
$('bWardrobe').onclick = click(() => { renderWardrobe(); showScreen('wardrobe'); });
$('wClose').onclick = click(() => goTitle());
function goTitle() { if (typeof updateDailyInfo === 'function') updateDailyInfo(); persist(); mode = MODE.title; $('hud').classList.remove('on'); showScreen('title'); $('starTotal').textContent = `★ ${totalStars()} / 84`; attractWorld(0); audio.stop(); }
function renderStats() {
  const t = save.tot, done = LEVELS.filter(l => lvSave(l.id).done).length;
  const fmt = s => s > 3600 ? (s / 3600).toFixed(1) + 'h' : Math.round(s / 60) + 'm';
  const st = [['★ ' + totalStars() + '/84', 'Stars'], [totalGems() + '/84', 'Gems'], [done + '/28', 'Levels cleared'], [t.deaths, 'Shatters'], [t.jumps, 'Jumps'], [t.switches, 'Colour switches'], [fmt(t.play), 'Play time'], [t.finishes, 'Finishes']];
  $('statGrid').innerHTML = st.map(([b, s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join('') +
    `<div class="stat" style="grid-column:1/-1;text-align:left"><span>Best times &amp; fewest switches</span><div style="font-size:13px;columns:2;margin-top:6px">${LEVELS.map(l => { const s = save.levels[l.id]; return `<div>${l.world + 1}-${l.id % 7 + 1} ${l.name}: ${s && s.bestTime ? s.bestTime.toFixed(2) + 's · ' + s.fewestSw + ' sw' : '—'}</div>`; }).join('')}</div></div>`;
  $('achList').innerHTML = '<h3>Achievements</h3>' + ACH.map(a => `<div class="ach ${save.ach[a.id] ? 'got' : ''}"><i>${a.i}</i><div><b>${a.n}</b><br><small>${a.d}</small></div></div>`).join('');
}
function renderWardrobe() {
  const ts = totalStars();
  const item = (it, kind, sw) => `<button class="wi ${save.look[kind] === it.id ? 'sel' : ''} ${ts < it.stars ? 'locked' : ''}" data-k="${kind}" data-id="${it.id}" data-s="${it.stars}"><div class="sw" style="background:${sw}"></div>${it.name}<small>${ts < it.stars ? '★ ' + it.stars : 'unlocked'}</small></button>`;
  const hx = n => '#' + n.toString(16).padStart(6, '0');
  $('wOutfit').innerHTML = OUTFITS.map(o => item(o, 'outfit', 'linear-gradient(90deg,#d6246e,#e2a21d)')).join('');
  $('wBoard').innerHTML = BOARDS.map(b => item(b, 'board', `linear-gradient(90deg,${hx(b.c)} 60%,${hx(b.s)} 60%)`)).join('');
  const gs = allGems(), gi = (it, kind, sw) => `<button class="wi ${save.look[kind] === it.id ? 'sel' : ''} ${gs < it.gems ? 'locked' : ''}" data-k="${kind}" data-id="${it.id}" data-g="${it.gems}"><div class="sw" style="background:${sw}"></div>${it.name}<small>${gs < it.gems ? '◆ ' + it.gems : 'unlocked'}</small></button>`;
  $('wScarf').innerHTML = SCARVES.map(o => gi(o, 'scarf', o.c === undefined ? '#e6e9ee' : hx(o.c))).join('');
  $('wTrail').innerHTML = TRAILS.map(o => gi(o, 'trail', o.id === 'rainbow' ? 'linear-gradient(90deg,#f0367f,#f7b520,#26c6da)' : o.c === undefined ? 'linear-gradient(90deg,#f0367f,#26c6da)' : hx(o.c))).join('');
  document.querySelectorAll('.wi').forEach(b => b.onclick = click(() => {
    if (b.dataset.g !== undefined && gs < +b.dataset.g) { toast(`Collect ${b.dataset.g} gems to unlock`); return; }
    if (b.dataset.s !== undefined && ts < +b.dataset.s) { toast(`Collect ${b.dataset.s} stars to unlock`); return; }
    save.look[b.dataset.k] = b.dataset.id; persist(); dressRunner(runner); dressRunner(ghost); paintRunner(runner, lastCol); renderWardrobe();
  }));
}
function applyQuality() {
  scene.remove(smoke.mesh); smoke = new Smoke(save.set.reduced ? 140 : 360);
  setQuality(save.set.reduced ? 1 : 3);
}

// attract mode on menus: runner rides through an endless course with its smoke trail
function attractWorld(w) {
  const lvl = LEVELS[w * 7]; if (level !== lvl) { level = prepare(lvl); buildLevel(level); }
  S = newState(level); S.col = 1; attract = { t: 0, sw: 3 }; paintRunner(runner, 1); runner.g.visible = true; ghost.g.visible = false; G = null;
}

// v1.4 Assist: slight slow-mo when a gap, spike or wrong-colour gate is just ahead
function assistTricky() {
  const x0 = S.x + 1, x1 = S.x + 5;
  for (const e of level.els) { const ex1 = e.x + (e.w || 0.3); if (ex1 < x0 || e.x > x1) continue;
    if (e.t === 's' || e.t === 'G' || (e.t === 'w' && e.c !== S.col)) return true; }
  const gx = S.x + 3; return !level.els.some(e => e.t === 'p' && !e.bon && e.x <= gx && e.x + e.w >= gx);
}
// v1.4 Photo mode: pause, orbit the camera round the runner, save a crisp PNG
let photo = null;
function enterPhoto() { photo = { yaw: -0.5, pitch: 0.18, dist: 8, drag: null, pts: new Map() }; showScreen(null); document.body.classList.add('photo'); $('photoUI').classList.add('on'); }
function exitPhoto() { photo = null; document.body.classList.remove('photo'); $('photoUI').classList.remove('on'); setPause(true); }
cv.addEventListener('pointerdown', e => { if (!photo) return; photo.pts.set(e.pointerId, [e.clientX, e.clientY]); });
cv.addEventListener('pointermove', e => { if (!photo || !photo.pts.has(e.pointerId)) return; const pr = photo.pts.get(e.pointerId);
  if (photo.pts.size === 1) { photo.yaw -= (e.clientX - pr[0]) * 0.008; photo.pitch = Math.max(-0.5, Math.min(1.3, photo.pitch + (e.clientY - pr[1]) * 0.006)); }
  else { const o = [...photo.pts.entries()].find(([k]) => k !== e.pointerId)[1], d0 = Math.hypot(pr[0] - o[0], pr[1] - o[1]), d1 = Math.hypot(e.clientX - o[0], e.clientY - o[1]); photo.dist = Math.max(3, Math.min(22, photo.dist * d0 / Math.max(1, d1))); }
  photo.pts.set(e.pointerId, [e.clientX, e.clientY]); });
const phUp = e => photo && photo.pts.delete(e.pointerId); cv.addEventListener('pointerup', phUp); cv.addEventListener('pointercancel', phUp);
cv.addEventListener('wheel', e => { if (!photo) return; e.preventDefault(); photo.dist = Math.max(3, Math.min(22, photo.dist * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });
function savePhoto() {
  const pr = renderer.getPixelRatio(), q = Q.level; renderer.setPixelRatio(Math.max(2, Math.min(3, devicePixelRatio || 1))); if (q < 2) { Q.level = 3; renderer.shadowMap.enabled = true; } resize(); sizePost();
  updateVisuals(0); renderFrame(); const url = renderer.domElement.toDataURL('image/png');
  Q.level = q; renderer.shadowMap.enabled = q >= 3; renderer.setPixelRatio(pr); resize(); sizePost();
  audio.sfxPlay('shutter'); flash('#ffffff', 0.6); window.__lastPhoto = url;
  const name = 'hue-dash-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.png';
  fetch(url).then(r => r.blob()).then(b => { const f = new File([b], name, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [f] }) && /iPhone|iPad|Android/.test(navigator.userAgent)) navigator.share({ files: [f], title: 'Hue Dash' }).catch(() => {});
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
    toast('📷 <b>Photo saved</b>'); });
}
$('pPhoto').onclick = click(enterPhoto); $('phClose').onclick = click(exitPhoto); $('phSave').onclick = click(savePhoto);
// v1.4 Daily Dash: one generated level per day (validated by the same solver the levels use), with a streak
function dayStr(off = 0) { const d = new Date(); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function updateDailyInfo() { const d = save.daily, live = d.last === dayStr() || d.last === dayStr(-1); $('dailyInfo').textContent = (d.best[dayStr()] !== undefined ? 'best ' + d.best[dayStr()].toFixed(2) + 's · ' : 'new today · ') + '🔥 ' + (live ? d.streak : 0); }
async function genDaily(day = dayStr()) {
  if (dailyLvl && dailyLvl.daily === day && dailyLvl.tight === FX.tight) return dailyLvl;
  const [{ build, SPECS }, { solve }] = await Promise.all([import('./gen.js?v=202610271655'), import('./solver.js?v=202610271655')]);
  const n = +day.replace(/-/g, ''); let h = n; for (let k = 0; k < 4; k++) h = (h * 1103515245 + 12345) % 2147483647;
  for (let a = 0; a < 8; a++) {
    const si = 3 + ((h + a * 7) % 25), spec = SPECS[si], w = Math.floor(si / 7);
    const l = build(w, ['Daily Dash', spec[1], Math.min(0.7, spec[2] + 0.05)], (h + a * 9973) % 1000000);
    const sol = solve(JSON.parse(JSON.stringify(l)));
    if (sol && sol.gems === 7) { l.par = sol.switches + 2; l.target = Math.ceil((sol.time + 0.8) * 10) / 10; l.daily = day; l.tight = FX.tight; l.id = 100; l.name = 'Daily Dash'; return dailyLvl = l; }
  }
  throw new Error('no daily level');
}
$('bDaily').onclick = click(async () => { toast('☀ <b>Building today\'s Dash…</b>'); try { await genDaily(); runStats = null; startLevel(100); } catch (e) { toast('Daily Dash unavailable today'); } });
// ---------- frame ----------
let last = performance.now(), fpsT = 0, frames = 0;
window.__fps = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const rawDt = Math.min(1, (now - last) / 1000); let dt = Math.min(0.05, rawDt); last = now;
  frames++; fpsT += dt; if (fpsT > 1) { window.__fps = frames / fpsT; frames = 0; fpsT = 0; }
  pollPad(dt);
  if (!level) return;
  if (mode === MODE.title && S) {
    // attract: hover along, auto-colour, and loop
    const ft = dt * 1.0; attract.t += ft; S.x += 8 * ft; S.y = 0.6 + Math.sin(attract.t * 1.3) * 0.35; S.grounded = false;
    attract.sw -= ft; if (attract.sw < 0) { attract.sw = 3 + Math.random() * 2; S.col = S.col === 1 ? 2 : 1; paintRunner(runner, S.col); setAccent(S.col); puff(10, S.col); ring.visible = true; ringT = 0; ringMat.color.setHex(HEX[S.col]); }
    if (S.x > level.end + 60) S.x = -20;
  } else if (mode === MODE.play || mode === MODE.replay) {
    if (FX.assist && mode === MODE.play && !paused) { const tk = assistTricky() ? 0.7 : 1; assistK += (tk - assistK) * Math.min(1, dt * 6); if (tk < 1) assistUsed = true; } else assistK = 1;
    if (hitStop > 0) hitStop -= dt; else if (!paused) { acc += dt * timeScale * assistK; let n = 0; while (acc >= DT && n < 12 && (mode === MODE.play || mode === MODE.replay)) { simStep(); acc -= DT; n++; } if (mode === MODE.play) save.tot.play += dt; }
  } else if (mode === MODE.dead) {
    deadT += dt; if (performance.now() - window.__deathAt > 300 || deadT > 0.3) { if (replayScript) { stopReplay(); } else respawn(); }
  } else if (mode === MODE.finish) {
    finT += dt; S.x += speedAt(level, S) * dt * Math.max(0.12, 1 - finT * 2);
    if (finT > 1.6) { mode = MODE.title; if (replayScript && !replayScript.__test) { stopReplay(); } else { $('hud').classList.remove('on'); showResults(); } }
  }
  updateVisuals(photo ? 0 : dt);
  if ((mode === MODE.play || mode === MODE.replay) && !paused) autoQuality(rawDt);
  renderFrame();
}
function updateVisuals(dt) {
  const t = S ? S.t : 0, sim = S;
  // dynamic platforms
  for (const d of dyn) {
    const e = d.e;
    if (e.ma || e.fall) d.ms.position.y = platY(e, t, sim) - e.h / 2;
    if (e.fp) { const ci = colorAt(e, t); d.ms.material = platMats[ci]; if (d.ms.userData.cap) d.ms.userData.cap.material = capMats[ci]; }
    if (e._rm) { e._rm.position.y = d.ms.position.y; e._rm.material = d.ms.material; }
    if (e._arrows) e._arrows.forEach((a, k) => { a.position.y = e.y + 0.35 + k * 0.45 + Math.sin(performance.now() / 200 + k) * 0.08; });
  }
  gemMeshes.forEach((m, k) => { if (m) { m.rotation.y += dt * 2; m.position.y = level.els.find(e => e.t === 'e' && e.k === k).y + Math.sin(performance.now() / 300 + k) * 0.12; } });
  boostMeshes.forEach(m => m && (m.rotation.x += dt * 3));
  if (finishMesh) finishMesh.rotation.y = 0;
  // runner
  const r = runner.g, gs = sim.gs;
  r.position.set(sim.x, sim.y, 0);
  r.rotation.x = gs < 0 ? Math.PI : 0;
  squash = Math.max(0, squash - dt * 5); stretch = Math.max(0, stretch - dt * 5); switchPop = Math.max(0, switchPop - dt * 4);
  const air = !sim.grounded && mode !== MODE.title;
  const lean = air ? Math.max(-0.4, Math.min(0.4, sim.vy * gs * 0.02)) : -0.12;
  runner.body.rotation.z = THREE.MathUtils.lerp(runner.body.rotation.z, lean, Math.min(1, dt * 10));
  const pop = Math.sin(switchPop * Math.PI) * 0.28;
  if (!FX.anim) {
    runner.body.scale.set(1 + squash * 0.3 - stretch * 0.15 + pop, 1 - squash * 0.32 + stretch * 0.25 + pop, 1 + pop); runner.body.position.y = 0; runner.body.rotation.y = 0;
    ['legB', 'legF', 'head'].forEach(k => runner.parts[k].rotation.z = 0);
    const ph = performance.now() / 120; runner.parts.armB.rotation.z = air ? 1.2 : Math.sin(ph) * 0.3 + 0.5; runner.parts.armF.rotation.z = air ? -1.2 : -Math.sin(ph) * 0.3 - 0.4;
  } else animRunner(dt, air, pop, sim);
  // ghost
  if (G && ghost.g.visible) { ghost.g.position.set(G.s.x, G.s.y, -0.6); ghost.g.rotation.x = G.s.gs < 0 ? Math.PI : 0; ghost.g.visible = !G.s.fin && !G.s.dead; }
  // smoke trail
  if (runner.g.visible && (mode !== MODE.dead)) {
    // big cartoony cloud trail: puffs start in the runner's colour and billow out into soft white
    emitAcc += dt * (save.set.reduced ? 16 : 30) * (mode === MODE.title ? 0.8 : 1) * (sim.grounded || mode === MODE.title ? 1 : 0.55);
    const tr = FX.outfits && TRAILS.find(x => x.id === save.look.trail), tc = !tr || tr.id === 'hue' ? HEX[sim.col] : tr.id === 'rainbow' ? HEX[1 + (Math.floor(performance.now() / 150) % 3)] : tr.c;
    while (emitAcc > 1) { emitAcc--; smoke.emit(sim.x - 0.5 + Math.random() * 0.2, sim.y + gs * (0.2 + Math.random() * 0.35), (Math.random() - .5) * 0.7, tc, { vx: -0.6 - Math.random() * 0.9, vy: gs * (0.4 + Math.random() * 0.9), s: 0.7 + Math.random() * 0.5, gs: 4.6 + Math.random() * 2.4, life: 1.1 + Math.random() * 0.7, a: 0.95, grey: theme.night ? 0xc9d2ea : 0xf6f8fb }); }
  }
  // v1.4 combo glow trail: bright sparks streaming behind (world layer, so never drawn over the runner)
  if (FX.combo && combo >= 2 && mode === MODE.play && dt > 0) { const n = Math.min(4, combo - 1); for (let k = 0; k < n; k++) cubes.burst(sim.x - 0.9 - Math.random() * 0.6, sim.y + gs * (0.3 + Math.random() * 0.8) - 0.6, Math.random() < 0.5 ? 0xffffff : HEX[sim.col], 1, { v: 1.5, s: 0.05 + combo * 0.012, g: 0, life: 0.45 }); }
  if (runner.scarfTail) runner.scarfTail.rotation.z = 0.25 + Math.sin(performance.now() / 90) * 0.25 + (sim.grounded ? 0 : 0.3);
  // v1.4 boss creature
  if (bossMesh && level.boss) { const bc = bossCol(level, sim.t), m = bossMesh.userData.mat; tint.setHex(HEX[bc]); m.color.lerp(tint, Math.min(1, dt * 8)); m.emissive.copy(m.color);
    const gp = Math.max(0, sim.x - sim.bx); bossMesh.position.set(sim.x - 3.8 - Math.min(gp, 14) * 0.32, THREE.MathUtils.lerp(bossMesh.position.y, sim.y + 1.6 * gs, Math.min(1, dt * 3)), 0); const wob = performance.now() / 180; bossMesh.scale.set(1 + Math.sin(wob) * 0.05, 1 + Math.cos(wob) * 0.05, 1); bossMesh.rotation.x = gs < 0 ? Math.PI : 0;
    const gap = sim.x - sim.bx; $('hBoss').firstChild.style.width = Math.max(0, Math.min(100, gap / (level.boss.gap * 1.6) * 100)) + '%'; $('hBoss').firstChild.style.background = CSS[bc]; }
  if (keyMesh && keyMesh.visible) keyMesh.rotation.y += dt * 2.5; if (bonusMesh && bonusMesh.visible) bonusMesh.rotation.y += dt * 1.5;
  smoke.update(dt); cubes.update(dt); updateRings(dt, gs); colourGuide(dt, sim.col);
  if (ring.visible) { ringT += dt; const s = 0.5 + ringT * 9; ring.scale.setScalar(s); ring.position.set(sim.x, sim.y + gs * 0.8, 0.2); ringMat.opacity = Math.max(0, 0.8 - ringT * 2.2); if (ringT > 0.4) ring.visible = false; }
  if (ring2.visible) { ring2T += dt; const e = 1 - Math.pow(1 - Math.min(1, ring2T / 0.5), 3); ring2.scale.setScalar(0.6 + e * 7); ring2.position.set(sim.x, sim.y + gs * 0.8, 0.1); ring2Mat.opacity = Math.max(0, 0.65 * (1 - ring2T / 0.5)); if (ring2T > 0.5) ring2.visible = false; }
  if (skyBase.ok) { skyPulse = Math.max(0, skyPulse - dt * 1.6); tint.setHex(HEX[sim.col] || 0xffffff); const k = theme.night ? 0.16 : 0.1 + skyPulse * 0.08;
    skyMat.uniforms.hor.value.copy(skyBase.hor).lerp(tint, k); skyMat.uniforms.top.value.copy(skyBase.top).lerp(tint, k * 0.5); }
  // camera
  const spd = mode === MODE.title ? 8 : speedAt(level, sim);
  // v1.1 chase cam: behind and to the side, like the reference; critically-damped follow, look-ahead and a gentle speed zoom
  const k = 1 - Math.exp(-dt * 4.5), ky = 1 - Math.exp(-dt * 3.2);
  camX = mode === MODE.title ? sim.x : camX + (sim.x - camX) * Math.min(1, k * 3);
  const ty = sim.y + (gs < 0 ? -1.6 : 0.6); camVY += ((ty - camY) * 9 - camVY * 5) * dt; camY += camVY * dt * (0.8 + ky); if (Math.abs(ty - camY) > 14) camY = ty;
  const portrait = innerHeight > innerWidth, asp = Math.max(0.4, camera.aspect), wide = Math.pow(Math.max(1, 1.9 / asp), 0.75);
  const back = (portrait ? 14 : 9) * wide, side = (portrait ? 19 : 12.5) * wide, up = (portrait ? 6 : 3.4) * wide;
  const fovT = 44 + Math.max(0, spd - 9) * 0.9 + (portrait ? 8 : 0) - (mode === MODE.finish ? Math.min(6, finT * 8) : 0);
  if (Math.abs(camera.fov - fovT) > 0.05) { camera.fov += (fovT - camera.fov) * k; camera.updateProjectionMatrix(); }
  shake = Math.max(0, shake - dt * 1.5); const sx = (Math.random() - .5) * shake * 0.6, sy = (Math.random() - .5) * shake * 0.6;
  camera.position.set(camX - back + sx, camY + up * (gs < 0 ? -0.6 : 1) + sy, side); camera.lookAt(camX + 10 * wide, camY + (gs < 0 ? -0.8 : 0.2), -2.5);
  if (photo) { const c = runner.g.position, cp = Math.cos(photo.pitch); camera.position.set(c.x + Math.sin(photo.yaw) * cp * photo.dist, c.y + 1 + Math.sin(photo.pitch) * photo.dist, c.z + Math.cos(photo.yaw) * cp * photo.dist); camera.lookAt(c.x, c.y + 0.9, c.z); }
  pComp.m.uniforms.focus.value = camera.position.distanceTo(runner.g.position);
  waterMat.uniforms.time.value = performance.now() / 1000; waterMat.uniforms.cam.value.copy(camera.position);
  sky.position.copy(camera.position);
  sun.position.set(sim.x - 6, sim.y + 18, 12); sun.target.position.set(sim.x + 6, sim.y, 0);
  if (mode === MODE.play || mode === MODE.replay) updateHud();
}
let hudLast = '';
function updateHud(force) {
  const s = `${S.t.toFixed(2)}|${S.gems}|${S.switches}`; if (s === hudLast && !force) return; hudLast = s;
  const tt = S.t, ss = Math.floor(tt), hs = Math.floor((tt - ss) * 100); $('hTime').textContent = String(ss).padStart(2, '0') + '.' + String(hs).padStart(2, '0'); $('hGems').textContent = [0, 1, 2].map(k => S.gems & (1 << k) ? '◆' : '◇').join('');
  $('hSw').textContent = `⇄ ${S.switches}/${level.par}`;
  if (G && FX.race && !usedCp) { const d = (S.x - G.s.x) / Math.max(4, speedAt(level, S)), h = $('hRace'); h.textContent = (d >= 0 ? '▲ ' : '▼ ') + Math.abs(d).toFixed(2) + 's'; h.className = 'on ' + (d >= 0 ? 'ahead' : 'behind'); }
}

// ---------- boot ----------
function hideLoading() { const l = $('loading'); l.style.opacity = 0; setTimeout(() => l.style.display = 'none', 400); }
setQuality(Q.level); attractWorld(0); goTitle();
window.__booted = true; hideLoading(); setTimeout(hideLoading, 3000);
requestAnimationFrame(frame);
addEventListener('pointerdown', () => audio.unlock(), { once: false, passive: true });
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !/[?&]nosw/.test(location.search)) navigator.serviceWorker.register('sw.js').catch(() => {});
// test hooks
window.HD = {
  get state() { return S && { x: S.x, y: S.y, col: S.col, dead: S.dead, fin: S.fin, t: S.t, gems: S.gems, jumpsN: S.jumpsN, switches: S.switches, grounded: S.grounded }; },
  get mode() { return Object.keys(MODE).find(k => MODE[k] === mode); }, save: () => save, levels: LEVELS, startLevel, audio, setTimeScale: v => timeScale = v, openLevels,
  get ext() { return S && { key: S.key, bonus: S.bonus, bx: S.bx, onWall: S.onWall, walls: S.walls, combo, runCombo, cp: !!cpState, usedCp, level: level && { id: level.id, cp: level.cp, boss: !!level.boss, keys: level.els.filter(e => e.t === 'K').length } }; },
  fx: () => FX, setFx(k, v) { FX[k] = v; applyFx(); persist(); }, genDaily, enterPhoto, exitPhoto, savePhoto, respawn, bosses: BOSSES, setPause,
  playScript(id, sc) { startLevel(id); replayScript = sc; mode = MODE.replay; restart(); $('replayTag').classList.remove('on'); replayScript.__test = true; },
};
