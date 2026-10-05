// Needle-felted wool: the shell-fuzz material, blob / tube / lathe geometry, and ribbon wisps.
// The surface is a base skin plus N shells pushed out along the normal; each shell keeps only the texels whose
// fibre height reaches it, so the surface is matted fibre with a halo of loose ends. Fibres are drawn once into a
// tileable texture (random direction for matted wool, parallel for roving), so a fibre keeps its direction.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry, hash } from '/core/lib.js';

// ---------------- fibre textures ----------------
// R = tone of this fibre (also decides which wool it is when two colours are blended), G = height ramp along the fibre, B = coverage
export function fibreTexture({ kind = 'matted', size = 512, seed = 1, count } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, size, size);
  g.globalCompositeOperation = 'lighten'; g.lineCap = 'round';
  const R = mulberry(seed), n = count || (kind === 'matted' ? 5200 : 6500);
  for (let i = 0; i < n; i++) {
    const x = R() * size, y = R() * size;
    const len = kind === 'matted' ? 10 + R() * R() * 46 : 50 + R() * 170;
    const ang = kind === 'matted' ? R() * Math.PI * 2 : (R() - .5) * (R() < .15 ? .9 : .22) + (R() < .5 ? 0 : Math.PI);
    const bend = (R() - .5) * (kind === 'matted' ? 1.4 : .35) * len * .5;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const x2 = x + dx * len, y2 = y + dy * len, mx = (x + x2) / 2 - dy * bend, my = (y + y2) / 2 + dx * bend;
    const tone = Math.floor(40 + R() * 215), hmax = kind === 'matted' ? .35 + .65 * R() * R() : .5 + .5 * R();
    const gr = g.createLinearGradient(x, y, x2, y2);
    gr.addColorStop(0, `rgb(${tone},0,255)`); gr.addColorStop(1, `rgb(${tone},${Math.floor(255 * hmax)},255)`);
    g.strokeStyle = gr; g.lineWidth = kind === 'matted' ? .7 + R() * 1.0 : .8 + R() * .9;
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      const minx = Math.min(x, x2, mx) + ox, maxx = Math.max(x, x2, mx) + ox, miny = Math.min(y, y2, my) + oy, maxy = Math.max(y, y2, my) + oy;
      if (maxx < -2 || minx > size + 2 || maxy < -2 || miny > size + 2) continue;
      g.save(); g.translate(ox, oy); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my, x2, y2); g.stroke(); g.restore();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

// ---------------- shell material ----------------
const NOISE = `
float h31(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(mix(h31(i), h31(i+vec3(1,0,0)), f.x), mix(h31(i+vec3(0,1,0)), h31(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i+vec3(0,0,1)), h31(i+vec3(1,0,1)), f.x), mix(h31(i+vec3(0,1,1)), h31(i+vec3(1,1,1)), f.x), f.y), f.z); }
`;
const VERT = `
uniform float uN, uLen, uSeed, uLump, uWScale, uWob, uCurl;
uniform vec3 uGrav;
uniform vec4 uPoke[6];
uniform float uPokeR;
varying vec3 vPos, vN, vW;
varying vec2 vUv;
varying float vL, vLenK;
${NOISE}
void main(){
  float L = float(gl_InstanceID) / (uN - 1.);
  vec3 p = position, n = normalize(normal);
  // lumpy cloud shape (vertex noise) and the maker's wobble, re-seeded on every drawing
  float lump = (vn(p * 1.1 + 3.7) - .5) * 2.;
  p += n * uLump * lump;
  p += n * uWob * (vn(p * 2.3 + uSeed * 7.31) - .5);
  float dent = 0.;
  for (int i = 0; i < 6; i++) { float d = distance(position, uPoke[i].xyz); dent += uPoke[i].w * exp(-d*d / (uPokeR*uPokeR)); }
  p -= n * dent;
  vPos = position; vUv = uv;
  float lk = .55 + .9 * vn(position * 1.7 + 11.);       // clumps of longer fibre
  vLenK = lk;
  float len = uLen * lk;
  vec3 cv = vec3(vn(position * 2.7 + 1.3), vn(position * 2.7 + 7.1), vn(position * 2.7 + 13.9)) - .5;
  p += n * len * L + uGrav * len * L * L + cv * len * L * L * uCurl * (1.2 + 3. * (vLenK - .55));
  vL = L; vN = n;
  vec4 wp = modelMatrix * vec4(p, 1.);
  vW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const FRAG = `
