// machine.js: the whole chain as one deterministic function of machine time tau (seconds since the first tick).
// Units: centimetres, seconds, radians. Every part is placed by the part before it (the layout is derived, not typed),
// every moving part is a function of tau, and the same code yields the sound/cause events and the map durations.
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t, ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };   // (same as core/lib.js; inlined so node can import this file too)
import { gearDims, meshAngle } from './gears.js';

export const B = 0.625;                    // one beat = one half swing of a 38.8 cm pendulum (96 BPM)
export const PEND_L = 38.8;                // g (T/2pi)^2 with T = 1.25 s
const G = 981, ROLL = 5 / 7, RB = 1.2;     // gravity, rolling-sphere factor, marble radius
const D2R = Math.PI / 180;
export const ZT = 7;                       // z of the marble tracks (the board is z = 0)
const TICK = 0.09;                         // duration of the wheel's jump

// ---------------------------------------------------------------- helpers
class Table {                              // uniformly sampled function of tau
  constructor(t0, dt, arr) { this.t0 = t0; this.dt = dt; this.a = arr; }
  at(t) { const x = (t - this.t0) / this.dt; if (x <= 0) return this.a[0]; const i = Math.floor(x); if (i >= this.a.length - 1) return this.a[this.a.length - 1]; return lerp(this.a[i], this.a[i + 1], x - i); }
  get end() { return this.t0 + this.dt * (this.a.length - 1); }
}
const snap = u => u < 1 ? 1 - Math.pow(1 - Math.max(0, u), 3) : 1 + 0.05 * Math.exp(-(u - 1) * 6) * Math.sin((u - 1) * 48);
const Wn = tau => { if (tau < 0) return 0; const k = Math.floor(tau / B); return k + snap((tau - k * B) / TICK); };   // wheel advance in teeth
const stepRes = (t, w, z) => {             // unit step response of a damped 2nd-order system
  if (t <= 0) return 0; const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z / Math.sqrt(1 - z * z) * Math.sin(wd * t));
};
function findCross(f, a, b, level, dt = 0.0005) { let prev = f(a); for (let t = a + dt; t <= b; t += dt) { const v = f(t); if ((prev - level) * (v - level) <= 0) return t; prev = v; } return NaN; }

