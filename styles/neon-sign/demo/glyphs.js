// Single-stroke tube alphabet: every letter is one or two bent glass tubes, never an outline font.
// Glyph points live in a unit box (x 0..1 across the glyph's own width, y 0..1 down). `fil` = bend radius (in glyph heights).
const G = {};
const def = (ch, fil, ...strokes) => { G[ch] = { fil, strokes }; };
const oval = [[.5, 0], [.75, 0], [1, .22], [1, .78], [.75, 1], [.25, 1], [0, .78], [0, .22], [.25, 0], [.5, 0]];
def('A', .05, [[0, 1], [.5, 0], [1, 1]], [[.18, .66], [.82, .66]]);
def('B', .10, [[0, 1], [0, 0], [.62, 0], [1, .14], [1, .36], [.62, .5], [0, .5]], [[.62, .5], [1, .64], [1, .86], [.62, 1], [0, 1]]);
def('C', .16, [[1, .16], [.75, 0], [.3, 0], [0, .22], [0, .78], [.3, 1], [.75, 1], [1, .84]]);
def('D', .14, [[0, 0], [0, 1], [.45, 1], [1, .72], [1, .28], [.45, 0], [0, 0]]);
def('E', .02, [[1, 0], [0, 0], [0, 1], [1, 1]], [[0, .5], [.78, .5]]);
def('F', .02, [[1, 0], [0, 0], [0, 1]], [[0, .5], [.78, .5]]);
def('G', .16, [[1, .2], [.75, 0], [.3, 0], [0, .22], [0, .78], [.3, 1], [.75, 1], [1, .8], [1, .54], [.56, .54]]);
def('H', .02, [[0, 0], [0, 1]], [[0, .5], [1, .5]], [[1, 0], [1, 1]]);
def('I', .02, [[.5, 0], [.5, 1]]);
def('J', .16, [[1, 0], [1, .74], [.72, 1], [.3, 1], [0, .76]]);
def('K', .02, [[0, 0], [0, 1]], [[1, 0], [0, .58], [1, 1]]);
def('L', .02, [[0, 0], [0, 1], [1, 1]]);
def('M', .02, [[0, 1], [0, 0], [.5, .62], [1, 0], [1, 1]]);
def('N', .02, [[0, 1], [0, 0], [1, 1], [1, 0]]);
def('O', .22, oval);
def('P', .10, [[0, 1], [0, 0], [.62, 0], [1, .15], [1, .35], [.62, .5], [0, .5]]);
def('Q', .22, oval, [[.62, .68], [1, 1.06]]);
def('R', .10, [[0, 1], [0, 0], [.62, 0], [1, .15], [1, .35], [.62, .5], [0, .5]], [[.5, .5], [1, 1]]);
def('S', .17, [[1, .16], [.74, 0], [.3, 0], [0, .16], [0, .34], [.3, .5], [.7, .5], [1, .66], [1, .84], [.7, 1], [.26, 1], [0, .84]]);
def('T', .02, [[0, 0], [1, 0]], [[.5, 0], [.5, 1]]);
def('U', .18, [[0, 0], [0, .76], [.3, 1], [.7, 1], [1, .76], [1, 0]]);
def('V', .03, [[0, 0], [.5, 1], [1, 0]]);
def('W', .03, [[0, 0], [.24, 1], [.5, .34], [.76, 1], [1, 0]]);
def('X', .02, [[0, 0], [1, 1]], [[1, 0], [0, 1]]);
def('Y', .02, [[0, 0], [.5, .5], [1, 0]], [[.5, .5], [.5, 1]]);
def('Z', .02, [[0, 0], [1, 0], [0, 1], [1, 1]]);
def('0', .22, oval);
def('1', .04, [[.1, .22], [.62, 0], [.62, 1]]);
def('2', .14, [[0, .2], [.3, 0], [.7, 0], [1, .2], [1, .4], [0, 1], [1, 1]]);
def('3', .12, [[0, .1], [.3, 0], [.7, 0], [1, .15], [1, .35], [.7, .5], [.3, .5]], [[.7, .5], [1, .65], [1, .85], [.7, 1], [.3, 1], [0, .9]]);
def('4', .02, [[.72, 1], [.72, 0], [0, .7], [1, .7]]);
def('5', .12, [[1, 0], [0, 0], [0, .46], [.7, .46], [1, .63], [1, .86], [.7, 1], [.3, 1], [0, .88]]);
def('8', .2, [[.5, .5], [.15, .5], [0, .35], [0, .15], [.2, 0], [.8, 0], [1, .15], [1, .35], [.85, .5], [.5, .5]], [[.5, .5], [.1, .52], [0, .7], [0, .86], [.2, 1], [.8, 1], [1, .86], [1, .7], [.9, .52], [.5, .5]]);
def('&', .1, [[1, 1], [.1, .3], [.1, .1], [.3, 0], [.6, .1], [.6, .3], [0, .72], [0, .9], [.25, 1], [.6, .95], [1, .5]]);
def('!', .0, [[.5, 0], [.5, .68]], [[.5, .9], [.5, .93]]);
def('-', .0, [[0, .5], [1, .5]]);
def('.', .0, [[.5, .95], [.5, .98]]);
const W = { I: .16, '1': .34, '!': .12, '.': .12, '-': .42, M: .78, W: .86, '&': .7, ' ': .4, J: .5, L: .5, E: .52, F: .5, T: .56, Z: .56, '4': .6 };

