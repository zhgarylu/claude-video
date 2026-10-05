// 2D layer over the 3D picture: subtitle patches, the poke-count tag, and the wool wipe that crosses the lens.
// Everything is cut from felt: rough fuzzy edges, speckled fibres, no outlines.
import { mulberry, clamp, lerp, ss, eo, back } from '/core/lib.js';
import { CAPS, TAGS, WIPES } from './timeline.js';

const FONT = '600 46px Fredoka';
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// a patch of felt: a rounded body, a fuzzy rim of loose fibres, speckles of other fibres
function patch(w, h, color, seed, rad = 0.5) {
  const pad = 26, c = mk(w + pad * 2, h + pad * 2), g = c.getContext('2d'), R = mulberry(seed);
  const r = h * rad;
  const path = () => { g.beginPath(); g.moveTo(pad + r, pad); g.arcTo(pad + w, pad, pad + w, pad + h, r); g.arcTo(pad + w, pad + h, pad, pad + h, r); g.arcTo(pad, pad + h, pad, pad, r); g.arcTo(pad, pad, pad + w, pad, r); g.closePath(); };
  g.fillStyle = color; path(); g.fill();
  // rim fibres, in short strokes that lean outward
  g.lineCap = 'round';
  for (let i = 0; i < 1800; i++) {
    const u = R() * (2 * (w + h)), side = u < w ? 0 : u < w + h ? 1 : u < 2 * w + h ? 2 : 3, f = side % 2 ? (u - (side === 1 ? w : 2 * w + h)) : (u - (side === 0 ? 0 : w + h));
    let x, y, nx, ny;
    if (side === 0) { x = pad + f; y = pad; nx = 0; ny = -1; } else if (side === 1) { x = pad + w; y = pad + f; nx = 1; ny = 0; }
    else if (side === 2) { x = pad + w - f; y = pad + h; nx = 0; ny = 1; } else { x = pad; y = pad + h - f; nx = -1; ny = 0; }
    // pull the corners in so the fuzz follows the rounded shape
    const cx = clamp(x, pad + r, pad + w - r), cy = clamp(y, pad + r, pad + h - r);
    if (x !== cx && y !== cy || Math.abs(x - cx) + Math.abs(y - cy) > 0) { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1; x = cx + dx / d * r; y = cy + dy / d * r; nx = dx / d; ny = dy / d; }
    const len = 4 + R() * 14, a = Math.atan2(ny, nx) + (R() - .5) * 1.7;
    g.strokeStyle = color; g.globalAlpha = .25 + R() * .5; g.lineWidth = .8 + R() * 1.2;
    g.beginPath(); g.moveTo(x - nx * 3, y - ny * 3); g.lineTo(x - nx * 3 + Math.cos(a) * len, y - ny * 3 + Math.sin(a) * len); g.stroke();
  }
  g.globalAlpha = 1;
  g.save(); path(); g.clip();
  for (let i = 0; i < 1400; i++) {   // inner fibres: lighter and darker streaks
    const x = pad + R() * w, y = pad + R() * h, a = R() * 6.28, l = 5 + R() * 16;
    g.strokeStyle = R() < .5 ? 'rgba(255,248,230,.20)' : 'rgba(80,60,40,.13)'; g.lineWidth = .8 + R() * 1.1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  g.restore();
  return { c, pad };
}

const NOCAP = new URLSearchParams(location.search).get('nocap') === '1';
export function makeOverlay(W, H) {
  const canvas = mk(W, H); canvas.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;pointer-events:none';
  const g = canvas.getContext('2d');
  const probe = mk(10, 10).getContext('2d');
  const cache = new Map();
  // subtitle patches: measured once
  const capPieces = CAPS.map((cp, i) => {
    probe.font = FONT; const tw = probe.measureText(cp.text).width, w = Math.round(tw + 84), h = 82;
    const p = patch(w, h, '#e4d9c1', 300 + i, .5);
    const tc = mk(p.c.width, p.c.height), tg = tc.getContext('2d');
    tg.drawImage(p.c, 0, 0);
    tg.font = FONT; tg.textBaseline = 'middle'; tg.textAlign = 'center';
    tg.fillStyle = '#4a3a2e'; tg.globalAlpha = .95;
    tg.fillText(cp.text, p.c.width / 2, p.c.height / 2 + 3);
    // text is cut felt as well: a few loose ends at the glyph edge
    return { ...cp, img: tc, w: p.c.width, h: p.c.height };
  });
  const tagPieces = TAGS.map((tg, i) => {
    probe.font = '600 40px Fredoka'; const tw = probe.measureText(tg.text).width, w = Math.round(tw + 70), h = 76;
    const p = patch(w, h, '#b7573b', 700 + i, .32), tc = mk(p.c.width, p.c.height), g2 = tc.getContext('2d');
    g2.drawImage(p.c, 0, 0); g2.font = '600 40px Fredoka'; g2.textBaseline = 'middle'; g2.textAlign = 'center';
    g2.fillStyle = '#f0e6cf'; g2.fillText(tg.text, p.c.width / 2, p.c.height / 2 + 2);
    return { ...tg, img: tc, w: p.c.width, h: p.c.height, bw: w, bh: h };
  });
  const TAG_X = 70, TAG_Y = 56;

  // wool wipe: a mass of long fibres crossing the lens left to right
  const wipeFibres = (() => { const R = mulberry(901), a = []; for (let i = 0; i < 1300; i++) a.push({ x: R(), y: R() * 1.2 - .1, len: 420 + R() * 1100, wid: 5 + R() * 20, bend: (R() - .5) * 260, sp: .75 + R() * .5, col: ['#e6dcc6', '#d8caab', '#cdbf9f', '#b88a62', '#9fb0bd', '#efe6d4'][Math.floor(R() * 6)], a: .55 + R() * .4, ph: R() * 6.28 }); return a; })();

  function drawWipe(u) {
    // u 0..1 over the wipe; the band centre goes from -1400 to W+1400
    const cx = lerp(-1500, W + 1500, u), half = 1300;
    g.save();
    const gr = g.createLinearGradient(cx - half, 0, cx + half, 0);
    gr.addColorStop(0, 'rgba(214,202,176,0)'); gr.addColorStop(.28, 'rgba(214,202,176,.96)'); gr.addColorStop(.72, 'rgba(206,192,162,.96)'); gr.addColorStop(1, 'rgba(206,192,162,0)');
    g.fillStyle = gr; g.fillRect(cx - half, 0, half * 2, H);
    g.lineCap = 'round';
    for (const f of wipeFibres) {
      const x0 = cx - half + f.x * half * 2 * f.sp - 200, y0 = f.y * H, edge = Math.min(1, Math.min(f.x, 1 - f.x) * 3);
      g.strokeStyle = f.col; g.globalAlpha = f.a * (.35 + .65 * edge); g.lineWidth = f.wid;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + f.len / 2, y0 + f.bend + Math.sin(u * 5 + f.ph) * 30, x0 + f.len, y0 + f.bend * .3); g.stroke();
    }
    g.restore();
  }

  function draw(t, ts) {
    g.clearRect(0, 0, W, H);
    // captions (?nocap=1 leaves them out, for stills)
    for (const c of capPieces) {
      if (NOCAP || t < c.t0 || t >= c.t1) continue;
      const a = Math.min(1, (t - c.t0) / .18, (c.t1 - t) / .18), k = ts - c.t0;
      const sc = k < .3 ? lerp(.92, 1, back(k / .3, 1.6)) : 1;
      g.save(); g.globalAlpha = a; g.translate(W / 2, H - 92); g.scale(sc, sc); g.drawImage(c.img, -c.w / 2, -c.h / 2); g.restore();
    }
    // the poke tag
    for (const c of tagPieces) {
      if (t < c.t0 || t >= c.t1) continue;
      const k = ts - c.t0, a = Math.min(1, k / .15, (c.t1 - t) / .15), sc = k < .4 ? lerp(.7, 1, back(k / .4, 2.4)) : 1;
      g.save(); g.globalAlpha = a; g.translate(TAG_X + c.w / 2, TAG_Y + c.h / 2); g.rotate(-.025); g.scale(sc, sc); g.drawImage(c.img, -c.w / 2, -c.h / 2); g.restore();
    }
    // (the wool wipe is drawn in 3D, in main.js)
  }
  // every piece of on-screen text that readcheck should see (the tag; captions are checked through the .srt)
  function texts(t) {
    const out = [];
    for (const c of tagPieces) if (t >= c.t0 && t < c.t1) out.push({ id: 'tag', text: c.text, x0: TAG_X, y0: TAG_Y, x1: TAG_X + c.bw, y1: TAG_Y + c.bh });
    return out;
  }
  return { canvas, draw, texts };
}
