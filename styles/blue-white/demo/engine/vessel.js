// vessel.js: lathe-model vessels (profile → mesh) and the small matrix kit the glaze renderer and the brush overlay share.
// A vessel is a closed profile (r, y) turned around the y axis. Every vertex carries texture coordinates for the painting:
//   kind 0  glazed wall   → "wrap" strip, u = angle / 2π, v = arc length in texels (outer wall → lip → inner wall)
//   kind 1  glazed disc   → "disc" square, planar (x, z) mapping (plate well, bowl medallion, base mark)
//   kind 2  bare biscuit  → foot ring, no glaze
// Units: the vase is 1.0 tall; PPU = texels per unit on the wrap strip, chosen so the belly circumference is `W` texels.

export const TAU = Math.PI * 2;

// ---------- matrices (column-major, like WebGL) ----------
export const M = {
  id: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  persp(fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; },
  look(e, c, up = [0, 1, 0]) {
    const sub = (a, b) => a.map((v, i) => v - b[i]), nrm = a => { const l = Math.hypot(...a); return a.map(v => v / l); };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const z = nrm(sub(e, c)), x = nrm(cross(up, z)), y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]), -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]), -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]), 1];
  },
  rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; },
  trans: (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1],
  scale: (x, y, z) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1],
  rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; },
  rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
  pt(m, p) { const x = p[0], y = p[1], z = p[2]; const w = m[3] * x + m[7] * y + m[11] * z + m[15]; return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, (m[2] * x + m[6] * y + m[10] * z + m[14]) / w, w]; },
};

// Catmull-Rom through points, `n` samples per span
export function spline(P, n = 8) {
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(P[P.length - 1].slice());
  return out;
}

// ---------- profiles ----------
// parts, in order, each {kind, in, pts: [[r,y]…], smooth}. pts of a smooth part go through a spline; a part boundary is a hard edge.
const PROFILES = {
  // plum-vase ("meiping"): small mouth, high shoulder, tapering body, slightly flared foot
  meiping: {
    Rref: 0.30, wallDepth: 0.0,
    parts: [
      { kind: 2, pts: [[0.158, 0.030], [0.158, 0.0], [0.176, 0.0], [0.178, 0.028]] },
      { kind: 0, pts: [[0.178, 0.028], [0.186, 0.075], [0.212, 0.17], [0.252, 0.31], [0.288, 0.46], [0.302, 0.60], [0.296, 0.70], [0.262, 0.80], [0.19, 0.885], [0.115, 0.93], [0.086, 0.948], [0.080, 0.974], [0.091, 0.996]], smooth: true },
      { kind: 0, pts: [[0.091, 0.996], [0.081, 1.004], [0.068, 0.998], [0.064, 0.985]], smooth: true },
      { kind: 0, in: 1, pts: [[0.064, 0.985], [0.058, 0.93], [0.052, 0.85], [0.03, 0.78], [0.0, 0.76]], smooth: true },
    ],
  },
  // ovoid jar ("guan") without lid: wide mouth, rolled lip
  guan: {
    Rref: 0.34,
    parts: [
      { kind: 2, pts: [[0.205, 0.030], [0.205, 0.0], [0.225, 0.0], [0.228, 0.03]] },
      { kind: 0, pts: [[0.228, 0.03], [0.248, 0.09], [0.31, 0.22], [0.348, 0.38], [0.345, 0.52], [0.30, 0.65], [0.22, 0.73], [0.18, 0.755], [0.176, 0.79], [0.195, 0.81]], smooth: true },
      { kind: 0, pts: [[0.195, 0.81], [0.188, 0.822], [0.172, 0.818], [0.166, 0.80]], smooth: true },
      { kind: 0, in: 1, pts: [[0.166, 0.80], [0.162, 0.74], [0.20, 0.62], [0.24, 0.45], [0.2, 0.2], [0.0, 0.06]], smooth: true },
    ],
  },
  // deep bowl: foot ring, rounded wall, everted lip, painted medallion in the well
  bowl: {
    Rref: 0.41, discR: 0.16,
    parts: [
      { kind: 2, pts: [[0.150, 0.026], [0.150, 0.0], [0.168, 0.0], [0.170, 0.026]] },
      { kind: 0, pts: [[0.170, 0.026], [0.19, 0.06], [0.26, 0.12], [0.345, 0.205], [0.400, 0.285], [0.425, 0.345]], smooth: true },
      { kind: 0, pts: [[0.425, 0.345], [0.428, 0.352], [0.420, 0.356], [0.412, 0.350]], smooth: true },
      { kind: 0, in: 1, pts: [[0.412, 0.350], [0.388, 0.292], [0.33, 0.215], [0.25, 0.14], [0.17, 0.092]], smooth: true },
      { kind: 1, in: 1, pts: [[0.17, 0.092], [0.14, 0.078], [0.08, 0.068], [0.0, 0.064]], smooth: true },
    ],
  },
  // wide plate: foot ring, shallow cavetto, flat well for a landscape medallion
  plate: {
    Rref: 0.62, discR: 0.46,
    parts: [
      { kind: 2, pts: [[0.268, 0.028], [0.268, 0.0], [0.290, 0.0], [0.292, 0.028]] },
      { kind: 0, pts: [[0.292, 0.028], [0.34, 0.045], [0.48, 0.066], [0.575, 0.090], [0.626, 0.122]], smooth: true },
      { kind: 0, pts: [[0.626, 0.122], [0.630, 0.130], [0.622, 0.135], [0.614, 0.128]], smooth: true },
      { kind: 0, in: 1, pts: [[0.614, 0.128], [0.58, 0.100], [0.52, 0.082], [0.46, 0.0765]], smooth: true },
      { kind: 1, in: 1, pts: [[0.46, 0.0765], [0.3, 0.068], [0.0, 0.064]], smooth: true },
    ],
  },
};

