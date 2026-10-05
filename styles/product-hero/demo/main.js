// "Tide Flask": a product hero film in code. render(t) draws any frame, deterministically.
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, eo, mulberry } from '/core/lib.js';
import { makeMaterials, makeGeometries, stitchMatrices, buildProduct, makeDroplets, PARTS, COBALT } from './product.js';
import { SHOTS, CUTS, SWEEPS, REVEAL, EXPL, TYPE, DAY, EV, DUR } from './timeline.js';

const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(2); renderer.setSize(W, H); document.getElementById('stage').appendChild(renderer.domElement);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x151515);
const camera = new THREE.PerspectiveCamera(18, W / H, 2, 2400); scene.add(camera);
await document.fonts.load('300 100px Jost'); await document.fonts.load('500 30px Jost'); await document.fonts.load('200 100px Jost');

const col = (hex, k = 1) => { const c = new THREE.Color(hex); return c.multiplyScalar(k); };

// ---------------- the seamless backdrop (a cove) with its own light pool, contact shadow and floor veil ----------------
const BG = { base: col(0x8d8579), pool: col(0xd9d2c5), dark: col(0x3a3631) };
const cyc = (() => {
  const zf = -50, R = 190;
  const pts = [];
  for (let z = 700; z > zf; z -= 35) pts.push([0, z]);
  for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI / 2; pts.push([R * (1 - Math.cos(a)), zf - R * Math.sin(a)]); }
  for (let y = R + 60; y <= 900; y += 100) pts.push([y, zf - R]);
  const pos = [], idx = [], X = [-1400, 0, 1400];
  for (const [y, z] of pts) for (const x of X) pos.push(x, y, z);
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 2; k++) { const a = i * 3 + k, b = a + 1, c = a + 3, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const u = { uBase: { value: BG.base }, uPool: { value: BG.pool }, uDark: { value: BG.dark }, uSw: { value: new THREE.Vector3(0, 0, 0) }, uSh: { value: new THREE.Vector4(0, 0, 1, 0) }, uSh2: { value: new THREE.Vector4(0, 0, 1, 0) }, uK: { value: 1 }, uPoolC: { value: new THREE.Vector3(0, 40, -120) } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec3 vP; uniform vec3 uBase, uPool, uDark, uSw, uPoolC; uniform vec4 uSh, uSh2; uniform float uK;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec3 p = vP;
        vec3 d = (p - uPoolC) / vec3(230., 150., 300.);
        float l = exp(-dot(d, d));
        vec3 c = mix(uDark, uBase, smoothstep(0., .45, l)); c = mix(c, uPool, smoothstep(.35, 1., l));
        float wall = smoothstep(-50., -200., p.z);                 // 0 on the floor, 1 on the wall
        // a soft travelling band of light (the sweep, as it falls on the cove)
        float band = exp(-pow((p.x - uSw.x + (p.y - 40.) * .55) / 70., 2.)) * uSw.z;
        c += band * .18 * uPool * (.4 + .6 * wall);
        vec2 q = p.xz - uSh.xy; float s1 = exp(-dot(q, q) / (uSh.z * uSh.z)) * uSh.w;
        vec2 q2 = p.xz - uSh2.xy; float s2 = exp(-dot(q2, q2) / (uSh2.z * uSh2.z)) * uSh2.w;
        c *= 1. - clamp(s1 + s2, 0., .85) * (1. - wall);
        c *= uK;
        float a = mix(mix(.66, .985, smoothstep(0., 90., p.z)), 1., wall);
        c += (h(gl_FragCoord.xy) - .5) / 255.;                   // dither against banding
        gl_FragColor = vec4(c, a);
      }`,
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 2; return mesh;
})();
scene.add(cyc);

// out-of-focus lights behind the product: they exist only to become bokeh
const bokeh = (() => {
  const r = mulberry(33), grp = new THREE.Group(), geo = new THREE.CircleGeometry(1, 28);
  const tints = [0xfff3dc, 0xfff3dc, 0xffe6c0, 0xffedd2, 0xfff8ec, 0xffffff];
  for (let i = 0; i < 46; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col(tints[(r() * tints.length) | 0], .62 + r() * .55), transparent: false }));
    const side = r() < .5 ? -1 : 1, x = side * (60 + r() * 200), y = 25 + r() * 190;
    m.position.set(x, y, -118 - r() * 40); m.scale.setScalar(2.2 + r() * 3.4); grp.add(m);
  }
  return grp;
})();
scene.add(bokeh);

// ---------------- the studio rig as an environment map, rebuilt every frame ----------------
const envScene = new THREE.Scene(); envScene.background = new THREE.Color(0x0b0b0c);
const pm = new THREE.PMREMGenerator(renderer);
const emissive = () => new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
const box = (w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), emissive()); envScene.add(m); return m; };
const rig = {
  top: box(130, 130), bot: box(130, 130), key: box(46, 150), keyB: box(46, 150), fill: box(30, 130), fillB: box(30, 130),
  rimL: box(16, 160), rimR: box(16, 160), front: box(150, 90), sweep: box(9, 190), sweepB: box(9, 190),
};
let envRT = null;
function setEnv(camAz, I, sweepRel) {
  const place = (m, rel, y, R, k, tint = 0xffffff, tilt = null) => {
    const a = (camAz + rel) * Math.PI / 180; m.position.set(R * Math.sin(a), y, R * Math.cos(a)); m.lookAt(0, tilt ?? y * .4, 0);
    m.material.color.set(tint).multiplyScalar(k);
  };
  rig.top.position.set(0, 140, 0); rig.top.rotation.set(Math.PI / 2, 0, 0); rig.top.material.color.set(0xfff6ea).multiplyScalar(I.top);
  rig.bot.position.set(0, -140, 0); rig.bot.rotation.set(-Math.PI / 2, 0, 0); rig.bot.material.color.set(0xfff0e0).multiplyScalar(I.top * .55);
  place(rig.key, -50, 15, 130, I.key, 0xfff4e6); place(rig.keyB, -50, -15, 130, I.key, 0xfff4e6);
  place(rig.fill, 60, 15, 130, I.fill, 0xe6efff); place(rig.fillB, 60, -15, 130, I.fill, 0xe6efff);
  place(rig.rimL, -148, 20, 130, I.rim, 0xeaf1ff); place(rig.rimR, 148, 20, 130, I.rim, 0xfff0e0);
  place(rig.front, 0, 15, 140, I.front, 0xfff8f0);
  place(rig.sweep, sweepRel, 30, 120, I.sweep, 0xfffaf0); place(rig.sweepB, sweepRel, -30, 120, I.sweep, 0xfffaf0);
  const old = envRT; envRT = pm.fromScene(envScene, 0, 1, 1000); scene.environment = envRT.texture; if (old) old.dispose();
}

// ---------------- product (+ a mirrored twin under the floor for the reflection) ----------------
const mat = makeMaterials(), geo = makeGeometries(), stitches = stitchMatrices(40);
const P = buildProduct(mat, geo, stitches), Pm = buildProduct(mat, geo, stitches);
const Pw = new THREE.Group(); Pw.scale.y = -1; Pw.add(Pm.root);
scene.add(P.root, Pw);
const dro = makeDroplets(mat, 300); P.parts.body.add(dro.mesh);
// the lead drop of the opening shot
const lead = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), mat.water); P.parts.body.add(lead);
const LEAD_AZ = 7 * Math.PI / 180, LEAD_P = t => ss(seg(t, 1.5, 2.5)) * .30 + ss(seg(t, 3.1, 4.7)) * .70;
const leadY = t => 18.2 - 1.7 * LEAD_P(t);
// beads the lead drop leaves behind: they appear as it passes
const beads = (() => {
  const r = mulberry(77), out = [];
  for (let i = 0; i < 9; i++) {
    const y = 17.9 - i * .3 - r() * .1; let tb = 0; for (let t = 0; t < 5; t += .01) { if (leadY(t) <= y) { tb = t; break; } }
    out.push({ y, az: (7 + (r() - .5) * 1.8) * Math.PI / 180, rad: .03 + r() * .06, tb: tb + .05 });
  }
  return out;
})();
const beadMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), mat.water, beads.length); P.parts.body.add(beadMesh);

// part offsets for the exploded view
const OFF = {}; for (const p of PARTS) OFF[p.id] = p.ey - p.y0;
const PCEN = {}; for (const p of PARTS) PCEN[p.id] = (p.y0 + p.y1) / 2;
const PRAD = { cap: 3.7, gasket: 3.3, liner: 3.0, body: 4.2, sleeve: 4.5, base: 4.2 };
function explAmt(t) { return eo(seg(t, EXPL.out0, EXPL.out1)) * (1 - ss(seg(t, EXPL.back0, EXPL.back1)) ** 1) ; }
function applyParts(t) {
  const e = explAmt(t), tilt = .26 * e * ss(seg(t, EXPL.out0, EXPL.out1 + 1)), capRot = -Math.PI * eio(seg(t, 22.2, 23.8));
  const hover = seg(t, EXPL.out1 - 1, EXPL.back0);
  P.root.rotation.z = Pm.root.rotation.z = -tilt;
  for (const grp of [P, Pm]) {
    PARTS.forEach((p, i) => {
      const g = grp.parts[p.id], bob = Math.sin(t * 1.3 + i * 1.7) * .45 * e * (p.id === 'base' ? 0 : 1);
      g.position.set(0, OFF[p.id] * e + bob, 0);
      g.rotation.set(Math.sin(t * .9 + i) * .02 * e * hover, (i % 2 ? 1 : -1) * e * (.55 * (1 - hover * 0) ) * .3 + (p.id === 'cap' ? capRot : 0), Math.cos(t * .8 + i * 2) * .018 * e);
    });
  }
  return e;
}

// ---------------- post: grade + light-wipe reveal ----------------
const post = makePost(renderer, scene, camera, W, H, { ssaa: 2, ao: false });
post.bloom.strength = .1; post.bloom.radius = .6; post.bloom.threshold = 1.5;
post.vig.uniforms.amt.value = .42; post.vig.uniforms.warm.value = .12; post.vig.uniforms.contrast.value = .16; post.vig.uniforms.sat.value = 1.04;
const wipeShader = {
  uniforms: { tDiffuse: { value: null }, prog: { value: 1 }, glow: { value: new THREE.Vector3(1, .93, .82) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform float prog; uniform vec3 glow;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      if (prog < 1.) {
        float s = dot(vUv - .5, normalize(vec2(1., .38)));          // diagonal, light enters from the left
        float e = mix(-.42, .7, prog), w = .16;
        float lit = 1. - smoothstep(e - w, e + w * .35, s);
        float edge = exp(-pow((s - e + .02) / .05, 2.)) * (1. - prog * .6);
        c.rgb = c.rgb * mix(.04, 1., lit) + glow * edge * .55 * (.3 + .7 * min(1., dot(c.rgb, vec3(.33))));
      }
      gl_FragColor = c; }`,
};
const wipe = new ShaderPass(wipeShader);
post.composer.insertPass(wipe, 3);

