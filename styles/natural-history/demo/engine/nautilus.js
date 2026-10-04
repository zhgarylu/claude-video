// nautilus.js: a chambered shell with controllable anatomy: growth per whorl G, number of chambers,
// living-chamber length, wall thickness, stripe count. Two views from one spiral: the exterior, and the shell halved.
import { Noise, clamp, lerp, TAU, mulberry, catmull, resample, ss, bboxOf, polyLen } from './util.js';
import { part } from './wash.js';
import { stroke, dot, InkSet, maskFn, stipple } from './ink.js';

const NZ9 = Noise(9), NZ3 = Noise(3);
const LIGHT = { x: -.52, y: -.58, z: .62 };   // one light for the film: upper left
const norm = v => { const l = Math.hypot(v.x, v.y, v.z); return { x: v.x / l, y: v.y / l, z: v.z / l }; };
const Ln = norm(LIGHT);

// screen point from polar (math angle a, CCW) about c
const at = (c, r, a) => ({ x: c.x + r * Math.cos(a), y: c.y - r * Math.sin(a) });

export const NAUTILUS_DEFAULT = { R: 250, G: 3.0, aperture: -.26, chambers: 40, living: 1.7, turns: 2.7, wall: .026, stripes: 58, seed: 5 };

function spiralPts(c, o, th0, th1, f = r => r, n = 160) {
  const { R, G } = o, b = Math.log(G) / TAU, a0 = o.aperture, te = th1;
  const out = [];
  for (let i = 0; i <= n; i++) { const th = lerp(th0, th1, i / n); out.push(at(c, f(R * Math.exp(b * (th - te)), th), a0 + (th - te))); }
  return out;
}

