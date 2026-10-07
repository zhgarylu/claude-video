// Era Scroll engine: one long strip made of "eras", a courier who always walks at the same pace, a torn-paper edge
// that sweeps in from the right, era particles, a year plate. Everything is a pure function of time.
//
//   drawWorld(g, S)      composite the visible eras right-to-left, each clipped by the torn edge of the next one
//   walker(g, o)         the courier rig (profile, walk cycle, two-bone arms, scarf, satchel, message tag)
//   plate(g, ...)        the year / caption plate (odometer flip)
//   bake / noiseTile / texFill / blob / rr / hatch / mixc   helpers the era painters share
//
// An era painter is a plain object: { id, paper, rim, bg(g,c), fg(g,c), pose(c), walk:{style}, token(g,c), burst, gags:[{x,len}], step }.
// `c` is the per-era context built by drawWorld: c.X(lx, k) local x -> screen x (k = parallax), c.at(g, k, fn) draws in local x,
// c.vis(k, pad) the visible local range, c.gp(i) progress 0..1 of gag i from the walker's position, c.wlx the walker's local x.
import { clamp, lerp, seg, ss, eio, eo, hash, vnoise, TAU, mulberry } from '/core/lib.js';
import { W, H, GY, WSX, FRONT, STRIDE } from './timeline.js';
export { W, H, GY, WSX };

