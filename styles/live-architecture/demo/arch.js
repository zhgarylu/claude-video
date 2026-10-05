// Live architecture diagram engine (canvas 2D, deterministic): zones, nodes with state, orthogonal edges that draw on, packets that carry a label.
import { clamp, seg, ss, TAU } from '/core/lib.js';
export const C = { bg: '#0d1220', panel: '#161f33', panel2: '#1c2742', line: '#2b3a5c', text: '#eaf0fb', dim: '#8d9bb8', cyan: '#4cd3f2', amber: '#ffb454', mint: '#55e3ab', coral: '#ff7b7b', violet: '#a98bff' };
export const SANS = '"Noto Sans SC", system-ui, sans-serif', MONO = '"JetBrains Mono", "Noto Sans SC", monospace';
export const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
export { rgba };
let bgC = null;
export function backdrop(g, W, H) {
  if (!bgC) {
    bgC = document.createElement('canvas'); bgC.width = W; bgC.height = H; const c = bgC.getContext('2d');
    const gr = c.createRadialGradient(W * .5, H * .45, 100, W * .5, H * .5, W * .75); gr.addColorStop(0, '#131b30'); gr.addColorStop(1, C.bg); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(140,165,215,.16)'; for (let y = 30; y < H; y += 40) for (let x = 30; x < W; x += 40) { c.beginPath(); c.arc(x, y, 1.4, 0, TAU); c.fill(); }
  }
  g.drawImage(bgC, 0, 0);
}
// ---- polylines
export const plen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
export function pat(pts, u) {                                           // position and heading at fraction u of a polyline
  const L = plen(pts); let s = clamp(u) * L;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (s <= d || i === pts.length - 1) { const k = d ? Math.min(1, s / d) : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k, Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])]; } s -= d; }
  return [...pts[pts.length - 1], 0];
}
function rounded(g, pts, r) {                                           // a polyline with rounded corners
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) g.arcTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r);
  g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
}
export function edge(g, pts, p, o = {}) {
  if (p <= 0) return; const { col = C.line, w = 4, dash = 0, glow = 0 } = o, L = plen(pts);
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = w; g.strokeStyle = col; g.setLineDash(dash ? [dash, dash * .9] : [L * p, L]); if (dash) g.lineDashOffset = 0;
  if (glow) { g.shadowColor = col; g.shadowBlur = 18 * glow; }
  if (dash && p < 1) { g.beginPath(); const cut = []; let acc = 0; cut.push(pts[0]); for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (acc + d >= L * p) { const k = (L * p - acc) / d; cut.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]); break; } cut.push(pts[i]); acc += d; } rounded(g, cut, 22); g.stroke(); }
  else { g.beginPath(); rounded(g, pts, 22); g.stroke(); }
  g.restore();
}
// ---- icons, drawn inside a 56 px box centred on (x, y)
export function icon(g, kind, x, y, col, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 3.4; g.lineCap = 'round'; g.lineJoin = 'round';
  const P = f => { g.beginPath(); f(); g.stroke(); };
  if (kind === 'browser') { rr(g, -26, -20, 52, 40, 6); g.stroke(); P(() => { g.moveTo(-26, -8); g.lineTo(26, -8); }); for (const dx of [-17, -9, -1]) { g.beginPath(); g.arc(dx, -14, 1.8, 0, TAU); g.fill(); } P(() => { g.moveTo(-14, 6); g.lineTo(12, 6); g.moveTo(-14, 13); g.lineTo(4, 13); }); }
  else if (kind === 'dns') { for (const dy of [-14, 0, 14]) { g.beginPath(); g.arc(-18, dy, 2.6, 0, TAU); g.fill(); P(() => { g.moveTo(-8, dy); g.lineTo(24, dy); }); } }
  else if (kind === 'cdn') { g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.stroke(); P(() => { g.ellipse(0, 0, 9, 22, 0, 0, TAU); }); P(() => { g.moveTo(-22, 0); g.lineTo(22, 0); }); P(() => { g.moveTo(-18, -11); g.lineTo(18, -11); g.moveTo(-18, 11); g.lineTo(18, 11); }); }
  else if (kind === 'lb') { P(() => { g.moveTo(-26, 0); g.lineTo(-6, 0); g.moveTo(-6, 0); g.lineTo(14, -16); g.moveTo(-6, 0); g.lineTo(14, 0); g.moveTo(-6, 0); g.lineTo(14, 16); }); for (const dy of [-16, 0, 16]) { g.beginPath(); g.arc(20, dy, 4, 0, TAU); g.fill(); } }
  else if (kind === 'server') { for (const dy of [-17, 3]) { rr(g, -24, dy - 1, 48, 16, 4); g.stroke(); g.beginPath(); g.arc(-15, dy + 7, 2.2, 0, TAU); g.fill(); P(() => { g.moveTo(-4, dy + 7); g.lineTo(16, dy + 7); }); } }
  else if (kind === 'cache') { g.beginPath(); g.moveTo(6, -24); g.lineTo(-14, 4); g.lineTo(-1, 4); g.lineTo(-6, 24); g.lineTo(16, -6); g.lineTo(3, -6); g.closePath(); g.stroke(); }
  else if (kind === 'db') { P(() => { g.ellipse(0, -16, 22, 8, 0, 0, TAU); }); P(() => { g.moveTo(-22, -16); g.lineTo(-22, 16); g.moveTo(22, -16); g.lineTo(22, 16); }); P(() => { g.ellipse(0, 16, 22, 8, 0, 0, Math.PI); }); P(() => { g.ellipse(0, 0, 22, 8, 0, 0, Math.PI); }); }
  g.restore();
}
// ---- node: n = {x, y, w, h, label, tag, icon, col}; a = appear 0..1; act = glow 0..1
export function node(g, n, a, act = 0, t = 0) {
  if (a <= 0) return;
  const s = .85 + .15 * ss(a) + (a < 1 ? .05 * Math.sin(a * Math.PI) : 0), x = n.x, y = n.y, w = n.w, h = n.h;
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = Math.min(1, a * 2);
  if (act > .02) { g.shadowColor = n.col; g.shadowBlur = 38 * act; }
  rr(g, -w / 2, -h / 2, w, h, 20); g.fillStyle = act > .02 ? `rgba(${[...Array(3)].map((_, i) => Math.round(22 + (parseInt(n.col.slice(1 + i * 2, 3 + i * 2), 16) - 22) * .18 * act)).join(',')},1)` : C.panel; g.fill();
  g.shadowBlur = 0; g.lineWidth = 3; g.strokeStyle = act > .02 ? n.col : rgba(n.col, .55); g.stroke();
  icon(g, n.icon, 0, -h * .12, n.col, .9);
  g.fillStyle = C.text; g.font = `700 30px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(n.label, 0, h * .36);
  g.restore();
  if (n.tag && a > .6) { g.save(); g.globalAlpha = ss(seg(a, .6, 1)); g.fillStyle = C.dim; g.font = `500 22px ${SANS}`; g.textAlign = 'center'; g.fillText(n.tag, x, y + h / 2 + 30); g.restore(); }
}
export function badge(g, text, x, y, col, p = 1, size = 24) {
  if (p <= 0) return; g.save(); g.globalAlpha = Math.min(1, p * 2); g.font = `700 ${size}px ${SANS}`; const w = g.measureText(text).width + 28, h = size + 16, k = .9 + .1 * ss(p);
  g.translate(x, y); g.scale(k, k); rr(g, -w / 2, -h / 2, w, h, h / 2); g.fillStyle = rgba(col, .18); g.fill(); g.lineWidth = 2.4; g.strokeStyle = col; g.stroke();
  g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, 1); g.restore();
  return { x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2, w };
}
export function zone(g, r, label, p, col = C.dim) {
  if (p <= 0) return; g.save(); g.globalAlpha = ss(p);
  rr(g, r.x, r.y, r.w, r.h, 26); g.fillStyle = 'rgba(80,110,170,.06)'; g.fill(); g.setLineDash([10, 10]); g.lineWidth = 2; g.strokeStyle = 'rgba(141,155,184,.45)'; g.stroke(); g.setLineDash([]);
  g.fillStyle = col; g.font = `600 26px ${SANS}`; g.textAlign = 'left'; g.fillText(label, r.x + 24, r.y + 40); g.restore();
}
export function packet(g, pts, u, o = {}) {
  const { col = C.cyan, label = '', trail = 5, alpha = 1 } = o; if (u <= 0 || u >= 1.0001) return;
  g.save(); g.globalAlpha = alpha;
  for (let i = trail; i >= 1; i--) { const q = pat(pts, Math.max(0, u - i * .012)); g.fillStyle = rgba(col, .16 * (1 - i / (trail + 1))); g.beginPath(); g.arc(q[0], q[1], 12 - i * 1.2, 0, TAU); g.fill(); }
  const [x, y] = pat(pts, u); g.shadowColor = col; g.shadowBlur = 22; g.fillStyle = col; rr(g, x - 13, y - 13, 26, 26, 8); g.fill(); g.shadowBlur = 0; g.fillStyle = C.bg; rr(g, x - 6, y - 6, 12, 12, 3); g.fill();
  if (label) { g.font = `600 24px ${MONO}`; const w = g.measureText(label).width + 22; rr(g, x - w / 2, y - 58, w, 34, 17); g.fillStyle = 'rgba(13,18,32,.92)'; g.fill(); g.lineWidth = 2; g.strokeStyle = col; g.stroke(); g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, x, y - 40); }
  g.restore();
}
