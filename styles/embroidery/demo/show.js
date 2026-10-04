// show.js — the full demo film: "Every Mend Begins with a Hole" (50 s).
// One continuous top-down camera over a knit sleeve: the last knot, the hole, the darn, a hoop and a flower,
// the back of the work, the hoop lifts away, the thread is cut.
import { clamp, mulberry, TAU, lerp, seg, ss, eo, ei, eio, track } from '/core/lib.js';
import { thread, loose, knot, needle, ENV, FLOSS as F, css, shade, lift, LIGHT } from './engine/thread.js';
import { hoopRing } from './engine/fabric.js';
import { Scene, stemStitch, satinLeaf, fanPetal, satinDisc, satinText, knotItem, seq } from './engine/scene.js';
import { knitGround, frayInto, darn, inHole } from './engine/knit.js';

export const W = 1920, H = 1080, DUR = 50, PAD = 100;
const P = (x, y) => ({ x, y });
const HC = P(930, 500), HOLE = { cx: HC.x, cy: HC.y, rx: 235, ry: 165 }, RING_R = 302, BAND = 34;
const KNIT = [62, 110, 124];
const KNOT_AT = P(1240, 300);
const FELT = [26, 34, 38];

// ---------------- timeline
export const T = {
  knot: [0.5, 1.3], glide: [2.8, 5.4], hole: [5.6, 9.2], warp: [9.7, 12.5], weft: [12.5, 23.3], silence: [23.5, 25.7],
  hoopIn: [25.4, 25.95], flower: [26.2, 37.6], flip: [38.0, 40.3], lift: [40.6, 43.4], thread: [43.2, 44.2], snip: 47.9,
};
export const LABELS = [
  { id: 'l1', text: 'Every mend begins with a hole.', t0: 5.4, t1: 9.9, voice: 5.7 },
  { id: 'l2', text: 'Over, and under.', t0: 13.2, t1: 16.8, voice: 13.5 },
  { id: 'l3', text: 'Under every clean stitch, there is a knot.', t0: 38.1, t1: 43.9, voice: 38.5 },
  { id: 'l4', text: 'Mend it. Wear it.', t0: 44.2, t1: 47.7, voice: 44.5 },
];

// ---------------- camera
const camKeys = [
  [0, [KNOT_AT.x, KNOT_AT.y, 2.0]], [2.8, [KNOT_AT.x, KNOT_AT.y, 2.0]], [5.5, [940, 520, 1.0]], [9.5, [940, 515, 1.07]],
  [12.5, [930, 500, 1.3]], [16.5, [800, 500, 1.4]], [17.2, [800, 505, 1.9]], [20.0, [1060, 495, 1.9]], [21.5, [1000, 500, 1.55]], [23.5, [930, 500, 1.4]],
  [25.7, [930, 500, 1.4]], [33.0, [930, 485, 1.42]], [35.0, [945, 430, 1.62]], [37.6, [940, 440, 1.6]], [38.0, [930, 500, 1.4]], [40.3, [930, 500, 1.4]],
  [43.5, [945, 480, 1.2]], [50, [945, 480, 1.2]],
];
const camFn = track(camKeys);
export const camAt = t => { const [cx, cy, z] = camFn(clamp(t, 0, 50)); return { cx, cy, z }; };
const setCam = (ctx, cam, sx = 1) => {
  ENV.z = cam.z * Math.abs(sx);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(W / 2, 0); ctx.scale(Math.abs(sx) < 0.002 ? 0.002 * Math.sign(sx || 1) : sx, 1); ctx.translate(-W / 2, 0);
  ctx.transform(cam.z, 0, 0, cam.z, W / 2 - cam.cx * cam.z, H / 2 - cam.cy * cam.z);
  ENV.z = cam.z;
};

