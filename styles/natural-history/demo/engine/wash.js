// wash.js: the watercolour engine. A part (polygons + a tone field) becomes a transparent pigment layer
// with: pooled edges (darker, more saturated at the boundary), a graded tone, low-frequency density drift,
// blooms with hard rims (back-runs), pigment granulation settling into the paper, and a small misregistration
// against the ink. Layers are composited with 'multiply', so the paper and the ink show through.
import { Noise, clamp, lerp, bboxOf, makeCanvas, pathPoly, rgb, mixc, mulberry } from './util.js';

// Part: { id, polys:[pts...], cut:[pts...], lo:'#hex' (thin wash), hi:'#hex' (deep pigment), k: strength,
//         tone:(x,y)=>0..1, edge: px width of the pooled edge, edgeK, gran, bloom, spill, dx, dy, seed }
export function part(o) {
  return Object.assign({ cut: [], clip: [], lo: '#d8c9a0', hi: '#7a5a30', k: .62, tone: () => .5, edge: 4.5, edgeK: .42, gran: .55, bloom: .6, drift: 1, spill: 1.2, dx: 1.4, dy: 1.0, seed: 1 }, o);
}

function boxBlur(src, w, h, r) {
  r = Math.max(1, Math.round(r));
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), d = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    let s = 0; const o = y * w;
    for (let x = -r; x <= r; x++) s += src[o + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[o + x] = s * d;
      s += src[o + Math.min(w - 1, x + r + 1)] - src[o + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s * d;
      s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export function washPart(p, S) {
  const PAD = 12, bb = bboxOf(p.polys);
  const x0 = Math.floor(bb.x0 - PAD), y0 = Math.floor(bb.y0 - PAD);
  const w = Math.ceil((bb.x1 + PAD - x0) * S), h = Math.ceil((bb.y1 + PAD - y0) * S);
  const mc = makeCanvas(w, h), m = mc.getContext('2d', { willReadFrequently: true });
  m.setTransform(S, 0, 0, S, -x0 * S, -y0 * S);
  m.save(); m.translate(p.dx, p.dy);
  m.fillStyle = m.strokeStyle = '#000'; m.lineJoin = 'round'; m.lineWidth = p.spill;
  m.beginPath(); for (const pl of p.polys) pathPoly(m, pl); m.fill();
  if (p.spill > 0) { m.stroke(); }
  m.restore();
  if (p.cut.length) { m.globalCompositeOperation = 'destination-out'; m.beginPath(); for (const pl of p.cut) pathPoly(m, pl); m.fill(); }
  if (p.clip.length) { m.globalCompositeOperation = 'destination-in'; m.beginPath(); for (const pl of p.clip) pathPoly(m, pl); m.fill(); }
  const id = m.getImageData(0, 0, w, h).data, M = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) M[i] = id[i * 4 + 3] / 255;
  let B = boxBlur(M, w, h, p.edge * S * .6); B = boxBlur(B, w, h, p.edge * S * .6); B = boxBlur(B, w, h, p.edge * S * .6);
  const nz = Noise(p.seed * 7 + 3), nb = Noise(p.seed * 13 + 5), ng = Noise(p.seed * 29 + 1);
  const lo = rgb(p.lo), hi = rgb(p.hi);
  const out = m.createImageData(w, h), o = out.data;
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const i = py * w + px, Mi = M[i];
    if (Mi < .004) continue;
    const x = x0 + px / S - p.dx * 0, y = y0 + py / S;
    const tone = clamp(p.tone(x - p.dx, y - p.dy));
    const E = clamp((1 - B[i]) * 1.55 - .12) * Mi;
    const d = nz.fbm(x * .011, y * .011, 3);
    const bn = nb.fbm(x * .017 + 11, y * .017, 2);
    const gr = .5 * ng(x * 1.15, y * 1.15) + .3 * ng(x * .45 + 40, y * .22) + .2 * ng(x * 2.4, y * 2.4);
    let a = p.k * (.42 + .75 * tone) * ((1 - .38 * p.drift) + .8 * p.drift * d);
    a += p.edgeK * E * (.55 + .6 * tone);
    // blooms (back-runs): lighter patch with a darker hard rim
    const bl = ss(.61, .635, bn) * p.bloom, rim = Math.exp(-Math.pow((bn - .622) / .012, 2)) * p.bloom;
    a *= 1 - .42 * bl; a += .1 * rim;
    // granulation: pigment collects in paper valleys
    a *= 1 + p.gran * (.55 - gr) * 1.25;
    a = clamp(a, 0, .93) * Mi;
    const tc = clamp(.15 + .6 * tone + .55 * E + .45 * (d - .45) + .15 * rim);
    const c = mixc(lo, hi, tc), k = i * 4;
    o[k] = c[0]; o[k + 1] = c[1]; o[k + 2] = c[2]; o[k + 3] = a * 255;
  }
  const cv = makeCanvas(w, h); cv.getContext('2d').putImageData(out, 0, 0);
  return { canvas: cv, x0, y0, S };
}

