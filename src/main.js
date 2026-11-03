import { COURSE, buildTimeline } from './data/exercises.js';
import { Guitar3D, PRESET_NAMES } from './guitar3d.js';
import { Hand3D, PickHand, HAND_TUNING } from './hand3d.js';
import { TabView } from './tab.js';
import { HandPanel } from './hand2d.js';
import { AudioEngine, Player } from './audio.js';
import { TAB_GUIDE } from './theory.js';
import { upgradeAll, syncSliders } from './slider.js';
import { loadLibrary, saveLocal, removeLocal, downloadSong } from './songs.js';
import { importFile, ACCEPT } from './import/index.js';

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem('fc.' + k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem('fc.' + k, JSON.stringify(v));
    } catch {}
  },
};

const state = {
  mode: store.get('mode', 'grades'),
  songId: store.get('songId', null),
  songs: [],
  tempo: 60, // the music's tempo as set by the user (before practice speed)
  autoTempo: 60,
  grade: store.get('grade', 0),
  day: store.get('day', 0),
  ex: store.get('ex', 0),
  index: 0,
  timeline: null,
};

// ---------------------------------------------------------------- views
const guitar = new Guitar3D($('guitar'), {
  onFingerClick: (f) => {
    hand.flash(f);
    guitar.pulseFinger(f);
  },
});
const hand3d = new Hand3D(guitar.scene);
const pickHand = new PickHand(guitar.scene, guitar.pick);
guitar.onTick = () => pickHand.follow();
const hands = [hand3d, pickHand];
const hand = new HandPanel($('handSvg'), $('handText'), { onFingerClick: (f) => guitar.pulseFinger(f) });
const tab = new TabView($('tab'), $('tooltip'), {
  onSelect: (i) => {
    if (player.playing) player.play(i);
    else goTo(i, true);
  },
});

const engine = new AudioEngine();
const player = new Player(engine, {
  onStep: (i, ms) => goTo(i, false, ms),
  onCount: (k, total) => {
    const b = $('countBadge');
    b.hidden = k === 0;
    b.textContent = `Count-in ${k} / ${total}`;
  },
  onStop: () => setPlaying(false),
});

// camera view buttons
Object.entries(PRESET_NAMES).forEach(([key, name], i) => {
  const b = document.createElement('button');
  b.textContent = name;
  b.classList.toggle('on', i === 0);
  b.addEventListener('click', () => {
    guitar.setPreset(key);
    [...$('views').children].forEach((c) => c.classList.toggle('on', c === b));
  });
  $('views').append(b);
});

// 3D hand toggle + see-through slider
const handBtn = document.createElement('button');
handBtn.className = 'toggle';
handBtn.textContent = '3D hands';
handBtn.classList.toggle('on', store.get('hand3d', true));
hands.forEach((h) => h.setVisible(handBtn.classList.contains('on')));
handBtn.addEventListener('click', () => {
  handBtn.classList.toggle('on');
  store.set('hand3d', handBtn.classList.contains('on'));
  hands.forEach((h) => h.setVisible(handBtn.classList.contains('on')));
});
const handAlpha = document.createElement('input');
Object.assign(handAlpha, { type: 'range', min: 0.15, max: 0.9, step: 0.05, value: store.get('handAlpha', HAND_TUNING.opacity), title: 'Hand see-through' });
handAlpha.className = 'hand-alpha';
hands.forEach((h) => h.ready.then(() => h.setOpacity(Number(handAlpha.value))));
handAlpha.addEventListener('input', () => {
  hands.forEach((h) => h.setOpacity(Number(handAlpha.value)));
  store.set('handAlpha', Number(handAlpha.value));
});
$('views').prepend(handBtn, handAlpha);

// tab reading guide
$('guide').innerHTML = `<dl>${TAB_GUIDE.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl>`;
$('guideBtn').addEventListener('click', () => ($('guide').hidden = !$('guide').hidden));

// ------------------------------------------------------------- pickers
function fillSelect(sel, items, value) {
  sel.innerHTML = items.map((t, i) => `<option value="${i}">${t}</option>`).join('');
  sel.value = String(Math.min(value, items.length - 1));
  return Number(sel.value);
}

