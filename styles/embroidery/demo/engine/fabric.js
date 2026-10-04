// fabric.js — the grounds: plain-weave linen (visible warp/weft with slubs), felt table, wooden hoop.
import { hash, vnoise, mulberry, TAU, clamp } from '/core/lib.js';
import { css, shade, lift, LIGHT, ENV } from './thread.js';

export const LINEN = [216, 203, 174];
export const PITCH = 5.4;

// Visible world rectangle for a camera {cx, cy, z} on a W×H canvas
export const view = (cam, W = 1920, H = 1080) => ({ x0: cam.cx - W / 2 / cam.z, y0: cam.cy - H / 2 / cam.z, x1: cam.cx + W / 2 / cam.z, y1: cam.cy + H / 2 / cam.z });

// Plain weave inside a circle (cx, cy, R) or the full view when R is null. Each cell is one crossing:
// over/under alternates; threads have their own tone and slubs. Lit from upper left.
export function linen(ctx, cam, circ, o = {}) {
  const p = o.pitch ?? PITCH, base = o.color ?? LINEN, v = view(cam), tw = p * 0.76;
  let { x0, y0, x1, y1 } = v;
  if (circ) { x0 = Math.max(x0, circ.cx - circ.R - p); x1 = Math.min(x1, circ.cx + circ.R + p); y0 = Math.max(y0, circ.cy - circ.R - p); y1 = Math.min(y1, circ.cy + circ.R + p); }
  ctx.save();
  if (circ) { ctx.beginPath(); ctx.arc(circ.cx, circ.cy, circ.R, 0, TAU); ctx.clip(); }
  ctx.fillStyle = css(shade(base, 0.42)); ctx.fillRect(x0 - p, y0 - p, x1 - x0 + 2 * p, y1 - y0 + 2 * p);
  const i0 = Math.floor(x0 / p) - 1, i1 = Math.ceil(x1 / p) + 1, j0 = Math.floor(y0 / p) - 1, j1 = Math.ceil(y1 / p) + 1;
  const th = j => (hash(j * 1.37 + 17.3) - 0.5) * 0.11, tv = i => (hash(i * 1.91 + 91.7) - 0.5) * 0.11;
  const lw = Math.max(0.9, 1.15), hl = 0.1, dk = 0.16;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const x = i * p, y = j * p, hov = (i + j) & 1;
    const mot = (vnoise(x * 0.006 + y * 0.0021) + vnoise(y * 0.0063 + 50 + x * 0.0013) - 1) * 0.1;
    if (hov) { // horizontal thread on top
      const sl = (vnoise(x * 0.03 + hash(j) * 100) - 0.5) * 0.2, k = 1 + th(j) + sl + mot;
      ctx.fillStyle = css(shade(base, k)); ctx.fillRect(x - p / 2 - 0.5, y - tw / 2, p + 1, tw);
      ctx.fillStyle = css(lift(base, hl + 0.1 * Math.max(0, sl * 3)), 0.55); ctx.fillRect(x - p / 2, y - tw / 2, p, lw);
      ctx.fillStyle = css(shade(base, 0.42), dk * 3); ctx.fillRect(x - p / 2, y + tw / 2 - lw, p, lw);
      ctx.fillStyle = css(shade(base, 0.5), 0.3); ctx.fillRect(x - p / 2 - 0.5, y - tw / 2, 1, tw); // dip where it goes under
    } else {
      const sl = (vnoise(y * 0.03 + hash(i) * 100) - 0.5) * 0.2, k = 1 + tv(i) + sl + mot;
      ctx.fillStyle = css(shade(base, k)); ctx.fillRect(x - tw / 2, y - p / 2 - 0.5, tw, p + 1);
      ctx.fillStyle = css(lift(base, hl + 0.1 * Math.max(0, sl * 3)), 0.55); ctx.fillRect(x - tw / 2, y - p / 2, lw, p);
      ctx.fillStyle = css(shade(base, 0.42), dk * 3); ctx.fillRect(x + tw / 2 - lw, y - p / 2, lw, p);
      ctx.fillStyle = css(shade(base, 0.5), 0.3); ctx.fillRect(x - tw / 2, y - p / 2 - 0.5, tw, 1);
    }
  }
  ctx.restore();
}

// Felt table: screen-space cached texture (it is the background, not the work).
let feltCache = null;
export function felt(ctx, W, H, color = [48, 62, 66]) {
  if (!feltCache) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), r = mulberry(5);
    g.fillStyle = css(color); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 52000; i++) {
      const x = r() * W, y = r() * H, a = r() * TAU, l = 2 + r() * 7;
      g.strokeStyle = r() < 0.5 ? css(lift(color, 0.22), 0.1 + r() * 0.12) : css(shade(color, 0.55), 0.1 + r() * 0.14);
      g.lineWidth = 0.6 + r() * 0.7; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 1) * l * 0.5, y + Math.sin(a + 1) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    for (let k = 0; k < 90; k++) { // cloudy density variation
      const x = r() * W, y = r() * H, rr = 60 + r() * 220, gg = g.createRadialGradient(x, y, 0, x, y, rr);
      const dark = r() < 0.5; gg.addColorStop(0, dark ? 'rgba(10,18,20,0.07)' : 'rgba(160,190,190,0.04)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    feltCache = c;
  }
  ctx.drawImage(feltCache, 0, 0);
}

