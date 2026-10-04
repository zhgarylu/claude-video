// brush.js: the painter's hand. Iron-wire line, halo-shaded (quantan) fills, tapered tubes, twisting ribbons, mineral palette.
import { clamp, lerp, vnoise, TAU } from '/core/lib.js';

export const PAL = {
  cinnabar: '#c4402a', cinnabarD: '#7a2216', cinnabarL: '#df6a46',
  malachite: '#3f8d66', malachiteD: '#1d4f38', malachiteL: '#86c19a',
  azurite: '#2f64a6', azuriteD: '#143460', azuriteL: '#76a4da',
  ochre: '#cc903c', ochreD: '#8c5a1e', ochreL: '#e8c476',
  lead: '#f2ead3', leadD: '#c9b98f',
  flesh: '#f6d6b8', fleshD: '#b0503c',
  soot: '#2a1d18', rust: '#3d1710',
  earth: '#74301f', earthD: '#451810',
};
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mix = (a, b, t) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join(''); };

export function catmull(pts, n = 8, closed = false) {
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  const out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  if (!closed) out.push(pts[pts.length - 1]);
  return out;
}
export function polyPath(ctx, pts) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
const normals = (p) => p.map((q, i) => { const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });

// Iron-wire line (tiexian): even, springy, confident. Width barely changes; the ends are tucked in.
export function wire(ctx, pts, w = 3, col = PAL.soot, o = {}) {
  const p = o.raw ? pts : catmull(pts, 7), N = normals(p), seed = o.seed || 0, n = p.length;
  if (n < 2) return;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), tp = Math.min(1, u / Math.max(.001, o.t0 ?? .08)), tq = Math.min(1, (1 - u) / Math.max(.001, o.t1 ?? .14));
    const ww = w * (.5 + .5 * Math.sqrt(Math.min(tp, tq))) * (.72 + .56 * vnoise(i * .16 + seed)) * .5;
    L.push([p[i][0] + N[i][0] * ww, p[i][1] + N[i][1] * ww]); R.push([p[i][0] - N[i][0] * ww, p[i][1] - N[i][1] * ww]);
  }
  ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
}

// Halo-shaded fill (quantan): flat colour with the edge stepped darker, in a few visible rings.
export function halo(ctx, pts, base, edge, width = 10, bands = 4, alpha = .3) {
  ctx.save();
  ctx.beginPath(); polyPath(ctx, pts); ctx.fillStyle = base; ctx.fill(); ctx.clip();
  ctx.lineJoin = 'round';
  for (let k = 0; k < bands; k++) {
    ctx.beginPath(); polyPath(ctx, pts);
    ctx.lineWidth = 2 * width * (1 - k / bands); ctx.strokeStyle = edge; ctx.globalAlpha = alpha; ctx.stroke();
  }
  ctx.restore();
}

// A tapered tube along a spine: returns the outline polygon (round caps).
export function tubePoly(spine, widths, caps = true) {
  const p = catmull(spine, 9), N = normals(p), n = p.length, L = [], R = [];
  const wAt = u => { const f = u * (widths.length - 1), i = Math.min(widths.length - 2, Math.floor(f)); return lerp(widths[i], widths[i + 1], f - i); };
  for (let i = 0; i < n; i++) { const w = wAt(i / (n - 1)) / 2; L.push([p[i][0] + N[i][0] * w, p[i][1] + N[i][1] * w]); R.push([p[i][0] - N[i][0] * w, p[i][1] - N[i][1] * w]); }
  let poly = [...L];
  if (caps) { const a = p[n - 1], w = wAt(1) / 2, t = Math.atan2(N[n - 1][1], N[n - 1][0]); for (let k = 1; k < 6; k++) { const q = t - Math.PI * k / 6; poly.push([a[0] + Math.cos(q) * w, a[1] + Math.sin(q) * w]); } }
  poly.push(...R.reverse());
  if (caps) { const a = p[0], w = wAt(0) / 2, t = Math.atan2(N[0][1], N[0][0]) + Math.PI; for (let k = 1; k < 6; k++) { const q = t - Math.PI * k / 6; poly.push([a[0] + Math.cos(q) * w, a[1] + Math.sin(q) * w]); } }
  return { poly, L, R, spine: p };
}
// a limb or any rounded body part: halo fill + wire on both sides
export function limb(ctx, spine, widths, base, edge, line, lw, o = {}) {
  const t = tubePoly(spine, widths);
  halo(ctx, t.poly, base, edge, o.halo ?? Math.max(3, widths[0] * .35), 4, o.alpha ?? .24);
  if (!o.noLine) { wire(ctx, t.L, lw, line, { raw: true, t0: .0, t1: .05 }); wire(ctx, t.R, lw, line, { raw: true, t0: .0, t1: .05 }); }
  return t;
}

// ribbon (piaodai): a long band that twists as the wind runs down it. Front face and back face are different pigments.
// spine(s,t) -> [x,y]; hw(s) half width; twist phase = tw0 + tk*s - tw*t
export function ribbon(ctx, spineFn, o) {
  const n = o.n || 70, t = o.t || 0, pts = [], cs = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n; pts.push(spineFn(s, t));
    const ph = (o.tw0 || 0) + (o.tk || 5) * s - (o.tw || 3.2) * t; cs.push(Math.cos(ph));
  }
  const N = normals(pts), Ls = [], Rs = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, c = cs[i], w = (o.hw(s)) * (Math.sign(c) * Math.max(.07, Math.abs(c)));
    Ls.push([pts[i][0] + N[i][0] * w, pts[i][1] + N[i][1] * w]); Rs.push([pts[i][0] - N[i][0] * w, pts[i][1] - N[i][1] * w]);
  }
  const front = o.front, back = o.back, edge = o.edge || PAL.soot;
  for (let i = 0; i < n; i++) {
    const c = (cs[i] + cs[i + 1]) / 2, face = c >= 0 ? front : back, dark = mix(face, o.shadow || PAL.earthD, .35);
    const sh = Math.abs(c) < .3 ? 1 - Math.abs(c) / .3 : 0;       // edge-on: darker
    ctx.beginPath(); ctx.moveTo(Ls[i][0], Ls[i][1]); ctx.lineTo(Ls[i + 1][0], Ls[i + 1][1]); ctx.lineTo(Rs[i + 1][0], Rs[i + 1][1]); ctx.lineTo(Rs[i][0], Rs[i][1]); ctx.closePath();
    ctx.fillStyle = mix(face, dark, sh * .8); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = .8; ctx.stroke();
    // halo band: lighter centre, darker rim
    const k = .55;
    const ml = (a, b) => [lerp(a[0], b[0], .5 * (1 - k)), lerp(a[1], b[1], .5 * (1 - k))];
    const a0 = ml(Ls[i], Rs[i]), a1 = ml(Ls[i + 1], Rs[i + 1]), b0 = ml(Rs[i], Ls[i]), b1 = ml(Rs[i + 1], Ls[i + 1]);
    ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.lineTo(b1[0], b1[1]); ctx.lineTo(b0[0], b0[1]); ctx.closePath();
    ctx.fillStyle = mix(face, '#ffffff', .12 * (1 - sh)); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = .8; ctx.stroke();
  }
  wire(ctx, Ls, o.lw || 2.4, edge, { raw: true, seed: 3 }); wire(ctx, Rs, o.lw || 2.4, edge, { raw: true, seed: 9 });
  return pts;
}
