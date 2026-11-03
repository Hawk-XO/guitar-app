// Exercises transcribed from "Beginner Compiled Exercises" (Pickup Music, Beginner Learning Pathway).
// For personal practice only — keep this repo private.
//
// Durations are in quarter-note beats (1 = quarter, 2 = half, 4 = whole, 0.5 = eighth).
// Strings: 1 = high e (thinnest) … 6 = low E (thickest). Finger: 1 index, 2 middle, 3 ring, 4 pinky, null = open.
// Pick: 'd' = downstroke, 'u' = upstroke.

import { chordNotes } from './chords.js';
import { GRADES_3_TO_6 } from './grades3to6.js';

// ---- helpers -------------------------------------------------------------
const n = (s, f, fi, beats, pick = 'd') => ({ beats, pick, notes: [{ s, f, fi: f === 0 ? null : fi }] });
const tie = (s, f, fi, beats) => ({ beats, tie: true, notes: [{ s, f, fi: f === 0 ? null : fi }] });
const r = (beats) => ({ beats, rest: true, notes: [] });
const ch = (name, beats, pick = 'd') => ({ beats, pick, chord: name, strum: true, notes: chordNotes(name) });
const rep = (count, fn) => Array.from({ length: count }, (_, i) => fn(i));
const alt = (i) => (i % 2 === 0 ? 'd' : 'u');

// bars of N strums of a chord, each lasting `beats`
const strumBar = (name, count, beats, pattern = null) =>
  rep(count, (i) => ch(name, beats, pattern ? pattern[i] : 'd'));

// ---- Grade 1 -------------------------------------------------------------
const lowERiff = [
  [n(6, 0, null, 1), n(6, 0, null, 1), n(6, 4, 1, 1), n(6, 4, 1, 1)],
  [n(6, 5, 2, 1), n(6, 5, 2, 1), n(6, 0, null, 2)],
  [n(6, 0, null, 1), n(6, 0, null, 1), n(6, 4, 1, 1), n(6, 4, 1, 1)],
  [n(6, 5, 2, 1), n(6, 5, 2, 1), n(6, 12, 1, 2)],
];

// High e riff: index on 2, ring on 4, pinky on 5 (one finger per fret starting at fret 2)
const hiRiff = [
  [n(1, 5, 4, 1), n(1, 5, 4, 1), n(1, 4, 3, 1), n(1, 4, 3, 1)],
  [n(1, 2, 1, 4)],
];
const hiRiffEnding = [
  [n(1, 9, 3, 1), n(1, 7, 1, 1), n(1, 5, 4, 1), n(1, 4, 3, 1)],
  [n(1, 2, 1, 1.5), n(1, 0, null, 2.5)],
];
const hiRiff2 = [...hiRiff, ...hiRiff, ...hiRiff, ...hiRiffEnding];

// Day 5 riffs (index on fret 3, ring on fret 5)
const eRiff = (s) => [
  [n(s, 0, null, 0.5), n(s, 0, null, 0.5), n(s, 3, 1, 0.5), n(s, 0, null, 0.5), n(s, 5, 3, 0.5), n(s, 5, 3, 0.5), n(s, 5, 3, 0.5), n(s, 3, 1, 0.5)],
  [n(s, 0, null, 0.5), n(s, 0, null, 0.5), n(s, 3, 1, 0.5), n(s, 0, null, 0.5), n(s, 5, 3, 2)],
];

// Day 6 lead line
const lead1 = [
  [n(3, 0, null, 1), n(3, 0, null, 1), n(2, 3, 3, 1), n(2, 3, 3, 1)],
  [n(1, 0, null, 1), n(1, 0, null, 1), n(2, 3, 3, 2)],
  [n(2, 1, 1, 1), n(2, 1, 1, 1), n(2, 0, null, 1), n(2, 0, null, 1)],
  [n(3, 2, 2, 1), n(3, 2, 2, 1), n(3, 0, null, 2)],
];
const lead2Bar = [
  [n(2, 3, 3, 1), n(2, 3, 3, 1), n(2, 1, 1, 1), n(2, 1, 1, 1)],
  [n(2, 0, null, 1), n(2, 0, null, 1), n(3, 2, 2, 2)],
];
const lead2 = [...lead2Bar, ...lead2Bar];

