// hero.js — a young martial-role heroine (original design) as a jointed cel: pose in, drawing out.
// Pose angles are measured from "straight down", positive toward screen-right: vector = (sin a, cos a).
import { lerp, clamp, mulberry, ss, vnoise } from '/core/lib.js';
import { PAL, shade, mix, spl, bez, arc, cat, line, rev, mirrorX, trace, bbox, ink, inkLoop, cel, flat, capsule, tube, textures, goldSheen } from './brush.js';

const D = a => [Math.sin(a), Math.cos(a)];
const add = (p, q, k = 1) => [p[0] + q[0] * k, p[1] + q[1] * k];
const xf = (pts, ox, oy, ang = 0, sx = 1, sy = 1) => { const c = Math.cos(ang), s = Math.sin(ang); return pts.map(([x, y]) => { x *= sx; y *= sy; return [ox + x * c - y * s, oy + x * s + y * c]; }); };
const P = (x, y) => [x, y];

// ---------- limbs ----------
function sleeve(ctx, A, B, wA, wB, col, seed, trim = PAL.gold) {
  const body = capsule(A, B, wA, wB, 2);
  cel(ctx, body, col, { lw: 4.5, seed, mott: .55, pool: .3 });
  return body;
}

function waterSleeve(ctx, wrist, dir, len, amp, seed, flip = 1) {
  // a long white silk strip leaving the wrist along `dir`, in a travelling S curve
  const r = mulberry(seed);
  const n = 14, c = [], c2 = [];
  const ux = Math.cos(dir), uy = Math.sin(dir), nx = -uy, ny = ux;
  for (let i = 0; i <= n; i++) {
    const u = i / n, d = len * u, off = Math.sin(u * 5.2 + seed) * amp * Math.sin(u * 2.6) * flip;
    const wd = lerp(26, 52, ss(u)) * (1 + .12 * Math.sin(u * 9 + seed));
    c.push([wrist[0] + ux * d + nx * (off - wd / 2), wrist[1] + uy * d + ny * (off - wd / 2)]);
    c2.push([wrist[0] + ux * d + nx * (off + wd / 2), wrist[1] + uy * d + ny * (off + wd / 2)]);
  }
  const body = cat(spl(c, false, 4), spl(rev(c2), false, 4));
  cel(ctx, body, PAL.white, { lw: 3.6, seed, mott: .35, pool: .12, line: PAL.inkBlue });
  // fold lines
  for (let k = 1; k < 4; k++) { const u0 = .12 + k * .06; const pts = []; for (let i = 0; i <= n; i++) { const a = c[i], b = c2[i]; pts.push([lerp(a[0], b[0], .25 * k + .1), lerp(a[1], b[1], .25 * k + .1)]); } ink(ctx, spl(pts.slice(1, n - 2), false, 4), { w: 1.8, col: PAL.azuLt, seed: seed + k, taper: [.2, .4], minw: .2, alpha: .7 }); }
  return body;
}

function hand(ctx, p, ang, kind, seed) {
  // local: +x points along the forearm direction away from the wrist
  const skin = PAL.skin; const X = (pts) => xf(pts, p[0], p[1], ang, 1.28, 1.28);
  if (kind === 'sword') {                         // sword fingers: index+middle extended
    const f1 = X(capsule([0, 0], [46, -3], 9, 6)), f2 = X(capsule([0, 6], [42, 9], 8.5, 5.5));
    cel(ctx, f2, shade(skin, .96), { lw: 2.6, seed, mott: .3, pool: .1, line: PAL.inkRed });
    cel(ctx, f1, skin, { lw: 2.6, seed: seed + 1, mott: .3, pool: .1, line: PAL.inkRed });
    const palm = X(spl([[-6, -12], [14, -14], [24, -4], [24, 14], [6, 18], [-8, 10]], true, 3));
    cel(ctx, palm, skin, { lw: 2.8, seed: seed + 2, mott: .3, pool: .1, line: PAL.inkRed });
    const th = X(capsule([8, 14], [26, 20], 6, 4.5)); cel(ctx, th, skin, { lw: 2.4, seed: seed + 3, mott: .2, pool: 0, line: PAL.inkRed });
  } else {                                        // fist around a shaft
    const fist = X(spl([[-4, -14], [18, -17], [32, -8], [33, 10], [18, 17], [-4, 13]], true, 3));
    cel(ctx, fist, skin, { lw: 3, seed, mott: .3, pool: .1, line: PAL.inkRed });
    for (let k = 0; k < 3; k++) ink(ctx, X(line([10 + k * 7, -15], [10 + k * 7, 14])), { w: 1.6, col: PAL.inkRed, seed: seed + k, taper: [.3, .3], minw: .3 });
  }
}

