/* Constructivist engine: inks on paper, overprint, misregister, diagonal grid, halftone cut-outs,
   constructed numerals, type on a path, wedge wipe. Pure functions of time, no state between frames. */
import { clamp, lerp, seg, mulberry, TAU } from '/core/lib.js';

export const W = 1920, H = 1080;
export const PAL = { paper: '#e8dcc0', r: '#e03a1f', k: '#17130f', o: '#dba22c', cream: '#efe6cf' };
export const setAccent = hex => { PAL.o = hex; };
export const D2R = Math.PI / 180;

const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const L = { o: mk(), r: mk(), k: mk() };
const X = { o: L.o.getContext('2d'), r: L.r.getContext('2d'), k: L.k.getContext('2d') };
const ORDER = ['o', 'r', 'k'];                    // press order: accent, red, black on top
export const REG = { r: [4, 2], o: [-3, 3], k: [0, 0] };   // standing misregistration (px)

/* ---------- paper and ink wear (screen space, seeded, drawn once) ---------- */
let PAPER, TOOTH;
export function initPaper() {
  PAPER = mk(); const g = PAPER.getContext('2d'); const R = mulberry(7);
  g.fillStyle = PAL.paper; g.fillRect(0, 0, W, H);
  const id = g.getImageData(0, 0, W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (R() - .5) * 11, m = (R() < .002 ? -18 : 0);
    d[i] += n + m; d[i + 1] += n + m; d[i + 2] += n * 1.1 + m;
  }
  g.putImageData(id, 0, 0);
  g.lineWidth = 1;
  for (let i = 0; i < 2600; i++) {                      // paper fibres
    const x = R() * W, y = R() * H, a = R() * TAU, l = 4 + R() * 14;
    g.strokeStyle = R() < .5 ? 'rgba(120,96,60,.10)' : 'rgba(255,250,235,.22)';
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * .5 + R() * 3, y + Math.sin(a) * l * .5 + R() * 3, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const v = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.05);   // darkened edges, a hint of age
  v.addColorStop(0, 'rgba(90,60,20,0)'); v.addColorStop(1, 'rgba(90,60,20,.20)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(110,80,40,.025)';                   // two faint stains
  for (const [x, y, r] of [[300, 220, 180], [1500, 860, 240]]) { g.beginPath(); g.ellipse(x, y, r, r * .6, .5, 0, TAU); g.fill(); }
  TOOTH = mk(); const t = TOOTH.getContext('2d'); const Q = mulberry(21);   // ink is eroded here: paper tooth, flecks, scuffs
  t.fillStyle = '#000';
  for (let i = 0; i < 16000; i++) { t.globalAlpha = .35 + Q() * .6; const r = .4 + Q() * Q() * 2.2; t.beginPath(); t.arc(Q() * W, Q() * H, r, 0, TAU); t.fill(); }
  t.globalAlpha = .5; t.lineWidth = 1;
  for (let i = 0; i < 60; i++) { const x = Q() * W, y = Q() * H, a = Q() * TAU, l = 20 + Q() * 90; t.strokeStyle = '#000'; t.beginPath(); t.moveTo(x, y); t.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); t.stroke(); }
}

