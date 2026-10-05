// Silhouette performers: a 2D skeleton solved per frame (hands and feet are targets, elbows and knees by two-bone IK),
// painted as clean flat shapes with no faces. Poses are blended sets scheduled on the song's bar grid.
import { proj } from './cam.js';
import { ss, lerp, clamp } from '/core/lib.js';

const L1 = .30, L2 = .27, T1 = .46, T2 = .46;      // upper arm, forearm, thigh, shin (m)
const SHW = .185, HPW = .10, TORSO = .56;

function ik(P, T, l1, l2, pick) {          // two-bone IK, returns the middle joint; pick(a, b) chooses between the two solutions
  let dx = T[0] - P[0], dy = T[1] - P[1], d = Math.hypot(dx, dy);
  const dm = (l1 + l2) * .999; if (d > dm) { dx *= dm / d; dy *= dm / d; d = dm; }
  d = Math.max(d, .12);
  const ca = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), a = Math.acos(ca), base = Math.atan2(dy, dx);
  const A = [P[0] + Math.cos(base + a) * l1, P[1] + Math.sin(base + a) * l1], B = [P[0] + Math.cos(base - a) * l1, P[1] + Math.sin(base - a) * l1];
  return pick(A, B) ? A : B;
}
// a pose: hipX, hipY, lean, tilt (head), hL, hR (hand targets), fL, fR (foot targets), all in metres in the figure's own frame
export const STAND = { hipX: 0, hipY: .92, lean: 0, tilt: 0, hLx: -.30, hLy: .85, hRx: .30, hRy: .85, fLx: -.15, fLy: 0, fRx: .15, fRy: 0 };
export const mk = o => Object.assign({}, STAND, o);
export function blend(a, b, w) { const o = {}; for (const k in a) o[k] = lerp(a[k], b[k], w); return o; }
// scheduled poses: sched = [[t, pose], ...] sorted; each pose is reached in `dur` seconds after its time
export function sched(S, t, dur = .32) {
  let i = 0; while (i + 1 < S.length && t >= S[i + 1][0]) i++;
  if (i === 0) return S[0][1];
  const w = ss((t - S[i][0]) / (S[i][2] || dur)); return blend(S[i - 1][1], S[i][1], w);
}

function solve(p) {
  const J = {}; J.hip = [p.hipX, p.hipY];
  const ln = p.lean; J.sh = [J.hip[0] + Math.sin(ln) * TORSO, J.hip[1] + Math.cos(ln) * TORSO];
  const px = Math.cos(ln), py = -Math.sin(ln);
  J.shL = [J.sh[0] - px * SHW, J.sh[1] - py * SHW]; J.shR = [J.sh[0] + px * SHW, J.sh[1] + py * SHW];
  J.head = [J.sh[0] + Math.sin(ln * .5 + p.tilt) * .26, J.sh[1] + Math.cos(ln * .5 + p.tilt) * .26];
  J.hL = [p.hLx, p.hLy]; J.hR = [p.hRx, p.hRy];
  J.eL = ik(J.shL, J.hL, L1, L2, (a, b) => a[1] < b[1] || (a[1] === b[1] && a[0] < b[0]));
  J.eR = ik(J.shR, J.hR, L1, L2, (a, b) => a[1] < b[1] || (a[1] === b[1] && a[0] > b[0]));
  J.hpL = [J.hip[0] - HPW, J.hip[1]]; J.hpR = [J.hip[0] + HPW, J.hip[1]];
  J.fL = [p.fLx, p.fLy]; J.fR = [p.fRx, p.fRy];
  J.kL = ik(J.hpL, J.fL, T1, T2, (a, b) => a[0] < b[0]); J.kR = ik(J.hpR, J.fR, T1, T2, (a, b) => a[0] > b[0]);
  return J;
}

