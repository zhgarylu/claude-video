// "Why is the sky blue?": a pen-and-wash science explainer, 9:16. render(t) draws any frame, deterministically.
import { clamp, seg, ss, hash, TAU, eo, back } from '/core/lib.js';
import { INK, PAPER, ell, bez, quad, smooth, loop, blob, pen, dotted, wash, shape, paper, write, host, sun, molecule, photon, wavy, eye } from './ink.js';
import { DUR, EV, ev, LINES, DURS, S, E, SC, SCENES } from './timeline.js';
const LAND = new URLSearchParams(location.search).get('aspect') === '16x9';
const W = LAND ? 1920 : 1080, H = LAND ? 1080 : 1920, cv = document.getElementById('c'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
const pick = (v, l) => LAND ? l : v;                                                       // portrait value, landscape value
const HAND = 'Ma Shan Zheng', BOLD = 'ZCOOL QingKe HuangYou';
await Promise.all([document.fonts.load(`60px "${HAND}"`, '天空为啥是蓝的'), document.fonts.load(`60px "${BOLD}"`, '天空为啥是蓝的')]);
const COL = { violet: '#8f6bc9', blue: '#3f86d6', cyan: '#4cb7d1', green: '#6dbb6a', yellow: '#f0c93e', orange: '#ee8a3a', red: '#e0483f' };
const RAINBOW = [COL.violet, COL.blue, COL.cyan, COL.green, COL.yellow, COL.orange, COL.red];
let TX = [];
const txt = (id, text, x, y, o) => { const m = write(g, text, x, y, o); if ((o.p ?? 1) > .98 && (o.alpha ?? 1) > .5) TX.push({ id, text, x0: m.x0, y0: m.y0, x1: m.x1, y1: m.y1 }); };
const act = t => LINES.some(l => t >= S[l.id] && t < E[l.id]);                 // the host's mouth moves while anyone speaks
const talk = t => act(t) ? .25 + .75 * hash(Math.floor(t * 9) * 3.1) : 0;
const sceneAt = t => { let k = 0; SCENES.forEach((s, i) => { if (t >= SC[s]) k = i; }); return SCENES[k]; };

// ------------------------------------------------------------------ sound events (pushed once, up front)
for (const l of LINES) ev(S[l.id], 'voice', 1, { id: l.id });
ev(S.h1 - .1, 'pop', .8); ev(S.h2 + .3, 'sparkle', .7);
for (const s of SCENES.slice(1)) ev(SC[s] - .25, 'whoosh', .7);
ev(S.a1 + .2, 'pen', .8, { dur: 1.4 }); ev(S.a1 + 1.0, 'pop', .6); ev(S.a2 + .1, 'pen', .6, { dur: 1.2 }); for (let i = 0; i < 6; i++) ev(S.a2 + .3 + i * .2, 'pop', .35);
ev(S.a3 + .4, 'boing', .6); ev(S.a3 + 1.2, 'boing', .5); ev(S.a3 + 2.1, 'boing', .5); ev(S.a3 + 3.4, 'boing', .5);
ev(S.a4 + .3, 'pop', .7); ev(S.a4 + 2.7, 'ding', .8);
ev(S.q1 + .2, 'pop', .8); ev(S.q1 + 1.2, 'ding', .6, { k: -3 });
for (const id of ['r1', 'r2', 'r3']) { ev(S[id] + .1, 'pen', .7, { dur: 1.2 }); ev(S[id] + 1.4, 'pop', .5); }
ev(S.r4 + .3, 'stamp', 1);
ev(S.s1 + .2, 'pop', .7); ev(S.s2 + .6, 'pen', .6, { dur: 1.2 }); for (let i = 0; i < 5; i++) ev(S.s2 + 2.0 + i * .5, 'boing', .35);
ev(S.s3 + .2, 'sparkle', .9); ev(E.s3 + .3, 'ding', .7);

// ------------------------------------------------------------------ pieces
function sketchCloud(x, y, s, p, t, seed, c) {
  const pts = loop([[-110, 20], [-100, -20], [-60, -40], [-30, -70], [20, -66], [50, -36], [100, -40], [128, -6], [112, 24], [40, 34], [-40, 30]].map(([a, b]) => [x + a * s, y + b * s]), 6);
  wash(g, pts, { col: '#ffffff', a: .95, p: c, solid: true, rim: false, dx: 0, dy: 0 }); pen(g, pts, { w: 3.5, p, t, seed });
}
function ground(y0, p, c, t, col = '#a9cb8c') {
  const top = smooth([[-20, y0 + 40], [220, y0 + 10], [520, y0 + 30], [820, y0 - 10], [1100, y0 + 20]], 10), poly = [...top, [1100, H], [-20, H]];
  wash(g, poly, { col, a: .75, p: c, dx: 0, dy: 3 }); pen(g, top, { w: 5, p, t, seed: 77 });
}
function label(id, text, x, y, o = {}) { const k = o.p ?? 1; if (k > 0) txt(id, text, x, y, { font: HAND, size: 54, ...o }); }
function arrow(a, b, p, o = {}) {
  const pts = o.bend ? quad(a, o.bend, b) : [a, b];
  pen(g, pts, { w: 4, p, t: o.t || 0, seed: o.seed || 4, col: o.col || INK });
  if (p > .95) { const q = pts[pts.length - 2] || a, ang = Math.atan2(b[1] - q[1], b[0] - q[0]); pen(g, [[b[0] - Math.cos(ang - .45) * 24, b[1] - Math.sin(ang - .45) * 24], b, [b[0] - Math.cos(ang + .45) * 24, b[1] - Math.sin(ang + .45) * 24]], { w: 4, p: 1, t: o.t || 0, seed: (o.seed || 4) + 1, col: o.col || INK }); }
}

// ------------------------------------------------------------------ scene A: the hook
function sceneA(t) {
  const u = t - SC.A;
  paper(g, W, H, t);
  const SKY = pick([540, 380, 470, .85], [1290, 330, 520, .8]), sky = blob(SKY[0], SKY[1], SKY[2], 4, .1, 10).map(([x, y]) => [x, (y - SKY[1]) * SKY[3] + SKY[1]]);
  wash(g, sky, { col: '#74b8e8', a: .6, p: seg(u, .05, 1.8), dx: 6, dy: 4 });
  for (const [x, y, s, a, b] of pick([[250, 560, 1.0, .5, 1.6], [830, 300, .8, .7, 1.8], [700, 620, .7, .9, 2.0]], [[880, 560, 1.0, .5, 1.6], [1700, 200, .8, .7, 1.8], [1500, 640, .7, .9, 2.0]])) { const p = seg(u, a, b); if (p > 0) sketchCloud(x, y, s, p, t, Math.floor(x), p); }
  ground(pick(1400, 830), seg(u, .2, 1.3), seg(u, .8, 2.0), t);
  host(g, { x: pick(340, 430), y: pick(1090, 560), s: pick(1.2, 1.3), pose: u < 3.6 ? 'point' : 'wave', talk: talk(t), look: u < 3.6 ? [.4, -1] : [0, 0], brow: u < 3.6 ? .3 : 0, p: seg(u, .15, 1.9), t, flip: 1 });
  const tp = seg(u, .55, 2.0);
  txt('title1', '天空为啥', SKY[0], pick(330, 300), { font: BOLD, size: pick(150, 170), align: 'center', p: tp, halo: 26 });
  txt('title2', '是蓝的？', SKY[0], pick(500, 490), { font: BOLD, size: pick(150, 170), align: 'center', p: seg(u, 1.1, 2.5), halo: 26, col: '#245d9f' });
  // comments float by like a chat
  const words = pick([['我！', 0, 420, 40], ['我也想知道', .7, 640, 36], ['老师我知道！', 1.4, 760, 36], ['+1', 2.1, 560, 44], ['不知道', 2.7, 850, 36]], [['我！', 0, 140, 40], ['我也想知道', .7, 640, 36], ['老师我知道！', 1.4, 740, 36], ['+1', 2.1, 90, 44], ['不知道', 2.7, 790, 36]]);
  for (const [w, d, y, sz] of words) { const q = u - (S.h1 - SC.A) - 1.2 - d; if (q > 0 && q < 8) { const x = W + 20 - q * pick(140, 230); txt('dm_' + w, w, x, y, { font: HAND, size: sz + 18, col: '#4a443c', alpha: 1, p: 1 }); } }
}

// ------------------------------------------------------------------ scene B: scattering
const MOL = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) MOL.push(pick([190 + c * 140 + (r % 2) * 70, 620 + r * 120, 100 + r * 6 + c], [660 + c * 118 + (r % 2) * 59, 250 + r * 112, 100 + r * 6 + c]));
const BOUNCE = pick([[500, 520], [420, 640], [560, 730], [350, 790], [640, 880], [300, 960], [470, 1060], [330, 1200]], [[700, 190], [690, 300], [820, 360], [700, 420], [900, 470], [740, 540], [880, 610], [800, 720]]);
const REDP = pick([[470, 520], [640, 1080]], [[640, 190], [880, 700]]), EYE = pick([540, 1290, 1.5], [1180, 830, 1.1]), AIR = pick([540, 800, 470, 12, .62, 780], [990, 418, 400, 12, .55, 418]);
function along(path, q) { const L = []; let tot = 0; for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); L.push(d); tot += d; } let s = clamp(q) * tot; for (let i = 0; i < L.length; i++) { if (s <= L[i]) { const k = s / L[i]; return [path[i][0] + (path[i + 1][0] - path[i][0]) * k, path[i][1] + (path[i + 1][1] - path[i][1]) * k, Math.atan2(path[i + 1][1] - path[i][1], path[i + 1][0] - path[i][0]), i]; } s -= L[i]; } const n = path.length; return [path[n - 1][0], path[n - 1][1], 0, n - 2]; }
function sceneB(t) {
  const u = t - SC.B; paper(g, W, H, t);
  const a1 = S.a1 - SC.B, a2 = S.a2 - SC.B, a3 = S.a3 - SC.B, a4 = S.a4 - SC.B;
  const SUN = pick([190, 250], [170, 230]); sun(g, { x: SUN[0], y: SUN[1], r: 62, p: seg(u, a1 - .2, a1 + 1.0), t });
  // seven colours bundled into one beam
  const bp = seg(u, a1 + .5, a1 + 1.6);
  RAINBOW.forEach((c, i) => { const o = (i - 3) * 8; pen(g, ...pick([[[255 + o * .3, 290 - o * .9], [520 + o * .3, 460 - o * .9]]], [[[235 + o * .3, 265 - o * .9], [610 + o * .3, 200 - o * .9]]]), { w: 5, col: c, p: bp, t, seed: 20 + i, amp: .6 }); });
  label('l_sun', '太阳光 = 七种颜色', pick(40, 60), pick(110, 100), { size: 56, p: seg(u, a1 + .3, a1 + 1.7), col: INK });
  // the air
  const ap = seg(u, a2 - .1, a2 + .9);
  wash(g, blob(AIR[0], AIR[1], AIR[2], AIR[3], .06, 10).map(([x, y]) => [x, (y - AIR[1]) * AIR[4] + AIR[5] - (AIR[1] - AIR[1])]), { col: '#dfe9f6', a: .55, p: ap, dx: 0, dy: 0, rim: false });
  MOL.forEach(([x, y, sd], i) => { const q = seg(u, a2 + .15 + i * .06, a2 + .55 + i * .06); if (q > 0) molecule(g, x, y, { p: q, t, seed: sd, hit: 0 }); });
  label('l_air', '空气分子', pick(40, 400), pick(1090, 600), { size: 56, p: seg(u, a2 + .5, a2 + 1.5) });
  // wavelength legend
  const lp = seg(u, a3 - .1, a3 + 1.2);
  pen(g, wavy(...pick([610, 140, 960, 140], [1420, 190, 1800, 190]), 22, 14, t * 6), { w: 6, col: COL.blue, p: lp, t, seed: 31, amp: 0 });
  label('l_blue', '蓝光：波长短', pick(590, 1400), pick(100, 150), { size: 46, col: '#245d9f', p: lp });
  pen(g, wavy(...pick([610, 250, 960, 250], [1420, 330, 1800, 330]), 74, 14, t * 3), { w: 6, col: COL.red, p: lp, t, seed: 32, amp: 0 });
  label('l_red', '红光：波长长', pick(590, 1400), pick(320, 290), { size: 46, col: '#b3332d', p: lp });
  // the two travellers
  if (u > a3 + .2) {
    const q = (u - a3 - .2) / 4.2;
    const lr = clamp(q) , rp = along(REDP, clamp(lr * 1.15));
    if (q < 1.15) photon(g, rp[0], rp[1], rp[2], { col: COL.red, r: 22, t, seed: 3, tail: 90, alpha: 1 - seg(q, 1, 1.15) });
    const bq = along(BOUNCE, (q * 1.0) % 1.2);
    if (q < 1.15) { const hit = BOUNCE.slice(1, -1).some(p => Math.hypot(p[0] - bq[0], p[1] - bq[1]) < 40) ? 1 : 0; photon(g, bq[0], bq[1], bq[2], { col: COL.blue, r: 22, t, seed: 5, tail: 80, alpha: 1 - seg(q, 1, 1.15) }); }
  }
  // blue everywhere, into the eye
  const ep = seg(u, a4 + .1, a4 + 1.0);
  eye(g, EYE[0], EYE[1], { s: EYE[2], p: ep, t, look: [0, -1] });
  if (u > a4 + .3) {
    for (let i = 0; i < 16; i++) {
      const m = MOL[(i * 5) % MOL.length], toEye = i % 3 === 0, ph = (u * .55 + hash(i) ) % 1, ang = hash(i * 3.3) * TAU;
      const sx = m[0], sy = m[1], ex = toEye ? EYE[0] : sx + Math.cos(ang) * 260, ey = toEye ? EYE[1] - 60 : sy + Math.sin(ang) * 200, qx = sx + (ex - sx) * ph, qy = sy + (ey - sy) * ph;
      photon(g, qx, qy, Math.atan2(ey - sy, ex - sx), { col: COL.blue, r: 16, t, seed: i, tail: 30, alpha: Math.min(1, seg(u, a4 + .3 + i * .05, a4 + .8 + i * .05)) * (1 - ph * .6) });
    }
    txt('l_scatter', '这就叫「散射」', pick(540, 1620), pick(1480, 760), { font: BOLD, size: pick(84, 90), align: 'center', p: seg(u, a4 + 2.2, a4 + 3.1), halo: 20, col: '#245d9f' });
  }
}

