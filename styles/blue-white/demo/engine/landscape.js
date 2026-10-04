// landscape.js: landscape pieces and the plate composition (original), drawn with the cobalt pen.
import { lerp, mulberry, TAU } from '/core/lib.js';
import { spline } from './vessel.js';
import { Pen } from './cobalt.js';
import { ring, waves, meander, petalPanels, curl, scallopBand, ruyiCollar, blade, bladeOutline, bladeWash } from './motifs.js';

const rad = d => d * Math.PI / 180;
const jag = (rng, a) => (rng() - .5) * 2 * a;

// mountain ridge control points across [x0,x1], base y, peaks [{x, h, w}]
export function ridgePts(x0, x1, yb, peaks, rng, step = 36) {
  const pts = [];
  for (let x = x0; x <= x1 + 1; x += step) {
    let h = 0; for (const p of peaks) h += p.h * Math.pow(1 / (1 + Math.pow((x - p.x) / p.w, 2)), 1.25);
    pts.push([x, yb - h + jag(rng, 9) * (h > 20 ? 1 : .2)]);
  }
  return pts;
}
export function mountain(pen, x0, x1, yb, peaks, rng, o = {}) {
  const R = ridgePts(x0, x1, yb, peaks, rng, o.step ?? 34);
  const top = Math.min(...R.map(p => p[1]));
  const poly = R.concat([[x1, yb + (o.sink ?? 0)], [x0, yb + (o.sink ?? 0)]]);
  pen.line(spline(R, 3), { w: o.lw ?? 8, d: o.ld ?? .4, taper: [.02, .02], speed: pen.speed * 1.6 });
  pen.wash(poly, { angle: o.angle ?? rad(80), spacing: o.sp ?? 24, passes: 2, dens: o.dens ?? [.04, .28], axis: [[(x0 + x1) / 2, yb], [(x0 + x1) / 2, top]], dFn: g => Math.pow(g, 1.4) * 1.5, bristle: 3, rimD: .03, rimW: 3 });
  // darker accent along the ridge, moss dots (dian), then axe-cut texture strokes down the flanks
  const acc = R.map(p => [p[0], p[1] + 8]).concat(R.slice().reverse().map(p => [p[0], p[1] + 30 + 22 * ((p[0] * .37) % 1)]));
  pen.wash(acc, { angle: rad(8), spacing: 14, passes: 1, dens: [(o.dens?.[1] ?? .3) * .8, (o.dens?.[1] ?? .3) * .8], rim: false, bristle: 3, dur: .6 });
  for (let i = 0; i < (o.dots ?? 26); i++) { const k = 1 + (rng() * (R.length - 2) | 0); pen.dot(R[k][0] + jag(rng, 14), R[k][1] + 22 + rng() * 38, 9 + rng() * 9, .55 + .3 * rng()); }
  const n = o.cun ?? 26;
  for (let i = 0; i < n * 1.6; i++) {
    const k = 2 + (rng() * (R.length - 4) | 0), p = R[k], q = R[k + 1]; const dep = 20 + rng() * (yb - p[1]) * .85;
    const x = p[0] + rng() * 20, y = p[1] + dep; const dir = (q[1] - p[1]) / ((q[0] - p[0]) || 1);
    pen.line([[x, y], [x + 28 + rng() * 26, y + dir * 40 + 14 + rng() * 10], [x + 48 + rng() * 30, y + dir * 70 + 34 + rng() * 18]], { w: 9 + rng() * 6, d: (o.cd ?? .26) * (.7 + rng() * .6), taper: [.2, .5], speed: pen.speed * 1.8, bristle: 2, dry: 1.4 });
  }
  return R;
}
export function pine(pen, x, y, h, rng, o = {}) {
  const s = h / 360, dir = o.dir ?? 1;
  const trunk = [[x, y], [x + dir * 24 * s, y - h * .3], [x - dir * 14 * s, y - h * .62], [x + dir * 20 * s, y - h]];
  pen.stroke(trunk, { w: 40 * s, w1: 16 * s, d: .55, taper: [.02, .1], bristle: 4, dry: 1.2, speed: pen.speed * .9 });
  for (let i = 0; i < 7; i++) { const f = .1 + i * .11, c = [x + dir * 12 * s * Math.sin(f * 7), y - h * f]; pen.line([[c[0] - 12 * s, c[1]], [c[0], c[1] - 9 * s], [c[0] + 12 * s, c[1] + 2 * s]], { w: 5 * s + 2, d: .3, speed: pen.speed * 2 }); }
  const brs = [[.38, -1, 150], [.56, 1, 170], [.74, -1, 120], [1, 1, 100]];
  for (const [f, sd, L] of brs) {
    const b0 = [x + dir * (22 * s) * Math.sin(f * 3), y - h * Math.min(f, .97)];
    const b1 = [b0[0] + sd * L * s * .5, b0[1] - 20 * s], b2 = [b0[0] + sd * L * s, b0[1] - 4 * s];
    pen.stroke([b0, b1, b2], { w: 15 * s + 3, w1: 6 * s + 2, d: .5, taper: [.05, .2], speed: pen.speed * 1.2, bristle: 2 });
    const cc = [b2[0], b2[1] - 6 * s]; const R = 66 * s + 14;
    const cl = []; for (let k = 0; k < 18; k++) { const a = rad(-170 + k * 160 / 17); cl.push([cc[0] + Math.cos(a) * R * 1.15, cc[1] + Math.sin(a) * R * .62]); }
    pen.wash(cl.concat([[cc[0] + R, cc[1] + 4], [cc[0] - R, cc[1] + 4]]), { angle: 0, spacing: 11, passes: 1, dens: [.3, .3], axis: [[cc[0], cc[1] + R], [cc[0], cc[1] - R]], bristle: 0, rim: false, dur: .25 });
    for (let k = 0; k < 15; k++) { const a = rad(-180 + k * 180 / 14 + jag(rng, 5)), l = R * (.7 + rng() * .5); pen.line([[cc[0], cc[1]], [cc[0] + Math.cos(a) * l, cc[1] + Math.sin(a) * l * .8]], { w: 5.5 * Math.max(.7, s) + 1, d: .42, taper: [.05, .3], speed: pen.speed * 2.6 }); }
  }
}
export function rock(pen, cx, cy, w, h, rng, o = {}) {
  const n = 9, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU + .3; const rr = 1 + jag(rng, .22); pts.push([cx + Math.cos(a) * w * .5 * rr, cy + Math.sin(a) * h * .5 * rr * (Math.sin(a) < 0 ? 1.15 : .8)]); }
  const outline = pts.concat([pts[0], pts[1]]);
  pen.line(spline(outline, 2), { w: 11, d: .62, taper: [.02, .05], speed: pen.speed * 1.2 });
  pen.wash(pts, { angle: rad(70), spacing: 18, passes: 2, dens: o.dens ?? [.58, .30], axis: [[cx, cy + h * .5], [cx - w * .3, cy - h * .5]], crossFn: cf => .7 + .8 * Math.abs(cf - .5) * 2, dFn: g => 1 - .3 * g, bristle: 3, rimD: .24, rimW: 9 });
  for (let i = 0; i < 9; i++) { const x = cx + jag(rng, w * .35), y = cy + jag(rng, h * .3); pen.line([[x, y], [x + 24 + rng() * 22, y + 10 + rng() * 14], [x + 14 + rng() * 22, y + 40 + rng() * 22]], { w: 7.5, d: .5, taper: [.1, .5], speed: pen.speed * 2 }); }
  for (let i = 0; i < 4; i++) pen.dot(cx + jag(rng, w * .3), cy + h * .15 + jag(rng, h * .2), 18 + rng() * 14, .9);
}
export function reeds(pen, x, y, n, h, rng) {
  for (let i = 0; i < n; i++) { const xx = x + i * 26 + jag(rng, 8), hh = h * (.6 + rng() * .5), lean = (rng() - .5) * 100; pen.stroke([[xx, y], [xx + lean * .4, y - hh * .5], [xx + lean, y - hh]], { w: 8, d: .5, taper: [.05, .5], speed: pen.speed * 2.4 }); }
}
export function bamboo(pen, x, y, h, rng, o = {}) {
  const w = o.w ?? 34, nodes = 5, sh = h / nodes, lean = o.lean ?? 0;
  for (let i = 0; i < nodes; i++) {
    const y0 = y - i * sh - 6, y1 = y0 - sh + 14, xa = x + lean * i * sh / h, xb = x + lean * (i + 1) * sh / h;
    pen.stroke([[xa, y0], [(xa + xb) / 2 + jag(rng, 3), (y0 + y1) / 2], [xb, y1]], { w, d: .5, taper: [.1, .1], bristle: 3, speed: pen.speed * 1.6, minW: .8, dry: 1.4 });
    pen.stroke([[xb - w * .6, y1 + 5], [xb + w * .6, y1 + 3]], { ch: 'g', w: 8, d: .6, taper: [.2, .2], straight: true, speed: pen.speed * 2 });
    if (i >= 3) for (const sd of [-1, 1]) {
      const bx = xb, by = y1 + 4;
      pen.stroke([[bx, by], [bx + sd * 44, by - 22], [bx + sd * 84, by - 22]], { w: 7, d: .45, taper: [.05, .2], speed: pen.speed * 2 });
      for (let k = 0; k < 3; k++) { const lx = bx + sd * (50 + k * 12), ly = by - 22; const a = rad(sd > 0 ? 30 + k * 28 : 150 - k * 28); pen.stroke([[lx, ly], [lx + Math.cos(a) * 50, ly + Math.sin(a) * 48], [lx + Math.cos(a) * 110, ly + Math.sin(a) * 108 - 4]], { w: 24, d: .5, taper: [.3, .5], minW: .1, speed: pen.speed * 3.5, soft: true }); }
    }
  }
}
// a few distant birds as quick brush V's
export function birds(pen, pts, rng) {
  for (const [x, y, s] of pts) pen.stroke([[x - 38 * s, y - 10 * s], [x - 12 * s, y - 20 * s], [x, y], [x + 12 * s, y - 22 * s], [x + 40 * s, y - 8 * s]], { w: 8, d: .5, taper: [.15, .3], speed: pen.speed * 2, minW: .2 });
}

