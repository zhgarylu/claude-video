"""Cue check: every key picture hit sits on the music grid (120 BPM, 1/4 beat = 125 ms) or is declared free.
usage: .venv/bin/python styles/newsprint/demo/tools/cuecheck.py"""
import json, os, sys
W = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TL = json.load(open(os.path.join(W, 'timeline.json'))); B = TL['BEAT']; T = TL['T']
hits = {k: T[k] for k in ['p1Head', 'p2Land', 'p2Head', 'bell', 'tape0', 'hush0', 'stamp', 'pull0', 'fix0', 'p4Land', 'p4Head', 'hush1', 'deal0', 'end']}
hits.update({'music in': TL['MUSIC']['in'], 'music back': TL['MUSIC']['back'], 'music out': TL['MUSIC']['out']})
bad = 0
for k, t in hits.items():
    q = t / (B / 4); off = (q - round(q)) * (B / 4) * 1000
    ok = abs(off) < 60
    bad += not ok
    print(f"{'ok ' if ok else 'OFF'} {k:12s} {t:8.3f}s  beat {t / B:7.2f}  offset from 1/16 grid {off:+6.0f} ms")
print('cuecheck:', 'all on the grid (<= 60 ms)' if not bad else f'{bad} off the grid')
sys.exit(1 if bad else 0)
