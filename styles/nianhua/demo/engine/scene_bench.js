// scene_bench.js: scenes A (the key block), B (five colour blocks) and F (the bench again).
import { clamp, lerp, seg, ss, eio, eo, ei, back, track, hash } from '/core/lib.js';
import { mk, TEX, COL, PAPER } from './core.js';
import { SW, SH, camSet, toScreen, worldFill, softShadow, vignette, sweepCopy, tinted, plank, label } from './stage.js';
import { A, P, REGISTER_ZOOM, RING_CARP, RING_LOTUS, S as TS, F } from '../timeline.js';

export const SC = 0.84;                          // world units per design unit
export const SHEET_B = [700, 0];                 // where the sheet rests in scene B
export const BENCH_X = 1330;

// ------------------------------------------------------------------ cameras
export const camA = track([
  [0, [60, 0, .8]], [A.thump, [90, 10, .8]], [3.5, [70, -10, .9]], [6.0, [20, 0, .98]], [7.4, [0, 90, 1.16]], [8.9, [10, 0, 1.1]],
  [9.4, [40, 0, 1.06]], [10.0, [420, 0, .98]], [10.375, [880, 0, .92]]]);
export const camB = track([
  [10.375, [880, 0, .92]], [11.6, [900, 0, 1.0]], [13.0, [820, -40, 1.12]], [13.6, [770, -110, 1.45]], [14.6, [780, -90, 1.52]],
  [15.8, [880, 10, 1.1]], [17.4, [740, 170, 1.3]], [18.6, [750, 180, 1.36]], [19.3, [790, 215, 1.3]], [20.4, [850, 90, 1.14]],
  [21.4, [880, 20, 1.0]], [22.4, [690, -150, 2.0]], [24.6, [740, -170, 2.0]], [25.3, [880, -20, 1.1]], [26.0, [800, -50, 1.3]],
  [26.6, [850, 0, 1.45]], [27.7, [860, 20, 1.5]], [28.3, [560, -190, 1.5]], [29.8, [570, -190, 1.5]], [31.0, [900, 0, .82]]]);

// ------------------------------------------------------------------ shared
export function makeProps(child) {
  const K = child.layer('key');
  const props = { K, keyDry: tinted(K, '#46290f'), keyShadow: tinted(K, 'rgba(0,0,0,0.9)'), keyGhost: tinted(K, '#3b3026'), keyGloss: tinted(K, '#aab0b8'), tmp: mk(K.width, K.height), tmp2: mk(K.width, K.height), thumbs: [] };
  // pass blocks for the bench: a wooden plank with the pass drawn on it, reversed
  P.forEach((p) => {
    const L = child.layer(p.pass), w = 340, h = 430;
    const wood = mk(w + 40, h + 50), wx = wood.getContext('2d');
    plank(wx, (w + 40) / 2, (h + 30) / 2, w, h, 'pear', 18);
    const ink = mk(w + 40, h + 50), ix = ink.getContext('2d');
    ix.save(); ix.translate((w + 40) / 2, (h + 30) / 2); const k = (h * .88) / (L.height); ix.scale(-k, k); ix.drawImage(L, -L.width / 2, -L.height / 2); ix.restore();
    props.thumbs.push({ wood, ink, tmp: mk(w + 40, h + 50) });
  });
  return props;
}

function table(ctx, cam) {
  ctx.fillStyle = '#3a2618'; ctx.fillRect(cam.x - 1700, cam.y - 1100, 3400, 2200);
  worldFill(ctx, 'table', cam.x - 1700, cam.y - 1100, 3400, 2200, 2.4);
}

export function drawSheet(ctx, pr, cv, x, y, { sx = 1, lift = 0, rot = 0, sc = SC, shadow = true, extra } = {}) {
  const w = pr.PW * sc, h = pr.PH * sc;
  ctx.save(); ctx.translate(x, y - lift * 36); ctx.rotate(rot); ctx.scale(sx * (1 + lift * .05), 1 + lift * .05);
  if (shadow) softShadow(ctx, -w / 2 + 6 + lift * 26, -h / 2 + 8 + lift * 40, w, h, 12 + lift * 26, .55);
  ctx.drawImage(cv, -w / 2, -h / 2, w, h);
  if (extra) extra(ctx, w, h);
  ctx.restore();
}

