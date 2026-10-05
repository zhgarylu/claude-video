// board.js: thick corrugated-board geometry. A board lies in the XZ plane, bottom at y=0, top at y=th.
// Faces get the kraft texture, cut edges get the flute profile (edges that cross the flutes) or plain bands (edges along them).
import * as THREE from 'three';
import { faceTextures, edgeTextures, PITCH, TH, TILE } from './tex.js';

const matCache = {};
export function boardMats(topTone = 'outer', botTone = 'pale', seed = 1) {
  const k = topTone + botTone + seed; if (matCache[k]) return matCache[k];
  const ft = faceTextures(topTone, seed), fb = faceTextures(botTone, seed + 50), et = edgeTextures(3);
  const face = (f) => new THREE.MeshStandardMaterial({ map: f.map, bumpMap: f.bump, bumpScale: 1.2, roughness: .92, metalness: 0 });
  const side = (m) => new THREE.MeshStandardMaterial({ map: m, roughness: .95, metalness: 0, side: THREE.DoubleSide });
  return matCache[k] = [face(ft), face(fb), side(et.prof), side(et.len)];
}

const area = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; };

// poly: [[x,z],...] outer loop; holes: [[[x,z],...]]; flute: 'x' | 'z' (the axis the flutes run along)
export function makeBoardGeo({ poly, holes = [], th = TH, flute = 'x', uvOff = [0, 0] }) {
  const outer = area(poly) > 0 ? poly.slice() : poly.slice().reverse();
  const hs = holes.map(h => area(h) < 0 ? h.slice() : h.slice().reverse());
  const all = [...outer, ...hs.flat()];
  const V2 = a => a.map(p => new THREE.Vector2(p[0], p[1]));
  const tris = THREE.ShapeUtils.triangulateShape(V2(outer), hs.map(V2));
  const pos = [], nor = [], uv = [], groups = [], idx = [];
  const fluteX = flute === 'x';
  const faceUV = p => fluteX ? [p[1] / TILE + uvOff[0], p[0] / TILE + uvOff[1]] : [p[0] / TILE + uvOff[0], p[1] / TILE + uvOff[1]];
  let count = 0; const pushGroup = (mi, from) => groups.push({ start: from, count: idx.length - from, mi });
  for (const [mi, y, ny] of [[0, th, 1], [1, 0, -1]]) {
    const from = idx.length, base = pos.length / 3;
    for (const p of all) { pos.push(p[0], y, p[1]); nor.push(0, ny, 0); uv.push(...faceUV(p)); }
    for (const t of tris) {
      let [a, b, c] = t; const pa = all[a], pb = all[b], pc = all[c];
      const cr = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0]); // >0: ccw in (x,z)
      // ccw in (x,z) faces -Y (see notes in TREATMENT); top wants +Y so reverse ccw for the top
      const wantReverse = (ny > 0) ? cr > 0 : cr < 0; if (wantReverse) [b, c] = [c, b];
      idx.push(base + a, base + b, base + c);
    }
    pushGroup(mi, from);
  }
  // side walls: profile edges (cross the flutes) and length edges (along them)
  const loops = [outer, ...hs], prof = [], len = [];
  for (const L of loops) for (let i = 0; i < L.length; i++) {
    const p = L[i], q = L[(i + 1) % L.length], dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz); if (l < 1e-6) continue;
    const n = [dz / l, -dx / l]; (Math.abs(fluteX ? n[0] : n[1]) > .55 ? prof : len).push({ p, q, n, l });
  }
  for (const [mi, list] of [[2, prof], [3, len]]) {
    const from = idx.length;
    for (const e of list) {
      const base = pos.length / 3, perp = fluteX ? 1 : 0;
      const u0 = mi === 2 ? e.p[perp] / PITCH : 0, u1 = mi === 2 ? e.q[perp] / PITCH : e.l / PITCH * .2;
      pos.push(e.p[0], 0, e.p[1], e.q[0], 0, e.q[1], e.q[0], th, e.q[1], e.p[0], th, e.p[1]);
      for (let k = 0; k < 4; k++) nor.push(e.n[0], 0, e.n[1]);
      uv.push(u0, 0, u1, 0, u1, 1, u0, 1);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    pushGroup(mi, from);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); for (const gr of groups) g.addGroup(gr.start, gr.count, gr.mi);
  return g;
}

export function makeBoard(o) {
  const geo = makeBoardGeo(o), m = new THREE.Mesh(geo, boardMats(o.top ?? 'outer', o.bottom ?? 'pale', o.seed ?? 1));
  m.castShadow = m.receiveShadow = true; m.userData.th = o.th ?? TH; return m;
}
export const rectPoly = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

