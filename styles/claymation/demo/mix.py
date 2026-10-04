"""Proof: score, foley and ambience, all synthesised (numpy/scipy), placed on the timeline in events.json.
Run from the library root:  .venv/bin/python styles/claymation/demo/mix.py   ->  out/mix.wav"""
import json, os, sys
import numpy as np
from scipy.signal import lfilter
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(LIB, 'core', 'audio'))
import sfx
from sfx import SR, t_, noise, bp, lp, hp, env_exp, add, norm

ev = json.load(open(os.path.join(HERE, 'events.json')))
DUR = ev['dur']; EV = ev['ev']
N = int((DUR + .6) * SR)
rng = np.random.default_rng(11)
BEAT = 60 / 84
mf = lambda m: 440 * 2 ** ((m - 69) / 12)

# ---------------- instruments ----------------
def kalimba(m, v=1.):
    f = mf(m); d = 1.6; tt = t_(d)
    x = np.sin(2 * np.pi * f * tt) * np.exp(-tt / .55) + .28 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt / .05) + .1 * np.sin(2 * np.pi * f * 9.2 * tt) * np.exp(-tt / .03)
    x += hp(noise(d), 3000) * np.exp(-tt / .004) * .25
    return x * v * .6

def marimba(m, v=1.):
    f = mf(m); d = 1.1; tt = t_(d)
    x = np.sin(2 * np.pi * f * tt) * np.exp(-tt / .28) + .4 * np.sin(2 * np.pi * f * 4 * tt) * np.exp(-tt / .06) + .12 * np.sin(2 * np.pi * f * 9.9 * tt) * np.exp(-tt / .02)
    x += lp(noise(d), 1200) * np.exp(-tt / .006) * .3
    return x * v * .7

def glock(m, v=1.):
    f = mf(m); d = 2.4; tt = t_(d)
    x = sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / tau) for r, a, tau in [(1, 1, 1.0), (2.76, .35, .5), (5.4, .2, .25), (8.93, .1, .12)])
    return x * v * .45

def ks(m, v=1., bright=.5, decay=.996, d=1.4):
    f = mf(m); n = int(SR / f); L = int(d * SR)
    exc = lp(noise(n / SR), 6000 * bright + 1500)[:n] if n > 8 else noise(n / SR)
    x = np.zeros(L); x[:len(exc)] = exc
    a = np.zeros(n + 2); a[0] = 1; a[n] = -.5 * decay; a[n + 1] = -.5 * decay
    y = lfilter([1.], a, x)
    return norm(y) * v * .6

pizz = lambda m, v=1.: ks(m, v, .25, .994, 1.0)
uke = lambda m, v=1.: ks(m, v, .7, .997, 1.3)

def bassoon(m, d, v=1., m2=None):
    tt = t_(d); f0 = mf(m); f = f0 * (2 ** (((m2 - m) / 12) * np.clip(tt / d, 0, 1) ** 1.5) if m2 is not None else 1)
    vib = 1 + .006 * np.sin(2 * np.pi * 5.2 * tt) * np.clip(tt / .4, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    x = sum(np.sin(k * ph) / k ** .9 for k in range(1, 14))
    x = bp(x, 180, 1800) + lp(noise(d), 1600) * .05
    e = np.minimum(1, tt / .09) * np.minimum(1, (d - tt) / .12)
    return x * e * v * .5

def pad(m, d, v=1.):
    tt = t_(d); f = mf(m)
    x = (np.sin(2 * np.pi * f * tt) + .4 * np.sin(2 * np.pi * f * 2.003 * tt) + .15 * np.sin(2 * np.pi * f * 3 * tt)) * np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 1.5
    return lp(x, 1800) * v * .5

# ---------------- foley ----------------
def squelch(d=.5, v=1., lo=380):
    tt = t_(d); x = lp(noise(d), 900) * np.exp(-tt / .12) * .8
    for k in range(7):
        a = rng.random() * d * .6; f0 = lo * (.8 + rng.random() * .6); L = int(.07 * SR); q = np.arange(L) / SR
        b = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 2.2 * q / .07)) / SR) * np.exp(-q / .02) * (.3 + rng.random() * .4)
        s = int(a * SR); x[s:s + L] += b[:len(x) - s]
    return norm(x) * v