// ---------------- camera ----------------
const D2R = Math.PI / 180;
const mixShot = (S, t) => {
  const u = eio(seg(t, S.t0, S.t1)), o = {};
  for (const k of Object.keys(S.a)) o[k] = Array.isArray(S.a[k]) ? S.a[k].map((v, i) => lerp(v, S.b[k][i], u)) : lerp(S.a[k], S.b[k], u);
  return o;
};
const shotAt = t => { let s = SHOTS[0]; for (const S of SHOTS) if (t >= S.t0) s = S; return s; };
const tmpV = new THREE.Vector3();
function setCamera(t, e) {
  const S = shotAt(t), c = mixShot(S, Math.min(t, S.t1));
  if (S.id === 'drop') c.tgt[1] = leadY(t) - .35;
  if (S.id === 'explode') { c.tgt[1] = 44 * e + 20 * (1 - e); c.tgt[0] = 11 * e; c.dist *= 1 - .45 * ss(seg(t, 33.4, 34.95)); }
  const az = c.az * D2R, el = c.el * D2R;
  camera.fov = c.fov; camera.aspect = W / H;
  camera.position.set(c.tgt[0] + c.dist * Math.sin(az) * Math.cos(el), c.tgt[1] + c.dist * Math.sin(el), c.tgt[2] + c.dist * Math.cos(az) * Math.cos(el));
  camera.up.set(0, 1, 0); camera.lookAt(c.tgt[0], c.tgt[1], c.tgt[2]);
  camera.clearViewOffset(); camera.setViewOffset(W, H, -c.shift * W, 0, W, H);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  return { S, c, az: c.az };
}
const hat = (t, c, hw) => clamp(1 - Math.abs(t - c) / hw);
function sweepRel(t) {
  if (t <= SWEEPS[0][0]) return SWEEPS[0][1];
  for (let i = 0; i < SWEEPS.length - 1; i++) { const a = SWEEPS[i], b = SWEEPS[i + 1]; if (t < b[0]) return lerp(a[1], b[1], ss((t - a[0]) / (b[0] - a[0]))); }
  return SWEEPS[SWEEPS.length - 1][1];
}

