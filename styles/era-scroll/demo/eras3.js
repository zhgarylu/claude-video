// Era painters, part 3: 1973 pop street, 1992 monochrome LCD pixels, today's flat desk, the phone and the gallery of thumbnails.
import { clamp, lerp, seg, ss, eo, back, hash, vnoise, TAU } from '/core/lib.js';
import { W, H, GY, WSX, bake, hex, mixc, rgba, rr, blob, noiseTile, texFill, vignette, tagCard, bell } from './scroll.js';
import { lxAfter, V, ev, T, B, C, TS, T_LIFT, T_GRID, T_END, WX_END, BEAT } from './timeline.js';
import { handSprite } from './eras1.js';

const TX = (g, s, x, y, o = {}) => { g.save(); g.font = o.font || '700 28px "Noto Sans SC"'; g.fillStyle = o.fill || '#000'; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic'; g.fillText(s, x, y); g.restore(); };

// =================================================================== 7. 1973 STREET (flat pop: sunburst, orange / mustard / avocado / brown)
const P7 = { orange: '#e8742a', mustard: '#eab62f', avo: '#7d8c2f', brown: '#5b3a29', cream: '#f6e7bf', teal: '#2e7f7a', red: '#c63d2f', sky: '#f4d98f', sky2: '#f1b45c' };
function daisy(g, s, col, col2) { g.fillStyle = col; for (let k = 0; k < 8; k++) { g.save(); g.rotate(k / 8 * TAU); g.beginPath(); g.ellipse(0, -s * .62, s * .22, s * .42, 0, 0, TAU); g.fill(); g.restore(); } g.fillStyle = col2; g.beginPath(); g.arc(0, 0, s * .28, 0, TAU); g.fill(); }
function brickPhone(g, ant, scale = 1) {                    // the chunky handset with a pull-out aerial
  g.save(); g.scale(scale, scale); g.lineWidth = 4; g.strokeStyle = P7.brown;
  g.fillStyle = '#cfd0c2'; g.beginPath(); rr(g, -17, -80, 34, 156, 8); g.fill(); g.stroke();
  g.fillStyle = P7.brown; g.fillRect(-8, -70, 16, 5); g.fillStyle = '#f2f6c8'; g.fillRect(-11, -58, 22, 12); g.strokeRect(-11, -58, 22, 12);
  g.fillStyle = P7.brown; for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) { g.beginPath(); g.arc(-9 + q * 9, -28 + r * 14, 3, 0, TAU); g.fill(); }
  g.fillStyle = P7.red; g.beginPath(); g.arc(0, 40, 5, 0, TAU); g.fill();
  g.lineWidth = 5; g.beginPath(); g.moveTo(10, -80); g.lineTo(10, -80 - 28 - 60 * ant); g.stroke(); g.fillStyle = P7.brown; g.beginPath(); g.arc(10, -80 - 28 - 60 * ant, 5, 0, TAU); g.fill();
  g.restore();
}
const PHONE_BOOTH_X = lxAfter(5.4) + 520;
export const brick = {
  id: 'brick', paper: P7.sky, rim: '#fbf0d0', camLx: 1100,
  gags: [{ x: lxAfter(1.6), len: 900 }, { x: lxAfter(5.6), len: 520 }],
  walk: { id: 'brick', pal: { scarf: '#c63d2f', cap: '#7d8c2f', coat: '#2e7f7a', skin: '#f0bd88', skin2: '#d89c66', pants: '#8a5a34', pants2: '#6c4326', shoe: '#3a2415' }, line: '#3a2415', lw: 6, rim: '#f6e7bf', rw: 2.5, ramp: ['#3a2415', '#c8531e', '#e9a52b', '#f6e3b0'] },
  step: 'stone', push: { b0: 2.0, b1: 5.0, z: 1.2 },
  burst: { n: 40, size: 28, g: 240, spin: 2, draw: (g, s, i, p, r) => { g.save(); g.scale(1, 1); daisy(g, s * 1.3, [P7.orange, P7.mustard, P7.cream, P7.avo][i % 4], i % 2 ? P7.brown : P7.red); g.restore(); } },
  token: (g) => tagCard(g, { fill: P7.mustard, line: P7.brown, w: 56, h: 66, r: 12 }, (g) => { g.fillStyle = P7.brown; g.beginPath(); g.arc(0, 0, 17, 0, TAU); g.fill(); g.fillStyle = P7.cream; for (let k = 0; k < 8; k++) { g.save(); g.rotate(k / 8 * TAU); g.fillRect(-2.5, -15, 5, 11); g.restore(); } g.fillStyle = P7.orange; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill(); }),
  pose(c) {
    const p0 = c.gp(0), call = bell(p0, .08, .22, .8, .93), p1 = c.gp(1);
    return { armN: call > .001 ? { x: 640 + 34, y: GY - 292, w: call } : null, look: -.08 * call + -.22 * bell(p1, .1, .3, .7, 1), mouth: call, lean: -.04 * call };
  },
  held(g, c, J) {
    const p0 = c.gp(0), out = ss(seg(p0, .05, .2)) * (1 - ss(seg(p0, .84, .96))); if (out <= 0) return;
    const hand = J.aN.H, bagP = J.bag, ant = ss(seg(p0, .2, .38)) * (1 - ss(seg(p0, .8, .88)));
    const x = lerp(bagP[0], hand[0] + 6, ss(seg(p0, .05, .2))), y = lerp(bagP[1], hand[1] - 40, ss(seg(p0, .05, .2)));
    g.save(); g.translate(x, y); g.rotate(.18 * out); brickPhone(g, ant, .62 + .38 * out); g.restore();
    // waves: concentric arcs thrown from the aerial, 70s thick bands
    if (p0 > .3 && p0 < .88) { const tipx = x + 4, tipy = y - (80 + 28 + 60 * ant) * (.62 + .38 * out) * .98; for (let k = 0; k < 4; k++) { const u = ((c.t * 1.3 + k / 4) % 1), r = 30 + u * 190; g.strokeStyle = [P7.orange, P7.mustard, P7.red, P7.avo][k]; g.globalAlpha = (1 - u) * .95; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.arc(tipx, tipy, r, -1.15, -.1); g.stroke(); } g.globalAlpha = 1; }
  },
  bg(g, c) {
    const t = c.t;
    g.fillStyle = P7.sky; g.fillRect(0, 0, W, H);
    const sg = g.createLinearGradient(0, 300, 0, 760); sg.addColorStop(0, 'rgba(241,180,92,0)'); sg.addColorStop(1, 'rgba(241,180,92,1)'); g.fillStyle = sg; g.fillRect(0, 300, W, 460);
    // sunburst rays (very slow turn) around a low sun, plus the rainbow arcs
    c.at(g, .12, () => {
      g.save(); g.translate(1300 - c.X(0, .12) * 0, 700); g.rotate(t * .015);
      for (let k = 0; k < 28; k++) { g.fillStyle = k % 2 ? 'rgba(234,182,47,.35)' : 'rgba(232,116,42,.22)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 1700, k / 28 * TAU, (k + 1) / 28 * TAU); g.closePath(); g.fill(); }
      g.restore();
    });
    g.fillStyle = P7.orange; g.beginPath(); g.arc(1300, 700, 150, Math.PI, 0); g.fill(); g.fillStyle = P7.red; g.beginPath(); g.arc(1300, 700, 100, Math.PI, 0); g.fill(); g.fillStyle = P7.mustard; g.beginPath(); g.arc(1300, 700, 50, Math.PI, 0); g.fill();
    // far skyline
    c.at(g, .35, (a, b) => { for (let i = Math.floor(a / 120) - 1; i < b / 120 + 1; i++) { const h = 150 + hash(i * 3.3) * 330, w = 100 + hash(i * 5.1) * 30, x = i * 120; g.fillStyle = ['#a4562a', '#7a4a2c', '#b86a32', '#8d5a3a'][Math.abs(i) % 4]; g.fillRect(x, 700 - h, w, h + 100); g.fillStyle = 'rgba(246,231,191,.45)'; for (let r = 0; r < h / 40; r++) for (let q = 0; q < 3; q++) if (hash(i * 7 + r * 3 + q) > .4) g.fillRect(x + 12 + q * 30, 700 - h + 14 + r * 40, 16, 22); } }, 100);
    // water tower
    c.at(g, .5, (a, b) => { for (let i = Math.floor(a / 1700) - 1; i < b / 1700 + 1; i++) { const x = i * 1700 + 900; g.fillStyle = P7.brown; g.fillRect(x - 50, 470, 8, 170); g.fillRect(x + 42, 470, 8, 170); g.fillStyle = '#8a5530'; g.fillRect(x - 54, 330, 108, 140); g.fillStyle = P7.brown; g.beginPath(); g.moveTo(x - 62, 330); g.lineTo(x, 280); g.lineTo(x + 62, 330); g.fill(); for (let k = 0; k < 3; k++) g.fillRect(x - 54, 360 + k * 40, 108, 5); } }, 100);
    // brownstones with stoops (mid plane)
    c.at(g, .8, (a, b) => {
      for (let i = Math.floor(a / 420) - 1; i < b / 420 + 1; i++) {
        const x = i * 420, h = 330 + hash(i * 4.4) * 120, col = [P7.orange, '#a85a30', P7.teal, '#8a5530', P7.avo][Math.abs(i) % 5];
        g.fillStyle = col; g.fillRect(x, 830 - h, 400, h); g.fillStyle = P7.brown; g.fillRect(x - 4, 830 - h - 18, 408, 22);
        for (let r = 0; r < Math.floor(h / 120); r++) for (let q = 0; q < 3; q++) { const wx = x + 36 + q * 120, wy = 830 - h + 44 + r * 120, lit = hash(i * 9 + r * 4 + q) > .45; g.fillStyle = lit ? P7.mustard : '#3a2a22'; g.fillRect(wx, wy, 66, 84); g.fillStyle = P7.brown; g.fillRect(wx - 5, wy - 8, 76, 8); if (lit) { g.fillStyle = 'rgba(246,231,191,.4)'; g.fillRect(wx, wy, 14, 84); } g.fillRect(wx + 32, wy, 3, 84); }
        g.fillStyle = P7.brown; g.fillRect(x + 150, 830 - 110, 100, 110); g.fillStyle = P7.cream; for (let s = 0; s < 4; s++) g.fillRect(x + 140 - s * 6, 830 - 22 - s * 22 + 22, 120 + s * 12, 6);
      }
    }, 100);
    // pavement, curb, road, a yellow cab rolling along
    c.at(g, 1, (a, b) => {
      g.fillStyle = '#e6cf98'; g.fillRect(a, 830, b - a, 110); g.fillStyle = 'rgba(91,58,41,.35)'; for (let i = Math.floor(a / 140) - 1; i < b / 140 + 1; i++) g.fillRect(i * 140, 830, 4, 110);
      g.fillStyle = P7.brown; g.fillRect(a, 940, b - a, 14); g.fillStyle = '#4a352a'; g.fillRect(a, 954, b - a, H - 954); g.fillStyle = P7.mustard; for (let i = Math.floor(a / 200) - 1; i < b / 200 + 1; i++) g.fillRect(i * 200 + 20, 1020, 110, 8);
      const cx = ((c.t * 210 + 600) % 3400) - 500 + Math.floor(c.cam / 3400) * 3400 * 0; const world = c.cam + (cx - 300);
      const cabx = ((c.t * 230) % 3600) + Math.floor((c.wlx + 300) / 3600) * 3600 - 3600 + 400 - 0;
      const bob = Math.sin(c.t * 12) * 1.5; g.save(); g.translate(cabx + 400, 1000 + bob); g.fillStyle = P7.mustard; g.strokeStyle = P7.brown; g.lineWidth = 5; g.beginPath(); rr(g, -150, -62, 300, 52, 16); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-70, -62); g.lineTo(-48, -108); g.lineTo(60, -108); g.lineTo(96, -62); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#bfe3dc'; g.beginPath(); g.moveTo(-58, -68); g.lineTo(-40, -100); g.lineTo(2, -100); g.lineTo(2, -68); g.closePath(); g.fill(); g.beginPath(); g.moveTo(14, -68); g.lineTo(14, -100); g.lineTo(54, -100); g.lineTo(82, -68); g.closePath(); g.fill(); g.fillStyle = P7.brown; for (let k = 0; k < 10; k++) if (k % 2) g.fillRect(-140 + k * 28, -36, 28, 10); g.fillStyle = P7.cream; g.fillRect(-14, -124, 40, 16); g.strokeRect(-14, -124, 40, 16);
      for (const wxx of [-90, 90]) { g.fillStyle = P7.brown; g.beginPath(); g.arc(wxx, -10, 25, 0, TAU); g.fill(); g.fillStyle = P7.cream; g.beginPath(); g.arc(wxx, -10, 11, 0, TAU); g.fill(); } g.restore();
    });
    // street furniture, and a payphone booth the courier walks past
    c.at(g, 1, (a, b) => {
      for (let i = Math.floor(a / 900) - 1; i < b / 900 + 1; i++) { const x = i * 900 + 330; g.fillStyle = P7.brown; g.fillRect(x - 5, 540, 10, 292); g.fillStyle = P7.cream; g.beginPath(); g.ellipse(x, 530, 34, 18, 0, 0, TAU); g.fill(); g.lineWidth = 4; g.strokeStyle = P7.brown; g.stroke(); const hx = x + 500; g.fillStyle = P7.red; g.fillRect(hx - 16, 770, 32, 62); g.beginPath(); g.arc(hx, 770, 16, Math.PI, 0); g.fill(); g.fillRect(hx - 24, 786, 48, 10); }
      const bx = PHONE_BOOTH_X; g.save(); g.translate(bx, 0); g.fillStyle = 'rgba(191,227,220,.5)'; g.fillRect(-60, 560, 120, 272); g.lineWidth = 8; g.strokeStyle = P7.red; g.strokeRect(-60, 560, 120, 272); g.fillStyle = P7.red; g.fillRect(-72, 540, 144, 28); g.fillStyle = P7.cream; g.font = '700 20px "Noto Sans SC"'; g.textAlign = 'center'; g.fillText('TEL', 0, 562);
      const sw = Math.sin((c.wlx - (bx - 200)) / 70) * (c.wlx > bx - 360 && c.wlx < bx + 120 ? .5 : 0); g.save(); g.translate(30, 640); g.rotate(sw); g.strokeStyle = P7.brown; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(10, 60, -8, 90); g.stroke(); g.fillStyle = P7.brown; g.fillRect(-8, 78, 22, 40); g.restore(); g.restore();
    });
    // pigeons: they scatter when the courier gets close
    const g1 = this.gags[1];
    c.at(g, 1, () => {
      for (let i = 0; i < 6; i++) {
        const px = g1.x + 260 + i * 60, q = (c.wlx - (px - 190)) / V, fly = q > 0, u = Math.max(0, q), y = 828 - (fly ? Math.min(u, 1.8) * 190 + u * u * 24 : 0), x = px + (fly ? u * 150 * (.6 + hash(i)) : 0);
        g.save(); g.translate(x, y); g.fillStyle = i % 2 ? '#8e9296' : '#b9bcc0'; g.beginPath(); g.ellipse(0, -16, 20, 13, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(18, -28, 8, 0, TAU); g.fill(); g.fillStyle = P7.orange; g.beginPath(); g.moveTo(25, -28); g.lineTo(34, -26); g.lineTo(25, -24); g.fill();
        g.fillStyle = i % 2 ? '#6e7276' : '#9a9da1'; const fl = fly ? Math.sin(u * 40 + i) * 22 : 0; g.beginPath(); g.moveTo(-4, -22); g.lineTo(-16, -44 - fl); g.lineTo(8, -22); g.fill(); if (!fly) { g.fillRect(-4, -4, 2.5, 8); g.fillRect(6, -4, 2.5, 8); } g.restore();
      }
    });
    vignette(g, .12);
  },
  events(k) { const g0 = this.gags[0], g1 = this.gags[1]; ev(T(k, g0.x + g0.len * .22), 'brickpull', .9); ev(T(k, g0.x + g0.len * .38), 'antenna', .8); ev(T(k, g0.x + g0.len * .5), 'dial', .8); ev(T(k, g0.x + g0.len * .62), 'ringback', .8); ev(T(k, PHONE_BOOTH_X - 120), 'bell', .5); ev(T(k, g1.x + 70), 'pigeon', .9); },
};

// =================================================================== 8. 1992 LCD (four greens, 4 px pixels, snow)
const LC = ['#0f2214', '#2d4f33', '#7ba14c', '#cfe39a'];
let LOW = null;
function low(g, fn, grid = false) {                          // draw in a 480x270 canvas, scale up with no smoothing
  if (!LOW) { LOW = document.createElement('canvas'); LOW.width = 480; LOW.height = 270; }
  const lg = LOW.getContext('2d'); lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, 480, 270); lg.imageSmoothingEnabled = false; fn(lg);
  g.save(); g.imageSmoothingEnabled = false; g.drawImage(LOW, 0, 0, 1920, 1080); g.restore();
}
const px = (c, lx, k = 1) => Math.round(c.X(lx, k) / 4);
const SM = { wire: null };
const MAST_X = lxAfter(1.7) + 760, HOUSE_X = lxAfter(1.7) + 1600;
const SMS_TEXT = 'MERRY CHRISTMAS';
function pxRect(lg, x, y, w, h, col) { lg.fillStyle = col; lg.fillRect(x | 0, y | 0, w | 0, h | 0); }
function house(lg, x, y, w, h, c0, roof, lit, snow = true) { pxRect(lg, x, y - h, w, h, c0); for (let i = 0; i < w / 2; i++) { const hh = Math.floor(i * (14 / (w / 2))); pxRect(lg, x + i, y - h - hh, 1, hh + 1, roof); pxRect(lg, x + w - 1 - i, y - h - hh, 1, hh + 1, roof); } if (snow) { for (let i = 0; i < w / 2; i += 1) { const hh = Math.floor(i * (14 / (w / 2))); pxRect(lg, x + i, y - h - hh - 1, 1, 2, LC[3]); pxRect(lg, x + w - 1 - i, y - h - hh - 1, 1, 2, LC[3]); } } if (lit) { pxRect(lg, x + 5, y - h + 8, 7, 9, LC[3]); pxRect(lg, x + w - 13, y - h + 8, 7, 9, LC[3]); } else { pxRect(lg, x + 5, y - h + 8, 7, 9, LC[1]); } pxRect(lg, x + w / 2 - 3, y - 10, 6, 10, LC[0]); }
function tree(lg, x, y, h, lights, t) { for (let r = 0; r < 4; r++) { const w = 7 + r * 5; for (let k = 0; k < 7; k++) pxRect(lg, x - w + k * (2 * w / 7) | 0, y - h + r * 8 + k * 0, 2 * w / 7 + 1, 8 - 0, LC[0]); } for (let r = 0; r < 4; r++) { const w = 5 + r * 5; pxRect(lg, x - w, y - h + r * 8 + 4, w * 2, 6, LC[0]); } pxRect(lg, x - 2, y - 4, 4, 5, LC[1]); if (lights) for (let i = 0; i < 5; i++) if (((Math.floor(t * 2) + i) % 2) === 0) pxRect(lg, x - 6 + i * 3 + (i % 2) * 2, y - h + 8 + i * 5, 2, 2, LC[3]); }
const SNOWMAN_X = lxAfter(6.4) + 260;
export const sms = {
  id: 'sms', paper: '#c3d98c', rim: '#e6f1c8', camLx: 1100,
  gags: [{ x: lxAfter(1.7), len: 1100 }, { x: lxAfter(6.4), len: 500 }],
  walk: { id: 'sms', pixel: 4, line: LC[0], lw: 3, rim: LC[3], rw: 5, ramp: LC },
  step: 'snow', push: { b0: 2.0, b1: 4.8, z: 1.2 },
  burst: { n: 60, size: 10, g: 300, spin: 0, draw: (g, s, i, p, r) => { g.fillStyle = LC[2 + (i % 2)]; const q = Math.max(4, Math.round(s / 4) * 4); g.fillRect(-q / 2, -q / 2, q, q); } },
  token: (g) => tagCard(g, { fill: LC[3], line: LC[0], w: 56, h: 64, r: 2 }, (g) => { g.fillStyle = LC[0]; g.fillRect(-16, -10, 32, 22); g.strokeStyle = LC[3]; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-16, -10); g.lineTo(0, 4); g.lineTo(16, -10); g.stroke(); }),
  pose(c) {
    const p0 = c.gp(0), type = bell(p0, .04, .12, .8, .9), p1 = c.gp(1), nod = bell(p1, .1, .3, .6, .9);
    return { armN: type > .001 ? { x: 640 + 62, y: GY - 196, w: type } : null, look: .22 * type - .2 * nod, lean: .08 * type, mouth: type + nod, brow: -3 * type };
  },
  held(g, c, J) {
    const p0 = c.gp(0), out = ss(seg(p0, .02, .1)) * (1 - ss(seg(p0, .84, .94))); if (out <= 0) return;
    const hand = J.aN.H;
    low(g, lg => { const x = Math.round((hand[0] + 6) / 4), y = Math.round((hand[1] - 22) / 4); pxRect(lg, x - 6, y - 12, 12, 24, LC[0]); pxRect(lg, x - 5, y - 11, 10, 22, LC[2]); pxRect(lg, x - 4, y - 10, 8, 6, LC[3]); for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) pxRect(lg, x - 4 + q * 3, y - 2 + r * 3, 2, 2, LC[0]); });
  },
  bg(g, c) {
    const t = c.t, cam4 = Math.round(c.cam / 4);
    low(g, lg => {
      pxRect(lg, 0, 0, 480, 270, LC[1]);
      for (let y = 100; y < 200; y += 2) for (let x = (y / 2) % 2 * 2; x < 480; x += 4) pxRect(lg, x, y, 1, 1, LC[2]);          // dithered horizon haze
      for (let i = 0; i < 70; i++) { const x = Math.floor(hash(i * 3.7) * 480), y = Math.floor(hash(i * 5.3) * 120); if (((Math.floor(t * 1.5) + i) % 5) !== 0) pxRect(lg, x, y, 1, 1, LC[3]); }
      lg.fillStyle = LC[3]; lg.beginPath(); lg.arc(92, 46, 14, 0, TAU); lg.fill(); lg.fillStyle = LC[1]; lg.beginPath(); lg.arc(99, 42, 12, 0, TAU); lg.fill();
      // far hills
      for (let x = 0; x < 480; x++) { const wx = (x * 4 + c.cam * .3), h = 70 + 26 * vnoise(wx / 520) + 10 * vnoise(wx / 130); pxRect(lg, x, 208 - h, 1, h, LC[0]); if (x % 2 === 0) pxRect(lg, x, 208 - h, 1, 3, LC[2]); }
      // town (mid)
      for (let i = Math.floor((c.vis(.6, 0)[0]) / 130) - 1; i < c.vis(.6, 0)[1] / 130 + 1; i++) { const x = px(c, i * 130 + 20, .6), kind = Math.abs(i) % 3; if (kind === 0) house(lg, x, 208, 40, 34, LC[0], LC[0], hash(i) > .4); else if (kind === 1) tree(lg, x + 10, 208, 44, true, t); else { house(lg, x, 208, 30, 52, LC[0], LC[0], true); pxRect(lg, x + 13, 208 - 74, 4, 14, LC[0]); pxRect(lg, x + 10, 208 - 70, 10, 3, LC[0]); } }
      // ground: deep snow with a dithered edge
      pxRect(lg, 0, 208, 480, 62, LC[3]); for (let x = 0; x < 480; x += 2) pxRect(lg, x, 207 + (x / 2 % 2), 2, 2, LC[2]); for (let y = 226; y < 270; y += 6) for (let x = ((y / 6) % 2) * 5 + cam4 % 10; x < 480; x += 10) pxRect(lg, x, y, 3, 1, LC[2]);
      // trees and fence near the path
      for (let i = Math.floor(c.vis(1, 0)[0] / 280) - 1; i < c.vis(1, 0)[1] / 280 + 1; i++) { const x = px(c, i * 280 + 90), s = hash(i * 3.3); if (s > .5) tree(lg, x, 206, 56 + Math.floor(s * 24), false, t); else { for (let k = 0; k < 8; k++) { pxRect(lg, x + k * 6, 196, 2, 12, LC[0]); } pxRect(lg, x, 198, 46, 2, LC[0]); pxRect(lg, x, 203, 46, 2, LC[0]); } }
      // gag props: the mast, the far house, the snowman
      const mx = px(c, MAST_X), my = 206; pxRect(lg, mx - 1, my - 120, 3, 120, LC[0]); for (let k = 0; k < 10; k++) { const w = 12 - k; pxRect(lg, mx - w, my - 14 - k * 11, 1, 11, LC[0]); pxRect(lg, mx + w + 1, my - 14 - k * 11, 1, 11, LC[0]); pxRect(lg, mx - w, my - 14 - k * 11, w * 2 + 2, 1, LC[0]); } if (Math.floor(t * 2) % 2 === 0) pxRect(lg, mx - 1, my - 124, 3, 3, LC[3]);
      house(lg, px(c, HOUSE_X), 208, 56, 46, LC[0], LC[0], false);
      const sx = px(c, SNOWMAN_X), q = c.gp(1), nod = Math.sin(clamp(q * 3) * Math.PI) * 3 * (q > 0 && q < .4 ? 1 : 0);
      lg.fillStyle = LC[0]; lg.beginPath(); lg.arc(sx, 196, 12, 0, TAU); lg.fill(); lg.fillStyle = LC[3]; lg.beginPath(); lg.arc(sx, 196, 10, 0, TAU); lg.fill(); lg.fillStyle = LC[0]; lg.beginPath(); lg.arc(sx, 178 + nod, 9, 0, TAU); lg.fill(); lg.fillStyle = LC[3]; lg.beginPath(); lg.arc(sx, 178 + nod, 7, 0, TAU); lg.fill(); pxRect(lg, sx - 6, 168 + nod, 12, 2, LC[0]); pxRect(lg, sx - 4, 160 + nod, 8, 8, LC[0]); pxRect(lg, sx + 1, 178 + nod, 6, 2, LC[2]); pxRect(lg, sx - 3, 176 + nod, 1, 1, LC[0]); pxRect(lg, sx + 1, 176 + nod, 1, 1, LC[0]);
    });
    // LCD pixel grid (thin dark lines every 4 px)
    const gridT = bake('lcdgrid', 4, 4, (gg) => { gg.fillStyle = 'rgba(15,34,20,.16)'; gg.fillRect(0, 3, 4, 1); gg.fillRect(3, 0, 1, 4); });
    g.save(); g.fillStyle = g.createPattern(gridT, 'repeat'); g.fillRect(0, 0, W, H); g.restore();
  },
  fg(g, c) {
    const t = c.t, g0 = this.gags[0], p0 = c.gp(0);
    // the text box, the envelope and its path to the far house
    const tf = ss(seg(p0, .12, .16)) * (1 - ss(seg(p0, .88, .94)));
    low(g, lg => {
      // snow in front
      for (let i = 0; i < 90; i++) { const sp = 18 + hash(i * 2.1) * 24, x = Math.floor(((hash(i * 7.3) * 560 - c.cam * (.05 + hash(i) * .1) / 4 + Math.sin(t * .8 + i) * 6) % 480 + 480) % 480), y = Math.floor(((hash(i * 4.9) * 270 + t * sp) % 290)) - 10; pxRect(lg, x, y, hash(i * 1.3) > .8 ? 2 : 1, hash(i * 1.3) > .8 ? 2 : 1, LC[3]); }
      if (tf > 0) {
        const bx = 100, by = 78, n = Math.min(SMS_TEXT.length, Math.floor(clamp((p0 - .14) / .06) * SMS_TEXT.length) + 0), w = SMS_TEXT.length * 8 + 12;
        pxRect(lg, bx, by, w, 22, LC[0]); pxRect(lg, bx + 2, by + 2, w - 4, 18, LC[3]); pxRect(lg, bx + 20, by + 22, 6, 4, LC[0]); pxRect(lg, bx + 21, by + 22, 4, 2, LC[3]);
        lg.font = '8px "Press Start 2P"'; lg.fillStyle = LC[0]; lg.textBaseline = 'top'; lg.fillText(SMS_TEXT.slice(0, n) + (n < SMS_TEXT.length && Math.floor(t * 8) % 2 ? '_' : ''), bx + 6, by + 7);
      }
      // envelope: hand -> mast top -> house window
      const e0 = clamp((p0 - .6) / .32);
      if (e0 > 0 && e0 < 1) {
        const hx = Math.round((WSX + 70) / 4), hy = Math.round((GY - 210) / 4), mx = px(c, MAST_X), my = 84, wx_ = px(c, HOUSE_X) + 26, wy = 208 - 46 + 8;
        const k = e0 < .5 ? eo(e0 * 2) : 1, k2 = e0 < .5 ? 0 : eo((e0 - .5) * 2), x = e0 < .5 ? lerp(hx, mx, k) : lerp(mx, wx_, k2), y = (e0 < .5 ? lerp(hy, my, k) - Math.sin(k * Math.PI) * 26 : lerp(my, wy, k2) - Math.sin(k2 * Math.PI) * 18);
        const ex = Math.round(x), ey = Math.round(y); pxRect(lg, ex - 5, ey - 3, 10, 7, LC[0]); pxRect(lg, ex - 4, ey - 2, 8, 5, LC[3]); pxRect(lg, ex - 4, ey - 2, 1, 1, LC[0]); for (let i = 1; i < 4; i++) { pxRect(lg, ex - 4 + i, ey - 2 + i, 1, 1, LC[0]); pxRect(lg, ex + 4 - i, ey - 2 + i, 1, 1, LC[0]); }
        for (let i = 1; i < 6; i++) { const u = clamp(e0 - i * .018); const kk = u < .5 ? eo(u * 2) : 1, kk2 = u < .5 ? 0 : eo((u - .5) * 2); const tx = u < .5 ? lerp(hx, mx, kk) : lerp(mx, wx_, kk2), ty = u < .5 ? lerp(hy, my, kk) - Math.sin(kk * Math.PI) * 26 : lerp(my, wy, kk2) - Math.sin(kk2 * Math.PI) * 18; pxRect(lg, Math.round(tx), Math.round(ty), 1, 1, LC[2]); }
      }
      if (e0 >= 1) { const wx_ = px(c, HOUSE_X) + 26, wy = 208 - 46 + 8; pxRect(lg, wx_ - 5, wy, 10, 12, LC[3]); pxRect(lg, wx_ - 5, wy, 10, 1, LC[0]); const bl = Math.floor(t * 4) % 2; if (bl) for (const [dx, dy] of [[-10, -4], [10, -6], [0, -12], [-8, 14]]) pxRect(lg, wx_ + dx, wy + dy, 2, 2, LC[3]); }
      // signal arcs at the mast while the message passes
      if (e0 > .3 && e0 < .95) { const mx = px(c, MAST_X); for (let k = 0; k < 3; k++) { const r = 12 + k * 10 + (Math.floor(t * 6) % 3) * 3; lg.strokeStyle = LC[3]; lg.lineWidth = 1; lg.beginPath(); lg.arc(mx, 88, r, -2.4, -.7); lg.stroke(); lg.beginPath(); lg.arc(mx, 88, r, Math.PI + .7, Math.PI + 2.4); lg.stroke(); } }
    });
    if (tf > .99 && p0 < .8) { g.save(); /* text reported via TEXTS in main */ g.restore(); }
    vignette(g, .1);
  },
  textBox(c) { const p0 = c.gp(0); return p0 > .17 && p0 < .93 ? { text: SMS_TEXT, x0: 400, y0: 312, x1: 400 + (SMS_TEXT.length * 8 + 12) * 4, y1: 400 } : null; },
  events(k) { const g0 = this.gags[0], g1 = this.gags[1]; ev(T(k, g0.x + g0.len * .08), 'brickpull', .5); for (let i = 0; i < 15; i++) ev(T(k, g0.x + g0.len * .14) + i * .04, 'chip', .5, { n: i }); ev(T(k, g0.x + g0.len * .6), 'send', .9); ev(T(k, g0.x + g0.len * .76), 'tower', .6); ev(T(k, g0.x + g0.len * .92), 'recv', .9); ev(T(k, g1.x + g1.len * .15), 'nod', .8); },
};

