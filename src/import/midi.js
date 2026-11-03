// Standard MIDI file importer (.mid / .midi). Picks the busiest non-drum track and quantises to 16ths.

import { buildBars, finishSong } from './song.js';

export function parseMIDI(buffer, fileName = 'Imported song') {
  const d = new DataView(buffer);
  let p = 0;
  const str = (n) => String.fromCharCode(...new Uint8Array(buffer, p, n));
  if (str(4) !== 'MThd') throw new Error('Not a MIDI file.');
  const hlen = d.getUint32(4);
  const ntracks = d.getUint16(10);
  const ppq = d.getUint16(12);
  if (ppq & 0x8000) throw new Error('SMPTE-timed MIDI files are not supported.');
  p = 8 + hlen;
  let tempo = null;
  let meter = null;
  let name = null;
  const tracks = [];
  for (let t = 0; t < ntracks && p < buffer.byteLength; t++) {
    if (str(4) !== 'MTrk') break;
    const len = d.getUint32(p + 4);
    const end = p + 8 + len;
    p += 8;
    let tick = 0;
    let status = 0;
    const on = {};
    const notes = [];
    let trackName = null;
    const vlq = () => {
      let v = 0;
      let b;
      do {
        b = d.getUint8(p++);
        v = (v << 7) | (b & 0x7f);
      } while (b & 0x80);
      return v;
    };
    while (p < end) {
      tick += vlq();
      let b = d.getUint8(p);
      if (b & 0x80) {
        status = b;
        p++;
      }
      const type = status & 0xf0;
      const ch = status & 0x0f;
      if (status === 0xff) {
        const meta = d.getUint8(p++);
        const l = vlq();
        if (meta === 0x51 && tempo == null) tempo = 60000000 / ((d.getUint8(p) << 16) | (d.getUint8(p + 1) << 8) | d.getUint8(p + 2));
        if (meta === 0x58 && !meter) meter = [d.getUint8(p), Math.pow(2, d.getUint8(p + 1))];
        if (meta === 0x03) trackName = new TextDecoder().decode(new Uint8Array(buffer, p, l));
        p += l;
      } else if (status === 0xf0 || status === 0xf7) {
        p += vlq();
      } else if (type === 0x90 || type === 0x80) {
        const key = d.getUint8(p++);
        const vel = d.getUint8(p++);
        const id = ch * 128 + key;
        if (type === 0x90 && vel > 0) on[id] = tick;
        else if (on[id] != null) {
          notes.push({ ch, key, start: on[id], end: tick });
          delete on[id];
        }
      } else if (type === 0xc0 || type === 0xd0) p += 1;
      else p += 2;
    }
    p = end;
    if (t === 0 && trackName) name = trackName;
    tracks.push(notes.filter((n) => n.ch !== 9));
  }
  const notes = tracks.sort((a, b) => b.length - a.length)[0] || [];
  if (!notes.length) throw new Error('No playable notes found in this MIDI file.');
  meter = meter || [4, 4];
  const q = ppq / 4; // 16th note grid
  const groups = new Map();
  for (const n of notes) {
    const s = Math.round(n.start / q);
    if (!groups.has(s)) groups.set(s, { s, keys: new Set(), end: 0 });
    const g = groups.get(s);
    g.keys.add(n.key);
    g.end = Math.max(g.end, Math.max(s + 1, Math.round(n.end / q)));
  }
  const onsets = [...groups.values()].sort((a, b) => a.s - b.s);
  const items = onsets.map((g, i) => {
    const next = onsets[i + 1]?.s ?? g.end;
    // legato: if the next note starts within a 16th of this one ending, join them up
    const len = Math.max(1, next - g.end <= 1 ? next - g.s : g.end - g.s);
    return { start: g.s / 4, beats: len / 4, midis: [...g.keys].slice(0, 6) };
  });
  const bars = buildBars(items, meter);
  return finishSong({ title: name || fileName, tempo: Math.round(tempo || 120), meter, bars, source: 'MIDI' });
}
