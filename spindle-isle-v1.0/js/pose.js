// Screen-space tilt (parent) then island yaw (child). Gravity in island space
// matches three.js Quaternion + Euler XYZ, so the marble and the picture agree.
import * as THREE from '../vendor/three.module.js';

const _e = new THREE.Euler(0, 0, 0, 'XYZ');
const _tilt = new THREE.Quaternion();
const _yawQ = new THREE.Quaternion();
const _q = new THREE.Quaternion();
const _g = new THREE.Vector3();
const _Y = new THREE.Vector3(0, 1, 0);

export const MAX_TILT = 16 * Math.PI / 180;
export const GRAV = 18;

/** Writes the world quaternion and the gravity vector felt on the island. */
export function poseGravity(yaw, pitch, roll, outG, outQ) {
  _e.set(pitch, 0, roll, 'XYZ');
  _tilt.setFromEuler(_e);
  _yawQ.setFromAxisAngle(_Y, yaw);
  _q.copy(_tilt).multiply(_yawQ);
  if (outQ) outQ.copy(_q);
  if (outG) outG.copy(_g.set(0, -GRAV, 0).applyQuaternion(_q.clone().invert()));
  return _q;
}

/**
 * Pitch and roll that make gravity pull toward a direction on the island.
 * dx/dz are island axes; they do not need to be normalised.
 */
export function tiltFor(yaw, dx, dz) {
  const len = Math.hypot(dx, dz) || 1;
  dx /= len;
  dz /= len;
  const smax = Math.sin(MAX_TILT);
  const sx = smax * dx;
  const sz = smax * dz;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const gtx = c * sx + s * sz;
  const gtz = -s * sx + c * sz;
  return {
    pitch: Math.asin(clamp(gtz, -1, 1)),
    roll: -Math.asin(clamp(gtx, -1, 1)),
  };
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