export function cloud(pen, x, y, s) {
  const A = [[x, y], [x + 60 * s, y - 36 * s], [x + 120 * s, y - 22 * s], [x + 160 * s, y - 52 * s], [x + 220 * s, y - 30 * s], [x + 250 * s, y - 4 * s]];
  pen.line(spline(A, 4), { w: 8, d: .38, taper: [.04, .3], speed: pen.speed * 1.5 });
  curl(pen, x + 120 * s, y - 22 * s - 30 * s, 34 * s, 1, 1.25, rad(40), { w: 6.5, d: .36 });
  curl(pen, x + 226 * s, y - 30 * s - 18 * s, 26 * s, 1, 1.2, rad(10), { w: 6, d: .34 });
  pen.line([[x - 20 * s, y + 20 * s], [x + 100 * s, y + 8 * s], [x + 200 * s, y + 14 * s]], { w: 6, d: .25, taper: [.1, .5], speed: pen.speed * 1.8 });
}
export function boat(pen, x, y, s) {
  pen.stroke([[x - 90 * s, y - 10 * s], [x - 40 * s, y + 18 * s], [x + 50 * s, y + 20 * s], [x + 100 * s, y - 14 * s]], { w: 18 * s, d: .62, taper: [.05, .05], speed: pen.speed, bristle: 2 });
  pen.line([[x + 4 * s, y + 4 * s], [x + 6 * s, y - 170 * s]], { w: 6, d: .55, speed: pen.speed * 1.4 });
  const sail = [[x + 10 * s, y - 160 * s], [x + 100 * s, y - 40 * s], [x + 12 * s, y - 30 * s]];
  pen.line(sail.concat([sail[0]]), { w: 7, d: .5, taper: [.05, .05], speed: pen.speed * 1.6 });
  pen.wash(sail, { angle: rad(80), spacing: 10, passes: 1, dens: [.07, .16], axis: [[x, y], [x + 100 * s, y - 100 * s]], rim: false, dur: .3 });
  pen.dot(x - 30 * s, y - 24 * s, 14 * s, .7);
  pen.line([[x - 44 * s, y - 14 * s], [x - 28 * s, y - 40 * s], [x - 14 * s, y - 14 * s]], { w: 6, d: .5, speed: pen.speed * 1.6 });
}
export function ripples(pen, x0, x1, y0, y1, n, rng) {
  for (let i = 0; i < n; i++) {
    const y = lerp(y0, y1, rng()), x = lerp(x0, x1, rng()), L = 70 + rng() * 170;
    pen.line([[x, y], [x + L * .3, y - 7], [x + L * .6, y + 3], [x + L, y - 3]], { w: 5.5 + (y - y0) / (y1 - y0) * 3, d: .2 + .12 * (y - y0) / (y1 - y0), taper: [.2, .4], speed: pen.speed * 2 });
  }
}
export function pavilion(pen, x, y, s) {
  pen.line([[x - 80 * s, y - 80 * s], [x - 30 * s, y - 112 * s], [x + 30 * s, y - 112 * s], [x + 80 * s, y - 80 * s]], { w: 8, d: .55, speed: pen.speed * 1.5 });
  pen.line([[x - 100 * s, y - 70 * s], [x - 80 * s, y - 80 * s], [x + 80 * s, y - 80 * s], [x + 100 * s, y - 70 * s]], { w: 8, d: .5, speed: pen.speed * 1.5 });
  for (const f of [-.55, .55]) pen.line([[x + f * 100 * s, y - 78 * s], [x + f * 100 * s, y]], { w: 7, d: .5, speed: pen.speed * 1.5 });
  pen.wash([[x - 80 * s, y - 80 * s], [x - 30 * s, y - 112 * s], [x + 30 * s, y - 112 * s], [x + 80 * s, y - 80 * s]], { angle: 0, spacing: 9, passes: 1, dens: [.4, .4], rim: false, dur: .25 });
  pen.line([[x - 64 * s, y], [x + 64 * s, y]], { w: 8, d: .5, speed: pen.speed * 1.5 });
}

