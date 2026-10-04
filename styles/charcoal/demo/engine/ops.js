// Timeline of hand operations on the sheet: strokes, smudges, erasures, charcoal lettering.
// Every operation is compiled once into time-stamped items on a fixed 48 Hz clock. advance(sheet, t) applies all
// items up to t in a fixed global order, so the sheet at t is a pure function of t. Frames in increasing order
// continue from the previous state; a frame earlier than the last one resets and replays.
import { vnoise, eio } from '/core/lib.js';
const ss = (a, b, x) => { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
import { W, H, Sheet } from './sheet.js';

export const SUB = 48;
const LAYER = { C: 'C', G: 'G', S: 'S' };

export function catmull(pts, per = 12) {
  if (pts.length < 3) return pts.slice();
  const out = [], P = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(pts[pts.length - 1]); return out;
}
// resample a polyline at an even step; returns [{x,y,s,tx,ty}] with s = arc length
export function resample(poly, step) {
  const cum = [0]; for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i].x - poly[i - 1].x, poly[i].y - poly[i - 1].y));
  const L = cum[cum.length - 1], n = Math.max(2, Math.ceil(L / step)), out = []; let k = 1;
  for (let i = 0; i <= n; i++) {
    const s = L * i / n; while (k < cum.length - 1 && cum[k] < s) k++;
    const a = poly[k - 1], b = poly[k], seg = cum[k] - cum[k - 1] || 1, u = (s - cum[k - 1]) / seg;
    const tx = b.x - a.x, ty = b.y - a.y, tl = Math.hypot(tx, ty) || 1;
    out.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, s, tx: tx / tl, ty: ty / tl });
  }
  out.L = L; return out;
}
const mkRidge = seed => { const r = new Float32Array(64); for (let i = 0; i < 64; i++) r[i] = 0.2 + 0.8 * Math.pow(vnoise(i * 0.55 + seed * 7.31), 0.8); return r; };

export class Timeline {
  constructor() { this.ops = []; this.items = []; this.ptr = 0; this.last = -1; this.sorted = false; }
  _push(op) { op.id = this.ops.length; this.ops.push(op); this.sorted = false; return op; }
  _item(op, time, it) { it.step = Math.round(time * SUB); it.seq = op.id * 1e6 + op.n++; this.items.push(it); op.samples.push([time, it.x ?? 0, it.y ?? 0, it.tx ?? 1, it.ty ?? 0]); }
  _op(kind, tool, o) { return this._push({ kind, tool, t0: o.t0, t1: o.t1, n: 0, samples: [], lift: o.lift ?? 0, layer: o.layer, r: o.r }); }

