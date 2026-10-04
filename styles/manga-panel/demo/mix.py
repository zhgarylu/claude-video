"""Score + foley for "The Last Pineapple Bun": reads out/events.json (the picture's own timeline) and writes out/mix.wav.
100 BPM, A minor pentatonic. Kit, slap bass, shamisen-like pluck, marimba, flute, brass hits; all synthesised with numpy."""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import lfilter

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(LIB, 'core', 'audio'))
import sfx
from sfx import SR, t_, lp, hp, bp, noise, add, thump, norm, step as step_snd

ev_all = json.load(open(os.path.join(HERE, 'out', 'events.json')))
DUR = ev_all['dur']; EV = ev_all['ev']
meta = [e for e in EV if e['type'] == 'meta'][0]
BPM = meta['bpm']; BEAT = 60 / BPM; BAR = BEAT * 4
N = int((DUR + 1.5) * SR)
mtof = lambda m: 440.0 * 2 ** ((m - 69) / 12)
def T(bar, beat=0): return bar * BAR + beat * BEAT
def evt(kind): return [e for e in EV if e['type'] == kind]
HIT = evt('hit')[0]['t']; BELL = evt('bell')[0]['t']

mus = np.zeros((N, 2)); fx = np.zeros((N, 2))
def put(x, t, g=1.0, pan=0.0, to=None): add(mus if to is None else to, x, t, g, pan)

# ---------- instruments ----------
def ks(f, d, decay=.996, bright=.7):
    n = max(2, int(round(SR / f))); L = int(d * SR)
    x = np.zeros(L); x[:n] = lp(noise(n / SR), 2500 + bright * 7000)[:n] if n > 30 else noise(n / SR)[:n]
    a = np.zeros(n + 2); a[0] = 1; a[n] = -decay / 2; a[n + 1] = -decay / 2
    y = lfilter([1], a, x)
    return norm(y) * np.minimum(1, np.arange(L) / (.002 * SR)) * np.exp(-np.arange(L) / (SR * d * .55))
def shamisen(f, d):
    y = ks(f, d, .994, 1.0); y = hp(y, 220) + bp(y, 2400, 5200) * .6
    return norm(np.tanh(y * 1.6)) * .8
def bass(f, d):
    tt = t_(d); saw = 2 * ((tt * f) % 1) - 1
    x = lp(saw * .5, 700) + np.sin(2 * np.pi * f * tt) * .9 + np.sin(2 * np.pi * 2 * f * tt) * .3 + np.sin(2 * np.pi * 3 * f * tt) * .12
    return x * np.exp(-tt / (d * .45)) * np.minimum(1, tt / .005)
def marimba(f, d):
    tt = t_(d); x = np.sin(2 * np.pi * f * tt) + .5 * np.sin(2 * np.pi * 4 * f * tt) * np.exp(-tt / .06) + .15 * np.sin(2 * np.pi * 9.2 * f * tt) * np.exp(-tt / .02)
    return x * np.exp(-tt / .32) * np.minimum(1, tt / .002)
def flute(f, d):
    tt = t_(d); vib = 1 + .006 * np.sin(2 * np.pi * 5.2 * tt) * np.minimum(1, tt / .4)
    ph = np.cumsum(f * vib) / SR
    x = np.sin(2 * np.pi * ph) + .2 * np.sin(4 * np.pi * ph) + bp(noise(d), f * .8, f * 3) * .12
    return x * np.minimum(1, tt / .06) * np.minimum(1, np.maximum(0, (d - tt)) / .12)
def brass(f, d, v=1.0):
    tt = t_(d); x = 0
    for dt in (-.006, 0, .006): x = x + (2 * ((tt * f * (1 + dt)) % 1) - 1)
    x = (lp(x / 3, 2200) * .6 + lp(x / 3, 4200) * .4 * (.4 + .6 * np.exp(-tt / .08)))
    return x * np.minimum(1, tt / .012) * np.exp(-tt / (d * .55)) * v
