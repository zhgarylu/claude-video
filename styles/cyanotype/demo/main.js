// "Reading the Sun": a test strip, six bands, one real sheet. Everything is drawn in code; t = film seconds (timeline.js).
import { clamp, lerp, seg, ss, eo, ei, eio, mulberry, hash, track } from '/core/lib.js';
import { Plate } from './engine/plate.js';
import { makeNoise } from './engine/noise.js';
import { frond, feather, fan, umbel, grass, plan } from './engine/shapes.js';
import * as TL from './timeline.js';
const { T, DUR, CAM, EV, BANDS, cardEdge, sunAt, sun2At, Itot1, dose2 } = TL;

const cv = document.getElementById('c'), out = cv.getContext('2d'), W = 1920, H = 1080;
const Q = new URLSearchParams(location.search);
const rt = (t, a, b) => clamp((t - a) / (b - a));
const INK = '#143a74', WHITE = 'rgba(250,252,255,.97)';
let SUBS = [], BOARD = null, WALL = null, DAPPLE = null, LAST = null;
const P = {}, SPR = {};            // plates and sprites

// ---------------------------------------------------------------- the sheets
const ORG = { hs: [60, 10], st: [80, 120], rs: [210, 0] };       // top-left of each plate in the world
const SP_W = 560, SP_H = 700;

function buildPlates() {
  const nz = makeNoise(77);
  // the hook sheet: a big frond, washed from the top down
  P.hs = new Plate({ w: 1800, h: 920, seed: 11, coat: { x0: 100, x1: 1700, y0: 70, y1: 850, strokeH: 210, thick: 0.86 }, sheen: { fx: 0.03, fy: 0.006 }, tide: { levels: [0.3, 0.55, 0.8], line: 0.08, drips: 9 },
    front: (x, y) => (y / 920) * 0.8 + (nz.fbm(x * 0.0032, y * 0.0032 + 5, 3) - 0.5) * 0.34 + Math.sin(x * 0.011) * 0.012 });
  P.hs.setLight(g => frond(g, [[1560, 840], [1640, 380], [1010, 90], [330, 400]], { mode: 'mask', pairs: 34, Lmax: 330, wmax: 0.1, g: 34, stem: 11, seed: 2 }), 0.7);
  // the test strip
  P.st = new Plate({ w: 1760, h: 660, seed: 23, coat: { x0: 100, x1: 1660, y0: 96, y1: 520, strokeH: 190, thick: 0.86 }, sheen: { fx: 0.004, fy: 0.045 }, tide: { levels: [0.35, 0.6], line: 0.05, drips: 4, dx0: 0.2, dx1: 0.6 },
    front: (x, y) => ((x - 100) / 1560) * 0.86 + (nz.fbm(x * 0.004, y * 0.006, 3) - 0.5) * 0.12 + Math.sin(y * 0.02) * 0.012 });
  P.st.setLight(g => frond(g, [[150, 330], [560, 250], [1000, 400], [1620, 310]], { mode: 'mask', pairs: 40, Lmax: 190, wmax: 0.11, g: 58, stem: 9, seed: 5 }), 0.6);
  // the real sheet
  P.rs = new Plate({ w: 1500, h: 940, seed: 31, coat: { x0: 90, x1: 1410, y0: 70, y1: 790, strokeH: 210, thick: 0.86 }, sheen: { fx: 0.03, fy: 0.006 }, tide: { levels: [0.3, 0.55, 0.8], line: 0.09, drips: 8 },
    front: (x, y) => (y / 940) * 0.8 + (nz.fbm(x * 0.003 + 9, y * 0.003, 3) - 0.5) * 0.36 + Math.sin(x * 0.009) * 0.014 });
  P.rs.setLight(g => {
    frond(g, [[170, 770], [300, 380], [760, 360], [1200, 150]], { mode: 'mask', pairs: 30, Lmax: 300, wmax: 0.11, g: 34, stem: 10, seed: 7 });
    feather(g, [[1340, 760], [820, 520], [420, 130]], { mode: 'mask', Lmax: 210, barbs: 120, g: 84, seed: 3, shaft: 6 });
  }, 0.8);
  // the line of prints
  const mk = (seed, draw, cf) => { const p = new Plate({ w: SP_W, h: SP_H, seed, coat: { x0: 50, x1: 510, y0: 50, y1: 540, strokeH: 190, thick: 0.86 }, tide: { drips: 3, line: 0.06 } }); p.setLight(draw, 0.8); return p; };
  P.sp = [
    mk(41, g => { fan(g, 270, 420, -1.57, 230, { mode: 'mask', g: 40 }); fan(g, 400, 200, -2.0, 120, { mode: 'mask', g: 40 }); }),
    mk(42, g => umbel(g, 280, 250, 190, { mode: 'mask', g: 50 })),
    mk(43, g => { grass(g, 260, 520, 420, { mode: 'mask', g: 20, n: 13 }); }),
    mk(44, g => plan(g, 110, 130, 340, 330, { mode: 'mask', t: 12 })),
  ];
  const states = [[5.5, 2], [6.4, 3], [4.6, 2], [6.0, 3]];
  P.sp.forEach((p, i) => { p.final = { dose: states[i][0], dry: 1, wash: 3, ts: null, tsKey: 0, E0: 4.2, g: 2.2 }; p.render(p.final); });
}

