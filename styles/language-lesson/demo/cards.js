// cards.js: the card system. Every face is drawn in a 980 x 670 design space (the cover rule card: 980 x 1560) and
// is a pure function of the film time t, so a card can be rendered alone at any frame.
// Faces: cloze (quiz with a blank and A/B/C chips), compare (minimal pair), repeat (read-after-me), rule (cover), vocab, grid, dialogue.
// Language-agnostic: text is a list of tokens ({t, r (ruby), lang, blank, clue, gender}); `rtl: true` mirrors the card.
import { C, PW, PH, clamp, lerp, seg, ss, eo, back, txt, width, flow, place, rr, pill, shadowed, check, star, speaker, clockIcon, calendarIcon, spanIcon, stopwatch, wavy, reg, setFont, STACK } from './kit.js';
import { drawPip, POSES } from './mascot.js';

const GENDER = { m: C.der, f: C.die, n: C.das };
const popK = (t, t0, d = .34) => back(seg(t, t0, t0 + d), 2.4);
const mir = (rtl, x, w = 0) => rtl ? PW - x - w : x;

// ---------------------------------------------------------------- the card body (paper, edge, soft grain)
export function paper(ctx, w, h, r = 44) {
  shadowed(ctx, () => { rr(ctx, 0, 0, w, h, r); ctx.fillStyle = C.paper; ctx.fill(); }, 36, 18, .42);
  rr(ctx, 0, 0, w, h, r); ctx.fillStyle = C.paper; ctx.fill();
  ctx.save(); rr(ctx, 0, 0, w, h, r); ctx.clip();
  ctx.strokeStyle = 'rgba(198,160,96,.14)'; ctx.lineWidth = 2;             // faint ruled lines, like a flash card
  for (let y = 96; y < h; y += 58) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.restore();
  rr(ctx, 5, 5, w - 10, h - 10, r - 4); ctx.strokeStyle = C.paperLine; ctx.lineWidth = 4; ctx.stroke();
  rr(ctx, 0, 0, w, h, r); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.stroke();
}

// ---------------------------------------------------------------- mnemonic ribbon: rises from behind the top edge of the card
export function ribbon(ctx, d, t, w = PW) {
  const r = d.ribbon; if (!r) return;
  const p = ss(seg(t, r.t0, r.t0 + .42)) * (1 - ss(seg(t, r.t1, r.t1 + .3))); if (p <= 0.001) return;
  ctx.save(); ctx.font = `900 46px ${STACK.zh}`;
  let tw = 0; for (const pt of r.parts) tw += width(ctx, pt.t, pt.s || 46, 900, 'zh');
  const bw = Math.min(w - 40, tw + 110), bh = 84, x = (w - bw) / 2, y = 24 - 96 * p + 0;
  ctx.translate(0, 0); rr(ctx, x, y, bw, bh, 26); ctx.fillStyle = C.yel; ctx.fill(); ctx.strokeStyle = C.yelEdge; ctx.lineWidth = 6; ctx.stroke();
  let cx = (w - tw) / 2; const base = y + 58;
  r.parts.forEach((pt, i) => { const sz = pt.s || 46; cx += txt(ctx, pt.t, cx, base, { size: sz, w: 900, lang: 'zh', fill: pt.c || C.ink, id: `ribbon.${i}`, alpha: 1 }); });
  ctx.restore();
}

// ---------------------------------------------------------------- cloze
const LAY = new WeakMap();
export function clozeLayout(ctx, d) {
  if (LAY.has(d)) return LAY.get(d);
  const base = d.size || 64, rtl = !!d.rtl, ruby = d.tokens.some(t => t.r); let size = base, fl;
  const run = () => flow(ctx, d.tokens, { size, maxW: 890, lang: d.lang || 'lat', nospace: !!d.nospace, rtl, ruby, rubyScale: .4, blankW: d.blankW ?? size * 2.7 });
  fl = run();
  while (fl.lines.length > 1 && size > base * .82) { size *= .97; fl = run(); }      // prefer one line (a clue tag needs clear air above its word)
  while (fl.lines.length > 2 && size > 40) { size *= .9; fl = run(); }              // never more than two lines: shrink rather than collide with the translation
  const cy = ruby ? 252 : 236, top = cy - fl.height / 2;
  const lines = fl.lines.map((L, i) => ({ items: place(L, 50, 880, 'center', rtl), base: top + i * fl.lineH + fl.lineH * .62 + (ruby ? size * .22 : 0) }));
  const pos = []; lines.forEach(L => L.items.forEach(it => pos.push({ ...it, base: L.base })));
  const lay = { size, lines, pos, ruby, fl };
  LAY.set(d, lay); return lay;
}
// where the clue word sits in design space (for the camera push)
export function clueCenter(ctx, d) { const lay = clozeLayout(ctx, d), g = lay.pos.filter(p => p.tok.clue); return g.length ? { x: (Math.min(...g.map(q => q.x)) + Math.max(...g.map(q => q.x + q.w))) / 2, y: g[0].base - lay.size * .4 } : { x: PW / 2, y: 236 }; }

