// The Tide Flask, built from lathe profiles (cm). Six parts so the exploded view has something to pull apart.
import * as THREE from 'three';
import { mulberry } from '/core/lib.js';
import { brushedRoughness, leatherBump, leatherColor, glazeBump } from './textures.js';

export const COBALT = 0x1d46c7;
const V2 = (a) => a.map(p => new THREE.Vector2(p[0], p[1]));
const arc = (cx, cy, r, a0, a1, n = 8) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
// lathe UVs run by profile-point index; re-map v to centimetres (y / tile) so textures keep a true scale
const lathe = (pts, seg = 128, tile = 12) => { const g = new THREE.LatheGeometry(V2(pts), seg), pos = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setY(i, pos.getY(i) / tile); return g; };

export function makeMaterials() {
  const rough = brushedRoughness(), bump = leatherBump(), col = leatherColor(), glaze = glazeBump();
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xcfd2d6, metalness: 1, roughness: .36, roughnessMap: rough, anisotropy: .7, anisotropyRotation: Math.PI / 2, envMapIntensity: 1.0 });
  const steelIn = new THREE.MeshPhysicalMaterial({ color: 0xa9adb3, metalness: 1, roughness: .3, roughnessMap: rough, anisotropy: .6, anisotropyRotation: Math.PI / 2, side: THREE.DoubleSide });
  const leather = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: col, roughness: .62, metalness: 0, bumpMap: bump, bumpScale: 1.6, sheen: .6, sheenRoughness: .5, sheenColor: new THREE.Color(0xffd9a8), clearcoat: .08, clearcoatRoughness: .5 });
  const ceramic = new THREE.MeshPhysicalMaterial({ color: COBALT, roughness: .16, metalness: 0, clearcoat: 1, clearcoatRoughness: .04, bumpMap: glaze, bumpScale: .12, ior: 1.5, specularIntensity: 1 });
  const rubber = new THREE.MeshPhysicalMaterial({ color: 0x1a1b1d, roughness: .72, metalness: 0, sheen: .4, sheenRoughness: .6, sheenColor: new THREE.Color(0x889099) });
  const thread = new THREE.MeshStandardMaterial({ color: 0xcdbd9c, roughness: .9 });
  const water = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0, transmission: 1, ior: 1.45, thickness: 1.6, attenuationColor: new THREE.Color(0xa9bfcc), attenuationDistance: .9, specularIntensity: 1, clearcoat: 0 });
  return { steel, steelIn, leather, ceramic, rubber, thread, water };
}

// parts in assembled position; `rest` = centre height used for labels and the exploded offsets
export const PARTS = [
  // id, assembled y0..y1, exploded target y0
  { id: 'base', y0: 0, y1: 2.2, ey: 0 },
  { id: 'sleeve', y0: 3.6, y1: 13.6, ey: 6.4 },
  { id: 'body', y0: 2.2, y1: 25.2, ey: 21.0 },
  { id: 'liner', y0: 3.2, y1: 23.2, ey: 50.5 },
  { id: 'gasket', y0: 25.2, y1: 26.0, ey: 74.0 },
  { id: 'cap', y0: 25.3, y1: 31.3, ey: 78.0 },
];

