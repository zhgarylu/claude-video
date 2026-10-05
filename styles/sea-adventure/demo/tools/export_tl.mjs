// script.js + voices/dur.json -> timeline.json (for mix.py) and out/srt.json. Checks voice lengths against the next line.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = await import(path.join(D, 'script.js'));
const dur = JSON.parse(fs.readFileSync(path.join(D, 'voices', 'dur.json')));
let bad = 0;
const VO = S.VO.map((v, i) => { const d = dur[v.id]; if (Math.abs(d - S.DURS[v.id]) > .01) { console.log('DURS out of date for', v.id, d); bad++; } const nx = S.VO[i + 1]; if (nx && v.t + d > nx.t + .05) { console.log('overlap', v.id); bad++; } return { id: v.id, t: v.t, dur: d }; });
fs.mkdirSync(path.join(D, 'out'), { recursive: true });
fs.writeFileSync(path.join(D, 'timeline.json'), JSON.stringify({ DUR: S.DUR, BEAT: S.BEAT, BAR: S.BAR, T: S.T, VO }, null, 1));
fs.writeFileSync(path.join(D, 'out', 'srt.json'), JSON.stringify(S.cues(), null, 1));
console.log('timeline.json,', VO.length, 'voice lines;', bad ? bad + ' problems' : 'ok'); process.exit(bad ? 1 : 0);