export function cloze(ctx, d, t) {
  const T = d.T, rtl = !!d.rtl, lay = clozeLayout(ctx, d), size = lay.size, lang = d.lang || 'lat';
  const after = (x) => x != null && t >= x;
  // header: question badge and the stopwatch
  { const bx = mir(rtl, 40, 118); pill(ctx, bx, 34, 118, 60, C.ink); txt(ctx, d.q, bx + 59, 78, { size: 34, w: 900, fill: '#fff', align: 'center', id: 'q.badge' }); }
  if (d.tag) { const bx = mir(rtl, 40 + 138, 0); txt(ctx, d.tag, rtl ? PW - 40 - 138 : 40 + 138, 78, { size: 28, w: 800, lang: d.tagLang || 'zh', fill: C.mute, align: rtl ? 'right' : 'left', id: 'q.cat', rtl: false }); }
  if (T.ring) {
    const p = seg(t, T.ring[0], T.ring[1]), vis = ss(seg(t, T.ring[0] - .2, T.ring[0] + .1)) * (1 - ss(seg(t, T.ring[1] + .1, T.ring[1] + .45)));
    if (vis > .01) {
      let pulse = 0; for (const k of T.ticks || []) if (t >= k) pulse = Math.max(pulse, Math.exp(-(t - k) / .13));
      ctx.save(); ctx.globalAlpha *= vis; const sx = rtl ? 40 + 52 : PW - 40 - 52; ctx.translate(sx, 70); ctx.scale(.6 + .4 * back(vis, 2), .6 + .4 * back(vis, 2)); ctx.translate(-sx, -70);
      stopwatch(ctx, sx, 70, 50, p, C.ink, pulse); ctx.restore();
    }
  }
  // sentence
  const clueToks = lay.pos.filter(p => p.tok.clue);
  lay.pos.forEach((it, i) => {
    const tok = it.tok, cx = it.x + it.w / 2, sz = size * (it.scale || 1);
    if (tok.blank) {
      const done = T.ans ? seg(t, T.ans[0], T.ans[1]) : 0;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(it.x + 6, it.base + 8); ctx.lineTo(it.x + it.w - 6, it.base + 8); ctx.stroke();
      if (!T.ans || t < T.ans[0] - .05) { const wob = Math.sin(t * 3.2) * 2; ctx.fillStyle = 'rgba(42,33,24,.18)'; ctx.fillRect(it.x + it.w / 2 - 3 + wob, it.base - size * .66, 6, size * .7); } // a quiet caret: this is where the answer goes
      return;
    }
    let col = C.ink;
    if (tok.gender && after(T.gender)) col = GENDER[tok.gender];
    const gx = txt(ctx, tok.t, cx, it.base, { size: sz, w: 800, lang: tok.lang || lang, fill: col, align: 'center', id: `s.${i}`, rtl: rtl && /[֐-ۿ]/.test(tok.t) });
    if (tok.r) txt(ctx, tok.r, cx, it.base - size * .98, { size: size * .4, w: 800, lang: tok.lang || lang, fill: C.mute, align: 'center', id: `r.${i}` });
    if (tok.gender && after(T.gender)) { ctx.fillStyle = GENDER[tok.gender]; rr(ctx, it.x, it.base + 12, it.w, 8, 4); ctx.fill(); }
    if (T.clue && tok.clue) {
      const c = T.clue, p = ss(seg(t, c.t0, c.t0 + .3)), tp = popK(t, c.t0 + .05, .4);
      if (p > 0 && t < (c.t1 ?? 1e9)) {
        wavy(ctx, it.x, it.x + it.w, it.base + 16, 3.2, C.blue, 6, p, 16);
        if (it === clueToks[0]) {
          const gx0 = Math.min(...clueToks.map(q => q.x)), gx1 = Math.max(...clueToks.map(q => q.x + q.w)), gcx = (gx0 + gx1) / 2;
          ctx.save(); ctx.globalAlpha *= clamp(tp * 1.4); const ty = it.base - size * (lang === 'ar' ? 1.12 : lay.ruby ? 1.3 : .98) - 66, tw = width(ctx, c.tag, 38, 900, 'zh') + 56, tx = gcx - tw / 2;
          ctx.translate(gcx, ty + 24); ctx.scale(tp, tp); ctx.translate(-gcx, -(ty + 24));
          rr(ctx, tx, ty - 12, tw, 62, 22); ctx.fillStyle = C.blue; ctx.fill();
          ctx.beginPath(); ctx.moveTo(gcx - 12, ty + 49); ctx.lineTo(gcx, ty + 66); ctx.lineTo(gcx + 12, ty + 49); ctx.closePath(); ctx.fill();
          txt(ctx, c.tag, gcx, ty + 33, { size: 38, w: 900, lang: 'zh', fill: '#fff', align: 'center', base: 'middle', id: 'clue.tag' }); ctx.restore();
        }
      }
    }
  });
  // the answer writes itself, in red hand
  if (T.ans && t >= T.ans[0]) {
    const bl = lay.pos.find(p => p.tok.blank), p = seg(t, T.ans[0], T.ans[1]), s2 = size * (d.ansScale || 1.8), a = d.ans;
    ctx.save(); setFont(ctx, s2, 700, 'hand'); const aw = ctx.measureText(a).width, cx = bl.x + bl.w / 2, x0 = cx - aw / 2, y0 = bl.base - 4 + Math.sin(0) ;
    ctx.translate(cx, y0); ctx.rotate(-.045); ctx.translate(-cx, -y0);
    ctx.save(); ctx.beginPath(); ctx.rect(x0 - 14, y0 - s2, (aw + 28) * ss(p), s2 * 1.4); ctx.clip();
    txt(ctx, a, cx, y0, { size: s2, w: 700, lang: 'hand', fill: C.red, align: 'center', id: 'ans' }); ctx.restore();
    if (p > 0 && p < 1) { const ex = x0 + aw * ss(p), ey = y0 - 8 + Math.sin(p * 40) * 5; ctx.save(); ctx.translate(ex, ey); ctx.rotate(.7); rr(ctx, -6, -86, 12, 70, 3); ctx.fillStyle = C.yel; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-6, -16); ctx.lineTo(0, 0); ctx.lineTo(6, -16); ctx.fillStyle = '#f3d2a2'; ctx.fill(); ctx.stroke(); ctx.restore(); }
    if (t > T.ans[1]) { const u = ss(seg(t, T.ans[1], T.ans[1] + .28)); wavy(ctx, x0 - 6, x0 + aw + 6, y0 + 26, 3.5, C.red, 6, u, 14);
      const sb = seg(t, T.ans[1], T.ans[1] + .7); if (sb > 0 && sb < 1) for (let k = 0; k < 7; k++) { const an = k / 7 * Math.PI * 2 + .3, rr_ = 40 + 120 * eo(sb); star(ctx, cx + Math.cos(an) * rr_, y0 - size * .3 + Math.sin(an) * rr_ * .6, 22 * (1 - sb), sb * 4 + k, k % 2 ? C.yel : C.red); } }
    ctx.restore();
  }
  // translation
  { const a = ss(seg(t, T.tr ?? 0, (T.tr ?? 0) + .3)); txt(ctx, d.tr, PW / 2, 392, { size: 38, w: 700, lang: d.trLang || 'zh', fill: C.mute, align: 'center', id: 'tr', alpha: T.tr == null ? 1 : a }); }
  // option chips
  const n = d.opts.length, cw = (880 - 24 * (n - 1)) / n, ch = 128, y = 462;
  d.opts.forEach((o, i) => {
    const vi = rtl ? n - 1 - i : i, x = 50 + vi * (cw + 24), p = popK(t, T.chips[i]);
    if (p <= 0.01) return;
    const ansP = T.ans ? ss(seg(t, T.ans[0], T.ans[0] + .3)) : 0, good = i === d.correct, dim = T.ans && !good ? ansP * .5 : 0;
    ctx.save(); ctx.globalAlpha *= clamp(p * 1.6) * (1 - dim); ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(p, p); ctx.translate(-cw / 2, -ch / 2);
    shadowed(ctx, () => { rr(ctx, 0, 0, cw, ch, 30); ctx.fillStyle = '#fffaf0'; ctx.fill(); }, 12, 6, .22);
    rr(ctx, 0, 0, cw, ch, 30); ctx.fillStyle = o.g ? { m: '#e3edff', f: '#fde4f0', n: '#e0f4e8' }[o.g] : '#fffaf0'; ctx.fill();
    ctx.strokeStyle = good && ansP > 0 ? C.red : C.ink; ctx.lineWidth = good && ansP > 0 ? 7 : 4; ctx.stroke();
    if (o.g) { ctx.fillStyle = GENDER[o.g]; rr(ctx, 14, ch - 24, cw - 28, 8, 4); ctx.fill(); }
    const lx = rtl ? cw - 50 : 50; ctx.beginPath(); ctx.arc(lx, ch / 2, 25, 0, 7); ctx.fillStyle = good && ansP > 0 ? C.red : C.ink; ctx.fill();
    txt(ctx, 'ABCD'[i], lx, ch / 2, { size: 30, w: 900, fill: '#fff', align: 'center', base: 'middle', id: `opt.${i}.l` });
    txt(ctx, o.t, cw / 2 + (rtl ? -22 : 22), ch / 2 + 2 - (o.g ? 6 : 0), { size: o.size || 60, w: 800, lang: o.lang || lang, fill: o.g ? GENDER[o.g] : C.ink, align: 'center', base: 'middle', id: `opt.${i}`, rtl: rtl && /[֐-ۿ]/.test(o.t) });
    if (good && ansP > 0) { const cp = back(ansP, 2.6); ctx.beginPath(); ctx.arc(cw - 14, 14, 26 * cp, 0, 7); ctx.fillStyle = C.red; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke(); check(ctx, cw - 14, 15, 24 * cp, '#fff', 6); }
    ctx.restore();
  });
}

