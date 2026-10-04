/* The seven sheets of "Thirty Metres". Each sheet is a function of its local time lt (seconds, 120 bpm, beat = 0.5 s).
   draw(lt, R): R is a recorder (dry run) that collects hits and texts; with R == null it only paints.
   Every element arrives on a beat through p(beat, id, kind, jolt): 0 before the beat, then a drum-hit snap to 1. */
import { clamp, lerp, seg, TAU } from '/core/lib.js';
import * as E from './engine.js';
const { ink, cut, hit, onGrid, poly, circle, ring, heavy, numeral, numWidth, pt, runner, skeleton, pose, POSES, megaphone, arrow, arcPath } = E;
const D = E.D2R, W = 1920, H = 1080, BEAT_S = .5;

const mkp = (lt, R, sc) => (b, id, kind = 'slide', j = 10) => { if (R) R.hits.push({ b, id: `${sc}:${id ?? b}`, kind, j }); return hit(lt, b); };
const txt = (R, b, text, pts) => { if (R) R.texts.push({ b, text, pts }); };
const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const slide = (ox, oy, ang, q, dist) => [ox - Math.cos(ang * D) * dist * (1 - q), oy - Math.sin(ang * D) * dist * (1 - q)];
const drawAt = (k, x, y, rot, fn) => E.T(x, y, rot, () => fn(ink(k)));
const corners = (ox, oy, ang, u, v, w, h) => [pt(ox, oy, ang, u, v), pt(ox, oy, ang, u + w, v), pt(ox, oy, ang, u + w, v + h), pt(ox, oy, ang, u, v + h)];

// A bar on the diagonal frame, optionally with text. The box is first cleared from every plate (clean paper), printed in `col`;
// the letters are erased from the bar's own plate only, so small type has no colour fringes.
function labelBar(ox, oy, ang, u, v, len, hgt, col, txtStr, size, o = {}) {
  const box = g => onGrid(g, ox, oy, ang, gg => gg.fillRect(u, v, len, hgt));
  cut(box); box(ink(col));
  if (!txtStr) return;
  const g = ink(col); g.save(); g.globalCompositeOperation = 'destination-out';
  onGrid(g, ox, oy, ang, gg => { gg.fillStyle = gg.strokeStyle = '#000'; heavy(gg, txtStr, u + (o.pad ?? 26), v + hgt / 2 + size * .36, size, { w: o.w ?? .07, cond: o.cond ?? .86, track: o.track ?? 3 }); });
  g.restore();
}

