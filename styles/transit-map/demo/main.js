// Three Angles to Anywhere: the picture. Everything is drawn in code on one 2D canvas; window.render(t) is a pure function of t.
import { clamp, lerp, seg, ss, eio, eo, back, track } from '/core/lib.js';
import * as N from './network.js';
import { SIZE, SIZE_X, HALO, boxFor } from './labelgeom.js';
import { T, DUR, VO, LEGS, trainState, events, subtitles } from './timeline.js';

const { U, PAPER, INK, GREY, PALE, RIVER_COL, PARK_COL, LINES, ST } = N;
const W = 1920, H = 1080;
const cvs = document.getElementById('c'), ctx = cvs.getContext('2d');
const LW_DIA = 11, LW_GEO = 4, R_DIA = 62, R_GEO = 420;
const SLATE = '#5A6170', Z1_COL = '#E8DCBE', Z2_COL = '#EFE8D4';
const LC = Object.fromEntries(LINES.map(l => [l.id, l.color]));
LC.ink = PALE;
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; };
const FONT = px => `500 ${px}px Barlow`;
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const nz = (a, b) => (b - a) || 1e-9;

let LABELS = {}, DUR_V = {}, SUBS = [], LW = {}, GEODIR = {}, AG = {}, REVEAL = {}, FIN = null, RP = null, STREETS = null;
let collect = null;      // when an array, text boxes are pushed here (for TEXTS)

// ------------------------------------------------------------------------------------------ rounded polylines
function rounded(P, R, closed) {
  const n = P.length, xs = [], ys = [], map = new Array(n);
  for (let i = 0; i < n; i++) {
    const V = P[i];
    const plain = () => { map[i] = xs.length; xs.push(V[0]); ys.push(V[1]); };
    if (!closed && (i === 0 || i === n - 1)) { plain(); continue; }
    const A = P[(i - 1 + n) % n], B = P[(i + 1) % n];
    let ax = V[0] - A[0], ay = V[1] - A[1], bx = B[0] - V[0], by = B[1] - V[1];
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    if (la < 1e-6 || lb < 1e-6) { plain(); continue; }
    ax /= la; ay /= la; bx /= lb; by /= lb;
    const th = Math.acos(clamp(ax * bx + ay * by, -1, 1));
    if (th < 0.02) { plain(); continue; }
    const d = Math.min(R[i] * Math.tan(th / 2), la * .5, lb * .5);
    const x0 = V[0] - ax * d, y0 = V[1] - ay * d, x1 = V[0] + bx * d, y1 = V[1] + by * d, K = 10;
    map[i] = xs.length + (K >> 1);
    for (let k = 0; k <= K; k++) { const u = k / K, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; xs.push(a * x0 + b * V[0] + c * x1); ys.push(a * y0 + b * V[1] + c * y1); }
  }
  const cum = [0]; for (let i = 1; i < xs.length; i++) cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
  if (closed) cum.push(cum[cum.length - 1] + Math.hypot(xs[0] - xs[xs.length - 1], ys[0] - ys[ys.length - 1]));
  return { xs, ys, cum, map, closed };
}
const eAt = (t, w) => eio(seg(t, T.morph0 + w, T.morph0 + w + 1.2));
function buildPath(wps, closed, t) {
  const n = wps.length, P = new Array(n), R = new Array(n), E = new Array(n);
  for (let i = 0; i < n; i++) { const w = wps[i], e = eAt(t, w.w); E[i] = e; P[i] = [lerp(w.g[0], w.d[0], e), lerp(w.g[1], w.d[1], e)]; R[i] = lerp(R_GEO, R_DIA, e); }
  const o = rounded(P, R, closed); o.E = E; o.P = P; return o;
}
function tangentAt(o, idx) {
  const n = o.xs.length; let a = idx, b = idx;
  for (let k = 0; k < 6 && a > 0; k++) { a--; if (Math.hypot(o.xs[idx] - o.xs[a], o.ys[idx] - o.ys[a]) > .5) break; }
  for (let k = 0; k < 6 && b < n - 1; k++) { b++; if (Math.hypot(o.xs[b] - o.xs[idx], o.ys[b] - o.ys[idx]) > .5) break; }
  if (o.closed) { if (idx === 0) a = n - 1; if (idx === n - 1) b = 0; }
  const dx = o.xs[b] - o.xs[a], dy = o.ys[b] - o.ys[a], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l];
}
function tracePath(o, p) {
  const L = o.cum[o.cum.length - 1] * p, n = o.xs.length;
  ctx.beginPath(); ctx.moveTo(o.xs[0], o.ys[0]);
  for (let i = 1; i < n; i++) {
    if (o.cum[i] <= L) ctx.lineTo(o.xs[i], o.ys[i]);
    else { const f = (L - o.cum[i - 1]) / nz(o.cum[i - 1], o.cum[i]); ctx.lineTo(lerp(o.xs[i - 1], o.xs[i], f), lerp(o.ys[i - 1], o.ys[i], f)); return [lerp(o.xs[i - 1], o.xs[i], f), lerp(o.ys[i - 1], o.ys[i], f)]; }
  }
  if (o.closed && p >= 1) ctx.closePath(); else if (o.closed && p >= 1 - 1e-9) ctx.closePath();
  return [o.xs[n - 1], o.ys[n - 1]];
}
// a slice of a built path between sample indices, forward, wrapping if closed
function sliceIdx(o, iA, iB) {
  const n = o.xs.length, idx = []; let i = iA;
  for (let k = 0; k <= n + 1; k++) { idx.push(i); if (i === iB) break; i = (i + 1) % n; if (!o.closed && i === 0) break; }
  return idx;
}

