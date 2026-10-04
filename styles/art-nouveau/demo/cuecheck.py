"""Compare every visual hit (events.json, type 'hit' and the section starts in timeline.json) with the bar/beat grid of the score."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
tl = json.load(open(os.path.join(HERE, 'timeline.json'))); ev = json.load(open(os.path.join(HERE, 'events.json')))['ev']
beat = 60 / tl['bpm']; bad = 0
pts = [(e['name'], e['t']) for e in ev if e['type'] == 'hit'] + [(k, v) for k, v in tl['hits'].items()]
for name, t in sorted(set(pts), key=lambda p: p[1]):
    off = (t / beat) - round(t / beat); ms = off * beat * 1000
    ok = abs(ms) <= 25; bad += not ok
    print(f"{'OK ' if ok else 'BAD'} {name:8s} t={t:7.3f}s  bar {int(t // (3 * beat)) + 1} beat {round(t / beat) % 3 + 1}  off {ms:+.0f} ms")
sys.exit(1 if bad else 0)
