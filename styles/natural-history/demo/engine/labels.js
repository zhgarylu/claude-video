// labels.js: everything the plate says. Small-caps captions, italic Latin binomials, figure numbers,
// hairline leader lines that end in a dot, scale bars ruled in alternating blocks, and the brass pin.
// Text is "set" left to right: each letter darkens from a faint bleed to full ink. Type is IM Fell English (OFL).
import { clamp, lerp, ss, eo, Noise, mulberry, catmull } from './util.js';
import { stroke, dot, InkSet, INK } from './ink.js';

const ROMAN = '"IM Fell English", "Times New Roman", serif';

// Lay out a string: small caps (lowercase -> smaller capitals), tracking in em, italic option.
export function layout(ctx, str, { size = 22, italic = false, sc = false, track = 0 } = {}) {
  const items = []; let x = 0;
  for (const ch of str) {
    let s = size, c = ch;
    if (sc && ch >= 'a' && ch <= 'z') { s = size * .78; c = ch.toUpperCase(); }
    ctx.font = `${italic ? 'italic ' : ''}${s}px ${ROMAN}`;
    const w = ctx.measureText(c).width;
    items.push({ c, x, w, s });
    x += w + track * size;
  }
  return { items, w: x - track * size, size, italic };
}

// p: 0..1 reveal. al: 'l' | 'c' | 'r'
export function inkText(ctx, str, x, y, { size = 22, italic = false, sc = false, track = 0, p = 1, al = 'l', a = .9, col = INK, bleed = true } = {}) {
  if (p <= 0) return 0;
  const L = layout(ctx, str, { size, italic, sc, track });
  const ox = al === 'c' ? -L.w / 2 : al === 'r' ? -L.w : 0, n = L.items.length;
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const it = L.items[i], k = clamp(p * (n + 3) - i, 0, 3);
    if (k <= 0) continue;
    const full = clamp(k - .6, 0, 1), faint = clamp(k, 0, 1);
    ctx.font = `${italic ? 'italic ' : ''}${it.s}px ${ROMAN}`;
    if (bleed) { ctx.globalAlpha = a * .33 * faint * (1 - full * .6); ctx.fillText(it.c, x + ox + it.x - .35, y + .3); ctx.fillText(it.c, x + ox + it.x + .35, y - .2); }
    ctx.globalAlpha = a * full; ctx.fillText(it.c, x + ox + it.x, y);
  }
  ctx.restore();
  return L.w;
}
export const textWidth = (ctx, str, o = {}) => layout(ctx, str, o).w;

// "Fig. 3." : italic Fig., roman numeral, as engraved plates do
export function figNo(ctx, num, x, y, { size = 24, p = 1, al = 'l', sub = '' } = {}) {
  const w1 = textWidth(ctx, 'Fig. ', { size: size * .92, italic: true }), w2 = textWidth(ctx, num + sub + '.', { size });
  const tot = w1 + w2, ox = al === 'c' ? -tot / 2 : al === 'r' ? -tot : 0;
  inkText(ctx, 'Fig. ', x + ox, y, { size: size * .92, italic: true, p: clamp(p * 2), a: .88 });
  inkText(ctx, num + sub + '.', x + ox + w1, y, { size, p: clamp(p * 2 - .5), a: .92 });
  return tot;
}

