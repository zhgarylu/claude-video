// motifs.js: original blue-and-white compositions, generated as pen operations in texel space (x right, y down, canvas top = lip).
// Everything here is drawing code: outlines are line strokes (G), fills are graded wash hatches (R). No images.
import { clamp, lerp, ss, mulberry, TAU } from '/core/lib.js';
import { spline } from './vessel.js';
import { Pen } from './cobalt.js';

const rad = d => d * Math.PI / 180;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];

// ------------------------------------------------------------------ geometry helpers
// A petal / leaf blade from base b along angle `ang` (radians, y down so up = -π/2): centre line curved by `bend`, half-width profile pointed at both ends.
export function blade(b, ang, len, wid, bend = 0, n = 16, pw = .72, sharp = .85, wave = 0) {
  const d = [Math.cos(ang), Math.sin(ang)], p = [-d[1], d[0]];
  const C = [], Lf = [], Rt = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, wv = wave * len * Math.sin(2.3 * Math.PI * s) * s * (1 - .4 * s), c = [b[0] + d[0] * len * s + p[0] * (bend * len * s * s + wv), b[1] + d[1] * len * s + p[1] * (bend * len * s * s + wv)];
    const hw = wid * .5 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(s, pw))), sharp);
    // normal of the curved centre line
    const dw = wave * 2.3 * Math.PI * Math.cos(2.3 * Math.PI * s) * s * (1 - .4 * s) + wave * Math.sin(2.3 * Math.PI * s) * (1 - .8 * s), tx = d[0] + p[0] * (2 * bend * s + dw), ty = d[1] + p[1] * (2 * bend * s + dw), tl = Math.hypot(tx, ty), nx = -ty / tl, ny = tx / tl;
    C.push(c); Lf.push([c[0] + nx * hw, c[1] + ny * hw]); Rt.push([c[0] - nx * hw, c[1] - ny * hw]);
  }
  return { C, Lf, Rt, poly: Lf.concat(Rt.slice().reverse()), tip: C[n], base: b, ang };
}
function everyNth(a, k) { const o = []; for (let i = 0; i < a.length; i += k) o.push(a[i]); if ((a.length - 1) % k) o.push(a[a.length - 1]); return o; }
const wob = (rng, a) => (rng() - .5) * 2 * a;

export function bladeOutline(pen, bl, o = {}) {
  const w = o.w ?? 9, d = o.d ?? .55;
  pen.line(everyNth(bl.Lf, 2), { w, d, taper: [.05, .35], jitter: .06, speed: pen.speed * 1.2 });
  pen.line(everyNth(bl.Rt, 2), { w, d, taper: [.05, .35], jitter: .06, speed: pen.speed * 1.2 });
}
export function bladeWash(pen, bl, o = {}) {
  const ang = bl.ang;
  pen.wash(bl.poly, Object.assign({
    angle: Math.atan2(bl.tip[1] - bl.base[1], bl.tip[0] - bl.base[0]), spacing: 15, passes: 2, dens: [.42, .12], axis: [bl.base, bl.tip],
    crossFn: cf => .55 + 1.1 * Math.abs(cf - .5) * 2, dFn: g => 1 - .35 * g,
  }, o));
}
// scalloped wavy closed contour for leaves
function wavyEllipse(cx, cy, rx, ry, rng, k = 9, amp = .06, ph = 0, n = 64) {
  const o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, r = 1 + amp * Math.sin(k * a + ph) + amp * .6 * Math.sin((k + 4) * a + ph * 2); o.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]); }
  return o;
}

