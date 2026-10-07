// "Era Scroll Walk" demo: The Birth of a Phone. One strip, nine eras, one courier. render(t) is a pure function of t.
import { clamp, lerp, seg, ss, eo, hash } from '/core/lib.js';
import { W, H, GY, WSX, V, BEAT, FRONT, DUR, EV, ev, LINES, S, E, C, B, Wd, T, wxAt, PLATES, plateSwap, T_STOP, TS, T_LIFT, T_GRID, T_END, WX_END } from './timeline.js';
import { drawWorld, burst, plate, walker, rr, tagCard, hex } from './scroll.js';
import { cave, tablet, wood, press } from './eras1.js';
import { wire, phone } from './eras2.js';
import { brick, sms, now } from './eras3.js';

const cv = document.getElementById('c'); cv.width = innerWidth; cv.height = innerHeight; const g = cv.getContext('2d');
const SANS = 'Noto Sans SC', SERIF = 'Noto Serif SC';
await Promise.all([document.fonts.load(`700 50px "${SERIF}"`, '约年前泥板手印我来过'), document.fonts.load(`500 40px "${SANS}"`, '约年前泥板手印我来过'), document.fonts.load('700 40px UnifrakturCook', 'In principio'), document.fonts.load('20px "Press Start 2P"', 'MERRY')]);

export const ERAS = [cave, tablet, wood, press, wire, phone, brick, sms, now];
// thumbnails of every era (gallery on the phone): each painter drawn alone at a representative moment, once
let SNAPS = null;
const SNAP_T = [9.3, C[2] + 2.6, C[3] + 3.0, C[4] + 2.4, C[5] + 3.3, C[6] + 2.6, C[7] + 2.6, C[8] + 3.2, TS - .1];
now.snap = () => {
  if (SNAPS) return SNAPS; SNAPS = [];
  ERAS.forEach((e, k) => { const cv2 = document.createElement('canvas'); cv2.width = 960; cv2.height = 540; const sg = cv2.getContext('2d'); sg.scale(.5, .5); const tk = SNAP_T[k]; drawWorld(sg, { t: tk, wx: wxAt(tk), eras: [e], zoom: 1 }); SNAPS.push(cv2); });
  return SNAPS;
};
ERAS.forEach((e, i) => { e.x0 = B[i]; e.w = Wd[i]; e.idx = i; });
let TXT = [];

// ------------------------------------------------------------------ sound events, scheduled once
{
  for (const l of LINES) ev(S[l.id], 'voice', 1, { id: l.id });
  // footsteps on the beat grid: one every half beat while walking; the surface comes from the era underfoot
  for (let n = 0; n * BEAT / 2 < T_STOP - .05; n++) { const t = n * BEAT / 2, wx = V * t; let k = 0; ERAS.forEach((e, i) => { if (wx + 0 >= e.x0) k = i; }); ev(t, 'step', .55 + .25 * hash(n * 1.7), { surf: ERAS[k].step, side: n % 2 }); }
  for (let k = 1; k < 9; k++) { ev(C[k + 1] - FRONT / V, 'tear', 1, { era: ERAS[k].id }); ev(plateSwap(k), 'plate', .8); }
  ERAS.forEach((e, k) => e.events && e.events(k));
  ev(T_STOP, 'stop', .6);
  EV.sort((a, b) => a.t - b.t);
}

// ------------------------------------------------------------------ camera: constant pace, with push-ins at the gags
const zoomAt = t => {
  let z = 1;
  ERAS.forEach((e, k) => { if (!e.push) return; const a = e.push.t0 ?? C[k + 1] + e.push.b0 * BEAT, b = e.push.t1 ?? C[k + 1] + e.push.b1 * BEAT; z = Math.max(z, 1 + (e.push.z - 1) * ss(seg(t, a - .7, a)) * (1 - ss(seg(t, b, b + .8)))); });
  if (t > TS - .5) z = Math.max(z, 1 + .22 * ss(seg(t, TS - .5, TS + 1.0)) * (1 - ss(seg(t, T_LIFT - .6, T_LIFT + .6))));
  return z;
};

