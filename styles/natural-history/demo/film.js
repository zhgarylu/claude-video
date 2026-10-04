// film.js: Plate IV composed in world space (1920x1080 = the plate at zoom 1), a camera, and a timeline.
// render(t) is a pure function of t: any frame can be drawn alone.
import { clamp, lerp, seg, ss, eo, eio, track, mulberry } from './engine/util.js';
import { buildPaper, buildTable, SHEET, PS } from './engine/paper.js';
import { nautilusExterior, nautilusSection } from './engine/nautilus.js';
import { snailShell } from './engine/snail.js';
import { fernFrond } from './engine/fern.js';
import { sunflowerHead } from './engine/sunflower.js';
import { loupeSiphuncle } from './engine/loupe.js';
import { makeSpecimen, drawSpecimen } from './engine/specimen.js';
import { inkText, figNo, leader, scaleBar, pin, cutLine, textWidth } from './engine/labels.js';
import { stroke, InkSet } from './engine/ink.js';
import { makeCanvas } from './engine/util.js';

export const DUR = 60;
export const BPM = 72, BEAT = 60 / BPM;              // the score's grid; pins and cuts land on it
const B = n => n * BEAT;

// ---- timeline (seconds). Pins and cuts sit on beats.
export const TL = {
  naut: { pencil: [.2, 3.0], ink: [2.4, 8.2], wash: [7.6, 12.0], pin: B(16) },
  sect: { pencil: [15.0, 16.2], ink: [15.8, 21.8], wash: [21.0, 25.5], pin: B(33) },
  loupe: { pencil: [23.8, 24.8], ink: [24.4, 26.8], wash: [26.0, 28.0], pin: 0 },
  snail: { pencil: [28.4, 29.6], ink: [29.0, 32.4], wash: [31.8, 34.0], pin: B(41) },
  sun: { pencil: [32.4, 33.6], ink: [33.0, 37.2], wash: [36.4, 39.0], pin: B(47) },
  fern: { pencil: [38.6, 40.0], ink: [39.6, 44.6], wash: [43.6, 46.4], pin: B(56) }
};
export const T_CUT = [B(17), B(17) + 1.2];            // the dashed cut line drawn
export const T_RING = [22.4, 23.2], T_LEAD = [23.0, 23.8], T_RROUND = [23.6, 24.8];
export const PT0 = B(68), PT1 = PT0 + 2.5;             // page turn
export const VOICE = { v1: [3.3, 3.981], v2: [7.4, 4.549], v3: [15.0, 6.342], v4: [23.0, 4.031], v5: [28.8, 2.681], v6: [32.8, 6.14], v7: [40.0, 5.082], v8: [47.5, 6.969] };
export const SUBS = {
  v1: 'Every plate begins with a guide, drawn lightly in pencil.', v2: 'A chambered shell. It grows by adding rooms, one at a time.',
  v3: 'Cut it open, and the spiral is a record: each chamber sealed off as the animal outgrew it.', v4: 'A thin tube, the siphuncle, runs through every wall.',
  v5: 'A garden snail coils its shell too.', v6: 'A sunflower packs its seeds in spirals: thirty-four one way, fifty-five the other.',
  v7: 'A young fern keeps its tip rolled in a coil until it is ready to open.', v8: 'Four makers, one shape. Not the same curve, but the same habit: grow outward, and keep what you made.'
};
export const SUBCUES = Object.keys(VOICE).map(id => ({ id, t0: VOICE[id][0], t1: VOICE[id][0] + Math.max(1.8, VOICE[id][1] + .6) + .15, text: SUBS[id] }));

// Camera (cx, cy, zoom). The sheet is 2160 x 1240 world units, so every key keeps the frame on paper.
export const CAM = track([
  [0, [378, 575, 2.7]], [3.5, [380, 560, 2.2]], [7.5, [800, 545, 1.15]], [12.5, [760, 480, 1.38]], [14.2, [700, 470, 1.2]],
  [17.5, [900, 480, 1.3]], [21.8, [980, 490, 1.4]], [23.5, [1000, 480, 1.5]], [27.8, [1000, 480, 1.5]], [29.2, [1000, 560, 1.15]],
  [31, [1290, 520, 1.4]], [39.5, [1290, 520, 1.4]], [41.5, [1230, 650, 1.28]], [46.6, [1230, 650, 1.28]], [49.5, [960, 540, 1.0]], [60, [960, 540, 1.0]]
]);

