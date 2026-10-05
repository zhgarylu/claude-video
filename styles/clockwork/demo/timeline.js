// timeline.js: the film's clock. Machine time tau (the chain's own seconds) maps to film time through one slow-motion window;
// everything else (map, rewind, swap, second run, ending) is laid out after it. Shared by picture, sound and subtitles.
const SL0 = 14.15, SL1 = 15.05, RATE = 0.30;
const ss = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const rate = tau => 1 - (1 - RATE) * (ss((tau - SL0) / 0.25) - ss((tau - SL1) / 0.45));   // film seconds advance 1/rate per machine second
const N = 16000, DT = 0.001, F = new Float64Array(N + 1);
for (let i = 0; i < N; i++) F[i + 1] = F[i] + DT / rate((i + 0.5) * DT);
export const tauToFilm = tau => { const x = Math.max(0, tau) / DT, i = Math.min(N - 1, Math.floor(x)); return F[i] + (F[i + 1] - F[i]) * (x - i); };
export const filmToTau = t => { if (t <= 0) return 0; let lo = 0, hi = N; while (hi - lo > 1) { const m = (lo + hi) >> 1; (F[m] <= t ? lo = m : hi = m); } return (lo + (t - F[lo]) / (F[lo + 1] - F[lo])) * DT; };

const TAU_END1 = 15.7, TAU_END2 = 9.6;
const RUN1_END = tauToFilm(TAU_END1);
const MAP0 = RUN1_END + 0.2, MAP1 = MAP0 + 8.0, REW0 = MAP1, REW1 = REW0 + 3.2, SW0 = REW1, SW1 = SW0 + 4.2;
const RUN2 = SW1, RUN2_END = RUN2 + TAU_END2, CMP0 = RUN2_END + 0.2, CMP1 = CMP0 + 5.4;
const REW2_0 = CMP1, REW2_1 = REW2_0 + 2.6, END0 = REW2_1 + 1.2, DUR = END0 + 5.4;
export const SCHED = { TAU_END1, TAU_END2, RUN1_END, T_DOM1: tauToFilm(SL1), T_DOM0: tauToFilm(SL0), MAP0, MAP1, REW0, REW1, SW0, SW1, RUN2, RUN2_END, CMP0, CMP1, REW2_0, REW2_1, END0, DUR };

// voice-over: start times in film seconds; `sub` is the caption (digits as digits)
export const VO = [
  { id: 'v01', t: 0.4, text: 'Every process is a chain of small pushes.', sub: 'Every process is a chain of small pushes.' },
  { id: 'v03', t: 5.4, text: 'Four to one, twice. Sixteen times slower.', sub: 'Four to one, twice. 16 times slower.' },
  { id: 'v04', t: 9.5, text: 'So everything after it waits.', sub: 'So everything after it waits.' },
  { id: 'v05', t: SCHED.T_DOM0 + 0.1, text: 'Then, all at once.', sub: 'Then, all at once.' },
  { id: 'v06', t: RUN1_END + 0.1, text: 'A chain runs at the pace of its slowest link.', sub: 'A chain runs at the pace of its slowest link.' },
  { id: 'v07', t: MAP0 + 4.1, text: 'Trace it back: more than half the time went to one link.', sub: 'Trace it back: more than half the time went to one link.' },
  { id: 'v08', t: SW0 + 0.5, text: 'So change only that link. Swap one pair for equal gears.', sub: 'So change only that link. Swap one pair for equal gears.' },
  { id: 'v09', t: RUN2 + 4.6, text: 'Same chain. Same pushes. Six seconds sooner.', sub: 'Same chain. Same pushes. Six seconds sooner.' },
  { id: 'v10', t: END0 + 1.3, text: "Don't hurry the fast links. Find the one that waits.", sub: "Don't hurry the fast links. Find the one that waits." },
];