// ---------- boots and legs ----------
function leg(ctx, hip, th, sh, ft, side, seed, o = {}) {
  const knee = add(hip, D(th), 176), ank = add(knee, D(sh), 168);
  const mid = add(knee, D(sh), 70);
  const body = tube([hip, add(hip, D(th), 90), knee, mid, ank], [[0, 40], [.3, 33], [.5, 27], [.66, 27], [.85, 22], [1, 17]], .5);
  cel(ctx, body, PAL.white, { lw: 4.4, seed, mott: .4, line: PAL.inkBlue });
  // thigh in indigo breeches (kao-tui), leggings white below the knee
  ctx.save(); trace(ctx, body); ctx.clip();
  const kn = add(knee, D(sh), 6), nT = [Math.cos(th), -Math.sin(th)];
  flat(ctx, [add(add(hip, nT, -60), D(th), -20), add(add(hip, nT, 60), D(th), -20), add(kn, nT, 60), add(kn, nT, -60)], PAL.indigo);
  ink(ctx, [add(kn, nT, -40), add(kn, nT, 40)], { w: 4, col: PAL.gold, seed: seed + 3, taper: [.1, .1], minw: .6 });
  ctx.restore();
  ink(ctx, body, { w: 3.4, col: PAL.inkBlue, seed: seed + 4, closed: false, taper: [.03, .03], minw: .7 });
  // pleats down the legging
  const nrm = [Math.cos(sh), -Math.sin(sh)];
  for (let k = -1; k <= 1; k++) { const a = add(knee, D(sh), 24), b = add(ank, D(sh), -24); ink(ctx, line(add(a, nrm, k * 7), add(b, nrm, k * 4)), { w: 1.7, col: PAL.azuLt, seed: seed + 5 + k, taper: [.3, .4], minw: .2, alpha: .85 }); }
  // boot: shaft up the shin, foot block in the foot frame, thick white sole
  const mf = Math.cos(ft) < 0 ? -1 : 1, fa_ = mf < 0 ? ft - Math.PI : ft;
  const shaft = tube([add(ank, D(sh), -78), add(ank, D(sh), 4)], [[0, 24], [.5, 20], [1, 21]]);
  cel(ctx, shaft, PAL.indigo, { lw: 4.4, seed: seed + 9, mott: .4 });
  const F = pts => xf(pts, ank[0], ank[1], fa_, mf, .88, .9);
  const upper = F(spl([[-26, -30], [10, -34], [44, -26], [84, -16], [104, -34], [100, 0], [-26, 2]], true, 4, .4));
  const sole = F(spl([[-30, 0], [96, -2], [108, -8], [104, 30], [-30, 30]], true, 4, .3));
  cel(ctx, sole, PAL.white, { lw: 4, seed: seed + 11, mott: .4, line: PAL.ink });
  ink(ctx, F([[-26, 12], [100, 10]]), { w: 1.6, col: PAL.paperDk, seed: seed + 14, taper: [.2, .2], minw: .4 });
  cel(ctx, upper, PAL.indigo, { lw: 4.4, seed: seed + 12, mott: .5 });
  ink(ctx, F(line([-24, -18], [70, -13])), { w: 3.2, col: PAL.gold, seed: seed + 13, taper: [.2, .3], minw: .3 });
  // gold cloud on the toe
  const sp = []; for (let i = 0; i <= 18; i++) { const u = i / 18, a = u * 7; sp.push([88 + Math.cos(a) * (10 - u * 7), -16 + Math.sin(a) * (9 - u * 6)]); } ink(ctx, F(sp), { w: 1.8, col: PAL.goldLt, seed: seed + 15, taper: [.1, .3], minw: .3 });
  return { knee, ank };
}

// ---------- back flags (kaoqi) ----------
function flag(ctx, base, ang, len, seed, cols, sway = 0) {
  const w = 44;
  const lc = [[-w * .55, 0], [-w * .62, -len * .45], [-w * .66 + sway * .5, -len * .8], [sway, -len]];
  const rc = [[w * .55, 0], [w * .62, -len * .45], [w * .66 + sway * .5, -len * .8], [sway, -len]];
  const outline = cat(spl(lc, false, 5), rev(spl(rc, false, 5)));
  const T = pts => xf(pts, base[0], base[1], ang);
  const O = T(outline);
  cel(ctx, O, cols[0], { lw: 5, seed, mott: .55, pool: .25 });
  // gold border (inset)
  const ins = cat(spl([[-w * .42, -10], [-w * .48, -len * .45], [-w * .5 + sway * .5, -len * .78], [sway * .9, -len * .9]], false, 5), rev(spl([[w * .42, -10], [w * .48, -len * .45], [w * .5 + sway * .5, -len * .78], [sway * .9, -len * .9]], false, 5)));
  ctx.save(); trace(ctx, O); ctx.clip();
  ink(ctx, T(ins), { w: 5, col: PAL.gold, seed: seed + 1, taper: [.02, .02], minw: .8, closed: false });
  ink(ctx, T(ins.map(p => [p[0] * .8, p[1] * .93 - 4])), { w: 2, col: PAL.goldLt, seed: seed + 2, taper: [.02, .02], minw: .8, alpha: .8 });
  // cloud-curl medallion in the middle
  const cy = -len * .5, cx = sway * .3;
  const med = T(arc(cx, cy, 15, 15, 0, 7, 4)); cel(ctx, med, cols[1], { lw: 2.8, seed: seed + 3, mott: .2, pool: 0, line: PAL.ink, sheen: true });
  for (let k = 0; k < 2; k++) {
    const sp = []; for (let i = 0; i <= 26; i++) { const u = i / 26, a = u * 8.5 + k * 3.14, r = 30 - u * 22; sp.push([cx + Math.cos(a) * r * (k ? -1 : 1), cy + 52 * (k ? -1 : 1) + Math.sin(a) * r]); }
    ink(ctx, T(sp), { w: 3.4, col: PAL.gold, seed: seed + 4 + k, taper: [.1, .4], minw: .2 });
  }
  ctx.restore();
  // pole + pennon tip
  ink(ctx, T([[-w * .55, 4], [-w * .6, -len * .5], [sway - 2, -len + 4]]), { w: 3.4, col: PAL.ink, seed: seed + 8, taper: [.02, .3], minw: .4 });
}