const POS = { naut: { x: 378, y: 575 }, sect: { x: 872, y: 575 }, snail: { x: 1290, y: 345 }, sun: { x: 1262, y: 735 }, fern: { x: 1510, y: 905 } };
const RC = { x: 1080, y: 285 }, RR = 62;       // the loupe's margin roundel
const S = 2;                                      // cache resolution of the specimen layers
let paper, table, SP = {}, ready = false, ITEMS = [], LEAD = {}, ringSet, TX;
const ORDER = ['naut', 'sect', 'snail', 'sun', 'fern'];

const gr = (pts, w = .7, a = .4) => ({ kind: 'line', pts, w, nib: 0, taper: .3, head: .1, col: '#625b52', a });
const circ = (c, r, n = 90, a0 = 0, a1 = Math.PI * 2) => Array.from({ length: n + 1 }, (_, i) => { const t = a0 + (a1 - a0) * i / n; return { x: c.x + Math.cos(t) * r + Math.sin(t * 7) * .5, y: c.y + Math.sin(t) * r + Math.cos(t * 5) * .5 }; });
const cross = (c, r) => [gr([{ x: c.x - r, y: c.y }, { x: c.x + r, y: c.y }], .6, .3), gr([{ x: c.x, y: c.y - r }, { x: c.x, y: c.y + r }], .6, .3)];
const logSpiral = (c, R, G, a0, turns, n = 220) => Array.from({ length: n + 1 }, (_, i) => { const th = -turns * Math.PI * 2 * (1 - i / n), r = R * Math.exp(Math.log(G) / (Math.PI * 2) * th), a = a0 + th; return { x: c.x + r * Math.cos(a), y: c.y - r * Math.sin(a) }; });

