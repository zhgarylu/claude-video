// "Five Hats and One Sock": a seafaring-adventure manga in code. Page contract: READY, DUR, EV, render(t), TEXTS(t).
import { paper, setFrame } from './ink.js';
import { DUR, WIPES, cues, events } from './script.js';
import { TX, sceneCut, sceneChart, scenePosters, sceneWorld, sceneDig, sceneShock, wipe, caption, sfxLayer } from './scenes.js';
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
await Promise.all(['40px Bangers', '40px Rye', '40px Pirata', '40px Hand', '40px Brush'].map(f => document.fonts.load(f)));
await document.fonts.ready;
window.DUR = DUR; window.EV = events();
const CUES = cues();
// scene segments: [from, to, draw]
const SEG = [
  [0, 3.15, (t) => { setFrame(t, 1); sceneCut(ctx, t); }],
  [3.0, 9.0, (t) => { setFrame(t, 1); sceneChart(ctx, t); }],
  [9.0, 22.95, (t) => { setFrame(t, 1); scenePosters(ctx, t); }],
  [22.0, 42.25, (t) => sceneWorld(ctx, t, 'sail')],
  [41.75, 44.25, (t) => sceneWorld(ctx, t, 'island')],
  [44.25, 46.5, (t) => { setFrame(t, 1); sceneDig(ctx, t); }],
  [46.5, 48.05, (t) => { setFrame(t, 1); sceneShock(ctx, t); }],
  [47.65, 60.5, (t) => sceneWorld(ctx, t, 'feast')],
];
const DRAW = { cut: SEG[0][2], chart: SEG[1][2], posters: SEG[2][2], sail: SEG[3][2], island: SEG[4][2], dig: SEG[5][2], shock: SEG[6][2], feast: SEG[7][2] };
function frame(t) {
  // [old, new] for the wipes; otherwise one scene
  const W = WIPES.find(w => t >= w.t0 && t < w.t1);
  const at = (a, b) => (t >= a && t < b);
  let old = null, nw = null;
  if (W) {
    const k = WIPES.indexOf(W);
    [old, nw] = [['cut', 'chart'], ['chart', 'posters'], ['posters', 'sail'], ['sail', 'island'], ['shock', 'feast']][k];
  } else if (t < 3.0) old = 'cut'; else if (t < 9.0) old = 'chart'; else if (t < 22.95) old = 'posters'; else if (t < 41.75) old = 'sail';
  else if (t < 44.25) old = 'island'; else if (t < 46.5) old = 'dig'; else if (t < 47.65) old = 'shock'; else old = 'feast';
  if (old === 'island' && t < 42.25 && !W) old = 'island';
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080);
  DRAW[old](t);
  if (nw) { ctx.setTransform(1, 0, 0, 1, 0, 0); wipe(ctx, W, (t - W.t0) / (W.t1 - W.t0), () => { ctx.setTransform(ctx.getTransform()); DRAW[nw](t); }); }
}
window.render = (t) => {
  TX.length = 0;
  frame(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  sfxLayer(ctx, t);
  caption(ctx, t, CUES);
};
window.TEXTS = (t) => TX.map(b => ({ ...b }));
window.READY = true;