// ------------------------------------------------------------------ scene C: the question
function sceneC(t) {
  const u = t - SC.C; paper(g, W, H, t);
  const q1 = S.q1 - SC.C;
  const vp = seg(u, q1 - .1, q1 + 1.0);
  pen(g, wavy(...pick([120, 300, 960, 300], [980, 180, 1800, 180]), 26, 16, t * 7), { w: 7, col: COL.violet, p: vp, t, seed: 41, amp: 0 });
  label('l_vio', '紫光：波长更短', pick(120, 980), pick(230, 110), { size: 66, col: '#6a47ad', p: vp });
  host(g, { x: pick(300, 480), y: pick(1040, 560), s: pick(1.5, 1.6), pose: 'think', talk: talk(t) * .6, look: [.7, -.6], brow: 1, p: seg(u, .0, 1.3), t });
  const bx = pick([[500, 540], [1020, 520], [1030, 820], [510, 830]], [[970, 300], [1800, 285], [1810, 580], [980, 600]]), BC = pick([760, 650, 770], [1390, 410, 520]);
  const box = loop(bx, 5), bp = seg(u, q1 + .5, q1 + 1.4);
  wash(g, box, { col: '#ffffff', a: .95, p: bp, solid: true, rim: false, dx: 0, dy: 0 }); pen(g, box, { w: 7, p: bp, t, seed: 51 });
  txt('l_q1', '那为啥天空', BC[0], BC[1], { font: BOLD, size: 84, align: 'center', p: seg(u, q1 + 1.0, q1 + 1.8) });
  txt('l_q2', '不是紫色？', BC[0], BC[2], { font: BOLD, size: 84, align: 'center', p: seg(u, q1 + 1.6, q1 + 2.4), col: '#6a47ad' });
  const qm = Math.sin(t * 5) * 6;
  txt('l_mark', '？', pick(150, 870), pick(640, 560) + qm, { font: BOLD, size: 200, col: '#f0a02a', p: seg(u, q1 + 1.8, q1 + 2.4), halo: 18 });
}

