"""Score, foley and voice for "The Iris Hour" -> out/mix.wav (stereo, 48 kHz).  Everything is synthesised with numpy/scipy:
harp and pizzicato (Karplus-Strong), bowed cello, flute, celesta, bells; foley from noise.  Event times come from
events.json (exported from the page) and timeline.json, so sound follows the picture.  3/4 waltz, 72 bpm, D Dorian."""
import sys, os, json
import numpy as np, soundfile as sf, soxr
from scipy.signal import lfilter
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '../../..'))
sys.path.insert(0, os.path.join(LIB, 'core/audio'))
from sfx import SR, t_, bp, lp, hp, noise, norm, env_exp, compress, limit

ev = json.load(open(os.path.join(HERE, 'events.json'))); DUR = ev['dur']; EV = ev['ev']
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
BEAT = 60 / TL['bpm']; BAR = 3 * BEAT
N = int(DUR * SR) + SR
rng = np.random.default_rng(21)
mk = lambda: np.zeros(N, np.float32)
def add(buf, snd, t, g=1.0):
    i = int(t * SR)
    if i < 0 or i >= N: return
    n = min(len(snd), N - i); buf[i:i + n] += snd[:n] * g
def fade(x, a=.004, b=.02):
    x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nb and nb < len(x): x[-nb:] *= np.linspace(1, 0, nb)
    return x
mid = lambda m: 440.0 * 2 ** ((m - 69) / 12)
bar = lambda n: (n - 1) * BAR                                  # start time of bar n (1-based)

# ---------- instruments ----------
def ks(m, d, bright=.5, damp=.997, g=1.0):
    f = mid(m); n = int(SR / f); x = np.zeros(int(d * SR)); x[:n] = lp(rng.standard_normal(n), 2500 + 5000 * bright, 1)
    a = np.zeros(n + 2); a[0] = 1; a[n] = -.4985 * damp; a[n + 1] = -.4985 * damp
    y = lfilter([1], a, x); y = lp(y, 2600 + 4500 * bright, 2)
    return fade(norm(y) * g, .002, .08)
harp = lambda m, d=2.4, g=.8: ks(m, d, .35, .9985, g)
pizz = lambda m, g=.7: ks(m, .9, .2, .993, g)
def celesta(m, d=2.0, g=.6):
    f = mid(m); tt = t_(d); y = sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / tau) for r, a, tau in [(1, 1, .8), (4, .3, .25), (6.2, .12, .12)])
    return fade(norm(y) * g, .001, .1)
def bowed(m, d, g=.5, att=.5, rel=.9, glide=None):
    tt = t_(d); f = mid(m) * np.ones_like(tt)
    if glide is not None: f = mid(glide) * (mid(m) / mid(glide)) ** np.clip(tt / .45, 0, 1)
    f = f * (1 + .005 * np.sin(2 * np.pi * 5.2 * tt) * np.minimum(1, tt / 1.0))
    ph = 2 * np.pi * np.cumsum(f) / SR; y = sum(np.sin(h * ph) / h ** 1.15 for h in range(1, 10))
    y = lp(y, 1300, 2); e = np.minimum(1, tt / att) * np.minimum(1, np.maximum(0, (d - tt)) / rel)
    return norm(y * e) * g
def flute(m, d, g=.45, att=.18, rel=.35):
    tt = t_(d); f = mid(m) * (1 + .004 * np.sin(2 * np.pi * 5.0 * tt) * np.minimum(1, tt / .6))
    ph = 2 * np.pi * np.cumsum(f) / SR; y = np.sin(ph) + .22 * np.sin(2 * ph) + .06 * np.sin(3 * ph) + .18 * bp(noise(d), mid(m) * 2, mid(m) * 5) * .5
    e = np.minimum(1, tt / att) * np.minimum(1, np.maximum(0, (d - tt)) / rel)
    return norm(y * e) * g
def bell(m, g=.4, d=3.0):
    f = mid(m); tt = t_(d); y = sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / tau) for r, a, tau in [(1, 1, 1.4), (2.4, .5, .8), (3.9, .3, .5), (5.9, .15, .3)])
    return fade(norm(y) * g, .001, .2)

# ---------- foley ----------
def pen(d, g=.5):
    tt = t_(d); y = bp(noise(d), 2400, 6500, 2) * (.35 + .65 * np.abs(np.sin(2 * np.pi * 3.1 * tt + 1))) ** 1.5
    return fade(norm(y) * g, .02, .15)
def tick(p=1.0, v=.7):
    d = .05; tt = t_(d); y = bp(noise(d), 3200 * p, 8000 * p) * np.exp(-tt / .003) + .5 * np.sin(2 * np.pi * 2300 * p * tt) * np.exp(-tt / .012)
    return norm(y) * v
def frost(v=1.0):
    d = 1.8; tt = t_(d); y = sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt / tau) for f, a, tau in [(4186, 1, .5), (5588, .5, .35), (6272, .4, .3), (7040, .25, .25)])
    return fade(norm(y) * .22 * v, .002, .3)
