// film.js — "One Gong at Stone Gate": every shot as a function of time.
import { lerp, clamp, ss, eio, eo, mulberry } from '/core/lib.js';
import { PAL, ink, cel, flat, spl, arc, cat, trace, LW, textures } from './brush.js';
import * as S from './scenery.js';
import { drawHero } from './hero.js';
import { POSES, walkLegs, heroPoints } from './poses.js';
import { drawSpirit, SPIRIT_REST, spiritWorld } from './spirit.js';
import { drawStoneSpirit, facePaint } from './facepaint.js';
import { qt, poseAt, poseLerp, ring, track } from './anim.js';
import { BEAT, BAR, bar, SHOT, LINES, EST, HITS, TITLE, ENDCARD, DUR } from './timeline.js';
import { scrollWorld, gateWorld, reliefFace, gateDoors, GATE, PALS, ground, rockMass } from './world.js';
import { finish, subtitle, title, snapMarks } from './post.js';

LW.k = .82;
const W = 1920, H = 1080;
export const VOICE = { dur: { ...EST } };           // overwritten by voices/dur.json when present
const lineEnd = l => l.t + (VOICE.dur[l.id] ?? EST[l.id]);
const speaking = (who, t) => LINES.some(l => l.who === who && t >= l.t && t < lineEnd(l));
const flap = (t, open = .8) => (Math.floor(t * 8) % 2 ? open : .12);

// ------------------------------------------------------------------ helpers
function sec(p, t) {   // secondary motion on threes: plume, flags and ribbons swing after every hit; the pose itself does not change
  const t3 = qt(t, 8), q = JSON.parse(JSON.stringify(p));
  const r1 = ring(t3, HITS, .9), r2 = ring(t3, HITS, 1.1, 3.4, 11), r3 = ring(t3, HITS, .5, 3.0, 10);
  q.sway += r1 + .14 * Math.sin(t3 * 2.3); q.flagSway += r2 + .1 * Math.sin(t3 * 1.7);
  for (const k of ['armL', 'armR']) { q[k].ws.dir += r3 * (k === 'armL' ? 1 : -1) + .06 * Math.sin(t3 * 3 + (k === 'armL' ? 0 : 2)); q[k].ws.amp += Math.abs(r3) * 38; }
  return q;
}
function heroAt(ctx, p0, x, t, o = {}) {
  const { scale = .8, groundY = 1830, flip = false, who = 'ql', bob = 0, ft = true } = o;
  const p = sec(p0, t);
  if (speaking(who, t)) p.mouth = flap(t);
  const hp = heroPoints(p), y = groundY - hp.low * scale + bob;
  ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
  drawHero(ctx, p, { scale, seed: 11 });
  ctx.restore();
  return { x, y, pts: hp, scale, at: (v) => [x + v[0] * scale * (flip ? -1 : 1), y + v[1] * scale] };
}
function camera(ctx, cam, shake = 0, t = 0) {
  const sx = shake ? Math.sin(t * 130) * 7 * shake : 0, sy = shake ? Math.cos(t * 110) * 5 * shake : 0;
  ctx.scale(cam.s, cam.s); ctx.translate(-cam.x + sx, -cam.y + sy);
}
const strokes = (ctx, from, to, n, seed, col = PAL.white, w = 10, spread = 34) => {
  const r = mulberry(seed);
  for (let i = 0; i < n; i++) {
    const o = (r() - .5) * spread * 2, l = .7 + r() * .6, a = [from[0] + (r() - .5) * 30, from[1] + o], b = [lerp(from[0], to[0], l), lerp(from[1], to[1], l) + o * .6];
    ink(ctx, [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 2], b], { w: w * (.6 + r() * .8), col, seed: seed + i, taper: [.9, .02], minw: .02, alpha: .85, press: .1, wob: .2, dry: .3 });
  }
};
function clashMarks(ctx, p, t0, t, seed) {   // gold radial strokes for ~6 frames after a clash
  const a = t - t0; if (a < 0 || a > .26) return;
  const k = qt(a, 24) / .26;
  snapMarks(ctx, p[0], p[1], 36 + k * 50, 120 + k * 90, -3.2, 0.1, 9, seed, PAL.goldLt, 11 * (1 - k * .5));
  snapMarks(ctx, p[0], p[1], 30 + k * 40, 90 + k * 60, 0.2, 3.0, 7, seed + 9, PAL.white, 8 * (1 - k * .5));
}
function driftClouds(ctx, t, P, list) { for (const [x, y, s, sd, spd, fl] of list) S.xiangyun(ctx, ((x + t * spd) % 2600) - 340, y, s, sd, { fill: P.cloud, lineCol: P.cloudLine, gold: PAL.goldDk, flip: fl ?? 1, lw: 4 }); }