// ------------------------------------------------------------------ small helpers
const CACHE = new Map();
export function bake(key, w, h, fn) {
  let c = CACHE.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); CACHE.set(key, c); }
  return c;
}
export const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
export const toHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
export const mixc = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => lerp(v, B[i], t))); };
export const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
export function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// irregular closed blob path (hand-made look): n points on an ellipse, radius jittered
export function blob(g, cx, cy, rx, ry, seed, n = 14, jit = .18) {
  const P = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + (hash(seed * 3.7 + i * 1.3) - .5) * 2 * jit; P.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  g.moveTo((P[0][0] + P[n - 1][0]) / 2, (P[0][1] + P[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) { const p = P[i], q = P[(i + 1) % n]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  g.closePath();
}
// parallel strokes clipped to the current path: engraving / woodcut hatching
export function hatch(g, bbox, ang, gap, lw, col, alpha = 1) {
  const [x0, y0, x1, y1] = bbox, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
  g.save(); g.clip(); g.strokeStyle = col; g.globalAlpha *= alpha; g.lineWidth = lw; g.beginPath();
  const ca = Math.cos(ang), sa = Math.sin(ang);
  for (let d = -R; d <= R; d += gap) { g.moveTo(cx + d * -sa - R * ca, cy + d * ca - R * sa); g.lineTo(cx + d * -sa + R * ca, cy + d * ca + R * sa); }
  g.stroke(); g.restore();
}
export const pick = (arr, n) => arr[Math.floor(hash(n * 9.13) * arr.length) % arr.length];

// tileable value noise (grayscale), used as paper / rock / canvas grain
export function noiseTile(seed, size = 256, cells = 8, oct = 3) {
  return bake(`nt${seed}_${size}_${cells}_${oct}`, size, size, (g) => {
    const id = g.createImageData(size, size), lats = [];
    for (let o = 0; o < oct; o++) { const n = cells << o, a = new Float32Array(n * n); for (let i = 0; i < n * n; i++) a[i] = hash(seed * 131.7 + o * 17.3 + i * 1.93); lats.push([n, a]); }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let v = 0, amp = 1, tot = 0;
      for (let o = 0; o < oct; o++) {
        const [n, a] = lats[o], fx = x / size * n, fy = y / size * n, ix = Math.floor(fx), iy = Math.floor(fy), ux = fx - ix, uy = fy - iy, sx = ux * ux * (3 - 2 * ux), sy = uy * uy * (3 - 2 * uy);
        const i0 = ix % n, i1 = (ix + 1) % n, j0 = iy % n, j1 = (iy + 1) % n;
        v += amp * lerp(lerp(a[j0 * n + i0], a[j0 * n + i1], sx), lerp(a[j1 * n + i0], a[j1 * n + i1], sx), sy); tot += amp; amp *= .55;
      }
      v /= tot; const p = (y * size + x) * 4; id.data[p] = id.data[p + 1] = id.data[p + 2] = Math.round(v * 255); id.data[p + 3] = 255;
    }
    g.putImageData(id, 0, 0);
  });
}
// fill a rect with a tiled texture: ox/oy scroll offsets, op = composite operation
export function texFill(g, tile, x, y, w, h, o = {}) {
  const p = g.createPattern(tile, 'repeat'), s = o.scale ?? 1;
  p.setTransform(new DOMMatrix().translate(o.ox ?? 0, o.oy ?? 0).scale(s));
  g.save(); g.globalAlpha *= o.alpha ?? .2; g.globalCompositeOperation = o.op ?? 'multiply'; g.fillStyle = p; g.fillRect(x, y, w, h); g.restore();
}
export const vignette = (g, a = .4, x0 = 0, x1 = W) => {
  const r = g.createRadialGradient((x0 + x1) / 2, H * .5, H * .35, (x0 + x1) / 2, H * .5, Math.hypot(x1 - x0, H) * .6);
  r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, `rgba(0,0,0,${a})`); g.fillStyle = r; g.fillRect(x0, 0, x1 - x0, H);
};

// ------------------------------------------------------------------ the torn edge
// profile of a torn paper edge in px (added to the edge's x), a deterministic function of y and of the boundary's seed
export const edgeDx = (seed, y) =>
  16 * (vnoise(y / 74 + seed * 7.7) - .5) * 2 + 7 * (vnoise(y / 17 + seed * 3.1) - .5) * 2 + 4 * (hash(Math.floor(y / 4) + seed * 13.1) - .5) * 2;
function edgePath(g, ex, seed, left) {
  g.moveTo(left, -12);
  for (let y = -12; y <= H + 12; y += 6) g.lineTo(ex + edgeDx(seed, y), y);
  g.lineTo(left, H + 12); g.closePath();
}
function edgeLine(g, ex, seed, off = 0) { g.beginPath(); for (let y = -12; y <= H + 12; y += 6) { const x = ex + edgeDx(seed, y) + off; y === -12 ? g.moveTo(x, y) : g.lineTo(x, y); } }

// ------------------------------------------------------------------ the courier
// base palette; an era style maps every colour through `col`
export const PAL = { skin: '#f1c39b', skin2: '#d9a57d', hair: '#3a2824', coat: '#2f4e8f', coat2: '#243c70', pants: '#c9a56a', pants2: '#a98650', shoe: '#5a3a28', scarf: '#e0453a', scarf2: '#b8332b', bag: '#b9783f', bag2: '#8f5a2c', cap: '#f0b83c', cap2: '#d29a22', white: '#fff8ea' };
const lum = c => (.299 * c[0] + .587 * c[1] + .114 * c[2]) / 255;
const RC = new Map();
// a style: { line, lw, rim, rw, ramp:[hex...] (colours -> luminance ramp), post: posterise ramp, off:[dx,dy] misregister fills, pixel:n }
export function styleCol(st, c) {
  if (!st.ramp) return c;
  const key = st.id + c; let r = RC.get(key); if (r) return r;
  const L = clamp(lum(hex(c)) * 1.1, 0, .999), n = st.ramp.length - 1; let f = L * n;
  if (st.post) f = Math.floor(f + .5); const i = Math.min(n - 1, Math.floor(f)); r = mixc(st.ramp[i], st.ramp[Math.min(n, i + 1)], f - i); RC.set(key, r); return r;
}
export const STY_FULL = { id: 'full', line: '#2b2430', lw: 4, rim: '#fff6e4', rw: 3 };
const ik = (S, T, l1, l2, flip) => {
  const dx = T[0] - S[0], dy = T[1] - S[1], d = clamp(Math.hypot(dx, dy), 12, l1 + l2 - 1), base = Math.atan2(dy, dx);
  const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), a = base + flip * A;
  const E = [S[0] + Math.cos(a) * l1, S[1] + Math.sin(a) * l1], b = Math.atan2(T[1] - E[1], T[0] - E[0]);
  return { E, H: [E[0] + Math.cos(b) * l2, E[1] + Math.sin(b) * l2] };
};
let PXC = null;
// o: {x, y(ground), wx, t, pose, style, tag(g)}. pose: stop(0..1 freeze legs), crouch, hop, lean, look, armN/armF {x,y,w} screen targets, bag(0..1 swing), wave
export function walker(g, o) {
  const st = o.style || STY_FULL;
  if (st.pixel) {                                                   // draw small, quantise, scale up without smoothing
    const n = st.pixel, bw = 680, bh = 540, ox = Math.round((o.x - 340) / n) * n, oy = Math.round((o.y - 470) / n) * n;
    if (!PXC) { PXC = document.createElement('canvas'); }
    PXC.width = bw / n; PXC.height = bh / n; const sg = PXC.getContext('2d', { willReadFrequently: true });
    sg.setTransform(1 / n, 0, 0, 1 / n, -ox / n, -oy / n);
    walker(sg, { ...o, style: { ...st, pixel: 0, lw: st.lw * 1.4 } });
    sg.setTransform(1, 0, 0, 1, 0, 0);
    const id = sg.getImageData(0, 0, PXC.width, PXC.height), d = id.data, rp = st.ramp.map(hex);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
      const L = clamp(lum([d[i], d[i + 1], d[i + 2]]), 0, .999), c = rp[Math.min(rp.length - 1, Math.floor(L * rp.length))];
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    sg.putImageData(id, 0, 0);
    g.save(); g.imageSmoothingEnabled = false; g.drawImage(PXC, ox, oy, bw, bh); g.restore();
    return;
  }
  const P = o.pose || {}, CL = c => styleCol(st, c), x = o.x, gy = o.y, wx = o.wx;
  const speedK = 1 - clamp(P.stop || 0), crouch = P.crouch || 0, ph = wx / STRIDE * TAU + Math.PI / 2;
  const legs = [0, Math.PI].map(s => {
    const th = Math.sin(ph + s) * .62 * speedK * (1 - crouch) + crouch * .8 + .05 * (1 - speedK),
      kn = (.1 + .95 * Math.max(0, Math.cos(ph + s - .2))) * speedK * (1 - crouch) + crouch * 1.55;
    const a1 = th, a2 = th - kn; return { a1, a2, h: 52 * Math.cos(a1) + 52 * Math.cos(a2) };
  });
  const hipY = gy - Math.max(legs[0].h, legs[1].h) - (P.hop || 0), hip = [x, hipY];
  const lean = .06 + (P.lean || 0) + crouch * .25 + (Math.abs(Math.sin(ph)) * .015) * speedK;
  const rot = (px, py, a) => [px * Math.cos(a) - py * Math.sin(a), px * Math.sin(a) + py * Math.cos(a)];
  const up = (px, py) => { const r = rot(px, py, lean); return [hip[0] + r[0], hip[1] + r[1]]; };
  const SH = up(0, -86), NK = up(4, -104), HD = (() => { const r = rot(8, -46, lean + (P.look || 0)); return [NK[0] + r[0], NK[1] + r[1]]; })();
  const fkArm = (s) => {
    const a = (-Math.sin(ph + s) * .62 * speedK) + .12 + (s ? 0 : 0), b = .25 + .55 * Math.max(0, Math.sin(ph + s + .6)) * speedK + .1;
    const E = [SH[0] + Math.sin(a) * 50, SH[1] + Math.cos(a) * 50], Hn = [E[0] + Math.sin(a + b) * 48, E[1] + Math.cos(a + b) * 48]; return { E, H: Hn };
  };
  const arm = (s, tg) => {
    let A = fkArm(s); const w = tg ? clamp(tg.w ?? 1) : 0;
    if (w > 0) { const flip = (tg.x - SH[0]) > 0 && (tg.y - SH[1]) < 30 ? 1 : -1, B = ik(SH, [tg.x, tg.y], 50, 48, ik(SH, [tg.x, tg.y], 50, 48, 1).E[1] > ik(SH, [tg.x, tg.y], 50, 48, -1).E[1] ? 1 : -1); A = { E: [lerp(A.E[0], B.E[0], w), lerp(A.E[1], B.E[1], w)], H: [lerp(A.H[0], B.H[0], w), lerp(A.H[1], B.H[1], w)] }; }
    return A;
  };
  const aN = arm(0, P.armN), aF = arm(Math.PI, P.armF);
  const legPts = legs.map(l => { const K = [hip[0] + Math.sin(l.a1) * 52, hip[1] + Math.cos(l.a1) * 52], A = [K[0] + Math.sin(l.a2) * 52, K[1] + Math.cos(l.a2) * 52]; return { K, A, ang: l.a2 }; });
  // scarf tail: a chain trailing behind the neck, fluttering with distance walked
  const tail = []; { let p = [NK[0] - 8, NK[1] + 6]; tail.push(p); for (let i = 1; i <= 7; i++) { p = [p[0] - 16 - i * .6, p[1] + 5 + Math.sin(wx / 70 - i * .8 + (P.flut || 0)) * (2 + i * 1.7) * (.6 + .4 * speedK) + (P.drop || 0) * i]; tail.push(p); } }
  const bagSw = Math.sin(ph) * .08 * speedK + (P.bag || 0), bagC = up(-12, -24), bagA = [bagC[0], bagC[1]];
  const col = k => (st.pal && (st.pal[k] || (k === 'scarf2' && st.pal.scarf && mixc(st.pal.scarf, '#000000', .16)))) || CL(PAL[k]), line = st.line, lw = st.lw, T = new Map();
  const capsule = (a, b, w, fill, pass) => {
    g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
    if (pass === 0) { g.lineWidth = w + 2 * (lw + st.rw); g.strokeStyle = st.rim; g.stroke(); }
    else if (pass === 1) { g.lineWidth = w + 2 * lw; g.strokeStyle = line; g.stroke(); }
    else { g.beginPath(); g.moveTo(a[0] + (st.off ? st.off[0] : 0), a[1] + (st.off ? st.off[1] : 0)); g.lineTo(b[0] + (st.off ? st.off[0] : 0), b[1] + (st.off ? st.off[1] : 0)); g.lineWidth = w; g.strokeStyle = fill; g.stroke(); }
  };
  const poly = (fn, fill, pass) => {
    g.beginPath(); fn();
    if (pass === 0) { g.lineWidth = 2 * (lw + st.rw); g.strokeStyle = st.rim; g.lineJoin = 'round'; g.stroke(); }
    else if (pass === 1) { g.lineWidth = 2 * lw; g.strokeStyle = line; g.lineJoin = 'round'; g.stroke(); }
    else { g.save(); if (st.off) g.translate(st.off[0], st.off[1]); g.fillStyle = fill; g.fill(); g.restore(); }
  };
  const shoe = (pt, ang, fill, pass) => poly(() => { const f = [Math.cos(.0), 0]; const x0 = pt[0] - 10, y0 = pt[1] - 6; rr(g, x0, y0 - 2, 38, 18, 8); }, fill, pass);
  const torso = pass => poly(() => {
    const q = (x1, y1, x2, y2) => g.quadraticCurveTo(...up(x1, y1), ...up(x2, y2));
    g.moveTo(...up(-26, 0)); q(-30, -50, -22, -94); q(0, -104, 24, -94); q(32, -50, 28, 0); q(0, 8, -26, 0); g.closePath();
  }, col('coat'), pass);
  const head = pass => poly(() => { g.arc(HD[0], HD[1], 48, 0, TAU); }, col('skin'), pass);
  const cap = pass => poly(() => {
    const a = lean + (P.look || 0), r = (px, py) => { const q = rot(px, py, a); return [HD[0] + q[0], HD[1] + q[1]]; };
    g.moveTo(...r(-50, -4)); g.bezierCurveTo(...r(-50, -62), ...r(10, -70), ...r(36, -34)); g.lineTo(...r(74, -26)); g.quadraticCurveTo(...r(78, -16), ...r(66, -14)); g.lineTo(...r(40, -14)); g.lineTo(...r(-50, -4)); g.closePath();
  }, col('cap'), pass);
  const bag = pass => poly(() => { g.save(); g.translate(bagA[0], bagA[1]); g.rotate(bagSw); rr(g, -34, -4, 66, 52, 12); g.restore(); }, col('bag'), pass);
  const strap = () => { g.beginPath(); const s = up(-14, -92), e = [bagA[0] - 18, bagA[1] - 4]; g.moveTo(s[0], s[1]); g.lineTo(up(14, -50)[0], up(14, -50)[1]); g.lineTo(e[0], e[1]); g.lineWidth = 7 + lw; g.strokeStyle = line; g.lineCap = 'butt'; g.stroke(); g.lineWidth = 7; g.strokeStyle = col('bag2'); g.stroke(); };
  const passes = pass => {
    // scarf tail, far arm, far leg, torso, near leg, head, bag, near arm, scarf collar
    for (let i = 0; i < tail.length - 1; i++) capsule(tail[i], tail[i + 1], 22 - i * 1.7, i % 2 ? col('scarf2') : col('scarf'), pass);
    capsule(SH, aF.E, 16, col('coat2'), pass); capsule(aF.E, aF.H, 15, col('coat2'), pass);
    if (pass === 2) { g.beginPath(); g.arc(aF.H[0], aF.H[1], 10, 0, TAU); g.fillStyle = col('skin2'); g.fill(); }
    capsule(hip, legPts[1].K, 21, col('pants2'), pass); capsule(legPts[1].K, legPts[1].A, 19, col('pants2'), pass);
    shoe(legPts[1].A, legPts[1].ang, col('shoe'), pass);
    torso(pass);
    if (pass === 2) { strap(); }
    capsule(hip, legPts[0].K, 23, col('pants'), pass); capsule(legPts[0].K, legPts[0].A, 21, col('pants'), pass);
    shoe(legPts[0].A, legPts[0].ang, col('shoe'), pass);
    head(pass); cap(pass); bag(pass);
    if (pass === 2) {
      g.lineWidth = lw * .8; g.strokeStyle = line;
      // face: eye, brow, cheek, nose, mouth; hair at the back
      const a = lean + (P.look || 0), f = (px, py) => { const q = rot(px, py, a); return [HD[0] + q[0], HD[1] + q[1]]; };
      g.beginPath(); const h0 = f(-46, -2), h1 = f(-52, 24), h2 = f(-30, 40); g.moveTo(...h0); g.quadraticCurveTo(...h1, ...h2); g.quadraticCurveTo(...f(-24, 20), ...h0); g.fillStyle = col('hair'); g.fill(); g.stroke();
      const blink = (Math.floor(o.t * 24) % 96) < 3 ? .15 : 1, ey = f(24, 4);
      g.fillStyle = line; g.beginPath(); g.ellipse(ey[0], ey[1], 5, 6.5 * blink, 0, 0, TAU); g.fill();
      g.beginPath(); const b0 = f(15, -9 - (P.brow || 0)), b1 = f(32, -12 + (P.brow || 0) * .5); g.moveTo(...b0); g.lineTo(...b1); g.lineWidth = 3; g.stroke();
      g.fillStyle = col('scarf'); g.globalAlpha = .35; g.beginPath(); const ck = f(14, 22); g.arc(ck[0], ck[1], 8, 0, TAU); g.fill(); g.globalAlpha = 1;
      g.fillStyle = col('skin'); g.beginPath(); const ns = f(46, 8); g.arc(ns[0], ns[1], 7, 0, TAU); g.fill(); g.lineWidth = lw * .7; g.strokeStyle = line; g.beginPath(); g.arc(ns[0], ns[1], 7, -1.2, 1.3); g.stroke();
      g.beginPath(); const m0 = f(24, 28), m1 = f(36, 34 + (P.mouth || 0) * 8), m2 = f(42, 28); g.moveTo(...m0); g.quadraticCurveTo(...m1, ...m2); g.lineWidth = 3; g.stroke();
    }
    if (pass === 2 && o.tag) {                                                    // the message tag swings from the satchel
      g.save(); g.translate(bagA[0] + 20, bagA[1] + 40); g.rotate(bagSw * 2.2 + Math.sin(ph * 1 + 1) * .1 * speedK); o.tag(g); g.restore();
    }
    capsule(SH, aN.E, 17, col('coat'), pass); capsule(aN.E, aN.H, 16, col('coat'), pass);
    if (pass === 2) { g.beginPath(); g.arc(aN.H[0], aN.H[1], 11, 0, TAU); g.fillStyle = col('skin'); g.fill(); g.lineWidth = lw * .8; g.strokeStyle = line; g.stroke(); }
    // scarf collar ring
    capsule([NK[0] - 14, NK[1] + 2], [NK[0] + 12, NK[1] + 4], 24, col('scarf'), pass);
  };
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  if (st.shadow !== false) { g.fillStyle = 'rgba(0,0,0,.20)'; g.beginPath(); g.ellipse(x + 8, gy + 6, 70 - (P.hop || 0) * .2, 11, 0, 0, TAU); g.fill(); }
  passes(0); passes(1); passes(2);
  g.restore();
  return { hip, SH, NK, HD, aN, aF, bag: bagA };
}

