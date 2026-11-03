// Web Audio: metronome clicks, a simple plucked-guitar synth, and a playback scheduler.

import { midiOf, freqOf } from './theory.js';

export class AudioEngine {
  ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.metGain = this.ctx.createGain();
      this.metGain.connect(this.master);
      this.gtrGain = this.ctx.createGain();
      this.buildAmp();
      this.setTone(this.tone || 'acoustic');
      this.applyLevels();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  // Amp chain for the distorted tone: pre-gain → waveshaper → cabinet EQ.
  buildAmp() {
    const ctx = this.ctx;
    this.cleanOut = ctx.createGain();
    this.cleanOut.connect(this.master);
    this.drive = ctx.createGain();
    this.drive.gain.value = 9;
    this.shaper = ctx.createWaveShaper();
    const n = 2048;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 3.2) * 0.9;
    }
    this.shaper.curve = curve;
    this.shaper.oversample = '4x';
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 90;
    const mid = ctx.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 800;
    mid.gain.value = 3;
    mid.Q.value = 0.8;
    const cab = ctx.createBiquadFilter();
    cab.type = 'lowpass';
    cab.frequency.value = 4200;
    cab.Q.value = 0.7;
    const out = ctx.createGain();
    out.gain.value = 0.32;
    this.drive.connect(this.shaper).connect(hp).connect(mid).connect(cab).connect(out).connect(this.master);
  }

  // tone: 'acoustic' | 'clean' | 'dist'
  setTone(tone) {
    this.tone = tone;
    if (!this.ctx) return;
    this.gtrGain.disconnect();
    this.gtrGain.connect(tone === 'dist' ? this.drive : this.cleanOut);
  }

  setLevels({ metOn, metVol, gtrOn }) {
    Object.assign(this, { metOn, metVol, gtrOn });
    this.applyLevels();
  }

  applyLevels() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.metGain.gain.setTargetAtTime(this.metOn ? this.metVol : 0, t, 0.01);
    this.gtrGain.gain.setTargetAtTime(this.gtrOn ? 0.8 : 0, t, 0.01);
  }

  click(time, accent, dest) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = accent ? 1760 : 1100;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    o.connect(g).connect(dest);
    o.start(time);
    o.stop(time + 0.06);
  }

  pluck(midi, time, seconds, dest) {
    if (this.tone === 'clean' || this.tone === 'dist') return this.pluckElectric(midi, time, seconds, dest);
    const ctx = this.ctx;
    const f = freqOf(midi);
    const decay = seconds <= 0.18 ? 0.22 : Math.min(Math.max(seconds + 0.25, 0.5), 2.6);
    const o1 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = f * 2;
    const o2g = ctx.createGain();
    o2g.gain.value = 0.3;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.Q.value = 0.8;
    filt.frequency.setValueAtTime(Math.min(6000, f * 9), time);
    filt.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.6), time + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.22, time + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    o1.connect(filt);
    o2.connect(o2g).connect(filt);
    filt.connect(g).connect(dest);
    o1.start(time);
    o2.start(time);
    o1.stop(time + decay + 0.05);
    o2.stop(time + decay + 0.05);
  }

  // Electric: brighter, longer sustain, two slightly detuned oscillators (pickup + chorus feel).
  pluckElectric(midi, time, seconds, dest) {
    const ctx = this.ctx;
    const f = freqOf(midi);
    const dist = this.tone === 'dist';
    const short = seconds <= 0.18;
    const decay = short ? 0.2 : Math.min(Math.max(seconds + 0.15, 0.4), dist ? 3.5 : 3);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.Q.value = dist ? 0.7 : 1.4;
    filt.frequency.setValueAtTime(Math.min(dist ? 5000 : 7000, f * 12), time);
    filt.frequency.exponentialRampToValueAtTime(Math.max(dist ? 900 : 500, f * (dist ? 4 : 2.5)), time + (short ? 0.08 : 0.6));
    const g = ctx.createGain();
    const peak = dist ? 0.12 : 0.16;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + 0.003);
    g.gain.exponentialRampToValueAtTime(peak * (dist ? 0.7 : 0.45), time + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    const oscs = [
      ['sawtooth', f, 0, 1],
      ['square', f, 6, 0.35],
      ['sawtooth', f * 2, -5, 0.15],
    ];
    oscs.forEach(([type, freq, detune, level]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      const og = ctx.createGain();
      og.gain.value = level;
      o.connect(og).connect(filt);
      o.start(time);
      o.stop(time + decay + 0.05);
    });
    filt.connect(g).connect(dest);
  }

  // Dead / muted note (✕): short percussive scratch, no pitch.
  deadNote(time, dest) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * 0.05);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.value = 0.35;
    src.connect(bp).connect(g).connect(dest);
    src.start(time);
  }

  // Sound one tab event (single note or strummed chord) at `time`.
  playEvent(ev, time, seconds, dest = this.gtrGain) {
    if (!ev || ev.rest || ev.tie) return;
    if (ev.pm) seconds = Math.min(seconds, 0.18); // palm mute: short, damped
    const notes = [...ev.notes].sort((a, b) => (ev.pick === 'u' ? a.s - b.s : b.s - a.s));
    notes.forEach((n, k) => {
      const t = time + (ev.strum ? k * 0.014 : 0);
      if (n.dead || ev.dead) this.deadNote(t, dest);
      else this.pluck(midiOf(n.s, n.f), t, seconds, dest);
    });
  }

  // Preview a single event right now (used when stepping through notes).
  preview(ev, seconds = 0.8) {
    this.ensure();
    this.playEvent(ev, this.ctx.currentTime + 0.01, seconds);
  }
}

