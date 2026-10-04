// Manga Panel engine: G-pen, screentone, effect lines, balloons, sound-effect lettering.
// Everything is drawn on a 2D canvas in "page space". The camera sets VIEW (visible world rect) every frame.
// No randomness outside seeded hashes: any frame can be rendered alone.
(function (G) {
const TAU = Math.PI * 2;
const INK = '#0e0d10', PAPER = '#fbfaf5';
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(x, y, s) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s || 0) | 0, 2147483647); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
function vn(x, s) { const i = Math.floor(x), f = x - i, a = hash2(i, 0, s), b = hash2(i + 1, 0, s); const u = f * f * (3 - 2 * f); return a + (b - a) * u; }

const VIEW = { x0: -1e5, y0: -1e5, x1: 1e5, y1: 1e5, z: 1 };
// light comes from the upper left; "shadow side" normals point to the lower right
const LS = [0.56, 0.83];

// ---------- geometry helpers ----------
function smoothPts(pts, closed, step) {
  step = step || 2.5; const n = pts.length, out = [];
  const g = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), m = Math.max(1, Math.ceil(d / step));
    for (let k = 0; k < m; k++) {
      const t = k / m, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(c => 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  if (!closed) out.push(pts[n - 1].slice());
  return out;
}
function polyline(pts, closed, step) { // straight resample (sharp corners)
  step = step || 3; const n = pts.length, out = [], segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % n], d = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(d / step));
    for (let k = 0; k < m; k++) out.push([a[0] + (b[0] - a[0]) * k / m, a[1] + (b[1] - a[1]) * k / m]);
  }
  if (!closed) out.push(pts[n - 1].slice());
  return out;
}
function area(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; }
function bounds(p) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const q of p) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); } return [x0, y0, x1, y1]; }
function ellipsePts(cx, cy, rx, ry, rot, n, a0, a1) {
  n = n || 36; rot = rot || 0; a0 = a0 == null ? 0 : a0; a1 = a1 == null ? TAU : a1; const out = [], c = Math.cos(rot), s = Math.sin(rot), full = Math.abs(a1 - a0 - TAU) < 1e-6;
  const m = full ? n : n + 1;
  for (let i = 0; i < m; i++) { const a = a0 + (a1 - a0) * i / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return out;
}
function pathPoly(ctx, p) { ctx.beginPath(); p.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); }

// ---------- G-pen ----------
// o: w (max width), tin/tout (taper lengths as fraction of the stroke), closed, vary (0..1 line-weight variation by
// direction: thick on the shadow side), side (+1/-1: which side of an open stroke counts as outside), sharp (no smoothing),
// wob (slow width wobble), prof(u) (custom pressure), seed, color, min (minimum width)
function pen(ctx, pts, o) {
  o = o || {}; const closed = !!o.closed;
  const s = o.sharp ? polyline(pts, closed, o.step || 2.5) : smoothPts(pts, closed, o.step || 2.5);
  const n = s.length; if (n < 2) return s;
  const L = [0]; for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]));
  const total = L[n - 1] || 1, W = o.w || 3, vary = o.vary == null ? 0.6 : o.vary, wob = o.wob == null ? 0.1 : o.wob, seed = o.seed || 1;
  const tin = o.tin == null ? 0.12 : o.tin, tout = o.tout == null ? 0.22 : o.tout, mn = o.min == null ? 0.18 : o.min;
  const sgn = closed ? (area(s) > 0 ? 1 : -1) : (o.side || 1);
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const a = s[Math.max(0, i - 1)] , b = s[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const nx = ty * sgn, ny = -tx * sgn; // outward normal (for y-down, clockwise path: (ty,-tx))
    const u = L[i] / total; let pr = 1;
    if (!closed) { if (u < tin) pr = mn + (1 - mn) * Math.sqrt(u / tin); else if (u > 1 - tout) pr = mn + (1 - mn) * Math.pow((1 - u) / tout, 0.8); }
    if (o.prof) pr *= o.prof(u);
    const lit = 0.5 + 0.5 * (nx * LS[0] + ny * LS[1]); // 1 on shadow side
    const k = lerp(1 - vary, 1 + vary * 0.8, lit);
    const w = Math.max(0.15, W * pr * k * (1 + wob * (vn(L[i] / 14, seed) - 0.5) * 2));
    left.push([s[i][0] + nx * w / 2, s[i][1] + ny * w / 2]); right.push([s[i][0] - nx * w / 2, s[i][1] - ny * w / 2]);
  }
  ctx.fillStyle = o.color || INK;
  ctx.beginPath();
  if (closed) {
    left.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath();
    right.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath();
    ctx.fill('evenodd');
  } else {
    left.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath(); ctx.fill();
  }
  return s;
}
// filled shape with pen outline; o.fill (default paper), o.noLine
function shape(ctx, pts, o) {
  o = o || {}; const s = o.sharp ? polyline(pts, true, o.step || 2.5) : smoothPts(pts, true, o.step || 2.5);
  if (o.fill !== null) { ctx.fillStyle = o.fill || PAPER; pathPoly(ctx, s); ctx.fill(); }
  if (!o.noLine) pen(ctx, s, Object.assign({}, o, { closed: true, sharp: true, step: 99 }));
  return s;
}
// plain ruler line (panel borders, building edges)
function ruler(ctx, pts, w, closed) {
  ctx.strokeStyle = INK; ctx.lineWidth = w; ctx.lineJoin = 'miter'; ctx.miterLimit = 6; ctx.lineCap = 'butt';
  ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); if (closed) ctx.closePath(); ctx.stroke();
}

