// thread.js — the stitch rasterizer: one thread segment = one lit, twisted, shadowed capsule.
// Everything is drawn in world units under the current canvas transform; ENV.z is the camera zoom
// (canvas shadow offsets/blur are in device pixels, so they must be scaled by hand).
import { clamp, mulberry, TAU } from '/core/lib.js';

export const ENV = { z: 1 };
// Direction TOWARD the light, screen space (y down): from the upper left. Fixed for the whole film.
export const LIGHT = (() => { const x = -0.55, y = -0.83, l = Math.hypot(x, y); return { x: x / l, y: y / l }; })();

export const rgb = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
export const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const shade = (c, k) => c.map(v => clamp(v * k, 0, 255));
export const lift = (c, k) => c.map(v => v + (255 - v) * k);
export const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// The floss box: a closed palette. Everything in the film is one of these (plus fabric, wood, felt).
export const FLOSS = {
  madder: rgb('#b0372b'), mustard: rgb('#d8a52f'), moss: rgb('#5f8236'), indigo: rgb('#2c4b82'),
  ecru: rgb('#f1dfb4'), char: rgb('#2c2a2f'), teal: rgb('#2f6a6e'), rose: rgb('#d9857a'),
};

function shadowOn(ctx, w, k = 1) {
  const z = ENV.z;
  ctx.shadowColor = `rgba(24,14,6,${0.42 * k})`;
  ctx.shadowBlur = Math.max(1, w * 0.42 * z);
  ctx.shadowOffsetX = -LIGHT.x * w * 0.26 * z;
  ctx.shadowOffsetY = -LIGHT.y * w * 0.26 * z;
}
const shadowOff = ctx => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = ctx.shadowOffsetY = 0; };