// ---------------------------------------------------------------- compare (minimal pair)
export function compare(ctx, d, t) {
  const T = d.T, rtl = !!d.rtl, n = d.panels.length, pw = (880 - 40) / n, ph = 400, y = 120;
  const lw = Math.max(150, width(ctx, d.label, 32, 900, 'zh') + 56); pill(ctx, mir(rtl, 40, lw), 34, lw, 60, C.ink); txt(ctx, d.label, mir(rtl, 40, lw) + lw / 2, 78, { size: 32, w: 900, lang: 'zh', fill: '#fff', align: 'center', id: 'cmp.label' });
  d.panels.forEach((P, i) => {
    const vi = rtl ? n - 1 - i : i, x = 50 + vi * (pw + 40), p = popK(t, T.panels[i], .42); if (p <= .01) return;
    ctx.save(); ctx.globalAlpha *= clamp(p * 1.5); ctx.translate(x + pw / 2, y + ph / 2); ctx.scale(p, p); ctx.translate(-pw / 2, -ph / 2);
    shadowed(ctx, () => { rr(ctx, 0, 0, pw, ph, 36); ctx.fillStyle = '#fffaf0'; ctx.fill(); }, 14, 8, .2);
    rr(ctx, 0, 0, pw, ph, 36); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.stroke();
    rr(ctx, 0, 0, pw, 18, 9); ctx.fillStyle = P.c || C.orange; ctx.fill();
    if (P.icon) { const ix = pw / 2; if (P.icon === 'clock') clockIcon(ctx, ix, 84, 36, P.c || C.orange); else if (P.icon === 'calendar') calendarIcon(ctx, ix, 84, 36, P.c || C.plum); else spanIcon(ctx, ix, 84, 40, P.c || C.teal); }
    let psz = P.size || 60, lay; const fit = () => flow(ctx, P.tokens, { size: psz, maxW: pw - 40, lang: d.lang || 'lat', nospace: !!d.nospace, rtl });
    lay = fit(); while (lay.lines.length > 1 && psz > (P.size || 60) * .76) { psz *= .96; lay = fit(); }
    const nL = lay.lines.length, lastBase = 214 + (nL - 1) * 36;
    lay.lines.forEach((Ln, li) => {
      const base = lastBase - (nL - 1 - li) * lay.lineH * .8;
      place(Ln, 20, pw - 40, 'center', rtl).forEach((it, k) => {
        const cx = it.x + it.w / 2, isClue = it.tok.clue, kk = `${li}.${k}`;
        if (it.tok.hl) { ctx.fillStyle = 'rgba(255,210,58,.7)'; rr(ctx, it.x - 8, base - psz * .86, it.w + 16, psz * 1.12, 14); ctx.fill(); }
        txt(ctx, it.tok.t, cx, base, { size: psz, w: 800, lang: it.tok.lang || d.lang || 'lat', fill: C.ink, align: 'center', id: `cmp.${i}.${kk}` });
        if (isClue) { const u = ss(seg(t, T.clues[i], T.clues[i] + .3)); wavy(ctx, it.x, it.x + it.w, base + 14, 3, C.blue, 6, u, 16);
          const tp = popK(t, T.clues[i] + .1, .4); if (tp > .01) { ctx.save(); ctx.globalAlpha *= clamp(tp * 1.4); const tw = width(ctx, P.tag, 36, 900, 'zh') + 50, tx = cx - tw / 2, ty = base + 40; ctx.translate(cx, ty + 30); ctx.scale(tp, tp); ctx.translate(-cx, -(ty + 30));
            rr(ctx, tx, ty, tw, 58, 20); ctx.fillStyle = C.blue; ctx.fill(); ctx.beginPath(); ctx.moveTo(cx - 11, ty + 1); ctx.lineTo(cx, ty - 16); ctx.lineTo(cx + 11, ty + 1); ctx.fill();
            txt(ctx, P.tag, cx, ty + 30, { size: 36, w: 900, lang: 'zh', fill: '#fff', align: 'center', base: 'middle', id: `cmp.${i}.tag` }); ctx.restore(); } }
      });
    });
    txt(ctx, P.tr, pw / 2, 350, { size: 36, w: 700, lang: d.trLang || 'zh', fill: C.mute, align: 'center', id: `cmp.${i}.tr` });
    ctx.restore();
  });
  const vp = popK(t, T.panels[0] + .3, .4); if (vp > .01 && n === 2) { ctx.save(); ctx.translate(PW / 2, y + ph / 2); ctx.scale(vp, vp); ctx.beginPath(); ctx.arc(0, 0, 36, 0, 7); ctx.fillStyle = C.yel; ctx.fill(); ctx.strokeStyle = C.yelEdge; ctx.lineWidth = 5; ctx.stroke(); txt(ctx, 'vs', 0, 0, { size: 34, w: 900, fill: C.ink, align: 'center', base: 'middle', id: 'cmp.vs' }); ctx.restore(); }
  if (d.note) { const a = ss(seg(t, T.note, T.note + .3)); txt(ctx, d.note, PW / 2, 600, { size: 40, w: 800, lang: 'zh', fill: C.ink, align: 'center', id: 'cmp.note', alpha: a }); }
}

