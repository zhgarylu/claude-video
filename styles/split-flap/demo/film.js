// The film as a schedule: every cell of the board gets its flaps here, plus the camera and the section drawing's clock.
// Pure data and functions (no DOM): the page, tools/export_tl.mjs and the checks all import it.
import { ALPHA, NUM, Cell, write } from './flap.js';
import { T, VO, DUR } from './timeline.js';

// ---------------------------------------------------------------- geometry (world = the 1920x1080 frame at zoom 1)
export const COLS = 26, ROWS = 7, CW = 62, CH = 94, PX = 66, PY = 108;
export const X0 = (1920 - ((COLS - 1) * PX + CW)) / 2, Y0 = 92;
export const CCOLS = 36, CAPW = 40, CAPH = 54, CPX = 44, CPY = 62;
export const CX0 = (1920 - ((CCOLS - 1) * CPX + CAPW)) / 2, CY0 = 912;
export const cellX = c => X0 + c * PX, cellY = r => Y0 + r * PY;
// the hinge of the cell the dive goes into: row 1, the B of HARBOUR
export const DIVE_CELL = { r: 1, c: 9 };
export const HINGE = { x: cellX(9) + CW / 2, y: cellY(1) + CH / 2 };

const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
const row = (time, dest, status) => pad(time, 5) + ' ' + pad(dest, 11) + ' ' + pad(status, 8);
const HEADER = pad('MARLOW CENTRAL', 14) + '  ' + 'DEPARTURES';
const TRAINS0 = [['23:50', 'HARBOUR', 'ON TIME'], ['23:58', 'OLD MILL', 'ON TIME'], ['00:12', 'EAST QUAY', 'ON TIME'], ['00:25', 'LANTERN BAY', 'ON TIME']];
const TRAINS1 = [['23:58', 'OLD MILL', 'ON TIME'], ['00:12', 'EAST QUAY', 'ON TIME'], ['00:25', 'LANTERN BAY', 'ON TIME'], ['00:40', 'HARBOUR', 'DELAYED']];
const TICK0 = pad('PLEASE MIND THE GAP', COLS), TICK1 = pad('WE ARE SORRY FOR THE WAIT', COLS);

// ---------------------------------------------------------------- cell groups the page reports as text
export const GROUPS = [
  { id: 'hdrL', row: 0, c0: 0, c1: 13 }, { id: 'hdrR', row: 0, c0: 16, c1: 25 },
  ...[1, 2, 3, 4].flatMap(r => [{ id: 'tm' + r, row: r, c0: 0, c1: 4 }, { id: 'ds' + r, row: r, c0: 6, c1: 16 }, { id: 'st' + r, row: r, c0: 18, c1: 25 }]),
  { id: 'tick', row: 5, c0: 0, c1: 25 }, { id: 'lab', row: 6, c0: 0, c1: 12 },
  { id: 'q2', row: 2, c0: 5, c1: 20 }, { id: 'q3', row: 3, c0: 7, c1: 18 }
];

// ---------------------------------------------------------------- the section drawing's cell and its timing
// B -> A the long way: 39 flaps, an accelerando that lands on T.land
export function spinTimes() {
  const n = 39, t0 = T.spin0, t1 = T.land, a = 0.125, b = 0.034;       // flap duration goes from a down to b (geometric)
  const w = Array.from({ length: n }, (_, k) => a * Math.pow(b / a, k / (n - 1)));
  const sum = w.reduce((x, y) => x + y, 0), sc = (t1 - t0) / sum;
  let t = t0; return w.map(d => (t += d * sc));
}

