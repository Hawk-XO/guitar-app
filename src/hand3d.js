// Semi-transparent 3D hands, cut at the wrist.
// Models: generic-hand left/right.glb from @webxr-input-profiles/assets (MIT, see assets/HAND-MODEL-LICENSE.md).
// Their 25 joints are flat children of the armature, so every joint is placed directly:
//   - the palm (wrist, metacarpals, knuckles) moves as one rigid block,
//   - each finger is solved with a small planar IK so its tip lands on a target,
//   - the thumb is solved the same way.
// Fretting hand: snaps to a new grip per tab event (no animation between poses).
// Picking hand: a fixed pick grip that follows the animated pick.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { X, stringY, fingerU, boardHalf, STRING_Z } from './guitar3d.js';

const M2IN = 39.37; // models are in metres, the guitar is in inches
const FINGER_NAMES = { 1: 'index', 2: 'middle', 3: 'ring', 4: 'pinky' };
const SEG = ['phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip'];
const THUMB_SEG = ['metacarpal', 'phalanx-proximal', 'phalanx-distal', 'tip'];

// Tunable pose parameters (inches / directions in guitar space).
export const HAND_TUNING = {
  knuckleDrop: 0.75, // how far the fretting knuckle line sits outside the fretboard edge (floor side)
  knuckleHeight: 0.55, // fretting knuckle line height above the fretboard surface
  dorsal: [0, -0.8, 0.6], // direction the back of the fretting hand faces
  pressLift: 0.12, // fingertip joint height above the string when pressing
  hoverHeight: 0.6, // idle fingertip height above the fretboard
  thumb: [0.35, 0.15, -1.05], // thumb tip: x offset from the middle finger's fret, y, z (behind the neck)
  opacity: 0.42,
  // picking hand, relative to the pick centre
  pickAnchor: [-0.35, 1.1, 0.9], // middle knuckle
  pickDorsal: [0, 0.35, 1],
  pickIndexTip: [-0.18, 0.15, 0.3],
  pickThumbTip: [0.14, 0.05, 0.3],
};

const v3 = (a) => new THREE.Vector3(...a);

class HandRig {
  constructor(scene, file) {
    this.scene = scene;
    this.visible = true;
    this.ready = this.load(file);
  }

  async load(file) {
    const gltf = await new GLTFLoader().loadAsync(new URL(`../assets/${file}`, import.meta.url).href);
    this.root = gltf.scene;
    this.root.scale.setScalar(M2IN);
    this.root.visible = false;
    this.bones = {};
    this.root.traverse((o) => {
      if (o.isBone || /finger|thumb|wrist/.test(o.name)) this.bones[o.name] = o;
      if (o.isSkinnedMesh) {
        o.material = new THREE.MeshStandardMaterial({
          color: 0xe8b796,
          roughness: 0.65,
          transparent: true,
          opacity: HAND_TUNING.opacity,
          depthWrite: false,
        });
        o.frustumCulled = false;
        o.renderOrder = 5;
        this.mesh = o;
      }
    });
    this.rest = {};
    for (const [name, b] of Object.entries(this.bones)) this.rest[name] = { p: b.position.clone(), q: b.quaternion.clone() };
    this.lengths = {};
    for (const f of Object.values(FINGER_NAMES)) {
      const chain = SEG.map((sg) => `${f}-finger-${sg}`);
      this.lengths[f] = chain.slice(1).map((n, i) => this.rest[n].p.distanceTo(this.rest[chain[i]].p) * M2IN);
    }
    const tc = THUMB_SEG.map((sg) => `thumb-${sg}`);
    this.lengths.thumb = tc.slice(1).map((n, i) => this.rest[n].p.distanceTo(this.rest[tc[i]].p) * M2IN);

    // Rest palm frame: s = pinky→index across the knuckles, f = wrist→knuckles, t = s × f.
    const P = (n) => this.rest[n].p.clone().multiplyScalar(M2IN);
    const km = P('middle-finger-phalanx-proximal');
    const f = km.clone().sub(P('wrist')).normalize();
    const s = P('index-finger-phalanx-proximal').sub(P('pinky-finger-phalanx-proximal'));
    s.addScaledVector(f, -s.dot(f)).normalize();
    const t = new THREE.Vector3().crossVectors(s, f);
    const dorsalRest = new THREE.Vector3(0, 1, 0).applyQuaternion(this.rest.wrist.q);
    this.chirality = Math.sign(t.dot(dorsalRest)) || 1;
    this.restBasis = new THREE.Matrix4().makeBasis(s, f, t);
    this.restAnchor = km;
    this.scene.add(this.root);
    this.onReady?.();
  }

