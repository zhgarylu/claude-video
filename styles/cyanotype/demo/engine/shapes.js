// Things that are laid on the paper. Every shape draws twice from the same geometry:
//   mode 'mask'  -> grey transmission (0 = opaque, 255 = clear); the darker the grey the less UV gets through
//   mode 'color' -> what the object looks like in the room (for the sprites that fall, lie and lift)
import { clamp, lerp } from '/core/lib.js';

const bez = (P, s) => {
  const u = 1 - s, a = u * u * u, b = 3 * u * u * s, c = 3 * u * s * s, d = s * s * s;
  return [a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]];
};
const bezT = (P, s) => {
  const u = 1 - s;
  const x = 3 * u * u * (P[1][0] - P[0][0]) + 6 * u * s * (P[2][0] - P[1][0]) + 3 * s * s * (P[3][0] - P[2][0]);
  const y = 3 * u * u * (P[1][1] - P[0][1]) + 6 * u * s * (P[2][1] - P[1][1]) + 3 * s * s * (P[3][1] - P[2][1]);
  const l = Math.hypot(x, y) || 1; return [x / l, y / l];
};
const gray = v => `rgb(${v},${v},${v})`;

// a lobed leaflet: base point, direction angle, length, half-width, a little curl
function blade(c, bx, by, ang, len, wid, curl, lobes, ph, fill, vein) {
  const ca = Math.cos(ang), sa = Math.sin(ang), n = 12, top = [], bot = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n, hw = wid * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.85) * (1 + 0.28 * Math.sin(u * lobes * 6.283 + ph));
    const off = curl * u * u * len, px = u * len, py = off;
    const X = bx + px * ca - py * sa, Y = by + px * sa + py * ca, nx = -sa, ny = ca;
    top.push([X + nx * (hw + 0), Y + ny * (hw + 0)]); bot.push([X - nx * hw, Y - ny * hw]);
  }
  c.beginPath(); c.moveTo(top[0][0], top[0][1]);
  for (const p of top) c.lineTo(p[0], p[1]);
  for (let k = n; k >= 0; k--) c.lineTo(bot[k][0], bot[k][1]);
  c.closePath(); c.fillStyle = fill; c.fill();
  if (vein) {
    c.strokeStyle = vein; c.lineWidth = Math.max(0.8, wid * 0.12); c.beginPath();
    for (let k = 0; k <= n - 1; k++) { const u = k / n, off = curl * u * u * len, X = bx + u * len * ca - off * sa, Y = by + u * len * sa + off * ca; k ? c.lineTo(X, Y) : c.moveTo(X, Y); }
    c.stroke();
  }
}

// a pinnate fern frond along bezier P
export function frond(c, P, o = {}) {
  const { pairs = 22, Lmax = 150, wmax = 0.17, mode = 'color', g = 24, seed = 1, lobes = 4, hue = 0 } = o;
  const mask = mode === 'mask';
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  // rachis
  c.strokeStyle = mask ? gray(0) : `rgb(${88 + hue},${104},62)`; c.lineWidth = o.stem || 7;
  c.beginPath(); for (let k = 0; k <= 30; k++) { const p = bez(P, k / 30); k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke();
  for (let i = 0; i < pairs; i++) {
    const s = 0.07 + 0.91 * (i / (pairs - 1)), p = bez(P, s), t = bezT(P, s), ang0 = Math.atan2(t[1], t[0]);
    const taper = 0.12 + 0.88 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + 0.94 * Math.pow(s, 0.9))), 0.85);
    const L = Lmax * taper;
    const t2 = bezT(P, Math.min(1, s + 0.06)), t1 = bezT(P, Math.max(0, s - 0.06)), turn = Math.sign(t1[0] * t2[1] - t1[1] * t2[0]) || 1;   // which side is the inside of the curve
    for (const side of [-1, 1]) {
      const inner = side === turn ? 0.55 : 1;
      const jit = Math.sin(i * 12.9898 + side * 78.233 + seed * 3.1) * 0.5;
      const ang = ang0 + side * (1.25 - 0.3 * s + jit * 0.12), len = L * (0.92 + jit * 0.12) * inner;
      const fill = mask ? gray(g) : `rgb(${Math.round(lerp(62, 112, s) + hue)},${Math.round(lerp(104, 150, s))},${Math.round(lerp(54, 66, s))})`;
      blade(c, p[0], p[1], ang, len, len * wmax, -side * 0.18, lobes, i * 1.7 + side + seed, fill, mask ? null : 'rgba(210,225,150,.55)');
    }
  }
  // the curled tip
  const tp = bez(P, 1); c.fillStyle = mask ? gray(g) : 'rgb(120,156,66)'; c.beginPath(); c.arc(tp[0], tp[1], 5, 0, 6.283); c.fill();
  c.restore();
}

