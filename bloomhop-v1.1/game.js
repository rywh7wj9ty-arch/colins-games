// Bloomhop v1.1 — an original 2.5D toy-meadow platformer. Three.js (WebGL2), custom post chain:
// background pass (sky + 4 parallax layers) -> soft blur (depth-of-field for the background ONLY),
// sharp foreground pass with MSAA (hero drawn last, never blurred or fogged), bloom, colour grade.
import * as THREE from './vendor/three/three.module.js';
import * as A from './audio.js?v=202610250100';
import { buildLevel, LEVELS } from './level.js?v=202610250100';

const VERSION = 'v1.1';
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, k) => a + (b - a) * k;
const rnd = (a, b) => a + Math.random() * (b - a);

// ---------- save + settings
const SKEY = 'bloomhop.save.v1';
const save = Object.assign({ music: 0.7, sfx: 0.8, bright: 1, quality: 'auto', shake: true, touch: null, a2hsX: false,
  st: { plays: 0, clears: 0, bestTime: 0, bestScore: 0, coins: 0, stomps: 0, falls: 0, hurts: 0, wonders: 0, secret: 0, bestPole: 0, playTime: 0 }, medals: [0, 0, 0] },
  (() => { try { return JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) { return {}; } })());
save.st = Object.assign({ plays: 0, clears: 0, bestTime: 0, bestScore: 0, coins: 0, stomps: 0, falls: 0, hurts: 0, wonders: 0, secret: 0, bestPole: 0, playTime: 0 }, save.st);
// v1.1 per-level progress (keeps v1.0 progress: its medals + clear carry over to world 1)
if (!save.lv) save.lv = { unlocked: save.st.clears > 0 ? 2 : 1, medals: { 0: (save.medals || [0, 0, 0]).slice(0, 3) }, best: {}, score: {}, cleared: {} };
if (save.st.clears > 0 && !save.lv.cleared[0]) save.lv.cleared[0] = 1;
if (save.st.bestTime && !save.lv.best[0]) save.lv.best[0] = save.st.bestTime;
const QS = new URLSearchParams(location.search);
const LV = clamp((parseInt(QS.get('l')) || 1) - 1, 0, LEVELS.length - 1);
const GO = QS.get('go') === '1' && LV < save.lv.unlocked;
const lvMed = i => (save.lv.medals[i] || [0, 0, 0]);
function persist() { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) { } }

// ---------- renderer
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (save.touch === null) save.touch = isTouch;
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // we grade + encode ourselves in the final pass
$('game').appendChild(renderer.domElement);
const gl2 = renderer.capabilities.isWebGL2;

const fgScene = new THREE.Scene(), bgScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 2, 0.5, 400);
const U = { time: { value: 0 }, pulse: { value: 0 }, beat: { value: 0 }, wonder: { value: 0 } };

// environment map for glossy toy reflections (built procedurally, no external assets)
{
  const env = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: {},
    vertexShader: 'varying vec3 p; void main(){ p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 p; void main(){ float h=normalize(p).y; vec3 c=mix(vec3(.55,.8,.45),vec3(1.,1.,.97),smoothstep(-.3,0.05,h)); c=mix(c,vec3(.35,.65,1.),smoothstep(.05,.7,h)); gl_FragColor=vec4(c*1.2,1.); }' }));
  env.add(sky);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  panel.position.set(-10, 30, 25); panel.lookAt(0, 0, 0); env.add(panel);
  const p2 = panel.clone(); p2.position.set(30, 12, -10); p2.lookAt(0, 0, 0); p2.scale.set(.6, .6, 1); env.add(p2);
  const pm = new THREE.PMREMGenerator(renderer);
  fgScene.environment = pm.fromScene(env, 0.03).texture;
  fgScene.environmentIntensity = 0.42;
}
const hemi = new THREE.HemisphereLight(0xcdeeff, 0x8fd46e, 0.8); fgScene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3dd, 2.6); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 14, bottom: -10, near: 1, far: 70 });
fgScene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0xd6e8ff, 0.7); fill.position.set(10, 6, 20); fgScene.add(fill);
bgScene.add(new THREE.HemisphereLight(0xdff3ff, 0x9ad884, 1.1));
const bgSun = new THREE.DirectionalLight(0xfff1d6, 1.6); bgSun.position.set(-1, 2, 1.5); bgScene.add(bgSun);

// ---------- post-processing
const RTT = { type: gl2 ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: false };
const rtFg = new THREE.WebGLRenderTarget(4, 4, { type: RTT.type, samples: gl2 ? 4 : 0 });
const rtBg = new THREE.WebGLRenderTarget(4, 4, { type: RTT.type });
const rtBgB = new THREE.WebGLRenderTarget(4, 4, RTT);
const rtB1 = new THREE.WebGLRenderTarget(4, 4, RTT), rtB2 = new THREE.WebGLRenderTarget(4, 4, RTT);
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quadScene = new THREE.Scene();
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; quadScene.add(quad);
const VQ = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }';
const blurMat = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, d: { value: new THREE.Vector2() } }, vertexShader: VQ, depthTest: false,
  fragmentShader: `uniform sampler2D t; uniform vec2 d; varying vec2 vUv;
  void main(){ vec4 c=texture2D(t,vUv)*.2270270270;
    c+=(texture2D(t,vUv+d*1.3846153846)+texture2D(t,vUv-d*1.3846153846))*.3162162162;
    c+=(texture2D(t,vUv+d*3.2307692308)+texture2D(t,vUv-d*3.2307692308))*.0702702703; gl_FragColor=c; }` });
const brightMat = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, th: { value: 1.05 } }, vertexShader: VQ, depthTest: false,
  fragmentShader: `uniform sampler2D t; uniform float th; varying vec2 vUv;
  void main(){ vec3 c=texture2D(t,vUv).rgb; float l=max(c.r,max(c.g,c.b)); gl_FragColor=vec4(c*smoothstep(th,th+.6,l),1.); }` });
const finalMat = new THREE.ShaderMaterial({ depthTest: false,
  uniforms: { tFg: { value: null }, tBg: { value: null }, tBloom: { value: null }, bloomK: { value: 0.65 }, bright: { value: 1 }, wonder: U.wonder, time: U.time, res: { value: new THREE.Vector2(1, 1) } },
  vertexShader: VQ,
  fragmentShader: `uniform sampler2D tFg,tBg,tBloom; uniform float bloomK,bright,wonder,time; uniform vec2 res; varying vec2 vUv;
  vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
  void main(){
    vec4 f=texture2D(tFg,vUv); vec3 b=texture2D(tBg,vUv).rgb;
    vec3 c=f.rgb+b*(1.-f.a);
    c+=texture2D(tBloom,vUv).rgb*bloomK;
    c=aces(c*0.92);
    float l=dot(c,vec3(.2126,.7152,.0722));
    c=mix(vec3(l),c,1.28+wonder*.12);                 // toy-bright saturation
    c=mix(c, c*vec3(.97,1.0,1.04), 1.-smoothstep(.0,.45,l)); // cool shadows
    c=mix(c, c*vec3(1.02,1.01,.97), smoothstep(.55,1.,l));  // soft sunny highlights (no red cast)
    c=pow(clamp(c,0.,1.),vec3(1./2.2));
    vec2 q=vUv-.5; c*=1.-dot(q,q)*.32;
    c*=bright;
    gl_FragColor=vec4(c,1.);
  }` });
let quality = { scale: 1, bloom: true, maxPR: 3, shadows: 2048 };
let viewW = 1, viewH = 1, pr = 1;
function resize() {
  viewW = innerWidth; viewH = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, quality.maxPR);
  // cap total pixels so the 3x Pro screens stay cool: ~3.2 MP foreground at most
  const cap = Math.sqrt(3.2e6 / (viewW * viewH));
  pr = Math.max(0.5, Math.min(dpr, cap) * quality.scale);
  renderer.setPixelRatio(pr); renderer.setSize(viewW, viewH, false);
  const w = Math.round(viewW * pr), h = Math.round(viewH * pr);
  rtFg.setSize(w, h); rtBg.setSize(w >> 1, h >> 1); rtBgB.setSize(w >> 1, h >> 1);
  rtB1.setSize(w >> 2, h >> 2); rtB2.setSize(w >> 2, h >> 2);
  camera.aspect = viewW / viewH; camera.updateProjectionMatrix();
  finalMat.uniforms.res.value.set(w, h);
}
function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); }
function blur(src, tmp, dst, w, h, s) {
  blurMat.uniforms.t.value = src.texture; blurMat.uniforms.d.value.set(s / w, 0); pass(blurMat, tmp);
  blurMat.uniforms.t.value = tmp.texture; blurMat.uniforms.d.value.set(0, s / h); pass(blurMat, dst);
}
function renderFrame() {
  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(rtBg); renderer.clear(); renderer.render(bgScene, camera);
  blur(rtBg, rtBgB, rtBg, rtBg.width, rtBg.height, 1.0);           // light background depth of field
  renderer.setRenderTarget(rtFg); renderer.clear(); renderer.render(fgScene, camera); // crisp foreground
  if (quality.bloom) {
    brightMat.uniforms.t.value = rtFg.texture; pass(brightMat, rtB1);
    blur(rtB1, rtB2, rtB1, rtB1.width, rtB1.height, 1.6); blur(rtB1, rtB2, rtB1, rtB1.width, rtB1.height, 2.6);
  } else { renderer.setRenderTarget(rtB1); renderer.clear(); }
  finalMat.uniforms.tFg.value = rtFg.texture; finalMat.uniforms.tBg.value = rtBg.texture; finalMat.uniforms.tBloom.value = rtB1.texture;
  finalMat.uniforms.bright.value = save.bright;
  pass(finalMat, null);
}

// ---------- geometry + material helpers
function rbox(w, h, d, r, s = 3) {
  const g = new THREE.BoxGeometry(w, h, d, s * 2, s * 2, s * 2), p = g.attributes.position, v = new THREE.Vector3(), inner = new THREE.Vector3();
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    inner.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz));
    v.sub(inner).normalize().multiplyScalar(r).add(inner); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}
const gloss = (color, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.18 }, o));
const matte = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.75 }, o));
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function swayMat(mat, amt, pulse) {
  mat.onBeforeCompile = s => {
    s.uniforms.uTime = U.time; s.uniforms.uPulse = U.pulse; s.uniforms.uBeat = U.beat;
    s.vertexShader = 'uniform float uTime, uPulse, uBeat;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
      float ix = instanceMatrix[3].x, iz = instanceMatrix[3].z;
      #else
      float ix = 0., iz = 0.;
      #endif
      float hgt = max(position.y, 0.);
      ${amt > 0 ? `transformed.x += sin(uTime*2.3 + ix*0.55 + iz*1.7) * ${amt.toFixed(3)} * hgt * hgt * (1. + uPulse*2.);` : ''}
      ${pulse ? `float wv = pow(max(0., sin(ix*0.45 - uBeat*6.2831853)), 6.); transformed.y += uPulse * (0.22*wv + 0.06*max(0., cos(uBeat*6.2831853*1.))) ;` : ''}
    `);
  };
  return mat;
}

const L = buildLevel(LV);
const { W, H, MAIN_END, ROOM } = L;
// ---------- per-world look + feel (all bright, no red tint)
const THEMES = {
  meadow: { dirt: [0xe8a056, 0xdc8c48, 0xcc7a3c, 0xb86a34], grass: [0x5ad84c, 0x4fcf45], tuft: [.27, .33], flowers: 1, sky: [[.06, .38, 1], [.5, .82, 1]], mount: [0xa9c4ff, 0xbfd2ff], mid: [0x7fdc6a, 0x92e57a, 0x6fd36f], near: [0x5ccf58, 0x6ddb5c], deco: 'tree' },
  beach: { dirt: [0xffe1a8, 0xf8d496, 0xf0c884, 0xe6bb74], grass: [0x6ee0a0, 0x5fd894], tuft: [.36, .42], flowers: 1, sky: [[.1, .55, 1], [.6, .95, 1]], mount: [0x8fe0f0, 0xa6ecf6], mid: [0x5fd8e0, 0x7ae6ea, 0x4fcfd6], near: [0xffe6a8, 0xfff0c0], deco: 'palm', water: 0x3fd0ff },
  cave: { dirt: [0xb9a3ff, 0xa892f2, 0x9a84e6, 0x8c76d8], grass: [0x6ff0d0, 0x5fe6c4], tuft: [.45, .5], flowers: 0, sky: [[.42, .32, .95], [.6, .9, 1]], mount: [0xa58cff, 0xbba6ff], mid: [0x8f7cf0, 0x9f8ef6, 0x7f6ce6], near: [0x6fd8e8, 0x82e4f0], deco: 'crystal', ceil: 1 },
  sky: { dirt: [0xffffff, 0xf2f6ff, 0xe6eeff, 0xdae6ff], grass: [0x8fe86a, 0x7fe05c], tuft: [.25, .3], flowers: 1, sky: [[.15, .5, 1], [.75, .92, 1]], mount: [0xffffff, 0xeaf2ff], mid: [0xffffff, 0xf0f6ff, 0xe4eeff], near: [0xffffff, 0xf4f8ff], deco: 'balloon', grav: 0.86 },
  desert: { dirt: [0xffc870, 0xf6b860, 0xeaa854, 0xdc984a], grass: [0xffe08a, 0xffd878], tuft: [.12, .15], flowers: 0, sky: [[.08, .5, 1], [.75, .9, 1]], mount: [0xffd59a, 0xffe2b4], mid: [0xffcf86, 0xffdc9e, 0xf6c47a], near: [0xffd890, 0xffe4a8], deco: 'cactus' },
  snow: { dirt: [0xbfe4ff, 0xaed8fa, 0x9eccf2, 0x8ec0ea], grass: [0xffffff, 0xf4fbff], tuft: [.55, .58], flowers: 0, sky: [[.2, .55, 1], [.78, .92, 1]], mount: [0xdcecff, 0xeef6ff], mid: [0xe6f2ff, 0xf4f9ff, 0xd8eaff], near: [0xf0f8ff, 0xe4f2ff], deco: 'pine', fric: 0.28 },
  grove: { dirt: [0xd8a070, 0xcc9264, 0xbe8458, 0xb0784e], grass: [0x7ee05a, 0x6fd84e], tuft: [.25, .3], flowers: 1, sky: [[.2, .45, 1], [.85, .85, 1]], mount: [0xc0b0ff, 0xd2c6ff], mid: [0x8ee070, 0xa0e880, 0x7cd864], near: [0x6ed860, 0x80e070], deco: 'shroom' },
  castle: { dirt: [0xf0d8ff, 0xe6caf8, 0xdcbcf0, 0xd0aee8], grass: [0xff9fdc, 0xff90d4], tuft: [.85, .9], flowers: 0, sky: [[.25, .45, 1], [.9, .85, 1]], mount: [0xd8c4ff, 0xe6d8ff], mid: [0xffc4ec, 0xffd4f2, 0xf6b6e4], near: [0xc8e8ff, 0xd8f0ff], deco: 'tower' },
  sunset: { dirt: [0xffc89a, 0xf6b88a, 0xeaa87c, 0xde9a70], grass: [0x6ee08a, 0x5ed87e], tuft: [.3, .36], flowers: 1, sky: [[.35, .4, 1], [1, .85, .6]], mount: [0xc8a8ff, 0xd8bcff], mid: [0xffb880, 0xffc896, 0xf6aa74], near: [0x7ad890, 0x8ae2a0], deco: 'tree' },
  keep: { dirt: [0xcfd8e8, 0xc2ccde, 0xb6c0d4, 0xaab4ca], grass: [0x7ad86a, 0x6cd05c], tuft: [.27, .33], flowers: 1, sky: [[.3, .4, 1], [.85, .8, 1]], mount: [0xb0a4ff, 0xc4baff], mid: [0x9fd890, 0xb0e2a0, 0x8ed080], near: [0xc8d2e6, 0xd6def0], deco: 'tower' },
};
const TH = Object.assign({ fric: 1, grav: 1 }, THEMES[L.theme || 'meadow']);
const WK = L.wonderKind || 'stampede';
$('lvName').textContent = (LV + 1) + ' · ' + LEVELS[LV].name;
const tile = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? (y < 0 ? 0 : (x < 0 ? 9 : 0)) : L.t[y * W + x];
const setTile = (x, y, v) => { L.t[y * W + x] = v; };
const isSolid = v => v === 1 || v === 2 || v === 3 || v === 4 || v === 5 || v === 7 || v === 8 || v === 9 || v === 10;

// ---------- ground (instanced rounded dirt blocks with glossy grass cushions)
const world = new THREE.Group(); fgScene.add(world);
const grassMat = swayMat(gloss(0xffffff, { roughness: 0.4, clearcoat: 0.6 }), 0, true);
const dirtMat = matte(0xffffff, { roughness: 0.8 });
const dirtTex = canvasTex(128, 128, (c, w, h) => {
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(150,90,40,${rnd(.06, .16)})`; c.beginPath(); c.arc(rnd(0, w), rnd(0, h), rnd(3, 9), 0, 7); c.fill(); }
  for (let i = 0; i < 12; i++) { c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(rnd(0, w), rnd(0, h), rnd(2, 4), 0, 7); c.fill(); }
});
dirtMat.map = dirtTex;
{
  const tops = [], dirts = [];
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    if (tile(x, y) !== 1) continue;
    dirts.push([x, y]); if (!isSolid(tile(x, y + 1))) tops.push([x, y]);
  }
  const dg = rbox(1.0, 1.0, 3.2, 0.14, 2);
  const dm = new THREE.InstancedMesh(dg, dirtMat, dirts.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  const C = TH.dirt.map(c => new THREE.Color(c));
  dirts.forEach(([x, y], i) => {
    m4.makeTranslation(x + 0.5, y + 0.5, 0); dm.setMatrixAt(i, m4);
    const depth = clamp(3 - y, 0, 3) * (y > 12 ? 0 : 1); col.copy(C[(x + y) % 2 ? Math.min(3, depth) : Math.max(0, depth - 1)]); dm.setColorAt(i, col);
  });
  dm.receiveShadow = true; world.add(dm);
  const gg = rbox(1.08, 0.42, 3.4, 0.18, 2);
  const gm = new THREE.InstancedMesh(gg, grassMat, tops.length);
  const GC = TH.grass.map(c => new THREE.Color(c));
  tops.forEach(([x, y], i) => { m4.makeTranslation(x + 0.5, y + 0.88, 0); gm.setMatrixAt(i, m4); gm.setColorAt(i, GC[x % 2]); });
  gm.receiveShadow = true; gm.castShadow = true; world.add(gm);
  // swaying grass tufts + flowers along the front and back edge of the grass
  const blade = new THREE.ConeGeometry(0.06, 0.5, 4, 1); blade.translate(0, 0.25, 0);
  const tuft = new THREE.InstancedMesh(blade, swayMat(gloss(0x6be85a, { roughness: 0.5, clearcoat: 0.3 }), 0.55, true), tops.length * 7);
  const flowerG = new THREE.SphereGeometry(0.11, 10, 8); flowerG.translate(0, 0.38, 0);
  const flowers = new THREE.InstancedMesh(flowerG, swayMat(gloss(0xffffff, { emissive: 0x222222 }), 0.5, true), tops.length);
  const FC = [0xff7ac8, 0xffd23f, 0xffffff, 0x8fb8ff, 0xffa24a].map(c => new THREE.Color(c));
  let k = 0, f = 0; const q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  tops.forEach(([x, y]) => {
    for (let j = 0; j < 7; j++) {
      const z = j < 4 ? rnd(1.25, 1.65) : rnd(-1.6, -1.1);
      p.set(x + rnd(0, 1), y + 1.02, z); e.set(rnd(-.25, .25), 0, rnd(-.3, .3)); q.setFromEuler(e); s.setScalar(rnd(.6, 1.3));
      m4.compose(p, q, s); tuft.setMatrixAt(k, m4); tuft.setColorAt(k++, col.setHSL(rnd(TH.tuft[0], TH.tuft[1]), TH.grass[0] === 0xffffff ? .3 : .75, TH.grass[0] === 0xffffff ? rnd(.86, .95) : rnd(.5, .62)));
    }
    if (TH.flowers && Math.random() < 0.45) { p.set(x + rnd(0, 1), y + 1.02, rnd(-1.5, 1.6)); s.setScalar(rnd(.8, 1.3)); m4.compose(p, q.identity(), s); flowers.setMatrixAt(f, m4); flowers.setColorAt(f++, FC[f % 5]); }
  });
  tuft.count = k; flowers.count = f; world.add(tuft, flowers);
}

