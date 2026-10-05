// The craft table: walnut top, a moss foam pad, five nests of dyed roving on a linen strip, a felting needle in a wooden holder, a desk lamp.
// World units: 1 unit = 1 cm. The top of the foam pad is y = 0, the table top is y = -2.5, the camera looks down -z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mulberry } from '/core/lib.js';
import * as W from './wool.js';

export const PAL = {
  oat: 0xd6cab4, slate: 0x7f95a8, slateDk: 0x5f7488, rust: 0xc4694a, mustard: 0xd3a64a, moss: 0x86966a, rose: 0xd5a199, charcoal: 0x2d2a28,
  cream: 0xe8dfcc,
};
export const TABLE_Y = -2.5;

function paint(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
const tex = (c, srgb = true, rep) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (rep) t.repeat.set(...rep); return t; };

function foamCanvas() {   // a dense foam block: tiny pores
  const R = mulberry(5);
  return paint(1024, 1024, (g, w, h) => {
    g.fillStyle = '#a3a78f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const x = R() * w, y = R() * h, r = 1 + R() * 3.5, d = R() < .65;
      g.fillStyle = d ? `rgba(40,48,25,${.10 + R() * .18})` : `rgba(210,220,170,${.07 + R() * .12})`;
      g.beginPath(); g.ellipse(x, y, r, r * (.6 + R() * .5), R() * 3, 0, 7); g.fill();
    }
  });
}
function linenCanvas() {
  const R = mulberry(9);
  return paint(1024, 1024, (g, w, h) => {
    g.fillStyle = '#d8ccb2'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(${R() < .5 ? '120,100,70' : '255,250,235'},${.05 + R() * .09})`; g.fillRect(0, y, w, 1 + (R() < .3 ? 1 : 0)); }
    for (let x = 0; x < w; x += 3) { g.fillStyle = `rgba(${R() < .5 ? '120,100,70' : '255,250,235'},${.04 + R() * .08})`; g.fillRect(x, 0, 1 + (R() < .3 ? 1 : 0), h); }
    for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(90,70,45,${.05 + R() * .08})`; g.lineWidth = 1 + R() * 2; const x = R() * w, y = R() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - .5) * 160, y + (R() - .5) * 6); g.stroke(); }
  });
}
function blobShadowTex() {
  return tex(paint(128, 128, (g, w) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.45, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }), false);
}