// ------------------------------------------------------------------------------------------ the camera
const ln = Math.log;
const QG = N.warp(3, 2);
const CAMK = [
  [0.0, [QG[0], QG[1], ln(2.6), 960, 540]], [1.2, [QG[0], QG[1], ln(2.6), 960, 540]], [3.6, [QG[0] + 4, QG[1] + 2, ln(1.7), 960, 520]], [7.0, [16, 8.4, ln(.94), 960, 490]],
  [14.0, [16, 8.4, ln(.98), 960, 490]], [15.0, [16, 8.4, ln(.98), 960, 490]], [15.9, [16, 8.4, ln(.8), 725, 470]], [16.3, [16, 8.4, ln(.8), 725, 470]],
  [17.0, [7.4, 3.5, ln(2.3), 725, 470]], [19.4, [7.4, 3.5, ln(2.3), 725, 470]], [20.3, [7, 8, ln(1.6), 725, 470]], [22.9, [18.5, 8, ln(1.6), 725, 470]],
  [23.8, [13.2, 8.5, ln(2.1), 725, 470]], [26.0, [13.2, 8.5, ln(2.1), 725, 470]], [27.2, [16, 8.4, ln(.8), 725, 470]], [30.0, [16, 8.4, ln(.8), 725, 470]],
  [31.2, [5, 3.4, ln(2.0), 725, 470]], [32.4, [5, 3.4, ln(2.0), 725, 470]], [33.3, [16, 8.4, ln(.8), 725, 470]], [46.0, [16, 8.4, ln(.8), 725, 470]],
  [49.4, [16, 8.4, ln(.8), 725, 470]], [50.4, [16, 8.1, ln(.8), 960, 430]], [54.0, [16, 8.1, ln(.8), 960, 430]],
];
const camTrack = track(CAMK);
function cam(t) {
  let [cx, cy, lz, sx, sy] = camTrack(t); let z = Math.exp(lz); cx *= U; cy *= U;
  const wF = ss(seg(t, 34.9, 36.0)) * (1 - ss(seg(t, 45.8, 47.8)));
  if (wF > 0 && RP) {
    let px = 0, py = 0, tw = 0;
    for (let k = -4; k <= 4; k++) { const tt = t + k * .12 + .15, w = 1 - Math.abs(k) / 5, q = routePos(trainState(tt)); px += q.x * w; py += q.y * w; tw += w; }
    px /= tw; py /= tw;
    cx = lerp(cx, px, wF); cy = lerp(cy, py, wF); z = Math.exp(lerp(Math.log(z), Math.log(1.7), wF));
  }
  return { cx, cy, z, sx, sy };
}
const w2s = (C, x, y) => [(x - C.cx) * C.z + C.sx, (y - C.cy) * C.z + C.sy];

// ------------------------------------------------------------------------------------------ state of the map at time t
function focusAt(t) {
  const route = ss(seg(t, T.dim0, T.dim1)) * (1 - ss(seg(t, 46.9, 48.3)));
  const cop = ss(seg(t, 20.3, 20.9)) * (1 - ss(seg(t, 22.8, 23.3)));
  if (cop > 0) return { kind: 'copper', amt: cop };
  return { kind: 'route', amt: route };
}
const inFocus = (id, F) => F.kind === 'copper' ? ST[id].lines.includes('copper') : ROUTE_SET.has(id);
let ROUTE_SET = new Set(), ROUTE_STOPS = [];

function buildState(t) {
  const S = { t, C: cam(t), F: focusAt(t), lines: {}, SP: {}, river: buildPath(N.RIVER_PATH, false, t) };
  for (const L of LINES) {
    const o = buildPath(L.wps, L.closed, t); S.lines[L.id] = o;
    L.wps.forEach((w, i) => {
      if (!w.st) return;
      const idx = o.map[i], tg = tangentAt(o, idx);
      (S.SP[w.st] ??= { id: w.st, pts: [], tans: [], es: 0, n: 0 });
      const sp = S.SP[w.st]; sp.pts.push([o.xs[idx], o.ys[idx]]); sp.tans.push(tg); sp.es += o.E[i]; sp.n++;
    });
  }
  for (const sp of Object.values(S.SP)) {
    sp.x = sp.pts.reduce((a, p) => a + p[0], 0) / sp.n; sp.y = sp.pts.reduce((a, p) => a + p[1], 0) / sp.n; sp.es /= sp.n;
    sp.tx = sp.tans[0][0]; sp.ty = sp.tans[0][1];
    sp.rev = t >= T.morph0 ? -1 : (REVEAL[sp.id] ?? 99);
    sp.vis = sp.rev < 0 ? 1 : ss(seg(t, sp.rev, sp.rev + .12));
    sp.pop = sp.rev < 0 ? 1 : back(seg(t, sp.rev, sp.rev + .35), 2.2);
  }
  return S;
}

// ------------------------------------------------------------------------------------------ the route (final diagram geometry)
function initRoute() {
  FIN = {}; for (const L of LINES) FIN[L.id] = buildPath(L.wps, L.closed, 999);
  const xs = [], ys = [], leg = [], cum = [0], bounds = [];
  N.ROUTE.forEach((r, k) => {
    const L = N.lineById(r.line), o = FIN[r.line];
    const iA = o.map[L.wps.findIndex(w => w.st === r.from)], iB = o.map[L.wps.findIndex(w => w.st === r.to)];
    const idx = sliceIdx(o, iA, iB);
    idx.forEach((q, j) => { if (k > 0 && j === 0) return; xs.push(o.xs[q]); ys.push(o.ys[q]); leg.push(k); });
    bounds.push(xs.length - 1);
  });
  for (let i = 1; i < xs.length; i++) cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
  RP = { xs, ys, cum, leg, bounds, total: cum[cum.length - 1] };
  // route stops in order, with their distance along the route
  ROUTE_STOPS = []; ROUTE_SET = new Set();
  N.ROUTE.forEach((r, k) => {
    const L = N.lineById(r.line), n = L.stops.length; let i = L.stops.indexOf(r.from);
    for (let g = 0; g < n + 1; g++) {
      const id = L.stops[i]; if (!(k > 0 && g === 0)) { ROUTE_STOPS.push(id); ROUTE_SET.add(id); }
      if (id === r.to) break; i = (i + 1) % n;
    }
  });
  RP.stopD = ROUTE_STOPS.map(id => {
    // distance along the route of the sample nearest to the station in the final diagram
    const p = [ST[id].p[0] * U, ST[id].p[1] * U]; let best = 1e9, bd = 0;
    for (let i = 0; i < RP.xs.length; i++) { const d = Math.hypot(RP.xs[i] - p[0], RP.ys[i] - p[1]); if (d < best) { best = d; bd = RP.cum[i]; } }
    return bd;
  });
  RP.legCum = bounds.map(b => cum[b]);
}
function routeAtDist(s) {
  s = clamp(s, 0, RP.total); const c = RP.cum; let lo = 0, hi = c.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
  const f = (s - c[lo]) / nz(c[lo], c[hi]), x = lerp(RP.xs[lo], RP.xs[hi], f), y = lerp(RP.ys[lo], RP.ys[hi], f);
  return { x, y, a: Math.atan2(RP.ys[hi] - RP.ys[lo], RP.xs[hi] - RP.xs[lo]), leg: RP.leg[hi] };
}
function routeDist(ts) {
  const L0 = ts.leg === 0 ? 0 : RP.legCum[ts.leg - 1], L1 = RP.legCum[ts.leg];
  return lerp(L0, L1, ts.f);
}
function routePos(ts) { return routeAtDist(routeDist(ts)); }

