// The split-flap mechanism as data. A cell is a wheel of flaps; it can only turn forward.
// To show another character it must fall through every flap between the old one and the new one.
export const ALPHA = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.,';   // 40 flaps
export const NUM = ' 0123456789';                                   // 11 flaps (clock digits and counters)

const h01 = x => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export class Cell {
  constructor(o, ev, log) {
    Object.assign(this, o);
    this.wheel = o.wheel || ALPHA;
    this.idx0 = o.idx0 || 0; this.tone0 = o.tone0 || 'n';
    this.endIdx = this.idx0; this.endTone = this.tone0;
    this.fl = [];        // flaps: [ts, te, from, to, tone]
    this.lastEnd = -1;
    this._ev = ev; this._log = log;
  }
  // character and phase at time t
  at(t) {
    const fl = this.fl; let lo = 0, hi = fl.length - 1, i = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (fl[m][0] <= t) { i = m; lo = m + 1; } else hi = m - 1; }
    if (i < 0) return { a: this.idx0, b: this.idx0, ta: this.tone0, tb: this.tone0, p: -1 };
    const f = fl[i], prevTone = i > 0 ? fl[i - 1][4] : this.tone0;
    if (t >= f[1]) return { a: f[3], b: f[3], ta: f[4], tb: f[4], p: -1 };
    return { a: f[2], b: f[3], ta: prevTone, tb: f[4], p: (t - f[0]) / (f[1] - f[0]) };
  }
  // characters visible at t if fully settled, else null
  settled(t) { const s = this.at(t); return s.p < 0 ? this.wheel[s.b] : null; }
  // The cell is (partly) busy at time t?
  busy(t) { return this.at(t).p >= 0; }
}

// write(cell, t0, target, {tone, step, land, extra, times})
// returns the number of flaps. land: the last flap lands at this time (t0 is derived).
export function write(cell, t0, target, o = {}) {
  const W = cell.wheel.length, tone = o.tone ?? cell.endTone;
  const ti = typeof target === 'number' ? target : cell.wheel.indexOf(target);
  if (ti < 0) throw new Error('character not on the wheel: ' + JSON.stringify(target) + ' (cell ' + cell.id + ')');
  let n = ((ti - cell.endIdx) % W + W) % W;
  if (n === 0 && tone !== cell.endTone) n = W;
  n += (o.extra || 0) * W;
  if (n === 0) return 0;
  if (o.span) { o = { ...o, start: o.span[0], times: Array.from({ length: n }, (_, k) => o.span[0] + (k + 1) * (o.span[1] - o.span[0]) / n) }; }
  const jit = 0.94 + 0.12 * h01(cell.id * 7.13 + n * 0.37 + (o.seed || 0));
  const step = (o.step ?? 0.05) * jit;
  let ts = o.times ? null : (o.land !== undefined ? o.land - n * step : t0);
  if (o.times) { // explicit cumulative landing times (length n), e.g. an accelerando
    if (o.times.length !== n) throw new Error('times length ' + o.times.length + ' != flaps ' + n);
    ts = o.start ?? (o.times[0] - (o.times[1] !== undefined ? o.times[1] - o.times[0] : step));
  }
  if (ts < cell.lastEnd - 1e-6 && cell.lastEnd > 0) { cell._log.push({ cell: cell.id, want: ts, free: cell.lastEnd }); if (!o.times) ts = cell.lastEnd; }
  let cur = cell.endIdx, end = ts;
  for (let k = 0; k < n; k++) {
    const a = ts + (o.times ? (k === 0 ? 0 : o.times[k - 1] - ts) : k * step);
    const b = o.times ? o.times[k] : ts + (k + 1) * step;
    const from = cur, to = (cur + 1) % W;
    cell.fl.push([a, b, from, to, tone]);
    if (cell.snd !== 'none') cell._ev.push({ t: +b.toFixed(4), type: cell.snd, x: +cell.pan.toFixed(2), n: cell.id });
    cur = to; end = b;
  }
  cell.endIdx = cur; cell.endTone = tone; cell.lastEnd = end;
  return n;
}