// ---------------------------------------------------------------- repeat after me: the target sentence spoken twice (slow, normal), words lighting up
export function repeat(ctx, d, t) {
  const T = d.T, rtl = !!d.rtl, size = d.size || 78, lang = d.lang || 'lat';
  const fl = flow(ctx, d.tokens, { size, maxW: 860, lang, nospace: !!d.nospace, rtl, ruby: d.tokens.some(k => k.r), rubyScale: .4 });
  const cy = 290, top = cy - fl.height / 2;
  // speed pills
  const act = T.passes.findIndex(p => t >= p.t0 - .15 && t <= p.t1 + .25);
  d.labels.forEach((lb, k) => {
    const w = 200, x = rtl ? PW - 40 - (k + 1) * w - k * 16 : 40 + k * (w + 16), on = act === k, done = t > T.passes[k].t1 + .25;
    const sc = on ? 1 + .05 * Math.sin(t * 9) * 0 : 1; pill(ctx, x, 30, w, 62, on ? C.yel : C.paper2, on ? C.yelEdge : C.paperLine, 5);
    speaker(ctx, x + 38, 61, 24, on ? C.ink : C.mute, d.labels.length === 1 || k ? 2 : 1);
    txt(ctx, lb, x + 66, 62, { size: 30, w: 900, lang: 'zh', fill: on ? C.ink : C.mute, base: 'middle', id: `rep.pill.${k}` });
    if (done) { ctx.beginPath(); ctx.arc(x + w - 4, 34, 15, 0, 7); ctx.fillStyle = C.ok; ctx.fill(); check(ctx, x + w - 4, 35, 14, '#fff', 4); }
  });
  let wi = 0; const np = T.passes.length;
  fl.lines.forEach((L, li) => {
    const base = top + li * fl.lineH + fl.lineH * .62 + (d.tokens.some(k => k.r) ? size * .22 : 0);
    place(L, 60, 860, 'center', rtl).forEach(it => {
      const w = T.words[wi], i = wi; wi++;
      const cur = w.some(([a0, b0]) => t >= a0 && t < b0), readFirst = t >= w[0][1], readAll = t >= w[np - 1][1];
      const a = readAll ? 1 : readFirst ? .72 : .34, cx = it.x + it.w / 2;
      if (cur) { ctx.fillStyle = C.yel; rr(ctx, it.x - 10, base - size * .9, it.w + 20, size * 1.25, 18); ctx.fill(); }
      txt(ctx, it.tok.t, cx, base - (cur ? 3 : 0), { size: size * (cur ? 1.04 : 1), w: 800, lang: it.tok.lang || lang, fill: C.ink, align: 'center', id: `rep.${i}`, alpha: cur ? 1 : a });
      if (it.tok.r) txt(ctx, it.tok.r, cx, base - size * .98, { size: size * .4, w: 800, lang: it.tok.lang || lang, fill: C.mute, align: 'center', id: `rep.r.${i}`, alpha: a });
      if (readAll) { ctx.fillStyle = C.blue; rr(ctx, it.x, base + 12, it.w, 6, 3); ctx.fill(); }
    });
  });
  txt(ctx, d.tr, PW / 2, 500, { size: 42, w: 700, lang: d.trLang || 'zh', fill: C.mute, align: 'center', id: 'rep.tr' });
  if (d.pron) txt(ctx, d.pron, PW / 2, 530, { size: 36, w: 600, lang: d.pronLang || 'ipa', fill: C.mute, align: 'center', id: 'rep.pron' });
}