// round the corners of a polyline with quadratic fillets
export function fillet(pts, r) {
  if (r <= 0 || pts.length < 3) return pts.slice();
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], p = pts[i], b = pts[i + 1];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    if (la < 1e-6 || lb < 1e-6) { out.push(p); continue; }
    const d = Math.min(r, la * .5, lb * .5);
    const p1 = [p[0] + (a[0] - p[0]) / la * d, p[1] + (a[1] - p[1]) / la * d];
    const p2 = [p[0] + (b[0] - p[0]) / lb * d, p[1] + (b[1] - p[1]) / lb * d];
    for (let s = 0; s <= 8; s++) { const u = s / 8, v = 1 - u; out.push([v * v * p1[0] + 2 * u * v * p[0] + u * u * p2[0], v * v * p1[1] + 2 * u * v * p[1] + u * u * p2[1]]); }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
export function tube(pts, color) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1], c: color, dead: [] };
}
// text → strokes in world px. (x,y) = left / top, h = letter height
export function neonText(str, x, y, h, color, opt = {}) {
  const tr = (opt.track ?? .2) * h, strokes = [];
  let cx = x, li = 0;
  for (const ch of str.toUpperCase()) {
    const g = G[ch], w = (W[ch] ?? .6) * h;
    if (g) for (const s of g.strokes) {
      const px = s.map(p => [cx + p[0] * w, y + p[1] * h]);
      const tb = tube(fillet(px, g.fil * h), color); tb.li = li; strokes.push(tb);
    }
    cx += w + tr; li++;
  }
  return { strokes, width: cx - x - tr };
}
const arc = (cx, cy, rx, ry, a0, a1, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const wave = (x, y0, y1, amp, k, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return [x + Math.sin(u * k * Math.PI * 2) * amp * (.4 + .6 * u), y0 + (y1 - y0) * u]; });
export const ICON = {
  bowl: (c1, c2) => [
    [arc(.5, .44, .46, .5, 0, Math.PI), c1], [[[.02, .44], [.98, .44]], c1],
    [[[.5, .38], [.84, -.04]], c1], [[[.58, .4], [.94, .02]], c1],
    [wave(.2, .34, .0, .05, 1.5), c2], [wave(.36, .34, -.08, .05, 1.5), c2]],
  martini: (c1, c2) => [
    [[[0, .06], [1, .06], [.5, .62], [0, .06]], c1], [[[.5, .62], [.5, .96]], c1], [[[.26, .98], [.74, .98]], c1],
    [arc(.4, .24, .06, .06, 0, Math.PI * 2, 16), c2], [[[.4, .24], [.78, -.1]], c2]],
  cup: (c1, c2) => [
    [[[.05, .3], [.05, .66], [.2, .9], [.6, .9], [.75, .66], [.75, .3], [.05, .3]], c1],
    [arc(.82, .48, .13, .13, -Math.PI / 2, Math.PI / 2, 14), c1], [[[0, 1], [.82, 1]], c1],
    [wave(.25, .22, -.1, .04, 1.5), c2], [wave(.5, .22, -.1, .04, 1.5), c2]],
  arrow: c => [[[[0, .5], [1, .5]], c], [[[.62, .12], [1, .5], [.62, .88]], c]],
  bolt: c => [[[[.62, 0], [.18, .56], [.5, .56], [.36, 1], [.86, .4], [.54, .4], [.62, 0]], c]],
  star: c => { const p = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .22 : .5; p.push([.5 + Math.cos(a) * r, .5 + Math.sin(a) * r]); } return [[p, c]]; },
};
export function icon(name, x, y, s, c1, c2 = c1, fil = 0) {
  return ICON[name](c1, c2).map(([pts, c]) => tube(fil ? fillet(pts.map(p => [x + p[0] * s, y + p[1] * s]), fil * s) : pts.map(p => [x + p[0] * s, y + p[1] * s]), c));
}
// rounded frame (one tube, starts with a small gap so the glass has two ends)
export function frame(x0, y0, x1, y1, r, color, gap = 40) {
  const corner = (cx, cy, a0) => arc(cx, cy, r, r, a0, a0 + Math.PI / 2, 10);
  const pts = [[x0 + r + gap, y0], ...corner(x1 - r, y0 + r, -Math.PI / 2), ...corner(x1 - r, y1 - r, 0), ...corner(x0 + r, y1 - r, Math.PI / 2), ...corner(x0 + r, y0 + r, Math.PI), [x0 + r, y0]];
  return [tube(pts, color)];
}
