// spirit.js — the stone spirit as a bust rising from a rock: armour body, two arms, a boulder mace, and the painted head.
import { lerp, clamp, mulberry } from '/core/lib.js';
import { PAL, shade, mix, spl, arc, cat, rev, trace, ink, cel, flat, tube, bbox } from './brush.js';
import { drawStoneSpirit } from './facepaint.js';

const D = a => [Math.sin(a), Math.cos(a)];
const add = (p, q, k = 1) => [p[0] + q[0] * k, p[1] + q[1] * k];
const SHW = 215, SHY = 300;   // shoulder half-width and height below the face centre

export const SPIRIT_REST = {
  dx: 0, dy: 0, tilt: 0, mouth: 0, open: 1, look: 0,
  armA: { sh: -.55, el: -.2 },            // weapon arm (screen-left, toward the hero)
  armB: { sh: .5, el: .25 },
  mace: { ang: -2.7 },                      // shaft angle from down, + toward screen-right
};

export function spiritPoints(p) {
  const shA = [-SHW, SHY], elA = add(shA, D(p.armA.sh), 200), wrA = add(elA, D(p.armA.el), 180);
  const m = p.mace, grip = 170, len = 640, head = add(wrA, D(m.ang), len - grip);
  return { shA, elA, wrA, head, butt: add(wrA, D(m.ang), -grip) };
}

function arm(ctx, sh, el, wr, seed, front) {
  cel(ctx, tube([sh, el, wr], [[0, 52], [.5, 44], [1, 34]], .5), PAL.azurite, { lw: 5, seed, mott: .6, pool: .3, line: PAL.indigo });
  const dir = [wr[0] - el[0], wr[1] - el[1]], l = Math.hypot(...dir) || 1, u = [dir[0] / l, dir[1] / l], n = [-u[1], u[0]];
  // gold bracer + stone cuff
  cel(ctx, tube([add(wr, u, -52), add(wr, u, -8)], [[0, 38], [1, 36]]), PAL.gold, { lw: 4, seed: seed + 2, mott: .3, sheen: true });
  for (let k = 0; k < 3; k++) { const q = add(wr, u, -44 + k * 14); ink(ctx, [add(q, n, -36), add(q, n, 36)], { w: 2.4, col: PAL.goldDk, seed: seed + 4 + k, taper: [.2, .2], minw: .5 }); }
  // fist
  const c = add(wr, u, 30);
  cel(ctx, spl([add(c, n, -36), add(add(c, n, -42), u, 22), add(add(c, n, 0), u, 44), add(add(c, n, 42), u, 22), add(c, n, 36), add(add(c, n, 0), u, -20)], true, 4, .5), shade(PAL.malachite, .95), { lw: 4.4, seed: seed + 9, mott: .5, line: PAL.ink });
  for (let k = -1; k <= 1; k++) ink(ctx, [add(add(c, n, k * 18), u, 4), add(add(c, n, k * 18), u, 38)], { w: 2.2, col: PAL.malaDk, seed: seed + 12 + k, taper: [.2, .3], minw: .3 });
}

function mace(ctx, wr, ang, seed) {
  const d = D(ang), butt = add(wr, d, -170), tipBase = add(wr, d, 360), n = [Math.cos(ang), -Math.sin(ang)];
  cel(ctx, tube([butt, tipBase], [[0, 11], [1, 11]]), '#7a3b24', { lw: 4, seed, mott: .5, pool: .3, line: PAL.ink });
  for (let k = 1; k < 7; k++) { const q = add(butt, d, k * 75); ink(ctx, [add(q, n, -11), add(q, n, 11)], { w: 3, col: PAL.gold, seed: seed + k, taper: [.2, .2], minw: .5 }); }
  // boulder head: faceted rock, moss tufts, gold bands
  const hc = add(tipBase, d, 78), r = mulberry(seed);
  const pts = []; for (let i = 0; i < 11; i++) { const a = i / 11 * 6.283, rr = 86 * (.82 + r() * .3); pts.push([hc[0] + Math.cos(a) * rr, hc[1] + Math.sin(a) * rr * .92]); }
  const rock = spl(pts, true, 6, .22);
  cel(ctx, rock, '#6f7488', { lw: 5, seed: seed + 20, mott: .8, pool: .3, line: PAL.ink });
  ctx.save(); trace(ctx, rock); ctx.clip();
  flat(ctx, [[hc[0] - 100, hc[1] + 6], [hc[0] - 10, hc[1] - 30], [hc[0] + 100, hc[1] + 40], [hc[0] + 100, hc[1] + 120], [hc[0] - 100, hc[1] + 120]], 'rgba(20,24,50,.32)');
  flat(ctx, [[hc[0] - 100, hc[1] - 100], [hc[0] - 5, hc[1] - 100], [hc[0] - 30, hc[1] - 20], [hc[0] - 100, hc[1] + 10]], 'rgba(255,245,210,.2)');
  for (let k = 0; k < 6; k++) ink(ctx, [[hc[0] - 60 + k * 22, hc[1] - 50 + (k % 2) * 30], [hc[0] - 46 + k * 22, hc[1] + 20 + (k % 3) * 22]], { w: 2.4, col: PAL.ink, seed: seed + 30 + k, taper: [.2, .6], minw: .2, alpha: .6, dry: .4 });
  ctx.restore();
  // gold band where the shaft enters
  cel(ctx, spl([add(add(tipBase, n, -22), d, 4), add(add(tipBase, n, 22), d, 4), add(add(tipBase, n, 20), d, -14), add(add(tipBase, n, -20), d, -14)], true, 4, .2), PAL.gold, { lw: 3, seed: seed + 40, mott: .2, sheen: true });
  for (let k = -2; k <= 2; k++) ink(ctx, [add(add(hc, n, k * 14), d, 70), add(add(hc, n, k * 18), d, 104)], { w: 7, col: PAL.malaLt, seed: seed + 50 + k, taper: [.1, .8], minw: .1 });
  return hc;
}