// ---------------- type and callouts ----------------
const ui = document.getElementById('ui'), svg = document.getElementById('svg');
const els = {}, NS = 'http://www.w3.org/2000/svg';
for (const it of TYPE) { const d = document.createElement('div'); d.className = 't ' + it.cls + (it.lt ? ' lt' : ''); d.textContent = it.text; ui.appendChild(d); els[it.id] = d; if (it.x != null) { d.style.left = it.x + 'px'; d.style.top = it.y + 'px'; } }
const mk = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); svg.appendChild(e); return e; };
const labLines = {}; for (const it of TYPE) if (it.part) labLines[it.id] = { line: mk('line', { stroke: '#181a1d', 'stroke-width': 1.5, opacity: 0 }), dot: mk('circle', { r: 5, fill: '#1d46c7', opacity: 0 }) };
// shot 6 day line
const dayG = mk('g', { opacity: 0 });
const dayBase = mk('line', { x1: DAY.x0, x2: DAY.x1, y1: DAY.y, y2: DAY.y, stroke: 'rgba(24,26,29,.35)', 'stroke-width': 2 });
const dayFill = mk('line', { x1: DAY.x0, x2: DAY.x0, y1: DAY.y, y2: DAY.y, stroke: '#1d46c7', 'stroke-width': 4 });
const dayDot = mk('circle', { r: 9, fill: '#1d46c7', cx: DAY.x0, cy: DAY.y });
const dayLabels = ['00', '06', '12', '18', '24'].map((s, i) => { const d = document.createElement('div'); d.className = 't dl'; d.textContent = s; d.style.left = (DAY.x0 + (DAY.x1 - DAY.x0) * i / 4 - 14) + 'px'; d.style.top = (DAY.y + 24) + 'px'; ui.appendChild(d); return d; });
const dayTicks = [0, 1, 2, 3, 4].map(i => mk('line', { x1: DAY.x0 + (DAY.x1 - DAY.x0) * i / 4, x2: DAY.x0 + (DAY.x1 - DAY.x0) * i / 4, y1: DAY.y - 8, y2: DAY.y + 8, stroke: 'rgba(24,26,29,.5)', 'stroke-width': 2 }));
for (const e of [dayBase, dayFill, ...dayTicks, dayDot]) dayG.appendChild(e);
// the end-card CTA is a pill: give it a rounded look via CSS only
const vis = (it, t) => { const a = smoothFade(t, it.t0, it.t1); return a; };
function smoothFade(t, t0, t1) { return ss(seg(t, t0, t0 + .55)) * (1 - ss(seg(t, t1 - .4, t1))); }
function toScreen(v) { tmpV.copy(v).project(camera); return [(tmpV.x * .5 + .5) * 1920, (-tmpV.y * .5 + .5) * 1080]; }

