// world.js: the paper tabletop, the lamp, the camera, the post chain, and sheets mounted in the scene.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makePost } from '/core/three/post.js';
import { sheetTextures, tableTextures, creaseTextures, paperMaterial, updateCreases } from './paper.js';

export function makeWorld(W, H, o = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(2); renderer.setSize(W, H);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = o.exposure ?? 1.0;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(o.table ?? '#d0cbbf');
  const camera = new THREE.PerspectiveCamera(o.fov ?? 26, W / H, .05, 6); scene.add(camera);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = o.env ?? .7;
  // the lamp: one soft key from the upper left, a faint cool fill from the right
  const key = new THREE.SpotLight(0xfff1e0, o.key ?? 2.5, 0, o.cone ?? .66, 1, 0); key.position.set(-.46, .50, .10); key.target.position.set(.02, 0, 0);
  key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.camera.near = .25; key.shadow.camera.far = 1.7; key.shadow.bias = -.00004; key.shadow.normalBias = .0005; key.shadow.radius = o.soft ?? 5;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xe3ebff, o.fill ?? .75); fill.position.set(.15, .45, .55); scene.add(fill);
  // tabletop of paper
  const tt = tableTextures({ color: o.table ?? '#d0cbbf', seed: 5 });
  tt.map.repeat.set(5, 5); tt.normal.repeat.set(5, 5);
  const table = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.0), new THREE.MeshStandardMaterial({ map: tt.map, normalMap: tt.normal, normalScale: new THREE.Vector2(.7, .7), roughness: .95 }));
  table.rotation.x = -Math.PI / 2; table.position.y = -.0003; table.receiveShadow = true; scene.add(table);
  const post = makePost(renderer, scene, camera, W, H, { ssaa: 2, ao: true, aoRadius: o.aoRadius ?? .02, aoThickness: .4, aoAmt: o.aoAmt ?? .8, aoScale: 2.5 });
  post.bloom.strength = .05; post.vig.uniforms.amt.value = o.vig ?? .42; post.vig.uniforms.warm.value = .04; post.vig.uniforms.contrast.value = .1; post.vig.uniforms.sat.value = 1.04;
  const sheets = [];
  const world = {
    renderer, scene, camera, post, key, table, sheets, W, H,
    // mount a Sheet: builds its mesh with a paper material. spec = sheetTextures spec
    mount(sheet, spec, mo = {}) {
      const mesh = sheet.build(), tx = sheetTextures({ w: sheet.w, h: sheet.h, ...spec }), cr = creaseTextures(sheet);
      const mat = paperMaterial(tx, cr, mo);
      const m = new THREE.Mesh(mesh.geo, mat); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
      const em = new THREE.Mesh(mesh.eg, new THREE.MeshStandardMaterial({ color: spec.edge ?? '#efe8d8', roughness: .95, side: THREE.DoubleSide })); em.castShadow = true; em.receiveShadow = true; em.frustumCulled = false;
      const hm = new THREE.Mesh(mesh.hg, mat); hm.castShadow = true; hm.receiveShadow = true; hm.frustumCulled = false; scene.add(hm);
      scene.add(m, em); const rec = { sheet, mesh: m, edge: em, cr, tx }; sheets.push(rec); return rec;
    },
    update(t) { for (const r of sheets) { r.sheet.update(t); updateCreases(r.sheet, r.cr, t); } },
    cam(c) {
      camera.position.set(...c.pos); camera.up.set(...(c.up ?? [0, 1, 0])); camera.fov = c.fov ?? camera.fov; camera.lookAt(...c.look); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      post.dof.focus = c.focus ?? camera.position.distanceTo(new THREE.Vector3(...c.look)); post.dof.aper = c.aper ?? 2.2; post.dof.maxCoc = c.coc ?? 10;
    },
    render() { post.composer.render(); },
    // world -> pixel (for the diagram layer)
    px(v) { const p = v.clone().project(camera); return [(p.x * .5 + .5) * W, (-p.y * .5 + .5) * H]; },
  };
  return world;
}
