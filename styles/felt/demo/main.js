// "Mostly Air": a cloud of wool is poked into a small bird that blinks. render(t) draws any frame, deterministically.
// The wool and the needle move on twos (12 drawings per second, with a little hand-made wobble); camera, lamp and wipes move on ones.
import * as THREE from 'three';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, ss, eo, back, mulberry, hash, track } from '/core/lib.js';
import * as W from './wool.js';
import { buildSet, PAL, TABLE_Y, addShadow } from './set.js';
import { makeOverlay } from './overlay.js';
import { DUR, EV, POKES, WIPES } from './timeline.js';

const Wd = innerWidth, Ht = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(2); renderer.setSize(Wd, Ht); document.getElementById('stage').appendChild(renderer.domElement);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0705);
scene.fog = new THREE.Fog(0x0a0705, 60, 120);
const camera = new THREE.PerspectiveCamera(28, Wd / Ht, .5, 220); scene.add(camera);
W.initWool();
const S = await buildSet(scene, renderer);
await document.fonts.load('600 46px Fredoka');
const overlay = makeOverlay(Wd, Ht); document.body.appendChild(overlay.canvas);

const post = makePost(renderer, scene, camera, Wd, Ht, { ssaa: 2, ao: false });
post.bloom.strength = .1; post.bloom.threshold = .9; post.vig.uniforms.amt.value = .34; post.vig.uniforms.warm.value = .12; post.vig.uniforms.contrast.value = .1; post.vig.uniforms.sat.value = 1.0;

const V = (...a) => new THREE.Vector3(...a);
const K = (t, keys) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t < b[0]) { const u = (t - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * (a[2] === 'l' ? u : ss(u)); }
  }
  return keys[keys.length - 1][1];
};
const jit = (k, id, amp) => (hash(k * 3.17 + id * 11.3) - .5) * 2 * amp;   // a small, repeatable hand-made wobble

// ---------------- the bird, its cloud, and the loose wool ----------------
const bird = new THREE.Group(); scene.add(bird);
const mats = [];
function part(name, geo, o, parent = bird) {
  const mat = W.woolMaterial(o); const m = W.woolMesh(geo, mat); m.name = name; m.userData.mat = mat; m.userData.id = mats.length; mats.push(mat); parent.add(m); return m;
}
const BODY_R = [2.15, 2.1, 2.3], HEAD_R = [1.5, 1.4, 1.45];
const P = {};
P.body = part('body', W.blobGeo(BODY_R, { amp: .035, seed: 2, seg: 84 }), { color: PAL.oat, len: .07, shells: 40, tile: .55, curl: 1.0 });
P.head = part('head', W.blobGeo(HEAD_R, { amp: .03, seed: 4, seg: 72 }), { color: PAL.oat, len: .07, shells: 22, tile: .6 });
P.beak = part('beak', W.lathe(1.35, u => .5 * Math.pow(1 - u, .8) + .01, { seg: 40, rad: 36, amp: .02, seed: 6 }), { color: PAL.mustard, len: .045, shells: 14, tile: .8 });
P.wingL = part('wingL', W.blobGeo([.4, 1.35, 1.75], { amp: .03, seed: 8, seg: 56 }), { color: PAL.slate, len: .06, shells: 18, tile: .6 });
P.wingR = part('wingR', W.blobGeo([.4, 1.35, 1.75], { amp: .03, seed: 9, seg: 56 }), { color: PAL.slate, len: .06, shells: 18, tile: .6 });
P.tail = part('tail', W.blobGeo([.95, .25, 1.5], { amp: .03, seed: 10, seg: 48 }), { color: PAL.slateDk || 0x5f7488, len: .06, shells: 16, tile: .6 });
P.footL = part('footL', W.blobGeo([.42, .2, .72], { amp: .03, seed: 11, seg: 36 }), { color: 0xb08a4e, len: .04, shells: 12, tile: .8 });
P.footR = part('footR', W.blobGeo([.42, .2, .72], { amp: .03, seed: 12, seg: 36 }), { color: 0xb08a4e, len: .04, shells: 12, tile: .8 });
P.tuft = part('tuft', W.blobGeo([1.25, 1.0, .5], { amp: .08, seed: 13, seg: 56 }), { color: PAL.rust, len: .22, shells: 22, tile: .55 }, scene);
const cloudB = part('cloudB', W.blobGeo([1.8, 1.5, 1.6], { amp: .05, seed: 14, seg: 56 }), { color: PAL.oat, len: .07, shells: 36, tile: .55, curl: 1.0 }, scene);
const cloudC = part('cloudC', W.blobGeo([1.5, 1.4, 1.5], { amp: .05, seed: 15, seg: 56 }), { color: PAL.oat, len: .07, shells: 36, tile: .55, curl: 1.0 }, scene);
P.cloudB = cloudB; P.cloudC = cloudC;
// eyes: two black beads
const beadMat = new THREE.MeshStandardMaterial({ color: 0x0c0a09, roughness: .22, metalness: 0 });
const beadGeo = new THREE.SphereGeometry(.17, 24, 18);
P.eyeL = new THREE.Mesh(beadGeo, beadMat); P.eyeR = new THREE.Mesh(beadGeo, beadMat); bird.add(P.eyeL, P.eyeR);
// the patch of rust wool felted into the breast
{ const u = P.body.userData.mat.userData.u; u.uCol2.value.set(PAL.rust); }

