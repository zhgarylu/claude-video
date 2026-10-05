// "Nothing Moves": a phenakistoscope disc and a zoetrope drum, drawn entirely in code. t = film seconds (timeline.js).
// The stroboscopic effect is computed, not faked: the mirror shows a leaky integral of the slit flashes (engine/eye.js),
// the drum is the mean of sub-frames over one slit pitch (engine/drum.js), the camera is a real 24 fps shutter.
import { track, clamp, lerp, ss, eio, eo, ei, mulberry, hash, vnoise, TAU } from '/core/lib.js';
import { T, DUR, EV, SPEED, theta, VO } from './timeline.js';
import { C, rad } from './engine/ink.js';
import { makeTiles } from './engine/art.js';
import { R, SLOT, ROMAN, polar, paperCanvas, tableCanvas, buildDisc, shadowDisc, makeCards, brassGrad, drawHub } from './engine/world.js';
import { eyeAt } from './engine/eye.js';
import { drawDrum, drawBase, drawRimFar, P, RS, RO, YT } from './engine/drum.js';

const cv = document.getElementById('c'), g = cv.getContext('2d'), W = 1920, H = 1080;
const Q = new URLSearchParams(location.search), NOSUB = Q.get('nosub') === '1';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const rt = (t, a, b) => clamp((t - a) / (b - a));

// ---------------------------------------------------------------- layout (world px)
const DISC = { x: -470, y: -20 }, MIR = { x: 470, y: -20, rx: 262, ry: 296 }, THUMB = { x: 470, y: 322 }, DIAL = { x: 842, y: -352, r: 84 };
const DRUM = { x: 900, y: 120 };
const THETA_STOP = () => theta(T.stopDisc);

// ---------------------------------------------------------------- camera
const CAM = track([
  [0, [DISC.x, 56, 1.0, 0]], [7.5, [DISC.x, 50, 1.1, 0]], [8.4, [DISC.x - 20, 40, 1.1, 0]], [10.2, [-10, 20, 1.0, 0]], [16.3, [0, 20, 1.03, 0]],
  [17.0, [250, 60, 1.2, 0]], [18.7, [290, 60, 1.22, 0]], [19.8, [10, 20, 1.0, 0]], [21.6, [30, 20, 1.04, 0]], [22.8, [190, 50, 1.15, 0]], [24.2, [190, 50, 1.15, 0]],
  [25.9, [DISC.x, DISC.y, 1.48, 0]], [29.0, [DISC.x, DISC.y, 1.6, -2]], [33.5, [DISC.x, DISC.y, 1.7, -5]], [33.9, [DISC.x, DISC.y, 1.7, -5]],
  [34.8, [DISC.x + 160, DISC.y, 1.2, 0]], [36.0, [DRUM.x, DRUM.y - 95, 0.8, 0]], [37.1, [DRUM.x, DRUM.y - 95, 0.8, 0]], [38.6, [DRUM.x, -30, 1.0, 0]], [41.0, [DRUM.x, -40, 1.3, 0]],
  [45.4, [DRUM.x, -50, 1.5, 0]], [47.5, [DRUM.x, -50, 1.55, 0]], [48.4, [DRUM.x, -50, 1.55, 0]], [51.0, [250, -30, 0.84, 0]], [DUR, [250, -30, 0.84, 0]],
]);
function camAt(t) { const [cx, cy, s, r] = CAM(clamp(t, 0, DUR)); return { cx, cy, s, r }; }
const toScreen = (cam, x, y) => { const a = rad(cam.r), dx = x - cam.cx, dy = y - cam.cy; return [W / 2 + cam.s * (dx * Math.cos(a) - dy * Math.sin(a)), H / 2 + cam.s * (dx * Math.sin(a) + dy * Math.cos(a))]; };
function setCam(c, cam) { c.setTransform(1, 0, 0, 1, 0, 0); c.translate(W / 2, H / 2); c.rotate(rad(cam.r)); c.scale(cam.s, cam.s); c.translate(-cam.cx, -cam.cy); }

// ---------------------------------------------------------------- assets
let BIRD, WALK, BIRDC, WALKC, DISC_A, DISC_B, SHADOW, TABLE_PAT, CAPS = [], TMP, BG, MIRFOX;
const lampX = 560, lampY = 300;