function roller(ctx, x, y = 0, len = 1040) {
  ctx.save(); ctx.translate(x, y);
  const g = ctx.createLinearGradient(-36, 0, 36, 0); g.addColorStop(0, '#16110d'); g.addColorStop(.3, '#4a3d33'); g.addColorStop(.5, '#6a5b4d'); g.addColorStop(.75, '#2d241d'); g.addColorStop(1, '#0e0a07');
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-30 + 18, -len / 2 + 22, 72, len);
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-36, -len / 2, 72, len, 30); ctx.fill();
  ctx.fillStyle = '#7b5530'; ctx.fillRect(-8, -len / 2 - 70, 16, 80); ctx.fillRect(-8, len / 2 - 10, 16, 80);   // axle handles
  ctx.restore();
}

function baren(ctx, x, y, r = 52) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(10, 14, r, r * .95, 0, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(-r * .3, -r * .3, 4, 0, 0, r); g.addColorStop(0, '#d8c28f'); g.addColorStop(.7, '#a98c55'); g.addColorStop(1, '#6e5530');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(50,30,10,.6)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = 'rgba(70,45,15,.45)'; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(0, 0, r * (.25 + i * .12), 0, 7); ctx.stroke(); }
  ctx.fillStyle = '#4a3820'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill();            // knot of the wrapper
  ctx.restore();
}

function slab(ctx, x, y) {
  ctx.save(); ctx.translate(x, y);
  softShadow(ctx, -200, -130, 400, 280, 16, .5);
  const g = ctx.createLinearGradient(-200, -130, 200, 150); g.addColorStop(0, '#5b5f66'); g.addColorStop(1, '#2b2e33');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-200, -140, 400, 280, 30); ctx.fill();
  ctx.fillStyle = '#0d0b0a'; ctx.beginPath(); ctx.ellipse(0, 0, 150, 90, -.1, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.ellipse(-40, -30, 70, 18, -.15, 0, 7); ctx.fill();
  ctx.restore();
}

