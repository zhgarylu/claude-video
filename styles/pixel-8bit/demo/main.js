// Page contract + presentation. The console is 256x240, shown at an exact integer x4 (1024x960) on a dark surround;
// a close-up is a hard cut to a 256x180 window at an exact x6 (1536x1080), never a smooth zoom.
// Query: ?f=<game frame> renders that frame (stills); ?crt=0 turns the faint scanlines off.
import { render, validate, toRGBA, W, H } from './ppu.js';
import { stateAt, EVENTS } from './game.js';
import * as TL from './timeline.js';

const Q = new URLSearchParams(location.search);
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const fbc = document.createElement('canvas'); fbc.width = W; fbc.height = H; const fctx = fbc.getContext('2d');
window.DUR = TL.DUR_F / 60;
window.EV = EVENTS;
window.CHECK = {};

function present(fb, view) {
  fctx.putImageData(new ImageData(toRGBA(fb), W, H), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#06060a'; ctx.fillRect(0, 0, 1920, 1080);
  const scanlines = (ox, oy, w, h, sc) => { if (Q.get('crt') === '0') return; ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let y = 0; y < h; y += sc) ctx.fillRect(ox, oy + y + sc - 1, w, 1); };
  if (view) {
    const SC = 6, ox = (1920 - W * SC) / 2;
    ctx.drawImage(fbc, view.x0, view.y0, W, 180, ox, 0, W * SC, 180 * SC);
    scanlines(ox, 0, W * SC, 180 * SC, SC); return;
  }
  const SC = 4, OX = (1920 - W * SC) / 2, OY = (1080 - H * SC) / 2;
  ctx.save(); ctx.filter = 'blur(70px) brightness(0.5)'; ctx.globalAlpha = 0.55; ctx.drawImage(fbc, OX - 120, OY - 60, W * SC + 240, H * SC + 120); ctx.restore();
  ctx.drawImage(fbc, OX, OY, W * SC, H * SC);
  if (Q.get('crt') !== '0') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.09; ctx.filter = 'blur(5px)'; ctx.drawImage(fbc, OX, OY, W * SC, H * SC); ctx.restore(); }
  scanlines(OX, OY, W * SC, H * SC, SC);
}
window.render = t => {
  const f = Q.has('f') ? +Q.get('f') : Math.round(t * 60);
  const st = stateAt(f), out = render(st), v = validate(st, out, 'f' + f);
  window.CHECK = v;
  if (!v.ok) throw new Error('constraint violation @' + f + ': ' + v.errs.join('; '));
  present(out.fb, st.view);
};
// on-screen words (tile font, so every character is 8 px) with boxes in output pixels; HUD numbers and labels are not reported
const OX = 448, OY = 60, SC = 4;
const box = (tx, ty, s, scale = 1) => ({ x0: OX + tx * 8 * SC, y0: OY + ty * 8 * SC, x1: OX + (tx + s.length * scale) * 8 * SC, y1: OY + (ty + 1 * scale) * 8 * SC });
window.TEXTS = t => {
  const f = Math.round(t * 60), o = [];
  if (f < TL.T_FOREST) { o.push({ id: 'logo', text: 'DUSKLIGHT', ...box(7, 6, 'DUSKLIGHT', 2) }, { id: 'sub', text: 'A LAMPLIGHTER TALE', ...box(7, 9, 'A LAMPLIGHTER TALE') }, { id: 'm1', text: 'START', ...box(13, 17, 'START') }, { id: 'm2', text: 'CONTINUE', ...box(13, 19, 'CONTINUE') }, { id: 'm3', text: 'OPTIONS', ...box(13, 21, 'OPTIONS') }); }
  const c = TL.capAt(f); if (c) o.push({ id: 'cap' + c.id, text: c.text, ...box((32 - c.text.length) >> 1, 29, c.text) });
  return o;
};
window.READY = true;
