// The five shot types. Each draws one frame at local time `lt` into R.ctx. Reveal times come from the shot's `sched` (computed by prep.py
// from the narration), so the page, the sound events and the reading-time check all read the same numbers.
import { clamp, seg, ss, eo, eio, rr, para, line, chip, badge, arrow, pop, font, measure, isCJK } from './draw.js';
import { drawView, fitScale, box, spotlight } from './footage.js';
import { drawPip } from './source.js';
import { rgba } from './theme.js';

export const P = (sh, lt, k, d = .45) => { const T = sh.sched?.[k]; return T === undefined ? 1 : seg(lt, T, T + d); };
export const mmss = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = Math.floor(s % 60); return `${m}:${String(r).padStart(2, '0')}`; };
const rect4 = r => Array.isArray(r) ? { x: r[0], y: r[1], w: r[2], h: r[3] } : r;

export function ground(R) {
  const { ctx, W, H, th } = R, g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.ground); g.addColorStop(1, th.ground2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = rgba(th.line, .32); ctx.lineWidth = 1; ctx.beginPath(); for (let x = 0; x <= W; x += 96) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); } for (let y = 0; y <= H; y += 96) { ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); } ctx.stroke();
}
const panel = (R, x, y, w, h, o = {}) => {
  const { ctx, th } = R; ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.shadowColor = 'rgba(0,0,0,0.28)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
  ctx.fillStyle = o.fill ?? th.panel; rr(ctx, x, y, w, h, o.r ?? 20); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = o.stroke ?? th.line; ctx.lineWidth = o.lw ?? 2.5; if (o.dash) ctx.setLineDash(o.dash); rr(ctx, x, y, w, h, o.r ?? 20); ctx.stroke(); ctx.restore();
};
const ptr = (R, sh, lt, k, d) => { const p = P(sh, lt, k, d); return { p, ...pop(p) }; };
const withPop = (R, o, fn) => { const { ctx } = R; ctx.save(); ctx.globalAlpha *= o.a; ctx.translate(0, o.dy); fn(); ctx.restore(); };

// ───────────────────────────── hook
export function hook(R, sh, lt) {
  const { ctx, L, th } = R, A = L.area, V = L.V, x0 = A.x + (V ? 24 : 56), maxW = A.w - (V ? 48 : 260);
  ground(R);
  const bg = R.stills.get(sh.id + ':bg');
  if (bg) { const s = Math.max(R.W / bg.naturalWidth, R.H / bg.naturalHeight) * (1 + .03 * (lt / Math.max(1, sh.dur))); ctx.save(); ctx.globalAlpha = .5; ctx.drawImage(bg, R.W / 2 - bg.naturalWidth * s / 2, R.H / 2 - bg.naturalHeight * s / 2, bg.naturalWidth * s, bg.naturalHeight * s); ctx.restore(); ctx.fillStyle = rgba(th.ground, .88); ctx.fillRect(0, 0, R.W, R.H); }
  const big = sh.big, kS = V ? 40 : 46, bigS = V ? 150 : 210, tS = big ? (V ? 80 : 100) : (V ? 100 : 128), sS = V ? 44 : 54;
  ctx.font = font(R, 800, tS); const tp = para(R, sh.title || '', 0, 0, maxW, { size: tS, min: 60, weight: 800, lh: 1.16, maxLines: 3, dry: true });
  const sp = sh.sub ? para(R, sh.sub, 0, 0, maxW, { size: sS, min: 36, weight: 500, lh: 1.35, maxLines: 3, dry: true }) : { h: 0 };
  const metaH = (sh.meta || []).length ? 100 : 0;
  const parts = [sh.kicker ? kS * 1.5 : 0, big ? bigS * 1.12 : 0, tp.h + 12, sp.h ? sp.h + 14 : 0, metaH];
  const total = parts.reduce((a, b) => a + b, 0); let y = A.y + Math.max(0, (A.h - total) / 2) - 10;
  const barP = ss(seg(lt, 0, .7)); ctx.fillStyle = th.accent; ctx.fillRect(x0 - 40, y, 12, total * barP);
  const row = (key, h, fn) => { const o = ptr(R, sh, lt, key, .5); withPop(R, o, () => fn()); y += h; };
  if (sh.kicker) row('kicker', kS * 1.5, () => line(R, sh.kicker, x0, y + kS, { size: kS, weight: 800, color: th.accent, id: 'kicker' }));
  if (big) row('big', bigS * 1.12, () => line(R, big, x0 - 6, y + bigS * .86, { size: bigS, weight: 900, color: th.ink, id: 'big' }));
  row('title', tp.h + 12, () => para(R, sh.title || '', x0, y, maxW, { size: tp.size, min: 60, weight: 800, lh: 1.16, maxLines: 3, id: 'title' }));
  if (sp.h) row('sub', sp.h + 14, () => para(R, sh.sub, x0, y, maxW, { size: sp.size, min: 36, weight: 500, lh: 1.35, color: th.muted, maxLines: 3, id: 'sub' }));
  if (metaH) {
    y += 22; let x = x0, yy = y;
    (sh.meta || []).forEach((m, i) => {
      const o = ptr(R, sh, lt, 'meta:' + i, .4), w = measure(R, m, 700, 36) + 44;
      if (x + w > x0 + maxW) { x = x0; yy += 72; }
      withPop(R, o, () => chip(R, m, x, yy, { size: 36, weight: 700, bg: rgba(th.panel2, .96), color: th.ink, border: th.line, shadow: false, h: 58, id: 'meta:' + i })); x += w + 18;
    });
  }
}

