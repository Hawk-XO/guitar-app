import { COURSE, buildTimeline } from './data/exercises.js';
import { Guitar3D, PRESET_NAMES } from './guitar3d.js';
import { Hand3D, PickHand, HAND_TUNING } from './hand3d.js';
import { TabView } from './tab.js';
import { HandPanel } from './hand2d.js';
import { AudioEngine, Player } from './audio.js';
import { TAB_GUIDE } from './theory.js';

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

function loadExercise() {
  const day = COURSE[state.grade].days[state.day];
  const ex = day.exercises[state.ex];
  store.set('grade', state.grade);
  store.set('day', state.day);
  store.set('ex', state.ex);
  player.stop();
  setPlaying(false);
  state.timeline = buildTimeline(ex, day.meter);
  player.load(state.timeline);
  $('exTitle').textContent = `Grade ${COURSE[state.grade].grade} · Day ${day.day} · ${ex.title}`;
  const [num, den] = state.timeline.meter;
  $('exTip').textContent = `${ex.tip}  (Time: ${num}/${den})`;
  updateBpmLabel();
  tab.render(state.timeline);
  goTo(0, false);
}

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
  }
}
$('play').addEventListener('click', togglePlay);

function updateBpmLabel() {
  const den = state.timeline?.meter[1] || 4;
  $('bpmLabel').textContent = `${den === 8 ? '♪' : '♩'} = ${player.bpm}`;
}
$('bpm').value = player.bpm = store.get('bpm', 60);
$('bpm').addEventListener('input', (e) => {
  player.bpm = Number(e.target.value);
  store.set('bpm', player.bpm);
  updateBpmLabel();
});
$('bpm').addEventListener('change', () => {
  if (player.playing) player.play(state.index); // restart at the new tempo
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
  if (e.target.matches('input, select')) return;
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if (e.code === 'ArrowRight') step(1);
  else if (e.code === 'ArrowLeft') step(-1);
  else if (e.code === 'KeyM') $('metro').click();
});

refreshPickers();
window.__app = { state, guitar, hand3d, pickHand, player, goTo, HAND_TUNING }; // handy for debugging in the console
