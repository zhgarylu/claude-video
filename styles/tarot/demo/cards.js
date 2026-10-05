// The deck: eight original linocut cards and one card back, drawn once into offscreen canvases (2x).
// Card-local units: 420 x 700. Everything is seeded; nothing here depends on time.
import { mulberry, vnoise, TAU } from '/core/lib.js';

export const CW = 420, CH = 700, SC = 2, SCB = 4;
export const PAL = {
  ink: '#1c1b26', paper: '#ecdfc3', paper2: '#dccdaa', red: '#c9422c', cloth: '#20403c',
};
export const DECK = [
  { id: 'lantern', num: 'I', title: 'THE LANTERN' },
  { id: 'key', num: 'II', title: 'THE KEY' },
  { id: 'tide', num: 'III', title: 'THE TIDE' },
  { id: 'compass', num: 'VII', title: 'THE COMPASS' },
  { id: 'moth', num: 'IX', title: 'THE MOTH' },
  { id: 'bell', num: 'XII', title: 'THE BELL' },
  { id: 'ladder', num: 'XV', title: 'THE LADDER' },
  { id: 'glass', num: 'XX', title: 'THE HOURGLASS' },
];

// ------------------------------------------------------------------ geometry helpers
const arcPts = (cx, cy, rx, ry, a0, a1, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const bez = (p0, p1, p2, p3, n = 30) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; });
const quad = (p0, p1, p2, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; });
function resample(pts, step) {
  const out = [pts[0]]; let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i]; let d = Math.hypot(x1 - x0, y1 - y0);
    while (acc + d >= step) { const k = (step - acc) / d; x0 += (x1 - x0) * k; y0 += (y1 - y0) * k; out.push([x0, y0]); d = Math.hypot(x1 - x0, y1 - y0); acc = 0; }
    acc += d;
  }
  out.push(pts[pts.length - 1]); return out;
}
let SEED = 1;
// a carved line: swelling and tapering, with a little hand tremor
function tstroke(c, pts, w, o = {}) {
  const P = resample(pts, 2.2), n = P.length; if (n < 2) return;
  const L = [], R = [], s = (o.seed ?? SEED++) * 7.31, tp = o.taper ?? .18;
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const u = i / (n - 1), tap = tp > 0 ? Math.pow(Math.min(1, u / tp, (1 - u) / tp), .7) : 1;
    const hw = w * Math.max(.12, tap) * (1 + (o.jit ?? .22) * (vnoise(i * .18 + s) * 2 - 1)) / 2;
    const tr = (vnoise(i * .09 + s * 3) - .5) * (o.tremor ?? .9);
    L.push([P[i][0] - ty * (hw + tr), P[i][1] + tx * (hw + tr)]); R.push([P[i][0] + ty * (hw - tr), P[i][1] - tx * (hw - tr)]);
  }
  c.beginPath(); c.moveTo(L[0][0], L[0][1]); for (const p of L) c.lineTo(p[0], p[1]); for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]); c.closePath(); c.fill();
}
// a filled shape with hand-cut edges
function blob(c, pts, rough = .9) {
  const P = resample(pts, 5); const s = SEED++ * 3.7;
  c.beginPath(); P.forEach((p, i) => { const x = p[0] + (vnoise(i * .4 + s) - .5) * rough * 2, y = p[1] + (vnoise(i * .4 + s + 50) - .5) * rough * 2; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath();
}
const fill = (c, col) => { c.fillStyle = col; };
const hatch = (c, clip, ang, gap, w, col, R, cx = 0, cy = 0, extent = 420) => {
  c.save(); clip(); c.translate(cx, cy); c.rotate(ang); c.fillStyle = col;
  for (let y = -extent; y < extent; y += gap) { let x = -extent; while (x < extent) { const l = 30 + R() * 90; if (R() > .12) tstroke(c, [[x, y + (R() - .5) * 1.2], [x + l, y + (R() - .5) * 1.2]], w, { taper: .3 }); x += l + 4 + R() * 10; } }
  c.restore();
};
const star4 = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * .28 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); };
const disc = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
const line = (c, a, b, w, col, o) => { c.fillStyle = col; tstroke(c, [a, b], w, o); };
const poly = (c, pts, col, rough = .8) => { c.fillStyle = col; blob(c, pts, rough); c.fill(); };
const ring = (c, x, y, r, w, col, a0 = 0, a1 = TAU) => { c.fillStyle = col; tstroke(c, arcPts(x, y, r, r, a0, a1, 60), w, { taper: a1 - a0 >= TAU - .01 ? 0 : .12 }); };
const flicks = (c, R, n, x0, y0, x1, y1, col, len = 22, w = 1.8) => { c.fillStyle = col; for (let i = 0; i < n; i++) { const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), l = len * (.4 + R()); tstroke(c, [[x, y], [x + l, y + (R() - .5) * 3]], w, { taper: .35 }); } };
const speckle = (c, R, n, x0, y0, x1, y1, col, r = 1.4) => { c.fillStyle = col; for (let i = 0; i < n; i++) { c.beginPath(); c.arc(x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), r * (.3 + R() * .9), 0, TAU); c.fill(); } };