// ------------------------------------------------------------------------------------------ drawing helpers
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function spaced(txt, x, y, sp, fill) { ctx.fillStyle = fill; let cx = x; for (const ch of txt) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + sp; } return cx - x - sp; }
function spacedW(txt, sp) { let w = 0; for (const ch of txt) w += ctx.measureText(ch).width + sp; return w - sp; }
function boldText(txt, x, y, px, fill, k = .035) { ctx.font = FONT(px); ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineWidth = px * k; ctx.lineJoin = 'round'; ctx.strokeText(txt, x, y); ctx.fillText(txt, x, y); }
function addText(S, id, text, x0, y0, x1, y1) {   // screen-space box, only counted when fully in frame
  if (!collect) return; if (x0 < 0 || y0 < 0 || x1 > W || y1 > H) return; collect.push({ id, text, x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(x1), y1: Math.round(y1) });
}
const lineWidth = t => lerp(LW_GEO, LW_DIA, ss(seg(t, T.morph0 + 1, T.morph0 + 4.5)));

// ------------------------------------------------------------------------------------------ the geography
function drawGeo(S, t) {
  if (t > T.morph0 + 6) return;
  const q = N.warp(3, 2), C0 = [15.5, 8.4];
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // parks
  STREETS.parks.forEach((p, i) => {
    const c = p.reduce((a, v) => [a[0] + v[0] / p.length, a[1] + v[1] / p.length], [0, 0]);
    const rv = .9 + Math.hypot(c[0] - q[0], c[1] - q[1]) * .17, fade = 1 - ss(seg(t, T.morph0 + Math.hypot(c[0] - C0[0], c[1] - C0[1]) * .2 + .2, T.morph0 + Math.hypot(c[0] - C0[0], c[1] - C0[1]) * .2 + 1.8));
    const a = ss(seg(t, rv, rv + 1)) * fade; if (a <= 0) return;
    ctx.globalAlpha = a; ctx.fillStyle = PARK_COL; ctx.beginPath();
    p.forEach((v, k) => { const nx = p[(k + 1) % p.length]; const mx = (v[0] + nx[0]) / 2 * U, my = (v[1] + nx[1]) / 2 * U; if (k === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(v[0] * U, v[1] * U, mx, my); });
    const v0 = p[0], v1 = p[1]; ctx.quadraticCurveTo(v0[0] * U, v0[1] * U, (v0[0] + v1[0]) / 2 * U, (v0[1] + v1[1]) / 2 * U); ctx.fill();
  });
  ctx.globalAlpha = 1;
  // streets
  STREETS.streets.forEach((s, i) => {
    const p0 = s.pts[0], mid = s.pts[s.pts.length >> 1];
    const rv = .9 + Math.hypot(p0[0] - q[0], p0[1] - q[1]) * .17, pr = seg(t, rv, rv + .9);
    const dc = Math.hypot(mid[0] - C0[0], mid[1] - C0[1]), fade = 1 - ss(seg(t, T.morph0 + dc * .2 + .2, T.morph0 + dc * .2 + 1.6));
    if (pr <= 0 || fade <= 0) return;
    ctx.globalAlpha = fade; ctx.strokeStyle = s.c === 0 ? '#CCC5B4' : '#DAD5C8'; ctx.lineWidth = s.w;
    const pts = s.pts.map(v => [v[0] * U, v[1] * U]);
    // length of polyline for partial reveal
    let tot = 0; for (let k = 1; k < pts.length; k++) tot += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    ctx.setLineDash(pr < 1 ? [tot * pr, tot * 2] : []);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length - 1; k++) ctx.quadraticCurveTo(pts[k][0], pts[k][1], (pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2);
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); ctx.stroke(); ctx.setLineDash([]);
  });
  ctx.globalAlpha = 1;
}
function drawRiver(S, t) {
  const p = seg(t, T.river0, T.river1); if (p <= 0) return;
  const o = S.river, w = lerp(36, 26, ss(seg(t, T.morph0 + 1, T.morph0 + 5)));
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = RIVER_COL; ctx.lineWidth = w;
  tracePath(o, t > T.river1 ? 1 : p); ctx.stroke();
  ctx.strokeStyle = mix(RIVER_COL, '#FFFFFF', .35); ctx.lineWidth = w * .18; ctx.globalAlpha = .7; tracePath(o, t > T.river1 ? 1 : p); ctx.stroke(); ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------------------------------ zones
function drawZones(S, t) {
  const a2 = ss(seg(t, T.zone2, T.zone2 + .9)), a1 = ss(seg(t, T.zone1, T.zone1 + .9)); if (a2 <= 0) return;
  const c = [14 * U, 8.5 * U];
  const poly = (pts, a, col, r) => {
    const P = pts.map(p => [c[0] + (p[0] * U - c[0]) * a, c[1] + (p[1] * U - c[1]) * a]);
    const o = rounded(P, P.map(() => r), true);
    ctx.beginPath(); ctx.moveTo(o.xs[0], o.ys[0]); for (let i = 1; i < o.xs.length; i++) ctx.lineTo(o.xs[i], o.ys[i]); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  };
  poly(N.ZONE2, a2, Z2_COL, 60);
  if (a1 > 0) poly(N.ZONE1, a1, Z1_COL, 56);
  // zone numerals, large and faint
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
  [[1, 17.4, 11.7, a1], [2, 5.4, 6.3, a2], [3, 29.2, 7.2, ss(seg(t, T.zoneTags, T.zoneTags + .8))]].forEach(([n, x, y, a]) => {
    if (a <= 0) return; ctx.globalAlpha = .55 * a; boldText(String(n), x * U, y * U + 60, 190, mix(Z1_COL, '#C9B98E', .75));
    ctx.globalAlpha = 1;
  });
  ctx.restore();
}

// ------------------------------------------------------------------------------------------ lines, stations, labels
function dimMix(color, id, S) {   // lines other than the focus fade toward paper
  const F = S.F; if (F.amt <= 0) return color;
  if (F.kind === 'copper' && id === 'copper') return color;
  return mix(color, '#E3DED1', F.amt * .88);
}
function drawLines(S, t) {
  const w = lineWidth(t); ctx.lineCap = t > T.morph0 + 5 ? 'butt' : 'round'; ctx.lineJoin = 'round';
  let pen = null;
  for (const L of LINES) {
    const o = S.lines[L.id], p = t >= T.morph0 ? 1 : seg(t, T.pen[L.id], T.pen[L.id] + T.penDur);
    if (p <= 0) continue;
    ctx.strokeStyle = dimMix(LC[L.id], L.id, S); ctx.lineWidth = w;
    const head = tracePath(o, p); ctx.stroke();
    if (p > 0 && p < 1) pen = head;
  }
  // the route lit over the dimmed network
  if (S.F.kind === 'route' && S.F.amt > 0) {
    ctx.globalAlpha = S.F.amt;
    N.ROUTE.forEach((r, k) => {
      const L = N.lineById(r.line), o = S.lines[r.line];
      const iA = o.map[L.wps.findIndex(q => q.st === r.from)], iB = o.map[L.wps.findIndex(q => q.st === r.to)], idx = sliceIdx(o, iA, iB);
      ctx.strokeStyle = LC[r.line]; ctx.lineWidth = w; ctx.beginPath(); idx.forEach((q, j) => j ? ctx.lineTo(o.xs[q], o.ys[q]) : ctx.moveTo(o.xs[q], o.ys[q])); ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }
  if (pen) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(pen[0], pen[1], 4.5, 0, 7); ctx.fill(); }
}
function stationAlpha(id, S) { return S.F.amt > 0 && !inFocus(id, S.F) ? lerp(1, .24, S.F.amt) : 1; }
function drawStations(S, t) {
  for (const id of Object.keys(ST)) {
    const sp = S.SP[id]; if (!sp || sp.vis <= 0) continue;
    const multi = ST[id].lines.length > 1, tm = ss(seg(sp.es, .55, 1)), a = stationAlpha(id, S);
    ctx.globalAlpha = a * sp.vis;
    if (tm < 1) {
      const r = (multi ? 7 : 5) * Math.max(0, sp.pop) * (1 - tm * .4);
      ctx.globalAlpha = a * sp.vis * (1 - tm); ctx.fillStyle = PAPER; ctx.strokeStyle = SLATE; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, r, 0, 7); ctx.fill(); ctx.stroke();
    }
    if (tm > 0) {
      ctx.globalAlpha = a * tm;
      if (multi) {
        ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.arc(sp.x, sp.y, 15.5 * (.6 + .4 * tm), 0, 7); ctx.fill(); ctx.stroke();
      } else {
        const nx = -sp.ty, ny = sp.tx, h = 17 * tm; ctx.strokeStyle = INK; ctx.lineWidth = 4.5; ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(sp.x - nx * h, sp.y - ny * h); ctx.lineTo(sp.x + nx * h, sp.y + ny * h); ctx.stroke(); ctx.lineCap = 'round';
      }
    }
    // a pulse ring when the train changes here
    ctx.globalAlpha = 1;
  }
}
const GDIRS = ['e', 'w', 'n', 's', 'ne', 'nwd', 'se', 'swd'];
function drawLabels(S, t) {
  for (const id of Object.keys(ST)) {
    const sp = S.SP[id]; if (!sp || sp.vis <= 0) continue;
    const multi = ST[id].lines.length > 1, px0 = multi ? SIZE_X : SIZE, w0 = LW[id], h0 = px0 * .78 + 2 * HALO;
    const el = ss(seg(sp.es, .2, 1)), sc = lerp(.84, 1, el), px = px0 * sc, w = w0 * sc, h = h0 * sc;
    const bG = boxFor(GEODIR[id], w, h), bD = boxFor(LABELS[id], w, h);
    const bx = lerp(bG[0], bD[0], el), by = lerp(bG[1], bD[1], el);
    const rev = sp.rev < 0 ? 1 : ss(seg(t, sp.rev + .2, sp.rev + .6)); if (rev <= 0) continue;
    const ang = lerp(AG[id], 0, el), demo = (id === 'drum' || id === 'hatch') ? 1 - .85 * ss(seg(t, 15.9, 16.2)) * (1 - ss(seg(t, 19.0, 19.4))) : 1, a = stationAlpha(id, S) * rev * demo;
    const cxL = sp.x + bx + w / 2, cyL = sp.y + by + h / 2;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(cxL, cyL); ctx.rotate(ang); ctx.textBaseline = 'alphabetic';
    ctx.font = FONT(px); ctx.lineJoin = 'round'; ctx.strokeStyle = PAPER; ctx.lineWidth = HALO * 2;
    const tx = -w / 2 + HALO, ty = h / 2 - HALO - px * .02;
    ctx.strokeText(ST[id].name, tx, ty);
    const col = mix(SLATE, INK, el);
    ctx.fillStyle = col; ctx.fillText(ST[id].name, tx, ty);
    if (multi) { ctx.strokeStyle = col; ctx.lineWidth = px * .035; ctx.strokeText(ST[id].name, tx, ty); }
    ctx.restore();
    if (collect && a > .25) {
      const C = S.C, c = Math.cos(ang), s = Math.sin(ang), hw = (w * Math.abs(c) + h * Math.abs(s)) / 2, hh = (w * Math.abs(s) + h * Math.abs(c)) / 2;
      const [sx, sy] = w2s(C, cxL, cyL); addText(S, 'st:' + id, ST[id].name, sx - hw * C.z, sy - hh * C.z, sx + hw * C.z, sy + hh * C.z);
    }
  }
}

// ------------------------------------------------------------------------------------------ markers in the world
function pingRings(x, y, t, t0, col, n = 3, maxR = 70, period = 1.1) {
  for (let k = 0; k < n; k++) {
    const u = (t - t0 - k * .28) / period; if (u <= 0 || u >= 1) continue;
    ctx.globalAlpha = (1 - u) * .8; ctx.strokeStyle = col; ctx.lineWidth = 3.5 * (1 - u) + 1; ctx.beginPath(); ctx.arc(x, y, 12 + (maxR - 12) * eo(u), 0, 7); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function pinAt(S, x, y, t, t0, text, id) {
  const d = t - t0; if (d < 0) return;
  const fall = d < .45 ? (1 - eo(d / .45)) * 170 : 0, sq = d > .45 && d < .7 ? Math.sin((d - .45) / .25 * Math.PI) * .12 : 0;
  ctx.save(); ctx.translate(x, y - fall); ctx.scale(1 + sq, 1 - sq);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, -44, 19, Math.PI * .85, Math.PI * .15 + Math.PI * 2); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(0, -44, 7, 0, 7); ctx.fill();
  ctx.restore();
  if (d > .45) pingRings(x, y, t, t0 + .45, INK, 2, 56, 1.0);
  const a = ss(seg(d, .5, .85)); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.font = FONT(20); const w = spacedW(text, 2.5) + 28, px = x - w / 2, py = y - 44 - 19 - 46 - (1 - a) * 8;
  ctx.fillStyle = INK; rrect(px, py, w, 32, 3); ctx.fill(); ctx.textBaseline = 'alphabetic'; spaced(text, px + 14, py + 23, 2.5, PAPER); ctx.restore();
  const [sx, sy] = w2s(S.C, px, py), [ex, ey] = w2s(S.C, px + w, py + 32); addText(S, id, text, sx, sy, ex, ey);
}
function lantern(S, x, y, t, t0, id) {
  const d = t - t0; if (d < 0) return; const a = ss(seg(d, 0, .4)), sway = Math.sin(d * 3) * .08 * Math.exp(-d * .8);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y + 18); ctx.rotate(sway);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 12); ctx.stroke();
  ctx.fillStyle = LC.saffron; ctx.strokeStyle = INK; ctx.lineWidth = 3.5; rrect(-15, 12, 30, 36, 14); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-15, 30); ctx.lineTo(15, 30); ctx.moveTo(0, 12); ctx.lineTo(0, 48); ctx.stroke();
  ctx.fillStyle = INK; ctx.fillRect(-9, 10, 18, 5); ctx.fillRect(-7, 47, 14, 4);
  ctx.restore();
  const pw = 148; ctx.save(); ctx.globalAlpha = a; ctx.font = FONT(20);
  const px = x - 24 - pw - 6, py = y + 22; ctx.fillStyle = INK; rrect(px, py, pw, 32, 3); ctx.fill(); ctx.textBaseline = 'alphabetic'; spaced('FESTIVAL', px + 14, py + 23, 2.5, PAPER); ctx.restore();
  const [sx, sy] = w2s(S.C, px, py), [ex, ey] = w2s(S.C, px + pw, py + 32); addText(S, id, 'FESTIVAL', sx, sy, ex, ey);
}