// ---------------------------------------------------------------- sprites (what the objects look like in the room)
function sprite(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g); return c; }
function buildSprites() {
  SPR.stFrond = sprite(1760, 660, g => frond(g, [[150, 330], [560, 250], [1000, 400], [1620, 310]], { mode: 'color', pairs: 40, Lmax: 190, wmax: 0.11, stem: 9, seed: 5 }));
  SPR.fern = sprite(1500, 940, g => frond(g, [[170, 770], [300, 380], [760, 360], [1200, 150]], { mode: 'color', pairs: 30, Lmax: 300, wmax: 0.11, stem: 10, seed: 7 }));
  SPR.feather = sprite(1500, 940, g => feather(g, [[1340, 760], [820, 520], [420, 130]], { mode: 'color', Lmax: 210, barbs: 120, seed: 3, shaft: 6 }));
}

// ---------------------------------------------------------------- board, wall, dapple light
function makeBoard() {
  const n = 512, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), r = mulberry(5);
  g.fillStyle = '#1e2428'; g.fillRect(0, 0, n, n);
  for (let y = 0; y < n; y += 3) { g.fillStyle = `rgba(255,255,255,${0.018 + r() * 0.02})`; g.fillRect(0, y, n, 1); }
  for (let x = 0; x < n; x += 3) { g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.05})`; g.fillRect(x, 0, 1, n); }
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${r() < .5 ? '255,250,235' : '0,0,0'},${0.02 + r() * 0.05})`; g.fillRect(r() * n, r() * n, 2 + r() * 40, 1); }
  return c;
}
function makeWall() {
  const n = 512, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), r = mulberry(9);
  g.fillStyle = '#6c7a76'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 260; i++) { const x = r() * n, y = r() * n, rad = 30 + r() * 120; const gr = g.createRadialGradient(x, y, 0, x, y, rad); const l = r() < .5; gr.addColorStop(0, l ? 'rgba(255,255,240,.025)' : 'rgba(0,10,10,.03)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < .5 ? '255,255,245' : '0,0,0'},${0.02 + r() * 0.04})`; g.fillRect(r() * n, r() * n, 1 + r() * 2, 1 + r() * 2); }
  return c;
}
function makeDapple() {
  const n = 1024, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), r = mulberry(21);
  g.fillStyle = '#fff'; g.fillRect(0, 0, n, n); g.filter = 'blur(16px)';
  for (let i = 0; i < 70; i++) {
    const x = r() * n, y = r() * n, rad = 30 + r() * 80; g.fillStyle = `rgba(40,50,40,${0.25 + r() * 0.35})`;
    for (const dx of [-n, 0, n]) for (const dy of [-n, 0, n]) { g.beginPath(); g.ellipse(x + dx, y + dy, rad, rad * (0.5 + r() * .5), r() * 3, 0, 6.283); g.fill(); }
  }
  return c;
}