function bowl(ctx, x, y, col) {
  ctx.save(); ctx.translate(x, y);
  softShadow(ctx, -92, -80, 184, 170, 16, .5);
  ctx.fillStyle = '#d7cdb8'; ctx.beginPath(); ctx.arc(0, 0, 92, 0, 7); ctx.fill();
  ctx.strokeStyle = '#8a7e66'; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = '#2a64a8'; ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = '#3f6aa0'; ctx.beginPath(); ctx.arc(0, 0, 70, 0, 7); ctx.stroke(); ctx.restore();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 62, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(-20, -22, 26, 10, -.4, 0, 7); ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ scene A
function drawBlock(ctx, pr, pp, t, T = A) {
  const BW = 790, BH = 960, S = pr.S, kk = SC / S, pi = clamp(seg(t, T.ink0, T.ink1));
  plank(ctx, 0, 0, BW, BH, 'pear', 24);
  ctx.save(); ctx.scale(-kk, kk);
  ctx.globalAlpha = .5; ctx.drawImage(pp.keyShadow, -pp.K.width / 2 + 3, -pp.K.height / 2 + 5);
  ctx.globalAlpha = 1; ctx.drawImage(pp.keyDry, -pp.K.width / 2, -pp.K.height / 2);
  if (pi > 0) {
    sweepCopy(pp.tmp, pp.K, pi, 0, .06);
    ctx.drawImage(pp.tmp, -pp.K.width / 2, -pp.K.height / 2);
    const tg = sweepCopy(pp.tmp2, pp.keyGloss, pi, 0, .06); ctx.globalAlpha = .28; ctx.drawImage(tg, -pp.K.width / 2 - 1.5, -pp.K.height / 2 - 2.5); ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function drawA(ctx, t, cam, pr, pp, shake, T = A) {
  const S = pr.S;
  camSet(ctx, cam, shake); table(ctx, cam);
  // title strip printed on a paper slip, lying left of the block
  const tIn = ss(seg(t, T.titleIn, T.titleIn + .14));
  if (tIn > 0) {
    ctx.save(); ctx.translate(-690, -80); ctx.rotate(-.05); ctx.scale(1 + (1 - tIn) * .12, 1 + (1 - tIn) * .12); ctx.globalAlpha = tIn;
    label(ctx, ['Five Blocks', 'to a Door'], 0, 0, { size: 74, pad: 34, align: 'center', rot: 0 });
    ctx.restore();
  }
  slab(ctx, 640, 200);
  if (T !== A || t >= T.thump - .3) {            // the first block drops in from above, landing on the thump
    const dq = T === A ? seg(t, T.thump - .3, T.thump) : 1;
    ctx.save(); ctx.translate(0, -(1 - ei(dq)) * 700); if (dq < 1) { ctx.globalAlpha = 1; softShadow(ctx, -395 + 20, -480 + 60, 790, 960, 30, .35 * dq); }
    drawBlock(ctx, pr, pp, t, T); ctx.restore();
  }
  const pi = clamp(seg(t, T.ink0, T.ink1));
  // roller
  const rx = t < T.ink0 - .6 ? 640 : t < T.ink0 ? lerp(640, 430, ss(seg(t, T.ink0 - .6, T.ink0))) : t < T.ink1 ? lerp(430, -430, pi) : -430;
  const ry = t < T.ink1 ? 0 : -1300 * ei(seg(t, T.ink1, T.ink1 + .6));
  if (t < T.ink1 + .7) roller(ctx, rx, ry);
  // paper
  const pl = seg(t, T.paper - .55, T.paper);
  if (pl > 0 && t < T.travel1 + .01) {
    const flipP = clamp(seg(t, T.flip0, T.flip1)), th = Math.PI * ss(flipP), sx = Math.cos(th), land = ei(pl);
    const travel = ss(seg(t, T.travel0, T.travel1));
    const px = lerp(0, SHEET_B[0], travel), lift = Math.max(Math.sin(th), (1 - land) * 1.3, Math.sin(travel * Math.PI) * .6);
    const jump = t >= T.paper ? 1 + .018 * Math.exp(-(t - T.paper) * 12) * Math.cos((t - T.paper) * 40) : 1;
    ctx.save(); ctx.globalAlpha = Math.min(1, pl * 3);
    if (th < Math.PI / 2) {
      // back of the paper with the key lines coming through under the baren
      const pr_ = clamp(seg(t, T.rub0, T.rub1));
      drawSheet(ctx, pr, pr.paper(), px, 0, { sx: sx, lift, sc: SC * jump, extra: (c, w, h) => {
        if (pr_ > 0) {
          c.save(); c.scale(-SC / S, SC / S); const g = sweepCopy(pp.tmp, pp.keyGhost, pr_, Math.PI / 2, .1); c.globalAlpha = .38 + .42 * pr_; c.drawImage(g, -pp.K.width / 2, -pp.K.height / 2); c.restore();
        }
      } });
    } else {
      drawSheet(ctx, pr, pr.render(1, 0), px, 0, { sx: -sx, lift });
    }
    ctx.restore();
    // the baren
    if (t >= T.rub0 - .2 && t < T.rub1 + .3) {
      const q = clamp(seg(t, T.rub0, T.rub1)), by = lerp(-420, 420, q), bx = Math.sin(q * Math.PI * 9) * 280;
      const up = ss(seg(t, T.rub0 - .2, T.rub0)) * (1 - ss(seg(t, T.rub1, T.rub1 + .3)));
      ctx.globalAlpha = up; baren(ctx, bx, by); ctx.globalAlpha = 1;
    }
  }
}

// ------------------------------------------------------------------ scene B
function sheetState(t) {
  let done = 0, active = -1;
  P.forEach((p, i) => { if (t >= p.press + p.dur) done = i + 1; else if (t >= p.press && active < 0) active = i; });
  return { done, active };
}

export function drawB(ctx, t, cam, pr, pp, shake, vis = true) {
  camSet(ctx, cam, shake); table(ctx, cam);
  if (t < 14) drawBlock(ctx, pr, pp, 99);
  const { done, active } = sheetState(t);
  // bench: ink bowl (colour of the newest block) and finished-pass chips
  let cur = 0; P.forEach((q, i) => { if (t >= q.blockIn - .15) cur = i; });
  bowl(ctx, BENCH_X - 20, 290, COL[P[cur].pass]);
  P.forEach((q, i) => {
    const a = ss(seg(t, q.press + q.dur, q.press + q.dur + .25)); if (a <= 0) return;
    const cx = BENCH_X - 190 + i * 88, cy = -440, sc = 1 + .25 * (1 - a);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.rotate((hash(i * 4.4) - .5) * .2);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-34 + 4, -34 + 6, 72, 72); ctx.fillStyle = PAPER; ctx.fillRect(-36, -36, 72, 72);
    ctx.fillStyle = COL[q.pass]; ctx.beginPath(); ctx.arc(0, 0, 24, 0, 7); ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.strokeRect(-36, -36, 72, 72); ctx.restore();
  });
  // block thumbnails: the next block comes up from below while the used one leaves upwards
  for (let i = 0; i < P.length; i++) {
    const p = P[i], th = pp.thumbs[i], bIn = ss(seg(t, p.blockIn, p.blockIn + .4)), bOut = ss(seg(t, p.press + p.dur + .1, p.press + p.dur + .6));
    if (bIn <= 0 || bOut >= 1) continue;
    const by = lerp(560, -90, eo(bIn)) - bOut * 700, jb = t > p.blockIn + .4 ? Math.exp(-(t - p.blockIn - .4) * 14) * Math.cos((t - p.blockIn) * 50) * 4 : 0;
    ctx.save(); ctx.translate(BENCH_X, by + jb);
    softShadow(ctx, -185, -230, 370, 450, 20, .45);
    ctx.drawImage(th.wood, -(th.wood.width) / 2, -(th.wood.height) / 2);
    const inkP = clamp(seg(t, p.blockIn + .35, p.blockIn + .95));
    if (inkP > 0) { sweepCopy(th.tmp, th.ink, inkP, 0, .12); ctx.drawImage(th.tmp, -th.wood.width / 2, -th.wood.height / 2); }
    ctx.restore();
  }
  // the sheet
  const S = pr.S;
  const off = active >= 0 ? 1 - ss(seg(t, P[active].press, P[active].press + P[active].dur + .5)) : 0;
  let pActive = active >= 0 ? clamp(seg(t, P[active].press, P[active].press + P[active].dur)) : 0;
  // just after a pass ends the mis-registration is still settling: handled by the next frame's cached composite
  const cv = pr.render(1 + done, pActive, active >= 0 ? P[active].dir : 0, active >= 0 ? off : 0, .2);
  const travel = ss(seg(t, A.travel0, A.travel1));   // sheet is still arriving at the start of B
  drawSheet(ctx, pr, cv, SHEET_B[0], 0, { lift: t < A.travel1 ? Math.sin(travel * Math.PI) * .2 : 0 });
  // the baren follows the front of the print
  if (active >= 0) {
    const q = P[active], pp_ = clamp(seg(t, q.press, q.press + q.dur)), dir = q.dir;
    const L = Math.abs(Math.cos(dir)) * pr.PW * SC + Math.abs(Math.sin(dir)) * pr.PH * SC, uF = lerp(-.2, 1, pp_);
    const ux = Math.cos(dir), uy = Math.sin(dir), along = (uF + .1 - .5) * L;
    const cross = Math.sin(pp_ * Math.PI * 7) * (Math.abs(ux) > .5 ? pr.PH * SC * .38 : pr.PW * SC * .38);
    const bx = SHEET_B[0] + ux * along - uy * cross, by_ = uy * along + ux * cross;
    ctx.globalAlpha = ss(seg(pp_, 0, .06)) * (1 - ss(seg(pp_, .94, 1)));
    baren(ctx, bx, by_, 58); ctx.globalAlpha = 1;
  }
  // brush rings: carp and lotus
  const ring = (a, b, dx, dy, rx, ry) => {
    const q = seg(t, a, a + .45), o = 1 - ss(seg(t, b - .3, b)); if (q <= 0 || o <= 0) return;
    ctx.save(); ctx.globalAlpha = o; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.strokeStyle = COL.ink;
    const ox = SHEET_B[0] + dx, oy = dy;
    const circ = (shift, col, wd) => { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); for (let i = 0; i <= 64 * q; i++) { const a_ = -Math.PI * .8 + i / 64 * Math.PI * 2.1; const rr = 1 + .05 * Math.sin(a_ * 3); const X = ox + shift + Math.cos(a_) * rx * rr, Y = oy + shift + Math.sin(a_) * ry * rr; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); };
    circ(4, COL.red, 9); circ(0, COL.ink, 7); ctx.restore();
  };
  ring(RING_CARP[0], RING_CARP[1], 168, 67, 100, 215);
  ring(RING_LOTUS[0], RING_LOTUS[1], -188, -252, 95, 115);
}
