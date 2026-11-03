// Renders an exercise as guitar tab (SVG) with note names, chord names, pick symbols and hover help.

import { STRING_LETTER, midiOf, noteName, explainNote } from './theory.js';
import { CHORDS, chordLabel } from './data/chords.js';

const NS = 'http://www.w3.org/2000/svg';
const PX_PER_BEAT = 46;
const MIN_GAP = 30;
const LINE_GAP = 16;
const TOP = 34; // room for chord names and pick symbols
const LEFT = 26;

function el(name, attrs = {}, text) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}

export class TabView {
  constructor(scroller, tooltip, { onSelect } = {}) {
    this.scroller = scroller;
    this.tooltip = tooltip;
    this.onSelect = onSelect;
    this.groups = [];
  }

  render(timeline) {
    this.timeline = timeline;
    this.scroller.innerHTML = '';
    this.groups = [];
    const lineY = (s) => TOP + (s - 1) * LINE_GAP; // string 1 (high e) on top
    const xs = [];
    let x = LEFT + 18;
    timeline.events.forEach((ev, i) => {
      const isBarStart = i === 0 || timeline.events[i - 1].bar !== ev.bar;
      if (isBarStart && i > 0) x += 14;
      xs.push(x);
      x += Math.max(MIN_GAP, ev.beats * PX_PER_BEAT);
    });
    const width = x + 10;
    const height = TOP + 5 * LINE_GAP + 48;
    const svg = el('svg', { width, height, viewBox: `0 0 ${width} ${height}`, class: 'tab-svg' });

    for (let s = 1; s <= 6; s++) {
      svg.append(el('line', { x1: LEFT, x2: width - 6, y1: lineY(s), y2: lineY(s), class: 'tab-line' }));
      svg.append(el('text', { x: 6, y: lineY(s) + 4, class: 'tab-string' }, STRING_LETTER[s]));
    }
    // bar lines
    const barX = (bi) => {
      const first = timeline.events.findIndex((e) => e.bar === bi);
      return xs[first] - 16;
    };
    timeline.bars.forEach((b, bi) => {
      if (bi === 0) return;
      const bx = barX(bi);
      svg.append(el('line', { x1: bx, x2: bx, y1: lineY(1), y2: lineY(6), class: 'tab-bar' }));
    });
    svg.append(el('line', { x1: width - 6, x2: width - 6, y1: lineY(1), y2: lineY(6), class: 'tab-bar' }));
    svg.append(el('line', { x1: LEFT, x2: LEFT, y1: lineY(1), y2: lineY(6), class: 'tab-bar' }));

    let lastChord = null;
    timeline.events.forEach((ev, i) => {
      const g = el('g', { class: 'tab-event', 'data-i': i });
      const ex = xs[i];
      // highlight column
      g.append(el('rect', { x: ex - 11, y: lineY(1) - 10, width: 22, height: 5 * LINE_GAP + 20, rx: 5, class: 'tab-col' }));
      if (ev.rest) {
        g.append(el('text', { x: ex, y: lineY(3) + 12, class: 'tab-rest' }, 'rest'));
      } else {
        ev.notes.forEach((n) => {
          const cls = ev.tie ? 'tab-num tie' : 'tab-num';
          const box = el('rect', { x: ex - 8, y: lineY(n.s) - 7, width: 16, height: 14, rx: 3, class: 'tab-numbg' });
          const txt = ev.tie ? `(${n.f})` : ev.slideFrom != null ? `/${n.f}` : String(n.f);
          const t = el('text', { x: ex, y: lineY(n.s) + 4.5, class: cls }, txt);
          const hit = el('rect', { x: ex - 10, y: lineY(n.s) - 8, width: 20, height: 16, class: 'tab-hit' });
          hit.addEventListener('mouseenter', (e) => this.showTip(e, n, ev));
          hit.addEventListener('mousemove', (e) => this.moveTip(e));
          hit.addEventListener('mouseleave', () => this.hideTip());
          g.append(box, t, hit);
        });
        // chord name or note name
        if (ev.chord) {
          if (ev.chord !== lastChord) g.append(el('text', { x: ex, y: 12, class: 'tab-chord' }, chordLabel(ev.chord)));
          lastChord = ev.chord;
        } else {
          lastChord = null;
          const nm = noteName(midiOf(ev.notes[0].s, ev.notes[0].f));
          g.append(el('text', { x: ex, y: lineY(6) + 28, class: 'tab-note' }, nm));
        }
        if (ev.slideFrom != null) g.append(el('text', { x: ex - 12, y: 26, class: 'tab-tech' }, 'sl.'));
        else if (!ev.tie) g.append(el('text', { x: ex, y: 26, class: 'tab-pick' }, ev.pick === 'u' ? 'V' : '⊓'));
        if (ev.pm) g.append(el('text', { x: ex, y: lineY(6) + 40, class: 'tab-tech' }, 'P.M.'));
      }
      g.addEventListener('click', () => this.onSelect?.(i));
      svg.append(g);
      this.groups.push(g);
    });
    this.scroller.append(svg);
  }

  highlight(i) {
    this.groups.forEach((g, gi) => g.classList.toggle('current', gi === i));
    const g = this.groups[i];
    if (!g) return;
    const col = g.querySelector('.tab-col');
    const x = parseFloat(col.getAttribute('x'));
    const { scrollLeft, clientWidth } = this.scroller;
    if (x < scrollLeft + 30 || x > scrollLeft + clientWidth - 60) {
      this.scroller.scrollTo({ left: Math.max(0, x - clientWidth * 0.3), behavior: 'smooth' });
    }
  }

  showTip(e, n, ev) {
    const info = explainNote(n);
    let html = `<div class="tip-title">${info.title}</div><ul>${info.lines.map((l) => `<li>${l}</li>`).join('')}</ul>`;
    if (ev.chord) html += `<div class="tip-chord"><b>${chordLabel(ev.chord)} chord:</b> ${CHORDS[ev.chord].tip}</div>`;
    if (ev.slideFrom != null) html += `<div class="tip-chord"><b>Slide:</b> don’t pick again — keep pressing and slide up from fret ${ev.slideFrom}.</div>`;
    if (ev.pm) html += `<div class="tip-chord"><b>P.M. (palm mute):</b> rest the side of your picking hand on the strings by the bridge.</div>`;
    if (ev.tie) html += `<div class="tip-chord">In brackets = keep holding, don’t pick again.</div>`;
    this.tooltip.innerHTML = html;
    this.tooltip.hidden = false;
    this.moveTip(e);
  }

  moveTip(e) {
    const pad = 14;
    const r = this.tooltip.getBoundingClientRect();
    let x = e.clientX + pad;
    let y = e.clientY + pad;
    if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - pad;
    if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - pad;
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  hideTip() {
    this.tooltip.hidden = true;
  }
}
