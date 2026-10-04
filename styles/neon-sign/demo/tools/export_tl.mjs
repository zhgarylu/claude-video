// timeline.js → timeline.json (for mix.py / cuecheck.py) and lines.json (Kokoro input).
// usage: node styles/neon-sign/demo/tools/export_tl.mjs <workdir>
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = path.resolve(process.argv[2] || D);
const TL = await import(path.join(D, 'timeline.js'));
fs.writeFileSync(path.join(W, 'timeline.json'), JSON.stringify({ BPM: TL.BPM, BEAT: TL.BEAT, BAR: TL.BAR, DUR: TL.DUR, T: TL.T, EV: TL.EV, HUM: TL.HUM, MUSIC: TL.MUSIC, VO: TL.VO }, null, 1));
const VOICE = 'bm_george', SPEED = 0.9;
fs.writeFileSync(path.join(W, 'lines.json'), JSON.stringify(TL.VO.map(v => ({ id: v.id, text: v.text, voice: VOICE, speed: SPEED })), null, 1));
console.log('timeline.json + lines.json →', W, TL.VO.length, 'lines');