// ---------- screentone ----------
// clip: polygon (array of [x,y]) the tone is limited to. spec: {k:'dot'|'line'|'sand'|'solid', pitch, ang, pct | f(x,y), ox, oy, color, seed}
// Dot tones are anchored in PAGE space (ox, oy fixed), so they never swim when something moves over them.
function tone(ctx, clip, spec) {
  const b = bounds(clip);
  const bx0 = Math.max(b[0], VIEW.x0) - 2, by0 = Math.max(b[1], VIEW.y0) - 2, bx1 = Math.min(b[2], VIEW.x1) + 2, by1 = Math.min(b[3], VIEW.y1) + 2;
  if (bx1 <= bx0 || by1 <= by0) return;
  ctx.save(); pathPoly(ctx, clip); ctx.clip();
  const k = spec.k || 'dot', col = spec.color || INK;
  if (k === 'solid') { ctx.fillStyle = col; ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0); ctx.restore(); return; }
  const PS = G.MG.PS || 1; const f = spec.f || (() => spec.pct), ox = spec.ox || 0, oy = spec.oy || 0;
  if (k === 'dot') {
    const p = (spec.pitch || 5.5) * PS, a = (spec.ang == null ? 45 : spec.ang) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    let i0 = 1e9, i1 = -1e9, j0 = 1e9, j1 = -1e9;
    for (const [x, y] of [[bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1]]) {
      const i = ((x - ox) * ca + (y - oy) * sa) / p, j = (-(x - ox) * sa + (y - oy) * ca) / p;
      i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j);
    }
    i0 = Math.floor(i0) - 1; i1 = Math.ceil(i1) + 1; j0 = Math.floor(j0) - 1; j1 = Math.ceil(j1) + 1;
    ctx.fillStyle = col; ctx.beginPath(); let heavy = false; const holes = [];
    const minR = 0.45 / VIEW.z;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const x = ox + (i * ca - j * sa) * p, y = oy + (i * sa + j * ca) * p;
      if (x < bx0 - p || x > bx1 + p || y < by0 - p || y > by1 + p) continue;
      const pc = f(x, y); if (pc <= 0.01) continue;
      if (pc > 0.78) { heavy = true; if (pc < 0.985) holes.push([x + (ca - sa) * p * 0.5, y + (sa + ca) * p * 0.5, p * Math.sqrt((1 - pc) / Math.PI) * 1.05]); continue; }
      const r = p * Math.sqrt(pc / Math.PI); if (r < minR) continue;
      ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
    }
    ctx.fill();
    if (heavy) { // dense tone: solid ink with paper holes at the cell centres
      ctx.fillStyle = col; ctx.beginPath();
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const x = ox + (i * ca - j * sa) * p, y = oy + (i * sa + j * ca) * p; if (f(x, y) > 0.78) { const r = p * 0.74; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
      }
      ctx.fill();
      ctx.fillStyle = PAPER; ctx.beginPath();
      for (const h of holes) { ctx.moveTo(h[0] + h[2], h[1]); ctx.arc(h[0], h[1], h[2], 0, TAU); }
      ctx.fill();
    }
  } else if (k === 'line') {
    const p = (spec.pitch || 5.5) * PS, a = (spec.ang == null ? 15 : spec.ang) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    let i0 = 1e9, i1 = -1e9, j0 = 1e9, j1 = -1e9;
    for (const [x, y] of [[bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1]]) {
      const i = ((x - ox) * ca + (y - oy) * sa), j = (-(x - ox) * sa + (y - oy) * ca) / p;
      i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j);
    }
    j0 = Math.floor(j0) - 1; j1 = Math.ceil(j1) + 1; i0 -= 4; i1 += 4;
    ctx.fillStyle = col; ctx.beginPath();
    const stepI = spec.f ? 14 : (i1 - i0);
    for (let j = j0; j <= j1; j++) for (let i = i0; i < i1; i += stepI) {
      const ie = Math.min(i + stepI, i1);
      const pt = (ii, jj) => [ox + ii * ca - jj * p * sa, oy + ii * sa + jj * p * ca];
      const xa = pt(i, j), xb = pt(ie, j);
      const w0 = spec.f ? f(xa[0], xa[1]) : spec.pct, w1 = spec.f ? f(xb[0], xb[1]) : spec.pct;
      if (w0 <= 0.01 && w1 <= 0.01) continue;
      const h0 = w0 * p / 2, h1 = w1 * p / 2, nx = -sa, ny = ca;
      ctx.moveTo(xa[0] + nx * h0, xa[1] + ny * h0); ctx.lineTo(xb[0] + nx * h1, xb[1] + ny * h1);
      ctx.lineTo(xb[0] - nx * h1, xb[1] - ny * h1); ctx.lineTo(xa[0] - nx * h0, xa[1] - ny * h0); ctx.closePath();
    }
    ctx.fill();
  } else if (k === 'sand') {
    const c = (spec.pitch || 3.4) * PS, seed = spec.seed || 7; ctx.fillStyle = col; ctx.beginPath();
    const ci0 = Math.floor(bx0 / c), ci1 = Math.ceil(bx1 / c), cj0 = Math.floor(by0 / c), cj1 = Math.ceil(by1 / c);
    for (let i = ci0; i <= ci1; i++) for (let j = cj0; j <= cj1; j++) {
      const x = (i + 0.5) * c, y = (j + 0.5) * c, pc = f(x, y); if (pc <= 0.01) continue;
      if (hash2(i, j, seed) > pc * 1.9) continue;
      const jx = (hash2(i, j, seed + 1) - 0.5) * c * 0.8, jy = (hash2(i, j, seed + 2) - 0.5) * c * 0.8, r = c * (0.16 + 0.2 * hash2(i, j, seed + 3));
      ctx.moveTo(x + jx + r, y + jy); ctx.arc(x + jx, y + jy, r, 0, TAU);
    }
    ctx.fill();
  }
  ctx.restore();
}
const gradLin = (x0, y0, x1, y1, p0, p1, ease) => { const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy; return (x, y) => { let t = clamp(((x - x0) * dx + (y - y0) * dy) / l2, 0, 1); if (ease) t = ss(t); return p0 + (p1 - p0) * t; }; };
const gradRad = (cx, cy, r0, r1, p0, p1, ease) => (x, y) => { let t = clamp((Math.hypot(x - cx, y - cy) - r0) / (r1 - r0), 0, 1); if (ease) t = ss(t); return p0 + (p1 - p0) * t; };

