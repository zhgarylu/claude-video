// Neon engine: glass tubes lit along their path, a gas-discharge light model (core / body / bloom / wall spill),
// a flicker model, wall + hardware as an albedo layer lit by the signs, and a wet street.
// Pipeline per frame (all deterministic):
//   A  albedo   : brick wall + hardware (backplates, clips, boots, wires) in grey-brown, no light of its own
//   E  emitter  : every lit tube segment in its gas colour (round caps), intensity = flicker x dead-range x ignition
//   Lm lightmap : ambient + E blurred at four radii (the coloured spill on the wall)
//   scene = A x Lm  (multiply), then glass, then E + blurred E added (bloom), then white-hot cores, then reflection + post.
import { clamp, lerp, hash, mulberry } from '/core/lib.js';

export const W = 1920, H = 1080;
export const GAS = { red: [255, 44, 22], orange: [255, 128, 26], blue: [58, 126, 255], green: [56, 255, 160], pink: [255, 62, 164], white: [255, 186, 112] };
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const core = c => mix(c, [255, 250, 240], c === GAS.white ? .4 : .26);

const mkCanvas = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const cv = { A: mkCanvas(), E: mkCanvas(), L: mkCanvas(), S: mkCanvas(), T: mkCanvas(), H: mkCanvas(), X: mkCanvas(), B: mkCanvas() };
const ctx = k => cv[k].getContext('2d');
const small = {};

export function prepSign(sign) {
  let s = 0; for (const st of sign.strokes) { st.start = s; s += st.len; }
  sign.total = s; return sign;
}
export function pointAt(sign, Ls) {
  for (const st of sign.strokes) if (Ls <= st.start + st.len) {
    const u = Ls - st.start; let i = 1; while (i < st.cum.length - 1 && st.cum[i] < u) i++;
    const f = (u - st.cum[i - 1]) / Math.max(1e-6, st.cum[i] - st.cum[i - 1]);
    return [lerp(st.pts[i - 1][0], st.pts[i][0], f), lerp(st.pts[i - 1][1], st.pts[i][1], f)];
  }
  const l = sign.strokes[sign.strokes.length - 1]; return l.pts[l.pts.length - 1];
}
function path(c, st, P) {
  c.beginPath(); let p = P(...st.pts[0]); c.moveTo(p[0], p[1]);
  for (let i = 1; i < st.pts.length; i++) { p = P(...st.pts[i]); c.lineTo(p[0], p[1]); }
}
// segments [s,e] (world px along a stroke) of a stroke that are lit, and that are dead-but-ignited (faint)
function segs(st, lit, t) {
  const L = clamp(lit - st.start, 0, st.len); const live = [], dead = [];
  let cur = [[0, L]];
  for (const [a, b] of (st.deadFn ? st.dead.concat(st.deadFn(t) || []) : st.dead)) {
    const da = a * st.len, db = b * st.len, nxt = [];
    for (const [s, e] of cur) {
      if (db <= s || da >= e) { nxt.push([s, e]); continue; }
      if (da > s) nxt.push([s, da]); if (db < e) nxt.push([db, e]);
      dead.push([Math.max(s, da), Math.min(e, db)]);
    }
    cur = nxt;
  }
  return { live: cur, dead };
}
// flicker: slow breathing + sputter bursts + rare full drop, all hash-driven (any frame can be rendered alone)
function flicker(sign, t) {
  const s = sign.seed || 1; let v = 1 + .018 * Math.sin(t * 5.3 + s) + .012 * Math.sin(t * 11.7 + s * 2);
  const fp = sign.fp ?? 0, slot = Math.floor(t * (sign.fr ?? 12));
  if (fp && hash(slot * 3.17 + s * 7.3) < fp) v *= .18 + .5 * hash(slot * 1.7 + s);
  return v * (sign.I ? sign.I(t) : 1);
}
function sputter(sign, si, t) { const slot = Math.floor(t * 9); return hash(slot * 2.3 + si * 5.1 + (sign.seed || 1)) < .07 ? .55 : 0; }