export async function buildSet(scene, renderer) {
  const S = { shadows: [], nests: [] };
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .16;
  const loader = new THREE.TextureLoader();
  const lt = async u => { const t = await loader.loadAsync(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  const [wd, wn, wr] = await Promise.all([lt('/core/assets/polyhaven/walnut_diff.jpg'), lt('/core/assets/polyhaven/walnut_nor.jpg'), lt('/core/assets/polyhaven/walnut_rough.jpg')]);
  wd.colorSpace = THREE.SRGBColorSpace;
  for (const t of [wd, wn, wr]) t.repeat.set(2.2, 1.6);
  const table = new THREE.Mesh(new THREE.PlaneGeometry(150, 100), new THREE.MeshStandardMaterial({ map: wd, normalMap: wn, roughnessMap: wr, roughness: 1, color: 0xb59a86, normalScale: new THREE.Vector2(.8, .8) }));
  table.rotation.x = -Math.PI / 2; table.position.y = TABLE_Y; scene.add(table); S.table = table;

  // foam pad
  const foam = tex(foamCanvas(), true, [1, 1]);
  const padMat = new THREE.MeshStandardMaterial({ map: foam, bumpMap: foam, bumpScale: 1.4, roughness: 1, color: 0xc2c4b0 });
  const pad = new THREE.Mesh(new RoundedBoxGeometry(14, 2.5, 10, 5, .5), padMat); pad.position.set(0, -1.25, 0); scene.add(pad); S.pad = pad;

  addShadow(S, scene, 1.2, 1.4, 19, 13.5, TABLE_Y, .8);   // the pad sits on the table
  // linen strip with the roving nests
  const cloth = new THREE.Mesh(new RoundedBoxGeometry(40, .18, 13, 2, .06), new THREE.MeshStandardMaterial({ map: tex(linenCanvas(), true, [3, 1]), roughness: 1, color: 0xb8b09c }));
  cloth.position.set(-3, TABLE_Y + .09, -9); cloth.rotation.y = .03; scene.add(cloth);
  const nestSpec = [
    [PAL.slate, -14, -9.5, 2.1], [PAL.rust, -8.6, -7.2, 1.8], [PAL.mustard, -3.2, -10.2, 1.9], [PAL.moss, 2.8, -8, 2.0], [PAL.rose, 9, -9.6, 1.8],
  ];
  nestSpec.forEach(([c, x, z, r], i) => {
    const R = mulberry(100 + i), pts = [], turns = 2.6;
    for (let k = 0; k <= 26; k++) { const u = k / 26, a = u * turns * Math.PI * 2 + R() * .1, rr = r * (1 - .55 * u) + (R() - .5) * .15; pts.push([Math.cos(a) * rr, u * 1.35 + (R() - .5) * .08, Math.sin(a) * rr]); }
    const g = W.wormGeo(pts, 0.62, { seg: 160, radial: 14 });
    const L = g.userData.length;
    const m = W.woolMaterial({ color: c, mode: 'uv', len: .16, shells: 18, uv: [L / 2.2, 1.9], fuzz: 1, mottle: .2 });
    const mesh = W.woolMesh(g, m); mesh.position.set(x, TABLE_Y + .6, z); mesh.rotation.y = R() * 6; scene.add(mesh);
    S.nests.push({ mesh, mat: m, color: c, rad: r + .7 });
    addShadow(S, scene, x + .5, z + .6, r * 2.6, r * 2.3, TABLE_Y + .2, .5);
  });

  // needle in its holder: local +Y is the axis, the tip is at the origin
  const needle = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xe6e8ea, metalness: .45, roughness: .32 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.045, .06, 5.5, 8), steel); shaft.position.y = 2.75; needle.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.045, .9, 8), steel); tip.position.y = .45; tip.rotation.x = Math.PI; needle.add(tip);
  for (let i = 0; i < 3; i++) {   // barbs: tiny spurs along the first centimetre
    const b = new THREE.Mesh(new THREE.ConeGeometry(.05, .16, 4), steel);
    b.position.set(.045 * Math.cos(i * 2.1), .55 + i * .22, .045 * Math.sin(i * 2.1)); b.rotation.set(Math.PI * .85 * Math.sin(i * 2.1), 0, -Math.PI * .85 * Math.cos(i * 2.1)); needle.add(b);
  }
  const wood = new THREE.MeshStandardMaterial({ map: wd, color: 0xd8b48e, roughness: .55 });
  const holder = new THREE.Mesh(new THREE.LatheGeometry([[.05, 0], [.32, 0], [.36, .6], [.5, 1.2], [.58, 3.5], [.6, 6], [.56, 8], [.42, 8.8], [.0, 8.9]].map(p => new THREE.Vector2(p[0], p[1])), 28), wood); holder.position.y = 5.2; needle.add(holder);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.5, .07, 8, 24), new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: .6 })); ring.rotation.x = Math.PI / 2; ring.position.y = 6.2; needle.add(ring);
  scene.add(needle); S.needle = needle;

  // lamp
  const gltf = await new GLTFLoader().loadAsync('/core/assets/polyhaven/desk_lamp_arm_01/desk_lamp_arm_01.gltf');
  const lamp = gltf.scene; lamp.scale.setScalar(34); lamp.position.set(-21, TABLE_Y, -13); lamp.rotation.y = .5; scene.add(lamp);
  lamp.updateMatrixWorld(true);
  S.lamp = lamp; S.bulbMat = null;
  lamp.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); if (o.material.emissive && o.material.emissive.getHex() > 0) S.bulbMat = o.material; } });
  const bb = new THREE.Box3(); lamp.traverse(o => { if (o.isMesh && o.material === S.bulbMat) bb.expandByObject(o); });
  S.bulbPos = bb.getCenter(new THREE.Vector3());
  // the lights for the standard materials
  S.spot = new THREE.SpotLight(0xffddb8, 4600, 0, .95, 1, 2); scene.add(S.spot, S.spot.target);
  S.hemi = new THREE.HemisphereLight(0x5a6a80, 0x6a4a30, .7); scene.add(S.hemi);
  S.fill = new THREE.DirectionalLight(0xffe0c0, .7); S.fill.position.set(14, 10, 26); scene.add(S.fill);
  return S;
}

export function addShadow(S, scene, x, z, w, d, y, op) {
  if (!S.shTex) S.shTex = blobShadowTex();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: S.shTex, transparent: true, opacity: op, depthWrite: false, color: 0x000000, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y + .02, z); m.scale.set(w, d, 1); m.renderOrder = 2; scene.add(m);
  S.shadows.push(m); return m;
}
