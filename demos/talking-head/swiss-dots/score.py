"""score.json: the one data file that picture (main.js) and music (mix.py) both read.
Scene starts fix the tempo; every visual landing is the nearest eighth note to the word it belongs to."""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, LIB); sys.path.insert(0, os.path.join(LIB, 'tools', 'talk'))
from mix_helpers import fit_grid
starts = [0.4, 7.84, 12.98, 20.34, 25.2]
bpm, g0, errs = fit_grid(starts, (96, 124)); beat = 60 / bpm
print('bpm', bpm, 'g0', g0, 'start errors', errs)
q = lambda t: round(g0 + round((t - g0) / (beat / 2)) * beat / 2, 4)
want = {  # name: seconds of the word / moment it belongs to
  'dot': .4, 'ripple': .9, 'title': 2.86, 'n24': 3.76, 'bar': 4.1, 'cut1': 6.0, 'wipe1': 7.2,
  'r1': 7.84, 'pc': 8.64, 'br': 9.86, 'grid': 10.32, 'slack': 12.2,
  'r2': 12.98, 's1': 14.62, 's2': 17.0, 's3': 17.7, 'glide0': 14.36, 'glide1': 19.68,
  'r3': 20.34, 'row1': 21.72, 'row2': 22.86, 'row3': 23.72, 'knife': 24.5,
  'note1': 25.2, 'note2': 25.8, 'clear': 28.0, 'q': 28.2, 'qdot': 29.3,
}
ev = {k: q(v) for k, v in want.items()}
json.dump({'bpm': bpm, 'g0': g0, 'beat': beat, 'ev': ev}, open(os.path.join(HERE, 'score.json'), 'w'), indent=1)
print(ev)