  // dry pigment stroke along pts. o: t0,t1,pts, layer 'C'|'G'|'S', r (px), p (pressure), g (grain gate), flow, ease, taper [in,out], wobble, seed, ridge, rEnd
  stroke(o) {
    const op = this._op('stroke', o.layer === 'G' ? 'graphite' : o.layer === 'S' ? 'sanguine' : 'stick', o);
    const r = o.r ?? 6, p = o.p ?? 0.9, seed = o.seed ?? 1, ridge = mkRidge(seed), tap = o.taper ?? [0.12, 0.2], wob = o.wobble ?? 1.2;
    const poly = resample(catmull(o.pts), Math.max(1, r * (o.spacing ?? 0.3))), L = poly.length;
    const ease = o.ease ?? eio;
    poly.forEach((q, i) => {
      const f = i / (L - 1), att = ss(0, tap[0], f), rel = 1 - ss(1 - tap[1], 1, f);
      const wv = (vnoise(q.s * 0.012 + seed * 17) - 0.5) * 2 * wob;
      const pr = p * 0.12 * (0.25 + 0.75 * att) * (0.3 + 0.7 * rel) * (0.75 + 0.5 * vnoise(q.s * 0.017 + seed * 5));
      const rr = (o.rEnd ? r + (o.rEnd - r) * f : r) * (1 - (o.wvar ?? 0.3) + 2 * (o.wvar ?? 0.3) * vnoise(q.s * 0.011 + seed * 3 + 40)) * (0.55 + 0.45 * Math.min(att, rel * 1.4 + 0.05));
      const t = o.t0 + (o.t1 - o.t0) * ease(f);
      this._item(op, t, { kind: 'dab', layer: LAYER[o.layer ?? 'C'], x: q.x - q.ty * wv, y: q.y + q.tx * wv, r: rr, p: pr, g: o.g ?? 0.8, flow: o.flow ?? 0.16, tx: q.tx, ty: q.ty, ridge, ra: o.ridge ?? 0.55 });
    });
    return op;
  }
  // thumb smudge along pts. o: r, len (drag length), k (strength 0..1), lift, layers
  smudge(o) {
    const op = this._op('smudge', 'thumb', o);
    const r = o.r ?? 40, poly = resample(catmull(o.pts), Math.max(2, r * 0.35)), L = poly.length, ease = o.ease ?? eio, kd = 1 - Math.pow(1 - Math.min(0.97, o.k ?? 0.5), 0.4);
    poly.forEach((q, i) => {
      const f = i / (L - 1), t = o.t0 + (o.t1 - o.t0) * ease(f);
      this._item(op, t, { kind: 'smudge', x: q.x, y: q.y, r, dx: q.tx, dy: q.ty, len: o.len ?? r * 0.9, k: kd, lift: o.lift ?? 0.04, layers: o.layers ?? 'CGS', tx: q.tx, ty: q.ty });
    });
    return op;
  }
  // kneaded-eraser path. o: r, k, hard
  erase(o) {
    const op = this._op('erase', 'eraser', o);
    const r = o.r ?? 30, poly = resample(catmull(o.pts), Math.max(2, r * 0.3)), L = poly.length, ease = o.ease ?? eio, kd = 1 - Math.pow(1 - Math.min(0.97, o.k ?? 0.8), 0.35);
    poly.forEach((q, i) => {
      const f = i / (L - 1), t = o.t0 + (o.t1 - o.t0) * ease(f);
      this._item(op, t, { kind: 'erase', x: q.x, y: q.y, r: (o.r ?? 30) * (o.round ? 1 : 0.35 + 0.65 * Math.pow(Math.sin(Math.PI * f), 0.6)) * (0.85 + 0.3 * vnoise(q.s * 0.02 + op.id * 3.1)), k: kd, hard: o.hard ?? 1, tx: q.tx, ty: q.ty });
    });
    return op;
  }
  // charcoal lettering: text rasterised to a mask and rubbed in left to right. o: text, font, x, y (baseline-left), align, layer, flow
  text(o) {
    const op = this._op('text', 'stick', o);
    const cv = document.createElement('canvas'), cx = cv.getContext('2d'); cx.font = o.font; const tw = cx.measureText(o.text);
    const size = parseFloat(/(\d+(\.\d+)?)px/.exec(o.font)[1]), pad = 24, bw = Math.ceil(tw.width) + pad * 2, bh = Math.ceil(size * 1.5) + pad * 2;
    cv.width = bw; cv.height = bh; cx.font = o.font; cx.fillStyle = '#fff'; cx.textBaseline = 'alphabetic'; cx.filter = 'blur(1.1px)'; cx.fillText(o.text, pad, pad + size * 1.05);
    const d = cx.getImageData(0, 0, bw, bh).data, m = new Float32Array(bw * bh); for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] / 255;
    const ox = (o.align === 'center' ? o.x - tw.width / 2 : o.x) - pad, oy = o.y - pad - size * 1.05, nChunk = Math.max(8, Math.round(bw / 14)), passes = o.passes ?? 3, ease = o.ease ?? eio;
    for (let ps = 0; ps < passes; ps++) for (let c = 0; c < nChunk; c++) {
      const f0 = c / nChunk, f1 = (c + 1) / nChunk, tt = o.t0 + (o.t1 - o.t0) * ((ps + ease(f0)) / passes);
      this._item(op, tt, { kind: 'mask', layer: LAYER[o.layer ?? 'C'], m, bw, bh, ox, oy, c0: Math.floor(bw * f0), c1: Math.floor(bw * f1), flow: o.flow ?? 0.34, g: o.g ?? 0.55, x: ox + bw * f1, y: oy + size * 0.8, tx: 1, ty: 0.3 });
    }
    return op;
  }

  // sound events for the mixer: one per hand operation, with its length and where on the sheet it happens
  events() {
    this._sort();
    return this.ops.filter(o => o.samples.length).map(o => {
      let L = 0; for (let i = 1; i < o.samples.length; i++) L += Math.hypot(o.samples[i][1] - o.samples[i - 1][1], o.samples[i][2] - o.samples[i - 1][2]);
      return { t: +o.t0.toFixed(3), d: +(o.t1 - o.t0).toFixed(3), type: o.kind, tool: o.tool, layer: o.layer || 'C', r: Math.round(o.r || 0), len: Math.round(L), x: +(o.samples[0][1] / W).toFixed(3) };
    });
  }
  _sort() { if (this.sorted) return; this.items.sort((a, b) => a.step - b.step || a.seq - b.seq); this.sorted = true; this.ptr = 0; this.last = -1; for (const op of this.ops) op.samples.sort((a, b) => a[0] - b[0]); }
  advance(sh, t) {
    this._sort();
    const target = Math.floor(t * SUB + 1e-6);
    if (target < this.last) { sh.reset(); this.ptr = 0; }
    this.last = target;
    const items = this.items;
    while (this.ptr < items.length && items[this.ptr].step <= target) { this._apply(sh, items[this.ptr]); this.ptr++; }
  }
  _apply(sh, it) {
    switch (it.kind) {
      case 'dab': sh.dab(sh[it.layer], it.x, it.y, it.r, it.p, it.g, it.flow, it.tx, it.ty, it.ridge, it.ra); break;
      case 'smudge': sh.smudge(it.x, it.y, it.r, it.dx, it.dy, it.len, it.k, it.lift, it.layers); break;
      case 'erase': sh.erase(it.x, it.y, it.r, it.k, it.hard); break;
      case 'mask': {
        const L = sh[it.layer], tooth = sh.tooth, M = sh.M;
        for (let c = it.c0; c < it.c1; c++) for (let rw = 0; rw < it.bh; rw++) {
          const a = it.m[rw * it.bw + c]; if (a < 0.02) continue;
          const x = Math.round(it.ox + c), y = Math.round(it.oy + rw); if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const i = y * W + x, hit = ss(0, 0.5, a * 1.3 + (tooth[i] - 0.5) * it.g * (1 - 0.5 * M[i]));
          L[i] += (1 - L[i]) * hit * it.flow * a;
        }
        sh.touch(it.ox + it.c0, it.oy, it.ox + it.c1 + 1, it.oy + it.bh); break;
      }
    }
  }
  // where is the tool at time t (for the overlay)? { tool, x, y, tx, ty, vis, lift }
  toolAt(t) {
    this._sort();
    let cur = null, prev = null, next = null;
    for (const op of this.ops) {
      if (!op.samples.length) continue;
      if (t >= op.t0 - 0.02 && t <= op.t1 + 0.28) { if (!cur || op.t0 > cur.t0) cur = op; }
      else if (op.t1 + 0.28 < t) { if (!prev || op.t1 > prev.t1) prev = op; }
      else if (op.t0 - 0.02 > t) { if (!next || op.t0 < next.t0) next = op; }
    }
    const pos = (op, tt) => {
      const s = op.samples; let lo = 0, hi = s.length - 1;
      if (tt <= s[0][0]) return s[0]; if (tt >= s[hi][0]) return s[hi];
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (s[mid][0] <= tt) lo = mid; else hi = mid; }
      return s[lo];
    };
    if (cur) {
      const p = pos(cur, t), after = Math.max(0, t - cur.t1);
      return { tool: cur.tool, x: p[1], y: p[2], tx: p[3], ty: p[4], vis: 1, lift: Math.max(cur.lift, ss(0, 0.28, after) * 1) };
    }
    if (prev && next && next.t0 - prev.t1 < 1.4) {
      const a = pos(prev, prev.t1), b = pos(next, next.t0), u = eio((t - (prev.t1 + 0.28)) / Math.max(0.1, next.t0 - 0.02 - (prev.t1 + 0.28)));
      return { tool: u < 0.5 ? prev.tool : next.tool, x: a[1] + (b[1] - a[1]) * u, y: a[2] + (b[2] - a[2]) * u, tx: b[3], ty: b[4], vis: 1, lift: 1 };
    }
    return null;
  }
}
export { Sheet };
