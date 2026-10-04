"""Score + foley for "Butter Side Down": reads out/events.json (the picture's own timeline) and writes out/mix.wav.
Brass pop-jazz and surf guitar, all synthesised with numpy (no downloads)."""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import lfilter

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(LIB, 'core', 'audio'))
import sfx
from sfx import SR, t_, env_exp, lp, hp, bp, noise, add, thump, whoosh, pop, creak, norm

ev_all = json.load(open(os.path.join(HERE, 'out', 'events.json')))
DUR = ev_all['dur']; EV = ev_all['ev']
meta = [e for e in EV if e['type'] == 'meta'][0]
BPM = meta['bpm']; BEAT = 60 / BPM; BAR = BEAT * 4
N = int((DUR + 1.0) * SR)
rng = np.random.default_rng(11)
mtof = lambda m: 440.0 * 2 ** ((m - 69) / 12)
def T(bar, beat=0): return bar * BAR + beat * BEAT

mus = np.zeros((N, 2)); fx = np.zeros((N, 2))

# ---------- instruments ----------
def ks(f, d, decay=.997, bright=.55):
    """plucked string: noise burst through a feedback comb (Karplus-Strong via lfilter)"""
    n = max(2, int(round(SR / f))); L = int(d * SR)
    x = np.zeros(L); burst = lp(noise(n / SR), 2500 + bright * 6000)[:n] if n > 30 else noise(n / SR)[:n]
    x[:n] = burst * 1.0
    a = np.zeros(n + 2); a[0] = 1; a[n] = -decay / 2; a[n + 1] = -decay / 2
    y = lfilter([1], a, x)
    return norm(y) * np.minimum(1, np.arange(L) / (.004 * SR)) * np.exp(-np.arange(L) / (SR * d * .8))
def guitar(f, d, tw=1.0):
    y = ks(f, d) * 1.0
    y = hp(y, 180) + bp(y, 1800, 3200) * .5 * tw   # twang
    return norm(np.tanh(y * 2.2)) * .8
def bass(f, d):
    tt = t_(d); saw = 2 * ((tt * f) % 1) - 1
    x = lp(saw * .5, 600) + np.sin(2 * np.pi * f * tt) * .9 + np.sin(2 * np.pi * 2 * f * tt) * .25 + np.sin(2 * np.pi * 3 * f * tt) * .12
    return x * np.exp(-tt / (d * .5)) * np.minimum(1, tt / .006)
def brass(f, d, v=1.0):
    tt = t_(d); x = 0
    for dt in (-.006, 0, .006):
        x = x + (2 * ((tt * f * (1 + dt)) % 1) - 1)
    x = (lp(x / 3, 2200) * .6 + lp(x / 3, 4200) * .4 * (.4 + .6 * np.exp(-tt / .08))) * (1 + .08 * np.sin(2 * np.pi * 5.5 * tt))
    e = np.minimum(1, tt / .018) * np.exp(-tt / (d * .55)); return x * e * v
def vibes(f, d):
    tt = t_(d); x = np.sin(2 * np.pi * f * tt) + .35 * np.sin(2 * np.pi * 4 * f * tt) * np.exp(-tt / .15) + .15 * np.sin(2 * np.pi * 10 * f * tt) * np.exp(-tt / .05)
    return x * np.exp(-tt / 0.7) * (1 + .2 * np.sin(2 * np.pi * 5 * tt)) * np.minimum(1, tt / .003)
def organ(f, d):
    tt = t_(d); x = sum(a * np.sin(2 * np.pi * f * m * tt) for m, a in [(1, 1), (2, .7), (3, .5), (4, .3), (6, .2)])
    return x * np.minimum(1, tt / .15) * np.minimum(1, (d - tt) / .3) * (1 + .15 * np.sin(2 * np.pi * 6 * tt))
def kick(v=1):
    d = .32; tt = t_(d); f = 48 + 90 * np.exp(-tt / .03)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .1) + hp(noise(d), 2000) * np.exp(-tt / .004) * .3) * v
def snare(v=1):
    d = .25; tt = t_(d)
    return (bp(noise(d), 1500, 7000) * np.exp(-tt / .07) + np.sin(2 * np.pi * 190 * tt) * np.exp(-tt / .05) * .6) * v
def stick(v=1):
    d = .08; tt = t_(d); return (np.sin(2 * np.pi * 1700 * tt) * np.exp(-tt / .012) + hp(noise(d), 3000) * np.exp(-tt / .006) * .6) * v
