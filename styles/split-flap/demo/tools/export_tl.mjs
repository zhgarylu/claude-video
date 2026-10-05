// timeline.js -> timeline.json (for mix.py) + out/srt.json; checks the voice durations and the grid.
// usage: node styles/split-flap/demo/tools/export_tl.mjs
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TL = await import(path.join(D, 'timeline.js'));
const dur = JSON.parse(fs.readFileSync(path.join(D, 'voices', 'dur.json'), 'utf8'));
let bad = 0;
for (const v of TL.VO) { const d = dur[v.id]; if (Math.abs(d - v.dur) > 0.02) { console.error('voice length changed', v.id, d, 'vs timeline', v.dur); bad++; } }
for (const [k, t] of Object.entries(TL.T)) if (['fill', 'dive0', 'wide', 'chime', 'stamp', 'roll', 'resort', 'clock', 'count0', 'zero', 'clear', 'land'].includes(k) && Math.abs(t / 0.3 - Math.round(t / 0.3)) > 1e-6) { console.error('off the eighth-note grid:', k, t); bad++; }
if (bad) process.exit(1);
fs.writeFileSync(path.join(D, 'timeline.json'), JSON.stringify({ BPM: TL.BPM, BEAT: TL.BEAT, BAR: TL.BAR, DUR: TL.DUR, T: TL.T, VO: TL.VO, MUSIC: TL.MUSIC }, null, 1));
const cues = TL.VO.map((v, i, a) => { const t1 = Math.min(i + 1 < a.length ? a[i + 1].t - 0.05 : TL.DUR, v.t + Math.max(1.8, v.dur + 0.6, v.text.length / 15 + 1.5 + 0.1)); return { t0: v.t, t1: +t1.toFixed(3), text: v.text }; });
fs.mkdirSync(path.join(D, 'out'), { recursive: true });
fs.writeFileSync(path.join(D, 'out', 'srt.json'), JSON.stringify(cues, null, 1));
console.log('timeline.json, out/srt.json:', cues.length, 'cues');