def pad(f, d):
    tt = t_(d); x = sum(np.sin(2 * np.pi * f * m * tt) * a for m, a in [(1, 1), (2, .4), (3, .2)])
    return x * np.minimum(1, tt / .3) * np.minimum(1, np.maximum(0, (d - tt)) / .6)
def kick(v=1):
    d = .32; tt = t_(d); f = 48 + 90 * np.exp(-tt / .03)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .1) + hp(noise(d), 2000) * np.exp(-tt / .004) * .3) * v
def snare(v=1):
    d = .25; tt = t_(d); return (bp(noise(d), 1500, 7000) * np.exp(-tt / .07) + np.sin(2 * np.pi * 190 * tt) * np.exp(-tt / .05) * .6) * v
def rim(v=1):
    d = .09; tt = t_(d); return (np.sin(2 * np.pi * 1750 * tt) * np.exp(-tt / .012) + hp(noise(d), 3000) * np.exp(-tt / .006) * .6) * v
def block(v=1):
    d = .1; tt = t_(d); return (np.sin(2 * np.pi * 820 * tt) * np.exp(-tt / .018) + np.sin(2 * np.pi * 1390 * tt) * np.exp(-tt / .012) * .5) * .8 * v
def hat(v=1, o=False):
    d = .22 if o else .05; return hp(noise(d), 7000) * np.exp(-t_(d) / (.08 if o else .015)) * v
def crash(v=1):
    d = 1.8; return hp(noise(d), 4000) * np.exp(-t_(d) / .6) * v

# ---------- score ----------
ROOTS = [45, 45, 50, 52]           # Am Am Dm Em
RIFF = [(0, 69, .5), (.5, 72, .5), (1, 74, .5), (1.5, 76, .5), (2, 79, .75), (3, 76, .5), (3.5, 74, .5)]
RIFF2 = [(0, 76, .5), (.5, 74, .5), (1, 72, 1), (2, 69, .5), (2.5, 72, .5), (3, 74, 1)]
GAG = [(0, 72, .25), (.5, 76, .25), (1, 79, .25), (1.5, 76, .25), (2, 74, .5), (3, 69, .5)]

def kit(b, kind):
    t0 = T(b)
    if kind == 'groove':
        for bt in (0, 1.5, 2.5): put(kick(), t0 + bt * BEAT, .95)
        for bt in (1, 3): put(snare(), t0 + bt * BEAT, .7); put(rim(), t0 + bt * BEAT, .35)
        for i in range(8): put(hat(1, o=(i == 7)), t0 + i * .5 * BEAT, .2 if i % 2 else .28, .25)
    if kind == 'light':
        put(kick(.8), t0, .8)
        for bt in (1, 3): put(rim(), t0 + bt * BEAT, .6)
        for i in range(4): put(block(), t0 + (i + .5) * BEAT, .22, -.2)
    if kind == 'half':
        put(kick(), t0, .9); put(rim(), t0 + 2 * BEAT, .7)
def bassline(b, sparse=False):
    r = ROOTS[b % 4]; t0 = T(b)
    pat = [(0, r, 1.5), (2, r + 7, 1.5)] if sparse else [(0, r, .9), (1.5, r, .4), (2, r + 7, .9), (3, r + 5 if b % 2 else r + 12, .9)]
    for bt, m, d in pat: put(bass(mtof(m), d * BEAT), t0 + bt * BEAT, .8, -.1)
def notes(b, nts, inst, g=.5, pan=.2):
    for bt, m, d in nts:
        if inst == 'sham': put(shamisen(mtof(m), max(.3, d * BEAT * 2)), T(b, bt), g, pan)
        else: put(marimba(mtof(m + 12), d * BEAT * 3), T(b, bt), g, -pan)
def stab(t, chord, g=.6, d=.35):
    for m in chord: put(brass(mtof(m), d), t, g * .45, .1)