def drip():
    d = .5; tt = t_(d); f = 900 + 1400 * np.exp(-tt / .03); y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .06)
    return fade(norm(y) * .35 + lp(noise(d), 1500) * np.exp(-tt / .01) * .05, .001, .1)
def clock():
    d = .12; tt = t_(d); y = bp(noise(d), 900, 3000) * np.exp(-tt / .004) + np.sin(2 * np.pi * 620 * tt) * np.exp(-tt / .02) * .4
    return norm(y) * .35
def leafs(d=.7, g=.3):
    tt = t_(d); y = bp(noise(d), 1800, 6000, 2) * (np.sin(np.pi * tt / d) ** 2) * (.6 + .4 * np.sin(2 * np.pi * 11 * tt)); return norm(y) * g
def creak_():
    d = .5; tt = t_(d); f0 = 90 + 30 * rng.random(); saw = 2 * ((tt * f0 * (1 + .25 * np.sin(2 * np.pi * 6 * tt))) % 1) - 1
    return norm(bp(saw, 300, 1800) * (np.abs(np.sin(2 * np.pi * 17 * tt)) ** 3) * np.sin(np.pi * tt / d)) * .18
def petal(g=.6):
    d = 1.3; tt = t_(d); y = bp(noise(d), 1200, 5000, 2) * (np.sin(np.pi * tt / d) ** 1.5) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 7 * tt))); return norm(y) * g
def swish(g=.35):
    d = .7; tt = t_(d); y = bp(noise(d), 700, 3500, 2) * np.sin(np.pi * tt / d) ** 2; return norm(y) * g
def whoosh(d, g=.4):
    tt = t_(d); y = bp(noise(d), 500, 4200, 2) * np.sin(np.pi * tt / d) ** 2 * (.7 + .3 * np.sin(2 * np.pi * 9 * tt)); return norm(y) * g
def sprout(m=84): return ks(m, .5, .5, .98, .3)

foley = mk(); music = mk(); voice = mk(); room = mk()
for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'pen': add(foley, pen(e.get('d', 3)), t, .5)
    elif ty == 'tick': add(foley, tick(e.get('p', 1), e.get('v', .6)), t, .5)
    elif ty == 'frost': add(foley, frost(e.get('v', 1)), t, .6)
    elif ty == 'drip': add(foley, drip(), t, .7)
    elif ty == 'clock': add(foley, clock(), t, .8)
    elif ty == 'leaf': add(foley, leafs(), t, .7)
    elif ty == 'creak': add(foley, creak_(), t, 1)
    elif ty == 'petal': add(foley, petal(), t, .8)
    elif ty == 'swish': add(foley, swish(), t, .8)
    elif ty == 'whoosh': add(foley, whoosh(e.get('d', 2.5)), t, .9)
    elif ty == 'sprout': add(foley, sprout(), t, .8)

# room tone: a glasshouse hush, quieter in the near-silence so the clock and drips are heard
tt = np.arange(N) / SR; hush = lp(noise(N / SR), 500, 2)[:N] * .02 * (1 + .3 * np.sin(2 * np.pi * .13 * tt))
room += hush.astype(np.float32)

# ---------- score ----------
D, E, F, G, A, B, C = 50, 52, 53, 55, 57, 59, 60               # D Dorian around D3
CH = {'Dm': [50, 57, 62, 65], 'G': [43, 55, 59, 62], 'Am': [45, 57, 60, 64], 'Em': [52, 55, 59, 62], 'C': [48, 55, 60, 64]}
def arp(b, ch, g=.7, up=True):
    n = CH[ch]; seq = [n[0], n[1], n[2], n[3] + 0, n[2], n[1]] if up else [n[3], n[2], n[1], n[0] + 12, n[1], n[2]]
    for i, m in enumerate(seq): add(music, harp(m + (12 if i else 0), 2.0, g * (.85 if i else 1.0)), bar(b) + i * BEAT / 2, 1)
# bars 1-2: harp alone, single notes on the line being drawn
for t, m in [(.35, 62), (1.9, 69), (3.3, 65), (4.2, 74)]: add(music, harp(m, 2.8, .7), t)
prog = {3: 'Dm', 4: 'G', 5: 'Dm', 6: 'Am', 7: 'Dm', 8: 'Em', 9: 'G', 11: 'Dm', 12: 'Dm', 13: 'G', 14: 'C', 15: 'Dm', 16: 'Em', 17: 'G'}
for b, ch in prog.items():
    arp(b, ch, g=.55 if b in (11, 12) else .75, up=(b % 2 == 1))
