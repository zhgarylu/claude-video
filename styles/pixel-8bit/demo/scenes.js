// Dusklight backdrops, painted in code with master-palette ids and compiled through the constraint checker (ppu.js),
// plus the two overlay banks: the HUD (top 32 scanlines) and the caption strip (bottom 16 scanlines).
import { Paper, compile } from './ppu.js';
import { putText, putBig } from './font.js';
import { C } from './palette.js';

export const tri = x => { const f = x - Math.floor(x); return f < 0.5 ? f * 2 : 2 - f * 2; };
export const hash = n => { let h = (n * 374761393 + 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const blob = (p, cx, cy, rx, ry, c) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) p.px(cx + x, cy + y, c); };
const dither = (p, x0, y0, w, h, c, test) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (((x + y) & 1) === 0 && test(x, y)) p.px(x, y, c); };

// ============ forest at dusk (256 wide, every layer wraps) ============
// bands: 32-64 clouds | 64-96 sun | 96-144 far mountains | 144-192 pine hills and lamp posts | 192-240 grass and brick path
export const FOREST_BD = y => y < 32 ? C.black : y < 64 ? C.indigo1 : y < 96 ? C.magenta2 : y < 128 ? C.orange2 : y < 192 ? C.indigo0 : C.orange1;
export const LAMP_X = k => 40 + 128 * k;                     // lamp post k in the pine layer (paper x); two per 256 px
function paintForest() {
  const p = new Paper(256, 240);
  p.tiled(256, x0 => { for (const [cx, cy, rx, ry] of [[40, 46, 34, 7], [92, 40, 24, 6], [168, 52, 40, 6], [214, 42, 22, 5]]) {
    blob(p, x0 + cx, cy + 2, rx, ry, C.violet1); blob(p, x0 + cx - 2, cy - 1, rx - 2, ry - 1, C.violet3); } });
  p.tiled(256, x0 => { const cx = x0 + 128, cy = 79, d2 = (x, y) => (x - cx) ** 2 + (y - cy) ** 2;
    dither(p, cx - 26, 64, 52, 32, C.yellow2, (x, y) => d2(x, y) < 25 * 25 && d2(x, y) > 14 * 14);
    p.disc(cx, cy, 12, C.yellow2); p.disc(cx - 2, cy - 2, 7, C.grey3); });
  const mtop = x => 126 - Math.round(15 * tri(x / 128) ** 1.2 + 7 * tri((x + 37) / 64) + 3 * tri(x / 16));
  p.skyline(0, 256, 144, mtop, C.indigo0);
  for (let x = 0; x < 256; x++) { const t = mtop(x), lit = mtop(x + 3) <= mtop(x - 3), d = lit ? 7 : 2;
    for (let j = 0; j < d + 3; j++) if (j < d || ((x + t + j) & 1) === 0) p.px(x, t + j, C.violet1);
    if (t < 112) { p.px(x, t, C.violet3); p.px(x, t + 1, C.violet3); if (lit) p.px(x, t + 2, C.violet3); } }
  const hill = x => 180 - Math.round(7 * tri(x / 128));
  p.skyline(0, 256, 192, hill, C.green0);
  const nearLamp = cx => [0, 1].some(k => Math.abs(cx - LAMP_X(k)) < 30);
  const pine = (cx, base, h, hw, lit) => { const top = base - h;
    for (let y = top; y < base; y++) { const t = (y - top) / h, k = Math.min(2, Math.floor(t * 3)), fr = t * 3 - k, w = Math.max(1, Math.round((0.35 + 0.3 * k + 0.35 * fr) * hw / 1.4));
      for (let x = cx - w; x <= cx + w; x++) p.px(x, y, lit && x < cx - w + 2 && fr > 0.15 ? C.green1 : C.green0); } };
  for (let i = 0; i < 13; i++) { const cx = 6 + i * 20 + Math.round(hash(i + 70) * 8); pine(cx, hill(cx) + 2, 11 + Math.round(hash(i + 80) * 5), 6, false); }
  for (let i = 0; i < 8; i++) { const cx = 16 + i * 32 + Math.round(hash(i) * 10); if (nearLamp(cx)) continue; pine(cx, hill(cx) + 5, 28 + Math.round(hash(i + 40) * 18), 12, true); }
  for (let k = 0; k < 2; k++) { const cx = LAMP_X(k);                       // dark lamp posts: dark glass until Wick lights it (a glow sprite goes over it)
    p.rect(cx - 1, 167, 3, 21, C.green1); p.rect(cx - 5, 150, 11, 1, C.green1); p.rect(cx - 5, 150, 1, 12, C.green1); p.rect(cx + 5, 150, 1, 12, C.green1); p.rect(cx - 5, 162, 11, 2, C.green1);
    p.rect(cx - 4, 151, 9, 11, C.green0); p.rect(cx - 3, 146, 7, 3, C.green1); p.rect(cx - 1, 144, 3, 2, C.green1); }
  p.rect(0, 192, 256, 16, C.green0);
  for (let x = 0; x < 256; x++) { const h = (hash(x % 32) * 4) | 0; for (let j = 0; j <= h; j++) p.px(x, 192 + j, C.green1); }
  for (let x = 0; x < 256; x += 5) p.rect(x, 205, 3, 1, C.green1);
  for (let r = 0; r < 6; r++) { const y = 208 + r * 8; p.hline(0, y, 256, C.indigo0); for (let x = (r & 1) * 8; x < 256; x += 16) p.rect(x, y, 1, 8, C.indigo0); }
  return compile(p, { bd: FOREST_BD, name: 'forest' });
}

