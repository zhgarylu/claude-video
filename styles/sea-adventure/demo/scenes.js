// scenes.js: every shot of the film as a function of absolute time t.
import { clamp, lerp, seg, ss, eio, eo, ei, back, spring, hash, vnoise } from '/core/lib.js';
import { COL, G, TAU, ell, catmull, quad, xf, path, shape, ring, stroke, tube, capsule, hatchFill, toneFill, speedLines, parallelLines, sfx, panel, slantQuad, puff, sweat, star, text, measure, setFrame, paper, jr, jf } from './ink.js';
import { drawChar, pose, mix, EXPR, CREW, headPos, props } from './chars.js';
import { sky, sun, cloud, gull, perchedGull, sea, ship, duck, island, palm, sock, chest, tubWorld, food, camSet, toScreen, lerpc, waveGlyph } from './props.js';
import { T, POSTER_T, SFX, WIPES, kf } from './script.js';

export const TX = [];
function regBox(id, txt, M, x0, y0, x1, y1) {
  const cs = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => [M.a * x + M.c * y + M.e, M.b * x + M.d * y + M.f]);
  TX.push({ id, text: txt, x0: Math.min(...cs.map(c => c[0])), y0: Math.min(...cs.map(c => c[1])), x1: Math.max(...cs.map(c => c[0])), y1: Math.max(...cs.map(c => c[1])) });
}
// draw text in the current space and register it (anchor: 'c' centred on x, 'l' left); baseline y
function label(ctx, id, s, x, y, size, font, fill, o = {}) {
  const { anchor = 'c', rot = 0, outline = 0, ls = 0, alpha = 1, clipw = 1 } = o, w = measure(ctx, s, size, font, ls), M = ctx.getTransform();
  ctx.save(); ctx.globalAlpha *= alpha; text(ctx, s, x, y, size, font, fill, { align: anchor === 'c' ? 'center' : 'left', rot, outline, ls }); ctx.restore();
  if (alpha > .02 && !o.noreg) { const x0 = anchor === 'c' ? x - w / 2 : x; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.translate(-x, -y); const M2 = ctx.getTransform(); ctx.restore(); regBox(id, s, M2, x0 - 3, y - size * .82, x0 + w + 3, y + size * .24); }
}
const bar = t => (t / .75) % 1;               // phase inside a 0.75 s beat
const hop = (t, k = 1) => Math.abs(Math.sin(Math.PI * t / .75)) * k;
const rot2 = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const seq = (t, a) => { let k = 0; a.forEach((x, i) => { if (t >= x) k = i + 1; }); return k; };

// ======================================================================================================== 1. cold open
function feetPanel(ctx, t, cx, cy, p) {
  ctx.save(); ctx.translate(cx, cy);
  ctx.fillStyle = COL.sky2; ctx.fillRect(-500, -400, 1000, 800); toneFill(ctx, -500, -400, 500, 400, { col: COL.teal2, alpha: .35 });
  speedLines(ctx, 0, 0, 260, 700, 28, 9, { col: 'rgba(29,22,18,.35)', w: 9 });
  // two legs, left in a striped sock, right bare, toes wiggling
  const wig = Math.sin(t * 26) * .18;
  for (const s of [-1, 1]) {
    const x = s * 120, bare = s > 0;
    shape(ctx, [[x - 46, -330], [x + 46, -330], [x + 40, -20], [x - 40, -20]], COL.cream, 6, 14 + s, { hatch: { ang: 1.2, gap: 9, w: 1.5 }, off: [2, 3] });
    const leg = [[x - 36, -40], [x + 36, -40], [x + 34, 84], [x - 34, 84]];
    if (!bare) { ctx.save(); path(ctx, leg); ctx.clip(); for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? COL.sun : COL.teal; ctx.fillRect(x - 60, -40 + i * 25, 120, 26); } ctx.restore(); ring(ctx, leg, 5, 3); }
    else shape(ctx, leg, COL.skin3, 5.5, 4, { off: [1, 2] });
    const foot = ell(x + s * 38, 112, 112, 46, 22, .03, 5 + s);
    if (!bare) { ctx.save(); path(ctx, foot); ctx.fillStyle = COL.teal; ctx.fill(); ctx.clip(); ctx.fillStyle = COL.sun; for (let i = 0; i < 4; i++) ctx.fillRect(x - 110 + i * 56 + 20, 60, 24, 100); ctx.restore(); ring(ctx, foot, 5.5, 5); }
    else {
      shape(ctx, foot, COL.skin3, 5.5, 6, { off: [1, 2] });
      for (let i = 0; i < 5; i++) { const a = wig * (i % 2 ? 1 : -1), tx = x + 40 + i * 20, ty = 94 - (i === 0 ? 6 : 0) + Math.abs(a) * 30; shape(ctx, ell(tx, ty + 0, 12 - i * 1, 15 - i * 1, 12), COL.skin3, 4, 7 + i, { off: [0, 0] }); }
    }
  }
  // the question mark and a puff of dust
  ctx.restore();
}
export function sceneCut(ctx, t) {
  ctx.fillStyle = COL.sun; ctx.fillRect(0, 0, 1920, 1080);
  ctx.fillStyle = 'rgba(255,138,42,.55)';
  for (let i = 0; i < 20; i += 2) { const a0 = i / 20 * TAU + t * .05, a1 = (i + 1) / 20 * TAU + t * .05; ctx.beginPath(); ctx.moveTo(960, 580); ctx.lineTo(960 + Math.cos(a0) * 2600, 580 + Math.sin(a0) * 2600); ctx.lineTo(960 + Math.cos(a1) * 2600, 580 + Math.sin(a1) * 2600); ctx.fill(); }
  speedLines(ctx, 960, 580, 470, 1500, 56, 4, { w: 15 });
  const p = seg(t, 0, .26), sc = 4.35 * (.45 + .55 * back(p, 2.6)), sh = t < .6 ? Math.sin(t * 70) * 5 * (1 - t / .6) : 0;
  const talking = t > .45 && t < 2.6, talk = talking ? .45 * (.5 + .5 * Math.sin(t * 19)) : 0;
  const face = mix(EXPR.shout, EXPR.worry, ss(seg(t, 1.7, 2.15)));
  const cy = 590 + Math.sin(t * 9) * 3;
  drawChar(ctx, 'pip', pose({ x: 960 + sh, y: cy + sc * 146, s: sc, face, talk, look: [Math.sin(t * 3) * .2, .85 * ss(seg(t, 1.5, 1.85))], tilt: Math.sin(t * 5) * .04 - .03, hs: [1 + .04 * Math.sin(t * 17) * (talking ? 1 : 0), 1 - .03 * Math.sin(t * 17) * (talking ? 1 : 0)], aL: [118 + Math.sin(t * 20) * 6, 130], aR: [122 - Math.sin(t * 20) * 6, 138], seed: 1 }));
  // the cut-in: his feet
  const pp = seg(t, 1.8, 2.1);
  if (pp > 0) { const z = back(pp, 2.2), q = slantQuad(1470, 800, 700 * z, 420 * z, 50 * z, -.045); panel(ctx, q, 11, () => feetPanel(ctx, t, 1470, 790, pp)); }
}

