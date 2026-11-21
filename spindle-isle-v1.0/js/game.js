import * as THREE from '../vendor/three.module.js';
import { createView } from './render.js';
import { createSim } from './sim.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { poseGravity, tiltFor } from './pose.js';
import { LEVEL } from './level.js';

const STORE = 'spindle-isle-settings';
const canvas = document.getElementById('view');
const $ = (id) => document.getElementById(id);
const gvec = new THREE.Vector3();

const audio = createAudio();
const view = createView(canvas);
const sim = createSim(LEVEL);

let mode = 'title';
let turns = 0;
let yaw = 0;
let pitch = 0;
let roll = 0;
let pitchTarget = 0;
let rollTarget = 0;
let turning = null;
let time = 0;
let bright = 1;
let stuckFor = 0;
let lastSpot = { x: 0, y: 0, z: 0 };
let lastSeeds = 0;
let lastCp = 0;
let bloomPlayed = false;
let hint = '';

function applyGravity(y, p, r) {
  poseGravity(y, p, r, gvec, null);
  sim.setGravity(gvec.x, gvec.y, gvec.z);
}

const input = createInput(canvas, {
  mode: () => mode,
  tilt(p, r) {
    if (mode !== 'play' || turning) return;
    pitchTarget = p;
    rollTarget = r;
  },
  release() { pitchTarget = 0; rollTarget = 0; },
  rotate(dir) { rotate(dir); },
  pauseToggle() {
    if (mode === 'play') openPause();
    else if (mode === 'pause') resume();
  },
  confirm() {
    const active = document.activeElement;
    if (active && active.tagName === 'BUTTON' && active.offsetParent) { active.click(); return; }
    document.querySelector('.panel-wrap:not(.hidden) .primary')?.click();
  },
  focusMove(dir) {
    const buttons = [...document.querySelectorAll('.panel-wrap:not(.hidden) button')];
    if (!buttons.length) return;
    let i = buttons.indexOf(document.activeElement);
    i = (i < 0 ? 0 : i + dir + buttons.length) % buttons.length;
    buttons[i].focus();
  },
});

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || '{}');
    if (typeof s.music === 'number') audio.setMusic(s.music);
    if (typeof s.sfx === 'number') audio.setSfx(s.sfx);
    if (typeof s.bright === 'number') bright = s.bright;
    if (s.muted) audio.setMuted(true);
  } catch (e) { /* defaults */ }
  $('music').value = Math.round(audio.levels().music * 100);
  $('sfx').value = Math.round(audio.levels().sfx * 100);
  $('bright').value = Math.round(bright * 100);
  $('mute').checked = audio.muted;
  applyBright();
}
function saveSettings() {
  localStorage.setItem(STORE, JSON.stringify({
    music: audio.levels().music, sfx: audio.levels().sfx, bright, muted: audio.muted,
  }));
}
function applyBright() {
  canvas.style.filter = Math.abs(bright - 1) < 0.015 ? '' : `brightness(${bright})`;
}

function setMode(next) {
  mode = next;
  for (const id of ['title', 'pause', 'settings', 'complete', 'fall']) {
    $(id).classList.toggle('hidden', id !== next);
  }
  $('btn-pause').classList.toggle('hidden', next !== 'play');
  $('hint').classList.toggle('hidden', next !== 'play');
  $('seeds-hud').classList.toggle('hidden', next !== 'play');
  if (next === 'title') $('btn-play').focus();
}

function rotate(dir) {
  if (mode !== 'play' || turning || sim.won || sim.fallen) return;
  audio.click();
  pitch = roll = pitchTarget = rollTarget = 0;
  turns += dir;
  turning = { from: yaw, to: turns * Math.PI / 2, t: 0 };
}

function begin() {
  audio.unlock();
  audio.ui();
  sim.reset();
  view.resetSeeds();
  turns = 0;
  yaw = pitch = roll = pitchTarget = rollTarget = 0;
  turning = null;
  time = 0;
  stuckFor = 0;
  lastSeeds = 0;
  lastCp = 0;
  bloomPlayed = false;
  const s = sim.state();
  lastSpot = { x: s.x, y: s.y, z: s.z };
  $('stuck').classList.add('hidden');
  setMode('play');
}

