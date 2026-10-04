// "The Bend": one sheet, one river, nine years. Everything is a hand operation on the same paper (engine/ops.js).
import { track, mulberry } from '/core/lib.js';
import { Sheet, W, H } from './engine/sheet.js';
import { Timeline } from './engine/ops.js';

export const DUR = 57;
const OX = 150, OY = 60;
const P = (x, y) => ({ x: x + OX, y: y + OY });
const Q = (x, y) => ({ x, y });
const line = (a, b, n = 3, j = 0, seed = 1) => { const r = mulberry(seed), out = []; for (let i = 0; i <= n; i++) { const u = i / n; out.push(P(a[0] + (b[0] - a[0]) * u + (r() - 0.5) * j, a[1] + (b[1] - a[1]) * u + (r() - 0.5) * j)); } return out; };

// ---- river geometry: the centre line leans toward the house a little each year --------------------
const BASE = [[300, 380], [620, 600], [1000, 860], [1420, 1060], [1940, 1160], [2440, 1100], [2900, 960], [3120, 880]];
export function riverLine(shift) { return BASE.map(([x, y]) => P(x, y - shift * Math.exp(-Math.pow((x - 2010) / 700, 2)))); }
function offsetLine(pts, d) { return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1; return P(p.x - ty / l * d, p.y + tx / l * d); }); }
const sub = (pts, a, b) => pts.slice(a, b);

