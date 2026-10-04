// Art Nouveau engine, part 3: ornament generators.  Roundel (halo with mosaic ring), tessera fields, pearl borders,
// filigree scrolls, arches and frames, wallpaper lattice, banner cartouche.
import { clamp, lerp, seg, ss, eo, eio, TAU, mulberry } from '/core/lib.js';
import { PAL, mix, rgba, shape, inkLine, whip, ribbonPoly, catmull, P2, polyPath, circlePts, resample } from './ink.js';
import { leaf } from './flora.js';

const MOSAIC = [PAL.ochreLt, PAL.sageLt, PAL.roseLt, PAL.tealLt, PAL.lilacLt, PAL.cream, PAL.ochre, PAL.teal];

// Polar tesserae between r0 and r1: `rows` rings, `cols` cells; each cell is a slightly irregular quad with a grout gap.
// `prog` (0..1) places tesserae one by one in a scattered-but-ordered sequence.
export function mosaicRing(ctx, cx, cy, r0, r1, o = {}) {
  const { rows = 2, cols = 64, seed = 4, prog = 1, a0 = -Math.PI / 2, pal = MOSAIC, gap = 2.4, a1 = TAU } = o;
  const rnd = mulberry(seed), cells = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) cells.push({ i, j, k: (i / cols + j * .07 + rnd() * .05), c: pal[Math.floor(rnd() * pal.length)], d: rnd() });
  cells.sort((a, b) => a.k - b.k);
  const nShow = Math.floor(cells.length * clamp(prog) + .001);
  const rr = j => lerp(r0, r1, j / rows);
  for (let n = 0; n < nShow; n++) {
    const c = cells[n], ra = rr(c.j) + gap / 2, rb = rr(c.j + 1) - gap / 2, da = (a1 / cols), ga = gap / ((ra + rb) / 2) / 2;
    const A = a0 + c.i * da + ga, B = a0 + (c.i + 1) * da - ga, jit = (c.d - .5) * .12;
    const P = [{ x: cx + Math.cos(A) * ra, y: cy + Math.sin(A) * ra }, { x: cx + Math.cos(A + jit) * rb, y: cy + Math.sin(A + jit) * rb }, { x: cx + Math.cos(B + jit) * rb, y: cy + Math.sin(B + jit) * rb }, { x: cx + Math.cos(B) * ra, y: cy + Math.sin(B) * ra }];
    shape(ctx, P, { fill: mix(c.c, '#ffffff', c.d * .12), shade: mix(c.c, PAL.inkSoft, .22), sd: 2, ink: 1.1, k: .3, lineCol: PAL.inkSoft });
  }
}
// A rectangular / arbitrary field of tesserae clipped to a polygon.
export function mosaicField(ctx, clipPoly, x0, y0, w, h, o = {}) {
  const { size = 24, seed = 6, prog = 1, pal = MOSAIC, tilt = 0 } = o;
  const rnd = mulberry(seed); ctx.save(); polyPath(ctx, clipPoly); ctx.clip();
  const cols = Math.ceil(w / size), rows = Math.ceil(h / size), cells = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) cells.push({ i, j, c: pal[Math.floor(rnd() * pal.length)], d: rnd(), k: (j / rows) * .85 + rnd() * .15 });
  cells.sort((a, b) => a.k - b.k); const nShow = Math.floor(cells.length * clamp(prog));
  for (let n = 0; n < nShow; n++) {
    const c = cells[n], x = x0 + c.i * size, y = y0 + c.j * size, g = 1.4, j = (c.d - .5) * 3;
    const P = [{ x: x + g, y: y + g + j }, { x: x + size - g, y: y + g }, { x: x + size - g + j * .5, y: y + size - g }, { x: x + g, y: y + size - g + j * .5 }];
    shape(ctx, P, { fill: mix(c.c, '#ffffff', c.d * .1), ink: 1, k: .2, lineCol: PAL.inkSoft, shade: mix(c.c, PAL.inkSoft, .18), sd: 2 });
  }
  ctx.restore();
}

export function pearls(ctx, pts, spacing, r, o = {}) {
  const { fill = PAL.cream, shade = PAL.ochreLt, prog = 1 } = o;
  const P = resample(pts, spacing); const n = Math.floor(P.length * clamp(prog));
  for (let i = 0; i < n; i++) shape(ctx, circlePts(P[i].x, P[i].y, r, 14), { fill, shade, sd: r * .4, ink: Math.max(1.2, r * .22), k: .8 });
}

