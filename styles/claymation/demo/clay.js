// Clay engine: noise-displaced lumps, rolled worms, procedural fingerprint height map, clay material.
// Every surface is world-anchored: bump is triplanar in object space (no UV stretch), shape noise is baked
// into the geometry. `boil(k)` re-seeds the silhouette noise per held drawing (stop-motion "boiling").
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- seeded value noise (CPU) ----------
const ih = (x, y, z, s) => {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(s, 2147483647 | 0);
  n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16; return (n >>> 0) / 4294967296;
};
export function vn(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let fx = x - xi, fy = y - yi, fz = z - zi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  return L(
    L(L(ih(xi, yi, zi, s), ih(xi + 1, yi, zi, s), fx), L(ih(xi, yi + 1, zi, s), ih(xi + 1, yi + 1, zi, s), fx), fy),
    L(L(ih(xi, yi, zi + 1, s), ih(xi + 1, yi, zi + 1, s), fx), L(ih(xi, yi + 1, zi + 1, s), ih(xi + 1, yi + 1, zi + 1, s), fx), fy), fz);
}
export function fbm(x, y, z, s = 0, oct = 3) {
  let a = .5, f = 1, sum = 0;
  for (let i = 0; i < oct; i++) { sum += a * (vn(x * f, y * f, z * f, s + i * 31) * 2 - 1); a *= .5; f *= 2.03; }
  return sum;
}

// ---------- fingerprint / dent height texture ----------
// One tile holds a few whorl and loop prints at random angles on a smooth field with pits and a scratch or two.
export function printTexture(seed = 3, size = 1024) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data;
  let st = seed * 9301 + 49297; const rnd = () => ((st = (st * 9301 + 49297) % 233280) / 233280);
  const prints = [];
  const N = 5;
  for (let i = 0; i < N; i++) prints.push({ x: (.15 + .7 * ((i * .618 + .1) % 1)) * size, y: (.15 + .7 * ((i * .382 + rnd() * .2) % 1)) * size, a: rnd() * 6.28, rx: size * (.13 + rnd() * .04), ry: size * (.16 + rnd() * .04), f: 11 + rnd() * 3, w: rnd() * .7 + .3, s: rnd() * 99 });
  const H = new Float32Array(size * size);
  for (const p of prints) {
    const R = Math.max(p.rx, p.ry) * 1.3, ca = Math.cos(p.a), sa = Math.sin(p.a);
    for (let y = Math.max(0, p.y - R | 0); y < Math.min(size, p.y + R); y++) for (let x = Math.max(0, p.x - R | 0); x < Math.min(size, p.x + R); x++) {
      const dx = x - p.x, dy = y - p.y, u = (dx * ca + dy * sa) / p.rx, v = (-dx * sa + dy * ca) / p.ry;
      const warp = fbm(x * .008, y * .008, p.s, 7, 2) * .22;
      const r = Math.hypot(u, v * 1.0) + warp, th = Math.atan2(v, u);
      const mask = 1 - Math.min(1, Math.max(0, (r - .72) / .28));
      if (mask <= 0) continue;
      // whorl: concentric rings with an angular twist; loop: arches (blend by p.w)
      const phase = r * p.f + p.w * (th / 6.2832) * 2 + (1 - p.w) * (v * v * 1.5);
      const ridge = Math.pow(.5 + .5 * Math.cos(phase * 6.2832), 1.4);
      const broken = .75 + .25 * vn(x * .09, y * .09, p.s, 2);
      H[y * size + x] = Math.max(H[y * size + x], ridge * broken * mask * Math.min(1, mask * 2.2));
    }
  }
  // soft pits and thumb dents on the smooth field
  for (let i = 0; i < 90; i++) {
    const x = rnd() * size, y = rnd() * size, r = 3 + rnd() * rnd() * 16, a = .25 + rnd() * .5;
    for (let yy = Math.max(0, y - r - 2 | 0); yy < Math.min(size, y + r + 2); yy++) for (let xx = Math.max(0, x - r - 2 | 0); xx < Math.min(size, x + r + 2); xx++) {
      const q = Math.hypot(xx - x, yy - y) / r; if (q < 1) H[yy * size + xx] -= a * (1 - q) * (1 - q) * .8;
    }
  }
  // two hair-thin scratches
  for (let k = 0; k < 4; k++) {
    let x = rnd() * size, y = rnd() * size, a = rnd() * 6.28; const len = 40 + rnd() * 120;
    for (let i = 0; i < len; i++) { x += Math.cos(a); y += Math.sin(a); a += (rnd() - .5) * .15; const xi = (((x | 0) % size) + size) % size, yi = (((y | 0) % size) + size) % size; H[yi * size + xi] -= .35; }
  }
  for (let i = 0; i < size * size; i++) { const v = Math.max(0, Math.min(1, .5 + H[i] * .5)) * 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// one big clear whorl: the maker's signature, stamped on a surface
export function stampTexture(size = 512) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x / size - .5) * 2, v = (y / size - .5) * 2.2, warp = fbm(x * .012, y * .012, 3, 5, 2) * .16;
    const r = Math.hypot(u * 1.05, v) + warp, th = Math.atan2(v, u), mask = 1 - Math.min(1, Math.max(0, (r - .78) / .2));
    const ridge = Math.pow(.5 + .5 * Math.cos((r * 9.5 + .5 * th / 6.2832) * 6.2832), 1.3) * (.8 + .2 * vn(x * .08, y * .08, 1, 2));
    const val = Math.max(0, Math.min(1, .5 + (mask > 0 ? (ridge - .5) * .9 * Math.min(1, mask * 2.5) : 0))) * 255;
    const i = (y * size + x) * 4; d[i] = d[i + 1] = d[i + 2] = val; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; return t;
}