// the wool wipe: big lumps of wool sweep past the lens
const wipeA = part('wipeA', W.blobGeo([16, 11, 5], { amp: .12, seed: 21, seg: 56 }), { color: 0xe3d8c2, len: 1.0, shells: 40, tile: .25, curl: 1.2, mottle: .3 }, camera);
const wipeB = part('wipeB', W.blobGeo([13, 9, 4], { amp: .12, seed: 22, seg: 56 }), { color: 0xd9a99a, len: 1.0, shells: 40, tile: .25, curl: 1.2, mottle: .3 }, camera);
wipeA.visible = wipeB.visible = false;
{ for (const w of [wipeA, wipeB]) { const u = w.userData.mat.userData.u; u.uSolid.value = 1; u.uLump.value = 1.5; u.uWob.value = .1; } }
// geometry rests (bird space, y up from the pad top)
const HEAD_REST = V(0, 4.3, .55), BEAK_REST = V(0, 4.1, 1.85);
const EYE_DIR = s => V(s * .43, .2, .88).normalize();
const eyeRest = s => { const d = EYE_DIR(s); return V(HEAD_REST.x + d.x * HEAD_R[0] * .985, HEAD_REST.y + d.y * HEAD_R[1] * .985, HEAD_REST.z + d.z * HEAD_R[2] * .985); };

// blob shadows
const shContact = addShadow(S, scene, 0, 0, 4, 3.4, 0, .8), shBird = addShadow(S, scene, 0, 0, 7, 6, 0, .55), shHead = addShadow(S, scene, 7.6, 0, 3, 3, 0, 0), shNeedle = addShadow(S, scene, 0, 0, 1, 1, TABLE_Y + .02, 0);

// ---------------- poke targets ----------------
const resolve = {
  body: (R) => { const th = (R() - .5) * 1.7, ph = .15 + R() * .95; return [P.body, V(Math.sin(th) * Math.cos(ph) * BODY_R[0], Math.sin(ph) * BODY_R[1], Math.cos(th) * Math.cos(ph) * BODY_R[2])]; },
  neck: (R) => [P.head, V((R() - .5) * 1.8, -.7 - R() * .2, .9 + R() * .3)],
  beak: (R) => [P.beak, V((R() - .5) * .5, (R() - .5) * .5, .15 + R() * .1)],
  wingL: (R) => [P.wingL, V(-.4, (R() - .5) * 1.8, (R() - .5) * 2.2)],
  wingR: (R) => [P.wingR, V(.4, (R() - .5) * 1.8, (R() - .5) * 2.2)],
  breast: (R) => { const d = V((R() - .5) * 1.2, -.3 + (R() - .5) * .6, .95).normalize(); return [P.body, V(d.x * BODY_R[0], d.y * BODY_R[1], d.z * BODY_R[2])]; },
  eyeL: () => [P.eyeL, V(0, 0, .17)], eyeR: () => [P.eyeR, V(0, 0, .17)],
};
const PK = POKES.map((p, i) => {
  const R = mulberry(500 + i * 7), [mesh, local] = resolve[p.target](R);
  return { ...p, mesh, local, k: Math.round(p.t * 12) - 1 };   // the deepest drawing of the stab lands on the grid
});
// the cloud is set down on the pad at bar 1: a dent and a puff, but no needle
PK.push({ t: 1.667, target: 'body', mesh: P.body, local: V(0, -BODY_R[1] * .92, 0), k: Math.round(1.667 * 12) - 1, noNeedle: true });
PK.sort((a, b) => a.k - b.k);
const PKN = PK.filter(p => !p.noNeedle);
const wpos = new THREE.Vector3();
const worldOf = pk => pk.mesh.localToWorld(wpos.copy(pk.local)).clone();
// dent depth in cm by drawings after the stab
const DENT = [0, .46, .3, .16, .09], dentAt = n => n < 0 ? 0 : n < DENT.length ? DENT[n] : .05 * Math.exp(-(n - 4) / 10);

