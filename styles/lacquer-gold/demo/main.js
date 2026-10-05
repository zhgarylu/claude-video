// "Thirty Coats": one lid, thirty coats, then the gold. t = film seconds (timeline.js).
import { W, H, mk, ctx2, clamp, lerp, ss, seg, ramp, windowSprite, seal } from './lacq.js';
import { T, DUR, EV, VO } from './timeline.js';
import { drawDrop, drawPanel, drawSection, wipeComposite, goldText } from './scenes.js';
import { renderLid, drawTurned } from './lid.js';

const cv = document.getElementById('c'), out = cv.getContext('2d');
const bufB = mk(), gB = ctx2(bufB), bufL = mk(), gL = ctx2(bufL);
const q = new URLSearchParams(location.search);
let SUBS = [];

// ---------------------------------------------------------------- subtitles: an inscription plate of black lacquer
const SUBY = 990;
function plate(g, s, t) {
  const dt = t - s.t0, a = ss(dt / .3) * (1 - ss((t - (s.t1 - .25)) / .25));
  if (a <= 0) return;
  g.save(); g.font = '500 italic 52px Cormorant, serif'; g.letterSpacing = '1px';
  const w = g.measureText(s.text).width, pw = w + 120, ph = 82, x = (W - pw) / 2, y = SUBY - 52 - (1 - ss(dt / .3)) * 6;
  g.globalAlpha = a;
  const bg = g.createLinearGradient(0, y, 0, y + ph); bg.addColorStop(0, 'rgba(18,11,9,.88)'); bg.addColorStop(1, 'rgba(6,4,3,.9)');
  g.fillStyle = bg; g.beginPath(); g.roundRect(x, y, pw, ph, 10); g.fill();
  g.strokeStyle = 'rgba(236,199,102,.75)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 14, y + .5); g.lineTo(x + pw - 14, y + .5); g.stroke();
  g.strokeStyle = 'rgba(236,199,102,.28)'; g.beginPath(); g.moveTo(x + 14, y + ph - .5); g.lineTo(x + pw - 14, y + ph - .5); g.stroke();
  // little key-fret ends
  g.strokeStyle = 'rgba(236,199,102,.8)'; g.lineWidth = 1.6;
  for (const sx of [x + 22, x + pw - 22]) { const d = sx < W / 2 ? 1 : -1; g.beginPath(); g.moveTo(sx, y + 56); g.lineTo(sx, y + 26); g.lineTo(sx + d * 20, y + 26); g.lineTo(sx + d * 20, y + 48); g.lineTo(sx + d * 9, y + 48); g.lineTo(sx + d * 9, y + 37); g.stroke(); }
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 4; g.shadowOffsetY = 2;
  const tg = g.createLinearGradient(0, y + 14, 0, y + 64); tg.addColorStop(0, '#fff0be'); tg.addColorStop(1, '#e2b756');
  g.fillStyle = tg; g.fillText(s.text, W / 2, y + 56);
  g.restore();
}
const subAt = t => SUBS.find(s => t >= s.t0 && t < s.t1);

// ---------------------------------------------------------------- title and seal
const TITLE = 'Thirty Coats';
function title(g, t) {
  const k = ss(seg(t, T.title0, T.title0 + 1.6)); if (k <= 0) return;
  g.save();
  g.beginPath(); g.rect(0, 0, W * k * 1.1, H); g.clip();
  goldText(g, TITLE, W / 2, 520, 132, { align: 'center', weight: 500, spacing: 11 });
  g.restore();
  const rk = ss(seg(t, T.title0 + .9, T.title0 + 2.0));
  if (rk > 0) {
    g.save(); g.strokeStyle = '#d6a842'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(W / 2 - 250 * rk, 566); g.lineTo(W / 2 + 250 * rk, 566); g.stroke();
    g.strokeStyle = 'rgba(255,240,190,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(W / 2 - 250 * rk, 565); g.lineTo(W / 2 + 250 * rk, 565); g.stroke(); g.restore();
  }
}
function stamp(g, t) {
  const dt = t - T.seal; if (dt < 0) return;
  const k = ss(dt / .12), s = lerp(1.35, 1, k), a = clamp(dt / .1);
  g.save(); g.translate(1330, 760); g.rotate(-.04); g.scale(s, s);
  g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 14 * (1 - k) + 6; g.shadowOffsetY = 6 * (1 - k) + 2;
  seal(g, 0, 0, 92, a); g.restore();
}

// ---------------------------------------------------------------- frame
function scene(g, t) {
  const inW = (w) => t >= w[0] && t < w[1], pw = w => ramp(t, w[0], w[1]);
  if (t < T.wipe1[0]) return drawDrop(g, t);
  if (inW(T.wipe1)) { drawDrop(g, t); drawPanel(gB, t); return wipeComposite(g, bufB, pw(T.wipe1)); }
  if (t < T.wipe2[0]) return drawPanel(g, t);
  if (inW(T.wipe2)) { drawPanel(g, t); drawSection(gB, t); return wipeComposite(g, bufB, pw(T.wipe2)); }
  if (t < T.wipe3[0]) return drawSection(g, t);
  if (inW(T.wipe3)) { drawSection(g, t); renderLid(gB, t); return wipeComposite(g, bufB, pw(T.wipe3), 1, true); }
  const st = renderLid(t >= T.turn0 && t < T.turn1 + .05 ? gL : g, t);
  if (t >= T.turn0 && t < T.turn1 + .05) drawTurned(g, bufL, st.turn);
}
window.DUR = DUR;
window.EV = EV;
window.TEXTS = t => {
  const r = [], s = subAt(t);
  if (s) r.push({ id: s.id, text: s.text, x0: 400, y0: SUBY - 52, x1: 1520, y1: SUBY + 22 });
  if (t >= T.title0 + 1.7) r.push({ id: 'title', text: TITLE, x0: 560, y0: 410, x1: 1360, y1: 540 });
  return r;
};
window.render = t => {
  out.setTransform(1, 0, 0, 1, 0, 0);
  scene(out, t);
  out.setTransform(1, 0, 0, 1, 0, 0);
  if (!q.get('notitle')) { title(out, t); stamp(out, t); }
  if (!q.get('nosub')) { const s = subAt(t); if (s) plate(out, s, t); }
  // glassy vignette over everything
  const vg = out.createRadialGradient(960, 540, 560, 960, 540, 1250); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.32)'); out.fillStyle = vg; out.fillRect(0, 0, W, H);
};
(async () => {
  try {
    if (!q.get('nosub')) { const r = await fetch('subs.json'); if (r.ok) SUBS = await r.json(); }
    await Promise.all(['500 46px Cormorant', 'italic 500 46px Cormorant', '600 30px Cormorant'].map(f => document.fonts.load(f)));
  } catch (e) { /* subtitles are optional for stills */ }
  window.READY = true;
})();
