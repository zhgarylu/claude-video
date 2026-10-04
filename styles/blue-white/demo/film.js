// film.js: "The Blue Only Arrives in the Fire". One timeline, one render(t).
//   0–5.5 bare vase · 5.5–21 painted on the wheel · 21–31 through the rim into the painted landscape and back
//   31–35 the kiln: grey to blue · 35–38.6 macro · 38.6–43.4 shards · 43.4–54 aged, on a shelf
import { clamp, lerp, seg, ss, mulberry, TAU } from '/core/lib.js';
import { buildVessel, M } from './engine/vessel.js';
import { Glaze } from './engine/glaze.js';
import { Paint } from './engine/cobalt.js';
import * as mot from './engine/motifs.js';
import * as land from './engine/landscape.js';

export const DUR = 54;
const W = 1920, H = 1080;
let gl, QS = null, SS = 1.5, S = null;
const q_get = k => (QS ? QS.get(k) : null);
const T0 = 5.1;                       // the brush first touches at T0 + .3
// every hit sits on a 100 BPM beat (0.6 s): 5.4 touch, 23.4 iris, 29.4 close, 30.0 heat, 32.4 flash, 38.4 shatter, 43.2 settle
const T_RIM = 21, T_IRIS0 = 23.4, T_IRIS1 = 25.8, T_PLATE1 = 29.4, T_IRIS2 = 31.2;
const T_HEAT0 = 30.0, T_FLASH = 32.4, T_FIRE1 = 35.4, T_MACRO0 = 35.4, T_MACRO1 = 38.4, T_SH0 = 38.4, T_SH1 = 43.2;

// --- text on porcelain plaques (English subtitles) ---
export const PLAQUES = [
  { t0: 1.0, t1: 5.0, text: 'Bare porcelain, waiting for blue.' },
  { t0: 6.2, t1: 10.6, text: 'Cobalt goes on first, under the glaze.' },
  { t0: 12.0, t1: 16.2, text: 'One river, painted round the jar.' },
  { t0: 25.6, t1: 29.2, text: 'Step into the painting.' },
  { t0: 31.4, t1: 34.6, text: 'Grey, until the fire.' },
  { t0: 35.4, t1: 39.4, text: 'The blue only arrives in the fire.' },
  { t0: 44.0, t1: 49.3, text: 'By the early 14th century, Jingdezhen mass-produced it.' },
  { t0: 49.6, t1: 54.0, text: 'The Blue Only Arrives in the Fire', title: true },
];
const PLAQUE_Y = H - 92;

export function init(ctx, q) {
  QS = q; SS = +(q.get('ss') || 1.5);
  gl = new Glaze(Math.round(W * SS), Math.round(H * SS));
  S = build();
  // plaque boxes for the reading-time check
  const c = ctx; c.save();
  for (const p of PLAQUES) { const size = p.title ? 46 : 40; c.font = `600 ${size}px "Cormorant Garamond"`; const w = c.measureText(p.text).width + 110, h = size * 1.95; p.box = { x0: W / 2 - w / 2, x1: W / 2 + w / 2, y0: PLAQUE_Y - h / 2, y1: PLAQUE_Y + h / 2 }; }
  c.restore();
}

function build() {
  const V = { mei: buildVessel('meiping'), plate: buildVessel('plate'), guan: buildVessel('guan'), bowl: buildVessel('bowl') };
  const mei = new Paint(V.mei.W, V.mei.H, { seed: 3 });
  const meiEnd = mot.paintMeiping(mei, V.mei);                        // painting-time; film time = painting-time + T0
  const plW = new Paint(V.plate.W, V.plate.H, { seed: 4 }), plD = new Paint(V.plate.discSize, V.plate.discSize, { seed: 5 });
  land.paintPlate(plW, plD, V.plate, T_IRIS0, T_PLATE1 - T_IRIS0 - .2, 3);
  const gW = new Paint(V.guan.W, V.guan.H, { seed: 6 }); land.paintGuan(gW, V.guan);
  const bW = new Paint(V.bowl.W, V.bowl.H, { seed: 7 }), bD = new Paint(V.bowl.discSize, V.bowl.discSize, { seed: 8 }); land.paintBowl(bW, bD, V.bowl);
  return { V, mei, meiEnd, plW, plD, gW, bW, bD, frames: {} };
}