function drawTable(c) {
  c.save(); c.fillStyle = TABLE_PAT; c.fillRect(-5000, -5000, 10000, 10000); c.restore();
}

// ---------------------------------------------------------------- tags (paper labels lying on the table)
const TAGS = [
  { id: 'g1', t0: 0.9, t1: 7.4, x: -760, y: -400, rot: -1.5, text: 'Fig. I.  The disc, at rest.' },
  { id: 'g2', t0: 9.6, t1: 17.0, x: -120, y: 270, rot: 1.5, text: 'Fig. II.  Disc, slit and mirror.' },
  { id: 'g4', t0: 39.6, t1: 47.0, x: 470, y: -330, rot: 1.0, text: 'Fig. III.  The ring, bent into a drum.' },
  { id: 'g5', t0: 49.2, t1: 53.4, x: 430, y: 250, rot: -0.8, text: 'Fig. IV.  At rest.' },
];
function drawTag(c, tg, a) {
  c.save(); c.translate(tg.x, tg.y); c.rotate(rad(tg.rot)); c.globalAlpha = a;
  c.font = 'italic 400 26px "IM Fell English"'; const w = c.measureText(tg.text).width + 44, h = 48;
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 8; c.shadowOffsetX = 3; c.shadowOffsetY = 5; c.fillStyle = C.cream; c.beginPath(); c.moveTo(-w / 2, -h / 2); c.lineTo(w / 2 - 14, -h / 2); c.lineTo(w / 2, -h / 2 + 14); c.lineTo(w / 2, h / 2); c.lineTo(-w / 2, h / 2); c.closePath(); c.fill();
  c.shadowColor = 'transparent'; c.fillStyle = 'rgba(150,100,40,0.18)'; c.fillRect(-w / 2, -h / 2, w, h);
  c.strokeStyle = 'rgba(36,21,9,0.7)'; c.lineWidth = 1; c.strokeRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
  c.fillStyle = C.ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(tg.text, 0, 2);
  c.restore();
}
const tagAlpha = (tg, t) => Math.min(rt(t, tg.t0, tg.t0 + 0.4), 1 - rt(t, tg.t1 - 0.4, tg.t1));