function refreshPickers() {
  state.grade = fillSelect($('grade'), COURSE.map((g) => `Grade ${g.grade}`), state.grade);
  const grade = COURSE[state.grade];
  state.day = fillSelect($('day'), grade.days.map((d) => `Day ${d.day} · ${d.title}`), state.day);
  const day = grade.days[state.day];
  state.ex = fillSelect($('exercise'), day.exercises.map((e, i) => `${i + 1}. ${e.title}`), state.ex);
  loadExercise();
}

$('grade').addEventListener('change', (e) => {
  state.grade = Number(e.target.value);
  state.day = state.ex = 0;
  refreshPickers();
});
$('day').addEventListener('change', (e) => {
  state.day = Number(e.target.value);
  state.ex = 0;
  refreshPickers();
});
$('exercise').addEventListener('change', (e) => {
  state.ex = Number(e.target.value);
  loadExercise();
});

// Sensible starting tempo per grade (beginner exercises start slow). 6/8 counts eighth notes.
const GRADE_TEMPO = { 1: 60, 2: 65, 3: 70, 4: 75, 5: 80, 6: 85 };
function exerciseTempo(grade, ex, meter) {
  if (ex.tempo) return ex.tempo;
  const t = GRADE_TEMPO[grade] || 70;
  return meter[1] === 8 ? t * 2 : t;
}

function loadExercise() {
  const day = COURSE[state.grade].days[state.day];
  const ex = day.exercises[state.ex];
  store.set('grade', state.grade);
  store.set('day', state.day);
  store.set('ex', state.ex);
  const timeline = buildTimeline(ex, day.meter);
  loadTimeline(timeline, {
    title: `Grade ${COURSE[state.grade].grade} · Day ${day.day} · ${ex.title}`,
    tip: ex.tip,
    tempo: exerciseTempo(COURSE[state.grade].grade, ex, timeline.meter),
  });
}

function loadTimeline(timeline, { title, tip, tempo }) {
  player.stop();
  setPlaying(false);
  state.timeline = timeline;
  player.load(timeline);
  $('exTitle').textContent = title;
  const [num, den] = timeline.meter;
  $('exTip').textContent = `${tip ? tip + '  ' : ''}(Time: ${num}/${den} · tempo ${tempo})`;
  state.autoTempo = tempo;
  setTempo(tempo);
  tab.render(timeline);
  goTo(0, false);
}

// ---------------------------------------------------------------- songs
function showMode(mode) {
  state.mode = mode;
  store.set('mode', mode);
  $('modeGrades').classList.toggle('on', mode === 'grades');
  $('modeSongs').classList.toggle('on', mode === 'songs');
  $('gradePickers').hidden = mode !== 'grades';
  $('songPickers').hidden = mode !== 'songs';
  if (mode === 'grades') refreshPickers();
  else refreshSongs();
}
$('modeGrades').addEventListener('click', () => showMode('grades'));
$('modeSongs').addEventListener('click', () => showMode('songs'));

function refreshSongs() {
  const sel = $('song');
  const list = state.songs;
  sel.innerHTML = list.length
    ? list.map((s) => `<option value="${s.id}">${escapeHtml(s.title)}${s.origin === 'repo' ? '' : ' (this browser)'}</option>`).join('')
    : '<option value="">No songs yet — click + Add song</option>';
  const cur = list.find((s) => s.id === state.songId) || list[0];
  $('exportSong').disabled = $('deleteSong').disabled = !cur;
  if (!cur) {
    loadTimeline(buildTimeline({ bars: [[{ beats: 4, rest: true, notes: [] }]] }), {
      title: 'Songs',
      tip: 'Add a song from a MusicXML, MIDI or text tab file.',
      tempo: 100,
    });
    return;
  }
  sel.value = cur.id;
  $('deleteSong').disabled = cur.origin !== 'local';
  loadSong(cur);
}
$('song').addEventListener('change', (e) => {
  const s = state.songs.find((x) => x.id === e.target.value);
  if (s) loadSong(s);
});

function loadSong(song) {
  state.songId = song.id;
  store.set('songId', song.id);
  $('deleteSong').disabled = song.origin !== 'local';
  loadTimeline(buildTimeline({ bars: song.bars, meter: song.meter }), {
    title: song.title,
    tip: song.origin === 'repo' ? 'From the songs/ folder.' : `Imported from ${song.source || 'a file'} (saved in this browser).`,
    tempo: song.tempo || 100,
  });
}

