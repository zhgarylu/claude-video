// props.js: the things on the desk. Everything is built from code; no brands, no printed marks except hand-lettering.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { cv, tex, tapeTexture, faceTextures, PITCH, TH, LINER, css, fbm } from './tex.js';
import { layout, drawMarker } from './stroke.js';
import { mulberry } from '/core/lib.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const shadowed = (m) => { m.castShadow = m.receiveShadow = true; return m; };

// ---- the load: a small tin with a hand-lettered paper band. base at y=0, r cm
export function makeTin(r = 2.4, h = 5.6, word = 'HEAVY') {
  const g = new THREE.Group();
  const body = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48), std({ color: '#c2412c', roughness: .42, metalness: .35 }))); body.position.y = h / 2; g.add(body);
  for (const y of [.12, h - .12]) { const ring = shadowed(new THREE.Mesh(new THREE.TorusGeometry(r, .12, 10, 48), std({ color: '#d9d2c4', roughness: .35, metalness: .8 }))); ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring); }
  // paper band with marker word
  const c = cv(1024, 256), x = c.getContext('2d'), rnd = mulberry(5);
  x.fillStyle = '#e4d3a2'; x.fillRect(0, 0, 1024, 256); fbm(x, 1024, 256, rnd, .3, 4, 4);
  const lay = layout(word, 3); const px = 84, ox = 512 - lay.width * px / 2; drawMarker(x, lay, 1, ox, 86, px, '#1d2733', .15);
  const t = tex(c); t.wrapS = THREE.RepeatWrapping;
  const band = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r + .03, r + .03, h * .5, 48, 1, true), std({ map: t, roughness: .9 }))); band.position.y = h / 2; band.rotation.y = Math.PI * 1.5 + .55; g.add(band);
  g.userData = { r, h }; g.rotation.y = 0; return g;
}

// ---- steel rule with graduations
export function makeRule(len = 42, wid = 3.2) {
  const c = cv(2048, 160), x = c.getContext('2d'); x.fillStyle = '#b9bec2'; x.fillRect(0, 0, 2048, 160);
  const g = x.createLinearGradient(0, 0, 0, 160); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); x.fillStyle = g; x.fillRect(0, 0, 2048, 160);
  x.strokeStyle = '#2c3034'; x.fillStyle = '#2c3034'; x.font = '600 20px Barlow, sans-serif'; x.textAlign = 'center';
  for (let i = 0; i <= len * 2; i++) { const px = i / (len * 2) * 2048, L = i % 20 === 0 ? 46 : i % 2 === 0 ? 30 : 18; x.lineWidth = 2; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, L); x.stroke(); if (i % 20 === 0 && i > 0 && i < len * 2) x.fillText(String(i / 2), px, L + 24); }
  const t = tex(c), m = std({ map: t, roughness: .32, metalness: .85 });
  const mesh = shadowed(new THREE.Mesh(new THREE.BoxGeometry(len, .14, wid), [std({ color: '#9aa0a4', roughness: .4, metalness: .85 }), std({ color: '#9aa0a4', roughness: .4, metalness: .85 }), m, std({ color: '#7d8387', metalness: .8, roughness: .4 }), std({ color: '#9aa0a4', roughness: .4, metalness: .85 }), std({ color: '#9aa0a4', roughness: .4, metalness: .85 })]));
  mesh.position.y = .07; return mesh;
}

// ---- craft knife: tip at the origin, blade rising toward +x, handle beyond. Cutting direction is -x.
export function makeKnife() {
  const g = new THREE.Group(), blade = new THREE.Shape(); blade.moveTo(0, 0); blade.lineTo(4.4, 0); blade.lineTo(4.4, .95); blade.lineTo(1.1, .95); blade.closePath();
  const bg = new THREE.ExtrudeGeometry(blade, { depth: .05, bevelEnabled: false });
  const bm = shadowed(new THREE.Mesh(bg, std({ color: '#cfd4d8', roughness: .22, metalness: .95 }))); bm.position.z = -.025; g.add(bm);
  // snap-off score lines on the blade
  for (const x of [2.1, 3.1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.03, .85, .06), std({ color: '#6c7176', metalness: .8, roughness: .5 })); l.position.set(x, .45, 0); g.add(l); }
  const h = shadowed(new THREE.Mesh(new RoundedBoxGeometry(10.5, 1.5, 1.7, 5, .35), std({ color: '#24282b', roughness: .55, metalness: .1 }))); h.position.set(4.4 + 5.1, .55, 0); g.add(h);
  const stripe = shadowed(new THREE.Mesh(new RoundedBoxGeometry(5.2, .5, 1.78, 4, .15), std({ color: '#e0642a', roughness: .5 }))); stripe.position.set(4.4 + 6.5, .65, 0); g.add(stripe);
  const slider = shadowed(new THREE.Mesh(new RoundedBoxGeometry(1.2, .5, .9, 3, .12), std({ color: '#8b9094', roughness: .4, metalness: .6 }))); slider.position.set(4.4 + 2, 1.38, 0); g.add(slider);
  return g;
}

