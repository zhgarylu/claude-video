// paper.js: procedural paper (fibre, grain, printed patterns, normal map) and the paper material
// (two-sided colour, crease lines that accumulate wear, paper-space normal tilt along creases).
import * as THREE from 'three';
import { mulberry } from '/core/lib.js';

const css = (c, a = 1) => { const n = new THREE.Color(c); return `rgba(${Math.round(n.r * 255)},${Math.round(n.g * 255)},${Math.round(n.b * 255)},${a})`; };
const mk = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const wrapped = (W, H, wrap, fn) => { if (!wrap) return fn(0, 0); for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) fn(dx, dy); };

// strands shared by colour and height so the fibres you see are also the relief you light
function strands(rng, W, H, n, o) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const long = rng() < o.longP, len = long ? o.longLen * (.5 + rng()) : o.len * (.4 + rng() * 1.2);
    const x = rng() * W, y = rng() * H, a = rng() * Math.PI * 2, bend = (rng() - .5) * (long ? 1.4 : .9);
    out.push({ x, y, a, len, bend, w: (long ? 1.2 : .5) + rng() * .6, light: rng() < o.lightP, al: .04 + rng() * .08, long });
  }
  return out;
}
function drawStrand(ctx, s, dx, dy, col, mul = 1) {
  const ex = s.x + dx + Math.cos(s.a) * s.len, ey = s.y + dy + Math.sin(s.a) * s.len;
  const cx = s.x + dx + Math.cos(s.a + s.bend) * s.len * .5, cy = s.y + dy + Math.sin(s.a + s.bend) * s.len * .5;
  ctx.strokeStyle = col; ctx.lineWidth = s.w * mul; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(s.x + dx, s.y + dy); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
}
function blobs(ctx, rng, W, H, n, r0, r1, colA, colB, al, wrap) {
  for (let i = 0; i < n; i++) {
    const x = rng() * W, y = rng() * H, r = r0 + rng() * (r1 - r0), c = rng() < .5 ? colA : colB;
    wrapped(W, H, wrap, (dx, dy) => { const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r); g.addColorStop(0, css(c, al * (.4 + rng() * .6))); g.addColorStop(1, css(c, 0)); ctx.fillStyle = g; ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2); });
  }
}
function grain(ctx, rng, W, H, amt) {
  const id = ctx.getImageData(0, 0, W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const g = 1 + (rng() - .5) * amt; d[i] = Math.min(255, d[i] * g); d[i + 1] = Math.min(255, d[i + 1] * g); d[i + 2] = Math.min(255, d[i + 2] * g); }
  ctx.putImageData(id, 0, 0);
}
function normalFrom(hc, k) {
  const W = hc.width, H = hc.height, h = hc.getContext('2d').getImageData(0, 0, W, H).data, nc = mk(W, H), nctx = nc.getContext('2d'), out = nctx.createImageData(W, H), o = out.data;
  const g = (x, y) => h[(((y + H) % H) * W + ((x + W) % W)) * 4];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = (g(x - 1, y) - g(x + 1, y)) * k / 255, ny = (g(x, y + 1) - g(x, y - 1)) * k / 255, nz = 1, l = Math.hypot(nx, ny, nz), i = (y * W + x) * 4;
    o[i] = (nx / l * .5 + .5) * 255; o[i + 1] = (ny / l * .5 + .5) * 255; o[i + 2] = (nz / l * .5 + .5) * 255; o[i + 3] = 255;
  }
  nctx.putImageData(out, 0, 0); return nc;
}
const tex = (c, srgb, wrap) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };

// printed patterns for the reverse of a sheet (pattern units are canvas pixels at 2048 across)
const PATTERNS = {
  none: () => {},
  dots: (ctx, W, H, col) => { ctx.fillStyle = css(col, .55); const s = W / 26; for (let y = 0; y < H / s + 1; y++) for (let x = 0; x < W / s + 1; x++) { ctx.beginPath(); ctx.arc((x + (y & 1) * .5) * s, y * s * .86, W / 480, 0, 7); ctx.fill(); } },
  grid: (ctx, W, H, col) => { ctx.strokeStyle = css(col, .35); ctx.lineWidth = W / 1400; const s = W / 30; for (let x = 0; x < W; x += s) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y < H; y += s) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } },
  waves: (ctx, W, H, col) => { ctx.strokeStyle = css(col, .5); ctx.lineWidth = W / 900; const r = W / 38; for (let row = 0; row < H / (r * .5) + 2; row++) for (let c = -1; c < W / (r * 2) + 2; c++) { const x = c * r * 2 + (row & 1) * r, y = row * r * .5; for (let k = 3; k >= 1; k--) { ctx.beginPath(); ctx.arc(x, y, r * k / 3, Math.PI, 0); ctx.stroke(); } } },
  stripes: (ctx, W, H, col) => { ctx.fillStyle = css(col, .5); const s = W / 40; for (let x = 0; x < W; x += s * 2) ctx.fillRect(x, 0, s * .55, H); },
};