/* ---------- compositor: draw scene into ink layers, then print them with multiply ---------- */
export function begin(cam) {
  for (const k of ORDER) {
    const g = X[k]; g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.clearRect(0, 0, W, H); g.fillStyle = g.strokeStyle = PAL[k];
    g.lineJoin = 'miter'; g.miterLimit = 6;
    if (cam) { g.translate(W / 2, H / 2); g.rotate((cam.rot || 0) * D2R); g.scale(cam.z || 1, cam.z || 1); g.translate(-(cam.x ?? W / 2), -(cam.y ?? H / 2)); }
  }
}
export const ink = k => X[k];
// transform ALL plates together (so a cut-out drawn through ink() and cut() lands in one place); fn draws via ink()/cut()
export function T(x, y, rotDeg, fn, sc = 1) { for (const k of ORDER) { const g = X[k]; g.save(); g.translate(x, y); g.rotate(rotDeg * D2R); g.scale(sc, sc); } fn(); for (const k of ORDER) X[k].restore(); }
// paper cut-out: knocks the shape out of every ink laid down so far (a pasted photo, a reserved white)
export function cut(fn) { for (const k of ORDER) { const g = X[k]; g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = g.strokeStyle = '#000'; fn(g); g.restore(); } }
export function print(out, { paper = true, jolt = 0, jx = 1, jy = .6, reg = 1 } = {}) {
  if (paper) out.drawImage(PAPER, 0, 0);
  for (const k of ORDER) {
    const g = X[k]; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = .62;
    g.drawImage(TOOTH, (k === 'r' ? 130 : k === 'o' ? -90 : 0), (k === 'r' ? -40 : k === 'o' ? 70 : 0)); g.restore();
    const dx = REG[k][0] * reg, dy = REG[k][1] * reg, j = k === 'k' ? 0 : jolt * (k === 'r' ? 1 : -.7);
    out.save(); out.globalCompositeOperation = 'multiply'; out.drawImage(L[k], dx + j * jx, dy + j * jy); out.restore();
  }
}

/* ---------- diagonal grid: u runs up-right along the axis, v is across it ---------- */
export function onGrid(g, ox, oy, angDeg, fn) { g.save(); g.translate(ox, oy); g.rotate(angDeg * D2R); fn(g); g.restore(); }
export const pt = (ox, oy, angDeg, u, v) => { const a = angDeg * D2R; return [ox + u * Math.cos(a) - v * Math.sin(a), oy + u * Math.sin(a) + v * Math.cos(a)]; };

/* ---------- block primitives (current transform) ---------- */
export const bar = (g, x, y, w, h) => g.fillRect(x, y, w, h);
export function poly(g, p) { g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.closePath(); g.fill(); }
export function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
export function ring(g, x, y, r, w) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.arc(x, y, r - w, 0, TAU, true); g.fill('evenodd'); }
export function sector(g, x, y, r, a0, a1) { g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, a0 * D2R, a1 * D2R); g.closePath(); g.fill(); }
export function stripes(g, x, y, w, h, n, duty = .5, vertical = false) {     // evenly ruled bars inside a box
  const s = (vertical ? w : h) / n;
  for (let i = 0; i < n; i++) vertical ? g.fillRect(x + i * s, y, s * duty, h) : g.fillRect(x, y + i * s, w, s * duty);
}
export function arrow(g, x, y, len, thick, head) {                          // points along +x
  g.fillRect(x, y - thick / 2, len - head * .6, thick);
  poly(g, [[x + len - head, y - head * .75], [x + len, y], [x + len - head, y + head * .75]]);
}
export function megaphone(g, x, y, s) {                                     // mouth at (x,y), bell toward +x; black body with a rim and a handle
  poly(g, [[x, y - .05 * s], [x + .36 * s, y - .19 * s], [x + .36 * s, y + .19 * s], [x, y + .05 * s]].map(p => p));
  poly(g, [[x + .36 * s, y - .215 * s], [x + .415 * s, y - .225 * s], [x + .415 * s, y + .225 * s], [x + .36 * s, y + .215 * s]]);     // bell rim
  poly(g, [[x - .09 * s, y - .06 * s], [x, y - .06 * s], [x, y + .06 * s], [x - .09 * s, y + .06 * s]]);                              // mouthpiece
  poly(g, [[x + .07 * s, y + .035 * s], [x + .125 * s, y + .06 * s], [x + .085 * s, y + .30 * s], [x + .03 * s, y + .30 * s]]);        // handle
}
export const hatch = (g, x, y, w, h, step, lw, ang = -45) => {               // ruled hatch (clip to box)
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.lineWidth = lw; g.strokeStyle = g.fillStyle;
  g.translate(x + w / 2, y + h / 2); g.rotate(ang * D2R); const R = Math.hypot(w, h);
  for (let i = -R; i < R; i += step) { g.beginPath(); g.moveTo(-R, i); g.lineTo(R, i); g.stroke(); }
  g.restore();
};