// ---------------- the needle ----------------
const AX = V(.3, 1, .22).normalize(), IDLE = V(12, 9.5, 5), LAY = { tip: V(4.8, TABLE_Y + .12, 6.8), dir: V(.82, .06, .57).normalize() };
const hwin = p => [2.0, 1.2, .3, -.85, .5, 1.7][p] ?? 2;
function needlePose(k, ts) {
  // which pokes are near this drawing
  let i = -1; for (let q = 0; q < PKN.length; q++) if (PKN[q].k <= k) i = q; else break;
  const j = i + 1 < PKN.length ? i + 1 : -1;
  const A = i >= 0 ? worldOf(PKN[i]) : null, B = j >= 0 ? worldOf(PKN[j]) : null;
  let base = null, h = 2.2, hov = 2.0;
  const gap = A && B ? PKN[j].k - PKN[i].k : 999;
  if (A && B && gap <= 14) {
    base = A.clone().lerp(B, ss(clamp((k - PKN[i].k - 1) / Math.max(1, gap - 2))));
  } else {
    // idle excursions
    const legA = A ? clamp((k - (PKN[i].k + 3)) / 6) : 1, legB = B ? clamp(1 - (PKN[j].k - 2 - k) / 6) : 0;
    const from = A ? A.clone().addScaledVector(AX, hov) : IDLE.clone(), to = B ? B.clone().addScaledVector(AX, hov) : IDLE.clone();
    base = null;
    let p;
    if (!A) p = IDLE.clone().lerp(to, ss(legB));
    else if (!B) p = from.lerp(IDLE, ss(legA));
    else p = legB > 0 ? IDLE.clone().lerp(to, ss(legB)) : from.lerp(IDLE, ss(legA));
    // fully idle position for the tip (already includes the hover height)
    return { tip: p, dir: AX.clone().lerp(V(.5, 1, .1).normalize(), (A && !B && legA > 0) || (!A) ? .5 : 0).normalize(), idle: true };
  }
  for (const s of [i - 1, i, j]) if (s >= 0 && s < PKN.length) { const p = k - (PKN[s].k - 2); if (p >= 0 && p <= 5) h = Math.min(h, hwin(p)); }
  if (h > 1.99) h = Math.max(1.0, h - (k % 2) * 0);   // between pokes of a run the tip hovers at ~1
  // hovering between nearby stabs
  if (h >= 2) h = 1.9;
  const tip = base.clone().addScaledVector(AX, h);
  return { tip, dir: AX.clone(), idle: false, base, h };
}
const needleShow = (k, ts) => {
  // the needle comes in at 3.3 s and goes away after the last stab; at 44.8-46 it is laid down on the table
  const t = k / 12;
  let o = needlePose(k, ts);
  const lay = ss(clamp((t - 44.6) / 1.5));
  if (lay > 0) {
    const from = o.tip, to = LAY.tip;
    // path: lift over, then lower
    const p = from.clone().lerp(to, lay); p.y += Math.sin(lay * Math.PI) * 3;
    return { tip: p, dir: o.dir.clone().lerp(LAY.dir, lay).normalize(), idle: true };
  }
  return o;
};

// ---------------- wisps ----------------
const wisps = new W.Wisps(1100, 7); scene.add(wisps.mesh);
const halos = [];
function haloFor(mesh, n, o = {}) {
  const R = mulberry(900 + halos.length * 13), pos = mesh.geometry.attributes.position, nor = mesh.geometry.attributes.normal, h = [];
  for (let i = 0; i < n; i++) { const v = Math.floor(R() * pos.count); h.push({ p: V(pos.getX(v), pos.getY(v), pos.getZ(v)), n: V(nor.getX(v), nor.getY(v), nor.getZ(v)).normalize(), len: .5 + R() * .9, curl: (R() - .5) * 2, ph: R() * 6.28, s: R() }); }
  halos.push({ mesh, h, ...o });
}
haloFor(P.body, 120, { len: 1, col: PAL.oat, alpha: .5 }); haloFor(P.head, 40, { len: .8, col: PAL.oat, alpha: .5 });
haloFor(cloudB, 60, { len: 1, col: PAL.oat, alpha: .5 }); haloFor(cloudC, 50, { len: 1, col: PAL.oat, alpha: .5 });
haloFor(P.wingL, 16, { len: .7, col: PAL.slate, alpha: .5 }); haloFor(P.wingR, 16, { len: .7, col: PAL.slate, alpha: .5 });
haloFor(P.tuft, 40, { len: 1, col: PAL.rust, alpha: .55 });
S.nests.forEach(n => haloFor(n.mesh, 28, { len: 1, col: n.color, alpha: .45 }));
const tmpC = new THREE.Color();
function lampTint(c, k = 1) { tmpC.set(c); return [tmpC.r * 1.5 * k, tmpC.g * 1.25 * k, tmpC.b * 1.0 * k]; }
const _a = V(0, 0, 0), _b = V(0, 0, 0), _n = V(0, 0, 0), _t = V(0, 0, 0);
const nm = new THREE.Matrix3();
function pathPts(root, dir, len, curl, droop, seed, k, ph) {
  // tangent for the curl: perpendicular to dir
  _t.set(-dir.z, 0, dir.x); if (_t.lengthSq() < 1e-4) _t.set(1, 0, 0); _t.normalize();
  const pts = [];
  for (let s = 0; s <= 7; s++) {
    const u = s / 7, w = jit(k, seed + s, .035 * len);
    pts.push(V(root.x + dir.x * len * u + _t.x * curl * len * u * u * .6 + w, root.y + dir.y * len * u - droop * len * u * u + jit(k, seed + s + 50, .03 * len), root.z + dir.z * len * u + _t.z * curl * len * u * u * .6 + w));
  }
  return pts;
}

