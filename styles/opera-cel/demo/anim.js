// anim.js — timing helpers: stepping, hold-and-snap pose tracks, damped swings.
import { lerp, clamp, ss } from '/core/lib.js';

export const qt = (t, fps) => Math.floor(t * fps + 1e-6) / fps;      // quantise time to a drawing rate

// numbers, nested objects and strings: blend a→b by u (u may leave 0..1 for anticipation / overshoot)
export function poseLerp(a, b, u) {
  if (typeof a === 'number') return lerp(a, b, u);
  if (typeof a === 'string' || a == null) return u >= .5 ? b : a;
  const o = {}; for (const k in a) o[k] = k in b ? poseLerp(a[k], b[k], u) : a[k]; return o;
}
// overshoot-out (about 8%) landing exactly on 1
export const backOut = u => { u = clamp(u); const c1 = 1.1, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
const easeIn = u => u * u;

// keys: [{t (arrival), pose, mv (move seconds, default .2), ant (anticipation seconds, default 2 frames), slow (true = eased glide, no snap)}]
export function poseAt(keys, t) {
  if (t <= keys[0].t) return keys[0].pose;
  for (let i = 1; i < keys.length; i++) {
    const A = keys[i - 1], B = keys[i];
    if (t > B.t) continue;
    const mv = B.mv ?? .2, ant = B.slow ? 0 : (B.ant ?? 2 / 24), t0 = B.t - mv - ant;
    if (t <= t0) return A.pose;
    if (t < t0 + ant) return poseLerp(A.pose, B.pose, -.12 * easeIn((t - t0) / ant));   // pull back
    const u = (t - t0 - ant) / mv;
    return poseLerp(A.pose, B.pose, B.slow ? ss(u) : backOut(u) * (1 - 0) + 0 * u);
  }
  return keys[keys.length - 1].pose;
}

// damped oscillation after each hit time: plume sway, ribbon swing
export function ring(t, hits, amp = 1, k = 4.2, w = 13) {
  let v = 0;
  for (const h of hits) if (t >= h) v += amp * Math.exp(-k * (t - h)) * Math.cos(w * (t - h));
  return v;
}
export const bob = (t, f = .35, a = 1) => Math.sin(t * Math.PI * 2 * f) * a;

// piecewise linear / smooth track for scalars: [[t, v], …]
export function track(pts, t, smooth = true) {
  if (t <= pts[0][0]) return pts[0][1]; if (t >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  let i = 1; while (t > pts[i][0]) i++;
  const u = (t - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
  return lerp(pts[i - 1][1], pts[i][1], smooth ? ss(u) : u);
}
