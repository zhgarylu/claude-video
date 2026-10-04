// export.mjs: timeline.js -> caps.json (captions for the .srt) and the beat grid, so Python never re-types a number.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import * as TL from '../timeline.js';
const here = path.dirname(fileURLToPath(import.meta.url));
fs.writeFileSync(path.join(here, '../caps.json'), JSON.stringify({ dur: TL.DUR, bpm: TL.BPM, beat: TL.BEAT, captions: TL.CAPTIONS.map(c => ({ t0: c.t0, t1: c.t1, text: c.text })), folds: TL.FOLD_T, landBeats: TL.LAND_BEATS, seven: TL.SEVEN, unfold: TL.UNFOLD, pleat: TL.PLEAT }, null, 1));
console.log('caps.json written');