// ---- the plate: landscape medallion (disc texture) + cavetto and outer-wall borders (wrap strip)
export function paintPlate(wrap, disc, v, tStart = 0, dDisc = 16, dWrap = 8) {
  const rng = mulberry(29), D = disc.w, cx = D / 2, cy = D / 2;
  const pen = new Pen(disc, tStart, 700, 7);
  const circ = (r, x0 = cx, y0 = cy) => { const a = []; for (let i = 0; i <= 90; i++) { const t = i / 90 * TAU; a.push([x0 + Math.cos(t) * r, y0 + Math.sin(t) * r]); } return a; };
  pen.line(circ(1004), { w: 11, d: .55, taper: [0, 0], straight: true, speed: 2600, minW: 1 });
  pen.line(circ(978), { w: 7, d: .45, taper: [0, 0], straight: true, speed: 2600, minW: 1 });
  pen.line(circ(118, 1360, 470), { w: 7, d: .3, taper: [0, 0], straight: true, speed: 900, minW: 1 });
  pen.wash(circ(112, 1360, 470), { angle: 0, spacing: 20, passes: 1, dens: [.05, .05], rim: false, dur: .4 });
  cloud(pen, 300, 620, 1.0); cloud(pen, 1340, 280, .8); cloud(pen, 1560, 760, .6);
  mountain(pen, 80, 1200, 1010, [{ x: 330, h: 330, w: 120 }, { x: 640, h: 210, w: 110 }, { x: 960, h: 360, w: 130 }], rng, { dens: [.04, .30], lw: 7, ld: .3, sp: 22, cun: 12, cd: .2 });
  mountain(pen, 760, 1980, 1120, [{ x: 1500, h: 520, w: 190 }, { x: 1880, h: 250, w: 120 }], rng, { dens: [.05, .46], lw: 9, ld: .4, cun: 26, cd: .3 });
  mountain(pen, 60, 880, 1260, [{ x: 360, h: 420, w: 160 }, { x: 150, h: 220, w: 110 }, { x: 700, h: 240, w: 120 }], rng, { dens: [.08, .7], lw: 11, ld: .5, cun: 36, cd: .4 });
  pavilion(pen, 640, 1010, 1.1);
  pine(pen, 220, 1150, 300, rng, { dir: 1 }); pine(pen, 780, 1120, 220, rng, { dir: -1 });
  pen.line([[40, 1250], [380, 1236], [800, 1262], [1200, 1246]], { w: 9, d: .35, taper: [.05, .3], speed: 1200 });
  ripples(pen, 120, 1900, 1290, 1750, 26, rng);
  boat(pen, 1330, 1370, 1.0);
  cloud(pen, 1500, 1450, .7);
  rock(pen, 360, 1640, 520, 300, rng);
  pine(pen, 300, 1560, 460, rng, { dir: 1 });
  rock(pen, 1620, 1700, 360, 200, rng, { dens: [.5, .26] });
  rock(pen, 950, 1860, 420, 130, rng, { dens: [.55, .3] }); reeds(pen, 1120, 1850, 5, 170, rng); reeds(pen, 740, 1860, 4, 130, rng);
  bamboo(pen, 1590, 1620, 470, rng, { lean: 30 }); bamboo(pen, 1700, 1640, 350, rng, { lean: -25, w: 28 });
  reeds(pen, 1250, 1690, 6, 150, rng);
  boat(pen, 760, 1520, .62); birds(pen, [[1160, 330, 1], [1230, 280, .8], [1105, 270, .7]], rng);
  disc.fit(tStart + dDisc, tStart);
  const H = v.H, yLip = H - v.outerEndV;
  const wp = new Pen(wrap, tStart, 900, 9);
  ring(wp, 12, { w: 9, speed: 2400 }); ring(wp, 28, { w: 6, speed: 2400 });
  waves(wp, 40, yLip - 22, 1, rng, { unit: 150, wash: true });
  ring(wp, yLip - 14, { w: 9, speed: 2400 }); ring(wp, yLip - 2, { w: 6, speed: 2400 });
  const yo = yLip + 22;
  ring(wp, yo + 4, { w: 9, speed: 2400 }); ring(wp, yo + 18, { w: 6, speed: 2400 });
  meander(wp, yo + 40, 70, 96);
  ring(wp, yo + 130, { w: 7, speed: 2400 });
  petalPanels(wp, yo + 150, H - 52, 44, rng);
  ring(wp, H - 34, { w: 9, speed: 2400 }); ring(wp, H - 18, { w: 6, speed: 2400 });
  wrap.fit(tStart + dWrap, tStart);
  return 16 + tStart;
}

