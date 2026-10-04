// models.js: the fold sequences used by the proof frames (and checked by foldcheck.mjs). Pure data + Sheet calls.
import { Sheet } from './engine/fold.js';
import * as TL from './timeline.js';

const PI = Math.PI;

// n successive halvings, alternating a vertical and a horizontal crease through the middle of what is left.
// x/y extents of the folded packet are tracked so each crease sits at the packet's centre.
export function halving(n, o = {}) {
  const s = new Sheet({ w: o.w ?? .15, at: o.at, curl: o.curl });
  let x0 = -s.w / 2, x1 = s.w / 2, y0 = -s.h / 2, y1 = s.h / 2, t = o.t0 ?? .4;
  for (let i = 0; i < n; i++) {
    if (i % 2 === 0) { const xm = (x0 + x1) / 2; s.fold({ a: [xm, -1], b: [xm, 1], side: i % 4 === 0 ? 'L' : 'R', kind: 'valley', keys: [t, t + (o.dur ?? 1)], wear: .5 }); if (i % 4 === 0) x0 = xm; else x1 = xm; }
    else { const ym = (y0 + y1) / 2; s.fold({ a: [-1, ym], b: [1, ym], side: i % 4 === 1 ? 'L' : 'R', kind: 'valley', keys: [t, t + (o.dur ?? 1)], wear: .5 }); if (i % 4 === 1) y1 = ym; else y0 = ym; }
    t += o.gap ?? 1.4;
  }
  return s;
}

// a single diagonal valley fold (corner to corner), flap on the upper-left
export function diagonal(o = {}) {
  const s = new Sheet({ w: o.w ?? .15, at: o.at, rot: o.rot, curl: o.curl ?? .3 });
  s.fold({ a: [-1, -1], b: [1, 1], side: 'L', kind: 'valley', keys: o.keys ?? [0, 1], wear: .4 });
  return s;
}

// accordion pleats: n parallel creases, alternating valley / mountain, all moving together (rest-mode folds).
// The first crease turns half as far, so the strip zigzags symmetrically about the table plane.
export function fan(o = {}) {
  const n = o.n ?? 10, w = o.w ?? .18, h = o.h ?? .15, s = new Sheet({ w, h, at: o.at, rot: o.rot, curl: o.curl ?? 0, seg: .008 });
  const pitch = w / (n + 1);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + pitch * (i + 1);
    s.fold({ a: [x, -1], b: [x, 1], side: 'R', kind: i % 2 ? 'mountain' : 'valley', mode: 'rest', angle: i === 0 ? PI / 2 : PI, keys: o.keys ?? [0, 1], wear: .35 });
  }
  return s;
}

// crease pattern: n halvings, then unfolded again with a little spring-back left in every crease
export function creaseSheet(n, o = {}) {
  const s = halving(n, { w: o.w ?? .15, gap: .5, dur: .5, t0: 0 });
  s.unfoldAll(n * .5 + .6, o.unfoldDur ?? 1.8);
  if (o.corner) { const h = s.w / 2; s.fold({ a: [h * .5, h], b: [h, h * .5], side: 'L', kind: 'valley', mode: 'rest', angle: Math.PI * .5, keys: [[n * .5 + (o.unfoldDur ?? 1.8) + .8, 0], [n * .5 + (o.unfoldDur ?? 1.8) + 1.6, .3]], curl: .6, wear: .2, slots: false }); }
  return s;
}

// The film's sheet: a long strip. Six halvings, a seventh that will not close, an overlapping unfold
// (all creases are parallel, so they may overlap in time), then eight pleats that collapse together and open with one pull.
export function strip(o = {}) {
  const s = new Sheet({ ...TL.SHEET, ...o, curl: 0 });
  let x0 = -s.w / 2, x1 = s.w / 2;
  for (let i = 0; i < 6; i++) {
    const xm = (x0 + x1) / 2;
    s.fold({ a: [xm, -1], b: [xm, 1], side: 'L', kind: 'valley', keys: [[TL.FOLD_T[i][0], 0], [TL.FOLD_T[i][1], 1]], curl: TL.FOLD_CURL[i], wear: .55 });
    x0 = xm;
  }
  s.fold({ a: [(x0 + x1) / 2, -1], b: [(x0 + x1) / 2, 1], side: 'L', kind: 'valley', keys: TL.SEVEN, curl: 0, wear: .2 });
  for (let k = 5; k >= 0; k--) { const a = TL.UNFOLD.t0 + (5 - k) * TL.UNFOLD.step, op = s.ops[k]; op.keys.push([a, 1], [a + TL.UNFOLD.win, 0]); }
  const P = TL.PLEAT, pitch = s.w / P.n;
  for (let i = 1; i < P.n; i++) {
    const x = -s.w / 2 + pitch * i;
    s.fold({ a: [x, -1], b: [x, 1], side: 'R', kind: i % 2 ? 'valley' : 'mountain', mode: 'rest', angle: i === 1 ? Math.PI / 2 : Math.PI, curl: 0, wear: .35,
      keys: [[P.collapse[0], 0], [P.collapse[1], P.max], [P.hold, P.max], [P.pull[1], 0]] });
  }
  return s;
}
