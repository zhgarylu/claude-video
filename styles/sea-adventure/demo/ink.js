// ink.js: the pen. Uneven ink linework, flat colour with a hair of misregistration, hatching and screentone clipped to shapes,
// speed lines, hand-lettered sound effects, cut-in panels, the warm paper. Everything is a function of (t); nothing carries state.
import { clamp, lerp, seg, ss, hash, vnoise } from '/core/lib.js';
export const TAU = Math.PI * 2;
export const COL = {
  ink: '#1d1612', paper: '#f4e6c4', paper2: '#e8d2a0', paper3: '#d9bd84',
  teal: '#16a6a3', teal2: '#0d7f94', teal3: '#7fd9c6', deep: '#0b5575', navy: '#1b2a5a',
  sun: '#ffc531', orange: '#ff8a2a', coral: '#f0503e', pink: '#f46aa6', leaf: '#3fb04a', leaf2: '#1f7d3b',
  sky: '#63c3ea', sky2: '#bfe9f2', wood: '#b6703a', wood2: '#7b4524', wood3: '#d99a58', cream: '#fff2d0', purple: '#6a4bb7',
  skin1: '#f2b17d', skin2: '#d98a55', skin3: '#fbc79b', skin4: '#b9693d',
};
// per-frame globals: lw = line-width factor (keeps ink visible when the camera is far), bs = boil seed (12 fps)
export const G = { lw: 1, bs: 0 };
export const setFrame = (t, zoom = 1) => { G.bs = Math.floor(t * 12); G.lw = clamp(0.9 / zoom, 1, 4.5); };
const jr = (seed, i = 0) => hash(seed * 13.17 + i * 7.31 + G.bs * .731);       // boiling jitter
const jf = (seed, i = 0) => hash(seed * 13.17 + i * 7.31);                       // fixed jitter

// ------------------------------------------------------------------ geometry helpers
export function ell(cx, cy, rx, ry, n = 30, wob = 0, seed = 1, rot = 0) {
  const p = [], cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, k = 1 + wob * (vnoise(i * .7 + seed * 5 + G.bs * .21) - .5) * 2;
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    p.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
  }
  return p;
}
export function catmull(pts, sub = 5, closed = false) {
  const n = pts.length, out = [], g = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let s = 0; s < sub; s++) {
      const u = s / sub, u2 = u * u, u3 = u2 * u;
      out.push([.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
        .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}
export const quad = (a, c, b, n = 12) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n, v = 1 - u; return [v * v * a[0] + 2 * u * v * c[0] + u * u * b[0], v * v * a[1] + 2 * u * v * c[1] + u * u * b[1]]; });
export const cubic = (a, c1, c2, b, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n, v = 1 - u; return [v * v * v * a[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * b[0], v * v * v * a[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * b[1]]; });
export const xf = (pts, x, y, s = 1, rot = 0, sx = 1, sy = 1) => { const c = Math.cos(rot), si = Math.sin(rot); return pts.map(([a, b]) => { a *= s * sx; b *= s * sy; return [x + a * c - b * si, y + a * si + b * c]; }); };
function area(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; }
function normalsOf(p, closed) {
  const n = p.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = closed ? p[(i - 1 + n) % n] : p[Math.max(0, i - 1)], b = closed ? p[(i + 1) % n] : p[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; out.push([dy / l, -dx / l]);
  }
  return out;
}
export const path = (ctx, p, close = true) => { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); if (close) ctx.closePath(); };

