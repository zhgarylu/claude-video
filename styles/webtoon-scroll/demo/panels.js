// The panels of the episode. Each draw(g, c) works in panel-local coordinates (origin = the panel's top-left on the page).
import { clamp, seg, ss, eo, back, lerp, hash, spring } from '/core/lib.js';
import { C, FONT_BODY, FONT_DISPLAY, LW, rr, ol, fs, ell, cap, lerpC, mina, dewey, balloon, narration, sfxText, drop, sweat, burst, textBox } from './art.js';
import { CUE, FALL, P, camAt, enterT, rainAt } from './timeline.js';

const pop = (t, t0, d = .32) => clamp((t - t0) / d);
const vg = (g, x, y, w, h, stops) => { const gr = g.createLinearGradient(0, y, 0, y + h); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(x, y, w, h); };
// rain streaks falling down-left; `inten` thins them out
function rain(g, t, x0, y0, w, h, n, o = {}) {
  const { len = 70, speed = 1700, slant = .2, col = 'rgba(255,255,255,.6)', lw = 3, seed = 1, inten = 1 } = o, cnt = Math.floor(n * inten);
  g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath();
  for (let i = 0; i < cnt; i++) {
    const fx = hash(seed + i * 1.7), fy = hash(seed + i * 3.1 + 9), sp = speed * (.85 + hash(i + seed) * .3), yy = ((fy * (h + len * 2) + sp * t) % (h + len * 2)) - len;
    let xx = ((fx * w - slant * yy) % w + w) % w; g.moveTo(x0 + xx, y0 + yy); g.lineTo(x0 + xx - slant * len, y0 + yy + len);
  }
  g.stroke();
}
function ripples(g, x, y, rx, ry, t, n = 3, speed = .9) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 4; for (let i = 0; i < n; i++) { const u = ((t * speed + i / n) % 1); g.globalAlpha = 1 - u; g.beginPath(); g.ellipse(x, y, rx * (.2 + u * .8), ry * (.2 + u * .8), 0, 0, Math.PI * 2); g.stroke(); } g.globalAlpha = 1; }
function skyline(g, x0, x1, base, seed, col, win, hmin, hmax, step = 70) {
  for (let x = x0; x < x1; x += step) { const h = hmin + hash(seed + x * .013) * (hmax - hmin), w = step - 4 + hash(seed + x * .1) * 24; g.fillStyle = col; g.fillRect(x, base - h, w, h + 400);
    if (win) for (let wy = base - h + 22; wy < base - 20; wy += 38) for (let wx = x + 12; wx < x + w - 18; wx += 26) if (hash(seed + wx * .7 + wy * 1.3) > .62) { g.fillStyle = win; g.fillRect(wx, wy, 12, 18); } }
}
function cloud(g, x, y, s, col, sh) { const bl = [[-90, 8, 52], [-40, -14, 62], [28, -10, 70], [92, 10, 50], [0, 18, 80]]; g.fillStyle = col; for (const [dx, dy, r] of bl) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill(); } g.fillStyle = sh; g.beginPath(); g.ellipse(x, y + 40 * s, 150 * s, 24 * s, 0, 0, Math.PI * 2); g.fill(); }
const step = (t, t0, v) => t >= t0 ? v : 0;

// ================================================================ 0 · title
function title(g, c) {
  const { t } = c, W = 1080, R = rainAt(t);
  vg(g, 0, 0, W, 1080, [[0, C.deep], [.5, C.slate], [.52, '#cdd7e3'], [1, '#bcc9d9']]);
  // window of rain over a dusk city
  g.save(); g.beginPath(); g.rect(0, 0, W, 560); g.clip();
  vg(g, 0, 0, W, 560, [[0, '#2b3d62'], [1, '#5a7391']]);
  skyline(g, -20, W + 40, 540, 3, '#2d405f', '#ffe7a0', 130, 380, 84); skyline(g, -40, W + 40, 560, 8, '#1f2d4a', '#ffd88a', 60, 230, 96);
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.ellipse(120 + i * 190, 560 - 60 * (i % 2), 150, 60, 0, 0, Math.PI * 2); g.fill(); }
  rain(g, t, 0, 0, W, 560, 150, { len: 110, speed: 1500, slant: .18, col: 'rgba(214,230,246,.55)', lw: 3, seed: 5, inten: R });
  rain(g, t, 0, 0, W, 560, 60, { len: 170, speed: 2100, slant: .2, col: 'rgba(255,255,255,.4)', lw: 5, seed: 11, inten: R });
  g.restore();
  g.fillStyle = C.cream; g.fillRect(0, 548, W, 28); g.fillStyle = C.ink; g.fillRect(0, 573, W, 5); g.fillRect(0, 545, W, 4);
  g.fillStyle = C.cream; g.fillRect(0, 0, 26, 560); g.fillRect(W - 26, 0, 26, 560); g.fillStyle = C.ink; g.fillRect(24, 0, 4, 560); g.fillRect(W - 28, 0, 4, 560);
  // wall below + stand
  for (let x = 0; x < W; x += 90) { g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x, 578, 44, 380); }
  g.fillStyle = '#9fb0c6'; g.fillRect(0, 930, W, 150); g.fillStyle = C.ink; g.fillRect(0, 928, W, 5);
  const sx = 540, wob = Math.sin(t * 1.6) * 0.012;
  const look = t < 0.9 ? [0, 0] : [Math.sin(t * 1.3) * 7, 0];
  const mood = t < 2.2 ? 'neutral' : 'no', blink = (t > CUE.blink && t < CUE.blink + .14) ? 1 : 0;
  dewey(g, sx, 940, 1.02, { mood: t < 0.6 ? 'no' : mood, blink, look, ang: wob, tag: Math.sin(t * 3) * .12 * pop(t, 0.6, 1) });
  // stand (front half): a steel pot
  const sy = 770; g.beginPath(); g.moveTo(sx - 120, sy); g.lineTo(sx + 120, sy); g.lineTo(sx + 100, sy + 230); g.quadraticCurveTo(sx, sy + 252, sx - 100, sy + 230); g.closePath(); fs(g, C.steel, LW);
  g.save(); g.clip(); g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(sx - 90, sy, 26, 260); g.fillStyle = 'rgba(27,35,64,.25)'; g.fillRect(sx + 40, sy, 100, 260); g.restore(); ol(g);
  ell(g, sx, sy, 120, 20, '#59658a', LW); for (const dx of [-60, 0, 60]) { g.beginPath(); g.moveTo(sx + dx, sy + 40); g.lineTo(sx + dx * 0.9, sy + 220); g.strokeStyle = 'rgba(27,35,64,.25)'; g.lineWidth = 4; g.stroke(); }
  // puddle that dripped from Dewey
  ell(g, sx + 10, 1034, 200, 22, 'rgba(120,150,185,.55)', 0); ripples(g, sx + 10, 1034, 170, 16, t, 2, .5);
  // title lettering
  const a = pop(t, CUE.logo, .5), b = pop(t, CUE.logo + .22, .5);
  const R1 = sfxText(g, { text: 'THE UMBRELLA', x: 540, y: 330, size: 150, rot: -.04, fill: C.cream, pop: a, edge: C.coral });
  const R2 = sfxText(g, { text: 'SAYS NO.', x: 540, y: 470, size: 190, rot: .03, fill: C.coral, pop: b, edge: C.cream });
  if (R1) c.rep('title1', 'THE UMBRELLA', { x0: 540 - R1.w / 2, y0: 330 - 70, x1: 540 + R1.w / 2, y1: 330 + 70 });
  if (R2) c.rep('title2', 'SAYS NO.', { x0: 540 - R2.w / 2, y0: 470 - 80, x1: 540 + R2.w / 2, y1: 470 + 80 });
  const ta = pop(t, CUE.logo - .25, .4);
  if (ta > 0) {
    g.save(); g.globalAlpha = ta; rr(g, 330, 150, 420, 56, 28); g.fillStyle = C.cream; g.fill(); ol(g, 4);
    g.font = `700 28px ${FONT_BODY}`; g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = '4px'; g.fillText('LITTLE WEATHER · EP. 07', 540, 179); g.letterSpacing = '0px'; g.restore();
    c.rep('series', 'LITTLE WEATHER · EP. 07', { x0: 345, y0: 160, x1: 735, y1: 198 });
  }
}

