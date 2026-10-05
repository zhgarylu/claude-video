// A broadsheet front page, page-local coordinates: x -700..700, y -950..950, drawn as a function of film time.
import { clamp, ss, eo, mulberry, hash } from '/core/lib.js';
import { INK, font, flow, fillColumn, drawLines, layoutHead, drawHead, measure } from './type.js';
import { SENT, HEADS, ADS, TIDES } from './copy.js';
import { paintScene, makeScreen, drawScreen } from './halftone.js';
import { T, HL } from '../timeline.js';

export const PW = 1400, PH = 1900, RED = '#c0281d';
const COLW = 195, GUT = 22, colX = i => -640 + i * (COLW + GUT);
const rangeT = (t, a, b) => clamp((t - a) / (b - a));

// ---------------------------------------------------------------- paper
export function makePaper(seed, tint) {
  const cv = document.createElement('canvas'); cv.width = PW; cv.height = PH; const c = cv.getContext('2d'), rnd = mulberry(seed);
  c.fillStyle = tint; c.fillRect(0, 0, PW, PH);
  const layer = (w, h, amp, col, sx, sy) => {
    const n = document.createElement('canvas'); n.width = w; n.height = h; const g = n.getContext('2d'), id = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { id.data[i * 4] = col[0]; id.data[i * 4 + 1] = col[1]; id.data[i * 4 + 2] = col[2]; id.data[i * 4 + 3] = rnd() * rnd() * amp * 255; }
    g.putImageData(id, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(n, 0, 0, w * sx, h * sy);
  };
  layer(350, 475, 0.20, [90, 70, 40], 4, 4); layer(175, 238, 0.16, [110, 90, 55], 8, 8);
  layer(700, 40, 0.18, [100, 80, 50], 2, 47.5);                       // vertical fibres
  // shives and flecks
  for (let i = 0; i < 700; i++) { c.fillStyle = `rgba(60,45,30,${0.1 + rnd() * 0.25})`; const r = 0.6 + rnd() * 1.6; c.beginPath(); c.arc(rnd() * PW, rnd() * PH, r, 0, 7); c.fill(); }
  for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(255,252,240,${0.2 + rnd() * 0.3})`; c.fillRect(rnd() * PW, rnd() * PH, 1 + rnd() * 3, 1); }
  // age at the edges
  let g = c.createRadialGradient(PW / 2, PH / 2, PH * 0.3, PW / 2, PH / 2, PH * 0.75); g.addColorStop(0, 'rgba(120,90,40,0)'); g.addColorStop(1, 'rgba(120,90,40,.28)'); c.fillStyle = g; c.fillRect(0, 0, PW, PH);
  // the fold line
  g = c.createLinearGradient(0, PH / 2 - 14, 0, PH / 2 + 14); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, 'rgba(60,45,25,.10)'); g.addColorStop(0.5, 'rgba(40,30,15,.22)'); g.addColorStop(0.55, 'rgba(255,255,245,.20)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, PH / 2 - 14, PW, 28);
  return cv;
}

// ---------------------------------------------------------------- stamps
function distress(c, w, h, rnd, n) { c.save(); c.globalCompositeOperation = 'destination-out'; for (let i = 0; i < n; i++) { c.globalAlpha = 0.5 + rnd() * 0.5; const r = 0.5 + rnd() * rnd() * 5; c.beginPath(); c.arc(rnd() * w, rnd() * h, r, 0, 7); c.fill(); } c.globalAlpha = 0.7; for (let i = 0; i < 14; i++) { c.fillRect(rnd() * w, rnd() * h, 14 + rnd() * 60, 0.8 + rnd() * 1.6); } c.restore(); }
export function makeStamp(text, w, h, fs, seed, bw = 8) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'), rnd = mulberry(seed);
  c.strokeStyle = RED; c.fillStyle = RED; c.lineWidth = bw; c.strokeRect(bw, bw, w - 2 * bw, h - 2 * bw); c.lineWidth = bw * 0.35; c.strokeRect(bw * 2.4, bw * 2.4, w - 4.8 * bw, h - 4.8 * bw);
  c.font = font('slab', fs); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2 + fs * 0.04);
  c.lineWidth = fs * 0.04; c.strokeStyle = RED; c.strokeText(text, w / 2, h / 2 + fs * 0.04);
  distress(c, w, h, rnd, Math.round(w * h / 400));
  return cv;
}

// ---------------------------------------------------------------- scenes and screens (shared, built once)
const LUM = {};
export function lum(k) { return LUM[k] ??= paintScene(k); }

// ---------------------------------------------------------------- building a page
function hairline(c, x0, y0, x1, y1, w = 1, a = 0.85) { c.strokeStyle = INK; c.globalAlpha = a; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.globalAlpha = 1; }
function growRule(c, x0, x1, y, t, tA, dur, w, a = 0.9) { const p = ss(rangeT(t, tA, tA + dur)); if (p <= 0) return; const m = (x0 + x1) / 2, h = (x1 - x0) / 2 * p; hairline(c, m - h, y, m + h, y, w, a); }
function growV(c, x, y0, y1, t, tA, dur, w = 0.9) { const p = rangeT(t, tA, tA + dur); if (p <= 0) return; hairline(c, x, y0, x, y0 + (y1 - y0) * ss(p), w, 0.75); }

export function buildPage(kind) {
  const P = { kind, t: {}, reads: [] };
  const fB = font('body', 15.5), fBI = font('bodyI', 14.5), LH = 19;
  // masthead
  const mw = measure(font('mast', 100), 'THE LANTERN') + 10 * 10;
  const msize = Math.min(150, 100 * 900 / mw);
  P.mast = layoutHead(['THE LANTERN'], 'mast', msize, 1, { x: 0 }, [-775], 8);
  // headlines
  const hs = 184, sx = 0.78;
  if (kind === 'p1') P.heads = [{ H: layoutHead(HL.h1, 'head', hs, sx, { x: -640, align: 'left' }, [-576, -418], 0), tIn: T.p1Head, dt: T.p1HeadDt }];
  if (kind === 'p2') P.heads = [
    { H: layoutHead(HL.h2, 'head', hs, sx, { x: -640, align: 'left' }, [-576, -418], 0), tIn: T.p2Head, dt: T.p2HeadDt, tOut: T.pull0, dtOut: T.pullDt },
    { H: layoutHead(HL.h3, 'head', hs, sx, { x: -640, align: 'left' }, [-576, -418], 0), tIn: T.fix0, dt: T.fixDt }];
  if (kind === 'p4') {
    P.heads = [
      { H: layoutHead(['WE WERE WRONG'], 'head', hs, 0.64, { x: -600, align: 'left' }, [-548], 0), tIn: T.p4Head, dt: T.p4HeadDt },
      { H: layoutHead(["OVEN'S FIRST LOAF", 'FEEDS THE STREET'], 'head', 78, 0.8, { x: -640, align: 'left' }, [-402, -330], 0), tIn: T.p4Head + 1.9, dt: 0.035 }];
  }
  // editions in the right ear
  P.ear = kind === 'p1' ? [[-99, ['FIRST', 'EDITION', '6 A.M.']]] : kind === 'p2' ? [[-99, ['NOON', 'EDITION', '12 O’CLOCK']], [T.edition2, ['LATE', 'STOP PRESS', '12.40 P.M.']]] : [[-99, ['EVENING', 'FINAL', '6 P.M.']]];
  P.mastT = kind === 'p1' ? T.p1Mast : -99;
  P.rulesT = kind === 'p1' ? T.p1Rules : -99;
  const std = kind !== 'p4';
  // photo
  const ph = std ? { x: -200, y: -310, w: 840, h: 430 } : { x: -200, y: -262, w: 840, h: 390 };
  P.photo = ph;
  if (kind === 'p1') { P.screen = makeScreen(ph.w, ph.h, 5.4, lum('smoke')); P.dev = t => rangeT(t, T.p1Photo, T.p1PhotoEnd); P.morph = () => 0; }
  if (kind === 'p2') { P.screen = makeScreen(ph.w, ph.h, 5.4, lum('smoke2'), lum('steam')); P.dev = t => rangeT(t, T.p2Photo, T.p2PhotoEnd); P.morph = t => rangeT(t, T.morph0, T.morph1); }
  if (kind === 'p4') { P.screen = makeScreen(ph.w, ph.h, 5.4, lum('queue')); P.dev = t => rangeT(t, T.p4Photo, T.p4PhotoEnd); P.morph = () => 0; }
  // captions (italic body), 2 lines under the photo
  const capY = ph.y + ph.h + 24;
  const capT = {
    p1: [{ text: 'Smoke rises above the Candle Mill at first light.', t0: T.p1Cap, t1: 1e9 }],
    p2: [{ text: 'Crowds gather at the quay as the smoke grows.', t0: T.p2PhotoEnd - 0.8, t1: T.pull0 }, { text: 'The “fire”: a new oven flue on Harbour Road. The mill is quiet.', t0: T.fixCap, t1: 1e9 }],
    p4: [{ text: 'Neighbours queue on Harbour Road for the first loaves.', t0: T.p4Note, t1: 1e9 }],
  }[kind];
  P.caps = capT.map(cp => ({ ...cp, lines: flow(fBI, cp.text, ph.x, ph.w, capY, 18.5, { ragged: true }) }));
  // decks
  const deckY = -372;
  const decks = {
    p1: [{ text: 'Smoke seen at dawn; residents told to stay indoors', t0: T.p1Deck, t1: 1e9 }],
    p2: [{ text: 'Crowds at the quayside as firemen reach the mill', t0: T.p2Head + 1.6, t1: T.pull0 }, { text: 'The smoke was the bakery’s new oven; nobody was hurt', t0: T.fixDeck, t1: 1e9 }],
    p4: [{ text: 'The smoke was a new oven, lighting.', t0: T.p4Head + 3.2, t1: 1e9 }],
  }[kind];
  const dy = std ? deckY : -290;
  P.decks = decks.map(d => ({ ...d, lines: flow(font('headI', 26), d.text, -640, 1280, dy, 28, { ragged: true }) }));
  // lead story (columns 0-1)
  const y0 = std ? -262 : -222, lines = std ? 21 : 18;
  const si = kind === 'p1' ? 0 : kind === 'p2' ? 4 : 9;
  const SL = SENT.slice(); P.drop = SL[si][0]; SL[si] = SL[si].slice(1);
  const l0 = fillColumn(fB, SL, colX(0), COLW, y0, LH, lines, si, { dropN: 3, dropDx: 52, noIndent0: true });
  const l1 = fillColumn(fB, SENT, colX(1), COLW, y0, LH, lines, kind === 'p1' ? 7 : kind === 'p2' ? 12 : 15);
  P.lead = [l0, l1]; P.leadY0 = y0;
  P.byline = kind === 'p4' ? 'By our Harbour Road correspondent' : kind === 'p2' ? 'By our Quay correspondent' : 'By our Quay correspondent';
  // lower region
  const yL = 232, nL = 34, off = kind === 'p1' ? 3 : kind === 'p2' ? 11 : 19;
  P.lower = [];
  P.lowerHeads = [];
  // story A: cols 0-1 (head over two columns)
  const hA = HEADS[(off) % HEADS.length];
  P.lowerHeads.push({ text: hA, x: colX(0), y: yL + 32, size: 40, w: 412 });
  P.lower.push(fillColumn(fB, SENT, colX(0), COLW, yL + 66, LH, 32, off + 2), fillColumn(fB, SENT, colX(1), COLW, yL + 66, LH, 32, off + 8));
  // tides box in cols 2-3 then story B
  P.tides = { x: colX(2), y: yL + 8, w: 412, h: 172 };
  const hB = HEADS[(off + 2) % HEADS.length];
  P.lowerHeads.push({ text: hB, x: colX(2), y: yL + 232, size: 36, w: 412 });
  P.lower.push(fillColumn(fB, SENT, colX(2), COLW, yL + 262, LH, 22, off + 14), fillColumn(fB, SENT, colX(3), COLW, yL + 262, LH, 22, off + 20));
  // ad box in cols 4-5, then story C
  P.ad = { x: colX(4), y: yL + 8, w: 412, h: 232, i: kind === 'p1' ? 0 : kind === 'p2' ? 1 : 2 };
  const hC = HEADS[(off + 4) % HEADS.length];
  P.lowerHeads.push({ text: hC, x: colX(4), y: yL + 298, size: 36, w: 412 });
  P.lower.push(fillColumn(fB, SENT, colX(4), COLW, yL + 328, LH, 19, off + 5), fillColumn(fB, SENT, colX(5), COLW, yL + 328, LH, 19, off + 25));
  P.lowerT = (kind === 'p1' ? T.p1Body + 1.0 : kind === 'p2' ? T.p2Body + 0.4 : T.p4Body + 0.4);
  P.leadT = kind === 'p1' ? T.p1Lead : kind === 'p2' ? T.p2Body : T.p4Body - 0.2;
  P.stamp = kind === 'p2' ? makeStamp('STOP PRESS', 600, 150, 88, 5) : null;
  P.extra = kind === 'p2' ? makeStamp('EXTRA', 250, 92, 58, 9, 5) : null;
  P.noteBox = kind === 'p4';
  // things the readcheck should know are being read (page-local rects, visible from t0 to t1)
  const R = [];
  for (const h of P.heads || []) {
    const text = h.H.chars.length ? '' : '';
  }
  P.reads = R;
  return P;
}

// ---------------------------------------------------------------- drawing
export function drawPage(c, P, t, paper, o = {}) {
  c.drawImage(paper, -PW / 2, -PH / 2);
  const S = P.kind;
  c.save(); c.beginPath(); c.rect(-PW / 2, -PH / 2, PW, PH); c.clip();
  c.lineCap = 'butt'; c.textBaseline = 'alphabetic';
  // top micro line
  c.font = font('slab', 12.5); c.fillStyle = INK; c.globalAlpha = 0.9;
  const dl = (t - (P.mastT - 0.3)) > 0 ? 1 : 0;
  if (dl) {
    c.textAlign = 'left'; c.fillText('VOL. CXII  ·  No. 14,203', -640, -910);
    c.textAlign = 'center'; c.fillText('TALLOW BAY, TUESDAY, MARCH 9', 0, -910);
    c.textAlign = 'right'; c.fillText('PRICE TWOPENCE', 640, -910);
    c.textAlign = 'left';
  }
  c.globalAlpha = 1;
  growRule(c, -640, 640, -898, t, P.rulesT, 0.6, 1.2);
  // ears
  if (dl) {
    c.font = font('slab', 12); c.fillStyle = INK;
    ['TALLOW BAY', 'EST. 1871', 'FOG, CLEARING', 'WIND NW, LIGHT'].forEach((s, i) => c.fillText(s, -640, -860 + i * 18));
    hairline(c, -640, -780, -500, -780, 1.2);
    const e = [...P.ear].reverse().find(x => t >= x[0])[1];
    c.save(); c.strokeStyle = INK; c.lineWidth = 2.4; c.strokeRect(500, -870, 140, 98); c.lineWidth = 0.8; c.strokeRect(505, -865, 130, 88);
    c.textAlign = 'center'; c.font = font('sub', 25); c.fillText(e[0], 570, -835); c.font = font('sub', e[1].length > 9 ? 17 : 21); c.fillText(e[1], 570, -811); c.font = font('slab', 12); c.fillText(e[2], 570, -788); c.restore();
  }
  // masthead
  drawHead(c, P.mast, t, P.mastT, 0.07);
  if (t > P.mastT + 0.9) { c.font = font('slab', 13); c.fillStyle = INK; c.textAlign = 'center'; c.fillText('THE TALLOW BAY LANTERN  ·  NEWS FOR THE HARBOUR  ·  SINCE 1871', 0, -738); c.textAlign = 'left'; }
  growRule(c, -640, 640, -722, t, P.rulesT + 0.1, 0.6, 4.2); growRule(c, -640, 640, -714, t, P.rulesT + 0.25, 0.6, 1.1);
  // headlines
  for (const h of P.heads) drawHead(c, h.H, t, h.tIn, h.dt, h.tOut ?? null, h.dtOut ?? 0.055);
  // rule under the headline block
  const hy = S === 'p4' ? -272 : -334;
  growRule(c, -640, 640, hy, t, S === 'p1' ? T.p1Deck - 0.3 : S === 'p2' ? P.rulesT : T.p4Head + 2, 0.5, 2.2);
  if (S === 'p4') {
    // the correction box: the same size of type as the mistake it corrects
    const bt = T.p4Head - 0.15, b = ss(rangeT(t, bt, bt + 0.6));
    if (b > 0) {
      c.save(); c.strokeStyle = INK; c.lineWidth = 5; const bx = -640, by = -702, bw = 1280, bh = 234;
      c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + bw * b, by); c.lineTo(bx + bw * b, by + bh * Math.max(0, b * 2 - 1)); c.stroke();
      c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, by + bh * b); c.lineTo(bx + bw * Math.max(0, b * 2 - 1), by + bh); c.stroke();
      c.restore();
      const done = rangeT(t, bt + 0.4, bt + 0.8);
      if (done > 0) { c.save(); c.globalAlpha = done; c.fillStyle = INK; c.fillRect(bx + 14, by + 12, 168, 24); c.fillStyle = '#d8d0b8'; c.font = font('slab', 16); c.fillText('CORRECTION', bx + 24, by + 30); c.restore(); }
      const ct = T.p4Head + 12 * T.p4HeadDt + 0.15;
      if (t > ct) drawLines(c, flow(font('headI', 24), 'There was no fire at the Candle Mill. We are sorry.', -600, 1190, -498, 28, { ragged: true }), font('headI', 24), t, ct, 0.06);
    }
  }
  // decks
  for (const d of P.decks) if (t >= d.t0 && t < d.t1) drawLines(c, d.lines, font('headI', 26), t, d.t0, 0.05);
  // lead story
  c.fillStyle = INK;
  const lt = P.leadT;
  if (t > lt - 0.2) {
    c.font = font('bodyI', 14.5); c.globalAlpha = Math.min(1, (t - lt + 0.2) / 0.2); c.fillText(P.byline, colX(0), P.leadY0 - 24); c.globalAlpha = 1;
    const dcA = rangeT(t, lt, lt + 0.2);
    if (dcA > 0) { c.globalAlpha = dcA; c.font = font('head', 76); c.fillText(P.drop, colX(0) - 2, P.leadY0 + 40); c.globalAlpha = 1; }
    drawLines(c, P.lead[0], font('body', 15.5), t, lt, 0.05);
    drawLines(c, P.lead[1], font('body', 15.5), t, lt + 0.4, 0.05);
  }
  // column rules
  const lrT = P.rulesT + 0.5;
  growV(c, colX(1) - GUT / 2, std(S) ? -322 : -270, 128, t, lrT + 0.1, 0.9);
  growV(c, -208, std(S) ? -322 : -270, 128, t, lrT + 0.1, 0.9);
  // photo
  const ph = P.photo;
  c.save(); c.translate(ph.x, ph.y);
  const dv = P.dev(t), mo = P.morph(t);
  if (dv > 0) {
    // wet gloss under the dots
    const fa = rangeT(t, T.p1Photo - 0.1, 99);
    hairline(c, 0, 0, ph.w, 0, 1.5, 1); hairline(c, 0, ph.h, ph.w, ph.h, 1.5, 1); hairline(c, 0, 0, 0, ph.h, 1.5, 1); hairline(c, ph.w, 0, ph.w, ph.h, 1.5, 1);
    c.save(); c.beginPath(); c.rect(2, 2, ph.w - 4, ph.h - 4); c.clip();
    c.translate(0.9, 0.7); drawScreen(c, P.screen, dv, mo, 'rgba(30,60,90,.2)'); c.translate(-0.9, -0.7);   // misregistered blue-black plate
    drawScreen(c, P.screen, dv, mo, INK);
    c.restore();
  }
  c.restore();
  // captions
  for (const cp of P.caps) if (t >= cp.t0 && t < cp.t1) drawLines(c, cp.lines, font('bodyI', 14.5), t, cp.t0, 0.07);
  // lower region
  const lw = P.lowerT;
  if (t > lw - 0.3) {
    growRule(c, -640, 640, 196, t, lw - 0.3, 0.5, 3); growRule(c, -640, 640, 202, t, lw - 0.2, 0.5, 0.9);
    for (let i = 1; i < 6; i++) growV(c, colX(i) - GUT / 2, 210, 930, t, lw + i * 0.05, 1.1);
    for (const h of P.lowerHeads) {
      const a = rangeT(t, lw, lw + 0.3); c.save(); c.globalAlpha = a; c.translate(h.x, h.y); c.scale(0.82, 1); c.font = font('sub', h.size); c.fillStyle = INK; c.fillText(h.text, 0, 0); c.restore();
    }
    P.lower.forEach((col, i) => drawLines(c, col, font('body', 15.5), t, lw + 0.2 + (i % 2) * 0.2, 0.025));
    // tides box
    const tb = P.tides, ta = rangeT(t, lw, lw + 0.4);
    if (ta > 0) {
      c.save(); c.globalAlpha = ta; c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(tb.x, tb.y, tb.w, tb.h); c.lineWidth = 0.7; c.strokeRect(tb.x + 4, tb.y + 4, tb.w - 8, tb.h - 8);
      c.fillStyle = INK; c.textAlign = 'center'; c.font = font('sub', 22); c.fillText('HIGH WATER AT THE BAR', tb.x + tb.w / 2, tb.y + 34);
      c.font = font('slab', 14); c.textAlign = 'left';
      ['DAY', 'MORNING', 'EVENING'].forEach((s, i) => c.fillText(s, tb.x + 26 + i * 130, tb.y + 62));
      TIDES.forEach((r, k) => r.forEach((s, i) => c.fillText(s, tb.x + 26 + i * 130, tb.y + 88 + k * 16)));
      c.restore();
    }
    const ad = P.ad;
    if (ta > 0) {
      const A = ADS[ad.i]; c.save(); c.globalAlpha = ta; c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(ad.x, ad.y, ad.w, ad.h); c.lineWidth = 0.8; c.strokeRect(ad.x + 6, ad.y + 6, ad.w - 12, ad.h - 12);
      c.fillStyle = INK; c.textAlign = 'center';
      c.save(); c.translate(ad.x + ad.w / 2, ad.y + 78); c.scale(0.8, 1); c.font = font('head', 62); c.fillText(A[0], 0, 0); c.restore();
      c.font = font('headI', 34); c.fillText(A[1], ad.x + ad.w / 2, ad.y + 128); c.font = font('body', 18); c.fillText(A[2], ad.x + ad.w / 2, ad.y + 168); c.font = font('slab', 14); c.fillText(A[3].toUpperCase(), ad.x + ad.w / 2, ad.y + 204);
      hairline(c, ad.x + 30, ad.y + 142, ad.x + ad.w - 30, ad.y + 142, 0.8); c.restore();
    }
    c.font = font('slab', 11.5); c.fillStyle = INK; c.textAlign = 'center'; c.globalAlpha = ta; c.fillText('PRINTED AND PUBLISHED BY THE LANTERN PRESS, ROPE WALK, TALLOW BAY  ·  REGISTERED AT THE POST OFFICE AS A NEWSPAPER', 0, 940); c.globalAlpha = 1; c.textAlign = 'left';
  }
  // stamps
  if (P.extra && t >= T.p2Extra) drawStamp(c, P.extra, t - T.p2Extra, 540, -676, -5, 1, 0.9);
  if (P.stamp && t >= T.stamp) drawStamp(c, P.stamp, t - T.stamp, 335, -452, -7, 1, 1, true);
  c.restore();
}
const std = s => s !== 'p4';

function drawStamp(c, bmp, s, x, y, deg, k, a, spatter) {
  const u = clamp(s / 0.12), sc = 1 + 0.45 * (1 - eo(u)), al = Math.min(1, s / 0.04) * a;
  c.save(); c.translate(x, y); c.rotate(deg * Math.PI / 180); c.scale(sc, sc); c.globalAlpha = al * 0.93;
  c.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
  // a heavy impression: second pass slightly offset, multiplied by overlap
  c.globalAlpha = al * 0.3; c.drawImage(bmp, -bmp.width / 2 + 3, -bmp.height / 2 + 2);
  if (spatter) { const r = mulberry(77); c.globalAlpha = al * 0.8; c.fillStyle = RED; for (let i = 0; i < 70; i++) { const ang = r() * 6.28, d = bmp.width * 0.5 + r() * r() * 150, rr = 0.8 + r() * r() * 5; if (Math.abs(Math.cos(ang) * d) < bmp.width * 0.5 && Math.abs(Math.sin(ang) * d) < bmp.height * 0.5) continue; c.beginPath(); c.arc(Math.cos(ang) * d * 1.0, Math.sin(ang) * d * 0.55, rr, 0, 7); c.fill(); } }
  c.restore();
}
