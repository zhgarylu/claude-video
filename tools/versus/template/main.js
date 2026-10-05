// Versus screen comparing two real products from the user's photos; every word comes from data.json. render(t) draws any frame, deterministically.
// Order of layers: select screen / arena -> slash -> kettles -> round UI -> HUD -> fx -> flashes. Camera = punch zoom + shake from HITS; hit-stop = frame-skip (uOf).
import { clamp, lerp, seg, ss, eo, back, hash, TAU } from '/core/lib.js';
import { D, DUR, EV, HITS, STOPS, A, B, ROUNDS, SCORE, WINNER, SK, T, BEAT } from './timeline.js';
import { drawKettle } from './kettle.js';

const W = 1920, H = 1080, cv = document.getElementById('c'), out = cv.getContext('2d');
const sc = document.createElement('canvas'); sc.width = W; sc.height = H; const g = sc.getContext('2d');
const chan = [0, 1, 2].map(() => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; });
const DISP = '"Big Shoulders Display", "Noto Sans SC", Impact, sans-serif', UI = '"Chakra Petch", "Noto Sans SC", system-ui, sans-serif';
await Promise.all([document.fonts.load('900 100px "Noto Sans SC"'), document.fonts.load('700 30px "Noto Sans SC"'), document.fonts.load('900 100px "Big Shoulders Display"'), document.fonts.load('700 30px "Chakra Petch"')]);
const loadImg = u => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = u; });
const PHOTO = { A: await loadImg(D.a.image), B: await loadImg(D.b.image) };
const INK = '#07070c', GOLD = '#ffd45a', PALE = '#fff3c4', GREY = '#8a90a8';
const S = T.sel, E = T.ent, R = T.r, V = T.v, R0 = T.R0;
const SIDE = { A, B };
let TEXTS_NOW = [];

// ------------------------------------------------------------------ helpers
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
const slx = y => W / 2 + (0.5 - y / H) * SK;                             // x of the slash at height y
const uOf = t => { for (const s of STOPS) if (t >= s.t && t < s.t + s.len) return s.t; return t; };   // frame-skip hit-stop: the picture holds the impact frame
const bpulse = (u, k = .12) => Math.exp(-(((u % BEAT) + BEAT) % BEAT) / k);
const para = (x0, y0, x1, y1, sk) => { const p = new Path2D(); p.moveTo(x0 + sk, y0); p.lineTo(x1 + sk, y0); p.lineTo(x1, y1); p.lineTo(x0, y1); p.closePath(); return p; };
const slam = (age, k = 2.4, d = .1) => (age += d) < 0 ? 0 : (age < d ? lerp(k, 1, eo(age / d)) : 1 + .07 * Math.exp(-(age - d) / .08) * Math.cos((age - d) * 40));   // oversize drop, hard landing, settle
function txt(s, x, y, o = {}) {
  const { font = 'disp', size = 100, w = 900, fill = '#fff', stroke = null, sw = 0.08, align = 'center', alpha = 1, id = null, track = 0, fit = 0, sk = 0, scale = 1, shadow = null, reg = s, noreg = false, cap = .72 } = o;
  if (alpha <= 0.01) return 0;
  const fam = font === 'disp' ? DISP : UI;
  g.save(); g.globalAlpha = alpha; g.textAlign = align; g.textBaseline = 'alphabetic'; g.letterSpacing = track + 'px';
  let sz = size; g.font = `${w} ${sz}px ${fam}`; let mw = g.measureText(s).width;
  if (fit && mw > fit) { sz = size * fit / mw; g.font = `${w} ${sz}px ${fam}`; mw = g.measureText(s).width; }
  g.translate(x, y); if (sk) g.transform(1, 0, sk, 1, 0, 0); g.scale(scale, scale);
  if (shadow) { g.fillStyle = shadow.c; g.fillText(s, shadow.dx, shadow.dy); }
  if (stroke) { g.lineJoin = 'round'; g.lineWidth = sz * sw; g.strokeStyle = stroke; g.strokeText(s, 0, 0); }
  g.fillStyle = fill; g.fillText(s, 0, 0); g.restore();
  if (id && !noreg && alpha > .05) { const x0 = align === 'center' ? x - mw / 2 : align === 'left' ? x : x - mw; TEXTS_NOW.push({ id, text: reg, x0, y0: y - sz * cap, x1: x0 + mw, y1: y + sz * .1 }); }
  return mw;
}
function sparks(x, y, age, o = {}) {
  const { n = 16, len = 170, life = .45, col = PALE, seed = 1, w = 8 } = o;
  if (age < 0 || age > life) return; const p = age / life;
  g.save(); g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = hash(seed + i * 3.1) * TAU, l = len * (.5 + hash(seed + i * 7.7) * .8), head = l * eo(Math.min(1, p * 1.5)), tail = head * Math.max(0, p * 1.3 - .1);
    g.strokeStyle = col; g.globalAlpha = 1 - p * p; g.lineWidth = w * (1 - p) + 1.5;
    g.beginPath(); g.moveTo(x + Math.cos(a) * tail, y + Math.sin(a) * tail); g.lineTo(x + Math.cos(a) * head, y + Math.sin(a) * head); g.stroke();
  }
  g.globalAlpha = (1 - p) * .95; g.fillStyle = '#fff'; g.beginPath();                              // star flash
  for (let i = 0; i < 16; i++) { const r = (i % 2 ? 22 : 90) * (1 - p) * (1 + .3 * hash(seed)); const a = i / 16 * TAU + hash(seed + 5) * .3; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  g.closePath(); g.fill(); g.restore();
}
function ring(x, y, age, o = {}) {
  const { life = .4, r = 600, col = '#fff', w = 18 } = o; if (age < 0 || age > life) return; const p = age / life;
  g.save(); g.globalAlpha = (1 - p) * .9; g.strokeStyle = col; g.lineWidth = w * (1 - p) + 2; g.beginPath(); g.arc(x, y, r * eo(p), 0, TAU); g.stroke(); g.restore();
}
function burstLines(x, y, age, o = {}) {                                                              // speed lines radiating from a point
  const { life = .5, n = 28, col = '#fff', r0 = 160, r1 = 1400 } = o; if (age < 0 || age > life) return; const p = age / life;
  g.save(); g.fillStyle = col; g.globalAlpha = (1 - p) * .55;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + hash(i) * .2, wd = .012 + hash(i + 40) * .02, ra = r0 + (r1 - r0) * eo(p) * (.6 + hash(i + 9) * .4), rb = r0 + (ra - r0) * .35;
    g.beginPath(); g.moveTo(x + Math.cos(a - wd) * ra, y + Math.sin(a - wd) * ra); g.lineTo(x + Math.cos(a + wd) * ra, y + Math.sin(a + wd) * ra); g.lineTo(x + Math.cos(a) * rb, y + Math.sin(a) * rb); g.closePath(); g.fill();
  }
  g.restore();
}

