// poses.js — held poses as joint angles (from "down", + toward screen-right) and the forward kinematics to stage them.
const D = a => [Math.sin(a), Math.cos(a)];
const add = (p, q, k = 1) => [p[0] + q[0] * k, p[1] + q[1] * k];
const PI = Math.PI;

const BASE = {
  lean: 0, headTilt: 0, look: 1, sway: 0, flagSway: 0, skirtHang: 0, skirtFan: 1, plume: 1, mouth: 0, brow: 1, blink: 0,
  legL: { th: -.3, sh: .05, ft: PI + .05 }, legR: { th: .3, sh: .05, ft: -.05 },
  armBack: 'L',
  armL: { sh: -.6, el: -.3, hand: 'sword', ws: { dir: 1.9, len: 220, amp: 30, flip: 1 } },
  armR: { sh: .9, el: 1.3, hand: 'fist', ws: { dir: 1.9, len: 210, amp: 30, flip: -1 } },
  weapon: { ang: 2.6, len: 700, grip: 230 },
};
const mk = o => {
  const r = JSON.parse(JSON.stringify(BASE));
  for (const k in o) { if (o[k] && typeof o[k] === 'object') { for (const j in o[k]) { if (o[k][j] && typeof o[k][j] === 'object') Object.assign(r[k][j], o[k][j]); else r[k][j] = o[k][j]; } } else r[k] = o[k]; }
  return r;
};

