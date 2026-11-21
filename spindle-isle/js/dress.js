// v1.1 picture. Everything in here is hidden or put back when its switch is off,
// so the diorama matches the frozen v1.0 build.
import * as THREE from '../vendor/three.module.js';
import { LEVEL, PIP_R } from './level.js';

function rand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function radialTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function cloudTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const puff = (x, y, r, a) => {
    const grd = g.createRadialGradient(x, y, r * 0.15, x, y, r);
    grd.addColorStop(0, `rgba(255,252,246,${a})`);
    grd.addColorStop(0.55, `rgba(255,248,236,${a * 0.55})`);
    grd.addColorStop(1, 'rgba(255,248,236,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  puff(90, 150, 70, 0.95);
  puff(140, 132, 86, 0.9);
  puff(190, 156, 64, 0.85);
  puff(120, 176, 58, 0.7);
  puff(168, 170, 48, 0.6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const SKY_VERT = `
  varying vec3 vDir;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vDir = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const SKY_FRAG = `
  varying vec3 vDir;
  uniform float uTime;
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.05 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }
  void main() {
    vec3 dir = normalize(vDir - cameraPosition);
    float h = dir.y * 0.5 + 0.5;
    vec3 top = vec3(0.42, 0.68, 0.98);
    vec3 mid = vec3(1.0, 0.78, 0.46);
    vec3 hor = vec3(1.0, 0.94, 0.78);
    vec3 col = mix(hor, mid, smoothstep(0.0, 0.34, h));
    col = mix(col, top, smoothstep(0.22, 0.82, h));
    vec3 sunDir = normalize(vec3(-0.12, 0.2, 0.97));
    float sun = max(dot(dir, sunDir), 0.0);
    float glow = pow(sun, 5.0);
    float disc = pow(sun, 160.0);
    float ray = pow(sun, 2.4) * (0.65 + 0.35 * sin(atan(dir.x, dir.z) * 8.0));
    col += vec3(1.0, 0.95, 0.78) * glow * 0.22;
    col += vec3(1.0, 0.98, 0.9) * disc * 0.7;
    col += vec3(1.0, 0.93, 0.72) * ray * 0.05 * smoothstep(0.02, 0.25, dir.y);
    vec2 uv = dir.xz / max(0.32, dir.y * 0.65 + 0.25);
    uv += vec2(uTime * 0.012, -uTime * 0.006);
    float n = fbm(uv * 0.85);
    float cloud = smoothstep(0.38, 0.72, n);
    cloud *= smoothstep(0.02, 0.3, dir.y);
    vec3 cloudCol = vec3(1.0, 0.98, 0.94);
    float shade = smoothstep(0.4, 0.85, fbm(uv * 1.7 + 4.0));
    cloudCol = mix(vec3(0.96, 0.9, 0.78), cloudCol, shade);
    col = mix(col, cloudCol, cloud * 0.72);
    gl_FragColor = vec4(col, 1.0);
  }`;

const WATER_VERT = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vN;
  void main() {
    vUv = uv;
    vec3 p = position;
    float w = sin(p.x * 3.1 + uTime * 1.7) * 0.028 + cos(p.y * 3.5 + uTime * 1.25) * 0.02;
    w += sin((p.x + p.y) * 6.0 + uTime * 2.2) * 0.008;
    p.z += w;
    vec3 n = normalize(vec3(
      -cos(p.x * 3.1 + uTime * 1.7) * 0.09,
      -sin(p.y * 3.5 + uTime * 1.25) * 0.07,
      1.0
    ));
    vec4 wpos = modelMatrix * vec4(p, 1.0);
    vPos = wpos.xyz;
    vN = normalize(mat3(modelMatrix) * n);
    gl_Position = projectionMatrix * viewMatrix * wpos;
  }`;

const WATER_FRAG = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vN;
  void main() {
    vec3 V = normalize(cameraPosition - vPos);
    vec3 N = normalize(vN);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.4);
    float spark = pow(max(sin(vPos.x * 10.0 + uTime * 2.6) * sin(vPos.z * 9.0 - uTime * 2.1), 0.0), 10.0);
    float glint = pow(max(sin(vPos.x * 4.0 - uTime * 1.4 + vPos.z * 2.0), 0.0), 18.0);
    vec3 deep = vec3(0.16, 0.55, 0.58);
    vec3 midc = vec3(0.45, 0.82, 0.78);
    vec3 gold = vec3(1.0, 0.95, 0.75);
    vec3 col = mix(deep, midc, 0.45 + fres * 0.7);
    col += gold * (spark * 0.95 + glint * 0.55);
    col += vec3(0.85, 0.97, 0.95) * fres * 0.22;
    float edge = smoothstep(0.12, 0.0, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
    col = mix(col, vec3(0.96, 0.99, 0.97), edge * 0.4);
    gl_FragColor = vec4(col, 0.86);
  }`;

const TIER_EXTRA = [
  { grass: 560, flowers: 72, mush: 28, life: 1, clouds: 7, islets: 5 },
  { grass: 300, flowers: 40, mush: 18, life: 0.65, clouds: 5, islets: 4 },
  { grass: 150, flowers: 22, mush: 10, life: 0.4, clouds: 3, islets: 3 },
  { grass: 70, flowers: 12, mush: 6, life: 0.25, clouds: 2, islets: 2 },
];

function sway(material, timeU, amp) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = timeU;
    shader.uniforms.uAmp = amp;
    shader.vertexShader = 'uniform float uTime;\nuniform float uAmp;\nattribute float aPhase;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float ph = aPhase;
       transformed.x += sin(uTime * 1.6 + ph) * 0.16 * uAmp * position.y;
       transformed.z += cos(uTime * 1.25 + ph * 1.3) * 0.1 * uAmp * position.y;`
    );
  };
}

