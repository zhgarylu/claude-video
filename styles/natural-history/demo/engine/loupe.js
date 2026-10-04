// loupe.js: the magnification roundel. A ring is scribed round a detail on the figure, a leader runs to a
// margin roundel, and the detail is drawn again there, large, inside a double-ruled circle.
// loupeSiphuncle() is one example of content: two septa and the siphuncle tube passing through both.
import { clamp, lerp, TAU, mulberry, Noise, catmull, ss } from './util.js';
import { part } from './wash.js';
import { stroke, InkSet, maskFn, stipple } from './ink.js';

const circ = (c, r, n = 80, a0 = 0, a1 = TAU) => Array.from({ length: n + 1 }, (_, i) => { const t = a0 + (a1 - a0) * i / n; return { x: c.x + Math.cos(t) * r, y: c.y + Math.sin(t) * r }; });

// split a polyline into runs that stay inside the circle
function clipRuns(pts, c, r) {
  const runs = []; let cur = [];
  for (const p of pts) { if (Math.hypot(p.x - c.x, p.y - c.y) <= r) cur.push(p); else { if (cur.length > 1) runs.push(cur); cur = []; } }
  if (cur.length > 1) runs.push(cur); return runs;
}

export function loupeSiphuncle(c, R = 62, seed = 8) {
  const rnd = mulberry(seed), nz = Noise(seed), parts = [], ink = new InkSet();
  const ring = circ(c, R - 2, 90), disc = circ(c, R - 2, 90);
  const X = (dx, dy) => ({ x: c.x + dx, y: c.y + dy });
  const septum = (x0) => { const p = []; for (let k = 0; k <= 40; k++) { const y = lerp(-R, R, k / 40); p.push(X(x0 + 13 * Math.pow(y / R, 2) - 6 * Math.pow(y / R, 4), y)); } return p; };
  const S1 = septum(-24), S2 = septum(26), th = 6.5;
  const band = s => s.concat(s.slice().reverse().map(p => ({ x: p.x + th, y: p.y })));
  const tube = [X(-R, -9), X(R, -9), X(R, 9), X(-R, 9)];
  // chambers: left, middle, right (clipped to the circle by 'clip')
  const left = [X(-R, -R)].concat(S1, [X(-R, R)]), mid = S1.map(p => ({ x: p.x + th, y: p.y })).concat(S2.slice().reverse()), right = S2.map(p => ({ x: p.x + th, y: p.y })).concat([X(R, R), X(R, -R)]).slice();
  const base = { clip: [disc], edge: 3, edgeK: .4, gran: .8, bloom: .1, drift: .4 };
  parts.push(part({ ...base, id: 'cl', polys: [left], lo: '#f2dcd4', hi: '#b48f86', k: .5, tone: (x, y) => clamp(.2 + .6 * ss(-R, 0, x - c.x + 24 + 0) * 0 + .55 * (1 - Math.abs(x - c.x + 40) / 60)), seed: 81 }));
  parts.push(part({ ...base, id: 'cm', polys: [mid], lo: '#dfe6e4', hi: '#8c9fa6', k: .5, tone: (x, y) => clamp(.25 + .5 * Math.abs((x - c.x) / 30)), seed: 82 }));
  parts.push(part({ ...base, id: 'cr', polys: [right], lo: '#f3e8cf', hi: '#ae9768', k: .5, tone: (x, y) => clamp(.7 - .5 * Math.abs((x - c.x - 60) / 50)), seed: 83 }));
  parts.push(part({ ...base, id: 'walls', polys: [band(S1), band(S2)], lo: '#e8cfa4', hi: '#8a4a22', k: .75, tone: (x, y) => .4 + .4 * nz(x * .08, y * .08), edge: 1.6, seed: 84, spill: .5 }));
  parts.push(part({ ...base, id: 'tube', polys: [tube], lo: '#e5a870', hi: '#8a4520', k: .85, tone: (x, y) => clamp(.25 + .5 * (y - c.y + 9) / 18), edge: 1.8, edgeK: .5, seed: 85, spill: .4 }));
  // ink: ring, septa, tube walls, collars, nacre layers, stipple
  for (const rr of [R, R - 4.5]) ink.add(stroke(circ(c, rr, 100), { w: rr === R ? 1.9 : .7, nib: .35, taper: 0, head: .01 }));
  for (const S of [S1, S2]) {
    for (const run of clipRuns(S, c, R - 3)) ink.add(stroke(catmull(run, false, 3), { w: 1.7, nib: .5, taper: .2 }));
    const S_ = S.map(p => ({ x: p.x + th, y: p.y }));
    for (const run of clipRuns(S_, c, R - 3)) ink.add(stroke(catmull(run, false, 3), { w: 1.3, nib: .5, taper: .2 }));
    const mid_ = S.map(p => ({ x: p.x + th * .5, y: p.y }));
    for (const run of clipRuns(mid_, c, R - 3)) ink.add(stroke(catmull(run, false, 3), { w: .4, nib: .1, taper: .3, a: .5 }));
  }
  for (const y of [-9, 9]) ink.add(stroke([X(-R + 3, y), X(R - 3, y)].map((p, i, a) => i ? p : p), { w: 1.4, nib: .3, taper: .1 }));
  ink.add(stroke([X(-R + 3, 0), X(R - 3, 0)], { w: .4, nib: 0, taper: .3, a: .5 }));
  // septal necks: the collar the wall turns into round the tube
  for (const S of [S1, S2]) for (const sgn of [-1, 1]) { const x = S[20].x; ink.add(stroke(catmull([X(x - 1, sgn * 9), X(x + 8, sgn * 12), X(x + 14, sgn * 9)], false, 6), { w: 1.1, nib: .3, taper: .3 })); }
  // layered shell (nacre) lines parallel to each septum
  for (const S of [S1, S2]) for (const f of [-5, -9]) for (const run of clipRuns(S.map(p => ({ x: p.x + f, y: p.y })), c, R - 3)) ink.add(stroke(catmull(run, false, 3), { w: .4, nib: .1, taper: .3, a: .4 }));
  const bb = { x0: c.x - R, y0: c.y - R, x1: c.x + R, y1: c.y + R }, inside = maskFn([disc], [], bb);
  const near = (x, y) => { let b = 0; for (const S of [S1, S2]) for (let k = 0; k < S.length; k += 2) { const d = Math.hypot(x - S[k].x - 3, y - S[k].y); if (d < 20) b = Math.max(b, 1 - d / 20); } return b; };
  const dots = stipple(inside, bb, (x, y) => near(x, y) * .95, { sp: 3.0, min: .15, seed: 14, rmin: .4, rmax: .9 });
  dots.sort((p, q) => p.x - q.x); ink.addAll(dots);
  return { parts, ink, bb, poly: disc, anchors: { label: { x: c.x, y: c.y + R + 26 }, ring: ring }, seed };
}
