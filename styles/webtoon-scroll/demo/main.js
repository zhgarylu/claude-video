// "Webtoon Scroll" demo: one tall strip, drawn in code, read by a camera that only scrolls. render(t) is a pure function of t.
import { clamp, seg, ss, hash } from '/core/lib.js';
import { DUR, EV, ev, W, H, PANELS, P, PAGE_H, camAt, speedAt, CUE, anchor, rainAt, FALL } from './timeline.js';
import { C, FONT_BODY, FONT_DISPLAY, rr, ol } from './art.js';
import { DRAW, fallPath } from './panels.js';

const cv = document.getElementById('c'); cv.width = innerWidth; cv.height = innerHeight; const g0 = cv.getContext('2d');
const acc = document.createElement('canvas'); acc.width = W; acc.height = H; const ga = acc.getContext('2d');
let OUT = [];

// ---------------------------------------------------------------- sound events (scheduled once, up front)
{
  const flick = (t, v = 1) => ev(t, 'flick', v);
  [[2.5, .7], [10.0, 1], [17.5, .8], [22.5, .7], [30.625, .8], [50.0, .9], [55.0, 1]].forEach(([t, v]) => flick(t, v));
  ev(CUE.swipe0 + .1, 'swipe'); ev(CUE.logo, 'logo'); ev(CUE.logo + .22, 'logo', .8);
  ev(CUE.narr1, 'narr'); ev(CUE.bal1, 'blip'); ev(CUE.tagSwing, 'tagjingle', .6);
  ev(CUE.click1, 'click'); ev(CUE.no1, 'bwip', .7, { pitch: .9 }); ev(CUE.click2, 'click'); ev(CUE.click2 + .2, 'click'); ev(CUE.no2, 'bwip', 1, { pitch: 1.12 });
  ev(CUE.grr, 'strain', 1); for (let i = 0; i < 4; i++) ev(CUE.grr + .1 + i * .52, 'creak', .8 - i * .08); ev(CUE.fine - .3, 'tugend'); ev(CUE.fine, 'blip', .8);
  ev(CUE.narr2, 'narr'); ev(CUE.think2, 'blip', .8);
  for (let i = 0; i < 12; i++) ev(24.55 + i * .5, 'step', .6 + .3 * hash(i), { side: i % 2 });
  for (let i = 0; i < 2; i++) ev(CUE.pedestrian + i * .5 + .2, 'tsk', 0);
  ev(CUE.slosh, 'splosh', 1);
  ev(CUE.slip, 'slip'); ev(CUE.slip + .12, 'blip', .7);
  ev(33.125, 'whoosh', 1); for (let i = 0; i < 9; i++) ev(FALL.t0 + .1 + i * .335, 'bonk', .9 - i * .02, { pitch: 1.2 - i * .04 });
  ev(CUE.splash, 'splash', 1); ev(CUE.splash, 'impact', 1);
  [38.9, 39.7, 40.6, 41.35].forEach((t, i) => ev(t, 'drip', .7 - i * .12));
  ev(CUE.sun, 'chime', .7); ev(CUE.fwoomp, 'fwoomp'); ev(CUE.fwoomp + .5, 'sparkle');
  ev(45.625, 'thump', 1); ev(CUE.tagIn, 'ding');
  ev(CUE.bwip, 'bwip', .9, { pitch: 1.0, smug: 1 });
  ev(CUE.phone, 'buzz'); ev(CUE.cliffN, 'narr'); ev(CUE.gulp, 'gulp');
  ev(CUE.endBar, 'card'); for (let i = 0; i < 5; i++) ev(CUE.star0 + i * .2, 'star', 1, { pitch: i }); ev(CUE.like, 'like'); ev(CUE.like + .5, 'subpop');
  [CUE.tap0, CUE.tap2].forEach(t => ev(t, 'uiblip', .5));
  for (let i = 0; i <= 240; i++) { const t = i * .25; ev(t, 'rain', +rainAt(t).toFixed(3)); }
  for (let i = 0; i < 600; i++) { const t = i * .1; const v = Math.abs(speedAt(t)); if (v > 20) ev(t, 'speed', +(v / 1500).toFixed(3)); }
  EV.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- one world pass
function drawWorld(g, t, cam, report) {
  const base = g.getTransform(); g.setTransform(base); g.fillStyle = C.page; g.fillRect(0, 0, W, H); g.lineCap = 'round'; g.lineJoin = 'round';
  const overs = [];
  const mk = p => {
    const rep = (id, text, b) => { if (!report) return; const m = g.getTransform(); OUT.push({ id, text, x0: b.x0 * m.a + m.e, y0: b.y0 * m.d + m.f, x1: b.x1 * m.a + m.e, y1: b.y1 * m.d + m.f }); };
    return {
      t, cam, p, camHold: anchor(p.id), camOff: k => cam * k, par: (k, c0) => -(k - 1) * (cam - c0),
      layer: (k, c0, fn) => { g.save(); g.translate(0, -(k - 1) * (cam - c0)); fn(); g.restore(); },
      rep, repL: (id, text, x0, y0, x1, y1) => rep(id, text, { x0, y0, x1, y1 }),
      repW: (id, text, x0, y0, x1, y1) => { if (report) OUT.push({ id, text, x0, y0: y0 - cam, x1, y1: y1 - cam }); },
      over: fn => overs.push(fn),
    };
  };
  for (const p of PANELS) {
    if (p.y + p.h + 120 < cam || p.y - 120 > cam + H) continue;
    g.save(); g.translate(0, -cam);
    const c = mk(p);
    if (p.style === 'ui') { g.translate(p.x, p.y); DRAW[p.id](g, c); g.restore(); continue; }
    if (p.style === 'round') rr(g, p.x, p.y, p.w, p.h, 44); else { g.beginPath(); g.rect(p.x, p.y, p.w, p.h); }
    g.save(); g.clip(); g.translate(p.x, p.y); DRAW[p.id](g, c); g.restore();
    if (p.style === 'round') { rr(g, p.x, p.y, p.w, p.h, 44); g.lineWidth = 12; g.strokeStyle = C.ink; g.stroke(); rr(g, p.x + 12, p.y + 12, p.w - 24, p.h - 24, 34); g.lineWidth = 3; g.strokeStyle = 'rgba(255,253,247,.55)'; g.stroke(); }
    else {                                                                 // borderless: the picture dissolves into the white gutter
      const fade = Math.min(90, p.h * .1);
      if (p.gut > 0) { let gr = g.createLinearGradient(0, p.y, 0, p.y + fade); gr.addColorStop(0, C.page); gr.addColorStop(1, 'rgba(247,245,238,0)'); g.fillStyle = gr; g.fillRect(0, p.y - 1, W, fade + 1); }
      const nxt = PANELS[PANELS.indexOf(p) + 1];
      if (!nxt || nxt.gut > 0) { let gr = g.createLinearGradient(0, p.y + p.h - fade, 0, p.y + p.h); gr.addColorStop(0, 'rgba(247,245,238,0)'); gr.addColorStop(1, C.page); g.fillStyle = gr; g.fillRect(0, p.y + p.h - fade, W, fade + 1); }
    }
    g.restore();
    // things that break out of their panel are drawn over the gutters, in page space
    if (overs.length) { g.save(); g.translate(0, -cam); overs.splice(0).forEach(fn => fn(g)); g.restore(); }
  }
  gutterBits(g, t, cam, report);
}
// small lettering that lives in the gutters
function gutterBits(g, t, cam, report) {
  const rep = (id, text, x0, y0, x1, y1) => { if (report) OUT.push({ id, text, x0, y0: y0 - cam, x1, y1: y1 - cam }); };
  g.save(); g.translate(0, -cam); g.textAlign = 'center'; g.textBaseline = 'middle';
  // pause gutters carry a tiny caption
  const gy = P.sky.y - 280;
  if (t >= CUE.quiet) { const a = ss(seg(t, CUE.quiet, CUE.quiet + .8)); g.globalAlpha = a; g.font = `italic 700 44px ${FONT_BODY}`; g.fillStyle = C.slate; g.fillText('(the rain stops.)', 540, gy); g.globalAlpha = 1; rep('gutter1', '(the rain stops.)', 540 - 190, gy - 28, 540 + 190, gy + 28); }
  const gy2 = P.close.y - 160;
  if (t >= CUE.tagSwing + 4) { const a = ss(seg(t, 10.2, 10.8)); if (t >= 10.2) { g.globalAlpha = a; g.font = `italic 700 40px ${FONT_BODY}`; g.fillStyle = C.slate; g.fillText('drip... drip...', 540, gy2); g.globalAlpha = 1; rep('gutter2', 'drip... drip...', 540 - 150, gy2 - 26, 540 + 150, gy2 + 26); } }
  g.restore();
}
// ---------------------------------------------------------------- the reader's UI, in screen space
function overlay(g, t, cam) {
  const v = speedAt(t); let a = 0; for (const s of [0, .25, .5, .75]) a = Math.max(a, clamp(Math.abs(speedAt(t - s)) / 120) * (1 - s));
  const max = PAGE_H - H, th = 150, ty = 120 + (cam / max) * (H - 240 - th);
  g.save(); g.globalAlpha = a * .55; rr(g, W - 14, ty, 7, th, 4); g.fillStyle = C.ink; g.fill(); g.restore();
  g.fillStyle = C.coral; g.fillRect(0, 0, W * clamp(cam / max), 7);
  // speed lines at the edges while the page whips
  const k = clamp((Math.abs(v) - 600) / 700);
  if (k > 0) { const f = Math.floor(t * 12); g.save(); g.lineCap = 'round';
    for (let i = 0; i < 38; i++) { const side = i % 2 ? 1 : -1, x = side < 0 ? 8 + hash(f * 7 + i) * 150 : W - 8 - hash(f * 7 + i) * 150, y0 = hash(f * 3 + i * 2) * H, len = 260 + hash(f + i * 5) * 520;
      g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 + len); g.strokeStyle = `rgba(27,35,64,${.55 * k})`; g.lineWidth = 3 + hash(i + f) * 5; g.stroke(); }
    g.restore(); }
  // micro-UI glimpsed at the edge: swipe hint, tap to continue
  const pill = (id, text, t0, t1, bob, y) => {
    if (t < t0 || t > t1) return; const al = ss(seg(t, t0, t0 + .4)) * (1 - ss(seg(t, t1 - .4, t1))), by = Math.sin(t * 5) * bob;
    g.save(); g.globalAlpha = al * .92; g.font = `700 30px ${FONT_BODY}`; g.letterSpacing = '3px'; const w = g.measureText(text).width + 100, x = 540 - w / 2;
    rr(g, x, y - 36, w, 72, 36); g.fillStyle = 'rgba(27,35,64,.82)'; g.fill(); g.fillStyle = C.white; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 540 - 20, y + 2);
    g.beginPath(); g.moveTo(x + w - 62, y - 7 + by); g.lineTo(x + w - 50, y + 7 + by); g.lineTo(x + w - 38, y - 7 + by); g.strokeStyle = C.white; g.lineWidth = 5; g.stroke(); g.letterSpacing = '0px'; g.restore();
    if (al > .5) OUT.push({ id, text, x0: x + 50, y0: y - 18, x1: x + w - 66, y1: y + 18 });
  };
  pill('swipe', 'SWIPE UP', CUE.swipe0, CUE.swipe1, 6, 1810);
  pill('tap1', 'TAP TO CONTINUE', CUE.tap0, CUE.tap1 + .4, 5, 1810); pill('tap2', 'TAP TO CONTINUE', CUE.tap2, CUE.tap3 + .6, 5, 1810);
}

