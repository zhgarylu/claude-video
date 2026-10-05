// kit.js: colours, fonts, text with a reading-check registry, token flow (ruby, RTL, long words), small vector icons.
import { clamp, lerp, seg, ss, eo, back } from '/core/lib.js';
export { clamp, lerp, seg, ss, eo, back };

export const C = {
  ink: '#2a2118', paper: '#fbf0d9', paper2: '#f1dfb8', paperLine: '#e6cf9f', mute: '#7d6a52',
  red: '#e0392d', blue: '#2c6ae0', blueSoft: '#dbe6ff', yel: '#ffd23a', yelEdge: '#3b2300',
  navy: '#171d47', navy2: '#2b3270', navy3: '#454f9a', ok: '#3f9a62',
  orange: '#f2a02a', plum: '#8a4fd0', teal: '#1f9b9b',
  der: '#3b7dd8', die: '#d6458f', das: '#2f9a5c',          // grammatical gender (German); never used for the red answer
  tone: ['#8c8478', '#e8890c', '#2f9a5c', '#2c6ae0', '#8a4fd0'], // pinyin tones: neutral, 1, 2, 3, 4
};
export const PW = 980, PH = 670;                          // the design size of a card; the card is scaled to fit its slot

// ---------------------------------------------------------------- fonts
export const STACK = {
  lat: 'Nunito, NotoSC, NotoJP, NotoIPA, sans-serif',
  zh: 'Nunito, NotoSC, NotoJP, sans-serif',
  ja: 'NotoJP, Nunito, NotoSC, sans-serif',
  ar: 'NotoAr, Nunito, sans-serif',
  hand: 'Caveat, Nunito, NotoSC, sans-serif',
  ipa: 'NotoIPA, Nunito, sans-serif',
};
export const setFont = (ctx, size, w = 700, lang = 'lat', italic = false) => { ctx.font = `${italic ? 'italic ' : ''}${w} ${size}px ${STACK[lang] || STACK.lat}`; };
export const isCJK = s => /[぀-ヿ㐀-鿿]/.test(s);

// ---------------------------------------------------------------- reading-check registry (window.TEXTS)
let REG = [];
export const resetTexts = () => { REG = []; };
export const takeTexts = () => REG;
export function reg(ctx, id, text, x0, y0, x1, y1, alpha = 1) {
  if (ctx.globalAlpha * alpha < 0.06) return;
  const m = ctx.getTransform(), P = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
  REG.push({ id, text, x0: Math.min(...P.map(p => p[0])), y0: Math.min(...P.map(p => p[1])), x1: Math.max(...P.map(p => p[0])), y1: Math.max(...P.map(p => p[1])) });
}

// draw one run of text; returns its width. o: size w lang fill align base stroke sw id alpha italic ls rtl
export function txt(ctx, s, x, y, o = {}) {
  const { size = 40, w = 700, lang = 'lat', fill = C.ink, align = 'left', base = 'alphabetic', stroke, sw = 0, id, alpha = 1, italic = false, ls = 0, rtl = false } = o;
  ctx.save();
  setFont(ctx, size, w, lang, italic); ctx.textAlign = align; ctx.textBaseline = base; ctx.direction = rtl ? 'rtl' : 'ltr'; ctx.letterSpacing = ls + 'px'; ctx.globalAlpha *= alpha;
  const wd = ctx.measureText(s).width;
  if (stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.strokeText(s, x, y); }
  ctx.fillStyle = fill; ctx.fillText(s, x, y);
  const gx = ctx.globalAlpha; ctx.restore();
  if (id) {
    const x0 = align === 'left' ? x : align === 'center' ? x - wd / 2 : x - wd;
    const [y0, y1] = base === 'middle' ? [y - size * .56, y + size * .56] : [y - size * .86, y + size * .26];
    reg(ctx, id, s, x0, y0, x0 + wd, y1, gx / (ctx.globalAlpha || 1));
  }
  return wd;
}
export const width = (ctx, s, size, w = 700, lang = 'lat') => { ctx.save(); setFont(ctx, size, w, lang); const v = ctx.measureText(s).width; ctx.restore(); return v; };

