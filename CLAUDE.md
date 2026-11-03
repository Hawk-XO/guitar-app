# Fretboard coach — notes for Claude Code

Personal guitar-learning web app for a right-handed beginner on an ESP LTD Viper-10 (24.75" scale, 22 frets, SG-style offset double cutaway), standard tuning, playing unplugged. Laptop only (desktop browser).

## Stack and conventions
- Plain ES modules, no build step. three.js 0.160 via the import map in `index.html`. Serve with any static server (`python -m http.server 5173`).
- Strings use tab numbering: 1 = high e (thinnest) … 6 = low E (thickest).
- Fingers: 1 index (#378ADD), 2 middle (#639922), 3 ring (#EF9F27), 4 pinky (#E24B4A). `null` = open string.
- Durations are in quarter-note beats. Pick: `'d'` down, `'u'` up.
- 3D world units are inches. Headstock → +x, low E → +y, fretboard faces +z. Use `fretU`, `fingerU`, `stringY` from `guitar3d.js` for positions.
- Exercise data: Grades 1–2 in `src/data/exercises.js`, Grades 3–6 in `src/data/grades3to6.js`; chord shapes in `src/data/chords.js` (`label` = display name for alternate voicings). Validate bar lengths after edits (each full bar must sum to the meter; pickup bars may be short).
- Event fields: `beats`, `notes[{s,f,fi}]`, `pick`, `chord`, `strum`, `rest`, `tie` (keep holding, don't pick), `pm` (palm mute), `slideFrom`/`slideTo` (slide). A finger listed on several strings at the same fret = barre.

## Status: all planned phases built
- Layout: hand panel top-left, notes/tab box top-right, 3D guitar below.
- Procedural guitar with orbit controls and 4 camera presets.
- Tab box: current note, note names, chord names, pick symbols, sl. / P.M. marks, hover explanations, "How to read tab" guide.
- Finger markers (colour-coded), barre bars, slide arrows, open-string rings, muted-string crosses, ghost preview of the next note, string glow.
- **3D hands** (`src/hand3d.js`, WebXR generic hand models in `assets/`, MIT):
  - `Hand3D` (left): rigid palm anchored at the middle knuckle, planar 3-segment IK per finger (`solveChain`), thumb behind the neck. Snaps per event; barres aim the fingertip at the thickest string.
  - `PickHand` (right): fixed pick grip (thumb + curled index), follows the animated pick every frame.
  - Tunables in `HAND_TUNING`. Live tweak in the console: `__app.HAND_TUNING.knuckleHeight = 0.7; __app.goTo(__app.state.index)`.
  - UI: "3D hands" toggle and see-through slider.
- Playback: play/pause, step, restart, loop, tempo, count-in, mutable metronome with volume and accented beat 1, synth reference tone (palm mutes are short). Settings persist in localStorage.
- All Grades 1–6 transcribed (109 exercises). Fingerings for single notes and some rhythms in Grades 3–6 are best-effort readings of the PDF.

## Songs (added)
- Mode switch Grades/Songs. Songs = `songs/index.json` (repo, public on the site) + imported songs in localStorage (`fc.songs`).
- Importers in `src/import/`: MusicXML (+ .mxl via a tiny zip reader using DecompressionStream), MIDI (busiest non-drum track, 16th grid), text tab (spacing → durations). Pitch-only notes get frets via a beam search (`frets.js`), fingers via one-finger-per-fret. Dead notes (`dead`) render as x and sound as a click.
- Song format: `{ title, tempo, meter, bars, source }`, bars as in exercises.
- Tempo: auto per exercise (`GRADE_TEMPO`, doubled for 6/8) or song tempo; editable number + slider; practice speed % (player.bpm = tempo × speed).
- Tones: synth `'acoustic'|'clean'|'dist'` (distortion = waveshaper + cab EQ) and samples `'sample-acoustic'|'sample-clean'|'sample-dist'` via `Sampler` (one MP3 per MIDI note 40–88 in `assets/sounds/<set>/`, lazy-loaded, nearest-note repitch). Dead notes and palm mutes use the `muted` sample set at the note's pitch (synth fallback: damped pitched pluck + scrape).
- Sliders: `src/slider.js` replaces every range input with a drawn one (thumb asset `assets/ui/slider-thumb.svg`); call `syncSliders()` after setting a value in code.
- Guitar Pro files and picture PDFs are not parsed: user exports MusicXML first. Do not transcribe copyrighted songs note by note.

## Next steps (after the user has tried it)
1. Tune hand poses from user feedback (finger curl, wrist angle, thumb, pick grip). Consider per-chord overrides in `chords.js` (e.g. `hand: { knuckleHeight, thumb }`).
2. Check transcriptions against the PDF where the user spots a mismatch.
3. Polish: loop a selected range (A–B), nicer guitar body detail, smoother hand mesh.

## Future (not now)
- Mic listener ("piano tiles"): pitch-detect what the user plays and mark notes green/red against the tab. Unplugged electric is quiet; works best with a USB audio interface.