// sound / cue events derived from the paintings themselves (brush strokes), plus the fixed beats
export function events() {
  const ev = [];
  for (const o of S.mei.ops) if (o.type === 'stroke' && !o.noTip && o.t1 - o.t0 > .05) ev.push({ t: +(o.t0 + T0).toFixed(3), type: o.ring ? 'ring' : 'stroke', dur: +(o.t1 - o.t0).toFixed(3), w: +(o.pts[Math.floor(o.pts.length / 2)][2]).toFixed(1) });
  for (const o of S.plD.ops) if (o.type === 'stroke' && !o.noTip && o.t1 - o.t0 > .05) ev.push({ t: +o.t0.toFixed(3), type: 'pstroke', dur: +(o.t1 - o.t0).toFixed(3), w: +(o.pts[Math.floor(o.pts.length / 2)][2]).toFixed(1) });
  ev.push({ t: 5.4, type: 'touch' }, { t: T_IRIS0, type: 'iris', dur: T_IRIS1 - T_IRIS0 }, { t: T_PLATE1, type: 'iris-close', dur: T_IRIS2 - T_PLATE1 },
    { t: T_HEAT0, type: 'heat', dur: T_FLASH - T_HEAT0 }, { t: T_FLASH, type: 'flash' }, { t: T_FLASH + .1, type: 'fire', dur: T_FIRE1 - T_FLASH },
    { t: T_SH0, type: 'shatter' }, { t: T_SH0 + 1.5, type: 'assemble', dur: T_SH1 - T_SH0 - 1.5 }, { t: T_SH1, type: 'settle' },
    { t: 5.4 - .6, type: 'tap' }, { t: 33.6, type: 'tap2' });
  return ev.sort((a, b) => a.t - b.t);
}
export function texts(t) {
  const out = [];
  PLAQUES.forEach((p, i) => { if (t >= p.t0 && t < p.t1) out.push({ id: 'plaque' + i, text: p.text, x0: p.box.x0, y0: p.box.y0, x1: p.box.x1, y1: p.box.y1 }); });
  return out;
}

// ---------------------------------------------------------------- timeline functions
const hero = { eye: [0, .66, 3.35], target: [0, .475, 0] };
const mouth = { eye: [0, 1.45, .07], target: [0, .95, 0] };
const lerp3 = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const camLerp = (a, b, t) => ({ eye: lerp3(a.eye, b.eye, t), target: lerp3(a.target, b.target, t), fov: 22 });

function rotRaw(t) {
  const spin = .5 * t;
  if (t < T0 - .3) return spin;
  const tt = Math.min(t, T_RIM);
  // smoothed follow target: weighted samples of the brush position over the last .21 s
  let acc = 0, ws = 0, ref = null;
  for (const [dt, w] of [[0, .4], [.07, .3], [.14, .2], [.21, .1]]) {
    const tip = S.mei.tip(Math.max(0, tt - dt - T0)); if (!tip) continue;
    let a = tip.x / S.V.mei.W * TAU - Math.PI / 2; if (ref == null) ref = a; a += TAU * Math.round((ref - a) / TAU);
    acc += a * w; ws += w;
  }
  const spinT = .5 * tt;
  let target = ws ? acc / ws : spinT; target += TAU * Math.round((spinT - target) / TAU);
  const w = ss(seg(tt, T0 - .3, T0 + .8));
  return lerp(spinT, target, w);
}
function rotAt(t) { return t <= T_RIM ? rotRaw(t) : rotRaw(T_RIM) + .4 * (t - T_RIM); }