// ---------------------------------------------------------------- vocabulary card (word, pronunciation line with tone colours, meaning, example)
export function vocab(ctx, d, t) {
  const rtl = !!d.rtl, T = d.T || {}, a = k => ss(seg(t, (T.at ?? 0) + k, (T.at ?? 0) + k + .3));
  speaker(ctx, mir(rtl, 40, 0) + (rtl ? -30 : 30), 62, 30, C.mute, 2);
  if (d.gender) { const g = GENDER[d.gender]; pill(ctx, rtl ? 40 : PW - 40 - 110, 34, 110, 56, g); txt(ctx, d.article, (rtl ? 40 : PW - 40 - 110) + 55, 63, { size: 32, w: 900, fill: '#fff', align: 'center', base: 'middle', id: 'v.art' }); }
  const big = d.size || 150, fl = flow(ctx, d.tokens, { size: big, maxW: 880, lang: d.lang || 'lat', nospace: !!d.nospace, rtl, ruby: d.tokens.some(k => k.r), rubyScale: .36 });
  place(fl.lines[0], 50, 880, 'center', rtl).forEach((it, i) => {
    const cx = it.x + it.w / 2, base = 232; txt(ctx, it.tok.t, cx, base, { size: big, w: 900, lang: it.tok.lang || d.lang || 'lat', fill: d.gender ? GENDER[d.gender] : C.ink, align: 'center', id: `v.w.${i}` });
    if (it.tok.r) txt(ctx, it.tok.r, cx, base - big * .95, { size: big * .36, w: 800, lang: it.tok.lang || d.lang, fill: C.mute, align: 'center', id: `v.r.${i}`, alpha: a(0) });
  });
  if (d.pron) { // pron: [{s, tone}] or a plain string (IPA, romanisation)
    let x = 0; const parts = typeof d.pron === 'string' ? [{ s: d.pron }] : d.pron, sz = 54, ws = parts.map(p => width(ctx, p.s, sz, 800, d.pronLang || 'ipa') + 14), tot = ws.reduce((u, v) => u + v, 0);
    let cx = PW / 2 - tot / 2; parts.forEach((p, i) => { txt(ctx, p.s, cx, 318, { size: sz, w: 800, lang: d.pronLang || 'ipa', fill: p.tone != null ? C.tone[p.tone] : C.blue, id: `v.p.${i}`, alpha: a(.2) }); cx += ws[i]; });
  }
  txt(ctx, d.meaning, PW / 2, 400, { size: 54, w: 800, lang: d.meaningLang || 'zh', fill: C.ink, align: 'center', id: 'v.mean', alpha: a(.4) });
  rr(ctx, 80, 440, 820, 4, 2); ctx.fillStyle = C.paperLine; ctx.fill();
  if (d.ex) { txt(ctx, d.ex, PW / 2, 520, { size: 44, w: 700, lang: d.lang || 'lat', fill: C.ink, align: 'center', id: 'v.ex', alpha: a(.7) }); txt(ctx, d.exTr, PW / 2, 580, { size: 34, w: 700, lang: d.meaningLang || 'zh', fill: C.mute, align: 'center', id: 'v.extr', alpha: a(.9) }); }
}

