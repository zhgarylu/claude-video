// Light physics: volumetric beams on a half-resolution additive layer modulated by drifting haze, pools on the floor,
// the LED wall in perspective (sliced) with its glossy reflection, lens glow and anamorphic streaks.
import { proj, clipNear, W, H } from './cam.js';
import { lerp, clamp, ss, hash, vnoise, mulberry } from '/core/lib.js';
import { C, HEADS } from './cues.js';
import { POS } from './band.js';

const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const LC = mkc(960, 540), lc = LC.getContext('2d');
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// ---------------------------------------------------------------- haze texture: periodic value noise, alpha 0.5..1
const HZ = mkc(256, 128);
(function () {
  const g = HZ.getContext('2d'), im = g.createImageData(256, 128), r = mulberry(901);
  const lat = (n, m) => { const a = []; for (let i = 0; i < n * m; i++) a.push(r()); return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const q = (a_, b_) => a[((b_ % m + m) % m) * n + ((a_ % n + n) % n)]; return lerp(lerp(q(xi, yi), q(xi + 1, yi), u), lerp(q(xi, yi + 1), q(xi + 1, yi + 1), u), v); }; };
  const n1 = lat(8, 4), n2 = lat(16, 8), n3 = lat(32, 16);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 256; x++) {
    const v = .55 * n1(x / 32, y / 32) + .3 * n2(x / 16, y / 16) + .15 * n3(x / 8, y / 8);
    const k = (y * 256 + x) * 4; im.data[k] = im.data[k + 1] = im.data[k + 2] = 255; im.data[k + 3] = Math.round(255 * clamp(.38 + 1.05 * (v - .3), .25, 1));
  }
  g.putImageData(im, 0, 0);
})();