// ============ the beacon tower: 256 x 480, scrolled vertically (lamp room at the top, rock cliff at the foot) ============
export const TOWER_BD = y => y < 32 ? C.black : C.indigo0;
export const TW = { cx: 186, lampY: 96, galleryY: 112, groundY: 416, ladderX: 176 };
const tw = y => 22 + Math.round((y - 120) * 0.05);
function paintTower(lit) {
  const p = new Paper(256, 480), cx = TW.cx;
  for (let i = 0; i < 70; i++) { const x = (hash(i) * 256) | 0, y = 4 + ((hash(i + 99) * 400) | 0); if ((x > 138 && y > 88) || (x > 196 && y < 82)) continue; p.px(x, y, i % 5 ? C.grey3 : C.yellow2); }
  p.disc(226, 56, 12, C.yellow3); p.disc(232, 52, 11, 0xff);                        // crescent moon: the bite is backdrop
  for (let y = 120; y < TW.groundY; y++) { const w = tw(y); for (let x = cx - w; x <= cx + w; x++) p.px(x, y, x > cx + w - 5 ? C.grey0 : C.grey1); }
  for (let y = 120; y < TW.groundY; y += 8) { const w = tw(y); p.hline(cx - w, y, 2 * w + 1, C.grey0); for (let x = cx - w + ((y / 8) & 1) * 6; x <= cx + w; x += 12) p.rect(x, y, 1, 8, C.grey0); }
  for (let y = 124; y < TW.groundY - 30; y += 6) p.hline(TW.ladderX, y, 9, C.grey2);                            // the ladder: two rails and rungs
  p.rect(TW.ladderX, 120, 1, TW.groundY - 150, C.grey2); p.rect(TW.ladderX + 8, 120, 1, TW.groundY - 150, C.grey2);
  for (const y of [200, 264, 328]) p.rect(cx + 8, y, 3, 8, C.grey0);               // window slits
  p.rect(cx - 9, 384, 18, 32, C.grey0); p.rect(cx - 7, 386, 14, 30, C.grey1); for (let x = cx - 7; x < cx + 7; x += 4) p.rect(x, 386, 1, 30, C.grey0);
  p.rect(150, 112, 72, 5, C.grey1); p.rect(150, 117, 72, 3, C.grey0); for (let x = 152; x < 220; x += 8) p.rect(x, 112, 1, 5, C.grey0);   // gallery
  p.rect(170, 96, 32, 16, C.yellow2); p.rect(176, 99, 20, 10, C.yellow3);                                              // lamp room
  for (const x of [170, 178, 194, 200]) p.rect(x, 96, 2, 16, C.red1);
  p.rect(166, 94, 40, 3, C.red1);
  for (let y = 83; y < 94; y++) { const t = (94 - y) / 11, w = Math.round(19 * Math.sqrt(Math.max(0, 1 - t * t))); p.hline(cx - w, y, 2 * w + 1, C.red1); }
  p.rect(185, 78, 2, 5, C.red1);
  if (lit) dither(p, 0, 40, 176, 76, C.yellow2, (x, y) => { const u = (176 - x) / 176, c = 104 - u * 34, w = 4 + u * 16; return Math.abs(y - c) < w && y < 112; });
  const ctop = x => x < 150 ? TW.groundY + Math.round(4 * tri(x / 48)) : TW.groundY;
  p.skyline(0, 256, 480, ctop, C.orange0);
  for (let x = 0; x < 256; x++) { p.px(x, ctop(x), C.orange2); p.px(x, ctop(x) + 1, C.orange1); }
  for (let row = 0; row < 5; row++) { const y = 432 + row * 9; let x = -((row * 13) % 24);
    for (let i = 0; x < 256; i++) { const w = 22 + Math.round(hash(row * 17 + i) * 20); p.hline(x, y, w - 1, C.orange2); p.rect(x + w - 1, y, 1, 9, C.orange1); p.hline(x, y + 8, w, C.orange1); x += w; } }
  return compile(p, { bd: TOWER_BD, name: lit ? 'tower-lit' : 'tower' });
}

