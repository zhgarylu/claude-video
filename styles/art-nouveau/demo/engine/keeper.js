// Art Nouveau engine, part 5: the figure.  A poster woman built from the same primitives as the plants: a flat
// three-quarter face with a few firm lines, hair that is a family of whiplash ribbons, a robe whose folds are long
// tapered curves with a ribbon of shade and a ribbon of light each.
// All sizes come from H, the height of the head in pixels.  Pure function of its arguments.
import { clamp, lerp, seg, ss, eo, eio, TAU } from '/core/lib.js';
import { PAL, mix, rgba, shape, inkLine, whip, ribbonPoly, catmull, P2, polyPath, circlePts } from './ink.js';
import { pearls } from './ornament.js';
import { iris, blossom } from './flora.js';

const pt = (x, y) => ({ x, y });
// hair: a modest cascade, in head units from the face centre, for the right side (mirrored for the left)
const BACK = [
  { x: .42, y: -.3, a: .05, len: 2.0, bias: 2.5, wave: .25, freq: .9, curl: 1.1, W: .17, n: 2, ph: 1.0 },
  { x: .5, y: .0, a: .6, len: 2.4, bias: 1.6, wave: .3, freq: .85, curl: 1.15, W: .17, n: 2, ph: 2.0 },
  { x: .4, y: -.52, a: -.9, len: 1.0, bias: 2.4, wave: .15, freq: 1.0, curl: 1.2, W: .06, n: 1, ph: 3 },
  { x: .52, y: .35, a: .9, len: 1.3, bias: -1.8, wave: .2, freq: 1.0, curl: 1.3, W: .06, n: 1, ph: 1.4 },
];
const FRONT = [{ x: .3, y: -.46, a: 1.0, len: 2.1, bias: .5, wave: .12, freq: .9, curl: .95, W: .2, n: 2, ph: .3 }];

function lock(ctx, o, g, c, s, H, sway, colors) {
  const n = o.n || 1, a0 = s > 0 ? o.a : Math.PI - o.a, asym = s > 0 ? 1 : .93;
  for (let q = 0; q < n; q++) {
    const k = n === 1 ? 0 : q - (n - 1) / 2;                       // strand index within the bundle
    const Wm = o.W * H / n * (n === 1 ? 1 : 1.12), off = k * Wm * .95;
    const sw = Math.sin(c.t * 1.1 + o.ph + k * .3) * sway;
    const S = whip(c.x0 + s * o.x * H + Math.sin(a0) * off, c.y0 + o.y * H - Math.cos(a0) * off, a0, o.len * asym * H * (1 - .045 * Math.abs(k) + .02 * k), { wave: o.wave * s, bias: o.bias * s * asym, freq: o.freq, phase: o.ph + sw + k * .1, curl: o.curl * .9 + k * .04, curlLen: .36, dir: s, g, tipTurns: .9 });
    if (S.length < 5) continue;
    const gg = Math.max(.05, g), pw = v => { const t = Math.pow(clamp(v), .85); return Wm * (.2 + .8 * Math.max(0, Math.sin(Math.PI * clamp(.15 + .85 * t)))) * (v > .65 ? lerp(1, .5, ss((v - .65) / .35)) : 1) + 1; };
    const rb = ribbonPoly(S, u => pw(clamp(u / gg)));
    shape(ctx, rb.poly, { fill: colors.fill, shade: colors.shade, sd: Wm * .25, ink: 2.6, k: .9, hi: PAL.hairLt });
    const V = S.filter((_, i) => i % 2 === 0).map(p => { const h = pw(clamp(p.u / gg)) * .22; return { x: p.x + Math.sin(p.th) * h, y: p.y - Math.cos(p.th) * h }; });
    inkLine(ctx, V.slice(3, Math.floor(V.length * .85)), { w: 1.4, col: colors.strand, alpha: .55, t0: .12, t1: .4, tmin: .2 });
  }
}

