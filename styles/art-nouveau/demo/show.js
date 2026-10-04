// The Iris Hour: the demo film.  One world (three arched windows joined by one vine), a camera that follows the vine,
// a vine-shaped wipe into the title plate.  render(ctx, t) is a pure function of t.
import { clamp, lerp, seg, ss, eo, eio, TAU, mulberry } from '/core/lib.js';
import { PAL, mix, rgba, shape, inkLine, whip, paperOverlay, catmull, P2, polyPath, circlePts } from './engine/ink.js';
import { blade, stem, drawVine, iris, leaf } from './engine/flora.js';
import { roundel, archFrame, archPoly, banner, wallpaper, filigreeCorner, pearls, mosaicField, frost } from './engine/ornament.js';
import { layout, drawLayout } from './engine/letters.js';
import { keeper } from './engine/keeper.js';

const NOSUB = typeof location !== "undefined" && /nosub/.test(location.search);
export const W = 1920, H = 1080, DUR = 52.5;
export const BPM = 72, BEAT = 60 / BPM, BAR = BEAT * 3;      // 3/4 waltz: one bar = 2.5 s
const CXS = [500, 1300, 2100], WW = 520, WH = 880, WY = 52;

// ---------- timeline: the numbers every part (picture, voice, score, foley, checks) reads ----------
export const T = {
  line: [0.3, 3.2],                 // the opening line writes itself
  win: [[3.8, 11], [12.5, 20], [24.6, 31.5]],
  halo3: 27.5, stages: [30.0, 32.5, 35.0], eyes: 38.333, wipe: [40.0, 42.5], plate0: 42.5,
  title: [45.0, 48.0], silence: [22.5, 25.0],
};
const TIP = [[0.3, -250], [1.6, 260], [3.2, 520], [5.5, 700], [13, 1050], [16, 1700], [25, 2000], [27.5, 2450], [34, 2950]];   // where the vine's tip is
const CAM = [[0, 500, 800, .95], [5.5, 500, 540, 1.02], [13.2, 640, 520, 1.12], [16, 1300, 520, 1.12], [25, 1300, 420, 1.5],
  [27.5, 2100, 430, 1.35], [33.5, 2100, 360, 2.0], [36, 2100, 360, 2.05], [38.2, 1300, 310, 2.05], [60, 1300, 310, 2.05]];
const keysAt = (K, t, f) => { if (t <= K[0][0]) return K[0].slice(1); for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const a = K[i - 1], b = K[i], u = ss((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => lerp(v, b[j + 1], u)); } return K[K.length - 1].slice(1); };
export const camAt = t => { const [cx, cy, z] = keysAt(CAM, t); return { cx, cy, z }; };
const tipX = t => keysAt(TIP, t)[0];

// subtitles come from cues.json (written from the voice durations)
export let CUES = [];
export async function warm() { try { CUES = await (await fetch('cues.json')).json(); } catch (e) { CUES = []; } }

// ---------- the vine that joins the windows ----------
const LINK = (() => {
  const nodes = []; for (let i = 0; i < 26; i++) { const u = .2 + i * .031, k = i % 5;
    nodes.push(k === 2 ? { u, kind: 'tendril', side: i % 2 ? 1 : -1, len: 170, curl: 1.2 } : k === 4 ? { u, kind: 'blossom', size: 34, rot: i, fill: PAL.roseLt, shade: PAL.rose } : { u, kind: 'leaf', side: i % 2 ? 1 : -1, size: 125 + (i % 3) * 18, turn: .85 }); }
  return { x: -250, y: 985, ang: -.03, len: 3300, wave: .3, freq: 3.3, phase: .6, curl: 1.1, curlLen: .03, tipLen: .022, tipTurns: 1.1, w0: 15, w1: 8, ink: 3, nodes };
})();

