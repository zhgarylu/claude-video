// "Mango Lane: Mega Markdown": page contract (READY, DUR, EV, render, TEXTS), the punch-zoom camera, starburst wipes and flash cuts.
import { clamp, lerp, seg, hash, TAU } from '/core/lib.js';
import { DUR, SC, sceneAt, WIPES, FLASH, T, CELLS, CELLS_END } from './timeline.js';
import { SCENES } from './scenes.js';
import { REC, starPath, C } from './draw.js';

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
window.DUR = DUR;

// ------------------------------------------------------------------ hits: one list drives the camera punches and the sound events
// [time, event type, zoom punch, shake px, extra fields]. A slam lands 0.09 s after it starts (0.12 for cards): the hit is the landing.
const HITS = [];
const hit = (t, type, kz = 0.03, sh = 4, x = {}) => HITS.push({ t, type, kz, sh, ...x });
const L = 0.09;
(() => {
  const i = T.intro, k = T.kettle, b = T.bundle, s = T.stock, c = T.coupon, a = T.cart, g = T.grid, o = T.count, l = T.live, z = T.cta;
  hit(i.burst + L, 'impact', 0.07, 14, { w: 3 }); hit(i.name + L, 'slam', 0.04, 8, { w: 3 }); hit(i.band + L, 'slam', 0.03, 6, { w: 2 }); hit(i.sticker + L, 'sticker', 0.03, 6); hit(i.date + L, 'slam', 0.03, 5, { w: 2 });
  hit(k.card + 0.12, 'slam', 0.03, 8, { w: 3 }); hit(k.was + L, 'slam', 0.02, 4, { w: 1 }); hit(k.strike, 'strike', 0, 0); hit(k.strike + 0.14, 'strikehit', 0.04, 8); hit(k.now + L, 'price', 0.06, 12, { w: 3 }); hit(k.badge + L, 'sticker', 0.03, 6);
  hit(b.cardL + 0.12, 'slam', 0.03, 7, { w: 3, pan: -0.5 }); hit(b.cardR + 0.12, 'slam', 0.03, 7, { w: 3, pan: 0.5 }); hit(b.plus + L, 'plus', 0.05, 8); hit(b.tagNew + L, 'sticker', 0.03, 6); hit(b.twoFor + L, 'slam', 0.03, 6, { w: 2 }); hit(b.was + L, 'slam', 0.02, 4, { w: 1 });
  hit(b.strike, 'strike', 0, 0); hit(b.strike + 0.14, 'strikehit', 0.04, 8); hit(b.now + L, 'price', 0.06, 12, { w: 3 }); hit(b.now + L, 'sticker', 0.03, 6);
  hit(s.card + 0.12, 'slam', 0.03, 8, { w: 3 }); hit(s.was + L, 'slam', 0.02, 4, { w: 1 }); hit(s.strike, 'strike', 0, 0); hit(s.strike + 0.14, 'strikehit', 0.04, 8); hit(s.now + L, 'price', 0.06, 12, { w: 3 }); hit(s.badge + L, 'sticker', 0.03, 6);
  hit(s.bar, 'bar', 0, 0);
  for (let j = 0; j <= s.drainN; j++) { const tt = s.drain0 + j * s.drainStep, f = j / s.drainN; hit(tt, 'cell', 0.008 + 0.012 * f, 2 + 8 * f, { n: j, f }); }
  hit(s.only + L, 'only', 0.08, 18, { w: 3 }); hit(s.limited + L, 'sticker', 0.04, 8);
  hit(c.slam + 0.1, 'slam', 0.05, 10, { w: 3 }); hit(c.extra + L, 'slam', 0.02, 4, { w: 1 }); hit(c.off + L, 'price', 0.06, 12, { w: 3 }); hit(c.code + L, 'slam', 0.02, 5, { w: 1 });
  hit(c.peel, 'peel', 0, 0, { dur: c.rip - c.peel }); hit(c.rip, 'rip', 0.07, 16); hit(c.fine + 0.12, 'slam', 0.02, 3, { w: 1 }); hit(c.shine, 'shine', 0, 0);
  a.rows.forEach(r => hit(r + 0.1, 'row', 0.015, 3)); hit(a.total + L, 'slam', 0.03, 5, { w: 2 }); hit(a.strike + 0.12, 'strikehit', 0.03, 6); hit(a.newTotal + L, 'price', 0.05, 10, { w: 3 }); hit(a.save + L, 'ring', 0.08, 16); hit(a.save + 0.06, 'coins', 0, 0);
  hit(g.banner + L, 'slam', 0.03, 6, { w: 2 }); g.cards.forEach((q, n) => { hit(q + L, 'slam', 0.015, 4, { w: 1, pan: [-0.5, 0, 0.5][n % 3] }); hit(q + g.strikeLag + 0.12, 'strikehit', 0, 0, { soft: 1 }); });
  hit(o.label + L, 'slam', 0.03, 5, { w: 2 });
  for (let n = 0; n < 6; n++) { const tt = o.clock0 + n; hit(tt, 'tick', n >= 3 ? 0.07 : 0.045, n >= 3 ? 10 : 5, { n, last: n >= 3 ? 1 : 0 }); }
  for (const tt of [37.5, 38.5, 39.5]) hit(tt, 'tick2', 0.02, 3, { n: 0 });
  hit(l.burst, 'boom', 0.1, 22); hit(l.title + L, 'slam', 0.06, 14, { w: 3 }); hit(l.sub + L, 'slam', 0.03, 6, { w: 2 }); hit(l.burst, 'confetti', 0, 0); hit(l.burst + 0.25, 'coins', 0, 0); hit(l.burst, 'horn', 0, 0);
  hit(z.name + L, 'slam', 0.04, 8, { w: 3 }); hit(z.offer + L, 'slam', 0.03, 6, { w: 3 }); hit(z.dates + L, 'slam', 0.03, 5, { w: 2 }); hit(z.button + 0.09, 'slam', 0.04, 8, { w: 3 }); hit(z.url + 0.12, 'slam', 0.02, 3, { w: 1 });
  hit(z.cursor0, 'cursor', 0, 0, { dur: z.click - 0.12 - z.cursor0 }); hit(z.click, 'click', 0.06, 10); hit(z.click + 0.02, 'confetti', 0, 0);
  for (const w of WIPES) hit(w.t - 0.14, 'wipe', 0, 0, { dur: 0.32 });
  for (const f of FLASH) hit(f, 'cut', 0.04, 6);
  HITS.sort((x, y) => x.t - y.t);
})();