// ---------------------------------------------------------------- pen: white gel pen on the blue, blue ink on the paper
let FONTS_OK = false;
function penText(c, text, x, y, size, prog, o = {}) {
  if (prog <= 0) return;
  c.save(); c.font = `700 ${size}px Pen, cursive`; c.textBaseline = 'alphabetic'; c.textAlign = o.align || 'left';
  const w = c.measureText(text).width, x0 = o.align === 'center' ? x - w / 2 : x;
  c.beginPath(); c.rect(x0 - 12, y - size * 1.1, (w + 24) * prog, size * 1.6); c.clip();
  c.fillStyle = o.color || WHITE; c.strokeStyle = o.color || WHITE; c.lineWidth = size * 0.012;
  c.translate(0, 0); c.fillText(text, x, y); c.strokeText(text, x, y);
  c.restore();
  if (prog < 1 && o.nib !== false) { const nx = x0 + w * prog; c.save(); c.fillStyle = o.color || WHITE; c.beginPath(); c.arc(nx, y - size * 0.22 + Math.sin(nx * 0.2) * size * 0.1, size * 0.045, 0, 6.283); c.fill(); c.restore(); }
  return w;
}
function textW(c, text, size) { c.save(); c.font = `700 ${size}px Pen, cursive`; const w = c.measureText(text).width; c.restore(); return w; }
function penCircle(c, cx, cy, rx, ry, prog, lw = 7) {
  if (prog <= 0) return; const n = 140, m = Math.floor(n * 1.1 * prog);
  c.save(); c.strokeStyle = WHITE; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
  for (let i = 0; i <= m; i++) {
    const a = -1.4 + (i / n) * 6.283, k = 1 + 0.022 * Math.sin(a * 3 + 1) + 0.02 * (i / n) + 0.012 * Math.sin(a * 7);
    const x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k; i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.stroke(); c.restore();
}

// ---------------------------------------------------------------- camera
const camTrack = track(CAM.map(k => [k[0], k[1]]));
function stripFollow(t) {                       // while the card is drawn off, the camera rides its edge
  let s = 0, n = 0; for (let k = 0; k < 12; k++) { const w = 1 - k / 12; s += cardEdge(t - k * 0.06) * w; n += w; }
  return s / n;
}
function camAt(t) {
  let [cx, cy, z] = camTrack(clamp(t, 0, DUR));
  const a = 17.0, b = 25.0;
  if (t > a && t < b) {
    const f = stripFollow(t) - 180, k = ss(seg(t, a, a + 1.2)) * (1 - ss(seg(t, b - 1.2, b)));
    const cx2 = clamp(f + 470, 640, 1330); cx = lerp(cx, cx2, k);
  }
  return { cx, cy, z };
}

// ---------------------------------------------------------------- drawing helpers
function drawSheet(c, plate, ox, oy, o = {}) {
  const cam = o.cam, pw = plate.w, ph = plate.h, lift = o.lift || 0;
  c.save();
  const px = ox + pw / 2, py = oy + ph / 2;
  c.translate(px + (o.dx || 0), py + (o.dy || 0)); if (o.rot) c.rotate(o.rot); const sc = o.scale || 1; c.scale(sc, sc);
  c.globalAlpha = o.alpha ?? 1;
  const z = cam.z * sc;
  c.shadowColor = `rgba(0,0,0,${0.45 + lift * 0.1})`; c.shadowBlur = (14 + lift * 70) * z; c.shadowOffsetX = (4 + lift * 60) * z; c.shadowOffsetY = (8 + lift * 110) * z;
  c.drawImage(plate.cv, -pw / 2, -ph / 2);
  c.restore();
}
function drawSprite(c, sp, ox, oy, o = {}) {      // a plant or feather above the sheet; h = height above the paper (0..1)
  const cam = o.cam, h = o.h || 0, al = o.alpha ?? 1; if (al <= 0.003) return;
  c.save(); c.translate(ox + sp.width / 2 + (o.dx || 0), oy + sp.height / 2 + (o.dy || 0)); if (o.rot) c.rotate(o.rot); const sc = 1 + 0.2 * h; c.scale(sc, sc); c.globalAlpha = al;
  const z = cam.z * sc;
  c.shadowColor = `rgba(0,0,0,${0.5 - 0.12 * h})`; c.shadowBlur = (5 + h * 46) * z; c.shadowOffsetX = (3 + h * 46) * z; c.shadowOffsetY = (5 + h * 80) * z;
  c.drawImage(sp, -sp.width / 2, -sp.height / 2);
  c.restore();
}
function drawBrush(c, x, y, wet, cam) {
  c.save(); c.translate(x, y); c.rotate(-0.46);
  c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 26 * cam.z; c.shadowOffsetX = 18 * cam.z; c.shadowOffsetY = 28 * cam.z;
  // handle
  const hg = c.createLinearGradient(0, -22, 0, 22); hg.addColorStop(0, '#b98a57'); hg.addColorStop(0.45, '#d8ae79'); hg.addColorStop(1, '#8a6038');
  c.fillStyle = hg; c.beginPath(); c.moveTo(40, -16); c.lineTo(620, -30); c.quadraticCurveTo(660, -30, 660, 0); c.quadraticCurveTo(660, 30, 620, 30); c.lineTo(40, 18); c.closePath(); c.fill();
  c.shadowColor = 'transparent';
  // ferrule
  const fg = c.createLinearGradient(0, -90, 0, 90); fg.addColorStop(0, '#6c7479'); fg.addColorStop(0.5, '#c4ccd0'); fg.addColorStop(1, '#5b6368');
  c.fillStyle = fg; c.fillRect(-4, -92, 56, 184); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(46, -92, 6, 184);
  // bristles: pale hair, lime at the working edge
  const bg = c.createLinearGradient(-110, 0, -4, 0); bg.addColorStop(0, wet ? '#bfd07a' : '#e4d6b2'); bg.addColorStop(0.28, '#d8c79c'); bg.addColorStop(1, '#bda97c');
  c.fillStyle = bg; c.beginPath(); c.moveTo(-4, -92); c.lineTo(-104, -88); c.quadraticCurveTo(-120, 0, -104, 88); c.lineTo(-4, 92); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(110,90,50,.35)'; c.lineWidth = 1.2; for (let i = -84; i <= 84; i += 6) { c.beginPath(); c.moveTo(-4, i); c.lineTo(-108 + Math.abs(i) * 0.1, i * 0.98); c.stroke(); }
  c.fillStyle = 'rgba(190,215,90,.65)'; c.beginPath(); c.moveTo(-96, -88); c.quadraticCurveTo(-118, 0, -96, 88); c.lineTo(-112, 80); c.quadraticCurveTo(-130, 0, -112, -80); c.closePath(); c.fill();
  c.restore();
}
function drawGlass(c, gx, t, cam) {
  const x0 = 56 + gx, y0 = 96, w = 1808, h = 710;
  c.save();
  c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 22 * cam.z; c.shadowOffsetX = 10 * cam.z; c.shadowOffsetY = 16 * cam.z;
  c.fillStyle = 'rgba(190,230,220,.10)'; c.fillRect(x0, y0, w, h); c.shadowColor = 'transparent';
  c.strokeStyle = 'rgba(200,245,235,.55)'; c.lineWidth = 4; c.strokeRect(x0 + 2, y0 + 2, w - 4, h - 4);
  c.strokeStyle = 'rgba(20,60,60,.35)'; c.lineWidth = 2; c.strokeRect(x0 + 8, y0 + 8, w - 16, h - 16);
  c.save(); c.beginPath(); c.rect(x0, y0, w, h); c.clip();
  const gs = ((t * 40) % 1) * 0, sl = x0 + 300 + gs;
  for (const [off, wd, al] of [[0, 120, .10], [190, 40, .08], [700, 220, .06], [1100, 60, .07]]) {
    c.fillStyle = `rgba(255,255,255,${al})`; c.beginPath(); c.moveTo(x0 + off + 260, y0); c.lineTo(x0 + off + 260 + wd, y0); c.lineTo(x0 + off + wd - 160, y0 + h); c.lineTo(x0 + off - 160, y0 + h); c.closePath(); c.fill();
  }
  c.restore(); c.restore();
}
function drawCard(c, xe, cam, lift = 0) {
  c.save();
  c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 24 * cam.z; c.shadowOffsetX = 12 * cam.z; c.shadowOffsetY = 18 * cam.z;
  const g = c.createLinearGradient(xe - 1900, 0, xe, 0); g.addColorStop(0, '#15181b'); g.addColorStop(1, '#1d2125');
  c.fillStyle = g; c.fillRect(xe - 1900, 90, 1900, 730); c.shadowColor = 'transparent';
  c.fillStyle = 'rgba(255,255,255,.16)'; c.fillRect(xe - 3, 90, 3, 730);          // the cut edge catches the light
  c.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < 40; i++) c.fillRect(xe - 1900 + hash(i * 3.3) * 1900, 90 + hash(i * 7.1) * 730, 40 + hash(i) * 120, 1);
  c.restore();
}