function windowFrame(ctx, x, p, k) {
  // the frame extends upward from the sill, then everything inside is clipped to the glass
  const e = eo(p); if (e <= 0) return null;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 30, WY + WH * (1 - e) - 4, WW + 60, WH * e + 70); ctx.clip();
  const fr = archFrame(ctx, x, WY, WW, WH, { band: 26, fill: [mix(PAL.slate, PAL.paperLt, .72), mix(PAL.rose, PAL.paperLt, .6), PAL.paperLt][k], prog: p });
  ctx.restore();
  return { inner: fr.inner, clipY: WY + WH * (1 - e) - 4 };
}
const inGlass = (ctx, w, fn) => { ctx.save(); polyPath(ctx, w.inner); ctx.clip(); ctx.beginPath(); ctx.rect(0, w.clipY, 4000, 2000); ctx.clip(); fn(); ctx.restore(); };

const stage = t => ss(seg(t, T.stages[0], T.stages[0] + 1.4)) * .33 + ss(seg(t, T.stages[1], T.stages[1] + 1.4)) * .34 + ss(seg(t, T.stages[2], T.stages[2] + 1.4)) * .33;

function winter(ctx, t) {
  const x = CXS[0] - WW / 2, cx = CXS[0], p = seg(t, T.win[0][0], T.win[0][0] + 2.6), w = windowFrame(ctx, x, p, 0); if (!w) return;
  inGlass(ctx, w, () => {
    frost(ctx, w.inner, { x0: x + 26, y0: WY + 26, x1: x + WW - 26, y1: WY + WH }, { seed: 4, prog: eo(seg(t, 6.0, 12.5)), n: 26 });
    mosaicField(ctx, w.inner, x, WY + WH - 190, WW, 190, { size: 26, seed: 3, prog: seg(t, 7.0, 10.5), pal: [PAL.slate, mix(PAL.slate, '#fff', .4), PAL.tealLt, PAL.lilacLt, PAL.cream] });
    const ry = WY + WH - 215, rv = eo(seg(t, 8.5, 10.2));
    if (rv > 0) { ctx.save(); ctx.beginPath(); ctx.rect(cx - 140, ry - 60, 280 * rv, 100); ctx.clip();
      shape(ctx, catmull(P2([[cx - 120, ry + 6], [cx - 80, ry - 26], [cx - 30, ry - 32], [cx + 30, ry - 24], [cx + 90, ry - 34], [cx + 128, ry - 8], [cx + 100, ry + 16], [cx + 30, ry + 24], [cx - 40, ry + 22], [cx - 100, ry + 18]]), 7, true), { fill: '#B9936A', shade: '#8F6B45', sd: 7, ink: 3.5 }); ctx.restore(); }
    const gb = eo(seg(t, 9.2, 12.8));
    [[-60, -1.9, 330, .3], [20, -1.55, 420, .25], [80, -1.2, 300, -.3]].forEach(([dx, a, ln, wv], i) => blade(ctx, whip(cx + dx, ry - 20, a, ln, { wave: wv, curl: .7, curlLen: .2, dir: dx < 0 ? -1 : 1, g: eo(clamp(gb * 1.3 - i * .12)), tipTurns: .8 }), { W: 52 }));
    const gs = eo(seg(t, 10.2, 13.2)), st = whip(cx + 10, ry - 26, -1.62, 300, { wave: .1, bias: .15, g: gs, tipTurns: .8 });
    if (st.length > 3) { stem(ctx, st, { w0: 9, w1: 5 }); if (gs > .97) iris(ctx, st[st.length - 1].x, st[st.length - 1].y, { L: 92, open: 0, up: -88, sway: Math.sin(t * .9) * .02 }); }
  });
}
function waiting(ctx, t) {
  const x = CXS[1] - WW / 2, cx = CXS[1], p = seg(t, T.win[1][0], T.win[1][0] + 2.5), w = windowFrame(ctx, x, p, 1); if (!w) return;
  inGlass(ctx, w, () => {
    wallpaper(ctx, x, WY, x + WW, WY + WH, { base: mix(PAL.rose, PAL.paperLt, .55), col: mix(PAL.roseDk, PAL.paperLt, .4), dx: 100, dy: 130, alpha: .6 });
    roundel(ctx, cx, 330, 215, { prog: seg(t, 13.8, 20), seed: 5, disc: mix(PAL.paperLt, PAL.rose, .15) });
    const rev = eo(seg(t, 14.8, 17.6));
    if (rev > 0) { ctx.save(); ctx.beginPath(); ctx.arc(cx, 352, rev * 600, 0, TAU); ctx.clip();
      const open = ss(seg(t, T.eyes, T.eyes + 1.3));
      keeper(ctx, { x: cx, y: 360, H: 150, t, build: seg(t, 15, 20), lid: lerp(.04, .45, open), gaze: open * .5, tilt: .03 - .04 * open, sway: .05, yaw: .72 }); ctx.restore(); }
  });
}
function bloom(ctx, t) {
  const x = CXS[2] - WW / 2, cx = CXS[2], p = seg(t, T.win[2][0], T.win[2][0] + 2.2), w = windowFrame(ctx, x, p, 2); if (!w) return;
  inGlass(ctx, w, () => {
    wallpaper(ctx, x, WY, x + WW, WY + WH, { base: PAL.paperLt, col: mix(PAL.ochreLt, PAL.paperLt, .35), dx: 100, dy: 130, alpha: .7 });
    roundel(ctx, cx, 360, 215, { prog: seg(t, T.halo3, T.halo3 + 3), seed: 11 });
    mosaicField(ctx, w.inner, x, WY + WH - 190, WW, 190, { size: 26, seed: 8, prog: seg(t, 28, 31) });
    const gb = eo(seg(t, 28, 31)); const by = WY + WH - 160;
    [[-90, -1.85, 480, .3], [90, -1.3, 460, -.3], [0, -1.58, 560, .2]].forEach(([dx, a, ln, wv], i) => blade(ctx, whip(cx + dx, by, a, ln, { wave: wv, curl: .6, curlLen: .18, dir: dx < 0 ? -1 : 1, g: eo(clamp(gb * 1.25 - i * .1)), tipTurns: .8 }), { W: 60 }));
    const gs = eo(seg(t, 29, 31.5)), st = whip(cx, by - 10, -1.57, 470, { wave: .08, g: gs, tipTurns: .8 });
    if (st.length > 3) { stem(ctx, st, { w0: 11, w1: 6 }); if (gs > .6) { const e = st[st.length - 1]; iris(ctx, e.x, e.y, { L: 170 * eo(seg(gs, .6, 1)), open: stage(t), up: -90, sway: Math.sin(t * .8) * .012 }); } }
  });
}

