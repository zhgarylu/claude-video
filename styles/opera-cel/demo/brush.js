// brush.js — the ink-and-pigment engine of the opera-cel style.
// Points are [x,y] arrays. A shape = flattened polyline. Everything is deterministic (seeded).
import { mulberry, vnoise, clamp, lerp, ss } from '/core/lib.js';

// ---------- pigments (mineral colours, never pure black / pure white) ----------
export const PAL = {
  ink: '#241913', inkBlue: '#1d2744', inkRed: '#5a1a14',
  cinnabar: '#c9382b', vermilion: '#aa2a20', rouge: '#d9604c',
  malachite: '#2f8d6a', malaLt: '#6bb092', malaDk: '#1e6049',
  azurite: '#2b5f9b', azuLt: '#6c97c4', indigo: '#22305a',
  gold: '#d6a13a', goldLt: '#ecc766', goldDk: '#a87626', ochre: '#bd8a45',
  white: '#f3ead4', cream: '#ead9b2', skin: '#f2d8bd', skinDk: '#e2b896',
  paper: '#e9d8ae', paperDk: '#d9c18f', plum: '#6a2e4a',
};

const rgbOf = c => { if (c[0] === '#') { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; } const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; };
export function shade(hex, k) {            // k<1 darker, k>1 lighter (towards white)
  const [r, g, b] = rgbOf(hex);
  const f = c => Math.round(clamp(k <= 1 ? c * k : c + (255 - c) * (k - 1), 0, 255));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
export function mix(a, b, t) {
  const A = rgbOf(a), B = rgbOf(b);
  const f = (i) => Math.round(lerp(A[i], B[i], t));
  return `rgb(${f(0)},${f(1)},${f(2)})`;
}
export const LW = { k: 1 };   // global line-weight multiplier

// ---------- path building ----------
const hyp = Math.hypot;
export function bez(p0, p1, p2, p3, step = 5) {
  const n = Math.max(6, Math.ceil((hyp(p1[0] - p0[0], p1[1] - p0[1]) + hyp(p2[0] - p1[0], p2[1] - p1[1]) + hyp(p3[0] - p2[0], p3[1] - p2[1])) / step));
  const o = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
            u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return o;
}
// Catmull-Rom through points. Duplicate a point to make a corner.
export function spl(P, closed = false, step = 5, tension = .5) {
  const n = P.length, o = [];
  const g = i => closed ? P[(i + n) % n] : P[clamp(i, 0, n - 1)];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const d = hyp(p2[0] - p1[0], p2[1] - p1[1]);
    if (d < 1e-6) continue;
    const k = Math.max(2, Math.ceil(d / step));
    const t1 = [(p2[0] - p0[0]) * tension, (p2[1] - p0[1]) * tension], t2 = [(p3[0] - p1[0]) * tension, (p3[1] - p1[1]) * tension];
    for (let j = 0; j < k; j++) {
      const t = j / k, t2_ = t * t, t3 = t2_ * t;
      const h1 = 2 * t3 - 3 * t2_ + 1, h2 = -2 * t3 + 3 * t2_, h3 = t3 - 2 * t2_ + t, h4 = t3 - t2_;
      o.push([h1 * p1[0] + h2 * p2[0] + h3 * t1[0] + h4 * t2[0], h1 * p1[1] + h2 * p2[1] + h3 * t1[1] + h4 * t2[1]]);
    }
  }
  if (!closed) o.push(P[n - 1].slice());
  return o;
}
export function line(a, b, step = 6) {
  const n = Math.max(1, Math.ceil(hyp(b[0] - a[0], b[1] - a[1]) / step)), o = [];
  for (let i = 0; i <= n; i++) o.push([lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)]);
  return o;
}
export function arc(cx, cy, rx, ry, a0, a1, step = 5) {
  const n = Math.max(6, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) / step)), o = [];
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return o;
}
export const cat = (...arrs) => { const o = []; for (const a of arrs) for (let i = 0; i < a.length; i++) { if (o.length && i === 0 && hyp(o[o.length - 1][0] - a[0][0], o[o.length - 1][1] - a[0][1]) < .5) continue; o.push(a[i]); } return o; };
export const rev = a => a.slice().reverse();
export const mapP = (a, f) => a.map(p => f(p));
export const mirrorX = a => a.map(p => [-p[0], p[1]]);
export function trace(ctx, pts, close = true) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}
export function bbox(pts) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}
export function resample(pts, d = 2.4, closed = false) {
  const o = [pts[0].slice()]; let acc = 0;
  const m = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    let seg = hyp(b[0] - a[0], b[1] - a[1]); if (seg < 1e-6) continue;
    let pos = d - acc;
    while (pos <= seg) { const t = pos / seg; o.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t)]); pos += d; }
    acc = seg - (pos - d);
  }
  if (!closed) o.push(pts[pts.length - 1].slice());
  return o;
}
export function area(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
export function perim(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += hyp(b[0] - a[0], b[1] - a[1]); } return s; }

