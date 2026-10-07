// The two shot types of an article film: `figure` (a still image from the article, pushed in or panned slowly, with boxes, numbered markers, a card and a
// caption plate that always carries the credit) and `quote` (the article's own sentence typeset big, key words highlighted in step with the narration).
// Both are deterministic functions of the local time. Text never sits on the figure: the card and the marker legend live beside or under it, and the
// only labels on the picture (box labels) are placed where they do not cover another focus rect. `R.focus` collects the focus rects so lint.mjs can check it.
import { clamp, seg, ss, eo, eio, rr, para, line, chip, badge, arrow, font, measure, wrap } from './draw.js';
import { box, spotlight } from './footage.js';
import { P, ptr, withPop, panel, rect4, ground } from './shots.js';
import { rgba } from './theme.js';

export const LABELS = {
  zh: { figure: '原文配图', quote: '原文摘录', credit: '图源：', from: '出自：', unknown: '未注明' },
  en: { figure: 'Figure from the article', quote: 'Quote from the article', credit: 'Source: ', from: 'From: ', unknown: 'not stated' },
};
export const labelsFor = spec => ({ ...(LABELS[['zh', 'yue', 'ja'].includes(spec.lang || 'zh') ? 'zh' : 'en']), ...(spec.labels || {}) });
export const MIN_TEXT = 30;                                  // px at 1080 wide/high: nothing the film draws is smaller

// ───────────────────────────── geometry
// Candidate layouts for a figure; the one that shows the focus largest wins (a shot may force one with `layout`).
//   side: figure left, annotations in a column on the right (16:9)      wide: figure across, annotations in a row under it      full: no annotations
//   v:    the 9:16 stack: figure on top, annotations under it
export function figureGeometry(R, sh, im, hasAnn) {
  const { L } = R, iw = im.naturalWidth, ih = im.naturalHeight, crop = sh.crop ? rect4(sh.crop) : { x: 0, y: 0, w: 1, h: 1 };
  const fa = (crop.w * iw) / (crop.h * ih), M = L.M;
  const capH = 56, gap = 12;
  if (L.V) {
    const fw = L.W - 2 * M, maxH = hasAnn ? 640 : 900, h1 = clamp(fw / fa, 340, maxH), y = 222;
    const fig = { x: M, y, w: fw, h: Math.round(h1) }, cap = { x: M, y: y + fig.h + 10, w: fw, h: capH };
    const ay = cap.y + capH + 16;
    return { mode: 'v', fig, cap, ann: hasAnn ? { x: M, y: ay, w: fw, h: 1340 - ay } : null };
  }
  const full = { x: M, y: 124, w: L.W - 2 * M, h: 672 }, side = { x: M, y: 124, w: 1160, h: 672 };
  const h1 = clamp(full.w / fa, 300, 430), wide = { x: M, y: 124, w: full.w, h: Math.round(h1) };
  const shown = a => { const s = Math.min(a.w / (crop.w * iw), a.h / (crop.h * ih)); return crop.w * iw * s * crop.h * ih * s; };
  let mode = sh.layout && ['side', 'wide', 'full'].includes(sh.layout) ? sh.layout : null;
  if (!hasAnn) mode = 'full'; else if (!mode || mode === 'full') mode = shown(side) >= shown(wide) * 1.05 ? 'side' : 'wide';
  if (mode === 'full') return { mode, fig: full, cap: { x: M, y: full.y + full.h + 8, w: full.w, h: capH }, ann: null };
  if (mode === 'side') return { mode, fig: side, cap: { x: M, y: side.y + side.h + 8, w: side.w, h: capH }, ann: { x: M + side.w + 40, y: 124, w: L.W - M - (M + side.w + 40), h: 672 + 8 + capH } };
  const cy = wide.y + wide.h + 8, ay = cy + capH + 12;
  return { mode, fig: wide, cap: { x: M, y: cy, w: wide.w, h: capH }, ann: { x: M, y: ay, w: wide.w, h: 856 - ay } };
}

