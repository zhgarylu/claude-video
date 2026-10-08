"""Quiet UI sounds for the fictional footage: clicks, key taps, chip pops, a toast ding. numpy only; deterministic."""
import os, sys, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
sys.path.insert(0, LIB)
from core.audio import sfx
from core.audio.sfx import SR
J = json.load(open(os.path.join(HERE, 'events.json'))); N = int(J['dur'] * SR); buf = np.zeros((N, 2)); rng = np.random.default_rng(3)
room = sfx.lp(sfx.noise(J['dur']), 400, 2) * .004; buf[:, 0] += room; buf[:, 1] += room[::-1]
for e in J['ev']:
    t, ty = e['t'], e['type']
    if ty == 'click': sfx.add(buf, sfx.click(1.0, .8), t, .55)
    elif ty == 'key': sfx.add(buf, sfx.click(1.0 + rng.uniform(-.15, .25), .5), t, .32, pan=rng.uniform(-.2, .2))
    elif ty == 'chip': sfx.add(buf, sfx.pop(.8), t, .38, pan=.2)
    elif ty == 'whoosh': sfx.add(buf, sfx.whoosh(.5, .35), t, .3)
    elif ty == 'pop': sfx.add(buf, sfx.pop(1.0), t, .5)
    elif ty == 'ding': sfx.add(buf, sfx.ding(.7), t, .35)
    elif ty == 'switch': sfx.add(buf, sfx.clack(1.2, .7), t + .02, .35)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True); sf.write(os.path.join(HERE, 'out', 'mix.wav'), np.clip(buf, -.95, .95).astype(np.float32), SR); print('footage sound ok')