function ribbon(curvePts, width, thick, n = 80, rr = .35) {
  const curve = new THREE.CatmullRomCurve3(curvePts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', .5);
  const prof = [];   // rounded rectangle in (w, t)
  const hw = width / 2, ht = thick / 2, r = Math.min(ht, hw) * rr * 2;
  const corner = (cx, cy, a0) => Array.from({ length: 5 }, (_, i) => { const a = (a0 + i * 22.5) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  prof.push(...corner(hw - r, ht - r, 0), ...corner(-hw + r, ht - r, 90), ...corner(-hw + r, -ht + r, 180), ...corner(hw - r, -ht + r, 270));
  const m = prof.length, pos = [], idx = [], uv = [];
  const Z = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = curve.getPoint(u), T = curve.getTangent(u).normalize(), N = new THREE.Vector3().crossVectors(Z, T).normalize();
    for (let k = 0; k < m; k++) { const q = prof[k]; pos.push(p.x + Z.x * q[0] + N.x * q[1], p.y + Z.y * q[0] + N.y * q[1], p.z + Z.z * q[0] + N.z * q[1]); uv.push(u * 1.7, k / m * .27); }
  }
  for (let i = 0; i < n; i++) for (let k = 0; k < m; k++) {
    const a = i * m + k, b = i * m + (k + 1) % m, c = (i + 1) * m + k, d = (i + 1) * m + (k + 1) % m;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

export function makeGeometries() {
  // body: outer wall, shoulder, neck lip, then the inner wall (faces the axis) down to the floor
  const body = [[0, 2.25], [3.9, 2.25], ...arc(3.9, 2.55, .3, 270, 360, 5).slice(1), [4.2, 19.4], [4.19, 20.2], [4.05, 21.0], [3.8, 21.8], [3.5, 22.6], [3.3, 23.3], [3.22, 24.0], [3.2, 24.9],
    [3.15, 25.0], [3.1, 25.05], [3.05, 25.0], [3.0, 24.9], [3.0, 24.0], [3.05, 23.3], [3.3, 22.5], [3.6, 21.7], [3.85, 20.8], [3.97, 20.0], [4.0, 19.2], [4.0, 2.5], [0, 2.5]];
  const sleeve = [[4.17, 3.6], [4.29, 3.6], ...arc(4.29, 3.78, .18, 270, 360, 4).slice(1), [4.47, 13.3], ...arc(4.29, 13.42, .18, 0, 90, 4).slice(1), [4.17, 13.6], [4.17, 3.6]];
  const base = [[0, 0], [3.8, 0], ...arc(3.8, .4, .4, 270, 360, 5).slice(1), [4.2, 1.7], ...arc(4.0, 1.9, .2, 0, 90, 4).slice(1), [3.9, 2.2], [0, 2.2]];
  const liner = [[0, 3.2], [2.5, 3.2], ...arc(2.5, 3.6, .4, 270, 360, 5).slice(1), [2.9, 24.6], [3.05, 24.7], [3.05, 25.0], [2.95, 25.05], [2.78, 25.0], [2.78, 3.6], [2.5, 3.4], [0, 3.4]];
    const gasket = [[2.8, 25.2], [3.05, 25.2], ...arc(3.05, 25.5, .25, 270, 450, 10).slice(1, -1), [3.05, 25.8], [2.8, 25.8], [2.8, 25.2]];
  // cap: ceiling, inner wall, underside, outer wall, grooves, domed top
  const cap = [[0, 28.3], [3.28, 28.3], [3.28, 25.3], [3.55, 25.3], [3.55, 28.1], [3.65, 28.1], [3.65, 28.5], [3.55, 28.5], [3.55, 29.3], [3.65, 29.3], [3.65, 29.7], [3.55, 29.7], [3.55, 30.4],
    ...arc(3.15, 30.4, .4, 0, 90, 5).slice(1), [2.5, 30.85], [1.8, 31.1], [.9, 31.25], [0, 31.3]];
    return {
    body: lathe(body, 160, 12), sleeve: lathe(sleeve, 160, 17), base: lathe(base, 128), liner: lathe(liner, 128, 12), gasket: lathe(gasket, 96), cap: lathe(cap, 160, 8),
    strap: ribbon([[-2.5, 29.6, 0], [-3.1, 32.6, 0], [-1.9, 35.9, 0], [0, 37.3, 0], [1.9, 35.9, 0], [3.1, 32.6, 0], [2.5, 29.6, 0]], 2.0, .38, 90),
  };
}

// stitches on the leather sleeve: two circumference rows and two vertical seam rows
export function stitchMatrices(seamAz = -52) {
  const r = mulberry(21), out = [], dummy = new THREE.Object3D();
  const put = (az, y, ang, len = .34) => {
    const a = az * Math.PI / 180, R = 4.47;
    dummy.position.set(R * Math.sin(a), y, R * Math.cos(a)); dummy.rotation.set(0, a, 0); dummy.rotateZ(ang); dummy.scale.set(len * .8, .035, .06); dummy.updateMatrix(); out.push(dummy.matrix.clone());
  };
  for (const y of [4.25, 12.95]) for (let i = 0; i < 54; i++) { const az = seamAz + 14 + i * (360 - 28) / 54; put(az, y + (r() - .5) * .02, (r() - .5) * .06, .36); }
  for (const dy of [-1, 1]) for (let i = 0; i < 17; i++) put(seamAz + dy * 3.0, 4.9 + i * .47 + (r() - .5) * .02, Math.PI / 2 + (r() - .5) * .06, .36);
  return out;
}

export function buildProduct(mat, geo, stitchM, opt = {}) {
  const root = new THREE.Group(), parts = {};
  const add = (id, g, m, extra) => { const grp = new THREE.Group(); const mesh = new THREE.Mesh(g, m); grp.add(mesh); if (extra) grp.add(extra); root.add(grp); parts[id] = grp; return grp; };
  add('base', geo.base, mat.rubber);
  const st = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6).rotateZ(Math.PI / 2), mat.thread, stitchM.length);
  stitchM.forEach((m, i) => st.setMatrixAt(i, m));
  const sl = add('sleeve', geo.sleeve, mat.leather, st);
  add('body', geo.body, mat.steel);
  add('liner', geo.liner, mat.steelIn);
  add('gasket', geo.gasket, mat.rubber);
  const capG = add('cap', geo.cap, mat.ceramic, new THREE.Mesh(geo.strap, mat.leather));
  // a pale index line on the cap so a turn can be read
  const mark = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.1, .12), mat.thread); mark.position.set(0, 28.9, 3.6); capG.add(mark);
  return { root, parts };
}

