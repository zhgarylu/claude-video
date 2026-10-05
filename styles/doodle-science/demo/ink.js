// Pen-and-wash doodle engine (canvas 2D, deterministic): wobbly ink lines that draw on, transparent washes that bloom, paper, and a few cast members.
import { clamp, seg, ss, hash, TAU } from '/core/lib.js';
export const INK = '#2b2622', PAPER = '#f4efe4';
const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------ geometry
export const ell = (cx, cy, rx, ry, a0 = 0, a1 = TAU, n = 36) => Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
export const bez = (p0, p1, p2, p3, n = 22) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; });
export const quad = (p0, p1, p2, n = 18) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; });
export function smooth(pts, per = 8) {                                           // Catmull-Rom through the control points
  const o = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) { const t = k / per, t2 = t * t, t3 = t2 * t; o.push([.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3), .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); }
  }
  o.push(pts[pts.length - 1]); return o;
}
export function loop(pts, per = 8) { const n = pts.length, c = [pts[n - 1], ...pts, pts[0], pts[1]], o = []; for (let i = 1; i <= n; i++) { const p0 = c[i - 1], p1 = c[i], p2 = c[i + 1], p3 = c[i + 2]; for (let k = 0; k < per; k++) { const t = k / per, t2 = t * t, t3 = t2 * t; o.push([.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3), .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); } } o.push(o[0]); return o; }
export const blob = (cx, cy, r, seed = 1, wob = .12, n = 9) => loop(Array.from({ length: n }, (_, i) => { const a = i / n * TAU, k = 1 + (hash(seed * 7 + i) - .5) * 2 * wob; return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]; }));
const resample = (pts, step = 5) => {
  const o = [pts[0]], L = [0]; let acc = 0, cur = pts[0];
  for (let i = 1; i < pts.length; i++) { let [x, y] = pts[i]; let dx = x - cur[0], dy = y - cur[1], d = Math.hypot(dx, dy); while (d >= step) { const k = step / d; cur = [cur[0] + dx * k, cur[1] + dy * k]; acc += step; o.push(cur); L.push(acc); dx = x - cur[0]; dy = y - cur[1]; d = Math.hypot(dx, dy); } }
  const last = pts[pts.length - 1]; if (Math.hypot(last[0] - cur[0], last[1] - cur[1]) > 1) { acc += Math.hypot(last[0] - cur[0], last[1] - cur[1]); o.push(last); L.push(acc); }
  return { p: o, L, len: acc };
};
const cache = new Map();
const rs = (pts, step) => { let r = cache.get(pts); if (!r || r.step !== step) { r = resample(pts, step); r.step = step; cache.set(pts, r); } return r; };
export const pathLen = pts => rs(pts, 5).len;

