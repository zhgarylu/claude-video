"""Every picture event must sit on the music's half-beat grid (68 BPM). Reads events.json; exit 1 on any miss > 5 ms."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.dirname(HERE)
ev = json.load(open(os.path.join(D, 'events.json')))['ev']
half = 60 / 68 / 2; worst = 0; bad = 0
for e in ev:
    k = round(e['t'] / half); off = (e['t'] - k * half) * 1000
    worst = max(worst, abs(off))
    if abs(off) > 5: bad += 1; print('OFF GRID', e['type'], round(e['t'], 3), '%.1f ms' % off)
print(f'{len(ev)} events, worst offset {worst:.2f} ms, {bad} off grid')
sys.exit(1 if bad else 0)
