// Single source of truth for time. 120 BPM, 4/4: beat 0.5 s, bar 2 s, 25 bars = 50 s.
// Every slam, strike, cut and tick lands on a beat or an eighth (0.25 s). Picture, events.json and the mix all read this file.
export const BPM = 120, BEAT = 0.5, BAR = 2.0, E = 0.25, DUR = 50;

export const SC = [
  { id: 'intro', a: 0, b: 4 }, { id: 'kettle', a: 4, b: 8 }, { id: 'bundle', a: 8, b: 12 }, { id: 'stock', a: 12, b: 20 },
  { id: 'coupon', a: 20, b: 26 }, { id: 'cart', a: 26, b: 30 }, { id: 'grid', a: 30, b: 34 }, { id: 'count', a: 34, b: 40 },
  { id: 'live', a: 40, b: 43 }, { id: 'cta', a: 43, b: 50 },
];
export const sceneAt = t => SC.find(s => t >= s.a && t < s.b) || SC[SC.length - 1];

// starburst wipes (grows over the 0.14 s before the cut, shrinks over 0.18 s after) and flash cuts (two bright frames)
export const WIPES = [{ t: 4, col: '#17110d' }, { t: 12, col: '#ffd90f' }, { t: 20, col: '#ff2a1f' }, { t: 30, col: '#17110d' }, { t: 43, col: '#ffd90f' }];
export const FLASH = [8, 26, 34, 40];

// key times
export const T = {
  intro:  { burst: 0, name: 0.5, band: 0.75, sticker: 1.0, date: 1.5 },
  kettle: { card: 4.1, was: 4.5, strike: 5.0, now: 5.5, badge: 6.0 },
  bundle: { cardL: 8.0, cardR: 8.25, plus: 8.5, tagNew: 8.75, twoFor: 9.0, was: 9.25, strike: 9.75, now: 10.0 },
  stock:  { card: 12.1, was: 12.5, strike: 13.0, now: 13.25, badge: 13.5, bar: 14.0, drain0: 14.5, drainStep: 0.1, drainN: 20, only: 16.5, limited: 16.75 },
  coupon: { slam: 20.1, extra: 20.5, off: 20.75, code: 21.25, peel: 22.0, rip: 22.4, fine: 23.0, shine: 24.0 },
  cart:   { rows: [26.0, 26.2, 26.4, 26.6], total: 26.9, strike: 27.1, newTotal: 27.25, save: 27.5 },
  grid:   { banner: 30.1, cards: [30.25, 30.5, 30.75, 31.0, 31.25, 31.5], strikeLag: 0.2 },
  count:  { label: 34.0, clock0: 34.0, clock1: 40.0, dropout: 39.5 },
  live:   { burst: 40.0, title: 40.25, sub: 40.5 },
  cta:    { name: 43.1, offer: 43.5, dates: 44.0, button: 44.5, url: 45.0, cursor0: 45.0, click: 46.0, disclaimer: 43.5 },
};

// stock: 24 cells -> 3
export const CELLS = 24, CELLS_END = 3;
export const cellsLeft = t => {
  const k = Math.floor((t - T.stock.drain0) / T.stock.drainStep + 1e-6) + 1;       // number of drained cells
  return CELLS - Math.max(0, Math.min(T.stock.drainN + 1, k));
};

// the invented shop's goods (prices in dollars; saving = 291 - 157 = 134)
export const GOODS = {
  kettle: { name: 'Pebble Kettle', was: 48, now: 29, off: 40 },
  bundle: { was: 178, now: 99, off: 44 },
  pack: { name: 'Trail Pack', was: 65, now: 39, off: 40 },
  grid: [
    { name: 'Sun Mug', icon: 'mug', was: 14, now: 9 }, { name: 'Fern Pot', icon: 'fern', was: 18, now: 12 }, { name: 'Flask', icon: 'bottle', was: 24, now: 15 },
    { name: 'Note Set', icon: 'note', was: 10, now: 6 }, { name: 'Mini Speaker', icon: 'speaker', was: 85, now: 34, off: 60 }, { name: 'Rain Umbrella', icon: 'umbrella', was: 20, now: 11 },
  ],
};
export const TOTAL_WAS = 48 + 178 + 65, TOTAL_NOW = 29 + 99 + 39 - 10, SAVED = TOTAL_WAS - TOTAL_NOW;
