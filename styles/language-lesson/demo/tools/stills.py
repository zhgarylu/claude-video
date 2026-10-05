"""Review frames for the docs, at moments read from timeline.json: prints one still.mjs call per frame (run by build.sh)."""
import json, os, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); T = json.load(open(os.path.join(D, 'timeline.json'))); L, M = T['lines'], T['marks']
F = {'cover': 3.6, 'think': M['A.think0'] + 1.3, 'clue': L['a7']['t0'] + .5, 'answer': L['a10']['t0'] + .85, 'repeat': L['a12']['t0'] + 1.0, 'pair': L['b11']['t1'] + .6,
     'de': M['MON.1'] + 3.0, 'ja': M['MON.2'] + 3.0, 'es': M['MON.3'] + 3.2, 'hook': M['H.ring0'] + 1.2}
for k, t in F.items(): print(k, round(t, 2))
