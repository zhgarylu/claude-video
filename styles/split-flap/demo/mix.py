"""Foley, score and voice -> mix.wav for "The Long Way Round" (split-flap board).
The flap clatter is derived from events.json: one click per flap landing, so the density of the sound is the number of cells
that flip. Everything is synthesised in numpy (no samples). Reads events.json (core/render/events.mjs), timeline.json, voices/.
usage: .venv/bin/python styles/split-flap/demo/mix.py
"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
from scipy.signal import fftconvolve
from scipy.ndimage import maximum_filter1d, uniform_filter1d
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, bp, lp, hp

TL = json.load(open(os.path.join(HERE, 'timeline.json')))
EVJ = json.load(open(os.path.join(HERE, 'events.json')))
EV = EVJ['ev']; T, MU, VO = TL['T'], TL['MUSIC'], TL['VO']; DUR = TL['DUR']; BEAT, BAR = TL['BEAT'], TL['BAR']
N = int(DUR * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(78)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def tv(d): return np.arange(int(round(d * SR))) / SR
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def add(buf, x, at, gain=1.0, pan=0.0):
    s = int(round(at * SR))
    if s >= len(buf) or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[s:e, 0] += x[:e - s] * gain * l * 1.414; buf[s:e, 1] += x[:e - s] * gain * r * 1.414
def ramp(a, b, fa=.3, fb=.3): return np.clip((tt - a) / fa, 0, 1) * np.clip((b - tt) / fb, 0, 1)

# ----------------------------------------------------------------- the flap: a bank of click variants
def click(kind):
    d = .06; t = tv(d); n = len(t)
    scale = {'flap': 1.0, 'cap': 1.45, 'tick': 0.8}[kind]
    f1 = rng.uniform(1800, 4200) * scale
    x = bp(noise(d), f1 * .7, min(f1 * 1.7, 20000)) * np.exp(-t / (.0022 / scale ** .5))
    x += np.sin(2 * np.pi * rng.uniform(650, 1100) * scale * t + rng.random() * 6) * np.exp(-t / (.007 / scale ** .5)) * .55   # the card
    x += np.sin(2 * np.pi * rng.uniform(150, 230) * t) * np.exp(-t / .012) * (.38 if kind != 'cap' else .12)                       # the stop
    if kind == 'tick':   # close, dry, a little metal from the case
        x += (np.sin(2 * np.pi * 2480 * t) * .25 + np.sin(2 * np.pi * 3790 * t) * .17) * np.exp(-t / .03)
        x += np.sin(2 * np.pi * 95 * t) * np.exp(-t / .02) * .5
    x[:int(.0004 * SR)] *= np.linspace(0, 1, int(.0004 * SR))
    return x / np.abs(x).max()
BANK = {k: [click(k) for _ in range(48)] for k in ('flap', 'cap', 'tick')}
h01 = lambda x: (np.sin(x * 127.1 + 311.7) * 43758.5453) % 1

# sections where the hall is gone (we are inside the case)
inside = ramp(T['open0'] + .05, T['close0'] + .2, .25, .25)
raw = {k: np.zeros((N, 2)) for k in ('flap', 'cap', 'tick')}
for e in EV:
    k = e['type']
    if k not in raw: continue
    i = int(h01(e['n'] * 3.7 + e['t'] * 11.3) * 48) % 48
    g = {'flap': .060, 'cap': .020, 'tick': .55}[k] * (.65 + .35 * h01(e['t'] * 91 + e['n']))
    add(raw[k], BANK[k][i], e['t'] - .0008, g, e.get('x', 0) * .9)
# hall on the room's flaps
irn = int(1.7 * SR); irx = np.arange(irn) / SR
ir = lp(noise(1.7), 5200) * np.exp(-irx / .42); ir[:int(.018 * SR)] = 0; k0, k1 = int(.018 * SR), int(.03 * SR); ir[k0:k1] *= np.linspace(0, 1, k1 - k0); ir /= np.sqrt((ir ** 2).sum())
room_src = (raw['flap'] + raw['cap'])
hall = np.stack([fftconvolve(room_src[:, c], ir * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1) * .55
flaps_room = (raw['flap'] + raw['cap'] * 1.0) * (1 - .0 * inside[:, None]) + hall * (1 - inside)[:, None]
flaps_room = np.stack([sfx.compress(flaps_room[:, c], .02, 3.5, .01, .15) for c in (0, 1)], 1)
ticks = raw['tick']

# ----------------------------------------------------------------- one-off sounds
fx = np.zeros((N, 2)); wet = np.zeros((N, 2))
def thump(f=70, d=.4, tau=.1): t = tv(d); return np.sin(2 * np.pi * f * np.exp(-t * 3) * t * 1.0 + 0) * np.exp(-t / tau)
def bell(f, d=1.6, tau=.5, v=1.0):
    t = tv(d); return v * sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (tau * s)) for m, a, s in [(1, 1, 1), (2.01, .35, .6), (2.76, .25, .35), (5.4, .12, .2), (8.9, .06, .12)])
for e in EV:
    k, t0 = e['type'], e['t']
    if k == 'power':       # relay clunk, a transformer whine that rises with the first cells
        cl = np.pad(hp(noise(.03), 1500) * np.exp(-tv(.03) / .005), (0, int(.47 * SR))); add(fx, thump(60, .5, .12) * .9 + cl * .5, t0, .5)
        t = tv(1.6); w = np.sin(2 * np.pi * np.cumsum(120 + 500 * (t / 1.6) ** 2) / SR) * np.clip(t / .3, 0, 1) * np.exp(-t / 1.1) * .12
        add(fx, w, t0 + .1, 1.0, 0)
    elif k == 'shutter':   # the gap opens (or closes): a low whomp and metal sliding
        d = .8; t = tv(d); sl = bp(noise(d), 300, 3000) * np.sin(np.pi * t / d) ** 2 * .35
        w = thump(48, d, .22) * .9 + lp(noise(d), 260) * np.sin(np.pi * t / d) * .5 + sl
        if e['dir'] < 0: w = w[::-1] * 1.0; add(fx, thump(55, .4, .1) * .8, t0 + d - .05, 1.0)
        add(fx, w, t0 if e['dir'] > 0 else t0 - .1, .85)
    elif k == 'pawl':      # the pawl says no
        t = tv(.5); x = (np.sin(2 * np.pi * 3130 * t) * .6 + np.sin(2 * np.pi * 4720 * t) * .4 + np.sin(2 * np.pi * 6100 * t) * .2) * np.exp(-t / .07)
        x += hp(noise(.5), 2000) * np.exp(-t / .002) * .8
        add(fx, x, t0, .55, .1)
    elif k == 'thunk':     # the long fall lands
        t = tv(.8); x = np.sin(2 * np.pi * 70 * t) * np.exp(-t / .18) + (np.sin(2 * np.pi * 2480 * t) * .25 + np.sin(2 * np.pi * 3790 * t) * .2) * np.exp(-t / .12) + hp(noise(.8), 1500) * np.exp(-t / .003) * .6
        add(fx, x, t0, .8, .15)
    elif k == 'chime':     # station chime, two notes
        add(wet, bell(mtof(88), 2.2, .6), t0, .13, -.1); add(wet, bell(mtof(84), 2.6, .7), t0 + .6, .13, .1)
        add(fx, bell(mtof(88), 2.2, .6) * .3, t0, .06); add(fx, bell(mtof(84), 2.6, .7) * .3, t0 + .6, .06)
    elif k == 'relay':
        t = tv(.12); x = (hp(noise(.12), 900) * np.exp(-t / .004) + np.sin(2 * np.pi * 140 * t) * np.exp(-t / .03)) ; add(fx, x, t0 - .02, .5, .4)
    elif k == 'beat':      # the clock's tock
        t = tv(.12); x = np.sin(2 * np.pi * 1180 * t) * np.exp(-t / .018) * .5 + np.sin(2 * np.pi * 180 * t) * np.exp(-t / .05) * .7; add(fx, x, t0, .22 + .012 * e['n'], 0)
    elif k == 'horn':      # a train horn, two tones, far away
        d = 3.2; t = tv(d); env = np.clip(t / .09, 0, 1) * np.clip((1.9 - t) / .9 + (t < 1.9), 0, 1) * np.exp(-np.maximum(0, t - 1.4) / .9)
        env = np.clip(t / .09, 0, 1) * np.where(t < 1.4, 1, np.exp(-(t - 1.4) / .75))
        x = 0
        for f in (146.8, 185.0):    # D3, F#3
            for dt in (-.4, 0, .5):
                ph = 2 * np.pi * np.cumsum(np.full(len(t), (f + dt))) / SR
                x = x + sum(((2 / (np.pi * k2)) * np.sin(k2 * ph)) for k2 in range(1, 9))
        x = lp(x, 1500, 2) * env * .5
        add(fx, x, t0, .55, -.1); add(wet, x, t0, .5, -.1)
# the wet bus gets the hall too
wetr = np.stack([fftconvolve(wet[:, c], ir * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1) * .8

# ----------------------------------------------------------------- beds: hall air (outside) and the case (inside)
fade_in = np.clip(tt / 2.0, 0, 1)
air = lp(noise(DUR), 420) * .035 + lp(np.cumsum(noise(DUR)) * 2e-4, 60) * .0
hum = sum(a * np.sin(2 * np.pi * 50 * k * tt + k) for k, a in zip((1, 2, 3, 4), (1, .5, .25, .12))) * .008
room = (air + hum) * fade_in * (1 - inside)
case = (lp(noise(DUR), 200) * .05 + np.sin(2 * np.pi * 55 * tt) * .02 + bp(noise(DUR), 2000, 5000) * .004) * inside
# the final seconds: only the room
bed = np.stack([room + case, room + case], 1)

# ----------------------------------------------------------------- score (D dorian, 100 BPM)
def mallet(f, d=1.2, v=1.0):
    t = tv(d); x = (np.sin(2 * np.pi * f * t) * np.exp(-t / .55) + .45 * np.sin(2 * np.pi * f * 3.97 * t + 1) * np.exp(-t / .07) + .15 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t / .03))
    x += hp(noise(d), 2500) * np.exp(-t / .004) * .12
    return x * v * np.clip(t / .002, 0, 1)
def bass(f, d=1.2, v=1.0):
    t = tv(d); env = np.clip(t / .015, 0, 1) * np.exp(-t / (d * .6)) * np.clip((d - t) / .05, 0, 1)
    return (np.sin(2 * np.pi * f * t) + .45 * np.sin(2 * np.pi * 2 * f * t) + .22 * np.sin(2 * np.pi * 3 * f * t)) * env * v
def pad(fs, d, v=1.0, a=1.2, r=1.5):
    t = tv(d); env = np.clip(t / a, 0, 1) * np.clip((d - t) / r, 0, 1); x = 0
    for f in fs:
        for dt in (-.5, 0, .6):
            x = x + ((2 * (((f + dt) * t) % 1) - 1) * .3 + np.sin(2 * np.pi * (f + dt) * t) * .5)
    return lp(x, 1100, 2) * env * v / len(fs)
music = np.zeros((N, 2))
CH = {'Dm': (38, [62, 65, 69, 72]), 'G': (43, [67, 71, 74, 79]), 'C': (36, [64, 67, 72, 76]), 'Am': (45, [69, 72, 76, 81])}
PAT = [0, 2, 1, 3, 0, 2, 3, 1]
def bar_play(t0, ch, vel=.5, arps=True, bassv=.9, beats=(0, 2), every=1):
    root, notes = CH[ch]
    for b in beats: add(music, bass(mtof(root), BEAT * 1.8, bassv), t0 + b * BEAT, .5, 0)
    if arps:
        for i, p in enumerate(PAT):
            if i % every == 0: add(music, mallet(mtof(notes[p]), 1.1, vel * (1 if i % 2 == 0 else .75)), t0 + i * .3, .22, -.3 + .6 * (i % 4) / 3)
# power-on: a dark swell that rises with the flap density
sw = ramp(T['power'] + 2.0, T['fill'], 2.4, .2) * (np.sin(2 * np.pi * 36.7 * tt) * .5 + np.sin(2 * np.pi * 73.4 * tt) * .35)
swr = np.stack([sw * .5, sw * .5], 1); music += swr
# rows: bars 3-4 (Dm), then the dive thins it
bar_play(4.8, 'Dm', .5); bar_play(7.2, 'Dm', .45)
bar_play(9.6, 'Dm', .35, every=2, beats=(0,))
add(music, pad([mtof(50), mtof(57)], 4.6, .5, 1.5, 2.2), 11.7, .35)         # a held D inside the case
# the long fall: a riser, and the low D when it lands
t = tv(T['land'] - T['spin0']); fr = 70 + 150 * (t / t[-1]) ** 2.2
add(music, np.sin(2 * np.pi * np.cumsum(fr) / SR) * (t / t[-1]) ** 1.5 * .5, T['spin0'], .4)
add(music, bass(mtof(26), 2.4, 1.0), T['land'], .8); add(music, pad([mtof(38), mtof(45)], 2.0, .5, .05, 1.5), T['land'], .3)
# back in the hall: delay section
for k, ch in enumerate(['Dm', 'G', 'Dm', 'C', 'Am']):
    bar_play(T['wide'] + k * BAR, ch, .5 if k < 4 else .55)
# countdown: pulse on every beat, arps climbing
for k, ch in enumerate(['Dm', 'C', 'Am']):
    t0 = T['clock'] + k * BAR; root, notes = CH[ch]
    for b in range(4): add(music, bass(mtof(root - 12 + (0 if b % 2 == 0 else 7)), BEAT * .7, .8), t0 + b * BEAT, .45)
    for i, p in enumerate(PAT): add(music, mallet(mtof(notes[p] + 12 * (k > 0)), .8, .5 + .12 * k), t0 + i * .3, .2, -.3 + .6 * (i % 4) / 3)
# zero: a Dm9 stab
for m, a in [(50, 1.0), (57, .8), (65, .7), (76, .6), (62, .7)]: add(music, mallet(mtof(m), 2.0, a), T['zero'], .3, (m - 60) / 40)
add(music, bass(mtof(26), 2.2, 1.0), T['zero'], .7)
# the sentence: one note per word, a D major resolve
quote0, dt = T['quote0'], .15
for k, (idx, m) in enumerate([(0, 62), (5, 66), (9, 69), (14, 74), (19, 78)]):
    add(music, mallet(mtof(m), 1.6, .9), quote0 + idx * dt, .26, -.3 + .15 * k)
last = quote0 + 24 * dt
add(music, pad([mtof(50), mtof(57), mtof(62), mtof(66)], DUR - last + .3, .9, .6, 2.0), last - .1, .5)
add(music, bass(mtof(26), 4.0, 1.0), last - .1, .6)
irm = lp(noise(2.0), 4500) * np.exp(-tv(2.0) / .7); irm /= np.sqrt((irm ** 2).sum())
music = music + np.stack([fftconvolve(music[:, c], irm * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1) * .05
# silences: the case at the end of the first section, the long hush before the board falls
gate = np.ones(N)
for a, b in [(T['open0'] + .6, T['spin0'] - .3), (MU['hush'], T['clear'] - .05)]: gate *= 1 - np.clip(np.minimum((tt - a) / .1, (b - tt) / .05), 0, 1) * ((tt > a) & (tt < b))
music *= gate[:, None]
# the pad inside the case is allowed back in
music += 0
# ----------------------------------------------------------------- voice
voice = np.zeros((N, 2)); vo = np.zeros(N)
for v in VO:
    x, sr = sf.read(os.path.join(HERE, 'voices', v['id'] + '.wav')); x = x if x.ndim == 1 else x.mean(1)
    x = soxr.resample(x, sr, SR).astype(np.float64); x = hp(x, 80, 2)
    x = sfx.compress(x / np.abs(x).max(), .2, 3.5, .004, .09); x /= np.abs(x).max()
    add(voice, x, v['t'], .85, 0); add(wet, x, v['t'], .04)
    i0 = int(v['t'] * SR); vo[i0:i0 + len(x)] = 1
vo = uniform_filter1d(maximum_filter1d(vo, size=int(.35 * SR)), size=int(.2 * SR))
# ----------------------------------------------------------------- mix
mix = (flaps_room * 4.0 * (1 - .5 * vo[:, None]) + ticks * 2.2 * (1 - .3 * vo[:, None]) + fx * (1 - .3 * vo[:, None]) + wetr * .5
       + bed * 3.5 + music * .20 * (1 - .4 * vo[:, None]) + voice * 1.0)
sf.write(os.path.join(HERE, 'out', 'premix.wav'), mix.astype(np.float32), SR)
out = np.zeros_like(mix)
for c in (0, 1):
    x = sfx.compress(mix[:, c], .22, 3.0, .004, .12); k = .3; x = k * np.tanh(x / k); out[:, c] = sfx.limit(x, .3, .005)
sf.write(os.path.join(HERE, 'mix.wav'), out.astype(np.float32), SR)
rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print('mix.wav', DUR, 's | rms dB: flaps %.1f ticks %.1f fx %.1f music %.1f voice %.1f bed %.1f mix %.1f peak %.2f' % (rms(flaps_room), rms(ticks), rms(fx), rms(music), rms(voice[voice != 0]), rms(bed), rms(out), np.abs(out).max()))
if os.environ.get('DIAG'):
    print('  t   flaps ticks  fx  music voice  bed  mix(pre-master) out')
    for a in range(0, int(DUR), 3):
        s = slice(a * SR, (a + 3) * SR)
        print('%3d %6.1f %6.1f %6.1f %6.1f %6.1f %6.1f %6.1f %6.1f' % (a, rms(flaps_room[s]), rms(ticks[s]), rms(fx[s]), rms(music[s]), rms(voice[s]), rms(bed[s]), rms(mix[s]), rms(out[s])))