// ---------- effect lines ----------
// focus lines: thin spikes that converge on (cx, cy); white=true draws them in paper colour (for black grounds)
function focusLines(ctx, cx, cy, rIn, rOut, n, seed, wmax, white, clip) {
  const rn = mulberry(seed || 3); ctx.save(); if (clip) { pathPoly(ctx, clip); ctx.clip(); }
  ctx.fillStyle = white ? PAPER : INK; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i + rn() * 0.8) / n * TAU, w = (0.004 + 0.01 * rn() * rn() + (rn() < 0.12 ? 0.02 : 0)) * (wmax || 1);
    const r0 = rIn * (0.85 + 0.5 * rn()), r1 = rOut * (0.8 + 0.5 * rn());
    const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
    ctx.moveTo(cx + ca * r0, cy + sa * r0);
    ctx.lineTo(cx + ca * r1 + nx * w * r1, cy + sa * r1 + ny * w * r1); ctx.lineTo(cx + ca * r1 - nx * w * r1, cy + sa * r1 - ny * w * r1); ctx.closePath();
  }
  ctx.fill(); ctx.restore();
}
// speed lines: parallel tapered lines along `ang` (degrees, direction of motion) inside rect, avoiding a hole ellipse
function speedLines(ctx, rect, ang, n, seed, lenR, wR, white, hole, phase) {
  const rn = mulberry(seed || 5), a = ang * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
  const [x0, y0, x1, y1] = rect, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, diag = Math.hypot(x1 - x0, y1 - y0);
  ctx.fillStyle = white ? PAPER : INK; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const off = (rn() - 0.5) * diag, len = lerp(lenR[0], lenR[1], rn()), w = lerp(wR[0], wR[1], rn() * rn()), st = (rn() - 0.5) * diag + (phase || 0) * len * 0.0;
    const px = cx + nx * off + ca * (st + (phase || 0) * (0.6 + rn())), py = cy + ny * off + sa * (st + (phase || 0) * (0.6 + rn()));
    if (hole) { const dx = (px - hole[0]) / hole[2], dy = (py - hole[1]) / hole[3]; if (dx * dx + dy * dy < 1) continue; }
    ctx.moveTo(px - ca * len / 2, py - sa * len / 2);
    ctx.lineTo(px + nx * w / 2, py + ny * w / 2); ctx.lineTo(px + ca * len / 2, py + sa * len / 2); ctx.lineTo(px - nx * w / 2, py - ny * w / 2); ctx.closePath();
  }
  ctx.fill();
}
function sweat(ctx, x, y, s, rot) { // teardrop with a highlight
  const c = Math.cos(rot || 0), t = Math.sin(rot || 0), T = (a, b) => [x + (a * c - b * t) * s, y + (a * t + b * c) * s];
  shape(ctx, [T(0, -1.5), T(0.62, -0.1), T(0.5, 0.65), T(0, 1), T(-0.5, 0.65), T(-0.62, -0.1)], { w: 0.34 * s, vary: 0.5, seed: 4 });
  const h = ellipsePts(...T(-0.2, 0.28), 0.12 * s, 0.26 * s, rot || 0, 10); ctx.fillStyle = INK; pathPoly(ctx, h); ctx.fill();
}
function sparkle(ctx, x, y, r, fill) { // four-point star with concave sides
  const p = [], k = 0.16; for (let i = 0; i < 8; i++) { const a = i * TAU / 8 - Math.PI / 2, rr = i % 2 ? r * k * 2.2 : r; p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  ctx.fillStyle = fill || INK; pathPoly(ctx, p); ctx.fill();
}
function flower(ctx, x, y, r, rot) { // five-petal flower, shoujo background motif
  for (let i = 0; i < 5; i++) { const a = rot + i * TAU / 5; shape(ctx, ellipsePts(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5, r * 0.36, a, 14), { w: Math.max(1, r * 0.1), vary: 0.5, seed: i }); }
  ctx.fillStyle = INK; pathPoly(ctx, ellipsePts(x, y, r * 0.2, r * 0.2, 0, 12)); ctx.fill();
  ctx.fillStyle = PAPER; pathPoly(ctx, ellipsePts(x - r * 0.05, y - r * 0.06, r * 0.05, r * 0.05, 0, 8)); ctx.fill();
}
function burstPts(cx, cy, rx, ry, n, seed, depth) {
  const rn = mulberry(seed || 1), p = [];
  for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, out = i % 2 === 0, r = out ? 1 : 1 - (depth || 0.22) * (0.7 + 0.6 * rn()); p.push([cx + Math.cos(a) * rx * r * (out ? 0.95 + 0.1 * rn() : 1), cy + Math.sin(a) * ry * r * (out ? 0.95 + 0.1 * rn() : 1)]); }
  return p;
}