// a sheet's two faces + fibre normal map. spec: { front, back, backPattern, patternColor, frontPattern, seed, w, h, px }
export function sheetTextures(spec) {
  const px = spec.px ?? 2048, W = px, H = Math.round(px * (spec.h ?? 1) / (spec.w ?? 1)), rng = mulberry(spec.seed ?? 7);
  const st = strands(rng, W, H, Math.round(W * H / 230), { len: W / 80, longLen: W / 14, longP: .04, lightP: .78 });
  const face = (base, pattern, pcol, long) => {
    const c = mk(W, H), x = c.getContext('2d'); x.fillStyle = css(base); x.fillRect(0, 0, W, H);
    blobs(x, rng, W, H, 140, W / 14, W / 3, '#ffffff', '#000000', .04, false);
    if (pattern && PATTERNS[pattern]) PATTERNS[pattern](x, W, H, pcol ?? '#27365e', rng);
    for (const s of st) { if (s.long && !long) continue; drawStrand(x, s, 0, 0, s.light ? `rgba(255,250,240,${s.al * (s.long ? .8 : 1)})` : `rgba(40,30,20,${s.al * .55})`); }
    grain(x, rng, W, H, .045); return c;
  };
  const front = face(spec.front, spec.frontPattern, spec.patternColor, true), back = face(spec.back, spec.backPattern ?? 'none', spec.patternColor, true);
  const hc = mk(W, H), hx = hc.getContext('2d'); hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, H);
  blobs(hx, rng, W, H, 90, W / 30, W / 8, '#ffffff', '#000000', .06, false);
  for (const s of st) drawStrand(hx, s, 0, 0, s.light ? `rgba(255,255,255,${s.al * 1.8})` : `rgba(0,0,0,${s.al * 1.4})`);
  grain(hx, rng, W, H, .22);
  return { front: tex(front, true), back: tex(back, true), normal: tex(normalFrom(hc, spec.bump ?? 2.4), false), W, H };
}

// a large repeating tabletop of paper (tile = tileM metres)
export function tableTextures(spec) {
  const W = 2048, H = 2048, rng = mulberry(spec.seed ?? 3), c = mk(W, H), x = c.getContext('2d');
  x.fillStyle = css(spec.color ?? '#b9b2a3'); x.fillRect(0, 0, W, H);
  blobs(x, rng, W, H, 90, W / 8, W / 3, '#ffffff', '#3a2e22', .035, true);
  const st = strands(rng, W, H, 38000, { len: W / 160, longLen: W / 30, longP: .03, lightP: .5 });
  for (const s of st) wrapped(W, H, true, (dx, dy) => { if (Math.abs(dx) + Math.abs(dy) && (s.x + dx < -W / 10 || s.x + dx > W * 1.1 || s.y + dy < -H / 10 || s.y + dy > H * 1.1)) return; drawStrand(x, s, dx, dy, s.light ? `rgba(255,250,240,${s.al * .45})` : `rgba(50,40,30,${s.al * .3})`); });
  grain(x, rng, W, H, .05);
  const hc = mk(W, H), hx = hc.getContext('2d'); hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, H);
  blobs(hx, rng, W, H, 160, W / 40, W / 10, '#ffffff', '#000000', .08, true);
  for (const s of st) wrapped(W, H, true, (dx, dy) => { if (Math.abs(dx) + Math.abs(dy) && (s.x + dx < -W / 10 || s.x + dx > W * 1.1 || s.y + dy < -H / 10 || s.y + dy > H * 1.1)) return; drawStrand(hx, s, dx, dy, s.light ? `rgba(255,255,255,${s.al * 1.6})` : `rgba(0,0,0,${s.al * 1.3})`); });
  grain(hx, rng, W, H, .3);
  const map = tex(c, true, true), normal = tex(normalFrom(hc, 3.2), false, true);
  return { map, normal };
}

// crease data for one sheet: segments (two texels each) and a per-op strength row
export function creaseTextures(sheet) {
  const segs = sheet.mesh.segData, SW = 1024, n = Math.max(1, segs.length), rows = Math.ceil(n * 2 / SW);
  const data = new Float32Array(SW * rows * 4);
  segs.forEach((s, i) => { const a = i * 2 * 4; data.set([s[0], s[1], s[2], s[3]], a); data.set([s[4], s[5], s[6], 0], a + 4); });
  const tSeg = new THREE.DataTexture(data, SW, rows, THREE.RGBAFormat, THREE.FloatType); tSeg.needsUpdate = true; tSeg.minFilter = tSeg.magFilter = THREE.NearestFilter;
  const od = new Float32Array(128 * 4), tOp = new THREE.DataTexture(od, 128, 1, THREE.RGBAFormat, THREE.FloatType); tOp.minFilter = tOp.magFilter = THREE.NearestFilter; tOp.needsUpdate = true;
  return { tSeg, tOp, SW, od };
}

