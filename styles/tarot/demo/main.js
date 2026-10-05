// "Three Cards for a Yes": one table, one deck, one camera. t = film seconds (timeline.js).
import { track, clamp, lerp, ss, eio, eo, ei, seg, hash, TAU } from '/core/lib.js';
import { T, VO, EV, DUR, riffT } from './timeline.js';
import { buildDeck, loadFonts, DECK, CW, CH, PAL, tstroke, poly, line, disc, ring, star4, arcPts } from './cards.js';

const W = 1920, H = 1080, PI = Math.PI;
const out = document.getElementById('c').getContext('2d');
const { ink, paper, red } = PAL;
let D = null;          // the deck canvases
let SHADOW = null, SEAL = null, WEAVE = null;
let SUBS = [];

// ---------------------------------------------------------------- world layout
const DECKP = { x: -1000, y: 0 };
const SLOT = [{ x: -520, y: 0, rot: -0.025, id: 'lantern' }, { x: 0, y: 0, rot: 0.015, id: 'key' }, { x: 520, y: 0, rot: PI + 0.02, id: 'tide' }];
const PILE = [{ x: 3, y: 36, rot: -0.05 }, { x: 0, y: 40, rot: 0.03 }, { x: 5, y: 33, rot: PI + 0.06 }];   // A, B, C
const PILE_T = [T.pile[1], T.pile[0], T.pile[2]];                                                          // A lands second, B first
const off = k => [k * 0.85, -k * 1.2];
const jit = k => [(hash(k * 3.1) - .5) * 4, (hash(k * 5.9) - .5) * 4, (hash(k * 7.7) - .5) * 0.03];
const dealtCount = t => T.deal.filter(d => t >= d).length;
const deckX = t => DECKP.x - 1500 * ei(seg(t, 12.3, 12.75));

// ---------------------------------------------------------------- camera
const CAM = track([
  [0, [-988, -16, 4.6, 0]], [3.6, [-990, -10, 1.0, 0]], [5.3, [-1000, 0, 1.02, 0]], [7.4, [-1000, 0, 1.14, 0]], [8.3, [-1000, 0, 1.12, 0]],
  [8.95, [-1000, -60, 0.8, 0]], [10.0, [-1000, -60, 0.8, 0]], [11.1, [-780, 0, 0.78, 0]], [12.7, [-60, 0, 0.64, 0]], [13.1, [0, 0, 0.62, 0]],
  [14.4, [-520, -4, 1.1, 0]], [22.3, [-520, 0, 1.15, 0]], [23.9, [0, 0, 1.06, 0]], [25.3, [0, 0, 1.1, 0]], [32.8, [0, 0, 1.15, 0]],
  [34.6, [520, 0, 1.0, 0]], [37.3, [520, 0, 1.07, 0]], [38.6, [520, -4, 1.1, 0]], [40.1, [520, 0, 1.12, PI]], [40.6, [520, 0, 1.12, PI]],
  [42.2, [0, 314, 0.73, 2 * PI]], [50.0, [0, 308, 0.75, 2 * PI]], [51.5, [0, 308, 0.75, 2 * PI]], [53.3, [0, 40, 1.05, 2 * PI]],
  [56.0, [0, 20, 2.2, 2 * PI]], [58.0, [0, 20, 2.6, 2 * PI]],
]);
const camAt = t => { const [x, y, s, rot] = CAM(clamp(t, 0, DUR)); return { x, y, s, rot }; };
const toScreen = (t, wx, wy) => { const c = camAt(t), dx = wx - c.x, dy = wy - c.y, co = Math.cos(c.rot), si = Math.sin(c.rot); return [W / 2 + (dx * co - dy * si) * c.s, H / 2 + (dx * si + dy * co) * c.s]; };

