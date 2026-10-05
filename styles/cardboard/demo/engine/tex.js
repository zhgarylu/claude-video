// tex.js: procedural canvas textures for cardboard (kraft faces, the flute profile on cut edges, the mat, tapes).
// Everything is seeded, so any frame renders alone and identically.
import * as THREE from 'three';
import { mulberry } from '/core/lib.js';

export const PITCH = 0.65, TH = 0.4, LINER = 0.075;   // cm: flute pitch (one wave), board thickness, liner thickness
export const TILE = PITCH * 16;                        // the face texture covers 16 flutes

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, o = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  if (o.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// tileable value noise: lattice per octave, smooth-interpolated with wrap, composited with overlay
function fbm(ctx, w, h, rnd, amp = 1, oct = 5, base = 4) {
  const out = cv(w, h), oc = out.getContext('2d'), id = oc.createImageData(w, h), acc = new Float32Array(w * h);
  let tot = 0;
  for (let o = 0; o < oct; o++) {
    const n = base << o, lat = new Float32Array(n * n); for (let i = 0; i < lat.length; i++) lat[i] = rnd();
    const wt = 1 / (o + 1); tot += wt;
    for (let y = 0; y < h; y++) { const fy = y / h * n, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), r0 = (y0 % n) * n, r1 = ((y0 + 1) % n) * n;
      for (let x = 0; x < w; x++) { const fx = x / w * n, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), c0 = x0 % n, c1 = (x0 + 1) % n;
        const a = lat[r0 + c0] + (lat[r0 + c1] - lat[r0 + c0]) * sx, b = lat[r1 + c0] + (lat[r1 + c1] - lat[r1 + c0]) * sx;
        acc[y * w + x] += (a + (b - a) * sy) * wt; } }
  }
  for (let i = 0; i < w * h; i++) { const v = Math.max(0, Math.min(255, (acc[i] / tot - .5) * 2.2 * 255 + 128)); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
  oc.putImageData(id, 0, 0);
  ctx.save(); ctx.globalAlpha = Math.min(1, amp); ctx.globalCompositeOperation = 'overlay'; ctx.drawImage(out, 0, 0); ctx.restore();
}
const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
export const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// ---- a board face: kraft paper with fibre, flecks and the faint ridges of the flutes printing through
const faceCache = {};
export function faceTextures(tone = 'outer', seed = 1) {
  const key = tone + seed; if (faceCache[key]) return faceCache[key];
  const S = 1024, c = cv(S, S), x = c.getContext('2d'), rnd = mulberry(seed * 977 + (tone === 'outer' ? 1 : 2));
  const base = tone === 'outer' ? rgb('#8c6a43') : tone === 'pale' ? rgb('#b39468') : rgb('#a08058');
  x.fillStyle = css(base); x.fillRect(0, 0, S, S);
  fbm(x, S, S, rnd, 0.22, 5, 8);
  // fibre: short curved strokes, light and dark
  for (let i = 0; i < 5200; i++) {
    const px = rnd() * S, py = rnd() * S, a = rnd() * Math.PI, l = 6 + rnd() * 26, dark = rnd() < .5;
    x.strokeStyle = dark ? css(mix(base, [60, 35, 15], .5), .10 + rnd() * .08) : css(mix(base, [250, 230, 190], .55), .10 + rnd() * .08); x.lineWidth = .6 + rnd() * .7;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l * .5 + (rnd() - .5) * 4, py + Math.sin(a) * l * .5 + (rnd() - .5) * 4, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  // dark flecks (recycled fibre)
  for (let i = 0; i < 380; i++) { x.fillStyle = css([70, 45, 25], .25 + rnd() * .3); const r = .6 + rnd() * 1.6; x.beginPath(); x.ellipse(rnd() * S, rnd() * S, r * 1.5, r, rnd() * 3, 0, 7); x.fill(); }
  // flutes printing through: soft bands, one per pitch (64 px)
  const bands = 16, bw = S / bands;
  for (let i = 0; i < bands; i++) {
    const g = x.createLinearGradient(i * bw, 0, (i + 1) * bw, 0);
    g.addColorStop(0, 'rgba(255,235,200,0.05)'); g.addColorStop(.5, 'rgba(60,35,15,0.13)'); g.addColorStop(1, 'rgba(255,235,200,0.05)');
    x.fillStyle = g; x.fillRect(i * bw, 0, bw, S);
  }
  const map = tex(c);
  // bump: bands + fibre, grey
  const b = cv(S, S), bx = b.getContext('2d'); bx.fillStyle = '#808080'; bx.fillRect(0, 0, S, S);
  for (let i = 0; i < bands; i++) { const g = bx.createLinearGradient(i * bw, 0, (i + 1) * bw, 0); g.addColorStop(0, '#9a9a9a'); g.addColorStop(.5, '#606060'); g.addColorStop(1, '#9a9a9a'); bx.fillStyle = g; bx.fillRect(i * bw, 0, bw, S); }
  fbm(bx, S, S, rnd, 0.5, 5, 16);
  const bump = tex(b, { srgb: false });
  return faceCache[key] = { map, bump };
}

// ---- the cut edge of a board seen along the flutes: liner, wave, liner, drawn at pitch x thickness
const edgeCache = {};
export function edgeTextures(seed = 3) {
  if (edgeCache[seed]) return edgeCache[seed];
  const pw = 260, ph = Math.round(pw * TH / PITCH), c = cv(pw, ph), x = c.getContext('2d'), rnd = mulberry(seed * 31 + 7);
  const lin = Math.round(ph * LINER / TH * 1.25);          // liners drawn a little thick so they read
  // the hollow of each flute: warm dark with a lighter floor
  const g = x.createLinearGradient(0, 0, 0, ph); g.addColorStop(0, '#6a4727'); g.addColorStop(.5, '#7c5630'); g.addColorStop(1, '#6a4727');
  x.fillStyle = g; x.fillRect(0, 0, pw, ph);
  // liners (top = outer kraft, bottom = paler inner)
  const lt = x.createLinearGradient(0, 0, 0, lin); lt.addColorStop(0, '#b9894f'); lt.addColorStop(1, '#9c6f3b');
  x.fillStyle = lt; x.fillRect(0, 0, pw, lin);
  const lb = x.createLinearGradient(0, ph - lin, 0, ph); lb.addColorStop(0, '#c9a46f'); lb.addColorStop(1, '#d6b57e');
  x.fillStyle = lb; x.fillRect(0, ph - lin, pw, lin);
  // the wave (fluting medium): one sine per tile, stroke as thick as the paper, paler than the liners
  const mid = ph / 2, amp = (ph - 2 * lin) / 2 - 7, wt = Math.max(9, ph * .075);
  const wave = (dx, off) => { x.beginPath(); for (let i = 0; i <= 120; i++) { const u = i / 120, px = u * pw + dx, py = mid + off + Math.sin(u * 2 * Math.PI - Math.PI / 2) * amp; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); };
  x.lineCap = 'butt'; x.lineJoin = 'round';
  x.strokeStyle = 'rgba(40,22,8,.55)'; x.lineWidth = wt + 5; for (const dx of [0, -pw, pw]) wave(dx, 1.5);   // shadow side
  x.strokeStyle = '#d9b27a'; x.lineWidth = wt; for (const dx of [0, -pw, pw]) wave(dx, 0);
  x.strokeStyle = 'rgba(255,240,205,.35)'; x.lineWidth = 2; for (const dx of [0, -pw, pw]) wave(dx, -wt * .25);
  // glue lines where the wave meets the liners
  x.fillStyle = 'rgba(235,215,170,.8)';
  for (const u of [0, 0.5, 1]) { const px = u * pw, py = u === .5 ? ph - lin - 2 : lin + 2; x.beginPath(); x.ellipse(px, py, 11, 5, 0, 0, 7); x.fill(); }
  // paper grain on everything
  const id = x.getImageData(0, 0, pw, ph);
  for (let i = 0; i < pw * ph; i++) { const n = (rnd() - .5) * 22; id.data[i * 4] += n; id.data[i * 4 + 1] += n * .9; id.data[i * 4 + 2] += n * .8; }
  x.putImageData(id, 0, 0);
  const prof = tex(c);
  // the same edge cut along the flutes: three bands with the faint hollow between
  const lw = 64, lc = cv(lw, ph), lx = lc.getContext('2d');
  lx.fillStyle = lx.createLinearGradient(0, 0, 0, ph); const gg = lx.fillStyle; gg.addColorStop(0, '#b0834d'); gg.addColorStop(.2, '#a6783f'); gg.addColorStop(.26, '#8c6636'); gg.addColorStop(.5, '#a07a49'); gg.addColorStop(.74, '#8c6636'); gg.addColorStop(.8, '#cba670'); gg.addColorStop(1, '#d6b57e');
  lx.fillRect(0, 0, lw, ph);
  const lid = lx.getImageData(0, 0, lw, ph); for (let i = 0; i < lw * ph; i++) { const n = (rnd() - .5) * 18; lid.data[i * 4] += n; lid.data[i * 4 + 1] += n; lid.data[i * 4 + 2] += n * .8; } lx.putImageData(lid, 0, 0);
  const len = tex(lc);
  return edgeCache[seed] = { prof, len };
}

// ---- cutting mat: dark green, pale grid, numbers along two edges, old cut scars
export function matTexture(wcm, hcm, pxcm = 10) {
  const W = Math.round(wcm * pxcm), H = Math.round(hcm * pxcm), c = cv(W, H), x = c.getContext('2d'), rnd = mulberry(404);
  x.fillStyle = '#2c5a4b'; x.fillRect(0, 0, W, H); { const sm = cv(W >> 2, H >> 2); fbm(sm.getContext('2d'), W >> 2, H >> 2, rnd, 1, 4, 4); x.save(); x.globalAlpha = .25; x.globalCompositeOperation = 'overlay'; x.drawImage(sm, 0, 0, W, H); x.restore(); }
  // scars from old cuts
  for (let i = 0; i < 120; i++) { const px = rnd() * W, py = rnd() * H, a = rnd() < .6 ? (rnd() < .5 ? 0 : Math.PI / 2) + (rnd() - .5) * .12 : rnd() * Math.PI, l = 20 + rnd() * 180; x.strokeStyle = `rgba(185,215,195,${.04 + rnd() * .07})`; x.lineWidth = .6 + rnd() * .8; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  // grid: 1 cm faint, 5 cm clear, 10 cm bold
  for (let i = 0; i <= wcm; i++) { const mj = i % 10 === 0, md = i % 5 === 0; x.strokeStyle = `rgba(228,240,215,${mj ? .55 : md ? .36 : .16})`; x.lineWidth = mj ? 1.6 : md ? 1.1 : .7; x.beginPath(); x.moveTo(i * pxcm, 0); x.lineTo(i * pxcm, H); x.stroke(); }
  for (let j = 0; j <= hcm; j++) { const mj = j % 10 === 0, md = j % 5 === 0; x.strokeStyle = `rgba(228,240,215,${mj ? .55 : md ? .36 : .16})`; x.lineWidth = mj ? 1.6 : md ? 1.1 : .7; x.beginPath(); x.moveTo(0, j * pxcm); x.lineTo(W, j * pxcm); x.stroke(); }
  x.fillStyle = 'rgba(232,244,220,.55)'; x.font = '600 15px Barlow, sans-serif'; x.textAlign = 'center';
  for (let i = 0; i <= wcm; i += 5) x.fillText(String(i), i * pxcm, 16);
  x.textAlign = 'left'; for (let j = 5; j <= hcm; j += 5) x.fillText(String(j), 6, j * pxcm + 5);
  // angle fan in a corner
  x.strokeStyle = 'rgba(228,240,215,.3)'; x.lineWidth = 1; for (let a = 0; a <= 90; a += 15) { x.beginPath(); x.moveTo(W - 40, H - 40); x.lineTo(W - 40 - Math.cos(a * Math.PI / 180) * 280, H - 40 - Math.sin(a * Math.PI / 180) * 280); x.stroke(); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 4; return t;
}

// ---- tape: masking (cream, matte, fibrous) and packing (brown, glossy)
export function tapeTexture(kind = 'mask', seed = 4) {
  const w = 512, h = 128, c = cv(w, h), x = c.getContext('2d'), rnd = mulberry(seed * 13 + 5);
  const base = kind === 'mask' ? rgb('#e6d6a8') : rgb('#c19a5f');
  x.fillStyle = css(base); x.fillRect(0, 0, w, h); fbm(x, w, h, rnd, kind === 'mask' ? .5 : .12, 5, 4);
  if (kind === 'mask') for (let i = 0; i < 900; i++) { x.strokeStyle = `rgba(150,120,70,${.05 + rnd() * .1})`; x.lineWidth = .7; const px = rnd() * w, py = rnd() * h; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (rnd() - .5) * 18, py + (rnd() - .5) * 4); x.stroke(); }
  else for (let i = 0; i < 30; i++) { x.strokeStyle = `rgba(255,230,180,${.04 + rnd() * .06})`; x.lineWidth = 1 + rnd() * 3; const py = rnd() * h; x.beginPath(); x.moveTo(0, py); x.lineTo(w, py + (rnd() - .5) * 8); x.stroke(); }
  return tex(c);
}
export { cv, tex, fbm, css };