def hat(v=1, o=False):
    d = .22 if o else .05; return hp(noise(d), 7000) * np.exp(-t_(d) / (.08 if o else .015)) * v
def tom(f, v=1):
    d = .35; tt = t_(d); return np.sin(2 * np.pi * f * (1 - .25 * tt) * tt) * np.exp(-tt / .12) * v + hp(noise(d), 1500) * np.exp(-tt / .01) * .2 * v
def crash(v=1):
    d = 1.6; return hp(noise(d), 4000) * np.exp(-t_(d) / .5) * v

def put(x, t, g=1.0, pan=0.0, to=mus): add(to, x, t, g, pan)

CH1 = {0: [57, 60, 64, 69], 1: [57, 60, 64, 69], 2: [53, 57, 60, 65], 3: [52, 56, 59, 64]}
RT1 = {0: 45, 1: 45, 2: 41, 3: 40}
CH2 = {0: [60, 64, 67, 72], 1: [60, 64, 67, 72], 2: [60, 65, 69, 72], 3: [59, 62, 67, 71]}
RT2 = {0: 36, 1: 36, 2: 41, 3: 43}
SURF1 = [(0, 69, .5), (.5, 72, .5), (1, 76, .5), (1.5, 72, .5), (2, 77, .5), (2.5, 76, .5), (3, 72, .5), (3.5, 68, .5)]   # A harmonic minor
SURF2 = [(0, 76, 1), (1, 72, .5), (1.5, 69, .5), (2, 71, 1), (3, 68, 1)]
SURF3 = [(0, 72, .5), (.5, 76, .5), (1, 79, .5), (1.5, 76, .5), (2, 74, .5), (2.5, 72, .5), (3, 67, 1)]   # page 2, C major

def walking_bass(b, roots, sync=True):
    r = roots[b % 4]; t0 = T(b)
    pat = [(0, r, .9), (1.5, r, .4), (2, r + 7, .9), (3, r + 12 if b % 2 else r + 5, .9)] if sync else [(0, r, 1.8), (2, r + 7, 1.8)]
    for bt, m, d in pat: put(bass(mtof(m), d * BEAT), t0 + bt * BEAT, .8, -.1)
def drums(b, kind):
    t0 = T(b)
    if kind in ('full', 'half'):
        ks_ = [0, 2.5] if kind == 'full' else [0]
        for bt in ks_: put(kick(), t0 + bt * BEAT, 1.0)
        for bt in ([1, 3] if kind == 'full' else [2]): put(snare(), t0 + bt * BEAT, .8)
        for i in range(8): put(hat(1, o=(i % 4 == 3)), t0 + i * .5 * BEAT, .22 if i % 2 else .3, .25)
    if kind == 'stick':
        for bt in (0, 2): put(kick(.8), t0 + bt * BEAT, .8)
        for bt in (1, 3): put(stick(), t0 + bt * BEAT, .7)
        for i in range(8): put(hat(1), t0 + i * .5 * BEAT, .14, .25)
    if kind == 'roll':   # snare roll, crescendo
        for i in range(16): put(snare(), t0 + i * .25 * BEAT, .25 + .6 * i / 15)
        put(kick(), t0, .9); put(kick(), t0 + 2 * BEAT, .9)
    if kind == 'toms':
        for i, f in enumerate([180, 160, 140, 120, 100, 90, 80, 70]): put(tom(f), t0 + (2 + i * .25) * BEAT, .8, -.5 + i * .14)
        put(kick(), t0, .9); put(snare(), t0 + BEAT, .6)
def stab(b, beat, chord, g=.6, d=.35):
    for m in chord: put(brass(mtof(m), d), T(b, beat), g * .5, .1)
def melody(b, notes, voice='gtr', g=.55, trem=False):
    for bt, m, d in notes:
        if voice == 'gtr':
            if trem and d >= 1:
                for k in range(int(d * 4)): put(guitar(mtof(m), .22), T(b, bt + k * .25), g * .7, .2)
            else: put(guitar(mtof(m), d * BEAT * 1.6), T(b, bt), g, .2)
        else: put(vibes(mtof(m + 12), d * BEAT * 2.2), T(b, bt), g, -.2)

