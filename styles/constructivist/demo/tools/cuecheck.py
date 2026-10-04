"""Compare every visual hit (out/events.json, exported from the page) with the score cue it should land on (out/score_cues.json)
and with the 16th-note grid (0.25 s = 6 frames at 24 fps). Exit 1 on any miss over 1 ms."""
import json, os, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out')
hits = {e['id']: e['t'] for e in json.load(open(os.path.join(D, 'events.json')))['ev'] if e['type'] == 'hit'}
cues = {c['id']: c['t'] for c in json.load(open(os.path.join(D, 'score_cues.json')))}
bad = 0; worst = 0
for k, t in hits.items():
    c = cues.get(k)
    if c is None:
        print(f'{k:16s} hit {t:7.3f}  no score cue'); bad += 1; continue
    ms = abs(c - t) * 1000; grid = abs(t * 24 - round(t * 24)) / 24 * 1000; worst = max(worst, ms, grid)
    if ms > 1 or grid > 1: print(f'{k:16s} hit {t:7.3f}  cue {c:7.3f}  off {ms:5.1f} ms  frame grid {grid:5.1f} ms'); bad += 1
print(f'{len(hits)} hits checked, worst offset {worst:.2f} ms, {bad} misses')
sys.exit(1 if bad else 0)
