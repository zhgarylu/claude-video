// The picture under the comments: one long kitchen counter, a station per step of the bake. Flat vector shapes only.
// Everything is a pure function of player time tau. Hero objects ("subjects") are drawn again over the comments (mask).
import { mulberry, hash, vnoise, seg, ss, eo, ei, lerp, clamp } from '/core/lib.js';
import { K, STATIONS as ST, POPS } from './timeline.js';

const TAU = Math.PI * 2;
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgb = a => `rgb(${a[0]},${a[1]},${a[2]})`;
const col = (h1, h2, t) => rgb(mix(hex(h1), hex(h2), clamp(t)));
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
const lin = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, k]) => g.addColorStop(o, k)); return g; };
const BASE = 900;                       // objects stand on this line of the counter
export const dayAt = tau => 0.12 + 0.88 * ss(seg(tau, 25.2, 33.6));

// ------------------------------------------------------------------ back layer (parallax wall)
export function drawBack(c, tau, cam) {
  const zb = 1 + (cam.z - 1) * 0.85, cxb = cam.cx * 0.8, cyb = cam.cy;
  c.fillStyle = '#2b5256'; c.fillRect(0, 0, 1920, 1080);
  c.save(); c.translate(960, 540); c.scale(zb, zb); c.translate(-cxb, -cyb);
  const xa = cxb - 960 / zb - 40, xb = cxb + 960 / zb + 40;
  c.fillStyle = lin(c, 0, -200, 0, 1000, [[0, '#244a4e'], [1, '#33646a']]); c.fillRect(xa, -300, xb - xa, 1400);
  // subway tiles
  c.strokeStyle = 'rgba(190,230,225,0.10)'; c.lineWidth = 3; c.beginPath();
  const x0 = Math.floor(xa / 120) * 120;
  for (let x = x0; x < xb; x += 120) { c.moveTo(x, 40); c.lineTo(x, 1000); }
  for (let y = 40; y < 1000; y += 60) { c.moveTo(xa, y); c.lineTo(xb, y); }
  c.stroke();
  const inX = (x, r) => x > xa - r && x < xb + r;
  // windows
  for (const wx of [380, 4150]) if (inX(wx, 300)) drawWindow(c, wx, tau);
  // shelf with jars, hanging tools, hood, frame
  if (inX(1840, 400)) drawShelf(c, 1840);
  if (inX(3120, 400)) drawRail(c, 3120);
  if (inX(4850, 120)) drawClock(c, 4850, 250, tau);
  if (inX(5680, 500)) drawHood(c, 5680);
  if (inX(6960, 400)) drawFrames(c, 6960);
  if (inX(1100, 200)) drawFrames(c, 1100, true);
  c.restore();
}
function drawWindow(c, x, tau) {
  const d = x > 3000 ? dayAt(tau) : 0.12, W = 360, H = 330, y = 120;
  rr(c, x - W / 2 - 18, y - 18, W + 36, H + 36, 14); c.fillStyle = '#e9e1cf'; c.fill();
  c.save(); rr(c, x - W / 2, y, W, H, 6); c.clip();
  const topA = d < .5 ? col('#a9dcff', '#8fd0ff', d * 2) : col('#8fd0ff', '#1f2c5c', (d - .5) * 2), botA = d < .5 ? col('#fff0cf', '#ffe2a8', d * 2) : col('#ffe2a8', '#ff8f55', (d - .5) * 2);
  c.fillStyle = lin(c, 0, y, 0, y + H, [[0, topA], [1, botA]]); c.fillRect(x - W / 2, y, W, H);
  const sx = x - W / 2 + W * (0.22 + 0.56 * d), sy = y + H * (0.55 - 0.40 * Math.sin(Math.PI * Math.min(1, d * 0.95 + 0.04)) + 0.22 * d * d);
  c.fillStyle = col('#fff6b0', '#ff7a3c', d); c.beginPath(); c.arc(sx, sy, 34, 0, TAU); c.fill();
  c.fillStyle = `rgba(255,255,255,${0.75 - d * 0.5})`;
  for (const [cx, cy, r] of [[x - 100 + d * 40, y + 90, 38], [x + 60 + d * 30, y + 60, 30]]) { c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.arc(cx + r * .9, cy + 6, r * .8, 0, TAU); c.arc(cx - r * .9, cy + 8, r * .7, 0, TAU); c.fill(); }
  c.fillStyle = col('#7fae86', '#2a3f4d', d); c.beginPath(); c.moveTo(x - W / 2, y + H); c.lineTo(x - W / 2, y + H - 70);
  c.quadraticCurveTo(x - 60, y + H - 130, x + 40, y + H - 60); c.quadraticCurveTo(x + 120, y + H - 100, x + W / 2, y + H - 50); c.lineTo(x + W / 2, y + H); c.fill();
  c.restore();
  c.fillStyle = '#e9e1cf'; c.fillRect(x - 5, y, 10, H); c.fillRect(x - W / 2, y + H / 2 - 5, W, 10);
  c.fillStyle = '#d95f4d'; c.beginPath(); c.moveTo(x - W / 2 - 18, y - 18); c.quadraticCurveTo(x - W / 2 + 40, y + H * .55, x - W / 2 + 6, y + H + 10); c.lineTo(x - W / 2 - 40, y + H + 10); c.lineTo(x - W / 2 - 40, y - 18); c.fill();
}
function drawShelf(c, x) {
  rr(c, x - 330, 380, 660, 16, 4); c.fillStyle = '#b9854f'; c.fill();
  const cols = ['#e7d7b0', '#9fc3a3', '#e9a58f', '#c9b7e0', '#f2cf72'];
  for (let i = 0; i < 5; i++) { const cx = x - 270 + i * 130, h = 90 + (i % 3) * 22; rr(c, cx - 42, 380 - h, 84, h, 12); c.fillStyle = cols[i]; c.fill(); rr(c, cx - 48, 380 - h - 14, 96, 18, 6); c.fillStyle = '#7a5a3a'; c.fill(); }
}
function drawRail(c, x) {
  c.strokeStyle = '#d7d2c4'; c.lineWidth = 8; c.beginPath(); c.moveTo(x - 330, 220); c.lineTo(x + 330, 220); c.stroke();
  for (let i = 0; i < 5; i++) { const hx = x - 240 + i * 120; c.strokeStyle = '#d7d2c4'; c.lineWidth = 5; c.beginPath(); c.arc(hx, 232, 8, 0, TAU); c.stroke();
    c.fillStyle = i % 2 ? '#8a5a35' : '#c9c3b2'; rr(c, hx - 7, 240, 14, 120 + (i % 3) * 30, 6); c.fill(); c.beginPath(); c.ellipse(hx, 372 + (i % 3) * 30, 30, 36, 0, 0, TAU); c.fill(); }
}
function drawClock(c, x, y, tau) {
  c.fillStyle = '#17282b'; c.beginPath(); c.arc(x, y, 76, 0, TAU); c.fill();
  c.fillStyle = '#f4efe2'; c.beginPath(); c.arc(x, y, 66, 0, TAU); c.fill();
  c.strokeStyle = '#2a2a2a'; c.lineWidth = 4; for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.beginPath(); c.moveTo(x + Math.sin(a) * 52, y - Math.cos(a) * 52); c.lineTo(x + Math.sin(a) * 60, y - Math.cos(a) * 60); c.stroke(); }
  const h = 12 + 4 * ss(seg(tau, 25.5, 33.5)) + tau * 0.004, ang = TAU * h / 12, mang = TAU * h;
  c.lineCap = 'round'; c.strokeStyle = '#2a2a2a'; c.lineWidth = 7; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(ang) * 34, y - Math.cos(ang) * 34); c.stroke();
  c.lineWidth = 4; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(mang) * 52, y - Math.cos(mang) * 52); c.stroke();
  c.fillStyle = '#d95f4d'; c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill(); c.lineCap = 'butt';
}
function drawHood(c, x) {
  c.fillStyle = '#4a5360'; c.beginPath(); c.moveTo(x - 300, 330); c.lineTo(x + 300, 330); c.lineTo(x + 200, 140); c.lineTo(x - 200, 140); c.fill();
  c.fillStyle = '#5b6573'; c.fillRect(x - 320, 326, 640, 22);
  c.fillStyle = '#3b424d'; c.fillRect(x - 70, 20, 140, 130);
}
function drawFrames(c, x, plant) {
  if (plant) { c.fillStyle = '#c9794f'; c.beginPath(); c.moveTo(x - 50, 760); c.lineTo(x + 50, 760); c.lineTo(x + 36, 860); c.lineTo(x - 36, 860); c.fill();
    c.fillStyle = '#4f9b63'; for (let i = 0; i < 7; i++) { const a = -1.2 + i * 0.4; c.beginPath(); c.ellipse(x + Math.sin(a) * 60, 700 - Math.cos(a) * 20 - i % 3 * 22, 22, 60, a, 0, TAU); c.fill(); } return; }
  for (let i = 0; i < 3; i++) { const fx = x - 200 + i * 190, fy = 230 + (i % 2) * 40; rr(c, fx - 70, fy - 80, 140, 160, 8); c.fillStyle = '#e9dfc8'; c.fill();
    rr(c, fx - 56, fy - 66, 112, 132, 4); c.fillStyle = ['#e9a58f', '#9fc3a3', '#f2cf72'][i]; c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(fx, fy - 10, 26, 0, TAU); c.fill(); }
}

