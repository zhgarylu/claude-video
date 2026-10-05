// What the eye behind the slit holds: a leaky integrator of the flashes. Each time a slit crosses the line of sight
// (angle = a multiple of 30 degrees) it lets that drawing's light in; the retina keeps it for tau seconds.
// Stepped at 1/1920 s straight from the real rotation table, so slow, fast, backwards and 24-fps beating are all physical.
import { THETA, thetaRes } from '../timeline.js';
import { clamp } from '/core/lib.js';

export const TAU_EYE = 0.04, SLIT_HALF = 1.45, GAIN = 10.5;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// returns { w: Float64Array(12) light per drawing (0..1 after gain), B: overall brightness, open: slit-open fraction over the last 1/24 s }
export function eyeAt(t, win = 0.45) {
  const w = new Float64Array(12), n1 = Math.floor(t * thetaRes), n0 = Math.max(0, n1 - Math.round(win * thetaRes)), dt = 1 / thetaRes, a = Math.exp(-dt / TAU_EYE), inc = 1 - a;
  let openSum = 0, cnt = 0;
  for (let i = n0; i <= n1; i++) {
    const th = THETA[i], m = Math.round(th / 30), d = Math.abs(th - 30 * m);
    for (let k = 0; k < 12; k++) w[k] *= a;
    const open = 1 - sstep(SLIT_HALF - 0.45, SLIT_HALF + 0.45, d);
    if (open > 0) { const k = (((m - 3) % 12) + 12) % 12; w[k] += open * inc; }
    if (i > n1 - Math.round(thetaRes / 24)) { openSum += open; cnt++; }
  }
  let B = 0; for (let k = 0; k < 12; k++) { w[k] = Math.min(1, w[k] * GAIN); B += w[k]; }
  return { w, B: Math.min(1, B), open: openSum / Math.max(1, cnt) };
}