function vaseCam(t) {
  let cam;
  if (t < T_RIM) cam = camLerp(hero, hero, 0);
  else if (t < 23.8) cam = camLerp(hero, mouth, ss(seg(t, T_RIM, 23.8)));
  else if (t < T_PLATE1) cam = camLerp(mouth, mouth, 0);
  else cam = camLerp(mouth, hero, ss(seg(t, T_PLATE1, T_PLATE1 + 2.0)));
  // macro glide over the fired glaze
  const m = ss(seg(t, T_MACRO0 - .2, T_MACRO0 + .9)) * (1 - ss(seg(t, T_MACRO1 - .9, T_MACRO1)));
  if (m > 0) {
    const u = seg(t, T_MACRO0, T_MACRO1), d = lerp(.95, 1.12, u), tx = lerp(-.12, .1, u), ty = lerp(.37, .52, u), el = 9 * Math.PI / 180;
    cam = camLerp(cam, { eye: [tx, ty + Math.sin(el) * d, Math.cos(el) * d], target: [tx, ty, 0] }, m);
  }
  // pull-back on the shelf
  if (t >= T_SH1) { const u = ss(seg(t, T_SH1, DUR)); const d = lerp(3.35, 5.9, u); cam = { eye: [0, lerp(.66, 1.0, u), d], target: [0, lerp(.475, .4, u), 0], fov: 22 }; }
  return cam;
}
const fireAt = t => t < T_FLASH ? 0 : ss(seg(t, T_FLASH + .05, T_FLASH + 1.7));
const heatAt = t => ss(seg(t, T_HEAT0, T_FLASH - .1)) * (1 - ss(seg(t, T_FLASH + .2, T_FLASH + 2.4)));
const kilnAt = t => ss(seg(t, 30.5, 31.8)) * (1 - ss(seg(t, 34.2, 36.0)));
const ageAt = t => t < T_SH0 ? 0 : .85;

// ---------------------------------------------------------------- compositing helpers
function backdrop(c, kb) {
  const g = c.createRadialGradient(W * .5, H * .42, 40, W * .5, H * .5, H * 1.05);
  g.addColorStop(0, '#2a2f3a'); g.addColorStop(.55, '#171a21'); g.addColorStop(1, '#0b0c10');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  if (kb > .001) kiln(c, kb);
}
function kiln(c, kb) {
  c.save(); c.globalAlpha = kb;
  const flick = 1 + .06 * Math.sin(QS ? 0 : 0);
  const g = c.createRadialGradient(W * .5, H * .86, 30, W * .5, H * .55, H * 1.0);
  g.addColorStop(0, '#ffb25a'); g.addColorStop(.18, '#d9591a'); g.addColorStop(.5, '#5a1a0a'); g.addColorStop(1, '#0d0504');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // brick arch: concentric rows of bricks with staggered joints
  c.strokeStyle = 'rgba(20,6,2,.75)'; c.lineWidth = 3;
  const cx = W / 2, cy = H * 1.02;
  for (let r = 0; r < 9; r++) {
    const rx = 520 + r * 150, ry = 640 + r * 130;
    c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, Math.PI, 2 * Math.PI); c.stroke();
    const n = 10 + r * 3, off = (r % 2) * .5;
    for (let i = 0; i <= n; i++) { const a = Math.PI + (i + off) / (n + 1) * Math.PI; if (a > 2 * Math.PI) continue; const x0 = cx + Math.cos(a) * rx, y0 = cy + Math.sin(a) * ry, x1 = cx + Math.cos(a) * (rx + 150), y1 = cy + Math.sin(a) * (ry + 130); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
  }
  c.restore();
}
function vignette(c) {
  const g = c.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * .95);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.42)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}
