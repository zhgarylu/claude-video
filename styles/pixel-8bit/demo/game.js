// Per-frame game state (a pure function of the integer game frame) and the event list EV that the sound is made from.
import { blankState } from './ppu.js';
import { scenes, title, hud, strip, FOREST_BD, TOWER_BD, TITLE_BD, LAMP_X } from './scenes.js';
import { buildSheet, SPR_PAL, meta, WICK_PAL } from './sprites.js';
import { fadeId, C } from './palette.js';
import * as TL from './timeline.js';

export const sheet = buildSheet();
const { CAM } = TL;
const OB = (x, y, tile, pal, flipH = false) => ({ x: Math.floor(x), y: Math.floor(y), tile, pal, flipH, flipV: false, behind: false });
const inR = (f, a, b) => f >= a && f < b;

// ================= events =================
const EV = []; const ev = (f, type, o = {}) => EV.push({ f, type, ...o });
[[0, 'title'], [384, 'run'], [TL.T_NIGHT, 'night'], [TL.T_TOWER, 'silence'], [1728, 'swarm'], [TL.T_ZERO, 'zero'], [TL.T_LIGHT, 'light'], [2784, 'tally'], [TL.T_RETURN, 'bookend'], [TL.DUR_F, 'end']].forEach(([f, name]) => ev(f, 'sec', { name }));
TL.FADES.forEach(([a, b]) => { for (let k = 0; k < 5; k++) ev(a + Math.round(k * (b - a) / 5), 'fadestep'); });
ev(200, 'menu'); ev(352, 'start');
for (let f = TL.T_FOREST + 40; f < TL.T_TOWER - 40; f++) if (f % 16 === 0 && CAM[f] !== CAM[f - 1]) ev(f, 'step');
TL.COIN_F.forEach(f => ev(f, 'coin'));
TL.LAMPS.forEach(l => { ev(l.raise, 'raise'); ev(l.spark, 'spark'); ev(l.lit, 'lamp'); });
ev(TL.T_NIGHT, 'night'); ev(TL.T_NIGHT + 34, 'night');
for (let f = TL.CLIMB0; f < TL.CLIMB1; f += 12) ev(f, 'climb');
TL.WAVES.forEach(f => { ev(f, 'wave'); });
for (let f = TL.T_SWARM; f < TL.T_ZERO; f += 6) ev(f, 'flutter', { n: TL.mothCount(f) });
ev(TL.RAISE2, 'raise'); ev(TL.SPARK2.f0, 'spark'); ev(TL.T_LIGHT, 'flood'); ev(TL.T_LIGHT + 8, 'flee'); ev(TL.T_LIGHT + 10, 'ignite');
for (let f = TL.T_TALLY; f < TL.DUR_F; f++) if (TL.tally(f) !== TL.tally(f - 1) && TL.tally(f) > 0) ev(f, 'tick', { v: TL.tally(f) });
if (TL.NEWHI_F > 0) ev(TL.NEWHI_F, 'hiscore');
for (let f = TL.T_TALLY + 30; f < TL.T_RETURN - 120; f += 48) ev(f, 'hop');
TL.CAPS.forEach(c => ev(c.f0, 'msg', { text: c.text, f1: c.f1 }));
[[0, 384, 'DUSKLIGHT  A LAMPLIGHTER TALE']].forEach(([a, b, text]) => ev(a, 'text', { text, f1: b }));
export const EVENTS = EV.sort((a, b) => a.f - b.f).map(e => ({ ...e, t: +(e.f / 60).toFixed(4) }));
const JOLTS = [...TL.WAVES.map(f => [f, 2]), [TL.T_LIGHT, 3]];
const shake = f => { for (const [j, amp] of JOLTS) { const d = f - j; if (d >= 0 && d < 12) { const a = Math.max(0, amp - Math.floor(d / 4)); return d & 1 ? -a : a; } } return 0; };

