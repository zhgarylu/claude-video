// printer.js: one drawing function is run once per printing pass (key, then each colour block).
// A shape is declared once, in painter's order, with the colour block it belongs to. In the key pass
// it knocks out the lines behind it and gets its outline; in its own colour pass it is filled;
// in every other pass it knocks out what is behind it (a cut block leaves a gap there).
import { hash } from '/core/lib.js';
import { COL, EDGE, mk, TEX, tileFill } from './core.js';

export const PASSES = ['key', 'peach', 'yellow', 'green', 'indigo', 'red'];
export const KW = 7;

export class Printer {
  constructor(c, pass, seed = 1) { this.c = c; this.pass = pass; this.seed = seed; this.amp = 1.4; this.mirror = false; }
  j(x, y, k = 0) { return [(hash(x * 12.9898 + y * 78.233 + k * 3.1 + this.seed) - .5) * this.amp * 2, (hash(x * 39.346 + y * 11.135 + k * 5.7 + this.seed) - .5) * this.amp * 2]; }
  // closed or open smooth curve through points (Catmull-Rom), vertices jittered like a hand-cut edge
  curve(pts, closed = true, jit = true) {
    const c = this.c, p = pts.map(([x, y], i) => { if (!jit) return [x, y]; const [a, b] = this.j(x, y, i); return [x + a, y + b]; }), n = p.length;
    const at = i => closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))];
    c.moveTo(p[0][0], p[0][1]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    if (closed) c.closePath();
  }
  poly(pts, closed = true) {
    const c = this.c; pts.forEach(([x, y], i) => { const [a, b] = this.j(x, y, i); i ? c.lineTo(x + a, y + b) : c.moveTo(x + a, y + b); }); if (closed) c.closePath();
  }
  ell(cx, cy, rx, ry, rot = 0, n = 20, a0 = 0, a1 = Math.PI * 2) {
    const pts = [], cs = Math.cos(rot), sn = Math.sin(rot), full = a1 - a0 > 6.2;
    const m = full ? n : n + 1;
    for (let i = 0; i < m; i++) { const a = a0 + (a1 - a0) * i / (full ? n : n); const x = Math.cos(a) * rx, y = Math.sin(a) * ry; pts.push([cx + x * cs - y * sn, cy + x * sn + y * cs]); }
    this.curve(pts, full);
  }
  // tapered capsule between two points
  cap(x0, y0, x1, y1, r0, r1) {
    const a = Math.atan2(y1 - y0, x1 - x0), pts = [], n = 6;
    for (let i = 0; i <= n; i++) { const t = a - Math.PI / 2 + Math.PI * i / n; pts.push([x1 + Math.cos(t) * r1, y1 + Math.sin(t) * r1]); }
    for (let i = 0; i <= n; i++) { const t = a + Math.PI / 2 + Math.PI * i / n; pts.push([x0 + Math.cos(t) * r0, y0 + Math.sin(t) * r0]); }
    this.curve(pts, true);
  }
  // declare a coloured shape. o: line (outline in key pass, default true), over (overprint, do not knock out other passes), w, rule
  fill(col, build, o = {}) {
    const c = this.c, pass = this.pass, rule = o.rule || 'nonzero';
    const path = () => { c.beginPath(); build(c, this); };
    if (pass === 'key') {
      if (o.occlude !== false) { c.save(); c.globalCompositeOperation = 'destination-out'; path(); c.fill(rule); c.restore(); }
      path();
      if (col === 'ink') { c.fillStyle = COL.ink; c.fill(rule); if (o.line) { c.lineWidth = o.w || KW; c.strokeStyle = COL.ink; c.stroke(); } }
      else if (o.line !== false) { c.lineWidth = o.w || KW; c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = COL.ink; c.stroke(); }
      return;
    }
    if (col === pass) {
      path(); c.fillStyle = COL[col]; c.fill(rule);
      c.save(); c.clip(rule); c.lineWidth = o.edge || 9; c.strokeStyle = EDGE[col]; c.globalAlpha = .4; c.stroke(); c.restore();
    } else if (!o.over && col !== 'ink' && o.occlude !== false) {
      c.save(); c.globalCompositeOperation = 'destination-out'; path(); c.fill(rule); c.restore();
    } else if (col === 'ink' && o.occlude !== false && !o.over) {
      c.save(); c.globalCompositeOperation = 'destination-out'; path(); c.fill(rule); c.restore();
    }
  }
  // a key-only line (details), drawn on top of whatever is already there
  line(build, w = 5) {
    if (this.pass !== 'key') return;
    const c = this.c; c.beginPath(); build(c, this); c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = COL.ink; c.stroke();
  }
  // key-only solid ink dot / shape
  ink(build) { if (this.pass !== 'key') return; const c = this.c; c.beginPath(); build(c, this); c.fillStyle = COL.ink; c.fill(); }
}

// run one pass of an art function into a transparent canvas of size (w*S, h*S), then roughen it like inked wood
export function bakeLayer(art, pass, w, h, S, idx = 0) {
  const cv = mk(w * S, h * S), c = cv.getContext('2d');
  c.save(); c.scale(S, S); art(new Printer(c, pass, 3 + idx)); c.restore();
  c.globalCompositeOperation = 'destination-out';
  const k = pass === 'key' ? .55 : 1;
  c.globalAlpha = k; tileFill(c, TEX.grain[idx % 3], 0, 0, cv.width, cv.height, (idx * 173) % 512, (idx * 97) % 512);
  c.globalAlpha = k; tileFill(c, TEX.blotch, 0, 0, cv.width, cv.height, (idx * 61 + 100) % 512, (idx * 211) % 512);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  return cv;
}
