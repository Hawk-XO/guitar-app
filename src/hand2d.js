// 2D left-hand panel (palm facing you). Fingers light up in their colour when they are pressing.

import { FINGERS, STRING_LABEL, ordinal } from './theory.js';
import { CHORDS, chordLabel } from './data/chords.js';

const NS = 'http://www.w3.org/2000/svg';

// finger rects in a 240x190 viewBox: [x, top, width]
const SHAPES = {
  1: [72, 22, 26],
  2: [102, 8, 27],
  3: [133, 16, 26],
  4: [163, 38, 23],
};

export class HandPanel {
  constructor(svgHost, textHost, { onFingerClick } = {}) {
    this.textHost = textHost;
    this.onFingerClick = onFingerClick;
    svgHost.innerHTML = `
      <svg viewBox="0 0 240 190" class="hand-svg" role="img" aria-label="Left hand, palm facing you">
        <path class="hand-palm" d="M66 96 Q64 84 72 82 L186 82 Q194 84 192 100 L186 160 Q182 182 150 184 L100 184 Q72 182 68 160 Z"/>
        <rect class="hand-thumb" x="20" y="104" width="26" height="70" rx="13" transform="rotate(-38 33 140)"/>
        ${Object.entries(SHAPES)
          .map(
            ([f, [x, top, w]]) => `
          <g class="hand-finger" data-f="${f}" style="--fc:${FINGERS[f].color}">
            <rect x="${x}" y="${top}" width="${w}" height="${96 - top}" rx="${w / 2}"/>
            <circle cx="${x + w / 2}" cy="${top + w / 2}" r="${w / 2 - 3}" class="tip"/>
            <text x="${x + w / 2}" y="${top + w / 2 + 5}">${f}</text>
          </g>`,
          )
          .join('')}
        <text x="34" y="186" class="hand-cap">T</text>
      </svg>`;
    this.fingers = [...svgHost.querySelectorAll('.hand-finger')];
    this.fingers.forEach((g) =>
      g.addEventListener('click', () => {
        const f = Number(g.dataset.f);
        this.flash(f);
        this.onFingerClick?.(f);
      }),
    );
  }

  show(ev) {
    const active = new Map(); // finger -> notes it presses
    if (ev && !ev.rest) ev.notes.forEach((n) => n.fi && active.set(n.fi, [...(active.get(n.fi) || []), n]));
    this.fingers.forEach((g) => g.classList.toggle('active', active.has(Number(g.dataset.f))));

    if (!ev) {
      this.textHost.innerHTML = '';
      return;
    }
    if (ev.rest) {
      this.textHost.innerHTML = `<div class="hand-line muted">Rest — no playing. Use it to get your next shape ready.</div>`;
      return;
    }
    const rows = [];
    if (ev.chord) rows.push(`<div class="hand-line"><b>${chordLabel(ev.chord)}</b> — ${CHORDS[ev.chord].tip}</div>`);
    [...active.entries()]
      .sort((a, b) => a[0] - b[0])
      .forEach(([f, ns]) => {
        const dot = `<span class="dot" style="background:${FINGERS[f].color}"></span>`;
        const n = ns[0];
        const where = ns.length > 1
          ? `lay it flat across strings ${Math.min(...ns.map((x) => x.s))}–${Math.max(...ns.map((x) => x.s))} at the ${ordinal(n.f)} fret (a barre)`
          : `${STRING_LABEL[n.s]} string, ${ordinal(n.f)} fret`;
        rows.push(`<div class="hand-line">${dot}${f} ${FINGERS[f].name} → ${where}</div>`);
      });
    const opens = ev.notes.filter((n) => n.f === 0);
    if (opens.length && !ev.chord) rows.push(`<div class="hand-line muted">Open string — no finger needed, just pick it.</div>`);
    if (ev.tie) rows.push(`<div class="hand-line muted">Keep holding — let it ring.</div>`);
    if (ev.slideFrom != null) rows.push(`<div class="hand-line muted">Slide up from fret ${ev.slideFrom} without lifting.</div>`);
    rows.push(`<div class="hand-line muted">Thumb rests behind the neck, roughly behind your middle finger.</div>`);
    this.textHost.innerHTML = rows.join('');
  }

  flash(f) {
    const g = this.fingers.find((x) => Number(x.dataset.f) === f);
    if (!g) return;
    g.classList.remove('flash');
    void g.getBoundingClientRect();
    g.classList.add('flash');
  }
}