def press(v=1.): return norm(lp(noise(.3), 1500) * np.exp(-t_(.3) / .06) + np.sin(2 * np.pi * 120 * t_(.3) * (1 - .4 * t_(.3))) * np.exp(-t_(.3) / .08)) * v
def dentpop(v=1.):
    d = .25; tt = t_(d); f = 160 + 700 * (tt / d) ** .6
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .06) + lp(noise(d), 1800) * np.exp(-tt / .02) * .6) * v
def squeak(d=1., f0=700, f1=1100, v=1.):
    tt = t_(d); f = f0 + (f1 - f0) * tt / d + 40 * np.sin(2 * np.pi * 9 * tt)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + .4 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    am = (.5 + .5 * np.sin(2 * np.pi * 14 * tt + 1)) ** 1.5 * np.sin(np.pi * tt / d) ** .7
    return lp(x * am, 3200) * v * .3
def whoosh(d=.8, v=1., lo=150, hi=900):
    tt = t_(d); x = bp(noise(d), lo, hi) * np.sin(np.pi * tt / d) ** 1.6; return norm(x) * v
def drag(d=2.6, v=1.):
    tt = t_(d); x = lp(noise(d), 380) * (np.linspace(.15, 1, len(tt)) ** 2) * (1 + .5 * np.sin(2 * np.pi * 3.2 * tt)); return norm(x) * v
def boing(d=.8, v=1.):
    tt = t_(d); f = 170 + 420 * np.clip(tt / .25, 0, 1) - 150 * np.clip((tt - .25) / .55, 0, 1)
    x = np.sin(2 * np.pi * np.cumsum(f * (1 + .03 * np.sin(2 * np.pi * 14 * tt))) / SR) * np.exp(-tt / .35); return norm(x) * v
def thud(v=1.): return norm(np.sin(2 * np.pi * 85 * t_(.4) * (1 - .35 * t_(.4))) * np.exp(-t_(.4) / .09) + lp(noise(.4), 500) * np.exp(-t_(.4) / .03) * .6) * v
def tick(v=1.):
    d = .05; tt = t_(d); return norm(bp(noise(d), 2200, 6000) * np.exp(-tt / .003) + np.sin(2 * np.pi * 1700 * tt) * np.exp(-tt / .008) * .5) * v
def chirp(f0=3200, v=1.):
    d = .14; tt = t_(d); f = f0 * (1 + .35 * np.sin(2 * np.pi * 14 * tt)) + 900 * tt / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) ** 2 * v * .12
def puff(v=1.):
    d = 1.2; tt = t_(d); return norm(hp(noise(d), 900) * np.exp(-tt / .25) * (1 - np.exp(-tt / .012)) + lp(noise(d), 500) * np.exp(-tt / .12) * .5) * v

# ---------------- buses ----------------
music = np.zeros((N, 2)); fol = np.zeros((N, 2)); bed = np.zeros((N, 2))
def Mn(inst, m, t, v, pan=0.): add(music, inst(m, v), t, 1., pan)

