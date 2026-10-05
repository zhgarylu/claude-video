// Record a film's TEXTS and EV for a static preview (no server needed): node tools/preview/export.mjs <demo dir> [--step 0.1] [--out preview-data.json]
// Writes {name, dur, size, ev:[…], texts:[[t, [{id,text,x0,y0,x1,y1}…]]…]} where texts are stored only when they change. gallery/preview-demo.html reads it
// together with the film's mp4. Uses the same headless page as the render tools.
import fs from 'fs'; import path from 'path';
import { openDemo, closeServer, requireDemo } from '../../core/render/page.mjs';
const a = process.argv.slice(2), take = k => { const i = a.indexOf(k); return i >= 0 ? a.splice(i, 2)[1] : null; };
const step = +(take('--step') || 0.1), outp = take('--out') || 'preview-data.json', dir = a[0];
if (!dir) { console.error('usage: node tools/preview/export.mjs <demo dir> [--step 0.1] [--out file.json]'); process.exit(2); }
requireDemo(dir);
const { browser, page } = await openDemo(dir, { w: 1920, h: 1080 });
const info = await page.evaluate(() => ({ dur: window.DUR, ev: window.EV || [], hasTexts: typeof window.TEXTS === 'function' }));
const texts = []; let prev = '';
for (let t = 0; t <= info.dur + 1e-6; t += step) {
  const tx = info.hasTexts ? await page.evaluate(x => { window.render(x); return (window.TEXTS(x) || []).map(o => ({ id: o.id, text: String(o.text), x0: Math.round(o.x0), y0: Math.round(o.y0), x1: Math.round(o.x1), y1: Math.round(o.y1) })); }, t) : [];
  const key = JSON.stringify(tx); if (key !== prev) { texts.push([+t.toFixed(2), tx]); prev = key; }
}
await browser.close(); closeServer();
fs.writeFileSync(outp, JSON.stringify({ name: path.basename(path.resolve(dir)), dur: info.dur, size: [1920, 1080], ev: info.ev.filter(e => e.type !== 'key').map(e => ({ ...e, t: +e.t.toFixed(2) })), texts }));
console.log(outp, texts.length, 'text states,', info.ev.length, 'events,', (fs.statSync(outp).size / 1024).toFixed(0), 'KB');
