// ink.js: the hand-inked toolbox. Outlines boil (re-jitter) on every drawing; speed and focus lines, flames, cracks, dust, debris.
import { hash, vnoise, clamp, lerp, seg, ss, eio, eo, ei, back, mulberry } from '/core/lib.js';
export const INK = '#0d0b16';
export const S = { boil: 0 };        // S.boil changes every 2 frames (ink boil); set by main.js
export let c = null;
export const use = ctx => { c = ctx; };
export const jit = (k, a = 1) => (hash(S.boil * 13.7 + k * 3.13) - .5) * 2 * a;

// ---------------------------------------------------------------- paths
export function trace(P, close = true, smooth = true) {
  const n = P.length;
  if (!smooth) { c.moveTo(P[0][0], P[0][1]); for (let i = 1; i < n; i++) c.lineTo(P[i][0], P[i][1]); if (close) c.closePath(); return; }
  if (close) {
    const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const s = m(P[n - 1], P[0]); c.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) { const q = P[i], e = m(P[i], P[(i + 1) % n]); c.quadraticCurveTo(q[0], q[1], e[0], e[1]); }
    c.closePath();
  } else {
    c.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < n - 1; i++) { const q = P[i], e = [(P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2]; c.quadraticCurveTo(q[0], q[1], e[0], e[1]); }
    c.lineTo(P[n - 1][0], P[n - 1][1]);
  }
}
// a filled, outlined shape. outline is thick on the lower-right (shadow) side, thin on the lit side
export function shape(pts, o = {}) {
  const { fill = null, lw = 7, smooth = true, id = 0, line = INK, close = true, amp = 1.1 } = o;
  const P = pts.map((p, i) => [p[0] + jit(id * 37 + i * 2, amp), p[1] + jit(id * 37 + i * 2 + 1, amp)]);
  c.beginPath(); trace(P, close, smooth);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (lw) {
    c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = line;
    c.lineWidth = lw * .75; c.stroke();
    c.save(); c.translate(lw * .16, lw * .24); c.lineWidth = lw * .55; c.stroke(); c.restore();
  }
}
export function ink(pts, w = 6, o = {}) {   // a line with a tapered end (open path)
  const { col = INK, id = 0, smooth = true, amp = .9 } = o;
  const P = pts.map((p, i) => [p[0] + jit(id * 41 + i * 2, amp), p[1] + jit(id * 41 + i * 2 + 1, amp)]);
  c.beginPath(); trace(P, false, smooth); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
// a filled tapered stroke along a centre line (hair, brows, eyelids, flames)
export function taper(pts, w0, w1, fill = INK, o = {}) {
  const { id = 0, mid = 1, smooth = true, pow = 1 } = o;
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const u = i / (n - 1), w = lerp(w0, w1, Math.pow(u, pow)) * (mid === 1 ? 1 : (1 - mid) + mid * Math.sin(Math.PI * u) ** .6) / 2;
    const jx = jit(id * 53 + i * 2, .7), jy = jit(id * 53 + i * 2 + 1, .7);
    L.push([pts[i][0] - dy * w + jx, pts[i][1] + dx * w + jy]); R.push([pts[i][0] + dy * w + jx, pts[i][1] - dx * w + jy]);
  }
  c.beginPath(); trace(L.concat(R.reverse()), true, smooth); c.fillStyle = fill; c.fill();
}
// a limb / tube along a centre line with widths; outlined as one shape
export function tube(pts, widths, o = {}) {
  const { fill = '#fff', lw = 7, id = 0, shade = null, shadeSide = 1 } = o;
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const w = widths[i] / 2;
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  const cap = (p, q, w) => { const dx = p[0] - q[0], dy = p[1] - q[1], l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * w * .9, p[1] + dy / l * w * .9]; };
  const poly = [cap(pts[0], pts[1], widths[0] / 2), ...L, cap(pts[n - 1], pts[n - 2], widths[n - 1] / 2), ...R.reverse()];
  shape(poly, { fill, lw, id, smooth: true });
  if (shade) {   // hard shadow strip along one side
    c.save(); c.beginPath(); trace(poly, true, true); c.clip();
    const S2 = shadeSide > 0 ? R : L; const S3 = pts.map((p, i) => { const w = widths[i] / 2 * .38; const q = S2[shadeSide > 0 ? n - 1 - i : i]; return [lerp(p[0], q[0], .35 + .0 * w), lerp(p[1], q[1], .35)]; });
    c.beginPath(); trace(S3.concat(S2.slice().reverse()), true, false); c.fillStyle = shade; c.fill(); c.restore();
  }
}