# ---------- score by bar ----------
for b in range(0, 22):
    page2 = b >= 13
    ch, rt = (CH2, RT2) if page2 else (CH1, RT1)
    if b in (0, 1): drums(b, 'half' if b == 0 else 'full'); walking_bass(b, rt)
    if b == 0: stab(0, 1, ch[0], .5, .3)
    if b == 1: stab(1, 0, ch[1], .6, .4); melody(1, SURF2, 'gtr', .5)
    if b == 2: drums(b, 'roll'); walking_bass(b, rt, False); put(bass(mtof(40), 1.0 * BEAT), T(2, 3), .6)
    if b in (3, 4):
        drums(b, 'full'); walking_bass(b, rt); melody(b, SURF1 if b == 3 else SURF2 + [(3.5, 72, .5)], 'gtr', .55)
        if b == 3: stab(3, 0, ch[3], .9, .5); put(crash(.5), T(3), .6)
    if b == 5: drums(b, 'half'); walking_bass(b, rt, False); melody(5, [(0, 69, 2), (2, 72, 2)], 'gtr', .5, trem=True)
    if b == 6: drums(b, 'toms'); walking_bass(b, rt, False); put(bass(mtof(40), .5), T(6, 3), .7)
    if b in (7, 8, 9, 10):
        drums(b, 'stick'); walking_bass(b, rt)
        melody(b, SURF1 if b % 2 else SURF2, 'vib', .55)
        if b == 7: stab(7, 0, ch[3], .8, .4); put(crash(.4), T(7), .5)
    if b == 11:   # cover: tense organ, question
        for m in [57, 60, 63, 69]: put(organ(mtof(m), 2 * BAR), T(11, 1), .16, 0)
        stab(11, 0, [57, 60, 63, 69], .7, .5); put(bass(mtof(45), 2 * BEAT), T(11, 1), .6)
    if b == 12:
        for m in [56, 59, 62, 68]: put(organ(mtof(m), 1 * BAR + .2), T(12, 0), .14, 0)
        for i, m in enumerate([69, 71, 72, 76]): put(vibes(mtof(m + 12), 1.2), T(12, 2 + i * .5), .6, -.2 + i * .1)
        put(snare(.6), T(12, 3), .3)
    if 13 <= b <= 17:
        drums(b, 'full'); walking_bass(b, rt)
        melody(b, SURF3 if b % 2 else SURF2, 'gtr', .55)
        if b == 13: stab(13, 0, ch[0], .9, .5); put(crash(.5), T(13), .6)
        if b == 15:   # TA-DA fanfare
            for i, (bt, root) in enumerate([(.2, 67), (.7, 67), (1.2, 72)]): stab(15, bt, [root - 7, root - 3, root, root + 4], .8, .55 if i == 2 else .22)
    if b in (18, 19):   # push-in: stripped
        drums(b, 'stick'); walking_bass(b, rt, False)
        melody(b, SURF3 if b == 18 else [(0, 72, 1), (1, 74, 1), (2, 76, 1), (3, 79, 1)], 'vib', .5)
        if b == 18: put(crash(.25), T(18), .3)
    if b == 20:
        drums(b, 'toms'); walking_bass(b, rt, False)
        put(bass(mtof(43), 1.0 * BEAT), T(20, 2.5), .7)
    if b == 21:   # tag after the crunch
        stab(21, 0, [60, 64, 67, 72], .9, 1.8); put(guitar(mtof(48), 2.2), T(21), .8); put(bass(mtof(36), 2.2), T(21), .8); put(crash(.6), T(21), .7)
        put(kick(), T(21), 1.0)
        for m in [64, 67, 72, 76]: put(vibes(mtof(m + 12), 2.0), T(21, .5), .4)

# ---------- foley ----------
def splat():
    d = .45; tt = t_(d); x = lp(noise(d), 1400) * np.exp(-tt / .06) + hp(noise(d), 2500) * np.exp(-tt / .015) * .5
    return norm(x) * .9
def swish(d, f0, f1):
    n = noise(d); tt = t_(d); out = np.zeros_like(n); step = 480
    for i in range(0, len(n), step):
        hi = min(len(n), i + step); f = f0 + (f1 - f0) * i / len(n)
        out[i:hi] = bp(n[max(0, i - 2000):hi], f * .7, f * 1.35)[-(hi - i):]
    return norm(out * np.sin(np.pi * tt / d) ** 1.2)
def boing():
    d = .6; tt = t_(d); f = 220 * (1 + .9 * np.sin(2 * np.pi * 3.2 * tt) * np.exp(-tt / .25) + 0.3); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .25) * .8