// ---------------- state of the wool through time ----------------
const lampLevel = ts => K(ts, [[0, .34], [.1, .34], [.14, .7], [.3, .42], [.45, 1], [48.4, 1], [49.6, .5], [49.72, .5], [49.9, .04]]);
const camTrack = {
  s1: track([
    [0, [2.4, 5.0, 17.5, 0, 3.6, 2.0, 27, 520]], [1.667, [2.5, 5.0, 17.0, 0, 3.6, 2.1, 27, 520]], [3.3, [1.5, 5.6, 13.5, 0, 6.0, 1.0, 22, 560]], [6.0, [2.0, 5.4, 12.5, 0, 5.8, 1.0, 22, 560]], [7.6, [2.2, 5.2, 12.0, 0, 5.4, 1.0, 22, 560]],
    [12.4, [8, 9.5, 31, -1.5, 1.2, -1, 30, 150]], [14.6, [7.5, 5.8, 22, 0, 1.8, -.5, 28, 260]], [19.67, [-6, 5.8, 21, 0, 1.9, -.4, 28, 260]],
  ]),
  s2: track([
    [19.67, [5.5, 6.2, 19, .8, 3.2, .4, 30, 360]], [23.0, [3.5, 5.8, 15, 0, 3.4, .6, 28, 420]], [24.0, [2, 10, 12.5, 0, 2.2, .3, 28, 300]], [26.3, [2.4, 10.5, 12.5, 0, 2.2, .3, 28, 300]],
    [27.8, [-4.5, 6.2, 15, 0, 2.8, .5, 28, 340]], [28.4, [-3.2, 4.4, 12, .3, 2.3, 1, 27, 420]], [31.0, [-.5, 3.4, 8.6, 0, 1.9, 1.9, 26, 520]], [36.11, [.6, 3.1, 8.2, 0, 1.9, 1.9, 26, 520]],
  ]),
  s3: track([
    [36.11, [1.6, 5.2, 8.8, 0, 4.4, 1.3, 24, 560]], [41.7, [1.3, 5.1, 8.5, 0, 4.4, 1.3, 24, 560]], [44.0, [3.5, 7.5, 17, 0, 3.2, .5, 28, 380]], [46.0, [5, 9, 32, -1.5, 5.5, -3, 31, 230]], [48.0, [6, 11, 43, -4, 10, -6, 34, 150]], [52, [6.3, 11.2, 44, -4.2, 10, -6, 34, 150]],
  ]),
};
const QS = new URLSearchParams(location.search), DBG = QS.get('cam') ? QS.get('cam').split(',').map(Number) : null;
function camAt(t) {
  if (DBG) return { pos: V(DBG[0], DBG[1], DBG[2]), look: V(DBG[3], DBG[4], DBG[5]), fov: DBG[6] || 30, aper: DBG[7] || 100 };
  const f = t < 19.67 ? camTrack.s1 : t < 36.11 ? camTrack.s2 : camTrack.s3;
  const c = f(t); return { pos: V(c[0], c[1], c[2]), look: V(c[3], c[4], c[5]), fov: c[6], aper: c[7] };
}