const escapeHtml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function toast(msg, ms = 3500) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), ms);
}

// import dialog
let pending = null;
$('songFile').accept = ACCEPT;
$('addSong').addEventListener('click', () => {
  pending = null;
  $('importPreview').hidden = true;
  $('impError').hidden = true;
  $('impSave').disabled = true;
  $('importPanel').hidden = false;
});
$('pickFile').addEventListener('click', () => $('songFile').click());
$('impCancel').addEventListener('click', () => ($('importPanel').hidden = true));
$('songFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  $('impError').hidden = true;
  try {
    const song = await importFile(file);
    const events = song.bars.flat().filter((x) => !x.rest).length;
    if (!events) throw new Error('No notes were found in this file.');
    pending = song;
    $('impTitle').value = song.title;
    $('impTempo').value = song.tempo;
    $('impInfo').textContent = `${song.source}: ${song.bars.length} bars, ${events} notes/chords, ${song.meter[0]}/${song.meter[1]} time.`;
    $('importPreview').hidden = false;
    $('impSave').disabled = false;
  } catch (err) {
    pending = null;
    $('impSave').disabled = true;
    $('impError').textContent = err.message || String(err);
    $('impError').hidden = false;
  }
});
$('impSave').addEventListener('click', () => {
  if (!pending) return;
  pending.title = $('impTitle').value.trim() || pending.title;
  pending.tempo = Math.max(20, Math.min(300, Number($('impTempo').value) || pending.tempo));
  const id = saveLocal(pending);
  if (!id) {
    $('impError').textContent = 'This browser’s storage is full — remove a song first.';
    $('impError').hidden = false;
    return;
  }
  state.songs.push({ ...pending, id, origin: 'local' });
  state.songId = id;
  pending = null;
  $('importPanel').hidden = true;
  refreshSongs();
  toast('Song added. Use “Save file” to put it in the songs/ folder of your repo.');
});
$('exportSong').addEventListener('click', () => {
  const s = state.songs.find((x) => x.id === state.songId);
  if (s) {
    downloadSong(s);
    toast('Downloaded. Put it in songs/ and add its name to songs/index.json, then commit.', 6000);
  }
});
$('deleteSong').addEventListener('click', () => {
  const s = state.songs.find((x) => x.id === state.songId);
  if (!s || s.origin !== 'local') return;
  removeLocal(s.id);
  state.songs = state.songs.filter((x) => x.id !== s.id);
  state.songId = null;
  refreshSongs();
  toast(`Removed “${s.title}” from this browser.`);
});

// ---------------------------------------------------------------- steps
function nextPlayable(i) {
  const evs = state.timeline.events;
  for (let j = i + 1; j < evs.length; j++) if (!evs[j].rest && !evs[j].tie) return evs[j];
  return null;
}

function goTo(i, preview, ms) {
  const evs = state.timeline.events;
  state.index = Math.max(0, Math.min(evs.length - 1, i));
  const ev = evs[state.index];
  guitar.showEvent(ev, nextPlayable(state.index));
  hand3d.pose(ev);
  hand.show(ev);
  tab.highlight(state.index);
  $('position').textContent = `Bar ${ev.bar + 1} of ${state.timeline.bars.length} · note ${state.index + 1}/${evs.length}`;
  const dur = ms ?? ev.beats * (60 / player.bpm) * 1000;
  guitar.strike(ev, dur);
  if (preview && $('sound').classList.contains('on')) engine.preview(ev, Math.min(1.2, dur / 1000));
}

$('prev').addEventListener('click', () => step(-1));
$('next').addEventListener('click', () => step(1));
$('restart').addEventListener('click', () => {
  if (player.playing) player.play(0);
  else goTo(0, true);
});
function step(d) {
  if (player.playing) {
    player.stop();
    setPlaying(false);
  }
  goTo(state.index + d, true);
}

// ------------------------------------------------------------- transport
function setPlaying(on) {
  $('play').textContent = on ? '❚❚ Pause' : '▶ Play';
  if (!on) $('countBadge').hidden = true;
}

