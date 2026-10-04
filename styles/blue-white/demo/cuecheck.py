"""Every visual hit must sit on the 100 BPM beat grid, and the hits that have a music cue must land on a music onset (+-25 ms)."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(os.path.join(HERE, 'events.json')))['ev']
sc = json.load(open(os.path.join(HERE, 'out', 'score.json')))
BEAT = sc['beat']; ons = [(t, n) for t, n in sc['onsets']]
hits = {e['type']: e['t'] for e in ev if e['type'] in ('touch', 'iris', 'iris-close', 'heat', 'flash', 'shatter', 'settle', 'tap2')}
with_music = {'iris': 'dizi', 'shatter': 'drum', 'settle': 'bowl', 'tap2': 'tap'}
bad = 0
for name, t in sorted(hits.items(), key=lambda kv: kv[1]):
    off = (t / BEAT - round(t / BEAT)) * BEAT * 1000
    line = f'{name:11s} {t:7.3f}s  beat offset {off:+6.1f} ms'
    ok = abs(off) <= 25
    if name in with_music:
        near = min(((abs(t - o) * 1000, n) for o, n in ons if n == with_music[name]), default=(1e9, ''))
        line += f'  music {with_music[name]} {near[0]:.1f} ms'; ok = ok and near[0] <= 25
    print(line, 'OK' if ok else 'FAIL'); bad += (not ok)
sys.exit(1 if bad else 0)