/* ============ 1. title: megaphone, sound cone, disc, constructed 4x100, runner, ledger ============ */
function title(lt, R) {
  const A = -33, p = mkp(lt, R, 'a'), MS = 640, MX = 150, MY = 1020;
  const bell = [MX + Math.cos(A * D) * .39 * MS, MY + Math.sin(A * D) * .39 * MS];
  { const q = p(0, 'disc'); if (q > 0) drawAt('o', lerp(2200, 1520, q), 470, 0, g => circle(g, 0, 0, 250 * (.7 + .3 * q))); }
  { const q = p(1, 'cone', 'cone'); if (q > 0) { const g = ink('r'), L = 3200 * q, h = 15; g.beginPath(); g.moveTo(bell[0], bell[1]);
      g.lineTo(bell[0] + Math.cos((A - h) * D) * L, bell[1] + Math.sin((A - h) * D) * L); g.lineTo(bell[0] + Math.cos((A + h * .8) * D) * L, bell[1] + Math.sin((A + h * .8) * D) * L); g.closePath(); g.fill(); } }
  { const q = p(1.5, 'rule', 'rule', 0); if (q > 0) cut(g => { g.save(); g.translate(bell[0], bell[1]); g.rotate((A - 2) * D); g.fillRect(150, -9, 2800 * q, 12); g.restore(); }); }
  { const q = p(2, 'mega'); if (q > 0) { const [x, y] = slide(MX, MY, A, q, 560); drawAt('k', x, y, A, g => megaphone(g, 0, 0, MS));
      cut(g => { g.save(); g.translate(x, y); g.rotate(A * D); g.fillRect(.26 * MS, -.17 * MS, .02 * MS, .34 * MS); g.fillRect(.30 * MS, -.17 * MS, .012 * MS, .34 * MS); g.restore(); }); } }
  { const hh = 235, wt = .17, str = '4x100', ox = 190, oy = 720; let u = 0;
    for (let i = 0; i < str.length; i++) {
      const q = p(3 + i * .5, 'n' + i), w = numWidth(str[i], hh);
      if (q > 0) onGrid(ink('k'), ox, oy, A, g => { g.save(); g.translate(0, (1 - q) * 300); numeral(g, str[i], u, -hh, hh, wt); g.restore(); });
      u += w + .14 * hh; }
    txt(R, 5, '4×100', corners(ox, oy, A, 0, -hh, u, hh)); }
  { const q = p(5.5, 'arc', 'type'); if (q > 0) { const g = ink('k'); g.save();
      const R0 = 270, ph = 'FOUR LEGS  ONE BATON', arc = arcPath(1520, 470, R0, 208), total = 150 * D * R0 * q + 1;
      let s = 0; const pts = [];
      for (const ch of ph) { const adv = E.textWidth(g, ch, 48, { track: 6 }) + 6; if (s + adv > total) break; const [x, y, a] = arc(s + adv / 2); pts.push([x, y]); if (ch !== ' ') heavy(g, ch, x, y, 48, { w: .07, align: 'center', ang: a }); s += adv; }
      g.restore(); if (R) { const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]); txt(R, 5.5, 'FOUR LEGS ONE BATON', [[Math.min(...xs) - 30, Math.min(...ys) - 50], [Math.max(...xs) + 30, Math.min(...ys) - 50], [Math.max(...xs) + 30, Math.max(...ys) + 30], [Math.min(...xs) - 30, Math.max(...ys) + 30]]); } } }
  { const q = p(6, 'bar1', 'type'); if (q > 0) { const [ox, oy] = slide(560, 1060, A, q, 500); labelBar(ox, oy, A, 0, -150, 880, 70, 'k', 'FOUR RUNNERS  ONE BATON', 52, { track: 6 });
      txt(R, 6, 'FOUR RUNNERS ONE BATON', corners(560, 1060, A, 0, -150, 880, 70)); } }
  { const q = p(6.5, 'bar2', 'type'); if (q > 0) { const [ox, oy] = slide(560, 1060, A, q, 500); labelBar(ox, oy, A, 40, -72, 700, 52, 'o', '30 METRES TO GET IT RIGHT', 33, { track: 4 });
      txt(R, 6.5, '30 METRES TO GET IT RIGHT', corners(560, 1060, A, 40, -72, 700, 52)); } }
  { const q = p(7, 'ledger', 'type'); if (q > 0) { const g = ink('k');
      onGrid(g, 130, 400, A, gg => { gg.fillRect(0, -62 * q, 26, 62 * q); heavy(gg, '100 + 100 + 100 + 100', 48, -12, 34, { track: 4 }); gg.fillRect(40, 14, 560 * q, 5); });
      txt(R, 7, '100 + 100 + 100 + 100', corners(130, 400, A, 48, -50, 520, 56)); } }
  { const q = p(8, 'runner', 'paper', 12); if (q > 0) { const [x, y] = slide(1400, 790, A, q, 700); E.T(x, y, -9, () => runner(ink('k'), pose(POSES.reach, POSES.drive, 1), 720, { shirt: 'r', shorts: 'o' })); } }
}

