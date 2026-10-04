// Art Nouveau engine, part 1: palette, curve maths, the contour brush, flat shapes with one shade crescent,
// the whiplash curve generator, ribbons and the paper.  Everything is a pure function of its arguments (no Math.random).
import { mulberry, clamp, lerp, ss, TAU } from '/core/lib.js';

export const PAL = {
  paper: '#EBDFC1', paperLt: '#F3EAD0', ink: '#3B2515', inkSoft: '#6B4A2E',
  ochre: '#C99B3C', ochreLt: '#E5C679', ochreDk: '#9B7227',
  sage: '#9BAF84', sageLt: '#BECB9F', sageDk: '#76895F', olive: '#5F6E42', oliveDk: '#46512F',
  rose: '#D9A59C', roseLt: '#EBC9BC', roseDk: '#B97F78',
  lilac: '#A7A0CE', lilacLt: '#C7C1E3', violet: '#716AA9', violetDk: '#544D8A',
  teal: '#8DB2A4', tealDk: '#5F8C80', tealLt: '#B3CFC1', slate: '#7E94A0',
  skin: '#F0D1B1', skinSh: '#E2B692', hair: '#9A5530', hairDk: '#683820', hairLt: '#B8733F',
  cream: '#F5ECD2', wall: '#B4C2A6', wallDk: '#9DAE90',
};
export const LIGHT = [-0.6, -0.8];   // direction towards the light: upper left, constant for the whole film

