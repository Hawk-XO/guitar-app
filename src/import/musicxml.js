// MusicXML importer (.musicxml / .xml / compressed .mxl).
// Uses string/fret from <technical> when present (Guitar Pro, MuseScore tab staves), otherwise pitches.

import { finishSong } from './song.js';

const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export async function readMxl(buffer) {
  const files = await unzip(buffer);
  const container = files['META-INF/container.xml'];
  let path = null;
  if (container) {
    const m = new TextDecoder().decode(container).match(/full-path="([^"]+)"/);
    if (m) path = m[1];
  }
  if (!path) path = Object.keys(files).find((f) => /\.(musicxml|xml)$/i.test(f) && !f.startsWith('META-INF'));
  if (!path || !files[path]) throw new Error('No score found inside the .mxl file.');
  return new TextDecoder().decode(files[path]);
}

// Minimal zip reader (stored + deflate), via the browser's DecompressionStream.
async function unzip(buffer) {
  const dv = new DataView(buffer);
  const out = {};
  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Not a valid .mxl (zip) file.');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  for (let k = 0; k < count; k++) {
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true);
    const elen = dv.getUint16(p + 30, true);
    const clen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(new Uint8Array(buffer, p + 46, nlen));
    const lnlen = dv.getUint16(local + 26, true);
    const lelen = dv.getUint16(local + 28, true);
    const data = new Uint8Array(buffer, local + 30 + lnlen + lelen, csize);
    if (method === 0) out[name] = data;
    else if (method === 8) {
      const ds = new DecompressionStream('deflate-raw');
      out[name] = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer());
    }
    p += 46 + nlen + elen + clen;
  }
  return out;
}

const txt = (el, sel) => el.querySelector(sel)?.textContent?.trim();
const num = (el, sel, d = null) => {
  const v = txt(el, sel);
  return v == null || v === '' ? d : Number(v);
};

export function parseMusicXML(xml, fileName = 'Imported song') {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('This MusicXML file could not be read.');
  if (doc.documentElement.nodeName === 'score-timewise') throw new Error('Timewise MusicXML is not supported — re-export as partwise (the normal setting).');
  const title = txt(doc, 'work > work-title') || txt(doc, 'movement-title') || txt(doc, 'credit-words') || fileName;

  // choose the part with the most tab info, else the first one
  const parts = [...doc.querySelectorAll('part')];
  if (!parts.length) throw new Error('No parts found in this score.');
  const part = parts
    .map((p) => ({ p, tab: p.querySelectorAll('technical fret').length, notes: p.querySelectorAll('note').length }))
    .sort((a, b) => b.tab - a.tab || b.notes - a.notes)[0].p;

  let divisions = 1;
  let meter = null;
  let tempo = null;
  let octave = 0; // from <transpose><octave-change>
  let voice = null;
  const bars = [];
  for (const m of part.querySelectorAll(':scope > measure')) {
    const attrs = m.querySelector('attributes');
    if (attrs) {
      divisions = num(attrs, 'divisions', divisions);
      const beats = num(attrs, 'time > beats');
      const bt = num(attrs, 'time > beat-type');
      if (beats && bt && !meter) meter = [beats, bt];
      const oc = num(attrs, 'transpose > octave-change');
      if (oc != null) octave = oc;
    }
    if (tempo == null) {
      const s = m.querySelector('sound[tempo]');
      if (s) tempo = Number(s.getAttribute('tempo'));
      else {
        const pm = num(m, 'metronome > per-minute');
        if (pm) tempo = pm;
      }
    }
    const events = [];
    for (const n of m.querySelectorAll(':scope > note')) {
      if (n.querySelector('grace') || n.querySelector('cue')) continue;
      const v = txt(n, 'voice') || '1';
      if (voice == null && !n.querySelector('rest')) voice = v;
      if (voice != null && v !== voice) continue;
      const beats = (num(n, 'duration', 0) || 0) / divisions;
      const isChord = !!n.querySelector('chord');
      const tied = [...n.querySelectorAll('tie')].some((t) => t.getAttribute('type') === 'stop');
      const dead = /^x$|cross/i.test(txt(n, 'notehead') || '');
      let note = null;
      let midi = null;
      if (!n.querySelector('rest')) {
        const s = num(n, 'technical > string');
        const f = num(n, 'technical > fret');
        if (s != null && f != null) note = { s, f, fi: null, dead: dead || undefined };
        const step = txt(n, 'pitch > step');
        if (step) midi = (num(n, 'pitch > octave', 4) + 1) * 12 + STEP[step] + num(n, 'pitch > alter', 0) + 12 * octave;
        if (!note && midi == null && dead) midi = 52; // unpitched dead stroke
      }
      if (isChord && events.length) {
        const last = events[events.length - 1];
        if (note) last.notes = [...(last.notes || []), note];
        if (midi != null) last.midis = [...(last.midis || []), midi];
        if (dead) last.dead = last.dead && dead;
        continue;
      }
      if (beats <= 0) continue;
      if (note == null && midi == null) events.push({ beats, rest: true, notes: [] });
      else {
        const ev = { beats, notes: note ? [note] : [], midis: midi != null ? [midi] : [] };
        if (dead) ev.dead = true;
        if (tied) ev.tie = true;
        if (!ev.notes.length) delete ev.notes;
        events.push(ev);
      }
    }
    // events that only have pitches drop their partial tab, so every note in a chord is handled the same way
    events.forEach((e) => {
      if (e.notes && e.midis && e.notes.length !== e.midis.length) delete e.notes;
    });
    if (!events.length) {
      const [b, bt] = meter || [4, 4];
      events.push({ beats: (b * 4) / bt, rest: true, notes: [] });
    }
    bars.push(events);
  }
  meter = meter || [4, 4];
  return finishSong({ title, tempo: Math.round(tempo || 100), meter, bars, source: 'MusicXML' });
}