// ------------------------------------------------------------------ counter (front layer, world space)
export function drawCounter(c, cam) {
  const xa = cam.cx - 960 / cam.z - 60, xb = cam.cx + 960 / cam.z + 60;
  c.fillStyle = '#1b3639'; c.fillRect(xa, 790, xb - xa, 14);
  c.fillStyle = lin(c, 0, 800, 0, 1500, [[0, '#cf9560'], [0.2, '#c58b57'], [1, '#a9743f']]); c.fillRect(xa, 800, xb - xa, 900);
  c.fillStyle = '#e8b47c'; c.fillRect(xa, 800, xb - xa, 8);
  c.strokeStyle = 'rgba(110,64,28,0.20)'; c.lineWidth = 3; c.beginPath();
  for (let i = 0; i < 9; i++) { const y = 840 + i * 70 + (i % 3) * 9; c.moveTo(xa, y); c.lineTo(xb, y); }
  const s0 = Math.floor(xa / 900) * 900; for (let x = s0; x < xb; x += 900) { c.moveTo(x, 808); c.lineTo(x, 1600); }
  c.stroke();
  c.strokeStyle = 'rgba(255,230,190,0.10)'; c.beginPath(); for (let i = 0; i < 6; i++) { const y = 862 + i * 90; c.moveTo(xa, y); c.lineTo(xb, y); } c.stroke();
}
const shadow = (c, x, y, rx) => { c.fillStyle = 'rgba(40,20,5,0.28)'; c.beginPath(); c.ellipse(x, y, rx, rx * 0.12, 0, 0, TAU); c.fill(); };