export const POSES = {
  // held liangxiang: weight left, spear diagonal, left sword-finger raised
  liangxiang: mk({ lean: -.07, headTilt: .16, sway: .5, flagSway: .4, skirtHang: .04, skirtFan: 1.1, brow: 1,
    legL: { th: -.36, sh: .1, ft: PI + .06 }, legR: { th: .58, sh: .16, ft: -.1 },
    armL: { sh: -2.15, el: -3.05, ws: { dir: 2.35, len: 230, amp: 34 } }, armR: { sh: 1.22, el: 1.62, ws: { dir: 1.95, len: 210, amp: 30 } },
    weapon: { ang: 2.62, len: 700, grip: 230 } }),
  // crouched wind-up just before the snap
  pre: mk({ lean: .22, headTilt: .1, sway: -.6, flagSway: -.8, skirtHang: -.35, skirtFan: .8,
    legL: { th: -.9, sh: -.1, ft: PI + .2 }, legR: { th: .9, sh: .35, ft: -.3 },
    armL: { sh: -1.2, el: -1.6, ws: { dir: 2.6, len: 200, amp: 20 } }, armR: { sh: .7, el: .95, ws: { dir: 2.4, len: 200, amp: 20 } },
    weapon: { ang: 1.9, len: 700, grip: 230 } }),
  // stage-step carry: spear upright at the right hand, left sleeve trailing
  carry: mk({ lean: .05, headTilt: .04, skirtHang: -.1, flagSway: -.3, sway: -.2,
    armL: { sh: -.75, el: -.55, ws: { dir: 2.4, len: 230, amp: 34 } }, armR: { sh: .75, el: .55, ws: { dir: 2.2, len: 210, amp: 26 } },
    weapon: { ang: 3.18, len: 700, grip: 240 } }),
  // wide ready stance facing the spirit
  ready: mk({ lean: .04, headTilt: .06, sway: .2, skirtHang: 0, skirtFan: 1.2, brow: 1.5,
    legL: { th: -.52, sh: .06, ft: PI + .06 }, legR: { th: .52, sh: .06, ft: -.06 },
    armL: { sh: -1.3, el: -2.7, ws: { dir: 2.5, len: 220, amp: 30 } }, armR: { sh: 1.15, el: 1.55, ws: { dir: 2.0, len: 200, amp: 28 } },
    weapon: { ang: 1.95, len: 700, grip: 230 } }),
  // lunge: spear thrust level
  thrust: mk({ lean: .36, headTilt: -.1, sway: -.8, flagSway: -1.2, skirtHang: -.8, skirtFan: .7, brow: 1.5, mouth: .7,
    legL: { th: -1.0, sh: -.55, ft: PI + .3 }, legR: { th: 1.0, sh: .18, ft: -.1 },
    armL: { sh: -1.8, el: -2.3, ws: { dir: PI + .3, len: 300, amp: 44 } }, armR: { sh: 1.45, el: 1.5, ws: { dir: PI - .1, len: 240, amp: 38 } },
    weapon: { ang: 1.5, len: 700, grip: 230 } }),
  // parry: spear overhead
  parry: mk({ lean: -.18, headTilt: -.08, sway: .6, flagSway: .8, skirtHang: .35, skirtFan: 1.2, brow: 1.4,
    legL: { th: -.6, sh: .15, ft: PI + .08 }, legR: { th: .4, sh: .1, ft: -.05 },
    armL: { sh: -.9, el: -1.2, ws: { dir: 2.2, len: 240, amp: 40 } }, armR: { sh: 1.9, el: 2.1, ws: { dir: 2.4, len: 220, amp: 34 } },
    weapon: { ang: 2.0, len: 700, grip: 260 } }),
  // low sweep
  sweep: mk({ lean: .42, headTilt: -.05, sway: -.9, flagSway: -1.3, skirtHang: -.7, skirtFan: .8, brow: 1.5, mouth: .5,
    legL: { th: -1.12, sh: -.1, ft: PI + .3 }, legR: { th: .95, sh: .75, ft: -.05 },
    armL: { sh: -2.0, el: -2.7, ws: { dir: PI + .4, len: 300, amp: 40 } }, armR: { sh: 1.1, el: 1.1, ws: { dir: PI + .2, len: 240, amp: 36 } },
    weapon: { ang: 1.12, len: 700, grip: 230 } }),
  // the flying leap
  leap: mk({ lean: .5, headTilt: -.15, sway: -1, flagSway: -1.6, skirtHang: -.95, skirtFan: .7, plume: .5, mouth: 1, brow: 1.4,
    legL: { th: -1.28, sh: -1.38, ft: PI - .55 }, legR: { th: 1.15, sh: .28, ft: -.15 },
    armL: { sh: -1.75, el: -2.25, ws: { dir: PI + .3, len: 330, amp: 50 } }, armR: { sh: 1.45, el: 1.42, ws: { dir: PI - .15, len: 240, amp: 42 } },
    weapon: { ang: 1.38, len: 760, grip: 250 } }),
  // spear stuck in the gate: held lunge, breathing
  bite: mk({ lean: .3, headTilt: .02, sway: -.4, flagSway: -.7, skirtHang: -.5, skirtFan: .8, brow: 1.4,
    legL: { th: -1.0, sh: -.4, ft: PI + .3 }, legR: { th: .95, sh: .2, ft: -.1 },
    armL: { sh: -1.7, el: -2.2, ws: { dir: PI + .3, len: 260, amp: 30 } }, armR: { sh: 1.42, el: 1.5, ws: { dir: PI - .1, len: 220, amp: 28 } },
    weapon: { ang: 1.5, len: 700, grip: 230 } }),
  // eyes on the disc: weight settles, head turns, chest opens
  gaze: mk({ lean: .14, headTilt: -.02, sway: .2, flagSway: .1, skirtHang: -.2, skirtFan: 1, brow: .6,
    legL: { th: -.8, sh: -.12, ft: PI + .2 }, legR: { th: .8, sh: .15, ft: -.1 },
    armL: { sh: -.9, el: -1.2, ws: { dir: 2.3, len: 230, amp: 20 } }, armR: { sh: 1.42, el: 1.5, ws: { dir: PI - .1, len: 220, amp: 20 } },
    weapon: { ang: 1.5, len: 700, grip: 230 } }),
  // spear freed and turned: butt toward the disc, held level at shoulder height
  butt: mk({ lean: .1, headTilt: -.03, sway: .1, flagSway: 0, skirtHang: -.1, skirtFan: 1, brow: .8,
    legL: { th: -.7, sh: -.08, ft: PI + .12 }, legR: { th: .72, sh: .1, ft: -.06 },
    armL: { sh: -1.0, el: -1.9, ws: { dir: 2.3, len: 220, amp: 22 } }, armR: { sh: 1.2, el: 1.45, ws: { dir: 2.2, len: 200, amp: 22 } },
    weapon: { ang: 4.7124, len: 700, grip: 190 } }),
  // the stroke: arm drives the butt forward
  gong: mk({ lean: .28, headTilt: -.06, sway: -.6, flagSway: -.9, skirtHang: -.55, skirtFan: .8, brow: 1.2, mouth: .4,
    legL: { th: -.95, sh: -.3, ft: PI + .25 }, legR: { th: .9, sh: .2, ft: -.1 },
    armL: { sh: -1.7, el: -2.4, ws: { dir: PI + .25, len: 300, amp: 40 } }, armR: { sh: 1.5, el: 1.52, ws: { dir: PI - .1, len: 230, amp: 32 } },
    weapon: { ang: 4.7124, len: 700, grip: 190 } }),
  // after: relaxed, smiling, spear upright
  ease: mk({ lean: -.02, headTilt: .08, sway: .3, flagSway: .2, skirtHang: .02, skirtFan: 1.05, brow: .3, mouth: .15,
    legL: { th: -.4, sh: .1, ft: PI + .06 }, legR: { th: .5, sh: .12, ft: -.08 },
    armL: { sh: -2.0, el: -2.9, ws: { dir: 2.4, len: 230, amp: 30 } }, armR: { sh: 1.0, el: .8, ws: { dir: 2.1, len: 210, amp: 26 } },
    weapon: { ang: 3.05, len: 700, grip: 240 } }),
};

