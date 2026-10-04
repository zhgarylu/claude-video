// sunflower.js: a composite flower head seen face-on. Controllable anatomy: florets (n), angle between
// successive florets (default the golden angle), ray-petal count and length, head tilt.
import { Noise, clamp, lerp, TAU, mulberry, catmull, bboxOf, xf } from './util.js';
import { part } from './wash.js';
import { stroke, dot, InkSet, maskFn, stipple } from './ink.js';

export const SUNFLOWER_DEFAULT = { R: 100, n: 540, angle: 137.5077640500378, rays: 26, rayLen: .62, tilt: -.25, squash: .93, seed: 6 };

export function sunflowerHead(c, opt = {}) {
  const o = { ...SUNFLOWER_DEFAULT, ...opt }, R = o.R, rnd = mulberry(o.seed), nz = Noise(o.seed + 1), ga = o.angle * Math.PI / 180;
  const T = pts => xf(pts, { x: c.x, y: c.y, r: o.tilt, sx: 1, sy: o.squash });
  const flor = [], ink = new InkSet(), parts = [];
  for (let i = 1; i <= o.n; i++) {
    const r = R * Math.sqrt(i / o.n) * .98, a = i * ga, cx = Math.cos(a) * r, cy = Math.sin(a) * r, sz = R * .03 * (.55 + .6 * Math.sqrt(i / o.n));
    const dir = a + Math.PI / 2;
    const d = [[1.15, 0], [0, .78], [-1.15, 0], [0, -.78]].map(([u, v]) => ({ x: cx + (Math.cos(a) * u - Math.sin(a) * v) * sz, y: cy + (Math.sin(a) * u + Math.cos(a) * v) * sz }));
    flor.push({ d, i, cx, cy, sz, a });
  }
  // ray petals, behind the disc
  const petals = [];
  for (let k = 0; k < o.rays; k++) {
    const a = k / o.rays * TAU + (rnd() - .5) * .08, len = R * (1 + o.rayLen * (.82 + .3 * rnd())), wd = R * .15 * (.85 + .3 * rnd()), bend = (rnd() - .5) * .25;
    const pts = [], M = 10;
    for (let s = 0; s <= M; s++) { const t = s / M, rr = lerp(R * .86, len, t), w = wd * Math.pow(Math.sin(Math.PI * (.12 + .88 * t)), .6) * (1 - t * .15); const aa = a + bend * t * t; pts.push({ x: Math.cos(aa) * rr - Math.sin(aa) * w, y: Math.sin(aa) * rr + Math.cos(aa) * w }); }
    for (let s = M; s >= 0; s--) { const t = s / M, rr = lerp(R * .86, len, t), w = wd * Math.pow(Math.sin(Math.PI * (.12 + .88 * t)), .6) * (1 - t * .15); const aa = a + bend * t * t; pts.push({ x: Math.cos(aa) * rr + Math.sin(aa) * w, y: Math.sin(aa) * rr - Math.cos(aa) * w }); }
    petals.push({ pts: T(pts), a, len, wd });
  }
  const light = (x, y) => { const dx = x - c.x, dy = y - c.y; return clamp(.5 + (dx * .52 + dy * .58) / (R * 1.9)); };
  parts.push(part({ id: 'petals', polys: petals.map(p => p.pts), lo: '#f7d443', hi: '#c26a08', k: .98, tone: (x, y) => .2 + .6 * light(x, y) + (nz(x * .04, y * .04) - .5) * .4, edge: 3, edgeK: .4, gran: .55, seed: 91, dx: 1.2, dy: .9 }));
  const discPoly = T(Array.from({ length: 72 }, (_, i) => ({ x: Math.cos(i / 72 * TAU) * R * 1.01, y: Math.sin(i / 72 * TAU) * R * 1.01 })));
  parts.push(part({ id: 'disc', polys: [discPoly], lo: '#b08a52', hi: '#33200f', k: .88, tone: (x, y) => clamp(.25 + .6 * light(x, y) + .25 * Math.max(0, 1 - Math.hypot(x - c.x, y - c.y) / (R * .3))), edge: 4, edgeK: .35, seed: 92, spill: .6, bloom: 0, drift: .35 }));
  // a ring of the outer florets in a warm brown-gold, laid over the disc
  const ringF = flor.filter(f => f.i > o.n * .86).map(f => T(f.d));
  parts.push(part({ id: 'ring', polys: ringF, lo: '#e2b251', hi: '#8a5a14', k: .6, tone: (x, y) => .3 + .4 * light(x, y), edge: 1, edgeK: .2, gran: .3, seed: 93, spill: .2, dx: .3, dy: .2 }));
  // ink: petal outlines + midrib, florets
  for (const p of petals) {
    const n = p.pts.length / 2 | 0, L = p.pts.slice(0, n), Rr = p.pts.slice(n).reverse();
    ink.add(stroke(catmull(L, false, 2), { w: 1.5, nib: .55, taper: .2 })); ink.add(stroke(catmull(Rr, false, 2), { w: 1.5, nib: .55, taper: .2 }));
    const mid = L.map((q, i) => ({ x: (q.x + Rr[i].x) / 2, y: (q.y + Rr[i].y) / 2 }));
    ink.add(stroke(mid, { w: .5, nib: .2, taper: .4, a: .6 }));
    for (let v = 1; v < 4; v++) { const t = v / 4, q = Math.floor(t * (L.length - 1)); ink.add(stroke([mid[q], L[Math.min(L.length - 1, q + 1)]], { w: .4, nib: 0, taper: .5, a: .45 })); }
  }
  ink.add(stroke(catmull(discPoly.concat([discPoly[0]]), false, 2), { w: 1.8, nib: .4, taper: .02 }));
  for (const f of flor) { const d = T(f.d); ink.add(stroke(d.concat([d[0]]), { w: .55 + .35 * (f.i / o.n), nib: 0, taper: .2, a: .75 })); }
  const bb = bboxOf([discPoly].concat(petals.map(p => p.pts))), inside = maskFn([discPoly], [], bb);
  const dots = stipple(inside, bb, (x, y) => (1 - light(x, y)) * 1.0 + .1, { sp: 3.0, min: .58, seed: 12, rmin: .4, rmax: .9 });
  dots.sort((p, q) => (p.x + p.y) - (q.x + q.y)); ink.addAll(dots);
  return { parts, ink, bb, poly: discPoly, anchors: { pin: { x: c.x + R * .02, y: c.y }, label: { x: c.x, y: bb.y1 }, rim: { x: c.x + R * 1.1, y: c.y - R * .9 } } };
}
