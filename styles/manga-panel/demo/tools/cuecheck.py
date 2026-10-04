"""cuecheck: every visual cue (panel reveal, impact, bell) must sit on the 100 BPM grid of the score, and the loudest
onset in the mix around the impact must land on the impact frame. Exits 1 on any miss over 1 frame (41.7 ms)."""
import json, os, sys
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.abspath(os.path.join(HERE, '..'))
ev = json.load(open(os.path.join(D, 'out', 'events.json')))['ev']
BPM = [e for e in ev if e['type'] == 'meta'][0]['bpm']; BEAT = 60 / BPM
bad = 0
print('cue            t      grid beat   off ms')
for e in ev:
    if e['type'] in ('reveal', 'hit', 'bell'):
        k = round(e['t'] / (BEAT / 2)) * (BEAT / 2); off = (e['t'] - k) * 1000
        name = e['type'] + (':' + e['id'] if 'id' in e else '')
        print('%-14s %6.2f  %8.1f  %7.1f' % (name, e['t'], k / BEAT, off))
        if abs(off) > 41.7: bad += 1
# audio onset at the impact: the first sample above 40 % of the local peak within +-60 ms
hit = [e for e in ev if e['type'] == 'hit'][0]['t']
x, sr = sf.read(os.path.join(D, 'out', 'mix.wav')); x = np.abs(x).max(axis=1) if x.ndim > 1 else np.abs(x)
a, b = int((hit - .06) * sr), int((hit + .06) * sr); seg = x[a:b]; on = a + int(np.argmax(seg > 0.4 * seg.max()))
off = (on / sr - hit) * 1000; print('audio onset at the impact: %.1f ms' % off)
if abs(off) > 41.7: bad += 1
# silence before the impact
pre = x[int((hit - .25) * sr):int((hit - .02) * sr)]; print('level in the 0.23 s before the hit: %.4f' % pre.max())
if pre.max() > 0.05: bad += 1
sys.exit(1 if bad else 0)