// ───────────────────────────── clip
export function clip(R, sh, lt) {
  const { ctx, L, th } = R; ground(R);
  const c = R.clips.get(sh.id), im = c?.frame(lt); let map = null;
  if (im) { const st = L.stage; map = drawView(R, im, st, { cx: .5, cy: .5, s: fitScale(im, st) }).map; }
  for (const [i, h] of (sh.highlights || []).entries()) {
    const t0 = h.t0 ?? 0, t1 = h.t1 ?? sh.dur; if (lt < t0 || lt > t1 || !map) continue;
    const r = rect4(h.rect), [x, y] = map(r.x, r.y), [x2, y2] = map(r.x + r.w, r.y + r.h), p = seg(lt, t0, t0 + .35) * (1 - seg(lt, t1 - .25, t1));
    const b = box(R, x, y, x2 - x, y2 - y, p); if (h.label && b) chip(R, h.label, b.x, Math.max(120, b.y - 66), { size: L.sizes.label, bg: th.accent, color: th.accentInk, alpha: p, id: 'hl:' + i });
  }
  lowerThird(R, sh, lt);
  pip(R, sh, lt);
}
function lowerThird(R, sh, lt) {
  const lw = sh.lower; if (!lw) return; const { L, th } = R, T = sh.sched?.lower ?? .5, hold = Math.min(4.6, sh.dur - T - .8);
  const p = ss(seg(lt, T, T + .4)) * (1 - ss(seg(lt, T + hold, T + hold + .35))); if (p <= 0) return;
  const tS = L.V ? 44 : 48, sS = L.V ? 36 : 38, w = Math.min(L.lower.w, R.W - 2 * L.M);
  const tp = para(R, lw.title || '', 0, 0, w - 64, { size: tS, min: 38, weight: 800, maxLines: 2, dry: true }), sp = lw.sub ? para(R, lw.sub, 0, 0, w - 64, { size: sS, min: 36, weight: 500, maxLines: 2, dry: true }) : { h: 0 };
  const h = 24 + tp.h + (sp.h ? 8 + sp.h : 0) + 22, y = (L.V ? L.lower.y : 860 - h);
  const { ctx } = R; ctx.save(); ctx.globalAlpha *= p; ctx.translate(-(1 - p) * 70, 0);
  ctx.fillStyle = th.plate; ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 18; rr(ctx, L.lower.x, y, w, h, 16); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.fillStyle = th.accent; rr(ctx, L.lower.x, y, 12, h, 6); ctx.fill();
  para(R, lw.title || '', L.lower.x + 36, y + 22, w - 64, { size: tp.size, weight: 800, color: th.plateInk, maxLines: 2, id: 'lower:title' });
  if (sp.h) para(R, lw.sub, L.lower.x + 36, y + 22 + tp.h + 8, w - 64, { size: sp.size, weight: 500, color: th.muted, maxLines: 2, id: 'lower:sub' });
  ctx.restore();
}
function pip(R, sh, lt) {
  const pc = R.pips.get(sh.id); if (!sh.pip || !pc?.meta) return; const im = pc.frame(lt); if (!im) return;
  const { L, th, ctx } = R, pw = L.pip.w, ph = Math.min(pw * pc.meta.h / pc.meta.w, L.V ? 260 : 300), w2 = ph === pw * pc.meta.h / pc.meta.w ? pw : ph * pc.meta.w / pc.meta.h;
  const x = L.pip.x + L.pip.w - w2, p = ss(seg(lt, .3, .7)) * (1 - ss(seg(lt, sh.dur - .5, sh.dur - .1))); if (p <= 0) return;
  ctx.save(); ctx.globalAlpha *= p; drawPip(ctx, { frames: [im], fps: 1, w: im.naturalWidth, h: im.naturalHeight }, 0, { x, y: L.pip.y, w: w2, h: ph, r: 18, border: th.accent, lw: 4 }); ctx.restore();
  if (sh.pip.label) chip(R, sh.pip.label, x + w2, L.pip.y + ph + 10, { align: 'right', size: 32, h: 50, alpha: p, id: 'pip' });
}

