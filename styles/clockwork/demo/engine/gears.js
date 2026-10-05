// gears.js: involute spur-gear outlines and the meshing law. Pure maths, no three.js (runs in node too).
// A gear is {N, m}: N teeth, module m (pitch radius = m*N/2). The pair law is in meshAngle().
const PA = 22.5 * Math.PI / 180;                                   // pressure angle
const inv = a => Math.tan(a) - a;

export function gearDims(N, m) {
  const rp = m * N / 2, rb = rp * Math.cos(PA), ra = rp + 1.0 * m, rf = rp - 1.25 * m;
  return { rp, rb, ra, rf };
}

// closed outline, counter-clockwise, tooth 0 centred on angle 0
export function gearOutline(N, m, { flank = 7, backlash = 0.06 } = {}) {
  const { rp, rb, ra, rf } = gearDims(N, m);
  const tp = Math.PI * m / 2 * (1 - backlash);                      // tooth thickness on the pitch circle
  const ht0 = tp / (2 * rp), ap = Math.acos(rb / rp), ip = inv(ap);
  const ht = r => ht0 + ip - inv(Math.acos(Math.min(1, rb / r)));    // half angular thickness at radius r
  const rs = Math.max(rb, rf), pts = [], A = 2 * Math.PI / N;
  const P = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
  for (let k = 0; k < N; k++) {
    const c = k * A, left = [], right = [];
    for (let i = 0; i <= flank; i++) {
      const r = rs + (ra - rs) * (i / flank) ** 0.9;
      left.push(P(r, c - ht(r))); right.push(P(r, c + ht(r)));
    }
    if (rf < rb - 1e-6) { left.unshift(P(rf, c - ht(rb))); right.unshift(P(rf, c + ht(rb))); }
    // root arc leading into this tooth is added by the previous tooth's tail: start on the left flank
    for (const p of left) pts.push(p);
    for (let i = 2; i >= 0; i--) { const a = c - ht(ra) + (2 * ht(ra)) * (1 - i / 2) ; pts.push(P(ra, a)); }   // tip land
    for (let i = right.length - 1; i >= 0; i--) pts.push(right[i]);
    const a0 = c + ht(rb < rf ? rf : rb), a1 = (k + 1) * A - ht(rb < rf ? rf : rb);
    for (let i = 1; i <= 2; i++) pts.push(P(rf, a0 + (a1 - a0) * i / 3));  // root arc to the next tooth
  }
  return pts;
}

// Rotation of a gear 2 that meshes with gear 1. Gear 1 at origin, turned theta1 (tooth 0 at angle theta1);
// gear 2 sits at centre distance d in direction phi. Returns theta2 so that a tooth of 1 faces a gap of 2 on the line of centres.
export function meshAngle(N1, N2, phi, theta1) {
  const A2 = 2 * Math.PI / N2;
  return phi + Math.PI - A2 / 2 - (theta1 - phi) * N1 / N2;
}
export function gearPos(N1, N2, m, phi) { const d = m * (N1 + N2) / 2; return [d * Math.cos(phi), d * Math.sin(phi)]; }

// ---------- verification: do two meshing gears ever overlap? ----------
function pip(pt, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) c = !c; } return c; }
export function transform(poly, ang, cx, cy) { const c = Math.cos(ang), s = Math.sin(ang); return poly.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]); }
export function meshCheck(N1, N2, m, phi = 0.4, steps = 90) {
  const o1 = gearOutline(N1, m), o2 = gearOutline(N2, m), [cx, cy] = gearPos(N1, N2, m, phi), d1 = gearDims(N1, m), d2 = gearDims(N2, m);
  const dense = poly => { const out = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; for (let k = 0; k < 3; k++) out.push([a[0] + (b[0] - a[0]) * k / 3, a[1] + (b[1] - a[1]) * k / 3]); } return out; };
  let hits = 0;
  for (let s = 0; s < steps; s++) {
    const th1 = s / steps * 2 * Math.PI / N1, th2 = meshAngle(N1, N2, phi, th1);
    const p1 = transform(o1, th1, 0, 0), p2 = transform(o2, th2, cx, cy);
    // only points inside the other gear's tip circle can be in overlap; only polygon edges near the contact matter
    for (const q of dense(p2)) { if (Math.hypot(q[0], q[1]) < d1.ra && pip(q, p1)) hits++; }
    for (const q of dense(p1)) { if (Math.hypot(q[0] - cx, q[1] - cy) < d2.ra && pip(q, p2)) hits++; }
  }
  return { hits, ok: hits === 0 };
}
