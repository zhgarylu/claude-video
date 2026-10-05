// "How to read a paper": an annotated-paper explainer. render(t) draws any frame, deterministically.
import { clamp, seg, ss, eio, eo, TAU } from '/core/lib.js';
import { C, SERIF, SANS, rr, rgba, desk, typeset, drawWords, mark, ring, pageShape, greyLines, card } from './paper.js';
import { DUR, EV, ev, LINES, S, E } from './timeline.js';
const W = 1920, H = 1080, cv = document.getElementById('c'), g = cv.getContext('2d');
await Promise.all([document.fonts.load(`400 17px "Source Serif 4"`, 'Abstract 58%'), document.fonts.load(`700 24px "Source Serif 4"`, 'Skim'), document.fonts.load(`700 30px "Noto Sans SC"`, '问题'), document.fonts.load(`500 22px "Noto Sans SC"`, '问题')]);
let TX = [];
const txt = (id, text, x, y, o = {}) => { const { size = 30, w = 500, col = C.ink, align = 'left', font = SANS, alpha = 1 } = o; g.save(); g.globalAlpha = alpha; g.font = `${w} ${size}px ${font}`; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillStyle = col; g.fillText(text, x, y); const m = g.measureText(text).width; g.restore(); if (alpha > .5 && id) TX.push({ id, text, x0: align === 'center' ? x - m / 2 : align === 'right' ? x - m : x, y0: y - size, x1: align === 'center' ? x + m / 2 : align === 'right' ? x : x + m, y1: y + size * .25 }); };

// ---------------------------------------------------------------- the fictional paper (page coordinates, 720 x 930)
const PW = 720, PH = 930;
const ABS = typeset(g, [
  { id: 's1', text: 'Long-document question answering is slow because models read every token with the same care.' },
  { id: 's2', text: 'We propose Skim-then-Read, a two-pass method: a lightweight skimmer first scores each paragraph for relevance,' },
  { id: 's3', text: 'and a full model then reads only the top-scoring paragraphs.' },
  { id: 's4a', text: 'On three benchmarks, Skim-then-Read cuts latency by' }, { id: 'n58', text: '58%' }, { id: 's4b', text: 'while losing only' }, { id: 'n07', text: '0.7 points' }, { id: 's4c', text: 'of accuracy compared with reading everything.' },
], 60, 302, 600, 17, 26);
const LIM = typeset(g, [{ id: 'lim', text: 'The gains shrink when the answer is spread across many paragraphs, because the skimmer can discard part of the evidence.' }], 60, 708, 600, 17, 26);
const R = { ...ABS.rects, ...LIM.rects };
const rects = ids => ids.flatMap(i => R[i] || []);
const TBL = { x: [60, 250, 335, 450, 545, 640], y0: 520, rows: [['Bench A', '10.0', '4.2', '71.2', '70.4'], ['Bench B', '8.0', '3.5', '68.5', '67.9'], ['Bench C', '14.0', '5.6', '74.1', '73.4']] };
const FULL1 = { x0: 250, x1: 300, top: 499, bot: 523 }, FULL2 = { x0: 450, x1: 500, top: 499, bot: 523 };