// ================================================================ 1 · the hall
function hall(g, c) {
  const { t } = c, R = rainAt(t), W = 1000, H = 980;
  vg(g, 0, 0, W, H, [[0, '#e3e9f0'], [1, '#cdd6e2']]);
  for (let x = 0; x < W; x += 80) { g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x, 0, 36, 790); }
  g.fillStyle = '#b4c1d3'; g.fillRect(0, 560, W, 260); g.fillStyle = '#c4d0df'; g.fillRect(0, 548, W, 16); g.fillStyle = C.ink; g.fillRect(0, 560, W, 4);   // wainscot
  // window with rain, parallax
  const wx = 60, wy = 150, ww = 270, wh = 420;
  g.save(); g.beginPath(); g.rect(wx, wy, ww, wh); g.clip(); vg(g, wx, wy, ww, wh, [[0, '#6f88a6'], [1, '#a8bbd0']]);
  g.translate(0, c.par(.55, c.camHold)); skyline(g, wx - 20, wx + ww + 20, wy + wh + 120, 21, '#52698a', '#ffe7a0', 80, 200, 60); g.translate(0, -c.par(.55, c.camHold));
  rain(g, t, wx, wy, ww, wh, 40, { len: 90, speed: 1400, col: 'rgba(235,245,255,.7)', seed: 3, inten: R }); g.restore();
  g.lineWidth = 10; g.strokeStyle = C.white; g.strokeRect(wx, wy, ww, wh); g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2); g.stroke(); g.lineWidth = 5; g.strokeStyle = C.ink; g.strokeRect(wx - 5, wy - 5, ww + 10, wh + 10); g.strokeRect(wx + 5, wy + 5, ww - 10, wh - 10);
  g.fillStyle = C.white; g.fillRect(wx - 16, wy + wh + 2, ww + 32, 18); g.strokeStyle = C.ink; g.lineWidth = 5; g.strokeRect(wx - 16, wy + wh + 2, ww + 32, 18);
  // door
  const dx = 730, dy = 70, dw = 240, dh = 750;
  g.fillStyle = C.cream; g.fillRect(dx - 22, dy - 22, dw + 44, dh + 22); g.strokeStyle = C.ink; g.lineWidth = 5; g.strokeRect(dx - 22, dy - 22, dw + 44, dh + 22);
  g.fillStyle = '#c47f4f'; g.fillRect(dx, dy, dw, dh); g.fillStyle = 'rgba(27,35,64,.14)'; g.fillRect(dx + dw * .6, dy, dw * .4, dh); g.strokeRect(dx, dy, dw, dh);
  for (const yy of [150, 450]) { g.strokeStyle = '#a2643b'; g.lineWidth = 5; g.strokeRect(dx + 30, dy + yy - 90, dw - 60, 200); }
  ell(g, dx + 36, dy + 400, 14, 14, '#ffd98a', 4); ell(g, dx + dw / 2, dy + 80, 11, 11, C.cream, 4);
  // coat hooks with scarf
  g.fillStyle = C.ink; for (const hx of [380, 450, 520]) { g.beginPath(); g.arc(hx, 120, 9, 0, Math.PI * 2); g.fill(); }
  g.beginPath(); g.moveTo(370, 124); g.quadraticCurveTo(396, 220, 380, 330); g.lineTo(424, 330); g.quadraticCurveTo(430, 220, 404, 124); g.closePath(); fs(g, C.coral, 5);
  // floor + mat
  vg(g, 0, 820, W, 160, [[0, '#a37a52'], [1, '#8c6340']]); g.fillStyle = C.ink; g.fillRect(0, 818, W, 5);
  for (let x = -40; x < W + 40; x += 110) { g.beginPath(); g.moveTo(x, 820); g.lineTo(x - (x - 500) * .18, 980); g.strokeStyle = 'rgba(27,35,64,.22)'; g.lineWidth = 3; g.stroke(); }
  rr(g, 280, 905, 470, 54, 14); fs(g, C.boot, 5);
  // Mina, holding Dewey
  const arm = pop(t, 4.4, .6), look = [-10 * ss(seg(t, 5.8, 6.4)), 6], feel = t < 8.8 ? 0 : 1;
  const brow = [-.45 + feel * .1, -4], eye = t < 6 ? 'open' : 'open', mouth = t < 8.6 ? 'flat' : 'grit';
  const dsw = Math.sin(t * 2.4) * .22 * pop(t, CUE.tagSwing, 1.2) * Math.exp(-(t - CUE.tagSwing) * .35);
  mina(g, 470, 940, .98, {
    lh: [-178, -232 - 6 * arm], rh: [98, -168], look, brow, eye, mouth, blush: 0, bob: Math.sin(t * 1.4) * 2, lean: .01,
    hold: (gg, aL) => { dewey(gg, aL.hx - 6, aL.hy + 26, .66, { mood: t < 5.6 ? 'neutral' : 'no', ang: -.07 + Math.sin(t * 1.5) * .01, tag: dsw, blink: (t > 4.9 && t < 5.05) ? 1 : 0 }); ell(gg, aL.hx - 6, aL.hy + 6, 19, 19, C.skin, LW); },
  });
  if (t > 8.9 && t < 12) sweat(g, 590, 520 + (t - 8.9) * 6, 11);
  // text
  const n = narration(g, { text: 'TUESDAY. 7:42 A.M. FORECAST: WET.', x: 36, y: 34, size: 36, maxW: 480, slide: pop(t, CUE.narr1, .4) });
  if (t >= CUE.narr1) c.rep('narr1', 'TUESDAY. 7:42 A.M. FORECAST: WET.', n);
  const bp = pop(t, CUE.bal1, .3), B = balloon(g, { text: "OKAY, BUDDY. BE NORMAL TODAY.", x: 640, y: 215, tail: [530, 400], size: 44, maxW: 470, pop: bp });
  if (t >= CUE.bal1) c.rep('bal1', "OKAY, BUDDY. BE NORMAL TODAY.", B);
}