// ------------------------------------------------------------------ state derived from the timeline
function lives(u) {                                                      // life 1 -> .25 per round lost; ghost trails behind
  const o = { A: { life: 1, ghost: 1, flash: 0 }, B: { life: 1, ghost: 1, flash: 0 } };
  for (const rd of ROUNDS) {
    const L = rd.win === 'A' ? 'B' : 'A', tl = R0(rd.n) + R.life;
    o[L].life -= .25 * ss(seg(u, tl, tl + .25)); o[L].ghost -= .25 * ss(seg(u, tl + .55, tl + 1.0));
    if (u >= tl && u < tl + .3) o[L].flash = 1 - (u - tl) / .3;
  }
  return o;
}
const wonAt = rd => R0(rd.n) + R.pip;
function roundAt(u) { let n = 1; for (const rd of ROUNDS) if (u >= R0(rd.n) - .01) n = rd.n; return n; }

// ------------------------------------------------------------------ camera
function camera(t) {
  let z = 1.025, sx = 0, sy = 0, px = 0, py = 0, wsum = 0, chroma = 0, flash = 0;
  HITS.forEach((h, i) => {
    const age = t - h.t; if (age < 0 || age > 1) return;
    const dz = h.kz * Math.exp(-age / .13), shk = h.sh * Math.exp(-age / .14);
    z += dz; sx += (hash(i * 7 + Math.floor(t * 30)) - .5) * 2 * shk; sy += (hash(i * 13 + Math.floor(t * 30) + 5) - .5) * 2 * shk;
    let fx = W / 2, fy = H / 2; if (h.fx) { const p = kettlePos(h.fx, uOf(t)); fx = lerp(W / 2, p.x, .55); fy = lerp(H / 2, 600, .6); }
    px += fx * dz; py += fy * dz; wsum += dz;
    if (h.kz >= .05) chroma = Math.max(chroma, 10 * (h.kz / .1) * Math.exp(-age / .12));
    if (['vs', 'score', 'gong', 'ko', 'go', 'crack'].includes(h.type)) flash = Math.max(flash, (h.type === 'ko' ? .3 : .55) * Math.exp(-age / .04) * (age < .15 ? 1 : 0));
  });
  for (const rd of ROUNDS) z += .018 * ss(seg(t, T.R0(rd.n) + 4.3, T.R0(rd.n) + 7.6)) * (1 - ss(seg(t, T.R0(rd.n) + 7.6, T.R0(rd.n) + 8.0)));   // a slow drift while the result is read
  const push = ss(seg(t, V.win, V.close)) * .035; z += push;               // the only slow move: a push-in on the winner
  return { z, sx, sy, px: wsum > 0 ? px / wsum : W / 2, py: wsum > 0 ? py / wsum : H / 2, chroma, flash };
}