/* ---------- halftone: dots on a 45-degree screen in the local space of the cut-out ---------- */
export function halftone(g, clipFn, box, step, angDeg, dens, k = .72) {
  const [bx, by, bw, bh] = box, cx = bx + bw / 2, cy = by + bh / 2, R = Math.hypot(bw, bh) / 2 + step, n = Math.ceil(R / step);
  const ca = Math.cos(angDeg * D2R), sa = Math.sin(angDeg * D2R);
  g.save(); g.beginPath(); clipFn(g); g.clip(); g.beginPath();
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const u = i * step, v = j * step, x = cx + u * ca - v * sa, y = cy + u * sa + v * ca;
    if (x < bx - step || x > bx + bw + step || y < by - step || y > by + bh + step) continue;
    const d = dens(x, y); if (d <= .05) continue;
    const r = step * k * Math.sqrt(Math.min(1, d)); g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU);
  }
  g.fill(); g.restore();
}

/* ---------- the cut-out figure: a sprinter built from straight-edged pieces ---------- */
const vec = (a, l) => [Math.sin(a * D2R) * l, Math.cos(a * D2R) * l];            // angle from straight down, forward positive
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
function limb(a, b, wa, wb, ext = 0) {                                         // tapered quad between joints, ends pushed out by ext
  let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
  a = [a[0] - ux * ext, a[1] - uy * ext]; b = [b[0] + ux * ext, b[1] + uy * ext];
  return [[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2], [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]];
}
export const POSES = {
  drive: { lean: 22, fT: 74, fS: 8, bT: -34, bS: -56, fA: 56, fF: 152, bA: -54, bF: 34 },
  reach: { lean: 14, fT: 52, fS: -6, bT: -30, bS: -46, fA: 70, fF: 140, bA: -60, bF: 20 },
  give:  { lean: 20, fT: 70, fS: 4, bT: -32, bS: -54, fA: 88, fF: 84, bA: -50, bF: 30 },
  take:  { lean: 16, fT: 58, fS: -4, bT: -30, bS: -50, fA: 60, fF: 150, bA: -84, bF: -88 },
  stand: { lean: 4, fT: 6, fS: 0, bT: -6, bS: -4, fA: 8, fF: 14, bA: -6, bF: 6 },
  cheer: { lean: 0, fT: 7, fS: 1, bT: -7, bS: -2, fA: 146, fF: 170, bA: -146, bF: -170 },
  stride: { lean: 12, fT: 44, fS: -12, bT: -26, bS: -34, fA: -40, fF: 28, bA: 50, bF: 140 },
};
export function pose(a, b, t) { const o = {}; for (const k in a) o[k] = lerp(a[k], b[k], t); return o; }
export function skeleton(P, s) {                      // joints in px, hip at the origin, y down
  const hip = [0, 0], shoulder = [Math.sin(P.lean * D2R) * .30 * s, -Math.cos(P.lean * D2R) * .30 * s];
  const head = add(shoulder, [Math.sin((P.lean + 12) * D2R) * .125 * s, -Math.cos((P.lean + 12) * D2R) * .125 * s]);
  const fk = add(hip, vec(P.fT, .25 * s)), fa = add(fk, vec(P.fS, .25 * s)), bk = add(hip, vec(P.bT, .25 * s)), ba = add(bk, vec(P.bS, .25 * s));
  const fe = add(shoulder, vec(P.fA, .165 * s)), fh = add(fe, vec(P.fF, .15 * s)), be = add(shoulder, vec(P.bA, .165 * s)), bh = add(be, vec(P.bF, .15 * s));
  return { hip, shoulder, head, fk, fa, bk, ba, fe, fh, be, bh };
}
/* a cut-out puppet: tapered pieces that overlap at the joints, a rivet at every joint, a head with a profile face.
   Draws at origin = hip, s = px of full height, facing right. opts: shirt / shorts / band (ink names), tone, light */