// ---------------------------------------------------------------- the build
export function buildMachine(cfg = {}) {
  const pair2 = cfg.pair2 || [12, 48];           // the second gear pair: [pinion, wheel]
  const M = 0.5;                                  // gear module
  const P = {};                                   // layout
  const ev = [];                                  // events: {tau, type, ...}
  const add = (tau, type, o = {}) => ev.push({ tau, type, ...o });

  // ---------- link 1: escapement
  P.W = [22, 47.5]; P.A = [22, 57.0]; P.wheelR = 7.5; P.wheelN = 30;
  P.pinR = 6.0; P.pin0 = 60 * D2R;                 // the release pin on the escape wheel: 60 deg before it reaches the 3 o'clock lever
  const pinAng = tau => P.pin0 - Wn(tau) * 12 * D2R;
  const AMP = 6.6 * D2R, pend = tau => AMP * Math.sin(Math.PI * tau / B);
  const hG = tau => { const w = Wn(tau); return ss(w - 4) - ss(w - 6); };    // the pin presses the lever during tick 4, lets go during tick 6
  P.Sg = [31, 44.5]; P.sgL = 3.0; P.sgR = 9.0; const psiMax = Math.asin(1.25 / P.sgL);
  const sgAng = tau => hG(tau) * psiMax;           // lever angle (left tip down)
  const liftL1 = tau => P.sgR * Math.sin(sgAng(tau));     // right tip rise
  P.Lp1 = 12; P.Pp1 = [52, 46.0];                  // release plank 1 (hinged at its right end)
  const tilt1 = tau => Math.asin(clamp(liftL1(tau) / P.Lp1, 0, 0.99));
  for (let k = 0; k < 40; k++) add(k * B, 'tick', { k, tock: k % 2 === 1 });

  // ---------- link 2: ramp. Solve its length so the marble lands in the cup exactly on beat 6
  const thA = 14 * D2R; P.thA = thA; const T_LAND = 6 * B;
  const nrm = t => [Math.sin(t), Math.cos(t)];
  const ballOffset = RB + 0.35;
  const sim1 = LA => {
    // 1-D integration along plank then ramp, slope of the plank follows tau
    const d0 = 7.0; let tau = 2.3, s = 0, v = 0; const dt = 0.0005; const Ltot = P.Lp1 + LA; const arr = [];
    let tRel = NaN;
    while (s < Ltot && tau < 8) {
      const sinT = s < d0 ? Math.sin(tilt1(tau)) : Math.sin(thA);       // s is measured from the start; the plank part ends at s = d0 (pivot)
      const a = ROLL * G * sinT; v += a * dt; s += v * dt; tau += dt;
      if (!(tRel > 0) && s > 0.02) tRel = tau;
    }
    // exit state at the ramp end: s = d0 + LA
    return { tau, v, s, tRel };
  };
  // geometry of the whole path, with s measured from the start: plank part is d0 = 7 long, then the ramp of length LA
  const D0 = 7.0;
  const flight = (v, th, drop) => { // time to fall `drop` cm with start velocity v along (cos th, -sin th)
    const vy = v * Math.sin(th); const a = 0.5 * G; const T = (-vy + Math.sqrt(vy * vy + 4 * a * drop)) / (2 * a); return T;
  };
  const sim1b = LA => {   // with the plank part only D0 long, ramp LA long
    let tau = 2.3, s = 0, v = 0; const dt = 0.0005; let tRel = NaN;
    while (s < D0 + LA && tau < 9) {
      const sinT = s < D0 ? Math.sin(tilt1(tau)) : Math.sin(thA);
      v += ROLL * G * sinT * dt; s += v * dt; tau += dt; if (!(tRel > 0) && s > 0.02) tRel = tau;
    }
    const T = flight(v, thA, 12);
    return { tEnd: tau, v, tLand: tau + T, tRel, T };
  };
  let lo = 30, hi = 220;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; (sim1b(mid).tLand < T_LAND) ? lo = mid : hi = mid; }
  P.LA = (lo + hi) / 2; const R1 = sim1b(P.LA);
  P.tRel1 = R1.tRel; P.tEnd1 = R1.tEnd; P.v1 = R1.v;
  // ramp A geometry (ball-centre path): from the plank pivot downhill to E1
  const ctr = (p, t) => { const n = nrm(t); return [p[0] + n[0] * ballOffset, p[1] + n[1] * ballOffset]; };
  P.rampA0 = [P.Pp1[0], P.Pp1[1]];                 // floor point at the plank pivot
  P.rampA1 = [P.rampA0[0] + P.LA * Math.cos(thA), P.rampA0[1] - P.LA * Math.sin(thA)];
  const E1 = ctr(P.rampA1, thA);                   // up-normal of a floor that falls to the right at angle th is (sin th, cos th)
  // ball-1 positions as a function of tau
  const b1Table = (() => {
    let tau = 2.3, s = 0, v = 0; const dt = 0.001, arr = [], vv = []; const t0 = tau;
    while (tau < 3.0 + (T_LAND - 3.0) + 0.5) {
      if (s < D0 + P.LA) { const sinT = s < D0 ? Math.sin(tilt1(tau)) : Math.sin(thA); v += ROLL * G * sinT * dt; s += v * dt; }
      arr.push(s); vv.push(v); tau += dt;
    }
    return { s: new Table(t0, dt, arr), v: new Table(t0, dt, vv) };
  })();
  const b1Pos = tau => {
    const s = b1Table.s.at(tau);
    if (s < D0) {   // on the plank: distance from the pivot is D0 - s
      const t = tilt1(tau), d = D0 - s, c = Math.cos(t), si = Math.sin(t);
      const p = [P.Pp1[0] - d * c + 0 * si, P.Pp1[1] + d * si]; const q = [p[0] + si * ballOffset, p[1] + c * ballOffset];
      return { x: q[0], y: q[1], s, rolling: s > 0.02 };
    }
    const r = s - D0, p = [P.rampA0[0] + r * Math.cos(thA), P.rampA0[1] - r * Math.sin(thA)], q = ctr(p, thA);
    return { x: q[0], y: q[1], s, rolling: true };
  };
  const tFlight0 = R1.tEnd, vEnd = R1.v;
  const landPoint = (() => { const T = R1.T; return [E1[0] + vEnd * Math.cos(thA) * T, E1[1] - (vEnd * Math.sin(thA) * T + 0.5 * G * T * T)]; })();

  // ---------- link 3: the tipper
  const beamR = 14, a0 = 16 * D2R;
  P.cupC = 1.9;                                    // ball centre above the cup point
  P.cupEnd0 = [landPoint[0], landPoint[1] - P.cupC];
  P.Pv = [P.cupEnd0[0] + beamR * Math.cos(a0), P.cupEnd0[1] - beamR * Math.sin(a0)]; P.beamR = beamR;
  const aBeam = tau => a0 - 2 * a0 * stepRes(tau - T_LAND, 15, 0.34);       // + = cup end up
  const beamRise = tau => beamR * (Math.sin(a0) - Math.sin(aBeam(tau)));      // right-end rise from rest
  // long latch lever: tail on the beam's right end, hook on the stop disc
  P.latchTail = 25; P.latchHook = 4;
  P.Lv = [P.Pv[0] + beamR * Math.cos(a0) + P.latchTail, P.Pv[1] - beamR * Math.sin(a0)];       // lever pivot (the tail rests on the beam end)
  const latchAng = tau => Math.atan2(beamRise(tau), P.latchTail);              // CW when the tail rises
  const hookDrop = tau => P.latchHook * Math.sin(latchAng(tau));
  const tRel = findCross(tau => hookDrop(tau), T_LAND, T_LAND + 1.5, 0.7);
  P.tTrain = tRel;
  add(T_LAND, 'land', { link: 3 });
  const tStop = findCross(tau => aBeam(tau), T_LAND, T_LAND + 1, -a0 * 0.999); add(tStop, 'clunk', { link: 3 });
  add(tRel, 'latch', { link: 4 });

  // ---------- link 4: the spring-driven gear train
  P.D = [P.Lv[0] + P.latchHook, P.Lv[1] + 5.8];      // the hook block's top sits 4.2 cm below D, level with the stop pin
  const [n1, n2] = [12, 48], [p2, g2] = pair2;
  const phi1 = -35 * D2R, phi2 = 30 * D2R;
  const dist = (a, b) => M * (a + b) / 2;
  P.E = [P.D[0] + dist(n1, n2) * Math.cos(phi1), P.D[1] + dist(n1, n2) * Math.sin(phi1)];
  P.F = [P.E[0] + dist(p2, g2) * Math.cos(phi2), P.E[1] + dist(p2, g2) * Math.sin(phi2)];
  P.phi1 = phi1; P.phi2 = phi2; P.M = M; P.pair1 = [n1, n2]; P.pair2 = pair2;
  const LIFT_TARGET = 20 * B;                      // the cam lifts its follower on beat 20
  P.T_SPIN = 0.5; P.CAM0_DEG = 0;
  // drive: D turns clockwise; speed chosen so that, with the 16:1 train, the cam lobe reaches the follower on beat 20
  const spin = x => x <= 0 ? 0 : (x < P.T_SPIN ? x * x / (2 * P.T_SPIN) : x - P.T_SPIN / 2);
  const RATIO1 = (n2 / n1) * (48 / 12);            // the design train (first run)
  const lobeTravel = (9 + 302) * D2R;              // from start until the lift has finished: lobe angle at rest is 90 deg + 311 deg
  const camSpeed1 = (lobeTravel - 4.5 * D2R) / spin(LIFT_TARGET - tRel);   // the follower is half way up (lobe 4.5 deg short of the top) on beat 20   // rad/s of the cam in the first run
  const wD = camSpeed1 * RATIO1;                   // rad/s of D (the same in both runs)
  const thD = tau => -wD * spin(tau - tRel);       // clockwise
  const eAng = tau => meshAngle(n1, n2, phi1, thD(tau));
  const p2Off = 0.35;
  const p2Ang = tau => eAng(tau) + p2Off;          // pinion 2 sits on E's arbor
  const g2Ang = tau => meshAngle(p2, g2, phi2, p2Ang(tau));
  const camRot = tau => g2Ang(tau) - g2Ang(-1);    // how far the F arbor has turned (negative = clockwise)
  const lobe0 = 90 * D2R + lobeTravel;
  const lobeAng = tau => lobe0 + camRot(tau);      // in the first run the lobe reaches 90 deg (top) exactly at the lift
  // follower profile: rises over the 9 deg before the lobe is at the top, dwells, falls slowly
  const LIFT = 3.4; P.LIFT = LIFT;
  const wrap = d => ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  const rise = d0 => { const d = wrap(d0); const up = ss((9 * D2R - d) / (9 * D2R)); const dn = ss((-d - 20 * D2R) / (25 * D2R)); return d > 0 ? up : (1 - dn); };   // d = lobe angle - 90 deg; the lobe turns clockwise so d falls
  const rodLift = tau => LIFT * rise(lobeAng(tau) - 90 * D2R);
  // the ratchet on the cam shaft: 16 teeth; a click every 22.5 degrees of arbor turn
  const RAT = 16; const tEndTrain = findCross(tau => rodLift(tau), tRel, tRel + 30, LIFT * 0.99);
  P.RAT = RAT;
  let lastK = 0;
  for (let tau = tRel; tau < (tEndTrain || tRel + 20); tau += 0.0005) {
    const k = Math.floor(-camRot(tau) / (2 * Math.PI / RAT)); if (k > lastK) { add(tau, 'ratchet', { link: 4, k }); lastK = k; }
  }
  add(tRel, 'spin', { link: 4, w: wD });
  const wDt = tau => wD * Math.min(1, Math.max(0, tau - tRel) / P.T_SPIN);
  // ---------- link 5: cam, follower, plank 2
  P.camR = 5.0; P.camRot0 = lobe0;
  const tilt2 = tau => Math.asin(clamp(rodLift(tau) / 18, 0, 0.99));
  P.Lp2 = 18;
  P.camTop = [P.F[0], P.F[1] + P.camR];
  P.plank2Y = P.camTop[1] + 18; P.Pp2 = [P.F[0] + P.Lp2 - 0.5, P.plank2Y];
  const tLift = findCross(tau => rodLift(tau), tRel, tRel + 30, LIFT * 0.5);
  add(tLift, 'lift', { link: 5 });

  // ---------- link 6: marble 2 down the plank, a connector, the corkscrew and a level run
  const D02 = 11.0, Lcon = 12, thC = 6 * D2R, R = 12, TURNS = 2;
  P.conn0 = [P.Pp2[0], P.Pp2[1]];
  P.conn1 = [P.conn0[0] + Lcon * Math.cos(thC), P.conn0[1] - Lcon * Math.sin(thC)];
  P.helix = { xs: P.conn1[0], R, zs: ZT + R, y0: P.conn1[1], turns: TURNS, drop: 30 };
  // path of floor points (x,y,z), cumulative length
  const pts = [];
  pts.push([P.conn0[0], P.conn0[1], ZT]); pts.push([P.conn1[0], P.conn1[1], ZT]);
  const NH = 360;
  for (let i = 1; i <= NH; i++) {
    const u = i / NH, phi = -Math.PI / 2 + u * TURNS * 2 * Math.PI;
    pts.push([P.helix.xs + R * Math.sin(0) + R * Math.cos(phi) - 0, P.helix.y0 - P.helix.drop * u, P.helix.zs + R * Math.sin(phi)]);
  }
  // the helix starts at its back point (z = ZT) moving +x: shift x so that the start meets the connector end
  for (let i = 2; i < pts.length; i++) pts[i][0] += 0;       // start of the helix: phi=-pi/2 -> x = xs + 0
  P.helixPts = pts.slice(2);
  const exitP = pts[pts.length - 1];
  P.xDom0 = exitP[0] + 20; P.yTrough = exitP[1];
  pts.push([P.xDom0 - 4, exitP[1], ZT]);
  P.path2 = pts;
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  P.path2len = cum[cum.length - 1];
  const slopeAt = s => { let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const dy = pts[i][1] - pts[i - 1][1], L = cum[i] - cum[i - 1]; return -dy / L; };
  const posAt = s => { if (s <= 0) return pts[0].slice(); let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const u = clamp((s - cum[i - 1]) / (cum[i] - cum[i - 1])); return [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u), lerp(pts[i - 1][2], pts[i][2], u)]; };
  const Lplank2 = P.Lp2;       // path starts at the plank pivot; the ball starts D02 earlier on the plank
  const b2Sim = (() => {
    let tau = tRel + 1, s = -D02, v = 0, hit = false; const dt = 0.001, sa = [], va = [];
    const t0 = tau; const sHit = P.path2len;
    while (tau < t0 + 14) {
      if (s < sHit) {
        const sinT = s < 0 ? Math.sin(tilt2(tau)) : slopeAt(s);
        v += ROLL * G * sinT * dt; s += v * dt;
      }
      sa.push(s); va.push(v); tau += dt;
    }
    return { s: new Table(t0, dt, sa), v: new Table(t0, dt, va) };
  })();
  const tHit2 = findCross(tau => b2Sim.s.at(tau), tRel + 1, tRel + 14, P.path2len);
  const vHit2 = (() => { const a = b2Sim.s.at(tHit2 - 0.002), b = b2Sim.s.at(tHit2); return (b - a) / 0.002; })();
  const pos2 = tau => {
    const s = b2Sim.s.at(tau);
    if (s < 0) {   // on plank 2
      const t = tilt2(tau), d = -s, c = Math.cos(t), si = Math.sin(t);
      const p = [P.Pp2[0] - d * c, P.Pp2[1] + d * si];
      return { x: p[0] + si * ballOffset, y: p[1] + c * ballOffset, z: ZT, s };
    }
    const q = posAt(Math.min(s, P.path2len)); const tt = Math.atan2(-(posAt(Math.min(s + 0.3, P.path2len))[1] - q[1]), Math.hypot(posAt(Math.min(s + .3, P.path2len))[0] - q[0], posAt(Math.min(s + .3, P.path2len))[2] - q[2]) || 1);
    return { x: q[0], y: q[1] + ballOffset * Math.cos(tt), z: q[2], s };
  };
  add(tLift + 0.05, 'roll2start', { link: 6 });

  // ---------- link 7: dominoes (planar contact law solved in a 1-ms integration)
  const DH = 6.5, DT = 0.9, DW = 3.4, DS = 3.6, ND = 26, ALPHA_REST = 75 * D2R;
  P.dom = { H: DH, T: DT, W: DW, S: DS, N: ND };
  const zOf = x => ZT + 14 * Math.pow(Math.sin(Math.PI * (x - P.xDom0) / 95), 2);
  const dpts = []; { let x = P.xDom0, acc = 0; let prev = [x, zOf(x)]; dpts.push([x, zOf(x)]); while (dpts.length < ND) { x += 0.05; const cur = [x, zOf(x)]; acc += Math.hypot(cur[0] - prev[0], cur[1] - prev[1]); prev = cur; if (acc >= DS) { dpts.push(cur); acc = 0; } } }
  P.domPos = dpts.map((p, i) => { const q = dpts[Math.min(i + 1, dpts.length - 1)], r = dpts[Math.max(i - 1, 0)]; const dx = (i === dpts.length - 1 ? p[0] - r[0] : q[0] - p[0]), dz = (i === dpts.length - 1 ? p[1] - r[1] : q[1] - p[1]); return { x: p[0], z: p[1], yaw: Math.atan2(dz, dx) }; });
  P.domY = P.yTrough + 0.35;                    // top of the shelf = the trough's floor surface, so the marble rolls on
  const contact = a => {           // lean of the next domino pushed by one that leans `a`
    const A = DH * Math.sin(a) - DS, Bq = DH * Math.cos(a), Rr = Math.hypot(A, Bq), ph = Math.atan2(Bq, A);
    const arg = -DT / Rr; if (arg < -1) return 0; const r = Math.acos(arg) - ph; return Math.max(0, Math.min(Math.PI / 2, r));
  };
  const KFALL = 3 * G / (2 * DH);
  const dom = (() => {
    // each domino: gravity (rod tipping about its edge) + a stiff damped contact with the one behind; reaction on the pusher
    const dt = 0.0002, every = 5, steps = Math.ceil(5 / dt), al = Array.from({ length: ND }, () => new Float32Array(Math.ceil(steps / every))), om = new Float64Array(ND), an = new Float64Array(ND), ac = new Float64Array(ND);
    const KC = 7000, CD = 2 * Math.sqrt(KC) * 0.8, tStart = tHit2, t0 = tStart - 0.02; let started = false;
    const dfda = a => (contact(a + 0.002) - contact(a)) / 0.002;
    for (let k = 0; k < steps; k++) {
      const tau = t0 + k * dt;
      if (!started && tau >= tStart) { started = true; om[0] = 3.2; an[0] = 0.002; }
      ac.fill(0);
      for (let i = 0; i < ND; i++) {
        if (i === 0 ? started : an[i] > 0) ac[i] += KFALL * Math.sin(Math.max(an[i], 0.02));
        if (i > 0) {
          const f = contact(an[i - 1]), pen = f - an[i];
          if (pen > 0) { const d = dfda(an[i - 1]); const vrel = om[i] - d * om[i - 1]; const F = Math.max(0, KC * pen - CD * vrel); ac[i] += F; ac[i - 1] -= F * d; }
        }
      }
      for (let i = 0; i < ND; i++) {
        if (i === 0 ? started : an[i] > 0 || ac[i] > 0.5) { om[i] += ac[i] * dt; an[i] += om[i] * dt; }
        const lim = i < ND - 1 ? ALPHA_REST : 86 * D2R; if (an[i] > lim) { an[i] = lim; om[i] = Math.min(om[i], 0); }
        if (an[i] < 0) { an[i] = 0; om[i] = Math.max(om[i], 0); }
        if (k % every === 0) al[i][k / every] = an[i];
      }
    }
    return { t0, dt: dt * every, al };
  })();
  const domAng = (i, tau) => { const x = (tau - dom.t0) / dom.dt; if (x <= 0) return 0; const k = Math.floor(x); const arr = dom.al[i]; if (k >= arr.length - 1) return arr[arr.length - 1]; return lerp(arr[k], arr[k + 1], x - k); };
  // contact times
  const domT = []; for (let i = 0; i < ND; i++) { let t = NaN; for (let k = 0; k < dom.al[i].length; k++) if (dom.al[i][k] > 0.03) { t = dom.t0 + k * dom.dt; break; } domT.push(t); }
  P.domT = domT;
  for (let i = 0; i < ND; i++) add(domT[i], 'domino', { link: 7, i, n: ND });
  add(tHit2, 'hit', { link: 7 });
  // ball 2 after the hit: bounces back a little and stops
  const b2After = tau => { const t = Math.max(0, tau - tHit2); const v1 = -0.18 * vHit2, dec = 160; const tt = Math.min(t, Math.abs(v1) / dec); return P.path2len + v1 * tt + 0.5 * dec * tt * tt; };
  const sB2 = tau => tau < tHit2 ? b2Sim.s.at(tau) : b2After(tau);

  // ---------- link 8: hammer and bell
  const tLast = (() => { for (let k = 0; k < dom.al[ND - 1].length; k++) if (dom.al[ND - 1][k] > 62 * D2R) return dom.t0 + k * dom.dt; return NaN; })();
  P.hammer = { x: P.domPos[ND - 1].x + 12, tHit: tLast };
  const tStrike = tLast + 0.10;
  add(tStrike, 'bell', { link: 8 });
  const hammerAng = tau => {      // 0 rest, rises to 1 at strike, rebounds
    if (tau < tLast) return 0; const u = (tau - tLast) / 0.10;
    if (u < 1) return ss(u) * 1.0; const w = tau - tStrike; return Math.max(0.12, 1 - 0.88 * ss(w / 0.18)) - 0.0;
  };
  const bellAng = tau => { const w = tau - tStrike; if (w < 0) return 0; return 0.05 * Math.exp(-w * 1.6) * Math.sin(2 * Math.PI * 7.5 * w); };
  const tEnd = tStrike + 0.2;

  // ---------- links: for the cause map (time each link takes from its trigger to its hand-over)
  const links = [
    { id: 1, name: 'ESCAPEMENT', t0: 0, t1: R1.tRel },
    { id: 2, name: 'RAMP', t0: R1.tRel, t1: T_LAND },
    { id: 3, name: 'TIPPER', t0: T_LAND, t1: tRel },
    { id: 4, name: 'GEAR TRAIN', t0: tRel, t1: tLift },
    { id: 5, name: 'CAM', t0: tLift, t1: tLift + 0.05 },
    { id: 6, name: 'CORKSCREW', t0: tLift + 0.05, t1: tHit2 },
    { id: 7, name: 'DOMINOES', t0: tHit2, t1: tLast },
    { id: 8, name: 'BELL', t0: tLast, t1: tStrike },
  ];

  // ---------- rolling-sound envelopes (speed over time), exported to the mixer
  const rollSpeed1 = tau => b1Table.v.at(tau), rollSpeed2 = tau => tau < tHit2 ? b2Sim.v.at(tau) : 0;
  const rolls = (() => {
    const out = [];
    const sample = (id, t0, t1, f, dt = 0.04) => { const pts = []; for (let t = t0; t <= t1 + 1e-9; t += dt) pts.push([+t.toFixed(3), +f(t).toFixed(1)]); out.push({ id, pts }); };
    sample('b1', R1.tRel, R1.tEnd, rollSpeed1);
    sample('b2', tLift, tHit2, rollSpeed2);
    return out;
  })();
  add(R1.tRel, 'roll1start', { link: 2 }); add(R1.tEnd, 'rampEnd', { link: 2 });

  // ---------- the state
  function state(tau) {
    const S = { tau };
    S.pend = pend(tau); S.anchor = S.pend; S.wheel = -Wn(tau) * 12 * D2R; S.pin = pinAng(tau);
    S.sg = sgAng(tau); S.tilt1 = tilt1(tau);
    const b1 = b1Pos(tau); S.b1 = { x: b1.x, y: b1.y, z: ZT, roll: -(b1.s || 0) / RB };
    if (tau > tFlight0) {                          // flight, then in the cup
      const t = tau - tFlight0, T = R1.T;
      if (t <= T) { S.b1.x = E1[0] + vEnd * Math.cos(thA) * t; S.b1.y = E1[1] - (vEnd * Math.sin(thA) * t + 0.5 * G * t * t); S.b1.roll = -(D0 + P.LA + vEnd * t) / RB; }
      else { const a = aBeam(tau); S.b1.x = P.Pv[0] - beamR * Math.cos(a); S.b1.y = P.Pv[1] + beamR * Math.sin(a) + P.cupC; S.b1.roll = -(D0 + P.LA + vEnd * T) / RB - (tau - tFlight0 - T) * 0; }
    }
    S.beam = aBeam(tau); S.latch = latchAng(tau);
    S.D = thD(tau); S.E = eAng(tau); S.P2 = p2Ang(tau); S.G2 = g2Ang(tau); S.cam = lobeAng(tau); S.rod = rodLift(tau); S.tilt2 = tilt2(tau);
    S.ratchet = camRot(tau);
    S.fly = (S.D) * 3;                             // the governor fan turns faster than D
    const b2 = pos2(tau); const s2 = sB2(tau);
    if (tau >= tHit2) { const q = posAt(Math.min(s2, P.path2len)); S.b2 = { x: q[0], y: q[1] + ballOffset, z: q[2], roll: -s2 / RB }; }
    else S.b2 = { x: b2.x, y: b2.y, z: b2.z, roll: -(b2.s || 0) / RB };
    S.dom = []; for (let i = 0; i < ND; i++) S.dom.push(domAng(i, tau));
    S.hammer = hammerAng(tau); S.bell = bellAng(tau);
    return S;
  }
  return { P, state, events: ev, links, rolls, tEnd, tLift, tRel, tHit2, tLast, tStrike, wD, wDt, ratio: (n2 / n1) * (g2 / p2), RB, ballOffset, E1, landPoint, rodLift, camRot, lobeAng };
}