// ---- two more vessels for the shelf: a jar with bamboo and a bowl with a lotus roundel (static, finished by t = 1)
export function paintGuan(wrap, v) {
  const rng = mulberry(41), pen = new Pen(wrap, 0, 900, 11), W = v.W, Hh = v.H, Y = h => Hh - v.vAtY(h);
  ring(pen, Y(.06), { w: 11, speed: 2400 }); ring(pen, Y(.075), { w: 8, speed: 2400 });
  petalPanels(pen, Y(.2), Y(.085), 22, rng);
  ring(pen, Y(.21), { w: 8, speed: 2400 }); ring(pen, Y(.225), { w: 11, speed: 2400 });
  for (let i = 0; i < 5; i++) {
    const x = (i + .5) * W / 5;
    bamboo(pen, x - 70, Y(.26), (Y(.26) - Y(.6)) * .95, rng, { lean: i % 2 ? 30 : -30, w: 34 });
    bamboo(pen, x + 80, Y(.26) + 10, (Y(.26) - Y(.55)) * .8, rng, { lean: i % 2 ? -24 : 20, w: 28 });
  }
  ring(pen, Y(.64), { w: 10, speed: 2400 }); ring(pen, Y(.655), { w: 8, speed: 2400 });
  ruyiCollar(pen, Y(.76), Y(.665) - Y(.76), 10, rng);
  ring(pen, Y(.775), { w: 9, speed: 2400 }); ring(pen, Y(.79), { w: 7, speed: 2400 });
  wrap.fit(1, 0);
}
export function paintBowl(wrap, disc, v) {
  const rng = mulberry(43), pen = new Pen(wrap, 0, 900, 12), Hh = v.H, Y = h => Hh - v.vAtY(h), yLip = Hh - v.outerEndV;
  ring(pen, Y(.045), { w: 10, speed: 2400 }); ring(pen, Y(.06), { w: 7, speed: 2400 });
  petalPanels(pen, Y(.165), Y(.07), 26, rng);
  ring(pen, Y(.175), { w: 8, speed: 2400 });
  waves(pen, Y(.31), Y(.185), 1, rng, { unit: 200 });
  ring(pen, Y(.325), { w: 9, speed: 2400 }); ring(pen, Y(.338), { w: 7, speed: 2400 });
  ring(pen, yLip - 8, { w: 8, speed: 2400 }); ring(pen, yLip - 20, { w: 6, speed: 2400 }); scallopBand(pen, 80, 30, 24, rng); ring(pen, 40, { w: 8, speed: 2400 });
  wrap.fit(1, 0);
  const dp = new Pen(disc, 0, 900, 13), cx = 1024, cy = 1024;
  const circ = r => { const a = []; for (let i = 0; i <= 80; i++) { const t = i / 80 * TAU; a.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); } return a; };
  dp.line(circ(1000), { w: 14, d: .55, taper: [0, 0], straight: true, speed: 4000, minW: 1 });
  dp.line(circ(950), { w: 9, d: .45, taper: [0, 0], straight: true, speed: 4000, minW: 1 });
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + .2, bl = blade([cx + Math.cos(a) * 150, cy + Math.sin(a) * 150], a, 760, 420, .1);
    bladeOutline(dp, bl, { w: 14, d: .6 }); bladeWash(dp, bl, { dens: [.5, .14], spacing: 20 });
  }
  dp.dot(cx, cy, 160, .6); dp.line(circ(110), { w: 12, d: .6, taper: [0, 0], straight: true, speed: 4000, minW: 1 });
  disc.fit(1, 0);
}