// ------------------------------------------------------------------ backgrounds
function drawSelectBg(u) {
  g.fillStyle = '#0c0d16'; g.fillRect(-100, -100, W + 200, H + 200);
  g.save(); g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 2;
  for (let i = -20; i < 40; i++) { const x = i * 90 + (u * 18) % 90; g.beginPath(); g.moveTo(x + SK / 2, 0); g.lineTo(x - SK / 2, H); g.stroke(); }
  g.restore();
  let gr = g.createRadialGradient(100, 1000, 0, 100, 1000, 900); gr.addColorStop(0, rgba(A.hue, .16)); gr.addColorStop(1, rgba(A.hue, 0)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  gr = g.createRadialGradient(1820, 1000, 0, 1820, 1000, 900); gr.addColorStop(0, rgba(B.hue, .16)); gr.addColorStop(1, rgba(B.hue, 0)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
function crowd(u, x0, x1, hue, yBase, seed) {
  for (let r = 0; r < 2; r++) for (let x = x0 - 20 + r * 20; x < x1 + 20; x += 40) {
    const hh = hash(x * .1 + r * 31 + seed), bob = Math.max(0, Math.sin(u * TAU / (BEAT * 2) + hh * 6.28)) * (6 + 6 * hh), y = yBase + r * 38 + hh * 8 - bob;
    g.fillStyle = r ? '#05050a' : '#0a0a12'; g.beginPath(); g.arc(x, y, 14, 0, TAU); g.fill(); g.fillRect(x - 17, y + 8, 34, 80);
    if (hh > .72) { const tw = .35 + .65 * Math.max(0, Math.sin(u * TAU / (BEAT * 2) + hh * 40)); g.fillStyle = rgba(hue, tw); g.shadowColor = hue; g.shadowBlur = 14; g.fillRect(x + 14, y - 32 - bob, 5, 26); g.shadowBlur = 0; }
  }
}
function drawArena(u, reveal) {
  const sides = [{ s: A, a: -1, ex: 0 }, { s: B, a: 1, ex: 1 }];
  for (const sd of sides) {
    g.save();
    const r = reveal * 1500, p = new Path2D();
    if (sd.a < 0) { p.moveTo(slx(-10) - r, -10); p.lineTo(slx(-10), -10); p.lineTo(slx(H + 10), H + 10); p.lineTo(slx(H + 10) - r, H + 10); }
    else { p.moveTo(slx(-10), -10); p.lineTo(slx(-10) + r, -10); p.lineTo(slx(H + 10) + r, H + 10); p.lineTo(slx(H + 10), H + 10); }
    p.closePath(); g.clip(p);
    const cx = sd.a < 0 ? 0 : W, gr = g.createLinearGradient(cx, 0, W / 2, 0); gr.addColorStop(0, rgba(sd.s.hue, .30)); gr.addColorStop(.55, sd.s.dark); gr.addColorStop(1, '#090a12');
    g.fillStyle = '#090a12'; g.fillRect(0, 0, W, H); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = rgba(sd.s.hue, .055);                                                     // speed stripes parallel to the slash
    for (let i = -6; i < 24; i++) { const x = i * 150 + (u * 60 * -sd.a) % 150; g.beginPath(); g.moveTo(x + SK / 2, 0); g.lineTo(x + 46 + SK / 2, 0); g.lineTo(x + 46 - SK / 2, H); g.lineTo(x - SK / 2, H); g.fill(); }
    g.globalCompositeOperation = 'lighter';                                                 // two swinging beams from the top corners
    for (let b = 0; b < 2; b++) {
      const ox = cx + (sd.a < 0 ? 140 + b * 330 : -140 - b * 330), ang = Math.sin(u * .8 + b * 2 + (sd.a < 0 ? 0 : 1.5)) * .22 + (sd.a < 0 ? .22 : -.22);
      const bg = g.createLinearGradient(ox, 0, ox + Math.sin(ang) * 900, 900); bg.addColorStop(0, rgba(sd.s.hue, .30)); bg.addColorStop(1, rgba(sd.s.hue, 0));
      g.fillStyle = bg; g.beginPath(); g.moveTo(ox - 16, -10); g.lineTo(ox + 16, -10); g.lineTo(ox + Math.sin(ang) * 900 + 170, 900); g.lineTo(ox + Math.sin(ang) * 900 - 170, 900); g.closePath(); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = rgba(sd.s.hue, .20); g.lineWidth = 2;                                    // floor grid in perspective
    for (let i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(W / 2 + i * 70, 735); g.lineTo(W / 2 + i * 640, 1080); g.stroke(); }
    for (let j = 0; j < 9; j++) { const f = ((j + (u * .45) % 1) / 9), y = 735 + 345 * f * f; g.globalAlpha = .35 + .65 * f; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); g.globalAlpha = 1; }
    crowd(u, sd.a < 0 ? -10 : W / 2, sd.a < 0 ? W / 2 + 120 : W + 10, sd.s.hue, 995, sd.a < 0 ? 1 : 77);
    g.restore();
  }
  const gr = g.createRadialGradient(W / 2, H / 2, 380, W / 2, H / 2, 1250); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.6)'); g.fillStyle = gr; g.fillRect(-60, -60, W + 120, H + 120);
}
function drawSlash(u, draw = 1) {
  if (draw <= 0) return; const y1 = -20 + (H + 40) * draw, k = 1 + .3 * bpulse(u, .1);
  const x0 = slx(-20), x1 = slx(y1);
  g.save(); g.lineCap = 'butt';
  for (const [w, col, a, off] of [[36 * k, '#ffffff', .16, 0], [14 * k, A.hue, .85, -9], [14 * k, B.hue, .85, 9], [10 * k, PALE, 1, 0], [3.5, '#fff', 1, 0]]) {
    g.strokeStyle = col; g.globalAlpha = a; g.lineWidth = w; g.beginPath(); g.moveTo(x0 + off, -20); g.lineTo(x1 + off, y1); g.stroke();
  }
  g.restore();
}

// ------------------------------------------------------------------ kettles
function lifeNow(side, u) { return lives(u)[side].life; }
function kettlePos(side, u) { const p = pose(side, u); return p || { x: side === 'A' ? 430 : 1490, y: 690 }; }
function pose(side, u) {
  const isA = side === 'A', dir = isA ? 1 : -1, t0 = isA ? E.a0 : E.b0, tl = isA ? E.aLand : E.bLand;
  if (u < t0) return null;
  let x = isA ? 430 : 1490, y = 690, s = 1.05, rot = 0, flash = 0, alpha = 1, sy = 1;
  x = lerp(isA ? -380 : 2300, x, eo(seg(u, t0, tl)));
  if (u >= tl) sy = 1 - .12 * Math.exp(-(u - tl) / .1) * Math.cos((u - tl) * 22);
  const ph = u * TAU / (BEAT * 2) + (isA ? 0 : 1.3); y += Math.sin(ph) * 3.5; sy *= 1 + .008 * Math.sin(ph * 2);
  for (const rd of ROUNDS) {
    const age = u - (R0(rd.n) + R.hit); if (age < 0) continue;
    const f = age < .1 ? age / .1 : Math.exp(-(age - .1) / .24);
    if (rd.win === side) x += dir * 62 * f; else { x -= dir * 84 * f; rot -= dir * .13 * f; flash = Math.max(flash, 1 - seg(age, 0, .2)); y += 6 * f; }
  }
  const p1 = ss(seg(u, V.head, V.head + .45)), p2 = eo(seg(u, V.win, V.win + .4));
  if (p1 > 0) {                                                            // verdict layout, then the winner steps to the middle
    const xv = isA ? 290 : 1630, sv = .78; x = lerp(x, xv, p1); s = lerp(s, sv, p1); y = lerp(y, 700, p1);
    if (p2 > 0) { const wn = isA === (WINNER === 'A'); x = lerp(x, wn ? 960 : (isA ? 230 : 1690), p2); s = lerp(s, wn ? 1.0 : .52, p2); y = lerp(y, wn ? 850 : 740, p2); alpha = lerp(1, wn ? 1 : .55, p2); if (wn) flash = Math.max(flash, .6 * Math.exp(-(u - V.win) / .12) * (u >= V.win ? 1 : 0)); }
  }
  return { x, y, s, rot, flash, alpha, sy };
}
function drawKettles(u) {
  const lv = lives(u);
  for (const side of ['A', 'B']) {
    const p = pose(side, u); if (!p) continue; const sd = SIDE[side], isA = side === 'A';
    g.save(); g.globalAlpha = p.alpha;
    let gr = g.createRadialGradient(p.x, 520, 0, p.x, 520, 430 * p.s); gr.addColorStop(0, rgba(sd.hue, .34)); gr.addColorStop(1, rgba(sd.hue, 0)); g.fillStyle = gr; g.fillRect(p.x - 520, 100, 1040, 800);   // spotlight
    g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(p.x, p.y + 22 * p.s, 230 * p.s, 20 * p.s, 0, 0, TAU); g.fill();
    drawKettle(g, { photo: PHOTO[side], x: p.x, y: p.y, s: p.s, sy: p.sy, flip: !isA, rot: p.rot, accent: sd.hue, flash: p.flash, u, glow: .25 + .75 * lv[side].life });
    g.restore();
  }
}

// ------------------------------------------------------------------ select screen
const TILES = [
  { n: '???', ph: 'A', sil: '#1e2440' }, { n: A.name, ph: 'A', ac: A.hue }, { n: '???', ph: 'B', sil: '#1e2440' },
  { n: '???', ph: 'B', sil: '#1e2440' }, { n: '???', ph: 'A', sil: '#1e2440' }, { n: B.name, ph: 'B', ac: B.hue },
];
const tileRect = i => ({ x: 366 + (i % 3) * 404, y: 320 + Math.floor(i / 3) * 274, w: 380, h: 250 });
const chamfer = (x, y, w, h, c) => { const p = new Path2D(); p.moveTo(x + c, y); p.lineTo(x + w, y); p.lineTo(x + w, y + h - c); p.lineTo(x + w - c, y + h); p.lineTo(x, y + h); p.lineTo(x, y + c); p.closePath(); return p; };
function bracket(x, y, w, h, col, k = 1) {
  const L = 46; g.save(); g.strokeStyle = col; g.lineWidth = 9; g.lineJoin = 'miter'; g.translate(x + w / 2, y + h / 2); g.scale(k, k); g.translate(-w / 2, -h / 2);
  for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]]) { g.beginPath(); g.moveTo(cx, cy + sy * L); g.lineTo(cx, cy); g.lineTo(cx + sx * L, cy); g.stroke(); }
  g.restore();
}
function cursorTile(list, lock, tLock, u, t0) {                              // which tile a cursor is on
  if (u < t0) return -1; if (u >= tLock) return lock; let i = 0; for (let k = 0; k < list.length; k++) if (u >= list[k]) i = k; return list.idx[i];
}
const P1 = Object.assign([...S.p1], { idx: [2, 3, 0] }), P2 = Object.assign([...S.p2], { idx: [3, 4] });
function drawSelect(u) {
  const fade = 1 - ss(seg(u, S.collapse, S.collapse + .35)), zoom = 1 + .1 * ss(seg(u, S.collapse, S.collapse + .35));
  if (fade <= 0) return;
  g.save(); g.globalAlpha = fade; g.translate(W / 2, H / 2); g.scale(zoom, zoom); g.translate(-W / 2, -H / 2);
  const ta = u - S.title, sl = slam(ta, 1.7, .12);
  txt(D.text.select, W / 2, 200, { size: 150, fill: '#fff', stroke: INK, id: 'title', scale: sl, shadow: { c: rgba(A.hue, .9), dx: -7, dy: 6 }, track: 3 });
  txt(D.text.sub, W / 2, 262, { font: 'ui', size: 32, w: 500, fill: GREY, track: 5, id: 'sub', alpha: ss(seg(u, .25, .5)) });
  const c1 = cursorTile(P1, 1, S.lock1, u, S.p1[0]), c2 = cursorTile(P2, 5, S.lock2, u, S.p2[0]);
  TILES.forEach((tl, i) => {
    const r = tileRect(i), appear = ss(seg(u, .1 + i * .06, .35 + i * .06)); if (appear <= 0) return;
    g.save(); g.translate(0, (1 - appear) * 40); g.globalAlpha = fade * appear;
    const lock1 = u >= S.lock1 && i === 1, lock2 = u >= S.lock2 && i === 5, hue = lock1 ? A.hue : lock2 ? B.hue : null;
    g.fillStyle = '#141626'; g.fill(chamfer(r.x, r.y, r.w, r.h, 22)); if (hue) { g.fillStyle = rgba(hue, .26); g.fill(chamfer(r.x, r.y, r.w, r.h, 22)); }
    g.lineWidth = 4; g.strokeStyle = hue || '#2a2f48'; g.stroke(chamfer(r.x, r.y, r.w, r.h, 22));
    const dim = (i !== 1 && i !== 5 && (u >= S.lock1 + .2)) ? .45 : 1;
    g.globalAlpha = fade * appear * dim;
    drawKettle(g, { photo: PHOTO[tl.ph], silhouette: tl.sil, accent: tl.ac, flip: tl.ph === 'A', x: r.x + r.w / 2, y: r.y + 196, s: .52, u: u + i });
    g.globalAlpha = fade * appear;
    txt(tl.n, r.x + r.w / 2, r.y + 238, { size: 40, w: 800, fill: hue ? '#fff' : '#aab0c8', id: 'tile' + i, track: 2, fit: 340 });
    g.restore();
  });
  for (const [ci, col, tag, tLock, hop] of [[c1, A.hue, 'P1', S.lock1, S.p1], [c2, B.hue, 'P2', S.lock2, S.p2]]) {
    if (ci < 0) continue; const r = tileRect(ci), last = u >= tLock ? tLock : Math.max(...hop.filter(h => h <= u)), age = u - last, k = 1 + .09 * Math.exp(-age / .06) * (age >= 0 ? 1 : 0);
    bracket(r.x - 12, r.y - 12, r.w + 24, r.h + 24, col, k);
    g.fillStyle = col; g.fill(para(r.x + 14, r.y + 14, r.x + 96, r.y + 62, 14));
    txt(tag, r.x + 55, r.y + 51, { size: 44, w: 900, fill: INK, id: 'tag' + tag, align: 'center' });
    if (u >= tLock && age < .14) { g.fillStyle = `rgba(255,255,255,${.7 * (1 - age / .14)})`; g.fill(chamfer(r.x, r.y, r.w, r.h, 22)); sparks(r.x + r.w / 2, r.y + r.h / 2, age, { n: 14, len: 150, col, seed: ci + 3 }); }
  }
  txt(D.text.ask, W / 2, 950, { font: 'ui', size: 40, w: 700, fill: '#fff', track: 3, id: 'ask', alpha: ss(seg(u, .5, .8)) });
  g.restore();
}