function togglePlay() {
  if (player.playing) {
    player.stop();
    setPlaying(false);
  } else {
    syncAudio();
    const last = state.index >= state.timeline.events.length - 1;
    player.play(last ? 0 : state.index);
    setPlaying(true);
    // warn when the browser keeps audio blocked
    setTimeout(() => {
      const ctx = engine.ctx;
      if (player.playing && ctx && ctx.state !== 'running') {
        ctx.resume();
        toast('Your browser is blocking sound for this page. Click the page once, check the tab isn’t muted, then press Play again.', 7000);
      }
    }, 600);
  }
}
$('play').addEventListener('click', togglePlay);

// ---------------------------------------------------------------- tempo
// state.tempo = the music's tempo (auto-set per exercise/song, editable); speed = practice percentage.
let speed = Number(store.get('speed', 1));
$('speed').value = String(speed);
function setTempo(t, { restart = false } = {}) {
  const v = Math.round(Math.max(20, Math.min(300, Number(t) || state.autoTempo)));
  state.tempo = v;
  player.bpm = Math.max(10, Math.round(v * speed));
  $('bpmNum').value = String(v);
  $('bpm').value = String(v);
  syncSliders();
  const den = state.timeline?.meter[1] || 4;
  $('bpmSym').textContent = `${den === 8 ? '♪' : '♩'} =`;
  $('autoTempo').classList.toggle('on', v !== state.autoTempo);
  $('autoTempo').title = `Back to this music's own tempo (${state.autoTempo})`;
  $('bpmNum').title = speed === 1 ? 'Click to type a tempo' : `Playing at ${player.bpm} (${Math.round(speed * 100)}%)`;
  if (restart && player.playing) player.play(state.index);
}
$('bpm').addEventListener('input', (e) => setTempo(e.target.value));
$('bpm').addEventListener('change', () => setTempo(state.tempo, { restart: true }));
$('bpmNum').addEventListener('focus', (e) => e.target.select());
$('bpmNum').addEventListener('change', (e) => setTempo(e.target.value, { restart: true }));
$('bpmNum').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') e.target.blur();
  if (e.key === 'Escape') {
    e.target.value = String(state.tempo);
    e.target.blur();
  }
});
$('autoTempo').addEventListener('click', () => setTempo(state.autoTempo, { restart: true }));
$('speed').addEventListener('change', (e) => {
  speed = Number(e.target.value);
  store.set('speed', speed);
  setTempo(state.tempo, { restart: true });
});

// guitar tone
$('tone').value = store.get('tone', 'acoustic');
engine.setTone($('tone').value);
$('tone').addEventListener('change', (e) => {
  store.set('tone', e.target.value);
  engine.setTone(e.target.value);
  if ($('sound').classList.contains('on')) engine.preview({ notes: [{ s: 6, f: 0 }, { s: 5, f: 2 }, { s: 4, f: 2 }], strum: true, pick: 'd', beats: 1 }, 1);
});

function bindToggle(id, key, onChange) {
  const b = $(id);
  const v = store.get(key, true);
  b.classList.toggle('on', v);
  b.addEventListener('click', () => {
    b.classList.toggle('on');
    store.set(key, b.classList.contains('on'));
    onChange?.(b.classList.contains('on'));
  });
  onChange?.(v);
}
function syncAudio() {
  engine.setLevels({
    metOn: $('metro').classList.contains('on'),
    metVol: Number($('metVol').value),
    gtrOn: $('sound').classList.contains('on'),
  });
}
bindToggle('metro', 'metro', (on) => {
  $('metro').textContent = on ? 'Click on' : 'Click muted';
  syncAudio();
});
bindToggle('sound', 'sound', syncAudio);
bindToggle('countIn', 'countIn', (on) => (player.countIn = on));
bindToggle('loop', 'loop', (on) => (player.loop = on));
$('metVol').value = store.get('metVol', 0.6);
$('metVol').addEventListener('input', (e) => {
  store.set('metVol', Number(e.target.value));
  syncAudio();
});

// keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea') || !$('importPanel').hidden) return;
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if (e.code === 'ArrowRight') step(1);
  else if (e.code === 'ArrowLeft') step(-1);
  else if (e.code === 'KeyM') $('metro').click();
});

upgradeAll();
showMode(state.mode);
loadLibrary().then((songs) => {
  state.songs = songs;
  if (state.mode === 'songs') refreshSongs();
});
window.__app = { state, guitar, hand3d, pickHand, player, goTo, HAND_TUNING }; // handy for debugging in the console
