// "Proof": a lump of dough, a hand-built kitchen, one poke. render(t) draws any frame, deterministically.
// Clay (characters, props, the maker's finger) steps on twos (12 drawings per second); camera, light and sky move on ones.
import * as THREE from 'three';
import { makePost } from '/core/three/post.js';
import { clayMat, lump, worm, lumpGeo, setBoil } from './clay.js';
import { buildSet, PAL } from './set.js';
import { DUR, SHOTS, CAPS, EV } from './timeline.js';

const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(2); renderer.setSize(W, H); document.getElementById('stage').appendChild(renderer.domElement);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0d0a08);
const camera = new THREE.PerspectiveCamera(30, W / H, .3, 160); scene.add(camera);
const ov = new THREE.Scene(), ovCam = new THREE.PerspectiveCamera(30, W / H, .3, 60);   // subtitle plates: drawn after the depth of field
{ const dl = new THREE.DirectionalLight(0xffe2bc, 3.2); dl.position.set(-4, 6, 8); ov.add(dl, new THREE.HemisphereLight(0xcfdcf0, 0xb88a6a, 1.1)); }
await document.fonts.load('600 150px Fredoka');
const set = buildSet(scene, renderer);
const post = makePost(renderer, scene, camera, W, H, { ssaa: 2, ao: true, aoRadius: .55, aoThickness: 2.2, aoAmt: .8, aoScale: 2.2 });
post.bloom.strength = .12; post.vig.uniforms.amt.value = .32; post.vig.uniforms.warm.value = .25; post.vig.uniforms.contrast.value = .12; post.vig.uniforms.sat.value = 1.08;

// ---------- small helpers ----------
const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t, ss = t => { t = cl(t); return t * t * (3 - 2 * t); };
const spr = u => 1 - Math.exp(-5 * u) * Math.cos(u * 11);
// keyframes [t, v, ease?]: smooth by default, 'l' linear, 'p' spring
function K(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t < b[0]) { const u = (t - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * (a[2] === 'l' ? u : a[2] === 'p' ? spr(u) : ss(u)); }
  }
  return keys[keys.length - 1][1];
}
const V = (...a) => new THREE.Vector3(...a);

// ---------- Pip, a lump of dough ----------
const M = set.M, Mlow = clayMat({ fing: .12, pscale: .4, roughness: .7 });
const Mskin = clayMat({ fing: .5, pscale: .3, roughness: 1.1 });
const Mloaf = clayMat({ fing: .3, pscale: .3, roughness: 1.2, coat: .3, sheenColor: 0xd9b88c, stamp: [2.6, .1, .95, .85] });
const DOUGH = { r: [1.58, 1.38, 1.42], e1: .82, e2: .9, c1: PAL.dough, c2: PAL.dough2, marble: .55 };
const LOAF = { r: [2.75, 1.5, 1.8], e1: .72, e2: .62, c1: 0x9a6a38, c2: 0x74502c, marble: .8 };
const poke = { dent: 0, dir: V(.76, .04, .65).normalize() };
const DOUGH_SPEC = { ...DOUGH, amp: .05, freq: 1.3, seed: 5, mfreq: .9,
  bump: (x, y, z) => { const d = Math.hypot(x - poke.dir.x, y - poke.dir.y, z - poke.dir.z); return 1 - poke.dent * (.3 * Math.exp(-d * d / .09) - .06 * Math.exp(-Math.pow(d - .36, 2) / .006)); } };