// ------------------------------------------------------------------ entrance: plates, VS, countdown
function plate(side, u) {
  const sd = SIDE[side], isA = side === 'A', t0 = isA ? E.aPlate : E.bPlate;
  const inP = eo(seg(u, t0, t0 + .22)), outP = ei2(seg(u, E.plateOut, E.plateOut + .25));
  if (inP <= 0 || outP >= 1) return;
  const pw = 600, ph = 150, x = isA ? 90 : W - 90 - pw, y = 770 + outP * 260, off = (1 - inP) * (isA ? -760 : 760);
  g.save(); g.translate(off, 0);
  g.fillStyle = INK; g.fill(para(x - 6, y - 6, x + pw + 6, y + ph + 6, 30)); g.fillStyle = '#12142a'; g.fill(para(x, y, x + pw, y + ph, 30));
  g.fillStyle = sd.hue; g.fill(para(isA ? x : x + pw - 26, y, isA ? x + 26 : x + pw, y + ph, 30));
  const tx = isA ? x + 60 : x + pw - 40, al = isA ? 'left' : 'right';
  txt(sd.name, tx, y + 82, { size: 96, align: al, fill: '#fff', id: 'plate' + side, fit: 480 });
  g.fillStyle = sd.hue; const cw = 190; const cx = isA ? tx : tx - cw; g.fill(para(cx, y + 100, cx + cw, y + 136, 10));
  txt(sd.cls, cx + cw / 2 + 5, y + 128, { font: 'ui', size: 24, w: 700, fill: INK, id: 'cls' + side, track: 1 });
  txt(sd.spec, isA ? cx + cw + 24 : cx - 24, y + 128, { font: 'ui', size: 26, w: 500, fill: '#c9cde0', align: isA ? 'left' : 'right', id: 'spec' + side, track: 1 });
  g.restore();
}
const ei2 = t => t * t;
function drawVS(u) {
  const age = u - E.vs, fin = ss(seg(u, 10.0 - .2, 10.0)); if (age < 0 || fin >= 1) return;
  const sl = slam(age, 3.4, .1) * (1 - fin * .9), cx = W / 2, cy = 430;
  burstLines(cx, cy, age, { life: .6, col: '#fff', r0: 250, r1: 1500 }); ring(cx, cy, age, { life: .5, r: 1200 }); ring(cx, cy, age - .08, { life: .4, r: 800, col: PALE, w: 8 });
  g.save(); g.translate(cx, cy); g.scale(sl, sl); g.transform(1, 0, -.18, 1, 0, 0); g.globalAlpha = 1 - fin;
  g.font = `900 470px ${DISP}`; g.textAlign = 'center'; g.letterSpacing = '6px'; g.lineJoin = 'round';
  const sp = 14 + 30 * Math.exp(-age / .18);
  g.globalCompositeOperation = 'lighter'; g.fillStyle = A.hue; g.fillText('VS', -sp, 160); g.fillStyle = B.hue; g.fillText('VS', sp, 160); g.globalCompositeOperation = 'source-over';
  g.lineWidth = 40; g.strokeStyle = INK; g.strokeText('VS', 0, 160);
  const gr = g.createLinearGradient(0, -200, 0, 170); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.55, PALE); gr.addColorStop(1, '#ffc84a'); g.fillStyle = gr; g.fillText('VS', 0, 160);
  g.restore();
}
function drawCountdown(u) {
  E.cd.forEach((t, i) => {
    const age = u - t; if (age < -.09 || age > .5) return; const sl = slam(age, 2.0, .09), a = 1 - seg(age, .35, .5);
    g.save(); g.globalAlpha = a; g.translate(W / 2, 520); g.scale(sl, sl); g.font = `900 620px ${DISP}`; g.textAlign = 'center'; g.lineJoin = 'round';
    g.lineWidth = 50; g.strokeStyle = INK; g.strokeText(String(3 - i), 0, 210); g.fillStyle = i === 2 ? GOLD : '#fff'; g.fillText(String(3 - i), 0, 210); g.restore();
    ring(W / 2, 430, age, { life: .35, r: 500, col: i === 2 ? GOLD : '#fff', w: 10 });
  });
  const age = u - E.go; if (age >= -.09 && age < .45) {
    const sl = slam(age, 2.6, .09), a = 1 - seg(age, .3, .45); g.save(); g.globalAlpha = a; g.translate(W / 2, 520); g.scale(sl, sl); g.transform(1, 0, -.12, 1, 0, 0); g.font = `900 560px ${DISP}`; g.textAlign = 'center'; g.lineJoin = 'round';
    g.globalCompositeOperation = 'lighter'; g.fillStyle = A.hue; g.fillText('GO!', -22, 200); g.fillStyle = B.hue; g.fillText('GO!', 22, 200); g.globalCompositeOperation = 'source-over';
    g.lineWidth = 46; g.strokeStyle = INK; g.strokeText('GO!', 0, 200); g.fillStyle = PALE; g.fillText('GO!', 0, 200); g.restore();
    burstLines(W / 2, 430, age, { life: .5, n: 22, r0: 300 });
  }
}