// painting ------------------------------------------------------------------------------------------------------
function limb(c, a, b, r1, r2) {            // tapered capsule from a to b, opaque
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2, dx = Math.cos(ang), dy = Math.sin(ang);
  c.beginPath(); c.moveTo(a[0] + dx * r1, a[1] + dy * r1); c.lineTo(b[0] + dx * r2, b[1] + dy * r2); c.lineTo(b[0] - dx * r2, b[1] - dy * r2); c.lineTo(a[0] - dx * r1, a[1] - dy * r1); c.closePath(); c.fill();
  c.beginPath(); c.arc(a[0], a[1], r1, 0, 7); c.fill(); c.beginPath(); c.arc(b[0], b[1], r2, 0, 7); c.fill();
}
function body(c, J, p, X) {                  // c is already in screen space; X maps metres -> pixels through a transform
  const m = (q) => X(q);
  limb(c, m(J.hip), m(J.sh), X.s * .125, X.s * .16);                     // torso
  limb(c, m(J.shL), m(J.shR), X.s * .06, X.s * .06);                     // shoulders
  limb(c, m(J.shL), m(J.eL), X.s * .062, X.s * .05); limb(c, m(J.eL), m(J.hL), X.s * .05, X.s * .04);
  limb(c, m(J.shR), m(J.eR), X.s * .062, X.s * .05); limb(c, m(J.eR), m(J.hR), X.s * .05, X.s * .04);
  limb(c, m(J.hpL), m(J.kL), X.s * .085, X.s * .062); limb(c, m(J.kL), m(J.fL), X.s * .062, X.s * .042);
  limb(c, m(J.hpR), m(J.kR), X.s * .085, X.s * .062); limb(c, m(J.kR), m(J.fR), X.s * .062, X.s * .042);
  limb(c, m(J.fL), m([J.fL[0] + .13 * (J.fL[0] < J.hip[0] ? -1 : 1), J.fL[1] + .0]), X.s * .036, X.s * .03);
  limb(c, m(J.fR), m([J.fR[0] + .13, J.fR[1] + .0]), X.s * .036, X.s * .03);
  limb(c, m(J.sh), m(J.head), X.s * .05, X.s * .05);                      // neck
  c.beginPath(); const h = m(J.head); c.ellipse(h[0], h[1] - X.s * .02, X.s * .108, X.s * .128, 0, 0, 7); c.fill();   // head
}

export const OFF = document.createElement('canvas'); OFF.width = 1500; OFF.height = 1500;
const octx = OFF.getContext('2d');

// draw one performer. spec: {base:[X,Y,Z], cam, pose, props(c, X, p, J, t), flip, lit:{color, a}, rim:{color, a}, black}
export function performer(ctx, cam, spec, t) {
  const P = proj(cam, spec.base[0], spec.base[1], spec.base[2]); if (P.z < .6) return null;
  const s = P.s, fl = spec.flip ? -1 : 1, p = spec.pose, J = solve(p);
  const Xmap = (c0, ox, oy) => { const f = q => [ox + q[0] * s * fl, oy - q[1] * s]; f.s = s; return f; };
  const paint = (c, ox, oy, style) => {
    c.fillStyle = style; c.strokeStyle = style; c.lineCap = 'round'; c.lineJoin = 'round';
    const X = Xmap(c, ox, oy);
    if (spec.props) spec.props(c, X, p, J, t, style);
    body(c, J, p, X);
  };
  const rim = spec.rim;
  if (rim && rim.a > .01) {
    const col = rim.color.map(v => Math.round(v * rim.a));
    for (const [dx, dy] of [[-2.2, -3.2], [2.2, -3.2], [0, -4.4]]) paint(ctx, P.x + dx * Math.min(1.8, s / 150), P.y + dy * Math.min(1.8, s / 150), `rgb(${col[0]},${col[1]},${col[2]})`);
  }
  paint(ctx, P.x, P.y, spec.black || '#05060b');
  if (spec.lit && spec.lit.a > .01) {              // a follow spot or a front light on the figure: opaque gradient painted off-screen, then added
    const ox = 750, oy = 1300, lc = spec.lit.color; octx.clearRect(0, 0, 1500, 1500);
    const g = octx.createLinearGradient(0, oy - 2.4 * s, 0, oy);
    g.addColorStop(0, `rgb(${lc[0]},${lc[1]},${lc[2]})`); g.addColorStop(.55, `rgb(${lc[0] * .75 | 0},${lc[1] * .75 | 0},${lc[2] * .75 | 0})`); g.addColorStop(1, `rgb(${lc[0] * .25 | 0},${lc[1] * .25 | 0},${lc[2] * .25 | 0})`);
    paint(octx, ox, oy, g);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = spec.lit.a;
    ctx.drawImage(OFF, P.x - ox, P.y - oy); ctx.restore();
  }
  return { x: P.x, y: P.y, s, head: [P.x + J.head[0] * s * fl, P.y - J.head[1] * s], J };
}

