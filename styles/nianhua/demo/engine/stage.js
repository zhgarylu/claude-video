// stage.js: camera, table, shadows, small prop drawers shared by every scene.
import { clamp, lerp, seg, ss } from '/core/lib.js';
import { mk, TEX, COL, PAPER, tileFill } from './core.js';

export const SW = 1920, SH = 1080;
export const OFF = { x: 0, y: 0 };      // screen offset used by slide transitions

// world -> screen: translate(centre), rotate, scale, translate(-cam)
export function camSet(ctx, cam, shake = [0, 0]) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(SW / 2 + shake[0] + OFF.x, SH / 2 + shake[1] + OFF.y); ctx.rotate(cam.rot || 0); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
}
export function toScreen(cam, x, y) {
  const c = Math.cos(cam.rot || 0), s = Math.sin(cam.rot || 0), dx = (x - cam.x) * cam.z, dy = (y - cam.y) * cam.z;
  return [SW / 2 + OFF.x + dx * c - dy * s, SH / 2 + OFF.y + dx * s + dy * c];
}

// tiled texture in world units (scale k)
const patCache = new Map();
export function worldFill(ctx, texName, x, y, w, h, k = 2, ox = 0, oy = 0) {
  const key = texName + k; let p = patCache.get(key);
  if (!p || p.ctx !== ctx) { p = { pat: ctx.createPattern(TEX[texName], 'repeat'), ctx }; patCache.set(key, p); }
  p.pat.setTransform(new DOMMatrix().translate(ox, oy).scale(k));
  ctx.fillStyle = p.pat; ctx.fillRect(x, y, w, h);
}

// soft drop shadow of a rounded rect (no blur filter: stacked rects)
export function softShadow(ctx, x, y, w, h, spread, alpha = .4) {
  ctx.save();
  const n = 7;
  for (let i = 0; i < n; i++) {
    const e = spread * (1 - i / n), a = alpha / n * 1.6;
    ctx.fillStyle = `rgba(10,5,0,${a})`; ctx.fillRect(x - e, y - e, w + e * 2, h + e * 2);
  }
  ctx.restore();
}

export function vignette(ctx, amt = .5) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(SW / 2, SH / 2, 380, SW / 2, SH / 2, 1180);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(8,3,0,${amt})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
}

// copy `src` into `tmp` masked by a soft sweep along direction dir; p 0..1. Returns tmp.
export function sweepCopy(tmp, src, p, dir, soft = .2, draw) {
  const t = tmp.getContext('2d'), W = tmp.width, H = tmp.height;
  t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, W, H);
  if (draw) draw(t); else t.drawImage(src, 0, 0);
  const cx = W / 2, cy = H / 2, L = Math.abs(Math.cos(dir)) * W + Math.abs(Math.sin(dir)) * H, ux = Math.cos(dir), uy = Math.sin(dir);
  const a0 = -soft, a1 = 1 + soft, sc = a1 - a0, uF = lerp(-soft, 1, clamp(p));
  const g = t.createLinearGradient(cx + ux * L * (a0 - .5), cy + uy * L * (a0 - .5), cx + ux * L * (a1 - .5), cy + uy * L * (a1 - .5));
  g.addColorStop(clamp((uF - a0) / sc), 'rgba(0,0,0,1)'); g.addColorStop(clamp((uF + soft - a0) / sc), 'rgba(0,0,0,0)');
  t.globalCompositeOperation = 'destination-in'; t.fillStyle = g; t.fillRect(0, 0, W, H); t.globalCompositeOperation = 'source-over';
  return tmp;
}

// tinted copy of a layer (single colour silhouette)
export function tinted(layer, color) {
  const c = mk(layer.width, layer.height), x = c.getContext('2d'); x.drawImage(layer, 0, 0);
  x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); return c;
}

// plank of wood with a front edge. (cx, cy) centre, w, h; returns nothing
export function plank(ctx, cx, cy, w, h, tex = 'pear', depth = 16) {
  ctx.save();
  ctx.fillStyle = '#6d4a28'; ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - h / 2 + depth, w, h, 8); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 8); ctx.save(); ctx.clip();
  worldFill(ctx, tex, cx - w / 2, cy - h / 2, w, h, 2, cx, cy); ctx.restore();
  ctx.strokeStyle = 'rgba(60,35,15,.55)'; ctx.lineWidth = 3; ctx.stroke();
  // top-left light edge
  ctx.strokeStyle = 'rgba(255,235,190,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - w / 2 + 6, cy + h / 2 - 8); ctx.lineTo(cx - w / 2 + 6, cy - h / 2 + 6); ctx.lineTo(cx + w / 2 - 8, cy - h / 2 + 6); ctx.stroke();
  ctx.restore();
}

// text on a paper label with a key-line frame; the "red shadow" is a mis-registered second pass
export function label(ctx, lines, x, y, { size = 40, align = 'left', pad = 22, rot = 0, a = 1, font = 'Lilita One', red = true } = {}) {
  ctx.save(); ctx.globalAlpha = a; ctx.font = `${size}px "${font}"`;
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + pad * 2, h = lines.length * size * 1.18 + pad * 1.3;
  const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x, y0 = y - h;
  ctx.translate(x0 + w / 2, y0 + h / 2); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(6, 8, w, h);
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, h);
  tileFill(ctx, TEX.paper, 0, 0, w, h, 0, 0);
  ctx.globalAlpha = a * .9; ctx.fillStyle = PAPER; ctx.globalAlpha = a * .55; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = a;
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 4; ctx.strokeRect(6, 6, w - 12, h - 12); ctx.lineWidth = 1.8; ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  lines.forEach((l, i) => {
    const ty = pad + size * .95 + i * size * 1.18 + 2;
    if (red) { ctx.fillStyle = COL.red; ctx.globalAlpha = a * .85; ctx.fillText(l, pad + 3, ty + 3); ctx.globalAlpha = a; }
    ctx.fillStyle = COL.ink; ctx.fillText(l, pad, ty);
  });
  ctx.restore();
  return { x0, y0, w, h };
}

// wrap text to a width using the current font settings
export function wrap(ctx, text, maxW, font) {
  ctx.save(); ctx.font = font; const words = text.split(' '), out = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur); ctx.restore(); return out;
}