// ================================================================ 2 · close-up: the button
function close(g, c) {
  const { t } = c, R = rainAt(t), W = 1000, H = 760;
  vg(g, 0, 0, W, H, [[0, '#9db3c9'], [1, '#d3deea']]);
  for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(255,255,255,${.14 + hash(i) * .12})`; g.beginPath(); g.arc(hash(i + 4) * W, hash(i + 9) * 600, 26 + hash(i + 2) * 60, 0, Math.PI * 2); g.fill(); }
  rain(g, t, 0, 0, W, H, 40, { len: 200, speed: 2000, slant: .14, col: 'rgba(255,255,255,.45)', lw: 6, seed: 17, inten: R });
  // zoom in place: the camera pushes on the panel, not the page
  const z = 1 + .13 * ss(seg(t, CUE.zoom0, CUE.zoom1)); g.save(); g.translate(430, 400); g.scale(z, z); g.translate(-430, -400);
  const c1 = pop(t, CUE.click1, .12), c2 = pop(t, CUE.click2, .12);
  const press = Math.max(Math.exp(-Math.abs(t - CUE.click1) * 18), Math.exp(-Math.abs(t - CUE.click2) * 18));
  dewey(g, 330, 800, 1.28, { mood: t < CUE.no2 - .4 ? 'no' : 'strain', ang: -.04, squash: 1 + press * .04, tag: Math.sin(t * 4) * .06 });
  // her coat and arm come in from the corner; the thumb is on the strap button
  { const hxp = 470 - press * 14, hyp = 618;
    g.beginPath(); g.moveTo(640, 560); g.quadraticCurveTo(800, 500, 980, 560); g.lineTo(1010, 770); g.lineTo(600, 770); g.closePath(); fs(g, C.coat);
    g.save(); g.clip(); g.fillStyle = C.coatSh; g.fillRect(860, 500, 200, 300); g.restore(); ol(g);
    cap(g, 700, 600, 640, 700, 66, C.coat, LW, C.coatSh); cap(g, 640, 700, hxp + 16, hyp + 10, 60, C.coat, LW, C.coatSh);
    ell(g, hxp, hyp, 34, 31, C.skin, LW); cap(g, hxp - 10, hyp - 10, hxp - 54 + press * 10, hyp - 8, 22, C.skin, LW); }
  mina(g, 790, 800, 1.3, { headOnly: true, look: [-18, 8], brow: [.3, 0], eye: t > CUE.no2 ? 'flat' : 'open', mouth: t > CUE.no2 ? 'grit' : 'flat', soak: .1 });
  // the thumb on the strap button
  if (c1 > 0) { g.save(); g.translate(0, 0); const bx = 330 + 44 * 1.28, by = 800 + (60 - 208) * 1.28; burst(g, bx, by, 34, 66, 9, 7, C.ink, 5); g.restore(); }
  g.restore();
  // lettering: sfx breaks the panel (see over), bubbles stay inside
  const sz = textBox(g, 'No.', 70, 400);
  const b1 = pop(t, CUE.no1, .3), b2 = pop(t, CUE.no2, .3);
  if (t >= CUE.no1 && t < CUE.no2) { const B = balloon(g, { text: 'No.', x: 330, y: 105, tail: [330, 232], kind: 'small', size: 64, pop: b1 }); c.rep('no1', 'No.', B); }
  if (t >= CUE.no2) { const B = balloon(g, { text: 'NO.', x: 330, y: 105, tail: [330, 238], kind: 'small', size: 96, pop: b2 }); c.rep('no2', 'NO.', B); }
  c.over(gg => {
    const wx = c.p.x;
    if (t >= CUE.click1) { const S = sfxText(gg, { text: t < CUE.click2 ? 'CLICK' : 'CLICK CLICK', x: wx + 700, y: c.p.y + 120, size: t < CUE.click2 ? 110 : 120, rot: -.16, fill: C.sun, pop: t < CUE.click2 ? c1 : c2, shake: t < CUE.click2 ? 0 : 4, tt: t });
      if (S) c.repW('click', t < CUE.click2 ? 'CLICK' : 'CLICK CLICK', wx + 700 - S.w / 2, c.p.y + 240 - 60, wx + 650 + S.w / 2, c.p.y + 240 + 60); }
  });
}

// ================================================================ 3 · the tug of war
function tug(g, c) {
  const { t } = c, R = rainAt(t), W = 1080, H = 520;
  vg(g, 0, 0, W, H, [[0, '#c3d0de'], [1, '#e4ebf2']]);
  skyline(g, 0, W, 380, 31, '#aebccf', null, 100, 200, 96); g.fillStyle = '#9aabbf'; g.fillRect(0, 440, W, 100); g.fillStyle = 'rgba(27,35,64,.25)'; g.fillRect(0, 438, W, 5);
  rain(g, t, 0, 0, W, H, 70, { len: 120, speed: 1700, col: 'rgba(255,255,255,.7)', seed: 9, inten: R });
  const u = seg(t, CUE.tugA, CUE.tugA + 1.7), strain = Math.sin(t * 19) * 3 * (1 - ss(seg(t, CUE.fine - .4, CUE.fine)));
  const give = ss(seg(t, CUE.fine - .5, CUE.fine));
  // Dewey is held out to the right, horizontal, pulling away
  mina(g, 330, 500, .8, { lean: -.2 + .1 * give + strain * .004, arm: 84, lh: [150, -230], rh: [160, -250], look: [14, 0], brow: [.5 * (1 - give), 0], eye: give > .5 ? 'flat' : 'squint', mouth: give > .5 ? 'frown' : 'grit', elbow: [1, 1], soak: .1,
    hold: (gg, aL) => { gg.save(); dewey(gg, aL.hx + 40, aL.hy + 4, .84, { ang: Math.PI / 2 - .05 + Math.sin(t * 23) * .02 * (1 - give), mood: give > .5 ? 'smug' : 'strain', squash: 1 }); gg.restore(); ell(gg, aL.hx, aL.hy, 19, 19, C.skin, LW); ell(gg, aL.hx + 12, aL.hy + 6, 17, 17, C.skin, LW); } });
  if (t < CUE.fine - .5) { sweat(g, 320, 110, 13); sweat(g, 460, 150, 11); }
  if (t >= CUE.fine) { const B = balloon(g, { text: '...FINE.', x: 330, y: 105, tail: [320, 190], size: 56, maxW: 400, pop: pop(t, CUE.fine, .3) }); c.rep('fine', '...FINE.', B); }
  c.over(gg => { if (t >= CUE.grr && t < CUE.fine + 1) { const p = pop(t, CUE.grr, .3); const S = sfxText(gg, { text: 'GRRRNK!', x: c.p.x + 660, y: c.p.y - 4, size: 190, rot: .05, fill: C.coral, pop: p, shake: t < CUE.fine - .4 ? 5 : 0, tt: t, edge: C.cream });
    if (S && t < CUE.fine + 1) c.repW('grr', 'GRRRNK!', c.p.x + 660 - S.w / 2, c.p.y - 4 - 90, c.p.x + 660 + S.w / 2, c.p.y - 4 + 90); } });
}

// ================================================================ 4 · walking
export function walkX(t) { return lerp(190, 800, ss(seg(t, CUE.narr2 - .8, 30.2))); }
function walk(g, c) {
  const { t } = c, R = rainAt(t), W = 1080, H = 940, cam0 = camAt(24.375);
  vg(g, 0, 0, W, H, [[0, '#a2b6cb'], [.55, '#c8d5e2'], [1, '#8da2b8']]);
  g.save(); g.translate(0, c.par(.45, cam0)); skyline(g, -30, W + 60, 560, 41, '#8fa4bc', '#fff0b8', 160, 420, 100); g.restore();
  g.save(); g.translate(0, c.par(.75, cam0));
  skyline(g, -30, W + 60, 640, 52, '#6c85a3', '#ffe39a', 120, 300, 130);
  // shop awning + lamp
  g.fillStyle = C.ink; g.fillRect(742, 250, 14, 400);
  for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? C.cream : C.coral; g.beginPath(); g.moveTo(520 + i * 80, 420); g.lineTo(600 + i * 80, 420); g.lineTo(604 + i * 80, 470); g.arc(560 + i * 80, 470, 44, 0, Math.PI); g.closePath(); g.fill(); }
  ell(g, 749, 240, 36, 22, '#fff0b8', 5); g.restore();
  // ground
  vg(g, 0, 640, W, 300, [[0, '#7a8fa8'], [1, '#5a7391']]); g.fillStyle = C.ink; g.fillRect(0, 638, W, 5);
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(((i * 220 - c.camOff(.9)) % 1400 + 1400) % 1400 - 200, 780, 130, 12); }
  ell(g, 300, 830, 280, 38, 'rgba(210,225,240,.5)', 0); ell(g, 820, 880, 220, 28, 'rgba(210,225,240,.45)', 0);
  // a dry stranger with a normal umbrella crosses behind her
  const px = lerp(1300, -400, seg(t, CUE.pedestrian, CUE.pedestrian + 3.2)), pk = Math.sin(t * 9) * 8;
  if (px > -300 && px < 1400) { g.save(); g.translate(px, -150); g.scale(.8, .8); const sc = 1.05;
    cap(g, -22, 760, -22 + Math.sin(t * 9) * 16, 900, 28, '#27365a', LW); cap(g, 22, 760, 22 - Math.sin(t * 9) * 16, 900, 28, '#27365a', LW); ell(g, -22 + Math.sin(t * 9) * 16, 906, 30, 16, C.ink, 0); ell(g, 22 - Math.sin(t * 9) * 16, 906, 30, 16, C.ink, 0);
    g.beginPath(); g.moveTo(-52, 590); g.lineTo(52, 590); g.lineTo(66, 770); g.lineTo(-66, 770); g.closePath(); fs(g, '#4d6f9c'); ell(g, 0, 548, 38, 38, '#d9a381', LW);
    g.beginPath(); g.moveTo(-200, 480); g.quadraticCurveTo(0, 340, 200, 480); for (let i = 4; i > 0; i--) g.quadraticCurveTo(200 - (i - .5) * 100, 500, 200 - i * 100 + 0, 480); g.closePath(); fs(g, C.navy); g.beginPath(); g.moveTo(0, 480); g.lineTo(0, 600); ol(g, 6); g.restore(); }
  // Mina walks right across the panel, getting wetter
  const x = walkX(t), ph = t * 1.0 * 1.0, soak = .15 + .55 * ss(seg(t, CUE.narr2, 30.5));
  const sx = 3 * Math.sin(t * Math.PI * 2 * 2);
  mina(g, x, 880, 1.0, { walk: (t * 2) % 1, lean: .06, look: [10, 4], brow: [.28, 0], eye: 'flat', mouth: 'frown', soak, lh: [-96, -170], rh: [100, -150], bob: 0,
    hold: (gg, aL, aR) => { dewey(gg, aR.hx + 8, aR.hy + 2, .62, { ang: -1.35, mood: 'smug', tag: Math.sin(t * 6) * .1 }); ell(gg, aR.hx, aR.hy, 19, 19, C.skin, LW); } });
  // foreground: a wet railing (fast) and the heaviest rain
  g.save(); g.translate(0, c.par(1.3, cam0)); g.fillStyle = 'rgba(27,35,64,.9)'; for (let x2 = -50; x2 < W + 60; x2 += 190) g.fillRect(x2, 880, 14, 160); g.fillRect(-20, 884, W + 40, 14); g.restore();
  rain(g, t, 0, 0, W, H, 90, { len: 140, speed: 1900, col: 'rgba(255,255,255,.6)', seed: 23, inten: R });
  // lettering
  const n = narration(g, { text: 'NINE BLOCKS. ZERO COVER.', x: 36, y: 40, size: 40, maxW: 460, slide: pop(t, CUE.narr2, .4) }); if (t >= CUE.narr2) c.rep('narr2', 'NINE BLOCKS. ZERO COVER.', n);
  if (t >= CUE.think2) { const B = balloon(g, { text: "HE'S DOING THIS ON PURPOSE.", x: 700, y: 245, tail: [x + 30, 440], kind: 'thought', size: 40, maxW: 380, pop: pop(t, CUE.think2, .35) }); c.rep('think2', "HE'S DOING THIS ON PURPOSE.", B); }
}

// ================================================================ 5 · boots
function boots(g, c) {
  const { t } = c, R = rainAt(t), W = 1000, H = 420;
  vg(g, 0, 0, W, H, [[0, '#a9bace'], [1, '#6f879f']]); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 0, W, 200);
  ell(g, 470, 330, 380, 56, 'rgba(210,228,244,.55)', 0); ripples(g, 470, 330, 330, 44, t, 3, .8);
  rain(g, t, 0, 0, W, H, 60, { len: 100, speed: 1500, col: 'rgba(255,255,255,.55)', seed: 4, inten: R });
  const ph = (t * 2) % 1, st = Math.floor(t * 2);
  mina(g, 470, 322, 1.0, { walk: ph, soak: .7, lh: [-96, -170], rh: [100, -150],
    hold: (gg, aL, aR) => { dewey(gg, aR.hx + 6, aR.hy + 26, .6, { ang: -.02, mood: 'smug', tag: Math.sin(t * 3) * .12 }); ell(gg, aR.hx, aR.hy, 19, 19, C.skin, LW); } });
  for (let i = 0; i < 6; i++) { const u = clamp((t - CUE.slosh - i * .02) * 1.6); if (u > 0 && u < 1) drop(g, 430 + (hash(i) - .5) * 280, 300 - Math.sin(u * Math.PI) * (90 + hash(i + 3) * 80), 9 + hash(i + 7) * 5, '#dcecf8'); }
  c.over(gg => { const p = pop(t, CUE.slosh, .3); if (p > 0) { const S = sfxText(gg, { text: 'SPLOSH', x: c.p.x + 760, y: c.p.y + 140, size: 120, rot: .12, fill: C.sky2, pop: p, edge: C.mint }); if (S) c.repW('slosh', 'SPLOSH', c.p.x + 760 - S.w / 2, c.p.y + 140 - 60, c.p.x + 760 + S.w / 2, c.p.y + 140 + 60); } });
}

// ================================================================ 6 · the stairs (one tall panel: top of the steps → the puddle)
const STAIR0 = 700, STEP = 140, NSTEP = 22;
const stairX = y => { const u = clamp((y - STAIR0) / (STEP * NSTEP)); return [lerp(230, 70, u), lerp(850, 1010, u)]; };
export function fallPath(t) {                                            // Dewey's world y (page space, relative to the stairs panel) and bounce, tied to the camera
  const u = clamp((t - FALL.t0) / (FALL.t1 - FALL.t0)), cam = camAt(t) - P.stairs.y;
  const lead = 760 + 220 * ss(seg(t, FALL.t0, FALL.t0 + 1.1));
  const y = t < FALL.t0 ? 450 : cam + lead;
  return { y, x: lerp(300, 470, u) + Math.sin(u * 7) * 70, bounce: Math.abs(Math.sin((t - FALL.t0) * 9.5)) };
}
function stairs(g, c) {
  const { t } = c, R = rainAt(t), W = 1080, H = 4200, cam0 = P.stairs.y - 410;
  vg(g, 0, 0, W, 900, [[0, '#9db1c7'], [1, '#c7d4e1']]); vg(g, 0, 900, W, 3300, [[0, '#b9c8d8'], [1, '#8aa0b7']]);
  // far town (slow parallax), repeated down the slope
  g.save(); g.translate(0, c.par(.4, cam0)); for (let k = 0; k < 6; k++) skyline(g, -30, W + 60, 650 + k * 640, 60 + k, k % 2 ? '#8ea3bb' : '#9fb2c8', null, 160, 360, 110); g.restore();
  // stairs: frontal steps widening toward the viewer
  for (let i = 0; i < NSTEP; i++) {
    const y0 = STAIR0 + i * STEP, [l, r] = stairX(y0), [l2, r2] = stairX(y0 + STEP);
    g.beginPath(); g.moveTo(l, y0); g.lineTo(r, y0); g.lineTo(r2, y0 + 44); g.lineTo(l2, y0 + 44); g.closePath(); g.fillStyle = i % 2 ? '#dfe6ee' : '#d3dce7'; g.fill();
    g.beginPath(); g.moveTo(l2, y0 + 44); g.lineTo(r2, y0 + 44); g.lineTo(r2, y0 + STEP); g.lineTo(l2, y0 + STEP); g.closePath(); g.fillStyle = i % 2 ? '#9aaec5' : '#8ea3bb'; g.fill();
    g.strokeStyle = C.ink; g.lineWidth = 4; g.beginPath(); g.moveTo(l2, y0 + 44); g.lineTo(r2, y0 + 44); g.moveTo(l2, y0 + STEP); g.lineTo(r2, y0 + STEP); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(l2 + 40, y0 + 8, 160 + (i % 3) * 60, 7);
  }
  // top landing + station arch
  g.fillStyle = '#c9d5e2'; g.fillRect(0, 140, W, STAIR0 - 140); g.fillStyle = C.ink; g.fillRect(0, STAIR0 - 3, W, 6);
  g.fillStyle = '#7a90ab'; g.fillRect(0, 0, W, 150); for (let x = 40; x < W; x += 180) { g.fillStyle = '#ffe7a0'; rr(g, x, 40, 100, 60, 10); g.fill(); ol(g, 4); }
  g.fillStyle = 'rgba(27,35,64,.15)'; g.fillRect(0, 140, W, 14);
  // side walls / rails (foreground, faster)
  for (const side of [-1, 1]) {
    g.beginPath(); const [l0, r0] = stairX(STAIR0 + 20), [l1, r1] = stairX(STAIR0 + STEP * NSTEP + 20); const a0 = side < 0 ? l0 - 10 : r0 + 10, a1 = side < 0 ? l1 - 14 : r1 + 14;
    g.moveTo(a0, STAIR0 - 120); g.lineTo(a1, STAIR0 + STEP * NSTEP - 110); ol(g, 22); g.strokeStyle = C.steel; g.lineWidth = 14; g.stroke();
    g.beginPath(); g.moveTo(a0 - 5, STAIR0 - 126); g.lineTo(a1 - 5, STAIR0 + STEP * NSTEP - 116); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 4; g.stroke();
  }
  g.save(); g.translate(0, c.par(1.28, cam0) % 300); for (let y = -300; y < H + 300; y += 300) for (const side of [-1, 1]) {
    const yy = y + 100, [l, r] = stairX(clamp(yy, STAIR0, 3700)); const ax = side < 0 ? l - 12 : r + 12; g.beginPath(); g.moveTo(ax, yy); g.lineTo(ax, yy + 110); ol(g, 22); g.strokeStyle = '#5b6786'; g.lineWidth = 14; g.stroke(); }
  g.restore();
  // plaza + puddle
  const py = 3790; vg(g, 0, py, W, H - py, [[0, '#8da2b8'], [1, '#6a8099']]); g.fillStyle = C.ink; g.fillRect(0, py - 3, W, 6);
  for (let x = 0; x < W; x += 180) { g.beginPath(); g.moveTo(x + (x * .3 % 60), py); g.lineTo(x * 1.2 - 80, H); g.strokeStyle = 'rgba(27,35,64,.2)'; g.lineWidth = 4; g.stroke(); }
  const settle = pop(t, FALL.t1, .5);
  ell(g, 560, 4040, 470, 150, 'rgba(206,224,240,.8)', LW); ell(g, 560, 4030, 420, 120, 'rgba(255,255,255,.4)', 0); ripples(g, 560, 4040, 440, 130, t, 3, .6);
  // rain over everything
  rain(g, t, 0, 0, W, H, 260, { len: 150, speed: 2100, col: 'rgba(255,255,255,.5)', lw: 4, seed: 91, inten: R });
  // the chase
  const sc = y => lerp(.52, 1.0, clamp((y - 600) / 3300));
  if (t < FALL.t0 + .0) {
    // at the top of the steps: Dewey slips from under her arm
    const sl = seg(t, CUE.slip - .7, CUE.slip), wobble = Math.sin(t * 20) * 0.03 * sl;
    const mx = lerp(150, 400, ss(seg(t, 31.1, 32.35)));
    mina(g, mx, 600, .72, { walk: t < 32.4 ? (t * 2) % 1 : null, lean: .05, look: [6, 8], brow: [.2, 0], eye: 'flat', mouth: 'frown', soak: .75, lh: [-96, -170], rh: [100, -150],
      hold: (gg, aL, aR) => { dewey(gg, aR.hx + 6 + sl * 20, aR.hy - 4 + sl * 40, .6, { ang: -1.35 + sl * 1.5 + wobble, mood: 'shock', look: [-4, 6], blink: 0 }); ell(gg, aR.hx, aR.hy, 19, 19, C.skin, LW); } });
  } else {
    const F = fallPath(t), u = (t - FALL.t0), yD = F.y - F.bounce * 70, s = sc(yD);
    const arrive = ss(seg(t, FALL.t1 - .2, FALL.t1 + .15));
    // Dewey tumbles ahead, spinning; at the end he stands upright in the puddle's edge
    const spin = u * 11 * (1 - arrive), dAng = spin + arrive * 0;
    dewey(g, lerp(F.x, 760, arrive), lerp(yD, 4050, arrive), lerp(s * .82, .62, arrive), { ang: lerp(dAng, 0, arrive), mood: t > FALL.t1 ? 'smug' : 'shock', squash: 1 + (1 - F.bounce) * .1 * (1 - arrive) });
    // Mina chases from behind, arms flailing, then lands sitting in the puddle
    const yM = F.y - 360 - F.bounce * 40 + 0, sM = sc(yM), run = ss(seg(t, FALL.t0, FALL.t0 + .4));
    const sitting = arrive;
    mina(g, lerp(F.x - 60 + Math.sin(u * 5) * 80, 400, sitting), lerp(yM, 4090, sitting), lerp(sM, .98, sitting), { walk: sitting > .5 ? null : (t * 3.2) % 1, lean: .16 * (1 - sitting) + Math.sin(u * 10) * .05 * (1 - sitting), sit: sitting, soak: 1,
      look: [0, 8], brow: [-.5 * (1 - sitting) + .1, -4], eye: sitting > .5 ? 'flat' : 'wide', mouth: sitting > .5 ? 'wavy' : 'open',
      lh: [lerp(-150, -120, sitting), lerp(-340, -110, sitting)], rh: [lerp(150, 120, sitting), lerp(-330 + Math.sin(u * 9) * 40, -110, sitting)], elbow: [1, 1] });
  }
  // stray water from the landing
  for (let i = 0; i < 9; i++) { const uu = clamp((t - FALL.t1 - i * .01) * 1.2); if (uu > 0 && uu < 1) drop(g, 560 + (hash(i * 3) - .5) * 520, 3980 - Math.sin(uu * Math.PI) * (160 + hash(i) * 200), 11 + hash(i + 5) * 8, '#dcecf8'); }
  // fixed-to-screen-ish onomatopoeia that rides the whip (parallax .12): DOKA DOKA
  const wd = clamp((t - (FALL.t0 + .15)) / .3) * (1 - ss(seg(t, FALL.t1 - .25, FALL.t1)));
  if (wd > 0) { c.layer(.12, cam0, () => { for (let i = 0; i < 3; i++) { const S = sfxText(g, { text: 'DOKA', x: 840 - i * 40, y: 500 + i * 190, size: 150 - i * 12, rot: .16 - i * .07, fill: [C.sun, C.coral, C.sky2][i], pop: clamp(wd * 3 - i * .4), shake: 6, tt: t, edge: C.cream });
      if (S) c.repL('doka' + i, 'DOKA', 840 - i * 40 - S.w / 2, 500 + i * 190 - 70, 840 - i * 40 + S.w / 2, 500 + i * 190 + 70); } }); }
  // the stop: SPLASH breaks the panel
  c.over(gg => { const p = pop(t, FALL.t1, .22); if (p > 0 && t < 40.8) { const S = sfxText(gg, { text: 'SPLASH!!', x: c.p.x + 540, y: c.p.y + 3560, size: 250, rot: -.07, fill: C.cream, pop: p, edge: C.mint, shake: Math.max(0, 8 - (t - FALL.t1) * 14), tt: t });
    if (S) c.repW('splash', 'SPLASH!!', c.p.x + 540 - S.w / 2, c.p.y + 3560 - 110, c.p.x + 540 + S.w / 2, c.p.y + 3560 + 110); } });
  // speed lines at the edges during the whip are added by the page (screen space)
  // an exclamation when she slips: it rides the whip with the DOKAs (slow parallax layer) so it can be read
  if (t >= CUE.slip - .1 && t < 35.0) c.layer(.12, cam0, () => { const B = balloon(g, { text: 'HEY!', x: 250, y: 330, tail: [330, 450], kind: 'shout', size: 70, maxW: 200, pop: pop(t, CUE.slip, .25) }); c.rep('hey', 'HEY!', B); });
}

// ================================================================ 7 · after the rain
function sky(g, c) {
  const { t } = c, W = 1080, H = 640, sun = ss(seg(t, CUE.sun - 1, CUE.sun + 1.2));
  vg(g, 0, 0, W, H, [[0, lerpC('#9fb2c8', '#ffd98a', sun)], [.55, lerpC('#c3d1df', '#ffe9ae', sun)], [1, lerpC('#9fb2c8', '#ffd2a2', sun)]]);
  // clouds parting
  g.save(); g.translate(0, c.par(.6, anchorSky())); cloud(g, 160 - sun * 140, 130, 1.3, lerpC('#8a9eb6', '#ffffff', sun * .85), lerpC('#6e84a0', '#ffe3ba', sun)); cloud(g, 930 + sun * 140, 110, 1.2, lerpC('#8a9eb6', '#ffffff', sun * .85), lerpC('#6e84a0', '#ffe3ba', sun)); g.restore();
  const sx = 400, sy = 140 + (1 - sun) * 90;
  if (sun > 0) { g.globalAlpha = sun; burst(g, sx, sy, 100, 170 + 20 * Math.sin(t * 2), 18, 5, '#fff1b0', 8); g.fillStyle = '#fff6c9'; g.beginPath(); g.arc(sx, sy, 84, 0, Math.PI * 2); g.fill(); ell(g, sx, sy, 62, 62, C.sun, 6); g.globalAlpha = 1; }
  // rainbow
  if (sun > .2) { g.globalAlpha = (sun - .2) * .8; [C.coral, C.sun, C.mint, '#6ea7e8'].forEach((col, i) => { g.beginPath(); g.arc(540, 520, 420 - i * 24, Math.PI * 1.06, Math.PI * 1.94); g.strokeStyle = col; g.lineWidth = 22; g.lineCap = 'butt'; g.stroke(); }); g.globalAlpha = 1; }
  // roofs and the street
  skyline(g, -20, W + 40, 470, 71, lerpC('#6e87a5', '#e0a77e', sun), null, 60, 170, 96);
  vg(g, 0, 440, W, 200, [[0, lerpC('#7d92ab', '#f0c08a', sun)], [1, lerpC('#5f7690', '#d9a070', sun)]]); g.fillStyle = C.ink; g.fillRect(0, 437, W, 5);
  ell(g, 300, 560, 300, 44, lerpC('#c8daec', '#fff0c8', sun), 0); ell(g, 300, 550, 150, 12, 'rgba(255,255,255,.7)', 0);
  // late drops, then none
  const R = rainAt(t); rain(g, t, 0, 0, W, 460, 40, { len: 100, speed: 1500, col: 'rgba(255,255,255,.6)', seed: 77, inten: R });
  // Mina sits wet in the puddle (small), Dewey opens: FWOOMP
  mina(g, 300, 570, .5, { sit: 1, soak: lerp(1, .85, sun), look: [0, 6], brow: [0, 2], eye: t < CUE.fwoomp ? 'flat' : 'open', mouth: t < CUE.fwoomp ? 'wavy' : 'o', lh: [-120, -110], rh: [120, -110] });
  const op = clamp((t - CUE.fwoomp) / .45), ov = spring(op, 6, .5);
  dewey(g, 760, 515, .62, { open: op > 0 ? clamp(ov, 0, 1.1) : 0, mood: t > CUE.fwoomp ? 'smug' : 'no', ang: 0, tag: t > CUE.fwoomp ? Math.sin((t - CUE.fwoomp) * 7) * .15 * Math.exp(-(t - CUE.fwoomp) * .8) : 0 });
  c.over(gg => { const p = pop(t, CUE.fwoomp, .2); if (p > 0 && t < CUE.fwoomp + 2.4) { const S = sfxText(gg, { text: 'FWOOMP!', x: c.p.x + 830, y: c.p.y + 80, size: 140, rot: .1, fill: C.sun, pop: p, edge: C.cream, shake: Math.max(0, 6 - (t - CUE.fwoomp) * 14), tt: t }); if (S) c.repW('fwoomp', 'FWOOMP!', c.p.x + 830 - S.w / 2, c.p.y + 80 - 70, c.p.x + 830 + S.w / 2, c.p.y + 80 + 70); } });
}
const anchorSky = () => P.sky.y + 320 - 900;

// ================================================================ 8 · punchline
function punch(g, c) {
  const { t } = c, W = 1000, H = 1000;
  vg(g, 0, 0, W, H, [[0, C.sunSky], [.6, '#ffdcae'], [1, C.peach]]);
  burst(g, 700, 300, 260, 900, 28, 13, 'rgba(255,255,255,.55)', 14);
  g.fillStyle = 'rgba(27,35,64,.16)'; g.beginPath(); g.ellipse(520, 930, 480, 60, 0, 0, Math.PI * 2); g.fill();
  const ptw = Math.sin(t * 1.2) * .01;
  // Dewey, opened, right
  const sm = pop(t, CUE.said - .6, .5);
  dewey(g, 740, 700, .86, { open: 1, mood: t < CUE.bwip - .1 ? 'smug' : 'smug', ang: ptw, tag: Math.sin(t * 2.2) * .09 + .06, look: [-6 * sm, 4], blink: (t > 49 && t < 49.12) ? 1 : 0 });
  // Mina, soaked, deadpan
  const tw = (t > 48.6 && t < 48.8) ? 1 : 0;
  mina(g, 330, 960, 1.1, { soak: .9, look: [14, 2], brow: [t > CUE.said ? .3 : 0, -6 + tw * -8], eye: 'flat', mouth: t > CUE.said + .3 ? 'grit' : 'flat', lh: [-100, -170], rh: [160, -300], bob: Math.sin(t * 1.3) * 2, tilt: t > CUE.said + .4 ? -.05 : 0 });
  // the tag, enlarged in an inset
  const ti = pop(t, CUE.tagIn, .45);
  if (ti > 0) { g.save(); g.translate(150, 200); g.rotate(-.1); const sc = back(ti, 2); g.scale(sc, sc);
    ell(g, 0, 0, 150, 150, C.white, 6); rr(g, -92, -112, 184, 224, 14); fs(g, C.cream, 5); ell(g, 0, -90, 9, 9, C.page, 4);
    g.fillStyle = C.coral; g.font = `46px ${FONT_DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PARASOL', 0, -30);
    g.fillStyle = C.ink; g.font = `700 25px ${FONT_BODY}`; g.fillText('UV 50+', 0, 18); g.fillText('SUNNY DAYS', 0, 60); g.fillText('ONLY', 0, 88);
    g.restore(); if (t >= CUE.tagIn + .45) c.rep('tag', 'PARASOL UV 50+ SUNNY DAYS ONLY', { x0: 150 - 70, y0: 200 - 80, x1: 150 + 70, y1: 200 + 80 }); }
  if (t >= CUE.tagIn + .5) { const B = balloon(g, { text: "...IT'S A PARASOL.", x: 410, y: 320, tail: [350, 470], size: 46, maxW: 330, pop: pop(t, CUE.tagIn + .5, .3) }); c.rep('mina3', "...IT'S A PARASOL.", B); }
  if (t >= CUE.said) { const B = balloon(g, { text: 'I SAID NO.', x: 760, y: 150, tail: [760, 250], kind: 'small', size: 52, pop: pop(t, CUE.said, .22) }); c.rep('said', 'I SAID NO.', B); }
}

