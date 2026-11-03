// Shared helpers for imported songs: bar splitting, picking directions, fret/finger assignment.

import { assignPositions, assignFingers } from './frets.js';

const EPS = 1e-6;
const round = (x, q = 1 / 48) => Math.round(x / q) * q;

// items: [{ start, beats, midis?|notes?, dead? }] sorted, non-overlapping, in quarter-note beats.
// Returns bars of events, inserting rests in gaps and splitting notes across bar lines (tied).
export function buildBars(items, meter) {
  const barLen = (meter[0] * 4) / meter[1];
  const end = items.reduce((m, it) => Math.max(m, it.start + it.beats), 0);
  const nBars = Math.max(1, Math.ceil(end / barLen - EPS));
  const bars = Array.from({ length: nBars }, () => []);
  let cursor = 0;
  const push = (start, beats, ev) => {
    // split across bars
    while (beats > EPS) {
      const bi = Math.min(nBars - 1, Math.floor(start / barLen + EPS));
      const barEnd = (bi + 1) * barLen;
      const len = Math.min(beats, barEnd - start);
      bars[bi].push({ ...ev, beats: round(len) });
      ev = ev.rest ? ev : { ...ev, tie: true };
      start += len;
      beats -= len;
    }
  };
  for (const it of items) {
    if (it.start > cursor + EPS) push(cursor, it.start - cursor, { rest: true, notes: [] });
    const { start, beats, ...ev } = it;
    push(Math.max(start, cursor), beats, ev);
    cursor = Math.max(cursor, start + beats);
  }
  if (cursor < nBars * barLen - EPS) push(cursor, nBars * barLen - cursor, { rest: true, notes: [] });
  return bars.map((b) => b.filter((e) => e.beats > EPS));
}

// Final pass: positions for pitch-only notes, fingers, strum flags and pick directions.
export function finishSong(song) {
  const flat = song.bars.flat();
  const needPos = flat.filter((e) => !e.rest && e.midis && !(e.notes && e.notes.length));
  assignPositions(needPos);
  // ties copy the previous note's positions
  let prev = null;
  for (const e of flat) {
    if (e.tie && prev && !e.rest) e.notes = prev.notes.map((n) => ({ ...n }));
    if (!e.rest) prev = e;
  }
  assignFingers(flat);
  let beat = 0;
  for (const e of flat) {
    if (!e.rest) {
      e.notes = (e.notes || []).filter((n) => n && n.s >= 1 && n.s <= 6 && n.f >= 0);
      if (!e.notes.length) {
        e.rest = true;
        e.tie = false;
      }
      if (e.notes.length >= 3) e.strum = true;
      const sub = round(beat % 1, 0.25);
      e.pick = e.pick || (sub === 0.5 || sub === 0.25 || sub === 0.75 ? 'u' : 'd');
      delete e.midis;
    }
    beat += e.beats;
  }
  song.bars = song.bars.map((b) => b.filter((e) => e.beats > EPS));
  return song;
}
