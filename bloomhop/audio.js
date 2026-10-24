// Bloomhop audio: original Web Audio theme + SFX. Starts only after the first tap (iOS rule).
let ctx = null, master, musicBus, sfxBus, comp, noiseBuf;
let musicVol = 0.7, sfxVol = 0.8;
let playing = false, nextT = 0, step = 0, funky = false, tempo = 132, timer = null;
export const beat = { t0: 0, spb: 60 / 132, phase: 0 };

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    setVolumes(musicVol, sfxVol);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state !== 'running') ctx.resume();
}
export function setVolumes(m, s) {
  musicVol = m; sfxVol = s;
  if (musicBus) { musicBus.gain.setTargetAtTime(m * m * 0.55, ctx.currentTime, 0.05); sfxBus.gain.setTargetAtTime(s * s * 0.9, ctx.currentTime, 0.02); }
}
const N = n => 440 * Math.pow(2, (n - 69) / 12);

function tone(t, freq, dur, type, vol, bus, opt = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (opt.slide) o.frequency.exponentialRampToValueAtTime(opt.slide, t + dur);
  if (opt.detune) o.detune.value = opt.detune;
  let node = o;
  if (opt.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(opt.lp, t); f.Q.value = opt.q || 1;
    if (opt.wah) { f.frequency.setValueAtTime(opt.lp * 0.4, t); f.frequency.exponentialRampToValueAtTime(opt.lp * 2.5, t + dur * 0.5); f.frequency.exponentialRampToValueAtTime(opt.lp * 0.5, t + dur); }
    o.connect(f); node = f; }
  node.connect(g); g.connect(bus);
  const a = opt.a || 0.005;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(t, dur, vol, bus, hp = 1000, lp = 12000) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp;
  const g = ctx.createGain(); s.connect(f); f.connect(f2); f2.connect(g); g.connect(bus);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.start(t); s.stop(t + dur + 0.02);
}
function kick(t, v = 0.9) { tone(t, 150, 0.22, 'sine', v, musicBus, { slide: 42 }); }

// --- original theme "Sprout Meadow Romp" in F major, 16-step bars, 8-bar loop
const CH = [[53, 57, 60], [58, 62, 65], [60, 64, 67], [57, 60, 64], [50, 53, 57], [58, 62, 65], [55, 58, 62], [60, 64, 67]]; // F Bb C Am Dm Bb Gm C
const BASS = [41, 46, 48, 45, 38, 46, 43, 48];
const MEL = [
  [72, 0, 74, 0, 77, 0, 0, 74, 72, 0, 69, 0, 72, 0, 0, 0],
  [70, 0, 74, 0, 77, 0, 79, 0, 77, 0, 74, 0, 70, 0, 0, 0],
  [72, 0, 76, 0, 79, 0, 0, 76, 79, 0, 81, 0, 79, 0, 76, 0],
  [76, 0, 0, 72, 69, 0, 72, 0, 76, 0, 74, 0, 72, 0, 0, 0],
  [74, 0, 77, 0, 81, 0, 0, 77, 74, 0, 72, 0, 69, 0, 0, 0],
  [70, 0, 72, 0, 74, 0, 77, 0, 79, 0, 0, 77, 74, 0, 0, 0],
  [79, 0, 77, 0, 74, 0, 70, 0, 74, 0, 77, 0, 79, 0, 81, 0],
  [84, 0, 0, 0, 79, 0, 0, 0, 76, 0, 79, 0, 84, 0, 0, 0],
];
// funky "Dazzle" groove: syncopated slap bass + clavinet stabs + cowbell
const FBASS = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0];
const FOCT = [0, 0, 0, 12, 0, 0, 7, 0, 0, 0, 12, 0, 0, 10, 12, 0];
const FMEL = [
  [84, 0, 0, 82, 0, 81, 0, 79, 0, 0, 77, 0, 79, 0, 0, 0],
  [82, 0, 0, 81, 0, 79, 0, 77, 0, 74, 0, 0, 77, 0, 79, 0],
];

