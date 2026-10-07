"""Find the moments of a long video that mention something: by what is said (transcript) and what is on screen (OCR).

  .venv/bin/python tools/breakdown/find.py <ingest dir> "keyword or phrase" [--top 5] [--min 8] [--max 30] [--json]

For each candidate it prints the in/out seconds to paste into breakdown.json (snapped to scene cuts when one is near), the sentence, the text on screen
and a keyframe to look at (open it with the Read tool). Chinese is matched by characters and character pairs, other languages by words; an exact phrase
scores higher than scattered words. Several words separated by spaces all count."""
import argparse, json, os, re, sys
ap = argparse.ArgumentParser(); ap.add_argument('dir'); ap.add_argument('query'); ap.add_argument('--top', type=int, default=5); ap.add_argument('--min', type=float, default=8); ap.add_argument('--max', type=float, default=30); ap.add_argument('--json', action='store_true')
A = ap.parse_args(); D = os.path.abspath(A.dir)
idx = json.load(open(os.path.join(D, 'index.json'), encoding='utf8')); mm = lambda s: '%d:%04.1f' % (s // 60, s % 60)
norm = lambda s: re.sub(r'\s+', ' ', s.lower()).strip()
q = norm(A.query); cjk = re.findall(r'[぀-鿿＀-￯]', q)
toks = set(re.findall(r'[a-z0-9]+', q))
chars = [c for c in q if re.match(r'[぀-鿿]', c)]
toks |= {''.join(chars[i:i + 2]) for i in range(len(chars) - 1)} | (set(chars) if len(chars) == 1 else set())
if not toks: sys.exit('nothing to search for in %r' % A.query)
def score(text):
    t = norm(text); s = 0.0
    if q and q in t: s += 1.0
    hit = [k for k in toks if k in t]; s += .8 * len(hit) / len(toks)
    return s
hits = []
for s in idx['segments']:
    sc = score(s['text']); 
    if sc >= .35: hits.append({'t0': s['t0'], 't1': s['t1'], 'score': sc, 'kind': 'speech', 'text': s['text']})
for f in idx['frames']:
    txt = ' '.join(t['text'] for t in f['text']); sc = score(txt) if txt else 0
    if sc >= .35: hits.append({'t0': f['t'] - idx['step'] / 2, 't1': f['t'] + idx['step'] / 2, 'score': sc * .9, 'kind': 'screen', 'text': txt, 'frame': f})
if not hits: print('no moment matches %r. Try a shorter word, or the other language, or read %s' % (A.query, os.path.join(D, 'index.md'))); sys.exit(1)
hits.sort(key=lambda h: h['t0']); clusters = []
for h in hits:
    if clusters and h['t0'] - clusters[-1]['t1'] < 6: c = clusters[-1]; c['hits'].append(h); c['t1'] = max(c['t1'], h['t1'])
    else: clusters.append({'t0': h['t0'], 't1': h['t1'], 'hits': [h]})
for c in clusters:
    kinds = {h['kind'] for h in c['hits']}; c['score'] = sum(sorted((h['score'] for h in c['hits']), reverse=True)[:3]) + (.6 if len(kinds) > 1 else 0)
clusters.sort(key=lambda c: -c['score'])
scenes = idx.get('scenes', []); out = []
for rank, c in enumerate(clusters[:A.top], 1):
    t_in = max(0, c['t0'] - 1.0); prev = [s for s in scenes if t_in - 3 <= s <= c['t0'] + .5]
    if prev: t_in = max(prev, key=lambda s: -abs(s - t_in)) if False else max(s for s in prev if s <= c['t0'] + .5)
    t_out = max(c['t1'] + 4.0, t_in + A.min); t_out = min(t_out, t_in + A.max, idx['duration'])
    nxt = [s for s in scenes if t_out - 2.5 <= s <= t_out + 2.5]
    if nxt and min(nxt) - t_in >= A.min: t_out = min(nxt)
    sp = next((h for h in c['hits'] if h['kind'] == 'speech'), None); sc = next((h for h in c['hits'] if h['kind'] == 'screen'), None)
    near = min(idx['frames'], key=lambda f: abs(f['t'] - (c['t0'] + c['t1']) / 2)) if idx['frames'] else None
    kf = os.path.join(D, (sc['frame'] if sc else near)['file']) if (sc or near) else None
    out.append({'rank': rank, 'score': round(c['score'], 2), 'in': round(t_in, 1), 'out': round(t_out, 1), 'said': sp['text'] if sp else '', 'on_screen': (sc['text'] if sc else ''), 'keyframe': kf, 'kinds': sorted({h['kind'] for h in c['hits']})})
if A.json: print(json.dumps(out, ensure_ascii=False, indent=1)); sys.exit(0)
for o in out:
    print('#%d  score %.2f   %s – %s  (%.0f s)   [%s]' % (o['rank'], o['score'], mm(o['in']), mm(o['out']), o['out'] - o['in'], ' + '.join(o['kinds'])))
    if o['said']: print('    said:      %s' % o['said'][:160])
    if o['on_screen']: print('    on screen: %s' % o['on_screen'][:160])
    if o['keyframe']: print('    keyframe:  %s' % o['keyframe'])
    print('    use:       {"in": %.1f, "out": %.1f}' % (o['in'], o['out']))