const body = lump(DOUGH_SPEC, Mskin);
scene.add(body);
const eyeW = [], pupils = [], hls = [], brows = [];
for (const s of [-1, 1]) {
  const ew = lump({ r: [.36, .4, .2], e1: .9, e2: 1, amp: .03, seed: 6 + s, c1: PAL.cream, c2: 0xf6efe0, marble: .2 }, Mlow); scene.add(ew); eyeW.push(ew);
  const pu = lump({ r: [.19, .22, .13], e1: 1, e2: 1, amp: .02, seed: 8 + s, c1: PAL.ink, c2: 0x3b2f2a, marble: .3 }, clayMat({ coat: .8, rough: .3, fing: .2, roughness: .2 })); scene.add(pu); pupils.push(pu);
  const hl = lump({ r: [.065, .065, .05], e1: 1, e2: 1, amp: .02, seed: 12 + s, c1: 0xffffff }, clayMat({ coat: .9, rough: .3, fing: .1, roughness: .1 })); scene.add(hl); hls.push(hl);
  const br = worm({ pts: [[-.3, 0, 0], [0, .06, 0], [.3, 0, 0]], rad: .075, c1: PAL.dough2, c2: 0xb98a55, seg: 14, radial: 9, amp: .06, seed: 20 + s }, M); scene.add(br); brows.push(br);
}
const cheeks = [-1, 1].map(s => { const c = lump({ r: [.32, .22, .1], e1: .9, e2: 1, amp: .05, seed: 30 + s, c1: PAL.rose, c2: 0xd98078, marble: .4 }, M); scene.add(c); return c; });
const mouth = worm({ pts: [[-.34, -.02, 0], [-.12, -.1, 0], [.12, -.1, 0], [.34, -.02, 0]], rad: .06, c1: 0x8a4a3a, c2: 0x6b3a30, seg: 20, radial: 8, amp: .08, seed: 40 }, M); scene.add(mouth);
const arms = [-1, 1].map(s => { const a = lump({ r: [.42, .3, .3], e1: .9, e2: 1, amp: .06, seed: 50 + s, c1: PAL.dough, c2: PAL.dough2, marble: .5 }, Mskin); scene.add(a); return a; });
const feet = [-1, 1].map(s => { const f = lump({ r: [.55, .3, .72], e1: .7, e2: .9, amp: .05, seed: 60 + s, c1: PAL.dough2, c2: 0xc29a62, marble: .5 }, Mskin); f.rotation.y = s * .22; scene.add(f); return f; });
const sprout = worm({ pts: [[0, 0, 0], [.1, .4, 0], [.0, .8, .05], [-.25, 1.05, .1], [-.42, .95, .1]], rad: .11, c1: 0x7aa86a, c2: 0x5d9a62, seg: 28, radial: 9, seed: 70, amp: .06 }, M); scene.add(sprout);
// score marks on the loaf (rolled strips of pale dough)
const slashes = [-1, 0, 1].map(i => { const w = worm({ pts: [[-.55, 0, 0], [0, .1, 0], [.55, 0, 0]], rad: .09, c1: 0xf0dfb0, c2: 0xe0c68a, seg: 16, radial: 8, amp: .08, seed: 90 + i }, M); scene.add(w); return w; });
const pipParts = [body, ...eyeW, ...pupils, ...hls, ...brows, ...cheeks, mouth, ...arms, ...feet, sprout, ...slashes];

// the maker's finger
const Mfinger = clayMat({ fing: 1.3, pscale: .16, hu: .05, roughness: .8, coat: .35, sheenColor: 0xffd6c8 });
const finger = worm({ pts: [[0, 0, 0], [0, 0, 3], [0, .4, 6.5], [0, 1.4, 11]], rad: u => .74 + .08 * Math.sin(u * 9) * (u > .25 ? 1 : 0) + .1 * u, c1: 0xf0b6a0, c2: 0xe0988a, marble: 1, seg: 70, radial: 36, amp: .03, seed: 77, cap: .06 }, Mfinger);
scene.add(finger);
const nail = lump({ r: [.46, .08, .66], e1: .5, e2: .6, amp: .02, seed: 79, c1: 0xf2d4c6, c2: 0xe8bfae, marble: .5 }, clayMat({ coat: .55, rough: .35, fing: .1, roughness: .15 })); scene.add(nail);

// a lump of clay that sweeps across the lens: the transition grammar
const wipeLump = lump({ r: [10, 8, 3], e1: .8, e2: .8, amp: .06, freq: 1.1, seed: 301, c1: PAL.sage, c2: PAL.mustard, marble: .7, mfreq: .3 }, clayMat({ fing: 1, pscale: .08, hu: .1, roughness: 1 })); wipeLump.castShadow = false; wipeLump.visible = false; camera.add(wipeLump);
const WIPES = [[5.7, 6.5], [23.7, 24.5]];