// ------------------------------------------------------------------ the pen
// an open stroke of varying width: pen pressure (noise), tapered ends
export function stroke(ctx, pts, w, seed = 1, o = {}) {
  const { taper = .22, vary = .45, col = COL.ink, boil = true } = o;
  if (pts.length < 2) return;
  pts = dense(pts);
  const n = pts.length;
  const nr = normalsOf(pts, false); const cum = [0]; for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[n - 1] || 1, L_ = Math.min(L * taper, w * G.lw * 5), left = [], right = [];
  for (let i = 0; i < n; i++) {
    const s = cum[i], pr = Math.min(1, .25 + s / (L_ || 1), .25 + (L - s) / (L_ || 1)), wob = 1 + vary * (vnoise(s / 38 + seed * 9 + (boil ? G.bs * .17 : 0)) - .5) * 2;
    const hw = w * G.lw * .5 * pr * wob;
    left.push([pts[i][0] + nr[i][0] * hw, pts[i][1] + nr[i][1] * hw]); right.push([pts[i][0] - nr[i][0] * hw, pts[i][1] - nr[i][1] * hw]);
  }
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(left[i][0], left[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath(); ctx.fill();
}
function dense(pts) {
  let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const step = Math.max(7, L / 70); if (pts.length > 2 && L / pts.length < step) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.round(d / step)); for (let j = 1; j <= k; j++) out.push([lerp(a[0], b[0], j / k), lerp(a[1], b[1], j / k)]); }
  return out;
}
// the ink ring around a closed shape: thicker on the shadow side, wavering
export function ring(ctx, pts, w, seed = 1, o = {}) {
  const { shade = [.55, .83], col = COL.ink, vary = .35, inside = .3 } = o;
  const n = pts.length, nr = normalsOf(pts, true), sgn = area(pts) > 0 ? 1 : -1, out = [], inn = [];
  for (let i = 0; i < n; i++) {
    const nx = nr[i][0] * sgn, ny = nr[i][1] * sgn, d = Math.max(0, nx * shade[0] + ny * shade[1]);
    const hw = w * G.lw * (.5 + .75 * d) * (1 + vary * (vnoise(i * .45 + seed * 7 + G.bs * .13) - .5) * 2);
    out.push([pts[i][0] + nx * hw * (1 - inside), pts[i][1] + ny * hw * (1 - inside)]); inn.push([pts[i][0] - nx * hw * inside, pts[i][1] - ny * hw * inside]);
  }
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(out[0][0], out[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(out[i][0], out[i][1]); ctx.closePath();
  ctx.moveTo(inn[0][0], inn[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(inn[i][0], inn[i][1]); ctx.closePath();
  ctx.fill('evenodd');
}
// a flat-coloured shape with an ink ring; optional shadow crescent in hatching and/or tone
export function shape(ctx, pts, fill, w = 5, seed = 1, o = {}) {
  const { off = [2, 3], hatch = null, tone = null, light = [-.55, -.8], shadow = fill, rimLight = null } = o;
  if (fill) { ctx.save(); ctx.translate(off[0] * G.lw * .6, off[1] * G.lw * .6); ctx.fillStyle = fill; path(ctx, pts); ctx.fill(); ctx.restore(); }
  if (hatch || tone) crescent(ctx, pts, light, hatch, tone, seed);
  if (w > 0) ring(ctx, pts, w, seed, { shade: [-light[0], -light[1]] });
}
function bbox(p) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; }
// shadow side of a shape = the shape minus itself shifted toward the light
export function crescent(ctx, pts, light, hatch, tone, seed = 1, shiftK = .18) {
  const [x0, y0, x1, y1] = bbox(pts), sz = Math.max(x1 - x0, y1 - y0), sh = sz * shiftK;
  ctx.save(); path(ctx, pts); ctx.clip();
  ctx.beginPath(); ctx.rect(x0 - 50, y0 - 50, x1 - x0 + 100, y1 - y0 + 100); ctx.moveTo(pts[0][0] + light[0] * sh, pts[0][1] + light[1] * sh);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + light[0] * sh, pts[i][1] + light[1] * sh); ctx.closePath(); ctx.clip('evenodd');
  if (tone) toneFill(ctx, x0, y0, x1, y1, tone);
  if (hatch) hatchFill(ctx, x0, y0, x1, y1, hatch, seed);
  ctx.restore();
}
export function hatchFill(ctx, x0, y0, x1, y1, h, seed = 1) {
  const { ang = .8, gap = 9, w = 1.7, col = COL.ink, cross = false, alpha = 1 } = h, g = gap * (G.lw > 1 ? Math.min(G.lw, 2.2) : 1);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
  ctx.save(); ctx.globalAlpha *= alpha;
  for (const a of cross ? [ang, ang + 1.25] : [ang]) {
    const c = Math.cos(a), s = Math.sin(a);
    for (let d = -R, i = 0; d <= R; d += g, i++) {
      const j = jf(seed, i + (a > ang ? 99 : 0)), l0 = R * (.3 + .7 * j), px = cx - s * d, py = cy + c * d;
      stroke(ctx, [[px - c * l0, py - s * l0], [px + c * l0, py + s * l0]], w, seed + i, { taper: .35, vary: .3, col, boil: false });
    }
  }
  ctx.restore();
}
let TILE = null;
function toneTile() {
  if (TILE) return TILE;
  const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d');
  x.fillStyle = '#000'; for (const [px, py] of [[4, 4], [12, 12]]) { x.beginPath(); x.arc(px, py, 2.1, 0, TAU); x.fill(); }
  return TILE = c;
}
export function toneFill(ctx, x0, y0, x1, y1, tone) {
  const { col = COL.ink, alpha = .55, scale = 1 } = tone;
  const t = toneTile(), pat = ctx.createPattern(t, 'repeat');
  // tint the pattern: draw it to a coloured tile once per colour
  const key = col; (toneFill.cache ??= {}); let tp = toneFill.cache[key];
  if (!tp) { const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); x.drawImage(t, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, 16, 16); tp = toneFill.cache[key] = ctx.createPattern(c, 'repeat'); }
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = tp; ctx.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8); ctx.restore();
}
// a tube along a polyline (limbs, tails, ropes), rounded ends
export function capsule(pts, widths, caps = 7) {
  const n = pts.length, nr = normalsOf(pts, false), L = [], R = [];
  for (let i = 0; i < n; i++) { const hw = widths[i] / 2; L.push([pts[i][0] + nr[i][0] * hw, pts[i][1] + nr[i][1] * hw]); R.push([pts[i][0] - nr[i][0] * hw, pts[i][1] - nr[i][1] * hw]); }
  const cap = (c, nrm, hw, dir) => { const out = [], a0 = Math.atan2(nrm[1], nrm[0]); for (let k = 1; k < caps; k++) { const a = a0 + dir * k / caps * Math.PI; out.push([c[0] + Math.cos(a) * hw, c[1] + Math.sin(a) * hw]); } return out; };
  return [...L, ...cap(pts[n - 1], nr[n - 1], widths[n - 1] / 2, -1), ...R.reverse(), ...cap(pts[0], [-nr[0][0], -nr[0][1]], widths[0] / 2, -1)];
}
export const tube = (ctx, pts, w0, w1, fill, ink = 5, seed = 1, o = {}) => {
  const sp = catmull(pts, 4), n = sp.length, ws = sp.map((_, i) => lerp(w0, w1, i / (n - 1)));
  shape(ctx, capsule(sp, ws), fill, ink, seed, o);
};