// ------------------------------------------------------------------ keys
const K = (t, pose, mv, extra) => ({ t, pose, mv, ...extra });
const P_ = POSES;
const SP = (o) => ({ ...SPIRIT_REST, ...o });
const sGuard = SP({ armA: { sh: -1.35, el: -2.7 }, armB: { sh: .9, el: .5 }, mace: { ang: -2.95 } });
const sSlam = SP({ armA: { sh: -1.9, el: -1.7 }, armB: { sh: 1.0, el: .6 }, mace: { ang: -1.65 }, tilt: -.06, mouth: .8 });
const sUp = SP({ armA: { sh: -2.3, el: -3.0 }, armB: { sh: 1.2, el: .8 }, mace: { ang: -3.05 }, tilt: .06, mouth: .6 });
const sLow = SP({ armA: { sh: -1.5, el: -1.95 }, armB: { sh: .9, el: .5 }, mace: { ang: -2.15 }, tilt: -.04 });
const sWatch = SP({ armA: { sh: -1.1, el: -2.6 }, armB: { sh: .8, el: .4 }, mace: { ang: -3.0 }, look: -1, tilt: .03 });
const sLaugh = SP({ armA: { sh: -.95, el: -2.9 }, armB: { sh: .9, el: .5 }, mace: { ang: -3.1 }, mouth: 1, tilt: .05 });

// ------------------------------------------------------------------ shots
const SCROLL_GROUND = 925;

function shot1(ctx, t) {
  const sc = scrollWorld(); ctx.drawImage(sc.far, 0, 0, W, H, 0, 0, W, H); ctx.drawImage(sc.near, 0, 0, W, H, 0, 0, W, H);
  const keys = [K(1.25, P_.pre), K(bar(1, 4), P_.liangxiang, .16)];
  const pose = poseAt(keys, qt(t, 12));
  const arrived = t >= 1.25;
  if (arrived) heroAt(ctx, pose, 900, t, { scale: .86, groundY: SCROLL_GROUND });
  // the cloud curtain parts on the second stroke
  const p = ss(clamp((t - 1.25) / .7)), cx = p * 1500;
  const P = PALS.dry;
  for (let i = 0; i < 5; i++) {
    const y = 120 + i * 220;
    S.xiangyun(ctx, 260 - cx + (i % 2) * 80, y, 2.3, 100 + i, { n: 4, fill: P.cloud, lineCol: P.cloudLine, gold: PAL.goldDk, lw: 4.4, tail: 0 });
    S.xiangyun(ctx, 1000 + cx - (i % 2) * 120, y + 90, 2.3, 120 + i, { n: 4, fill: P.cloud, lineCol: P.cloudLine, gold: PAL.goldDk, lw: 4.4, tail: 0, flip: 1 });
    S.xiangyun(ctx, 560 - cx * 1.3, y + 40, 2.0, 140 + i, { n: 3, fill: P.cloud, lineCol: P.cloudLine, gold: PAL.goldDk, lw: 4, tail: 0 });
    S.xiangyun(ctx, 1200 + cx * 1.3, y - 50, 2.0, 160 + i, { n: 3, fill: P.cloud, lineCol: P.cloudLine, gold: PAL.goldDk, lw: 4, tail: 0 });
  }
  // gold snap marks on the pose landing
  const a = t - bar(1, 4); if (a >= 0 && a < .3) { const k = qt(a, 24) / .3; snapMarks(ctx, 900, 330, 160 + k * 40, 250 + k * 60, -2.7, -.5, 9, 7, PAL.goldDk, 9 * (1 - k * .5)); }
}

const walkX = t => track([[bar(2), 430], [6.1, 2780], [6.9, 2780], [bar(5) - .3, 4780]], t, false);
function shot2(ctx, t) {
  const sc = scrollWorld();
  const hx = walkX(t), cx = clamp(walkX(t - .35) - 820, 0, 3840);
  ctx.drawImage(sc.far, -cx * .6, 0); ctx.save(); ctx.translate(-cx, 0); ctx.drawImage(sc.near, 0, 0);
  const moving = !(t > 6.1 && t < 6.9);
  const t12 = qt(t, 12), ph = moving ? (t12 - bar(2)) * 1.5 : 0;
  const w = walkLegs(ph);
  let pose = JSON.parse(JSON.stringify(P_.carry));
  if (moving) { pose.legL = w.legL; pose.legR = w.legR; } else { pose = poseAt([K(6.1, P_.carry), K(6.35, P_.liangxiang, .14), K(6.75, P_.liangxiang), K(6.9, P_.carry, .2)], t12); }
  heroAt(ctx, pose, hx, t, { scale: .66, groundY: SCROLL_GROUND, bob: moving ? w.bob : 0 });
  ctx.restore();
  // title: brush characters cut in one by one on the wood-block
  if (t >= TITLE.t0 && t < TITLE.t1) { const n = Math.floor((t - TITLE.t0) / .25) + 1; [...TITLE.text].forEach((c, i) => { if (i < n) title(ctx, c, 1770, 190 + i * 150, { size: 140 }); }); }
}