// Radiating rays of a halo (long and short, thin tapered lines) between r0 and r1.
export function rays(ctx, cx, cy, r0, r1, o = {}) {
  const { n = 48, col = PAL.ochre, w = 3, prog = 1, rot = 0 } = o;
  for (let i = 0; i < n; i++) { const a = rot + i / n * TAU, L = (i % 2 ? .62 : 1), pr = clamp(prog * 1.4 - (i / n) * .4);
    if (pr <= 0) continue; const e = lerp(r0, r0 + (r1 - r0) * L, eo(pr));
    inkLine(ctx, [{ x: cx + Math.cos(a) * r0, y: cy + Math.sin(a) * r0 }, { x: cx + Math.cos(a) * (r0 + e) / 2, y: cy + Math.sin(a) * (r0 + e) / 2 }, { x: cx + Math.cos(a) * e, y: cy + Math.sin(a) * e }], { w: w * (i % 2 ? .7 : 1), col, t0: .3, t1: .6, tmin: .2 }); }
}

// The halo roundel: pale disc with rays, a ring of pearls, a ring of mosaic, a double ochre-and-ink rim.
export function roundel(ctx, cx, cy, R, o = {}) {
  const { prog = 1, disc = PAL.paperLt, seed = 4, rot = 0, rimCol = PAL.ochre, mosaic = true, rows = 2 } = o;
  const open = eo(seg(prog, 0, .35)), mp = seg(prog, .25, 1);
  ctx.save();
  const RR = R * open;
  shape(ctx, circlePts(cx, cy, RR, 96), { fill: disc, ink: 4.5, k: .6 });
  if (mosaic) {
    shape(ctx, circlePts(cx, cy, RR * .985, 96), { fill: mix(PAL.ochreLt, PAL.cream, .3), noInk: true });
    shape(ctx, circlePts(cx, cy, RR * .74, 96), { fill: disc, noInk: true });
    mosaicRing(ctx, cx, cy, RR * .74, RR * .955, { rows, cols: 72, seed, prog: mp, a0: rot });
    inkLine(ctx, circlePts(cx, cy, RR * .74, 96), { w: 2.4, closed: true });
    inkLine(ctx, circlePts(cx, cy, RR * .965, 96), { w: 2.2, closed: true });
    pearls(ctx, circlePts(cx, cy, RR * .69, 80), (TAU * RR * .69) / 56, RR * .0135 + 1.5, { prog: seg(prog, .35, .8) });
  }
  rays(ctx, cx, cy, RR * .28, RR * .66, { n: 56, col: PAL.ochre, w: 3.2, prog: seg(prog, .4, 1), rot });
  // inner halo ring
  inkLine(ctx, circlePts(cx, cy, RR * .28, 80), { w: 2, closed: true, col: PAL.ochreDk, alpha: .7 });
  ctx.restore();
}

// A gilded scroll: a whiplash line (dark under, ochre over) that ends in a spiral, with small leaves along it.
export function scroll(ctx, x, y, ang, len, o = {}) {
  const { side = 1, g = 1, col = PAL.ochre, w = 5, curl = 1.25, leafy = true, phase = 0, leaves = [.28, .5, .72] } = o;
  const S = whip(x, y, ang, len, { wave: .5 * side, freq: .9, phase, curl, curlLen: .6, dir: side, g, tipTurns: .9 });
  if (S.length < 4) return S;
  if (leafy) for (const u of leaves) { const i = Math.min(S.length - 1, Math.round(u / Math.max(.001, g) * (S.length - 1))); if (u > g * .98) continue; const p = S[i];
    const l = len * .17 * (1 - u * .35); leaf(ctx, p.x, p.y, p.th - side * .95, l, l * .5, { bend: side * .55, fill: PAL.ochreLt, fillB: col, ink: Math.max(1.6, w * .38), veins: 0, rib: true, vein: PAL.ochreDk }); }
  inkLine(ctx, S, { w: w + 3.2, col: PAL.ink, t0: .03, t1: .35, tmin: .3, swell: .25 });
  inkLine(ctx, S, { w, col, t0: .03, t1: .35, tmin: .25, swell: .25 });
  const e = S[S.length - 1]; if (g > .98) shape(ctx, circlePts(e.x, e.y, w * 1.2, 12), { fill: PAL.ochreLt, ink: 1.8, noInk: false });
  return S;
}
export function filigreeCorner(ctx, x, y, rot, s, o = {}) {      // a corner piece: two scrolls leave the corner along both edges
  const { g = 1, col = PAL.ochre, mir = 1, flip = false } = o;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(mir, flip ? -1 : 1);
  scroll(ctx, 0, 0, .1, s * 1.0, { side: 1, g, col, w: 6, phase: 0, curl: 1.25 });
  scroll(ctx, 0, 0, Math.PI / 2 - .1, s * 1.0, { side: -1, g, col, w: 6, phase: .5, curl: 1.25 });
  scroll(ctx, s * .04, s * .04, Math.PI / 4, s * .6, { side: 1, g, col, w: 4.5, curl: 1.3, phase: 1.2 });
  ctx.restore();
}