// ------------------------------------------------------------------ paper, tone, lines
let PAPER = null;
export function paper() {
  if (PAPER) return PAPER;
  const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; const x = c.getContext('2d');
  x.fillStyle = COL.paper; x.fillRect(0, 0, 1920, 1080);
  for (let i = 0; i < 26; i++) { const px = hash(i * 3.1) * 1920, py = hash(i * 7.7) * 1080, r = 160 + hash(i * 1.3) * 260, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(190,150,80,.10)'); g.addColorStop(1, 'rgba(190,150,80,0)'); x.fillStyle = g; x.fillRect(0, 0, 1920, 1080); }
  for (let i = 0; i < 5200; i++) { const px = hash(i * 1.7) * 1920, py = hash(i * 2.9 + 3) * 1080, l = 2 + hash(i * 5.1) * 9, a = hash(i * 9.3) * TAU; x.strokeStyle = `rgba(120,85,40,${.05 + hash(i * 4.4) * .08})`; x.lineWidth = .8; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  const v = x.createRadialGradient(960, 540, 420, 960, 540, 1250); v.addColorStop(0, 'rgba(120,70,20,0)'); v.addColorStop(1, 'rgba(120,70,20,.28)'); x.fillStyle = v; x.fillRect(0, 0, 1920, 1080);
  return PAPER = c;
}
export function speedLines(ctx, cx, cy, r0, r1, n, seed, o = {}) {
  const { col = COL.ink, w = 7, spread = 1 } = o;
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const a = (i + jr(seed, i) * .8) / n * TAU, rr0 = r0 * (.85 + jr(seed + 1, i) * .5), rr1 = r1 * (.75 + jr(seed + 2, i) * .6), ww = w * (.4 + jr(seed + 3, i) * 1.3) * spread * G.lw;
    const c = Math.cos(a), s = Math.sin(a);
    ctx.beginPath(); ctx.moveTo(cx + c * rr0 - s * ww / 2, cy + s * rr0 + c * ww / 2); ctx.lineTo(cx + c * rr1, cy + s * rr1); ctx.lineTo(cx + c * rr0 + s * ww / 2, cy + s * rr0 - c * ww / 2); ctx.closePath(); ctx.fill();
  }
}
export function parallelLines(ctx, x0, y0, x1, y1, ang, n, seed, o = {}) {
  const { col = COL.ink, w = 5, len = 260 } = o, c = Math.cos(ang), s = Math.sin(ang);
  for (let i = 0; i < n; i++) {
    const px = lerp(x0, x1, jr(seed, i)), py = lerp(y0, y1, jr(seed + 1, i)), l = len * (.5 + jr(seed + 2, i));
    stroke(ctx, [[px, py], [px + c * l, py + s * l]], w, seed + i, { col, taper: .5, boil: false });
  }
}

// ------------------------------------------------------------------ hand-lettered sound effects
export function sfxLayout(ctx, text, size, font = 'Bangers') {
  ctx.save(); ctx.font = `${size}px ${font}`; const w = ctx.measureText(text).width; ctx.restore(); return { w, h: size };
}
// pop in with a squash, then shiver; p = seconds since appearing. returns the screen box (rotation included)
export function sfx(ctx, text, x, y, size, rot, p, o = {}) {
  const { fill = COL.sun, stroke: sc = COL.ink, sw = .17, shadow = COL.coral, font = 'Bangers', fade = 0, shiver = 1.4, ls = 2 } = o;
  if (p < 0) return null;
  const k = p < .28 ? 1 + .35 * Math.sin(p / .28 * Math.PI) * (1 - p / .28) + (1 - ss(p / .12)) * -.9 : 1;
  const pop = p < .1 ? p / .1 : 1, sx = p < .28 ? 1 + (1 - Math.min(1, p / .28)) * .25 * Math.sin(p * 40) : 1;
  const { w } = sfxLayout(ctx, text, size, font);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot + Math.sin(p * 32) * .012 * shiver * (p < .6 ? 1 : .4)); ctx.scale(pop * k * sx, pop * k); ctx.globalAlpha *= 1 - fade;
  ctx.font = `${size}px ${font}`; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.textAlign = 'left';
  let cx = -w / 2 - ls * text.length / 2;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], cw = ctx.measureText(ch).width, jy = (jf(i * 3.3 + size) - .5) * size * .12 + Math.sin(p * 11 + i * 1.7) * size * .018 * shiver, jr_ = (jf(i * 5.1 + size) - .5) * .12;
    ctx.save(); ctx.translate(cx + cw / 2, jy); ctx.rotate(jr_);
    ctx.lineWidth = size * sw; ctx.strokeStyle = sc; ctx.fillStyle = shadow; ctx.fillText(ch, -cw / 2 + size * .06, size * .06); ctx.strokeText(ch, -cw / 2, 0);
    ctx.fillStyle = fill; ctx.fillText(ch, -cw / 2, 0);
    ctx.restore(); cx += cw + ls;
  }
  ctx.restore();
  const hw = (w + ls * text.length) / 2 * pop + size * .12, hh = size * .55 * pop + size * .1, c = Math.cos(rot), s = Math.sin(rot);
  const ex = Math.abs(c) * hw + Math.abs(s) * hh, ey = Math.abs(s) * hw + Math.abs(c) * hh;
  return { x0: x - ex, y0: y - ey, x1: x + ex, y1: y + ey };
}

