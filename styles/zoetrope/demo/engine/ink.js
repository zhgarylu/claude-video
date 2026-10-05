// Engraver's toolkit: palette, a pen whose line swells and thins, and hatching whose line weight follows a shade function.
// Everything is deterministic (seeded) so any frame can be rendered alone.
import { mulberry, hash, TAU } from '/core/lib.js';

export const C = {
  ink: '#241509', ink2: '#3b2312', sepia: '#6f4a2a', sepia2: '#9b7040',
  cream: '#efe2bf', cream2: '#e4d09b', cream3: '#cdb277',
  brass: '#b98a3a', brassHi: '#f0cd7a', brassLo: '#6d4a1b', brassDk: '#3d2a0f',
  wood: '#2a190d', wood2: '#4a2d17', glow: '#ffd9a0',
};

// Catmull-Rom through points -> dense polyline
export function smooth(pts, closed = false, n = 10) {
  const out = [], P = pts.length, g = i => closed ? pts[(i + P) % P] : pts[Math.max(0, Math.min(P - 1, i))];
  const segs = closed ? P : P - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  if (!closed) out.push(pts[P - 1]);
  return out;
}
export function pathOf(ctx, poly, close = true) {
  ctx.beginPath(); poly.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); if (close) ctx.closePath();
}
// a pen line: width swells in the middle, tiny seeded wobble; open or closed polyline
export function pen(ctx, poly, w = 2, color = C.ink, seed = 1, o = {}) {
  const n = poly.length; if (n < 2) return;
  const taper = o.taper ?? 0.45, closed = o.closed;
  ctx.save(); ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < n - 1; i++) {
    const u = i / (n - 1), sw = closed ? 1 : (1 - taper) + taper * Math.sin(Math.PI * u);
    const jig = 0.82 + 0.36 * hash(seed * 17.3 + Math.floor(i / 3) * 1.7);
    ctx.lineWidth = Math.max(0.35, w * sw * jig);
    ctx.beginPath(); ctx.moveTo(poly[i][0], poly[i][1]); ctx.lineTo(poly[i + 1][0], poly[i + 1][1]); ctx.stroke();
  }
  if (closed) { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(poly[n - 1][0], poly[n - 1][1]); ctx.lineTo(poly[0][0], poly[0][1]); ctx.stroke(); }
  ctx.restore();
}
export const line = (ctx, a, b, w = 1.5, color = C.ink, seed = 1, taper = 0.6) => pen(ctx, [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b], w, color, seed, { taper });

// erase whatever ink lies behind a shape (tiles are transparent, so this keeps the paper showing through)
export function knock(ctx, poly) { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; pathOf(ctx, poly); ctx.fill(); ctx.restore(); }

// engraver's hatching: parallel lines whose weight follows shade(x,y) in 0..1, clipped to a polygon
export function hatch(ctx, poly, ang, gap, wmax, shade, color = C.ink, step = 4) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of poly) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 2, a = ang * Math.PI / 180;
  const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
  ctx.save(); pathOf(ctx, poly); ctx.clip(); ctx.strokeStyle = color; ctx.lineCap = 'butt';
  for (let d = -R; d <= R; d += gap) {
    let prevW = 0, px = 0, py = 0;
    for (let s = -R; s <= R; s += step) {
      const x = cx + ux * s + vx * d, y = cy + uy * s + vy * d, w = wmax * shade(x, y);
      if (w > 0.28) { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * (step + 0.6), y + uy * (step + 0.6)); ctx.stroke(); }
    }
  }
  ctx.restore();
}
export const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// a leaf-shaped feather from (x,y) at angle a (rad) with length L and half-width wd; returns its outline
export function featherPoly(x, y, a, L, wd, bend = 0) {
  const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca, pts = [];
  const prof = u => wd * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.7)), 0.9);
  const cen = u => bend * L * u * u;
  for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push([x + ca * L * u + nx * (prof(u) + cen(u)), y + sa * L * u + ny * (prof(u) + cen(u))]); }
  for (let i = 8; i >= 0; i--) { const u = i / 8; pts.push([x + ca * L * u + nx * (-prof(u) * 0.8 + cen(u)), y + sa * L * u + ny * (-prof(u) * 0.8 + cen(u))]); }
  return pts;
}
export const rad = d => d * Math.PI / 180;