// ---------- the dough's performance, as functions of the drawing time ----------
const SY = [[0, 1], [16.4, 1], [17.3, 1.16], [18.3, 1.15], [18.7, .84], [19.4, .96], [19.9, .96], [20.6, 1.2], [21.6, 1.19], [22.0, .82], [22.8, .95], [24, .97], [29.9, .97], [30.5, .9], [33.8, .9], [34.4, 1.06], [35.0, .98], [35.9, .98], [36.35, .8], [36.85, 1.25], [37.35, .9], [37.6, .8], [38.0, 1.05], [38.6, 1]];
const RISE = [[36.2, 1], [37.0, 1.7, 'p'], [60, 1.7]], HOP = [[36.7, 0], [37.15, 1.3], [37.55, 0]];
const SQUINT = [[0, 0], [17.0, 0], [17.3, .85], [18.5, .85], [18.7, 0], [20.3, 0], [20.6, .85], [21.8, .85], [22.0, 0], [36.9, 0], [37.3, .6], [41, .6], [42.3, .5], [60, .5]];
const BLINKS = [3.0, 10.9, 14.6, 23.1, 35.4, 40.2, 44.0];
const WIDE = [[0, 1], [26.9, 1], [27.5, 1.12], [29.6, 1.12], [30.1, 1.22], [34.0, 1.2], [34.8, 1], [60, 1]];
const BROWB = [[0, .4], [26.9, .4], [27.5, .15], [30, .15], [34.2, .3], [35.5, .45], [36.3, .2], [37.3, -.15], [60, -.15]];
const BROWUP = [[0, 0], [27.4, .1], [30, .2], [34.5, .05], [36, 0], [37.2, .18], [60, .12]];
const MOUTHC = [[0, -.35], [27, -.5], [30, -.1], [34.5, -.3], [36, -.2], [37.3, 1], [60, 1]];
const MOUTHO = [[29.8, 1], [30.4, 1.9], [33.8, 1.9], [34.6, 1], [60, 1]], MOUTHW = [[36.9, 1], [37.4, 1.3], [60, 1.3]];
const GX = [[0, .2], [2, .5], [4.5, .5], [5.5, -.3], [9, 0], [15, .3], [17, 0], [22.8, -.1], [24.5, .7], [28, .7], [29.9, .5], [31, .2], [34, 0], [60, 0]];
const GY = [[0, 0], [2, .15], [16, 0], [17.2, .5], [18.5, .5], [19, -.4], [20.5, .5], [22, -.3], [24.5, .3], [28, .3], [31, .1], [35, 0], [60, 0]];
const CHEEK = [[36.9, 1], [37.5, 1.4], [60, 1.4]];
const ARM = [[0, 0], [29.9, 0], [30.3, .5], [34, .5], [35, 0], [36.6, 0], [37.1, 1], [39, .7], [60, .7]];
const FDIST = [[24.1, 17], [26.9, 3.4], [28.6, 3.1], [29.7, 1.4], [30.2, .2], [31.0, -.28], [33.8, -.28], [34.6, 1.2], [35.6, 10], [36.0, 18]];
const DENT = [[30.2, 0], [31.0, 1], [33.8, 1], [34.2, .75], [35.2, .15], [36.0, 0]];
const SWAP = 42.05;   // under the flour puff, the dough is replaced by the baked loaf