export function createDress(ctx) {
  const {
    scene, world, camera, renderer, timeU, feat, getTier,
    sky, skyPlain, clouds, waters, waterMat, grassAmp,
    hemi, sun, fill, rim, pipMats, face, pupils, gear, mill, bloom, burst,
  } = ctx;

  const soft = radialTex();
  const cTex = cloudTex();
  const rng = rand(29);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  const skyPainted = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    fog: false,
    toneMapped: false,
    uniforms: { uTime: timeU },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
  });

  const fancySky = new THREE.Group();
  scene.add(fancySky);

  const cloudMats = [];
  const cloudGroups = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      map: cTex, color: 0xfffaf2, transparent: true, depthWrite: false, fog: false, toneMapped: false,
      opacity: 0.92,
    });
    cloudMats.push(mat);
    const s = 1.15 + (i % 3) * 0.35;
    for (let k = 0; k < 3; k++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(11 * s, 5.2 * s), mat);
      m.position.set((k - 1) * 1.8 * s, (k % 2) * 0.35, (k - 1) * 0.45);
      g.add(m);
    }
    const spots = [[-9, 6.2, 12], [0.5, 7.1, 16], [9, 6.4, 11], [15, 5.8, 18], [-3, 5.6, 20], [6, 7.6, 22], [18, 6.6, 8]];
    const spot = spots[i];
    g.position.set(spot[0], spot[1], spot[2]);
    g.userData.speed = 0.22 + (i % 4) * 0.06;
    g.userData.baseY = g.position.y;
    g.userData.phase = i * 1.3;
    fancySky.add(g);
    cloudGroups.push(g);
  }

  const islets = [];
  const isletRoot = new THREE.Group();
  fancySky.add(isletRoot);
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group();
    const sc = 0.85 + (i % 3) * 0.28;
    const rock = new THREE.Mesh(
      new THREE.SphereGeometry(1, 18, 12),
      new THREE.MeshStandardMaterial({ color: 0xe0c08a, roughness: 0.92 })
    );
    rock.scale.set(1.45 * sc, 0.42 * sc, 1.15 * sc);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.9 * sc, 14, 10),
      new THREE.MeshStandardMaterial({ color: 0x8ed25a, roughness: 0.78 })
    );
    cap.position.y = 0.32 * sc;
    cap.scale.y = 0.5;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045 * sc, 0.07 * sc, 0.42 * sc, 7),
      new THREE.MeshStandardMaterial({ color: 0xd09a52, roughness: 0.7 })
    );
    trunk.position.y = 0.62 * sc;
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.26 * sc, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x9adf68, roughness: 0.75 })
    );
    puff.position.y = 0.92 * sc;
    g.add(rock, cap, trunk, puff);
    const spots = [[-10, 3.4, 22], [-2, 4.3, 28], [9, 3.6, 24], [17, 2.9, 19], [3, 5.1, 32]];
    const spot = spots[i];
    g.position.set(spot[0], spot[1], spot[2]);
    g.userData.baseY = g.position.y;
    g.userData.phase = i;
    isletRoot.add(g);
    islets.push(g);
  }

  const sunMat = new THREE.SpriteMaterial({
    map: soft, color: 0xfff4c8, transparent: true, depthWrite: false, fog: false,
    blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.92,
  });
  const sunGlow = new THREE.Sprite(sunMat);
  sunGlow.scale.set(12, 12, 1);
  sunGlow.position.set(-5, 7.4, 22);
  sunMat.opacity = 0.7;
  const sunCore = new THREE.Sprite(sunMat.clone());
  sunCore.material.opacity = 1;
  sunCore.material.color.setHex(0xfffbe8);
  sunCore.scale.set(4.2, 4.2, 1);
  sunCore.position.copy(sunGlow.position);
  fancySky.add(sunGlow, sunCore);

  const waterFancy = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: timeU },
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
  });

  const foam = new THREE.Group();
  world.add(foam);
  const basin = LEVEL.slabs.find((s) => s.id === 'basin');
  const pool = LEVEL.slabs.find((s) => s.id === 'pool');
  const foamMat = new THREE.SpriteMaterial({
    map: soft, color: 0xf7fffb, transparent: true, opacity: 0.75, depthWrite: false, fog: false,
  });
  const foamBits = [];
  const gateX = basin.pos[0] + basin.half[0] - 0.05;
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Sprite(foamMat);
    s.scale.setScalar(0.28 + (i % 3) * 0.06);
    const z = basin.pos[2] + (i / 7 - 0.5) * basin.half[2] * 1.3;
    s.position.set(gateX, LEVEL.waterTop + 0.1, z);
    s.userData.base = s.position.clone();
    s.userData.ph = i * 0.8;
    foam.add(s);
    foamBits.push(s);
  }
  const lipZ = (basin.pos[2] + basin.half[2] + pool.pos[2] - pool.half[2]) / 2;
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Sprite(foamMat.clone());
    s.material.opacity = 0.65;
    s.scale.setScalar(0.26);
    s.position.set(basin.pos[0] + (i - 2) * 0.28, LEVEL.waterTop + 0.1, lipZ);
    s.userData.base = s.position.clone();
    s.userData.ph = 2 + i;
    foam.add(s);
    foamBits.push(s);
  }

  const ripples = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.26, 24),
      new THREE.MeshBasicMaterial({
        color: 0xf4fffb, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false,
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    m.userData.t = 1;
    world.add(m);
    ripples.push(m);
  }
  let rippleN = 0;
  let rippleCool = 0;
  let wasWet = false;

  const glints = [];
  for (const id of ['basin', 'pool', 'channel']) {
    const slab = LEVEL.slabs.find((s) => s.id === id);
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: soft, color: 0xfff6d0, transparent: true, opacity: 0.8, depthWrite: false,
        blending: THREE.AdditiveBlending, fog: false,
      }));
      s.scale.setScalar(0.16);
      s.userData.slab = slab;
      s.userData.ph = i * 1.7 + slab.pos[0];
      world.add(s);
      glints.push(s);
    }
  }

  const foliage = new THREE.Group();
  world.add(foliage);
  const grassSpots = [];
  const flowerSpots = [];
  const mushSpots = [];
  for (const s of LEVEL.slabs) {
    if (s.mat === 'stone') continue;
    const n = Math.min(140, Math.round(s.half[0] * s.half[2] * 16));
    for (let i = 0; i < n; i++) {
      const x = s.pos[0] + (rng() - 0.5) * s.half[0] * 1.75;
      const z = s.pos[2] + (rng() - 0.5) * s.half[2] * 1.75;
      grassSpots.push({ x, y: s.top, z, h: 0.28 + rng() * 0.38, phase: rng() * 6.28 });
      if (rng() > 0.78) flowerSpots.push({ x, y: s.top, z, hue: rng() });
    }
    const m = Math.max(2, Math.round(s.half[0] * s.half[2] * 1.1));
    for (let i = 0; i < m; i++) {
      mushSpots.push({
        x: s.pos[0] + (rng() - 0.5) * s.half[0] * 1.4,
        y: s.top,
        z: s.pos[2] + (rng() - 0.5) * s.half[2] * 1.4,
        k: rng(),
      });
    }
  }

  const blade = new THREE.ConeGeometry(0.03, 1, 4, 1);
  blade.translate(0, 0.5, 0);
  const extraAmp = { value: 1.65 };
  const extraGrassMat = new THREE.MeshStandardMaterial({ color: 0x9adf62, roughness: 0.78 });
  sway(extraGrassMat, timeU, extraAmp);
  const extraGrass = new THREE.InstancedMesh(blade, extraGrassMat, grassSpots.length);
  const phases = new Float32Array(grassSpots.map((p) => p.phase));
  blade.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
  grassSpots.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.scale.set(0.75 + (i % 4) * 0.08, p.h, 0.75);
    dummy.rotation.set(0, p.phase, (p.phase - 3) * 0.08);
    dummy.updateMatrix();
    extraGrass.setMatrixAt(i, dummy.matrix);
    col.setHSL(0.26 + (i % 6) * 0.012, 0.62, 0.46);
    extraGrass.setColorAt(i, col);
  });
  extraGrass.castShadow = false;
  extraGrass.receiveShadow = true;
  foliage.add(extraGrass);

  const hues = [0xfff3a8, 0xffd6ea, 0xd8c8ff, 0xc9ecff, 0xffe1a8, 0xfff6e4];
  const flowerGeo = new THREE.SphereGeometry(0.08, 8, 6);
  const flowers = new THREE.InstancedMesh(
    flowerGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42 }),
    Math.max(1, flowerSpots.length)
  );
  const stems = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.012, 0.015, 0.18, 5),
    new THREE.MeshStandardMaterial({ color: 0x6aaa48 }),
    Math.max(1, flowerSpots.length)
  );
  flowerSpots.forEach((p, i) => {
    dummy.position.set(p.x, p.y + 0.2, p.z);
    dummy.scale.set(1, 0.7, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
    flowers.setColorAt(i, col.set(hues[i % hues.length]));
    dummy.position.set(p.x, p.y + 0.09, p.z);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    stems.setMatrixAt(i, dummy.matrix);
  });
  foliage.add(flowers, stems);

  const mushStem = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.02, 0.028, 0.12, 6),
    new THREE.MeshStandardMaterial({ color: 0xf6f1e6, roughness: 0.7 }),
    Math.max(1, mushSpots.length)
  );
  const mushCap = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.075, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.48 }),
    Math.max(1, mushSpots.length)
  );
  const capHues = [0xffe7b0, 0xfff6e8, 0xffd4e4, 0xf3e2ff];
  mushSpots.forEach((p, i) => {
    dummy.position.set(p.x, p.y + 0.06, p.z);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mushStem.setMatrixAt(i, dummy.matrix);
    dummy.position.set(p.x, p.y + 0.12, p.z);
    dummy.scale.set(1, 0.42, 1);
    dummy.updateMatrix();
    mushCap.setMatrixAt(i, dummy.matrix);
    mushCap.setColorAt(i, col.set(capHues[i % capHues.length]));
  });
  foliage.add(mushStem, mushCap);

  const bushMat = new THREE.MeshStandardMaterial({ color: 0x74c456, roughness: 0.8 });
  for (let i = 0; i < 8; i++) {
    const s = LEVEL.slabs[i % 5];
    if (!s || s.mat === 'stone') continue;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.16 + (i % 3) * 0.04, 10, 8), bushMat);
    b.position.set(
      s.pos[0] + (rng() - 0.5) * s.half[0] * 1.2,
      s.top + 0.1,
      s.pos[2] + (rng() - 0.5) * s.half[2] * 1.2
    );
    b.scale.y = 0.65;
    foliage.add(b);
  }

  const ao = new THREE.Group();
  world.add(ao);
  const aoMat = new THREE.MeshBasicMaterial({
    map: soft, color: 0x6a5438, transparent: true, opacity: 0.22, depthWrite: false,
  });
  const aoAt = (x, y, z, sc) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), aoMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y + 0.03, z);
    m.scale.setScalar(sc);
    ao.add(m);
  };
  const meadow = LEVEL.slabs.find((s) => s.id === 'meadow');
  const high = LEVEL.slabs.find((s) => s.id === 'high');
  const flowerSlab = LEVEL.slabs.find((s) => s.id === 'flower');
  aoAt(meadow.pos[0] - 1.35, meadow.top, meadow.pos[2] + 0.4, 1.3);
  aoAt(meadow.pos[0] + 1.4, meadow.top, meadow.pos[2] - 1.1, 1.1);
  aoAt(high.pos[0] + 1.15, high.top, high.pos[2] + 0.7, 1.05);
  aoAt(flowerSlab.pos[0] - 1.05, flowerSlab.top, flowerSlab.pos[2] + 0.7, 1);
  aoAt(LEVEL.props.gear.x, LEVEL.top, LEVEL.props.gear.z, 1.6);
  aoAt(LEVEL.props.mill.x, LEVEL.waterTop, LEVEL.props.mill.z, 1.15);
  aoAt(LEVEL.props.flower.x, LEVEL.props.flower.y, LEVEL.props.flower.z, 1.2);

  const shine = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })
  );
  shine.position.set(0.07, 0.16, 0.3);
  face.add(shine);

  const life = new THREE.Group();
  world.add(life);
  const butterflies = [];
  const wingColors = [0xfff3b0, 0xffd0e6, 0xd7c8ff, 0xc8ecff, 0xffe1b0, 0xf7fff0];
  const homes = [
    [0.2, 1.7, meadow.pos[2]],
    [-0.8, 1.55, meadow.pos[2] + 0.6],
    [LEVEL.props.flower.x, LEVEL.props.flower.y + 1.3, LEVEL.props.flower.z],
    [LEVEL.props.flower.x + 0.6, LEVEL.props.flower.y + 1.5, LEVEL.props.flower.z - 0.3],
    [high.pos[0], high.top + 1.2, high.pos[2]],
    [2.2, 1.6, 4.2],
  ];
  homes.forEach((h, i) => {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: wingColors[i % wingColors.length], side: THREE.DoubleSide, fog: false });
    const wing = new THREE.PlaneGeometry(0.16, 0.11);
    const L = new THREE.Mesh(wing, mat);
    const R = new THREE.Mesh(wing, mat);
    L.position.x = -0.08;
    R.position.x = 0.08;
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0x5c4632, fog: false })
    );
    body.scale.set(0.8, 0.8, 2);
    g.add(L, R, body);
    g.userData.wings = [L, R];
    g.userData.home = new THREE.Vector3(h[0], h[1], h[2]);
    g.userData.ph = i * 1.4;
    life.add(g);
    butterflies.push(g);
  });

  const nearFlies = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff6c2, fog: false })
    );
    const a = (i / 8) * Math.PI * 2;
    m.position.set(Math.cos(a) * 0.45, 1.05, Math.sin(a) * 0.45);
    m.userData.a = a;
    bloom.add(m);
    nearFlies.push(m);
  }

  const petals = [];
  const petalGeo = new THREE.PlaneGeometry(0.08, 0.11);
  const petalCols = [0xfff1c4, 0xffe0ea, 0xfff6e8, 0xf6e2ff];
  for (let i = 0; i < 36; i++) {
    const m = new THREE.Mesh(
      petalGeo,
      new THREE.MeshBasicMaterial({
        color: petalCols[i % petalCols.length], side: THREE.DoubleSide, transparent: true, opacity: 0.85, fog: false,
      })
    );
    m.userData.ph = rng() * 6.28;
    m.userData.x = (rng() - 0.5) * 14 + 3;
    m.userData.z = (rng() - 0.5) * 16 + 3;
    m.userData.y = rng() * 4 + 1.2;
    m.position.set(m.userData.x, m.userData.y, m.userData.z);
    life.add(m);
    petals.push(m);
  }

  const birds = new THREE.Group();
  scene.add(birds);
  const birdList = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0x6a5344, fog: false })
    );
    body.scale.set(1.7, 0.62, 0.7);
    const wingMat = new THREE.MeshBasicMaterial({ color: 0xfff6e6, side: THREE.DoubleSide, fog: false });
    const lw = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.16), wingMat);
    const rw = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.16), wingMat);
    lw.position.x = -0.28;
    rw.position.x = 0.28;
    g.add(body, lw, rw);
    g.userData.wings = [lw, rw];
    g.userData.ph = i * 2.1;
    birds.add(g);
    birdList.push(g);
  }

  const assist = new THREE.Group();
  world.add(assist);
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffe7a4, fog: false, transparent: true, opacity: 0.92 });
  const arrow = new THREE.Group();
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 10), arrowMat);
  head.rotation.x = Math.PI / 2;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.26), arrowMat);
  tail.position.z = -0.18;
  arrow.add(head, tail);
  assist.add(arrow);
  const dots = [];
  for (let i = 0; i < 5; i++) {
    const d = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff0c2, fog: false, transparent: true, opacity: 0.75 })
    );
    assist.add(d);
    dots.push(d);
  }

  const marks = [];
  for (const c of LEVEL.checkpoints) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.26, 0.36, 22),
      new THREE.MeshBasicMaterial({
        color: 0xffe7a8, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, fog: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(c.x, c.y - PIP_R + 0.035, c.z);
    ring.userData.cp = c;
    world.add(ring);
    marks.push(ring);
  }

  const pupilHome = pupils.map((p) => p.position.clone());
  let shake = 0;
  let shakeT = 0;
  let airVy = 0;
  let wasGround = true;
  let sparkCool = 0;
  let trailCool = 0;
  let clearHex = 0xf6e2b8;

  function nextSpot(state) {
    let best = null;
    let bestD = 1e9;
    for (const s of LEVEL.seeds) {
      if (state.seeds && state.seeds.includes(s.id)) continue;
      const d = (s.x - state.x) ** 2 + (s.z - state.z) ** 2;
      if (d < bestD) { bestD = d; best = s; }
    }
    if (best) return best;
    return LEVEL.goal;
  }

  function spawnRipple(x, z) {
    const m = ripples[rippleN % ripples.length];
    rippleN++;
    m.visible = true;
    m.userData.t = 0;
    m.position.set(x, LEVEL.waterTop + 0.08, z);
    m.scale.setScalar(0.4);
  }

  function sync() {
    const skyOn = !!feat('sky');
    const lightOn = !!feat('light');
    const waterOn = !!feat('water');
    const leafOn = !!feat('foliage');
    const pipOn = !!feat('pip');
    const lifeOn = !!feat('life');
    const tier = TIER_EXTRA[Math.max(0, Math.min(3, getTier()))];

    sky.material = skyOn ? skyPainted : skyPlain;
    fancySky.visible = skyOn;
    clouds.forEach((m) => { m.visible = !skyOn; });
    cloudGroups.forEach((g, i) => { g.visible = skyOn && i < tier.clouds; });
    islets.forEach((g, i) => { g.visible = skyOn && i < tier.islets; });

    if (!skyOn && !lightOn) {
      scene.fog.density = 0.008;
      scene.fog.color.setHex(0xf3e0b8);
      clearHex = 0xf6e2b8;
    } else {
      scene.fog.density = skyOn ? 0.0062 : 0.007;
      scene.fog.color.setHex(0xf6e4bc);
      clearHex = 0xfbe8c6;
    }
    renderer.setClearColor(clearHex, 1);

    if (lightOn) {
      hemi.color.setHex(0xd8ecff);
      hemi.groundColor.setHex(0xf3d59a);
      hemi.intensity = 0.9;
      sun.color.setHex(0xfff6e2);
      sun.intensity = 2.65;
      fill.color.setHex(0xe6f2ff);
      fill.intensity = 0.4;
      rim.color.setHex(0xfff8e6);
      rim.intensity = 0.95;
      renderer.toneMappingExposure = 1.02;
      sun.shadow.radius = 3.2;
      sun.shadow.normalBias = 0.05;
    } else {
      hemi.color.setHex(0xd7ecff);
      hemi.groundColor.setHex(0xf0c98a);
      hemi.intensity = 0.72;
      sun.color.setHex(0xfff1cf);
      sun.intensity = 2.45;
      fill.color.setHex(0xd5e6ff);
      fill.intensity = 0.55;
      rim.color.setHex(0xfff6df);
      rim.intensity = 0.45;
      renderer.toneMappingExposure = 0.92;
      sun.shadow.radius = 1;
      sun.shadow.normalBias = 0.035;
    }
    ao.visible = lightOn;

    for (const mesh of waters) mesh.material = waterOn ? waterFancy : waterMat;
    foam.visible = waterOn;
    for (const s of glints) s.visible = waterOn;

    foliage.visible = leafOn;
    grassAmp.value = leafOn ? 1.65 : 1;
    if (leafOn) {
      extraGrass.count = Math.min(grassSpots.length, tier.grass);
      flowers.count = Math.min(flowerSpots.length, tier.flowers);
      stems.count = flowers.count;
      mushStem.count = Math.min(mushSpots.length, tier.mush);
      mushCap.count = mushStem.count;
    }

    for (const m of pipMats) m.fog = !pipOn;
    shine.visible = pipOn;

    const nFly = Math.max(1, Math.round(butterflies.length * tier.life));
    butterflies.forEach((b, i) => { b.visible = lifeOn && i < nFly; });
    nearFlies.forEach((m, i) => { m.visible = lifeOn && i < Math.ceil(nearFlies.length * tier.life); });
    petals.forEach((m, i) => { m.visible = lifeOn && i < Math.round(petals.length * tier.life); });
    const nBird = Math.max(1, Math.round(birdList.length * tier.life));
    birdList.forEach((b, i) => { b.visible = lifeOn && i < nBird; });
    birds.visible = lifeOn;
    life.visible = lifeOn;
  }

  function animate(dt, state, pose, extra) {
    const t = timeU.value;
    const title = !!(extra && extra.title);
    sync();

    if (feat('sky')) {
      cloudGroups.forEach((g) => {
        g.position.x += dt * g.userData.speed;
        if (g.position.x > 26) g.position.x = -26;
        g.position.y = g.userData.baseY + Math.sin(t * 0.25 + g.userData.phase) * 0.18;
        g.children.forEach((m) => m.lookAt(camera.position));
      });
      islets.forEach((g) => {
        g.position.y = g.userData.baseY + Math.sin(t * 0.35 + g.userData.phase) * 0.12;
      });
    }

    if (feat('water')) {
      foamBits.forEach((s) => {
        const b = s.userData.base;
        s.position.y = b.y + Math.sin(t * 2.2 + s.userData.ph) * 0.03;
        s.material.opacity = 0.45 + Math.sin(t * 3 + s.userData.ph) * 0.25;
      });
      glints.forEach((s) => {
        const slab = s.userData.slab;
        const ph = s.userData.ph;
        s.position.set(
          slab.pos[0] + Math.sin(t * 0.7 + ph) * slab.half[0] * 0.7,
          LEVEL.waterTop + 0.12,
          slab.pos[2] + Math.cos(t * 0.55 + ph * 1.3) * slab.half[2] * 0.65
        );
        s.material.opacity = 0.25 + Math.max(0, Math.sin(t * 3.2 + ph)) * 0.7;
      });
      const wet = !!(state && state.inWater);
      if (!title && wet) {
        rippleCool -= dt;
        if (rippleCool <= 0) {
          spawnRipple(state.x, state.z);
          rippleCool = wasWet ? 0.28 : 0.02;
        }
      } else rippleCool = 0;
      wasWet = wet;
      for (const m of ripples) {
        if (!m.visible) continue;
        m.userData.t += dt;
        const u = m.userData.t / 0.9;
        if (u >= 1) { m.visible = false; continue; }
        const sc = 0.45 + u * 2.6;
        m.scale.setScalar(sc);
        m.material.opacity = (1 - u) * 0.55;
      }
    } else {
      for (const m of ripples) m.visible = false;
      wasWet = false;
    }

    if (feat('life')) {
      butterflies.forEach((g) => {
        const h = g.userData.home;
        const ph = g.userData.ph;
        g.position.set(
          h.x + Math.sin(t * 0.7 + ph) * 0.55,
          h.y + Math.sin(t * 1.4 + ph) * 0.18,
          h.z + Math.cos(t * 0.6 + ph) * 0.45
        );
        const flap = Math.sin(t * 14 + ph);
        g.userData.wings[0].rotation.y = 0.4 + flap * 0.7;
        g.userData.wings[1].rotation.y = -0.4 - flap * 0.7;
        g.rotation.y = t * 0.6 + ph;
      });
      nearFlies.forEach((m) => {
        const a = m.userData.a + t * 0.8;
        m.position.set(Math.cos(a) * 0.5, 1.02 + Math.sin(t * 2.2 + a) * 0.12, Math.sin(a) * 0.5);
      });
      petals.forEach((m) => {
        m.userData.y -= dt * (0.22 + (m.userData.ph % 1) * 0.15);
        if (m.userData.y < 0.4) m.userData.y = 4.2;
        m.position.set(
          m.userData.x + Math.sin(t * 0.4 + m.userData.ph) * 0.4,
          m.userData.y,
          m.userData.z + Math.cos(t * 0.3 + m.userData.ph) * 0.3
        );
        m.rotation.x += dt * 0.8;
        m.rotation.z += dt * 0.5;
      });
      birdList.forEach((g, i) => {
        const ph = g.userData.ph;
        const a = t * 0.18 + ph;
        const rad = 15 + i * 2.2;
        g.position.set(Math.cos(a) * rad + 3, 8.2 + Math.sin(t * 0.8 + ph) * 0.35, Math.sin(a) * rad + 2);
        g.rotation.y = -a + Math.PI / 2;
        const flap = Math.sin(t * 8 + ph);
        g.userData.wings[0].rotation.z = 0.3 + flap * 0.5;
        g.userData.wings[1].rotation.z = -0.3 - flap * 0.5;
      });
    }

    if (state && feat('pip') && !title) {
      const sp = Math.hypot(state.vx || 0, state.vz || 0);
      const look = sp > 0.35 ? 1 : 0;
      const lx = look * Math.max(-1, Math.min(1, -state.vx / (sp || 1))) * 0.012;
      const ly = look * Math.max(-1, Math.min(1, state.vz / (sp || 1))) * 0.008;
      pupils.forEach((p, i) => {
        p.position.x = pupilHome[i].x + lx;
        p.position.y = pupilHome[i].y + ly;
      });
      if (sp > 0.5) {
        trailCool -= dt;
        if (trailCool <= 0) {
          trailCool = 0.05;
          burst(state.x - state.vx * 0.05, state.y + 0.02, state.z - state.vz * 0.05, 1, [0.8, 0.95, 1], 0.35);
        }
      }
    } else {
      pupils.forEach((p, i) => {
        p.position.x = pupilHome[i].x;
        p.position.y = pupilHome[i].y;
      });
    }

    if (state && feat('juice') && !title) {
      const spinning = extra && extra.spinning;
      sparkCool -= dt;
      if (spinning && sparkCool <= 0) {
        sparkCool = 0.1;
        burst(gear.position.x, gear.position.y + 0.2, gear.position.z, 3, [1, 0.9, 0.55], 1.1);
        burst(mill.position.x, mill.position.y + 1.15, mill.position.z, 2, [1, 0.96, 0.8], 0.8);
      }
      if (!state.onGround) airVy = Math.min(airVy, state.vy);
      else {
        if (!wasGround && airVy < -2.3) shake = Math.min(0.16, -airVy * 0.02);
        airVy = 0;
      }
      wasGround = !!state.onGround;
    } else if (state) {
      wasGround = !!state.onGround;
      airVy = 0;
      if (!feat('juice')) shake = 0;
    }

    const showHint = !!(feat('feel') && state && !title && !state.won && !state.fallen);
    assist.visible = showHint;
    marks.forEach((ring, i) => {
      ring.visible = !!feat('feel') && !title;
      if (!ring.visible || !state) return;
      const here = state.checkpoint === i;
      ring.material.opacity = here ? 0.4 + Math.sin(t * 3) * 0.15 : 0.22;
    });
    if (showHint) {
      const goal = nextSpot(state);
      const dx = goal.x - state.x;
      const dz = goal.z - state.z;
      const len = Math.hypot(dx, dz) || 1;
      arrow.position.set(state.x + (dx / len) * 0.55, state.y + 0.72, state.z + (dz / len) * 0.55);
      arrow.rotation.y = Math.atan2(dx, dz);
      arrowMat.opacity = 0.75 + Math.sin(t * 3) * 0.2;
      for (let i = 0; i < dots.length; i++) {
        const u = (i + 1) / (dots.length + 1);
        const dist = Math.min(len, 2.8);
        dots[i].position.set(state.x + (dx / len) * dist * u, state.y - PIP_R + 0.1, state.z + (dz / len) * dist * u);
        dots[i].material.opacity = 0.35 + 0.4 * (1 - u);
      }
    }

    if (shake > 0) {
      shakeT += dt;
      shake = Math.max(0, shake - dt * 0.85);
    }
  }

  function applyShake(cam) {
    if (shake <= 0 || !feat('juice')) return;
    cam.position.x += Math.sin(shakeT * 48) * shake;
    cam.position.y += Math.cos(shakeT * 41) * shake * 0.6;
  }

  function reset() {
    shake = 0;
    airVy = 0;
    wasGround = true;
    wasWet = false;
    rippleCool = 0;
    for (const m of ripples) { m.visible = false; m.userData.t = 1; }
  }

  function look() {
    return {
      sky: sky.material === skyPainted ? 'painted' : 'plain',
      water: waters[0].material === waterFancy ? 'sparkle' : 'plain',
      foliage: foliage.visible,
      light: ao.visible,
      pip: shine.visible,
      life: life.visible && butterflies[0].visible,
      juice: !!feat('juice'),
      feel: !!feat('feel'),
      assist: assist.visible,
    };
  }

  sync();
  return {
    animate, applyShake, reset, look,
    get clearHex() { return clearHex; },
  };
}