// ---------------------------------------------------------------- cloth
function weaveTile() {
  const k = document.createElement('canvas'); k.width = k.height = 32; const g = k.getContext('2d');
  g.fillStyle = '#1d3b37'; g.fillRect(0, 0, 32, 32);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.10)'; g.fillRect(i * 4, 0, 2.6, 32); g.fillStyle = i % 2 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.03)'; g.fillRect(0, i * 4, 32, 2.6); }
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${.02 + hash(i * 2.3) * .04})`; g.fillRect(hash(i * 1.7) * 32, hash(i * 4.1) * 32, 1.5, 1.5); }
  return k;
}
function drawCloth(c, cam) {
  c.fillStyle = WEAVE.pat; c.fillRect(cam.x - 3200, cam.y - 3200, 6400, 6400);
  // damask: a lattice of lozenges and small rosettes, tone on tone
  c.strokeStyle = 'rgba(160,210,190,.075)'; c.lineWidth = 3; const g = 300;
  for (let i = -9; i <= 9; i++) for (let j = -6; j <= 6; j++) {
    const x = i * g, y = j * g;
    c.beginPath(); c.moveTo(x, y - 110); c.lineTo(x + 110, y); c.lineTo(x, y + 110); c.lineTo(x - 110, y); c.closePath(); c.stroke();
    c.beginPath(); c.arc(x + g / 2, y + g / 2, 34, 0, TAU); c.stroke();
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; c.beginPath(); c.moveTo(x + g / 2 + Math.cos(a) * 34, y + g / 2 + Math.sin(a) * 34); c.lineTo(x + g / 2 + Math.cos(a) * 62, y + g / 2 + Math.sin(a) * 62); c.stroke(); }
  }
}

// ---------------------------------------------------------------- one card, with the flip done as a perspective strip
function shadowSprite() {
  const k = document.createElement('canvas'); k.width = CW + 160; k.height = CH + 160; const g = k.getContext('2d');
  g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 34; g.shadowOffsetX = 4000; g.fillStyle = '#000';
  g.beginPath(); g.roundRect(80 - 4000, 80, CW, CH, 24); g.fill(); return k;
}
function drawCard(c, id, o, cam) {
  // o: x, y, rot, th (0 back .. PI face), lift
  const th = o.th ?? 0, lift = o.lift ?? 1, co = Math.cos(th), si = Math.sin(th);
  c.save(); c.translate(o.x, o.y);
  // soft shadow on the cloth: falls to the lower right in the world, squeezed while the card stands on edge
  const raise = (lift - 1) * 5 + Math.abs(si) * 0.5;
  c.save(); c.translate(10 + raise * 22, 16 + raise * 34); c.rotate(o.rot || 0); c.scale(lift * Math.max(Math.abs(co), 0.1), lift); c.globalAlpha = (o.shadow ?? 1) * (0.55 - raise * .12); c.drawImage(SHADOW, -(CW + 160) / 2, -(CH + 160) / 2); c.restore();
  c.rotate(o.rot || 0); c.scale(lift, lift);
  const face = th > PI / 2, big = (cam?.s ?? 1) * lift > 1.7;
  const img = face ? D.faces[id] : (big ? D.back : D.backS);
  if (Math.abs(si) < 0.004) { c.drawImage(img, -CW / 2, -CH / 2, CW, CH); c.restore(); return; }
  const N = 64, Dp = 1700, iw = img.width, ih = img.height;
  for (let i = 0; i < N; i++) {
    const v0 = i / N, v1 = (i + 1) / N, s = face ? -1 : 1;
    const xl0 = s * (v0 - .5) * CW, xl1 = s * (v1 - .5) * CW;
    const f0 = Dp / (Dp - xl0 * si), f1 = Dp / (Dp - xl1 * si), x0 = xl0 * co * f0, x1 = xl1 * co * f1, fm = (f0 + f1) / 2;
    const xa = Math.min(x0, x1), wd = Math.abs(x1 - x0) + 0.7;
    c.drawImage(img, v0 * iw, 0, (v1 - v0) * iw + 1, ih, xa, -CH * fm / 2, wd, CH * fm);
    const a = (1 - Math.abs(co)) * (0.22 + 0.3 * clamp(-(xl0 + xl1) / 2 * si / (CW / 2), -1, 1));
    if (a > 0.004) { c.fillStyle = `rgba(8,14,18,${clamp(a, 0, .6)})`; c.fillRect(xa, -CH * fm / 2, wd, CH * fm); }
  }
  c.restore();
}

// ---------------------------------------------------------------- the deck on the table
const fl = (t, a, d) => clamp((t - a) / d);
const flick = (t, k) => { const u = clamp((t - 0.15 - (23 - k) * 0.05) / 0.5); return Math.sin(PI * u) ** 1.5 * (1 + (k - 20) * .3); };
function drawLite(c, x, y, rot, lift, shadow) {
  if (shadow) { c.save(); c.translate(x + 10, y + 16); c.rotate(rot); c.scale(lift, lift); c.globalAlpha = .5; c.drawImage(SHADOW, -(CW + 160) / 2, -(CH + 160) / 2); c.restore(); }
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(lift, lift); c.beginPath(); c.roundRect(-CW / 2, -CH / 2, CW, CH, 22); c.fillStyle = '#e4d6b6'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = 'rgba(60,44,28,.75)'; c.stroke(); c.restore();
}
function drawBackAt(c, k, x, y, rot, lift, cam, jj, lite) {
  const j = jj || jit(k), [ox, oy] = off(k);
  if (lite) { drawLite(c, x + ox + j[0], y + oy + j[1], rot + j[2], lift, k === 0); return; } drawCard(c, null, { x: x + ox + j[0], y: y + oy + j[1], rot: rot + j[2], th: 0, lift }, cam); }

function drawDeck(c, t, cam) {
  const px = deckX(t), py = DECKP.y;
  if (t >= T.deal[0]) {                                  // dealing: the stack shrinks, the cards fly
    const n = 24 - dealtCount(t); for (let k = 0; k < n; k++) drawBackAt(c, k, px, py, 0, 1, cam, null, k < n - 3);
    return;
  }
  if (t >= T.cutBack) {                                  // fan
    const fanOpen = ss(fl(t, T.fan0, 0.6)) * (1 - ss(fl(t, T.collapse0, T.collapseEnd - T.collapse0)));
    const nS = fanOpen > 0.001 ? 16 : 24; for (let k = 0; k < nS; k++) drawBackAt(c, k, px, py, 0, 1, cam, null, k < nS - 3);
    if (fanOpen > 0.001) {
      const P = { x: px, y: py + 330 };
      for (let j = 0; j < 8; j++) {
        const k = 16 + j, jj = jit(k), [ox, oy] = off(k), cx0 = px + ox + jj[0], cy0 = py + oy + jj[1], phi = (j - 3.5) * 0.17 * fanOpen;
        const dx = cx0 - P.x, dy = cy0 - P.y, co = Math.cos(phi), si = Math.sin(phi);
        const fin = clamp((t - (T.fanFlip0 + j * T.fanFlipStep)) / 0.5), fout = clamp((t - (T.collapse0 + (7 - j) * 0.03)) / 0.4);
        const th = PI * (ss(fin) * (1 - ss(fout)));
        drawCard(c, DECK[j].id, { x: P.x + dx * co - dy * si, y: P.y + dx * si + dy * co, rot: phi + jj[2], th, lift: 1 + 0.04 * Math.sin(PI * ss(fin)) * (1 - fout) }, cam);
      }
    }
    return;
  }
  {                                                      // split, riffle
    const sp = ss(fl(t, T.riff0 - 0.6, 0.55));
    const anc = [{ x: px - 200 * sp, y: py + 8 * sp, rot: -0.12 * sp, base: 0 }, { x: px + 200 * sp, y: py - 8 * sp, rot: 0.12 * sp, base: 12 * (1 - sp) }];
    const left = [[], []];
    for (let i = 0; i < 24; i++) left[i % 2].push(i);
    const LAND = 0.17;
    for (let h = 0; h < 2; h++) {                         // what is left in each half
      const rest = left[h].filter(i => riffT(i) > t);
      rest.forEach((i, r) => {
        const A = anc[h], k = r + A.base, j = jit(k), [ox, oy] = off(k), fk = k >= 20 ? flick(t, k) : 0;   // the opening: a thumb riffles the corner
        if (r < rest.length - 3 && !fk) drawLite(c, A.x + ox + j[0], A.y + oy + j[1], A.rot + j[2], 1, k === 0 || k === 12 && A.base === 12); else drawCard(c, null, { x: A.x + ox + j[0] + fk * 26, y: A.y + oy + j[1] - fk * 10, rot: A.rot + j[2] - fk * 0.06, th: 0, lift: 1 + fk * 0.03 }, cam);
      });
    }
    let lastLanded = -1; for (let i = 0; i < 24; i++) if (t >= riffT(i) + LAND) lastLanded = i;
    for (let i = 0; i < 24; i++) {                        // landed
      const tf = riffT(i); if (t >= tf + LAND) drawBackAt(c, i, px, py, 0, 1, cam, null, i < lastLanded - 3);
    }
    for (let i = 0; i < 24; i++) {                        // in flight
      const tf = riffT(i); if (t < tf || t >= tf + LAND) continue;
      const h = i % 2, A = anc[h], u = (t - tf) / LAND, rest = left[h].filter(q => riffT(q) >= tf), r = rest.length - 1;
      const j0 = jit(r + A.base), [ox, oy] = off(r + A.base), j1 = jit(i), [ex, ey] = off(i);
      const sx = A.x + ox + j0[0], sy = A.y + oy + j0[1], tx = px + ex + j1[0], ty = py + ey + j1[1], e = eo(u);
      drawCard(c, null, { x: lerp(sx, tx, e), y: lerp(sy, ty, e) - Math.sin(PI * u) * 46, rot: lerp(A.rot + j0[2], j1[2], e), th: 0, lift: 1 + .06 * Math.sin(PI * u) }, cam);
    }
    return;
  }
}

// the cut: the top twelve slide aside, the bottom twelve land on them, the whole deck returns
function drawDeckCut(c, t, cam) {
  const px = DECKP.x, py = DECKP.y;
  const sT = ss(fl(t, T.cut0, T.cutSlide - T.cut0)), sB = ss(fl(t, T.cutSlide, T.cutOnto - T.cutSlide)), sR = ss(fl(t, T.cutOnto, T.cutBack - T.cutOnto));
  const mix = (a, b, w) => a.map((v, q) => lerp(v, b[q], w));
  const gT = () => { for (let i = 0; i < 12; i++) drawBackAt(c, 12 + i - 12 * sT, px + 450 * sT * (1 - sR), py - 30 * sT * (1 - sR), 0, 1 + .03 * Math.sin(PI * sT), cam, mix(jit(12 + i), jit(i), sT), i < 9); };
  const gB = () => { for (let i = 0; i < 12; i++) drawBackAt(c, i + 12 * sB, px + 450 * sB * (1 - sR), py - 30 * sB * (1 - sR), 0, 1 + .03 * Math.sin(PI * sB), cam, mix(jit(i), jit(12 + i), sB), i < 9); };
  if (sB > 0) { gT(); gB(); } else { gB(); gT(); }
}

// ---------------------------------------------------------------- the three cards
function slotCard(k, t) {
  const S = SLOT[k], t0 = T.deal[k], tl = t0 + T.dealDur;
  if (t < t0) return null;
  const o = { x: S.x, y: S.y, rot: S.rot, th: 0, lift: 1, id: S.id };
  if (t < tl) {
    const u = (t - t0) / T.dealDur, e = eo(u), n = 23 - k, j = jit(n), [ox, oy] = off(n);
    const sx = DECKP.x + ox + j[0], sy = DECKP.y + oy + j[1];
    o.x = lerp(sx, S.x, e); o.y = lerp(sy, S.y, e) - Math.sin(PI * u) * 70; o.rot = lerp(j[2], S.rot, e); o.lift = 1 + .1 * Math.sin(PI * u);
    return o;
  }
  o.lift = 1 + 0.045 * Math.exp(-(t - tl) * 12) * Math.cos((t - tl) * 26);
  const uf = clamp((t - T.flip[k]) / T.flipDur);
  o.th = PI * eio(uf); o.lift += 0.2 * Math.sin(PI * uf) ** 1.2;
  o.rot = S.rot + 0.03 * Math.sin(PI * uf) * (k === 1 ? -1 : 1);
  // the pile
  const pt = PILE_T[k], up = clamp((t - pt) / T.pileDur);
  if (up > 0) {
    const e = eio(up), P = PILE[k];
    o.x = lerp(S.x, P.x, e); o.y = lerp(S.y, P.y, e) - Math.sin(PI * up) * 40; o.rot = lerp(S.rot, P.rot, e); o.lift = 1 + .08 * Math.sin(PI * up) + 0.04 * Math.exp(-(t - pt - T.pileDur) * 14) * (t > pt + T.pileDur ? 1 : 0);
    if (k === 2) { const uf2 = clamp((t - T.topFlip) / T.topFlipDur); o.th = PI * (1 - eio(uf2)); o.lift += .16 * Math.sin(PI * uf2); }
  }
  return o;
}

// ---------------------------------------------------------------- the diagram (ASK / COST / TIME, rule, seal)
const LAB = [['ASK', 'in one sentence'], ['COST', 'in hours, not feelings'], ['TIME', 'in a year']];
function growLine(c, a, b, f, w, col) { if (f <= 0) return; c.fillStyle = col; tstroke(c, [a, [lerp(a[0], b[0], f), lerp(a[1], b[1], f)]], w, { taper: .08, seed: 5 }); }
function labelState(t, i) { return clamp((t - T.label[i]) / 0.22); }
function drawDiagram(c, t) {
  if (t < T.label[0] - 0.3) return;
  const fadeA = 1 - ss(seg(t, 50.9, 51.4)), fade = 1 - ss(seg(t, 51.6, 51.9)); if (fade <= 0) return; c.save(); c.globalAlpha = fadeA;
  const cream = paper;
  SLOT.forEach((S, i) => {
    const f = labelState(t, i); if (f <= 0) return;
    const e = eo(f);
    c.save(); c.globalAlpha = e * fadeA;
    growLine(c, [S.x, 372], [S.x, 404], clamp(f * 2), 5, cream); disc(c, S.x, 410, 7 * e, cream);
    c.translate(S.x, 0); c.scale(1.25 - .25 * e, 1.25 - .25 * e);
    c.fillStyle = cream; c.textAlign = 'center'; c.font = '400 84px "IM Fell English"'; c.letterSpacing = '12px'; c.fillText(LAB[i][0], 6, 482);
    c.letterSpacing = '0px'; c.font = 'italic 400 46px "IM Fell English"'; c.fillStyle = '#d9c9a6'; c.fillText(LAB[i][1], 0, 536);
    c.restore();
  });
  // the rule that joins the three, then the drop to the seal
  const f1 = seg(t, T.rule0, T.rule1), f2 = seg(t, T.rule1, T.drop1);
  growLine(c, [-520, 572], [520, 572], eo(f1), 6, red);
  if (f1 > 0) SLOT.forEach(S => { if (f1 * 1040 >= S.x + 520 - 0.01) { c.fillStyle = red; tstroke(c, [[S.x, 554], [S.x, 590]], 6, { taper: 0, seed: 3 }); } });
  growLine(c, [0, 572], [0, 596], eo(f2), 6, red);
  c.restore();
  // the seal
  const ts = t - T.seal; if (ts >= 0) {
    const sc = ts < 0.14 ? lerp(1.9, 0.93, ts / .14) : ts < 0.3 ? lerp(0.93, 1, (ts - .14) / .16) : 1, al = Math.min(1, ts / 0.06);
    c.save(); c.translate(0, 714); c.rotate(-0.1); c.scale(sc * .76, sc * .76); c.globalAlpha = al * fade; c.drawImage(SEAL, -SEAL.width / 2, -SEAL.height / 2); c.restore();
    // a ripple on the cloth
    if (ts < 0.7) { c.save(); c.strokeStyle = `rgba(236,223,195,${.35 * (1 - ts / .7)})`; c.lineWidth = 4; c.beginPath(); c.arc(0, 714, 125 + ts * 220, 0, TAU); c.stroke(); c.restore(); }
  }
}
function makeSeal() {
  const S = 380, k = document.createElement('canvas'); k.width = k.height = S; const g = k.getContext('2d'); g.translate(S / 2, S / 2);
  disc(g, 0, 0, 150, paper); ring(g, 0, 0, 144, 10, ink); ring(g, 0, 0, 124, 3.4, ink);
  for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; line(g, [Math.cos(a) * 150, Math.sin(a) * 150], [Math.cos(a) * 168, Math.sin(a) * 168], 8, ink, { taper: .5, seed: i }); }
  g.fillStyle = red; g.textAlign = 'center'; g.font = '400 70px "IM Fell English"'; g.letterSpacing = '6px'; g.fillText('NOT', 3, -6); g.fillText('YET', 3, 66);
  star4(g, 0, -62, 12, ink); [-1, 1].forEach(s => { line(g, [s * 40, -62], [s * 96, -62], 3, ink, { taper: .4 }); });
  // print dropouts
  g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 220; i++) { const a = hash(i * 1.3) * TAU, r = Math.sqrt(hash(i * 2.9)) * 170; g.globalAlpha = .55; g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, .8 + hash(i * 4.7) * 1.6, 0, TAU); g.fill(); }
  return k;
}

// ---------------------------------------------------------------- screen-space layers
function drawDust(c, t) {
  for (let i = 0; i < 40; i++) {
    const x = (hash(i * 1.7) * W + t * (4 + hash(i * 3.3) * 9)) % W, y = (hash(i * 2.9) * H - t * (3 + hash(i * 5.1) * 6) + H * 3) % H, r = .8 + hash(i * 7.1) * 1.8;
    c.fillStyle = `rgba(255,236,200,${.05 + hash(i * 9.3) * .12})`; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
}
function drawLight(c, t) {
  const fl = 1 + .035 * Math.sin(t * 7.3) + .02 * Math.sin(t * 13.1 + 1);
  let g = c.createRadialGradient(W / 2, H * .46, 120, W / 2, H / 2, 1250); g.addColorStop(0, `rgba(255,214,150,${.10 * fl})`); g.addColorStop(.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(2,8,8,.62)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}
const capFont = 'italic 400 42px "IM Fell English"';
function capBox(c, s) { c.font = capFont; const w = c.measureText(s.text).width + 64; return { x0: W / 2 - w / 2, x1: W / 2 + w / 2, y0: 962, y1: 1040 }; }
function drawCaption(c, t) {
  const s = SUBS.find(s => t >= s.t0 && t < s.t1); if (!s) return;
  const a = clamp((t - s.t0) / 0.16), b = capBox(c, s), lift = (1 - eo(a)) * 14;
  c.save(); c.globalAlpha = a; c.translate(0, lift);
  c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(b.x0 + 5, b.y0 + 7, b.x1 - b.x0, b.y1 - b.y0);
  c.fillStyle = paper; c.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  c.strokeStyle = ink; c.lineWidth = 4; c.strokeRect(b.x0 + 5, b.y0 + 5, b.x1 - b.x0 - 10, b.y1 - b.y0 - 10); c.lineWidth = 1.4; c.strokeRect(b.x0 + 12, b.y0 + 12, b.x1 - b.x0 - 24, b.y1 - b.y0 - 24);
  c.fillStyle = ink; c.font = capFont; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.letterSpacing = '0px'; c.fillText(s.text, W / 2, b.y0 + 51);
  c.restore();
}
const TITLE_BOX = { x0: 210, x1: 1710, y0: 395, y1: 645 };
function titleState(t) { return clamp((t - T.title) / 0.9); }
function drawTitle(c, t) {
  const u = titleState(t); if (u <= 0) return;
  const dim = .45 * ss(fl(t, T.title - .6, 1.6)); c.fillStyle = `rgba(14,16,24,${dim})`; c.fillRect(0, 0, W, H);
  const e = eio(clamp(u / 0.62)), cx = W / 2, cy = (TITLE_BOX.y0 + TITLE_BOX.y1) / 2, hw = (TITLE_BOX.x1 - TITLE_BOX.x0) / 2 * e, hh = lerp(3, 112, ss(clamp((u - 0.25) / 0.5)));
  c.save(); c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(cx - hw + 8, cy - hh + 12, hw * 2, hh * 2);
  c.fillStyle = ink; c.beginPath(); c.moveTo(cx - hw, cy - hh); c.lineTo(cx + hw, cy - hh); c.lineTo(cx + hw - 40 * e, cy); c.lineTo(cx + hw, cy + hh); c.lineTo(cx - hw, cy + hh); c.lineTo(cx - hw + 40 * e, cy); c.closePath(); c.fill();
  c.strokeStyle = paper; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - hw + 60, cy - hh + 12); c.lineTo(cx + hw - 60, cy - hh + 12); c.moveTo(cx - hw + 60, cy + hh - 12); c.lineTo(cx + hw - 60, cy + hh - 12); c.stroke();
  c.beginPath(); c.rect(cx - hw + 50, cy - hh, 2 * hw - 100, 2 * hh); c.clip();
  const ta = clamp((u - .7) / .3);
  c.globalAlpha = ta; c.fillStyle = paper; c.textAlign = 'center'; c.font = '400 84px "IM Fell English"'; c.letterSpacing = '8px'; c.fillText('THREE CARDS FOR A YES', cx + 4, cy + 10);
  c.letterSpacing = '4px'; c.font = 'italic 400 42px "IM Fell English"'; c.fillStyle = '#e08a74'; c.fillText('ask  ·  cost  ·  time', cx + 2, cy + 74);
  star4(c, cx - 360, cy + 62, 9, paper); star4(c, cx + 360, cy + 62, 9, paper);
  c.restore();
}

// ---------------------------------------------------------------- frame
function frame(t) {
  const cam = camAt(t), c = out;
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#1d3b37'; c.fillRect(0, 0, W, H);
  c.save(); c.translate(W / 2, H / 2); c.rotate(cam.rot); c.scale(cam.s, cam.s); c.translate(-cam.x, -cam.y);
  drawCloth(c, cam);
  if (t < T.cut0) drawDeck(c, t, cam);
  else if (t < T.cutBack + 0.001) drawDeckCut(c, t, cam);
  else drawDeck(c, t, cam);
  [1, 0, 2].forEach(k => { const o = slotCard(k, t); if (o) drawCard(c, o.id, o, cam); });
  drawDiagram(c, t);
  c.restore();
  drawLight(c, t); drawDust(c, t);
  drawCaption(c, t); drawTitle(c, t);
}

// ---------------------------------------------------------------- the contract
window.DUR = DUR; window.EV = EV;
window.render = t => frame(t);
window.TEXTS = t => {
  const r = [];
  const s = SUBS.find(s => t >= s.t0 && t < s.t1); if (s) { const b = capBox(out, s); r.push({ id: s.id, text: s.text, x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 }); }
  LAB.forEach((l, i) => { if (labelState(t, i) >= 1 && t < 50.9) { const [x, y] = toScreen(t, SLOT[i].x, 482), sc = camAt(t).s; r.push({ id: 'lab' + i, text: l[0] + ' ' + l[1], x0: x - 230 * sc, y0: y - 80 * sc, x1: x + 230 * sc, y1: y + 60 * sc }); } });
  if (t >= T.seal + 0.3 && t < 51.6) { const [x, y] = toScreen(t, 0, 714), sc = camAt(t).s; r.push({ id: 'seal', text: 'NOT YET', x0: x - 110 * sc, y0: y - 110 * sc, x1: x + 110 * sc, y1: y + 110 * sc }); }
  if (titleState(t) >= 1) r.push({ id: 'title', text: 'THREE CARDS FOR A YES ask cost time', ...TITLE_BOX });
  return r;
};

(async () => {
  try {
    const q = new URLSearchParams(location.search);
    if (!q.get('nosub')) { const r = await fetch('subs.json'); if (r.ok) SUBS = await r.json(); }
  } catch (e) { /* captions are optional for stills */ }
  await loadFonts(); await document.fonts.load('italic 400 42px "IM Fell English"', 'abc');
  D = buildDeck(); SHADOW = shadowSprite(); SEAL = makeSeal();
  WEAVE = { pat: out.createPattern(weaveTile(), 'repeat') };
  window.READY = true;
})();