// ---------------------------------------------------------------- conjugation or declension grid
export function grid(ctx, d, t) {
  const rtl = !!d.rtl, T = d.T || {}, cols = d.cols.length, rows = d.rows.length, x0 = 50, y0 = 130, W = 880, cw = W / (cols + 1), rh = 104;
  txt(ctx, d.title, mir(rtl, 40, 0) + (rtl ? 0 : 0), 78, { size: 44, w: 900, lang: d.lang || 'lat', fill: C.ink, align: rtl ? 'right' : 'left', id: 'g.title' });
  if (d.note) txt(ctx, d.note, rtl ? 40 : PW - 40, 78, { size: 30, w: 700, lang: 'zh', fill: C.mute, align: rtl ? 'left' : 'right', id: 'g.note' });
  const X = c => rtl ? x0 + W - (c + 1) * cw : x0 + c * cw;
  const cell = (r, c, s, o) => {
    const p = popK(t, (T.at ?? 0) + (r * (cols + 1) + c) * .05, .3); if (p <= .01) return;
    ctx.save(); ctx.globalAlpha *= clamp(p * 1.6); const cx = X(c) + cw / 2, cy = y0 + r * rh + rh / 2; ctx.translate(cx, cy); ctx.scale(p, p); ctx.translate(-cx, -cy);
    const hi = T.hi && T.hi[0] === r - 1 && T.hi[1] === c - 1 && t >= T.hiT;
    rr(ctx, X(c) + 4, y0 + r * rh + 4, cw - 8, rh - 8, 16); ctx.fillStyle = r === 0 || c === 0 ? C.paper2 : hi ? 'rgba(255,210,58,.8)' : '#fffaf0'; ctx.fill(); ctx.strokeStyle = hi ? C.yelEdge : C.paperLine; ctx.lineWidth = hi ? 5 : 3; ctx.stroke();
    txt(ctx, s, cx, cy + 2, { size: 40, w: r === 0 || c === 0 ? 800 : 700, lang: d.lang || 'lat', fill: o || C.ink, align: 'center', base: 'middle', id: `g.${r}.${c}` }); ctx.restore();
  };
  cell(0, 0, '', null);
  d.cols.forEach((c, i) => cell(0, i + 1, c)); d.rows.forEach((row, r) => row.forEach((s, c) => cell(r + 1, c, s)));
}

