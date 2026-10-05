// Presenter video as a function of time, for pages that expose window.render(t).
// The video is pre-extracted to JPEG frames by tools/talk/prep.sh, so rendering stays deterministic.
//
//   import { loadHost, drawPip, level } from '/tools/talk/host.js';
//   const host = await loadHost('src');                 // before window.READY = true
//   drawPip(ctx, host, t, { x: 1550, y: 40, w: 330, h: 443, r: 22 });   // inside render(t)
//
// In skill mode the project is served at /@film/ and the library at /: this module's absolute URL still works.
export async function loadHost(base = 'src') {
  const meta = await fetch(`${base}/meta.json`).then(r => r.json());
  const env = await fetch(`${base}/env.json`).then(r => r.json());
  const frames = Array.from({ length: meta.frames }, (_, i) => { const im = new Image(); im.src = `${base}/frames/${String(i + 1).padStart(4, '0')}.jpg`; return im; });
  await Promise.all(frames.map(im => im.decode().catch(() => 0)));
  // optional person mattes (sh tools/matte/run.sh): src/matte/NNNN.png, RGBA with alpha = person; host.matte stays null when they are missing
  let matte = null;
  if (!new URLSearchParams(location.search).has('colormatte') && (await fetch(`${base}/matte/0001.png`, { method: 'HEAD' }).catch(() => ({ ok: false }))).ok) {
    matte = Array.from({ length: meta.frames }, (_, i) => { const im = new Image(); im.src = `${base}/matte/${String(i + 1).padStart(4, '0')}.png`; return im; });
    await Promise.all(matte.map(im => im.decode().catch(() => 0)));
  }
  return { ...meta, frames, env, matte };
}
export const hostMatteFrame = (host, t) => host.matte ? host.matte[Math.max(0, Math.min(host.matte.length - 1, Math.floor(t * host.fps + 1e-4)))] : null;
export const hostFrame = (host, t) => host.frames[Math.max(0, Math.min(host.frames.length - 1, Math.floor(t * host.fps + 1e-4)))];
export const level = (host, t) => host.env[Math.max(0, Math.min(host.env.length - 1, Math.floor(t * host.fps)))] || 0;   // 0..1 voice level
// Draw the host into a rounded window. opts: x, y, w, h, r (radius), border (colour), lw, shadow (rgba), fit ('cover'|'contain'),
// crop {x,y,w,h} (source rectangle, to zoom on the face), scale/alpha (for put-away animations).
export function drawPip(ctx, host, t, o) {
  const { x, y, w, h, r = 22, border = '#111', lw = 3, shadow = 'rgba(0,0,0,0.28)', alpha = 1, crop } = o;
  const im = hostFrame(host, t), sx = crop?.x ?? 0, sy = crop?.y ?? 0, sw = crop?.w ?? host.w, sh = crop?.h ?? host.h;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.shadowColor = shadow; ctx.shadowBlur = 26; ctx.shadowOffsetY = 8; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip(); ctx.drawImage(im, sx, sy, sw, sh, x, y, w, h); ctx.restore();
  if (lw) { ctx.strokeStyle = border; ctx.lineWidth = lw; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.stroke(); }
  ctx.restore();
}