// ---------------------------------------------------------------- the mirror group
function ellipsePath(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); }
function drawMirror(c, t, eye, ox) {
  const { x, y, rx, ry } = MIR, X = x + ox;
  c.save();
  // shadow on the table
  c.fillStyle = 'rgba(0,0,0,0.5)'; c.filter = 'blur(14px)'; ellipsePath(c, X + 16, y + 22, rx + 30, ry + 30); c.fill(); c.filter = 'none';
  // brass frame
  const fr = brassGrad(c, X - rx, y - ry, X + rx, y + ry);
  ellipsePath(c, X, y, rx + 34, ry + 34); c.fillStyle = fr; c.fill();
  ellipsePath(c, X, y, rx + 34, ry + 34); c.strokeStyle = 'rgba(30,16,4,0.8)'; c.lineWidth = 2; c.stroke();
  ellipsePath(c, X, y, rx + 20, ry + 20); c.strokeStyle = 'rgba(40,24,6,0.6)'; c.lineWidth = 2; c.stroke();
  for (let i = 0; i < 72; i++) { const a = i / 72 * TAU; c.fillStyle = i % 2 ? C.brassHi : C.brassLo; c.beginPath(); c.arc(X + (rx + 27) * Math.cos(a), y + (ry + 27) * Math.sin(a), 3.4, 0, TAU); c.fill(); }
  ellipsePath(c, X, y, rx + 8, ry + 8); c.fillStyle = C.brassLo; c.fill();
  // glass
  c.save(); ellipsePath(c, X, y, rx, ry); c.clip();
  const lit = eye.B, base = [lerp(18, 238, lit), lerp(11, 226, lit), lerp(7, 190, lit)];
  c.fillStyle = `rgb(${base[0] | 0},${base[1] | 0},${base[2] | 0})`; c.fillRect(X - rx, y - ry, 2 * rx, 2 * ry);
  const S = 2 * rx * 1.0;
  for (let k = 0; k < 12; k++) { const a = eye.w[k]; if (a < 0.015) continue; c.globalAlpha = Math.min(1, a * 1.35); c.drawImage(BIRD[k], X - S / 2, y - S / 2 + 4, S, S); }
  c.globalAlpha = 1;
  const vg = c.createRadialGradient(X, y, ry * 0.5, X, y, ry * 1.05); vg.addColorStop(0, 'rgba(60,30,8,0)'); vg.addColorStop(1, 'rgba(40,20,5,0.55)'); c.fillStyle = vg; c.fillRect(X - rx, y - ry, 2 * rx, 2 * ry);
  c.drawImage(MIRFOX, X - rx, y - ry, 2 * rx, 2 * ry);
  c.globalAlpha = 0.10 + 0.08 * lit; c.fillStyle = '#fff3d0'; c.beginPath(); c.moveTo(X - rx * 0.9, y - ry * 0.2); c.lineTo(X - rx * 0.35, y - ry * 0.95); c.lineTo(X - rx * 0.15, y - ry * 0.95); c.lineTo(X - rx * 0.7, y + ry * 0.1); c.closePath(); c.fill();
  c.restore();
  ellipsePath(c, X, y, rx, ry); c.strokeStyle = 'rgba(20,10,2,0.85)'; c.lineWidth = 3; c.stroke();
  c.restore();
}
function drawThumbs(c, eye, ox) {
  const { x, y } = THUMB, X = x + ox, n = 12, pitch = 60, w = 50;
  c.save();
  c.fillStyle = 'rgba(0,0,0,0.45)'; c.filter = 'blur(6px)'; c.fillRect(X - n * pitch / 2 + 6, y - 22, n * pitch, 62); c.filter = 'none';
  c.fillStyle = brassGrad(c, X, y - 34, X, y + 38); c.fillRect(X - n * pitch / 2 - 6, y - 34, n * pitch + 12, 72);
  c.strokeStyle = 'rgba(30,16,4,0.8)'; c.lineWidth = 1.5; c.strokeRect(X - n * pitch / 2 - 6, y - 34, n * pitch + 12, 72);
  for (let k = 0; k < n; k++) {
    const cx = X - n * pitch / 2 + pitch * (k + 0.5), a = eye.w[k];
    c.fillStyle = '#1b1008'; c.fillRect(cx - w / 2 - 2, y - 28, w + 4, 56);
    c.drawImage(BIRDC[k], cx - w / 2, y - 26, w, w);
    c.fillStyle = `rgba(255,214,120,${0.7 * a})`; c.fillRect(cx - w / 2, y - 26, w, w);
    c.strokeStyle = `rgba(255,${200 + 40 * a | 0},110,${0.15 + 0.85 * a})`; c.lineWidth = 2.5; c.strokeRect(cx - w / 2 - 1, y - 27, w + 2, w + 2);
    c.fillStyle = a > 0.3 ? '#fff0b8' : C.ink; c.font = '600 11px "IM Fell English"'; c.textAlign = 'center'; c.fillText(ROMAN[k], cx, y + 33);
  }
  c.restore();
}
function drawDial(c, speed, ox) {
  const { x, y, r } = DIAL, X = x + ox;
  c.save(); c.translate(X, y);
  c.fillStyle = 'rgba(0,0,0,0.5)'; c.filter = 'blur(8px)'; c.beginPath(); c.arc(8, 12, r + 8, 0, TAU); c.fill(); c.filter = 'none';
  c.fillStyle = brassGrad(c, -r, -r, r, r); c.beginPath(); c.arc(0, 0, r + 10, 0, TAU); c.fill(); c.strokeStyle = 'rgba(30,16,4,0.8)'; c.lineWidth = 1.5; c.stroke();
  c.fillStyle = C.cream; c.beginPath(); c.arc(0, 0, r - 4, 0, TAU); c.fill();
  c.fillStyle = 'rgba(150,100,40,0.22)'; c.fill();
  c.strokeStyle = C.ink;
  const ang = v => rad(clamp(v, -3.2, 3.2) / 3 * 120);                // 0 at the top, +-3 rev/s = +-120 degrees
  for (let v = -3; v <= 3.001; v += 0.5) { const a = ang(v), big = Math.abs(v % 1) < 0.01; c.lineWidth = big ? 2 : 1; c.beginPath(); c.moveTo(Math.sin(a) * (r - 8), -Math.cos(a) * (r - 8)); c.lineTo(Math.sin(a) * (r - (big ? 22 : 15)), -Math.cos(a) * (r - (big ? 22 : 15))); c.stroke(); }
  c.fillStyle = C.ink; c.font = '600 16px "IM Fell English"'; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let v = -3; v <= 3; v++) { const a = ang(v); c.fillText(String(Math.abs(v)), Math.sin(a) * (r - 36), -Math.cos(a) * (r - 36)); }
  c.font = 'italic 400 12px "IM Fell English"'; c.fillText('turns a second', 0, r * 0.52); c.fillText('left  ·  right', 0, r * 0.52 + 14);
  const a = ang(speed);
  c.save(); c.rotate(a); c.strokeStyle = '#7a1a10'; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 12); c.lineTo(0, -(r - 14)); c.stroke(); c.restore();
  drawHub(c, 0, 0, 7);
  c.restore();
}
// ---------------------------------------------------------------- the disc
function drawDiscBody(c, th, withTiles, alphaShadow = 1) {
  c.save(); c.translate(DISC.x, DISC.y); c.rotate(rad(th));
  const img = withTiles ? DISC_A : DISC_B; c.drawImage(img, -img.width / 4, -img.height / 4, img.width / 2, img.height / 2);
  c.restore();
}
function drawDiscShadow(c, off = 1) {
  c.save(); c.globalAlpha = 0.9; c.drawImage(SHADOW, DISC.x - SHADOW.width / 2 + 16 * off, DISC.y - SHADOW.height / 2 + 22 * off); c.restore();
}
function drawGate(c, eye) {
  // the sight clip and the pin; the glow shows the slit crossing the line of sight
  const sx = DISC.x + 0.915 * R, sy = DISC.y;
  if (eye) { const a = clamp(eye.open * 1.3), gr = c.createRadialGradient(sx, sy, 2, sx, sy, 70); gr.addColorStop(0, `rgba(255,226,150,${0.85 * a})`); gr.addColorStop(1, 'rgba(255,200,100,0)'); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = gr; c.fillRect(sx - 70, sy - 70, 140, 140); c.restore(); }
  c.save(); const b = brassGrad(c, sx - 50, sy - 60, sx + 50, sy + 60);
  c.fillStyle = 'rgba(0,0,0,0.5)'; c.filter = 'blur(4px)'; c.fillRect(sx - 52 + 6, sy - 56 + 8, 112, 112); c.filter = 'none';
  for (const dy of [-1, 1]) { c.fillStyle = b; c.fillRect(sx - 54, sy + dy * 46 - 7, 118, 14); c.strokeStyle = 'rgba(30,16,4,0.85)'; c.lineWidth = 1.2; c.strokeRect(sx - 54, sy + dy * 46 - 7, 118, 14); }
  c.fillStyle = b; c.fillRect(sx + 52, sy - 50, 12, 100); c.strokeRect(sx + 52, sy - 50, 12, 100);
  c.restore();
}
function drawSightLine(c, ox) {
  const x0 = DISC.x + R + 70, x1 = MIR.x + ox - MIR.rx - 60;
  if (x1 - x0 < 30) return;
  c.save(); c.strokeStyle = 'rgba(36,21,9,0.8)'; c.lineWidth = 2.2; c.setLineDash([12, 9]); c.beginPath(); c.moveTo(x0, DISC.y); c.lineTo(x1, MIR.y); c.stroke(); c.setLineDash([]);
  c.fillStyle = 'rgba(36,21,9,0.85)'; c.beginPath(); c.moveTo(x1 + 10, MIR.y); c.lineTo(x1 - 8, MIR.y - 7); c.lineTo(x1 - 8, MIR.y + 7); c.closePath(); c.fill();
  c.restore();
}

