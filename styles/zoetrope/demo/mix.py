"""Score + toy foley + voice -> mix.wav for "Nothing Moves". Everything is synthesised in numpy (no samples).
The whir and the slit clicks are generated from the real rotation of the toy (timeline.json SPIN, 120 Hz), so they are in step with the picture.
Reads timeline.json (tools/export_tl.mjs) and voice/*.wav (core/tts/tts.py).   usage: .venv/bin/python styles/zoetrope/demo/mix.py"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
from scipy.signal import fftconvolve
from scipy.ndimage import maximum_filter1d, uniform_filter1d
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, t_, bp, lp, hp, env_exp, norm
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
T, EV, VO, DUR, BEAT, BAR = TL['T'], TL['EV'], TL['VO'], TL['DUR'], TL['BEAT'], TL['BAR']
N = int(DUR * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(82)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def add(buf, x, at, gain=1.0, pan=0.0):
    s = int(round(at * SR))
    if s >= len(buf) or s + len(x) <= 0: return
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4); x = np.stack([x * l, x * r], 1) * 1.414
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); buf[s:e] += x[:e - s] * gain
def interp(pts): return np.interp(tt, [p[0] for p in pts], [p[1] for p in pts])
def sm(x, ms): return uniform_filter1d(x, size=max(1, int(ms * SR / 1000)))

# ------------------------------------------------------------------ the spin of the toy, from the picture's own table
spin = np.array(TL['SPIN']); ts = np.arange(len(spin)) / 120
sp = np.interp(tt, ts, spin); asp = np.abs(sp)
asp = sm(asp, 8)
F = 12 * asp                                             # slit crossings per second
phase = np.cumsum(F) / SR
cross = np.nonzero(np.diff(np.floor(phase)) > 0)[0]      # sample index of each slit crossing
drum_from = T['curl0']

# ------------------------------------------------------------------ foley sounds
def tick(k=0, wood=True, d=.05):
    x = t_(d); f = 1900 + 140 * (k % 5)
    return norm(hp(noise(d), 2500) * env_exp(d, .0012) * .8 + np.sin(2 * np.pi * f * x) * env_exp(d, .006) * .5 + (np.sin(2 * np.pi * 700 * x) * env_exp(d, .01) * .4 if wood else 0))
def slit_click(k, low):
    d = .02; x = t_(d); p = (.55 if low else 1.0) * (.9 + .2 * ((k * 7) % 5) / 4)
    return norm(bp(noise(d), 1500 * p, 5200 * p, 2) * env_exp(d, .0018) + np.sin(2 * np.pi * 2300 * p * x) * env_exp(d, .003) * .6)
def brass_tink(f=2900, v=1.0, d=.5):
    x = t_(d); return norm(sum(a * np.sin(2 * np.pi * f * m * x) * env_exp(d, tau) for m, a, tau in [(1, 1, .09), (1.51, .5, .05), (2.33, .35, .03), (3.9, .15, .015)]) + hp(noise(d), 4000) * env_exp(d, .002) * .5) * v
def bell(f=520, d=2.4):
    x = t_(d); return norm(sum(a * np.sin(2 * np.pi * f * m * x) * env_exp(d, tau) for m, a, tau in [(1, 1, .9), (2.4, .6, .5), (3.9, .4, .3), (5.7, .2, .15), (.5, .5, 1.2)]))
def paper(d=.6, lo=500, hi=5000):
    e = np.sin(np.pi * t_(d) / d) ** 2; return norm(bp(noise(d), lo, hi, 2) * e) * .8
def flap(d=.05): return norm(bp(noise(d), 900, 3200) * np.sin(np.pi * t_(d) / d) ** 1.5 + hp(noise(d), 3500) * env_exp(d, .004) * .3)
def scrape(d=1.5):
    x = t_(d); e = np.sin(np.pi * x / d) ** 1.3 * (.7 + .3 * np.sin(2 * np.pi * 7 * x))
    return norm(bp(noise(d), 350, 1900, 2) * e + lp(noise(d), 120) * e * .6)
def thud(d=.5, f=62):
    x = t_(d); return norm(np.sin(2 * np.pi * f * x * (1 + .3 * np.exp(-x / .05))) * env_exp(d, .12) + lp(noise(d), 400) * env_exp(d, .03) * .5)
def creak(d=.9):
    x = t_(d); f0 = 110 + 30 * np.sin(2 * np.pi * 1.3 * x)
    saw = 2 * ((np.cumsum(f0) / SR) % 1) - 1
    return norm(bp(saw, 500, 2600) * (np.abs(np.sin(2 * np.pi * 17 * x)) ** 3) * np.sin(np.pi * x / d))

fo = np.zeros((N, 2))
# slit clicks: one per crossing, level follows the speed; wooden and lower once the drum turns
rate_gain = lambda f: .05 + .22 * np.clip(f / 24, 0, 1)
for j, i in enumerate(cross):
    f = F[i]
    if f < .4: continue
    low = i / SR >= drum_from
    add(fo, slit_click(j, low), i / SR, rate_gain(f) * (1.3 if low else 1.0), pan=.15 * np.sin(j))
# whir and air of the turning toy
a_ = np.clip(asp / 2.0, 0, 1.4)
def band(lo, hi, o=2): return bp(noise(DUR), lo, hi, o)
b1, b2, b3 = lp(noise(DUR), 220, 2), band(300, 1100), band(1200, 4200)
whir = (b1 * .5 * a_ ** .6 + b2 * .35 * a_ ** 1.2 + b3 * .12 * a_ ** 2.0)
f_tone = 62 + 52 * asp; ph_t = np.cumsum(f_tone) / SR
hum = np.sin(2 * np.pi * ph_t) * .035 * np.clip(asp / 1.2, 0, 1) + np.sin(2 * np.pi * ph_t * 2.01 + 1) * .012 * np.clip(asp / 1.2, 0, 1)
low_bed = np.where(tt >= drum_from, 1.0, 0.0); low_bed = sm(low_bed, 300)
whir = lp(whir, 5000) * (1 - .25 * low_bed)
fo += np.stack([whir, np.roll(whir, 30)], 1) * .55 + np.stack([hum, hum], 1)
# the events
for e in EV:
    tp = e['type']; t0 = e['t']
    if tp == 'pin': add(fo, brass_tink(3100, .9), t0 - .02, .5); add(fo, paper(.35, 300, 1800), t0, .35); add(fo, thud(.25, 150), t0, .12)
    if tp == 'slide': add(fo, scrape(1.6), t0 - .1, .5, pan=.3); add(fo, brass_tink(2300, .6), t0 + 1.35, .2, .3)
    if tp == 'dial': add(fo, brass_tink(2500, .5, .3), t0, .12, .7)
    if tp == 'stop': add(fo, tick(2, True), t0, .55); add(fo, brass_tink(2700, .6, .3), t0 + .01, .22); add(fo, thud(.3, 140), t0, .15)
    if tp == 'unroll':
        for k in range(12): add(fo, tick(k, False), t0 + .1 + k * .06, .28, -.4 + .07 * k)
        add(fo, paper(2.0, 400, 5200), t0 + .1, .55, 0); add(fo, paper(.6, 300, 3000), t0 + 2.1, .4)
    if tp == 'curl': add(fo, creak(1.5), t0 + .1, .35); add(fo, paper(1.5, 200, 2500), t0, .35)
    if tp == 'sleeve': add(fo, scrape(.9), t0 - .2, .6); add(fo, thud(.7, 58), t0 + .8, .6); add(fo, bell(520, 2.6), t0 + .8, .28); add(fo, brass_tink(2000, .8), t0 + .8, .25)
for k in range(12): add(fo, flap(), T['flip0'] + .08 + k * .055, .3, -.5 + .09 * k)             # the cards flip one after another
for k in range(12): add(fo, tick(k, False, .03), T['lift'] + .02 * k, .15)                         # the cards come away from the disc
# ------------------------------------------------------------------ room tone, the candle, a distant clock
room = lp(noise(DUR), 260, 2) * .014 + lp(noise(DUR), 1800, 2) * .0025
room = np.stack([room, np.roll(room, 80)], 1)
for tc in np.cumsum(rng.exponential(.35, 400)):
    if tc < DUR: add(room, hp(noise(.01), 2500) * env_exp(.01, .002) * rng.uniform(.2, 1), tc, .018 * rng.uniform(.3, 1), rng.uniform(-.7, .7))
flick = .6 + .4 * sm(np.abs(noise(DUR)), 120) * 10
room[:, 0] *= 1; room += 0
for k in range(1, 4): add(fo, tick(1, True, .06), BAR * k + .1, .09)                                 # clock, once a bar, in the first silence

# ------------------------------------------------------------------ the score: music box, reed organ, soft bass, wood ticks (96 BPM waltz, E minor / G major)
def warp(t):                                  # the run-down: after bar 24 the clockwork slows
    t0 = BAR * 24
    if t <= t0: return t, 0.0
    u = t - t0; return t0 + u + 0.018 * u * u, min(1.6, 0.05 * u * u)      # (time, semitones down)
def tine(m, d=1.6, v=1.0, semi=0.0):
    f = mtof(m - semi); x = t_(d)
    a = np.sin(2 * np.pi * f * x) * env_exp(d, .55) + .42 * np.sin(2 * np.pi * f * 2.76 * x) * env_exp(d, .22) + .2 * np.sin(2 * np.pi * f * 5.4 * x) * env_exp(d, .08) + .1 * np.sin(2 * np.pi * f * 1.5 * x) * env_exp(d, .3)
    a = a + hp(noise(d), 5000) * env_exp(d, .0025) * .25
    a[:int(.0015 * SR)] *= np.linspace(0, 1, int(.0015 * SR))
    return norm(a) * v
def reed(m, d, v=1.0):
    f = mtof(m); x = t_(d)
    s = sum(np.sin(2 * np.pi * f * h * x * (1 + .0006 * h * (1 if h % 2 else -1))) / h ** 1.1 for h in range(1, 10))
    e = np.minimum(1, x / .25) * np.minimum(1, (d - x) / .4) * (1 + .12 * np.sin(2 * np.pi * 5.1 * x))
    return norm(lp(s, 1500, 2) * e) * v
def bass(m, d=1.1, v=1.0):
    f = mtof(m); x = t_(d); return norm((np.sin(2 * np.pi * f * x) + .5 * np.sin(2 * np.pi * 2 * f * x) * env_exp(d, .2) + .25 * np.sin(2 * np.pi * 3 * f * x) * env_exp(d, .1)) * env_exp(d, .35)) * v
mus = np.zeros((N, 2))
E = {'Em': (40, [52, 55, 59]), 'C': (36, [48, 55, 60]), 'G': (43, [50, 55, 59]), 'D': (38, [50, 54, 57]), 'Am': (45, [52, 57, 60]), 'B7': (35, [51, 54, 57]), 'Em2': (40, [52, 55, 59])}
A = [('Em', [(0, 76, 1), (1, 71, .5), (1.5, 74, .5), (2, 71, 1)]), ('C', [(0, 72, 1), (1, 76, .5), (1.5, 79, .5), (2, 76, 1)]), ('G', [(0, 74, 1), (1, 71, 1), (2, 67, 1)]), ('D', [(0, 69, 1.5), (1.5, 71, .5), (2, 74, 1)])]
B = [('Em', [(0, 79, 1), (1, 76, .5), (1.5, 74, .5), (2, 76, 1)]), ('Am', [(0, 72, 1), (1, 76, 1), (2, 81, 1)]), ('B7', [(0, 78, 1), (1, 75, .5), (1.5, 78, .5), (2, 83, 1)]), ('Em', [(0, 76, 3)])]
INTRO = [('Em', [(0, 71, 1), (1, 76, 1), (2, 79, 1)])] * 4
def bar_t(b, beat): return warp(b * BAR + beat * BEAT)
def play_phrase(b0, ph, vm=1.0, rev=False, with_bass=True, with_reed=True, voice_oct=0):
    for i, (ch, notes) in enumerate(ph):
        b = b0 + i; root, tri = E[ch]
        ns = notes[::-1] if rev else notes
        for (bt, m, dur) in ns:
            t, semi = bar_t(b, bt)
            if t >= DUR - 1: continue
            add(mus, tine(m + voice_oct, 1.9 if dur >= 1 else 1.0, .7 * vm, semi), t, 1.0, pan=.25 * np.sin(m))
        t, semi = bar_t(b, 0)
        if with_bass: add(mus, bass(root + 12 if root < 40 else root, 1.2, .9), t, 1.0, -.1); t2, _ = bar_t(b, 1); t3, _ = bar_t(b, 2); [add(mus, bass(r_, .5, .22), tx, 1.0, -.1) for r_, tx in [(tri[0] - 12 + 0, t2), (tri[1] - 12, t3)]]
        if with_reed:
            for m in tri: add(mus, reed(m, BAR * 1.05, .20), t, 1.0, 0)
sections = [(4, INTRO, 0.55, False, False, True), (8, A, 1.0, False, True, True), (12, B, 1.0, True, True, True),
            (18, A, 1.0, False, True, True), (22, B, 1.0, False, True, True), (24, A[:4], .9, False, True, True), (26, B[:3], .8, False, True, True)]
for b0, ph, vm, rev, bs, rd in sections: play_phrase(b0, ph, vm, rev, bs, rd)
# bars 14-17 (the camera joins in): thin, repeating high tines over the reed
for b in range(14, 18):
    for i, m in enumerate([76, 83, 76, 83, 79, 83]):
        t, semi = bar_t(b, i * .5); add(mus, tine(m, .9, .5 * (1 + .1 * i), semi), t, 1.0, pan=.4 * np.sin(i + b))
    for m in E['Em'][1]: add(mus, reed(m, BAR * 1.05, .22), b * BAR, 1.0)
    add(mus, bass(40, 1.1, .8), b * BAR, 1.0)
# last tines after the final line
for k, (m, dt) in enumerate([(76, 0), (83, .55), (88, 1.2)]):
    t, semi = T['v11_end'] if False else (VO[-1]['t'] + 2.35 + dt, 1.0); add(mus, tine(m, 2.6, .8, 1.0 + k * 0), t, 1.0, pan=.2)
# wood ticks on the beats, speeding up through the camera scene
for b in range(8, 28):
    for bt in range(3):
        t, _ = bar_t(b, bt)
        if 14 <= b < 18: continue
        add(fo, tick(bt, True), t, .12 if bt else .2)
for k in range(24):                                             # the clockwork catches up: ticks accelerating into the lock
    t = BAR * 14 - .9 + .9 * (k / 24) ** .8; add(fo, tick(k, True), t, .06 + .1 * k / 24)
# gates: two real silences (the first sound after each one is the pin / the last tines)
gate = np.ones(N)
def hush(a, b, fi=.12, fo_=.05):
    ia, ib = int(a * SR), int(b * SR); gate[ia:ib] = 0; gate[max(0, ia - int(fi * SR)):ia] = np.linspace(1, 0, ia - max(0, ia - int(fi * SR))); gate[ib:ib + int(fo_ * SR)] = np.linspace(0, 1, len(gate[ib:ib + int(fo_ * SR)]))
hush(5.8, T['pin'] - .03); hush(T['stopDrum'] + .5, 50.2, .1, .1)
mus *= gate[:, None]
musrev = np.stack([fftconvolve(mus[:, c], (noise(.9) * env_exp(.9, .22))[:int(.9 * SR)] * (1 if c == 0 else -1) * .05)[:N] for c in (0, 1)], 1)
mus = (mus + musrev * .8) * gate[:, None]
mus *= np.clip((tt - TL['MUSIC']['in']) / .5, 0, 1)[:, None]
fo[:, :] *= np.where(((tt > 5.8) & (tt < T['pin'] - .03)) | ((tt > T['stopDrum'] + .5) & (tt < 50.2)), 0.0, 1.0)[:, None]      # the toy is still in the silences
# ------------------------------------------------------------------ voice
voice = np.zeros((N, 2)); vo_env = np.zeros(N)
for v in VO:
    x, sr = sf.read(os.path.join(HERE, 'voice', v['id'] + '.wav')); x = x if x.ndim == 1 else x.mean(1)
    x = soxr.resample(x, sr, SR).astype(np.float64)
    x = hp(x, 90, 2); x = sfx.compress(x / np.abs(x).max(), .22, 3.5, .004, .09); x = x / np.abs(x).max()
    x = x + .08 * np.pad(x, (int(.03 * SR), 0))[:len(x)]
    add(voice, x, v['t'], .85, 0)
    i0 = int(v['t'] * SR); vo_env[i0:i0 + len(x)] = 1
vo_env = uniform_filter1d(maximum_filter1d(vo_env, size=int(.4 * SR)), size=int(.25 * SR))
# ------------------------------------------------------------------ mix
mix = room * 1.0 + fo * (1.0 - .35 * vo_env[:, None]) + mus * .055 * (1 - .5 * vo_env[:, None]) + voice * 1.0
def master(m):
    out = np.zeros_like(m)
    for c in (0, 1):
        x = sfx.compress(m[:, c], .12, 3.0, .005, .2); k = .3; x = k * np.tanh(x / k); out[:, c] = sfx.limit(x, .5, .01)
    return out
mix = master(mix)
sf.write(os.path.join(HERE, 'mix.wav'), mix.astype(np.float32), SR)
rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print('mix.wav %.1fs  rms dB: room %.1f foley %.1f music %.1f voice %.1f mix %.1f' % (DUR, rms(room), rms(fo), rms(mus * .055), rms(voice[voice != 0]), rms(mix)))
def seg(a, b): return rms(mix[int(a * SR):int(b * SR)])
print('silences: %.1f dB (5.9-7.4)  %.1f dB (49.0-50.1)  vs film %.1f dB' % (seg(6.0, 7.4), seg(49.0, 50.1), rms(mix)))
