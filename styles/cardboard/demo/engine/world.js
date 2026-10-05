// world.js: renderer, warm desk lamp, cutting mat, desk, camera helper and post chain. Units are centimetres, y up.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makePost } from '/core/three/post.js';
import { matTexture, cv, tex, fbm } from './tex.js';
import { mulberry } from '/core/lib.js';

export const MAT = { w: 100, h: 66 };
export function makeWorld(W, H, o = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(o.ssaa ?? 2); renderer.setSize(W, H);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = o.exposure ?? 1.0;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#1c1511');
  const camera = new THREE.PerspectiveCamera(o.fov ?? 28, W / H, .25, 900); scene.add(camera);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = o.env ?? .5;
  const key = new THREE.SpotLight(0xffe2b8, o.key ?? 2.6, 0, .75, .9, 0);
  key.position.set(-42, 78, 40); key.target.position.set(4, 0, 0); key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096); key.shadow.camera.near = 40; key.shadow.camera.far = 220; key.shadow.bias = -.0002; key.shadow.normalBias = .06; key.shadow.radius = 6;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xdfe8ff, o.fill ?? .35); fill.position.set(30, 40, 60); scene.add(fill);
  // cutting mat
  const mt = matTexture(MAT.w, MAT.h);
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(MAT.w, MAT.h), new THREE.MeshStandardMaterial({ map: mt, roughness: .62, metalness: 0 }));
  mat.rotation.x = -Math.PI / 2; mat.position.y = .02; mat.receiveShadow = true; scene.add(mat);
  // desk around the mat: dark plywood
  const rnd = mulberry(77), dc = cv(1024, 1024), dx = dc.getContext('2d'); dx.fillStyle = '#5a3f2b'; dx.fillRect(0, 0, 1024, 1024); fbm(dx, 1024, 1024, rnd, .3, 6, 16);
  for (let i = 0; i < 160; i++) { dx.strokeStyle = `rgba(30,18,8,${.06 + rnd() * .1})`; dx.lineWidth = .6 + rnd() * 1.4; const y = rnd() * 1024; dx.beginPath(); dx.moveTo(0, y); dx.bezierCurveTo(300, y + (rnd() - .5) * 18, 700, y + (rnd() - .5) * 18, 1024, y + (rnd() - .5) * 10); dx.stroke(); }
  const dt = tex(dc); dt.repeat.set(5, 4);
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(500, 400), new THREE.MeshStandardMaterial({ map: dt, roughness: .75 }));
  desk.rotation.x = -Math.PI / 2; desk.position.y = -.6; desk.receiveShadow = true; scene.add(desk);
  const mside = new THREE.Mesh(new THREE.BoxGeometry(MAT.w, .6, MAT.h), new THREE.MeshStandardMaterial({ color: '#1f4538', roughness: .7 })); mside.position.y = -.35; mside.receiveShadow = true; mside.castShadow = true; scene.add(mside);
  const post = makePost(renderer, scene, camera, W, H, { ssaa: o.ssaa ?? 2, ao: true, aoRadius: o.aoRadius ?? 1.2, aoThickness: 1.2, aoAmt: o.aoAmt ?? .8, aoScale: 2 });
  post.bloom.strength = .06; post.vig.uniforms.amt.value = o.vig ?? .5; post.vig.uniforms.warm.value = .06; post.vig.uniforms.contrast.value = .12; post.vig.uniforms.sat.value = 1.05;
  const V = THREE.Vector3;
  return {
    renderer, scene, camera, post, key, fill, W, H,
    cam(c) {
      camera.position.set(...c.pos); camera.up.set(...(c.up ?? [0, 1, 0])); camera.fov = c.fov ?? camera.fov; camera.lookAt(...c.look); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      post.dof.focus = c.focus ?? camera.position.distanceTo(new V(...c.look)); post.dof.aper = c.aper ?? 220; post.dof.maxCoc = c.coc ?? 14;
    },
    render() { post.composer.render(); },
    px(v) { const p = v.clone().project(camera); return [(p.x * .5 + .5) * W, (-p.y * .5 + .5) * H]; },
  };
}