// ---------------------------------------------------------------- dialogue: a bubble pair
export function dialogue(ctx, d, t) {
  const rtl = !!d.rtl, T = d.T || {};
  d.lines.forEach((L, i) => {
    const p = popK(t, T.at[i], .4); if (p <= .01) return;
    const left = (i % 2 === 0) !== rtl, bw = 700, bh = 190, x = left ? 50 + 80 : PW - 50 - 80 - bw, y = 50 + i * 230;
    ctx.save(); ctx.globalAlpha *= clamp(p * 1.5); const ox = left ? x : x + bw; ctx.translate(ox, y + bh); ctx.scale(p, p); ctx.translate(-ox, -(y + bh));
    const ax = left ? 50 + 40 : PW - 50 - 40; ctx.beginPath(); ctx.arc(ax, y + 100, 38, 0, 7); ctx.fillStyle = L.c || (i % 2 ? C.plum : C.teal); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.stroke();
    txt(ctx, L.who, ax, y + 102, { size: 34, w: 900, fill: '#fff', align: 'center', base: 'middle', id: `dl.who.${i}` });
    shadowed(ctx, () => { rr(ctx, x, y, bw, bh, 36); ctx.fillStyle = i % 2 ? '#e3edff' : '#fffaf0'; ctx.fill(); }, 12, 6, .2);
    rr(ctx, x, y, bw, bh, 36); ctx.fillStyle = i % 2 ? '#e3edff' : '#fffaf0'; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.stroke();
    txt(ctx, L.t, x + bw / 2, y + 82, { size: 52, w: 800, lang: d.lang || 'lat', fill: C.ink, align: 'center', id: `dl.t.${i}`, rtl: rtl && /[֐-ۿ]/.test(L.t) });
    txt(ctx, L.tr, x + bw / 2, y + 144, { size: 34, w: 700, lang: d.trLang || 'zh', fill: C.mute, align: 'center', id: `dl.tr.${i}` });
    ctx.restore();
  });
}