export function build() {
  const EV = [], log = [];
  let id = 0;
  const main = [], cap = [];
  for (let r = 0; r < ROWS; r++) {
    main.push([]);
    for (let c = 0; c < COLS; c++) {
      const clock = r === 6 && [21, 22, 24, 25].includes(c);
      main[r].push(new Cell({ id: id++, r, c, x: cellX(c), y: cellY(r), w: CW, h: CH, wheel: clock ? NUM : ALPHA, snd: 'flap', pan: (c - 12.5) / 12.5 * 0.85, kind: 'main' }, EV, log));
    }
  }
  for (let r = 0; r < 2; r++) {
    cap.push([]);
    for (let c = 0; c < CCOLS; c++) cap[r].push(new Cell({ id: id++, r, c, x: CX0 + c * CPX, y: CY0 + r * CPY, w: CAPW, h: CAPH, snd: 'cap', pan: (c - 17.5) / 17.5 * 0.7, tone0: 'cap', kind: 'cap' }, EV, log));
  }
  // the section drawing's cell (front view) and its flap counter: these ticks are heard close and dry
  const vc = new Cell({ id: id++, r: -1, c: -1, w: CW, h: CH, snd: 'tick', pan: 0.15, idx0: 0, kind: 'vc' }, EV, log);
  const cu = new Cell({ id: id++, r: -1, c: -2, w: 30, h: 46, wheel: NUM, snd: 'none', pan: 0, kind: 'cnt', tone0: 'lit', idx0: 1 }, EV, log);
  const ct = new Cell({ id: id++, r: -1, c: -3, w: 30, h: 46, wheel: NUM, snd: 'none', pan: 0, kind: 'cnt', tone0: 'lit', idx0: 1 }, EV, log);

  const wr = (cell, t0, ch, o) => write(cell, t0, ch, o);
  const rowText = (r, text, t0, o = {}) => {
    const { dc = 0.02, tone, step = 0.05, from = 0, to = COLS - 1, extra } = o;
    for (let c = from; c <= to; c++) wr(main[r][c], t0 + (c - from) * dc, text[c] ?? ' ', { step, tone: o.tones ? o.tones[c] : tone, extra: extra && main[r][c].wheel === NUM ? 3 : extra, seed: r });
  };

  // ---- 1. power-on test: every cell cycles, the header settles, everything else comes back to blank
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const cell = main[r][c], tgt = r === 0 ? HEADER[c] : ' ';
    wr(cell, T.power + c * 0.022 + r * 0.07, tgt, { step: 0.04, extra: cell.wheel === NUM ? 3 : 1, seed: 3 });
  }
  for (let r = 0; r < 2; r++) for (let c = 0; c < CCOLS; c++) wr(cap[r][c], T.power + 0.4 + c * 0.02 + r * 0.1, ' ', { step: 0.04, extra: 1, tone: 'cap', seed: 5 });

  // ---- 2. the departures write themselves, a row per beat
  TRAINS0.forEach((tr, i) => rowText(i + 1, row(...tr), T.fill + i * 0.6, { dc: 0.015, step: 0.04 }));
  rowText(5, TICK0, T.fill + 2 * 0.6, { dc: 0.015, step: 0.04 });

  // ---- 3. captions: the announcement strip, letters landing in time with the voice
  const captionGroup = (v) => {
    const rows = v.rows.map(s => { const p = Math.floor((CCOLS - s.length) / 2); return ' '.repeat(p) + s + ' '.repeat(CCOLS - s.length - p); });
    const total = rows[0].trim().length + rows[1].trim().length; let k = 0;
    rows.forEach((s, r) => { for (let c = 0; c < CCOLS; c++) {
      const ch = s[c]; const cell = cap[r][c];
      if (ch === ' ') { wr(cell, v.t + 0.05, ' ', { step: 0.04, tone: 'cap', seed: 7 }); continue; }
      const land = v.t + 0.15 + (k++ / total) * v.dur * 0.8;
      wr(cell, 0, ch, { land, step: 0.04, tone: 'cap', seed: 9 });
    } });
  };
  VO.forEach(captionGroup);

  // ---- 4. the section drawing: A -> B slowly (twice a single flap you can follow), then B -> A the long way
  const vA = vc.wheel.indexOf('A'), vB = vc.wheel.indexOf('B');
  wr(vc, T.slow1, vA, { step: 0.42 });     // blank -> A, one slow flap
  wr(vc, T.slow2, vB, { step: 0.42 });     // A -> B
  const times = spinTimes();
  wr(vc, 0, vA, { times });                // B -> A: thirty-nine
  // the flap counter ticks with every landing of the long fall
  times.forEach((tt, k) => {
    const st = k > 0 ? tt - times[k - 1] : 0.12, n1 = k + 1;
    wr(cu, 0, NUM[1 + (n1 % 10)], { span: [tt - st, tt] });
    if (n1 % 10 === 0) wr(ct, 0, NUM[1 + Math.floor(n1 / 10)], { span: [tt - st, tt] });
  });

  // ---- 5. the delay: the status stamp turns amber, the time rolls round, the board writes itself again, shifted up
  const st1 = (r, status, tone, t0, dc = 0.05, step = 0.045) => { for (let c = 18; c < 26; c++) wr(main[r][c], t0 + (c - 18) * dc, pad(status, 8)[c - 18], { step, tone }); };
  st1(1, 'DELAYED', 'amber', T.stamp);
  '00:40'.split('').forEach((ch, i) => wr(main[1][i], T.roll + i * 0.1, ch, { step: 0.036 }));
  TRAINS1.forEach((tr, i) => {
    const r = i + 1, txt = row(...tr), t0 = T.resort + i * 0.2;
    for (let c = 0; c < COLS; c++) {
      const tone = c >= 18 ? (tr[2] === 'DELAYED' ? 'amber' : 'n') : 'n';
      wr(main[r][c], t0 + c * 0.02, txt[c], { step: 0.04, tone });
    }
  });
  rowText(5, TICK1, T.resort, { dc: 0.018, step: 0.04 });

  // ---- 6. the countdown on the clock row (digit wheels hold ten flaps and a blank, so a count is cheap)
  const cm = main[6];
  rowText(6, pad('LAST TRAIN IN', COLS), T.clock, { dc: 0.03, from: 0, to: 12 });
  [['1', 24], ['0', 25], ['0', 21], ['0', 22]].forEach(([ch, c], i) => wr(cm[c], 0, ch, { land: T.count0 - 0.05 - i * 0.04, step: 0.045, tone: 'lit' }));
  wr(cm[23], 0, ':', { land: T.count0 - 0.1, step: 0.03, tone: 'lit' });
  for (let k = 1; k <= 10; k++) {
    const tk = T.count0 + k * 0.6, v = 10 - k, u = v % 10, te = Math.floor(v / 10);
    wr(cm[25], 0, String(u), { land: tk, step: 0.028 });
    wr(cm[24], 0, String(te), { land: tk, step: 0.028 });
  }
  // zero: the stamp turns green; every flap of the eight cells falls once round
  st1(4, 'DEPARTED', 'green', T.zero, 0.03, 0.02);

  // ---- 7. the board falls blank, then the sentence is spelled out cell by cell
  const Q = [['GOING BACK MEANS', 2, 5], ['GOING ROUND.', 3, 7]];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const cell = main[r][c];
    if (cell.endIdx !== 0 || cell.endTone !== 'n') wr(cell, T.clear + c * 0.012 + r * 0.035, ' ', { step: 0.032, tone: 'n' });
  }
  let qk = 0;
  Q.forEach(([s, r, c0]) => [...s].forEach((ch, i) => {
    if (ch === ' ') return;
    wr(main[r][c0 + i], 0, ch, { land: T.quote0 + (qk++) * T.quoteDt, step: 0.04 });
  }));

  // ---- scene events (sound)
  EV.push({ t: 0.15, type: 'power' }, { t: T.open0, type: 'shutter', dir: 1 }, { t: T.close0, type: 'shutter', dir: -1 },
    { t: T.pawl, type: 'pawl' }, { t: T.land + 0.02, type: 'thunk' },
    { t: T.chime, type: 'chime' }, { t: T.stamp, type: 'relay' }, { t: T.zero, type: 'horn' });
  for (let k = 0; k <= 10; k++) EV.push({ t: +(T.count0 + k * 0.6).toFixed(3), type: 'beat', n: k });
  EV.sort((a, b) => a.t - b.t);
  return { main, cap, vc, cu, ct, EV, log };
}

