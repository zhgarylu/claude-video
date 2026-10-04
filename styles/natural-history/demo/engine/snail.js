// snail.js: a banded land-snail shell built from stacked whorl ellipsoids. Controllable anatomy:
// whorls, spire height, bands (count and latitude), lip size, aperture angle, banded or plain.
import { Noise, clamp, lerp, TAU, mulberry, catmull, resample, ss, bboxOf, ellipse, xf } from './util.js';
import { part } from './wash.js';
import { stroke, dot, InkSet, maskFn, stipple } from './ink.js';

const L = (() => { const v = { x: -.52, y: -.58, z: .62 }, l = Math.hypot(v.x, v.y, v.z); return { x: v.x / l, y: v.y / l, z: v.z / l }; })();
export const SNAIL_DEFAULT = { s: 130, whorls: 4, spire: 1, bands: 5, bandSkip: [], lip: 1, tilt: -.17, seed: 3 };

export function snailShell(c, opt = {}) {
  const o = { ...SNAIL_DEFAULT, ...opt }, s = o.s, rnd = mulberry(o.seed), nz = Noise(o.seed + 3);
  // whorls from the apex to the body: [cx, cy, rx, ry, rot] in shell units
  const W = [];
  const nW = o.whorls, sp = o.spire;
  for (let i = 0; i < nW; i++) {
    const k = i / (nW - 1);                       // 0 apex .. 1 body
    const rx = lerp(.34, 1.0, Math.pow(k, 1.5)), ry = lerp(.26, .9, Math.pow(k, 1.5));
    const f = (arr) => { const q = k * (arr.length - 1), j = Math.min(arr.length - 2, Math.floor(q)); return lerp(arr[j], arr[j + 1], q - j); };
    const cy = f([-1.12, -.86, -.42, 0]) * sp, cx = f([-.3, -.22, -.1, 0]) * sp;
    W.push({ cx, cy, rx, ry, rot: lerp(-.32, o.tilt, k) });
  }
  const E = W.map(w => ({ ...w, pts: ellipse(c.x + w.cx * s, c.y + w.cy * s, w.rx * s, w.ry * s, w.rot, 96) }));
  const inEll = (w, x, y) => { const dx = x - (c.x + w.cx * s), dy = y - (c.y + w.cy * s), cs = Math.cos(-w.rot), sn = Math.sin(-w.rot), u = (dx * cs - dy * sn) / (w.rx * s), v = (dx * sn + dy * cs) / (w.ry * s); return u * u + v * v; };
  // aperture
  const ap = { cx: .46, cy: .38, rx: .36 * o.lip, ry: .27 * o.lip, rot: .72 };
  const apPts = ellipse(c.x + ap.cx * s, c.y + ap.cy * s, ap.rx * s, ap.ry * s, ap.rot, 60);
  const lipPts = ellipse(c.x + ap.cx * s, c.y + ap.cy * s, (ap.rx + .075) * s, (ap.ry + .075) * s, ap.rot, 60);
  const body = W[nW - 1];
  // visibility: a point of whorl i is visible unless inside a later whorl (or the lip)
  const visible = (i, x, y) => { for (let j = i + 1; j < nW; j++) if (inEll(W[j], x, y) < 1) return false; return true; };
  const inLip = (x, y) => { const dx = x - (c.x + ap.cx * s), dy = y - (c.y + ap.cy * s), cs = Math.cos(-ap.rot), sn = Math.sin(-ap.rot), u = (dx * cs - dy * sn) / ((ap.rx + .075) * s), v = (dx * sn + dy * cs) / ((ap.ry + .075) * s); return u * u + v * v < 1; };
  // tone: lit ellipsoid, per whorl
  const toneW = (w, x, y) => {
    const u = clamp((x - (c.x + w.cx * s)) / (w.rx * s), -1, 1), v = clamp((y - (c.y + w.cy * s)) / (w.ry * s), -1, 1), r2 = Math.min(1, u * u + v * v), h = Math.sqrt(1 - r2);
    const n = { x: u * .92, y: v * .92, z: h + .08 }, m = Math.hypot(n.x, n.y, n.z);
    return clamp(1 - (n.x * L.x + n.y * L.y + n.z * L.z) / m * 1.2 + .1);
  };
  const whichW = (x, y) => { for (let i = nW - 1; i >= 0; i--) if (inEll(W[i], x, y) < 1) return i; return 0; };
  const tone = (x, y) => toneW(W[whichW(x, y)], x, y);
  const parts = [], ink = new InkSet();
  // base: yellow shell, one part per whorl so each can be cut by those in front
  for (let i = 0; i < nW; i++) {
    const cut = []; for (let j = i + 1; j < nW; j++) cut.push(E[j].pts); cut.push(lipPts);
    parts.push(part({ id: 'w' + i, polys: [E[i].pts], cut, lo: '#ecd48a', hi: '#9a6a1c', k: .55, tone: (x, y) => toneW(W[i], x, y), edge: 4, edgeK: .4, gran: .5, seed: 40 + i }));
  }
  // bands: chestnut stripes of latitude that run on from whorl to whorl
  const bandLat = []; for (let b = 0; b < o.bands; b++) bandLat.push(-.55 + b * (.0 + 1.35 / Math.max(1, o.bands - 1)) * (o.bands > 1 ? 1 : 0));
  for (let i = 0; i < nW; i++) {
    const w = W[i], polysI = [];
    bandLat.forEach((lat, bi) => {
      if (o.bandSkip.includes(bi)) return;
      const up = [], dn = [];
      for (let k = 0; k <= 34; k++) {
        const u = lerp(.03, .97, k / 34) * Math.PI, cl = Math.cos(lat * .9), x0 = w.rx * cl * Math.cos(u) * .985, y0 = w.ry * Math.sin(lat * .9) + .3 * w.ry * cl * Math.sin(u);
        const wd = w.ry * (.1 + .018 * bi) * Math.pow(Math.sin(u), .3) * (.8 + .2 * Math.cos(u * 2));
        const rot = (px, py) => ({ x: c.x + (w.cx + (px * Math.cos(w.rot) - py * Math.sin(w.rot))) * s, y: c.y + (w.cy + (px * Math.sin(w.rot) + py * Math.cos(w.rot))) * s });
        up.push(rot(x0, y0 - wd)); dn.push(rot(x0, y0 + wd));
      }
      polysI.push(up.concat(dn.reverse()));
    });
    const cut = []; for (let j = i + 1; j < nW; j++) cut.push(E[j].pts); cut.push(lipPts);
    parts.push(part({ id: 'bands' + i, polys: polysI, cut, clip: [E[i].pts], lo: '#b87846', hi: '#4d2412', k: .88, tone: (x, y) => .3 + .55 * toneW(w, x, y) + (nz(x * .05, y * .05) - .5) * .3, edge: 2.4, edgeK: .45, gran: .55, spill: .6, seed: 50 + i, dx: .7, dy: .6 }));
  }
  // aperture: dark throat, paler near the lip; and the cream lip
  const lipRing = [lipPts], throatBB = bboxOf([apPts]);
  parts.push(part({ id: 'lip', polys: [lipPts], cut: [apPts], lo: '#f5ecd4', hi: '#a89468', k: .42, tone: (x, y) => .25 + .5 * tone(x, y), edge: 2.6, edgeK: .4, seed: 61 }));
  const apC = { x: c.x + ap.cx * s, y: c.y + ap.cy * s };
  parts.push(part({ id: 'throat', polys: [apPts], lo: '#b98a5c', hi: '#2e1b10', k: .92, tone: (x, y) => clamp(.35 + .65 * (1 - Math.hypot(x - (apC.x + 14), y - (apC.y + 8)) / (ap.rx * s * 1.1))), edge: 3, edgeK: .5, seed: 62 }));

  // ink: visible stretches of each whorl outline, the lip, aperture
  const runsOf = (pts, f, minLen = 4) => { const runs = []; let cur = []; for (const p of pts) { if (f(p)) cur.push(p); else { if (cur.length >= minLen) runs.push(cur); cur = []; } } if (cur.length >= minLen) runs.push(cur); return runs; };
  for (let i = 0; i < nW; i++) {
    const pts = E[i].pts.concat([E[i].pts[0]]);
    for (const run of runsOf(pts, p => visible(i, p.x, p.y) && !inLip(p.x, p.y), 4)) {
      const lit = (run[Math.floor(run.length / 2)].x - c.x) * L.x + (run[Math.floor(run.length / 2)].y - c.y) * L.y;
      ink.add(stroke(catmull(resample(run, 5), false, 3), { w: lit > 0 ? 1.9 : 2.8, nib: .55, taper: .12 }));
    }
  }
  ink.add(stroke(catmull(lipPts.concat([lipPts[0]]), false, 2), { w: 2.5, nib: .5, taper: .05 }));
  ink.add(stroke(catmull(apPts.concat([apPts[0]]), false, 2), { w: 1.7, nib: .4, taper: .05 }));
  // growth striae: meridian hairlines with a slight shear, clipped to what is visible
  for (let i = 0; i < nW; i++) {
    const w = W[i], n = Math.round(10 + 34 * w.rx);
    for (let m = 0; m < n; m++) {
      const u = lerp(.1, .9, (m + rnd() * .5) / n) * Math.PI, pts = [];
      for (let k = 0; k <= 22; k++) {
        const lat = lerp(-1.25, 1.25, k / 22), cl = Math.cos(lat), x0 = w.rx * cl * Math.cos(u) + .16 * lat * w.rx, y0 = w.ry * Math.sin(lat) + .3 * w.ry * cl * Math.sin(u);
        pts.push({ x: c.x + (w.cx + (x0 * Math.cos(w.rot) - y0 * Math.sin(w.rot))) * s, y: c.y + (w.cy + (x0 * Math.sin(w.rot) + y0 * Math.cos(w.rot))) * s });
      }
      for (const run of runsOf(pts, p => visible(i, p.x, p.y) && !inLip(p.x, p.y) && inEll(w, p.x, p.y) < .985, 4)) ink.add(stroke(catmull(run, false, 3), { w: .5 + rnd() * .25, nib: .2, taper: .5, a: .45 + rnd() * .2 }));
    }
  }
  // stipple on the shadow side of every whorl
  const polys = E.map(e => e.pts), bb = bboxOf(polys);
  const insideVis = (() => { const base = maskFn(polys, [apPts], bb); return (x, y) => base(x, y); })();
  const dots = stipple(insideVis, bb, (x, y) => tone(x, y) * .98, { sp: 3.0, min: .5, seed: 9, rmin: .4, rmax: 1.0 });
  dots.sort((p, q) => (p.x * .5 + p.y) - (q.x * .5 + q.y));
  ink.addAll(dots);
  return { parts, ink, bb, poly: E[nW - 1].pts, anchors: { pin: { x: c.x + W[0].cx * s, y: c.y + (W[0].cy - W[0].ry * .6) * s }, lip: { x: apC.x + ap.rx * s, y: apC.y }, label: { x: c.x, y: bb.y1 } } };
}