// ---------- textures (built once) ----------
let MOTT = null, GRAIN = null;
function noiseTile(sz, lo, hi, scales, seed) {
  const c = document.createElement('canvas'); c.width = c.height = sz;
  const x = c.getContext('2d'), im = x.createImageData(sz, sz), r = mulberry(seed);
  const grids = scales.map(s => { const n = Math.ceil(sz / s) + 1, g = []; for (let i = 0; i < n * n; i++) g.push(r()); return { s, n, g }; });
  for (let j = 0; j < sz; j++) for (let i = 0; i < sz; i++) {
    let v = 0, wsum = 0;
    for (const { s, n, g } of grids) {
      const fx = i / s, fy = j / s, ix = Math.floor(fx) % (n - 1), iy = Math.floor(fy) % (n - 1), tx = fx - Math.floor(fx), ty = fy - Math.floor(fy);
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = g[iy * n + ix], b = g[iy * n + ix + 1], cc = g[(iy + 1) * n + ix], d = g[(iy + 1) * n + ix + 1];
      v += lerp(lerp(a, b, sx), lerp(cc, d, sx), sy) * s; wsum += s;
    }
    v /= wsum; const k = (j * sz + i) * 4, l = Math.round(lerp(lo, hi, v));
    im.data[k] = im.data[k + 1] = im.data[k + 2] = l; im.data[k + 3] = 255;
  }
  x.putImageData(im, 0, 0); return c;
}
export function textures(ctx) {
  if (!MOTT) {
    const t = noiseTile(256, 205, 255, [64, 22, 7, 2], 11);
    MOTT = ctx.createPattern(t, 'repeat');
    const g = noiseTile(256, 232, 255, [3, 1.5], 29);
    GRAIN = ctx.createPattern(g, 'repeat');
  }
  return { MOTT, GRAIN };
}