const h2 = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mix = (a, b, t) => { const A = h2(a), B = h2(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join(''); };
export const rgba = (h, a) => { const c = h2(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };

// ---------- curves ----------
export function catmull(pts, n = 10, closed = false) {
  const P = pts, N = P.length, out = [];
  const g = i => closed ? P[(i + N) % N] : P[Math.max(0, Math.min(N - 1, i))];
  const segs = closed ? N : N - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push({
        x: .5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: .5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  if (!closed) out.push({ x: P[N - 1].x, y: P[N - 1].y });
  return out;
}
export const P2 = a => a.map(p => Array.isArray(p) ? { x: p[0], y: p[1] } : p);
export function resample(pts, step = 2.5, closed = false) {
  const Q = closed ? pts.concat([pts[0]]) : pts, out = [{ x: Q[0].x, y: Q[0].y }];
  let carry = 0;
  for (let i = 1; i < Q.length; i++) {
    let ax = Q[i - 1].x, ay = Q[i - 1].y; const bx = Q[i].x, by = Q[i].y;
    let d = Math.hypot(bx - ax, by - ay);
    while (carry + d >= step) {
      const k = (step - carry) / d; ax += (bx - ax) * k; ay += (by - ay) * k; d = Math.hypot(bx - ax, by - ay);
      out.push({ x: ax, y: ay }); carry = 0;
    }
    carry += d;
  }
  if (!closed) out.push({ x: Q[Q.length - 1].x, y: Q[Q.length - 1].y });
  return out;
}
export const area = P => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p.x * q.y - q.x * p.y; } return a / 2; };
export const circlePts = (cx, cy, r, n = 64, a0 = 0) => Array.from({ length: n }, (_, i) => ({ x: cx + Math.cos(a0 + i / n * TAU) * r, y: cy + Math.sin(a0 + i / n * TAU) * r }));

// ---------- the contour brush ----------
// A ribbon of varying width along a polyline.  On a closed shape the line is thicker on the side away from the light
// (k), on an open stroke it swells in the middle and tapers at both ends.
export function inkLine(ctx, pts, o = {}) {
  const { w = 3, t0 = .12, t1 = .2, tmin = .15, col = PAL.ink, k = 0, closed = false, wf = null, swell = 0, step = 2.2, cap = true, alpha = 1 } = o;
  if (!pts || pts.length < 2) return;
  const P = resample(pts, step, closed), n = P.length; if (n < 3) return;
  const cum = [0]; for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y));
  const tot = cum[n - 1] || 1, sgn = closed ? (area(P) > 0 ? 1 : -1) : 1;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = P[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = P[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let tx = b.x - a.x, ty = b.y - a.y; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
    const nx = ty, ny = -tx;                                  // left normal (y down)
    const u = cum[i] / tot;
    let hw = w / 2;
    if (!closed) { const tp = Math.min(t0 > 0 ? ss(u / t0) : 1, t1 > 0 ? ss((1 - u) / t1) : 1); hw *= tmin + (1 - tmin) * tp; if (swell) hw *= 1 + swell * Math.sin(Math.PI * u); }
    if (k) { const ox = nx * sgn, oy = ny * sgn; hw *= 1 + k * (-(ox * LIGHT[0] + oy * LIGHT[1])); }
    if (wf) hw *= wf(u, i);
    L.push([P[i].x + nx * hw, P[i].y + ny * hw]); R.push([P[i].x - nx * hw, P[i].y - ny * hw]);
  }
  ctx.save(); ctx.fillStyle = col; ctx.globalAlpha *= alpha; ctx.beginPath();
  if (closed) {
    ctx.moveTo(L[0][0], L[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]); ctx.closePath();
    ctx.moveTo(R[0][0], R[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(R[i][0], R[i][1]); ctx.closePath();
    ctx.fill('evenodd');
  } else {
    ctx.moveTo(L[0][0], L[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]); ctx.closePath(); ctx.fill();
    if (cap) for (const j of [0, n - 1]) { const hw = Math.hypot(L[j][0] - R[j][0], L[j][1] - R[j][1]) / 2; if (hw > .5) { ctx.beginPath(); ctx.arc(P[j].x, P[j].y, hw, 0, TAU); ctx.fill(); } }
  }
  ctx.restore();
}
export const polyPath = (ctx, P, close = true) => { ctx.beginPath(); ctx.moveTo(P[0].x, P[0].y); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i].x, P[i].y); if (close) ctx.closePath(); };

// A flat colour shape: fill, one flat shade crescent on the side away from the light, then the contour.
export function shape(ctx, P, o = {}) {
  const { fill = PAL.cream, shade = null, sd = 6, hi = null, ink = 3, k = .8, lineCol = PAL.ink, noInk = false, alpha = 1 } = o;
  ctx.save(); ctx.globalAlpha *= alpha;
  if (fill) { ctx.fillStyle = fill; polyPath(ctx, P); ctx.fill(); }
  const sx = -LIGHT[0] * sd, sy = -LIGHT[1] * sd;
  if (shade || hi) {
    ctx.save(); polyPath(ctx, P); ctx.clip();
    if (shade) { ctx.fillStyle = shade; ctx.beginPath(); ctx.rect(-1e4, -1e4, 2e4, 2e4); ctx.moveTo(P[0].x - sx, P[0].y - sy); for (const p of P) ctx.lineTo(p.x - sx, p.y - sy); ctx.closePath(); ctx.fill('evenodd'); }
    if (hi) { ctx.fillStyle = hi; ctx.beginPath(); ctx.rect(-1e4, -1e4, 2e4, 2e4); ctx.moveTo(P[0].x + sx * .8, P[0].y + sy * .8); for (const p of P) ctx.lineTo(p.x + sx * .8, p.y + sy * .8); ctx.closePath(); ctx.fill('evenodd'); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  }
  ctx.restore();
  if (!noInk && ink > 0) inkLine(ctx, P, { w: ink, k, closed: true, col: lineCol, alpha });
}

// ---------- ribbons ----------
export function ribbonPoly(S, wfn) {   // S: samples with {x,y,th,u}; wfn(u) = full width
  const L = [], R = [];
  for (const p of S) { const h = wfn(p.u, p) / 2, nx = Math.sin(p.th), ny = -Math.cos(p.th); L.push({ x: p.x + nx * h, y: p.y + ny * h }); R.push({ x: p.x - nx * h, y: p.y - ny * h }); }
  return { L, R, poly: L.concat(R.slice().reverse()) };
}

// ---------- the whiplash curve ----------
// Heading is a smooth function of arc length: a slow wave, a drift, and a final clothoid curl.  `g` (0..1) grows it from
// the base; the growing end carries a fiddlehead curl that unwinds as the growth completes.
export function whip(x, y, ang, len, o = {}) {
  const { wave = .5, freq = 1, phase = 0, bias = 0, curl = 0, curlLen = .3, dir = 1, g = 1, tipTurns = .85, tipLen = .16, step = 3 } = o;
  const gg = clamp(g); if (gg <= 0.001) return [];
  const n = Math.max(3, Math.ceil(len * gg / step)), ds = len / Math.max(1, Math.ceil(len / step));
  const out = []; let px = x, py = y, s = 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n * gg;
    let th = ang + wave * Math.sin(freq * TAU * u + phase) + bias * u;
    if (curl && u > 1 - curlLen) th += dir * curl * TAU * Math.pow((u - (1 - curlLen)) / curlLen, 2);
    if (gg < 1 && tipTurns) { const a = (u - (gg - tipLen)) / tipLen; if (a > 0) th += dir * tipTurns * TAU * Math.pow(ss(a), 2) * (1 - ss(gg)); }
    out.push({ x: px, y: py, th, u, s });
    const d = ds; px += Math.cos(th) * d; py += Math.sin(th) * d; s += d;
  }
  return out;
}
export const at = (S, u) => { const i = Math.max(0, Math.min(S.length - 1, Math.round(u / Math.max(1e-6, S[S.length - 1].u) * (S.length - 1)))); return S[i]; };

// ---------- paper ----------
function pnoise(seed, per) {                       // periodic value noise, so the tile is seamless
  const r = mulberry(seed), G = new Float32Array(per * per).map(() => r());
  return (x, y) => { x = (x % per + per) % per; y = (y % per + per) % per; const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = G[yi % per * per + xi % per], b = G[yi % per * per + (xi + 1) % per], c = G[(yi + 1) % per * per + xi % per], d = G[(yi + 1) % per * per + (xi + 1) % per];
    return lerp(lerp(a, b, u), lerp(c, d, u), v); };
}
let _paper = null;
export function paperTile(N = 640) {
  if (_paper) return _paper;
  const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
  const n1 = pnoise(11, 5), n2 = pnoise(23, 40), n3 = pnoise(37, 160);
  const im = x.createImageData(N, N), r = mulberry(5);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const b = n1(i / N * 5, j / N * 5), m = n2(i / N * 40, j / N * 40), f = n3(i / N * 160, j / N * 160);
    let v = 0.955 + (b - .5) * .05 + (m - .5) * .035 + (f - .5) * .045 + (r() - .5) * .03;
    const k = i + j * N; im.data[k * 4] = 255 * v; im.data[k * 4 + 1] = 252 * v; im.data[k * 4 + 2] = 244 * v; im.data[k * 4 + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  x.globalAlpha = .07; x.strokeStyle = '#6a4a28'; x.lineWidth = 1;          // long paper fibres
  for (let i = 0; i < 260; i++) {
    const px = r() * N, py = r() * N, a = r() * TAU, l = 8 + r() * 26;
    for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) { x.beginPath(); x.moveTo(px + ox, py + oy); x.quadraticCurveTo(px + ox + Math.cos(a) * l * .5 + r() * 4, py + oy + Math.sin(a) * l * .5 + r() * 4, px + ox + Math.cos(a) * l, py + oy + Math.sin(a) * l); x.stroke(); }
  }
  return _paper = c;
}
// Paper grain is world-anchored (it moves with the camera), the age toning at the corners is screen space.
export function paperOverlay(ctx, W, H, cam = { cx: W / 2, cy: H / 2, z: 1 }, o = {}) {
  const { amount = 1, edge = .16 } = o;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const pat = ctx.createPattern(paperTile(), 'repeat');
  pat.setTransform(new DOMMatrix().translate(W / 2 - cam.cx * cam.z, H / 2 - cam.cy * cam.z).scale(cam.z * 1.0));
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = amount; ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.02);
  g.addColorStop(0, 'rgba(120,80,30,0)'); g.addColorStop(1, `rgba(120,80,30,${edge})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
