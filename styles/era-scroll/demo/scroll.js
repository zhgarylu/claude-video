// Era Scroll engine: one long strip made of "eras", a courier who always walks at the same pace, a torn-paper edge
// that sweeps in from the right, era particles, a year plate. Everything is a pure function of time.
//
//   drawWorld(g, S)      composite the visible eras right-to-left, each clipped by the torn edge of the next one
//   walker(g, o)         the protagonist rig (profile, walk cycle, two-bone arms; the figure itself is the data object `look`; no look = the demo's courier)
//   companion(g, o)      a follower beside the protagonist (a second walker, a dog, a cat, a bot)
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

// ------------------------------------------------------------------ the look: who walks
// `look` is a plain data object. NO look at all = the demo's courier (kept exactly, so the demo film does not change).
// ANY look = a blank figure that has only what you list: unlisted hat, neck, bag, held item are `none`, hair is `short`.
// Fields (every kinded field takes 'kind' or {kind, color, color2, ...}):
//   head:   {shape:'round'|'oval'|'square', size:1, skin, skin2, cheeks: hex | false | 'neck'}
//   hair:   'none'|'short'|'bun'|'topknot'|'long'|'braid'|'ponytail'|'back'  (+ color)
//   hat:    'none'|'cap'|'bamboo'|'conical'|'beanie'|'hood'|'crown'|'helmet'|'bubble'|'chef'|'beret'|'headphones'  (+ color, color2, size, plume)
//   neck:   'none'|'scarf'|'cape'|'collar'  (+ color, color2, len, flow, width)
//   outfit: 'jacket'|'robe'|'dress'|'suit'|'armor'|'overalls'|'shorts'|'space'|'robot'  (+ color, color2, pants, pants2, shoe, belt, trim, tie, hands, length:'knee'|'ankle')
//   bag:    'none'|'satchel'|'backpack'|'scroll'|'basket'  (+ color, color2, size)
//   held:   'none'|'staff'|'lantern'|'phone'|'book'|'scroll'|'sword'|'token'  (+ color, color2, top) or {draw:(g, hand, env) => {}}
//   face:   {eyes:'dot'|'round'|'closed'|'led'|'visor'|'none', mouth:'curve'|'smile'|'flat'|'grille'|'none', glasses:false|'round'|'square'|'shades', beard:'none'|'stubble'|'short'|'long'|'moustache', beardColor, brows:true, nose:true, color}
//   body:   {scale:1, width:1, stride}   (stride defaults to scale, so the feet stay planted)
//   extras: ['antenna', 'headband', {kind:'antenna', color}]
// An era may override parts: e.look = {hat:'beanie', outfit:{kind:'robe', color:'#d98a1c'}}; a different `kind` replaces the whole part, the same kind merges fields.
const KINDED = ['hair', 'hat', 'neck', 'outfit', 'bag', 'held'];
const asObj = v => v == null ? null : typeof v === 'string' ? { kind: v } : v === false ? { kind: 'none' } : v;
export function mergeLook(a, b) {
  if (!b) return a; if (!a) return b;
  const o = { ...a };
  for (const k of Object.keys(b)) {
    const v = b[k];
    if (KINDED.includes(k)) { const A = asObj(a[k]), B = asObj(v); o[k] = !B ? A : (!A || (B.kind && B.kind !== A.kind)) ? B : { ...A, ...B }; }
    else if (k === 'extras') o[k] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v)) o[k] = { ...(a[k] || {}), ...v };
    else o[k] = v;
  }
  return o;
}
// the demo's courier written as a look (renders pixel-identical to passing no look)
export const COURIER_LOOK = { head: { cheeks: 'neck' }, hair: 'back', hat: 'cap', neck: 'scarf', outfit: 'jacket', bag: 'satchel' };
const BLANK = { hair: 'short', hat: 'none', neck: 'none', outfit: 'jacket', bag: 'none', held: 'none' }, LEGACY = { hair: 'back', hat: 'cap', neck: 'scarf', outfit: 'jacket', bag: 'satchel', held: 'none' };
function normLook(l) {
  const D = l ? BLANK : LEGACY; l = l || {};
  const o = {
    head: { shape: 'round', size: 1, cheeks: D === LEGACY ? 'neck' : '#e0907c', ...l.head },
    face: { eyes: 'dot', mouth: 'curve', glasses: false, beard: 'none', brows: true, nose: true, ...l.face },
    body: { scale: 1, width: 1, stride: null, ...l.body }, extras: (l.extras || []).map(asObj) };
  for (const k of KINDED) { const v = asObj(l[k]); o[k] = v ? { ...v, kind: v.kind || D[k] } : { kind: D[k] }; }
  return o;
}
const lookColors = L => {
  const c = {}, dk = (h, t) => mixc(h, '#000000', t), set = (k, v) => { if (v) c[k] = v; };
  const H = L.head, OF = L.outfit, HA = L.hat, NE = L.neck, BG = L.bag;
  set('skin', H.skin); set('skin2', H.skin2 || (H.skin && dk(H.skin, .12))); set('hair', L.hair.color);
  set('cap', HA.color); set('cap2', HA.color2 || (HA.color && dk(HA.color, .14)));
  set('scarf', NE.color); set('scarf2', NE.color2 || (NE.color && dk(NE.color, .16)));
  set('coat', OF.color); set('coat2', OF.color2 || (OF.color && dk(OF.color, .2)));
  set('pants', OF.pants); set('pants2', OF.pants2 || (OF.pants && dk(OF.pants, .2))); set('shoe', OF.shoe);
  set('bag', BG.color); set('bag2', BG.color2 || (BG.color && (BG.kind === 'backpack' || BG.kind === 'scroll' ? mixc(BG.color, '#ffffff', .18) : dk(BG.color, .22))));
  return c;
};

// the three-pass silhouette brush shared by the walker and the companions: pass 0 rim, pass 1 outline, pass 2 fill
function brush(g, st) {
  const lw = st.lw;
  const capsule = (a, b, w, fill, pass) => {
    g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
    if (pass === 0) { g.lineWidth = w + 2 * (lw + st.rw); g.strokeStyle = st.rim; g.stroke(); }
    else if (pass === 1) { g.lineWidth = w + 2 * lw; g.strokeStyle = st.line; g.stroke(); }
    else { g.beginPath(); g.moveTo(a[0] + (st.off ? st.off[0] : 0), a[1] + (st.off ? st.off[1] : 0)); g.lineTo(b[0] + (st.off ? st.off[0] : 0), b[1] + (st.off ? st.off[1] : 0)); g.lineWidth = w; g.strokeStyle = fill; g.stroke(); }
  };
  const poly = (fn, fill, pass) => {
    g.beginPath(); fn();
    if (pass === 0) { g.lineWidth = 2 * (lw + st.rw); g.strokeStyle = st.rim; g.lineJoin = 'round'; g.stroke(); }
    else if (pass === 1) { g.lineWidth = 2 * lw; g.strokeStyle = st.line; g.lineJoin = 'round'; g.stroke(); }
    else { g.save(); if (st.off) g.translate(st.off[0], st.off[1]); g.fillStyle = fill; g.fill(); g.restore(); }
  };
  // a thick arc (hood rim, headphone band)
  const band = (cx, cy, r, a0, a1, w, fill, pass) => {
    g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy, r, a0, a1);
    if (pass === 0) { g.lineWidth = w + 2 * (lw + st.rw); g.strokeStyle = st.rim; g.stroke(); }
    else if (pass === 1) { g.lineWidth = w + 2 * lw; g.strokeStyle = st.line; g.stroke(); }
    else { g.lineWidth = w; g.strokeStyle = fill; g.stroke(); }
  };
  return { capsule, poly, band };
}