// the traveller dot of the opening
function drawDot(S, t) {
  const sp = S.SP.quill; if (!sp) return;
  const a = ss(seg(t, 0, .3)) * (1 - ss(seg(t, 13.7, 14.4))); if (a <= 0) return;
  pingRings(sp.x, sp.y, t, T.ping0, INK, 3, 90, 1.5);
  ctx.globalAlpha = a; ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(sp.x, sp.y, 12 * (.4 + .6 * a), 0, 7); ctx.fill(); ctx.globalAlpha = 1;
}
function drawFinalPulse(S, t) {
  const sp = S.SP.rook; if (!sp) return; pingRings(sp.x, sp.y, t, T.finalPulse, INK, 3, 100, 1.5);
}

// ------------------------------------------------------------------------------------------ the rule demonstrations
function drawAngleDemo(S, t) {
  if (t < T.angGhost - .1 || t > 19.5) return;
  const e = [6 * U, 2 * U], len = 4.3 * U;
  const appear = ss(seg(t, T.angGhost, T.angGhost + .5)), snap = t >= T.angSnap ? 1 : 0;
  const k = ss(seg(t, T.angSnap, T.angSnap + .14));
  const ang = lerp(30, 45, k) * Math.PI / 180, fade = 1 - ss(seg(t, 19.0, 19.4));
  ctx.save(); ctx.globalAlpha = fade;
  // the 0 degree reference
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.setLineDash([7, 7]);
  ctx.beginPath(); ctx.moveTo(e[0] - 40, e[1]); ctx.lineTo(e[0] + len * 1.02, e[1]); ctx.stroke();
  // the arc and the stroke
  const wob = (1 - k) * Math.sin(t * 38) * 1.2 * (1 - ss(seg(t, T.angSnap - .3, T.angSnap)) * 0), end = [e[0] + Math.cos(ang) * len * appear, e[1] + Math.sin(ang) * len * appear + wob];
  ctx.setLineDash(k < 1 ? [10, 8] : []); ctx.lineWidth = k < 1 ? 4 : 0;
  if (k < 1) { ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(end[0], end[1]); ctx.stroke(); }
  ctx.setLineDash([]);
  ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(e[0], e[1], 1.5 * U, 0, ang * appear); ctx.stroke();
  const lx = e[0] + 1.5 * U + 70, ly = e[1] - 40;
  // the label: 30° with a cross, then 45° with a tick
  const txt = k < 1 ? '30°' : '45°', pw = 96, py = ly - 18, px = lx - 8;
  const la = ss(seg(t, T.angGhost + .3, T.angGhost + .7));
  ctx.globalAlpha = fade * la; ctx.fillStyle = INK; rrect(px, py, pw, 36, 3); ctx.fill(); ctx.font = FONT(26); ctx.textBaseline = 'alphabetic'; ctx.fillStyle = PAPER; ctx.fillText(txt, px + 14, py + 26);
  ctx.strokeStyle = PAPER; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath();
  if (k < 1) { ctx.moveTo(px + 66, py + 11); ctx.lineTo(px + 82, py + 27); ctx.moveTo(px + 82, py + 11); ctx.lineTo(px + 66, py + 27); }
  else { ctx.moveTo(px + 66, py + 19); ctx.lineTo(px + 73, py + 27); ctx.lineTo(px + 85, py + 10); }
  ctx.stroke(); ctx.restore();
  const [sx, sy] = w2s(S.C, px, py), [ex, ey] = w2s(S.C, px + pw, py + 36); addText(S, 'ang:' + txt, txt, sx, sy, ex, ey);
}
function drawCaliper(S, t) {
  const a = ss(seg(t, T.caliper, T.caliper + .8)) * (1 - ss(seg(t, 22.9, 23.3))); if (a <= 0) return;
  const x0 = 5 * U, x1 = lerp(5, 23, ss(seg(t, T.caliper, T.caliper + 1.0))) * U, y = 8 * U, h = LW_DIA / 2 + 11;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(x0, y - h); ctx.lineTo(x1, y - h); ctx.moveTo(x0, y + h); ctx.lineTo(x1, y + h);
  for (let x = x0; x <= x1 + .1; x += 2 * U) { ctx.moveTo(x, y - h - 7); ctx.lineTo(x, y - h + 7); ctx.moveTo(x, y + h - 7); ctx.lineTo(x, y + h + 7); }
  ctx.stroke(); ctx.restore();
}
function plate(S, x, y, text, id, a, anchor = 'l', px = 22) {   // an ink plate with spaced caps, in world space
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.font = FONT(px); const w = spacedW(text, 2.5) + 28, h = px + 14, X = anchor === 'r' ? x - w : anchor === 'c' ? x - w / 2 : x;
  ctx.fillStyle = INK; rrect(X, y, w, h, 3); ctx.fill(); ctx.textBaseline = 'alphabetic'; spaced(text, X + 14, y + h - 10, 2.5, PAPER); ctx.restore();
  const [sx, sy] = w2s(S.C, X, y), [ex, ey] = w2s(S.C, X + w, y + h); addText(S, id, text, sx, sy, ex, ey);
}
function drawCallouts(S, t) {
  const aS = ss(seg(t, T.calloutStop, T.calloutStop + .4)) * (1 - ss(seg(t, 26.8, 27.3))), aC = ss(seg(t, T.calloutChange, T.calloutChange + .4)) * (1 - ss(seg(t, 26.8, 27.3)));
  const pike = S.SP.pike, wren = S.SP.wren;
  if (aS > 0 && pike) {
    ctx.save(); ctx.globalAlpha = aS; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(pike.x, pike.y + 26); ctx.lineTo(pike.x, pike.y + 78); ctx.stroke(); ctx.restore();
    plate(S, pike.x, pike.y + 78, 'A STOP', 'co:stop', aS, 'c');
  }
  if (aC > 0 && wren) {
    ctx.save(); ctx.globalAlpha = aC; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(wren.x + 11, wren.y + 11); ctx.lineTo(wren.x + 26, wren.y + 28); ctx.stroke(); ctx.restore();
    plate(S, wren.x + 24, wren.y + 24, 'A CHANGE', 'co:change', aC, 'l');
  }
}
function drawCartouche(S, t) {
  const a = ss(seg(t, T.cartouche, T.cartouche + .6)) * (1 - ss(seg(S.C.z, 1.05, 1.35))) * (1 - ss(seg(t, 49.6, 50.2))); if (a <= 0) return;
  const x = 25 * U, y = 14.7 * U, w = 7.2 * U * a, h = 1.5 * U;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 4, y - 4, w + 8, h + 8); ctx.clip();
  ctx.fillStyle = INK; rrect(x, y, 7.2 * U, h, 4); ctx.fill();
  ctx.textBaseline = 'alphabetic'; boldText('HALDEN', x + 20, y + 46, 40, PAPER, .03);
  ctx.font = FONT(17); spaced('TRANSIT DIAGRAM', x + 20, y + 72, 2.2, '#B9BDC6');
  LINES.forEach((L, i) => { ctx.fillStyle = L.color; ctx.fillRect(x + 7.2 * U - 20 - (5 - i) * 20, y + 20, 14, 44); });
  ctx.restore();
  const [sx, sy] = w2s(S.C, x, y); if (a >= 1) { addText(S, 'cart:halden', 'HALDEN', sx + 20 * S.C.z, sy + 12 * S.C.z, sx + 150 * S.C.z, sy + 52 * S.C.z); addText(S, 'cart:sub', 'TRANSIT DIAGRAM', sx + 20 * S.C.z, sy + 56 * S.C.z, sx + 180 * S.C.z, sy + 76 * S.C.z); }
}