// A board that bends: stations along x, deflection from a function. flutes run along x (the span).
export function makeBend({ L, W, th = TH, N = 48, seed = 2 }) {
  const mats = boardMats('outer', 'pale', seed), nv = (N + 1);
  const g = new THREE.BufferGeometry();
  const P = new Float32Array((nv * 4 + 4) * 3 * 2), U = new Float32Array(P.length / 3 * 2), idx = [];
  // layout: rings of 4 corners per station for top/bottom faces & sides are built per-face with duplicated verts
  const faces = ['top', 'bot', 'front', 'back'];  // each face: nv*2 verts
  const per = nv * 2, total = per * 4 + 8;
  const pos = new Float32Array(total * 3), uv = new Float32Array(total * 2), nor = new Float32Array(total * 3);
  const addStrip = (f, flip) => { const b = f * per; for (let i = 0; i < N; i++) { const a = b + i * 2; if (!flip) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } };
  addStrip(0, false); addStrip(1, true); addStrip(2, true); addStrip(3, false);
  const faceRanges = [[0, N * 6, 0], [N * 6, N * 6, 1], [N * 12, N * 12, 3]];
  const capBase = per * 4; idx.push(capBase, capBase + 1, capBase + 2, capBase, capBase + 2, capBase + 3, capBase + 4, capBase + 6, capBase + 5, capBase + 4, capBase + 7, capBase + 6);
  g.setIndex(idx); g.addGroup(0, N * 6, 0); g.addGroup(N * 6, N * 6, 1); g.addGroup(N * 12, N * 12, 3); g.addGroup(N * 24, 12, 2);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const mesh = new THREE.Mesh(g, mats); mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  // y(x): deflection (cm, negative = down) at station coordinate s in [0,1]; dx(s): optional horizontal squeeze
  mesh.userData.set = (yf, o = {}) => {
    const pts = [];
    for (let i = 0; i <= N; i++) { const s = i / N, x = (s - .5) * L * (o.sx ?? 1) + (o.cx ?? 0), y = yf(s); pts.push([x, y]); }
    const top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      bot.push([pts[i][0], pts[i][1], nx, ny]); top.push([pts[i][0] + nx * th, pts[i][1] + ny * th, nx, ny]);
    }
    const hw = W / 2, set = (f, i, k, x, y, z, nx, ny, nz, u, v) => { const j = f * per + i * 2 + k; pos.set([x, y, z], j * 3); nor.set([nx, ny, nz], j * 3); uv.set([u, v], j * 2); };
    for (let i = 0; i <= N; i++) {
      const s = i / N, u = s * L / TILE;
      set(0, i, 0, top[i][0], top[i][1], -hw, top[i][2], top[i][3], 0, -hw / TILE, u); set(0, i, 1, top[i][0], top[i][1], hw, top[i][2], top[i][3], 0, hw / TILE, u);
      set(1, i, 0, bot[i][0], bot[i][1], -hw, -bot[i][2], -bot[i][3], 0, -hw / TILE, u); set(1, i, 1, bot[i][0], bot[i][1], hw, -bot[i][2], -bot[i][3], 0, hw / TILE, u);
      set(2, i, 0, bot[i][0], bot[i][1], hw, 0, 0, 1, s * L / PITCH * .2, 0); set(2, i, 1, top[i][0], top[i][1], hw, 0, 0, 1, s * L / PITCH * .2, 1);
      set(3, i, 0, bot[i][0], bot[i][1], -hw, 0, 0, -1, s * L / PITCH * .2, 0); set(3, i, 1, top[i][0], top[i][1], -hw, 0, 0, -1, s * L / PITCH * .2, 1);
    }
    // end caps show the flute profile
    const cap = (k, i, sgn) => { const o = capBase + k * 4; const A = bot[i], B = top[i]; const nxx = sgn * Math.cos(Math.atan2(B[3] * 0 + (pts[Math.min(N, i + 1)][1] - pts[Math.max(0, i - 1)][1]), pts[Math.min(N, i + 1)][0] - pts[Math.max(0, i - 1)][0])), nyy = sgn * Math.sin(Math.atan2(pts[Math.min(N, i + 1)][1] - pts[Math.max(0, i - 1)][1], pts[Math.min(N, i + 1)][0] - pts[Math.max(0, i - 1)][0]));
      const vs = [[A[0], A[1], -hw, 0], [A[0], A[1], hw, 1], [B[0], B[1], hw, 1], [B[0], B[1], -hw, 0]]; const vv = [0, 0, 1, 1];
      vs.forEach((q, m) => { pos.set([q[0], q[1], q[2]], (o + m) * 3); nor.set([nxx, nyy, 0], (o + m) * 3); uv.set([q[2] / PITCH, vv[m]], (o + m) * 2); }); };
    cap(0, 0, -1); cap(1, N, 1);
    g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true; g.computeBoundingSphere();
  };
  mesh.userData.set(() => 0);
  return mesh;
}