// pixel styles: draw small, quantise to the ramp, scale up without smoothing (a figure is drawn by `redraw(ctx, style)`)
function pixelate(g, o, st, redraw) {
  const n = st.pixel, bw = 680, bh = 540, ox = Math.round((o.x - 340) / n) * n, oy = Math.round((o.y - 470) / n) * n;
  if (!PXC) { PXC = document.createElement('canvas'); }
  PXC.width = bw / n; PXC.height = bh / n; const sg = PXC.getContext('2d', { willReadFrequently: true });
  sg.setTransform(1 / n, 0, 0, 1 / n, -ox / n, -oy / n);
  redraw(sg, { ...st, pixel: 0, lw: st.lw * 1.4 });
  sg.setTransform(1, 0, 0, 1, 0, 0);
  const id = sg.getImageData(0, 0, PXC.width, PXC.height), d = id.data, rp = st.ramp.map(hex);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
    const L = clamp(lum([d[i], d[i + 1], d[i + 2]]), 0, .999), c = rp[Math.min(rp.length - 1, Math.floor(L * rp.length))];
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  sg.putImageData(id, 0, 0);
  g.save(); g.imageSmoothingEnabled = false; g.drawImage(PXC, ox, oy, bw, bh); g.restore();
}

// o: {x, y(ground), wx, t, pose, style, tag(g), look, scale, phase}. pose: stop(0..1 freeze legs), crouch, hop, lean, look, armN/armF {x,y,w} screen targets, bag(0..1 swing), wave
// look: see above. Returns the joints in screen space.
export function walker(g, o) {
  const st = o.style || STY_FULL;
  if (st.pixel) return pixelate(g, o, st, (sg, st2) => walker(sg, { ...o, style: st2 }));
  const L = normLook(o.look), sc = (o.scale ?? 1) * L.body.scale, sx = sc * L.body.width;
  if (sc === 1 && sx === 1) return rig(g, o, st, L, L.body.stride ?? 1);
  g.save(); g.translate(o.x, o.y); g.scale(sx, sc); g.translate(-o.x, -o.y);
  const J = rig(g, o, { ...st, lw: st.lw / sc, rw: st.rw / sc }, L, L.body.stride ?? sc);
  g.restore();
  const m = p => [o.x + (p[0] - o.x) * sx, o.y + (p[1] - o.y) * sc];
  return { hip: m(J.hip), SH: m(J.SH), NK: m(J.NK), HD: m(J.HD), aN: { E: m(J.aN.E), H: m(J.aN.H) }, aF: { E: m(J.aF.E), H: m(J.aF.H) }, bag: m(J.bag) };
}