// ---------------------------------------------------------------- state of each sheet at time t
let TSCOL = null, TSKEY = 1;
function stripTs() {
  if (TSCOL) return TSCOL;
  const w = P.st.w, tp = new Float32Array(w).fill(1e9);
  for (let tt = 17.0; tt < 26.5; tt += 0.004) { const xe = cardEdge(tt) - ORG.st[0]; for (let x = 0; x < w; x++) if (tp[x] > 1e8 && xe <= x) tp[x] = tt; }
  const ts = new Float32Array(w);
  for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let k = -9; k <= 9; k++) { const xx = Math.min(w - 1, Math.max(0, x + k)); s += tp[xx]; n++; } ts[x] = Itot1(s / n); if (tp[x] > 1e8) ts[x] = 1e6; }
  return (TSCOL = ts);
}
function hsState(t) {
  const u = ss(rt(t, 0, 6.6));
  return { dose: 6.5, wash: lerp(0.30, 1.2, u), dry: ss(rt(t, 0, 16)) * 0.3, preK: 0.1, g: 2.2, E0: 4.2, fog: 0.1, flow: Math.floor(t * 70), soft: 0.05 };
}
function stState(t) {
  const s = { preK: 0.1, g: 2.2, E0: 4.0, fog: 0.1, soft: 0.06, flow: Math.floor(t * 90) };
  s.brush = t < T.coat0 ? -1 : t < T.coat0 + T.coatN * T.coatDt ? (t - T.coat0) / T.coatDt : 1e9;
  if (t < T.coat0 - 0.05) s.brush = -1;
  s.coatWet = t < T.coat0 + T.coatN * T.coatDt + 0.2 ? 1 : 1 - ss(rt(t, 12.7, 15.5));
  if (t >= T.uncover[0] - 0.4) { s.dose = Itot1(t); s.ts = stripTs(); s.tsKey = 1; }
  if (t >= T.wash1[0] - 0.01) s.wash = lerp(-0.2, 1.2, ss(rt(t, T.wash1[0], T.wash1[1])));
  if (t >= T.wash1[1]) s.dry = ss(rt(t, T.wash1[1], 44)) * 0.55; else s.dry = 0;
  return s;
}
function rsState(t) {
  const s = { preK: 0.1, g: 2.2, E0: 4.2, fog: 0.1, soft: 0.05, flow: Math.floor(t * 70), coatWet: 0, brush: 1e9 };
  s.dose = dose2(t);
  s.wash = t >= T.wash2[0] ? lerp(-0.2, 1.22, ss(rt(t, T.wash2[0], T.wash2[1]))) : -9;
  s.dry = t < T.wash2[1] ? 0 : ss(rt(t, T.wash2[1], T.dryEnd));
  return s;
}

// ---------------------------------------------------------------- objects falling, lying, lifting
function objPose(t, land, lift0, lift1, fromX, fromY) {
  // height above the sheet: falls in, rests, rises
  if (t < land - 0.5) return null;
  let h = 0, dx = 0, dy = 0, al = 1, rot = 0;
  if (t < land) { const u = (t - (land - 0.5)) / 0.5; h = Math.pow(1 - u, 2) * 1.6; dx = fromX * h * 0.4; dy = fromY * h * 0.4; al = ss(u * 2.2); }
  else if (t < land + 0.35) { const u = (t - land) / 0.35; h = 0.07 * Math.exp(-u * 4) * Math.abs(Math.cos(u * 9)); }
  if (lift0 != null && t >= lift0) { const u = clamp((t - lift0) / (lift1 - lift0)); const e = eio(u); h = e * 2.2; dx = 150 * e; dy = -240 * e; rot = 0.07 * e; al = 1 - ss((u - 0.3) / 0.7); if (u >= 1) return null; }
  return { h, dx, dy, al, rot };
}

