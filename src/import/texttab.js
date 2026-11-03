// Plain-text (ASCII) tab importer. Understands blocks of six lines like:
//   e|-----0---|      Optional first lines:  "Title: …", "Tempo: 120", "Time: 3/4"
//   B|---1-----|      Numbers = frets, x = dead note, | = bar line.
// Rhythm isn't written in text tab, so each note's length comes from its spacing inside the bar.

import { finishSong } from './song.js';

const NAME_TO_STRING = { e: 1, b: 2, g: 3, d: 4, a: 5 };

export function parseTextTab(text, fileName = 'Imported song') {
  const lines = text.replace(/\r/g, '').split('\n');
  const title = (text.match(/^\s*title\s*[:=]\s*(.+)$/im) || [])[1]?.trim() || fileName;
  const tempo = Number((text.match(/(?:tempo|bpm)\s*[:=]?\s*(\d{2,3})/i) || [])[1]) || 100;
  const tm = text.match(/time\s*[:=]\s*(\d+)\s*\/\s*(\d+)/i);
  const meter = tm ? [Number(tm[1]), Number(tm[2])] : [4, 4];
  const barLen = (meter[0] * 4) / meter[1];

  const isTab = (l) => /^\s*[eBGDAEbgda]\s*[|:]?[-0-9xX|hpbr/\\~ ]{4,}/.test(l) && /-/.test(l);
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    if (isTab(lines[i]) && lines.slice(i, i + 6).every(isTab)) {
      blocks.push(lines.slice(i, i + 6));
      i += 5;
    }
  }
  if (!blocks.length) throw new Error('No 6-line tab blocks found. Each block needs lines for e, B, G, D, A and E.');

  const bars = [];
  for (const block of blocks) {
    // string number for each line: top→bottom = 1→6, using the letter when it is clear
    const rows = block.map((l, i) => {
      const m = l.match(/^\s*([eBGDAEbgda])\s*[|:]?/);
      const letter = m ? m[1] : '';
      let s = i + 1;
      if (letter === 'E' && i > 2) s = 6;
      else if (letter && NAME_TO_STRING[letter.toLowerCase()] && letter !== 'E') s = NAME_TO_STRING[letter.toLowerCase()];
      return { s, body: m ? l.slice(m[0].length) : l };
    });
    const width = Math.max(...rows.map((r) => r.body.length));
    // bar line columns (where most rows have '|')
    const cuts = [];
    for (let c = 0; c < width; c++) if (rows.filter((r) => r.body[c] === '|').length >= 4) cuts.push(c);
    const segments = [];
    let startC = 0;
    for (const c of [...cuts, width]) {
      if (c - startC > 1) segments.push([startC, c]);
      startC = c + 1;
    }
    for (const [a, b] of segments) {
      const cols = [];
      for (let c = a; c < b; c++) {
        const notes = [];
        for (const r of rows) {
          const ch = r.body[c];
          const prev = r.body[c - 1];
          if (/\d/.test(ch) && !/\d/.test(prev || '')) {
            const nxt = r.body[c + 1];
            const f = /\d/.test(nxt || '') ? Number(ch + nxt) : Number(ch);
            notes.push({ s: r.s, f, fi: null });
          } else if (/[xX]/.test(ch)) notes.push({ s: r.s, f: 0, fi: null, dead: true });
        }
        if (notes.length) cols.push({ c, notes });
      }
      if (!cols.length) {
        bars.push([{ beats: barLen, rest: true, notes: [] }]);
        continue;
      }
      // spacing → durations, quantised to 16ths and scaled to fill the bar
      const span = b - a;
      const lead = ((cols[0].c - a) / span) * barLen;
      const raw = cols.map((col, i) => ((cols[i + 1]?.c ?? b) - col.c) / span * barLen);
      const q = (x) => Math.max(0.25, Math.round(x * 4) / 4);
      const durs = raw.map(q);
      let leadQ = lead > 0.2 ? Math.round(lead * 4) / 4 : 0;
      const sum = durs.reduce((x, y) => x + y, 0) + leadQ;
      durs[durs.length - 1] = Math.max(0.25, durs[durs.length - 1] + (barLen - sum));
      const events = [];
      if (leadQ > 0) events.push({ beats: leadQ, rest: true, notes: [] });
      cols.forEach((col, i) => {
        const dead = col.notes.every((n) => n.dead);
        events.push({ beats: durs[i], notes: col.notes, ...(dead ? { dead: true } : {}) });
      });
      bars.push(events);
    }
  }
  return finishSong({ title, tempo, meter, bars, source: 'Text tab' });
}
