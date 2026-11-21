// The diorama. Pip is drawn sharp and unbloomed; only emissive seeds,
// the flower heart and a few fireflies go through the glow pass.
import * as THREE from '../vendor/three.module.js';
import { LEVEL, PIP_R } from './level.js';
import { poseGravity } from './pose.js';

const TIERS = [
  { dpr: 2, shadow: 1024, bloom: true, grass: 240, plants: 64 },
  { dpr: 1.5, shadow: 1024, bloom: true, grass: 150, plants: 42 },
  { dpr: 1.15, shadow: 512, bloom: true, grass: 90, plants: 26 },
  { dpr: 1, shadow: 0, bloom: false, grass: 48, plants: 16 },
];

const timeU = { value: 0 };
const grav = new THREE.Vector3();

function rand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deckGeo(w, d, h, r) {
  const shape = new THREE.Shape();
  const hw = w / 2, hd = d / 2;
  const rr = Math.min(r, hw * 0.42, hd * 0.42, 0.45);
  shape.moveTo(-hw + rr, -hd);
  shape.lineTo(hw - rr, -hd);
  shape.absarc(hw - rr, -hd + rr, rr, -Math.PI / 2, 0, false);
  shape.lineTo(hw, hd - rr);
  shape.absarc(hw - rr, hd - rr, rr, 0, Math.PI / 2, false);
  shape.lineTo(-hw + rr, hd);
  shape.absarc(-hw + rr, hd - rr, rr, Math.PI / 2, Math.PI, false);
  shape.lineTo(-hw, -hd + rr);
  shape.absarc(-hw + rr, -hd + rr, rr, Math.PI, Math.PI * 1.5, false);
  const depth = Math.max(0.18, h - 0.1);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05,
    bevelSegments: 2, curveSegments: 3,
  });
  geo.translate(0, 0, -depth / 2);
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function paint(geo, top, side) {
  const n = geo.attributes.normal;
  const c = new Float32Array(n.count * 3);
  for (let i = 0; i < n.count; i++) {
    const up = Math.max(0, n.getY(i));
    const k = up * up;
    c[i * 3] = side[0] + (top[0] - side[0]) * k;
    c[i * 3 + 1] = side[1] + (top[1] - side[1]) * k;
    c[i * 3 + 2] = side[2] + (top[2] - side[2]) * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
}

const PAL = {
  grass: { top: [0.46, 0.76, 0.3], side: [0.52, 0.7, 0.32], rough: 0.86 },
  stone: { top: [0.9, 0.84, 0.72], side: [0.68, 0.6, 0.48], rough: 0.62 },
  petal: { top: [0.98, 0.86, 0.55], side: [0.84, 0.64, 0.4], rough: 0.7 },
  wood: { top: [0.93, 0.72, 0.38], side: [0.72, 0.5, 0.26], rough: 0.58 },
};

function softTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function cloudTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  const puff = (x, y, r) => {
    const grd = g.createRadialGradient(x, y, r * 0.2, x, y, r);
    grd.addColorStop(0, 'rgba(255,252,245,0.95)');
    grd.addColorStop(1, 'rgba(255,252,245,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  puff(48, 70, 36); puff(78, 64, 42); puff(100, 74, 30); puff(64, 84, 28);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createView(canvas) {
  const phone = /iPhone|iPod|Android/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency || 8;
  let tier = (phone || cores <= 4) ? 1 : 0;
  let locked = false;
  const frameTimes = [];
  let sinceTier = 0;

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: false, powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xf6e2b8, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xf3e0b8, 0.008);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 220);
  camera.position.set(8.2, 16.2, -15.2);

  const hemi = new THREE.HemisphereLight(0xd7ecff, 0xf0c98a, 0.72);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1cf, 2.45);
  sun.position.set(7.5, 16, -5);
  sun.target.position.set(4.2, 0.4, 4);
  sun.castShadow = true;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xd5e6ff, 0.55);
  fill.position.set(-8, 6, 8);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xfff6df, 0.45);
  rim.position.set(-3, 4, -10);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    fog: false,
    toneMapped: true,
    uniforms: { uTime: timeU },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vDir = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform float uTime;
      void main() {
        vec3 dir = normalize(vDir);
        float h = dir.y * 0.5 + 0.5;
        vec3 top = vec3(0.53, 0.76, 1.0);
        vec3 mid = vec3(1.0, 0.84, 0.58);
        vec3 hor = vec3(1.0, 0.94, 0.80);
        vec3 col = mix(hor, mid, smoothstep(0.02, 0.38, h));
        col = mix(col, top, smoothstep(0.28, 0.9, h));
        vec3 sunDir = normalize(vec3(0.45, 0.28, -0.55));
        float glow = pow(max(dot(dir, sunDir), 0.0), 7.0);
        float disc = pow(max(dot(dir, sunDir), 0.0), 220.0);
        col += vec3(1.0, 0.93, 0.72) * glow * 0.28;
        col += vec3(1.0, 0.98, 0.9) * disc * 0.8;
        vec2 uv = dir.xz / max(0.25, dir.y * 0.55 + 0.45);
        float n = sin(uv.x * 2.1 + uTime * 0.05) * sin(uv.y * 1.7 - uTime * 0.04);
        n += 0.45 * sin(uv.x * 4.4 - uTime * 0.07 + uv.y * 3.2);
        float cloud = smoothstep(0.2, 0.85, n * 0.5 + 0.5);
        cloud *= smoothstep(0.05, 0.35, dir.y);
        col = mix(col, vec3(1.0, 0.98, 0.95), cloud * 0.5);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 20), skyMat);
  sky.frustumCulled = false;
  scene.add(sky);

  const mats = {};
  for (const key of Object.keys(PAL)) {
    const p = PAL[key];
    mats[key] = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: p.rough, metalness: key === 'wood' ? 0.04 : 0.02,
    });
  }
  const brass = new THREE.MeshStandardMaterial({ color: 0xf0d48a, roughness: 0.32, metalness: 0.82 });
  const wood = new THREE.MeshStandardMaterial({ color: 0xe7b15a, roughness: 0.55, metalness: 0.02 });
  const petalMat = new THREE.MeshStandardMaterial({ color: 0xffe7a0, roughness: 0.42, side: THREE.DoubleSide });
  const cream = new THREE.MeshStandardMaterial({ color: 0xfff6e6, roughness: 0.62 });

  function addDeck(entry, palette, parent) {
    const p = PAL[palette] || PAL.grass;
    const geo = deckGeo(entry.half[0] * 2, entry.half[2] * 2, entry.half[1] * 2, 0.28);
    paint(geo, p.top, p.side);
    const mesh = new THREE.Mesh(geo, mats[palette] || mats.grass);
    mesh.position.set(entry.pos[0], entry.pos[1], entry.pos[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  for (const s of LEVEL.slabs) {
    const kind = s.mat === 'stone' ? 'stone' : s.mat === 'petal' ? 'petal' : 'grass';
    addDeck(s, kind, world);
  }
  const curbMeshes = [];
  for (const s of LEVEL.curbs) {
    const kind = s.mat === 'stone' ? 'stone' : s.mat === 'wood' ? 'wood' : s.mat === 'petal' ? 'petal' : 'grass';
    const mesh = addDeck(s, kind === 'wood' ? 'wood' : kind, world);
    mesh.castShadow = false;
    if (s.id === 'gearstop') curbMeshes.push(mesh);
  }
  for (const s of LEVEL.ramps) {
    const geo = new THREE.BoxGeometry(s.half[0] * 2, s.half[1] * 2, s.half[2] * 2, 1, 1, 1);
    const mesh = new THREE.Mesh(geo, s.mat === 'stone' ? mats.stone : wood);
    mesh.position.set(s.pos[0], s.pos[1], s.pos[2]);
    const m = new THREE.Matrix4().makeBasis(
      new THREE.Vector3().fromArray(s.ax),
      new THREE.Vector3().fromArray(s.ay),
      new THREE.Vector3().fromArray(s.az)
    );
    mesh.quaternion.setFromRotationMatrix(m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    world.add(mesh);
  }

  // Soft rocks under each islet, so the isle looks carved rather than tiled.
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xd7b07a, roughness: 0.94 });
  for (const s of LEVEL.slabs) {
    if (s.half[0] < 0.8) continue;
    const rock = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), rockMat);
    rock.scale.set(s.half[0] * 1.05, 0.85, s.half[2] * 1.05);
    rock.position.set(s.pos[0], s.top - 1.15, s.pos[2]);
    rock.castShadow = true;
    rock.receiveShadow = true;
    world.add(rock);
  }

  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.34, 2.4, 20), brass);
  spindle.position.set(4.4, -1.15, 3.2);
  spindle.castShadow = true;
  world.add(spindle);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 10, 28), brass);
  ring.position.set(4.4, -0.05, 3.2);
  ring.rotation.x = Math.PI / 2;
  world.add(ring);
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0xe4c48a, roughness: 0.8 });
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.45, 0.42, 40), plinthMat);
  plinth.position.set(4.4, -2.15, 3.2);
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  scene.add(plinth);

  // Grass and flowers
  const rng = rand(11);
  const grassSpots = [];
  const flowerSpots = [];
  for (const s of LEVEL.slabs) {
    if (s.mat === 'stone') continue;
    const n = Math.round(s.half[0] * s.half[2] * 7);
    for (let i = 0; i < n; i++) {
      const x = s.pos[0] + (rng() - 0.5) * s.half[0] * 1.7;
      const z = s.pos[2] + (rng() - 0.5) * s.half[2] * 1.7;
      grassSpots.push({ x, y: s.top, z, h: 0.22 + rng() * 0.28, phase: rng() * 6.28 });
      if (rng() > 0.82) flowerSpots.push({ x, y: s.top, z, hue: rng() });
    }
  }

  const blade = new THREE.ConeGeometry(0.035, 1, 5, 1);
  blade.translate(0, 0.5, 0);
  const grass = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ color: 0x8ed45a, roughness: 0.8 }), grassSpots.length);
  const dummy = new THREE.Object3D();
  const gcol = new THREE.Color();
  grassSpots.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.scale.set(0.7 + (i % 5) * 0.08, p.h, 0.7);
    dummy.rotation.y = p.phase;
    dummy.rotation.z = (p.phase - 3) * 0.05;
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
    gcol.setHSL(0.28 + (i % 7) * 0.01, 0.55, 0.46);
    grass.setColorAt(i, gcol);
  });
  grass.receiveShadow = true;
  world.add(grass);
  const grassMat = grass.material;
  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = timeU;
    shader.vertexShader = 'uniform float uTime;\nattribute float aPhase;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float ph = aPhase;
       transformed.x += sin(uTime * 1.5 + ph) * 0.12 * position.y;
       transformed.z += cos(uTime * 1.2 + ph * 1.3) * 0.08 * position.y;`
    );
  };
  const phases = new Float32Array(grassSpots.map(p => p.phase));
  blade.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));

  const flowerGeo = new THREE.SphereGeometry(0.09, 10, 8);
  const flowers = new THREE.InstancedMesh(flowerGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 }), Math.max(1, flowerSpots.length));
  const hues = [0xfff3a8, 0xffd0e4, 0xd8c8ff, 0xc6ecff, 0xffe1a8];
  flowerSpots.forEach((p, i) => {
    dummy.position.set(p.x, p.y + 0.16, p.z);
    dummy.scale.set(1, 0.75, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
    flowers.setColorAt(i, gcol.set(hues[i % hues.length]));
  });
  world.add(flowers);
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.016, 0.16, 5), new THREE.MeshStandardMaterial({ color: 0x6aaa48 }), Math.max(1, flowerSpots.length));
  flowerSpots.forEach((p, i) => {
    dummy.position.set(p.x, p.y + 0.08, p.z);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    stems.setMatrixAt(i, dummy.matrix);
  });
  world.add(stems);

  function tree(x, y, z, s) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.09 * s, 0.45 * s, 8), wood);
    trunk.position.set(x, y + 0.22 * s, z);
    trunk.castShadow = true;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.38 * s, 18, 14), new THREE.MeshStandardMaterial({ color: 0x7dce55, roughness: 0.78 }));
    puff.position.set(x, y + 0.58 * s, z);
    puff.castShadow = true;
    const puff2 = puff.clone();
    puff2.scale.setScalar(0.72);
    puff2.position.set(x + 0.18 * s, y + 0.46 * s, z + 0.08 * s);
    world.add(trunk, puff, puff2);
  }
  const meadow = LEVEL.slabs.find(sl => sl.id === 'meadow');
  const high = LEVEL.slabs.find(sl => sl.id === 'high');
  const flowerSlab = LEVEL.slabs.find(sl => sl.id === 'flower');
  tree(meadow.pos[0] - 1.35, meadow.top, meadow.pos[2] + 0.4, 1.15);
  tree(meadow.pos[0] + 1.4, meadow.top, meadow.pos[2] - 1.1, 0.9);
  tree(high.pos[0] + 1.15, high.top, high.pos[2] + 0.7, 0.85);
  tree(flowerSlab.pos[0] - 1.05, flowerSlab.top, flowerSlab.pos[2] + 0.7, 0.8);

  // Water
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x5ec8c8, roughness: 0.08, metalness: 0.04, transparent: true, opacity: 0.86,
    transmission: 0, thickness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.2,
    emissive: 0xbff6ef, emissiveIntensity: 0.18,
  });
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = timeU;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed.y += sin(position.x * 3.0 + uTime * 1.5) * 0.025
                     + cos(position.z * 3.4 + uTime * 1.15) * 0.02;`
    );
  };
  const waters = [];
  for (const id of ['basin', 'pool', 'channel']) {
    const s = LEVEL.slabs.find(sl => sl.id === id);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(s.half[0] * 1.85, s.half[2] * 1.85, 16, 12), waterMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(s.pos[0], s.top + 0.045, s.pos[2]);
    mesh.receiveShadow = true;
    mesh.renderOrder = 2;
    world.add(mesh);
    waters.push(mesh);
  }

  // Seesaw
  const sw = LEVEL.seesaw;
  const seesaw = new THREE.Group();
  seesaw.position.set(sw.x, sw.posY, sw.pivotZ);
  const plank = new THREE.Mesh(new THREE.BoxGeometry(sw.halfX * 2, sw.hy * 2, sw.halfZ * 2), wood);
  const railL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, sw.halfZ * 1.9), wood);
  railL.position.set(-sw.halfX, 0.12, 0);
  const railR = railL.clone();
  railR.position.x = sw.halfX;
  seesaw.add(plank, railL, railR);
  seesaw.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(seesaw);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.55, 10), brass);
  post.position.set(sw.x, sw.posY - 0.2, sw.pivotZ);
  world.add(post);

  // Gear and its bridge tooth
  const gearShape = new THREE.Shape();
  const teeth = 8;
  for (let i = 0; i <= teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rad = i % 2 === 0 ? 0.95 : 0.72;
    const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
    if (i === 0) gearShape.moveTo(x, y); else gearShape.lineTo(x, y);
  }
  const gearGeo = new THREE.ExtrudeGeometry(gearShape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 2 });
  gearGeo.translate(0, 0, -0.08);
  const gear = new THREE.Mesh(gearGeo, brass);
  gear.position.set(LEVEL.props.gear.x, LEVEL.top - 0.55, LEVEL.props.gear.z);
  gear.castShadow = true;
  world.add(gear);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(LEVEL.bridge.half[0] * 2, 0.12, LEVEL.bridge.half[2] * 2), wood);
  bridge.position.set(LEVEL.bridge.pos[0], LEVEL.bridge.pos[1], LEVEL.bridge.pos[2]);
  bridge.castShadow = true;
  bridge.receiveShadow = true;
  world.add(bridge);

  const gate = new THREE.Mesh(new THREE.BoxGeometry(LEVEL.gate.half[0] * 2.2, LEVEL.gate.half[1] * 2, LEVEL.gate.half[2] * 2), wood);
  gate.position.fromArray(LEVEL.gate.pos);
  gate.castShadow = true;
  world.add(gate);

  // Windmill
  const mill = new THREE.Group();
  mill.position.set(LEVEL.props.mill.x, LEVEL.props.mill.y, LEVEL.props.mill.z);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.15, 16), cream);
  tower.position.y = 0.55;
  tower.castShadow = true;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), wood);
  cap.position.y = 1.15;
  const sailHub = new THREE.Group();
  sailHub.position.y = 1.05;
  sailHub.rotation.y = 0.9;
  const sails = new THREE.Group();
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xfff4d2, roughness: 0.55 });
  for (let i = 0; i < 4; i++) {
    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.95, 0.05), sailMat);
    sail.position.y = 0.62;
    const arm = new THREE.Group();
    arm.rotation.z = (i / 4) * Math.PI * 2;
    arm.add(sail);
    sails.add(arm);
  }
  sailHub.add(sails);
  mill.add(tower, cap, sailHub);
  world.add(mill);

  const wheel = new THREE.Group();
  wheel.position.set(LEVEL.props.wheel.x, LEVEL.props.wheel.y + 0.35, LEVEL.props.wheel.z);
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 8, 16), wood);
  wheel.add(wheelRim);
  for (let i = 0; i < 6; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.03), wood);
    spoke.rotation.z = (i / 6) * Math.PI;
    wheel.add(spoke);
  }
  world.add(wheel);

  // Goal flower
  const bloom = new THREE.Group();
  bloom.position.set(LEVEL.props.flower.x, LEVEL.props.flower.y, LEVEL.props.flower.z);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.7, 10), new THREE.MeshStandardMaterial({ color: 0x6aaa48, roughness: 0.7 }));
  stem.position.y = 0.35;
  const heartMat = new THREE.MeshStandardMaterial({ color: 0xffd15a, emissive: 0xffc44a, emissiveIntensity: 0.55, roughness: 0.32 });
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), heartMat);
  heart.position.y = 0.78;
  const petalBits = [];
  const petalGeo = new THREE.SphereGeometry(0.28, 16, 12);
  petalGeo.scale(1.05, 1.85, 0.45);
  for (let i = 0; i < 8; i++) {
    const hinge = new THREE.Group();
    hinge.rotation.y = (i / 8) * Math.PI * 2;
    hinge.position.y = 0.72;
    const bit = new THREE.Mesh(petalGeo, petalMat);
    bit.position.y = 0.28;
    hinge.add(bit);
    bloom.add(hinge);
    petalBits.push(hinge);
  }
  bloom.add(stem, heart);
  bloom.traverse(o => { if (o.isMesh) o.castShadow = true; });
  world.add(bloom);

  // Pip — body rolls, face stays upright and round.
  const pip = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x8fdff0, roughness: 0.18, metalness: 0.02,
    clearcoat: 1, clearcoatRoughness: 0.08,
    iridescence: 0.42, iridescenceIOR: 1.25,
    sheen: 0.45, sheenColor: new THREE.Color(0xfff1c2),
    envMapIntensity: 1.1,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(PIP_R, 48, 32), bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  const swirlMat = new THREE.MeshStandardMaterial({ color: 0xbfe9ff, roughness: 0.25, metalness: 0.05 });
  for (let i = 0; i < 3; i++) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), swirlMat);
    const a = i * 2.2;
    dot.position.set(Math.cos(a) * 0.28, -0.05 + i * 0.04, Math.sin(a) * 0.28);
    body.add(dot);
  }
  const face = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xfffaf3, roughness: 0.25 });
  const iris = new THREE.MeshStandardMaterial({ color: 0x2f6f78, roughness: 0.3 });
  const pupil = new THREE.MeshStandardMaterial({ color: 0x1c3340, roughness: 0.35 });
  const glint = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const cheek = new THREE.MeshStandardMaterial({ color: 0xffc4d4, transparent: true, opacity: 0.85, roughness: 0.7 });
  const pupils = [];
  function makeEye(x) {
    const g = new THREE.Group();
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.118, 22, 16), white);
    const ir = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 12), iris);
    ir.position.z = 0.062;
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), pupil);
    pu.position.z = 0.095;
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), glint);
    gl.position.set(0.02, 0.028, 0.112);
    g.add(w, ir, pu, gl);
    g.position.set(x, 0.1, 0.24);
    pupils.push(pu);
    return g;
  }
  face.rotation.y = Math.PI;
  face.add(makeEye(-0.11), makeEye(0.11));
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 14, Math.PI), pupil);
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.02, 0.3);
  const cL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), cheek);
  cL.position.set(-0.16, 0.02, 0.26);
  const cR = cL.clone();
  cR.position.x = 0.16;
  face.add(smile, cL, cR);
  pip.add(body, face);
  world.add(pip);

  const blobTex = softTex();
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), new THREE.MeshBasicMaterial({
    map: blobTex, transparent: true, opacity: 0.35, depthWrite: false, color: 0x6a5030,
  }));
  blob.rotation.x = -Math.PI / 2;
  blob.renderOrder = 1;
  world.add(blob);

  // Seeds
  const seedMeshes = [];
  const seedMat = new THREE.MeshStandardMaterial({ color: 0xffe7a0, emissive: 0xffcc55, emissiveIntensity: 0.28, roughness: 0.4 });
  const haloMat = new THREE.SpriteMaterial({ map: blobTex, color: 0xffe7a8, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const s of LEVEL.seeds) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), seedMat);
    m.position.set(s.x, s.y, s.z);
    m.layers.enable(1);
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(0.32);
    m.add(halo);
    world.add(m);
    seedMeshes.push({ m, id: s.id, base: s.y });
  }

  // Fireflies
  const flies = [];
  const flyMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0 });
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), flyMat);
    m.layers.enable(1);
    m.userData.base = new THREE.Vector3((rng() - 0.5) * 10 + 4, 1.4 + rng(), (rng() - 0.5) * 12 + 2);
    m.position.copy(m.userData.base);
    world.add(m);
    flies.push(m);
  }

  // Clouds in room space, so the isle can turn underneath them.
  const cTex = cloudTex();
  const clouds = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(7 + i, 3.4), new THREE.MeshBasicMaterial({ map: cTex, transparent: true, depthWrite: false, fog: false, opacity: 0.85 }));
    m.position.set(-18 + i * 9, 13.2 + (i % 2) * 0.6, 4 + (i % 3));
    m.userData.speed = 0.12 + i * 0.03;
    scene.add(m);
    clouds.push(m);
  }

  // Particles
  const PN = 180;
  const pPos = new Float32Array(PN * 3);
  const pCol = new Float32Array(PN * 3);
  const pLife = new Float32Array(PN);
  const pMax = new Float32Array(PN);
  const pVel = new Float32Array(PN * 3);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: 0.14, vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true, opacity: 0.9,
  }));
  points.frustumCulled = false;
  world.add(points);
  let pCursor = 0;
  function burst(x, y, z, count, col, speed) {
    for (let i = 0; i < count; i++) {
      const ix = pCursor % PN;
      pCursor++;
      pPos[ix * 3] = x; pPos[ix * 3 + 1] = y; pPos[ix * 3 + 2] = z;
      pVel[ix * 3] = (Math.random() - 0.5) * speed;
      pVel[ix * 3 + 1] = Math.random() * speed;
      pVel[ix * 3 + 2] = (Math.random() - 0.5) * speed;
      pCol[ix * 3] = col[0]; pCol[ix * 3 + 1] = col[1]; pCol[ix * 3 + 2] = col[2];
      pLife[ix] = 0;
      pMax[ix] = 0.6 + Math.random() * 0.8;
    }
  }

  // Selective bloom
  let bloomRT = null, blurA = null, blurB = null;
  const blurScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { tMap: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uPx: { value: new THREE.Vector2(1 / 256, 1 / 256) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform sampler2D tMap; uniform vec2 uDir; uniform vec2 uPx;
      void main() {
        vec2 d = uDir * uPx;
        vec3 c = texture2D(tMap, vUv).rgb * 0.227;
        c += texture2D(tMap, vUv + d * 1.4).rgb * 0.316;
        c += texture2D(tMap, vUv - d * 1.4).rgb * 0.316;
        c += texture2D(tMap, vUv + d * 3.2).rgb * 0.07;
        c += texture2D(tMap, vUv - d * 3.2).rgb * 0.07;
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthTest: false, toneMapped: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat);
  blurScene.add(quad);
  const compMat = new THREE.ShaderMaterial({
    uniforms: { tMap: { value: null } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform sampler2D tMap; void main(){ gl_FragColor = vec4(texture2D(tMap, vUv).rgb * 0.28, 1.0); }`,
    transparent: true, depthTest: false, toneMapped: false, blending: THREE.AdditiveBlending,
  });
  const compScene = new THREE.Scene();
  const compQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compMat);
  compScene.add(compQuad);

  function makeTargets() {
    const w = Math.max(2, Math.floor(canvas.width / 2));
    const h = Math.max(2, Math.floor(canvas.height / 2));
    const opt = { depthBuffer: false, type: THREE.HalfFloatType };
    bloomRT = new THREE.WebGLRenderTarget(w, h, opt);
    blurA = new THREE.WebGLRenderTarget(w, h, opt);
    blurB = new THREE.WebGLRenderTarget(w, h, opt);
    blurMat.uniforms.uPx.value.set(1.4 / w, 1.4 / h);
  }

  function applyTier() {
    const t = TIERS[tier];
    const dpr = Math.min(window.devicePixelRatio || 1, t.dpr);
    renderer.setPixelRatio(dpr);
    renderer.shadowMap.enabled = t.shadow > 0;
    sun.castShadow = t.shadow > 0;
    if (t.shadow) {
      sun.shadow.mapSize.set(t.shadow, t.shadow);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    }
    const cam = sun.shadow.camera;
    cam.left = -14; cam.right = 14; cam.top = 14; cam.bottom = -14;
    cam.near = 2; cam.far = 42;
    cam.updateProjectionMatrix();
    sun.shadow.bias = -0.00025;
    sun.shadow.normalBias = 0.035;
    grass.count = Math.min(grassSpots.length, t.grass);
    flowers.count = Math.min(flowerSpots.length, t.plants);
    stems.count = flowers.count;
    resize();
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    if (TIERS[tier].bloom) makeTargets();
  }

  const look = new THREE.Vector3(3.4, 1.15, 1.6);
  const camPos = new THREE.Vector3(8.6, 16.4, -14.6);
  const _flowerWorld = new THREE.Vector3();
  const _finale = new THREE.Vector3();
  const _finaleOffset = new THREE.Vector3(1.8, 3.4, -3.8);
  let rollAngle = 0;
  let squash = 0;
  let seen = new Set();
  let bloomT = 0;

  function update(dt, state, pose, extra) {
    timeU.value += dt;
    sinceTier += dt;
    const tset = TIERS[tier];
    poseGravity(pose.yaw, pose.pitch, pose.roll, grav, world.quaternion);

    if (state) {
      pip.position.set(state.x, state.y, state.z);
      const sp = Math.hypot(state.vx, state.vz);
      if (sp > 0.05) {
        rollAngle += (sp * dt) / PIP_R;
        const axis = new THREE.Vector3(-state.vz / sp, 0, state.vx / sp);
        body.quaternion.setFromAxisAngle(axis, rollAngle);
      }
      const stretch = Math.min(0.18, sp * 0.045);
      const landed = state.onGround && Math.abs(state.vy) < 0.2;
      squash += ((landed ? 0 : 0) - squash) * Math.min(1, dt * 6);
      if (state.onGround && state.vy < -0.01) squash = Math.min(0.22, squash + 0.04);
      const sy = 1 + stretch * 0.4 - squash;
      const sx = 1 / Math.sqrt(Math.max(0.55, sy));
      body.scale.set(sx, sy, sx);
      face.position.y = (sy - 1) * 0.12;
      const blink = Math.sin(timeU.value * 0.7) > 0.97 ? 0.15 : 1;
      face.scale.set(1, blink, 1);

      blob.position.set(state.x, state.y - PIP_R + 0.03, state.z);
      blob.material.opacity = state.onGround ? 0.32 : 0.12;
      blob.scale.setScalar(state.onGround ? 1 : 0.7);

      seesaw.rotation.x = state.seeAngle;
      gear.rotation.y = pose.yaw * 2;
      const bridgeY = state.bridge ? LEVEL.bridge.pos[1] : LEVEL.bridge.pos[1] - 0.85;
      bridge.position.y += (bridgeY - bridge.position.y) * Math.min(1, dt * 6);
      bridge.visible = bridge.position.y > LEVEL.top - 0.7;
      for (const m of curbMeshes) m.visible = !state.bridge;
      const gateUp = state.yawIndex === LEVEL.gate.openYaw;
      const gateY = gateUp ? LEVEL.gate.pos[1] + 0.7 : LEVEL.gate.pos[1];
      gate.position.y += (gateY - gate.position.y) * Math.min(1, dt * 5);
      sails.rotation.z += dt * (0.4 + state.windCharge * 6.5);
      const spinning = state.yawIndex === 2 ? 2.4 : 0.3;
      wheel.rotation.z += dt * spinning;

      for (const s of seedMeshes) {
        const got = state.seeds.includes(s.id);
        s.m.visible = !got;
        if (!got) s.m.position.y = s.base + Math.sin(timeU.value * 2 + s.base) * 0.06;
        else if (!seen.has(s.id)) {
          seen.add(s.id);
          burst(s.m.position.x, s.base, s.m.position.z, 16, [1, 0.9, 0.55], 1.6);
        }
      }
      if (state.won) bloomT = Math.min(1, bloomT + dt / 2.6);
      else bloomT = 0;
      const open = 0.7 + bloomT * 0.7;
      petalBits.forEach((h, i) => {
        const bit = h.children[0];
        bit.rotation.x = open;
        const s = 0.85 + bloomT * 0.45;
        bit.scale.set(s, s, s);
      });
      heart.scale.setScalar(1 + bloomT * 0.35 + Math.sin(timeU.value * 3) * 0.03);
      heartMat.emissiveIntensity = 0.25 + bloomT * 0.85;
      if (bloomT > 0.04) heart.layers.enable(1);
      else heart.layers.disable(1);
      if (bloomT > 0.05 && Math.random() < dt * 10) {
        burst(bloom.position.x, bloom.position.y + 1, bloom.position.z, 2, [1, 0.95, 0.7], 1.2);
      }
    }

    for (let i = 0; i < PN; i++) {
      if (pMax[i] <= 0) continue;
      pLife[i] += dt;
      if (pLife[i] > pMax[i]) { pMax[i] = 0; pPos[i * 3 + 1] = -99; continue; }
      pPos[i * 3] += pVel[i * 3] * dt;
      pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt;
      pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
      pVel[i * 3 + 1] -= dt * 0.4;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;

    flies.forEach((m, i) => {
      const b = m.userData.base;
      m.position.set(b.x + Math.sin(timeU.value * 0.6 + i) * 0.4, b.y + Math.sin(timeU.value * 1.3 + i) * 0.2, b.z + Math.cos(timeU.value * 0.5 + i) * 0.4);
    });
    clouds.forEach(m => {
      m.position.x += dt * m.userData.speed;
      if (m.position.x > 16) m.position.x = -16;
      m.lookAt(camera.position);
    });

    const focus = state ? new THREE.Vector3(state.x, state.y, state.z) : look;
    const wantLook = look.clone().lerp(focus, extra && extra.title ? 0.02 : 0.12);
    if (bloomT > 0) wantLook.lerp(bloom.position, bloomT * 0.65);
    if (bloomT > 0.05) {
      bloom.getWorldPosition(_flowerWorld);
      _finale.copy(_flowerWorld).add(_finaleOffset);
      camera.position.lerp(_finale, 1 - Math.exp(-dt * 1.5));
      wantLook.copy(_flowerWorld);
      wantLook.y += 0.45;
    } else {
      camera.position.lerp(camPos, 1 - Math.exp(-dt * 2));
    }
    camera.lookAt(wantLook);

    camera.layers.set(0);
    renderer.setRenderTarget(null);
    renderer.autoClear = true;
    renderer.render(scene, camera);

    if (tset.bloom && bloomRT) {
      camera.layers.set(1);
      renderer.setRenderTarget(bloomRT);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
      renderer.setClearColor(0xf6e2b8, 1);
      camera.layers.set(0);
      blurMat.uniforms.tMap.value = bloomRT.texture;
      blurMat.uniforms.uDir.value.set(1, 0);
      renderer.setRenderTarget(blurA);
      renderer.render(blurScene, quadCam);
      blurMat.uniforms.tMap.value = blurA.texture;
      blurMat.uniforms.uDir.value.set(0, 1);
      renderer.setRenderTarget(blurB);
      renderer.render(blurScene, quadCam);
      compMat.uniforms.tMap.value = blurB.texture;
      renderer.setRenderTarget(null);
      renderer.autoClear = false;
      renderer.render(compScene, quadCam);
      renderer.autoClear = true;
    }

    if (!locked) {
      frameTimes.push(dt);
      if (frameTimes.length > 45) frameTimes.shift();
      if (sinceTier > 2.5 && frameTimes.length > 30) {
        const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        if (avg > 0.020 && tier < TIERS.length - 1) {
          tier++;
          frameTimes.length = 0;
          sinceTier = 0;
          applyTier();
        }
      }
    }
  }

  applyTier();
  window.addEventListener('resize', resize);

  return {
    update, resize,
    get tier() { return tier; },
    lockTier(i) { locked = true; tier = Math.max(0, Math.min(TIERS.length - 1, i)); applyTier(); },
    resetSeeds() { seen = new Set(); bloomT = 0; },
    get bloom() { return bloomT; },
  };
}
