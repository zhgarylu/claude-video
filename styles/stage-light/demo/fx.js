// Crowd silhouettes with raised hands and phone lights, confetti cannons, spark fountains. All analytic in t (no state).
import { proj } from './cam.js';
const H_ = 1080;
import { mulberry, hash, ss, lerp, clamp } from '/core/lib.js';

const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
// ------------------------------------------------------------------ crowd
const CROWD = [];
(function () {
  const r = mulberry(4242);
  for (let row = 0; row < 14; row++) {
    const Z = 2.4 + row * .8, n = 34;
    for (let k = 0; k < n; k++) CROWD.push({ x: -13 + 26 * (k + r() * .7) / n, z: Z + (r() - .5) * .5, h: 1.52 + r() * .3, row, a: r(), b: r(), c: r(), d: r() });
  }
})();
let S = null; export function setScore(s) { S = s; }
function raiseProb(t) { return t < 8 ? 0.0 : t < 24 ? lerp(.1, .35, (t - 8) / 16) : t < 40 ? .62 : t < 48 ? .5 : t < 56 ? .8 : t < 57 ? .8 : .45; }
export function drawCrowd(ctx, cam, t, rig, en) {
  const bounce = (1 + Math.cos(2 * Math.PI * ((t / S.beat) % 1))) / 2 * en * .06;
  const phones = (t >= 41 && t < 56 && !(t >= 48)) || t >= 56.5;
  const prob = raiseProb(t);
  // far rows first
  const order = CROWD.map((p, i) => i).sort((i, j) => CROWD[j].z - CROWD[i].z);
  const rim = rig.rim, rimA = rig.rimA * .5;
  for (const pass of [0, 1]) {
    for (const i of order) {
      const p = CROWD[i], P = proj(cam, p.x, 0, p.z); if (P.z < 5.4 || P.z > 15) continue;
      const wgt = ss((P.z - 5.6) / 1.8) * (1 - ss((P.z - 11) / 3.5)); if (wgt < .02) continue; ctx.globalAlpha = wgt;
      if (P.x < -400 || P.x > 2320) continue;
      const s = P.s, by = bounce * (.5 + p.a), hh = p.h + by + (p.a - .5) * .06;
      const dep = Math.min(1, p.row / 10), off = pass === 0 ? -3 : 0;
      if (pass === 0 && rimA < .02) continue;
      ctx.fillStyle = pass === 0 ? rgba(rim, rimA * (1 - dep * .6)) : `rgb(${2 + dep * 7 | 0},${3 + dep * 9 | 0},${7 + dep * 14 | 0})`;
      ctx.strokeStyle = ctx.fillStyle; ctx.lineCap = 'round';
      const hx = P.x + (p.b - .5) * .02 * s + Math.sin(t * 1.6 + p.c * 9) * .015 * s * (en > 0 ? 1 : .4), hy = P.y - hh * s + off;
      ctx.beginPath(); ctx.arc(hx, hy, .105 * s, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(P.x, P.y - (hh - .33) * s + off, .26 * s, .3 * s, 0, 0, 7); ctx.fill();
      ctx.fillRect(P.x - .21 * s, P.y - (hh - .33) * s + off, .42 * s, Math.max(0, H_ - (P.y - (hh - .33) * s + off)) + 4);
      const up = ss((prob - p.d) / .12);
      if (up > .01) {
        const side = p.c > .5 ? 1 : -1, sway = Math.sin(t * (2.2 + p.a) + p.b * 9) * .14 * (phones ? .4 : 1) * (en > 0 ? 1 : .5);
        const sx = P.x + side * .22 * s, sy = P.y - (hh - .3) * s + off;
        const hx2 = P.x + side * (.26 + .06 * p.a) * s + sway * s, hy2 = P.y - (hh + .44 * up + .08 * Math.sin(t * 4 + p.a * 9) * en) * s + off;
        ctx.lineWidth = .05 * s; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(lerp(sx, hx2, up), lerp(sy, hy2, up)); ctx.stroke();
        ctx.beginPath(); ctx.arc(hx2, hy2, .05 * s, 0, 7); ctx.fill();
        if (pass === 1 && phones && p.b < .78) {                           // a phone light
          const wy = hy2 - .06 * s;
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const a = ss((t - (t < 48 ? 41 : 56.5)) / 2.5 - p.a * .8);
          const col = p.c < .3 ? [190, 225, 255] : [255, 238, 205], gr_ = Math.min(.5 * s, 70);
          const g = ctx.createRadialGradient(hx2, wy, 0, hx2, wy, gr_); g.addColorStop(0, rgba(col, .45 * a)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.fillRect(hx2 - gr_, wy - gr_, 2 * gr_, 2 * gr_);
          ctx.fillStyle = rgba(col, .95 * a); ctx.fillRect(hx2 - .035 * s, wy - .075 * s, .07 * s, .14 * s); ctx.restore();
        }
      }
    }
  }
  ctx.globalAlpha = 1;
}
// ------------------------------------------------------------------ confetti
const PAL = [[40, 130, 255], [255, 50, 170], [255, 180, 60], [255, 245, 235], [120, 70, 255]];
export const CANNONS = [
  [48.0, [-5.8, .2, 1.3], 230, 101], [48.0, [5.8, .2, 1.3], 230, 102], [48.12, [-2.4, .2, 2.2], 120, 103], [48.12, [2.4, .2, 2.2], 120, 104],
  [52.0, [-5.8, .2, 1.3], 220, 201], [52.0, [5.8, .2, 1.3], 220, 202], [52.1, [0, .2, 2.4], 140, 203],
];
const PARTS = CANNONS.map(([t0, pos, n, seed]) => { const r = mulberry(seed), a = []; for (let i = 0; i < n; i++) a.push({ vx: (r() - .5) * 9 - Math.sign(pos[0]) * 2.4, vy: 9 + r() * 8, vz: (r() - .5) * 5 - 2.2, vt: .8 + r() * .7, k: 1.3 + r() * .7, w: 2 + r() * 5, ph: r() * 6.3, w2: 3 + r() * 9, w3: 4 + r() * 7, c: PAL[Math.floor(r() * PAL.length)], sz: .05 + r() * .045, del: r() * .06 }); return a; });
export function drawConfetti(ctx, cam, t, lightK) {
  ctx.save();
  CANNONS.forEach(([t0, pos], ci) => {
    if (t < t0 || t > t0 + 11) return;
    for (const p of PARTS[ci]) {
      const tau = t - t0 - p.del; if (tau < 0) continue;
      const e = (1 - Math.exp(-p.k * tau)) / p.k;
      let x = pos[0] + p.vx * e + Math.sin(p.w * tau + p.ph) * .25, y = pos[1] - p.vt * tau + (p.vy + p.vt) * e, z = pos[2] + p.vz * e + Math.cos(p.w * tau + p.ph) * .2;
      if (y < 0) { y = 0.01; }
      const P = proj(cam, x, y, z); if (P.z < .8 || P.x < -50 || P.x > 1970 || P.y < -50 || P.y > 1130) continue;
      const w = p.sz * P.s, flip = Math.abs(Math.cos(p.w3 * tau + p.ph)), rot = p.w2 * tau + p.ph;
      const fade = 1 - ss((t - t0 - 7.5) / 3);
      ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(rot); ctx.globalAlpha = fade * (.55 + .45 * flip);
      const k = lightK * (.4 + .6 * flip); ctx.fillStyle = `rgb(${p.c[0] * k | 0},${p.c[1] * k | 0},${p.c[2] * k | 0})`; ctx.fillRect(-w, -w * .5 * (.2 + .8 * flip), 2 * w, w * (.2 + .8 * flip)); ctx.restore();
    }
  });
  ctx.restore();
}
// ------------------------------------------------------------------ spark fountains (cold sparks)
export const FOUNTAINS = [
  [24.0, 3.2, [-4.6, .05, 1.8]], [24.0, 3.2, [-1.6, .05, 2.0]], [24.0, 3.2, [1.6, .05, 2.0]], [24.0, 3.2, [4.6, .05, 1.8]],
  [48.0, 3.0, [-3.4, .05, 1.8]], [48.0, 3.0, [3.4, .05, 1.8]], [56.0, 1.6, [-2.2, .05, 1.2]], [56.0, 1.6, [2.2, .05, 1.2]],
];
export function drawSparks(ctx, cam, t) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  FOUNTAINS.forEach(([t0, dur, pos], fi) => {
    if (t < t0 || t > t0 + dur + 1.5) return;
    const rate = 55, n0 = Math.max(0, Math.floor((t - 1.5 - t0) * rate)), n1 = Math.min(Math.floor(dur * rate), Math.floor((t - t0) * rate));
    for (let k = n0; k <= n1; k++) {
      const r = mulberry(fi * 7919 + k * 31 + 5), tau = t - (t0 + k / rate), life = 1.2 + r() * .4; if (tau < 0 || tau > life) continue;
      const vx = (r() - .5) * 3.4, vy = 5.2 + r() * 4.5, vz = (r() - .5) * 2.6, g = 9.8;
      const at = (u) => [pos[0] + vx * u, pos[1] + vy * u - .5 * g * u * u, pos[2] + vz * u];
      const a = at(tau), b = at(Math.max(0, tau - .05)); if (a[1] < 0) continue;
      const A = proj(cam, ...a), B = proj(cam, ...b); if (A.z < .8) continue;
      const age = tau / life, c = age < .35 ? [255, 244, 215] : [255, 160, 50];
      ctx.strokeStyle = rgba(c, (1 - age) * .95); ctx.lineWidth = Math.max(1.2, A.s * .012); ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.lineTo(A.x, A.y); ctx.stroke();
    }
  });
  ctx.restore();
}
