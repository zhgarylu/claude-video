// Timeline: one function of time -> the whole world state. 68 BPM, 4/4, bar = 3.529 s. Every event sits on the beat grid.
import { clamp, lerp, seg, ss, eio, eo, hash, TAU } from '/core/lib.js';
export const BPM = 68, BEAT = 60 / BPM, BAR = BEAT * 4, NBARS = 14, DUR = +(BAR * NBARS).toFixed(2);
export const B = n => n * BEAT;                         // beats -> seconds
// shots in beats: 0 horizon | 8 gallery | 20 blob room | 32 the hang | 40 reveal | 52 close | 56 end
export const SB = [0, 8, 20, 32, 40, 52, 56];
export const SH = SB.map(B);
export const GLITCH = [8, 20, 32, 42, 52].map(B);
export const POPS = { inst1: 2, inst2: 9, list: 11, notice: 24, warn: 27, inst3: 32.5, inst4: 40, dlg: 52 };
export const TICKS = [13, 14, 15, 16, 17], BLOOPS = [5, 13.5, 21, 26.5, 35, 44];
export const SPIN0 = 42, BELL = 38, FILL = 42, CLICK = 54.5, CLOSE_DLG = 55, CLOSE_INST = 55.5, CAP_IN = 47;

const V = (x, y, z) => [x, y, z];
const sun = t => lerp(.62, -.34, Math.pow(seg(t, 0, 46), 2.3));      // the sun sinks over the whole film
const prog = t => t < B(36) ? ss(seg(t, B(2.5), B(32))) * .99 : t < B(FILL) ? .99 : 1;
const glitchAt = t => { let g = 0; for (const c of GLITCH) { const d = t - c; if (d >= -.04 && d < .5) g = Math.max(g, d < 0 ? .9 : Math.exp(-d * 7)); } return g; };
const pop = (t, b) => ss(seg(t, B(b), B(b) + .26));
const unpop = (t, b) => 1 - ss(seg(t, B(b), B(b) + .3));
const BC = [[1, .35, .82], [.25, .9, 1], [.7, .45, 1], [1, .86, .2], [.4, 1, .75], [1, .45, .55]];

