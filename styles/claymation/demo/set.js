// The hand-built miniature kitchen: a painted card wall, a clay counter, a shelf, jars, a lamp.
// World units: 1 unit ~ 1.5 cm. The counter top is y = 0, the camera looks down -z.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clayMat, lump, worm, vn, fbm } from './clay.js';

export const PAL = {
  dough: 0xecd3a0, dough2: 0xd9b57a, counter: 0xb9674b, counter2: 0x9c4f3a, wall: 0x3f7480, wainscot: 0x2f5c68,
  mustard: 0xe0a62a, sage: 0x93b08a, plum: 0x7d4b6c, cream: 0xf0e4c8, finger: 0xe6a58f, ink: 0x2b2420, rose: 0xe58c86, flour: 0xf6f1e6,
};

function paint(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
function rng(s) { let t = s; return () => ((t = (t * 9301 + 49297) % 233280) / 233280); }

// painted card wall: flat gouache with visible brush drags and pressed-clay polka dots
function wallTextures() {
  const r = rng(11);
  const col = paint(2048, 1024, (g, w, h) => {
    g.fillStyle = '#41767f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f5c68'; g.fillRect(0, h * .62, w, h * .38);
    for (let i = 0; i < 700; i++) {
      const y = r() * h, x = r() * w, l = 120 + r() * 500, light = r() < .5;
      g.strokeStyle = light ? `rgba(160,210,200,${.03 + r() * .05})` : `rgba(10,40,50,${.04 + r() * .06})`;
      g.lineWidth = 6 + r() * 22; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (r() - .5) * 8); g.stroke();
    }
    for (let y = 70; y < h * .56; y += 110) for (let x = ((y / 110) % 2) * 55 + 30; x < w; x += 110) {
      const jx = (r() - .5) * 26, jy = (r() - .5) * 26, rr = 13 + r() * 10;
      g.fillStyle = 'rgba(8,30,40,.25)'; g.beginPath(); g.ellipse(x + jx + 3, y + jy + 4, rr, rr * .92, 0, 0, 7); g.fill();
      g.fillStyle = '#e6ccc0'; g.beginPath(); g.ellipse(x + jx, y + jy, rr, rr * .94, r() * 3, 0, 7); g.fill();
    }
  });
  const bump = paint(1024, 512, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { const y = r() * h, x = r() * w; g.strokeStyle = `rgba(${r() < .5 ? 255 : 0},${r() < .5 ? 255 : 0},255,.05)`; g.strokeStyle = r() < .5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.08)'; g.lineWidth = 2 + r() * 8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 60 + r() * 260, y); g.stroke(); }
  });
  const t = c => { const x = new THREE.CanvasTexture(c); x.anisotropy = 8; return x; };
  const a = t(col); a.colorSpace = THREE.SRGBColorSpace; return { map: a, bump: t(bump) };
}

const mixc = (a, b, t) => { const p = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const SKY = document.createElement('canvas'); SKY.width = 1024; SKY.height = 900;
// phase 0 = night (stars, a pale moon), 1 = dawn (peach sky, sun over painted card hills)
function drawSky(phase) {
  const g = SKY.getContext('2d'), w = SKY.width, h = SKY.height, p = Math.max(0, Math.min(1, phase));
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, mixc('#101a3e', '#6f8fb8', p)); gr.addColorStop(.5, mixc('#26366a', '#f1b79f', p)); gr.addColorStop(1, mixc('#3a3f78', '#ffd9a6', p));
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const r = rng(21); g.fillStyle = '#fff6d8';
  for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h * .55, s = 1.2 + r() * 2.6; g.globalAlpha = (1 - p) * (.5 + r() * .5); g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
  g.globalAlpha = Math.max(0, 1 - p * 1.4); g.fillStyle = '#f3ecd0'; g.beginPath(); g.arc(w * .3, h * (.26 + p * .3), 62, 0, 7); g.fill();
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.beginPath(); g.arc(w * .3 + 26, h * (.26 + p * .3) - 12, 54, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  const sy = h * (.98 - Math.max(0, p - .25) / .75 * .36);
  g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(w * .62, sy, 80, 0, 7); g.fill();
  const hill = (c, c2, y0, a, f, ph) => { g.fillStyle = mixc(c2, c, p); g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 8) g.lineTo(x, y0 + Math.sin(x / f + ph) * a + Math.sin(x / (f * .37) + ph * 2) * a * .25); g.lineTo(w, h); g.fill(); };
  hill('#c98a8a', '#1c2552', h * .66, 30, 150, 1); hill('#8e6b86', '#161d44', h * .76, 34, 120, 4); hill('#5a4a6e', '#10163a', h * .88, 22, 90, 2);
}