// Compose parts of a specimen into one layer. Returns {canvas, x0, y0, S, w, h} in world units.
export function washSpecimen(parts, S) {
  const layers = parts.map(p => washPart(p, S));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const l of layers) { x0 = Math.min(x0, l.x0); y0 = Math.min(y0, l.y0); x1 = Math.max(x1, l.x0 + l.canvas.width / S); y1 = Math.max(y1, l.y0 + l.canvas.height / S); }
  const cv = makeCanvas((x1 - x0) * S, (y1 - y0) * S), c = cv.getContext('2d');
  c.globalCompositeOperation = 'multiply';
  for (const l of layers) c.drawImage(l.canvas, (l.x0 - x0) * S, (l.y0 - y0) * S);
  return { canvas: cv, x0, y0, S, w: cv.width / S, h: cv.height / S };
}

// Reveal a wash like a loaded brush spreading: blob grows from (sx,sy); the leading edge is darker (wet edge).
// Returns a canvas of the same size holding the revealed part.
export function revealWash(layer, p, sx, sy, R, seedn = 1) {
  const { canvas: src, x0, y0, S } = layer, w = src.width, h = src.height;
  const cv = makeCanvas(w, h), c = cv.getContext('2d');
  if (p <= 0) return cv;
  if (p >= 1) { c.drawImage(src, 0, 0); return cv; }
  const nz = Noise(seedn * 3 + 9), r = R * p * 1.08, N = 90;
  const blob = k => {
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2, rr = r * (.72 + .5 * nz.fbm(Math.cos(a) * 1.6 + 4 + k, Math.sin(a) * 1.6 + 4, 3));
      pts.push({ x: (sx - x0 + Math.cos(a) * rr) * S, y: (sy - y0 + Math.sin(a) * rr) * S });
    }
    return pts;
  };
  const mk = makeCanvas(w, h), mc = mk.getContext('2d');
  mc.fillStyle = '#000'; mc.beginPath(); const b = blob(0); mc.moveTo(b[0].x, b[0].y); for (const q of b) mc.lineTo(q.x, q.y); mc.closePath(); mc.fill();
  c.drawImage(src, 0, 0);
  c.globalCompositeOperation = 'destination-in'; c.drawImage(mk, 0, 0);
  // wet rim: the same pigment again, only along the blob edge
  const rimc = makeCanvas(w, h), rc = rimc.getContext('2d');
  rc.lineWidth = 7 * S; rc.strokeStyle = '#000'; rc.filter = `blur(${2.2 * S}px)`; rc.beginPath(); rc.moveTo(b[0].x, b[0].y); for (const q of b) rc.lineTo(q.x, q.y); rc.closePath(); rc.stroke();
  rc.filter = 'none'; rc.globalCompositeOperation = 'source-in'; rc.drawImage(src, 0, 0);
  c.globalCompositeOperation = 'multiply'; c.globalAlpha = .55 * Math.min(1, (1 - p) * 4); c.drawImage(rimc, 0, 0);
  return cv;
}
