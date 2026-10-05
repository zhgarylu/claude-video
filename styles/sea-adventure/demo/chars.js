// chars.js: five invented crew members drawn by one rubber rig. Proportions are the cast: a tiny captain with a huge head,
// a cook who is mostly stomach, a navigator who is mostly legs, a lookout who is mostly eyes, a shipwright who is mostly beard.
import { clamp, lerp, seg, ss, hash, vnoise } from '/core/lib.js';
import { COL, G, TAU, ell, catmull, quad, xf, path, shape, ring, stroke, tube, capsule, crescent, toneFill, hatchFill, jr, jf, star, sweat } from './ink.js';

const rad = d => d * Math.PI / 180;
export const mix = (a, b, u) => { const o = {}; for (const k in a) o[k] = typeof a[k] === 'number' ? lerp(a[k], b[k] ?? a[k], u) : (u < .5 ? a[k] : (b[k] ?? a[k])); return o; };
// expression parameters (see drawFace)
const E0 = { er: 1, pup: 1, lid: 0, sq: 0, br: 0, bh: 0, bl: 0, mw: .3, mo: 0, mc: .3, tg: 0, th: 0, cheek: 0, sh: 0 };
export const EXPR = {
  neutral: { ...E0 },
  grin: { ...E0, er: 1.05, br: .1, bh: .4, mw: .62, mo: .5, mc: 1, th: 1, tg: .3, cheek: 1 },
  laugh: { ...E0, er: 1, sq: 1, br: .3, bh: .7, mw: .7, mo: 1, mc: 1, th: 1, tg: 1, cheek: 1 },
  shout: { ...E0, er: 1.25, pup: .7, br: -.5, bh: .5, mw: .5, mo: 1.1, mc: .55, th: 1, tg: .8 },
  shock: { ...E0, er: 1.55, pup: .32, br: .35, bh: 1, mw: .2, mo: 1.15, mc: 0, th: 0, tg: .5 },
  panic: { ...E0, er: 1.4, pup: .4, br: .9, bh: .8, mw: .5, mo: .85, mc: -.35, th: .5, tg: .5, sh: 1 },
  smug: { ...E0, er: 1, lid: .38, br: -.25, bh: .1, bl: .5, mw: .5, mo: .08, mc: 1, th: 0 },
  hungry: { ...E0, er: 1.2, pup: 1.2, br: .5, bh: .3, mw: .3, mo: .55, mc: .1, tg: .8 },
  chew: { ...E0, er: 1, lid: .3, sq: .0, br: .2, mw: .45, mo: .12, mc: .6, cheek: 1 },
  happy: { ...E0, er: 1, sq: .8, br: .3, bh: .5, mw: .5, mo: .25, mc: 1, cheek: 1 },
  worry: { ...E0, er: 1.15, pup: .6, br: .8, bh: .3, mw: .3, mo: .1, mc: -.5, sh: 1 },
  yell: { ...E0, er: 1.2, pup: .6, br: -.9, bh: .2, mw: .5, mo: 1, mc: .1, th: 1, tg: .6 },
};

export const CREW = {
  pip: { name: 'Pip', skin: COL.skin3, hr: [64, 56], cheekK: .16, chinK: 1.05, torsoH: 60, torsoW: 62, hipW: 58, belly: 6, legL: 40, armL: 88, limb: 16, legW: 17, neck: 0, coat: COL.teal2, coat2: COL.sun, pants: COL.cream, nose: 'bulb', eyeK: 1 },
  brisket: { name: 'Brisket', skin: COL.skin2, hr: [42, 38], cheekK: .35, chinK: 1.1, torsoH: 128, torsoW: 128, hipW: 138, belly: 22, legL: 34, armL: 104, limb: 30, legW: 32, neck: 0, coat: COL.cream, coat2: COL.coral, pants: COL.navy, nose: 'bulb', eyeK: .9 },
  longshanks: { name: 'Longshanks', skin: COL.skin1, hr: [32, 46], cheekK: -.05, chinK: 1.2, torsoH: 126, torsoW: 42, hipW: 38, belly: 0, legL: 200, armL: 176, limb: 12, legW: 13, neck: 14, coat: COL.purple, coat2: COL.sun, pants: COL.navy, nose: 'long', eyeK: .9 },
  dot: { name: 'Dot', skin: COL.skin2, hr: [54, 50], cheekK: .1, chinK: 1.0, torsoH: 42, torsoW: 44, hipW: 46, belly: 4, legL: 28, armL: 62, limb: 13, legW: 14, neck: 0, coat: COL.pink, coat2: COL.cream, pants: COL.leaf2, nose: 'dot', eyeK: 1.35 },
  barnacle: { name: 'Barnacle', skin: COL.skin1, hr: [50, 46], cheekK: .25, chinK: 1.0, torsoH: 74, torsoW: 92, hipW: 88, belly: 10, legL: 40, armL: 80, limb: 21, legW: 22, neck: 0, coat: COL.leaf, coat2: COL.wood3, pants: COL.wood2, nose: 'bulb', eyeK: .85 },
};

