// apsara.js: a procedural flying-figure rig (feitian). Forward is +x, the wind comes from the front, ribbons stream backwards.
// Body parts are tapered tubes in halo-shaded flesh with iron-wire contours; scarves are twisting ribbons driven by one wind phase.
import { clamp, lerp, mulberry, TAU } from '/core/lib.js';
import { PAL, mix, halo, wire, limb, tubePoly, catmull, polyPath, ribbon } from './brush.js';
import { petalPts, lotus, flower } from './motifs.js';

const line = PAL.rust;

function hand(ctx, x, y, ang, lw, grip = .4) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  const palm = [[-5, -5.5], [3, -6.5], [8, -4], [8, 4], [3, 6], [-5, 5.5]];
  halo(ctx, catmull(palm, 4, true), PAL.flesh, PAL.fleshD, 3, 3, .25);
  for (let i = 0; i < 4; i++) {
    const a = (i - 1.5) * .26 + grip * (i > 0 ? .5 : 0), len = 11 - Math.abs(i - 1.5) * 1.5;
    const sp = [[7, (i - 1.5) * 3.2], [7 + Math.cos(a) * len * .6, (i - 1.5) * 3.2 + Math.sin(a) * len * .6], [7 + Math.cos(a + grip * .8) * len, (i - 1.5) * 3.2 + Math.sin(a + grip * .8) * len]];
    limb(ctx, sp, [4.4, 3.8, 3], PAL.flesh, PAL.fleshD, line, lw * .8, { halo: 1.4 });
  }
  ctx.restore();
}

function head(ctx, cx, cy, ang, lw, t) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.scale(1.14, 1.14);
  // hair streaming back
  const hair = tubePoly([[-6, -12], [-36, -14 + Math.sin(t * 2) * 2], [-70, 2 + Math.sin(t * 2 + 1) * 5], [-104, -4 + Math.sin(t * 2 + 2) * 8]], [21, 16, 9, 2]);
  halo(ctx, hair.poly, PAL.soot, '#000', 6, 3, .35);
  for (let k = -2; k <= 2; k++) wire(ctx, hair.spine.map((p, i) => [p[0], p[1] + k * 3.2 * (1 - i / hair.spine.length)]), 1.2, '#6a554c', { raw: true });
  // bun
  halo(ctx, catmull([[-14, -26], [-5, -41], [8, -36], [10, -24], [0, -16], [-12, -18]], 6, true), PAL.soot, '#000', 5, 3, .35);
  flower(ctx, -2, -40, 8, PAL.lead, { n: 5, heart: PAL.ochre });
  // face, three-quarter view turned forward: broad brow, round cheeks, small pointed chin
  const face = catmull([[2, -20], [12, -17], [16.5, -7], [16, 3], [12, 11], [6.5, 17.5], [3.5, 19.5], [-3, 15.5], [-9.5, 7], [-12, -5], [-8.5, -15]], 5, true);
  halo(ctx, face, PAL.flesh, PAL.fleshD, 6.5, 4, .25);
  wire(ctx, [...face, face[0], face[1]], lw * .8, line, { raw: true, t0: 0, t1: 0 });
  const patch = (x, y, rx, ry, c, a) => { ctx.fillStyle = c; ctx.globalAlpha = a; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; };
  patch(-4.5, 4.5, 5, 4.2, PAL.cinnabarL, .38); patch(12, 4.5, 3, 3.6, PAL.cinnabarL, .3);                         // rouge
  patch(7, -.5, 2.4, 6.5, '#fff6e0', .85); patch(1, -15, 4.5, 2.5, '#fff6e0', .5); patch(5, 15, 3, 2, '#fff6e0', .6);   // the white patches of the 'small-character' face
  // brows, eyes, nose, mouth
  wire(ctx, [[-10, -9.5], [-4, -14.6], [3.5, -12]], lw * 1.1, PAL.soot, { seed: 2 });
  wire(ctx, [[8, -12], [12, -14.4], [16, -11]], lw * .95, PAL.soot, { seed: 7 });
  wire(ctx, [[-9, -4.6], [-4, -8.4], [3.4, -6]], lw * 1.35, PAL.soot, { seed: 4 });
  wire(ctx, [[-8.2, -4], [-3, -2.6], [3.2, -5.2]], lw * .6, line, {});
  ctx.fillStyle = PAL.soot; ctx.beginPath(); ctx.ellipse(-2.4, -5.2, 2.1, 2.4, 0, 0, TAU); ctx.fill();
  wire(ctx, [[8.2, -6.4], [11.8, -8.2], [15.6, -6.2]], lw * 1.1, PAL.soot, { seed: 9 });
  wire(ctx, [[8.8, -5.6], [12, -4.6], [15.4, -5.8]], lw * .5, line, {});
  ctx.fillStyle = PAL.soot; ctx.beginPath(); ctx.ellipse(12.6, -6, 1.5, 1.7, 0, 0, TAU); ctx.fill();
  wire(ctx, [[7.2, -3], [9.6, 4.4], [7, 6]], lw * .8, line, {});
  ctx.fillStyle = PAL.cinnabar; ctx.beginPath(); ctx.moveTo(.6, 11.6); ctx.quadraticCurveTo(5, 9.6, 9.8, 11.4); ctx.quadraticCurveTo(5.4, 14.6, .6, 11.6); ctx.fill();
  wire(ctx, [[.6, 11.6], [5, 12.2], [9.8, 11.4]], lw * .7, PAL.soot, {});
  ctx.fillStyle = PAL.cinnabar; ctx.beginPath(); ctx.arc(3.6, -15.6, 1.5, 0, TAU); ctx.fill();                       // forehead mark
  halo(ctx, catmull([[-10, -2], [-14.5, -3], [-15.5, 3], [-12, 7], [-9.5, 4]], 4, true), PAL.flesh, PAL.fleshD, 2, 3, .3); // ear
  // crown band and earring
  const crown = tubePoly([[-11, -15], [0, -22], [12.5, -18]], [5, 5.5, 4]); halo(ctx, crown.poly, PAL.ochre, PAL.ochreD, 2, 3, .3); wire(ctx, crown.L, lw * .7, PAL.soot, { raw: true });
  [[-7, -18.5], [1, -21.5], [9, -19]].forEach((p, i) => { ctx.fillStyle = i === 1 ? PAL.azuriteL : PAL.cinnabarL; ctx.beginPath(); ctx.arc(p[0], p[1], 2.1, 0, TAU); ctx.fill(); });
  ctx.fillStyle = PAL.ochreL; ctx.beginPath(); ctx.arc(-13.5, 9, 2.5, 0, TAU); ctx.fill(); wire(ctx, [[-13.5, 11], [-14.5, 19]], lw * .7, PAL.ochreD, {});
  ctx.restore();
}

