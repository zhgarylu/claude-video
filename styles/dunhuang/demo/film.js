// film.js: Borrowed Lamplight. Four walls (A border, B flying register, C three registers, D coffer ceiling), one lamp, nine shots.
// Every effect is a function of t: wake = arrival time per wall point, depart = time the paint leaves again, debris born at those times.
import { clamp, lerp, seg, ss, mulberry, hash, TAU } from '/core/lib.js';
import { buildWall, shadeFrame } from './wall.js';
import { PAL, mix, wire, polyPath } from './brush.js';
import { groundFill, scatter, cellBand, vine, diaper, lotus, coffer, pennants, plaque, flower, petalPts } from './motifs.js';
import { drawApsara } from './apsara.js';
import { BAR, DUR, bar, SHOTS, LINES, winOf, TITLE } from './timeline.js';

const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const F = { sub: n => `600 ${n}px "Noto Serif SC"`, title: '700 128px "Ma Shan Zheng"' };
const WALLS = {
  A: { W: 3800, H: 1220, seed: 41, crack: 1.2, loss: .34, edge: .55 },
  B: { W: 2100, H: 1500, seed: 53, crack: 1.1, loss: .32, edge: .5 },
  C: { W: 3700, H: 1220, seed: 67, crack: 1.2, loss: .32, edge: .5 },
  D: { W: 2100, H: 1500, seed: 79, crack: 1.1, loss: .34, edge: .5 },
};
let wallKey = null, wall = null;
const getWall = k => { if (k !== wallKey) { wall = null; wall = buildWall(WALLS[k]); wallKey = k; } return wall; };

function rules(ctx, x, y, w, h) {
  ctx.fillStyle = PAL.lead; ctx.fillRect(x, y, w, h); ctx.fillStyle = PAL.cinnabarD; ctx.fillRect(x, y + h * .3, w, h * .4);
  ctx.fillStyle = PAL.soot; ctx.fillRect(x, y - 1.5, w, 3); ctx.fillRect(x, y + h - 1.5, w, 3);
}
const roundels = (ctx, n, x0, step, cy, r) => { for (let i = 0; i < n; i++) { const cx = x0 + i * step; ctx.fillStyle = PAL.azurite; ctx.beginPath(); ctx.arc(cx, cy, r + 14, 0, TAU); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = PAL.soot; ctx.stroke(); lotus(ctx, cx, cy, r, i % 2 ? { rings: [{ n: 8, len: 1, w: .3, col: PAL.lead }, { n: 8, len: .7, w: .26, col: PAL.cinnabar, rot: .39 }, { n: 8, len: .42, w: .22, col: PAL.ochreL }] } : undefined); } };