const { ink, paper, red } = PAL;
const WW = 332, WH = 430;   // illustration window

// ------------------------------------------------------------------ the eight pictures (window space)
const PICS = {
  lantern(c, R) {
    fill(c, ink); c.fillRect(0, 0, WW, WH);
    flicks(c, R, 80, 0, 0, WW, 250, paper, 24);
    [[40, 40, 9], [290, 60, 11], [60, 150, 7], [280, 190, 7], [150, 30, 6]].forEach(([x, y, r]) => star4(c, x, y, r, paper));
    const cx = 166, cy = 150;
    for (let i = 0; i < 40; i++) {
      const a = i / 40 * TAU + .04, r0 = 64, r1 = i % 2 ? 150 : 250, w = .020 + (i % 4 === 0 ? .01 : 0);
      poly(c, [[cx + Math.cos(a - w) * r0, cy + Math.sin(a - w) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1], [cx + Math.cos(a + w) * r0, cy + Math.sin(a + w) * r0]], i % 8 === 0 ? red : paper, .4);
    }
    // chain, roof, cage, flame
    for (let k = 0; k < 5; k++) { c.fillStyle = paper; ring(c, 166, 14 + k * 11, k % 2 ? 3 : 6, 2.6, paper); }
    poly(c, [[166, 62], [216, 100], [116, 100]], paper); hatch(c, () => { blob(c, [[166, 62], [216, 100], [116, 100]]); c.clip(); }, 1.2, 5, 1.4, ink, R, 166, 90, 80);
    disc(c, 166, 60, 5, paper);
    poly(c, [[122, 100], [210, 100], [214, 206], [118, 206]], paper); poly(c, [[130, 106], [202, 106], [204, 200], [128, 200]], ink, .5);
    [150, 166, 182].forEach(x => line(c, [x, 106], [x, 200], 2.6, paper));
    const flame = [...bez([166, 112], [182, 140], [192, 160], [166, 192], 20), ...bez([166, 192], [140, 160], [150, 140], [166, 112], 20)];
    poly(c, flame, red, .6); poly(c, [...bez([166, 150], [175, 165], [176, 176], [166, 188], 12), ...bez([166, 188], [156, 176], [157, 165], [166, 150], 12)], paper, .4);
    poly(c, [[108, 206], [224, 206], [218, 224], [114, 224]], paper); [[120, 215], [212, 215]].forEach(([a, b]) => 0); line(c, [124, 214], [208, 214], 2, ink);
    // hill, path, walker
    const hill = [[0, 392], ...quad([0, 392], [90, 330], [166, 328], 20), ...quad([166, 328], [250, 326], [332, 388], 20), [332, 430], [0, 430]];
    poly(c, hill, paper, .6);
    hatch(c, () => { blob(c, hill); c.clip(); }, .0, 7, 1.7, ink, R, 166, 380, 300);
    poly(c, [[154, 430], [178, 430], [172, 336], [160, 336]], ink, .4);   // the path
    for (let i = 0; i < 6; i++) line(c, [158 - i * .4, 428 - i * 14], [176 + i * .4, 428 - i * 14], 1.4, paper, { taper: .4 });
    poly(c, [[158, 346], [174, 346], [178, 372], [154, 372]], ink, .3); disc(c, 166, 340, 6, ink); line(c, [181, 336], [182, 376], 2.4, ink);
    c.fillStyle = paper; c.beginPath(); c.arc(166, 340, 2.2, 0, TAU); c.fill();
    speckle(c, R, 120, 0, 0, WW, WH, paper, 1.2);
  },
  key(c, R) {
    fill(c, red); c.fillRect(0, 0, WW, WH);
    for (let i = 0; i < 70; i++) { const a = i / 70 * TAU, r0 = 150 + R() * 30, r1 = r0 + 20 + R() * 40; line(c, [166 + Math.cos(a) * r0, 205 + Math.sin(a) * r0], [166 + Math.cos(a) * r1, 205 + Math.sin(a) * r1], 2.4, paper); }
    const arch = (inset) => { const r = 110 - inset; return [[166 - r, 436], [166 - r, 150], ...arcPts(166, 150, r, r, Math.PI, TAU, 40), [166 + r, 436]]; };
    poly(c, arch(-12), paper, .5); poly(c, arch(-6), red, .5); poly(c, arch(0), ink, .5);
    flicks(c, R, 40, 70, 60, 262, 300, paper, 8, 1.6); [[100, 130, 6], [226, 110, 7], [190, 60, 5], [120, 70, 4]].forEach(([x, y, r]) => star4(c, x, y, r, paper));
    // steps
    [[76, 392, 256], [60, 408, 272], [48, 422, 284]].forEach(([a, y, b], i) => { poly(c, [[a - 20, 436], [a - 20, y], [b + 20, y], [b + 20, 436]], i % 2 ? paper : red, .4); });
    line(c, [56, 392], [276, 392], 3, paper);
    // the key
    c.save(); c.translate(166, 0);
    disc(c, 0, 118, 52, paper); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + .2; disc(c, Math.cos(a) * 52, 118 + Math.sin(a) * 52, 10, paper); }
    disc(c, 0, 118, 28, ink); disc(c, 7, 114, 23, paper); disc(c, 0, 118, 8, red);
    ring(c, 0, 118, 42, 2, ink);
    poly(c, [[-8, 168], [8, 168], [8, 340], [-8, 340]], paper, .4); poly(c, [[-14, 178], [14, 178], [14, 190], [-14, 190]], paper); poly(c, [[-14, 204], [14, 204], [14, 212], [-14, 212]], paper);
    poly(c, [[8, 316], [48, 316], [48, 330], [32, 330], [32, 344], [48, 344], [48, 360], [8, 360]], paper, .4);
    for (let y = 222; y < 340; y += 6) line(c, [-6, y], [-6, y + 4], 1.2, ink, { taper: 0 });
    [[-2, 224, 308]].forEach(() => 0); line(c, [0, 224], [0, 312], 1.4, ink);
    c.restore();
    speckle(c, R, 160, 0, 0, WW, WH, paper, 1.1);
  },
  tide(c, R) {
    fill(c, paper); c.fillRect(0, 0, WW, WH);
    const sx = 218, sy = 118; disc(c, sx, sy, 56, red);
    for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, r0 = 66 + (i % 2) * 6, r1 = r0 + 14 + R() * 12; line(c, [sx + Math.cos(a) * r0, sy + Math.sin(a) * r0], [sx + Math.cos(a) * r1, sy + Math.sin(a) * r1], 2.2, ink); }
    flicks(c, R, 26, 0, 20, 90, 170, ink, 20, 1.5);
    [[40, 60], [70, 100], [56, 130]].forEach(([x, y]) => { c.fillStyle = ink; tstroke(c, [[x - 12, y - 4], [x, y + 3], [x + 12, y - 4]], 3, { taper: .3 }); });
    const rows = 7, y0 = 196, dy = 34, sw = 54;
    const rowTop = (k, x) => y0 + k * dy;
    const drawRow = (k) => {
      const yy = y0 + k * dy, off = (k % 2) * sw / 2, pts = [[-sw, 430], [-sw, yy]];
      for (let x = -sw + off - sw; x < WW + sw; x += sw) pts.push(...arcPts(x + sw / 2, yy + 16, sw / 2, 22 + k * 1.5, Math.PI, TAU, 14));
      pts.push([WW + sw, 430]);
      poly(c, pts, paper, .3);
      const band = () => { blob(c, pts); c.clip(); };
      if (k >= 5) { poly(c, pts, ink, .3); c.save(); band(); for (let x = -sw + off - sw; x < WW + sw; x += sw) ring(c, x + sw / 2, yy + 22, sw / 2 - 6, 2.2, paper, Math.PI * 1.08, Math.PI * 1.92); c.restore(); }
      else {
        hatch(c, band, 0, Math.max(4.5, 11 - k * 1.3), 1.5 + k * .22, ink, R, 0, yy + 28, 200);
      }
      c.save(); band(); for (let x = -sw + off - sw; x < WW + sw; x += sw) ring(c, x + sw / 2, yy + 16, sw / 2, 3.4, ink, Math.PI * 1.02, Math.PI * 1.98); c.restore();
    };
    drawRow(0); drawRow(1);
    // boat
    c.save(); c.translate(96, 0);
    line(c, [10, 226], [10, 142], 3.2, ink); poly(c, [[14, 148], [14, 218], [58, 218]], paper); hatch(c, () => { blob(c, [[14, 148], [14, 218], [58, 218]]); c.clip(); }, .9, 5, 1.3, ink, R, 30, 190, 80);
    c.fillStyle = ink; tstroke(c, [[14, 148], [14, 218], [58, 218], [14, 148]], 2.6, { taper: 0 });
    poly(c, [[6, 166], [6, 218], [-26, 218]], red); poly(c, [[10, 142], [30, 148], [10, 154]], red);
    poly(c, [[-32, 220], [70, 220], [58, 240], [-18, 240]], ink, .5); line(c, [-24, 226], [64, 226], 1.6, paper);
    c.restore();
    for (let k = 2; k < rows; k++) drawRow(k);
    speckle(c, R, 100, 0, 0, WW, 200, ink, .9);
  },
  compass(c, R) {
    fill(c, ink); c.fillRect(0, 0, WW, WH);
    const cx = 166, cy = 215; flicks(c, R, 80, 0, 0, WW, WH, paper, 14, 1.4);
    disc(c, cx, cy, 150, ink); ring(c, cx, cy, 150, 5, paper); ring(c, cx, cy, 138, 2, paper);
    for (let i = 0; i < 72; i++) { const a = i / 72 * TAU, l = i % 9 === 0 ? 20 : i % 3 === 0 ? 12 : 7; line(c, [cx + Math.cos(a) * 136, cy + Math.sin(a) * 136], [cx + Math.cos(a) * (136 - l), cy + Math.sin(a) * (136 - l)], 2, paper, { taper: 0 }); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU - Math.PI / 2, big = i % 2 === 0, r = big ? 112 : 70, w = big ? .26 : .3; const col = i === 0 ? red : paper;
      poly(c, [[cx + Math.cos(a) * r, cy + Math.sin(a) * r], [cx + Math.cos(a + w) * 20, cy + Math.sin(a + w) * 20], [cx, cy], [cx + Math.cos(a - w) * 20, cy + Math.sin(a - w) * 20]], col, .4);
      poly(c, [[cx + Math.cos(a) * r, cy + Math.sin(a) * r], [cx + Math.cos(a + w) * 20, cy + Math.sin(a + w) * 20], [cx, cy]], i === 0 ? '#9f301f' : paper2(), .4); }
    disc(c, cx, cy, 11, paper); disc(c, cx, cy, 5, ink);
    c.fillStyle = paper; c.font = '400 26px "IM Fell English"'; c.textAlign = 'center'; c.fillText('N', cx, cy - 154);
    speckle(c, R, 100, 0, 0, WW, WH, paper, 1);
  },
  moth(c, R) {
    fill(c, red); c.fillRect(0, 0, WW, WH);
    disc(c, 166, 215, 150, '#d2563c'); ring(c, 166, 215, 150, 3, ink);
    flicks(c, R, 70, 0, 0, WW, WH, paper, 12, 1.4);
    const cx = 166;
    const wing = (sx, up, lo, spots) => {
      const U = sx > 0 ? 1 : -1;
      const pu = [...bez([cx + U * 8, 190], [cx + U * 70, 90], [cx + U * 150, 110], [cx + U * 150, 150], 20), ...bez([cx + U * 150, 150], [cx + U * 130, 200], [cx + U * 60, 215], [cx + U * 8, 215], 20)];
      const pl = [...bez([cx + U * 8, 212], [cx + U * 110, 205], [cx + U * 140, 280], [cx + U * 100, 330], 20), ...bez([cx + U * 100, 330], [cx + U * 60, 350], [cx + U * 20, 270], [cx + U * 8, 240], 20)];
      [pu, pl].forEach((pp, j) => { poly(c, pp, paper, .6); hatch(c, () => { blob(c, pp); c.clip(); }, .4 + j, 6, 1.6, ink, R, cx + U * 90, 220, 140); c.fillStyle = ink; tstroke(c, pp.concat([pp[0]]), 3.4, { taper: 0 }); });
      disc(c, cx + U * 100, 165, 22, ink); disc(c, cx + U * 100, 165, 14, paper); disc(c, cx + U * 100, 165, 7, red);
      disc(c, cx + U * 64, 296, 11, ink); disc(c, cx + U * 64, 296, 5, paper);
    };
    wing(1); wing(-1);
    poly(c, [...bez([cx, 150], [cx + 22, 180], [cx + 14, 300], [cx, 340], 14), ...bez([cx, 340], [cx - 14, 300], [cx - 22, 180], [cx, 150], 14)], ink, .5);
    for (let k = 0; k < 6; k++) line(c, [cx - 10, 190 + k * 20], [cx + 10, 190 + k * 20], 2, paper, { taper: .3 });
    disc(c, cx, 142, 12, ink);
    [-1, 1].forEach(U => { c.fillStyle = ink; tstroke(c, quad([cx + U * 4, 134], [cx + U * 24, 90], [cx + U * 56, 74], 16), 3, {}); for (let k = 0; k < 7; k++) { const t = k / 7; const x = cx + U * (4 + 52 * t), y = 134 - 60 * Math.sin(t * 1.4); line(c, [x, y], [x + U * 5, y - 12], 1.8, ink, { taper: .3 }); } });
    speckle(c, R, 90, 0, 0, WW, WH, paper, 1);
  },
  bell(c, R) {
    fill(c, paper); c.fillRect(0, 0, WW, WH);
    for (let a = 0; a < 3; a++) for (let s = -1; s <= 1; s += 2) ring(c, 166, 190, 150 + a * 22, 3.6, red, s > 0 ? -.7 : Math.PI - 0.7 + .0, s > 0 ? .7 : Math.PI + .7);
    flicks(c, R, 36, 0, 0, WW, 60, ink, 16, 1.4);
    line(c, [166, 0], [166, 70], 6, ink, { taper: 0 }); disc(c, 166, 74, 14, ink);
    const bellP = [...bez([120, 90], [96, 200], [86, 270], [64, 316], 20), [62, 330], [270, 330], [268, 316], ...bez([268, 316], [246, 270], [236, 200], [212, 90], 20)];
    const b2 = bellP.map(([x, y]) => [x, y]);
    poly(c, [[110, 84], [222, 84], [222, 100], [110, 100]], ink, .5); poly(c, b2, ink, .6);
    c.save(); blob(c, b2); c.clip(); for (let i = 0; i < 9; i++) { const x = 100 + i * 15; tstroke(c, bez([x + (i - 4) * .5, 108], [x + (i - 4) * 3, 200], [x + (i - 4) * 8, 270], [x + (i - 4) * 12, 326], 18), 1.8, { taper: .25 }) ; }
    c.fillStyle = paper; for (let i = 0; i < 9; i++) { const x = 100 + i * 15; tstroke(c, bez([x + (i - 4) * .5, 108], [x + (i - 4) * 3, 200], [x + (i - 4) * 8, 270], [x + (i - 4) * 12, 326], 18), 1.8, { taper: .25 }); }
    c.restore();
    line(c, [58, 336], [274, 336], 8, ink, { taper: 0 }); line(c, [66, 324], [262, 324], 3, paper, { taper: .1 });
    ring(c, 166, 200, 34, 4, red); disc(c, 166, 200, 14, red);
    poly(c, [[150, 342], [182, 342], [176, 372], [156, 372]], ink, .5); disc(c, 166, 380, 14, ink);
    star4(c, 60, 200, 10, ink); star4(c, 274, 180, 8, ink);
    speckle(c, R, 90, 0, 0, WW, WH, ink, .9);
  },
  ladder(c, R) {
    fill(c, ink); c.fillRect(0, 0, WW, WH);
    flicks(c, R, 110, 0, 0, WW, WH, paper, 20, 1.6);
    // crescent moon
    disc(c, 166, 76, 54, red); disc(c, 188, 66, 46, ink);
    [[50, 50, 10], [280, 120, 8], [270, 40, 6], [60, 150, 6]].forEach(([x, y, r]) => star4(c, x, y, r, paper));
    // cloud banks
    [[0, 330, 120, 60], [200, 300, 160, 70], [60, 380, 260, 70]].forEach(([x, y, w, h], i) => { poly(c, [...arcPts(x + w / 2, y + h, w / 2, h, Math.PI, TAU, 22), [x + w, y + h + 40], [x, y + h + 40]], i % 2 ? paper : '#d9c9a6', .8); hatch(c, () => { blob(c, [...arcPts(x + w / 2, y + h, w / 2, h, Math.PI, TAU, 22), [x + w, y + h + 40], [x, y + h + 40]]); c.clip(); }, 0, 6, 1.4, ink, R, x + w / 2, y + h, 140); });
    // ladder in perspective, leaning up and away to the moon
    const pts = (t) => [166 + (t - .5) * 0, 0];
    const yb = 430, yt = 128, bw = 120, tw = 34;
    const xl = t => 166 - (bw + (tw - bw) * t) / 2, xr = t => 166 + (bw + (tw - bw) * t) / 2, yy = t => yb + (yt - yb) * t;
    [xl, xr].forEach(f => { poly(c, [[f(0) - 6, yy(0)], [f(0) + 6, yy(0)], [f(1) + 3, yy(1)], [f(1) - 3, yy(1)]], paper, .5); });
    for (let i = 1; i <= 9; i++) { const t = i / 10; line(c, [xl(t), yy(t)], [xr(t), yy(t)], 7 - t * 3, paper, { taper: 0 }); }
    for (let i = 0; i < 4; i++) star4(c, 90 + i * 50, 250 + (i % 2) * 40, 5, red);
    speckle(c, R, 80, 0, 0, WW, WH, paper, 1);
  },
  glass(c, R) {
    fill(c, paper); c.fillRect(0, 0, WW, WH);
    for (let i = 0; i < 60; i++) { const a = i / 60 * TAU; line(c, [166 + Math.cos(a) * 170, 215 + Math.sin(a) * 170], [166 + Math.cos(a) * 205, 215 + Math.sin(a) * 205], 2.4, ink); }
    disc(c, 166, 215, 160, paper2());
    const cx = 166;
    const bulbT = [...bez([cx - 80, 70], [cx - 80, 170], [cx - 12, 190], [cx - 8, 215], 20), ...bez([cx - 8, 215], [cx + 12, 190], [cx + 80, 170], [cx + 80, 70], 20)];
    const bulbB = [...bez([cx - 80, 360], [cx - 80, 260], [cx - 12, 240], [cx - 8, 215], 20), ...bez([cx - 8, 215], [cx + 12, 240], [cx + 80, 260], [cx + 80, 360], 20)];
    poly(c, bulbT, paper, .4); poly(c, bulbB, paper, .4);
    // sand: top nearly empty, bottom a heap
    c.save(); blob(c, bulbT); c.clip(); poly(c, [[cx - 70, 150], [cx + 70, 150], [cx + 6, 215], [cx - 6, 215]], red, .6); c.restore();
    c.save(); blob(c, bulbB); c.clip(); poly(c, [...quad([cx - 90, 360], [cx, 240], [cx + 90, 360]), [cx + 90, 370], [cx - 90, 370]], red, .6); line(c, [cx, 216], [cx, 290], 2.6, red, { taper: 0 }); c.restore();
    hatch(c, () => { blob(c, bulbT); c.clip(); }, .8, 9, 1.2, ink, R, cx, 130, 90);
    hatch(c, () => { blob(c, bulbB); c.clip(); }, -.8, 9, 1.2, ink, R, cx, 310, 90);
    c.fillStyle = ink; tstroke(c, bulbT.concat([bulbT[0]]), 4, { taper: 0 }); tstroke(c, bulbB.concat([bulbB[0]]), 4, { taper: 0 });
    poly(c, [[cx - 104, 56], [cx + 104, 56], [cx + 104, 74], [cx - 104, 74]], ink, .5); poly(c, [[cx - 104, 360], [cx + 104, 360], [cx + 104, 378], [cx - 104, 378]], ink, .5);
    [-96, 96].forEach(x => { line(c, [cx + x, 74], [cx + x, 360], 7, ink, { taper: 0 }); });
    line(c, [cx - 92, 66], [cx + 92, 66], 2, paper, { taper: .2 }); line(c, [cx - 92, 369], [cx + 92, 369], 2, paper, { taper: .2 });
    speckle(c, R, 90, 0, 0, WW, WH, ink, .9);
  },
};
function paper2() { return PAL.paper2; }

