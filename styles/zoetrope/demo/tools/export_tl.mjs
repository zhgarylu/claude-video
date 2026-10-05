// timeline.js -> timeline.json for mix.py.   usage: node styles/zoetrope/demo/tools/export_tl.mjs
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let src = fs.readFileSync(path.join(D, 'timeline.js'), 'utf8').replace("from '/core/lib.js'", "from '" + path.resolve(D, '../../../core/lib.js') + "'");
const tmp = path.join(D, 'out', '_tl.mjs'); fs.mkdirSync(path.join(D, 'out'), { recursive: true }); fs.writeFileSync(tmp, src);
const TL = await import(tmp); fs.unlinkSync(tmp);
fs.writeFileSync(path.join(D, 'timeline.json'), JSON.stringify({ BPM: TL.BPM, BEAT: TL.BEAT, BAR: TL.BAR, DUR: TL.DUR, T: TL.T, VO: TL.VO, EV: TL.EV, MUSIC: TL.MUSIC, SPIN: TL.spinSamples() }));
console.log('timeline.json', TL.DUR.toFixed(3), 's,', TL.EV.length, 'events');