// ---------- text ----------
const FONT_BODY = '700 {S}px "Noto Sans SC", "PingFang SC", sans-serif';
const FONT_SFX = '400 {S}px "ZCOOL QingKe HuangYou", "Noto Sans SC", sans-serif';
const FONT_HEAVY = '900 {S}px "Noto Sans SC", sans-serif';
const fnt = (f, s) => f.replace('{S}', s.toFixed(1));
const PUNCT_SHIFT = { '，': 1, '。': 1, '、': 1, ',': 1, '.': 1 };
const PUNCT_ROT = { '…': 1, '—': 1, '～': 1, '-': 1 };
function measureV(str, fs, lh) {
  const cols = str.split('\n'); lh = lh || 1.2; return { w: cols.length * fs * lh, h: Math.max(...cols.map(c => [...c].length)) * fs * 1.02, cols };
}
// vertical lettering, columns run right to left, characters top to bottom
function vtext(ctx, str, cx, cy, fs, o) {
  o = o || {}; const m = measureV(str, fs, o.lh), lh = o.lh || 1.2, font = o.font || FONT_BODY;
  ctx.save(); ctx.fillStyle = o.color || INK; ctx.font = fnt(font, fs); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  m.cols.forEach((col, ci) => {
    const x = cx + (m.cols.length - 1) / 2 * fs * lh - ci * fs * lh; const chars = [...col], y0 = cy - chars.length * fs * 1.02 / 2;
    chars.forEach((ch, ri) => {
      const y = y0 + (ri + 0.5) * fs * 1.02;
      ctx.save();
      if (PUNCT_SHIFT[ch]) ctx.translate(x + fs * 0.55, y - fs * 0.5); else if (PUNCT_ROT[ch]) { ctx.translate(x, y); ctx.rotate(Math.PI / 2); } else ctx.translate(x, y);
      ctx.fillText(ch, 0, 0); ctx.restore();
    });
  });
  ctx.restore(); return m;
}
function textBoxes(list) { G.__texts = list; }