// -------------------------------------------------------------------------- face
function headPoly(C, seed) {
  const [rx, ry] = C.hr, n = 34, p = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, s = Math.sin(a), k = 1 + .02 * (vnoise(i * .8 + seed * 3 + G.bs * .1) - .5);
    p.push([rx * Math.cos(a) * (1 + C.cheekK * Math.max(0, s) * .5) * k, ry * s * (s > 0 ? C.chinK : 1) * k]); }
  return p;
}
function drawFace(ctx, C, E, look, talk, seed) {
  const [rx, ry] = C.hr, ER = rx * .27 * E.er * C.eyeK, ex = rx * .39, ey = -ry * .1, k = 4.2;
  const lx = look[0], ly = look[1];
  // cheeks
  if (E.cheek > .1) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) stroke(ctx, [[s * (ex + ER * .6) + i * s * 9 - 6, ey + ER * 1.45 + 5], [s * (ex + ER * .6) + i * s * 9 + 6, ey + ER * 1.45 - 6]], 3, seed + i, { col: '#d4452f', taper: .5, boil: false });
  // nose
  const ny = ry * .17;
  if (C.nose === 'bulb') shape(ctx, ell(0, ny, rx * .12, ry * .1, 14, .05, seed), C.skin, 4, seed, { off: [1, 1] });
  else if (C.nose === 'long') shape(ctx, catmull([[-6, -ry * .05], [10, ny + 12], [-1, ny + 30], [-12, ny + 22], [-8, ny]], 4, true), C.skin, 4, seed, { off: [1, 1] });
  else stroke(ctx, quad([-5, ny], [0, ny + 5], [5, ny], 5), 3.5, seed);
  // eyes
  for (const s of [-1, 1]) {
    const cx = s * ex, cy = ey;
    if (E.sq > .5) {   // laughing eyes: ^ ^
      stroke(ctx, quad([cx - ER * .95, cy + ER * .45], [cx, cy - ER * 1.1], [cx + ER * .95, cy + ER * .45], 10), 7.5, seed + s, { taper: .3 });
    } else {
      const ew = ER * (1 - E.sq * .1), eh = ER * 1.12 * (1 - E.sq * .5);
      const poly = ell(cx, cy, ew, eh, 22, .02, seed + s);
      shape(ctx, poly, '#fffdf6', k, seed + s, { off: [0, 0] });
      ctx.save(); path(ctx, poly); ctx.clip();
      const pr = ER * .44 * E.pup, px = cx + lx * ER * .5, py = cy + ly * ER * .5;
      ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - pr * .35, py - pr * .35, Math.max(2, pr * .3), 0, TAU); ctx.fill();
      if (E.lid > 0) { const ly0 = cy - eh + eh * 2 * E.lid; ctx.fillStyle = C.skin; ctx.fillRect(cx - ew - 4, cy - eh - 6, ew * 2 + 8, ly0 - (cy - eh) + 6); ctx.fillStyle = COL.ink; ctx.fillRect(cx - ew - 4, ly0 - 1.5, ew * 2 + 8, 4); }
      ctx.restore(); ring(ctx, poly, k, seed + s);
    }
    // brows
    const bx = cx, by = cy - ER * 1.5 - E.bh * ER * .75 - (s > 0 ? E.bl * ER * .6 : 0);
    const inn = -s * ER * .85, out = s * ER * .95, dy = -E.br * ER * .75;
    stroke(ctx, quad([bx + inn, by + dy], [bx, by - ER * .12 - Math.abs(E.br) * 0], [bx + out, by - dy * .2 + (E.br < 0 ? -ER * .1 : ER * .08)], 6), 8.5, seed + 5 + s, { taper: .5 });
  }
  // mouth
  const my = ry * .47, MW = E.mw * rx * (1 + talk * .0), OD = Math.max(0, E.mo + talk * .35) * ry * .5;
  const cornerY = my - E.mc * ry * .17, upMid = my + ry * .04, lowMid = upMid + OD;
  if (OD < 3) {
    stroke(ctx, quad([-MW, cornerY], [0, 2 * upMid - cornerY], [MW, cornerY], 10), 5.5, seed + 9, { taper: .35 });
  } else {
    const up = quad([-MW, cornerY], [0, 2 * upMid - cornerY], [MW, cornerY], 12), lo = quad([MW, cornerY], [0, 2 * lowMid - cornerY], [-MW, cornerY], 12), poly = [...up, ...lo.slice(1, -1)];
    ctx.save(); path(ctx, poly); ctx.clip(); ctx.fillStyle = '#4a1418'; path(ctx, poly); ctx.fill();
    if (E.tg > .05) { ctx.fillStyle = '#e8566a'; ctx.beginPath(); ctx.ellipse(0, lowMid + 2, MW * .55, OD * (.3 + E.tg * .45), 0, 0, TAU); ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.stroke(); }
    if (E.th > .05) { ctx.fillStyle = '#fffaf0'; const th = Math.min(OD * .5, ry * .2 * E.th); ctx.fillRect(-MW - 2, upMid - ry * .2, MW * 2 + 4, th + ry * .2 + (cornerY - upMid > 0 ? 0 : 0)); ctx.fillStyle = COL.ink; for (let i = -3; i <= 3; i++) ctx.fillRect(i * MW / 3.4 - 1.4, upMid - 4, 2.8, th + 6); ctx.fillRect(-MW - 2, upMid + th + 2, MW * 2 + 4, 3); }
    ctx.restore(); ring(ctx, poly, 4.6, seed + 9);
  }
  if (E.sh > .5) { sweat(ctx, rx * .82, -ry * .55 + Math.sin(G.bs * .9) * 3, 14, .25); sweat(ctx, -rx * .9, -ry * .2, 10, -.2); }
}

