// Touch turns the diorama in quarter-steps and tilts it while a finger is down.
// A keyboard or a Bluetooth pad does the same thing for iPad and Apple TV.
import { MAX_TILT } from './pose.js';

const DEAD = 0.2;

export function createInput(canvas, bus) {
  let debugPad = null;
  const keys = new Set();
  let ptr = null;
  let prevButtons = [];

  function tiltFromKeys() {
    let x = 0, y = 0;
    if (keys.has('arrowright') || keys.has('d')) x += 1;
    if (keys.has('arrowleft') || keys.has('a')) x -= 1;
    if (keys.has('arrowup') || keys.has('w')) y += 1;
    if (keys.has('arrowdown') || keys.has('s')) y -= 1;
    if (!x && !y) return null;
    // Screen right lowers the right side. Screen up lowers the far side.
    return { roll: -x * MAX_TILT, pitch: y * MAX_TILT };
  }

  function onKey(e, down) {
    const k = e.key.toLowerCase();
    const play = bus.mode() === 'play';
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (down) {
      if (play && (k === 'q' || k === '[' || k === ',')) { bus.rotate(-1); return; }
      if (play && (k === 'e' || k === ']' || k === '.')) { bus.rotate(1); return; }
      if (k === 'escape' || k === 'p') { bus.pauseToggle(); return; }
      if (k === 'enter' && !play) { bus.confirm(); return; }
      if (k === ' ' && play) { bus.pauseToggle(); return; }
      if (k === ' ' && !play) { bus.confirm(); return; }
      keys.add(k);
      if (play) {
        const t = tiltFromKeys();
        if (t) bus.tilt(t.pitch, t.roll, true);
      }
    } else {
      keys.delete(k);
      if (play) {
        const t = tiltFromKeys();
        if (t) bus.tilt(t.pitch, t.roll, true);
        else bus.release();
      }
    }
  }

  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));
  window.addEventListener('blur', () => { keys.clear(); bus.release(); });

  function pointerDown(e) {
    if (e.target.closest('button, a, input, label, .panel')) return;
    if (bus.mode() !== 'play') return;
    canvas.setPointerCapture?.(e.pointerId);
    ptr = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      swiped: false,
      dragged: false,
    };
  }
  function pointerMove(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    const dx = e.clientX - ptr.x;
    const dy = e.clientY - ptr.y;
    const dt = performance.now() - ptr.t;
    if (!ptr.swiped && !ptr.dragged && dt < 260 && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      ptr.swiped = true;
      bus.rotate(dx > 0 ? 1 : -1);
      bus.release();
      return;
    }
    if (ptr.swiped) return;
    if (Math.hypot(dx, dy) > 8) {
      ptr.dragged = true;
      const roll = clamp(-dx * 0.0036, -MAX_TILT, MAX_TILT);
      const pitch = clamp(-dy * 0.0036, -MAX_TILT, MAX_TILT);
      bus.tilt(pitch, roll, true);
    }
  }
  function pointerUp(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    if (ptr.dragged && !ptr.swiped) bus.release();
    ptr = null;
  }

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  let stickHeld = false;

  function poll() {
    if (bus.mode() !== 'play') {
      stickHeld = false;
      pollMenu();
      return;
    }
    const pads = debugPad ? [debugPad] : (navigator.getGamepads ? navigator.getGamepads() : []);
    let used = false;
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes || [];
      const x = Math.abs(ax[0] || 0) > DEAD ? ax[0] : 0;
      const y = Math.abs(ax[1] || 0) > DEAD ? ax[1] : 0;
      if (x || y) {
        bus.tilt(y * MAX_TILT, -x * MAX_TILT, true);
        used = true;
        stickHeld = true;
      }
      const buttons = p.buttons || [];
      const pressed = (i) => !!(buttons[i] && buttons[i].pressed);
      const edge = (i) => pressed(i) && !prevButtons[i];
      if (edge(4) || edge(14)) bus.rotate(-1);
      if (edge(5) || edge(15)) bus.rotate(1);
      if (edge(9) || edge(8)) bus.pauseToggle();
      prevButtons = buttons.map(b => !!(b && b.pressed));
    }
    if (!used && stickHeld) {
      stickHeld = false;
      bus.release();
    }
  }

  function keysDown() {
    return keys.has('arrowup') || keys.has('arrowdown') || keys.has('arrowleft') || keys.has('arrowright')
      || keys.has('w') || keys.has('a') || keys.has('s') || keys.has('d');
  }

  function pollMenu() {
    const pads = debugPad ? [debugPad] : (navigator.getGamepads ? navigator.getGamepads() : []);
    for (const p of pads) {
      if (!p) continue;
      const buttons = p.buttons || [];
      const pressed = (i) => !!(buttons[i] && buttons[i].pressed);
      const edge = (i) => pressed(i) && !prevButtons[i];
      if (edge(0) || edge(9)) bus.confirm();
      if (edge(12) || edge(13)) bus.focusMove(edge(13) ? 1 : -1);
      prevButtons = buttons.map(b => !!(b && b.pressed));
    }
  }

  return {
    poll,
    setDebugPad(p) { debugPad = p; prevButtons = []; },
  };
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
