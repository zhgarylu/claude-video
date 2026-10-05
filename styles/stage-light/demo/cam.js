// Camera: one world -> screen function for everything (beams, wall, figures, confetti, crowd).
// World in metres: X right, Y up, Z towards the audience; the singer stands at the origin, the floor is Y = 0.
import { monotone } from '/core/lib.js';
export const W = 1920, H = 1080;
const D2R = Math.PI / 180;

// the shot list (see TREATMENT.md): az in degrees about the singer, R distance, Hh camera height, ty/tx/tz aim point.
// Each channel is a monotone cubic through its keys: smooth, no overshoot, and a repeated value is a hold.
const KEYS = {
  az: [[0, 6], [5.7, 4], [6.0, -14], [7.6, -10], [8.0, 0], [16, -26], [22, 26], [24, 26], [24.9, 0], [28, 8], [28.35, 20], [31.5, 14], [32, -40], [36, 46], [40, 0], [48, -3], [52, -12], [56, 0], [60, 0]],
  R: [[0, 6.4], [6, 4.9], [6.3, 5], [7.5, 5.4], [8.0, 13], [16, 10.5], [22, 6], [23.4, 3.9], [24, 3.8], [24.9, 16.5], [28, 19], [28.35, 6], [31.5, 5.2], [32, 11], [36, 10.5], [40, 4.6], [41, 4.9], [44, 8.6], [47.2, 9.5], [48, 17], [52, 15], [55.9, 4.4], [56.1, 4.5], [60, 9.5]],
  Hh: [[0, 1.0], [6, 2.0], [6.3, 1.2], [7.5, 1.3], [8, 3.4], [16, 3.7], [22, 2.2], [23.4, 1.5], [24, 1.5], [24.9, 5.6], [28, 6.6], [28.35, 0.9], [32, 0.9], [32.5, 1.8], [36, 2.4], [40, 1.7], [41, 1.9], [43, 3.0], [44.5, 3.5], [47.2, 3.9], [48, 8.4], [52, 3.0], [55.9, 1.5], [56.1, 1.5], [60, 2.6]],
  ty: [[0, 1.55], [5.7, 1.55], [6.0, 1.3], [7.6, 1.3], [8, 2.4], [16, 2.6], [22, 1.9], [23.4, 1.75], [24, 1.75], [24.9, 2.5], [28, 2.5], [28.35, 1.5], [32, 1.6], [32.5, 1.9], [40, 1.8], [41, 2.2], [47.2, 2.9], [48, 2.8], [52, 2.5], [55.9, 1.7], [60, 1.9]],
  tx: [[0, 0], [5.7, 0], [6.0, 1.6], [7.6, 1.5], [8.0, 0], [28, 0], [28.35, -3.0], [29.6, -3.0], [31.4, 3.3], [32, 0], [60, 0]],
  tz: [[0, 0], [5.7, 0], [6.0, -2.7], [7.6, -2.6], [8.0, 0], [28, 0], [28.35, -0.4], [31.4, -0.6], [32, 0], [60, 0]],
  f: [[0, 1500], [60, 1500]],
};
export const CH = {}; for (const k in KEYS) CH[k] = monotone(KEYS[k]);
export function camAt(t) {
  const c = {}; for (const k in CH) c[k] = CH[k](t);
  // slow hand-held float so the long shots are never dead still (kept small: it must stay a crane, not a shake)
  const fl = (a, b) => Math.sin(t * a) * b;
  const az = (c.az + fl(.31, .35)) * D2R, R = c.R, pos = [c.tx + R * Math.sin(az), c.Hh + fl(.43, .03), c.tz + R * Math.cos(az)];
  const tg = [c.tx + fl(.27, .02), c.ty, c.tz];
  let fw = [tg[0] - pos[0], tg[1] - pos[1], tg[2] - pos[2]]; const fl_ = Math.hypot(...fw); fw = fw.map(v => v / fl_);
  let rt = [-fw[2], 0, fw[0]]; const rl = Math.hypot(rt[0], rt[2]); rt = rt.map(v => v / rl);       
  const up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
  c.pos = pos; c.fw = fw; c.rt = rt; c.up = up;
  return c;
}
// project a world point -> {x, y, s (px per metre), z (depth)}; z <= 0.1 means behind the lens
export function proj(c, X, Y, Z) {
  const vx = X - c.pos[0], vy = Y - c.pos[1], vz = Z - c.pos[2];
  const zc = vx * c.fw[0] + vy * c.fw[1] + vz * c.fw[2];
  const xc = vx * c.rt[0] + vy * c.rt[1] + vz * c.rt[2];
  const yc = vx * c.up[0] + vy * c.up[1] + vz * c.up[2];
  const s = c.f / Math.max(zc, 0.05);
  return { x: W / 2 + xc * s, y: H / 2 - yc * s, s, z: zc };
}
// clip a segment A->B (world) against the near plane; returns the shortened B (or null if A is behind)
export function clipNear(c, A, B, near = 0.4) {
  const za = (A[0] - c.pos[0]) * c.fw[0] + (A[1] - c.pos[1]) * c.fw[1] + (A[2] - c.pos[2]) * c.fw[2];
  const zb = (B[0] - c.pos[0]) * c.fw[0] + (B[1] - c.pos[1]) * c.fw[1] + (B[2] - c.pos[2]) * c.fw[2];
  if (za < near) return null;
  if (zb >= near) return B;
  const k = (za - near) / (za - zb);
  return [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k];
}