function rig(g, o, st, L, strideK) {
  const P = o.pose || {}, CL = c => styleCol(st, c), x = o.x, gy = o.y, wx = o.wx;
  const speedK = 1 - clamp(P.stop || 0), crouch = P.crouch || 0, ph = wx / (STRIDE * strideK) * TAU + Math.PI / 2 + (o.phase || 0);
  const hs = L.head.size, OF = L.outfit, HA = L.hat, NE = L.neck, BG = L.bag, HE = L.held, HR = L.hair, FA = L.face;
  const legs = [0, Math.PI].map(s => {
    const th = Math.sin(ph + s) * .62 * speedK * (1 - crouch) + crouch * .8 + .05 * (1 - speedK),
      kn = (.1 + .95 * Math.max(0, Math.cos(ph + s - .2))) * speedK * (1 - crouch) + crouch * 1.55;
    const a1 = th, a2 = th - kn; return { a1, a2, h: 52 * Math.cos(a1) + 52 * Math.cos(a2) };
  });
  const hipY = gy - Math.max(legs[0].h, legs[1].h) - (P.hop || 0), hip = [x, hipY];
  const lean = .06 + (P.lean || 0) + crouch * .25 + (Math.abs(Math.sin(ph)) * .015) * speedK;
  const rot = (px, py, a) => [px * Math.cos(a) - py * Math.sin(a), px * Math.sin(a) + py * Math.cos(a)];
  const up = (px, py) => { const r = rot(px, py, lean); return [hip[0] + r[0], hip[1] + r[1]]; };
  const SH = up(0, -86), NK = up(4, -104), HD = (() => { const r = rot(8, -46 - (hs - 1) * 40, lean + (P.look || 0)); return [NK[0] + r[0], NK[1] + r[1]]; })();
  const fkArm = (s) => {
    const a = (-Math.sin(ph + s) * .62 * speedK) + .12 + (s ? 0 : 0), b = .25 + .55 * Math.max(0, Math.sin(ph + s + .6)) * speedK + .1;
    const E = [SH[0] + Math.sin(a) * 50, SH[1] + Math.cos(a) * 50], Hn = [E[0] + Math.sin(a + b) * 48, E[1] + Math.cos(a + b) * 48]; return { E, H: Hn };
  };
  const arm = (s, tg) => {
    let A = fkArm(s); const w = tg ? clamp(tg.w ?? 1) : 0;
    if (w > 0) { const flip = (tg.x - SH[0]) > 0 && (tg.y - SH[1]) < 30 ? 1 : -1, B = ik(SH, [tg.x, tg.y], 50, 48, ik(SH, [tg.x, tg.y], 50, 48, 1).E[1] > ik(SH, [tg.x, tg.y], 50, 48, -1).E[1] ? 1 : -1); A = { E: [lerp(A.E[0], B.E[0], w), lerp(A.E[1], B.E[1], w)], H: [lerp(A.H[0], B.H[0], w), lerp(A.H[1], B.H[1], w)] }; }
    return A;
  };
  // a held staff, sword, book or phone is gripped in front of the body instead of swinging with the stride
  const gripT = HE.draw || P.armN ? null : HE.kind === 'staff' || HE.kind === 'sword' ? { x: SH[0] + 52, y: SH[1] + 66 + Math.sin(ph) * 4, w: 1 } : HE.kind === 'book' || HE.kind === 'phone' ? { x: SH[0] + 40, y: SH[1] + 50 + Math.sin(ph * 2) * 2, w: 1 } : null;
  const aN = arm(0, P.armN || gripT), aF = arm(Math.PI, P.armF);
  const legPts = legs.map(l => { const K = [hip[0] + Math.sin(l.a1) * 52, hip[1] + Math.cos(l.a1) * 52], A = [K[0] + Math.sin(l.a2) * 52, K[1] + Math.cos(l.a2) * 52]; return { K, A, ang: l.a2 }; });
  // scarf tail: a chain trailing behind the neck, fluttering with distance walked
  const flowK = NE.flow ?? 1, nTail = Math.round(7 * (NE.len ?? 1));
  const tail = []; if (NE.kind === 'scarf') { let p = [NK[0] - 8, NK[1] + 6]; tail.push(p); for (let i = 1; i <= nTail; i++) { p = [p[0] - 16 - i * .6, p[1] + 5 + Math.sin(wx / 70 - i * .8 + (P.flut || 0)) * (2 + i * 1.7) * (.6 + .4 * speedK) * flowK + (P.drop || 0) * i]; tail.push(p); } }
  const bagSw = Math.sin(ph) * .08 * speedK + (P.bag || 0), bagC = up(-12, -24), bagA = [bagC[0], bagC[1]];
  const LC = lookColors(L);
  const pal = o.look ? null : st.pal;                                  // era palettes re-tint the demo's courier only; a custom look carries its own colours
  const col = k => (pal && (pal[k] || (k === 'scarf2' && pal.scarf && mixc(pal.scarf, '#000000', .16)))) || CL(LC[k] || PAL[k]), line = st.line, lw = st.lw;
  const cc = c => CL(c);
  const { capsule, poly, band } = brush(g, st);
  // outfit flags
  const K = OF.kind, robe = K === 'robe', dress = K === 'dress', armor = K === 'armor', space = K === 'space', robot = K === 'robot', shorts = K === 'shorts';
  const skirted = robe || dress || armor;
  const armW = robe ? 1.3 : space ? 1.3 : robot ? .72 : 1, legW = space ? 1.25 : robot ? .62 : 1;
  const handC = OF.hands ? cc(OF.hands) : space ? cc('#f2f2ee') : robot ? cc(OF.color2 || '#6d7d8a') : null;
  const handR = space ? 13 : robot ? 12 : 11;
  const beltC = OF.belt ? cc(OF.belt) : null;
  const sw = Math.sin(wx / 90);
  const shoe = (pt, ang, fill, pass) => poly(() => { const x0 = pt[0] - 10, y0 = pt[1] - 6; if (space || robot) rr(g, x0 - 2, y0 - 4, 44, 22, 8); else rr(g, x0, y0 - 2, 38, 18, 8); }, fill, pass);
  const torso = pass => poly(() => {
    const q = (x1, y1, x2, y2) => g.quadraticCurveTo(...up(x1, y1), ...up(x2, y2));
    if (robot) { const c = [up(-30, 6), up(34, 6), up(34, -98), up(-30, -98)]; g.moveTo((c[0][0] + c[1][0]) / 2, (c[0][1] + c[1][1]) / 2); g.arcTo(...c[1], ...c[2], 12); g.arcTo(...c[2], ...c[3], 12); g.arcTo(...c[3], ...c[0], 12); g.arcTo(...c[0], ...c[1], 12); g.closePath(); return; }
    g.moveTo(...up(-26, 0)); q(-30, -50, -22, -94); q(0, -104, 24, -94); q(32, -50, 28, 0); q(0, 8, -26, 0); g.closePath();
  }, col('coat'), pass);
  // robe / dress / armour skirt: hangs from the hip, the hem swings with the legs
  const skirt = pass => {
    const lenK = OF.length || (robe ? 'ankle' : dress ? 'knee' : 'tassets'), dh = lenK === 'ankle' ? 80 : lenK === 'knee' ? 58 : 44;
    const hemY = Math.min(gy - 24, hipY + dh), flare = dress ? 52 : armor ? 36 : 42;
    const s0 = Math.sin(legs[0].a1), s1 = Math.sin(legs[1].a1), fw = Math.max(s0, s1), bk = Math.min(s0, s1);
    const hb = [hip[0] - flare + bk * 22 * speedK - 4, hemY], hf0 = [hip[0] + flare + 4 + fw * 26 * speedK, hemY];
    poly(() => { g.moveTo(...up(-26, -4)); g.lineTo(...hb); g.quadraticCurveTo((hb[0] + hf0[0]) / 2, hemY + 7 + sw * 2, ...hf0); g.lineTo(...up(28, -4)); g.closePath(); }, armor ? col('coat2') : col('coat'), pass);
  };
  const head = pass => poly(() => {
    const a = lean + (P.look || 0);
    if (L.head.shape === 'oval') g.ellipse(HD[0], HD[1], 44 * hs, 54 * hs, a, 0, TAU);
    else if (L.head.shape === 'square') { g.save(); g.translate(HD[0], HD[1]); g.rotate(a); rr(g, -46 * hs, -46 * hs, 92 * hs, 92 * hs, 24 * hs); g.restore(); }
    else g.arc(HD[0], HD[1], 48 * hs, 0, TAU);
  }, col('skin'), pass);
  const aH = lean + (P.look || 0), hf = (px, py) => { const q = rot(px * hs, py * hs, aH); return [HD[0] + q[0], HD[1] + q[1]]; };
  const hz = HA.size || 1, hh = (px, py) => hf(px * hz, py * hz);
  const hp = (deg, r) => hf(r * Math.cos(deg * Math.PI / 180), r * Math.sin(deg * Math.PI / 180));
  const cap = pass => poly(() => {
    g.moveTo(...hf(-50, -4)); g.bezierCurveTo(...hf(-50, -62), ...hf(10, -70), ...hf(36, -34)); g.lineTo(...hf(74, -26)); g.quadraticCurveTo(...hf(78, -16), ...hf(66, -14)); g.lineTo(...hf(40, -14)); g.lineTo(...hf(-50, -4)); g.closePath();
  }, col('cap'), pass);
  const bag = pass => poly(() => { g.save(); g.translate(bagA[0], bagA[1]); g.rotate(bagSw); rr(g, -34, -4, 66, 52, 12); g.restore(); }, col('bag'), pass);
  const strap = () => { g.beginPath(); const s = up(-14, -92), e = [bagA[0] - 18, bagA[1] - 4]; g.moveTo(s[0], s[1]); g.lineTo(up(14, -50)[0], up(14, -50)[1]); g.lineTo(e[0], e[1]); g.lineWidth = 7 + lw; g.strokeStyle = line; g.lineCap = 'butt'; g.stroke(); g.lineWidth = 7; g.strokeStyle = col('bag2'); g.stroke(); };
  const strapTo = (pts) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.lineWidth = 7 + lw; g.strokeStyle = line; g.lineCap = 'butt'; g.lineJoin = 'round'; g.stroke(); g.lineWidth = 7; g.strokeStyle = col('bag2'); g.stroke(); };
  const dot = (p, r, fill, stroke) => { g.beginPath(); g.arc(p[0], p[1], r, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = lw * .6; g.strokeStyle = line; g.stroke(); } };
  const dpoly = (pts, fill, stroke = true) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = lw * .7; g.strokeStyle = line; g.lineJoin = 'round'; g.stroke(); } };
  const dline = (pts, w = lw * .7, c = line) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.lineWidth = w; g.strokeStyle = c; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); };
  // a trailing chain behind a point (braid, ponytail): n links, each a little lower and further back, swaying with the distance walked
  const chain = (p0, n, dx, dy, amp, w0, w1, fills, pass, ph0 = 0) => {
    let p = p0;
    for (let i = 1; i <= n; i++) { const q = [p[0] + dx, p[1] + dy + Math.sin(wx / 60 - i * .9 + ph0) * amp * (.5 + .5 * speedK) * i / n]; capsule(p, q, lerp(w0, w1, i / n), fills[i % fills.length], pass); p = q; }
  };
  // ---------------------------------------------------------------- parts of the head
  const hairCol = () => col('hair');
  const hairCap = pass => poly(() => {
    g.moveTo(...hf(-48, 10)); for (let d = 175; d <= 335; d += 10) g.lineTo(...hp(d, 51));
    g.lineTo(...hf(46, -22)); g.quadraticCurveTo(...hf(30, -36), ...hf(10, -24)); g.quadraticCurveTo(...hf(-8, -34), ...hf(-26, -12)); g.quadraticCurveTo(...hf(-36, -4), ...hf(-48, 10)); g.closePath();
  }, hairCol(), pass);
  const hairBack = pass => {                                          // behind the head
    const k = HR.kind;
    if (k === 'long') poly(() => { const s = sw * 6; g.moveTo(...hf(-30, -40)); g.quadraticCurveTo(...hf(-70, -14), ...hf(-64, 56)); g.quadraticCurveTo(...hf(-66, 96), ...hf(-52 + s, 118)); g.lineTo(...hf(-22 + s, 112)); g.quadraticCurveTo(...hf(-24, 60), ...hf(-14, 0)); g.closePath(); }, hairCol(), pass);
    else if (k === 'braid') chain(hf(-44, 6), 6, -7, 14, 9, 17, 11, [hairCol(), mixc(hairCol(), '#000000', .14)], pass);
    else if (k === 'ponytail') chain(hf(-46, -22), 5, -17, 9, 14, 19, 7, [hairCol(), mixc(hairCol(), '#000000', .12)], pass, 1);
  };
  const hairFront = pass => {                                          // over the head
    const k = HR.kind;
    if (k === 'none' || k === 'back') return;
    hairCap(pass);
    if (k === 'bun') poly(() => g.arc(...hf(-34, -62), 20 * hs, 0, TAU), hairCol(), pass);
    if (k === 'topknot') poly(() => g.arc(...hf(-2, -66), 15 * hs, 0, TAU), hairCol(), pass);
  };
  const beard = pass => {
    const k = FA.beard; if (!k || k === 'none' || k === 'stubble') return;
    const bc = cc(FA.beardColor || (k === 'long' ? '#ece8e0' : '#4a3a30'));
    if (k === 'long') poly(() => { const s = sw * 5; g.moveTo(...hf(-30, 14)); g.quadraticCurveTo(...hf(-34, 60), ...hf(-12, 80)); g.quadraticCurveTo(...hf(-6, 112 + s), ...hf(14, 128 + s)); g.quadraticCurveTo(...hf(40, 100 + s), ...hf(40, 62)); g.quadraticCurveTo(...hf(46, 44), ...hf(36, 38)); g.quadraticCurveTo(...hf(10, 52), ...hf(-14, 30)); g.closePath(); }, bc, pass);
    else if (k === 'short') poly(() => { g.moveTo(...hf(-36, 8)); g.quadraticCurveTo(...hf(-36, 64), ...hf(8, 64)); g.quadraticCurveTo(...hf(40, 62), ...hf(38, 42)); g.quadraticCurveTo(...hf(20, 52), ...hf(-4, 40)); g.quadraticCurveTo(...hf(-22, 34), ...hf(-28, 14)); g.closePath(); }, bc, pass);
    else if (k === 'moustache') poly(() => { g.moveTo(...hf(32, 20)); g.quadraticCurveTo(...hf(46, 14), ...hf(54, 24)); g.quadraticCurveTo(...hf(48, 30), ...hf(40, 26)); g.quadraticCurveTo(...hf(34, 30), ...hf(26, 26)); g.closePath(); }, bc, pass);
  };
  const hatBack = pass => {                                           // behind the head
    const k = HA.kind;
    if (k === 'hood') poly(() => g.arc(...hf(-10, -2), 58 * hs, 0, TAU), col('cap'), pass);
    if (k === 'bubble') poly(() => g.arc(...hf(-4, -2), 66 * hs, 0, TAU), col('cap'), pass);
    if (k === 'chef') { [[-26, -76, 24], [4, -90, 28], [32, -74, 24], [-2, -64, 26]].forEach(([px, py, r]) => poly(() => g.arc(...hh(px, py), r * hz * hs, 0, TAU), col('cap'), pass)); }
  };
  const hat = pass => {                                               // on top of the head
    const k = HA.kind;
    if (k === 'none') return;
    if (k === 'cap') return cap(pass);
    if (k === 'bamboo' || k === 'conical') {
      poly(() => { g.moveTo(...hh(-96, -16)); g.bezierCurveTo(...hh(-62, -30), ...hh(-26, -70), ...hh(6, -100)); g.bezierCurveTo(...hh(36, -70), ...hh(66, -30), ...hh(98, -12)); g.quadraticCurveTo(...hh(2, 4), ...hh(-96, -16)); g.closePath(); }, col('cap'), pass);
      if (pass === 2) {
        const c2 = col('cap2'); [-64, -34, -4, 26, 56].forEach(px => dline([hh(6, -98), hh(px * 1.5, -12 + Math.abs(px) * .02)], lw * .55, c2));
        dline([hh(-44, -48), hh(2, -40), hh(52, -46)], lw * .55, c2); dline([hh(-70, -28), hh(2, -18), hh(76, -26)], lw * .55, c2);
        dline([hh(-10, -6), hh(-16, 40), hh(30, 54)], lw * .5, c2);                               // chin cord
      }
    } else if (k === 'beanie') {
      poly(() => { g.moveTo(...hh(-50, -6)); g.bezierCurveTo(...hh(-58, -76), ...hh(44, -80), ...hh(50, -8)); g.closePath(); }, col('cap'), pass);
      poly(() => { g.moveTo(...hh(-53, -22)); g.lineTo(...hh(52, -22)); g.lineTo(...hh(52, -4)); g.lineTo(...hh(-53, -4)); g.closePath(); }, col('cap2'), pass);
      poly(() => g.arc(...hh(-2, -74), 11 * hz * hs, 0, TAU), col('cap2'), pass);
    } else if (k === 'hood') {
      band(...hf(-4, -2), 46 * hs, (180 + 8) * Math.PI / 180 + aH, (335) * Math.PI / 180 + aH, 17 * hs, col('cap'), pass);
    } else if (k === 'crown') {
      poly(() => { const pts = [[-34, -38], [-38, -72], [-20, -54], [0, -82], [20, -54], [38, -72], [34, -38]]; pts.forEach((p, i) => i ? g.lineTo(...hh(...p)) : g.moveTo(...hh(...p))); g.closePath(); }, col('cap'), pass);
      if (pass === 2) { [[-38, -72], [0, -82], [38, -72]].forEach(p => dot(hh(...p), 5 * hz, cc('#d8483c'), true)); dline([hh(-33, -46), hh(33, -46)], lw * .6, col('cap2')); }
    } else if (k === 'helmet') {
      poly(() => { g.moveTo(...hh(-54, 20)); g.bezierCurveTo(...hh(-60, -74), ...hh(46, -80), ...hh(52, -14)); g.lineTo(...hh(40, -14)); g.lineTo(...hh(40, 18)); g.lineTo(...hh(30, 18)); g.lineTo(...hh(30, -14)); g.lineTo(...hh(-14, -14)); g.lineTo(...hh(-16, 30)); g.lineTo(...hh(-44, 30)); g.closePath(); }, col('cap'), pass);
      if (pass === 2) { dline([hh(-52, -14), hh(-4, -20), hh(50, -14)], lw * .6, col('cap2')); [-40, -10, 22].forEach(px => dot(hh(px, -38 + Math.abs(px) * .1), 3.2 * hz, col('cap2'))); dline([hh(0, -64), hh(0, -22)], lw * .6, col('cap2')); }
      if (HA.plume) poly(() => { const s = sw * 6; g.moveTo(...hh(-6, -66)); g.quadraticCurveTo(...hh(-20, -112 + s), ...hh(-72, -92 + s)); g.quadraticCurveTo(...hh(-40, -88), ...hh(-42, -70)); g.quadraticCurveTo(...hh(-30, -80), ...hh(8, -64)); g.closePath(); }, cc(HA.plume), pass);
    } else if (k === 'chef') {
      poly(() => rr(g, ...hh(-42, -54), 84 * hz * hs, 26 * hz * hs, 6), col('cap2'), pass);
      if (pass === 2) { dline([hh(-30, -54), hh(-30, -29)], lw * .5, line); dline([hh(0, -54), hh(0, -29)], lw * .5, line); dline([hh(30, -54), hh(30, -29)], lw * .5, line); }
    } else if (k === 'beret') {
      poly(() => { g.save(); g.translate(...hh(-12, -50)); g.rotate(aH - .18); g.ellipse(0, 0, 60 * hz * hs, 22 * hz * hs, 0, 0, TAU); g.restore(); }, col('cap'), pass);
      poly(() => g.arc(...hh(-14, -72), 6 * hz * hs, 0, TAU), col('cap'), pass);
    } else if (k === 'headphones') {
      band(...hf(0, 0), 55 * hs, (192) * Math.PI / 180 + aH, 345 * Math.PI / 180 + aH, 9 * hs, col('cap'), pass);
      poly(() => g.ellipse(...hf(-24, 8), 11 * hz * hs, 16 * hz * hs, aH, 0, TAU), col('cap2'), pass);
      if (pass === 2) dot(hf(-24, 8), 5.5 * hz * hs, col('cap'), false);
    }
  };
  const extras = pass => {
    for (const e of L.extras) {
      const c = e.color ? cc(e.color) : col('cap2');
      if (e.kind === 'antenna') { capsule(hf(2, -46), hf(8, -84), 6, c, pass); poly(() => g.arc(...hf(9, -90), 8 * hs, 0, TAU), e.tip ? cc(e.tip) : cc('#e5503c'), pass); }
      if (e.kind === 'headband') band(...hf(0, 0), 49 * hs, (200) * Math.PI / 180 + aH, 340 * Math.PI / 180 + aH, 9 * hs, c, pass);
    }
  };
  const lateHat = pass => {                                           // over the face
    if (HA.kind === 'bubble') {
      band(...hf(0, 0), 52 * hs, 0, TAU, 10 * hs, col('cap'), pass);
      if (pass === 2) {
        g.beginPath(); g.arc(...hf(0, 0), 47 * hs, 0, TAU); g.fillStyle = 'rgba(120,170,220,.20)'; g.fill();
        g.beginPath(); g.arc(...hf(0, 0), 38 * hs, 3.5, 4.5); g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineCap = 'round'; g.stroke();
      }
    }
  };
  // ---------------------------------------------------------------- the passes
  const passes = pass => {
    // back: scarf tail or cape, back hair, hood, helmet shell, backpack / scroll behind the torso
    for (let i = 0; i < tail.length - 1; i++) capsule(tail[i], tail[i + 1], (22 - i * 1.7) * (NE.width ?? 1), i % 2 ? col('scarf2') : col('scarf'), pass);
    if (NE.kind === 'cape') poly(() => {
      const n = 6, len = 118 * (NE.len ?? 1), fl = NE.flow ?? 1, F = [], R = [];
      for (let i = 0; i <= n; i++) { const u = i / n, f = up(-22 - u * 6, -98 + u * len); F.push(f); R.push([f[0] - (6 + 42 * u * u * fl * (.55 + .45 * speedK)) + Math.sin(wx / 65 - i * .9) * 7 * u * fl, f[1] + 4 * u]); }
      g.moveTo(...F[0]); for (let i = 1; i <= n; i++) g.lineTo(...F[i]); for (let i = n; i >= 0; i--) g.lineTo(...R[i]); g.closePath();
    }, col('scarf'), pass);
    hairBack(pass); hatBack(pass);
    if (BG.kind === 'backpack') { const s = BG.size || 1; poly(() => { g.save(); g.translate(...up(-40, -50)); g.rotate(lean + bagSw * .6); rr(g, -26 * s, -50 * s, 52 * s, 96 * s * (space ? 1.1 : 1), 14); g.restore(); }, col('bag'), pass); }
    if (BG.kind === 'scroll') capsule(up(-46, -106), up(0, -2), 19 * (BG.size || 1), col('bag'), pass);
    // arm (far), then the legs and the body in the order the outfit needs
    const armF = () => {
      capsule(SH, aF.E, 16 * armW, col('coat2'), pass); capsule(aF.E, aF.H, 15 * armW, col('coat2'), pass);
      if (pass === 2) { if (robot) { dot(aF.E, 9, handC); } dot(aF.H, (robot ? 9 : 10) * (space ? 1.2 : 1), handC || col('skin2'), false); }
    };
    armF();
    const legFar = () => {
      capsule(hip, legPts[1].K, 21 * legW, shorts ? col('skin2') : col('pants2'), pass); capsule(legPts[1].K, legPts[1].A, 19 * legW, shorts ? col('skin2') : col('pants2'), pass);
      if (pass === 2 && shorts) capsule(hip, lerp2(hip, legPts[1].K, .6), 23 * legW, col('pants2'), pass);
      shoe(legPts[1].A, legPts[1].ang, col('shoe'), pass);
    };
    const legNear = () => {
      capsule(hip, legPts[0].K, 23 * legW, shorts ? col('skin') : col('pants'), pass); capsule(legPts[0].K, legPts[0].A, 21 * legW, shorts ? col('skin') : col('pants'), pass);
      if (pass === 2 && shorts) capsule(hip, lerp2(hip, legPts[0].K, .6), 26 * legW, col('pants'), pass);
      if (pass === 2 && robot) { dot(legPts[0].K, 10, cc(OF.color2 || '#6d7d8a'), true); dot(legPts[1].K, 9, cc(OF.color2 || '#6d7d8a'), true); }
      shoe(legPts[0].A, legPts[0].ang, col('shoe'), pass);
    };
    if (skirted) { legFar(); legNear(); skirt(pass); torso(pass); } else { legFar(); torso(pass); }
    if (pass === 2) {
      outfitDetails();
      if (BG.kind === 'satchel') strap();
      if (BG.kind === 'backpack') strapTo([up(-8, -95), up(15, -58), up(-24, -30)]);
      if (BG.kind === 'scroll') strapTo([up(-14, -96), up(16, -50), up(-4, -14)]);
      if (BG.kind === 'scroll') { const a = up(-46, -106), b = up(0, -2); [a, b].forEach(p => dot(p, 8 * (BG.size || 1), col('bag2'), true)); dline([lerp2(a, b, .45), lerp2(a, b, .55)], 9, col('scarf')); }
    }
    if (!skirted) legNear();
    // head: hair, beard, hat
    head(pass); beard(pass); hairFront(pass); hat(pass); extras(pass);
    if (BG.kind === 'satchel' || BG.kind === 'basket') bag(pass);
    if (pass === 2) {
      if (BG.kind === 'basket') { g.save(); g.translate(bagA[0], bagA[1]); g.rotate(bagSw); dline([[-30, 8], [30, 8]], lw * .5, col('bag2')); dline([[-30, 22], [30, 22]], lw * .5, col('bag2')); dline([[-30, 36], [28, 36]], lw * .5, col('bag2')); [-14, 4, 22].forEach(px => dline([[px, -4], [px + 2, 46]], lw * .5, col('bag2'))); g.restore(); }
      g.lineWidth = lw * .8; g.strokeStyle = line;
      // face: eye, brow, cheek, nose, mouth; hair at the back
      const f = hf;
      if (HR.kind === 'back') { g.beginPath(); const h0 = f(-46, -2), h1 = f(-52, 24), h2 = f(-30, 40); g.moveTo(...h0); g.quadraticCurveTo(...h1, ...h2); g.quadraticCurveTo(...f(-24, 20), ...h0); g.fillStyle = col('hair'); g.fill(); g.stroke(); }
      const blink = (Math.floor(o.t * 24) % 96) < 3 ? .15 : 1, ey = f(24, 4), ink = FA.color ? cc(FA.color) : line;
      if (FA.eyes === 'dot') { g.fillStyle = line; g.beginPath(); g.ellipse(ey[0], ey[1], 5, 6.5 * blink, 0, 0, TAU); g.fill(); }
      else if (FA.eyes === 'round') { g.fillStyle = '#fffdf4'; g.beginPath(); g.ellipse(ey[0], ey[1], 9, 11 * blink, 0, 0, TAU); g.fill(); g.lineWidth = lw * .6; g.stroke(); g.fillStyle = line; g.beginPath(); g.ellipse(ey[0] + 2, ey[1] + 1, 4.2, 5 * blink, 0, 0, TAU); g.fill(); }
      else if (FA.eyes === 'closed') { g.beginPath(); g.moveTo(...f(16, 3)); g.quadraticCurveTo(...f(24, 12), ...f(33, 3)); g.lineWidth = 3; g.strokeStyle = line; g.stroke(); }
      else if (FA.eyes === 'led') { g.fillStyle = ink === line ? cc('#7fe8ff') : ink; g.beginPath(); rr(g, ...f(16, -6), 14, 18 * blink, 3); g.fill(); g.lineWidth = lw * .5; g.strokeStyle = line; g.stroke(); }
      else if (FA.eyes === 'visor') { g.beginPath(); g.moveTo(...f(0, -14)); g.lineTo(...f(52, -14)); g.lineTo(...f(52, 14)); g.lineTo(...f(0, 14)); g.closePath(); g.fillStyle = '#1d2630'; g.fill(); g.lineWidth = lw * .6; g.strokeStyle = line; g.stroke(); g.fillStyle = FA.color ? cc(FA.color) : cc('#7fe8ff'); g.beginPath(); rr(g, ...f(22, -5), 20, 10 * blink, 3); g.fill(); }
      if (FA.eyes !== 'visor' && FA.eyes !== 'led' && FA.eyes !== 'none' && FA.brows !== false) { g.beginPath(); const b0 = f(15, -9 - (P.brow || 0)), b1 = f(32, -12 + (P.brow || 0) * .5); g.moveTo(...b0); g.lineTo(...b1); g.lineWidth = 3; g.strokeStyle = line; g.stroke(); }
      if (L.head.cheeks && FA.eyes !== 'visor' && FA.eyes !== 'led') { g.fillStyle = L.head.cheeks === 'neck' ? col('scarf') : cc(L.head.cheeks); g.globalAlpha = .35; g.beginPath(); const ck = f(14, 22); g.arc(ck[0], ck[1], 8, 0, TAU); g.fill(); g.globalAlpha = 1; }
      if (FA.nose !== false && FA.eyes !== 'visor' && FA.eyes !== 'led') { g.fillStyle = col('skin'); g.beginPath(); const ns = f(46, 8); g.arc(ns[0], ns[1], 7, 0, TAU); g.fill(); g.lineWidth = lw * .7; g.strokeStyle = line; g.beginPath(); g.arc(ns[0], ns[1], 7, -1.2, 1.3); g.stroke(); }
      if (FA.mouth === 'curve') { g.beginPath(); const m0 = f(24, 28), m1 = f(36, 34 + (P.mouth || 0) * 8), m2 = f(42, 28); g.moveTo(...m0); g.quadraticCurveTo(...m1, ...m2); g.lineWidth = 3; g.strokeStyle = line; g.stroke(); }
      else if (FA.mouth === 'smile') { g.beginPath(); g.moveTo(...f(20, 26)); g.quadraticCurveTo(...f(34, 40 + (P.mouth || 0) * 8), ...f(46, 24)); g.lineWidth = 3; g.strokeStyle = line; g.lineCap = 'round'; g.stroke(); }
      else if (FA.mouth === 'flat') dline([f(22, 30), f(42, 30)], 3, line);
      else if (FA.mouth === 'grille') { g.beginPath(); rr(g, ...f(22, 22), 24, 14, 3); g.fillStyle = '#222a33'; g.fill(); g.lineWidth = lw * .4; g.strokeStyle = line; g.stroke(); [28, 34, 40].forEach(px => dline([f(px - 4, 23), f(px - 4, 35)], 1.6, cc('#9fb0bd'))); }
      if (FA.beard === 'stubble') { g.fillStyle = line; g.globalAlpha = .4; for (let i = 0; i < 16; i++) { const p = hp(20 + i * 9, 40 + hash(i * 3.1) * 5); g.beginPath(); g.arc(p[0], p[1], 1.6, 0, TAU); g.fill(); } g.globalAlpha = 1; }
      if (FA.glasses) {
        const gl = FA.glasses, ge = f(30, 4); g.lineWidth = lw * .8; g.strokeStyle = line;
        if (gl === 'round') { g.beginPath(); g.arc(ge[0], ge[1], 15, 0, TAU); g.fillStyle = 'rgba(210,235,255,.28)'; g.fill(); g.stroke(); dline([f(15, 2), f(-20, -2)], lw * .7, line); }
        else if (gl === 'square') { g.beginPath(); rr(g, ge[0] - 17, ge[1] - 12, 34, 26, 5); g.fillStyle = 'rgba(210,235,255,.28)'; g.fill(); g.stroke(); dline([f(13, 0), f(-20, -2)], lw * .7, line); }
        else { g.beginPath(); rr(g, ge[0] - 19, ge[1] - 10, 40, 22, 9); g.fillStyle = '#1b1b20'; g.fill(); g.stroke(); dline([f(11, -2), f(-20, -4)], lw * .8, line); }
      }
    }
    lateHat(pass);
    if (pass === 2 && o.tag) {                                                    // the message tag swings from the satchel
      g.save(); g.translate(bagA[0] + 20, bagA[1] + 40); g.rotate(bagSw * 2.2 + Math.sin(ph * 1 + 1) * .1 * speedK); o.tag(g); g.restore();
    }
    capsule(SH, aN.E, 17 * armW, col('coat'), pass); capsule(aN.E, aN.H, 16 * armW, col('coat'), pass);
    if (pass === 2) { if (robot) dot(aN.E, 9.5, handC, true); g.beginPath(); g.arc(aN.H[0], aN.H[1], handR, 0, TAU); g.fillStyle = handC || col('skin'); g.fill(); g.lineWidth = lw * .8; g.strokeStyle = line; g.stroke(); }
    if (armor && pass === 2) { dot(SH, 24, col('coat'), true); dline([[SH[0] - 14, SH[1] - 6], [SH[0] + 14, SH[1] + 6]], lw * .5, col('coat2')); }
    if (HE.kind !== 'none' && HE.kind !== 'token' || HE.draw) heldItem(pass);
    // neck: scarf collar ring, cape clasp, collar
    if (NE.kind === 'scarf') capsule([NK[0] - 14, NK[1] + 2], [NK[0] + 12, NK[1] + 4], 24 * (NE.width ?? 1), col('scarf'), pass);
    else if (NE.kind === 'cape') { capsule([NK[0] - 12, NK[1] + 4], [NK[0] + 10, NK[1] + 6], 17, col('scarf'), pass); if (pass === 2) dot([NK[0] + 6, NK[1] + 10], 5, cc(NE.clasp || '#e6c15a'), true); }
    else if (NE.kind === 'collar') capsule([NK[0] - 14, NK[1] + 2], [NK[0] + 12, NK[1] + 4], 20 * (NE.width ?? 1), col('scarf'), pass);
  };
  function lerp2(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; }
  // ---------------------------------------------------------------- body details (inside the silhouette, pass 2 only)
  function outfitDetails() {
    if (robe || dress) {
      const bc = beltC || col('coat2'), a = up(-27, -22), b = up(29, -24), c = up(29, -8), d = up(-27, -6);
      dpoly([a, b, c, d], bc, true);
      if (robe) { dline([up(-2, -100), up(14, -50)], lw * .8, line); dline([up(24, -96), up(14, -50)], lw * .8, line); if (OF.trim) dline([up(-2, -100), up(14, -50), up(18, -20)], 6, cc(OF.trim)); }
    }
    if (OF.kind === 'suit') { dpoly([up(6, -99), up(22, -97), up(14, -52)], cc('#f4f1ea'), true); dpoly([up(13, -90), up(18, -88), up(21, -64), up(15, -56), up(10, -64)], cc(OF.tie || '#c0392b'), true); dline([up(0, -98), up(12, -46)], lw * .7, line); }
    if (armor) { dline([up(-24, -72), up(4, -66), up(26, -72)], lw * .7, col('coat2')); dpoly([up(-27, -20), up(29, -22), up(29, -6), up(-27, -4)], beltC || col('coat2'), true); [-14, 0, 14].forEach(px => dot(up(px, -13), 2.6, col('coat'))); dline([up(2, -96), up(4, -24)], lw * .6, col('coat2')); }
    if (OF.kind === 'overalls') { dpoly([up(-26, 0), up(28, 0), up(30, -34), up(-26, -34)], col('pants'), true); dpoly([up(-4, -34), up(26, -34), up(24, -72), up(-4, -72)], col('pants'), true); dline([up(0, -72), up(-8, -94)], 6, col('pants')); dline([up(22, -72), up(20, -96)], 6, col('pants')); dot(up(8, -52), 3.4, cc('#e6c15a'), true); }
    if (space) { dpoly([up(2, -78), up(26, -80), up(26, -50), up(2, -48)], cc('#c9ced3'), true); dot(up(8, -70), 3.2, cc('#e5503c')); dot(up(15, -70), 3.2, cc('#4aa8e8')); dot(up(22, -70), 3.2, cc('#f2c230')); dline([up(-26, -22), up(28, -24)], 7, cc(OF.belt || '#8a96a3')); dline([up(-26, -22), up(28, -24)], lw * .5, line); dline([up(-24, -90), up(-22, -8)], lw * .5, cc('#c9ced3')); }
    if (robot) {
      dpoly([up(-8, -84), up(28, -84), up(28, -34), up(-8, -34)], cc(OF.color2 || '#6d7d8a'), true);
      [[0, -72, '#e5503c'], [10, -72, '#7fe8ff'], [20, -72, '#f2c230']].forEach(([px, py, c]) => dot(up(px, py), 3.6, cc(c), true));
      [-62, -54, -46].forEach(py => dline([up(0, py), up(22, py)], 2.4, line));
    }
    if (OF.kind === 'jacket' && OF.zip) dline([up(8, -98), up(10, -10)], 2.4, cc(OF.zip));
    if (beltC && (OF.kind === 'jacket' || OF.kind === 'overalls' || OF.kind === 'suit')) dline([up(-26, -12), up(28, -14)], 8, beltC);
  }
  // ---------------------------------------------------------------- the thing in the near hand (all three passes)
  function redrawHand() { g.beginPath(); g.arc(aN.H[0], aN.H[1], handR, 0, TAU); g.fillStyle = handC || col('skin'); g.fill(); g.lineWidth = lw * .8; g.strokeStyle = line; g.stroke(); }
  function heldItem(pass) {
    const H = aN.H, hc = HE.color ? cc(HE.color) : cc('#8b6a43'), hc2 = HE.color2 ? cc(HE.color2) : mixc(hc, '#000000', .2), k = HE.kind, swing = Math.sin(ph) * .12 * speedK;
    if (HE.draw) { if (pass === 2) HE.draw(g, H, { ph, gy, speedK, line, lw, t: o.t }); return; }
    if (k === 'staff') {
      const lean2 = .1, lift = Math.max(0, Math.sin(ph)) * 16 * speedK, by = gy - 4 - lift, bot = [H[0] + (by - H[1]) * Math.tan(lean2), by], len = (HE.length || 60), dx = -Math.sin(lean2), dy = -Math.cos(lean2), top = [H[0] + dx * len, H[1] + dy * len], l = 1;
      capsule(bot, top, 9, hc, pass);
      if (HE.top === 'ring') { poly(() => g.arc(top[0] - dx / l * 6, top[1] - dy / l * 6, 14, 0, TAU), hc2, pass); if (pass === 2) { g.beginPath(); g.arc(top[0] - dx / l * 6, top[1] - dy / l * 6, 7, 0, TAU); g.fillStyle = 'rgba(0,0,0,.18)'; g.fill(); } }
      else if (HE.top === 'knob') poly(() => g.arc(top[0], top[1], 11, 0, TAU), hc2, pass);
      // re-draw the hand over the staff
      if (pass === 2) { g.beginPath(); g.arc(H[0], H[1], handR, 0, TAU); g.fillStyle = handC || col('skin'); g.fill(); g.lineWidth = lw * .8; g.strokeStyle = line; g.stroke(); }
    } else if (k === 'lantern') {
      const a = swing + .1, bx = H[0] + Math.sin(a) * 40, by = H[1] + Math.cos(a) * 40;
      capsule(H, [bx, by - 12], 4, line, pass === 2 ? 2 : pass);
      poly(() => { g.save(); g.translate(bx, by + 18); g.rotate(a * .6); rr(g, -17, -30, 34, 54, 10); g.restore(); }, hc, pass);
      if (pass === 2) { g.save(); g.translate(bx, by + 18); g.rotate(a * .6); g.beginPath(); rr(g, -10, -22, 20, 36, 6); g.fillStyle = cc('#ffe9a8'); g.fill(); g.restore(); const gr = g.createRadialGradient(bx, by + 18, 4, bx, by + 18, 90); gr.addColorStop(0, 'rgba(255,225,140,.40)'); gr.addColorStop(1, 'rgba(255,225,140,0)'); g.fillStyle = gr; g.beginPath(); g.arc(bx, by + 18, 90, 0, TAU); g.fill(); }
    } else if (k === 'phone') {
      poly(() => { g.save(); g.translate(H[0] + 8, H[1] - 14); g.rotate(-.35 + swing); rr(g, -12, -22, 24, 42, 5); g.restore(); }, cc(HE.color || '#2b2f38'), pass);
      if (pass === 2) { g.save(); g.translate(H[0] + 8, H[1] - 14); g.rotate(-.35 + swing); g.beginPath(); rr(g, -8, -17, 16, 30, 3); g.fillStyle = cc(HE.color2 || '#8fd3ff'); g.fill(); g.restore(); redrawHand(); }
    } else if (k === 'book') {
      poly(() => { g.save(); g.translate(H[0] + 12, H[1] - 10); g.rotate(-.2 + swing); rr(g, -24, -20, 48, 38, 4); g.restore(); }, hc, pass);
      if (pass === 2) { g.save(); g.translate(H[0] + 12, H[1] - 10); g.rotate(-.2 + swing); dline([[-16, -8], [16, -8]], 2, cc('#f6efd8')); dline([[-16, 0], [16, 0]], 2, cc('#f6efd8')); dline([[-16, 8], [10, 8]], 2, cc('#f6efd8')); g.restore(); redrawHand(); }
    } else if (k === 'scroll') {
      const a = [H[0] - 26, H[1] + 4], b = [H[0] + 40, H[1] - 8];
      capsule(a, b, 17, hc, pass); if (pass === 2) { dot(a, 7, hc2, true); dot(b, 7, hc2, true); dline([lerp2(a, b, .5), lerp2(a, b, .5)], 11, cc(HE.color2 || '#c0392b')); g.beginPath(); g.arc(H[0], H[1], handR, 0, TAU); g.fillStyle = handC || col('skin'); g.fill(); g.lineWidth = lw * .8; g.strokeStyle = line; g.stroke(); }
    } else if (k === 'sword') {
      const tip = [H[0] + 22, H[1] - 104], base = [H[0] - 4, H[1] + 14];
      capsule(base, tip, 10, cc(HE.color || '#cfd6dc'), pass); capsule([H[0] - 16, H[1] + 6], [H[0] + 10, H[1] + 4], 8, cc(HE.color2 || '#c9a24a'), pass);
      if (pass === 2) { g.beginPath(); g.arc(H[0], H[1], handR, 0, TAU); g.fillStyle = handC || col('skin'); g.fill(); g.lineWidth = lw * .8; g.strokeStyle = line; g.stroke(); }
    }
  }
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  if (st.shadow !== false) { g.fillStyle = 'rgba(0,0,0,.20)'; g.beginPath(); g.ellipse(x + 8, gy + 6, 70 - (P.hop || 0) * .2, 11, 0, 0, TAU); g.fill(); }
  passes(0); passes(1); passes(2);
  g.restore();
  return { hip, SH, NK, HD, aN, aF, bag: bagA };
}