function pageFrame(n) {
  pageShape(g, 0, 0, PW, PH);
  g.save(); g.fillStyle = C.ink; g.textAlign = 'center';
  if (n === 1) {
    g.font = `700 27px ${SERIF}`; g.fillText('Skim-then-Read: Faster Long-Document', PW / 2, 100); g.fillText('Question Answering by Reading Twice', PW / 2, 138);
    g.font = `italic 400 17px ${SERIF}`; g.fillText('A. Example  ·  B. Sample', PW / 2, 188); g.font = `400 15px ${SERIF}`; g.fillStyle = '#555'; g.fillText('Example Institute  (a fictional paper)', PW / 2, 212);
    g.textAlign = 'left'; g.fillStyle = C.ink; g.font = `700 18px ${SERIF}`; g.fillText('Abstract', 60, 272);
    drawWords(g, ABS);
    g.font = `700 20px ${SERIF}`; g.fillStyle = C.ink; g.fillText('1  Introduction', 60, 520); greyLines(g, 60, 548, 600, 9, 26, 1, 3);
  } else {
    g.textAlign = 'left'; g.font = `700 20px ${SERIF}`; g.fillText('4  Results', 60, 90);
    // Table 1
    g.font = `italic 400 14px ${SERIF}`; g.fillText('Table 1: Results per benchmark. "Full" reads every paragraph.', 60, 460);
    g.font = `700 14px ${SERIF}`; g.fillText('Latency (s)', 250, 488); g.fillText('F1', 450, 488);
    g.font = `700 15px ${SERIF}`; [['Benchmark', 0], ['Full', 1], ['Ours', 2], ['Full', 3], ['Ours', 4]].forEach(([s, i]) => g.fillText(s, TBL.x[i], 518));
    g.strokeStyle = C.ink; g.lineWidth = 1.4; for (const y of [494, 528, 636]) { g.beginPath(); g.moveTo(60, y); g.lineTo(640, y); g.stroke(); }
    g.font = `400 16px ${SERIF}`; TBL.rows.forEach((r, k) => r.forEach((s, i) => g.fillText(s, TBL.x[i], 556 + k * 30)));
    g.font = `700 20px ${SERIF}`; g.fillText('5  Limitations', 60, 678); drawWords(g, LIM);
    greyLines(g, 60, 810, 600, 3, 26, 1, 8);
  }
  g.font = `400 13px ${SERIF}`; g.fillStyle = '#8a8578'; g.textAlign = 'left'; g.fillText('Fictional paper for illustration. All numbers are invented.', 60, 905); g.textAlign = 'right'; g.fillText(String(n), PW - 60, 905);
  g.restore();
}
function figure(p) {                                                    // Figure 2: two small bar charts, bars grow with p
  g.save(); g.translate(0, 0);
  const charts = [{ x: 60, title: 'Latency (s), average', a: 10.7, b: 4.4, max: 12, fmt: v => v.toFixed(1) }, { x: 370, title: 'F1, average', a: 71.3, b: 70.6, max: 80, fmt: v => v.toFixed(1) }];
  g.fillStyle = C.ink; g.font = `400 14px ${SERIF}`;
  for (const c of charts) {
    const x0 = c.x, yb = 372, h = 200; g.strokeStyle = C.ink; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x0, yb); g.lineTo(x0 + 270, yb); g.moveTo(x0, yb); g.lineTo(x0, yb - h - 10); g.stroke();
    [[c.a, 'Full', '#9aa7b8', x0 + 40], [c.b, 'Ours', C.blue, x0 + 160]].forEach(([v, lab, col, bx]) => { const hh = h * v / c.max * ss(clamp(p * 1.3 - (lab === 'Ours' ? .2 : 0))); g.fillStyle = col; g.fillRect(bx, yb - hh, 70, hh); g.fillStyle = C.ink; g.textAlign = 'center'; g.font = `400 15px ${SERIF}`; g.fillText(lab, bx + 35, yb + 20); if (p > .7) g.fillText(c.fmt(v), bx + 35, yb - hh - 8); });
    g.textAlign = 'left'; g.font = `700 15px ${SERIF}`; g.fillStyle = C.ink; g.fillText(c.title, x0, yb - h - 24);
  }
  g.font = `italic 400 14px ${SERIF}`; g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText('Figure 2: Average latency and F1 over the three benchmarks.', 60, 414);
  g.restore();
}

// ---------------------------------------------------------------- camera: page coordinates -> screen
const AX = 620, AY = 540;
const KEYS = [[0, 360, 465, .98], [S.p2 - .4, 360, 465, .98], [S.p2 + .5, 360, 335, 1.7], [S.p3 + .3, 360, 352, 1.7], [S.p4 - .3, 360, 352, 1.7], [S.p4 + .5, 360, 400, 1.7], [S.p4 + 3.7, 360, 400, 1.7], [S.p4 + 4.9, 360, 465, .98], [S.p5 - .1, 360, 465, .98], [S.p5 + .7, 360, 535, 1.55], [S.p6 - .1, 360, 535, 1.55], [S.p6 + .7, 360, 722, 1.7], [S.p7 - .1, 360, 722, 1.7], [S.p7 + .8, 360, 465, .98]];
function cam(t) { let k = 0; while (k < KEYS.length - 1 && t >= KEYS[k + 1][0]) k++; if (k >= KEYS.length - 1) return KEYS[KEYS.length - 1].slice(1); const a = KEYS[k], b = KEYS[k + 1], u = eio(seg(t, a[0], b[0])); return [1, 2, 3].map(i => a[i] + (b[i] - a[i]) * u); }
const toScreen = (c, x, y, off = 0) => [AX + (x + off - c[0]) * c[2], AY + (y - c[1]) * c[2]];
const TURN0 = S.p4 + 3.9, TURN1 = S.p4 + 4.9;
const p2off = t => 840 * (1 - eo(seg(t, TURN0, TURN1)));