// ------------------------------------------------------------------ ink
// A pen line: wobbles (a slow, per-seed offset), boils 12 times a second, thick in the middle, drawn on from the start up to p.
export function pen(g, pts, o = {}) {
  const { w = 4, col = INK, p = 1, t = 0, seed = 1, boil = .9, amp = 1.3, alpha = 1, from = 0 } = o;
  if (p <= 0 || pts.length < 2) return;
  const r = rs(pts, 5), n = r.p.length, end = Math.max(1, Math.round((n - 1) * clamp(p))), st = Math.floor((n - 1) * clamp(from)), f = Math.floor(t * 12), ph1 = hash(seed + f * .31) * 6.28, ph2 = hash(seed * 1.7 + f * .53) * 6.28, s1 = hash(seed) * 6.28, s2 = hash(seed + 9) * 6.28;
  g.save(); g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha = alpha;
  let px = 0, py = 0;
  for (let i = st; i <= end; i++) {
    const q = r.p[i], u = r.L[i] / (r.len || 1), wob = Math.sin(i * .21 + s1) * amp + Math.sin(i * .07 + s2) * amp * 1.4, bo = (Math.sin(i * .5 + ph1) + Math.sin(i * .19 + ph2)) * .5 * boil;
    // the normal of the line
    const a = r.p[Math.max(0, i - 1)], b = r.p[Math.min(n - 1, i + 1)]; let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    const x = q[0] + nx * (wob + bo), y = q[1] + ny * (wob + bo);
    if (i > st) { const tp = Math.min(1, Math.min(u, 1 - u) * r.len / 14), lw = w * (.7 + .3 * Math.sin(i * .13 + s1)) * (.45 + .55 * tp); g.lineWidth = lw; g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke(); }
    px = x; py = y;
  }
  g.restore();
}
export const dotted = (g, pts, o = {}) => { const r = rs(pts, 14); g.save(); g.fillStyle = o.col || INK; for (let i = 0; i < r.p.length * clamp(o.p ?? 1); i++) { g.beginPath(); g.arc(r.p[i][0], r.p[i][1], o.r || 3, 0, TAU); g.fill(); } g.restore(); };
// A wash: a transparent patch of colour, slightly off the line, dark at its dried rim, blooming from its centre as p goes 0 -> 1.
export function wash(g, pts, o = {}) {
  const { col = '#8ab4d8', a = .55, p = 1, dx = 3, dy = 2, solid = false, rim = true } = o;
  if (p <= 0) return;
  let cx = 0, cy = 0; for (const q of pts) { cx += q[0]; cy += q[1]; } cx /= pts.length; cy /= pts.length;
  const k = ss(p) * (.85 + .15 * ss(p)), path = new Path2D();
  pts.forEach((q, i) => { const x = cx + (q[0] - cx) * k + dx, y = cy + (q[1] - cy) * k + dy; i ? path.lineTo(x, y) : path.moveTo(x, y); }); path.closePath();
  g.save(); g.globalCompositeOperation = solid ? 'source-over' : 'multiply'; g.fillStyle = col; g.globalAlpha = solid ? Math.min(1, p * 1.6) : a * Math.min(1, p * 2);
  g.fill(path);
  if (!solid) { g.globalAlpha = a * .3 * Math.min(1, p * 2); const p2 = new Path2D(); pts.forEach((q, i) => { const x = cx + (q[0] - cx) * k * .97 + dx * 3 + 4, y = cy + (q[1] - cy) * k * .97 + dy * 3 + 3; i ? p2.lineTo(x, y) : p2.moveTo(x, y); }); p2.closePath(); g.fill(p2); }
  if (rim && !solid) { g.globalAlpha = a * .5 * Math.min(1, p * 2); g.strokeStyle = col; g.lineWidth = 3; g.stroke(path); }
  g.restore();
}
// shapes drawn in one call: outline in ink (draws on over [t0,t0+d]), wash blooms after
export function shape(g, pts, o = {}) {
  const { col, a = .55, p = 1, c = p, w = 4, seed = 1, t = 0, ink = true, solid = false } = o;
  if (col) wash(g, pts, { col, a, p: c, solid, dx: o.dx ?? 3, dy: o.dy ?? 2 });
  if (ink) pen(g, pts, { w, p, seed, t, col: o.ink || INK, boil: o.boil });
}

