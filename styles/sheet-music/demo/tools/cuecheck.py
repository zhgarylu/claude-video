"""Do the sounds land on the picture's cues? For every note in events.json (the list the picture reads), find the
attack in that voice's stem and compare it with the event time. Exit 1 if any attack is more than 12 ms off."""
import json, os, sys
import numpy as np, soundfile as sf
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ev = json.load(open(os.path.join(D, 'events.json')))['ev']
worst = 0; bad = 0; n = 0
for v, name in enumerate(('lead', 'mallets', 'bass')):
    x, sr = sf.read(os.path.join(D, 'out', f'stem_{name}.wav')); m = np.abs(x).max(axis=1)
    k = int(.002 * sr); env = np.convolve(m, np.ones(k) / k, 'same'); d = np.maximum(0, np.diff(env, prepend=0))
    for e in ev:
        if e['type'] != 'note' or e['voice'] != v: continue
        i0 = int(e['t'] * sr); pre = env[max(0, i0 - int(.012 * sr))]; seg = env[i0 - int(.03 * sr):i0 + int(.12 * sr)]
        k0 = int(np.argmin(seg[:int(.04 * sr)])); base = seg[k0]; j = k0 + int(np.argmax(seg[k0:] - base > .2 * (seg.max() - base)))
        t_att = (i0 - int(.03 * sr) + j) / sr; off = (t_att - e['t']) * 1000
        n += 1; worst = max(worst, abs(off))
        if abs(off) > 12: bad += 1; print('OFF', e['id'], round(off, 1), 'ms')
print(f'{n} notes, worst attack offset {worst:.1f} ms, {bad} beyond 12 ms (one frame is 41.7 ms)')
sys.exit(1 if bad else 0)