// ───────────────────────────── the view of the image: { s (screen px per image px), cx, cy (normalised point at the centre of the figure area) }
function clampCentre(v, im, area) {
  const hx = area.w / (2 * v.s * im.naturalWidth), hy = area.h / (2 * v.s * im.naturalHeight);
  return { s: v.s, cx: hx >= .5 ? .5 : clamp(v.cx, hx, 1 - hx), cy: hy >= .5 ? .5 : clamp(v.cy, hy, 1 - hy) };
}
export function figureView(sh, lt, im, area) {
  const iw = im.naturalWidth, ih = im.naturalHeight, fit = Math.min(area.w / iw, area.h / ih), dur = sh.dur || 6, crop = sh.crop ? rect4(sh.crop) : null;
  if (crop) {
    const s1 = Math.min(Math.min(area.w / (crop.w * iw), area.h / (crop.h * ih)) * .94, Math.max(fit, 3.5)), z0 = sh.sched?.zoom0 ?? .55, z1 = sh.sched?.zoom1 ?? 1.5, e = eio(seg(lt, z0, z1));
    const s = Math.exp(Math.log(fit) + (Math.log(s1) - Math.log(fit)) * e) * (1 + .035 * seg(lt, z1, dur));
    return clampCentre({ s, cx: .5 + (crop.x + crop.w / 2 - .5) * e, cy: .5 + (crop.y + crop.h / 2 - .5) * e }, im, area);
  }
  const pan = sh.pan || 'auto', widthFit = area.w / iw, heightFit = area.h / ih, aspectImg = iw / ih, aspectArea = area.w / area.h;
  const tall = (pan === 'scroll' && aspectImg <= aspectArea) || (pan === 'auto' && ih * widthFit > area.h * 1.3 && iw * heightFit < area.w * .75), wideImg = (pan === 'scroll' && aspectImg > aspectArea) || (pan === 'auto' && iw * heightFit > area.w * 2.0);
  if (tall) {                                                    // a tall image: fit the width and scroll down (deterministic, linear-ish)
    const hh = area.h / (2 * widthFit * ih), [a, b] = Array.isArray(sh.scroll) ? sh.scroll : [0, 1 - 2 * hh], e = eio(seg(lt, ...(sh.scroll_t || [.8, dur - 1.2])));
    return clampCentre({ s: widthFit, cx: .5, cy: a + hh + (b - a) * e }, im, area);
  }
  if (wideImg) {                                                 // a very wide one: fit the height and pan across
    const hw = area.w / (2 * heightFit * iw), [a, b] = Array.isArray(sh.scroll) ? sh.scroll : [0, 1 - 2 * hw], e = eio(seg(lt, ...(sh.scroll_t || [.8, dur - 1.2])));
    return clampCentre({ s: heightFit, cy: .5, cx: a + hw + (b - a) * e }, im, area);
  }
  let fx = .5, fy = .5;                                          // otherwise: the whole picture with a slow push towards what the boxes mark
  if ((sh.boxes || []).length) { const rs = sh.boxes.map(b => rect4(b.rect)); fx = rs.reduce((q, r) => q + r.x + r.w / 2, 0) / rs.length; fy = rs.reduce((q, r) => q + r.y + r.h / 2, 0) / rs.length; }
  const k = .03 * seg(lt, 0, dur);
  return clampCentre({ s: fit * (1 + k), cx: .5 + (fx - .5) * k, cy: .5 + (fy - .5) * k }, im, area);
}

