// export.mjs: voice timings + captions for the page and the mixer (caps.json), from timeline.js and the TTS durations.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), D = path.join(HERE, '..');
const TL = await import(path.join(D, 'timeline.js'));
const lines = JSON.parse(fs.readFileSync(path.join(D, 'voice/lines.json'))), dur = JSON.parse(fs.readFileSync(path.join(D, 'voice/dur.json')));
const voice = lines.map(l => ({ id: l.id, t: TL.VOICE[l.id], dur: dur[l.id], text: l.text }));
const captions = voice.map(v => ({ id: v.id, text: v.text.replace(/\s+/g, ' '), t0: +(v.t - .08).toFixed(3), t1: +Math.max(v.t + v.dur + .7, v.t - .08 + v.text.replace(/\s/g, '').length / 15 + 1.5 + .12).toFixed(3) }));
fs.writeFileSync(path.join(D, 'caps.json'), JSON.stringify({ dur: TL.DUR, bpm: TL.BPM, beat: TL.BEAT, voice, captions }, null, 1));
console.log('caps.json', captions.length, 'captions');