/* ============ 2. the box: a diagonal lane, the changeover zone, a hand-over ============ */
function box(lt, R) {
  const A = -26, p = mkp(lt, R, 'b'), O = [-120, 990], S = 470;
  const gO = (col, fn) => onGrid(ink(col), O[0], O[1], A, fn);
  const lp = (u, v, w, h) => corners(O[0], O[1], A, u, v, w, h);
  { const q = p(2.5, 'sun'); if (q > 0) circle(ink('r'), 1560, 190, 215 * q); }
  { const q = p(1, 'zone'); if (q > 0) { gO('o', g => g.fillRect(900, -760, 520, 1380 * q)); gO('k', g => { g.fillRect(900, -760, 14, 1380 * q); g.fillRect(1406, -760, 14, 1380 * q); }); } }
  { const q = p(0, 'lane'); gO('k', g => g.fillRect(-400, 120, 3600 * q, 140));
    if (q > .99) cut(g => onGrid(g, O[0], O[1], A, gg => { for (let u = 960; u < 2600; u += 150) gg.fillRect(u, 188, 70, 8); })); }
  { const q = p(10, 'lanetext', 'type'); if (q > .5) { const k = ink('k'); k.save(); k.globalCompositeOperation = 'destination-out';
      onGrid(k, O[0], O[1], A, gg => { gg.fillStyle = gg.strokeStyle = '#000'; heavy(gg, 'PASS IT IN THE BOX', 300, 216, 66, { track: 3 }); }); k.restore();
      txt(R, 10, 'PASS IT IN THE BOX', lp(300, 160, 600, 70)); } }
  { const q = p(2, 'ticks', 'rule', 0); if (q > 0) gO('k', g => { for (let i = 0; i <= 30; i++) { const x = 914 + i * 16, tall = i % 10 === 0; g.fillRect(x, 290, tall ? 7 : 3, (tall ? 80 : 36) * q); } }); }
  { const q = p(3.5, 'lab'); if (q > 0) { gO('k', g => { numeral(g, '20', 930, 410, 100, .2); numeral(g, '10', 1256, 410, 100, .2); }); gO('r', g => g.fillRect(1230, 290, 10, 140 * q));
      txt(R, 3.5, '20', lp(930, 410, 150, 100)); txt(R, 3.5, '10', lp(1256, 410, 150, 100)); } }
  { const q = p(3, 'num'); if (q > 0) { onGrid(ink('r'), O[0], O[1], A, g => { g.save(); g.translate(0, (1 - q) * -340); numeral(g, '30', 420, -520, 330, .19); g.restore(); }); txt(R, 3, '30', lp(420, -520, 450, 330)); } }
  // the hand-over: A (giver) and B (receiver) run along the lane; the baton hops hands on beat 9
  const gA = skeleton(POSES.give, S), gB = skeleton(POSES.take, S), gap = gA.fh[0] - gB.bh[0] + 86, y0 = 150 - S * .5 + 8;
  const qa = p(5, 'runA', 'paper'), qb = p(6, 'runB', 'paper'); p(9, 'swap', 'baton', 14);
  const exT = 4.5, run = ss(seg(lt, 2.7, exT)), uA = 880 + 150 * run + 90 * ss(seg(lt, exT, exT + 2.5));
  const away = ss(seg(lt, exT + .05, exT + 2.6)), uB = uA - 90 * ss(seg(lt, exT, exT + 2.5)) + gap + 100 * away;
  const legsB = pose(POSES.take, POSES.drive, ss(seg(lt, exT, exT + .7)));
  const PB = { ...legsB, fA: POSES.take.fA, fF: POSES.take.fF, bA: POSES.take.bA, bF: POSES.take.bF };
  const PA = pose(POSES.give, POSES.drive, ss(seg(lt, exT + .2, exT + 1.0)));
  if (qa > 0) E.T(O[0], O[1], A, () => E.T(uA - (1 - qa) * 700, y0, 0, () => runner(ink('k'), PA, S, { shirt: 'k', shorts: 'o' })));
  if (qb > 0) E.T(O[0], O[1], A, () => E.T(uB - (1 - qb) * 700, y0, 0, () => runner(ink('k'), PB, S, { shirt: 'r', shorts: 'k' })));
  { const sk = skeleton(PB, S), hop = ss(seg(lt, exT, exT + .25)), sa = skeleton(PA, S);
    const ax = uA + sa.fh[0] + 10, ay = y0 + sa.fh[1] + 2, bx = uB + sk.bh[0] + 40, by = y0 + sk.bh[1] + 2;
    if (qa > 0 && qb > 0) { const bxp = lerp(ax, bx, hop), byp = lerp(ay, by, hop);
      cut(g => onGrid(g, O[0], O[1], A, gg => { gg.save(); gg.translate(bxp, byp); gg.rotate(2 * D); gg.fillRect(-80, -14, 160, 28); gg.restore(); }));
      onGrid(ink('r'), O[0], O[1], A, g => { g.save(); g.translate(bxp, byp); g.rotate(2 * D); g.fillRect(-73, -8, 146, 16); g.restore(); }); } }
}
const boxCam = lt => ({ x: 900, y: 540, z: 1 + .03 * ss(seg(lt, 2.5, 8)) });