// ---------- clay material ----------
const U = { uBoil: { value: new THREE.Vector3() } };   // shared: fingerprints and grain shimmer a little per drawing
export function setBoil(k) { U.uBoil.value.set(Math.cos(k * 2.399) * .012, Math.sin(k * 1.713) * .012, Math.cos(k * 1.1) * .012); }
let PRINT = null, STAMP = null;

export function clayMat(o = {}) {
  PRINT = PRINT || printTexture(7); STAMP = STAMP || stampTexture();
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, vertexColors: true, roughness: o.rough ?? .62, metalness: 0,
    clearcoat: o.coat ?? .2, clearcoatRoughness: .45, sheen: o.sheen ?? .55, sheenRoughness: .55,
    sheenColor: new THREE.Color(o.sheenColor ?? 0xffe9d2), envMapIntensity: .8,
  });
  const stamp = o.stamp ? new THREE.Vector4(...o.stamp) : new THREE.Vector4(0, 0, 0, 0);
  const fing = o.fing ?? 1, pscale = o.pscale ?? .33, hu = o.hu ?? .045, rough = o.roughness ?? 1;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U, { tPrint: { value: PRINT }, uPS: { value: pscale }, uFing: { value: fing }, uHU: { value: hu }, uRgh: { value: rough }, uStamp: { value: stamp }, tStamp: { value: STAMP } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vON;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position; vON = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vOP; varying vec3 vON; uniform sampler2D tPrint; uniform vec3 uBoil; uniform float uPS, uFing, uHU, uRgh; uniform vec4 uStamp; uniform sampler2D tStamp;
float cH = 0.;
float h31(vec3 p){ p = fract(p*.1031); p += dot(p, p.zyx + 31.32); return fract((p.x+p.y)*p.z); }
float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x), f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x), f.y), f.z); }
float clayH(vec3 p, vec3 n){
  vec3 p0 = p; p += uBoil;
  vec3 w = pow(abs(n), vec3(5.)); w /= (w.x + w.y + w.z);
  vec3 q = (p + (vec3(vn3(p*1.7), vn3(p*1.7+3.), vn3(p*1.7+6.)) - .5) * .5) * uPS;
  float pm = smoothstep(.28, .62, vn3(p*.9 + 7.)*.6 + vn3(p*2.3)*.4);
  float fp = texture2D(tPrint, q.yz).r * w.x + texture2D(tPrint, q.xz + .37).r * w.y + texture2D(tPrint, q.xy + .71).r * w.z;
  float h = (fp - .5) * 1.5 * uFing * mix(.2, 1., pm);
  h += ((vn3(p*3.1)-.5)*.55 + (vn3(p*9.)-.5)*.3 + (vn3(p*31.)-.5)*.14 + (vn3(p*83.)-.5)*.06) * uRgh;
  h -= smoothstep(.88, 1., vn3(p*21. + 5.)) * .7 * uRgh;
  if (uStamp.w > 0.) { vec3 d = p0 - uStamp.xyz; float st = 1. - smoothstep(uStamp.w * .6, uStamp.w, length(d));
    vec2 uv = d.zy / (2. * uStamp.w) + .5; h = mix(h, (texture2D(tStamp, uv).r - .5) * 3.2, st * .85); }
  return h;
}
vec3 perturbC(vec3 sp, vec3 sn, vec2 dh, float fd){
  vec3 sx = dFdx(sp), sy = dFdy(sp); vec3 r1 = cross(sy, sn), r2 = cross(sn, sx);
  float det = dot(sx, r1) * fd; vec3 g = sign(det) * (dh.x * r1 + dh.y * r2);
  return normalize(abs(det) * sn - g);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
cH = clayH(vOP, normalize(vON));
{ float sp = smoothstep(.9, .985, vn3(vOP*61. + 3.)); float v = vn3(vOP*14.);
  diffuseColor.rgb *= (1. - .1*(v-.5)) * (1. - .28*sp) * (.9 + .2*clamp(cH*1.2 + .5, 0., 1.)); }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{ vec2 dh = vec2(dFdx(cH), dFdy(cH)) * uHU; normal = perturbC(-vViewPosition, normal, dh, faceDirection); }`);
  };
  m.customProgramCacheKey = () => 'clay' + (stamp.w > 0 ? 'S' : '') + fing + '_' + pscale + '_' + hu + '_' + rough;
  return m;
}

// ---------- geometry ----------
const BASE = (() => { const g = new THREE.SphereGeometry(1, 120, 84); g.deleteAttribute('uv'); g.deleteAttribute('normal'); return mergeVertices(g, 1e-5); })();
const sp = (w, e) => Math.sign(w) * Math.pow(Math.abs(w), e);
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// o: r [rx,ry,rz], e1 (vertical squareness 1=round .2=boxy), e2 (horizontal), amp, freq, seed, boil,
//    c1, c2 (marbled), marble (0..1), mfreq, bump: optional (x,y,z)->scale for local bulges
export function lumpGeo(o) {
  const g = BASE.clone(), P = g.attributes.position, n = P.count, col = new Float32Array(n * 3);
  const [rx, ry, rz] = o.r, e1 = o.e1 ?? 1, e2 = o.e2 ?? 1, amp = o.amp ?? .035, fq = o.freq ?? 1.6, sd = o.seed ?? 1;
  const b = o.boil || 0, bx = Math.cos(b * 2.1) * .05 * (o.boilAmt ?? 1), by = Math.sin(b * 1.7) * .05 * (o.boilAmt ?? 1), bz = Math.cos(b * 1.3 + 1) * .05 * (o.boilAmt ?? 1);
  const c1 = new THREE.Color(o.c1 ?? 0xe8cf9e), c2 = new THREE.Color(o.c2 ?? o.c1 ?? 0xe8cf9e), tmp = new THREE.Color();
  const mark = o.marble ?? .5, mf = o.mfreq ?? 1.2;
  const sc = Math.max(rx, ry, rz);
  for (let i = 0; i < n; i++) {
    const ux = P.getX(i), uy = P.getY(i), uz = P.getZ(i);
    const phi = Math.asin(Math.max(-1, Math.min(1, uy))), th = Math.atan2(uz, ux), cp = Math.cos(phi);
    const x = sp(cp, e1) * sp(Math.cos(th), e2), y = sp(Math.sin(phi), e1), z = sp(cp, e1) * sp(Math.sin(th), e2);
    // noise is sampled in the object's own scale so big objects get big lumps and small ones small
    const nx = x * rx * fq / sc * 2.2 + bx, ny = y * ry * fq / sc * 2.2 + by, nz = z * rz * fq / sc * 2.2 + bz;
    let d = 1 + amp * fbm(nx + sd, ny, nz, sd, 3) + amp * .35 * fbm(nx * 3.1 + 7, ny * 3.1, nz * 3.1 + sd, sd + 5, 2);
    if (o.bump) d *= o.bump(x, y, z);
    const px = x * rx * d, py = y * ry * d, pz = z * rz * d;
    P.setXYZ(i, px, py, pz);
    const m = sstep(-.18, .22, fbm(px * mf + sd * 3, py * mf, pz * mf, sd + 11, 3)) * mark;
    tmp.copy(c1).lerp(c2, m); const v = 1 + .06 * fbm(px * 4, py * 4, pz * 4 + sd, 3, 2);
    col[i * 3] = tmp.r * v; col[i * 3 + 1] = tmp.g * v; col[i * 3 + 2] = tmp.b * v;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

// A rolled clay worm along points; radius function r(u) with rounded ends.
export function wormGeo(pts, rad, o = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', .5);
  const S = o.seg ?? 56, R = o.radial ?? 18, frames = curve.computeFrenetFrames(S, false);
  const pos = [], col = [], idx = [];
  const c1 = new THREE.Color(o.c1 ?? 0xcc6a4a), c2 = new THREE.Color(o.c2 ?? o.c1 ?? 0xcc6a4a), tmp = new THREE.Color();
  const sd = o.seed ?? 1, amp = o.amp ?? .05;
  for (let i = 0; i <= S; i++) {
    const u = i / S, p = curve.getPointAt(u), N = frames.normals[i], B = frames.binormals[i];
    const cap = Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, Math.abs(u * 2 - 1) - (1 - (o.cap ?? .08) * 2)) / ((o.cap ?? .08) * 2), 2)));
    for (let j = 0; j < R; j++) {
      const a = j / R * 6.2832, ca = Math.cos(a), sa = Math.sin(a);
      const r = (typeof rad === 'function' ? rad(u) : rad) * cap * (1 + amp * fbm(p.x * 3 + sd, p.y * 3 + (o.boil || 0) * .05, p.z * 3 + a, sd, 2));
      const q = [p.x + (N.x * ca + B.x * sa) * r, p.y + (N.y * ca + B.y * sa) * r, p.z + (N.z * ca + B.z * sa) * r];
      pos.push(...q);
      tmp.copy(c1).lerp(c2, sstep(-.2, .2, fbm(q[0] * 1.4 + sd, q[1] * 1.4, q[2] * 1.4, sd + 3, 2)));
      col.push(tmp.r, tmp.g, tmp.b);
    }
  }
  for (let i = 0; i < S; i++) for (let j = 0; j < R; j++) { const a = i * R + j, b = i * R + (j + 1) % R, c = (i + 1) * R + j, d = (i + 1) * R + (j + 1) % R; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// A mesh whose geometry can be rebuilt per drawing (boil). kind 'lump' | 'worm'.
export class Clay extends THREE.Mesh {
  constructor(kind, spec, mat) {
    super(new THREE.BufferGeometry(), mat); this.kind = kind; this.spec = spec; this.castShadow = true; this.receiveShadow = true; this.build(0);
  }
  build(k) {
    const old = this.geometry; const s = { ...this.spec, boil: k };
    this.geometry = this.kind === 'lump' ? lumpGeo(s) : wormGeo(s.pts, s.rad, s); old.dispose();
    return this;
  }
}
export const lump = (spec, mat) => new Clay('lump', spec, mat);
export const worm = (spec, mat) => new Clay('worm', spec, mat);