// One thread segment a -> b. o: gloss (0 cotton .. 1 silk), tone, bow (curvature, fraction of length), seed,
// sink (dark entry holes at the ends), fuzz (wool halo), ply (twist marks), lift (height above fabric: bigger shadow)
export function thread(ctx, a, b, w, col, o = {}) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
  if (L < 0.3) return;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const gloss = o.gloss ?? 0.45, bow = o.bow || 0;
  const rnd = mulberry(o.seed ?? (Math.round(a.x * 7 + a.y * 13 + b.x * 3) | 0));
  // thread axis vs light: the sheen is strongest when the thread lies across the light (satin look)
  const cr = ux * LIGHT.y - uy * LIGHT.x, perp = Math.abs(cr), side = cr >= 0 ? 1 : -1;
  const tone = (o.tone ?? 1) * (0.85 + 0.27 * perp * gloss + (rnd() - 0.5) * 0.05);
  const base = shade(col, tone), hi = lift(col, 0.1 + 0.55 * gloss * perp), dk = shade(col, 0.46);
  const h = w / 2;
  const q = (t, off = 0) => { // point on the (bowed) centre line, offset along the chord normal
    const mx = (a.x + b.x) / 2 + nx * bow * L, my = (a.y + b.y) / 2 + ny * bow * L, s = 1 - t;
    return { x: s * s * a.x + 2 * s * t * mx + t * t * b.x + nx * off, y: s * s * a.y + 2 * s * t * my + t * t * b.y + ny * off };
  };
  const ih = L > 2.6 * h ? h * 0.7 : 0;
  const A = q(ih / L), B = q(1 - ih / L);
  // sink holes
  if (o.sink !== false && L > 2 * h) {
    ctx.fillStyle = css([18, 10, 5], 0.22);
    for (const p of [a, b]) { ctx.beginPath(); ctx.arc(p.x, p.y, h * 0.72, 0, TAU); ctx.fill(); }
  }
  // body: stroke with a gradient across the thread (lit edge, highlight, body, shadow edge)
  const g = ctx.createLinearGradient(a.x - nx * h, a.y - ny * h, a.x + nx * h, a.y + ny * h);
  const prof = [[0, css(shade(col, 0.9 * tone + 0.05))], [0.2, css(hi)], [0.5, css(base)], [0.82, css(shade(col, 0.66 * tone))], [1, css(dk)]];
  for (const [u, c] of prof) g.addColorStop(side > 0 ? 1 - u : u, c);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = g; ctx.lineWidth = w;
  shadowOn(ctx, w, (o.lift ? 1.5 : 1) * (o.shadow ?? 1));
  if (o.lift) { const z = ENV.z; ctx.shadowOffsetX *= 1 + o.lift; ctx.shadowOffsetY *= 1 + o.lift; ctx.shadowBlur *= 1 + o.lift * 0.8; }
  ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo((a.x + b.x) / 2 + nx * bow * L, (a.y + b.y) / 2 + ny * bow * L, B.x, B.y); ctx.stroke();
  shadowOff(ctx);
  if (w < 3.2) return;
  // strands along the thread
  const ns = w > 9 ? 4 : 3;
  for (let i = 0; i < ns; i++) {
    const off = ((i + 0.5) / ns - 0.5) * w * 0.74 + (rnd() - 0.5) * w * 0.08;
    const p0 = q(ih / L, off), p1 = q(1 - ih / L, off), mid = q(0.5, off);
    ctx.strokeStyle = (i + (rnd() < 0.3 ? 1 : 0)) % 2 ? css(lift(col, 0.3), 0.1 + 0.22 * gloss) : css(shade(col, 0.55), 0.2);
    ctx.lineWidth = Math.max(0.55, w * 0.075);
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.quadraticCurveTo(mid.x * 2 - (p0.x + p1.x) / 2, mid.y * 2 - (p0.y + p1.y) / 2, p1.x, p1.y); ctx.stroke();
  }
  // twist: slanted marks every ~0.7 w along the thread
  if (o.ply !== false && L > w * 1.2) {
    const step = Math.max(2.2, w * 0.62), n = Math.floor(L / step), sl = o.twist ?? 0.5;
    ctx.lineWidth = Math.max(0.6, w * 0.06);
    for (let i = 1; i < n; i++) {
      const t = i / n, c = q(t), j = (rnd() - 0.5) * step * 0.2;
      const e0 = { x: c.x - nx * h * 0.84 - ux * sl * w * 0.3 + ux * j, y: c.y - ny * h * 0.84 - uy * sl * w * 0.3 + uy * j };
      const e1 = { x: c.x + nx * h * 0.84 + ux * sl * w * 0.3 + ux * j, y: c.y + ny * h * 0.84 + uy * sl * w * 0.3 + uy * j };
      ctx.strokeStyle = css(shade(col, 0.45), (o.plyA ?? 0.16) + 0.05 * (1 - gloss));
      ctx.beginPath(); ctx.moveTo(e0.x, e0.y); ctx.lineTo(e1.x, e1.y); ctx.stroke();
      ctx.strokeStyle = css(lift(col, 0.4), 0.06 + 0.12 * gloss * perp);
      ctx.beginPath(); ctx.moveTo(e0.x + ux * step * 0.3, e0.y + uy * step * 0.3); ctx.lineTo(e1.x + ux * step * 0.3, e1.y + uy * step * 0.3); ctx.stroke();
    }
  }
  // wool halo
  if (o.fuzz) {
    const cnt = Math.min(60, Math.floor(L * w * 0.018 * o.fuzz));
    ctx.lineWidth = Math.max(0.5, w * 0.03);
    for (let i = 0; i < cnt; i++) {
      const c = q(rnd()), s = rnd() < 0.5 ? -1 : 1, st = { x: c.x + nx * s * h * (0.7 + rnd() * 0.3), y: c.y + ny * s * h * (0.7 + rnd() * 0.3) };
      const ang = Math.atan2(ny * s, nx * s) + (rnd() - 0.5) * 2.0, ll = w * (0.25 + rnd() * 0.5);
      ctx.strokeStyle = css(rnd() < 0.5 ? lift(col, 0.35) : shade(col, 0.7), 0.18 + rnd() * 0.18);
      ctx.beginPath(); ctx.moveTo(st.x, st.y); ctx.quadraticCurveTo(st.x + Math.cos(ang) * ll * 0.5 + ux * ll * 0.2, st.y + Math.sin(ang) * ll * 0.5 + uy * ll * 0.2, st.x + Math.cos(ang) * ll, st.y + Math.sin(ang) * ll); ctx.stroke();
    }
  }
}

// French knot: a coil of thread pulled tight, a small bobbly ball with a dimple.
export function knot(ctx, p, r, col, o = {}) {
  const rnd = mulberry(o.seed ?? ((p.x * 31 + p.y * 17) | 0)), z = ENV.z, k = o.scale ?? 1;
  r *= k;
  // sink ring + shadow
  ctx.fillStyle = css([18, 10, 5], 0.3); ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.06, 0, TAU); ctx.fill();
  ctx.save();
  shadowOn(ctx, r * 2.2, 1.0);
  ctx.fillStyle = css(shade(col, 0.5)); ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.96, 0, TAU); ctx.fill();
  shadowOff(ctx); ctx.restore();
  const blob = (cx, cy, rr, t = 1) => {
    const g = ctx.createRadialGradient(cx + LIGHT.x * rr * 0.45, cy + LIGHT.y * rr * 0.45, rr * 0.05, cx, cy, rr);
    g.addColorStop(0, css(lift(col, 0.55 * (o.gloss ?? 0.45) + 0.12))); g.addColorStop(0.35, css(shade(col, 1.0 * t)));
    g.addColorStop(0.8, css(mixc(shade(col, 0.68 * t), [110, 60, 25], 0.22))); g.addColorStop(1, css(mixc(shade(col, 0.4), [60, 28, 10], 0.3)));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill();
  };
  const m = 5, a0 = rnd() * TAU, ring = [];
  for (let i = 0; i < m; i++) { const a = a0 + i / m * TAU + (rnd() - 0.5) * 0.3; ring.push({ y: p.y + Math.sin(a) * r * 0.5, a }); }
  ring.sort((u, v) => u.y - v.y);
  for (const q of ring) blob(p.x + Math.cos(q.a) * r * 0.5, q.y, r * 0.58, 0.95);
  blob(p.x + (rnd() - 0.5) * r * 0.1, p.y - r * 0.05, r * 0.62, 1.04);
  // coil marks
  ctx.lineWidth = Math.max(0.6, r * 0.09);
  for (let i = 0; i < 3; i++) {
    const a = a0 + i * 2.1 + rnd();
    ctx.strokeStyle = css(shade(col, 0.4), 0.28); ctx.beginPath(); ctx.arc(p.x, p.y, r * (0.45 + i * 0.12), a, a + 1.5); ctx.stroke();
    ctx.strokeStyle = css(lift(col, 0.5), 0.14 + 0.1 * (o.gloss ?? 0.45)); ctx.beginPath(); ctx.arc(p.x - 0.6, p.y - 0.8, r * (0.43 + i * 0.12), a + 0.1, a + 1.1); ctx.stroke();
  }
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 0.22);
  g.addColorStop(0, css([14, 8, 4], 0.7)); g.addColorStop(1, css([14, 8, 4], 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.22, 0, TAU); ctx.fill();
}

