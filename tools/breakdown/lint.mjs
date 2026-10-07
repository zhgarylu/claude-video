// Layout lint for a breakdown project: samples the page every 0.25 s and reports text boxes that overlap each other, leave the frame,
// or run into the subtitle band. (readcheck.mjs checks reading time; this checks space.)
//   node tools/breakdown/lint.mjs <project> [--size 1080x1920] [--q 'aspect=9x16']
import { openDemo, closeServer, requireDemo, takeSize } from '../../core/render/page.mjs';
const args = process.argv.slice(2), { w: VW, h: VH } = takeSize(args), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const dir = args[0]; requireDemo(dir);
const { browser, page } = await openDemo(dir, { w: VW, h: VH, q: opt('--q', 'dry=1') });
const res = await page.evaluate(() => {
  const W = innerWidth, H = innerHeight, V = H > W, subTop = V ? 1360 : 860, out = {}, tol = 3;
  for (let t = 0; t < window.DUR; t += .25) {
    const bs = window.TEXTS(t); const keyOf = (a, b) => a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id;
    for (const b of bs) {
      if (b.x0 < 0 || b.y0 < 0 || b.x1 > W || b.y1 > H) (out['frame:' + b.id] ??= { t, what: `"${b.text}" leaves the frame` });
      if (b.y1 > subTop + tol && b.y0 < H) (out['sub:' + b.id] ??= { t, what: `"${b.text}" runs into the subtitle band (y ${Math.round(b.y1)} > ${subTop})` });
    }
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], b = bs[j]; if (a.x0 < b.x1 - tol && b.x0 < a.x1 - tol && a.y0 < b.y1 - tol && b.y0 < a.y1 - tol) (out['ov:' + keyOf(a, b)] ??= { t, what: `"${a.text}" overlaps "${b.text}"` });
    }
  }
  return Object.values(out).sort((a, b) => a.t - b.t);
});
await browser.close(); closeServer();
for (const r of res) console.log(`lint  t=${r.t.toFixed(2)}  ${r.what}`);
console.log(res.length ? `lint: ${res.length} problem(s)` : 'lint: no overlaps, nothing outside the frame or in the subtitle band');
process.exit(res.length ? 1 : 0);