// ---------------------------------------------------------------- the cover rule card: a dense reference card, design space 980 x 1560
export function rule(ctx, d, t) {
  const T = d.T, a = (k, dd = .3) => ss(seg(t, T.at + k, T.at + k + dd));
  // header: Pip and the three words
  { const p = popK(t, T.at, .5); ctx.save(); ctx.globalAlpha *= clamp(p * 1.5); drawPip(ctx, 130, 318, .47, { ...POSES.wave, ...(d.pose || {}), mouth: 0, blink: 0, bob: 0, hop: 0 }); ctx.restore(); }
  d.kw.forEach((k, i) => {
    const x = 290 + i * 218, p = popK(t, T.at + .15 + i * .12, .42); if (p <= .01) return;
    ctx.save(); ctx.globalAlpha *= clamp(p * 1.5); ctx.translate(x + 80, 200); ctx.scale(p, p); ctx.translate(-(x + 80), -200);
    txt(ctx, k.w, x + 70, 222, { size: 132, w: 900, fill: k.c, align: 'center', id: `rule.kw.${i}`, stroke: C.ink, sw: 0 }); ctx.restore();
  });
  { const a1 = a(.6); ctx.globalAlpha *= 1; txt(ctx, d.core, 290 + 330, 296, { size: 38, w: 800, lang: 'zh', fill: C.ink, align: 'center', id: 'rule.core', alpha: a1 }); }
  // boxes 1-2-3
  d.boxes.forEach((B, i) => {
    const y = 350 + i * 256, p = popK(t, T.at + .8 + i * .22, .45); if (p <= .01) return;
    ctx.save(); ctx.globalAlpha *= clamp(p * 1.5); ctx.translate(PW / 2, y + 118); ctx.scale(lerp(.9, 1, p), lerp(.9, 1, p)); ctx.translate(-PW / 2, -(y + 118));
    shadowed(ctx, () => { rr(ctx, 40, y, 900, 236, 36); ctx.fillStyle = '#fffaf0'; ctx.fill(); }, 14, 8, .2);
    rr(ctx, 40, y, 900, 236, 36); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.stroke();
    rr(ctx, 40, y, 22, 236, 11); ctx.fillStyle = B.c; ctx.fill();
    ctx.beginPath(); ctx.arc(116, y + 70, 36, 0, 7); ctx.fillStyle = C.ink; ctx.fill(); txt(ctx, String(i + 1), 116, y + 72, { size: 44, w: 900, fill: '#fff', align: 'center', base: 'middle', id: `rule.n.${i}` });
    txt(ctx, B.w, 176, y + 104, { size: 118, w: 900, fill: B.c, id: `rule.w.${i}` });
    txt(ctx, B.mean, 400, y + 86, { size: 42, w: 800, lang: 'zh', fill: C.ink, id: `rule.m.${i}` });
    if (B.icon === 'clock') clockIcon(ctx, 850, y + 76, 50, B.c); else if (B.icon === 'calendar') calendarIcon(ctx, 850, y + 76, 50, B.c); else spanIcon(ctx, 850, y + 76, 56, B.c);
    let cx = 100; B.ex.forEach((e, k) => { const w = width(ctx, e, 42, 800) + 44; pill(ctx, cx, y + 144, w, 62, B.c + '22', B.c, 4); txt(ctx, e, cx + w / 2, y + 176, { size: 42, w: 800, fill: C.ink, align: 'center', base: 'middle', id: `rule.e.${i}.${k}` }); cx += w + 18; });
    ctx.restore();
  });
  // example sentences with translations
  d.ex.forEach((E, i) => {
    const y = 1130 + i * 106, p = a(1.5 + i * .15, .35); if (p <= .01) return;
    ctx.save(); ctx.globalAlpha *= p; ctx.translate(0, (1 - p) * 20);
    let cx = 60; const tot = E.en.reduce((u, s) => u + width(ctx, s.t, 44, 800), 0); cx = PW / 2 - tot / 2;
    E.en.forEach((s, k) => { const w = txt(ctx, s.t, cx, y + 40, { size: 44, w: 800, fill: s.c || C.ink, id: `rule.s.${i}.${k}` }); if (s.c) { ctx.fillStyle = s.c; rr(ctx, cx, y + 52, w, 6, 3); ctx.fill(); } cx += w; });
    txt(ctx, E.zh, PW / 2, y + 90, { size: 32, w: 700, lang: 'zh', fill: C.mute, align: 'center', id: `rule.z.${i}` });
    ctx.restore();
  });
}

export const FACES = { cloze, compare, repeat, vocab, grid, dialogue, rule };