export function drawSpirit(ctx, p = SPIRIT_REST, o = {}) {
  const seed = o.seed ?? 21, P = { ...SPIRIT_REST, ...p };
  const pt = spiritPoints(P);
  ctx.save(); ctx.translate(P.dx, P.dy);
  // body: armour with strata lines
  const body = spl([[-SHW - 40, SHY - 30], [-SHW + 20, SHY - 70], [0, SHY - 80], [SHW - 20, SHY - 70], [SHW + 40, SHY - 30], [SHW + 110, 900], [-SHW - 110, 900]], true, 6, .3);
  cel(ctx, body, PAL.indigo, { lw: 5.5, seed, mott: .7, pool: .3 });
  ctx.save(); trace(ctx, body); ctx.clip();
  for (let i = 0; i < 11; i++) { const y = SHY + 40 + i * 52; ink(ctx, spl([[-420, y], [-200, y - 12], [0, y + 8], [200, y - 10], [420, y + 4]], false, 6), { w: 3, col: i % 2 ? PAL.goldDk : PAL.azurite, seed: seed + i, taper: [.05, .05], minw: .7, alpha: .85, dry: .15 }); }
  ctx.restore();
  // pauldrons: faceted rock with moss
  for (const s of [-1, 1]) {
    const c = [s * (SHW + 30), SHY - 20];
    const rk = spl([[c[0] - 110, c[1] + 70], [c[0] - 90, c[1] - 30], [c[0] - 20, c[1] - 90], [c[0] + 60, c[1] - 70], [c[0] + 112, c[1] + 10], [c[0] + 100, c[1] + 70]], true, 5, .25);
    cel(ctx, rk, '#5f6f93', { lw: 5, seed: seed + 60 + s, mott: .8, pool: .3, line: PAL.ink });
    ctx.save(); trace(ctx, rk); ctx.clip(); flat(ctx, [[c[0] + 10, c[1] - 90], [c[0] + 120, c[1] + 10], [c[0] + 120, c[1] + 90], [c[0] - 10, c[1] + 90]], 'rgba(20,24,60,.3)'); ctx.restore();
    for (let k = -2; k <= 2; k++) ink(ctx, [[c[0] + k * 12, c[1] - 60 - Math.abs(k) * 6], [c[0] + k * 17, c[1] - 98 - (2 - Math.abs(k)) * 8]], { w: 6, col: PAL.malaLt, seed: seed + 70 + k, taper: [.1, .8], minw: .1 });
  }
  // back arm, then the head, then the weapon arm and mace in front
  const shB = [SHW, SHY], elB = add(shB, D(P.armB.sh), 200), wrB = add(elB, D(P.armB.el), 180);
  arm(ctx, shB, elB, wrB, seed + 100, false);
  ctx.save(); ctx.rotate(P.tilt);
  drawStoneSpirit(ctx, { seed: 9, mouth: P.mouth, open: P.open, look: P.look });
  ctx.restore();
  mace(ctx, pt.wrA, P.mace.ang, seed + 200);
  arm(ctx, pt.shA, pt.elA, pt.wrA, seed + 300, true);
  ctx.restore();
}

// world-space positions for staging (origin = where the face centre lands, scale = bust scale)
export function spiritWorld(p, origin, scale) {
  const P = { ...SPIRIT_REST, ...p }, pt = spiritPoints(P), f = v => [origin[0] + (v[0] + P.dx) * scale, origin[1] + (v[1] + P.dy) * scale];
  return { wrA: f(pt.wrA), head: f(pt.head), butt: f(pt.butt) };
}