// -------------------------------------------------------------------------- hats and extras (head-local coordinates)
const HAT = {
  pip(ctx, C, seed) {   // a dented pot, a wooden spoon for a plume
    const rx = C.hr[0], ry = C.hr[1], b = -ry * .76;
    stroke(ctx, quad([rx * .3, b - ry * .95], [rx * .62, b - ry * 1.5], [rx * .4, b - ry * 1.9], 8), 8, seed, { col: COL.wood2, taper: .2 });
    shape(ctx, ell(rx * .4, b - ry * 2.0, 11, 17, 14, 0, seed, .35), COL.wood3, 4, seed, { off: [1, 1] });
    for (const s of [-1, 1]) shape(ctx, catmull([[s * rx * .98, b - 14], [s * rx * 1.2, b - 20], [s * rx * 1.22, b + 4], [s * rx * .98, b + 6]], 4, true), '#9aa3a8', 4, seed + s, { off: [1, 1] });
    const dome = [[-rx * 1.0, b + 4], [-rx * 1.04, b - ry * .4], [-rx * .7, b - ry * .85], [-rx * .1, b - ry * 1.05], [rx * .4, b - ry * 1.0], [rx * .86, b - ry * .7], [rx * 1.04, b - ry * .35], [rx * 1.0, b + 4], [0, b + 12]];
    shape(ctx, catmull(dome, 5, true), '#aeb7bd', 5.5, seed + 3, { hatch: { ang: .7, gap: 8, w: 1.6 }, off: [2, 3] });
    stroke(ctx, quad([-rx * .7, b - ry * .45], [-rx * .5, b - ry * .78], [-rx * .1, b - ry * .85], 7), 5, seed + 8, { col: '#fff', taper: .5, vary: .2 });
    shape(ctx, catmull([[-rx * 1.08, b - 4], [0, b + 12], [rx * 1.08, b - 4], [rx * 1.0, b + 12], [0, b + 26], [-rx * 1.0, b + 12]], 4, true), '#8a949a', 4.5, seed + 5, { off: [1, 2] });
  },
  brisket(ctx, C, seed) {   // knitted beanie with stripes and a pompom
    const rx = C.hr[0], ry = C.hr[1], b = -ry * .8, H = ry * 1.35;
    const dome = catmull([[-rx * 1.02, b], [-rx * .95, b - H * .55], [-rx * .45, b - H * .95], [rx * .45, b - H * .95], [rx * .95, b - H * .55], [rx * 1.02, b], [0, b + 10]], 5, true);
    ctx.save(); path(ctx, dome); ctx.clip(); ctx.fillStyle = COL.coral; ctx.fillRect(-rx * 1.2, b - H - 20, rx * 2.4, H + 40); ctx.fillStyle = COL.cream; for (let i = 0; i < 3; i++) ctx.fillRect(-rx * 1.2, b - H * .85 + i * H * .27, rx * 2.4, H * .12); ctx.restore();
    shape(ctx, dome, null, 5.5, seed, {}); shape(ctx, ell(rx * .1, b - H - 10, 16, 16, 16, .1, seed), COL.cream, 4.5, seed + 1, { tone: { alpha: .4 } });
    shape(ctx, catmull([[-rx * 1.1, b - 14], [0, b + 6], [rx * 1.1, b - 14], [rx * 1.1, b + 8], [0, b + 14], [-rx * 1.1, b + 8]], 4, true), COL.cream, 5, seed + 2, { hatch: { ang: 1.3, gap: 7, w: 1.4 } });
  },
  longshanks(ctx, C, seed) {   // a stovepipe hat with a telescope poking out
    const rx = C.hr[0], ry = C.hr[1], b = -ry * .78;
    stroke(ctx, [[rx * .3, b - 70], [rx * 1.6, b - 120]], 12, seed, { col: COL.wood2, taper: .1 }); stroke(ctx, [[rx * 1.25, b - 108], [rx * 2.0, b - 136]], 18, seed + 1, { col: COL.sun, taper: .1 });
    shape(ctx, catmull([[-rx * .8, b], [-rx * .74, b - 118], [rx * .74, b - 118], [rx * .8, b], [0, b + 8]], 3, true), COL.navy, 5.5, seed, { hatch: { ang: 1.2, gap: 7, w: 1.5, col: '#6f7fc0', alpha: .8 } });
    shape(ctx, [[-rx * .78, b - 28], [rx * .78, b - 28], [rx * .8, b - 8], [-rx * .8, b - 8]], COL.sun, 3.5, seed + 2);
    shape(ctx, catmull([[-rx * 1.6, b + 6], [0, b - 12], [rx * 1.6, b + 6], [0, b + 24]], 4, true), COL.navy, 5, seed + 3);
  },
  dot(ctx, C, seed) {   // a bucket for a hat
    const rx = C.hr[0], ry = C.hr[1], b = -ry * .74;
    stroke(ctx, quad([-rx * .5, b - ry * .75], [0, b - ry * 1.5], [rx * .5, b - ry * .75], 10), 5, seed, { col: '#777', taper: .1 });
    shape(ctx, catmull([[-rx * .6, b - ry * .8], [rx * .6, b - ry * .8], [rx * .95, b], [-rx * .95, b]], 3, true), COL.sun, 5.5, seed, { hatch: { ang: .5, gap: 9, w: 1.5 }, off: [2, 3] });
    shape(ctx, [[-rx * .82, b - ry * .35], [rx * .82, b - ry * .35], [rx * .88, b - ry * .22], [-rx * .88, b - ry * .22]], '#c9921c', 4, seed + 1);
    shape(ctx, catmull([[-rx * 1.2, b + 2], [0, b - 14], [rx * 1.2, b + 2], [0, b + 16]], 4, true), COL.sun, 5, seed + 2);
  },
  barnacle(ctx, C, seed) {   // no hat: three hairs
    const ry = C.hr[1], top = -ry;
    for (const s of [-1, 0, 1]) stroke(ctx, quad([s * 9, top + 4], [s * 12 + 4, top - 26], [s * 24, top - 30], 8), 4, seed + s, { taper: .2 });
  },
};
const BEARD = {
  barnacle(ctx, C, seed) {   // a white beard swirled like surf
    const rx = C.hr[0], ry = C.hr[1];
    const b = catmull([[-rx * 1.08, ry * .0], [-rx * 1.2, ry * .55], [-rx * .85, ry * 1.2], [-rx * .3, ry * 1.65], [rx * .1, ry * 1.5], [rx * .55, ry * 1.7], [rx * 1.0, ry * 1.15], [rx * 1.25, ry * .5], [rx * 1.08, 0], [rx * .5, ry * .3], [0, ry * .28], [-rx * .5, ry * .3]], 5, true);
    shape(ctx, b, '#f4f1ea', 5.5, seed, { hatch: { ang: 1.35, gap: 8, w: 1.5 }, off: [2, 3] });
    for (const [x, y] of [[-rx * .6, ry * .85], [rx * .3, ry * 1.0]]) stroke(ctx, quad([x, y], [x + 16, y + 22], [x + 4, y + 40], 8), 3.2, seed + x, { taper: .3 });
  },
  brisket(ctx, C, seed) {   // handlebar moustache
    const rx = C.hr[0], ry = C.hr[1];
    for (const s of [-1, 1]) shape(ctx, catmull([[0, ry * .22], [s * rx * .5, ry * .16], [s * rx * 1.0, ry * .36], [s * rx * 1.18, ry * .1], [s * rx * 1.05, ry * .5], [s * rx * .5, ry * .42], [0, ry * .36]], 4, true), '#4b2a16', 4.5, seed + s, { off: [1, 2] });
  },
  longshanks(ctx, C, seed) {   // a thin goatee
    const rx = C.hr[0], ry = C.hr[1]; shape(ctx, catmull([[-8, ry * .85], [0, ry * 1.45], [8, ry * .85]], 4, true), '#3b2a22', 3.5, seed);
  },
};
function glasses(ctx, C, E) { const rx = C.hr[0], ry = C.hr[1], ER = rx * .27 * E.er * C.eyeK * 1.5; for (const s of [-1, 1]) { ring(ctx, ell(s * rx * .39, -ry * .1, ER, ER, 20), 4, 3); } stroke(ctx, [[-rx * .39 + ER, -ry * .1], [rx * .39 - ER, -ry * .1]], 3.5, 2); }

