// A presenter standing in a Gaussian-splat world. The camera path is ours (deterministic); the host is a billboard cut out with the person matte
// (src/matte/, from tools/matte/run.sh), blended with soft edges, colour-matched to the world behind it, with a light wrap on the rim.
// Everything is driven by film.json (written by tools/talk/splat_film.py). See tools/talk/splat-template/README.md.
import * as THREE from 'three'; import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import { captions, cuesFromWords, cueWords, THEME } from '/tools/talk/layouts.js';

const F = await fetch('film.json').then(r => r.json()), meta = await fetch('src/meta.json').then(r => r.json()), words = await fetch('src/words.json').then(r => r.json());
const QS = new URLSearchParams(location.search), POSTER = QS.has('poster'), AT = parseFloat(QS.get('at') || '5');
const V = (F.aspect || '16x9') === '9x16', W = V ? 1080 : 1920, H = V ? 1920 : 1080;
const WD = F.world || {}, HO = F.host || {}, CA = F.camera || {}, CO = F.counter || {}, PL = HO.plane || {};
const SOFT = (QS.get('soft') ?? (HO.soft === false ? '0' : '1')) === '1', TONE = +(QS.get('tone') ?? HO.tone ?? .6), WRAP = +(QS.get('wrap') ?? HO.wrap ?? .25);
const ERODE = HO.erodePx ?? 2, FEATHER = HO.featherPx ?? 1;
const DUR = meta.duration + (F.tail || 0); window.DUR = DUR; window.EV = []; window.TEXTS = () => [];

const stage = document.getElementById('stage'); stage.style.width = W + 'px'; stage.style.height = H + 'px';
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true }); renderer.setSize(W, H); renderer.setPixelRatio(1); stage.appendChild(renderer.domElement);
const capCv = document.createElement('canvas'); capCv.width = W; capCv.height = H; stage.appendChild(capCv); const cap = capCv.getContext('2d');
const scene = new THREE.Scene(); scene.background = new THREE.Color(WD.background || '#101418');
const camera = new THREE.PerspectiveCamera(CA.fov ?? (V ? 58 : 50), W / H, 0.05, 200);
const spark = new SparkRenderer({ renderer }); spark.autoUpdate = false; spark.minSortIntervalMs = 0; scene.add(spark);
const world = new SplatMesh({ url: WD.url || 'world/room.splat' });
if (WD.flipY) world.quaternion.set(1, 0, 0, 0);                         // many splat files are y-down (Spark's own examples flip them)
if (WD.rotationDeg) world.rotation.set(...WD.rotationDeg.map(d => d * Math.PI / 180));
if (WD.position) world.position.set(...WD.position); if (WD.scale) world.scale.setScalar(WD.scale);
scene.add(world);

