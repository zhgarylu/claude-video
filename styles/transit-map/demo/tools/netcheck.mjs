// Network sanity: every segment 0/45/90 degrees, no sharp turns, stations on their lines, crossings only at interchanges.
// usage: node styles/transit-map/demo/tools/netcheck.mjs
import * as N from '../network.js';
const m = N.netcheck();
const n = Object.keys(N.ST).length, ic = Object.values(N.ST).filter(s => s.lines.length > 1).length;
console.log(`stations ${n}, interchanges ${ic}, waypoints ${N.LINES.map(l => l.id + ':' + l.wps.length).join(' ')}`);
// stations too close to a zone boundary
const pd = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t); };
for (const [nm, poly] of [['zone1', N.ZONE1], ['zone2', N.ZONE2]]) for (const s of Object.values(N.ST)) {
  let dmin = 9; for (let i = 0; i < poly.length; i++) dmin = Math.min(dmin, pd(s.p, poly[i], poly[(i + 1) % poly.length]));
  if (dmin < 0.45) m.push(`${s.id} is ${dmin.toFixed(2)} units from the ${nm} boundary`);
}
console.log(m.length ? m.join('\n') : 'network ok');
process.exit(m.length ? 1 : 0);