// ------------------------------------------------------------------ companions: extra followers with their own look, same walk cycle
// S.companions (or era.companions) = [{kind:'human'|'dog'|'cat'|'bot', look, color, color2, dx, t0, t1, dur, scale, phase, front}]
//   dx: screen offset from the walker (negative = behind, default -170); t0: joins at this time (walks in from the left); t1: drops back out of frame
//   'human' draws a second walker with `look` (use scale .6 to .8 for a child or a sidekick); 'dog', 'cat', 'bot' are generic little followers.
export function companion(g, o) {
  if (!o.kind || o.kind === 'human') { walker(g, { ...o, tag: null, pose: o.pose || {} }); return; }
  const st = o.style || STY_FULL, s = o.scale ?? 1, { x, y: gy, wx, t } = o;
  if (st.pixel) return pixelate(g, o, st, (sg, st2) => companion(sg, { ...o, style: st2 }));
  const k = o.kind, col = c => styleCol(st, c);
  const base = o.color || (k === 'cat' ? '#d9a566' : k === 'bot' ? '#9fb4c4' : '#b98a58'), dark = o.color2 || mixc(base, '#000000', .22), belly = mixc(base, '#ffffff', .45);
  g.save(); g.translate(x, gy); g.scale(s, s); g.lineJoin = 'round'; g.lineCap = 'round';
  const sst = { ...st, lw: st.lw / s, rw: st.rw / s };
  const { capsule, poly } = brush(g, sst);
  const A = o.phase || 0;
  if (st.shadow !== false) { g.fillStyle = 'rgba(0,0,0,.20)'; g.beginPath(); g.ellipse(6, 5, 52, 8, 0, 0, TAU); g.fill(); }
  if (k === 'bot') {
    const roll = wx / 20 + A, bob = Math.sin(wx / 40 + A) * 2, B = col(base), D = col(dark), eyeC = col(o.eye || '#7fe8ff');
    const pass = p => {
      poly(() => g.arc(0, -22, 22, 0, TAU), D, p);
      poly(() => { rr(g, -30, -84 + bob, 60, 50, 12); }, B, p);
      capsule([0, -84 + bob], [-3 + Math.sin(wx / 50) * 3, -104 + bob], 5, D, p); poly(() => g.arc(-3 + Math.sin(wx / 50) * 3, -108 + bob, 7, 0, TAU), col(o.tip || '#e5503c'), p);
      capsule([30, -62 + bob], [44, -48 + bob + Math.sin(roll) * 3], 8, D, p);
      if (p === 2) {
        g.beginPath(); rr(g, -22, -76 + bob, 44, 28, 8); g.fillStyle = '#1d2630'; g.fill(); const bl = (Math.floor(t * 24) % 96) < 3 ? .2 : 1;
        g.fillStyle = eyeC; [-9, 9].forEach(px => { g.beginPath(); g.ellipse(px, -62 + bob, 5, 7 * bl, 0, 0, TAU); g.fill(); });
        for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, -22); g.lineTo(Math.cos(roll + i * 1.047) * 17, -22 + Math.sin(roll + i * 1.047) * 17); g.lineWidth = 3; g.strokeStyle = st.line; g.stroke(); }
        g.beginPath(); g.arc(0, -22, 5, 0, TAU); g.fillStyle = B; g.fill();
      }
    };
    pass(0); pass(1); pass(2); g.restore(); return;
  }
  // quadruped: diagonal pairs swing together, one cycle = 88 px of ground
  const ph = (wx / 88) * TAU + A + Math.PI / 2, Bc = col(base), Dc = col(dark), Lc = col(belly), bob = Math.abs(Math.sin(ph)) * 2.2;
  const hipP = [-32, -50 - bob], shP = [30, -52 - bob];
  const leg = (root, off, fill, p) => {
    const th = Math.sin(ph + off) * .62, lift = Math.max(0, Math.cos(ph + off - .3)) * 9, f = [root[0] + Math.sin(th) * 40, Math.min(-2, root[1] + Math.cos(th) * 40 - lift)];
    capsule(root, f, 13, fill, p); if (p === 2) { g.beginPath(); g.ellipse(f[0] + 4, f[1] - 1, 9, 5, 0, 0, TAU); g.fillStyle = Lc; g.fill(); }
  };
  const tw = Math.sin(t * (k === 'dog' ? 11 : 4) + A) * (k === 'dog' ? .5 : .25);
  const pass = p => {
    leg(hipP, Math.PI, Dc, p); leg(shP, 0, Dc, p);
    // tail
    if (k === 'dog') capsule([-48, -58 - bob], [-72 + Math.sin(tw) * 4, -86 - bob + tw * 10], 9, Dc, p);
    else { capsule([-48, -58 - bob], [-74, -70 - bob], 8, Dc, p); capsule([-74, -70 - bob], [-84 + tw * 20, -112 - bob], 8, Dc, p); }
    poly(() => { g.moveTo(-54, -52 - bob); g.quadraticCurveTo(-52, -78 - bob, -10, -74 - bob); g.quadraticCurveTo(34, -78 - bob, 52, -64 - bob); g.quadraticCurveTo(54, -38 - bob, 20, -34 - bob); g.quadraticCurveTo(-20, -30 - bob, -54, -52 - bob); g.closePath(); }, Bc, p);
    leg(hipP, 0, Bc, p); leg(shP, Math.PI, Bc, p);
    const hx = 58, hy = -74 - bob;
    capsule([shP[0] + 8, shP[1] - 10], [hx, hy], 24, Bc, p);
    poly(() => g.arc(hx + 6, hy - 4, 22, 0, TAU), Bc, p);
    capsule([hx + 12, hy + 2], [hx + 36, hy + 6], 17, k === 'cat' ? Bc : Lc, p);
    if (k === 'cat') { poly(() => { g.moveTo(hx - 8, hy - 18); g.lineTo(hx - 6, hy - 42); g.lineTo(hx + 10, hy - 22); g.closePath(); }, Bc, p); poly(() => { g.moveTo(hx + 8, hy - 22); g.lineTo(hx + 16, hy - 44); g.lineTo(hx + 26, hy - 14); g.closePath(); }, Bc, p); }
    else poly(() => { g.save(); g.translate(hx - 6, hy - 12); g.rotate(.5 + tw * .3); g.ellipse(0, 12, 9, 19, 0, 0, TAU); g.restore(); }, Dc, p);
    if (p === 2) {
      g.beginPath(); g.arc(hx + 16, hy - 6, 3.6, 0, TAU); g.fillStyle = st.line; g.fill();
      g.beginPath(); g.arc(hx + 46, hy + 3, 4.6, 0, TAU); g.fillStyle = '#2b2430'; g.fill();
      if (o.collar) { capsule([hx - 12, hy + 14], [hx + 8, hy + 22], 7, col(o.collar), 2); }
    }
  };
  pass(0); pass(1); pass(2); g.restore();
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