// ============ title (512 wide: the cloud band drifts), the high score is part of the picture ============
export const TITLE_BD = y => y < 40 ? C.blue0 : y < 96 ? C.indigo0 : y < 136 ? C.indigo1 : y < 176 ? C.violet1 : y < 232 ? C.magenta1 : C.black;
const titleCache = new Map();
export function title(hi) {
  if (titleCache.has(hi)) return titleCache.get(hi);
  const p = new Paper(512, 240);
  for (let i = 0; i < 40; i++) { const x = (hash(i) * 512) | 0, y = 4 + ((hash(i + 9) * 36) | 0); p.px(x, y, i % 3 ? C.grey3 : C.yellow2); }
  putText(p, 'HI ' + String(hi).padStart(6, '0'), 2, 1, C.grey3, C.blue1); putText(p, '1P 000000', 21, 1, C.grey3, C.blue1);
  [...'DUSKLIGHT'].forEach((ch, i) => putBig(p, ch, 56 + i * 16, 48, C.yellow2, C.orange2, C.black));
  putText(p, 'A LAMPLIGHTER TALE', 7, 9, C.violet3, C.black);
  p.tiled(256, x0 => { for (const [cx, cy, rx, ry] of [[50, 118, 30, 5], [150, 108, 22, 4], [210, 124, 28, 5]]) { blob(p, x0 + cx, cy + 2, rx, ry, C.blue1); blob(p, x0 + cx - 2, cy - 1, rx - 2, ry - 1, C.violet3); } });
  putText(p, 'START', 13, 17, C.grey3, C.black); putText(p, 'CONTINUE', 13, 19, C.grey3, C.black); putText(p, 'OPTIONS', 13, 21, C.grey3, C.black);
  p.tiled(256, x0 => { for (let b = 0; b < 8; b++) { const bx = x0 + b * 32 + 2, bh = 16 + ((hash(b + 3) * 22) | 0), top = 238 - bh;
    p.rect(bx, top, 26, 232 - top, C.black);
    p.rect(bx - 2, top - 3, 30, 3, C.black); p.rect(bx + 3, top - 7, 20, 4, C.black); p.rect(bx + 8, top - 10, 10, 3, C.black);
    for (let wy = top + 4; wy < 232; wy += 8) for (let wx = bx + 4; wx < bx + 22; wx += 8) if (hash(wx * 3 + wy) > 0.35) p.rect(wx, wy, 4, 4, C.yellow2); } });
  const r = compile(p, { bd: TITLE_BD, name: 'title' }); titleCache.set(hi, r); return r;
}

// ============ overlays ============
const hudCache = new Map();
const lampIcon = (p, x, y, on) => { p.rect(x + 1, y, 5, 1, C.grey3); p.rect(x, y + 1, 1, 5, C.grey3); p.rect(x + 6, y + 1, 1, 5, C.grey3); p.rect(x + 1, y + 6, 5, 1, C.grey3); if (on) p.rect(x + 1, y + 1, 5, 5, C.yellow2); p.px(x + 3, y - 1 < 0 ? 0 : y - 1, C.grey3); };
export function hud(score, hi, lamps, newHi, stage) {
  const key = [score, hi, lamps, newHi, stage].join('|'); if (hudCache.has(key)) return hudCache.get(key);
  const p = new Paper(256, 32);
  p.rect(0, 0, 256, 32, C.black);
  putText(p, '1P', 1, 1, C.yellow2, C.red0); putText(p, String(score).padStart(6, '0'), 4, 1, C.grey3, C.red0);
  putText(p, 'HI', 14, 1, newHi ? C.red1 : C.yellow2, C.red0); putText(p, String(hi).padStart(6, '0'), 17, 1, C.grey3, C.red0);
  putText(p, 'LAMPS', 1, 2, C.yellow2, C.red0); for (let i = 0; i < 3; i++) lampIcon(p, 52 + i * 10, 17, i < lamps);
  putText(p, 'STAGE ' + stage, 14, 2, C.yellow2, C.red0);
  p.rect(0, 28, 256, 2, C.red0); p.rect(0, 30, 256, 2, C.grey3);
  const r = compile(p, { bd: C.black, name: 'hud' }); hudCache.set(key, r); return r;
}
const stripCache = new Map();
export function strip(text) {
  if (stripCache.has(text)) return stripCache.get(text);
  const p = new Paper(256, 16);
  p.rect(0, 0, 256, 16, C.black); p.rect(0, 0, 256, 1, C.grey3); p.rect(0, 1, 256, 1, C.grey1);
  putText(p, text, (32 - text.length) >> 1, 1, C.grey3, C.grey0);
  const r = compile(p, { bd: C.black, name: 'strip' }); stripCache.set(text, r); return r;
}
export const scenes = { forest: paintForest(), tower: paintTower(false), towerLit: paintTower(true), title: title(12400) };