// ---------------------------------------------------------------- annotations: highlights, rings, note cards
const MARKS = [[['s1'], S.p2 + .6, 1.8], [['s2', 's3'], S.p3 + .5, 3.0], [['s4a', 'n58', 's4b', 'n07', 's4c'], S.p4 + .3, 2.0], [['lim'], S.p6 + .5, 2.0]];
const RINGS = [[R.n58[0], S.p4 + 2.0, .7, 1], [R.n07[0], S.p4 + 3.0, .8, 2], [FULL1, S.p5 + .9, .6, 3], [FULL2, S.p5 + 1.5, .6, 4]];
const NOTES = [
  { id: 'n1', t: S.p2 + .9, col: C.amber, h: 150, title: '问题', body: '每个字一样细读 → 慢', anchor: ['s1', 1] },
  { id: 'n2', t: S.p3 + 1.0, col: C.blue, h: 270, title: '办法', body: '先略读，再精读', anchor: ['s2', 1], kind: 'diagram' },
  { id: 'n3', t: S.p4 + 1.4, col: C.green, h: 210, title: '证据', body: '', anchor: ['n58', 1], kind: 'stats' },
  { id: 'n4', t: S.p5 + 1.0, col: C.red, h: 170, title: '注意', body: '作者自己报告 · 只比了 1 种基线', anchor: ['full', 2] },
  { id: 'n5', t: S.p6 + .8, col: C.amber, h: 150, title: '局限', body: '答案分散 → 收益变小', anchor: ['lim', 1] },
  { id: 'n6', t: S.p7 + .5, col: C.blue, h: 200, title: '结论', body: '答案集中：适合', body2: '答案分散：未必', kind: 'verdict' },
  { id: 'n7', t: S.p8 + .4, col: C.green, h: 290, title: '读论文，问三件事', kind: 'check' },
];
const COLX = 1150, COLW = 690;
function anchorPoint(n, c, t) { if (!n.anchor) return null; const [id, pg] = n.anchor; let bx, by; if (id === 'full') { bx = FULL1.x1 + 8; by = (FULL1.top + FULL1.bot) / 2; } else { const rs = R[id]; const r = rs[rs.length - 1]; bx = r.x1 + 6; by = r.y - 6; } return toScreen(c, bx, by, pg === 2 ? p2off(t) : 0); }
function drawNote(n, x, y, a, t, c) {
  card(g, x, y, COLW, n.h, n.col, a); g.save(); g.globalAlpha = Math.min(1, a * 1.5);
  g.fillStyle = n.col; g.font = `700 30px ${SANS}`; g.textAlign = 'left'; g.fillText(n.title, x + 38, y + 50);
  const id = 'nt_' + n.id; TX.push({ id, text: n.title, x0: x + 38, y0: y + 22, x1: x + 38 + g.measureText(n.title).width, y1: y + 58 });
  g.fillStyle = C.ink; g.font = `500 34px ${SANS}`;
  if (n.kind === 'stats') {
    const u = seg(t, n.t + .3, n.t + 1.0); const stat = (cx, big, small) => { g.textAlign = 'center'; g.fillStyle = C.green; g.font = `700 76px ${SANS}`; g.globalAlpha = Math.min(1, a * 1.5) * ss(u); g.fillText(big, cx, y + 142); g.fillStyle = C.ink; g.font = `500 28px ${SANS}`; g.fillText(small, cx, y + 184); };
    stat(x + COLW * .27, '−58%', '延迟'); stat(x + COLW * .73, '−0.7 点', '准确率');
    TX.push({ id: 'st1', text: '−58%', x0: x + COLW * .27 - 100, y0: y + 80, x1: x + COLW * .27 + 100, y1: y + 150 }, { id: 'st2', text: '−0.7 点', x0: x + COLW * .73 - 130, y0: y + 80, x1: x + COLW * .73 + 130, y1: y + 150 });
  } else if (n.kind === 'diagram') {
    g.fillText(n.body, x + 38, y + 100); TX.push({ id: 'nb_' + n.id, text: n.body, x0: x + 38, y0: y + 72, x1: x + 38 + g.measureText(n.body).width, y1: y + 108 });
    const sc = [.3, .9, .2, .75, .15, .35], u1 = seg(t, n.t + .5, n.t + 1.2), u2 = seg(t, n.t + 1.6, n.t + 2.4), u3 = seg(t, n.t + 2.6, n.t + 3.4);
    sc.forEach((v, i) => { const bx = x + 38 + i * 76, by = y + 130, top = v > .5 && u3 > 0; g.globalAlpha = Math.min(1, a * 1.5) * ss(clamp(u1 * 6 - i)); rr(g, bx, by + 50, 64, 46, 8); g.fillStyle = top ? rgba(C.blue, .25 * u3 + .06) : '#ece8da'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = top ? C.blue : '#b9b4a4'; g.stroke(); g.fillStyle = C.blue; g.globalAlpha = Math.min(1, a * 1.5) * ss(u2); g.fillRect(bx + 8, by + 46 - 40 * v * u2, 48, 40 * v * u2 + 2); });
    g.globalAlpha = Math.min(1, a * 1.5); g.fillStyle = C.dim; g.font = `500 20px ${SANS}`; g.fillText('小模型：给每段打分', x + 38, y + 258);
    const au = ss(u3); if (au > 0) { g.globalAlpha = au; g.strokeStyle = C.blue; g.lineWidth = 3.5; g.beginPath(); g.moveTo(x + 500, y + 190); g.lineTo(x + 560, y + 190); g.moveTo(x + 548, y + 180); g.lineTo(x + 560, y + 190); g.lineTo(x + 548, y + 200); g.stroke(); rr(g, x + 572, y + 160, 96, 60, 10); g.fillStyle = rgba(C.blue, .18); g.fill(); g.stroke(); g.fillStyle = C.blue; g.font = `700 24px ${SANS}`; g.textAlign = 'center'; g.fillText('大模型', x + 620, y + 198); g.textAlign = 'left'; }
  } else if (n.kind === 'verdict') {
    g.fillStyle = C.green; g.font = `700 34px ${SANS}`; g.fillText('✓', x + 38, y + 110); g.fillStyle = C.ink; g.font = `500 34px ${SANS}`; g.fillText(n.body, x + 90, y + 110); TX.push({ id: 'v1', text: n.body, x0: x + 90, y0: y + 80, x1: x + 90 + g.measureText(n.body).width, y1: y + 118 });
    g.fillStyle = C.red; g.font = `700 34px ${SANS}`; g.fillText('？', x + 38, y + 165); g.fillStyle = C.ink; g.font = `500 34px ${SANS}`; g.fillText(n.body2, x + 90, y + 165); TX.push({ id: 'v2', text: n.body2, x0: x + 90, y0: y + 135, x1: x + 90 + g.measureText(n.body2).width, y1: y + 173 });
  } else if (n.kind === 'check') {
    ['它想解决什么问题？', '它拿什么来比？', '它在哪里会失效？'].forEach((s, i) => { const yy = y + 108 + i * 62, u = seg(t, n.t + .8 + i * 1.1, n.t + 1.2 + i * 1.1); g.globalAlpha = Math.min(1, a * 1.5); g.lineWidth = 3.5; g.strokeStyle = C.ink; rr(g, x + 38, yy - 30, 38, 38, 8); g.stroke(); if (u > 0) { g.strokeStyle = C.green; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 45, yy - 10); g.lineTo(x + 54, yy - 1); g.lineTo(x + 54 + 22 * u, yy - 1 - 30 * u); g.stroke(); } g.fillStyle = C.ink; g.font = `500 34px ${SANS}`; g.fillText(s, x + 96, yy); TX.push({ id: 'ck' + i, text: s, x0: x + 96, y0: yy - 30, x1: x + 96 + g.measureText(s).width, y1: yy + 8 }); });
  } else { g.fillText(n.body, x + 38, y + 106); TX.push({ id: 'nb_' + n.id, text: n.body, x0: x + 38, y0: y + 76, x1: x + 38 + g.measureText(n.body).width, y1: y + 114 }); }
  g.restore();
}
function notes(t, c) {
  const live = NOTES.filter(n => t >= n.t), cur = live[live.length - 1]; if (!cur) return;
  const ca = ss(seg(t, cur.t, cur.t + .35)), cy = 120; let y = cy + cur.h + 30;
  const prev = live.slice(0, -1);
  prev.forEach((n, i) => {                                               // earlier notes shrink to a one-line chip, stacked under the current card
    const ya = y + (prev.length - 1 - i) * 0;                              // placeholder to keep the order explicit
    const k = prev.length - 1 - i;
    const yy = cy + cur.h + 30 + k * 70;
    g.save(); g.globalAlpha = .9; rr(g, COLX, yy, COLW, 58, 14); g.fillStyle = '#2a2e36'; g.fill(); g.fillStyle = n.col; rr(g, COLX, yy, 10, 58, 5); g.fill();
    g.fillStyle = C.text; g.font = `700 24px ${SANS}`; g.textAlign = 'left'; g.fillText(n.title, COLX + 30, yy + 38); g.fillStyle = C.dim; g.font = `500 22px ${SANS}`; const line = n.body || (n.id === 'n3' ? '延迟 −58% · 准确率 −0.7 点' : n.id === 'n2' ? '小模型打分，大模型只读高分段' : ''); g.fillText(line, COLX + 120, yy + 38); g.restore();
    if (n.id) { TX.push({ id: 'chip_' + n.id, text: n.title, x0: COLX + 30, y0: yy + 12, x1: COLX + 80, y1: yy + 46 }); }
  });
  drawNote(cur, COLX, cy, ca, t, c);
  const ap = anchorPoint(cur, c, t);
  if (ap) { const u = seg(t, cur.t + .1, cur.t + .6); g.save(); g.globalAlpha = .9 * u; g.strokeStyle = cur.col; g.lineWidth = 3; g.setLineDash([2, 7]); g.lineCap = 'round'; g.beginPath(); g.moveTo(COLX - 6, cy + cur.h / 2); g.quadraticCurveTo((COLX + ap[0]) / 2, cy + cur.h / 2 + 40, ap[0] + (ap[0] < COLX ? 0 : 0), ap[1]); g.stroke(); g.setLineDash([]); g.beginPath(); g.arc(ap[0], ap[1], 6, 0, TAU); g.fillStyle = cur.col; g.fill(); g.restore(); }
}