// ---------------------------------------------------------------- paint of each wall
function paintA(ctx, t) {
  groundFill(ctx, 0, 0, 3800, 1220, PAL.earth, 5);
  scatter(ctx, [0, 330, 3800, 880], 70, 21, (x, y) => (y > 300 && y < 930) || y > 1090 || y < 340, [PAL.lead, PAL.lead, PAL.azuriteL, PAL.ochreL, PAL.malachiteL]);
  vine(ctx, 0, 3800, 200, 40, 230, 5, { stem: PAL.soot });
  rules(ctx, 0, 316, 3800, 28); cellBand(ctx, 0, 344, 3800, 456, 152, 3); rules(ctx, 0, 800, 3800, 28);
  diaper(ctx, 0, 828, 3800, 76, 76, PAL.azurite, PAL.lead); rules(ctx, 0, 904, 3800, 22);
  scatter(ctx, [0, 930, 3800, 270], 24, 8, null, [PAL.lead, PAL.ochreL, PAL.azuriteL]);
}
function paintB(ctx, t) {
  groundFill(ctx, 0, 0, 2100, 1500, PAL.earth, 9);
  groundFill(ctx, 0, 20, 2100, 300, mix(PAL.lead, PAL.ochreL, .3), 2); roundels(ctx, 8, 150, 280, 170, 100);
  pennants(ctx, 0, 20, 2100, 40, 52, [PAL.cinnabar, PAL.lead, PAL.azurite, PAL.ochre]); rules(ctx, 0, 320, 2100, 30);
  scatter(ctx, [0, 360, 2100, 640], 36, 31, (x, y) => Math.hypot(x - 850, y - 640) < 330 || Math.hypot(x - 1620, y - 690) < 300 || y > 880 && y < 1000 && x < 780 || y > 760 && y < 860 && x > 860 && x < 1600, [PAL.lead, PAL.ochreL, PAL.azuriteL, PAL.malachiteL]);
  drawApsara(ctx, { x: 850, y: 640, s: 2.6, t, seed: 1, pal: { skirt: PAL.azurite } });
  drawApsara(ctx, { x: 1720, y: 700, s: 1.6, t, seed: 4, flip: true, hold: 'pipa', pal: { skirt: PAL.ochre, ribA: [PAL.lead, PAL.azurite], ribB: [PAL.malachiteL, PAL.lead], ribC: [PAL.azuriteL, PAL.ochreL] } });
  rules(ctx, 0, 1000, 2100, 28); diaper(ctx, 0, 1028, 2100, 74, 74, PAL.azurite, PAL.lead); rules(ctx, 0, 1102, 2100, 26);
  cellBand(ctx, 0, 1128, 2100, 350, 116, 12);
}
function paintC(ctx, t) {
  groundFill(ctx, 0, 0, 3700, 1220, PAL.earth, 9);
  groundFill(ctx, 0, 70, 3700, 270, mix(PAL.lead, PAL.ochreL, .3), 2); roundels(ctx, 13, 150, 280, 215, 90);
  pennants(ctx, 0, 70, 3700, 40, 92, [PAL.cinnabar, PAL.lead, PAL.azurite, PAL.ochre]); rules(ctx, 0, 340, 3700, 30);
  groundFill(ctx, 0, 370, 3700, 460, mix(PAL.malachiteD, PAL.earthD, .2), 4);
  const figs = [[450, 600, 'pipa', 3], [1300, 560, 'lotus', 5], [2150, 610, 'pipa', 7], [2950, 570, 'lotus', 9], [3500, 600, 'pipa', 11]];
  scatter(ctx, [0, 380, 3700, 440], 70, 31, (x, y) => figs.some(f => Math.hypot(x - f[0], y - f[1]) < 220), [PAL.lead, PAL.ochreL, PAL.azuriteL]);
  const pals = [{ skirt: PAL.cinnabar, ribA: [PAL.azuriteL, PAL.lead], ribB: [PAL.ochreL, PAL.cinnabarL], ribC: [PAL.lead, PAL.azurite] }, { skirt: PAL.ochre, ribA: [PAL.lead, PAL.cinnabar], ribB: [PAL.malachiteL, PAL.lead], ribC: [PAL.azuriteL, PAL.ochreL] }];
  figs.forEach((f, i) => drawApsara(ctx, { x: f[0], y: f[1], s: 1.15, t, seed: f[3], hold: f[2], pal: pals[i % 2] }));
  rules(ctx, 0, 830, 3700, 26); diaper(ctx, 0, 856, 3700, 70, 70, PAL.azurite, PAL.lead); rules(ctx, 0, 926, 3700, 22);
  cellBand(ctx, 0, 948, 3700, 202, 101, 12);
}
function paintD(ctx, t) {
  groundFill(ctx, 0, 0, 2100, 1500, mix(PAL.earth, PAL.earthD, .35), 6);
  scatter(ctx, [0, 0, 2100, 1130], 60, 41, (x, y) => (Math.abs(x - 1050) < 560 && Math.abs(y - 600) < 560) || (x < 560 && y > 520 && y < 760) || (x > 1590 && y > 380 && y < 840) || Math.hypot(x - 330, y - 300) < 210 || Math.hypot(x - 330, y - 920) < 210 || Math.hypot(x - 1770, y - 300) < 210 || Math.hypot(x - 1770, y - 900) < 210, [PAL.lead, PAL.ochreL, PAL.azuriteL]);
  coffer(ctx, 1050, 600, 1000, 3);
  const pa = [{ skirt: PAL.azurite }, { skirt: PAL.ochre, ribA: [PAL.lead, PAL.azurite], ribB: [PAL.malachiteL, PAL.lead], ribC: [PAL.azuriteL, PAL.ochreL] }];
  [[330, 310, false], [330, 930, false], [1770, 300, true], [1770, 900, true]].forEach((f, i) => drawApsara(ctx, { x: f[0], y: f[1], s: .95, t, seed: 20 + i, flip: f[2], pal: pa[i % 2] }));
  rules(ctx, 0, 1112, 2100, 26); cellBand(ctx, 0, 1138, 2100, 300, 150, 17);
}
const PAINT = { A: paintA, B: paintB, C: paintC, D: paintD };