// ------------------------------------------------------------------ era context + compositor
export function mkCtx(e, k, t, wx) {
  const cam = wx - WSX, cm = e.x0 + (e.camLx ?? 1100) - WSX;
  const c = {
    t, k, e, x0: e.x0, w: e.w, cam, cm, wx, wlx: wx - e.x0, id: e.id,
    X: (lx, p = 1) => e.x0 + lx - cm - (cam - cm) * p,
    vis: (p = 1, pad = 0) => { const a = cm + (cam - cm) * p - e.x0 - pad; return [a, a + W + 2 * pad]; },
    at: (g, p, fn, pad = 0) => { g.save(); g.translate(c.X(0, p), 0); const [a, b] = c.vis(p, pad); fn(a, b); g.restore(); },
    gp: i => clamp((wx - e.x0 - e.gags[i].x) / e.gags[i].len),
    rn: n => hash(n * 17.31 + k * 911.7),
    tex: (tile, o = {}) => { texFill(g0(), tile, 0, 0, W, H, { ...o, ox: -(o.k ?? 1) * cam + (o.sx ?? 0), oy: o.sy ?? 0 }); },
  };
  return c;
}
let G0 = null; const g0 = () => G0;

// S: { t, wx, eras (painters with x0,w), zoom, zy (pivot y) }
export function drawWorld(g, S) {
  G0 = g;
  const { t, wx, eras } = S, cam = wx - WSX;
  g.save();
  const z = S.zoom || 1; if (z !== 1) { g.translate(WSX, S.zy ?? 600); g.scale(z, z); g.translate(-WSX, -(S.zy ?? 600)); }
  // which eras are on screen (with a margin, since zoom or parallax can show a bit more)
  const vis = []; eras.forEach((e, k) => { const L = e.x0 - cam, R = e.x0 + e.w - cam; if (R > -120 && L < W + 120) vis.push(k); });
  const ctxs = {};
  for (const k of vis.slice().reverse()) {
    const e = eras[k], c = mkCtx(e, k, t, wx); ctxs[k] = c;
    const rightEdge = k < eras.length - 1 ? e.x0 + e.w - cam : null;
    g.save();
    if (rightEdge !== null) {
      const seed = k + 1.3;
      // soft shadow the old sheet throws on what lies beneath it
      g.save(); g.lineJoin = 'round';
      for (let i = 0; i < 9; i++) { edgeLine(g, rightEdge, seed, 2 + i * 3.6); g.lineWidth = 5; g.strokeStyle = `rgba(0,0,0,${.085 * (1 - i / 9)})`; g.stroke(); }
      g.restore();
      g.beginPath(); edgePath(g, rightEdge, seed, -4000); g.clip();
    }
    e.bg(g, c);
    const J = walker(g, { x: WSX, y: GY, wx, t, pose: e.pose ? e.pose(c) : {}, style: e.walk, tag: e.token ? gg => e.token(gg, c) : null });
    if (e.held && J) e.held(g, c, J);
    if (e.fg) e.fg(g, c);
    if (rightEdge !== null) {                                          // the paper's own torn rim
      const seed = k + 1.3, rim = e.rim || '#f3ead6';
      g.save(); g.lineJoin = 'round';
      edgeLine(g, rightEdge, seed, 0); g.lineWidth = 22; g.strokeStyle = rim; g.stroke();
      edgeLine(g, rightEdge, seed, -13); g.lineWidth = 1.6; g.strokeStyle = 'rgba(60,40,20,.22)'; g.stroke();
      edgeLine(g, rightEdge, seed, -3); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.55)'; g.stroke();
      g.restore();
    }
    g.restore();
    if (rightEdge !== null) {                                          // loose fibres sticking out past the edge (outside the clip)
      const seed = k + 1.3, rim = e.rim || '#f3ead6'; g.save(); g.lineCap = 'round'; g.strokeStyle = rim;
      for (let y = 0; y < H; y += 5) { const h = hash(y * 1.7 + seed * 91); if (h > .5) { const len = 5 + hash(y * 3.3 + seed) * 15, x0 = rightEdge + edgeDx(seed, y) - 1; g.globalAlpha = .85; g.lineWidth = 1 + hash(y + seed) * 1.4; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + len, y + (hash(y * 5 + seed) - .5) * 9); g.stroke(); } }
      g.restore();
    }
  }
  g.restore();
  return ctxs;
}

