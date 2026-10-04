// Constraint audit for the whole film: node styles/pixel-8bit/demo/check.mjs
// Every scene is compiled by ppu.js (which throws on out-of-limit art); every 2nd game frame (the ones the 30 fps video shows) is
// rendered through the scanline unit and audited: palettes, tiles, sprites per line, scroll and backdrop splits, overlay banks.
import { scenes } from './scenes.js';
import { stateAt } from './game.js';
import * as TL from './timeline.js';
import { render, validate, LIMITS, Paper, compile } from './ppu.js';
import { COUNT, fadeId } from './palette.js';

let bad = 0;
console.log(`master palette: ${COUNT} colours | limits:`, JSON.stringify(LIMITS));
for (const [k, s] of Object.entries(scenes)) console.log(`scene ${k.padEnd(9)} tiles ${String(s.tiles).padStart(3)}/256  nametable ${s.ntW * 8}x${s.ntH * 8}  sub-palettes ` + s.pals.map(p => '[' + p.map(c => c.toString(16).padStart(2, '0')).join(' ') + ']').join(' '));
const phase = f => f < TL.T_FOREST ? 'title' : f < TL.T_NIGHT ? 'dusk' : f < TL.T_TOWER ? 'night' : f < TL.T_SWARM ? 'tower' : f < TL.T_LIGHT ? 'swarm' : f < TL.T_RETURN ? 'light' : 'return';
const agg = {}, drop = [];
let maxStep = 0, prevS = null, closeups = 0;
for (let f = 0; f < TL.DUR_F; f += 2) {
  const st = stateAt(f), out = render(st), v = validate(st, out, 'f' + f);
  if (st.view) closeups++;
  if (!v.ok) { bad++; console.log('FAIL', v.label, v.errs.join('; ')); continue; }
  const ph = phase(f), a = agg[ph] ||= { frames: 0, maxLine: 0, dropFrames: 0, maxObj: 0, maxCols: 0, maxSplitS: 0, maxSplitB: 0, maxDrop: 0 };
  a.frames++; a.maxLine = Math.max(a.maxLine, v.rep.maxSpritesPerLine); a.maxObj = Math.max(a.maxObj, st.oam.length); a.maxCols = Math.max(a.maxCols, v.rep.coloursOnScreen);
  a.maxSplitS = Math.max(a.maxSplitS, v.rep.scrollSplits); a.maxSplitB = Math.max(a.maxSplitB, v.rep.backdropSplits);
  if (v.rep.linesWithDropout) { a.dropFrames++; a.maxDrop = Math.max(a.maxDrop, v.rep.linesWithDropout); drop.push(f); }
  if (prevS && !(f >= TL.T_LIGHT - 2 && f < TL.T_LIGHT + 2)) { const d = Math.max(...st.scrollX.map((x, i) => Math.abs(x - prevS[i]))); if (d <= 8) maxStep = Math.max(maxStep, d); }
  prevS = st.scrollX.slice();
}
for (const [ph, a] of Object.entries(agg)) console.log(`ok  ${ph.padEnd(7)} ${String(a.frames).padStart(4)} frames audited | max colours on screen ${a.maxCols} | max objects ${a.maxObj} | max/line ${a.maxLine} | frames with dropout ${String(a.dropFrames).padStart(3)} (max ${a.maxDrop} lines) | scroll splits <= ${a.maxSplitS} | backdrop splits <= ${a.maxSplitB}`);
const runs = []; for (const f of drop) { const r = runs[runs.length - 1]; if (r && f - r[1] <= 12) r[1] = f; else runs.push([f, f]); }
console.log('dropout (natural flicker) occurs in:', runs.map(r => `${(r[0] / 60).toFixed(1)}-${(r[1] / 60).toFixed(1)} s`).join(', ') || 'none');
console.log(`close-up (x6 window) frames audited: ${closeups}; max horizontal scroll step between video frames: ${maxStep} px`);
{ // stepped animation: Wick's tiles change only on whole 8-frame steps while he runs
  let prev = null, off = 0;
  for (let f = 470; f < 800; f++) { const t = stateAt(f).oam.slice(0, 6).map(o => o.tile).join(','); if (prev !== null && t !== prev && f % 8) off++; prev = t; }
  console.log(`${off ? 'FAIL' : 'ok '} stepped animation: Wick's tile changes off the 8-frame grid = ${off}`); if (off) bad++;
}
{ // fades are palette steps: every step is still master ids
  const lines = [];
  for (let n = 0; n <= 5; n++) { const st = stateAt(600); st.bgPal = st.bgPal.map(p => p.map(c => fadeId(c, n))); st.sprPal = st.sprPal.map(p => p.map(c => fadeId(c, n))); st.backdrop = st.backdrop.map(c => fadeId(c, n)); (st.overlays || []).forEach(o => { o.bgPal = o.bgPal.map(p => p.map(c => fadeId(c, n))); o.bd = fadeId(o.bd, n); });
    const out = render(st), v = validate(st, out, 'fade' + n); if (!v.ok) { bad++; console.log('FAIL fade', n, v.errs.join('; ')); } lines.push(`step ${n}: ${v.rep.coloursOnScreen} colours`); }
  console.log('ok  palette fade steps (f600):', lines.join(' | '));
}
{ // 8x16 sprite mode
  const st = stateAt(600); st.size = 16; st.oam = [{ x: 8, y: 100, tile: 0, pal: 0, flipH: false, flipV: false, behind: false }];
  const out = render(st), top = st.sheet.tiles[0], bot = st.sheet.tiles[1]; let ok = true;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const a = top[r * 8 + c], b = bot[r * 8 + c]; if (a && out.fb[(100 + r) * 256 + 8 + c] !== st.sprPal[0][a - 1]) ok = false; if (b && out.fb[(108 + r) * 256 + 8 + c] !== st.sprPal[0][b - 1]) ok = false; }
  console.log(`${ok ? 'ok ' : 'FAIL'} 8x16 sprite mode (top half tile 0, bottom half tile 1)`); if (!ok) bad++;
}
const rej = (label, fn) => { try { fn(); console.log('NOT REJECTED:', label); bad++; } catch (e) { console.log('rejected as expected:', label, '->', e.message.slice(0, 80)); } };
rej('4 colours in one 16x16 block', () => { const p = new Paper(32, 16); [0x16, 0x26, 0x17, 0x27].forEach((c, i) => p.rect(i * 4, 0, 4, 16, c)); compile(p, { bd: 0x0d }); });
rej('colour outside the master palette', () => { new Paper(16, 16).px(0, 0, 0x3f); });
rej('5 sub-palettes needed', () => { const p = new Paper(80, 16); [[0x01, 0x11, 0x21], [0x02, 0x12, 0x22], [0x03, 0x13, 0x23], [0x04, 0x14, 0x24], [0x05, 0x15, 0x25]].forEach((s, i) => s.forEach((c, j) => p.rect(i * 16 + j * 5, 0, 5, 16, c))); compile(p, { bd: 0x0d }); });
rej('> 256 unique tiles', () => { const p = new Paper(512, 128); for (let i = 0; i < 64 * 16; i++) { const tx = i % 64, ty = (i / 64) | 0; for (let b = 0; b < 12; b++) if ((i >> b) & 1) p.px(tx * 8 + (b % 8), ty * 8 + ((b / 8) | 0) + (i % 3), 0x16); } compile(p, { bd: 0x0d }); });
console.log(bad ? `\n${bad} violation(s)` : '\nALL CONSTRAINTS HOLD');
process.exit(bad ? 1 : 0);
