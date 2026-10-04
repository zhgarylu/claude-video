"""mix.py: score + sand foley for the sand-animation demo -> out/mix.wav (stereo 48 kHz), out/music.wav, score.json.
Everything is synthesised with numpy (no samples). 72 BPM, 4/4, D Dorian. Timeline comes from events.json (window.EV)."""
import json, os, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(os.path.join(HERE, 'events.json')))
DUR = ev['dur']; EV = ev['ev']
BAR = 240 / 72; B0 = 0.4; EIGHTH = BAR / 8; BEAT = BAR / 4
bar = lambda k: B0 + (k - 1) * BAR
N = int((DUR + 1.0) * SR)
rng = np.random.default_rng(5)

def T(d): return np.arange(int(round(d * SR))) / SR
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def mf(m): return 440.0 * 2 ** ((m - 69) / 12)

def put(buf, x, t, g=1.0, pan=0.0):
    i = int(round(t * SR)); n = min(len(x), buf.shape[1] - i)
    if n <= 0 or i < 0: return
    a = (pan + 1) * np.pi / 4
    buf[0, i:i + n] += x[:n] * g * np.cos(a); buf[1, i:i + n] += x[:n] * g * np.sin(a)

# ---- instruments ----
def handpan(m, v=1.0, d=2.6):
    t = T(d); f = mf(m); env = np.exp(-t / 1.0) * (1 - np.exp(-t / 0.004))
    x = np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * 2.0 * f * t) * np.exp(-t / .5) + .22 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t / .3) + .08 * np.sin(2 * np.pi * 4.2 * f * t) * np.exp(-t / .15)
    tick = hp(noise(.02), 1500) * np.exp(-T(.02) / .003) * .05
    x = x * env; x[:len(tick)] += tick
    return x * v * .5
def kalimba(m, v=1.0, d=1.8):
    t = T(d); f = mf(m); env = np.exp(-t / .7) * (1 - np.exp(-t / .002))
    x = np.sin(2 * np.pi * f * t) + .28 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t / .07) + .1 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / .3)
    return x * env * v * .45
def glass(m, d, v=1.0, att=1.4, rel=1.8):
    n = int((d + rel) * SR); t = np.arange(n) / SR; f = mf(m)
    x = sum(np.sin(2 * np.pi * f * k * t + p) * a for k, a, p in [(1, 1, 0), (1.003, .7, 1.3), (.997, .7, 2.1), (2, .22, .5), (3.01, .06, 0)])
    env = np.minimum(1, t / att) ** 1.5 * np.where(t > d, np.exp(-(t - d) / (rel / 4)), 1)
    return x * env * v * .22
def flute(m, d, v=1.0, att=.18, rel=.6):
    n = int((d + rel) * SR); t = np.arange(n) / SR; f = mf(m)
    vib = 1 + .006 * np.minimum(1, t / .6) * np.sin(2 * np.pi * 5.2 * t)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    x = np.sin(ph) + .18 * np.sin(2 * ph) + .05 * np.sin(3 * ph) + .22 * bp(noise(d + rel), f * .8, f * 3.5) * 1.0
    env = np.minimum(1, t / att) * np.where(t > d, np.exp(-(t - d) / (rel / 4)), 1)
    return x * env * v * .3
def vibes(m, d, v=1.0, att=.7, rel=2.4):
    n = int((d + rel) * SR); t = np.arange(n) / SR; f = mf(m)
    x = np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / .6) + .08 * np.sin(2 * np.pi * 10 * f * t) * np.exp(-t / .2)
    env = np.minimum(1, t / att) ** 1.3 * np.where(t > d, np.exp(-(t - d) / (rel / 4)), 1) * (1 + .3 * np.sin(2 * np.pi * 5 * t))
    return x * env * v * .3
def drum(v=1.0):
    t = T(.35); x = lp(noise(.35), 500) * np.exp(-t / .07) * .6 + np.sin(2 * np.pi * 85 * t * (1 + .3 * np.exp(-t / .03))) * np.exp(-t / .12) * .5
    return x * v
