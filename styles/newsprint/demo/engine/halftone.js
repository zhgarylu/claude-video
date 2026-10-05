// Invented photographs, painted in code as grey-scale, then printed as a 45-degree halftone screen of round dots.
// A photograph "develops" (dots grow, darkest first) and can "morph" into another (dots swell or shrink in place).
import { clamp, ss, mulberry, hash } from '/core/lib.js';

const GW = 420, GH = 215;
function canvas() { const c = document.createElement('canvas'); c.width = GW; c.height = GH; return c; }
const g255 = l => { const v = Math.round(clamp(l) * 255); return `rgb(${v},${v},${v})`; };
const ga = (l, a) => { const v = Math.round(clamp(l) * 255); return `rgba(${v},${v},${v},${a})`; };

function blob(g, x, y, r, l, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, ga(l, a)); gr.addColorStop(0.55, ga(l, a * 0.6)); gr.addColorStop(1, ga(l, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
function grain(g, rnd, amt) { const id = g.getImageData(0, 0, GW, GH), d = id.data; for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * amt * 255; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(id, 0, 0); }
function vignette(g, k) { const gr = g.createRadialGradient(GW / 2, GH / 2, GH * 0.35, GW / 2, GH / 2, GW * 0.62); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${k})`); g.fillStyle = gr; g.fillRect(0, 0, GW, GH); }

function person(g, x, base, h, l, loaf) {
  g.fillStyle = g255(l);
  g.beginPath(); g.arc(x, base - h * 0.88, h * 0.075, 0, 7); g.fill();               // head
  g.beginPath(); g.moveTo(x - h * 0.1, base - h * 0.8); g.lineTo(x + h * 0.1, base - h * 0.8); g.lineTo(x + h * 0.14, base - h * 0.3); g.lineTo(x + h * 0.11, base); g.lineTo(x - h * 0.11, base); g.lineTo(x - h * 0.14, base - h * 0.3); g.closePath(); g.fill();
  if (loaf) { g.fillStyle = g255(0.82); g.beginPath(); g.ellipse(x + h * 0.12, base - h * 0.52, h * 0.1, h * 0.05, -0.3, 0, 7); g.fill(); }
}

export function paintScene(kind) {
  const cv = canvas(), g = cv.getContext('2d'), rnd = mulberry(kind === 'smoke' ? 11 : kind === 'smoke2' ? 11 : kind === 'steam' ? 23 : 37);
  if (kind === 'smoke' || kind === 'smoke2') {
    const big = kind === 'smoke2';
    let gr = g.createLinearGradient(0, 0, 0, GH * 0.62); gr.addColorStop(0, g255(0.68)); gr.addColorStop(1, g255(0.93)); g.fillStyle = gr; g.fillRect(0, 0, GW, GH);
    g.save(); g.filter = 'blur(6px)'; for (let i = 0; i < 9; i++) blob(g, rnd() * GW, 20 + rnd() * 80, 50 + rnd() * 50, 0.8, 0.3); g.restore();
    // headland, far
    g.fillStyle = g255(0.62); g.beginPath(); g.moveTo(0, GH * 0.6); g.quadraticCurveTo(60, GH * 0.44, 150, GH * 0.54); g.lineTo(150, GH * 0.6); g.fill();
    // water
    gr = g.createLinearGradient(0, GH * 0.6, 0, GH); gr.addColorStop(0, g255(0.62)); gr.addColorStop(1, g255(0.3)); g.fillStyle = gr; g.fillRect(0, GH * 0.6, GW, GH * 0.4);
    for (let i = 0; i < 70; i++) { g.fillStyle = ga(0.8 + rnd() * 0.15, 0.35); g.fillRect(rnd() * GW, GH * 0.62 + rnd() * GH * 0.3, 14 + rnd() * 40, 1); }
    // mill: sawtooth roofs, chimney, windows
    g.fillStyle = g255(0.15); g.fillRect(GW * 0.5, GH * 0.5, GW * 0.34, GH * 0.16);
    for (let k = 0; k < 4; k++) { g.beginPath(); const x0 = GW * 0.5 + k * GW * 0.085; g.moveTo(x0, GH * 0.5); g.lineTo(x0, GH * 0.42); g.lineTo(x0 + GW * 0.085, GH * 0.5); g.fill(); }
    g.fillRect(GW * 0.665, GH * 0.2, GW * 0.034, GH * 0.32);
    g.fillRect(GW * 0.66, GH * 0.19, GW * 0.044, GH * 0.025);
    g.fillStyle = g255(0.62); for (let r = 0; r < 2; r++) for (let k = 0; k < 9; k++) g.fillRect(GW * 0.515 + k * GW * 0.034, GH * (0.55 + r * 0.05), GW * 0.017, GH * 0.025);
    // reflection of the mill
    g.save(); g.globalAlpha = 0.5; g.fillStyle = g255(0.2); g.fillRect(GW * 0.5, GH * 0.68, GW * 0.34, GH * 0.14); g.restore();
    // smoke plume
    g.save(); g.filter = 'blur(2.5px)';
    const N = big ? 70 : 38;
    for (let i = 0; i < N; i++) {
      const u = i / N, x = GW * 0.682 - GW * (big ? 0.36 : 0.22) * Math.pow(u, 1.25) + (rnd() - 0.5) * 18, y = GH * 0.2 - GH * (big ? 0.34 : 0.2) * u + (rnd() - 0.5) * 8;
      blob(g, x, y, (big ? 14 : 10) + u * (big ? 56 : 36), 0.1 + u * 0.28, 0.55);
    }
    g.restore();
    // quay in the foreground
    g.fillStyle = g255(0.09); g.beginPath(); g.moveTo(0, GH); g.lineTo(0, GH * 0.82); g.lineTo(GW * 0.55, GH * 0.86); g.lineTo(GW * 0.8, GH * 0.92); g.lineTo(GW, GH * 0.9); g.lineTo(GW, GH); g.fill();
    for (const bx of [GW * 0.12, GW * 0.34]) { g.fillRect(bx, GH * 0.76, 7, GH * 0.12); g.beginPath(); g.arc(bx + 3.5, GH * 0.76, 5, 0, 7); g.fill(); }
    vignette(g, 0.45); grain(g, rnd, 0.1);
  } else if (kind === 'steam') {
    // dawn: the bakery, a little steam from its new flue; the mill, far off, is quiet
    let gr = g.createLinearGradient(0, 0, 0, GH * 0.6); gr.addColorStop(0, g255(0.55)); gr.addColorStop(1, g255(0.86)); g.fillStyle = gr; g.fillRect(0, 0, GW, GH);
    g.fillStyle = g255(0.5); g.fillRect(GW * 0.03, GH * 0.4, GW * 0.12, GH * 0.4); g.fillRect(GW * 0.07, GH * 0.24, GW * 0.016, GH * 0.2);   // the quiet mill
    g.fillStyle = g255(0.3); g.fillRect(GW * 0.2, GH * 0.3, GW * 0.74, GH * 0.8);
    g.fillRect(GW * 0.7, GH * 0.14, GW * 0.06, GH * 0.2); g.fillStyle = g255(0.18); g.fillRect(GW * 0.69, GH * 0.13, GW * 0.08, GH * 0.03);
    for (let k = 0; k < 8; k++) { g.fillStyle = g255(k % 2 ? 0.95 : 0.5); g.fillRect(GW * 0.2 + k * GW * 0.0925, GH * 0.4, GW * 0.0925, GH * 0.1); }
    g.fillStyle = g255(0.98); g.fillRect(GW * 0.25, GH * 0.55, GW * 0.36, GH * 0.33);
    g.fillStyle = g255(0.3); for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(GW * (0.32 + (k % 3) * 0.1), GH * (0.64 + Math.floor(k / 3) * 0.14), GW * 0.04, GH * 0.05, 0, 0, 7); g.fill(); }
    g.fillStyle = g255(0.04); for (const x of [0.25, 0.43, 0.6]) g.fillRect(GW * x - 3, GH * 0.55, 6, GH * 0.33);
    g.fillStyle = g255(0.05); g.fillRect(GW * 0.68, GH * 0.55, GW * 0.18, GH * 0.33); g.fillStyle = g255(0.85); g.fillRect(GW * 0.72, GH * 0.6, GW * 0.1, GH * 0.14);
    g.fillStyle = g255(0.12); g.fillRect(0, GH * 0.88, GW, GH * 0.12);
    g.save(); g.filter = 'blur(4px)'; g.fillStyle = ga(0.85, 0.5); g.beginPath(); g.moveTo(GW * 0.25, GH * 0.88); g.lineTo(GW * 0.61, GH * 0.88); g.lineTo(GW * 0.72, GH); g.lineTo(GW * 0.15, GH); g.fill(); g.restore();
    g.save(); g.filter = 'blur(2px)';
    for (let i = 0; i < 30; i++) { const u = i / 30; blob(g, GW * 0.73 - u * GW * 0.12 + Math.sin(u * 7) * 6, GH * 0.13 - u * GH * 0.14 + (rnd() - 0.5) * 4, 6 + u * 24, 1.0, 0.9 * (1 - u * 0.5)); }
    g.restore(); vignette(g, 0.3); grain(g, rnd, 0.06);
  } else { // 'queue'
    let gr = g.createLinearGradient(0, 0, 0, GH); gr.addColorStop(0, g255(0.55)); gr.addColorStop(1, g255(0.8)); g.fillStyle = gr; g.fillRect(0, 0, GW, GH);
    g.fillStyle = g255(0.32); g.fillRect(0, GH * 0.2, GW, GH);
    for (let k = 0; k < 14; k++) { g.fillStyle = g255(k % 2 ? 0.88 : 0.35); g.fillRect(k * GW / 14, GH * 0.22, GW / 14, GH * 0.1); }
    gr = g.createLinearGradient(0, GH * 0.36, 0, GH * 0.9); gr.addColorStop(0, g255(1)); gr.addColorStop(1, g255(0.78)); g.fillStyle = gr; g.fillRect(GW * 0.1, GH * 0.36, GW * 0.8, GH * 0.5);
    g.fillStyle = g255(0.45); for (let k = 0; k < 9; k++) { g.beginPath(); g.ellipse(GW * (0.16 + k * 0.088), GH * 0.5, GW * 0.03, GH * 0.045, 0, 0, 7); g.fill(); }
    g.fillStyle = g255(0.12); g.fillRect(0, GH * 0.86, GW, GH * 0.14);
    const xs = [0.1, 0.24, 0.37, 0.5, 0.63, 0.76, 0.9];
    xs.forEach((u, k) => person(g, GW * u + (rnd() - 0.5) * 10, GH * (1.0 + (k % 2) * 0.0), GH * (0.62 + rnd() * 0.12), 0.05 + rnd() * 0.05, k % 3 !== 2));
    person(g, GW * 0.31, GH, GH * 0.4, 0.06, true);
    vignette(g, 0.35); grain(g, rnd, 0.08);
  }
  const id = g.getImageData(0, 0, GW, GH).data, lum = new Float32Array(GW * GH);
  for (let i = 0; i < GW * GH; i++) lum[i] = id[i * 4] / 255;
  return lum;
}
const sample = (lum, u, v) => { // bilinear, u,v in 0..1
  const x = clamp(u * (GW - 1), 0, GW - 1.001), y = clamp(v * (GH - 1), 0, GH - 1.001), x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
  const a = lum[y0 * GW + x0], b = lum[y0 * GW + x0 + 1], c = lum[(y0 + 1) * GW + x0], d = lum[(y0 + 1) * GW + x0 + 1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
};

// A screen: dot centres on a 45-degree lattice inside w x h, with two luminance fields sampled at each dot.
export function makeScreen(w, h, pitch, lumA, lumB) {
  const xs = [], ys = [], la = [], lb = [], st = [], dd = [];
  const s2 = Math.SQRT1_2, R = Math.ceil((w + h) / pitch);
  for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) {
    const x = (i - j) * pitch * s2 + w / 2, y = (i + j) * pitch * s2 + h / 2;
    if (x < 0 || y < 0 || x > w || y > h) continue;
    xs.push(x); ys.push(y);
    la.push(sample(lumA, x / w, y / h)); lb.push(lumB ? sample(lumB, x / w, y / h) : 0);
    const n = hash(i * 12.9 + j * 78.2);
    st.push(n); dd.push(clamp((x / w) * 0.6 + (1 - y / h) * 0.4));
  }
  return { n: xs.length, xs: Float32Array.from(xs), ys: Float32Array.from(ys), la: Float32Array.from(la), lb: Float32Array.from(lb), nz: Float32Array.from(st), dd: Float32Array.from(dd), pitch, w, h };
}

// dev 0..1 develops photograph A; morph 0..1 swaps A for B; ink colour comes from the caller.
export function drawScreen(c, S, dev, morph, fill) {
  if (dev <= 0) return;
  const p = S.pitch, rmax = p * 0.74, D = dev * 1.12; c.fillStyle = fill; c.beginPath();
  for (let k = 0; k < S.n; k++) {
    let l = S.la[k];
    if (morph > 0) { const m = ss((morph * 1.7 - S.dd[k] * 0.9 - S.nz[k] * 0.25) / 0.7); l = l + (S.lb[k] - l) * m; }
    const start = 0.5 * l + 0.25 * S.nz[k], f = ss((D - start) / 0.3);
    const r = rmax * Math.sqrt(clamp(1 - Math.pow(l, 0.8))) * f;
    if (r < 0.35) continue;
    const x = S.xs[k], y = S.ys[k]; c.moveTo(x + r, y); c.arc(x, y, r, 0, 6.2832);
  }
  c.fill();
}
