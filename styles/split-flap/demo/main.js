// "The Long Way Round": a night station board, one hinge, one sentence. t = film seconds (timeline.js).
import { build, camera, shutter, GROUPS, X0, Y0, CW, CH, PX, PY, COLS, ROWS, CCOLS, CX0, CY0, CAPW, CAPH, CPX, CPY } from './film.js';
import { drawWall, drawHousing, drawStripHousing, drawCells, drawSection, label } from './draw.js';
import { ALPHA } from './flap.js';
import { T, DUR } from './timeline.js';

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const F = build();
window.DUR = DUR;
window.EV = F.EV;
if (F.log.length) console.warn('cell conflicts', F.log.length);

const BOARD = F.main.flat(), STRIP = F.cap.flat();
const ss = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
// camera shake follows how many flaps are landing around t
const times = F.EV.filter(e => e.type === 'flap' || e.type === 'cap').map(e => e.t).sort((a, b) => a - b);
function dens(t, w = 0.06) {
  const lo = (x) => { let a = 0, b = times.length; while (a < b) { const m = (a + b) >> 1; if (times[m] < x) a = m + 1; else b = m; } return a; };
  return (lo(t + w) - lo(t - w)) / (2 * w);
}
const hs = (a) => { const s = Math.sin(a * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };

function worldPass(cam, shx, shy, t) {
  ctx.save(); ctx.translate(960 + shx, 540 + shy); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy);
  drawWall(ctx, t); drawHousing(ctx);
  // cells are positioned in world space; drawCells culls with a camera that includes the shake
  ctx.restore();
  ctx.save(); ctx.translate(shx, shy); ctx.translate(960, 540); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy);
  for (const c of BOARD) c.st = c.at(t);
  drawCells(ctx, BOARD, { cx: cam.cx - shx / cam.z, cy: cam.cy - shy / cam.z, z: cam.z }, 1920, 1080);
  ctx.restore();
}

function sectionPass(t) {
  const prog = (t - T.open0) / (T.close1 - T.open0), sc = 1 + 0.05 * Math.min(1, Math.max(0, prog));
  ctx.save(); ctx.translate(960, 540); ctx.scale(sc, sc); ctx.translate(-960, -540);
  drawSection(ctx, t, F); ctx.restore();
}

window.render = t => {
  const cam = camera(t), sh = shutter(t);
  const d = dens(t), amp = Math.min(1.8, d / 90) * (sh >= 1080 ? 0.4 : 1);
  const k = Math.floor(t * 24);
  const shx = (hs(k * 1.7) - .5) * 2 * amp, shy = (hs(k * 2.9 + 5) - .5) * 2 * amp;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080);
  if (sh <= 0) worldPass(cam, shx, shy, t);
  else if (sh >= 1080) sectionPass(t);
  else {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1920, 540); ctx.clip(); ctx.translate(0, -sh / 2); worldPass(cam, 0, 0, t); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0, 540, 1920, 540); ctx.clip(); ctx.translate(0, sh / 2); worldPass(cam, 0, 0, t); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0, 540 - sh / 2, 1920, sh); ctx.clip(); sectionPass(t);
    let g = ctx.createLinearGradient(0, 540 - sh / 2, 0, 540 - sh / 2 + 60); g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 540 - sh / 2, 1920, 60);
    g = ctx.createLinearGradient(0, 540 + sh / 2 - 60, 0, 540 + sh / 2); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.75)'); ctx.fillStyle = g; ctx.fillRect(0, 540 + sh / 2 - 60, 1920, 60);
    ctx.restore();
  }
  // the announcement strip stays where it is, whatever the camera does
  ctx.save(); ctx.translate(shx * .5, shy * .5); drawStripHousing(ctx);
  for (const c of STRIP) c.st = c.at(t);
  drawCells(ctx, STRIP, { cx: 960, cy: 540, z: 1 }, 1920, 1080); ctx.restore();
  // light: vignette, a slow sheen across the glass, and the lamps coming on
  let g = ctx.createRadialGradient(960, 500, 380, 960, 540, 1200); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const sx = ((t * 52) % 3200) - 700; g = ctx.createLinearGradient(sx, 0, sx + 520, 260);
  g.addColorStop(0, 'rgba(255,238,205,0)'); g.addColorStop(.5, 'rgba(255,238,205,.028)'); g.addColorStop(1, 'rgba(255,238,205,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080); ctx.restore();
  const lamp = 0.22 + 0.78 * ss((t - 0.12) / 0.45);
  if (lamp < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - lamp})`; ctx.fillRect(0, 0, 1920, 1080); }
};

// ---------------------------------------------------------------- text for readcheck: only what is settled and fully in frame
window.TEXTS = t => {
  const out = [], sh = shutter(t), cam = camera(t);
  const scr = (x, y) => [(x - cam.cx) * cam.z + 960, (y - cam.cy) * cam.z + 540];
  if (sh <= 0) for (const g of GROUPS) {
    if (g.id[0] === 'q' ? t < T.clear : (g.id !== 'lab' && t >= T.clear)) continue;
    const cells = F.main[g.row].slice(g.c0, g.c1 + 1), chars = cells.map(c => c.settled(t));
    if (chars.some(x => x === null)) continue;
    const text = chars.join('').trim(); if (!text) continue;
    if (g.id === 'q2' && text !== 'GOING BACK MEANS') continue; if (g.id === 'q3' && text !== 'GOING ROUND.') continue;
    const [x0, y0] = scr(X0 + g.c0 * PX, Y0 + g.row * PY), [x1, y1] = scr(X0 + g.c1 * PX + CW, Y0 + g.row * PY + CH);
    if (x0 < 0 || y0 < 0 || x1 > 1920 || y1 > 880) continue;   // below y=880 the announcement strip covers the board
    out.push({ id: g.id, text, x0, y0, x1, y1 });
  }
  if (sh >= 1080) {
    const l = (id, text, x0, y0, x1, y1) => out.push({ id, text, x0, y0, x1, y1 });
    l('s1', 'THE WHEEL, IN ORDER', 104, 84, 420, 106); l('s2', 'SECTION OF ONE CELL', 1500, 84, 1816, 106);
    l('s3', 'SIDE', 288, 822, 340, 846); l('s4', 'FRONT', 1086, 822, 1160, 846); l('s5', 'FLAPS FALLEN', 1560, 324, 1760, 346);
    l('s6', 'RATCHET AND PAWL', 620, 664, 860, 682);
  }
  for (let r = 0; r < 2; r++) {
    const cells = F.cap[r], chars = cells.map(c => c.settled(t));
    if (chars.some(x => x === null)) continue;
    const text = chars.join('').trim(); if (!text) continue;
    out.push({ id: 'cap' + r, text, x0: CX0, y0: CY0 + r * CPY, x1: CX0 + (CCOLS - 1) * CPX + CAPW, y1: CY0 + r * CPY + CAPH });
  }
  return out;
};

(async () => {
  try { await document.fonts.load('500 40px Barlow'); await document.fonts.ready; } catch (e) { }
  window.READY = true;
})();