/* ============ 3. the zone as a quantity: 30 m, 20 before the line, 10 after ============ */
function zone(lt, R) {
  const A = -33, p = mkp(lt, R, 'c');
  { const q = p(0, 'ring'); if (q > 0) drawAt('o', 540, 560, 0, g => ring(g, 0, 0, 420 * q, 120 * q)); }
  { const q = p(1, 'wedge', 'cone'), g = ink('r'); if (q > 0) { const L = 3200 * q, bx = 100, by = 1040; g.beginPath(); g.moveTo(bx, by);
      g.lineTo(bx + Math.cos((A - 12) * D) * L, by + Math.sin((A - 12) * D) * L); g.lineTo(bx + Math.cos((A + 3) * D) * L, by + Math.sin((A + 3) * D) * L); g.closePath(); g.fill(); } }
  { const q = p(2.5, 'disc'); if (q > 0) { const gk = ink('k'); gk.save(); gk.translate(1600, 800); const Rr = 270 * q;
      E.halftone(gk, g => g.arc(0, 0, Rr, 0, TAU), [-Rr, -Rr, 2 * Rr, 2 * Rr], 17, 45, (x, y) => clamp(.74 - .66 * Math.hypot(x + 70, y + 70) / (Rr * 1.15)), .72); gk.restore(); } }
  { const q = p(2, 'num'); if (q > 0) { onGrid(ink('k'), 250, 800, A, g => { g.save(); g.translate(0, (1 - q) * 300); numeral(g, '30', 0, -430, 430, .17); g.restore(); }); txt(R, 2, '30', corners(250, 800, A, 0, -430, 560, 430)); } }
  { const O = [900, 1010], q = p(4, 'before', 'type'), q2 = p(4.5, 'after', 'type');
    labelBar(O[0], O[1], A, 0, -250, 600 * q, 110, 'o', q > .95 ? '20 M BEFORE THE LINE' : '', 42, { track: 3, pad: 28 });
    labelBar(O[0], O[1], A, 600, -250, 300 * q2, 110, 'k', q2 > .95 ? '10 M AFTER' : '', 42, { track: 3, pad: 28 });
    txt(R, 4, '20 M BEFORE THE LINE', corners(O[0], O[1], A, 0, -250, 600, 110)); txt(R, 4.5, '10 M AFTER', corners(O[0], O[1], A, 600, -250, 300, 110));
    const ql = p(5, 'line', 'rule', 0); if (ql > 0) onGrid(ink('r'), O[0], O[1], A, g => g.fillRect(594, -300, 12, 210 * ql)); }
  { const q = p(6, 'arrow', 'rule', 6); if (q > 0) { const [ox, oy] = slide(900, 1010, A, q, 500); onGrid(ink('k'), ox, oy, A, g => arrow(g, 0, -330, 920, 30, 120)); } }
  { const q = p(5.5, 'runner', 'paper', 12); if (q > 0) { const [x, y] = slide(1520, 840, A, q, 700); E.T(x, y, -9, () => runner(ink('k'), POSES.drive, 520, { shirt: 'o', shorts: 'r' })); } }
}

