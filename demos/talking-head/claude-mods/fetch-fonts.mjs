// 字体子集：从源码里收集用到的字符，向 Google Fonts 要对应子集（Inter / JetBrains Mono / Noto Sans SC，均为 OFL）
import fs from 'fs';
const src = ['main.js', 'timeline.js'].map(f => fs.readFileSync(f, 'utf8')).join('\n');
const set = new Set(); for (const ch of src) if (ch.codePointAt(0) >= 0x20 && ch !== '\n') set.add(ch);
for (let i = 0x20; i < 0x7f; i++) set.add(String.fromCharCode(i));
'✓●›▍–—·×…「」“”‘’，。：；！？、（）/'.split('').forEach(c => set.add(c));
const chars = [...set].join('');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const fams = [
  ['Inter', 'Inter:wght@400;500;600;700'],
  ['JetBrains Mono', 'JetBrains+Mono:wght@400;500'],
  ['Noto Sans SC', 'Noto+Sans+SC:wght@500;700'],
];
fs.mkdirSync('fonts', { recursive: true });
let css = '';
for (const [name, q] of fams) {
  const url = `https://fonts.googleapis.com/css2?family=${q}&display=block&text=${encodeURIComponent(chars)}`;
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) { console.error(name, r.status); process.exit(1); }
  let body = await r.text();
  const urls = [...new Set([...body.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]))];
  for (const u of urls) {
    const fn = `${name.replace(/ /g, '')}-${(u.split('/').pop() || '').slice(0, 24).replace(/[^\w.-]/g, '')}.woff2`;
    const buf = Buffer.from(await (await fetch(u)).arrayBuffer());
    fs.writeFileSync('fonts/' + fn, buf);
    body = body.split(u).join(fn);
    console.log(name, fn, buf.length);
  }
  css += body + '\n';
}
fs.writeFileSync('fonts/fonts.css', css);
console.log('chars', chars.length);
