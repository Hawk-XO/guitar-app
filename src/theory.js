// Music theory helpers: tuning, note names, finger info and plain-English explanations.

// String numbers follow tab convention: 1 = thinnest (high e), 6 = thickest (low E).
export const TUNING = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 }; // MIDI numbers, standard E A D G B E

export const STRING_LETTER = { 1: 'e', 2: 'B', 3: 'G', 4: 'D', 5: 'A', 6: 'E' };
export const STRING_LABEL = {
  1: 'high E (thinnest)',
  2: 'B',
  3: 'G',
  4: 'D',
  5: 'A',
  6: 'low E (thickest)',
};

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_ALIAS = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };

export const FINGERS = {
  1: { name: 'index', color: '#378ADD' },
  2: { name: 'middle', color: '#639922' },
  3: { name: 'ring', color: '#EF9F27' },
  4: { name: 'pinky', color: '#E24B4A' },
};

export function midiOf(string, fret) {
  return TUNING[string] + fret;
}

export function noteName(midi) {
  return SHARP[((midi % 12) + 12) % 12];
}

export function noteWithOctave(midi) {
  return noteName(midi) + (Math.floor(midi / 12) - 1);
}

export function freqOf(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function aliasText(name) {
  return FLAT_ALIAS[name] ? ` (also called ${FLAT_ALIAS[name]})` : '';
}

// Returns a short title and a list of plain-English lines for one note on the tab.
export function explainNote({ s, f, fi }) {
  const name = noteName(midiOf(s, f));
  const lines = [];
  lines.push(`Tab line ${s} from the top = string ${s}, the ${STRING_LABEL[s]} string.`);
  if (f === 0) {
    lines.push('0 means play the string open: don’t press anything, just pick it.');
  } else {
    lines.push(`${f} means press at fret ${f}, just behind the ${ordinal(f)} metal fret wire.`);
    if (fi) lines.push(`Use finger ${fi} (${FINGERS[fi].name}).`);
  }
  lines.push(`This note is ${name}${aliasText(name)}.`);
  return { title: `${name} · string ${s}, fret ${f}`, lines };
}

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const TAB_GUIDE = [
  ['The 6 lines', 'Each line is a string. Top line = thinnest string (high e), bottom line = thickest (low E). It’s upside down compared to how you look at the guitar.'],
  ['The numbers', 'A number tells you which fret to press on that line’s string. 0 = open string, no fingers.'],
  ['Stacked numbers', 'Numbers stacked on top of each other are played together: that’s a chord, so you strum them.'],
  ['Reading order', 'Read left to right, like text. The vertical lines split the music into bars (counts of 4 in 4/4 time).'],
  ['Timing', 'Tab doesn’t show rhythm well. Press play and follow the metronome: the highlighted note moves in time.'],
  ['Pick symbols', '⊓ = pick down (toward the floor), V = pick up (toward the ceiling).'],
  ['Finger numbers', '1 index, 2 middle, 3 ring, 4 pinky. The thumb stays behind the neck.'],
];
