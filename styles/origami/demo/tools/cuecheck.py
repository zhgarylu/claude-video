"""cuecheck.py: every picture hit that is meant to sit on the music grid must land on a beat (<= 1 frame at 24 fps)
and carry a music onset exactly there (the six fold landings and the closing block)."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, '..')
ev = json.load(open(os.path.join(D, 'events.json')))['ev']; cues = json.load(open(os.path.join(D, 'cues.json')))
grid = cues['grid']; on = cues['onsets']; tol = 1 / 24; bad = 0
hits = [e for e in ev if e['type'] == 'land' and (e.get('fold', 0) in (1, 2, 3, 4, 5, 6) or e.get('layers') == 8)]
for e in hits:
    near = min(grid, key=lambda g: abs(g - e['t'])); d = abs(near - e['t'])
    has = any(abs(o['t'] - e['t']) < .001 for o in on)
    print(f"land fold={e.get('fold')} t={e['t']:.3f}  nearest beat {near:.3f}  off {d * 1000:.1f} ms  music onset {'yes' if has else 'NO'}")
    if d > tol or not has: bad += 1
print('cuecheck:', 'FAIL' if bad else 'OK', len(hits), 'hits')
sys.exit(1 if bad else 0)
