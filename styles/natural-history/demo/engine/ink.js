// ink.js: the dip pen and the stipple dot. A pen stroke is a polygon strip whose width follows the nib angle
// (thick on the down-stroke, hairline across), with a small blot where the nib lands and a flicked taper.
// Unlike a burin, nothing swells on a schedule: the width comes from direction, speed and a little noise.
import { Noise, clamp, lerp, makeCanvas, pathPoly, mulberry, polyLen, dist } from './util.js';

export const INK = '#2b1d12';
const nzw = Noise(77);

// stroke: { pts, w, nib (0..1), taper (fraction at the tail), col, a }
export function stroke(pts, o = {}) {
  return Object.assign({ pts, w: 1.5, nib: .55, taper: .22, head: .05, col: INK, a: .94, kind: 'line' }, o);
}
export function dot(x, y, r, o = {}) { return Object.assign({ kind: 'dot', x, y, r, col: INK, a: .9 }, o); }

function sub(pts, frac) {
  if (frac >= 1) return pts;
  const L = polyLen(pts) * frac, out = [pts[0]]; let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1], pts[i]);
    if (acc + d >= L) { const k = d ? (L - acc) / d : 0; out.push({ x: lerp(pts[i - 1].x, pts[i].x, k), y: lerp(pts[i - 1].y, pts[i].y, k) }); return out; }
    acc += d; out.push(pts[i]);
  }
  return out;
}

export function drawStroke(ctx, s, frac = 1) {
  if (s.kind === 'dot') { ctx.fillStyle = s.col; ctx.globalAlpha = s.a; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; return; }
  const pts = sub(s.pts, frac), n = pts.length; if (n < 2) return;
  const L = polyLen(s.pts), done = frac >= 1;
  const left = [], right = []; let u = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const tx = b.x - a.x, ty = b.y - a.y, tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
    if (i) u += dist(pts[i - 1], pts[i]);
    const uu = L ? u / L : 0;
    const ang = Math.atan2(ty, tx), nibF = 1 - s.nib + s.nib * Math.abs(Math.sin(ang - .75));
    let prof = Math.min(1, .5 + uu / Math.max(.001, s.head) * .5);
    if (done || true) { const tp = s.taper; if (tp > 0 && uu > 1 - tp) prof *= Math.max(.12, 1 - Math.pow((uu - (1 - tp)) / tp, 1.5)); }
    const jit = .9 + .22 * nzw(pts[i].x * .07, pts[i].y * .07);
    const w = Math.max(.28, s.w * nibF * prof * jit) / 2;
    left.push({ x: pts[i].x + nx * w, y: pts[i].y + ny * w }); right.push({ x: pts[i].x - nx * w, y: pts[i].y - ny * w });
  }
  ctx.fillStyle = s.col; ctx.globalAlpha = s.a; ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < n; i++) ctx.lineTo(left[i].x, left[i].y);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath(); ctx.fill();
  // ink blot where the nib lands
  if (s.w > .9) { ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, Math.max(.45, s.w * .42), 0, 6.2832); ctx.fill(); }
  ctx.globalAlpha = 1;
}

// An ordered set of marks, replayable up to a fraction.
export class InkSet {
  constructor() { this.items = []; this.total = 0; }
  add(s) { s.wt = s.kind === 'dot' ? 2.2 : Math.max(8, polyLen(s.pts)); this.items.push(s); this.total += s.wt; return s; }
  addAll(list) { for (const s of list) this.add(s); return this; }
  draw(ctx, p = 1) {
    if (p <= 0) return; const lim = p * this.total; let acc = 0;
    for (const s of this.items) {
      if (acc >= lim) break;
      const f = Math.min(1, (lim - acc) / s.wt); drawStroke(ctx, s, p >= 1 ? 1 : f); acc += s.wt;
    }
  }
}

// polygon mask lookup (1 px world resolution)
export function maskFn(polys, cut = [], bb) {
  const x0 = Math.floor(bb.x0) - 2, y0 = Math.floor(bb.y0) - 2, w = Math.ceil(bb.x1 - x0) + 4, h = Math.ceil(bb.y1 - y0) + 4;
  const c = makeCanvas(w, h), g = c.getContext('2d', { willReadFrequently: true });
  g.translate(-x0, -y0); g.fillStyle = '#000'; g.beginPath(); for (const pl of polys) pathPoly(g, pl); g.fill();
  if (cut.length) { g.globalCompositeOperation = 'destination-out'; g.beginPath(); for (const pl of cut) pathPoly(g, pl); g.fill(); }
  const d = g.getImageData(0, 0, w, h).data;
  return (x, y) => { const ix = Math.floor(x - x0), iy = Math.floor(y - y0); return ix >= 0 && iy >= 0 && ix < w && iy < h ? d[(iy * w + ix) * 4 + 3] / 255 : 0; };
}

// stipple dots from a tone field: jittered grid, probability follows tone above `min`
export function stipple(inside, bb, tone, { sp = 3.2, min = .35, rmin = .45, rmax = 1.15, seed = 1, gamma = 1.4, edgeLock = 0 } = {}) {
  const r = mulberry(seed), out = [];
  for (let y = bb.y0; y < bb.y1; y += sp) for (let x = bb.x0; x < bb.x1; x += sp) {
    const px = x + (r() - .5) * sp * 1.1, py = y + (r() - .5) * sp * 1.1;
    if (inside(px, py) < .98) continue;
    const t = tone(px, py); if (t <= min) continue;
    const k = Math.pow((t - min) / (1 - min), gamma);
    if (r() > k * 1.05) continue;
    out.push(dot(px, py, lerp(rmin, rmax, clamp(k * .8 + r() * .35)) * (.85 + .3 * r()), { a: .78 + r() * .2 }));
  }
  return out;
}

// graphite under-drawing: faint doubled, wandering copies of the outline strokes
export function pencilOf(strokes, seed = 3) {
  const r = mulberry(seed), out = [];
  for (const s of strokes) {
    if (s.kind !== 'line' || s.w < 1.1) continue;
    for (let k = 0; k < 2; k++) {
      const off = (r() - .5) * 2.4, ph = r() * 6;
      const pts = s.pts.map((p, i) => ({ x: p.x + off + Math.sin(i * .21 + ph) * .9, y: p.y - off * .6 + Math.cos(i * .17 + ph) * .9 }));
      out.push({ kind: 'line', pts, w: .75, nib: 0, taper: .35, head: .1, col: '#625b52', a: .42 });
    }
  }
  return out;
}