# A: worry (kalimba, a soft pad)
for t, m, v in [(.6, 74, .5), (1.3, 69, .45), (2.0, 77, .5), (3.5, 74, .45), (4.2, 72, .4), (5.0, 69, .4)]: Mn(kalimba, m, t, v, -.2)
for m in (50, 57): add(music, pad(m, 6.4, .5), 0, .5, 0)
# B: the night; arpeggio gathers, ticks speed up, the first light
arp = [62, 65, 69, 72, 69, 65]
for i in range(int((16 - 6.2) / (BEAT / 2))):
    t = 6.2 + i * BEAT / 2; v = .25 + .4 * (t - 6) / 10
    Mn(kalimba, arp[i % 6], t, v, -.3 + .6 * ((i % 6) / 5))
    if i % 2 == 0: Mn(pizz, [50, 57][(i // 2) % 2], t, v * .9, 0)
for i, m in enumerate([74, 72, 69, 65, 74, 72, 69, 65]): Mn(marimba, m, 12.0 + i * BEAT * 1.0, .4, .3)
for t in (13.7, 14.5, 15.0, 15.6): add(bed, chirp(3000 + rng.random() * 800, 1.), t, 1., rng.random() - .5)
# C: two tries to rise (bassoon strains, slumps)
add(music, bassoon(57, 1.45, .8, 62), 17.0, 1., .1); add(music, bassoon(62, .9, .7, 50), 18.5, 1., .1)
Mn(uke, 62, 19.5, .5, -.2); Mn(uke, 65, 19.9, .5, -.1)
add(music, bassoon(60, 1.5, .85, 64), 20.0, 1., .1); add(music, bassoon(64, 1.0, .7, 50), 21.9, 1., .1)
Mn(uke, 69, 23.0, .5, 0); Mn(kalimba, 74, 23.35, .5, 0)
# D: the finger comes: ostinato crescendo, a low drone
for i in range(int((28.6 - 24.4) / BEAT)): Mn(pizz, 69, 24.4 + i * BEAT, .15 + .6 * i / 6, .2)
add(music, bassoon(50, 3.0, .55), 25.6, 1., 0)
for m in (50, 57): add(music, pad(m, 4.6, .55), 24.1, 1., 0)
# E: after the silence a single bell, a crouch, the rise (D major)
Mn(glock, 81, 34.5, .55); Mn(glock, 78, 35.3, .4); Mn(marimba, 69, 35.75, .5); Mn(marimba, 74, 36.05, .6)
mel = [74, 78, 81, 78, 76, 74, 71, 69]
for i in range(int((41.35 - 36.5) / (BEAT / 2))):
    t = 36.5 + i * BEAT / 2; Mn(marimba, mel[i % 8], t, .55 + .15 * ((i % 8) == 0), -.3 + .6 * (i % 8) / 7)
chords = [[62, 66, 69], [62, 67, 71], [64, 69, 73], [62, 66, 69]]
for b in range(4):
    t0 = 36.5 + b * 4 * BEAT
    if t0 > 41.3: break
    for j, m in enumerate(chords[b]): Mn(uke, m, t0 + j * .03, .35, -.4 + j * .2)
    Mn(pizz, [50, 55, 57, 50][b], t0, .8); Mn(pizz, [57, 62, 64, 57][b], t0 + 2 * BEAT, .6); Mn(glock, mel[0] + 12, t0, .3)
for i in range(7): add(fol, press(.6), 36.5 + BEAT * (1 + 2 * i), .35, .2)
# F: the puff and the bake
for i, m in enumerate([74, 78, 81, 86, 90]): Mn(glock, m, 41.4 + i * .09, .5)
# G: the loaf, birds, warmth
ch = [[62, 66, 69, 74], [67, 71, 74, 79], [64, 69, 73, 76], [62, 66, 69, 74]]
for b in range(4):
    t0 = 42.5 + b * 4 * BEAT * .8
    for j, m in enumerate(ch[b]): Mn(marimba, m, t0 + j * BEAT * .5, .45, -.3 + .2 * j)
for t, m in [(43.2, 81), (44.0, 78), (44.9, 74), (45.7, 78)]: Mn(kalimba, m, t, .5, .3)
for m in (50, 57, 66): add(music, pad(m, 4.5, .5), 42.4, 1., 0)
for t in (43.0, 43.7, 44.6, 45.3): add(bed, chirp(3300 + rng.random() * 600), t, 1., rng.random() - .5)
# H: pull-out: the title lands, the last chord rings
for t, m, v in [(46.6, 74, .6), (47.3, 78, .5), (48.0, 81, .55), (48.85, 86, .6)]: Mn(glock, m, t, v, 0)
Mn(pizz, 50, 46.6, .9); Mn(pizz, 57, 48.85, .8)
for m in (50, 57, 62, 66, 69): add(music, pad(m, 4.6, .6), 46.2, 1., 0)

# clock ticks: once a second, then racing through the night, then gone
tt_ = 0.4
while tt_ < 23.7:
    rate = 1.0 if tt_ < 6.1 else (1.0 + 7.5 * min(1, (tt_ - 6.1) / 9.9) if tt_ < 16 else 1.0)
    add(bed, tick(.35 if tt_ >= 6.1 and tt_ < 16 else .5), tt_, .12, .6 if int(tt_ * 2) % 2 else .5); tt_ += 1 / rate

# foley from the timeline
for e in EV:
    t, ty, d = e['t'], e['type'], e.get('dur', 1)
    if ty == 'plate': add(fol, press(.8), t, .45, 0); add(fol, thud(.4), t + .05, .3, 0)
    elif ty == 'unplate': add(fol, whoosh(.3, .5, 300, 2500), t, .3, 0)
    elif ty == 'blink': add(fol, sfx.click(1.8, .5), t + .1, .22, 0)
    elif ty == 'wipe': add(fol, whoosh(.9, 1, 120, 1400), t, .55, 0); add(fol, squelch(.6, .8), t + .15, .3, 0)
    elif ty == 'strain': add(fol, squeak(d, 640, 980, 1), t, .5, 0)
    elif ty == 'slump': add(fol, squelch(.5, 1), t, .5, 0); add(fol, thud(.7), t + .05, .5, 0)
    elif ty == 'finger_in': add(fol, drag(d, 1), t, .55, .3); add(fol, whoosh(d, .5, 80, 500), t, .3, .2)
    elif ty == 'press': add(fol, squelch(.8, 1., 300), t, .9, .1); add(fol, press(1), t, .7, .1)
    elif ty == 'press_hold': add(fol, squeak(1.2, 480, 420, .6), t + .1, .35, .1)
    elif ty == 'release': add(fol, dentpop(1), t, .9, .1); add(fol, squelch(.6, .7, 420), t + .05, .5, .1)
    elif ty == 'finger_out': add(fol, whoosh(d, .8, 100, 700), t, .45, .3)
    elif ty == 'crouch': add(fol, squelch(.35, .8, 500), t, .5, 0)
    elif ty == 'rise': add(fol, boing(.9, 1), t, .75, 0); add(fol, squeak(d, 400, 900, 1), t, .3, 0)
    elif ty == 'land': add(fol, thud(1), t, .8, 0); add(fol, squelch(.5, .8, 450), t, .5, 0)
    elif ty == 'puff': add(fol, puff(1), t, .8, 0)
    elif ty == 'bake_ding': add(fol, sfx.ding(.7), t, .35, 0)

# bed: kitchen room tone (brown noise) + a soft studio hush at the end
rt = sfx.lp(noise(DUR + .6), 380) * .05 + sfx.hp(noise(DUR + .6), 5000) * .003
bed[:, 0] += rt; bed[:, 1] += rt * .97
dawn = np.clip((np.arange(N) / SR - 14) / 4, 0, 1) * .6   # a little more air as the day arrives
hush = sfx.bp(noise(DUR + .6), 600, 2400) * .006 * dawn; bed[:, 0] += hush; bed[:, 1] += hush

# silences: the score and the sparse foley drop out; room tone stays
gate = np.ones(N)
for s0, s1 in [(28.6, 30.2), (31.4, 33.8)]:
    a, b = int((s0 - .06) * SR), int(s1 * SR); gate[a:int(s0 * SR)] = np.linspace(1, 0, int(s0 * SR) - a); gate[int(s0 * SR):b] = 0
    r = int((s1 + .05) * SR); gate[b:r] = np.linspace(0, 1, r - b)
music *= gate[:, None]
bed[:, :] *= (.25 + .75 * gate)[:, None]   # the clock stops ticking too
# keep the poke squelch audible inside silence 2 only until it has decayed
out = music * .62 + fol * .9 + bed * 1.0
for c in (0, 1): out[:, c] = sfx.limit(sfx.compress(out[:, c], .35, 2.5), .9)
fade = np.ones(N); fl = int(.7 * SR); fade[int(DUR * SR) - fl:int(DUR * SR)] = np.linspace(1, 0, fl); fade[int(DUR * SR):] = 0
out *= fade[:, None]
out = out[:int(DUR * SR) + int(.05 * SR)]
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), out.astype(np.float32), SR)
print('mix.wav', len(out) / SR, 's, peak', float(np.abs(out).max()))