// ---------------------------------------------------------------- the lines of motion
// focus lines (集中线): thick at the rim, tapering inward to a ring
export function focusLines(cx, cy, o = {}) {
  const { n = 110, rIn = 380, rOut = 1500, col = INK, seed = 0, wmin = .004, wmax = .022, inJit = .35 } = o;
  const R = mulberry(1000 + seed * 7 + S.boil * 131);
  c.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const th = (i + R() * .9) / n * Math.PI * 2, dw = lerp(wmin, wmax, R() ** 1.6), r0 = rIn * (1 + R() * inJit);
    c.beginPath(); c.moveTo(cx + Math.cos(th) * r0, cy + Math.sin(th) * r0);
    c.lineTo(cx + Math.cos(th - dw) * rOut, cy + Math.sin(th - dw) * rOut); c.lineTo(cx + Math.cos(th + dw) * rOut, cy + Math.sin(th + dw) * rOut); c.closePath(); c.fill();
  }
}
// parallel speed lines across the frame at an angle
export function speedLines(o = {}) {
  const { ang = 0, n = 60, col = '#fff', seed = 0, len0 = 300, len1 = 1100, w0 = 1.5, w1 = 7, alpha = 1, cx = 960, cy = 540, span = 1500 } = o;
  const R = mulberry(2000 + seed * 11 + S.boil * 97), ca = Math.cos(ang), sa = Math.sin(ang);
  c.save(); c.globalAlpha = alpha; c.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const off = (R() - .5) * span * 1.4, a0 = (R() - .5) * 2200, len = lerp(len0, len1, R() ** 1.4), w = lerp(w0, w1, R() ** 2);
    const px = cx + ca * a0 - sa * off, py = cy + sa * a0 + ca * off;
    const hx = px + ca * len, hy = py + sa * len, nx = -sa * w / 2, ny = ca * w / 2;
    c.beginPath(); c.moveTo(px, py); c.lineTo(hx + nx, hy + ny); c.lineTo(hx - nx, hy - ny); c.closePath(); c.fill();
  }
  c.restore();
}
// jagged burst (explosion star)
export function burst(cx, cy, r1, r2, spikes, o = {}) {
  const { fill = '#fff', lw = 9, seed = 0, rot = 0 } = o, R = mulberry(300 + seed * 5 + S.boil * 17), P = [];
  for (let i = 0; i < spikes * 2; i++) { const a = rot + i / (spikes * 2) * Math.PI * 2, r = i % 2 ? r1 * (.85 + R() * .3) : r2 * (.75 + R() * .45); P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  shape(P, { fill, lw, smooth: false, amp: 1.4, id: seed });
}
// stacked flame shapes around an arch (the aura). a: 0..1 size of tongues
export function aura(cx, by, rx, ry, a, cols, o = {}) {
  const { seed = 0, up = 1, tongues = 15, tq = 12, t = 0, lw = 6, hollow = false } = o;
  const tk = Math.floor(t * tq);
  cols.forEach((col, L) => {
    const sc = 1 - L * .2, P = [], N = tongues * 2;
    for (let i = 0; i <= N; i++) {
      const u = i / N, th = Math.PI * (1 - u);                      // left base -> over the top -> right base
      const peak = i % 2 === 1;
      const nz = hash(tk * 3.3 + i * 1.9 + L * 7.1 + seed * 13), tl = peak ? (.28 + .72 * nz) * a * (1 - L * .12) : .05 * a;
      const rr = 1 + tl * .65, dirx = Math.cos(th), diry = -Math.sin(th);
      const bx = cx + dirx * rx * sc * rr * (1 + .0), by2 = by + diry * ry * sc * rr;
      const lift = peak ? tl * ry * .55 * up : 0;
      P.push([bx, by2 - lift * Math.sin(th) * .9]);
    }
    P.unshift([cx - rx * sc * 1.08, by + 16]); P.push([cx + rx * sc * 1.08, by + 16]);
    shape(P, { fill: col, lw: L === 0 ? lw : 0, smooth: false, amp: 2.2, id: seed * 9 + L });
  });
}
// cracks growing from a point on a floor plane (y squashed by k). g: 0..1 growth. Jagged fissures, wide at the root, tapering.
export function cracks(ox, oy, g, o = {}) {
  const { seed = 3, len = 900, k = .42, col = INK, hi = '#fff', lw = 9, n = 9, a0 = 0, a1 = Math.PI * 2, floor = false } = o;
  if (g <= 0) return;
  const R = mulberry(seed * 977), list = [];
  function walk(x, y, ang, L, w, depth) {
    const pts = [[x, y]]; let px = x, py = y, a = ang; const steps = 5 + Math.floor(R() * 4);
    for (let i = 0; i < steps; i++) { a += (R() < .5 ? -1 : 1) * (.25 + R() * .55); const l = L / steps * (.55 + R() * .9); px += Math.cos(a) * l; py += Math.sin(a) * l * k; if (floor) py = Math.max(py, oy + 6 + (px - ox) * 0); pts.push([px, py]);
      if (depth < 1 && i > 0 && i < steps - 1 && R() < .4) walk(px, py, a + (R() < .5 ? -1 : 1) * (.6 + R() * .5), L * (.3 + R() * .2), w * .55, depth + 1); }
    list.push({ pts, w, d: depth });
  }
  for (let i = 0; i < n; i++) walk(ox, oy, a0 + (a1 - a0) * (i + .2 + R() * .6) / n, len * (.55 + R() * .55), lw * 2.4, 0);
  for (const s of list) {
    const segLen = []; let tot = 0; for (let i = 1; i < s.pts.length; i++) { const l = Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]); segLen.push(l); tot += l; }
    const gg = clamp(g * (1 + s.d * .15) * 1.1); if (gg <= 0) continue;
    let rem = tot * gg; const P = [s.pts[0]];
    for (let i = 1; i < s.pts.length && rem > 0; i++) { const l = segLen[i - 1]; if (rem >= l) { P.push(s.pts[i]); rem -= l; } else { const u = rem / l; P.push([lerp(s.pts[i - 1][0], s.pts[i][0], u), lerp(s.pts[i - 1][1], s.pts[i][1], u)]); rem = 0; } }
    if (P.length < 2) continue;
    // widths taper from the root to a point
    const m = P.length, tw = s.w * (1 - .0);
    const pa = P.map((p, i) => [p[0], p[1]]);
    if (hi) { c.save(); c.translate(-4, -5); taper(pa, tw * 1.35, 3, hi, { id: 800 + s.d, smooth: false, pow: .7 }); c.restore(); }
    taper(pa, tw, 2, col, { id: 810 + s.d, smooth: false, pow: .7 });
  }
}
// dust puff: a cloud of overlapping circles, one outline round the union
export function puff(x, y, r, o = {}) {
  const { fill = '#efe3cf', sh = '#cbbba2', seed = 0, lw = 6 } = o, R = mulberry(seed * 31 + 5), cs = [];
  const N = 6; for (let i = 0; i < N; i++) { const a = i / N * 6.283 + R(); cs.push([x + Math.cos(a) * r * .55 * (.6 + R() * .6), y + Math.sin(a) * r * .38 * (.6 + R() * .6), r * (.42 + R() * .22)]); }
  cs.push([x, y, r * .62]);
  c.fillStyle = INK; for (const [cx, cy, cr] of cs) { c.beginPath(); c.arc(cx, cy, cr + lw, 0, 7); c.fill(); }
  for (const [cx, cy, cr] of cs) { c.fillStyle = sh; c.beginPath(); c.arc(cx, cy, cr, 0, 7); c.fill(); c.fillStyle = fill; c.beginPath(); c.arc(cx - cr * .1, cy - cr * .16, cr * .9, 0, 7); c.fill(); }

}
// a chunk of debris (tile / splinter), flat colour with a hard shadow edge
export function chunk(x, y, s, rot, o = {}) {
  const { fill = '#d9d2c4', sh = '#9aa3a6', seed = 0 } = o, R = mulberry(seed * 53 + 9);
  c.save(); c.translate(x, y); c.rotate(rot);
  const P = []; const N = 5 + (seed % 3); for (let i = 0; i < N; i++) { const a = i / N * 6.283 + R() * .5, r = s * (.6 + R() * .6); P.push([Math.cos(a) * r, Math.sin(a) * r * .8]); }
  shape(P, { fill, lw: 5, smooth: false, id: seed });
  c.save(); c.beginPath(); trace(P, true, false); c.clip(); c.fillStyle = sh; c.fillRect(-s * 2, 0, s * 4, s * 2); c.restore(); c.restore();
}
// hatching strip (hard shadow lines)
export function hatch(x0, y0, x1, y1, step, ang, col = INK, w = 3) {
  c.save(); c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip(); c.strokeStyle = col; c.lineWidth = w;
  const d = Math.hypot(x1 - x0, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, ca = Math.cos(ang), sa = Math.sin(ang);
  for (let u = -d; u < d; u += step) { c.beginPath(); c.moveTo(cx + ca * -d - sa * u, cy + sa * -d + ca * u); c.lineTo(cx + ca * d - sa * u, cy + sa * d + ca * u); c.stroke(); }
  c.restore();
}
// screentone dots inside the current path (call after c.beginPath + trace)
let tonePat = {};
export function tone(step, r, col, ang = .6) {
  const key = step + '|' + r + '|' + col + '|' + ang;
  if (!tonePat[key]) {
    const k = document.createElement('canvas'); const sz = Math.round(step * 2); k.width = k.height = sz; const g = k.getContext('2d'); g.fillStyle = col;
    for (const [x, y] of [[0, 0], [step, 0], [0, step], [step, step], [step / 2, step / 2], [step * 1.5, step / 2], [step / 2, step * 1.5], [step * 1.5, step * 1.5]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    tonePat[key] = c.createPattern(k, 'repeat');
  }
  c.fillStyle = tonePat[key]; c.fill();
}
export const rot2 = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