export const profileNames = Object.keys(PROFILES);

// Build a vessel: sampled profile, texture sizes, mesh arrays.
export function buildVessel(name, { W = 4096, seg = 256, spanN = 10 } = {}) {
  const spec = PROFILES[name];
  const ppu = W / (TAU * spec.Rref);
  const pts = []; // {r,y,nr,ny,kind,inn,s}
  let s = 0, prev = null;
  const partsSampled = [];
  for (const part of spec.parts) {
    const P = part.smooth ? spline(part.pts, spanN) : (() => { // polyline with a few extra samples so lighting is smooth on short edges
      const o = []; for (let i = 0; i < part.pts.length - 1; i++) for (let k = 0; k < 4; k++) { const t = k / 4; o.push([part.pts[i][0] + (part.pts[i + 1][0] - part.pts[i][0]) * t, part.pts[i][1] + (part.pts[i + 1][1] - part.pts[i][1]) * t]); }
      o.push(part.pts[part.pts.length - 1]); return o;
    })();
    const arr = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
      let tr = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tr, ty) || 1; tr /= l; ty /= l;
      // outward normal for an outer wall rising: (ty, -tr) rotated; sign fixed below by the part's side
      arr.push({ r: P[i][0], y: P[i][1], tr, ty, kind: part.kind, inn: part.in ? 1 : 0 });
    }
    partsSampled.push(arr);
  }
  // orientation: the profile runs foot → outer wall → lip → inner wall → centre, so the outward normal is (ty, -tr) on the way up (r grows with y) … use the right-hand rule for a path with the solid on its left.
  // path goes up the outside with solid on the left (towards the axis) → outward normal = right-hand side = (ty, -tr)
  for (const arr of partsSampled) for (const p of arr) { p.nr = p.ty; p.ny = -p.tr; }
  // foot ring is traversed inward→outward over its bottom: normal (ty,-tr) with t=(+1,0) gives (0,-1): down. correct. First foot segment goes down at the inner side (t=(0,-1)) → (-1,0): faces the axis. correct.
  // arc-length v for wrap-strip parts only
  let vArc = 0, last = null;
  for (const arr of partsSampled) for (const p of arr) {
    if (p.kind === 0) { if (last) vArc += Math.hypot(p.r - last.r, p.y - last.y); p.v = vArc * ppu; last = p; } else { p.v = last ? vArc * ppu : 0; last = null; }
  }
  const H = Math.ceil(vArc * ppu / 8) * 8;
  // mesh
  const verts = [], idx = [];
  const rows = [];
  for (const arr of partsSampled) { rows.push(arr); }
  const discR = spec.discR || 0.2;
  let base = 0;
  for (const arr of rows) {
    const n = arr.length;
    for (let i = 0; i < n; i++) {
      const p = arr[i];
      for (let j = 0; j <= seg; j++) {
        const th = j / seg * TAU, c = Math.cos(th), sn = Math.sin(th);
        const x = p.r * c, z = p.r * sn;
        const nx = p.nr * c, nz = p.nr * sn;
        let u = j / seg, v = p.v, kind = p.kind;
        if (kind !== 0) { u = 0.5 + x / (2 * discR); v = 0.5 + z / (2 * discR); }
        verts.push(x, p.y, z, nx, p.ny, nz, u, v, kind + (p.inn ? 10 : 0));
      }
    }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
      const a = base + i * (seg + 1) + j, b = a + 1, c = a + seg + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    base += n * (seg + 1);
  }
  // reference lookup for brush: (u in 0..W px, v in px) → object position on the wrap strip
  const wrapPts = []; for (const arr of partsSampled) for (const p of arr) if (p.kind === 0) wrapPts.push(p);
  const surfaceAt = (xpx, vpx) => {
    let i = 0; while (i < wrapPts.length - 2 && wrapPts[i + 1].v < vpx) i++;
    const a = wrapPts[i], b = wrapPts[i + 1], t = Math.max(0, Math.min(1, (vpx - a.v) / ((b.v - a.v) || 1)));
    const r = a.r + (b.r - a.r) * t, y = a.y + (b.y - a.y) * t, nr = a.nr + (b.nr - a.nr) * t, ny = a.ny + (b.ny - a.ny) * t;
    const th = xpx / W * TAU;
    return { pos: [r * Math.cos(th), y, r * Math.sin(th)], nrm: [nr * Math.cos(th), ny, nr * Math.sin(th)] };
  };
  // v (px) at a given height on the outer wall (first wrap part), for laying bands by height
  const vAtY = y => { let best = wrapPts[0]; for (const p of wrapPts) { if (p.inn) break; if (Math.abs(p.y - y) < Math.abs(best.y - y)) best = p; } return best.v; };
  const outerEndV = (() => { let v = 0; for (const p of wrapPts) { if (p.inn) break; v = p.v; } return v; })();
  const rimY = Math.max(...wrapPts.map(p => p.y));
  return { name, W, H, ppu, discSize: 2048, verts: new Float32Array(verts), idx: new Uint32Array(idx), surfaceAt, vAtY, outerEndV, rimY, discR, Rref: spec.Rref, wrapPts };
}