function layoutUI(t, e, camInfo) {
  const texts = []; P.root.updateMatrixWorld(true);
  for (const it of TYPE) {
    const d = els[it.id], a = vis(it, t);
    d.style.opacity = a;
    if (it.anim === 'rise') d.style.transform = `translateY(${(1 - ss(seg(t, it.t0, it.t0 + .8))) * 26}px)`; else d.style.transform = '';
    if (it.part) {
      const lw = labLines[it.id], base = P.parts[it.part].localToWorld(new THREE.Vector3(0, PCEN[it.part], 0));
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const [ax, ay] = toScreen(base.clone().addScaledVector(right, PRAD[it.part]));
      const lx = 1500, ly = clamp(ay, 90, 1000);
      d.style.left = (lx + 14) + 'px'; d.style.top = (ly - 17) + 'px';
      lw.line.setAttribute('x1', ax); lw.line.setAttribute('y1', ay); lw.line.setAttribute('x2', lerp(ax, lx, ss(seg(t, it.t0, it.t0 + .6)))); lw.line.setAttribute('y2', lerp(ay, ly, ss(seg(t, it.t0, it.t0 + .6))));
      lw.line.setAttribute('opacity', a * .85); lw.dot.setAttribute('cx', ax); lw.dot.setAttribute('cy', ay); lw.dot.setAttribute('opacity', a);
    }
    if (a > .02) { const r = d.getBoundingClientRect(); texts.push({ id: it.id, text: it.text, x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }); }
  }
  // day line
  const da = smoothFade(t, DAY.t0, 42.2), prog = ss(seg(t, DAY.t0 + .2, DAY.t1));
  dayG.setAttribute('opacity', da); dayLabels.forEach(l => l.style.opacity = da);
  const x = lerp(DAY.x0, DAY.x1, prog); dayFill.setAttribute('x2', x); dayDot.setAttribute('cx', x);
  if (da > .02) dayLabels.forEach((l, i) => { const r = l.getBoundingClientRect(); texts.push({ id: 'dl' + i, text: l.textContent, x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }); });
  return texts;
}