// ---------------------------------------------------------------- beams
function beam(cam, h, hazeK) {
  const S = h.src, A = h.aim, dv = [A[0] - S[0], A[1] - S[1], A[2] - S[2]], dl = Math.hypot(...dv), d = dv.map(v => v / dl);
  let tauEnd = 24, floor = false;
  if (d[1] < -.02) { const tf = -S[1] / d[1]; if (tf < tauEnd) { tauEnd = tf; floor = true; } }
  const E = [S[0] + d[0] * tauEnd, S[1] + d[1] * tauEnd, S[2] + d[2] * tauEnd];
  const E2 = clipNear(cam, S, E, .5); if (!E2) return null;
  const tau = Math.hypot(E2[0] - S[0], E2[1] - S[1], E2[2] - S[2]), clipped = tau < tauEnd - .01;
  const ps = proj(cam, ...S), pe = proj(cam, ...E2);
  const r0 = .1, tn = Math.tan(h.spread), rS = r0 * ps.s, rE = Math.min(700, (r0 + tau * tn) * pe.s);
  const dx = pe.x - ps.x, dy = pe.y - ps.y, dl2 = Math.hypot(dx, dy); if (dl2 < 2) return null;
  const nx = -dy / dl2, ny = dx / dl2;
  return { ps, pe, rS, rE, nx, ny, floor: floor && !clipped, F: E, tau, tn, clipped };
}
function drawBeams(cam, rig, t) {
  lc.setTransform(1, 0, 0, 1, 0, 0); lc.globalCompositeOperation = 'source-over'; lc.clearRect(0, 0, 960, 540);
  lc.setTransform(.5, 0, 0, .5, 0, 0); lc.globalCompositeOperation = 'lighter';
  const info = [];
  for (const h of rig.heads) {
    if (h.I < .02) { info.push(null); continue; }
    const b = beam(cam, h, rig.haze); info.push(b); if (!b) continue;
    const a0 = h.I * rig.haze * .34;
    for (const [wf, af] of [[1, .35], [.62, .4], [.3, .5]]) {
      const x0 = b.ps.x, y0 = b.ps.y, x1 = b.pe.x, y1 = b.pe.y, w0 = Math.max(1.5, b.rS * wf), w1 = Math.max(2, b.rE * wf);
      const g = lc.createLinearGradient(x0, y0, x1, y1);
      const endA = b.floor ? .30 : .0;
      g.addColorStop(0, rgba(h.col, a0 * af)); g.addColorStop(.35, rgba(h.col, a0 * af * .75)); g.addColorStop(1, rgba(h.col, a0 * af * endA));
      lc.fillStyle = g; lc.beginPath();
      lc.moveTo(x0 + b.nx * w0, y0 + b.ny * w0); lc.lineTo(x1 + b.nx * w1, y1 + b.ny * w1); lc.lineTo(x1 - b.nx * w1, y1 - b.ny * w1); lc.lineTo(x0 - b.nx * w0, y0 - b.ny * w0); lc.closePath(); lc.fill();
    }
    if (b.floor) {                                   // the pool on the stage floor
      const F = b.F, pf = proj(cam, F[0], 0, F[2]); if (pf.z > .5) {
        const rp = .1 + b.tau * b.tn, rx = Math.min(600, rp * pf.s), pz = proj(cam, F[0], 0, F[2] + rp), ry = Math.max(3, Math.abs(pz.y - pf.y));
        lc.save(); lc.translate(pf.x, pf.y); lc.scale(1, ry / Math.max(rx, 1));
        const g = lc.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, rgba(h.col, .55 * h.I * rig.haze)); g.addColorStop(.6, rgba(h.col, .2 * h.I)); g.addColorStop(1, rgba(h.col, 0));
        lc.fillStyle = g; lc.beginPath(); lc.arc(0, 0, rx, 0, 7); lc.fill(); lc.restore();
      }
    }
  }
  return info;
}
export function followSpot(cam, rig, t, sing) {            // a soft cone from above the frame onto the singer, on the same layer
  if (rig.spotA < .02) return;
  const P = sing || proj(cam, 0, 1.0, 0), apexX = P.x + 0.42 * P.s, apexY = -300, w = rig.spotW;
  const rb0 = Math.max(60, 0.5 * P.s * w * 1.3);
  lc.save(); lc.setTransform(.5, 0, 0, .5, 0, 0); lc.globalCompositeOperation = 'lighter';
  for (const [wf, af] of [[1, .35], [.66, .4], [.36, .5]]) {
    const rb = rb0 * wf, ra = rb * 1.7;
    const g = lc.createLinearGradient(apexX, apexY, P.x, P.y);
    g.addColorStop(0, rgba(rig.spotCol, 0)); g.addColorStop(.3, rgba(rig.spotCol, rig.spotA * .1 * af * 3)); g.addColorStop(1, rgba(rig.spotCol, rig.spotA * .2 * af * 3));
    lc.fillStyle = g; lc.beginPath(); lc.moveTo(apexX - ra, apexY); lc.lineTo(apexX + ra, apexY); lc.lineTo(P.x + rb, P.y + 0.5 * P.s); lc.lineTo(P.x - rb, P.y + 0.5 * P.s); lc.closePath(); lc.fill();
  }
  // the pool at the singer's feet
  const pf = proj(cam, 0, 0, 0); const rb = rb0, ry = Math.max(6, rb * .22);
  lc.translate(pf.x, pf.y); lc.scale(1, ry / rb); const gg = lc.createRadialGradient(0, 0, 0, 0, 0, rb * 1.3); gg.addColorStop(0, rgba(rig.spotCol, rig.spotA * .6)); gg.addColorStop(1, rgba(rig.spotCol, 0));
  lc.fillStyle = gg; lc.beginPath(); lc.arc(0, 0, rb * 1.3, 0, 7); lc.fill(); lc.restore();
}
const HZB = mkc(960, 540), hzb = HZB.getContext('2d');
export function compositeBeams(ctx, t) {
  // modulate the beam layer by the drifting haze (destination-in with a full-size haze canvas)
  hzb.clearRect(0, 0, 960, 540);
  const tw = 900, th = 450, ox = (t * 13) % tw, oy = (t * 4.5) % th;
  for (let ix = 0; ix < 3; ix++) for (let iy = 0; iy < 3; iy++) hzb.drawImage(HZ, ix * tw - ox, iy * th - oy, tw, th);
  const L = lc; L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = 'destination-in'; L.drawImage(HZB, 0, 0); L.restore();
}
export function addLayer(ctx, a) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.imageSmoothingEnabled = true; ctx.drawImage(LC, 0, 0, W, H); ctx.restore(); }
export { drawBeams }; export const _LC = LC;

