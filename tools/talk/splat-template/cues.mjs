// film.json + src/words.json → out/cues.json (for srt.py), the same cues the page shows
import fs from 'fs'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), lib = process.env.LIB || path.resolve(here, '../..');
const { cuesFromWords } = await import(pathToFileURL(path.join(lib, 'tools/talk/layouts.js')));
const F = JSON.parse(fs.readFileSync(path.join(here, 'film.json'), 'utf8')), words = JSON.parse(fs.readFileSync(path.join(here, 'src/words.json'), 'utf8'));
const cues = Array.isArray(F.captions?.cues) ? F.captions.cues : cuesFromWords(words, F.aspect === '9x16' ? { maxChars: 14, gap: .45, balance: true } : {});
const DUR = JSON.parse(fs.readFileSync(path.join(here, 'src/meta.json'), 'utf8')).duration + (F.tail || 0);       // captions never outlast the film
for (const c of cues) c.t1 = Math.min(c.t1, DUR);
fs.mkdirSync(path.join(here, 'out'), { recursive: true });
fs.writeFileSync(path.join(here, 'out/cues.json'), JSON.stringify(cues.map(c => ({ t0: c.t0, t1: c.t1, text: c.text })), null, 1));
console.log(cues.length, 'cues');
