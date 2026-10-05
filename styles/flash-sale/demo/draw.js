// Drawing kit for the flash-sale demo: palette, slam, outlined type, starbursts, price tags, strike-through, backgrounds,
// confetti and coins, product icons. Everything is a pure function of time; nothing is carried between frames.
import { clamp, lerp, seg, hash, mulberry, TAU } from '/core/lib.js';

export const C = { red: '#ff2a1f', red2: '#d11a12', yel: '#ffd90f', yel2: '#ffb300', ink: '#17110d', white: '#fff8e6', cream: '#ffeebb', orange: '#ff7a1a', teal: '#10b5a5', blue: '#2f6bff', green: '#2fb34a' };
export const HEAD = 'Anton', LAB = '"Barlow Condensed"';

// ------------------------------------------------------------------ text, with every drawn string recorded for window.TEXTS
export const REC = [];
export function text(ctx, id, str, o = {}) {
  const { x = 0, y = 0, size = 100, font = HEAD, weight = '', fill = C.white, stroke = C.ink, sw = 0, shadow = null, align = 'center', ls = 0, rep = true, alpha = 1 } = o;
  ctx.save(); ctx.font = `${weight} ${size}px ${font}`.trim(); ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  if (ls) ctx.letterSpacing = ls + 'px';
  ctx.globalAlpha *= alpha;
  const w = ctx.measureText(str).width;
  if (shadow) { const [dx, dy, col] = shadow; ctx.fillStyle = col; ctx.strokeStyle = col; if (sw) { ctx.lineWidth = sw * 2; ctx.strokeText(str, x + dx, y + dy); } ctx.fillText(str, x + dx, y + dy); }
  if (sw) { ctx.strokeStyle = stroke; ctx.lineWidth = sw * 2; ctx.strokeText(str, x, y); }
  ctx.fillStyle = fill; ctx.fillText(str, x, y);
  if (rep && ctx.globalAlpha > 0.5) {
    const m = ctx.getTransform(), x0 = align === 'center' ? x - w / 2 : align === 'left' ? x : x - w, x1 = x0 + w, y0 = y - size * 0.42, y1 = y + size * 0.42;
    const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([px, py]) => [m.a * px + m.c * py + m.e, m.b * px + m.d * py + m.f]);
    REC.push({ id, text: str, x0: Math.min(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), x1: Math.max(...pts.map(p => p[0])), y1: Math.max(...pts.map(p => p[1])) });
  }
  ctx.restore(); return w;
}
export function textW(ctx, str, size, font = HEAD, weight = '') { ctx.save(); ctx.font = `${weight} ${size}px ${font}`.trim(); const w = ctx.measureText(str).width; ctx.restore(); return w; }

// ------------------------------------------------------------------ the slam: drop in oversize, hit, squash, settle
export function slam(ctx, u, x, y, rot, fn, o = {}) {
  if (u < 0) return false;
  const from = o.from ?? 2.3, d = o.d ?? 0.09, sq = o.sq ?? 1;
  let s = 1, sx = 1, sy = 1, a = 1, ox = 0, oy = 0;
  if (u < d) { const k = u / d; s = lerp(from, 1, k * k); a = Math.min(1, k * 4); ox = (o.dx || 0) * (1 - k * k); oy = (o.dy || 0) * (1 - k * k); }
  else { const w = u - d, wob = Math.exp(-w * 11) * Math.cos(w * 38); sx = 1 + 0.2 * wob * sq; sy = 1 - 0.2 * wob * sq; }
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x + ox, y + oy); ctx.rotate(rot || 0); ctx.scale(s * sx, s * sy); fn(u); ctx.restore(); return true;
}
// 0 -> 1 -> small bounce: for the strike-through and bars
export const draw01 = (u, d) => clamp(u / d);