// Speech balloon with vertical text. o: {x,y,text,fs,kind:'oval'|'burst'|'box'|'cloud', tail:[x,y]|null, lw, seed}
function balloon(ctx, o) {
  const fs = o.fs || 22, m = measureV(o.text, fs, o.lh), lw = o.lw || 2.6, kind = o.kind || 'oval';
  const rx = (m.w / 2) * 1.32 + fs * 0.42, ry = (m.h / 2) * 1.32 + fs * 0.42, x = o.x, y = o.y;
  let outline;
  if (kind === 'box') { const hw = m.w / 2 + fs * 0.4, hh = m.h / 2 + fs * 0.4; outline = [[x - hw, y - hh], [x + hw, y - hh], [x + hw, y + hh], [x - hw, y + hh]]; }
  else if (kind === 'burst') outline = burstPts(x, y, rx * 1.15, ry * 1.1, o.spikes || 11, o.seed || 2, 0.2);
  else {
    outline = ellipsePts(x, y, rx, ry, 0, 64);
    if (o.tail) { // open the ellipse where the tail attaches and insert the tip
      const ta = Math.atan2((o.tail[1] - y) / ry, (o.tail[0] - x) / rx), d = 0.2, pts = [];
      for (let i = 0; i < 64; i++) { const a = i / 64 * TAU; let da = ((a - ta + Math.PI * 3) % TAU) - Math.PI; if (Math.abs(da) < d) { if (!pts.some(q => q.tip) && da >= 0) { pts.push(Object.assign([o.tail[0], o.tail[1]], { tip: true })); } continue; } pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); }
      outline = pts;
    }
  }
  if (kind === 'burst' && o.tail) outline.push([o.tail[0], o.tail[1]]);
  const white = o.fill || PAPER; ctx.fillStyle = white; pathPoly(ctx, outline); ctx.fill();
  const sharp = kind !== 'oval' || !!o.tail;
  pen(ctx, outline, { w: lw, closed: true, sharp: true, step: 99, vary: 0.35, seed: 9 });
  vtext(ctx, o.text, x, y, fs, { lh: o.lh });
  if (G.__rec) G.__rec.push({ id: o.text + Math.round(x), text: o.text.replace(/\n/g, ''), x0: x - m.w / 2, y0: y - m.h / 2, x1: x + m.w / 2, y1: y + m.h / 2 });
  return { x0: x - rx, y0: y - ry, x1: x + rx, y1: y + ry, text: o.text };
}
// Narration box: square-cornered, thin line
function narration(ctx, o) { return balloon(ctx, Object.assign({}, o, { kind: 'box', tail: null, lw: o.lw || 2.2 })); }