def brush(v=1.0, d=.22):
    t = T(d); return bp(noise(d), 2200, 7000) * (np.minimum(1, t / .03) * np.exp(-t / .07)) * v * .5

music = np.zeros((2, N)); foley = np.zeros((2, N)); score = []
def note(inst, name, t, *a, g=1.0, pan=0.0, **k):
    put(music, inst(*a, **k), t, g, pan); score.append({'t': round(t, 4), 'inst': name, 'args': [round(float(x), 3) for x in a if isinstance(x, (int, float))]})

D, E, F, G, A, B, C = 2, 4, 5, 7, 9, 11, 0
d3, a3, d4, e4, f4, g4, a4, c5, d5, a2, e3 = 50, 57, 62, 64, 65, 67, 69, 72, 74, 45, 52
# ---- score ----
note(handpan, 'handpan', bar(1), d4, 1.0, g=1.0, pan=-.1)                                   # first grain: one note, then near silence
for k, (ms, cd) in enumerate([((d3, a3, e4, f4), 2.0)]):
    pass
note(glass, 'glass', bar(2) + .6, d3, BAR + 1.2, g=.8, pan=-.2); note(glass, 'glass', bar(2) + .6, a3, BAR + 1.2, g=.7, pan=.2)
PAT = [d3, a3, d4, e4, f4, e4, d4, a3]
chords = {3: (d3, a3, e4, f4), 5: (g4 - 12, d4, a4 - 12, 59), 6: (d3, a3, f4, c5 - 12 + 12), 9: (d3, a3, e4, f4), 11: (a2 + 5, d4, g4, 59), 12: (g4 - 24, d4, a4 - 12, 59), 14: (d3, a3, f4, a4), 15: (d3, a3, e4, f4), 17: (d3, a3, d4, a4)}
def chord(k, nbars, g=1.0):
    for j, m in enumerate(chords[k]): note(glass, 'glass', bar(k) + .05 * j, m, nbars * BAR - .3, g=g * (.8 if j % 2 else 1), pan=(-.4, .4, -.2, .2)[j % 4], att=1.6)
# bars 3-5: handpan arpeggio, glass chords
chord(3, 2, .9); chord(5, 1, .9)
for b in (3, 4, 5):
    for i, m in enumerate(PAT): note(handpan, 'handpan', bar(b) + i * EIGHTH, m + (12 if (b == 5 and i in (2, 6)) else 0), .55 + (.35 if i % 4 == 0 else 0), g=.9, pan=-.3 + .08 * i)