export function nautilusExterior(c, opt = {}) {
  const o = { ...NAUTILUS_DEFAULT, ...opt }, { R, G } = o, b = Math.log(G) / TAU, rnd = mulberry(o.seed);
  const te = 0, a_e = o.aperture;
  // silhouette: one full whorl, then the aperture lip back down to the earlier whorl
  const sil = spiralPts(c, o, te - TAU, te, r => r, 240);
  const lipA = at(c, R, a_e), lipB = at(c, R / G * 1.0, a_e);
  const nrm = { x: Math.cos(a_e + Math.PI / 2), y: -Math.sin(a_e + Math.PI / 2) };
  const lip = [];
  for (let i = 1; i <= 16; i++) { const t = i / 16, bulge = Math.sin(Math.PI * Math.pow(t, .8)) * R * .15 * (1 - .3 * t); lip.push({ x: lerp(lipA.x, lipB.x, t) + nrm.x * bulge, y: lerp(lipA.y, lipB.y, t) + nrm.y * bulge }); }
  let poly = sil.concat(lip);
  const bb0 = bboxOf([poly]), sh = { x: c.x - (bb0.x0 + bb0.x1) / 2, y: c.y - (bb0.y0 + bb0.y1) / 2 };
  const C = { x: c.x + sh.x, y: c.y + sh.y };
  poly = poly.map(p => ({ x: p.x + sh.x, y: p.y + sh.y }));
  const rr = d => R * Math.exp(b * (d - TAU));           // silhouette radius at CCW distance d from the lip
  const dOf = a => { let d = (a - a_e) % TAU; if (d < 0) d += TAU; return d; };
  const aOf = (x, y) => Math.atan2(-(y - C.y), x - C.x);
  // tone field 0 (lit) .. 1 (shadow): a flattened dome, with occlusion beside the lip
  const tone = (x, y) => {
    const dx = x - C.x, dy = y - C.y, rho = Math.hypot(dx, dy), a = aOf(x, y), d = dOf(a), R0 = rr(d), u = clamp(rho / R0, 0, 1.05);
    const h = Math.pow(Math.max(.02, 1 - Math.pow(u, 2.2)), .62), g = .9 * Math.pow(u, 1.2);
    const n = norm({ x: dx / (rho || 1) * g, y: dy / (rho || 1) * g, z: h });
    let t = clamp(1 - (n.x * Ln.x + n.y * Ln.y + n.z * Ln.z) * 1.15 + .12);
    if (d < .5 && rho < R / G * 1.02) t += .5 * (1 - d / .5) * ss(0, .6, rho / (R / G)) * .8;
    return clamp(t);
  };
  const parts = [], ink = new InkSet();
  // 1. porcelain ground: cool grey-cream, dome-graded
  parts.push(part({ id: 'shell', polys: [poly], lo: '#efe4cc', hi: '#6f6a66', k: .44, tone: (x, y) => tone(x, y) * .95, edge: 5.5, edgeK: .34, gran: .5, seed: 2 }));
  // 2. flame stripes: tapered strokes sweeping in from the rim
  const stripes = [], N = o.stripes;
  for (let i = 0; i < N; i++) {
    const d0 = (i + .5 + (rnd() - .5) * .5) / N * (TAU - .25) + .15, up = .5 + .5 * Math.sin(a_e + d0 - .1);
    if (rnd() > .35 + .75 * up) continue;
    const len = .42 + rnd() * .5, wAng = (TAU / N) * (.22 + .24 * rnd()) * (.6 + .6 * up);
    const L = [], Rr = [];
    for (let k = 0; k <= 16; k++) {
      const t = k / 16, rho = lerp(.97, .97 - len, t) , sweep = -1.05 * Math.pow(1 - rho, 1.35) * (1 - .15 * rnd());
      const wob = Math.sin(t * 7 + i) * .012;
      const wd = wAng * Math.pow(Math.sin(Math.PI * Math.min(1, .15 + t * .9)) , .55) * (1 - t * .55) * (.6 + .5 * Math.sin(t * 5 + i * 2) * .3 + .4);
      const dd = d0 + sweep + wob;
      L.push(at(C, rho * rr(dd - wd), a_e + dd - wd)); Rr.push(at(C, rho * rr(dd + wd), a_e + dd + wd));
    }
    stripes.push(L.concat(Rr.reverse()));
  }
  parts.push(part({ id: 'stripes', polys: stripes, lo: '#d2985c', hi: '#7f3b17', k: .86, tone: (x, y) => .25 + tone(x, y) * .8 + (NZ9(x * .02, y * .02) - .5) * .5, edge: 2.6, edgeK: .5, gran: .7, spill: .8, seed: 4, dx: .9, dy: .6 }));
  // 3. the umbilical callus: a warm pearly knob
  const cal = []; for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; cal.push({ x: C.x + 4 + Math.cos(a) * R * .085 * (1 + .1 * Math.sin(a * 3)), y: C.y + 2 + Math.sin(a) * R * .068 }); }
  parts.push(part({ id: 'callus', polys: [cal], lo: '#e6b98a', hi: '#8e4a22', k: .6, tone: (x, y) => .3 + .6 * clamp(((x - C.x + 4) * .6 + (y - C.y) * .8) / (R * .1) * .5 + .4), edge: 2.2, seed: 5 }));
  // ink ---------------------------------------------------------------
  const sil2 = poly.slice(0, sil.length);
  const runs = [[0, .38], [.33, .72], [.68, 1.0]];
  for (const [a, z] of runs) { const sl = sil2.slice(Math.floor(a * (sil2.length - 1)), Math.ceil(z * (sil2.length - 1)) + 1); ink.add(stroke(catmull(resample(sl, 7)), { w: 2.9, nib: .55, taper: .12 })); }
  const lipPts = [sil2[sil2.length - 1]].concat(poly.slice(sil.length)); ink.add(stroke(catmull(lipPts, false, 3), { w: 3.4, nib: .3, taper: .08 }));
  { const l2 = lipPts.map((p, i) => ({ x: p.x - nrm.x * 9 + Math.cos(i) * .3, y: p.y - nrm.y * 9 })); ink.add(stroke(catmull(l2.slice(2), false, 3), { w: 1.2, nib: .3, taper: .3 })); }
  // inner contour on the shadow side
  { const inner = []; for (let i = 0; i < sil2.length; i++) { const p = sil2[i], n2 = (() => { const q = sil2[Math.min(sil2.length - 1, i + 1)], pp = sil2[Math.max(0, i - 1)]; const tx = q.x - pp.x, ty = q.y - pp.y, l = Math.hypot(tx, ty) || 1; return { x: ty / l, y: -tx / l }; })(); const lit = n2.x * Ln.x + n2.y * Ln.y; inner.push({ x: p.x - n2.x * 6.5, y: p.y - n2.y * 6.5, lit }); }
    let cur = []; for (const q of inner) { if (q.lit < -.1) cur.push(q); else { if (cur.length > 8) ink.add(stroke(catmull(resample(cur, 6)), { w: 1.15, nib: .5, taper: .35, a: .8 })); cur = []; } } if (cur.length > 8) ink.add(stroke(catmull(resample(cur, 6)), { w: 1.15, nib: .5, taper: .35, a: .8 })); }
  // growth lines: hairlines sweeping from the callus to the rim
  for (let i = 0; i < 120; i++) {
    const d0 = (i + rnd() * .6) / 120 * (TAU - .2) + .1, len = .25 + rnd() * .65, pts = [];
    for (let k = 0; k <= 14; k++) { const t = k / 14, rho = lerp(.98, .98 - len, t), dd = d0 - 1.05 * Math.pow(1 - rho, 1.35); pts.push(at(C, rho * rr(dd), a_e + dd)); }
    ink.add(stroke(catmull(pts, false, 3), { w: .5 + rnd() * .3, nib: .3, taper: .6, a: .5 + rnd() * .2 }));
  }
  ink.add(stroke(catmull(cal.concat([cal[0]]), false, 2), { w: 1.4, nib: .4, taper: .1 }));
  // stipple the shadow side
  const bb = bboxOf([poly]), inside = maskFn([poly], [], bb);
  const dots = stipple(inside, bb, (x, y) => tone(x, y) * 1.05, { sp: 3.4, min: .5, seed: 7 });
  dots.sort((p, q) => (p.x * .6 + p.y) - (q.x * .6 + q.y));
  ink.addAll(dots);
  return { parts, ink, bb, tone, poly, C, rr, anchors: { pin: { x: C.x - R * .1, y: C.y - R * .35 }, label: { x: C.x, y: bb.y1 }, lip: at(C, R * .72, a_e) }, light: Ln };
}

