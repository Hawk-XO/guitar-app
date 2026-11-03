// Procedural 3D guitar (ESP LTD Viper-10 style) with finger markers, string highlights and a pick.
// Units are inches. The headstock points to +x, low E string is on +y (ceiling side when playing),
// the fretboard faces +z (toward the audience).

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FINGERS } from './theory.js';

export const SCALE = 24.75; // Viper-10 scale length (inches)
export const FRETS = 22;
const NUT_X = 12; // world x of the nut
const NUT_W = 1.65;
const END_W = 2.2;
export const STRING_Z = 0.13;
const SPREAD_NUT = 1.36;
const SPREAD_BRIDGE = 2.05;
const STRING_R = [0.012, 0.016, 0.021, 0.027, 0.033, 0.04]; // exaggerated a bit so they read on screen

export const fretU = (n) => SCALE - SCALE / Math.pow(2, n / 12); // distance from nut
export const X = (u) => NUT_X - u;
const spread = (u) => SPREAD_NUT + ((SPREAD_BRIDGE - SPREAD_NUT) * u) / SCALE;
export const stringY = (s, u) => ((s - 3.5) / 5) * spread(u);
export const boardHalf = (u) => (NUT_W + ((END_W - NUT_W) * u) / fretU(FRETS)) / 2;
// Where a fingertip sits: just behind the fret wire.
export const fingerU = (f) => (f === 0 ? -0.45 : fretU(f) - 0.3 * (fretU(f) - fretU(f - 1)));

const CAMERA_PRESETS = {
  tab: { label: 'Like the tab', pos: [3.5, 0, 21], up: [0, -1, 0] },
  player: { label: 'Player view', pos: [3.5, 16, 7], up: [0, 0, 1] },
  audience: { label: 'Audience', pos: [3.5, 0, 21], up: [0, 1, 0] },
  behind: { label: 'Behind neck', pos: [3.5, 3, -18], up: [0, 1, 0] },
};
export const PRESET_NAMES = Object.fromEntries(Object.entries(CAMERA_PRESETS).map(([k, v]) => [k, v.label]));