// ---------------------------------------------------------------- cameras
const camC = t => { const u = t - bar(8); return 100 + 140 * u + 13.5 * u * u; };
const CAMC_END = camC(bar(10));
function shotOf(t) { for (const s of SHOTS) if (t < s.t1) return s.id; return 's9'; }
function camera(t, id) {
  const [s7a, s7b] = [bar(11), bar(14)];
  if (id === 's1') return { x: 1700, y: 70, z: 1 };
  if (id === 's2') return { x: 1700 - 140 * (t - BAR), y: 70, z: 1 };
  if (id === 's3') return { x: 90, y: lerp(420, 110, eio(seg(t, bar(4), bar(6)))), z: 1 };
  if (id === 's4') { const k = ss(seg(t, bar(6), bar(8) - .2)), z = lerp(1, 1.7, k), cx = lerp(1050, 1050, k), cy = lerp(650, 560, k); return { x: cx - 960 / z, y: cy - 540 / z, z }; }
  if (id === 's5') return { x: camC(t), y: 70, z: 1 };
  if (id === 's6') return { x: CAMC_END, y: 70, z: 1 };
  if (id === 's7') { const z = lerp(1.08, .95, ss(seg(t, s7a, s7b))); return { x: 1050 - 960 / z, y: 600 - 540 / z, z }; }
  if (id === 's8') { const k = ss(seg(t, bar(14), bar(16))), z = lerp(.95, 1.1, k), cx = lerp(1050, 1000, k), cy = lerp(600, 880, k); return { x: cx - 960 / z, y: cy - 540 / z, z }; }
  { const k = eio(seg(t, bar(16), DUR)), z = lerp(1.1, 2.6, k), cx = lerp(1000, 1125, k), cy = lerp(880, 1215, k); return { x: cx - 960 / z, y: cy - 540 / z, z }; }
}
// ---------------------------------------------------------------- the lamp: brightness curve and position
const keyed = (t, keys) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ss(seg(t, keys[i - 1][0], keys[i][0]))); return keys[keys.length - 1][1]; };
const DIM = [[0, .06], [3.0, 1], [9.4, 1], [10.0, .04], [10.6, 1], [22.8, 1], [23.33, .04], [23.9, 1], [27.6, 1], [29.8, .07], [33.3, .05], [33.7, .05], [35.6, 1], [43.3, 1], [50, .55], [52.2, .4], [DUR, .12]];
function lampOf(t, id, cam) {
  const cx = cam.x + 960 / cam.z, cy = cam.y + 540 / cam.z, R = 680 / cam.z;
  let x = cx - 60 / cam.z, y = cy + 20 / cam.z;
  if (id === 's1') x = cam.x + lerp(1900, 1450, ss(seg(t, 0, 3.3))), y = cam.y + lerp(700, 540, ss(seg(t, 0, 3.3)));
  if (id === 's9') y = cy - 30 / cam.z;
  const fl = 1 + .035 * Math.sin(t * 19.3) + .03 * Math.sin(t * 31.7 + 1) + .02 * Math.sin(t * 7.1);
  return { x: x + 5 * Math.sin(t * 5.3), y: y + 4 * Math.sin(t * 6.7), z: 130, R, i: 3.0 * keyed(t, DIM) * fl, col: [1, .85, .63], fall: 1.9 };
}
// ---------------------------------------------------------------- wake / depart arrival times (seconds)
const J = (x, y, s) => hash(Math.floor(x / 7) * 13.1 + Math.floor(y / 7) * 7.7 + s) * .05;
const A_CELL = 152, A_C0 = [3116, 575];
function arrA(x, y) {
  let a = 1e3; const d0 = Math.hypot(x - 3075, y - 575); if (d0 < 80) a = 1.6667 + d0 / 600;
  const inRow = y > 344 && y < 800, xc = inRow ? Math.floor(x / A_CELL) * A_CELL + A_CELL / 2 : x, j = inRow ? hash(Math.floor(x / A_CELL) + 3) * .12 : 0;
  const sw = xc >= 1855 ? 3.4 + (3681 - xc) / 560 : BAR + (2320 - xc) / 140;
  return Math.min(a, sw + j);
}
const arrB = (x, y) => 10.6 + Math.hypot(x - 850, y - 600) / 430 + J(x, y, 1);
function arrC(x, y) { const e = x - 1600; const u = e >= 0 ? (-140 + Math.sqrt(140 * 140 + 4 * 13.5 * e)) / 27 : e / 140; return bar(8) + u + J(x, y, 2); }
const arrD = (x, y) => 34.5833 + Math.hypot(x - 1050, y - 600) / 180 + J(x, y, 3);
const depD = (x, y) => (Math.hypot(x - 1125, y - 1215) < 95 ? 1e3 : 43.7 + (2100 - x) / 330 + J(x, y, 4));
const LAST = [1125, 1215];