function openPause() {
  if (mode !== 'play') return;
  audio.ui();
  setMode('pause');
}
function resume() { audio.ui(); setMode('play'); }
function openSettings(from) {
  audio.ui();
  $('settings').dataset.from = from;
  setMode('settings');
}
function closeSettings() {
  audio.ui();
  const from = $('settings').dataset.from || 'title';
  setMode(from === 'pause' ? 'pause' : 'title');
}
function restore() {
  const snap = sim.state().snap;
  sim.restore();
  if (snap) {
    turns = snap.turns;
    yaw = turns * Math.PI / 2;
    sim.setTurns(turns);
    sim.setYawIndex(((turns % 4) + 4) % 4);
  }
  pitch = roll = pitchTarget = rollTarget = 0;
  turning = null;
  stuckFor = 0;
  $('stuck').classList.add('hidden');
  setMode('play');
}

function fmt(t) {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function updateHud(state) {
  $('seeds-hud').innerHTML = LEVEL.seeds.map(seed => `<i class="${state.seeds.includes(seed.id) ? 'on' : ''}"></i>`).join('');
  let next = '';
  if (state.checkpoint <= 0 && state.z < -2.2) next = 'Drag to tilt the isle. Pip rolls downhill.';
  else if (state.checkpoint <= 0) next = 'The plank tips once Pip crosses the middle.';
  else if (!state.bridge && state.checkpoint === 1) next = 'Swipe sideways to turn the isle.';
  else if (state.checkpoint === 2 && state.yawIndex <= 1) next = 'Turn the isle and the water takes a new path.';
  else if (state.checkpoint === 3 && state.yawIndex === 2) next = 'Turn until the sails catch the wind, then tilt Pip into the gust.';
  else if (state.checkpoint >= 4 && !state.won) next = 'Tilt toward the sleeping flower.';
  if (next !== hint) {
    hint = next;
    const el = $('hint');
    el.textContent = next;
    el.classList.toggle('show', !!next);
  }
}

function titlePose(now) {
  const s = LEVEL.spawn;
  return {
    x: s.x, y: s.y + Math.sin(now / 700) * 0.05, z: s.z,
    vx: 0, vy: 0, vz: 0, onGround: true,
    seeAngle: LEVEL.seesaw.rest, yawIndex: 0, windCharge: 0.25,
    bridge: false, seeds: [], won: false,
  };
}

let last = performance.now();
let simAcc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000 || 0.016);
  last = now;
  input.poll();

  if (mode === 'title') {
    yaw = Math.sin(now / 1000 * 0.35) * 0.22;
    pitch = Math.sin(now / 1000 * 0.5) * 0.03;
    roll = Math.cos(now / 1000 * 0.4) * 0.04;
  } else if (turning) {
    turning.t += dt;
    const u = Math.min(1, turning.t / 0.62);
    const e = u * u * (3 - 2 * u);
    yaw = turning.from + (turning.to - turning.from) * e;
    pitch = roll = 0;
    if (u >= 1) {
      yaw = turning.to;
      turning = null;
      sim.setTurns(turns);
      sim.setYawIndex(((turns % 4) + 4) % 4);
    }
  } else if (mode === 'play') {
    const back = pitchTarget === 0 && rollTarget === 0;
    const k = 1 - Math.exp(dt * (back ? -3.5 : -12));
    pitch += (pitchTarget - pitch) * k;
    roll += (rollTarget - roll) * k;
  }

  let state = sim.state();
  if (mode === 'play') {
    applyGravity(yaw, pitch, roll);
    if (!state.won && !state.fallen) {
      simAcc += dt;
      let steps = 0;
      while (simAcc >= 1 / 60 && steps < 4) {
        sim.step(1 / 60);
        simAcc -= 1 / 60;
        steps++;
      }
      if (simAcc > 0.05) simAcc = 0;
      time += dt;
    }
    state = sim.state();
    if (state.seeds.length > lastSeeds) { audio.seed(); lastSeeds = state.seeds.length; }
    if (state.checkpoint > lastCp) { audio.blossom(); lastCp = state.checkpoint; }
    const moved = Math.hypot(state.x - lastSpot.x, state.z - lastSpot.z);
    const trying = Math.abs(pitchTarget) + Math.abs(rollTarget) > 0.12;
    if (moved > 0.2) {
      lastSpot = { x: state.x, y: state.y, z: state.z };
      stuckFor = 0;
      $('stuck').classList.add('hidden');
    } else if (trying) stuckFor += dt;
    else stuckFor = Math.max(0, stuckFor - dt * 0.5);
    if (stuckFor > 6.5 && !state.won && !state.fallen) $('stuck').classList.remove('hidden');
    if (state.fallen) { audio.fall(); setMode('fall'); }
    updateHud(state);
    audio.roll(Math.hypot(state.vx, state.vz));
    if (state.won && !bloomPlayed) { bloomPlayed = true; audio.bloom(); }
    if (state.won && view.bloom >= 1) {
      $('res-seeds').textContent = `${state.seeds.length} / ${state.seedTotal} seeds`;
      $('res-time').textContent = fmt(time);
      setMode('complete');
    }
  } else {
    audio.roll(0);
  }

  audio.update(mode === 'title' || mode === 'play' || mode === 'pause' || mode === 'complete' ? dt : 0);
  const pose = mode === 'title'
    ? { yaw, pitch, roll }
    : { yaw, pitch: mode === 'play' ? pitch : 0, roll: mode === 'play' ? roll : 0 };
  view.update(dt, mode === 'title' ? titlePose(now) : state, pose, { title: mode === 'title' });
  requestAnimationFrame(frame);
}