// ---------------------------------------------------------------- the ring lifting off and unrolling into a strip
function ringPose(u, k, th) {
  const e = eio(u), p0 = TAU * 0.60 * R / 12, p1 = P, p = lerp(p0, p1, e), k0 = TAU / (12 * p0), kap = k0 * Math.pow(1 - e, 1.6) + 1e-9;
  const s = (k - 5.5) * p, psiMid = th - 165;
  const T0 = (() => { const q = polar(0.6 * R, psiMid); return [DISC.x + q[0], DISC.y + q[1]]; })();
  const rot0 = th + 15; let rot1 = 0; while (rot1 - rot0 > 180) rot1 -= 360; while (rot1 - rot0 < -180) rot1 += 360;
  const rot = rad(lerp(rot0, rot1, ss(u))), tx = lerp(T0[0], DRUM.x, ss(u)), ty = lerp(T0[1], DRUM.y - 95, ss(u));
  const px = Math.sin(kap * s) / kap, py = -(1 - Math.cos(kap * s)) / kap;
  const X = tx + Math.cos(rot) * px - Math.sin(rot) * py, Y = ty + Math.sin(rot) * px + Math.cos(rot) * py;
  const rho = rot + rad(-kap * s * 180 / Math.PI + 90 - 90 * e);
  return { x: X, y: Y, rho, size: lerp(0.46 * R, P, e) };
}
function drawCardAt(c, img, x, y, rho, size, lift, sx = 1) {
  c.save(); c.translate(x, y); c.rotate(rho);
  if (lift > 0.01) { c.save(); c.globalAlpha = 0.5; c.fillStyle = '#000'; c.filter = 'blur(7px)'; c.fillRect(-size / 2 + 5 + lift * 14 * sx, -size / 2 + 8 + lift * 18, size * sx, size); c.restore(); }
  c.scale(sx, 1); c.drawImage(img, -size / 2, -size / 2, size, size);
  c.strokeStyle = `rgba(36,21,9,${0.25 + 0.5 * clamp(lift * 3)})`; c.lineWidth = 1.2; c.strokeRect(-size / 2, -size / 2, size, size);
  c.restore();
}