export function runner(g, P, s, opts = {}) {
  const J = skeleton(P, s), T = opts.tone ?? 1, light = opts.light ?? [-.6, -.8];
  const { hip, shoulder, head, fk, fa, bk, ba, fe, fh, be, bh } = J;
  const foot = (a, ang) => [add(a, vec(ang - 20, .04 * s)), add(a, vec(ang + 94, .125 * s)), add(add(a, vec(ang + 94, .03 * s)), vec(ang + 180, .045 * s)), add(a, vec(ang + 180, .05 * s))];
  const hand = (a) => { const r = .034 * s; return [[a[0] - r, a[1] - r], [a[0] + r, a[1] - r * .6], [a[0] + r, a[1] + r], [a[0] - r * .8, a[1] + r]]; };
  const items = [];   // back to front
  const L = (pts, tone, flat) => items.push({ pts, tone, flat });
  const R = (c, r) => items.push({ disc: c, r });
  const ex = .018 * s;                                    // limbs run a little past the joint so the pieces overlap
  const lb = (a, b, wa, wb) => limb(a, b, wa, wb, ex);
  L(lb(shoulder, be, .07 * s, .055 * s), .8); L(lb(be, bh, .055 * s, .042 * s), .7); R(be, .03 * s); L(hand(bh), .8);
  L(lb(hip, bk, .125 * s, .085 * s), .85); L(lb(bk, ba, .085 * s, .05 * s), .78); R(bk, .044 * s); L(foot(ba, P.bS), .9);
  L(limb(hip, shoulder, .125 * s, .16 * s, ex), .5, opts.shirt);                                   // torso: the vest
  L(limb([hip[0], hip[1] - .015 * s], add(hip, [0, .06 * s]), .14 * s, .14 * s), .5, opts.shorts);   // hip block
  L(limb(hip, add(hip, vec(P.bT, .13 * s)), .13 * s, .11 * s), .5, opts.shorts);                    // shorts, back side
  L(lb(hip, fk, .135 * s, .095 * s), .7); L(lb(fk, fa, .095 * s, .055 * s), .62); R(fk, .047 * s); L(foot(fa, P.fS), .9);
  L(limb(hip, add(hip, vec(P.fT, .15 * s)), .14 * s, .12 * s, 0), .45, opts.shorts);                 // shorts, front side
  R(hip, .05 * s);
  L(limb(shoulder, add(shoulder, vec(P.lean + 4, .07 * s)), .06 * s, .06 * s, 0), .6);               // neck
  L(lb(shoulder, fe, .075 * s, .06 * s), .45); L(lb(fe, fh, .06 * s, .046 * s), .4); R(fe, .033 * s); L(hand(fh), .5);
  R(shoulder, .04 * s);
  const lw = Math.max(3, s * .008), st = Math.max(6, s * .0125);
  for (const p of items) {
    if (p.disc) {                                                                                   // joint rivet: black disc, paper pin
      const [x, y] = p.disc, r = p.r;
      cut(gg => { gg.beginPath(); gg.arc(x, y, r, 0, TAU); gg.fill(); gg.lineWidth = lw; gg.stroke(); });
      const gk = ink('k'); gk.beginPath(); gk.arc(x, y, r, 0, TAU); gk.fill();
      cut(gg => { gg.beginPath(); gg.arc(x, y, r * .3, 0, TAU); gg.fill(); });
      continue;
    }
    const path = gg => { gg.moveTo(p.pts[0][0], p.pts[0][1]); for (let i = 1; i < p.pts.length; i++) gg.lineTo(p.pts[i][0], p.pts[i][1]); gg.closePath(); };
    const xs = p.pts.map(q => q[0]), ys = p.pts.map(q => q[1]), x0 = Math.min(...xs), y0 = Math.min(...ys);
    const box = [x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0];
    cut(gg => { gg.beginPath(); path(gg); gg.fill(); gg.lineWidth = lw; gg.lineJoin = 'miter'; gg.stroke(); });   // the pasted-on paper edge
    if (p.flat) { const gk = ink(p.flat); gk.beginPath(); path(gk); gk.fill(); }
    const cxp = box[0] + box[2] / 2, cyp = box[1] + box[3] / 2, ext = Math.max(box[2], box[3]) / 2 + 1;
    const tn = p.flat ? p.tone * .55 : p.tone;
    halftone(ink('k'), path, box, st, 45, (x, y) => clamp(tn * T * (.45 + .75 * (((x - cxp) * light[0] + (y - cyp) * light[1]) / ext + 1) / 2)), .74);
  }
  // head: a circle with a cut profile face (brow, eye, nose, mouth), black hair and a headband
  const hr = .066 * s, hx = head[0], hy = head[1], H_ = (u, v) => [hx + u * hr, hy + v * hr];
  const hg = gg => { gg.moveTo(hx + hr, hy); gg.arc(hx, hy, hr, 0, TAU); };
  cut(gg => { gg.beginPath(); hg(gg); gg.fill(); gg.lineWidth = lw; gg.stroke(); });
  halftone(ink('k'), hg, [hx - hr, hy - hr, hr * 2, hr * 2], st, 45, (x, y) => clamp(.62 + ((x - hx) * .6 + (y - hy) * .8) / hr * .3), .74);
  const gk = ink('k');
  const hair = [[-1.04, .18], [-1.0, -.55], [-.45, -1.02], [.35, -1.04], [.62, -.78], [.05, -.62], [-.35, -.2]].map(([u, v]) => H_(u, v));
  gk.beginPath(); hair.forEach(([x, y], i) => i ? gk.lineTo(x, y) : gk.moveTo(x, y)); gk.closePath(); gk.fill();
  const faceP = [[.0, -.6], [.7, -.5], [1.0, -.1], [1.22, .2], [.94, .3], [.96, .5], [.62, .86], [.08, .5]].map(([u, v]) => H_(u, v));
  const facePath = gg => { gg.moveTo(faceP[0][0], faceP[0][1]); for (let i = 1; i < faceP.length; i++) gg.lineTo(faceP[i][0], faceP[i][1]); gg.closePath(); };
  cut(gg => { gg.beginPath(); facePath(gg); gg.fill(); gg.lineWidth = lw * .7; gg.stroke(); });
  halftone(gk, facePath, [hx - hr, hy - hr, hr * 2.4, hr * 2], st * .9, 45, () => .2, .7);
  gk.beginPath(); gk.arc(...H_(.62, -.05), hr * .12, 0, TAU); gk.fill();                                     // eye
  gk.beginPath(); [[.3, -.3], [.92, -.22], [.92, -.12], [.3, -.2]].map(([u, v]) => H_(u, v)).forEach(([x, y], i) => i ? gk.lineTo(x, y) : gk.moveTo(x, y)); gk.fill();   // brow
  gk.lineWidth = hr * .09; gk.strokeStyle = PAL.k; gk.beginPath(); gk.moveTo(...H_(.62, .56)); gk.lineTo(...H_(.9, .5)); gk.stroke();   // mouth
  const band = opts.band || 'r';
  const gb = ink(band); gb.beginPath(); [[-1.04, -.5], [-.55, -.98], [.95, -.62], [.92, -.4], [-.98, -.22]].map(([u, v]) => H_(u, v)).forEach(([x, y], i) => i ? gb.lineTo(x, y) : gb.moveTo(x, y)); gb.closePath(); gb.fill();
  return J;
}