// ------------------------------------------------------------------ station 1: the jar with a face
function jarMood(tau) { return tau < K.levelUp0 ? -1 : -1 + 2 * ss(seg(tau, K.levelUp0, K.smile)); }
export const jarLevel = tau => 0.40 + 0.26 * ss(seg(tau, K.levelUp0, K.levelUp1));
function drawJar(c, tau) {
  const X = ST.jar, base = BASE, top = base - 340, ix = X - 118, iw = 236, ib = base - 14, ih = 300;
  shadow(c, X + 10, base + 6, 190);
  // props
  c.save(); c.translate(X + 290, base - 10); c.rotate(-0.15); rr(c, -14, -170, 28, 190, 12); c.fillStyle = '#b07a42'; c.fill(); c.beginPath(); c.ellipse(0, -176, 34, 44, 0, 0, TAU); c.fill(); c.restore();
  rr(c, X - 420, base - 26, 150, 30, 10); c.fillStyle = '#eeeadf'; c.fill(); c.fillStyle = '#d95f4d'; for (let i = 0; i < 3; i++) c.fillRect(X - 410 + i * 50, base - 26, 24, 30);
  const lv = jarLevel(tau), surf = ib - ih * lv, act = 0.25 + 0.75 * seg(tau, 1, 5);
  // starter
  c.save(); rr(c, ix, top + 24, iw, ih + 24, 26); c.clip();
  c.fillStyle = lin(c, 0, surf, 0, ib, [[0, '#f6e6b8'], [1, '#e8cf92']]); c.fillRect(ix, surf, iw, ib - surf + 2);
  c.fillStyle = '#fbf0d0'; c.beginPath(); c.moveTo(ix, surf + 8); for (let i = 0; i <= 24; i++) c.lineTo(ix + iw * i / 24, surf + 4 * Math.sin(i * 1.7 + tau * 2.1) + (i % 3) * 2); c.lineTo(ix + iw, surf - 8); c.lineTo(ix, surf - 8); c.fill();
  for (let i = 0; i < 44; i++) {
    if (i / 44 > act) break;
    const bx = ix + 14 + hash(i * 1.3) * (iw - 28), sp = 0.07 + 0.16 * hash(i * 2.9), ph = hash(i * 5.1), r = 3 + 8 * hash(i * 7.7) ** 2;
    const f = (tau * sp + ph) % 1, by = ib - f * (ib - surf);
    c.strokeStyle = 'rgba(255,255,240,0.75)'; c.fillStyle = 'rgba(255,248,215,0.35)'; c.lineWidth = 2; c.beginPath(); c.arc(bx + Math.sin(tau * 2 + i) * 4, by, r, 0, TAU); c.fill(); c.stroke();
  }
  c.restore();
  // pops at the surface
  for (const p of POPS) { const dt = tau - p;
    if (dt > -0.22 && dt < 0) { const r = 4 + 16 * (1 + dt / 0.22), bx = ix + 24 + hash(p * 9.1) * (iw - 48); c.fillStyle = 'rgba(255,246,214,0.9)'; c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; c.beginPath(); c.ellipse(bx, surf - 2, r, r * 0.7, 0, Math.PI, TAU); c.fill(); c.stroke(); }
    else if (dt >= 0 && dt < 0.35) { const bx = ix + 24 + hash(p * 9.1) * (iw - 48), r = 20 + dt * 90; c.strokeStyle = `rgba(255,255,240,${1 - dt / 0.35})`; c.lineWidth = 3; c.beginPath(); c.ellipse(bx, surf - 2, r, r * 0.3, 0, 0, TAU); c.stroke(); } }
  // glass
  rr(c, X - 130, top + 14, 260, 326, 36); c.fillStyle = 'rgba(210,240,246,0.16)'; c.fill(); c.strokeStyle = 'rgba(236,252,255,0.65)'; c.lineWidth = 6; c.stroke();
  rr(c, X - 108, top + 40, 14, 230, 7); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fill();
  // rubber band at the start level
  const by = ib - ih * 0.40; c.fillStyle = '#e0523f'; rr(c, X - 134, by - 6, 268, 13, 5); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(X - 130, by - 4, 260, 3);
  // lid
  c.save(); c.translate(X, top + 6); c.rotate(-0.05); rr(c, -134, -16, 268, 34, 10); c.fillStyle = '#d9b25c'; c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-120, -10, 240, 5); c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(-134, 8, 268, 8); c.restore();
  // face
  const m = jarMood(tau), blink = ((tau + 1.7) % 3.1) < 0.12 ? 0.1 : 1, ey = 612, look = Math.sin(tau * 0.9) * 5;
  for (const sx of [-1, 1]) { const ex = X + sx * 50;
    c.fillStyle = '#fff'; c.strokeStyle = '#243035'; c.lineWidth = 4; c.beginPath(); c.ellipse(ex, ey, 22, 24 * blink, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#243035'; c.beginPath(); c.ellipse(ex + look, ey + 3, 10, 12 * blink, 0, 0, TAU); c.fill();
    const wr = Math.max(0, -m), up = Math.max(0, m) * 8; c.strokeStyle = '#243035'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(ex - sx * 24, ey - 38 - wr * 14 - up); c.lineTo(ex + sx * 24, ey - 38 + wr * 8 - up); c.stroke();
    c.fillStyle = `rgba(255,120,140,${Math.max(0, m) * 0.6})`; c.beginPath(); c.ellipse(ex + sx * 8, ey + 38, 16, 9, 0, 0, TAU); c.fill(); }
  c.strokeStyle = '#243035'; c.lineWidth = 5; c.beginPath(); c.moveTo(X - 26, 662); c.quadraticCurveTo(X, 662 + m * 26 + 2, X + 26, 662); c.stroke(); c.lineCap = 'butt';
}