// An arch: rectangle with a round (optionally slightly stilted) head.  Returns the outline polygon.
export function archPoly(x, y, w, h, o = {}) {
  const { stilt = 0, bottom = true, n = 40 } = o, r = w / 2, P = [];
  const cy = y + r + stilt;
  P.push({ x: x, y: y + h });
  P.push({ x: x, y: cy });
  for (let i = 0; i <= n; i++) { const a = Math.PI + i / n * Math.PI; P.push({ x: x + r + Math.cos(a) * r, y: cy + Math.sin(a) * r * (1 + stilt / r * 0) }); }
  P.push({ x: x + w, y: y + h });
  return P;
}
// A framed window: outer ink contour, an ochre band with pearls, an inner ink contour.  Returns {outer, inner}.
export function archFrame(ctx, x, y, w, h, o = {}) {
  const { band = 30, fill = PAL.paperLt, bandFill = PAL.ochreLt, prog = 1, beads = true } = o;
  const outer = archPoly(x, y, w, h), inner = archPoly(x + band, y + band, w - band * 2, h - band);
  shape(ctx, outer, { fill: bandFill, shade: PAL.ochre, sd: 5, ink: 4.5, k: .8 });
  if (beads) { const mid = archPoly(x + band / 2, y + band / 2, w - band, h - band / 2); pearls(ctx, mid.slice(1, -1), band * .72, band * .15, { prog }); }
  shape(ctx, inner, { fill, ink: 3, k: .7 });
  return { outer, inner };
}

// Frost on glass: fern-like crystal branches creeping in from the edges of a window, white-blue on a faint haze, with a
// cool shadow line under each stroke so it reads as ice, not ink.  box = {x0,y0,x1,y1}; prog 0..1 grows every root.
export function frost(ctx, clipPoly, box, o = {}) {
  const { seed = 1, prog = 1, n = 22 } = o, rnd = mulberry(seed);
  ctx.save(); polyPath(ctx, clipPoly); ctx.clip();
  const W = box.x1 - box.x0, Hh = box.y1 - box.y0;
  const roots = [];
  for (let i = 0; i < n; i++) {                                   // roots start on the lower and side edges, heading inward and up
    const side = i % 3, u = rnd();
    const x = side === 0 ? box.x0 + u * W : side === 1 ? box.x0 : box.x1, y = side === 0 ? box.y1 : box.y0 + (.45 + .55 * u) * Hh;
    const ang = side === 0 ? -Math.PI / 2 + (rnd() - .5) * .8 : side === 1 ? -.35 - rnd() * .5 : -Math.PI + .35 + rnd() * .5;
    roots.push({ x, y, ang, len: 160 + rnd() * 240, d: rnd() * .3 });
  }
  const hz = ctx.createLinearGradient(0, box.y0, 0, box.y1); hz.addColorStop(0, 'rgba(255,255,255,0)'); hz.addColorStop(1, `rgba(255,255,255,${.42 * clamp(prog * 1.5)})`);
  ctx.fillStyle = hz; ctx.fillRect(box.x0, box.y0, W, Hh);
  const branch = (x, y, ang, len, depth, p, r) => {
    if (len < 10 || p <= 0) return;
    const L = len * clamp(p), x2 = x + Math.cos(ang) * L, y2 = y + Math.sin(ang) * L, w = Math.max(1.1, 3.4 - depth * 1.0);
    const mid = { x: (x + x2) / 2 + Math.cos(ang + 1.57) * L * .03 * (r - .5), y: (y + y2) / 2 + Math.sin(ang + 1.57) * L * .03 * (r - .5) };
    inkLine(ctx, [{ x: x + 1.5, y: y + 1.8 }, { x: mid.x + 1.5, y: mid.y + 1.8 }, { x: x2 + 1.5, y: y2 + 1.8 }], { w: w + 1.2, col: '#7C93A6', alpha: .38, t0: .02, t1: .6, tmin: .2 });
    inkLine(ctx, [{ x, y }, mid, { x: x2, y: y2 }], { w, col: '#F8FCFF', alpha: .95, t0: .02, t1: .6, tmin: .2 });
    if (depth >= 3) return;
    for (const f of [.25, .45, .65, .85]) { const q = clamp((p - f) / (1 - f)); if (q <= 0) continue;
      const bx = x + (x2 - x) * f, by = y + (y2 - y) * f;
      for (const s of [-1, 1]) branch(bx, by, ang + s * (.9 + .12 * (r - .5)), len * (.5 - f * .22), depth + 1, q, (r * 7.3 + f * 3.1 + s) % 1); }
  };
  for (const rt of roots) branch(rt.x, rt.y, rt.ang, rt.len, 0, clamp((prog - rt.d) / (1 - rt.d)), rnd());
  ctx.restore();
}