// ------------------------------------------------------------------ scene R: three reasons
function barsChart(x0, x1, yb, hmax, f, p, t, seedBase) {
  const n = 20, bw = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), h = hmax * f(k) * ss(clamp(p * 1.4 - k * .4)), hue = RAINBOW[Math.min(6, Math.floor(k * 7))];
    if (h < 2) continue;
    const r = [[x0 + i * bw + 3, yb], [x0 + i * bw + 3, yb - h], [x0 + (i + 1) * bw - 3, yb - h], [x0 + (i + 1) * bw - 3, yb]];
    wash(g, r, { col: hue, a: .75, p: 1, dx: 1, dy: 1, rim: false });
  }
  const curve = smooth(Array.from({ length: n }, (_, i) => [x0 + (i + .5) * bw, yb - hmax * f(i / (n - 1))]), 5);
  pen(g, curve, { w: 5, p, t, seed: seedBase });
  pen(g, [[x0 - 10, yb], [x1 + 10, yb]], { w: 4, p: Math.min(1, p * 2), t, seed: seedBase + 1 });
}
const num = (c, x, y, p, t, seed) => { const ring = ell(x, y, 34, 34, 0, TAU, 22); pen(g, ring, { w: 4.5, p, t, seed }); txt('n' + c, String(c), x, y + 17, { font: BOLD, size: 50, align: 'center', p: p > .95 ? 1 : 0 }); };
// one panel's frame: portrait stacks three panels down the page, landscape puts them side by side
const PANEL = i => pick({ ox: 0, oy: [80, 560, 1040][i], w: 860, ch: 300 }, { ox: i * 620 - 20, oy: 50, w: 560, ch: 520 });
function sceneR(t) {
  const u = t - SC.R; paper(g, W, H, t);
  const r = [S.r1 - SC.R, S.r2 - SC.R, S.r3 - SC.R], k4 = S.r4 - SC.R;
  const frame = (i, c, title, p) => { const P = PANEL(i), x0 = pick(110, 80 + P.ox), x1 = x0 + P.w, yb = P.oy + (LAND ? 700 : 400); num(c, x0, P.oy + 40, seg(p, 0, .3), t, 60 + c * 10); label('h' + c, title, x0 + 60, P.oy + 62, { size: pick(56, 44), p: seg(p, .1, .5) }); return { P, x0, x1, yb }; };
  let p = seg(u, r[0] - .1, r[0] + 1.6);
  if (p > 0) {
    const { P, x0, x1, yb } = frame(0, 1, '太阳光里，紫光少', p);
    barsChart(x0, x1, yb, P.ch, k => .5 + .5 * Math.pow(Math.sin(Math.PI * (.12 + k * .75)), 1.2) * (k < .3 ? .75 + k * .8 : 1), seg(p, .3, 1), t, 62);
    arrow([x0 + 150, yb - P.ch + 40], [x0 + 30, yb - P.ch + 110], seg(u, r[0] + 1.0, r[0] + 1.6), { bend: [x0 + 40, yb - P.ch + 40], seed: 66, t }); label('t1', '少', x0 + 165, yb - P.ch + 45, { size: 50, col: '#6a47ad', p: seg(u, r[0] + 1.3, r[0] + 1.7) });
  }
  p = seg(u, r[1] - .1, r[1] + 1.6);
  if (p > 0) {
    const { P, x0, x1, yb } = frame(1, 2, '眼睛，对紫色不太敏感', p);
    barsChart(x0, x1, yb, P.ch, k => Math.exp(-Math.pow((k - .56) / .26, 2)) * (k < .12 ? k / .12 * .6 + .02 : 1), seg(p, .3, 1), t, 72);
    arrow([x0 + 170, yb - P.ch + 80], [x0 + 40, yb - 40], seg(u, r[1] + 1.0, r[1] + 1.6), { bend: [x0 + 50, yb - P.ch + 110], seed: 76, t }); label('t2', '几乎看不见', x0 + 190, yb - P.ch + 70, { size: 46, col: '#6a47ad', p: seg(u, r[1] + 1.3, r[1] + 1.7) });
  }
  p = seg(u, r[2] - .1, r[2] + 1.6);
  if (p > 0) {
    const { P, x0, x1, yb } = frame(2, 3, '高层大气，吸收一部分', p), top = yb - P.ch - 60;
    const band = smooth([[x0 - 20, top + 200], [x0 + P.w * .3, top + 180], [x0 + P.w * .6, top + 215], [x0 + P.w * .9, top + 185], [x1 + 20, top + 205]], 8), poly = [...band, [x1 + 20, top + 300], [x0 - 20, top + 300]];
    wash(g, poly, { col: '#9fc3e4', a: .6, p: seg(p, .3, .8), dx: 0, dy: 2 }); pen(g, band, { w: 4, p: seg(p, .3, .8), t, seed: 82 });
    label('t3', '高层大气', x0, top + 280, { size: 44, p: seg(p, .5, .9), col: '#245d9f' });
    const q = seg(u, r[2] + .5, r[2] + 1.9), vx = x0 + P.w * .25, bxx = x0 + P.w * .75;
    pen(g, [[vx, top + 90], [vx + 30, top + 200]], { w: 8, col: COL.violet, p: q * 2, t, seed: 83, amp: 0 });
    pen(g, [[vx + 30, top + 200], [vx + 50, top + 330]], { w: 3, col: COL.violet, p: seg(q, .5, 1), t, seed: 84, amp: 0, alpha: .55 });
    pen(g, [[bxx, top + 90], [bxx + 30, top + 200]], { w: 8, col: COL.blue, p: q * 2, t, seed: 85, amp: 0 });
    pen(g, [[bxx + 30, top + 200], [bxx + 55, top + 335]], { w: 7, col: COL.blue, p: seg(q, .5, 1), t, seed: 86, amp: 0 });
    label('t3b', '紫光变弱', vx - 90, top + 380, { size: 44, col: '#6a47ad', p: seg(u, r[2] + 1.4, r[2] + 1.9) }); label('t3c', '蓝光基本还在', bxx - 120, top + 380, { size: 44, col: '#245d9f', p: seg(u, r[2] + 1.6, r[2] + 2.1) });
  }
  const sp = seg(u, k4 + .15, k4 + .45);
  if (sp > 0) {
    const cx = W / 2, cy = pick(780, 500), bw = pick(400, 560), bh = pick(140, 170), fs = pick(170, 210);
    const sc = 1 + (1 - back(sp, 2.2)) * -0.6;
    g.save(); g.translate(cx, cy); g.rotate(-.1); g.scale(sc, sc); g.globalAlpha = Math.min(1, sp * 3);
    const bxp = loop([[-bw, -bh + 20], [bw, -bh], [bw + 20, bh], [-bw + 10, bh + 20]], 5); wash(g, bxp, { col: '#ffffff', a: 1, p: 1, solid: true, rim: false, dx: 0, dy: 0 }); pen(g, bxp, { w: 9, p: 1, t, seed: 91, boil: 1.4 });
    write(g, '蓝色，胜出！', 0, fs * .22, { font: BOLD, size: fs, align: 'center', col: '#2d6cb8' }); g.restore();
    TX.push({ id: 'win', text: '蓝色，胜出！', x0: cx - bw * .9, y0: cy - bh * .8, x1: cx + bw * .9, y1: cy + bh * .8 });
  }
}