/* ---------- type: heavy grotesque (Barlow with synthetic weight, condensed) and constructed numerals ---------- */
export const FONT = 'BarlowH';
export function heavy(g, str, x, y, size, { w = .075, cond = .86, track = 0, align = 'left', ang = 0 } = {}) {
  g.save(); g.translate(x, y); g.rotate(ang * D2R); g.scale(cond, 1); g.font = `500 ${size}px ${FONT}`; g.textBaseline = 'alphabetic';
  g.letterSpacing = track + 'px'; g.lineJoin = 'miter'; g.miterLimit = 4; g.lineWidth = size * w;
  const m = g.measureText(str).width; const ox = align === 'center' ? -m / 2 : align === 'right' ? -m : 0;
  g.strokeStyle = g.fillStyle; g.strokeText(str, ox, 0); g.fillText(str, ox, 0); g.restore();
  return m * cond;
}
export function textWidth(g, str, size, { cond = .86, track = 0 } = {}) { g.save(); g.font = `500 ${size}px ${FONT}`; g.letterSpacing = track + 'px'; const m = g.measureText(str).width * cond; g.restore(); return m; }
/* letters placed one by one along path(s) -> [x, y, angleDeg] */
export const linePath = (x, y, ang) => s => [x + Math.cos(ang * D2R) * s, y + Math.sin(ang * D2R) * s, ang];
export const arcPath = (cx, cy, r, a0, dir = 1) => s => { const a = a0 + dir * s / r / D2R; return [cx + Math.cos(a * D2R) * r, cy + Math.sin(a * D2R) * r, a + 90 * dir]; };
export function textOnPath(g, str, path, s0, size, { w = .075, cond = .86, track = 6 } = {}) {
  let s = s0;
  g.save(); g.font = `500 ${size}px ${FONT}`;
  for (const ch of str) {
    const adv = g.measureText(ch).width * cond + track, [x, y, a] = path(s + adv / 2);
    if (ch !== ' ') heavy(g, ch, x, y, size, { w, cond, align: 'center', ang: a }), 0;
    s += adv;
  }
  g.restore(); return s - s0;
}
// constructed numerals: strokes on a 0.6 x 1 box, butt ends and mitred corners (a drawn alphabet, not a font)
const GLY = {
  '0': 'O', '1': [[[.04, .22], [.36, 0], [.36, 1]]], '2': [[[0, .1], [.14, 0], [.46, 0], [.6, .12], [.6, .34], [0, 1], [.62, 1]]],
  '3': [[[0, .1], [.14, 0], [.46, 0], [.6, .12], [.6, .38], [.46, .5], [.18, .5]], [[.46, .5], [.6, .62], [.6, .88], [.46, 1], [.14, 1], [0, .9]]], '4': [[[.44, 1], [.44, 0], [0, .68], [.64, .68]]],
  '5': [[[.6, 0], [0, 0], [0, .48], [.46, .48], [.6, .6], [.6, .88], [.46, 1], [0, 1]]], '6': [[[.6, 0], [.1, 0], [0, .12], [0, .88], [.1, 1], [.5, 1], [.6, .88], [.6, .58], [.5, .46], [0, .46]]],
  '7': [[[0, 0], [.62, 0], [.2, 1]]], '9': [[[0, 1], [.5, 1], [.6, .88], [.6, .12], [.5, 0], [.1, 0], [0, .12], [0, .42], [.1, .54], [.6, .54]]],
  'T': [[[0, 0], [.6, 0]], [[.3, 0], [.3, 1]]], 'H': [[[0, 0], [0, 1]], [[.6, 0], [.6, 1]], [[0, .5], [.6, .5]]], 'I': [[[.06, 0], [.06, 1]]],
  'R': [[[0, 1], [0, 0], [.45, 0], [.6, .12], [.6, .38], [.45, .5], [0, .5]], [[.3, .5], [.62, 1]]], 'Y': [[[0, 0], [.3, .5], [.6, 0]], [[.3, .5], [.3, 1]]],
  'E': [[[.6, 0], [0, 0], [0, 1], [.6, 1]], [[0, .5], [.45, .5]]], 'S': [[[.6, .12], [.46, 0], [.14, 0], [0, .12], [0, .38], [.14, .5], [.46, .5], [.6, .62], [.6, .88], [.46, 1], [.14, 1], [0, .88]]],
  'P': [[[0, 1], [0, 0], [.45, 0], [.6, .12], [.6, .38], [.45, .5], [0, .5]]], 'A': [[[0, 1], [.3, 0], [.6, 1]], [[.12, .65], [.48, .65]]], 'N': [[[0, 1], [0, 0], [.6, 1], [.6, 0]]],
  ' ': [],
  'x': 'X', 'M': [[[0, 1], [0, 0], [.36, .6], [.72, 0], [.72, 1]]], 'm': [[[0, 1], [0, .34], [.28, .34], [.28, 1]], [[.28, .34], [.56, .34], [.56, 1]]],
};
const GW = { M: .72, m: .56, I: .2, ' ': .35 };
export function numeral(g, str, x, y, h, wt, gap = .14) {                      // (x,y) = top-left of the first glyph; returns width
  const sw = wt * h; let cx = x;
  g.save(); g.lineWidth = sw; g.lineJoin = 'miter'; g.miterLimit = 10; g.lineCap = 'butt'; g.strokeStyle = g.fillStyle;
  for (const ch of str) {
    const def = GLY[ch]; const gw = GW[ch] ?? .6;
    if (def === 'O') { g.beginPath(); g.ellipse(cx + .3 * h, y + .5 * h, .3 * h - sw / 2, .5 * h - sw / 2, 0, 0, TAU); g.stroke(); }
    else if (def === 'X') { g.beginPath(); g.moveTo(cx + .02 * h, y + .22 * h); g.lineTo(cx + .6 * h - .02 * h, y + .78 * h); g.moveTo(cx + .6 * h - .02 * h, y + .22 * h); g.lineTo(cx + .02 * h, y + .78 * h); g.stroke(); }
    else if (ch === 'I') g.fillRect(cx, y, sw, h);
    else if (def) for (const st of def) {
      g.beginPath(); st.forEach(([a, b], i) => { const px = cx + sw / 2 + a * (h - sw / gw), py = y + b * h; i ? g.lineTo(px, py) : g.moveTo(px, py); });
      g.stroke();
    }
    cx += (gw + gap) * h;
  }
  g.restore(); return cx - x - gap * h;
}
export const numWidth = (str, h, gap = .14) => { let w = 0; for (const ch of str) w += ((GW[ch] ?? .6) + gap) * h; return w - gap * h; };