// ───────────────────────────── the credit plate under the figure
function creditPlate(R, sh, plate) {
  const { ctx, L, th } = R, lab = R.labels, src = (R.spec.sources || {})[sh.src] || {};
  const credit = lab.credit + (sh.credit || src.credit || src.title || lab.unknown), cap = sh.caption || src.caption || '';
  const size = L.V ? 32 : 32, h = plate.h, y = plate.y;
  ctx.save(); ctx.fillStyle = th.plate; ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3; rr(ctx, plate.x, y, plate.w, h, 14); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = th.line; ctx.lineWidth = 2; rr(ctx, plate.x, y, plate.w, h, 14); ctx.stroke(); ctx.fillStyle = th.accent; rr(ctx, plate.x, y, 10, h, 5); ctx.fill(); ctx.restore();
  const fit = (text, w0, weight) => { let s = size; for (;;) { const w = measure(R, text, weight, s); if (w <= w0 || s <= MIN_TEXT) break; s -= 1; } let t = text; while (measure(R, t, weight, s) > w0 && t.length > 4) t = t.slice(0, -2); return { t: t === text ? t : t.trimEnd() + '…', s }; };
  const c = fit(credit, plate.w * .9 - 40, 800), cw = measure(R, c.t, 800, c.s);       // the credit is shortened last; the caption gets what is left
  line(R, c.t, plate.x + 28, y + h / 2 + c.s * .36, { size: c.s, weight: 800, color: th.plateInk, id: 'credit', stable: true });
  if (cap) { const room = plate.w - 28 - cw - 56, cc = fit(cap, room, 500); if (room > 160) line(R, cc.t, plate.x + 28 + cw + 28, y + h / 2 + cc.s * .36, { size: cc.s, weight: 500, color: th.muted, id: 'caption', stable: true }); }
}

// ───────────────────────────── the annotation column / row / stack: the card, then the numbered legend
function annotations(R, sh, lt, ann, mode) {
  const { L, th } = R, V = L.V, card = sh.card, marks = sh.markers || [];
  let y = ann.y, x = ann.x, w = ann.w;
  const legendRight = mode === 'wide' && card && marks.length;
  if (legendRight) w = (ann.w - 40) / 2;
  if (card) {
    const o = ptr(R, sh, lt, 'card', .5), pad = 34, tS = V ? 44 : 46, bS = V ? 38 : 40, inner = w - pad * 2 - 12, maxH = ann.h;
    const tp = para(R, card.title || '', 0, 0, inner, { size: tS, min: 38, weight: 800, maxLines: 2, dry: true }), bp = card.body ? para(R, card.body, 0, 0, inner, { size: bS, min: 36, weight: 500, lh: 1.32, maxLines: V ? 3 : (mode === 'wide' ? 3 : 6), dry: true }) : { h: 0 };
    const h = Math.min(maxH, 26 + tp.h + (bp.h ? 12 + bp.h : 0) + 28);
    if (o.p > 0) withPop(R, o, () => {
      panel(R, x, y, w, h, { fill: rgba(th.panel, .97), stroke: th.accent, lw: 3, r: 20 }); R.ctx.fillStyle = th.accent; rr(R.ctx, x, y, 12, h, 6); R.ctx.fill();
      para(R, card.title || '', x + pad + 8, y + 24, inner, { size: tp.size, weight: 800, color: th.accent, maxLines: 2, id: 'card:title' });
      if (bp.h) para(R, card.body, x + pad + 8, y + 24 + tp.h + 12, inner, { size: bp.size, weight: 500, lh: 1.32, maxLines: V ? 3 : (mode === 'wide' ? 3 : 6), id: 'card:body' });
    });
    if (legendRight) { x = ann.x + w + 40; y = ann.y; } else y += h + 22;
  }
  if (marks.length) {
    const rowMax = Math.max(80, Math.min(V ? 96 : 110, (ann.y + ann.h - y) / marks.length)), size = V ? 38 : 40, tw = w - 96;
    marks.forEach((k, i) => {
      const o = ptr(R, sh, lt, 'mark:' + i, .4), top = y + i * rowMax; if (o.p <= 0) return;
      withPop(R, o, () => { badge(R, k.n ?? i + 1, x + 32, top + rowMax / 2 - 4, 28); para(R, k.text || '', x + 80, top + rowMax / 2 - size * .62 - 6, tw, { size, min: 34, weight: 700, lh: 1.2, maxLines: 2, id: 'legend:' + i }); });
    });
  }
}