// ------------------------------------------------------------------------------------------ the train
function drawTrain(S, t) {
  if (t < T.dep1 - 1 || !RP) return;
  const ts = trainState(t), s = routeDist(ts);
  // the ridden stretch gets a white centre line
  const ridden = ss(seg(t, T.dim0, T.dim1)); ctx.save(); ctx.globalAlpha = .75 * ridden * (1 - ss(seg(t, 46.9, 48.3)));
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3.2; ctx.lineCap = 'butt'; ctx.beginPath();
  let started = false;
  for (let i = 0; i < RP.xs.length; i++) { if (RP.cum[i] > s) { const p = routeAtDist(s); ctx.lineTo(p.x, p.y); break; } if (!started) { ctx.moveTo(RP.xs[i], RP.ys[i]); started = true; } else ctx.lineTo(RP.xs[i], RP.ys[i]); }
  ctx.stroke(); ctx.restore();
  // three cars
  const a = ss(seg(t, T.dep1 - 1, T.dep1 - .3));
  for (let k = 2; k >= 0; k--) {
    const p = routeAtDist(s - k * 46); ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.rotate(p.a);
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = INK; ctx.lineWidth = 3.2; rrect(-20, -12, 40, 24, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = LC[N.ROUTE[p.leg].line]; ctx.fillRect(-11, -3.5, 22, 7);
    ctx.restore();
  }
  // a ring ripple at each change
  [[T.arr1, 'linden'], [T.arr2, 'ember']].forEach(([ta, id]) => { const sp = S.SP[id]; if (sp && t > ta) pingRings(sp.x, sp.y, t, ta, INK, 2, 74, .9); });
  const sp = S.SP.rook; if (sp && t > T.arr3 && t < T.arr3 + 1.2) pingRings(sp.x, sp.y, t, T.arr3, INK, 2, 74, 1.0);
}

// ------------------------------------------------------------------------------------------ screen-space: legend, journey, captions
function drawLegend(S, t) {
  const inA = ss(seg(t, T.legend, T.legend + .6)), outA = ss(seg(t, T.legendOut, T.legendOut + .6)), a = inA * (1 - outA); if (a <= 0) return;
  const X0 = 1530, Y0 = 70, PW = 360, slide = (1 - a) * 380;
  ctx.save(); ctx.translate(slide, 0);
  ctx.fillStyle = '#ECE6D8'; ctx.fillRect(X0 - 6, Y0 - 24, PW + 36, 800);
  ctx.fillStyle = INK; ctx.fillRect(X0 - 8, Y0 - 24, 3, 800 * ss(seg(t, T.legend, T.legend + .5)));
  ctx.textBaseline = 'alphabetic'; ctx.font = FONT(17); spaced('KEY TO THE MAP', X0 + 14, Y0 + 8, 3, SLATE);
  const rows = [
    { t0: T.rosette[0] - .3, y: Y0 + 30, ttl: 'Three angles', sub: '0°  ·  45°  ·  90°' },
    { t0: T.swatch[0] - .3, y: Y0 + 30 + 118, ttl: 'One line, one colour,', sub: 'one weight' },
    { t0: T.rowStop - .1, y: Y0 + 30 + 236, ttl: 'Tick: a stop', sub: 'Ring: a change' },
    { t0: T.zoneRow, y: Y0 + 30 + 354, ttl: 'Fare zones', sub: '1  ·  2  ·  3' },
  ];
  rows.forEach((r, i) => {
    const ra = ss(seg(t, r.t0, r.t0 + .35)); if (ra <= 0) return;
    ctx.save(); ctx.globalAlpha = ra; ctx.translate(0, (1 - ra) * 12);
    ctx.fillStyle = '#CFC8B6'; ctx.fillRect(X0 + 14, r.y - 10, PW - 28, 2);
    // icon at x = X0+56
    const cx = X0 + 62, cy = r.y + 52;
    if (i === 0) {
      ctx.strokeStyle = INK; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
      const spokes = [[0, 0], [180, 0], [90, 1], [270, 1], [45, 2], [135, 2], [225, 2], [315, 2]];
      spokes.forEach(([deg, g]) => { const u = ss(seg(t, T.rosette[g], T.rosette[g] + .25)); if (u <= 0) return; const rr = 34 * u, an = deg * Math.PI / 180; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, 3.6, 0, 7); ctx.fill(); });
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fill();
    } else if (i === 1) {
      LINES.forEach((L, k) => {
        const u = ss(seg(t, T.swatch[k], T.swatch[k] + .3)); if (u <= 0) return;
        const bx = cx - 48, by = cy - 40 + k * 17; ctx.globalAlpha = ra * u; ctx.fillStyle = L.color; ctx.fillRect(bx, by, 64 * u, LW_DIA);
        ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(bx + 64 * u + 12, by + LW_DIA / 2, 8.5, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = INK; ctx.font = FONT(13); ctx.textAlign = 'center'; ctx.fillText(String(L.num), bx + 64 * u + 12, by + LW_DIA / 2 + 4.5); ctx.textAlign = 'left';
      });
    } else if (i === 2) {
      ctx.strokeStyle = LC.fern; ctx.lineWidth = LW_DIA; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(cx - 52, cy - 20); ctx.lineTo(cx + 12, cy - 20); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(cx - 20, cy - 37); ctx.lineTo(cx - 20, cy - 3); ctx.stroke();
      ctx.strokeStyle = LC.copper; ctx.lineWidth = LW_DIA; ctx.beginPath(); ctx.moveTo(cx - 52, cy + 24); ctx.lineTo(cx + 12, cy + 24); ctx.stroke();
      ctx.strokeStyle = LC.ring; ctx.beginPath(); ctx.moveTo(cx - 20, cy + 6); ctx.lineTo(cx - 20, cy + 42); ctx.stroke();
      ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.arc(cx - 20, cy + 24, 15.5, 0, 7); ctx.fill(); ctx.stroke(); ctx.lineCap = 'round';
    } else {
      [[Z1_COL, 1], [Z2_COL, 2], ['#F4F0E8', 3]].forEach(([c, n], k) => { ctx.fillStyle = c; ctx.strokeStyle = '#B7AE95'; ctx.lineWidth = 2; ctx.fillRect(cx - 44 + k * 30, cy - 22, 28, 44); ctx.strokeRect(cx - 44 + k * 30, cy - 22, 28, 44); ctx.fillStyle = INK; ctx.font = FONT(17); ctx.textAlign = 'center'; ctx.fillText(String(n), cx - 30 + k * 30, cy + 6); ctx.textAlign = 'left'; });
    }
    ctx.restore();
    ctx.save(); ctx.globalAlpha = ra; ctx.textBaseline = 'alphabetic';
    boldText(r.ttl, X0 + 130, r.y + 40, 24, INK, .03); ctx.font = FONT(22); ctx.fillStyle = SLATE; ctx.fillText(r.sub, X0 + 130, r.y + 74);
    ctx.restore();
    ctx.font = FONT(24); const w1 = ctx.measureText(r.ttl).width;
    addText(S, 'leg:' + i, r.ttl + ' ' + r.sub, X0 + 130 + slide, r.y + 18, X0 + 130 + Math.max(w1, 150) + slide, r.y + 80);
  });
  ctx.restore();
  drawJourney(S, t, a, slide);
}
function drawJourney(S, t, aLeg, slide) {
  const a = ss(seg(t, T.journeyCard, T.journeyCard + .5)) * aLeg; if (a <= 0) return;
  const X0 = 1530, Y0 = 580;
  ctx.save(); ctx.translate(slide, 0); ctx.globalAlpha = a; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK; rrect(X0 + 10, Y0, 340, 236, 4); ctx.fill();
  ctx.font = FONT(17); spaced('YOUR JOURNEY', X0 + 28, Y0 + 32, 3, '#B9BDC6');
  const ts = trainState(t), s = t >= T.dep1 ? routeDist(ts) : 0, labels = [['fern', 'Fern', 'Quill Lane to Linden'], ['ring', 'Ring', 'Linden to Ember Wharf'], ['saffron', 'Saffron', 'Ember Wharf to Rook Point']];
  const curLeg = t < T.dep1 ? -1 : ts.leg;
  labels.forEach(([id, nm, sub], k) => {
    const y = Y0 + 58 + k * 40, on = curLeg === k, done = curLeg > k || t >= T.arr3;
    ctx.globalAlpha = a * (on || done ? 1 : .55);
    ctx.fillStyle = LC[id]; ctx.fillRect(X0 + 28, y, 8, 28);
    ctx.font = FONT(22); ctx.fillStyle = PAPER; ctx.fillText(nm, X0 + 48, y + 20); ctx.font = FONT(16); ctx.fillStyle = '#B9BDC6'; ctx.fillText(sub, X0 + 128, y + 20);
    if (done) { ctx.strokeStyle = LC[id]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X0 + 316, y + 14); ctx.lineTo(X0 + 322, y + 21); ctx.lineTo(X0 + 332, y + 7); ctx.stroke(); }
    else if (on) { ctx.fillStyle = LC[id]; ctx.beginPath(); ctx.arc(X0 + 322, y + 14, 5 + 1.5 * Math.sin(t * 6), 0, 7); ctx.fill(); }
  });
  ctx.globalAlpha = a;
  // progress bar by stop
  const total = ROUTE_STOPS.length - 1; let passed = 0; RP.stopD.forEach((d, i) => { if (d <= s + 2 && t >= T.dep1) passed = i; });
  const by = Y0 + 186; ctx.fillStyle = '#3A4256'; ctx.fillRect(X0 + 28, by, 304, 10);
  let x = X0 + 28; N.ROUTE.forEach((r, k) => { const len = (RP.legCum[k] - (k ? RP.legCum[k - 1] : 0)) / RP.total * 304; const fill = clamp((s - (k ? RP.legCum[k - 1] : 0)) / ((RP.legCum[k] - (k ? RP.legCum[k - 1] : 0))), 0, 1); ctx.fillStyle = LC[r.line]; ctx.fillRect(x, by, len * fill, 10); x += len; });
  ctx.font = FONT(22); ctx.fillStyle = PAPER; const msg = t >= T.arr3 ? `${total} stops · 2 changes` : `Stop ${passed} of ${total}`; ctx.fillText(msg, X0 + 28, by + 36);
  ctx.restore();
  if (a > .9) { addText(S, 'jc:title', 'YOUR JOURNEY', X0 + 28 + slide, Y0 + 16, X0 + 150 + slide, Y0 + 36); addText(S, 'jc:fern', 'Fern Quill Lane to Linden', X0 + 28 + slide, Y0 + 58, X0 + 330 + slide, Y0 + 86); addText(S, 'jc:ring', 'Ring Linden to Ember Wharf', X0 + 28 + slide, Y0 + 98, X0 + 330 + slide, Y0 + 126); addText(S, 'jc:saf', 'Saffron Ember Wharf to Rook Point', X0 + 28 + slide, Y0 + 138, X0 + 330 + slide, Y0 + 166); }
}
function drawCaption(S, t) {
  const s = SUBS.find(q => t >= q.t0 && t < q.t1); if (!s) return;
  const inA = ss(seg(t, s.t0, s.t0 + .22)), outA = ss(seg(t, s.t1 - .18, s.t1)), a = inA * (1 - outA);
  ctx.save(); ctx.font = FONT(30); const tw = ctx.measureText(s.text).width, PH = 64, PX = 64, PY = 958, w = tw + 74;
  ctx.beginPath(); ctx.rect(PX - 2, PY - 6, (w + 4) * inA, PH + 12); ctx.clip();
  ctx.globalAlpha = 1 - outA * .9; ctx.translate(0, outA * 8);
  ctx.fillStyle = INK; ctx.fillRect(PX, PY, w, PH);
  ctx.fillStyle = LC[s.stripe] || PALE; ctx.fillRect(PX, PY, 14, PH);
  ctx.fillStyle = PAPER; ctx.textBaseline = 'alphabetic'; ctx.fillText(s.text, PX + 38, PY + 43);
  ctx.restore();
}
function drawTitle(S, t) {
  const a = ss(seg(t, T.title, T.title + .7)); if (a <= 0) return;
  const w = 1040, h = 176, X = 960 - w / 2, Y = 790;
  ctx.save(); ctx.beginPath(); ctx.rect(X - 4, Y - 4, (w + 8) * a, h + 8); ctx.clip();
  ctx.fillStyle = INK; ctx.fillRect(X, Y, w, h);
  ctx.textBaseline = 'alphabetic'; ctx.font = FONT(78); const txt = 'THREE ANGLES TO ANYWHERE'; ctx.fillStyle = PAPER;
  const tw = spacedW(txt, 3); const sp = (w - 80 - tw) > 0 ? 3 : 1.5;
  ctx.font = FONT(68); const tw2 = spacedW(txt, 3); spaced(txt, X + (w - tw2) / 2, Y + 84, 3, PAPER);
  LINES.forEach((L, i) => { const bw = (w - 120) / 5; ctx.fillStyle = L.color; ctx.fillRect(X + 60 + i * bw + 4, Y + 120, bw - 8, 12); ctx.fillStyle = PAPER; ctx.font = FONT(20); ctx.textAlign = 'center'; ctx.fillText(L.name.toUpperCase(), X + 60 + i * bw + bw / 2, Y + 160); ctx.textAlign = 'left'; });
  ctx.restore();
  if (a >= 1) addText(S, 'title', 'THREE ANGLES TO ANYWHERE', X + (w - tw2) / 2, Y + 24, X + (w + tw2) / 2, Y + 96);
}