// =================================================================== 9. TODAY (a flat desk, a giant phone, the gallery)
const NW = { wall: '#d6e6f1', wall2: '#c4d9e9', desk: '#f2d2a6', deskFront: '#dfb283', line: '#2b2430', mint: '#9fd6bd', peach: '#f7b9a0', lilac: '#c8bff0', sun: '#ffd770', coral: '#f0705e', navy: '#27406e', cream: '#fff6e4' };
const PHX = (WX_END - B[8]) + 380;                          // phone's local x
const TD0 = TS + .15, TH = TD0 + .95;                        // hand-over starts, the tag lands
const KEYS_X0 = lxAfter(.8);
function flatItems(g, c) {
  c.at(g, .9, (a, b) => {
    for (let i = Math.floor(a / 520) - 1; i < b / 520 + 1; i++) {
      const x = i * 520 + 90, kind = Math.abs(i) % 5;
      g.save(); g.translate(x, 818); g.lineWidth = 0;
      if (kind === 0) { g.fillStyle = NW.cream; g.fillRect(-90, -160, 180, 160); g.fillStyle = NW.navy; g.fillRect(-80, -150, 160, 130); g.fillStyle = '#4a73b8'; g.fillRect(-80, -150, 160, 40); g.fillStyle = NW.cream; for (let k = 0; k < 4; k++) g.fillRect(-64, -96 + k * 18, 70 - k * 8, 6); g.fillStyle = '#b9c2cf'; g.fillRect(-110, 0, 220, 14); }
      else if (kind === 1) { g.fillStyle = NW.coral; g.beginPath(); rr(g, -34, -78, 68, 78, 12); g.fill(); g.fillStyle = NW.cream; g.beginPath(); g.ellipse(0, -78, 28, 8, 0, 0, TAU); g.fill(); g.strokeStyle = NW.coral; g.lineWidth = 9; g.beginPath(); g.arc(36, -42, 20, -1.4, 1.4); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 6; g.lineCap = 'round'; for (let s = 0; s < 3; s++) { g.beginPath(); const ph = c.t * 1.4 + s * 1.2 + i; for (let k = 0; k <= 12; k++) { const u = k / 12; const yy = -90 - u * 70, xx = Math.sin(u * 5 + ph) * 8 + (s - 1) * 12; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.globalAlpha = .6; g.stroke(); g.globalAlpha = 1; } }
      else if (kind === 2) { g.fillStyle = '#c77d4f'; g.beginPath(); g.moveTo(-34, 0); g.lineTo(-40, -58); g.lineTo(40, -58); g.lineTo(34, 0); g.fill(); g.fillStyle = '#4fa37f'; for (let k = 0; k < 7; k++) { g.save(); g.translate(0, -58); g.rotate(-1.4 + k * .46 + Math.sin(c.t * 1.2 + k + i) * .03); g.beginPath(); g.ellipse(0, -52, 14, 52, 0, 0, TAU); g.fill(); g.restore(); } }
      else if (kind === 3) { g.fillStyle = '#e3e9ee'; g.fillRect(-60, -10, 120, 10); g.fillStyle = NW.sun; g.beginPath(); g.moveTo(-40, -10); g.lineTo(-10, -170); g.lineTo(10, -160); g.lineTo(-18, -10); g.fill(); g.beginPath(); g.moveTo(-10, -170); g.lineTo(60, -150); g.lineTo(40, -120); g.lineTo(0, -140); g.fill(); g.fillStyle = 'rgba(255,230,140,.35)'; g.beginPath(); g.moveTo(40, -122); g.lineTo(90, 0); g.lineTo(0, 0); g.fill(); }
      else { const cols = [NW.mint, NW.peach, NW.lilac, '#f6d27c']; for (let k = 0; k < 4; k++) { g.fillStyle = cols[k]; g.fillRect(-60 + (k % 2) * 8, -26 - k * 26, 120 - k * 6, 24); } }
      g.restore();
    }
  }, 100);
}
function frames(g, c) {
  c.at(g, .85, (a, b) => {
    for (let i = Math.floor(a / 1100) - 1; i < b / 1100 + 1; i++) {
      const x = i * 1100 + 300; g.save(); g.translate(x, 150);
      for (let k = 0; k < 3; k++) { g.save(); g.translate(k * 150, (k % 2) * 40); g.fillStyle = NW.cream; g.beginPath(); rr(g, 0, 0, 120, 150, 8); g.fill(); g.lineWidth = 6; g.strokeStyle = NW.navy; g.stroke(); g.save(); g.translate(60, 75); g.scale(.18, .18); if (k === 0) g.drawImage(handSprite(1), -115, -135); g.restore(); if (k === 1) { g.fillStyle = NW.coral; g.fillRect(34, 40, 52, 52); g.fillStyle = NW.cream; g.font = '700 36px "Noto Serif SC"'; g.textAlign = 'center'; g.fillText('印', 60, 78); } if (k === 2) { g.strokeStyle = NW.navy; g.lineWidth = 4; for (let q = 0; q < 3; q++) { g.beginPath(); g.arc(46, 84, 14 + q * 12, -.9, .9); g.stroke(); } g.fillStyle = NW.sun; g.beginPath(); g.arc(34, 84, 8, 0, TAU); g.fill(); } g.restore(); }
      g.restore();
    }
  }, 100);
}
// ---------- the phone (a generic glass slab; not any maker's artwork)
const PW = 270, PHT = 560, SCR = { x: 15, y: 100, w: 240, h: 360 };
function phoneBody(g) {
  g.save(); g.shadowColor = 'rgba(30,30,60,.35)'; g.shadowBlur = 40; g.shadowOffsetY = 18; g.fillStyle = '#c8ced8'; g.beginPath(); rr(g, -PW / 2, -PHT / 2, PW, PHT, 50); g.fill(); g.restore();
  g.fillStyle = '#c8ced8'; g.beginPath(); rr(g, -PW / 2, -PHT / 2, PW, PHT, 50); g.fill(); g.fillStyle = '#14161c'; g.beginPath(); rr(g, -PW / 2 + 7, -PHT / 2 + 7, PW - 14, PHT - 14, 44); g.fill();
  g.fillStyle = '#2a2d36'; g.beginPath(); rr(g, -34, -PHT / 2 + 40, 68, 10, 5); g.fill(); g.strokeStyle = '#3a3e49'; g.lineWidth = 4; g.beginPath(); g.arc(0, PHT / 2 - 50, 25, 0, TAU); g.stroke(); g.fillStyle = '#e8ecf3'; g.beginPath(); rr(g, -9, PHT / 2 - 59, 18, 18, 4); g.strokeStyle = '#8a90a0'; g.lineWidth = 2; g.stroke();
}
function bubble(g, x, y, w, h, fill) { g.fillStyle = fill; g.beginPath(); rr(g, x, y, w, h, 22); g.fill(); g.beginPath(); g.moveTo(x + w - 18, y + h - 10); g.lineTo(x + w + 6, y + h + 8); g.lineTo(x + w - 34, y + h - 2); g.fill(); }
// phone with its screen content; st: { t, msg 0..1, grid 0..1, snaps[], labels[], gp: tile reveal times }
function phoneDraw(g, o) {
  const { cx, cy, s, rot } = o; g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(s, s);
  if (o.shake) g.translate(Math.sin(o.t * 90) * 2 * o.shake, 0);
  phoneBody(g);
  g.save(); g.translate(-PW / 2 + SCR.x, -PHT / 2 + SCR.y); g.beginPath(); rr(g, 0, 0, SCR.w, SCR.h, 6); g.clip();
  const sg = g.createLinearGradient(0, 0, 0, SCR.h); sg.addColorStop(0, '#5b7fb8'); sg.addColorStop(1, '#f2b184'); g.fillStyle = sg; g.fillRect(0, 0, SCR.w, SCR.h);
  g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(60, 300, 110, 0, TAU); g.fill();
  g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 0, SCR.w, 16); g.fillStyle = '#fff'; for (let k = 0; k < 4; k++) g.fillRect(6 + k * 4, 11 - k * 2, 2.4, 2 + k * 2); g.font = '700 10px "Noto Sans SC"'; g.textAlign = 'center'; g.fillText('9:00', SCR.w / 2, 12);
  if (o.msg > 0) {                                           // the delivered message
    const k = back(clamp(o.msg), 2.4); g.save(); g.translate(0, 120); g.globalAlpha = Math.min(1, o.msg * 3);
    g.fillStyle = 'rgba(255,255,255,.88)'; g.beginPath(); rr(g, 12, -6, SCR.w - 24, 120, 14); g.fill(); g.fillStyle = '#8a8f9e'; g.font = '600 11px "Noto Sans SC"'; g.textAlign = 'left'; g.fillText('信息', 22, 10); g.fillText('刚刚', SCR.w - 46, 10);
    g.save(); g.translate(22 + (1 - k) * -30, 30); g.scale(k, k); bubble(g, 0, 0, 160, 66, '#8de06a'); g.fillStyle = '#10200c'; g.font = '700 34px "Noto Sans SC"'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('我来过', 14, 34); g.save(); g.translate(138, 34); g.scale(.17, .17); g.drawImage(handSprite(1), -115, -135); g.restore(); g.restore();
    g.restore();
  }
  if (o.grid > 0) {                                          // gallery of thumbnails, 3 x 3
    g.fillStyle = '#10131a'; g.globalAlpha = clamp(o.grid * 2); g.fillRect(0, 0, SCR.w, SCR.h); g.globalAlpha = 1;
    // landscape content rotated back so the screen reads upright: the screen is portrait (240x360); we lay the grid out in landscape coordinates by rotating the content
    g.save(); g.translate(SCR.w / 2, SCR.h / 2); g.rotate(Math.PI / 2); const gw = SCR.h, gh = SCR.w; g.translate(-gw / 2, -gh / 2);
    g.fillStyle = '#e9edf5'; g.font = '700 14px "Noto Sans SC"'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('所有照片', 12, 22); g.fillStyle = '#8a90a0'; g.font = '500 10px "Noto Sans SC"'; g.textAlign = 'right'; g.fillText('9 张 · 一路走来', gw - 12, 21);
    const gap = 5, th = (gh - 30 - 3 * 10) / 3, tw = th * 16 / 9, pad = (gw - 3 * tw - 2 * gap) / 2;
    for (let i = 0; i < 9; i++) {
      const col = i % 3, row = Math.floor(i / 3), x = pad + col * (tw + gap), y = 30 + row * (th + 10), at = o.tileAt ? o.tileAt(i) : 0, k = back(clamp(at), 2.2);
      if (k <= 0) continue; g.save(); g.translate(x + tw / 2, y + th / 2); g.scale(k, k); g.beginPath(); rr(g, -tw / 2, -th / 2, tw, th, 4); g.save(); g.clip(); if (o.snaps && o.snaps[i]) g.drawImage(o.snaps[i], -tw / 2, -th / 2, tw, th); g.restore();
      if (o.glow && o.glow(i) > 0) { g.lineWidth = 2.6; g.strokeStyle = `rgba(255,215,112,${o.glow(i)})`; g.beginPath(); rr(g, -tw / 2, -th / 2, tw, th, 4); g.stroke(); }
      g.fillStyle = '#a9b0c0'; g.font = '600 8.5px "Noto Sans SC"'; g.textAlign = 'center'; g.fillText(o.labels ? o.labels[i] : '', 0, th / 2 + 9); g.restore();
    }
    g.restore();
  }
  g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(SCR.w, 0); g.lineTo(0, SCR.h * .62); g.fill();
  g.restore(); g.restore();
}
const LABELS = ['4万年前', '前3300', '868年', '1455年', '1844年', '1876年', '1973年', '1992年', '2007年'];
const toScr = (o, px_, py_) => { const x = (px_ - PW / 2), y = (py_ - PHT / 2), cs = Math.cos(o.rot), sn = Math.sin(o.rot); return [o.cx + (x * cs - y * sn) * o.s, o.cy + (x * sn + y * cs) * o.s]; };
export const now = {
  id: 'now', paper: NW.wall, rim: '#ffffff', camLx: 1100,
  gags: [{ x: KEYS_X0, len: 1300 }, { x: lxAfter(4.4), len: 520 }],
  walk: { id: 'now', line: '#2b2430', lw: 3.6, rim: '#ffffff', rw: 3 },
  step: 'key', push: null,
  burst: { n: 46, size: 20, g: 360, spin: 3, draw: (g, s, i, p, r) => { g.fillStyle = [NW.mint, NW.peach, NW.lilac, NW.sun, NW.coral][i % 5]; if (i % 3 === 0) { g.beginPath(); g.arc(0, 0, s * .5, 0, TAU); g.fill(); } else if (i % 3 === 1) { g.fillRect(-s * .5, -s * .5, s, s); } else { g.beginPath(); g.moveTo(0, -s * .6); g.lineTo(s * .6, s * .5); g.lineTo(-s * .6, s * .5); g.fill(); } } },
  token: (g, c) => { if (c && c.t > TD0 + .25) return; tagCard(g, { fill: NW.cream, line: NW.line, w: 56, h: 66, r: 14 }, (g) => { g.save(); g.scale(.24, .24); g.drawImage(handSprite(1), -115, -135); g.restore(); }); },
  pose(c) {
    const del = bell(c.t, TD0 - .1, TD0 + .2, TD0 + .85, TD0 + 1.4), nod = bell(c.gp(1), .1, .3, .6, .9);
    return { armN: del > .001 ? { x: 640 + 110, y: GY - 236, w: del } : null, lean: .1 * del, look: -.1 * del + .12 * nod, stop: ss(seg(c.t, TS - .5, TS)), mouth: del, hop: 0 };
  },
  held(g, c, J) {                                           // the tag flies from the courier's hand into the phone
    const k = clamp((c.t - (TD0 + .25)) / .7); if (k <= 0 || k >= 1) return;
    const from = [J.bag[0] + 20, J.bag[1] + 40], to = [c.X(PHX), 560], u = ss(k), x = lerp(from[0], to[0], u), y = lerp(from[1], to[1], u) - Math.sin(u * Math.PI) * 140;
    g.save(); g.translate(x, y); g.rotate(u * 6.28 * 1.5); g.scale(1 - u * .55, 1 - u * .55); tagCard(g, { fill: NW.cream, line: NW.line, w: 56, h: 66, r: 14 }, (g) => { g.save(); g.scale(.24, .24); g.drawImage(handSprite(1), -115, -135); g.restore(); }); g.restore();
  },
  bg(g, c) {
    const t = c.t;
    g.fillStyle = NW.wall; g.fillRect(0, 0, W, H);
    // soft geometric shapes on the wall
    c.at(g, .3, (a, b) => { for (let i = Math.floor(a / 800) - 1; i < b / 800 + 1; i++) { const x = i * 800; g.fillStyle = [NW.peach, NW.mint, NW.lilac][Math.abs(i) % 3]; g.globalAlpha = .55; g.beginPath(); g.arc(x + 300, 300, 150, 0, TAU); g.fill(); g.beginPath(); rr(g, x + 520, 420, 220, 220, 40); g.fill(); g.globalAlpha = 1; } }, 100);
    // a window with sun and a cloud drifting
    c.at(g, .6, (a, b) => { for (let i = Math.floor(a / 1500) - 1; i < b / 1500 + 1; i++) { const x = i * 1500 + 700; g.fillStyle = '#ffffff'; g.beginPath(); rr(g, x - 190, 90, 380, 420, 24); g.fill(); const wg = g.createLinearGradient(0, 110, 0, 490); wg.addColorStop(0, '#8fc7ee'); wg.addColorStop(1, '#d9f0fb'); g.fillStyle = wg; g.beginPath(); rr(g, x - 170, 110, 340, 380, 14); g.fill(); g.fillStyle = NW.sun; g.beginPath(); g.arc(x + 70, 210, 44, 0, TAU); g.fill(); g.fillStyle = '#fff'; const cx = x - 120 + ((t * 12) % 300); g.beginPath(); g.ellipse(cx, 330, 60, 22, 0, 0, TAU); g.ellipse(cx + 40, 320, 40, 22, 0, 0, TAU); g.fill(); g.fillStyle = '#ffffff'; g.fillRect(x - 4, 110, 8, 380); g.fillRect(x - 170, 290, 340, 8); } }, 100);
    frames(g, c);
    // shelf with books
    c.at(g, .85, (a, b) => { for (let i = Math.floor(a / 1100) - 1; i < b / 1100 + 1; i++) { const x = i * 1100 + 60; g.fillStyle = '#ffffff'; g.fillRect(x, 470, 520, 12); const cols = [NW.coral, NW.mint, NW.navy, NW.sun, NW.lilac, NW.peach]; for (let k = 0; k < 11; k++) { const h = 70 + hash(i * 11 + k) * 60; g.fillStyle = cols[(k + i) % 6]; g.fillRect(x + 14 + k * 40, 470 - h, 34, h); } } }, 100);
    // desk: back edge, top, front face
    c.at(g, 1, (a, b) => {
      g.fillStyle = NW.desk; g.fillRect(a, 790, b - a, 110); g.fillStyle = '#f7e1c2'; g.fillRect(a, 790, b - a, 14); g.fillStyle = NW.deskFront; g.fillRect(a, 900, b - a, H - 900); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(a, 900, b - a, 8);
      for (let i = Math.floor(a / 640) - 1; i < b / 640 + 1; i++) { g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); rr(g, i * 640 + 80, 940, 480, 100, 22); g.fill(); g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); rr(g, i * 640 + 300, 980, 40, 14, 7); g.fill(); }
    });
    flatItems(g, c);
    // the keyboard the courier walks on: keys sink under his feet
    c.at(g, 1, (a, b) => {
      const wlx = c.wlx; g.fillStyle = '#e8edf4'; g.beginPath(); rr(g, a, 826, b - a, 56, 12); g.fill();
      for (let i = Math.floor(a / 66) - 1; i < b / 66 + 1; i++) { const kx = i * 66 + 6, d = Math.max(0, 1 - Math.abs(kx + 28 - wlx) / 110), dd = ss(d), lit = dd > .15; g.fillStyle = lit ? mixc('#ffffff', NW.mint, dd) : '#ffffff'; g.beginPath(); rr(g, kx, 832 + dd * 9, 56, 40 - dd * 5, 8); g.fill(); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(kx + 4, 868 + dd * 4, 48, 4); }
    });
  },
  fg(g, c) { },
  events(k) { ev(TD0 + .1, 'unhook', .6); ev(TH, 'ding', 1); ev(TH + .12, 'ding', .7, { hi: 1 }); ev(TH + .35, 'bubble', .9); ev(T_LIFT, 'phonelift', 1); for (let i = 0; i < 9; i++) ev(T_GRID + i * .16, 'tile', .8, { n: i }); ev(T_GRID + 1.9, 'sweep', .7); ev(T_END, 'end', 1); },
  // drawn above the world: the phone (rests on the desk, then rises and fills the screen as a gallery)
  overlay(g, t, wx, c, zoom) {
    if (!c) return;
    const lift = ss(seg(t, T_LIFT, T_LIFT + 1.5)), msg = ss(seg(t, TH + .3, TH + .9)), restX = c.X(PHX), restY = 846 - PHT / 2;
    let o;
    g.save();
    if (lift <= 0 && zoom !== 1) { g.translate(WSX, 640); g.scale(zoom, zoom); g.translate(-WSX, -640); }
    if (lift > 0) { g.fillStyle = `rgba(14,20,36,${.62 * lift})`; g.fillRect(0, 0, W, H); }
    const shake = bell(t, TH, TH + .05, TH + .1, TH + .4);
    o = { cx: lerp(restX, 960, lift), cy: lerp(restY, 540, lift), s: lerp(1, 3.3, lift), rot: lerp(0, -Math.PI / 2, lift), t, msg: msg * (1 - 0 * lift), shake, grid: ss(seg(t, T_LIFT + 1.0, T_LIFT + 1.7)), snaps: lift > 0 ? this.snap && this.snap() : null, labels: LABELS, tileAt: i => (t - (T_GRID + i * .16)) / .45, glow: i => { const u = (t - (T_GRID + 1.9 + i * .22)); return u > 0 && u < .6 ? Math.sin(u / .6 * Math.PI) : (t > T_GRID + 1.9 + 9 * .22 && i === 8 ? .85 : 0); } };
    // the phone rests behind the delivered tag; the dim layer is drawn before it
    phoneDraw(g, o);
    g.restore();
    // report the message text while it is on the desk
    now._msgBox = (lift < .01 && msg > .99) ? (() => { const a = toScr(o, 15 + 22, 100 + 120 + 30), b = toScr(o, 15 + 22 + 160, 100 + 120 + 96); return { x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]) }; })() : null;
  },
};