// ---------------------------------------------------------------- caption slips
function wrapLines(c, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t2 = cur ? cur + ' ' + w : w; if (c.measureText(t2).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t2; }
  lines.push(cur); return lines;
}
function slipBox(c, text) {
  c.font = 'italic 400 38px "IM Fell English"';
  const lines = wrapLines(c, text, 1500), w = Math.max(...lines.map(l => c.measureText(l).width)) + 96, h = 30 + lines.length * 46 + 14;
  return { lines, w, h };
}
function currentCap(t) { return CAPS.find(k => t >= k.t0 && t < k.t1); }
function drawSlip(c, cap, t) {
  const a = Math.min(rt(t, cap.t0, cap.t0 + 0.14), 1 - rt(t, cap.t1 - 0.2, cap.t1));
  const { lines, w, h } = slipBox(c, cap.text), x = W / 2, y = 1080 - 40 - h / 2 - 10 + (1 - a) * 10;
  c.save(); c.globalAlpha = a; c.setTransform(1, 0, 0, 1, 0, 0);
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 14; c.shadowOffsetY = 6; c.fillStyle = '#efe2bf'; c.fillRect(x - w / 2, y - h / 2, w, h); c.shadowColor = 'transparent';
  c.fillStyle = 'rgba(150,100,40,0.20)'; c.fillRect(x - w / 2, y - h / 2, w, h);
  c.strokeStyle = 'rgba(36,21,9,0.85)'; c.lineWidth = 2.5; c.strokeRect(x - w / 2 + 7, y - h / 2 + 7, w - 14, h - 14); c.lineWidth = 0.9; c.strokeRect(x - w / 2 + 12, y - h / 2 + 12, w - 24, h - 24);
  c.fillStyle = C.ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'italic 400 38px "IM Fell English"';
  lines.forEach((l, i) => c.fillText(l, x, y - (lines.length - 1) * 23 + i * 46 + 2));
  for (const sx of [-1, 1]) { c.fillStyle = C.ink; c.beginPath(); c.arc(x + sx * (w / 2 - 20), y, 3, 0, TAU); c.fill(); }
  c.restore();
}

// ---------------------------------------------------------------- mean render helper (camera shutter)
function meanRender(N, drawFn) {
  BG.getContext('2d').setTransform(1, 0, 0, 1, 0, 0); BG.getContext('2d').drawImage(cv, 0, 0);
  const tg = TMP.getContext('2d');
  for (let i = 0; i < N; i++) {
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.drawImage(BG, 0, 0);
    drawFn(tg, i);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1 / (i + 1); g.drawImage(TMP, 0, 0); g.globalAlpha = 1;
  }
}
const shutAt = t => lerp(0.55, 0.03, ss(rt(t, 25.0, 26.0)));

