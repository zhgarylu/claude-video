// Proof that picture and sound share one event list. Page state, bars 1-8: render a baseline frame before any note has
// sounded, then for many times compare every notehead's pixels with the baseline. A head must have changed (printed in
// its voice colour, washed, ringed) exactly when the event list says its note has begun to sound; a head whose note
// has not begun must be pixel-identical to the baseline (heads next to the playhead are skipped: its glow tints them).
//   node styles/sheet-music/demo/tools/proof.mjs        (from the library root)
import { openDemo, closeServer } from '../../../../core/render/page.mjs';
const D = 'styles/sheet-music/demo';
const { browser, page } = await openDemo(D, { w: 1920, h: 1080 });
const TIMES = []; for (let t = 3.2; t < 21.2; t += 0.37) TIMES.push(+t.toFixed(2));
let bad = 0, checked = 0, minLit = 1e9, maxUnlit = 0; const rows = [];
await page.evaluate(() => { window.render(2.52); window.__base = document.getElementById('c').getContext('2d').getImageData(0, 0, 1920, 1080).data; });
for (const t of TIMES) {
  const r = await page.evaluate(t => {
    window.render(t);
    const cur = document.getElementById('c').getContext('2d').getImageData(0, 0, 1920, 1080).data, base = window.__base, out = [];
    for (const ev of window.EV) {
      const P = window.__NP[ev.id]; if (!P || ev.t > 21.4) continue;
      let d = 0, n = 0;
      for (let y = Math.round(P.y) - 8; y <= Math.round(P.y) + 8; y++) for (let x = Math.round(P.x) - 8; x <= Math.round(P.x) + 8; x++) {
        const i = (y * 1920 + x) * 4; d += Math.abs(cur[i] - base[i]) + Math.abs(cur[i + 1] - base[i + 1]) + Math.abs(cur[i + 2] - base[i + 2]); n++;
      }
      out.push({ id: ev.id, t0: ev.t, dur: ev.dur, x: P.x, y: P.y, diff: d / n });
    }
    return { out, ph: window.__PH(t) };
  }, t);
  const sounding = [];
  for (const n of r.out) {
    if (Math.abs(t - n.t0) < .06) continue;                         // skip the 60 ms around an onset
    if (n.x > r.ph.x - 140 && n.x < r.ph.x + 50 && n.y > r.ph.y0 && n.y < r.ph.y1) continue;   // under the playhead glow
    const should = t - n.t0 > 0.02, changed = n.diff > 2.5;
    checked++; if (should) minLit = Math.min(minLit, n.diff); else maxUnlit = Math.max(maxUnlit, n.diff);
    if (should !== changed) { bad++; console.log('MISMATCH', t, n.id, 'onset', n.t0, 'diff', n.diff.toFixed(2)); }
    if (t >= n.t0 && t < n.t0 + n.dur) sounding.push(n.id);
  }
  rows.push(`t=${t.toFixed(2)}  sounding: ${sounding.join(' ') || '-'}`);
}
console.log(rows.join('\n'));
console.log(`checked ${checked} head/time pairs, mismatches ${bad}; smallest change of a sounded head ${minLit.toFixed(1)}, largest change of a silent head ${maxUnlit.toFixed(1)}`);
await browser.close(); closeServer();
process.exit(bad ? 1 : 0);
