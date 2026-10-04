"""mix.py: score + paper foley for "The Seventh Fold", all synthesised from events.json and caps.json.
Writes out/mix.wav, cues.json (every music onset and the beat grid, for cuecheck) and origami.srt."""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import lfilter

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '../../..'))
sys.path.insert(0, os.path.join(LIB, 'core/audio'))
import sfx
from sfx import SR, noise, bp, hp, lp, env_exp, t_, norm, add

ev = json.load(open(os.path.join(HERE, 'events.json')))['ev']
caps = json.load(open(os.path.join(HERE, 'caps.json')))
DUR, BEAT = caps['dur'], caps['beat']
N = int((DUR + .6) * SR)
rng = np.random.default_rng(11)
buf = {k: np.zeros((N, 2)) for k in ('music', 'foley', 'room')}
onsets = []

# ------------------------------------------------------------------ instruments
mid = lambda m: 440 * 2 ** ((m - 69) / 12)

def marimba(m, vel=1.0, d=1.6):
    f = mid(m); tt = t_(d); tau = .5 if m < 60 else .32 if m < 72 else .2
    x = np.sin(2 * np.pi * f * tt) * np.exp(-tt / tau) + .35 * np.sin(2 * np.pi * f * 3.97 * tt) * np.exp(-tt / (tau * .22)) + .08 * np.sin(2 * np.pi * f * 9.2 * tt) * np.exp(-tt / .03)
    k = np.zeros_like(tt); k[:int(.012 * SR)] = hp(noise(.012), 1500) * np.linspace(1, 0, int(.012 * SR)) * .25
    return (x + k) * vel * .55

def kalimba(m, vel=1.0, d=2.2):
    f = mid(m); tt = t_(d)
    x = np.sin(2 * np.pi * f * tt) * np.exp(-tt / .9) + .22 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt / .12) + .1 * np.sin(2 * np.pi * f * 2.0 * tt) * np.exp(-tt / .4)
    x[:int(.006 * SR)] += hp(noise(.006), 3000) * .3
    return x * vel * .5

def pizz(m, vel=1.0, d=1.0):
    f = mid(m); n = int(SR / f); ex = lp(noise(n / SR), 3500); ex = ex / (np.abs(ex).max() + 1e-9)
    a = np.zeros(n + 2); a[0] = 1; a[n] -= .496; a[n + 1] -= .496
    sig = np.zeros(int(d * SR)); sig[:n] = ex
    return lp(lfilter([1.0], a, sig), 4500) * vel * .9

def note(buf_, inst, t, m, vel=1.0, pan=0.0, tag=''):
    x = {'mar': marimba, 'kal': kalimba, 'piz': pizz}[inst](m, vel)
    add(buf_, x, t, 1.0, pan); onsets.append({'t': round(t, 4), 'inst': inst, 'midi': m, 'vel': round(vel, 2), 'tag': tag})

# ------------------------------------------------------------------ foley (paper)
def swish(d, v=1.0, heavy=0.0):
    n = noise(d + .05); tt = t_(d + .05); out = np.zeros_like(n)
    for i in range(0, len(n), 480):
        hi = min(len(n), i + 480); f = 1400 + 2600 * np.sin(np.pi * min(1, i / len(n))) ** 1.2
        out[i:hi] = bp(n[max(0, i - 2000):hi], f * .6, f * 1.5)[-(hi - i):]
    e = np.sin(np.pi * np.clip(tt / (d + .05), 0, 1)) ** 1.6
    body = lp(noise(d + .05), 500) * e * heavy
    return norm(out * e + body * .5) * v * .6

def crease(v=1.0):
    d = .05; x = np.zeros(int(d * SR))
    for s in (0, .006, .014, .022): i = int(s * SR); b = hp(noise(.008), 3500) * np.exp(-t_(.008) / .002) * (.6 + rng.random() * .4); x[i:i + len(b)] += b
    return norm(x) * v * .55

def land(layers=2, v=1.0):
    d = .18; tt = t_(d); k = np.log2(max(layers, 2)) / 6
    th = lp(noise(d), 260 + 200 * (1 - k)) * np.exp(-tt / (.03 + .03 * k)); sn = np.sin(2 * np.pi * (200 - 90 * k) * tt) * np.exp(-tt / (.03 + .025 * k))
    ck = hp(noise(.02), 2500) * np.exp(-t_(.02) / .004); ck = np.pad(ck, (0, len(tt) - len(ck)))
    return norm(th * .9 + sn * .6 + ck * (.5 - .3 * k)) * v * (.5 + .5 * k)

