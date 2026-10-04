#!/usr/bin/env python3
"""dunhuang.srt from the same line times as the picture's plaques (timeline.js) and the measured voice durations."""
import json, os, sys, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '..', '..', '..'))
BEAT = 60 / 72; BAR = BEAT * 4; bar = lambda n, b=1: (n - 1) * BAR + (b - 1) * BEAT
T = {'l1': bar(2, 3), 'l2': bar(5), 'l3': bar(6, 4), 'l4': bar(12), 'l5': bar(14, 4)}
TXT = {'l1': '洞里没有光，只有一盏借来的灯。', 'l2': '灯走到哪里，墙就醒到哪里。', 'l3': '丝带还在吹，风是画进去的。', 'l4': '一格一格，每一笔都有人用手画过。', 'l5': '颜色会退，线条还在。'}
vd = json.load(open(os.path.join(HERE, 'voices', 'dur.json')))
cues = []
for k in T:
    d = vd[k]; d = d['dur'] if isinstance(d, dict) else d
    a = T[k] - .35; b = max(T[k] + d + .6, a + 1.8)
    cues.append({'t0': round(a, 2), 't1': round(b, 2), 'text': TXT[k]})
json.dump(cues, open(os.path.join(HERE, 'out', 'cues.json'), 'w'), ensure_ascii=False)
subprocess.check_call([os.path.join(LIB, '.venv', 'bin', 'python'), os.path.join(LIB, 'core', 'render', 'srt.py'), os.path.join(HERE, 'out', 'cues.json'), sys.argv[1]])
