// Static builders: paper, walnut table, the phenakistoscope disc, card tiles, brass fittings.
import { mulberry, hash, vnoise, TAU, clamp, lerp } from '/core/lib.js';
import { C, pen, smooth, pathOf, rad } from './ink.js';

export const R = 400;                          // disc radius in world px
export const SLOT = 30;                        // degrees between drawings
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export const polar = (r, psi) => [r * Math.sin(rad(psi)), -r * Math.cos(rad(psi))];   // psi: degrees clockwise from the top

// ---------------------------------------------------------------- paper
export function paperCanvas(w, h, seed = 1, o = {}) {
  const c = mk(w, h), g = c.getContext('2d'), rnd = mulberry(seed);
  g.fillStyle = o.base || C.cream; g.fillRect(0, 0, w, h);
  // mottled tone: a small noise field scaled up smoothly
  const nw = 48, nh = Math.round(48 * h / w), m = mk(nw, nh), mg = m.getContext('2d'), id = mg.createImageData(nw, nh);
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    const v = vnoise(x * 0.23 + seed * 9.1) * 0.5 + vnoise(y * 0.31 + x * 0.17 + seed * 3.3) * 0.5, i = (y * nw + x) * 4;
    id.data[i] = 150; id.data[i + 1] = 105; id.data[i + 2] = 45; id.data[i + 3] = 255 * Math.pow(v, 1.6) * (o.tone ?? 0.22);
  }
  mg.putImageData(id, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(m, 0, 0, w, h);
  // fibres
  for (let i = 0; i < w * h / 900; i++) {
    const x = rnd() * w, y = rnd() * h, a = rnd() * TAU, l = 6 + rnd() * 18;
    g.strokeStyle = rnd() < 0.5 ? 'rgba(120,80,30,0.10)' : 'rgba(255,250,230,0.16)'; g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.8) * l / 2, y + Math.sin(a + 0.8) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  // foxing: brown spots
  for (let i = 0; i < w * h / 26000 * (o.fox ?? 1); i++) {
    const x = rnd() * w, y = rnd() * h, r = 1.5 + rnd() * rnd() * 7, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(120,70,20,${0.16 + rnd() * 0.22})`); gr.addColorStop(1, 'rgba(120,70,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  for (let i = 0; i < w * h / 9000; i++) { g.fillStyle = `rgba(60,35,10,${0.05 + rnd() * 0.12})`; g.fillRect(rnd() * w, rnd() * h, 1, 1); }
  return c;
}

// ---------------------------------------------------------------- walnut table
export function tableCanvas() {
  const S = 1024, c = mk(S, S), g = c.getContext('2d'), rnd = mulberry(77);
  const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#3a2312'); gr.addColorStop(0.5, '#2e1b0d'); gr.addColorStop(1, '#3a2312');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 520; i++) {                       // long grain lines, wrapping horizontally
    const y0 = rnd() * S, amp = 2 + rnd() * 9, fr = 0.002 + rnd() * 0.004, ph = rnd() * 6, a = 0.04 + rnd() * 0.10, dark = rnd() < 0.62;
    g.strokeStyle = dark ? `rgba(12,6,2,${a * 1.5})` : `rgba(120,78,40,${a})`; g.lineWidth = 0.6 + rnd() * 1.8;
    g.beginPath();
    for (let x = 0; x <= S; x += 16) { const y = y0 + Math.sin(x * fr * TAU + ph) * amp + Math.sin(x * 0.021 + ph * 2) * 1.2; x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < 40; i++) {                        // knots / cathedral figure
    const x = rnd() * S, y = rnd() * S;
    for (let k = 1; k < 7; k++) { g.strokeStyle = `rgba(14,7,3,${0.10})`; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, 14 * k, 3.4 * k, 0, 0, TAU); g.stroke(); }
  }
  g.fillStyle = 'rgba(8,4,1,0.55)'; g.fillRect(0, 0, S, 3); g.fillRect(0, S / 2 - 1, S, 3);  // plank seams
  g.fillStyle = 'rgba(180,120,60,0.12)'; g.fillRect(0, 3, S, 1); g.fillRect(0, S / 2 + 2, S, 1);
  for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(200,150,90,${0.04 + rnd() * 0.08})`; g.lineWidth = 0.5; const x = rnd() * S, y = rnd() * S, a = rnd() * TAU; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * (10 + rnd() * 60), y + Math.sin(a) * (10 + rnd() * 60)); g.stroke(); }
  return c;
}