// ───────────────────────────── freeze
export function freeze(R, sh, lt) {
  const { ctx, L, th, W, H } = R; ground(R); const im = R.stills.get(sh.id); if (!im) return;
  const st = L.stage, iw = im.naturalWidth, ih = im.naturalHeight, s0 = fitScale(im, st), crop = sh.crop ? rect4(sh.crop) : null;
  const inner = L.V ? { x: 0, y: st.y, w: st.w, h: st.h } : { x: 0, y: 112, w: W, h: 752 };
  let view = { cx: .5, cy: .5, s: s0 }, center = null;
  if (crop) {
    const s1 = Math.min(inner.w / (crop.w * iw), inner.h / (crop.h * ih)) * .95, e = eio(seg(lt, sh.sched?.zoom0 ?? .5, sh.sched?.zoom1 ?? 1.5));
    view = { cx: .5 + (crop.x + crop.w / 2 - .5) * e, cy: .5 + (crop.y + crop.h / 2 - .5) * e, s: Math.exp(Math.log(s0) + (Math.log(s1) - Math.log(s0)) * e) };
    center = [st.x + st.w / 2, st.y + st.h / 2 + ((inner.y + inner.h / 2) - (st.y + st.h / 2)) * e];
  }
  const m = drawView(R, im, st, view, { center, shadow: true });
  const sc = (n, f) => m.map(n[0], n[1]);
  // pause treatment: vignette always, a shutter flash and a pause glyph at the start
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.38)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // highlight boxes + spotlight
  const boxes = (sh.boxes || []).map((b, i) => { const r = rect4(b.rect), [x, y] = m.map(r.x, r.y), [x2, y2] = m.map(r.x + r.w, r.y + r.h), p = P(sh, lt, 'box:' + i, .5); return { b, i, p, x, y, w: x2 - x, h: y2 - y }; });
  const pmax = Math.max(0, ...boxes.map(b => b.p));
  if (sh.spot !== false) spotlight(R, L.V ? st : { x: 0, y: 0, w: W, h: H }, boxes.filter(b => b.p > 0).map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h })), .5 * ss(pmax));
  for (const b of boxes) { const bb = box(R, b.x, b.y, b.w, b.h, b.p); if (b.b.label && bb) { const ly = b.b.pos !== 'b' && bb.y - 70 > 118 ? bb.y - 70 : bb.y + bb.h + 10; chip(R, b.b.label, clamp(bb.x, 24, W - 24 - measure(R, b.b.label, 800, L.sizes.label) - 40), ly, { size: L.sizes.label, bg: th.accent, color: th.accentInk, alpha: ss(b.p), id: 'box:' + b.i }); } }
  // arrows
  (sh.arrows || []).forEach((a, i) => { const p = P(sh, lt, 'arrow:' + i, .6); if (p <= 0) return; const [x0, y0] = m.map(a.from[0], a.from[1]), [x1, y1] = m.map(a.to[0], a.to[1]); arrow(R, x0, y0, x1, y1, eo(p));
    if (a.label && p > .7) chip(R, a.label, (x0 + x1) / 2, (y0 + y1) / 2 - 36, { align: 'center', size: L.sizes.label, alpha: ss((p - .7) / .3), id: 'arrow:' + i }); });
  // numbered markers
  const mr = L.V ? 26 : 30, legend = L.V && sh.markers?.length;
  (sh.markers || []).forEach((k, i) => {
    const o = ptr(R, sh, lt, 'mark:' + i, .4); if (o.p <= 0) return; const [cx, cy] = m.map(k.at[0], k.at[1]), age = lt - (sh.sched['mark:' + i] ?? 0);
    ctx.save(); const rp = seg(age, 0, .8); if (rp < 1) { ctx.globalAlpha = (1 - rp) * .8; ctx.strokeStyle = th.accent; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, mr + 8 + rp * 36, 0, 6.2832); ctx.stroke(); } ctx.restore();
    badge(R, k.n ?? i + 1, cx, cy, mr * (.6 + .4 * eo(o.p)), { alpha: ss(o.p * 1.6) });
    if (!legend && k.text) {
      const S = L.sizes.label, w = measure(R, k.text, 800, S) + 44, h = S * 1.62, d = k.dir || 'r', gx = 16;
      let x = d === 'l' ? cx - mr - gx - w : d === 'r' ? cx + mr + gx : cx - w / 2, y = d === 'u' ? cy - mr - gx - h : d === 'd' ? cy + mr + gx : cy - h / 2;
      x = clamp(x, 24, W - 24 - w); y = clamp(y, 118, 860 - h);
      chip(R, k.text, x, y, { size: S, alpha: ss(o.p * 1.6), id: 'mark:' + i });
    }
  });
  if (legend) {
    const rowH = 92; (sh.markers || []).forEach((k, i) => { const o = ptr(R, sh, lt, 'mark:' + i, .4), y = L.legend.y + i * rowH; if (o.p <= 0) return;
      withPop(R, o, () => { badge(R, k.n ?? i + 1, L.legend.x + 34, y + 38, 30); para(R, k.text || '', L.legend.x + 90, y + 8, L.legend.w - 100, { size: 40, weight: 700, maxLines: 1, id: 'legend:' + i }); }); });
  }
  if (sh.card) card(R, sh, lt, sh.card);
  // shutter flash and pause glyph
  if (lt < .45) { ctx.fillStyle = `rgba(255,255,255,${(1 - lt / .45) * .5})`; ctx.fillRect(0, 0, W, H); }
  const pg = ss(seg(lt, .05, .2)) * (1 - ss(seg(lt, .5, .9)));
  if (pg > 0 && sh.pauseIcon !== false) { ctx.save(); ctx.globalAlpha = pg * .85; ctx.fillStyle = '#fff'; const u = L.V ? 70 : 90, cx = W / 2, cy = L.V ? st.y + st.h / 2 : H / 2 - 40; rr(ctx, cx - u * .6, cy - u / 2, u * .42, u, 8); ctx.fill(); rr(ctx, cx + u * .18, cy - u / 2, u * .42, u, 8); ctx.fill(); ctx.restore(); }
}
export function card(R, sh, lt, c) {
  const o = ptr(R, sh, lt, 'card', .5); if (o.p <= 0) return; const { L, th, ctx } = R, slot = L.card[c.side === 'l' ? 'l' : 'r'], w = slot.w, pad = 38;
  const tS = L.V ? 44 : 48, bS = L.V ? 38 : 40;
  const tp = para(R, c.title || '', 0, 0, w - pad * 2 - 12, { size: tS, min: 38, weight: 800, maxLines: 2, dry: true }), bp = c.body ? para(R, c.body, 0, 0, w - pad * 2 - 12, { size: bS, min: 36, weight: 500, maxLines: 3, dry: true, lh: 1.32 }) : { h: 0 };
  const h = 28 + tp.h + (bp.h ? 12 + bp.h : 0) + 30, x = slot.x, y = slot.y + slot.h - h, dir = c.side === 'l' ? -1 : 1;
  ctx.save(); ctx.globalAlpha *= o.a; ctx.translate(dir * (1 - eo(o.p)) * 80, 0);
  panel(R, x, y, w, h, { fill: rgba(th.panel, .96), stroke: th.accent, lw: 3, r: 20 }); ctx.fillStyle = th.accent; rr(ctx, x, y, 12, h, 6); ctx.fill();
  para(R, c.title || '', x + pad + 8, y + 24, w - pad * 2 - 12, { size: tp.size, weight: 800, color: th.accent, maxLines: 2, id: 'card:title' });
  if (bp.h) para(R, c.body, x + pad + 8, y + 24 + tp.h + 12, w - pad * 2 - 12, { size: bp.size, weight: 500, maxLines: 3, lh: 1.32, id: 'card:body' });
  ctx.restore();
}