// ------------------------------------------------------------------ HUD
function drawHUD(u) {
  const slide = -(1 - eo(seg(u, E.hud, E.hud + .3))) * 220; if (slide <= -219) return;
  const lv = lives(u), rn = u >= V.head ? 0 : roundAt(u);
  g.save(); g.translate(0, slide + 22);
  const sk = 24, y0 = 84, y1 = 120;
  for (const side of ['A', 'B']) {
    const sd = SIDE[side], isA = side === 'A', xo = isA ? 70 : 1850, xi = isA ? 800 : 1120, L = Math.abs(xi - xo);
    const full = isA ? para(xo, y0, xi, y1, sk) : para(xi, y0, xo, y1, sk);
    g.fillStyle = INK; g.fill(para(Math.min(xo, xi) - 6, y0 - 6, Math.max(xo, xi) + 6, y1 + 6, sk)); g.fillStyle = '#10111c'; g.fill(full);
    const fillRange = (f, col, col2) => { if (f <= 0) return; const xa = isA ? xi - L * f : xi, xb = isA ? xi : xi + L * f; const pth = para(xa, y0, xb, y1, sk); const gr = g.createLinearGradient(xa, 0, xb, 0); gr.addColorStop(0, col); gr.addColorStop(1, col2); g.fillStyle = gr; g.fill(pth); };
    fillRange(lv[side].ghost, '#ffe9a0', '#ffe9a0');
    fillRange(lv[side].life, isA ? sd.deep : sd.hue, isA ? sd.hue : sd.deep);
    g.save(); g.clip(full); g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(0, y0, W, 8); g.fillStyle = INK; for (let k = 1; k < 20; k++) { const x = lerp(xo, xi, k / 20); g.fillRect(x + (sk / 2) - 2, y0, 4, y1 - y0); }
    if (lv[side].flash > 0) { g.fillStyle = `rgba(255,255,255,${lv[side].flash})`; g.fillRect(0, y0, W, y1 - y0); } g.restore();
    txt(sd.name, xo + (isA ? 6 : -6), 70, { size: 58, align: isA ? 'left' : 'right', fill: '#fff', stroke: INK, sw: .14, id: 'hud' + side, track: 2 });
    txt([sd.cls, sd.spec].filter(Boolean).join(' · '), isA ? xo + 400 : xo - 330, 68, { font: 'ui', size: 24, w: 700, fill: sd.hue, align: isA ? 'left' : 'right', id: 'hcls' + side, track: 1 });
    for (let k = 0; k < ROUNDS.length; k++) {                                                                      // one win-tick slot per round
      const rd = ROUNDS[k], won = rd.win === side && u >= wonAt(rd), px = isA ? xo + k * 36 : xo - 24 - k * 36, py = 136, pop = won ? slam(u - wonAt(rd), 2, .08) : 1;
      g.save(); g.translate(px + 12, py + 11); g.scale(pop, pop); g.translate(-12, -11);
      g.fillStyle = INK; g.fill(para(-3, -3, 27, 25, 8)); g.fillStyle = won ? sd.hue : '#1a1c2e'; g.fill(para(0, 0, 24, 22, 8)); g.restore();
    }
  }
  g.fillStyle = INK; g.fill(para(824, 36, 1096, 154, 30)); g.fillStyle = '#12142a'; g.fill(para(830, 42, 1090, 148, 30));
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 3; g.stroke(para(830, 42, 1090, 148, 30));
  if (u >= V.head) txt('总决赛', W / 2 + 15, 116, { size: 80, fill: GOLD, id: 'rnd-f', stroke: INK, sw: .1 });
  else { txt('回合', W / 2 + 15, 74, { font: 'ui', size: 22, w: 700, fill: GREY, track: 6, id: 'rl' + rn }); txt(rn + ' / ' + ROUNDS.length, W / 2 + 15, 136, { size: 60, fill: '#fff', id: 'rn' + rn, stroke: INK, sw: .08 }); }
  g.restore();
}

