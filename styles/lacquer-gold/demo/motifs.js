// Gold-line motifs in LID space (origin = lid centre, x right, y down, lid 1240 x 800).
// Original compositions, built from splines and arcs only. DOM-free, so the timeline and the mixer can import it.
// A stroke = { id, grp, pts:[[x,y]…] (arc-length resampled), cum:[…], len, w, taper:bool, kind, t0, t1 (set by schedule) }
export const LID = { w: 1240, h: 800, r: 46 };

// ---- spline helpers -------------------------------------------------------------------------------------------
export function catmull(P, per = 20, closed = false) {
  const n = P.length, out = [];
  const g = i => closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(d => .5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  if (!closed) out.push(P[n - 1].slice());
  return out;
}
export function resample(pts, step = 4) {
  const out = [pts[0].slice()]; let acc = 0, prev = pts[0];
  for (let i = 1; i < pts.length; i++) {
    let a = prev, b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (acc + d >= step) {
      const u = (step - acc) / d; a = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; out.push(a); d = Math.hypot(b[0] - a[0], b[1] - a[1]); acc = 0;
    }
    acc += d; prev = b;
  }
  const last = pts[pts.length - 1]; if (Math.hypot(last[0] - out[out.length - 1][0], last[1] - out[out.length - 1][1]) > .5) out.push(last.slice());
  return out;
}
const lenOf = pts => { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return cum; };
function mkStroke(id, grp, pts, w, o = {}) {
  const cum = lenOf(pts);
  return Object.assign({ id, grp, pts, cum, len: cum[cum.length - 1], w, taper: true, kind: 'line' }, o);
}
// smooth stroke through control points
const sp = (id, grp, P, w, o = {}) => mkStroke(id, grp, resample(catmull(P, 24), 3.5), w, o);
// polyline stroke (corners kept), constant width
const pl = (id, grp, P, w, o = {}) => mkStroke(id, grp, resample(P, 6), w, Object.assign({ taper: false }, o));
const arc = (cx, cy, r, a0, a1, n = 40) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };

