// One timeline for picture, type and sound. The courier walks at a constant pace, so every era boundary,
// every gag and every footstep is a function of time (t) and of the walker's world position (wx).
// Voice lines come from voices/dur.json; era starts are snapped to the beat grid so the torn edge lands on a downbeat.
export const W = 1920, H = 1080;
export const V = 300;                    // walker speed in world px per second
export const WSX = 640;                  // walker's screen x (centre-left)
export const GY = 832;                   // ground line (feet) in screen px
export const FRONT = 46;                 // the torn edge "touches" the walker this far in front of the feet
export const BPM = 72, BEAT = 60 / BPM, BAR = 4 * BEAT;   // one footstep every half beat (300 px/s, 125 px per step)
export const STRIDE = 250;               // px per full walk cycle (two steps)
export const EV = [];
export const ev = (t, type, v = 1, extra = {}) => EV.push({ t: +t.toFixed(3), type, v, ...extra });
export const LINES = await (await fetch('lines.json')).json();
export const DURS = await (await fetch('voices/dur.json')).json();

export const ERA_IDS = ['cave', 'tablet', 'wood', 'press', 'wire', 'phone', 'brick', 'sms', 'now'];
// gap after each spoken line before the next era's line starts (s)
const GAP = [1.6, 1.4, 1.5, 1.5, 1.5, 1.5, 1.6, 1.5];
const snap = x => Math.ceil(x / BEAT - 1e-6) * BEAT;
export const S = { i0: .4 }, E = {};
export const LEAD = 1.6 * 1;             // a line starts this long before the walker meets its edge
export const C = [];                     // C[k]: the moment the torn edge of era k meets the walker (k >= 1)
S.e1 = Math.max(4.95, S.i0 + DURS.i0 + .35);   // never start era 1's line before the intro line has ended (voice lines must not overlap)
C[1] = -Infinity;
let tt = S.e1;
for (let k = 1; k <= 9; k++) {
  const id = 'e' + k;
  if (k > 1) { C[k] = snap(S[id] + LEAD); S[id] = C[k] - LEAD; }
  E[id] = S[id] + DURS[id];
  if (k < 9) { const nextS = S[id] + DURS[id] + GAP[k - 1]; S['e' + (k + 1)] = nextS; }
}
for (const l of LINES) if (S[l.id] !== undefined && E[l.id] === undefined) E[l.id] = S[l.id] + DURS[l.id];
E.i0 = S.i0 + DURS.i0;
export const TS = C[9] + 6.5 * BEAT;     // the walker stops at the desk
export const T_STOP = TS - .9;
S.e10 = TS + 1.2; E.e10 = S.e10 + DURS.e10;
export const T_LIFT = E.e10 + .5;        // phone lifts out of the desk scene
S.e11 = T_LIFT + .6; E.e11 = S.e11 + DURS.e11;
export const T_GRID = T_LIFT + 1.9;      // tiles pop in
export const T_END = T_GRID + 1.5 + 9 * .16 + 2.2;   // end card
export const DUR = +(T_END + 5.4).toFixed(2);

// world x of the walker's feet: constant pace, then an ease to a stop at the desk
export const wxAt = t => {
  if (t <= T_STOP) return V * t;
  const u = Math.min(t - T_STOP, .9);
  return V * T_STOP + V * (u - u * u / 1.8);
};
export const WX_END = wxAt(1e9);
// era start (world x): the edge sits FRONT px in front of the feet at C[k]
export const B = ERA_IDS.map((_, i) => i === 0 ? -2600 : V * C[i + 1] + FRONT);
export const Wd = ERA_IDS.map((_, i) => i === ERA_IDS.length - 1 ? 7600 : B[i + 1] - B[i]);
// time at which the walker's feet are at local x `lx` of era k (0-based index)
export const T = (k, lx) => (B[k] + lx) / V;
// local x for a time `dt` seconds after the edge met the walker (era index k, 1-based C)
export const lxAfter = beats => V * beats * BEAT - FRONT;
// plate swap: the moment the new edge crosses the plate's centre
export const PLATE_X = 1720;
export const plateSwap = k => C[k + 1] - (PLATE_X - WSX - FRONT) / V;   // k: 0-based era index being introduced (k >= 1)
export const PLATES = [
  { y: '约4万年前', c: '洞壁手印' }, { y: '约前3300年', c: '两河流域 · 泥板文字' }, { y: '868年', c: '《金刚经》雕版' },
  { y: '约1455年', c: '古腾堡《圣经》' }, { y: '1844年', c: '莫尔斯电报' }, { y: '1876年', c: '贝尔电话专利' },
  { y: '1973年', c: '第一通手持电话' }, { y: '1992年', c: '第一条短信' }, { y: '2007年', c: '第一代 iPhone' },
];
export const eraAt = t => { let k = 0; for (let i = 1; i < 9; i++) if (t >= plateSwap(i) + .0) k = i; return k; };   // plate era