// ------------------------------------------------------------------ card chrome
function mk(w, h) { const k = document.createElement('canvas'); k.width = w; k.height = h; return k; }
function stock(c, R) {
  // card stock: cream, mottled, with fibres and a darker edge
  c.fillStyle = PAL.paper; c.fillRect(0, 0, CW, CH);
  c.fillStyle = 'rgba(150,120,70,.06)'; for (let i = 0; i < 90; i++) { c.beginPath(); c.arc(R() * CW, R() * CH, 6 + R() * 26, 0, TAU); c.fill(); }
  speckle(c, R, 500, 0, 0, CW, CH, 'rgba(110,80,40,.28)', .9);
  c.fillStyle = 'rgba(110,80,40,.18)'; for (let i = 0; i < 60; i++) { const x = R() * CW, y = R() * CH, a = R() * TAU, l = 4 + R() * 8; tstroke(c, [[x, y], [x + Math.cos(a) * l, y + Math.sin(a) * l]], .8, { taper: .4 }); }
}
function roundClip(c, r = 24, inset = 0) {
  const x = inset, y = inset, w = CW - inset * 2, h = CH - inset * 2;
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function frameRect(c, x, y, w, h, lw, col, jit = .8) {
  c.fillStyle = col; const k = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
  for (let i = 0; i < 4; i++) tstroke(c, [k[i], k[i + 1]], lw, { taper: 0, jit: .3, tremor: jit });
}
function face(card, idx) {
  const cv = mk(CW * SC, CH * SC), c = cv.getContext('2d'); c.scale(SC, SC);
  const R = mulberry(900 + idx * 31); SEED = 100 + idx * 500;
  c.save(); roundClip(c); c.clip(); stock(c, R);
  // frames
  frameRect(c, 13, 13, CW - 26, CH - 26, 7, ink); frameRect(c, 25, 25, CW - 50, CH - 50, 2.4, ink);
  // numeral
  c.fillStyle = red; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.font = '400 50px "IM Fell English"'; c.letterSpacing = '4px';
  c.fillText(card.num, CW / 2 + 2, 82); c.letterSpacing = '0px';
  const nw = c.measureText(card.num).width + 40;
  [-1, 1].forEach(s => { line(c, [CW / 2 + s * (nw / 2 + 16), 66], [CW / 2 + s * 150, 66], 2.2, ink, { taper: .3 }); star4(c, CW / 2 + s * (nw / 2 + 4), 66, 6, ink); });
  // window
  const wx = 44, wy = 100;
  c.save(); c.translate(wx, wy); c.beginPath(); c.rect(0, 0, WW, WH); c.clip(); PICS[card.id](c, R); c.restore();
  frameRect(c, wx - 3, wy - 3, WW + 6, WH + 6, 5, ink, 1.2);
  // banner
  const by = 548, bh = 66;
  c.fillStyle = ink; c.beginPath(); c.moveTo(30, by); c.lineTo(CW - 30, by); c.lineTo(CW - 44, by + bh / 2); c.lineTo(CW - 30, by + bh); c.lineTo(30, by + bh); c.lineTo(44, by + bh / 2); c.closePath(); c.fill();
  c.strokeStyle = PAL.paper; c.lineWidth = 1.6; c.beginPath(); c.moveTo(52, by + 6); c.lineTo(CW - 52, by + 6); c.moveTo(52, by + bh - 6); c.lineTo(CW - 52, by + bh - 6); c.stroke();
  c.fillStyle = PAL.paper; c.font = '400 33px "IM Fell English"'; c.letterSpacing = '5px';
  let fs = 33; while (c.measureText(card.title).width > CW - 140 && fs > 20) { fs -= 1; c.font = `400 ${fs}px "IM Fell English"`; }
  c.fillText(card.title, CW / 2 + 2, by + bh / 2 + fs * .33); c.letterSpacing = '0px';
  // footer ornament
  [-1, 0, 1].forEach(s => star4(c, CW / 2 + s * 34, 650, s ? 6 : 9, s ? ink : red));
  [-1, 1].forEach(s => line(c, [CW / 2 + s * 52, 650], [CW / 2 + s * 130, 650], 2, ink, { taper: .35 }));
  // corner dots
  [[40, 40], [CW - 40, 40], [40, CH - 40], [CW - 40, CH - 40]].forEach(([x, y]) => disc(c, x, y, 3.2, red));
  c.restore();
  edge(c);
  return cv;
}
function edge(c) {
  c.save(); roundClip(c); c.lineWidth = 2.4; c.strokeStyle = 'rgba(70,50,30,.55)'; c.stroke();
  roundClip(c, 22, 3); c.lineWidth = 1.4; c.strokeStyle = 'rgba(255,248,230,.55)'; c.stroke(); c.restore();
}
function back() {
  const cv = mk(CW * SCB, CH * SCB), c = cv.getContext('2d'); c.scale(SCB, SCB);
  const R = mulberry(77); SEED = 3000;
  c.save(); roundClip(c); c.clip(); stock(c, R);
  // ink panel
  fill(c, ink); c.fillRect(20, 20, CW - 40, CH - 40);
  const cx = CW / 2, cy = CH / 2;
  c.save(); c.beginPath(); c.rect(32, 32, CW - 64, CH - 64); c.clip();
  // diamond lattice (point-symmetric)
  c.fillStyle = PAL.paper;
  const g = 52;
  for (let k = -16; k <= 16; k++) {
    line(c, [cx + k * g - 800, cy - 800 * 1.0], [cx + k * g + 800, cy + 800], 1.6, PAL.paper, { taper: 0, tremor: .5 });
    line(c, [cx + k * g + 800, cy - 800], [cx + k * g - 800, cy + 800], 1.6, PAL.paper, { taper: 0, tremor: .5 });
  }
  // small dots at crossings, and a vermilion diamond at every other cell
  for (let i = -8; i <= 8; i++) for (let j = -14; j <= 14; j++) {
    const x = cx + i * g, y = cy + j * g * 1.0; if ((i + j) % 2) continue;
    disc(c, x, y, 3, ink); disc(c, x, y, 1.8, PAL.paper);
    if (((i / 1) + j) % 4 === 0 && Math.hypot(x - cx, y - cy) > 160) { c.fillStyle = red; c.beginPath(); c.moveTo(x, y - 12); c.lineTo(x + 12, y); c.lineTo(x, y + 12); c.lineTo(x - 12, y); c.closePath(); c.fill(); }
  }
  c.restore();
  // medallion
  disc(c, cx, cy, 128, ink); ring(c, cx, cy, 128, 5, PAL.paper); ring(c, cx, cy, 116, 2, PAL.paper);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU, ca = Math.cos(a), sa = Math.sin(a), pa = -sa, pb = ca, P = (r, w) => [cx + ca * r + pa * w, cy + sa * r + pb * w];
    const leaf = [...bez(P(34, 0), P(60, 34), P(90, 26), P(110, 0), 14), ...bez(P(110, 0), P(90, -26), P(60, -34), P(34, 0), 14)];
    poly(c, leaf, PAL.paper, .3);
    const inner = [...bez(P(46, 0), P(64, 18), P(84, 14), P(98, 0), 12), ...bez(P(98, 0), P(84, -14), P(64, -18), P(46, 0), 12)];
    poly(c, inner, i % 2 ? ink : red, .2); line(c, P(48, 0), P(100, 0), 1.6, PAL.paper, { taper: .3 });
  }
  disc(c, cx, cy, 30, red); ring(c, cx, cy, 30, 3, PAL.paper); star4(c, cx, cy, 24, PAL.paper); disc(c, cx, cy, 6, ink);
  // top & bottom crescents (point symmetric)
  [[cx, 74, 1], [cx, CH - 74, -1]].forEach(([x, y, s]) => { disc(c, x, y, 22, PAL.paper); disc(c, x, y + 8 * s, 19, ink); star4(c, x, y - 2 * s, 7, red); });
  [-1, 1].forEach(s => { [[cx + s * 100, 100, 1], [cx + s * 100, CH - 100, -1]].forEach(([x, y, v]) => { star4(c, x, y, 8, PAL.paper); }); });
  // frames and corner fans
  frameRect(c, 20, 20, CW - 40, CH - 40, 5, PAL.paper, .6); frameRect(c, 32, 32, CW - 64, CH - 64, 2, PAL.paper, .6);
  [[32, 32, 0], [CW - 32, 32, 1], [32, CH - 32, 3], [CW - 32, CH - 32, 2]].forEach(([x, y, q]) => {
    c.save(); c.translate(x, y); c.rotate(q * Math.PI / 2); for (let i = 1; i <= 3; i++) ring(c, 0, 0, i * 16, 2, PAL.paper, 0, Math.PI / 2); disc(c, 0, 0, 6, red); c.restore();
  });
  c.restore(); edge(c);
  return cv;
}

export async function loadFonts() {
  await Promise.all(['400 40px "IM Fell English"', 'italic 400 40px "IM Fell English"'].map(f => document.fonts.load(f, 'ABCXIVL abc')));
}
export function buildDeck() {
  const faces = {}; DECK.forEach((card, i) => { faces[card.id] = face(card, i); });
  const big = back(), small = mk(CW * SC, CH * SC), g = small.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(big, 0, 0, CW * SC, CH * SC);
  return { faces, back: big, backS: small };
}

export { tstroke, poly, line, disc, ring, star4, arcPts, bez, quad, blob };