// ------------------------------------------------------------------ subtitles (voice-synced, exported as .srt by mix.py)
function subtitle(t) {
  const l = LINES.find(l => t >= S[l.id] - .05 && t <= E[l.id] + .45); if (!l) return;
  let text = l.text, a = Math.min(1, (t - S[l.id] + .05) / .15, (E[l.id] + .45 - t) / .2);
  g.save(); g.globalAlpha = clamp(a); g.font = `600 44px "${SANS}"`; g.textAlign = 'center'; g.textBaseline = 'middle';
  let lines = [text]; if (g.measureText(text).width > 1500) { const m = text.length / 2; let best = -1; [...text].forEach((ch, i) => { if ('，。：、？！'.includes(ch) && (best < 0 || Math.abs(i - m) < Math.abs(best - m))) best = i; }); if (best > 0) lines = [text.slice(0, best + 1), text.slice(best + 1)]; }
  const w = Math.max(...lines.map(s => g.measureText(s).width)) + 64, h = lines.length * 62 + 20, y0 = 1010 - h / 2;
  g.fillStyle = 'rgba(22,16,12,.62)'; g.beginPath(); rr(g, 960 - w / 2, y0 - h / 2 + 10, w, h, 22); g.fill();
  g.fillStyle = '#fff8ea'; lines.forEach((s, i) => g.fillText(s, 960, y0 + (i - (lines.length - 1) / 2) * 62 + 10));
  g.restore();
}

// ------------------------------------------------------------------ one frame
function frame(t) {
  TXT = [];
  const wx = wxAt(t), zoom = zoomAt(t), fin = t > TS + .2;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#1b1410'; g.fillRect(0, 0, W, H);
  const ctxs = drawWorld(g, { t, wx, eras: ERAS, zoom, zy: 640 });
  // era particles at the edge
  for (let k = 1; k < 9; k++) burst(g, ERAS[k], t - (C[k + 1] - FRONT / V), wx, k * 7.7, zoom);
  now.overlay(g, t, wx, ctxs[8], zoom);
  { const tb = sms.textBox(ctxs[7] || { gp: () => 0 }); if (tb && ctxs[7]) TXT.push({ id: 'smstext', ...tb }); if (now._msgBox) TXT.push({ id: 'msgtext', text: '我来过', ...now._msgBox }); }
  // year plate
  let pk = 0; for (let k = 1; k < 9; k++) if (t >= plateSwap(k)) pk = k;
  const ps = pk ? seg(t, plateSwap(pk), plateSwap(pk) + .6) : 1, pa = 1 - ss(seg(t, T_LIFT - .2, T_LIFT + .4));
  if (pa > 0) {
    g.save(); g.globalAlpha = pa; plate(g, PLATES[pk], pk ? PLATES[pk - 1] : null, ps, { serif: SERIF, sans: SANS }); g.restore();
    if (pa > .99) { const e = PLATES[pk]; TXT.push({ id: 'py' + pk, text: e.y, x0: 1566, y0: 52, x1: 1866, y1: 110 }, { id: 'pc' + pk, text: e.c, x0: 1566, y0: 112, x1: 1866, y1: 138 }); }
  }
  subtitle(t);
  // end card
  const ec = ss(seg(t, T_END, T_END + .5));
  if (ec > 0) {
    g.save(); g.globalAlpha = ec; g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, W, H); g.restore();
    g.save(); g.globalAlpha = ec; g.textAlign = 'center'; g.fillStyle = '#2b2118'; g.font = `700 120px "${SERIF}"`; g.fillText('一部手机的诞生', 960, 520);
    g.font = `500 36px "${SANS}"`; g.fillStyle = '#6a5640'; g.fillText('一条口信，走过四万年', 960, 600); g.font = `500 28px "${SANS}"`; g.fillStyle = '#8a7358'; g.fillText('https://zhgarylu.github.io/claude-video/gallery/', 960, 940);
    g.restore();
    if (ec > .99) TXT.push({ id: 'end1', text: '一部手机的诞生', x0: 360, y0: 420, x1: 1560, y1: 540 }, { id: 'end2', text: '一条口信，走过四万年', x0: 600, y0: 566, x1: 1320, y1: 610 }, { id: 'end3', text: 'https://zhgarylu.github.io/claude-video/gallery/', x0: 560, y0: 912, x1: 1360, y1: 954 });
  }
}

window.DUR = DUR; window.EV = EV;
window.render = t => { frame(Math.max(0, Math.min(DUR, t))); };
window.TEXTS = t => { window.render(t); return TXT; };
window.READY = true;
