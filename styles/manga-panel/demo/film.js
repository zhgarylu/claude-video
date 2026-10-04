// "The Last Pineapple Bun" (最后一个菠萝包): demo film for the Manga Panel style.
// Timeline, page layout, camera, reveal and impact frames. Pure function of t: window.render(t).
(function (G) {
const M = G.MG, C = G.CH;
const { TAU, INK, PAPER, clamp, lerp, ss, seg, pen, shape, tone, pathPoly, ellipsePts, gradLin, gradRad, focusLines, speedLines, sfx, VIEW } = M;
const W = 1920, H = 1080, DUR = 55.2;
const SPOT = '#f2891d'; // the one spot colour, title page only
G.TXT = {
  title: '最后一个菠萝包', ep: '第一话',
  nar1: '打烊前\n两分钟。', shock: '糟了！', run1: '再不跑\n就没了！',
  sfx_dash: '嗖', sfx_run: '哒哒哒哒',
  nar2: '最后\n一个。', man: '那个包\n是我的！', girl1: '我先！', man1: '我先！', sfx_pa: '啪！',
  baker: '一人\n一半？', ok: '……好。', bell: '叮铃', end: '（完）'
};
window.FONT_PROBE = Object.values(G.TXT).join('') + '0123456789:';

// ---------- page layout (right page = page 1, left page = page 2; world units, y down) ----------
const R = (x, y) => [x, y];
const PANELS = [
  { id: 'A', t: 7.2, poly: [R(36, -462), R(671, -462), R(671, -222), R(36, -240)] },
  { id: 'B', t: 12.0, poly: [R(345, -217), R(671, -208), R(671, 40), R(325, 40)] },
  { id: 'C', t: 15.6, poly: [R(36, -226), R(331, -217), R(311, 40), R(36, 40)] },
  { id: 'D', t: 18.0, poly: [R(0, 54), R(707, 54), R(707, 500), R(0, 500)] },
  { id: 'E', t: 23.4, poly: [R(-380, -462), R(-36, -462), R(-36, -100), R(-394, -120)] },
  { id: 'F', t: 27.0, poly: [R(-671, -462), R(-394, -462), R(-408, -120), R(-671, -132)] },
  { id: 'G', t: 30.6, poly: [R(-671, -118), R(-36, -86), R(-36, 210), R(-671, 170)] },
  { id: 'H', t: 36.6, poly: [R(-707, 184), R(-36, 224), R(-36, 500), R(-707, 500)] },
];
const HIT = 33.6; // impact frame
const TURN = [6.0, 6.6];
const BELL = 43.2;

// ---------- camera ----------
const K = (t, x, y, z) => ({ t, x, y, z });
const KEYS = [
  K(0, 20, 0, 0.96), K(6.0, -10, 0, 1.06),
  K(6.6, 0, 0, 1.0), K(7.4, 0, 0, 1.0),
  K(8.6, 353, -345, 2.85), K(11.4, 353, -345, 2.85),
  K(12.7, 508, -118, 2.8), K(15.0, 508, -118, 2.8),
  K(16.4, 335, -92, 2.2), K(17.4, 335, -92, 2.2),
  K(18.8, 353, 272, 1.9), K(22.2, 353, 272, 2.0),
  K(24.0, -212, -284, 2.9), K(26.4, -212, -284, 2.9),
  K(27.6, -425, -285, 2.3), K(30.0, -425, -285, 2.3),
  K(31.2, -353, 45, 2.4), K(HIT - 0.001, -353, 45, 2.45), K(HIT, -353, 49, 2.7), K(HIT + 2.4, -353, 49, 2.5),
  K(37.2, -372, 300, 2.5), K(43.8, -372, 300, 2.55),
  K(47.4, 0, 0, 1.0), K(DUR, 0, 0, 1.0),
];
function cam(t) {
  let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1].t) i++;
  const a = KEYS[i], b = KEYS[i + 1], u = ss(seg(t, a.t, b.t));
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)) };
}