// ---------- blocks, clouds, pipes, walls
const bumpers = new Map(); // "x,y" -> mesh
const blockTex = {
  power: canvasTex(128, 128, (c, w) => {
    const gr = c.createLinearGradient(0, 0, 0, w); gr.addColorStop(0, '#ffe066'); gr.addColorStop(1, '#ffb21f'); c.fillStyle = gr; c.fillRect(0, 0, w, w);
    c.translate(64, 64); c.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) { c.rotate(Math.PI * 2 / 5); c.beginPath(); c.ellipse(0, -22, 13, 20, 0, 0, 7); c.fill(); }
    c.fillStyle = '#ff8a3d'; c.beginPath(); c.arc(0, 0, 13, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-4, -4, 4, 0, 7); c.fill();
  }),
  brick: canvasTex(128, 128, (c, w) => {
    c.fillStyle = '#ff9a4a'; c.fillRect(0, 0, w, w); c.fillStyle = '#ffb97a';
    const r = (x, y, ww, hh) => { c.beginPath(); c.roundRect(x, y, ww, hh, 10); c.fill(); };
    r(6, 6, 54, 54); r(68, 6, 54, 54); r(6, 68, 54, 54); r(68, 68, 54, 54);
    c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(14, 12, 20, 6); c.fillRect(76, 12, 20, 6); c.fillRect(14, 74, 20, 6); c.fillRect(76, 74, 20, 6);
  }),
  used: canvasTex(64, 64, (c, w) => { c.fillStyle = '#d9b48a'; c.fillRect(0, 0, w, w); c.fillStyle = '#c69c70'; c.fillRect(10, 10, 6, 6); c.fillRect(48, 10, 6, 6); c.fillRect(10, 48, 6, 6); c.fillRect(48, 48, 6, 6); }),
};
const blockG = rbox(0.96, 0.96, 0.96, 0.14, 2);
const mats = {
  2: gloss(0xffffff, { map: blockTex.brick }), 3: gloss(0xffffff, { map: blockTex.power, emissive: 0x553300, emissiveIntensity: 0.6 }),
  4: matte(0xffffff, { map: blockTex.used }), 7: gloss(0xffffff, { map: blockTex.brick }), 6: gloss(0xffffff, { map: blockTex.power, transparent: true, opacity: 0 }),
};
function makeBlock(x, y, v) {
  const m = new THREE.Mesh(blockG, mats[v]); m.position.set(x + 0.5, y + 0.5, 0); m.castShadow = v !== 6; m.receiveShadow = true;
  m.userData.v = v; world.add(m); bumpers.set(x + ',' + y, m); m.visible = v !== 6; return m;
}
const cloudMat = gloss(0xffffff, { roughness: 0.55, clearcoat: 0.3, emissive: 0xdde8ff, emissiveIntensity: 0.15 });
const puff = new THREE.SphereGeometry(0.5, 20, 14);
for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
  const v = tile(x, y);
  if (v === 2 && !L.blocks.find(b => b.x === x && b.y === y)) makeBlock(x, y, 2);
  if (v === 8) {
    const g = new THREE.Group(); g.position.set(x + 0.5, y + 0.55, 0);
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(puff, cloudMat); m.position.set(rnd(-.35, .35), rnd(-.1, .12), rnd(-.5, .5)); m.scale.setScalar(rnd(.8, 1.1)); m.castShadow = true; g.add(m); }
    world.add(g);
  }
}
L.blocks.forEach(b => b.mesh = makeBlock(b.x, b.y, b.v));
const pipeMat = gloss(0x3fd6b0, { roughness: 0.22 }), pipeRim = gloss(0x2fc49e, { roughness: 0.2 });
L.pipes.forEach(p => {
  const b0 = p.base ?? 3, h = p.top - b0, g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, h - 0.3, 32), pipeMat); body.position.y = (h - 0.3) / 2; body.castShadow = body.receiveShadow = true;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.5, 32), pipeRim); rim.position.y = h - 0.25; rim.castShadow = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.08, 10, 40), gloss(0xbff7e9)); ring.rotation.x = Math.PI / 2; ring.position.y = h;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.85, 32), new THREE.MeshBasicMaterial({ color: 0x0b3a33 })); hole.rotation.x = -Math.PI / 2; hole.position.y = h + 0.01;
  const shine = new THREE.Mesh(new THREE.PlaneGeometry(0.16, h - 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 })); shine.position.set(-0.45, (h - 0.3) / 2, 0.75);
  g.add(body, rim, ring, hole, shine); g.position.set(p.x + 1, b0, 0); world.add(g);
  if (p.warp === 'down' || p.warp === 'back') {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
    arrow.rotation.x = Math.PI; arrow.position.set(p.x + 1, p.top + 1.5, 0.3); world.add(arrow); p.arrow = arrow;
  }
});
// stone walls that close off the edges
for (const wx of [MAIN_END, ROOM.x0, ROOM.x1 - 1]) {
  const m = new THREE.Mesh(rbox(1, H, 3.2, 0.2), matte(0xb9c7d6)); m.position.set(wx + 0.5, H / 2, 0); m.receiveShadow = true; world.add(m);
}

// bouncy springs (tile 10)
const springMeshes = (L.springs || []).map(s => {
  const g = new THREE.Group();
  const base = new THREE.Mesh(rbox(0.96, 0.4, 0.96, 0.12), gloss(0x3a9cf0)); base.position.y = 0.2;
  const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 16, 1, true), gloss(0xd0d8e8, { metalness: .6 })); coil.position.y = 0.55;
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.18, 24), gloss(0xffd23f, { emissive: 0xffa000, emissiveIntensity: 0.4 })); pad.position.y = 0.85;
  g.add(base, coil, pad); g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.position.set(s.x + 0.5, s.y, 0); world.add(g); g.userData = { pad, coil, t: 0 }; s.mesh = g; return g;
});
// boss gate (closes behind you in the arena)
let gate = null;
if (L.arena) { gate = new THREE.Mesh(rbox(1, H - 3, 3.2, 0.2), gloss(0x8a7cf0, { roughness: 0.4 })); gate.position.set(L.arena.x0 + 0.5, 3 + (H - 3) / 2 + 22, 0); world.add(gate); }
if (TH.water) { const wtr = new THREE.Mesh(new THREE.PlaneGeometry(W + 40, 8), new THREE.MeshPhysicalMaterial({ color: TH.water, transparent: true, opacity: 0.75, roughness: 0.1, clearcoat: 1, emissive: 0x1a6fa0, emissiveIntensity: 0.25 })); wtr.rotation.x = -Math.PI / 2; wtr.position.set(W / 2, 1.2, 0); world.add(wtr); }

// ---------- foreground decoration (sharp, behind the play plane)
const trunkMat = matte(0xa86a3c), leafMats = [0x46c94a, 0x5fdc54, 0x3db85a].map(c => gloss(c, { roughness: 0.45, clearcoat: 0.4 }));
function tree(x, y, z, s) {
  const g = new THREE.Group();
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.6, 10), trunkMat); tr.position.y = 0.8; g.add(tr);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.95, 24, 18), leafMats[Math.floor(rnd(0, 3))]); crown.position.y = 2.1; crown.scale.set(1, 0.92, 1); g.add(crown);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(puff, leafMats[i]); b.position.set(rnd(-.7, .7), rnd(1.7, 2.6), rnd(.2, .6)); b.scale.setScalar(rnd(.6, .9)); g.add(b); }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.position.set(x, y, z); g.scale.setScalar(s); world.add(g); return g;
}
function bush(x, y, z, s, c) {
  const g = new THREE.Group(); const m = gloss(c, { roughness: 0.4 });
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(puff, m); b.position.set(i * 0.45 - 0.7, rnd(.05, .3), 0); b.scale.setScalar(rnd(.8, 1.2)); b.castShadow = true; g.add(b); }
  g.position.set(x, y + 0.25, z); g.scale.setScalar(s); world.add(g);
}
function decor(kind, x, y, z, s) {
  const g = new THREE.Group(); const add = (geo, mat, px, py, pz, sc) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz || 0); if (sc) m.scale.set(...sc); g.add(m); return m; };
  if (kind === 'palm') { const tm = matte(0xd8a466); for (let i = 0; i < 5; i++) add(new THREE.CylinderGeometry(0.13, 0.16, 0.5, 10), tm, i * 0.06, 0.25 + i * 0.48); const lm = gloss(0x3fd06a); for (let i = 0; i < 6; i++) { const l = add(new THREE.SphereGeometry(0.5, 14, 8), lm, 0.3 + Math.cos(i) * 0.5, 2.6, Math.sin(i) * 0.4, [1.5, 0.22, 0.5]); l.rotation.set(0, i * 1.05, -0.3); } add(new THREE.SphereGeometry(0.14, 10, 8), gloss(0x9a6a3a), 0.3, 2.4, 0.2); }
  else if (kind === 'cactus') { const cm = gloss(0x4fcf6a, { roughness: 0.45 }); add(new THREE.CapsuleGeometry(0.32, 1.6, 6, 14), cm, 0, 1.1); const a = add(new THREE.CapsuleGeometry(0.2, 0.6, 6, 12), cm, 0.45, 1.2); const b = add(new THREE.CapsuleGeometry(0.2, 0.5, 6, 12), cm, -0.42, 0.9); a.position.y = 1.5; b.position.y = 1.1; add(new THREE.SphereGeometry(0.16, 10, 8), gloss(0xff8adf), 0, 2.15); }
  else if (kind === 'pine') { const pm = gloss(0x3fbf8a, { roughness: 0.5 }), sn = gloss(0xffffff, { roughness: 0.5 }); add(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 8), matte(0xa86a3c), 0, 0.3); for (let i = 0; i < 3; i++) { add(new THREE.ConeGeometry(0.9 - i * 0.22, 1, 16), pm, 0, 0.9 + i * 0.6); add(new THREE.ConeGeometry(0.5 - i * 0.12, 0.4, 16), sn, 0, 1.25 + i * 0.6); } }
  else if (kind === 'crystal') { const cols = [0x8fe8ff, 0xd0a8ff, 0xff9fe0, 0xa8ffd8]; for (let i = 0; i < 4; i++) { const c = add(new THREE.OctahedronGeometry(0.45, 0), new THREE.MeshPhysicalMaterial({ color: cols[i], emissive: cols[i], emissiveIntensity: 0.5, roughness: 0.1, clearcoat: 1 }), (i - 1.5) * 0.4, 0.6 + (i % 2) * 0.3, 0, [0.6, 1.6 + (i % 2) * 0.6, 0.6]); c.rotation.z = (i - 1.5) * 0.25; } }
  else if (kind === 'shroom') { const st = add(new THREE.CylinderGeometry(0.22, 0.3, 1.4, 14), gloss(0xfff4dc), 0, 0.7); const cc = [0x3fa7ff, 0xb88bff, 0xffd23f, 0x3fd0b0][Math.floor(rnd(0, 4))]; add(new THREE.SphereGeometry(0.9, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), gloss(cc), 0, 1.35, 0, [1, 0.7, 1]); for (let i = 0; i < 4; i++) add(new THREE.SphereGeometry(0.13, 10, 8), gloss(0xffffff), Math.cos(i * 1.6) * 0.55, 1.75, Math.sin(i * 1.6) * 0.4 + 0.3, [1, 0.5, 1]); }
  else if (kind === 'tower') { const tm = gloss(L.theme === 'keep' ? 0xdfe6f2 : 0xffe0f4, { roughness: 0.5 }); add(new THREE.CylinderGeometry(0.55, 0.6, 2.4, 18), tm, 0, 1.2); add(new THREE.ConeGeometry(0.75, 1.1, 18), gloss(L.theme === 'keep' ? 0x8a7cf0 : 0x3a9cf0), 0, 2.95); add(new THREE.CircleGeometry(0.18, 16), new THREE.MeshStandardMaterial({ color: 0xffe59a, emissive: 0xffc94a, emissiveIntensity: 0.6 }), 0, 1.6, 0.61); }
  else if (kind === 'balloon') { const bc = [0xff8adf, 0xffd23f, 0x3fd0ff, 0x9ff0c0][Math.floor(rnd(0, 4))]; add(new THREE.SphereGeometry(0.55, 20, 14), gloss(bc), 0, 2.4, 0, [1, 1.15, 1]); add(new THREE.CylinderGeometry(0.015, 0.015, 1.8, 4), matte(0xffffff), 0, 1.0); bush(x, y, z + 0.1, s * 0.8, 0xffffff); }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.position.set(x, y, z); g.scale.setScalar(s); world.add(g); return g;
}
const sways = [];
for (let x = 3; x < MAIN_END - 4; x += rnd(5, 9)) {
  const gx = Math.floor(x); let top = 0; while (top < H && tile(gx, top) === 1) top++;
  if (top < 3) continue;
  if (TH.deco !== 'tree' && Math.random() < 0.6) { sways.push(decor(TH.deco, x, top + 0.6, -1.4, rnd(.8, 1.2))); continue; }
  if (Math.random() < 0.55) sways.push(tree(x, top + 0.6, -1.4, rnd(.8, 1.2)));
  else bush(x, top + 0.6, -1.3, rnd(.8, 1.1), TH.grass[0] === 0xffffff ? 0xf4fbff : [0x52d45a, 0x7be26a, 0x48c27a][Math.floor(rnd(0, 3))]);
}
// a little mushroom cottage at the goal
{
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 2.4, 32), gloss(0xfff4dc, { roughness: 0.6 })); wall.position.y = 1.2;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(2.6, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), gloss(0x3fa7ff, { roughness: 0.25 })); cap.position.y = 2.3; cap.scale.y = 0.75;
  const door = new THREE.Mesh(rbox(0.9, 1.4, 0.3, 0.3), gloss(0xff9a4a)); door.position.set(0, 0.7, 1.68);
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.32, 24), new THREE.MeshStandardMaterial({ color: 0xffe59a, emissive: 0xffc94a, emissiveIntensity: 0.6 })); win.position.set(0.9, 1.6, 1.52); win.rotation.y = 0.5;
  g.add(wall, cap, door, win);
  for (let i = 0; i < 7; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), gloss(0xffffff)); const a = i / 7 * Math.PI * 2; d.position.set(Math.cos(a) * 1.9, 3.3 + Math.sin(i * 2) * .2, Math.sin(a) * 1.9); d.scale.y = 0.5; g.add(d); }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.position.set(L.house.x, 3.4, -1.6); world.add(g);
}
// goal pole
const pole = new THREE.Group();
if (L.pole) {
  const h = L.pole.y1 - L.pole.y0;
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, h, 16), gloss(0xffffff, { metalness: 0.3 })); bar.position.y = h / 2;
  const base = new THREE.Mesh(rbox(1, 0.6, 1, 0.2), gloss(0x3fc45a)); base.position.y = 0.3;
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 16), gloss(0xffd23f, { emissive: 0xffa000, emissiveIntensity: 0.9 })); top.position.y = h + 0.3;
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9, 10, 1), new THREE.MeshStandardMaterial({ color: 0xff7ac8, side: THREE.DoubleSide, roughness: 0.6 }));
  flag.position.set(-0.75, h - 0.6, 0); pole.userData.flag = flag; pole.userData.h = h;
  pole.add(bar, base, top, flag); pole.traverse(m => { if (m.isMesh) m.castShadow = true; });
  pole.position.set(L.pole.x, L.pole.y0, 0); world.add(pole);
} else { pole.userData.flag = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 2, 1)); pole.userData.h = 1; }
// checkpoint flag
const cpFlags = L.checkpoints.map(c => {
  const g = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 10), gloss(0xffffff)); bar.position.y = 1.1;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshStandardMaterial({ color: 0xbfc7d0, side: THREE.DoubleSide })); fl.position.set(0.42, 1.9, 0);
  g.add(bar, fl); g.position.set(c.x + 0.5, c.y, -0.8); g.userData.fl = fl; world.add(g); return g;
});

