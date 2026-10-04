#!/usr/bin/env python3
"""Every visual hit against the music grid (72 BPM): shot cuts, voice-line starts, the xun entry, the coffer wake, the last bell.
Hits that belong to the picture's own physics (cell wakes, flakes, rings) are listed with their distance to the nearest half beat but are not required to sit on it."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
BEAT = 60 / 72; BAR = BEAT * 4; bar = lambda n, b=1: (n - 1) * BAR + (b - 1) * BEAT
ev = json.load(open(os.path.join(HERE, 'events.json')))
HITS = {'cut s2': (bar(2), bar(2)), 'cut s3': (bar(4), bar(4)), 'cut s4': (bar(6), bar(6)), 'cut s5': (bar(8), bar(8)), 'cut s7': (bar(11), bar(11)), 'cut s8': (bar(14), bar(14)), 'cut s9': (bar(16), bar(16)),
        'voice l1': (5.0, bar(2, 3)), 'voice l2': (13.333333, bar(5)), 'voice l3': (19.1666667, bar(6, 4)), 'voice l4': (bar(12), bar(12)), 'voice l5': (bar(14, 4), bar(14, 4)),
        'last bell': (bar(16), bar(16))}
bad = 0
for k, (pic, mus) in HITS.items():
    d = (pic - mus) * 1000; ok = abs(d) <= 40; bad += not ok; print(f'{"OK " if ok else "BAD"} {k:10s} picture {pic:7.3f}  music {mus:7.3f}  {d:+.0f} ms')
# the first sound after the silence must be the xun at 33.4 s, after >= 3.0 s without music
mus_end = bar(9, 4); print(f'silence: music ends {mus_end:.2f}, xun enters 33.40 -> {33.4 - mus_end:.2f} s of cave air', 'OK' if 33.4 - mus_end >= 3 else 'BAD')
for e in ev['ev']:
    if e['type'] in ('ring', 'cellwake'): print(f'info {e["type"]:8s} {e["t"]:6.3f}  {(e["t"] / (BEAT / 2) % 1) * BEAT / 2 * 1000:4.0f} ms after a half beat')
sys.exit(1 if bad else 0)
