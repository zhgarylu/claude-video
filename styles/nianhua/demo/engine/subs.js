// subs.js: subtitles as a printed paper label, slapped on and mis-registered like everything else.
import { clamp, seg, ss } from '/core/lib.js';
import { SW, SH, label, wrap } from './stage.js';
import { SUBS } from '../timeline.js';

export function drawSubs(ctx, t, where = 'br') {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const c = SUBS.find((s) => t >= s.t0 && t < s.t1); if (!c) return;
  const size = 40, font = `${size}px "Lilita One"`, lines = wrap(ctx, c.text, 800, font);
  const a = ss(seg(t, c.t0, c.t0 + .1)) * (1 - ss(seg(t, c.t1 - .12, c.t1)));
  const k = 1 + (1 - ss(seg(t, c.t0, c.t0 + .12))) * .06;
  ctx.save();
  const x = where === 'bl' ? 56 : SW - 56, y = SH - 46;
  ctx.translate(x, y); ctx.scale(k, k); ctx.translate(-x, -y);
  label(ctx, lines, x, y, { size, align: where === 'bl' ? 'left' : 'right', rot: where === 'bl' ? -.008 : .008, a });
  ctx.restore();
}
