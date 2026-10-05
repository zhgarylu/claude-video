// Captions as galley slips: one cue per sentence, timed from the Whisper word stamps (voice/words.json).
// Each cue holds max(1.8 s, end of speech + 0.6 s) and never overlaps the next. -> caps.json (page) and out/srt.json (core/render/srt.py)
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TL = await import(path.join(D, 'timeline.js'));
const lines = JSON.parse(fs.readFileSync(path.join(D, 'lines.json'), 'utf8')), words = JSON.parse(fs.readFileSync(path.join(D, 'voice/words.json'), 'utf8')), dur = JSON.parse(fs.readFileSync(path.join(D, 'voice/dur.json'), 'utf8'));
const cues = [];
for (const v of TL.VO) {
  const text = lines.find(l => l.id === v.id).text, sents = text.match(/[^.!?]+[.!?]+/g).map(s => s.trim()), W = words[v.id];
  const nm = text.split(/\s+/).length; let used = 0;
  sents.forEach((s, k) => {
    const n = s.split(/\s+/).length, i0 = Math.min(W.length - 1, Math.round(used * W.length / nm)), i1 = Math.min(W.length - 1, Math.max(i0, Math.round((used + n) * W.length / nm) - 1));
    used += n;
    const a = Math.max(0, W[i0][1]), b = k === sents.length - 1 ? dur[v.id] : W[i1][2];
    cues.push({ id: v.id, t0: +(v.t + a).toFixed(3), sp1: +(v.t + b).toFixed(3), text: s });
  });
}
cues.sort((a, b) => a.t0 - b.t0);
// merge a sentence into the next one when it could not be held for 1.8 s on its own
for (let i = 0; i < cues.length - 1;) { if (cues[i + 1].id === cues[i].id && cues[i + 1].t0 - cues[i].t0 < 1.85 && cues[i + 1].t0 - cues[i].sp1 < 1.0) { cues[i].text += ' ' + cues[i + 1].text; cues[i].sp1 = cues[i + 1].sp1; cues.splice(i + 1, 1); } else i++; }
cues.forEach((c, i) => { let t1 = Math.max(c.t0 + 1.8, c.sp1 + 0.6); if (cues[i + 1]) t1 = Math.min(t1, cues[i + 1].t0 - 0.05); c.t1 = +t1.toFixed(3); });
for (const c of cues) if (c.t1 - c.t0 < 1.0) console.log('WARN short cue', c);
fs.writeFileSync(path.join(D, 'caps.json'), JSON.stringify(cues.map(({ t0, t1, text }) => ({ t0, t1, text })), null, 1));
fs.mkdirSync(path.join(D, 'out'), { recursive: true });
fs.writeFileSync(path.join(D, 'out/srt.json'), JSON.stringify(cues.map(({ t0, t1, text }) => ({ t0, t1, text })), null, 1));
for (const c of cues) console.log(c.t0.toFixed(2), c.t1.toFixed(2), c.text);