// ------------------------------------------------------------------ station 2: bowl, flour, water, spoon
function drawBowl(c, tau) {
  const X = ST.bowl, rimY = 706, rx = 262;
  shadow(c, X + 12, BASE + 6, 330);
  const f0 = K.flour0, hh = 12 + 100 * ss(seg(tau, f0 + .2, K.flour1 + 1.6)) + 6 * ss(seg(tau, K.water0, K.water1));
  const wet = ss(seg(tau, K.water0 + .1, K.water1 + .4)), smooth = ss(seg(tau, K.stir0, K.stir1));
  c.fillStyle = '#7d6b57'; c.beginPath(); c.ellipse(X, rimY, rx, 36, 0, 0, TAU); c.fill();                 // inside back wall
  c.fillStyle = '#9b8873'; c.beginPath(); c.ellipse(X, rimY + 6, rx - 14, 30, 0, 0, TAU); c.fill();
  // contents: a crown above the rim line, closed by the front lip
  const amp = lerp(26, 4, smooth), N = 40, body = col('#f8f3ea', '#efdcae', wet);
  c.beginPath(); c.moveTo(X - 218, rimY + 4);
  for (let i = 0; i <= N; i++) { const u = -1 + 2 * i / N, y = rimY + 2 - hh * Math.pow(Math.max(0, 1 - u * u), 0.55) - amp * (vnoise(u * 6 + 3) - 0.5) * Math.min(1, hh / 40) * (1 - u * u); c.lineTo(X + u * 218, y); }
  for (let i = N; i >= 0; i--) { const u = -1 + 2 * i / N; c.lineTo(X + u * 218, rimY + 34 * Math.sqrt(Math.max(0, 1 - u * u)) - 2); }
  c.closePath(); c.fillStyle = body; c.fill();
  c.save(); c.clip(); c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(X - 70, rimY - hh * 0.55, 90, hh * 0.25, -0.2, 0, TAU); c.fill();
  c.fillStyle = 'rgba(120,80,30,0.18)'; for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(X - 170 + i * 42, rimY - hh * (0.2 + 0.3 * hash(i)) + 10, 14 * (1 - smooth * 0.5), 5, 0, 0, TAU); c.fill(); } c.restore();
  // spoon
  const sw = ss(seg(tau, K.stir0 - .2, K.stir0 + .3)) * (1 - ss(seg(tau, K.stir1, K.stir1 + .4)));
  if (sw > 0.01) { const a = (tau - K.stir0) * 6.2, hx = X + Math.cos(a) * 80 * sw, hy = rimY - hh * 0.35 + Math.sin(a) * 14 * sw;
    c.lineCap = 'round'; c.strokeStyle = '#b07a42'; c.lineWidth = 18; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + 190, hy - 330); c.stroke();
    c.fillStyle = '#b07a42'; c.beginPath(); c.ellipse(hx, hy + 6, 34, 20, 0.2, 0, TAU); c.fill(); c.lineCap = 'butt'; }
  // bowl body
  c.beginPath(); c.moveTo(X - rx, rimY); c.bezierCurveTo(X - rx, rimY + 120, X - 190, BASE, X - 120, BASE); c.lineTo(X + 120, BASE);
  c.bezierCurveTo(X + 190, BASE, X + rx, rimY + 120, X + rx, rimY);
  for (let i = 0; i <= 30; i++) { const u = 1 - 2 * i / 30; c.lineTo(X + u * rx, rimY + 36 * Math.sqrt(1 - u * u)); }
  c.closePath(); c.fillStyle = lin(c, X - rx, 0, X + rx, 0, [[0, '#d9d2c0'], [0.35, '#f1ecdf'], [1, '#c5bda9']]); c.fill();
  c.save(); c.clip(); c.fillStyle = '#3f6f9c'; c.fillRect(X - rx, rimY + 52, rx * 2, 22); c.fillRect(X - rx, rimY + 90, rx * 2, 8);
  c.fillStyle = 'rgba(70,60,50,.25)'; for (let i = 0; i < 40; i++) { c.beginPath(); c.arc(X - 240 + hash(i * 3.3) * 480, rimY + 40 + hash(i * 4.1) * 160, 2.2, 0, TAU); c.fill(); } c.restore();
  c.strokeStyle = '#fff'; c.lineWidth = 6; c.globalAlpha = .7; c.beginPath(); c.ellipse(X, rimY, rx, 36, 0, Math.PI * 1.02, Math.PI * 1.98); c.stroke(); c.globalAlpha = 1;
  // flour sack
  const sIn = eo(seg(tau, 7.5, 8.2)), sTilt = ss(seg(tau, 8.0, 8.9)) * (1 - ss(seg(tau, K.flour1, K.flour1 + .5))), sOut = ei(seg(tau, K.flour1 + .5, K.flour1 + 1.1));
  if (tau > 7.4 && tau < K.flour1 + 1.2) {
    const P = [X + 150, 450 - 420 * (1 - sIn) - 420 * sOut], th = -2.0 * sTilt;
    c.save(); c.translate(P[0], P[1]); c.rotate(th); rr(c, -100, -150, 200, 300, 14); c.fillStyle = '#7fa6c9'; c.fill();
    c.fillStyle = '#6a92b6'; c.fillRect(-100, -150, 200, 44); c.fillStyle = '#f3efe3'; rr(c, -62, -64, 124, 90, 10); c.fill(); c.fillStyle = '#d9a441'; c.beginPath(); c.arc(0, -19, 22, 0, TAU); c.fill();
    c.fillStyle = '#e7e1cf'; c.beginPath(); c.moveTo(-70, -150); c.lineTo(-52, -176); c.lineTo(-26, -150); c.fill(); c.restore();
    const mouth = [P[0] + (-60) * Math.cos(th) - (-150) * Math.sin(th), P[1] + (-60) * Math.sin(th) + (-150) * Math.cos(th)];
    if (tau > K.flour0 && tau < K.flour1 + .3) { const fl = ss(seg(tau, K.flour0, K.flour0 + .3)) * (1 - ss(seg(tau, K.flour1, K.flour1 + .3))), land = rimY - hh + 6;
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.moveTo(mouth[0] - 12 * fl, mouth[1]); c.lineTo(mouth[0] + 12 * fl, mouth[1]); c.lineTo(mouth[0] + 5 * fl, land); c.lineTo(mouth[0] - 5 * fl, land); c.fill();
      for (let i = 0; i < 40; i++) { const f = (tau * 3 + i / 40) % 1; c.fillStyle = `rgba(255,255,255,${0.7 * fl})`; c.beginPath(); c.arc(mouth[0] + (hash(i) - .5) * 40 * f, mouth[1] + f * (land - mouth[1]), 2 + 3 * hash(i * 2.2), 0, TAU); c.fill(); }
      for (let i = 0; i < 12; i++) { const f = (tau * 0.8 + i / 12) % 1; c.fillStyle = `rgba(255,255,255,${0.30 * fl * (1 - f)})`; c.beginPath(); c.arc(mouth[0] + (hash(i * 3.3) - .5) * 220, land - f * 140, 22 + 50 * f, 0, TAU); c.fill(); } }
  }
  // water jug
  const jIn = eo(seg(tau, 10.2, 10.8)), jOut = ei(seg(tau, K.water1 + .3, K.water1 + .9)), jT = ss(seg(tau, 10.5, 11.0)) * (1 - ss(seg(tau, K.water1, K.water1 + .3)));
  if (tau > 10.1 && tau < K.water1 + 1.0) {
    const P = [X - 250, 470 - 300 * (1 - jIn) - 300 * jOut], th = 0.95 * jT;
    c.save(); c.translate(P[0], P[1]); c.rotate(th);
    rr(c, -70, -100, 140, 200, 18); c.fillStyle = 'rgba(215,240,250,0.35)'; c.fill(); c.strokeStyle = 'rgba(240,252,255,.9)'; c.lineWidth = 5; c.stroke();
    const lw = 1 - 0.6 * seg(tau, K.water0, K.water1); c.fillStyle = 'rgba(90,170,225,0.8)'; rr(c, -64, 90 - 180 * lw, 128, 180 * lw + 4, 12); c.fill();
    c.strokeStyle = 'rgba(240,252,255,.9)'; c.lineWidth = 12; c.beginPath(); c.arc(-70, 0, 38, Math.PI * 0.5, Math.PI * 1.5); c.stroke(); c.restore();
    const sp = [P[0] + 70 * Math.cos(th) + 90 * Math.sin(th), P[1] + 70 * Math.sin(th) - 90 * Math.cos(th)];
    if (tau > K.water0 && tau < K.water1 + .2) { const fl = ss(seg(tau, K.water0, K.water0 + .25)) * (1 - ss(seg(tau, K.water1, K.water1 + .2))), land = rimY - hh + 4;
      c.strokeStyle = 'rgba(100,180,235,0.9)'; c.lineWidth = 14 * fl; c.lineCap = 'round'; c.beginPath(); c.moveTo(sp[0], sp[1]); c.quadraticCurveTo(sp[0] + 70, sp[1] + 10, X - 10, land); c.stroke(); c.lineCap = 'butt'; }
  }
}