// ------------------------------------------------------------------------------------------ frame
function frame(t) {
  const S = buildState(t), C = S.C;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.setTransform(C.z, 0, 0, C.z, C.sx - C.cx * C.z, C.sy - C.cy * C.z);
  drawZones(S, t); drawGeo(S, t); drawRiver(S, t); drawLines(S, t); drawCaliper(S, t); drawStations(S, t); drawLabels(S, t);
  drawAngleDemo(S, t); drawCallouts(S, t); drawCartouche(S, t); drawDot(S, t);
  // pins and flag
  const q = S.SP.quill, r = S.SP.rook;
  if (q && t >= T.marker) { const out = 1 - ss(seg(t, T.dep1 - .4, T.dep1 + .2)); if (out > 0) { ctx.globalAlpha = out; pinAt(S, q.x, q.y, t, T.marker, 'YOU ARE HERE', 'pin:q'); ctx.globalAlpha = 1; } }
  if (r) { const fl = 1 - ss(seg(t, T.arr3 - .3, T.arr3 + .3)); if (t >= T.flag && fl > 0) { ctx.globalAlpha = fl; lantern(S, r.x, r.y, t, T.flag, 'flag:r'); ctx.globalAlpha = 1; } if (t >= T.arr3) pinAt(S, r.x, r.y, t, T.arr3 + .1, 'YOU ARE HERE', 'pin:r'); }
  drawTrain(S, t); if (t >= T.finalPulse) drawFinalPulse(S, t);
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  drawLegend(S, t); drawTitle(S, t); drawCaption(S, t);
  return S;
}