// ------------------------------------------------------------------ scene S: sunset
function sceneS(t) {
  const u = t - SC.S; paper(g, W, H, t);
  const s1 = S.s1 - SC.S, s2 = S.s2 - SC.S, s3 = S.s3 - SC.S;
  const HZ = pick(1160, 745), SUNP = pick([850, 930], [1530, 500]), HOST = pick([230, 960, .62], [330, 480, .9]), bx0 = pick(380, 640), bx1 = pick(760, 1260), by = pick(940, 500);
  wash(g, blob(W / 2, H / 2 + pick(0, 0), pick(600, 900), 14, .06, 10).map(([x, y]) => [x, (y - H / 2) * pick(.55, .5) + pick(940, 520)]), { col: '#f4ab62', a: .42, p: seg(u, .1, 2.0), dx: 6, dy: 4 });
  wash(g, blob(SUNP[0] - 50, SUNP[1] - 30, pick(230, 300), 9, .08, 9), { col: '#f6dd8a', a: .4, p: seg(u, .3, 2.2), dx: 0, dy: 0, rim: false });
  ground(HZ, seg(u, .2, 1.2), seg(u, .6, 1.8), t, '#b7cf9a');
  txt('t_s', '傍晚为什么红？', W / 2, pick(270, 150), { font: BOLD, size: pick(120, 110), align: 'center', p: seg(u, .4, 1.6), halo: 24, col: '#b2512a' });
  sun(g, { x: SUNP[0], y: SUNP[1], r: pick(72, 90), p: seg(u, .5, 1.6), t, col: '#ee8a3a', mood: u > s2 ? 'flat' : 'smile' });
  host(g, { x: HOST[0], y: HOST[1], s: HOST[2], pose: u > s3 ? 'wave' : 'talk', talk: talk(t), look: u > s3 ? [0, 0] : [1, -.2], brow: 0, p: seg(u, .3, 1.5), t });
  if (u > s2 - .3) {
    const bp = seg(u, s2 - .1, s2 + .9), mid = (bx0 + bx1) / 2, sw = (bx1 - bx0) / 380;
    const band = smooth([[bx0, by - 80], [bx0 + 90 * sw, by - 100], [mid, by - 70], [mid + 90 * sw, by - 100], [bx1, by - 78]], 8), lower = smooth([[bx1, by + 90], [mid + 90 * sw, by + 110], [mid, by + 82], [bx0 + 90 * sw, by + 108], [bx0, by + 86]], 8);
    wash(g, [...band, ...lower], { col: '#a7c4dc', a: .7, p: bp, dx: 0, dy: 2 }); pen(g, band, { w: 4, p: bp, t, seed: 91 }); pen(g, lower, { w: 4, p: bp, t, seed: 92 });
    label('l_air2', '厚厚的大气', mid - 100, by - 140, { size: 46, col: '#245d9f', p: seg(u, s2 + .3, s2 + 1.0) });
    const ay = by + pick(170, 175);
    arrow([SUNP[0] - 70, ay], [HOST[0] + 80, ay], seg(u, s2 + .6, s2 + 1.5), { seed: 93, t, col: '#7a4b2a' }); arrow([HOST[0] + 80, ay], [SUNP[0] - 70, ay], seg(u, s2 + .6, s2 + 1.5), { seed: 94, t, col: '#7a4b2a' });
    label('l_far', '路程变长', mid - 90, ay + 60, { size: 54, p: seg(u, s2 + 1.2, s2 + 1.9), col: '#7a4b2a' });
    const sx = SUNP[0] - 50, hx = HOST[0] + 90, span = sx - hx;
    for (let i = 0; i < 6; i++) {
      const ph = (u * .32 + i / 6) % 1, y = by + (i % 3 - 1) * 24 + 20;
      if (u < s2 + .7) continue;
      const isBlue = i % 2 === 0, x = sx - ph * span;
      if (isBlue) { const drift = seg(ph, .15, 1); photon(g, sx - ph * span * .66, y - drift * (i % 4 === 0 ? 150 : -140), Math.PI + (i % 4 === 0 ? -.8 : .8) * drift, { col: COL.blue, r: 11, t, seed: i, tail: 24, alpha: (1 - seg(ph, .45, .95)) * seg(ph, 0, .08) }); }
      else photon(g, x, y, Math.PI, { col: i % 4 === 1 ? COL.orange : COL.red, r: 12, t, seed: i, tail: 30, alpha: seg(ph, 0, .08) });
    }
    label('l_b', '蓝光：半路被散开了', pick(120, 250), pick(640, by - 240), { size: 46, col: '#245d9f', p: seg(u, s2 + 2.5, s2 + 3.4) });
    label('l_r', '红橙光：到你眼前', pick(480, 760), pick(1290, ay + 130), { size: 50, col: '#b3332d', p: seg(u, s2 + 3.6, s2 + 4.6) });
  }
  if (u > s3 - .2) txt('l_end', '抬头看看天吧', pick(540, 1560), pick(1420, 885), { font: BOLD, size: pick(96, 100), align: 'center', p: seg(u, s3 + .2, s3 + 1.4), halo: 22, col: '#b2512a' });
}