// crane up the gate and the three face cuts (bars 5)
function shot3(ctx, t) {
  const G = GATE, base = gateWorld(false), t0 = SHOT.s3[0];
  const cut1 = bar(5, 2), cut2 = bar(5, 3), cut3 = bar(5, 4);
  if (t < cut1) {   // crane up from the steps to the medallion
    const cy = lerp(900, 330, eo(clamp((t - t0) / (cut1 - t0)))), cam = { x: 0, y: cy, s: 1 };
    ctx.save(); camera(ctx, cam); ctx.drawImage(base, 0, 0); reliefFace(ctx, 0, false); gateDoors(ctx, 0, false); ctx.restore();
  } else if (t < cut2) {   // push on the shut relief face
    const k = (t - cut1) / (cut2 - cut1), s = 1.9 + .1 * k;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-G.medallion[0], -G.medallion[1] - 20); ctx.drawImage(base, 0, 0); reliefFace(ctx, 0, false); ctx.restore();
  } else if (t < cut3) {   // eyes snap open, gold flash
    const k = (t - cut2) / (cut3 - cut2), op = t - cut2 < .06 ? .5 : 1, s = 2.5 + .1 * k;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-G.medallion[0], -G.medallion[1] - 20); ctx.drawImage(base, 0, 0); reliefFace(ctx, op, false, 0); ctx.restore();
    if (t - cut2 < .1) { ctx.fillStyle = 'rgba(246,206,120,.55)'; ctx.fillRect(0, 0, W, H); }
  } else {   // the real face, in colour, against the night disc
    const k = (t - cut3) / (SHOT.s3[1] - cut3);
    nightBackdrop(ctx, 960, 520, 440);
    ctx.save(); ctx.translate(960, 560); ctx.scale(1.2 + .06 * k, 1.2 + .06 * k); drawStoneSpirit(ctx, { mouth: 0, open: 1, look: -1 }); ctx.restore();
    if (t - cut3 < .08) { ctx.fillStyle = 'rgba(246,206,120,.4)'; ctx.fillRect(0, 0, W, H); }
  }
}
function nightBackdrop(ctx, cx, cy, r) {
  ctx.drawImage(S.paperCanvas(W, H), 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d2650'); g.addColorStop(.6, '#2b3a72'); g.addColorStop(1, '#3a4f86'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  for (let i = 0; i < 46; i++) { const x = (i * 337 % 1920), y = (i * 211 % 520); ctx.fillStyle = 'rgba(236,199,102,.75)'; ctx.beginPath(); ctx.arc(x, y, 1.4 + (i % 3), 0, 7); ctx.fill(); }
  S.disc(ctx, cx, cy, r, PAL.cinnabar, { halo: PAL.goldLt, rings: 4, seed: 5 });
  S.xiangyun(ctx, 40, 230, 1.5, 6, { fill: '#e6dcc2', lineCol: PAL.goldDk, gold: PAL.goldDk, lw: 4 });
  S.xiangyun(ctx, 1480, 820, 1.5, 14, { fill: '#e6dcc2', lineCol: PAL.goldDk, gold: PAL.goldDk, lw: 4 });
}

// the gate scene shared by shots 4 to 9b
const HERO_X = 330, SPIRIT_AT = [1640, 1340], SPIRIT_S = .95, GROUND = 1832;
function gateScene(ctx, t, o) {
  const { cam, lush = false, theta = 0, ringT = -1, shake = 0, hero, spirit, fx, relief = 0 } = o;
  ctx.save(); camera(ctx, cam, shake, t);
  ctx.drawImage(gateWorld(lush), 0, 0);
  reliefFace(ctx, relief, lush);
  if (lush) driftClouds(ctx, t, PALS.lush, [[300, 360, .8, 4, 22], [1300, 520, .7, 9, 18, -1]]);
  gateDoors(ctx, theta, lush, ringT, shake, (x0, x1, top, bot) => { ctx.drawImage(valleyBase(), 2330, 250, 560, 820, x0, top, x1 - x0, bot - top); const g = ctx.createLinearGradient(0, top, 0, bot); g.addColorStop(0, 'rgba(255,240,190,.35)'); g.addColorStop(1, 'rgba(255,240,190,0)'); ctx.fillStyle = g; ctx.fillRect(x0, top, x1 - x0, bot - top); });
  if (theta > .05) river(ctx, t, ss(theta / 1.2));
  let hi = null;
  if (spirit) {
    ctx.save(); ctx.translate(SPIRIT_AT[0], SPIRIT_AT[1]); ctx.scale(SPIRIT_S, SPIRIT_S); ctx.scale(-1, 1) /* he faces left already: undo nothing */; ctx.scale(-1, 1);
    const sp = { ...spirit }; if (speaking('sg', t)) sp.mouth = flap(t, .9);
    drawSpirit(ctx, sp); ctx.restore();
    // rock mound he rises from
    moundFront(ctx, lush);
  }
  if (hero) hi = heroAt(ctx, hero.pose, hero.x, t, { scale: hero.scale ?? .8, groundY: GROUND, flip: hero.flip, bob: hero.bob || 0 });
  if (fx) fx(ctx, hi);
  ctx.restore();
  return hi;
}
function moundFront(ctx, lush) {
  const P = lush ? PALS.lush : PALS.dry;
  rockMass(ctx, [[1330, 2060], [1360, 1820], [1500, 1740], [1700, 1730], [1860, 1760], [1990, 1810], [1990, 2060]], P, 205, { strokes: 1.3 });
  for (let k = -3; k <= 3; k++) ink(ctx, [[1560 + k * 40, 1744], [1566 + k * 46, 1712 - Math.abs(k) * 3]], { w: 7, col: lush ? PAL.malaLt : '#9a9a5e', seed: 300 + k, taper: [.1, .8], minw: .1 });
}
function river(ctx, t, amt) {
  const G = GATE, y0 = 1790, k = amt;
  const L = spl([[G.hingeL + 30, y0], [600 - 40 * k, 1880], [440 - 120 * k, 1990], [300 - 250 * k, 2100]], false, 6), R = spl([[G.hingeR - 30, y0], [1320 + 40 * k, 1880], [1480 + 120 * k, 1990], [1620 + 250 * k, 2100]], false, 6);
  const poly = cat(L, R.slice().reverse());
  ctx.save(); trace(ctx, poly); ctx.clip();
  const g = ctx.createLinearGradient(0, y0, 0, 2100); g.addColorStop(0, '#a9cde4'); g.addColorStop(1, PAL.azurite); ctx.fillStyle = g; ctx.fillRect(0, y0, W, 340);
  for (let j = 0; j < 9; j++) { const u = ((j / 9) + t * .22) % 1, y = y0 + u * 300, R_ = 16 + u * 34; S.seaRow(ctx, y, 150, 1800, R_, `rgb(${Math.round(lerp(120, 40, u))},${Math.round(lerp(170, 90, u))},${Math.round(lerp(210, 170, u))})`, 500 + j * 17, { lineCol: PAL.indigo, hi: PAL.white, lw: 2 + u * 2, off: (j % 2) * R_ }); }
  ctx.restore();
  ink(ctx, L, { w: 5, col: PAL.indigo, seed: 5, taper: [.03, .03], minw: .6 }); ink(ctx, R, { w: 5, col: PAL.indigo, seed: 6, taper: [.03, .03], minw: .6 });
}

function shot4(ctx, t) {
  const k = (t - SHOT.s4[0]) / (SHOT.s4[1] - SHOT.s4[0]);
  const hero = { pose: poseAt([K(0, P_.ready)], t), x: HERO_X };
  gateScene(ctx, t, { cam: { x: 40, y: 900, s: 1 + .03 * k }, hero, spirit: sGuard });
}
// three exchanges, each a held two-shot with its own camera
function shot5(ctx, t) {
  const t12 = qt(t, 12), a = bar(8), b = bar(9), c = bar(10);
  let hero, spirit, cam, fx;
  if (t < b) {         // exchange 1: her thrust, his guard
    cam = { x: 120, y: 940, s: 1.12 };
    hero = { pose: poseAt([K(a - 1, P_.ready), K(a, P_.thrust, .14), K(b - .6, P_.thrust), K(b - .3, P_.ready, .3, { slow: true })], t12), x: HERO_X + track([[a - .3, 0], [a, 150], [b - .6, 150], [b - .3, 0]], t, false) };
    spirit = poseAt([K(a - 1, sGuard), K(a + .4, sLow, .12), K(b - .5, sLow), K(b - .2, sGuard, .25, { slow: true })], t12);
    fx = (ctx, hi) => { if (t > a && t < a + .22) strokes(ctx, [hi.x + 60, hi.y - 260], [hi.x + 520, hi.y - 250], 7, 3, PAL.white, 11); clashMarks(ctx, [1150, 1180], a + .4, t, 5); };
  } else if (t < c) {  // exchange 2: his overhead slam, her leap-parry
    cam = { x: 200, y: 880, s: 1.0 };
    hero = { pose: poseAt([K(b - .6, P_.ready), K(b + .4, P_.parry, .14), K(c - .6, P_.parry), K(c - .3, P_.ready, .3, { slow: true })], t12), x: HERO_X + 150 };
    spirit = poseAt([K(b - .6, sGuard), K(b - .05, sUp, .18), K(b + .4, sSlam, .1), K(c - .5, sSlam), K(c - .2, sGuard, .25, { slow: true })], t12);
    fx = (ctx, hi) => { if (t > b + .3 && t < b + .55) strokes(ctx, [1500, 1050], [900, 1250], 6, 11, PAL.goldLt, 9); clashMarks(ctx, [1010, 1230], b + .4, t, 6); };
  } else {             // exchange 3: her low sweep, flight
    cam = { x: 80, y: 960, s: 1.08 };
    hero = { pose: poseAt([K(c - .6, P_.ready), K(c, P_.sweep, .14), K(c + .45, P_.leap, .2), K(bar(11) - .35, P_.leap), K(bar(11) - .1, P_.bite, .1)], t12), x: HERO_X + track([[c, 0], [c + .45, 60], [bar(11) - .3, 200]], t) };
    spirit = poseAt([K(c - .6, sGuard), K(c + .4, sSlam, .12), K(bar(11) - .6, sSlam), K(bar(11) - .3, sWatch, .3, { slow: true })], t12);
    fx = (ctx, hi) => { if (t > c && t < c + .24) strokes(ctx, [hi.x - 80, hi.y - 80], [hi.x + 460, hi.y - 90], 6, 21, PAL.white, 10); if (t > c + .4 && t < c + .9) strokes(ctx, [hi.x - 300, hi.y - 360], [hi.x + 200, hi.y - 300], 8, 31, PAL.white, 9, 60); clashMarks(ctx, [1060, 1390], c + .4, t, 7); };
  }
  gateScene(ctx, t, { cam, hero, spirit, fx });
}
// spear bites the door; the disc; snap-zoom
const BITE_HIP = 215;
function shot6(ctx, t) {
  const t12 = qt(t, 12), a = bar(11), z = bar(12, 2);
  const hero = { pose: poseAt([K(a, P_.bite)], t12), x: BITE_HIP + 10 * Math.sin(t * 2.4) * 0 };
  const hp = heroPoints(sec(P_.bite, t)), tip = [BITE_HIP + hp.tip[0] * .8, GROUND - hp.low * .8 + hp.tip[1] * .8];
  let cam;
  if (t < z) cam = { x: 120, y: 920, s: 1.12 };
  else { const k = clamp((t - z) / .12), s = lerp(1.12, 1.95, k), cx = 800, cy = 1400; cam = { x: cx - W / 2 / s, y: cy - H / 2 / s, s }; }
  gateScene(ctx, t, { cam, hero, spirit: poseAt([K(a, sSlam), K(a + .6, sWatch, .3, { slow: true })], t12),
    fx: (ctx, hi) => {   // cracks and shards where the blade bit
      const r = mulberry(5); for (let i = 0; i < 9; i++) { const ang = i / 9 * 6.28 + r(), l = 40 + r() * 70; ink(ctx, [[tip[0], tip[1]], [tip[0] + Math.cos(ang) * l * .5 + (r() - .5) * 14, tip[1] + Math.sin(ang) * l * .5], [tip[0] + Math.cos(ang) * l, tip[1] + Math.sin(ang) * l]], { w: 4, col: PAL.ink, seed: i, taper: [.05, .8], minw: .1, alpha: .85 }); }
      clashMarks(ctx, tip, a, t, 9);
    } });
}
// silence: she looks, frees the spear, turns it
function shot7(ctx, t) {
  const t12 = qt(t, 12), a = bar(13), tug = bar(14, 2) + .5, hold = bar(15) - .4;
  const butt = P_.butt, strike = P_.gong;
  const gp = heroPoints(strike), hx1 = 900 - (gp.butt[0]) * .8;
  const hero = { pose: poseAt([K(a, P_.bite), K(a + .9, P_.gaze, .9, { slow: true }), K(tug, P_.gaze), K(tug + .5, P_.butt, .5, { slow: true }), K(hold, P_.butt, .1, { slow: true }), K(bar(15) - .13, P_.gong, .13)], t12),
    x: track([[a, BITE_HIP], [tug - .2, BITE_HIP], [bar(15) - .5, hx1], [bar(15), hx1 + 12]], t) };
  const cs = lerp(1.25, 1.4, (t - a) / (bar(15) - a));
  const cam = { x: 700 - W / 2 / cs, y: 1400 - H / 2 / cs + 70, s: cs };
  gateScene(ctx, t, { cam, hero, spirit: sWatch });
}
function shot8(ctx, t) {
  const t0 = bar(15), ringT = (t - t0) / 1.1;
  const sh = t - t0 < .26 ? 1 - (t - t0) / .26 : 0;
  const theta = clamp((t - t0 - .35) / 1.4) * 1.32;
  const gp = heroPoints(P_.gong), hx1 = 900 - gp.butt[0] * .8 + 12, t12 = qt(t, 12);
  const hero = { pose: poseAt([K(t0 - 1, P_.gong), K(t0 + 1.2, P_.ease, 1.0, { slow: true })], t12), x: hx1 };
  const cs = 1.4 - .1 * clamp((t - t0) / 1.5);
  const cam = { x: 700 - W / 2 / cs, y: 1400 - H / 2 / cs + 70, s: cs };
  const wipeA = bar(15) + 1.0, wipeB = bar(16) + 1.0;
  const draw = (tt) => gateScene(ctx, tt, { cam, hero, spirit: sWatch, ringT, shake: sh, theta });
  if (t < wipeA) { draw(t); if (t - t0 < .1) { ctx.fillStyle = 'rgba(255,240,190,.5)'; ctx.fillRect(0, 0, W, H); } return; }
  const p = clamp((t - wipeA) / (wipeB - wipeA));
  wipe(ctx, p, () => draw(t), () => valley(ctx, t));
}
// cloud-and-wave wall sweeping right to left; scene B is already painted behind it
function wipe(ctx, p, drawA, drawB) {
  const e = ss(p), edge = y => lerp(W + 260, -470, e) + 70 * Math.sin(y / 150 + p * 5);
  drawA();
  ctx.save(); ctx.beginPath(); ctx.moveTo(edge(0) + 470, 0); for (let y = 0; y <= H; y += 12) ctx.lineTo(edge(y) + 470, y); ctx.lineTo(W + 600, H); ctx.lineTo(W + 600, 0); ctx.closePath(); ctx.clip(); drawB(); ctx.restore();
  // the wall
  ctx.save(); ctx.beginPath(); ctx.moveTo(edge(0), 0); for (let y = 0; y <= H; y += 12) ctx.lineTo(edge(y), y); for (let y = H; y >= 0; y -= 12) ctx.lineTo(edge(y) + 490, y); ctx.closePath(); ctx.fillStyle = '#efe4c6'; ctx.fill(); ctx.restore();
  for (let i = 0; i < 6; i++) { const y = 20 + i * 200; S.xiangyun(ctx, edge(y) - 40, y, 2.0, 60 + i, { n: 4, lineCol: i % 2 ? PAL.azurite : PAL.goldDk, gold: PAL.goldDk, lw: 4.4, tail: 0 }); }
  for (let i = 0; i < 5; i++) { const y = 120 + i * 200; S.xiangyun(ctx, edge(y) + 250, y, 1.7, 80 + i, { n: 4, lineCol: PAL.goldDk, gold: PAL.azurite, lw: 4.2, tail: 0, fill: '#f6eed4' }); }
  for (let i = 0; i < 4; i++) { const y = 60 + i * 280; S.xiangyun(ctx, edge(y) + 420, y, 1.3, 120 + i, { n: 3, lineCol: PAL.azurite, gold: PAL.goldDk, lw: 4, tail: 0, fill: PAL.white }); }
}

// the valley, spring running
let valleyC = null;
function valleyBase() {
  if (valleyC) return valleyC;
  const c = document.createElement('canvas'); c.width = 3840; c.height = H; const x = c.getContext('2d'), P = PALS.lush;
  x.drawImage(S.paperCanvas(3840, H, '#efe1ba', 11), 0, 0);
  const g = x.createRadialGradient(2700, 330, 40, 2700, 330, 900); g.addColorStop(0, 'rgba(245,200,110,.75)'); g.addColorStop(.5, 'rgba(240,190,110,.28)'); g.addColorStop(1, 'rgba(240,190,110,0)'); x.fillStyle = g; x.fillRect(0, 0, 3840, H);
  S.disc(x, 2700, 330, 150, P.sun, { halo: P.sunHalo, rings: 3, seed: 5 });
  S.mountain(x, -50, 2300, 720, 360, 21, { top: PAL.azuLt, bot: PAL.azurite, peaks: 4, line: PAL.inkBlue, lw: 2.8, mist: P.mist });
  S.mountain(x, 1800, 3900, 700, 340, 22, { top: PAL.azuLt, bot: PAL.azurite, peaks: 4, line: PAL.inkBlue, lw: 2.8, mist: P.mist });
  S.eave(x, 3120, 590, 190, 150, 7, {});
  S.mountain(x, -100, 2100, 830, 320, 8, { top: PAL.malaLt, bot: PAL.malachite, peaks: 3, line: PAL.malaDk, mist: P.mist });
  S.mountain(x, 1700, 3950, 840, 330, 9, { top: PAL.malaLt, bot: PAL.malachite, peaks: 3, line: PAL.malaDk, mist: P.mist });
  S.pine(x, 380, 940, .95, 5, {}); S.pine(x, 3500, 960, .9, 7, { lean: -1 });
  ground(x, 0, 3840, 925, 160, P, 31, true);
  return valleyC = c;
}
function valley(ctx, t) {
  const k = clamp((t - SHOT.s9a[0] + 1.2) / (SHOT.s9a[1] - SHOT.s9a[0] + 1.2)), cx = lerp(1920, 100, ss(k));
  ctx.save(); ctx.translate(-cx, 0); ctx.drawImage(valleyBase(), 0, 0);
  // the spring: a winding river of scale waves from the far hills to the viewer
  const cl = [[960, 800], [800, 872], [1040, 955], [690, 1052], [640, 1170]], wd = [16, 38, 100, 190, 340];
  const rl = spl(cl.map((p, i) => [cx + p[0] - wd[i], p[1]]), false, 6), rr = spl(cl.map((p, i) => [cx + p[0] + wd[i], p[1]]), false, 6);
  ctx.save(); trace(ctx, cat(rl, rr.slice().reverse())); ctx.clip();
  const g = ctx.createLinearGradient(0, 800, 0, 1150); g.addColorStop(0, '#a9cde4'); g.addColorStop(1, PAL.azurite); ctx.fillStyle = g; ctx.fillRect(cx, 790, 2000, 400);
  for (let j = 0; j < 12; j++) { const u = ((j / 12) + t * .18) % 1, y = 800 + u * 350, R = 10 + u * 36; S.seaRow(ctx, y, cx - 100, cx + 1900, R, `rgb(${Math.round(lerp(130, 40, u))},${Math.round(lerp(180, 90, u))},${Math.round(lerp(215, 170, u))})`, 600 + j * 13, { lineCol: PAL.indigo, hi: PAL.white, lw: 2 + u * 2, off: (j % 2) * R }); }
  ctx.restore();
  ink(ctx, rl, { w: 5, col: PAL.indigo, seed: 5, taper: [.03, .03], minw: .6 }); ink(ctx, rr, { w: 5, col: PAL.indigo, seed: 6, taper: [.03, .03], minw: .6 });
  // cranes crossing the valley
  for (let i = 0; i < 5; i++) crane(ctx, cx + 1900 - ((t * 120 + i * 190) % 2300) + 200, 300 + i * 46 + 18 * Math.sin(t * 1.3 + i), .9 - i * .06, t * 5 + i * 1.3);
  for (const [x, y, s, sd, spd, fl] of [[200, 250, 1.0, 4, 18], [1500, 160, .8, 12, 14, -1], [2700, 300, 1.0, 19, 20], [3300, 150, .7, 23, 12, -1]]) S.xiangyun(ctx, x + (t * spd), y, s, sd, { fill: PAL.white, lineCol: PAL.azurite, gold: PAL.goldDk, flip: fl ?? 1, lw: 4 });
  ctx.restore();
}

function crane(ctx, x, y, s, ph) {
  const fl = Math.sin(ph * 1.6);
  ctx.save(); ctx.translate(x, y); ctx.scale(-s, s);
  const two = (pts, w, col, sd, tp = [.3, .5]) => { ink(ctx, spl(pts, false, 3), { w: w + 5, col: PAL.inkBlue, seed: sd, taper: tp, minw: .3, press: .1 }); ink(ctx, spl(pts, false, 3), { w, col, seed: sd + 1, taper: tp, minw: .3, press: .1 }); };
  two([[-22, 6], [-70, 14]], 3, PAL.inkBlue, 4);
  two([[10, -4], [-24, -28 - 30 * fl], [-86, -12 - 42 * fl]], 14, '#e6dcc6', 6, [.1, .8]);
  two([[-34, 0], [0, -4], [38, -8]], 16, PAL.white, 8, [.2, .3]);
  two([[38, -8], [62, -20], [80, -14]], 7, PAL.white, 10, [.1, .2]);
  ink(ctx, [[80, -14], [100, -9]], { w: 4, col: PAL.ink, seed: 12, taper: [.1, .5], minw: .3 });
  two([[4, -2], [-34, -22 - 44 * fl], [-116, -4 - 64 * fl]], 18, PAL.white, 14, [.1, .85]);
  ink(ctx, [[-92, -2 - 56 * fl], [-122, -2 - 66 * fl]], { w: 6, col: PAL.ink, seed: 18, taper: [.1, .7], minw: .2 });
  ctx.restore();
}

// tableau at the opened gate (lush)
function shot9b(ctx, t) {
  const t12 = qt(t, 12), a = SHOT.s9b[0];
  const hero = { pose: poseAt([K(a, P_.ease)], t12), x: 360 };
  const k = (t - a) / (DUR - a);
  gateScene(ctx, t, { cam: { x: 50, y: 910, s: 1.0 + .03 * clamp(k * 3) }, lush: true, theta: 1.32, relief: 1, hero, spirit: poseAt([K(a, sLaugh)], t12) });
}
function shotEnd(ctx, t) {
  const a = SHOT.s10[0], t12 = qt(t, 12);
  const hero = { pose: poseAt([K(a, P_.ease), K(a + .3, P_.liangxiang, .18)], t12), x: 360 };
  gateScene(ctx, t, { cam: { x: 50, y: 910, s: 1.04 }, lush: true, theta: 1.32, relief: 1, hero, spirit: poseAt([K(a, sLaugh), K(a + .3, SP({ armA: { sh: -1.2, el: -2.5 }, armB: { sh: .9, el: .5 }, mace: { ang: -2.7 }, mouth: .5 }), .15)], t12) });
}
// scroll border: two paper panels with wooden rollers close over the picture
function border(ctx, p) {
  if (p <= 0) return;
  const e = ss(p), half = e * W / 2;
  const paper = S.paperCanvas(W, H, '#e9dab0', 15);
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? 0 : W - half, w = half;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, w, H); ctx.clip(); ctx.drawImage(paper, 0, 0);
    // painted edge and the roller
    const rx = s < 0 ? half : W - half;
    ctx.fillStyle = PAL.cinnabar; ctx.fillRect(rx - 10, 0, 20, H);
    const g = ctx.createLinearGradient(rx - 34, 0, rx + 34, 0); g.addColorStop(0, '#5a2f1c'); g.addColorStop(.35, '#a8652d'); g.addColorStop(.6, '#7a4020'); g.addColorStop(1, '#3d2012');
    ctx.fillStyle = g; ctx.fillRect(rx - 26, -10, 52, H + 20);
    ctx.fillStyle = PAL.gold; ctx.fillRect(rx - 28, 40, 56, 14); ctx.fillRect(rx - 28, H - 54, 56, 14);
    ctx.restore();
  }
  // shadow on the picture beside each roller
  const gl = ctx.createLinearGradient(half + 26, 0, half + 80, 0); gl.addColorStop(0, 'rgba(40,20,10,.35)'); gl.addColorStop(1, 'rgba(40,20,10,0)'); ctx.fillStyle = gl; ctx.fillRect(half + 26, 0, 60, H);
  const gr = ctx.createLinearGradient(W - half - 80, 0, W - half - 26, 0); gr.addColorStop(0, 'rgba(40,20,10,0)'); gr.addColorStop(1, 'rgba(40,20,10,.35)'); ctx.fillStyle = gr; ctx.fillRect(W - half - 86, 0, 60, H);
}
function endCard(ctx, t) {
  ctx.drawImage(S.paperCanvas(W, H, '#e9dab0', 15), 0, 0);
  ctx.save(); ctx.font = '40px XiaoWei'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#5a4630';
  title(ctx, ENDCARD.line1, W / 2, 470, { size: 190 });
  ctx.fillText(ENDCARD.line2, W / 2, 690); ctx.restore();
}

