// Chord shapes. Each note is [string, fret, finger]. Strings left out are muted (not played).
// Fingers: 1 index, 2 middle, 3 ring, 4 pinky. Fret 0 = open string, no finger.

export const CHORDS = {
  Em: {
    notes: [[6, 0], [5, 2, 2], [4, 2, 3], [3, 0], [2, 0], [1, 0]],
    tip: 'Middle and ring fingers side by side on fret 2. Strum all six strings.',
  },
  E: {
    notes: [[6, 0], [5, 2, 2], [4, 2, 3], [3, 1, 1], [2, 0], [1, 0]],
    tip: 'Same as Em, plus your index on the G string, fret 1. Strum all six.',
  },
  Am: {
    notes: [[5, 0], [4, 2, 2], [3, 2, 3], [2, 1, 1], [1, 0]],
    tip: 'The E shape moved down one string. Don’t strum the low E string.',
  },
  C: {
    notes: [[5, 3, 3], [4, 2, 2], [3, 0], [2, 1, 1], [1, 0]],
    tip: 'A diagonal staircase: ring, middle, index. Keep the G string ringing open. Skip the low E.',
  },
  G: {
    notes: [[6, 3, 2], [5, 2, 1], [4, 0], [3, 0], [2, 0], [1, 3, 3]],
    tip: 'Middle on low E fret 3, index on A fret 2, ring on high e fret 3. Strum all six.',
  },
  D: {
    notes: [[4, 0], [3, 2, 1], [2, 3, 3], [1, 2, 2]],
    tip: 'A small triangle on the top three strings. Strum only the top four (start from the D string).',
  },
  A: {
    notes: [[5, 0], [4, 2, 1], [3, 2, 2], [2, 2, 3], [1, 0]],
    tip: 'Three fingers in a row on fret 2 (D, G, B strings). Skip the low E.',
  },

  // ---- power chords (only 2–3 strings, root on the lowest)
  A5: { notes: [[6, 5, 1], [5, 7, 3]], tip: 'Index on low E fret 5, ring on A fret 7. Only strum those two strings.' },
  'A5 (3 note)': { label: 'A5', notes: [[6, 5, 1], [5, 7, 3], [4, 7, 4]], tip: 'Index on fret 5, ring and pinky on fret 7. Strum the bottom three strings.' },
  E5: { notes: [[6, 0], [5, 2, 1], [4, 2, 2]], tip: 'Open low E plus two fingers on fret 2. Strum the bottom three strings.' },
  D5: { notes: [[5, 5, 1], [4, 7, 3]], tip: 'Same shape as A5, one string over: index on A fret 5, ring on D fret 7.' },
  C5: { notes: [[5, 3, 1], [4, 5, 3]], tip: 'The D5 shape slid down two frets.' },
  B5: { notes: [[5, 2, 1], [4, 4, 3], [3, 4, 4]], tip: 'Index on A fret 2, ring and pinky on fret 4.' },
  'E5 (A string)': { label: 'E5', notes: [[5, 7, 1], [4, 9, 3]], tip: 'The D5 shape moved up to fret 7.' },

  // ---- 7th, sus and maj7 chords
  A7: { notes: [[5, 0], [4, 2, 2], [3, 0], [2, 2, 3], [1, 0]], tip: 'Like A, but lift the middle of the three fingers so the G string rings open.' },
  D7: { notes: [[4, 0], [3, 2, 2], [2, 1, 1], [1, 2, 3]], tip: 'A flipped D: index on B fret 1, middle and ring on fret 2.' },
  E7: { notes: [[6, 0], [5, 2, 2], [4, 0], [3, 1, 1], [2, 0], [1, 0]], tip: 'E chord with the ring finger lifted.' },
  Dsus4: { label: 'D(sus4)', notes: [[4, 0], [3, 2, 1], [2, 3, 3], [1, 3, 4]], tip: 'D chord with the pinky added on high e fret 3.' },
  Esus4: { label: 'E(sus4)', notes: [[6, 0], [5, 2, 2], [4, 2, 3], [3, 2, 4], [2, 0], [1, 0]], tip: 'Em shape plus the pinky on G fret 2.' },
  Dmaj7: { label: 'DΔ', notes: [[4, 0], [3, 2, 1], [2, 2, 1], [1, 2, 1]], tip: 'Lay your index flat across the top three strings at fret 2 — the easiest bar chord.' },
  Amaj7: { label: 'AΔ', notes: [[5, 0], [4, 2, 2], [3, 1, 1], [2, 2, 3], [1, 0]], tip: 'Index on G fret 1, middle and ring on fret 2.' },
  Dm7: { notes: [[4, 0], [3, 2, 2], [2, 1, 1], [1, 1, 1]], tip: 'Index flat across B and e at fret 1, middle on G fret 2.' },
  G7: { notes: [[6, 3, 3], [5, 2, 2], [4, 0], [3, 0], [2, 0], [1, 1, 1]], tip: 'Ring on low E fret 3, middle on A fret 2, index on high e fret 1.' },
  Cmaj7: { label: 'CΔ', notes: [[5, 3, 3], [4, 2, 2], [3, 0], [2, 0], [1, 0]], tip: 'C chord with the index lifted.' },

  // ---- bar chords
  Bm: { notes: [[5, 2, 1], [4, 4, 3], [3, 4, 4], [2, 3, 2], [1, 2, 1]], tip: 'Index barres strings 5 to 1 at fret 2; ring and pinky on fret 4, middle on B fret 3.' },
  'A (bar)': { label: 'A', notes: [[6, 5, 1], [5, 7, 3], [4, 7, 4], [3, 6, 2], [2, 5, 1], [1, 5, 1]], tip: 'E shape barred at fret 5: index flat across all six strings.' },
  'C#m': { label: 'C#m', notes: [[5, 4, 1], [4, 6, 3], [3, 6, 4], [2, 5, 2], [1, 4, 1]], tip: 'The Bm shape slid up two frets.' },
  'G#': { label: 'G#', notes: [[6, 4, 1], [5, 6, 3], [4, 6, 4], [3, 5, 2], [2, 4, 1], [1, 4, 1]], tip: 'The A bar chord slid down one fret.' },
  'F#': { label: 'F#', notes: [[6, 2, 1], [5, 4, 3], [4, 4, 4], [3, 3, 2], [2, 2, 1], [1, 2, 1]], tip: 'E shape barred at fret 2.' },
  'F#7': { label: 'F#7', notes: [[6, 2, 1], [5, 4, 3], [4, 2, 1], [3, 3, 2], [2, 2, 1], [1, 2, 1]], tip: 'F# with the pinky lifted.' },
  'D (bar)': { label: 'D', notes: [[5, 5, 1], [4, 7, 3], [3, 7, 3], [2, 7, 3]], tip: 'A-shape bar at fret 5: index on A, ring finger flat across D, G and B at fret 7.' },
  'D7 (bar)': { label: 'D7', notes: [[5, 5, 1], [4, 7, 3], [3, 5, 1], [2, 7, 4]], tip: 'Index barre at fret 5, ring on D fret 7, pinky on B fret 7.' },
  Gm: { notes: [[6, 3, 1], [5, 5, 3], [4, 5, 4], [3, 3, 1], [2, 3, 1], [1, 3, 1]], tip: 'Em shape barred at fret 3.' },
  'C7 (bar)': { label: 'C7', notes: [[6, 8, 1], [5, 10, 3], [4, 8, 1], [3, 9, 2], [2, 8, 1], [1, 8, 1]], tip: 'E7 shape barred at fret 8.' },

  // ---- Grade 4 day 6: "anti-wiggle" voicings
  'C (3)': { label: 'C', notes: [[5, 3, 2], [4, 2, 1], [3, 5, 4]], tip: 'Three-string C: keep the shape compact so switching is quick.' },
  'G (3)': { label: 'G', notes: [[6, 3, 1], [5, 5, 3], [4, 5, 4]], tip: 'G power chord shape.' },
  'D (3)': { label: 'D', notes: [[5, 5, 1], [4, 7, 3], [3, 7, 4]], tip: 'Same shape as G, one string over.' },
  'A (3)': { label: 'A', notes: [[6, 5, 1], [5, 7, 3], [4, 7, 4]], tip: 'Same shape, back on the low E at fret 5.' },

  // ---- Grade 6 day 3: moveable shapes with open strings
  Emaj9: { label: 'EΔ9', notes: [[6, 0], [5, 9, 2], [4, 9, 3], [3, 8, 1], [2, 0], [1, 0]], tip: 'The E shape slid up to fret 8–9 while the open strings keep ringing.' },
  'Aadd2/E': { label: 'A(add2)/E', notes: [[6, 0], [5, 7, 2], [4, 7, 3], [3, 6, 1], [2, 0], [1, 0]], tip: 'Same shape, two frets lower.' },
  Am9: { label: 'A-9', notes: [[5, 0], [4, 9, 2], [3, 9, 3], [2, 8, 1], [1, 0]], tip: 'The Am shape slid up to fret 8–9.' },
  'Dm9/A': { label: 'D-9/A', notes: [[5, 0], [4, 7, 2], [3, 7, 3], [2, 6, 1], [1, 0]], tip: 'Same shape, two frets lower.' },
  Asus2: { label: 'A(sus2)', notes: [[5, 0], [4, 2, 2], [3, 2, 3], [2, 0], [1, 0]], tip: 'Am with the index lifted.' },
  'Dm7 (up)': { label: 'D-7', notes: [[4, 0], [3, 5, 1], [2, 6, 3], [1, 5, 2]], tip: 'The D shape slid up to fret 5.' },
  'E/D': { label: 'E/D', notes: [[4, 0], [3, 4, 1], [2, 5, 3], [1, 4, 2]], tip: 'The D shape at fret 4.' },
  'D#/D': { label: 'D#/D', notes: [[4, 0], [3, 3, 1], [2, 4, 3], [1, 3, 2]], tip: 'The D shape at fret 3.' },
};

export function chordNotes(name) {
  const c = CHORDS[name];
  if (!c) throw new Error(`Unknown chord ${name}`);
  return c.notes.map(([s, f, fi]) => ({ s, f, fi: fi || null }));
}

export function chordLabel(name) {
  return CHORDS[name]?.label || name;
}