// ---------------------------------------------------------------- sound events (pushed once, up front)
for (const l of LINES) ev(S[l.id], 'voice', 1, { id: l.id });
ev(S.p1 + .1, 'paper', .7); ev(S.p1 + 1.4, 'stamp', .8);
for (const [, t0, d] of MARKS) ev(t0, 'mark', .6, { dur: d });
for (const [, t0, d] of RINGS) ev(t0, 'circle', .6, { dur: d });
for (const n of NOTES) ev(n.t, 'note', .6);
ev(TURN0, 'turn', .8); ev(S.p4 + 5.0, 'bars', .5);
for (let i = 0; i < 3; i++) ev(S.p8 + .8 + i * 1.1 + .35, 'tick', .6);
ev(E.p8 - .2, 'resolve', .8);

// ---------------------------------------------------------------- frame
function render(t) {
  TX = []; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; desk(g, W, H);
  const c0 = cam(t), c = [c0[0] + Math.sin(t * .7) * 2.5, c0[1] + Math.cos(t * .53) * 2, c0[2]], enter = eo(seg(t, S.p1 - .3, S.p1 + .7));
  g.save(); g.translate(AX, AY + (1 - enter) * 120); g.scale(c[2], c[2]); g.translate(-c[0], -c[1]); g.globalAlpha = Math.min(1, enter * 1.6);
  pageFrame(1);
  for (const [ids, t0, d] of MARKS) { if (ids[0] === 'lim') continue; mark(g, rects(ids), seg(t, t0, t0 + d)); }
  for (const [box, t0, d, sd] of RINGS.slice(0, 2)) ring(g, box, seg(t, t0, t0 + d), C.red, sd);
  const off = p2off(t);
  if (t >= TURN0 - .05) { g.save(); g.translate(off, 0); pageFrame(2); figure(seg(t, S.p4 + 5.0, S.p4 + 6.4)); const [ids, t0, d] = MARKS[3]; mark(g, rects(ids), seg(t, t0, t0 + d)); for (const [box, a, b, sd] of RINGS.slice(2)) ring(g, box, seg(t, a, a + b), C.red, sd); g.restore(); }
  g.restore();
  notes(t, c);
  // HUD: title, step, fiction badge, caption
  g.save(); rr(g, 36, 22, 420, 106, 18); g.fillStyle = 'rgba(14,16,20,.82)'; g.fill(); g.restore();
  txt('hud_title', '怎么读一篇论文', 60, 66, { size: 36, w: 700, col: C.text });
  const steps = { p2: '问题', p3: '办法', p4: '证据', p5: '证据 · 比较对象', p6: '局限', p7: '结论', p8: '三个问题' }, cur = [...LINES].reverse().find(l => t >= S[l.id] - .1), st = cur && steps[cur.id];
  if (st) txt('hud_step', st, 60, 112, { size: 28, w: 600, col: C.amber, alpha: ss(seg(t, S[cur.id] - .1, S[cur.id] + .25)) });
  g.save(); g.globalAlpha = ss(seg(t, S.p1 + 1.2, S.p1 + 1.6)); rr(g, 1560, 34, 300, 50, 25); g.fillStyle = rgba(C.amber, .16); g.fill(); g.lineWidth = 2.4; g.strokeStyle = C.amber; g.stroke(); g.fillStyle = C.amber; g.font = `700 26px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('示例论文（虚构）', 1710, 60); g.restore(); if (t > S.p1 + 1.6) TX.push({ id: 'badge', text: '示例论文（虚构）', x0: 1590, y0: 38, x1: 1830, y1: 82 });
  const l = LINES.find(l => t >= S[l.id] - .05 && t < E[l.id] + .5);
  if (l) {
    const a = ss(seg(t, S[l.id] - .05, S[l.id] + .12)) * (1 - ss(seg(t, E[l.id] + .25, E[l.id] + .5)));
    g.save(); g.globalAlpha = a; g.font = `600 46px ${SANS}`; let lines = [l.text];
    if (g.measureText(l.text).width > 1500) { const mid = l.text.length / 2; let best = Math.ceil(mid), bd = 1e9;[...l.text].forEach((ch, i) => { if ('，。！？；：'.includes(ch) && i < l.text.length - 1) { const d = Math.abs(i + 1 - mid); if (d < bd) { bd = d; best = i + 1; } } }); lines = [l.text.slice(0, best), l.text.slice(best)]; }
    const wmax = Math.max(...lines.map(s => g.measureText(s).width)), bh = lines.length * 62 + 22, by = 1052 - bh;
    rr(g, W / 2 - wmax / 2 - 36, by - 6, wmax + 72, bh, 22); g.fillStyle = 'rgba(8,10,14,.9)'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(154,163,178,.4)'; g.stroke();
    g.fillStyle = C.text; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; lines.forEach((s, i) => { g.fillText(s, W / 2, by + 52 + i * 62); if (a > .9) TX.push({ id: 'sub_' + l.id + i, text: s, x0: W / 2 - g.measureText(s).width / 2, y0: by + 14 + i * 62, x1: W / 2 + g.measureText(s).width / 2, y1: by + 64 + i * 62 }); }); g.restore();
  }
  const f = Math.max(1 - ss(seg(t, 0, .35)), ss(seg(t, DUR - .6, DUR))); if (f > 0) { g.fillStyle = '#14161a'; g.globalAlpha = f; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
}
window.DUR = DUR; window.EV = EV; window.render = render;
window.TEXTS = t => { render(t); return TX; };
render(0); window.READY = true;