# the first sound after the near-silence: one harp note
add(music, harp(62, 3.5, .9), bar(11), 1); add(music, bell(86, .25), bar(11), 1)
# cello pedal and slow line
for b, m, d in [(4, 38, 5.0), (6, 38, 2.4), (7, 38, 5.0), (12, 43, 2.4)]: add(music, bowed(m + 12, d, .5, att=.7, rel=1.0), bar(b), .8)
for b, m, gl in [(13, 43, 38), (14, 48, 43), (15, 50, 48), (16, 52, 50), (17, 55, 52)]: add(music, bowed(m + 12, BAR, .55, att=.4, rel=.5, glide=gl + 12), bar(b), .9)
# celesta melody over the keeper (bars 7-9)
for b, m, o in [(7, 74, 0), (7, 77, 1), (7, 81, 2), (8, 79, 0), (8, 77, 2), (9, 76, 0), (9, 74, 1.5)]: add(music, celesta(m, 2.2, .55), bar(b) + o * BEAT, 1)
for b, m, o, d in [(8, 69, 0, 2.2), (9, 69, 0, 1.6)]: add(music, flute(m, d, .4), bar(b) + o * BEAT, 1)
# bloom: flute line and a harp run on each opening stage (bars 13, 14, 15)
for b, m, o, d in [(12, 69, 0, 1.6), (12, 72, 2, 1.0), (13, 74, 0, 2.0), (13, 76, 2, 1.0), (14, 77, 0, 1.0), (14, 76, 1, 1.0), (14, 74, 2, 1.0), (15, 81, 0, 2.6), (16, 79, 0, 1.2), (16, 77, 1.5, 1.0), (17, 76, 0, 2.0)]:
    add(music, flute(m, d, .42), bar(b) + o * BEAT, 1)
scale = [62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81]
for tt0 in TL['hits']['stage1'], TL['hits']['stage2'], TL['hits']['stage3']:
    for i, m in enumerate(scale): add(music, harp(m + 12, 1.8, .45), tt0 + i * .06, 1)
add(music, bell(74, .35), TL['hits']['stage3'], 1)
# plate: pizzicato waltz and the theme on flute, final chord
for b, ch in [(18, 'Dm'), (19, 'C'), (20, 'G')]:
    n = CH[ch]; add(music, pizz(n[0] + 12, .8), bar(b), 1)
    for k in (1, 2): add(music, pizz(n[2], .5), bar(b) + k * BEAT, 1)
for b, m, o, d in [(18, 74, 0, 1.0), (18, 77, 1, 1.0), (18, 81, 2, 1.2), (19, 79, 0, 1.0), (19, 77, 1, 1.0), (19, 76, 2, 1.2), (20, 74, 0, 2.4)]: add(music, flute(m, d, .42), bar(b) + o * BEAT, 1)
for m in CH['Dm']: add(music, harp(m, 6.0, .6), bar(21), 1)
add(music, bowed(50, 4.2, .5, att=.8, rel=2.0), bar(21), 1); add(music, bell(74, .3, 5.0), bar(21), 1)

# the near-silence: nothing but the room, a clock and a drip
a, b = TL['silence']
fm = np.ones(N, np.float32); i0, i1 = int(a * SR), int(b * SR); fm[i0:i1] = 0
fm = np.convolve(fm, np.hanning(int(.12 * SR)) / np.hanning(int(.12 * SR)).sum(), 'same')
music *= fm.astype(np.float32); room *= (1 - .55 * (1 - fm)).astype(np.float32)

# ---------- voice ----------
vox = {}
for k, at in TL['voice'].items():
    x, sr = sf.read(os.path.join(HERE, 'voices', k + '.wav'));
    if x.ndim > 1: x = x.mean(1)
    if sr != SR: x = soxr.resample(x, sr, SR)
    add(voice, x.astype(np.float32), at, 1.0)
voice = compress(voice.astype(np.float64), .2, 3.0).astype(np.float32)

# ---------- balance: voice ~10 dB over the score, music ducks under speech ----------
rms = lambda x: float(np.sqrt(np.mean(x[np.abs(x) > 1e-5] ** 2) + 1e-12))
env = np.abs(voice); env = np.convolve(env, np.ones(int(.12 * SR)) / int(.12 * SR), 'same'); duck = 1 - .5 * np.clip(env * 12, 0, 1)
duck = np.convolve(duck, np.ones(int(.25 * SR)) / int(.25 * SR), 'same').astype(np.float32)
mus = music * duck; fol = foley * (1 - .35 * (duck < .9))
target = rms(voice) * .34
mus *= target / max(rms(music[int(5 * SR):int(20 * SR)]), 1e-6)
fol *= rms(voice) * .5 / max(rms(foley), 1e-6)
rm = room * (rms(voice) * .06 / max(rms(room), 1e-6))
L = mus + fol + rm + voice; R = mus + fol * .9 + rm + voice
bus = lambda x: limit(compress(x.astype(np.float64), .16, 3.5), .55, .005)      # master: tame the peaks so the loudness target is reachable
out = np.stack([bus(L), bus(R)], 1)
pk = np.abs(out).max(); out = out / pk * .7
sf.write(os.path.join(HERE, 'out', 'mix.wav'), out[:int(DUR * SR)], SR, subtype='FLOAT')
print('mix ok', DUR, 'peak', pk)