// ------------------------------------------------------------------ cut-in panels
// a (slanted) quad with an ink border; fn draws inside it
export function panel(ctx, quadPts, border, fn, o = {}) {
  const { bg = COL.paper, shadowOff = 10 } = o;
  ctx.save(); ctx.fillStyle = 'rgba(40,20,5,.35)'; ctx.beginPath(); quadPts.forEach(([x, y], i) => i ? ctx.lineTo(x + shadowOff, y + shadowOff) : ctx.moveTo(x + shadowOff, y + shadowOff)); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.save(); path(ctx, quadPts); ctx.clip(); ctx.fillStyle = bg; path(ctx, quadPts); ctx.fill(); fn(); ctx.restore();
  const p = []; for (let i = 0; i < 4; i++) { const a = quadPts[i], b = quadPts[(i + 1) % 4]; for (let s = 0; s < 6; s++) p.push([lerp(a[0], b[0], s / 6), lerp(a[1], b[1], s / 6)]); }
  ring(ctx, p, border, 3, { inside: 1, shade: [0, 0] });
}
export function slantQuad(x, y, w, h, skew = 40, rot = 0) { return xf([[-w / 2 + skew, -h / 2], [w / 2 + skew * .2, -h / 2], [w / 2 - skew, h / 2], [-w / 2 - skew * .2, h / 2]], x, y, 1, rot); }