for b in range(0, 3):                       # title
    kit(b, 'half' if b == 0 else 'groove')
    if b >= 1: bassline(b)
    if b == 1: notes(1, RIFF, 'sham', .55)
    if b == 2: notes(2, RIFF2, 'sham', .55)
put(crash(.4), T(0), .35); stab(T(0), [57, 64, 69], .6, .5)
for b in range(3, 9):                       # page 1
    kit(b, 'groove'); bassline(b); notes(b, RIFF if b % 2 else RIFF2, 'sham', .5)
    if b == 3: stab(T(3), [57, 60, 64, 69], .8, .4); put(crash(.45), T(3), .4)
    if b == 5: stab(T(5), [57, 60, 64, 69], .7, .3)
for i in range(16): put(hat(1), T(7, 2) + i * .25 * BEAT, .18, .3)           # D: the sprint
for i, m in enumerate([57, 60, 62, 64, 67, 69, 72, 74]): put(shamisen(mtof(m), .4), T(8, i * .5), .5, .2)
for b in range(9, 12): kit(b, 'light'); bassline(b, sparse=True)               # E and F
for b in (9, 10): notes(b, GAG if b == 9 else RIFF2, 'mar', .5)
notes(11, [(0, 69, .5), (.5, 69, .5), (1, 72, .5), (1.5, 72, .5), (2, 74, .5), (2.5, 74, .5), (3, 76, .5)], 'sham', .5)
kit(12, 'light'); bassline(12, sparse=True); notes(12, [(0, 69, 1), (2, 72, 1)], 'sham', .45)   # G
t_roll = T(13); nroll = int((HIT - .3 - t_roll) / (.25 * BEAT))
for i in range(nroll): put(snare(), t_roll + i * .25 * BEAT, .18 + .6 * i / max(1, nroll - 1))
for i, (m, d) in enumerate([(69, 1.6), (72, 1.6), (74, 1.6), (72, 2.4)]): put(flute(mtof(m + 12), d), T(15, 2) + i * 1.5 * BEAT, .28, .15)   # H
for b in (15, 16, 17):
    for i, m in enumerate([57, 64, 69, 64, 60, 67, 72, 67]): put(marimba(mtof(m + 12), 1.0), T(b, i * .5) + (BEAT if b == 15 else 0), .3, -.15)
    put(bass(mtof(ROOTS[b % 4]), 1.8), T(b), .55, -.1)
put(pad(mtof(57), 5), T(15, 1), .12)
for m in [57, 64, 69, 72, 76]: put(marimba(mtof(m + 12), 3), BELL + .05, .22, .1)   # end
put(pad(mtof(45), 7), BELL, .2); put(bass(mtof(45), 3), BELL, .7); put(shamisen(mtof(57), 2.5), BELL + .1, .4, .2)

# ---------- foley from the picture's events ----------
def whoosh_(d, f0, f1):
    n = noise(d); tt = t_(d); out = np.zeros_like(n); stepn = 480
    for i in range(0, len(n), stepn):
        hi = min(len(n), i + stepn); f = f0 + (f1 - f0) * i / len(n)
        out[i:hi] = bp(n[max(0, i - 2000):hi], f * .7, f * 1.35)[-(hi - i):]
    return norm(out * np.sin(np.pi * tt / d) ** 1.2)
def scratch():
    d = .22; tt = t_(d); n = bp(noise(d), 2500, 7500); mod = 0.5 + 0.5 * np.sin(2 * np.pi * 90 * tt * (1 + tt)); return norm(n * mod * np.sin(np.pi * tt / d) ** .6) * .8
def burnish():
    d = .3; tt = t_(d); return norm(bp(noise(d), 600, 2500) * (0.6 + .4 * np.sin(2 * np.pi * 28 * tt)) * np.sin(np.pi * tt / d)) * .6