// burst of era-flavoured particles at the moment the edge meets the walker. world-anchored, so it drifts back with the scroll.
export function burst(g, e, tc, wx, seed, zoom = 1) {
  if (tc < 0 || tc > 1.6 || !e.burst) return;
  const cam = wx - WSX, B = e.burst, n = B.n || 34, ox = e.x0 + 0 - FRONT * 0;      // origin world x = this era's start
  g.save(); if (zoom !== 1) { g.translate(WSX, 600); g.scale(zoom, zoom); g.translate(-WSX, -600); }
  for (let i = 0; i < n; i++) {
    const r1 = hash(i * 7.1 + seed), r2 = hash(i * 3.3 + seed * 2), r3 = hash(i * 5.9 + seed * 3), r4 = hash(i * 1.9 + seed * 4);
    const delay = r4 * .25, u = tc - delay; if (u < 0) continue;
    const ang = -Math.PI * (.05 + .55 * r1), sp = 250 + 520 * r2, life = .9 + .7 * r3;
    if (u > life) continue;
    const p = u / life, wxp = ox + (r3 - .3) * 40 + Math.cos(ang) * sp * u * (1 - .35 * p), y = 600 + (r1 - .5) * 420 + Math.sin(ang) * sp * u * .9 + (B.g ?? 520) * u * u;
    const x = wxp - cam + FRONT * 0;
    g.save(); g.translate(x, y); g.rotate((r1 - .5) * 6 * u * (B.spin ?? 1)); g.globalAlpha = 1 - ss(seg(p, .55, 1));
    B.draw(g, 6 + r2 * (B.size ?? 14) * (1 - .4 * p), i, p, r1);
    g.restore();
  }
  g.restore();
}