// ================= helpers =================
const lower = (c, n) => (c & 15) === 13 ? c : (Math.max(0, (c >> 4) - n) << 4) | (c & 15);
const raise = (c, n) => (c & 15) === 13 ? c : (Math.min(3, (c >> 4) + n) << 4) | (c & 15);
const mapAll = (st, fn, withSprites = false, withOverlays = true) => {
  st.bgPal = st.bgPal.map(p => p.map(fn)); st.backdrop = st.backdrop.map(fn);
  if (withSprites) st.sprPal = st.sprPal.map(p => p.map(fn));
  if (withOverlays) (st.overlays || []).forEach(o => { o.bgPal = o.bgPal.map(p => p.map(fn)); o.bd = fn(o.bd); });
};
function fadeSteps(f) {
  for (const [a, b, d] of TL.FADES) if (f >= a && f < b) { const k = Math.floor((f - a) / ((b - a) / 5)); return d === 'in' ? 4 - k : k + 1; }
  return 0;
}
const bdFill = (st, bd) => { for (let y = 0; y < 240; y++) st.backdrop[y] = bd(y); };
const setBands = (st, bands, sh = 0) => { for (const [y0, y1, sx] of bands) for (let y = y0; y < y1; y++) st.scrollX[y] = sx + sh; };
const rot = (arr, k) => { if (!arr.length) return arr; const n = k % arr.length; return arr.slice(n).concat(arr.slice(0, n)); };
function overlays(st, f, stage) {
  const sc = TL.score(f), hi = TL.hiScore(f), hs = hud(sc, hi, TL.litCount(f), TL.NEWHI_F > 0 && f >= TL.NEWHI_F, stage);
  st.overlays = [{ y0: 0, y1: 32, scene: hs, bgPal: hs.pals.map(p => p.slice()), bd: C.black }];
  const c = TL.capAt(f);
  if (c) { const sc2 = strip(c.text); st.overlays.push({ y0: 224, y1: 240, scene: sc2, bgPal: sc2.pals.map(p => p.slice()), bd: C.black }); }
  for (const o of st.overlays) for (let y = o.y0; y < o.y1; y++) { st.backdrop[y] = o.bd; st.scrollX[y] = 0; }
}
const wick = (name, x, y, flip = false) => meta(sheet, name, x, y, 2, 3, WICK_PAL, { flipH: flip });
const lantern = (f, x, y) => OB(x, y + ((f >> 4) & 1), sheet.id('lamp' + ((f >> 3) & 1)), 2);
const cutin = f => TL.CUTINS.find(([a, b]) => f >= a && f < b);