// walking legs (stage steps, cubu): tiny quick steps, minimal bounce. ph in cycles.
export function walkLegs(ph) {
  const a = Math.sin(ph * 2 * PI), b = Math.sin((ph + .5) * 2 * PI);
  const lift = x => Math.max(0, Math.cos(x * 2 * PI));
  return {
    legL: { th: -.1 + .22 * a, sh: .06 - .5 * Math.max(0, Math.cos(ph * 2 * PI)) * .0 - .55 * lift(ph) * (a > 0 ? 1 : .3), ft: PI + .06 - .15 * lift(ph) },
    legR: { th: .1 + .22 * b, sh: .06 - .55 * lift(ph + .5) * (b > 0 ? 1 : .3), ft: -.06 + .15 * lift(ph + .5) },
    bob: -Math.abs(Math.sin(ph * 2 * PI)) * 3,
  };
}

// forward kinematics in hero-local units (hip at the origin, scale 1)
export function heroPoints(p) {
  const lean = p.lean, up = [Math.sin(lean), -Math.cos(lean)], rt = [Math.cos(lean), Math.sin(lean)];
  const chest = add([0, 0], up, 226);
  const shR = add(add(chest, rt, 74), up, -12), shL = add(add(chest, rt, -74), up, -12);
  const front = p.armBack === 'R' ? -1 : 1, fa = front > 0 ? p.armR : p.armL, sh = front > 0 ? shR : shL;
  const wrF = add(add(sh, D(fa.sh), 100), D(fa.el), 96);
  const bs = front > 0 ? shL : shR, ba = front > 0 ? p.armL : p.armR, wrB = add(add(bs, D(ba.sh), 100), D(ba.el), 96);
  const w = p.weapon, tip = add(wrF, D(w.ang), w.len - w.grip), butt = add(wrF, D(w.ang), -w.grip);
  const ank = (leg, s) => { const hip = add([0, 0], rt, s * 30), knee = add(hip, D(leg.th), 176); return add(knee, D(leg.sh), 168); };
  const aL = ank(p.legL, -1), aR = ank(p.legR, 1);
  const headUp = [Math.sin(lean + p.headTilt), -Math.cos(lean + p.headTilt)];
  return { chest, wrF, wrB, tip, butt, aL, aR, low: Math.max(aL[1], aR[1]) + 30, head: add(chest, headUp, 98) };
}
