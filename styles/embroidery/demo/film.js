// film.js — shot builders for the style frames (the film proper is not built yet).
// World = screen at zoom 1; the camera is {cx, cy, z}.
import { clamp, mulberry, TAU, lerp } from '/core/lib.js';
import { thread, loose, needle, ENV, FLOSS as F, css, shade, lift, LIGHT } from './engine/thread.js';
import { linen, felt, hoopRing } from './engine/fabric.js';
import { Scene, stemStitch, satinLeaf, fanPetal, satinDisc, satinText, knotItem, seq, at } from './engine/scene.js';
import { knitGround, frayInto, darn } from './engine/knit.js';

const W = 1920, H = 1080, P = (x, y) => ({ x, y });
const setCam = (ctx, cam) => { ENV.z = cam.z; ctx.setTransform(cam.z, 0, 0, cam.z, W / 2 - cam.cx * cam.z, H / 2 - cam.cy * cam.z); };

// ---------- sprig on linen in a hoop
const C = P(960, 492), R = 420;
const K = 1.2, at_ = (x, y) => P(C.x + x * K, C.y + y * K);
const leaf = o => satinLeaf({ ...o, len: o.len * K, wid: o.wid * K, w: 7.4 });
const disc = o => satinDisc({ ...o, r: o.r * K, w: 6.4 });
const petal = o => fanPetal({ ...o, r0: o.r0 * K, r1: o.r1 * K, w: 7.4 });
export function buildSprig() {
  const sc = new Scene(), pts = a => a.map(p => at_(p[0], p[1]));
  const stem = stemStitch(pts([[-222, 318], [-176, 196], [-98, 72], [-34, -62], [28, -168]]), { w: 7.4, col: F.moss, seed: 11, step: 7 });
  const branch = stemStitch(pts([[-112, 96], [-30, 150], [62, 176], [146, 150]]), { w: 6.4, col: F.moss, seed: 12, step: 6.5 });
  const sprayStem = stemStitch(pts([[-34, -62], [58, -104], [128, -150], [176, -214]]), { w: 6, col: F.moss, seed: 13, step: 6.5 });
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
  const buds = [176, -214];
  const bud = [0, 1, 2, 3, 4, 5].map(i => { const a = i * 1.05 + 0.3, d = i ? 17 : 0; return knotItem(at_(176 + Math.cos(a) * d, -226 + Math.sin(a) * d), 11 * K, F.mustard, { seed: 40 + i, gloss: 0.4 }); });
  const FC = at_(32, -214), nP = 7, petals = [];
  for (let i = 0; i < nP; i++) {
    const ang = -Math.PI / 2 + (i - 3) * (TAU / nP) + 0.05;
    petals.push(petal({ c: FC, ang, span: TAU / nP * 0.94, r0: 20, r1: 104 + (i % 2) * 6, col: i % 3 === 1 ? shade(F.madder, 1.08) : F.madder, seed: 50 + i }));
  }
  petals.sort((a, b) => 0); // keep order: i = 0..6, starting at the upper left, going round
  const heart = [];
  heart.push(knotItem(FC, 9 * K, F.mustard, { seed: 60 }));
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + 0.4; heart.push(knotItem(P(FC.x + Math.cos(a) * 19 * K, FC.y + Math.sin(a) * 19 * K), 8.5 * K, i % 3 === 2 ? F.ecru : F.mustard, { seed: 61 + i, gloss: 0.45 })); }
  sc.add(seq(stem, 0, 5), seq(branch, 5, 7), seq(leaves[0], 7, 8.6), seq(leaves[1], 8.6, 10.4), seq(leaves[2], 10.4, 12), seq(leaves[3], 12, 13.4), seq(leaves[4], 13.4, 14.2),
    seq(sprayStem, 14.2, 16));
  berries.forEach((b, i) => sc.add(seq(b, 16 + i * 1.6, 17.4 + i * 1.6)));
  sc.add(seq(bud, 21, 23.4));
  petals.forEach((p, i) => sc.add(seq(p, 24 + i * 1.7, 25.5 + i * 1.7)));
  sc.add(seq(heart, 37, 40));
  return sc;
}
const TAIL = P(C.x + 300, C.y + 60);