/* ---------- motion helpers ---------- */
export const BEAT = .5;                                              // 120 bpm
export const xo = p => p >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(p));   // exponential out: a drum hit
export const hit = (lt, b, d = .24) => xo(seg(lt, b * BEAT, b * BEAT + d));   // 0 before beat b, then snaps to 1
export const on = (lt, b) => lt >= b * BEAT - 1e-6;
// register slam: the red and accent plates jump on a beat and settle within ~3 frames
export const slam = (lt, beats, amp = 14) => { let j = 0; for (const b of beats) { const d = lt - b * BEAT; if (d >= 0 && d < .22) j = Math.max(j, amp * Math.pow(1 - d / .22, 2)); } return j; };

/* wedge wipe: a triangle whose apex leads along the axis; returns clip fn and the leading edge for ornament */
export function wedgePoly(p, angDeg, half = 30, reach = 2900, cx = W / 2, cy = H / 2) {
  const a = angDeg * D2R, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
  const s = lerp(-1500, reach, p);                         // apex position along the axis (relative to centre)
  const ax = cx + ux * s, ay = cy + uy * s, tn = Math.tan(half * D2R);
  const bx = ax - ux * reach * 2, by = ay - uy * reach * 2, hw = reach * 2 * tn;
  return [[ax, ay], [bx + vx * hw, by + vy * hw], [bx - vx * hw, by - vy * hw]];
}

/* three nested wedges for the wipe: red band (outermost), black band, then the reveal itself */
export function wedgeBands(p, angDeg, half = 30) {
  const a = angDeg * D2R, ux = Math.cos(a), uy = Math.sin(a);
  const f = e => { const q = wedgePoly(p, angDeg, half); return q.map(([x, y]) => [x + ux * e, y + uy * e]); };
  return { reveal: f(0), black: f(80), red: f(170) };
}