// ---------------------------------------------------------------- the scenes
function drawScene(c, t) {
  const cam = camAt(t), cx = cam.cx, cy = cam.cy, z = cam.z;
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#12161a'; c.fillRect(0, 0, W, H);
  c.setTransform(z, 0, 0, z, W / 2 - cx * z, H / 2 - cy * z);
  const wall = t >= T.wall0;
  const R = 4400;
  if (!wall) { c.fillStyle = c.createPattern(BOARD, 'repeat'); c.fillRect(cx - R, cy - R, 2 * R, 2 * R); }
  else drawWall(c, t, cam);
  if (!wall) {
    const o = { cam };
    // the real sheet (underneath until the strip is lifted)
    if (t >= T.lift2[0] - 0.05 && t < T.hang[0] + 1e-6 || (t >= T.hang[0] && t < T.wall0)) {
      let lift = 0, dx = 0, dy = 0, rot = 0, sc = 1;
      if (t >= T.hang[0]) { const u = eio(rt(t, T.hang[0], T.hang[1])); lift = u; dx = 40 * u; dy = -420 * u; rot = 0.05 * u; sc = 1 + 0.26 * u; }
      drawSheet(c, (P.rs.render(rsState(t)), P.rs), ORG.rs[0], ORG.rs[1], { cam, lift, dx, dy, rot, scale: sc });
      const pf = objPose(t, T.fern, T.lift3[0], T.lift3[1], 1, -1), pb = objPose(t, T.feather, T.lift3[0] + 0.25, T.lift3[1] + 0.15, 1, -1);
      if (pf) drawSprite(c, SPR.fern, ORG.rs[0], ORG.rs[1], { cam, h: pf.h, dx: pf.dx, dy: pf.dy, rot: pf.rot, alpha: pf.al });
      if (pb) drawSprite(c, SPR.feather, ORG.rs[0], ORG.rs[1], { cam, h: pb.h, dx: pb.dx * 1.2, dy: pb.dy * 0.8, rot: pb.rot * -2, alpha: pb.al });
      if (t >= T.fern && t < T.sun2) drawSun(c, cam, 0);
    }
    // the strip
    if (t < T.lift2[1]) {
      let lift = 0, dx = 0, dy = 0, rot = 0, sc = 1;
      if (t >= T.lift2[0]) { const u = eio(rt(t, T.lift2[0], T.lift2[1])); lift = u; dx = -380 * u; dy = -520 * u; rot = -0.07 * u; sc = 1 + 0.16 * u; }
      c.save();
      if (t >= T.lift2[0]) { /* the whole stack lifts together */ }
      drawSheet(c, (P.st.render(stState(t)), P.st), ORG.st[0], ORG.st[1], { cam, lift, dx, dy, rot, scale: sc });
      c.restore();
      // everything lying on the strip moves with it
      c.save(); c.translate(ORG.st[0] + P.st.w / 2 + dx, ORG.st[1] + P.st.h / 2 + dy); c.rotate(rot); c.scale(sc, sc); c.translate(-(ORG.st[0] + P.st.w / 2), -(ORG.st[1] + P.st.h / 2));
      if (t >= T.frond && t < T.wash1[0]) {
        const lf = objPose(t, T.frond, T.glassOut[0] + 0.15, T.glassOut[1] + 0.25, 1, -1);
        if (lf) drawSprite(c, SPR.stFrond, ORG.st[0], ORG.st[1], { cam, h: lf.h, dx: lf.dx, dy: lf.dy, rot: lf.rot, alpha: lf.al });
      }
      if (t >= T.glassIn[0] && t < T.glassOut[1]) {
        let gx = 0; if (t < T.glassIn[1]) gx = 1900 * Math.pow(1 - eo(rt(t, T.glassIn[0], T.glassIn[1])), 1.0);
        let gy = 0; if (t >= T.glassOut[0]) { const u = eio(rt(t, T.glassOut[0], T.glassOut[1])); gx = 2000 * u; gy = -160 * u; }
        c.save(); c.translate(0, gy); drawGlass(c, gx, t, cam); c.restore();
      }
      if (t >= T.cardIn[0] && t < T.cardOut[1] + 0.05) {
        let xe = cardEdge(t); if (t < T.cardIn[1]) xe = lerp(-480, 1760, eo(rt(t, T.cardIn[0], T.cardIn[1])));
        drawCard(c, xe, cam);
      }
      c.restore();
      // the brush
      if (t >= T.brushIn - 0.4 && t < T.brushOut[1] + 0.1) { const b = brushPose(t); drawBrush(c, b.x, b.y, true, cam); }
    }
    // the hook sheet on top, until it is pulled off
    if (t < T.lift1[1]) {
      let lift = 0, dx = 0, dy = 0, rot = 0, sc = 1;
      if (t >= T.lift1[0]) { const u = eio(rt(t, T.lift1[0], T.lift1[1])); lift = u; dx = 330 * u; dy = -560 * u; rot = 0.075 * u; sc = 1 + 0.2 * u; }
      drawSheet(c, (P.hs.render(hsState(t)), P.hs), ORG.hs[0], ORG.hs[1], { cam, lift, dx, dy, rot, scale: sc });
      drawDrops(c, t);
      if (t < T.lift1[0] + 0.3) drawTitle(c, t, { dx, dy, rot, sc });
    }
    // strip labels
    if (t >= T.wash1[0] && t < T.lift2[1]) {
      c.save(); const u = t >= T.lift2[0] ? eio(rt(t, T.lift2[0], T.lift2[1])) : 0;
      c.translate(ORG.st[0] + P.st.w / 2 - 380 * u, ORG.st[1] + P.st.h / 2 - 520 * u); c.rotate(-0.07 * u); c.scale(1 + 0.16 * u, 1 + 0.16 * u); c.translate(-(ORG.st[0] + P.st.w / 2), -(ORG.st[1] + P.st.h / 2));
      drawStripLabels(c, t); c.restore();
    }
    // sun: warm light and leaf shadows over everything on the board
    const s1 = sunAt(t), s2 = sun2At(t);
    drawSun(c, cam, Math.max(s1, s2), t);
  }
  LAST = { cam, t };
}

