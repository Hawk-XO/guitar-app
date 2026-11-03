// Web Audio: metronome clicks, a simple plucked-guitar synth, and a playback scheduler.

import { midiOf, freqOf } from './theory.js';

// Plays real recorded guitar notes (FluidR3 GM soundfont, CC BY 3.0 — see assets/sounds/CREDITS.md).
// One MP3 per note from E2 (midi 40) to E6 (midi 88); a set is downloaded the first time it's used.
const SAMPLE_SETS = { 'sample-acoustic': 'acoustic', 'sample-clean': 'clean', 'sample-dist': 'dist' };
const SAMPLE_GAIN = { acoustic: 1.1, clean: 1.0, dist: 0.55, muted: 1.0 };

export class Sampler {
  constructor(ctx) {
    this.ctx = ctx;
    this.sets = {}; // name -> Map(midi -> AudioBuffer)
    this.loading = {};
  }

  isSampleTone(tone) {
    return tone in SAMPLE_SETS;
  }

  setFor(tone) {
    return SAMPLE_SETS[tone] || null;
  }

  has(set) {
    return !!this.sets[set];
  }

  loadFor(tone) {
    return Promise.all([this.load(SAMPLE_SETS[tone]), this.load('muted')]);
  }

  load(set) {
    if (this.sets[set]) return Promise.resolve();
    if (!this.loading[set]) {
      const base = new URL(`../assets/sounds/${set}/`, import.meta.url);
      const jobs = [];
      const map = new Map();
      for (let m = 40; m <= 88; m++) {
        jobs.push(
          fetch(new URL(`${m}.mp3`, base))
            .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
            .then((b) => this.ctx.decodeAudioData(b))
            .then((buf) => map.set(m, buf))
            .catch(() => {}),
        );
      }
      this.loading[set] = Promise.all(jobs).then(() => {
        if (map.size < 10) throw new Error(`Couldn't load the ${set} guitar samples.`);
        this.sets[set] = map;
      });
    }
    return this.loading[set];
  }

  // nearest recorded note, re-pitched if needed
  pick(set, midi) {
    const map = this.sets[set];
    if (map.has(midi)) return [map.get(midi), 1];
    let best = null;
    for (const k of map.keys()) if (best == null || Math.abs(k - midi) < Math.abs(best - midi)) best = k;
    return [map.get(best), Math.pow(2, (midi - best) / 12)];
  }