// ───────────────────────────── figure
export function figure(R, sh, lt) {
  const { ctx, L, th } = R; ground(R); const im = R.stills.get(sh.id); if (!im) return;
  const hasAnn = !!(sh.card || (sh.markers || []).length), G = figureGeometry(R, sh, im, hasAnn), A = G.fig;
  const view = figureView(sh, lt, im, A), iw = im.naturalWidth, ih = im.naturalHeight, dw = iw * view.s, dh = ih * view.s;
  const ox = A.x + A.w / 2 - view.cx * dw, oy = A.y + A.h / 2 - view.cy * dh, map = (nx, ny) => [ox + nx * dw, oy + ny * dh];
  // the plate and the picture (never stretched: one scale for both axes; what the picture does not cover shows the plate)
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6; ctx.fillStyle = th.panel; rr(ctx, A.x - 8, A.y - 8, A.w + 16, A.h + 16, 22); ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, A.x, A.y, A.w, A.h, 14); ctx.clip();
  ctx.fillStyle = th.dark ? th.panel2 : '#FFFFFF'; ctx.fillRect(A.x, A.y, A.w, A.h);
  if (sh.img?.alpha || sh.matte === 'white') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(ox, oy, dw, dh); }
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, ox, oy, dw, dh);
  // focus: boxes (the rest dims), arrows, markers
  const boxes = (sh.boxes || []).map((b, i) => { const r = rect4(b.rect), [x, y] = map(r.x, r.y), [x2, y2] = map(r.x + r.w, r.y + r.h); return { b, i, p: P(sh, lt, 'box:' + i, .5), x, y, w: x2 - x, h: y2 - y }; });
  const pmax = Math.max(0, ...boxes.map(b => b.p)); if (sh.spot !== false && boxes.length) spotlight(R, A, boxes.filter(b => b.p > 0).map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h })), .22 * ss(pmax));
  const vis = b => { const ix = Math.max(0, Math.min(b.x + b.w, A.x + A.w) - Math.max(b.x, A.x)), iy = Math.max(0, Math.min(b.y + b.h, A.y + A.h) - Math.max(b.y, A.y)); return ix * iy / Math.max(1, b.w * b.h); };
  const bbs = boxes.map(b => ({ ...b, bb: box(R, b.x, b.y, b.w, b.h, b.p), vis: vis(b) }));
  (sh.arrows || []).forEach((a, i) => { const p = P(sh, lt, 'arrow:' + i, .6); if (p <= 0) return; const [x0, y0] = map(a.from[0], a.from[1]), [x1, y1] = map(a.to[0], a.to[1]); arrow(R, x0, y0, x1, y1, eo(p)); });
  const mr = L.V ? 24 : 28, mpts = [];
  (sh.markers || []).forEach((k, i) => {
    // the numbered disc sits beside the point it marks (a small ring marks the point itself, a thin leader joins them), so it never covers what it points at
    const o = ptr(R, sh, lt, 'mark:' + i, .4), [px, py] = map(k.at[0], k.at[1]), inView = px > A.x + 4 && px < A.x + A.w - 4 && py > A.y + 4 && py < A.y + A.h - 4;
    let dx = px - (A.x + A.w / 2), dy = py - (A.y + A.h / 2); const dl = Math.hypot(dx, dy); if (dl < 1) { dx = -1; dy = -1; } else { dx /= dl; dy /= dl; }
    const off = mr * 1.75; let cx = clamp(px + dx * off, A.x + mr + 4, A.x + A.w - mr - 4), cy = clamp(py + dy * off, A.y + mr + 4, A.y + A.h - mr - 4);
    mpts.push(inView ? [cx, cy] : null);
    if (o.p <= 0 || !inView) return;      // a marker outside the current view is not drawn (its row in the list stays)
    const age = lt - (sh.sched?.['mark:' + i] ?? 0), rp = seg(age, 0, .8);
    ctx.save(); ctx.globalAlpha *= ss(o.p * 1.6); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.strokeStyle = th.accent; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, 8, 0, 6.2832); ctx.fillStyle = th.accent; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    if (rp < 1) { ctx.save(); ctx.globalAlpha *= (1 - rp) * .8; ctx.strokeStyle = th.accent; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, mr + 8 + rp * 36, 0, 6.2832); ctx.stroke(); ctx.restore(); }
    badge(R, k.n ?? i + 1, cx, cy, mr * (.6 + .4 * eo(o.p)), { alpha: ss(o.p * 1.6) });
  });
  // focus rects for lint (screen coordinates): the boxes and the marker discs
  for (const b of bbs) if (b.p > 0 && b.bb && b.vis > .35) R.focusAdd('box' + b.i, b.bb.x, b.bb.y, b.bb.x + b.bb.w, b.bb.y + b.bb.h);
  mpts.forEach((pt, i) => { if (pt && P(sh, lt, 'mark:' + i, .4) > 0) R.focusAdd('mark' + i, pt[0] - mr, pt[1] - mr, pt[0] + mr, pt[1] + mr); });
  // box labels: a chip next to its box, on the first side where it covers no other focus rect and stays on the figure
  const taken = [...mpts.filter(Boolean).map(([cx, cy]) => ({ x: cx - mr, y: cy - mr, w: 2 * mr, h: 2 * mr })), ...bbs.filter(b => b.bb && b.vis > .35).map(b => ({ x: b.bb.x, y: b.bb.y, w: b.bb.w, h: b.bb.h }))];
  for (const b of bbs) {
    if (!b.b.label || b.p <= 0 || !b.bb || b.vis < .35) continue; const S = L.sizes.label, w = measure(R, b.b.label, 800, S) + 40, h = S * 1.62, bb = b.bb;
    const cands = [[bb.x, bb.y - h - 8], [bb.x, bb.y + bb.h + 8], [bb.x + bb.w - w, bb.y - h - 8], [bb.x + bb.w - w, bb.y + bb.h + 8], [bb.x + bb.w + 8, bb.y], [bb.x - w - 8, bb.y]];
    const hit = (c, r) => c[0] < r.x + r.w && c[0] + w > r.x && c[1] < r.y + r.h && c[1] + h > r.y, inside = c => c[0] >= A.x + 4 && c[1] >= A.y + 4 && c[0] + w <= A.x + A.w - 4 && c[1] + h <= A.y + A.h - 4;
    const pick = cands.find(c => inside(c) && !taken.some(r => hit(c, r))) || cands.find(c => inside(c)) || [clamp(bb.x, A.x + 4, A.x + A.w - w - 4), clamp(bb.y - h - 8, A.y + 4, A.y + A.h - h - 4)];
    chip(R, b.b.label, pick[0], pick[1], { size: S, bg: th.accent, color: th.accentInk, alpha: ss(b.p), id: 'box:' + b.i });
  }
  ctx.restore();
  // the frame of the plate, then the credit plate (on screen as long as the figure is) and the annotations
  ctx.save(); ctx.strokeStyle = th.line; ctx.lineWidth = 2.5; rr(ctx, A.x, A.y, A.w, A.h, 14); ctx.stroke(); ctx.restore();
  creditPlate(R, sh, G.cap);
  if (G.ann) annotations(R, sh, lt, G.ann, G.mode);
  // a figure arrives with a small ease, not a flash
}