// ------------------------------------------------------------------ lotus
export function lotus(pen, cx, cy, S, rng, o = {}) {
  const L = 560 * S;
  const mk = (a, len, wid, bend, wave = 0) => blade([cx + (a < -90 ? -1 : a > -90 ? 1 : 0) * L * .03 + wob(rng, 6), cy + wob(rng, 4)], rad(a + wob(rng, 5)), L * len * (1 + wob(rng, .06)), L * wid * (1 + wob(rng, .1)), bend + wob(rng, .05), 18, .78, .7, wave + wob(rng, .012));
  const back = [mk(-136, .74, .30, .18, .02), mk(-44, .74, .30, -.18, -.02), mk(-110, .8, .26, .1)];
  const mid = [mk(-120, .92, .36, .15, .02), mk(-60, .9, .37, -.14, -.02)];
  const front = [mk(-92, 1.0, .40, .03, .018)];
  const near = [mk(-164, .64, .26, .3, .02), mk(-16, .62, .26, -.3, -.02)];
  const rowLight = { dens: [.32, .09], rimD: .16 }, rowMid = { dens: [.5, .15], rimD: .24 }, rowFront = { dens: [.64, .18], rimD: .3, rimW: 8 };
  // painter's order: far petals first, each stopping at the edge of the petals in front (no double wash where they overlap)
  const polys = bs => bs.map(b => b.poly);
  pen.occlude(polys(mid).concat(polys(front)));
  for (const b of back) { bladeOutline(pen, b, { w: 8, d: .46 }); bladeWash(pen, b, rowLight); }
  pen.occlude(polys(front));
  for (const b of near) { bladeOutline(pen, b, { w: 8.5, d: .5 }); bladeWash(pen, b, { dens: [.32, .09], spacing: 14 }); }
  for (const b of mid) { bladeOutline(pen, b, { w: 10, d: .58 }); bladeWash(pen, b, rowMid); }
  pen.occlude(null);
  for (const b of front) {
    bladeOutline(pen, b, { w: 11.5, d: .62 }); bladeWash(pen, b, rowFront);
    for (const f of [-.55, 0, .55]) pen.line([b.C[1], [b.C[7][0] + (b.Lf[7][0] - b.C[7][0]) * f, b.C[7][1] + (b.Lf[7][1] - b.C[7][1]) * f], [b.C[12][0] + (b.Lf[12][0] - b.C[12][0]) * f * .6, b.C[12][1] + (b.Lf[12][1] - b.C[12][1]) * f * .6]], { w: 5, d: .28, taper: [.1, .5] });
  }
  for (const b of mid) for (const f of [-.4, .4]) pen.line([b.C[1], [b.C[7][0] + (b.Lf[7][0] - b.C[7][0]) * f, b.C[7][1] + (b.Lf[7][1] - b.C[7][1]) * f], b.C[11]], { w: 4.5, d: .24, taper: [.1, .5] });
  for (let i = 0; i < 5; i++) pen.dot(cx + wob(rng, L * .05), cy - L * (.02 + .09 * rng()), 18 + rng() * 14, .9);
  // receptacle at the base + a few stamens
  pen.line([[cx - L * .09, cy + 4], [cx - L * .04, cy + L * .05], [cx + L * .04, cy + L * .05], [cx + L * .09, cy + 4]], { w: 8, d: .5 });
  for (let i = -3; i <= 3; i++) pen.line([[cx + i * L * .028, cy - 2], [cx + i * L * .034, cy - L * .1 - Math.abs(i) * -3]], { w: 4.5, d: .4, taper: [.1, .2], speed: pen.speed * 1.4 });
  return pen;
}

export function lotusLeaf(pen, cx, cy, rx, ry, rng, o = {}) {
  const poly = wavyEllipse(cx, cy, rx, ry, rng, 7, .07, rng() * 6);
  pen.line(poly.concat([poly[0], poly[1], poly[2]]), { w: 9, d: .55, taper: [.03, .1], straight: false, speed: pen.speed * 1.3 });
  // a turned-back lower half for volume
  const lower = poly.filter(p => p[1] > cy + ry * .1);
  pen.wash(poly, { angle: o.angle ?? rad(-20), spacing: 17, passes: 2, dens: [.5, .36], axis: [[cx, cy + ry], [cx, cy - ry]], crossFn: cf => .55 + 1.1 * Math.abs(cf - .5) * 2.2, dFn: g => .8 + .5 * g, rimD: .34, rimW: 9 });
  for (let i = 0; i < 3; i++) pen.dot(cx + wob(rng, rx * .5), cy + ry * (.1 + .3 * rng()), 16 + rng() * 16, .85);
  pen.wash(lower, { angle: rad(8), spacing: 18, passes: 1, dens: [.25, .12], axis: [[cx, cy + ry], [cx, cy]], rim: false, noClip: false });
  // radial veins
  const cc = [cx + wob(rng, rx * .08), cy + ry * .25];
  for (let i = 0; i < 9; i++) { const a = rad(200 + i * 17.5); pen.line([cc, [cc[0] + Math.cos(a) * rx * .5, cc[1] + Math.sin(a) * ry * .55], [cc[0] + Math.cos(a) * rx * .88, cc[1] + Math.sin(a) * ry * .93]], { w: 4.2, d: .24, taper: [.05, .5], speed: pen.speed * 1.5 }); }
}