// ---------------------------------------------------------------- camera (world), shutter, section clock
const ss = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const eio = x => { x = Math.min(1, Math.max(0, x)); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const eo3 = x => { x = Math.min(1, Math.max(0, x)); return 1 - Math.pow(1 - x, 3); };
const CAM = [
  // t0, t1, from [cx,cy,z], to [cx,cy,z], ease, focus (zoom about a fixed point)
  [0, 4.8, [960, 540, 1.0], [960, 528, 1.045], ss],
  [4.8, 9.6, [960, 528, 1.045], [960, 556, 1.02], ss],
  [9.6, 11.7, [960, 556, 1.02], [HINGE.x, HINGE.y, 14], eio, true],
  [11.7, 25.5, [HINGE.x, HINGE.y, 14], [HINGE.x, HINGE.y, 14], ss],
  [25.5, 26.4, [HINGE.x, HINGE.y, 14], [960, 540, 1.0], eio, true],
  [26.4, 28.2, [960, 540, 1.0], [960, 540, 1.04], ss],
  [28.2, 29.4, [960, 540, 1.04], [960, 420, 1.1], eio, true],
  [29.4, 33.6, [960, 420, 1.1], [960, 425, 1.1], ss],
  [33.6, 34.2, [960, 425, 1.1], [960, 470, 1.12], eio, true],
  [34.2, 36.0, [960, 470, 1.12], [960, 480, 1.08], ss],
  [36.0, 38.4, [960, 480, 1.08], [960, 540, 1.0], ss],
  [38.4, 40.8, [960, 540, 1.0], [1640, 800, 2.5], eio, true],
  [40.8, 45.6, [1640, 800, 2.5], [1650, 800, 2.9], ss],
  [45.6, 46.5, [1650, 800, 2.9], [960, 540, 1.0], eo3, true],
  [46.5, 49.2, [960, 540, 1.0], [960, 540, 1.02], ss],
  [49.2, 51.6, [960, 540, 1.02], [960, 470, 1.12], ss],
  [51.6, 56.0, [960, 470, 1.12], [960, 410, 1.5], ss],
  [56.0, 60.0, [960, 410, 1.5], [960, 410, 1.56], ss]
];
export function camera(t) {
  let s = CAM[CAM.length - 1], u = 1;
  for (const k of CAM) if (t < k[1]) { s = k; u = (t - k[0]) / (k[1] - k[0]); break; }
  const [, , a, b, ease, focus] = s, e = ease(u);
  const z = a[2] * Math.pow(b[2] / a[2], e);
  let f = e;
  if (focus && a[2] !== b[2]) f = (1 / a[2] - 1 / z) / (1 / a[2] - 1 / b[2]);
  return { cx: a[0] + (b[0] - a[0]) * f, cy: a[1] + (b[1] - a[1]) * f, z };
}
// height of the slot through which the section drawing shows (0 = the board, 1080 = only the drawing)
export function shutter(t) {
  if (t < T.open0) return 0;
  if (t < T.open1) return 1080 * eio((t - T.open0) / (T.open1 - T.open0));
  if (t < T.close0) return 1080;
  if (t < T.close1) return 1080 * (1 - eio((t - T.close0) / (T.close1 - T.close0)));
  return 0;
}
