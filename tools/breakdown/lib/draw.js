// Small drawing helpers shared by the shot renderers. Everything is deterministic and uses the page's 2D context.
import { clamp, seg, ss, eo, eio, back } from '/core/lib.js';
export { clamp, seg, ss, eo, eio, back };
export const isCJK = ch => /[　-鿿＀-￯]/.test(ch);

export function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

// Wrap text to a width. CJK breaks anywhere except before closing punctuation; Latin breaks at spaces.
export function wrap(ctx, text, maxW) {
  const out = []; let line = '', word = '';
  const flushWord = () => { if (!word) return; if (ctx.measureText(line + word).width > maxW && line) { out.push(line.trimEnd()); line = ''; } line += word; word = ''; };
  const noStart = '，。、；：！？）》」』”’,.;:!?)%';
  for (const ch of text) {
    if (ch === '\n') { flushWord(); out.push(line.trimEnd()); line = ''; continue; }
    if (isCJK(ch)) {
      flushWord();
      if (ctx.measureText(line + ch).width > maxW && line && !noStart.includes(ch)) { out.push(line.trimEnd()); line = ''; }
      line += ch;
    } else if (ch === ' ') { word += ch; flushWord(); } else word += ch;
  }
  flushWord(); if (line) out.push(line.trimEnd());
  return out;
}
export const font = (R, w, s) => `${w} ${Math.round(s)}px ${R.th.font}`;

// Draw a wrapped paragraph. Shrinks the size (never below `min`) until it fits `maxH`. Returns {w, h, lines, size}.
// opts: size, min, weight, color, align ('left'|'center'|'right'), lh (line height ratio), maxLines, alpha, id (reports it to TEXTS).
export function para(R, text, x, y, maxW, o = {}) {
  const { ctx } = R; let size = o.size ?? R.L.sizes.body; const min = o.min ?? Math.min(size, 36), wgt = o.weight ?? 600, lhr = o.lh ?? 1.28;
  let lines;
  for (;;) {
    ctx.font = font(R, wgt, size); lines = wrap(ctx, text, maxW);
    const tooTall = o.maxH && lines.length * size * lhr > o.maxH, tooMany = o.maxLines && lines.length > o.maxLines;
    if ((tooTall || tooMany) && size > min) size -= 2; else break;
  }
  const lh = size * lhr, align = o.align ?? 'left', alpha = o.alpha ?? 1;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = o.color ?? R.th.ink; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  let wmax = 0;
  lines.forEach((ln, i) => { if (!o.dry) ctx.fillText(ln, x, y + size + i * lh - size * .2); wmax = Math.max(wmax, ctx.measureText(ln).width); });
  ctx.restore();
  const h = lines.length * lh, x0 = align === 'center' ? x - wmax / 2 : align === 'right' ? x - wmax : x;
  if (o.id && !o.dry) R.report(o.id, text, x0, y, x0 + wmax, y + h, alpha, !!o.stable, size);
  return { w: wmax, h, lines, size, x0 };
}
// A single line, no wrapping. Returns its width.
export function line(R, text, x, y, o = {}) {
  const { ctx } = R, size = o.size ?? R.L.sizes.body; ctx.save(); ctx.font = font(R, o.weight ?? 700, size); ctx.fillStyle = o.color ?? R.th.ink; ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = o.base ?? 'alphabetic';
  ctx.globalAlpha *= o.alpha ?? 1; ctx.fillText(text, x, y); const w = ctx.measureText(text).width; ctx.restore();
  if (o.id) { const al = o.align ?? 'left', x0 = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x; R.report(o.id, text, x0, y - size * .85, x0 + w, y + size * .25, o.alpha ?? 1, !!o.stable, size); }
  return w;
}
export function measure(R, text, weight, size) { R.ctx.font = font(R, weight, size); return R.ctx.measureText(text).width; }

// A plate with text: tag plates, chips, labels. Returns its box.
export function chip(R, text, x, y, o = {}) {
  const { ctx } = R, size = o.size ?? R.L.sizes.label, padX = o.padX ?? 20, h = o.h ?? size * 1.62, w0 = measure(R, text, o.weight ?? 800, size) + 2 * padX + (o.dot ? size * .9 : 0);
  const w = o.w ?? w0, bx = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x, a = o.alpha ?? 1;
  ctx.save(); ctx.globalAlpha *= a;
  if (o.shadow !== false) { ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4; }
  ctx.fillStyle = o.bg ?? R.th.plate; rr(ctx, bx, y, w, h, o.r ?? Math.min(16, h / 2)); ctx.fill(); ctx.shadowColor = 'transparent';
  if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = o.bw ?? 2.5; if (o.dash) ctx.setLineDash(o.dash); rr(ctx, bx, y, w, h, o.r ?? Math.min(16, h / 2)); ctx.stroke(); ctx.setLineDash([]); }
  let tx = bx + padX;
  if (o.dot) { ctx.fillStyle = o.dot; ctx.beginPath(); ctx.arc(tx + size * .22, y + h / 2, size * .2, 0, 6.2832); ctx.fill(); tx += size * .9; }
  ctx.font = font(R, o.weight ?? 800, size); ctx.fillStyle = o.color ?? R.th.plateInk; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, tx, y + h / 2 + size * .04);
  ctx.restore();
  if (o.id) R.report(o.id, text, bx, y, bx + w, y + h, a, o.stable, size);
  return { x: bx, y, w, h };
}
// Numbered circle (markers, list rows).
export function badge(R, n, cx, cy, r, o = {}) {
  const { ctx } = R; ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
  ctx.fillStyle = o.bg ?? R.th.accent; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.lineWidth = o.ring ?? 4; ctx.strokeStyle = o.ringColor ?? 'rgba(0,0,0,0.55)'; ctx.stroke();
  ctx.fillStyle = o.color ?? R.th.accentInk; ctx.font = font(R, 900, r * 1.15); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), cx, cy + r * .06); ctx.restore();
}
// Arrow from (x0,y0) to (x1,y1), drawn to `p` (0..1) of its length.
export function arrow(R, x0, y0, x1, y1, p, o = {}) {
  if (p <= 0) return; const { ctx } = R, col = o.color ?? R.th.accent, lw = o.lw ?? 7, hd = o.head ?? 26;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, ex = x0 + dx * p, ey = y0 + dy * p;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [c, w] of [['rgba(0,0,0,0.55)', lw + 6], [col, lw]]) {
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex - ux * hd * .6, ey - uy * hd * .6); ctx.stroke();
    if (p > .05) { ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - ux * hd - uy * hd * .55, ey - uy * hd + ux * hd * .55); ctx.lineTo(ex - ux * hd + uy * hd * .55, ey - uy * hd - ux * hd * .55); ctx.closePath(); ctx.fill(); if (w > lw) ctx.stroke(); }
  }
  ctx.restore();
}
// The slide-up-and-fade used by every revealed element. p = 0..1 reveal progress.
export const pop = p => ({ a: ss(p * 1.6), dy: (1 - eo(p)) * 22 });
