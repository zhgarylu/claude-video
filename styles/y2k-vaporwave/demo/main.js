import { clamp, lerp, seg, ss, eio, eo, hash, TAU } from '/core/lib.js';
import { VS, SCENE, COMPOSE, POST } from './shaders.js';
import { drawWindow, painters, cursor, palm, sparkle, caption } from './ui.js';
import { stateAt, DUR, B, POPS, TICKS, BLOOPS, GLITCH, SPIN0, BELL, FILL, CLICK, CLOSE_DLG, CLOSE_INST, SB } from './shots.js';

const W = 1920, H = 1080;
const glc = document.getElementById('gl'), uic = document.getElementById('ui'), ui = uic.getContext('2d');
const gl = glc.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: false });
if (!gl) throw new Error('WebGL2 needed');
gl.getExtension('EXT_color_buffer_float'); gl.getExtension('OES_texture_float_linear');

// ---------- text SDF: signed distance (px) of a canvas-rasterised word, exact EDT ----------
function edt1d(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
  for (let q = 1; q < n; q++) {
    let s; while (true) { const p = v[k]; s = ((f[q] + q * q) - (f[p] + p * p)) / (2 * q - 2 * p); if (s <= z[k]) k--; else break; if (k < 0) { k = 0; break; } }
    k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
  }
  k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
}
function edt(mask, w, h, inside) {   // squared distance to nearest pixel where mask==inside
  const g = new Float64Array(w * h); const INF = 1e12;
  for (let i = 0; i < w * h; i++) g[i] = mask[i] === inside ? 0 : INF;
  const n = Math.max(w, h), f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = g[y * w + x]; edt1d(f, h, d, v, z); for (let y = 0; y < h; y++) g[y * w + x] = d[y]; }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g[y * w + x]; edt1d(f, w, d, v, z); for (let x = 0; x < w; x++) g[y * w + x] = d[x]; }
  return g;
}
const TW = 2048, TH = 512;
function buildTextSDF(text, font) {
  const c = document.createElement('canvas'); c.width = TW; c.height = TH; const x = c.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#000'; x.fillRect(0, 0, TW, TH); x.fillStyle = '#fff'; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, TW / 2, TH / 2 + 14);
  const px = x.getImageData(0, 0, TW, TH).data, m = new Uint8Array(TW * TH);
  for (let i = 0; i < TW * TH; i++) m[i] = px[i * 4] > 127 ? 1 : 0;
  const dIn = edt(m, TW, TH, 0), dOut = edt(m, TW, TH, 1);       // dIn: distance to outside (for inside pixels)
  const out = new Float32Array(TW * TH);
  for (let i = 0; i < TW * TH; i++) out[i] = m[i] ? -Math.sqrt(dIn[i]) + .5 : Math.sqrt(dOut[i]) - .5;
  return out;
}

// ---------- GL plumbing ----------
function prog(vs, fs, name) {
  const mk = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { const lg = gl.getShaderInfoLog(o); console.error(name + ': ' + lg); throw new Error(name + ' shader: ' + lg); } return o; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const cache = {}; p.u = n => cache[n] ?? (cache[n] = gl.getUniformLocation(p, n)); return p;
}
const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
const pScene = prog(VS, SCENE, 'scene'), pComp = prog(VS, COMPOSE, 'compose'), pPost = prog(VS, POST, 'post');