// subtitle plaque: a small porcelain label, cobalt double rule, lettered in blue
function plaque(c, p, t) {
  const size = p.title ? 46 : 40, font = `600 ${size}px "Cormorant Garamond"`;
  const a = ss(seg(t, p.t0, p.t0 + .5)) * (1 - ss(seg(t, p.t1 - .5, p.t1)));
  if (a <= 0) return;
  const dy = (1 - ss(seg(t, p.t0, p.t0 + .5))) * 38 + ss(seg(t, p.t1 - .5, p.t1)) * 38;
  const cx = W / 2, cy = PLAQUE_Y + dy;
  c.save(); c.globalAlpha = a; c.font = font; const tw = c.measureText(p.text).width, w = tw + 110, h = size * 1.95, x = cx - w / 2, y = cy - h / 2, r = h * .5;
  const rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 28; c.shadowOffsetY = 12; rr(x, y, w, h, r);
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#f7f8f6'); g.addColorStop(.55, '#e9edee'); g.addColorStop(1, '#cfd8dc'); c.fillStyle = g; c.fill();
  c.shadowColor = 'transparent';
  const gh = c.createLinearGradient(x, y, x + w, y); gh.addColorStop(0, 'rgba(255,255,255,0)'); gh.addColorStop(.12, 'rgba(255,255,255,.75)'); gh.addColorStop(.2, 'rgba(255,255,255,0)'); c.fillStyle = gh; rr(x + 3, y + 3, w - 6, h * .45, r * .8); c.fill();
  c.strokeStyle = '#1f3f8a'; c.lineWidth = 2.6; rr(x + 9, y + 9, w - 18, h - 18, r - 9); c.stroke();
  c.lineWidth = 1.2; rr(x + 15, y + 15, w - 30, h - 30, r - 15); c.stroke();
  c.fillStyle = '#17306f'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.text, cx, cy + size * .06);
  for (const dx of [-1, 1]) { c.beginPath(); c.arc(cx + dx * (w / 2 - 36), cy, 4, 0, TAU); c.fillStyle = '#1f3f8a'; c.fill(); }
  c.restore();
}
// the brush: projected onto the surface point through the same camera, with a contact shadow
function drawBrush(c, p3, nrm, model, lift, scale = 1) {
  const pos = p3.map((x, i) => x + nrm[i] * (0.012 + lift * 0.06));
  const [sx, sy] = gl.project(pos, model);
  const px = sx / SS, py = sy / SS;
  c.save(); c.translate(px, py); c.scale(scale, scale);
  c.rotate(-.42 + .12 * Math.sin(px * .01));
  c.save(); c.globalAlpha = .22 * (1 - lift * .5); c.translate(16 + 10 * lift, 14 + 8 * lift); c.fillStyle = '#000'; c.filter = 'blur(6px)'; c.fillRect(-3, -240, 6, 240); c.restore();
  const len = 330, tipLen = 62, w = 19;
  c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-w * .6, -tipLen * .35, -w * .95, -tipLen * .8, -w * .8, -tipLen); c.lineTo(w * .8, -tipLen); c.bezierCurveTo(w * .95, -tipLen * .8, w * .6, -tipLen * .35, 0, 0); c.closePath();
  const gh = c.createLinearGradient(-w, 0, w, 0); gh.addColorStop(0, '#2c3d78'); gh.addColorStop(.5, '#35498d'); gh.addColorStop(1, '#16224a'); c.fillStyle = gh; c.fill();
  c.beginPath(); c.moveTo(-w * .8, -tipLen); c.bezierCurveTo(-w * .9, -tipLen * 1.35, -w * .78, -tipLen * 1.8, -w * .62, -tipLen * 2.1); c.lineTo(w * .62, -tipLen * 2.1); c.bezierCurveTo(w * .78, -tipLen * 1.8, w * .9, -tipLen * 1.35, w * .8, -tipLen); c.closePath();
  const gh2 = c.createLinearGradient(-w, 0, w, 0); gh2.addColorStop(0, '#8a7458'); gh2.addColorStop(.35, '#c9b393'); gh2.addColorStop(1, '#5a4733'); c.fillStyle = gh2; c.fill();
  const hy0 = -tipLen * 2.1; const gb = c.createLinearGradient(-9, 0, 9, 0); gb.addColorStop(0, '#6e5a3c'); gb.addColorStop(.4, '#b69a6a'); gb.addColorStop(1, '#4a3a26');
  c.fillStyle = gb; c.fillRect(-9, hy0 - 22, 18, 22);
  const gbb = c.createLinearGradient(-8, 0, 8, 0); gbb.addColorStop(0, '#5e4426'); gbb.addColorStop(.35, '#c79d59'); gbb.addColorStop(.7, '#8c6a38'); gbb.addColorStop(1, '#3b2a16');
  c.fillStyle = gbb; c.beginPath(); c.moveTo(-8, hy0 - 22); c.lineTo(-7, hy0 - len); c.lineTo(7, hy0 - len); c.lineTo(8, hy0 - 22); c.closePath(); c.fill();
  c.restore();
}