// ---------------------------------------------------------------- per-frame state
function stateOf(t) {
  const id = shotOf(t), wk = id === 's1' || id === 's2' ? 'A' : id === 's3' || id === 's4' ? 'B' : id === 's5' || id === 's6' ? 'C' : 'D';
  const cam = camera(t, id), lamp = lampOf(t, id, cam);
  const arr = { A: arrA, B: arrB, C: arrC, D: arrD }[wk];
  const keep = [];
  for (const l of LINES) { const [a, b] = winOf(l); if (l.wall === wk && t > a && t < b) { const q = PLQ[l.id]; keep.push([q[0] - 6, q[1] - 6, q[2] + 6, q[3] + 6]); }; }
  if (wk === 'D' && t > TITLE.t0 && t < TITLE.t1) keep.push([1690, 380, 1914, 850]);
  const S = { cam, p: t, wake: arr, band: .32, wakeJit: .5, wearAmt: 1, freshWear: .12, lamp, amb: .11, gain: 1.75, keep: keep.length ? keep : null, frontK: 1 };
  if (wk === 'D') S.depart = depD;
  return { id, wk, cam, S, arr, dep: wk === 'D' ? depD : null };
}
// plaque rectangles in wall space [x0, y0, x1, y1] (for keep) and [x, y, w, h]
const PL = { l1: [1866, 960, 700, 104], l2: [130, 885, 640, 100], l3: [880, 770, 680, 84], l4: [185, 560, 350, 170], l5: [185, 560, 350, 110] };
const PLQ = Object.fromEntries(Object.entries(PL).map(([k, v]) => [k, [v[0], v[1], v[0] + v[2], v[1] + v[3]]]));
const FS = { l1: 40, l2: 38, l3: 34, l4: 26, l5: 28 };
function drawPlaques(ctx, t, wk) {
  for (const l of LINES) {
    if (l.wall !== wk) continue; const [a, b] = winOf(l); if (t < a || t > b) continue;
    const al = Math.min(seg(t, a, a + .3), 1 - seg(t, b - .5, b)), r = PL[l.id];
    ctx.save(); ctx.globalAlpha = al;
    plaque(ctx, r[0], r[1], r[2], r[3], { lines: l.text.map(s => ({ text: s, font: F.sub(FS[l.id]), dy: FS[l.id] * 1.3 })) }); ctx.restore();
  }
  if (wk === 'D' && t > TITLE.t0 && t < TITLE.t1) {
    const al = Math.min(seg(t, TITLE.t0, TITLE.t0 + .6), 1 - seg(t, TITLE.t1 - .6, TITLE.t1));
    ctx.save(); ctx.globalAlpha = al;
    plaque(ctx, 1700, 390, 204, 450, { lines: [{ text: '借', font: F.title, dy: 150 }, { text: '灯', font: F.title, dy: 150 }] });
    ctx.fillStyle = PAL.cinnabar; ctx.fillRect(1818, 770, 56, 56); ctx.fillStyle = PAL.lead; ctx.fillRect(1828, 780, 36, 8); ctx.fillRect(1828, 796, 36, 8); ctx.fillRect(1842, 780, 8, 36); ctx.restore();
  }
}