// ---------- the head ----------
export function drawFace(ctx, f = {}) {
  // local: origin = middle of face, y down, face ~ 94 wide x 124 high
  const { look = 0, brow = 0, mouth = 0, seed = 3, blink = 0, rouge = 1 } = f;
  const outline = spl([[0, -62], [34, -56], [48, -22], [45, 14], [26, 48], [0, 64], [-26, 48], [-45, 14], [-48, -22], [-34, -56]], true, 4, .5);
  cel(ctx, outline, '#f4dfc9', { lw: 4.5, seed, mott: .25, pool: .12, line: PAL.inkRed, light: .2 });
  ctx.save(); trace(ctx, outline); ctx.clip();
  // blush
  for (const s of [-1, 1]) { ctx.globalAlpha = .28 * rouge; ctx.fillStyle = PAL.rouge; ctx.beginPath(); ctx.ellipse(s * 28, 24, 15, 10, 0, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.restore();
  for (const s of [-1, 1]) {
    ctx.save(); ctx.scale(s, 1);
    // rouge flame: a wedge from the inner eye corner sweeping up to a point at the temple
    const rs = spl([[5, -9], [16, -19], [34, -31], [52, -48], [60, -58], [47, -41], [34, -33], [18, -27], [6, -20]], true, 3, .45);
    flat(ctx, rs, PAL.cinnabar, .96); flat(ctx, rs.map(p => [p[0] * .92 + 1, p[1] * .92 - 1]), PAL.rouge, .6);
    // eye: narrow, long, slanted up toward the temple
    const eye = spl([[6, -4 + blink * 3], [17, -10 + blink * 5], [32, -18], [46, -28], [34, -10 + blink], [19, -2], [8, 0]], true, 3);
    flat(ctx, eye, PAL.white);
    if (!blink || blink < .6) {
      ctx.save(); trace(ctx, eye); ctx.clip();
      const px = 20 + look * 5 * s;
      ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.ellipse(px, -8, 6.5, 8.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.arc(px + 2, -11, 1.8, 0, 7); ctx.fill();
      ctx.restore();
    }
    ink(ctx, spl([[2, -3], [16, -12 + blink * 5], [33, -20], [50, -32]], false, 3), { w: 5.6, col: PAL.ink, seed: seed + 2, taper: [.05, .5], minw: .22 });     // upper lid + swept tail
    ink(ctx, spl([[8, 1], [20, 1.5], [34, -9]], false, 3), { w: 1.6, col: PAL.ink, seed: seed + 3, taper: [.3, .4], minw: .2, alpha: .8 });
    // brow: bold, rising to a point at the temple
    const by = brow * 5;
    ink(ctx, spl([[4, -26 - by], [20, -37 - by], [40, -49 - by], [60, -64 - by]], false, 3), { w: 11, col: PAL.ink, seed: seed + 4, taper: [.05, .6], minw: .1, press: .15 });
    ctx.restore();
  }
  // nose and mouth
  ink(ctx, spl([[-3, 6], [2, 12], [-1, 17]], false, 3), { w: 2.4, col: PAL.inkRed, seed: seed + 6, taper: [.3, .4], minw: .3 });
  const m = mouth;   // 0 closed, 1 open
  const lip = spl([[-11, 36], [-5, 32], [0, 34.5], [5, 32], [11, 36], [6, 41 + m * 6], [-6, 41 + m * 6]], true, 2.4, .5);
  cel(ctx, lip, PAL.cinnabar, { lw: 1.8, seed: seed + 7, mott: .15, pool: 0, line: PAL.inkRed, reg: [0, 0] });
  ink(ctx, [[-11, 36], [-3, 37.5], [3, 37.5], [11, 36]], { w: 1.8, col: PAL.inkRed, seed: seed + 8, taper: [.2, .2], minw: .5 });
  // huadian (forehead mark)
  const hd = spl([[0, -38], [3.5, -32], [0, -26], [-3.5, -32]], true, 2); flat(ctx, hd, PAL.cinnabar);
}

function pheasant(ctx, base, ang, len, side, seed, drop = 1) {
  // a long plume: a thin rib curving up, out and down; a ragged vane built from hundreds of barbs
  const r = mulberry(seed);
  const C = pts => xf(pts, base[0], base[1], ang, side, 1);
  const rib = spl([[0, 0], [8, -len * .26], [46, -len * .52], [130, -len * .68], [226, -len * .6 * drop - 14], [292, -len * .32 * drop], [318, len * .02 * drop], [312, len * .16 * drop]], false, 3, .5);
  const n = rib.length, top = [], bot = [], nr = [];
  for (let i = 0; i < n; i++) {
    const a = rib[Math.max(0, i - 1)], b = rib[Math.min(n - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; nr.push([-ty, tx]);
    const u = i / (n - 1), w = 56 * Math.pow(Math.sin(Math.PI * Math.pow(u, .62)), .9) + 3, j1 = 1 + (vnoise(i * .45 + seed) - .5) * .35, j2 = 1 + (vnoise(i * .45 + seed + 9) - .5) * .35;
    top.push([rib[i][0] - ty * w * .55 * j1, rib[i][1] + tx * w * .55 * j1]); bot.push([rib[i][0] + ty * w * .45 * j2, rib[i][1] - tx * w * .45 * j2]);
  }
  const V = C(cat(top, rev(bot)));
  flat(ctx, V, '#ecdcb6');
  ctx.save(); trace(ctx, V); ctx.clip();
  // soft colour bands: ochre and umber crescents across the vane
  for (let i = 10; i < n - 6; i += 9) for (const E of [top, bot]) { const a = C([rib[i]])[0], b = C([E[i]])[0]; ink(ctx, [a, b], { w: 12, col: i % 18 === 1 ? PAL.umber ?? '#6b4a2c' : PAL.ochre, seed: seed + i, taper: [.1, .6], minw: .1, alpha: .32 }); }
  // barbs: fine, curved back toward the tip, in alternating cream, ochre and ink
  const rt = C(rib), tp = C(top), bt = C(bot);
  for (let i = 2; i < n - 1; i++) for (const [E, sg] of [[tp, 1], [bt, -1]]) {
    const a = rt[i], b = E[i], c = rt[Math.min(n - 1, i + 3)], ex = [b[0] + (c[0] - a[0]) * .5, b[1] + (c[1] - a[1]) * .5], mid = [lerp(a[0], ex[0], .5) + (c[0] - a[0]) * .1, lerp(a[1], ex[1], .5) + (c[1] - a[1]) * .1];
    const k = (i + (sg > 0 ? 0 : 1)) % 4;
    ink(ctx, [a, mid, ex], { w: 1.5, col: k === 0 ? PAL.ink : k === 1 ? PAL.ochre : k === 2 ? '#fff6dc' : '#8a6a3c', seed: seed + i * 3 + (sg > 0 ? 0 : 1), taper: [.05, .5], minw: .15, alpha: k === 0 ? .5 : .7, press: .1, wob: .1 });
  }
  ctx.restore();
  inkLoop(ctx, V, { w: 2.4, col: PAL.inkRed, seed, light: 0 });
  // eye-spot near the tip
  const ei = Math.floor(n * .78), ec = rt[ei]; ctx.fillStyle = PAL.azurite; ctx.beginPath(); ctx.ellipse(ec[0], ec[1], 9, 13, ang * side, 0, 7); ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.8; ctx.stroke(); ctx.fillStyle = PAL.goldLt; ctx.beginPath(); ctx.arc(ec[0], ec[1], 4, 0, 7); ctx.fill();
  ink(ctx, rt, { w: 3.2, col: PAL.ink, seed: seed + 99, taper: [.05, .4], minw: .25 });
}

export function drawHead(ctx, o = {}) {
  // origin = face centre. o.tilt applied by caller. feathers sway with o.sway
  const { seed = 5, sway = 0, look = 0, mouth = 0, brow = 0, blink = 0, plume = 1, noFeathers = false } = o;
  // plumes (behind everything)
  if (!noFeathers) { pheasant(ctx, [-22, -112], -.22 + sway * .1, 330, -1, seed + 1, plume); pheasant(ctx, [22, -112], .22 + sway * .1, 330, 1, seed + 2, plume); }
  // hair mass behind the face
  const hair = spl([[-50, -20], [-56, -70], [-30, -104], [0, -112], [30, -104], [56, -70], [50, -20], [48, 30], [-48, 30]], true, 4);
  cel(ctx, hair, '#2a2231', { lw: 4.5, seed, mott: .4, pool: .1, line: PAL.ink });
  // side tassels hanging from the temples
  for (const s of [-1, 1]) {
    const x = s * 60, ps = [[x, -26], [x + s * 6, 6], [x + s * 4, 38], [x + s * 10 + sway * 4, 78]];
    ink(ctx, spl(ps, false, 4), { w: 2.6, col: PAL.goldDk, seed: seed + 10 + s, taper: [.02, .02], minw: .8 });
    for (let k = 0; k < 4; k++) { const p = spl(ps, false, 4)[Math.floor((k + .5) * 24 / 4)] || ps[1]; ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.arc(p[0], p[1], 4.5, 0, 7); ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.2; ctx.stroke(); }
    const e = ps[3]; const tl = spl([[e[0] - 7, e[1]], [e[0], e[1] + 40], [e[0] + 7, e[1]]], true, 3); cel(ctx, tl, PAL.cinnabar, { lw: 2.4, seed: seed + 20 + s, mott: .2, pool: 0, line: PAL.inkRed });
    for (let k = -2; k <= 2; k++) ink(ctx, [[e[0] + k * 2.4, e[1] + 6], [e[0] + k * 2.8, e[1] + 38]], { w: 1.2, col: PAL.inkRed, seed: seed + 30 + k, taper: [.1, .5], minw: .3, alpha: .7 });
  }
  drawFace(ctx, { look, mouth, brow, blink, seed });
  // sweeping side-locks over the cheeks
  for (const s of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      const x0 = s * (47 - k * 4), pts = [[x0, -44 + k * 4], [s * (56 - k * 3), -6], [s * (50 - k * 5), 26], [s * (36 - k * 6), 46 + k * 4], [s * (26 - k * 6), 50 + k * 6]];
      ink(ctx, spl(pts, false, 3), { w: 9 - k * 2.5, col: '#241d2c', seed: seed + 40 + k + s * 3, taper: [.05, .9], minw: .05, press: .1 });
      ink(ctx, spl(pts.map(p => [p[0] - s * 2, p[1] + 1]), false, 3).slice(3, 20), { w: 1.5, col: PAL.azuLt, seed: seed + 50 + k, taper: [.3, .5], minw: .1, alpha: .6 });
    }
  }
  // brow-band (forehead ornament) with pearls and a crown crest
  const band = cat(spl([[-54, -34], [-40, -62], [0, -76], [40, -62], [54, -34]], false, 4), rev(spl([[-48, -30], [-36, -50], [0, -62], [36, -50], [48, -30]], false, 4)));
  // crown crest (kingfisher-blue inlay)
  const crest = spl([[-52, -62], [-64, -92], [-46, -122], [-22, -112], [-12, -138], [0, -150], [12, -138], [22, -112], [46, -122], [64, -92], [52, -62], [0, -76]], true, 4, .45);
  cel(ctx, crest, PAL.gold, { lw: 4.4, seed: seed + 60, mott: .4, sheen: true, line: PAL.ink });
  ctx.save(); trace(ctx, crest); ctx.clip();
  for (const s of [-1, 1]) {   // blue inlay petals
    for (let k = 0; k < 3; k++) { const px = s * (18 + k * 16), py = -96 - (k === 1 ? 4 : 0) + k * 6; const pt = spl([[px, py + 16], [px + s * 9, py], [px, py - 16], [px - s * 9, py]], true, 3); flat(ctx, pt, PAL.azurite); ink(ctx, pt.concat([pt[0]]), { w: 2, col: PAL.goldDk, seed: seed + 70 + k * s, taper: [.05, .05], minw: .8 }); }
  }
  ctx.restore();
  cel(ctx, band, PAL.cinnabar, { lw: 3.4, seed: seed + 61, mott: .3, line: PAL.ink });
  for (let i = 0; i <= 8; i++) { const u = i / 8, a = Math.PI * (1.08 + u * .84); const x = Math.cos(a) * 48, y = -36 + Math.sin(a) * 36; ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.arc(x, y, 5.6, 0, 7); ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.4; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(x - 1.6, y - 1.8, 1.5, 0, 7); ctx.fill(); }
  // pom-poms on springs
  for (const s of [-1, 1]) {
    const bx = s * 36, by = -142, sp = []; for (let i = 0; i <= 30; i++) { const u = i / 30; sp.push([bx + s * (u * 14) + Math.sin(u * 20) * 5, by + 10 - u * 36]); }
    ink(ctx, sp, { w: 2.4, col: PAL.goldDk, seed: seed + 80 + s, taper: [.05, .05], minw: .8 });
    const cx = bx + s * 14 + sway * 3, cy = by - 34;
    cel(ctx, arc(cx, cy, 17, 17, 0, 6.3, 3).slice(0, -1), PAL.cinnabar, { lw: 2.8, seed: seed + 85 + s, mott: .2, pool: 0, line: PAL.inkRed });
    for (let k = 0; k < 18; k++) { const a = k / 18 * 6.28; ink(ctx, [[cx + Math.cos(a) * 6, cy + Math.sin(a) * 6], [cx + Math.cos(a) * 19, cy + Math.sin(a) * 19]], { w: 1.8, col: PAL.rouge, seed: seed + 90 + k, taper: [.1, .6], minw: .1, alpha: .8 }); }
  }
}

// ---------- the whole figure ----------
export function drawHero(ctx, pose, o = {}) {
  const p = pose, seed = o.seed ?? 11, S = o.scale ?? 1;
  const lean = p.lean ?? 0;
  const up = [Math.sin(lean), -Math.cos(lean)], rt = [Math.cos(lean), Math.sin(lean)];
  const hip = [0, 0];
  const chest = add(hip, up, 226);
  const shR = add(add(chest, rt, 74), up, -12), shL = add(add(chest, rt, -74), up, -12);
  const headUp = [Math.sin(lean + (p.headTilt ?? 0)), -Math.cos(lean + (p.headTilt ?? 0))];
  const headC = add(chest, headUp, 98);
  ctx.save(); ctx.scale(S, S);

  // 1. back flags
  const fl = [[-.74, PAL.indigo, PAL.gold, 300], [.74, PAL.indigo, PAL.gold, 300], [-.26, PAL.cinnabar, PAL.goldLt, 340], [.26, PAL.cinnabar, PAL.goldLt, 340]];
  const fbase = add(chest, up, -34);
  for (const [a, c1, c2, len] of fl) flag(ctx, fbase, lean + a + (p.flagSway ?? 0) * .05 * Math.sign(a), len, seed + (a * 10 | 0), [c1, c2], (p.flagSway ?? 0) * 14 * Math.sign(a));

  // arms: geometry first (drawn after the coat, before the collar; hands and weapon go last)
  const armGeom = (side, a) => {
    const sh = side > 0 ? shR : shL;
    const el = add(sh, D(a.sh), 100), wr = add(el, D(a.el), 96);
    return { sh, el, wr, a };
  };
  const armDraw = (g, side) => {
    const { sh, el, wr, a } = g;
    const body = tube([sh, el, wr], [[0, 29], [.5, 25], [1, 19]], .5);
    cel(ctx, body, PAL.cinnabar, { lw: 4.6, seed: seed + 100 * side, mott: .5 });
    // shoulder cap: a domed armour piece that hides the join under the collar
    const capP = arc(sh[0], sh[1], 34, 30, 0, 6.3, 4).slice(0, -1);
    cel(ctx, capP, PAL.cinnabar, { lw: 4.4, seed: seed + 100 * side + 30, mott: .5 });
    for (let k = 0; k < 3; k++) ink(ctx, arc(sh[0], sh[1] - 4 + k * 3, 24 - k * 6, 18 - k * 5, Math.PI * 1.05, Math.PI * 1.95, 3), { w: 2.4, col: PAL.gold, seed: seed + 100 * side + 31 + k, taper: [.1, .1], minw: .6 });
    // gold bracer at the wrist, and gold scale lines on the upper arm
    const brace = tube([add(wr, D(a.el), -34), add(wr, D(a.el), -6)], [[0, 21], [1, 19]]);
    cel(ctx, brace, PAL.gold, { lw: 3.6, seed: seed + 100 * side + 2, mott: .3, sheen: true });
    const nrm = [Math.cos(a.el), -Math.sin(a.el)];
    for (let k = 0; k < 3; k++) { const q = add(wr, D(a.el), -30 + k * 10); ink(ctx, [add(q, nrm, -17), add(q, nrm, 17)], { w: 1.6, col: PAL.goldDk, seed: seed + 100 * side + 7 + k, taper: [.2, .2], minw: .5 }); }
    const nrm2 = [Math.cos(a.sh), -Math.sin(a.sh)];
    ctx.save(); trace(ctx, body); ctx.clip();
    for (let k = 0; k < 4; k++) { const q = add(sh, D(a.sh), 22 + k * 15); ink(ctx, arc(q[0], q[1], 14, 10, 0, 3.14, 3).map(pp => [pp[0], pp[1]]), { w: 2, col: PAL.gold, seed: seed + 100 * side + 20 + k, taper: [.1, .1], minw: .6, alpha: .9 }); }
    ctx.restore();
  };

  const legBack = leg(ctx, add(hip, rt, 30), p.legR.th, p.legR.sh, p.legR.ft, 1, seed + 200);
  const legFront = leg(ctx, add(hip, rt, -30), p.legL.th, p.legL.sh, p.legL.ft, -1, seed + 300);

  // 3. skirt: pennant strips hung from the waist, gravity + a little lean
  const waist = add(hip, up, 6);
  const hang = p.skirtHang ?? (-lean * .5);
  const strips = 9, fan = p.skirtFan ?? 1;
  const order = []; for (let i = 0; i < strips; i++) order.push(i);
  order.sort((a, b) => Math.abs(b - (strips - 1) / 2) - Math.abs(a - (strips - 1) / 2));
  for (const i of order) {
    const u = (i / (strips - 1)) * 2 - 1;
    const aStr = hang + u * .24 * fan, topW = 20, botW = 30, len = 200 - Math.abs(u) * 28;
    const x0 = u * 56, base = [waist[0] + x0 * rt[0], waist[1] + x0 * rt[1]];
    const L = xf([[-topW, 0], [-botW, len * .5], [-botW - 2, len - 22], [0, len + 6], [botW + 2, len - 22], [botW, len * .5], [topW, 0]], base[0], base[1], -aStr);
    const col = i % 2 ? PAL.indigo : PAL.cinnabar;
    cel(ctx, spl(L, true, 5, .15), col, { lw: 3.8, seed: seed + 500 + i, mott: .5, pool: .25 });
    const mid = xf(spl([[0, 12], [0, len * .5], [0, len - 20]], false, 5), base[0], base[1], -aStr);
    ink(ctx, mid, { w: 4, col: PAL.gold, seed: seed + 520 + i, taper: [.05, .1], minw: .7 });
    // scalloped gold hem pattern
    const hem = xf(arc(0, len - 40, botW * .6, 14, 0, Math.PI, 3), base[0], base[1], -aStr);
    ink(ctx, hem, { w: 2.4, col: PAL.goldLt, seed: seed + 540 + i, taper: [.1, .1], minw: .6 });
  }

  // 4. torso coat
  const T = pts => xf(pts, hip[0], hip[1], lean);
  const coatL = [[-82, -214], [-74, -170], [-60, -100], [-54, -38], [-64, 16]], coatR = coatL.map(p => [-p[0], p[1]]).reverse();
  const coat = cat(spl(coatL, false, 5), [[-40, 22], [0, 28], [40, 22]], spl(coatR, false, 5), [[28, -232], [0, -220], [-28, -232]]);
  const C = T(coat);
  cel(ctx, C, PAL.cinnabar, { lw: 5.2, seed: seed + 600, mott: .55, pool: .3 });
  ctx.save(); trace(ctx, C); ctx.clip();
  // fish-scale armour pattern (gold)
  for (let row = 0; row < 9; row++) for (let col = -4; col <= 4; col++) {
    const x = col * 25 + (row % 2) * 12.5, y = -196 + row * 24, ar = xf(arc(x, y, 12.5, 12, 0, Math.PI, 3), hip[0], hip[1], lean);
    ink(ctx, ar, { w: 2.6, col: PAL.gold, seed: seed + 610 + row * 9 + col, taper: [.1, .1], minw: .6, alpha: .95 });
    if (row % 2 === 0) { const d = xf(arc(x, y - 1, 5, 4.5, 0, Math.PI, 3), hip[0], hip[1], lean); ink(ctx, d, { w: 1.6, col: PAL.goldLt, seed: seed + 710 + row * 9 + col, taper: [.1, .1], minw: .6, alpha: .8 }); }
  }
  // lower coat darkens (shadow on the shade side), flat
  flat(ctx, T([[-70, -20], [70, -20], [74, 40], [-74, 40]]), 'rgba(110,20,16,.28)');
  ctx.restore();
  // belt: gold band with jade disc and ribbons
  const belt = T([[-60, -28], [60, -28], [62, -2], [-62, -2]]);
  cel(ctx, belt, PAL.gold, { lw: 4, seed: seed + 640, mott: .3, sheen: true, line: PAL.ink });
  const jade = T(arc(0, -15, 17, 15, 0, 6.3, 3).slice(0, -1)); cel(ctx, jade, PAL.malaLt, { lw: 3, seed: seed + 641, mott: .15, pool: .35, line: PAL.ink });
  ink(ctx, T(arc(0, -15, 8, 7, 0, 6.3, 3)), { w: 1.8, col: PAL.malaDk, seed: seed + 642, taper: [.05, .05], minw: .8 });
  for (const s of [-1, 1]) { const rb = T(spl([[s * 24, -4], [s * 36, 20], [s * 30, 50], [s * 42, 74]], false, 5)); ink(ctx, rb, { w: 7, col: PAL.white, seed: seed + 650 + s, taper: [.05, .1], minw: .8 }); ink(ctx, rb, { w: 1.8, col: PAL.azurite, seed: seed + 652 + s, taper: [.1, .1], minw: .8 }); }

  const backSide = p.armBack === 'R' ? 1 : -1, frontSide = -backSide;
  const gB = armGeom(backSide, backSide > 0 ? p.armR : p.armL), gF = armGeom(frontSide, frontSide > 0 ? p.armR : p.armL);
  armDraw(gB, backSide); armDraw(gF, frontSide);

  // 5. cloud collar (yunjian): one scalloped ruyi collar with concentric embroidered echoes
  const cc = add(chest, up, -6);
  const CT = pts => xf(pts, cc[0], cc[1], lean);
  const lobes = [[-92, 12, 28], [92, 12, 28], [-74, 44, 30], [74, 44, 30], [-40, 66, 31], [40, 66, 31], [0, 76, 33]];
  const base = CT(spl([[-86, -2], [-44, -24], [0, -28], [44, -24], [86, -2], [74, 50], [0, 74], [-74, 50]], true, 5));
  cel(ctx, base, PAL.azurite, { lw: 4.4, seed: seed + 660, mott: .5 });
  const order2 = lobes.map((l, i) => i).sort((a, b) => lobes[a][1] - lobes[b][1]);
  for (const i of order2) {
    const [lx, ly, lr] = lobes[i];
    const l = CT(arc(lx, ly, lr, lr * .86, 0, 6.3, 4).slice(0, -1));
    cel(ctx, l, PAL.azurite, { lw: 3.8, seed: seed + 670 + i, mott: .45, pool: .25, line: PAL.indigo });
    ink(ctx, CT(arc(lx, ly, lr * .74, lr * .62, 0, 6.3, 4)), { w: 2.4, col: PAL.goldLt, seed: seed + 680 + i, taper: [.04, .04], minw: .8 });
    ink(ctx, CT(arc(lx, ly, lr * .48, lr * .4, 0, 6.3, 4)), { w: 2, col: PAL.white, seed: seed + 690 + i, taper: [.04, .04], minw: .8, alpha: .9 });
    const dot = CT([[lx, ly]])[0]; ctx.fillStyle = PAL.gold; ctx.beginPath(); ctx.arc(dot[0], dot[1], 3.4, 0, 7); ctx.fill();
  }
  // neckline gold piping and a pearl at the front
  ink(ctx, CT(spl([[-30, -14], [0, -4], [30, -14]], false, 3)), { w: 4, col: PAL.gold, seed: seed + 701, taper: [.1, .1], minw: .7 });
  // fringe under the collar
  for (let i = -6; i <= 6; i++) { const x = i * 12, y = 84 - Math.abs(i) * 3.4 + (i % 2) * 3; ink(ctx, CT([[x, y], [x + 1, y + 24]]), { w: 2.6, col: i % 2 ? PAL.gold : PAL.white, seed: seed + 710 + i, taper: [.05, .5], minw: .3 }); }
  // neck
  const neck = capsule(add(chest, up, 4), add(chest, up, 34), 14, 12); cel(ctx, neck, '#ecd0b4', { lw: 3.4, seed: seed + 720, mott: .2, pool: .1, line: PAL.inkRed });

  // 7. head
  ctx.save(); ctx.translate(headC[0], headC[1]); ctx.rotate(lean + (p.headTilt ?? 0)); ctx.scale(1.24, 1.24); ctx.translate(0, 4);
  drawHead(ctx, { seed: seed + 1000, sway: p.sway ?? 0, look: p.look ?? 0, mouth: p.mouth ?? 0, brow: p.brow ?? 0, blink: p.blink ?? 0, plume: p.plume ?? 1 });
  ctx.restore();
  // 8. water sleeves, hands, weapon (in front of everything)
  for (const [g, side] of [[gB, backSide], [gF, frontSide]]) { const a = g.a; if (a.ws) waterSleeve(ctx, g.wr, a.ws.dir, a.ws.len, a.ws.amp, seed + 400 + side * 3, a.ws.flip ?? 1); }
  if (p.weapon) drawSpear(ctx, gF.wr, p.weapon, seed + 900);
  hand(ctx, gB.wr, Math.PI / 2 - gB.a.el, gB.a.hand || 'fist', seed + 410);
  hand(ctx, gF.wr, Math.PI / 2 - gF.a.el, gF.a.hand || 'fist', seed + 810);
  ctx.restore();
  return { headC, chest, shR, shL, wrF: gF.wr, wrB: gB.wr };
}

// ---------- spear ----------
function drawSpear(ctx, hand, w, seed) {
  // w = {ang (shaft angle from "down"), len, grip (distance from butt to the hand)}
  const ang = w.ang, d = D(ang), len = w.len ?? 620, grip = w.grip ?? 200;
  const butt = add(hand, d, -grip), tip = add(hand, d, len - grip);
  const nrm = [Math.cos(ang), -Math.sin(ang)];
  // shaft: lacquered wood, ochre with dark bands
  const shaft = capsule(butt, add(tip, d, -70), 6.5, 6);
  cel(ctx, shaft, '#8a3a22', { lw: 3.6, seed, mott: .5, pool: .3, line: PAL.ink });
  for (let k = 1; k < 7; k++) { const q = add(butt, d, k * (len - 70) / 7); ink(ctx, [add(q, nrm, -7), add(q, nrm, 7)], { w: 2.4, col: PAL.gold, seed: seed + k, taper: [.2, .2], minw: .5, alpha: .9 }); }
  // butt spike
  cel(ctx, xf([[-6, 0], [6, 0], [0, -26]], butt[0], butt[1], -ang), PAL.gold, { lw: 2.6, seed: seed + 20, mott: .2, sheen: true });
  // red tassel (a burst of hair behind the blade)
  const tb = add(tip, d, -74);
  for (let k = 0; k < 46; k++) {
    const r = mulberry(seed + k * 7)(), a = ang + Math.PI + (r - .5) * 1.5, l = 46 + (k % 7) * 9, hang = .5;
    const p0 = tb, p1 = [tb[0] + Math.sin(a) * l * .6, tb[1] + Math.cos(a) * l * .6 + 6], p2 = [tb[0] + Math.sin(a) * l + 8 * (r - .5), tb[1] + Math.cos(a) * l * .9 + 30 * hang];
    ink(ctx, spl([p0, p1, p2], false, 4), { w: 3.2, col: k % 3 ? PAL.cinnabar : PAL.vermilion, seed: seed + 30 + k, taper: [.05, .7], minw: .08, alpha: .95 });
  }
  cel(ctx, arc(tb[0], tb[1], 9, 9, 0, 6.3, 3).slice(0, -1), PAL.gold, { lw: 2.6, seed: seed + 80, mott: .2, sheen: true });
  // blade: leaf shape, cool steel with a ridge
  const B = xf(spl([[0, 0], [-15, 32], [-12, 80], [0, 124], [12, 80], [15, 32]], true, 4, .45), tb[0], tb[1], -ang);
  // note: local +y = along the shaft toward the tip
  const Bl = B.map(p => p);
  cel(ctx, Bl, '#bcc8d3', { lw: 3.6, seed: seed + 90, mott: .35, pool: .2, line: PAL.ink });
  const half = xf(spl([[0, 0], [15, 32], [12, 80], [0, 124]], false, 4, .45).concat(spl([[0, 124], [0, 0]], false, 4)), tb[0], tb[1], -ang);
  flat(ctx, half, 'rgba(70,90,110,.35)');
  ink(ctx, xf([[0, 4], [0, 112]], tb[0], tb[1], -ang), { w: 2, col: PAL.inkBlue, seed: seed + 91, taper: [.1, .3], minw: .3 });
}