// ───────────────────────────── quote
function layoutLines(ctx, text, maxW) {
  const lines = wrap(ctx, text, maxW); let cur = 0;
  return lines.map(ln => { const i = text.indexOf(ln, cur), st = i < 0 ? cur : i; cur = st + ln.length; return { text: ln, start: st, end: st + ln.length }; });
}
export function quoteMarks(text, marks) {
  const out = []; let from = 0;
  for (let m of marks || []) { if (m && typeof m === 'object') m = m.text; if (!m) continue; let i = text.indexOf(m, 0); if (i < 0) i = text.toLowerCase().indexOf(String(m).toLowerCase()); if (i < 0) continue; out.push({ a: i, b: i + m.length }); from = i + m.length; }
  return out;
}
export function quote(R, sh, lt) {
  const { ctx, L, th } = R, V = L.V, lab = R.labels, A = L.area; ground(R);
  const px = A.x, pw = A.w, py = V ? 230 : 150, ph = V ? 1000 : 640, pad = V ? 48 : 110, text = String(sh.text || ''), art = (R.spec.article || {});
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6; ctx.fillStyle = th.panel; rr(ctx, px, py, pw, ph, 28); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = th.line; ctx.lineWidth = 2.5; rr(ctx, px, py, pw, ph, 28); ctx.stroke(); ctx.fillStyle = th.accent; rr(ctx, px, py, 14, ph, 7); ctx.fill(); ctx.restore();
  // the opening mark, large and quiet
  ctx.save(); ctx.globalAlpha *= .85; ctx.fillStyle = th.accent; ctx.font = font(R, 900, V ? 190 : 230); ctx.textBaseline = 'alphabetic'; ctx.fillText('“', px + (V ? 34 : 58), py + (V ? 190 : 230)); ctx.restore();
  // attribution (bottom of the card): where the sentence comes from
  const by = sh.by || [art.title, art.site, art.author, art.date].filter(Boolean).join(' · '), attr = by ? lab.from + by : '';
  const attrY = py + ph - (V ? 84 : 92);
  if (attr) {
    let s = V ? 34 : 36; while (measure(R, attr, 600, s) > pw - 2 * pad && s > MIN_TEXT) s -= 1; let t = attr; while (measure(R, t, 600, s) > pw - 2 * pad && t.length > 6) t = t.slice(0, -2);
    ctx.save(); ctx.strokeStyle = rgba(th.line, .9); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + pad, attrY - 18); ctx.lineTo(px + pw - pad, attrY - 18); ctx.stroke(); ctx.restore();
    line(R, t === attr ? t : t.trimEnd() + '…', px + pad, attrY + s * .78, { size: s, weight: 600, color: th.muted, id: 'attr' });
  }
  // the sentence
  const tx = px + pad, tw = pw - 2 * pad, ty0 = py + (V ? 190 : 150), maxH = attrY - 30 - ty0;
  let size = sh.size || (V ? 80 : 96); const min = V ? 44 : 48, lhr = 1.32, maxLines = V ? 9 : 4, lines0 = () => { ctx.font = font(R, 800, size); return layoutLines(ctx, text, tw); };
  let lines = lines0(); while ((lines.length * size * lhr > maxH || (lines.length > maxLines && size > (V ? 56 : 60))) && size > min) { size -= 2; lines = lines0(); }
  const lh = size * lhr, marks = quoteMarks(text, sh.marks), ty = ty0 + Math.max(0, (maxH - lines.length * lh) * .35);
  const o = ptr(R, sh, lt, 'text', .5);
  withPop(R, { a: Math.max(o.a, 0), dy: o.dy * .5 }, () => {
    ctx.font = font(R, 800, size); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
    // highlights first (under the glyphs), each swept left to right when the narration says it
    const sweeps = [];
    marks.forEach((m, i) => {
      const p = ss(P(sh, lt, 'hl:' + i, .45)); if (p <= 0) return;
      for (const ln of lines.map((l, k) => ({ ...l, k }))) {
        const s0 = Math.max(m.a, ln.start), e0 = Math.min(m.b, ln.end); if (e0 <= s0) continue;
        const x0 = ctx.measureText(ln.text.slice(0, s0 - ln.start)).width, x1 = ctx.measureText(ln.text.slice(0, e0 - ln.start)).width, base = ty + size + ln.k * lh - size * .2;
        sweeps.push({ x: tx + x0 - 8, y: base - size * .98, w: (x1 - x0 + 16) * p, h: size * 1.28 });
      }
    });
    for (const s of sweeps) { ctx.fillStyle = th.accent; rr(ctx, s.x, s.y, s.w, s.h, 10); ctx.fill(); }
    lines.forEach((ln, k) => {
      const base = ty + size + k * lh - size * .2; ctx.fillStyle = th.ink; ctx.fillText(ln.text, tx, base);
      for (const s of sweeps) if (s.y < base && s.y + s.h > base - size) { ctx.save(); ctx.beginPath(); ctx.rect(s.x + 6, s.y, Math.max(0, s.w - 12), s.h); ctx.clip(); ctx.fillStyle = th.accentInk; ctx.fillText(ln.text, tx, base); ctx.restore(); }
    });
  });
  let wmax = 0; ctx.font = font(R, 800, size); for (const ln of lines) wmax = Math.max(wmax, ctx.measureText(ln.text).width);
  R.report('quote', text, tx, ty, tx + wmax, ty + lines.length * lh, o.a, false, size);
}
