// Engraving primitives (SMuFL glyphs from Bravura, OFL; stems, beams, slurs, ledger lines and bar lines are drawn as paths)
// and the layout of the score in two states: PAGE (systems on a sheet) and LAND (one long staff per voice).
import { EV, CHORDS, RESTS, VOICES, T0, BEAT, BAR, NBARS, tOf, DYN, HAIRPIN } from './score.js';

export const INK = '#2a2118';
export const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const mix = (a, b, k) => { const A = Array.isArray(a) ? a : rgb(a), B = Array.isArray(b) ? b : rgb(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * k)).join(',')})`; };

// SMuFL code points
export const G = {
  gClef: '', fClef: '', head: '', half: '', whole: '', flagUp: '', flagDn: '',
  rW: '', rH: '', rQ: '', r8: '', sharp: '', natural: '', dot: '',
  stacA: '', stacB: '', ferm: '', quarter: '',
  p: '', mp: '', mf: '', f: '', ff: '',
};
export const digit = n => String.fromCharCode(0xE080 + n);

// ---- geometry of the two states ----------------------------------------------------------------
export const PAGE = { x0: 130, y0: 30, x1: 1790, y1: 990 };
export const SP_P = 16, SP_L = 24;
export const SYS_L = 250, SYS_R = 1760, HDR = [172, 126], PADL = 26, PADR = 10;
const SYS_TOP = [250, 636], STAFF_GAP = 50;
export const YL = [300, 575, 835];                  // landscape centre lines
export const XL0 = 430, PPS = 170;
export const ycPage = (s, v) => SYS_TOP[s] + v * (4 * SP_P + STAFF_GAP) + 2 * SP_P;
export const sysTop = s => SYS_TOP[s];
export const sysBottom = s => SYS_TOP[s] + 2 * (4 * SP_P + STAFF_GAP) + 4 * SP_P;
export const xl = t => XL0 + (t - T0) * PPS;
export const barW = s => (SYS_R - SYS_L - HDR[s]) / 4;
export const barX0 = bar => { const s = Math.floor((bar - 1) / 4); return SYS_L + HDR[s] + ((bar - 1) % 4) * barW(s); };
export const hasPage = bar => bar <= 8;
export const pageX = (bar, beat) => { const s = Math.floor((bar - 1) / 4); return barX0(bar) + PADL + beat / 4 * (barW(s) - PADL - PADR); };
export const landX = (bar, beat) => xl(tOf(bar, beat));
export const landBarline = bar => xl(tOf(bar, 0)) - PADL;                    // left barline of a bar in the landscape
export const pageBarline = bar => barX0(bar);
// time -> playhead x on the page (same mapping as the notes, so it sits on a note exactly at its onset)
export function pagePlayhead(t) {
  const tb = Math.max(0, Math.min(NBARS * 4, (t - T0) / BEAT)), bar = Math.min(8, Math.floor(tb / 4) + 1);
  if (tb >= 32) return { x: SYS_R - PADR, s: 1 };
  const beat = tb - (bar - 1) * 4, s = Math.floor((bar - 1) / 4);
  let x = pageX(bar, beat);
  if (beat > 3.7 && bar % 4 !== 0) x = pageX(bar, 3.7) + (pageX(bar + 1, 0) - pageX(bar, 3.7)) * ((beat - 3.7) / .3);   // glide over the bar line, no hop
  return { x, s };
}

// ---- layout: one record per chord, with page and landscape positions, stems and beams -----------
export const posOf = (v, L) => L - (VOICES[v].clef === 'g' ? 30 : 18);   // half-spaces above the bottom line
const keyAccShown = new Set();
export const items = CHORDS.map((c, i) => {
  const pos = c.notes.map(n => posOf(c.v, n.L));
  const avg = pos.reduce((a, b) => a + b, 0) / pos.length;
  return { i, ...c, pos, dir: avg >= 4 ? 'dn' : 'up', t: tOf(c.bar, c.beat), grp: -1 };
});
// accidentals: shown on the first occurrence of a pitch with acc != 0 in a bar, per voice
{ const seen = new Set(); for (const it of items) it.showAcc = it.notes.map(n => { if (!n.acc) return 0; const k = `${it.v}|${it.bar}|${n.L}`; if (seen.has(k)) return 0; seen.add(k); return n.acc; }); }
// beam groups: consecutive eighths inside one half-bar
{ let gid = 0;
  for (let v = 0; v < 3; v++) {
    const list = items.filter(it => it.v === v);
    let cur = null;
    for (const it of list) {
      const key = it.bar + '|' + (it.beat < 2 ? 0 : 1);
      if (it.dur === .5 && cur && cur.key === key && cur.last.beat + .5 === it.beat) { cur.items.push(it); cur.last = it; }
      else { cur = it.dur === .5 ? { key, items: [it], last: it, id: gid++ } : null; if (cur) cur.items[0].grp = cur.id; }
      if (cur) it.grp = cur.id;
    }
  }
}
export const groups = {};
for (const it of items) if (it.grp >= 0) (groups[it.grp] ??= []).push(it);
for (const g of Object.values(groups)) { const a = g.reduce((s, it) => s + it.pos[0], 0) / g.length; const d = a >= 4 ? 'dn' : 'up'; g.forEach(it => it.dir = d); }
export const evById = Object.fromEntries(EV.map(e => [e.id, e]));
export const slurs = [];
{ let open = null; for (const it of items) { if (it.ph === 'start') open = [it]; else if (open) { open.push(it); if (it.ph === 'end') { slurs.push(open); open = null; } } } }

// ---- primitives ---------------------------------------------------------------------------------
export function glyph(ctx, ch, x, y, sp, col, alpha = 1, scale = 1, font = 'Bravura') {
  ctx.globalAlpha = alpha; ctx.fillStyle = col; ctx.font = `${4 * sp * scale}px ${font}`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.fillText(ch, x, y);
}
export const headW = (dur, sp) => (dur >= 4 ? 1.688 : 1.18) * sp;
const headGlyph = dur => dur >= 4 ? G.whole : dur >= 2 ? G.half : G.head;
export const restGlyph = d => d >= 4 ? G.rW : d >= 2 ? G.rH : d >= 1 ? G.rQ : G.r8;
export function line(ctx, x0, y0, x1, y1, w, col, alpha = 1) { ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }

// One chord: heads, accidentals, dots, ledger lines, stem and flag (or only the stem when beamed), articulation.
// P = {x (centre of head), yc (centre line of the staff), dy (wave offset)}, col = ink colour.
export function drawChord(ctx, it, P, sp, col, alpha, pop = 1, beamed = false) {
  const hw = headW(it.dur, sp), st = .12 * sp;
  const ys = it.pos.map(p => P.yc - (p - 4) * sp / 2 + P.dy);
  const xh = P.x - hw / 2;
  // ledger lines (drawn in ink, under the heads)
  for (const p of it.pos) {
    const lines = [];
    if (p >= 10) for (let q = 10; q <= p; q += 2) lines.push(q);
    if (p <= -2) for (let q = -2; q >= p; q -= 2) lines.push(q);
    for (const q of lines) { const y = P.yc - (q - 4) * sp / 2 + P.dy; line(ctx, xh - .4 * sp, y, xh + hw + .4 * sp, y, .16 * sp, INK, alpha); }
  }
  it.pos.forEach((p, k) => {
    ctx.save();
    if (pop !== 1) { ctx.translate(P.x, ys[k]); ctx.scale(pop, pop); ctx.translate(-P.x, -ys[k]); }
    glyph(ctx, headGlyph(it.dur), xh, ys[k], sp, col, alpha);
    ctx.restore();
    const acc = it.showAcc[k];
    if (acc) glyph(ctx, acc > 0 ? G.sharp : G.natural, xh - 1.35 * sp, ys[k], sp, INK, alpha);
    const dotted = [1.5, 3, .75].includes(it.dur);
    if (dotted) glyph(ctx, G.dot, xh + hw + .45 * sp, ys[k] - (p % 2 === 0 ? sp / 2 : 0), sp, col, alpha);
  });
  // stem
  let stem = null;
  if (it.dur < 4) {
    const top = Math.min(...ys), bot = Math.max(...ys), up = it.dir === 'up';
    const sx = up ? xh + hw - st : xh;
    const yA = up ? Math.max(...ys) - .168 * sp : Math.min(...ys) + .168 * sp;
    const len = it.stemLen ?? 3.5 * sp;
    const yB = up ? top - len : bot + len;
    stem = { x: sx + st / 2, y0: yA, y1: yB, up };
    if (!beamed) {
      ctx.globalAlpha = alpha; ctx.fillStyle = col; ctx.fillRect(sx, Math.min(yA, yB), st, Math.abs(yB - yA));
      if (it.dur <= .5) glyph(ctx, up ? G.flagUp : G.flagDn, sx, yB, sp, col, alpha);
    }
  }
  if (it.stac) { const up = it.dir === 'up'; glyph(ctx, up ? G.stacB : G.stacA, P.x - .15 * sp * 0 - .08 * sp, (up ? Math.max(...ys) + 1.2 * sp : Math.min(...ys) - 1.2 * sp) + (up ? .3 : .3) * sp, sp, INK, alpha * .85); }
  if (it.fermata) glyph(ctx, G.ferm, P.x - 0.7 * sp, Math.min(...ys) - 1.8 * sp - (it.v === 0 ? .6 * sp : 0), sp, INK, alpha);
  return { ys, stem, xh, hw };
}

// Beam for a group; stems are drawn here. `pl` = per-item {x, yc, dy}; cols = per-item colour.
export function drawBeam(ctx, g, pl, sp, cols, alpha) {
  const up = g[0].dir === 'up', st = .12 * sp, hw = headW(.5, sp);
  const ys = g.map((it, i) => it.pos.map(p => pl[i].yc - (p - 4) * sp / 2 + pl[i].dy));
  const sx = g.map((it, i) => up ? pl[i].x - hw / 2 + hw - st : pl[i].x - hw / 2);
  const tip0 = g.map((it, i) => up ? Math.min(...ys[i]) - 3.5 * sp : Math.max(...ys[i]) + 3.5 * sp);
  const dx = sx[sx.length - 1] - sx[0] || 1;
  let sl = Math.max(-1.2 * sp, Math.min(1.2 * sp, (tip0[tip0.length - 1] - tip0[0]) * .6)) / dx;
  let b0 = tip0[0];
  const at = (i, b) => b + sl * (sx[i] - sx[0]);
  // keep every stem at least 2.6 sp long
  for (let i = 0; i < g.length; i++) { const need = up ? Math.min(...ys[i]) - 2.6 * sp : Math.max(...ys[i]) + 2.6 * sp; const y = at(i, b0); if (up ? y > need : y < need) b0 += need - y; }
  const bt = .5 * sp;
  g.forEach((it, i) => {
    const yA = up ? Math.max(...ys[i]) - .168 * sp : Math.min(...ys[i]) + .168 * sp, yB = at(i, b0);
    ctx.globalAlpha = alpha; ctx.fillStyle = cols[i]; ctx.fillRect(sx[i], Math.min(yA, yB), st, Math.abs(yB - yA));
  });
  const xa = sx[0], xb = sx[sx.length - 1] + st;
  ctx.globalAlpha = alpha; ctx.fillStyle = mix(INK, INK, 0);
  // the beam takes the colour of its notes when they share one, otherwise ink
  ctx.fillStyle = cols.every(c => c === cols[0]) ? cols[0] : cols[0];
  const ya = at(0, b0), yb = at(g.length - 1, b0), o = up ? 0 : -bt;
  ctx.beginPath(); ctx.moveTo(xa, ya + o); ctx.lineTo(xb, yb + o); ctx.lineTo(xb, yb + o + bt); ctx.lineTo(xa, ya + o + bt); ctx.closePath(); ctx.fill();
}

// A slur as a filled crescent over the heads (stems are down in this score).
export function drawSlur(ctx, pts, sp, col, alpha) {
  const x0 = pts[0].x, x1 = pts[pts.length - 1].x, y0 = pts[0].y - 1.0 * sp, y1 = pts[pts.length - 1].y - 1.0 * sp;
  const top = Math.min(...pts.map(p => p.y)) - 1.5 * sp, L = x1 - x0;
  const c = (top - .125 * (y0 + y1)) / .75, tk = .3 * sp;
  ctx.globalAlpha = alpha; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0, y0);
  ctx.bezierCurveTo(x0 + L * .25, c, x1 - L * .25, c, x1, y1);
  ctx.bezierCurveTo(x1 - L * .25, c + tk * 1.35, x0 + L * .25, c + tk * 1.35, x0, y0); ctx.fill();
}