// ---------------------------------------------------------------- debris: flakes that leave at the wake front, chips of paint that leave as it ages
const DEB = { A: [3800, 120, 1100, 2600], B: [2100, 20, 1450, 1500], C: [3700, 80, 1100, 2600], D: [2100, 20, 1450, 1600] };
const DEBPTS = {};
function debris(out, t, st) {
  const [W, y0, hh, N] = DEB[st.wk];
  const pts = DEBPTS[st.wk] || (DEBPTS[st.wk] = (() => { const r = mulberry(st.wk.charCodeAt(0) * 7), a = []; for (let i = 0; i < N; i++) a.push([r() * W, y0 + r() * hh, r(), r(), r()]); return a; })());
  const cam = st.cam, L = st.S.lamp, LIFE = 1.3;
  for (const p of pts) {
    const sx0 = (p[0] - cam.x) * cam.z; if (sx0 < -80 || sx0 > 2000) continue; const sy0 = (p[1] - cam.y) * cam.z; if (sy0 < -80 || sy0 > 1160) continue;
    for (let k = 0; k < 2; k++) {
      const tb = k === 0 ? st.arr(p[0], p[1]) : (st.dep ? st.dep(p[0], p[1]) : 1e3), age = t - tb;
      if (age < 0 || age > LIFE) continue;
      const u = age / LIFE, sz = (4 + p[2] * 9) * cam.z, x = sx0 + (-30 - 40 * p[3]) * age * cam.z, y = sy0 + (50 * age + 110 * age * age) * cam.z * (.6 + p[4] * .8);
      const d2 = (p[0] - L.x) ** 2 + (p[1] - L.y) ** 2, lit = clamp(L.i / Math.pow(1 + d2 / (L.R * L.R), 1.9) / 3, .12, 1);
      const col = k === 0 ? mix('#a89070', '#6e5236', p[3]) : [PAL.cinnabar, PAL.azurite, PAL.lead, PAL.malachite, PAL.ochre][Math.floor(p[3] * 5)];
      out.save(); out.translate(x, y); out.rotate(age * (p[2] - .5) * 6 + p[4] * 6); out.globalAlpha = (1 - u) * (1 - u * .3) * clamp(lit * 1.3, 0, 1);
      out.fillStyle = col; out.beginPath(); out.moveTo(-sz, -sz * .4); out.lineTo(sz * .2, -sz * .7); out.lineTo(sz, sz * .1); out.lineTo(-sz * .3, sz * .6); out.closePath(); out.fill();
      out.strokeStyle = 'rgba(30,18,10,.6)'; out.lineWidth = 1; out.stroke(); out.restore();
    }
  }
}
// the one flake of shot 6, falling in the dark
function bigFlake(out, t, st) {
  const a = 31.5; if (t < a || t > a + 1.1) return; const age = t - a, cam = st.cam;
  const x = (1150 + CAMC_END - cam.x) * 1 - 0, y = 240 + 700 * age * age;
  const L = st.S.lamp, lit = clamp(L.i / 3 * 6, .15, .9);
  out.save(); out.translate(x + 40 * age, y); out.rotate(age * 3); out.globalAlpha = lit * (1 - seg(age, .8, 1.1));
  out.fillStyle = '#a89070'; out.beginPath(); out.moveTo(-26, -9); out.lineTo(8, -20); out.lineTo(28, 4); out.lineTo(-9, 18); out.closePath(); out.fill(); out.strokeStyle = 'rgba(30,18,10,.7)'; out.lineWidth = 2; out.stroke(); out.restore();
}

