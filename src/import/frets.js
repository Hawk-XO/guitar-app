// Turns pitches into playable string/fret/finger choices for standard tuning.
// Used when an imported file has notes but no tab information.

import { TUNING } from '../theory.js';

const MAX_FRET = 22;
const STRINGS = [1, 2, 3, 4, 5, 6];

// Fit a pitch into guitar range by octave shifting.
export function fitRange(midi) {
  while (midi < 40) midi += 12;
  while (midi > 40 + 12 + MAX_FRET + 12) midi -= 12; // high e fret 22 = 86
  while (midi > 86) midi -= 12;
  return midi;
}

// All (string, fret) options for one pitch.
function options(midi) {
  return STRINGS.map((s) => ({ s, f: midi - TUNING[s] })).filter((o) => o.f >= 0 && o.f <= MAX_FRET);
}

// All ways to put a chord's pitches on distinct strings (max `limit` results).
function chordShapes(pitches, limit = 60) {
  const sorted = [...pitches].sort((a, b) => b - a); // high → low
  const out = [];
  const used = new Set();
  const cur = [];
  (function rec(i) {
    if (out.length >= limit) return;
    if (i === sorted.length) {
      out.push(cur.map((x) => ({ ...x })));
      return;
    }
    for (const o of options(sorted[i])) {
      if (used.has(o.s)) continue;
      // keep strings ordered: a lower pitch should not sit on a thinner string than a higher one
      if (cur.length && o.s < cur[cur.length - 1].s) continue;
      used.add(o.s);
      cur.push(o);
      rec(i + 1);
      cur.pop();
      used.delete(o.s);
    }
  })(0);
  return out;
}

function shapeCost(shape) {
  const fretted = shape.filter((n) => n.f > 0).map((n) => n.f);
  if (!fretted.length) return 0;
  const span = Math.max(...fretted) - Math.min(...fretted);
  const high = Math.max(...fretted);
  return (span > 4 ? (span - 4) * 6 : span * 0.5) + high * 0.12;
}

const centre = (shape) => {
  const fr = shape.filter((n) => n.f > 0).map((n) => n.f);
  return fr.length ? fr.reduce((a, b) => a + b, 0) / fr.length : null;
};

// events: [{ midis:[...] , ...rest }] → each gets notes:[{s,f}] using a beam search over hand movement.
export function assignPositions(events) {
  const BEAM = 12;
  let beams = [{ cost: 0, pos: null, picks: [] }];
  for (const ev of events) {
    if (!ev.midis || !ev.midis.length) {
      beams = beams.map((b) => ({ ...b, picks: [...b.picks, null] }));
      continue;
    }
    const shapes = chordShapes(ev.midis.map(fitRange));
    if (!shapes.length) {
      beams = beams.map((b) => ({ ...b, picks: [...b.picks, []] }));
      continue;
    }
    const next = [];
    for (const b of beams) {
      for (const sh of shapes) {
        const c = centre(sh);
        const move = c == null || b.pos == null ? 0 : Math.abs(c - b.pos);
        next.push({ cost: b.cost + shapeCost(sh) + move * 0.8, pos: c ?? b.pos, picks: [...b.picks, sh] });
      }
    }
    next.sort((a, b) => a.cost - b.cost);
    beams = next.slice(0, BEAM);
  }
  const best = beams[0].picks;
  events.forEach((ev, i) => {
    if (best[i]) ev.notes = best[i].map((n) => ({ s: n.s, f: n.f, fi: null, dead: ev.dead || undefined }));
  });
  return events;
}

// Give every fretted note a finger, keeping a "one finger per fret" hand position.
export function assignFingers(events) {
  let pos = 1; // fret under the index finger
  for (const ev of events) {
    if (!ev.notes || ev.rest) continue;
    const fretted = ev.notes.filter((n) => n.f > 0);
    if (!fretted.length) continue;
    if (fretted.some((n) => n.fi)) {
      // keep given fingers, just track the position
      const n = fretted.find((x) => x.fi);
      pos = Math.max(1, n.f - n.fi + 1);
      continue;
    }
    const lo = Math.min(...fretted.map((n) => n.f));
    const hi = Math.max(...fretted.map((n) => n.f));
    if (lo < pos) pos = lo;
    if (hi > pos + 3) pos = Math.max(1, hi - 3);
    if (hi - lo > 3) pos = lo;
    const taken = new Set();
    // thicker strings first so a same-fret pair gets consecutive fingers
    [...fretted].sort((a, b) => a.f - b.f || b.s - a.s).forEach((n) => {
      let fi = Math.max(1, Math.min(4, n.f - pos + 1));
      while (taken.has(fi) && fi < 4) fi++;
      taken.add(fi);
      n.fi = fi;
    });
  }
  return events;
}