export function build() {
  paper = buildPaper(); table = buildTable(); TX = makeCanvas(8, 8).getContext('2d');
  const mk = (id, def, construct = []) => { def.seed = def.seed || 3; def.construct = construct; SP[id] = makeSpecimen(def, S); };
  const nx = nautilusExterior(POS.naut, { R: 235 }), cN = nx.C;
  mk('naut', nx, [gr(circ(cN, 235)), gr(circ(cN, 235 / 3)), ...cross(cN, 262), gr(logSpiral(cN, 235, 3, -.26, 1.0), .8, .45)]);
  mk('sect', nautilusSection(POS.sect, { R: 235 }), [gr(circ(POS.sect, 235)), gr(circ(POS.sect, 235 / 3)), ...cross(POS.sect, 262), gr(logSpiral(POS.sect, 235, 3, -.26, 2.6), .8, .45)]);
  mk('snail', snailShell(POS.snail, { s: 105, spire: .82 }));
  mk('sun', sunflowerHead(POS.sun, { R: 80 }), [gr(circ(POS.sun, 80)), gr(circ(POS.sun, 48)), ...cross(POS.sun, 140), ...[0, 1, 2, 3, 4, 5].map(i => gr([{ x: POS.sun.x + Math.cos(i * 137.5 * Math.PI / 180) * 12, y: POS.sun.y + Math.sin(i * 137.5 * Math.PI / 180) * 12 }, { x: POS.sun.x + Math.cos(i * 137.5 * Math.PI / 180) * 86, y: POS.sun.y + Math.sin(i * 137.5 * Math.PI / 180) * 86 }], .6, .3))]);
  mk('fern', fernFrond(POS.fern, { L: 540, plen: 150, pinnae: 30, k0: .0009 }));
  mk('loupe', loupeSiphuncle(RC, RR), [gr(circ(RC, RR)), ...cross(RC, RR + 6)]);
  const A = (id, k) => SP[id].anchors[k];
  const SA = A('sect', 'siphuncle'), dir = Math.atan2(RC.y - SA.y, RC.x - SA.x);
  ringSet = new InkSet(); ringSet.add(stroke(circ(SA, 26, 70).map((p, i) => ({ x: p.x, y: p.y })), { w: 1.5, nib: .3, taper: .02, head: .01 }));
  LEAD.apertura = leader({ x: 640, y: 405 }, A('naut', 'lip'), { bend: .12 });
  LEAD.septa = leader({ x: 856, y: 338 }, A('sect', 'pin'), { bend: -.1 });
  LEAD.apex = leader({ x: 1330, y: 250 }, A('snail', 'pin'), { bend: -.1 });
  LEAD.cap = leader({ x: 1075, y: 800 }, { x: POS.sun.x - 44, y: POS.sun.y + 24 }, { bend: .12 });
  LEAD.vern = leader({ x: 1540, y: 478 }, A('fern', 'coil'), { bend: .1 });
  LEAD.loupe = leader({ x: SA.x + Math.cos(dir) * 27, y: SA.y + Math.sin(dir) * 27 }, { x: RC.x - Math.cos(dir) * (RR + 4), y: RC.y - Math.sin(dir) * (RR + 4) }, { bend: .06 });
  // texts: single source for drawing and for TEXTS()
  const W = (txt, o) => textWidth(TX, txt, o);
  const fig = (num, x, y, t0, sub = '') => ({ id: 'fig' + num + sub, kind: 'fig', num, sub, x, y, t0, size: 25, txt: 'Fig. ' + num + sub + '.', w: W('Fig. ', { size: 23, italic: true }) + W(num + sub + '.', { size: 25 }) });
  const lab = (id, txt, x, y, t0, size = 21) => ({ id, kind: 'lab', txt, x, y, t0, size, italic: true, w: W(txt, { size, italic: true }) });
  ITEMS = [
    { id: 'title', kind: 'lab', txt: 'Plate IV.', x: 960, y: 142, t0: 4.6, size: 31, sc: true, track: .24, al: 'c', italic: false, dur: 2.2, w: W('Plate IV.', { size: 31, sc: true, track: .24 }) },
    { id: 'sub', kind: 'lab', txt: 'The Spiral, in Four Makers.', x: 960, y: 182, t0: 6.0, size: 25, italic: true, al: 'c', dur: 2.4, w: W('The Spiral, in Four Makers.', { size: 25, italic: true }), a: .88 },
    fig('1', 222, 330, 10.0), fig('1', 742, 300, 15.0, 'a'), fig('2', 1100, 445, 29.8), fig('3', 1130, 600, 33.6), fig('4', 1372, 596, 40.2),
    lab('aperture', 'aperture', 646, 400, 13.6), lab('septa', 'septa', 862, 334, 19.5), lab('apex', 'apex', 1336, 246, 34.6), lab('capitulum', 'capitulum', 960, 806, 39.4), lab('vern', 'circinate vernation', 1470, 474, 47.0),
    { id: 'lq', kind: 'lab', txt: 'siphuncle, × 5', x: RC.x, y: RC.y + RR + 30, t0: 27.0, size: 20, italic: true, al: 'c', w: W('siphuncle, × 5', { size: 20, italic: true }) }
  ];
  const caps = [['1, 1a.', 'Nautilus pompilius', ' Linn.', 420], ['2.', 'Cepaea nemoralis', ' (Linn.)', 800], ['3.', 'Helianthus annuus', ' Linn.', 1180], ['4.', 'Matteuccia struthiopteris', ' (Linn.)', 1560]];
  caps.forEach(([n, name, auth, cx], i) => {
    const w0 = W(n + ' ', { size: 22 }), w1 = W(name, { size: 23, italic: true }), w2 = W(auth, { size: 18, sc: true, track: .03 });
    ITEMS.push({ id: 'cap' + i, kind: 'cap', n, name, auth, w0, w1, w2, x: cx - (w0 + w1 + w2) / 2, y: 944, t0: 47.8 + i * .55, txt: n + ' ' + name + auth, w: w0 + w1 + w2, size: 23 });
  });
  const sb = (id, x, y, len, label, t0) => ITEMS.push({ id, kind: 'bar', x, y, len, label, t0, txt: label, w: len + 12 + W(label, { size: 17, italic: true }), size: 17 });
  sb('bar1', 260, 800, 235, '10 cm', 51.2); sb('bar2', 1262, 520, 100, '1 cm', 51.8); sb('bar3', 1215, 876, 82, '5 cm', 52.4);
  ready = true;
}

