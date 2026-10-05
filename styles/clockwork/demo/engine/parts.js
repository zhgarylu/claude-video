// parts.js: materials and geometry builders for the mechanism (gears, troughs, cams, bell...). Everything is drawn in code.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { gearOutline, gearDims } from './gears.js';
import { mulberry } from '/core/lib.js';

// ---------------------------------------------------------------- textures
function canvasTex(w, h, draw, { repeat, srgb = true, wrap = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } if (repeat) t.repeat.set(...repeat);
  t.anisotropy = 8; return t;
}
// fine brushed scratches (used as bump + roughness variation on every metal)
const scratch = canvasTex(512, 512, (g, w, h) => {
  const r = mulberry(11); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { const y = r() * h, x = r() * w, L = 20 + r() * 160, a = (r() - .5) * 0.06; g.strokeStyle = `rgba(${r() > .5 ? 255 : 0},${r() > .5 ? 255 : 0},${r() > .5 ? 255 : 0},${0.03 + r() * 0.09})`; g.lineWidth = 0.5 + r() * 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + L, y + L * a); g.stroke(); }
  const d = g.getImageData(0, 0, w, h); for (let i = 0; i < d.data.length; i += 4) { const n = (r() - .5) * 22; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; } g.putImageData(d, 0, 0);
}, { srgb: false, repeat: [1, 1] });
const grain = canvasTex(256, 256, (g, w, h) => { const r = mulberry(5); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); const d = g.getImageData(0, 0, w, h); for (let i = 0; i < d.data.length; i += 4) { const n = (r() - .5) * 60; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; } g.putImageData(d, 0, 0); }, { srgb: false });

export const loader = new THREE.TextureLoader();
export const walnut = (rep) => {
  const L = (u) => { const t = loader.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; };
  const map = L('/core/assets/polyhaven/walnut_diff.jpg'); map.colorSpace = THREE.SRGBColorSpace;
  return { map, normalMap: L('/core/assets/polyhaven/walnut_nor.jpg'), };
};

export const M = {
  brass: new THREE.MeshStandardMaterial({ color: '#f2c872', metalness: 1, roughness: 0.17, bumpMap: scratch, bumpScale: 0.35, roughnessMap: scratch }),
  brassDark: new THREE.MeshStandardMaterial({ color: '#d09a48', metalness: 1, roughness: 0.28, bumpMap: scratch, bumpScale: 0.4, roughnessMap: scratch }),
  steel: new THREE.MeshStandardMaterial({ color: '#e6eaee', metalness: 1, roughness: 0.14, bumpMap: scratch, bumpScale: 0.25, roughnessMap: scratch }),
  iron: new THREE.MeshStandardMaterial({ color: '#35373d', metalness: 0.95, roughness: 0.45, bumpMap: grain, bumpScale: 0.5 }),
  ball: new THREE.MeshStandardMaterial({ color: '#f2f4f6', metalness: 1, roughness: 0.04 }),
  bone: new THREE.MeshStandardMaterial({ color: '#e8dcc0', metalness: 0, roughness: 0.55, bumpMap: grain, bumpScale: 0.25 }),
  bone2: new THREE.MeshStandardMaterial({ color: '#cdbf9c', metalness: 0, roughness: 0.6, bumpMap: grain, bumpScale: 0.25 }),
  ebony: new THREE.MeshStandardMaterial({ color: '#1d1612', metalness: 0, roughness: 0.4 }),
  felt: new THREE.MeshStandardMaterial({ color: '#3a2a20', metalness: 0, roughness: 1 }),
};

// ---------------------------------------------------------------- helpers
export function shapeOf(pts) { const s = new THREE.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); return s; }
export function ext(shape, depth, bev = 0.05, seg = 6) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 1, curveSegments: seg, steps: 1 });
  g.translate(0, 0, -depth / 2); return g;
}
export function mesh(geo, mat, { shadow = true, recv = true } = {}) { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = recv; return m; }
export function cyl(r, h, mat, seg = 24) { const m = mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.rotation.x = Math.PI / 2; return m; }   // axis along z
export function box(w, h, d, mat, r = 0.08) { return mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.1, h / 2.1, d / 2.1)), mat); }