// S: { t, wx, eras (painters with x0,w), zoom, zy (pivot y), look (the protagonist, see walker), companions }
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
    // companions: extra followers (S.companions, or e.companions to replace them for this era); dx < 0 walks behind the hero, dx > 0 ahead
    const cps = ((e.companions !== undefined ? e.companions : S.companions) || []).map(cp => {
      const dx = cp.dx ?? -170, t0 = cp.t0 ?? -1e9, d = cp.dur ?? 2.4, away = cp.t1 === undefined ? 0 : ss(seg(t, cp.t1, cp.t1 + d));
      const xs = lerp(lerp(-300, WSX + dx, ss(seg(t, t0, t0 + d))), -300, away);
      return { cp, xs, front: cp.front ?? dx > 0 };
    }).filter(q => q.xs > -260);
    const drawCps = front => cps.filter(q => q.front === front).forEach(({ cp, xs }) => companion(g, { ...cp, x: xs, y: GY, wx: wx + (xs - WSX), t, style: e.walk, look: cp.look }));
    drawCps(false);
    const J = walker(g, { x: WSX, y: GY, wx, t, pose: e.pose ? e.pose(c) : {}, style: e.walk, look: mergeLook(S.look, e.look), tag: e.token ? gg => e.token(gg, c) : null });
    drawCps(true);
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
