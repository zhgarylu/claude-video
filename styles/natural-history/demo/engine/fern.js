// fern.js: a young fern frond with a coiled crozier tip. Controllable anatomy: length, coil tightness and
// size, pinna count, pinna length, number of pinnules (lobes) per pinna, lean.
// The rachis is integrated from a curvature that rises exponentially toward the tip (so the coil is a true
// spiral); pinnae stand on alternate sides and shrink to nothing inside the coil.
import { Noise, clamp, lerp, TAU, mulberry, catmull, resample, ss, bboxOf, polyLen } from './util.js';
import { part } from './wash.js';
import { stroke, dot, InkSet, maskFn, stipple } from './ink.js';

export const FERN_DEFAULT = { L: 470, k0: .0011, coil: 34, coilLen: .27, pinnae: 26, plen: 135, lobes: 6, lean: -.18, seed: 4, h0: -Math.PI / 2 };

export function fernFrond(base, opt = {}) {
  const o = { ...FERN_DEFAULT, ...opt }, rnd = mulberry(o.seed), nz = Noise(o.seed + 2), L = o.L;
  // rachis
  const N = 300, ds = L / N, R = []; let x = base.x, y = base.y, th = o.h0 + o.lean;
  for (let i = 0; i <= N; i++) {
    const s = i * ds; R.push({ x, y, th, s });
    const k = o.k0 * (1 + o.coil * Math.exp(-(L - s) / (o.coilLen * L))) + .0009 * Math.sin(s * .011 + 1);
    th += k * ds; x += Math.cos(th) * ds; y += Math.sin(th) * ds;
  }
  const at = s => { const f = clamp(s / L) * N, i = Math.min(N - 1, Math.floor(f)), t = f - i; const a = R[i], b = R[i + 1]; return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), th: lerp(a.th, b.th, t) }; };
  // stem polygon (tapers toward the tip)
  const wR = s => 5.2 * (1 - .78 * Math.pow(s / L, .8)) + .8;
  const left = [], right = [];
  for (const p of R) { const w = wR(p.s) / 2, nx = -Math.sin(p.th), ny = Math.cos(p.th); left.push({ x: p.x + nx * w, y: p.y + ny * w }); right.push({ x: p.x - nx * w, y: p.y - ny * w }); }
  const stem = left.concat(right.reverse());
  const parts = [], ink = new InkSet();
  const lightHalves = [], shadeHalves = [], pinnaPaths = [];
  const lightN = { x: -.52, y: -.58 };
  const order = [];
  for (let i = 0; i < o.pinnae; i++) {
    const u = (i + .5) / o.pinnae, s = lerp(.1, .985, Math.pow(u, .9)) * L;
    for (const side of [1, -1]) { if (side > 0 && u > .66) continue; order.push({ s: s + (side > 0 ? 0 : 5), side, u }); }
  }
  for (const pn of order) {
    const p = at(pn.s), u = pn.u;
    const env = Math.pow(Math.sin(Math.PI * Math.pow(clamp(u * 1.06), .75)), .9) * (u < .08 ? u / .08 : 1);
    const len = o.plen * (.18 + .82 * Math.pow(clamp(env), .8)) * (1 - .85 * ss(.55, 1, u)) * (.92 + .16 * rnd());
    if (len < 6) continue;
    const nrmA = p.th + pn.side * (Math.PI / 2 - .55 - .25 * u);   // forward-leaning
    const droop = pn.side * .1 * (1 - u) + (rnd() - .5) * .08;
    // centreline: a gently bending arc
    const M = 14;
    let cx = p.x, cy = p.y, ang = nrmA; const mid = [{ x: cx, y: cy }];
    for (let k = 1; k <= M; k++) { ang += (droop * 2.2 / M) * 1 + pn.side * .5 * (2 * k / M) * (1 / M); cx += Math.cos(ang) * len / M; cy += Math.sin(ang) * len / M; mid.push({ x: cx, y: cy, a: ang }); }
    mid[0].a = nrmA;
    const wMax = len * (.15 + .02 * Math.sin(pn.s));
    const upper = [], lower = [];
    const lobes = o.lobes + (rnd() < .4 ? 1 : 0), ph = rnd() * 6;
    for (let k = 0; k <= M * 3; k++) {
      const t = k / (M * 3), f = t * M, j = Math.min(M - 1, Math.floor(f)), q = f - j;
      const cxp = lerp(mid[j].x, mid[j + 1].x, q), cyp = lerp(mid[j].y, mid[j + 1].y, q), a = lerp(mid[j].a ?? nrmA, mid[j + 1].a ?? nrmA, q);
      const prof = Math.pow(Math.sin(Math.PI * Math.pow(t, .7)), .75), lob = .8 + .24 * Math.pow(Math.abs(Math.cos(t * lobes * Math.PI + ph * .2)), .6) - .1 * t;
      const w = wMax * prof * lob;
      const nx = -Math.sin(a), ny = Math.cos(a);
      upper.push({ x: cxp + nx * w, y: cyp + ny * w }); lower.push({ x: cxp - nx * w, y: cyp - ny * w });
    }
    // which half faces the light
    const nU = { x: -Math.sin(nrmA), y: Math.cos(nrmA) }, litUpper = (nU.x * lightN.x + nU.y * lightN.y) > 0;
    const A = upper.concat(mid.slice().reverse().map(m => ({ x: m.x, y: m.y }))), B = lower.concat(mid.slice().reverse().map(m => ({ x: m.x, y: m.y })));
    (litUpper ? lightHalves : shadeHalves).push(A); (litUpper ? shadeHalves : lightHalves).push(B);
    pinnaPaths.push({ upper, lower, mid, len, wMax, litUpper });
  }
  // wash: lit halves yellow-green, shaded halves a cool blue-green laid over the same yellow
  const grad = (x, y) => clamp(.3 + .5 * (nz(x * .02, y * .02) - .3) + (y - (base.y - L)) / L * .15);
  parts.push(part({ id: 'stem', polys: [stem], lo: '#d5c882', hi: '#6a5426', k: .7, tone: (x, y) => .4 + .4 * (nz(x * .03, y * .03)), edge: 2, edgeK: .5, seed: 71, spill: .6, dx: .6, dy: .5 }));
  parts.push(part({ id: 'lit', polys: lightHalves, lo: '#dfe590', hi: '#6c8a2c', k: .62, tone: (x, y) => .12 + .6 * grad(x, y), edge: 3, edgeK: .38, gran: .55, seed: 72, dx: 1.1, dy: .8 }));
  parts.push(part({ id: 'shade', polys: shadeHalves, lo: '#b6c874', hi: '#2e5a3a', k: .72, tone: (x, y) => .4 + .6 * grad(x, y), edge: 3, edgeK: .42, gran: .6, seed: 73, dx: 1.1, dy: .8 }));
  // ink
  const outline = (pp) => {
    const edge = pp.upper.concat(pp.lower.slice().reverse());
    return edge;
  };
  // rachis, double line
  ink.add(stroke(catmull(resample(left, 6), false, 2), { w: 1.7, nib: .5, taper: .05 }));
  ink.add(stroke(catmull(resample(right, 6), false, 2), { w: 1.3, nib: .5, taper: .05 }));
  for (const pp of pinnaPaths) {
    const U = pp.upper, Lw = pp.lower;
    ink.add(stroke(catmull(U.slice(0, U.length), false, 2), { w: pp.litUpper ? 1.05 : 1.55, nib: .55, taper: .25 }));
    ink.add(stroke(catmull(Lw.slice(0, Lw.length), false, 2), { w: pp.litUpper ? 1.55 : 1.05, nib: .55, taper: .25 }));
    ink.add(stroke(catmull(pp.mid, false, 2), { w: .75, nib: .2, taper: .3, a: .75 }));
    // veins: short hairlines from the midrib toward the lobes
    const nV = Math.round(pp.len / 8.5);
    for (let v = 1; v < nV; v++) {
      const t = v / nV, j = Math.min(pp.mid.length - 2, Math.floor(t * (pp.mid.length - 1))), m = pp.mid[j], a = m.a ?? 0, e1 = U[Math.floor(t * (U.length - 1))], e2 = Lw[Math.floor(t * (Lw.length - 1))];
      ink.add(stroke([m, { x: lerp(m.x, e1.x, .8), y: lerp(m.y, e1.y, .8) }], { w: .42, nib: 0, taper: .6, a: .5 }));
      ink.add(stroke([m, { x: lerp(m.x, e2.x, .8), y: lerp(m.y, e2.y, .8) }], { w: .42, nib: 0, taper: .6, a: .5 }));
    }
  }
  // stipple: scales on the stem, a little shade in the shaded halves
  const bb = bboxOf([stem].concat(shadeHalves.slice(0, 6)));
  const full = bboxOf([stem].concat(lightHalves, shadeHalves));
  const insideS = maskFn(shadeHalves, [], full);
  const dots = stipple(insideS, full, (x, y) => .45 + .5 * nz(x * .08, y * .08) , { sp: 4.2, min: .62, seed: 15, rmin: .35, rmax: .85 });
  dots.sort((p, q) => p.y - q.y); ink.addAll(dots);
  // scales on the stem
  const sc = []; for (let i = 0; i < 60; i++) { const s = rnd() * L * .7, p = at(s), o2 = (rnd() - .5) * 6; sc.push(dot(p.x - Math.sin(p.th) * o2, p.y + Math.cos(p.th) * o2, .7 + rnd() * .5, { a: .8 })); }
  ink.addAll(sc);
  return { parts, ink, bb: full, poly: stem, anchors: { pin: at(L * .9), tip: at(L), base: { x: base.x, y: base.y }, label: { x: base.x, y: base.y }, coil: at(L * .96) }, at };
}