// ───────────────────────────── explain / compare (our own drawings: always stamped)
function interpFrame(R, sh) {
  const { ctx, L, th } = R, A = L.area, fx = A.x - 18, fy = A.y - 18, fw = A.w + 36, fh = L.basis.y + 52 - fy;
  ctx.save(); ctx.strokeStyle = rgba(th.warn, .6); ctx.lineWidth = 3; ctx.setLineDash([16, 12]); rr(ctx, fx, fy, fw, fh, 26); ctx.stroke(); ctx.restore();
  chip(R, '解读示意', A.x + A.w, L.basis.y + 2, { align: 'right', size: 30, h: 48, bg: th.warn, color: th.warnInk, shadow: false, id: 'stamp', stable: true });
  if (sh.basis) para(R, '依据：' + sh.basis, A.x + 6, L.basis.y + 4, A.w - 230, { size: 32, min: 30, weight: 500, color: th.muted, maxLines: 1, id: 'basis' });
}
function heading(R, sh, lt) {
  if (!sh.title) return 0; const { L, th } = R, A = L.area, o = ptr(R, sh, lt, 'title', .45), tS = L.V ? 56 : 64;
  const tp = para(R, sh.title, 0, 0, A.w - 20, { size: tS, min: 44, weight: 800, maxLines: 2, dry: true });
  withPop(R, o, () => { para(R, sh.title, A.x + 6, A.y, A.w - 20, { size: tp.size, weight: 800, maxLines: 2, id: 'title' }); R.ctx.fillStyle = th.accent; rr(R.ctx, A.x + 6, A.y + tp.h + 8, 120, 8, 4); R.ctx.fill(); });
  return tp.h + 44;
}
export function explain(R, sh, lt) {
  ground(R); interpFrame(R, sh); const { L } = R, A = L.area, hh = heading(R, sh, lt), reg = { x: A.x, y: A.y + hh, w: A.w, h: A.h - hh };
  ({ flow, list, beforeafter, number })[sh.kind || 'flow'](R, sh, lt, reg);
}
function nodeBox(R, n, x, y, w, h, o) {
  const { th } = R; withPop(R, o, () => {
    panel(R, x, y, w, h, { fill: n.emph ? rgba(th.accent, .14) : th.panel2, stroke: n.emph ? th.accent : th.line, lw: n.emph ? 4 : 2.5, r: 22 });
    const lab = para(R, n.label, 0, 0, w - 44, { size: 44, min: 36, weight: 800, maxLines: 2, dry: true }), sub = n.sub ? para(R, n.sub, 0, 0, w - 44, { size: 36, min: 36, weight: 500, maxLines: 2, dry: true }) : { h: 0 };
    const tot = lab.h + (sub.h ? 8 + sub.h : 0); let y0 = y + (h - tot) / 2;
    para(R, n.label, x + w / 2, y0, w - 44, { size: lab.size, weight: 800, align: 'center', color: n.emph ? th.accent : th.ink, maxLines: 2, id: 'node:' + n.i });
    if (sub.h) para(R, n.sub, x + w / 2, y0 + lab.h + 8, w - 44, { size: 36, weight: 500, align: 'center', color: th.muted, maxLines: 2, id: 'nodesub:' + n.i });
  });
}
function flow(R, sh, lt, reg) {
  const { L, th } = R, V = L.V, nodes = (sh.nodes || []).map((n, i) => ({ ...n, id: String(n.id ?? i), i })), byId = new Map(nodes.map(n => [n.id, n]));
  const edges = (sh.edges || nodes.slice(1).map((n, i) => [nodes[i].id, n.id])).map(([a, b, label], k) => ({ a: byId.get(String(a)), b: byId.get(String(b)), label, k }));
  nodes.forEach(n => n.d = 0); for (let it = 0; it < nodes.length; it++) for (const e of edges) if (e.a && e.b && e.b.d < e.a.d + 1 && e.a.d + 1 < nodes.length) e.b.d = e.a.d + 1;
  const D = Math.max(0, ...nodes.map(n => n.d)) + 1, cols = Array.from({ length: D }, () => []); nodes.forEach(n => cols[n.d].push(n));
  const rows = Math.max(...cols.map(c => c.length)), hasLabel = edges.some(e => e.label);
  let nw, nh, gapA, gapB = 36;
  if (!V) { gapA = hasLabel ? 210 : 130; nw = clamp((reg.w - (D - 1) * gapA) / D, 250, 540); nh = 200; }
  else { nh = 150; gapA = clamp((reg.h - D * nh) / Math.max(1, D - 1), 74, hasLabel ? 150 : 130); nw = clamp((reg.w - (rows - 1) * 30) / rows, 300, 760); }
  const spanA = V ? D * nh + (D - 1) * gapA : D * nw + (D - 1) * gapA, startA = V ? reg.y + Math.max(0, (reg.h - spanA) / 2) : reg.x + (reg.w - spanA) / 2;
  for (const n of nodes) {
    const c = cols[n.d], r = c.indexOf(n);
    if (!V) { const spanB = c.length * nh + (c.length - 1) * gapB; n.x = startA + n.d * (nw + gapA); n.y = reg.y + (reg.h - spanB) / 2 + r * (nh + gapB); }
    else { const spanB = c.length * nw + (c.length - 1) * 30; n.x = reg.x + (reg.w - spanB) / 2 + r * (nw + 30); n.y = startA + n.d * (nh + gapA); }
    n.w = nw; n.h = nh;
  }
  for (const e of edges) {
    if (!e.a || !e.b) continue; const p = P(sh, lt, 'edge:' + e.k, .5); if (p <= 0) continue;
    const [x0, y0, x1, y1] = !V ? [e.a.x + nw + 12, e.a.y + nh / 2, e.b.x - 14, e.b.y + nh / 2] : [e.a.x + nw / 2, e.a.y + nh + 10, e.b.x + nw / 2, e.b.y - 12];
    arrow(R, x0, y0, x1, y1, eo(p), { lw: 6, head: 24 });
    if (e.label && p > .7) chip(R, e.label, (x0 + x1) / 2, (y0 + y1) / 2 - (V ? 30 : 74), { align: 'center', size: 36, h: 56, bg: th.panel, color: th.ink, border: th.line, alpha: ss((p - .7) / .3), shadow: false, id: 'edge:' + e.k });
  }
  for (const n of nodes) { const o = ptr(R, sh, lt, 'node:' + n.i, .45); if (o.p > 0) nodeBox(R, n, n.x, n.y, n.w, n.h, o); }
}
function list(R, sh, lt, reg) {
  const { L, th } = R, V = L.V, items = sh.items || [], gap = 22, wTxt = reg.w - 150;
  const meas = items.map(it => ({ hp: para(R, it.head, 0, 0, wTxt, { size: L.V ? 46 : 50, min: 38, weight: 800, maxLines: 2, dry: true }), bp: it.body ? para(R, it.body, 0, 0, wTxt, { size: 38, min: 36, weight: 500, maxLines: 2, dry: true }) : { h: 0 } }));
  let hs = meas.map(m => 36 + m.hp.h + (m.bp.h ? 8 + m.bp.h : 0)); const base = hs.reduce((a, b) => a + b, 0) + gap * (items.length - 1), extra = clamp((reg.h * .94 - base) / items.length, 0, V ? 120 : 44); hs = hs.map(h => h + extra); const tot = base + extra * items.length; let y = reg.y + Math.max(0, (reg.h - tot) / 3);
  items.forEach((it, i) => {
    const o = ptr(R, sh, lt, 'item:' + i, .45), h = hs[i], m = meas[i];
    withPop(R, o, () => { const yo = extra / 2; panel(R, reg.x, y, reg.w, h, { fill: th.panel2, r: 22 }); badge(R, it.n ?? i + 1, reg.x + 62, y + yo + 18 + m.hp.size * .55 + 6, 32);
      para(R, it.head, reg.x + 124, y + yo + 16, wTxt, { size: m.hp.size, weight: 800, maxLines: 2, id: 'ih:' + i });
      if (it.body) para(R, it.body, reg.x + 124, y + yo + 16 + m.hp.h + 8, wTxt, { size: m.bp.size, weight: 500, color: th.muted, maxLines: 2, id: 'ib:' + i }); });
    y += h + gap;
  });
}
function beforeafter(R, sh, lt, reg) {
  const { L, th } = R, V = L.V, sides = [sh.before, sh.after], gap = V ? 120 : 190, pw = V ? reg.w : (reg.w - gap) / 2, ph = V ? (reg.h - gap) / 2 : reg.h - 20;
  sides.forEach((s, i) => {
    if (!s) return; const x = V ? reg.x : reg.x + i * (pw + gap), y = V ? reg.y + i * (ph + gap) : reg.y + 10, o = ptr(R, sh, lt, 'panel:' + i, .5), after = i === 1;
    withPop(R, o, () => { panel(R, x, y, pw, ph, { fill: after ? rgba(th.accent, .1) : th.panel2, stroke: after ? th.accent : th.line, lw: after ? 4 : 2.5, r: 24 });
      para(R, s.title, x + 36, y + 28, pw - 72, { size: L.V ? 50 : 54, weight: 800, color: after ? th.accent : th.muted, maxLines: 1, id: 'pt:' + i });
      let yy = y + 28 + 84; (s.lines || []).forEach((ln, j) => { const p2 = para(R, ln, x + 72, yy, pw - 108, { size: 42, min: 36, weight: 600, maxLines: 3, id: `pl:${i}:${j}` }); R.ctx.fillStyle = after ? th.accent : th.muted; R.ctx.beginPath(); R.ctx.arc(x + 46, yy + 24, 8, 0, 6.2832); R.ctx.fill(); yy += p2.h + 20; }); });
  });
  const p = P(sh, lt, 'panel:1', .5); if (p > 0) { const cx = V ? reg.x + reg.w / 2 : reg.x + pw + gap / 2, cy = V ? reg.y + ph + gap / 2 : reg.y + reg.h / 2; arrow(R, V ? cx : cx - 56, V ? cy - 44 : cy, V ? cx : cx + 56, V ? cy + 44 : cy, eo(p), { lw: 9, head: 30 }); }
}
function number(R, sh, lt, reg) {
  const { L, th, ctx } = R, o = ptr(R, sh, lt, 'value', .6), big = L.V ? 300 : 360;
  withPop(R, o, () => { ctx.save(); const s = .9 + .1 * eo(o.p); ctx.translate(reg.x + reg.w / 2, reg.y + reg.h * .36); ctx.scale(s, s); line(R, sh.value, 0, big * .34, { size: big, weight: 900, color: th.accent, align: 'center', id: 'value' }); ctx.restore(); });
  const o2 = ptr(R, sh, lt, 'label', .5); withPop(R, o2, () => para(R, sh.label || '', reg.x + reg.w / 2, reg.y + reg.h * .36 + big * .42, reg.w - 120, { size: L.V ? 56 : 64, weight: 800, align: 'center', maxLines: 2, id: 'label' }));
  if (sh.note) { const o3 = ptr(R, sh, lt, 'note', .5); withPop(R, o3, () => para(R, sh.note, reg.x + reg.w / 2, reg.y + reg.h * .36 + big * .42 + 120, reg.w - 160, { size: 40, weight: 500, color: th.muted, align: 'center', maxLines: 3, id: 'note' })); }
}