const SLATE = [.20, .22, .28], KILN = [.55, .22, .08];
const groundFor = kb => ({ color: lerp3(SLATE, KILN, kb), blob: [0.19, 14, 1.2, 3.0], cast: [0.45, .55], alpha: .96 });

// ---------------------------------------------------------------- the vase scene (studio or kiln)
function vaseItems(t, o = {}) {
  const V = S.V;
  return [{ vessel: V.mei, wrap: S.mei, model: M.rotY(o.rot ?? rotAt(t)), fire: o.fire ?? fireAt(t), age: o.age ?? ageAt(t), heat: o.heat ?? heatAt(t), crack: .3 + .5 * (o.age ?? ageAt(t)), paintAmt: 1.15, ao: 5, seed: 2.0, t: t - T0 }];
}
function glRenderVase(t, c, o = {}) {
  const cam = o.cam || vaseCam(t), kb = o.kb ?? kilnAt(t);
  const items = vaseItems(t, o); items.forEach(i => { i.t = t - T0; });
  const cv = gl.render({ items, cam, t: t - T0, ground: o.noGround ? null : groundFor(kb) });
  return { cv, cam, model: items[0].model };
}

export function render(c, t) {
  c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  const tt = +(q_get('t') ?? t);
  if (tt < T_IRIS1 || tt >= T_PLATE1 + .0 && tt < T_SH0) sceneVase(c, tt);
  if (tt >= T_IRIS0 && tt < T_IRIS2) scenePlate(c, tt);
  if (tt >= T_SH0 && tt < T_SH1) sceneShards(c, tt);
  if (tt >= T_SH1) sceneShelf(c, tt);
  // flash of the kiln
  if (tt > T_FLASH - .6 && tt < T_FLASH + .9) { const a = tt < T_FLASH ? seg(tt, T_FLASH - .6, T_FLASH) * .9 : (1 - seg(tt, T_FLASH, T_FLASH + .9)) * .9; c.fillStyle = `rgba(255,236,200,${a * a})`; c.fillRect(0, 0, W, H); }
  vignette(c);
  for (const p of PLAQUES) plaque(c, p, tt);
  if (tt > DUR - .9) { c.fillStyle = `rgba(8,9,12,${seg(tt, DUR - .9, DUR)})`; c.fillRect(0, 0, W, H); }
}

function sceneVase(c, t) {
  const kb = kilnAt(t);
  backdrop(c, kb);
  const { cv, model } = glRenderVase(t, c);
  c.drawImage(cv, 0, 0, W, H);
  const tp = t - T0;
  if (t >= T0 && t < T_RIM + .6 && tp > 0) {
    const tip = S.mei.tip(tp);
    if (tip) { const v = S.V.mei, sp = v.surfaceAt(tip.x, S.mei.h - tip.y); drawBrush(c, sp.pos, sp.nrm, model, tip.lift); }
  }
}