/* ============ 4. three exchanges: four runners, one baton, a red trail along the lane ============ */
const LANE4 = { O: [-80, 900], A: -20, L: [475, 950, 1425], EX: [3.5, 5.0, 6.5] };
function runnerU(i, lt) {                       // lane position of runner i (0..3) at lt
  const L = LANE4.L, e = LANE4.EX, g = 86, ease = (a, b, x0, x1) => lerp(x0, x1, ss(seg(lt, a, b)));
  if (i === 0) return lt < e[0] ? ease(2, e[0], 40, L[0] - 30) : ease(e[0], e[0] + 1.2, L[0] - 30, L[0] + 10);
  if (i === 1) return lt < e[0] ? ease(e[0] - 1, e[0], L[0] - 10, L[0] - 30 + g) : lt < e[1] ? ease(e[0], e[1], L[0] - 30 + g, L[1] - 30) : ease(e[1], e[1] + 1.2, L[1] - 30, L[1] + 10);
  if (i === 2) return lt < e[1] ? ease(e[1] - 1, e[1], L[1] - 10, L[1] - 30 + g) : lt < e[2] ? ease(e[1], e[2], L[1] - 30 + g, L[2] - 30) : ease(e[2], e[2] + 1.2, L[2] - 30, L[2] + 10);
  return lt < e[2] ? ease(e[2] - 1, e[2], L[2] - 10, L[2] - 30 + g) : ease(e[2], 8.0, L[2] - 30 + g, 1900);
}
function runnerP(i, lt) {
  const e = LANE4.EX, t0 = [2.2, e[0] - 1.3, e[1] - 1.3, e[2] - 1.3][i];
  let P = pose(POSES.stride, POSES.drive, ss(seg(lt, t0, t0 + .4)));
  const win = k => ss(seg(lt, e[k] - .7, e[k] - .25)) * (1 - ss(seg(lt, e[k] + .1, e[k] + .6)));
  if (i < 3) P = pose(P, POSES.give, win(i));
  if (i > 0) P = pose(P, POSES.take, win(i - 1));
  return P;
}
function exchanges(lt, R) {
  const A = LANE4.A, O = LANE4.O, p = mkp(lt, R, 'd'), L = LANE4.L, S = 380, y0 = 165 - S * .5;
  const gO = (col, fn) => onGrid(ink(col), O[0], O[1], A, fn);
  { const q = p(0, 'disc'); if (q > 0) drawAt('o', 1480, 330, 0, g => circle(g, 0, 0, 250 * q)); }
  { const q = p(0.5, 'ring', 'slide', 8); if (q > 0) drawAt('r', 300, 240, 0, g => ring(g, 0, 0, 200 * q, 34 * q)); }
  { const q = p(0, 'lane'); gO('k', g => g.fillRect(-100, 160, 2300 * q, 70)); }
  for (let k = 0; k < 3; k++) { const q = p(1 + k * .5, 'zone' + k, 'slide', 8); if (q > 0) { gO('o', g => g.fillRect(L[k] - 95, 90, 142, 250 * q)); gO('k', g => { g.fillRect(L[k] - 95, 90, 6, 250 * q); g.fillRect(L[k] + 41, 90, 6, 250 * q); }); } }
  for (let k = 0; k < 3; k++) { const q = p(3 + k * .5, 'line' + k, 'rule', 4); if (q > 0) gO('r', g => g.fillRect(L[k] - 5, 60, 10, 300 * q)); }
  for (let k = 0; k < 3; k++) { const q = p(6 + k, 'no' + k, 'slide', 8); if (q > 0) { gO('k', g => { g.save(); g.translate(0, (1 - q) * 120); numeral(g, String(k + 1), L[k] - 36, 262, 80, .2); g.restore(); }); txt(R, 6 + k, String(k + 1), corners(O[0], O[1], A, L[k] - 36, 262, 48, 80)); } }
  const holder = lt < LANE4.EX[0] ? 0 : lt < LANE4.EX[1] ? 1 : lt < LANE4.EX[2] ? 2 : 3;
  const qr = [p(4, 'r1', 'paper'), p(5, 'r2', 'paper'), p(6, 'r3', 'paper'), p(7.5, 'r4', 'paper')];
  const us = [0, 1, 2, 3].map(i => runnerU(i, lt)), trail = Math.max(40, us[holder]);
  { const q = p(2, 'trail', 'rule', 0); if (q > 0) gO('r', g => g.fillRect(40, 244, Math.min(trail, 1900) * q, 12)); }
  for (let i = 0; i < 4; i++) if (qr[i] > 0) { const u = us[i] - (1 - qr[i]) * 500; E.T(O[0], O[1], A, () => E.T(u, y0, 0, () => runner(ink('k'), runnerP(i, lt), S, { shirt: ['r', 'o', 'k', 'r'][i], shorts: ['o', 'k', 'r', 'o'][i], tone: .9 }))); }
  { const hand = (i, tlt) => { const sk = skeleton(runnerP(i, tlt), S), k = Math.min(i, 2), f = i < 3 ? ss(seg(tlt, LANE4.EX[k] - .7, LANE4.EX[k] - .25)) : 0;
      return [runnerU(i, tlt) + lerp(sk.bh[0], sk.fh[0], f) + lerp(40, 10, f), y0 + lerp(sk.bh[1], sk.fh[1], f) + 2]; };
    let b; if (holder === 0) b = hand(0, lt); else { const hop = ss(seg(lt, LANE4.EX[holder - 1], LANE4.EX[holder - 1] + .25)), a = hand(holder - 1, lt), c = hand(holder, lt); b = [lerp(a[0], c[0], hop), lerp(a[1], c[1], hop)]; }
    if (qr[0] > 0) { cut(g => onGrid(g, O[0], O[1], A, gg => { gg.save(); gg.translate(b[0], b[1]); gg.fillRect(-60, -12, 120, 24); gg.restore(); })); onGrid(ink('r'), O[0], O[1], A, g => { g.save(); g.translate(b[0], b[1]); g.fillRect(-54, -7, 108, 14); g.restore(); }); } }
  for (let k = 0; k < 3; k++) p(LANE4.EX[k] / BEAT_S, 'swap' + k, 'baton', 12);
  { const q = p(11, 'bar', 'type'); if (q > 0) { const [ox, oy] = slide(100, 470, A, q, 400); labelBar(ox, oy, A, 0, 0, 820, 74, 'k', 'THREE EXCHANGES A RACE', 50, { track: 5 });
      txt(R, 11, 'THREE EXCHANGES A RACE', corners(100, 470, A, 0, 0, 820, 74)); } }
}