function brushPose(t) {
  const sh = 210, y0 = ORG.st[1] + 70, rows = T.coatN;           // plate coat y0..y1 -> world
  const rowY = j => ORG.st[1] + 96 + 105 + j * (424 - 210) / (rows - 1);
  const sx0 = BANDS.x0 + 4, sx1 = BANDS.x0 + 1560 - 4;
  const k = (t - T.coat0) / T.coatDt;
  if (k < 0) { const e = eo(rt(t, T.brushIn, T.coat0)); return { x: sx0 - 900 * (1 - e), y: rowY(0) - 240 * (1 - e) }; }
  if (k >= rows) { const e = eio(rt(t, T.brushOut[0], T.brushOut[1])); return { x: sx1 + 1000 * e, y: rowY(rows - 1) - 320 * e }; }
  const j = Math.floor(k), f = k - j, rev = j % 2;
  const x = rev ? lerp(sx1, sx0, f) : lerp(sx0, sx1, f);
  const y = j < rows - 1 ? lerp(rowY(j), rowY(j + 1), ss(rt(f, 0.86, 1))) : rowY(j);
  return { x, y: y + Math.sin(f * 40 + j) * 2 };
}
function drawSun(c, cam, s, t) {
  if (s <= 0.004) return;
  const x0 = cam.cx - 1500, y0 = cam.cy - 1000, ww = 3000, hh = 2000;
  c.save();
  c.globalCompositeOperation = 'multiply'; c.globalAlpha = 0.32 * s;
  const pat = c.createPattern(DAPPLE, 'repeat'); const sh = (t || 0) * 14; pat.setTransform(new DOMMatrix().translate(sh, sh * 0.6).scale(1.9));
  c.fillStyle = pat; c.fillRect(x0, y0, ww, hh);
  c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.16 * s;
  const g = c.createLinearGradient(cam.cx - 900, cam.cy - 600, cam.cx + 900, cam.cy + 600); g.addColorStop(0, '#ffe7b0'); g.addColorStop(1, '#f2b46a');
  c.fillStyle = g; c.fillRect(x0, y0, ww, hh);
  c.restore();
}
function drawDrops(c, t) {
  const drops = [[1.3, 520], [2.9, 1180], [4.6, 780], [6.2, 1460]];
  for (const [t0, dx] of drops) {
    const u = t - t0; if (u < 0 || u > 0.8) continue;
    const y = ORG.hs[1] + 920 - 4 + 1500 * u * u * 0.5 * 1.8, x = ORG.hs[0] + dx;
    c.save(); c.fillStyle = 'rgba(190,225,240,.85)'; c.beginPath(); c.ellipse(x, y, 7, 11 + u * 26, 0, 0, 6.283); c.fill();
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(x - 2, y - 3, 2.4, 0, 6.283); c.fill(); c.restore();
  }
}
const TITLE = { text: 'Reading the Sun', x: 210, y: 830, size: 205 };
function drawTitle(c, t, tr) {
  const p = rt(t, T.titleIn, T.titleIn + 2.0), a = 1 - ss(rt(t, T.titleOut - 0.2, T.titleOut + 0.2));
  if (p <= 0 || a <= 0) return;
  c.save(); c.translate(ORG.hs[0] + 900 + tr.dx, ORG.hs[1] + 460 + tr.dy); c.rotate(tr.rot); c.scale(tr.sc, tr.sc); c.translate(-(ORG.hs[0] + 900), -(ORG.hs[1] + 460));
  c.globalAlpha = a; penText(c, TITLE.text, ORG.hs[0] + TITLE.x, ORG.hs[1] + TITLE.y, TITLE.size, eio(p), { color: WHITE }); c.restore();
}
function bandX(k) { return BANDS.x0 + BANDS.w * (k - 0.5); }          // centre of band k (1..6)
const NOTE_Y = { digit: ORG.st[1] + 600, word: ORG.st[1] + 640 };
function drawStripLabels(c, t) {
  // header on the top margin
  penText(c, 'minutes of sun', BANDS.x0 + 6, ORG.st[1] + 70, 54, eio(rt(t, T.wash1[0] + 0.1, T.wash1[0] + 1.3)), { color: INK });
  T.digits.forEach((t0, i) => penText(c, String(i + 1), bandX(i + 1), ORG.st[1] + 586, 64, rt(t, t0, t0 + 0.3), { color: INK, align: 'center', nib: false }));
  penText(c, 'pale', bandX(1), ORG.st[1] + 645, 42, rt(t, T.notePale, T.notePale + 0.5), { color: INK, align: 'center', nib: false });
  penText(c, 'flat', bandX(6), ORG.st[1] + 645, 42, rt(t, T.noteFlat, T.noteFlat + 0.5), { color: INK, align: 'center', nib: false });
  penText(c, 'right', bandX(4), ORG.st[1] + 645, 42, rt(t, T.noteRight, T.noteRight + 0.6), { color: INK, align: 'center', nib: false });
  penCircle(c, bandX(4), ORG.st[1] + 308, 158, 232, eio(rt(t, T.circle[0], T.circle[1])));
}