// draw lit parts of a sign. mode 'body' (gas colour) or 'core' (white-hot, narrower)
function drawGas(c, sign, P, z, t, mode, d0) {
  const d = sign.d ?? d0;
  const lit = sign.lit ? sign.lit(t) : 1e9, I = flicker(sign, t);
  c.lineCap = 'round'; c.lineJoin = 'round';
  sign.strokes.forEach((st, si) => {
    const col = st.c, sg = segs(st, lit, t);
    const kLive = I * (st.k ?? 1), kDead = (.07 + sputter(sign, si, t)) * I;
    const go = (list, k) => {
      if (k <= .002 || !list.length) return;
      c.globalAlpha = clamp(k, 0, 1);
      c.strokeStyle = rgb(mode === 'core' ? core(col) : col);
      c.lineWidth = d * z * (mode === 'core' ? .3 : 1);
      for (const [s, e] of list) {
        if (e - s < .5) continue;
        path(c, st, P); if (s <= .01 && e >= st.len - .01) c.setLineDash([]); else { c.setLineDash([(e - s) * z, 1e7]); c.lineDashOffset = -s * z; } c.stroke();
      }
    };
    go(sg.live, mode === 'core' ? kLive : kLive); go(sg.dead, mode === 'core' ? kDead * .5 : kDead);
  });
  c.setLineDash([]); c.globalAlpha = 1;
  // ignition head: a flare where the discharge front is travelling
  if (lit < sign.total - 1 && lit > 0) {
    const [hx, hy] = P(...pointAt(sign, lit)), r = d * z * (mode === 'core' ? 1.4 : 3.4);
    const g = c.createRadialGradient(hx, hy, 0, hx, hy, r), col = sign.strokes.find(s => lit >= s.start && lit <= s.start + s.len)?.c || sign.strokes[0].c;
    g.addColorStop(0, rgb(core(col), .95 * I)); g.addColorStop(.3, rgb(col, .55 * I)); g.addColorStop(1, rgb(col, 0));
    c.fillStyle = g; c.beginPath(); c.arc(hx, hy, r, 0, 7); c.fill();
  }
}
function drawGlass(c, sign, P, z, d0) {
  const d = sign.d ?? d0;
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const st of sign.strokes) {
    path(c, st, P); c.strokeStyle = 'rgba(176,196,226,.2)'; c.lineWidth = (d + 2.6) * z; c.stroke();
    path(c, st, P); c.strokeStyle = 'rgba(7,9,13,.88)'; c.lineWidth = (d - 1.2) * z; c.stroke();
    c.save(); c.translate(-d * .2 * z, -d * .2 * z);
    path(c, st, P); c.strokeStyle = 'rgba(210,225,245,.20)'; c.lineWidth = Math.max(1, d * .13 * z); c.stroke(); c.restore();
  }
}