// ---- the crane ------------------------------------------------------------------------------------------------
// local frame: x forward (right), y down. placed with CRANE. Control points are shared by strokes and powder fills.
export const CRANE = { s: .84, x: -30, y: -14, rot: -.08 };
function place(P) {
  const { s, x, y, rot } = CRANE, c = Math.cos(rot), sn = Math.sin(rot);
  return P.map(([px, py]) => [x + (px * c - py * sn) * s, y + (px * sn + py * c) * s]);
}
const scl = (P, k, c) => P.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);
const SH = [34, -30];   // shoulder: the wing fans out from here
const CP = (() => {
  const body0 = [[70, -6], [34, -34], [-26, -38], [-90, -14], [-132, 14], [-92, 36], [-22, 46], [40, 30]];
  const body = scl(body0, 1.22, [-30, 4]);
  const LE = scl([[30, -34], [2, -122], [-48, -216], [-128, -286], [-228, -320], [-330, -318], [-404, -288]], .76, SH);
  const TE = scl([[-404, -288], [-364, -238], [-322, -196], [-270, -156], [-214, -120], [-158, -88], [-100, -62], [-40, -44], [10, -38]], .76, SH);
  const LE2 = scl([[20, 8], [-18, 74], [-92, 134], [-172, 172], [-252, 186], [-316, 176]], .72, SH);
  const TE2 = scl([[-316, 176], [-276, 150], [-226, 126], [-166, 98], [-106, 68], [-46, 40], [0, 24]], .72, SH);
  return { body, LE, TE, LE2, TE2 };
})();
function craneStrokes() {
  const S = [], dx = 30;
  const add = (id, P, w, o) => S.push(sp(id, 'crane', place(P), w * CRANE.s + .5, o));
  // neck and head: one long tapering line, then the beak
  add('neck', [[70 + dx, -4], [102 + dx, -16], [128 + dx, -48], [146 + dx, -92], [172 + dx, -126], [208 + dx, -138], [240 + dx, -124]], 11);
  add('beak', [[236 + dx, -122], [262 + dx, -118], [300 + dx, -108]], 4.6);
  add('crown', [[214 + dx, -139], [226 + dx, -132], [236 + dx, -124]], 5);
  const body = CP.body;
  S.push(sp('body', 'crane', place([...body, body[0]]), 6.2 * CRANE.s, { taper: false }));
  S.push(sp('breast', 'crane', place([[body[0][0] - 8, 2], [20, 18], [-30, 24], [-86, 16]]), 3.4 * CRANE.s, {}));
  // near wing, raised: leading edge, scalloped trailing edge, feather lines fanning from the shoulder
  add('wingL', CP.LE, 7);
  const teR = resample(catmull(CP.TE, 24), 3.5);
  const notches = []; for (let k = 0; k <= 7; k++) notches.push(teR[Math.floor((teR.length - 1) * (.02 + .96 * k / 7))]);
  for (let k = 0; k < 7; k++) {
    const a = notches[k], b = notches[k + 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx_ = b[0] - a[0], dy = b[1] - a[1];
    const nx = dy, ny = -dx_, nl = Math.hypot(nx, ny) || 1, bulge = 14, sgn = (nx * -1 + ny * 1) > 0 ? 1 : -1;
    S.push(sp('scal' + k, 'crane', place([a, [mx + sgn * nx / nl * bulge, my + sgn * ny / nl * bulge], b]), 4.4 * CRANE.s, {}));
  }
  for (let k = 1; k < 7; k++) {
    const a = notches[k], e = [a[0] + (SH[0] - a[0]) * .6, a[1] + (SH[1] - a[1]) * .6], m = [a[0] + (SH[0] - a[0]) * .3 + 4, a[1] + (SH[1] - a[1]) * .3 - 7];
    S.push(sp('feat' + k, 'crane', place([a, m, e]), 3.4 * CRANE.s, {}));
  }
  // primaries: four long quills beyond the wing tip
  for (let k = 0; k < 4; k++) {
    const a = notches[k], d = [a[0] - SH[0], a[1] - SH[1]], dl = Math.hypot(d[0], d[1]), u = [d[0] / dl, d[1] / dl], L = 78 - k * 6;
    const m = [a[0] + u[0] * L * .55 + u[1] * -6, a[1] + u[1] * L * .55 + u[0] * 6], e = [a[0] + u[0] * L, a[1] + u[1] * L + 8];
    S.push(sp('prim' + k, 'crane', place([a, m, e]), 5.2 * CRANE.s, {}));
  }
  S.push(sp('wingJoin', 'crane', place([CP.TE[CP.TE.length - 1], [24, -36], CP.LE[0]]), 5 * CRANE.s, {}));
  // far wing, lowered and behind
  add('farL', CP.LE2, 5.4);
  const te2 = resample(catmull(CP.TE2, 20), 3.5), n2 = []; for (let k = 0; k <= 5; k++) n2.push(te2[Math.floor((te2.length - 1) * (.02 + .96 * k / 5))]);
  for (let k = 0; k < 5; k++) {
    const a = n2[k], b = n2[k + 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx_ = b[0] - a[0], dy = b[1] - a[1], nl = Math.hypot(dx_, dy) || 1;
    const nx = dy / nl, ny = -dx_ / nl, sgn = (nx * 1 + ny * -1) > 0 ? 1 : -1;
    S.push(sp('fscal' + k, 'crane', place([a, [mx + sgn * nx * 11, my + sgn * ny * 11], b]), 3.6 * CRANE.s, {}));
  }
  // tail and legs
  add('tail1', [[-150, 12], [-190, 6], [-230, 10], [-262, 26]], 4.6);
  add('tail2', [[-146, 22], [-186, 26], [-224, 40], [-252, 62]], 4.2);
  add('leg1', [[-112, 34], [-160, 46], [-222, 50], [-300, 44], [-346, 50]], 3.6);
  add('leg2', [[-106, 40], [-152, 60], [-214, 78], [-286, 88], [-336, 102]], 3.4);
  return S;
}
// polygons for powder fills (placed), with the fan sectors so that feathers stay readable
export function craneFills() {
  const wing = [...catmull(CP.LE, 14), ...catmull(CP.TE, 14)], far = [...catmull(CP.LE2, 14), ...catmull(CP.TE2, 14)];
  const sh = place([SH])[0];
  return {
    body: { poly: place(catmull([...CP.body], 14, true)), edge: null, dens: .30 },
    wing: { poly: place(wing), edge: place(catmull(CP.LE, 14)), width: 120, dens: .26, pivot: sh },
    far: { poly: place(far), edge: place(catmull(CP.LE2, 14)), width: 80, dens: .2, pivot: sh },
  };
}

// ---- clouds (ruyi): a spiral head, a scalloped crest and a long wavy tail -------------------------------------
function cloud(id, cx, cy, s, flip, w = 4.4) {
  const f = flip ? -1 : 1, S = [];
  const sprl = []; for (let i = 0; i <= 60; i++) { const th = i / 60 * Math.PI * 3.6, r = s * (30 - 7.6 * th / Math.PI); sprl.push([cx + f * Math.cos(th + 3.4) * r, cy + Math.sin(th + 3.4) * r]); }
  S.push(mkStroke(id + 's', 'cloud', resample(sprl, 3), w));
  const crest = arc(cx, cy, s * 40, Math.PI * 1.08, Math.PI * 1.92, 36).map(([x, y]) => [cx + (x - cx) * f, y]);
  S.push(mkStroke(id + 'c1', 'cloud', resample(crest, 3), w * .8));
  const crest2 = arc(cx + f * s * 4, cy - s * 6, s * 56, Math.PI * 1.14, Math.PI * 1.84, 36).map(([x, y]) => [cx + (x - cx) * f, y]);
  S.push(mkStroke(id + 'c2', 'cloud', resample(crest2, 3), w * .7));
  const tail = []; const L = 170 * s;
  for (let i = 0; i <= 36; i++) { const u = i / 36; tail.push([cx - f * (s * 34 + u * L), cy + s * 18 + Math.sin(u * 9) * s * 9 * (1 - u * .5) + u * s * 6]); }
  S.push(mkStroke(id + 't', 'cloud', resample(tail, 3), w * .8));
  const tail2 = []; for (let i = 0; i <= 28; i++) { const u = i / 28; tail2.push([cx - f * (s * 30 + u * L * .62), cy + s * 40 + Math.sin(u * 8 + 1.4) * s * 7 + u * s * 4]); }
  S.push(mkStroke(id + 't2', 'cloud', resample(tail2, 3), w * .6));
  return S;
}
// ---- sun -------------------------------------------------------------------------------------------------------
export const SUN = { x: 384, y: -176, r: 66 };
function sunStrokes() {
  const { x, y, r } = SUN;
  return [mkStroke('sun1', 'sun', resample(arc(x, y, r, -Math.PI / 2, Math.PI * 1.5, 80), 3), 4.4),
          mkStroke('sun2', 'sun', resample(arc(x, y, r - 11, -Math.PI / 2, Math.PI * 1.5, 70), 3), 2.6)];
}
// ---- waves (seigaiha), a row of scale arcs + a partial second row ---------------------------------------------
export const WAVES = { y: 282, r: 38, x0: -490, n: 13, dx: 76 };
function waveStrokes() {
  const { y, r, x0, n, dx } = WAVES, S = [];
  const c1 = []; for (let i = 0; i < n; i++) c1.push([x0 + i * dx, y]);
  const c2 = []; for (let i = 0; i < n - 1; i++) c2.push([x0 + dx / 2 + i * dx, y - 20]);
  const inside = (p, cs, rr) => cs.some(c => Math.hypot(p[0] - c[0], p[1] - c[1]) < rr - .5 && p[1] <= c[1] + 1);
  let k = 0;
  for (const c of c1) for (const rr of [r, r * .72, r * .44]) S.push(mkStroke('w1_' + k++, 'wave', resample(arc(c[0], c[1], rr, Math.PI, Math.PI * 2, 24), 3), 2.8, { grp2: 'wave' }));
  for (const c of c2) for (const rr of [r, r * .72, r * .44]) {
    const pts = arc(c[0], c[1], rr, Math.PI, Math.PI * 2, 36).filter(p => !inside(p, c1, r)); if (pts.length < 6) continue;
    // split on gaps
    let cur = [pts[0]]; const parts = [];
    for (let i = 1; i < pts.length; i++) { if (Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) > 9) { parts.push(cur); cur = []; } cur.push(pts[i]); }
    parts.push(cur);
    for (const pt of parts) if (pt.length > 3) S.push(mkStroke('w2_' + k++, 'wave', resample(pt, 3), 2.8));
  }
  return S;
}
export function waveFill() {   // the first row's scales, filled from the top edge with a graded powder
  const { y, r, x0, n, dx } = WAVES; return Array.from({ length: n }, (_, i) => ({ cx: x0 + i * dx, cy: y, r }));
}
// ---- frame: rules and key-fret (回纹) -----------------------------------------------------------------------
function rr(x0, y0, x1, y1, rad) {   // rounded rectangle polyline
  const P = [], a = (cx, cy, a0) => arc(cx, cy, rad, a0, a0 + Math.PI / 2, 8);
  P.push(...a(x1 - rad, y0 + rad, -Math.PI / 2), ...a(x1 - rad, y1 - rad, 0), ...a(x0 + rad, y1 - rad, Math.PI / 2), ...a(x0 + rad, y0 + rad, Math.PI));
  P.push(P[0].slice()); return P;
}
function frameStrokes() {
  const S = [], hw = LID.w / 2, hh = LID.h / 2;
  S.push(mkStroke('rule1', 'rule', resample(rr(-hw + 44, -hh + 44, hw - 44, hh - 44, 18), 5), 4.6, { taper: false }));
  S.push(mkStroke('rule2', 'rule', resample(rr(-hw + 118, -hh + 118, hw - 118, hh - 118, 8), 5), 3.2, { taper: false }));
  // key-fret cells: a square spiral that closes in on itself; unit cell u (c wide, c high)
  const cell = c => [[0, c], [0, 0], [c, 0], [c, .70 * c], [.28 * c, .70 * c], [.28 * c, .28 * c], [.58 * c, .28 * c], [.58 * c, .46 * c], [.44 * c, .46 * c]];
  const sideCells = (x, y, ux, uy, nx, ny, n, c, tag, flip) => {
    // cell origin (x,y); u = along the side, v = inward normal; local (a,b) -> x + a*u + b*v
    for (let i = 0; i < n; i++) {
      const P = cell(c).map(([a, b]) => { const A = a, B = flip ? c - b : b; return [x + (i * c + A) * ux + B * nx, y + (i * c + A) * uy + B * ny]; });
      S.push(mkStroke(`fret_${tag}${i}`, 'fret_' + tag, P, 3.0, { taper: false, order: i }));
    }
  };
  const inset = 58, band = 46, X0 = -hw + inset, X1 = hw - inset, Y0 = -hh + inset, Y1 = hh - inset;
  const nT = 22, cT = (X1 - X0 - 2 * band) / nT, nS = 13, cS = (Y1 - Y0 - 2 * band) / nS;
  // top / bottom run along x; left / right along y (cells are square: reuse c via scaling the hook, band stays 46 deep)
  const cellS = (c, d) => cell(d).map(([a, b]) => [a * c / d, b]);
  const addSide = (tag, x, y, ux, uy, nx, ny, n, c, flip) => {
    for (let i = 0; i < n; i++) {
      const P = cellS(c, band).map(([a, b]) => [x + (i * c + a) * ux + (flip ? band - b : b) * nx, y + (i * c + a) * uy + (flip ? band - b : b) * ny]);
      S.push(mkStroke(`fret_${tag}${i}`, 'fret_' + tag, P, 3.0, { taper: false, order: i }));
    }
  };
  addSide('T', X0 + band, Y0, 1, 0, 0, 1, nT, cT, false);
  addSide('R', X1, Y0 + band, 0, 1, -1, 0, nS, cS, false);
  addSide('B', X1 - band, Y1, -1, 0, 0, -1, nT, cT, false);
  addSide('L', X0, Y1 - band, 0, -1, 1, 0, nS, cS, false);
  // corners: a small closed square spiral
  for (const [tag, cx, cy, ux, uy, nx, ny] of [['c0', X0, Y0, 1, 0, 0, 1], ['c1', X1, Y0, 0, 1, -1, 0], ['c2', X1, Y1, -1, 0, 0, -1], ['c3', X0, Y1, 0, -1, 1, 0]]) {
    const P = cell(band).map(([a, b]) => [cx + a * ux + b * nx, cy + a * uy + b * ny]);
    S.push(mkStroke('fret_' + tag, 'fret_c', P, 3.0, { taper: false, order: 0 }));
  }
  return S;
}

// ---- the whole design, in drawing order ----------------------------------------------------------------------
export function buildDesign() {
  const crane = craneStrokes();
  const clouds = [...cloud('cA', -372, -222, .66, false), ...cloud('cB', 318, 148, .8, true), ...cloud('cC', 70, 168, .42, false, 3.6)];
  return { crane, clouds, sun: sunStrokes(), waves: waveStrokes(), frame: frameStrokes() };
}
// schedule: assigns t0/t1 to every stroke, from the film clock. Returns events for the mixer.
export function schedule(D, T) {
  const ev = [];
  const run = (list, t, speed, gap = .06, minD = .1) => {
    for (const s of list) { s.t0 = t; s.t1 = t + Math.max(minD, s.len / speed); t = s.t1 + gap; }
    return t;
  };
  // 1. the first line alone: the crane's neck (the sound after the silence)
  const neck = D.crane.find(s => s.id === 'neck');
  neck.t0 = T.gold0; neck.t1 = T.gold0 + 1.15;
  let t = neck.t1 + .12;
  const rest = D.crane.filter(s => s.id !== 'neck');
  const order = ['beak', 'crown', 'body', 'breast', 'wingL', 'wingJoin', ...[0, 1, 2, 3].map(k => 'prim' + k), ...Array.from({ length: 7 }, (_, k) => 'scal' + k), ...Array.from({ length: 6 }, (_, k) => 'feat' + (k + 1)), 'farL', ...Array.from({ length: 5 }, (_, k) => 'fscal' + k), 'tail1', 'tail2', 'leg1', 'leg2'];
  const byId = Object.fromEntries(rest.map(s => [s.id, s]));
  t = run(order.map(i => byId[i]).filter(Boolean), t, 2300, .012, .06);
  D.craneEnd = t;
  // 2. clouds, sun, waves  (after the powder: T.cloud0)
  t = T.cloud0;
  t = run(D.sun, t, 760, .05, .5);
  t = run(D.clouds, t, 1250, .02, .11);
  // waves: scales appear left to right, three arcs each in parallel
  const w = D.waves; let k = 0;
  for (const s of w) { s.t0 = T.wave0 + (s.pts[0][0] + 500) / 1000 * (T.wave1 - T.wave0 - .5); s.t1 = s.t0 + .5; }
  // 3. frame: the rules, then the fret cells in a wave around the border, all four sides in parallel
  const [r1, r2] = D.frame.filter(s => s.grp === 'rule');
  r1.t0 = T.frame0; r1.t1 = T.frame0 + 1.5; r2.t0 = T.frame0 + .3; r2.t1 = T.frame0 + 1.7;
  for (const s of D.frame) if (s.grp.startsWith('fret')) {
    const base = T.fret0 + (s.grp === 'fret_c' ? 0 : (s.order || 0) * (T.fret1 - T.fret0 - .35) / (s.grp.endsWith('T') || s.grp.endsWith('B') ? 22 : 13));
    s.t0 = base; s.t1 = base + .35;
  }
  // events: one tick per hand-drawn stroke start; group events for the waves and the fret
  for (const s of [...D.crane, ...D.sun, ...D.clouds]) ev.push({ t: +s.t0.toFixed(3), type: 'gold', len: Math.round(s.len), dur: +(s.t1 - s.t0).toFixed(3), x: Math.round(s.pts[0][0]) });
  return ev;
}
// a ready stroke from control points, for other films: lineStroke([[0,0],[80,-40],[160,0]], 6)
export const lineStroke = (P, w, o = {}) => mkStroke('line', 'line', resample(catmull(P, 24), 3.5), w, o);
