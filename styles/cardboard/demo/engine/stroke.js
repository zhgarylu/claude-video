// stroke.js: marker lettering written stroke by stroke, and the decal planes that carry it (marker, tape labels, cut lines).
import * as THREE from 'three';
import { cv, tex } from './tex.js';
import { mulberry, clamp } from '/core/lib.js';

// single-line capitals on a 0..1 box (y down); hand-built, each glyph is a list of strokes
const G = {
 A: [[[0,1],[.5,0],[1,1]], [[.2,.64],[.8,.64]]], B: [[[0,1],[0,0],[.7,0],[.92,.15],[.7,.48],[0,.5]], [[.7,.48],[.97,.7],[.75,.97],[.7,1],[0,1]]],
 C: [[[1,.15],[.7,0],[.3,0],[0,.25],[0,.75],[.3,1],[.7,1],[1,.85]]], D: [[[0,0],[0,1],[.6,1],[1,.7],[1,.3],[.6,0],[0,0]]],
 E: [[[1,0],[0,0],[0,1],[1,1]], [[0,.5],[.7,.5]]], F: [[[1,0],[0,0],[0,1]], [[0,.5],[.7,.5]]],
 G: [[[1,.15],[.7,0],[.3,0],[0,.25],[0,.75],[.3,1],[.75,1],[1,.8],[1,.55],[.55,.55]]], H: [[[0,0],[0,1]], [[1,0],[1,1]], [[0,.5],[1,.5]]],
 I: [[[.2,0],[.8,0]], [[.5,0],[.5,1]], [[.2,1],[.8,1]]], J: [[[1,0],[1,.75],[.7,1],[.3,1],[0,.8]]], K: [[[0,0],[0,1]], [[1,0],[0,.58]], [[.3,.42],[1,1]]],
 L: [[[0,0],[0,1],[1,1]]], M: [[[0,1],[0,0],[.5,.6],[1,0],[1,1]]], N: [[[0,1],[0,0],[1,1],[1,0]]],
 O: [[[.5,0],[.15,.1],[0,.5],[.15,.9],[.5,1],[.85,.9],[1,.5],[.85,.1],[.5,0]]], P: [[[0,1],[0,0],[.75,0],[1,.22],[.75,.5],[0,.52]]],
 R: [[[0,1],[0,0],[.75,0],[1,.22],[.75,.5],[0,.52]], [[.5,.52],[1,1]]], S: [[[1,.15],[.7,0],[.3,0],[0,.2],[.2,.45],[.8,.55],[1,.8],[.7,1],[.3,1],[0,.85]]],
 T: [[[0,0],[1,0]], [[.5,0],[.5,1]]], U: [[[0,0],[0,.75],[.3,1],[.7,1],[1,.75],[1,0]]], V: [[[0,0],[.5,1],[1,0]]], W: [[[0,0],[.25,1],[.5,.4],[.75,1],[1,0]]],
 X: [[[0,0],[1,1]], [[1,0],[0,1]]], Y: [[[0,0],[.5,.5],[1,0]], [[.5,.5],[.5,1]]], Z: [[[0,0],[1,0],[0,1],[1,1]]], Q: [[[.5,0],[.15,.1],[0,.5],[.15,.9],[.5,1],[.85,.9],[1,.5],[.85,.1],[.5,0]], [[.6,.7],[1,1.05]]],
 '1': [[[.25,.2],[.55,0],[.55,1]]], '2': [[[0,.2],[.3,0],[.7,0],[1,.25],[.8,.55],[0,1],[1,1]]], '3': [[[0,.1],[.5,0],[.9,.15],[.9,.4],[.4,.5],[.95,.62],[.95,.88],[.5,1],[0,.9]]],
 '!': [[[.5,0],[.5,.68]], [[.5,.92],[.5,.94]]], '.': [[[.5,.95],[.5,.97]]], '=': [[[0,.35],[1,.35]], [[0,.68],[1,.68]]], '>': [[[0,.1],[1,.5],[0,.9]]], '-': [[[0,.5],[1,.5]]],
 ' ': [],
};
// lay out a string: returns strokes in line space (x in glyph heights), with per-stroke length for animation
export function layout(text, seed = 1, wob = .035) {
  const rnd = mulberry(seed * 7919 + text.length), strokes = []; let x = 0;
  for (const ch of text.toUpperCase()) {
    const g = G[ch]; const w = ch === ' ' ? .45 : ch === 'I' ? .5 : ch === '.' || ch === '!' ? .25 : ch === 'M' || ch === 'W' ? .95 : .72;
    const sc = .95 + rnd() * .1, dy = (rnd() - .5) * .06, rot = (rnd() - .5) * .08;
    for (const s of g || []) {
      const pts = [];
      // densify each segment so the wobble reads as a hand, not a polygon
      for (let i = 0; i < s.length - 1; i++) { const a = s[i], b = s[i + 1], n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 5)); for (let k = (i ? 1 : 0); k <= n; k++) { const u = k / n; pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); } }
      const ph = rnd() * 6, out = pts.map((p, i) => { const cx = (p[0] - .5) * w, cy = p[1] - .5; return [x + w / 2 + (cx * Math.cos(rot) - cy * Math.sin(rot)) * sc + Math.sin(i * .9 + ph) * wob, .5 + dy + (cx * Math.sin(rot) + cy * Math.cos(rot)) * sc + Math.cos(i * 1.1 + ph) * wob]; });
      let len = 0; for (let i = 1; i < out.length; i++) len += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]);
      strokes.push({ pts: out, len });
    }
    x += w + .18;
  }
  const total = strokes.reduce((a, s) => a + s.len, 0);
  return { strokes, width: x - .18, total };
}
// draw text up to progress p (0..1 of total length) onto a 2D context; origin top-left of the box, px = glyph height in pixels
export function drawMarker(ctx, lay, p, ox, oy, px, col = '#1d2733', lw = .17) {
  let left = p * lay.total, tip = null;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of lay.strokes) {
    if (left <= 0) break;
    const take = Math.min(left, s.len); left -= take;
    let acc = 0; const path = [s.pts[0]];
    for (let i = 1; i < s.pts.length; i++) { const d = Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]); if (acc + d >= take) { const u = (take - acc) / (d || 1); path.push([s.pts[i - 1][0] + (s.pts[i][0] - s.pts[i - 1][0]) * u, s.pts[i - 1][1] + (s.pts[i][1] - s.pts[i - 1][1]) * u]); break; } acc += d; path.push(s.pts[i]); }
    tip = path[path.length - 1];
    for (const [w, a, c] of [[lw * 1.25, .35, col], [lw, .92, col], [lw * .45, .5, 'rgba(255,255,255,0.12)']]) {
      ctx.strokeStyle = c; ctx.globalAlpha = a; ctx.lineWidth = w * px; ctx.beginPath(); path.forEach((q, i) => { const X = ox + q[0] * px, Y = oy + q[1] * px; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke();
    }
  }
  ctx.restore();
  return tip ? [ox + tip[0] * px, oy + tip[1] * px] : null;
}

