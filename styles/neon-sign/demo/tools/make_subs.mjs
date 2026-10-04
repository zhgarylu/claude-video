// timeline VO + voices/dur.json → subs.json (page) and srt.json (core/render/srt.py).
// Each caption starts with the speech and holds max(1.8 s, speech + 0.6 s, chars / 15 + 1.5 s) (the last is readcheck's rule).
// usage: node styles/neon-sign/demo/tools/make_subs.mjs <workdir>
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = path.resolve(process.argv[2] || D);
const TL = await import(path.join(D, 'timeline.js'));
const dur = JSON.parse(fs.readFileSync(path.join(W, 'voices', 'dur.json'), 'utf8'));
const get = id => { const v = dur[id]; return typeof v === 'number' ? v : (v?.dur ?? v?.duration ?? v?.[0]); };
const subs = TL.VO.map(v => { const d = get(v.id); if (!(d > 0)) throw new Error('no duration for ' + v.id); return { id: v.id, t0: v.t, t1: +(v.t + Math.max(1.8, d + 0.6, v.text.length / 15 + 1.5 + 0.1)).toFixed(3), text: v.text, speech: d }; });
for (let i = 0; i < subs.length - 1; i++) if (subs[i].t1 > subs[i + 1].t0 - 0.05) subs[i].t1 = +(subs[i + 1].t0 - 0.05).toFixed(3);
fs.writeFileSync(path.join(W, 'subs.json'), JSON.stringify(subs, null, 1));
fs.mkdirSync(path.join(W, 'out'), { recursive: true });
fs.writeFileSync(path.join(W, 'out', 'srt.json'), JSON.stringify(subs.map(s => ({ t0: s.t0, t1: s.t1, text: s.text })), null, 1));
console.log(subs.map(s => `${s.id} ${s.t0}-${s.t1} (speech ${s.speech.toFixed ? s.speech.toFixed(2) : s.speech})`).join('\n'));