// a quill feather along the quadratic Q = [[x,y],[x,y],[x,y]]
export function feather(c, Q, o = {}) {
  const { Lmax = 150, mode = 'color', g = 120, seed = 1, barbs = 120 } = o;
  const mask = mode === 'mask';
  const at = s => { const u = 1 - s; return [u * u * Q[0][0] + 2 * u * s * Q[1][0] + s * s * Q[2][0], u * u * Q[0][1] + 2 * u * s * Q[1][1] + s * s * Q[2][1]]; };
  const tg = s => { const u = 1 - s, x = 2 * u * (Q[1][0] - Q[0][0]) + 2 * s * (Q[2][0] - Q[1][0]), y = 2 * u * (Q[1][1] - Q[0][1]) + 2 * s * (Q[2][1] - Q[1][1]); const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  c.save(); c.lineCap = 'round';
  for (const side of [-1, 1]) {
    for (let i = 0; i < barbs; i++) {
      const s = 0.14 + 0.86 * (i / (barbs - 1)), p = at(s), t = tg(s), a0 = Math.atan2(t[1], t[0]);
      const split = Math.sin(s * 9.3 + seed * 2.0 + side) > 0.93;       // a feather's vane parts here and there
      const prof = Math.pow(Math.sin(Math.PI * Math.pow(s, 0.7)), 0.7), L = Lmax * (0.25 + 0.75 * prof) * (0.9 + 0.2 * Math.sin(i * 7.7 + side * 3 + seed));
      const ang = a0 + side * (0.95 - 0.3 * s) + (split ? side * 0.3 : 0) + Math.sin(i * 3.1 + seed) * 0.03;
      const ex = p[0] + Math.cos(ang) * L, ey = p[1] + Math.sin(ang) * L;
      const bx = p[0] + Math.cos(ang - side * 0.28) * L * 0.55, by = p[1] + Math.sin(ang - side * 0.28) * L * 0.55;
      c.strokeStyle = mask ? gray(g) : (side > 0 ? 'rgba(238,232,214,.92)' : 'rgba(224,220,204,.92)'); c.lineWidth = mask ? 3.2 : 2.6;
      c.beginPath(); c.moveTo(p[0], p[1]); c.quadraticCurveTo(bx, by, ex, ey); c.stroke();
    }
  }
  c.strokeStyle = mask ? gray(0) : 'rgb(170,160,140)'; c.lineWidth = o.shaft || 4.5; c.beginPath();
  for (let k = 0; k <= 24; k++) { const p = at(k / 24); k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke();
  c.restore();
}

// a ginkgo-like fan leaf: origin at the stalk, pointing up the +x axis
export function fan(c, x, y, ang, R, o = {}) {
  const { mode = 'color', g = 30 } = o, mask = mode === 'mask';
  c.save(); c.translate(x, y); c.rotate(ang);
  c.strokeStyle = mask ? gray(0) : 'rgb(110,120,60)'; c.lineWidth = R * 0.03 + 1.5; c.beginPath(); c.moveTo(-R * 0.5, 0); c.lineTo(0, 0); c.stroke();
  c.beginPath(); const n = 28;
  c.moveTo(0, 0);
  for (let k = 0; k <= n; k++) { const a = -1.0 + 2.0 * (k / n), notch = 1 - 0.28 * Math.exp(-(a * a) / 0.01); c.lineTo(Math.cos(a) * R * notch * (0.96 + 0.04 * Math.sin(k * 2.7)), Math.sin(a) * R * notch * (0.96 + 0.04 * Math.sin(k * 2.7))); }
  c.closePath(); c.fillStyle = mask ? gray(g) : 'rgb(150,170,60)'; c.fill();
  if (!mask) { c.strokeStyle = 'rgba(70,90,30,.45)'; c.lineWidth = 1; for (let k = 0; k < 16; k++) { const a = -1 + 2 * k / 15; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95); c.stroke(); } }
  c.restore();
}

// a flower umbel (cow-parsley / lace flower): stem up, rays out, tiny florets
export function umbel(c, x, y, R, o = {}) {
  const { mode = 'color', seed = 3, g = 50 } = o, mask = mode === 'mask';
  c.save(); c.translate(x, y);
  c.strokeStyle = mask ? gray(0) : 'rgb(120,130,80)'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, R * 2.1); c.quadraticCurveTo(R * 0.08, R * 1.2, 0, 0); c.stroke();
  const rays = 17;
  for (let i = 0; i < rays; i++) {
    const a = -Math.PI / 2 + (i / (rays - 1) - .5) * 2.7, ex = Math.cos(a) * R, ey = Math.sin(a) * R * 0.85;
    c.strokeStyle = mask ? gray(0) : 'rgb(130,140,90)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 0); c.lineTo(ex, ey); c.stroke();
    for (let j = 0; j < 7; j++) { const aa = a + (j - 3) * 0.16, fx = ex + Math.cos(aa) * R * 0.2, fy = ey + Math.sin(aa) * R * 0.17;
      c.strokeStyle = mask ? gray(0) : 'rgb(130,140,90)'; c.lineWidth = 1; c.beginPath(); c.moveTo(ex, ey); c.lineTo(fx, fy); c.stroke();
      c.fillStyle = mask ? gray(g) : 'rgb(238,236,222)'; c.beginPath(); c.arc(fx, fy, R * 0.05 + 2, 0, 6.283); c.fill(); }
  }
  c.restore();
}