  setVisible(on) {
    this.visible = on;
    if (this.root) this.root.visible = on && !!this.posed;
  }

  setOpacity(a) {
    if (this.mesh) this.mesh.material.opacity = a;
  }

  place(name, pos, quat) {
    const b = this.bones[name];
    b.position.copy(pos).divideScalar(M2IN);
    b.quaternion.copy(quat);
  }

  // Rigidly place the palm so the middle knuckle sits at `anchor`, knuckles run along `s`, back faces `dorsal`.
  placePalm(anchor, s, dorsal) {
    const d = dorsal.clone().normalize();
    d.addScaledVector(s, -d.dot(s)).normalize();
    const t = d.clone().multiplyScalar(this.chirality);
    const f = new THREE.Vector3().crossVectors(t, s).normalize();
    const R = new THREE.Matrix4().makeBasis(s, f, t).multiply(this.restBasis.clone().transpose());
    const qR = new THREE.Quaternion().setFromRotationMatrix(R);
    const names = ['wrist', 'thumb-metacarpal', ...Object.values(FINGER_NAMES).flatMap((n) => [`${n}-finger-metacarpal`, `${n}-finger-phalanx-proximal`])];
    const palm = {};
    names.forEach((n) => {
      const p = this.rest[n].p.clone().multiplyScalar(M2IN).sub(this.restAnchor).applyMatrix4(R).add(anchor);
      const q = qR.clone().multiply(this.rest[n].q);
      palm[n] = { p, q };
      this.place(n, p, q);
    });
    return { palm, d, f };
  }

  finger(name, palm, tip, towardPalm, k = [1, 0.8]) {
    const knuckle = palm[`${name}-finger-phalanx-proximal`].p;
    this.orientChain(`${name}-finger`, solveChain(knuckle, tip, this.lengths[name], towardPalm, k), towardPalm);
  }

  thumbTo(palm, tip, bend, k = [0.6, 0.6]) {
    const base = palm['thumb-metacarpal'].p;
    const pts = solveChain(base, tip, this.lengths.thumb, bend, k);
    this.orientChain('thumb', [base, ...pts.slice(1)], bend, THUMB_SEG);
  }

  // pts: [base, j1, j2, tip]. Orientation: -Z along the bone, +Y = back of the finger.
  orientChain(prefix, pts, towardPalm, names = SEG) {
    for (let i = 0; i < names.length; i++) {
      const cur = pts[i];
      const dir = i < pts.length - 1 ? pts[i + 1].clone().sub(cur) : cur.clone().sub(pts[i - 1]);
      const z = dir.normalize().negate();
      const back = towardPalm.clone().negate();
      const y = back.addScaledVector(z, -back.dot(z)).normalize();
      const x = new THREE.Vector3().crossVectors(y, z);
      this.place(`${prefix}-${names[i]}`, cur, new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)));
    }
  }

  show() {
    this.posed = true;
    this.root.visible = this.visible;
  }
}

// ------------------------------------------------------------------ fretting (left) hand
export class Hand3D extends HandRig {
  constructor(scene) {
    super(scene, 'left-hand.glb');
    this.onReady = () => this.pending !== undefined && this.pose(this.pending);
  }

  // ev: tab event { notes:[{s,f,fi}], rest?, tie? }
  pose(ev) {
    if (!this.root) {
      this.pending = ev;
      return;
    }
    if (!ev || ev.rest) return; // keep the previous grip during rests
    const T = HAND_TUNING;
    const pressed = ev.notes.filter((n) => n.f > 0 && n.fi);
    // Index finger position in "one finger per fret".
    const base = Math.max(1, pressed.length ? Math.min(...pressed.map((n) => n.f - (n.fi - 1))) : 1);
    // A finger pressing several strings (barre) aims its tip at the thickest one.
    const noteFor = (fi) => pressed.filter((n) => n.fi === fi).sort((a, b) => b.s - a.s)[0];
    const fingerFret = (fi) => noteFor(fi)?.f ?? Math.min(22, base + fi - 1);

    const uMid = fingerU(fingerFret(2));
    const anchor = new THREE.Vector3(X(uMid) + 0.1, -(boardHalf(uMid) + T.knuckleDrop), T.knuckleHeight);
    const s = new THREE.Vector3(1, 0, 0); // index toward the headstock
    const { palm, d } = this.placePalm(anchor, s, v3(T.dorsal));
    const towardPalm = d.clone().negate();

    for (const [fi, name] of Object.entries(FINGER_NAMES)) {
      const note = noteFor(Number(fi));
      let tip;
      if (note) {
        const u = fingerU(note.f);
        tip = new THREE.Vector3(X(u), stringY(note.s, u), STRING_Z + T.pressLift);
      } else {
        const u = fingerU(fingerFret(Number(fi)));
        tip = new THREE.Vector3(X(u), stringY(4.5, u) - 0.3, T.hoverHeight);
      }
      this.finger(name, palm, tip, towardPalm);
    }
    this.thumbTo(palm, new THREE.Vector3(X(uMid) + T.thumb[0], T.thumb[1], T.thumb[2]), s.clone());
    this.show();
  }
}

