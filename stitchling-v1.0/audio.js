// Stitchling audio: a jaunty handmade band (ukulele plucks, glockenspiel, kazoo-ish lead, upright bass, brushes) + SFX. All WebAudio, no files.
export class Audio {
  constructor() { this.ctx = null; this.music = 0.7; this.sfx = 0.8; this.playing = false; this.step = 0; this.nextT = 0; this.intensity = 0; }
  init() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = this.ctx = new C();
    this.master = c.createGain(); this.master.connect(c.destination);
    this.comp = c.createDynamicsCompressor(); this.comp.connect(this.master);
    this.mg = c.createGain(); this.mg.connect(this.comp); this.sg = c.createGain(); this.sg.connect(this.comp);
    // small room reverb for warmth
    const len = c.sampleRate * 1.2, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    this.rev = c.createConvolver(); this.rev.buffer = ir; const rg = c.createGain(); rg.gain.value = 0.22; this.rev.connect(rg); rg.connect(this.comp);
    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate); const nd = this.noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.setVol(this.music, this.sfx);
    const unlock = () => { if (c.state !== 'running') c.resume(); };
    ['touchstart', 'touchend', 'mousedown', 'keydown'].forEach(e => window.addEventListener(e, unlock, { passive: true }));
    document.addEventListener('visibilitychange', () => { if (document.hidden) c.suspend(); else c.resume(); });
  }
  setVol(m, s) { this.music = m; this.sfx = s; if (!this.ctx) return; const t = this.ctx.currentTime; this.mg.gain.setTargetAtTime(m * m * 0.55, t, 0.05); this.sg.gain.setTargetAtTime(s * s * 0.9, t, 0.05); }
  tone(type, f, t, dur, vol, dest, o = {}) {
    const c = this.ctx, os = c.createOscillator(), g = c.createGain();
    os.type = type; os.frequency.setValueAtTime(f, t); if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || dur));
    if (o.det) os.detune.value = o.det;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (o.a || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = os; if (o.lp) { const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; os.connect(f2); n = f2; }
    n.connect(g); g.connect(dest); if (o.rev) g.connect(this.rev); os.start(t); os.stop(t + dur + 0.05);
  }
  nz(t, dur, vol, dest, freq = 3000, type = 'bandpass', q = 1) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  start() { this.init(); if (!this.ctx) return; this.playing = true; this.nextT = this.ctx.currentTime + 0.1; this.step = 0; }
  stop() { this.playing = false; }
  // called every frame
  tick() {
    if (!this.ctx || !this.playing) return;
    const c = this.ctx, spb = 60 / 132 / 2; // eighth notes at 132 bpm
    while (this.nextT < c.currentTime + 0.12) { this.playStep(this.step, this.nextT, spb); this.step++; this.nextT += spb; }
  }
  playStep(i, t, spb) {
    const m = this.mg, bar = Math.floor(i / 8) % 16, s = i % 8;
    // I - vi - IV - V in C, with a bridge
    const prog = [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14], [0, 4, 7], [9, 12, 16], [2, 5, 9], [7, 11, 14],
                  [5, 9, 12], [4, 7, 11], [9, 12, 16], [2, 6, 9], [5, 9, 12], [7, 11, 14], [0, 4, 7], [7, 11, 14]][bar];
    const root = 130.81, hz = n => root * Math.pow(2, n / 12);
    const sw = (s % 2) ? spb * 0.18 : 0; t += sw; // swing
    // bass: root / fifth walking
    if (s % 2 === 0) { const bn = [prog[0], prog[0] + 7, prog[0] + 12, prog[0] + 7][s / 2] - 12; this.tone('triangle', hz(bn), t, spb * 1.6, 0.32, m, { lp: 600 }); }
    // ukulele strum on 2 & 4 offbeats plus chop
    if (s === 2 || s === 6 || s === 3 || s === 7) prog.forEach((n, k) => this.tone('square', hz(n + 12), t + k * 0.012, spb * 0.9, 0.035, m, { lp: 2200 }));
    // brushes / clap
    this.nz(t, 0.05, s % 2 ? 0.05 : 0.09, m, 6000, 'highpass');
    if (s === 0 || s === 4) this.tone('sine', 120, t, 0.18, 0.35, m, { to: 50 });
    if (s === 2 || s === 6) this.nz(t, 0.12, 0.16, m, 1800, 'bandpass', 0.8);
    // melody: glockenspiel motif (deterministic pattern per bar)
    const mel = [[12, null, 16, 19, 21, null, 19, 16], [21, null, 19, 16, 12, null, 14, 16], [17, null, 21, 24, 21, 19, 17, null], [19, null, 17, 14, 11, 14, 19, null]][bar % 4];
    const note = mel[s];
    if (note != null && (bar < 12 || this.intensity > 0)) {
      const n2 = note + (bar >= 8 && bar < 12 ? 5 : 0);
      this.tone('sine', hz(n2 + 12), t, 0.5, 0.11, m, { rev: 1 });
      this.tone('sine', hz(n2 + 24) * 1.003, t, 0.25, 0.03, m);
      if (bar >= 4) this.tone('sawtooth', hz(n2), t, spb * 0.9, 0.035, m, { lp: 1400, a: 0.03 }); // kazoo-ish double
    }
  }
  // ---- SFX
  play(name, p = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + 0.005, g = this.sg;
    switch (name) {
      case 'pop': { const f = 700 * Math.pow(2, Math.min(p, 24) / 24); this.tone('sine', f, t, 0.09, 0.3, g, { to: f * 1.9, glide: 0.05 }); this.nz(t, 0.03, 0.12, g, 5000); this.tone('sine', f * 2, t + 0.03, 0.12, 0.06, g, { rev: 1 }); break; }
      case 'jump': this.tone('sine', 260, t, 0.16, 0.22, g, { to: 520, glide: 0.12 }); this.nz(t, 0.06, 0.06, g, 1200); break;
      case 'land': this.nz(t, 0.08, 0.12, g, 400, 'lowpass'); break;
      case 'slide': this.nz(t, 0.35, 0.12, g, 2400, 'bandpass', 0.6); break;
      case 'spring': this.tone('triangle', 180, t, 0.5, 0.32, g, { to: 720, glide: 0.25 }); this.tone('sine', 360, t, 0.45, 0.12, g, { to: 900, glide: 0.3, det: 15 }); break;
      case 'sponge': this.tone('sine', 140, t, 0.3, 0.3, g, { to: 330, glide: 0.2 }); this.nz(t, 0.1, 0.08, g, 700, 'lowpass'); break;
      case 'creak': this.tone('sawtooth', 90, t, 0.35, 0.06, g, { to: 70, lp: 500 }); this.nz(t, 0.2, 0.06, g, 900); break;
      case 'bonk': this.tone('square', 150, t, 0.12, 0.12, g, { to: 90, lp: 800 }); break;
      case 'die': this.tone('triangle', 520, t, 0.5, 0.22, g, { to: 120, glide: 0.45 }); this.nz(t, 0.3, 0.1, g, 2500); break;
      case 'respawn': [0, 4, 7, 12].forEach((n, k) => this.tone('sine', 523 * Math.pow(2, n / 12), t + k * 0.06, 0.3, 0.12, g, { rev: 1 })); break;
      case 'prize': [0, 4, 7, 12, 16, 19, 24].forEach((n, k) => { this.tone('sine', 523 * Math.pow(2, n / 12), t + k * 0.07, 0.5, 0.16, g, { rev: 1 }); this.tone('triangle', 261 * Math.pow(2, n / 12), t + k * 0.07, 0.3, 0.06, g); }); break;
      case 'cp': [7, 12, 16].forEach((n, k) => this.tone('sine', 392 * Math.pow(2, n / 12), t + k * 0.09, 0.6, 0.16, g, { rev: 1 })); this.nz(t, 0.4, 0.05, g, 8000, 'highpass'); break;
      case 'mult': this.tone('sine', 880 * Math.pow(2, p / 6), t, 0.25, 0.15, g, { rev: 1 }); this.tone('sine', 1320 * Math.pow(2, p / 6), t + 0.06, 0.25, 0.1, g); break;
      case 'finish': [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((n, k) => this.tone(k % 2 ? 'triangle' : 'sine', 392 * Math.pow(2, n / 12), t + k * 0.1, 0.6, 0.17, g, { rev: 1 })); for (let k = 0; k < 6; k++) this.nz(t + k * 0.12, 0.15, 0.08, g, 7000, 'highpass'); break;
      case 'click': this.tone('sine', 900, t, 0.05, 0.1, g); break;
      case 'tick': this.tone('sine', 1200 + p * 40, t, 0.06, 0.09, g); break;
      case 'medal': [0, 7, 12, 19].forEach((n, k) => this.tone('sine', 523 * Math.pow(2, (n + p * 2) / 12), t + k * 0.05, 0.8, 0.14, g, { rev: 1 })); break;
    }
  }
}
