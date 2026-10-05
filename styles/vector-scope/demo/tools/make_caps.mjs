// Captions: one cue per sentence group (at most 2 lines of 42 characters), timed from the Whisper word stamps (voice/words.json).
// Each cue holds max(1.8 s, end of speech + 0.6 s) and never overlaps the next. -> caps.json (page: words + wrapped lines) and out/srt.json
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TL = JSON.parse(fs.readFileSync(path.join(D, 'timeline.json'), 'utf8'));
const lines = JSON.parse(fs.readFileSync(path.join(D, 'lines.json'), 'utf8')), words = JSON.parse(fs.readFileSync(path.join(D, 'voice/words.json'), 'utf8')), dur = JSON.parse(fs.readFileSync(path.join(D, 'voice/dur.json'), 'utf8'));
const MAXC = 42;
const wrap = (ws) => { // wrap into <= 2 lines of MAXC; prefer a break after . , ! ?
  const full = ws.join(' '); if (full.length <= MAXC) return [full];
  let best = null;
  for (let k = 1; k < ws.length; k++) { const a = ws.slice(0, k).join(' '), b = ws.slice(k).join(' '); if (a.length <= MAXC && b.length <= MAXC) { const sc = Math.abs(a.length - b.length) - (/[.!?]$/.test(ws[k - 1]) ? 40 : /,$/.test(ws[k - 1]) ? 25 : 0); if (!best || sc < best.sc) best = { sc, l: [a, b] }; } }
  if (!best) throw new Error('caption too long: ' + full);
  return best.l;
};
const cues = [];
for (const v of TL.VO) {
  const text = lines.find(l => l.id === v.id).text, W = words[v.id];
  const toks = text.split(/\s+/);
  if (W.length !== toks.length) console.log('WARN word count', v.id, W.length, toks.length);
  const wt = toks.map((w, i) => { const j = Math.min(W.length - 1, Math.round(i * (W.length - 1) / Math.max(1, toks.length - 1))); return { w, a: Math.max(0, W[j][1]), b: Math.max(0.05, W[j][2]) }; });
  // sentence groups: split after . ! ? ; group while the group stays within 2 lines
  const sents = []; let cur = [];
  wt.forEach(x => { cur.push(x); if (/[.!?]$/.test(x.w)) { sents.push(cur); cur = []; } }); if (cur.length) sents.push(cur);
  // partition the sentences into contiguous groups (each <= 2 lines); fewest groups, none too short to hold 1.8 s
  let bestP = null;
  for (let m = 0; m < (1 << (sents.length - 1)); m++) {
    const gs = []; let g = [sents[0]];
    for (let i = 1; i < sents.length; i++) { if (m & (1 << (i - 1))) { gs.push(g); g = [sents[i]]; } else g.push(sents[i]); }
    gs.push(g);
    let ok = true, sc = gs.length;
    for (const gg of gs) { const ws = gg.flat(); let wl; try { wl = wrap(ws.map(x => x.w)); } catch { ok = false; break; } if (wl.length > 1) { const last = wl[0].split(' ').pop(); if (!/[.!?,]$/.test(last)) sc += 1.5; } const d = ws[ws.length - 1].b + 0.6 - ws[0].a; if (d < 1.8) sc += 10; }
    if (ok && (!bestP || sc < bestP.sc)) bestP = { sc, gs };
  }
  const groups = bestP.gs.map(g => g.flat());
  for (const g of groups) cues.push({ id: v.id, t0: +(v.t + g[0].a).toFixed(3), sp1: +(v.t + g[g.length - 1].b).toFixed(3), words: g.map(x => ({ w: x.w, t0: +(v.t + x.a).toFixed(3), t1: +(v.t + x.b).toFixed(3) })) });
}
cues.sort((a, b) => a.t0 - b.t0);
cues.forEach((c, i) => {
  let t1 = Math.max(c.t0 + 1.8, c.sp1 + 0.6); if (cues[i + 1]) t1 = Math.min(t1, cues[i + 1].t0 - 0.05);
  c.t1 = +t1.toFixed(3); c.lines = wrap(c.words.map(x => x.w)); c.text = c.lines.join(' ');
  if (c.t1 - c.t0 < 1.8) console.log('WARN short cue', c.t0, c.t1, c.text);
});
fs.writeFileSync(path.join(D, 'caps.json'), JSON.stringify(cues.map(({ t0, t1, text, lines, words }) => ({ t0, t1, text, lines, words })), null, 1));
fs.mkdirSync(path.join(D, 'out'), { recursive: true });
fs.writeFileSync(path.join(D, 'out/srt.json'), JSON.stringify(cues.map(({ t0, t1, lines }) => ({ t0, t1, text: lines.join('\n') })), null, 1));
for (const c of cues) console.log(c.t0.toFixed(2), c.t1.toFixed(2), JSON.stringify(c.lines));
