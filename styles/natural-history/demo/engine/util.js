// util.js: seeded noise, curves and polygon helpers shared by every part of the engine.
import { mulberry, clamp, lerp, seg, ss, eio, eo, ei, back, spring, TAU, hash, track } from '/core/lib.js';
export { mulberry, clamp, lerp, seg, ss, eio, eo, ei, back, spring, TAU, hash, track };

// 2-D value noise, 0..1, smooth; n.fbm(x, y, octaves)
export function Noise(seed = 1) {
  const r = mulberry(seed), P = new Float32Array(65536);
  for (let i = 0; i < 65536; i++) P[i] = r();
  const at = (x, y) => P[((y & 255) << 8) | (x & 255)];
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(at(xi, yi), at(xi + 1, yi), u), lerp(at(xi, yi + 1), at(xi + 1, yi + 1), u), v);
  };
  n.fbm = (x, y, o = 4) => { let a = .5, f = 1, s = 0, m = 0; for (let i = 0; i < o; i++) { s += a * n(x * f, y * f); m += a; a *= .5; f *= 2.03; } return s / m; };
  return n;
}

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const P = (x, y) => ({ x, y });

// Catmull-Rom through points -> dense polyline
export function catmull(pts, closed = false, per = 10) {
  const n = pts.length, out = [], segs = closed ? n : n - 1;
  const g = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < segs; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push({
        x: .5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: .5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
      });
    }
  }
  if (!closed) out.push({ ...pts[n - 1] });
  return out;
}

export function polyLen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]); return s; }

export function resample(pts, step) {
  const L = polyLen(pts); if (L < 1e-6) return pts.slice();
  const n = Math.max(2, Math.ceil(L / step)), out = [pts[0]]; let acc = 0, j = 1, target = L / n;
  let a = pts[0];
  for (let i = 1; i < n; i++) {
    let need = target;
    while (j < pts.length) {
      const d = dist(a, pts[j]);
      if (d >= need) { const k = need / d; a = { x: a.x + (pts[j].x - a.x) * k, y: a.y + (pts[j].y - a.y) * k }; break; }
      need -= d; a = pts[j]; j++;
    }
    out.push(a);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function xf(pts, { x = 0, y = 0, r = 0, sx = 1, sy = sx } = {}) {
  const c = Math.cos(r), s = Math.sin(r);
  return pts.map(p => { const X = p.x * sx, Y = p.y * sy; return { x: x + X * c - Y * s, y: y + X * s + Y * c }; });
}

export function bboxOf(polys) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const pl of polys) for (const p of pl) { if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y; if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y; }
  return { x0, y0, x1, y1 };
}

export function ellipse(cx, cy, a, b, rot = 0, n = 72, a0 = 0, a1 = TAU) {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  const full = Math.abs(a1 - a0 - TAU) < 1e-6, m = full ? n : n + 1;
  for (let i = 0; i < m; i++) {
    const t = a0 + (a1 - a0) * i / n, X = a * Math.cos(t), Y = b * Math.sin(t);
    out.push({ x: cx + X * c - Y * s, y: cy + X * s + Y * c });
  }
  return out;
}

// polygon path helpers for canvas
export function pathPoly(ctx, pts, close = true) {
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  if (close) ctx.closePath();
}

export function pointInPoly(x, y, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

export const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
export const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c;
}
