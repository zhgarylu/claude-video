// facepaint.js — jingju-style painted faces (hualian) generated from a spec; plus the original "stone spirit" character.
// Pattern grammar: the face is a base colour; paint goes on in mirrored pairs (brow wings, eye frames, nose wings,
// cheek swirls) around one or two centre marks (forehead crest, nose bridge). `spec` varies widths, notches and curls.
import { mulberry, lerp, clamp, ss } from '/core/lib.js';
import { PAL, shade, mix, spl, arc, cat, line, rev, trace, ink, cel, flat, tube, mirrorX, capsule } from './brush.js';

const R = (n, seed) => mulberry(seed * 77 | 0);
const mir = pts => mirrorX(pts).reverse();

// draw fn(s) once for each side (s = +1 right, -1 left); coordinates are for the right side
function sym(ctx, fn) { for (const s of [1, -1]) { ctx.save(); ctx.scale(s, 1); fn(s); ctx.restore(); } }

function spiral(cx, cy, r0, turns, dir = 1, a0 = 0, n = 40) {
  const o = []; for (let i = 0; i <= n; i++) { const u = i / n, a = a0 + dir * u * Math.PI * 2 * turns, r = r0 * (1 - u * .86); o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o;
}
function jag(p0, p1, n, amp, seed) {
  const r = mulberry(seed), o = [p0], dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
  for (let i = 1; i < n; i++) { const t = i / n, a = (r() - .5) * 2 * amp; o.push([p0[0] + dx * t + nx * a, p0[1] + dy * t + ny * a]); }
  o.push(p1); return o;
}

export const FACE_DEFAULT = {
  base: PAL.malachite, white: PAL.white, gold: PAL.gold, ink: PAL.ink, red: PAL.cinnabar,
  wingLen: 1, notches: 3, crest: 'peaks', cheek: 'spiral', seed: 4, eye: 'round', brow: 1,
};

export function faceOutline() {
  const half = [[0, -158], [92, -154], [160, -112], [182, -22], [168, 70], [124, 150], [64, 204], [0, 218]];
  return cat(spl(half, false, 5, .5), spl(rev(half.map(p => [-p[0], p[1]])), false, 5, .5).slice(1));
}

export function facePaint(ctx, spec = {}) {
  const sp = { ...FACE_DEFAULT, ...spec }, seed = sp.seed, I = sp.ink;
  const out = faceOutline();
  // ---- ground colour
  cel(ctx, out, sp.base, { lw: 6, seed, mott: .55, pool: .3, line: PAL.ink, light: .4 });
  ctx.save(); trace(ctx, out); ctx.clip();
  // ---- forehead crest (centre mark)
  const cr = sp.crest === 'flame'
    ? spl([[0, -190], [22, -140], [48, -176], [50, -118], [26, -92], [0, -50], [-26, -92], [-50, -118], [-48, -176], [-22, -140]], true, 4, .4)
    : spl([[0, -178], [20, -132], [46, -158], [58, -104], [34, -84], [16, -72], [0, -40], [-16, -72], [-34, -84], [-58, -104], [-46, -158], [-20, -132]], true, 4, .35);
  cel(ctx, cr, sp.gold, { lw: 4.5, seed: seed + 1, mott: .35, sheen: true, line: PAL.ink });
  ink(ctx, spl([[0, -150], [0, -86]], false, 4), { w: 4, col: shade(sp.gold, .55), seed: seed + 2, taper: [.1, .4], minw: .3 });
  // stone cracks radiating from the crest
  sym(ctx, s => { for (let k = 0; k < 3; k++) ink(ctx, jag([68 + k * 16, -150 + k * 18], [128 + k * 18, -160 + k * 36], 4, 7, seed + 10 + k), { w: 3.4, col: shade(sp.base, .42), seed: seed + 11 + k, taper: [.1, .7], minw: .15 }); });

  // ---- paired features
  sym(ctx, s => {
    const sd = seed + (s > 0 ? 0 : 50);
    // brow wing: a white flame sweeping from the inner brow up and out, with notches, black brow inside
    const L = sp.wingLen, tipX = 150 + 56 * L, tipY = -128 - 66 * L;
    const upper = [[14, -88], [58, -112], [100, -130], [128, -156], [tipX - 18, tipY + 18], [tipX, tipY]];
    for (let k = 0; k < sp.notches; k++) { const u = (k + 1) / (sp.notches + 1); upper.splice(3 + k * 2, 0, [lerp(100, tipX - 24, u) + 6, lerp(-132, tipY + 22, u) - 14], [lerp(100, tipX - 24, u) + 16, lerp(-132, tipY + 22, u) + 4]); }
    const lower = [[tipX - 4, tipY + 12], [150, -110], [116, -82], [70, -62], [30, -62], [14, -72]];
    const wing = spl(cat(upper, lower), true, 4, .38);
    cel(ctx, wing, sp.white, { lw: 4.4, seed: sd + 3, mott: .35, pool: .2, line: PAL.ink });
    // brow stroke
    ink(ctx, spl([[20, -78], [66, -92], [112, -118], [tipX - 14, tipY + 16]], false, 4), { w: 24 * sp.brow, col: I, seed: sd + 4, taper: [.04, .8], minw: .05, press: .12 });
    // gold dots along the wing
    for (let k = 0; k < 4; k++) { const u = (k + 1) / 5, p = [lerp(40, tipX - 30, u), lerp(-70, tipY + 28, u) + 22]; ctx.fillStyle = sp.red; ctx.beginPath(); ctx.arc(p[0], p[1], 5 - k * .5, 0, 7); ctx.fill(); }

    // eye frame: heavy black almond sweeping up at the outer corner
    const frame = spl([[34, -26], [70, -54], [120, -66], [174, -92], [150, -38], [110, -6], [64, 0], [38, -6]], true, 3, .4);
    cel(ctx, frame, I, { lw: 2, seed: sd + 5, mott: .1, pool: 0, line: I });
    const eye = spl([[50, -22], [80, -42], [120, -50], [146, -58], [128, -28], [96, -12], [62, -10]], true, 3, .4);
    const op = sp.open ?? 1;
    if (op > .05) {
      flat(ctx, eye, PAL.white);
      ctx.save(); trace(ctx, eye); ctx.clip();
      ctx.fillStyle = sp.gold; ctx.beginPath(); ctx.arc(98 + (sp.look || 0) * 9, -30, 19, 0, 7); ctx.fill();
      ctx.fillStyle = I; ctx.beginPath(); ctx.arc(98 + (sp.look || 0) * 9, -30, 10, 0, 7); ctx.fill();
      ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.arc(103 + (sp.look || 0) * 9, -35, 4, 0, 7); ctx.fill();
      // lids close from above and below
      const cl = 1 - op;
      if (cl > 0) { const yu = lerp(-64, -30, cl), yl = lerp(-6, -30, cl); ctx.fillStyle = I; ctx.fillRect(30, -100, 150, yu + 100); ctx.fillRect(30, yl, 150, 60); }
      ctx.restore();
    } else {
      ink(ctx, spl([[50, -20], [86, -16], [122, -26], [146, -50]], false, 3), { w: 9, col: I, seed: sd + 5, taper: [.05, .1], minw: .5 });
    }
    ink(ctx, spl([[48, -22], [80, -44], [120, -52], [148, -60]], false, 3), { w: 5, col: I, seed: sd + 6, taper: [.05, .3], minw: .3 });

    // nose wing: white curled shape with ink spiral
    const nose = spl([[18, -6], [52, -22], [96, -8], [112, 34], [92, 74], [56, 84], [30, 66], [18, 36]], true, 4, .45);
    cel(ctx, nose, sp.white, { lw: 4.4, seed: sd + 7, mott: .3, pool: .2 });
    ink(ctx, spiral(70, 36, 30, 1.4, s, .6), { w: 4.4, col: I, seed: sd + 8, taper: [.05, .5], minw: .2 });
    ink(ctx, spl([[40, -6], [74, -14], [96, 2]], false, 3), { w: 3.4, col: I, seed: sd + 9, taper: [.2, .4], minw: .2 });

    // cheek paint
    if (sp.cheek === 'spiral') {
      ink(ctx, spiral(132, 96, 50, 2.0, s, 1.2), { w: 9, col: sp.gold, seed: sd + 12, taper: [.04, .4], minw: .2 });
      ink(ctx, spiral(132, 96, 58, 2.0, s, 1.2).slice(0, 28), { w: 2.4, col: I, seed: sd + 13, taper: [.1, .5], minw: .2, alpha: .85 });
      for (let k = 0; k < 3; k++) ink(ctx, jag([128 + k * 14, 8 + k * 10], [170, 22 + k * 22], 3, 6, sd + 60 + k), { w: 3.4, col: shade(sp.base, .42), seed: sd + 61 + k, taper: [.1, .7], minw: .15 });
    } else {
      for (let k = 0; k < 4; k++) ink(ctx, jag([100 + k * 14, 70 + k * 20], [150 + k * 6, 110 + k * 26], 5, 9, sd + 20 + k), { w: 4, col: shade(sp.base, .4), seed: sd + 21 + k, taper: [.1, .7], minw: .15 });
    }
  });
  // nose bridge (centre mark): white blade from the brows down to the nose tip
  const bridge = spl([[-14, -86], [14, -86], [18, -10], [26, 30], [0, 54], [-26, 30], [-18, -10]], true, 4, .4);
  cel(ctx, bridge, sp.white, { lw: 4.4, seed: seed + 30, mott: .3, pool: .2 });
  ink(ctx, spl([[0, -80], [0, 20]], false, 4), { w: 3, col: shade(sp.white, .6), seed: seed + 31, taper: [.1, .5], minw: .3, alpha: .8 });
  for (const sx of [-1, 1]) { ctx.fillStyle = I; ctx.beginPath(); ctx.ellipse(sx * 11, 34, 6, 8, 0, 0, 7); ctx.fill(); }
  ctx.restore();
  // re-trace the face edge on top so paint stays inside it
  ink(ctx, out, { w: 6 * .82, col: PAL.ink, seed: seed + 40, taper: [.03, .03], minw: .6, closed: true });
}

// ---------- the stone spirit: face + crown of peaks + mane + moustache + beard ----------
function lock(ctx, base, len, bend, wid, seed, col, lineCol) {
  // a flame-shaped lock: teardrop with an S-curve spine
  const r = mulberry(seed), sp = [];
  const n = 18; for (let i = 0; i <= n; i++) { const u = i / n; sp.push([base[0] + Math.sin(u * 3.1 + seed) * bend * u + (u * u) * bend * 1.4, base[1] + u * len]); }
  const body = tube(sp, [[0, wid * .35], [.3, wid], [.7, wid * .6], [1, 1.5]], .5);
  cel(ctx, body, col, { lw: 3, seed, mott: .35, pool: .15, line: lineCol });
  ink(ctx, sp.slice(2, n - 2), { w: 1.8, col: PAL.paperDk, seed: seed + 1, taper: [.2, .5], minw: .2, alpha: .8 });
}

export function drawStoneSpirit(ctx, o = {}) {
  const { seed = 9, mouth = 0, open = 1, look = 0, base = PAL.malachite } = o;
  // wild mane behind the head: two layers of black flame locks, each with a wavy spine and a pointed tip
  const r = mulberry(seed);
  for (const [cnt, lenK, col, hl] of [[26, 1.15, '#1c1a26', '#4a4560'], [22, .78, '#2a2536', '#6a6488']]) for (let i = 0; i < cnt; i++) {
    const u = i / (cnt - 1), a = Math.PI * (.84 + u * 1.32) + (r() - .5) * .08, len = (150 + r() * 170) * lenK, bx = Math.cos(a) * 150, by = Math.sin(a) * 160 - 10, curl = (r() - .5) * 1.6, ph = r() * 6, amp = 16 + r() * 22;
    const sp = []; for (let k = 0; k <= 16; k++) { const t = k / 16, aa = a + curl * t * .5, px = Math.cos(aa), py = Math.sin(aa); const off = Math.sin(t * 7 + ph) * amp * t; sp.push([bx + px * len * t - py * off, by + py * len * t + px * off]); }
    cel(ctx, tube(sp, [[0, 20], [.25, 30], [.6, 17], [1, .8]], .5), col, { lw: 2.4, seed: seed + i + cnt, mott: .3, pool: .1, line: PAL.ink });
    ink(ctx, sp.slice(2, 12), { w: 2, col: hl, seed: seed + 50 + i, taper: [.2, .5], minw: .15, alpha: .8 });
  }
  // beard: layered white locks with S-curve waves, back row long, front row short
  for (const [cnt, lenK, wk] of [[15, 1.0, 1], [13, .72, .85]]) for (let i = 0; i < cnt; i++) {
    const u = i / (cnt - 1) * 2 - 1, bx = u * 150, by = 120 + Math.abs(u) * 40, len = (300 + (1 - Math.abs(u)) * 190 + (i % 3) * 30) * lenK, ph = i * 1.7, amp = 22 + (i % 4) * 7;
    const sp = []; for (let k = 0; k <= 16; k++) { const t = k / 16; sp.push([bx + u * 54 * t + Math.sin(t * 5 + ph) * amp * t, by + len * t]); }
    cel(ctx, tube(sp, [[0, 14], [.2, 36 * wk], [.6, 28 * wk], [1, 1]], .5), i % 2 ? PAL.cream : PAL.white, { lw: 2.6, seed: seed + 100 + i + cnt, mott: .35, pool: .12, line: PAL.inkRed });
    for (let k = -1; k <= 1; k++) ink(ctx, sp.slice(3, 14).map(q => [q[0] + k * 8, q[1]]), { w: 1.4, col: PAL.paperDk, seed: seed + 140 + i * 3 + k, taper: [.2, .5], minw: .2, alpha: .75, dry: .3 });
  }
  // crown of stone peaks: angular faceted crags (light facet + dark facet), moss tufts
  const peaks = [[-205, -124, 120, 110], [-120, -140, 140, 160], [0, -150, 200, 215], [120, -140, 140, 160], [205, -124, 120, 110]];
  peaks.forEach(([px, py, w, h], idx) => {
    const rr = mulberry(seed + 200 + idx), j = () => (rr() - .5) * w * .12;
    const apex = [px + j(), py - h];
    const L = [[px - w / 2, py + 30], [px - w * .46 + j(), py - h * .3], [px - w * .24 + j(), py - h * .55], [px - w * .2, py - h * .78], apex];
    const Rg = [apex, [px + w * .16, py - h * .6 + j()], [px + w * .3 + j(), py - h * .46], [px + w * .42, py - h * .18], [px + w / 2, py + 30]];
    const sil = cat(L, Rg);
    const base = mix(PAL.azurite, PAL.indigo, .15 + Math.abs(px) / 800);
    cel(ctx, sil, base, { lw: 4.4, seed: seed + 200 + idx, mott: .7, pool: .25, line: PAL.ink });
    ctx.save(); trace(ctx, sil); ctx.clip();
    flat(ctx, [apex, [px - w * .1, py - h * .5], [px - w * .05, py + 40], [px - w / 2 - 4, py + 40], [px - w * .46, py - h * .3], L[3]], shade(base, 1.28));     // sunlit facet
    flat(ctx, [apex, [px + w * .02, py - h * .4], [px + w * .22, py + 40], [px + w / 2 + 4, py + 40], Rg[3], Rg[2], Rg[1]], shade(base, .72));   // shaded facet
    for (let k = 0; k < 5; k++) ink(ctx, jag([px - w * .3 + k * w * .12, py - h * .12], [px - w * .24 + k * w * .12, py - h * (.35 + .08 * k)], 3, 4, seed + 205 + k + idx), { w: 2.2, col: PAL.azuLt, seed: seed + 210 + k + idx, taper: [.2, .6], minw: .2, alpha: .8 });
    ctx.restore();
    for (let k = -2; k <= 2; k++) ink(ctx, [[apex[0] + k * 5, apex[1] + 22], [apex[0] + k * 10, apex[1] - 14 - (2 - Math.abs(k)) * 4]], { w: 5.5, col: PAL.malaLt, seed: seed + 230 + k + idx, taper: [.1, .8], minw: .1 });
  });
  // pom-poms
  for (const s of [-1, 1]) {
    const cx = s * 238, cy = -140;
    cel(ctx, arc(cx, cy, 30, 30, 0, 6.3, 3).slice(0, -1), PAL.cinnabar, { lw: 3, seed: seed + 320 + s, mott: .2, pool: 0, line: PAL.inkRed });
    for (let k = 0; k < 24; k++) { const a = k / 24 * 6.28; ink(ctx, [[cx + Math.cos(a) * 10, cy + Math.sin(a) * 10], [cx + Math.cos(a) * 34, cy + Math.sin(a) * 34]], { w: 2.4, col: PAL.rouge, seed: seed + 330 + k, taper: [.1, .6], minw: .1, alpha: .8 }); }
  }
  // the face
  facePaint(ctx, { seed: seed + 400, base, wingLen: 1, notches: 3, cheek: 'spiral', open, look });
  // crown band over the brow (drawn after the face so the forehead sits under it)
  const band = spl([[-196, -126], [-130, -166], [0, -190], [130, -166], [196, -126], [186, -98], [130, -126], [0, -146], [-130, -126], [-186, -98]], true, 5, .45);
  cel(ctx, band, PAL.gold, { lw: 4.5, seed: seed + 300, mott: .4, sheen: true, line: PAL.ink });
  for (let i = -5; i <= 5; i++) { const u = i / 5, x = u * 150, y = -168 + u * u * 38; const g = [[x, y - 13], [x + 11, y], [x, y + 13], [x - 11, y]]; flat(ctx, g, i % 2 ? PAL.cinnabar : PAL.azurite); ink(ctx, g.concat([g[0]]), { w: 2, col: PAL.ink, seed: seed + 310 + i, taper: [.05, .05], minw: .8 }); }
  // moustache: white sweeping ribbons from under the nose
  for (const s of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      const sp = [[s * 14, 84 + k * 12], [s * 70, 104 + k * 18], [s * 140, 118 + k * 16], [s * 206, 96 + k * 10], [s * 244, 56 + k * 8], [s * 246, 22 + k * 8], [s * 226, 6 + k * 8], [s * 212, 22 + k * 8], [s * 222, 34 + k * 8]];
      const t = tube(sp, [[0, 6], [.5, 12 - k * 2.5], [.9, 6], [1, 1.5]], .5);
      cel(ctx, t, PAL.cream, { lw: 3, seed: seed + 340 + k + s * 3, mott: .3, pool: .1, line: PAL.inkBlue });
      ink(ctx, spl(sp.slice(1, 6), false, 4), { w: 1.6, col: PAL.paperDk, seed: seed + 345 + k, taper: [.2, .5], minw: .2, alpha: .8 });
    }
  }
  // mouth: wide red lips, white teeth, upward tusks
  const m = mouth;
  const lips = spl([[-96, 120], [-44, 98], [0, 108], [44, 98], [96, 120], [70, 160 + m * 18], [0, 178 + m * 24], [-70, 160 + m * 18]], true, 4, .45);
  cel(ctx, lips, PAL.cinnabar, { lw: 4, seed: seed + 350, mott: .3, pool: .1, line: PAL.ink });
  const teeth = spl([[-62, 128], [0, 120], [62, 128], [52, 150 + m * 12], [0, 158 + m * 16], [-52, 150 + m * 12]], true, 4, .45);
  flat(ctx, teeth, PAL.white);
  for (let i = -3; i <= 3; i++) ink(ctx, [[i * 17, 124], [i * 16, 150 + m * 10]], { w: 1.6, col: PAL.ink, seed: seed + 360 + i, taper: [.1, .1], minw: .6, alpha: .8 });
  for (const s of [-1, 1]) { const tk = spl([[s * 56, 146 + m * 10], [s * 70, 112], [s * 62, 84], [s * 48, 120]], true, 3, .4); cel(ctx, tk, PAL.white, { lw: 3, seed: seed + 370 + s, mott: .2, pool: .1 }); }
}
