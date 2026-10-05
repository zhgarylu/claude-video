// Type setting: fonts, justified columns, and letter-by-letter slugs (the metal drops into the forme, then prints).
import { clamp, ss, hash } from '/core/lib.js';

export const INK = '#1b1814';
export const FONTS = {
  mast: '700 {S}px "Cormorant Garamond"',
  head: '800 {S}px "EB Garamond"',
  headI: 'italic 600 {S}px "EB Garamond"',
  body: '400 {S}px "IM Fell English"',
  bodyI: 'italic 400 {S}px "IM Fell English"',
  slab: '700 {S}px "Courier Prime"',
  sub: '800 {S}px "EB Garamond"',
};
export const font = (k, s) => FONTS[k].replace('{S}', s);

export async function loadFonts() {
  const faces = [
    ['Cormorant Garamond', 'url(fonts/CormorantGaramond.ttf)', { weight: '300 700' }],
    ['EB Garamond', 'url(fonts/EBGaramond.ttf)', { weight: '400 800' }],
    ['EB Garamond', 'url(fonts/EBGaramond-Italic.ttf)', { weight: '400 800', style: 'italic' }],
    ['IM Fell English', 'url(fonts/IMFellEnglish.woff2)', {}],
    ['IM Fell English', 'url(fonts/IMFellEnglish-Italic.woff2)', { style: 'italic' }],
    ['Courier Prime', 'url(fonts/courierprime-bold.woff2)', { weight: '700' }],
  ];
  for (const [fam, src, d] of faces) { const f = new FontFace(fam, src, d); await f.load(); document.fonts.add(f); }
  await Promise.all([font('mast', 40), font('head', 40), font('headI', 40), font('body', 20), font('bodyI', 20), font('slab', 20)].map(f => document.fonts.load(f, 'AaBb')));
}

let _m; const mctx = () => (_m ??= document.createElement('canvas').getContext('2d'));
export function measure(f, s) { const c = mctx(); c.font = f; return c.measureText(s).width; }

// Greedy wrap + justify. Returns lines [{text, ws, x, y}] with wordSpacing for justification.
export function flow(f, text, x, w, y0, lh, o = {}) {
  const c = mctx(); c.font = f; const sp = c.measureText(' ').width;
  const words = text.split(/\s+/).filter(Boolean), lines = []; let cur = [], cw = 0;
  const dN = o.dropN || 0, dDx = o.dropDx || 0, wid = () => lines.length < dN ? w - dDx : w, xo = () => lines.length < dN ? x + dDx : x;
  const push = (last) => {
    const t = cur.join(' '), nat = cw + sp * (cur.length - 1);
    const ws = (!last && cur.length > 1 && !o.ragged) ? (wid() - nat) / (cur.length - 1) : 0;
    lines.push({ text: t, ws, x: xo(), y: y0 + lines.length * lh }); cur = []; cw = 0;
  };
  for (const wd of words) {
    const ww = c.measureText(wd).width;
    if (cur.length && cw + sp * cur.length + ww > wid()) push(false);
    cur.push(wd); cw += ww;
  }
  if (cur.length) push(true);
  return lines;
}
// Fill a column box with paragraphs from a sentence bank until it is full.
export function fillColumn(f, sents, x, w, y0, lh, maxLines, startIdx, o = {}) {
  const out = []; let i = startIdx, y = y0;
  while (out.length < maxLines) {
    const n = 2 + (i % 3), para = []; for (let k = 0; k < n; k++) para.push(sents[(i++) % sents.length]);
    const indent = o.indent ?? 14;
    const txt = para.join(' ');
    const ls = flow(f, (o.noIndent0 && out.length === 0 ? '' : ' ') + txt, x, w, y, lh, out.length === 0 ? o : { ...o, dropN: 0 });
    for (const l of ls) { if (out.length >= maxLines) break; out.push(l); y = l.y + lh; }
  }
  return out;
}

// ---- drawing -----------------------------------------------------------------
// Draw justified lines; `show(i)` gives 0..1 per line (cast progress).
export function drawLines(c, lines, f, t, t0, dt, ink = INK, alpha = 1) {
  c.font = f; c.fillStyle = ink; c.textBaseline = 'alphabetic';
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i], s = (t - (t0 + i * dt)) / 0.12;
    if (s <= 0) continue;
    c.globalAlpha = alpha * Math.min(1, s);
    c.wordSpacing = l.ws + 'px';
    c.fillText(l.text, l.x, l.y);
  }
  c.wordSpacing = '0px'; c.globalAlpha = 1;
}