// ---- Grade 2 helpers -----------------------------------------------------
const wholeRest = (name) => [[ch(name, 4)], [r(4)]];
const fourRest = (name) => [strumBar(name, 4, 1), [r(4)]];
const fourWhole = (name) => [strumBar(name, 4, 1), [ch(name, 4)]];
const halvesWhole = (name) => [strumBar(name, 2, 2), [ch(name, 4)]];
const oneAndTwoAnd = (name) => [[ch(name, 0.5, 'd'), ch(name, 0.5, 'u'), ch(name, 0.5, 'd'), ch(name, 2.5, 'u')]];
const eightDowns = (name) => [strumBar(name, 8, 0.5)];

const twangLick = [tie(5, 0, null, 1.5), n(6, 0, null, 0.5), n(6, 2, 2, 0.5), n(5, 0, null, 0.5)];

export const COURSE = [
  {
    grade: 1,
    days: [
      {
        day: 1, title: 'Getting started',
        exercises: [
          {
            title: 'Fretboard basics',
            tip: 'Play only the thickest string. Press with the tip of your finger, close to the fret wire.',
            bars: [
              [n(6, 0, null, 2), n(6, 4, 1, 2)],
              [n(6, 5, 2, 2), n(6, 0, null, 2)],
              [n(6, 0, null, 2), n(6, 4, 1, 2)],
              [n(6, 5, 2, 2), n(6, 12, 1, 2)],
            ],
          },
          { title: 'Low E-string riff', tip: 'Same notes, twice as fast. Keep picking down.', bars: lowERiff },
        ],
      },
      {
        day: 2, title: 'Fretting notes',
        exercises: [
          { title: 'High E-string riff 1', tip: 'Thinnest string now. One finger per fret: index 2, ring 4, pinky 5.', bars: hiRiff },
          { title: 'High E-string riff 2', tip: 'The ending climbs up to fret 9 then walks back down.', bars: hiRiff2 },
          { title: 'Combining high and low E strings', tip: 'High riff, then jump to the low E riff.', bars: [...hiRiff2, ...lowERiff] },
        ],
      },
      {
        day: 3, title: 'Your first three chords',
        exercises: [
          { title: 'Em', tip: 'Strum once, let it ring, then "wiggle": lift your fingers off and place them back to build muscle memory.', bars: wholeRest('Em') },
          { title: 'E', tip: 'Strum, then wiggle the shape on and off during the rest bar.', bars: wholeRest('E') },
          { title: 'Am', tip: 'Strum from the A string down. Wiggle in the rest bar.', bars: wholeRest('Am') },
        ],
      },
      {
        day: 4, title: 'Strumming and counting',
        exercises: [
          { title: 'Whole notes', tip: 'One strum every 4 counts.', bars: [...rep(4, () => [ch('E', 4)]), [r(4)], [r(4)]] },
          { title: 'Half notes', tip: 'Two strums per bar: on 1 and 3.', bars: [...rep(4, () => strumBar('E', 2, 2)), [r(4)], [r(4)]] },
          { title: 'Quarter notes', tip: 'Strum on every count: 1 2 3 4.', bars: [...rep(4, () => strumBar('E', 4, 1)), [r(4)], [r(4)]] },
          { title: 'Eighth notes', tip: 'Down on the number, up on the "and": 1 & 2 & 3 & 4 &.', bars: [...rep(4, () => rep(8, (i) => ch('E', 0.5, alt(i)))), [r(4)], [r(4)]] },
        ],
      },
      {
        day: 5, title: "Riffin' on E and A",
        exercises: [
          { title: 'E string riff', tip: 'Index on fret 3, ring on fret 5.', bars: eRiff(6) },
          { title: 'A string riff', tip: 'Same shape, one string over.', bars: eRiff(5) },
          {
            title: 'Turn around',
            tip: 'The riff, then a walk down from fret 7 to finish on the open strings.',
            bars: [
              ...eRiff(6),
              [n(6, 7, 3, 1), n(6, 7, 3, 1), n(6, 7, 3, 1), n(6, 6, 2, 1)],
              [n(6, 5, 1, 1), r(1), n(6, 5, 1, 1), n(6, 3, 1, 1)],
              eRiff(6)[0],
              [n(6, 0, null, 2), n(1, 0, null, 2)],
            ],
          },
        ],
      },
      {
        day: 6, title: 'Your first lead line',
        exercises: [
          { title: 'First part', tip: 'Ring finger on fret 3, index on fret 1, middle on fret 2.', bars: lead1 },
          { title: 'Second part', tip: 'Stays mostly on the B string.', bars: lead2 },
          { title: 'Put it together', tip: 'Part one straight into part two.', bars: [...lead1, ...lead2] },
        ],
      },
    ],
  },
  {
    grade: 2,
    days: [
      {
        day: 1, title: 'Twang in 6/8', meter: [6, 8],
        exercises: [
          {
            title: 'A to B', meter: [6, 8], tip: 'Each note rings for two bars. Count 1-2-3-4-5-6.',
            bars: [
              [n(5, 0, null, 3)], [tie(5, 0, null, 3)], [n(5, 2, 2, 3)], [tie(5, 2, 2, 3)],
              [n(5, 2, 2, 3)], [tie(5, 2, 2, 3)], [n(5, 0, null, 3)], [tie(5, 0, null, 3)],
            ],
          },
          {
            title: 'Twangy lick', meter: [6, 8], tip: 'Same as before with a little lick at the end.',
            bars: [
              [n(5, 0, null, 3)], [tie(5, 0, null, 3)], [n(5, 2, 2, 3)], [tie(5, 2, 2, 3)],
              [n(5, 2, 2, 3)], [tie(5, 2, 2, 3)], [n(5, 0, null, 3)], twangLick,
            ],
          },
          {
            title: 'Extra sauce', meter: [6, 8], tip: 'Adds a step up to fret 4 before the lick.',
            bars: [
              [n(5, 0, null, 3)], [tie(5, 0, null, 3)], [n(5, 2, 1, 3)], [tie(5, 2, 1, 3)],
              [n(5, 2, 1, 3)], [n(5, 4, 3, 1.5), n(5, 2, 1, 1.5)], [n(5, 0, null, 3)], twangLick,
            ],
          },
        ],
      },
      {
        day: 2, title: 'C and G',
        exercises: [
          { title: 'C chord', tip: 'Strum and let ring, then four quarter strums.', bars: [...wholeRest('C'), ...wholeRest('C'), ...fourRest('C'), ...fourRest('C')] },
          { title: 'G chord', tip: 'Same pattern on G.', bars: [...wholeRest('G'), ...wholeRest('G'), ...fourRest('G'), ...fourRest('G')] },
          { title: 'C to G', tip: 'Use the rest bar to get to the next shape.', bars: [...wholeRest('C'), ...wholeRest('C'), ...wholeRest('G'), ...wholeRest('G'), ...fourRest('C'), ...fourRest('C'), ...fourRest('G'), ...fourRest('G')] },
        ],
      },
      {
        day: 3, title: 'Switching chords and strumming',
        exercises: [
          { title: 'Am to E', tip: 'Am and E are the same shape moved one string. Slide the whole shape over.', bars: [[ch('Am', 4)], [ch('Am', 4)], [ch('E', 4)], [ch('E', 4)], [ch('Am', 4)], [ch('Am', 4)], [ch('E', 4)], [ch('E', 4)], ...fourWhole('Am'), ...fourWhole('E'), ...fourWhole('Am'), ...fourWhole('E')] },
          { title: 'C to Am', tip: 'Index and middle stay put; only the ring finger moves.', bars: [[ch('C', 4)], [ch('C', 4)], [ch('Am', 4)], [ch('Am', 4)], [ch('C', 4)], [ch('C', 4)], [ch('Am', 4)], [ch('Am', 4)], ...fourWhole('C'), ...fourWhole('Am'), ...fourWhole('C'), ...fourWhole('Am')] },
          { title: 'C to G', tip: 'Move all three fingers together.', bars: [[ch('C', 4)], [ch('C', 4)], [ch('G', 4)], [ch('G', 4)], ...fourWhole('C'), ...fourWhole('G')] },
        ],
      },
      {
        day: 4, title: 'Happy day of birth!', meter: [3, 4],
        exercises: [
          {
            title: 'First part', meter: [3, 4], tip: 'Counted in 3. Starts with two quick pickup notes.',
            bars: [
              [n(3, 0, null, 0.5), n(3, 0, null, 0.5)],
              [n(3, 2, 2, 1), n(3, 0, null, 1), n(2, 1, 1, 1)],
              [n(2, 0, null, 2), n(3, 0, null, 0.5), n(3, 0, null, 0.5)],
              [n(3, 2, 2, 1), n(3, 0, null, 1), n(2, 3, 3, 1)],
              [n(2, 1, 1, 3)],
              [r(3)],
              [r(2), n(3, 0, null, 0.5), n(3, 0, null, 0.5)],
            ],
          },
          {
            title: 'Second part', meter: [3, 4], tip: 'Jumps up to the high e string, fret 3.',
            bars: [
              [n(3, 0, null, 0.5), n(3, 0, null, 0.5)],
              [n(1, 3, 3, 1), n(1, 0, null, 1), n(2, 1, 1, 1)],
              [n(2, 0, null, 1), n(3, 2, 2, 2)],
              [r(3)],
              [r(2), n(3, 0, null, 0.5), n(3, 0, null, 0.5)],
            ],
          },
          {
            title: 'Last part', meter: [3, 4], tip: 'Index finger on fret 1, ring on fret 3.',
            bars: [
              [n(1, 1, 1, 0.5), n(1, 1, 1, 0.5)],
              [n(1, 0, null, 1), n(2, 1, 1, 1), n(2, 3, 3, 1)],
              [n(2, 1, 1, 3)],
              [r(3)],
              [r(2), n(1, 1, 1, 0.5), n(1, 1, 1, 0.5)],
            ],
          },
        ],
      },
      {
        day: 5, title: 'D and its many friends',
        exercises: [
          { title: 'D chord', tip: 'Only strum the top four strings.', bars: [...wholeRest('D'), ...wholeRest('D')] },
          { title: 'D to Em', tip: 'Big shape change: lift everything and land Em in one go.', bars: [...wholeRest('D'), ...wholeRest('Em'), ...wholeRest('D'), ...wholeRest('Em'), ...halvesWhole('D'), ...halvesWhole('Em'), ...halvesWhole('D'), ...halvesWhole('Em')] },
          { title: 'G to D', tip: 'Keep the ring finger near fret 3 as a guide.', bars: [...wholeRest('G'), ...wholeRest('D'), ...wholeRest('G'), ...wholeRest('D'), ...halvesWhole('G'), ...halvesWhole('D'), ...halvesWhole('G'), ...halvesWhole('D')] },
          { title: 'C to D', tip: 'Ring finger slides from the A string to the B string.', bars: [...wholeRest('C'), ...wholeRest('D'), ...wholeRest('C'), ...wholeRest('D'), ...halvesWhole('C'), ...halvesWhole('D'), ...halvesWhole('C'), ...halvesWhole('D')] },
        ],
      },
      {
        day: 6, title: '4 chords, 1000 songs',
        exercises: [
          { title: 'Whole notes', tip: 'G, D, Em, C — one strum each.', bars: [[ch('G', 4)], [ch('D', 4)], [ch('Em', 4)], [ch('C', 4)]] },
          { title: '1 and 2 and', tip: 'Down-up-down-up, then let the last strum ring.', bars: [...oneAndTwoAnd('G'), ...oneAndTwoAnd('D'), ...oneAndTwoAnd('Em'), ...oneAndTwoAnd('C')] },
          { title: 'All down strums', tip: 'Eight down strums per chord. Keep your wrist loose.', bars: [...eightDowns('G'), ...eightDowns('D'), ...eightDowns('Em'), ...eightDowns('C')] },
        ],
      },
    ],
  },
];

COURSE.push(...GRADES_3_TO_6);

// Flatten an exercise into a timeline of events with start beats and bar info.
export function buildTimeline(exercise, dayMeter) {
  const meter = exercise.meter || dayMeter || [4, 4];
  const barLen = (meter[0] * 4) / meter[1];
  const events = [];
  const bars = [];
  let beat = 0;
  exercise.bars.forEach((bar, bi) => {
    const len = bar.reduce((a, e) => a + e.beats, 0);
    bars.push({ start: beat, length: len, full: Math.abs(len - barLen) < 1e-6 });
    bar.forEach((ev) => {
      events.push({ ...ev, bar: bi, start: beat });
      beat += ev.beats;
    });
  });
  return { meter, barLen, events, bars, total: beat };
}