// ---------------------------------------------------------------- LED wall
const WC = mkc(192, 78), wc = WC.getContext('2d'), WT = mkc(1536, 624), wt = WT.getContext('2d');
const MASK = (() => { const m = mkc(8, 8), g = m.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 8, 8); const rg = g.createRadialGradient(4, 4, .5, 4, 4, 3.9); rg.addColorStop(0, '#fff'); rg.addColorStop(.7, '#e8e8e8'); rg.addColorStop(1, '#222'); g.fillStyle = rg; g.fillRect(0, 0, 8, 8); return m; })();
const WALL = { x0: -8, x1: 8, y0: .9, y1: 7.4, z: -5.4 };
export const WALLTEXT = { text: 'SECOND SUNRISE', px: [31, 11, 161, 33] };    // LED pixels of the wordmark
export function wallText(t) { return t >= 24.55 && t < 28.0 ? WALLTEXT : null; }
function paintWall(S, rig, t) {
  const g = wc; g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = '#020309'; g.fillRect(0, 0, 192, 78);
  const ph = (t / S.beat), kick = (() => { const k = S.kick; let lo = 0, hi = k.length; while (lo < hi) { const m = (lo + hi) >> 1; if (k[m][0] <= t) lo = m + 1; else hi = m; } return lo ? Math.exp(-(t - k[lo - 1][0]) / .2) : 0; })();
  g.globalCompositeOperation = 'lighter';
  if (rig.wall === 'standby') {
    g.fillStyle = 'rgba(30,60,140,.5)'; for (let i = 0; i < 6; i++) { const y = (t * 9 + i * 13) % 78; g.fillRect(0, y, 192, 1); }
    g.fillStyle = 'rgba(70,120,255,.35)'; g.fillRect(0, 74, 192, 2);
  } else if (rig.wall === 'eq') {
    const en = clamp((t - 8) / 14, 0, 1), cols = 48;
    for (let i = 0; i < cols; i++) {
      const x = i * 4, n = .5 + .5 * Math.sin(i * 1.7 + t * (3 + 2 * en) + Math.sin(i * .6 + t * 1.3) * 2), m = .5 + .5 * Math.sin(i * .37 - t * 2.1);
      let h = 78 * (.12 + .5 * en * n + .25 * en * m + .35 * kick * (1 - Math.abs(i - 24) / 28) * en);
      h = Math.min(74, h);
      const gr = g.createLinearGradient(0, 78, 0, 78 - h); gr.addColorStop(0, 'rgba(25,70,200,.95)'); gr.addColorStop(.7, 'rgba(70,170,255,.95)'); gr.addColorStop(1, 'rgba(210,235,255,1)');
      g.fillStyle = gr; g.fillRect(x + 0, 78 - h, 3, h); g.fillStyle = 'rgba(190,225,255,.9)'; g.fillRect(x, 78 - h - 3 - 3 * n, 3, 1);
    }
  } else if (rig.wall === 'rings') {
    const cx = 96, cy = 39;
    const bs = S.beats.filter(b => b <= t && b > t - 2.2);
    for (const b of bs) {
      const age = t - b, r = age * 62, a = Math.max(0, 1 - age / 2.2);
      g.lineWidth = 3.2; g.strokeStyle = rgba(Math.round(b / S.beat) % 2 ? C.vio : C.mag, a * .95); g.beginPath(); g.ellipse(cx, cy, r * 1.35, r, 0, 0, 7); g.stroke();
    }
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 34); gr.addColorStop(0, rgba(C.mag, .55 + .35 * kick)); gr.addColorStop(1, rgba(C.vio, 0)); g.fillStyle = gr; g.fillRect(0, 0, 192, 78);
    for (let i = 0; i < 10; i++) { const x = 8 + i * 19, h = 10 + 18 * (.5 + .5 * Math.sin(i * 2.1 + t * 4)) * (.4 + .6 * kick); g.fillStyle = rgba(C.vio, .8); g.fillRect(x, 78 - h, 8, h); }
    if (t >= 24.55 && t < 28.0) {
      const a = ss((t - 24.55) / .3) * (1 - ss((t - 27.7) / .3)); g.globalCompositeOperation = 'source-over';
      g.fillStyle = `rgba(4,3,12,${.7 * a})`; g.fillRect(WALLTEXT.px[0] - 3, WALLTEXT.px[1] - 3, WALLTEXT.px[2] - WALLTEXT.px[0] + 6, WALLTEXT.px[3] - WALLTEXT.px[1] + 6);
      g.globalCompositeOperation = 'lighter'; g.font = '30px "Bebas Neue"'; g.textBaseline = 'alphabetic'; g.textAlign = 'center'; g.fillStyle = `rgba(255,235,248,${a})`;
      const w = g.measureText(WALLTEXT.text).width, k = (WALLTEXT.px[2] - WALLTEXT.px[0]) / w; g.save(); g.translate(96, 30); g.scale(k, 1); g.fillText(WALLTEXT.text, 0, 0); g.restore();
    }
  } else if (rig.wall === 'sun' || rig.wall === 'sun2') {
    const fin = rig.wall === 'sun2', rise = fin ? 1 : ss((t - 41) / 7), cx = 96, cy = lerp(98, 40, rise), R = fin ? 27 : 22;
    const rot = fin ? (t - 48) * (t > 54 ? 0.9 : .5) : (t - 41) * .06;
    const rays = fin ? 30 : 20;
    for (let i = 0; i < rays; i++) {
      const a = rot + i / rays * Math.PI * 2, w = Math.PI / rays * .55;
      const col = fin ? [C.blue2, C.mag, C.amber][i % 3] : C.amber;
      g.fillStyle = rgba(col, (fin ? .5 : .32) * (0.4 + 0.6 * rise)); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - w) * 150, cy + Math.sin(a - w) * 150); g.lineTo(cx + Math.cos(a + w) * 150, cy + Math.sin(a + w) * 150); g.closePath(); g.fill();
    }
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R * (1 + .06 * kick)); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(.7, 'rgba(255,170,50,1)'); gr.addColorStop(1, 'rgba(230,100,20,.95)');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R * (1 + .06 * kick), 0, 7); g.fill();
    g.globalCompositeOperation = 'source-over'; g.fillStyle = '#020309'; for (let i = 0; i < 6; i++) { const y = cy + 2 + i * 4.5; g.fillRect(cx - R - 2, y, R * 2 + 4, 0.8 + i * .35); }   // blinds across the lower half
    g.fillRect(0, 76, 192, 2);
    if (fin) { g.globalCompositeOperation = 'lighter'; const r = ((t - S.cues.finale) % S.beat) / S.beat * 60; g.strokeStyle = rgba(C.white, .35 * (1 - r / 60)); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 28 + r, 0, 7); g.stroke(); }
  }
  g.globalCompositeOperation = 'source-over';
  // upscale to the wall texture and cut the LED dot grid into it
  wt.imageSmoothingEnabled = false; wt.globalCompositeOperation = 'source-over'; wt.drawImage(WC, 0, 0, 1536, 624);
  wt.globalCompositeOperation = 'multiply'; wt.fillStyle = wt.createPattern(MASK, 'repeat'); wt.fillRect(0, 0, 1536, 624); wt.globalCompositeOperation = 'source-over';
}
export function drawWall(ctx, cam, S, rig, t, mirror, alpha) {
  if (rig.wg < .01) return;
  if (!mirror) paintWall(S, rig, t);
  const N = 96, sw = 1536 / N, sh = 624, m = mirror ? -1 : 1;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = rig.wg * alpha;
  for (let j = 0; j < N; j++) {
    const X0 = lerp(WALL.x0, WALL.x1, j / N), X1 = lerp(WALL.x0, WALL.x1, (j + 1) / N);
    const yT = mirror ? -WALL.y1 : WALL.y1, yB = mirror ? -WALL.y0 : WALL.y0;
    const a = proj(cam, X0, yT, WALL.z), b = proj(cam, X1, yT, WALL.z), c = proj(cam, X0, yB, WALL.z);
    if (a.z < .5 || b.z < .5) continue; if (Math.max(a.x, b.x) < -20 || Math.min(a.x, b.x) > W + 20) continue;
    const ax = (b.x - a.x) / sw * 1.03, bx = (b.y - a.y) / sw, dy = (c.y - a.y) / sh;
    ctx.setTransform(ax, bx, (c.x - a.x) / sh, dy, a.x - .3, a.y);
    ctx.drawImage(WT, j * sw, 0, sw, sh, 0, 0, sw, sh);
  }
  ctx.restore();
}
export function wallBox(cam, px) {
  const X = (u) => lerp(WALL.x0, WALL.x1, u / 192), Y = (v) => lerp(WALL.y1, WALL.y0, v / 78);
  const pts = [[px[0], px[1]], [px[2], px[1]], [px[2], px[3]], [px[0], px[3]]].map(([u, v]) => proj(cam, X(u), Y(v), WALL.z));
  return { x0: Math.min(...pts.map(p => p.x)), y0: Math.min(...pts.map(p => p.y)), x1: Math.max(...pts.map(p => p.x)), y1: Math.max(...pts.map(p => p.y)) };
}