// ---------------------------------------------------------------- the line of prints
function drawWall(c, t, cam) {
  const R = 4400, wp = c.createPattern(WALL, 'repeat'); wp.setTransform(new DOMMatrix().scale(3.2)); c.fillStyle = wp; c.fillRect(cam.cx - R, cam.cy - R, 2 * R, 2 * R);
  // a window's worth of light falling across the wall
  c.save(); c.globalCompositeOperation = 'screen'; const g = c.createLinearGradient(-300, -300, 2200, 900); g.addColorStop(0, 'rgba(255,236,190,.20)'); g.addColorStop(0.6, 'rgba(255,236,190,.05)'); g.addColorStop(1, 'rgba(255,236,190,0)'); c.fillStyle = g; c.fillRect(cam.cx - R, cam.cy - R, 2 * R, 2 * R); c.restore();
  // the bench and tray below
  c.fillStyle = '#3a3f40'; c.fillRect(-1500, 1180, 5000, 900);
  c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(-1500, 1180, 5000, 6);
  const tr = { x: 40, y: 1230, w: 1840, h: 260 };
  c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 30 * cam.z; c.shadowOffsetY = 16 * cam.z; c.fillStyle = '#dfe3df'; roundRect(c, tr.x, tr.y, tr.w, tr.h, 30); c.fill(); c.restore();
  c.fillStyle = '#b9c1be'; roundRect(c, tr.x + 24, tr.y + 24, tr.w - 48, tr.h - 48, 22); c.fill();
  const wg = c.createLinearGradient(0, tr.y + 24, 0, tr.y + tr.h); wg.addColorStop(0, 'rgba(120,170,185,.85)'); wg.addColorStop(1, 'rgba(70,125,145,.9)'); c.fillStyle = wg; roundRect(c, tr.x + 40, tr.y + 44, tr.w - 80, tr.h - 88, 18); c.fill();
  // ripples from the last drop
  const rx = 960 + 0, ry = tr.y + 150;
  for (let k = 0; k < 3; k++) { const u = t - T.lastDrop - k * 0.22; if (u < 0 || u > 1.6) continue; const r = 14 + u * 150, a = (1 - u / 1.6) * 0.55; c.strokeStyle = `rgba(235,250,255,${a})`; c.lineWidth = 3; c.beginPath(); c.ellipse(rx, ry, r * 1.5, r * 0.5, 0, 0, 6.283); c.stroke(); }
  // line
  const sag = x => 18 * Math.pow((x - 960) / 1700, 2) - 0, ly = x => -14 + sag(x);
  c.strokeStyle = '#2b2a28'; c.lineWidth = 6; c.beginPath(); for (let x = -1800; x <= 3700; x += 100) x === -1800 ? c.moveTo(x, ly(x)) : c.lineTo(x, ly(x)); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2; c.beginPath(); for (let x = -1800; x <= 3700; x += 100) x === -1800 ? c.moveTo(x, ly(x) - 2) : c.lineTo(x, ly(x) - 2); c.stroke();
  // the small prints
  const cxs = [-140, -770, 2060, 2690].map((x, i) => [x, i]);
  const order = [0, 1, 2, 3];
  const sw = (i, tt) => 0.012 * Math.sin(tt * 1.3 + i * 1.9) * (0.4 + 0.6 * Math.exp(-Math.max(0, tt - T.hang[1]) * 0.15));
  const place = [-1, -2, 1, 2];
  for (const i of [3, 1, 0, 2]) {
    const x = cxs[i][0], p = P.sp[i]; const a = sw(i, t);
    c.save(); c.translate(x, 0); c.rotate(a); c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 24 * cam.z; c.shadowOffsetX = 10 * cam.z; c.shadowOffsetY = 16 * cam.z;
    c.drawImage(p.cv, -SP_W / 2, 0); c.shadowColor = 'transparent'; peg(c, 0, ly(x) + 10, 0); c.restore();
  }
  // the real print
  const a = 0.016 * Math.sin((t - T.hang[1]) * 2.1) * Math.exp(-Math.max(0, t - T.hang[1]) * 0.18);
  c.save(); c.translate(960, 0); c.rotate(a);
  c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 30 * cam.z; c.shadowOffsetX = 14 * cam.z; c.shadowOffsetY = 20 * cam.z;
  P.rs.render(rsState(t)); c.drawImage(P.rs.cv, -P.rs.w / 2, 0); c.shadowColor = 'transparent';
  peg(c, -420, ly(540) + 10, 0); peg(c, 420, ly(1380) + 10, 0);
  // the note, written in ink on the border
  const np = rt(t, T.noteEnd[0], T.noteEnd[1]);
  penText(c, NOTE.text, -P.rs.w / 2 + NOTE.x, NOTE.y, NOTE.size, eio(np), { color: INK });
  // a drop gathers on the lower edge
  const gu = clamp((t - (T.lastDrop - 2.2)) / 2.2), dropY = T.lastDrop - 0.45;
  if (t > T.lastDrop - 2.4 && t < dropY) { const sz = 5 + 8 * gu * gu; c.fillStyle = 'rgba(190,225,240,.9)'; c.beginPath(); c.ellipse(0, P.rs.h - 6 + sz * 0.8, sz, sz * 1.5, 0, 0, 6.283); c.fill(); }
  if (t >= dropY && t < T.lastDrop) { const u = (t - dropY) / (T.lastDrop - dropY), y = P.rs.h + (tr.y + 150 - P.rs.h) * u * u; c.fillStyle = 'rgba(200,230,245,.95)'; c.beginPath(); c.ellipse(0, y, 8, 12 + u * 28, 0, 0, 6.283); c.fill(); }
  c.restore();
}
const NOTE = { text: 'Test a strip. Wait for gray. Rinse clear.', x: 160, y: 892, size: 66 };
function peg(c, x, y) {
  c.save(); c.translate(x, y); c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 8; c.shadowOffsetX = 3; c.shadowOffsetY = 5;
  const g = c.createLinearGradient(-14, 0, 14, 0); g.addColorStop(0, '#b78f5a'); g.addColorStop(0.5, '#d9b682'); g.addColorStop(1, '#8c6a3d');
  c.fillStyle = g; roundRect(c, -15, -16, 30, 92, 8); c.fill(); c.shadowColor = 'transparent'; c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(-2, 2, 4, 52);
  c.fillStyle = '#9ea4a6'; c.fillRect(-16, 26, 32, 5); c.restore();
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

// ---------------------------------------------------------------- screen-space layers: flash, vignette, captions
function flashAt(t) {
  let a = 0;
  const f = (t0, t1, peak = 0.95) => { if (t >= t0 && t < t1) { const u = (t - t0) / (t1 - t0); a = Math.max(a, peak * Math.pow(1 - u, 2.2) * Math.min(1, u * 12)); } };
  f(T.flash[0], T.flash[1]); f(T.sun2, T.sun2 + 0.9, 0.9);
  if (t >= T.hang[0] + 0.45 && t < T.hang[1] + 0.8) { const u = t < T.hang[1] ? (t - T.hang[0] - 0.45) / (T.hang[1] - T.hang[0] - 0.45) : 1 - (t - T.hang[1]) / 0.8; a = Math.max(a, Math.pow(clamp(u), 1.6)); }
  return a;
}
function post(c, t) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  const fl = flashAt(t); if (fl > 0.003) { c.fillStyle = `rgba(255,247,228,${fl})`; c.fillRect(0, 0, W, H); }
  const g = c.createRadialGradient(W / 2, H / 2, H * 0.5, W / 2, H / 2, H * 1.05); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.40)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function drawSub(c, t) {
  const s = SUBS.find(s => t >= s.t0 && t < s.t1); if (!s) return;
  const dt = t - s.t0, a = Math.min(1, dt / 0.1) * Math.min(1, (s.t1 - t) / 0.12), wp = eo(clamp(dt / 0.32));
  c.setTransform(1, 0, 0, 1, 0, 0); c.save(); c.translate(W / 2, 992); c.rotate(-0.004); c.globalAlpha = a;
  c.font = '700 36px Slip, monospace'; let L = [s.text]; if (s.text.length > 50) { const mid = s.text.length / 2; let bi = -1; for (let i = 0; i < s.text.length; i++) if (s.text[i] === ' ' && (bi < 0 || Math.abs(i - mid) < Math.abs(bi - mid))) bi = i; L = [s.text.slice(0, bi), s.text.slice(bi + 1)]; }
  const tw = Math.max(...L.map(l => c.measureText(l).width)), w = tw + 96, h = 66 + (L.length - 1) * 46, cy0 = -(L.length - 1) * 23;
  c.beginPath(); c.rect(-w / 2 - 20, -h, (w + 40) * wp, h * 2); c.clip();
  c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 16; c.shadowOffsetY = 5;
  c.fillStyle = '#ece5d1'; c.beginPath();
  const nz = i => (hash(i * 3.7 + s.t0) - 0.5);
  c.moveTo(-w / 2, -h / 2 + nz(0) * 3); for (let x = -w / 2; x <= w / 2; x += 14) c.lineTo(x, -h / 2 + nz(x) * 3.2);
  for (let y = -h / 2; y <= h / 2; y += 14) c.lineTo(w / 2 + nz(y + 90) * 3.2, y);
  for (let x = w / 2; x >= -w / 2; x -= 14) c.lineTo(x, h / 2 + nz(x + 400) * 3.2);
  for (let y = h / 2; y >= -h / 2; y -= 14) c.lineTo(-w / 2 + nz(y + 700) * 3.2, y);
  c.closePath(); c.fill(); c.shadowColor = 'transparent';
  c.fillStyle = 'rgba(100,90,60,.07)'; for (let i = 0; i < 60; i++) c.fillRect(-w / 2 + hash(i * 2.9) * w, -h / 2 + hash(i * 5.3) * h, 2 + hash(i) * 6, 1);
  c.fillStyle = '#143a74'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; L.forEach((l, i) => c.fillText(l, 0, 12 + cy0 + i * 46));
  c.restore();
}