// -------------------------------------------------------------------------- clothes (torso-local: origin = hip centre)
function dressTorso(ctx, C, id, seed) {
  const h = C.torsoH, w = C.torsoW;
  if (id === 'pip') { for (let i = 0; i < 3; i++) { ctx.fillStyle = COL.sun; ctx.beginPath(); ctx.arc(0, -h * (.2 + i * .25), 4.5, 0, TAU); ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 2.5; ctx.stroke(); } stroke(ctx, [[0, -h * .95], [0, -h * .08]], 3.5, seed); }
  if (id === 'brisket') { shape(ctx, catmull([[-w * .38, -h * .78], [w * .38, -h * .78], [w * .5, -h * .08], [-w * .5, -h * .08]], 3, true), '#fffaf0', 4.5, seed, { off: [1, 2] }); stroke(ctx, [[-w * .2, -h * .45], [w * .1, -h * .36]], 7, seed, { col: '#c9a368' }); ctx.fillStyle = '#b8742f'; ctx.beginPath(); ctx.arc(w * .15, -h * .3, 9, 0, TAU); ctx.fill(); }
  if (id === 'longshanks') { for (let i = 0; i < 3; i++) { ctx.fillStyle = COL.sun; ctx.beginPath(); ctx.arc(0, -h * (.25 + i * .24), 4, 0, TAU); ctx.fill(); } shape(ctx, [[-w * .25, -h * .96], [0, -h * .78], [w * .25, -h * .96], [0, -h * .98]], COL.cream, 3.5, seed); }
  if (id === 'dot') { stroke(ctx, [[-w * .5, -h * .5], [w * .5, -h * .5]], 6, seed, { col: COL.cream }); }
  if (id === 'barnacle') { shape(ctx, catmull([[-w * .5, -h * .9], [w * .5, -h * .9], [w * .38, -h * .1], [-w * .38, -h * .1]], 3, true), COL.wood3, 4.5, seed, { hatch: { ang: .4, gap: 7, w: 1.3 }, off: [1, 2] }); }
}