function world(ctx, t, cam) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(cam.z, 0, 0, cam.z, W / 2 - cam.cx * cam.z, H / 2 - cam.cy * cam.z);
  const vx = 960 / cam.z + 40, vy = 540 / cam.z + 40;
  const rr = eo(seg(t, 2.4, 5.6)) * 3400;                        // the wall is revealed by a circle opening from the vine's tip
  if (rr > 1) { ctx.save(); ctx.beginPath(); ctx.arc(700, 900, rr, 0, TAU); ctx.clip(); wallpaper(ctx, cam.cx - vx, cam.cy - vy, cam.cx + vx, cam.cy + vy); ctx.restore(); }
  winter(ctx, t); waiting(ctx, t); bloom(ctx, t);
  const g = clamp((tipX(t) + 250) * 1.012 / LINK.len, 0, 1);
  drawVine(ctx, LINK, g, t, { look: ss(seg(t, 1.6, 3.8)) });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ---------- the title plate ----------
function plate(ctx, P) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, W, H);
  wallpaper(ctx, 0, 0, W, H, { base: mix(PAL.rose, PAL.paperLt, .62), col: mix(PAL.roseDk, PAL.paperLt, .35), dx: 150, dy: 190, alpha: .8 });
  // border and large gilded corners, drawn on
  const g = eo(seg(P, 0, 2)), m = 22, x0 = m, y0 = m, x1 = W - m, y1 = H - m;
  const Rr = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  shape(ctx, Rr, { fill: null, ink: 4, k: .6 }); shape(ctx, Rr.map((q, i) => ({ x: q.x + (i % 3 ? -1 : 1) * 15, y: q.y + (i < 2 ? 1 : -1) * 15 })), { fill: null, ink: 2.2, k: .5 });
  ctx.save(); ctx.strokeStyle = PAL.ochreLt; ctx.lineWidth = 12; ctx.strokeRect(x0 + 7.5, y0 + 7.5, x1 - x0 - 15, y1 - y0 - 15); ctx.restore();
  const fs = 400;
  filigreeCorner(ctx, x0 + 26, y0 + 26, 0, fs, { g }); filigreeCorner(ctx, x1 - 26, y0 + 26, 0, fs, { g, mir: -1 });
  filigreeCorner(ctx, x0 + 26, y1 - 26, 0, fs, { g, flip: true }); filigreeCorner(ctx, x1 - 26, y1 - 26, 0, fs, { g, mir: -1, flip: true });
  const cx = 960, cy = 372, R = 292;
  roundel(ctx, cx, cy, R, { prog: seg(P, 0, 2.4), seed: 9, disc: PAL.paperLt });
  const sb = whip(cx, 800, -1.57, 300, { wave: .06, g: eo(seg(P, .6, 2.4)) }); stem(ctx, sb, { w0: 15, w1: 10 });
  [[-30, -2.0, 420, .25], [30, -1.14, 420, -.25]].forEach(([dx, a, ln, wv]) => blade(ctx, whip(cx + dx, 800, a, ln, { wave: wv, curl: .6, curlLen: .2, dir: dx < 0 ? -1 : 1, g: eo(seg(P, .8, 3)) }), { W: 66 }));
  iris(ctx, cx, cy + 150, { L: 260 * eo(seg(P, .6, 2.2)), open: seg(P, 1.2, 4.2), up: -90, sway: Math.sin(P) * .01 });
  const vl = { ...LINK, x: 150, y: 1110, ang: -1.5, len: 760, wave: .32, freq: 1.15, phase: .2, bias: .5, curl: 1.15, curlLen: .3, tipLen: .16, w0: 13, w1: 3, nodes: LINK.nodes.slice(0, 9).map((n, i) => ({ ...n, u: .1 + i * .095 })) };
  const vr = { ...vl, x: 1770, ang: -1.64, phase: 1.7, bias: -.5, dir: -1, nodes: vl.nodes.map(n => ({ ...n, side: -(n.side || 1) })) };
  drawVine(ctx, vl, eo(seg(P, .2, 4.5)), P); drawVine(ctx, vr, eo(seg(P, .4, 4.7)), P);
  const L = layout('THE IRIS HOUR', { track: 14, sprout: 1, swash: { 12: { stroke: 2, end: 'end', len: 90, dir: -1, curl: 1.0, wave: .15, bias: -1.5 } } });
  const px = 168, lx = 960 - L.width * px / 100 / 2;
  drawLayout(ctx, L, { x0: lx, y0: 790, px, prog: seg(P, T.title[0] - T.plate0, T.title[1] - T.plate0), edgeW: 3.2 });
  plate.box = { x0: lx, y0: 790 - 60, x1: lx + L.width * px / 100, y1: 790 + px + 40 };
}

