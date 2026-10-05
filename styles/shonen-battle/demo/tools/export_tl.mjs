// timeline.js -> timeline.json (for mix.py) + out/srt.json; checks the voice lengths and that the key cuts sit on the beat grid.
// usage: node styles/shonen-battle/demo/tools/export_tl.mjs
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TL = await import(path.join(D, 'timeline.js'));
const dur = JSON.parse(fs.readFileSync(path.join(D, 'voices', 'dur.json'), 'utf8'));
let bad = 0;
for (const v of TL.VO) { const d = dur[v.id]; if (Math.abs(d - v.dur) > 0.02) { console.error('voice length changed', v.id, d, 'vs timeline', v.dur); bad++; } }
for (const s of TL.SHOTS) if (['wide', 'face', 'grip', 'stance', 'slump', 'flash', 'charge', 'pop'].includes(s.id) && Math.abs(s.t0 / TL.BEAT - Math.round(s.t0 / TL.BEAT)) > 1e-6) { console.error('cut off the beat grid:', s.id, s.t0); bad++; }
if (bad) process.exit(1);
fs.writeFileSync(path.join(D, 'timeline.json'), JSON.stringify({ BPM: TL.BPM, BEAT: TL.BEAT, BAR: TL.BAR, DUR: TL.DUR, SHOTS: TL.SHOTS, VO: TL.VO, EV: TL.EV }, null, 1));
const cues = TL.VO.map((v, i, a) => ({ t0: v.t, t1: +Math.min(i + 1 < a.length ? a[i + 1].t - 0.05 : TL.DUR, v.t + Math.max(1.8, v.dur + 0.6)).toFixed(3), text: v.text }));
fs.mkdirSync(path.join(D, 'out'), { recursive: true });
fs.writeFileSync(path.join(D, 'out', 'srt.json'), JSON.stringify(cues, null, 1));
console.log('timeline.json, out/srt.json:', cues.length, 'cues');