function scenePlate(c, t) {
  const V = S.V.plate;
  // iris radius around the mouth (screen centre): opens 23.4→25.4, closes 29.6→31.2
  const R = t < T_PLATE1 ? 2300 * Math.pow(ss(seg(t, T_IRIS0, T_IRIS1)), 1.4) : 2300 * (1 - Math.pow(ss(seg(t, T_PLATE1, T_IRIS2)), .8));
  if (R < 2) return;
  const u = ss(seg(t, T_IRIS0, T_PLATE1)), el = 89 * Math.PI / 180, d = lerp(3.0, 1.35, u);
  const cam = { eye: [0, Math.sin(el) * d, Math.cos(el) * d], target: [0, .07, 0], fov: 22 };
  const model = M.id();
  const plateBg = () => { const g = c.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, H); g.addColorStop(0, '#242a36'); g.addColorStop(1, '#0c0e13'); c.fillStyle = g; c.fillRect(0, 0, W, H); };
  c.save(); c.beginPath(); c.arc(W / 2, H / 2, R, 0, TAU); c.clip();
  plateBg();
  const cv = gl.render({ items: [{ vessel: V, wrap: S.plW, disc: S.plD, model, fire: 0, age: 0, crack: .4, ao: 2, seed: 4.0, paintAmt: 1.15 }], cam, t, ground: null });
  c.drawImage(cv, 0, 0, W, H);
  const tip = t >= T_IRIS0 && t < T_PLATE1 ? S.plD.tip(t) : null;
  if (tip && tip.x != null) { const dr = V.discR, pos = [(tip.x / 2048 - .5) * 2 * dr, .069, (tip.y / 2048 - .5) * 2 * dr]; drawBrush(c, pos, [0, 1, 0], model, tip.lift, .9); }
  c.restore();
  // the rim: a glaze-white lip at the edge of the opening
  if (R < 1500) { c.save(); c.lineWidth = 10; c.strokeStyle = 'rgba(245,247,246,.85)'; c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 16; c.beginPath(); c.arc(W / 2, H / 2, R, 0, TAU); c.stroke(); c.restore(); }
}