// ---------------------------------------------------------------- frame
function wide(g, t) {                                                     // the 16:9 gallery card: three screens of the same strip side by side
  g.setTransform(1, 0, 0, 1, 0, 0); const w = 1920, h = 1080; g.fillStyle = '#161c33'; g.fillRect(0, 0, w, h);
  const S = h / H, cw = W * S, gap = (w - cw * 3) / 4;
  [[9.2, anchor('hall') + 20], [34.6, camAt(34.6)], [47.9, anchor('punch') + 24]].forEach(([tt, cam], i) => {
    g.save(); g.translate(gap + i * (cw + gap), 0); g.scale(S, S); g.beginPath(); g.rect(0, 0, W, H); g.clip(); drawWorld(g, tt, cam, false);
    g.restore();
  });
}
function render(t) {
  OUT = [];
  if (innerWidth > innerHeight) { wide(g0, t); return; }
  const cam = camAt(t), v = Math.abs(speedAt(t));
  if (v > 850) {
    const n = 7, sh = Math.min(.07, .045 + (v - 850) / 14000);
    g0.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < n; i++) { const tt = t + (i / (n - 1) - .5) * sh; drawWorld(ga, tt, camAt(tt), i === (n - 1) / 2); g0.globalAlpha = 1 / (i + 1); g0.drawImage(acc, 0, 0); }
    g0.globalAlpha = 1;
  } else drawWorld(g0, t, cam, true);
  g0.setTransform(1, 0, 0, 1, 0, 0); overlay(g0, t, cam);
}
window.DUR = DUR; window.EV = EV; window.render = render;
window.TEXTS = t => { render(t); return OUT; };
(async () => {
  try { await Promise.all([document.fonts.load('700 40px "Comic Neue"'), document.fonts.load('italic 700 40px "Comic Neue"'), document.fonts.load('400 40px "Comic Neue"'), document.fonts.load('40px Bangers')]); } catch (e) { }
  render(0); window.READY = true;
})();