// ---------------------------------------------------------------- tokens: a sentence is a list of tokens, so any script flows the same way
// token: {t, r?(ruby), lang?, blank?, clue?, gender?('m'|'f'|'n'), nosp?}
export function measureTok(ctx, tok, o) {
  if (tok.blank) return { w: o.blankW ?? o.size * 3.2, tw: 0, rw: 0 };
  setFont(ctx, o.size, o.w ?? 800, tok.lang || o.lang); const tw = ctx.measureText(tok.t).width;
  let rw = 0; if (tok.r) { setFont(ctx, o.size * (o.rubyScale ?? .4), 800, tok.lang || o.lang); rw = ctx.measureText(tok.r).width; }
  return { w: Math.max(tw, rw + 6), tw, rw };
}
// lay tokens out in lines no wider than maxW; long words shrink to 72 % and then break at soft hyphens (U+00AD)
export function flow(ctx, toks, o) {
  const sp = o.nospace ? 0 : o.size * .3;
  let items = [];
  for (const tok of toks) {
    let m = measureTok(ctx, tok, o), scale = 1;
    if (m.w > o.maxW && !tok.blank) { scale = Math.max(.72, o.maxW / m.w); m = measureTok(ctx, tok, { ...o, size: o.size * scale }); }
    if (m.w > o.maxW && tok.t && tok.t.includes('­')) {      // still too wide: hyphenate
      const parts = tok.t.split('­'); let cur = '';
      for (let i = 0; i < parts.length; i++) {
        const tryS = cur + parts[i], mm = measureTok(ctx, { ...tok, t: tryS + '-' }, { ...o, size: o.size * scale });
        if (mm.w > o.maxW && cur) { items.push({ tok: { ...tok, t: cur + '-' }, ...measureTok(ctx, { ...tok, t: cur + '-' }, { ...o, size: o.size * scale }), scale, brk: true }); cur = parts[i]; } else cur = tryS;
      }
      items.push({ tok: { ...tok, t: cur }, ...measureTok(ctx, { ...tok, t: cur }, { ...o, size: o.size * scale }), scale });
      continue;
    }
    items.push({ tok, ...m, scale });
  }
  const lines = []; let L = { items: [], w: 0 };
  for (const it of items) {
    const gap = L.items.length && !it.tok.nosp ? sp : 0;
    if ((L.w + gap + it.w > o.maxW && L.items.length) || (L.items.length && L.items[L.items.length - 1].brk)) { lines.push(L); L = { items: [], w: 0 }; }
    const g = L.items.length && !it.tok.nosp ? sp : 0; it.gap = g; L.w += g + it.w; L.items.push(it);
  }
  if (L.items.length) lines.push(L);
  const lineH = o.size * (o.lineGap ?? 1.5) + (o.ruby ? o.size * .3 : 0);
  return { lines, lineH, sp, height: lines.length * lineH };
}
// x positions of each item in a laid-out line, inside [x0, x0+W]; for RTL the first token sits on the right
export function place(line, x0, W, align, rtl) {
  const start = align === 'center' ? x0 + (W - line.w) / 2 : align === 'right' ? x0 + W - line.w : x0;
  let x = rtl ? start + line.w : start; const out = [];
  for (const it of line.items) {
    if (rtl) { x -= it.gap; x -= it.w; out.push({ ...it, x }); } else { x += it.gap; out.push({ ...it, x }); x += it.w; }
  }
  return out;
}