// ================================================================ 9 · cliffhanger
function cliff(g, c) {
  const { t } = c, W = 1000, H = 900, dry = ss(seg(t, 52, 56));
  vg(g, 0, 0, W, H, [[0, '#7f9bc2'], [1, '#b9cde2']]);
  for (let i = 0; i < 40; i++) { const sx = hash(i * 2) * W, sy = ((hash(i * 5) * H + t * 120 * (.5 + hash(i))) % (H + 40)) - 20; g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(sx + Math.sin(t * 1.3 + i) * 12, sy, 4 + hash(i) * 5, 0, Math.PI * 2); g.fill(); }   // hint of snow in the air
  g.fillStyle = '#e8eff6'; g.fillRect(0, 780, W, 140); g.fillStyle = C.ink; g.fillRect(0, 777, W, 5);
  const g1 = pop(t, CUE.phone, .45);
  mina(g, 300, 880, 1.0, { soak: .35 * (1 - dry), look: [20, 0], brow: [.3, 0], eye: t > CUE.phone ? 'squint' : 'flat', mouth: t > CUE.phone ? 'smirk' : 'flat', blush: 0, lh: [-96, -170], rh: [220, -300], elbow: [-1, 1], arm: 100, bob: Math.sin(t * 1.4) * 2 });
  // phone
  if (g1 > 0) { g.save(); g.translate(600, 450); g.rotate(-.07); g.scale(back(g1, 2), back(g1, 2));
    rr(g, -150, -250, 300, 500, 36); fs(g, C.ink, 5); rr(g, -132, -226, 264, 452, 22); g.fillStyle = '#cfe3f8'; g.fill(); vg(g, -132, -226, 264, 452, [[0, '#e8f3ff'], [1, '#bcd6f2']]);
    g.fillStyle = C.ink; g.font = `700 30px ${FONT_BODY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = '3px'; g.fillText('TOMORROW', 0, -170); g.letterSpacing = '0px';
    g.strokeStyle = '#4b83c6'; g.lineWidth = 8; g.lineCap = 'round'; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + t * .2; g.beginPath(); g.moveTo(Math.cos(a) * 12, -60 + Math.sin(a) * 12); g.lineTo(Math.cos(a) * 64, -60 + Math.sin(a) * 64); g.stroke(); const bx = Math.cos(a) * 40, by = -60 + Math.sin(a) * 40; g.beginPath(); g.moveTo(bx + Math.cos(a + 1) * 16, by + Math.sin(a + 1) * 16); g.lineTo(bx, by); g.lineTo(bx + Math.cos(a - 1) * 16, by + Math.sin(a - 1) * 16); g.stroke(); }
    g.fillStyle = '#4b83c6'; g.font = `112px ${FONT_DISPLAY}`; g.fillText('SNOW', 0, 100); g.fillStyle = C.ink; g.font = `700 24px ${FONT_BODY}`; g.fillText('-6° · ALL DAY', 0, 190);
    g.restore(); if (t >= CUE.phone + .45) { c.rep('ph1', 'TOMORROW', { x0: 500, y0: 262, x1: 700, y1: 298 }); c.rep('ph2', 'SNOW', { x0: 500, y0: 480, x1: 700, y1: 570 }); c.rep('ph3', '-6° · ALL DAY', { x0: 515, y0: 626, x1: 685, y1: 654 }); } }
  // Dewey, closed again, trying not to be noticed
  const tr = Math.sin(t * 28) * .02 * pop(t, CUE.phone + .3, .3);
  dewey(g, 850, 730, .72, { mood: t > CUE.phone ? 'shock' : 'smug', ang: .05 + tr, look: [-10, 6], squash: 1 + Math.sin(t * 28) * .01 });
  if (t > CUE.phone + .5) { sweat(g, 810, 300, 12); sweat(g, 900, 350, 10); }
  const n = narration(g, { text: 'TO BE CONTINUED...', x: 36, y: 36, size: 40, maxW: 500, slide: pop(t, CUE.cliffN, .4) }); if (t >= CUE.cliffN) c.rep('tbc', 'TO BE CONTINUED...', n);
  c.over(gg => { const p = pop(t, CUE.gulp, .2); if (p > 0 && t < CUE.gulp + 3) { const S = sfxText(gg, { text: 'GULP', x: c.p.x + 790, y: c.p.y + 160, size: 110, rot: .1, fill: C.sky2, pop: p, edge: C.slate, shake: 3, tt: t }); if (S) c.repW('gulp', 'GULP', c.p.x + 790 - S.w / 2, c.p.y + 160 - 55, c.p.x + 790 + S.w / 2, c.p.y + 160 + 55); } });
}

// ================================================================ 10 · the end bar (UI on the white page)
function star(g, x, y, r, fill, lw = 4) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } g.closePath(); fs(g, fill, lw); }
function heart(g, x, y, s, fill, lw = 5) { g.beginPath(); g.moveTo(x, y + s * .9); g.bezierCurveTo(x - s * 1.5, y - s * .1, x - s * .7, y - s * 1.1, x, y - s * .35); g.bezierCurveTo(x + s * .7, y - s * 1.1, x + s * 1.5, y - s * .1, x, y + s * .9); fs(g, fill, lw); }
function end(g, c) {
  const { t } = c, W = 1080, p0 = pop(t, CUE.endBar, .5), y0 = 60 + (1 - ss(p0)) * 120;
  if (p0 <= 0) return;
  g.save(); g.globalAlpha = clamp(p0 * 2);
  // next-episode card
  rr(g, 60, y0, 960, 270, 30); g.fillStyle = C.ink; g.fill(); rr(g, 52, y0 - 8, 960, 270, 30); fs(g, C.white, 5);
  rr(g, 80, y0 + 20, 230, 230, 22); fs(g, C.sky1, 5);
  g.save(); rr(g, 80, y0 + 20, 230, 230, 22); g.clip(); mina(g, 195, y0 + 240, .46, { lh: [-96, -170], rh: [96, -170], eye: 'wide', mouth: 'o', brow: [-.3, 0] }); g.restore();
  g.font = `700 28px ${FONT_BODY}`; g.fillStyle = C.coralSh; g.textAlign = 'left'; g.textBaseline = 'middle'; g.letterSpacing = '3px'; g.fillText('NEXT EPISODE', 346, y0 + 58); g.letterSpacing = '0px';
  g.font = `700 44px ${FONT_BODY}`; g.fillStyle = C.ink; g.fillText('Ep. 08 · The Raincoat', 346, y0 + 106); g.fillText('Has Opinions', 346, y0 + 156);
  rr(g, 346, y0 + 196, 190, 46, 23); fs(g, C.coral, 4); g.fillStyle = C.white; g.font = `700 26px ${FONT_BODY}`; g.textAlign = 'center'; g.fillText('READ NEXT  ▸', 441, y0 + 220);
  g.restore();
  if (p0 > .6) { c.rep('next1', 'NEXT EPISODE', { x0: 346, y0: y0 + 44, x1: 520, y1: y0 + 72 }); c.rep('next2', 'Ep. 08 · The Raincoat Has Opinions', { x0: 346, y0: y0 + 82, x1: 840, y1: y0 + 182 }); c.rep('next3', 'READ NEXT  ▸', { x0: 366, y0: y0 + 206, x1: 516, y1: y0 + 236 }); }
  // rating
  const yr = 420;
  g.font = `700 34px ${FONT_BODY}`; g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
  const rp = pop(t, CUE.star0 - .3, .4); g.globalAlpha = rp; g.fillText('How was this episode?', 540, yr); g.globalAlpha = 1;
  if (rp > .5) c.rep('rate', 'How was this episode?', { x0: 540 - 195, y0: yr - 20, x1: 540 + 195, y1: yr + 20 });
  for (let i = 0; i < 5; i++) { const sp = pop(t, CUE.star0 + i * .2, .3); star(g, 300 + i * 120, yr + 100, 50, '#e9e4d6', 5); if (sp > 0) { g.save(); g.translate(300 + i * 120, yr + 100); const sc = back(sp, 3); g.scale(sc, sc); star(g, 0, 0, 50, C.sun, 5); g.restore(); } }
  // like · comment · share
  const yl = 700, lp = pop(t, CUE.like, .35);
  heart(g, 270, yl, 46 * (1 + .25 * Math.sin(lp * Math.PI)), lp > .1 ? C.coral : '#e9e4d6');
  if (lp > 0 && lp < 1) burst(g, 270, yl, 70, 70 + 40 * lp, 10, 4, C.coral, 5);
  g.font = `700 36px ${FONT_BODY}`; g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText('12.4K', 330, yl);
  rr(g, 560, yl - 36, 74, 62, 18); fs(g, '#e9e4d6', 5); g.beginPath(); g.moveTo(580, yl + 26); g.lineTo(572, yl + 50); g.lineTo(604, yl + 26); g.fillStyle = '#e9e4d6'; g.fill(); ol(g, 5); g.fillStyle = C.ink; g.fillText('812', 654, yl);
  g.strokeStyle = C.ink; g.lineWidth = 6; g.beginPath(); g.moveTo(880, yl + 22); g.lineTo(880, yl - 14); g.quadraticCurveTo(880, yl - 20, 890, yl - 22); g.lineTo(950, yl - 22); g.moveTo(926, yl - 48); g.lineTo(956, yl - 22); g.lineTo(926, yl + 4); g.stroke();
  if (lp > .5) c.rep('likes', '12.4K', { x0: 330, y0: yl - 20, x1: 424, y1: yl + 20 }), c.rep('comments', '812', { x0: 654, y0: yl - 20, x1: 716, y1: yl + 20 });
  // subscribe
  const sp2 = pop(t, CUE.like + .5, .4), ys = 880; g.save(); g.translate(540, ys); const sc2 = back(sp2, 2); g.scale(sc2, sc2);
  rr(g, -330, -62, 660, 124, 62); g.fillStyle = C.ink; g.fill(); rr(g, -338, -70, 660, 124, 62); fs(g, C.coral, 5);
  g.font = `64px ${FONT_DISPLAY}`; g.fillStyle = C.white; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('+ SUBSCRIBE', -8, -8); g.restore();
  if (sp2 > .6) { c.rep('sub', '+ SUBSCRIBE', { x0: 540 - 210, y0: ys - 50, x1: 540 + 190, y1: ys + 34 }); }

  // more from the series: three picture-only tiles
  for (let k = 0; k < 3; k++) {
    const tp = pop(t, CUE.like + 1.1 + k * .18, .35); if (tp <= 0) continue; const tx = 60 + k * 330, ty = 1070;
    g.save(); g.translate(tx + 150, ty + 120); const sc = back(tp, 2); g.scale(sc, sc); g.translate(-150, -120);
    rr(g, 0, 0, 300, 240, 26); g.fillStyle = C.ink; g.fill(); g.save(); g.translate(-6, -6); rr(g, 0, 0, 300, 240, 26); fs(g, [C.sky1, C.sunSky, '#b8d9f2'][k], 5); g.clip();
    if (k === 0) dewey(g, 150, 290, .5, { mood: 'smug', ang: 0 });
    if (k === 1) mina(g, 150, 340, .55, { headOnly: true, eye: 'happy', mouth: 'smile', blush: 1 });
    if (k === 2) { g.strokeStyle = '#4b83c6'; g.lineWidth = 9; g.lineCap = 'round'; for (let q = 0; q < 6; q++) { const aa = q * Math.PI / 3; g.beginPath(); g.moveTo(150 + Math.cos(aa) * 14, 120 + Math.sin(aa) * 14); g.lineTo(150 + Math.cos(aa) * 78, 120 + Math.sin(aa) * 78); g.stroke(); } }
    g.restore(); g.restore();
  }}

export const DRAW = { title, hall, close, tug, walk, boots, stairs, sky, punch, cliff, end };