// ---------------------------------------------------------------- the disc
const INSCRIPTION = 'PHENAKISTOSCOPE  ·  A SERIES OF TWELVE DRAWINGS  ·  TURN BEFORE A MIRROR  ·  LOOK THROUGH THE SLITS  ·  ';
export function slitShape(g, psi, rIn = 0.855 * R, rOut = 0.975 * R, wd = 0.046 * R) {
  const [x0, y0] = polar((rIn + rOut) / 2, psi);
  g.save(); g.translate(x0, y0); g.rotate(rad(psi));
  const len = rOut - rIn;
  g.beginPath(); g.roundRect(-wd / 2, -len / 2, wd, len, wd / 2);
  return g;     // caller fills / strokes, then restores
}
export function buildDisc(tiles, withTiles, Q = 2) {
  const size = Math.ceil(2 * R * Q + 8), c = mk(size, size), g = c.getContext('2d');
  g.translate(size / 2, size / 2); g.scale(Q, Q);
  g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
  const pp = paperCanvas(1024, 1024, 5, { tone: 0.2 });
  g.drawImage(pp, -512, -512, 1024, 1024);
  // yellowed, slightly darker toward the rim; a lighter hand-worn centre
  let gr = g.createRadialGradient(0, 0, R * 0.5, 0, 0, R); gr.addColorStop(0, 'rgba(140,95,40,0)'); gr.addColorStop(0.8, 'rgba(150,100,40,0.10)'); gr.addColorStop(1, 'rgba(120,75,25,0.38)');
  g.fillStyle = gr; g.fillRect(-R, -R, 2 * R, 2 * R);
  // engraved borders
  const ring = (r, w, a = 1) => { g.strokeStyle = `rgba(36,21,9,${a})`; g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); };
  ring(R - 6, 1.6); ring(R - 11, 0.7); ring(0.835 * R, 1.3); ring(0.828 * R, 0.6); ring(0.365 * R, 1.3); ring(0.358 * R, 0.6); ring(0.215 * R, 1.0);
  for (let a = 0; a < 360; a += 2.5) {                // graduated ticks at the rim
    const big = a % 30 === 0, mid = a % 10 === 0, l = big ? 11 : mid ? 7 : 4, [x0, y0] = polar(R - 13, a), [x1, y1] = polar(R - 13 - l, a);
    g.strokeStyle = 'rgba(36,21,9,0.8)'; g.lineWidth = big ? 1.3 : 0.7; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  // twelve drawings
  if (withTiles) {
    const S = 0.46 * R;
    for (let k = 0; k < 12; k++) {
      const psi = -SLOT * k, [x, y] = polar(0.60 * R, psi);
      g.save(); g.translate(x, y); g.rotate(rad(psi - 90)); g.drawImage(tiles[k], -S / 2, -S / 2, S, S); g.restore();
    }
  }
  // Roman numerals by each drawing
  g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 15px "IM Fell English"';
  for (let k = 0; k < 12; k++) { const psi = -SLOT * k, [x, y] = polar(0.336 * R, psi); g.save(); g.translate(x, y); g.rotate(rad(psi)); g.fillText(ROMAN[k], 0, 0); g.restore(); }
  // inscription ring
  { g.font = 'italic 400 15px "IM Fell English"'; const txt = INSCRIPTION, rr = 0.285 * R, widths = [...txt].map(ch => g.measureText(ch).width), tot = widths.reduce((a, b) => a + b, 0), circ = TAU * rr, sp = (circ - tot) / txt.length;
    let a0 = 0; [...txt].forEach((ch, i) => { const w = widths[i], aa = (a0 + w / 2) / circ * 360; const [x, y] = polar(rr, aa); g.save(); g.translate(x, y); g.rotate(rad(aa)); g.fillText(ch, 0, 0); g.restore(); a0 += w + sp; }); }
  // guilloche rosette in the middle
  for (let j = 0; j < 3; j++) {
    g.strokeStyle = `rgba(80,48,20,${0.55 - j * 0.12})`; g.lineWidth = 0.55; g.beginPath();
    for (let i = 0; i <= 1440; i++) { const a = i / 1440 * TAU * 5, r = 0.145 * R + (0.04 - j * 0.008) * R * Math.cos(a * (7 + j * 2) / 5 + j), x = r * Math.cos(a), y = r * Math.sin(a); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  g.fillStyle = C.cream2; g.beginPath(); g.arc(0, 0, 0.09 * R, 0, TAU); g.fill(); ring(0.09 * R, 1.0, 0.8);
  g.restore();
  // slits, cut through the card
  g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
  for (let k = 0; k < 12; k++) { slitShape(g, -SLOT * k); g.fill(); g.restore(); }
  g.restore();
  g.save();                                            // card thickness: a dark inner edge and a pale lip
  for (let k = 0; k < 12; k++) { slitShape(g, -SLOT * k, 0.855 * R - 1, 0.975 * R + 1, 0.046 * R + 2); g.strokeStyle = 'rgba(30,16,5,0.75)'; g.lineWidth = 1.6; g.stroke(); g.restore(); }
  g.restore();
  // rim lip
  g.strokeStyle = 'rgba(255,245,215,0.35)'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, R - 0.7, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(40,22,8,0.55)'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, R + 0.2, 0, TAU); g.stroke();
  return c;
}
export function shadowDisc(Q = 1) {
  const size = Math.ceil((2 * R + 120) * Q), c = mk(size, size), g = c.getContext('2d');
  g.translate(size / 2, size / 2); g.scale(Q, Q); g.filter = 'blur(10px)'; g.fillStyle = 'rgba(0,0,0,1)'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  return c;
}

// ---------------------------------------------------------------- cards: a drawing on its own piece of card
export function makeCards(tiles, seed = 9, size = 512) {
  return tiles.map((t, k) => {
    const c = paperCanvas(size, size, seed + k * 0.37, { tone: 0.2, fox: 0.7 }), g = c.getContext('2d');
    g.strokeStyle = 'rgba(36,21,9,0.85)'; g.lineWidth = 3; g.strokeRect(14, 14, size - 28, size - 28); g.lineWidth = 1.2; g.strokeRect(22, 22, size - 44, size - 44);
    g.drawImage(t, 0, 0, size, size);
    g.fillStyle = C.ink; g.font = '600 26px "IM Fell English"'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(ROMAN[k], size / 2, size - 32);
    return c;
  });
}

// ---------------------------------------------------------------- brass
export function brassGrad(g, x0, y0, x1, y1) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, C.brassHi); gr.addColorStop(0.35, C.brass); gr.addColorStop(0.7, C.brassLo); gr.addColorStop(1, C.brass); return gr;
}
export function drawHub(g, x, y, r) {
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  gr.addColorStop(0, '#fff0b8'); gr.addColorStop(0.35, C.brass); gr.addColorStop(1, C.brassDk);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(30,16,4,0.7)'; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x - r * 0.55, y - r * 0.08, r * 1.1, r * 0.16);   // screw slot
}