// ------------------------------------------------------------------ the page
let paperC = null;
export function paper(g, W, H, t = 0) {
  if (!paperC) {
    paperC = document.createElement('canvas'); paperC.width = W; paperC.height = H; const c = paperC.getContext('2d');
    c.fillStyle = PAPER; c.fillRect(0, 0, W, H);
    const sm = document.createElement('canvas'); sm.width = 54; sm.height = 96; const s = sm.getContext('2d'), im = s.createImageData(54, 96);
    for (let y = 0; y < 96; y++) for (let x = 0; x < 54; x++) { const v = (hash(x * 12.9 + y * 78.2) * .5 + hash(x * 3.1 + y * 1.7 + 50) * .5), i = (y * 54 + x) * 4, d = (v - .5) * 22; im.data[i] = 250 + d * .5; im.data[i + 1] = 246 + d * .5; im.data[i + 2] = 238 + d * .5; im.data[i + 3] = 255; }
    s.putImageData(im, 0, 0); c.save(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = .55; c.imageSmoothingEnabled = true; c.drawImage(sm, 0, 0, W, H); c.restore();
    const tt = document.createElement('canvas'); tt.width = tt.height = 128; const q = tt.getContext('2d'), im2 = q.createImageData(128, 128);
    for (let i = 0; i < 128 * 128; i++) { const d = (hash(i * .73) - .5) * 26; im2.data[i * 4] = 238 + d; im2.data[i * 4 + 1] = 234 + d; im2.data[i * 4 + 2] = 224 + d; im2.data[i * 4 + 3] = 255; }
    q.putImageData(im2, 0, 0); c.save(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = .5; c.fillStyle = c.createPattern(tt, 'repeat'); c.fillRect(0, 0, W, H); c.restore();
    const gr = c.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(120,95,60,.16)'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
  }
  g.drawImage(paperC, 0, 0);
}

// ------------------------------------------------------------------ text written on the page
export function write(g, text, x, y, o = {}) {
  const { size = 56, col = INK, p = 1, font = 'Ma Shan Zheng', align = 'left', halo = 0, w } = o;
  g.save(); g.font = `${size}px "${font}"`; g.textAlign = align; g.textBaseline = 'alphabetic';
  const tw = g.measureText(text).width, x0 = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
  g.beginPath(); g.rect(x0 - 10, y - size * 1.2, (tw + 20) * clamp(p), size * 1.8); g.clip();
  if (halo) { g.lineJoin = 'round'; g.strokeStyle = PAPER; g.lineWidth = halo; g.strokeText(text, x, y); }
  g.fillStyle = col; g.fillText(text, x, y); g.restore();
  return { x0, x1: x0 + tw, y0: y - size * .95, y1: y + size * .3, w: tw };
}

// ------------------------------------------------------------------ cast
const SKIN = '#f1c9a0', TEAL = '#58aaa3', HAIR = '#2a2630', SUN = '#f6c545', ORANGE = '#ee8a3a';
const dir = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
function limb(g, a, b, c, wid, o) {                                        // a sleeve: two edges either side of a curve a-b-c, a wash between, then the lines
  const mid = quad(a, b, c, 14), L = mid.length, up = [], dn = [];
  mid.forEach((q, i) => { const n = dir(mid[Math.max(0, i - 1)], mid[Math.min(L - 1, i + 1)]), k = wid * (.5 + .12 * (1 - i / L)); up.push([q[0] + n[0] * k, q[1] + n[1] * k]); dn.push([q[0] - n[0] * k, q[1] - n[1] * k]); });
  const poly = [...up, ...dn.reverse()];
  wash(g, poly, { col: o.col || TEAL, a: .8, p: o.c, dx: 2, dy: 2 });
  pen(g, up.slice(), { w: 4, p: o.p, seed: o.seed, t: o.t }); pen(g, dn.slice().reverse(), { w: 4, p: o.p, seed: o.seed + 3, t: o.t });
  return c;
}
function hand(g, at, o) { const pts = blob(at[0], at[1], 22, o.seed, .1, 8); wash(g, pts, { col: SKIN, a: .9, p: o.c, dx: 1, dy: 1 }); pen(g, pts, { w: 4, p: o.p, seed: o.seed, t: o.t }); }
// The host, "Xiao Man": big round head, black bob, round glasses, a teal hoodie with a star. Drawn from the head centre; 1 unit = 1 px at s = 1.
export function host(g, o = {}) {
  const { x = 540, y = 900, s = 1, pose = 'talk', talk = 0, look = [0, 0], brow = 0, p = 1, c = p, t = 0, flip = 1, seed = 11, body = 1 } = o;
  g.save(); g.translate(x, y); g.scale(s * flip, s);
  const P = (a, b) => clamp((p - a) / (b - a)), cc = P(.55, 1), k = { p: 1, c: 1, t, seed };
  const ink = (pts, w, a, b, sd = 0) => pen(g, pts, { w, p: P(a, b), t, seed: seed + sd });
  // body first (head overlaps it)
  if (body) {
    const sh = [[-26, 106], [-34, 116], [-118, 140], [-136, 220], [-132, 330], [132, 330], [136, 220], [118, 140], [34, 116], [26, 106]];
    wash(g, loop(sh.slice(0, -1), 6), { col: TEAL, a: .8, p: cc, dx: 2, dy: 2 });
    ink(smooth([[-26, 106], [-60, 124], [-118, 140], [-136, 220], [-132, 330]], 6), 4, .2, .45, 1); ink(smooth([[26, 106], [60, 124], [118, 140], [136, 220], [132, 330]], 6), 4, .2, .45, 2);
    ink(quad([-48, 112], [0, 150], [48, 112]), 4, .3, .45, 3);                                                                       // hood edge
    ink([[-18, 150], [-20, 200]], 3.5, .4, .5, 4); ink([[18, 150], [20, 196]], 3.5, .4, .5, 5);                                   // strings
    const star = Array.from({ length: 11 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 24; return [Math.cos(a) * r - 0, 262 + Math.sin(a) * r]; });
    wash(g, star, { col: '#f6e7a0', a: .95, p: cc, solid: true, rim: false }); ink(star, 3.5, .5, .6, 6);
  }
  // arms
  const hp = P(.35, .7), pr = P(.6, 1);
  const armR = { point: [[112, 150], [190, 130], [196, 36]], talk: [[112, 150], [190, 230], [176, 250]], think: [[112, 150], [140, 250], [130, 330]], wave: [[112, 150], [206, 150], [212, 66]] }[pose] || [[112, 150], [140, 250], [130, 330]];
  const armL = { point: [[-112, 150], [-146, 250], [-134, 330]], talk: [[-112, 150], [-190, 230], [-176, 250]], think: [[-112, 150], [-150, 300], [-34, 120]], wave: [[-112, 150], [-146, 250], [-134, 330]] }[pose] || [[-112, 150], [-146, 250], [-134, 330]];
  if (body) { limb(g, armR[0], armR[1], armR[2], 40, { p: hp, c: pr, seed: seed + 20, t }); hand(g, armR[2], { p: hp, c: pr, seed: seed + 22, t }); limb(g, armL[0], armL[1], armL[2], 40, { p: hp, c: pr, seed: seed + 30, t }); hand(g, armL[2], { p: hp, c: pr, seed: seed + 32, t }); }
  // head
  const head = ell(0, 0, 100, 92, 0, TAU, 40);
  wash(g, head, { col: SKIN, a: .9, p: cc, dx: 2, dy: 2 }); ink(head, 4.5, 0, .25, 40);
  // hair: a dark cap with a fringe, and the two sides of the bob
  const cap = [...ell(0, -8, 112, 102, Math.PI, Math.PI * 2, 18), [96, -6], [84, -24], [60, -4], [34, -34], [8, -8], [-20, -40], [-48, -10], [-76, -34], [-100, -8]];
  const sideL = [[-110, -20], [-122, 40], [-108, 96], [-84, 82], [-90, 20]], sideR = sideL.map(([a, b]) => [-a, b]);
  for (const sd of [cap, loop(sideL, 5), loop(sideR, 5)]) wash(g, sd, { col: HAIR, a: .95, p: cc, solid: true, rim: false, dx: 0, dy: 0 });
  ink(cap, 4, .05, .3, 41);
  // face
  const lx = look[0] * 6, ly = look[1] * 5;
  for (const sx of [-1, 1]) {
    const gl = ell(sx * 41, 12, 29, 27, 0, TAU, 24); wash(g, gl, { col: '#ffffff', a: .5, p: cc, solid: false, rim: false, dx: 0, dy: 0 }); ink(gl, 4, .25, .45, 42 + sx);
    g.save(); g.globalAlpha = P(.3, .5); g.fillStyle = INK; g.beginPath(); g.ellipse(sx * 41 + lx, 12 + ly, 6.5, 8 * (1 - .9 * (Math.floor(t * 12) % 70 === 3 ? 1 : 0)), 0, 0, TAU); g.fill(); g.restore();
    ink(quad([sx * 22, -32 - brow * 8], [sx * 42, -42 - brow * 12], [sx * 62, -32 - brow * 4 * sx * 0]), 3.5, .3, .45, 44 + sx);
    const ch = blob(sx * 64, 48, 17, seed + sx, .1, 7); wash(g, ch, { col: '#f08a8a', a: .45, p: cc, dx: 0, dy: 0, rim: false });
  }
  ink([[-12, 12], [12, 12]], 3.5, .3, .4, 46); ink([[0, 30], [-5, 38], [3, 40]], 3, .35, .45, 47);
  const mo = clamp(talk);
  if (mo > .08) { const m = ell(0, 56, 18, 5 + mo * 15, 0, TAU, 20); wash(g, m, { col: '#8c2f3a', a: 1, p: cc, solid: true, rim: false, dx: 0, dy: 0 }); ink(m, 3.5, .35, .5, 48); }
  else ink(quad([-18, 52], [0, 66], [18, 52]), 3.5, .35, .5, 48);
  g.restore();
}
export function sun(g, o = {}) {
  const { x = 200, y = 250, r = 70, p = 1, c = p, t = 0, seed = 5, face = 1, mood = 'smile', rays = 12, col = SUN } = o, P = (a, b) => clamp((p - a) / (b - a));
  g.save(); g.translate(x, y);
  const ray = []; for (let i = 0; i < rays * 2; i++) { const a = i / (rays * 2) * TAU + Math.sin(t * .8) * .04, rr = i % 2 ? r * 1.2 : r * 1.55; ray.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  wash(g, ray, { col: '#f9d77a', a: .6, p: c, dx: 0, dy: 0 }); pen(g, [...ray, ray[0]], { w: 4, p: P(.4, 1), t, seed });
  const d = blob(0, 0, r, seed, .03, 12); wash(g, d, { col, a: .9, p: c }); pen(g, d, { w: 5, p: P(0, .4), t, seed: seed + 1 });
  if (face) {
    for (const sx of [-1, 1]) { pen(g, quad([sx * r * .45 - 12, -r * .12], [sx * r * .45, -r * .34], [sx * r * .45 + 12, -r * .12]), { w: 4, p: P(.4, .6), t, seed: seed + 2 + sx }); const ch = blob(sx * r * .66, r * .28, r * .2, seed + sx, .1, 7); wash(g, ch, { col: '#f08a6a', a: .5, p: c, rim: false }); }
    pen(g, mood === 'smile' ? quad([-r * .4, r * .22], [0, r * .72], [r * .4, r * .22]) : quad([-r * .3, r * .42], [0, r * .3], [r * .3, r * .42]), { w: 4, p: P(.5, .7), t, seed: seed + 4 });
  }
  g.restore();
}
export function molecule(g, x, y, o = {}) {
  const { r = 24, p = 1, t = 0, seed = 3, col = '#c9bfe8', hit = 0 } = o;
  const bx = x + Math.sin(t * 2 + seed) * 3, by = y + Math.cos(t * 1.6 + seed * 2) * 3, b = blob(bx, by, r * (1 + hit * .18), seed, .08, 9);
  wash(g, b, { col, a: .85, p, dx: 1, dy: 1 }); pen(g, b, { w: 3.2, p, t, seed, boil: .6 });
  if (p > .6) { g.save(); g.fillStyle = INK; for (const sx of [-1, 1]) { g.beginPath(); g.arc(bx + sx * r * .36, by - r * .12, 2.6, 0, TAU); g.fill(); } g.restore(); pen(g, hit > .2 ? ell(bx, by + r * .3, r * .12, r * .16, 0, TAU, 10) : quad([bx - r * .2, by + r * .26], [bx, by + r * .4], [bx + r * .2, by + r * .26]), { w: 2.6, p: 1, t, seed: seed + 1, boil: .3 }); }
}
// a little spark of light that carries a colour: a bullet with two eyes and a tail
export function photon(g, x, y, ang, o = {}) {
  const { r = 15, col = '#4a90d9', t = 0, seed = 2, alpha = 1, tail = 36 } = o;
  g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha = alpha;
  const body = ell(0, 0, r * 1.3, r, 0, TAU, 14);
  pen(g, [[-tail - r, 0], [-r, 0]], { w: 3, col, t, seed, alpha: .6, boil: .4, amp: 0 });
  wash(g, body, { col, a: .95, p: 1, dx: 0, dy: 0, solid: false }); pen(g, body, { w: 3, t, seed, boil: .4 });
  g.fillStyle = INK; for (const sy of [-1, 1]) { g.beginPath(); g.arc(r * .5, sy * r * .3, 2.2, 0, TAU); g.fill(); }
  g.restore();
}
export const wavy = (x0, y0, x1, y1, wl, amp, ph = 0, n = 90) => { const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L; return Array.from({ length: n + 1 }, (_, i) => { const s = i / n * L, a = Math.sin(s / wl * TAU + ph) * amp; return [x0 + ux * s - uy * a, y0 + uy * s + ux * a]; }); };
export function eye(g, x, y, o = {}) { const { s = 1, p = 1, t = 0, seed = 8, look = [0, -1] } = o; g.save(); g.translate(x, y); g.scale(s, s); const out = smooth([[-90, 0], [-45, -38], [0, -48], [45, -38], [90, 0], [45, 34], [0, 42], [-45, 34], [-90, 0]], 6); wash(g, out, { col: '#fff', a: 1, p, solid: true, rim: false, dx: 0, dy: 0 }); pen(g, out, { w: 5, p, t, seed }); wash(g, blob(look[0] * 8, look[1] * 6, 32, seed, .03, 10), { col: '#6bb1d6', a: .9, p, dx: 0, dy: 0 }); g.fillStyle = INK; g.beginPath(); g.arc(look[0] * 8, look[1] * 6, 14 * clamp(p * 2), 0, TAU); g.fill(); g.restore(); }