export class Player {
  constructor(engine, { onStep, onCount, onStop } = {}) {
    this.engine = engine;
    this.onStep = onStep;
    this.onCount = onCount;
    this.onStop = onStop;
    this.bpm = 60;
    this.countIn = true;
    this.loop = true;
    this.playing = false;
    this.timers = [];
  }

  load(timeline) {
    this.stop();
    this.timeline = timeline;
  }

  // seconds per quarter note; bpm counts the meter's beat unit (quarters in 4/4 and 3/4, eighths in 6/8)
  get spq() {
    const den = this.timeline.meter[1];
    return (60 * den) / (4 * this.bpm);
  }

  get clickUnit() {
    return 4 / this.timeline.meter[1];
  }

  play(fromIndex = 0) {
    if (!this.timeline) return;
    const ctx = this.engine.ensure();
    this.stop(false);
    this.playing = true;
    this.metBus = ctx.createGain();
    this.metBus.connect(this.engine.metGain);
    this.gtrBus = ctx.createGain();
    this.gtrBus.connect(this.engine.gtrGain);

    let t = ctx.currentTime + 0.15;
    if (this.countIn) {
      const clicks = Math.round(this.timeline.barLen / this.clickUnit);
      const step = this.clickUnit * this.spq;
      for (let k = 0; k < clicks; k++) {
        this.engine.click(t + k * step, k === 0, this.metBus);
        this.at(t + k * step, () => this.onCount?.(k + 1, clicks));
      }
      t += clicks * step;
      this.at(t, () => this.onCount?.(0, clicks));
    }
    this.schedulePass(t, fromIndex);
  }

  schedulePass(t0, fromIndex) {
    const { events, bars, total } = this.timeline;
    const spq = this.spq;
    const offset = events[fromIndex]?.start || 0;
    // metronome
    bars.forEach((b) => {
      const n = Math.round(b.length / this.clickUnit);
      for (let k = 0; k < n; k++) {
        const beat = b.start + k * this.clickUnit;
        if (beat < offset - 1e-6) continue;
        this.engine.click(t0 + (beat - offset) * spq, b.full && k === 0, this.metBus);
      }
    });
    // notes
    for (let i = fromIndex; i < events.length; i++) {
      const ev = events[i];
      const time = t0 + (ev.start - offset) * spq;
      const secs = ev.beats * spq;
      this.engine.playEvent(ev, time, secs, this.gtrBus);
      this.at(time, () => this.onStep?.(i, secs * 1000));
    }
    const end = t0 + (total - offset) * spq;
    this.at(end, () => {
      if (this.loop) this.schedulePass(this.engine.ctx.currentTime + 0.02, 0);
      else this.stop();
    });
  }

  at(time, fn) {
    const ms = (time - this.engine.ctx.currentTime) * 1000;
    this.timers.push(setTimeout(fn, Math.max(0, ms)));
  }

  stop(notify = true) {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    [this.metBus, this.gtrBus].forEach((b) => b?.disconnect());
    this.metBus = this.gtrBus = null;
    const was = this.playing;
    this.playing = false;
    if (notify && was) this.onStop?.();
  }
}