// ---------------------------------------------------------------- the floor, the haze glow, lamps
export function drawFloor(ctx, cam, rig, t) {
  const a = proj(cam, -40, 0, WALL.z), b = proj(cam, 40, 0, WALL.z); const yh = (a.y + b.y) / 2;
  const clipY = clamp(Math.min(a.y, b.y), -200, H + 400);
  ctx.save(); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x + (b.x - a.x) * 0, H + 2000); ctx.lineTo(a.x, H + 2000); ctx.closePath(); ctx.clip();
  const g = ctx.createLinearGradient(0, clipY, 0, clipY + 600); g.addColorStop(0, '#0a0c16'); g.addColorStop(1, '#020307'); ctx.fillStyle = g; ctx.fillRect(0, clipY - 5, W, H + 2000);
  ctx.restore();
  return { a, b };
}
export function floorReflect(ctx, cam, S, rig, t, fl) {
  if (rig.wg < .01) return;
  const { a, b } = fl;
  ctx.save(); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x, H + 2000); ctx.lineTo(a.x, H + 2000); ctx.closePath(); ctx.clip();
  drawWall(ctx, cam, S, rig, t, true, .34);
  const clipY = Math.min(a.y, b.y), g = ctx.createLinearGradient(0, clipY, 0, clipY + 500); g.addColorStop(0, 'rgba(2,3,7,.25)'); g.addColorStop(1, 'rgba(2,3,7,.97)');
  ctx.globalCompositeOperation = 'source-over'; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = g; ctx.fillRect(0, clipY, W, H + 2000);
  ctx.restore();
}
export function hazeGlow(ctx, cam, rig, t, info) {
  // coloured fog around the stage + a glow at every lit lamp
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  let sumI = 0; for (const h of rig.heads) sumI += h.I; sumI /= rig.heads.length;
  const c = proj(cam, 0, 2.4, -2.2), rad = 6.5 * c.s;
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, Math.max(300, rad)); g.addColorStop(0, rgba(rig.glow, .10 * sumI * rig.haze + .015 * rig.wg)); g.addColorStop(1, rgba(rig.glow, 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
export function lamps(ctx, cam, rig, t, info) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const strong = [];
  rig.heads.forEach((h, i) => {
    if (h.I < .03) return; const P = proj(cam, ...h.src); if (P.z < .6) return; if (P.x < -200 || P.x > W + 200 || P.y < -200 || P.y > H + 200) return;
    // does the lamp face the camera? beams that point away from the viewer show a dimmer lens
    const d = [h.aim[0] - h.src[0], h.aim[1] - h.src[1], h.aim[2] - h.src[2]], dl = Math.hypot(...d);
    const toCam = [cam.pos[0] - h.src[0], cam.pos[1] - h.src[1], cam.pos[2] - h.src[2]], tl = Math.hypot(...toCam);
    const face = clamp(.35 + .65 * ((d[0] * toCam[0] + d[1] * toCam[1] + d[2] * toCam[2]) / (dl * tl) * .5 + .5), 0, 1);
    const r = clamp(P.s * .22, 26, 120) * (.7 + .3 * Math.min(1, h.I));
    const g = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, r);
    g.addColorStop(0, `rgba(255,255,255,${.95 * Math.min(1, h.I) * face})`); g.addColorStop(.12, rgba(h.col, .8 * Math.min(1, h.I) * face)); g.addColorStop(.45, rgba(h.col, .2 * h.I * face)); g.addColorStop(1, rgba(h.col, 0));
    ctx.fillStyle = g; ctx.fillRect(P.x - r, P.y - r, r * 2, r * 2);
    if (h.I > .85 && face > .6) strong.push([P, h]);
  });
  // anamorphic streaks on the strongest lamps
  for (const [P, h] of strong) {
    const L = 360 + 280 * Math.min(1, rig.flash * 2);
    const g = ctx.createLinearGradient(P.x - L, 0, P.x + L, 0); g.addColorStop(0, rgba(h.col, 0)); g.addColorStop(.5, rgba(h.col, .5)); g.addColorStop(1, rgba(h.col, 0));
    ctx.fillStyle = g; ctx.fillRect(P.x - L, P.y - 1.6, 2 * L, 3.2);
  }
  // ghosts along the axis through the centre when a flash fires
  if (rig.flash > .12 && strong.length) {
    const [P, h] = strong[Math.floor(strong.length / 2)];
    for (const [k, r, a] of [[-.5, 70, .07], [-.9, 40, .06], [.45, 95, .05], [1.35, 55, .05]]) {
      const x = W / 2 + (P.x - W / 2) * k, y = H / 2 + (P.y - H / 2) * k, g = ctx.createRadialGradient(x, y, r * .6, x, y, r);
      g.addColorStop(0, rgba(h.col, 0)); g.addColorStop(.85, rgba(h.col, a * rig.flash * 3)); g.addColorStop(1, rgba(h.col, 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
  }
  ctx.restore();
}

// risers (dark boxes with a lit edge)
export function riser(ctx, cam, x0, x1, y1, z0, z1, edge, ea) {
  const q = (x, y, z) => proj(cam, x, y, z);
  const f0 = q(x0, 0, z1), f1 = q(x1, 0, z1), t0 = q(x0, y1, z1), t1 = q(x1, y1, z1), b0 = q(x0, y1, z0), b1 = q(x1, y1, z0);
  if (f0.z < .6 || b0.z < .6) return;
  ctx.fillStyle = '#04050a'; ctx.beginPath(); ctx.moveTo(t0.x, t0.y); ctx.lineTo(t1.x, t1.y); ctx.lineTo(f1.x, f1.y); ctx.lineTo(f0.x, f0.y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#0a0c14'; ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.lineTo(t1.x, t1.y); ctx.lineTo(t0.x, t0.y); ctx.closePath(); ctx.fill();
  if (ea > .02) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(edge, ea); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(t0.x, t0.y); ctx.lineTo(t1.x, t1.y); ctx.stroke(); ctx.restore(); }
}
