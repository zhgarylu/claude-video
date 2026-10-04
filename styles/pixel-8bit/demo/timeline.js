// Dusklight's one source of truth: every pickup, light, caption and cue is an integer game frame (60 Hz).
// The picture (game.js) and the sound (mix.py, through events.json from window.EV) are both made from it.
import { LAMP_X, hash, TW } from './scenes.js';

export const BAR = 96, BEAT = 24, DUR_F = 3264;                 // 150 BPM, 34 bars = 54.4 s
export const T_FOREST = 384, T_NIGHT = 1056, T_TOWER = 1632, T_CLIMB = 1728, T_SWARM = 1872, T_ZERO = 2304, T_LIGHT = 2400, T_TALLY = 2544, T_RETURN = 3168;
export const GROUND = 200;                                      // feet line in the forest
export const HERO_X = 96;

// ---- forest camera: 1.5 px/frame with two stops, each placed where a dark lamp post stands in reach of the lantern ----
const layerX = (k, cam) => (((LAMP_X(k) - (cam >> 1)) % 256) + 256) % 256;      // screen x of lamp post k
function buildCam() {
  const cam = new Int32Array(DUR_F + 2), stops = []; let acc = 0, pause = null, want = [[620, 0], [1380, 1]], wi = 0;
  for (let f = 0; f <= DUR_F + 1; f++) {
    if (f >= T_FOREST && f < T_TOWER) {
      if (!pause && wi < want.length && f >= want[wi][0]) { const lx = layerX(want[wi][1], Math.floor(acc)); if (lx >= 186 && lx <= 224) { pause = { f0: f, f1: f + 88, k: want[wi][1] }; stops.push(pause); wi++; } }
      if (pause && f >= pause.f1) pause = null;
      if (!pause) acc += 1.5;
    }
    cam[f] = Math.floor(acc + 1e-9);
  }
  return { cam, stops };
}
const B = buildCam();
export const CAM = B.cam, STOPS = B.stops;                      // STOPS[i] = {f0, f1, k}: the pause where lamp k gets lit
export const lampScreenX = (k, f) => layerX(k, CAM[f]);
export const LAMPS = STOPS.map(s => ({ ...s, raise: s.f0 + 12, spark: s.f0 + 28, lit: s.f0 + 52, k: s.k }));
export const litCount = f => LAMPS.filter(l => f >= l.lit).length + (f >= T_LIGHT ? 1 : 0);

// ---- coins: collected by running through them at head-to-belt height ----
export const COIN_F = [520, 540, 560, 700, 720, 740, 1000, 1020, 1040, 1150, 1170, 1190, 1250];
export const COINS = COIN_F.map(f => ({ f, wx: HERO_X - 8 + CAM[f] }));
export const coinScreenX = (c, f) => c.wx - CAM[f];

// ---- hero ----
export const heroForest = f => ({ x: f < T_FOREST + 90 ? Math.min(HERO_X, -16 + Math.floor((f - T_FOREST) * 1.3)) : HERO_X, moving: CAM[f] !== CAM[f - 1] });
export const CLIMB0 = T_CLIMB, CLIMB1 = Math.floor(T_CLIMB + (392 - 88) / 1.16);            // ~1990
export const heroTowerY = f => f < T_CLIMB ? 392 : f >= CLIMB1 ? 88 : Math.round(392 - (f - T_CLIMB) * 1.16);   // top of the sprite, world y
export const heroTowerX = f => f < CLIMB1 - 24 ? 172 : f >= CLIMB1 ? 156 : 172 - Math.round((f - (CLIMB1 - 24)) * 16 / 24);
export const towerScroll = f => f < T_TOWER ? 240 : Math.max(0, Math.min(240, heroTowerY(f) - 152));
export const SPARK2 = { f0: 2376, f1: T_LIGHT };                                            // the lantern spark that lights the beacon
export const RAISE2 = 2160;

// ---- swarm: moths join in waves, freeze in the silence, flee at the light ----
export const MOTHS = 22;
export const mothCount = f => f < T_SWARM ? 0 : Math.min(MOTHS, 3 + Math.floor((f - T_SWARM) / 24));
export const WAVES = []; for (let w = 0; T_SWARM + 96 * w < T_ZERO; w++) WAVES.push(T_SWARM + 96 * w);
export function mothPos(i, f) {
  const ft = Math.min(f, T_ZERO), a = (ft * (1.1 + (i % 3) * 0.3) + i * 53) * Math.PI / 180, rx = 12 + (i % 6) * 7, ry = 5 + (i % 4) * 3;
  let x = 186 + Math.cos(a) * rx - 8, y = 104 + Math.sin(a) * ry - 4;
  if (f >= T_LIGHT) { const d = Math.max(0, f - T_LIGHT - (i % 4) * 4), dx = x + 8 - 186, dy = y - 104, n = Math.hypot(dx, dy) || 1; x += dx / n * d * 3; y += dy / n * d * 2.2 - d * 0.6; }
  return [Math.floor(x), Math.floor(y)];
}

// ---- captions (frame ranges); text is on-screen game text in the 8x8 tile font ----
export const CAPS = [
  [440, 600, 'STAGE 2-1  DUSK'], [LAMPS[0].lit, LAMPS[0].lit + 150, 'LAMP 1 LIT!'], [1070, 1220, 'NIGHT FALLS'], [LAMPS[1].lit, LAMPS[1].lit + 150, 'LAMP 2 LIT!'],
  [1740, 1920, 'THE BEACON IS DARK'], [1940, 2130, 'MOTHS ARE DRAWN TO LIGHT'], [2140, 2290, 'LIGHT IT!'], [2420, 2590, 'THE BEACON SHINES'],
  [2600, 2760, 'TIME BONUS'], [2800, 2950, 'STAGE CLEAR'], [2960, 3110, 'NEW HIGH SCORE'],
].map(([f0, f1, text], i) => ({ id: i, f0, f1, text }));
export const capAt = f => CAPS.find(c => f >= c.f0 && f < c.f1);

// ---- score ----
export const SC = [];                                           // [frame, points]
COINS.forEach(c => SC.push([c.f, 100])); LAMPS.forEach(l => SC.push([l.lit, 1000])); SC.push([T_LIGHT, 5000]);
export const TALLY_STEP = 3, TALLY_BONUS = 8100;
export const tally = f => f < T_TALLY ? 0 : Math.min(TALLY_BONUS, Math.floor((f - T_TALLY) / TALLY_STEP + 1) * 100);
export const score = f => SC.reduce((s, p) => s + (p[0] <= f ? p[1] : 0), 0) + tally(f);
export const FINAL = score(1e9), HI0 = 12400;
export const hiScore = f => Math.max(HI0, score(f));
export const stageLabel = f => f < T_NIGHT ? '2-1' : f < T_TOWER ? '2-2' : '2-3';
export const NEWHI_F = (() => { for (let f = 0; f < DUR_F; f++) if (score(f) > HI0) return f; return -1; })();

// fades (palette steps)
export const FADES = [[0, 36, 'in'], [348, 384, 'out'], [384, 420, 'in'], [1600, 1632, 'out'], [1632, 1668, 'in'], [3110, 3168, 'out']];
// close-up windows: [frame0, frame1, x0, y0] on a 256x180 window shown at x6
export const CUTINS = [[LAMPS[0].raise + 2, LAMPS[0].raise + 22, 0, 40], [T_LIGHT + 2, T_LIGHT + 26, 0, 40]];
