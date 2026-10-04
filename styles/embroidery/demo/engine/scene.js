// scene.js — stitch generators (stem, satin leaf, fan petal, satin disc, masked satin text, French knots)
// and the timeline that grows them point by point, with the needle and the thread pull.
import { clamp, mulberry, TAU, eo, spring, lerp } from '/core/lib.js';
import { thread, knot, needle, loose, LIGHT, ENV } from './thread.js';

const P = (x, y) => ({ x, y });

// ---- path helpers
export function catmull(pts, n = 24) { // dense polyline through control points
  const out = [], g = i => pts[clamp(i, 0, pts.length - 1)];
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < n; k++) {
    const t = k / n, p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2), t2 = t * t, t3 = t2 * t;
    const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    out.push(P(f(p0.x, p1.x, p2.x, p3.x), f(p0.y, p1.y, p2.y, p3.y)));
  }
  out.push(pts[pts.length - 1]); return out;
}
export function resample(poly, step) { // equal arc-length points
  const out = [poly[0]]; let acc = 0, prev = poly[0];
  for (let i = 1; i < poly.length; i++) {
    let d = Math.hypot(poly[i].x - prev.x, poly[i].y - prev.y);
    while (acc + d >= step) { const t = (step - acc) / d; prev = P(prev.x + (poly[i].x - prev.x) * t, prev.y + (poly[i].y - prev.y) * t); out.push(prev); d = Math.hypot(poly[i].x - prev.x, poly[i].y - prev.y); acc = 0; }
    acc += d; prev = poly[i];
  }
  return out;
}

// ---- stitch makers: each returns an array of items {a,b,w,col,o} in stitching order
const T = (a, b, w, col, o = {}) => ({ k: 't', a, b, w, col, o });

// Stem stitch: each stitch advances 2 steps and comes up half-way back, leaving a slanted rope.
export function stemStitch(pts, { w = 6.5, col, step = 6, gloss = 0.3, seed = 1, off = 0.3, taper = 0 }) {
  const poly = resample(catmull(pts), step), r = mulberry(seed), out = [];
  for (let i = 0; i + 3 < poly.length; i++) {
    const a = poly[i], b = poly[i + 3], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    const k = taper ? lerp(1, 0.6, i / poly.length) : 1, ww = w * k;
    out.push(T(P(a.x + nx * ww * off, a.y + ny * ww * off), P(b.x - nx * ww * off * 0.4, b.y - ny * ww * off * 0.4), ww, col, { gloss, tone: 0.96 + r() * 0.08, seed: seed * 100 + i, sink: i === 0, shadow: 0.55 }));
  }
  return out;
}

// Satin leaf with a centre vein: two halves of slanted stitches, edge to vein.
export function satinLeaf({ base, ang, len, wid, col, w = 6.5, gloss = 0.6, curve = 0.12, slant = 0.17, seed = 1 }) {
  const r = mulberry(seed), u = P(Math.cos(ang), Math.sin(ang)), n = P(-u.y, u.x), out = [];
  const S = t => P(base.x + u.x * len * t + n.x * curve * len * Math.sin(Math.PI * t), base.y + u.y * len * t + n.y * curve * len * Math.sin(Math.PI * t));
  const hw = t => wid / 2 * Math.pow(Math.sin(Math.PI * Math.pow(clamp(t, 0, 1), 0.78)), 0.85);
  const E = (t, s) => { const c = S(t); return P(c.x + n.x * s * hw(t), c.y + n.y * s * hw(t)); };
  const sp = w * 0.8 / len;
  for (const s of [-1, 1]) for (let t = 0.03; t < 0.985; t += sp * (0.92 + r() * 0.16)) {
    const t2 = Math.min(0.995, t + slant), c = S(t + (r() - 0.5) * 0.004), a = P(c.x + n.x * s * 1.2, c.y + n.y * s * 1.2);
    const b = E(t2, s), L = Math.hypot(b.x - a.x, b.y - a.y);
    if (L < 4) continue;
    out.push(T(a, b, w, col, { gloss, tone: 0.97 + r() * 0.07, seed: seed * 1000 + out.length }));
  }
  return out;
}