// ------------------------------------------------------------------------------------------ boot
async function boot() {
  await document.fonts.load('500 24px Barlow');
  const get = async (u, d) => { try { const r = await fetch(u); return r.ok ? await r.json() : d; } catch (e) { return d; } };
  LABELS = await get('labels.json', {});
  DUR_V = await get('voices/dur.json', {});
  const fall = { v1: 3.7, v2: 4.7, v3: 4.2, v4: 2.6, v5: 2.9, v6: 1.8, v7: 3.8, v8a: 1.84, v8b: 2.12, v8c: 1.34, v9: 2.71 };
  SUBS = subtitles({ ...fall, ...DUR_V });
  ctx.font = FONT(SIZE); const ids = Object.keys(ST);
  ids.forEach((id, i) => {
    const multi = ST[id].lines.length > 1, px = multi ? SIZE_X : SIZE; ctx.font = FONT(px);
    LW[id] = ctx.measureText(ST[id].name).width + 2 * HALO;
    GEODIR[id] = GDIRS[Math.floor(hash(i * 3.7 + 1) * GDIRS.length)]; AG[id] = (hash(i * 5.3 + 2) - .5) * .62;
    if (!LABELS[id]) LABELS[id] = 'e';
  });
  STREETS = N.makeStreets();
  // reveal times of stations during the opening: when the pen reaches them (geography shape at t = 0)
  for (const L of LINES) {
    const o = buildPath(L.wps, L.closed, 0), tot = o.cum[o.cum.length - 1];
    L.wps.forEach((w, i) => { if (!w.st) return; const f = o.cum[o.map[i]] / tot, tr = T.pen[L.id] + f * T.penDur; REVEAL[w.st] = Math.min(REVEAL[w.st] ?? 99, tr); });
  }
  initRoute();
  window.EV = events();
  window.DUR = DUR;
  window.render = t => { collect = null; frame(t); };
  window.TEXTS = t => { collect = []; frame(t); const c = collect; collect = null; return c; };
  window.READY = true;
}
boot();
