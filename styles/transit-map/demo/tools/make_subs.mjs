// timeline VO + voices/dur.json → out/srt.json (for core/render/srt.py). The captions burned into the picture use the same rule in the page.
// usage: node styles/transit-map/demo/tools/make_subs.mjs <workdir>
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = path.resolve(process.argv[2] || D);
const TL = await import(path.join(D, 'timeline.js'));
const dur = JSON.parse(fs.readFileSync(path.join(W, 'voices', 'dur.json'), 'utf8'));
const subs = TL.subtitles(dur);
subs.forEach(s => { if (s.t1 - s.t0 < Math.max(1.8, s.speech + 0.6) - 1e-6) throw new Error('caption too short: ' + s.id); });
fs.mkdirSync(path.join(W, 'out'), { recursive: true });
fs.writeFileSync(path.join(W, 'out', 'srt.json'), JSON.stringify(subs.map(s => ({ t0: s.t0, t1: s.t1, text: s.text })), null, 1));
console.log(subs.map(s => `${s.id} ${s.t0}-${s.t1} (speech ${s.speech.toFixed(2)}, hold ${(s.t1 - s.t0).toFixed(2)})`).join('\n'));
