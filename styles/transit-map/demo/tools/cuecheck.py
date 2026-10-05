"""Cue check: every key picture hit sits on the music grid (120 BPM; eighth = 0.25 s) or is declared free.
usage: .venv/bin/python styles/transit-map/demo/tools/cuecheck.py [workdir]"""
import json, os, sys
W = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TL = json.load(open(os.path.join(W, 'timeline.json'))); B = TL['BEAT']; T = TL['T']
hits = {}
for k in ['ping0', 'lock', 'legend', 'angGhost', 'angSnap', 'caliper', 'rowStop', 'calloutStop', 'calloutChange', 'zoneRow', 'zone2', 'zone1', 'zoneTags', 'marker', 'flag', 'dim0', 'dep1', 'arr1', 'dep2', 'arr2', 'dep3', 'arr3', 'finalPulse', 'title', 'cartouche', 'morph0']:
    hits[k] = T[k]
for k, v in enumerate(T['rosette']): hits[f'spoke{k}'] = v
for k, v in enumerate(T['swatch']): hits[f'swatch{k}'] = v
snaps = [e['t'] for e in TL['EV'] if e['type'] == 'snap']
for i, t in enumerate(snaps): hits[f'snap{i}'] = t
bad = 0
for k, t in hits.items():
    q = t / (B / 2); off = (q - round(q)) * (B / 2) * 1000
    flag = 'ok ' if abs(off) < 60 else 'OFF'
    if flag == 'OFF': bad += 1
    if flag == 'OFF' or not k.startswith('snap'): print(f'{flag} {k:16s} {t:8.3f}s  beat {t / B:7.2f}  offset from 1/4-beat grid {off:+6.0f} ms')
print(f'cuecheck: {len(hits)} hits,', 'all on the grid (<= 60 ms)' if not bad else f'{bad} off the grid')
sys.exit(1 if bad else 0)