// One slug per letter. Layout once; draw with times. `sx` squeezes the face (condensed headline type).
export function layoutHead(lines, fKey, size, sx, cx, baselines, track = 0) {
  const c = mctx(); c.font = font(fKey, size);
  const chars = []; let idx = 0;
  lines.forEach((ln, li) => {
    // total width with squeeze
    const widths = [...ln].map((ch) => c.measureText(ch).width * sx);
    const kern = [...ln].map((ch, k) => k === 0 ? 0 : (c.measureText(ln.slice(0, k + 1)).width - c.measureText(ln.slice(0, k)).width - c.measureText(ch).width) * sx);
    let total = 0; widths.forEach((w, k) => { total += w + kern[k] + (k ? track : 0); });
    let x = cx.align === 'left' ? cx.x : cx.x - total / 2;
    [...ln].forEach((ch, k) => {
      x += kern[k] + (k ? track : 0);
      if (ch !== ' ') chars.push({ ch, x, w: widths[k], y: baselines[li], i: idx++, li });
      x += widths[k];
    });
  });
  return { chars, size, sx, fKey };
}

// state of a slug at time t: 'none' | 'fall' | 'ink' | 'lift' | 'gone', with parameters
export function slugState(i, t, tIn, dtIn, tOut, dtOut) {
  const ti = tIn + i * dtIn;
  if (tOut != null) {
    const to = tOut + i * dtOut;
    if (t >= to + 0.32) return { st: 'gone' };
    if (t >= to) return { st: 'lift', u: (t - to) / 0.32 };
  }
  if (t < ti - 0.17) return { st: 'none' };
  if (t < ti) return { st: 'fall', u: (t - (ti - 0.17)) / 0.17 };
  return { st: 'ink', s: t - ti };
}

export function drawHead(c, H, t, tIn, dtIn, tOut = null, dtOut = 0.055, opt = {}) {
  const { chars, size, sx, fKey } = H, f = font(fKey, size), lh = size * 0.78;
  c.textBaseline = 'alphabetic';
  for (const ch of chars) {
    const S = slugState(ch.i, t, tIn, dtIn, tOut, opt.perm ? ch.i * 0 + dtOut : dtOut);
    if (S.st === 'none') continue;
    if (S.st === 'gone') {
      // blind impression left in the paper
      c.save(); c.translate(ch.x, ch.y); c.scale(sx, 1); c.font = f; c.fillStyle = 'rgba(40,30,20,.07)'; c.fillText(ch.ch, 1, 1); c.restore(); continue;
    }
    const metal = (dy, a, mirror) => {
      c.save(); c.globalAlpha = a; c.translate(ch.x + ch.w / 2, ch.y + dy);
      const bw = ch.w * 1.02 + 6, bh = size * 0.88;
      const g = c.createLinearGradient(0, -bh * 0.8, 0, bh * 0.1); g.addColorStop(0, '#9aa0a3'); g.addColorStop(0.5, '#6d7377'); g.addColorStop(1, '#4b5054');
      c.fillStyle = g; c.fillRect(-bw / 2, -bh * 0.82, bw, bh);
      c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(-bw / 2, -bh * 0.82, bw, 2.5);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(-bw / 2, -bh * 0.82 + bh - 3, bw, 3);
      // the face is cast in mirror on the metal
      c.scale(mirror ? -sx : sx, 1); c.font = f; c.fillStyle = '#c9ced1'; c.textAlign = 'center'; c.fillText(ch.ch, 0, 0);
      c.restore();
    };
    if (S.st === 'fall') {
      const u = S.u, e = u * u; metal(-(1 - e) * size * 0.9, 0.25 + 0.75 * Math.min(1, u * 2), true);
    } else if (S.st === 'lift') {
      const u = S.u; metal(-ss(u) * size * 1.3, 1 - ss(u), true);
    } else {
      // ink: first a heavy bite, then settles. Misregistered ghost beneath.
      const bite = 1 - clamp(S.s / 0.18);
      c.save(); c.translate(ch.x, ch.y); c.scale(sx, 1); c.font = f; c.textAlign = 'left';
      c.fillStyle = 'rgba(30,50,80,.17)'; c.fillText(ch.ch, -1.7, 1.3);
      c.fillStyle = INK; c.fillText(ch.ch, 0, 0);
      if (bite > 0) { c.globalAlpha = bite * 0.8; c.strokeStyle = INK; c.lineWidth = 2.4 * bite; c.lineJoin = 'round'; c.strokeText(ch.ch, 0, 0); }
      // slight bleed
      c.globalAlpha = 0.5; c.strokeStyle = INK; c.lineWidth = size * 0.012; c.strokeText(ch.ch, 0, 0);
      c.restore();
      if (bite > 0.4) { // a puff where the slug struck
        c.save(); c.globalAlpha = (bite - 0.4) * 0.5; c.fillStyle = 'rgba(40,36,30,.5)'; c.fillRect(ch.x - 3, ch.y + 2, ch.w + 6, 2.5); c.restore();
      }
    }
  }
  c.globalAlpha = 1; c.textAlign = 'left';
}