def paper_flick(d=.5): return norm(hp(noise(d), 1500) * np.exp(-t_(d) / .09) + bp(noise(d), 500, 3000) * np.exp(-t_(d) / .2) * .4) * .7
def stamp(v=1.0):
    d = .3; tt = t_(d); return norm(bp(noise(d), 200, 3000) * np.exp(-tt / .03) + np.sin(2 * np.pi * 90 * tt * (1 - .3 * tt)) * np.exp(-tt / .1)) * v
def shop_bell(f=2637):
    d = 2.4; tt = t_(d); return sum(a * np.sin(2 * np.pi * f * m * tt) * np.exp(-tt / tau) for m, a, tau in [(1, 1, .9), (2.76, .5, .5), (5.4, .25, .25)]) * np.minimum(1, tt / .002)

wc = 0
for e in EV:
    t = e['t']; ty = e['type']
    if ty == 'reveal': put(scratch(), t, .55, to=fx); put(burnish(), t + .05, .35, to=fx); put(rim(), t + .04, .35, to=fx)
    elif ty == 'pop': put(block(), t, .4, .1, to=fx)
    elif ty == 'word':
        if e['text'] == '嗖': put(whoosh_(.6, 500, 3600), t - .15, .8, to=fx); put(stamp(.8), t, .6, to=fx)
        else:
            for k in range(4): put(stamp(.9), t + k * .17, .55, -.2 + .15 * k, to=fx)
            put(whoosh_(1.0, 300, 2000), t, .4, to=fx)
    elif ty == 'hit':
        put(rim(1.0), t, 1.0, to=fx); put(thump(1.0, 55), t, 1.0, to=fx); put(stamp(1.0), t, .9, to=fx); put(kick(), t, 1.0, to=fx); put(crash(.7), t, .5, to=fx)
        stab(t, [57, 64, 69, 76], .6, .5)
    elif ty == 'fold': put(paper_flick(.7), t - .02, .7, to=fx); put(whoosh_(e['d'], 400, 1800), t, .45, to=fx)
    elif ty == 'move': put(whoosh_(max(.4, e['d']), 350, 1700), t, .3, to=fx)
    elif ty == 'step': put(step_snd(e['v']), t, .5 * e['v'], .2 if wc % 2 else -.2, to=fx); wc += 1
    elif ty == 'swish': put(whoosh_(.4, 800, 1500), t, .12, to=fx)
    elif ty == 'bell': put(shop_bell(), t, .55, .1, to=fx); put(shop_bell(3136), t + .02, .3, -.1, to=fx)
rt = lp(noise(N / SR), 600)[:N] * 0.012
fx[:, 0] += rt; fx[:, 1] += rt[::-1]

# ---------- balance ----------
echo = np.zeros_like(mus); d1 = int(.16 * SR); echo[d1:] += mus[:-d1] * .18
mus = mus + echo
gain = np.ones(N); fx_g = np.ones(N)
for e in evt('quiet'):
    a = int(e['t'] * SR); b = int((e['t'] + e['d']) * SR); r = int(.02 * SR)
    gain[a - r:a] *= np.linspace(1, 0, r); gain[a:b] = 0; gain[b:b + r] *= np.linspace(0, 1, r); fx_g[a:b] = 0.0
for e in evt('word') + evt('reveal'):
    a = int(e['t'] * SR); n = int(.25 * SR)
    if a < N: gain[a:a + n] *= np.linspace(.75, 1, min(n, N - a))
mus *= gain[:, None]; fx *= fx_g[:, None]
tail = np.ones(N); a = int((DUR - 5) * SR); tail[a:] = np.linspace(1, 0, N - a) ** 1.5
mus *= tail[:, None]
mix = np.tanh((mus * .5 + fx * 1.0) * .9)
mix = np.stack([sfx.limit(sfx.compress(mix[:, c], thr=.3, ratio=3), ceil=.5) for c in (0, 1)], 1)
mix = mix[: int(DUR * SR) + 1]
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print('mix.wav', len(mix) / SR, 's, peak', float(np.abs(mix).max()))
