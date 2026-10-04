// paper.js: the sheet. Warm laid paper with fibre and mottling, age toning toward the edges, foxing spots,
// a deckled edge, an embossed plate mark and the ruled border of the plate. Built once, in world space,
// at 1.5x so a 2x camera push still shows fibre.
import { Noise, clamp, lerp, makeCanvas, mulberry, pathPoly } from './util.js';

export const SHEET = { x0: -120, y0: -80, x1: 2040, y1: 1160 };
export const PLATE = { x0: 96, y0: 70, x1: 1824, y1: 1010 };
export const PS = 1.5;

export function buildPaper(seed = 11) {
  const W = SHEET.x1 - SHEET.x0, H = SHEET.y1 - SHEET.y0, w = Math.ceil(W * PS), h = Math.ceil(H * PS);
  const cv = makeCanvas(w, h), c = cv.getContext('2d');
  const nA = Noise(seed), nB = Noise(seed + 5), nC = Noise(seed + 9);
  // 1. colour field at quarter resolution (mottling, age toning), scaled up smooth
  const Q = 4, lw = Math.ceil(w / Q), lh = Math.ceil(h / Q), lc = makeCanvas(lw, lh), lg = lc.getContext('2d');
  const img = lg.createImageData(lw, lh), o = img.data, base = [246, 236, 208], warm = [221, 190, 138];
  for (let py = 0; py < lh; py++) {
    const y = SHEET.y0 + py * Q / PS;
    for (let px = 0; px < lw; px++) {
      const x = SHEET.x0 + px * Q / PS;
      const mott = nA.fbm(x * .006, y * .006, 3) - .5, mid = nB.fbm(x * .03, y * .03, 2) - .5;
      const ed = Math.min(x - SHEET.x0, SHEET.x1 - x, y - SHEET.y0, SHEET.y1 - y);
      const tone = Math.exp(-ed / 110) * .9 + .14 * Math.max(0, .5 - nA.fbm(x * .004 + 30, y * .004, 2)) * 2;
      const k = 1 + mott * .09 + mid * .035, i = (py * lw + px) * 4;
      for (let ch = 0; ch < 3; ch++) o[i + ch] = clamp((base[ch] + (warm[ch] - base[ch]) * clamp(tone * .8)) * k * (1 - tone * .05), 0, 255);
      o[i + 3] = 255;
    }
  }
  lg.putImageData(img, 0, 0); c.imageSmoothingQuality = 'high'; c.drawImage(lc, 0, 0, w, h);
  // 2. fibre and grain: two odd-sized tiles, multiplied
  const tile = (T, sx, sy, amp, sd) => {
    const tc = makeCanvas(T, T), tg = tc.getContext('2d'), ti = tg.createImageData(T, T), n = Noise(sd);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const v = n(x * sx, y * sy) * .6 + n(x * sx * 2.1 + 5, y * sy * 2.1) * .4, i = (y * T + x) * 4, g = 255 - amp * v;
      ti.data[i] = g; ti.data[i + 1] = g * .995; ti.data[i + 2] = g * .98; ti.data[i + 3] = 255;
    }
    tg.putImageData(ti, 0, 0); return tc;
  };
  const tiled = (tc, ox, oy, sc) => { c.save(); c.globalCompositeOperation = 'multiply'; c.setTransform(sc, 0, 0, sc, ox, oy); c.fillStyle = c.createPattern(tc, 'repeat'); c.fillRect(-ox / sc, -oy / sc, w / sc, h / sc); c.restore(); };
  tiled(tile(509, 1.1, .38, 26, seed + 2), 0, 0, 1); tiled(tile(337, .5, 1.5, 20, seed + 3), 41, 17, 1); tiled(tile(251, 2.3, 2.3, 24, seed + 4), 9, 5, 1);
  c.setTransform(PS, 0, 0, PS, -SHEET.x0 * PS, -SHEET.y0 * PS);
  const r = mulberry(seed * 3 + 1);
  // laid lines: very faint horizontal chain-line shadows
  c.fillStyle = 'rgba(120,95,60,.035)';
  for (let y = SHEET.y0; y < SHEET.y1; y += 5.2 + r() * .15) c.fillRect(SHEET.x0, y, W, .8);
  c.fillStyle = 'rgba(120,95,60,.04)';
  for (let x = SHEET.x0 + 20; x < SHEET.x1; x += 96) c.fillRect(x, SHEET.y0, 1.4, H);
  // loose fibres
  for (let i = 0; i < 900; i++) {
    const x = SHEET.x0 + r() * W, y = SHEET.y0 + r() * H, L = 5 + r() * 14, a = r() * 6.28;
    c.strokeStyle = r() < .5 ? 'rgba(110,80,50,.16)' : 'rgba(255,248,226,.32)'; c.lineWidth = .35 + r() * .35;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * L * .5 + (r() - .5) * 4, y + Math.sin(a) * L * .5 + (r() - .5) * 4, x + Math.cos(a) * L, y + Math.sin(a) * L); c.stroke();
  }
  // foxing
  const fox = (x, y, rad, a) => {
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(138,84,36,${a})`); g.addColorStop(.45, `rgba(158,104,50,${a * .5})`); g.addColorStop(1, 'rgba(170,120,60,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, rad, 0, 6.2832); c.fill();
  };
  for (let i = 0; i < 70; i++) { const x = SHEET.x0 + r() * W, y = SHEET.y0 + r() * H; const near = Math.min(x - SHEET.x0, SHEET.x1 - x, y - SHEET.y0, SHEET.y1 - y); if (r() < .35 + .6 * Math.exp(-near / 160)) fox(x, y, 1.2 + r() * r() * 7, .25 + r() * .3); }
  for (let i = 0; i < 9; i++) fox(SHEET.x0 + r() * W, SHEET.y0 + r() * H, 22 + r() * 36, .05 + r() * .045);
  for (let i = 0; i < 14; i++) { const cx = SHEET.x0 + r() * W, cy = SHEET.y0 + r() * H; for (let j = 0; j < 7; j++) fox(cx + (r() - .5) * 40, cy + (r() - .5) * 30, .7 + r() * 2.2, .3 + r() * .25); }

  // plate: embossed mark (pressed-in, lit from upper left) and a calmer, slightly lighter surface
  const { x0, y0, x1, y1 } = PLATE;
  c.save(); c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip();
  c.fillStyle = 'rgba(255,250,232,.10)'; c.fillRect(x0, y0, x1 - x0, y1 - y0);
  const sh = (ax, ay, bx, by, col, wd, bl) => { c.save(); c.filter = `blur(${bl}px)`; c.strokeStyle = col; c.lineWidth = wd; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); c.restore(); };
  sh(x0, y0 + 2, x1, y0 + 2, 'rgba(70,48,24,.42)', 5, 2.5); sh(x0 + 2, y0, x0 + 2, y1, 'rgba(70,48,24,.36)', 5, 2.5);
  sh(x0, y1 - 1, x1, y1 - 1, 'rgba(255,252,238,.55)', 4, 1.8); sh(x1 - 1, y0, x1 - 1, y1, 'rgba(255,252,238,.5)', 4, 1.8);
  c.restore();
  c.save(); c.beginPath(); c.rect(x0 - 8, y0 - 8, x1 - x0 + 16, y1 - y0 + 16); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip('evenodd');
  sh(x0 - 2, y1 + 1.2, x1 + 2, y1 + 1.2, 'rgba(70,48,24,.28)', 3, 1.4); sh(x1 + 1.2, y0, x1 + 1.2, y1, 'rgba(70,48,24,.24)', 3, 1.4);
  sh(x0 - 1.5, y0 - 1.5, x1 + 1.5, y0 - 1.5, 'rgba(255,252,238,.5)', 2.5, 1.2); sh(x0 - 1.5, y0, x0 - 1.5, y1, 'rgba(255,252,238,.5)', 2.5, 1.2);
  c.restore();

  // ruled border of the plate (a thick and a hair rule, hand-ruled: a tiny tremor)
  const rule = (inset, wd, a) => {
    c.strokeStyle = `rgba(43,29,18,${a})`; c.lineWidth = wd; c.lineJoin = 'round';
    const X0 = x0 + inset, Y0 = y0 + inset, X1 = x1 - inset, Y1 = y1 - inset, tr = mulberry(inset * 7 + 1);
    c.beginPath(); c.moveTo(X0, Y0);
    for (const [ax, ay, bx, by] of [[X0, Y0, X1, Y0], [X1, Y0, X1, Y1], [X1, Y1, X0, Y1], [X0, Y1, X0, Y0]]) {
      const n = 40; for (let i = 1; i <= n; i++) c.lineTo(lerp(ax, bx, i / n) + (tr() - .5) * .35, lerp(ay, by, i / n) + (tr() - .5) * .35);
    }
    c.stroke();
  };
  rule(18, 1.9, .86); rule(24.5, .6, .8);

  // deckled sheet edge: noisy outline, applied as alpha
  const dk = makeCanvas(w, h), d = dk.getContext('2d'); d.setTransform(PS, 0, 0, PS, -SHEET.x0 * PS, -SHEET.y0 * PS);
  const nd = Noise(seed + 21), pts = [], step = 5;
  const ed = (t, x, y, nx, ny) => { const k = (nd.fbm(t * .05, 3, 3) - .5) * 9 + (nd(t * .6, 9) - .5) * 2.4; return { x: x + nx * k, y: y + ny * k }; };
  for (let x = SHEET.x0; x <= SHEET.x1; x += step) pts.push(ed(x, x, SHEET.y0 + 2, 0, 1));
  for (let y = SHEET.y0; y <= SHEET.y1; y += step) pts.push(ed(y + 500, SHEET.x1 - 2, y, -1, 0));
  for (let x = SHEET.x1; x >= SHEET.x0; x -= step) pts.push(ed(x + 1000, x, SHEET.y1 - 2, 0, -1));
  for (let y = SHEET.y1; y >= SHEET.y0; y -= step) pts.push(ed(y + 1500, SHEET.x0 + 2, y, 1, 0));
  d.fillStyle = '#000'; d.beginPath(); pathPoly(d, pts); d.fill();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'destination-in'; c.drawImage(dk, 0, 0);
  return cv;
}

// the table the sheet lies on: dark linen-green baize, as a tile pattern
export function buildTable(seed = 4) {
  const T = 256, cv = makeCanvas(T, T), c = cv.getContext('2d'), img = c.createImageData(T, T), n = Noise(seed), r = mulberry(seed);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const i = (y * T + x) * 4, wv = ((x >> 1) + (y >> 1)) & 1 ? 1 : .94;
    const k = (.88 + .24 * ((n(x * .5 % 128, y * .5 % 128) + r() * .5) * .66)) * wv;
    img.data[i] = 46 * k; img.data[i + 1] = 58 * k; img.data[i + 2] = 50 * k; img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0); return cv;
}