// the performance, as functions of the drawing time
function pose(ts, k) {
  // --- the cloud becomes a ball ---
  const sc = K(ts, [[0, 1.75], [3.9, 1.75], [12.6, 1]]);
  const solid = K(ts, [[0, .6], [3.9, .6], [8, .8], [12.6, 1]]);
  const lenCm = K(ts, [[0, 1.0], [3.9, 1.0], [12.6, .07]]), lumpCm = K(ts, [[0, 1.0], [3.9, 1.0], [12.6, .04]]);
  const cloudAmt = K(ts, [[0, 1], [12.6, 1], [13.2, 0]]);
  // bounces of the ball (phase B), squash on landing
  const hop = (t0, t1, h) => (ts > t0 && ts < t1) ? h * 4 * ((ts - t0) / (t1 - t0)) * (1 - (ts - t0) / (t1 - t0)) : 0;
  const bounce = hop(16.67, 17.22, 2.7) + hop(17.3, 17.78, 1.3) + hop(17.85, 18.33, .55);
  const land = K(ts, [[1.667, 1], [1.75, .84], [2.0, 1.05], [2.4, 1]]);
  const SQ = land * K(ts, [[16.4, 1], [16.62, .9], [16.67, 1.04], [17.22, 1.05], [17.28, .84], [17.5, .96], [17.78, .97], [17.84, .86], [18.0, .97], [18.33, .98], [18.4, .9], [18.7, 1],
    [21.5, 1], [21.667, 1], [21.75, .9], [22.0, 1]]);
  const body = P.body;
  const fallU = clamp((ts - .3) / 1.367), fall = ts < 1.667 ? 3.4 * (1 - eo(fallU)) : 0, sway = ts < 1.667 ? Math.sin(ts * 3.1) * .35 * (1 - fallU) : 0;
  const bs = sc;
  body.scale.set(bs / Math.sqrt(SQ), bs * SQ, bs / Math.sqrt(SQ));
  body.position.set(jit(k, 1, .01) + sway, BODY_R[1] * bs * SQ + bounce + fall + jit(k, 2, .01), 0);
  const bu = body.userData.mat.userData.u;
  bu.uSolid.value = solid; bu.uLen.value = lenCm / bs; bu.uLump.value = lumpCm / bs; bu.uGrav.value.set(0, -.2 * (lenCm / bs), 0);
  bu.uWob.value = .02 / bs; bu.uCurl.value = K(ts, [[0, 1.1], [3.9, 1.1], [12.6, .25]]);
  // the satellite lumps merge into the body
  for (const [m, b0, b1, s0] of [[cloudB, V(-2.6, 1.7, .9), V(-.5, 2.2, .3), 1.0], [cloudC, V(2.5, 1.4, -.4), V(.6, 2.0, -.2), .85]]) {
    const mu = m.userData.mat.userData.u, e = ss(clamp((ts - 4.5) / 8));
    m.visible = cloudAmt > .01; const msc = lerp(s0, .2, e) * bs / 1.75 * (1 + jit(k, m.userData.id, .01));
    m.scale.setScalar(msc);
    m.position.copy(b0).lerp(b1, e).add(V(0, 0, 0)); m.position.y = Math.max(m.position.y, 1.2 * msc) + fall; m.position.x += sway; m.position.add(V(jit(k, 5 + m.userData.id, .015), 0, jit(k, 7, .015)));
    mu.uSolid.value = solid; mu.uLen.value = lenCm / msc; mu.uLump.value = lumpCm / msc; mu.uGrav.value.set(0, -.2 * lenCm / msc, 0); mu.uWob.value = .02 / msc;
  }

  // --- the head rolls in, climbs on, and is joined ---
  const head = P.head;
  const hx = K(ts, [[19.9, 8.4], [20.28, 8.4], [21.11, 3.75]]), rolling = ts > 20.28 && ts < 21.11;
  const climb = ss(clamp((ts - 21.25) / .42));
  const hpx = lerp(hx, HEAD_REST.x, climb), hpz = lerp(.0, HEAD_REST.z, climb);
  const hpy = lerp(HEAD_R[1], HEAD_REST.y, climb) + Math.sin(climb * Math.PI) * 1.6;
  const sqH = K(ts, [[21.6, 1], [21.667, 1], [21.75, .86], [22.0, 1.03], [22.3, 1]]);
  head.position.set(hpx + jit(k, 20, .01), hpy * (ts > 21.667 ? sqH : 1) - (ts > 21.667 ? (1 - sqH) * 0 : 0), hpz);
  head.scale.set(1 / Math.sqrt(sqH), sqH, 1 / Math.sqrt(sqH));
  head.rotation.set(0, 0, (8.4 - hx) / HEAD_R[1] * (1 - climb) + jit(k, 21, .004));
  head.visible = ts > 19.8;
  { const u = head.userData.mat.userData.u; u.uSeed.value = k % 7 * 1.3; u.uLen.value = .07; u.uWob.value = .015; }
  // a look at where the head waits (the pad), then the pose after joining: tilts and turns
  const look = K(ts, [[22, 0], [26, 0], [28, 0], [42.6, 0], [43.4, -.28], [45.5, .12]]);
  const peep = K(ts, [[41.55, 0], [41.667, 1], [41.9, 0]]) ;
  const nod = K(ts, [[41.2, 0], [41.6, .07], [41.667, -.06], [41.9, -.03], [42.3, 0]]);
  if (climb >= 1) { head.rotation.y = look; head.rotation.x = nod; head.rotation.z = jit(k, 22, .006); }
  const ox = body.position.x, joinPoke = ts > 21.7 ? 1 : 0;

  // --- beak, wings, tail, feet ---
  const arrive = (t0, t1, from, to, mesh, rot) => {
    const u = clamp((ts - t0) / (t1 - t0)), e = u < 1 ? eo(u) : 1;
    mesh.visible = ts >= t0 - .001;
    mesh.position.copy(from).lerp(to, e);
    return u;
  };
  { // beak
    const u = arrive(22.656, 23.056, V(0, 6.8, 4.2), BEAK_REST, P.beak);
    const sq = K(ts, [[23.056, 1], [23.14, .8], [23.4, 1.05], [23.7, 1]]);
    P.beak.scale.setScalar(lerp(.5, 1, u) * (ts >= 23.056 ? sq : 1)); P.beak.rotation.set(.16 + (1 - u) * .8, 0, 0); P.beak.position.x += jit(k, 30, .008);
    const bu2 = P.beak.userData.mat.userData.u; bu2.uLen.value = .045 / P.beak.scale.x;
  }
  for (const [mesh, s, t0] of [[P.wingL, -1, 23.49], [P.wingR, 1, 24.32]]) {
    const rest = V(s * 2.0, 2.4, -.1), from = V(s * 6.2, 5.5, .5), u = arrive(t0, t0 + .4, from, rest, mesh);
    const sq = K(ts, [[t0 + .4, 1], [t0 + .5, .85], [t0 + .8, 1.04], [t0 + 1.0, 1]]);
    mesh.scale.set(lerp(.5, 1, u) * (ts > t0 + .4 ? 1 / Math.sqrt(sq) : 1), lerp(.5, 1, u) * (ts > t0 + .4 ? sq : 1), lerp(.5, 1, u));
    mesh.rotation.set(-.22, s * .1, s * (.16 + (1 - u) * .9)); mesh.position.x += jit(k, 31 + s, .008);
    mesh.userData.mat.userData.u.uLen.value = .06;
  }
  { const u = clamp((ts - 26.3) / .45), pop = u < 1 ? back(u, 2.2) : 1;
    P.tail.visible = ts >= 26.3; P.tail.position.set(0, 1.95, -2.35 - (1 - pop) * -1.0); P.tail.scale.setScalar(Math.max(.01, pop)); P.tail.rotation.set(.38, 0, 0);
    for (const [ft, s] of [[P.footL, -1], [P.footR, 1]]) { const v = clamp((ts - 26.55) / .35), pp = v < 1 ? back(v, 2.4) : 1;
      ft.visible = ts >= 26.55; ft.position.set(s * .85, .2, 1.65); ft.scale.setScalar(Math.max(.01, pp)); ft.rotation.set(0, s * -.2, 0); }
  }
  // --- the rust wool laid on the breast and blended in ---
  const tf = P.tuft, tu = tf.userData.mat.userData.u;
  { const arr = clamp((ts - 28.94) / .5), sink = ss(clamp((ts - 30.6) / 3.2));
    tf.visible = ts >= 28.94 && sink < .999;
    const p0 = V(3.5, 6.5, 4.5), pR = V(0, 1.75, 2.38);
    tf.position.copy(p0).lerp(pR, eo(arr)); tf.position.z -= sink * .6; tf.position.x += jit(k, 40, .01);
    const flat = lerp(1, .35, ss(clamp((ts - 29.4) / 1.2))) * (1 - sink * .8);
    tf.scale.set(1 - sink * .4, 1 - sink * .4, flat); tf.rotation.set(-.25 * (1 - arr), 0, .2);
    tu.uSolid.value = 1; tu.uLen.value = lerp(.28, .1, sink) / tf.scale.x; tu.uWob.value = .03;
    const bp = body.userData.mat.userData.u;
    const patch = K(ts, [[29.6, 0], [29.7, 1]]);
    bp.uPatchOn.value = ts > 29.55 ? 1 : 0; bp.uPatchC.value.set(0, -.35, 2.05); bp.uPatchAx.value.set(1, 1.1, .7);
    bp.uPatchR.value = K(ts, [[29.6, .5], [33.5, 1.15], [36, 1.3]]);
    bp.uBlendSoft.value = K(ts, [[29.6, .05], [31.0, .12], [34.0, .55], [36, .75]]);
    bp.uPatchNoise.value = .45;
  }
  // --- eyes, blinks, the peep ---
  for (const [e, s, t0] of [[P.eyeL, -1, 37.2], [P.eyeR, 1, 37.76]]) {
    const r = eyeRest(s), u = clamp((ts - t0) / .3);
    e.visible = ts >= t0;
    e.position.set(r.x, r.y + (1 - eo(u)) * 3, r.z + (1 - eo(u)) * .6);
    const blink = (ts >= 40.56 && ts < 40.56 + 2 / 12) || (ts >= 44.25 && ts < 44.25 + 2 / 12) ? .12 : 1;
    const land = ts > t0 + .3 && ts < t0 + .55 ? .7 : 1;
    e.scale.set((blink < 1 ? 1.2 : 1) * (land < 1 ? 1.15 : 1), blink * land, 1);
    e.position.x += jit(k, 60 + s, 0.004);
  }
  // body settle after the head joins, the peep, and breathing
  { const pu = K(ts, [[41.667, 0], [41.75, 1], [41.9, 1], [42.0, 0]]);
    bird.position.y = .28 * pu; bird.rotation.z = jit(k, 70, ts > 26.7 ? .004 : 0); }
  const breathe = ts > 26.7 ? 1 + .006 * Math.sin(ts * 2.2) + jit(k, 71, .002) : 1;
  if (ts > 22) { body.scale.multiplyScalar(breathe); }

  // --- wool wipes ---
  { let on = false; WIPES.forEach(([a, b], wi) => { if (ts >= a && ts < b) { on = true; const u = (ts - a) / (b - a), e = u;
      wipeA.position.set(lerp(40, -40, e), 0, -9); wipeB.position.set(lerp(58, -26, e), -2 + jit(k, 90, .3), -6.5);
      wipeA.rotation.set(0, 0, e * 1.2); wipeB.rotation.set(0, 0, -e * 1.5); } }); wipeA.visible = wipeB.visible = on; }
  // --- dents from the needle ---
  { const soft = K(ts, [[0, 2.6], [12.6, 1]]);
    for (const mesh of [P.body, P.head, P.beak, P.wingL, P.wingR]) {
      const list = []; const sc2 = mesh.scale.x * (mesh.parent === bird ? 1 : 1);
      for (let q = PK.length - 1; q >= 0 && list.length < 6; q--) { const p = PK[q]; if (p.mesh !== mesh) continue; const n = k - p.k; if (n < 0 || n > 40) continue; list.push({ p: p.local, d: dentAt(n) * soft / sc2 }); }
      W.setPokes(mesh.userData.mat, list); mesh.userData.mat.userData.u.uPokeR.value = .55 * soft / sc2;
    } }
  // --- shadows and per-drawing fibre boil ---
  mats.forEach((m, i) => { m.userData.u.uSeed.value = (hash(k * 1.7 + i * 5.3) - .5) * 2.2; });
  shBird.position.set(.9, 0.03, .9); shBird.scale.set(7.2 * (ts > 19.8 ? 1 : 1) * Math.max(.75, bs / 1.75 * .6 + .4), 6 * Math.max(.75, bs / 1.75 * .6 + .4), 1);
  shBird.material.opacity = .62; shContact.position.set(.2, .03, .25); const cs = Math.max(.7, bs / 1.75 * .5 + .5); shContact.scale.set(4.2 * cs, 3.6 * cs, 1); shContact.material.opacity = bounce > .3 ? .8 / (1 + bounce) : .85;
  shHead.material.opacity = ts > 19.8 && ts < 21.3 ? .4 : 0; shHead.position.set(hpx + .6, .03, .5 + hpz);
}

