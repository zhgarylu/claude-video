// small drawing helpers shared by the scene code (all deterministic)
import { mulberry, hash, vnoise, clamp, lerp, seg, ss, eio, eo } from '/core/lib.js';
export { mulberry, hash, vnoise, clamp, lerp, seg, ss, eio, eo };
export const W = 960, H = 720;                       // source canvas (4:3); the film pass scales it to 1440x1080
export const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mixc = (a, b, t) => { const A = typeof a === 'string' ? hex(a) : a, B = typeof b === 'string' ? hex(b) : b; return A.map((v, i) => v + (B[i] - v) * t); };
export const css = (c, a = 1) => { if (typeof c === 'string') c = hex(c); return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; };
export const shade = (c, k) => css(mixc(c, k < 0 ? [0, 0, 0] : [255, 255, 255], Math.abs(k)));
export function lin(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c, a]) => g.addColorStop(o, css(c, a ?? 1))); return g; }
export function rad(ctx, x, y, r0, r1, stops) { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c, a]) => g.addColorStop(o, css(c, a ?? 1))); return g; }
export function poly(ctx, pts, fill) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } }
export function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
export function capsule(ctx, x0, y0, x1, y1, w, col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
export function ell(ctx, x, y, rx, ry, fill, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), rot, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } }
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// camera: view(ctx, cam, parallaxX, fn) draws fn in world coordinates seen through the camera
export function view(ctx, cam, par, fn) {
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(cam.rot || 0); ctx.scale(cam.z, cam.z);
  ctx.translate(-(W / 2 + cam.x * par), -(H / 2 + cam.y)); fn(); ctx.restore();
}
