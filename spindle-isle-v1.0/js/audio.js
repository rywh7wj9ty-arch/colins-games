// Original little music-box score and effects. Everything goes through one
// master gain so mute is actually silent, not just a quiet slider.

const NOTES = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
const PATTERN = [0, 2, 4, 2, 5, 4, 7, 4, 2, 3, 4, 0, 5, 2, 4, 7];

export function createAudio() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let master, musicGain, sfxGain, pad, rollGain, rollFilter;
  let muted = false;
  let musicVol = 0.7;
  let sfxVol = 0.85;
  let timer = 0;
  let step = 0;
  let started = false;

  function ensure() {
    if (ctx) return;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = musicVol;
    musicGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = sfxVol;
    sfxGain.connect(master);

    const a = ctx.createOscillator();
    const b = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    a.type = 'sine';
    b.type = 'sine';
    a.frequency.value = 130.81;
    b.frequency.value = 196.0;
    const pa = ctx.createGain();
    const pb = ctx.createGain();
    pa.gain.value = 0.045;
    pb.gain.value = 0.03;
    a.connect(pa); b.connect(pb);
    pa.connect(f); pb.connect(f);
    f.connect(musicGain);
    a.start();
    b.start();
    pad = { a, b };

    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    rollFilter = ctx.createBiquadFilter();
    rollFilter.type = 'bandpass';
    rollFilter.frequency.value = 280;
    rollFilter.Q.value = 0.7;
    rollGain = ctx.createGain();
    rollGain.gain.value = 0;
    src.connect(rollFilter);
    rollFilter.connect(rollGain);
    rollGain.connect(sfxGain);
    src.start();
    applyMute();
  }

  function applyMute() {
    if (!master) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.value = muted ? 0 : 1;
  }

  function setMusic(v) {
    musicVol = Math.max(0, Math.min(1, v));
    if (musicGain) musicGain.gain.setValueAtTime(musicVol, ctx.currentTime);
  }
  function setSfx(v) {
    sfxVol = Math.max(0, Math.min(1, v));
    if (sfxGain) sfxGain.gain.setValueAtTime(sfxVol, ctx.currentTime);
  }
  function setMuted(v) {
    muted = !!v;
    applyMute();
  }

  async function unlock() {
    ensure();
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (e) { /* ignore */ }
    }
    started = true;
  }

  function tone(freq, dur, type, gain, bus, slide) {
    if (!ctx || !started) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(bus || sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function pluck(freq) {
    if (!ctx || !started || musicVol <= 0.001) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1800, t);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.6);
    o.type = 'triangle';
    o2.type = 'sine';
    o.frequency.value = freq;
    o2.frequency.value = freq * 2.01;
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);
    g.connect(f);
    f.connect(musicGain);
    o.start(t); o2.start(t);
    o.stop(t + 1); o2.stop(t + 1);
  }

  function update(dt) {
    if (!ctx || !started) return;
    timer += dt;
    if (timer > 0.52) {
      timer = 0;
      pluck(NOTES[PATTERN[step % PATTERN.length]]);
      step++;
    }
  }

  function roll(speed) {
    if (!rollGain || !ctx) return;
    const target = Math.max(0, Math.min(0.18, (speed - 0.25) * 0.045));
    rollGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
    if (rollFilter) rollFilter.frequency.setTargetAtTime(180 + speed * 90, ctx.currentTime, 0.1);
  }

  return {
    unlock, update, setMusic, setSfx, setMuted, roll,
    get muted() { return muted; },
    levels() {
      return {
        muted,
        music: musicVol,
        sfx: sfxVol,
        master: muted ? 0 : (master ? master.gain.value : 1),
      };
    },
    ui() { tone(660, 0.08, 'sine', 0.05); },
    click() { tone(520, 0.09, 'triangle', 0.07); tone(780, 0.12, 'sine', 0.04); },
    seed() {
      tone(880, 0.12, 'sine', 0.07);
      tone(1174, 0.18, 'sine', 0.05);
      tone(1568, 0.26, 'triangle', 0.035);
    },
    blossom() { tone(640, 0.2, 'sine', 0.05); },
    water() { tone(420, 0.15, 'sine', 0.03, null, 0.7); },
    wind() { tone(360, 0.4, 'triangle', 0.04, null, 1.4); },
    fall() { tone(300, 0.35, 'sine', 0.06, null, 0.45); },
    bloom() {
      [523, 659, 784, 1046].forEach((f, i) => {
        setTimeout(() => tone(f, 0.7, 'sine', 0.06), i * 90);
      });
    },
  };
}
