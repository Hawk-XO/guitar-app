// Picks the right importer for a file and returns a song: { title, tempo, meter, bars, source }.

import { parseMusicXML, readMxl } from './musicxml.js';
import { parseMIDI } from './midi.js';
import { parseTextTab } from './texttab.js';

export const ACCEPT = '.musicxml,.xml,.mxl,.mid,.midi,.txt,.tab';

export async function importFile(file) {
  const base = file.name.replace(/\.[^.]+$/, '');
  const ext = (file.name.match(/\.([^.]+)$/) || [])[1]?.toLowerCase();
  if (ext === 'mxl') return parseMusicXML(await readMxl(await file.arrayBuffer()), base);
  if (ext === 'mid' || ext === 'midi') return parseMIDI(await file.arrayBuffer(), base);
  if (ext === 'pdf') throw new Error('PDFs are pictures of the music, so notes can’t be read from them directly. Convert it to MusicXML first (Audiveris, or MuseScore.com’s PDF import), then add that file.');
  if (/^gp[x345]?$/.test(ext || '')) throw new Error('Guitar Pro files aren’t supported directly yet. In Guitar Pro or TuxGuitar use File → Export → MusicXML, then add that file.');
  const text = await file.text();
  if (ext === 'musicxml' || ext === 'xml' || /<score-partwise/.test(text.slice(0, 2000))) return parseMusicXML(text, base);
  return parseTextTab(text, base);
}