// Wallpaper: a lattice of long ogee leaves with dots, as thin darker lines, to hold the margins.  World-anchored.
export function wallpaper(ctx, x0, y0, x1, y1, o = {}) {
  const { col = PAL.wallDk, base = PAL.wall, dx = 120, dy = 150, alpha = .55 } = o;
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  ctx.fillStyle = base; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let j = Math.floor(y0 / dy) - 1; j <= y1 / dy + 1; j++) for (let i = Math.floor(x0 / dx) - 1; i <= x1 / dx + 1; i++) {
    const cx = i * dx + (j & 1 ? dx / 2 : 0), cy = j * dy;
    const L = [{ x: cx, y: cy - dy * .46 }, { x: cx + dx * .17, y: cy - dy * .18 }, { x: cx + dx * .2, y: cy + dy * .1 }, { x: cx, y: cy + dy * .46 }, { x: cx - dx * .2, y: cy + dy * .1 }, { x: cx - dx * .17, y: cy - dy * .18 }];
    inkLine(ctx, catmull(L, 8, true), { w: 2.2, closed: true, col, alpha });
    inkLine(ctx, [{ x: cx, y: cy - dy * .3 }, { x: cx + 3, y: cy }, { x: cx, y: cy + dy * .3 }], { w: 1.6, col, alpha });
    shape(ctx, circlePts(cx, cy + dy * .5, 4.5, 10), { fill: col, noInk: true, alpha: alpha });
  }
  ctx.restore();
}

// A ribbon banner with swallow-tail ends, for subtitles and cartouches. Returns the inner text box {x,y,w,h}.
export function banner(ctx, cx, cy, w, h, o = {}) {
  const { fill = PAL.cream, edge = PAL.ochre, prog = 1, bow = 10 } = o;
  const a = eo(prog), W = w * a, x0 = cx - W / 2, x1 = cx + W / 2, y0 = cy - h / 2, y1 = cy + h / 2, tail = h * .5;
  const top = [], bot = [];
  for (let i = 0; i <= 20; i++) { const u = i / 20, x = lerp(x0, x1, u), b = Math.sin(u * Math.PI) * bow; top.push({ x, y: y0 - b }); bot.push({ x, y: y1 - b }); }
  const P = top.concat(bot.slice().reverse());
  const poly = [{ x: x0 - tail, y: y0 + h * .1 }, ...top, { x: x1 + tail, y: y0 + h * .1 }, { x: x1 + tail * .35, y: cy + h * .1 }, { x: x1 + tail, y: y1 + h * .1 }, ...bot.slice().reverse(), { x: x0 - tail, y: y1 + h * .1 }, { x: x0 - tail * .35, y: cy + h * .1 }];
  // the fold ends sit behind the main band
  shape(ctx, poly, { fill: edge, shade: PAL.ochreDk, sd: 4, ink: 3.2, k: .8 });
  shape(ctx, P, { fill, shade: mix(fill, PAL.ochreLt, .7), sd: 4, ink: 3, k: .8 });
  return { x: x0, y: y0 - bow / 2, w: W, h };
}
