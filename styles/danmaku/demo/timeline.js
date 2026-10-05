// Single source of truth for time. Everything is authored in PLAYER time tau (the video's own clock);
// film time t differs only by the pause: the player stops at tau = PAUSE.at for PAUSE.len seconds.
import { track } from '/core/lib.js';

export const BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 4;           // 0.625 s, 2.5 s
export const VID = 57.5;                                          // video length shown in the player
export const PAUSE = { at: 50.0, len: BAR };                      // one bar of paused player
export const DUR = VID + PAUSE.len;                               // 60 s of film
export const Q = BEAT / 4;                                        // 16th: comment spawns snap here

export const tauOf = t => t < PAUSE.at ? t : t < PAUSE.at + PAUSE.len ? PAUSE.at : t - PAUSE.len;
export const filmOf = tau => tau < PAUSE.at ? tau : tau + PAUSE.len;      // the film time at which tau is (re)reached after the pause
export const paused = t => t >= PAUSE.at && t < PAUSE.at + PAUSE.len;

export const CHAPTERS = [
  { id: 'STARTER', a: 0, b: 7.5 }, { id: 'MIX', a: 7.5, b: 15 }, { id: 'FOLD', a: 15, b: 25 },
  { id: 'PROOF', a: 25, b: 35 }, { id: 'BAKE', a: 35, b: 45 }, { id: 'CUT', a: 45, b: VID },
];

// key moments, player time
export const K = {
  levelUp0: 2.5, levelUp1: 6.5, smile: 5.6,
  flour0: 8.4, flour1: 10.4, water0: 10.8, water1: 12.2, stir0: 12.4, stir1: 14.6,
  folds: [17.5, 19.375, 21.25, 23.125],
  rise0: 25.6, rise1: 33.0, poke0: 33.2, poke1: 33.8, ready: 34.6,
  spring0: 37.0, spring1: 43.0, wall0: 40.6, wall1: 45.0, payoff: 44.0,
  crackle0: 45.6, crackle1: 48.6, knifeIn: 48.4,
  cut0: 50.0, cut1: 51.2, turn0: 51.2, turn1: 52.1,
  press0: 52.0, burst: 53.25, type0: 52.5, send: 55.0,
};
// scripted pops of the starter's bubbles (also sound events)
export const POPS = [1.1, 1.9, 2.6, 3.0, 3.5, 3.9, 4.2, 4.6, 4.9, 5.2, 5.5, 5.8, 6.1, 6.4, 6.8, 7.1];
export const STATIONS = { jar: 700, bowl: 2300, board: 3900, proof: 5500, oven: 7100, cut: 8700 };

// camera on the scene: [tau, [centre x, centre y, zoom]]
export const camTrack = track([
  [0, [780, 610, 1.5]], [5.0, [722, 645, 1.85]], [6.6, [730, 640, 1.88]], [7.7, [1500, 640, 1.25]], [8.8, [2300, 640, 1.55]],
  [13.8, [2300, 650, 1.72]], [14.6, [3000, 680, 1.35]], [15.7, [3900, 760, 1.9]], [24.0, [3900, 765, 2.05]],
  [24.8, [4700, 640, 1.5]], [25.9, [5500, 575, 1.15]], [34.4, [5500, 590, 1.4]], [35.3, [6300, 620, 1.3]],
  [36.4, [7100, 640, 1.5]], [38.4, [7100, 625, 2.0]], [44.6, [7100, 625, 2.12]], [45.4, [7900, 660, 1.6]], [46.3, [8700, 670, 1.5]],
  [49.9, [8700, 690, 1.8]], [51.0, [8700, 700, 1.9]], [52.1, [8830, 700, 2.0]], [57.5, [8830, 700, 2.12]],
]);
// the comment layer zooms into the wall of reactions (1 = locked player)
export const commentZoom = track([[0, [1]], [40.2, [1]], [41.4, [1.22]], [43.8, [1.3]], [45.0, [1.3]], [46.2, [1]], [60, [1]]]);