// ---------------------------------------------------------------------------------------------
export function nautilusSection(c, opt = {}) {
  const o = { ...NAUTILUS_DEFAULT, ...opt }, { R, G } = o, b = Math.log(G) / TAU, rnd = mulberry(o.seed + 40);
  const a_e = o.aperture, th1 = 0, th0 = -o.turns * TAU;
  const r = th => R * Math.exp(b * (th - th1)), pt = (rad, th) => at(c, rad, a_e + th - th1);
  const wall = th => o.wall * r(th) + .7;
  const inner = th => { const k = (th - th0) / TAU; return k >= 1 ? r(th - TAU) : r(th - TAU) * Math.pow(Math.max(0, k), .9) * (k < 1 ? 1 : 1); };
  // wall: ring from outer surface inward by wall(th)
  const wallOut = [], wallIn = [];
  const N = 420;
  for (let i = 0; i <= N; i++) { const th = lerp(th0, th1, i / N); wallOut.push(pt(r(th), th)); wallIn.push(pt(r(th) - wall(th), th)); }
  const wallPoly = wallOut.concat(wallIn.slice().reverse());
  // septa
  const nS = o.chambers, thS0 = th0 + .5, thS1 = th1 - o.living;
  const ths = []; for (let i = 0; i <= nS; i++) { const u = i / nS; ths.push(lerp(thS0, thS1, Math.pow(u, .88))); }
  const septum = th => {
    const rin = inner(th) + (th - th0 > TAU ? wall(th - TAU) * 0 : 0), rout = r(th) - wall(th);
    const pts = [];
    for (let k = 0; k <= 12; k++) { const t = k / 12, rad = lerp(rout, rin, t), sweep = Math.sin(Math.PI * t) * -.27 * (1 + .1 * Math.sin(th * 3)); pts.push(pt(rad, th + sweep + (1 - t) * -.02 - t * .12 * 0)); }
    return pts;
  };
  const sep = ths.map(septum);
  // chambers: polygon between consecutive septa
  const chamber = (ia, ib) => {
    const ta = ths[ia], tb = ths[ib], A = sep[ia], Bq = sep[ib];
    const outerEdge = [], innerEdge = [];
    const M = 14; for (let k = 0; k <= M; k++) { const th = lerp(ta, tb, k / M); outerEdge.push(pt(r(th) - wall(th), th)); innerEdge.push(pt(inner(th), th)); }
    // outer edge from A(top) to B(top); then down septum B to its inner end; back along inner edge; up septum A
    return outerEdge.concat(Bq.slice().reverse().slice(1)).concat(innerEdge.slice().reverse()).concat(A.slice(1, -1));
  };
  const parts = [], ink = new InkSet();
  // cut wall: porcelain with the orange outer skin
  parts.push(part({ id: 'wall', polys: [wallPoly], lo: '#e8cfa4', hi: '#8a4a22', k: .62, tone: (x, y) => .35 + (NZ3(x * .03, y * .03)) * .35, edge: 2.6, edgeK: .55, gran: .6, seed: 8, dx: .8, dy: .6 }));
  const pearls = [['#f2dfd6', '#b58f86'], ['#e0e6e4', '#8fa1a6'], ['#f3e8cf', '#ae9768'], ['#ebdde0', '#a88e98']];
  const chambersPolys = [];
  for (let i = 0; i < nS; i++) {
    const poly = chamber(i, i + 1); chambersPolys.push(poly);
    const [lo, hi] = pearls[(i * 7 + (i >> 2)) % pearls.length], A = sep[i], Bq = sep[i + 1];
    const mid = { x: (A[6].x + Bq[6].x) / 2, y: (A[6].y + Bq[6].y) / 2 };
    const cB = bboxOf([poly]), cm = { x: (cB.x0 + cB.x1) / 2, y: (cB.y0 + cB.y1) / 2 };
    parts.push(part({
      id: 'ch' + i, polys: [poly], lo, hi, k: .42, edge: 3.2, edgeK: .45, gran: .75, bloom: .3, drift: .5, seed: 20 + i, dx: .6, dy: .4,
      // darker at the concave (septal) side, lighter toward the open end of the chamber
      tone: (x, y) => { const d = Math.hypot(x - A[6].x, y - A[6].y), D = Math.hypot(Bq[6].x - A[6].x, Bq[6].y - A[6].y) + 1; return clamp(.75 - .55 * ss(0, 1, d / D * 1.1) + (y - cm.y) * .003); }
    }));
  }
  // living chamber: pale, open at the aperture
  const living_lines = [];
  const liv = []; { const ta = thS1, tb = th1; for (let k = 0; k <= 60; k++) { const th = lerp(ta, tb, k / 60); liv.push(pt(r(th) - wall(th), th)); }
    const last = sep[sep.length - 1]; const innerLiv = []; for (let k = 60; k >= 0; k--) { const th = lerp(ta, tb, k / 60); innerLiv.push(pt(inner(th), th)); }
    const poly = liv.concat(innerLiv).concat(last.slice().reverse().slice(1, -1)); chambersPolys.push(poly);
    const lb = bboxOf([poly]);
    const nzL = Noise(77);
    parts.push(part({ id: 'living', polys: [poly], lo: '#f3e8d2', hi: '#a58a62', k: .4, edge: 3.5, edgeK: .5, gran: .7, bloom: 0, drift: .3, seed: 71, tone: (x, y) => clamp(.12 + .55 * (1 - ss(0, 1, Math.hypot(x - last[6].x, y - last[6].y) / (R * .8))) + .12 * clamp((y - lb.y0) / (lb.y1 - lb.y0)) + (nzL(x * .02, y * .02) - .5) * .12) }));
    // a pearly pink-blue sheen laid along the wall (nacre), a second thin wash
    const sheen = []; for (let k = 0; k <= 60; k++) { const th = lerp(ta, tb, k / 60); sheen.push(pt(r(th) - wall(th), th)); } for (let k = 60; k >= 0; k--) { const th = lerp(ta, tb, k / 60); sheen.push(pt(r(th) - wall(th) - (r(th) - inner(th)) * .22, th)); }
    parts.push(part({ id: 'sheen', polys: [sheen], lo: '#e8cfd2', hi: '#8fa3b0', k: .5, edge: 2.5, edgeK: .3, gran: .6, bloom: 0, drift: .5, seed: 72, tone: (x, y) => clamp(.3 + .5 * nzL(x * .015 + 3, y * .015)) }));
    // nacre layers: concentric hairlines inside the living chamber
    for (const f of [.1, .2, .32, .46]) { const L = []; for (let k = 0; k <= 80; k++) { const th = lerp(ta + .05, tb, k / 80); L.push(pt(r(th) - wall(th) - (r(th) - inner(th)) * f, th)); } living_lines.push(L); }
  }
  // siphuncle: a chain of small tubes through each septum, one third out from the inner wall
  const siph = [];
  for (let i = 0; i <= nS; i++) { const s = sep[i], k = 9, p = s[k], q = s[k - 1]; siph.push({ x: p.x, y: p.y, rr: Math.max(1.4, .014 * r(ths[i])), ang: Math.atan2(q.y - p.y, q.x - p.x) }); }
  parts.push(part({ id: 'siph', polys: siph.map(s => { const pts = []; for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; pts.push({ x: s.x + Math.cos(a) * s.rr * 1.5, y: s.y + Math.sin(a) * s.rr }); } return pts; }), lo: '#e5a870', hi: '#8a4520', k: .85, edge: 1.4, seed: 90, tone: () => .5, spill: .3, dx: .3, dy: .2 }));

  // ink: wall edges, septa, siphuncle rings
  ink.add(stroke(catmull(resample(wallOut, 6)), { w: 2.8, nib: .55, taper: .06 }));
  ink.add(stroke(catmull(resample(wallIn, 6)), { w: 1.7, nib: .5, taper: .1 }));
  // nacre layering in the wall
  const wall3 = []; for (let i = 0; i <= N; i += 1) { const th = lerp(th0, th1, i / N); wall3.push(pt(r(th) - wall(th) * .42, th)); }
  ink.add(stroke(catmull(resample(wall3, 7)), { w: .55, nib: .2, taper: .2, a: .55 }));
  for (let i = 0; i <= nS; i++) {
    const s = sep[i]; ink.add(stroke(catmull(s, false, 4), { w: 1.7, nib: .5, taper: .3 }));
    const s2 = s.map(p => ({ x: p.x + 1.8, y: p.y + 1.4 })); ink.add(stroke(catmull(s2.slice(1, -1), false, 4), { w: .6, nib: .2, taper: .5, a: .55 }));
  }
  const lastInner = []; for (let i = 0; i <= 200; i++) { const th = lerp(thS1 - 2.3, th1, i / 200); if (th < th0 + TAU) continue; lastInner.push(pt(inner(th), th)); }
  // inner wall of the last whorls (outer face of the previous whorl)
  { const inw = []; for (let i = 0; i <= 300; i++) { const th = lerp(th0 + TAU, th1, i / 300); inw.push(pt(r(th - TAU), th)); } ink.add(stroke(catmull(resample(inw, 6)), { w: 1.3, nib: .4, taper: .1, a: .85 })); }
  for (const s of siph) { const ring = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * TAU; ring.push({ x: s.x + Math.cos(a) * s.rr * 1.5, y: s.y + Math.sin(a) * s.rr }); } ink.add(stroke(ring, { w: .7, nib: .2, taper: 0 })); }
  for (const L of living_lines) ink.add(stroke(catmull(resample(L, 7)), { w: .45, nib: .1, taper: .35, a: .4 }));
  // stipple in the septal shadow of each chamber
  const bb = bboxOf([wallPoly]), inside = maskFn(chambersPolys, [], bb);
  const dots = stipple(inside, bb, (x, y) => { let best = 0; for (let i = Math.max(0, 0); i < sep.length; i++) { const s = sep[i][6]; const d = Math.hypot(x - s.x, y - s.y); if (d < 26) best = Math.max(best, 1 - d / 26); } return best * .95; }, { sp: 3.0, min: .18, seed: 33, rmin: .4, rmax: .95 });
  dots.sort((p, q) => Math.atan2(p.y - c.y, p.x - c.x) - Math.atan2(q.y - c.y, q.x - c.x));
  ink.addAll(dots);
  return { parts, ink, bb, poly: wallPoly, anchors: { pin: pt(r(th1 - 2.0) * .9, th1 - 2.0), siphuncle: siph[Math.floor(nS * .55)], label: { x: c.x, y: bb.y1 } } };
}