// ======================================================================================================== 2. the chart
const ROUTE = [[390, 810], [560, 700], [720, 790], [900, 660], [1080, 730], [1250, 590], [1300, 470], [1440, 430], [1565, 366]];
const ROUTE_LEN = (() => { let L = 0; for (let i = 1; i < ROUTE.length; i++) L += Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1]); return L; })();
function routePoint(d) { let a = d; for (let i = 1; i < ROUTE.length; i++) { const l = Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1]); if (a <= l) return [lerp(ROUTE[i - 1][0], ROUTE[i][0], a / l), lerp(ROUTE[i - 1][1], ROUTE[i][1], a / l)]; a -= l; } return ROUTE[ROUTE.length - 1]; }
function compass(ctx, t, cx, cy, r, prog) {
  ctx.save(); ctx.translate(cx, cy);
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 1.7 * prog + 1, 0, TAU); ctx.clip();
  shape(ctx, ell(0, 0, r * 1.02, r * 1.02, 40, .01, 3), '#f6e6b8', 6, 3, { off: [2, 3] });
  ring(ctx, ell(0, 0, r * .86, r * .86, 40), 3, 4);
  for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, l = i % 6 === 0 ? 20 : 10; stroke(ctx, [[Math.cos(a) * r * .86, Math.sin(a) * r * .86], [Math.cos(a) * (r * .86 - l), Math.sin(a) * (r * .86 - l)]], i % 6 === 0 ? 5 : 3, i, { taper: 0, boil: false }); }
  for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i / 8 * TAU, long = i % 2 === 0, L = r * (long ? .98 : .62), w = r * (long ? .2 : .13);
    const pts = [[0, 0], [Math.cos(a - .26) * w * 2.4, Math.sin(a - .26) * w * 2.4], [Math.cos(a) * L, Math.sin(a) * L], [Math.cos(a + .26) * w * 2.4, Math.sin(a + .26) * w * 2.4]];
    shape(ctx, pts, i === 0 ? COL.coral : long ? COL.teal2 : COL.sun, 4.5, 20 + i, { off: [1, 2] }); }
  ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();
}
function chartBase(ctx, t, openP) {
  // the desk
  ctx.fillStyle = '#5f3b22'; ctx.fillRect(-500, -300, 2920, 1700);
  for (let i = 0; i < 40; i++) stroke(ctx, [[-400, i * 38 - 150], [2300, i * 38 - 150 + Math.sin(i) * 20]], 3, i, { col: 'rgba(30,15,5,.45)', taper: 0, vary: .8, boil: false });
  const w = 1700 * openP;
  if (w < 2) return;
  ctx.save(); ctx.beginPath(); ctx.rect(960 - w / 2, 0, w, 1080); ctx.clip();
  const edge = []; const X0 = 110, X1 = 1810, Y0 = 85, Y1 = 995;
  for (let i = 0; i <= 40; i++) edge.push([lerp(X0, X1, i / 40), Y0 + (hash(i * 1.9) - .5) * 9]);
  for (let i = 1; i <= 24; i++) edge.push([X1 + (hash(i * 3.3) - .5) * 9, lerp(Y0, Y1, i / 24)]);
  for (let i = 1; i <= 40; i++) edge.push([lerp(X1, X0, i / 40), Y1 + (hash(i * 2.7) - .5) * 9]);
  for (let i = 1; i < 24; i++) edge.push([X0 + (hash(i * 4.1) - .5) * 9, lerp(Y1, Y0, i / 24)]);
  shape(ctx, edge, '#efd9a2', 6, 51, { off: [4, 6] });
  ctx.save(); path(ctx, edge); ctx.clip();
  for (let i = 0; i < 9; i++) { const g = ctx.createRadialGradient(300 + i * 200, 200 + (i % 3) * 300, 0, 300 + i * 200, 200 + (i % 3) * 300, 260); g.addColorStop(0, 'rgba(170,120,50,.14)'); g.addColorStop(1, 'rgba(170,120,50,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080); }
  // the sea: wavy teal lines
  ctx.beginPath(); ctx.rect(70, 130, 1780, 820); ctx.clip();
  for (let y = 150; y < 940; y += 21) { const pts = []; for (let x = 70; x <= 1850; x += 36) pts.push([x, y + Math.sin(x * .02 + y * .05) * 4]); stroke(ctx, pts, 2.3, y, { col: 'rgba(22,150,160,.62)', taper: 0, vary: .5, boil: false }); }
  // coast echoes + islands
  const isle = (cx, cy, rx, ry, seed, fill = '#f4d58a') => { for (let k = 3; k >= 1; k--) ring(ctx, ell(cx, cy, rx + k * 15, ry + k * 11, 30, .1, seed + k), 2.2, seed + k, { col: 'rgba(22,150,160,.7)', inside: 0 }); shape(ctx, ell(cx, cy, rx, ry, 30, .12, seed), fill, 5, seed, { hatch: { ang: .5, gap: 10, w: 1.4, alpha: .8 }, off: [3, 3] }); };
  isle(320, 805, 150, 80, 3);
  for (const [hx, hy, c] of [[270, 770, COL.coral], [330, 760, COL.sun], [385, 775, COL.teal]]) { shape(ctx, [[hx - 22, hy], [hx + 22, hy], [hx + 22, hy + 30], [hx - 22, hy + 30]], '#fff3d2', 3.6, hx, { off: [1, 1] }); shape(ctx, [[hx - 28, hy], [hx, hy - 30], [hx + 28, hy]], c, 3.6, hx + 1, { off: [1, 1] }); }
  stroke(ctx, [[420, 840], [520, 870]], 8, 2, { col: COL.wood2, taper: .1 });
  for (const [x, y, r] of [[690, 575, 32], [740, 595, 24], [655, 602, 22]]) isle(x, y, r, r * .75, x, '#c9c2b0');
  for (let i = 0; i < 6; i++) stroke(ctx, [[960 + i * 40, 810], [978 + i * 40, 770], [996 + i * 40, 810]], 4, 70 + i, { taper: .2, boil: false }), stroke(ctx, [[975 + i * 40, 810], [985 + i * 40, 790]], 3, 80 + i);
  duck(ctx, t * 0, { x: 1110, y: 395, s: .14, flip: 1 });
  isle(1500, 392, 190, 96, 12, '#f4d58a');
  sock(ctx, 1500, 372, 0.9, 0, { toe: 1 });
  ctx.restore();
  // border
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 6; ctx.strokeRect(150, 128, 1620, 826); ctx.lineWidth = 2.6; ctx.setLineDash([16, 9]); ctx.strokeRect(164, 142, 1592, 798); ctx.setLineDash([]);
  ctx.restore();
  // the rolled ends
  for (const s of [-1, 1]) { const x = 960 + s * w / 2; ctx.save(); ctx.translate(x, 540); shape(ctx, [[-26, -470], [26, -470], [26, 470], [-26, 470]], '#d9bd84', 6, 61 + s, { hatch: { ang: 1.57, gap: 9, w: 1.8 }, off: [2, 3] }); stroke(ctx, [[0, -470], [0, 470]], 3, 2, { taper: 0 }); ctx.restore(); }
}
export function sceneChart(ctx, t, cam) {
  const c = cam ?? kf(t, [[3.0, { z: 1.9, cx: 1580, cy: 760, roll: 0 }], [4.6, { z: 1.9, cx: 1580, cy: 760, roll: 0 }], [5.5, { z: 1.0, cx: 960, cy: 540, roll: 0 }], [9.2, { z: 1.045, cx: 990, cy: 510, roll: 0 }]]);
  ctx.save(); camSet(ctx, c);
  chartBase(ctx, t, eo(seg(t, 3.0, 3.85)));
  // the compass draws itself
  compass(ctx, t, 1580, 750, 125, ss(seg(t, 3.4, 4.7)));
  for (const [l, dx, dy] of [['N', 0, -162], ['E', 168, 18], ['S', 0, 198], ['W', -168, 18]]) { const a = ss(seg(t, 4.0, 4.35)); if (a > 0) label(ctx, 'chart.' + l, l, 1580 + dx, 750 + dy, 50, 'Pirata', COL.ink, { alpha: a }); }
  // labels
  const L = [['chart.title', 'THE WARM WIDE SEA', 960, 214, 84, 'Pirata', 4.85], ['chart.home', 'HOME DOCK', 330, 915, 48, 'Brush', 4.95], ['chart.mutton', 'MUTTON ROCKS', 700, 535, 46, 'Brush', 5.25], ['chart.reef', 'SLEEPY REEF', 1040, 880, 46, 'Brush', 5.55], ['chart.quack', 'HERE BE QUACKS', 1110, 312, 46, 'Brush', 5.85], ['chart.sock', 'SOCK ROCK', 1530, 200, 56, 'Brush', 6.15]];
  for (const [id, s, x, y, size, font, t0] of L) {
    const a = ss(seg(t, t0, t0 + .35)); if (a <= 0) continue;
    if (id === 'chart.title') { ctx.save(); ctx.translate(x, y - 28); shape(ctx, [[-340, -52], [340, -52], [316, 0], [340, 54], [-340, 54], [-316, 0]], '#fff3d2', 5, 91, { off: [3, 4] }); ctx.restore(); }
    label(ctx, id, s, x, y, size, font, id === 'chart.title' ? COL.ink : '#3a1f10', { alpha: a });
  }
  // the route
  const pr = seg(t, 5.4, 8.2), D = ROUTE_LEN * pr;
  if (pr > 0) {
    ctx.fillStyle = COL.coral; ctx.strokeStyle = COL.ink;
    for (let d = 0; d <= D; d += 25) { const [x, y] = routePoint(d), k = clamp((D - d) / 60, 0, 1); ctx.beginPath(); ctx.arc(x, y, 7.5 * Math.min(1, k + .4), 0, TAU); ctx.fill(); ctx.lineWidth = 2.2; ctx.stroke(); }
    const [hx, hy] = routePoint(D);
    if (pr < 1) ship(ctx, t, { x: hx, y: hy + 6, s: .15, flag: false, bob: true, roll: .08 });
  }
  const xp = seg(t, 8.2, 8.5);
  if (xp > 0) { const k = back(xp, 3); ctx.save(); ctx.translate(1575, 372); ctx.scale(k, k); for (const sg of [-1, 1]) stroke(ctx, [[-30, -30 * sg], [30, 30 * sg]], 16, 41 + sg, { col: COL.coral, taper: .1 }); ctx.restore(); }
  ctx.restore();
}

// ======================================================================================================== 3. the wanted posters
const CREWINFO = [
  { id: 'pip', name: 'PIP', crime: 'FOR: LOSING A SOCK', bounty: '3,000 BUTTONS', bg: COL.teal3, face: 'grin', s: 1.25, dy: 0 },
  { id: 'brisket', name: 'BRISKET', crime: 'FOR: EATING THE MAP', bounty: '50,000 BUTTONS', bg: COL.pink, face: 'chew', s: 1.95, dy: 0 },
  { id: 'longshanks', name: 'LONGSHANKS', crime: 'FOR: MAP UPSIDE DOWN', bounty: '12,000 BUTTONS', bg: COL.sun, face: 'shock', s: 1.5, dy: 0 },
  { id: 'dot', name: 'DOT', crime: 'FOR: OWNING A GULL', bounty: '8,000 BUTTONS', bg: COL.sky, face: 'grin', s: 1.65, dy: 0 },
  { id: 'barnacle', name: 'BARNACLE', crime: 'FOR: SINKING TWICE', bounty: '700 BUTTONS', bg: COL.leaf, face: 'happy', s: 1.6, dy: 0 },
];
const PX = k => 960 + (k - 2) * 340, PY = 540;
function wall(ctx, t) {
  ctx.fillStyle = '#7a4a28'; ctx.fillRect(0, 0, 1920, 1080);
  for (let i = -1; i < 14; i++) {
    const x = i * 150 + 30, col = ['#9b5f31', '#a96b3a', '#8f552a'][((i % 3) + 3) % 3];
    ctx.fillStyle = col; ctx.fillRect(x, 0, 148, 1080);
    hatchFill(ctx, x + 4, 0, x + 144, 1080, { ang: 1.5, gap: 28, w: 1.6, col: 'rgba(40,20,5,.55)', alpha: 1 }, 3 + i);
    stroke(ctx, [[x, -10], [x + 2, 1090]], 7, 90 + i, { taper: 0, vary: .3, boil: false });
    for (const ny of [90, 990]) { ctx.fillStyle = '#2a1a0e'; ctx.beginPath(); ctx.arc(x + 22, ny, 5, 0, TAU); ctx.arc(x + 126, ny + 3, 5, 0, TAU); ctx.fill(); }
  }
  const g = ctx.createRadialGradient(960, 480, 200, 960, 540, 1250); g.addColorStop(0, 'rgba(255,214,120,.28)'); g.addColorStop(1, 'rgba(20,8,0,.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
}
function poster(ctx, t, k, shake) {
  const t0 = POSTER_T[k], dt = t - t0; if (dt < 0) return;
  const info = CREWINFO[k], tilt = [-.04, .03, -.02, .045, -.03][k];
  const p = seg(dt, 0, .17), post = Math.max(0, dt - .17);
  const z = p < 1 ? lerp(2.4, 1, ei(p)) : 1 + .055 * Math.exp(-post * 13) * Math.cos(post * 38);
  const slam = (1 - p) * .28 * (k % 2 ? 1 : -1);
  let swing = 0, px = PX(k), py = PY;
  if (k === 4) { const ts = t - 20.55; if (ts > 0) swing = -.2 * Math.exp(-ts * 1.5) * Math.cos(ts * 5.2 + .2) * 1; }
  ctx.save(); ctx.globalAlpha *= ss(seg(dt, 0, .05));
  if (k === 4 && swing) { ctx.translate(px - 150, py - 235); ctx.rotate(swing); ctx.translate(-(px - 150), -(py - 235)); }
  ctx.translate(px + shake[0], py + shake[1]); ctx.rotate(tilt + slam); ctx.scale(z, z);
  // paper
  const W2 = 160, H2 = 250, edge = [];
  for (let i = 0; i <= 12; i++) edge.push([lerp(-W2, W2, i / 12), -H2 + (hash(i + k * 5) - .5) * 8]);
  for (let i = 1; i <= 16; i++) edge.push([W2 + (hash(i * 2 + k) - .5) * 7, lerp(-H2, H2, i / 16)]);
  for (let i = 1; i <= 12; i++) edge.push([lerp(W2, -W2, i / 12), H2 + (hash(i * 3 + k) - .5) * 8]);
  for (let i = 1; i < 16; i++) edge.push([-W2 + (hash(i * 4 + k) - .5) * 7, lerp(H2, -H2, i / 16)]);
  ctx.save(); ctx.fillStyle = 'rgba(20,8,0,.35)'; path(ctx, edge.map(([x, y]) => [x + 14, y + 16])); ctx.fill(); ctx.restore();
  shape(ctx, edge, '#f1ddb0', 6.5, 100 + k, { off: [3, 4] });
  ctx.save(); path(ctx, edge); ctx.clip(); const gg = ctx.createRadialGradient(0, 0, 60, 0, 0, 330); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(1, 'rgba(150,100,40,.28)'); ctx.fillStyle = gg; ctx.fillRect(-200, -280, 400, 560); ctx.restore();
  ring(ctx, [[-W2 + 14, -H2 + 14], [W2 - 14, -H2 + 14], [W2 - 14, H2 - 14], [-W2 + 14, H2 - 14]].flatMap(([x, y], i, a) => { const b = a[(i + 1) % 4]; return [0, .25, .5, .75].map(u => [lerp(x, b[0], u), lerp(y, b[1], u)]); }), 2.4, k, { inside: 1, shade: [0, 0] });
  // header
  label(ctx, `poster${k}.wanted`, 'WANTED', 0, -190, 58, 'Rye', COL.coral, { outline: 0 });
  // portrait
  const by0 = -165, bh = 220, bw = 262;
  ctx.save(); ctx.beginPath(); ctx.rect(-bw / 2, by0, bw, bh); ctx.clip();
  ctx.fillStyle = info.bg; ctx.fillRect(-bw / 2, by0, bw, bh); toneFill(ctx, -bw / 2, by0, bw / 2, by0 + bh, { col: COL.ink, alpha: .25 });
  speedLines(ctx, 0, by0 + 100, 70, 240, 22, 5 + k, { col: 'rgba(255,255,255,.55)', w: 8 });
  const C = CREW[info.id], sc = info.s, tt = t * 1;
  const e0 = EXPR.neutral, sig = EXPR[info.face];
  let face = mix(e0, sig, ss(seg(dt, .15, .45)));
  const P = pose({ x: 0, y: by0 + 112 + sc * (C.legL + C.torsoH + C.neck + C.hr[1] * .82), s: sc, face, seed: 3 + k, look: [Math.sin(t * 2.1 + k) * .35, .1], tilt: Math.sin(t * 3 + k) * .03, aL: [20, 30], aR: [20, 30] });
  if (info.id === 'brisket') { P.talk = .35 * (.5 + .5 * Math.sin(t * 11)); P.face = mix(EXPR.chew, EXPR.grin, .0); P.sq = 1 + .03 * Math.sin(t * 11); }
  if (info.id === 'longshanks') { P.tilt = Math.sin(t * 2.4) * .12; P.look = [Math.sin(t * 2) * .8, -.5]; }
  if (info.id === 'dot') { const bl = (t % 2.6) < .12; P.face = bl ? mix(sig, EXPR.laugh, 1) : sig; }
  if (info.id === 'barnacle') { P.sq = 1 + .02 * Math.sin(t * 9); P.bob = Math.sin(t * 9) * 1.5; }
  drawChar(ctx, info.id, P);
  if (info.id === 'dot') perchedGull(ctx, 78, by0 + 90, 1, 0);
  ctx.restore(); ring(ctx, [[-bw / 2, by0], [bw / 2, by0], [bw / 2, by0 + bh], [-bw / 2, by0 + bh]].flatMap(([x, y], i, a) => { const b = a[(i + 1) % 4]; return [0, .25, .5, .75].map(u => [lerp(x, b[0], u), lerp(y, b[1], u)]); }), 6, k + 7, { inside: 1, shade: [0, 0] });
  // text under it: appears with the impact
  const ta = ss(seg(dt, .17, .3));
  label(ctx, `poster${k}.name`, info.name, 0, 114, info.name.length > 8 ? 56 : 66, 'Pirata', COL.ink, { alpha: ta });
  label(ctx, `poster${k}.crime`, info.crime, 0, 160, 27, 'Hand', COL.ink, { alpha: ta });
  const sp = seg(dt, .62, .8), sk = back(sp, 2.6);
  if (sp > 0) { ctx.save(); ctx.translate(0, 207); ctx.rotate(-.04); ctx.scale(lerp(1.4, 1, sk), lerp(1.4, 1, sk)); ctx.translate(0, -207); ring(ctx, ell(0, 198, 148, 28, 26, .04, k), 3, 9 + k, { col: COL.coral, inside: .2 }); label(ctx, `poster${k}.bounty`, info.bounty, 0, 207, 29, 'Rye', COL.coral); ctx.restore(); }
  // nails
  for (const [nx, ny] of [[-W2 + 22, -H2 + 20], [W2 - 22, -H2 + 20]]) { if (k === 4 && nx > 0 && t > 20.55) continue; ctx.fillStyle = '#4a4a4a'; ctx.beginPath(); ctx.arc(nx, ny, 9, 0, TAU); ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.stroke(); }
  ctx.restore();
  // impact: dust and lines
  if (dt > .17 && dt < .55) { const q = (dt - .17) / .38; ctx.save(); ctx.translate(px, py); puff(ctx, 0, 0, 300, 10, 7 + k, ss(q)); ctx.restore(); }
}
export function scenePosters(ctx, t) {
  const c = kf(t, [[9, { z: 1.0, cx: 960, cy: 540 }], [22.5, { z: 1.045, cx: 960, cy: 520 }]]);
  let sx = 0, sy = 0; POSTER_T.forEach(ti => { const d = t - ti - .17; if (d > 0 && d < .4) { const a = 14 * Math.exp(-d * 11); sx += Math.sin(d * 90) * a; sy += Math.cos(d * 75) * a; } });
  ctx.save(); ctx.translate(960, 540); ctx.scale(c.z, c.z); ctx.translate(-c.cx, -c.cy);
  wall(ctx, t);
  for (let k = 0; k < 5; k++) poster(ctx, t, k, [sx, sy]);
  ctx.restore();
}

// ======================================================================================================== 4-9. the world
const shipKeys = [[22.0, -260], [30.0, 1380], [34.5, 1640], [36.0, 1650], [41.0, 1800], [42.4, 1900], [60, 1900]];
export function shipX(t) { for (let i = 1; i < shipKeys.length; i++) if (t <= shipKeys[i][0]) { const [t0, a] = shipKeys[i - 1], [t1, b] = shipKeys[i]; const u = (t - t0) / (t1 - t0); return lerp(a, b, i === 1 || i === 3 ? u : ss(u) * .5 + u * .5); } return 1900; }
const HZ = -200;
function mood(t) { return t < 29.4 ? 0 : t < 30.8 ? ss(seg(t, 29.4, 30.8)) : t < 36 ? 1 : t < 42 ? lerp(1, 0, ss(seg(t, 38.2, 41.5))) : 0; }
const TRACKS = {
  sail: [[22.0, { z: .88, dx: 190, cy: 40, roll: 0 }], [24.8, { z: 1.0, dx: 250, cy: 60, roll: 0 }], [26.3, { z: 1.02, dx: 110, cy: 70, roll: 0 }], [27.3, { z: 1.65, dx: -30, cy: -5, roll: 0 }], [28.6, { z: 1.7, dx: -10, cy: -50, roll: 0 }],
    [29.4, { z: 1.2, dx: 0, cy: -130, roll: 0 }], [30.0, { z: 1.2, dx: 0, cy: -130, roll: 0 }], [30.4, { z: .78, dx: 60, cy: 30, roll: 0 }], [34.4, { z: .9, dx: 120, cy: 40, roll: 0 }], [35.9, { z: 1.02, dx: 290, cy: 40, roll: 0 }],
    [36.4, { z: .5, dx: 460, cy: -190, roll: 0 }], [38.0, { z: .52, dx: 480, cy: -170, roll: 0 }], [38.9, { z: 1.0, dx: 330, cy: 70, roll: 0 }], [40.0, { z: 1.12, dx: 390, cy: 20, roll: 0 }], [41.0, { z: .62, dx: 560, cy: -20, roll: 0 }], [42.5, { z: .62, dx: 560, cy: -20, roll: 0 }]],
  island: [[41.75, { z: .78, dx: 2660, cy: 10, roll: 0 }], [44.3, { z: .98, dx: 2730, cy: 40, roll: 0 }]],
  feast: [[47.6, { z: 1.35, dx: 2700, cy: -30, roll: 0 }], [51.0, { z: 1.5, dx: 2730, cy: -50, roll: 0 }], [52.5, { z: 1.5, dx: 2730, cy: -50, roll: 0 }], [53.9, { z: .62, dx: 2100, cy: 40, roll: 0 }], [56.0, { z: .225, dx: 0, cy: 200, roll: 0 }], [60, { z: .225, dx: 0, cy: 200, roll: 0 }]],
};
function worldCam(t, track) {
  const k = kf(t, TRACKS[track]);
  const cx = track === 'sail' ? shipX(t) + k.dx : k.dx;
  let roll = k.roll, sx = 0, sy = 0;
  if (track === 'sail') {
    const st = ss(seg(t, 30.0, 30.6)) * (1 - ss(seg(t, 34.2, 34.5)));
    roll += Math.sin(t * 2.4) * .07 * st; sx += Math.sin(t * 31) * 5 * st; sy += Math.cos(t * 27) * 5 * st;
    const d = t - 36.0; if (d > 0 && d < 1) { const a = 20 * Math.exp(-d * 5); sx += Math.sin(d * 80) * a; sy += Math.cos(d * 70) * a; }
  }
  return { z: k.z, cx, cy: k.cy, roll, sx, sy };
}
function crewPose(id, t, i, st) {   // st: 'sail' | 'storm' | 'calm' | 'duck' | 'walk'
  const h = hop(t + i * .13, 1), b = Math.sin(t * 8.4 + i);
  const P = pose({ seed: i + 1, bob: h * 4 });
  if (st === 'sail') { P.face = EXPR.happy; P.aL = [30 + b * 20, 20]; P.aR = [30 - b * 20, 20]; P.lean = Math.sin(t * 4.2 + i) * .05; }
  if (st === 'storm') { P.face = EXPR.panic; P.aL = [150 + b * 20, 160]; P.aR = [150 - b * 20, 160]; P.lean = Math.sin(t * 6 + i) * .12; }
  if (st === 'calm') { P.face = EXPR.worry; P.aL = [10, 5]; P.aR = [10, 5]; P.look = [.9, -.2]; P.bob = 0; }
  if (st === 'duck') { P.face = EXPR.panic; P.aL = [135 + b * 20, 150]; P.aR = [135 - b * 20, 150]; P.lean = Math.sin(t * 9 + i) * .06; P.look = [.9, -.4]; }
  return P;
}
function shipCrew(ctx, t, st, shipLocalSeed = 0) {
  const base = -74;
  const lookUp = st === 'calm' ? .5 : 0;
  // Barnacle, Brisket, Longshanks, Pip on deck, Dot in the nest
  const at = (id, x, s, over = {}) => { const i = ['pip', 'brisket', 'longshanks', 'dot', 'barnacle'].indexOf(id); const P = crewPose(id, t, i, st); Object.assign(P, { x, y: base, s }, over); drawChar(ctx, id, P); };
  // Longshanks with the chart, upside down
  at('longshanks', -215, .47, st === 'sail' ? { aR: [75, 95], aL: [60, 80], face: EXPR.smug, look: [.2, -.4], holdR: (c, x, y) => { c.save(); c.translate(x, y - 30); c.rotate(Math.PI + .1); shape(c, [[-60, -40], [60, -40], [60, 40], [-60, 40]], '#efd9a2', 5, 3); for (let i = 0; i < 3; i++) c.fillStyle = COL.coral, c.fillRect(-40 + i * 30, -4, 12, 12); c.restore(); } } : {});
  at('barnacle', -88, .5, st === 'sail' ? { aR: [150 + Math.sin(t * 5) * 20, 160], face: EXPR.happy, holdR: props.hammer } : {});
  if (st === 'duck' && t >= 38.4) { const bx = lerp(60, 175, ss(seg(t, 38.4, 39.2))), has = t < 39.75; at('brisket', bx, .5, { aR: has ? [102, 100] : [30, 20], aL: [30, 20], face: has ? EXPR.smug : EXPR.chew, holdR: has ? (c, x, y) => food.sandwich(c, x + 30, y - 12, .7, -.2) : null, bob: has ? 0 : hop(t, 4), look: [.9, -.1] }); }
  else at('brisket', 60, .5, st === 'sail' ? { aR: [95 + Math.sin(t * 5) * 14, 110], face: EXPR.chew, holdR: props.ladle } : {});
  at('pip', 245, .52, st === 'sail' ? { aR: [100, 110], aL: [40, 20], face: EXPR.grin, look: [.8, .1] } : {});
  // the pot Brisket stirs
  if (st === 'sail') { ctx.save(); ctx.translate(122, base + 4); shape(ctx, catmull([[-34, -50], [34, -50], [40, -6], [-40, -6]], 3, true), '#4f5a60', 5, 4, { hatch: { ang: .8, gap: 7, w: 1.3 }, off: [2, 3] }); for (let i = 0; i < 3; i++) { const q = (t * .9 + i / 3) % 1; ctx.globalAlpha = 1 - q; shape(ctx, ell(-12 + i * 12 + Math.sin(q * 6) * 8, -60 - q * 90, 16 + q * 14, 12 + q * 10, 12), '#fff', 3.5, i, { off: [0, 0] }); ctx.globalAlpha = 1; } ctx.restore(); }
  // Dot in the crow's nest, with the gull
  ctx.save(); ctx.translate(0, -505); const P = crewPose('dot', t, 3, st); Object.assign(P, { x: 0, y: 0, s: .5, aR: st === 'sail' ? [150 + Math.sin(t * 4) * 15, 160] : P.aR }); if (st === 'sail') { P.face = EXPR.happy; P.look = [.4, -.3]; } drawChar(ctx, 'dot', P); ctx.restore();
  shape(ctx, [[-30, -520], [30, -520], [26, -480], [-26, -480]], COL.wood, 4.5, 8, { hatch: { ang: 1.4, gap: 8, w: 1.3 }, off: [1, 2] });
  ctx.save(); ctx.translate(0, -505 - 150 * .5 * .8 - 50); perchedGull(ctx, 0, -8, .38, 0); ctx.restore();
}
function rain(ctx, t, a) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a;
  parallelLines(ctx, 0, 0, 1920, 1080, 1.95, 120, Math.floor(t * 14) * 3.1, { col: 'rgba(235,245,255,.75)', w: 4, len: 120 });
  ctx.restore();
}
function lightning(ctx, t, t0) {
  const d = t - t0; if (d < 0 || d > .6) return;
  if (d < .14) { ctx.fillStyle = `rgba(255,255,255,${.95 * (1 - d / .14)})`; ctx.fillRect(0, 0, 1920, 1080); }
  if (d < .35) { const pts = [[1300, 0]]; for (let i = 1; i <= 9; i++) pts.push([pts[i - 1][0] + (hash(i * 3.3) - .5) * 160 - 20, i * 80]); ctx.save(); ctx.globalAlpha = 1 - d / .35; ctx.lineJoin = 'miter'; ctx.strokeStyle = COL.ink; ctx.lineWidth = 26; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 12; ctx.stroke(); ctx.restore(); }
}
function stormFace(ctx, t, i, p) {   // a tall slanted strip with one panicking face
  const ids = ['pip', 'brisket', 'longshanks', 'dot', 'barnacle'], ex = ['shout', 'panic', 'shock', 'panic', 'shout'], sc = [2.55, 3.4, 2.5, 2.7, 2.7][i], id = ids[i], C = CREW[id];
  const x = 200 + i * 380, q = slantQuad(x + (i % 2 ? 10 : -10), 540, 350 * back(p, 2), 880 * back(p, 2), 58, 0), z = back(p, 2);
  panel(ctx, q, 11, () => {
    ctx.fillStyle = ['#3a2a6a', '#2b3f6f', '#5a2d5a', '#23576a', '#4a3a28'][i]; ctx.fillRect(x - 200, 60, 420, 960);
    toneFill(ctx, x - 200, 60, x + 220, 1020, { col: '#000', alpha: .3 });
    speedLines(ctx, x, 480, 150, 720, 26, 30 + i, { col: 'rgba(255,255,255,.55)', w: 9 });
    const hy = 440 + Math.sin(t * 17 + i) * 4;
    drawChar(ctx, id, pose({ x: x + Math.sin(t * 23 + i) * 4, y: hy + sc * (C.legL + C.torsoH + C.neck + C.hr[1] * .82), s: sc, face: EXPR[ex[i]], talk: .3 * (.5 + .5 * Math.sin(t * 15 + i)), look: [Math.sin(t * 5 + i), -.3], tilt: Math.sin(t * 9 + i) * .08, seed: 20 + i, aL: [130, 140], aR: [130, 140] }));
  });
}
function dotLook(ctx, t, p) {   // Dot, wide-eyed, sees the cloud
  const z = back(p, 2.2), q = slantQuad(1380, 400, 700 * z, 560 * z, 54 * z, .04);
  panel(ctx, q, 11, () => {
    ctx.fillStyle = '#2c2a54'; ctx.fillRect(900, 100, 960, 760); toneFill(ctx, 900, 100, 1860, 860, { col: '#000', alpha: .3 }); speedLines(ctx, 1380, 400, 140, 640, 28, 77, { col: 'rgba(255,255,255,.5)', w: 9 });
    const C = CREW.dot, sc = 3.6; drawChar(ctx, 'dot', pose({ x: 1380 + Math.sin(t * 30) * 3, y: 400 + sc * (C.legL + C.torsoH + C.hr[1] * .82) - 70, s: sc, face: EXPR.shock, look: [.5, -.8], seed: 4, talk: 0, aL: [120, 130], aR: [140, 150], tilt: Math.sin(t * 13) * .03 }));
  });
}
function rippleRings(ctx, t, x, y, t0) {
  for (let k = 0; k < 4; k++) { const q = ((t - t0) * .6 + k * .28) % 1; if (t < t0) return; ctx.save(); ctx.globalAlpha = (1 - q) * .9; ring(ctx, ell(x, y, 40 + q * 520, 12 + q * 120, 36), 5, k + 3, { col: '#e8fbf5', inside: .5 }); ctx.restore(); }
}
export function sceneWorld(ctx, t, track, ex = {}) {
  const c = worldCam(t, track), m = mood(t), sx = shipX(t);
  setFrame(t, c.z);
  ctx.save(); camSet(ctx, c);
  // sky, sun, clouds (parallax)
  sky(ctx, t, c, m, HZ);
  const par = c.cx * .12;
  sun(ctx, t, c.cx - par + 640, -520, 105, m);
  for (let i = 0; i < 9; i++) cloud(ctx, i * 780 - 600 + par * .6 + t * 14, -430 - (i % 3) * 140, 150 + (i % 4) * 36, i + 1, m, t);
  if (m < .5) for (let i = 0; i < 4; i++) gull(ctx, c.cx + 400 + ((t * 70 + i * 260) % 1400) - 900, -330 - i * 70 + Math.sin(t * 2 + i) * 18, 1.2, t, i);
  // faint tile grout on the mural
  const tileA = ex.tile ?? (.07 + .75 * ss(seg(t, 53.0, 55.6)));
  ctx.save(); ctx.beginPath(); ctx.rect(-9000, HZ - 4800, 18000, 4800 - 1); ctx.clip(); for (let ix = -12; ix < 12; ix++) for (let iy = 1; iy < 14; iy++) if ((ix + iy) % 2) { ctx.fillStyle = `rgba(255,255,255,${tileA * .22})`; ctx.fillRect(ix * 360, HZ - iy * 360, 360, 360); }
  ctx.strokeStyle = `rgba(20,70,80,${tileA})`; ctx.lineWidth = 7 * G.lw; ctx.beginPath(); for (let x = -4320; x <= 4320; x += 360) { ctx.moveTo(x, HZ); ctx.lineTo(x, HZ - 4800); } for (let y = HZ; y > HZ - 4800; y -= 360) { ctx.moveTo(-4320, y); ctx.lineTo(4320, y); } ctx.stroke(); ctx.restore();
  // sea, then the island standing in it
  sea(ctx, t, c, { mood: m, swell: 1 + 1.5 * (t > 30 && t < 34.5 ? ss(seg(t, 30, 31)) : 0) - (t >= 34.5 && t < 36 ? .9 : 0), rows: 9 });
  island(ctx, t, 2750, 160, 1.0, { xmark: t > 41 && t < 44.3 });
  if (t >= 34.5 && t < 36.3) rippleRings(ctx, t, shipX(t) + 700, 330, 34.6);
  // the duck (behind the ship), huge
  const dk = t >= 36.0 && t < 41.9, dkF = t >= 47.6;
  if (dk) {
    const rise = back(seg(t, 36.0, 36.55), 1.7) * (1 - ss(seg(t, 41.2, 41.8))), beak = t < 38.3 ? 0 : t < 39.0 ? ss(seg(t, 38.3, 38.7)) : t < 39.75 ? 1 : t < 39.95 ? 1 - ss(seg(t, 39.75, 39.95)) : 0;
    const sq = 1 + (t > 36 && t < 36.6 ? .12 * Math.sin((t - 36) * 30) * Math.exp(-(t - 36) * 5) : 0) + (t > 39.8 && t < 40.6 ? .08 * Math.sin((t - 39.8) * 26) * Math.exp(-(t - 39.8) * 4) : 0);
    duck(ctx, t, { x: sx + 790, y: 300, s: 1.22, flip: -1, beak, sq, rise, happy: t > 39.9 ? ss(seg(t, 39.9, 40.2)) : 0, eye: t > 38.5 && t < 39.8 ? 1 : 0 });
  }
  // the ship
  const wreck = 0, st = t < 29.4 ? 'sail' : t < 34.5 ? 'storm' : t < 36.0 ? 'calm' : t < 41.0 ? 'duck' : 'sail';
  const roll = (t > 30 && t < 34.5 ? Math.sin(t * 2.4 + .4) * .13 * ss(seg(t, 30, 30.6)) : 0) + (t >= 36 && t < 37.5 ? -.2 * Math.exp(-(t - 36) * 2.6) * Math.cos((t - 36) * 5) : 0);
  const shipY = track === 'feast' ? 262 : 230, shipS = track === 'feast' ? .75 : 1;
  if (t >= 22 && t < 60) ship(ctx, t, { x: sx, y: shipY, s: shipS, roll, bob: !(t >= 34.5 && t < 36.0), sail: m > .5 ? 1.6 : 1, crewFn: track === 'sail' ? (cx) => shipCrew(cx, t, st) : null });
  // crew walking up the beach, then the feast
  if (track === 'island') {
    const ids = ['pip', 'brisket', 'longshanks', 'dot', 'barnacle'];
    ids.forEach((id, i) => { const u = clamp((t - 41.9 - i * .18) / 2.3, 0, 1), x = lerp(2330, 2640, ss(u)) - i * 0, gy = 122 + (hash(i) - .5) * 24, w = Math.abs(Math.sin((t * 5 + i))); const P = crewPose(id, t, i, 'sail'); Object.assign(P, { x: x + i * 0 + (i - 2) * 38 * u, y: gy - w * 6, s: .78, face: i === 0 ? EXPR.grin : EXPR.happy, aL: [20 + Math.sin(t * 5 + i) * 25, 10], aR: i === 0 ? [140, 150] : [20 - Math.sin(t * 5 + i) * 25, 10], holdR: i === 1 ? props.ladle : null, holdL: null }); if (id === 'longshanks') P.holdR = (c, x, y) => { c.save(); c.translate(x, y); c.rotate(.5); stroke(c, [[0, 30], [0, -70]], 8, 3, { col: COL.wood2, taper: .1 }); shape(c, [[-12, -70], [12, -70], [30, -110], [-30, -110]], '#9aa3a8', 4, 3); c.restore(); }; drawChar(ctx, id, P); });
    // a pair of spades on shore
  }
  if (track === 'feast') feast(ctx, t);
  // the tub: enamel walls and rim fade in as the camera pulls out
  const tp = ss(seg(t, 53.2, 55.8));
  if (tp > 0) tubFrame(ctx, t, tp);
  ctx.restore();
  // storm overlays (screen space)
  if (track === 'sail') {
    if (m > .4) { ctx.fillStyle = `rgba(30,20,60,${.28 * m})`; ctx.fillRect(0, 0, 1920, 1080); toneFill(ctx, 0, 0, 1920, 1080, { col: '#1a1038', alpha: .22 * m }); }
    rain(ctx, t, t >= 30.4 && t < 34.4 ? ss(seg(t, 30.4, 31)) : 0);
    if (t >= 30.75 && t < 34.5) for (let i = 0; i < 5; i++) { const p = seg(t, 30.75 + i * .75, 31.0 + i * .75); if (p > 0) stormFace(ctx, t, i, p); }
    if (t >= 29.25 && t < 30.0) { const p = seg(t, 29.25, 29.5); dotLook(ctx, t, p); }
    lightning(ctx, t, 32.25);
  }
}
function tubFrame(ctx, t, a) {
  // enamel walls on both sides and the near rim; the water's cut-away edge
  const L = -3900, R = 3900, B = 2350;
  ctx.save(); ctx.globalAlpha = a;
  const wallL = [[L - 520, HZ - 140], [L, HZ - 140], [L, B], [L - 520, B + 420]], wallR = [[R, HZ - 140], [R + 520, HZ - 140], [R + 520, B + 420], [R, B]];
  for (const w of [wallL, wallR]) shape(ctx, w, '#f4efe2', 18, 5, { hatch: { ang: .9, gap: 60, w: 6, alpha: .45 }, off: [10, 12] });
  const front = [[L - 520, B], [R + 520, B], [R + 520, B + 520], [L - 520, B + 520]];
  shape(ctx, front, '#f9f5ea', 18, 7, { hatch: { ang: 1.3, gap: 70, w: 6, alpha: .35 }, off: [10, 12] });
  stroke(ctx, [[L - 520, B + 40], [R + 520, B + 40]], 30, 8, { col: '#d9d2bd', taper: 0 });
  // tap on the tile wall, the right sock hanging, a drip
  const tx = -1000, ty = HZ - 1150;
  const pipe = [[tx, ty - 1400], [tx, ty], [tx + 200, ty + 130], [tx + 470, ty + 90], [tx + 520, ty + 260]];
  tube(ctx, pipe, 150, 130, '#d8dfe2', 16, 5, { hatch: { ang: .9, gap: 40, w: 4 } });
  shape(ctx, ell(tx + 520, ty + 275, 112, 56, 20), '#b4bcc1', 14, 6);
  shape(ctx, ell(tx - 330, ty - 500, 170, 170, 18), COL.coral, 16, 7, { off: [8, 10] }); shape(ctx, ell(tx + 330, ty - 500, 170, 170, 18), COL.teal2, 16, 8, { off: [8, 10] });
  const sw = Math.sin(t * 1.3) * .04, S = 3.2, sxp = tx + 520, syp = ty + 250 + 150 * S;
  ctx.save(); ctx.translate(sxp, ty + 250); ctx.rotate(sw); ctx.translate(-sxp, -(ty + 250)); sock(ctx, sxp, syp, S, 0, { toe: 1, seed: 21 }); ctx.restore();
  const per = 1.5, F = .8, tipX = sxp - 70 * S, tipY = syp + 110 * S, y1 = HZ + 150;
  if (t > 53.9) {
    const u = (t - 53.9) % per;
    if (u < F) { const dy = lerp(tipY, y1, (u / F) * (u / F)); ctx.fillStyle = COL.sky; ctx.strokeStyle = COL.ink; ctx.lineWidth = 14 * G.lw; ctx.beginPath(); ctx.ellipse(tipX, dy, 24, 38 + (u / F) * 26, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    else { const ag = (u - F) / .7; ctx.save(); ctx.globalAlpha *= clamp(1 - ag, 0, 1); ring(ctx, ell(tipX, y1 + 40, 60 + ag * 420, 18 + ag * 100, 30), 8, 5, { col: '#f4fffb', inside: .5 }); ctx.restore(); }
  }
  ctx.restore();
}
function feast(ctx, t) {
  const gy = 148, tops = 110;
  const ids = ['pip', 'brisket', 'longshanks', 'dot', 'barnacle'], xs = [2400, 2548, 2696, 2838, 2980], ph = [0, .2, .45, .1, .35];
  const k = seg(t, 47.9, 48.3);
  ids.forEach((id, i) => {
    const b = hop(t - .1 + ph[i], 1), lt = t < 52.5 ? 1 : .5;
    const P = pose({ x: xs[i], y: gy + 12 - b * 7, s: .88, seed: i + 5, face: mix(EXPR.laugh, EXPR.grin, .5 + .5 * Math.sin(t * 5.2 + i)), tilt: Math.sin(t * 6.2 + i * 1.3) * .16 - .1, lean: Math.sin(t * 4.2 + i) * .06, hs: [1 + b * .05, 1 - b * .06], talk: .4 * Math.abs(Math.sin(t * 12 + i * 2)), aL: [140 + Math.sin(t * 8 + i) * 22, 150], aR: [140 - Math.sin(t * 8 + i) * 22, 160 + Math.sin(t * 9 + i) * 10], look: [0, -.2] });
    if (id === 'pip') { P.holdR = (c, x, y) => sock(c, x, y - 10, .42, -.2, { toe: 1, seed: 3 }); P.aR = [150, 168]; }
    if (id === 'brisket') { P.holdR = props.drumstick; P.holdL = props.drumstick; }
    if (id === 'barnacle') P.holdR = (c, x, y) => { c.save(); c.translate(x, y); shape(c, [[-18, -20], [18, -20], [14, 18], [-14, 18]], '#aeb7bd', 4, 3); c.restore(); };
    drawChar(ctx, id, P);
  });
  // the table
  const tl = 2290, tr = 3090;
  shape(ctx, [[tl + 10, tops - 14], [tr - 10, tops - 14], [tr + 24, tops + 28], [tl - 24, tops + 28]], '#d99a58', 7, 71, { hatch: { ang: .1, gap: 12, w: 1.6 }, off: [3, 4] });
  shape(ctx, [[tl - 24, tops + 28], [tr + 24, tops + 28], [tr + 14, tops + 132], [tl - 14, tops + 132]], '#a96b3a', 7, 72, { hatch: { ang: 1.45, gap: 12, w: 1.8 }, off: [3, 4] });
  for (const lx of [tl + 20, tr - 20]) stroke(ctx, [[lx, tops + 130], [lx, tops + 200]], 16, 5 + lx, { col: COL.wood2, taper: .05 });
  // food on the table
  food.fish(ctx, 2340, tops + 12, .55, 1); food.pie(ctx, 2470, tops + 14, .5, 2); food.pine(ctx, 2600, tops + 8, .5, 3); food.bread(ctx, 2740, tops + 18, .5, 4); food.melon(ctx, 2850, tops + 14, .5, 5); food.pie(ctx, 2960, tops + 14, .46, 6); food.sandwich(ctx, 3040, tops + 10, .5, .1, 7);
  // the duck, a guest at the end of the table
  if (t >= 48.3) { const a = back(seg(t, 48.3, 48.9), 1.8); ctx.save(); ctx.translate(3300, 330 - 120 * a); ctx.scale(-.62, .62); duck(ctx, t, { x: 0, y: 0, s: 1, flip: 1, beak: 0, happy: .9 }); ctx.restore(); }
}

// ======================================================================================================== dig, chest, shock
export function sceneDig(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, '#f8e2a0'); g.addColorStop(1, '#e8c070'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
  hatchFill(ctx, 0, 0, 1920, 1080, { ang: .12, gap: 22, w: 2, col: 'rgba(150,100,30,.55)' }, 3); toneFill(ctx, 0, 600, 1920, 1080, { col: '#a06820', alpha: .3 });
  const hole = ss(seg(t, 44.35, 45.5)), cx = 960, cy = 690;
  // the X first
  if (t < 44.9) for (const sg of [-1, 1]) stroke(ctx, [[cx - 140, cy - 80 * sg], [cx + 140, cy + 80 * sg]], 30, 41 + sg, { col: COL.coral, taper: .1 });
  // the hole
  const shake = t > 45.55 && t < 45.9 ? Math.sin(t * 90) * 4 : 0;
  const hp = ell(cx, cy, 120 + 330 * hole, 40 + 150 * hole, 36, .06, 7);
  shape(ctx, hp, '#3a2210', 8, 7, { off: [0, 0] });
  ctx.save(); path(ctx, hp); ctx.clip(); hatchFill(ctx, cx - 500, cy - 200, cx + 500, cy + 200, { ang: 1.1, gap: 14, w: 2, col: '#000', alpha: .5 }, 5); ctx.restore();
  // rays from the chest and the chest itself, rising
  const lid = ss(seg(t, 45.75, 46.0)), rise = ss(seg(t, 45.3, 45.7));
  if (t > 45.3) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1920, cy + 140); ctx.clip();
    chest(ctx, cx + shake, cy + 130 - rise * 70, 2.35, lid, t);
    // the sock rises out of the chest on the opening, wiggling
    const sk = ss(seg(t, 45.95, 46.5));
    if (sk > 0) { const y = lerp(cy - 10, cy - 560, sk); sock(ctx, cx + Math.sin(t * 9) * 16, y, 2.3, Math.sin(t * 8) * .14 + .05, { toe: 1 }); }
    ctx.restore();
  }
  // the spades dig in turns
  for (let i = 0; i < 3; i++) {
    const ph = ((t - 44.3 - i * .1) / .3) % 1, d = ph < .5 ? ss(ph / .5) : 1 - ss((ph - .5) / .5), act = t < 45.5 ? 1 : 0;
    if (!act) continue;
    const sx2 = [cx - 360, cx, cx + 360][i], sy = lerp(-100, cy - 90 + (i === 1 ? 40 : 0), d);
    stroke(ctx, [[sx2, sy - 700], [sx2 + 10, sy]], 20, 30 + i, { col: COL.wood2, taper: .05 });
    shape(ctx, [[sx2 - 50, sy], [sx2 + 70, sy], [sx2 + 50, sy + 120], [sx2 + 10, sy + 150], [sx2 - 30, sy + 120]], '#9aa3a8', 7, 33 + i, { hatch: { ang: 1.1, gap: 9, w: 1.8 }, off: [3, 4] });
    shape(ctx, ell(sx2 + 5, sy - 380, 46, 40, 14), [COL.skin3, COL.skin2, COL.skin1][i], 6, 40 + i, { off: [2, 3] });
    // dirt flying
    if (d > .3) for (let j = 0; j < 7; j++) { const a = (j / 7 - .5) * 2.2, v = 260 + hash(j * 3.7 + i) * 240, tt = (ph < .5 ? ph : 0) * .6, dx = Math.sin(a) * v * tt * 2, dy = -Math.cos(a) * v * tt * 2 + 900 * tt * tt; shape(ctx, ell(sx2 + dx, sy - 30 + dy, 14 - j, 11 - j * .8, 8), '#a8743a', 4, j + i * 9, { off: [0, 0] }); }
  }
  speedLines(ctx, cx, cy, 700, 1300, 30, 8, { col: 'rgba(29,22,18,.25)', w: 8 });
}
export function sceneShock(ctx, t) {
  const sh = t - 46.5;
  ctx.fillStyle = '#f46aa6'; ctx.fillRect(0, 0, 1920, 1080);
  ctx.fillStyle = 'rgba(255,255,255,.28)'; for (let i = 0; i < 24; i += 2) { const a0 = i / 24 * TAU, a1 = (i + 1) / 24 * TAU; ctx.beginPath(); ctx.moveTo(900, 540); ctx.lineTo(900 + Math.cos(a0) * 2600, 540 + Math.sin(a0) * 2600); ctx.lineTo(900 + Math.cos(a1) * 2600, 540 + Math.sin(a1) * 2600); ctx.fill(); }
  speedLines(ctx, 900, 540, 430, 1500, 52, 14, { w: 14 });
  const p = seg(sh, 0, .22), sc = 4.0 * (.55 + .45 * back(p, 2.6)), cry = ss(seg(sh, .75, 1.0));
  const face = mix(EXPR.shock, EXPR.worry, ss(seg(sh, .55, .9)));
  const cy = 560;
  // tears
  drawChar(ctx, 'pip', pose({ x: 880 + Math.sin(sh * 60) * 3 * Math.exp(-sh * 3), y: cy + sc * 146, s: sc, face, talk: sh > .3 ? .25 * (.5 + .5 * Math.sin(t * 15)) * (1 - cry * .5) : 0, look: [.9 * ss(seg(sh, .25, .5)), -.1], tilt: -.05 + Math.sin(t * 4) * .02, aL: [100, 120], aR: [140, 160], seed: 1 }));
  if (cry > 0) for (const s of [-1, 1]) { const ex = 880 + s * 64 * sc * .39 * 1.0, ey = cy + 4; ctx.save(); ctx.globalAlpha = cry; stroke(ctx, quad([ex, ey + 20], [ex + s * 140, ey + 20], [ex + s * 190, ey + 300 + Math.sin(t * 10) * 20], 12), 34, 90 + s, { col: COL.sky, taper: .4, boil: false }); stroke(ctx, quad([ex, ey + 20], [ex + s * 140, ey + 20], [ex + s * 190, ey + 300 + Math.sin(t * 10) * 20], 12), 8, 95 + s, { col: '#fff', taper: .4, boil: false }); ctx.restore(); }
  // the sock in his hand
  const sp = ss(seg(sh, .0, .3)); sock(ctx, 1520, 520 + (1 - sp) * 400, 2.7, .28 + Math.sin(t * 6) * .04, { toe: 1 });
  if (sh > .4) { ctx.save(); ctx.translate(1520, 760); }
  if (sh > .4) ctx.restore();
}
export function sceneIrisHold() { }

// ======================================================================================================== wipes, captions
export function wipe(ctx, w, p, draw) {   // draw() paints the new scene; the clip is the revealed region
  const e = ss(p);
  ctx.save();
  if (w.kind === 'slash') {
    const x0 = lerp(2400, -520, e), sk = .5;
    ctx.beginPath(); ctx.moveTo(x0 + (0 - 540) * sk, 0); ctx.lineTo(4000, 0); ctx.lineTo(4000, 1080); ctx.lineTo(x0 + (1080 - 540) * sk, 1080); ctx.closePath(); ctx.clip(); draw(); ctx.restore();
    ctx.save(); ctx.fillStyle = COL.sun; ctx.beginPath(); ctx.moveTo(x0 - 120 + (0 - 540) * sk, 0); ctx.lineTo(x0 + (0 - 540) * sk, 0); ctx.lineTo(x0 + (1080 - 540) * sk, 1080); ctx.lineTo(x0 - 120 + (1080 - 540) * sk, 1080); ctx.fill();
    ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.moveTo(x0 - 120 + (0 - 540) * sk - 14, 0); ctx.lineTo(x0 - 120 + (0 - 540) * sk, 0); ctx.lineTo(x0 - 120 + (1080 - 540) * sk, 1080); ctx.lineTo(x0 - 120 + (1080 - 540) * sk - 14, 1080); ctx.fill(); ctx.beginPath(); ctx.moveTo(x0 + (0 - 540) * sk, 0); ctx.lineTo(x0 + 16 + (0 - 540) * sk, 0); ctx.lineTo(x0 + 16 + (1080 - 540) * sk, 1080); ctx.lineTo(x0 + (1080 - 540) * sk, 1080); ctx.fill(); ctx.restore(); return;
  }
  if (w.kind === 'grow') {   // a slanted panel grows from the chart's X to the whole frame
    const k = e, cx = lerp(1575, 960, k), cy = lerp(372, 540, k), q = slantQuad(cx, cy, lerp(60, 2400, k), lerp(40, 1500, k), lerp(8, 90, k), -.05 * (1 - k));
    ctx.beginPath(); q.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.clip(); draw(); ctx.restore();
    ring(ctx, q.flatMap((a, i) => { const b = q[(i + 1) % 4]; return [0, .2, .4, .6, .8].map(u => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)]); }), 12, 4, { inside: 1, shade: [0, 0] }); return;
  }
  if (w.kind === 'iris') {
    const r = lerp(30, 1500, e), cx = 880, cy = 560, pts = ell(cx, cy, r, r * .92, 40, .03, 5);
    path(ctx, pts); ctx.clip(); draw(); ctx.restore(); ring(ctx, pts, 14, 3, { inside: .2 }); return;
  }
  if (w.kind === 'wave') {   // a wall of curled water sweeps from the right, carrying the new scene on its back
    const x0 = lerp(2300, -400, e), pts = [];
    for (let y = -60; y <= 1140; y += 20) pts.push([x0 + Math.sin(y * .011 + .8) * 90 + Math.sin(y * .031) * 25, y]);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(4000, 1140); ctx.lineTo(4000, -60); ctx.closePath(); ctx.clip(); draw(); ctx.restore();
    ctx.save();
    for (let y = -80; y < 1160; y += 150) { const [px, py] = [x0 + Math.sin(y * .011 + .8) * 90 + Math.sin(y * .031) * 25, y + 75]; ctx.save(); ctx.translate(px + 20, py + 100); ctx.rotate(-Math.PI / 2); waveGlyph(ctx, 0, 0, 260, 190, lerpc(COL.teal3, '#ffffff', .2 + .3 * (Math.round(y / 150) % 2)), 40 + y, { lw: 7, under: { ang: 1, gap: 12, w: 2 } }); ctx.restore(); }
    ctx.restore(); return;
  }
}
export function caption(ctx, t, cues) {
  const c = cues.find(q => t >= q.t0 && t < q.t1); if (!c) return;
  const a = ss(seg(t, c.t0, c.t0 + .15)) * (1 - ss(seg(t, c.t1 - .15, c.t1))), size = 44;
  ctx.save(); ctx.font = `${size}px Hand`; const w = ctx.measureText(c.text).width + 56, h = 74, x = 56, y = 1080 - 50 - h;
  ctx.globalAlpha = a; ctx.translate(x, y + (1 - ss(seg(t, c.t0, c.t0 + .2))) * 16); ctx.rotate(-.006);
  ctx.fillStyle = 'rgba(30,15,5,.4)'; ctx.fillRect(8, 8, w, h);
  ctx.fillStyle = '#fff4d6'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = COL.ink; ctx.lineWidth = 5; ctx.strokeRect(0, 0, w, h); ctx.lineWidth = 2; ctx.strokeRect(7, 7, w - 14, h - 14);
  ctx.fillStyle = COL.ink; ctx.textBaseline = 'middle'; ctx.fillText(c.text, 28, h / 2 + 2);
  ctx.restore();
}
export function sfxLayer(ctx, t) {
  for (const s of SFX) {
    if (t < s.t0 || t > s.t0 + s.dur) continue;
    const p = t - s.t0, fade = ss(seg(p, s.dur - .25, s.dur));
    const b = sfx(ctx, s.text, s.x, s.y, s.size, s.rot, p, { fill: s.fill, shadow: s.shadow, fade });
    if (b) TX.push({ id: s.id, text: s.text, ...b });
  }
}