// tendril spiral
export function curl(pen, x, y, r0, dir = 1, turns = 1.4, rot = 0, o = {}) {
  const pts = []; const n = 28;
  for (let i = 0; i <= n; i++) { const f = i / n, a = rot + dir * f * turns * TAU, r = r0 * (1 - .85 * f); pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  pen.line(pts, { w: o.w ?? 7, d: o.d ?? .5, taper: [.04, .5], speed: pen.speed * 1.2 });
}

// ------------------------------------------------------------------ bands
export function ring(pen, y, o = {}) {
  const W = pen.paint.w, rng = pen.rng, k = (rng() * 3 | 0) + 2, ph = rng() * 6;
  const pts = []; const n = 160;
  for (let i = 0; i <= n; i++) { const x = i / n * W; pts.push([x, y + Math.sin(TAU * k * x / W + ph) * (o.wob ?? 1.6)]); }
  pen.stroke(pts, { ch: 'g', w: o.w ?? 10, d: o.d ?? .5, taper: [0, 0], jitter: .06, speed: o.speed ?? 1500, straight: true, ease: null, wetLen: 300, minW: 1, ring: true });
}
// row of upright pointed petal panels (lotus-petal border)
export function petalPanels(pen, y0, y1, n, rng, o = {}) {
  const W = pen.paint.w, pw = W / n, ph = y1 - y0;
  for (let i = 0; i < n; i++) {
    const cx = (i + .5) * pw + wob(rng, 3);
    const bl = blade([cx, y1], -Math.PI / 2, ph, pw * .92, 0, 18, .55, .6);
    bladeOutline(pen, bl, { w: 9, d: .55 });
    const inn = blade([cx, y1 - 8], -Math.PI / 2, ph * .76, pw * .52, 0, 14, .6, .6);
    pen.line(everyNth(inn.Lf, 2).concat(everyNth(inn.Rt, 2).reverse()), { w: 6, d: .45, taper: [.04, .12], speed: pen.speed * 1.3 });
    pen.wash(inn.poly, { angle: -Math.PI / 2, spacing: 12, passes: 1, dens: [.34, .1], axis: [inn.base, inn.tip], crossFn: cf => .6 + 1.0 * Math.abs(cf - .5) * 2, bristle: 2 });
    // a small curl at the base
    pen.line([[cx, y1 - ph * .18], [cx + wob(rng, 3), y1 - ph * .42]], { w: 4.5, d: .3, speed: pen.speed * 1.4 });
  }
}
// pendent ruyi cloud-head lappets
export function ruyiCollar(pen, y0, h, n, rng, o = {}) {
  const W = pen.paint.w, pw = W / n;
  for (let i = 0; i < n; i++) {
    const cx = (i + .5) * pw, hw = pw * .47;
    const pts = [];
    // top edge: three lobes, then pointed bottom
    pts.push([cx - hw, y0 + 18]);
    for (let k = 0; k <= 24; k++) { const f = k / 24, x = cx - hw + 2 * hw * f; pts.push([x, y0 + 18 - 22 * Math.pow(Math.abs(Math.sin(f * 1.5 * Math.PI + .0)), .8) * (f > .02 && f < .98 ? 1 : 0)]); }
    pts.push([cx + hw, y0 + 18]);
    const side = []; for (let k = 1; k <= 14; k++) { const f = k / 14; side.push([cx + hw * (1 - Math.pow(f, 2.1)) * (1 - .1 * Math.sin(f * 5)), y0 + 18 + (h - 18) * f]); }
    const left = side.map(p => [2 * cx - p[0], p[1]]);
    const outline = pts.concat(side).concat(left.slice().reverse());
    pen.line([[cx - hw, y0 + 18]].concat(left), { w: 9, d: .55, taper: [.05, .1], speed: pen.speed * 1.2 });
    pen.line(side.slice().reverse().concat([[cx + hw, y0 + 18]]), { w: 9, d: .55, taper: [.1, .05], speed: pen.speed * 1.2 });
    // lobed top
    const top = pts.slice(1, -1); pen.line(everyNth(top, 2), { w: 8, d: .5, taper: [.04, .04], speed: pen.speed * 1.4, straight: true });
    pen.wash(outline, { angle: Math.PI / 2, spacing: 15, passes: 2, dens: [.14, .38], axis: [[cx, y0], [cx, y0 + h]], crossFn: cf => .7 + .7 * Math.abs(cf - .5) * 2, bristle: 2 });
    // inner ruyi + tiny flower dot
    const iw = hw * .56;
    const inner = [[cx - iw, y0 + h * .28], [cx - iw * .6, y0 + h * .2], [cx, y0 + h * .17], [cx + iw * .6, y0 + h * .2], [cx + iw, y0 + h * .28], [cx + iw * .55, y0 + h * .55], [cx, y0 + h * .8], [cx - iw * .55, y0 + h * .55], [cx - iw, y0 + h * .28]];
    pen.line(inner, { w: 6, d: .45, taper: [.05, .05], speed: pen.speed * 1.3 });
    for (let k = -1; k <= 1; k++) pen.line([[cx + k * iw * .22, y0 + h * .36], [cx + k * iw * .3, y0 + h * .56]], { w: 5, d: .35, speed: pen.speed * 1.5 });
  }
}
// scalloped cloud/wave edge band
export function scallopBand(pen, y, n, r, rng, o = {}) {
  const W = pen.paint.w, pw = W / n;
  for (let i = 0; i < n; i++) {
    const cx = (i + .5) * pw; const pts = []; for (let k = 0; k <= 12; k++) { const a = Math.PI + k / 12 * Math.PI; pts.push([cx + Math.cos(a) * pw * .5, y - Math.sin(a) * r * 1.0]); }
    pen.line(pts, { w: 7, d: .5, taper: [.05, .05], speed: pen.speed * 1.6 });
  }
}
// key-fret / meander band
export function meander(pen, y0, h, unit, o = {}) {
  const W = pen.paint.w, n = Math.round(W / unit), u = W / n, s = h / 4;
  const path = [];
  for (let i = 0; i < n; i++) {
    const x = i * u; const sx = u / 4;
    path.push([x, y0 + 3 * s], [x, y0], [x + 3 * sx, y0], [x + 3 * sx, y0 + 2 * s], [x + sx, y0 + 2 * s], [x + sx, y0 + s], [x + 2 * sx, y0 + s]);
    path.push([x + 2 * sx, y0 + s * 3.4], [x + u, y0 + 3.4 * s]);
  }
  pen.stroke(path, { ch: 'g', w: 7, d: .5, taper: [0, 0], straight: true, speed: pen.speed * 2.2, minW: 1, jitter: .05 });
}

// waves: nested scale arcs with spiral crests
export function waves(pen, y0, y1, rows, rng, o = {}) {
  const W = pen.paint.w, unit = o.unit ?? 230, n = Math.round(W / unit), u = W / n, rowH = (y1 - y0) / rows;
  for (let r = 0; r < rows; r++) {
    const yb = y0 + rowH * (r + 1.0), off = (r % 2) * u / 2;
    for (let i = 0; i < n; i++) {
      const cx = i * u + off + u / 2, R = u * .62;
      for (let k = 0; k < 4; k++) {
        const rr = R * (1 - k * .21); const pts = [];
        for (let a = 0; a <= 12; a++) { const th = Math.PI + a / 12 * Math.PI; pts.push([cx + Math.cos(th) * rr, yb + Math.sin(th) * rr * .72 * -1 * -1]); }
        pen.line(pts, { w: 7.5 - k * .6, d: .5 - k * .06, taper: [.06, .06], speed: pen.speed * 1.9 });
      }
      if (rng() < .55) curl(pen, cx + wob(rng, 10), yb - R * .72 - 14, 26, rng() < .5 ? 1 : -1, 1.2, rng() * 6, { w: 6, d: .45 });
    }
    // wash a band between arcs for tone
    if (o.wash !== false) {
      const poly = []; for (let i = 0; i <= 40; i++) poly.push([i / 40 * W, yb - R0(u) * .5 + 6 * Math.sin(i * 1.3)]); poly.push([W, yb + 4]); poly.push([0, yb + 4]);
      pen.wash(poly, { angle: 0, spacing: 14, passes: 1, dens: [.24, .24], axis: [[0, yb], [0, yb - u * .5]], dFn: g => .4 + 1.1 * (1 - g), bristle: 2, rim: false, dur: .6 });
    }
  }
}
const R0 = u => u * .62;

// ------------------------------------------------------------------ the hero vase
// an original seal-like mark: a square frame with four pseudo-characters made of short orthogonal strokes (not a real reign mark)
export function sealMark(pen, x, y, size, rng) {
  const h = size / 2;
  pen.line([[x - h, y - h], [x + h, y - h], [x + h, y + h], [x - h, y + h], [x - h, y - h]], { w: Math.max(5, size * .07), d: .55, taper: [0, 0], straight: true, minW: 1, speed: pen.speed * 1.4 });
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
    const cx = x - h / 2 + c * h, cy = y - h / 2 + r * h, u = h * .36;
    const n = 3 + (rng() * 2 | 0);
    for (let k = 0; k < n; k++) {
      const horiz = rng() < .5, a = rng() * 2 - 1, b = rng() * 2 - 1;
      const p0 = horiz ? [cx - u, cy + a * u] : [cx + a * u, cy - u], p1 = horiz ? [cx + u * (.3 + .7 * rng()), cy + b * u * .5 + a * u] : [cx + b * u * .5 + a * u, cy + u * (.3 + .7 * rng())];
      pen.line([p0, p1], { w: Math.max(4, size * .05), d: .5, taper: [.1, .2], speed: pen.speed * 1.6 });
    }
  }
}

