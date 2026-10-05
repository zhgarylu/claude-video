// film.js: the shots of "Round One: The Jar" and the overlays (lettering, plates, meter, subtitles). Every function draws frame t.
import * as K from './ink.js';
import { c, INK, S, shape, ink, taper, tube, trace, jit, focusLines, speedLines, burst, aura, cracks, puff, chunk, hatch, tone } from './ink.js';
import { P, mix, haruHead, bust, fist, haruStance, jar, lid, kitchen, grandHand, drop, spoon } from './art.js';
import { hash, clamp, lerp, seg, ss, eio, eo, ei, back, mulberry } from '/core/lib.js';
import { SHOTS, VO, SHAKES, RUNS, DUR } from './timeline.js';

export const W = 1920, H = 1080;
export const TX = [];      // texts visible this frame, for readcheck
const q = (t, fps) => Math.floor(t * fps + 1e-6) / fps;
const fill = (col) => { c.fillStyle = col; c.fillRect(-300, -300, W + 600, H + 600); };
function grad(c0, c1, y0 = 0, y1 = H) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); c.fillStyle = g; c.fillRect(-300, -300, W + 600, H + 600); }
function radial(cx, cy, r0, r1, c0, c1) { const g = c.createRadialGradient(cx, cy, r0, cx, cy, r1); g.addColorStop(0, c0); g.addColorStop(1, c1); c.fillStyle = g; c.fillRect(-300, -300, W + 600, H + 600); }
function zoomAt(z, px, py) { c.translate(px, py); c.scale(z, z); c.translate(-px, -py); }
function cam(z, cx, cy, rot = 0) { c.translate(960, 540); c.rotate(rot); c.scale(z, z); c.translate(-cx, -cy); }
function reg(id, text, x0, y0, x1, y1) {   // register a text with its box in screen pixels (current transform)
  const m = c.getTransform(), pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
  TX.push({ id, text, x0: Math.min(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), x1: Math.max(...pts.map(p => p[0])), y1: Math.max(...pts.map(p => p[1])) });
}
const poly = (pts) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath(); };