// ------------------------------------------------------------------ rounds
function drawBar(side, rd, rt, u) {
  const sd = SIDE[side], isA = side === 'A', v = isA ? rd.a : rd.b, other = isA ? rd.b : rd.a;
  const steps = R.steps, k = rt < R.fill0 ? 0 : Math.min(steps, Math.floor((rt - R.fill0) / R.step) + 1), sf = k / steps;
  const xo = isA ? 70 : 1850, L = 760, sk = 24, y0 = 832, y1 = 876, f = (v / rd.max) * sf;
  const winner = rd.win === side, lockT = R.fill0 + steps * R.step;
  const dim = rt >= R.hit ? (winner ? 1 : .6) : 1;
  g.save(); g.globalAlpha = dim;
  const full = isA ? para(xo, y0, xo + L, y1, sk) : para(xo - L, y0, xo, y1, sk);
  g.fillStyle = INK; g.fill(isA ? para(xo - 6, y0 - 6, xo + L + 6, y1 + 6, sk) : para(xo - L - 6, y0 - 6, xo + 6, y1 + 6, sk)); g.fillStyle = '#10111c'; g.fill(full);
  if (f > 0) {
    const pth = isA ? para(xo, y0, xo + L * f, y1, sk) : para(xo - L * f, y0, xo, y1, sk), gr = g.createLinearGradient(isA ? xo : xo - L * f, 0, isA ? xo + L * f : xo, 0);
    gr.addColorStop(isA ? 0 : 1, sd.deep); gr.addColorStop(isA ? 1 : 0, sd.hue); g.fillStyle = gr; g.fill(pth);
    g.save(); g.clip(pth); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(0, y0, W, 8); g.restore();
  }
  g.save(); g.clip(full); g.fillStyle = INK; for (let q = 1; q < 20; q++) { const x = isA ? xo + L * q / 20 : xo - L * q / 20; g.fillRect(x + sk / 2 - 2, y0, 4, y1 - y0); } g.restore();
  if (rt >= R.hit && rt < R.hit + .5 && winner) { const p = seg(rt, R.hit, R.hit + .5), xa = isA ? xo + L * p : xo - L * p; g.save(); g.clip(full); g.fillStyle = `rgba(255,255,255,${.7 * (1 - p)})`; g.fillRect(xa - 70, y0, 70, y1 - y0); g.restore(); }
  g.lineWidth = 3; g.strokeStyle = winner && rt >= R.hit ? GOLD : rgba(sd.hue, .7); g.stroke(full);
  g.restore();
  const num = rd.fmt(v * sf);                                                                              // the number counts with the bar; its box is the full final string
  if (rt >= R.fill0) {
    const sl = rt >= lockT ? 1 + .05 * Math.exp(-(rt - lockT) / .1) * Math.cos((rt - lockT) * 40) : 1;
    txt(num, isA ? 84 : 1836, 806, { size: 134, align: isA ? 'left' : 'right', fill: winner && rt >= R.hit ? GOLD : '#fff', stroke: INK, id: 'val' + side + rd.n, reg: rd.fmt(v), alpha: dim < 1 ? .72 : 1, scale: sl, w: 900 });
  }
  const barEnd = isA ? xo + L * f + sk * .5 : xo - L * f + sk * .5;
  return { x: barEnd, y: (y0 + y1) / 2 };
}
function drawRound(rd, u) {
  const s = R0(rd.n), rt = u - s; if (rt < 0) return;
  const winCol = SIDE[rd.win].hue;
  // big banner, then it shrinks to a chip above the stat name
  const bigP = 1 - ss(seg(rt, .42, .66)), ba = rt - R.banner;
  const bx = W / 2, by = lerp(222, 560, bigP), bsz = lerp(44, 270, bigP);
  burstLines(W / 2, 540, ba, { life: .5, n: 24, r0: 250, r1: 1300 });
  if (ba >= 0) {
    const bs = slam(ba, 2.2, .1) * 1;
    if (bigP > .02) { g.fillStyle = `rgba(7,7,12,${.78 * bigP})`; g.fill(para(-40, 470, W + 40, 650, 60)); }
    txt('第 ' + rd.n + ' 回合', bx, by + bsz * .3, { size: bsz, w: 900, fill: PALE, stroke: INK, id: 'banner' + rd.n, fit: 1400, track: lerp(6, 14, bigP), scale: bigP > .5 ? bs : 1, shadow: bigP > .3 ? { c: rgba(A.hue, .9), dx: -8, dy: 5 } : null });
  }
  const na = rt - R.name;
  if (na >= 0) {
    g.save(); g.fillStyle = INK; g.fill(para(W / 2 - 330, 300, W / 2 + 330, 422, 36)); g.restore();
    txt(rd.name, W / 2, 400, { size: 150, fill: '#fff', stroke: INK, sw: .07, id: 'name' + rd.n, fit: 600, scale: slam(na, 2.2, .1), shadow: { c: rgba(winCol, 0), dx: 0, dy: 0 } });
  }
  const ra = rt - R.rule;
  if (ra >= 0) {
    const a = ss(seg(ra, 0, .12)), cy = 466; g.save(); g.globalAlpha = a; g.fillStyle = GOLD; g.fill(para(W / 2 - 160, cy - 26, W / 2 + 160, cy + 18, 14));
    g.fillStyle = INK; g.beginPath(); const dn = rd.low; g.moveTo(W / 2 - 134, cy - 14 + (dn ? 0 : 20)); g.lineTo(W / 2 - 110, cy - 14 + (dn ? 0 : 20)); g.lineTo(W / 2 - 122, cy + 10 - (dn ? 0 : 20) + (dn ? 0 : 0)); g.closePath(); g.fill(); g.restore();
    txt(rd.rule, W / 2 + 16, cy + 8, { font: 'ui', size: 32, w: 700, fill: INK, id: 'rule' + rd.n, alpha: a, track: 3 });
  }
  const ca = rt - R.cap;
  if (ca >= 0) {
    const a = ss(seg(ca, 0, .2)), y = 948 + (1 - a) * 20; g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(7,7,12,.8)'; g.fill(para(110, 910, W - 110, 978, 24)); g.restore();
    txt(rd.cap, W / 2 + 12, y + 14, { font: 'ui', size: 30, w: 500, fill: '#dfe3f5', id: 'cap' + rd.n, track: 2, alpha: a, fit: 1560 });
    for (const [lab, x, al] of [[rd.scale[0], 94, 'left'], [rd.scale[1], 850, 'right'], [rd.scale[1], 1070, 'left'], [rd.scale[0], 1826, 'right']]) txt(lab, x, 904, { font: 'ui', size: 22, w: 500, fill: '#9aa0bc', alpha: a, align: al, noreg: true });
  }
  const pa = drawBar('A', rd, rt, u), pb = drawBar('B', rd, rt, u);
  // the hit: delta slams, sparks fly from the losing bar and kettle
  const ha = rt - R.hit;
  if (ha >= 0) {
    const loser = rd.win === 'A' ? 'B' : 'A', lp = loser === 'A' ? pa : pb, lk = kettlePos(loser, u);
    txt(rd.dfmt(rd.diff), W / 2, 640, { size: 150, fill: winCol === A.hue ? '#ff6a55' : '#4fe6fb', stroke: INK, sw: .09, id: 'delta' + rd.n, fit: 600, scale: slam(ha, 2.6, .1), shadow: { c: INK, dx: 8, dy: 8 }, w: 900 });
    txt(SIDE[rd.win].name + '  +1', W / 2, 706, { size: 56, fill: '#fff', stroke: INK, sw: .12, id: 'plus' + rd.n, alpha: ss(seg(ha, .15, .3)), w: 800, track: 2 });
    sparks(lp.x, lp.y, ha, { n: 18, len: 190, col: PALE, seed: rd.n * 10 }); sparks(lk.x, 470, ha - .02, { n: 14, len: 220, col: loser === 'A' ? A.hue : B.hue, seed: rd.n * 10 + 4 });
    ring(lk.x, 470, ha, { life: .35, r: 420, col: '#fff' });
    if (ha < .14) {                                                                                 // the impact slash across the losing kettle
      const a = 1 - ha / .14; g.save(); g.globalAlpha = a; g.strokeStyle = '#fff'; g.lineWidth = 14 * a + 3; g.lineCap = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 24;
      g.beginPath(); g.moveTo(lk.x + 220, 330); g.lineTo(lk.x - 220, 640); g.stroke(); g.restore();
    }
  }
}