# bars 6-7: kalimba bird melody, sparse handpan, glass; bar 8: gated silence to 25.5
chord(6, 2, .8)
MEL = [(0, a4), (2, c5), (3, d5), (4, a4), (6, g4), (8, a4), (10, c5), (11, e4 + 12), (12, d5), (14, a4), (16, f4 + 12), (18, e4 + 12), (20, d5), (22, c5), (24, a4)]
for e, m in MEL[:13]: note(kalimba, 'kalimba', bar(6) + e * EIGHTH * .5 * 2 if False else bar(6) + e * EIGHTH, m, .6 + .3 * ((e % 4) == 0), g=.9, pan=.25)
for b in (6, 7):
    for i in (0, 4): note(handpan, 'handpan', bar(b) + i * EIGHTH, (d3, a3)[i // 4], .7, g=.8)
note(kalimba, 'kalimba', 25.5, 81, .8, g=.9, pan=.1)                                    # first sound after the silence
note(glass, 'glass', 25.5, d3, bar(9) - 25.5 + .5, g=.7, att=1.0)
# bars 9-11: sea blue; handpan, brushes, kalimba echoes
chord(9, 2, .9); chord(11, 1, .9)
for b in (9, 10, 11):
    for i, m in enumerate(PAT): note(handpan, 'handpan', bar(b) + i * EIGHTH, m - (12 if (b == 10 and i in (0, 4)) else 0), .5 + (.35 if i % 4 == 0 else 0), g=.85, pan=.3 - .08 * i)
    for i in (1, 3, 5, 7): put(music, brush(.7), bar(b) + i * EIGHTH, .5, .1 * (i - 4))
for b in (9, 10, 11, 12):
    put(music, drum(.8), bar(b), .7); put(music, drum(.5), bar(b) + 2 * BEAT, .6)
for e, m in [(2, a4), (5, d5), (10, c5), (14, a4), (18, g4), (21, a4)]: note(kalimba, 'kalimba', bar(10) + e * EIGHTH, m + 12, .45, g=.6, pan=-.35)
# bars 12-13: lighthouse, flute long notes; bar 14 gated silence to 45.5
chord(12, 2, .9)
note(flute, 'flute', bar(12) + .1, a4, BAR * .9, g=1.0, pan=-.1); note(flute, 'flute', bar(12) + BAR + .05, f4 + 12 - 12 + 12 - 12 + 0, BAR * .45, g=.95)
note(flute, 'flute', bar(12) + BAR * 1.5, d5, BAR * .5 - .05, g=.95, pan=.1)
for b in (12, 13): note(handpan, 'handpan', bar(b), d3, .8, g=.9); note(handpan, 'handpan', bar(b) + 2 * BEAT, a3, .6, g=.8)
note(flute, 'flute', 45.5, a4, 3.0, g=1.0, pan=0.0)                                      # one note after the silence
note(glass, 'glass', 45.5, d3, bar(15) - 45.5 + .4, g=.7, att=.8)
# bars 15-17+: home. vibraphone, sparse handpan, long end
for j, (m, dd) in enumerate([(d4, 1.9 * BAR), (a3, 1.9 * BAR), (f4, 1.2 * BAR)]): note(vibes, 'vibes', bar(15) + .1 * j, m, dd, g=.9, pan=(-.3, .3, 0)[j])
for i, m in enumerate([d3, a3, d4, a3, e4, a3, f4, a3]): note(handpan, 'handpan', bar(16) + i * EIGHTH, m, .4 + (.3 if i % 2 == 0 else 0), g=.65, pan=-.2 + .05 * i)
for j, m in enumerate([d3, a3, d4, e4]): note(vibes, 'vibes', bar(17) + .08 * j, m, DUR - bar(17) - 2.8, att=1.6, rel=2.8, g=.9, pan=(-.3, .3, 0, .2)[j])
note(handpan, 'handpan', bar(17) + 1.0, d4, .5, g=.7)

# ---- reverb on music, then gate ----
ir_t = T(2.8); IR = [noise(2.8) * np.exp(-ir_t / .9) for _ in (0, 1)]
IR = [lp(hp(x, 200), 5500) for x in IR]
wet = np.stack([fftconvolve(music[c], IR[c] / np.abs(IR[c]).sum() * 6)[:N] for c in (0, 1)])
music = music * .8 + wet * .55
gate = np.ones(N)
for a, b in [(bar(8), 25.5 - .03), (bar(14), 45.5 - .03)]:
    i0, i1 = int(a * SR), int(b * SR); gate[i0:i1] = 0
    f = int(.35 * SR); gate[i0 - f:i0] = np.linspace(1, 0, f) ** 1.0 * 1 + 0   # fade into the silence
    gate[i0 - f:i0] = np.linspace(1, 0, f)
music *= gate
tail = np.ones(N); i = int((DUR - 2.0) * SR); tail[i:] = np.linspace(1, 0, N - i); music *= tail

# ---- sand foley ----
bell = lambda p: np.sin(np.pi * np.clip(p, 0, 1)) ** 1.4
def swish(t0, t1, g, pan=0.0):
    d = t1 - t0; n = int(round(d * SR)); t = np.arange(n) / SR; p = t / d; w = noise(d)
    lo, mid, hi = bp(w, 700, 1700), bp(w, 1700, 3400), bp(w, 3400, 7500)
    a_lo, a_mid, a_hi = np.clip(1 - 2 * p, 0, 1), 1 - np.abs(2 * p - 1), np.clip(2 * p - 1, 0, 1)
    x = (lo * (.5 + a_lo) + mid * (.4 + a_mid) + hi * (.15 + .7 * a_hi)) * bell(p)
    # grain ticks, density follows the moving grains
    tk = np.zeros(n); rate = 380 * bell(p)
    for i in np.nonzero(rng.random(n) < rate / SR)[0]:
        c = hp(noise(.006), 3500) * np.exp(-T(.006) / .0012); m = min(len(c), n - i); tk[i:i + m] += c[:m] * rng.uniform(.3, 1.0)
    put(foley, (x * .6 + tk * .9) * g, t0, 1.0, pan)
def pour(t0, t1, g):
    d = t1 - t0; n = int(round(d * SR)); t = np.arange(n) / SR; p = t / d; w = noise(d)
    x = bp(w, 2500, 9000) * np.minimum(1, p * 6) * (.6 + .6 * p) * np.where(p > .93, np.exp(-(p - .93) * 40), 1)
    x2 = bp(w, 4500, 6500) * np.minimum(1, p * 6) * (p ** 1.5) * np.where(p > .93, np.exp(-(p - .93) * 40), 1)
    tk = np.zeros(n)
    for i in np.nonzero(rng.random(n) < (60 + 300 * p) / SR)[0]:
        c = hp(noise(.005), 4000) * np.exp(-T(.005) / .001); m = min(len(c), n - i); tk[i:i + m] += c[:m] * rng.uniform(.3, 1)
    put(foley, (x * .45 + x2 * .5 + tk * .6) * g, t0, 1.0, 0.0)
for e in EV:
    if e['type'] == 'pour': pour(e['t'], e['t1'], .9)
    elif e['type'] == 'sweep': swish(e['t'], e['t1'], .9, pan=(-.35, .35, -.2, .2, 0)[e['n'] % 5])
# the last sweep drains: add a low breath
last = [e for e in EV if e['type'] == 'sweep'][-1]
d = last['t1'] - last['t']; w = lp(noise(d), 900) * bell(T(d) / d) * .5; put(foley, w, last['t'], .8)
# room tone
rt = lp(noise(DUR + 1), 260) * .02; foley[0] += rt[:N]; foley[1] += rt[:N][::-1]

foley = np.stack([lp(foley[0], 8500, 4), lp(foley[1], 8500, 4)])   # no near-Nyquist grain ticks: they make the AAC encoder overshoot by 6 dB
def rms(x): return float(np.sqrt(np.mean(x ** 2)) + 1e-12)
mus, fol = music, foley
mus *= .09 / rms(mus[:, int(7 * SR):int(52 * SR)]) * 1.0
fol *= .07 / rms(fol[:, int(8 * SR):int(52 * SR)]) * 1.0
mix = mus + fol
# tame the grain-tick transients: soft limiter, then peak at -4 dBFS
mix = np.stack([lp(mix[0], 11000, 4), lp(mix[1], 11000, 4)])   # grain ticks near Nyquist overshoot between samples: roll off before limiting
knee = 3.0 * rms(mix[:, int(8 * SR):int(52 * SR)])
mix = np.tanh(mix / knee) * knee
mix *= .55 / np.abs(mix).max()
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.T.astype('float32'), SR)
sf.write(os.path.join(HERE, 'out', 'music.wav'), mus.T.astype('float32'), SR)
json.dump({'bpm': 72, 'bar0': B0, 'bar': BAR, 'gates': [[bar(8), 25.5], [bar(14), 45.5]], 'cues': score, 'sweeps': [[e['t'], e['t1']] for e in EV if e['type'] == 'sweep']}, open(os.path.join(HERE, 'score.json'), 'w'))
print('mix', mix.shape, 'peak', float(np.abs(mix).max()), 'notes', len(score))
