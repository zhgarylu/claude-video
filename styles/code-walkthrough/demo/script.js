// The film's score sheet: one place for every time. Picture, sound, captions and checks read it.
// Times are film seconds. The line starts (AT) follow the Kokoro durations in voices/dur.json with 0.4 to 0.7 s of air between lines.
import { V } from './verified.js';
export const DUR = 67;
export const AT = { l1: .6, l2: 10.9, l3: 19.2, l4: 26.7, l5: 33.8, l6: 46.0, l7: 50.9, l8: 58.3 };
export const SRC = { buggy: V.srcBuggy.replace(/\n$/, '').split('\n'), fixed: V.srcFixed.replace(/\n$/, '').split('\n') };
export const FILE = 'search.py', PYV = V.py;
export const T = {                                 // named moments
  run: 9.55, out1: 10.7, wrong: 16.2, thud: 16.9, swap: 18.7, swapEnd: 19.6, zoomA: 39.0, zoomAend: 43.9, diff: 46.4, fold: 48.7, zoomB: 48.3,
  split: 50.7, run2: 51.2, out2: 52.4, flip: 58.3, flipEnd: 59.2,
};
// editor focus: lines a..b are lit, everything else dims; the bar slides between keys. {none:true} = nothing dimmed.
export const FOCUS = [
  { t: 0, none: true }, { t: 10.9, a: 15, b: 16 }, { t: 13.9, a: 14, b: 14 }, { t: 15.8, none: true },
  { t: 21.0, a: 2, b: 2 }, { t: 22.8, a: 3, b: 3 }, { t: 24.6, a: 4, b: 4 },
  { t: 26.9, a: 7, b: 7 }, { t: 28.0, a: 8, b: 8 }, { t: 29.7, a: 4, b: 4 }, { t: 30.4, a: 7, b: 7 }, { t: 31.5, a: 9, b: 10 },
  { t: 33.9, a: 3, b: 3 }, { t: 44.2, a: 11, b: 11 }, { t: 45.6, none: true },
  { t: 46.1, a: 3, b: 3 }, { t: 49.9, none: true }, { t: 51.4, a: 5, b: 6 }, { t: 55.2, none: true },
];
// side-panel state: pointers and watch values change at these times
export const STATE = [
  { t: 19.3, target: 16 }, { t: 21.5, lo: 0 }, { t: 22.2, hi: 6 }, { t: 25.4, mid: 3 }, { t: 26.9, im: 12 },
  { t: 28.4, lo: 4 }, { t: 30.0, mid: 5 }, { t: 30.6, im: 23 }, { t: 32.3, hi: 4 }, { t: 52.0, mid: 4, im: 16 },
];
// chips on code lines (blue = explains, red = wrong, green = right, amber = look here)
export const CHIPS = [
  { t0: 27.4, t1: 30.2, line: 7, text: '12 < 16 : go right', kind: 'info' },
  { t0: 28.5, t1: 31.3, line: 8, text: 'lo becomes 4', kind: 'info' },
  { t0: 30.7, t1: 33.7, line: 7, text: '23 < 16 ? no : go left', kind: 'info' },
  { t0: 32.4, t1: 35.8, line: 10, text: 'hi becomes 4', kind: 'info' },
  { t0: 40.4, t1: 42.5, line: 3, text: '4 < 4 ?', kind: 'focus' },
  { t0: 42.5, t1: 46.1, line: 3, text: '4 < 4 is False', kind: 'bad' },
  { t0: 44.6, t1: 47.9, line: 11, text: 'exit: return -1', kind: 'bad' },
  { t0: 50.0, t1: 53.4, line: 3, text: 'lo == hi still runs', kind: 'good' },
  { t0: 52.1, t1: 55.6, line: 6, text: '16 == 16 : return 4', kind: 'good' },
];
// the one-line note under the array
export const NOTES = [
  { t: 19.9, text: 'sorted list, looking for 16', kind: 'info' },
  { t: 22.8, text: 'candidates: everything from lo to hi', kind: 'info' },
  { t: 27.3, text: '12 < 16: the target is to the right', kind: 'info' },
  { t: 30.5, text: '23 > 16: the target is to the left', kind: 'info' },
  { t: 36.5, text: 'one candidate left: 16', kind: 'focus' },
  { t: 42.6, text: 'loop exits without checking 4', kind: 'bad' },
  { t: 52.1, text: 'found: 16 is at index 4', kind: 'good' },
];
// the camera: z = zoom, a token or a point to look at
export const CAMS = [
  { t: 0, z: 1 },
  { t: T.zoomA, d: 1.0, z: 2.14, tok: { line: 3, col: 13, dx: 170, dy: 10 } },
  { t: T.zoomAend, d: .8, z: 1 },
  { t: T.zoomB, d: .7, z: 2.14, tok: { line: 3, col: 13, dx: 170, dy: 10 } },
  { t: 50.0, d: .8, z: 1 },
];
// terminal annotations (UI sans, right of an output line)
export const ANN1 = [{ line: 0, text: 'expected 4' }, { line: 1, text: 'expected 6' }];
export const ANN2 = [{ t: 52.7, line: 0, text: 'index 4', kind: 'good' }, { t: 53.9, line: 1, text: 'index 6', kind: 'good' }, { t: 55.5, line: 2, text: 'not in the list: right', kind: 'dim' }];
// captions: [t0, t1, text]; the text may use the code's words (lo, hi) where the voice says low, high
export const CUES = [
  [.6, 3.0, 'Here is binary search, in Python.'],
  [10.9, 14.1, 'We look up 16, 38 and 7.'], [14.2, 16.1, '16 and 38 are in the list,'], [16.2, 18.6, 'yet both come back minus one.'],
  [19.2, 21.0, "Let's follow 16."], [21.0, 24.5, 'Two pointers, lo and hi, mark what is still in play.'], [24.6, 26.3, 'Each turn, we look at the middle.'],
  [26.7, 30.2, '12 is too small, so lo jumps past it.'], [30.3, 33.4, '23 is too big, so hi comes down to 4.'],
  [33.8, 36.4, 'Now lo and hi are both 4.'], [36.5, 39.2, 'One candidate left, and it is 16.'], [39.3, 42.2, 'But the loop asks: is lo < hi?'],
  [42.3, 44.1, '4 is not less than 4.'], [44.1, 45.9, 'It quits without looking.'],
  [46.0, 47.9, 'The fix is a single character.'], [48.1, 50.3, 'Less than becomes less than or equal.'],
  [50.9, 53.6, 'Run it again. 16 sits at index 4.'], [53.9, 57.6, '38 at 6, and 7 is still correctly missing.'],
  [58.3, 61.7, 'The rule: while one candidate remains, keep looking.'], [61.8, 63.8, 'Even when it is the last.'],
];
