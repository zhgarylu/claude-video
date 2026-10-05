// 博主背后的风格大字和角色：每个风格一种画法（水墨、油画、像素、霓虹、折纸），在画面上随口播出现，画在博主和翻牌板的后面。
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const h01 = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const TW = 1800, TH = 560;
const FONT = '"Noto Sans SC", Barlow, sans-serif';
function fit(g, text, weight, maxW, maxH, family = FONT) { g.font = `${weight} 400px ${family}`; const w = g.measureText(text).width; return Math.min(400 * maxW / w, maxH); }
function textMask(text, weight = 900, family = FONT) {
  const c = mk(TW, TH), g = c.getContext('2d'); const size = fit(g, text, weight, TW - 120, 470, family);
  g.font = `${weight} ${size}px ${family}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(text, TW / 2, TH / 2 + size * .04); return { c, size };
}
const KINDS = {
  ink(text) {
    const { c: m, size } = textMask(text), c = mk(TW, TH), g = c.getContext('2d');
    g.drawImage(m, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#15110e'; g.fillRect(0, 0, TW, TH); g.globalCompositeOperation = 'source-over';
    g.globalAlpha = .28; g.filter = 'blur(7px)'; g.drawImage(m, 0, 3); g.filter = 'none'; g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 320; i++) { const y = 30 + h01(i * 3.1) * (TH - 60), x = 40 + h01(i * 5.3) * (TW - 80), l = 50 + h01(i * 7.7) * 420, th = 1 + h01(i * 9.1) * 2.6; g.fillStyle = `rgba(0,0,0,${.35 + h01(i * 2.9) * .55})`; g.fillRect(x, y, l, th); }
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 70; i++) { const a = h01(i * 4.7) * 6.283, r = size * (.55 + h01(i * 6.1) * .55), x = TW / 2 + Math.cos(a) * r * 1.9, y = TH / 2 + Math.sin(a) * r * .8, rad = 1.5 + h01(i * 8.3) ** 3 * 9; g.fillStyle = 'rgba(21,17,14,.78)'; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); }
    return c;
  },
  oil(text) {
    const { c: m } = textMask(text), c = mk(TW, TH), g = c.getContext('2d'), pal = ['#e9b949', '#2b6cb0', '#d9482b', '#3a8f5c', '#f2e3c6', '#7a3b8f'];
    g.fillStyle = '#d9482b'; g.fillRect(0, 0, TW, TH);
    for (let i = 0; i < 1100; i++) { const x = h01(i * 1.9) * TW, y = h01(i * 3.3) * TH, w = 22 + h01(i * 5.1) * 30, l = 90 + h01(i * 7.3) * 170, a = -.62 + (h01(i * 9.7) - .5) * .5; g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = pal[Math.floor(h01(i * 11.3) * pal.length)]; g.globalAlpha = .9; g.fillRect(-l / 2, -w / 2, l, w); g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(-l / 2, -w / 2, l, 3); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-l / 2, w / 2 - 3, l, 3); g.restore(); }
    g.globalCompositeOperation = 'destination-in'; g.drawImage(m, 0, 0); g.globalCompositeOperation = 'destination-over'; g.filter = 'blur(2px)'; g.fillStyle = 'rgba(40,24,10,.55)'; g.drawImage(m, 5, 7); g.filter = 'none'; g.globalCompositeOperation = 'source-over';
    return c;
  },
  pixel(text) {
    const c = mk(TW, TH), g = c.getContext('2d'), sm = mk(1, 1); const hPx = 64, fs = 60; const sc = sm; sc.height = hPx + 8; const sg = sc.getContext('2d'); sg.font = `900 ${fs}px ${FONT}`; const wTxt = Math.ceil(sg.measureText(text).width) + 8; sc.width = wTxt;
    const sg2 = sc.getContext('2d'); sg2.font = `900 ${fs}px ${FONT}`; sg2.textBaseline = 'middle'; sg2.textAlign = 'center'; sg2.fillStyle = '#fff'; sg2.fillText(text, wTxt / 2, (hPx + 8) / 2 + 2);
    const px = sg2.getImageData(0, 0, wTxt, hPx + 8).data, k = Math.floor(Math.min((TW - 100) / wTxt, 470 / (hPx + 8))), ox = (TW - wTxt * k) / 2, oy = (TH - (hPx + 8) * k) / 2;
    const on = (x, y) => x >= 0 && y >= 0 && x < wTxt && y < hPx + 8 && px[(y * wTxt + x) * 4 + 3] > 120;
    for (let y = 0; y < hPx + 8; y++) for (let x = 0; x < wTxt; x++) {
      if (on(x, y)) { const u = y / (hPx + 8); g.fillStyle = u < .5 ? '#ff4fa3' : '#ffd23f'; g.fillRect(ox + x * k, oy + y * k, k, k); if (!on(x, y - 1)) { g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(ox + x * k, oy + y * k, k, Math.max(1, k * .25 | 0)); } }
      else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) { g.fillStyle = '#1a0f2e'; g.fillRect(ox + x * k, oy + y * k, k, k); }
    }
    return c;
  },
  neon(text) {
    const { c: m, size } = textMask(text, 900), c = mk(TW, TH), g = c.getContext('2d');
    g.font = `900 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const draw = (col, lw, blur) => { g.save(); g.shadowColor = col; g.shadowBlur = blur; g.strokeStyle = col; g.lineWidth = lw; g.strokeText(text, TW / 2, TH / 2 + size * .04); g.restore(); };
    draw('#ff2d95', 16, 50); draw('#ff2d95', 10, 22); draw('#ffd6ec', 4, 6); g.fillStyle = 'rgba(255,45,149,.10)'; g.fillText(text, TW / 2, TH / 2 + size * .04);
    return c;
  },
  origami(text) {
    const { c: m } = textMask(text), c = mk(TW, TH), g = c.getContext('2d'), pal = ['#e4604a', '#f4e9d0', '#2d4a7a', '#e9a23b'];
    const gx = 70, gy = 70; for (let y = -1; y < TH / gy + 1; y++) for (let x = -1; x < TW / gx + 1; x++) {
      const p = (i, j) => [i * gx + (h01(i * 7.1 + j * 3.7) - .5) * 34, j * gy + (h01(i * 2.3 + j * 9.1) - .5) * 34], a = p(x, y), b = p(x + 1, y), cc = p(x, y + 1), d = p(x + 1, y + 1);
      [[a, b, d], [a, d, cc]].forEach((t, q) => { const ci = Math.floor(h01(x * 5.3 + y * 8.9 + q) * 4), sh = (h01(x * 1.7 + y * 4.1 + q * 3) - .5) * .28; g.fillStyle = pal[ci]; g.beginPath(); g.moveTo(...t[0]); g.lineTo(...t[1]); g.lineTo(...t[2]); g.closePath(); g.fill(); g.fillStyle = sh > 0 ? `rgba(255,255,255,${sh})` : `rgba(0,0,0,${-sh})`; g.fill(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.6; g.stroke(); });
    }
    g.globalCompositeOperation = 'destination-in'; g.drawImage(m, 0, 0); g.globalCompositeOperation = 'destination-over'; g.filter = 'blur(3px)'; g.fillStyle = 'rgba(30,20,10,.5)'; g.drawImage(m, 4, 8); g.filter = 'none'; g.globalCompositeOperation = 'source-over';
    return c;
  },
  outline(text) {
    const { c: m, size } = textMask(text, 900), c = mk(TW, TH), g = c.getContext('2d'); g.font = `900 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const y = TH / 2 + size * .04; g.strokeStyle = 'rgba(8,12,20,.55)'; g.lineWidth = 16; g.strokeText(text, TW / 2, y); g.strokeStyle = '#f4f8fc'; g.lineWidth = 6; g.strokeText(text, TW / 2, y); g.fillStyle = 'rgba(244,248,252,.12)'; g.fillText(text, TW / 2, y);
    return c;
  },
  amber(text) {
    const { c: m, size } = textMask(text, 900, 'Barlow, "Noto Sans SC", sans-serif'), c = mk(TW, TH), g = c.getContext('2d');
    g.drawImage(m, 0, 0); g.globalCompositeOperation = 'source-in'; const gr = g.createLinearGradient(0, 0, 0, TH); gr.addColorStop(0, '#ffc95c'); gr.addColorStop(1, '#f08c12'); g.fillStyle = gr; g.fillRect(0, 0, TW, TH); g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(10,8,4,.8)'; g.fillRect(0, TH / 2 - 4, TW, 8); g.globalCompositeOperation = 'destination-over'; g.filter = 'blur(2px)'; g.fillStyle = 'rgba(8,10,14,.6)'; g.drawImage(m, 6, 9); g.filter = 'none'; g.globalCompositeOperation = 'source-over';
    return c;
  },
};
const CACHE = new Map();
export function styled(kind, text) {
  const k = kind + '|' + text; let r = CACHE.get(k);
  if (!r) {
    const c = KINDS[kind](text), s = mk(450, 140), sg = s.getContext('2d', { willReadFrequently: true }); sg.drawImage(c, 0, 0, 450, 140); const d = sg.getImageData(0, 0, 450, 140).data; let x0 = 450, y0 = 140, x1 = 0, y1 = 0;
    for (let y = 0; y < 140; y++) for (let x = 0; x < 450; x++) if (d[(y * 450 + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    r = { c, bb: { x0: x0 * 4, y0: y0 * 4, x1: (x1 + 1) * 4, y1: (y1 + 1) * 4 } }; CACHE.set(k, r);
  }
  return r;
}

// ───────── 角色（单位坐标，s 是大小）─────────
export const CREATURES = {
  inkCrane(g, t, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s); g.lineCap = 'round'; g.lineJoin = 'round'; const fl = Math.sin(t * 2.2) * .12;
    const ink = a => `rgba(18,14,11,${a})`;
    g.fillStyle = ink(.9); g.beginPath(); g.ellipse(0, 0, .5, .26, -.18, 0, 7); g.fill();
    g.strokeStyle = ink(.9); g.lineWidth = .06; g.beginPath(); g.moveTo(.38, -.08); g.bezierCurveTo(.62, -.2, .5, -.5, .62, -.78); g.stroke();
    g.lineWidth = .028; g.beginPath(); g.moveTo(.62, -.78); g.lineTo(.84, -.74); g.stroke(); g.fillStyle = '#d4281c'; g.beginPath(); g.arc(.62, -.82, .035, 0, 7); g.fill();
    g.strokeStyle = ink(.85); g.lineWidth = .016; g.beginPath(); g.moveTo(.04, .22); g.lineTo(.0, .78); g.moveTo(.16, .2); g.lineTo(.2, .78); g.stroke();
    for (const [k, w] of [[1, .07], [.6, .045]]) { g.strokeStyle = ink(.8 * k); g.lineWidth = w; g.beginPath(); g.moveTo(-.1, -.16); g.bezierCurveTo(.1, -.7 - fl, .5, -.95 - fl, .9, -.6 - fl * .5); g.stroke(); g.beginPath(); g.moveTo(-.4, -.05); g.lineTo(-.95, .1); g.stroke(); }
    g.restore();
  },
  pixelCat(g, t, x, y, s) {
    const rows = ['................', '..KK........KK..', '.KOOK......KOOK.', '.KOOOKKKKKKOOOK.', '.KOOOOOOOOOOOOK.', '.KOOGKOOOOKGOOK.', '.KOOOOOPPOOOOOK.', '.KOOOOOKKOOOOOK.', '..KOOOOOOOOOOK..', '..KOOOOOOOOOOKKK', '.KOOOOOOOOOOOKOK', '.KOOOOOOOOOOOOOK', '.KOWOKOOOOKOWOK.', '..KKK.KKKK.KKK..'];
    const pal = { K: '#1a1411', O: '#f08a3c', G: '#7ed957', P: '#ff8fb1', W: '#fff3e0' }, k = s / 16 * 1.7, bob = Math.round(Math.sin(t * 4) * .5) * k, blink = Math.floor(t * 1.4) % 5 === 0 && (t * 1.4 % 1) < .12;
    g.save(); g.translate(x - 8 * k, y - 14 * k + bob);
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '.') return; let c = pal[ch]; if (blink && ch === 'G') c = pal.O; g.fillStyle = c; g.fillRect(i * k, j * k, k + .6, k + .6); }));
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(1 * k, 14 * k, 14 * k, k * .6); g.restore();
  },
  neonFish(g, t, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s); g.lineJoin = 'round'; const wag = Math.sin(t * 5) * .12, fl = .85 + .15 * Math.sin(t * 17 + 3) * (Math.sin(t * 3.1) > .7 ? 1 : .2);
    const path = () => { g.beginPath(); g.ellipse(0, 0, .6, .33, 0, 0, 7); g.moveTo(-.55, 0); g.lineTo(-.98, -.3 + wag); g.lineTo(-.98, .3 + wag); g.closePath(); g.moveTo(.35, -.04); g.arc(.35, -.04, .045, 0, 7); g.moveTo(-.1, -.3); g.quadraticCurveTo(0, -.5, .18, -.31); g.moveTo(.0, .32); g.quadraticCurveTo(.08, .5, .22, .3); };
    for (const [col, lw, bl] of [['#19e3ff', .07, 40], ['#19e3ff', .04, 14], ['#e8fcff', .016, 4]]) { g.save(); g.globalAlpha = fl; g.shadowColor = col; g.shadowBlur = bl * s / 100; g.strokeStyle = col; g.lineWidth = lw; path(); g.stroke(); g.restore(); }
    g.restore();
  },
  origamiCrane(g, t, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s); const fl = Math.sin(t * 2) * .22, tri = (a, b, c, col, sh = 0) => { g.fillStyle = col; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c); g.closePath(); g.fill(); if (sh) { g.fillStyle = sh > 0 ? `rgba(255,255,255,${sh})` : `rgba(0,0,0,${-sh})`; g.fill(); } g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = .012; g.stroke(); };
    tri([-.1, -.25], [.2, -.95 - fl], [.58, -.12], '#7d93b8'); tri([-.5, 0], [0, -.3], [0, .3], '#e4604a', -.08); tri([.5, 0], [0, -.3], [0, .3], '#f4e9d0', .0);
    tri([.42, -.1], [.95, -.62], [.55, .05], '#e9a23b', .06); tri([.95, -.62], [1.15, -.55], [.99, -.5], '#2d4a7a'); tri([-.5, 0], [-1.08, -.26], [-.42, -.08], '#e4604a', .1);
    tri([-.05, -.28], [.3, -.92 + fl], [.52, -.08], '#f4e9d0', .04); g.restore();
  },
  clayChick(g, t, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s); const q = Math.sin(t * 3.2) * .04, sx = 1 + q, sy = 1 - q;
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(0, .55, .55, .09, 0, 0, 7); g.fill(); g.save(); g.translate(0, .5); g.scale(sx, sy); g.translate(0, -.5);
    const gr = g.createRadialGradient(-.15, -.2, .05, 0, 0, .7); gr.addColorStop(0, '#ffe27a'); gr.addColorStop(1, '#e4a82a'); g.fillStyle = gr; g.beginPath(); g.ellipse(0, .1, .52, .5, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(-.18, -.02, .11, 0, 7); g.arc(.18, -.02, .11, 0, 7); g.fill(); g.fillStyle = '#2b2420'; g.beginPath(); g.arc(-.17, -.0, .05, 0, 7); g.arc(.19, -.0, .05, 0, 7); g.fill();
    g.fillStyle = '#f08a3c'; g.beginPath(); g.moveTo(-.07, .12); g.lineTo(.07, .12); g.lineTo(0, .24); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,130,120,.5)'; g.beginPath(); g.ellipse(-.3, .12, .07, .045, 0, 0, 7); g.ellipse(.3, .12, .07, .045, 0, 0, 7); g.fill();
    g.restore(); g.restore();
  },
};