function pose(ts) {
  const loaf = ts >= SWAP, B = loaf ? LOAF : DOUGH;
  if (loaf && body.material !== Mloaf) { body.material = Mloaf; body.spec = { ...body.spec, ...LOAF, amp: .045, seed: 15, bump: null }; }
  if (!loaf && body.material !== Mskin) { body.material = Mskin; body.spec = DOUGH_SPEC; }
  const rx = B.r[0], ry = B.r[1], rz = B.r[2];
  const R = loaf ? 1 : K(ts, RISE), hop = loaf ? 0 : K(ts, HOP);
  const breathe = loaf ? 0 : Math.sin(ts * 1.9) * .012;
  const sy = (loaf ? 1 + Math.sin(ts * 1.5) * .006 : K(ts, SY) + breathe) , sxz = 1 / Math.sqrt(sy);
  const sx = R * sxz, sY = R * sy, sz = R * sxz;
  const strain = Math.max(K(ts, [[16.9, 0], [17.4, 1], [18.5, 1], [18.7, 0], [20.2, 0], [20.7, 1], [21.8, 1], [22.0, 0]]), 0);
  const press = K(ts, [[30.0, 0], [31.0, 1], [33.8, 1], [34.5, 0]]);
  const k = Math.round(ts * 12);
  const lean = loaf ? 0 : (.025 * Math.sin(ts * .9) + .035 * strain * Math.sin(k * 2.9) - .07 * press + .08 * Math.sin(ts * 9) * (1 - ss((ts - 37.2) / 1.6)) * (ts > 37.2 ? 1 : 0));
  body.scale.set(sx, sY, sz); body.rotation.z = lean;
  const by = (ry - .06) * sY + hop; body.position.set(0, by, 0);
  poke.dent = loaf ? 0 : K(ts, DENT);
  let sq = K(ts, SQUINT); for (const b of BLINKS) if (ts >= b && ts < b + .25) sq = Math.max(sq, Math.sin(Math.PI * (ts - b) / .25));
  const wide = K(ts, WIDE), fx = loaf ? 1.55 : 1, es = loaf ? 1.6 : Math.pow(R, .55), up = K(ts, BROWUP), bb = K(ts, BROWB);
  const gx = K(ts, GX), gy = K(ts, GY) * (1 - sq);
  const fz = (x, y, extra = 0) => Math.sqrt(Math.max(.15, 1 - (x / rx) ** 2 - (y / ry) ** 2)) * rz * sz + extra;
  [-1, 1].forEach((s, i) => {
    const ex = s * .52 * fx * sx, ey = .3 * sY, ez = fz(ex / sx, ey / sY, loaf ? .12 : 0);
    eyeW[i].position.set(ex, by + ey, ez - .06); eyeW[i].scale.set(wide * es, wide * es * (1 - .78 * sq), wide * es); eyeW[i].rotation.set(0, s * .12, 0);
    pupils[i].position.set(ex + gx * .1 * wide * es, by + ey + gy * .1 * es - .03 * es * (1 - sq), ez + .1 * wide * es); pupils[i].scale.set(wide * es, wide * es * (1 - sq * .95) + .01, wide * es);
    hls[i].position.set(pupils[i].position.x + .07 * es, pupils[i].position.y + .09 * es * (1 - sq), pupils[i].position.z + .1 * es); hls[i].scale.setScalar(es * (1 - sq * .9) + .01);
    const bl = .3 + .4 * es * wide * (1 - .5 * sq) + .15 + up; brows[i].position.set(ex, by + bl * sY, fz(ex / sx, bl, (loaf ? .12 : .14) * R)); brows[i].rotation.set(0, s * .1, -s * bb); brows[i].scale.setScalar(es);
    const cxp = s * .98 * fx * sx, cyp = -.12 * sY, ch = K(ts, CHEEK);
    cheeks[i].position.set(cxp, by + cyp, fz(cxp / sx, cyp / sY, loaf ? .05 : -.04)); cheeks[i].rotation.y = s * .45; cheeks[i].scale.setScalar(ch * (loaf ? 1.0 : es));
  });
  // mouth: curve c (-1 frown .. 1 smile), open scale, width
  const c = K(ts, MOUTHC) + .08 * strain * Math.sin(k * 3.3), mw = K(ts, MOUTHW) * (loaf ? 1.5 : 1) * es * .8 + .2 * es;
  mouth.spec.pts = [[-.34 * mw, .14 * c, 0], [-.12 * mw, -.1 - .06 * c, 0], [.12 * mw, -.1 - .06 * c, 0], [.34 * mw, .14 * c, 0]];
  mouth.position.set(0, by - .3 * sY * es, fz(0, -.3 * es, loaf ? .12 : .1 * R)); mouth.scale.set(1 / K(ts, MOUTHO) * .9 + .1, K(ts, MOUTHO), 1);
  // limbs
  const ar = K(ts, ARM); const lr = loaf ? 0.001 : Math.pow(R, .6);
  arms.forEach((a, i) => { const s = i ? 1 : -1; a.visible = !loaf; a.scale.setScalar(lr); a.rotation.z = -s * (-.5 - ar * (i ? .8 : 1) * .6 * -1); a.rotation.z = s * -(.5 + ar * .7); a.position.set(s * 1.55 * sx, by - .35 * sY + ar * .28, ts > 29.9 && ts < 35 ? -.15 : .35); });
  feet.forEach((f, i) => { const s = i ? 1 : -1; f.visible = !loaf; f.scale.setScalar(lr); f.position.set(s * .75 * sx, .26 * lr + hop, 1.0 * sz); });
  sprout.position.set(.05 * R, by + ry * sY * (loaf ? .93 : .97), loaf ? -.2 : 0); sprout.rotation.z = .08 * Math.sin(ts * 1.3) + (ts > 37 ? .12 * Math.sin(ts * 8) * (1 - ss((ts - 37) / 1.4)) : 0); sprout.scale.setScalar(loaf ? 1.1 : Math.pow(R, .7));
  slashes.forEach((w, i) => { w.visible = loaf; w.position.set((i - 1) * 1.15, by + ry * sY * .93, -.1 + (i - 1) * .02); w.rotation.set(0, .95 + (i - 1) * .08, 0); });
  // the finger
  const d = poke.dir, fd = K(ts, FDIST), showF = ts >= 24.0 && ts < 36.0 && !loaf;
  finger.visible = nail.visible = showF;
  if (showF) {
    const surfP = V(d.x * rx * sx, by + d.y * ry * sY, d.z * rz * sz), tip = surfP.addScaledVector(d, fd);
    const dir = d.clone().add(V(0, .05, 0)).normalize();
    finger.position.copy(tip); finger.quaternion.setFromUnitVectors(V(0, 0, 1), dir);
    nail.position.copy(tip).addScaledVector(dir, 1.6).add(V(0, .62, 0)); nail.quaternion.setFromUnitVectors(V(0, 0, 1), dir);
  }
  // the clock keeps running (boils on twos); it whirls through the night
  const hh = K(ts, [[0, 0], [6.1, 0], [16, 40, 'l'], [16.1, 40]]) + ts * .02;
  set.hands[0].rotation.z = -2.2 - hh * 6.2832; set.hands[1].rotation.z = .6 - hh * 6.2832 / 12;
  // the flour puff that hides the swap
  set.puff(V(0, by + .6, .6), (ts - 41.4) / 1.5, 4.2);
  return { by, R, loaf, sx, sY, sz };
}