// ---------------- the frame ----------------
let lastTexts = [];
function render(t) {
  const e = applyParts(t);
  const { S, c, az } = setCamera(t, e);
  // transitions: rack-focus blur centred on each cut
  let u = 0; for (const ct of CUTS) u = Math.max(u, ss(hat(t, ct, .42)));
  // lights
  const I = { top: 4.0, key: 3.6, fill: 1.2, rim: 7.5, front: .45, sweep: 34 };
  if (S.id === 'cap') { I.top = 6.2; }
  if (S.id === 'day') { I.key = 2.6; I.sweep = 40; }
  setEnv(az, I, sweepRel(t));
  // backdrop: pool follows the subject's height, a sweep band on the cove, contact shadow
  const U = cyc.material.uniforms;
  U.uPoolC.value.set(0, 40 + 10 * (S.id === 'explode' ? 1 : 0), -105);
  U.uSw.value.set(lerp(-380, 380, ss(seg(sweepRel(t), -170, 170))), 0, 1);
  U.uSh.value.set(0, 0, 5.2, .72 * (1 - e * .75));
  U.uSh2.value.set(0, 0, 11 + 18 * e, (.30 + .1 * e) * (1 - e * .3));
  U.uK.value = 1;
  // droplets
  dro.update(t);
  const lp = new THREE.Object3D();
  { const y = leadY(t), v = (leadY(t + .02) - leadY(t - .02)) / .04; const stretch = 1 + Math.min(.55, Math.abs(v) * .5), r = .42;
    lead.position.set(4.28 * Math.sin(LEAD_AZ), y, 4.28 * Math.cos(LEAD_AZ)); lead.rotation.set(0, LEAD_AZ, 0); lead.scale.set(r, r * stretch, r * .62); }
  beads.forEach((b, i) => { const g = ss(seg(t, b.tb, b.tb + .25)); lp.position.set(4.22 * Math.sin(b.az), b.y, 4.22 * Math.cos(b.az)); lp.rotation.set(0, b.az, 0); lp.scale.set(b.rad * g + 1e-5, b.rad * g + 1e-5, b.rad * g * .6 + 1e-5); lp.updateMatrix(); beadMesh.setMatrixAt(i, lp.matrix); });
  beadMesh.instanceMatrix.needsUpdate = true;
  // depth of field
  const focus = (c.dist + c.fo) * (1 - .62 * u);
  post.dof.focus = focus; post.dof.aper = 2600 * c.aper * (1 + 2.5 * u) * (S.id === 'drop' ? .22 : 1);
  post.dof.maxCoc = S.id === 'drop' ? 30 : (22 + 30 * u);
  post.vig.uniforms.fade.value = 1 - .6 * u;
  const rv = seg(t, REVEAL[0], REVEAL[1]); wipe.uniforms.prog.value = t < REVEAL[1] ? ss(rv) : 1;
  post.composer.render();
  lastTexts = layoutUI(t, e, { az });
}
window.DUR = DUR; window.EV = EV;
window.render = render;
window.TEXTS = t => { const e = applyParts(t); setCamera(t, e); return layoutUI(t, e, {}); };
render(0);
window.READY = true;