export function stateAt(t) {
  const sh = SH.findIndex((s, i) => t >= s && t < SH[i + 1]);
  const S = { t, sunY: sun(t), scroll: t * 1.6, glitch: glitchAt(t), haze: [1, .56, .83], flare: .5, bloom: .5,
    vhsY: .935 + .02 * Math.sin(t * .5), vhs: .35 };
  const T = prog(t), win = [];
  S.sparkles = []; for (let i = 0; i < 12; i++) { const x = 140 + hash(i * 3.3) * 1640, y = 70 + hash(i * 7.1) * 520; const ph = t * (.6 + hash(i) * .8) + i * 2; S.sparkles.push({ x, y, s: 16 + hash(i * 1.7) * 26, a: clamp(Math.sin(ph) * 1.2, 0, 1) * .85, col: i % 3 ? '150,240,255' : '255,150,230', rot: .2 + i }); }
  const bubbles = list => list.map((b, i) => ({ c: V(b[0] + Math.sin(t * .45 + i * 1.9) * .55, b[1] + Math.sin(t * .7 + i * 2.6) * .35, b[2] + Math.cos(t * .4 + i) * .3), r: b[3], col: BC[i % 6] }));
  const palms = [{ x: 150, y: 1100, h: 820, lean: .16, flip: 1, seed: 1 }, { x: 1780, y: 1110, h: 700, lean: .14, flip: -1, seed: 2 }];
  const edge = [{ x: 30, y: 1100, h: 800, lean: -.04, flip: 1, seed: 1 }, { x: 1890, y: 1110, h: 720, lean: -.04, flip: -1, seed: 2 }];
  const inst = (id, x, y, p, o) => ({ id, kind: 'install', x, y, w: 700, h: 330, title: 'SETUP  -  SUMMER 1.0', p, frac: T,
    line1: 'Installing Summer 1.0', line3: 'about 1 afternoon remaining', ...o });

  if (sh <= 0) {                  // 0 horizon: blob, a small window, grid scrolling
    const k = seg(t, 0, SH[1]);
    S.cam = { pos: V(0, 1.15, lerp(9.2, 8.0, ss(k))), tgt: V(0, 2.55, 0), fov: .9 };
    S.blob = [0, 2.7, 0, 1.55]; S.palms = palms;
    S.bubbles = bubbles([[-3.6, 2.4, 1.2, .55], [3.9, 3.6, .6, .7], [2.3, 1.6, 2.4, .4]]);
    win.push(inst('i1', 1130, 170, pop(t, POPS.inst1), { line2: 'copying: sunscreen.dll' }));
    S.cursor = { x: lerp(1500, 1390, ss(seg(t, B(0), B(1.8)))), y: lerp(700, 400, ss(seg(t, B(0), B(1.8)))) };
  } else if (sh === 1) {          // 8 gallery: head-and-hair bust, columns, checker floor
    const k = seg(t, SH[1], SH[2]);
    S.cam = { pos: V(lerp(-2.2, 1.4, eio(k)), 1.35, lerp(8.8, 7.2, k)), tgt: V(0, 2.1, 0), fov: .86 };
    S.floorMode = ss(seg(t, SH[1] - .1, SH[1] + .2)); S.scroll = t * 1.0;
    S.bust = { pos: V(0, 1.1, 0), s: 1.55, rot: lerp(-.5, .45, eio(k)) }; S.col0 = [-5.2, 0, -2.6, 1.5]; S.col1 = [5.4, 0, -3.4, 1.6];
    S.bubbles = bubbles([[-2.6, 3.4, 1.8, .6], [2.8, 2.2, 2.2, .45], [0.4, 5.2, -1, .5]]);
    S.blob = [1.9, 4.0, 0.8, .5];
    const done = TICKS.filter(b => t >= B(b)).length;
    win.push({ id: 'l', kind: 'list', x: 60, y: 620, w: 560, h: 290, title: 'FILES.TXT', p: pop(t, POPS.list), items: ['sunscreen.dll', 'marble_hall.bmp', 'last_day_of_school.wav', 'bubblegum.ttf', 'ice_pop.ini'], done });
    win.push(inst('i2', 1180, 590, pop(t, POPS.inst2), { line2: 'copying: marble_hall.bmp' }));
    S.vhs = .3;
  } else if (sh === 2) {          // 20 blob room + stacked windows
    const k = seg(t, SH[2], SH[3]);
    S.floorMode = 1 - ss(seg(t, SH[2], SH[2] + .4)); S.scroll = t * 1.8;
    S.cam = { pos: V(lerp(2, -1, eio(k)), lerp(1.0, 1.9, k), lerp(7.0, 5.2, eio(k))), tgt: V(0, 2.5, 0), fov: .9, roll: Math.sin(t * .3) * .015 };
    S.blob = [0, 2.8, 0, 1.9]; S.palms = palms;
    S.bubbles = bubbles([[-3.4, 3.2, 1.4, .6], [3.4, 4.3, 1.0, .55], [-1.2, 1.4, 2.8, .4], [2.6, 1.7, 2.6, .5]]);
    win.push({ id: 'n', kind: 'dialog', x: 180, y: 560, w: 520, h: 210, title: 'NOTICE', p: pop(t, POPS.notice), lines: ['This summer will take', 'a while. Keep going?'], buttons: ['YES', 'OK'] });
    win.push(inst('i3', 1100, 170, 1, { line2: 'copying: ice_pop.ini' }));
    win.push({ id: 'w', kind: 'dialog', x: 1220, y: 520, w: 520, h: 210, title: 'WARNING', p: pop(t, POPS.warn), lines: ['Sunset detected.', 'Ignore?'], buttons: ['IGNORE'], press: t > B(31) ? 0 : -1 });
    S.cursor = { x: lerp(1000, 1530, ss(seg(t, B(28), B(31)))), y: lerp(380, 690, ss(seg(t, B(28), B(31)))), press: t > B(31) };
    S.vhs = .4;
  } else if (sh === 3) {          // 32 the hang at 99 %
    const k = seg(t, SH[3], SH[4]);
    S.floorMode = ss(seg(t, SH[3], SH[3] + .3)) * (1 - ss(seg(t, SH[4] - .6, SH[4])));
    S.scroll = t * .25; S.cam = { pos: V(0, 1.5, lerp(7.6, 7.0, k)), tgt: V(0, 2.3, 0), fov: .84 };
    S.bust = { pos: V(0, 1.1, 0), s: 1.6, rot: .1 }; S.col0 = [-5.0, 0, -2, 1.45]; S.col1 = [5.0, 0, -2, 1.45]; S.bubbles = bubbles([[-2.4, 3.3, 1.6, .5], [2.7, 2.4, 1.4, .4]]);
    win.push(inst('i4', 60, 620, pop(t, POPS.inst3), { line2: 'copying: summer.dll', frac: .99 }));
    S.vhs = .5; S.jpeg = .6; S.flare = .35;
  } else if (sh === 4) {          // 40 reveal: SUMMER spins in chrome over the horizon
    S.floorMode = 0; S.scroll = t * 2.2;
    const k = seg(t, SH[4], SH[5]);
    S.cam = { pos: V(0, lerp(1.0, 1.3, k), lerp(11, 8.6, eio(k))), tgt: V(0, lerp(2.4, 3.3, k), 0), fov: .88 };
    const sp = seg(t, B(SPIN0), B(SPIN0) + 4.1);
    S.text = { on: t >= B(SPIN0) ? 1 : 0, pos: V(0, 4.1, -1.5), rot: (1 - eo(sp)) * TAU * 2, scale: .9 };
    S.palms = edge; S.flare = .3;
    S.bubbles = bubbles([[-4.4, 2.4, 1.2, .6], [4.6, 3.8, .8, .75], [3.2, 1.3, 2.4, .4], [-3.2, 5.2, .6, .45]]);
    win.push(inst('i5', 60, 620, pop(t, POPS.inst4), { frac: t >= B(FILL) ? 1 : .99, line1: 'Setup complete', line2: 'summer.dll', line3: 'enjoy your afternoon' }));
    S.caption = { text: 'the sun has not set yet', a: ss(seg(t, B(CAP_IN), B(CAP_IN) + .3)) };
    S.vhs = .3; S.jpeg = .35;
  } else {                        // 52 close: Restart dialog, LATER, windows close in reverse
    S.floorMode = 0; S.scroll = t * 1.2; S.cam = { pos: V(0, 1.3, 8.6), tgt: V(0, 3.3, 0), fov: .88 };
    S.text = { on: 1, pos: V(0, 4.1, -1.5), rot: 0, scale: .9 }; S.palms = edge; S.flare = .2;
    S.caption = { text: 'the sun has not set yet', a: 1 - ss(seg(t, B(54), B(54.6))) };
    win.push(inst('i5', 60, 620, unpop(t, CLOSE_INST), { frac: 1, line1: 'Setup complete', line2: 'summer.dll', line3: 'enjoy your afternoon' }));
    win.push({ id: 'd', kind: 'dialog', x: 1040, y: 640, w: 640, h: 230, title: 'SUMMER', p: Math.min(pop(t, POPS.dlg), unpop(t, CLOSE_DLG)), lines: ['Restart now?'], buttons: ['LATER', 'NOW'], press: t >= B(CLICK) ? 0 : -1 });
    const m = ss(seg(t, B(52.3), B(54.4)));
    S.cursor = { x: lerp(1750, 1470, m), y: lerp(500, 812, m), press: t >= B(CLICK) && t < B(CLICK) + .15 };
    if (t > B(CLOSE_DLG)) S.cursor.x += (t - B(CLOSE_DLG)) * 40;
    S.vhs = .3;
  }
  S.windows = win.filter(w => w.p > .01);
  return S;
}
