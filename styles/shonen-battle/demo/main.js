import { use } from './ink.js';
import { frame, TX, IMPACT, W, H } from './film.js';
import { DUR, EV } from './timeline.js';
const cv = document.getElementById('c'), ctx = cv.getContext('2d'); use(ctx);
const off = document.createElement('canvas'); off.width = W; off.height = H; const octx = off.getContext('2d');
window.DUR = DUR; window.EV = EV;
let last = null;
window.render = t => {
  frame(t); last = t;
  const m = IMPACT(t);
  if (m) {   // the impact frame: high-contrast black and white, inverted on its first frame
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.drawImage(cv, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = m === 'inv' ? 'grayscale(1) contrast(9) brightness(1.1) invert(1)' : 'grayscale(1) contrast(9) brightness(1.1)';
    ctx.drawImage(off, 0, 0); ctx.restore(); ctx.filter = 'none';
  }
};
window.TEXTS = t => { if (last !== t) window.render(t); return TX.slice(); };
window.READY = false;
Promise.all([document.fonts.load('40px Bangers'), document.fonts.load('40px Anton')]).then(() => { window.READY = true; });
