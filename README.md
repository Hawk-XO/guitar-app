# Fretboard coach

A laptop web app for learning guitar from the Beginner Learning Pathway exercises (Grades 1–6): a rotatable 3D guitar with see-through 3D hands showing each grip, colour-coded finger markers, a tab box that explains every note, a left-hand finger panel, an animated pick, and a mutable metronome.

> The exercises in `src/data/exercises.js` are transcribed from Pickup Music's material for personal practice. Keep this repo private.

## Run it (Windows)

The app is plain HTML + JavaScript modules, so there's no build step. Browsers won't load modules from a double-clicked file, so serve the folder with any one of these:

- **VS Code:** install the "Live Server" extension, open this folder, right-click `index.html` → *Open with Live Server*.
- **Python** (you have it via conda): open a terminal in this folder and run
  `python -m http.server 5173`, then go to <http://localhost:5173>.
- **Node:** `npx serve .`

Needs an internet connection the first time (three.js loads from a CDN).

## Using it

| Control | What it does |
|---|---|
| Grade / Day / Exercise | Pick an exercise from the PDF |
| ▶ Play / Space | Play with count-in, metronome and reference sound |
| ◀ ▶ / arrow keys | Step one note at a time (plays that note) |
| Tempo slider | Beats per minute (eighth notes for 6/8 exercises) |
| Click on / M | Mute or unmute the metronome; slider next to it sets its volume |
| Count-in, Loop, Guitar sound | Toggles |
| Hover a tab number | Plain-English explanation of that note |
| ? | How to read tab |
| Click a finger (hand panel or 3D marker) | Highlights that finger in both places |
| View buttons | Like the tab · Player view · Audience · Behind neck |
| 3D hands + slider | Show/hide both hands and set how see-through they are |

## Project layout

```
index.html          layout + import map (three.js)
styles.css
src/main.js         wiring: pickers, stepping, transport, shortcuts
src/guitar3d.js     procedural Viper-10 style guitar, finger markers, pick animation, camera views
src/tab.js          SVG tab renderer + hover explanations
src/hand2d.js       2D left-hand panel
src/hand3d.js       3D fretting hand (IK per finger) and picking hand
src/audio.js        metronome, synth guitar tone, playback scheduler
src/theory.js       tuning, note names, explanations
src/data/chords.js  chord shapes with fingerings
src/data/exercises.js  Grades 1–2 + timeline builder
src/data/grades3to6.js Grades 3–6
assets/             hand models (MIT, see HAND-MODEL-LICENSE.md)
```

See `CLAUDE.md` for the roadmap and conventions.
