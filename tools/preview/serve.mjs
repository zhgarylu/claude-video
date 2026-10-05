// Local preview of a film page: scrub the timeline, see the texts and events at each second, play with the mix.
//   node tools/preview/serve.mjs <demo dir> [--port 4173] [--size 1920x1080]
// Opens nothing by itself: it prints the address (http://127.0.0.1:<port>/__preview/). Same server rules as core/render/serve.mjs
// (127.0.0.1 only, files only inside the library or the film folder). Ctrl-C to stop.
import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { resolveRequest, pageURL } from '../../core/render/serve.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), HERE = path.dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2), take = k => { const i = a.indexOf(k); return i >= 0 ? a.splice(i, 2)[1] : null; };
const port = +(take('--port') || 4173), size = take('--size') || '1920x1080', dir = a[0];
if (!dir || !fs.existsSync(path.join(dir, 'index.html'))) { console.error('usage: node tools/preview/serve.mjs <demo dir with index.html> [--port 4173] [--size 1920x1080]'); process.exit(2); }
const abs = path.resolve(dir), page = pageURL(ROOT, port, dir).replace(/^http:\/\/127.0.0.1:\d+/, '');
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.bin': 'application/octet-stream', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.hdr': 'application/octet-stream', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8' };
const watched = () => { let m = 0; const walk = (d, depth) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (f.name === 'node_modules' || f.name === 'out' || f.name === 'stills' || f.name.startsWith('.')) continue; const p = path.join(d, f.name); if (f.isDirectory()) { if (depth < 2 && !['frames', 'matte', 'samples'].includes(f.name)) walk(p, depth + 1); } else if (/\.(js|mjs|html|json|css)$/.test(f.name)) m = Math.max(m, fs.statSync(p).mtimeMs); } }; try { walk(abs, 0); } catch {} return m; };
const audioFile = () => ['out/mix.wav', 'mix.wav', 'out/mix.mp3'].map(f => path.join(abs, f)).find(f => fs.existsSync(f)) || null;
const sendFile = (q, r, p, ct) => {
  fs.stat(p, (e, st) => { if (e) { r.writeHead(404); return r.end('not found'); }
    const m = /bytes=(\d*)-(\d*)/.exec(q.headers.range || ''); let s = 0, en = st.size - 1;
    if (m) { if (m[1]) s = +m[1]; if (m[2]) en = Math.min(en, +m[2]); if (!m[1] && m[2]) { s = st.size - +m[2]; en = st.size - 1; } }
    r.writeHead(m ? 206 : 200, { 'Content-Type': ct, 'Accept-Ranges': 'bytes', 'Content-Length': en - s + 1, ...(m ? { 'Content-Range': `bytes ${s}-${en}/${st.size}` } : {}), 'Cache-Control': 'no-store' });
    fs.createReadStream(p, { start: s, end: en }).pipe(r); });
};
http.createServer((q, r) => {
  const send = (c, b, ct = 'text/plain') => { r.writeHead(c, { 'Content-Type': ct, 'Cache-Control': 'no-store' }); r.end(b); };
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(q.headers.host || '')) return send(403, 'bad host');
  const u = q.url.split('?')[0];
  if (u === '/__preview/' || u === '/__preview') return send(200, fs.readFileSync(path.join(HERE, 'preview.html'), 'utf8').replace('__CONFIG__', JSON.stringify({ page, name: path.basename(abs), size: size.split('x').map(Number), hasAudio: !!audioFile() })), 'text/html; charset=utf-8');
  if (u === '/__preview/mtime') return send(200, JSON.stringify({ m: watched(), audio: !!audioFile() }), 'application/json');
  if (u === '/__preview/audio') { const f = audioFile(); return f ? sendFile(q, r, f, T[path.extname(f)] || 'audio/wav') : send(404, 'no audio (out/mix.wav)'); }
  const x = resolveRequest(ROOT, q.url); if (x.status) return send(x.status, 'refused');
  sendFile(q, r, x.path, T[path.extname(x.path).toLowerCase()] || 'application/octet-stream');
}).listen(port, '127.0.0.1', () => console.log(`preview of ${dir}\n  http://127.0.0.1:${port}/__preview/\n  (Ctrl-C to stop; the page reloads itself when the film's files change)`));