// Petal as a fan of satin stitches radiating from the flower centre.
export function fanPetal({ c, ang, span, r0, r1, col, w = 6.5, gloss = 0.65, seed = 1, pointed = 0 }) {
  const r = mulberry(seed), out = [], dth = (w * 0.8) / r1;
  const steps = Math.floor(span / dth);
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * 2 - 1, th = ang + x * span / 2 + (r() - 0.5) * dth * 0.15;
    const R = r1 * Math.pow(Math.max(0.001, 1 - Math.pow(Math.abs(x), 2.4 + pointed)), 0.5);
    const u = P(Math.cos(th), Math.sin(th)), a = P(c.x + u.x * r0, c.y + u.y * r0), b = P(c.x + u.x * R, c.y + u.y * R);
    if (R - r0 < 5) continue;
    out.push(T(a, b, w, col, { gloss, tone: 0.97 + r() * 0.07, seed: seed * 1000 + i }));
  }
  return out;
}

// Satin disc (berry, bead): chord stitches with a dome of light.
export function satinDisc({ c, r, ang = 0.7, col, w = 5.5, gloss = 0.75, seed = 1 }) {
  const rd = mulberry(seed), u = P(Math.cos(ang), Math.sin(ang)), n = P(-u.y, u.x), out = [];
  for (let off = -r + w * 0.4; off < r - w * 0.3; off += w * 0.78) {
    const hc = Math.sqrt(Math.max(0, r * r - off * off)) * 0.99;
    if (hc < 2.5) continue;
    const a = P(c.x + n.x * off - u.x * hc, c.y + n.y * off - u.y * hc), b = P(c.x + n.x * off + u.x * hc, c.y + n.y * off + u.y * hc);
    const m = P((a.x + b.x) / 2, c.y * 0 + (a.y + b.y) / 2), hx = c.x + LIGHT.x * r * 0.4, hy = c.y + LIGHT.y * r * 0.4;
    const d = Math.hypot(m.x - hx, m.y - hy) / (r * 1.3);
    out.push(T(a, b, w, col, { gloss, tone: 1.14 - 0.46 * clamp(d, 0, 1) + (rd() - 0.5) * 0.04, seed: seed * 1000 + out.length, bow: 0 }));
  }
  return out;
}

// Satin lettering: rasterize text into a mask, then lay parallel stitches through it.
export function satinText({ text, x, y, size, font, weight = 600, col, w = 3.4, ang = 1.2, gloss = 0.55, seed = 1, align = 'center' }) {
  const pad = 12, cv = document.createElement('canvas'), g = cv.getContext('2d');
  g.font = `${weight} ${size}px ${font}`; const mw = Math.ceil(g.measureText(text).width) + pad * 2, mh = Math.ceil(size * 1.5) + pad * 2;
  cv.width = mw; cv.height = mh; g.font = `${weight} ${size}px ${font}`; g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(text, pad, mh / 2);
  const d = g.getImageData(0, 0, mw, mh).data, inside = (px, py) => px >= 0 && py >= 0 && px < mw && py < mh && d[((py | 0) * mw + (px | 0)) * 4 + 3] > 120;
  const ox = align === 'center' ? x - mw / 2 : x, oy = y - mh / 2;
  const u = P(Math.cos(ang), Math.sin(ang)), n = P(-u.y, u.x), R = Math.hypot(mw, mh) / 2, c = P(mw / 2, mh / 2), out = [], rd = mulberry(seed);
  for (let off = -R; off < R; off += w * 0.82) {
    let run = null;
    for (let s = -R; s <= R; s += 0.8) {
      const px = c.x + n.x * off + u.x * s, py = c.y + n.y * off + u.y * s, ins = inside(px, py);
      if (ins && !run) run = s; else if (!ins && run !== null) {
        if (s - run > 2) out.push(T(P(ox + c.x + n.x * off + u.x * (run + 0.8), oy + c.y + n.y * off + u.y * (run + 0.8)), P(ox + c.x + n.x * off + u.x * (s - 0.8), oy + c.y + n.y * off + u.y * (s - 0.8)), w, col, { gloss, tone: 0.97 + rd() * 0.07, seed: seed * 1000 + out.length, ply: false, bow: 0 }));
        run = null;
      }
    }
  }
  return out;
}