function target(internal, format, type, mips) {
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, internal, W, H, 0, format, type, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { tex, fb };
}
const tScene = target(gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, true), tComp = target(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, false);
const uiTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, uiTex);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
const sdfTex = gl.createTexture();
function uploadSDF(data) {
  gl.bindTexture(gl.TEXTURE_2D, sdfTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, TW, TH, 0, gl.RED, gl.FLOAT, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
const TEXT_SIZE = [9.6, 2.4];          // world units covered by the SDF texture at scale 1

function camProject(cam, d) {          // world direction -> uv in 0..1 (y up), for the lens flare
  const f = norm(sub(cam.tgt, cam.pos)), up = [Math.sin(cam.roll || 0), Math.cos(cam.roll || 0), 0];
  const r = norm(cross(f, up)), u = cross(r, f); const fl = 1 / Math.tan(cam.fov / 2);
  const z = dot(d, f); if (z <= 0) return [-9, -9];
  const sx = dot(d, r) / z * fl, sy = dot(d, u) / z * fl;
  return [sx * .5 * H / W + .5, sy * .5 + .5];
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

const HAZE = [1.0, .55, .82];
function draw(t) {
  const S = stateAt(t);
  gl.viewport(0, 0, W, H);
  // ---- UI canvas ----
  ui.clearRect(0, 0, W, H);
  for (const p of S.palms || []) palm(ui, p.x, p.y, p.h, p.lean, t, p.flip, p.seed);
  for (const w of S.windows || []) { w.draw = painters[w.kind]; drawWindow(ui, w, t); }
  for (const s of S.sparkles || []) sparkle(ui, s.x, s.y, s.s, s.a, s.col, s.rot);
  if (S.cursor) cursor(ui, S.cursor.x, S.cursor.y, 3, S.cursor.press);
  if (S.caption) caption(ui, S.caption.text, W / 2, 1000, S.caption.a);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, uiTex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, uic);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  const cam = S.cam;
  const common = p => {
    gl.uniform2f(p.u('uRes'), W, H); gl.uniform1f(p.u('uT'), t);
    gl.uniform3fv(p.u('uCamPos'), cam.pos); gl.uniform3fv(p.u('uCamTgt'), cam.tgt); gl.uniform1f(p.u('uFov'), cam.fov); gl.uniform1f(p.u('uRoll'), cam.roll || 0);
  };
  // ---- pass A: scene ----
  gl.bindFramebuffer(gl.FRAMEBUFFER, tScene.fb); gl.useProgram(pScene); common(pScene);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sdfTex); gl.uniform1i(pScene.u('uTextSDF'), 0);
  gl.uniform1f(pScene.u('uSunY'), S.sunY); gl.uniform1f(pScene.u('uFloorMode'), S.floorMode || 0); gl.uniform1f(pScene.u('uScroll'), S.scroll || 0); gl.uniform1f(pScene.u('uBeat'), 0);
  gl.uniform3fv(pScene.u('uHaze'), S.haze || HAZE);
  const T = S.text || { on: 0, pos: [0, 0, 0], rot: 0, scale: 1 };
  gl.uniform1f(pScene.u('uTextOn'), T.on); gl.uniform3fv(pScene.u('uTextPos'), T.pos); gl.uniform2fv(pScene.u('uTextSize'), TEXT_SIZE); gl.uniform2f(pScene.u('uTextRS'), T.rot, T.scale);
  gl.uniform1f(pScene.u('uTextR'), .115); gl.uniform1f(pScene.u('uTextT'), .17); gl.uniform1f(pScene.u('uTexPx'), TEXT_SIZE[0] / TW);
  const B = S.bust || { s: 0, pos: [0, 0, 0], rot: 0 };
  gl.uniform4f(pScene.u('uBust'), B.pos[0], B.pos[1], B.pos[2], B.s); gl.uniform1f(pScene.u('uBustRot'), B.rot);
  const c0 = S.col0 || [0, 0, 0, 0], c1 = S.col1 || [0, 0, 0, 0];
  gl.uniform4fv(pScene.u('uCol0'), c0); gl.uniform4fv(pScene.u('uCol1'), c1);
  gl.uniform4fv(pScene.u('uBlob'), S.blob || [0, 0, 0, 0]);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindTexture(gl.TEXTURE_2D, tScene.tex); gl.generateMipmap(gl.TEXTURE_2D);
  // ---- pass B: bubbles, bloom, flare, UI ----
  gl.bindFramebuffer(gl.FRAMEBUFFER, tComp.fb); gl.useProgram(pComp); common(pComp);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tScene.tex); gl.uniform1i(pComp.u('uScene'), 0);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, uiTex); gl.uniform1i(pComp.u('uUI'), 2);
  const bub = (S.bubbles || []).slice().sort((a, b) => dot(sub(b.c, cam.pos), sub(b.c, cam.pos)) - dot(sub(a.c, cam.pos), sub(a.c, cam.pos))).slice(0, 6);
  const ba = new Float32Array(24), bc = new Float32Array(18);
  bub.forEach((b, i) => { ba.set([...b.c, b.r], i * 4); bc.set(b.col, i * 3); });
  gl.uniform4fv(pComp.u('uBub'), ba); gl.uniform3fv(pComp.u('uBubCol'), bc); gl.uniform1i(pComp.u('uBubN'), bub.length);
  const sunUV = camProject(cam, norm([0, S.sunY, -1]));
  gl.uniform2fv(pComp.u('uSunUV'), sunUV); gl.uniform1f(pComp.u('uFlare'), S.flare ?? 0); gl.uniform1f(pComp.u('uBloom'), S.bloom ?? .5);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  // ---- pass C: post ----
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.useProgram(pPost); common(pPost);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tComp.tex); gl.uniform1i(pPost.u('uSrc'), 0);
  gl.uniform1f(pPost.u('uGlitch'), S.glitch || 0); gl.uniform1f(pPost.u('uVhs'), S.vhs ?? .35); gl.uniform1f(pPost.u('uJpeg'), S.jpeg ?? .45);
  gl.uniform1f(pPost.u('uDither'), S.dither ?? 40); gl.uniform1f(pPost.u('uScan'), S.scan ?? .07); gl.uniform1f(pPost.u('uSeed'), S.seed || 0); gl.uniform1f(pPost.u('uVhsY'), S.vhsY ?? ((t * .11 + .35) % 1));
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

window.DUR = DUR;
window.render = t => draw(t);
window.EV = [
  ...Object.values(POPS).map(b => ({ t: B(b), type: 'pop' })),
  ...TICKS.map(b => ({ t: B(b), type: 'tick' })), ...BLOOPS.map(b => ({ t: B(b), type: 'bloop' })),
  ...GLITCH.map(t => ({ t, type: 'glitch' })),
  { t: B(SB[3]), type: 'gate' }, { t: B(BELL), type: 'bell' }, { t: B(FILL), type: 'fill' }, { t: B(SPIN0), type: 'spin' },
  { t: B(CLICK), type: 'click' }, { t: B(CLOSE_DLG), type: 'close' }, { t: B(CLOSE_INST), type: 'close' }, { t: B(55.5), type: 'sparkle' },
].sort((a, b) => a.t - b.t);
// every text the story shows, with its box, for readcheck (the percentage and the pixel buttons are decoration)
window.TEXTS = t => {
  const out = [];
  for (const w of stateAt(t).windows) {
    if (w.p < .6) continue;
    const txt = (w.kind === 'install' ? [w.line1, w.line2] : w.kind === 'list' ? [w.title, ...w.items] : w.lines).join(' / ');   // title bar and the repeated status line are furniture
    out.push({ id: w.id, text: txt, x0: w.x, y0: w.y, x1: w.x + w.w, y1: w.y + w.h });
  }
  return out;
};
(async () => {
  await Promise.all(['700 40px Unbounded', '900 40px Unbounded', '700 19px Silkscreen', '400 19px Silkscreen', '30px VT323'].map(f => document.fonts.load(f, 'SUMMER 0123 abc')));
  await document.fonts.ready;
  uploadSDF(buildTextSDF('SUMMER', '900 330px Unbounded'));
  window.READY = true;
})();
