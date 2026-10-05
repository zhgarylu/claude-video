// world.js: renderer, a warm workshop environment for the metal to reflect, lights that follow the camera's target, the post chain.
import * as THREE from 'three';
import { makePost } from '/core/three/post.js';

function warmRoom() {
  const s = new THREE.Scene();
  const hdr = (hex, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide });
  s.add(new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshBasicMaterial({ color: 0x1c130c, side: THREE.BackSide })));
  const panel = (w, h, p, hex, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), hdr(hex, k)); m.position.set(...p); m.lookAt(0, 0, 0); s.add(m); };
  panel(4.2, 2.6, [-3.4, 2.6, 4.2], 0xffd9a8, 34);        // key softbox, upper left, in front
  panel(1.0, 5.0, [4.8, 0.6, 1.5], 0xffc78a, 22);         // tall warm strip on the right
  panel(5.0, 1.2, [0, 3.85, -0.5], 0xffe4c2, 12);         // overhead
  panel(2.2, 1.6, [0.5, 1.4, -5.6], 0xa9c4e8, 8);      // a dim cool window behind
  panel(0.5, 0.5, [-1.5, 2.2, 5.4], 0xffffff, 40);       // a hard glint
  panel(0.35, 0.35, [2.6, 3.2, 3.8], 0xfff0d8, 30);      // another
  panel(6.0, 0.6, [0, -3.2, 3.0], 0x7a4a24, 2.2);        // warm bounce from the bench
  return s;
}

export function makeWorld(W, H, o = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(2); renderer.setSize(W, H);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = o.exposure ?? 1.15;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#0d0906');
  const camera = new THREE.PerspectiveCamera(30, W / H, 6, 4000); scene.add(camera);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(warmRoom(), 0.03).texture; scene.environmentIntensity = o.env ?? 1.5;

  // key light: a warm spot above-left of the target, follows the camera's target so the shadow map always has detail where we look
  const key = new THREE.SpotLight(0xffe0b8, o.key ?? 5.2, 0, 0.5, 0.95, 0);
  key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.camera.near = 40; key.shadow.camera.far = 420; key.shadow.bias = -0.00012; key.shadow.normalBias = 0.06; key.shadow.radius = 4;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xbcd0ff, o.fill ?? 0.55); fill.position.set(40, 20, 100); scene.add(fill, fill.target);
  const rim = new THREE.SpotLight(0xffb066, o.rim ?? 1.4, 0, 0.7, 1, 0); scene.add(rim, rim.target);

  const post = makePost(renderer, scene, camera, W, H, { ssaa: o.ssaa ?? 2, ao: true, aoRadius: 2.2, aoThickness: 1.4, aoAmt: o.aoAmt ?? 0.75, aoScale: 2.2 });
  post.bloom.strength = 0.10; post.bloom.radius = 0.5; post.bloom.threshold = 1.35;
  post.vig.uniforms.amt.value = 0.5; post.vig.uniforms.warm.value = 0.12; post.vig.uniforms.contrast.value = 0.12; post.vig.uniforms.sat.value = 1.05;

  const world = {
    renderer, scene, camera, post, key, fill, rim, W, H,
    // cam = {pos:[x,y,z], look:[x,y,z], fov, focus?, aper?, coc?, light?:[dx,dy,dz]}
    cam(c) {
      camera.position.set(...c.pos); camera.up.set(0, 1, 0); camera.fov = c.fov ?? 30;
      camera.lookAt(...c.look); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      const L = new THREE.Vector3(...c.look);
      const d = c.light ?? [-70, 85, 120];
      key.position.set(L.x + d[0], L.y + d[1], L.z + d[2]); key.target.position.copy(L); key.target.updateMatrixWorld();
      rim.position.set(L.x + 90, L.y + 60, L.z - 60); rim.target.position.copy(L); rim.target.updateMatrixWorld();
      fill.position.set(L.x + 40, L.y + 20, L.z + 100); fill.target.position.copy(L); fill.target.updateMatrixWorld();
      post.dof.focus = c.focus ?? camera.position.distanceTo(L); post.dof.aper = c.aper ?? 3.5; post.dof.maxCoc = c.coc ?? 14;
      post.vig.uniforms.fade.value = c.fade ?? 1;
    },
    render() { post.composer.render(); },
    px(v) { const p = new THREE.Vector3(...v).project(camera); return [(p.x * .5 + .5) * W, (-p.y * .5 + .5) * H, p.z]; },
  };
  return world;
}