/* ============ 5. the failure: the pass happens past the edge of the zone ============ */
function fail(lt, R) {
  const A = -26, p = mkp(lt, R, 'e'), O = [-260, 1040], S = 400;
  const gO = (col, fn) => onGrid(ink(col), O[0], O[1], A, fn);
  { const q = p(0, 'cut', 'cut', 30); if (q > 0) { circle(ink('r'), 1600, 230, 215);
      gO('o', g => g.fillRect(900, -760, 520, 1380)); gO('k', g => { g.fillRect(900, -760, 14, 1380); g.fillRect(1406, -760, 14, 1380); g.fillRect(-400, 120, 3600, 140); });
      cut(g => onGrid(g, O[0], O[1], A, gg => { for (let u = 960; u < 2600; u += 150) gg.fillRect(u, 188, 70, 8); })); } }
  { const q = p(3, 'cross', 'rule', 6); if (q > 0) gO('r', g => { g.save(); g.translate(1700, -40); g.rotate(45 * D); g.fillRect(-300 * q, -22, 600 * q, 44); g.rotate(-90 * D); g.fillRect(-300 * q, -22, 600 * q, 44); g.restore(); }); }
  const qa = p(1, 'runA', 'paper'), qb = p(1.5, 'runB', 'paper'), y0 = 150 - S * .5 + 8;
  const gA = skeleton(POSES.give, S), gB = skeleton(POSES.take, S), gap = gA.fh[0] - gB.bh[0] + 76, uA = 1580;
  if (qa > 0) E.T(O[0], O[1], A, () => E.T(uA - (1 - qa) * 700, y0, 0, () => runner(ink('k'), POSES.give, S, { shirt: 'k', shorts: 'o' })));
  if (qb > 0) E.T(O[0], O[1], A, () => E.T(uA + gap - (1 - qb) * 700, y0, 0, () => runner(ink('k'), POSES.take, S, { shirt: 'r', shorts: 'k' })));
  { const q = p(2, 'baton', 'baton', 14), fall = p(10, 'drop', 'knock', 16); if (q > 0 && qb > 0) {
      const bx = lerp(uA + gA.fh[0] + 20, uA + gap + gB.bh[0] + 40, q), by = y0 + gA.fh[1] + 2, ex = lerp(bx, 1700, fall), ey = lerp(by, 215, fall), rot = lerp(2, 80, fall);
      cut(g => onGrid(g, O[0], O[1], A, gg => { gg.save(); gg.translate(ex, ey); gg.rotate(rot * D); gg.fillRect(-72, -13, 144, 26); gg.restore(); }));
      onGrid(ink('r'), O[0], O[1], A, g => { g.save(); g.translate(ex, ey); g.rotate(rot * D); g.fillRect(-65, -7, 130, 14); g.restore(); }); } }
  { const q = p(5, 'out', 'type'); if (q > 0) { const [ox, oy] = slide(100, 560, A, q, 400); labelBar(ox, oy, A, 0, 0, 640, 80, 'k', 'OUTSIDE THE BOX', 58, { track: 5 }); txt(R, 5, 'OUTSIDE THE BOX', corners(100, 560, A, 0, 0, 640, 80)); } }
  { const q = p(7, 'dq', 'type'); if (q > 0) { const [ox, oy] = slide(190, 640, A, q, 400); labelBar(ox, oy, A, 0, 0, 560, 70, 'r', 'DISQUALIFIED', 50, { track: 5 }); txt(R, 7, 'DISQUALIFIED', corners(190, 640, A, 0, 0, 560, 70)); } }
}
const failTear = lt => 1 + 3.2 * Math.exp(-lt / 1.4);

