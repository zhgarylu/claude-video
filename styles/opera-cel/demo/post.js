// post.js — the last pass over a finished frame: gouache-on-paper tooth, warm vignette, subtitles, snap marks.
import { PAL, ink, textures, spl } from './brush.js';
import { mulberry, lerp } from '/core/lib.js';

export function finish(ctx, W, H, o = {}) {
  const { GRAIN } = textures(ctx);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = o.grain ?? .55; ctx.fillStyle = GRAIN; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * .98); g.addColorStop(0, 'rgba(60,30,10,0)'); g.addColorStop(1, 'rgba(60,30,10,.22)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Subtitle: brush-kai characters, ivory pigment with an indigo-ink edge, sitting low in the frame.
export function subtitle(ctx, text, W, H, o = {}) {
  const { size = 54, y = H - 78, font = 'NotoSerif' } = o;
  ctx.save(); ctx.font = `${font === 'NotoSerif' ? '700 ' : ''}${size}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const tw = ctx.measureText(text).width;
  // soft ink shadow band so the line reads over any backdrop
  ctx.save(); ctx.translate(W / 2, y); ctx.scale((tw / 2 + 160) / (size * 1.1), 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.1); g.addColorStop(0, 'rgba(24,18,40,.42)'); g.addColorStop(1, 'rgba(24,18,40,0)');
  ctx.fillStyle = g; ctx.fillRect(-size * 1.1, -size * 1.1, size * 2.2, size * 2.2); ctx.restore();
  ctx.strokeStyle = PAL.inkBlue; ctx.lineWidth = size * .2; ctx.strokeText(text, W / 2 + 2, y + 3);
  ctx.strokeStyle = PAL.inkBlue; ctx.lineWidth = size * .16; ctx.strokeText(text, W / 2, y);
  ctx.fillStyle = '#f6ecd0'; ctx.fillText(text, W / 2, y);
  ctx.restore();
}

// Title in gold brush with a cinnabar edge and a seal-block (vertical or horizontal).
export function title(ctx, text, x, y, o = {}) {
  const { size = 150, font = 'MaShan', vertical = false, seal = null } = o;
  ctx.save(); ctx.font = `${size}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const chars = vertical ? [...text] : [text];
  chars.forEach((c, i) => {
    const cy = vertical ? y + i * size * 1.04 : y;
    ctx.strokeStyle = PAL.inkBlue; ctx.lineWidth = size * .14; ctx.strokeText(c, x + 4, cy + 5);
    const g = ctx.createLinearGradient(0, cy - size / 2, 0, cy + size / 2); g.addColorStop(0, PAL.goldLt); g.addColorStop(.55, PAL.gold); g.addColorStop(1, PAL.goldDk);
    ctx.strokeStyle = PAL.vermilion; ctx.lineWidth = size * .09; ctx.strokeText(c, x, cy);
    ctx.fillStyle = g; ctx.fillText(c, x, cy);
  });
  ctx.restore();
}

// snap marks: a few short tapered strokes radiating from a point (the hit of a held pose)
export function snapMarks(ctx, cx, cy, r0, r1, a0, a1, n, seed, col = PAL.goldDk, w = 7) {
  const rnd = mulberry(seed);
  for (let i = 0; i < n; i++) {
    const a = lerp(a0, a1, n === 1 ? .5 : i / (n - 1)) + (rnd() - .5) * .08, ra = r0 + rnd() * 14, rb = r1 * (.7 + rnd() * .45);
    ink(ctx, [[cx + Math.cos(a) * ra, cy + Math.sin(a) * ra], [cx + Math.cos(a) * (ra + rb) / 2, cy + Math.sin(a) * (ra + rb) / 2], [cx + Math.cos(a) * rb, cy + Math.sin(a) * rb]], { w: w * (.8 + rnd() * .5), col, seed: seed + i, taper: [.08, .75], minw: .04, press: .1, wob: .2 });
  }
}