// ---------- plates (captions and title), clay slabs with embossed letters ----------
function plateTextures(text, big) {
  const fs = big ? 235 : 122, h = big ? 400 : 260, w = Math.ceil((() => { const c = document.createElement('canvas').getContext('2d'); c.font = `600 ${fs}px Fredoka`; return c.measureText(text).width; })() + (big ? 200 : 150));
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = big ? '#3d5b50' : '#34505c'; g.fillRect(0, 0, w, h);
  g.font = `600 ${fs}px Fredoka`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = fs * .11; g.strokeText(text, w / 2 + 5, h / 2 + 9);
  g.fillStyle = big ? '#f0b940' : '#f3e3c4'; g.fillText(text, w / 2, h / 2 + 4);
  const b = document.createElement('canvas'); b.width = w; b.height = h; const bg = b.getContext('2d');
  bg.fillStyle = '#000'; bg.fillRect(0, 0, w, h); bg.filter = 'blur(5px)'; bg.font = g.font; bg.textAlign = 'center'; bg.textBaseline = 'middle'; bg.lineJoin = 'round';
  bg.strokeStyle = '#fff'; bg.lineWidth = fs * .08; bg.strokeText(text, w / 2, h / 2 + 4); bg.fillStyle = '#fff'; bg.fillText(text, w / 2, h / 2 + 4);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  return { map, bump: new THREE.CanvasTexture(b), w, h };
}
const plates = CAPS.map((cp, n) => {
  const t = plateTextures(cp.text, cp.big), ph = t.h / 302.3, pw = t.w / 302.3;
  const g = lumpGeo({ r: [pw / 2, ph / 2, .12], e1: .3, e2: .22, amp: .02, freq: 1.2, seed: 3 + n, c1: 0xffffff, c2: 0xffffff, marble: 0 });
  const P = g.attributes.position, uv = new Float32Array(P.count * 2); for (let i = 0; i < P.count; i++) { uv[i * 2] = P.getX(i) / pw + .5; uv[i * 2 + 1] = P.getY(i) / ph + .5; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const mat = clayMat({ fing: .12, pscale: .8, hu: .02, roughness: .35, coat: .3 });
  mat.map = t.map; mat.bumpMap = t.bump; mat.bumpScale = 2.2; mat.emissive = new THREE.Color(0x1d2a30);
  const mesh = new THREE.Mesh(g, mat); mesh.visible = false; ov.add(mesh); return { cp, mesh, pw, ph };
});
const popScale = f => f < 0 ? 0 : [0, .55, 1.12, .96][f] ?? 1;

// ---------- cameras ----------
const ease = ss;
function shotAt(t) {
  for (const s of SHOTS) if (t < s.t1) return s; return SHOTS[SHOTS.length - 1];
}
function camFor(s, t) {
  const u = cl((t - s.t0) / (s.t1 - s.t0));
  switch (s.id) {
    case 'worry': return { fov: 25, pos: V(3.2 - .5 * u, 2.5 - .05 * u, 14 - u), look: V(.25, 1.45, 0), focus: V(0, 1.4, 1), aper: 360, coc: 16 };
    case 'night': { const x = lerp(-10, -.6, ease(u)); return { fov: 32, pos: V(x, 3.2, 11.5), look: V(x + 2.6, 3.4, -3), focus: V(x + 1.5, 2.2, -1), aper: 300, coc: 14 }; }
    case 'strain': return { fov: 26, pos: V(2.0 - .2 * u, 2.0, 9.2 - .5 * u), look: V(0, 1.75, 0), focus: V(0, 1.5, 1.2), aper: 340, coc: 16 };
    case 'enter': return { fov: 36, pos: V(-2.8 + .6 * u, 1.2 + .2 * u, 9.6 - .8 * u), look: V(2.0, 1.9, 0), focus: V(0, 1.4, 1), aper: 420, coc: 14 };
    case 'poke': { const f = K(t, [[29.7, 0], [31.2, 0], [31.9, 1], [60, 1]]); const g = K(t, [[34, 0], [35.8, 1]]); return { fov: 27, pos: V(lerp(-.9 + .3 * u, .6, g), lerp(2.3, 2.1, g), lerp(6.6 - .4 * u, 9, g)), look: V(lerp(.95, .15, g), lerp(1.45, 1.6, g), lerp(.8, 0, g)), focus: V(lerp(1.4, .5, f), 1.45, lerp(1.0, 1.3, f)), aper: 200, coc: 18 }; }
    case 'rise': return { fov: 30, pos: V(3.4 - .8 * u, 2.3 + .2 * u, 16.5 - 1.2 * u), look: V(.2, 2.0, 0), focus: V(0, 2, 1), aper: 330, coc: 16 };
    case 'loaf': { const a = lerp(.05, .85, ease(u)), r = lerp(8.5, 7, ease(u)); return { fov: 27, pos: V(r * Math.sin(a), 2.8 + .4 * u, r * Math.cos(a)), look: V(0, 1.5, 0), focus: V(0, 1.5, 0), aper: 300, coc: 16 }; }
    case 'pull': { const e = ease(u); return { fov: lerp(27, 42, e), pos: V(lerp(5.2, 4, e), lerp(3.2, 11, e), lerp(4.7, 33, e)), look: V(0, lerp(1.8, 6.4, e), lerp(0, -2, e)), focus: V(0, 3, 0), aper: lerp(300, 90, e), coc: lerp(16, 6, e) }; }
  }
}

// ---------- the frame ----------
let lastK = -1, lastShot = null;
function render(t) {
  t = cl(t, 0, DUR); const ts = Math.floor(t * 12 + 1e-6) / 12, k = Math.round(ts * 12);
  // light and sky: night -> dawn, smoothly
  const ph = K(t, [[0, 0], [6.1, 0], [16, 1], [60, 1]]);
  set.setSky(ph);
  set.key.intensity = lerp(1.5, 5.2, ph); set.key.color.set(0xaec6ff).lerp(new THREE.Color(0xffdcb0), ph);
  set.rim.intensity = lerp(1.1, 2.1, ph); set.rim.color.set(0x5f7fd0).lerp(new THREE.Color(0xffb98a), ph);
  set.fill.intensity = lerp(.32, .55, ph); set.bulb.intensity = lerp(95, 45, ph); scene.environmentIntensity = lerp(.2, .38, ph); renderer.toneMappingExposure = lerp(.78, 1, ph);
  // camera
  const s = shotAt(t), C = camFor(s, t);
  camera.fov = C.fov; camera.updateProjectionMatrix(); camera.position.copy(C.pos); camera.lookAt(C.look); camera.updateMatrixWorld();
  ovCam.fov = C.fov; ovCam.updateProjectionMatrix();
  post.dof.focus = C.pos.distanceTo(C.focus); post.dof.aper = C.aper; post.dof.maxCoc = C.coc;
  // the drawing (twos): pose, boil
  if (k !== lastK) { setBoil(k); pose(ts); pipParts.forEach(m => m.build(k % 7)); lastK = k; }
  // clay wipe across the lens
  let wv = false;
  for (const [a, b] of WIPES) if (t >= a && t < b) { const u = cl((ts - a) / (b - a)); wipeLump.position.set(lerp(15, -15, u), 0, -2.4); wv = true; }
  wipeLump.visible = wv;
  // plates
  const ht = Math.tan(C.fov / 2 * Math.PI / 180);
  for (const p of plates) {
    const { t0, t1, big } = p.cp, on = ts >= t0 && ts < t1;
    let sc = 0, sy2 = 1;
    if (on) { sc = popScale(Math.floor((ts - t0) * 12 + 1e-6)); const out = big ? -1 : Math.floor((ts - (t1 - .25)) * 12 + 1e-6); if (out >= 0) { sc = [.9, .55, .2][out] ?? 0; sy2 = .6; } }
    p.mesh.visible = sc > 0.001;
    const k0 = ht / Math.tan(15 * Math.PI / 180) * (shotAt(t).id === 'pull' || shotAt(t).id === 'night' ? .85 : 1);
    p.mesh.scale.set(sc * k0, sc * k0 * sy2, sc * k0); p.mesh.position.set(0, big ? 10 * ht * .5 : -10 * ht * .76, -10); p.mesh.rotation.x = -.03; p.scaleK = k0;
  }
  post.composer.render();
  renderer.setRenderTarget(null); renderer.autoClear = false; renderer.clearDepth(); renderer.render(ov, ovCam); renderer.autoClear = true;
}
// every piece of on-screen text with its box (for readcheck)
window.TEXTS = t => {
  const s = shotAt(t), C = camFor(s, t), ht = Math.tan(C.fov / 2 * Math.PI / 180), out = [];
  for (const p of plates) {
    const { t0, t1, big, text, id } = p.cp; if (t < t0 + .01 || t >= (big ? t1 + 1 : t1 - .25)) continue;
    const k0 = ht / Math.tan(15 * Math.PI / 180) * (s.id === 'pull' || s.id === 'night' ? .85 : 1);
    const wpx = p.pw * k0 / (20 * ht * W / H) * W, hpx = p.ph * k0 / (20 * ht) * H, cy = (big ? .25 : .88) * H, cx = W / 2;
    out.push({ id, text, x0: cx - wpx / 2, x1: cx + wpx / 2, y0: cy - hpx / 2, y1: cy + hpx / 2 });
  }
  return out;
};
window.render = render; window.DUR = DUR; window.EV = EV;
await document.fonts.load('600 150px Fredoka');
window.READY = true;
