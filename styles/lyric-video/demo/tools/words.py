"""Final word timings for the karaoke highlight: align every placed line again (whisper + energy minima) and write words.json in film time.
usage: .venv/bin/python styles/lyric-video/demo/tools/words.py"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.dirname(HERE); sys.path.insert(0, HERE)
from align import words_for
S = json.load(open(os.path.join(D, 'song.json'))); L = {l['id']: l for l in json.load(open(os.path.join(D, 'lines.json')))}
BAR = 4 * 60 / S['bpm']; out = {}
for ln in S['lines']:
    W = words_for(os.path.join(D, 'voices', 'placed', ln['id'] + '.wav'), L[ln['id']]['text'])
    out[ln['id']] = {'bar': ln['bar'], 'text': L[ln['id']]['text'], 'words': [[w, round(ln['bar'] * BAR + a, 3), round(ln['bar'] * BAR + b, 3)] for w, a, b in W]}
    print(ln['id'], ' '.join('%s@%.2f' % (w[0], (w[1] - ln['bar'] * BAR) / (BAR / 4)) for w in out[ln['id']]['words']))
json.dump(out, open(os.path.join(D, 'words.json'), 'w'), indent=0)