// ------------------------------------------------------------------ small things
export function puff(ctx, x, y, r, n, seed, p, col = COL.cream) {      // dust / spray burst of ink-outlined puffs
  for (let i = 0; i < n; i++) {
    const a = (i + jf(seed, i) * .6) / n * TAU, d = r * ss(p) * (.6 + jf(seed + 1, i) * .6), rr = r * .22 * (1 - p * .6) * (.7 + jf(seed + 2, i) * .6);
    shape(ctx, ell(x + Math.cos(a) * d, y + Math.sin(a) * d * .8, rr, rr * .85, 14, .12, seed + i), col, 3.5, seed + i, { off: [0, 0] });
  }
}
export function sweat(ctx, x, y, s, rot = 0) {
  const p = [[0, -1.2], [.65, .1], [.55, .65], [0, .95], [-.55, .65], [-.65, .1]].map(([a, b]) => [a * s, b * s]);
  shape(ctx, catmull(xf(p, x, y, 1, rot), 4, true), COL.sky2, 3.5, 11, { off: [0, 0] });
}
export function star(ctx, x, y, r, n, col, seed = 1, rot = 0) {
  const p = []; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU + rot, rr = i % 2 ? r * .45 : r; p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  shape(ctx, p, col, 4, seed, { off: [1, 2] });
}
export function text(ctx, s, x, y, size, font, fill, o = {}) {
  const { align = 'left', rot = 0, outline = 0, oc = COL.ink, ls = 0, base = 'alphabetic' } = o;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = `${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = base; ctx.letterSpacing = ls + 'px'; ctx.lineJoin = 'round';
  if (outline) { ctx.lineWidth = outline; ctx.strokeStyle = oc; ctx.strokeText(s, 0, 0); }
  ctx.fillStyle = fill; ctx.fillText(s, 0, 0); ctx.restore();
}
export function measure(ctx, s, size, font, ls = 0) { ctx.save(); ctx.font = `${size}px ${font}`; ctx.letterSpacing = ls + 'px'; const w = ctx.measureText(s).width; ctx.restore(); return w; }
export { jr, jf };