def rustle(d, v=1.0, lo=1500, hi=6500, shape=None):
    n = noise(d); tt = t_(d); x = bp(n, lo, hi)
    grains = np.zeros_like(tt)
    for _ in range(int(d * 40)): c = int(rng.random() * len(tt)); w = int((.004 + rng.random() * .012) * SR); grains[c:c + w] += np.hanning(min(w, len(tt) - c)) * (rng.random() * .8 + .2) if c + 2 < len(tt) else 0
    e = (np.sin(np.pi * tt / d) ** 1.4) if shape is None else shape(tt, d)
    return norm(x * (.35 + grains)) * e * v * .5

def strain(v=1.0):
    d = .55; tt = t_(d); f0 = 55 + 20 * v; saw = 2 * ((tt * f0 * (1 + .15 * np.sin(2 * np.pi * 7 * tt) + .1 * tt)) % 1) - 1
    stick = np.abs(np.sin(2 * np.pi * (14 + 8 * v) * tt)) ** 4
    return norm(bp(saw, 300, 2600) * stick * np.sin(np.pi * tt / d) + .25 * bp(noise(d), 1800, 5000) * stick) * .45 * min(1.2, v)

def tick(v=1.0):
    d = .03; return norm(hp(noise(d), 4500) * np.exp(-t_(d) / .0025) + .5 * np.sin(2 * np.pi * 2300 * t_(d)) * np.exp(-t_(d) / .004)) * .25 * v

def drop(layers=64):
    d = .22; tt = t_(d); return norm(lp(noise(d), 220) * np.exp(-tt / .05) + .5 * np.sin(2 * np.pi * 80 * tt) * np.exp(-tt / .06) + .3 * rustle(d, 1, 2000, 7000)) * .7

# ------------------------------------------------------------------ events -> foley
for e in ev:
    t, ty = e['t'], e['type']
    if ty == 'tick': add(buf['foley'], tick(.8 + .4 * rng.random()), t, .5, -.2)
    elif ty == 'swish': add(buf['foley'], swish(e['dur'], 1.0, heavy=np.log2(e.get('layers', 2)) / 6), t, .8, .1)
    elif ty == 'crease': add(buf['foley'], crease(1.0), t, .8, -.05)
    elif ty == 'land': add(buf['foley'], land(e.get('layers', 2)), t, .95, 0.0)
    elif ty == 'strain': add(buf['foley'], strain(e.get('v', 1)), t, .9, 0.05)
    elif ty == 'drop': add(buf['foley'], drop(), t, .9, 0)
    elif ty == 'rustle': add(buf['foley'], rustle(e['dur'], e.get('v', .6)), t, .8, rng.uniform(-.2, .2))
    elif ty == 'pleat':
        d = e['dur']
        for k in range(7):                                   # seven creases close together: rising rustles
            s = t + d * (.04 + .1 * k); add(buf['foley'], rustle(d * .3, .5 + .05 * k, 1400 + 450 * k, 5500 + 700 * k), s, .8, -.4 + .13 * k)
        add(buf['foley'], rustle(d, .5, 900, 4200), t, .5, 0)
    elif ty == 'pull':
        d = e['dur']; add(buf['foley'], rustle(d, .8, 1200, 6000, shape=lambda tt, dd: np.sin(np.pi * np.clip(tt / dd, 0, 1)) ** .8), t, .9, 0)
        for k in range(10): add(buf['foley'], crease(.6), t + d * (.12 + .07 * k), .6, -.3 + .06 * k)

# ------------------------------------------------------------------ room
rt = lp(noise(DUR + .6), 900) * .05 + .006 * np.sin(2 * np.pi * 100 * t_(DUR + .6)) + .003 * np.sin(2 * np.pi * 200 * t_(DUR + .6)) + hp(noise(DUR + .6), 3000) * .0025
fadeout = np.clip((DUR + .6 - t_(DUR + .6)) / 1.5, 0, 1)
buf['room'][:, 0] = buf['room'][:, 1] = rt[:N] * fadeout[:N]

# ------------------------------------------------------------------ score (96 BPM, D minor pentatonic)
b = lambda n: n * BEAT
D3, F3, G3, A3, C4, D4, F4, G4, A4, C5, D5 = 50, 53, 55, 57, 60, 62, 65, 67, 69, 72, 74
chords = [(D3, A3, D4), (F3, C4, F4), (G3, D4, G4), (A3, D4, A4)]
# A  (beats 0-19): marimba ostinato in eighths, rising in level; kalimba accents land on every fold landing
for bar in range(0, 19):
    root, fifth, oct_ = chords[bar % 4]
    for i, m in enumerate([root, fifth, oct_, fifth, root + 12 - 12, fifth, oct_, fifth]):
        t = b(bar * 4 + i * .5)
        if t >= 12.0: continue
        note(buf['music'], 'mar', t, m, vel=.55 + .02 * bar + (.18 if i % 4 == 0 else 0), pan=-.2 + .4 * (i % 2))