// ---------------------------------------------------------------------------------------------
function stageOf(id, t) {
  const d = TL[id], ws = d.wash, a = SP[id];
  const pencilA = lerp(1, .26, ss(seg(t, ws[0], ws[1] + 2)));
  let washAt, R;
  if (id === 'naut') { washAt = { x: POS.naut.x, y: POS.naut.y }; R = 330; }
  else if (id === 'sect') { washAt = { x: POS.sect.x - 80, y: POS.sect.y - 40 }; R = 330; }
  else { const b = a.bb; washAt = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 }; R = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) * .62; }
  return { pencil: eio(seg(t, d.pencil[0], d.pencil[1])), pencilA, ink: seg(t, d.ink[0], d.ink[1]), wash: seg(t, ws[0], ws[1]), washAt: { ...washAt, R } };
}

function drawItem(ctx, it, t) {
  const p = seg(t, it.t0, it.t0 + (it.dur || 1.2));
  if (p <= 0) return;
  if (it.kind === 'fig') figNo(ctx, it.num, it.x, it.y, { size: it.size, p, sub: it.sub });
  else if (it.kind === 'lab') inkText(ctx, it.txt, it.x, it.y, { size: it.size, italic: !!it.italic, sc: !!it.sc, track: it.track || 0, p, al: it.al || 'l', a: it.a || .88 });
  else if (it.kind === 'cap') {
    const q = seg(t, it.t0, it.t0 + 1.4);
    inkText(ctx, it.n + ' ', it.x, it.y, { size: 22, p: clamp(q * 3) });
    inkText(ctx, it.name, it.x + it.w0, it.y, { size: 23, italic: true, p: clamp(q * 1.6 - .2) });
    inkText(ctx, it.auth, it.x + it.w0 + it.w1, it.y, { size: 18, sc: true, track: .03, p: clamp(q * 2 - 1) });
  } else if (it.kind === 'bar') scaleBar(ctx, it.x, it.y, it.len, it.label, { p: seg(t, it.t0, it.t0 + 1.3), blocks: it.len > 150 ? 4 : 2 });
}