// ---------- wall + hardware (albedo) ----------
function brickWall(c, P, cam, o = {}) {
  const z = cam.z, bw = 128, bh = 46, m = 4.5;
  c.fillStyle = '#2c2624'; c.fillRect(0, 0, W, H);
  const x0 = cam.cx - W / 2 / z, x1 = cam.cx + W / 2 / z, y0 = cam.cy - H / 2 / z, y1 = cam.cy + H / 2 / z;
  const r0 = Math.floor(y0 / bh) - 1, r1 = Math.ceil(y1 / bh) + 1;
  for (let r = r0; r <= r1; r++) {
    const off = (r & 1) ? bw / 2 : 0, c0 = Math.floor((x0 - off) / bw) - 1, c1 = Math.ceil((x1 - off) / bw) + 1;
    for (let k = c0; k <= c1; k++) {
      const id = r * 131 + k * 17, h1 = hash(id), h2 = hash(id + .5), h3 = hash(id + 1.5);
      const v = .5 + .34 * (h1 - .5) + (h3 < .1 ? -.16 : h3 > .94 ? .13 : 0), tint = h2;
      const bx = k * bw + off + m / 2, by = r * bh + m / 2, w = bw - m, h = bh - m;
      const [sx, sy] = P(bx, by);
      const R = 255 * v * (1 + .08 * tint), G = 255 * v * (.74 + .06 * tint), B = 255 * v * (.66 + .05 * tint);
      c.fillStyle = `rgb(${R | 0},${G | 0},${B | 0})`; c.fillRect(sx, sy, w * z, h * z);
      c.fillStyle = 'rgba(255,236,220,.22)'; c.fillRect(sx, sy, w * z, Math.max(1, 3 * z));
      c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(sx, sy + (h - 4) * z, w * z, Math.max(1, 4 * z));
      if (h3 < .1) { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(sx + w * z * .3 * h1, sy, w * z * .5, h * z); }
    }
  }
  // damp blotches + plaster patches: coarse world-anchored cells
  { const cs = 330, i0 = Math.floor(x0 / cs) - 1, i1 = Math.ceil(x1 / cs) + 1, j0 = Math.floor(y0 / cs) - 1, j1 = Math.ceil(y1 / cs) + 1;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const hh = hash(i * 12.9 + j * 78.2); if (hh < .38) continue;
      const [px, py] = P(i * cs + hash(i + j * 3.1) * cs, j * cs + hash(i * 5.3 + j) * cs), r = (90 + 150 * hash(i * 2.2 + j * 9.1)) * z;
      const g = c.createRadialGradient(px, py, 0, px, py, r); const dark = hh < .72;
      g.addColorStop(0, dark ? 'rgba(0,0,0,.42)' : 'rgba(210,190,170,.16)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(px - r, py - r, 2 * r, 2 * r);
    } }
  // grit: world-anchored noise tile
  if (!brickWall.tile) {
    const t = document.createElement('canvas'); t.width = t.height = 256; const tc = t.getContext('2d'), rnd = mulberry(7), id = tc.createImageData(256, 256);
    for (let i = 0; i < 65536; i++) { const v = 150 + rnd() * 105 | 0; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    tc.putImageData(id, 0, 0); brickWall.tile = t;
  }
  c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = c.createPattern(brickWall.tile, 'repeat');
  c.translate(W / 2 - cam.cx * z, H / 2 - cam.cy * z); c.scale(z * 1.3, z * 1.3); c.fillRect((x0 - 10) / 1.3, (y0 - 10) / 1.3, (x1 - x0 + 20) / 1.3, (y1 - y0 + 20) / 1.3); c.restore();
  // soot / damp streaks falling from hardware
  if (o.streaks) for (const [sx0, sy0, len, w] of o.streaks) {
    const [a, b] = P(sx0, sy0), g = c.createLinearGradient(0, b, 0, b + len * z);
    g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(a - w * z / 2, b, w * z, len * z);
  }
}
export function hw() {   // hardware helpers: draw onto the albedo layer
  return {
    rail(c, P, z, x0, y0, x1, y1, w = 8) {
      const [a, b] = P(x0, y0), [e, f] = P(x1, y1);
      c.lineCap = 'butt'; c.strokeStyle = '#43444c'; c.lineWidth = w * z; c.beginPath(); c.moveTo(a, b); c.lineTo(e, f); c.stroke();
      c.strokeStyle = 'rgba(200,205,220,.35)'; c.lineWidth = Math.max(1, 1.6 * z); c.beginPath(); c.moveTo(a, b - w * z * .42); c.lineTo(e, f - w * z * .42); c.stroke();
    },
    clip(c, P, z, x, y, d = 13) {
      const [a, b] = P(x, y);
      c.fillStyle = '#3c3c44'; c.beginPath(); c.arc(a, b, (d * .95 + 2) * z, 0, 7); c.fill();
      c.strokeStyle = 'rgba(210,215,230,.45)'; c.lineWidth = Math.max(1, 1.8 * z); c.beginPath(); c.arc(a, b, (d * .95 + 1) * z, Math.PI * 1.15, Math.PI * 1.8); c.stroke();
      c.fillStyle = '#4a4a52'; c.beginPath(); c.arc(a, b + (d * .5 + 11) * z, 2.6 * z, 0, 7); c.fill();
    },
    boot(c, P, z, x, y, dx, dy, d = 13) {   // dark glass sleeve + electrode cap at a tube end, pointing (dx,dy)
      const n = Math.hypot(dx, dy) || 1, ux = dx / n, uy = dy / n, [a, b] = P(x, y), [e, f] = P(x + ux * 46, y + uy * 46);
      c.lineCap = 'round'; c.strokeStyle = '#17171b'; c.lineWidth = (d + 9) * z; c.beginPath(); c.moveTo(a, b); c.lineTo(e, f); c.stroke();
      c.strokeStyle = 'rgba(190,195,215,.35)'; c.lineWidth = Math.max(1, 1.6 * z); c.beginPath(); c.moveTo(a - uy * 5 * z, b + ux * 5 * z); c.lineTo(e - uy * 5 * z, f + ux * 5 * z); c.stroke();
      const [g, h] = P(x + ux * 52, y + uy * 52); c.fillStyle = '#5a5a62'; c.beginPath(); c.arc(g, h, 5.5 * z, 0, 7); c.fill();
    },
    cable(c, P, z, pts, w = 5) {   // bezier through control points [x,y]*4
      const q = pts.map(p => P(...p)); c.lineCap = 'round';
      c.strokeStyle = '#101013'; c.lineWidth = w * z; c.beginPath(); c.moveTo(...q[0]); c.bezierCurveTo(...q[1], ...q[2], ...q[3]); c.stroke();
      c.save(); c.translate(0, -1.4 * z); c.strokeStyle = 'rgba(190,195,215,.28)'; c.lineWidth = Math.max(1, w * .22 * z); c.beginPath(); c.moveTo(...q[0]); c.bezierCurveTo(...q[1], ...q[2], ...q[3]); c.stroke(); c.restore();
    },
    box(c, P, z, x, y, w, h) {   // transformer / junction box
      const [a, b] = P(x, y); c.fillStyle = '#30343a'; c.fillRect(a, b, w * z, h * z);
      c.fillStyle = 'rgba(220,225,235,.3)'; c.fillRect(a, b, w * z, Math.max(1, 3 * z)); c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(a, b + (h - 5) * z, w * z, 5 * z);
      c.fillStyle = '#1b1d21'; c.fillRect(a + w * z * .12, b + h * z * .18, w * z * .76, h * z * .12);
      c.fillStyle = '#7a7e86'; for (const [fx, fy] of [[.06, .08], [.94, .08], [.06, .92], [.94, .92]]) { c.beginPath(); c.arc(a + w * z * fx, b + h * z * fy, 3 * z, 0, 7); c.fill(); }
      c.fillStyle = '#9a9ea6'; c.fillRect(a + w * z * .3, b + h * z * .5, w * z * .4, h * z * .22);
    },
    pipe(c, P, z, x, y0, y1, w = 34) {
      const [a, b] = P(x, y0), [, f] = P(x, y1); const g = c.createLinearGradient(a - w * z / 2, 0, a + w * z / 2, 0);
      g.addColorStop(0, '#16161a'); g.addColorStop(.3, '#4a4b52'); g.addColorStop(.55, '#26262b'); g.addColorStop(1, '#0e0e11');
      c.fillStyle = g; c.fillRect(a - w * z / 2, b, w * z, f - b);
      for (let yy = y0 + 160; yy < y1; yy += 380) { const [, q] = P(x, yy); c.fillStyle = '#202025'; c.fillRect(a - (w / 2 + 6) * z, q, (w + 12) * z, 16 * z); }
    },
  };
}

// ---------- street ----------
function street(sc, hy, t, o, P, z) {
  const th = H - hy; if (th <= 2) return;
  const g = sc.createLinearGradient(0, hy, 0, H); g.addColorStop(0, '#12141b'); g.addColorStop(1, '#07080c');
  sc.fillStyle = g; sc.fillRect(0, hy, W, th);
  const R = ctx('T'); R.setTransform(1, 0, 0, 1, 0, 0); R.globalCompositeOperation = 'source-over'; R.clearRect(0, 0, W, H);
  const str = o.stretch ?? .85, sh = 3, ph = o.seed || 0;
  for (let j = 0; j < th; j += sh) {
    const srcY = hy - j / str - sh / str;
    const wob = Math.sin(j * .11 + ph + t * .9) * (3 + j * .035) + Math.sin(j * .37 + 2 - t * 1.7) * 1.7 + (hash(j * .7 + ph + Math.floor(t * 6)) - .5) * (1.6 + j * .008);
    R.drawImage(cv.S, 0, Math.max(0, srcY), W, sh / str + .6, wob, hy + j, W, sh + .5);
  }
  // streak mask: broken vertical bands, as asphalt breaks the mirror
  const M = ctx('X'); M.globalCompositeOperation = 'source-over'; M.clearRect(0, 0, W, H);
  const ox = P(0, 0)[0];
  for (let x = 0; x < W; x += 7) {
    const wx = (x - ox) / z, h1 = hash(Math.floor(wx / 9) * 1.7 + ph), h2 = hash(Math.floor(wx / 9) * 3.9 + ph + 5), gg = M.createLinearGradient(0, hy, 0, H);   // each streak fades at its own rate: some run to the horizon, some break up early
    gg.addColorStop(0, `rgba(0,0,0,${.28 + .72 * h1})`); gg.addColorStop(Math.min(1, .15 + .85 * h2), `rgba(0,0,0,${(.28 + .72 * h1) * (.15 + .5 * h2)})`); gg.addColorStop(1, `rgba(0,0,0,${(.28 + .72 * h1) * .12})`);
    M.fillStyle = gg; M.fillRect(x, hy, 7.5, th);
  }
  R.globalCompositeOperation = 'destination-in'; R.drawImage(cv.X, 0, 0);
  const m = R.createLinearGradient(0, hy, 0, H); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(.55, 'rgba(0,0,0,.7)'); m.addColorStop(1, 'rgba(0,0,0,.38)');
  R.fillStyle = m; R.fillRect(0, hy, W, th); R.globalCompositeOperation = 'source-over';
  sc.save(); sc.globalCompositeOperation = 'lighter'; sc.filter = 'blur(5px)'; sc.globalAlpha = o.wet ?? .62; sc.drawImage(cv.T, 0, 0); sc.drawImage(cv.T, 0, 0); sc.restore();
  // puddles in world space: a sharper mirror with rain rings
  const rnd = mulberry(o.seed || 3), n = o.puddles ?? 8, x0 = o.x0 ?? 0, x1 = o.x1 ?? 1920;
  sc.save(); sc.beginPath(); const pud = [];
  for (let i = 0; i < n; i++) {
    const wx = x0 + rnd() * (x1 - x0), fy = .2 + .7 * rnd(), pw = 120 + 300 * rnd(), ph2 = 10 + 18 * rnd(); const px = P(wx, 0)[0], py = hy + th * fy;
    if (px > -pw * z && px < W + pw * z) { sc.moveTo(px + pw * z, py); sc.ellipse(px, py, pw * z, ph2 * (.6 + fy), 0, 0, 7); pud.push([px, py, pw * z, ph2 * (.6 + fy)]); }
  }
  sc.clip(); sc.globalCompositeOperation = 'lighter'; sc.globalAlpha = .8; sc.filter = 'blur(2px)'; sc.drawImage(cv.T, 0, 0); sc.filter = 'none';
  if (o.rain) {
    sc.strokeStyle = 'rgba(190,210,240,1)'; sc.lineWidth = 1.2;
    for (const [px, py, pw, pv] of pud) for (let k = 0; k < 5; k++) {
      const age = ((t * .9 + k * .21 + hash(px + k)) % 1), r = age * 46;
      sc.beginPath(); sc.ellipse(px + (hash(k * 3.3 + px) - .5) * pw, py + (hash(k * 5.1 + py) - .5) * pv * .6, r, r * .22, 0, 0, 7);
      sc.globalAlpha = (1 - age) * .22 * o.rain; sc.stroke();
    }
  }
  sc.restore();
  const f = sc.createLinearGradient(0, hy - 90, 0, hy); f.addColorStop(0, 'rgba(0,0,0,0)'); f.addColorStop(1, 'rgba(0,0,0,.55)');
  sc.fillStyle = f; sc.fillRect(0, hy - 90, W, 90);
  sc.fillStyle = 'rgba(0,0,0,.8)'; sc.fillRect(0, hy - 2, W, 4);
  for (let i = 0; i < 260; i++) { const x = rnd() * W, y = hy + 8 + rnd() * (th - 10); sc.fillStyle = `rgba(190,200,230,${.03 + .06 * rnd()})`; sc.fillRect(x, y, 6 + 24 * rnd(), 1); }
}

function bloom(main, k) {
  for (const [name, div, blur, a] of [['b1', 4, 7, .5], ['b2', 10, 9, .42], ['b3', 24, 8, .38]]) {
    if (!small[name]) { const c = document.createElement('canvas'); c.width = W / div; c.height = H / div; small[name] = c; }
    const s = small[name], sc = s.getContext('2d'); sc.clearRect(0, 0, s.width, s.height);
    sc.filter = `blur(${blur}px)`; sc.drawImage(cv.S, 0, 0, s.width, s.height); sc.filter = 'none';
    main.save(); main.globalCompositeOperation = 'lighter'; main.globalAlpha = a * k; main.imageSmoothingQuality = 'high'; main.drawImage(s, 0, 0, W, H); main.restore();
  }
}

export function renderScene(out, S, t) {
  const cam = S.cam(t), z = cam.z, P = (x, y) => [(x - cam.cx) * z + W / 2, (y - cam.cy) * z + H / 2];
  const A = ctx('A'), E = ctx('E'), Lm = ctx('L'), sc = ctx('S'), Hc = ctx('H'), X = ctx('X'), B = ctx('B');
  const d = S.d ?? 13, day = S.day ? S.day(t) : 0, night = [8, 9, 18], dayc = [104, 114, 138];
  const amb0 = S.ambient ? (typeof S.ambient === 'function' ? S.ambient(t) : S.ambient) : [lerp(night[0], dayc[0], day), lerp(night[1], dayc[1], day), lerp(night[2], dayc[2], day)];
  const asc = S.ambScale ? S.ambScale(t) : 1, amb = amb0.map(v => v * asc);
  A.setTransform(1, 0, 0, 1, 0, 0); A.globalAlpha = 1; A.globalCompositeOperation = 'source-over';
  brickWall(A, P, cam, S.wall || {});
  Hc.setTransform(1, 0, 0, 1, 0, 0); Hc.globalCompositeOperation = 'source-over'; Hc.clearRect(0, 0, W, H);
  if (S.hardware) S.hardware(Hc, P, z, hw(), t);
  E.setTransform(1, 0, 0, 1, 0, 0); E.globalCompositeOperation = 'source-over'; E.clearRect(0, 0, W, H); E.globalCompositeOperation = 'lighter';
  for (const sg of S.signs) drawGas(E, sg, P, z, t, 'body', d);
  Lm.globalCompositeOperation = 'source-over'; Lm.filter = 'none'; Lm.globalAlpha = 1; Lm.fillStyle = rgb(amb); Lm.fillRect(0, 0, W, H);
  Lm.globalCompositeOperation = 'lighter';
  { const g = Lm.createLinearGradient(0, 0, 0, H); const k = 1 + 2.4 * (1 - day);
    g.addColorStop(0, rgb([amb[0] * .45 * k + 4, amb[1] * .5 * k + 5, amb[2] * .65 * k + 9])); g.addColorStop(1, 'rgba(0,0,0,0)'); Lm.fillStyle = g; Lm.fillRect(0, 0, W, H); }
  for (const [b, a, n] of S.spill || [[10, .5, 1], [34, .55, 2], [100, .62, 3], [260, .6, 3]]) {
    Lm.filter = `blur(${b * Math.sqrt(z)}px)`; Lm.globalAlpha = a; for (let i = 0; i < n; i++) Lm.drawImage(cv.E, 0, 0);
  }
  Lm.filter = 'none'; Lm.globalAlpha = 1;
  sc.globalCompositeOperation = 'source-over'; sc.globalAlpha = 1; sc.filter = 'none'; sc.drawImage(cv.A, 0, 0);
  sc.globalCompositeOperation = 'multiply'; sc.drawImage(cv.L, 0, 0); sc.globalCompositeOperation = 'source-over';
  B.globalCompositeOperation = 'source-over'; B.drawImage(cv.L, 0, 0); B.globalCompositeOperation = 'lighter'; B.fillStyle = `rgb(${66 * asc | 0},${72 * asc | 0},${90 * asc | 0})`; B.fillRect(0, 0, W, H); B.globalCompositeOperation = 'source-over';
  X.globalCompositeOperation = 'source-over'; X.clearRect(0, 0, W, H); X.drawImage(cv.H, 0, 0); X.globalCompositeOperation = 'multiply'; X.drawImage(cv.B, 0, 0);
  X.globalCompositeOperation = 'destination-in'; X.drawImage(cv.H, 0, 0); X.globalCompositeOperation = 'source-over';
  sc.drawImage(cv.X, 0, 0);
  sc.globalAlpha = asc; for (const sg of S.signs) drawGlass(sc, sg, P, z, d); sc.globalAlpha = 1;
  sc.globalCompositeOperation = 'lighter';
  const hk = 1 - .7 * day;
  for (const [b, a] of S.halo || [[14, .42], [40, .34]]) { sc.filter = `blur(${b * Math.sqrt(z)}px)`; sc.globalAlpha = a * hk; sc.drawImage(cv.E, 0, 0); }
  sc.filter = 'none'; sc.globalAlpha = 1; sc.drawImage(cv.E, 0, 0);
  for (const sg of S.signs) drawGas(sc, sg, P, z, t, 'core', d);
  sc.globalCompositeOperation = 'source-over';
  const hyS = S.street ? P(0, S.street.hy)[1] : H;
  if (S.street) street(sc, Math.min(H, Math.max(0, hyS)), t, Object.assign({ rain: S.rain ? S.rain(t) : 0 }, S.street), P, z);
  if (S.fx) S.fx(sc, P, z, t, hyS);
  bloom(sc, (S.bloom ?? 1) * (1 - .6 * day));
  if (day > 0) { sc.save(); sc.globalCompositeOperation = 'lighter'; sc.fillStyle = `rgba(110,124,150,${.2 * day})`; sc.fillRect(0, 0, W, H); sc.restore(); }
  if (S.rain) { const r = S.rain(t); if (r > .01) rainFx(sc, t, r); }
  const v = sc.createRadialGradient(W / 2, H * .5, H * .35, W / 2, H * .5, H * .95); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${.62 - .2 * day})`);
  sc.fillStyle = v; sc.fillRect(0, 0, W, H);
  if (S.fade) { const f = S.fade(t); if (f > 0) { sc.fillStyle = `rgba(0,0,0,${f})`; sc.fillRect(0, 0, W, H); } }
  if (S.post) S.post(sc, t);
  out.setTransform(1, 0, 0, 1, 0, 0); out.drawImage(cv.S, 0, 0);
}
function rainFx(c, t, r) {
  c.save(); c.lineCap = 'round';
  for (let i = 0; i < 170; i++) {
    const sp = 1500 + 700 * hash(i * 1.3), len = 36 + 70 * hash(i * 2.1), x = hash(i * 7.7) * (W + 300) - 100, y0 = hash(i * 3.9) * (H + 300);
    const y = (y0 + sp * t) % (H + 300) - 150, dx = len * .16, xs = x - ((y + 150) * .16) % 40;
    c.strokeStyle = `rgba(190,208,240,${(.05 + .11 * hash(i * 5.5)) * r})`; c.lineWidth = 1 + hash(i * 9.1);
    c.beginPath(); c.moveTo(xs, y); c.lineTo(xs - dx, y + len); c.stroke();
  }
  c.restore();
}
