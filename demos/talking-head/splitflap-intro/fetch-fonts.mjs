// Noto Sans SC subset (OFL) from the characters used in main.js and the transcript; Barlow Medium is copied from styles/split-flap/demo/fonts
import fs from 'fs';
const src = fs.readFileSync('main.js', 'utf8') + fs.readFileSync('backdrop.js', 'utf8') + fs.readFileSync('src/words.json', 'utf8');
const set = new Set(); for (const ch of src) if (ch.codePointAt(0) >= 0x20 && ch !== '\n') set.add(ch);
for (let i = 0x20; i < 0x7f; i++) set.add(String.fromCharCode(i));
'·—–×…「」“”‘’，。：；！？、（）/→'.split('').forEach(c => set.add(c));
const chars = [...set].join('');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
fs.mkdirSync('fonts', { recursive: true });
const r = await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@500;700&display=block&text=${encodeURIComponent(chars)}`, { headers: { 'User-Agent': UA } });
if (!r.ok) { console.error(r.status); process.exit(1); }
let body = await r.text();
for (const u of [...new Set([...body.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]))]) {
  const fn = `NotoSansSC-${(u.split('/').pop() || '').slice(0, 24).replace(/[^\w.-]/g, '')}.woff2`;
  fs.writeFileSync('fonts/' + fn, Buffer.from(await (await fetch(u)).arrayBuffer())); body = body.split(u).join(fn); console.log(fn);
}
body += `\n@font-face { font-family: "Barlow"; font-weight: 500; src: url(Barlow-Medium.ttf); }\n`;
fs.writeFileSync('fonts/fonts.css', body);