for lb in caps['landBeats']: note(buf['music'], 'kal', b(lb), D5 if lb < 14 else A4 + 12, vel=.9, pan=.25, tag='fold')
# B  (beats 19.2-28): silence, only foley and room tone. C (beat 28 =17.5 s): kalimba returns, falling phrase on the unfolding
for i, m in enumerate([D5, C5, A4, G4, F4, D4, C4, A3, G3, D3]): note(buf['music'], 'kal', b(28 + i * 1.0), m, vel=.8 - .03 * i, pan=.3 - .06 * i, tag='unfold')
for i in range(4): note(buf['music'], 'mar', b(40 + i), [D4, A3, F3, D3][i], vel=.5, tag='pattern')
# D  (beat 41 = 25.6 s): pizzicato ostinato, kalimba rising across the collapse, a chord when the block closes (beat 50 = 31.25 s)
for i in range(0, 20):
    root, fifth, oct_ = chords[(i // 4) % 4]; note(buf['music'], 'piz', b(41 + i * .5), [root, fifth, oct_, fifth][i % 4], vel=.5 + .015 * i, pan=-.3, tag='pleat')
rise = [D4, F4, G4, A4, C5, D5, F4 + 12, G4 + 12, A4 + 12, C5 + 12, D5 + 12]
for i, m in enumerate(rise): note(buf['music'], 'kal', b(41.2 + i * .8), m, vel=.55 + .04 * i, pan=.2, tag='rise')
for m in (D3, A3, D4): note(buf['music'], 'mar', b(50), m, vel=.95, pan=0, tag='block')
for i in range(8): note(buf['music'], 'piz', b(50.5 + i * .5), [D4, F4, A4, C5][i % 4], vel=.4, pan=-.3, tag='hold')
# E  (beat 55 = 34.4 s): the pull: marimba phrase rises as the sheet opens
for i, m in enumerate([D4, F4, G4, A4, C5, D5, A4, D5]): note(buf['music'], 'mar', b(55 + i * .9), m, vel=.7 + .03 * i, pan=-.1 + .05 * i, tag='pull')
# near-silence (beat 62.4-65): only room tone. F  (beat 66 = 41.25 s): the theme, slower and softer, one last note
for i, (m, vv) in enumerate([(D4, .55), (A3, .5), (F3, .45), (D3, .5)]): note(buf['music'], 'mar', b(66 + i * 2), m, vel=vv, pan=0, tag='theme')
for i, m in enumerate([D5, A4, F4, D4]): note(buf['music'], 'kal', b(66 + i * 2 + 1), m, vel=.45, pan=.3, tag='theme')
note(buf['music'], 'mar', b(78), D4, vel=.6, tag='last'); note(buf['music'], 'kal', b(78), D5, vel=.4, pan=.3, tag='last')

# ------------------------------------------------------------------ mix
mus = buf['music']; fol = buf['foley']; room = buf['room']
for ch in (0, 1):
    fol[:, ch] = sfx.compress(fol[:, ch], .3, 3.0)
mix = mus * .9 + fol * 1.15 + room * 1.0
# duck the music a little under loud foley
env = np.abs(fol).max(axis=1); from scipy.ndimage import uniform_filter1d
duck = 1 - .25 * np.clip(uniform_filter1d(env, int(.12 * SR)) / .35, 0, 1)
mix[:, 0] = mus[:, 0] * .9 * duck + fol[:, 0] * 1.15 + room[:, 0]; mix[:, 1] = mus[:, 1] * .9 * duck + fol[:, 1] * 1.15 + room[:, 1]
for ch in (0, 1): mix[:, ch] = sfx.limit(mix[:, ch], .9)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out/mix.wav'), mix.astype(np.float32), SR)

json.dump({'bpm': caps['bpm'], 'beat': BEAT, 'onsets': onsets, 'grid': [round(i * BEAT, 4) for i in range(int(DUR / BEAT) + 1)]}, open(os.path.join(HERE, 'cues.json'), 'w'), indent=1)
srt = [{'t0': c['t0'], 't1': c['t1'], 'text': c['text']} for c in caps['captions']]
json.dump(srt, open(os.path.join(HERE, 'out/srt_cues.json'), 'w'))
import subprocess
subprocess.run([os.path.join(LIB, '.venv/bin/python'), os.path.join(LIB, 'core/render/srt.py'), os.path.join(HERE, 'out/srt_cues.json'), os.path.join(HERE, '../origami.srt')], check=True)
print('mix written', mix.shape, 'onsets', len(onsets))
