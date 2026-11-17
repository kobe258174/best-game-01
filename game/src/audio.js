// Emberhold — sound: every effect and the music loop are synthesized with
// WebAudio, so the game ships no audio files and loads nothing over the network.

/** A tiny synth: oscillators, filtered noise and a two-bar bass pad loop. */
export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  /** Create the context on the first user gesture (browsers demand one). */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  /** One oscillator blip: frequency slides from `from` to `to`. */
  blip({ type = 'sine', from = 440, to = 440, dur = 0.08, vol = 0.2, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, from), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Filtered noise burst, for explosions and deaths. */
  noise({ dur = 0.15, vol = 0.25, freq = 1200, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
  }

  shoot(kind) {
    if (kind === 'spark') this.blip({ type: 'square', from: 880, to: 520, dur: 0.06, vol: 0.08 });
    else if (kind === 'frost') this.blip({ type: 'sine', from: 1320, to: 990, dur: 0.1, vol: 0.09 });
    else this.blip({ type: 'triangle', from: 220, to: 90, dur: 0.14, vol: 0.14 });
  }

  hit() {
    this.blip({ type: 'sine', from: 300, to: 180, dur: 0.05, vol: 0.06 });
  }

  die() {
    this.noise({ dur: 0.12, vol: 0.16, freq: 2400 });
    this.blip({ type: 'sine', from: 520, to: 130, dur: 0.14, vol: 0.1 });
  }

  coin() {
    this.blip({ type: 'sine', from: 990, to: 990, dur: 0.07, vol: 0.1 });
    this.blip({ type: 'sine', from: 1320, to: 1320, dur: 0.09, vol: 0.1, when: 0.06 });
  }

  leak() {
    this.blip({ type: 'sawtooth', from: 160, to: 55, dur: 0.35, vol: 0.22 });
    this.noise({ dur: 0.25, vol: 0.14, freq: 500 });
  }

  build() {
    this.blip({ type: 'triangle', from: 330, to: 660, dur: 0.12, vol: 0.14 });
    this.blip({ type: 'triangle', from: 495, to: 990, dur: 0.12, vol: 0.1, when: 0.08 });
  }

  upgrade() {
    [523, 659, 784].forEach((f, i) => this.blip({ type: 'triangle', from: f, to: f, dur: 0.1, vol: 0.12, when: i * 0.07 }));
  }

  horn() {
    this.blip({ type: 'sawtooth', from: 196, to: 196, dur: 0.28, vol: 0.12 });
    this.blip({ type: 'sawtooth', from: 294, to: 294, dur: 0.28, vol: 0.1, when: 0.02 });
  }

  victory() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.blip({ type: 'triangle', from: f, to: f, dur: 0.22, vol: 0.14, when: i * 0.11 }));
  }

  defeat() {
    [392, 330, 262, 196].forEach((f, i) => this.blip({ type: 'sine', from: f, to: f * 0.94, dur: 0.3, vol: 0.14, when: i * 0.16 }));
  }

  click() {
    this.blip({ type: 'sine', from: 700, to: 700, dur: 0.04, vol: 0.08 });
  }

  /** A slow two-bar loop: low root notes and a soft fifth, never in the way. */
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const roots = [110, 87.31, 130.81, 98];
    this.musicTimer = window.setInterval(() => {
      if (this.muted || !this.ctx) return;
      const root = roots[this.musicStep % roots.length];
      this.musicStep += 1;
      const t0 = this.ctx.currentTime;
      for (const [freq, dur] of [[root, 1.9], [root * 1.5, 1.9]]) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.linearRampToValueAtTime(0.5, t0 + 0.4);
        gain.gain.linearRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain).connect(this.musicGain);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
      }
    }, 2000);
  }

  stopMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
