// The film's single-stroke vector font (vfont.json, drawn for this film) as polylines, with a "written so far" fraction.
let FONT = null; const cache = new Map();
export const ADV = 1.6;
export async function loadFont(url = 'vfont.json') { FONT = await (await fetch(url)).json(); }
export function layout(str) {
  let c = cache.get(str); if (c) return c;
  let x = 0; const strokes = [];
  for (const ch of str.toUpperCase()) {
    const g = FONT[ch] || FONT['?'];
    for (const s of g.s) strokes.push(s.map(p => [p[0] + x, p[1]]));
    x += g.w + ADV;
  }
  c = { strokes, w: Math.max(0, x - ADV) }; cache.set(str, c); return c;
}
export const textWidth = (str, h) => layout(str).w * h / 6;
// Build a Path2D for str with cap height h at (x, y = top of capitals). prog 0..1 = fraction of total stroke length drawn.
// Returns {path, x0, x1, y0, y1, head}
export function textPath(str, x, y, h, align = 'l', prog = 1) {
  const L = layout(str), k = h / 6, w = L.w * k;
  const ox = align === 'c' ? x - w / 2 : align === 'r' ? x - w : x;
  const path = new Path2D(); let total = 0;
  if (prog < 1) for (const s of L.strokes) for (let i = 1; i < s.length; i++) total += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
  let left = prog < 1 ? total * Math.max(0, prog) : Infinity, head = null;
  for (const s of L.strokes) {
    if (left <= 0) break;
    path.moveTo(ox + s[0][0] * k, y + s[0][1] * k); head = [ox + s[0][0] * k, y + s[0][1] * k];
    for (let i = 1; i < s.length; i++) {
      const d = Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
      if (d > left) { const f = left / d; head = [ox + (s[i - 1][0] + (s[i][0] - s[i - 1][0]) * f) * k, y + (s[i - 1][1] + (s[i][1] - s[i - 1][1]) * f) * k]; path.lineTo(head[0], head[1]); left = 0; break; }
      path.lineTo(ox + s[i][0] * k, y + s[i][1] * k); head = [ox + s[i][0] * k, y + s[i][1] * k]; left -= d;
    }
  }
  return { path, x0: ox, x1: ox + w, y0: y, y1: y + h, head };
}
// passes: [{lw, col}]; drawn with 'lighter' when glow is true
export function vtext(c, str, x, y, h, o = {}) {
  const { align = 'l', prog = 1, passes = [{ lw: Math.max(1, h / 22), col: 'rgba(120,210,160,.9)' }], op = 'source-over' } = o;
  const r = textPath(str, x, y, h, align, prog);
  c.save(); c.globalCompositeOperation = op; c.lineCap = 'round'; c.lineJoin = 'round';
  for (const p of passes) { c.lineWidth = p.lw; c.strokeStyle = p.col; c.stroke(r.path); }
  c.restore(); return r;
}
export const glowPasses = (h, a = 1) => [
  { lw: h / 5, col: `rgba(25,210,100,${.10 * a})` }, { lw: h / 11, col: `rgba(80,255,150,${.32 * a})` }, { lw: Math.max(1.1, h / 24), col: `rgba(225,255,236,${.92 * a})` }];