// brush strokes for a few simple characters in a 100-unit grid (y down); written stroke by stroke so the brush is seen writing
const STROKES = {
  '山': [[[50, 10], [50, 72]], [[16, 36], [16, 86], [84, 86]], [[84, 36], [84, 86]]],
  '川': [[[22, 10], [14, 50], [8, 88]], [[50, 6], [50, 92]], [[80, 12], [80, 90]]],
  '日': [[[26, 12], [26, 90]], [[26, 12], [76, 12], [76, 90]], [[26, 50], [76, 50]], [[26, 90], [76, 90]]],
  '月': [[[26, 8], [22, 58], [10, 92]], [[26, 8], [78, 8], [78, 84], [68, 94]], [[26, 36], [78, 36]], [[24, 62], [78, 62]]],
};
export function inscribe(pen, x, y, size, text) {
  const k = size / 100, w = size * .12;
  [...text].forEach((ch, ci) => {
    const ox = x - size / 2, oy = y + ci * size * 1.08;
    for (const st of STROKES[ch]) {
      const pts = st.map(p => [ox + p[0] * k, oy + p[1] * k]);
      const corner = st.length > 2 && ch !== '月' || ch === '日';
      pen.stroke(pts, { w, d: .92, taper: [.1, .22], minW: .55, straight: corner, speed: 300, gap: .04, bristle: 3, dry: .8, wetLen: 120, jitter: .05 });
    }
    pen.pause(.1);
  });
}
export function paintMeiping(paint, v) {
  const rng = mulberry(11), pen = new Pen(paint, .4, 520, 3), W = v.W, Hh = v.H;
  const Y = h => Hh - v.vAtY(h);
  // foot rings
  ring(pen, Y(.052), { w: 11 }); ring(pen, Y(.068), { w: 8 });
  // lotus-petal panels at the foot
  petalPanels(pen, Y(.205), Y(.075), 18, rng);
  ring(pen, Y(.212), { w: 8 }); ring(pen, Y(.226), { w: 11 });
  // main band: wrapped lotus scroll, 3 repeats
  const P = W / 3, bandTop = Y(.715), A = 130, ym = bandTop + 900;
  const vineAt = x => ym + A * Math.sin(TAU * x / P);
  // vine first
  const vine = []; for (let x = -P * .25; x <= W + P * .25; x += 24) vine.push([x, vineAt(x)]);
  pen.stroke(vine, { ch: 'g', w: 12, d: .55, taper: [.01, .01], speed: 640, straight: true, minW: 1, jitter: .05, ease: null, wetLen: 400 });
  // leaves, flowers
  for (let i = 0; i < 3; i++) {
    const x0 = i * P;
    // flower at crest (vine y smallest: sin = -1 → x = x0 + .75P)
    const fx = x0 + P * .75, fy = vineAt(fx) - 16;
    lotus(pen, fx, fy, 1.3 + wob(rng, .02), rng);
    // leaf pair at trough (sin = +1 → x0 + .25P)
    const lx = x0 + P * .25, ly = vineAt(lx);
    lotusLeaf(pen, lx - 150, ly - 120, 230, 118, rng, { angle: rad(-18) });
    lotusLeaf(pen, lx + 190, ly - 300, 190, 100, rng, { angle: rad(22) });
    // stems and tendrils
    curl(pen, lx + 30, ly - 30, 54, 1, 1.4, rng() * 6);
    curl(pen, fx + 270, fy + 80, 46, -1, 1.5, rng() * 6);
    curl(pen, fx - 270, fy + 90, 46, 1, 1.5, rng() * 6);
    // small bud
    const bx = x0 + P * .5, by = vineAt(bx) - 330; const bd = blade([bx, by + 80], -Math.PI / 2 + .1, 150, 70, .1);
    bladeOutline(pen, bd, { w: 7 }); bladeWash(pen, bd, { dens: [.4, .14], spacing: 11 });
    pen.line([[bx, by + 80], [bx - 20, vineAt(bx - 20) - 20]], { w: 6, d: .45, speed: 700 });
  }
  ring(pen, Y(.715), { w: 10 }); ring(pen, Y(.728), { w: 8 });
  // shoulder: ruyi lappets
  ruyiCollar(pen, Y(.862), Y(.735) - Y(.862), 9, rng);
  ring(pen, Y(.873), { w: 9 }); ring(pen, Y(.885), { w: 7 });
  // neck band
  scallopBand(pen, Y(.925), 14, 20, rng);
  ring(pen, Y(.93), { w: 7 });
  ring(pen, Y(.968), { w: 7 }); ring(pen, Y(.982), { w: 9 });
  { // wheel-turned rings take .45 s each; the rest is squeezed so the whole painting lasts about 10 s
    paint.prep(); const rs = paint.ops.filter(o => o.ring && !o.noTip), ringDur = .45;
    const nat = pen.t - .3 - rs.reduce((s, r) => s + (r.t1 - r.t0), 0);
    paint.retime((10.2 - ringDur * rs.length) / nat, ringDur, .3); pen.t = 10.8;
  }
  // inscription in brush calligraphy, right column first (reading right to left, top to bottom), then an original seal-like mark
  const ix = P * .30, iy = bandTop + 40, cs = 235;
  inscribe(pen, ix + cs * .6, iy, cs, '山川');
  inscribe(pen, ix - cs * .6, iy, cs, '日月');
  sealMark(pen, ix - cs * 1.4, iy + cs * 1.9, 70, rng);
  return pen.t;
}