// A decal: a flat plane that carries a canvas (cut line, marker text, tape + writing). Place it with .position / .rotation.
export class Decal {
  constructor({ w, h, ppc = 60, opaque = false, paint }) {
    this.w = w; this.h = h; this.ppc = ppc; this.paint = paint;
    this.c = cv(Math.round(w * ppc), Math.round(h * ppc)); this.x = this.c.getContext('2d'); this.t = tex(this.c); this.t.wrapS = this.t.wrapT = THREE.ClampToEdgeWrapping;
    this.mat = new THREE.MeshStandardMaterial({ map: this.t, transparent: !opaque, roughness: .85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.mat); this.mesh.rotation.x = -Math.PI / 2; this.mesh.receiveShadow = true; this.mesh.renderOrder = 2;
    this.last = null;
  }
  // repaint when the key changes (so a held decal costs nothing)
  set(key, ...args) { if (key === this.last) return; this.last = key; this.x.clearRect(0, 0, this.c.width, this.c.height); this.paint(this.x, this.ppc, ...args); this.t.needsUpdate = true; }
}
// pen-tip position on a decal in decal-local cm (x right, z down in the plane's frame once rotated flat)
export const tipToLocal = (d, tip) => tip ? [(tip[0] / d.ppc) - d.w / 2, (tip[1] / d.ppc) - d.h / 2] : null;