// ---------------- scenes
function buildSprig(C, S, tm) {
  const sc = new Scene(), K = 1.2 * S, at_ = (x, y) => P(C.x + x * K, C.y + y * K), pts = a => a.map(p => at_(p[0], p[1]));
  const leaf = o => satinLeaf({ ...o, len: o.len * K, wid: o.wid * K, w: 7.4 * S });
  const disc = o => satinDisc({ ...o, r: o.r * K, w: 6.4 * S });
  const petal = o => fanPetal({ ...o, r0: o.r0 * K, r1: o.r1 * K, w: 7.4 * S });
  const stem = stemStitch(pts([[-222, 318], [-176, 196], [-98, 72], [-34, -62], [28, -168]]), { w: 7.4 * S, col: F.moss, seed: 11, step: 7 * S });
  const branch = stemStitch(pts([[-112, 96], [-30, 150], [62, 176], [146, 150]]), { w: 6.4 * S, col: F.moss, seed: 12, step: 6.5 * S });
  const spray = stemStitch(pts([[-34, -62], [58, -104], [128, -150], [176, -214]]), { w: 6 * S, col: F.moss, seed: 13, step: 6.5 * S });
  const leaves = [
    leaf({ base: at_(-176, 198), ang: -2.62, len: 150, wid: 64, col: F.moss, seed: 21, curve: 0.1 }),
    leaf({ base: at_(-132, 140), ang: -0.5, len: 168, wid: 68, col: shade(F.moss, 0.82), seed: 22, curve: -0.1 }),
    leaf({ base: at_(-84, 40), ang: -2.5, len: 150, wid: 62, col: F.moss, seed: 23, curve: 0.12 }),
    leaf({ base: at_(-46, -34), ang: -0.78, len: 138, wid: 56, col: shade(F.moss, 0.82), seed: 24, curve: -0.1 }),
    leaf({ base: at_(2, -118), ang: -2.25, len: 104, wid: 42, col: F.moss, seed: 25 }),
  ];
  const berries = [
    disc({ c: at_(152, 128), r: 27, ang: 0.6, col: F.indigo, seed: 31 }),
    disc({ c: at_(193, 164), r: 24, ang: 0.3, col: F.indigo, seed: 32 }),
    disc({ c: at_(116, 170), r: 22, ang: 0.9, col: F.indigo, seed: 33 }),
  ];
  const bud = [0, 1, 2, 3, 4, 5].map(i => { const a = i * 1.05 + 0.3, d = i ? 17 : 0; return knotItem(at_(176 + Math.cos(a) * d, -226 + Math.sin(a) * d), 11 * K, F.mustard, { seed: 40 + i, gloss: 0.4 }); });
  const FC = at_(32, -214), nP = 7;
  const petalsW = [];
  for (let i = 0; i < nP; i++) {
    const ang = -Math.PI / 2 + (i - 3) * (TAU / nP) + 0.05;
    petalsW.push(fanPetal({ c: FC, ang, span: TAU / nP * 0.94, r0: 20 * K, r1: (104 + (i % 2) * 6) * K, w: 7.4 * S, col: i % 3 === 1 ? shade(F.madder, 1.08) : F.madder, seed: 50 + i }));
  }
  const heart = [knotItem(FC, 9 * K, F.mustard, { seed: 60 })];
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + 0.4; heart.push(knotItem(P(FC.x + Math.cos(a) * 19 * K, FC.y + Math.sin(a) * 19 * K), 8.5 * K, i % 3 === 2 ? F.ecru : F.mustard, { seed: 61 + i, gloss: 0.45 })); }
  sc.add(seq(stem, tm(0), tm(5)), seq(branch, tm(5), tm(7)), seq(leaves[0], tm(7), tm(8.6)), seq(leaves[1], tm(8.6), tm(10.4)), seq(leaves[2], tm(10.4), tm(12)), seq(leaves[3], tm(12), tm(13.4)), seq(leaves[4], tm(13.4), tm(14.2)), seq(spray, tm(14.2), tm(16)));
  berries.forEach((b, i) => sc.add(seq(b, tm(16 + i * 1.6), tm(17.4 + i * 1.6))));
  sc.add(seq(bud, tm(21), tm(23.4)));
  petalsW.forEach((p, i) => sc.add(seq(p, tm(24 + i * 1.7), tm(25.5 + i * 1.7))));
  sc.add(seq(heart, tm(37), tm(40)));
  sc.FC = FC;
  return sc;
}
const flower = buildSprig(HC, 0.6, x => T.flower[0] + x * (T.flower[1] - T.flower[0]) / 40);
const FC = flower.FC;