// ------------------------------------------------------------------ camera: punch zoom + shake. No smooth moves, no pans.
function camera(t) {
  let z = 1, sx = 0, sy = 0;
  for (const h of HITS) {
    if (t < h.t || (h.kz === 0 && h.sh === 0)) continue; const u = t - h.t; if (u > 0.5) continue;
    const e = Math.exp(-u * 10); z += h.kz * e; const a = h.sh * e, f = Math.floor(t * 24);
    sx += (hash(f * 3.1 + h.t * 7) * 2 - 1) * a; sy += (hash(f * 5.7 + h.t * 13) * 2 - 1) * a;
  }
  return { z: Math.min(z, 1.1), sx, sy };
}

function overlay(ctx, t) {
  for (const w of WIPES) {
    let r = 0; if (t >= w.t - 0.14 && t < w.t) r = lerp(0, 1, (t - (w.t - 0.14)) / 0.14); else if (t >= w.t && t < w.t + 0.18) r = 1 - (t - w.t) / 0.18; else continue;
    ctx.save(); ctx.translate(960, 540); ctx.rotate(t * 3); starPath(ctx, 14, 2400 * r * r, 1500 * r * r); ctx.fillStyle = w.col; ctx.fill(); ctx.restore();
  }
  for (const f of FLASH) if (t >= f && t < f + 0.083) { ctx.fillStyle = `rgba(255,250,230,${t < f + 0.042 ? 0.85 : 0.4})`; ctx.fillRect(0, 0, 1920, 1080); }
}

window.render = t => {
  REC.length = 0;
  const sc = sceneAt(t), cam = camera(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = C.ink; ctx.fillRect(0, 0, 1920, 1080);
  ctx.save(); ctx.translate(960 + cam.sx, 540 + cam.sy); ctx.scale(cam.z, cam.z); ctx.translate(-960, -540);
  SCENES[sc.id](ctx, t);
  ctx.restore();
  overlay(ctx, t);
};

// TEXTS: render the frame, then return what the scenes recorded. Texts are dropped for the last 0.14 s of a scene that is covered by a wipe.
window.TEXTS = t => {
  window.render(t);
  const sc = sceneAt(t), covered = WIPES.some(w => Math.abs(sc.b - w.t) < 1e-6) && t > sc.b - 0.14, flash = FLASH.some(f => t >= f && t < f + 0.083), early = WIPES.some(w => t >= w.t && t < w.t + 0.18);
  if (covered || flash || early) return [];
  return REC.map(r => ({ ...r, id: sc.id + ':' + r.id }));
};

(async () => {
  try { for (const f of ['100px Anton', '800 60px "Barlow Condensed"', '700 60px "Barlow Condensed"']) await document.fonts.load(f); await document.fonts.ready; } catch (e) { }
  window.EV = HITS.map(h => ({ t: +h.t.toFixed(4), type: h.type, ...(h.w ? { w: h.w } : {}), ...(h.pan ? { pan: h.pan } : {}), ...(h.n !== undefined ? { n: h.n } : {}), ...(h.f !== undefined ? { f: h.f } : {}), ...(h.dur ? { dur: h.dur } : {}), ...(h.last ? { last: 1 } : {}), ...(h.soft ? { soft: 1 } : {}) }));
  window.READY = true;
})();