// ---- recipes -----------------------------------------------------------------------------------------
function tone(tl, t0, t1) {
  // toned ground: broad side-of-the-stick sweeps (dark sky, lighter land), then the heel of the hand wipes them level,
  // then a kneaded eraser lifts clouds out of the sky
  const r = mulberry(11), D = t1 - t0;
  for (let k = 0; k < 10; k++) {
    const y = 215 + k * 42, ta = t0 + D * 0.30 * k / 10, f = k / 9;
    tl.stroke({ t0: ta, t1: ta + 0.7, layer: 'C', r: 105, p: 0.62 - 0.32 * f, g: 0.3, flow: 0.34, ridge: 0.35, spacing: 0.26, wobble: 9, seed: 20 + k, taper: [0.04, 0.04],
      pts: [P(120 + r() * 60, y + r() * 24), P(1100, y + 20 * (r() - 0.5)), P(2100, y + 24 * (r() - 0.5)), P(3060 - r() * 70, y + r() * 24)] });
  }
  for (let k = 0; k < 9; k++) {
    const y = 640 + k * 118, ta = t0 + D * (0.30 + 0.22 * k / 9);
    tl.stroke({ t0: ta, t1: ta + 0.7, layer: 'C', r: 125, p: 0.17 + 0.05 * k / 9, g: 0.3, flow: 0.24, ridge: 0.35, spacing: 0.26, wobble: 9, seed: 40 + k, taper: [0.04, 0.04],
      pts: [P(130 + r() * 60, y + r() * 24), P(1100, y + 30 * (r() - 0.5)), P(2100, y + 30 * (r() - 0.5)), P(3050 - r() * 70, y + r() * 24)] });
  }
  for (let k = 0; k < 13; k++) {
    const y = 210 + k * 120, ta = t0 + D * (0.50 + 0.38 * k / 13);
    tl.smudge({ t0: ta, t1: ta + 0.9, r: 190, len: 260, k: 0.75, lift: 0, layers: 'C', pts: [P(100, y), P(1100, y + 25), P(2100, y - 15), P(3080, y + 15)] });
  }
  // clouds: banks of thin, parallel eraser lifts, never round
  const rr = mulberry(77);
  for (let i = 0; i < 4; i++) {
    const x = 260 + rr() * 2200, y = 225 + rr() * 150, l = 500 + rr() * 700, ta = t0 + D * (0.88 + 0.02 * i);
    for (let j = 0; j < 4; j++) {
      const yy = y + j * 24 + (rr() - 0.5) * 10, ll = l * (0.55 + 0.45 * rr()), xx = x + (rr() - 0.3) * 120;
      tl.erase({ t0: ta + j * 0.1, t1: ta + j * 0.1 + 0.5, r: 12 + rr() * 6, k: 0.3 + 0.12 * rr(), pts: [P(xx, yy), P(xx + ll * 0.5, yy - 8 + rr() * 16), P(xx + ll, yy + (rr() - 0.5) * 20)] });
    }
  }
  // foreground rubbed dark at the bottom of the sheet
  for (let k = 0; k < 3; k++) {
    const ta = t0 + D * (0.55 + 0.05 * k), y = 1560 + k * 40;
    tl.stroke({ t0: ta, t1: ta + 0.7, layer: 'C', r: 130, p: 0.32, g: 0.5, flow: 0.28, ridge: 0.35, spacing: 0.26, wobble: 9, seed: 140 + k, taper: [0.04, 0.04], pts: [P(150, y), P(1100, y + 20), P(2100, y - 20), P(3040, y + 10)] });
  }
  tl.smudge({ t0: t0 + D * 0.82, t1: t0 + D * 0.82 + 0.9, r: 170, len: 230, k: 0.75, lift: 0, layers: 'C', pts: [P(100, 1540), P(1100, 1570), P(2100, 1540), P(3080, 1560)] });
}
function hills(tl, t0) {
  tl.stroke({ t0, t1: t0 + 2.2, layer: 'C', r: 11, p: 1.0, g: 0.3, flow: 0.4, seed: 3, wobble: 3, pts: [P(200, 560), P(560, 500), P(900, 540), P(1300, 470), P(1800, 520), P(2300, 455), P(2750, 500), P(3040, 470)] });
  tl.smudge({ t0: t0 + 1.4, t1: t0 + 3.2, r: 75, len: 80, k: 0.6, layers: 'C', pts: [P(220, 590), P(900, 575), P(1500, 560), P(2300, 540), P(3020, 520)] });
  tl.stroke({ t0: t0 + 2.6, t1: t0 + 4.2, layer: 'C', r: 8, p: 0.8, g: 0.4, flow: 0.3, seed: 4, wobble: 2, pts: [P(700, 560), P(1100, 600), P(1500, 580), P(1900, 610)] });
  // light on the ridge: erase
  tl.erase({ t0: t0 + 3.4, t1: t0 + 4.4, r: 55, k: 0.5, pts: [P(1300, 420), P(1700, 410), P(2150, 400)] });
}
function riverMass(tl, t0, t1, shift, seed = 1) {
  const c = riverLine(shift), far = offsetLine(c, -66), near = offsetLine(c, 64);
  tl.stroke({ t0, t1: t0 + (t1 - t0) * 0.55, layer: 'C', r: 62, p: 0.62, g: 0.5, flow: 0.34, ridge: 0.7, spacing: 0.22, seed: 40 + seed, wobble: 6, taper: [0.04, 0.04], pts: c });
  tl.smudge({ t0: t0 + (t1 - t0) * 0.35, t1: t0 + (t1 - t0) * 0.85, r: 66, len: 150, k: 0.7, lift: 0.02, layers: 'C', pts: c });
  tl.stroke({ t0: t0 + (t1 - t0) * 0.5, t1: t0 + (t1 - t0) * 0.78, layer: 'C', r: 12, p: 1.0, g: 0.3, flow: 0.4, wvar: 0.45, seed: 50 + seed, wobble: 3, pts: far });
  tl.stroke({ t0: t0 + (t1 - t0) * 0.6, t1: t0 + (t1 - t0) * 0.9, layer: 'C', r: 9, p: 0.95, g: 0.3, flow: 0.36, wvar: 0.45, seed: 60 + seed, wobble: 2.6, pts: near });
  // eraser glints on the water
  const r = mulberry(70 + seed);
  for (let k = 0; k < 8; k++) {
    const i = 1 + Math.floor(r() * (c.length - 3)), u = r(), p = c[i], q = c[i + 1];
    const dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l, off = (r() - 0.5) * 60;
    const x = p.x + dx * u + nx * off, y = p.y + dy * u + ny * off, tt = t0 + (t1 - t0) * (0.8 + 0.2 * k / 8);
    const base = Math.atan2(dy, dx), n = 1 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) {
      const ang = base + (r() - 0.5) * 0.7, len = 14 + r() * r() * 110, ox = (r() - 0.5) * 40, oy = j * 11 + (r() - 0.5) * 8;
      tl.erase({ t0: tt + j * 0.05, t1: tt + j * 0.05 + 0.15, r: 2.5 + r() * 4, k: 0.3 + r() * 0.3, pts: [Q(x + ox, y + oy), Q(x + ox + Math.cos(ang) * len * 0.5, y + oy + Math.sin(ang) * len * 0.5), Q(x + ox + Math.cos(ang) * len, y + oy + Math.sin(ang) * len)] });
    }
  }
  return { c, far, near };
}
function reeds(tl, t0, t1, bank, seed, from = 1, to = bank.length - 1) {
  const r = mulberry(seed);
  for (let k = 0; k < 26; k++) {
    const u = from + (to - from) * r(), i = Math.floor(u), p = bank[i], q = bank[Math.min(bank.length - 1, i + 1)], f = u - i;
    const x = p.x + (q.x - p.x) * f, y = p.y + (q.y - p.y) * f, h = 36 + r() * 46, lean = (r() - 0.5) * 22, tt = t0 + (t1 - t0) * k / 26;
    tl.stroke({ t0: tt, t1: tt + 0.12, layer: r() < 0.35 ? 'C' : 'G', r: 2.2, p: 0.85, g: 0.35, flow: 0.4, seed: seed + k, wobble: 0.5, taper: [0.05, 0.5], ease: x => x, pts: [Q(x, y), Q(x + lean * 0.4, y - h * 0.55), Q(x + lean, y - h)] });
  }
}
function house(tl, t0, t1, cx, cy, s = 1, lane = true) {
  const at = (x, y) => P(cx + x * s, cy + y * s), d = (a) => t0 + (t1 - t0) * a, sd = Math.floor(cx + cy);
  const seg = (a, b, pts, o = {}) => tl.stroke({ t0: d(a), t1: d(b), layer: 'C', r: 4.6 * s, p: 1.0, g: 0.3, flow: 0.45, wobble: 1.4 * s, wvar: 0.4, seed: sd + Math.floor(a * 99), taper: [0.08, 0.14], ...o, pts });
  const gr = (a, b, pts, o = {}) => seg(a, b, pts, { layer: 'G', r: 2.1 * s, p: 0.9, flow: 0.5, wvar: 0.3, ...o });
  // cast shadow on the grass, rubbed out to the right
  tl.stroke({ t0: d(0), t1: d(0.08), layer: 'C', r: 15 * s, p: 0.5, g: 0.4, flow: 0.25, seed: sd + 1, wobble: 3, pts: [at(-80, 12), at(30, 18), at(190, 10)] });
  tl.smudge({ t0: d(0.07), t1: d(0.16), r: 26 * s, len: 90 * s, k: 0.6, layers: 'C', pts: [at(-60, 12), at(60, 20), at(210, 14)] });
  // a light graphite tone on the lit left wall (diagonal hatching), before the outline
  for (let k = 0; k < 11; k++) gr(0.14 + k * 0.006, 0.16 + k * 0.006, [at(-62 + k * 4, -4 - (k % 3) * 3), at(-40 + k * 4, -76 + (k % 4) * 2)], { r: 1.8 * s, p: 0.5, ease: x => x });
  seg(0.2, 0.32, [at(-64, 0), at(-65, -40), at(-63, -80)]); seg(0.3, 0.4, [at(-64, -80), at(0, -82), at(64, -80)]); seg(0.38, 0.46, [at(64, -80), at(65, -40), at(64, 0)]);
  seg(0.44, 0.58, [at(-92, -72), at(-40, -112), at(0, -148), at(46, -112), at(94, -72)], { r: 6.4 * s });
  seg(0.56, 0.62, [at(36, -124), at(36, -160), at(56, -160), at(56, -108)]);
  seg(0.1, 0.5, [at(-116, 3), at(-30, 6), at(124, 1)], { r: 3 * s, p: 0.75 });
  // roof: rows of shingle strokes of varying weight, then the thumb, then a lifted highlight on the left slope
  for (let j = 0; j < 7; j++) { const y = -82 - j * 9.5, w = 88 * (1 - (-y - 74) / 76) - 6; for (let m = 0; m < 3; m++) tl.stroke({ t0: d(0.6 + j * 0.01 + m * 0.003), t1: d(0.63 + j * 0.01 + m * 0.003), layer: 'C', r: (6 + m * 2) * s, p: 0.35 + 0.15 * ((j + m) % 3), g: 0.4, flow: 0.3, ridge: 0.5, seed: sd + 10 + j * 3 + m, wobble: 1.5, ease: x => x, pts: [at(-w + m * 8, y + m * 2), at(0, y - 2), at(w - m * 6, y + 1)] }); }
  tl.smudge({ t0: d(0.7), t1: d(0.76), r: 16 * s, len: 36 * s, k: 0.45, layers: 'C', pts: [at(-60, -88), at(0, -120), at(62, -90)] });
  tl.erase({ t0: d(0.77), t1: d(0.8), r: 5 * s, k: 0.4, pts: [at(-70, -80), at(-38, -108), at(-12, -134)] });
  // the right wall in shade: broad vertical strokes, then rubbed
  for (let k = 0; k < 7; k++) tl.stroke({ t0: d(0.72 + k * 0.008), t1: d(0.75 + k * 0.008), layer: 'C', r: 9 * s, p: 0.32 + 0.1 * (k % 2), g: 0.4, flow: 0.28, seed: sd + 30 + k, wobble: 1, ease: x => x, pts: [at(30 + k * 5, -76), at(33 + k * 5, -6)] });
  tl.smudge({ t0: d(0.8), t1: d(0.85), r: 20 * s, len: 40 * s, k: 0.5, layers: 'C', pts: [at(34, -72), at(52, -6)] });
  // the accent: door and window in sanguine, the window with a lifted glow in its middle
  const fill = (x0, y0, x1, y1, a, b, rr, pp = 0.9) => { const pts = []; const n = Math.round((x1 - x0) / (rr * 0.9)); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; pts.push(i % 2 ? at(x, y0) : at(x, y1)); } tl.stroke({ t0: d(a), t1: d(b), layer: 'S', r: rr * s, p: pp, g: 0.3, flow: 0.4, seed: sd + 130 + Math.floor(x0), wobble: 0.6, taper: [0.02, 0.02], spacing: 0.35, pts }); };
  fill(-50, -60, -22, -34, 0.84, 0.9, 6); fill(-50, -60, -22, -34, 0.9, 0.93, 5, 0.7);
  fill(8, -58, 34, -2, 0.9, 0.96, 6);
  tl.stroke({ t0: d(0.96), t1: d(0.98), layer: 'S', r: 4 * s, p: 1.0, g: 0.2, flow: 0.5, seed: sd + 140, wobble: 0.5, pts: [at(33, -58), at(34, -2)] });
  tl.erase({ t0: d(0.94), t1: d(0.96), r: 4 * s, k: 0.35, round: 1, pts: [at(-40, -52), at(-33, -44)] });
  gr(0.95, 1, [at(-54, -64), at(-18, -64), at(-18, -30), at(-54, -30), at(-54, -64)]);
  gr(0.97, 1, [at(-36, -64), at(-36, -30)], { r: 1.7 * s }); gr(0.97, 1, [at(-54, -47), at(-18, -47)], { r: 1.7 * s });
  // smoke from the chimney: graphite, then rubbed up into the sky
  tl.stroke({ t0: d(0.92), t1: d(1), layer: 'G', r: 6 * s, p: 0.5, g: 0.3, flow: 0.3, seed: sd + 150, wobble: 3, pts: [at(46, -164), at(60, -200), at(44, -240), at(66, -280)] });
  tl.smudge({ t0: d(0.98), t1: d(1), r: 18 * s, len: 50 * s, k: 0.6, layers: 'G', pts: [at(46, -170), at(60, -210), at(48, -250), at(64, -290)] });
  // grass flicks at the foot of the wall, and the lane to the door lifted out with the eraser
  for (let k = 0; k < 16; k++) tl.stroke({ t0: d(0.95 + k * 0.003), t1: d(0.97 + k * 0.003), layer: k % 4 === 0 ? 'G' : 'C', r: 2.4 * s, p: 0.9, g: 0.4, flow: 0.4, seed: sd + 60 + k, wobble: 0.4, taper: [0.05, 0.6], ease: x => x, pts: [at(-126 + k * 17, 6), at(-124 + k * 17 + (k % 3 - 1) * 5, -14 - (k * 7 % 13))] });
  if (lane) tl.erase({ t0: d(0.99), t1: d(1), r: 16 * s, k: 0.4, pts: [at(22, 14), at(60, 60), at(120, 120), at(220, 190)] });
}
function tree(tl, t0, t1, cx, cy, s = 1) {
  const d = a => t0 + (t1 - t0) * a, at = (x, y) => P(cx + x * s, cy + y * s), sd = Math.floor(cx);
  tl.stroke({ t0: d(0), t1: d(0.06), layer: 'C', r: 28 * s, p: 0.4, g: 0.4, flow: 0.25, seed: sd, wobble: 3, pts: [at(-70, 8), at(10, 14), at(120, 6)] });
  tl.smudge({ t0: d(0.05), t1: d(0.1), r: 24 * s, len: 80 * s, k: 0.55, layers: 'C', pts: [at(-60, 10), at(60, 16), at(140, 8)] });
  // trunk: two pulls of the stick, one thicker on the shaded side
  tl.stroke({ t0: d(0.1), t1: d(0.22), layer: 'C', r: 13 * s, rEnd: 5 * s, p: 1.0, g: 0.3, flow: 0.4, seed: sd + 1, wobble: 2.4, wvar: 0.35, pts: [at(0, 0), at(-8, -90), at(3, -190), at(-4, -270)] });
  tl.stroke({ t0: d(0.2), t1: d(0.27), layer: 'C', r: 7 * s, rEnd: 3 * s, p: 0.8, g: 0.3, flow: 0.4, seed: sd + 2, wobble: 2, pts: [at(7, -4), at(2, -90), at(10, -190), at(2, -260)] });
  [[-4, -180, -86, -258], [2, -205, 74, -296], [-3, -250, 14, -346], [0, -150, 58, -214], [-4, -140, -52, -198]].forEach(([x0, y0, x1, y1], i) => tl.stroke({ t0: d(0.26 + i * 0.03), t1: d(0.33 + i * 0.03), layer: 'C', r: (4.2 - i * 0.4) * s, p: 0.9, g: 0.3, flow: 0.35, seed: sd + 10 + i, wobble: 1.8, wvar: 0.4, pts: [at(x0, y0), at((x0 + x1) / 2 + 8, (y0 + y1) / 2 - 12), at(x1, y1)] }));
  // crown: broken masses, two tones, rubbed together, then light lifted out of the lit upper left
  for (let k = 0; k < 9; k++) { const a = k * 1.3, lit = k % 3 === 0; tl.stroke({ t0: d(0.42 + k * 0.04), t1: d(0.5 + k * 0.04), layer: 'C', r: (lit ? 34 : 50) * s, p: lit ? 0.4 : 0.7, g: 0.5, flow: 0.26, ridge: 0.6, seed: sd + 20 + k, wobble: 7, pts: [at(-100 + 56 * Math.cos(a), -300 + 36 * Math.sin(a)), at(8 + 44 * Math.sin(a), -338 + 24 * Math.cos(a)), at(100 + 24 * Math.cos(a), -296 + 44 * Math.sin(a))] }); }
  tl.smudge({ t0: d(0.8), t1: d(0.88), r: 46 * s, len: 56 * s, k: 0.5, layers: 'C', pts: [at(-120, -290), at(-10, -356), at(110, -296)] });
  tl.erase({ t0: d(0.88), t1: d(0.92), r: 20 * s, k: 0.28, pts: [at(-90, -332), at(-40, -362), at(10, -354)] });
  const r = mulberry(33 + sd);
  for (let k = 0; k < 26; k++) { const x = -118 + r() * 236, y = -246 - r() * 124, a = r() * 6.28; tl.stroke({ t0: d(0.88 + k * 0.004), t1: d(0.9 + k * 0.004), layer: k % 5 === 0 ? 'G' : 'C', r: 2.4 * s, p: 0.9, g: 0.4, flow: 0.35, seed: sd + 40 + k, wobble: 0.5, ease: x => x, pts: [at(x, y), at(x + 15 * Math.cos(a), y + 10 * Math.sin(a))] }); }
}
function bush(tl, t0, x, y, s, seed) {
  tl.stroke({ t0, t1: t0 + 0.5, layer: 'C', r: 26 * s, p: 0.6, g: 0.5, flow: 0.28, ridge: 0.5, seed, wobble: 4, pts: [P(x - 40 * s, y), P(x, y - 12 * s), P(x + 44 * s, y + 2)] });
  tl.smudge({ t0: t0 + 0.4, t1: t0 + 0.7, r: 24 * s, len: 30 * s, k: 0.5, layers: 'C', pts: [P(x - 40 * s, y), P(x + 44 * s, y)] });
  tl.stroke({ t0: t0 + 0.7, t1: t0 + 0.9, layer: 'C', r: 3 * s, p: 0.9, g: 0.3, flow: 0.4, seed: seed + 1, wobble: 1, pts: [P(x - 50 * s, y + 14 * s), P(x, y + 18 * s), P(x + 52 * s, y + 14 * s)] });
}
function fence(tl, t0, t1, a, b, n, seed) {
  const r = mulberry(seed);
  for (let k = 0; k < n; k++) {
    const u = k / (n - 1), x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u, tt = t0 + (t1 - t0) * u;
    tl.stroke({ t0: tt, t1: tt + 0.14, layer: 'C', r: 3.2, p: 0.9, g: 0.4, flow: 0.4, seed: seed + k, wobble: 0.6, ease: z => z, pts: [P(x, y), P(x + (r() - 0.5) * 4, y - 44 - r() * 8)] });
  }
  tl.stroke({ t0: t0 + 0.3, t1: t1 + 0.1, layer: 'G', r: 1.8, p: 0.85, g: 0.3, flow: 0.45, seed: seed + 50, wobble: 0.8, pts: [P(a[0] - 4, a[1] - 30), P((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 33), P(b[0] + 4, b[1] - 31)] });
}
function scrub(tl, t0, t1, pts, r, k, passes = 2) {
  // back-and-forth eraser scrub along a path
  const all = []; for (let i = 0; i < passes; i++) { const q = i % 2 ? pts.slice().reverse() : pts; all.push(...q); }
  return tl.erase({ t0, t1, r, k, pts: all });
}

// ---- the film ------------------------------------------------------------------------------------
// a thin mark is erased and the grey it leaves is blended back from its surroundings, so a ghost is soft grey and not a white blot
function ghost(tl, t0, t1, pts, r, k) {
  tl.erase({ t0, t1, r, k, round: 1, pts });
  tl.smudge({ t0: t1, t1: t1 + 0.25, r: r * 2.2, len: r * 2, k: 0.55, layers: 'C', pts: pts.map(p => ({ x: p.x - 2, y: p.y })) });
}
export function build() {
  const tl = new Timeline(), cap = [], hits = [];
  tone(tl, 0.6, 7);
  hills(tl, 7.4);
  [[760, 540, 0.3], [1180, 520, 0.22], [2460, 470, 0.26], [2820, 500, 0.3]].forEach(([x, y, s], i) => tl.stroke({ t0: 11 + i * 0.2, t1: 11.3 + i * 0.2, layer: 'C', r: 5 * s * 4, p: 0.8, g: 0.3, flow: 0.4, seed: 500 + i, wobble: 1, taper: [0.1, 0.4], pts: [P(x, y), P(x, y - 60 * s * 3)] }));
  const y0 = riverMass(tl, 11.5, 15.5, 0, 1);
  reeds(tl, 15.2, 17, y0.near, 301, 1, 6);
  bush(tl, 16.2, 1180, 930, 0.9, 520); bush(tl, 16.7, 2580, 1060, 0.8, 530);
  tree(tl, 16.5, 21, 1560, 800, 1.15);
  house(tl, 18, 23, 2040, 800, 1.6);
  fence(tl, 22.8, 24, [2330, 860], [2850, 930], 9, 400);
  cap.push({ t0: 13.2, t1: 19.5, text: 'Year one.\nThe river keeps to its bed.' });
  hits.push(['y3_erase', 25], ['y3_draw', 27], ['y7_erase', 33], ['y7_draw', 35], ['y9_erase', 41], ['y9_draw', 43], ['house_erase', 45], ['house_draw', 47], ['title', 51]);
  // year three: lift the old outer bank, rub the water, draw the new bank nearer
  scrub(tl, 25, 26.6, sub(riverLine(0), 3, 7), 70, 0.78, 3);
  tl.smudge({ t0: 25.9, t1: 26.9, r: 80, len: 160, k: 0.5, layers: 'CGS', pts: sub(riverLine(60), 3, 7) });
  const y3 = riverMass(tl, 27, 30.4, 95, 3);
  reeds(tl, 30.2, 31.4, y3.near, 311, 3, 6);
  cap.push({ t0: 27, t1: 33, text: 'Year three.\nThe bend leans toward the lane.' });
  // year seven
  scrub(tl, 33, 34.6, sub(riverLine(95), 3, 7), 80, 0.8, 3);
  riverMass(tl, 35, 37.6, 190, 7);
  for (let k = 0; k < 5; k++) { const u = (k + 1) / 8, x = 2330 + 520 * u, y = 860 + 70 * u; ghost(tl, 37.9 + k * 0.4, 38.2 + k * 0.4, [P(x, y + 4), P(x + 1, y - 24), P(x + 2, y - 52)], 6, 0.55); }
  cap.push({ t0: 35, t1: 41, text: 'Year seven.\nThe bank takes the garden.' });
  // year nine: the river reaches the door; the house is lifted off the paper and set higher
  scrub(tl, 41, 42.8, sub(riverLine(190), 3, 7), 80, 0.8, 3);
  riverMass(tl, 43, 45.2, 290, 9);
  scrub(tl, 45, 46.4, [P(1900, 800), P(2190, 790), P(2040, 660), P(2040, 800)], 80, 0.6, 3);
  tl.smudge({ t0: 46.2, t1: 47, r: 120, len: 150, k: 0.6, layers: 'CGS', pts: [P(1780, 700), P(2040, 750), P(2300, 700)] });
  tl.smudge({ t0: 46.6, t1: 47.2, r: 110, len: 140, k: 0.55, layers: 'CGS', pts: [P(2300, 900), P(2040, 740), P(1780, 880)] });
  house(tl, 47, 50.4, 2400, 690, 1.35, false);
  cap.push({ t0: 43, t1: 49.6, text: 'Year nine.\nI am moving the house.' });
  tl.text({ t0: 51, t1: 52.6, text: 'THE BEND', font: "700 230px Caveat", x: 330, y: 1390, flow: 0.55, passes: 4 });
  return { tl, cap, hits };
}

const CAM0 = track([
  [0, [1600, 900, 0.54]], [6, [1600, 900, 0.60]], [11, [1500, 820, 0.82]], [17, [1800, 820, 0.96]], [23, [2050, 860, 0.96]],
  [27, [2000, 920, 1.12]], [31, [2000, 930, 1.05]], [37, [2020, 880, 1.15]], [42, [2020, 780, 1.12]], [46, [2100, 700, 1.1]], [49.2, [2300, 680, 1.15]], [50.6, [2150, 760, 0.95]], [53, [1600, 900, 0.54]], [57, [1600, 900, 0.54]],
]);
export const CAM = t => { const [x, y, z] = CAM0(t); return [x + OX, y + OY, z]; };