// ---------------------------------------------------------------- lettering: sound words and shouts
export function lettering(id, text, x, y, size, o = {}) {
  const { t, t0, from = 2.4, rot = 0, fl = '#fff', edge = INK, shadow = P.vioHot, font = 'Bangers', shake = 0, sp = 3, pop = .14, reportAs = null } = o;
  const k = t - t0; if (k < 0) return;
  const sc = k < pop ? lerp(from, .94, eo(k / pop)) : k < pop + .12 ? lerp(.94, 1, ss((k - pop) / .12)) : 1;
  c.save(); c.translate(x + jit(300 + id.length * 7, shake), y + jit(301 + id.length, shake)); c.rotate(rot); c.scale(sc, sc);
  c.font = `${size}px ${font}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round'; c.letterSpacing = sp + 'px';
  const w = c.measureText(text).width;
  c.strokeStyle = edge; c.lineWidth = size * .2; c.strokeText(text, size * .06, size * .07); c.fillStyle = shadow; c.fillText(text, size * .06, size * .07);
  c.strokeText(text, 0, 0); c.fillStyle = fl; c.fillText(text, 0, 0);
  reg(reportAs || id, text, -w / 2, -size * .8, w / 2, size * .22);
  c.letterSpacing = '0px'; c.restore();
}
// a name plate: parallelogram with a main line and a sub line; slides in from a side
function plate(id, main, sub, x, y, t0, t, col, side = 1) {
  const k = t - t0; if (k < 0) return;
  const sl = 1 - eo(k / .22), ox = -side * 900 * sl;
  c.save(); c.translate(x + ox, y);
  c.font = '112px Anton'; const w1 = c.measureText(main).width; c.font = '40px Anton'; c.letterSpacing = '5px'; const w2 = c.measureText(sub).width; c.letterSpacing = '0px';
  const w = Math.max(w1 + 90, w2 + 90);
  shape([[-20, -126], [w + 20, -126], [w - 20, 80], [-60, 80]], { fill: INK, lw: 0, smooth: false, id: 400 });
  shape([[-20, -126], [w + 20, -126], [w + 14, -108], [-26, -108]], { fill: col, lw: 0, smooth: false, id: 401 });
  shape([[-60, 62], [w - 20, 62], [w - 24, 80], [-60, 80]], { fill: col, lw: 0, smooth: false, id: 402 });
  c.fillStyle = '#fff'; c.font = '112px Anton'; c.textAlign = 'left'; c.fillText(main, 20, -16);
  c.fillStyle = col; c.font = '40px Anton'; c.letterSpacing = '5px'; c.fillText(sub, 24, 44); c.letterSpacing = '0px';
  reg(id + '_n', main, 20, -112, 20 + w1, 0); reg(id + '_s', sub, 24, 8, 24 + w2, 52);
  c.restore();
}
// ROUND card: slams in the middle, then glides to the corner
function roundCard(id, text, t0, t1, t) {
  if (t < t0 || t > t1) return;
  const k = t - t0, g = ss((k - .8) / .35);
  const x = lerp(960, 330, g), y = lerp(540, 150, g), sz = lerp(260, 120, g);
  if (g < 1) { c.save(); c.globalAlpha = 1 - g; shape([[-80, y - 190], [W + 80, y - 220], [W + 80, y + 70], [-80, y + 90]].map(([a, b]) => [a, b + (540 - y) * 0 ]), { fill: INK, lw: 0, smooth: false, id: 410 }); c.restore(); }
  lettering(id, text, x, y + sz * .25, sz, { t, t0, from: 1.5, rot: -.05, fl: '#fff', shadow: P.vioHot, shake: k < .5 ? 5 : 1 });
}
// the grip meter, top right
const LEVEL = [[14.6, .12], [16.2, .12], [17.0, .2], [17.4, .09], [19.7, .09], [20.1, .53], [24.4, .53], [25.1, .0], [28, 0], [36, .0], [38.5, .35], [41, .7], [43.2, 1], [44.0, 1]];
const NUM = [['12', 14.8, 19.0], ['53', 20.0, 25.0], ['0', 25.2, 28.0], ['???', 36.0, 44.0]];
const HUDON = [[14.6, 28.0], [35.8, 44.0]];
function hud(t) {
  const on = HUDON.find(([a, b]) => t >= a && t < b); if (!on) return;
  let lv = 0; for (let i = 1; i < LEVEL.length; i++) if (t >= LEVEL[i - 1][0] && t < LEVEL[i][0]) lv = lerp(LEVEL[i - 1][1], LEVEL[i][1], ss((t - LEVEL[i - 1][0]) / (LEVEL[i][0] - LEVEL[i - 1][0])));
  const slide = 1 - eo((t - on[0]) / .3);
  c.save(); c.translate(1470 + slide * 600, 70);
  shape([[0, 0], [400, 0], [380, 130], [-20, 130]], { fill: INK, lw: 0, smooth: false, id: 420 });
  shape([[0, 0], [400, 0], [397, 12], [-3, 12]], { fill: P.teal, lw: 0, smooth: false, id: 421 });
  c.font = '38px Anton'; c.letterSpacing = '5px'; c.fillStyle = P.tealLt; c.textAlign = 'left'; c.fillText('GRIP', 28, 54); c.letterSpacing = '0px';
  reg('hud_grip', 'GRIP', 28, 20, 28 + 90, 60);
  const flash = t > 43.2 && Math.floor(t * 12) % 2 === 0;
  const N = 22;
  for (let i = 0; i < N; i++) { const on2 = (i + .5) / N <= lv; c.fillStyle = on2 ? (flash ? '#fff' : mix(P.teal, '#ffffff', i / N * .6)) : '#27304f'; c.beginPath(); c.moveTo(28 + i * 15.5, 100); c.lineTo(28 + i * 15.5 + 12, 100); c.lineTo(28 + i * 15.5 + 8, 70); c.lineTo(28 + i * 15.5 - 4, 70); c.fill(); }
  const nm = NUM.find(([s, a, b]) => t >= a && t < b);
  if (nm) { c.font = '78px Anton'; c.fillStyle = '#fff'; c.textAlign = 'right'; const w = c.measureText(nm[0]).width; c.fillText(nm[0], 372, 62); reg('hud_' + nm[0], nm[0], 372 - w, 8, 372, 70); }
  c.restore();
}
// subtitles: a slanted bar at the bottom
export function captions(t) {
  const cues = VO.map((v, i, a) => ({ ...v, t1: Math.min(i + 1 < a.length ? a[i + 1].t - .05 : DUR, v.t + Math.max(1.8, v.dur + .6)) }));
  const v = cues.find(v => t >= v.t && t < v.t1); if (!v) return;
  c.save(); c.font = '46px Anton'; c.letterSpacing = '2px'; const w = c.measureText(v.text).width + 90, x0 = 960 - w / 2, y = 972;
  const col = v.who === 'gran' ? '#ffe3b0' : '#fff', bar = v.who === 'gran' ? '#3b1b4e' : INK;
  const k = ss((t - v.t) / .12);
  c.globalAlpha = k;
  shape([[x0, y - 60], [x0 + w + 24, y - 60], [x0 + w, y + 22], [x0 - 24, y + 22]], { fill: bar, lw: 0, smooth: false, id: 430 });
  shape([[x0, y + 12], [x0 + w, y + 12], [x0 + w - 4, y + 22], [x0 - 4, y + 22]], { fill: v.who === 'gran' ? P.vioHot : P.teal, lw: 0, smooth: false, id: 431 });
  c.fillStyle = col; c.textAlign = 'center'; c.fillText(v.text, 960, y - 8); c.restore();
}

// ---------------------------------------------------------------- shared pieces
function shakeAt(t) {
  let ax = 0, ay = 0, ar = 0;
  const k = Math.floor(t * 24);
  for (const [t0, amp, dec] of SHAKES) if (t >= t0) { const e = Math.exp(-(t - t0) / dec) * amp; ax += (hash(k * 1.3 + t0) - .5) * 2 * e; ay += (hash(k * 2.1 + t0 + 4) - .5) * 2 * e; ar += (hash(k * 3.7 + t0) - .5) * 2 * e * 0.0004; }
  for (const [a, b, f, g] of RUNS) if (t >= a && t < b) { const e = lerp(f, g, (t - a) / (b - a)); ax += (hash(k * 1.9 + a) - .5) * 2 * e; ay += (hash(k * 2.9 + a + 1) - .5) * 2 * e; }
  return [ax, ay, ar];
}
function debris(t, t0, o = {}) {
  const { n = 16, mode = 'boom', x0 = 960, y0 = 980, spread = 600, up = 1 } = o, k = t - t0; if (k < 0) return;
  for (let i = 0; i < n; i++) {
    const h = j => hash(i * 7.3 + j * 3.1 + t0), sx = x0 + (h(1) - .5) * spread, s = 24 + h(2) * 46;
    let x, y, rot;
    if (mode === 'boom') { const vx = (h(3) - .5) * 700, vy = -(500 + h(4) * 900) * up, kk = k + h(5) * .05; x = sx + vx * kk; y = y0 + vy * kk + 1700 * kk * kk * .5; rot = h(6) * 6 + kk * (h(7) - .5) * 14; if (y > H + 200) continue; }
    else { const rise = (60 + h(3) * 380) * up * ss(k / (2.2 + h(4) * 2)); x = sx + Math.sin(k * 1.3 + i) * 14; y = y0 - rise - Math.sin(k * 2 + i * 2) * 10; rot = h(6) * 6 + k * (h(7) - .5) * 1.4; }
    chunk(x, y, s, rot, { fill: i % 4 === 0 ? '#c9d1d4' : P.tile, sh: P.tileSh, seed: i + 1 });
  }
}
function dustRing(t, t0, x, y, spread, o = {}) {
  const k = t - t0; if (k < 0 || k > 2.6) return;
  const { n = 7, r0 = 60 } = o;
  for (let i = 0; i < n; i++) {
    const h = j => hash(i * 5.1 + j * 2.3 + t0), dir = (i / (n - 1) - .5) * 2, e = eo(k / 1.4);
    c.save(); c.globalAlpha = 1 - ss((k - .9) / 1.6);
    puff(x + dir * spread * e + (h(1) - .5) * 60, y - e * (20 + 110 * h(2)) - k * 14 + (h(4) - .5) * 60, r0 * (.45 + h(3) * .95) * (.4 + e * 1.1), { seed: i + 4 });
    c.restore();
  }
}
function sparkle(x, y, r, rot = 0, col = '#fff') {
  c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 4; c.beginPath();
  c.moveTo(0, -r); c.lineTo(r * .22, -r * .22); c.lineTo(r, 0); c.lineTo(r * .22, r * .22); c.lineTo(0, r); c.lineTo(-r * .22, r * .22); c.lineTo(-r, 0); c.lineTo(-r * .22, -r * .22); c.closePath(); c.fill(); c.stroke(); c.restore();
}
const vio = [P.vio, P.vioLt, P.vioHot], teal = [P.tealDp, P.teal, P.tealLt];
function vignette(a = .5) { radial(960, 540, 460, 1200, 'rgba(0,0,0,0)', `rgba(8,4,24,${a})`); }

// ---------------------------------------------------------------- the shots
const SH = {};
SH.black = () => { fill('#000'); };

function eyesStrip(lt, t, o = {}) {
  const { bg = '#f6f1e0', lines = INK, eyeO = {}, y0 = 320, y1 = 760, head = {} } = o;
  fill('#000');
  c.save(); poly([[-40, y0 + 10], [W + 40, y0 - 24], [W + 40, y1 + 14], [-40, y1 + 40]]); c.clip();
  fill(bg);
  c.save(); const z = 1 + .08 * lt / 2.2; cam(z, 960, 540);
  focusLines(960, 545, { n: 130, rIn: 300, rOut: 1900, col: lines, seed: 1 });
  haruHead(960, 463, 3.2, Object.assign({ mouth: 'line' }, head, { eye: eyeO }));
  c.restore();
  c.restore();
  shape([[-40, y0 + 10], [W + 40, y0 - 24]], { lw: 0 });
  c.strokeStyle = INK; c.lineWidth = 10; c.beginPath(); c.moveTo(-40, y0 + 10); c.lineTo(W + 40, y0 - 24); c.moveTo(-40, y1 + 40); c.lineTo(W + 40, y1 + 14); c.stroke();
}
SH.eyes = (lt, t) => {
  eyesStrip(lt, t, { eyeO: { open: lerp(.9, .52, ss(lt / 1.3)), anger: lerp(.1, .5, ss(lt / 1.3)), glint: seg(lt, 1.35, 1.7) * (1 - seg(lt, 1.8, 2.0)) * 1.2, iris: .95 }, head: { brow: lerp(0, .6, ss(lt / 1.3)), sweat: lt > .9 ? 1 : 0, sweatDrop: seg(lt, 1.2, 2.0) } });
};
SH.jar = (lt, t) => {
  fill('#12062a'); c.save(); cam(1 + .1 * lt / 2.1, 960, 560, -.05 + lt * .008);
  focusLines(960, 560, { n: 110, rIn: 260, rOut: 1800, col: '#3d1275', seed: 2 });
  aura(960, 1000, 380, 820, .9 + .1 * Math.sin(t * 9), vio, { t, seed: 2, up: 1.2 });
  jar(960, 560, 1.2, { mood: 1, rattle: .8 });
  const g = seg(t, 3.55, 3.75) * (1 - seg(t, 3.75, 4.0)); if (g > 0) { sparkle(830, 330, 90 * g + 10, 0); }
  c.restore(); vignette(.55);
};
SH.wide = (lt, t) => {
  c.save(); cam(1 + .06 * lt / 3, 960, 560);
  kitchen({ dusk: 1 });
  aura(1300, 700, 130, 190, .5 + .2 * Math.sin(t * 8), vio, { t, seed: 5, tongues: 9 });
  jar(1300, 700 - 243 * .9, .9, { mood: 1 });
  haruStance(580, 470, .36, { stride: 200, head: { eye: { anger: .4, open: .9 }, mouth: 'line', brow: .5 } });
  c.restore(); vignette(.35);
  if (t >= 5.0 && t < 5.13) { focusLines(960, 360, { n: 90, rIn: 160, rOut: 1700, col: '#fff', seed: 9 }); }
  if (t >= 5.0) burst(960, 200, 260 + (t < 5.2 ? (5.2 - t) * 400 : 0), 420, 18, { fill: 'rgba(122,34,216,.9)', lw: 10, seed: 3 });
  lettering('title', 'THE JAR', 960, 300, 300, { t, t0: 5.0, rot: -.04, shake: t < 5.5 ? 7 : 1.2, shadow: P.vio });
};
SH.face = (lt, t) => {
  const heat = seg(lt, 2.0, 6.0);
  const gx = 1130 + Math.sin(lt * .8) * 14, gx2 = gx - 340;
  const push = 1 + .05 * lt / 6.5;
  // left: Haru
  c.save(); poly([[-40, -20], [gx, -20], [gx2, 1100], [-40, 1100]]); c.clip();
  grad('#0a1e4d', '#0d6f86'); c.save(); zoomAt(push, 450, 540);
  focusLines(450, 480, { n: 100, rIn: 340, rOut: 1700, col: '#aaf6ee', seed: 3, wmax: .014 });
  aura(450, 1040, 400, 900, .55 + .4 * heat + .12 * Math.sin(t * 9), teal, { t, seed: 3, up: 1 });
  bust(450, 440, .95, { lit: .1 }); haruHead(450, 440, .95, { eye: { anger: lt < 4 ? .55 : .8, open: .9 }, brow: lt < 4 ? .55 : .8, mouth: lt > 4.3 ? 'grit' : 'line', sweat: lt > 5 ? 1 : 0, vein: lt > 4.8 ? .8 : 0, lift: .25 + .05 * Math.sin(t * 9), wind: 1, lit: .1 });
  c.restore(); c.restore();
  // right: the Jar
  c.save(); poly([[gx, -20], [W + 40, -20], [W + 40, 1100], [gx2, 1100]]); c.clip();
  grad('#1b0638', '#5a0b66'); c.save(); zoomAt(push, 1460, 540);
  focusLines(1460, 560, { n: 100, rIn: 340, rOut: 1700, col: '#9a44d4', seed: 4, wmax: .014 });
  aura(1460, 1040, 400, 900, .55 + .4 * heat + .12 * Math.sin(t * 8 + 1), vio, { t, seed: 4, up: 1 });
  jar(1460, 560, .98, { mood: 1, rattle: .5 + 1.5 * heat });
  c.restore(); c.restore();
  // gutter and crackle
  shape([[gx - 15, -20], [gx + 15, -20], [gx2 + 15, 1100], [gx2 - 15, 1100]], { fill: '#fff', lw: 8, smooth: false, id: 440 });
  const R = mulberry(40 + S.boil * 7), zz = []; for (let i = 0; i <= 14; i++) { const u = i / 14; zz.push([lerp(gx, gx2, u) + (R() - .5) * (50 + 90 * heat) * Math.sin(u * Math.PI), u * 1080]); }
  c.lineJoin = 'round'; c.strokeStyle = '#fff7a8'; c.lineWidth = 12; c.beginPath(); trace(zz, false, false); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 4; c.stroke();
  plate('hr', 'HARU', 'APPRENTICE COOK', 90, 790, 8.3, t, P.teal, 1);
  plate('jr', 'THE JAR', 'SEALED 3 YEARS', 1130, 790, 8.9, t, P.vioHot, -1);
};
// medium: Haru straining at the jar
SH.grip = (lt, t) => {
  const lq = q(lt, 8), st = seg(lq, 1.0, 1.9), rel = seg(lq, 3.4, 3.9), z = 1 + .06 * lt / 5;
  c.save(); cam(z, 960, 540, Math.sin(lt * .9) * .01);
  kitchen({ dusk: 1 }); c.fillStyle = 'rgba(10,8,40,.5)'; c.fillRect(-300, -300, W + 600, H + 600);
  focusLines(960, 560, { n: 90, rIn: 420, rOut: 1700, col: st > 0 && rel < 1 ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.25)', seed: 6, wmax: .012 });
  const hy = 300 + rel * 40, tr = (st > 0 && rel < 1) ? 1 : 0;
  const FY = 724, FX = 205;
  const armJ = sd => [jit(60 + sd, tr * (3 + st * 5)), jit(61 + sd, tr * (3 + st * 5))];
  for (const sd of [-1, 1]) tube([[960 + sd * 150, hy + 250], [960 + sd * 330, hy + 335]], [112, 94], { fill: P.tee, lw: 8, id: 482 + sd });
  bust(960, hy, 1, { lit: 0 });
  for (const sd of [-1, 1]) {
    const [jx, jy] = armJ(sd);
    tube([[960 + sd * 330, hy + 340], [960 + sd * 300, hy + 520], [960 + sd * FX + jx, FY + jy]], [112, 96, 80], { fill: P.skin, lw: 8, id: 480 + sd, shade: P.skinSh, shadeSide: sd });
  }
  const e = lq < 1.0 ? { anger: .3, open: .9 } : rel < 1 ? { anger: 1, open: lerp(.9, .5, st) } : { anger: -.5, open: .45, look: [0, 12] };
  haruHead(960, hy, 1, { eye: e, brow: rel < 1 ? Math.min(1, .3 + st) : -.7, mouth: rel < 1 ? (st > .1 ? 'grit' : 'line') : 'wobble', vein: (st > .3 && rel < 1) ? 1 : 0, sweat: st > .2 ? 2 : 0, sweatDrop: rel > 0 ? rel : 0, gloom: lq > 3.9 ? clamp((lq - 3.9) / .5) : 0, tilt: rel * .05, lift: 0, shade: 0 });
  jar(960, 960, .9, { mood: 1, rattle: tr * (1 + st * 2) * .6 });
  for (const sd of [-1, 1]) fist(960 + sd * FX, FY, .95, { flip: sd, rot: sd * .1, shake: tr * (2 + st * 5) });
  if (tr) for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; ink([[960 + Math.cos(a) * 330, 700 + Math.sin(a) * 120], [960 + Math.cos(a) * 372, 700 + Math.sin(a) * 140]], 6, { col: '#fff', id: 500 + i }); }
  if (t > 18.35) { const g = seg(t, 18.35, 18.5) * (1 - seg(t, 18.7, 19.0)); if (g > 0) sparkle(820, 640, 70 * g + 10, 0); }
  c.restore(); vignette(.4);
  roundCard('r1', 'ROUND 1', 14.0, 16.6, t);
  if (t < 17.8) lettering('sh1', 'NNNGH!', 1500, 600, 190, { t, t0: 15.6, rot: .07, shake: 7, shadow: P.vio });
};
function debrisStance(t, kind) { }
SH.stance = (lt, t) => {
  const e = seg(t, 19.7, 19.9), ae = e * (1 - .0) + .15 * (1 - e);
  c.save(); cam(1 + .06 * lt / 3.4, 960, 560); const [sx, sy] = shakeAt(t); c.translate(sx, sy);
  grad('#070d2e', '#0d4a66'); radial(960, 600, 100, 1200, 'rgba(31,231,210,.35)', 'rgba(0,0,0,0)');
  if (e > 0) focusLines(960, 560, { n: 120, rIn: 380, rOut: 1900, col: 'rgba(210,255,250,.9)', seed: 7, wmax: .016 });
  const gtile = '#cfd8dc'; c.fillStyle = '#5f7ba0'; c.fillRect(-300, 960, W + 600, 400); ink([[-300, 960], [W + 300, 960]], 8);
  cracks(960, 1010, seg(t, 19.9, 21.8), { len: 1250, k: .3, seed: 5, n: 11, lw: 12, a0: -.05 * Math.PI, a1: 1.05 * Math.PI, hi: '#bff' });
  aura(960, 1060, 470 * ae + 100, 1000 * ae + 200, .2 + .8 * e + .1 * Math.sin(t * 11), teal, { t, seed: 6, up: 1.3, tongues: 17 });
  dustRing(t, 19.9, 960, 1040, 800, { n: 9, r0: 90 });
  haruStance(960, 285, .68, { lit: .15 * e, stride: 250, fistLift: e * .3, tremble: 6, head: { eye: e > .5 ? { anger: 1, open: .75 } : { anger: .5, open: .8 }, brow: 1, mouth: e > .5 ? 'shout' : 'grit', lift: e, wind: 1, vein: 1, lit: .15 * e, sweat: e > 0 ? 0 : 1 } });
  debris(t, 19.9, { n: 14, mode: 'boom', y0: 1000, spread: 900 });
  c.restore();
  roundCard('r2', 'ROUND 2', 19.0, 21.6, t);
  lettering('sh2', 'HAAAAH!', 1540, 600, 200, { t, t0: 19.8, rot: -.08, shake: 9, fl: '#fff', shadow: P.tealDp });
};
SH.cut = (lt, t) => {
  c.save(); cam(1.0 + .1 * lt / 2.6, 1020, 600); const [sx, sy] = shakeAt(t); c.translate(sx * .3, sy * .3);
  kitchen({ dusk: 1 }); c.fillStyle = 'rgba(10,8,40,.35)'; c.fillRect(-300, -300, W + 600, H + 600);
  cracks(1000, 850, 1, { len: 1500, k: .5, seed: 8, n: 12, lw: 10, a0: .03 * Math.PI, a1: .97 * Math.PI, hi: null, floor: true });
  aura(1130, 720, 220, 360, .55 + .15 * Math.sin(t * 8), vio, { t, seed: 7, tongues: 11 });
  jar(1130, 690 - 243 * 1.05, 1.05, { mood: 1, rattle: .3 });
  dustRing(t, 22.4, 1000, 900, 700, { n: 7, r0: 70 });
  for (let i = 0; i < 5; i++) { const h = j => hash(i * 3.3 + j); const k = (t - 22.4) + h(1); chunk(700 + h(2) * 800, 300 + ((k * 130 + h(3) * 300) % 700), 20 + h(4) * 20, k * 2 + h(5) * 6, { seed: i + 20 }); }
  const g = seg(t, 23.95, 24.1) * (1 - seg(t, 24.3, 24.6)); if (g > 0) sparkle(1015, 360, 80 * g + 10);
  c.restore(); vignette(.5);
};
SH.slump = (lt, t) => {
  const z = 1 - .12 * lt / 3, lq = q(lt, 8), drop_ = ss(lq / .6);
  c.save(); cam(z, 960, 560);
  kitchen({ dusk: 1 }); c.fillStyle = 'rgba(28,30,70,.62)'; c.fillRect(-300, -300, W + 600, H + 600);
  const y = 560 + drop_ * 40;
  bust(960, y, .8, { lit: -0 }); haruHead(960, y + 30 * drop_, .8, { eye: { open: .3, anger: -.8, look: [0, 16] }, brow: -.9, mouth: 'wobble', tilt: .14 * drop_, gloom: .9, sweat: 2, sweatDrop: ss((lq - .5) / 1.5), shade: .12 });
  for (let i = 0; i < 12; i++) { const h = j => hash(i * 4.1 + j); c.fillStyle = 'rgba(255,240,210,.5)'; const yy = ((lt * 28 + h(1) * 1000) % 1100); c.beginPath(); c.arc(h(2) * 1920, yy, 3 + h(3) * 4, 0, 7); c.fill(); }
  c.restore(); vignette(.7);
};
SH.flash = (lt, t) => {
  const open = ss(lt / .35), wipe = seg(t, 33.45, 33.95);
  fill('#000');
  const gx = 1240, gx2 = 1000;
  // left panel: grandma
  c.save(); poly([[-40, -20], [gx, -20], [gx2, 1100], [-40, 1100]]); c.clip(); c.save(); zoomAt(1 + .04 * lt / 6, 520, 540);
  grad('#fff0cc', '#ffd9a0'); c.beginPath(); c.rect(-300, -300, 2600, 1800); tone(22, 3.4, 'rgba(255,170,90,.45)'); radial(520, 540, 200, 900, 'rgba(255,255,255,0)', 'rgba(255,190,120,.45)');
  c.fillStyle = '#c99a6c'; c.fillRect(-300, 820, 1700, 500); ink([[-300, 820], [1500, 820]], 8);
  jar(520, 820 - 243 * .95, .95, { mood: -1, lidUp: 5 * ss((t - 30.7) / .15) * (1 - ss((t - 32.0) / .5)) + jit(910, 1.2 * (t > 30.7 && t < 32 ? 1 : 0)) });
  // the tap: the spoon comes down to the rim at 29.2 and 29.9
  const taps = [29.2, 29.9, 30.6]; let dist = 140;
  for (const tt of taps) { const d = t - tt; if (d > -.35 && d < .25) dist = Math.min(dist, d < 0 ? lerp(0, 140, ss(-d / .35)) : lerp(0, 140, ss(d / .25))); }
  if (t < 28.6) dist = 140 + 300 * (1 - ss((t - 28.0) / .6));
  if (t > 31.0) dist = Math.max(dist, lerp(140, 640, ss((t - 31.0) / 1.3)));
  const rimX = 520 + 150 * .95, rimY = 820 - 243 * .95 - 262 * .95 - 52 * .95 + 12;
  spoon(rimX + 250 + dist * .4, rimY - 200 - dist * .5, rimX, rimY - dist * .3 - 8, { w: 34, bowl: 1.2 });
  for (const tt of taps) { const d = t - tt; if (d > 0 && d < .4) { c.globalAlpha = 1 - d / .4; for (let i = 0; i < 2; i++) { c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.arc(rimX, rimY, 26 + d * 160 + i * 30, -2.4, -.7); c.stroke(); } c.globalAlpha = 1; } }
  for (const w0 of [30.7, 31.5]) if (t > w0) { const d = t - w0; c.globalAlpha = clamp(d / .1) * (1 - ss((d - .7) / .4)); for (let i = 0; i < 3; i++) { const bx = 470 + i * 70; ink([[bx, 340 - d * 40], [bx - 20, 300 - d * 60], [bx + 12, 260 - d * 70], [bx - 8, 220 - d * 80]], 6, { col: '#fff', id: 520 + i }); } c.globalAlpha = 1; }
  c.restore(); c.restore();
  // right panel: Haru remembers
  c.save(); poly([[gx + 30, -20], [W + 40, -20], [W + 40, 1100], [gx2 + 30, 1100]]); c.clip(); c.save(); zoomAt(1 + .05 * lt / 6, 1500, 540);
  grad('#dce8ff', '#b9ccf5'); c.beginPath(); c.rect(-300, -300, 2600, 1800); tone(20, 3, 'rgba(90,110,200,.35)');
  const op = ss((q(lt, 8) - 1.2) / 1.8);
  haruHead(1500, 520, 2.1, { eye: { open: lerp(.35, .95, op), anger: lerp(-.8, -.1, op), iris: 1, look: [0, 4], glint: seg(t, 32.0, 32.2) * (1 - seg(t, 32.4, 32.7)) }, brow: lerp(-.8, -.2, op), mouth: t > 32.3 ? 'smirk' : 'line', gloom: lerp(.6, 0, op), shade: 0 });
  c.restore(); c.restore();
  shape([[gx - 18, -20], [gx + 48, -20], [gx2 + 48, 1100], [gx2 - 18, 1100]], { fill: '#fff', lw: 8, smooth: false, id: 530 });
  if (open < 1) { c.fillStyle = `rgba(0,0,0,${1 - open})`; c.fillRect(0, 0, W, H); }
  if (wipe > 0) { c.fillStyle = INK; poly([[-40 + 2100 * wipe - 2100, -20], [2100 * wipe, -20], [2100 * wipe - 340, 1100], [-40 + 2100 * wipe - 2100, 1100]]); c.fill(); poly([[2100 * wipe - 30, -20], [2100 * wipe + 10, -20], [2100 * wipe - 330, 1100], [2100 * wipe - 370, 1100]]); c.fillStyle = P.teal; c.fill(); }
};
function stanceCharge(lt, t, z) {
  const g = clamp(lt / 4.5), a = lerp(.12, .75, ss(g)), lift = ss(g);
  c.save(); cam(z, 960, 600); const [sx, sy] = shakeAt(t); c.translate(sx, sy);
  grad('#070d2e', '#0a3a52'); radial(960, 620, 60, 1100, `rgba(31,231,210,${.15 + .3 * g})`, 'rgba(0,0,0,0)');
  speedLines({ ang: -Math.PI / 2, n: 50, col: 'rgba(160,255,245,.55)', seed: 8, len0: 200, len1: 800, w1: 5, cx: 960, cy: 540 });
  c.fillStyle = '#5f7ba0'; c.fillRect(-300, 1000, W + 600, 400); ink([[-300, 1000], [W + 300, 1000]], 8);
  cracks(960, 1050, ss(g * 1.2), { len: 1100, k: .3, seed: 11, n: 10, lw: 11, a0: -.05 * Math.PI, a1: 1.05 * Math.PI, hi: '#bff' });
  aura(960, 1090, 330 + 160 * a, 600 + 560 * a, a + .08 * Math.sin(t * 12), teal, { t, seed: 9, up: 1.1 });
  haruStance(960, 290, .68, { lit: .2 * g, stride: 230, tremble: 2, head: { eye: { open: 0 }, brow: .6, mouth: 'line', lift: lift * .9, wind: 1, lit: .2 * g } });
  debris(t, 34.4, { n: 16, mode: 'float', y0: 1010, spread: 1000, up: 1 });
  dustRing(t, 34.2, 960, 1050, 700, { n: 6, r0: 70 });
  c.restore();
}
SH.charge = (lt, t) => { stanceCharge(lt, t, 0.9 + .22 * ss(lt / 4.5)); vignette(.5); };
SH.fist = (lt, t) => {
  const g = ss(lt / 1.5), k = seg(lt, 1.35, 1.6);
  c.save(); cam(1 + .06 * lt / 2.5, 960, 540); const [sx, sy] = shakeAt(t); c.translate(sx, sy);
  grad('#050a28', '#0b4560'); radial(960, 700, 100, 1000, 'rgba(31,231,210,.35)', 'rgba(0,0,0,0)');
  speedLines({ ang: -Math.PI / 2, n: 70, col: 'rgba(170,255,246,.6)', seed: 9, len0: 300, len1: 1000, w1: 6 });
  aura(960, 1080, 460, 760, .6 + .1 * Math.sin(t * 12), teal, { t, seed: 10, up: 1 });
  const fx = 960, fy = 780;
  const fall = ei(clamp(k)); const sx0 = lerp(1560, fx, fall), sy0 = lerp(320, fy, fall), ex = lerp(1430, fx, fall), ey = lerp(1000, fy + 120, fall);
  const bob = (1 - fall) * Math.sin(lt * 3) * 20;
  const hx = k < 1 ? ex : fx, hy2 = k < 1 ? ey : fy + 120;
  const tipx = k < 1 ? lerp(1700, fx, fall) : fx, tipy = k < 1 ? lerp(150 + bob, 190, fall) : 190;
  spoon(hx, hy2, tipx, tipy, { w: 40, hand: false, bowl: 1.6 });
  fist(fx, fy, 2.7, { shake: 2 + g * 6, flip: 1 });
  c.restore(); vignette(.45);
};
SH.lids = (lt, t) => {
  const open = seg(lt, 2.72, 2.76), zoom = 1 + .16 * lt / 3, sh = shakeAt(t);
  c.save(); cam(zoom, 960, 560); c.translate(sh[0], sh[1]);
  grad('#050a28', '#0b4560'); focusLines(960, 560, { n: 90, rIn: 420, rOut: 1900, col: 'rgba(120,255,240,.3)', seed: 12, wmax: .01 });
  aura(960, 1250, 600, 900, .8 + .1 * Math.sin(t * 12), teal, { t, seed: 12, up: .8 });
  haruHead(960, 640, 3.0, { eye: open > 0 ? { open: 1, anger: .8, iris: .55, pupil: .5, glint: 1 } : { open: 0 }, brow: .9, mouth: 'grit', lift: 1, wind: 1, lit: .18, vein: 0 });
  c.restore();
  if (open > 0 && lt < 2.84) { c.fillStyle = `rgba(255,255,255,${.8 * (1 - (lt - 2.72) / .12)})`; c.fillRect(0, 0, W, H); }
  vignette(.55);
};
// the strike: three frames
const JX = 860, JY = 650, CPX = 1020, CPY = 372;
function swingFrame(f, o = {}) {
  fill('#0a0816');
  const hx = [1480, 1330, 1250][f], hy = [150, 200, 110][f];
  c.save();
  focusLines(CPX, CPY, { n: 120, rIn: 120, rOut: 1900, col: f === 2 ? '#fff' : 'rgba(255,255,255,.8)', seed: 14 + f, wmax: .02 });
  jar(JX, JY, 1.0, { mood: 1 });
  if (f === 0) spoon(1500, 330, 1500, 60, { w: 36, hand: false, bowl: 1.3 }), fist(1500, 360, 1.2, { flip: -1 });
  if (f === 1) { for (let i = 0; i < 5; i++) { c.globalAlpha = .12 + i * .1; const a = lerp(0, 1, i / 4); spoon(1500 - 180 * a, 360 - 60 * a, lerp(1500, CPX + 60, a), lerp(60, CPY - 20, a), { w: 34, hand: false, bowl: 1.3 }); } c.globalAlpha = 1; taper([[1550, 40], [1400, 120], [1200, 260], [1040, 360]], 120, 18, 'rgba(255,255,255,.9)', { id: 540 }); fist(1380, 360, 1.2, { flip: -1 }); }
  if (f === 2) { spoon(1280, 150, CPX + 10, CPY, { w: 36, hand: false, bowl: 1.3 }); fist(1250, 170, 1.2, { flip: -1 }); }
  c.restore();
}
SH.swing = (lt, t) => { swingFrame(Math.min(2, Math.floor(lt * 24 + 1e-6))); };
SH.hush = (lt, t) => {
  if (lt < .084) { swingFrame(2); burst(CPX, CPY, 160, 430, 16, { fill: '#fff', lw: 12, seed: 7 }); focusLines(CPX, CPY, { n: 140, rIn: 90, rOut: 1900, col: INK, seed: 21, wmax: .03 }); return; }
  const hl = lt - .084;
  const sh = shakeAt(t); c.save(); cam(1.18 + .04 * hl / 1.8, 960, 520); c.translate(sh[0], sh[1]);
  kitchen({ dusk: 1 }); c.fillStyle = 'rgba(14,14,50,.55)'; c.fillRect(-300, -300, W + 600, H + 600);
  const lift = 3 * seg(t, 45.3, 46.0) + jit(900, 1.2 * seg(t, 45.3, 46.0));
  jar(JX, JY, 1.0, { mood: 1, lidUp: lift });
  // the spoon stays at the rim, the hand trembles
  spoon(1330, 210, CPX + 10, CPY, { w: 36, hand: false, bowl: 1.3 }); fist(1300, 200, 1.2, { flip: -1, shake: .8 });
  const rp = clamp((t - 44.2) / .8); for (let i = 0; i < 3; i++) { const rr = (rp - i * .2); if (rr > 0 && rr < 1) { c.globalAlpha = (1 - rr) * .8; c.strokeStyle = '#fff'; c.lineWidth = 5; c.beginPath(); c.ellipse(CPX, CPY + 4, 30 + rr * 150, 14 + rr * 50, 0, 0, 7); c.stroke(); } } c.globalAlpha = 1;
  if (t > 45.3) { const d = (t - 45.3); c.globalAlpha = clamp(d / .15) * (1 - ss((d - .55) / .15)) ; for (let i = 0; i < 4; i++) { const bx = JX - 120 + i * 100, up = d * 120; ink([[bx, 372 - 10], [bx - 18, 340 - up * .4], [bx + 14, 300 - up * .7], [bx - 6, 262 - up]], 5, { col: '#fff', id: 560 + i }); } c.globalAlpha = 1; }
  c.restore(); vignette(.6);
  lettering('tink', 'tink', 640, 250, 150, { t, t0: 44.3, rot: .06, fl: '#dff6ff', shadow: P.vio, shake: .5, sp: 4, pop: .08 });
};
SH.pop = (lt, t) => {
  const sh = shakeAt(t), pan = 1 - ss(lt / 0.9);
  c.save(); cam(1.0, 960, 540 - 130 * Math.sin(Math.PI * clamp(lt / 1.1))); c.translate(sh[0], sh[1]);
  kitchen({ dusk: 0.6 });
  radial(JX, 450, 100, 900, 'rgba(255,240,170,.55)', 'rgba(255,240,170,0)');
  focusLines(JX, 400, { n: 100, rIn: 340, rOut: 1700, col: 'rgba(255,255,255,.5)', seed: 30, wmax: .012 });
  // the violet aura shatters into shards that fly away
  for (let i = 0; i < 12; i++) { const h = j => hash(i * 3.7 + j), a = h(1) * 6.28, d = lt * (300 + h(2) * 700); c.save(); c.globalAlpha = 1 - ss(lt / .9); c.translate(JX + Math.cos(a) * (120 + d), 560 + Math.sin(a) * (120 + d) * .8); c.rotate(a + lt * 5); shape([[0, -50], [20, 0], [0, 50], [-20, 0]], { fill: i % 2 ? P.vioLt : P.vio, lw: 4, smooth: false, id: i }); c.restore(); }
  const dt = lt, up = 1900 * (1 - Math.pow(1 - Math.min(dt / .42, 1), 2));
  jar(JX, JY, 1.0, { mood: -1, lidUp: up, lidRot: dt * 7, noLid: false });
  if (lt < .5) for (let i = 0; i < 14; i++) { const h = j => hash(i * 2.9 + j + 3); const d = lt; c.fillStyle = P.brine; c.beginPath(); c.arc(JX + (h(1) - .5) * 300 + (h(2) - .5) * 600 * d, 360 - d * (500 + h(3) * 700) + 2200 * d * d, 8 + h(4) * 8, 0, 7); c.fill(); }
  for (let i = 0; i < 8; i++) { const h = j => hash(i * 5.3 + j); const d = lt - h(1) * .3; if (d > 0) sparkle(JX - 260 + h(2) * 520, 330 + h(3) * 300 - d * 80, 18 + h(4) * 30, d * 3, '#fff7b0'); }
  c.restore();
  const ins = ss((lt - .45) / .12);
  if (ins > 0) {
    c.save(); poly([[40, 470], [580, 440], [560, 900], [60, 930]]); c.clip(); grad('#fff4cf', '#ffe3a2'); c.beginPath(); c.rect(-300, -300, 2600, 1800); tone(20, 3, 'rgba(255,170,90,.45)');
    focusLines(310, 690, { n: 70, rIn: 150, rOut: 600, col: '#fff', seed: 33, wmax: .02 });
    haruHead(300, 700, 1.15, { eye: { open: 1, anger: -.3, iris: .6, pupil: .55, glint: 1 }, brow: -.3, mouth: 'o', tilt: .05 });
    c.restore(); c.strokeStyle = '#fff'; c.lineWidth = 12; c.beginPath(); c.moveTo(40, 470); c.lineTo(580, 440); c.lineTo(560, 900); c.lineTo(60, 930); c.closePath(); c.stroke(); c.strokeStyle = INK; c.lineWidth = 5; c.stroke();
  }
  burst(1180, 260, 250, 400, 14, { fill: '#ffe14a', lw: 11, seed: 5, rot: lt * .2 });
  if (t < 46.12) lettering('tink', 'tink', 640, 250, 150, { t, t0: 44.3, rot: .06, fl: '#dff6ff', shadow: P.vio, shake: .5, sp: 4, pop: .08 });
  lettering('pop', 'POP', 1180, 340, 360, { t, t0: 46.0, rot: -.07, fl: '#fff', shadow: P.vioHot, shake: lt < .5 ? 8 : 1.5 });
};
function lidTumble(x, y, s, ang) {
  const sn = Math.sin(ang), cs = Math.cos(ang), face = Math.abs(sn), side = Math.abs(cs);
  c.save(); c.translate(x, y); c.scale(s, s);
  const th = 70 * side;
  shape([[-196, 0], [-196, th], [-170, th + 26 * face], [170, th + 26 * face], [196, th], [196, 0]], { fill: P.lidSh, lw: 9, id: 600, smooth: false });
  shape(Array.from({ length: 14 }, (_, i) => [Math.cos(i / 14 * 6.283) * 200, Math.sin(i / 14 * 6.283) * (26 + 170 * face)]), { fill: P.lid, lw: 9, id: 601 });
  c.save(); c.beginPath(); c.ellipse(0, 0, 150, (26 + 170 * face) * .76, 0, 0, 7); c.strokeStyle = P.lidSh; c.lineWidth = 8; c.stroke(); c.fillStyle = mix(P.lid, '#fff', .35); c.beginPath(); c.ellipse(-30, -10 * face, 90, (26 + 170 * face) * .3, 0, 0, 7); c.fill(); c.restore();
  c.restore();
}
SH.fall = (lt, t) => {
  const gx = 1280, gx2 = 1040; fill('#000');
  c.save(); poly([[-40, -20], [gx, -20], [gx2, 1100], [-40, 1100]]); c.clip();
  grad('#fff4cf', '#ffe3a2'); c.save(); c.beginPath(); c.rect(-300, -300, 2600, 1800); tone(24, 3.6, 'rgba(255,190,90,.5)'); c.restore();
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + lt * .05; c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(560, 420); c.lineTo(560 + Math.cos(a) * 1600, 420 + Math.sin(a) * 1600); c.lineTo(560 + Math.cos(a + .1) * 1600, 420 + Math.sin(a + .1) * 1600); c.fill(); }
  c.fillStyle = '#c99a6c'; c.fillRect(-300, 840, 1700, 400); ink([[-300, 840], [1500, 840]], 8);
  const k = clamp(lt / 2.2), y = lerp(-160, 770, k * k * (3 - 2 * k) * .5 + k * .5), x = lerp(340, 700, k), ang = 0.4 + lt * 3.2 * (1 - .0);
  const wob = lt > 2.2 ? Math.exp(-(lt - 2.2) * 1.8) * Math.cos((lt - 2.2) * 22) : 0;
  if (lt < 2.2) lidTumble(x, y, 1.0, ang); else lidTumble(x, 770 + 4 * Math.abs(wob), 1.0, Math.PI / 2 + wob * .5);
  for (let i = 0; i < 12; i++) { const h = j => hash(i * 4.4 + j); sparkle(100 + h(1) * 1000, 100 + ((h(2) * 900 + lt * 60 * (1 + h(3))) % 760), 14 + h(4) * 22, lt * 2 + i, '#fff3a8'); }
  c.restore();
  c.save(); poly([[gx + 30, -20], [W + 40, -20], [W + 40, 1100], [gx2 + 30, 1100]]); c.clip();
  grad('#ffe9d0', '#ffc7a0'); c.save(); c.beginPath(); c.rect(-300, -300, 2600, 1800); tone(22, 3.2, 'rgba(255,120,120,.28)'); c.restore();
  const ph = seg(lt, 1.2, 2.0);
  haruHead(1540, 560, 2.1, { eye: { open: 1, anger: lerp(-.2, -.7, ph), iris: lerp(.55, 1.05, ph), pupil: lerp(.55, 1, ph), glint: lt < 1.2 ? 1 : lerp(.6, 0, ph) }, brow: lerp(-.5, -.1, ph), mouth: lt < 1.0 ? 'o' : 'smile', blush: ph * .9, tilt: .05 });
  c.restore();
  shape([[gx - 18, -20], [gx + 48, -20], [gx2 + 48, 1100], [gx2 - 18, 1100]], { fill: '#fff', lw: 8, smooth: false, id: 610 });
};
SH.smile = (lt, t) => {
  const z = 1 + .06 * lt / 1.6;
  c.save(); cam(z, 960, 540);
  grad('#ffd59a', '#ff9f7a'); radial(900, 480, 60, 1200, 'rgba(255,248,200,.85)', 'rgba(255,200,140,0)');
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283 + lt * .08; c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.moveTo(780, 440); c.lineTo(780 + Math.cos(a) * 1800, 440 + Math.sin(a) * 1800); c.lineTo(780 + Math.cos(a + .12) * 1800, 440 + Math.sin(a + .12) * 1800); c.fill(); }
  tube([[840, 720], [1000, 800]], [140, 108], { fill: P.tee, lw: 8, id: 651 });
  bust(700, 520, .95, { bottom: 1000 });
  haruHead(700, 500, .95, { eye: { open: 0 }, mouth: 'smile', blush: .9, tilt: -.06, wind: 1, lift: .15 });
  tube([[990, 800], [1070, 800], [1140, 790]], [100, 88, 80], { fill: P.skin, lw: 8, id: 650, shade: P.skinSh, shadeSide: 1 });
  jar(1330, 700, .72, { mood: -1, noLid: true });
  fist(1140, 790, .9, { rot: .2 });
  for (let i = 0; i < 14; i++) { const h = j => hash(i * 6.1 + j); sparkle(h(1) * 1900, 80 + ((h(2) * 900 + lt * 50) % 900), 12 + h(3) * 26, lt * 2 + i, '#fff'); }
  c.restore();
};
SH.floor = (lt, t) => {
  const push = ss((t - 53.7) / 2.8), z = 1 + .95 * push, cy = lerp(560, 650, push);
  c.save(); cam(z, 960, cy);
  kitchen({ dusk: .3 });
  cracks(960, 880, 1, { len: 1900, k: .55, seed: 15, n: 16, lw: 10, a0: .0, a1: Math.PI, hi: null, floor: true });
  cracks(960, 880, 1, { len: 900, k: .55, seed: 16, n: 8, lw: 10, a0: .0, a1: Math.PI, hi: null, floor: true });
  for (let i = 0; i < 12; i++) { const h = j => hash(i * 2.2 + j + 50); chunk(300 + h(1) * 1300, 860 + h(2) * 180, 18 + h(3) * 28, h(4) * 6, { seed: i + 40 }); }
  const tq = q(t, 8), stiff = seg(tq, 53.9, 54.2), gl = seg(tq, 54.4, 54.9);
  const hh = stiff > 0 ? { eye: { open: .7, iris: .55, pupil: .45, anger: -.4, look: [0, 0] }, mouth: 'wobble', brow: -.8, gloom: gl, sweat: 2, sweatDrop: ss((tq - 54.8) / 2.0), blush: 0 } : { eye: { open: 0 }, mouth: 'smile', blush: .8, brow: 0, lift: 0 };
  haruStance(960, 525, .42, { stride: 190, fistLift: 1, head: hh });
  jar(1090 + 12, 700 - 135 * .26 - 20, .26, { mood: -1, noLid: true });
  c.restore(); vignette(.3);
  lettering('gulp', 'GULP', 1330, 330, 170, { t, t0: 55.5, rot: .06, shake: lt < 3.6 ? 3 : 0.5, fl: '#fff', shadow: P.vio });
};
SH.end = (lt, t) => {
  eyesStrip(lt + 1, t, { y0: 330, y1: 700, eyeO: { open: .62, anger: .55, iris: 1, look: [26, 0], reflect: 1, glint: seg(lt, .2, .5) * (1 - seg(lt, .5, .8)) }, head: { brow: .7, mouth: 'line' } });
  // letterbox closing in
  const bars = ss((t - 59.4) / .5) * 330;
  c.fillStyle = '#000'; c.fillRect(0, 0, W, bars); c.fillRect(0, H - bars, W, bars);
  const k = t - 57.3;
  if (k > 0) {
    const sl = 1 - eo(k / .25);
    c.save(); c.translate(960 + sl * 700, 900);
    c.font = '96px Anton'; c.letterSpacing = '6px'; const w = c.measureText('TO BE CONTINUED').width; c.letterSpacing = '0px';
    shape([[-w / 2 - 60, -90], [w / 2 + 130, -100], [w / 2 + 100, 36], [-w / 2 - 90, 30]], { fill: INK, lw: 0, smooth: false, id: 700 });
    shape([[-w / 2 - 60, -90], [w / 2 + 130, -100], [w / 2 + 128, -84], [-w / 2 - 60, -76]], { fill: P.vioHot, lw: 0, smooth: false, id: 701 });
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.letterSpacing = '6px'; c.fillText('TO BE CONTINUED', -10, 0); c.letterSpacing = '0px';
    shape([[w / 2 + 20, -60], [w / 2 + 84, -30], [w / 2 + 20, 0]], { fill: P.vioHot, lw: 0, smooth: false, id: 702 });
    reg('tbc', 'TO BE CONTINUED', -w / 2 - 10, -80, w / 2 - 10, 14); c.restore();
  }
};

// ---------------------------------------------------------------- the frame
export function shotAt(t) { return SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1]; }
export function frame(t) {
  TX.length = 0;
  S.boil = Math.floor(t * 12 + 1e-6);
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
  const sh = shotAt(t), lt = t - sh.t0;
  c.save();
  const [sx, sy, sr] = ['stance', 'cut', 'charge', 'fist', 'lids', 'hush', 'pop'].includes(sh.id) ? [0, 0, 0] : shakeAt(t);
  if (sh.id !== 'face' && sh.id !== 'flash') c.translate(sx, sy);
  SH[sh.id](lt, t);
  c.restore();
  hud(t);
  captions(t);
  if (t >= DUR - .12) { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }
}
export const IMPACT = t => (t >= 44.125 && t < 44.2085) ? (t < 44.1667 ? 'inv' : 'thr') : null;