// ---------- the vine wipe ----------
let _oc = null;
function wipe(ctx, t, cam) {
  const [a, b] = T.wipe, u = eio(seg(t, a, b)), lead = lerp(-300, 2900, u), trail = lead - 1000;
  const ex = (x, y, k) => x + 70 * Math.sin(y / 150 + k) + 38 * Math.sin(y / 61 + k * 2);
  const edge = (x, k) => { const pts = []; for (let y = -60; y <= H + 60; y += 20) pts.push({ x: ex(x, y, k), y }); return pts; };
  const Ld = edge(lead, 0), Tr = edge(trail, 2);
  world(ctx, t, cam);                                              // the old picture everywhere
  if (!_oc) { _oc = document.createElement('canvas'); _oc.width = W; _oc.height = H; }
  const oc = _oc.getContext('2d'); plate(oc, 0); oc.setTransform(1, 0, 0, 1, 0, 0);
  ctx.save(); ctx.beginPath(); ctx.moveTo(-10, -60); Tr.forEach(p => ctx.lineTo(p.x, p.y)); ctx.lineTo(-10, H + 60); ctx.closePath(); ctx.clip(); ctx.drawImage(_oc, 0, 0); ctx.restore();   // the new picture behind the band
  const band = Tr.concat(Ld.slice().reverse());
  shape(ctx, band, { fill: PAL.sage, shade: PAL.sageDk, sd: 24, ink: 5, k: .7, hi: PAL.sageLt });
  for (let y = 80; y < H; y += 160) {                                // veins and leaves along both edges
    leaf(ctx, ex(lead, y, 0) - 4, y, -.25, 190, 90, { bend: .5, fill: PAL.sageLt, fillB: PAL.sage, ink: 4, veins: 3 });
    leaf(ctx, ex(trail, y + 80, 2) + 4, y + 80, Math.PI + .25, 150, 70, { bend: -.5, fill: PAL.sageLt, fillB: PAL.sage, ink: 3.5, veins: 3 });
  }
}