function render(t) {
  drawScene(out, t); post(out, t);
  if (!Q.get('nosub')) drawSub(out, t);
}
window.DUR = DUR; window.EV = EV; window.render = render;

// ---------------------------------------------------------------- what the viewer is meant to read (readcheck)
window.TEXTS = t => {
  if (!LAST || Math.abs(LAST.t - t) > 1e-6) render(t);
  const cam = LAST.cam, res = [], toS = (x, y) => [W / 2 + (x - cam.cx) * cam.z, H / 2 + (y - cam.cy) * cam.z];
  const box = (id, text, x0, y0, x1, y1) => { const a = toS(x0, y0), b = toS(x1, y1); res.push({ id, text, x0: a[0], y0: a[1], x1: b[0], y1: b[1] }); };
  const c = out;
  if (t >= T.titleIn && t < T.titleOut) { const w = textW(c, TITLE.text, TITLE.size); box('title', TITLE.text, ORG.hs[0] + TITLE.x, ORG.hs[1] + TITLE.y - TITLE.size * 0.8, ORG.hs[0] + TITLE.x + w, ORG.hs[1] + TITLE.y + TITLE.size * 0.25); }
  if (t >= T.wash1[0] + 0.1 && t < T.lift2[0]) box('minutes', 'minutes of sun', BANDS.x0, ORG.st[1] + 25, BANDS.x0 + textW(c, 'minutes of sun', 54), ORG.st[1] + 85);
  T.digits.forEach((t0, i) => { if (t >= t0 && t < T.lift2[0]) box('d' + i, String(i + 1), bandX(i + 1) - 24, ORG.st[1] + 530, bandX(i + 1) + 24, ORG.st[1] + 595); });
  if (t >= T.notePale && t < T.lift2[0]) box('pale', 'pale', bandX(1) - 50, ORG.st[1] + 600, bandX(1) + 50, ORG.st[1] + 655);
  if (t >= T.noteFlat && t < T.lift2[0]) box('flat', 'flat', bandX(6) - 50, ORG.st[1] + 600, bandX(6) + 50, ORG.st[1] + 655);
  if (t >= T.noteRight && t < T.lift2[0]) box('right', 'right', bandX(4) - 60, ORG.st[1] + 600, bandX(4) + 60, ORG.st[1] + 655);
  if (t >= T.noteEnd[0] && t < DUR) {
    const w = textW(c, NOTE.text, NOTE.size), x0 = 960 - P.rs.w / 2 + NOTE.x;
    const a = toS(x0, NOTE.y - NOTE.size * 0.8), b = toS(x0 + w, NOTE.y + NOTE.size * 0.25);
    const rot = 0; res.push({ id: 'note', text: NOTE.text, x0: a[0], y0: a[1], x1: b[0], y1: b[1] });
  }
  return res;
};

(async () => {
  try {
    const ff = [['Pen', 'url(fonts/Caveat-700.ttf)'], ['Slip', 'url(fonts/courierprime-bold.woff2)']];
    for (const [n, u] of ff) { const f = new FontFace(n, u, { weight: '700' }); await f.load(); document.fonts.add(f); }
    BOARD = makeBoard(); WALL = makeWall(); DAPPLE = makeDapple();
    buildPlates(); buildSprites();
    if (!Q.get('nosub')) { const r = await fetch('caps.json'); if (r.ok) SUBS = await r.json(); }
  } catch (e) { console.error(e); throw e; }
  window.READY = true;
})();