// ------------------------------------------------------------------ picking (right) hand
export class PickHand extends HandRig {
  // pick: the pick mesh from Guitar3D (its position moves while strumming)
  constructor(scene, pick) {
    super(scene, 'right-hand.glb');
    this.pick = pick;
    this.onReady = () => this.build();
  }

  build() {
    const T = HAND_TUNING;
    this.restPick = (this.pick.userData.rest || this.pick.position).clone();
    const P = this.restPick;
    const s = new THREE.Vector3(1, 0, 0); // thumb/index side toward the neck
    const { palm, d, f } = this.placePalm(P.clone().add(v3(T.pickAnchor)), s, v3(T.pickDorsal));
    const towardPalm = d.clone().negate();
    // index curls behind the pick, the other fingers curl loosely into the palm
    this.finger('index', palm, P.clone().add(v3(T.pickIndexTip)), towardPalm, [1, 0.9]);
    ['middle', 'ring', 'pinky'].forEach((name, i) => {
      const k = palm[`${name}-finger-phalanx-proximal`].p;
      const tip = k.clone().addScaledVector(f, 0.55 - i * 0.05).addScaledVector(towardPalm, 1.1 - i * 0.1);
      this.finger(name, palm, tip, towardPalm, [1, 0.9]);
    });
    this.thumbTo(palm, P.clone().add(v3(T.pickThumbTip)), towardPalm.clone().add(new THREE.Vector3(-1, 0, 0)).normalize());
    this.show();
  }

  // call every frame: the whole hand follows the pick
  follow() {
    if (!this.root || !this.restPick) return;
    this.root.position.subVectors(this.pick.position, this.restPick);
  }
}

// Planar 3-segment IK: segment angles 0, θ·k0, θ·(k0+k1), solved so |tip − base| matches. Bends toward `bendDir`.
export function solveChain(base, target, lens, bendDir, k = [1, 0.8]) {
  const [a, b, c] = lens;
  const toT = target.clone().sub(base);
  const dist = toT.length();
  const u = toT.clone().normalize();
  const v = bendDir.clone().addScaledVector(u, -bendDir.dot(u));
  if (v.lengthSq() < 1e-6) v.set(0, 0, 1).addScaledVector(u, -u.z);
  v.normalize();
  const shape = (th) => {
    const t2 = th * k[0];
    const t3 = t2 + th * k[1];
    const p1 = new THREE.Vector2(a, 0);
    const p2 = p1.clone().add(new THREE.Vector2(Math.cos(t2), Math.sin(t2)).multiplyScalar(b));
    const p3 = p2.clone().add(new THREE.Vector2(Math.cos(t3), Math.sin(t3)).multiplyScalar(c));
    return [new THREE.Vector2(0, 0), p1, p2, p3];
  };
  let lo = 0;
  let hi = 1.45;
  let th = 0;
  if (shape(0)[3].length() <= dist) th = 0;
  else if (shape(hi)[3].length() >= dist) th = hi;
  else {
    for (let i = 0; i < 40; i++) {
      th = (lo + hi) / 2;
      if (shape(th)[3].length() > dist) lo = th;
      else hi = th;
    }
  }
  const pts2 = shape(th);
  const phi = Math.atan2(pts2[3].y, pts2[3].x);
  return pts2.map((p) => {
    const r = p.clone().rotateAround(new THREE.Vector2(0, 0), -phi);
    return base.clone().addScaledVector(u, r.x).addScaledVector(v, r.y);
  });
}
