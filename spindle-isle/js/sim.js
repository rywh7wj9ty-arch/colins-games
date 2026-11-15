// Pip is a marble. The isle's tilt is gravity; mechanisms are boxes that
// appear, tip or push depending on which way the spindle is clicked.
import { LEVEL, PIP_R } from './level.js';

const R = PIP_R;
const ID = { ax: [1, 0, 0], ay: [0, 1, 0], az: [0, 0, 1] };

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function axesX(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { ax: [1, 0, 0], ay: [0, c, s], az: [0, -s, c] };
}

export function createSim(level = LEVEL) {
  const pip = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
  const got = new Set();
  let gx = 0, gy = -18, gz = 0;
  let yawIndex = 0;
  let turns = 0;
  let seeAngle = level.seesaw.rest;
  let seeVel = 0;
  let windCharge = 0;
  let onGround = false;
  let groundId = '';
  let fallen = false;
  let won = false;
  let checkpoint = 0;
  let snap = null;
  let bridgeLatch = false;
  let t = 0;
  const boxes = [];

  function reset() {
    const s = level.spawn;
    pip.x = s.x; pip.y = s.y; pip.z = s.z;
    pip.vx = pip.vy = pip.vz = 0;
    got.clear();
    yawIndex = 0;
    turns = 0;
    seeAngle = level.seesaw.rest;
    seeVel = 0;
    windCharge = 0;
    onGround = false;
    groundId = '';
    fallen = false;
    won = false;
    checkpoint = 0;
    bridgeLatch = false;
    t = 0;
    const c0 = level.checkpoints[0];
    snap = { x: c0.x, y: c0.y, z: c0.z, yawIndex: 0, turns: 0 };
  }

  function setGravity(x, y, z) { gx = x; gy = y; gz = z; }
  function setYawIndex(i) { yawIndex = ((i % 4) + 4) % 4; }
  function setTurns(n) { turns = n; }

  function overlap(b) {
    const dx = pip.x - b.pos[0], dy = pip.y - b.pos[1], dz = pip.z - b.pos[2];
    const lx = b.ax[0] * dx + b.ax[1] * dy + b.ax[2] * dz;
    const ly = b.ay[0] * dx + b.ay[1] * dy + b.ay[2] * dz;
    const lz = b.az[0] * dx + b.az[1] * dy + b.az[2] * dz;
    const hx = b.half[0], hy = b.half[1], hz = b.half[2];
    const cx = clamp(lx, -hx, hx), cy = clamp(ly, -hy, hy), cz = clamp(lz, -hz, hz);
    const ox = lx - cx, oy = ly - cy, oz = lz - cz;
    const d2 = ox * ox + oy * oy + oz * oz;
    if (d2 > R * R) return null;
    let nx, ny, nz, pen;
    if (d2 > 1e-10) {
      const d = Math.sqrt(d2);
      nx = ox / d; ny = oy / d; nz = oz / d;
      pen = R - d;
    } else {
      const pxn = hx - Math.abs(lx), pyn = hy - Math.abs(ly), pzn = hz - Math.abs(lz);
      if (pxn <= pyn && pxn <= pzn) { nx = Math.sign(lx) || 1; ny = 0; nz = 0; pen = pxn + R; }
      else if (pyn <= pzn) { nx = 0; ny = Math.sign(ly) || 1; nz = 0; pen = pyn + R; }
      else { nx = 0; ny = 0; nz = Math.sign(lz) || 1; pen = pzn + R; }
    }
    return {
      id: b.id,
      nx: b.ax[0] * nx + b.ay[0] * ny + b.az[0] * nz,
      ny: b.ax[1] * nx + b.ay[1] * ny + b.az[1] * nz,
      nz: b.ax[2] * nx + b.ay[2] * ny + b.az[2] * nz,
      pen,
      spin: b.spin || null,
    };
  }

  function bridgeOn() {
    return yawIndex === level.bridge.yaw || bridgeLatch;
  }

  function collectBoxes() {
    boxes.length = 0;
    const pushAabb = (s) => {
      if (s.id === 'gearstop' && bridgeOn()) return;
      boxes.push({
        id: s.id, pos: s.pos, half: s.half,
        ax: ID.ax, ay: ID.ay, az: ID.az,
      });
    };
    for (const s of level.slabs) pushAabb(s);
    for (const s of level.curbs) pushAabb(s);
    for (const s of level.ramps) {
      boxes.push({ id: s.id, pos: s.pos, half: s.half, ax: s.ax, ay: s.ay, az: s.az });
    }

    const sw = level.seesaw;
    const ax = axesX(seeAngle);
    const origin = [sw.x, sw.posY, sw.pivotZ];
    const spin = { w: seeVel, origin };
    boxes.push({
      id: 'seesaw', pos: origin, half: [sw.halfX, sw.hy, sw.halfZ],
      ax: ax.ax, ay: ax.ay, az: ax.az, spin,
    });
    for (const side of [-1, 1]) {
      const ox = side * (sw.halfX + 0.08);
      const oy = 0.16;
      boxes.push({
        id: side < 0 ? 'seeL' : 'seeR',
        pos: [
          origin[0] + ax.ax[0] * ox + ax.ay[0] * oy,
          origin[1] + ax.ax[1] * ox + ax.ay[1] * oy,
          origin[2] + ax.ax[2] * ox + ax.ay[2] * oy,
        ],
        half: [0.08, 0.14, sw.halfZ * 0.96],
        ax: ax.ax, ay: ax.ay, az: ax.az, spin,
      });
    }

    if (bridgeOn()) {
      const b = level.bridge;
      boxes.push({ id: 'bridge', pos: b.pos, half: b.half, ax: ID.ax, ay: ID.ay, az: ID.az });
      for (const side of [-1, 1]) {
        boxes.push({
          id: 'bridgeRail',
          pos: [b.pos[0] + side * (b.half[0] + 0.06), b.pos[1] + 0.16, b.pos[2]],
          half: [0.08, 0.14, b.half[2] * 0.98],
          ax: ID.ax, ay: ID.ay, az: ID.az,
        });
      }
    }

    const gate = level.gate;
    const gateOpen = yawIndex === gate.openYaw;
    if (!gateOpen) {
      const hit = Math.abs(pip.x - gate.pos[0]) < gate.half[0] + R
        && Math.abs(pip.y - gate.pos[1]) < gate.half[1] + R
        && Math.abs(pip.z - gate.pos[2]) < gate.half[2] + R;
      if (!hit) boxes.push({ id: 'gate', pos: gate.pos, half: gate.half, ax: ID.ax, ay: ID.ay, az: ID.az });
    }
  }

  function inRect(vol, y0, y1) {
    return Math.abs(pip.x - vol.x) <= vol.hw && Math.abs(pip.z - vol.z) <= vol.hd
      && pip.y >= y0 && pip.y <= y1;
  }

  function updateSeesaw(dt) {
    const sw = level.seesaw;
    let torque = (sw.rest - seeAngle) * 7.5 - seeVel * 4.2;
    if (groundId === 'seesaw' || groundId === 'seeL' || groundId === 'seeR') {
      const ax = axesX(seeAngle);
      const dx = pip.x - sw.x, dy = pip.y - sw.posY, dz = pip.z - sw.pivotZ;
      const lz = ax.az[0] * dx + ax.az[1] * dy + ax.az[2] * dz;
      torque += lz * 36;
    }
    seeVel += torque * dt;
    seeAngle += seeVel * dt;
    if (seeAngle < sw.min) { seeAngle = sw.min; seeVel *= 0.15; }
    if (seeAngle > sw.max) { seeAngle = sw.max; seeVel *= 0.15; }
  }

  function integrate(dt) {
    const currents = level.currents[yawIndex] || [];
    let inWater = false;
    for (const c of currents) {
        if (Math.abs(pip.x - c.x) <= c.hw && Math.abs(pip.z - c.z) <= c.hd && pip.y < level.waterTop + 1.2 && pip.y > level.waterTop - 0.45) {
        inWater = true;
        pip.vx += c.ax * dt;
        pip.vz += c.az * dt;
      }
    }
    for (const w of level.water) {
      if (inRect(w, level.waterTop - 0.3, w.y + 0.8)) inWater = true;
    }

    const wind = level.wind;
    const inWind = yawIndex === wind.yaw && windCharge > 0.68 && inRect(wind, wind.y0, wind.y1);
    if (inWind && pip.y < wind.home.y + 0.35) {
      const h = wind.home;
      const wantVy = 7.4;
      if (pip.vy < wantVy) pip.vy += (wantVy - pip.vy) * Math.min(1, 6 * dt);
      const wantVz = clamp((h.z - pip.z) * 1.35, 0.6, 2.6);
      pip.vz += (wantVz - pip.vz) * Math.min(1, 3.5 * dt);
      pip.vx += clamp(h.x - pip.x, -2, 2) * 2.2 * dt;
    }

    pip.vx += gx * dt;
    pip.vy += gy * dt;
    pip.vz += gz * dt;

    const sp = Math.hypot(pip.vx, pip.vz);
    const maxSp = 8.5;
    if (sp > maxSp) { pip.vx *= maxSp / sp; pip.vz *= maxSp / sp; }
    pip.vy = clamp(pip.vy, -12, 12);

    pip.x += pip.vx * dt;
    pip.y += pip.vy * dt;
    pip.z += pip.vz * dt;

    onGround = false;
    groundId = '';
    let bestNy = 0;
    let bestId = '';
    for (let k = 0; k < 8; k++) {
      let best = null;
      for (const b of boxes) {
        const hit = overlap(b);
        if (hit && (!best || hit.pen > best.pen)) best = hit;
      }
      if (!best || best.pen < 0.0004) break;
      pip.x += best.nx * best.pen;
      pip.y += best.ny * best.pen;
      pip.z += best.nz * best.pen;
      let svx = 0, svy = 0, svz = 0;
      if (best.spin) {
        const rz = pip.z - best.spin.origin[2];
        const ry = pip.y - best.spin.origin[1];
        svy = -best.spin.w * rz;
        svz = best.spin.w * ry;
      }
      const rvx = pip.vx - svx, rvy = pip.vy - svy, rvz = pip.vz - svz;
      const vn = rvx * best.nx + rvy * best.ny + rvz * best.nz;
      if (vn < 0) {
        pip.vx -= best.nx * vn;
        pip.vy -= best.ny * vn;
        pip.vz -= best.nz * vn;
      }
      if (best.ny > 0.45 && best.ny >= bestNy) {
        bestNy = best.ny;
        bestId = best.id;
        onGround = true;
      }
    }
    groundId = bestId;
    if (groundId === 'bridge') bridgeLatch = true;
    if (bridgeLatch && groundId && groundId !== 'bridge' && groundId !== 'bridgeRail' && yawIndex !== level.bridge.yaw) {
      bridgeLatch = false;
    }

    const drag = onGround ? (inWater ? 0.95 : (inWind ? 0.4 : 2.45)) : 0.18;
    const f = Math.exp(-drag * dt);
    pip.vx *= f;
    pip.vz *= f;
    if (!inWind) pip.vy *= Math.exp(-0.12 * dt);
    if (onGround && pip.vy < 0.35 && pip.vy > -0.35) pip.vy = 0;
    if (onGround && Math.hypot(pip.vx, pip.vz) < 0.035 && Math.hypot(gx, gz) < 0.45) {
      pip.vx = 0; pip.vz = 0;
    }
  }

  function sense() {
    for (const s of level.seeds) {
      if (got.has(s.id)) continue;
      const dx = pip.x - s.x, dy = pip.y - s.y, dz = pip.z - s.z;
      if (dx * dx + dy * dy + dz * dz < 0.72 * 0.72) got.add(s.id);
    }
    const cps = level.checkpoints;
    for (let i = checkpoint + 1; i < cps.length; i++) {
      const c = cps[i];
      const dx = pip.x - c.x, dz = pip.z - c.z;
      if (dx * dx + dz * dz < c.r * c.r && onGround && Math.abs(pip.y - c.y) < 0.8) {
        checkpoint = i;
        snap = { x: c.x, y: c.y, z: c.z, yawIndex, turns };
      }
    }
    const g = level.goal;
    const dx = pip.x - g.x, dz = pip.z - g.z;
    if (!won && onGround && dx * dx + dz * dz < g.r * g.r && Math.abs(pip.y - g.y) < 0.55) {
      won = true;
      pip.vx = pip.vy = pip.vz = 0;
    }
    if (pip.y < -1.45) {
      fallen = true;
      pip.vx = pip.vy = pip.vz = 0;
    }
  }

  function step(dt) {
    if (won || fallen) return;
    t += dt;
    if (yawIndex === level.wind.yaw) windCharge = Math.min(1, windCharge + dt / 0.75);
    else windCharge = Math.max(0, windCharge - dt / 0.45);
    updateSeesaw(dt);
    collectBoxes();
    const sub = Math.hypot(pip.vx, pip.vy, pip.vz) > 6 ? 2 : 1;
    const h = dt / sub;
    for (let i = 0; i < sub; i++) {
      integrate(h);
      collectBoxes();
    }
    sense();
  }

  function restore() {
    if (!snap) return;
    pip.x = snap.x; pip.y = snap.y; pip.z = snap.z;
    pip.vx = pip.vy = pip.vz = 0;
    fallen = false;
    yawIndex = snap.yawIndex;
    turns = snap.turns;
    seeVel = 0;
    windCharge = yawIndex === level.wind.yaw ? 1 : 0;
  }

  function state() {
    return {
      x: pip.x, y: pip.y, z: pip.z,
      vx: pip.vx, vy: pip.vy, vz: pip.vz,
      yawIndex, turns, seeds: [...got],
      seedTotal: level.seeds.length,
      won, fallen, checkpoint, onGround, groundId,
      seeAngle, windCharge, bridge: bridgeOn(),
      t, snap: snap ? { ...snap } : null,
    };
  }

  reset();
  return {
    pip, reset, step, setGravity, setYawIndex, setTurns, restore, state,
    get yawIndex() { return yawIndex; },
    get won() { return won; },
    get fallen() { return fallen; },
    get seeAngle() { return seeAngle; },
    get windCharge() { return windCharge; },
  };
}
