// Grades 3–6, transcribed from "Beginner Compiled Exercises" (Pickup Music). Personal practice only.
// Same conventions as exercises.js: beats in quarter notes, strings 1 (high e) … 6 (low E).

import { chordNotes } from './chords.js';

const n = (s, f, fi, beats, pick = 'd', extra = {}) => ({ beats, pick, notes: [{ s, f, fi: f === 0 ? null : fi }], ...extra });
const multi = (notes, beats, pick = 'd') => ({ beats, pick, notes: notes.map(([s, f, fi]) => ({ s, f, fi: f === 0 ? null : fi })) });
const tie = (s, f, fi, beats) => ({ beats, tie: true, notes: [{ s, f, fi: f === 0 ? null : fi }] });
const r = (beats) => ({ beats, rest: true, notes: [] });
const ch = (name, beats, pick = 'd', extra = {}) => ({ beats, pick, chord: name, strum: true, notes: chordNotes(name), ...extra });
const chTie = (name, beats) => ({ beats, tie: true, chord: name, strum: true, notes: chordNotes(name) });
const rep = (count, fn) => Array.from({ length: count }, (_, i) => fn(i));
const alt = (i) => (i % 2 === 0 ? 'd' : 'u');
const pmBar = (bar) => bar.map((e) => (e.rest ? e : { ...e, pm: true }));

// ---------------------------------------------------------------- Grade 3
const twoHitsRest = (name) => [ch(name, 1), ch(name, 1), r(2)];
const fourEighthsRest = (name) => [...rep(4, () => ch(name, 0.5)), r(2)];

const bluesRiff = (s, hi, lo) => [n(s, hi, 3, 0.5), n(s, hi, 3, 0.5), n(s, hi, 3, 0.5), n(s, lo, 1, 0.5), n(s, lo, 1, 0.5), r(1.5)];
const A7r = () => bluesRiff(6, 5, 3);
const D7r = () => bluesRiff(5, 5, 3);
const E7r = () => bluesRiff(5, 7, 5);
const turnaround = [n(6, 5, 3, 0.5), n(6, 5, 3, 0.5), n(6, 5, 3, 0.5), n(6, 3, 1, 0.5), n(6, 3, 1, 0.5), n(6, 0, null, 0.5), n(6, 3, 1, 0.5), n(6, 0, null, 0.5)];
const twelveBar = (A, D, E, last) => [A(), A(), A(), A(), D(), D(), A(), A(), E(), D(), A(), last ? last() : A()];

const dudu = (name) => [ch(name, 0.5, 'd'), ch(name, 0.5, 'u'), ch(name, 0.5, 'd'), ch(name, 2.5, 'u')];
const ddUudud = (name) => [ch(name, 1, 'd'), ch(name, 0.5, 'd'), ch(name, 1, 'u'), ch(name, 0.5, 'u'), ch(name, 0.5, 'd'), ch(name, 0.5, 'u')];
const constantDU = (name) => rep(8, (i) => ch(name, 0.5, alt(i)));
const fourQ = (name) => rep(4, () => ch(name, 1));
const charleston = (name) => [ch(name, 1.5), ch(name, 0.5), r(2)];