// ---------- subtitles ----------
function subtitle(ctx, t) {
  for (const c of CUES) {
    if (t < c.t0 - .05 || t > c.t1) continue;
    const p = eo(seg(t, c.t0, c.t0 + .45)) * (1 - ss(seg(t, c.t1 - .35, c.t1)));
    if (p <= .001) continue;
    ctx.save(); ctx.font = 'italic 600 46px "Cormorant Garamond"'; const tw = ctx.measureText(c.text).width; ctx.restore();
    const bw = Math.max(420, tw + 150);
    banner(ctx, 960, 1004, bw, 74, { prog: p });
    if (p > .9) { ctx.save(); ctx.fillStyle = PAL.ink; ctx.font = 'italic 600 46px "Cormorant Garamond"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.text, 960, 1002); ctx.restore(); }
  }
}

export function render(ctx, t) {
  const cam = camAt(Math.min(t, T.wipe[0]));
  if (t < T.wipe[0]) world(ctx, t, cam);
  else if (t < T.wipe[1]) wipe(ctx, t, cam);
  else plate(ctx, t - T.plate0);
  paperOverlay(ctx, W, H, t < T.wipe[1] ? cam : { cx: W / 2, cy: H / 2, z: 1 });
  if (!NOSUB) subtitle(ctx, t);
}

export function TEXTS(t) {
  const out = [];
  for (const c of CUES) if (t >= c.t0 && t <= c.t1 - .35) { const w = c.text.length * 21 + 150; out.push({ id: c.id, text: c.text, x0: 960 - w / 2, y0: 967, x1: 960 + w / 2, y1: 1041 }); }
  if (t >= T.title[0] - .5 && t <= DUR && plate.box) out.push({ id: 'title', text: 'THE IRIS HOUR', ...plate.box });
  return out;
}

// ---------- events for the mixer and the cue check ----------
const rnd = mulberry(77), ev = [];
const add = (t, type, o = {}) => ev.push({ t: +t.toFixed(3), type, ...o });
add(.3, 'pen', { d: 2.9 });
for (let i = 0; i < 34; i++) add(7.0 + i * .103, 'tick', { p: .8 + rnd() * .5, v: .5 + rnd() * .4 });         // winter floor
for (let i = 0; i < 44; i++) add(14.3 + i * .125, 'tick', { p: .9 + rnd() * .5, v: .5 + rnd() * .4 });         // keeper's halo
for (let i = 0; i < 40; i++) add(27.6 + i * .08, 'tick', { p: .9 + rnd() * .6, v: .5 + rnd() * .4 });         // bloom halo and floor
for (const [tt, v] of [[7.6, 1], [8.9, .8], [10.3, .9], [11.6, .7]]) add(tt, 'frost', { v });
for (const tt of [9.9, 12.4, 21.2]) add(tt, 'drip');
for (let i = 0; i < 5; i++) add(22.5 + i * .5, 'clock');
for (const tt of [1.6, 5.0, 8.5, 13.4, 17.2, 26.0]) add(tt, 'leaf');
for (const tt of [6.3, 12.2, 18.1, 31.0, 36.0]) add(tt, 'creak');
for (const tt of T.stages) add(tt, 'petal', { stage: 1 });
add(T.eyes, 'hit', { name: 'eyes' }); add(T.halo3, 'hit', { name: 'halo' }); add(T.wipe[0], 'whoosh', { d: 2.5 });
add(T.title[0], 'pen', { d: 3.0 });
for (const tt of [46.0, 46.8, 47.5, 48.2]) add(tt, 'sprout');
add(14.8, 'swish'); add(15.9, 'swish');
for (const tt of T.stages) add(tt, 'hit', { name: 'stage' });
export const EV = ev;