// ---------------------------------------------------------------- the page contract
let paintCv = null, pc = null;
export function renderFilm(out, t) {
  if (!paintCv) { paintCv = document.createElement('canvas'); paintCv.width = 1920; paintCv.height = 1080; pc = paintCv.getContext('2d', { willReadFrequently: true }); }
  const st = stateOf(t), w = getWall(st.wk), cam = st.cam;
  pc.setTransform(1, 0, 0, 1, 0, 0); pc.clearRect(0, 0, 1920, 1080);
  pc.setTransform(cam.z, 0, 0, cam.z, -cam.x * cam.z, -cam.y * cam.z);
  PAINT[st.wk](pc, t); drawPlaques(pc, t, st.wk);
  shadeFrame(out, paintCv, w, st.S);
  out.setTransform(1, 0, 0, 1, 0, 0); debris(out, t, st); if (st.id === 's6') bigFlake(out, t, st);
}
export function filmTexts(t) {
  const st = stateOf(t), c = st.cam, out = [], box = (id, text, r) => out.push({ id, text, x0: (r[0] - c.x) * c.z, y0: (r[1] - c.y) * c.z, x1: (r[0] + r[2] - c.x) * c.z, y1: (r[1] + r[3] - c.y) * c.z });
  for (const l of LINES) { const [a, b] = winOf(l); if (l.wall === st.wk && t > a && t < b) box(l.id, l.one, PL[l.id]); }
  if (st.wk === 'D' && t > TITLE.t0 && t < TITLE.t1) box('title', '借灯', [1700, 390, 204, 450]);
  return out;
}

// ---------------------------------------------------------------- sound events (for mix.py): the same functions as the picture
export function buildEvents() {
  const ev = [];
  ev.push({ t: 1.6667, type: 'cellwake', v: 1, pan: .5 });
  for (let i = 0; i < 25; i++) { const xc = i * A_CELL + A_CELL / 2, ta = arrA(xc, 500); if (ta > 3.5 && ta < 9.9) { const cx = 1700 - 140 * Math.max(0, ta - BAR); ev.push({ t: ta, type: 'grain', v: .8, pan: clamp((xc - cx) / 960 - 1, -1, 1) }); } }
  for (let k = 0; ; k++) { const ts = 3.55 + k * .62; if (ts > 9.9) break; ev.push({ t: ts, type: 'step', v: .8 }); }
  for (let ts = bar(8) + .2, d = .62; ts < 29.5; ts += d, d = Math.max(.28, d - .03)) ev.push({ t: ts, type: 'step', v: .9 });
  [9.7, 22.9].forEach(t => ev.push({ t, type: 'swing', v: .8 }));
  [10.4, 13.6, 17.0, 21.2, 24.5, 26.0, 27.4].forEach((t, i) => ev.push({ t, type: 'cloth', v: .6 + .05 * i, pan: (i % 3 - 1) * .5 }));
  [24.2, 24.9, 25.5, 26.4, 27.0, 28.1, 28.9].forEach(t => ev.push({ t, type: 'flake', v: .5 }));
  ev.push({ t: 31.65, type: 'flake', v: 1.0 });
  [0, 150, 300, 450, 600].forEach(d => ev.push({ t: 34.5833 + d / 180, type: 'ring', v: 1 - d / 1200 }));
  ev.push({ t: bar(14) + .1, type: 'sift', v: 1 }); ev.push({ t: 52.0, type: 'sink', v: 1 });
  LINES.forEach(l => ev.push({ t: l.t - .35, type: 'plaque', v: .6 }));
  return ev.sort((a, b) => a.t - b.t);
}
export { DUR };
