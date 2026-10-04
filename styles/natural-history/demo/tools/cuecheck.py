"""cuecheck: every visual hit that should land on the music grid, and the two silences.
Usage: python cuecheck.py   (reads ../events.json). Exit 1 on a miss > 2 ms or an event inside a silence."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(os.path.join(HERE, '..', 'events.json')))['ev']
BEAT = 60 / 72
SIL = [(12.05, 13.30), (54.60, 56.60)]
bad = 0
for e in ev:
    if e['type'] in ('pin', 'cut', 'page'):
        k = round(e['t'] / BEAT); off = (e['t'] - k * BEAT) * 1000
        print(f"{e['type']:5s} {e.get('id', ''):6s} t={e['t']:.3f} beat {k:3d} offset {off:+.1f} ms")
        if abs(off) > 2: bad += 1
for e in ev:
    if e['type'] in ('voice',): continue
    t0, t1 = e['t'], e['t'] + e.get('dur', 0)
    for a, b in SIL:
        if t1 > a and t0 < b and not (e['type'] == 'pin' and abs(t0 - b) < .1) and not (e['type'] == 'page' and abs(t0 - b) < .1):
            print('EVENT INSIDE SILENCE', e, (a, b)); bad += 1
for e in ev:
    if e['type'] == 'voice':
        for a, b in SIL:
            if e['t'] < b and e['t'] + e['dur'] > a: print('VOICE INSIDE SILENCE', e); bad += 1
print('cuecheck:', 'FAIL' if bad else 'ok')
sys.exit(1 if bad else 0)