let uid = 0;
// the paper material: MeshStandardMaterial + two-sided colour + creases
export function paperMaterial(tx, cr, o = {}) {
  const m = new THREE.MeshStandardMaterial({ map: tx.front, normalMap: tx.normal, normalScale: new THREE.Vector2(o.fibre ?? .55, o.fibre ?? .55), roughness: o.rough ?? .9, metalness: 0, side: THREE.DoubleSide });
  m.shadowSide = THREE.DoubleSide;
  const key = 'paper' + (uid++);
  m.customProgramCacheKey = () => key;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.mapBack = { value: tx.back }; sh.uniforms.tSeg = { value: cr.tSeg }; sh.uniforms.tOp = { value: cr.tOp };
    sh.uniforms.creaseAmp = { value: o.crease ?? 1 };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 paper; attribute vec2 segr; varying vec2 vPaper; flat varying vec2 vSegr;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaper = paper; vSegr = segr;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vPaper; flat varying vec2 vSegr; uniform sampler2D mapBack; uniform sampler2D tSeg; uniform sampler2D tOp; uniform float creaseAmp;
        vec2 creaseN = vec2(0.);`)
      .replace('#include <map_fragment>', `
        float fdir = gl_FrontFacing ? 1.0 : -1.0;
        vec4 sampledDiffuseColor = gl_FrontFacing ? texture2D(map, vMapUv) : texture2D(mapBack, vMapUv);
        diffuseColor *= sampledDiffuseColor;
        creaseN = vec2(0.);
        {
          int s0 = int(vSegr.x + .5), cnt = int(vSegr.y + .5);
          for (int i = 0; i < 40; i++) {
            if (i >= cnt) break;
            int idx = (s0 + i) * 2;
            vec4 e = texelFetch(tSeg, ivec2(idx % 1024, idx / 1024), 0);
            vec4 m = texelFetch(tSeg, ivec2((idx + 1) % 1024, (idx + 1) / 1024), 0);
            float str = texelFetch(tOp, ivec2(int(m.x + .5), 0), 0).r * creaseAmp;
            if (str < .002) continue;
            vec2 a = e.xy, ab = e.zw - e.xy; float L2 = max(dot(ab, ab), 1e-12);
            float tt = clamp(dot(vPaper - a, ab) / L2, 0., 1.);
            vec2 dv = vPaper - (a + ab * tt); float d = length(dv);
            vec2 nl = normalize(vec2(-ab.y, ab.x)); float sg = dot(vPaper - a, nl);
            float core = exp(-d * d / (2. * 1.3e-4 * 1.3e-4)), broad = exp(-d * d / (2. * 6e-4 * 6e-4));
            float nz = fract(sin(dot(floor(vPaper * 5200.), vec2(12.9898, 78.233))) * 43758.5453);
            vec3 white = mix(diffuseColor.rgb, vec3(.95, .92, .86), .75);
            diffuseColor.rgb = mix(diffuseColor.rgb, white, m.y * str * core * (.45 + .55 * nz));
            diffuseColor.rgb *= 1. - .16 * str * broad;
            float W = 1.5e-3, amp = .2 * str * step(abs(sg), W) * (1. - abs(sg) / W);
            creaseN += -m.z * amp * clamp(sg / 4e-4, -1., 1.) * nl;
          }
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec3 q0 = dFdx(-vViewPosition), q1 = dFdy(-vViewPosition); vec2 st0 = dFdx(vPaper), st1 = dFdy(vPaper);
          vec3 q1p = cross(q1, normal), q0p = cross(normal, q0);
          vec3 T = q1p * st0.x + q0p * st1.x, B = q1p * st0.y + q0p * st1.y;
          float det = max(dot(T, T), dot(B, B)); float sc = det == 0. ? 0. : inversesqrt(det); T *= sc; B *= sc;
          normal = normalize(normal + fdir * (T * creaseN.x + B * creaseN.y));
        }`);
  };
  return m;
}

// update the strength row: a crease shows once its fold has been made, and stays
export function updateCreases(sheet, cr, t) {
  sheet.ops.forEach((op, k) => { const pk = sheet.peakAt(op, t); const x = Math.min(1, Math.max(0, pk / .22)); cr.od[k * 4] = x * x * (3 - 2 * x); });
  cr.tOp.needsUpdate = true;
}