// ---------- the brush ----------
// Variable-width ink along an open polyline. Taper ends, pressure noise, direction-dependent width.
export function ink(ctx, pts, o = {}) {
  const { w = 4, col = PAL.ink, seed = 1, taper = [.16, .16], minw = .22, press = .4, dry = 0, alpha = 1, light = 0, wob = .35, closed = false, orient = 1 } = o;
  if (pts.length < 2) return;
  const rs = resample(pts, 2.2, closed); const n = rs.length; if (n < 3) return;
  const ph = mulberry(seed * 977 | 0)() * 90;
  const Ls = [0]; for (let i = 1; i < n; i++) Ls.push(Ls[i - 1] + hyp(rs[i][0] - rs[i - 1][0], rs[i][1] - rs[i - 1][1]));
  const tot = Ls[n - 1] || 1;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = rs[Math.max(0, i - 2)], b = rs[Math.min(n - 1, i + 2)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = hyp(tx, ty) || 1; tx /= tl; ty /= tl;
    const nx = -ty * orient, ny = tx * orient;
    const s = Ls[i];
    const a0 = taper[0] > 0 ? ss(s / (taper[0] * tot + 1e-6) * (tot > 80 ? 1 : 1.5)) : 1;
    const b0 = taper[1] > 0 ? ss((tot - s) / (taper[1] * tot + 1e-6) * (tot > 80 ? 1 : 1.5)) : 1;
    const prof = minw + (1 - minw) * Math.min(a0, b0);
    const pr = (1 - press * .5 + press * (vnoise(s / 38 + ph) * 2 - 1) * .8) * (1 + .16 * Math.sin(s / 21 + ph * 3) * (vnoise(s / 70 + ph) > .45 ? 1 : .3));   // stop-and-go pressure
    const ang = Math.atan2(ty, tx);
    const dirf = 1 + .16 * Math.sin(ang - .7);
    const lf = 1 + light * (nx * .35 + ny * .65);            // thicker on the shade side
    const ww = Math.max(.35, w * prof * pr * dirf * lf) * .5;
    const jx = (vnoise(s / 9 + ph * 2) - .5) * wob * 2, jy = (vnoise(s / 9 + ph * 3) - .5) * wob * 2;
    const x = rs[i][0] + jx, y = rs[i][1] + jy;
    L.push([x + nx * ww, y + ny * ww]); R.push([x - nx * ww, y - ny * ww]);
  }
  if (dry > 0) {   // flying-white: the stroke is drawn as bristle strips that drop out where the brush runs dry
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = col; const K = 6;
    for (let k = 0; k < K; k++) {
      const a0 = k / K, a1 = (k + 1) / K; let on = false, run = [];
      const flush = () => { if (run.length > 2) { ctx.beginPath(); ctx.moveTo(run[0][0][0], run[0][0][1]); for (const q of run) ctx.lineTo(q[0][0], q[0][1]); for (let j = run.length - 1; j >= 0; j--) ctx.lineTo(run[j][1][0], run[j][1][1]); ctx.closePath(); ctx.fill(); } run = []; };
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), gap = vnoise(Ls[i] / 11 + k * 5.7 + ph) < dry * (.35 + u * .9) * (k % 2 ? 1.1 : .8);
        if (gap) { flush(); continue; }
        run.push([[lerp(L[i][0], R[i][0], a0), lerp(L[i][1], R[i][1], a0)], [lerp(L[i][0], R[i][0], a1), lerp(L[i][1], R[i][1], a1)]]);
      }
      flush();
    }
    ctx.restore(); return;
  }
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath(); ctx.fill();
  if (!closed) {   // round-ish caps
    const e0 = hyp(L[0][0] - R[0][0], L[0][1] - R[0][1]) / 2, e1 = hyp(L[n - 1][0] - R[n - 1][0], L[n - 1][1] - R[n - 1][1]) / 2;
    ctx.beginPath(); ctx.arc((L[0][0] + R[0][0]) / 2, (L[0][1] + R[0][1]) / 2, e0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc((L[n - 1][0] + R[n - 1][0]) / 2, (L[n - 1][1] + R[n - 1][1]) / 2, e1, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// A closed outline traced by a hand: several overlapping strokes with their own tapers.
export function inkLoop(ctx, pts, o = {}) {
  const { w = 5, seed = 1 } = o;
  const rs = resample(pts, 2.2, true), n = rs.length; if (n < 8) return;
  const rnd = mulberry(seed * 331 | 0);
  const orient = area(pts) > 0 ? 1 : -1;
  const per = n * 2.2;
  const nChunks = Math.max(1, Math.round(per / (w * 70 + 120)));
  const start = Math.floor(rnd() * n);
  const cl = Math.ceil(n / nChunks), ov = Math.min(10, Math.ceil(cl * .08));
  for (let k = 0; k < nChunks; k++) {
    const a = start + k * cl, len = (k === nChunks - 1 ? n - k * cl : cl) + ov;
    const seg = []; for (let i = 0; i < len; i++) seg.push(rs[(a + i) % n]);
    ink(ctx, seg, { ...o, seed: seed * 13 + k, taper: nChunks === 1 ? [.04, .04] : [.2, .22], minw: nChunks === 1 ? .55 : .5, orient, closed: false });
  }
}

// ---------- pigment fill ----------
// o: fill colour, line colour/width, mott (0..1), pool (edge pooling), skipLine
export function cel(ctx, pts, fill, o = {}) {
  const { line = (typeof fill === 'string' ? mix(fill, PAL.ink, .8) : PAL.ink), lw = 4.5, seed = 1, mott = .5, pool = .22, reg = [1.2, .9], noLine = false, sheen = false, light = .5, linePress = .3 } = o;
  const { MOTT } = textures(ctx);
  ctx.save();
  if (fill) {
    ctx.save();
    ctx.translate(reg[0], reg[1]); trace(ctx, pts); ctx.fillStyle = fill; ctx.fill();
    ctx.clip();
    const [x0, y0, x1, y1] = bbox(pts);
    ctx.translate(-reg[0], -reg[1]);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = mott; ctx.fillStyle = MOTT; ctx.fillRect(x0 - 12, y0 - 12, x1 - x0 + 24, y1 - y0 + 24);
    if (pool > 0) { ctx.globalAlpha = pool; ctx.strokeStyle = shade(typeof fill === 'string' ? fill : PAL.cream, .55); ctx.lineWidth = 12; trace(ctx, pts); ctx.stroke(); }
    if (sheen) goldSheen(ctx, pts, seed);
    ctx.restore();
  }
  ctx.restore();
  if (!noLine) inkLoop(ctx, pts, { w: lw * LW.k, col: line, seed, light, press: linePress });
}
export function goldSheen(ctx, pts, seed) {
  const [x0, y0, x1, y1] = bbox(pts), r = mulberry(seed * 53 | 0);
  ctx.save(); ctx.globalCompositeOperation = 'source-over';
  const cnt = Math.min(160, ((x1 - x0) * (y1 - y0)) / 90 | 0);
  for (let i = 0; i < cnt; i++) {
    const x = lerp(x0, x1, r()), y = lerp(y0, y1, r());
    ctx.globalAlpha = .1 + r() * .22; ctx.fillStyle = r() < .6 ? PAL.goldLt : PAL.goldDk;
    ctx.fillRect(x, y, 1 + r() * 2.4, 1 + r() * 1.4);
  }
  ctx.restore();
}
// A polygon filled flat with no outline and no texture (for shadows under cels, glows).
export function flat(ctx, pts, col, alpha = 1) { ctx.save(); ctx.globalAlpha *= alpha; trace(ctx, pts); ctx.fillStyle = col; ctx.fill(); ctx.restore(); }
export function clipTo(ctx, pts) { trace(ctx, pts); ctx.clip(); }

// ---------- convenience ----------
export const rr = (seed) => mulberry(seed * 4001 | 0);
// tapered limb / sleeve capsule between a and b with half-widths wa, wb
export function capsule(a, b, wa, wb, bulge = 0) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = hyp(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, wm = (wa + wb) / 2 + bulge;
  const A1 = [a[0] + nx * wa, a[1] + ny * wa], A2 = [a[0] - nx * wa, a[1] - ny * wa];
  const B1 = [b[0] + nx * wb, b[1] + ny * wb], B2 = [b[0] - nx * wb, b[1] - ny * wb];
  const M1 = [mx + nx * wm, my + ny * wm], M2 = [mx - nx * wm, my - ny * wm];
  const ang = Math.atan2(dy, dx);
  const capB = arc(b[0], b[1], wb, wb, ang - Math.PI / 2, ang + Math.PI / 2, 4);
  const capA = arc(a[0], a[1], wa, wa, ang + Math.PI / 2, ang + Math.PI * 1.5, 4);
  return cat(spl([A1, M1, B1], false, 4), capB, spl([B2, M2, A2], false, 4), capA);
}

// smooth tube along a centre-line through joints, widths at given fractions [[u,w],…]; rounded ends
export function tube(joints, ws, tension = .5) {
  const c = resample(spl(joints, false, 4, tension), 4), n = c.length;
  const Ls = [0]; for (let i = 1; i < n; i++) Ls.push(Ls[i - 1] + hyp(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
  const tot = Ls[n - 1] || 1;
  const wf = u => { for (let i = 0; i < ws.length - 1; i++) if (u <= ws[i + 1][0]) { const t = (u - ws[i][0]) / (ws[i + 1][0] - ws[i][0]); return lerp(ws[i][1], ws[i + 1][1], ss(clamp(t, 0, 1))); } return ws[ws.length - 1][1]; };
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = c[Math.max(0, i - 1)], b = c[Math.min(n - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = hyp(tx, ty) || 1; tx /= l; ty /= l;
    const w = wf(Ls[i] / tot); L.push([c[i][0] - ty * w, c[i][1] + tx * w]); R.push([c[i][0] + ty * w, c[i][1] - tx * w]);
  }
  const w0 = wf(0), w1 = wf(1), a0 = Math.atan2(c[1][1] - c[0][1], c[1][0] - c[0][0]), a1 = Math.atan2(c[n - 1][1] - c[n - 2][1], c[n - 1][0] - c[n - 2][0]);
  return cat(L, arc(c[n - 1][0], c[n - 1][1], w1, w1, a1 - Math.PI / 2, a1 + Math.PI / 2, 4), rev(R), arc(c[0][0], c[0][1], w0, w0, a0 + Math.PI / 2, a0 + Math.PI * 1.5, 4));
}