/* ============ 6. the wall of people: a team, and the stand behind it ============ */
function wall(lt, R) {
  const A = -33, p = mkp(lt, R, 'f');
  { const q = p(0, 'disc'); if (q > 0) drawAt('o', lerp(2100, 1150, q), 470, 0, g => circle(g, 0, 0, 400 * (.7 + .3 * q))); }
  { const q = p(1, 'cone', 'cone'), g = ink('r'); if (q > 0) { const bx = 80, by = 1060, L = 3200 * q; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos((A - 16) * D) * L, by + Math.sin((A - 16) * D) * L); g.lineTo(bx + Math.cos((A + 3) * D) * L, by + Math.sin((A + 3) * D) * L); g.closePath(); g.fill(); } }
  const rows = [
    { n: 5, s: 230, x0: 480, dy: -380, dx: 190, pose: POSES.cheer, b0: 8, sh: ['k', 'r', 'o'], key: 'c' },
    { n: 5, s: 300, x0: 400, dy: -230, dx: 250, pose: POSES.cheer, b0: 6, sh: ['o', 'k', 'r'], key: 'b' },
    { n: 4, s: 420, x0: 330, dy: 0, dx: 330, pose: POSES.drive, b0: 4, sh: ['r', 'o', 'k', 'r'], key: 'a' }];
  const qs = rows.map(r => Array.from({ length: r.n }, (_, i) => p(r.b0 + i * .5, r.key + i, 'paper', 8)));
  for (let ri = 0; ri < 3; ri++) { const r = rows[ri];
    for (let i = 0; i < r.n; i++) { const q = qs[ri][i]; if (q <= 0) continue; const x = r.x0 + i * r.dx, y = 800 + r.dy - (x - 300) * .22 - (1 - q) * 500;
      E.T(x, y, -9, () => runner(ink('k'), r.pose, r.s, { shirt: r.sh[i % r.sh.length], shorts: r.sh[(i + 1) % r.sh.length], tone: .95 })); } }
  { const q = p(10, 'bar', 'type'); if (q > 0) { const [ox, oy] = slide(70, 460, A, q, 400); labelBar(ox, oy, A, 0, 0, 380, 66, 'k', 'ONE TEAM', 48, { track: 6 }); txt(R, 10, 'ONE TEAM', corners(70, 460, A, 0, 0, 380, 66)); } }
}
const wallCam = lt => ({ x: 960 + 30 * ss(seg(lt, 2, 8)), y: 540, z: 1 });