function label(text, { color = '#ffffff', bg = null, size = 64, scale = 0.5 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  if (bg) {
    g.fillStyle = bg;
    g.beginPath();
    g.arc(64, 64, 60, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = color;
  g.font = `600 ${size}px system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.setScalar(scale);
  sprite.renderOrder = 10;
  return sprite;
}

function crossSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.strokeStyle = '#E24B4A';
  g.lineWidth = 10;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(14, 14); g.lineTo(50, 50); g.moveTo(50, 14); g.lineTo(14, 50);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.setScalar(0.3);
  sp.renderOrder = 10;
  return sp;
}

function cylinderBetween(a, b, radius, material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const geo = new THREE.CylinderGeometry(radius, radius, dir.length(), 10);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

export class Guitar3D {
  constructor(container, { onFingerClick } = {}) {
    this.container = container;
    this.onFingerClick = onFingerClick;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 2, 0.1, 500);
    this.target = new THREE.Vector3(3.5, 0, 0);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(6, 8, 14);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x99bbff, 1.0);
    rim.position.set(-10, -6, -8);
    this.scene.add(rim);

    this.markers = new THREE.Group();
    this.scene.add(this.markers);
    this.buildGuitar();
    this.buildPick();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.renderer.domElement.addEventListener('pointerdown', (e) => (this.downAt = [e.clientX, e.clientY]));
    this.renderer.domElement.addEventListener('pointerup', (e) => this.handleClick(e));

    this.setPreset('tab');
    this.resize();
    new ResizeObserver(() => this.resize()).observe(container);
    this.renderer.setAnimationLoop((t) => this.tick(t));
  }

  // ---------------------------------------------------------------- build
  buildGuitar() {
    const g = new THREE.Group();
    this.scene.add(g);
    const mat = {
      body: new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.28, metalness: 0.15 }),
      binding: new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.5 }),
      board: new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.8 }),
      neck: new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.4 }),
      fret: new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 0.25, metalness: 0.9 }),
      nut: new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.5 }),
      inlay: new THREE.MeshStandardMaterial({ color: 0x8c8478, roughness: 0.6 }),
      chrome: new THREE.MeshStandardMaterial({ color: 0xcfd3d8, roughness: 0.2, metalness: 1 }),
      pickup: new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.6 }),
      knob: new THREE.MeshStandardMaterial({ color: 0x101012, roughness: 0.35, metalness: 0.3 }),
    };

    // Fretboard (tapered), top surface at z = 0
    const uEnd = fretU(FRETS) + 0.35;
    const boardShape = new THREE.Shape([
      new THREE.Vector2(X(0), -boardHalf(0)),
      new THREE.Vector2(X(uEnd), -boardHalf(uEnd)),
      new THREE.Vector2(X(uEnd), boardHalf(uEnd)),
      new THREE.Vector2(X(0), boardHalf(0)),
    ]);
    const board = new THREE.Mesh(new THREE.ExtrudeGeometry(boardShape, { depth: 0.25, bevelEnabled: false }), mat.board);
    board.position.z = -0.25;
    g.add(board);

    // Neck back: half cylinder, tapered, behind the fretboard
    const neckStart = -0.2;
    const neckEnd = fretU(17);
    const neckGeo = new THREE.CylinderGeometry(1.08, 0.86, neckEnd - neckStart, 32, 1, false, Math.PI / 2, Math.PI);
    const neck = new THREE.Mesh(neckGeo, mat.neck);
    neck.rotation.z = Math.PI / 2;
    neck.scale.set(1, 1, 0.82);
    neck.position.set(X((neckStart + neckEnd) / 2), 0, -0.25);
    g.add(neck);

    // Body: offset double-cutaway (Viper / SG family). Points given as (u, y).
    const a = fretU(16);
    const L = SCALE;
    const P = (u, y) => [X(u), y];
    const body = new THREE.Shape();
    body.moveTo(...P(a + 3.0, 1.2));
    body.bezierCurveTo(...P(a + 1.6, 1.7), ...P(a - 0.7, 2.7), ...P(a - 0.9, 4.2)); // upper horn (longer)
    body.bezierCurveTo(...P(a - 1.0, 5.8), ...P(a + 2.6, 6.3), ...P(a + 5.2, 5.5));
    body.bezierCurveTo(...P(L - 1.5, 4.9), ...P(L + 1.5, 6.9), ...P(L + 4.2, 6.5));
    body.bezierCurveTo(...P(L + 7.4, 6.0), ...P(L + 7.9, 2.2), ...P(L + 7.8, 0));
    body.bezierCurveTo(...P(L + 7.9, -2.2), ...P(L + 7.4, -6.0), ...P(L + 4.2, -6.5));
    body.bezierCurveTo(...P(L + 1.5, -6.9), ...P(L - 1.5, -4.9), ...P(a + 6.2, -5.5));
    body.bezierCurveTo(...P(a + 3.2, -6.2), ...P(a + 0.9, -5.7), ...P(a + 1.1, -4.1)); // lower horn (shorter)
    body.bezierCurveTo(...P(a + 1.5, -2.6), ...P(a + 2.7, -1.7), ...P(a + 3.0, -1.2));
    body.closePath();
    const bodyMesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(body, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 4, curveSegments: 24 }),
      mat.body,
    );
    bodyMesh.position.z = -1.95;
    g.add(bodyMesh);
    this.bodyMesh = bodyMesh;

    // Headstock (3+3, slightly behind the fretboard plane)
    const H = (u, y) => new THREE.Vector2(X(u), y);
    const head = new THREE.Shape([H(0.15, 0.82), H(-1.4, 1.35), H(-6.6, 1.75), H(-7.3, 0.9), H(-7.1, -0.4), H(-6.2, -1.2), H(-1.4, -1.25), H(0.15, -0.82)]);
    const headMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(head, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05 }), mat.body);
    headMesh.position.z = -0.6;
    g.add(headMesh);
    // Tuners: low E/A/D on the +y side, G/B/e on the -y side
    [-2.0, -3.6, -5.2].forEach((u, i) => {
      [1, -1].forEach((side) => {
        const y = side * (1.15 + i * 0.12);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.35, 12), mat.chrome);
        post.rotation.x = Math.PI / 2;
        post.position.set(X(u), y, 0.05);
        g.add(post);
        const btn = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.12), mat.chrome);
        btn.position.set(X(u), y + side * 0.75, -0.55);
        g.add(btn);
      });
    });

    // Nut
    const nut = new THREE.Mesh(new THREE.BoxGeometry(0.2, NUT_W, 0.16), mat.nut);
    nut.position.set(X(-0.1), 0, 0.08);
    g.add(nut);

    // Frets
    for (let n = 1; n <= FRETS; n++) {
      const u = fretU(n);
      const w = boardHalf(u) * 2;
      const fret = new THREE.Mesh(new THREE.BoxGeometry(0.07, w, 0.07), mat.fret);
      fret.position.set(X(u), 0, 0.035);
      g.add(fret);
    }

    // Dot inlays and fret numbers (fret numbers sit on the low E side)
    const dot = new THREE.CircleGeometry(0.11, 24);
    [3, 5, 7, 9, 12, 15, 17, 19, 21].forEach((n) => {
      const u = (fretU(n) + fretU(n - 1)) / 2;
      const ys = n === 12 ? [0.42, -0.42] : [0];
      ys.forEach((y) => {
        const m = new THREE.Mesh(dot, mat.inlay);
        m.position.set(X(u), y, 0.002);
        g.add(m);
      });
    });
    for (let n = 1; n <= FRETS; n++) {
      const u = (fretU(n) + fretU(n - 1)) / 2;
      const s = label(String(n), { color: '#aab0bb', size: 60, scale: 0.75 });
      s.position.set(X(u), boardHalf(u) + 0.5, 0.05);
      g.add(s);
    }

    // Pickups, bridge, tailpiece, knobs
    [L - 1.8, L - 6.2].forEach((u) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.75, 0.35), mat.pickup);
      p.position.set(X(u), 0, -0.25);
      g.add(p);
      const ring = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.1, 0.1), mat.binding);
      ring.position.set(X(u), 0, -0.36);
      g.add(ring);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.7, 0.35), mat.chrome);
    bridge.position.set(X(L), 0, -0.15);
    g.add(bridge);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.0, 0.3), mat.chrome);
    tail.position.set(X(L + 1.6), 0, -0.2);
    g.add(tail);
    [[L + 3.2, -3.3], [L + 4.6, -3.0], [L + 3.6, -4.6], [L + 5.0, -4.3]].forEach(([u, y]) => {
      const k = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.45, 24), mat.knob);
      k.rotation.x = Math.PI / 2;
      k.position.set(X(u), y, -0.25);
      g.add(k);
    });

    // Strings
    this.strings = {};
    for (let s = 1; s <= 6; s++) {
      const m = new THREE.MeshStandardMaterial({ color: s >= 4 ? 0xc8b48a : 0xdedede, metalness: 0.9, roughness: 0.3, emissive: 0x000000 });
      const start = new THREE.Vector3(X(-0.1), stringY(s, 0), STRING_Z);
      const end = new THREE.Vector3(X(L + 1.6), stringY(s, L + 1.6), STRING_Z - 0.05);
      const mesh = cylinderBetween(start, end, STRING_R[s - 1], m);
      g.add(mesh);
      // string to tuner
      const tunerSide = s >= 4 ? 1 : -1;
      const ti = s >= 4 ? 6 - s : s - 1;
      const tu = [-2.0, -3.6, -5.2][ti];
      const tail2 = cylinderBetween(start, new THREE.Vector3(X(tu), tunerSide * (1.15 + ti * 0.12), 0.1), STRING_R[s - 1], m);
      g.add(tail2);
      this.strings[s] = m;
    }
  }

  buildPick() {
    const shape = new THREE.Shape();
    shape.moveTo(0.55, 0);
    shape.quadraticCurveTo(0.2, 0.42, -0.3, 0.42);
    shape.quadraticCurveTo(-0.5, 0, -0.3, -0.42);
    shape.quadraticCurveTo(0.2, -0.42, 0.55, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false });
    geo.translate(0, 0, -0.015);
    const mat = new THREE.MeshStandardMaterial({ color: 0xf08a24, roughness: 0.4, transparent: true, opacity: 0.9 });
    this.pick = new THREE.Mesh(geo, mat);
    this.pick.rotation.y = Math.PI / 2; // pick plane is y-z, tip points toward the body (-z)
    this.pickU = SCALE - 4.0;
    this.pickRestY = stringY(6, this.pickU) + 0.4;
    this.pick.position.set(X(this.pickU), this.pickRestY, STRING_Z + 0.5);
    this.pick.userData.rest = this.pick.position.clone();
    this.scene.add(this.pick);
    this.pickArrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), 1.2, 0xf08a24, 0.3, 0.2);
    this.pickArrow.visible = false;
    this.scene.add(this.pickArrow);
    this.pickAnim = null;
  }

  // ------------------------------------------------------------ camera
  setPreset(name) {
    const p = CAMERA_PRESETS[name] || CAMERA_PRESETS.tab;
    this.camera.position.set(...p.pos);
    this.camera.up.set(...p.up);
    this.camera.lookAt(this.target);
    if (this.controls) this.controls.dispose();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.target);
    this.controls.enableDamping = true;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 45;
    this.controls.update();
  }

  resize() {
    const w = this.container.clientWidth || 600;
    const h = this.container.clientHeight || 300;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ----------------------------------------------------------- markers
  clearMarkers() {
    this.markers.children.slice().forEach((c) => {
      this.markers.remove(c);
      c.traverse((o) => {
        o.geometry?.dispose?.();
        if (o.material) {
          o.material.map?.dispose?.();
          o.material.dispose?.();
        }
      });
    });
    Object.values(this.strings).forEach((m) => m.emissive.setHex(0x000000));
  }

  // ev: { notes:[{s,f,fi}], chord?, rest?, tie? }   next: the following playable event (ghost preview)
  showEvent(ev, next) {
    this.clearMarkers();
    if (!ev || ev.rest) return;
    const played = new Set(ev.notes.map((n) => n.s));
    ev.notes.forEach((n) => this.addNoteMarker(n, ev.tie ? 0.35 : 1));
    this.addBarres(ev);
    if (ev.slideFrom != null) this.addSlide(ev.notes[0], ev.slideFrom);
    played.forEach((s) => this.strings[s].emissive.setHex(ev.tie ? 0x1b3b5c : 0x2f6fb0));
    if (ev.chord) {
      for (let s = 1; s <= 6; s++) {
        if (!played.has(s)) {
          const x = crossSprite();
          x.position.set(X(-0.5), stringY(s, 0), STRING_Z + 0.15);
          this.markers.add(x);
        }
      }
    }
    if (next && !next.rest) {
      next.notes.forEach((n) => {
        if (n.f === 0) return;
        const same = ev.notes.some((m) => m.s === n.s && m.f === n.f);
        if (same) return;
        const ghost = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 16, 12),
          new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.35 }),
        );
        ghost.position.set(X(fingerU(n.f)), stringY(n.s, fingerU(n.f)), STRING_Z + 0.12);
        this.markers.add(ghost);
      });
    }
  }

  // A finger pressing several strings at one fret = barre: draw a translucent bar across them.
  addBarres(ev) {
    const byFinger = {};
    ev.notes.forEach((n) => n.fi && n.f > 0 && (byFinger[n.fi] = [...(byFinger[n.fi] || []), n]));
    Object.entries(byFinger).forEach(([fi, ns]) => {
      if (ns.length < 2 || new Set(ns.map((n) => n.f)).size > 1) return;
      const u = fingerU(ns[0].f);
      const ys = ns.map((n) => stringY(n.s, u));
      const a = new THREE.Vector3(X(u), Math.max(...ys) + 0.15, STRING_Z + 0.12);
      const b = new THREE.Vector3(X(u), Math.min(...ys) - 0.15, STRING_Z + 0.12);
      const color = FINGERS[fi].color;
      const bar = cylinderBetween(a, b, 0.14, new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.45, emissive: color, emissiveIntensity: 0.4, depthWrite: false }));
      bar.userData.finger = Number(fi);
      this.markers.add(bar);
    });
  }

  // Slide: arrow along the string from the starting fret to the target fret.
  addSlide(n, from) {
    const u0 = fingerU(from);
    const u1 = fingerU(n.f);
    const y0 = stringY(n.s, u0);
    const start = new THREE.Vector3(X(u0), y0, STRING_Z + 0.32);
    const dir = new THREE.Vector3(X(u1) - X(u0), stringY(n.s, u1) - y0, 0);
    const arrow = new THREE.ArrowHelper(dir.clone().normalize(), start, dir.length(), 0x5dcaa5, 0.3, 0.2);
    this.markers.add(arrow);
    const tag = label('slide', { color: '#5dcaa5', size: 44, scale: 0.6 });
    tag.position.copy(start).add(new THREE.Vector3(dir.x / 2, 0, 0.35));
    this.markers.add(tag);
  }

  addNoteMarker(n, alpha) {
    const u = fingerU(n.f);
    const y = stringY(n.s, Math.max(u, 0));
    if (n.f === 0) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.2, 0.05, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x5dcaa5, transparent: true, opacity: 0.9 * alpha }),
      );
      ring.position.set(X(u), y, STRING_Z + 0.05);
      this.markers.add(ring);
      return;
    }
    const color = n.fi ? FINGERS[n.fi].color : '#ffffff';
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 24, 16),
      new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.72 * alpha, emissive: color, emissiveIntensity: 0.5, depthWrite: false }),
    );
    sphere.scale.set(1.25, 1, 0.8); // fingertip-ish
    sphere.position.set(X(u), y, STRING_Z + 0.12);
    sphere.userData.finger = n.fi;
    this.markers.add(sphere);
    if (n.fi) {
      const t = label(String(n.fi), { color: '#ffffff', size: 76, scale: 0.42 });
      t.position.copy(sphere.position).add(new THREE.Vector3(0, 0, 0.3));
      t.userData.finger = n.fi;
      this.markers.add(t);
    }
  }

  // Briefly pulse the markers of one finger (used when a finger is clicked in the hand panel).
  pulseFinger(fi) {
    this.pulse = { fi, until: performance.now() + 900 };
  }

  // ------------------------------------------------------------- pick
  strike(ev, durationMs) {
    if (!ev || ev.rest || ev.tie || ev.slideFrom != null) return;
    const strings = ev.notes.map((n) => n.s);
    const down = ev.pick !== 'u';
    const u = this.pickU;
    let y0, y1;
    if (ev.strum) {
      const hi = stringY(Math.max(...strings), u) + 0.35; // thickest played string
      const lo = stringY(Math.min(...strings), u) - 0.35; // thinnest played string
      [y0, y1] = down ? [hi, lo] : [lo, hi];
    } else {
      const y = stringY(strings[0], u);
      [y0, y1] = down ? [y + 0.28, y - 0.28] : [y - 0.28, y + 0.28];
    }
    const dur = Math.max(90, Math.min(ev.strum ? 260 : 160, durationMs * 0.5));
    this.pickAnim = { y0, y1, start: performance.now(), dur, hold: Math.max(dur + 120, durationMs * 0.8) };
    this.pickArrow.position.set(X(u) + 0.9, (y0 + y1) / 2 + (down ? 0.6 : -0.6), STRING_Z + 0.5);
    this.pickArrow.setDirection(new THREE.Vector3(0, down ? -1 : 1, 0));
    this.pickArrow.setLength(Math.max(0.8, Math.abs(y1 - y0) * 0.7), 0.3, 0.2);
    this.pickArrow.visible = true;
  }

  // -------------------------------------------------------------- loop
  handleClick(e) {
    if (!this.downAt || Math.hypot(e.clientX - this.downAt[0], e.clientY - this.downAt[1]) > 5) return; // was a drag
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.markers.children, false).find((h) => h.object.userData.finger);
    if (hit && this.onFingerClick) this.onFingerClick(hit.object.userData.finger);
  }

  tick(now) {
    if (this.pickAnim) {
      const { y0, y1, start, dur, hold } = this.pickAnim;
      const t = (now - start) / dur;
      if (t <= 1) {
        const e = 1 - Math.pow(1 - t, 3);
        this.pick.position.y = y0 + (y1 - y0) * e;
        this.pick.rotation.x = (y1 < y0 ? 1 : -1) * 0.25 * Math.sin(Math.PI * t);
      } else if (now - start > hold) {
        this.pickArrow.visible = false;
        this.pickAnim = null;
      }
    }
    if (this.pulse) {
      const active = now < this.pulse.until;
      const k = active ? 1 + 0.35 * Math.sin((now / 90) % (Math.PI * 2)) : 1;
      this.markers.children.forEach((m) => {
        if (m.isMesh && m.userData.finger === this.pulse.fi) m.scale.set(1.25 * k, k, 0.8 * k);
      });
      if (!active) this.pulse = null;
    }
    this.onTick?.(now);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