function inkSetAt(ctx, set, p) { if (p <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'multiply'; set.draw(ctx, clamp(p)); ctx.restore(); }

export function drawPlate(ctx, t, W = 1920, H = 1080, cam = null) {
  const [cx, cy, z] = cam || CAM(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = ctx.createPattern(table, 'repeat'); ctx.save(); ctx.translate(-(cx * z) % 256, -(cy * z) % 256); ctx.fillRect(0, 0, W + 256, H + 256); ctx.restore();
  ctx.setTransform(z, 0, 0, z, W / 2 - cx * z, H / 2 - cy * z);
  ctx.save(); ctx.shadowColor = 'rgba(8,10,8,.55)'; ctx.shadowBlur = 34 * z; ctx.shadowOffsetX = 8 * z; ctx.shadowOffsetY = 16 * z;
  ctx.drawImage(paper, SHEET.x0, SHEET.y0, paper.width / PS, paper.height / PS); ctx.restore();
  paperDecor(ctx, t);
  for (const id of ORDER) drawSpecimen(ctx, SP[id], stageOf(id, t));
  // the loupe: ring on the figure, leader, margin roundel
  inkSetAt(ctx, ringSet, seg(t, T_RING[0], T_RING[1]));
  inkSetAt(ctx, LEAD.loupe, seg(t, T_LEAD[0], T_LEAD[1]));
  drawSpecimen(ctx, SP.loupe, (() => { const d = TL.loupe; return { pencil: eio(seg(t, d.pencil[0], d.pencil[1])), pencilA: lerp(1, .3, ss(seg(t, d.wash[0], d.wash[1] + 1))), ink: seg(t, d.ink[0], d.ink[1]), wash: seg(t, d.wash[0], d.wash[1]), washAt: { x: RC.x, y: RC.y, R: 130 } }; })());
  // leaders and the other labels
  const L = (k, t0) => inkSetAt(ctx, LEAD[k], seg(t, t0, t0 + .9) * 1.0);
  L('apertura', 13.6); L('septa', 19.5); L('apex', 34.6); L('cap', 39.4); L('vern', 47.0);
  for (const it of ITEMS) drawItem(ctx, it, t);
  const cp = seg(t, T_CUT[0], T_CUT[1]) * (1 - seg(t, T_CUT[1] + .6, T_CUT[1] + 1.6));
  if (cp > 0) cutLine(ctx, { x: 150, y: POS.naut.y + 4 }, { x: 690, y: POS.naut.y + 4 }, seg(t, T_CUT[0], T_CUT[1]), ['a', 'b']);
  for (const id of ORDER) { const a = SP[id].anchors.pin, pt = seg(t, TL[id].pin, TL[id].pin + .45); if (pt > 0) pin(ctx, a.x, a.y, pt); }
}

function paperDecor() { /* the plate's own printed furniture lives in the paper layer */ }

// the next plate: the same paper, blank but for its construction lines
function drawBlank(ctx, t, W, H) {
  const [cx, cy, z] = CAM(60);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = ctx.createPattern(table, 'repeat'); ctx.fillRect(0, 0, W, H);
  ctx.setTransform(z, 0, 0, z, W / 2 - cx * z, H / 2 - cy * z);
  ctx.drawImage(paper, SHEET.x0, SHEET.y0, paper.width / PS, paper.height / PS);
  const c = { x: 960, y: 560 }, p = seg(t, PT0 + 1.2, PT1 + 1.0);
  const seq = new InkSet(); seq.addAll([gr(circ(c, 250, 120), .8, .4), gr(circ(c, 83, 90), .7, .35), ...cross(c, 285), gr(logSpiral(c, 250, 3, -.26, 2.6), .9, .5)]);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; seq.draw(ctx, p); ctx.restore();
}

let CA, CB;
// Page curl: the fold line is slanted (the corner lifts first); each 20 px band is a cylinder of radius r.
function curl(ctx, A, Bc, f0, r, W, H) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(Bc, 0, 0);
  const st = 3, bh = 20, k = -.22;
  for (let y = 0; y < H; y += bh) {
    const f = f0 + k * (y + bh / 2 - H * .5) * (1 + 0), h = Math.min(bh, H - y);
    const xe = f + r + 6, g1 = ctx.createLinearGradient(xe, 0, xe + 70, 0); g1.addColorStop(0, 'rgba(40,24,8,.34)'); g1.addColorStop(1, 'rgba(40,24,8,0)');
    ctx.fillStyle = g1; ctx.fillRect(xe, y, 70, h);
    if (f > 0) { ctx.drawImage(A, 0, y, Math.min(W, f), h, 0, y, Math.min(W, f), h); }
    const x80 = Math.max(0, f - 80), g2 = ctx.createLinearGradient(f - 80, 0, f, 0); g2.addColorStop(0, 'rgba(40,24,8,0)'); g2.addColorStop(1, 'rgba(40,24,8,.3)');
    if (f > 0) { ctx.fillStyle = g2; ctx.fillRect(x80, y, Math.min(f, 80), h); }
    for (let x = Math.max(0, Math.floor(f)); x < W; x += st) {
      const s = x - f, P = Math.PI * r, ang = Math.min(s / r, Math.PI);
      const xd = s < P ? f + r * Math.sin(ang) : f - (s - P), xn = s + st < P ? f + r * Math.sin(Math.min((s + st) / r, Math.PI)) : f - (s + st - P);
      const w = Math.abs(xn - xd) + .6, dx = Math.min(xd, xn);
      if (dx > W || dx + w < 0) continue;
      const front = s < P / 2, shade = s < P ? (1 - Math.cos(ang)) / 2 : 1;
      if (front) {
        ctx.drawImage(A, x, y, st, h, dx, y, w, h);
        ctx.fillStyle = `rgba(40,24,8,${.3 * shade})`; ctx.fillRect(dx, y, w, h);
      } else {
        ctx.fillStyle = '#e9dbb8'; ctx.fillRect(dx, y, w, h);
        ctx.globalAlpha = .13; ctx.drawImage(A, x, y, st, h, dx, y, w, h); ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(40,24,8,${s < P ? .08 + .24 * (1 - Math.sin(ang)) : .1})`; ctx.fillRect(dx, y, w, h);
      }
      if (s < P) { const hl = Math.pow(Math.sin(ang), 8) * .2; if (hl > .01) { ctx.fillStyle = `rgba(255,248,226,${hl})`; ctx.fillRect(dx, y, w, h); } }
    }
  }
}

function subtitle(ctx, t, W, H) {
  const c = SUBCUES.find(c => t >= c.t0 && t < c.t1); if (!c) return;
  const p = seg(t, c.t0, c.t0 + .45), q = 1 - seg(t, c.t1 - .3, c.t1);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = 'italic 29px "IM Fell English", serif'; const w = ctx.measureText(c.text).width + 70, h = 54, x = (W - w) / 2, y = H - h - 10;
  ctx.save(); ctx.globalAlpha = Math.min(p, q);
  const r = mulberry(5); ctx.shadowColor = 'rgba(30,18,6,.45)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4; ctx.fillStyle = '#efe3c2';
  ctx.beginPath(); ctx.moveTo(x, y); for (let i = 0; i <= 60; i++) ctx.lineTo(x + w * i / 60, y + (r() - .5) * 2.2); for (let i = 0; i <= 8; i++) ctx.lineTo(x + w + (r() - .5) * 2.2, y + h * i / 8); for (let i = 60; i >= 0; i--) ctx.lineTo(x + w * i / 60, y + h + (r() - .5) * 2.2); for (let i = 8; i >= 0; i--) ctx.lineTo(x + (r() - .5) * 2.2, y + h * i / 8); ctx.closePath(); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(43,29,18,.35)'; ctx.lineWidth = .8; ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
  ctx.restore();
  inkText(ctx, c.text, W / 2, y + 36, { size: 29, italic: true, p: seg(t, c.t0, c.t0 + .6), al: 'c', a: Math.min(p, q) * .95, bleed: false });
}

export function render(ctx, t, W = 1920, H = 1080) {
  if (!ready) return;
  if (t < PT0) drawPlate(ctx, t, W, H);
  else {
    if (!CA) { CA = makeCanvas(W, H); CB = makeCanvas(W, H); }
    const a = CA.getContext('2d'), b = CB.getContext('2d');
    drawPlate(a, Math.min(t, PT0), W, H); drawBlank(b, t, W, H);
    const p = eio(seg(t, PT0, PT1)), r = 80;
    curl(ctx, CA, CB, (W + Math.PI * r + 260) * (1 - p) - 260, r, W, H);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(W * .5, H * .46, H * .25, W * .5, H * .5, H * .95);
  g.addColorStop(0, 'rgba(255,244,214,0)'); g.addColorStop(1, 'rgba(60,38,16,.26)');
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  subtitle(ctx, t, W, H);
}

// text boxes for readcheck, in screen pixels
export function texts(t, W = 1920, H = 1080) {
  if (!ready || t >= PT0) return [];
  const [cx, cy, z] = CAM(t), out = [], sx = x => (x - cx) * z + W / 2, sy = y => (y - cy) * z + H / 2;
  for (const it of ITEMS) {
    if (t < it.t0) continue;
    const s = it.size, al = it.al || 'l', x0 = al === 'c' ? it.x - it.w / 2 : it.x, y1 = it.kind === 'bar' ? it.y + 14 : it.y + s * .25, y0 = it.kind === 'bar' ? it.y - 6 : it.y - s * .8;
    out.push({ id: it.id, text: it.txt, x0: sx(x0), y0: sy(y0), x1: sx(x0 + it.w), y1: sy(y1) });
  }
  return out;
}

// sound and cue events for the mixer
export function events() {
  const ev = [];
  for (const id of Object.keys(TL)) {
    const d = TL[id];
    ev.push({ t: d.pencil[0], type: 'pencil', dur: d.pencil[1] - d.pencil[0], id }, { t: d.ink[0], type: 'pen', dur: d.ink[1] - d.ink[0], id }, { t: d.wash[0], type: 'brush', dur: d.wash[1] - d.wash[0], id });
    if (d.pin) ev.push({ t: d.pin, type: 'pin', id });
  }
  ev.push({ t: T_CUT[0], type: 'cut', dur: 1.2 }, { t: T_RING[0], type: 'ring', dur: .8 }, { t: T_LEAD[0], type: 'pen', dur: .8, id: 'lead' }, { t: PT0, type: 'page', dur: PT1 - PT0 });
  for (const it of ITEMS) ev.push({ t: it.t0, type: 'text', id: it.id });
  for (const id of Object.keys(VOICE)) ev.push({ t: VOICE[id][0], type: 'voice', id, dur: VOICE[id][1] });
  return ev.sort((a, b) => a.t - b.t);
}