// ------------------------------------------------------------------ verdict
function tick(x, y, p, col = '#fff', sz = 22) {
  if (p <= 0) return; g.save(); g.strokeStyle = col; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
  const a = [x - sz, y], b = [x - sz * .3, y + sz * .8], c = [x + sz, y - sz * .8];
  const p1 = Math.min(1, p * 2), p2 = Math.max(0, p * 2 - 1);
  g.moveTo(a[0], a[1]); g.lineTo(lerp(a[0], b[0], p1), lerp(a[1], b[1], p1)); if (p2 > 0) g.lineTo(lerp(b[0], c[0], p2), lerp(b[1], c[1], p2)); g.stroke(); g.restore();
}
function drawVerdict(u) {
  const vt = u - V.head; if (vt < 0) return;
  const outP = ei2(seg(u, V.out, V.out + .3)), oy = outP * -80, oa = 1 - outP;
  if (oa > 0) {
    g.save(); g.translate(0, oy); g.globalAlpha = oa;
    txt('最终战绩', W / 2, 300, { size: 150, fill: '#fff', stroke: INK, id: 'tally', scale: slam(vt, 2.2, .1), shadow: { c: GOLD, dx: 0, dy: 8 }, track: 6 });
    ROUNDS.forEach((rd, i) => {
      const t0 = V.rows[i], a = u - t0; if (a < 0) return; const p = eo(seg(a, 0, .22)), y = 330 + i * 80, h = 66;
      for (const side of ['A', 'B']) {
        const isA = side === 'A', win = rd.win === side, sd = SIDE[side], x0 = isA ? 540 : 1120, x1 = isA ? 800 : 1380, off = (1 - p) * (isA ? -500 : 500);
        g.save(); g.translate(off, 0); g.globalAlpha = oa * p;
        g.fillStyle = INK; g.fill(para(x0 - 5, y - 5, x1 + 5, y + h + 5, 22)); g.fillStyle = win ? sd.hue : '#171a2e'; g.fill(para(x0, y, x1, y + h, 22));
        txt(rd.fmt(isA ? rd.a : rd.b), (x0 + x1) / 2 + 11, y + 54, { size: 62, fill: win ? '#fff' : '#7d83a0', stroke: win ? INK : null, sw: .1, id: 'tv' + side + rd.n, w: 900 });
        if (win) tick(isA ? x0 + 36 : x1 - 6, y + h / 2 + 2, seg(a, .25, .5), '#fff', 16);
        g.restore();
      }
      g.save(); g.globalAlpha = oa * p; g.fillStyle = 'rgba(7,7,12,.75)'; g.fill(para(808, y + 6, 1112, y + h - 6, 20)); txt(rd.name, W / 2 + 12, y + 44, { font: 'ui', size: 34, w: 700, fill: '#fff', id: 'tl' + rd.n, track: 2, fit: 280 }); g.restore();
    });
    const sa = u - V.score;
    if (sa >= 0) {
      const sl = slam(sa, 2.6, .1);
      burstLines(W / 2, 800, sa, { life: .5, n: 26, r0: 200, r1: 1200 }); ring(W / 2, 800, sa, { life: .45, r: 900 });
      txt(String(SCORE.A), 700, 940, { size: 330, fill: A.hue, stroke: INK, sw: .06, id: 'scA', scale: sl, w: 900, align: 'center' });
      txt('–', 960, 915, { size: 250, fill: '#fff', stroke: INK, sw: .06, id: 'scD', scale: sl, w: 900, noreg: true });
      txt(String(SCORE.B), 1220, 940, { size: 330, fill: B.hue, stroke: INK, sw: .06, id: 'scB', scale: sl, w: 900, align: 'center' });
    }
    g.restore();
  }
}
function winnerBg(u) {
  const wa = u - V.win;
  if (wa >= 0) {
    const wp = WINNER === 'A' ? pose('A', u) : pose('B', u), wd = SIDE[WINNER], rays = 22;
    g.save(); g.translate(W / 2, 650); g.rotate(u * .12); g.globalAlpha = .2 * ss(seg(wa, 0, .3));
    for (let i = 0; i < rays; i++) { const a0 = i / rays * TAU, a1 = a0 + TAU / rays * .5; g.fillStyle = i % 2 ? wd.hue : PALE; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a0) * 1800, Math.sin(a0) * 1800); g.lineTo(Math.cos(a1) * 1800, Math.sin(a1) * 1800); g.closePath(); g.fill(); }
    g.restore();
    for (let i = 0; i < 70; i++) {                                                                 // confetti: thrown up, gravity, gone in 4 s
      const hh = hash(i * 1.7), life = wa - .05 - hh * .15; if (life < 0 || life > 4.2) continue;
      const vx = (hash(i + 3) - .5) * 1300, vy = -900 - hash(i + 5) * 700, x = W / 2 + vx * life * (1 - .12 * life), y = 760 + vy * life + 900 * life * life;
      g.save(); g.translate(x, y); g.rotate(life * (4 + hh * 8)); g.fillStyle = [wd.hue, PALE, GOLD, '#fff'][i % 4]; g.globalAlpha = 1 - seg(life, 3.4, 4.2); g.fillRect(-8, -4, 16, 8 + hh * 8); g.restore();
    }
  }
}
function drawWinnerText(u) {
  const wa = u - V.win; if (wa < 0) return; const wd = SIDE[WINNER], wp = pose(WINNER, u);
  txt('获胜', W / 2, 365, { size: 215, fill: GOLD, stroke: INK, sw: .07, id: 'winner', scale: slam(wa, 2.6, .12), shadow: { c: INK, dx: 10, dy: 12 }, track: 10 });
  txt(wd.name, W / 2, 465, { size: 105, fill: '#fff', stroke: INK, sw: .09, id: 'wname', alpha: ss(seg(wa, .25, .45)), scale: slam(wa - .25, 1.6, .1) || 1, track: 4, shadow: { c: wd.hue, dx: -6, dy: 6 } });
  if (wp) {                                                                                         // a crown that drops onto the lid
    const cp = wa - .4; if (cp > 0) {
      const drop = (1 - eo(seg(cp, 0, .25))) * -160, cx = wp.x + 2, cy = wp.y - 318 * wp.s + drop + Math.sin(u * 3) * 3;
      g.save(); g.globalAlpha = ss(seg(cp, 0, .1)); g.translate(cx, cy); g.fillStyle = GOLD; g.strokeStyle = INK; g.lineWidth = 8; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(-54, 0); g.lineTo(-62, -58); g.lineTo(-28, -30); g.lineTo(0, -74); g.lineTo(28, -30); g.lineTo(62, -58); g.lineTo(54, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = wd.hue; for (const dx of [-30, 0, 30]) { g.beginPath(); g.arc(dx, -14, 7, 0, TAU); g.fill(); } g.restore();
      sparks(cx, cy - 20, cp - .2, { n: 10, len: 110, col: PALE, seed: 77, life: .5 });
    }
  }
  const lose = SIDE[WINNER === 'A' ? 'B' : 'A'], lp = pose(WINNER === 'A' ? 'B' : 'A', u);
  const a1 = u - V.chip1, a2 = u - V.chip2;
  if (a1 >= 0) { const p = eo(seg(a1, 0, .2)); g.save(); g.globalAlpha = p; g.translate((1 - p) * -300, 0); g.fillStyle = INK; g.fill(para(530, 888, 1390, 944, 22)); g.fillStyle = wd.hue; g.fill(para(536, 893, 1384, 939, 22)); g.restore();
    txt(D.text.chip1, W / 2 + 6, 928, { font: 'ui', size: 34, w: 700, fill: '#fff', id: 'chip1', track: 3, alpha: p }); }
  if (a2 >= 0) { const p = eo(seg(a2, 0, .2)); g.save(); g.globalAlpha = p; g.translate((1 - p) * 300, 0); g.fillStyle = INK; g.fill(para(290, 962, 1630, 1018, 22)); g.fillStyle = '#171a2e'; g.fill(para(296, 967, 1624, 1013, 22)); g.fillStyle = lose.hue; g.fillRect(296, 967, 10, 46); g.restore();
    txt(D.text.chip2, W / 2 + 6, 1002, { font: 'ui', size: 30, w: 600, fill: '#fff', id: 'chip2', track: 2, alpha: p, fit: 1280 }); }
}

// ------------------------------------------------------------------ transitions: the slash sweeps across and wipes the round UI
function wipeEdge(p) { return -420 + p * (W + 840); }
function drawSweep(u, p, black = false) {
  const ex = wipeEdge(p), yA = -20, yB = H + 20, lean = (y) => (0.5 - y / H) * SK;
  g.save(); g.fillStyle = black ? '#000' : '#fff';
  g.beginPath(); g.moveTo(ex + lean(yA) - 70, yA); g.lineTo(ex + lean(yA), yA); g.lineTo(ex + lean(yB), yB); g.lineTo(ex + lean(yB) - 70, yB); g.closePath(); g.globalAlpha = black ? 1 : .96; g.fill();
  g.globalAlpha = black ? 1 : .55; g.fillStyle = black ? '#000' : A.hue; g.beginPath(); g.moveTo(ex + lean(yA) - 70, yA); g.lineTo(ex + lean(yA) - 190, yA); g.lineTo(ex + lean(yB) - 190, yB); g.lineTo(ex + lean(yB) - 70, yB); g.closePath(); g.fill();
  g.restore();
}

// ------------------------------------------------------------------ frame
function render(t) {
  TEXTS_NOW = [];
  const u = uOf(t), cam = camera(t);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = '#05050a'; g.fillRect(0, 0, W, H);
  g.save();
  const jx = u !== t ? (hash(Math.floor(t * 48)) - .5) * 5 : 0;                                                    // held frame: a tiny tremor so the stop reads as a hit, not a freeze
  g.translate(cam.px + cam.sx + jx, cam.py + cam.sy); g.scale(cam.z, cam.z); g.translate(-cam.px, -cam.py);
  const reveal = ss(seg(u, E.slash + .08, E.slash + .3));
  drawSelectBg(u);
  if (u < E.slash + .35) drawSelect(u);
  if (reveal > 0) drawArena(u, reveal);
  if (u >= E.slash) drawSlash(u, seg(u, E.slash, E.slash + .15));
  winnerBg(u);
  drawKettles(u);
  // round UI (wiped away at the end of each round)
  const rn = roundAt(u);
  if (u >= R0(1) && u < V.wipe) {
    const rd = ROUNDS[rn - 1], wp = seg(u, R0(rn) + R.wipe, R0(rn) + R.wipe + R.wipeLen);
    if (wp > 0) { g.save(); const ex = wipeEdge(wp), p = new Path2D(); p.moveTo(ex + SK / 2, -20); p.lineTo(W + 600, -20); p.lineTo(W + 600, H + 20); p.lineTo(ex - SK / 2, H + 20); p.closePath(); g.clip(p); drawRound(rd, u); g.restore(); }
    else drawRound(rd, u);
  } else if (u >= V.wipe && u < V.head) { const wp = seg(u, V.wipe, V.wipe + R.wipeLen); g.save(); const ex = wipeEdge(wp), p = new Path2D(); p.moveTo(ex + SK / 2, -20); p.lineTo(W + 600, -20); p.lineTo(W + 600, H + 20); p.lineTo(ex - SK / 2, H + 20); p.closePath(); g.clip(p); drawRound(ROUNDS[ROUNDS.length - 1], u); g.restore(); }
  for (const s of ['A', 'B']) if (u >= (s === 'A' ? E.aPlate : E.bPlate)) plate(s, u);
  drawVS(u); drawCountdown(u);
  drawVerdict(u);
  drawHUD(u);
  drawWinnerText(u);
  for (const rd of ROUNDS) { const wp = seg(u, R0(rd.n) + R.wipe, R0(rd.n) + R.wipe + R.wipeLen); if (wp > 0 && wp < 1) drawSweep(u, wp); }
  { const wp = seg(u, V.wipe, V.wipe + R.wipeLen); if (wp > 0 && wp < 1 && !(u >= R0(4) + R.wipe && false)) { /* drawn above for round 4 */ } }
  { const cp = seg(u, V.close, V.close + .45); if (cp > 0) drawSweep(u, cp, true); }
  g.restore();
  if (cam.flash > .01) { g.fillStyle = `rgba(255,252,240,${cam.flash})`; g.fillRect(0, 0, W, H); }
  if (u >= V.close + .45) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
  // blit, with a chromatic split on the big hits
  out.setTransform(1, 0, 0, 1, 0, 0);
  if (cam.chroma > .6) {
    const d = cam.chroma; out.globalCompositeOperation = 'source-over'; out.fillStyle = '#000'; out.fillRect(0, 0, W, H); out.globalCompositeOperation = 'lighter';
    ['#ff0000', '#00ff00', '#0000ff'].forEach((col, i) => { const c = chan[i].getContext('2d'); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, W, H); c.drawImage(sc, 0, 0); c.globalCompositeOperation = 'multiply'; c.fillStyle = col; c.fillRect(0, 0, W, H); out.drawImage(chan[i], (i - 1) * d, (i - 1) * d * .25); });
    out.globalCompositeOperation = 'source-over';
  } else { out.globalCompositeOperation = 'source-over'; out.drawImage(sc, 0, 0); }
}
window.DUR = DUR; window.EV = EV; window.render = render;
window.TEXTS = t => { render(t); return TEXTS_NOW; };
Promise.all([document.fonts.load('900 100px "Big Shoulders Display"'), document.fonts.load('800 100px "Big Shoulders Display"'), document.fonts.load('700 30px "Chakra Petch"'), document.fonts.load('500 30px "Chakra Petch"')]).then(() => { render(0); window.READY = true; });