// ---- boxes (piers): rounded kraft cube with a taped seam; faces are kraft, so no flute edge needed
export function makeBox(w, h, d, seed = 1) {
  const f = faceTextures('outer', seed), map = f.map.clone(); map.needsUpdate = true; map.repeat.set(w / 10.4, h / 10.4);
  const bump = f.bump.clone(); bump.needsUpdate = true; bump.repeat.copy(map.repeat);
  const m = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, .18), std({ map, bumpMap: bump, bumpScale: .8, roughness: .92 })));
  m.position.y = h / 2; return m;
}

// ---- tape: a strip following a 3D polyline (pts), width along wdir, lifted off the surface along nrm.
// grow(p) lays it down from the first point; torn ends for masking tape. kind: 'mask' | 'pack'
export function makeTape({ pts, wdir = [0, 0, 1], nrm = [0, 1, 0], wid = 2.4, kind = 'mask', seed = 1, n = 64, lift = .02, outFrom = null }) {
  const rnd = mulberry(seed * 311 + 3), P = pts.map(p => new THREE.Vector3(...p)), W = new THREE.Vector3(...wdir).normalize(), N0 = new THREE.Vector3(...nrm);
  const cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + P[i].distanceTo(P[i - 1]));
  const L = cum[cum.length - 1];
  const at = (s) => { s = Math.max(0, Math.min(L, s)); let i = 1; while (i < P.length - 1 && cum[i] < s) i++; const u = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return { p: P[i - 1].clone().lerp(P[i], u), t: P[i].clone().sub(P[i - 1]).normalize() }; };
  const hw = wid / 2, tear = [[rnd() * .35, rnd() * .35], [rnd() * .35, rnd() * .35]], wr = Array.from({ length: n + 1 }, () => (rnd() - .5) * .012);
  const pos = new Float32Array((n + 1) * 2 * 3), nor = new Float32Array((n + 1) * 2 * 3), uv = new Float32Array((n + 1) * 2 * 2), idx = [];
  for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  for (let i = 0; i <= n; i++) { uv.set([i / n * L / wid * 2, 0, i / n * L / wid * 2, 1], i * 4); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  const t = tapeTexture(kind, seed); t.wrapS = THREE.RepeatWrapping;
  const mat = std({ map: t, roughness: kind === 'mask' ? .88 : .2, transparent: true, opacity: kind === 'mask' ? .97 : .92, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.receiveShadow = true;
  const grow = (p) => {
    const front = Math.max(0, Math.min(1, p)) * L; mesh.visible = front > .01;
    for (let i = 0; i <= n; i++) {
      const s = Math.min(front, i / n * L), { p: c, t: tg } = at(s), nn = new THREE.Vector3().crossVectors(W, tg).normalize(); if (outFrom ? nn.dot(c.clone().sub(outFrom)) < 0 : nn.dot(N0) < 0) nn.negate();
      for (const k of [0, 1]) {
        const side = k ? 1 : -1; let w = hw; if (kind === 'mask' && i === 0) w -= tear[0][k] ; if (kind === 'mask' && i === n && front >= L - .001) w -= tear[1][k];
        const q = c.clone().addScaledVector(W, side * w).addScaledVector(nn, lift + wr[i]);
        pos.set([q.x, q.y, q.z], (i * 2 + k) * 3); nor.set([nn.x, nn.y, nn.z], (i * 2 + k) * 3);
      }
    }
    g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true;
  };
  mesh.userData.grow = grow; mesh.userData.len = L; grow(1); mesh.userData.tip = (p) => at(Math.max(0, Math.min(1, p)) * L).p;
  return mesh;
}
export function makeTapeRoll(kind = 'pack') {
  const g = new THREE.Group(), col = kind === 'pack' ? '#a87635' : '#e1d2a0';
  const lathe = new THREE.LatheGeometry([[2.2, 0], [4.6, 0], [4.6, 2.4], [2.2, 2.4], [2.2, 0]].map(p => new THREE.Vector2(p[0], p[1])), 40);
  const m = shadowed(new THREE.Mesh(lathe, std({ color: col, roughness: kind === 'pack' ? .3 : .85, side: THREE.DoubleSide }))); g.add(m);
  const core = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.25, 2.5, 32, 1, true), std({ color: '#b79a6a', roughness: .9, side: THREE.DoubleSide }))); core.position.y = 1.2; g.add(core);
  return g;
}