// ------------------------------------------------------------------ station 3: dough on a board, four folds
export const doughStrength = tau => { let s = 0.06; K.folds.forEach((t, i) => { s += 0.235 * ss(seg(tau, t - 0.1, t + 0.5)); }); return Math.min(1, s); };
function drawBoard(c, tau) {
  const X = ST.board, by = 872;
  shadow(c, X, by + 60, 520);
  rr(c, X - 480, by, 960, 66, 14); c.fillStyle = '#b57e45'; c.fill(); rr(c, X - 480, by, 960, 44, 14); c.fillStyle = '#dcab6c'; c.fill();
  c.fillStyle = '#efc58d'; c.fillRect(X - 470, by + 2, 940, 5);
  c.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 26; i++) { c.beginPath(); c.ellipse(X - 400 + hash(i * 2.1) * 800, by + 14 + hash(i * 5.3) * 20, 18 + 40 * hash(i), 3, 0, 0, TAU); c.fill(); }
  // scraper
  c.save(); c.translate(X + 420, by - 6); c.rotate(-0.12); rr(c, -64, -30, 128, 30, 5); c.fillStyle = '#c9ccd2'; c.fill(); rr(c, -64, -30, 128, 8, 4); c.fillStyle = '#e8eaee'; c.fill(); c.restore();
  const s = doughStrength(tau);
  let w = lerp(600, 410, s), h = lerp(70, 245, s), q = lerp(0.26, 0.62, s);
  // fold animation: pull a tent on one side, carry it over
  let pull = null, handOn = 0;
  K.folds.forEach((tf, k) => {
    const a = seg(tau, tf - 1.3, tf - 0.4), b = seg(tau, tf - 0.4, tf + 0.1), side = k % 2 ? 1 : -1;
    if (tau > tf - 1.4 && tau < tf + 0.3) { const u0 = lerp(side * 0.86, -side * 0.15, ss(b)), amt = (260 * ss(a)) * (1 - 0.85 * ss(b)) + 40 * ss(a); pull = { u0, amt, side, sig: lerp(0.2, 0.34, ss(b)) }; handOn = ss(a) * (1 - ss(seg(tau, tf + 0.0, tf + 0.3))); }
    const land = seg(tau, tf, tf + 0.5); if (land > 0 && land < 1) { h *= 1 + 0.10 * Math.sin(land * Math.PI) * (1 - land); w *= 1 - 0.04 * Math.sin(land * Math.PI); }
  });
  const N = 56, pts = [];
  for (let i = 0; i <= N; i++) {
    const u = -1 + 2 * i / N; let x = X + u * w / 2, y = by - h * Math.pow(Math.max(0, 1 - u * u), q);
    if (pull) { const g = Math.exp(-Math.pow((u - pull.u0) / pull.sig, 2)); y -= pull.amt * g * (1 - 0.3 * Math.abs(u - pull.u0)); x += (pull.u0 - u) * w * 0.17 * g * (pull.amt / 260); }
    pts.push([x, y]);
  }
  c.beginPath(); c.moveTo(X - w / 2, by); for (const p of pts) c.lineTo(p[0], p[1]); c.lineTo(X + w / 2, by); c.closePath();
  c.fillStyle = lin(c, 0, by - h - 40, 0, by, [[0, '#f8ebcb'], [0.6, '#f0dcb0'], [1, '#dcc08a']]); c.fill();
  c.save(); c.clip(); c.fillStyle = 'rgba(255,255,255,0.28)'; c.beginPath(); c.ellipse(X - w * 0.18, by - h * 0.62, w * 0.2, h * 0.18, -0.15, 0, TAU); c.fill();
  c.fillStyle = 'rgba(150,100,40,0.12)'; c.beginPath(); c.ellipse(X, by + 6, w * 0.5, h * 0.18, 0, 0, TAU); c.fill();
  c.fillStyle = `rgba(150,100,40,${0.10 + 0.1 * s})`; for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(X - w * 0.4 + hash(i * 3.7) * w * 0.8, by - h * (0.15 + 0.5 * hash(i * 1.9)), 3 + 4 * hash(i * 8.3) * s, 0, TAU); c.fill(); } c.restore();
  c.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 18; i++) { const u = -0.95 + 1.9 * hash(i * 6.1), py = by - h * Math.pow(Math.max(0, 1 - u * u), q) * (0.7 + 0.3 * hash(i)); c.beginPath(); c.arc(X + u * w / 2, py, 2 + 3 * hash(i * 2.7), 0, TAU); c.fill(); }
  // hand and sleeve
  if (pull && handOn > 0.02) {
    const px = pts[Math.round((pull.u0 + 1) / 2 * N)][0], py = pts[Math.round((pull.u0 + 1) / 2 * N)][1] - 12, dir = pull.side;
    const ex = px + dir * 380, ey = py - 560;
    c.lineCap = 'round'; c.strokeStyle = '#e9b48d'; c.lineWidth = 92; c.beginPath(); c.moveTo(px, py - 30); c.lineTo(lerp(px, ex, .5), lerp(py, ey, .5)); c.stroke();
    c.strokeStyle = '#c9534b'; c.lineWidth = 118; c.beginPath(); c.moveTo(lerp(px, ex, .42), lerp(py, ey, .42)); c.lineTo(ex, ey); c.stroke();
    c.fillStyle = '#e9b48d'; c.beginPath(); c.ellipse(px, py, 62, 50, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(px - dir * 52, py + 14, 22, 36, dir * 0.6, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(120,70,40,.35)'; c.lineWidth = 3; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(px + dir * (6 + i * 14) - 20, py + 10); c.lineTo(px + dir * (6 + i * 14) - 20, py + 38); c.stroke(); } c.lineCap = 'butt';
  }
}

// ------------------------------------------------------------------ station 4: the proof
export const riseAt = tau => 0.30 + 0.50 * ss(seg(tau, K.rise0, K.rise1)) ** 0.9;
function drawProof(c, tau) {
  const X = ST.proof, top = 560, ib = BASE - 16, ih = 300, ix = X - 190, iw = 380;
  shadow(c, X, BASE + 6, 260);
  const f = riseAt(tau), surf = ib - ih * f;
  c.save(); rr(c, ix, top + 10, iw, ih + 36, 20); c.clip();
  const bulge = 26 + 14 * f;
  c.beginPath(); c.moveTo(ix, ib + 10); c.lineTo(ix, surf + bulge * 0.5); c.quadraticCurveTo(X, surf - bulge, ix + iw, surf + bulge * 0.5); c.lineTo(ix + iw, ib + 10); c.closePath();
  c.fillStyle = lin(c, 0, surf, 0, ib, [[0, '#f8ebcb'], [1, '#e6cd96']]); c.fill();
  c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.ellipse(X - 70, surf + 4, 80, 8, 0, 0, TAU); c.fill();
  for (let i = 0; i < 34; i++) { const by = surf + 20 + hash(i * 4.4) * (ib - surf - 30), bx = ix + 14 + hash(i * 2.2) * (iw - 28); if (hash(i) * 0.9 > f - 0.2) continue; c.fillStyle = 'rgba(150,100,40,0.14)'; c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2; c.beginPath(); c.arc(bx, by, 4 + 8 * hash(i * 9.1), 0, TAU); c.fill(); c.stroke(); }
  // dimple from the poke
  const dep = ss(seg(tau, K.poke0 + .1, K.poke0 + .3)) * (1 - 0.95 * ss(seg(tau, K.poke1 + .1, K.ready + 0.6)));
  if (dep > 0.02) { const dx = X + 40, dy = surf - bulge * 0.2 + 12; c.fillStyle = `rgba(150,100,40,${0.35 * dep})`; c.beginPath(); c.ellipse(dx, dy, 38, 5 + 12 * dep, 0, 0, TAU); c.fill(); c.strokeStyle = `rgba(255,255,255,${0.5 * dep})`; c.lineWidth = 3; c.beginPath(); c.ellipse(dx, dy, 38, 5 + 12 * dep, 0, 0.1, Math.PI - 0.1); c.stroke(); }
  c.restore();
  rr(c, ix - 12, top, iw + 24, ih + 42, 24); c.fillStyle = 'rgba(210,240,246,0.14)'; c.fill(); c.strokeStyle = 'rgba(236,252,255,0.65)'; c.lineWidth = 6; c.stroke();
  rr(c, ix + 8, top + 40, 14, 220, 7); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fill();
  const my = ib - ih * 0.30; c.fillStyle = '#f2cf2f'; c.fillRect(ix + iw - 120, my - 7, 138, 14); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(ix + iw - 120, my - 1, 138, 2);
  // finger
  const fy = lerp(top - 280, surf - 30, ss(seg(tau, K.poke0, K.poke0 + .3))) - 260 * ss(seg(tau, K.poke1, K.poke1 + .35));
  if (tau > K.poke0 - 0.1 && tau < K.poke1 + .5) { c.lineCap = 'round'; c.strokeStyle = '#e9b48d'; c.lineWidth = 60; c.beginPath(); c.moveTo(X + 40, fy - 900); c.lineTo(X + 40, fy); c.stroke();
    c.strokeStyle = '#c9534b'; c.lineWidth = 100; c.beginPath(); c.moveTo(X + 40, fy - 900); c.lineTo(X + 40, fy - 560); c.stroke(); c.lineCap = 'butt'; }
}

// ------------------------------------------------------------------ station 5: the oven
export const springAt = tau => ss(seg(tau, K.spring0, K.spring1)) ;
function loafPath(c, X, base, w, h, q, N = 60) { c.beginPath(); c.moveTo(X - w / 2, base); for (let i = 0; i <= N; i++) { const u = -1 + 2 * i / N; c.lineTo(X + u * w / 2, base - h * Math.pow(Math.max(0, 1 - u * u), q)); } c.closePath(); }
function crustFill(c, base, h, p) { return lin(c, 0, base - h, 0, base, [[0, col('#e6c58a', '#cc7d33', 0.4 + 0.6 * p)], [0.5, col('#dcae6c', '#b8662a', 0.4 + 0.6 * p)], [1, col('#c99654', '#8e4a18', 0.4 + 0.6 * p)]]); }
function drawLoafScore(c, X, base, w, h, q, p, ear) {
  // the score runs diagonally over the dome; as the loaf springs it opens and a pale lip lifts
  const pt = u => [X + u * w / 2, base - h * Math.pow(Math.max(0, 1 - u * u), q)];
  const a = pt(-0.62), b = pt(0.5), op = 3 + 17 * p;
  c.save(); loafPath(c, X, base, w, h, q); c.clip();
  const dy = u => 0;
  c.beginPath(); c.moveTo(a[0], a[1] - 8); c.quadraticCurveTo((a[0] + b[0]) / 2, Math.min(a[1], b[1]) - h * 0.17 - op * 0.2, b[0], b[1] - 8);
  c.quadraticCurveTo((a[0] + b[0]) / 2, Math.min(a[1], b[1]) - h * 0.17 + op * 1.1, a[0], a[1] - 8 + 4); c.closePath();
  c.fillStyle = col('#e9bf7b', '#efd29c', p); c.fill();
  c.strokeStyle = 'rgba(95,45,12,0.75)'; c.lineWidth = 3; c.beginPath(); c.moveTo(a[0], a[1] - 4); c.quadraticCurveTo((a[0] + b[0]) / 2, Math.min(a[1], b[1]) - h * 0.17 + op * 1.1, b[0], b[1] - 8); c.stroke();
  if (ear > 0) { c.strokeStyle = col('#c2823a', '#f3d9a4', ear); c.lineWidth = 5 + 9 * ear; c.lineCap = 'round'; c.beginPath(); c.moveTo(a[0] + 6, a[1] - 14); c.quadraticCurveTo((a[0] + b[0]) / 2, Math.min(a[1], b[1]) - h * 0.17 - op * 0.9 - 8, b[0] - 8, b[1] - 14); c.stroke(); c.lineCap = 'butt'; }
  c.restore();
}
function drawOven(c, tau) {
  const X = ST.oven, glowT = 1 - 0.55 * ss(seg(tau, 44.6, 45.4));
  rr(c, X - 430, 330, 860, 580, 24); c.fillStyle = '#3e434d'; c.fill(); rr(c, X - 430, 330, 860, 100, [24, 24, 0, 0]); c.fillStyle = '#4c525d'; c.fill();
  for (let i = 0; i < 5; i++) { const kx = X - 300 + i * 150; c.fillStyle = '#20242a'; c.beginPath(); c.arc(kx, 380, 30, 0, TAU); c.fill(); c.fillStyle = '#e8e4d8'; c.beginPath(); c.arc(kx, 380, 22, 0, TAU); c.fill(); c.strokeStyle = '#20242a'; c.lineWidth = 5; c.beginPath(); c.moveTo(kx, 380); c.lineTo(kx + Math.sin(i * 1.3 + 1) * 18, 380 - Math.cos(i * 1.3 + 1) * 18); c.stroke(); }
  c.fillStyle = '#ff8a3c'; c.beginPath(); c.arc(X + 380, 380, 9, 0, TAU); c.fill();
  rr(c, X - 380, 450, 760, 450, 18); c.fillStyle = '#313640'; c.fill();
  rr(c, X - 320, 500, 640, 38, 19); c.fillStyle = '#c9ccd2'; c.fill(); rr(c, X - 320, 500, 640, 12, 6); c.fillStyle = '#eef0f3'; c.fill();
  const wx = X - 310, wy = 568, ww = 620, wh = 300;
  rr(c, wx - 14, wy - 14, ww + 28, wh + 28, 28); c.fillStyle = '#15171c'; c.fill();
  c.save(); rr(c, wx, wy, ww, wh, 18); c.clip();
  const fl = glowT * (0.92 + 0.08 * Math.sin(tau * 23) * Math.sin(tau * 7.3));
  const g = c.createRadialGradient(X, 800, 20, X, 760, 420); g.addColorStop(0, `rgba(255,${190 * fl + 40 | 0},70,1)`); g.addColorStop(0.55, `rgba(${220 * fl + 30 | 0},${100 * fl + 20 | 0},30,1)`); g.addColorStop(1, `rgba(${120 * fl + 20 | 0},${40 * fl + 10 | 0},20,1)`);
  c.fillStyle = g; c.fillRect(wx, wy, ww, wh);
  c.fillStyle = `rgba(255,170,60,${0.5 * fl})`; c.fillRect(wx, wy + 18, ww, 6); c.fillRect(wx, wy + wh - 38, ww, 6);          // elements
  c.fillStyle = '#4a4c52'; c.fillRect(wx, 818, ww, 44);                                                                       // stone
  c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(wx, 818, ww, 10);
  // loaf
  const p = springAt(tau), W = lerp(300, 372, p), H = lerp(96, 218, p), Q = lerp(0.36, 0.52, p), base = 820, brown = ss(seg(tau, 36, 44));
  shadow(c, X, base + 3, W * 0.62);
  loafPath(c, X, base, W, H, Q); c.fillStyle = crustFill(c, base, H, brown); c.fill();
  c.save(); loafPath(c, X, base, W, H, Q); c.clip(); c.fillStyle = 'rgba(255,230,170,.28)'; c.beginPath(); c.ellipse(X - W * 0.18, base - H * 0.55, W * 0.22, H * 0.13, -0.3, 0, TAU); c.fill();
  c.fillStyle = 'rgba(70,30,5,.22)'; c.fillRect(X - W / 2, base - 14, W, 14); c.restore();
  drawLoafScore(c, X, base, W, H, Q, p, ss(seg(tau, 39.5, 43)));
  c.restore();
  // glass reflections
  c.save(); rr(c, wx, wy, ww, wh, 18); c.clip(); c.fillStyle = 'rgba(255,255,255,.07)'; c.beginPath(); c.moveTo(wx + 80, wy); c.lineTo(wx + 200, wy); c.lineTo(wx + 20, wy + wh); c.lineTo(wx - 100, wy + wh); c.fill(); c.beginPath(); c.moveTo(wx + 260, wy); c.lineTo(wx + 300, wy); c.lineTo(wx + 120, wy + wh); c.lineTo(wx + 80, wy + wh); c.fill(); c.restore();
  rr(c, X - 380, 874, 760, 26, 8); c.fillStyle = '#272b32'; c.fill();
}
// the subject of the oven shot, for the mask pass: just the loaf in its window
function drawOvenLoafOnly(c, tau) {
  const X = ST.oven, p = springAt(tau), W = lerp(300, 372, p), H = lerp(96, 218, p), Q = lerp(0.36, 0.52, p), base = 820, brown = ss(seg(tau, 36, 44));
  c.save(); rr(c, X - 310, 568, 620, 300, 18); c.clip();
  loafPath(c, X, base, W, H, Q); c.fillStyle = crustFill(c, base, H, brown); c.fill();
  c.save(); loafPath(c, X, base, W, H, Q); c.clip(); c.fillStyle = 'rgba(255,230,170,.28)'; c.beginPath(); c.ellipse(X - W * 0.18, base - H * 0.55, W * 0.22, H * 0.13, -0.3, 0, TAU); c.fill(); c.fillStyle = 'rgba(70,30,5,.22)'; c.fillRect(X - W / 2, base - 14, W, 14); c.restore();
  drawLoafScore(c, X, base, W, H, Q, p, ss(seg(tau, 39.5, 43)));
  c.restore();
}

// ------------------------------------------------------------------ station 6: cooling, crackle, knife, crumb
export const CRACKS = Array.from({ length: 16 }, (_, i) => ({ t: K.crackle0 + (K.crackle1 - K.crackle0) * (i / 16) ** 0.8 + 0.07 * hash(i), u: -0.8 + 1.6 * hash(i * 3.3 + 1), v: 0.25 + 0.55 * hash(i * 7.9) }));
function crumbFace(c, X, base, w, h, q, k) {
  loafPath(c, X, base, w, h, q); c.fillStyle = '#8e4a18'; c.fill();
  c.save(); loafPath(c, X, base, w - 40, h - 20, q); c.clip();
  c.fillStyle = lin(c, 0, base - h, 0, base, [[0, '#f8eac4'], [1, '#efd9a4']]); c.fillRect(X - w / 2, base - h, w, h);
  const rg = mulberry(11);
  for (let i = 0; i < 70; i++) { const u = -0.85 + 1.7 * rg(), v = rg() ** 1.2, r = (4 + 24 * rg() ** 2.8) * (0.5 + 0.9 * v) * k;
    const hx = X + u * (w - 70) / 2, hy = base - 24 - v * (h - 60); c.fillStyle = '#e4cb90'; c.beginPath(); c.ellipse(hx, hy, r * 1.25, r * 0.8, rg() * 0.6 - 0.3, 0, TAU); c.fill();
    c.fillStyle = '#d2b56f'; c.beginPath(); c.ellipse(hx, hy - r * 0.1, r * 1.05, r * 0.62, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,248,225,.7)'; c.beginPath(); c.ellipse(hx, hy + r * 0.45, r * 0.9, r * 0.2, 0, 0, TAU); c.fill(); }
  c.restore();
}
function drawCutStation(c, tau, subjectOnly) {
  const X = ST.cut, by = 884;
  if (!subjectOnly) {
    shadow(c, X, by + 60, 560);
    rr(c, X - 470, by, 940, 64, 14); c.fillStyle = '#9b6a3a'; c.fill(); rr(c, X - 470, by, 940, 42, 14); c.fillStyle = '#c99259'; c.fill(); c.fillStyle = '#e0b07a'; c.fillRect(X - 460, by + 2, 920, 5);
    // butter dish
    rr(c, X - 700, by - 44, 190, 46, 10); c.fillStyle = '#e8e4d8'; c.fill(); rr(c, X - 676, by - 80, 130, 44, 8); c.fillStyle = '#f7de7c'; c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(X - 668, by - 76, 114, 8);
    c.fillStyle = '#c9534b'; rr(c, X + 520, by - 30, 150, 34, 6); c.fill(); c.fillStyle = '#fff'; for (let i = 0; i < 5; i++) c.fillRect(X + 530 + i * 30, by - 30, 14, 34);
  }
  const turn = ss(seg(tau, K.turn0, K.turn1)), w = 560, h = 252, q = 0.5, cutP = seg(tau, K.cut0, K.cut1);
  // the loaf (left half stays when cut)
  if (turn < 1) {
    c.save();
    if (cutP > 0) { c.beginPath(); c.rect(X - 420, 300, 420 - 0 + (turn < 1 && cutP < 1 ? 0 : 0), 700); c.clip(); }
    loafPath(c, X, by, w, h, q); c.fillStyle = crustFill(c, by, h, 1); c.fill();
    c.save(); loafPath(c, X, by, w, h, q); c.clip();
    const rg = mulberry(5); c.fillStyle = 'rgba(250,236,205,.16)'; for (let i = 0; i < 70; i++) { c.beginPath(); c.ellipse(X - w / 2 + rg() * w, by - rg() * h * 0.9, 4 + 12 * rg(), 2 + 4 * rg(), rg(), 0, TAU); c.fill(); }
    c.fillStyle = 'rgba(255,230,170,.24)'; c.beginPath(); c.ellipse(X - w * 0.2, by - h * 0.62, w * 0.2, h * 0.12, -0.25, 0, TAU); c.fill(); c.fillStyle = 'rgba(70,30,5,.2)'; c.fillRect(X - w / 2, by - 14, w, 14);
    // cracks that sing
    for (const k of CRACKS) { const d = tau - k.t; if (d < 0 || d > 0.9) continue; const a = 1 - d / 0.9, cx = X + k.u * w * 0.46, cy = by - k.v * h * 0.8;
      c.strokeStyle = `rgba(255,236,190,${0.85 * a})`; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - 22, cy + 4); c.lineTo(cx - 6, cy - 6); c.lineTo(cx + 6, cy + 5); c.lineTo(cx + 24, cy - 5); c.stroke(); c.lineCap = 'butt'; }
    c.restore();
    drawLoafScore(c, X, by, w, h, q, 1, 1);
    c.restore();
    if (turn <= 0 && cutP > 0.01) { c.fillStyle = 'rgba(40,18,4,.85)'; c.fillRect(X - 3, by - h * 1.02 * Math.min(1, cutP * 1.1), 6, h * 1.02 * Math.min(1, cutP * 1.1)); }
  }
  if (turn > 0) {
    const fx = X + lerp(0, 150, turn), fw = lerp(w * 0.5, w, turn);
    c.save(); crumbFace(c, fx, by, fw, h * lerp(0.99, 1, turn), q, turn); c.restore();
  }
  // steam
  const st = (1 - 0.8 * seg(tau, 45.5, 49.9)) * (turn < 1 ? 1 : 0.7);
  const ox = turn > 0 ? lerp(0, 150, turn) : 0;
  c.lineCap = 'round'; for (let i = 0; i < 6; i++) { const f = (tau * 0.35 + i / 6) % 1, sx = X + ox - 180 + i * 70; c.strokeStyle = `rgba(255,255,255,${0.30 * st * Math.sin(Math.PI * f)})`; c.lineWidth = 14; c.beginPath();
    c.moveTo(sx, by - h - 10 - f * 20); c.bezierCurveTo(sx - 28, by - h - 60 - f * 80, sx + 28, by - h - 100 - f * 120, sx, by - h - 160 - f * 200); c.stroke(); } c.lineCap = 'butt';
  // knife
  const kin = ss(seg(tau, K.knifeIn - 0.8, K.knifeIn + 0.6)), saw = tau >= K.cut0 ? Math.sin((tau - K.cut0) * 26) * 30 * (1 - ss(seg(tau, K.cut1 - .1, K.cut1 + .1))) : 0;
  const kOut = ss(seg(tau, K.cut1 + 0.1, K.cut1 + 0.7));
  if (kin > 0.01 && kOut < 1) {
    const depth = tau >= K.cut0 ? cutP : 0, ky = lerp(-20, 330, kin) + 0, tipY = lerp(by - h - 150 - 90 * (1 - kin), by - 10, depth) - 0;
    c.save(); c.translate(X + 20 + saw + kOut * 500, lerp(by - h - 120 - 380 * (1 - kin), by - 70, depth) - kOut * 300); c.rotate(-0.14);
    const bl = 360, bh = 64;
    c.beginPath(); c.moveTo(-bl / 2, 0); c.lineTo(bl / 2, 0); c.lineTo(bl / 2, bh * 0.5); c.lineTo(bl / 2 - 20, bh); for (let i = 0; i < 24; i++) c.lineTo(bl / 2 - 20 - (i + 0.5) * (bl - 40) / 24, bh - 8 * (i % 2 ? 0 : 1)); c.lineTo(-bl / 2, bh * 0.8); c.closePath();
    c.fillStyle = lin(c, 0, 0, 0, bh, [[0, '#f3f5f8'], [1, '#aeb4be']]); c.fill();
    rr(c, bl / 2 - 4, 4, 150, 50, 14); c.fillStyle = '#5a3a24'; c.fill(); c.fillStyle = '#d8d2c2'; c.beginPath(); c.arc(bl / 2 + 40, 29, 5, 0, TAU); c.arc(bl / 2 + 100, 29, 5, 0, TAU); c.fill();
    c.restore();
  }
}

// ------------------------------------------------------------------ assembly
const visible = (cam, x, r) => Math.abs(x - cam.cx) < 960 / cam.z + r;
export function drawWorld(c, tau, cam) {
  drawCounter(c, cam);
  if (visible(cam, ST.jar, 700)) drawJar(c, tau);
  if (visible(cam, ST.bowl, 700)) drawBowl(c, tau);
  if (visible(cam, ST.board, 700)) drawBoard(c, tau);
  if (visible(cam, ST.proof, 700)) drawProof(c, tau);
  if (visible(cam, ST.oven, 700)) drawOven(c, tau);
  if (visible(cam, ST.cut, 800)) drawCutStation(c, tau, false);
}
// subjects drawn again over the comments (the picture shows through the crowd)
export function drawSubjects(c, tau, cam) {
  if (visible(cam, ST.jar, 400)) drawJar(c, tau);
  if (visible(cam, ST.bowl, 400)) drawBowl(c, tau);
  if (visible(cam, ST.board, 400)) drawBoard(c, tau);
  if (visible(cam, ST.proof, 400)) drawProof(c, tau);
  if (visible(cam, ST.oven, 400)) drawOvenLoafOnly(c, tau);
  if (visible(cam, ST.cut, 600)) drawCutStation(c, tau, true);
}