/* ============ 7. the card: the plates drift into register for the first time ============ */
function final(lt, R) {
  const A = -33, p = mkp(lt, R, 'g'), hh = 190;
  { const q = p(0, 'ring'); if (q > 0) drawAt('o', 1500, 420, 0, g => ring(g, 0, 0, 340 * q, 105 * q)); }
  { const q = p(1, 'wedge', 'cone'), g = ink('r'); if (q > 0) { const bx = 60, by = 1070, L = 3200 * q; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos((A - 11) * D) * L, by + Math.sin((A - 11) * D) * L); g.lineTo(bx + Math.cos((A + 3) * D) * L, by + Math.sin((A + 3) * D) * L); g.closePath(); g.fill(); } }
  { const q = p(4, 'w1'); if (q > 0) { onGrid(ink('k'), 150, 760, A, g => { g.save(); g.translate(0, (1 - q) * 320); numeral(g, 'THIRTY', 0, -hh, hh, .2); g.restore(); }); txt(R, 4, 'THIRTY', corners(150, 760, A, 0, -hh, 710, hh)); } }
  { const q = p(5, 'w2'); if (q > 0) { onGrid(ink('k'), 150, 760, A, g => { g.save(); g.translate(0, (1 - q) * 320); numeral(g, 'METRES', 40, 40, hh, .2); g.restore(); }); txt(R, 5, 'METRES', corners(150, 760, A, 40, 40, 850, hh)); } }
  { const q = p(6, 'baton', 'baton'); if (q > 0) { const [ox, oy] = slide(930, 930, A, q, 600);
      cut(g => onGrid(g, ox, oy, A, gg => gg.fillRect(0, -26, 800, 52))); onGrid(ink('r'), ox, oy, A, g => g.fillRect(14, -14, 772, 28)); } }
  { const q = p(7, 'bar', 'type'); if (q > 0) { const [ox, oy] = slide(1040, 990, A, q, 500); labelBar(ox, oy, A, 0, 0, 700, 66, 'k', 'PASS IT IN THE BOX', 46, { track: 4 }); txt(R, 7, 'PASS IT IN THE BOX', corners(1040, 990, A, 0, 0, 700, 66)); } }
  p(8, 'register', 'register', 0);
}
const finalReg = lt => 1 - ss(seg(lt, 3.4, 4.0));

export const SHEETS = [
  { id: 'title', draw: title, w0: 0, wd: 0, o: 0 },
  { id: 'box', draw: box, w0: 7, wd: 1, o: 5.5, cam: boxCam },
  { id: 'zone', draw: zone, w0: 15, wd: 1, o: 14 },
  { id: 'exchanges', draw: exchanges, w0: 22, wd: 1, o: 21 },
  { id: 'fail', draw: fail, w0: 30, wd: 0, o: 30, reg: failTear },
  { id: 'wall', draw: wall, w0: 38, wd: 1, o: 37, cam: wallCam },
  { id: 'final', draw: final, w0: 45, wd: 1, o: 44, reg: finalReg },
];