uniform sampler2D uTex, uTex2;
uniform float uTile, uWScale, uSeed, uSolid, uFuzz, uMode, uSheen, uAoY, uMottle, uBlendSoft, uPatchOn;
uniform vec2 uUvScale;
uniform vec3 uCol, uCol2, uTip, uLamp, uLampCol, uSky, uGround, uCam, uPatchC, uPatchAx;
uniform float uPatchR, uPatchNoise;
uniform mat3 uNormalMat;
varying vec3 vPos, vN, vW;
varying vec2 vUv;
varying float vL, vLenK;
${NOISE}
vec3 samp(sampler2D t, vec3 pp, vec2 uvc, vec3 w){
  if (uMode > .5) return texture2D(t, uvc).rgb;
  vec3 s = vec3(0.);
  if (w.x > .08) s += w.x * texture2D(t, pp.yz).rgb;
  if (w.y > .08) s += w.y * texture2D(t, pp.xz).rgb;
  if (w.z > .08) s += w.z * texture2D(t, pp.xy).rgb;
  return s / (w.x + w.y + w.z + 1e-4);   // weights below .08 dropped, the rest renormalised
}
void main(){
  float L = vL;
  vec3 nO = normalize(vN);
  vec3 w = pow(abs(nO), vec3(5.)); w /= (w.x + w.y + w.z);
  vec3 pp = vPos * uWScale * uTile + vec3(uSeed * .0021, uSeed * .0037, uSeed * .0013);
  vec2 uvc = vUv * uUvScale + vec2(uSeed * .002, uSeed * .003);
  vec3 a = samp(uTex, pp, uvc, w);
  vec3 b = samp(uTex2, pp * .37 + 5.3, uvc * .37 + .5, w);
  float hgt = max(a.g, b.g * .85) * vLenK * uFuzz;
  float tone = a.b > .5 ? a.r : b.r;
  // base skin is the L=0 shell: for airy wool only part of it is there
  float cov = max(a.b, b.b);
  float nz = vn(vPos * uWScale * 3.1 + 2.);
  if (L < .001) { if (uSolid < .999 && (nz * .6 + .4 * (1. - cov)) > uSolid) discard; }
  else { if (hgt < L) discard; if (uSolid < .999 && nz > uSolid * 1.4 + .15) discard; }
  // colour: each fibre belongs to one wool; two wools blend fibre by fibre
  vec3 col = uCol;
  if (uPatchOn > .5) {
    float d = length((vPos - uPatchC) * uPatchAx) / uPatchR;
    d += (vn(vPos * 2.2 + 9.) - .5) * uPatchNoise;
    float pw = 1. - smoothstep(1. - uBlendSoft, 1. + uBlendSoft, d);      // 1 inside the patch
    float r = fract(tone * 7.13 + nz * .5);
    float pick = smoothstep(r - .12, r + .12, pw);
    col = mix(uCol, uCol2, pick);
  }
  float mott = (vn(vPos * uWScale * .9 + 17.) - .5) * uMottle + (tone - .5) * .34;
  col *= 1. + mott;
  col = mix(col * .62, col * 1.04, smoothstep(0., .9, L + .25)) ;       // roots darker, ends catch the light
  col = mix(col, uTip, L * .22);
  // light: one lamp, wrapped diffuse, hemisphere fill, fuzz sheen at grazing angles
  vec3 nW = normalize(uNormalMat * nO);
  vec3 V = normalize(uCam - vW), Ld = uLamp - vW; float dist = length(Ld); Ld /= dist;
  vec3 nL = normalize(mix(nW, Ld, L * .5));                             // loose ends are lit from every side
  float wrap = .5;
  float dif = clamp((dot(nL, Ld) + wrap) / (1. + wrap), 0., 1.);
  float att = 1. / (1. + dist * dist * .0011);
  vec3 amb = mix(uGround, uSky, nW.y * .5 + .5);
  float ao = mix(.45, 1., smoothstep(.0, uAoY, vW.y)) ;
  float rim = pow(clamp(1. - dot(nW, V), 0., 1.), 2.6) * (.25 + L) * uSheen;
  float back = pow(max(dot(V, -Ld), 0.), 2.) * L * .3;
  vec3 lit = col * (uLampCol * dif * att + amb * ao) + uLampCol * att * (rim + back) * mix(vec3(1.), col, .5);
  if (any(isnan(lit)) || any(isinf(lit))) lit = col * .5;
  gl_FragColor = vec4(lit, 1.);
}`;

const col3 = c => new THREE.Color(c);
export const shared = { tex: null, tex2: null, texR: null, texR2: null };
export function initWool() {
  shared.tex = fibreTexture({ kind: 'matted', seed: 11 }); shared.tex2 = fibreTexture({ kind: 'matted', seed: 29, count: 3600 });
  shared.texR = fibreTexture({ kind: 'aligned', seed: 41 }); shared.texR2 = fibreTexture({ kind: 'aligned', seed: 53, count: 4000 });
}
export const LIGHT = {
  lamp: new THREE.Vector3(-22, 30, 20), lampCol: new THREE.Color(1, .86, .68).multiplyScalar(2.0),
  sky: new THREE.Color(.20, .15, .12), ground: new THREE.Color(.26, .16, .09), cam: new THREE.Vector3(),
};

// opts: color, color2, tip, len (cm), shells, fuzz, solid, tile (texels per cm), mode ('tri'|'uv'), uv:[uScale,vScale], sheen, mottle
export function woolMaterial(o = {}) {
  const roving = o.mode === 'uv';
  const u = {
    uN: { value: o.shells || 22 }, uLen: { value: o.len ?? .28 }, uSeed: { value: 0 }, uLump: { value: 0 }, uWob: { value: .012 }, uCurl: { value: o.curl ?? .3 }, uWScale: { value: 1 },
    uGrav: { value: new THREE.Vector3(0, -.05, 0) }, uPoke: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 0, 0)) }, uPokeR: { value: .55 },
    uTex: { value: roving ? shared.texR : shared.tex }, uTex2: { value: roving ? shared.texR2 : shared.tex2 },
    uTile: { value: o.tile ?? .5 }, uUvScale: { value: new THREE.Vector2(...(o.uv || [1, 1])) }, uMode: { value: roving ? 1 : 0 },
    uSolid: { value: 1 }, uFuzz: { value: o.fuzz ?? 1 }, uSheen: { value: o.sheen ?? .5 }, uAoY: { value: 1.6 }, uMottle: { value: o.mottle ?? .22 },
    uCol: { value: col3(o.color || 0xcfc3ae) }, uCol2: { value: col3(o.color2 || 0xc26b4a) }, uTip: { value: col3(o.tip || 0xffffff) },
    uBlendSoft: { value: .08 }, uPatchOn: { value: 0 }, uPatchC: { value: new THREE.Vector3() }, uPatchAx: { value: new THREE.Vector3(1, 1, 1) }, uPatchR: { value: 1 }, uPatchNoise: { value: .5 },
    uLamp: { value: LIGHT.lamp }, uLampCol: { value: LIGHT.lampCol }, uSky: { value: LIGHT.sky }, uGround: { value: LIGHT.ground }, uCam: { value: LIGHT.cam },
    uNormalMat: { value: new THREE.Matrix3() },
  };
  const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, side: THREE.FrontSide });
  m.userData.u = u;
  return m;
}

// a woolly mesh: geometry drawn N times (one instance per shell)
export function woolMesh(geo, mat) {
  const ig = new THREE.InstancedBufferGeometry(); ig.copy(geo); ig.instanceCount = mat.userData.u.uN.value;
  const mesh = new THREE.Mesh(ig, mat); mesh.frustumCulled = false; mesh.userData.wool = true;
  mesh.onBeforeRender = () => {
    const u = mat.userData.u; mesh.updateWorldMatrix(true, false);
    u.uNormalMat.value.getNormalMatrix(mesh.matrixWorld);
    // texture scale follows the world size of the mesh, so squashed or shrunk wool keeps its fibre size
    u.uWScale.value = new THREE.Vector3().setFromMatrixColumn(mesh.matrixWorld, 0).length();
    mat.uniformsNeedUpdate = true;
  };
  return mesh;
}
// the dents currently on this wool: [{p: Vector3 (local), d: depth}] (max 6)
export function setPokes(mat, list) {
  const a = mat.userData.u.uPoke.value;
  for (let i = 0; i < 6; i++) { const p = list[i]; if (p) a[i].set(p.p.x, p.p.y, p.p.z, p.d); else a[i].set(0, 0, 0, 0); }
}

// ---------------- geometry ----------------
function vnoise3(x, y, z, seed) {
  const f = (a) => a - Math.floor(a), sm = t => t * t * (3 - 2 * t);
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = sm(f(x)), yf = sm(f(y)), zf = sm(f(z));
  const H = (i, j, k) => hash(i * 7.1 + j * 13.7 + k * 3.3 + seed * 17.9);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(H(xi, yi, zi), H(xi + 1, yi, zi), xf), l(H(xi, yi + 1, zi), H(xi + 1, yi + 1, zi), xf), yf),
    l(l(H(xi, yi, zi + 1), H(xi + 1, yi, zi + 1), xf), l(H(xi, yi + 1, zi + 1), H(xi + 1, yi + 1, zi + 1), xf), yf), zf);
}
// a soft rounded volume: an ellipsoid with a gentle hand-made lumpiness
export function blobGeo(r = [1, 1, 1], { amp = .04, freq = 2.3, seed = 1, seg = 72 } = {}) {
  let g = new THREE.SphereGeometry(1, seg, Math.round(seg * .75));
  g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g, 1e-4);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const d = 1 + amp * ((vnoise3(v.x * freq + 5, v.y * freq + 5, v.z * freq + 5, seed) - .5) * 2 + .5 * (vnoise3(v.x * freq * 2.3, v.y * freq * 2.3, v.z * freq * 2.3, seed + 3) - .5));
    p.setXYZ(i, v.x * d * r[0], v.y * d * r[1], v.z * d * r[2]);
  }
  g.computeVertexNormals();
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(p.count * 2), 2));
  return g;
}
// a rolled worm of wool: a tube along a path with a radius profile
export function wormGeo(pts, radius = .3, { prof = u => 1, seg = 80, radial = 14, uvs } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curve, seg, 1, radial, false);
  const p = g.attributes.position, n = g.attributes.normal, per = radial + 1, v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, r = typeof radius === 'function' ? radius(u) : radius * prof(u), c = curve.getPointAt(u);
    for (let j = 0; j < per; j++) { const k = i * per + j; v.fromBufferAttribute(p, k).sub(c).normalize(); p.setXYZ(k, c.x + v.x * r, c.y + v.y * r, c.z + v.z * r); }
  }
  g.computeVertexNormals();
  g.userData.length = curve.getLength();
  return g;
}
// a shape of revolution (beak, tail): profile r(u) along the +Z axis, rounded at both ends
export function lathe(len, rfn, { seg = 48, rad = 40, amp = .02, seed = 3 } = {}) {
  const pts = [];
  for (let i = 0; i <= seg; i++) { const u = i / seg; pts.push(new THREE.Vector2(Math.max(rfn(u), 1e-3), u * len)); }
  let g = new THREE.LatheGeometry(pts, rad); g.rotateX(Math.PI / 2);   // axis along +Z
  g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g, 1e-4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = 1 + amp * (vnoise3(x * 2 + 4, y * 2 + 4, z * 2 + 4, seed) - .5) * 2; p.setXYZ(i, x * d, y * d, z); }
  g.computeVertexNormals();
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(p.count * 2), 2));
  return g;
}

// ---------------- wisps: loose fibres as camera-facing ribbons, rebuilt on the CPU every drawing ----------------
export class Wisps {
  constructor(max = 600, segs = 7) {
    this.max = max; this.segs = segs; this.n = 0;
    const V = max * (segs + 1) * 2;
    this.pos = new Float32Array(V * 3); this.col = new Float32Array(V * 4); this.uv = new Float32Array(V * 2);
    const idx = [];
    for (let c = 0; c < max; c++) for (let s = 0; s < segs; s++) { const a = (c * (segs + 1) + s) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(idx); this.geo = g;
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `attribute vec4 color; varying vec4 vC; varying vec2 vUv; void main(){ vC = color; vUv = uv; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.); }`,
      fragmentShader: `varying vec4 vC; varying vec2 vUv; void main(){ float a = 1. - abs(vUv.x * 2. - 1.); a = smoothstep(0., .8, a); gl_FragColor = vec4(vC.rgb * (.75 + .25 * a), vC.a * a); }`,
    }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._s = new THREE.Vector3();
  }
  reset() { this.n = 0; }
  // pts: array of Vector3 (segs+1), width in cm, rgb in 0..1 (linear), alpha
  add(pts, width, r, g, b, alpha, camPos) {
    if (this.n >= this.max) return;
    const c = this.n++, S = this.segs;
    for (let i = 0; i <= S; i++) {
      const p = pts[i], q = pts[Math.min(i + 1, S)], o = pts[Math.max(i - 1, 0)];
      this._a.copy(q).sub(o); this._b.copy(camPos).sub(p);
      this._s.crossVectors(this._a, this._b).normalize();
      const t = i / S, wv = width * .5 * (1 - .75 * t) * Math.min(1, (i + .6) / 1.2), fade = (1 - t * t) * Math.min(1, (i + .5) / 1.5);
      for (let k = 0; k < 2; k++) {
        const vi = (c * (S + 1) + i) * 2 + k, sg = k ? 1 : -1;
        this.pos[vi * 3] = p.x + this._s.x * wv * sg; this.pos[vi * 3 + 1] = p.y + this._s.y * wv * sg; this.pos[vi * 3 + 2] = p.z + this._s.z * wv * sg;
        this.col[vi * 4] = r; this.col[vi * 4 + 1] = g; this.col[vi * 4 + 2] = b; this.col[vi * 4 + 3] = alpha * fade;
        this.uv[vi * 2] = k; this.uv[vi * 2 + 1] = t;
      }
    }
  }
  commit() {
    // degenerate the unused curves
    for (let c = this.n; c < this.max; c++) for (let i = 0; i < (this.segs + 1) * 2; i++) { const vi = (c * (this.segs + 1)) * 2 + i; this.pos[vi * 3] = this.pos[vi * 3 + 1] = this.pos[vi * 3 + 2] = 0; this.col[vi * 4 + 3] = 0; }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true; this.geo.attributes.uv.needsUpdate = true;
  }
}