// a grass spray: blades arching out of one point
export function grass(c, x, y, R, o = {}) {
  const { mode = 'color', g = 20, n = 11, seed = 2 } = o, mask = mode === 'mask';
  c.save(); c.translate(x, y); c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / (n - 1) - .5) * 1.9 + Math.sin(i * 4.1 + seed) * 0.1, L = R * (0.7 + 0.3 * Math.sin(i * 2.3 + seed)), bend = (i % 2 ? 1 : -1) * 0.5 * L * (0.4 + 0.6 * Math.abs(Math.sin(i * 1.3)));
    const ex = Math.cos(a) * L, ey = Math.sin(a) * L, mx = Math.cos(a) * L * 0.5 + Math.sin(a) * -bend * 0.4, my = Math.sin(a) * L * 0.5 + Math.cos(a) * bend * 0.4;
    c.strokeStyle = mask ? gray(g) : `rgb(${100 + i * 4},${130 + (i % 3) * 8},70)`; c.lineWidth = 7 - Math.abs(i - n / 2) * 0.35;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
  }
  c.restore();
}

// a cut-paper plan of a small house: walls as thin bars with door gaps, rooms as windows of clear paper
export function plan(c, x, y, W, Hh, o = {}) {
  const { mode = 'color', t = 9 } = o, mask = mode === 'mask', ink = mask ? gray(0) : 'rgb(46,52,60)';
  c.save(); c.translate(x, y); c.fillStyle = ink;
  const bar = (x0, y0, x1, y1) => c.fillRect(Math.min(x0, x1) - (y0 === y1 ? 0 : t / 2), Math.min(y0, y1) - (x0 === x1 ? 0 : t / 2), Math.abs(x1 - x0) + (y0 === y1 ? 0 : t), Math.abs(y1 - y0) + (x0 === x1 ? 0 : t));
  bar(0, 0, W * 0.42, 0); bar(W * 0.55, 0, W, 0); bar(0, Hh, W, Hh); bar(0, 0, 0, Hh); bar(W, 0, W, Hh);
  bar(W * 0.48, 0, W * 0.48, Hh * 0.38); bar(W * 0.48, Hh * 0.62, W * 0.48, Hh); bar(W * 0.48, Hh * 0.5, W, Hh * 0.5); bar(0, Hh * 0.55, W * 0.28, Hh * 0.55);
  for (const [dx, dy] of [[0.12, 0.2], [0.7, 0.2], [0.7, 0.78]]) { c.fillRect(W * dx - 18, dy * Hh - 18, 36, 36); }
  c.restore();
}
