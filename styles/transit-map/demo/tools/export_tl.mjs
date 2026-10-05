// timeline.js (+ network.js) → timeline.json for mix.py and cuecheck.py.
// usage: node styles/transit-map/demo/tools/export_tl.mjs <workdir>
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = path.resolve(process.argv[2] || D);
const TL = await import(path.join(D, 'timeline.js'));
const N = await import(path.join(D, 'network.js'));
// length (grid units) of each journey leg, walked along the diagram waypoints
const legLen = N.ROUTE.map(r => {
  const L = N.lineById(r.line), n = L.wps.length; let i = L.wps.findIndex(w => w.st === r.from), j = L.wps.findIndex(w => w.st === r.to), len = 0;
  for (let k = 0; k < n + 1 && i !== j; k++) { const a = L.wps[i].u, b = L.wps[(i + 1) % n].u; len += Math.hypot(b[0] - a[0], b[1] - a[1]); i = (i + 1) % n; }
  return +len.toFixed(3);
});
const ids = TL.VO.map(v => ({ id: v.id, t: v.t, text: v.text }));
fs.writeFileSync(path.join(W, 'timeline.json'), JSON.stringify({ BPM: TL.BPM, BEAT: TL.BEAT, BAR: TL.BAR, DUR: TL.DUR, T: TL.T, EV: TL.events(), VO: ids, LEGS: TL.LEGS, legLen }, null, 1));
console.log('timeline.json →', W, TL.VO.length, 'voice lines, journey legs (units):', legLen.join(' / '));