function ripple(p0, L, ang, amp, k, ph, curl) {
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  return (s, tt) => {
    const off = amp * Math.pow(s, .8) * Math.sin(TAU * (k * s) - 2.6 * tt + ph) + curl * s * s * L * .22;
    return [p0[0] + dx * L * s + nx * off, p0[1] + dy * L * s + ny * off];
  };
}

export function drawApsara(ctx, o) {
  const { x, y, s = 1, flip = false, t = 0, seed = 1, hold = 'lotus' } = o;
  const C = Object.assign({ skirt: PAL.azurite, trim: PAL.ochre, bodice: PAL.lead, sash: PAL.cinnabar, ribA: [PAL.malachite, PAL.lead], ribB: [PAL.azuriteL, PAL.ochreL], ribC: [PAL.lead, PAL.cinnabarL] }, o.pal || {});
  const lw = 3.0 / s, ph = seed * 1.7;
  const fl = (k) => Math.sin(t * 2.1 + ph + k);
  ctx.save(); ctx.translate(x, y + Math.sin(t * 1.25 + ph) * 7); ctx.scale(flip ? -s : s, s); ctx.rotate(-.08 + Math.sin(t * 1.1 + ph) * .035);
  const wob = (k, a) => fl(k) * a;
  const ring = (px, py, ang, w) => { ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.fillStyle = PAL.ochre; ctx.fillRect(-3, -w / 2, 6, w); ctx.lineWidth = lw * .55; ctx.strokeStyle = PAL.soot; ctx.strokeRect(-3, -w / 2, 6, w); ctx.restore(); };
  const farHand = [8 + wob(0, 6), -98 + wob(1, 5)];
  // all scarves stream behind the body
  ribbon(ctx, ripple(farHand, 560, Math.PI + .12, 38, 1.7, 0, -.35), { t, hw: s2 => 17 * (1 - .3 * s2), front: C.ribA[0], back: C.ribA[1], tw0: 0, tk: 4.2, lw: lw * 1.1, n: 90 });
  ribbon(ctx, ripple([14, -2], 470, Math.PI - .2, 30, 1.5, 1.4, .5), { t, hw: s2 => 14 * (1 - .35 * s2), front: C.ribC[0], back: C.ribC[1], tw0: 1.2, tk: 3.6, lw: lw * 1.1, n: 80 });
  ribbon(ctx, ripple([48, -26], 520, Math.PI + .02, 44, 1.35, 2.2, -.6), { t, hw: s2 => 18 * (1 - .32 * s2), front: C.ribB[0], back: C.ribB[1], tw0: 2.6, tk: 3.9, lw: lw * 1.1, n: 90 });
  // far arm
  limb(ctx, [[46, -26], [28 + wob(2, 3), -68], farHand], [11, 8.6, 6.6], PAL.flesh, PAL.fleshD, line, lw);
  ring(farHand[0] + 6, farHand[1] + 7, 1.1, 10);
  hand(ctx, farHand[0], farHand[1], -2.6, lw, .5);
  // legs: one swept up behind, one trailing low
  const kA = [-72 + wob(3, 3), 2], fA = [-126 + wob(4, 6), -36 + wob(5, 6)], kB = [-64, 38 + wob(6, 3)], fB = [-124 + wob(7, 5), 52 + wob(8, 5)];
  limb(ctx, [[-8, 6], kA, fA], [21, 12.5, 8], PAL.flesh, PAL.fleshD, line, lw);
  limb(ctx, [[-6, 14], kB, fB], [21, 12.5, 8], PAL.flesh, PAL.fleshD, line, lw);
  [[fA, -2.3], [fB, 2.9]].forEach(([f, a]) => { const sp = [[f[0], f[1]], [f[0] - 12 * Math.cos(a + .6), f[1] - 11 * Math.sin(a + .6)], [f[0] - 22 * Math.cos(a + .9), f[1] - 16 * Math.sin(a + .9)]]; limb(ctx, sp, [8, 6.5, 4], PAL.flesh, PAL.fleshD, line, lw * .8, { halo: 2 }); });
  ring((kA[0] + fA[0]) / 2 - 8, (kA[1] + fA[1]) / 2 - 12, .8, 11); ring((kB[0] + fB[0]) / 2 - 12, (kB[1] + fB[1]) / 2 + 2, 1.5, 11);
  // torso: slim waist, chest forward
  limb(ctx, [[-8, 10], [14, 0], [44, -18], [64, -34]], [30, 22, 27, 13], PAL.flesh, PAL.fleshD, line, lw);
  // trousers-skirt: flares from the waist to the knees, hem streaming
  const hemA = fl(9) * 5, hemB = fl(10) * 7;
  const skirt = catmull([[26, -14], [-2, 28], [-38, 54 + hemB], [-60, 48 + hemB], [-70, 62 + hemB], [-90, 40 + hemB], [-92, 18 + hemA], [-100, -2 + hemA], [-92, -26 + hemA], [-60, -22], [-24, -20], [4, -22]], 5, true);
  // underskirt: a lighter layer peeking past the hem, fluttering out of phase
  const us = skirt.map(p => [14 + (p[0] - 14) * 1.1 + fl(12) * 2, -2 + (p[1] + 2) * 1.14]); halo(ctx, us, mix(C.skirt, PAL.lead, .45), PAL.azuriteD, 6, 3, .3); wire(ctx, [...us, us[0]], lw * .9, PAL.soot, { raw: true, t0: 0, t1: 0 });
  halo(ctx, skirt, C.skirt, PAL.azuriteD, 9, 4, .34);
  ctx.save(); ctx.beginPath(); polyPath(ctx, skirt); ctx.clip();
  for (let i = 0; i < 5; i++) { const u = i / 4; wire(ctx, [[20 - 8 * u, -10 + 30 * u], [-22 - 20 * u, 4 + 38 * u + hemA * u * .5 - 8], [-52 - 40 * u, 22 + 34 * u + hemB * u * .6]], lw * .7, PAL.azuriteD, { seed: i }); }
  ctx.restore();
  wire(ctx, [...skirt, skirt[0]], lw * 1.1, PAL.soot, { raw: true, t0: 0, t1: 0 });
  wire(ctx, catmull([[-38, 54 + hemB], [-60, 48 + hemB], [-70, 62 + hemB], [-90, 40 + hemB], [-92, 18 + hemA], [-100, -2 + hemA], [-92, -26 + hemA]], 5), 6, C.trim, { raw: true, t0: 0, t1: 0 });
  // sash knot
  const bd = tubePoly([[30, -10], [50, -22]], [23, 28]);
  halo(ctx, bd.poly, C.bodice, PAL.leadD, 5, 3, .4); wire(ctx, [...bd.poly, bd.poly[0]], lw, PAL.soot, { raw: true, t0: 0, t1: 0 });
  wire(ctx, [[36, -6], [44, -10], [50, -8]], lw * .8, PAL.cinnabar, {});
  wire(ctx, [[52, -38], [64, -24], [76, -30]], lw * 1.2, PAL.ochre, {}); ctx.fillStyle = PAL.azuriteL; ctx.beginPath(); ctx.arc(64, -22, 3.2, 0, TAU); ctx.fill();
  // head
  head(ctx, 84, -54, -.16 + wob(11, .025), lw, t);
  // near arm and what it holds
  const elbow = [94, -2 + wob(12, 4)], hnd = [136 + wob(13, 3), -30 + wob(14, 4)];
  if (hold === 'pipa') {
    // a four-string lute across the chest: pear body low and back, neck rising forward
    ctx.save(); ctx.translate(70, 8); ctx.rotate(-.78);
    const body = catmull([[-48, 0], [-44, -20], [-16, -30], [8, -18], [10, 0], [8, 18], [-16, 30], [-44, 20]], 5, true);
    halo(ctx, body, PAL.ochre, PAL.ochreD, 8, 4, .3); wire(ctx, [...body, body[0]], lw * 1.2, PAL.soot, { raw: true, t0: 0, t1: 0 });
    ctx.fillStyle = PAL.cinnabarD; ctx.beginPath(); ctx.ellipse(-26, 0, 7, 12, 0, 0, TAU); ctx.fill();
    const nk = tubePoly([[8, 0], [60, 0], [96, 0], [112, -9]], [12, 11, 10, 9]); halo(ctx, nk.poly, PAL.cinnabarD, '#000', 3, 3, .3); wire(ctx, nk.L, lw, PAL.soot, { raw: true }); wire(ctx, nk.R, lw, PAL.soot, { raw: true });
    for (let k = -1.5; k <= 1.5; k++) wire(ctx, [[-30, k * 3], [100, k * 2]], .9 / s * 1.2, PAL.leadD, {});
    ctx.restore();
    limb(ctx, [[50, -22], elbow, [116, -24]], [11, 8.6, 6.6], PAL.flesh, PAL.fleshD, line, lw); hand(ctx, 116, -25, -.6, lw, .7);
  } else {
    limb(ctx, [[50, -22], elbow, hnd], [11, 8.6, 6.6], PAL.flesh, PAL.fleshD, line, lw);
    ring(hnd[0] - 8, hnd[1] + 6, -.6, 10);
    const top = [hnd[0] + 22, hnd[1] - 34];
    wire(ctx, [[hnd[0] - 6, hnd[1] + 16], [hnd[0] + 4, hnd[1] - 2], [top[0] - 4, top[1] + 18]], 4.6, PAL.malachiteD, {});
    ctx.save(); ctx.translate(top[0], top[1]); ctx.scale(1, .8); ctx.rotate(-.35);
    lotus(ctx, 0, 0, 44, { fat: 1.0 }); ctx.restore();
    hand(ctx, hnd[0], hnd[1], -.7, lw, .85);
  }
  // flower petals falling behind
  const r = mulberry(seed * 13 + 5);
  for (let i = 0; i < 9; i++) { const u = (r() * 3 + t * .22) % 1, px = 136 - 70 - u * 420 + r() * 40, py = -30 + 40 + u * 140 * (.6 + r()) + Math.sin(u * 9 + i) * 18, a = u * 6 + i; flower(ctx, px, py, 7 + r() * 3, i % 3 ? PAL.lead : PAL.cinnabarL, { n: 3, rot: a, heart: PAL.ochre }); }
  ctx.restore();
}
