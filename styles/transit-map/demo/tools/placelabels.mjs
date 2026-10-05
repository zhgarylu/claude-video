// Station-name placement for the diagram: every label sits flush to its line at one of ten anchors,
// chosen so that no label touches another label, any line, or any station mark. Output: labels.json.
// usage: node styles/transit-map/demo/tools/placelabels.mjs
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import * as N from '../network.js';
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = JSON.parse(fs.readFileSync(path.join(D, 'tools', 'barlow_widths.json'), 'utf8'));
const { U, ST, LINES } = N;
import { SIZE, SIZE_X, GAP, HALO, boxFor } from '../labelgeom.js';
export { SIZE, SIZE_X, GAP, HALO, boxFor };
export const widthOf = (s, px) => [...s].reduce((a, c) => a + (W[c] ?? .5), 0) * px;
export const DIRS = ['nc', 'sc', 'n', 'nw', 's', 'sw', 'e', 'w', 'ne', 'se'];
export function placeAll() {
  const ids = Object.keys(ST);
  const info = {};
  for (const id of ids) {
    const s = ST[id], px = s.lines.length > 1 ? SIZE_X : SIZE, w = widthOf(s.name, px) + 2 * HALO, h = px * .78 + 2 * HALO;
    // orientation of the line(s) at the station
    let orient = new Set();
    for (const lid of s.lines) {
      const L = N.lineById(lid), i = L.wps.findIndex(q => q.st === id), n = L.wps.length;
      const a = L.closed ? L.wps[(i - 1 + n) % n] : L.wps[Math.max(0, i - 1)], b = L.closed ? L.wps[(i + 1) % n] : L.wps[Math.min(n - 1, i + 1)];
      const dx = b.u[0] - a.u[0], dy = b.u[1] - a.u[1];
      orient.add(dy === 0 ? 'h' : dx === 0 ? 'v' : (dx * dy > 0 ? 'd1' : 'd2'));   // d1 = "\", d2 = "/"
    }
    info[id] = { w, h, px, orient: [...orient], p: [s.p[0] * U, s.p[1] * U] };
  }
  // dir candidates each station is allowed to use (flush to the line)
  const allowed = id => {
    if (id === 'quill') return ['w'];
    if (id === 'rook') return ['e'];
    const o = info[id].orient, set = new Set();
    for (const k of o) {
      if (k === 'h') ['nc', 'sc', 'n', 'nw', 's', 'sw'].forEach(x => set.add(x));
      if (k === 'v') ['e', 'w'].forEach(x => set.add(x));
      if (k === 'd1') ['ne', 'swd'].forEach(x => set.add(x));   // "\" : labels go up-right or down-left
      if (k === 'd2') ['nwd', 'se'].forEach(x => set.add(x));   // "/" : up-left or down-right
    }
    if (o.length > 1) ['ex', 'wx', 'nx', 'sx', 'e', 'w', 'n', 'nw', 's', 'sw', 'ne', 'nwd', 'se', 'swd'].forEach(x => set.add(x));
    return [...set];
  };
  // obstacles: line segments (diagram) and station marks
  const segs = [];
  for (const L of LINES) { const n = L.pts.length, c = L.closed ? n : n - 1; for (let i = 0; i < c; i++) { const a = L.pts[i], b = L.pts[(i + 1) % n]; segs.push([a[0] * U, a[1] * U, b[0] * U, b[1] * U]); } }
  const segRect = (s, r, pad) => {   // does segment s come within pad of rect r = [x0,y0,x1,y1]?
    const [x0, y0, x1, y1] = [r[0] - pad, r[1] - pad, r[0] + r[2] + pad, r[1] + r[3] + pad];
    let [ax, ay, bx, by] = s, t0 = 0, t1 = 1; const dx = bx - ax, dy = by - ay;
    for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
      if (p === 0) { if (q < 0) return false; } else { const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } }
    }
    return t0 <= t1;
  };
  const rectsOverlap = (a, b, pad = 0) => a[0] < b[0] + b[2] + pad && b[0] < a[0] + a[2] + pad && a[1] < b[1] + b[3] + pad && b[1] < a[1] + a[3] + pad;
  const abs = (id, dir) => { const i = info[id], b = boxFor(dir, i.w, i.h); return [i.p[0] + b[0], i.p[1] + b[1], b[2], b[3]]; };
  const prefer = (id, dir) => {
    const o = info[id].orient;
    if (o.length === 1 && o[0] === 'h') return { nc: 0, sc: 0, n: 2, s: 2, nw: 3, sw: 3 }[dir] ?? 9;
    return 0;
  };
  const cost = (id, dir, ch) => {
    const r = abs(id, dir); let c = prefer(id, dir);
    if (r[0] < 6 || r[1] < 6 || r[0] + r[2] > 34 * U - 6 || r[1] + r[3] > 17 * U) c += 400;
    for (const s of segs) if (segRect(s, r, 7)) c += 120;
    for (const o of ids) {
      if (o === id) continue;
      const q = info[o].p; // station marks
      if (q[0] > r[0] - 20 && q[0] < r[0] + r[2] + 20 && q[1] > r[1] - 20 && q[1] < r[1] + r[3] + 20) c += 150;
      if (ch[o] && rectsOverlap(r, abs(o, ch[o]), 4)) c += 300;
    }
    return c;
  };
  const ch = { quill: 'w', rook: 'e' };   // terminals are labelled beyond their ends
  const order = [...ids].sort((a, b) => ST[b].lines.length - ST[a].lines.length);
  for (const id of order) { if (ch[id]) continue; let best = null, bc = 1e9; for (const d of allowed(id)) { const c = cost(id, d, ch); if (c < bc) { bc = c; best = d; } } ch[id] = best; }
  for (let sweep = 0; sweep < 12; sweep++) for (const id of order) {
    if (id === 'quill' || id === 'rook') continue;
    let best = ch[id], bc = cost(id, ch[id], ch);
    for (const d of allowed(id)) { const c = cost(id, d, ch); if (c < bc - 1e-9) { bc = c; best = d; } }
    ch[id] = best;
  }
  if (process.env.DBG) for (const d of allowed(process.env.DBG)) console.log(d, cost(process.env.DBG, d, ch));
  const bad = ids.filter(id => cost(id, ch[id], ch) >= 100);
  return { ch, info, bad, total: ids.reduce((a, id) => a + cost(id, ch[id], ch), 0) };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { ch, bad, total } = placeAll();
  fs.writeFileSync(path.join(D, 'labels.json'), JSON.stringify(ch, null, 1));
  console.log('labels placed:', Object.keys(ch).length, 'cost', total, bad.length ? 'PROBLEMS: ' + bad.map(b => b + ':' + ch[b]).join(' ') : 'no collisions');
  process.exit(bad.length ? 1 : 0);
}