// ------------------------------------------------------------------ shapes
export function starPath(ctx, n, r1, r2, rot = 0) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, r = i % 2 ? r2 : r1; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); }
export function burst(ctx, r, o = {}) {
  const { n = 20, inner = 0.82, fill = C.yel, stroke = C.ink, sw = 10, shadow = [14, 16], rot = 0 } = o;
  if (shadow) { ctx.save(); ctx.translate(shadow[0], shadow[1]); starPath(ctx, n, r, r * inner, rot); ctx.fillStyle = C.ink; ctx.fill(); ctx.lineWidth = sw * 2; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); }
  starPath(ctx, n, r, r * inner, rot); ctx.lineJoin = 'round'; ctx.lineWidth = sw * 2; ctx.strokeStyle = stroke; ctx.stroke(); ctx.fillStyle = fill; ctx.fill();
}
export function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
export function card(ctx, w, h, o = {}) {
  const { fill = C.white, r = 36, sw = 10, shadow = [16, 18] } = o;
  if (shadow) { rrect(ctx, -w / 2 + shadow[0], -h / 2 + shadow[1], w, h, r); ctx.fillStyle = C.ink; ctx.fill(); }
  rrect(ctx, -w / 2, -h / 2, w, h, r); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = sw * 2; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.save(); rrect(ctx, -w / 2, -h / 2, w, h, r); ctx.clip(); ctx.stroke(); ctx.restore();
}
// a sticker badge: starburst + text, tilted
export function badge(ctx, id, str, r, o = {}) {
  const { fill = C.red, ink = C.white, size = r * 0.78, n = 16 } = o;
  burst(ctx, r, { n, inner: 0.84, fill, shadow: [10, 12], sw: 8 });
  text(ctx, id, str, { size, fill: ink, sw: 0, y: size * 0.03 });
}
// strike-through over a price of width w, progress p (0..1): a thick red bar with black edge
export function strike(ctx, w, h, p, col = C.red) {
  if (p <= 0) return; const x0 = -w / 2 - 16, x1 = lerp(x0, w / 2 + 16, p), a = -0.1;
  ctx.save(); ctx.rotate(a); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x1, 0); ctx.strokeStyle = C.ink; ctx.lineWidth = h * 0.2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x1, 0); ctx.strokeStyle = col; ctx.lineWidth = h * 0.12; ctx.stroke(); ctx.restore();
}

// ------------------------------------------------------------------ backgrounds
export function fillBg(ctx, col) { ctx.fillStyle = col; ctx.fillRect(-100, -100, 2120, 1280); }
export function rays(ctx, t, c1, c2, cx = 960, cy = 540, n = 18, speed = 0.12, alpha = 1) {
  fillBg(ctx, c1); ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * speed); ctx.fillStyle = c2; ctx.globalAlpha *= alpha;
  for (let i = 0; i < n; i++) { const a0 = i * TAU / n, a1 = a0 + TAU / n / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a0) * 2600, Math.sin(a0) * 2600); ctx.lineTo(Math.cos(a1) * 2600, Math.sin(a1) * 2600); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
export function dots(ctx, t, bg, col, gap = 40, cx = 960, cy = 540) {
  fillBg(ctx, bg); ctx.fillStyle = col; const off = (t * 14) % gap;
  for (let j = -2; j < 30; j++) for (let i = -2; i < 52; i++) {
    const x = i * gap + (j % 2 ? gap / 2 : 0) + off - 20, y = j * gap * 0.86 + off * 0.86 - 20, d = Math.hypot(x - cx, y - cy) / 1100;
    const r = gap * 0.46 * clamp(d * 1.1 - 0.12, 0, 1); if (r > 0.8) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  }
}
export function stripes(ctx, t, c1, c2, w = 90, ang = -0.5, speed = 40) {
  fillBg(ctx, c1); ctx.save(); ctx.translate(960, 540); ctx.rotate(ang); ctx.fillStyle = c2; const off = (t * speed) % (w * 2);
  for (let x = -2600; x < 2600; x += w * 2) ctx.fillRect(x + off, -2600, w, 5200); ctx.restore();
}
export function hazard(ctx, x, y, w, h, t, speed = 60) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.fillStyle = C.yel; ctx.fillRect(x, y, w, h); ctx.fillStyle = C.ink; const s = h, off = (t * speed) % (s * 2);
  for (let i = -4; i < w / s + 4; i++) { const X = x + i * s * 2 + off; ctx.beginPath(); ctx.moveTo(X, y + h); ctx.lineTo(X + s, y); ctx.lineTo(X + s * 2, y); ctx.lineTo(X + s, y + h); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
// scrolling ticker: decorative text (not reported to TEXTS; the same words are on screen elsewhere)
export function marquee(ctx, y, h, t, o = {}) {
  const { bg = C.ink, fg = C.yel, words = ['MANGO LANE', 'MEGA MARKDOWN'], speed = 220, size = h * 0.62 } = o;
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-60, y, 2040, h); ctx.font = `${size}px ${HEAD}`; ctx.textBaseline = 'middle'; ctx.fillStyle = fg;
  const ws = words.map(w => ctx.measureText(w).width), gap = h * 0.9, unit = ws.reduce((a, b) => a + b, 0) + words.length * gap * 2;
  const off = -((t * speed) % unit);
  for (let k = 0; k < 4; k++) { let x = off + k * unit; for (let i = 0; i < words.length; i++) { ctx.fillText(words[i], x, y + h / 2 + 2); x += ws[i] + gap; ctx.save(); ctx.translate(x, y + h / 2); starPath(ctx, 5, h * 0.2, h * 0.09, -Math.PI / 2); ctx.fill(); ctx.restore(); x += gap; } }
  ctx.restore();
}

