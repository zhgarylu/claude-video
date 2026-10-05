"""cuecheck.py: every struck picture event against the beat grid of the score (G0 + n * BEAT / 2) and the nearest music onset.
Exits 1 if a hit that is meant to be on the grid is more than 25 ms away."""
import json, os, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ev = json.load(open(os.path.join(HERE, 'events.json')))['ev']
cues = json.load(open(os.path.join(HERE, 'out/cues.json')))
B, G0 = cues['beat'], cues['g0']; on = sorted(o['t'] for o in cues['onsets'])
HIT = {'block_drop', 'slap', 'baren', 'paper_land', 'crackers', 'tear', 'peel'}
bad = 0
print(f"{'t':>8} {'event':<12} {'grid err ms':>12} {'nearest music onset ms':>24}")
for e in ev:
    if e['type'] not in HIT: continue
    n = round((e['t'] - G0) / (B / 2)); g = G0 + n * B / 2; err = (e['t'] - g) * 1000
    near = min(on, key=lambda x: abs(x - e['t'])); od = (near - e['t']) * 1000
    flag = ''
    if abs(err) > 25 and e['type'] in {'block_drop', 'slap', 'crackers', 'paper_land'}: flag = ' <-- off grid'; bad += 1
    print(f"{e['t']:8.3f} {e['type']:<12} {err:12.1f} {od:24.1f}{flag}")
print('off-grid hits:', bad); sys.exit(1 if bad else 0)