// ------------------------------------------------------------------ page change: a paper-coloured brush sweeps across
const FN = { A: sceneA, B: sceneB, C: sceneC, R: sceneR, S: sceneS };
function frame(t) {
  const cur = sceneAt(t), i = SCENES.indexOf(cur), nx = SCENES[i + 1], nt = nx ? SC[nx] : 1e9, w0 = nt - .38, w1 = nt + .14;
  if (nx && t > w0) {
    const q = ss(seg(t, w0, w1)), edge = -200 + q * (W + 500), slant = 220;
    FN[cur](t);
    g.save(); g.beginPath(); g.moveTo(-10, -10); g.lineTo(edge + slant, -10); g.lineTo(edge - slant, H + 10); g.lineTo(-10, H + 10); g.closePath(); g.clip();
    FN[nx](t); g.restore();
    pen(g, [[edge + slant, -10], [edge - slant, H + 10]], { w: 12, p: 1, t, seed: 3, amp: 3 });
  } else FN[cur](t);
}
// the subtitle: hand-lettered with a paper halo, in the lower margin
function subtitle(t) {
  const l = LINES.find(l => t >= S[l.id] - .05 && t < E[l.id] + .8); if (!l) return;
  const a = ss(seg(t, S[l.id] - .05, S[l.id] + .12)) * (1 - ss(seg(t, E[l.id] + .55, E[l.id] + .8)));
  g.save(); g.globalAlpha = a; const SUBS = pick(64, 56), SUBW = pick(900, 1500), SUBY = pick(1640, 975); g.font = `${SUBS}px "${BOLD}"`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  let lines = [l.text];
  if (g.measureText(l.text).width > SUBW) {                                       // two lines, cut at the punctuation nearest the middle
    const mid = l.text.length / 2; let best = -1, bd = 1e9;
    [...l.text].forEach((ch, i) => { if ('，。！？；：'.includes(ch) && i < l.text.length - 1) { const d = Math.abs(i + 1 - mid); if (d < bd) { bd = d; best = i + 1; } } });
    if (best < 0) best = Math.ceil(mid);
    lines = [l.text.slice(0, best), l.text.slice(best)];
  }
  const wmax = Math.max(...lines.map(s => g.measureText(s).width)), fs = Math.max(40, Math.floor(SUBS * Math.min(1, (SUBW + 60) / wmax))); g.font = `${fs}px "${BOLD}"`;
  const y0 = SUBY - (lines.length - 1) * (fs + 20) * .5;
  lines.forEach((s, i) => { const y = y0 + i * (fs + 20); g.lineJoin = 'round'; g.strokeStyle = '#fffdf6'; g.lineWidth = 18; g.strokeText(s, W / 2, y); g.fillStyle = INK; g.fillText(s, W / 2, y); const m = g.measureText(s).width; if (a > .9) TX.push({ id: 'sub_' + l.id + i, text: s, x0: W / 2 - m / 2, y0: y - 56, x1: W / 2 + m / 2, y1: y + 12 }); });
  g.restore();
}
function render(t) {
  TX = []; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  frame(t); subtitle(t);
  // a slight fade in and out of the whole page
  const f = Math.max(1 - ss(seg(t, 0, .25)), ss(seg(t, DUR - .5, DUR)));
  if (f > 0) { g.fillStyle = PAPER; g.globalAlpha = f; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
}
window.DUR = DUR; window.EV = EV; window.render = render;
window.TEXTS = t => { render(t); return TX; };
render(0); window.READY = true;