// ------------------------------------------------------------------ the film
export function renderFilm(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  const inS = k => t >= SHOT[k][0] && t < SHOT[k][1];
  if (inS('s1')) shot1(ctx, t);
  else if (inS('s2')) shot2(ctx, t);
  else if (inS('s3')) shot3(ctx, t);
  else if (inS('s4')) shot4(ctx, t);
  else if (inS('s5')) shot5(ctx, t);
  else if (inS('s6')) shot6(ctx, t);
  else if (inS('s7')) shot7(ctx, t);
  else if (inS('s8')) shot8(ctx, t);
  else if (inS('s9a')) valley(ctx, t);
  else if (inS('s9b')) shot9b(ctx, t);
  else shotEnd(ctx, t);
  if (t >= 48.3) { const p = clamp((t - 48.3) / 1.0); border(ctx, p); }
  if (t >= ENDCARD.t0) { endCard(ctx, t); }
  // subtitles
  const subEnd = (l, i) => { const nx = LINES[i + 1]; const e = Math.max(lineEnd(l) + .5, l.t + 1.8); return nx ? Math.min(e, nx.t - .05) : e; };
  const l = LINES.find((l, i) => t >= l.t - .05 && t < subEnd(l, i));
  if (l && !(t >= ENDCARD.t0)) subtitle(ctx, l.text, W, H);
  finish(ctx, W, H, { grain: .5 });
}
export function filmTexts(t) {
  const o = [];
  if (t >= TITLE.t0 && t < TITLE.t1) { const n = Math.min(4, Math.floor((t - TITLE.t0) / .25) + 1); }
  if (t >= TITLE.t0 + 1 && t < TITLE.t1) o.push({ id: 'title', text: TITLE.text, x0: 1700, y0: 120, x1: 1840, y1: 780 });
  if (t >= ENDCARD.t0) { o.push({ id: 'end1', text: ENDCARD.line1, x0: 400, y0: 380, x1: 1520, y1: 560 }); o.push({ id: 'end2', text: ENDCARD.line2, x0: 560, y0: 660, x1: 1360, y1: 720 }); }
  return o;
}