// ---------------------------------------------------------------- shapes
export function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
export function pill(ctx, x, y, w, h, fill, stroke, lw = 0) { rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } }
export function shadowed(ctx, fn, blur = 30, dy = 14, a = .35) { ctx.save(); ctx.shadowColor = `rgba(8,10,40,${a})`; ctx.shadowBlur = blur; ctx.shadowOffsetY = dy; fn(); ctx.restore(); }
export function check(ctx, cx, cy, s, col = '#fff', lw = 7) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(cx - s * .5, cy); ctx.lineTo(cx - s * .12, cy + s * .38); ctx.lineTo(cx + s * .55, cy - s * .38); ctx.stroke(); ctx.restore(); }
export function star(ctx, cx, cy, r, rot, fill) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr_ = i % 2 ? r * .38 : r; ctx.lineTo(Math.sin(a) * rr_, -Math.cos(a) * rr_); } ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.restore(); }
export function speaker(ctx, cx, cy, s, col, waves = 2) {
  ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = s * .12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-s * .5, -s * .2); ctx.lineTo(-s * .2, -s * .2); ctx.lineTo(s * .1, -s * .5); ctx.lineTo(s * .1, s * .5); ctx.lineTo(-s * .2, s * .2); ctx.lineTo(-s * .5, s * .2); ctx.closePath(); ctx.fill();
  for (let i = 0; i < waves; i++) { ctx.beginPath(); ctx.arc(s * .1, 0, s * (.32 + i * .24), -.9, .9); ctx.stroke(); }
  ctx.restore();
}
export function clockIcon(ctx, cx, cy, r, col) {
  ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = col; ctx.fillStyle = '#fff'; ctx.lineWidth = r * .16; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -r * .62); ctx.lineTo(0, 0); ctx.lineTo(r * .42, r * .22); ctx.stroke(); ctx.restore();
}
export function calendarIcon(ctx, cx, cy, r, col) {
  ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = col; ctx.lineWidth = r * .14; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  rr(ctx, -r, -r * .85, r * 2, r * 1.8, r * .22); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = col; ctx.fillRect(-r, -r * .85, r * 2, r * .5); ctx.beginPath(); ctx.arc(0, r * .25, r * .28, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-r * .5, -r * 1.05); ctx.lineTo(-r * .5, -r * .65); ctx.moveTo(r * .5, -r * 1.05); ctx.lineTo(r * .5, -r * .65); ctx.stroke(); ctx.restore();
}
export function spanIcon(ctx, cx, cy, r, col) {          // a long bar with end stops: a stretch of time
  ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = col; ctx.lineWidth = r * .2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(-r, -r * .42); ctx.lineTo(-r, r * .42); ctx.moveTo(r, -r * .42); ctx.lineTo(r, r * .42); ctx.stroke();
  ctx.fillStyle = col; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * r * .38, 0, r * .12, 0, 7); ctx.fill(); } ctx.restore();
}
export function stopwatch(ctx, cx, cy, r, p, col = C.ink, pulse = 0) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1 + pulse * .09, 1 + pulse * .09);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = col; ctx.lineWidth = r * .13; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.stroke();
  rr(ctx, -r * .22, -r * 1.28, r * .44, r * .24, r * .06); ctx.fillStyle = col; ctx.fill();
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(Math.sin(a) * r * .78, -Math.cos(a) * r * .78); ctx.lineTo(Math.sin(a) * r * .92, -Math.cos(a) * r * .92); ctx.lineWidth = r * .06; ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * .66, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.closePath(); ctx.fillStyle = 'rgba(224,57,45,.28)'; ctx.fill();
  const a = p * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(a) * r * .72, -Math.cos(a) * r * .72); ctx.strokeStyle = C.red; ctx.lineWidth = r * .1; ctx.lineCap = 'round'; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * .08, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.restore();
}
export function wavy(ctx, x0, x1, y, amp, col, lw, prog = 1, step = 18) {
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath();
  const end = x0 + (x1 - x0) * prog; for (let x = x0, i = 0; x <= end + .1; x += 4, i++) { const yy = y + Math.sin((x - x0) / step * Math.PI) * amp; i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke(); ctx.restore();
}
