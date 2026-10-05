// The invented drawings: a bird in flight (12 frames) and a gentleman walking (12 frames).
// Each frame is drawn as ink on a transparent 400x400 tile, in the manner of a Victorian wood engraving.
import { hash, mulberry, TAU, lerp } from '/core/lib.js';
import { C, smooth, pathOf, pen, line, knock, hatch, sstep, featherPoly, rad } from './ink.js';

export const TILE = 400;

// a faint oval of horizontal engraved lines behind the figure (fades toward the edge)
function vignette(ctx, cx, cy, rx, ry, seed) {
  ctx.save();
  for (let y = -ry; y <= ry; y += 5.5) {
    const half = rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2));
    if (half < 8) continue;
    const g = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
    g.addColorStop(0, 'rgba(36,21,9,0)'); g.addColorStop(0.25, 'rgba(36,21,9,0.42)'); g.addColorStop(0.75, 'rgba(36,21,9,0.42)'); g.addColorStop(1, 'rgba(36,21,9,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 0.6 + 0.5 * Math.abs(y / ry) ** 2;
    ctx.beginPath(); ctx.moveTo(cx - half, cy + y); ctx.lineTo(cx + half, cy + y); ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the bird
function wing(ctx, sx, sy, gam, lag, scale, seed, shadeK) {
  // gam: direction of the arm (rad, screen); primaries trail by lag
  const arm = 66 * scale, wx = sx + Math.cos(gam) * arm, wy = sy + Math.sin(gam) * arm;
  const gtip = gam + lag;
  const feathers = [];
  // secondaries: along the arm, pointing "backward" (perpendicular to the arm, toward the tail)
  for (let i = 0; i < 6; i++) {
    const u = 0.12 + 0.88 * i / 5, bx = sx + (wx - sx) * u, by = sy + (wy - sy) * u;
    const side = Math.cos(gam) < 0 ? 1 : -1;
    const a = gam + side * (Math.PI / 2 + 0.18) - lag * 0.4 * u;
    feathers.push({ x: bx, y: by, a: gam + Math.PI / 2 * (Math.sin(gam) < 0 ? -1 : 1) * -1 + (hash(seed + i) - 0.5) * 0.06 - lag * 0.5 * u, L: (44 + 14 * u) * scale, w: 8.5 * scale, k: i });
  }
  // primaries: fan out from the wrist
  for (let i = 0; i < 8; i++) {
    const f = i / 7, a = gtip + (f - 0.5) * 0.72 - 0.05;
    feathers.push({ x: wx - Math.cos(gam) * 6, y: wy - Math.sin(gam) * 6, a, L: (82 - 10 * Math.abs(f - 0.45) * 2 + (1 - f) * 4) * scale, w: 7.2 * scale, k: 20 + i });
  }
  // coverts / arm: a bone-like pen line
  for (const f of feathers) {
    const poly = featherPoly(f.x, f.y, f.a, f.L, f.w, lag * 0.06);
    knock(ctx, poly);
    pen(ctx, poly, 1.5 * scale, C.ink, seed + f.k, { closed: true });
    const rib = [[f.x, f.y], [f.x + Math.cos(f.a) * f.L * 0.9, f.y + Math.sin(f.a) * f.L * 0.9]];
    pen(ctx, rib, 1.0, C.ink2, seed + f.k * 3);
    // barbs: short strokes along one side
    ctx.save(); ctx.strokeStyle = C.sepia; ctx.lineWidth = 0.6;
    for (let b = 0.22; b < 0.9; b += 0.07) {
      const bx = f.x + Math.cos(f.a) * f.L * b, by = f.y + Math.sin(f.a) * f.L * b, w = f.w * Math.sin(Math.PI * Math.pow(b, 0.7)) * 0.8;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - Math.sin(f.a) * w * 0.9 + Math.cos(f.a) * 5, by + Math.cos(f.a) * w * 0.9 + Math.sin(f.a) * 5); ctx.stroke();
    }
    ctx.restore();
  }
  // coverts: a scalloped row near the arm
  const cov = [];
  for (let i = 0; i <= 14; i++) { const u = i / 14, bx = sx + (wx - sx) * u, by = sy + (wy - sy) * u; cov.push([bx, by]); }
  const nx = -Math.sin(gam), ny = Math.cos(gam), sgn = Math.cos(gam) < 0 ? 1 : -1;
  for (let i = 0; i < 7; i++) {
    const u = 0.1 + 0.85 * i / 6, bx = sx + (wx - sx) * u, by = sy + (wy - sy) * u, ang = Math.atan2(ny * sgn, nx * sgn) - lag * 0.25;
    const poly = featherPoly(bx, by, ang, 26 * scale, 6.5 * scale, 0);
    knock(ctx, poly); pen(ctx, poly, 1.2 * scale, C.ink, seed + 50 + i, { closed: true });
  }
  pen(ctx, [[sx, sy], [(sx + wx) / 2 + Math.sin(gam) * 3, (sy + wy) / 2 - Math.cos(gam) * 3], [wx, wy]], 2.6 * scale, C.ink, seed + 77);
}