// ---------- sheets ----------
const SPREAD = [-707, -500, 707, 500];
function drawDesk(ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#1b1a1f'; ctx.fillRect(0, 0, W, H); }
function drawPaper(ctx) {
  ctx.fillStyle = PAPER; ctx.fillRect(-707, -500, 1414, 1000);
}
function spineShade(ctx, split) {
  // gutter shadow where the book bends: a dot gradient, as printed
  tone(ctx, [[-62, -500], [62, -500], [62, 500], [-62, 500]], { k: 'dot', pitch: 5.5, ang: 45, f: (x) => 0.5 * Math.pow(Math.max(0, 1 - Math.abs(x) / 58), 1.5) });
}
function pageFrame(ctx) {
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.strokeRect(-707, -500, 1414, 1000);
}
function pageNumbers(ctx) {
  ctx.save(); ctx.fillStyle = INK; ctx.font = '700 16px "Noto Sans SC"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [n, x] of [['1', 680], ['2', -680]]) { ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(x, 478, 13, 0, TAU); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke(); ctx.fillStyle = INK; ctx.fillText(n, x, 479); } ctx.restore();
}

function titleSheet(ctx, t) {
  drawPaper(ctx); ctx.save(); ctx.beginPath(); ctx.rect(-707, -500, 1414, 1000); ctx.clip();
  const bx = 150, by = -30, br = 330, pop = ss(seg(t, 0.1, 0.6));
  // black focus lines from the bun
  focusLines(ctx, bx, by, br * 0.9, 1300, 150, 77, 1.1, false);
  // the giant bun is the title page's sun: spot colour flat fill, black dot overprint, crust lattice in paper white
  const disc = ellipsePts(bx, by, br * (0.7 + 0.3 * pop), br * (0.7 + 0.3 * pop) * 0.94, 0, 72);
  ctx.fillStyle = SPOT; pathPoly(ctx, disc); ctx.fill();
  ctx.save(); pathPoly(ctx, disc); ctx.clip();
  for (let i = -16; i <= 16; i++) {
    pen(ctx, [[bx + i * 44 - 260, by - 400], [bx + i * 44 + 260, by + 400]], { w: 4, color: PAPER, tin: 0, tout: 0, vary: 0, wob: 0.12 });
    pen(ctx, [[bx + i * 44 + 260, by - 400], [bx + i * 44 - 260, by + 400]], { w: 4, color: PAPER, tin: 0, tout: 0, vary: 0, wob: 0.12 });
  }
  tone(ctx, disc, { k: 'dot', pitch: 6.2, ang: 45, f: gradRad(bx - 200, by - 230, 260, 640, 0.0, 0.62, true) });
  pen(ctx, [[bx - 250, by - 160], [bx - 160, by - 250], [bx - 40, by - 300]], { w: 26, color: PAPER, tin: 0.2, tout: 0.4, vary: 0 });
  ctx.restore();
  pen(ctx, disc, { w: 7, closed: true, sharp: true, step: 99, vary: 0.8 });
  // the runner, large, heading for the bun, with streaks behind
  speedLines(ctx, [-707, -120, -250, 420], 0, 40, 12, [140, 420], [1.6, 5], false, [-400, 130, 150, 230], t * 60);
  ctx.fillStyle = PAPER; pathPoly(ctx, M.burstPts(-390, 130, 170, 240, 16, 9, 0.1)); ctx.fill();
  C.runner(ctx, { x: -392, y: 120, s: 2.4, ph: t * 2.0 + 0.2, lean: 0.34, dir: 1, face: { eye: 0.9, mouth: 'shout', brow: -0.8, sweat: [[-72, -22, 10, -0.4]] } });
  ctx.restore();
  // title: vertical, heavy, with a paper rim so it sits on top of the lines and the disc
  const tp = ss(seg(t, 0.5, 1.0));
  if (tp > 0) {
    ctx.save(); ctx.globalAlpha = 1;
    const dy = (1 - tp) * -40; if (tp >= 1 && G.__rec && t < TURN[0]) G.__rec.push({ id: 'title', text: G.TXT.title, x0: 484, y0: -440, x1: 596, y1: 400 });
    sfx(ctx, G.TXT.title, 540, -30 + dy, 112, { vertical: true, sp: 0.98, rim: 0.1, skew: -0.08, ang: 0, seed: 3, fan: 0, font: M.FONT_HEAVY });
    ctx.restore();
    ctx.fillStyle = INK; ctx.font = '700 26px "Noto Sans SC"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const ep = [...G.TXT.ep]; ep.forEach((ch, i) => { ctx.fillStyle = PAPER; ctx.fillRect(626 - 18, -330 + i * 30 - 14, 36, 28); ctx.fillStyle = INK; ctx.fillText(ch, 626, -330 + i * 30); });
  }
  // time stamp
  ctx.fillStyle = INK; ctx.fillRect(-640, 420, 130, 44); ctx.fillStyle = PAPER; ctx.font = '700 30px "Noto Sans SC"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('17:58', -575, 442);
  pageFrame(ctx);
}

function pageSheet(ctx, t, tc) {
  drawPaper(ctx);
  ctx.save(); ctx.beginPath(); ctx.rect(-707, -500, 1414, 1000); ctx.clip();
  for (const p of PANELS) {
    if (t < p.t) continue;
    const b = M.bounds(p.poly), k = t - p.t, e = ss(seg(k, 0, 0.3));
    const P = { b, tc, k, t0: p.t, hit: HIT - p.t, poly: p.poly };
    ctx.save();
    // reveal: a slash sweeps along reading direction (right to left), slanted
    if (e < 1) { const xc = lerp(b[2] + 60, b[0] - 60, e); pathPoly(ctx, [[xc, b[1] - 40], [b[2] + 80, b[1] - 40], [b[2] + 80, b[3] + 40], [xc - 40, b[3] + 40]]); ctx.clip(); }
    pathPoly(ctx, p.poly); ctx.clip(); ctx.fillStyle = PAPER; ctx.fillRect(b[0] - 5, b[1] - 5, b[2] - b[0] + 10, b[3] - b[1] + 10);
    G.ART[p.id].art(ctx, P);
    ctx.restore();
    ctx.save(); if (e < 1) { const xc = lerp(b[2] + 60, b[0] - 60, e); pathPoly(ctx, [[xc, b[1] - 40], [b[2] + 80, b[1] - 40], [b[2] + 80, b[3] + 40], [xc - 40, b[3] + 40]]); ctx.clip(); }
    M.ruler(ctx, p.poly, 3.4, true); ctx.restore();
  }
  // lettering layer: unclipped, after every border, so balloons and sounds may cross panel edges
  for (const p of PANELS) {
    if (t < p.t + 0.34) continue;
    const b = M.bounds(p.poly), k = t - p.t, P = { b, tc, k, t0: p.t, hit: HIT - p.t, poly: p.poly };
    const pop = ss(seg(k, 0.34, 0.5)), sc = lerp(1.14, 1, pop), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    G.ART[p.id].over(ctx, P); ctx.restore();
  }
  spineShade(ctx); pageNumbers(ctx);
  ctx.restore(); pageFrame(ctx);
  // end mark and bell
  if (t > 43.2) { const u = ss(seg(t, 43.2, 43.6)); ctx.save(); ctx.globalAlpha = 1; if (u > 0) sfx(ctx, G.TXT.bell, -150, 175, 54, { style: 'hollow', ang: -6, seed: 5, skew: -0.2 }); ctx.restore(); }
}

// ---------- the frame ----------
function render(t) {
  const cv = document.getElementById('c'), ctx = cv.getContext('2d');
  const tc = Math.floor(t * 12 + 1e-6) / 12; // content animates on twos; camera stays smooth
  drawDesk(ctx);
  let c = cam(t); const qo = new URLSearchParams(location.search).get('cam'); if (qo) { const a = qo.split(',').map(Number); c = { x: a[0], y: a[1], z: a[2] }; }
  let sx = 0, sy = 0;
  if (t >= HIT && t < HIT + 0.7) { const d = Math.pow(1 - (t - HIT) / 0.7, 2) * 16, q = Math.floor((t - HIT) * 24); sx = Math.sin(q * 5.1) * d; sy = Math.cos(q * 3.7) * d; }
  const z = c.z; ctx.setTransform(z, 0, 0, z, W / 2 - c.x * z + sx, H / 2 - c.y * z + sy); G.__cam = { z, tx: W / 2 - c.x * z + sx, ty: H / 2 - c.y * z + sy };
  VIEW.x0 = c.x - W / 2 / z - 8 - sx / z; VIEW.x1 = c.x + W / 2 / z + 8 - sx / z; VIEW.y0 = c.y - H / 2 / z - 8 - sy / z; VIEW.y1 = c.y + H / 2 / z + 8 - sy / z; VIEW.z = z;
  if (t < TURN[1]) {
    if (t < TURN[0]) titleSheet(ctx, t);
    else { // page turn: the title sheet is peeled off from the right by a fold that runs to the left
      const u = ss(seg(t, TURN[0], TURN[1])), fx = lerp(707, -707, u);
      titleSheet(ctx, t); ctx.save(); ctx.beginPath(); ctx.rect(fx, -520, 1500, 1040); ctx.clip();
      ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(-720, -520, fx + 720, 1040); ctx.clip(); pageSheet(ctx, 0, 0); ctx.restore();
      // fold shadow: dots fade out to the left of the fold line
      tone(ctx, [[fx - 90, -500], [fx, -500], [fx, 500], [fx - 90, 500]], { k: 'dot', pitch: 5.5, ang: 45, f: (x) => 0.7 * Math.pow(clamp((x - (fx - 90)) / 90, 0, 1), 1.6) });
      pen(ctx, [[fx, -500], [fx, 500]], { w: 3, tin: 0, tout: 0, vary: 0 });
    }
  } else pageSheet(ctx, t, tc);
  // impact frames: a black burst page with a white lettered hit, then one negative frame, then the page again
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const hf = t - HIT;
  if (hf >= 0 && hf < 0.085) {
    ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
    focusLines(ctx, W / 2 + 20, H / 2 + 10, 190, 1500, 130, 91, 0.5, true);
    ctx.fillStyle = INK; pathPoly(ctx, ellipsePts(W / 2 + 20, H / 2 + 10, 360, 250, 0, 36)); ctx.fill();
    sfx(ctx, G.TXT.sfx_pa, W / 2 + 20, H / 2 + 10, 400, { inv: true, ang: -5, skew: -0.2, rim: 0.02, sp: 0.62, seed: 31, font: M.FONT_HEAVY });
  } else if (hf >= 0.085 && hf < 0.126) {
    ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
  }
}
// ---------- events for the mixer and the checks ----------
const EV = [{ t: 0, type: 'meta', bpm: 100 }, { t: TURN[0], type: 'fold', d: TURN[1] - TURN[0] }];
for (const p of PANELS) { EV.push({ t: p.t, type: 'reveal', id: p.id }); EV.push({ t: p.t + 0.34, type: 'pop', id: p.id }); }
EV.push({ t: 15.6 + 0.34, type: 'word', text: G.TXT.sfx_dash }, { t: 18.0 + 0.34, type: 'word', text: G.TXT.sfx_run }, { t: HIT, type: 'hit' }, { t: HIT - 0.3, type: 'quiet', d: 0.3 }, { t: BELL, type: 'bell' });
EV.push({ t: 8.6, type: 'move', d: 1.2 }, { t: 12.7, type: 'move', d: 1.0 }, { t: 18.8, type: 'move', d: 1.2 }, { t: 24.0, type: 'move', d: 1.4 }, { t: 31.2, type: 'move', d: 1.2 }, { t: 37.2, type: 'move', d: 1.2 }, { t: 44.0, type: 'move', d: 3.0 });
for (let t = 0.6; t < 5.8; t += 0.25) EV.push({ t, type: 'step', v: 0.5 });
for (let t = 16.3; t < 22.0; t += 0.25) EV.push({ t, type: 'step', v: t > 18.4 ? 1 : 0.6 });
for (const [a, b] of [[0.8, 5.6], [18.2, 22.0]]) for (let t = a; t < b; t += 0.6) EV.push({ t, type: 'swish' });
window.EV = EV.sort((a, b) => a.t - b.t);
window.TEXTS = (t) => { G.__rec = []; render(t); const r = G.__rec; G.__rec = null; const c = G.__cam; return r.map(b => ({ id: b.id, text: b.text, x0: b.x0 * c.z + c.tx, y0: b.y0 * c.z + c.ty, x1: b.x1 * c.z + c.tx, y1: b.y1 * c.z + c.ty })); };
G.DUR = DUR; window.DUR = DUR; window.render = render; window.PANELS = PANELS; window.HITT = HIT;
})(window);