// ---------------------------------------------------------------- gears
// a spur gear with spoke windows, a hub and a bore; returns a Group with the teeth lying in the xy plane, centred on z = 0
export function gear(N, m, th, { windows = null, hubR = null, mat = M.brass, bore = 0.55 } = {}) {
  const { rp, rf } = gearDims(N, m), g = new THREE.Group();
  const shape = shapeOf(gearOutline(N, m));
  hubR = hubR ?? Math.max(1.3, rf * 0.22);
  const win = windows ?? (N >= 40 ? 6 : N >= 24 ? 5 : 0);
  if (win) {
    const r1 = hubR + 0.55, r2 = rf - 0.9, gap = 0.16;
    for (let i = 0; i < win; i++) {
      const a0 = i * 2 * Math.PI / win + gap, a1 = (i + 1) * 2 * Math.PI / win - gap, h = new THREE.Path();
      h.absarc(0, 0, r2, a0, a1, false); h.absarc(0, 0, r1, a1, a0, true); shape.holes.push(h);
    }
  }
  const b = new THREE.Path(); b.absarc(0, 0, bore, 0, Math.PI * 2, true); shape.holes.push(b);
  const body = mesh(ext(shape, th, 0.05), mat); g.add(body);
  const hub = cyl(hubR, th + 0.5, mat, 28); g.add(hub);
  return g;
}

// ---------------------------------------------------------------- the escape wheel (30 sawtooth teeth) and the anchor
export function escapeWheel(N, R, th) {
  const pts = [], A = 2 * Math.PI / N, Rr = R - 1.6;
  const P = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
  for (let k = 0; k < N; k++) { pts.push(P(Rr, k * A), P(R, k * A + 0.30 * A), P(R - 0.4, k * A + 0.36 * A), P(Rr + 0.2, k * A + 0.92 * A)); }
  const shape = shapeOf(pts);
  const hubR = 1.4, win = 6, r1 = hubR + 0.5, r2 = Rr - 0.6;
  for (let i = 0; i < win; i++) { const a0 = i * 2 * Math.PI / win + 0.2, a1 = (i + 1) * 2 * Math.PI / win - 0.2, h = new THREE.Path(); h.absarc(0, 0, r2, a0, a1, false); h.absarc(0, 0, r1, a1, a0, true); shape.holes.push(h); }
  const g = new THREE.Group(); g.add(mesh(ext(shape, th, 0.04), M.brass)); g.add(cyl(hubR, th + 0.8, M.brass));
  return g;
}
// the anchor in its own frame: origin at its pivot, pallets at (+-4.3, -3.4)
export function anchor(th) {
  const arm = (x1, y1) => { const dx = x1, dy = y1, L = Math.hypot(dx, dy), n = [-dy / L, dx / L], w = 0.7; return [[n[0] * w, n[1] * w], [x1 + n[0] * w, y1 + n[1] * w], [x1 - n[0] * w, y1 - n[1] * w], [-n[0] * w, -n[1] * w]]; };
  const g = new THREE.Group();
  g.add(mesh(ext(shapeOf(arm(-4.5, -3.6)), th, 0.04), M.steel)); g.add(mesh(ext(shapeOf(arm(4.5, -3.6)), th, 0.04), M.steel));
  const pallet = (x, flip) => { const m = box(1.3, 2.6, th + 3.2, M.steel, 0.1); m.position.set(x, -3.6, -1.1); m.rotation.z = flip * 0.5; return m; };
  g.add(pallet(-4.4, 1), pallet(4.4, -1)); g.add(cyl(1.1, th + 1.0, M.brass));
  return g;
}