export function drawBird(ctx, k) {
  const p = k / 12, ph = TAU * p;
  ctx.save(); ctx.translate(200, 205); ctx.scale(1.2, 1.2); ctx.translate(-200, -205);
  vignette(ctx, 200, 205, 175, 140, 3);
  const bob = -9 * Math.sin(ph);
  const cx = 196, cy = 214 + bob;
  const cs = Math.cos(ph), gam = rad(180 + 80 * Math.sign(cs) * Math.pow(Math.abs(cs), 0.55));               // arm direction: 258 (up, slightly back) .. 102 (down, back)
  const lag = rad(-34 * Math.sin(ph));                   // tips trail the stroke
  const bodyPitch = rad(5 * Math.sin(ph));
  ctx.translate(cx, cy); ctx.rotate(bodyPitch); ctx.translate(-cx, -cy);
  // far wing (behind)
  wing(ctx, cx + 4, cy - 20, gam + rad(10) * Math.sign(Math.sin(gam)) * -1 + rad(-8), lag * 0.9, 0.82, 100 + k, 0);
  // tail
  for (let i = 0; i < 5; i++) {
    const a = rad(186 + 11 * (i - 2) + 5 * Math.sin(ph + 1)), L = 62 - 5 * Math.abs(i - 2), poly = featherPoly(cx - 68, cy - 2, a, L, 7, 0.02 * (i - 2));
    knock(ctx, poly); pen(ctx, poly, 1.5, C.ink, 200 + i + k, { closed: true }); pen(ctx, [[cx - 68, cy - 2], [cx - 68 + Math.cos(a) * L * 0.9, cy - 2 + Math.sin(a) * L * 0.9]], 0.9, C.ink2, 7);
  }
  // legs (tucked)
  pen(ctx, [[cx - 6, cy + 24], [cx - 20, cy + 40], [cx - 36, cy + 42]], 2, C.ink, 31); pen(ctx, [[cx + 6, cy + 24], [cx - 6, cy + 42], [cx - 22, cy + 46]], 2, C.ink, 32);
  // body
  const body = smooth([[cx + 22, cy - 26], [cx - 18, cy - 28], [cx - 60, cy - 16], [cx - 80, cy - 2], [cx - 62, cy + 8], [cx - 26, cy + 28], [cx + 14, cy + 30], [cx + 48, cy + 12], [cx + 58, cy - 8]], true, 8);
  knock(ctx, body);
  hatch(ctx, body, -32, 3.2, 1.7, (x, y) => 0.9 * sstep(cy - 14, cy + 30, y) + 0.3 * sstep(cx + 30, cx - 70, x) * 0.6, C.ink, 3);
  hatch(ctx, body, 38, 3.4, 1.0, (x, y) => 0.8 * sstep(cy + 6, cy + 30, y), C.ink, 3);
  // breast feathering
  ctx.save(); ctx.strokeStyle = C.sepia; ctx.lineWidth = 0.7;
  for (let i = 0; i < 18; i++) { const x = cx + 6 + (i % 6) * 8, y = cy - 6 + Math.floor(i / 6) * 9; ctx.beginPath(); ctx.arc(x, y, 4, 0.2, 2.9); ctx.stroke(); }
  ctx.restore();
  pen(ctx, body, 2.2, C.ink, 5, { closed: true });
  // head and beak
  const head = smooth([[cx + 46, cy - 30], [cx + 62, cy - 36], [cx + 78, cy - 28], [cx + 80, cy - 14], [cx + 66, cy - 6], [cx + 52, cy - 12]], true, 8);
  knock(ctx, head);
  hatch(ctx, head, -50, 2.8, 1.5, (x, y) => 0.8 * sstep(cy - 26, cy - 6, y), C.ink);
  pen(ctx, head, 2, C.ink, 9, { closed: true });
  const beak = [[cx + 78, cy - 26], [cx + 104, cy - 17], [cx + 79, cy - 12]];
  knock(ctx, beak); pen(ctx, beak, 1.8, C.ink, 12, { closed: true }); pen(ctx, [[cx + 79, cy - 18], [cx + 100, cy - 17]], 1, C.ink, 13);
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(cx + 68, cy - 24, 3.2, 0, TAU); ctx.fill();
  ctx.strokeStyle = C.cream; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(cx + 67, cy - 25, 1.2, 0, TAU); ctx.stroke();
  // near wing
  wing(ctx, cx + 8, cy - 22, gam, lag, 1.0, 300 + k, 1);
  ctx.restore();
}