$('btn-play').addEventListener('click', begin);
$('btn-settings').addEventListener('click', () => openSettings('title'));
$('btn-pause').addEventListener('click', openPause);
$('pause-resume').addEventListener('click', resume);
$('pause-settings').addEventListener('click', () => openSettings('pause'));
$('pause-blossom').addEventListener('click', restore);
$('pause-restart').addEventListener('click', begin);
$('pause-title').addEventListener('click', () => { audio.ui(); setMode('title'); });
$('settings-back').addEventListener('click', closeSettings);
$('fall-back').addEventListener('click', restore);
$('stuck-back').addEventListener('click', restore);
$('res-again').addEventListener('click', begin);
$('res-title').addEventListener('click', () => setMode('title'));
$('a2hs-ok').addEventListener('click', () => $('a2hs').classList.add('hidden'));

$('music').addEventListener('input', () => { audio.unlock(); audio.setMusic(+$('music').value / 100); saveSettings(); });
$('sfx').addEventListener('input', () => { audio.unlock(); audio.setSfx(+$('sfx').value / 100); audio.ui(); saveSettings(); });
$('bright').addEventListener('input', () => { bright = +$('bright').value / 100; applyBright(); saveSettings(); });
$('mute').addEventListener('change', () => { audio.unlock(); audio.setMuted($('mute').checked); saveSettings(); });
window.addEventListener('pointerdown', () => { audio.unlock(); }, { once: false });

function maybeA2hs() {
  const ua = navigator.userAgent;
  const safari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Android/i.test(ua);
  const standalone = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  if (safari && !standalone) $('a2hs').classList.remove('hidden');
}

loadSettings();
maybeA2hs();
setMode('title');
$('loading').classList.add('hidden');
window.__spindleBooted = true;

if ('serviceWorker' in navigator) {
  const registerSW = () => navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
  if (document.readyState === 'complete') registerSW();
  else window.addEventListener('load', registerSW);
}

window.__spindle = {
  get ready() { return true; },
  get mode() { return mode; },
  get state() {
    return { ...sim.state(), mode, time, yaw, pitch, roll, turns, bloom: view.bloom, tier: view.tier };
  },
  play: begin,
  tiltLocal(dx, dz) {
    if (turning) return;
    const t = tiltFor(yaw, dx, dz);
    pitchTarget = t.pitch;
    rollTarget = t.roll;
  },
  release() { pitchTarget = 0; rollTarget = 0; },
  rotate,
  pause: openPause,
  resume,
  openSettings: () => openSettings(mode === 'pause' ? 'pause' : 'title'),
  closeSettings,
  restore,
  audio: () => audio.levels(),
  setMuted(v) { audio.setMuted(v); $('mute').checked = !!v; saveSettings(); },
  setMusic(v) { audio.setMusic(v); $('music').value = Math.round(v * 100); saveSettings(); },
  setSfx(v) { audio.setSfx(v); $('sfx').value = Math.round(v * 100); saveSettings(); },
  setBright(v) { bright = v; $('bright').value = Math.round(v * 100); applyBright(); saveSettings(); },
  lockTier: (i) => view.lockTier(i),
  setDebugPad: (p) => input.setDebugPad(p),
};

requestAnimationFrame(frame);