export const knotItem = (p, r, col, o = {}) => ({ k: 'k', p, r, col, o });

// ---- timeline
// Give a list of items consecutive time slices inside [t0, t1]; `ease` bends the pace (>1 = starts slow).
export function seq(items, t0, t1, ease = 1) {
  const n = items.length;
  items.forEach((it, i) => { const a = Math.pow(i / n, ease), b = Math.pow((i + 1) / n, ease); it.t0 = lerp(t0, t1, a); it.t1 = lerp(t0, t1, b) - (t1 - t0) / n * 0.12; });
  return items;
}
export function at(items, t0, dt) { items.forEach(it => { it.t0 = t0; it.t1 = t0 + dt; }); return items; }

export class Scene {
  constructor() { this.items = []; this.last = null; }
  add(...lists) { for (const l of lists) this.items.push(...l); return this; }
  // Draw every stitch up to time t. The stitch in progress is pulled through from `a` to `b`; once finished it
  // tightens from a loose bow. Returns the head (where the needle is) or null.
  draw(ctx, t, o = {}) {
    let head = null, lastDone = null;
    for (const s of this.items) {
      if (t < s.t0) continue;
      const p = clamp((t - s.t0) / Math.max(1e-3, s.t1 - s.t0));
      if (s.k === 'k') {
        const sc = s.t1 > s.t0 ? clamp(spring(clamp((t - s.t0) / (s.t1 - s.t0 + 0.25)), 6, 0.5), 0, 1.15) : 1;
        if (sc > 0.02) knot(ctx, s.p, s.r, s.col, { ...s.o, scale: sc });
        if (p < 1) head = { p: s.p, col: s.col, w: 5 }; else lastDone = { p: s.p, col: s.col, w: 5 };
        continue;
      }
      const pull = clamp((t - s.t1) / 0.22), bow0 = s.bow0 ?? (s.bow0 = (((s.a.x * 13.7 + s.a.y * 7.3) % 7) / 7 - 0.5) * 0.22);
      const e = eo(p), b = P(lerp(s.a.x, s.b.x, e), lerp(s.a.y, s.b.y, e));
      const bow = (s.o.bow ?? bow0) * (1 - pull) * (p < 1 ? p : 1);
      thread(ctx, s.a, b, s.w, s.col, { ...s.o, bow });
      if (p < 1) head = { p: b, col: s.col, w: s.w }; else lastDone = { p: s.b, col: s.col, w: s.w };
    }
    this.head = head || lastDone;
    return head;
  }
  // The needle at the head, with its thread hanging off to `tail`
  drawNeedle(ctx, t, tail) {
    const h = this.head; if (!h) return;
    const tip = h.p, ang = -0.3 + Math.sin(t * 2.2) * 0.03, len = 200;
    const eye = needle(ctx, tip, ang, len, { w: 8.5 }), tw = Math.max(4.8, h.w * 0.8);
    // the working thread: from the eye, up and over, then an S-curve lying slack on the cloth, ending in a splayed tip
    const mid = P(lerp(eye.x, tail.x, 0.55) + 20, lerp(eye.y, tail.y, 0.55) - 10);
    loose(ctx, eye, P(eye.x + 60, eye.y - 10), P(mid.x - 50, mid.y - 40), mid, tw, h.col, { n: 30 });
    loose(ctx, mid, P(mid.x + 60, mid.y + 30), P(tail.x - 70, tail.y + 20), tail, tw, h.col, { n: 30 });
    for (let i = -1; i <= 1; i++) thread(ctx, tail, P(tail.x + i * 9 + 4, tail.y + 26 + i * i * 3), tw * 0.42, h.col, { gloss: 0.5, sink: false, ply: false, lift: 0.5 });
  }
}