// The hoop: inner ring at radius R, wooden band `band` wide, brass screw bracket. Drawn around (cx, cy).
export function hoopRing(ctx, cx, cy, R, band = 34) {
  const z = ENV.z, r = mulberry(21);
  // fabric tension: darker toward the rim, soft sheen on the dome
  let g = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.1, cx, cy, R);
  g.addColorStop(0, 'rgba(255,248,230,0.10)'); g.addColorStop(0.75, 'rgba(0,0,0,0)'); g.addColorStop(0.95, 'rgba(50,30,10,0.16)'); g.addColorStop(1, 'rgba(30,18,6,0.4)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
  // cast shadow of the ring on table and cloth
  ctx.save();
  ctx.shadowColor = 'rgba(8,12,14,0.65)'; ctx.shadowBlur = 38 * z; ctx.shadowOffsetX = -LIGHT.x * 20 * z; ctx.shadowOffsetY = -LIGHT.y * 20 * z;
  ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.arc(cx, cy, R + band, 0, TAU); ctx.arc(cx, cy, R, 0, TAU, true); ctx.fill('evenodd');
  ctx.restore();
  // wood band
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R + band, 0, TAU); ctx.arc(cx, cy, R, 0, TAU, true); ctx.clip('evenodd');
  const cg = ctx.createConicGradient(Math.atan2(LIGHT.y, LIGHT.x) + Math.PI, cx, cy);
  cg.addColorStop(0, '#d9a96a'); cg.addColorStop(0.25, '#c08f52'); cg.addColorStop(0.5, '#8a5e32'); cg.addColorStop(0.75, '#b88649'); cg.addColorStop(1, '#d9a96a');
  ctx.fillStyle = cg; ctx.fillRect(cx - R - band, cy - R - band, 2 * (R + band), 2 * (R + band));
  const rg = ctx.createRadialGradient(cx, cy, R, cx, cy, R + band);
  rg.addColorStop(0, 'rgba(40,20,5,0.55)'); rg.addColorStop(0.12, 'rgba(255,230,180,0.18)'); rg.addColorStop(0.55, 'rgba(0,0,0,0)'); rg.addColorStop(0.9, 'rgba(255,225,170,0.12)'); rg.addColorStop(1, 'rgba(40,20,5,0.5)');
  ctx.fillStyle = rg; ctx.fillRect(cx - R - band, cy - R - band, 2 * (R + band), 2 * (R + band));
  for (let i = 0; i < 260; i++) { // grain: long thin arcs
    const rr = R + 3 + r() * (band - 6), a0 = r() * TAU, len = 0.15 + r() * 1.3;
    ctx.strokeStyle = r() < 0.55 ? `rgba(70,38,12,${0.07 + r() * 0.14})` : `rgba(255,225,170,${0.05 + r() * 0.1})`;
    ctx.lineWidth = 0.6 + r() * 1.3; ctx.beginPath(); ctx.arc(cx, cy, rr, a0, a0 + len); ctx.stroke();
  }
  ctx.restore();
  // brass screw bracket, at the right
  const bx = cx + R + band - 6, by = cy;
  ctx.save();
  ctx.shadowColor = 'rgba(10,8,6,0.6)'; ctx.shadowBlur = 14 * z; ctx.shadowOffsetX = 8 * z; ctx.shadowOffsetY = 10 * z;
  const bg = ctx.createLinearGradient(bx, by - 34, bx, by + 34);
  bg.addColorStop(0, '#f1d98e'); bg.addColorStop(0.3, '#c9a24a'); bg.addColorStop(0.7, '#8d6a24'); bg.addColorStop(1, '#5e4516');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(bx - 18, by - 34, 46, 68, 7); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,240,200,0.4)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect(bx - 17, by - 33, 44, 66, 6); ctx.stroke();
  const sg = ctx.createRadialGradient(bx + 12, by - 6, 2, bx + 14, by, 22);
  sg.addColorStop(0, '#f6e3a4'); sg.addColorStop(0.6, '#b08a38'); sg.addColorStop(1, '#6b4f1a');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(bx + 14, by, 17, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(40,28,10,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx + 2, by - 4); ctx.lineTo(bx + 26, by + 4); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,190,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx + 2, by - 6); ctx.lineTo(bx + 26, by + 2); ctx.stroke();
}