export function buildSet(scene, renderer) {
  const S = { clays: [], boilers: [] };
  const add = (o, boil = false) => { scene.add(o); (boil ? S.boilers : S.clays).push(o); return o; };
  const M = clayMat({ fing: .6 }), Mglaze = clayMat({ coat: .7, rough: .35, sheen: .15, fing: .25, roughness: .35 }), Mfine = clayMat({ fing: .7, pscale: .5 });
  S.M = M;

  // lighting: a warm key, a peach window rim, a warm bulb, a soft fill, a studio environment for the sheen
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .38;
  const key = new THREE.SpotLight(0xffdcb0, 5.2, 0, .55, 1, 0); key.position.set(-9, 13, 13); key.target.position.set(0, 1, 0);
  key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.bias = -.0004; key.shadow.normalBias = .03; key.shadow.radius = 7; key.shadow.camera.near = 6; key.shadow.camera.far = 50;
  scene.add(key, key.target); S.key = key;
  const rim = new THREE.DirectionalLight(0xffb98a, 2.1); rim.position.set(7, 6, -9); rim.target.position.set(0, 1.5, 0); scene.add(rim, rim.target);
  const fill = new THREE.HemisphereLight(0xb8cdee, 0xc58a6a, .55); scene.add(fill); S.rim = rim; S.fill = fill;
  const bulb = new THREE.PointLight(0xffc27a, 55, 0, 2); bulb.position.set(-2.2, 9.6, -2.2); scene.add(bulb); S.bulb = bulb;

  // ----- wall and floor of the studio set -----
  const wt = wallTextures();
  wt.map.wrapS = wt.bump.wrapS = THREE.RepeatWrapping; wt.map.repeat.set(1.3, 1); wt.bump.repeat.set(1.3, 1);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(52, 15, 1, 1), new THREE.MeshStandardMaterial({ map: wt.map, bumpMap: wt.bump, bumpScale: 1.2, roughness: .92 }));
  wall.position.set(0, 7.2, -6.3); wall.receiveShadow = true; scene.add(wall);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(52.4, 15.4, .5), new THREE.MeshStandardMaterial({ color: 0xb59a74, roughness: 1 }));
  edge.position.set(0, 7.2, -6.6); scene.add(edge);   // the cardboard back is part of the set
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), new THREE.MeshStandardMaterial({ color: 0x2a211c, roughness: .95 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -2.45, -10); floor.receiveShadow = true; scene.add(floor);

  // ----- counter -----
  add(lump({ r: [13.2, 1.25, 5.8], e1: .22, e2: .2, amp: .05, freq: 1.2, seed: 4, c1: PAL.counter, c2: PAL.counter2, marble: .8, mfreq: .5 }, clayMat({ fing: .5, pscale: .22, roughness: 1.3 }))).position.set(0, -1.25, -.4);
  add(lump({ r: [13, .4, .5], e1: .3, e2: .3, amp: .05, seed: 8, c1: PAL.mustard, c2: 0xc88b1e, marble: .6 }, M)).position.set(0, -.2, 5.45);   // front lip, rolled and pressed on
  add(lump({ r: [13, .45, .4], e1: .3, e2: .3, amp: .06, seed: 9, c1: PAL.cream, c2: PAL.dough2 }, M)).position.set(0, .35, -5.7);   // skirting against the wall

  // ----- window: painted sky, clay frame -----
  drawSky(1); const skyTex = new THREE.CanvasTexture(SKY); skyTex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 5.8), new THREE.MeshBasicMaterial({ map: skyTex })); S.setSky = p => { drawSky(p); skyTex.needsUpdate = true; };
  sky.position.set(5.2, 8.4, -6.02); scene.add(sky);
  const wx = 5.2, wy = 8.4;
  for (const [x, y, rx, ry, s] of [[0, 3.05, 3.75, .36, 1], [0, -3.05, 3.9, .42, 2], [-3.4, 0, .36, 3.2, 3], [3.4, 0, .36, 3.2, 4], [0, 0, .2, 3, 5], [0, .2, 3.2, .17, 6]])
    add(lump({ r: [rx, ry, .5], e1: .3, e2: .3, amp: .07, seed: s, c1: PAL.mustard, c2: 0xc88b1e, marble: .7 }, M)).position.set(wx + x, wy + y, -5.85);

  // ----- shelf with jars and a plant -----
  add(lump({ r: [4.6, .32, 1.4], e1: .3, e2: .3, amp: .06, seed: 12, c1: PAL.cream, c2: PAL.dough2, marble: .6 }, M)).position.set(-7.4, 6.6, -5.1);
  for (const x of [-9.4, -5.4]) add(lump({ r: [.22, 1, .9], e1: .3, e2: .4, amp: .08, seed: 31 + x, c1: PAL.mustard }, M)).position.set(x, 5.6, -5.4);   // brackets
  const jars = [[-9, 1, 1.25, PAL.sage], [-7.5, .85, 1.0, PAL.rose], [-6.2, .8, .85, PAL.plum]];
  jars.forEach(([x, rr, hh, c], i) => {
    add(lump({ r: [rr, hh, rr], e1: .2, e2: 1, amp: .04, seed: 20 + i, c1: c, c2: PAL.cream, marble: .25 }, Mglaze)).position.set(x, 6.92 + hh, -5.0);
    add(lump({ r: [rr * 1.06, .32, rr * 1.06], e1: .4, e2: 1, amp: .05, seed: 40 + i, c1: PAL.cream, c2: PAL.dough2 }, M)).position.set(x, 6.92 + hh * 2 + .25, -5.0);
    add(lump({ r: [.16, .16, .16], e1: 1, e2: 1, amp: .08, seed: 50 + i, c1: PAL.cream }, M)).position.set(x, 6.92 + hh * 2 + .65, -5.0);
  });
  const leaf = (a, l, s) => add(lump({ r: [.55, .09, l], e1: .7, e2: .8, amp: .06, seed: 60 + s, c1: 0x5d9a62, c2: 0x3f7a4c, marble: .7 }, M), false);
  [[-.9, 1.5], [-.3, 1.9], [.35, 1.7], [.95, 1.3]].forEach(([a, l], i) => { const m = leaf(a, l, i); m.position.set(-4.3 + a * .35, 7.95 + i * .1, -5.0); m.rotation.set(-.9, a * .8, a * .5); });
  add(lump({ r: [.6, .55, .6], e1: .3, e2: 1, amp: .05, seed: 70, c1: PAL.counter2, c2: PAL.counter }, M)).position.set(-4.3, 7.5, -5.0);

  // ----- pendant lamp -----
  add(worm({ pts: [[-2.2, 15, -2.2], [-2.2, 12.5, -2.2], [-2.2, 10.7, -2.2]], rad: .09, c1: PAL.ink, seg: 12, radial: 8, amp: .02 }, M));
  add(lump({ r: [1.3, .85, 1.3], e1: .6, e2: 1, amp: .04, seed: 80, c1: PAL.mustard, c2: 0xc88b1e, marble: .7 }, M)).position.set(-2.2, 10.2, -2.2);
  const bl = new THREE.Mesh(new THREE.SphereGeometry(.5, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffe6b0 })); bl.position.set(-2.2, 9.55, -2.2); scene.add(bl);

  // ----- clock on the wall -----
  add(lump({ r: [1.4, 1.4, .3], e1: .5, e2: 1, amp: .04, seed: 90, c1: PAL.cream, c2: PAL.dough2, marble: .3 }, M)).position.set(.6, 9.7, -5.95);
  S.hands = []; const hand = (len, ang, y) => { const m = add(worm({ pts: [[0, 0, 0], [0, len * .5, 0], [0, len, 0]], rad: .09, c1: PAL.ink, seg: 10, radial: 8, amp: .02 }, M)); m.position.set(.6, 9.7, -5.62 + y); m.rotation.z = ang; S.hands.push(m); };
  hand(.9, -2.2, 0); hand(.6, .6, .06);

  // ----- props on the counter: flour sack, rolling pin, a scatter of flour -----
  const sack = add(lump({ r: [1.7, 2.3, 1.2], e1: .55, e2: .6, amp: .09, seed: 100, c1: PAL.cream, c2: PAL.dough2, marble: .35 }, M)); sack.position.set(-8.4, 2.25, -3.3); sack.rotation.y = .3;
  const top = add(lump({ r: [1.5, .5, 1.05], e1: .6, e2: .8, amp: .15, seed: 101, c1: PAL.cream, c2: PAL.dough2 }, M)); top.position.set(-8.4, 4.35, -3.3); top.rotation.set(.1, .3, .12);
  const lab = add(worm({ pts: [[-1.1, 0, 0], [-.4, .5, 0], [.4, -.3, 0], [1.1, .3, 0]], rad: .17, c1: PAL.rose, c2: PAL.counter, seg: 24, radial: 10 }, M)); lab.position.set(-8.4 + .3, 2.5, -2.1); lab.rotation.y = .3;
  const pin = add(lump({ r: [3.4, .62, .62], e1: 1, e2: .8, amp: .035, seed: 110, c1: PAL.dough2, c2: 0xb98a55, marble: .5, e2: 1 }, M)); pin.position.set(6.4, .65, 2.9); pin.rotation.set(0, .5, .02);
  for (const s of [-1, 1]) { const hnd = add(lump({ r: [.9, .42, .42], e1: .8, e2: 1, amp: .05, seed: 112 + s, c1: PAL.sage, c2: 0x6f9272 }, M)); hnd.position.set(6.4 + Math.cos(.5) * s * 4.1, .5, 2.9 - Math.sin(.5) * s * 4.1); hnd.rotation.y = .5; }

  // flour: a spray of tiny pale lumps around where the dough sits (instanced so it stays cheap)
  const N = 1400, fg = new THREE.IcosahedronGeometry(.011, 1), fm = new THREE.InstancedMesh(fg, new THREE.MeshStandardMaterial({ color: PAL.flour, roughness: 1 }), N), dm = new THREE.Object3D(), r = rng(5);
  for (let i = 0; i < N; i++) { const a = r() * 6.28, rr = Math.pow(r(), .7) * 5.2; dm.position.set(Math.cos(a) * rr * 1.5 + 1, .02 + r() * .03, Math.sin(a) * rr * .8 + .6); dm.scale.set(1 + r() * 2.5, .5 + r(), 1 + r() * 2.5); dm.rotation.y = r() * 3; dm.updateMatrix(); fm.setMatrixAt(i, dm.matrix); }
  fm.castShadow = false; fm.receiveShadow = true; scene.add(fm);

  // ----- the studio around the set (seen only when the camera pulls out) -----
  const black = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: .6, metalness: .4 });
  const stand = new THREE.Group();
  { const pole = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 15, 10), black); pole.position.set(0, 5, 0); stand.add(pole); }
  for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 5, 8), black); const a = i * 2.094; l.position.set(Math.cos(a) * 1.6, -2, Math.sin(a) * 1.6); l.rotation.set(Math.sin(a) * .5, 0, -Math.cos(a) * .5); stand.add(l); }
  const head = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 2.6, 24, 1, true), black); head.position.set(0, 12.8, 0); head.rotation.z = .5; stand.add(head);
  const lampDisc = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24), new THREE.MeshBasicMaterial({ color: 0xfff1cf })); lampDisc.position.set(.5, 12.3, 0); lampDisc.rotation.y = Math.PI / 2 - .2; lampDisc.rotation.z = .5; stand.add(lampDisc);
  stand.position.set(-19, -2.4, 9); scene.add(stand);
  const s2 = stand.clone(); s2.position.set(21, -2.4, 12); s2.rotation.y = Math.PI; scene.add(s2);
  [[-12, 1.2, 4.5, .9, PAL.mustard], [-10.6, 1.2, 5.2, .6, PAL.sage], [-13.2, 1.2, 6, .75, PAL.rose], [15, 1.2, 8, .8, PAL.plum]].forEach(([x, y, z, r, c], i) => add(lump({ r: [r, r * .8, r], amp: .09, seed: 200 + i, c1: c, c2: PAL.cream, marble: .5 }, M)).position.set(x, -2.45 + r * .8, z + 4));
  const wire = add(worm({ pts: [[0, 0, 0], [1.4, .2, .2], [2.8, 0, 0]], rad: .06, c1: 0x9a9a9a, seg: 12, radial: 8, amp: .01 }, M)); wire.position.set(-9, -2.35, 9.5);
  // puff of flour that hides the swap from dough to loaf
  const PN = 360, puff = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.024, 1), new THREE.MeshStandardMaterial({ color: PAL.flour, roughness: 1 }), PN); puff.frustumCulled = false; puff.visible = false; scene.add(puff);
  const pr = rng(77), dirs = []; for (let i = 0; i < PN; i++) { const u = pr() * 2 - 1, a = pr() * 6.28, q = Math.sqrt(1 - u * u); dirs.push([q * Math.cos(a), Math.abs(u) * .9 + .1, q * Math.sin(a), .5 + pr() * 1.2, .5 + pr() * 1.5]); }
  S.puff = (center, u, size) => {   // u 0..1 over the burst, on twos
    puff.visible = u > 0 && u < 1; const o = new THREE.Object3D();
    dirs.forEach((d, i) => { const e = 1 - Math.pow(1 - u, 2.2), g = d[3] * size * e; o.position.set(center.x + d[0] * g * 1.4, center.y + d[1] * g * .9 - e * e * .6 * d[4], center.z + d[2] * g * 1.2); o.scale.setScalar((1.2 + d[4]) * (1 - u * .7) * 1.3); o.updateMatrix(); puff.setMatrixAt(i, o.matrix); });
    puff.instanceMatrix.needsUpdate = true;
  };
  return S;
}