// ---------------------------------------------------------------- the gentleman
function limb(ctx, a, b, w0, w1) { // tapered quad around a segment a->b
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  return [[a[0] + nx * w0, a[1] + ny * w0], [b[0] + nx * w1, b[1] + ny * w1], [b[0] - nx * w1, b[1] - ny * w1], [a[0] - nx * w0, a[1] - ny * w0]];
}
export function drawWalker(ctx, k) {
  const p = k / 12, ph = TAU * p;
  ctx.save(); ctx.translate(200, 372); ctx.scale(1.1, 1.1); ctx.translate(-200, -372);
  vignette(ctx, 200, 210, 150, 170, 5);
  // ground: engraved lines under the feet
  const gy = 362;
  for (let i = 0; i < 7; i++) { const w = 120 - i * 14; pen(ctx, [[200 - w, gy + 3 + i * 4], [200, gy + 3 + i * 4], [200 + w, gy + 3 + i * 4]], 1.1 - i * 0.1, C.ink, 40 + i, { taper: 0.9 }); }
  // walk cycle
  const bob = -5 * Math.abs(Math.sin(ph)) + 2;                     // up twice per cycle
  const hipX = 196, hipY = 214 + bob;
  const thigh = 70, shin = 74;
  const leg = (ph0) => {
    const s = Math.sin(ph + ph0), c = Math.cos(ph + ph0);
    const hipA = 0.5 * s;                                        // swing forward (+x) / back
    const kneeFlex = Math.max(0, -c) * 1.0 + 0.1;               // bend during the swing phase
    const ka = [hipX + Math.sin(hipA) * thigh, hipY + Math.cos(hipA) * thigh];
    const sa = hipA - kneeFlex * (c > 0 ? 0.25 : 1);
    const an = [ka[0] + Math.sin(sa) * shin, ka[1] + Math.cos(sa) * shin];
    return { ka, an, foot: sa };
  };
  const L1 = leg(0), L2 = leg(Math.PI);
  const drawLeg = (L, far) => {
    const t = limb(ctx, [hipX, hipY], L.ka, 11, 8.5), sh = limb(ctx, L.ka, L.an, 8.5, 5.5);
    for (const q of [t, sh]) { knock(ctx, q); }
    hatch(ctx, t, far ? 80 : 70, 2.6, 2.5, (x, y) => far ? 0.9 : 0.55, C.ink); hatch(ctx, sh, far ? 80 : 70, 2.6, 2.5, () => far ? 0.9 : 0.55, C.ink);
    pen(ctx, t, 1.8, C.ink, 70, { closed: true }); pen(ctx, sh, 1.8, C.ink, 71, { closed: true });
    const fa = L.foot, fx = L.an[0], fy = L.an[1], dir = 1;
    const foot = smooth([[fx - 6, fy - 2], [fx + 4, fy], [fx + 22 * Math.cos(fa * 0.4), fy + 6 + 5 * Math.sin(fa * 0.4)], [fx + 24, fy + 11], [fx - 8, fy + 11]], true, 6);
    knock(ctx, foot); ctx.fillStyle = C.ink; pathOf(ctx, foot); ctx.fill();
    ctx.strokeStyle = C.cream; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(fx + 4, fy + 4); ctx.lineTo(fx + 18, fy + 7); ctx.stroke();
  };
  // far arm + far leg first
  const shX = hipX + 8, shY = hipY - 92, lean = 0.05;
  const arm = (ph0, w) => {
    const s = Math.sin(ph + ph0), a = -0.5 * s * w, el = [shX + Math.sin(a) * 44, shY + Math.cos(a) * 44];
    const fa = a + 0.5 + 0.4 * Math.max(0, s) * w, hand = [el[0] + Math.sin(fa) * 42, el[1] + Math.cos(fa) * 42];
    return { el, hand, a, fa };
  };
  const A1 = arm(Math.PI, 1), A2 = arm(0, 0.85);   // A1: far arm swings opposite to near leg
  const drawArm = (A, far) => {
    const u = limb(ctx, [shX, shY], A.el, 9, 7), f = limb(ctx, A.el, A.hand, 7, 5);
    knock(ctx, u); knock(ctx, f);
    hatch(ctx, u, 60, 2.4, 2.4, () => far ? 1 : 0.8, C.ink); hatch(ctx, f, 60, 2.4, 2.4, () => far ? 0.9 : 0.6, C.ink);
    pen(ctx, u, 1.8, C.ink, 80, { closed: true }); pen(ctx, f, 1.8, C.ink, 81, { closed: true });
    ctx.fillStyle = C.cream; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(A.hand[0], A.hand[1] + 3, 6, 0, TAU); ctx.fill(); ctx.stroke();
  };
  drawLeg(L2, true); drawArm(A1, true);
  // torso: a frock coat with a tail
  const sw = 0.04 * Math.sin(ph * 2);
  const coat = smooth([[shX - 18, shY + 4], [shX - 2, shY - 8], [shX + 18, shY], [shX + 22, shY + 38], [hipX + 20, hipY + 4], [hipX + 14, hipY + 26], [hipX - 6, hipY + 34 + 4 * Math.sin(ph)], [hipX - 36, hipY + 30 + 6 * Math.sin(ph + 1)], [hipX - 26, hipY + 6], [shX - 24, shY + 40]], true, 8);
  knock(ctx, coat);
  hatch(ctx, coat, 62, 2.4, 2.8, (x, y) => 0.95 - 0.35 * sstep(shX - 10, shX + 24, x), C.ink);
  hatch(ctx, coat, -20, 3.4, 1.2, (x, y) => 0.75 * sstep(shX, shX - 30, x) + 0.3, C.ink);
  pen(ctx, coat, 2.2, C.ink, 90, { closed: true });
  // waistcoat + shirt front
  const vest = smooth([[shX + 6, shY + 2], [shX + 20, shY + 8], [shX + 22, shY + 38], [shX + 12, shY + 56], [shX + 2, shY + 30]], true, 6);
  knock(ctx, vest); ctx.fillStyle = C.cream; pathOf(ctx, vest); ctx.globalAlpha = 0; ctx.fill(); ctx.globalAlpha = 1;
  hatch(ctx, vest, 0, 2.6, 1.0, () => 0.55, C.ink); pen(ctx, vest, 1.4, C.ink, 91, { closed: true });
  for (let i = 0; i < 3; i++) { ctx.fillStyle = C.cream; ctx.beginPath(); ctx.arc(shX + 14, shY + 16 + i * 12, 1.8, 0, TAU); ctx.fill(); }
  // near leg then near arm
  drawLeg(L1, false); drawArm(A2, false);
  // cane in the far hand, planted forward
  { const h = A1.hand, tip = [h[0] + 26 + 14 * Math.sin(ph), gy - 2 + 2]; pen(ctx, [[h[0] - 2, h[1] + 4], tip], 2.6, C.ink, 99, { taper: 0.1 });
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(h[0] - 2, h[1] + 3, 5.5, 0, TAU); ctx.fill(); }
  // head, neck, collar
  const hx = shX + 14, hy = shY - 28 + bob * 0.2;
  pen(ctx, [[shX + 6, shY], [shX + 8, shY - 14]], 7, C.ink2, 2, { taper: 0 });
  const face = smooth([[hx - 12, hy - 16], [hx + 8, hy - 18], [hx + 16, hy - 8], [hx + 26, hy - 2], [hx + 16, hy + 1], [hx + 18, hy + 8], [hx + 8, hy + 17], [hx - 10, hy + 14], [hx - 16, hy - 2]], true, 6);
  knock(ctx, face);
  hatch(ctx, face, 70, 3.2, 1.2, (x, y) => 0.65 * sstep(hx - 4, hx - 16, x) + 0.25, C.ink);
  pen(ctx, face, 1.9, C.ink, 100, { closed: true });
  pen(ctx, [[hx + 20, hy - 4], [hx + 12, hy + 6]], 1.1, C.ink, 101);                 // nose shadow
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(hx + 9, hy - 6, 2.2, 1.6, 0, 0, TAU); ctx.fill(); // eye
  pen(ctx, [[hx + 6, hy - 11], [hx + 15, hy - 11]], 1.6, C.ink, 102);                // brow
  pen(ctx, [[hx + 8, hy + 8], [hx + 18, hy + 6], [hx + 22, hy + 7]], 2.2, C.ink, 103); // moustache
  pen(ctx, [[hx - 10, hy + 6], [hx - 15, hy + 18], [hx + 4, hy + 20]], 1.2, C.ink, 104); // whisker
  // top hat
  const brimY = hy - 15, hatT = brimY - 40;
  const hat = [[hx - 17, brimY], [hx - 15, hatT + 3], [hx - 9, hatT], [hx + 9, hatT], [hx + 15, hatT + 3], [hx + 17, brimY]];
  knock(ctx, hat); hatch(ctx, hat, 90, 2.6, 1.8, (x, y) => 0.9 - 0.7 * sstep(hx - 12, hx + 16, x), C.ink);
  pen(ctx, hat, 2, C.ink, 105, { closed: true });
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(hx + 1, brimY, 29, 5.2, -0.06, 0, TAU); ctx.fill();
  ctx.strokeStyle = C.cream; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(hx - 20, brimY - 1); ctx.lineTo(hx + 22, brimY - 2); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.fillRect(hx - 17, brimY - 11, 34, 6);                      // hat band
  ctx.restore();
}

export const SUBJECTS = { bird: drawBird, walker: drawWalker };
// render the 12 frames of a subject into transparent canvases (size px)
export function makeTiles(name, size = 512) {
  const out = [];
  for (let k = 0; k < 12; k++) {
    const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
    g.scale(size / TILE, size / TILE); SUBJECTS[name](g, k); out.push(c);
  }
  return out;
}