const GRADE3 = {
  grade: 3,
  days: [
    {
      day: 1, title: 'E-string power chords',
      exercises: [
        { title: 'A power chord', tip: 'Index on low E fret 5, ring on A fret 7. Mute the other strings with the underside of your fingers.', bars: [...rep(4, () => twoHitsRest('A5')), ...rep(4, () => fourEighthsRest('A5'))] },
        { title: 'Open E power chord', tip: 'Open low E plus two fingers on fret 2.', bars: [...rep(4, () => twoHitsRest('E5')), ...rep(4, () => fourEighthsRest('E5'))] },
        { title: 'Put it together', tip: 'Two bars of A5, two bars of E5.', bars: [twoHitsRest('A5'), twoHitsRest('A5'), twoHitsRest('E5'), twoHitsRest('E5'), fourEighthsRest('A5'), fourEighthsRest('A5'), fourEighthsRest('E5'), fourEighthsRest('E5')] },
      ],
    },
    {
      day: 2, title: 'Upstrums',
      exercises: [
        { title: 'Down, up, down, up', tip: 'Up strums come back up through the strings — they can be lighter, just the top few strings.', bars: [dudu('Am'), dudu('Am'), dudu('Em'), dudu('Em')] },
        { title: 'Down, down, up, up, down, up, down', tip: 'Keep your hand moving down-up even when you don’t hit the strings.', bars: [ddUudud('Am'), [ch('Am', 4)], ddUudud('Em'), [ch('Em', 4)]] },
        { title: 'Constant down up', tip: 'Eighth notes all the way: down on the numbers, up on the "ands".', bars: [constantDU('Am'), constantDU('Am'), constantDU('Em'), constantDU('Em')] },
      ],
    },
    {
      day: 3, title: 'Bluesin’ on a riff',
      exercises: [
        { title: 'Main riff', tip: 'A 12-bar blues. The riff moves to the A string for D7 and up two frets for E7.', bars: twelveBar(A7r, D7r, E7r) },
        { title: 'Add turnaround riff', tip: 'The last bar walks down to the open E to loop back round.', bars: twelveBar(A7r, D7r, E7r, () => turnaround) },
        { title: 'Add palm muting', tip: 'P.M.: rest the side of your picking hand lightly on the strings near the bridge for a chunky, muted sound.', bars: twelveBar(() => pmBar(A7r()), () => pmBar(D7r()), () => pmBar(E7r()), () => pmBar(turnaround)) },
      ],
    },
    {
      day: 4, title: 'A and its many friends',
      exercises: [
        { title: 'Stays on A', tip: 'Index, middle, ring in a row on fret 2.', bars: [[ch('A', 4)], [chTie('A', 4)], [ch('A', 4)], [chTie('A', 4)], fourQ('A'), [ch('A', 4)], fourQ('A'), [ch('A', 4)]] },
        { title: 'Switching from A to D', tip: 'Keep the index on the G string as a guide.', bars: [[ch('A', 4)], [chTie('A', 4)], [ch('D', 4)], [chTie('D', 4)], fourQ('A'), [ch('A', 4)], fourQ('D'), [ch('D', 4)]] },
        { title: 'Switching from A to E', tip: 'Move all three fingers together as one shape.', bars: [[ch('A', 4)], [chTie('A', 4)], [ch('E', 4)], [chTie('E', 4)], fourQ('A'), [ch('A', 4)], fourQ('E'), [ch('E', 4)]] },
      ],
    },
    {
      day: 5, title: 'A-string power chords',
      exercises: [
        { title: 'Stay on D', tip: 'Short, punchy hits: release the pressure right after each strum.', bars: [...rep(4, () => twoHitsRest('D5')), ...rep(4, () => fourEighthsRest('D5'))] },
        { title: 'Stay on C', tip: 'The same shape two frets lower.', bars: [...rep(4, () => twoHitsRest('C5')), ...rep(4, () => fourEighthsRest('C5'))] },
        { title: 'D to C', tip: 'Slide the whole shape down two frets without lifting.', bars: [twoHitsRest('D5'), twoHitsRest('D5'), twoHitsRest('C5'), twoHitsRest('C5'), fourEighthsRest('D5'), fourEighthsRest('D5'), fourEighthsRest('C5'), fourEighthsRest('C5')] },
      ],
    },
    {
      day: 6, title: 'Bluesin’ on A7, D7 and E7',
      exercises: [
        { title: 'Whole notes', tip: '12-bar blues with one strum per bar.', bars: twelveBar(() => [ch('A7', 4)], () => [ch('D7', 4)], () => [ch('E7', 4)]) },
        { title: 'Charleston', tip: 'Strum on beat 1, then on the "and" of 2. Short and bouncy.', bars: twelveBar(() => charleston('A7'), () => charleston('D7'), () => charleston('E7')) },
        {
          title: 'Down ups with a break', tip: 'A bar of down-ups, then a bar to let it ring.',
          bars: [constantDU('A7'), [ch('A7', 4)], constantDU('A7'), [ch('A7', 4)], constantDU('D7'), [ch('D7', 4)], constantDU('A7'), [ch('A7', 4)],
            [ch('E7', 0.5, 'd'), ch('E7', 0.5, 'u'), ch('E7', 0.5, 'd'), ch('E7', 2.5, 'u')], [ch('D7', 0.5, 'd'), ch('D7', 0.5, 'u'), ch('D7', 0.5, 'd'), ch('D7', 2.5, 'u')], constantDU('A7'), [ch('A7', 4)]],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------- Grade 4
const riffBar1 = [n(5, 2, 1, 1), r(1), n(5, 4, 3, 1), r(0.5), n(5, 5, 4, 0.5)];
const hit = (name) => [ch(name, 1), r(3)];
const sus = (a, b) => [[ch(a, 4)], [ch(b, 4)]];
const qqh = (name) => [ch(name, 1), ch(name, 1), ch(name, 2)];
const powerQ = (a, b) => [ch(a, 1), r(1), ch(b, 1), r(1)];
const powerSync = (a, b) => [ch(a, 1), ch(a, 1), r(0.5), ch(b, 0.5), ch(b, 1)];

// "1 2-and 3-and 4-and" strum used in Day 5: down, down, (up tied), up, down, up
const g4strum = (name) => [ch(name, 1, 'd'), ch(name, 0.5, 'd'), ch(name, 1, 'u'), ch(name, 0.5, 'u'), ch(name, 0.5, 'd'), ch(name, 0.5, 'u')];
const fsRiffBar = [n(6, 2, 1, 1), n(5, 0, null, 1), n(6, 2, 1, 1), n(5, 0, null, 1)];
const e5RiffBar = [n(6, 0, null, 1), n(5, 2, 2, 0.5), n(6, 0, null, 0.5), tie(6, 0, null, 0.5), n(5, 2, 2, 0.5), n(5, 0, null, 1)];
// Slide with the ring finger: it stays on the string from fret 2 to fret 5.
const slideLick = [
  [n(1, 2, 3, 1.5), n(1, 2, 3, 0.5, 'd', { slideTo: 5 }), n(1, 5, 3, 1, 'd', { slideFrom: 2 }), n(1, 5, 3, 1)],
  [n(1, 0, null, 1.5), n(1, 7, 3, 0.5), tie(1, 7, 3, 1), n(1, 5, 1, 1)],
  [n(1, 2, 3, 1.5), n(1, 2, 3, 0.5, 'd', { slideTo: 5 }), n(1, 5, 3, 1, 'd', { slideFrom: 2 }), n(1, 5, 3, 1)],
  [n(1, 0, null, 4)],
];

const GRADE4 = {
  grade: 4,
  days: [
    {
      day: 1, title: 'Combining riffs and chords',
      exercises: [
        { title: 'Riff', tip: 'All on the A string: index on 2, ring on 4, pinky on 5.', bars: [riffBar1, [tie(5, 5, 4, 3), n(5, 4, 3, 1)], riffBar1, [tie(5, 5, 4, 1.5), n(5, 5, 4, 0.5), n(5, 5, 4, 1), n(5, 4, 3, 1)]] },
        { title: 'Power chord hits', tip: 'One hit per bar, let it ring.', bars: [hit('E5'), hit('E5'), hit('A5 (3 note)'), hit('A5 (3 note)')] },
        { title: 'Chords', tip: 'E, B5, E, A — one strum each.', bars: [[ch('E', 4)], [ch('B5', 4)], [ch('E', 4)], [ch('A', 4)]] },
      ],
    },
    {
      day: 2, title: 'Dsus and Esus',
      exercises: [
        { title: 'Dsus4 to D', tip: 'Just add and remove the pinky.', bars: sus('Dsus4', 'D') },
        { title: 'Esus4 to E', tip: 'Pinky on G fret 2 for sus4, then swap it for the index on fret 1.', bars: sus('Esus4', 'E') },
        {
          title: 'Put it together', tip: 'Sus4 → major creates a little movement inside the chord.',
          bars: [[ch('Dsus4', 4)], [ch('D', 4)], [ch('Dsus4', 4)], [ch('D', 4)], [ch('Esus4', 4)], [ch('E', 4)], [ch('Esus4', 4)], [ch('E', 4)],
            qqh('Dsus4'), qqh('D'), qqh('Dsus4'), qqh('D'), qqh('Esus4'), qqh('E'), qqh('Esus4'), qqh('E')],
        },
      ],
    },
    {
      day: 3, title: 'Combining power chords',
      exercises: [
        { title: 'Root notes', tip: 'Just the bottom note of each power chord first.', bars: [[n(6, 5, 1, 1), r(1), n(5, 5, 1, 1), r(1)], [n(5, 7, 3, 1), r(1), n(5, 5, 1, 1), r(1)]] },
        { title: 'Power chords', tip: 'A5, D5, E5, D5 — same shape, moving around.', bars: [powerQ('A5', 'D5'), powerQ('E5 (A string)', 'D5')] },
        { title: 'With rhythm', tip: 'Two hits, then a quick one on the "and".', bars: [powerSync('A5', 'D5'), powerSync('E5 (A string)', 'D5')] },
      ],
    },
    {
      day: 4, title: 'Picking accuracy and the slide',
      exercises: [
        { title: 'Picking accuracy', tip: 'Jump cleanly between the low E and A strings.', bars: [[r(1), r(0.5), n(6, 0, null, 0.5), n(6, 0, null, 1), n(6, 1, 1, 1)], fsRiffBar, e5RiffBar, fsRiffBar, [n(6, 0, null, 1), r(0.5), n(6, 0, null, 0.5), n(6, 0, null, 1), n(6, 1, 1, 1)]] },
        { title: 'The slide', tip: 'sl. = pick once, then keep pressing and slide your finger up to the new fret.', bars: slideLick },
        { title: 'Put it together', tip: 'Riff, then the slide lick.', bars: [[r(1), r(0.5), n(6, 0, null, 0.5), n(6, 0, null, 1), n(6, 1, 1, 1)], fsRiffBar, e5RiffBar, fsRiffBar, [n(6, 0, null, 4)], ...slideLick] },
      ],
    },
    {
      day: 5, title: 'Classic chords, strum and walkdown',
      exercises: [
        { title: 'Whole notes', tip: 'G, Em, C, D, G.', bars: [[ch('G', 4)], [ch('G', 4)], [ch('Em', 4)], [ch('Em', 4)], [ch('C', 4)], [ch('D', 4)], [ch('G', 4)], [ch('G', 4)]] },
        { title: 'Strum pattern', tip: 'Down, down-up, up-down-up.', bars: [g4strum('G'), [ch('G', 4)], g4strum('Em'), [ch('Em', 4)], [ch('C', 1), ch('C', 0.5), ch('C', 2.5, 'u')], [ch('D', 1), ch('D', 0.5), ch('D', 2.5, 'u')], g4strum('G'), g4strum('G')] },
        { title: 'With the walkdown', tip: 'Single notes 3-2-0 on the low E lead you from G into Em.', bars: [g4strum('G'), [ch('G', 1), ch('G', 0.5), ch('G', 1, 'u'), n(6, 3, 2, 0.5), n(6, 2, 1, 0.5), n(6, 0, null, 0.5)], g4strum('Em'), g4strum('Em'), g4strum('C'), g4strum('D'), g4strum('G'), [ch('G', 4)]] },
      ],
    },
    {
      day: 6, title: 'Quick switchin’ anti-wiggle chords',
      exercises: [
        { title: 'Short hits', tip: 'Hit each chord and move straight on.', bars: [[ch('C', 1), r(1), ch('G', 1), r(1)], [ch('D', 1), r(1), ch('A', 1), r(1)], [ch('E', 4)], [ch('E', 4)]] },
        { title: 'Half notes', tip: 'Two beats each.', bars: [[ch('C', 2), ch('G', 2)], [ch('D', 2), ch('A', 2)], [ch('E', 4)], [ch('E', 4)]] },
        { title: 'Compact shapes', tip: 'Three-string versions that barely move your hand.', bars: [[ch('C (3)', 2), ch('G (3)', 2)], [ch('D (3)', 2), ch('A (3)', 2)], [ch('E', 4)], [ch('E', 4)]] },
      ],
    },
  ],
};

// ---------------------------------------------------------------- Grade 5
const arp = (notes, last = 2.5) => notes.map(([s, f, fi], i) => (i < notes.length - 1 ? n(s, f, fi, 0.5) : { ...n(s, f, fi, last) }));
const dmaj7Arp = arp([[4, 0], [3, 2, 1], [2, 2, 1], [1, 2, 1]]);
const amaj7Arp = [n(5, 0, null, 0.5), n(4, 2, 2, 0.5), n(3, 1, 1, 0.5), n(2, 2, 3, 0.5), multi([[1, 0], [2, 2, 3]], 2)];
const downs4h = (name) => [ch(name, 0.5), ch(name, 0.5), ch(name, 0.5), ch(name, 2.5)];

const melody1 = [
  [n(5, 0, null, 1), n(5, 3, 3, 1), n(4, 2, 2, 1), r(1)],
  [n(4, 0, null, 1), n(4, 3, 3, 1), n(3, 2, 2, 1), r(1)],
  [n(3, 1, 1, 1), n(3, 2, 2, 1), n(2, 0, null, 1), n(3, 1, 1, 1)],
  [n(3, 2, 2, 4)],
];
const melody2 = [
  [n(5, 0, null, 1), n(5, 3, 3, 1), n(4, 2, 2, 1), r(1)],
  [n(4, 0, null, 1), n(4, 3, 3, 1), n(3, 2, 2, 1), n(3, 2, 2, 1)],
  [n(3, 1, 1, 1), n(3, 2, 2, 1), n(2, 0, null, 1), n(3, 1, 1, 1)],
  [n(3, 2, 2, 1), n(4, 2, 2, 1), n(5, 0, null, 1), r(1)],
];

const GRADE5 = {
  grade: 5,
  days: [
    {
      day: 1, title: 'The easiest bar chord',
      exercises: [
        { title: 'Wiggle and strum Dmaj7', tip: 'Index flat across G, B and e at fret 2. Strum, then arpeggiate (pick one string at a time).', bars: [[ch('Dmaj7', 4)], [r(4)], [ch('Dmaj7', 4)], [r(4)], dmaj7Arp, [r(4)], dmaj7Arp, [r(4)], [r(4)], [ch('Amaj7', 4)], [r(4)], [ch('Amaj7', 4)]] },
        { title: 'Amaj7', tip: 'Arpeggiate from the open A string up.', bars: [[r(4)], amaj7Arp, [r(4)], amaj7Arp] },
        { title: 'Both chords', tip: 'Strum both, then arpeggiate both.', bars: [[ch('Dmaj7', 4)], [ch('Amaj7', 4)], [ch('Dmaj7', 4)], [ch('Amaj7', 4)], dmaj7Arp, amaj7Arp, dmaj7Arp, amaj7Arp] },
      ],
    },
    {
      day: 2, title: 'Jazzy 7th chords',
      exercises: [
        { title: 'Dm7', tip: 'Index flat across B and e at fret 1.', bars: [[ch('Dm7', 4)], [r(4)], [ch('Dm7', 4)], [r(4)], arp([[4, 0], [3, 2, 2], [2, 1, 1], [1, 1, 1]]), [r(4)], arp([[4, 0], [3, 2, 2], [2, 1, 1], [1, 1, 1]]), [r(4)]] },
        { title: 'G7', tip: 'Ring on low E 3, middle on A 2, index on high e 1.', bars: [[ch('G7', 4)], [r(4)], [ch('G7', 4)], [r(4)], [...arp([[6, 3, 3], [5, 2, 2], [4, 0], [3, 0]], 0.5), multi([[2, 0], [1, 1, 1]], 2)], [r(4)], [...arp([[6, 3, 3], [5, 2, 2], [4, 0], [3, 0]], 0.5), multi([[2, 0], [1, 1, 1]], 2)], [r(4)]] },
        { title: 'Cmaj7', tip: 'C with the index lifted — let the open strings ring.', bars: [[ch('Cmaj7', 4)], [r(4)], [ch('Cmaj7', 4)], [r(4)], [...arp([[5, 3, 3], [4, 2, 2], [3, 0]], 0.5), multi([[2, 0], [1, 0]], 2.5)], [r(4)], [...arp([[5, 3, 3], [4, 2, 2], [3, 0]], 0.5), multi([[2, 0], [1, 0]], 2.5)], [r(4)]] },
      ],
    },
    {
      day: 3, title: 'Gamer’s minor melody',
      exercises: [
        { title: '1st part', tip: 'Am, Dm, E, Am arpeggios: short, detached notes.', bars: [...melody1, [r(4)], [r(4)]] },
        { title: '2nd part', tip: 'Same start, new ending going back down.', bars: [...melody2, [r(4)], [r(4)]] },
        { title: 'Put it together', tip: 'Part one into part two.', bars: [...melody1, ...melody2, [r(4)], [r(4)]] },
      ],
    },
    {
      day: 4, title: 'The 5th-string minor bar chord',
      exercises: [
        { title: 'Individual notes', tip: 'Pick each note of Bm separately to check every string rings.', bars: [[n(5, 2, 1, 1), n(4, 4, 3, 1), n(2, 0, null, 1), n(2, 3, 2, 1)], [n(1, 2, 1, 4)], [r(4)], [r(4)]] },
        { title: 'Strum the chord', tip: 'Press the index flat with the bony side, close to the fret.', bars: [[ch('Bm', 4)], [r(4)], [ch('Bm', 4)], [r(4)]] },
        { title: 'Strum and wiggle with track', tip: 'Four downs then let it ring; wiggle off and on in the rest bar.', bars: [downs4h('Bm'), [r(4)], downs4h('Bm'), [r(4)]] },
      ],
    },
    {
      day: 5, title: 'Adding Bm to a chord progression',
      exercises: [
        { title: 'E to Bm and Bm to A', tip: 'One strum per chord, focus on the change.', bars: [[ch('E', 4)], [ch('Bm', 4)], [ch('A', 4)], [ch('E', 4)]] },
        { title: 'Whole notes', tip: 'Same again, a little faster.', bars: [[ch('E', 4)], [ch('Bm', 4)], [ch('A', 4)], [ch('E', 4)]] },
        { title: 'Add extra strums', tip: 'Four downs, then let it ring.', bars: [downs4h('E'), downs4h('Bm'), downs4h('A'), downs4h('E')] },
      ],
    },
    {
      day: 6, title: 'The 6th-string major bar chord',
      exercises: [
        { title: 'Individual notes', tip: 'The A bar chord one string at a time.', bars: [[n(6, 5, 1, 1), n(5, 7, 3, 1), n(4, 7, 4, 1), n(3, 6, 2, 1)], [n(2, 5, 1, 1), n(1, 5, 1, 3)], [r(4)], [r(4)]] },
        { title: 'Strum the chord', tip: 'Index barre across fret 5, the E shape with the other three fingers.', bars: [[ch('A (bar)', 4)], [r(4)], [ch('A (bar)', 4)], [r(4)]] },
        { title: 'Strum and wiggle with track', tip: 'Four strums then a long one.', bars: [fourQ('A (bar)'), [ch('A (bar)', 4)], [r(4)], [r(4)]] },
      ],
    },
  ],
};

// ---------------------------------------------------------------- Grade 6
const moveable = (name) => [ch(name, 1.5), ch(name, 2.5)];
const stab = (name) => [ch(name, 0.5), r(0.5), r(0.5), ch(name, 0.5), r(2)];
const altPick = (s, fourBeats) => (fourBeats ? rep(8, (i) => n(s, 0, null, 0.5, alt(i))) : [n(s, 0, null, 0.5, 'd'), n(s, 0, null, 0.5, 'u'), n(s, 0, null, 0.5, 'd'), n(s, 0, null, 2.5, 'u')]);
const crossPick = (end) => {
  const seq = [[3, 0], [2, 0], [3, 0], [1, 0]];
  const notes = [...seq, ...seq].map(([s, f], i) => n(s, f, null, 0.5, alt(i)));
  if (end) return [...notes.slice(0, 3), n(1, 0, null, 2.5, 'u')];
  return notes;
};
const arpG = (b, e, fiB, fiE) => {
  const seq = [[3, 0, null], [2, b, fiB], [3, 0, null], [1, e, fiE]];
  return {
    full: [...seq, ...seq].map(([s, f, fi], i) => n(s, f, fi, 0.5, alt(i))),
    end: [...seq.slice(0, 3).map(([s, f, fi], i) => n(s, f, fi, 0.5, alt(i))), n(1, e, fiE, 2.5, 'u')],
  };
};
const g6 = arpG(3, 0, 3, null);
const cg = arpG(1, 0, 1, null);
const gg = arpG(0, 3, null, 3);

const GRADE6 = {
  grade: 6,
  days: [
    {
      day: 1, title: 'Combining major and minor bar chords',
      exercises: [
        { title: 'C#m to G#', tip: '5th-string minor shape to 6th-string major shape.', bars: [[ch('C#m', 4)], [ch('G#', 4)]] },
        { title: 'G# to A', tip: 'Slide the whole bar chord up one fret.', bars: [[ch('G#', 4)], [ch('A (bar)', 4)]] },
        { title: 'A to E', tip: 'Bar chord to open chord: the same shape, without the barre.', bars: [[ch('A (bar)', 4)], [ch('E', 4)]] },
      ],
    },
    {
      day: 2, title: '5th-string bar chord',
      exercises: [
        { title: 'D', tip: 'Index on A fret 5, ring finger flat across fret 7. Don’t play the high e.', bars: [[ch('D (bar)', 4)], [r(4)]] },
        { title: 'D7', tip: 'Index barre at fret 5, ring and pinky on fret 7.', bars: [[ch('D7 (bar)', 4)], [r(4)]] },
        { title: 'D, D7, G', tip: 'Two bars each.', bars: [[ch('D (bar)', 4)], [ch('D (bar)', 4)], [ch('D7 (bar)', 4)], [ch('D7 (bar)', 4)], [ch('G', 4)], [ch('G', 4)]] },
      ],
    },
    {
      day: 3, title: 'Moveable open-string chords',
      exercises: [
        { title: 'E family', tip: 'Slide the E shape up the neck while the open strings ring.', bars: [moveable('E'), moveable('E'), moveable('Emaj9'), moveable('Emaj9'), moveable('Aadd2/E'), moveable('Aadd2/E'), [ch('E', 1.5), ch('E', 1.5), ch('Esus4', 1)], [ch('E', 4)]] },
        { title: 'A minor family', tip: 'The Am shape slid up the neck.', bars: [moveable('Am'), moveable('Am'), moveable('Am9'), moveable('Am9'), moveable('Dm9/A'), moveable('Dm9/A'), [ch('Am', 1.5), ch('Am', 1.5), ch('Asus2', 1)], [ch('Am', 4)]] },
        { title: 'D family', tip: 'The D shape slid up and down with the open D ringing.', bars: [moveable('D'), moveable('D'), moveable('Dm7 (up)'), moveable('Dm7 (up)'), moveable('E/D'), moveable('E/D'), moveable('D#/D'), moveable('D#/D'), [ch('D', 1.5), ch('D', 1.5), ch('Dsus4', 1)], [ch('D', 4)]] },
      ],
    },
    {
      day: 4, title: '6th-string bar chord',
      exercises: [
        { title: 'Gm', tip: 'Em shape barred at fret 3. Short stabs.', bars: [stab('Gm'), stab('Gm')] },
        { title: 'C7', tip: 'E7 shape barred at fret 8.', bars: [stab('C7 (bar)'), stab('C7 (bar)')] },
        { title: 'Gm to C7', tip: 'Jump the barre from fret 3 to fret 8.', bars: [stab('Gm'), stab('Gm'), stab('Gm'), stab('Gm'), stab('C7 (bar)'), stab('C7 (bar)'), stab('C7 (bar)'), stab('C7 (bar)')] },
      ],
    },
    {
      day: 5, title: 'Intro to alternate picking',
      exercises: [
        { title: 'One string', tip: 'Strict down-up-down-up, even when the note doesn’t change.', bars: [altPick(3, true), altPick(3, false), altPick(2, true), altPick(2, false), altPick(1, true), altPick(1, false), altPick(3, true), altPick(3, false)] },
        { title: 'Crossing strings', tip: 'G, B, G, e — keep alternating while you skip strings.', bars: [crossPick(false), crossPick(false), crossPick(true)] },
        { title: 'Arpeggios', tip: 'G6, C/G and G using the same picking pattern.', bars: [g6.full, g6.end, cg.full, cg.end, gg.full, gg.end] },
      ],
    },
    {
      day: 6, title: 'Combining major and minor bar chords pt. II',
      exercises: [
        { title: 'Whole notes', tip: 'Bm, F#, A, E, G, D, Em, F#.', bars: ['Bm', 'F#', 'A', 'E', 'G', 'D', 'Em', 'F#'].map((c) => [ch(c, 4)]) },
        { title: 'With F#7', tip: 'G, D, F#7, Bm, then G, D, Em, F#.', bars: ['G', 'D', 'F#7', 'Bm', 'G', 'D', 'Em', 'F#'].map((c) => [ch(c, 4)]) },
        { title: 'The whole song', tip: 'Two chords per bar.', bars: [[ch('Bm', 2), ch('F#', 2)], [ch('A', 2), ch('E', 2)], [ch('G', 2), ch('D', 2)], [ch('Em', 2), ch('F#', 2)], [ch('G', 2), ch('D', 2)], [ch('F#7', 2), ch('Bm', 2)], [ch('G', 2), ch('D', 2)], [ch('Em', 2), ch('F#', 2)]] },
      ],
    },
  ],
};

export const GRADES_3_TO_6 = [GRADE3, GRADE4, GRADE5, GRADE6];