export function compare(R, sh, lt) {
  ground(R); interpFrame(R, sh); const { L, th } = R, V = L.V, A = L.area, hh = heading(R, sh, lt);
  const vh = sh.verdict ? (V ? 170 : 130) : 0, reg = { x: A.x, y: A.y + hh, w: A.w, h: A.h - hh - (vh ? vh + 24 : 0) };
  if (sh.table) {
    const t = sh.table, nc = t.head.length, cw = reg.w / nc, rh = clamp((reg.h - 76) / (t.rows.length + 0), 72, 112); let y = reg.y;
    const o0 = ptr(R, sh, lt, 'head', .4); withPop(R, o0, () => { R.ctx.fillStyle = th.panel2; rr(R.ctx, reg.x, y, reg.w, 76, 16); R.ctx.fill(); t.head.forEach((c, i) => para(R, c, reg.x + i * cw + 24, y + 14, cw - 36, { size: 40, weight: 800, color: i ? th.accent : th.muted, maxLines: 1, id: 'th:' + i })); });
    y += 88; t.rows.forEach((r, k) => { const o = ptr(R, sh, lt, 'row:' + k, .4); withPop(R, o, () => { if (k % 2 === 0) { R.ctx.fillStyle = rgba(th.panel2, .55); rr(R.ctx, reg.x, y, reg.w, rh - 8, 14); R.ctx.fill(); }
      r.forEach((c, i) => para(R, c, reg.x + i * cw + 24, y + (rh - 8) / 2 - 26, cw - 36, { size: 40, min: 36, weight: i ? 600 : 800, maxLines: 2, id: `td:${k}:${i}` })); }); y += rh; });
  } else {
    const cols = sh.cols || [sh.left, sh.right].filter(Boolean), n = cols.length, gap = 36, pw = V ? reg.w : (reg.w - gap * (n - 1)) / n, ph = V ? (reg.h - gap * (n - 1)) / n : reg.h;
    cols.forEach((c, i) => {
      const x = V ? reg.x : reg.x + i * (pw + gap), y = V ? reg.y + i * (ph + gap) : reg.y, o = ptr(R, sh, lt, 'col:' + i, .5), hot = c.hot ?? i === n - 1;
      withPop(R, o, () => { panel(R, x, y, pw, ph, { fill: hot ? rgba(th.accent, .1) : th.panel2, stroke: hot ? th.accent : th.line, lw: hot ? 4 : 2.5, r: 24 });
        para(R, c.title, x + 34, y + 24, pw - 68, { size: V ? 50 : 54, weight: 800, color: hot ? th.accent : th.ink, maxLines: 1, id: 'ct:' + i }); let yy = y + 24 + 84;
        (c.items || []).forEach((it, j) => { const p2 = para(R, it, x + 70, yy, pw - 104, { size: 40, min: 36, weight: 600, maxLines: 3, id: `ci:${i}:${j}` }); R.ctx.fillStyle = hot ? th.accent : th.muted; R.ctx.beginPath(); R.ctx.arc(x + 44, yy + 24, 8, 0, 6.2832); R.ctx.fill(); yy += p2.h + 18; }); });
    });
  }
  if (vh) { const o = ptr(R, sh, lt, 'verdict', .5), y = A.y + A.h - vh; withPop(R, o, () => { R.ctx.fillStyle = th.accent; rr(R.ctx, A.x, y, A.w, vh, 24); R.ctx.fill();
    para(R, sh.verdict, A.x + A.w / 2, y + (vh - 56 * 1.28 * (V ? 2 : 1)) / 2 + (V ? 0 : 2), A.w - 80, { size: V ? 52 : 58, min: 40, weight: 900, color: th.accentInk, align: 'center', maxLines: 2, id: 'verdict' }); }); }
}
export { isCJK };