// ------------------------------------------------------------------ the year plate (odometer flip between two entries)
export function plate(g, cur, prev, p, font) {
  const x = 1546, y = 34, w = 340, h = 118;
  g.save();
  g.shadowColor = 'rgba(20,12,6,.35)'; g.shadowBlur = 16; g.shadowOffsetY = 5; g.fillStyle = '#f7efdc'; g.beginPath(); rr(g, x, y, w, h, 14); g.fill(); g.shadowColor = 'transparent';
  g.lineWidth = 2.5; g.strokeStyle = '#2b2118'; g.stroke();
  g.lineWidth = 1; g.strokeStyle = 'rgba(43,33,24,.45)'; g.beginPath(); rr(g, x + 6, y + 6, w - 12, h - 12, 9); g.stroke();
  g.beginPath(); rr(g, x + 6, y + 6, w - 12, h - 12, 9); g.clip();
  const ss_ = ss(p), draw = (e, dy, a) => {
    g.globalAlpha = a; g.fillStyle = '#2b2118'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    let fs = 54; g.font = `700 ${fs}px "${font.serif}"`; while (g.measureText(e.y).width > w - 40 && fs > 30) { fs -= 2; g.font = `700 ${fs}px "${font.serif}"`; }
    g.fillText(e.y, x + w / 2, y + 62 + dy);
    g.font = `500 23px "${font.sans}"`; g.fillStyle = '#6a5640'; g.fillText(e.c, x + w / 2, y + 94 + dy);
  };
  if (prev && p < 1) { draw(prev, -ss_ * 110, 1 - ss_); draw(cur, (1 - ss_) * 110, ss_); } else draw(cur, 0, 1);
  g.restore();
}

// ------------------------------------------------------------------ shared small props
// a hanging message card (the courier's tag): w x h, fill, border, then the era's own icon drawn by `icon(g)` in card centre coordinates
export function tagCard(g, o, icon) {
  const w = o.w ?? 56, h = o.h ?? 68;
  g.save(); g.lineWidth = 3; g.strokeStyle = o.line || '#2b2430'; g.beginPath(); g.moveTo(0, -18); g.lineTo(0, 0); g.stroke();
  g.beginPath(); rr(g, -w / 2, 0, w, h, o.r ?? 8); g.fillStyle = o.fill || '#fff6e4'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = o.line || '#2b2430'; g.stroke();
  g.save(); g.translate(0, h / 2); icon(g, w, h); g.restore();
  g.fillStyle = o.line || '#2b2430'; g.beginPath(); g.arc(0, 8, 3, 0, TAU); g.fill();
  g.restore();
}
// a bell-shaped 0..1 envelope for a gag: rises over [a,b], holds, falls over [c,d]
export const bell = (p, a, b, c, d) => ss(seg(p, a, b)) * (1 - ss(seg(p, c, d)));
