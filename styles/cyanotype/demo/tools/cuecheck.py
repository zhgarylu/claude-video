"""Cue check: every key picture hit sits on the music grid (96 BPM, 1/4 beat = 156 ms) or is declared free.
usage: .venv/bin/python styles/cyanotype/demo/tools/cuecheck.py"""
import json, os, sys
W = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TL = json.load(open(os.path.join(W, 'timeline.json'))); B = TL['BEAT']; H = TL['HITS']
bad = 0
for k, t in H.items():
    q = t / (B / 4); off = (q - round(q)) * (B / 4) * 1000
    ok = abs(off) < 60; bad += not ok
    print(f"{'ok ' if ok else 'OFF'} {k:10s} {t:8.3f}s  beat {t / B:7.2f}  offset from 1/16 grid {off:+6.0f} ms")
for e in TL['EV']:
    if e['type'] == 'band':
        q = e['t'] / (B / 4); off = (q - round(q)) * (B / 4) * 1000; bad += abs(off) >= 60
        print(f"{'ok ' if abs(off) < 60 else 'OFF'} band {e['k']}     {e['t']:8.3f}s  offset {off:+6.0f} ms")
print('cuecheck:', 'all on the grid (<= 60 ms)' if not bad else f'{bad} off the grid')
sys.exit(1 if bad else 0)