// ---------------------------------------------------------------- shards: the fired vase breaks and reassembles, aged
function shardData() {
  if (S.shards) return S.shards;
  const mk = (age) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); const r = glRenderVase(T_SH0, x, { cam: { eye: hero.eye, target: hero.target, fov: 22 }, rot: rotAt(T_SH0), fire: 1, age, heat: 0, kb: 0, noGround: true }); x.drawImage(r.cv, 0, 0, W, H); return c; };
  const A = mk(0), B = mk(.85);
  const mkG = sh => { const g0 = document.createElement('canvas'); g0.width = W; g0.height = H; const x = g0.getContext('2d'); const items = vaseItems(T_SH0); items[0].model = M.scale(.0001, .0001, .0001); const cv = gl.render({ items, cam: { eye: hero.eye, target: hero.target, fov: 22 }, t: 0, ground: Object.assign(groundFor(0), { shadow: sh }) }); x.drawImage(cv, 0, 0, W, H); return g0; };
  const gnd = mkG(.12), gndHi = mkG(1);
  // jittered grid → triangles over the vase's box; keep cells that touch the vase
  const rng = mulberry(77), x0 = 700, x1 = 1230, y0 = 90, y1 = 960, nx = 11, ny = 17;
  const pts = []; for (let j = 0; j <= ny; j++) { pts.push([]); for (let i = 0; i <= nx; i++) pts[j].push([x0 + (x1 - x0) * i / nx + ((i > 0 && i < nx) ? (rng() - .5) * 28 : 0), y0 + (y1 - y0) * j / ny + ((j > 0 && j < ny) ? (rng() - .5) * 28 : 0)]); }
  const probe = A.getContext('2d').getImageData(0, 0, W, H).data;
  const alphaAt = (x, y) => probe[((y | 0) * W + (x | 0)) * 4 + 3];
  const sh = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = pts[j][i], b = pts[j][i + 1], c2 = pts[j + 1][i + 1], d = pts[j + 1][i];
    for (const tri of (rng() < .5 ? [[a, b, c2], [a, c2, d]] : [[a, b, d], [b, c2, d]])) {
      const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
      if (alphaAt(cx, cy) < 40) continue;
      const dx = cx - 960, dy = cy - 520, l = Math.hypot(dx, dy) || 1;
      sh.push({ tri, cx, cy, dir: [dx / l + (rng() - .5) * .9, dy / l - .25 + (rng() - .5) * .9], D: 260 + rng() * 700, rot: (rng() - .5) * 7, delay: rng() * .35, dB: [(rng() - .5) * 2, (rng() - .5) * 1.4 + .3], DB: 300 + rng() * 800, rotB: (rng() - .5) * 7, delayB: (1 - (cy - y0) / (y1 - y0)) * .6 * 0 + (cy - y0) / (y1 - y0) * .7 * 0 + (1 - (cy - y0) / (y1 - y0)) * .75 + rng() * .15 });
    }
  }
  return S.shards = { A, B, gnd, gndHi, sh };
}
function sceneShards(c, t) {
  const { A, B, gnd, gndHi, sh } = shardData();
  backdrop(c, 0); c.drawImage(gnd, 0, 0, W, H);
  const sa = t < T_SH0 + 1.3 ? 1 - ss(seg(t, T_SH0 + .1, T_SH0 + 1.3)) : ss(seg(t, T_SH1 - 1.3, T_SH1 - .1));
  if (sa > 0) { c.save(); c.globalAlpha = sa; c.drawImage(gndHi, 0, 0, W, H); c.restore(); }
  const tb = T_SH0 + .6;                  // shatter 38.4 → 39.4 · assemble from 39.0 to 43.2
  if (t < T_SH0 + .12) { c.drawImage(A, 0, 0, W, H); return; }
  for (const s of sh) {
    let img, u, px, py, rot, alpha;
    if (t < tb) {
      u = 1 - Math.pow(1 - clamp((t - T_SH0 - s.delay) / 1.0), 2.2); img = A;
      px = s.cx + s.dir[0] * s.D * u; py = s.cy + s.dir[1] * s.D * u + 380 * u * u; rot = s.rot * u; alpha = 1 - ss(seg(u, .78, 1));
    } else {
      const k = clamp((t - tb - s.delayB * 1.3) / 1.3); u = ss(k); img = B;
      px = s.cx + s.dB[0] * s.DB * (1 - u); py = s.cy + s.dB[1] * s.DB * (1 - u) - 200 * (1 - u); rot = s.rotB * (1 - u); alpha = ss(seg(k, 0, .25));
    }
    if (alpha <= .01) continue;
    c.save(); c.globalAlpha = alpha; c.translate(px, py); c.rotate(rot); c.translate(-s.cx, -s.cy);
    c.beginPath(); c.moveTo(s.tri[0][0], s.tri[0][1]); c.lineTo(s.tri[1][0], s.tri[1][1]); c.lineTo(s.tri[2][0], s.tri[2][1]); c.closePath();
    c.save(); c.clip(); c.drawImage(img, 0, 0, W, H); c.restore();
    if (u > .02 && u < .98) { c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.4; c.stroke(); }
    c.restore();
  }
  if (t > T_SH1 - .1) c.drawImage(B, 0, 0, W, H);
}

// ---------------------------------------------------------------- the shelf: the aged vase with a jar and a bowl, pulling back
function sceneShelf(c, t) {
  const V = S.V, cam = vaseCam(t);
  backdrop(c, 0);
  const items = [
    { vessel: V.mei, wrap: S.mei, model: M.rotY(rotAt(T_SH0) + .4 * (t - T_SH0)), fire: 1, age: .85, crack: .75, paintAmt: 1.15, ao: 5, seed: 2.0 },
    { vessel: V.guan, wrap: S.gW, model: M.mul(M.trans(-1.5, 0, -.12), M.rotY(1.1 + .12 * t)), fire: 1, age: .85, crack: .75, paintAmt: 1.15, ao: 4, seed: 6.0 },
    { vessel: V.bowl, wrap: S.bW, disc: S.bD, model: M.mul(M.trans(1.56, 0, .3), M.rotY(.6 - .1 * t)), fire: 1, age: .85, crack: .75, paintAmt: 1.15, ao: 3, seed: 8.0 },
  ];
  const cv = gl.render({ items, cam, t: 99, ground: { color: SLATE, blob: [0.19, 14, 1.2, 3.0], cast: [0.45, .55], alpha: .96 } });
  c.drawImage(cv, 0, 0, W, H);
}