// ---------------------------------------------------------------- the frame
function render(t) {
  t = clamp(t, 0, DUR);
  const cam = camAt(t), cands = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.fillStyle = '#120a05'; g.fillRect(0, 0, W, H);
  setCam(g, cam); drawTable(g);
  const th = theta(t), spd = SPEED(t);
  const inDisc = t < T.lift;
  const mirP = ss(rt(t, T.mirrorIn, T.mirrorIn + 1.4)) * (1 - ss(rt(t, T.mirrorOut, T.mirrorOut + 1.2)));
  const mirOx = (1 - mirP) * 1250;
  let eye = null;
  if (mirP > 0.001) eye = eyeAt(t);
  const shut = shutAt(t);
  // shadows and the instruments
  if (t < T.lift + 0.001 || t < T.curl0) { drawDiscShadow(g, t < T.lift ? 1 : 0.6); }
  if (mirP > 0.001) {
    drawSightLine(g, mirOx); drawMirror(g, t, eye, mirOx); drawThumbs(g, eye, mirOx); drawDial(g, SPEED(t), mirOx);
  }
  // the disc (motion-blurred by the shutter), then the fixed fittings
  const dth = 360 * Math.abs(spd) * shut / FPS();
  if (t < T.lift) {
    const N = dth < 0.5 ? 1 : clamp(Math.ceil(dth / 1.1), 2, 26);
    const t0 = t - shut / 48, t1 = t + shut / 48;
    if (N === 1) { setCam(g, cam); drawDiscBody(g, th, true); }
    else meanRender(N, (c, i) => { setCam(c, cam); drawDiscBody(c, theta(lerp(t0, t1, i / (N - 1))), true); });
    setCam(g, cam); drawHub(g, DISC.x, DISC.y, 0.06 * R * 0.55 + 6);
    if (mirP > 0.001) drawGate(g, eye);
  } else {
    setCam(g, cam); drawDiscBody(g, t >= 48.6 ? 0 : THETA_STOP(), t >= 48.6); drawHub(g, DISC.x, DISC.y, 0.06 * R * 0.55 + 6);
  }
  // the ring -> strip -> drum
  if (t >= T.lift) {
    const u = rt(t, T.lift, T.unrolled), th0 = THETA_STOP();
    if (t < T.curl0) {
      setCam(g, cam);
      const flipT = t - T.flip0;
      const order = [...Array(12).keys()].map(k => ({ k, p: ringPose(u, k, th0) })).sort((a, b) => a.p.y - b.p.y);
      for (const { k, p } of order) {
        const v = clamp((flipT - k * 0.055) / 0.5), sx = Math.max(0.02, Math.abs(Math.cos(Math.PI * v))), img = v > 0.5 ? WALKC[k] : BIRDC[k];
        drawCardAt(g, img, p.x, p.y, p.rho, p.size, Math.sin(Math.PI * clamp(u * 1.0)) * 0.9 + 0.15 * (1 - u) * 0, sx);
      }
    } else {
      const sp = th;      // drum spin = continued rotation
      const kap = (1 / RS) * eio(rt(t, T.curl0, T.curl1));
      const pitch = lerp(0, 52, ss(rt(t, T.curl0, T.curl1))) * (1 - ss(rt(t, T.shellEnd, T.drumFull))) + 10 * ss(rt(t, T.shellEnd, T.drumFull));
      const [sx0, sy0] = toScreen(cam, DRUM.x, DRUM.y);
      const shellDown = ss(rt(t, T.shellOn, T.shellEnd)), shellY = (1 - shellDown) * 800;
      const win = clamp(30 / Math.max(1e-3, Math.abs(360 * spd)), 0, 0.12);           // one slit pitch of rotation, at most 0.12 s
      const st = { x: sx0, y: sy0, sc: cam.s, kappa: kap, pitch, spin: sp, spinRange: 360 * spd * win * Math.sign(spd || 1) * (Math.abs(spd) > 0.02 ? 1 : 0), shell: t >= T.shellOn - 0.001, shellY, cards: WALKC, W, H, gain: 1 };
      st.spinRange = Math.abs(spd) > 0.02 ? 360 * spd * win : 0;
      st.gainS = t >= T.shellEnd ? clamp(Math.abs(st.spinRange) / 30) : 0;
      // shadow of the drum on the table
      g.save(); setCam(g, cam); g.fillStyle = 'rgba(0,0,0,0.55)'; g.filter = 'blur(16px)'; g.beginPath(); g.ellipse(DRUM.x + 30, DRUM.y + 8, RO * 1.0, RO * 0.3, 0, 0, TAU); g.fill(); g.restore();
      g.setTransform(1, 0, 0, 1, 0, 0);
      drawRimFar(g, st); drawDrum(g, st); drawBase(g, st);
    }
  }
  // light: a candle off to the upper left, a slow flicker
  g.setTransform(1, 0, 0, 1, 0, 0);
  const fl = 1 + 0.035 * (vnoise(t * 7.3) - 0.5) * 2 + 0.02 * Math.sin(t * 31.4 + vnoise(t * 3) * 6);
  g.globalCompositeOperation = 'soft-light'; let gr = g.createRadialGradient(lampX, lampY, 60, lampX, lampY, 1500); gr.addColorStop(0, `rgba(255,190,110,${0.42 * fl})`); gr.addColorStop(1, 'rgba(255,170,90,0.0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over'; gr = g.createRadialGradient(W * 0.45, H * 0.42, 340, W * 0.45, H * 0.45, 1250); gr.addColorStop(0, 'rgba(8,3,0,0)'); gr.addColorStop(0.65, `rgba(8,3,0,${0.36 / fl})`); gr.addColorStop(1, `rgba(6,2,0,${0.78 / fl})`); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // tags (paper labels on the table) are drawn in world space, over the light so that they stay legible
  setCam(g, cam); for (const tg of TAGS) { const a = tagAlpha(tg, t); if (a > 0.01) drawTag(g, tg, a); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  const cap = NOSUB ? null : currentCap(t); if (cap) drawSlip(g, cap, t);
  // fade in from the dark and out at the end
  const fa = 0.5 * (1 - ss(rt(t, 0, 1.1)) + ss(rt(t, DUR - 1.3, DUR))); if (fa > 0.001) { g.fillStyle = `rgba(10,5,2,${fa})`; g.fillRect(0, 0, W, H); }
}
const FPS = () => 24;

window.DUR = DUR; window.EV = EV; window.render = render;
window.TEXTS = t => {
  const out = [], cam = camAt(t);
  for (const tg of TAGS) if (t >= tg.t0 + 0.4 && t < tg.t1 - 0.4) {
    g.font = 'italic 400 26px "IM Fell English"'; const w = g.measureText(tg.text).width + 44, [x, y] = toScreen(cam, tg.x, tg.y), h = 48 * cam.s;
    out.push({ id: tg.id, text: tg.text, x0: x - w * cam.s / 2, y0: y - h / 2, x1: x + w * cam.s / 2, y1: y + h / 2 });
  }
  return out;
};

// ---------------------------------------------------------------- boot
(async () => {
  for (const [fam, src, d] of [['IM Fell English', 'url(fonts/IMFellEnglish.woff2)', {}], ['IM Fell English', 'url(fonts/IMFellEnglish-Italic.woff2)', { style: 'italic' }]]) { const f = new FontFace(fam, src, d); await f.load(); document.fonts.add(f); }
  await Promise.all(['400 20px "IM Fell English"', 'italic 400 20px "IM Fell English"', '600 20px "IM Fell English"'].map(f => document.fonts.load(f, 'AaBbIVX')));
  try { CAPS = await (await fetch('caps.json')).json(); } catch (e) { CAPS = []; }
  BIRD = makeTiles('bird', 512); WALK = makeTiles('walker', 512);
  BIRDC = makeCards(BIRD, 9); WALKC = makeCards(WALK, 29);
  DISC_A = buildDisc(BIRD, true); DISC_B = buildDisc(BIRD, false); SHADOW = shadowDisc(1);
  TABLE_PAT = g.createPattern(tableCanvas(), 'repeat');
  TMP = mk(W, H); BG = mk(W, H);
  MIRFOX = (() => { const c = mk(512, 580), x = c.getContext('2d'), r = mulberry(4); for (let i = 0; i < 90; i++) { const px = r() * 512, py = r() * 580, rr = 3 + r() * r() * 28, gg = x.createRadialGradient(px, py, 0, px, py, rr); gg.addColorStop(0, `rgba(90,60,25,${0.10 + r() * 0.2})`); gg.addColorStop(1, 'rgba(90,60,25,0)'); x.fillStyle = gg; x.beginPath(); x.arc(px, py, rr, 0, TAU); x.fill(); } return c; })();
  window.READY = true;
})();