function schedule() {
  if (!playing) return;
  const spb = 60 / tempo, s16 = spb / 4;
  while (nextT < ctx.currentTime + 0.15) {
    const bar = Math.floor(step / 16) % 8, i = step % 16;
    let t = nextT;
    if (funky && i % 2 === 1) t += s16 * 0.18; // swing
    const ch = CH[bar];
    if (!funky) {
      if (i % 4 === 0) kick(t, i % 8 === 0 ? 0.8 : 0.5);
      if (i % 8 === 4) noise(t, 0.12, 0.28, musicBus, 1800);
      if (i % 2 === 0) noise(t, 0.03, 0.08, musicBus, 7000);
      if (i % 4 === 2 || i === 0) tone(t, N(BASS[bar]), s16 * 1.8, 'triangle', 0.45, musicBus);
      if (i === 0 || i === 6 || i === 10) ch.forEach(n => tone(t, N(n), s16 * 2.4, 'square', 0.045, musicBus, { lp: 2400 }));
      const m = MEL[bar][i]; if (m) { tone(t, N(m), s16 * 1.9, 'square', 0.09, musicBus, { lp: 3800, detune: 4 }); tone(t, N(m + 12), s16 * 1.2, 'sine', 0.05, musicBus); }
      if (i % 4 === 3) tone(t, N(ch[(i >> 2) % 3] + 24), 0.08, 'sine', 0.05, musicBus); // twinkle
    } else {
      if (i % 4 === 0) kick(t, 0.95); if (i === 7 || i === 14) kick(t, 0.5);
      if (i % 8 === 4) { noise(t, 0.16, 0.4, musicBus, 1500); tone(t, 220, 0.08, 'triangle', 0.15, musicBus, { slide: 160 }); }
      noise(t, i % 2 ? 0.03 : 0.07, i % 4 === 2 ? 0.16 : 0.07, musicBus, 8000);
      if (FBASS[i]) tone(t, N(BASS[bar] + FOCT[i]), s16 * 0.9, 'sawtooth', 0.32, musicBus, { lp: 700, q: 7, wah: true });
      if (i === 2 || i === 5 || i === 11) ch.forEach(n => tone(t, N(n + 12), s16 * 0.5, 'square', 0.05, musicBus, { lp: 3000, q: 4 }));
      if (i % 4 === 2) tone(t, 800, 0.06, 'square', 0.05, musicBus, { lp: 1600, q: 8 }); // cowbell-ish
      const m = FMEL[bar % 2][i]; if (m && bar % 4 < 3) tone(t, N(m - 12), s16 * 1.4, 'sawtooth', 0.06, musicBus, { lp: 2600, wah: true });
    }
    if (i === 0 && bar === 0) { beat.t0 = t; }
    nextT += s16; step++;
  }
}
export function startMusic() {
  if (!ctx || playing) return;
  playing = true; nextT = ctx.currentTime + 0.08; step = 0; beat.t0 = nextT;
  timer = setInterval(schedule, 25); schedule();
}
export function stopMusic() { playing = false; clearInterval(timer); }
export function setFunky(on) { funky = on; tempo = on ? 116 : 132; beat.spb = 60 / tempo; if (ctx) { step = Math.ceil(step / 16) * 16; } }
export function beatPhase() { if (!ctx || !playing) return 0; const spb = 60 / tempo; return ((ctx.currentTime - nextT) / spb % 1 + 1) % 1; }
export function now() { return ctx ? ctx.currentTime : 0; }

export function sfx(name, p = 0) {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime + 0.005, B = sfxBus;
  switch (name) {
    case 'jump': tone(t, 380, 0.16, 'square', 0.12, B, { slide: 760, lp: 3000 }); break;
    case 'bigjump': tone(t, 260, 0.2, 'square', 0.12, B, { slide: 620, lp: 2600 }); break;
    case 'coin': { const f = 1318 * Math.pow(2, Math.min(p, 8) / 24); tone(t, f, 0.07, 'square', 0.08, B); tone(t + 0.06, f * 1.335, 0.25, 'square', 0.08, B, { lp: 6000 }); break; }
    case 'stomp': tone(t, 220, 0.12, 'square', 0.16, B, { slide: 90, lp: 1500 }); noise(t, 0.08, 0.2, B, 600, 3000); tone(t + 0.05, 600 + p * 80, 0.1, 'sine', 0.12, B, { slide: 1200 + p * 160 }); break;
    case 'bump': tone(t, 140, 0.1, 'triangle', 0.25, B, { slide: 80 }); noise(t, 0.05, 0.12, B, 300, 2000); break;
    case 'sprout': [0, 4, 7, 12, 16].forEach((n, i) => tone(t + i * 0.05, N(72 + n), 0.12, 'triangle', 0.12, B)); break;
    case 'power': [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((n, i) => tone(t + i * 0.055, N(67 + n), 0.14, 'square', 0.07, B, { lp: 4000 })); break;
    case 'shrink': [12, 7, 4, 0, -5].forEach((n, i) => tone(t + i * 0.07, N(67 + n), 0.12, 'square', 0.08, B, { lp: 2500 })); break;
    case 'hurt': tone(t, 500, 0.4, 'sawtooth', 0.1, B, { slide: 120, lp: 1800 }); break;
    case 'fall': tone(t, 900, 0.9, 'triangle', 0.14, B, { slide: 110 }); break;
    case 'medal': [0, 7, 12, 16, 19, 24].forEach((n, i) => { tone(t + i * 0.07, N(76 + n), 0.5, 'sine', 0.1, B); tone(t + i * 0.07, N(64 + n), 0.3, 'triangle', 0.06, B); }); break;
    case 'wonder': for (let i = 0; i < 14; i++) tone(t + i * 0.045, N(72 + [0, 2, 4, 7, 9, 12, 14][i % 7] + (i > 6 ? 12 : 0)), 0.4, 'sine', 0.09, B); noise(t, 1.2, 0.08, B, 5000); break;
    case 'pipe': tone(t, 300, 0.35, 'square', 0.1, B, { slide: 70, lp: 1200 }); tone(t + 0.12, 260, 0.3, 'square', 0.08, B, { slide: 60, lp: 1200 }); break;
    case 'pole': tone(t, 400 + p * 900, 0.5, 'triangle', 0.15, B, { slide: 200 }); break;
    case 'goal': [0, 4, 7, 12, 11, 12, 16, 19, 24].forEach((n, i) => { tone(t + i * 0.11, N(65 + n), 0.3, 'square', 0.08, B, { lp: 4200 }); if (i % 3 === 0) tone(t + i * 0.11, N(41 + n), 0.3, 'triangle', 0.2, B); }); break;
    case 'land': noise(t, 0.05, 0.08 * p, B, 200, 1500); break;
    case 'blip': tone(t, 880, 0.05, 'square', 0.05, B, { lp: 3000 }); break;
    case 'moo': tone(t, 180 + Math.random() * 120, 0.3, 'sawtooth', 0.05, B, { lp: 900, slide: 140 }); break;
  }
}