// Sound-effect lettering drawn into the art. o: {ang, skew, sp, rim, style:'solid'|'hollow', sx, arc, seed, vertical, trail}
function sfx(ctx, str, x, y, size, o) {
  o = o || {}; const chars = [...str], rn = mulberry(o.seed || 11), ang = (o.ang || 0) * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang);
  const sp = (o.sp == null ? 0.92 : o.sp) * size, rim = (o.rim == null ? 0.16 : o.rim) * size, vert = !!o.vertical;
  const total = (chars.length - 1) * sp; ctx.save(); ctx.lineJoin = 'round'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.miterLimit = 2;
  const pos = chars.map((ch, i) => {
    const t = chars.length > 1 ? i / (chars.length - 1) - 0.5 : 0, s = size * (1 + (rn() - 0.5) * 0.22) * (o.grow ? 1 + o.grow * t : 1);
    const along = t * total, off = (o.arc || 0) * (t * t - 0.08) * size + (rn() - 0.5) * size * 0.05;
    const px = vert ? x + off * ca : x + ca * along - sa * off, py = vert ? y + along : y + sa * along + ca * off;
    return { ch, px, py, s, r: ang + (rn() - 0.5) * 0.16 + (o.fan || 0) * t };
  });
  const draw = (mode) => pos.forEach(q => {
    ctx.save(); ctx.translate(q.px, q.py); ctx.rotate(q.r); ctx.transform(o.sx || 1, 0, o.skew == null ? -0.18 : o.skew, 1, 0, 0);
    ctx.font = fnt(o.font || FONT_SFX, q.s);
    if (mode === 'rim') { ctx.strokeStyle = o.inv ? INK : PAPER; ctx.lineWidth = rim * 2; ctx.strokeText(q.ch, 0, 0); }
    else if (mode === 'solid') { ctx.fillStyle = o.inv ? PAPER : INK; ctx.fillText(q.ch, 0, 0); }
    else if (mode === 'outline') { ctx.strokeStyle = INK; ctx.lineWidth = size * 0.1; ctx.strokeText(q.ch, 0, 0); }
    else if (mode === 'hollow') { ctx.fillStyle = PAPER; ctx.fillText(q.ch, 0, 0); }
    ctx.restore();
  });
  if (o.style === 'hollow') { draw('rim'); draw('outline'); draw('hollow'); }
  else { draw('rim'); draw('solid'); }
  if (o.trail) { // speed streaks behind the word
    const d = o.trail, tx = Math.cos(d.ang * Math.PI / 180), ty = Math.sin(d.ang * Math.PI / 180); ctx.fillStyle = INK; ctx.beginPath();
    for (let i = 0; i < (d.n || 5); i++) { const off = ((i / ((d.n || 5) - 1)) - 0.5) * size * 1.1, bx = x + (-ty) * off + tx * (-total / 2 - size * 0.7), by = y + tx * off + ty * (-total / 2 - size * 0.7), len = size * (0.8 + rn() * 1.6); ctx.moveTo(bx, by); ctx.lineTo(bx + tx * len * 0.5 - ty * 1.2, by + ty * len * 0.5 + tx * 1.2); ctx.lineTo(bx + tx * len, by + ty * len); ctx.lineTo(bx + tx * len * 0.5 + ty * 1.2, by + ty * len * 0.5 - tx * 1.2); ctx.closePath(); }
    ctx.fill();
  }
  ctx.restore();
}

G.MG = { PS: 0.8, TAU, INK, PAPER, clamp, lerp, ss, seg, mulberry, hash2, vn, VIEW, LS, smoothPts, polyline, area, bounds, ellipsePts, pathPoly, pen, shape, ruler, tone, gradLin, gradRad, focusLines, speedLines, sweat, sparkle, flower, burstPts, vtext, measureV, balloon, narration, sfx, FONT_BODY, FONT_SFX, FONT_HEAVY };
})(window);