// leader: a hairline from a label root to a dot on the part; returns an InkSet to draw with progress
export function leader(from, to, { bend = .18, w = .85 } = {}) {
  const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2, dx = to.x - from.x, dy = to.y - from.y, L = Math.hypot(dx, dy) || 1;
  const c = { x: mx - dy / L * L * bend, y: my + dx / L * L * bend }, pts = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push({ x: (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * c.x + t * t * to.x, y: (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * c.y + t * t * to.y }); }
  const set = new InkSet(); set.add(stroke(pts, { w, nib: .15, taper: .0, head: .02, a: .85 })); set.add(dot(to.x, to.y, 2.4, { a: .95 }));
  return set;
}

// scale bar ruled in alternating blocks, "len" world px for "label"
export function scaleBar(ctx, x, y, len, label, { p = 1, blocks = 4, size = 17 } = {}) {
  if (p <= 0) return;
  ctx.save(); const rule = clamp(p * 1.6), w = len * rule;
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.globalAlpha = .9; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.moveTo(x, y + 6); ctx.lineTo(x + w, y + 6); ctx.stroke();
  for (let i = 0; i <= blocks; i++) { const bx = x + len * i / blocks; if (bx - x > w + .1) break; ctx.beginPath(); ctx.moveTo(bx, y - 4); ctx.lineTo(bx, y + 10); ctx.stroke(); if (i < blocks && i % 2 === 0 && bx + len / blocks - x <= w + .1) ctx.fillRect(bx, y, len / blocks, 6); }
  ctx.restore();
  inkText(ctx, label, x + len + 12, y + 8, { size, italic: true, p: clamp(p * 2 - 1), a: .85 });
}

// the brass pin: p = 0..1 drop. Returns nothing; draws shadow then head.
export function pin(ctx, x, y, p, { r = 5.4 } = {}) {
  if (p <= 0) return;
  const e = ss(clamp(p / .55)), h = (1 - e) * 46, land = clamp((p - .5) / .5);
  const sx = x + 3.4 + h * .55, sy = y + 4.8 + h * .8;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .5 * e;
  ctx.filter = `blur(${1.3 + h * .12}px)`; ctx.fillStyle = '#4a3420';
  ctx.beginPath(); ctx.ellipse(sx, sy, r * (1 + h * .01), r * .72, .5, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(sx + 5, sy + 6); ctx.lineTo(sx + 5.8, sy + 5.4); ctx.closePath(); ctx.fill();
  ctx.filter = 'none'; ctx.restore();
  ctx.save(); ctx.globalAlpha = clamp(p * 6);
  const hx = x, hy = y - h * .9, rr = r * (1 + h * .012);
  const g = ctx.createRadialGradient(hx - rr * .38, hy - rr * .42, rr * .1, hx, hy, rr * 1.05);
  g.addColorStop(0, '#fff3c4'); g.addColorStop(.25, '#e8c46a'); g.addColorStop(.7, '#a47422'); g.addColorStop(1, '#5a3d12');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, rr, 0, 6.2832); ctx.fill();
  ctx.strokeStyle = 'rgba(60,38,10,.7)'; ctx.lineWidth = .7; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,240,.85)'; ctx.beginPath(); ctx.arc(hx - rr * .36, hy - rr * .4, rr * .2, 0, 6.2832); ctx.fill();
  if (land > 0 && land < 1) { ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = `rgba(60,40,20,${.35 * (1 - land)})`; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(x, y + 1, rr * (1.2 + land * 1.8), 0, 6.2832); ctx.stroke(); }
  ctx.restore();
}

// a dashed pencil cut line with end letters ("a" "b"), drawn progressively
export function cutLine(ctx, a, b, p, letters = ['a', 'b']) {
  if (p <= 0) return;
  const L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.floor(L / 16), k = Math.floor(n * clamp(p));
  ctx.save(); ctx.strokeStyle = '#5a5249'; ctx.globalAlpha = .75; ctx.lineWidth = 1.1;
  for (let i = 0; i < k; i++) { const t0 = i / n, t1 = (i + .55) / n; ctx.beginPath(); ctx.moveTo(lerp(a.x, b.x, t0), lerp(a.y, b.y, t0)); ctx.lineTo(lerp(a.x, b.x, t1), lerp(a.y, b.y, t1)); ctx.stroke(); }
  ctx.restore();
  inkText(ctx, letters[0], a.x - 18, a.y + 6, { size: 22, italic: true, p: clamp(p * 6), a: .85 });
  inkText(ctx, letters[1], b.x + 8, b.y + 6, { size: 22, italic: true, p: clamp(p * 6 - 5), a: .85 });
}