// -------------------------------------------------------------------------- the rig
export function pose(o = {}) { return { x: 0, y: 0, s: 1, flip: 1, sq: 1, lean: 0, tilt: 0, hs: [1, 1], aL: [8, 4], aR: [8, 4], lL: [3, 0], lR: [-3, 0], face: EXPR.neutral, look: [0, 0], talk: 0, bob: 0, hat: true, holdL: null, holdR: null, seed: 1, ...o }; }
export function drawChar(ctx, id, P) {
  const C = CREW[id], seed = P.seed + id.length * 3.1, [rx, ry] = C.hr;
  ctx.save(); ctx.translate(P.x, P.y); ctx.scale(P.s * P.flip, P.s); const sy = P.sq, sx = 1 / Math.sqrt(sy); ctx.scale(sx, sy);
  const hipY = -C.legL + P.bob, ink = 5.5;
  // legs
  const legAt = (s, a) => { const hx = s * C.hipW * .27, up = C.legL * .55, lo = C.legL * .55 + 4, d1 = [s * Math.sin(rad(a[0])), Math.cos(rad(a[0]))], k = [hx + d1[0] * up, hipY + d1[1] * up], d2 = [s * Math.sin(rad(a[1])), Math.cos(rad(a[1]))], f = [k[0] + d2[0] * lo, Math.min(0 + 0, k[1] + d2[1] * lo)]; return { hx, k, f }; };
  for (const s of [-1, 1]) {
    const a = s < 0 ? P.lL : P.lR, g = legAt(s, a), peg = id === 'barnacle' && s > 0, bare = id === 'pip' && s > 0;
    const legCol = peg ? COL.wood : C.pants;
    tube(ctx, [[g.hx, hipY + 2], g.k, g.f], C.legW, C.legW * (peg ? .6 : .85), legCol, ink, seed + s, { hatch: { ang: .9, gap: 8, w: 1.4 } });
    if (id === 'pip') {   // the sock: stripes up the left shin, the right foot is bare
      if (!bare) { ctx.save(); const sp = capsule(catmull([g.k, g.f], 3), [C.legW * .86, C.legW * .86, C.legW * .86, C.legW * .86, C.legW * .86, C.legW * .86, C.legW * .86, C.legW * .86, C.legW * .86, C.legW * .86]); path(ctx, sp); ctx.clip(); for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? COL.sun : COL.teal; ctx.fillRect(Math.min(g.k[0], g.f[0]) - 20, g.k[1] + (g.f[1] - g.k[1]) * i / 6 - 2, 40 + Math.abs(g.f[0] - g.k[0]), (g.f[1] - g.k[1]) / 6 + 4); } ctx.restore(); ring(ctx, sp, 4, seed + 4); }
    }
    if (!peg) {
      const fw = C.legW * 1.15, fx = g.f[0] + s * fw * .35, foot = ell(fx, g.f[1] - 3, fw * 1.0, fw * .46, 16, .03, seed + s);
      shape(ctx, foot, bare ? COL.skin3 : (id === 'pip' ? COL.teal : COL.wood2), ink - .5, seed + 7 + s, { off: [1, 2] });
      if (bare) for (let i = 0; i < 4; i++) stroke(ctx, [[fx + s * (fw * .35 + i * 4.5), g.f[1] - 9], [fx + s * (fw * .35 + i * 4.5), g.f[1] - 2]], 2.4, seed + i, { taper: .1 });
    } else shape(ctx, ell(g.f[0], g.f[1] - 3, C.legW * .45, C.legW * .22, 10), COL.wood2, 4, seed);
  }
  // upper body, rotated about the hip
  ctx.save(); ctx.translate(0, hipY); ctx.rotate(P.lean);
  const tH = C.torsoH, tW = C.torsoW, hW = C.hipW, bl = C.belly;
  // back arm (character's left) first
  const arm = (s, a, hold) => {
    const sh = [s * tW * .44, -tH * .9], u = C.armL * .5, l = C.armL * .5 + 2;
    const d1 = [s * Math.sin(rad(a[0])), Math.cos(rad(a[0]))], el = [sh[0] + d1[0] * u, sh[1] + d1[1] * u], d2 = [s * Math.sin(rad(a[1])), Math.cos(rad(a[1]))], hd = [el[0] + d2[0] * l, el[1] + d2[1] * l];
    tube(ctx, [sh, el, hd], C.limb, C.limb * .85, C.coat, ink, seed + 20 + s, { hatch: { ang: .8, gap: 8, w: 1.4 } });
    shape(ctx, ell(hd[0], hd[1], C.limb * .82, C.limb * .8, 14, .03, seed + s), C.skin, ink - .8, seed + 30 + s, { off: [1, 2] });
    if (hold) hold(ctx, hd[0], hd[1], Math.atan2(d2[1], d2[0]));
    return hd;
  };
  arm(-1, P.aL, P.holdL);
  // torso
  const tor = catmull([[-hW / 2, 0], [-hW / 2 - bl, -tH * .4], [-tW / 2, -tH * .92], [-tW * .2, -tH], [tW * .2, -tH], [tW / 2, -tH * .92], [hW / 2 + bl, -tH * .4], [hW / 2, 0], [0, tH * .05]], 5, true);
  shape(ctx, tor, C.coat, ink, seed, { hatch: { ang: .8, gap: 9, w: 1.5 }, tone: id === 'dot' || id === 'pip' ? { alpha: .22 } : null, off: [2, 3] });
  ctx.save(); path(ctx, tor); ctx.clip(); dressTorso(ctx, C, id, seed); ctx.restore();
  // head
  ctx.save(); ctx.translate(0, -tH - C.neck - ry * .82); ctx.rotate(P.tilt); ctx.scale(P.hs[0], P.hs[1]);
  const hp = headPoly(C, seed);
  if (id === 'longshanks' || id === 'brisket') for (const s of [-1, 1]) shape(ctx, ell(s * rx * 1.0, 0, rx * .16, ry * .22, 10), C.skin, 4, seed + s, { off: [1, 1] });
  if (C.neck) stroke(ctx, [[0, ry * .6], [0, ry * 1.1 + C.neck]], 12, seed, { col: C.skin, taper: 0 });
  if (id === 'dot') for (const s of [-1, 1]) { shape(ctx, catmull([[s * rx * .7, -ry * .6], [s * rx * 1.5, -ry * .75], [s * rx * 1.75, -ry * .2], [s * rx * 1.2, -ry * .05], [s * rx * .9, -ry * .4]], 4, true), '#2b1c14', 4.5, seed + s, { off: [1, 2] }); }
  shape(ctx, hp, C.skin, ink, seed + 2, { tone: { alpha: .16 }, hatch: { ang: .7, gap: 11, w: 1.3 }, off: [2, 3] });
  drawFace(ctx, C, P.face, P.look, P.talk, seed);
  if (BEARD[id]) BEARD[id](ctx, C, seed);
  if (id === 'longshanks') glasses(ctx, C, P.face);
  if (P.hat && HAT[id]) HAT[id](ctx, C, seed);
  ctx.restore();
  // front arm
  arm(1, P.aR, P.holdR);
  ctx.restore();
  ctx.restore();
}
// head centre in character space (for effects that follow a face)
export function headPos(id, P) { const C = CREW[id]; return [P.x + 0, P.y - P.s * ((C.legL - P.bob) + C.torsoH + C.neck + C.hr[1] * .82)]; }