// ================= scenes =================
function titleState(f) {
  const hi = f < TL.T_RETURN ? TL.HI0 : TL.FINAL, st = blankState(title(hi), sheet);
  bdFill(st, TITLE_BD); st.sprPal = SPR_PAL.map(p => p.slice());
  for (let y = 104; y < 136; y++) st.scrollX[y] = f >> 3;
  const on = f >= 352 ? ((f >> 2) & 1) === 0 : ((f >> 4) & 1) === 0, hx = ((f >> 1) % 320) - 24, run = ['stepA', 'stand', 'stepB', 'stand'][(f >> 3) & 3];
  st.oam = [...(on ? [OB(13 * 8 - 12, 136, sheet.id('cursor'), 2)] : []), lantern(f, hx + 12, 208 + 14), ...wick(run, hx, 208)].filter(o => o.x > -8 && o.x < 256);
  return st;
}
function forestState(f) {
  const st = blankState(scenes.forest, sheet), cam = CAM[f], sh = shake(f), h = TL.heroForest(f), nl = f < TL.T_NIGHT ? 0 : f < TL.T_NIGHT + 34 ? 1 : 2;
  bdFill(st, FOREST_BD); st.sprPal = SPR_PAL.map(p => p.slice());
  setBands(st, [[32, 64, cam >> 4], [64, 96, cam >> 6], [96, 144, cam >> 2], [144, 192, cam >> 1], [192, 240, cam]], sh);
  overlays(st, f, TL.stageLabel(f));
  if (nl) { const fn = c => lower(c, nl); st.bgPal = st.bgPal.map(p => p.map(fn)); st.backdrop = st.backdrop.map((c, y) => (y < 32 || y >= 224) ? c : fn(c)); }
  const oam = [], dyn = [], hy = TL.GROUND - 24;
  const lamp = TL.LAMPS.find(l => f >= l.f0 && f < l.f1 + 6), raising = lamp && f >= lamp.raise && f < lamp.lit + 14;
  if (raising) { oam.push(...wick('raise', h.x, hy)); oam.push(lantern(f, h.x + 9, hy - 5)); }
  else { const fr = h.moving ? ['stepA', 'stand', 'stepB', 'stand'][(f >> 3) & 3] : 'stand'; oam.push(...wick(fr, h.x, hy)); oam.push(lantern(f, h.x + 13, hy + 15)); }
  // sparks, lit lamps
  for (const l of TL.LAMPS) {
    const lx = TL.lampScreenX(l.k, f);
    if (f >= l.spark && f < l.lit) { const t = (f - l.spark) / (l.lit - l.spark); dyn.push(meta(sheet, 'flare' + ((f >> 2) & 1), Math.floor(h.x + 10 + (lx - 8 - h.x - 10) * t), Math.floor(hy - 8 + (146 - hy + 8) * t), 2, 2, 2)); }
    if (f >= l.lit) { if (lx > -24 && lx < 256) dyn.push(meta(sheet, 'glow', lx - 11, 145, 3, 3, 2)); if (f < l.lit + 12) dyn.push(meta(sheet, 'flare' + ((f >> 1) & 1), lx - 8, 148, 2, 2, 2)); }
  }
  for (const c of TL.COINS) {
    const x = TL.coinScreenX(c, f);
    if (f < c.f && x > -16 && x < 256) dyn.push(meta(sheet, 'coin' + (((f >> 3) + c.f) & 3), x, 168, 2, 2, 2));
    if (f >= c.f && f < c.f + 12) dyn.push(meta(sheet, 'flare' + ((f >> 2) & 1), Math.floor(TL.coinScreenX(c, c.f)), 164, 2, 2, 2));
  }
  st.oam = [...oam, ...dyn.flat()].slice(0, 64);
  const ci = cutin(f); if (ci) st.view = { x0: ci[2], y0: ci[3] };
  return st;
}
function towerState(f) {
  const lit = f >= TL.T_LIGHT, st = blankState(lit ? scenes.towerLit : scenes.tower, sheet), sy = TL.towerScroll(f), sh = shake(f);
  bdFill(st, TOWER_BD); st.sprPal = SPR_PAL.map(p => p.slice());
  st.scrollY.fill(sy); st.scrollX.fill(sh);
  overlays(st, f, '2-3');
  // the lamp room's palette: dark glass until the light, then it flickers between two entries
  const li = st.bgPal.findIndex(p => p.includes(C.red1) && p.includes(C.yellow3));
  if (li >= 0) {
    if (!lit) st.bgPal[li] = st.bgPal[li].map(c => c === C.yellow2 ? C.grey0 : c === C.yellow3 ? C.grey1 : c);
    else if (f >= TL.T_LIGHT + 14 && ((f / 12) | 0) & 1) st.bgPal[li] = st.bgPal[li].map(c => c === C.yellow3 ? C.yellow2 : c);
  }
  if (inR(f, TL.T_LIGHT, TL.T_LIGHT + 12)) { const n = 3 - Math.floor((f - TL.T_LIGHT) / 4); mapAll(st, c => raise(c, n), false, false); }
  const oam = [], dyn = [], hy = TL.heroTowerY(f) - sy, hx = TL.heroTowerX(f);
  const climbing = inR(f, TL.CLIMB0, TL.CLIMB1), raised = f >= TL.RAISE2 && f < TL.T_LIGHT + 80;
  if (climbing) oam.push(...wick('climb', hx, hy, ((f / 8) | 0) & 1));
  else if (raised) { oam.push(...wick('raise', hx, hy)); oam.push(lantern(f, hx + 9, hy - 5)); }
  else { const ph = (f - TL.T_TALLY - 30) % 48, hop = f >= TL.T_TALLY + 30 && f < TL.T_RETURN - 120 && ph < 16 ? -Math.round(12 * 4 * (ph / 16) * (1 - ph / 16)) : 0; oam.push(...wick('stand', hx, hy + hop)); if (f >= TL.CLIMB1) oam.push(lantern(f, hx + 13, hy + 15 + hop)); }
  if (inR(f, TL.SPARK2.f0, TL.SPARK2.f1)) { const t = (f - TL.SPARK2.f0) / (TL.SPARK2.f1 - TL.SPARK2.f0); dyn.push(meta(sheet, 'flare' + ((f >> 2) & 1), Math.floor(hx + 10 + (178 - hx - 10) * t), Math.floor(hy - 8 + (96 - sy - hy + 8) * t), 2, 2, 2)); }
  if (lit && f < TL.T_LIGHT + 20) dyn.push(meta(sheet, 'flare' + ((f >> 1) & 1), 178, 96 - sy, 2, 2, 2));
  for (let i = 0; i < TL.mothCount(f); i++) { const p = TL.mothPos(i, f); if (p[0] > -16 && p[0] < 256 && p[1] - sy > 20 && p[1] - sy < 232) dyn.push(meta(sheet, 'moth' + (((f >> 2) + i) & 1), p[0], p[1] - sy, 2, 1, 3)); }
  st.oam = [...oam, ...rot(dyn.flat(), f).slice(0)].slice(0, 64);
  const ci = cutin(f); if (ci) st.view = { x0: ci[2], y0: ci[3] };
  return st;
}
export function stateAt(f) {
  f = Math.max(0, Math.min(TL.DUR_F - 1, f));
  let st;
  if (f < TL.T_FOREST) st = titleState(f); else if (f < TL.T_TOWER) st = forestState(f); else if (f < TL.T_RETURN) st = towerState(f); else st = titleState(f);
  const n = fadeSteps(f); if (n) mapAll(st, c => fadeId(c, n), true);
  return st;
}