// ------------------------------------------------------------------ confetti and coins (a function of time since the burst)
const CONF = [C.red, C.yel, C.white, C.ink, C.orange, C.teal];
export function confetti(ctx, u, x, y, n = 110, seed = 1, spread = 1.0, up = 1.0) {
  if (u < 0 || u > 3.2) return; const R = mulberry(seed * 977);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (R() - 0.5) * 2.7 * spread, v = (500 + R() * 1250) * up, vx = Math.cos(a) * v, vy = Math.sin(a) * v, sz = 12 + R() * 16, col = CONF[(R() * CONF.length) | 0], sp = 4 + R() * 10, ph = R() * TAU, drag = 2 + R() * 1.5;
    const X = x + vx * (1 - Math.exp(-drag * u)) / drag, Y = y + vy * u + 0.5 * 1900 * u * u * (0.7 + 0.3 * R());
    if (Y > 1200 || X < -60 || X > 1980) continue;
    ctx.save(); ctx.translate(X, Y); ctx.rotate(ph + u * sp); ctx.scale(1, Math.cos(u * sp * 1.3 + ph)); ctx.fillStyle = col; ctx.fillRect(-sz / 2, -sz / 3, sz, sz * 0.66); ctx.restore();
  }
}
export function coin(ctx, r, spin) {
  const sx = Math.abs(Math.cos(spin)) * 0.92 + 0.08; ctx.save(); ctx.scale(sx, 1);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = C.yel; ctx.fill(); ctx.lineWidth = r * 0.14; ctx.strokeStyle = C.ink; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, TAU); ctx.lineWidth = r * 0.07; ctx.strokeStyle = C.yel2; ctx.stroke();
  if (sx > 0.5) { ctx.fillStyle = C.yel2; ctx.font = `${r * 1.1}px ${HEAD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, r * 0.04); }
  ctx.restore();
}
export function coins(ctx, u, x, y, n = 26, seed = 3) {
  if (u < 0 || u > 3.0) return; const R = mulberry(seed * 313);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (R() - 0.5) * 2.2, v = 700 + R() * 1000, r = 22 + R() * 14, sp = 6 + R() * 8, dl = R() * 0.25, uu = u - dl; if (uu < 0) continue;
    const X = x + Math.cos(a) * v * uu * 0.8, Y = y + Math.sin(a) * v * uu + 0.5 * 2200 * uu * uu; if (Y > 1200) continue;
    ctx.save(); ctx.translate(X, Y); coin(ctx, r, uu * sp + i); ctx.restore();
  }
}

// ------------------------------------------------------------------ product icons, drawn in px around (0,0); s = half size
const ow = s => Math.max(6, s * 0.045);
function out(ctx, s, fill) { ctx.lineWidth = ow(s) * 2; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } }
function outf(ctx, s, fill) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = ow(s); ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
function shine(ctx, x0, y0, x1, y1, s) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round'; ctx.stroke(); }
export const ICONS = {
  kettle(ctx, s) {
    ctx.beginPath(); ctx.moveTo(-0.7 * s, 0.25 * s); ctx.lineTo(-1.12 * s, -0.5 * s); ctx.lineTo(-0.98 * s, -0.6 * s); ctx.lineTo(-0.55 * s, -0.15 * s); ctx.closePath(); outf(ctx, s, C.orange);   // spout
    ctx.beginPath(); ctx.arc(0.62 * s, 0.05 * s, 0.5 * s, -1.25, 1.25); ctx.lineWidth = s * 0.2; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.lineWidth = s * 0.09; ctx.strokeStyle = C.teal; ctx.stroke();   // handle
    ctx.beginPath(); ctx.moveTo(-0.72 * s, 0.82 * s); ctx.bezierCurveTo(-0.95 * s, 0.1 * s, -0.7 * s, -0.55 * s, -0.4 * s, -0.62 * s); ctx.lineTo(0.4 * s, -0.62 * s); ctx.bezierCurveTo(0.7 * s, -0.55 * s, 0.95 * s, 0.1 * s, 0.72 * s, 0.82 * s); ctx.closePath(); outf(ctx, s, C.orange);
    ctx.beginPath(); ctx.ellipse(0, -0.66 * s, 0.46 * s, 0.17 * s, 0, 0, TAU); outf(ctx, s, C.yel);
    ctx.beginPath(); ctx.arc(0, -0.86 * s, 0.1 * s, 0, TAU); outf(ctx, s, C.ink);
    ctx.beginPath(); ctx.rect(-0.78 * s, 0.7 * s, 1.56 * s, 0.14 * s); outf(ctx, s, C.ink); shine(ctx, -0.5 * s, -0.3 * s, -0.55 * s, 0.35 * s, s);
  },
  headphones(ctx, s) {
    ctx.beginPath(); ctx.arc(0, 0.1 * s, 0.82 * s, Math.PI * 1.06, Math.PI * 1.94); ctx.lineWidth = s * 0.26; ctx.strokeStyle = C.ink; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = s * 0.14; ctx.strokeStyle = C.red; ctx.stroke();
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.roundRect(sg * 0.82 * s - 0.24 * s, 0.0 * s, 0.48 * s, 0.82 * s, 0.2 * s); outf(ctx, s, C.red); ctx.beginPath(); ctx.roundRect(sg * 0.82 * s - 0.15 * s + sg * -0.1 * s, 0.12 * s, 0.3 * s, 0.58 * s, 0.12 * s); outf(ctx, s, C.cream); }
    shine(ctx, -0.55 * s, -0.55 * s, -0.25 * s, -0.78 * s, s);
  },
  lamp(ctx, s) {
    ctx.beginPath(); ctx.ellipse(0, 0.86 * s, 0.55 * s, 0.14 * s, 0, 0, TAU); outf(ctx, s, C.ink);
    ctx.beginPath(); ctx.moveTo(-0.07 * s, 0.82 * s); ctx.lineTo(-0.05 * s, 0.1 * s); ctx.lineTo(0.05 * s, 0.1 * s); ctx.lineTo(0.07 * s, 0.82 * s); ctx.closePath(); outf(ctx, s, C.teal);
    ctx.beginPath(); ctx.arc(0, -0.15 * s, 0.7 * s, Math.PI, 0); ctx.closePath(); outf(ctx, s, C.yel);
    ctx.beginPath(); ctx.arc(0, -0.15 * s, 0.7 * s, Math.PI, 0); ctx.lineTo(0, -0.15 * s); ctx.closePath(); ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-0.7 * s, -0.9 * s, 0.35 * s, 0.9 * s); ctx.restore();
    ctx.beginPath(); ctx.arc(0, -0.15 * s, 0.7 * s, Math.PI, 0); ctx.closePath(); ctx.lineWidth = ow(s); ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0.12 * s, 0.1 * s, 0, TAU); outf(ctx, s, C.white);
  },
  pack(ctx, s) {
    ctx.beginPath(); ctx.arc(0, -0.78 * s, 0.22 * s, Math.PI, 0); ctx.lineWidth = s * 0.1; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-0.68 * s, -0.8 * s, 1.36 * s, 1.7 * s, 0.34 * s); outf(ctx, s, C.blue);
    ctx.beginPath(); ctx.roundRect(-0.5 * s, 0.1 * s, 1.0 * s, 0.62 * s, 0.14 * s); outf(ctx, s, C.yel);
    ctx.beginPath(); ctx.moveTo(-0.5 * s, 0.28 * s); ctx.lineTo(0.5 * s, 0.28 * s); ctx.lineWidth = ow(s) * 0.8; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0.28 * s, 0.05 * s, 0, TAU); outf(ctx, s, C.ink);
    ctx.beginPath(); ctx.moveTo(-0.45 * s, -0.5 * s); ctx.lineTo(0.45 * s, -0.5 * s); ctx.lineWidth = ow(s) * 1.4; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.4 * s, -0.5 * s); ctx.lineTo(0.4 * s, -0.5 * s); ctx.lineWidth = ow(s) * 0.5; ctx.strokeStyle = C.orange; ctx.stroke();
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.roundRect(sg * 0.74 * s - 0.08 * s, -0.2 * s, 0.16 * s, 0.9 * s, 0.07 * s); outf(ctx, s, C.ink); }
    shine(ctx, -0.5 * s, -0.5 * s, -0.5 * s, -0.1 * s, s);
  },
  mug(ctx, s) {
    ctx.beginPath(); ctx.arc(0.55 * s, 0.05 * s, 0.38 * s, -1.4, 1.4); ctx.lineWidth = s * 0.22; ctx.strokeStyle = C.ink; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = s * 0.1; ctx.strokeStyle = C.teal; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-0.62 * s, -0.5 * s, 1.18 * s, 1.3 * s, [0.1 * s, 0.1 * s, 0.3 * s, 0.3 * s]); outf(ctx, s, C.teal);
    ctx.beginPath(); ctx.ellipse(-0.03 * s, -0.5 * s, 0.59 * s, 0.14 * s, 0, 0, TAU); outf(ctx, s, C.ink);
    ctx.beginPath(); ctx.arc(-0.03 * s, 0.2 * s, 0.2 * s, 0, TAU); outf(ctx, s, C.yel);
    for (const x of [-0.25, 0.12]) { ctx.beginPath(); ctx.moveTo(x * s, -0.7 * s); ctx.bezierCurveTo((x - 0.2) * s, -0.85 * s, (x + 0.2) * s, -0.95 * s, x * s, -1.1 * s); ctx.lineWidth = s * 0.06; ctx.strokeStyle = C.ink; ctx.stroke(); }
  },
  fern(ctx, s) {
    const L = [[-0.55, -0.15, -0.6, 0.55], [-0.2, -0.55, -0.25, 0.5], [0.2, -0.6, 0.2, 0.5], [0.55, -0.1, 0.65, 0.55], [0.0, -0.3, 0.0, 0.45]];
    for (const [x, y, rot, len] of L) { ctx.save(); ctx.translate(x * s * 0.6, 0.0); ctx.rotate(rot * 0.7); ctx.beginPath(); ctx.ellipse(0, -0.5 * s, 0.2 * s, len * s * 0.9, 0, 0, TAU); outf(ctx, s, C.green); ctx.restore(); }
    ctx.beginPath(); ctx.moveTo(-0.55 * s, 0.1 * s); ctx.lineTo(0.55 * s, 0.1 * s); ctx.lineTo(0.4 * s, 0.9 * s); ctx.lineTo(-0.4 * s, 0.9 * s); ctx.closePath(); outf(ctx, s, C.orange);
    ctx.beginPath(); ctx.roundRect(-0.64 * s, 0.0, 1.28 * s, 0.2 * s, 0.08 * s); outf(ctx, s, C.red);
  },
  bottle(ctx, s) {
    ctx.beginPath(); ctx.roundRect(-0.38 * s, -0.5 * s, 0.76 * s, 1.4 * s, 0.26 * s); outf(ctx, s, C.blue);
    ctx.beginPath(); ctx.roundRect(-0.2 * s, -0.8 * s, 0.4 * s, 0.34 * s, 0.06 * s); outf(ctx, s, C.ink);
    ctx.beginPath(); ctx.roundRect(-0.38 * s, 0.05 * s, 0.76 * s, 0.5 * s, 0.05 * s); outf(ctx, s, C.yel);
    ctx.beginPath(); ctx.arc(0, 0.3 * s, 0.1 * s, 0, TAU); outf(ctx, s, C.red); shine(ctx, -0.22 * s, -0.35 * s, -0.22 * s, -0.05 * s, s);
  },
  note(ctx, s) {
    ctx.save(); ctx.rotate(-0.12); ctx.beginPath(); ctx.roundRect(-0.6 * s, -0.8 * s, 1.2 * s, 1.6 * s, 0.1 * s); outf(ctx, s, C.red);
    ctx.beginPath(); ctx.roundRect(-0.38 * s, -0.5 * s, 0.76 * s, 0.5 * s, 0.05 * s); outf(ctx, s, C.cream);
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-0.6 * s, (-0.62 + i * 0.25) * s, 0.07 * s, 0, TAU); outf(ctx, s, C.white); }
    ctx.beginPath(); ctx.moveTo(-0.25 * s, -0.3 * s); ctx.lineTo(0.25 * s, -0.3 * s); ctx.moveTo(-0.25 * s, -0.15 * s); ctx.lineTo(0.12 * s, -0.15 * s); ctx.lineWidth = ow(s) * 0.7; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.restore();
  },
  speaker(ctx, s) {
    ctx.beginPath(); ctx.roundRect(-0.52 * s, -0.8 * s, 1.04 * s, 1.6 * s, 0.2 * s); outf(ctx, s, C.ink);
    ctx.beginPath(); ctx.arc(0, 0.22 * s, 0.34 * s, 0, TAU); outf(ctx, s, C.red); ctx.beginPath(); ctx.arc(0, 0.22 * s, 0.14 * s, 0, TAU); outf(ctx, s, C.ink);
    ctx.beginPath(); ctx.arc(0, -0.45 * s, 0.17 * s, 0, TAU); outf(ctx, s, C.yel);
    ctx.beginPath(); ctx.arc(-0.45 * s, 0.7 * s, 0.05 * s, 0, TAU); ctx.fillStyle = C.teal; ctx.fill();
  },
  umbrella(ctx, s) {
    ctx.beginPath(); ctx.moveTo(0, -0.1 * s); ctx.lineTo(0, 0.7 * s); ctx.arc(-0.14 * s, 0.7 * s, 0.14 * s, 0, Math.PI); ctx.lineWidth = s * 0.14; ctx.strokeStyle = C.ink; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = s * 0.06; ctx.strokeStyle = C.orange; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.95 * s, 0); ctx.arc(0, 0, 0.95 * s, Math.PI, 0); for (let i = 0; i < 3; i++) { const x1 = 0.95 * s - (i + 1) * 0.633 * s; ctx.quadraticCurveTo(0.95 * s - (i + 0.5) * 0.633 * s, 0.22 * s, x1, 0); } ctx.closePath(); outf(ctx, s, C.teal);
    ctx.save(); ctx.clip(); ctx.fillStyle = C.yel; for (const [a, b] of [[-0.32, 0.32]]) ctx.fillRect(a * s, -1 * s, (b - a) * s, 1.2 * s); ctx.restore();
    ctx.beginPath(); ctx.moveTo(-0.95 * s, 0); ctx.arc(0, 0, 0.95 * s, Math.PI, 0); for (let i = 0; i < 3; i++) { const x1 = 0.95 * s - (i + 1) * 0.633 * s; ctx.quadraticCurveTo(0.95 * s - (i + 0.5) * 0.633 * s, 0.22 * s, x1, 0); } ctx.closePath(); ctx.lineWidth = ow(s); ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -0.95 * s, 0.06 * s, 0, TAU); outf(ctx, s, C.ink);
  },
};

// ------------------------------------------------------------------ the coupon ticket, in two halves around a perforation
export function couponPath(ctx, which, w, h, split, nr = 30) {
  const x0 = -w / 2, x1 = w / 2, y0 = -h / 2, y1 = h / 2; ctx.beginPath();
  if (which === 'main') {
    ctx.moveTo(x0, y0); ctx.lineTo(split - nr, y0); ctx.arc(split, y0, nr, Math.PI, Math.PI / 2, true); ctx.lineTo(split, y1 - nr); ctx.arc(split, y1, nr, -Math.PI / 2, -Math.PI, true); ctx.lineTo(x0, y1);
    // scalloped left edge
    const k = 6, step = h / k; for (let i = k; i > 0; i--) ctx.arc(x0, y0 + (i - 0.5) * step, step * 0.2, Math.PI / 2, -Math.PI / 2, true);
  } else {
    ctx.moveTo(x1, y0); ctx.lineTo(split + nr, y0); ctx.arc(split, y0, nr, 0, Math.PI / 2, false); ctx.lineTo(split, y1 - nr); ctx.arc(split, y1, nr, -Math.PI / 2, 0, false); ctx.lineTo(x1, y1);
    const k = 6, step = h / k; for (let i = 0; i < k; i++) ctx.arc(x1, y1 - (i + 0.5) * step, step * 0.2, Math.PI / 2, -Math.PI / 2, true);
  }
  ctx.closePath();
}

export function cursor(ctx, x, y, press = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1 - 0.06 * press, 1 - 0.06 * press); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 66); ctx.lineTo(16, 52); ctx.lineTo(28, 80); ctx.lineTo(42, 74); ctx.lineTo(30, 47); ctx.lineTo(52, 47); ctx.closePath();
  ctx.lineJoin = 'round'; ctx.lineWidth = 10; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
}