// A needle: tip at `tip`, body leaving at angle `ang` (radians), length `len` (foreshortened: it is lifted off the cloth).
// Returns the eye position, where the thread is attached.
export function needle(ctx, tip, ang, len, o = {}) {
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux, w = o.w ?? 6.5;
  const P = (s, off) => ({ x: tip.x + ux * s + nx * off, y: tip.y + uy * s + ny * off });
  const prof = s => { const t = s / len; return t < 0.16 ? w * 0.5 * Math.pow(t / 0.16, 0.8) : t > 0.86 ? w * 0.5 * (1.1 + 0.25 * (t - 0.86) / 0.14) : w * 0.5 * (1 + 0.1 * (t - 0.16)); };
  const poly = () => {
    ctx.beginPath(); const N = 36;
    for (let i = 0; i <= N; i++) { const s = len * i / N, p = P(s, -prof(s)); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
    for (let i = N; i >= 0; i--) { const s = len * i / N, p = P(s, prof(s)); ctx.lineTo(p.x, p.y); }
    ctx.closePath();
  };
  const lifted = o.lift ?? 1.4;
  ctx.save();
  const z = ENV.z;
  ctx.shadowColor = 'rgba(20,12,6,0.45)'; ctx.shadowBlur = 9 * z; ctx.shadowOffsetX = -LIGHT.x * 14 * lifted * z; ctx.shadowOffsetY = -LIGHT.y * 14 * lifted * z;
  const cr = ux * LIGHT.y - uy * LIGHT.x, side = cr >= 0 ? 1 : -1;
  const g = ctx.createLinearGradient(tip.x - nx * w / 2, tip.y - ny * w / 2, tip.x + nx * w / 2, tip.y + ny * w / 2);
  const st = [[0, '#f4f6f8'], [0.22, '#ffffff'], [0.5, '#b8bdc4'], [0.85, '#6c727c'], [1, '#3e434b']];
  for (const [u, c] of st) g.addColorStop(side > 0 ? 1 - u : u, c);
  ctx.fillStyle = g; poly(); ctx.fill();
  shadowOff(ctx); ctx.restore();
  // eye slot
  const e0 = P(len - 17, 0), e1 = P(len - 6, 0);
  ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(25,20,18,0.85)'; ctx.lineWidth = w * 0.3;
  ctx.beginPath(); ctx.moveTo(e0.x, e0.y); ctx.lineTo(e1.x, e1.y); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); const l0 = P(8, -w * 0.18), l1 = P(len * 0.8, -w * 0.18); ctx.moveTo(l0.x, l0.y); ctx.lineTo(l1.x, l1.y); ctx.stroke();
  return P(len - 11, 0);
}

// A loose thread hanging from `p0` through control points to `p3` (cubic), drawn as short lit segments.
export function loose(ctx, p0, p1, p2, p3, w, col, o = {}) {
  const pt = t => { const s = 1 - t; return { x: s * s * s * p0.x + 3 * s * s * t * p1.x + 3 * s * t * t * p2.x + t * t * t * p3.x, y: s * s * s * p0.y + 3 * s * s * t * p1.y + 3 * s * t * t * p2.y + t * t * t * p3.y }; };
  const N = o.n ?? 40;
  for (let i = 0; i < N; i++) thread(ctx, pt(i / N), pt((i + 1.15) / N), w, col, { gloss: o.gloss ?? 0.5, sink: false, lift: o.lift ?? 0.8, seed: i * 7 + 3, twist: 0.5, shadow: 0.7 });
}