// props -----------------------------------------------------------------------------------------------------------
const seg = (c, X, a, b, w) => { const A = X(a), B = X(b); c.lineWidth = w * X.s; c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); };
const ell = (c, X, q, rx, ry, rot = 0) => { const A = X(q); c.beginPath(); c.ellipse(A[0], A[1], rx * X.s, ry * X.s, rot, 0, 7); c.fill(); };
export function micStand(c, X) {
  seg(c, X, [.04, 0], [.04, 1.42], .018); seg(c, X, [.04, 1.42], [.0, 1.57], .016); ell(c, X, [-.005, 1.585], .028, .05, .3);
  ell(c, X, [.04, .01], .17, .03);
}
export function guitarProps(neck, tilt = 0) {     // body at the hip, neck going up and out to the left
  return (c, X, p, J) => {
    const cx = J.hip[0] + .06, cy = J.hip[1] - .02, a = tilt;
    const rot = (q) => [cx + (q[0]) * Math.cos(a) - q[1] * Math.sin(a), cy + q[0] * Math.sin(a) + q[1] * Math.cos(a)];
    ell(c, X, rot([0, 0]), .20, .14, -a * 1.0 - .2); ell(c, X, rot([-.14, .12]), .12, .11, -a);
    seg(c, X, rot([-.1, .1]), rot([-neck, .35]), .035);
    const e = rot([-neck, .35]); const h = X([e[0] - .09, e[1] + .05]); const h0 = X(e); c.lineWidth = .05 * X.s; c.beginPath(); c.moveTo(h0[0], h0[1]); c.lineTo(h[0], h[1]); c.stroke();
    c.lineWidth = .02 * X.s; const s1 = X([cx - .05, cy + .2]), s2 = X([cx + .2, cy + .05]); c.beginPath(); c.moveTo(s1[0], s1[1]); c.lineTo(s2[0], s2[1]); c.stroke();  // strap
  };
}
// the drum kit seen from the front, in the drummer's frame
export function kit(c, X, p, J, t, style, st) {
  ell(c, X, [.05, .36], .34, .34);                                     // kick
  ell(c, X, [-.78, .84], .2, .045); seg(c, X, [-.78, 0], [-.78, .84], .02);                   // hi-hat
  ell(c, X, [-.28, .72], .24, .05); seg(c, X, [-.28, .0], [-.28, .72], .02);                  // snare
  ell(c, X, [-.22, 1.06], .2, .06); ell(c, X, [.24, 1.06], .2, .06);                         // rack toms
  seg(c, X, [-.22, .86], [-.22, 1.0], .02); seg(c, X, [.24, .86], [.24, 1.0], .02);
  ell(c, X, [.85, .62], .27, .07); seg(c, X, [.85, .0], [.85, .6], .02);                     // floor tom
  ell(c, X, [-.6, 1.52], .27, .03, -.15); seg(c, X, [-.6, 0], [-.6, 1.5], .016);             // crash
  ell(c, X, [.72, 1.4], .3, .03, .12); seg(c, X, [.72, 0], [.72, 1.4], .016);                // ride
  ell(c, X, [.05, .01], .8, .03);                                                         // rug
}
export function stick(c, X, from, to) { seg(c, X, from, to, .014); }