// ---- hot glue: a blob that spreads and a string that stretches and thins
export function makeGlue() {
  const g = new THREE.Group(), mat = std({ color: '#f3e9cf', roughness: .28, metalness: 0, transparent: true, opacity: .93 });
  const blob = shadowed(new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), mat)); g.add(blob);
  const string = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), mat)); g.add(string);
  g.userData.set = (spread, str) => { // spread: blob radius (cm, 0 hides); str: {h, r} length and radius of the string above it
    blob.visible = spread > 0; blob.scale.set(spread, spread * .38, spread);
    string.visible = !!str && str.h > .01; if (str && str.h > .01) { string.scale.set(str.r, str.h, str.r); string.position.y = str.h / 2 + spread * .2; }
  };
  return g;
}
export function makeGlueGun() {
  const g = new THREE.Group();
  const body = shadowed(new THREE.Mesh(new RoundedBoxGeometry(9, 3.2, 2.8, 4, .5), std({ color: '#d6b13a', roughness: .5 }))); body.position.set(5, 3.2, 0); g.add(body);
  const grip = shadowed(new THREE.Mesh(new RoundedBoxGeometry(2.4, 5.5, 2.4, 4, .5), std({ color: '#3b3f44', roughness: .6 }))); grip.position.set(6.5, 0, 0); grip.rotation.z = .25; g.add(grip);
  const nozzle = shadowed(new THREE.Mesh(new THREE.ConeGeometry(1, 2.6, 20), std({ color: '#b0b5ba', metalness: .9, roughness: .3 }))); nozzle.rotation.z = Math.PI / 2; nozzle.position.set(-1.0, 3.2, 0); g.add(nozzle);
  return g;
}

// ---- marker pen: tip at the origin, leaning toward +x
export function makeMarker() {
  const g = new THREE.Group();
  const body = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 10, 20), std({ color: '#ececec', roughness: .5 }))); body.position.y = 6.2; g.add(body);
  const grip = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(.58, .5, 3, 20), std({ color: '#1d2733', roughness: .55 }))); grip.position.y = 1.8; g.add(grip);
  const nib = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(.28, .5, .6, 16), std({ color: '#111', roughness: .6 }))); nib.position.y = .1; g.add(nib);
  const band = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(.57, .57, 1.2, 20), std({ color: '#c2412c', roughness: .5 }))); band.position.y = 8.2; g.add(band);
  g.rotation.z = -.38; return g;
}

// ---- the wave sheet: the corrugated medium as a real sinusoid, extruded along x. s scales the whole sample
export function makeWave({ len = 14, wid = 9, s = 1 }) {
  const P = PITCH * s, t = .08 * s, A = ((TH - 2 * LINER) * s - t) / 2, shape = new THREE.Shape(), n = Math.round(wid / P * 16);
  const y = (z) => A * Math.sin(2 * Math.PI * z / P);
  const up = [], dn = []; for (let i = 0; i <= n; i++) { const z = -wid / 2 + wid * i / n; up.push([z, y(z) + t / 2]); dn.push([z, y(z) - t / 2]); }
  shape.moveTo(up[0][0], up[0][1]); up.forEach(p => shape.lineTo(p[0], p[1])); dn.reverse().forEach(p => shape.lineTo(p[0], p[1])); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false, steps: 1 }); geo.translate(0, 0, -len / 2);
  geo.rotateY(Math.PI / 2);   // extrusion now along x, profile across z
  const f = faceTextures('pale', 9), map = f.map.clone(); map.needsUpdate = true; map.repeat.set(.12, .12);
  return shadowed(new THREE.Mesh(geo, std({ color: '#e0c08e', map, roughness: .9, side: THREE.DoubleSide })));
}

// ---- offcuts and scraps for the set: irregular boards (built by the caller with makeBoard); poly generator
export function scrapPoly(seed, r = 3) {
  const rnd = mulberry(seed * 5 + 1), n = 5 + Math.floor(rnd() * 3), a0 = rnd() * 6;
  return Array.from({ length: n }, (_, i) => { const a = a0 + i / n * Math.PI * 2, rr = r * (.6 + rnd() * .5); return [Math.cos(a) * rr * (1 + rnd() * .5), Math.sin(a) * rr]; });
}
