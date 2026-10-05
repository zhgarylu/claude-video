// "Day 3: I will not kill this starter": a first sourdough, watched by a crowd of bullet comments.
// t = film seconds; tau = the player's own clock (it stops during the pause).
import { seg, ss } from '/core/lib.js';
import { DUR, BAR, VID, tauOf, filmOf, camTrack, commentZoom, K, POPS, PAUSE, CHAPTERS, Q } from './timeline.js';
import { layout, posOf, drawComment, FONT_LOAD } from './comments.js';
import { drawBack, drawWorld, drawSubjects, CRACKS } from './scene.js';
import { drawChrome, uiTexts } from './ui.js';

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
window.DUR = DUR; window.EV = [];
let LIST = [];
const camOf = tau => { const [cx, cy, z] = camTrack(tau); return { cx, cy, z }; };
const maskOf = tau => ss(seg(tau, 35.4, 36.2)) * (1 - ss(seg(tau, 51.1, 51.7)));

window.render = t => {
  const tau = tauOf(t), cam = camOf(tau), cz = commentZoom(tau)[0];
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  drawBack(ctx, tau, cam);
  ctx.save(); ctx.translate(960, 540); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy); drawWorld(ctx, tau, cam); ctx.restore();
  const warm = 0.12 * ss(seg(tau, 28.5, 33.6)) * (1 - ss(seg(tau, 34.6, 35.4)));
  if (warm > 0) { ctx.fillStyle = `rgba(255,140,50,${warm})`; ctx.fillRect(0, 0, 1920, 1080); }
  ctx.fillStyle = 'rgba(4,8,12,0.10)'; ctx.fillRect(0, 0, 1920, 1080);
  // the crowd
  ctx.save(); ctx.beginPath(); ctx.rect(0, 100, 1920, 868); ctx.clip();      // the crowd keeps to the picture area, also when it is zoomed
  ctx.translate(960, 520); ctx.scale(cz, cz); ctx.translate(-960, -520);
  let n = 0;
  for (const c of LIST) { if (tau >= c.t0) n++; const p = posOf(c, tau); if (p) drawComment(ctx, c, p); }
  ctx.restore();
  // the subject shows through the crowd
  const m = maskOf(tau);
  if (m > 0.01) { ctx.save(); ctx.globalAlpha = m; ctx.translate(960, 540); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy); drawSubjects(ctx, tau, cam); ctx.restore(); }
  // light: vignette
  const g = ctx.createRadialGradient(960, 520, 480, 960, 540, 1250); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.38)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
  drawChrome(ctx, tau, t, n);
};

window.TEXTS = t => {
  const tau = tauOf(t), cz = commentZoom(tau)[0], out = [];
  for (const c of LIST) {
    const p = posOf(c, tau); if (!p) continue;
    const x0 = (p.x + 4 - 960) * cz + 960, x1 = (p.x + c.w - 4 - 960) * cz + 960, y0 = (c.y - c.fs * 0.6 - 520) * cz + 520, y1 = (c.y + c.fs * 0.6 - 520) * cz + 520;
    if (x1 < 0 || x0 > 1920) continue;
    if (y0 < 100 || y1 > 968) { out.push({ id: c.id, text: c.text, x0, y0: Math.min(y0, -1), x1, y1 }); continue; }   // clipped by the crowd's frame: reported as not fully in frame
    out.push({ id: c.id, text: c.text, x0, y0, x1, y1 });
  }
  return out.concat(uiTexts(ctx, tau));
};

function buildEvents() {
  const ev = [], F = filmOf;
  for (const c of LIST) if (c.t0 >= 0) ev.push({ t: +F(c.t0).toFixed(4), type: c.kind === 'pin' ? 'pin' : 'bullet', role: c.role, size: c.fs, lane: c.lane, chars: c.chars, n: +c.id.slice(1) });
  for (const p of POPS) ev.push({ t: F(p), type: 'pop' });
  ev.push({ t: F(K.levelUp0 - 0.1), type: 'band' });
  ev.push({ t: F(K.flour0), type: 'flour', dur: K.flour1 - K.flour0 }); ev.push({ t: F(K.water0), type: 'pour', dur: K.water1 - K.water0 });
  for (let a = K.stir0; a < K.stir1; a += 1.013) ev.push({ t: F(a), type: 'stir' });
  K.folds.forEach((tf, i) => { ev.push({ t: F(tf - 1.3), type: 'stretch' }); ev.push({ t: F(tf), type: 'fold', n: i }); });
  for (let a = 25.5; a < 33.5; a += Q * 2) ev.push({ t: F(a), type: 'tick', n: Math.round((a - 25.5) / (Q * 2)) });
  ev.push({ t: F(K.poke0 + 0.3), type: 'poke' });
  ev.push({ t: F(35.5), type: 'oven' }); ev.push({ t: F(K.spring0), type: 'spring', dur: K.spring1 - K.spring0 });
  ev.push({ t: F(K.wall0), type: 'wall', dur: K.wall1 - K.wall0 });
  for (const k of CRACKS) ev.push({ t: F(k.t), type: 'crack', u: k.u });
  ev.push({ t: PAUSE.at, type: 'pause' }); ev.push({ t: PAUSE.at + PAUSE.len, type: 'resume' });
  ev.push({ t: F(K.cut0), type: 'cut', dur: K.cut1 - K.cut0 }); ev.push({ t: F(K.turn0), type: 'turn' });
  ev.push({ t: F(K.press0), type: 'press', dur: K.burst - K.press0 }); ev.push({ t: F(K.burst), type: 'burst' });
  for (let i = 0; i < 14; i++) ev.push({ t: F(K.type0 + (K.send - 0.25 - K.type0) * (i + 1) / 15), type: 'type', n: i });
  ev.push({ t: F(K.send), type: 'send' });
  for (const ch of CHAPTERS.slice(1)) ev.push({ t: F(ch.a), type: 'chapter' });
  ev.push({ t: F(K.payoff), type: 'payoff' });
  ev.push({ t: 0, type: 'meta', K, BAR, PAUSE, VID });
  ev.sort((a, b) => a.t - b.t); return ev;
}

(async () => {
  try { for (const f of FONT_LOAD) await document.fonts.load(f); await document.fonts.ready; } catch (e) { }
  LIST = layout(ctx); window.EV = buildEvents();
  window.READY = true;
})();
