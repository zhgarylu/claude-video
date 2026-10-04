// Flat, expressive side-view people: capsule limbs on a joint skeleton, solved per frame.
// A figure is drawn in metres: o.m is pixels per metre at the figure's depth, (o.x, o.y) is the ground under the feet.
// Angles are radians from "straight down", positive toward the facing direction.
import { css, shade, mixc, ell, capsule, poly, hex } from './util.js';

export const KINDS = {
  adult:   { leg: [.46, .44], torso: .56, neck: .07, head: .235, arm: [.30, .27], depth: .23, lw: .105, aw: .068 },
  child:   { leg: [.30, .28], torso: .38, neck: .05, head: .19,  arm: [.21, .19], depth: .17, lw: .082, aw: .055 },
  toddler: { leg: [.21, .19], torso: .29, neck: .03, head: .175, arm: [.15, .14], depth: .16, lw: .074, aw: .05 },
};

const j = (x, y, a, l, f) => [x + Math.sin(a) * l * f, y + Math.cos(a) * l];

export function person(ctx, o, shadow = false) {
  const K = KINDS[o.kind || 'adult'], m = o.m, f = o.f || 1, P = o.pose || {};
  const skin = o.skin || '#e0b08c', hairC = o.hair || '#3a2a1c', top = o.top || '#c8442f', bot = o.bottom || '#394a72';
  const SH = '#3a2616';
  const C = (c, k = 0) => shadow ? SH : (k ? shade(c, k) : css(c));
  ctx.save(); ctx.translate(o.x, o.y);
  if (shadow) { ctx.transform(1, 0, -(o.sunX ?? .85), (o.sunY ?? .26), 0, 0); }
  const lean = P.lean || 0, nod = P.nod || 0;
  const ext = (t, k) => K.leg[0] * Math.cos(t) + K.leg[1] * Math.cos(t - k);
  const tn = P.tn ?? 0, kn = P.kn ?? 0, tf = P.tf ?? 0, kf = P.kf ?? 0;
  const hh = (P.hh ?? Math.max(ext(tn, kn), ext(tf, kf))) * m;
  const hx = (P.hx || 0) * m, hy = -hh;
  const leg = (t, k, far) => {
    const [x1, y1] = j(hx, hy, t, K.leg[0] * m, f), [x2, y2] = j(x1, y1, t - k, K.leg[1] * m, f);
    const col = far ? C(bot === o.bottom && o.dress ? skin : (o.legs || bot), -.16) : C(o.dress ? skin : (o.legs || bot));
    const lc = o.dress || o.shorts ? skin : null;
    // thigh (trousers or skin), shin (skin for shorts/dress), foot
    capsule(ctx, hx, hy, x1, y1, K.lw * m, far ? C(o.dress || o.shorts ? skin : bot, -.18) : C(o.dress || o.shorts ? skin : bot));
    capsule(ctx, x1, y1, x2, y2, K.lw * m * .82, far ? C(o.shorts || o.dress ? skin : bot, -.18) : C(o.shorts || o.dress ? skin : bot));
    if (o.shorts && !o.dress && !shadow) capsule(ctx, hx, hy, hx + (x1 - hx) * .62, hy + (y1 - hy) * .62, K.lw * m * 1.02, far ? C(bot, -.18) : C(bot));
    const fx = x2 + f * K.leg[1] * m * .22, fy = y2 + K.lw * m * .12;
    capsule(ctx, x2, y2, fx, fy, K.lw * m * .6, far ? C(o.shoe || skin, -.2) : C(o.shoe || skin));
  };
  // far leg
  leg(tf, kf, true);
  // torso (a rounded capsule) from hip to shoulder
  const T = K.torso * m, sx = hx + Math.sin(lean) * T * f, sy = hy - Math.cos(lean) * T;
  const farArm = () => {
    const a1 = P.af1 ?? .1, a2 = P.af2 ?? .15, [ex, ey] = j(sx, sy + .03 * m, a1, K.arm[0] * m, f), [hx2, hy2] = j(ex, ey, a1 + a2, K.arm[1] * m, f);
    capsule(ctx, sx, sy + .03 * m, ex, ey, K.aw * m, C(skin, -.2)); capsule(ctx, ex, ey, hx2, hy2, K.aw * m * .85, C(skin, -.2));
    ell(ctx, hx2, hy2, K.aw * m * .5, K.aw * m * .55, C(skin, -.2));
  };
  farArm();
  capsule(ctx, hx, hy, sx, sy, K.depth * m, C(top));
  if (!shadow) capsule(ctx, hx + (sx - hx) * .55, hy + (sy - hy) * .55, sx, sy, K.depth * m * .96, C(top, .07));
  // near leg
  leg(tn, kn, false);
  // dress or skirt over the thighs
  if (o.dress && !shadow) {
    const w0 = K.depth * m * .55, hem = (P.hem ?? .5) * m, sw = (P.swing || 0) * m;
    const wx = hx + (sx - hx) * .25, wy = hy + (sy - hy) * .25;
    ctx.beginPath(); ctx.moveTo(wx - f * w0, wy - .05 * m); ctx.lineTo(wx + f * w0, wy - .05 * m);
    ctx.quadraticCurveTo(wx + f * (w0 + .16 * m) + sw, wy + hem * .55, wx + f * (w0 + .24 * m) + sw * 1.6, wy + hem);
    ctx.lineTo(wx - f * (w0 + .13 * m) + sw * 1.2, wy + hem); ctx.quadraticCurveTo(wx - f * (w0 + .1 * m), wy + hem * .5, wx - f * w0, wy - .05 * m);
    ctx.fillStyle = C(o.dressCol || top); ctx.fill();
    if (o.dressTrim) { ctx.strokeStyle = C(o.dressTrim); ctx.lineWidth = .025 * m; ctx.beginPath(); ctx.moveTo(wx - f * (w0 + .13 * m) + sw * 1.2, wy + hem - .03 * m); ctx.lineTo(wx + f * (w0 + .24 * m) + sw * 1.6, wy + hem - .03 * m); ctx.stroke(); }
  } else if (o.dress && shadow) {
    const hem = (P.hem ?? .5) * m; capsule(ctx, hx, hy, hx, hy + hem * .8, K.depth * m * 1.5, SH);
  }
  // head
  const nl = K.neck * m, hd = K.head * m, ha = lean * .6 + nod;
  const nx = sx + Math.sin(lean) * nl * f, ny = sy - Math.cos(lean) * nl;
  capsule(ctx, sx, sy, nx, ny, K.depth * m * .5, C(skin));
  const cx = nx + Math.sin(ha) * hd * .5 * f, cy = ny - Math.cos(ha) * hd * .5;
  if (o.hairStyle === 'pony' && !shadow) { const sw = Math.sin((P.pony || 0)) * hd * .25; ell(ctx, cx - f * hd * .5 + sw * f, cy + hd * .15, hd * .13, hd * .3, C(hairC), .4 * f); }
  if (o.hairStyle === 'bob' && !shadow) ell(ctx, cx - f * hd * .12, cy + hd * .08, hd * .46, hd * .58, C(hairC));
  ell(ctx, cx, cy, hd * .42, hd * .5, C(skin));
  if (!shadow) {
    if (hd > 27) { // ear, face
      ell(ctx, cx - f * hd * .08, cy + hd * .02, hd * .07, hd * .1, C(skin, -.12));
      const ex = cx + f * hd * .2, ey = cy - hd * .04, ex2 = P.look || 0;
      ell(ctx, ex + ex2 * hd * .02, ey, hd * .035, hd * .045, '#2a1a12');
      ctx.strokeStyle = '#3a2418'; ctx.lineWidth = Math.max(1, hd * .03); ctx.lineCap = 'round';
      const br = P.brow || 0; ctx.beginPath(); ctx.moveTo(ex - f * hd * .06, ey - hd * (.1 + br * .04)); ctx.lineTo(ex + f * hd * .08, ey - hd * (.11 - br * .02 + .0)); ctx.stroke();
      ell(ctx, cx + f * hd * .24, cy + hd * .08, hd * .09, hd * .06, 'rgba(210,90,70,.25)');
      const mo = P.mouth ?? 0, mx = cx + f * hd * .22, my = cy + hd * .22;
      ctx.strokeStyle = '#7a3a2c'; ctx.lineWidth = Math.max(1, hd * .035);
      if (mo > .5) { ell(ctx, mx, my, hd * .06, hd * (.03 + .06 * mo), '#6a2a22'); }
      else { ctx.beginPath(); ctx.arc(mx - f * hd * .02, my - hd * .05, hd * .09, .3, 2.2); ctx.stroke(); }
    }
    // hair: a cap clipped to the head, deeper at the back, with a slanted hairline
    if (o.hairStyle !== 'none') {
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, hd * .43, hd * .51, 0, 0, 7); ctx.clip();
      ctx.fillStyle = C(hairC); ctx.beginPath();
      const dep = o.hairStyle === 'bob' ? .55 : o.hairStyle === 'short' ? .12 : .3;
      ctx.moveTo(cx - f * hd * .6, cy + hd * dep); ctx.lineTo(cx - f * hd * .6, cy - hd * .7); ctx.lineTo(cx + f * hd * .6, cy - hd * .7);
      ctx.lineTo(cx + f * hd * .48, cy - hd * .22); ctx.quadraticCurveTo(cx + f * hd * .2, cy - hd * .26, cx + f * hd * .02, cy - hd * .08); ctx.lineTo(cx - f * hd * .12, cy + hd * dep * .5); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (o.hairStyle === 'curls') for (let i = 0; i < 8; i++) { const a = Math.PI * 1.05 + i / 7 * Math.PI * .95; ell(ctx, cx + Math.cos(a) * hd * .43, cy - hd * .02 + Math.sin(a) * hd * .5, hd * .12, hd * .12, C(hairC)); }
    }
    if (o.hat) {   // sun hat: brim + crown + band
      const by = cy - hd * .3, hc = o.hat;
      ell(ctx, cx + f * hd * .08, by + hd * .06, hd * .95, hd * .15, C(hc, -.08));
      ctx.fillStyle = C(hc); ctx.beginPath(); ctx.ellipse(cx, by, hd * .46, hd * .34, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
      ell(ctx, cx + f * hd * .08, by + hd * .02, hd * .5, hd * .07, C(o.hatBand || '#d05a3a'));
      ell(ctx, cx + f * hd * .08, by - hd * .02, hd * .95, hd * .14, C(hc, .04));
      ctx.fillStyle = C(hc); ctx.beginPath(); ctx.ellipse(cx, by - hd * .02, hd * .44, hd * .34, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
      ell(ctx, cx, by + hd * .0, hd * .46, hd * .06, C(o.hatBand || '#d05a3a'));
    }
  } else if (o.hat) { ell(ctx, cx, cy - hd * .28, hd * .95, hd * .2, SH); }
  // near arm
  const a1 = P.an1 ?? -.1, a2 = P.an2 ?? .2;
  const [ex, ey] = j(sx, sy + .03 * m, a1, K.arm[0] * m, f), [hx3, hy3] = j(ex, ey, a1 + a2, K.arm[1] * m, f);
  capsule(ctx, sx, sy + .03 * m, ex, ey, K.aw * m, C(skin));
  if (!shadow && !o.sleeveless) capsule(ctx, sx, sy + .03 * m, sx + (ex - sx) * .55, sy + .03 * m + (ey - sy - .03 * m) * .55, K.aw * m * 1.12, C(top));
  capsule(ctx, ex, ey, hx3, hy3, K.aw * m * .85, C(skin));
  ell(ctx, hx3, hy3, K.aw * m * .52, K.aw * m * .58, C(skin));
  if (o.hold) o.hold(ctx, hx3, hy3, f, shadow);
  ctx.restore();
  return { hx: o.x + hx3, hy: o.y + hy3, headX: o.x + cx, headY: o.y + cy, hd };
}

// pose generators (continuous in phase, so every pose blends)
export const POSE = {
  stand: (ph = 0) => ({ tn: .04, kn: .04, tf: -.04, kf: .04, an1: -.08, an2: .2, af1: .06, af2: .15, lean: .02, mouth: 0 }),
  walk: (ph) => ({ tn: .5 * Math.sin(ph), kn: .12 + .6 * Math.max(0, Math.cos(ph)), tf: -.5 * Math.sin(ph), kf: .12 + .6 * Math.max(0, -Math.cos(ph)),
    an1: -.45 * Math.sin(ph), an2: .25, af1: .45 * Math.sin(ph), af2: .25, lean: .06 }),
  run: (ph, k = 1) => ({ tn: .95 * Math.sin(ph) * k, kn: .3 + 1.25 * Math.max(0, Math.cos(ph)) * k, tf: -.95 * Math.sin(ph) * k, kf: .3 + 1.25 * Math.max(0, -Math.cos(ph)) * k,
    an1: -.95 * Math.sin(ph) * k, an2: 1.1, af1: .95 * Math.sin(ph) * k, af2: 1.1, lean: .24, mouth: .8, pony: ph * 1.5, hh: undefined }),
};

// blend two poses (numbers interpolate; anything else switches at 0.5)
export const blend = (a, b, k) => { const o = {}; for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) { const x = a[key] ?? b[key], y = b[key] ?? a[key]; o[key] = (typeof x === 'number' && typeof y === 'number') ? x + (y - x) * k : (k < .5 ? x : y); } return o; };