// ---------------- wisps and puffs, rebuilt on every drawing ----------------
function buildWisps(ts, k, camPos) {
  wisps.reset();
  const lit = lampLevel(ts);
  const mk = (col, a, kk = 1) => lampTint(col, .75 * kk * (.25 + .75 * lit));
  // halo wisps
  for (const hl of halos) {
    const m = hl.mesh; if (!m.visible) continue;
    m.updateWorldMatrix(true, false); nm.getNormalMatrix(m.matrixWorld);
    let amt = 1, lscale = 1;
    if (m === P.body || m === cloudB || m === cloudC) { amt = K(ts, [[0, 1], [3.9, 1], [12.6, .22], [14, .22]]); lscale = K(ts, [[0, 3.2], [3.9, 3.2], [12.6, 1]]); if (m !== P.body && ts > 12.6) continue; }
    if (hl.mesh === P.tuft) { amt = K(ts, [[28.94, 1], [31, 1], [33, 0]]); }
    const n = Math.floor(hl.h.length * amt), col = lampTint(hl.col, .8 * (.25 + .75 * lit));
    for (let i = 0; i < n; i++) {
      const w = hl.h[i]; _a.copy(w.p); m.localToWorld(_a); _n.copy(w.n).applyMatrix3(nm).normalize();
      const dir = _n.clone(); dir.y += .2; dir.normalize();
      const len = w.len * hl.len * lscale * (hl.mesh.name.startsWith('nest') ? 1 : 1) * .7;
      const pts = pathPts(_a, dir, len, w.curl, .45 + w.s * .5, i + 100, k, w.ph);
      wisps.add(pts, .035 * (1 + w.s), col[0], col[1], col[2], hl.alpha * (.55 + .45 * w.s), camPos);
    }
  }
  // fibres drifting in the air in the first shots
  const air = K(ts, [[0, 1], [9, 1], [13, 0]]);
  if (air > .01) for (let i = 0; i < 46; i++) {
    const R = mulberry(2000 + i), x0 = (R() - .5) * 11, y0 = R() * 7 + .5, z0 = (R() - .5) * 8, sp = .15 + R() * .25, ph = R() * 6.28, len = .9 + R() * 1.3;
    const drift = ts * sp, p = V(x0 + Math.sin(drift + ph) * 1.2, ((y0 + drift * 1.2) % 8) + .8, z0 + Math.cos(drift * .8 + ph) * 1.0);
    const d = V(Math.cos(ph * 2), .35, Math.sin(ph * 2)).normalize();
    const pts = pathPts(p, d, len, Math.sin(ph) * 1.5, .1, 300 + i, k, ph), c = lampTint(PAL.cream, .95 * (.25 + .75 * lit));
    wisps.add(pts, .03, c[0], c[1], c[2], .5 * air * Math.min(1, (p.y - .8) / 1.5), camPos);
  }
  // fibres the barbs catch and drag out as the needle rises
  for (let q = 0; q < PK.length; q++) {
    const p = PK[q], dn = k - p.k;
    if (dn < 2 || dn > 4 || p.target === 'eyeL' || p.target === 'eyeR' || !needleTipNow) continue;
    const T = worldOf(p), col = lampTint(p.mesh === P.wingL || p.mesh === P.wingR ? PAL.slate : p.target === 'breast' ? PAL.rust : PAL.oat, .95 * (.25 + .75 * lit)), a = 1 - (dn - 2) / 3;
    for (let j = 0; j < 3; j++) {
      const R = mulberry(p.k * 17 + j), off = V((R() - .5) * .25, 0, (R() - .5) * .25), pts = [];
      for (let s = 0; s <= 7; s++) { const u = s / 7; pts.push(T.clone().lerp(needleTipNow, u * (.6 + .4 * Math.min(1, (dn - 1) / 2))).addScaledVector(off, 1 - u).add(V(0, -Math.sin(u * Math.PI) * .12 * (1 - a * .5), 0))); }
      wisps.add(pts, .028, col[0], col[1], col[2], .9 * a, camPos);
    }
  }
  // puffs of loose fibre from every stab, and the fibres the barbs drag out
  for (let q = 0; q < PK.length; q++) {
    const p = PK[q], dn = k - p.k;
    if (dn < 1 || dn > 11) continue;
    if (p.target === 'eyeL' || p.target === 'eyeR') continue;
    const T = worldOf(p), nrm = T.clone().sub(p.mesh.getWorldPosition(V(0, 0, 0))).normalize(), col = lampTint(p.mesh === P.beak ? PAL.mustard : p.mesh === P.wingL || p.mesh === P.wingR ? PAL.slate : (p.target === 'breast' ? PAL.rust : PAL.oat), .95 * (.25 + .75 * lit));
    const tau = (dn - 1) / 12;
    for (let j = 0; j < 7; j++) {
      const R = mulberry(p.k * 31 + j), dir = nrm.clone().multiplyScalar(.9).add(V((R() - .5) * 1.6, R() * .7, (R() - .5) * 1.6)).normalize();
      const sp = .9 + R() * 1.1, reach = sp * (1 - Math.exp(-tau * 5)), root = T.clone().addScaledVector(dir, .05);
      const pts = []; for (let s = 0; s <= 7; s++) { const u = s / 7, tt = Math.max(0, reach - u * .35); pts.push(root.clone().addScaledVector(dir, tt).add(V(0, -tau * tau * .6 * (1 + R()) + u * .1, 0))); }
      wisps.add(pts, .03, col[0], col[1], col[2], .75 * Math.max(0, 1 - tau * 1.1), camPos);
    }
  }
  wisps.commit();
}

