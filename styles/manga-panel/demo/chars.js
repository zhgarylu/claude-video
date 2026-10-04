// Characters and props built from the engine: heads with expression parameters, a runner rig, hands, a bun.
// Original designs; they carry no resemblance to any series.
(function (G) {
const { TAU, INK, PAPER, clamp, lerp, pen, shape, tone, pathPoly, ellipsePts, gradLin, gradRad, sweat, mulberry } = G.MG;
const mkT = (cx, cy, s, rot) => { const c = Math.cos(rot || 0), t = Math.sin(rot || 0), k = s / 100; return (x, y) => [cx + (x * c - y * t) * k, cy + (x * t + y * c) * k]; };
const fillPoly = (ctx, p, col) => { ctx.fillStyle = col; pathPoly(ctx, p); ctx.fill(); };

// ---------- eyes ----------
// side -1 = the character's left eye (screen left), +1 = right eye
function eye(ctx, T, k, cx, cy, ew, eh, side, f) {
  const s = side, W = (w) => w * k;
  if (f.eyeKind === 'closed' || eh < 1.6) { // happy arc or closed line
    const up = f.eyeKind === 'closed' ? -1 : 1;
    pen(ctx, [T(cx - s * ew, cy + 2), T(cx, cy - 7 * (f.arc == null ? 1 : f.arc)), T(cx + s * ew, cy + 2)], { w: W(4), tin: 0.1, tout: 0.2, vary: 0.2, side: s });
    return;
  }
  const up = [T(cx + s * ew, cy + eh * 0.15), T(cx + s * ew * 0.62, cy - eh * 0.82), T(cx - s * ew * 0.1, cy - eh * 1.02), T(cx - s * ew * 0.82, cy - eh * 0.62), T(cx - s * ew * 1.0, cy - eh * 0.05)];
  const lo = [T(cx - s * ew * 0.85, cy + eh * 0.35), T(cx - s * ew * 0.35, cy + eh * 0.85), T(cx + s * ew * 0.35, cy + eh * 0.9), T(cx + s * ew * 0.85, cy + eh * 0.5)];
  const outline = up.concat(lo);
  ctx.save();
  const sm = G.MG.smoothPts(outline, true, 2); pathPoly(ctx, sm); ctx.fillStyle = PAPER; ctx.fill(); ctx.clip();
  const lk = f.look || [0, 0], pr = f.pupil == null ? 1 : f.pupil;
  const ix = cx + lk[0] * 5 - s * 1.2, iy = cy + lk[1] * 4 + eh * 0.06;
  const ir = ellipsePts(...T(ix, iy), ew * 0.64 * pr * k, eh * 0.98 * Math.max(0.5, pr) * k, f.rot || 0, 30);
  fillPoly(ctx, ir, INK);
  if (pr > 0.5) {
    const hr = ew * 0.64 * pr; // big and small highlights
    fillPoly(ctx, ellipsePts(...T(ix - s * hr * 0.28, iy - eh * 0.42), hr * 0.36 * k, eh * 0.3 * k, f.rot || 0, 14), PAPER);
    fillPoly(ctx, ellipsePts(...T(ix + s * hr * 0.3, iy + eh * 0.5), hr * 0.15 * k, hr * 0.15 * k, 0, 10), PAPER);
    if (eh > 7) for (let i = 0; i < 6; i++) { // radial lines in the lower iris
      const a = Math.PI * (0.18 + i * 0.13); const p0 = T(ix + Math.cos(a) * hr * 0.2, iy + Math.sin(a) * eh * 0.3), p1 = T(ix + Math.cos(a) * hr * 0.75, iy + Math.sin(a) * eh * 0.85);
      pen(ctx, [p0, p1], { w: Math.max(0.5, W(0.9)), color: PAPER, tin: 0.1, tout: 0.5 });
    }
  }
  ctx.restore();
  pen(ctx, sm, { w: W(1.7), closed: true, sharp: true, step: 99, vary: 0.7, seed: 5 });
  // upper lid: thick, heavy at the outer end, with a lash flick
  pen(ctx, [T(cx - s * ew * 1.0, cy - eh * 0.1)].concat(up.slice(0).reverse().slice(1, 4)).concat([T(cx + s * (ew + 5), cy - eh * 0.06 + 3)]), { w: W(5.2), tin: 0.05, tout: 0.18, vary: 0.2, wob: 0.04, side: s, min: 0.3 });
  pen(ctx, [T(cx - s * ew * 0.8, cy + eh * 0.55), T(cx, cy + eh * 0.92), T(cx + s * ew * 0.75, cy + eh * 0.6)], { w: W(1.3), tin: 0.3, tout: 0.3, vary: 0.1 });
  pen(ctx, [T(cx - s * ew * 0.6, cy - eh * 1.28), T(cx, cy - eh * 1.4), T(cx + s * ew * 0.8, cy - eh * 1.1)], { w: W(1.1), tin: 0.3, tout: 0.4, vary: 0.1 });
}
function brow(ctx, T, k, cx, cy, side, a, len) { // a>0: inner end raised (worried), a<0: inner end lowered (angry)
  len = len || 13; const ox = cx + side * len, ix = cx - side * len, oy = cy + a * 4, iy = cy - a * 7;
  pen(ctx, [T(ix, iy), T((ix + ox) / 2, (iy + oy) / 2 - 2.2), T(ox, oy)], { w: 2.8 * k, tin: 0.15, tout: 0.5, vary: 0.2, side });
}

function mouth(ctx, T, k, mx, my, kind, o) {
  o = o || {};
  if (kind === 'smile') pen(ctx, [T(mx - 9, my - 1), T(mx - 3, my + 4), T(mx + 4, my + 4), T(mx + 10, my - 3)], { w: 2.4 * k, tin: 0.2, tout: 0.3, vary: 0.2 });
  else if (kind === 'line') pen(ctx, [T(mx - 8, my), T(mx + 8, my + 0.5)], { w: 2.2 * k, vary: 0.1 });
  else if (kind === 'o') { fillPoly(ctx, ellipsePts(...T(mx, my + 1), 4.8 * k, 6.3 * k, 0, 18), INK); fillPoly(ctx, ellipsePts(...T(mx - 1, my - 1), 1.3 * k, 1.9 * k, 0, 8), PAPER); }
  else if (kind === 'shout') {
    const m = [T(mx - 15, my - 5), T(mx - 7, my - 8), T(mx + 8, my - 8), T(mx + 16, my - 5), T(mx + 12, my + 8), T(mx, my + 17), T(mx - 12, my + 8)];
    const sm = G.MG.smoothPts(m, true, 2); fillPoly(ctx, sm, INK);
    ctx.save(); pathPoly(ctx, sm); ctx.clip();
    fillPoly(ctx, [T(mx - 13, my - 6), T(mx + 14, my - 6), T(mx + 12, my - 1), T(mx - 12, my - 1)], PAPER); // upper teeth
    tone(ctx, ellipsePts(...T(mx, my + 12), 11 * k, 6 * k, 0, 16), { k: 'dot', pitch: 3.2, pct: 0.55, color: PAPER, ang: 45 });
    ctx.restore();
    pen(ctx, sm, { w: 2.6 * k, closed: true, sharp: true, step: 99, vary: 0.4 });
  } else if (kind === 'grit') {
    const r = [T(mx - 13, my - 5), T(mx + 13, my - 5), T(mx + 12, my + 6), T(mx - 12, my + 6)]; shape(ctx, r, { w: 2.4 * k, sharp: true, vary: 0.3 });
    for (let i = -2; i <= 2; i++) pen(ctx, [T(mx + i * 5, my - 5), T(mx + i * 5, my + 6)], { w: 1.2 * k, tin: 0, tout: 0 });
    pen(ctx, [T(mx - 13, my + 0.5), T(mx + 13, my + 0.5)], { w: 1.2 * k, tin: 0, tout: 0 });
  } else if (kind === 'open') {
    const m = [T(mx - 9, my - 3), T(mx, my - 4.5), T(mx + 9, my - 3), T(mx + 6, my + 8), T(mx, my + 11), T(mx - 6, my + 8)];
    const sm = G.MG.smoothPts(m, true, 2); fillPoly(ctx, sm, INK);
    tone(ctx, ellipsePts(...T(mx, my + 8), 5 * k, 3 * k, 0, 12), { k: 'solid', color: PAPER });
    pen(ctx, sm, { w: 2.2 * k, closed: true, sharp: true, step: 99, vary: 0.4 });
  } else if (kind === 'wave') pen(ctx, [T(mx - 10, my), T(mx - 5, my + 3), T(mx, my - 1), T(mx + 5, my + 3), T(mx + 10, my)], { w: 2.2 * k, tin: 0.15, tout: 0.15, vary: 0.1 });
}

// ---------- girl ----------
// f: {yaw, rot, eye (0..1.2), pupil, brow, mouth, blush, look, sweat:[[x,y]], hairpin, flat (no shading)}
function girlHead(ctx, cx, cy, s, f) {
  f = f || {}; const yw = f.yaw || 0, T = mkT(cx, cy, s, f.rot || 0), k = s / 100, sx = yw * 6;
  const hair = [[-58, 52], [-62, 26], [-60, -10], [-52, -42], [-30, -62], [0, -67], [30, -62], [52, -42], [60, -10], [62, 26], [58, 53], [44, 46], [0, 38], [-44, 46]].map(p => T(p[0] + sx, p[1]));
  shape(ctx, hair, { fill: INK, w: 2.4 * k, vary: 0.2 });
  // neck
  shape(ctx, [T(-14 + sx, 40), T(14 + sx, 40), T(16 + sx, 66), T(-16 + sx, 66)], { w: 2 * k, sharp: true, vary: 0.5 });
  const face = [[-41, -8], [-40, 12], [-33, 34], [-18, 50], [4 + yw * 5, 57], [24, 50], [37, 32], [42, 10], [41, -12], [34, -34], [14, -46], [-14, -46], [-34, -34]].map(p => T(p[0] + yw * 4, p[1]));
  const fs = shape(ctx, face, { w: 2.6 * k, vary: 0.75, seed: 3 });
  // shade under the fringe and on the shadow cheek
  if (!f.flat) {
    ctx.save(); pathPoly(ctx, fs); ctx.clip();
    tone(ctx, ellipsePts(...T(0 + sx, -26), 52 * k, 20 * k, 0, 24), { k: 'dot', pitch: 3.6, pct: 0.5, ang: 45, ox: 0, oy: 0 });
    tone(ctx, [T(26, 14), T(46, -2), T(46, 56), T(8, 60)], { k: 'line', pitch: 3.4, pct: 0.35, ang: 55 });
    ctx.restore();
  }
  const ey = 8, ex = 21, op = f.eye == null ? 1 : f.eye;
  const shiftL = yw * 11, shiftR = yw * 11, wl = 17 * (1 + Math.max(0, -yw) * 0.0 - Math.max(0, yw) * 0.2), wr = 17 * (1 + 0 - Math.max(0, -yw) * 0.2);
  eye(ctx, T, k, -ex + shiftL, ey, wl, 17 * op, -1, f); eye(ctx, T, k, ex + shiftR, ey, wr, 17 * op, 1, f);
  const bw = f.brow || 0; brow(ctx, T, k, -ex + shiftL, -16 - (f.browY || 0), -1, bw); brow(ctx, T, k, ex + shiftR, -16 - (f.browY || 0), 1, bw);
  pen(ctx, [T(yw * 12 + 1, 26), T(yw * 12 + 3.5, 29.5), T(yw * 12 + 0.5, 30.5)], { w: 1.8 * k, tin: 0.2, tout: 0.3, vary: 0.2 });
  mouth(ctx, T, k, yw * 11, 40, f.mouth || 'line');
  if (f.blush) for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) { const bx = sd * 30 + yw * 10 + (i - 1.5) * 4.2 * sd * -1 * 0 + i * 3.6 * sd * 0.0; pen(ctx, [T(sd * 25 + yw * 10 + i * 4 - 6, 27), T(sd * 25 + yw * 10 + i * 4 - 2, 21)], { w: 1.3 * k, tin: 0.1, tout: 0.5, vary: 0 }); }
  // fringe
  const tips = [-32, -11, 11, 32], tipY = [0, -10, -9, 2], fr = [[-47 + sx, 12], [-45, -18], [-38, -44], [-20, -58], [0, -63], [22, -58], [38, -44], [46, -18], [47 + sx, 12], [41, -6]];
  for (let i = tips.length - 1; i >= 0; i--) { fr.push([tips[i] + 6 + yw * 5, -24]); fr.push([tips[i] + yw * 5, tipY[i]]); fr.push([tips[i] - 6 + yw * 5, -22]); }
  fr.push([-40 + sx, -8]);
  shape(ctx, fr.map(p => T(p[0] + (p[1] < -30 ? sx : 0), p[1])), { fill: INK, sharp: true, w: 1.6 * k, vary: 0.2 });
  // highlight bands (angel ring) and strand scratches
  pen(ctx, [T(-34 + sx, -38), T(-16 + sx, -50), T(6 + sx, -52), T(26 + sx, -47), T(38 + sx, -35)], { w: 6.5 * k, color: PAPER, tin: 0.3, tout: 0.35, vary: 0, wob: 0.15 });
  pen(ctx, [T(-20 + sx, -32), T(-14 + sx, -42)], { w: 1.6 * k, color: PAPER, tin: 0.1, tout: 0.6, vary: 0 });
  pen(ctx, [T(14 + sx, -30), T(20 + sx, -40)], { w: 1.6 * k, color: PAPER, tin: 0.1, tout: 0.6, vary: 0 });
  pen(ctx, [T(-52 + sx, 20), T(-50 + sx, 38)], { w: 2 * k, color: PAPER, tin: 0.1, tout: 0.6, vary: 0 });
  pen(ctx, [T(52 + sx, 14), T(54 + sx, 34)], { w: 2 * k, color: PAPER, tin: 0.1, tout: 0.6, vary: 0 });
  pen(ctx, [T(2 + sx, -64), T(10 + sx, -78), T(24 + sx, -80)], { w: 2.6 * k, tin: 0.05, tout: 0.5, vary: 0.2 }); // cowlick
  if (f.hairpin !== false) { // star hairpin
    const hp = T(34 + sx, -28), r = 8 * k; const star = []; for (let i = 0; i < 10; i++) { const a = i * TAU / 10 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; star.push([hp[0] + Math.cos(a) * rr, hp[1] + Math.sin(a) * rr]); }
    shape(ctx, star, { sharp: true, w: 1.3 * k, vary: 0.3 });
  }
  for (const sw of (f.sweat || [])) sweat(ctx, ...T(sw[0], sw[1]), (sw[2] || 9) * k, sw[3] || 0);
}

// ---------- middle-aged man ----------
function manHead(ctx, cx, cy, s, f) {
  f = f || {}; const yw = f.yaw || 0, T = mkT(cx, cy, s, f.rot || 0), k = s / 100, sx = yw * 5;
  shape(ctx, [T(-17 + sx, 44), T(17 + sx, 44), T(24 + sx, 70), T(-24 + sx, 70)], { w: 2.2 * k, sharp: true, vary: 0.5 });
  // suit shoulders, shirt collar and tie
  shape(ctx, [T(-30 + sx, 56), T(30 + sx, 56), T(86 + sx, 82), T(96 + sx, 150), T(-96 + sx, 150), T(-86 + sx, 82)], { fill: INK, sharp: true, w: 2.4 * k, vary: 0.3 });
  shape(ctx, [T(-20 + sx, 54), T(20 + sx, 54), T(4 + sx, 84), T(-4 + sx, 84)].map(p => p), { sharp: true, w: 1.8 * k, vary: 0.2 });
  shape(ctx, [T(-3 + sx, 66), T(3 + sx, 66), T(7 + sx, 130), T(0 + sx, 138), T(-7 + sx, 130)], { fill: INK, sharp: true, w: 1.2 * k, vary: 0 });
  pen(ctx, [T(-3 + sx, 74), T(3 + sx, 82)], { w: 1.2 * k, color: PAPER, tin: 0, tout: 0, vary: 0 }); pen(ctx, [T(-4 + sx, 96), T(4 + sx, 104)], { w: 1.2 * k, color: PAPER, tin: 0, tout: 0, vary: 0 });
  shape(ctx, [T(-45 + sx, 4), T(-52 + sx, -2), T(-53 + sx, 12), T(-46 + sx, 20)], { w: 2 * k, vary: 0.4 });
  const face = [[-42, -26], [-45, 4], [-42, 32], [-28, 52], [0, 60], [28, 52], [42, 32], [45, 4], [42, -26], [28, -42], [0, -48], [-28, -42]].map(p => T(p[0] + yw * 3, p[1]));
  const fs = shape(ctx, face, { w: 2.8 * k, vary: 0.8, seed: 8 });
  ctx.save(); pathPoly(ctx, fs); ctx.clip();
  tone(ctx, [T(-50, 34), T(50, 34), T(50, 66), T(-50, 66)], { k: 'sand', pitch: 2.8, pct: 0.28, seed: 5 }); // stubble
  tone(ctx, [T(20, -20), T(50, -30), T(50, 60), T(10, 62)], { k: 'line', pitch: 3.4, pct: 0.3, ang: 60 });
  ctx.restore();
  // hair: solid black, side parting, grey temples, paper-white sheen
  const hr = [[-47, -16], [-48, -44], [-36, -58], [-10, -64], [22, -62], [42, -50], [47, -16], [41, -28], [30, -38], [8, -36], [-12, -40], [-28, -32], [-38, -22]].map(p => T(p[0] + sx, p[1]));
  const hs = shape(ctx, hr, { fill: INK, w: 2.4 * k, vary: 0.3 });
  pen(ctx, [T(-30 + sx, -52), T(-8 + sx, -60), T(18 + sx, -57), T(34 + sx, -48)], { w: 5 * k, color: PAPER, tin: 0.3, tout: 0.4, vary: 0 });
  pen(ctx, [T(-14 + sx, -62), T(-10 + sx, -46), T(-18 + sx, -38)], { w: 1.8 * k, color: PAPER, tin: 0.1, tout: 0.3, vary: 0 });
  for (let i = 0; i < 4; i++) pen(ctx, [T(-44 + sx + i * 2, -34 + i * 5), T(-38 + sx + i * 2, -28 + i * 5)], { w: 1.1 * k, color: PAPER, tin: 0, tout: 0.5, vary: 0 });
  // eyes behind round glasses
  const op = f.eye == null ? 1 : f.eye, ex = 21, ey = 0;
  for (const sd of [-1, 1]) {
    const gx = sd * ex + yw * 9, gy = ey;
    const lens = ellipsePts(...T(gx, gy), 17 * k, 15 * k, 0, 28); fillPoly(ctx, lens, PAPER);
    ctx.save(); pathPoly(ctx, lens); ctx.clip();
    const sc = (f.pupil == null ? 1 : f.pupil);
    if (f.eyeKind === 'closed') pen(ctx, [T(gx - 8, gy + 1), T(gx, gy - 3), T(gx + 8, gy + 1)], { w: 2.6 * k, tin: 0.1, tout: 0.1 });
    else {
      fillPoly(ctx, ellipsePts(...T(gx - sd * 1, gy + 1), 8.5 * k, 9 * k * op, 0, 18), PAPER);
      pen(ctx, ellipsePts(...T(gx, gy), 8.8 * k, 7.5 * k * op, 0, 18), { w: 1.6 * k, closed: true, sharp: true, step: 99, vary: 0.6 });
      fillPoly(ctx, ellipsePts(...T(gx + (f.look ? f.look[0] * 3 : 0), gy + 1), 3.9 * k * sc, 3.9 * k * sc, 0, 12), INK);
      fillPoly(ctx, ellipsePts(...T(gx - 1.2, gy - 0.8), 1.2 * k, 1.2 * k, 0, 6), PAPER);
    }
    pen(ctx, [T(gx - 14, gy + 14), T(gx - 4, gy + 6)], { w: 2.4 * k, color: PAPER, tin: 0.1, tout: 0.2, vary: 0 }); // glint
    pen(ctx, [T(gx - 3, gy + 15), T(gx + 5, gy + 8)], { w: 1.4 * k, color: PAPER, tin: 0.1, tout: 0.2, vary: 0 });
    ctx.restore();
    pen(ctx, lens, { w: 3 * k, closed: true, sharp: true, step: 99, vary: 0.7 });
    brow(ctx, T, k, gx, gy - 21 - (f.browY || 0), sd, (f.brow || 0) * 0.9, 15);
  }
  pen(ctx, [T(-ex + yw * 9 + 17, 0), T(-2 + yw * 9, -2), T(ex + yw * 9 - 17, 0)], { w: 2 * k, tin: 0.1, tout: 0.1, vary: 0.1 });
  pen(ctx, [T(-3 + yw * 10, 8), T(-6 + yw * 10, 26), T(4 + yw * 10, 29)], { w: 2.2 * k, tin: 0.1, tout: 0.2, vary: 0.4 });
  // moustache and mouth
  const mx = yw * 10; shape(ctx, [T(mx - 22, 33), T(mx - 12, 28), T(mx, 31), T(mx + 12, 28), T(mx + 22, 33), T(mx + 14, 38), T(mx, 35), T(mx - 14, 38)], { fill: INK, w: 1.6 * k, vary: 0.2 });
  mouth(ctx, T, k, mx, 46, f.mouth || 'line');
  for (const [a, b] of [[[-34, 20], [-26, 38]], [[34, 20], [26, 38]]]) pen(ctx, [T(a[0], a[1]), T(b[0] + (a[0] < 0 ? 4 : -4), b[1] + 4)], { w: 1.2 * k, tin: 0.2, tout: 0.5, vary: 0 });
  for (const sw of (f.sweat || [])) sweat(ctx, ...T(sw[0], sw[1]), (sw[2] || 9) * k, sw[3] || 0);
}

// ---------- hands ----------
// side view, fingers spread; kind 'girl' (sailor cuff) or 'man' (suit cuff, wristwatch). dir: angle (rad) the arm points to.
function hand(ctx, x, y, s, dir, kind, o) {
  o = o || {}; const T = mkT(x, y, s * 100, dir), k = s, sp = o.spread == null ? 1 : o.spread;
  // sleeve from -x to the wrist
  const sleeve = kind === 'man' ? [[-150, -22], [-34, -17], [-30, 21], [-150, 28]] : [[-150, -20], [-36, -15], [-34, 18], [-150, 24]];
  shape(ctx, sleeve.map(p => T(...p)), { fill: kind === 'man' ? INK : PAPER, sharp: true, w: 2.6 * k, vary: 0.8 });
  if (kind === 'girl') { // cuff band and a thin stripe
    shape(ctx, [[-62, -20], [-36, -15], [-34, 18], [-62, 21]].map(p => T(...p)), { fill: INK, sharp: true, w: 1.4 * k });
    pen(ctx, [T(-56, -17), T(-54, 20)], { w: 1.8 * k, color: PAPER, tin: 0, tout: 0, vary: 0 });
  } else {
    shape(ctx, [[-40, -17], [-30, -15], [-28, 20], [-38, 22]].map(p => T(...p)), { fill: PAPER, sharp: true, w: 1.6 * k });
    shape(ctx, ellipsePts(...T(-27, 0), 5 * k, 5 * k, 0, 10), { w: 1.4 * k }); // watch face
  }
  // palm and fingers
  const palm = [[-34, -14], [-4, -17], [14, -13], [18, 13], [-4, 18], [-34, 17]].map(p => T(...p));
  shape(ctx, palm, { w: 2.4 * k, vary: 0.8 });
  const fing = [[0, 38, -11, 12.5, -0.24], [0, 46, -3.5, 12.5, -0.08], [0, 43, 4, 12.5, 0.08], [0, 34, 11, 11.5, 0.22]];
  // thumb
  shape(ctx, [[-6, 14], [10, 22], [30, 30], [38, 38], [30, 44], [10, 36], [-12, 22]].map(p => T(...p)), { w: 2.2 * k, vary: 0.8 });
  fing.forEach(([sx, len, base, wd, ang]) => {
    const a = ang * sp + 0.12, bx = 14, by = base, ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len + 0, nx = -Math.sin(a), ny = Math.cos(a), w = wd * 0.5;
    shape(ctx, [[bx, by - w], [ex - 4 * Math.cos(a) + nx * -w * 0.8, ey - w * 0.8], [ex + 3 * Math.cos(a), ey], [ex + 0 - nx * w * 0.8 + 0, ey + w * 0.8], [bx, by + w]].map(p => T(...p)), { w: 2.1 * k, vary: 0.8 });
  });
}

// ---------- runner (side view, facing right when dir=1) ----------
// A chain of joints becomes ONE outlined shape (no seams at knees and elbows).
function limb(ctx, J, Wd, o) {
  o = o || {}; const n = J.length, L = [], Rr = [];
  for (let i = 0; i < n; i++) {
    const a = J[Math.max(0, i - 1)], b = J[Math.min(n - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const nx = -ty, ny = tx, w = Wd[i] / 2; L.push([J[i][0] + nx * w, J[i][1] + ny * w]); Rr.push([J[i][0] - nx * w, J[i][1] - ny * w]);
  }
  const e = J[n - 1], d = J[n - 2], ang = Math.atan2(e[1] - d[1], e[0] - d[0]), r = Wd[n - 1] / 2;
  const cap = [[e[0] + Math.cos(ang) * r * 1.02, e[1] + Math.sin(ang) * r * 1.02]];
  const s0 = J[0], s1 = J[1], a0 = Math.atan2(s0[1] - s1[1], s0[0] - s1[0]), r0 = Wd[0] / 2, cap0 = [[s0[0] + Math.cos(a0) * r0 * 1.0, s0[1] + Math.sin(a0) * r0 * 1.0]];
  const pts = L.concat(cap).concat(Rr.slice().reverse()).concat(cap0);
  return shape(ctx, pts, Object.assign({ w: o.w || 2.6, vary: 0.8, fill: PAPER, seed: o.seed || 3 }, o));
}
// o: {x, y (hip), s, ph (0..1 phase), lean (rad), dir, face, headS}
function runner(ctx, o) {
  const s = o.s || 1, dir = o.dir || 1, ph = o.ph || 0, lean = o.lean == null ? 0.28 : o.lean, w = Math.max(1.2, 2.5 * s);
  const P = (x, y) => [o.x + x * s * dir, o.y + y * s];
  const ang = (p, len, a) => [p[0] + Math.sin(a) * len * s * dir, p[1] + Math.cos(a) * len * s];
  const phi = ph * TAU;
  const legJ = (side) => { const q = phi + side * Math.PI, th = 0.95 * Math.sin(q) + 0.12, knee = 0.3 + 1.2 * (0.5 + 0.5 * Math.sin(q - 1.4)); const hip = P(0, 0), kn = ang(hip, 44, th), an = ang(kn, 46, th - knee), toe = ang(an, 17, th - knee + 1.45); return { hip, kn, an, toe, th, kneeA: th - knee }; };
  const armJ = (side, sh) => { const q = phi + side * Math.PI + Math.PI, th = 0.95 * Math.sin(q) - 0.1, el = 1.05 + 0.5 * (0.5 + 0.5 * Math.sin(q - 1)); const e1 = ang(sh, 28, th), wr = ang(e1, 27, th + el); return { sh, e1, wr, a: th + el }; };
  const hip = P(0, 0), nk = [hip[0] + Math.sin(lean) * 52 * s * dir, hip[1] - Math.cos(lean) * 52 * s], sh = [nk[0] - Math.sin(lean) * 3 * s * dir, nk[1] + Math.cos(lean) * 5 * s];
  const back = legJ(1), front = legJ(0), aB = armJ(1, sh), aF = armJ(0, sh);
  const doLeg = (l) => {
    const mid = [(l.kn[0] + l.an[0]) / 2 - Math.cos(l.kneeA) * 2.6 * s * dir * 0, (l.kn[1] + l.an[1]) / 2];
    limb(ctx, [l.hip, l.kn, mid, l.an], [19 * s, 14.5 * s, 14 * s, 8.6 * s], { w });
    // sock band and shoe
    const t0 = l.an, d = Math.atan2(l.toe[1] - l.an[1], (l.toe[0] - l.an[0]) * dir), fx = Math.cos(l.kneeA + 1.45), fy = Math.sin(l.kneeA + 1.45);
    const shoe = [[t0[0] - 5 * s * dir, t0[1] - 5 * s], [t0[0] + 6 * s * dir, t0[1] - 4 * s], [l.toe[0] + 9 * s * dir, l.toe[1] + 1 * s], [l.toe[0] + 9 * s * dir, l.toe[1] + 6 * s], [t0[0] - 8 * s * dir, l.toe[1] + 6 * s - 1 * s]];
    shape(ctx, shoe, { fill: INK, w, vary: 0.2 });
    const sb = ang(l.kn, 31, l.kneeA); tone(ctx, [[sb[0] - 9 * s, sb[1] - 3 * s], [sb[0] + 9 * s, sb[1] - 3 * s], [t0[0] + 9 * s, t0[1] - 2 * s], [t0[0] - 9 * s, t0[1] - 2 * s]], { k: 'solid' });
    pen(ctx, [[l.an[0] - 8 * s * dir, l.an[1] - 9 * s], [l.an[0] + 8 * s * dir, l.an[1] - 10 * s]], { w: 1.3 * s, color: PAPER, tin: 0, tout: 0, vary: 0 });
  };
  const doArm = (a) => {
    limb(ctx, [a.sh, a.e1, a.wr], [13 * s, 10.5 * s, 7.4 * s], { w });
    const fa = Math.atan2(a.wr[1] - a.e1[1], a.wr[0] - a.e1[0]);
    shape(ctx, ellipsePts(a.wr[0] + Math.cos(fa) * 5 * s, a.wr[1] + Math.sin(fa) * 5 * s, 7 * s, 5.6 * s, fa, 14), { w: w * 0.95, vary: 0.8 });
    pen(ctx, [[a.wr[0] + Math.cos(fa) * 3 * s, a.wr[1] + Math.sin(fa) * 3 * s - 2 * s], [a.wr[0] + Math.cos(fa) * 9 * s, a.wr[1] + Math.sin(fa) * 9 * s - 2 * s]], { w: 1.2 * s, tin: 0, tout: 0, vary: 0 });
  };
  doArm(aB); doLeg(back);
  // torso: waist narrower than chest and hip, one outline
  const mid = [(hip[0] + nk[0]) / 2, (hip[1] + nk[1]) / 2];
  limb(ctx, [[hip[0], hip[1] - 3 * s], mid, sh], [21 * s, 16 * s, 21 * s], { w, seed: 5 });
  // pleated skirt: solid black flare that swings with the stride
  const sw = Math.sin(phi) * 6;
  shape(ctx, [P(-12, -9), P(12, -9), P(27 + sw, 24), P(16, 31 + Math.abs(sw) * 0.2), P(4, 26), P(-8, 30), P(-24 - sw, 22)], { fill: INK, sharp: true, w, vary: 0.2 });
  for (let i = 0; i < 3; i++) pen(ctx, [P(-7 + i * 8, -3), P(-14 + i * 14 + sw * 0.9, 21)], { w: 1.1 * s, color: PAPER, tin: 0.1, tout: 0.5, vary: 0 });
  doLeg(front);
  // sailor collar and ribbon
  shape(ctx, [[sh[0] - 13 * s * dir, sh[1] - 2 * s], [sh[0] + 7 * s * dir, sh[1] + 0 * s], [sh[0] + 4 * s * dir, sh[1] + 19 * s], [sh[0] - 12 * s * dir, sh[1] + 9 * s]], { fill: INK, sharp: true, w: w * 0.7, vary: 0.2 });
  pen(ctx, [[sh[0] - 9 * s * dir, sh[1] + 3 * s], [sh[0] + 1 * s * dir, sh[1] + 12 * s]], { w: 1 * s, color: PAPER, tin: 0.1, tout: 0.1, vary: 0 });
  shape(ctx, [[sh[0] + 5 * s * dir, sh[1] + 9 * s], [sh[0] + 17 * s * dir, sh[1] + 13 * s], [sh[0] + 7 * s * dir, sh[1] + 18 * s]], { fill: INK, sharp: true, w: w * 0.5 });
  doArm(aF);
  // head
  const hs = (o.headS || 27) * s, hc = [nk[0] + Math.sin(lean) * 15 * s * dir, nk[1] - Math.cos(lean) * 17 * s];
  ctx.save(); if (dir < 0) { ctx.translate(hc[0], 0); ctx.scale(-1, 1); ctx.translate(-hc[0], 0); }
  girlHead(ctx, hc[0], hc[1] - 2 * s, hs * 1.55, Object.assign({ yaw: 0.55, rot: lean * 0.6, eye: 0.7, mouth: 'open', brow: -0.4 }, o.face || {}));
  ctx.restore();
  return { hip, nk, hc };
}

// ---------- pineapple bun ----------
function bun(ctx, x, y, s, o) {
  o = o || {}; const T = mkT(x, y, s * 100, o.rot || 0), k = s;
  const body = [[-78, 12], [-74, -14], [-56, -38], [-28, -52], [4, -56], [34, -50], [60, -34], [76, -10], [80, 14], [60, 30], [0, 34], [-60, 30]].map(p => T(...p));
  ctx.save();
  if (o.cut) { const sd0 = o.cut === 'L' ? -1 : 1; pathPoly(ctx, [T(sd0 * 200, -200), T(0, -200), T(0, 200), T(sd0 * 200, 200)]); ctx.clip(); }
  const bs = shape(ctx, body, { w: 3.4 * k, vary: 0.85, seed: 2 });
  ctx.save(); pathPoly(ctx, bs); ctx.clip();
  // crust lattice: diagonal cross hatch on the dome
  for (let i = -9; i <= 9; i++) {
    pen(ctx, [T(i * 12 - 30, -70), T(i * 12 + 50, 44)], { w: 1.7 * k, tin: 0, tout: 0, vary: 0.2, wob: 0.2 });
    pen(ctx, [T(i * 12 + 50, -70), T(i * 12 - 30, 44)], { w: 1.7 * k, tin: 0, tout: 0, vary: 0.2, wob: 0.2 });
  }
  // shadow side
  tone(ctx, [T(20, -60), T(90, -60), T(90, 40), T(-80, 40), T(-80, 16), T(30, 16)], { k: 'dot', pitch: 4.2, pct: 0.55, ang: 45 });
  tone(ctx, [T(-90, 20), T(90, 20), T(90, 40), T(-90, 40)], { k: 'solid' });
  pen(ctx, [T(-60, -30), T(-40, -44), T(-14, -50)], { w: 5.5 * k, color: PAPER, tin: 0.2, tout: 0.4, vary: 0 });
  if (o.cut) { // clean slice: a narrow white cut face with a ruled edge and fine crumb
    const sd = o.cut === 'L' ? -1 : 1;
    fillPoly(ctx, [T(0, -70), T(sd * 5, -70), T(sd * 5, 40), T(0, 40)], PAPER);
    tone(ctx, [T(0, -70), T(sd * 5, -70), T(sd * 5, 40), T(0, 40)], { k: 'sand', pitch: 3, pct: 0.3, seed: 9 });
    pen(ctx, [T(0, -60), T(0, 30)], { w: 2.8 * k, tin: 0.02, tout: 0.02, vary: 0 });
  }
  ctx.restore();
  ctx.restore();
  pen(ctx, [T(-66, 24), T(0, 29), T(66, 24)], { w: 2.2 * k, tin: 0.2, tout: 0.2, vary: 0.2 });
}

G.CH = { mkT, girlHead, manHead, hand, runner, bun, eye, mouth, fillPoly };
})(window);