  play(set, midi, time, seconds, dest, { gain = 1, release = 0.12, lowpass = 0 } = {}) {
    const ctx = this.ctx;
    const [buf, rate] = this.pick(set, Math.max(40, Math.min(88, midi)));
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    const level = 0.55 * gain * (SAMPLE_GAIN[set] || 1);
    const hold = Math.max(0.03, Math.min(seconds + 0.05, buf.duration / rate - release));
    g.gain.setValueAtTime(level, time);
    g.gain.setValueAtTime(level, time + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, time + hold + release);
    let node = src;
    if (lowpass) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = lowpass;
      node = src.connect(lp);
    }
    node.connect(g).connect(dest);
    src.start(time);
    src.stop(time + hold + release + 0.02);
  }
}

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

  // Synth tones: 'acoustic' | 'clean' | 'dist'. Sample tones: 'sample-acoustic' | 'sample-clean' | 'sample-dist'.
  // Returns a promise that resolves when the samples for the tone are ready (instantly for synths).
  setTone(tone) {
    this.tone = tone;
    if (!this.ctx) return Promise.resolve();
    this.gtrGain.disconnect();
    // only the synth distortion goes through the amp chain; distorted samples are already distorted
    this.gtrGain.connect(tone === 'dist' ? this.drive : this.cleanOut);
    if (!this.sampler) this.sampler = new Sampler(this.ctx);
    return this.sampler.isSampleTone(tone) ? this.sampler.loadFor(tone) : Promise.resolve();
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
    const set = this.sampler?.setFor(this.tone);
    if (set && this.sampler.has(set)) return this.sampler.play(set, midi, time, seconds, dest);
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

  // Dead / muted note (✕). The string is touched but not pressed, so you hear a short, choked
  // "chk" that still follows the string's pitch: a heavily damped pluck plus a pick-scrape transient.
  deadNote(midi, time, dest) {
    const ctx = this.ctx;
    if (this.sampler?.isSampleTone(this.tone) && this.sampler.has('muted')) {
      this.sampler.play('muted', midi, time, 0.09, dest, { gain: 0.9, lowpass: 2600 });
    } else {
      const f = freqOf(midi);
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(Math.min(3000, f * 6), time);
      lp.frequency.exponentialRampToValueAtTime(Math.max(150, f), time + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(0.16, time + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);
      o.connect(lp).connect(g).connect(dest);
      o.start(time);
      o.stop(time + 0.09);
    }
    // pick scrape, tuned a little to the string
    const len = Math.floor(ctx.sampleRate * 0.035);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(4000, freqOf(midi) * 8);
    bp.Q.value = 1.2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.18;
    src.connect(bp).connect(g2).connect(dest);
    src.start(time);
  }

  // Sound one tab event (single note or strummed chord) at `time`.
  playEvent(ev, time, seconds, dest = this.gtrGain) {
    if (!ev || ev.rest || ev.tie) return;
    const notes = [...ev.notes].sort((a, b) => (ev.pick === 'u' ? a.s - b.s : b.s - a.s));
    notes.forEach((n, k) => {
      const t = time + (ev.strum ? k * 0.014 : 0);
      const midi = midiOf(n.s, n.f);
      if (n.dead || ev.dead) this.deadNote(midi, t, dest);
      else if (ev.pm) this.palmMute(midi, t, seconds, dest);
      else this.pluck(midi, t, seconds, dest);
    });
  }

  // Palm mute: real muted-guitar samples when a sample tone is on, otherwise a short synth pluck.
  palmMute(midi, time, seconds, dest) {
    if (this.sampler?.isSampleTone(this.tone) && this.sampler.has('muted')) {
      const set = this.tone === 'sample-dist' && this.sampler.has('dist') ? 'dist' : 'muted';
      this.sampler.play(set, midi, time, Math.min(seconds, 0.22), dest, { gain: set === 'dist' ? 0.7 : 1, release: 0.05, lowpass: set === 'dist' ? 1800 : 0 });
    } else this.pluck(midi, time, Math.min(seconds, 0.18), dest);
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

  // Schedules one pass of the timeline with a short look-ahead window, so long songs don't create
  // thousands of audio nodes at once (some browsers, e.g. Opera GX, go silent when that happens).
  schedulePass(t0, fromIndex) {
    const { events, bars, total } = this.timeline;
    const spq = this.spq;
    const offset = events[fromIndex]?.start || 0;
    const clicks = [];
    bars.forEach((b) => {
      const n = Math.round(b.length / this.clickUnit);
      for (let k = 0; k < n; k++) {
        const beat = b.start + k * this.clickUnit;
        if (beat >= offset - 1e-6) clicks.push({ time: t0 + (beat - offset) * spq, accent: b.full && k === 0 });
      }
    });
    const notes = [];
    for (let i = fromIndex; i < events.length; i++) {
      const ev = events[i];
      notes.push({ i, ev, time: t0 + (ev.start - offset) * spq, secs: ev.beats * spq });
    }
    const end = t0 + (total - offset) * spq;
    let ci = 0;
    let ni = 0;
    const AHEAD = 1.2; // seconds
    const pump = () => {
      if (!this.playing) return;
      const horizon = this.engine.ctx.currentTime + AHEAD;
      while (ci < clicks.length && clicks[ci].time < horizon) {
        const c = clicks[ci++];
        this.engine.click(Math.max(c.time, this.engine.ctx.currentTime), c.accent, this.metBus);
      }
      while (ni < notes.length && notes[ni].time < horizon) {
        const { i, ev, time, secs } = notes[ni++];
        this.engine.playEvent(ev, Math.max(time, this.engine.ctx.currentTime), secs, this.gtrBus);
        this.at(time, () => this.onStep?.(i, secs * 1000));
      }
      if (ci < clicks.length || ni < notes.length) this.timers.push(setTimeout(pump, 250));
    };
    pump();
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