// ---------------- the frame ----------------
const sky0 = W.LIGHT.sky.clone(), ground0 = W.LIGHT.ground.clone(), lampCol0 = W.LIGHT.lampCol.clone(), spotI0 = S.spot.intensity, bulbCol = new THREE.Color();
let lastK = -1, needleTipNow = null;
function render(t) {
  t = clamp(t, 0, DUR - 1e-4);
  const k = Math.floor(t * 12 + 1e-6), ts = k / 12;
  // camera
  const C = camAt(t);
  camera.fov = C.fov; camera.updateProjectionMatrix(); camera.position.copy(C.pos); camera.lookAt(C.look); camera.updateMatrixWorld();
  post.dof.focus = C.pos.distanceTo(C.look); post.dof.aper = C.aper; post.dof.maxCoc = 14;
  W.LIGHT.cam.copy(C.pos);
  S.lamp.visible = t > 42.5;
  // the lamp
  const lv = lampLevel(t);
  W.LIGHT.lamp.set(-15, 27, 4);
  W.LIGHT.lampCol.copy(lampCol0).multiplyScalar(lv);
  { const af = .12 + .88 * Math.min(1, lv * 1.4); W.LIGHT.sky.copy(sky0).multiplyScalar(af); W.LIGHT.ground.copy(ground0).multiplyScalar(af); }
  S.spot.position.copy(W.LIGHT.lamp); S.spot.target.position.set(0, 0, 0); S.spot.intensity = spotI0 * lv; S.hemi.intensity = .05 + .65 * lv; S.fill.intensity = .7 * lv; scene.environmentIntensity = .02 + .14 * lv;
  if (S.bulbMat) S.bulbMat.emissiveIntensity = 2.2 * lv;
  // the work, moved on twos
  pose(ts, k);
  if (QS.get('tw')) { const [a,b]=QS.get('tw').split(':'); if (a==='scale') P.tuft.scale.set(1,1,1); if (a==='ulen') P.tuft.userData.mat.userData.u.uLen.value=+b; if (a==='wob') P.tuft.userData.mat.userData.u.uWob.value=0; if (a==='rot') P.tuft.rotation.set(0,0,0); }
  for (const nme of (QS.get('hide') || '').split(',')) if (P[nme]) P[nme].visible = false;
  // the needle
  const nd = needleShow(k, ts);
  S.needle.position.copy(nd.tip); S.needle.quaternion.setFromUnitVectors(V(0, 1, 0), nd.dir);
  S.needle.visible = t > 3.2;
  needleTipNow = nd.tip.clone(); needleTipNow.addScaledVector(nd.dir, .25);
  scene.updateMatrixWorld(true);
  if (!QS.get('nowisp')) buildWisps(ts, k, camera.position); else { wisps.reset(); wisps.commit(); }
  post.vig.uniforms.fade.value = 1;
  post.composer.render();
  if (!QS.get('noover')) overlay.draw(t, ts);
}
window.TEXTS = t => overlay.texts(t);
window.render = render; window.DUR = DUR; window.EV = EV;
window.READY = true;