function eye(ctx, cx, cy, w, s, open, gaze, ink) {
  const o = clamp(open);
  const A = P2([[cx - s * w * .5, cy + w * .02], [cx - s * w * .2, cy - o * w * .38 - w * .04], [cx + s * w * .18, cy - o * w * .46 - w * .03], [cx + s * w * .5, cy - w * .04], [cx + s * w * .2, cy + o * w * .24], [cx - s * w * .2, cy + o * w * .2]]);
  const E = catmull(A, 8, true);
  if (o > .12) {
    ctx.save(); ctx.fillStyle = PAL.cream; polyPath(ctx, E); ctx.fill(); polyPath(ctx, E); ctx.clip();
    const ix = cx + gaze * w * .18, iy = cy - o * w * .02 + (1 - o) * w * .1;
    ctx.fillStyle = '#7D8E66'; ctx.beginPath(); ctx.arc(ix, iy, w * .27, 0, TAU); ctx.fill();
    ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(ix, iy, w * .13, 0, TAU); ctx.fill();
    ctx.fillStyle = PAL.cream; ctx.beginPath(); ctx.arc(ix - w * .08, iy - w * .09, w * .045, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(PAL.skinSh, .8); ctx.fillRect(cx - w, cy - w, w * 2, o * w * .06 + (1 - o) * w * .5);   // lid shade
    ctx.restore();
    const up = E.slice(0, Math.floor(E.length * .52));
    inkLine(ctx, up.concat([pt(cx + s * w * .66, cy - w * (.08 + .05 * o))]), { w: ink * 1.9, t0: .05, t1: .25, tmin: .2 });
    inkLine(ctx, E.slice(Math.floor(E.length * .5)).concat([E[0]]), { w: ink * .55, t0: .2, t1: .2, alpha: .7 });
  } else {                                                          // closed: a single curved line with a lash flick
    const L = catmull(P2([[cx - s * w * .5, cy], [cx - s * w * .2, cy + w * .13], [cx + s * w * .2, cy + w * .15], [cx + s * w * .5, cy + w * .02], [cx + s * w * .66, cy - w * .03]]), 8);
    inkLine(ctx, L, { w: ink * 1.9, t0: .05, t1: .25, tmin: .2 });
  }
  const C = catmull(P2([[cx - s * w * .46, cy - o * w * .36 - w * .16], [cx, cy - o * w * .6 - w * .2], [cx + s * w * .42, cy - w * .17]]), 8);
  inkLine(ctx, C, { w: ink * .55, alpha: .55, t0: .3, t1: .3 });
}

// c: { x, y (face centre), H (head height px), t, build 0..1 (hair growth), lid 0..1, gaze -1..1, tilt, sway, yaw 0..1 (three-quarter turn), flip }
export function keeper(ctx, c) {
  const { x, y, H, t = 0, build = 1, lid = .35, gaze = 0, tilt = -.03, sway = .06, adorn = true, robe = PAL.lilac, robeSh = PAL.violet, yaw = .7, flip = false } = c;
  const ink = Math.max(1.6, H * .011);
  ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1); ctx.rotate(tilt);
  const cc = { x0: 0, y0: 0, t };
  const hairC = { fill: PAL.hair, shade: PAL.hairDk, strand: PAL.hairDk };
  const S = (a, b) => pt(a * H, b * H), Sp = arr => arr.map(p => S(p[0], p[1]));
  // three-quarter turn: the far (left) half of the face is narrower, everything on the face slides towards the near side
  const fx = (a, b) => pt(((a < 0 ? a * (1 - .24 * yaw) : a * (1 + .06 * yaw)) + yaw * .08 * (1 - Math.min(1, b * b * 2.2))) * H, b * H), Fp = arr => arr.map(p => fx(p[0], p[1]));
  const grow = i => clamp((build - i * .06) / .7);
  // 1. back locks and the hair behind the head
  [1, -1].forEach(s => BACK.forEach((o, i) => lock(ctx, o, eo(grow(i)), cc, s, H, sway, hairC)));
  shape(ctx, catmull(Fp([[0, -.67], [.32, -.62], [.5, -.38], [.52, 0], [.5, .55], [.42, 1.0], [0, 1.05], [-.4, 1.0], [-.48, .55], [-.5, 0], [-.48, -.38], [-.32, -.62]]), 8, true), { fill: PAL.hairDk, ink: 2.8, k: .9 });
  // 2. neck and robe
  const neck = catmull(Sp([[-.16, .3], [-.15, .6], [-.2, .78], [-.3, .86], [.3, .86], [.2, .78], [.15, .6], [.16, .3]]), 6, true);
  shape(ctx, neck, { fill: PAL.skin, shade: PAL.skinSh, sd: H * .06, ink, k: .7 });
  const R = catmull(Sp([[-.2, .74], [-.55, .83], [-1.0, 1.05], [-1.4, 1.5], [-1.55, 2.4], [-1.8, 3.6], [1.8, 3.6], [1.55, 2.4], [1.4, 1.5], [1.0, 1.05], [.55, .83], [.2, .74], [.3, .94], [.2, 1.16], [0, 1.26], [-.2, 1.16], [-.3, .94]]), 7, true);
  shape(ctx, R, { fill: robe, shade: robeSh, sd: H * .11, ink: ink * 1.4, k: .9, hi: mix(robe, '#ffffff', .22) });
  ctx.save(); polyPath(ctx, R); ctx.clip();
  // modelling: each long fold is a ribbon of shade on its far side and a ribbon of light on its near side
  for (const s of [1, -1]) for (let i = 0; i < 5; i++) {
    const F = whip(s * (.5 + i * .2) * H, (.9 + i * .1) * H, s > 0 ? 1.3 + i * .05 : Math.PI - 1.3 - i * .05, (2.3 + i * .15) * H, { wave: .32 * s, freq: .9, phase: i * .8, g: 1 });
    const sh = ribbonPoly(F.map(p => ({ ...p, x: p.x + s * H * .07 })), u => H * .17 * Math.sin(Math.PI * Math.min(1, u * 1.15)) + 1);
    ctx.fillStyle = rgba(robeSh, .5); polyPath(ctx, sh.poly); ctx.fill();
    const lt = ribbonPoly(F.map(p => ({ ...p, x: p.x - s * H * .1 })), u => H * .07 * Math.sin(Math.PI * Math.min(1, u * 1.1)) + 1);
    ctx.fillStyle = rgba(mix(robe, '#ffffff', .5), .55); polyPath(ctx, lt.poly); ctx.fill();
    inkLine(ctx, F, { w: ink * 3.0, col: mix(robeSh, PAL.ink, .45), t0: .06, t1: .5, tmin: .08, swell: .3, alpha: .9 });
  }
  // an ochre sash under the bust with pearls, and cuff bands on the sleeves
  const sash = catmull(Sp([[-1.2, 1.62], [-.6, 1.78], [0, 1.82], [.6, 1.78], [1.2, 1.62]]), 8);
  inkLine(ctx, sash, { w: H * .12, col: PAL.ink, t0: 0, t1: 0, tmin: 1, cap: false }); inkLine(ctx, sash, { w: H * .095, col: PAL.ochre, t0: 0, t1: 0, tmin: 1, cap: false });
  pearls(ctx, sash, H * .11, H * .017, {});
  for (const s of [-1, 1]) [[.95, 1.35], [1.25, 1.95], [.8, 2.05], [1.35, 3.05], [.55, 3.15]].forEach(([bx, by], i) => blossom(ctx, s * bx * H, by * H, H * .085, { n: 5, rot: i, fill: PAL.cream, shade: PAL.roseLt, core: PAL.ochre }));
  ctx.restore();
  // neckline: skin, ochre band, pearls
  const N = catmull(Sp([[-.25, .73], [-.33, .9], [-.18, 1.12], [0, 1.18], [.18, 1.12], [.33, .9], [.25, .73]]), 8);
  shape(ctx, N.concat([pt(0, .72 * H)]), { fill: PAL.skin, shade: PAL.skinSh, sd: H * .05, ink, k: .6 });
  const NB = catmull(Sp([[-.34, .86], [-.4, 1.0], [-.2, 1.24], [0, 1.3], [.2, 1.24], [.4, 1.0], [.34, .86]]), 8);
  inkLine(ctx, NB, { w: H * .055, col: PAL.ink, t0: .1, t1: .1, tmin: .5 }); inkLine(ctx, NB, { w: H * .04, col: PAL.ochre, t0: .1, t1: .1, tmin: .5 });
  pearls(ctx, NB, H * .075, H * .016, {});
  // front locks, over the shoulders
  [1, -1].forEach(s => FRONT.forEach((o, i) => lock(ctx, o, eo(grow(i + 1)), cc, s, H, sway * .6, hairC)));
  // 3. face (three-quarter)
  const F = catmull(Fp([[0, -.5], [.2, -.47], [.335, -.33], [.37, -.1], [.335, .13], [.225, .33], [.1, .46], [0, .5], [-.1, .46], [-.225, .33], [-.335, .13], [-.37, -.1], [-.335, -.33], [-.2, -.47]]), 7, true);
  shape(ctx, F, { fill: PAL.skin, shade: PAL.skinSh, sd: H * .05, ink: ink * 1.2, k: 1 });
  { const b = fx(.21, .13); ctx.fillStyle = rgba(PAL.rose, .42); ctx.beginPath(); ctx.ellipse(b.x, b.y, .08 * H, .045 * H, 0, 0, TAU); ctx.fill();
    const b2 = fx(-.17, .13); ctx.beginPath(); ctx.ellipse(b2.x, b2.y, .05 * H, .04 * H, 0, 0, TAU); ctx.fill(); }
  for (const s of [-1, 1]) {
    const far = s < 0 ? 1 - .26 * yaw : 1;
    inkLine(ctx, catmull(Fp([[s * .075, -.185], [s * .15, -.215], [s * .245, -.19]]), 8), { w: ink * 1.5, t0: .05, t1: .5, tmin: .15, swell: .2 });
    const e = fx(s * .155, -.085); eye(ctx, e.x, e.y, .175 * H * far, s, lid, gaze, ink);
  }
  inkLine(ctx, catmull(Fp([[.0, -.06], [.03, .06], [.03, .13], [.0, .155]]), 8), { w: ink * 1.15, t0: .1, t1: .3, tmin: .2 });
  inkLine(ctx, catmull(Fp([[-.04, .13], [-.02, .163], [.03, .16]]), 6), { w: ink * 1.1, t0: .2, t1: .2 }); inkLine(ctx, catmull(Fp([[.05, .145], [.075, .132], [.082, .112]]), 6), { w: ink * .9, t0: .2, t1: .3 });
  const mc = fx(.01, .295); ctx.save(); ctx.translate(mc.x, mc.y);
  shape(ctx, catmull(Sp([[-.085, 0], [-.04, -.03], [0, -.014], [.04, -.03], [.085, 0], [.0, .016]]), 6, true), { fill: '#C0766B', ink: ink * .8, k: .5 });          // upper lip with a cupid's bow
  shape(ctx, catmull(Sp([[-.078, .005], [0, .0], [.078, .005], [.055, .05], [0, .064], [-.055, .05]]), 6, true), { fill: '#D58F84', shade: PAL.roseDk, sd: 3, ink: ink * .8, k: .6, hi: '#E8B0A6' });   // a fuller lower lip
  inkLine(ctx, Sp([[-.085, .0], [-.03, .008], [.03, .008], [.085, .0]]), { w: ink * 1.6, t0: .15, t1: .15, tmin: .3 });
  ctx.restore();
  // 4. hair cap over the forehead, with the parting
  const cap = catmull(Fp([[0, -.37], [-.1, -.355], [-.22, -.3], [-.31, -.2], [-.362, -.06], [-.43, -.3], [-.38, -.55], [-.2, -.67], [0, -.7], [.2, -.67], [.38, -.55], [.43, -.3], [.362, -.06], [.31, -.2], [.22, -.3], [.1, -.355]]), 7, true);
  shape(ctx, cap, { fill: PAL.hair, shade: PAL.hairDk, sd: H * .06, ink: ink * 1.4, k: 1, hi: PAL.hairLt });
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
    const E = catmull(Fp([[s * .008, -.37 - i * .05], [s * (.1 + i * .035), -.36 - i * .06], [s * (.26 + i * .02), -.3 - i * .06], [s * (.37 + i * .012), -.12 - i * .05]]), 6);
    inkLine(ctx, E, { w: ink * .9, col: PAL.hairDk, alpha: .55, t0: .1, t1: .5, tmin: .2 });
  }
  inkLine(ctx, Fp([[0, -.37], [0, -.55], [0, -.69]]), { w: ink * 1.2, t0: .1, t1: .3 });
  // 5. diadem and flowers in the hair
  if (adorn) {
    const band = catmull(Fp([[-.4, -.38], [-.3, -.55], [-.1, -.64], [.1, -.64], [.3, -.55], [.4, -.38]]), 8);
    inkLine(ctx, band, { w: H * .028, col: PAL.ochre, t0: .1, t1: .1, tmin: .5 }); pearls(ctx, band, H * .06, H * .012, {});
    for (const s of [-1, 1]) { const q = fx(s * .36, -.5); iris(ctx, q.x, q.y, { L: .32 * H, open: 1, up: -90 + s * 52, sway: 0 }); }
  }
  ctx.restore();
}
