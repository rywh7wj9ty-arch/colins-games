import * as THREE from '../vendor/three.module.js';
import { createSim } from '../js/sim.js';
import { LEVEL, LAYOUT } from '../js/level.js';
import { poseGravity, tiltFor } from '../js/pose.js';

const sim = createSim();
const grav = new THREE.Vector3();
let yaw = 0;

function pose(y, pitch, roll) {
  yaw = y;
  poseGravity(y, pitch, roll, grav, null);
  sim.setGravity(grav.x, grav.y, grav.z);
}
function tilt(dx, dz) {
  const t = tiltFor(yaw, dx, dz);
  pose(yaw, t.pitch, t.roll);
}
function flat() { pose(yaw, 0, 0); }
function frames(n) { for (let i = 0; i < n; i++) sim.step(1 / 60); }
function until(dx, dz, pred, max = 8) {
  tilt(dx, dz);
  const n = Math.round(max * 60);
  for (let i = 0; i < n; i++) {
    sim.step(1 / 60);
    const s = sim.state();
    if (i % 30 === 0) console.log(s.t.toFixed(1), 'p', s.x.toFixed(2), s.y.toFixed(2), s.z.toFixed(2), 'g', s.groundId, 'G', grav.x.toFixed(2), grav.z.toFixed(2), 'v', s.vx.toFixed(2), s.vz.toFixed(2), 'seeds', s.seeds.length, 'cp', s.checkpoint, s.fallen ? 'FALL' : '', s.won ? 'WIN' : '');
    if (pred(s)) return s;
  }
  return null;
}
function settle(max = 1.5) {
  flat();
  const n = Math.round(max * 60);
  for (let i = 0; i < n; i++) {
    sim.step(1 / 60);
    const s = sim.state();
    if (Math.hypot(s.vx, s.vz) < 0.05 && s.onGround) return s;
  }
  return sim.state();
}
function turn(dir) {
  flat();
  frames(8);
  const turns = sim.state().turns + dir;
  sim.setTurns(turns);
  sim.setYawIndex(turns);
  yaw = turns * Math.PI / 2;
  pose(yaw, 0, 0);
  frames(20);
}

console.log('layout', {
  south: LAYOUT.southTip.z.toFixed(2),
  north: LAYOUT.northTip.z.toFixed(2),
  meadowN: LAYOUT.meadowNorth.toFixed(2),
  after: LAYOUT.afterSouth.toFixed(2) + '..' + LAYOUT.afterNorth.toFixed(2),
});
console.log('spawn', LEVEL.spawn);
console.log('cps', LEVEL.checkpoints.map(c => c.id + '@' + c.x.toFixed(1) + ',' + c.z.toFixed(1)).join(' '));
console.log('seeds', LEVEL.seeds.map(s => s.id + '@' + s.x.toFixed(1) + ',' + s.z.toFixed(1)).join(' '));

pose(0, 0, 0);
let s = until(0, 1, (s) => s.z > -1.2 || s.fallen, 10);
console.log('after meadow', s && [s.x, s.y, s.z, s.groundId, s.seeds.join(',')]);
if (!s) process.exit(1);
s = until(0, 1, (s) => s.checkpoint >= 1 || s.fallen, 8);
console.log('seesaw/cp1', s && [s.x.toFixed(2), s.y.toFixed(2), s.z.toFixed(2), s.groundId, 'seeds', s.seeds.join(',')]);
if (!s || s.fallen) process.exit(1);
s = until(0, 1, (s) => s.z > LEVEL.checkpoints[1].z + 0.2 || s.fallen, 6);
settle(1.2);
console.log('before gap', sim.state());
turn(1);
s = until(0, 1, (s) => s.checkpoint >= 2 || s.fallen, 8);
console.log('land', s && [s.x.toFixed(2), s.z.toFixed(2), s.groundId, s.seeds.join(',')]);
if (!s || s.fallen) process.exit(1);
s = until(1, 0, (s) => s.seeds.includes('s4') || s.fallen || s.x > 3, 8);
console.log('toward pool', sim.state());
s = until(0, 1, (s) => s.seeds.includes('s4') || s.fallen, 6);
console.log('pool seed', sim.state());
turn(1);
s = until(0, -1, (s) => s.z < 6.7 || s.fallen, 4);
flat();
frames(40);
console.log('out of pool', sim.state().x.toFixed(2), sim.state().z.toFixed(2), sim.state().groundId, 'yaw', sim.state().yawIndex);
s = until(0, 1, (s) => s.z > 5.95 || s.fallen, 4);
console.log('lined up', sim.state().x.toFixed(2), sim.state().z.toFixed(2), sim.state().groundId);
s = until(1, 0.05, (s) => s.checkpoint >= 3 || s.fallen, 12);
console.log('wind pad', s && [s.x.toFixed(2), s.y.toFixed(2), s.z.toFixed(2), s.seeds.join(','), s.groundId]);
if (!s || s.fallen) process.exit(1);
settle(0.8);
turn(1);
// wait for wind
pose(yaw, 0, 0);
for (let i = 0; i < 80 && sim.state().windCharge < 0.75; i++) sim.step(1 / 60);
console.log('wind charge', sim.state().windCharge.toFixed(2), 'at', sim.state().z.toFixed(2));
s = until(0, 1, (s) => s.y > 1.65 || s.checkpoint >= 4 || s.fallen, 6);
flat();
{
  const n = 7 * 60;
  let landed = null;
  for (let i = 0; i < n; i++) {
    sim.step(1 / 60);
    const st = sim.state();
    if (st.fallen) break;
    if (st.checkpoint >= 4 && st.onGround && st.y > 2 && Math.hypot(st.vx, st.vz) < 0.3) { landed = st; break; }
  }
  s = landed || sim.state();
}
console.log('landed high', [s.x.toFixed(2), s.y.toFixed(2), s.z.toFixed(2), s.groundId, 'cp', s.checkpoint, s.seeds.join(','), s.fallen]);
if (!s || s.fallen || s.checkpoint < 4) process.exit(1);
if (s.z > 11.45) {
  s = until(0, -1, (st) => st.z < 11.25 || st.fallen, 3);
  settle(0.5);
}
console.log('ready', sim.state().seeds.join(','), sim.state().x.toFixed(2), sim.state().z.toFixed(2));
s = until(-1, 0, (st) => st.x < 6.4 || st.won || st.fallen, 6);
console.log('at ramp', sim.state().x.toFixed(2), sim.state().y.toFixed(2), sim.state().z.toFixed(2), sim.state().groundId);
s = until(-1, 0, (s) => s.won || s.fallen, 8);
console.log('finale', sim.state());
if (!sim.state().won) process.exit(1);
console.log('OK', sim.state().seeds.length + '/' + sim.state().seedTotal, 't', sim.state().t.toFixed(1));