function buildDarnScene() {
  const d = darn({ cx: HOLE.cx, cy: HOLE.cy, rx: HOLE.rx, ry: HOLE.ry, warpCol: F.ecru, weftCol: F.mustard, w: 13, gap: 25 });
  const sc = new Scene();
  sc.add(seq(d.warp, T.warp[0], T.warp[1]));
  const n = d.rows.length, wts = d.rows.map((r, i) => 1 - 0.38 * Math.sin(Math.PI * i / Math.max(1, n - 1)) + (i >= n - 2 ? 0.5 : 0)), sum = wts.reduce((a, b) => a + b, 0);
  let t = T.weft[0];
  d.rows.forEach((row, i) => { const dt = (T.weft[1] - T.weft[0]) * wts[i] / sum; sc.add(seq(row, t, t + dt - 0.02)); t += dt; });
  return sc;
}
const darnSc = buildDarnScene();

// the knot that opens the film: a French knot pulled tight, then left on the sleeve
const lastKnot = knotItem(KNOT_AT, 24, F.mustard, { seed: 7, gloss: 0.5 });
lastKnot.t0 = T.knot[0]; lastKnot.t1 = T.knot[1];

// ---------------- cached layers (2x so the macro shots stay sharp)
let LAYERS = null;
function layers() {
  if (LAYERS) return LAYERS;
  const mk = hole => {
    const c = document.createElement('canvas'); c.width = (W + 2 * PAD) * 2; c.height = (H + 2 * PAD) * 2;
    const g = c.getContext('2d'); g.scale(2, 2); g.translate(PAD, PAD); ENV.z = 2;
    knitGround(g, { x0: -PAD - 40, y0: -PAD - 40, x1: W + PAD + 40, y1: H + PAD + 40, col: KNIT, hole, cw: 82, ch: 53 });
    if (hole) frayInto(g, hole, KNIT, 8, 4, 17);
    ENV.z = 1; return c;
  };
  LAYERS = { whole: mk(null), holed: mk(HOLE) };
  return LAYERS;
}
const drawLayer = (ctx, c) => ctx.drawImage(c, -PAD, -PAD, W + 2 * PAD, H + 2 * PAD);

