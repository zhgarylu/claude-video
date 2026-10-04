"""Compare every visual hit (events.json, exported from the page) with the score note that carries it (out/score_cues.json).
Also reports how far each hit is from the one-second beat grid. Exit 1 on any miss over 1 ms."""
import json, os, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
hits = {e['id']: e['t'] for e in json.load(open(os.path.join(D, 'events.json')))['ev'] if e['type'] == 'hit'}
cues = {c['id']: c['t'] for c in json.load(open(os.path.join(D, 'out', 'score_cues.json')))}
bad = 0
for k, t in hits.items():
    c = cues.get(k)
    if c is None:
        print(f'{k:12s} hit {t:7.3f}  no score cue'); bad += 1; continue
    ms = abs(c - t) * 1000; grid = abs(t - round(t)) * 1000
    print(f'{k:12s} hit {t:7.3f}  cue {c:7.3f}  off {ms:5.1f} ms  grid {grid:5.1f} ms')
    if ms > 1 or grid > 1: bad += 1
sys.exit(1 if bad else 0)
