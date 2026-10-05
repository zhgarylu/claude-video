// The beam: draws the real stereo samples (L = X, R = Y, Z = intensity) with a phosphor persistence that is computed
// from the sample history at time t (no state from the previous frame).
export const SR = 48000;
const AGE = [0, .003, .007, .012, .019, .028, .04, .055, .075, .1, .135, .18, .235, .3, .37];
const NB = AGE.length - 1, WINS = Math.floor(AGE[NB] * SR);
const AB = new Uint8Array(WINS + 2); { let b = 0; for (let j = 0; j <= WINS + 1; j++) { while (b < NB - 1 && j / SR >= AGE[b + 1]) b++; AB[j] = b; } }
export const persist = a => .70 * Math.exp(-a / .045) + .30 * Math.exp(-a / .2);
const WB = []; for (let b = 0; b < NB; b++) WB.push(persist((AGE[b] + AGE[b + 1]) / 2));
const SPD = [1.2, 3, 6, 12, 1e9], SPF = [1, .72, .5, .33, .2];

// S: Int16Array interleaved L,R,Z. o: {ox, oy, ax, ay (px per unit), I (beam current), s (camera scale), lw, win (seconds), dwell}
export function trace(c, S, iEnd, o) {
  const { ox, oy, ax, ay, I = 1, s = 1, lw = 1.7, win = AGE[NB] } = o, K = .25;
  const n = Math.min(WINS, Math.floor(win * SR));
  const P = []; for (let b = 0; b < NB; b++) P.push([null, null, null, null, null]);
  const ghost = new Path2D(); let dwell = 0, nghost = 0;
  const i0 = Math.max(0, iEnd - n);
  let px = ox + S[3 * i0] / 32767 * ax, py = oy - S[3 * i0 + 1] / 32767 * ay, pz = S[3 * i0 + 2] / 32767;
  let hx = px, hy = py, hz = pz;
  for (let i = i0 + 1; i <= iEnd; i++) {
    const x = ox + S[3 * i] / 32767 * ax, y = oy - S[3 * i + 1] / 32767 * ay, z = S[3 * i + 2] / 32767;
    const b = AB[iEnd - i], zm = Math.min(z, pz);
    if (zm > .6) {
      const d = Math.hypot(x - px, y - py) * s; let k = 0; while (d > SPD[k]) k++;
      let p = P[b][k]; if (!p) P[b][k] = p = new Path2D(); p.moveTo(px, py); p.lineTo(x, y);
    } else if (zm > .01) {
      if (Math.abs(x - ox) < 3 && Math.abs(y - oy) < 3) dwell += WB[b] * zm;
      else if (Math.hypot(x - px, y - py) * s > 6 && b < 5) { ghost.moveTo(px, py); ghost.lineTo(x, y); nghost++; }
    }
    px = x; py = y; pz = z; hx = x; hy = y; hz = z;
  }
  const w1 = lw * Math.pow(s, .5) / s;
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
  for (let b = 0; b < NB; b++) for (let k = 0; k < 5; k++) {
    const p = P[b][k]; if (!p) continue;
    const a = Math.min(1, I * WB[b] * SPF[k] * K * 4);
    if (b < 10) { c.lineWidth = w1 * 4.4; c.strokeStyle = `rgba(25,210,100,${a * .13})`; c.stroke(p); }
    c.lineWidth = w1 * 2.0; c.strokeStyle = `rgba(80,255,150,${a * .40})`; c.stroke(p);
    c.lineWidth = w1 * .95; c.strokeStyle = `rgba(225,255,236,${a * .95})`; c.stroke(p);
  }
  if (nghost) { c.lineWidth = w1; c.strokeStyle = `rgba(60,200,120,${.10 * I})`; c.stroke(ghost); }
  // the parked spot (beam at rest burns a dot)
  const D = dwell / SR * (o.dwell ?? 30) * I;
  if (D > .002) {
    const r = 6 + 7 * Math.min(1, D);
    const g = c.createRadialGradient(ox, oy, 0, ox, oy, r * 3.2 / Math.sqrt(s)); const a = Math.min(1, D);
    g.addColorStop(0, `rgba(235,255,242,${a})`); g.addColorStop(.3, `rgba(110,255,170,${a * .7})`); g.addColorStop(1, 'rgba(20,200,90,0)');
    c.fillStyle = g; c.beginPath(); c.arc(ox, oy, r * 3.2 / Math.sqrt(s), 0, 7); c.fill();
  }
  // the beam head
  if (hz > .6 && o.head !== false) {
    const r = 9 / Math.sqrt(s) * (o.headScale || 1), g = c.createRadialGradient(hx, hy, 0, hx, hy, r);
    g.addColorStop(0, `rgba(240,255,246,${Math.min(1, .9 * I)})`); g.addColorStop(.35, 'rgba(120,255,175,.45)'); g.addColorStop(1, 'rgba(20,200,90,0)');
    c.fillStyle = g; c.beginPath(); c.arc(hx, hy, r, 0, 7); c.fill();
  }
  c.restore();
}

// A frozen figure from n consecutive samples starting at i0 (the thumbnails): one pass, no persistence.
export function figure(c, S, i0, n, ox, oy, ax, ay, a = 1, lw = 1.4) {
  const p = new Path2D(); let first = true;
  for (let i = i0; i < i0 + n; i++) {
    const x = ox + S[3 * i] / 32767 * ax, y = oy - S[3 * i + 1] / 32767 * ay;
    if (first) { p.moveTo(x, y); first = false; } else p.lineTo(x, y);
  }
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
  c.lineWidth = lw * 4; c.strokeStyle = `rgba(25,210,100,${.14 * a})`; c.stroke(p);
  c.lineWidth = lw * 1.8; c.strokeStyle = `rgba(80,255,150,${.4 * a})`; c.stroke(p);
  c.lineWidth = lw * .9; c.strokeStyle = `rgba(225,255,236,${.9 * a})`; c.stroke(p);
  c.restore();
}