// -------------------------------------------------------------------------- props that crews hold
export const props = {
  ladle(ctx, x, y, a) { ctx.save(); ctx.translate(x, y); ctx.rotate(a - Math.PI / 2); stroke(ctx, [[0, 20], [0, -80]], 8, 4, { col: COL.wood2, taper: .1 }); shape(ctx, ell(0, -92, 20, 16, 14), '#aeb7bd', 4.5, 5); ctx.restore(); },
  hammer(ctx, x, y, a) { ctx.save(); ctx.translate(x, y); ctx.rotate(a - Math.PI / 2); stroke(ctx, [[0, 20], [0, -64]], 9, 4, { col: COL.wood2, taper: .1 }); shape(ctx, [[-26, -84], [26, -84], [26, -58], [-26, -58]], '#9aa3a8', 4.5, 5); ctx.restore(); },
  spyglass(ctx, x, y, a) { ctx.save(); ctx.translate(x, y); ctx.rotate(a - Math.PI / 2); shape(ctx, [[-9, 10], [9, 10], [14, -90], [-14, -90]], COL.wood3, 4, 5); shape(ctx, [[-14, -90], [14, -90], [16, -120], [-16, -120]], COL.sun, 4, 6); ctx.restore(); },
  drumstick(ctx, x, y, a) { ctx.save(); ctx.translate(x, y); ctx.rotate(a - Math.PI / 2); stroke(ctx, [[0, 14], [0, -56]], 9, 4, { col: '#f6e9cf', taper: .1 }); shape(ctx, ell(0, -86, 30, 38, 18, .05, 3), '#c2742e', 4.5, 5, { hatch: { ang: .6, gap: 7, w: 1.4 } }); ctx.restore(); },
};
