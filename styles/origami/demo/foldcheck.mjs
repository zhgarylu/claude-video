// foldcheck: does a fold sequence ever push one facet through another?  node styles/origami/demo/foldcheck.mjs
// For sampled times, every pair of triangles from different facets is tested for a proper intersection
// (triangles shrunk 8 % about their centroid, so facets that merely meet along a hinge do not count).
import * as THREE from 'three';
import { halving, diagonal, fan, creaseSheet, strip } from './models.js';

function triTri(a, b) {   // Moller 1997
  const [p0, p1, p2] = a, [q0, q1, q2] = b;
  const N1 = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(p1, p0), new THREE.Vector3().subVectors(p2, p0));
  const d1 = -N1.dot(p0), du = [q0, q1, q2].map(q => N1.dot(q) + d1);
  if (du.every(x => x > 1e-9) || du.every(x => x < -1e-9)) return false;
  const N2 = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(q1, q0), new THREE.Vector3().subVectors(q2, q0));
  const d2 = -N2.dot(q0), dv = [p0, p1, p2].map(p => N2.dot(p) + d2);
  if (dv.every(x => x > 1e-9) || dv.every(x => x < -1e-9)) return false;
  const D = new THREE.Vector3().crossVectors(N1, N2); if (D.lengthSq() < 1e-24) return false;   // coplanar: ignore
  const ax = Math.abs(D.x) > Math.abs(D.y) ? (Math.abs(D.x) > Math.abs(D.z) ? 'x' : 'z') : (Math.abs(D.y) > Math.abs(D.z) ? 'y' : 'z');
  const interval = (P, dd) => {
    const pr = P.map(p => p[ax]), ts = [];
    for (let i = 0; i < 3; i++) { const j = (i + 1) % 3; if ((dd[i] > 0) !== (dd[j] > 0) && dd[i] !== dd[j]) ts.push(pr[i] + (pr[j] - pr[i]) * dd[i] / (dd[i] - dd[j])); }
    return ts.length < 2 ? null : [Math.min(...ts), Math.max(...ts)];
  };
  const I1 = interval([p0, p1, p2], dv), I2 = interval([q0, q1, q2], du);
  if (!I1 || !I2) return false;
  return Math.min(I1[1], I2[1]) - Math.max(I1[0], I2[0]) > 1e-7;
}

export function check(sheet, times, label) {
  sheet.build();
  let worst = 0;
  for (const t of times) {
    sheet.update(t);
    const { geo, vf } = sheet.mesh, P = geo.attributes.position.array, I = geo.index.array;
    const tris = [];
    vf.forEach((x, fi) => {
      for (let i = 0; i < I.length; i += 3) { if (I[i] < x.start || I[i] >= x.start + x.count) continue;
        const v = [0, 1, 2].map(k => new THREE.Vector3(P[I[i + k] * 3], P[I[i + k] * 3 + 1], P[I[i + k] * 3 + 2])), c = v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1 / 3);
        const sv = v.map(p => c.clone().add(p.clone().sub(c).multiplyScalar(.92)));
        const bb = new THREE.Box3().setFromPoints(sv).expandByScalar(1e-6); tris.push({ fi, sv, bb }); }
    });
    // sweep on x, then box test
    tris.sort((p, q) => p.bb.min.x - q.bb.min.x);
    let bad = 0, pairs = 0; const pc = {};
    for (let i = 0; i < tris.length; i++) for (let j = i + 1; j < tris.length && tris[j].bb.min.x <= tris[i].bb.max.x; j++) {
      if (tris[i].fi === tris[j].fi || !tris[i].bb.intersectsBox(tris[j].bb)) continue; pairs++;
      if (triTri(tris[i].sv, tris[j].sv)) { bad++; const k = vf[tris[i].fi].f.id + '/' + vf[tris[j].fi].f.id; pc[k] = (pc[k] || 0) + 1; }
    }
    worst = Math.max(worst, bad);
    console.log(`${label} t=${t.toFixed(2)} tris=${tris.length} boxPairs=${pairs} crossings=${bad}`, bad ? JSON.stringify(pc) : '');
  }
  return worst;
}

if (process.argv[2] === 'strip') { const r = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1)); const bd = check(strip(), r(.6, 4.2, 26), 'strip-fine') + check(strip({ seg: .012 }), [...r(4.2, 17.5, 60), ...r(17.5, 40, 100)], 'strip-coarse'); console.log(bd ? 'FAIL' : 'OK strip'); process.exit(bd ? 1 : 0); }
const range = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
let bad = 0;
const h3 = halving(3, { t0: .4, gap: 1.4, dur: 1 });
bad += check(h3, [...range(.4, 1.4, 6), ...range(1.8, 2.8, 6), ...range(3.2, 4.2, 9)], 'halving3');
bad += check(diagonal({ keys: [0, 1] }), range(0, 1, 7), 'diagonal');
bad += check(fan({ n: 6, w: .12 }), range(0, 1, 6), 'fan');
bad += check(creaseSheet(3), range(0, 5, 30), "crease3");
bad += check(creaseSheet(5, { unfoldDur: 3, corner: true }), range(0, 10.5, 90), 'crease5');
bad += check(halving(5, { t0: .3, gap: .9, dur: .7 }), range(.3, 5, 40), 'halving5');
console.log(bad ? 'FAIL: ' + bad + ' crossings' : 'OK: no polygons pass through each other');
process.exit(bad ? 1 : 0);