// condensation: squashed spheres on the steel. Returns the instanced mesh and an update(g, tt) that scales by growth.
export function makeDroplets(mat, count = 320, seed = 4) {
  const r = mulberry(seed), geo = new THREE.SphereGeometry(1, 20, 14);
  const mesh = new THREE.InstancedMesh(geo, mat.water, count), D = [];
  for (let i = 0; i < count; i++) {
    const upper = r() < 1, y = upper ? 14.2 + r() * 5.4 : 21 + r() * 3.2, big = r() < .12;
    const az = r() * 360, rad = (big ? .2 + r() * .13 : .035 + Math.pow(r(), 2.2) * .17);
    const late = r() < .4;   // these appear during the 24 h shot
    if (rad > .06 && az > 354 - 360 + 360 && false) continue;
    const azc = az > 180 ? az - 360 : az;
    if (rad > .07 && azc > -9 && azc < 26 && y > 14.2 && y < 19.5) continue;   // keep the macro frame clean
    D.push({ az, y, rad, birth: late ? 36 + r() * 5.2 : -10 });
  }
  const dummy = new THREE.Object3D();
  function update(t, hidePast = false) {
    for (let i = 0; i < D.length; i++) {
      const d = D[i], a = d.az * Math.PI / 180;
      const grow = Math.min(1, Math.max(0, (t - d.birth) / 1.4)), day = Math.min(1, Math.max(0, (t - 35.5) / 6.5));
      const s = d.rad * grow * (1 + .45 * day);
      const R = 4.2;
      dummy.position.set((R + s * .15) * Math.sin(a), d.y, (R + s * .15) * Math.cos(a)); dummy.rotation.set(0, a, 0);
      dummy.scale.set(s * (hidePast ? 0 : 1) + 1e-5, s * (1 + (d.rad > .2 ? .06 : 0)), (s * .62) + 1e-5); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { mesh, update, D };
}