// ---------- background: sky + 4 parallax layers (rendered soft = depth of field)
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { wonder: U.wonder, time: U.time, cT: { value: new THREE.Vector3(...TH.sky[0]) }, cH: { value: new THREE.Vector3(...TH.sky[1]) } },
  vertexShader: 'varying vec3 p; void main(){ p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform float wonder,time; uniform vec3 cT,cH; varying vec3 p;
  void main(){ vec3 d=normalize(p); float h=d.y;
    vec3 top=cT, hor=cH;
    vec3 wt=vec3(.55,.3,1.0), wh=vec3(1.,.78,.95);
    float sw=.5+.5*sin(time*.8+d.x*3.);
    top=mix(top,mix(wt,vec3(.25,.75,1.),sw),wonder); hor=mix(hor,mix(wh,vec3(1.,.95,.6),sw),wonder);
    vec3 c=mix(hor,top,smoothstep(-.05,.6,h));
    gl_FragColor=vec4(c*0.9,1.); }` });
const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyMat); bgScene.add(sky);
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(7, 40), new THREE.MeshBasicMaterial({ color: 0xfff6c8 })); bgScene.add(sunDisc);
const sunGlow = new THREE.Mesh(new THREE.CircleGeometry(18, 40), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, depthWrite: false })); bgScene.add(sunGlow);
const layers = [];
function layer(f) { const g = new THREE.Group(); g.userData.f = f; bgScene.add(g); layers.push(g); return g; }
{ // far mountains
  const g = layer(0.82); const ms = TH.mount.map(c => gloss(c, { roughness: 0.8, clearcoat: 0 }));
  for (let x = -120; x < W + 60; x += rnd(18, 30)) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), ms[Math.floor(rnd(0, 2))]); const s = rnd(18, 30);
    m.scale.set(s * rnd(.9, 1.4), s * rnd(.7, 1.1), 6); m.position.set(x, -6, -150); g.add(m);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), gloss(0xffffff, { roughness: 0.6, clearcoat: 0 })); cap.scale.set(m.scale.x * .35, m.scale.y * .22, 3); cap.position.set(x, -6 + m.scale.y * .86, -147); g.add(cap);
  }
}
{ // clouds
  const g = layer(0.7); const cm = gloss(0xffffff, { roughness: 0.7, clearcoat: 0, emissive: 0xeef4ff, emissiveIntensity: 0.35 });
  for (let x = -80; x < W + 80; x += rnd(14, 26)) {
    const c = new THREE.Group(); const n = 4 + Math.floor(rnd(0, 4));
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(puff, cm); const s = rnd(3, 6); m.scale.set(s, s * .85, s * .7); m.position.set(i * 3 - n * 1.5, rnd(-.5, 1.5) + Math.sin(i / n * Math.PI) * 2, rnd(-1, 1)); c.add(m); }
    c.position.set(x, rnd(18, 34), -90 + rnd(-10, 10)); c.userData.drift = rnd(0.3, 0.8); g.add(c);
  }
}
{ // mid hills
  const g = layer(0.55); const hs = TH.mid.map(c => gloss(c, { roughness: 0.6, clearcoat: 0.2 }));
  for (let x = -80; x < W * 0.5 + 100; x += rnd(10, 16)) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 18), hs[Math.floor(rnd(0, 3))]); const s = rnd(9, 15);
    m.scale.set(s * 1.3, s * rnd(.6, .9), 8); m.position.set(x, -3, -60); g.add(m);
    if (Math.random() < .6) { const t = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), hs[(Math.floor(x) + 1) % 3]); t.position.set(x + rnd(-4, 4), -3 + m.scale.y * .9 + 1.2, -55); const st = new THREE.Mesh(new THREE.CylinderGeometry(.2, .25, 2, 8), trunkMat); st.position.set(t.position.x, t.position.y - 1.6, -55.5); g.add(t, st); }
  }
}
{ // near hills with lollipop trees
  const g = layer(0.3); const hs = TH.near.map(c => gloss(c, { roughness: 0.45, clearcoat: 0.4 }));
  const stripe = gloss(0x86e870, { roughness: 0.45 });
  for (let x = -40; x < W * 0.75 + 60; x += rnd(7, 12)) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), hs[Math.floor(rnd(0, 2))]); const s = rnd(4, 7);
    m.scale.set(s * 1.2, s * rnd(.7, 1.0), 4); m.position.set(x, 1, -20); g.add(m);
    const st = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 40, Math.PI), stripe); st.scale.set(m.scale.x * .7, m.scale.y * .7, 1); st.position.set(x, 1, -16.2); g.add(st);
    if (Math.random() < .5) { const top = 1 + m.scale.y * .95; const lol = new THREE.Mesh(new THREE.SphereGeometry(.9, 18, 12), gloss([0xffb3e0, 0xffe27a, 0x9ff0ff][Math.floor(rnd(0, 3))])); lol.position.set(x + rnd(-2, 2), top + 1.6, -19); const sk = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, 2, 8), matte(0xffffff)); sk.position.set(lol.position.x, top + .6, -19); g.add(lol, sk); }
  }
}

// ---------- coins (one instanced mesh, spinning)
const coinGeo = (() => {
  const pts = []; const R = 0.34, T = 0.07;
  pts.push(new THREE.Vector2(0, -T * .6), new THREE.Vector2(R * .78, -T * .6), new THREE.Vector2(R * .82, -T), new THREE.Vector2(R, -T * .8), new THREE.Vector2(R, T * .8), new THREE.Vector2(R * .82, T), new THREE.Vector2(R * .78, T * .6), new THREE.Vector2(0, T * .6));
  const g = new THREE.LatheGeometry(pts, 36); g.rotateX(Math.PI / 2); return g;
})();
const coinMat = new THREE.MeshPhysicalMaterial({ color: 0xffc634, metalness: 0.85, roughness: 0.22, clearcoat: 1, emissive: 0xff9d00, emissiveIntensity: 0.45 });
const coinMesh = new THREE.InstancedMesh(coinGeo, coinMat, L.coins.length + 40); coinMesh.castShadow = true; coinMesh.renderOrder = 40; coinMesh.frustumCulled = false;
coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.add(coinMesh);
L.coins.forEach(c => { c.got = false; c.pop = 0; });
const popCoins = []; // coins bursting from blocks

// ---------- medals + dazzle bloom
const medalMeshes = L.medals.map(m => {
  const g = new THREE.Group();
  const shape = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.28 : 0.62; i ? shape.lineTo(Math.cos(a) * r, -Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, -Math.sin(a) * r); }
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 3 }), new THREE.MeshPhysicalMaterial({ color: 0xff8adf, metalness: 0.4, roughness: 0.15, clearcoat: 1, emissive: 0xff4fd0, emissiveIntensity: 0.7 }));
  star.position.z = -0.08; const ring = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.07, 10, 40), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xc9a0ff, emissiveIntensity: 1.2 }));
  g.add(star, ring); g.position.set(m.x, m.y, 0); g.renderOrder = 40; world.add(g); m.mesh = g; m.got = !!save.medals[m.id] && false; return g;
});
const bloom = new THREE.Group();
{
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1, 8), gloss(0x3fbf4a)); stem.position.y = 0.5;
  const head = new THREE.Group(); head.position.y = 1.2;
  const petalG = new THREE.SphereGeometry(0.28, 16, 12);
  const pc = [0xff6fd0, 0xffd23f, 0x5fe06a, 0x3fd0ff, 0xb88bff, 0xff9a4a];
  pc.forEach((c, i) => { const p = new THREE.Mesh(petalG, new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, roughness: 0.2, clearcoat: 1 })); const a = i / 6 * Math.PI * 2; p.position.set(Math.cos(a) * .32, Math.sin(a) * .32, 0); p.scale.set(1, 1, .5); head.add(p); });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.6 })); core.position.z = 0.08; head.add(core);
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.0, 40), new THREE.MeshBasicMaterial({ color: 0xfff2a8, transparent: true, opacity: 0.6, side: THREE.DoubleSide })); head.add(halo);
  bloom.add(stem, head); bloom.userData.head = head; bloom.userData.halo = halo;
  bloom.position.set(L.bloom.x, L.bloom.y, 0); bloom.renderOrder = 40; world.add(bloom);
}

// ---------- particles (sparkles, dust, confetti) — instanced, crisp
const PMAX = 700;
const partMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.1, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), PMAX);
partMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); partMesh.frustumCulled = false; partMesh.renderOrder = 60; world.add(partMesh);
partMesh.setColorAt(0, new THREE.Color());
const parts = [];
function emit(x, y, z, n, o = {}) {
  for (let i = 0; i < n && parts.length < PMAX; i++) {
    const a = rnd(0, Math.PI * 2), sp = rnd(o.smin ?? 1, o.smax ?? 4);
    const col = new THREE.Color(Array.isArray(o.color) ? o.color[Math.floor(rnd(0, o.color.length))] : (o.color ?? 0xffffff));
    if (o.glow) col.multiplyScalar(o.glow);
    parts.push({ x: x + rnd(-(o.spread ?? .2), o.spread ?? .2), y, z: z + rnd(-.2, .2), vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp * (o.up ?? 1) + (o.vy || 0), vz: rnd(-1, 1) * (o.vzr ?? 1),
      life: rnd(o.lmin ?? .4, o.lmax ?? .8), t: 0, s: rnd(o.size ?? 1, (o.size ?? 1) * 1.6), g: o.g ?? 6, col, spin: o.spin ? rnd(-12, 12) : 0, flat: !!o.flat, drag: o.drag ?? 1 });
  }
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
function updParts(dt) {
  let k = 0;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.t += dt; if (p.t >= p.life) { parts.splice(i, 1); continue; }
    p.vy -= p.g * dt; p.vx *= Math.pow(p.drag, dt * 60); p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
  }
  for (const p of parts) {
    const life = 1 - p.t / p.life, sc = p.s * (p.flat ? 1 : Math.sin(Math.min(1, life * 1.4) * Math.PI / 2));
    _e.set(p.t * p.spin, p.t * p.spin * .7, 0); _q.setFromEuler(_e);
    _s.set(sc * (p.flat ? 1.6 : 1), sc * (p.flat ? 0.6 : 1), sc * (p.flat ? .15 : 1));
    _m.compose(_p.set(p.x, p.y, p.z), _q, _s); partMesh.setMatrixAt(k, _m); partMesh.setColorAt(k, p.col); k++;
  }
  partMesh.count = k; partMesh.instanceMatrix.needsUpdate = true; if (partMesh.instanceColor) partMesh.instanceColor.needsUpdate = true;
}

// ---------- the hero: Bop, a round glossy sprout-kid (drawn last, never blurred)
const HERO_ORDER = 100;
function makeEye(g, x, sz) {
  const e = new THREE.Group();
  const white = new THREE.Mesh(new THREE.SphereGeometry(0.13 * sz, 20, 16), gloss(0xffffff, { roughness: 0.1 }));
  white.scale.set(0.85, 1.15, 0.6);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.085 * sz, 16, 12), gloss(0x1b2340, { roughness: 0.1 })); pupil.position.set(0, -0.01, 0.06); pupil.scale.set(.85, 1.15, .6);
  const hl = new THREE.Mesh(new THREE.SphereGeometry(0.03 * sz, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); hl.position.set(0.03, 0.05, 0.11);
  e.add(white, pupil, hl); e.position.set(x, 0.1, 0.38); g.add(e); return e;
}
function makeHero() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = gloss(0xff9a3c, { roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.4, sheenColor: new THREE.Color(0xffd8a8) });
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.45, 40, 30), skin); torso.position.y = 0.45; body.add(torso);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 20), gloss(0xfff0d0, { roughness: 0.4 })); belly.position.set(0, 0.32, 0.24); belly.scale.set(1, 0.9, 0.6); body.add(belly);
  const face = new THREE.Group(); face.position.y = 0.52; body.add(face);
  const eyes = [makeEye(face, -0.15, 1), makeEye(face, 0.15, 1)];
  const cheekM = new THREE.MeshBasicMaterial({ color: 0xff7fa0, transparent: true, opacity: 0.55 });
  [-0.27, 0.27].forEach(x => { const c = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), cheekM); c.position.set(x, -0.08, 0.41); c.lookAt(x * 3, -0.2, 3); face.add(c); });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 8, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0x5a2410 })); mouth.rotation.z = Math.PI; mouth.position.set(0, -0.1, 0.44); face.add(mouth);
  // sprout on the head (turns into a flower when powered up)
  const sprout = new THREE.Group(); sprout.position.y = 0.88; body.add(sprout);
  const leafM = gloss(0x4fd84a, { roughness: 0.3 });
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.22, 8), leafM); stalk.position.y = 0.08; sprout.add(stalk);
  const leafG = new THREE.SphereGeometry(0.12, 14, 10);
  const lf1 = new THREE.Mesh(leafG, leafM); lf1.scale.set(1.3, 0.4, 0.7); lf1.position.set(-0.12, 0.2, 0); lf1.rotation.z = 0.5;
  const lf2 = lf1.clone(); lf2.position.x = 0.12; lf2.rotation.z = -0.5; sprout.add(lf1, lf2);
  const fl = new THREE.Group(); fl.position.y = 0.26; sprout.add(fl); fl.visible = false;
  for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), gloss(0xff7ac8, { emissive: 0xff4fb0, emissiveIntensity: 0.25 })); const a = i / 5 * Math.PI * 2; p.position.set(Math.cos(a) * .1, Math.sin(a) * .1, 0); fl.add(p); }
  const flc = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), gloss(0xffd23f)); flc.position.z = .03; fl.add(flc);
  // hands + feet
  const limbM = gloss(0xff8a2a, { roughness: 0.3 });
  const hands = [-1, 1].map(s => { const h = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), limbM); h.position.set(s * 0.47, 0.38, 0.05); body.add(h); return h; });
  const shoeM = gloss(0x3a7bff, { roughness: 0.25 });
  const feet = [-1, 1].map(s => { const f = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), shoeM); f.scale.set(1, 0.65, 1.35); f.position.set(s * 0.2, 0.06, 0.06); root.add(f); return f; });
  root.traverse(m => { if (m.isMesh) { m.castShadow = true; m.renderOrder = HERO_ORDER; } });
  root.userData = { body, eyes, sprout, fl, hands, feet, mouth, lf1, lf2 };
  return root;
}
const hero = makeHero(); fgScene.add(hero);

// ---------- enemies
const ENEMY_ORDER = 50;
function face2(g, y, z, sz = 1, angry = true) {
  const e1 = makeEye(g, -0.12 * sz, sz * 0.8), e2 = makeEye(g, 0.12 * sz, sz * 0.8); e1.position.y = e2.position.y = y; e1.position.z = e2.position.z = z;
  if (angry) { const bm = new THREE.MeshBasicMaterial({ color: 0x3a2010 }); [-1, 1].forEach(s => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.14 * sz, 0.035 * sz, 0.02), bm); b.position.set(s * 0.12 * sz, y + 0.13 * sz, z + 0.08); b.rotation.z = -s * 0.35; g.add(b); }); }
  return [e1, e2];
}
function makeWalker() { // "Grumblenut": a grumpy acorn on little boots
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  const nut = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 20), gloss(0xc9803e, { roughness: 0.35 })); nut.scale.set(1, 1.05, 1); nut.position.y = 0.45; b.add(nut);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.46, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), matte(0x7a4a26, { roughness: 0.9 })); cap.position.y = 0.6; cap.scale.y = 0.55; b.add(cap);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.16, 8), matte(0x5a3518)); stem.position.y = 0.92; b.add(stem);
  face2(b, 0.42, 0.36);
  const feet = [-1, 1].map(s => { const f = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), gloss(0x5b3a8a)); f.scale.set(1, .6, 1.3); f.position.set(s * .18, .06, .05); g.add(f); return f; });
  g.userData = { b, feet }; return g;
}
function makeHopper() { // "Boingle": a jelly drop on a spring
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  const jelly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 20), new THREE.MeshPhysicalMaterial({ color: 0x8a5cff, roughness: 0.08, transmission: 0, clearcoat: 1, emissive: 0x3a1a90, emissiveIntensity: 0.25 }));
  jelly.position.y = 0.5; jelly.scale.set(1, .95, 1); b.add(jelly);
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8 })); shine.position.set(-0.18, 0.72, 0.3); shine.scale.set(1, .6, .4); b.add(shine);
  face2(b, 0.48, 0.36, 1, true);
  const spring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 8, 20), gloss(0xd0d8e8, { metalness: .6 })); spring.rotation.x = Math.PI / 2; spring.position.y = 0.07; g.add(spring);
  const s2 = spring.clone(); s2.position.y = 0.0; g.add(s2);
  g.userData = { b, spring }; return g;
}
function makeFlier() { // "Buzzwhirl": a striped bumble-puff with glassy wings
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 28, 20), gloss(0xffd23f)); body.position.y = 0.4; body.scale.set(1.1, .95, .95); b.add(body);
  [-.12, .14].forEach(x => { const s = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 8, 30), gloss(0x2b2b44)); s.position.set(x, .4, 0); s.rotation.y = Math.PI / 2; s.scale.set(1, 1, 1); b.add(s); });
  face2(b, 0.45, 0.33, 1, true);
  const wm = new THREE.MeshPhysicalMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.6, roughness: 0.05, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const wings = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 10), wm); w.scale.set(1, .3, .55); w.position.set(s * .12, .82, -.1); b.add(w); return w; });
  g.userData = { b, wings }; return g;
}
const enemies = L.enemies.map(e => {
  const mesh = e.type === 'walker' ? makeWalker() : e.type === 'hopper' ? makeHopper() : makeFlier();
  mesh.traverse(m => { if (m.isMesh) { m.castShadow = true; m.renderOrder = ENEMY_ORDER; } }); world.add(mesh);
  return Object.assign(e, { mesh, x0: e.x, y0: e.y, vx: -1.6, vy: 0, w: 0.8, h: e.type === 'flier' ? 0.8 : 0.85, alive: true, dead: 0, t: rnd(0, 2), hopT: rnd(.5, 1.2), onG: false, active: false });
});

// ---------- friendly stampede (Dazzle time): "Woolies", round rainbow fluff-cows
function makeWoolie(c) {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  const fm = gloss(c, { roughness: 0.55, clearcoat: 0.3, sheen: 1, sheenColor: new THREE.Color(0xffffff) });
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), fm); p.position.set((i % 3 - 1) * 0.3, 0.6 + Math.floor(i / 3) * 0.22, rnd(-.15, .15)); b.add(p); }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), gloss(0xfff3e0)); head.position.set(0.55, 0.72, 0); b.add(head);
  const eyes = face2(head, 0.04, 0.2, 0.7, false); eyes.forEach(e => { e.position.x += 0.05; });
  const legs = [[-.3, -.15], [-.3, .15], [.3, -.15], [.3, .15]].map(([x, z]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.36, 8), gloss(0x5b4a7a)); l.position.set(x, 0.2, z); g.add(l); return l; });
  g.userData = { b, legs }; g.traverse(m => { if (m.isMesh) m.castShadow = true; }); return g;
}
const WCOL = [0xffb3e0, 0xffe27a, 0x9ff0c0, 0x9fd8ff, 0xd0b3ff, 0xffffff];
const woolies = [];
for (let i = 0; i < 18; i++) { const m = makeWoolie(WCOL[i % WCOL.length]); m.visible = false; world.add(m); woolies.push({ mesh: m, on: false }); }

// ---------- power-up: Sunberry
const berryMesh = (() => {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.36, 28, 20), new THREE.MeshPhysicalMaterial({ color: 0xff6fb0, roughness: 0.12, clearcoat: 1, emissive: 0xff2f8a, emissiveIntensity: 0.35 })); b.position.y = 0.38; g.add(b);
  for (let i = 0; i < 8; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: 0xfff6c8 })); const a = i * 2.4, r = 0.34; d.position.set(Math.cos(a) * r * .8, 0.38 + Math.sin(a * 1.3) * .22, Math.sqrt(Math.max(0, r * r - .05)) * .9); g.add(d); }
  const lf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), gloss(0x4fd84a)); lf.scale.set(1.6, .35, .8); lf.position.set(0.08, 0.76, 0); lf.rotation.z = -.4; g.add(lf);
  face2(g, 0.4, 0.3, 0.8, false);
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.renderOrder = 45; } }); g.visible = false; world.add(g); return g;
})();

// ======================= World 10 boss: King Thornbuckle =======================
// A round, grumpy bramble king. Telegraphs every attack (shake + glowing "!" + crouch), 3 phases (2 bops each).
let B = null;
const bossFx = { waves: [], seeds: [] };
if (L.arena) {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  const bodyM = gloss(0x8a5cff, { roughness: 0.3, emissive: 0x000000 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.25, 40, 30), bodyM); body.position.y = 1.3; b.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.85, 28, 20), gloss(0xd8c8ff)); belly.position.set(0, 1.0, 0.62); belly.scale.set(1, 0.9, 0.5); b.add(belly);
  const thornM = gloss(0x3fc45a, { roughness: 0.35 });
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const t = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 10), thornM); t.position.set(Math.cos(a) * 1.25, 1.3 + Math.sin(a) * 1.25, -0.25); t.rotation.z = a - Math.PI / 2; if (Math.sin(a) > -0.3) b.add(t); }
  const crown = new THREE.Group(); crown.position.y = 2.55; b.add(crown);
  const gold = gloss(0xffd23f, { metalness: 0.5, roughness: 0.2, emissive: 0xffa000, emissiveIntensity: 0.3 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.3, 24, 1, true), gold); crown.add(band);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const p = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.4, 8), gold); p.position.set(Math.cos(a) * 0.62, 0.32, Math.sin(a) * 0.62); crown.add(p); const gem = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), gloss([0x3fd0ff, 0xff8adf, 0x5fe06a][i % 3])); gem.position.set(Math.cos(a) * 0.68, 0.0, Math.sin(a) * 0.68); crown.add(gem); }
  const eyes = face2(b, 1.55, 1.1, 2.4, true);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 20, Math.PI), new THREE.MeshBasicMaterial({ color: 0x3a2010 })); mouth.position.set(0, 1.05, 1.18); b.add(mouth);
  const feet = [-1, 1].map(s => { const f = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), gloss(0x5b3a8a)); f.scale.set(1, .6, 1.3); f.position.set(s * .6, .15, .1); g.add(f); return f; });
  // telegraph "!" bubble
  const tc = canvasTex(128, 128, (c, w) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 64, 58, 0, 7); c.fill(); c.fillStyle = '#ffb21f'; c.font = '900 100px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillText('!', 64, 100); });
  const tell = new THREE.Sprite(new THREE.SpriteMaterial({ map: tc, depthTest: false, transparent: true })); tell.scale.set(1.1, 1.1, 1); tell.position.y = 3.6; tell.renderOrder = 120; g.add(tell);
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.renderOrder = ENEMY_ORDER; } });
  world.add(g);
  B = { mesh: g, b, bodyM, eyes, mouth, feet, tell, crown, x: 0, y: 3, vx: 0, vy: 0, w: 2.3, h: 2.5, onG: true, hp: 6, st: 'idle', t: 0, face: -1, on: false, done: false, next: 0, seedT: 0 };
  bossFx.waveMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 20, 12), new THREE.MeshPhysicalMaterial({ color: 0xb88bff, emissive: 0x8a5cff, emissiveIntensity: 0.8, roughness: 0.2, clearcoat: 1 }), 8);
  bossFx.waveMesh.frustumCulled = false; bossFx.waveMesh.renderOrder = 55; world.add(bossFx.waveMesh);
  bossFx.seedMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.35, 1), gloss(0x3fc45a, { emissive: 0x1a8a3a, emissiveIntensity: 0.4 }), 8);
  bossFx.seedMesh.frustumCulled = false; bossFx.seedMesh.renderOrder = 55; world.add(bossFx.seedMesh);
  bossFx.markMesh = new THREE.InstancedMesh(new THREE.RingGeometry(0.35, 0.6, 28), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }), 8);
  bossFx.markMesh.frustumCulled = false; bossFx.markMesh.renderOrder = 54; world.add(bossFx.markMesh);
  resetBoss();
}
function resetBoss() {
  if (!B) return;
  Object.assign(B, { x: L.arena.x1 - 7, y: 3, vx: 0, vy: 0, hp: 6, st: 'idle', t: 0, face: -1, on: false, done: false, next: 0, seedT: 2, inv: 0, cycle: 0 });
  B.mesh.visible = true; B.mesh.rotation.set(0, 0, 0); B.mesh.scale.setScalar(1); bossFx.waves.length = 0; bossFx.seeds.length = 0;
  for (let y = 3; y < H; y++) setTile(L.arena.x0, y, 0); gate.position.y = 3 + (H - 3) / 2 + 22;
  $('bossBar') && $('bossBar').classList.remove('on');
}
const bossPhase = () => B.hp > 4 ? 1 : B.hp > 2 ? 2 : 3;
function bossTrigger() {
  if (!B || B.on || B.done || P.x < L.arena.x0 + 3.5) return;
  B.on = true; B.st = 'roar'; B.t = 0;
  for (let y = 3; y < H; y++) setTile(L.arena.x0, y, 9);
  banner('King Thornbuckle!', 2.2); A.sfx('wonder'); G.shake = 0.5; $('bossBar').classList.add('on'); updBossBar();
}
function updBossBar() { $('bossFill').style.width = (B.hp / 6 * 100) + '%'; }
function bossSet(st) { B.st = st; B.t = 0; }
function stepBoss(dt) {
  if (!B || !B.on) return;
  B.t += dt; if (B.inv > 0) B.inv -= dt;
  const ph = bossPhase(), a = L.arena, toP = Math.sign(P.x - B.x) || -1;
  const grav = () => { B.vy = Math.max(-30, B.vy - 55 * dt); const was = B.onG; moveBody(B, dt); return B.onG && !was; };
  gate.position.y = lerp(gate.position.y, 3 + (H - 3) / 2, 1 - Math.exp(-dt * 6));
  switch (B.st) {
    case 'roar': if (B.t > 1.6) bossSet('walk'); break;
    case 'walk': {
      B.face = toP; B.vx = toP * (1.6 + ph * 0.6); grav();
      if (B.t > 2.2 - ph * 0.3) { const pick = ph === 1 ? 'tell' : (B.cycle++ % 2 ? 'tell' : 'crouch'); B.vx = 0; bossSet(pick); }
      break;
    }
    case 'tell': B.vx = 0; grav(); if (B.t > 0.9 - ph * 0.08) { bossSet('charge'); B.vx = B.face * (9 + ph * 1.5); A.sfx('bump'); } break;
    case 'charge': B.hitWall = 0; moveBody(B, dt); if (Math.random() < .5) emit(B.x - B.face, 3.1, 0.5, 1, { color: 0xffffff, smin: .5, smax: 2, g: 2, size: 1.2 });
      if (B.hitWall || B.x < a.x0 + 2.5 || B.x > a.x1 - 2.5) { B.vx = 0; B.x = clamp(B.x, a.x0 + 2.5, a.x1 - 2.5); G.shake = 0.35; A.sfx('stomp'); bossSet('dizzy'); emit(B.x + B.face * 1.2, 4, 0.5, 20, { color: 0xffffff, smin: 2, smax: 5, g: 4 }); } break;
    case 'dizzy': B.vx = 0; grav(); if (B.t > 2.0 - ph * 0.3) bossSet('walk'); break;
    case 'crouch': B.vx = 0; grav(); if (B.t > 0.75) { B.vy = 19; B.vx = clamp((P.x - B.x) * 1.0, -7, 7); B.onG = false; bossSet('air'); A.sfx('bigjump'); } break;
    case 'air': if (grav()) { G.shake = 0.5; A.sfx('stomp'); const sp = 7.5 + ph; bossFx.waves.push({ x: B.x - 1.2, v: -sp, t: 0 }, { x: B.x + 1.2, v: sp, t: 0 }); emit(B.x, 3.1, 0.5, 30, { color: [0xb88bff, 0xffffff], smin: 3, smax: 7, g: 6, up: .3 }); B.vx = 0; bossSet('dizzy'); B.t = 0.6; } break;
    case 'hurt': B.vx = 0; grav(); if (B.t > 1.1) { bossSet(B.hp === 4 || B.hp === 2 ? 'roar' : 'walk'); if (B.st === 'roar') { banner(B.hp === 4 ? 'He’s getting grumpy!' : 'Final phase!', 1.8); G.shake = 0.4; } } break;
    case 'dead': B.mesh.rotation.z += dt * 8; B.mesh.scale.setScalar(Math.max(0.01, 1 - B.t * 0.45)); B.y += dt * 2;
      if (Math.random() < dt * 20) emit(B.x + rnd(-1.5, 1.5), B.y + rnd(0, 2.5), 0.5, 6, { color: [0xff6fd0, 0xffd23f, 0x5fe06a, 0x3fd0ff, 0xb88bff], glow: 1.8, smin: 2, smax: 6, g: 2, size: 1, spin: true });
      if (B.t > 2.2) { B.mesh.visible = false; B.on = false; winBoss(); } break;
  }
  B.x = clamp(B.x, a.x0 + 2.2, a.x1 - 2.2);
  // phase 3: thorn-seeds rain down on glowing markers
  if (ph === 3 && B.st !== 'dead' && B.st !== 'hurt') { B.seedT -= dt; if (B.seedT <= 0) { B.seedT = 2.4; for (const ox of [0, rnd(3, 5) * (Math.random() < .5 ? -1 : 1)]) bossFx.seeds.push({ x: clamp(P.x + ox, a.x0 + 2, a.x1 - 2), y: 16, t: 0 }); } }
  for (let i = bossFx.waves.length - 1; i >= 0; i--) { const w = bossFx.waves[i]; w.t += dt; w.x += w.v * dt; if (w.x < a.x0 + 1 || w.x > a.x1 - 1) { bossFx.waves.splice(i, 1); continue; }
    if (G.mode === 'play' && Math.abs(w.x - P.x) < 0.6 && P.y < 3.75) hurt(); }
  for (let i = bossFx.seeds.length - 1; i >= 0; i--) { const sd = bossFx.seeds[i]; sd.t += dt; if (sd.t > 1.0) sd.y -= dt * 22;
    if (G.mode === 'play' && sd.t > 1 && Math.abs(sd.x - P.x) < 0.65 && sd.y < P.y + P.h && sd.y + 0.6 > P.y) hurt();
    if (sd.y < 3.2) { emit(sd.x, 3.2, 0.3, 10, { color: [0x5fe06a, 0xffffff], smin: 1, smax: 3, g: 4 }); bossFx.seeds.splice(i, 1); } }
  // touching the king
  if (G.mode === 'play' && B.st !== 'dead' && Math.abs(B.x - P.x) < (B.w + P.w) / 2 - 0.1 && P.y < B.y + B.h && P.y + P.h > B.y + 0.1) {
    if (P.vy < 0 && P.y > B.y + B.h * 0.5 && B.inv <= 0) {
      B.hp--; B.inv = 1.2; updBossBar(); addScore(1000, B.x, B.y + 3.2); A.sfx('stomp', 3); G.stop = 0.12; G.shake = 0.4;
      P.vy = 20; P.cut = !input.jump; P.vx = -toP * 6;
      emit(B.x, B.y + 2.6, 0.5, 30, { color: [0xffffff, 0xffd23f, 0xb88bff], glow: 1.6, smin: 2, smax: 6, g: 4, size: 1, spin: true });
      bossFx.waves.length = 0; bossFx.seeds.length = 0;
      if (B.hp <= 0) { bossSet('dead'); A.sfx('goal'); A.stopMusic(); G.mode = 'goal'; G.goalT = 0; G.pole = 0; G.poleH = 0; P.inv = 9; banner('You did it!', 2.5); flash(1); }
      else bossSet('hurt');
    } else if (B.inv <= 0 || B.st !== 'hurt') { if (P.inv <= 0) { hurt(); P.vx = toP * 8; P.vy = 10; } }
  }
}
function winBoss() {
  B.done = true; $('bossBar').classList.remove('on');
  for (let i = 0; i < 12; i++) popCoins.push({ x: B.x + rnd(-2, 2), y: 4, vy: rnd(9, 15), t: 0 });
  G.coins += 12; save.st.coins += 12; addScore(5000, B.x, 6); confetti(); confetti();
  for (let y = 3; y < H; y++) setTile(L.arena.x0, y, 0);
}
function animBoss(dt, rt) {
  if (!B) return;
  const m = B.mesh; if (B.st !== 'dead') { m.position.set(B.x, B.y, 0); m.rotation.y = B.face * 0.45; }
  else m.position.set(B.x, B.y, 0);
  const tellOn = B.st === 'tell' || B.st === 'crouch';
  B.tell.visible = tellOn && Math.floor(rt * 8) % 2 === 0;
  const sh = tellOn ? Math.sin(rt * 60) * 0.06 : 0;
  B.b.position.x = sh;
  const ph = bossPhase();
  B.bodyM.color.setHex(ph === 1 ? 0x8a5cff : ph === 2 ? 0x5c7cff : 0x3fa7ff);
  B.bodyM.emissive.setHex(tellOn ? 0x6f4fd0 : (B.inv > 0 && Math.floor(rt * 16) % 2 ? 0x8080ff : 0x000000));
  const sq = B.st === 'crouch' ? 0.8 : B.st === 'air' ? 1.12 : 1 + Math.sin(rt * 6) * 0.02;
  B.b.scale.set(2 - sq, sq, 2 - sq);
  B.crown.rotation.z = B.st === 'dizzy' ? Math.sin(rt * 8) * 0.3 : 0;
  if (B.st === 'dizzy' && Math.random() < dt * 8) emit(B.x + rnd(-.6, .6), B.y + 3.2, 0.8, 1, { color: 0xffd23f, glow: 2, g: 0, smin: .5, smax: 1, size: .9, spin: true });
  B.feet.forEach((f, i) => { f.position.z = 0.1 + (Math.abs(B.vx) > 0.5 ? Math.sin(rt * 14 + i * Math.PI) * 0.35 : 0); });
  let k = 0; for (const w of bossFx.waves) { _m.compose(_p.set(w.x, 3.1, 0), _q.identity(), _s.set(1.2, 0.9 + Math.sin(w.t * 20) * 0.1, 2.4)); bossFx.waveMesh.setMatrixAt(k++, _m); if (k >= 8) break; }
  bossFx.waveMesh.count = k; bossFx.waveMesh.instanceMatrix.needsUpdate = true;
  k = 0; let mk = 0;
  for (const sd of bossFx.seeds) { if (k >= 8) break; _m.compose(_p.set(sd.x, sd.y, 0), _q.setFromEuler(_e.set(rt * 3, rt * 2, 0)), _s.setScalar(1)); bossFx.seedMesh.setMatrixAt(k++, _m);
    _m.compose(_p.set(sd.x, 3.03, 0), _q.setFromEuler(_e.set(-Math.PI / 2, 0, 0)), _s.setScalar(1 + Math.sin(rt * 14) * 0.15)); bossFx.markMesh.setMatrixAt(mk++, _m); }
  bossFx.seedMesh.count = k; bossFx.markMesh.count = mk; bossFx.seedMesh.instanceMatrix.needsUpdate = true; bossFx.markMesh.instanceMatrix.needsUpdate = true;
}

// ======================= game state =======================
const STEP = 1 / 120;
const P = { x: 2.5, y: 3, vx: 0, vy: 0, w: 0.7, h: 0.85, onG: false, coyote: 0, buf: 0, face: 1, held: false, cut: false, big: false, inv: 0, squash: 0, run: 0, idle: 0, blink: 2, grow: 0, landV: 0, stuck: 0 };
const G = { mode: 'title', t: 0, coins: 0, score: 0, stomps: 0, combo: 0, medals: [0, 0, 0], cp: { x: 2.5, y: 3 }, wonder: 0, wonderDone: false, stop: 0, shake: 0, deadT: 0, pipeT: 0, pipe: null, goalT: 0, pole: 0, poleH: 0, secret: false, hurts: 0, falls: 0, stampT: 0, berry: null, camX: 12, camY: 6.4, roll: 0, look: 0, pulse: 0, fade: 0 };
let input = { x: 0, jump: false, run: false, down: false }, prevJump = false;

function solidAt(tx, ty, up) { const v = tile(tx, ty); return isSolid(v) || (up && v === 6); }
function boxHits(x, y, w, h, up) {
  const x0 = Math.floor(x - w / 2 + 0.001), x1 = Math.floor(x + w / 2 - 0.001), y0 = Math.floor(y + 0.001), y1 = Math.floor(y + h - 0.001);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidAt(tx, ty, up)) return true;
  return false;
}
// move a body (bottom-centre x,y) through the tile grid, axis by axis
function moveBody(b, dt, onBump) {
  b.x += b.vx * dt;
  if (b.vx > 0) { const cx = Math.floor(b.x + b.w / 2); for (let ty = Math.floor(b.y + 0.02); ty <= Math.floor(b.y + b.h - 0.02); ty++) if (solidAt(cx, ty)) { b.x = cx - b.w / 2 - 0.0005; b.vx = 0; b.hitWall = 1; break; } }
  else if (b.vx < 0) { const cx = Math.floor(b.x - b.w / 2); for (let ty = Math.floor(b.y + 0.02); ty <= Math.floor(b.y + b.h - 0.02); ty++) if (solidAt(cx, ty)) { b.x = cx + 1 + b.w / 2 + 0.0005; b.vx = 0; b.hitWall = -1; break; } }
  const was = b.onG; b.onG = false;
  b.y += b.vy * dt;
  const x0 = Math.floor(b.x - b.w / 2 + 0.02), x1 = Math.floor(b.x + b.w / 2 - 0.02);
  if (b.vy <= 0) {
    const ry = Math.floor(b.y);
    for (let tx = x0; tx <= x1; tx++) if (solidAt(tx, ry)) { if (b.vy < -0.1 || was) { b.landV = b.vy; } b.y = ry + 1; b.vy = 0; b.onG = true; break; }
  } else {
    const ry = Math.floor(b.y + b.h);
    let best = -1, bd = 9;
    for (let tx = x0; tx <= x1; tx++) if (solidAt(tx, ry, !!onBump)) { const d = Math.abs(tx + 0.5 - b.x); if (d < bd) { bd = d; best = tx; } }
    if (best >= 0) { b.y = ry - b.h; b.vy = 0; if (onBump) onBump(best, ry); }
  }
}

// ---------- UI helpers
function toast(msg) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; $('toasts').appendChild(d); setTimeout(() => d.remove(), 2200); }
let bannerT = 0, bannerTO = 0; function banner(msg, t = 1.6) { const b = $('banner'); b.textContent = msg; b.classList.add('on'); clearTimeout(bannerTO); bannerTO = setTimeout(() => b.classList.remove('on'), t * 1000); }
function flash(a = 0.8) { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = a; requestAnimationFrame(() => { f.style.transition = 'opacity .6s'; f.style.opacity = 0; }); }
function addScore(n, x, y) { G.score += n; if (x !== undefined) floatText('+' + n, x, y); }
const floaters = [];
function floatText(txt, x, y) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
  g.font = '700 64px Fredoka, sans-serif'; g.textAlign = 'center'; g.lineWidth = 12; g.strokeStyle = '#2b3a67'; g.strokeText(txt, 128, 70); g.fillStyle = '#fff'; g.fillText(txt, 128, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.scale.set(1.6, 0.6, 1); s.position.set(x, y, 1); s.renderOrder = 200; fgScene.add(s);
  floaters.push({ s, t: 0 });
}

// ---------- events
function collectCoin(x, y, fromBlock) {
  G.coins++; save.st.coins++; addScore(100); A.sfx('coin', G.combo);
  emit(x, y, 0.3, 10, { color: [0xfff2a0, 0xffd23f, 0xffffff], glow: 2.2, smin: 1.5, smax: 4, g: 2, lmin: .3, lmax: .6, size: .7 });
}
function bump(tx, ty) {
  const key = tx + ',' + ty, m = bumpers.get(key), v = tile(tx, ty);
  A.sfx('bump'); if (m) m.userData.bump = 0.22;
  emit(tx + 0.5, ty, 0.3, 5, { color: 0xffffff, smin: 1, smax: 2, g: 4, size: .6 });
  const b = L.blocks.find(b => b.x === tx && b.y === ty);
  if (v === 3 || v === 7 || v === 6) {
    setTile(tx, ty, 4); if (m) { m.material = mats[4]; m.visible = true; m.castShadow = true; }
    if (v === 3) { G.berry = { x: tx + 0.5, y: ty + 0.2, vx: 0, vy: 0, w: 0.7, h: 0.75, st: 'rise', t: 0, onG: false }; berryMesh.visible = true; A.sfx('sprout'); }
    else { popCoins.push({ x: tx + 0.5, y: ty + 1, vy: 11, t: 0 }); collectCoin(tx + 0.5, ty + 1.2, true); if (v === 6) { toast('Hidden block!'); } }
  }
  // knock enemies standing on the block
  for (const e of enemies) if (e.alive && Math.abs(e.x - (tx + 0.5)) < 0.8 && Math.abs(e.y - (ty + 1)) < 0.2) killEnemy(e, true);
}
function killEnemy(e, flip) {
  e.alive = false; e.dead = 0.001; e.flip = flip; save.st.stomps++; G.stomps++;
  emit(e.x, e.y + 0.4, 0.4, 16, { color: [0xffffff, 0xfff2a0, 0xbfe9ff], smin: 2, smax: 5, g: 6, size: .9 });
}
function hurt() {
  if (P.inv > 0 || G.mode !== 'play') return;
  if (P.big) { P.big = false; P.h = 0.85; P.inv = 1.8; P.grow = -1; A.sfx('shrink'); G.hurts++; save.st.hurts++; G.shake = 0.25; return; }
  die(false);
}
function die(fell) {
  if (G.mode !== 'play') return;
  G.mode = 'dead'; G.deadT = 0; P.vy = fell ? 0 : 14; P.vx = 0; A.sfx(fell ? 'fall' : 'hurt');
  if (fell) { G.falls++; save.st.falls++; } else { G.hurts++; save.st.hurts++; }
  if (G.wonder > 0) endWonder();
}
function respawn() {
  Object.assign(P, { x: G.cp.x, y: G.cp.y, vx: 0, vy: 0, big: false, h: 0.85, inv: 1.6, onG: false, buf: 0, coyote: 0 });
  G.mode = 'play'; G.camX = P.x + 4; flash(0.5);
  if (B && !B.done) resetBoss();
  if (G.berry && G.berry.st !== 'gone') { G.berry = null; berryMesh.visible = false; }
}
function startWonder() {
  G.wonder = 20; G.wonderDone = true; save.st.wonders++; G.stampT = 0.6; flash(0.9); G.shake = 0.4;
  A.sfx('wonder'); A.setFunky(true); banner({ stampede: 'Dazzle Time!', float: 'Dazzle Time · Floaty!', tilt: 'Dazzle Time · Topsy-turvy!', zoom: 'Dazzle Time · Close-up!', speed: 'Dazzle Time · Zoomies!' }[WK] || 'Dazzle Time!', 2.2); $('wonderBar').classList.add('on');
  emit(L.bloom.x, L.bloom.y + 1.2, 0.5, 90, { color: [0xff6fd0, 0xffd23f, 0x5fe06a, 0x3fd0ff, 0xb88bff], glow: 1.8, smin: 3, smax: 9, g: 3, lmin: .8, lmax: 1.6, size: 1.2, spin: true });
  bloom.visible = false;
}
function endWonder() {
  G.wonder = 0; A.setFunky(false); $('wonderBar').classList.remove('on'); flash(0.6);
  for (const c of L.coins) if (c.wonder && !c.got) { c.got = true; emit(c.x, c.y, 0, 3, { color: 0xffffff, glow: 1.6, g: 0, smin: .5, smax: 1.5, size: .5 }); }
  for (const w of woolies) { w.on = false; w.mesh.visible = false; }
  if (G.mode === 'play') toast('Dazzle Time is over!');
}

// ---------- input: keyboard, gamepad, touch
const keys = new Set();
addEventListener('keydown', e => { keys.add(e.code); if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); menuKey(e.code); });
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
const touch = { x: 0, down: false, jump: false, run: false, padId: null, ox: 0, oy: 0 };
const pad = $('pad'), base = $('padBase'), knob = $('padKnob');
pad.addEventListener('pointerdown', e => {
  touch.padId = e.pointerId; pad.setPointerCapture(e.pointerId); pad.classList.add('act');
  const r = base.getBoundingClientRect(); touch.ox = clamp(e.clientX, 70, innerWidth * .45 - 58); touch.oy = clamp(e.clientY, 90, innerHeight - 80);
  base.style.left = (touch.ox - 58) + 'px'; base.style.top = (touch.oy - 58) + 'px'; base.style.bottom = 'auto';
  padMove(e); e.preventDefault();
});
function padMove(e) {
  if (e.pointerId !== touch.padId) return;
  let dx = e.clientX - touch.ox, dy = e.clientY - touch.oy; const d = Math.hypot(dx, dy), R = 43;
  if (d > R) { dx *= R / d; dy *= R / d; }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  const nx = dx / R; touch.x = Math.abs(nx) < 0.18 ? 0 : clamp((nx - Math.sign(nx) * .18) / .82, -1, 1);
  touch.down = dy / R > 0.6 && Math.abs(nx) < 0.6; touch.autoRun = Math.abs(nx) > 0.92;
}
pad.addEventListener('pointermove', padMove);
const padUp = e => { if (e.pointerId !== touch.padId) return; touch.padId = null; touch.x = 0; touch.down = false; touch.autoRun = false; knob.style.transform = ''; pad.classList.remove('act'); };
pad.addEventListener('pointerup', padUp); pad.addEventListener('pointercancel', padUp);
function holdBtn(el, k) {
  const ids = new Set();
  const on = e => { ids.add(e.pointerId); el.setPointerCapture(e.pointerId); touch[k] = true; el.classList.add('down'); e.preventDefault(); A.unlock(); };
  const off = e => { ids.delete(e.pointerId); if (!ids.size) { touch[k] = false; el.classList.remove('down'); } };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off);
}
holdBtn($('btnJump'), 'jump'); holdBtn($('btnRun'), 'run');
let gpPrev = {};
function pollPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null;
  for (const p of pads) if (p && p.connected) { gp = p; break; }
  if (!gp) return null;
  const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
  const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  const st = { x: (Math.abs(ax) > 0.2 ? ax : 0) + (b(15) ? 1 : 0) - (b(14) ? 1 : 0), jump: b(0) || b(1), run: b(2) || b(3) || b(7) || b(6), down: ay > 0.6 || b(13), up: ay < -0.6 || b(12), start: b(9), a: b(0), back: b(1) };
  // menu edges
  const edge = k => st[k] && !gpPrev[k];
  if (G.mode !== 'play' || overlayOpen()) {
    if (edge('up') || (st.x < -0.5 && !(gpPrev.x < -0.5))) menuKey(st.x < -0.5 ? 'ArrowLeft' : 'ArrowUp');
    if (edge('down') || (st.x > 0.5 && !(gpPrev.x > 0.5))) menuKey(st.x > 0.5 ? 'ArrowRight' : 'ArrowDown');
    if (edge('a')) menuKey('Enter'); if (edge('back')) menuKey('Escape');
  }
  if (edge('start')) menuKey('Escape');
  gpPrev = st; return st;
}
function readInput() {
  if (BH.bot) return botInput();
  const k = c => keys.has(c);
  const gp = pollPad();
  let x = (k('ArrowRight') || k('KeyD') ? 1 : 0) - (k('ArrowLeft') || k('KeyA') ? 1 : 0) + touch.x + (gp ? gp.x : 0);
  return { x: clamp(x, -1, 1), jump: k('Space') || k('KeyZ') || k('ArrowUp') || k('KeyW') || touch.jump || !!(gp && gp.jump),
    run: k('ShiftLeft') || k('ShiftRight') || k('KeyX') || touch.run || touch.autoRun || !!(gp && gp.run), down: k('ArrowDown') || k('KeyS') || touch.down || !!(gp && gp.down) };
}

// ---------- autopilot used for automated testing (BH.bot = true)
function botEnemyHit(b, t) {
  if (P.inv > t + 0.05) return 0;
  for (const e of enemies) {
    if (!e.alive || !e.active) continue;
    let ex = e.x, ey = e.y;
    if (e.type === 'walker') ex = e.x + e.vx * t;
    else if (e.type === 'flier') { ex = e.x0 + Math.sin((e.t + t) * 0.7) * 2.6; ey = e.y0 + Math.sin((e.t + t) * 2.1) * 0.7; }
    const eh = e.type === 'hopper' ? 1.6 : e.h;
    if (Math.abs(ex - b.x) < (e.w + b.w) / 2 + 0.05 && b.y < ey + eh && b.y + b.h > ey) { if (b.vy < 0 && b.y > ey + e.h * 0.42) return 2; return 1; }
  }
  return 0;
}
// plans a jump by simulating the real physics a couple of seconds ahead
function botSim(hold, run, ax, T, jump) {
  const b = { x: P.x, y: P.y, vx: P.vx, vy: P.vy, w: P.w, h: P.h, onG: P.onG }; let t = 0, air = false, cut = false, jumped = !jump;
  const fast = G.wonder > 0 && WK === 'speed' ? 1.25 : 1, maxSp = (run ? 10.5 : 6.2) * fast, gk = TH.grav * (G.wonder > 0 && WK === 'float' ? 0.62 : 1);
  while (t < T) {
    const target = ax * maxSp;
    if (ax) { const opp = Math.sign(b.vx) && Math.sign(b.vx) !== Math.sign(ax); const acc = (b.onG ? (opp ? 70 : run ? 36 : 30) : (opp ? 40 : 22)) * (b.onG ? Math.max(0.45, TH.fric) : 1);
      if (Math.abs(b.vx) < Math.abs(target) || opp) b.vx += Math.sign(target - b.vx) * Math.min(Math.abs(target - b.vx), acc * STEP); else b.vx += Math.sign(target - b.vx) * Math.min(Math.abs(target - b.vx), 14 * STEP); }
    else b.vx -= Math.sign(b.vx) * Math.min(Math.abs(b.vx), (b.onG ? 34 * TH.fric : 7) * STEP);
    if (!jumped && b.onG) { b.vy = 21.5 + Math.abs(b.vx) * 0.22; jumped = true; b.onG = false; }
    const held = t < hold;
    if (!held && b.vy > 0 && !cut) { b.vy *= 0.5; cut = true; }
    b.vy = Math.max(-24 * Math.sqrt(gk), b.vy - (b.vy > 0 ? (held ? 52 : 80) : 78) * gk * STEP);
    moveBody(b, STEP); t += STEP;
    if (b.y < 0.6) return { ok: false, x: b.x };
    const eh = botEnemyHit(b, t); if (eh === 1) return { ok: false, x: b.x }; if (eh === 2) return { ok: true, x: b.x + 2, t };
    if (!b.onG) air = true; else if (air) return { ok: true, x: b.x, t };
  }
  return { ok: true, x: b.x, t, end: true };
}
const bot = { hold: 0, cool: 0, lastX: 0, stuckT: 0, run: true, ax: 1, k: 0, wait: 0 };
function botInput() {
  const i = { x: 1, run: true, jump: false, down: false };
  if (G.mode !== 'play') return i;
  if (B && B.on) return botBoss(i);
  if (bot.hold > 0) { bot.hold -= STEP; i.jump = true; i.run = bot.run; i.x = bot.ax; return i; }
  if (!P.onG) { i.run = bot.run; i.x = bot.ax; return i; }
  if (bot.wait > 0) { bot.wait -= STEP; i.x = 0; return i; }
  if (Math.abs(P.x - bot.lastX) < 0.01) bot.stuckT += STEP; else bot.stuckT = 0; bot.lastX = P.x;
  // walking on is fine?
  const w = botSim(0, true, 1, 2.0, false);
  if (w.ok && w.x - P.x > 0.25 + Math.min(0.5, Math.abs(P.vx) * 0.05) && bot.stuckT < 0.5) { bot.run = true; bot.ax = 1; return i; }
  let best = null;
  for (const [h, r, ax] of [[0.42, 1, 1], [0.3, 1, 1], [0.18, 1, 1], [0.08, 1, 1], [0.42, 0, 1], [0.25, 0, 1], [0.12, 0, 1], [0.42, 0, 0], [0.2, 0, 0]]) {
    const sm = botSim(h, !!r, ax, 2.2, true);
    if (!sm.ok) continue; const sc = sm.x - (sm.end ? 3 : 0);
    if (!best || sc > best.sc + 0.01) best = { h, r, ax, sc };
  }
  if (best && best.sc > P.x - 0.5) { bot.hold = best.h; bot.run = !!best.r; bot.ax = best.ax; i.jump = true; i.run = bot.run; i.x = bot.ax; return i; }
  if (w.ok && bot.stuckT < 0.5) return i;
  bot.wait = 0.25; i.x = bot.stuckT > 2 ? -1 : 0; return i;
}
function botBoss(i) {
  let want = false; const dx = B.x - P.x, adx = Math.abs(dx);
  i.x = Math.sign(dx);
  if (B.st === 'hurt' || B.st === 'roar') { i.x = -Math.sign(dx); if (adx > 6) i.x = 0; }
  if (B.st === 'crouch' || B.st === 'air') { i.x = adx < 5 ? -Math.sign(dx) : 0; }
  if (B.st === 'tell') { i.x = adx < 6 ? 0 : Math.sign(dx); }
  if (B.st === 'charge' && Math.sign(B.vx) === -Math.sign(dx) && adx < 4.2) want = true;
  if ((B.st === 'walk' || B.st === 'dizzy') && adx < 3.4) want = true;
  for (const w of bossFx.waves) { const d = w.x - P.x; if (Math.sign(w.v) === -Math.sign(d) && Math.abs(d) < 1.9) want = true; }
  for (const sd of bossFx.seeds) if (Math.abs(sd.x - P.x) < 1.2) i.x = sd.x > P.x ? -1 : 1;
  if (!P.onG) i.x = P.vy < 0 && B.st !== 'charge' ? Math.sign(dx) * (adx > 0.3 ? 1 : 0) : i.x;
  if (P.x < L.arena.x0 + 1.8) i.x = 1; if (P.x > L.arena.x1 - 1.8) i.x = -1;
  if (bot.hold > 0) { bot.hold -= STEP; i.jump = true; if (bot.hold <= 0) bot.cool = 0.03; }
  else if (bot.cool > 0) bot.cool -= STEP;
  else if (want && (P.onG || P.coyote > 0)) { bot.hold = 0.42; i.jump = true; }
  return i;
}

// ---------- simulation step
function step(dt) {
  G.t += dt; save.st.playTime += dt;
  input = readInput();
  const jp = input.jump && !prevJump; prevJump = input.jump;
  if (P.inv > 0) P.inv -= dt;
  if (G.wonder > 0) {
    G.wonder -= dt; G.stampT -= dt;
    if (G.stampT <= 0) { G.stampT = rnd(1.4, 2.2); stampede(); }
    if (G.wonder <= 0) endWonder();
  }
  for (const w of woolies) if (w.on) {
    w.x += w.v * dt; w.vy -= 30 * dt; w.y += w.vy * dt;
    let gy = 0; for (let ty = Math.min(H - 1, Math.floor(w.y + 1)); ty >= 0; ty--) if (solidAt(Math.floor(w.x), ty)) { gy = ty + 1; break; }
    if (w.y < gy) { w.y = gy; w.vy = rnd(4, 9); if (Math.random() < .15) A.sfx('moo'); emit(w.x, gy, w.z, 2, { color: 0xffffff, smin: .5, smax: 1.5, g: 3, size: .6 }); }
    if (w.x > G.camX + 26) { w.on = false; w.mesh.visible = false; }
  }
  if (G.mode === 'play') playStep(dt, jp);
  else if (G.mode === 'dead') { G.deadT += dt; if (G.deadT > 0.35) { P.vy -= 40 * dt; P.y += P.vy * dt; } if (G.deadT > 1.5) respawn(); }
  else if (G.mode === 'pipe') pipeStep(dt);
  else if (G.mode === 'goal') goalStep(dt);
  stepEnemies(dt); stepBerry(dt); if (G.mode === 'play' || G.mode === 'dead' || (G.mode === 'goal' && B)) stepBoss(dt);
  for (const c of popCoins) { c.t += dt; c.vy -= 40 * dt; c.y += c.vy * dt; }
  for (let i = popCoins.length - 1; i >= 0; i--) if (popCoins[i].t > 0.55) popCoins.splice(i, 1);
}
function stampede() {
  const n = 3 + Math.floor(rnd(0, 3));
  for (let i = 0; i < n; i++) {
    const w = woolies.find(w => !w.on); if (!w) return;
    const front = Math.random() < 0.5;
    Object.assign(w, { on: true, x: G.camX - 20 - i * rnd(1.2, 2.2), y: 9, vy: 0, v: rnd(11, 15), z: front ? rnd(1.6, 2.2) : rnd(-2.6, -2.0) });
    w.mesh.visible = true; w.mesh.scale.setScalar(rnd(.8, 1.15));
  }
}
function playStep(dt, jp) {
  const fast = G.wonder > 0 && WK === 'speed' ? 1.25 : 1, run = input.run, maxSp = (run ? 10.5 : 6.2) * fast;
  const ax = input.x;
  if (ax) {
    const target = ax * maxSp, opp = Math.sign(P.vx) && Math.sign(P.vx) !== Math.sign(ax);
    const acc = (P.onG ? (opp ? 70 : run ? 36 : 30) : (opp ? 40 : 22)) * (P.onG ? Math.max(0.45, TH.fric) : 1);
    if (Math.abs(P.vx) < Math.abs(target) || opp) P.vx += Math.sign(target - P.vx) * Math.min(Math.abs(target - P.vx), acc * dt * Math.max(.4, Math.abs(ax)));
    else P.vx += Math.sign(target - P.vx) * Math.min(Math.abs(target - P.vx), 14 * dt); // ease down from a run
    P.face = Math.sign(ax);
    if (opp && P.onG && Math.abs(P.vx) > 4 && Math.random() < .5) emit(P.x, P.y + .05, 0.2, 1, { color: 0xf3e2c0, smin: .5, smax: 1.5, g: 2, size: .9 });
  } else {
    const dec = P.onG ? 34 * TH.fric : 7; P.vx -= Math.sign(P.vx) * Math.min(Math.abs(P.vx), dec * dt);
  }
  // jump: buffer + coyote + variable height
  if (jp) P.buf = 0.13; else P.buf -= dt;
  if (P.onG) P.coyote = 0.1; else P.coyote -= dt;
  if (P.buf > 0 && P.coyote > 0) {
    P.vy = 21.5 + Math.abs(P.vx) * 0.22; P.buf = 0; P.coyote = 0; P.onG = false; P.cut = false; P.squash = -0.25;
    A.sfx(P.big ? 'bigjump' : 'jump'); emit(P.x, P.y, 0.2, 6, { color: 0xffffff, smin: 1, smax: 2.5, g: 2, up: .3, size: .8 });
  }
  if (P.spring && P.vy <= 0) P.spring = false;
  if (!input.jump && P.vy > 0 && !P.cut && !P.spring) { P.vy *= 0.5; P.cut = true; }
  const gk = TH.grav * (G.wonder > 0 && WK === 'float' ? 0.62 : 1);
  const gr = (P.vy > 0 ? (input.jump || P.spring ? 52 : 80) : 78) * gk;
  P.vy = Math.max(-24 * Math.sqrt(gk), P.vy - gr * dt);
  const wasG = P.onG; P.landV = 0;
  moveBody(P, dt, bump);
  if (P.onG && !wasG) {
    G.combo = 0; const imp = clamp(-P.landV / 24, 0, 1); P.squash = 0.12 + imp * 0.25;
    if (imp > 0.3) { emit(P.x, P.y + .05, 0.3, 8, { color: 0xf6ecd8, smin: 1, smax: 3, g: 1, up: .25, size: 1.1, lmin: .3, lmax: .5 }); A.sfx('land', imp); }
  }
  if (P.onG) { const sx = [Math.floor(P.x - 0.2), Math.floor(P.x + 0.2)].find(tx => tile(tx, Math.floor(P.y - 0.5)) === 10);
    if (sx !== undefined) { const sp = L.springs.find(q => q.x === sx); P.vy = 31; P.spring = true; P.onG = false; P.cut = true; P.squash = -0.3; A.sfx('bigjump'); if (sp) sp.mesh.userData.t = 0.35; emit(P.x, P.y, 0.3, 12, { color: [0xffd23f, 0xffffff], glow: 1.6, smin: 2, smax: 4, g: 3, size: .8 }); } }
  if (P.x < 0.5) { P.x = 0.5; P.vx = Math.max(0, P.vx); }
  // never get stuck inside geometry
  if (boxHits(P.x, P.y, P.w, P.h)) { P.stuck += dt; if (P.stuck > 0.25) { P.y += 0.1; } } else P.stuck = 0;
  if (P.y < -2.5) { die(true); return; }
  // growth needs head-room; grow when possible
  if (P.big && P.h < 1.3 && !boxHits(P.x, P.y, P.w, 1.3)) P.h = 1.3;
  if (P.onG && input.down && Math.abs(P.vx) < 3) for (const p of L.pipes) if ((p.warp === 'down' || p.warp === 'back') && Math.abs(P.y - p.top) < 0.05 && P.x > p.x + 0.35 && P.x < p.x + 1.65) { enterPipe(p); return; }
  // coins
  for (const c of L.coins) {
    if (c.got || (c.wonder && G.wonder <= 0)) continue;
    if (Math.abs(c.x - P.x) < 0.62 && c.y > P.y - 0.3 && c.y < P.y + P.h + 0.3) { c.got = true; collectCoin(c.x, c.y); }
  }
  // medals
  for (const m of L.medals) if (!m.got && Math.abs(m.x - P.x) < 0.95 && m.y > P.y - 0.6 && m.y < P.y + P.h + 0.7) {
    m.got = true; G.medals[m.id] = 1; if (!LV) save.medals[m.id] = 1; (save.lv.medals[LV] = lvMed(LV).slice())[m.id] = 1; addScore(2000, m.x, m.y + 1); A.sfx('medal'); G.shake = 0.15;
    emit(m.x, m.y, 0.4, 40, { color: [0xff8adf, 0xffffff, 0xc9a0ff], glow: 2, smin: 2, smax: 6, g: 1, lmin: .6, lmax: 1.1, size: 1, spin: true });
    toast(`Star medal ${G.medals.reduce((a, b) => a + b, 0)} of 3!`); persist();
  }
  // checkpoint
  L.checkpoints.forEach((c, i) => { if (P.x > c.x && G.cp.x < c.x) { G.cp = { x: c.x + 0.5, y: c.y + 0.1 }; cpFlags[i].userData.fl.material.color.set(0x3fc45a); A.sfx('blip'); toast('Checkpoint!'); emit(c.x + .5, c.y + 2, -.8, 20, { color: [0x5fe06a, 0xffffff], smin: 1, smax: 4, g: 3, size: .8 }); } });
  // dazzle bloom
  if (L.arena) bossTrigger();
  if (!G.wonderDone && Math.abs(P.x - L.bloom.x) < 0.9 && Math.abs(P.y + 0.5 - (L.bloom.y + 1)) < 1.5) startWonder();
  // goal pole
  if (L.pole && P.x + P.w / 2 >= L.pole.x - 0.1 && P.x < L.pole.x + 2) grabPole();
}
function enterPipe(p) {
  G.mode = 'pipe'; G.pipe = p; G.pipeT = 0; P.vx = 0; P.vy = 0; P.x = p.x + 1; A.sfx('pipe');
}
function pipeStep(dt) {
  const p = G.pipe; G.pipeT += dt;
  if (G.pipeT < 0.7) { P.y = p.top - G.pipeT * 1.6; }
  else if (G.pipeT < 0.75) {
    if (p.warp === 'down') { P.x = ROOM.x0 + 3.5; P.y = 10; if (!G.secret) { G.secret = true; save.st.secret++; toast('Secret sky garden!'); } }
    else { const ex = L.pipes.find(q => q.warp === 'exit'); P.x = ex.x + 1; P.y = ex.top - 1.2; G.exitPipe = ex; }
    G.camX = P.x; flash(0.6); A.sfx('pipe');
  } else if (p.warp === 'back' && G.pipeT < 1.4) { P.y = Math.min(G.exitPipe.top, P.y + dt * 2); }
  else { if (p.warp === 'back') P.y = G.exitPipe.top; G.mode = 'play'; P.vy = 0; }
}
function grabPole() {
  G.mode = 'goal'; G.goalT = 0; const h = clamp((P.y - L.pole.y0) / (L.pole.y1 - L.pole.y0 - 1), 0, 1);
  G.poleH = h; G.pole = h >= 0.98 ? 5000 : h > .75 ? 2000 : h > .5 ? 1000 : h > .25 ? 400 : 100;
  save.st.bestPole = Math.max(save.st.bestPole, Math.round(h * 100));
  addScore(G.pole, L.pole.x, Math.max(P.y, 3) + 1.5); A.sfx('pole', h); P.vx = 0; P.vy = 0; P.x = L.pole.x - 0.35; P.y = clamp(P.y, L.pole.y0, L.pole.y1);
  if (G.wonder > 0) endWonder(); A.stopMusic();
  emit(L.pole.x, P.y + 0.5, 0.4, 30, { color: [0xffd23f, 0xffffff], glow: 1.8, smin: 2, smax: 6, g: 2, size: 1 });
}
function goalStep(dt) {
  if (!L.pole) { G.goalT += dt; P.vx = 0; P.vy = Math.max(-20, P.vy - 60 * dt); moveBody(P, dt); if (G.goalT > 0.6 && G.goalT % 1.1 < dt) confetti(); if (G.goalT > 5.5 && G.mode === 'goal') showResults(); return; }
  G.goalT += dt; const fl = pole.userData.flag;
  if (P.y > L.pole.y0 + 0.01 && G.goalT < 3) { P.y = Math.max(L.pole.y0, P.y - 7 * dt); P.face = 1; if (G.goalT > 0.3 && Math.random() < .3) emit(P.x + .3, P.y + .5, .2, 1, { color: 0xffffff, g: 0, size: .6 }); }
  else if (!G.walked) { if (!G.walkStart) { G.walkStart = G.goalT; A.sfx('goal'); } P.vx = 4; moveBody(P, dt); P.face = 1; if (P.x > L.house.x - 3.5) { G.walked = G.goalT; P.vx = 0; confetti(); } }
  else if (G.goalT - G.walked > 0.9 && G.goalT - G.walked < 1 && Math.random() < 0.5) confetti();
  fl.position.y = Math.max(0.6, fl.position.y - dt * 5);
  if (G.walked && G.goalT - G.walked > 3.2 && G.mode === 'goal') showResults();
  if (G.goalT > 14 && G.mode === 'goal') showResults();
}
function confetti() {
  for (let i = 0; i < 4; i++) emit(G.camX + rnd(-12, 12), G.camY + 7, rnd(-1, 2), 30, { color: [0xff7ac8, 0xffd23f, 0x5fe06a, 0x3fd0ff, 0xb88bff, 0xffffff], smin: 0, smax: 3, g: 3, vy: -1, lmin: 2.5, lmax: 3.5, size: 1.2, spin: true, flat: true, drag: 0.985, vzr: .5 });
}
function stepEnemies(dt) {
  for (const e of enemies) {
    e.active = Math.abs(e.x - G.camX) < 24 && (e.x < MAIN_END) === (P.x < MAIN_END);
    if (!e.alive) { if (e.dead) e.dead += dt; continue; }
    if (!e.active) continue;
    e.t += dt;
    if (e.type === 'walker') {
      e.vx = Math.sign(e.vx || -1) * (G.wonder > 0 ? 2.2 : 1.6); e.vy = Math.max(-20, e.vy - 50 * dt); e.hitWall = 0;
      const dir = Math.sign(e.vx); const ahead = Math.floor(e.x + dir * 0.5);
      if (e.onG && !solidAt(ahead, Math.floor(e.y - 0.5))) e.vx = -e.vx;
      moveBody(e, dt); if (e.hitWall) e.vx = -e.hitWall * 1.6;
    } else if (e.type === 'hopper') {
      e.vy = Math.max(-20, e.vy - 40 * dt);
      if (e.onG) { e.vx = 0; e.hopT -= dt; if (e.hopT <= 0) { e.vy = G.wonder > 0 ? 13 : 11; e.vx = Math.sign(P.x - e.x) * 1.8; e.hopT = 1.3; e.sq = 0.3; } }
      const was = e.onG; moveBody(e, dt); if (e.onG && !was) e.sq = 0.35;
      if (e.y < -3) { e.alive = false; e.dead = 9; }
    } else {
      e.x = e.x0 + Math.sin(e.t * 0.7) * 2.6; e.y = e.y0 + Math.sin(e.t * 2.1) * 0.7; e.vx = Math.cos(e.t * 0.7);
    }
    if (G.mode !== 'play') continue;
    if (Math.abs(e.x - P.x) < (e.w + P.w) / 2 - 0.08 && P.y < e.y + e.h - 0.05 && P.y + P.h > e.y + 0.1) {
      if (P.vy < 0 && P.y > e.y + e.h * 0.42) {
        killEnemy(e, false); G.combo++; addScore(200 * Math.min(8, G.combo), e.x, e.y + 1.4); A.sfx('stomp', G.combo);
        P.vy = input.jump ? 19 : 13; P.cut = !input.jump; P.squash = 0.3; G.stop = 0.075; G.shake = Math.max(G.shake, 0.18);
      } else hurt();
    }
  }
}
function stepBerry(dt) {
  const b = G.berry; if (!b || b.st === 'gone') return;
  b.t += dt;
  if (b.st === 'rise') { b.y += dt * 1.6; if (b.t > 0.55) { b.st = 'move'; b.vx = 3; } }
  else { b.vy = Math.max(-18, b.vy - 40 * dt); b.hitWall = 0; moveBody(b, dt); if (b.hitWall) b.vx = -b.hitWall * 3; if (b.y < -3) { b.st = 'gone'; berryMesh.visible = false; } }
  if (G.mode === 'play' && Math.abs(b.x - P.x) < 0.75 && b.y < P.y + P.h && b.y + b.h > P.y) {
    b.st = 'gone'; berryMesh.visible = false; addScore(1000, b.x, b.y + 1.2); A.sfx('power'); P.big = true; P.grow = 1; G.stop = 0.1;
    emit(P.x, P.y + .8, .4, 40, { color: [0xff6fb0, 0xffd23f, 0xffffff], glow: 1.8, smin: 2, smax: 6, g: 1, size: 1, spin: true });
  }
}

// ======================= per-frame visuals =======================
const _v = new THREE.Vector3();
function animate(dt, rt) {
  U.time.value = rt;
  // dazzle pulse + beat
  const wTarget = G.wonder > 0 ? 1 : 0; G.pulse = lerp(G.pulse, wTarget, 1 - Math.exp(-dt * 3));
  U.pulse.value = G.pulse; U.wonder.value = G.pulse; U.beat.value = rt * (116 / 60);
  // hero
  const ud = hero.userData;
  const scl = lerp(hero.userData.scl || 1, P.big ? 1.45 : 1, 1 - Math.exp(-dt * (P.grow ? 10 : 6))); hero.userData.scl = scl;
  hero.position.set(P.x, P.y, 0);
  P.squash = lerp(P.squash, 0, 1 - Math.exp(-dt * 12));
  let sy = 1 - P.squash, sxz = 1 + P.squash * 0.7;
  if (!P.onG && G.mode === 'play') { const st = clamp(P.vy * 0.012, -0.12, 0.18); sy += st; sxz -= st * 0.5; }
  const moving = Math.abs(P.vx) > 0.3 && P.onG;
  P.run += dt * (4 + Math.abs(P.vx) * 1.5) * (moving ? 1 : 0);
  if (!moving && P.onG && G.mode === 'play') P.idle += dt; else P.idle = 0;
  const breathe = P.idle > 0.3 ? Math.sin(rt * 3) * 0.025 : 0;
  ud.body.scale.set(sxz, sy + breathe, sxz);
  ud.body.position.y = moving ? Math.abs(Math.sin(P.run)) * 0.08 : 0;
  ud.body.rotation.z = -P.vx * 0.018 - (moving ? 0 : 0);
  const yaw = G.mode === 'goal' && G.walked ? (rt - 0) * 9 : P.face * 0.5 + (P.idle > 2 ? Math.sin(rt * 0.8) * 0.35 : 0);
  hero.rotation.y = G.mode === 'goal' && G.walked ? yaw : lerp(hero.rotation.y, yaw, 1 - Math.exp(-dt * 12));
  ud.feet.forEach((f, i) => {
    const ph = P.run + i * Math.PI;
    f.position.z = 0.06 + (moving ? Math.sin(ph) * 0.18 : 0); f.position.y = 0.06 + (moving ? Math.max(0, Math.cos(ph)) * 0.1 : 0) + (!P.onG ? 0.05 : 0);
  });
  ud.hands.forEach((h, i) => {
    const s = i ? 1 : -1; let y = 0.38 + (moving ? Math.sin(P.run + i * Math.PI) * 0.06 : 0), x = s * 0.47;
    if (!P.onG && G.mode === 'play') y = 0.62;
    if (G.mode === 'goal' && G.walked) { y = 0.75 + Math.sin(rt * 14 + i * 3) * 0.12; x = s * 0.52; }
    if (G.mode === 'goal' && !G.walkStart) { y = 0.7; x = s * 0.3; }
    h.position.set(x, y, 0.05);
  });
  P.blink -= dt; const bl = P.blink < 0.12 ? 0.12 : 1; if (P.blink < 0) P.blink = rnd(2, 4.5);
  ud.eyes.forEach(e => e.scale.y = G.mode === 'dead' ? 0.2 : bl);
  ud.eyes.forEach(e => { e.children[1].position.x = clamp(P.vx * 0.006, -.03, .03); });
  ud.sprout.rotation.z = Math.sin(rt * 4) * 0.1 - P.vx * 0.03; ud.fl.visible = P.big; ud.lf1.visible = ud.lf2.visible = true;
  if (G.mode === 'goal' && G.walked) { hero.position.y = P.y + Math.abs(Math.sin(rt * 7)) * 0.5; }
  if (P.idle > 5 && G.mode === 'play') { const k = (P.idle % 4); if (k < 0.5) hero.position.y = P.y + Math.sin(k / 0.5 * Math.PI) * 0.35; }
  hero.scale.setScalar(scl);
  hero.visible = !(P.inv > 0 && Math.floor(rt * 20) % 2 === 0) && !(G.mode === 'pipe' && G.pipeT > 0.68 && G.pipeT < 0.8);
  if (G.mode === 'dead') hero.rotation.z += dt * 8; else hero.rotation.z = 0;
  // enemies
  for (const e of enemies) {
    const m = e.mesh, u = m.userData;
    if (!e.alive) {
      if (!e.dead || e.dead > 0.6) { m.visible = false; continue; }
      m.visible = true; m.position.set(e.x, e.y, 0);
      if (e.flip) { m.rotation.z = Math.PI; m.position.y = e.y + 1 + e.dead * 4 - e.dead * e.dead * 20; }
      else { u.b.scale.set(1.5, Math.max(0.15, 1 - e.dead * 6), 1.5); }
      continue;
    }
    m.position.set(e.x, e.y, 0); m.visible = Math.abs(e.x - G.camX) < 26;
    const dance = G.pulse > 0.2 ? Math.sin(rt * 12) * 0.12 * G.pulse : 0;
    if (e.type === 'walker') { m.rotation.y = e.vx > 0 ? 0.7 : -0.7; u.b.rotation.z = Math.sin(e.t * 9) * 0.08 + dance; u.feet.forEach((f, i) => f.position.z = 0.05 + Math.sin(e.t * 9 + i * Math.PI) * 0.14); }
    if (e.type === 'hopper') { e.sq = lerp(e.sq || 0, 0, 1 - Math.exp(-dt * 8)); const st = e.onG ? 0 : clamp(e.vy * 0.02, -.15, .2); u.b.scale.set(1 + e.sq - st * .5, 1 - e.sq + st, 1 + e.sq - st * .5); u.spring.scale.z = e.onG ? 0.6 : 1.4; m.rotation.y = Math.sign(P.x - e.x) * 0.5; u.b.rotation.z = dance; }
    if (e.type === 'flier') { u.wings.forEach((w, i) => w.rotation.x = Math.sin(rt * 40 + i) * 0.6); m.rotation.y = e.vx > 0 ? 0.6 : -0.6; u.b.position.y = Math.sin(rt * 5) * 0.05; u.b.rotation.z = dance; }
  }
  // coins
  let k = 0; const spin = rt * 3.2;
  for (const c of L.coins) {
    if (c.got || (c.wonder && G.pulse < 0.05) || Math.abs(c.x - G.camX) > 26) continue;
    const s = c.wonder ? G.pulse : 1;
    _q.setFromEuler(_e.set(0, spin + c.x * 0.3, 0)); _m.compose(_p.set(c.x, c.y + Math.sin(rt * 3 + c.x) * 0.06, 0), _q, _s.setScalar(s)); coinMesh.setMatrixAt(k++, _m);
    if (Math.random() < dt * 0.4) emit(c.x + rnd(-.3, .3), c.y + rnd(-.3, .3), 0.3, 1, { color: 0xffffff, glow: 2.5, smin: 0, smax: .2, g: 0, lmin: .25, lmax: .4, size: .6 });
  }
  for (const c of popCoins) { _q.setFromEuler(_e.set(0, c.t * 30, 0)); _m.compose(_p.set(c.x, c.y, 0), _q, _s.setScalar(1)); coinMesh.setMatrixAt(k++, _m); }
  coinMesh.count = k; coinMesh.instanceMatrix.needsUpdate = true;
  // medals, bloom, berry, blocks, pipes
  L.medals.forEach(m => { m.mesh.visible = !m.got; m.mesh.rotation.y = Math.sin(rt * 1.6) * 0.6; m.mesh.position.y = m.y + Math.sin(rt * 2) * 0.1; m.mesh.children[1].rotation.z = rt; });
  if (bloom.visible) { const h = bloom.userData.head; h.rotation.z = rt * 1.2; h.scale.setScalar(1 + Math.sin(rt * 5) * 0.06); bloom.userData.halo.material.opacity = 0.4 + Math.sin(rt * 5) * 0.2; if (Math.random() < dt * 14) emit(bloom.position.x + rnd(-.6, .6), bloom.position.y + rnd(.6, 1.8), .3, 1, { color: [0xff6fd0, 0xffd23f, 0x3fd0ff, 0xffffff], glow: 2, smin: .2, smax: .8, g: -1, lmin: .5, lmax: 1, size: .6 }); }
  if (G.berry && G.berry.st !== 'gone') { berryMesh.position.set(G.berry.x, G.berry.y, G.berry.st === 'rise' ? -0.2 : 0); berryMesh.rotation.y = rt * 2; }
  bumpers.forEach(m => { if (m.userData.bump > 0) { m.userData.bump -= dt; const k2 = m.userData.bump / 0.22; m.position.y = Math.floor(m.position.y) + 0.5 + Math.sin(k2 * Math.PI) * 0.3; if (m.userData.bump <= 0) m.position.y = Math.floor(m.position.y) + 0.5; } });
  L.pipes.forEach(p => { if (p.arrow) { p.arrow.position.y = p.top + 1.4 + Math.sin(rt * 4) * 0.15; p.arrow.visible = G.mode === 'play' && Math.abs(P.x - p.x - 1) < 4; } });
  const flag = pole.userData.flag, fp = flag.geometry.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i); fp.setZ(i, Math.sin(rt * 6 + x * 3) * 0.08 * (x + 0.7)); } fp.needsUpdate = true;
  sways.forEach((t, i) => { t.rotation.z = Math.sin(rt * 1.4 + i) * 0.03 * (1 + G.pulse * 3); t.scale.y = t.scale.x * (1 + G.pulse * 0.06 * Math.max(0, Math.sin(U.beat.value * 6.283))); });
  // woolies
  for (const w of woolies) if (w.on) { const m = w.mesh; m.position.set(w.x, w.y, w.z); m.userData.legs.forEach((l, i) => l.rotation.z = Math.sin(rt * 22 + i * 1.7) * 0.6); m.userData.b.rotation.z = Math.sin(rt * 11) * 0.06; }
  // floating score text
  for (let i = floaters.length - 1; i >= 0; i--) { const f = floaters[i]; f.t += dt; f.s.position.y += dt * 1.6; f.s.material.opacity = 1 - Math.max(0, f.t - 0.5) * 2; if (f.t > 1) { fgScene.remove(f.s); f.s.material.map.dispose(); f.s.material.dispose(); floaters.splice(i, 1); } }
  if (G.pulse > 0.3 && Math.random() < dt * 30) emit(G.camX + rnd(-14, 14), G.camY + rnd(-5, 7), rnd(-1, 1), 1, { color: [0xff6fd0, 0xffd23f, 0x5fe06a, 0x3fd0ff, 0xb88bff], glow: 1.6, smin: .2, smax: 1, g: -.5, lmin: .8, lmax: 1.4, size: .7, spin: true });
  animBoss(dt, rt);
  springMeshes.forEach(m => { const u = m.userData; if (u.t > 0) u.t -= dt; const k2 = Math.max(0, u.t) / 0.35; u.pad.position.y = 0.85 + Math.sin(k2 * Math.PI) * 0.35; u.coil.scale.y = 1 + Math.sin(k2 * Math.PI) * 0.9; u.coil.position.y = 0.55 + Math.sin(k2 * Math.PI) * 0.17; });
  updParts(dt);
}

// ---------- camera
const CAMZ = 18.5;
function updCamera(dt, rt) {
  const halfH = Math.tan(THREE.MathUtils.degToRad(15)) * CAMZ, halfW = halfH * camera.aspect;
  const inRoom = P.x > MAIN_END, inArena = B && B.on && !inRoom;
  const minX = (inRoom ? ROOM.x0 : inArena ? L.arena.x0 : 0) + halfW, maxX = (inRoom ? ROOM.x1 : MAIN_END + 1) - halfW;
  if (G.mode === 'title' || G.mode === 'intro') { G.camX = 12 + Math.sin(rt * 0.15) * 4; G.camY = 6.4; }
  else {
    G.look = lerp(G.look, P.face * 2.2 + P.vx * 0.12, 1 - Math.exp(-dt * 2));
    const tx = clamp(P.x + G.look, minX, Math.max(minX, maxX));
    G.camX = Math.abs(tx - G.camX) > 12 ? tx : lerp(G.camX, tx, 1 - Math.exp(-dt * 6));
    const ty = B && (B.on || B.st === 'dead') && P.x < MAIN_END ? clamp(P.y + 0.5, 7.4, 9) : clamp(P.y + 2.2, 6.4, 14);
    G.camY = lerp(G.camY, ty, 1 - Math.exp(-dt * (ty > G.camY ? 2.2 : 4)));
  }
  G.shake = Math.max(0, G.shake - dt * 1.4); const sh = save.shake ? G.shake * G.shake * 1.2 : 0;
  const roll = G.pulse * (Math.sin(rt * 0.9) * 0.07 + 0.03) * (WK === 'tilt' ? 2.4 : 1);
  camera.position.set(G.camX + rnd(-sh, sh), G.camY + 1.6 + rnd(-sh, sh), CAMZ - G.pulse * (WK === 'zoom' ? 3.2 : 1.2));
  camera.lookAt(G.camX, G.camY, 0); camera.rotateZ(roll);
  sun.position.set(G.camX - 10, 22, 16); sun.target.position.set(G.camX, 3, 0);
  layers.forEach(l => { l.position.x = G.camX * l.userData.f; });
  layers[1].children.forEach(c => { c.position.x += c.userData.drift * dt; if (c.position.x > W + 80) c.position.x = -80; });
  sky.position.copy(camera.position);
  sunDisc.position.set(camera.position.x + 55, camera.position.y + 26, -200); sunGlow.position.copy(sunDisc.position).z += 1;
  sunDisc.lookAt(camera.position); sunGlow.lookAt(camera.position);
}

// ======================= screens + menus =======================
const screens = ['title', 'pause', 'settings', 'stats', 'results', 'map', 'intro'];
let overlay = [];
function show(id) { $(id).classList.add('on'); overlay = overlay.filter(o => o !== id); overlay.push(id); focusI = 0; refocus(); }
function hide(id) { $(id).classList.remove('on'); overlay = overlay.filter(o => o !== id); focusI = 0; refocus(); }
const overlayOpen = () => overlay.some(o => o !== 'title') || G.mode === 'title' || G.mode === 'intro';
let focusI = 0;
function navItems() { const top = overlay[overlay.length - 1]; if (!top) return []; return [...$(top).querySelectorAll('[data-nav]')].filter(e => e.offsetParent !== null); }
function refocus() { document.querySelectorAll('.focus').forEach(e => e.classList.remove('focus')); const it = navItems(); if (it.length && usingPad) { const el = it[clamp(focusI, 0, it.length - 1)]; (el.closest('.sl') || el.closest('.row') || el).classList.add('focus'); } }
let usingPad = false;
function menuKey(code) {
  if (G.mode === 'title' && !$('title').classList.contains('ready') && ['Enter', 'Space'].includes(code)) { tapStart(); return; }
  if (code === 'Escape') {
    const top = overlay[overlay.length - 1];
    if (top === 'settings' || top === 'stats' || top === 'map') { hide(top); return; }
    if (top === 'pause') { resume(); return; }
    if (G.mode === 'play' && !top) { pauseGame(); return; }
    return;
  }
  if (!overlay.length || (G.mode === 'play' && !overlay.length)) return;
  usingPad = true; const it = navItems(); if (!it.length) return;
  const el = it[clamp(focusI, 0, it.length - 1)];
  if ((code === 'ArrowLeft' || code === 'ArrowRight') && el.type === 'range') { el.value = +el.value + (code === 'ArrowRight' ? 1 : -1) * (+el.step || 0.05) * 2; el.dispatchEvent(new Event('input')); return; }
  if (code === 'ArrowDown' || code === 'ArrowRight') focusI = (focusI + 1) % it.length;
  else if (code === 'ArrowUp' || code === 'ArrowLeft') focusI = (focusI - 1 + it.length) % it.length;
  else if (code === 'Enter' || code === 'Space') {
    if (el.tagName === 'SELECT') { el.selectedIndex = (el.selectedIndex + 1) % el.options.length; el.dispatchEvent(new Event('change')); }
    else if (el.type === 'checkbox') { el.checked = !el.checked; el.dispatchEvent(new Event('change')); }
    else el.click();
  }
  refocus(); A.sfx('blip');
}
addEventListener('pointerdown', () => { if (usingPad) { usingPad = false; refocus(); } });

function buildSliders() {
  document.querySelectorAll('.sliders').forEach(box => {
    box.innerHTML = '';
    [['music', 'Music', 0, 1, 0.05], ['sfx', 'Sound FX', 0, 1, 0.05], ['bright', 'Brightness', 0.6, 1.4, 0.05]].forEach(([k, label, mn, mx, st]) => {
      const row = document.createElement('label'); row.className = 'sl';
      row.innerHTML = `<span>${label}</span><input type="range" min="${mn}" max="${mx}" step="${st}" data-nav data-k="${k}">`;
      const inp = row.querySelector('input'); inp.value = save[k];
      inp.addEventListener('input', () => { save[k] = +inp.value; document.querySelectorAll(`input[data-k="${k}"]`).forEach(o => { if (o !== inp) o.value = inp.value; }); A.setVolumes(save.music, save.sfx); if (k === 'sfx') A.sfx('coin'); persist(); });
      box.appendChild(row);
    });
  });
}
function applyQuality() {
  if (save.quality === 'low') quality = { scale: 0.7, bloom: true, maxPR: 2, shadows: 1024, auto: false };
  else if (save.quality === 'high') quality = { scale: 1, bloom: true, maxPR: 3, shadows: 2048, auto: false };
  else quality = { scale: quality.auto ? quality.scale : 1, bloom: true, maxPR: 3, shadows: 2048, auto: true };
  if (sun.shadow.mapSize.x !== quality.shadows) { sun.shadow.mapSize.set(quality.shadows, quality.shadows); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  resize();
}
function fmtT(s) { s = Math.max(0, s); return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') + '.' + Math.floor((s * 10) % 10); }
function showStats() {
  const s = save.st, med = LEVELS.reduce((a, _, i) => a + lvMed(i).reduce((x, y) => x + y, 0), 0), cl = LEVELS.filter((_, i) => save.lv.cleared[i]).length;
  const rows = [['Times played', s.plays], ['Worlds cleared', cl + ' / ' + LEVELS.length], ['Level clears', s.clears], ['Best time', s.bestTime ? fmtT(s.bestTime) : '—'], ['Best score', s.bestScore.toLocaleString()],
    ['Star medals found', med + ' / ' + LEVELS.length * 3], ['Coins collected', s.coins], ['Enemies bopped', s.stomps], ['Dazzle Times', s.wonders], ['Secret garden visits', s.secret],
    ['Highest pole grab', s.bestPole + '%'], ['Ouches', s.hurts], ['Tumbles', s.falls], ['Time played', Math.round(s.playTime / 60) + ' min']];
  $('statGrid').innerHTML = rows.map(([a, b]) => `<span>${a}</span><b>${b}</b>`).join('');
  show('stats');
}
function showResults() {
  G.mode = 'results'; const s = save.st; const t = G.t - G.startT;
  const timeBonus = Math.max(0, Math.round((100 - (G.goalStartT - G.startT)) * 30));
  addScore(timeBonus);
  const med = G.medals.reduce((a, b) => a + b, 0), lt = G.goalStartT - G.startT;
  const pb = save.lv.best[LV], newBest = G.score > (save.lv.score[LV] || 0), newTime = !pb || lt < pb;
  s.clears++; s.bestScore = Math.max(s.bestScore, G.score); if (!s.bestTime || lt < s.bestTime) s.bestTime = lt;
  save.lv.score[LV] = Math.max(save.lv.score[LV] || 0, G.score); if (newTime) save.lv.best[LV] = lt; save.lv.cleared[LV] = 1;
  const unlockedNew = LV + 2 > save.lv.unlocked && LV + 1 < LEVELS.length; save.lv.unlocked = Math.max(save.lv.unlocked, Math.min(LEVELS.length, LV + 2)); persist();
  const last = LV === LEVELS.length - 1;
  $('results').querySelector('h2').textContent = last ? 'You saved Bloomhop! 🎉' : 'Level Clear!';
  $('rNext').style.display = last ? 'none' : '';
  const rows = [['Time', fmtT(lt) + (newTime ? ' ★' : '')], ['Coins', G.coins], ['Enemies bopped', G.stomps], ['Star medals', med + ' / 3'], L.pole ? ['Pole grab', Math.round(G.poleH * 100) + '%  +' + G.pole] : ['King Thornbuckle', 'Defeated! +5000'], ['Time bonus', '+' + timeBonus], ['Secret garden', G.secret ? 'Found!' : '—']];
  if (unlockedNew) rows.push(['Unlocked', 'World ' + (LV + 2) + ' · ' + LEVELS[LV + 1].name]);
  if (last) rows.push(['', 'Thanks for playing! Find all 30 medals ★']);
  $('rRows').innerHTML = rows.map(([a, b]) => `<span>${a}</span><b>${b}</b>`).join('') + `<span class="tot">Total${newBest ? ' · new best!' : ''}</span><b class="tot">${G.score.toLocaleString()}</b>`;
  $('hud').classList.remove('on'); document.body.classList.remove('playing');
  show('results'); confetti();
}
function resetLevel() {
  L.coins.forEach(c => c.got = false); popCoins.length = 0;
  L.blocks.forEach(b => { setTile(b.x, b.y, b.v); b.mesh.material = mats[b.v]; b.mesh.visible = b.v !== 6; b.mesh.castShadow = b.v !== 6; });
  enemies.forEach(e => Object.assign(e, { x: e.x0, y: e.y0, vx: -1.6, vy: 0, alive: true, dead: 0, flip: false, t: rnd(0, 2), onG: false })); enemies.forEach(e => { e.mesh.rotation.z = 0; e.mesh.userData.b.scale.set(1, 1, 1); });
  L.medals.forEach(m => m.got = false);
  Object.assign(P, { spring: false, x: 4, y: 3, vx: 0, vy: 0, big: false, h: 0.85, inv: 0, face: 1, onG: true, buf: 0, coyote: 0, squash: 0 });
  Object.assign(G, { t: 0, coins: 0, score: 0, stomps: 0, combo: 0, medals: [0, 0, 0], cp: { x: 4, y: 3 }, wonder: 0, wonderDone: false, stop: 0, shake: 0, berry: null, secret: false, hurts: 0, falls: 0, walked: 0, walkStart: 0, pole: 0, poleH: 0, camX: 12, look: 2, startT: 0, goalStartT: 0 });
  berryMesh.visible = false; bloom.visible = true; pole.userData.flag.position.y = pole.userData.h - 0.6;
  cpFlags.forEach(f => f.userData.fl.material.color.set(0xbfc7d0)); woolies.forEach(w => { w.on = false; w.mesh.visible = false; });
  A.setFunky(false); $('wonderBar').classList.remove('on');
  if (B) resetBoss(); bloom.visible = !!L.bloom;
}
function startGame() {
  resetLevel(); overlay.forEach(o => $(o).classList.remove('on')); overlay = [];
  G.mode = 'play'; save.st.plays++; persist();
  $('hud').classList.add('on'); document.body.classList.add('playing');
  A.unlock(); A.stopMusic(); A.startMusic(); banner('World ' + (LV + 1) + ' · ' + LEVELS[LV].name, 1.8);
}
function pauseGame() { if (G.mode !== 'play') return; G.mode = 'pause'; show('pause'); }
function resume() { hide('pause'); G.mode = 'play'; prevJump = true; }
// world map + level hand-off (each world loads fresh so memory stays low on phones)
function goLevel(i) {
  if (i >= save.lv.unlocked) { A.sfx('bump'); toast('Clear World ' + i + ' to unlock'); return; }
  if (i === LV) { startGame(); return; }
  persist(); location.href = '?l=' + (i + 1) + '&go=1';
}
function showMap() {
  const box = $('mapNodes'); box.innerHTML = '';
  const cols = ['#3fc45a', '#2fc0d8', '#8a7cf0', '#5fb0ff', '#f5b52a', '#5aa8e8', '#4fbf6a', '#ff7ac8', '#f59a4a', '#7a6cf0'];
  LEVELS.forEach((lv, i) => {
    const b = document.createElement('button'); const locked = i >= save.lv.unlocked, md = lvMed(i), bt = save.lv.best[i];
    b.className = 'node' + (locked ? ' locked' : '') + (i === LV ? ' cur' : ''); b.style.background = cols[i]; b.setAttribute('data-nav', '');
    b.innerHTML = `<span class="n">${locked ? '🔒' : lv.boss ? '👑' : i + 1}</span><span class="nm">${lv.name}</span><span class="st">${md.map(m => m ? '★' : '☆').join('')}</span><span class="bt">${save.lv.cleared[i] ? '✓ ' + (bt ? fmtT(bt) : '') : locked ? '' : 'new'}</span>`;
    b.onclick = () => goLevel(i); box.appendChild(b);
  });
  const med = LEVELS.reduce((a, _, i) => a + lvMed(i).reduce((x, y) => x + y, 0), 0);
  $('mapSub').textContent = `Star medals ${med} / ${LEVELS.length * 3} · progress saves automatically`;
  show('map'); focusI = Math.min(LV, save.lv.unlocked - 1); refocus();
}
function showIntro() {
  G.mode = 'intro'; $('iNum').textContent = LEVELS[LV].boss ? 'World 10 · Boss' : 'World ' + (LV + 1);
  $('iName').textContent = LEVELS[LV].name;
  $('iTip').textContent = ({ meadow: 'Grab the Dazzle Bloom!', beach: 'Bouncy springs launch you sky-high.', cave: 'Sparkly crystal caves, mind the low ceiling.', sky: 'Floaty jumps across the clouds.', desert: 'Wide sandy gaps, keep your speed up.', snow: 'Slippery ice! Ease off early.', grove: 'Giant mushrooms and lots of hoppers.', castle: 'Climb the candy towers.', sunset: 'Long cloud hops at golden hour.', keep: 'Bop King Thornbuckle 6 times! Watch for the “!”' })[L.theme] + ' 3 hidden star medals.';
  overlay.forEach(o => $(o).classList.remove('on')); overlay = []; show('intro');
}
function toTitle() { overlay.forEach(o => $(o).classList.remove('on')); overlay = []; resetLevel(); G.mode = 'title'; show('title'); $('hud').classList.remove('on'); document.body.classList.remove('playing'); A.stopMusic(); A.startMusic(); }
function tapStart() { A.unlock(); A.startMusic(); $('title').classList.add('ready'); A.sfx('power'); refocus(); }
const updG = () => { if (G.mode === 'goal' && !G.goalStartT) G.goalStartT = G.t; if (G.mode === 'play' && !G.startT) G.startT = G.t || 0.0001; };

function wireUI() {
  $('title').addEventListener('pointerup', e => { if (!$('title').classList.contains('ready')) tapStart(); });
  $('bPlay').onclick = showMap; $('mBack').onclick = () => hide('map'); $('iGo').onclick = () => { A.unlock(); startGame(); }; $('iMap').onclick = () => { hide('intro'); toTitle(); showMap(); };
  $('rMap').onclick = () => { toTitle(); showMap(); }; $('rNext').onclick = () => goLevel(LV + 1); $('bStats').onclick = showStats; $('bSettings').onclick = () => show('settings');
  $('bPause').onclick = pauseGame; $('pResume').onclick = resume; $('pRestart').onclick = startGame; $('pQuit').onclick = () => { toTitle(); showMap(); };
  $('sClose').onclick = () => hide('settings'); $('stClose').onclick = () => hide('stats');
  $('rRetry').onclick = startGame;
  $('optShake').checked = save.shake; $('optShake').onchange = e => { save.shake = e.target.checked; persist(); };
  $('optTouch').checked = save.touch; $('optTouch').onchange = e => { save.touch = e.target.checked; document.body.classList.toggle('touchui', save.touch); persist(); };
  document.body.classList.toggle('touchui', !!save.touch);
  $('optQuality').value = save.quality; $('optQuality').onchange = e => { save.quality = e.target.value; quality.auto = false; applyQuality(); persist(); };
  $('verLabel').textContent = VERSION;
  const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;
  if (iOS && !standalone && !save.a2hsX) $('a2hs').style.display = 'flex';
  $('a2hsX').onclick = e => { e.stopPropagation(); $('a2hs').style.display = 'none'; save.a2hsX = true; persist(); };
  buildSliders(); A.setVolumes(save.music, save.sfx);
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play') pauseGame(); });
  addEventListener('gamepadconnected', () => { toast('🎮 Controller connected'); if (G.mode === 'title') { usingPad = true; refocus(); } });
}

// ---------- HUD
let hudCache = {};
function hud() {
  const set = (id, v) => { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } };
  set('hCoins', String(G.coins)); set('hScore', G.score.toLocaleString());
  set('hTime', fmtT((G.goalStartT || G.t) - (G.startT || G.t)).slice(0, -2));
  G.medals.forEach((m, i) => { const el = $('md' + i); if (!!m !== el.classList.contains('got')) el.classList.toggle('got', !!m); });
  if (G.wonder > 0) $('wonderFill').style.width = (G.wonder / 20 * 100) + '%';
}

// ======================= main loop + adaptive quality =======================
let last = performance.now(), acc = 0, rtime = 0, frames = [], qT = 0, goodT = 0, target = 1 / 60, measured = false, fpsAvg = 60;
function frame(now) {
  requestAnimationFrame(frame);
  const raw = (now - last) / 1000; last = now; const dt = Math.min(0.05, Math.max(0, raw));
  rtime += dt;
  if (G.mode !== 'pause' && G.mode !== 'results' && !BH.frozen) {
    acc += dt; let n = 0;
    while (acc >= STEP && n < 12) { acc -= STEP; n++; if (G.stop > 0) { G.stop -= STEP; continue; } step(STEP); updG(); }
    if (n >= 12) acc = 0;
  }
  animate(G.mode === 'pause' || G.mode === 'results' ? dt * 0.3 : dt, rtime);
  updCamera(dt, rtime);
  if (G.mode !== 'title') hud();
  renderFrame();
  // adaptive resolution: aim for the display's refresh (120 Hz ProMotion or 60 Hz), never overheat
  frames.push(raw); if (frames.length > 40) frames.shift();
  if (!measured && frames.length >= 40) { const s = [...frames].sort((a, b) => a - b); target = s[10] < 0.011 ? 1 / 120 : 1 / 60; measured = true; }
  qT += dt; fpsAvg = lerp(fpsAvg, 1 / Math.max(raw, 0.001), 0.05);
  if (measured && quality.auto && qT > 1.2) {
    const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
    if (avg > target * 1.25 && quality.scale > 0.55) { quality.scale = Math.max(0.55, quality.scale - 0.1); resize(); qT = 0; goodT = 0; }
    else if (avg < target * 1.06) { goodT += qT; qT = 0; if (goodT > 5 && quality.scale < 1) { quality.scale = Math.min(1, quality.scale + 0.05); resize(); goodT = 0; } }
    else qT = 0;
  }
}

// ---------- test hooks
const BH = window.BH = {
  bot: false, frozen: false, G, P, L, save, start: startGame, show, showStats, toTitle, tapStart, quality: () => ({ ...quality, pr, target, fps: fpsAvg }),
  sim(sec) { const n = Math.round(sec / STEP); for (let i = 0; i < n; i++) { if (G.stop > 0) { G.stop -= STEP; continue; } step(STEP); updG(); if (G.mode === 'results') break; } },
  tp(x, y) { P.x = x; P.y = y; P.vx = 0; P.vy = 0; G.camX = x; },
  wonder() { startWonder(); }, B: () => B, LV, goLevel, showMap, unlockAll() { save.lv.unlocked = LEVELS.length; persist(); },
};

// ---------- boot
addEventListener('resize', () => setTimeout(resize, 50));
addEventListener('orientationchange', () => setTimeout(resize, 300));
wireUI(); applyQuality(); resetLevel(); G.mode = 'title'; show('title'); if (GO) showIntro();
renderer.compile(fgScene, camera); renderer.compile(bgScene, camera);
window.__booted = true; $('loading').style.display = 'none';
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
if ('serviceWorker' in navigator && !/nosw/.test(location.search)) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
