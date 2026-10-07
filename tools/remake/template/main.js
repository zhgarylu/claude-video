// Exact-remake page: everything comes from spec.json (see REMAKE.md, "The spec file").
//   shots[]     footage segments of src/frames placed on the timeline (cuts, trims, reorder, speed)
//   captions[]  live text, timed by WORDS (from/to anchors) with seconds as a fallback; may also paint over the source's burned-in text (erase: "cover")
//   overlays[]  rect / image elements
// Time maps: film time -> shot -> source time (footage, covers, word anchors). Deterministic: window.render(t) draws the same pixels every time.
import { openFrames } from '/tools/remake/frames.js';

const spec = await fetch('spec.json').then(r => r.json());
const W = spec.canvas.w, H = spec.canvas.h, cv = document.getElementById('c'); cv.width = W; cv.height = H;
const ctx = cv.getContext('2d', { willReadFrequently: true });
await Promise.all((spec.fonts || []).map(f => new FontFace(f.family, `url(${f.file})`, { weight: f.weight || '400' }).load().then(ff => document.fonts.add(ff))));
const fr = await openFrames(spec.frames.base || 'src');
const shots = spec.shots, words = spec.words || [], caps = spec.captions || [], ovs = spec.overlays || [];
const shotLen = s => (s.src_t1 - s.src_t0) / (s.speed || 1);
let end = 0; for (const s of shots) end = Math.max(end, s.t0 + shotLen(s));
const QS = new URLSearchParams(location.search), NOCAP = QS.has('nocaptions');

const shotAt = t => shots.find(s => t >= s.t0 - 1e-6 && t < s.t0 + shotLen(s) - 1e-6) || null;
const srcOf = (s, t) => s.src_t0 + (t - s.t0) * (s.speed || 1);
function srcToFilm(ts, tol = 0) { const s = shots.find(s => ts >= s.src_t0 - 1e-6 && ts < s.src_t1 + tol); return s ? s.t0 + (ts - s.src_t0) / (s.speed || 1) : null; }
function anchorTime(a) {
  if (!a) return null;
  if (a.word != null && words[a.word]) { const w = words[a.word], ts = (a.edge === 'end' ? w.t1 : w.t0) + (a.off || 0); return srcToFilm(ts) ?? srcToFilm(ts, 0.05); }
  if (a.shot != null && shots[a.shot]) return shots[a.shot].t0 + (a.off || 0);
  return null;
}
// word-anchored timing; a caption whose words were cut out of the timeline is hidden (one that starts before a cut but ends inside the film starts at 0)
const times = c => {
  if (c.lock || (!c.from && !c.to)) return [c.t0, c.t1];
  let a = anchorTime(c.from), b = anchorTime(c.to);
  if (c.from && a == null && b != null) a = 0;
  return a == null || b == null ? [-1, -1] : [a, b];
};
const tm = caps.map(times);

function setFont(c, size) { ctx.font = `${c.weight || 400} ${size}px "${c.family}", sans-serif`; }
function fitSize(c) { setFont(c, c.size); const w = ctx.measureText(c.text).width; return c.max_w && w > c.max_w ? c.size * c.max_w / w : c.size; }

// paint over the source's own burned-in text: a horizontal gradient per row, sampled from just left and right of the box (no inpainting)
function cover(c) {
  const p = c.cover_pad ?? 6, x0 = Math.max(4, Math.round(c.box.x - p)), x1 = Math.min(W - 4, Math.round(c.box.x + c.box.w + p)), y0 = Math.max(0, Math.round(c.box.y - p)), y1 = Math.min(H, Math.round(c.box.y + c.box.h + p));
  const w = x1 - x0, h = y1 - y0; if (w < 8 || h < 2) return;
  const L = ctx.getImageData(x0 - 4, y0, 3, h).data, R = ctx.getImageData(Math.min(W - 3, x1 + 1), y0, 3, h).data, out = ctx.createImageData(w, h), o = out.data;
  for (let y = 0; y < h; y++) {
    const l = [0, 0, 0], r = [0, 0, 0];
    for (let k = 0; k < 3; k++) for (let ch = 0; ch < 3; ch++) { l[ch] += L[(y * 3 + k) * 4 + ch] / 3; r[ch] += R[(y * 3 + k) * 4 + ch] / 3; }
    for (let x = 0; x < w; x++) { const u = x / (w - 1), i = (y * w + x) * 4; o[i] = l[0] + (r[0] - l[0]) * u; o[i + 1] = l[1] + (r[1] - l[1]) * u; o[i + 2] = l[2] + (r[2] - l[2]) * u; o[i + 3] = 255; }
  }
  ctx.putImageData(out, x0, y0);
}

function drawCaption(c, t0, t1, t) {
  if (!c.draw || !(t >= t0 && t < t1)) return;
  const fade = c.fade ?? 0, a = fade ? Math.min(1, (t - t0) / fade, (t1 - t) / fade) : 1;
  const size = fitSize(c); ctx.save(); ctx.globalAlpha = Math.max(0, a); setFont(c, size); ctx.textAlign = c.align || 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  const x = (c.align || 'center') === 'center' ? c.cx : c.x;
  if (c.stroke) { ctx.strokeStyle = c.stroke.color; ctx.lineWidth = c.stroke.w * size / c.size; ctx.strokeText(c.text, x, c.baseline); }
  ctx.fillStyle = c.color; ctx.fillText(c.text, x, c.baseline); ctx.restore();
}

function drawOverlay(o, t) {
  if (t < o.t0 || t >= (o.t1 ?? end)) return;
  ctx.save(); ctx.globalAlpha = o.alpha ?? 1;
  if (o.type === 'rect') { ctx.fillStyle = o.color; ctx.beginPath(); ctx.roundRect(o.x, o.y, o.w, o.h, o.radius || 0); ctx.fill(); }
  else if (o.type === 'image' && o._im) ctx.drawImage(o._im, o.x, o.y, o.w, o.h);
  ctx.restore();
}
await Promise.all(ovs.filter(o => o.type === 'image').map(o => new Promise(res => { o._im = new Image(); o._im.onload = o._im.onerror = res; o._im.src = o.src; })));

window.DUR = (spec.tail || 0) + end;
window.render = async (t) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const s = shotAt(t);
  if (s) {
    const ts = srcOf(s, t); ctx.drawImage(await fr.frame(ts), 0, 0, W, H);
    if (!NOCAP) for (const c of caps) if (c.erase === 'cover' && c.erase_src && ts >= c.erase_src[0] && ts < c.erase_src[1]) cover(c);
  }
  for (const o of ovs) drawOverlay(o, t);
  if (!NOCAP) caps.forEach((c, i) => drawCaption(c, tm[i][0], tm[i][1], t));
};
window.TEXTS = (t) => caps.map((c, i) => ({ c, tt: tm[i] })).filter(({ c, tt }) => c.draw && t >= tt[0] && t < tt[1]).map(({ c }) => ({ id: c.id, text: c.text, x0: c.box.x, y0: c.box.y, x1: c.box.x + c.box.w, y1: c.box.y + c.box.h }));
window.READY = true;