function skein(ctx, x, y, ang, col, n = 16) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  const r = mulberry(col[0] * 3 + col[2]);
  for (let i = 0; i < n; i++) {
    const o = (i - n / 2) * 4.3 + (r() - 0.5) * 2, bow = (r() - 0.5) * 8;
    loose(ctx, P(-130, o * 0.6), P(-40, o + bow), P(40, o - bow), P(130, o * 0.6), 4.6, col, { n: 12, lift: 0.1, gloss: 0.62 });
  }
  // paper band
  const bw = 54, bh = 72;
  ctx.shadowColor = 'rgba(10,10,10,0.5)'; ctx.shadowBlur = 8 * ENV.z; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 6;
  const g = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0); g.addColorStop(0, '#e9dfc6'); g.addColorStop(0.5, '#f4ecd6'); g.addColorStop(1, '#d4c7a8');
  ctx.fillStyle = g; ctx.fillRect(-bw / 2, -bh / 2, bw, bh); ctx.shadowColor = 'transparent';
  ctx.fillStyle = css(col); ctx.fillRect(-bw / 2, -bh / 2, bw, 13); ctx.fillRect(-bw / 2, bh / 2 - 13, bw, 13);
  ctx.fillStyle = 'rgba(40,30,25,0.55)'; for (let i = 0; i < 4; i++) ctx.fillRect(-bw / 2 + 8, -12 + i * 8, bw - 16 - (i % 2) * 12, 2.4);
  ctx.restore();
}

// woven tape with a satin-stitched line of text, in screen space
function tape(ctx, text, y, t = 1) {
  ENV.z = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
  const wdt = 1040, h = 78, x0 = (W - wdt) / 2, y0 = y - h / 2;
  ctx.save(); ctx.shadowColor = 'rgba(8,10,10,0.55)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x0, y0, wdt, h); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, wdt, h); ctx.clip();
  for (let i = -h; i < wdt; i += 3.2) { ctx.strokeStyle = (i / 3.2 | 0) % 2 ? 'rgba(120,100,70,0.13)' : 'rgba(255,250,235,0.20)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0 + i, y0 + h); ctx.lineTo(x0 + i + h, y0); ctx.stroke(); }
  const g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,40,10,0.22)'); ctx.fillStyle = g; ctx.fillRect(x0, y0, wdt, h);
  ctx.restore();
  for (const [yy, c] of [[y0 + 6, F.madder], [y0 + h - 6, F.madder]]) for (let x = x0 + 6; x < x0 + wdt - 10; x += 16) thread(ctx, P(x, yy), P(x + 9, yy), 3.4, c, { gloss: 0.5, seed: x | 0 });
  const items = satinText({ text, x: W / 2, y, size: 40, font: 'Fredoka', weight: 600, col: F.char, w: 3.3, ang: 1.25, seed: 5 });
  items.forEach(s => thread(ctx, s.a, s.b, s.w, s.col, s.o));
}

export function drawSprig(ctx, t, { cam = { cx: 960, cy: 540, z: 1 }, needleOn = true, withTape = null } = {}, sc = buildSprig()) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ENV.z = 1;
  felt(ctx, W, H);
  setCam(ctx, cam);
  // clutter on the table: skeins, loose clippings
  skein(ctx, 1600, 800, -0.5, F.mustard); skein(ctx, 1490, 905, 0.28, F.indigo); skein(ctx, 300, 880, 0.55, F.rose); skein(ctx, 370, 190, -0.35, F.teal);
  linen(ctx, cam, { cx: C.x, cy: C.y, R });
  ctx.save(); ctx.beginPath(); ctx.arc(C.x, C.y, R, 0, TAU); ctx.clip();
  sc.draw(ctx, t); ctx.restore();
  hoopRing(ctx, C.x, C.y, R, 46);
  if (needleOn) sc.drawNeedle(ctx, t, TAIL);
  if (withTape) tape(ctx, withTape, 1006);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.0); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(6,10,12,0.5)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

// ---------- darning a worn knit
export function buildDarn() {
  const hole = { cx: 930, cy: 500, rx: 235, ry: 165 };
  const d = darn({ cx: hole.cx, cy: hole.cy, rx: hole.rx, ry: hole.ry, warpCol: F.ecru, weftCol: F.mustard, w: 13, gap: 25 });
  const sc = new Scene();
  sc.add(seq(d.warp, 0, 7, 1.0));
  d.rows.forEach((row, i) => sc.add(seq(row, 7 + i * 0.95, 7 + (i + 1) * 0.95 - 0.03)));
  sc.hole = hole; sc.rows = d.rows.length;
  return sc;
}
const KNIT = [62, 110, 124];
let knitCache = null;
export function drawDarn(ctx, t, cam = { cx: 960, cy: 540, z: 1 }, sc = buildDarn()) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ENV.z = 1;
  setCam(ctx, cam);
  if (!knitCache) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    knitGround(g, { x0: -30, y0: -30, x1: W + 30, y1: H + 30, col: KNIT, hole: sc.hole, cw: 82, ch: 53 });
    frayInto(g, sc.hole, KNIT, 8, 4, 17);
    knitCache = c;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(knitCache, 0, 0); setCam(ctx, cam);
  sc.draw(ctx, t);
  sc.drawNeedle(ctx, t, P(1540, 960));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.95); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(6,10,14,0.55)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