def crunch():
    out = np.zeros(int(.7 * SR))
    for k in range(6):
        s = int(k * .075 * SR); c = hp(noise(.07), 1500 + 600 * k) * np.exp(-t_(.07) / .012) + lp(noise(.07), 500) * np.exp(-t_(.07) / .02) * .6
        out[s:s + len(c)] += c[:len(out) - s] * (1 - k * .08)
    return norm(out)
def pageslap(v=1):
    d = .3; tt = t_(d); return norm(bp(noise(d), 250, 3500) * np.exp(-tt / .04) + np.sin(2 * np.pi * 85 * tt * (1 - .3 * tt)) * np.exp(-tt / .09)) * v
def glass(f=2093):
    d = 1.4; tt = t_(d); return sum(a * np.sin(2 * np.pi * f * m * tt) * np.exp(-tt / tau) for m, a, tau in [(1, 1, .5), (2.76, .5, .3), (5.4, .25, .15)])
def wood():
    d = .1; tt = t_(d); return (np.sin(2 * np.pi * 820 * tt) * np.exp(-tt / .018) + np.sin(2 * np.pi * 1390 * tt) * np.exp(-tt / .012) * .5) * .8
def question():
    d = .7; tt = t_(d); f = 330 + 260 * np.clip((tt - .3) / .2, 0, 1); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .4) * .6 * np.minimum(1, tt / .01)

splat_sound = splat(); crunch_sound = crunch()
for e in EV:
    t = e['t']
    if e['type'] == 'slam':
        big = e['id'] in ('cov', 'q1', 'p3')
        put(pageslap(1.0 if big else .75), t, .9 if big else .7, to=fx)
        if e['id'] == 'p3': put(thump(1.0, 55), t, 1.0, to=fx)
    elif e['type'] == 'pop':
        put(wood(), t, .5, to=fx)
    elif e['type'] == 'word':
        w = e['text']
        if w == 'FLIP!': put(swish(.7, 500, 3200), t - .25, .8, to=fx)
        elif w == 'SPLAT!': put(splat_sound, t - .1, 1.0, to=fx); put(thump(1.0, 60), t - .1, .9, to=fx)
        elif w == '0.5': put(boing(), t, .6, to=fx)
        elif w == '?!': put(question(), t, .7, to=fx)
        elif w == 'TA-DA!': put(glass(1568), t, .35, to=fx); put(glass(2093), t + .08, .3, to=fx)
        elif w == 'CRUNCH!': put(crunch_sound, t, 1.0, to=fx); put(thump(.8, 90), t, .5, to=fx)
    elif e['type'] == 'move':
        put(swish(max(.4, e['d']), 400, 2200 if e['to'] > 1.2 else 1200), t, .55, to=fx)
    elif e['type'] == 'split':
        put(swish(.5, 300, 1500), t, .5, to=fx); put(glass(1760), t + .45, .35, to=fx)
    elif e['type'] == 'creak': put(creak(.8), t, .5, to=fx)
    elif e['type'] == 'spin': put(swish(e['d'], 600, 1500), t, .22, to=fx)

# ---------- balance: silences, ducking under hits ----------
gain = np.ones(N)
for e in EV:
    if e['type'] in ('slam', 'word'):
        a = int(e['t'] * SR); n = int(.28 * SR)
        if a < N: gain[a:a + n] *= np.linspace(.6, 1, min(n, N - a))
for e in EV:
    if e['type'] == 'quiet':
        a = int(e['t'] * SR); b = int((e['t'] + e['d']) * SR); r = int(.03 * SR)
        gain[a - r:a] *= np.linspace(1, 0, r); gain[a:b] = 0; gain[b:b + r] *= np.linspace(0, 1, r)
mus *= gain[:, None]
# short room (slap echo) on the guitar/vibes bus, plus a soft limiter
echo = np.zeros_like(mus); d1 = int(.18 * SR)
echo[d1:] += mus[:-d1] * .22
mus = mus + echo
mix = mus * .55 + fx * 1.0
mix = np.tanh(mix * .9)
mix = np.stack([sfx.limit(sfx.compress(mix[:, c], thr=.3, ratio=3), ceil=.5) for c in (0, 1)], 1)
mix = mix[: int(DUR * SR) + 1]
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print('mix.wav', len(mix) / SR, 's, peak', float(np.abs(mix).max()))
