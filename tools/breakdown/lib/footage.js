// Drawing footage: contain-fit with a blurred, darkened backdrop for the bars, freeze views with zoom, highlight boxes, arrows.
import { clamp, seg, eio, rr, arrow as arrowFn } from './draw.js';

const tiny = (() => { try { const c = document.createElement('canvas'); c.width = 48; c.height = 27; return c; } catch { return null; } })();
// Draw image `im` into stage rect `st` ({x,y,w,h}) with the view {cx,cy,s}: image point (cx,cy) in normalized coordinates sits at the stage centre,
// scale s = screen pixels per image pixel. Returns the mapping (nx,ny) -> screen.
export function drawView(R, im, st, view, o = {}) {
  const { ctx } = R, iw = im.naturalWidth, ih = im.naturalHeight, dw = iw * view.s, dh = ih * view.s;
  const ox = (o.center ? o.center[0] : st.x + st.w / 2) - view.cx * dw, oy = (o.center ? o.center[1] : st.y + st.h / 2) - view.cy * dh;
  ctx.save(); ctx.beginPath(); ctx.rect(st.x, st.y, st.w, st.h); ctx.clip();
  if (ox > st.x + 1 || oy > st.y + 1 || ox + dw < st.x + st.w - 1 || oy + dh < st.y + st.h - 1) {      // bars: a blurred, dimmed copy of the picture
    if (tiny) { const g = tiny.getContext('2d'); g.drawImage(im, 0, 0, 48, 27); ctx.imageSmoothingEnabled = true; ctx.drawImage(tiny, st.x, st.y, st.w, st.h); }
    ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(st.x, st.y, st.w, st.h);
  }
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, ox, oy, dw, dh);
  if (o.shadow) { ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(ox, oy, dw, dh); }
  ctx.restore();
  return { ox, oy, dw, dh, map: (nx, ny) => [ox + nx * dw, oy + ny * dh] };
}
export const fitScale = (im, box) => Math.min(box.w / im.naturalWidth, box.h / im.naturalHeight);

// Highlight box in screen coordinates, drawn to progress p; dark outline under an accent line, corner ticks, optional label chip.
export function box(R, x, y, w, h, p, o = {}) {
  if (p <= 0) return; const { ctx } = R, col = o.color ?? R.th.accent, k = eio(p), cx = x + w / 2, cy = y + h / 2, bw = w * (.6 + .4 * k), bh = h * (.6 + .4 * k), bx = cx - bw / 2, by = cy - bh / 2;
  ctx.save(); ctx.globalAlpha *= Math.min(1, p * 2.2); ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 12; rr(ctx, bx, by, bw, bh, 10); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 6; rr(ctx, bx, by, bw, bh, 10); ctx.stroke();
  ctx.restore();
  return { x: bx, y: by, w: bw, h: bh };
}
// Dim everything outside the given screen rects.
export function spotlight(R, st, rects, a) {
  if (a <= 0 || !rects.length) return; const { ctx } = R; ctx.save(); ctx.beginPath(); ctx.rect(st.x, st.y, st.w, st.h);
  for (const r of rects) ctx.roundRect(r.x, r.y, r.w, r.h, 10);
  ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fill('evenodd'); ctx.restore();
}
export { arrowFn as arrow };