// ---------------------------------------------------------------- sweeps: troughs along a 3-D path
export function frames(pts) {
  const n = pts.length, F = [];
  for (let i = 0; i < n; i++) {
    const a = new THREE.Vector3(...pts[Math.max(0, i - 1)]), b = new THREE.Vector3(...pts[Math.min(n - 1, i + 1)]);
    const T = b.sub(a).normalize(); const S = new THREE.Vector3().crossVectors(T, new THREE.Vector3(0, 1, 0)).normalize(); const N = new THREE.Vector3().crossVectors(S, T).normalize();
    F.push({ P: new THREE.Vector3(...pts[i]), T, S, N });
  }
  return F;
}
export function sweep(profile, F) {
  const pos = [], idx = [], np = profile.length; let base = 0;
  for (let e = 0; e < np; e++) {   // one flat-shaded strip per profile edge
    const [s0, n0] = profile[e], [s1, n1] = profile[(e + 1) % np];
    for (let i = 0; i < F.length; i++) { for (const [s, n] of [[s0, n0], [s1, n1]]) { const p = F[i].P.clone().addScaledVector(F[i].S, s).addScaledVector(F[i].N, n); pos.push(p.x, p.y, p.z); } }
    for (let i = 0; i < F.length - 1; i++) { const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    base += F.length * 2;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// a U-shaped trough: floor top at +0.35 from the path point, walls 1.6 high
export function trough(pts, { W = 1.9, wall = 0.42, H = 1.6, tf = 0.35 } = {}) {
  const prof = [[-W, -0.25], [W, -0.25], [W, tf + H], [W - wall, tf + H], [W - wall, tf], [-W + wall, tf], [-W + wall, tf + H], [-W, tf + H]];
  const F = frames(pts);
  // flip winding so that normals face outward
  return sweep(prof.slice().reverse(), F);
}

// ---------------------------------------------------------------- cam, bell, cup, domino
export function camProfile(R, lift) {
  const D = Math.PI / 180, ss = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  const prof = phi => { const p = ((phi + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; if (p < -9 * D || p > 45 * D) return 0; return p < 0 ? ss((p + 9 * D) / (9 * D)) : 1 - ss((p - 20 * D) / (25 * D)); };
  const pts = []; for (let i = 0; i < 720; i++) { const phi = i / 720 * 2 * Math.PI; pts.push([(R + lift * prof(phi)) * Math.cos(phi), (R + lift * prof(phi)) * Math.sin(phi)]); }
  return pts;
}
export function bellGeo() {
  const pts = []; const prof = [[0, 9.2], [1.2, 9.0], [3.0, 8.0], [5.0, 6.0], [6.8, 3.4], [8.0, 1.2], [8.6, 0], [8.2, -0.5], [7.4, -0.3]];
  for (const [r, y] of prof) pts.push(new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, 48); return g;
}
export function cupGeo() {
  const pts = [[0, -1.0], [1.6, -0.9], [2.6, -0.2], [3.2, 1.2], [3.5, 2.2], [3.2, 2.3], [2.9, 1.4], [2.3, 0.2], [1.4, -0.7], [0, -0.8]].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, 36);
}
export function dominoMesh(H, T, W) {
  const g = new THREE.Group();   // origin at the front-bottom edge; the slab extends back (-x) and up
  const body = box(T, H - 0.7, W, M.bone, 0.1); body.position.set(-T / 2, (H - 0.7) / 2, 0); g.add(body);
  const cap = box(T + 0.1, 0.8, W + 0.1, M.brass, 0.1); cap.position.set(-T / 2, H - 0.4, 0); g.add(cap);
  const foot = box(T + 0.1, 0.3, W + 0.1, M.brassDark, 0.08); foot.position.set(-T / 2, 0.15, 0); g.add(foot);
  // a small inlaid dot row on both faces
  const dotMat = M.ebony;
  for (const sx of [0.02, -T - 0.02]) for (const dz of [-0.9, 0, 0.9]) { const d = cyl(0.26, 0.08, dotMat, 12); d.rotation.z = Math.PI / 2; d.rotation.x = 0; d.position.set(sx, H * 0.45, dz); g.add(d); }
  return g;
}

// ---------------------------------------------------------------- plate: engraved brass tag with text (canvas texture)
export function plate(w, h, lines, { font = '600 54px "Courier Prime"', color = '#2c1d0e', screws = true } = {}) {
  const px = 1024, ph = Math.round(px * h / w);
  const tex = canvasTex(px, ph, (g) => {
    const grd = g.createLinearGradient(0, 0, px, ph); grd.addColorStop(0, '#e2bd6a'); grd.addColorStop(0.5, '#cfa04a'); grd.addColorStop(1, '#bf8e3c'); g.fillStyle = grd; g.fillRect(0, 0, px, ph);
    const r = mulberry(3); g.globalAlpha = 0.25; for (let i = 0; i < 700; i++) { g.fillStyle = r() > .5 ? '#fff' : '#5a3a10'; g.fillRect(r() * px, r() * ph, 50 + r() * 240, 1); } g.globalAlpha = 1;
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((ln, i) => { g.font = ln.font || font; g.fillText(ln.text, px / 2, ph * (i + 1) / (lines.length + 1)); });
  }, { wrap: false });
  const m = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.85, roughness: 0.4, bumpMap: tex, bumpScale: 0.6 });
  const g = new THREE.Group(); g.add(mesh(new RoundedBoxGeometry(w, h, 0.4, 2, 0.12), m));
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.999, h * 0.999), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.85, roughness: 0.4 })); front.position.z = 0.205; front.receiveShadow = true; g.add(front);
  if (screws) for (const sx of [-1, 1]) { const s = cyl(0.28, 0.2, M.steel, 12); s.position.set(sx * (w / 2 - 0.55), 0, 0.3); g.add(s); }
  return g;
}
export { canvasTex };