// ── the host billboard
const crop = HO.crop || { x: 0, y: 0, w: meta.w, h: meta.h }, CW = crop.w, CH = crop.h;
const HW = PL.width ?? 1.28, HHt = PL.height ?? 1.05, px = PL.x ?? .2, pz = PL.z ?? -2.6, bottom = PL.bottom ?? .8;
const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; const cg = cv.getContext('2d', { willReadFrequently: true });
const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
const plane = new THREE.Mesh(new THREE.PlaneGeometry(HW, HHt), new THREE.MeshBasicMaterial(SOFT ? { map: tex, transparent: true, depthWrite: false, toneMapped: false } : { map: tex, alphaTest: .5, toneMapped: false }));
plane.position.set(px, bottom + HHt / 2, pz); const hostScene = new THREE.Scene(); (SOFT ? hostScene : scene).add(plane);
if (CO.on !== false) {                                                   // a counter hides the cut at the bottom of the video, and a soft shadow grounds the host
  const sh = new THREE.Mesh(new THREE.CircleGeometry(.9, 48), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: .35, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.set(px, .01, pz + .05); scene.add(sh);
  const c = new THREE.Mesh(new THREE.BoxGeometry(CO.width ?? 2.6, CO.height ?? .95, CO.depth ?? .5), new THREE.MeshBasicMaterial({ color: CO.color || '#2a2f3a' })); c.position.set(px, (CO.height ?? .95) / 2, CO.z ?? pz + .5); scene.add(c);
}

// ── frames and mattes, loaded on demand (a long film must not hold every frame)
const imgs = new Map(), pad = n => String(n).padStart(4, '0');
function load(u) { if (!imgs.has(u)) { imgs.set(u, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('cannot load ' + u)); i.src = u; })); if (imgs.size > 60) imgs.delete(imgs.keys().next().value); } return imgs.get(u); }
const mc = document.createElement('canvas'); mc.width = CW; mc.height = CH; const mg = mc.getContext('2d', { willReadFrequently: true });
const fc = document.createElement('canvas'); fc.width = CW; fc.height = CH; const fg = fc.getContext('2d', { willReadFrequently: true });
const wc = document.createElement('canvas'); wc.width = 960; wc.height = 540; const wg = wc.getContext('2d', { willReadFrequently: true });
function boxBlur(src, w, h, r) {
  const t = new Float32Array(w * h), o = new Float32Array(w * h), n = 2 * r + 1;
  for (let y = 0; y < h; y++) { let acc = 0; for (let x = -r; x <= r; x++) acc += src[y * w + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { t[y * w + x] = acc / n; acc += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += t[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { o[y * w + x] = acc / n; acc += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
  return o;
}
function erode(src, w, h, r) {
  if (r <= 0) return src; const t = new Float32Array(w * h), o = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let m = 1; for (let k = -r; k <= r; k++) { const v = src[y * w + Math.min(w - 1, Math.max(0, x + k))]; if (v < m) m = v; } t[y * w + x] = m; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let m = 1; for (let k = -r; k <= r; k++) { const v = t[Math.min(h - 1, Math.max(0, y + k)) * w + x]; if (v < m) m = v; } o[y * w + x] = m; }
  return o;
}
function screenRect() {                                                  // where the billboard lands on the 960x540 copy of the world image
  const v = new THREE.Vector3(), xs = [], ys = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { v.set(sx * HW / 2, sy * HHt / 2, 0).applyMatrix4(plane.matrixWorld).project(camera); xs.push((v.x * .5 + .5) * 960); ys.push((1 - (v.y * .5 + .5)) * 540); }
  const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(960, Math.ceil(Math.max(...xs))), y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(540, Math.ceil(Math.max(...ys)));
  return { x0, y0, w: Math.max(2, x1 - x0), h: Math.max(2, y1 - y0) };
}
async function hostAt(time) {
  const k = Math.max(1, Math.min(meta.frames, Math.floor(time * meta.fps + 1e-4) + 1));
  const [f, m] = await Promise.all([load(`src/frames/${pad(k)}.jpg`), load(`src/matte/${pad(k)}.png`)]);
  const [ox, oy] = crop.track ? crop.track[k - 1] || crop.track[crop.track.length - 1] : [crop.x, crop.y];     // the crop follows the host
  fg.clearRect(0, 0, CW, CH); fg.drawImage(f, -ox, -oy, meta.w, meta.h); mg.clearRect(0, 0, CW, CH); mg.drawImage(m, -ox, -oy, meta.w, meta.h);
  if (!SOFT) { cg.globalCompositeOperation = 'source-over'; cg.clearRect(0, 0, CW, CH); cg.drawImage(fc, 0, 0); cg.globalCompositeOperation = 'destination-in'; cg.drawImage(mc, 0, 0); tex.needsUpdate = true; return; }
  const Fd = fg.getImageData(0, 0, CW, CH), M = mg.getImageData(0, 0, CW, CH), n = CW * CH, a0 = new Float32Array(n);
  for (let i = 0; i < n; i++) a0[i] = M.data[i * 4 + 3] / 255;
  const al = FEATHER > 0 ? boxBlur(erode(a0, CW, CH, ERODE), CW, CH, FEATHER) : erode(a0, CW, CH, ERODE), wide = boxBlur(a0, CW, CH, 7);
  let R = 0, G = 0, B = 0, cnt = 0; for (let i = 0; i < n; i += 3) if (al[i] > .9) { R += Fd.data[i * 4]; G += Fd.data[i * 4 + 1]; B += Fd.data[i * 4 + 2]; cnt++; }
  const mh = cnt ? [R / cnt, G / cnt, B / cnt] : [128, 128, 128];
  wg.drawImage(renderer.domElement, 0, 0, 960, 540); const rc = screenRect(), bg = wg.getImageData(rc.x0, rc.y0, rc.w, rc.h);
  const gw = 24, gh = 20, grid = new Float32Array(gw * gh * 3), cg_ = new Float32Array(gw * gh);
  for (let y = 0; y < rc.h; y++) for (let x = 0; x < rc.w; x++) { const gi = Math.min(gh - 1, (y / rc.h * gh) | 0) * gw + Math.min(gw - 1, (x / rc.w * gw) | 0), p = (y * rc.w + x) * 4; grid[gi * 3] += bg.data[p]; grid[gi * 3 + 1] += bg.data[p + 1]; grid[gi * 3 + 2] += bg.data[p + 2]; cg_[gi]++; }
  let tr = 0, tg = 0, tb = 0; for (let i = 0; i < gw * gh; i++) { if (cg_[i]) { grid[i * 3] /= cg_[i]; grid[i * 3 + 1] /= cg_[i]; grid[i * 3 + 2] /= cg_[i]; } tr += grid[i * 3]; tg += grid[i * 3 + 1]; tb += grid[i * 3 + 2]; }
  const mt = [tr / (gw * gh), tg / (gw * gh), tb / (gw * gh)], Yh = .3 * mh[0] + .59 * mh[1] + .11 * mh[2], Yt = .3 * mt[0] + .59 * mt[1] + .11 * mt[2];
  const out = cg.createImageData(CW, CH), D = out.data;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const i = y * CW + x, p = i * 4; let r = Fd.data[p], g = Fd.data[p + 1], b = Fd.data[p + 2];
    if (TONE > 0) {
      const Y = .3 * r + .59 * g + .11 * b, cr = r - Y, cb = b - Y, tcr = mt[0] - Yt, tcb = mt[2] - Yt, hcr = mh[0] - Yh, hcb = mh[2] - Yh;
      const s = .30 * TONE, Yn = Y + (Yt - Yh) * .25 * TONE, Rn = cr + (tcr - hcr) * s, Bn = cb + (tcb - hcb) * s; r = Yn + Rn; b = Yn + Bn; g = (Yn - .3 * r - .11 * b) / .59;
    }
    if (WRAP > 0) {
      const edge = Math.max(0, Math.min(1, (1 - wide[i]) * 2.2)) * (al[i] > .05 ? 1 : 0);
      if (edge > 0) { const gx = Math.min(gw - 1, Math.max(0, (x / CW * gw) | 0)), gy = Math.min(gh - 1, Math.max(0, (y / CH * gh) | 0)), gi = (gy * gw + gx) * 3, k2 = Math.min(1, edge) * WRAP; r += (grid[gi] - r) * k2; g += (grid[gi + 1] - g) * k2; b += (grid[gi + 2] - b) * k2; }
    }
    D[p] = Math.max(0, Math.min(255, r)); D[p + 1] = Math.max(0, Math.min(255, g)); D[p + 2] = Math.max(0, Math.min(255, b)); D[p + 3] = Math.round(al[i] * 255);
  }
  cg.putImageData(out, 0, 0); tex.needsUpdate = true;
}

// ── captions (a transparent canvas above the WebGL one)
const theme = { ...THEME, ...(F.theme || {}) };
const cues = Array.isArray(F.captions?.cues) ? F.captions.cues : cuesFromWords(words, V ? { maxChars: 14, gap: .45, balance: true } : {}), toks = V ? cueWords(cues, words) : null;
const BG = F.captions?.style === 'pill' ? captions.pill : captions.card;
function drawCaptions(t) {
  cap.setTransform(1, 0, 0, 1, 0, 0); cap.clearRect(0, 0, W, H); if (POSTER) return;
  if (V) captions.karaoke(cap, cues, toks, t, { W, H, theme, ...(F.captions?.karaoke || {}) }); else BG(cap, cues, t, { W, H, theme });
}

// ── the camera path: a slow orbit around the host with a push-in
const target = new THREE.Vector3(...(CA.target || [px, bottom + HHt * .5 + .1, pz]));
window.render = async (t0) => {
  const t = POSTER ? AT : t0, time = Math.min(t, meta.duration - .05), a = Math.min(1, t / DUR);
  const ang = Math.sin(a * Math.PI * 2 * (CA.orbitCycles ?? 1)) * (CA.orbitDeg ?? 14) * Math.PI / 180, Rr = (CA.rStart ?? 3.8) + ((CA.rEnd ?? 2.6) - (CA.rStart ?? 3.8)) * a;
  camera.position.set(target.x + Math.sin(ang) * Rr, (CA.height ?? 1.45) + (CA.bob ?? .1) * Math.sin(a * Math.PI * 2), target.z + Math.cos(ang) * Rr); camera.lookAt(target); camera.updateMatrixWorld();
  plane.updateMatrixWorld(true);
  if (!SOFT) { await hostAt(time); await spark.update({ scene, camera }); renderer.render(scene, camera); }
  else { renderer.autoClear = true; await spark.update({ scene, camera }); renderer.render(scene, camera); await hostAt(time); renderer.autoClear = false; renderer.render(hostScene, camera); renderer.autoClear = true; }
  drawCaptions(t); return 'ok';
};
await world.initialized; await window.render(0); window.READY = true;
