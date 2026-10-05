// Paper-annotation engine (canvas 2D, deterministic): a typeset page that is laid out word by word, highlights that sweep, hand-drawn circles, note cards.
import { clamp, seg, ss, hash, TAU } from '/core/lib.js';
export const C = { desk: '#1d2025', paper: '#f7f4ea', ink: '#23262b', grey: '#c9c5b8', hl: '#ffe14d', red: '#e5484d', blue: '#3a7bd5', green: '#2fa36b', amber: '#f2a33a', text: '#eef1f6', dim: '#9aa3b2' };
export const SERIF = '"Source Serif 4", Georgia, serif', SANS = '"Noto Sans SC", system-ui, sans-serif';
export const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
export const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
let deskC = null;
export function desk(g, W, H) {
  if (!deskC) {
    deskC = document.createElement('canvas'); deskC.width = W; deskC.height = H; const c = deskC.getContext('2d');
    const gr = c.createRadialGradient(W * .4, H * .45, 120, W * .5, H * .5, W * .75); gr.addColorStop(0, '#272b32'); gr.addColorStop(1, '#14161a'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(255,255,255,${.012 + hash(i * 1.3) * .02})`; c.fillRect(hash(i * 2.1) * W, hash(i * 3.7) * H, 2, 2); }
  }
  g.drawImage(deskC, 0, 0);
}
// ---- typesetting: flows words of segments into lines; returns the words with boxes (page coordinates) and the line rectangles of every segment
export function typeset(g, segs, x0, y0, width, size, lh, font = SERIF, weight = 400) {
  g.save(); g.font = `${weight} ${size}px ${font}`; const space = g.measureText(' ').width;
  const words = []; let x = x0, y = y0, lineStart = 0;
  for (const s of segs) for (const w of s.text.split(' ')) {
    if (!w) continue; const ww = g.measureText(w).width;
    if (x + ww > x0 + width && x > x0) { x = x0; y += lh; }
    words.push({ w, x, y, ww, id: s.id, size, weight, font }); x += ww + space;
  }
  g.restore();
  const rects = {};
  for (const wd of words) { if (!wd.id) continue; const r = rects[wd.id] || (rects[wd.id] = []); const last = r[r.length - 1]; if (last && Math.abs(last.y - wd.y) < 1) last.x1 = wd.x + wd.ww; else r.push({ x0: wd.x, x1: wd.x + wd.ww, y: wd.y, top: wd.y - size * .86, bot: wd.y + size * .3 }); }
  return { words, rects };
}
export function drawWords(g, T, col = C.ink) { g.save(); g.fillStyle = col; g.textBaseline = 'alphabetic'; for (const w of T.words) { g.font = `${w.weight} ${w.size}px ${w.font}`; g.fillText(w.w, w.x, w.y); } g.restore(); }
// a highlighter sweep over a segment's line rectangles, p = 0..1 along their total length (drawn under the text via multiply)
export function mark(g, rects, p, col = C.hl) {
  if (p <= 0 || !rects) return; const tot = rects.reduce((a, r) => a + (r.x1 - r.x0), 0); let left = tot * clamp(p);
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = col; g.globalAlpha = .75;
  for (const r of rects) { const w = Math.min(left, r.x1 - r.x0); if (w <= 0) break; rr(g, r.x0 - 3, r.top, w + 6, r.bot - r.top + 2, 4); g.fill(); left -= w; }
  g.restore();
}
// a hand-drawn ring round a box, drawn on
export function ring(g, box, p, col = C.red, seed = 1, w = 3.5) {
  if (p <= 0) return; const cx = (box.x0 + box.x1) / 2, cy = (box.top + box.bot) / 2, rx = (box.x1 - box.x0) / 2 + 12, ry = (box.bot - box.top) / 2 + 10, n = 60, end = Math.floor(n * 1.08 * clamp(p));
  g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath();
  for (let i = 0; i <= end; i++) { const a = -2.2 + i / n * TAU, k = 1 + (hash(seed * 7 + i * .2) - .5) * .06 + i / n * .05; const x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke(); g.restore();
}
export function pageShape(g, x, y, w, h, shadow = 1) {
  g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 40 * shadow; g.shadowOffsetY = 14 * shadow; g.fillStyle = C.paper; g.fillRect(x, y, w, h); g.restore();
  const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(150,130,90,.12)'); g.fillStyle = gr; g.fillRect(x, y, w, h);
}
export function greyLines(g, x, y, w, n, lh, p = 1, seed = 1) { g.save(); g.fillStyle = C.grey; for (let i = 0; i < n; i++) { const ww = w * (i === n - 1 ? .55 : .96 + (hash(seed + i) - .5) * .06) * clamp(p * n - i); if (ww > 0) g.fillRect(x, y + i * lh, ww, 7); } g.restore(); }
// ---- note cards (screen space)
export function card(g, x, y, w, h, col, a = 1) {
  g.save(); g.globalAlpha = Math.min(1, a * 1.5); const k = .94 + .06 * ss(a); g.translate(x + w / 2, y + h / 2); g.scale(k, k); g.translate(-w / 2, -h / 2);
  g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 24; g.shadowOffsetY = 8; rr(g, 0, 0, w, h, 18); g.fillStyle = '#fbf8ee'; g.fill(); g.shadowBlur = 0;
  g.fillStyle = col; rr(g, 0, 0, 12, h, 6); g.fill(); g.restore();
}