// ragged reveal shape of the hole at scale s
function holePath(ctx, s) {
  ctx.beginPath();
  for (let i = 0; i <= 90; i++) {
    const a = i / 90 * TAU, nz = Math.sqrt(Math.max(0.2, 1 + (Math.sin(a * 5.3 + 1) * 0.5 + Math.sin(a * 2.2 + 9) * 0.5) * 0.17)) * (1.12 * s);
    const x = HOLE.cx + Math.cos(a) * (HOLE.rx + 40) * nz, y = HOLE.cy + Math.sin(a) * (HOLE.ry + 40) * nz;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

// ---------------- labels (woven tape, satin lettering), cached per text
const labelCache = {};
function labelCanvas(text) {
  if (labelCache[text]) return labelCache[text];
  const c = document.createElement('canvas'); c.width = 1100; c.height = 150; const g = c.getContext('2d');
  ENV.z = 1; g.translate(30, 36);
  const wdt = 1040, h = 78, y0 = 0;
  g.save(); g.shadowColor = 'rgba(8,10,10,0.55)'; g.shadowBlur = 16; g.shadowOffsetY = 8; g.fillStyle = '#e8dcc0'; g.fillRect(0, y0, wdt, h); g.restore();
  g.save(); g.beginPath(); g.rect(0, y0, wdt, h); g.clip();
  for (let i = -h; i < wdt; i += 3.2) { g.strokeStyle = (i / 3.2 | 0) % 2 ? 'rgba(120,100,70,0.13)' : 'rgba(255,250,235,0.20)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(i, y0 + h); g.lineTo(i + h, y0); g.stroke(); }
  const gr = g.createLinearGradient(0, y0, 0, y0 + h); gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,40,10,0.22)'); g.fillStyle = gr; g.fillRect(0, y0, wdt, h);
  g.restore();
  for (const yy of [y0 + 6, y0 + h - 6]) for (let x = 6; x < wdt - 10; x += 16) thread(g, P(x, yy), P(x + 9, yy), 3.4, F.madder, { gloss: 0.5, seed: x | 0 });
  const items = satinText({ text, x: wdt / 2, y: y0 + h / 2, size: 40, font: 'Fredoka', weight: 600, col: F.char, w: 3.3, ang: 1.25, seed: 5 });
  items.forEach(s => thread(g, s.a, s.b, s.w, s.col, s.o));
  return labelCache[text] = c;
}
function drawLabels(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ENV.z = 1;
  for (const L of LABELS) {
    if (t < L.t0 || t > L.t1 + 0.1) continue;
    const a = seg(t, L.t0, L.t0 + 0.35), b = seg(t, L.t1 - 0.3, L.t1), off = (1 - eo(a)) * 130 + ei(b) * 130;
    ctx.drawImage(labelCanvas(L.text), (W - 1100) / 2, 1006 - 36 - 39 + off);
  }
}
export const TEXTS = t => {
  const out = [];
  for (const L of LABELS) {
    if (t < L.t0 || t > L.t1) continue;
    const a = seg(t, L.t0, L.t0 + 0.35), b = seg(t, L.t1 - 0.3, L.t1), off = (1 - eo(a)) * 130 + ei(b) * 130;
    out.push({ id: L.id, text: L.text, x0: 440, y0: 967 + off, x1: 1480, y1: 1045 + off });
  }
  return out;
};

// ---------------- the back of the work: short stitches, long carried threads, knots
function drawBack(ctx, t) {
  const r = mulberry(99), items = flower.items.filter(s => s.k === 't' && t >= s.t1);
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(8,5,2,0.45)'; ctx.shadowBlur = 3 * ENV.z; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 2;
  let prev = null, n = 0;
  for (const s of items) {
    // short stitch: thin, with a loose bow; long carried threads wander between stitches
    ctx.strokeStyle = css(shade(s.col, 0.72), 0.95); ctx.lineWidth = 2.2 + r() * 0.8;
    const bw = (r() - 0.5) * 0.5, mx = (s.a.x + s.b.x) / 2 - (s.b.y - s.a.y) * bw, my = (s.a.y + s.b.y) / 2 + (s.b.x - s.a.x) * bw;
    ctx.beginPath(); ctx.moveTo(s.a.x, s.a.y); ctx.quadraticCurveTo(mx, my, s.b.x, s.b.y); ctx.stroke();
    if (prev) {
      const d = Math.hypot(prev.b.x - s.a.x, prev.b.y - s.a.y);
      if (d > 4 && d < 320) {
        const k = (r() - 0.5) * 1.1, cx = (prev.b.x + s.a.x) / 2 - (s.a.y - prev.b.y) * k, cy = (prev.b.y + s.a.y) / 2 + (s.a.x - prev.b.x) * k;
        ctx.strokeStyle = css(shade(s.col, 0.66), 0.9); ctx.lineWidth = 1.6 + r() * 1.2;
        ctx.beginPath(); ctx.moveTo(prev.b.x, prev.b.y); ctx.quadraticCurveTo(cx, cy, s.a.x, s.a.y); ctx.stroke();
      }
    }
    prev = s; n++;
    if (n % 9 === 0) { ctx.shadowColor = 'transparent'; knot(ctx, P(s.a.x + (r() - 0.5) * 10, s.a.y + (r() - 0.5) * 10), 8 + r() * 3, shade(s.col, 0.8), { seed: n, gloss: 0.1 }); ctx.shadowColor = 'rgba(8,5,2,0.45)'; }
  }
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
}

// ---------------- scissors and the cut thread
function cubic(p0, p1, p2, p3, t) { const s = 1 - t; return P(s * s * s * p0.x + 3 * s * s * t * p1.x + 3 * s * t * t * p2.x + t * t * t * p3.x, s * s * s * p0.y + 3 * s * s * t * p1.y + 3 * s * t * t * p2.y + t * t * t * p3.y); }
function split(p0, p1, p2, p3, u) {
  const m = (a, b) => P(lerp(a.x, b.x, u), lerp(a.y, b.y, u)), a = m(p0, p1), b = m(p1, p2), c = m(p2, p3), d = m(a, b), e = m(b, c), f = m(d, e);
  return [[p0, a, d, f], [f, e, c, p3]];
}
const TH = [FC, P(FC.x + 130, FC.y + 70), P(FC.x + 230, FC.y + 210), P(FC.x + 330, FC.y + 360)];
const [THA, THB] = split(...TH, 0.5), CUT = THA[3];
function scissors(ctx, pos, open, ang) {
  ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(ang); ctx.scale(1.4, 1.4);
  const z = ENV.z * 1.4;
  ctx.shadowColor = 'rgba(8,10,10,0.5)'; ctx.shadowBlur = 14 * z; ctx.shadowOffsetX = 12 * z; ctx.shadowOffsetY = 16 * z;
  for (const s of [-1, 1]) {
    ctx.save(); ctx.rotate(s * open);
    const g = ctx.createLinearGradient(0, -14, 0, 14); g.addColorStop(0, '#f3f5f7'); g.addColorStop(0.5, '#aeb4bc'); g.addColorStop(1, '#5f656e');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 9); ctx.lineTo(160, s * 2 + 1); ctx.lineTo(160, s * 2 - 1.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(150, s * 2 - 1); ctx.stroke();
    // shank and handle ring
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#8f959d'; ctx.fillRect(-70, -7, 72, 14);
    const hg = ctx.createRadialGradient(-112, s * 12, 4, -112, s * 12, 36); hg.addColorStop(0, '#d65a49'); hg.addColorStop(0.7, '#a02f24'); hg.addColorStop(1, '#5d1810');
    ctx.strokeStyle = hg; ctx.lineWidth = 15; ctx.beginPath(); ctx.ellipse(-112, s * 24, 30, 24, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,200,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-114, s * 22, 28, 22, 0, 3.6, 5.0); ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = '#6f757d'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); ctx.fillStyle = '#d9dde2'; ctx.beginPath(); ctx.arc(-1, -1, 3, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawEnding(ctx, t) {
  if (t < T.thread[0]) return;
  const ap = ss(seg(t, T.thread[0], T.thread[1])), cutT = T.snip;
  ctx.globalAlpha = ap;
  const col = F.mustard, wd = 5.2;
  if (t < cutT) loose(ctx, ...TH, wd, col, { n: 60, lift: 0.5 });
  else {
    loose(ctx, ...THA, wd, col, { n: 30, lift: 0.4 });
    for (let i = -1; i <= 1; i++) thread(ctx, CUT, P(CUT.x + i * 6 - 5, CUT.y + 14 + i * i * 2), wd * 0.42, col, { gloss: 0.5, sink: false, ply: false });
    const c = ss(seg(t, cutT, cutT + 1.6)), cur = [CUT, P(CUT.x + 70, CUT.y - 50), P(CUT.x + 150, CUT.y + 30), P(CUT.x + 90, CUT.y + 100)];
    const mix = (a, b) => a.map((p, i) => P(lerp(p.x, b[i].x, c), lerp(p.y, b[i].y, c)));
    const end = [THB[0], THB[1], THB[2], THB[3]];
    const sh = mix(end, [P(CUT.x + 40, CUT.y + 70), P(CUT.x + 110, CUT.y + 40), P(CUT.x + 180, CUT.y + 110), P(CUT.x + 120, CUT.y + 170)]);
    sh[0] = P(lerp(CUT.x, CUT.x + 40, c), lerp(CUT.y, CUT.y + 70, c));
    loose(ctx, ...sh, wd, col, { n: 40, lift: 0.5 - 0.35 * c });
  }
  ctx.globalAlpha = 1;
  // scissors
  if (t > 46.2 && t < 49.6) {
    const inn = eio(seg(t, 46.2, 47.6)), out = eio(seg(t, 48.3, 49.5));
    const o2 = t < 47.7 ? lerp(0.05, 0.42, ss(seg(t, 47.2, 47.65))) : lerp(0.42, 0.0, ss(seg(t, 47.7, cutT)));
    const pos = P(CUT.x + (1 - inn) * 520 + out * 520 - 6, CUT.y + (1 - inn) * 150 + out * 150 + 4);
    // blades point toward the upper-left (back along the thread), body trails to the lower right
    scissors(ctx, pos, t < cutT ? o2 : 0, Math.PI + 0.55);
  }
}

// ---------------- events for the mixer
function buildEvents() {
  const ev = [];
  const add = (sc, kind) => sc.items.forEach(s => {
    if (s.k === 'k') ev.push({ t: +s.t1.toFixed(3), type: 'knot', r: s.r });
    else { const L = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y); ev.push({ t: +s.t0.toFixed(3), type: 'pierce', kind, w: s.w }); ev.push({ t: +s.t0.toFixed(3), type: 'zip', kind, len: +L.toFixed(1), dur: +Math.max(0.05, s.t1 - s.t0).toFixed(3) }); }
  });
  add(darnSc, 'knit'); add(flower, 'cloth');
  ev.push({ t: T.knot[0], type: 'knot', r: 15, big: 1 }, { t: T.hoopIn[0] + 0.3, type: 'knock' }, { t: 38.0, type: 'flip' }, { t: 39.6, type: 'flip' },
    { t: 40.6, type: 'lift' }, { t: T.snip, type: 'snip' }, { t: 47.3, type: 'shear' }, { t: T.hole[0], type: 'unravel', dur: T.hole[1] - T.hole[0] }, { t: T.glide[0], type: 'cloth' });
  LABELS.forEach(L => ev.push({ t: L.t0, type: 'label' }, { t: L.t1 - 0.3, type: 'labelout' }, { t: L.voice, type: 'voice', id: L.id }));
  return ev;
}
export const EV = buildEvents();

// ---------------- the frame
export function render(ctx, t) {
  const L = layers();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ENV.z = 1;
  ctx.fillStyle = css(FELT); ctx.fillRect(0, 0, W, H);
  const cam = camAt(t);
  // flip: 0 -> 2π over two beats; |cos| is the horizontal squash, negative = back of the work
  let th = 0;
  if (t >= T.flip[0]) th = t < 38.7 ? Math.PI * ss(seg(t, 38.0, 38.7)) : t < 39.6 ? Math.PI : t < 40.3 ? Math.PI + Math.PI * ss(seg(t, 39.6, 40.3)) : TAU;
  const sx = Math.cos(th), back = sx < 0;
  setCam(ctx, cam, sx);
  const showHole = t >= T.hole[0];
  const reveal = ss(seg(t, T.hole[0], T.hole[1]));
  drawLayer(ctx, L.whole);
  if (showHole) {
    if (reveal < 1) { ctx.save(); holePath(ctx, reveal); ctx.clip(); drawLayer(ctx, L.holed); ctx.restore(); }
    else drawLayer(ctx, L.holed);
    // the pulled yarn leaving the hole while it opens
    if (reveal > 0 && reveal < 1) {
      const e0 = P(HOLE.cx + HOLE.rx * 0.9, HOLE.cy - 30), e1 = P(e0.x + reveal * 330, e0.y + reveal * 120);
      loose(ctx, e0, P(e0.x + 90, e0.y - 40), P(e1.x - 120, e1.y - 30), e1, 17, KNIT, { n: 22, lift: 0.4, gloss: 0.1 });
    }
  }
  if (back) {
    darnSc.draw(ctx, t);
    ctx.fillStyle = 'rgba(12,18,20,0.5)'; ctx.fillRect(-PAD, -PAD, W + 2 * PAD, H + 2 * PAD);
    drawBack(ctx, t);
  } else {
    // the knot that opens the film
    {
      const k = lastKnot, sc = clamp(1 - Math.exp(-(t - k.t0) * 9) * Math.cos((t - k.t0) * 22), 0, 1.2);
      if (t >= k.t0) {
        if (t < 3.3) { // thread pulled up through the knot
          const u = ss(seg(t, 0.4, 1.4));
          loose(ctx, KNOT_AT, P(KNOT_AT.x + 30, KNOT_AT.y - 40 - 80 * (1 - u)), P(KNOT_AT.x + 120, KNOT_AT.y - 60), P(KNOT_AT.x + 220 + 60 * (1 - u), KNOT_AT.y + 40 - 90 * (1 - u)), 6, F.mustard, { n: 26, lift: 0.7 });
        }
        knot(ctx, KNOT_AT, k.r, k.col, { ...k.o, scale: sc });
      }
    }
    darnSc.draw(ctx, t);
    flower.draw(ctx, t);
  }
  // hoop
  const hin = seg(t, T.hoopIn[0], T.hoopIn[1]), hout = seg(t, T.lift[0], T.lift[1]);
  if (t >= T.hoopIn[0] && hout < 1) {
    const sc = (1 + 0.15 * (1 - eo(hin))) * (1 + 0.28 * ei(hout)), al = ss(hin * 2) * (1 - ss(hout));
    ctx.save(); ctx.globalAlpha = al; ctx.translate(HC.x, HC.y); ctx.scale(sc, sc); ctx.translate(-HC.x, -HC.y);
    hoopRing(ctx, HC.x, HC.y, RING_R, BAND); ctx.restore();
  }
  // needles
  if (!back) {
    const dActive = t > T.warp[0] - 0.3 && t < T.weft[1] + 0.5, fActive = t > T.flower[0] - 0.3 && t < T.flower[1] + 0.6;
    if (dActive) darnSc.drawNeedle(ctx, t, P(1540, 960));
    else if (fActive) { flower.drawNeedle(ctx, t, P(HC.x + 300, HC.y + 220)); }
  }
  if (!back) drawEnding(ctx, t);
  else drawEnding(ctx, t);
  // vignette and labels in screen space
  ctx.setTransform(1, 0, 0, 1, 0, 0); ENV.z = 1;
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.98); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(5,9,12,0.5)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  if (t < 0.35) { ctx.fillStyle = `rgba(0,0,0,${1 - seg(t, 0, 0.35)})`; ctx.fillRect(0, 0, W, H); }
  if (t > DUR - 0.5) { ctx.fillStyle = `rgba(0,0,0,${seg(t, DUR - 0.5, DUR)})`; ctx.fillRect(0, 0, W, H); }
  drawLabels(ctx, t);
}
export const warm = () => { layers(); LABELS.forEach(L => labelCanvas(L.text)); };
