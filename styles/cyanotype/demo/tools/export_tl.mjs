// timeline.js -> timeline.json (read by mix.py and the cue check)
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TL = await import(path.join(D, 'timeline.js'));
fs.writeFileSync(path.join(D, 'timeline.json'), JSON.stringify({ DUR: TL.DUR, BPM: TL.BPM, BEAT: TL.BEAT, BAR: TL.BAR, T: TL.T, VO: TL.VO, EV: TL.EV, HITS: TL.HITS, SECS: TL.SECS, END_BELL: TL.END_BELL }, null, 1));
