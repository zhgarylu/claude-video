"""Sound for "Code Walkthrough": editor foley, a calm original loop and the Kokoro voice -> mix.wav. numpy synthesis only, no samples.
Every picture event in events.json (keys, focus slides, pointer ticks, chips, the run ding, the error thud, the diff fold, the theme flip)
is one sound at its frame. The score is a soft electric piano + warm pad + sub bass in four sections that follow the film's turns:
tension (the bug) / curious groove (the trace) / lift (the fix) / calm close. Two near-silences: before the thud, and after "it quits without looking".
usage: .venv/bin/python styles/code-walkthrough/demo/mix.py   (after core/render/events.mjs and the voice)"""
import os, sys, json
import numpy as np, soundfile as sf, soxr
from scipy.signal import fftconvolve
from scipy.ndimage import maximum_filter1d, uniform_filter1d
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, bp, lp, hp
EVJ = json.load(open(os.path.join(HERE, 'events.json'))); EV = EVJ['ev']; DUR = EVJ['dur']
LINES = {l['id']: l for l in json.load(open(os.path.join(HERE, 'lines.json')))}
AT = {'l1': .6, 'l2': 10.9, 'l3': 19.2, 'l4': 26.7, 'l5': 33.8, 'l6': 46.0, 'l7': 50.9, 'l8': 58.3}   # = script.js AT
N = int(DUR * SR); tt = np.arange(N) / SR; rng = np.random.default_rng(95)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def tv(d): return np.arange(int(round(d * SR))) / SR
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def add(buf, x, at, gain=1.0, pan=0.0):
    s = int(round(at * SR))
    if s >= len(buf) or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[s:e, 0] += x[:e - s] * gain * l * 1.414; buf[s:e, 1] += x[:e - s] * gain * r * 1.414
def evs(k): return [e for e in EV if e['type'] == k]

# ---------------------------------------------------------------- foley: soft keys, a quiet room
def key_snd(deep=1.0, v=1.0):
    d = .045; t = tv(d); f = rng.uniform(1900, 3200)
    click = bp(noise(d), f * .6, f * 1.5) * np.exp(-t / .0045)
    thock = np.sin(2 * np.pi * rng.uniform(150, 210) / deep * t) * np.exp(-t / .014) * .55
    return (click * .9 + thock) * np.clip(t / .0005, 0, 1) * v
def tick(f, d=.18, v=1.0):                                       # a glassy marimba-ish tick
    t = tv(d); return (np.sin(2 * np.pi * f * t) * np.exp(-t / (d * .3)) + .25 * np.sin(2 * np.pi * f * 3.97 * t) * np.exp(-t / (d * .08))) * np.clip(t / .001, 0, 1) * v
def bell(f, d=1.6, tau=.45, v=1.0):
    t = tv(d); return v * sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (tau * s)) for m, a, s in [(1, 1, 1), (2.01, .35, .5), (2.76, .22, .3), (5.4, .08, .12)]) * np.clip(t / .002, 0, 1)
def whoosh(d, a, b, v=1.0):
    t = tv(d); n = noise(d); out = np.zeros_like(n)
    for i in range(0, len(n), 480):
        hi_ = min(len(n), i + 480); fr = a + (b - a) * (i / len(n)); out[i:hi_] = bp(n[max(0, i - 2400):hi_], fr * .7, fr * 1.45)[-(hi_ - i):]
    return sfx.norm(out * np.sin(np.pi * t / d) ** 2) * v
def thud(v=1.0):
    d = .9; t = tv(d); f = 52 + 70 * np.exp(-t / .05)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .22); dull = lp(noise(d), 380) * np.exp(-t / .07) * .8
    return (body * 1.0 + dull + 0.25 * np.sin(2 * np.pi * 156 * t) * np.exp(-t / .08)) * np.clip(t / .002, 0, 1) * v
def paper(d, down=True, v=1.0):
    t = tv(d); n = hp(noise(d), 1800) * (np.exp(-t / (d * .35)) if down else (t / d) ** 2) ; return n * v * .5 * np.clip((d - t) / .02, 0, 1)

PEN = [69, 72, 74, 76, 79, 81]        # A minor pentatonic, the tick vocabulary
fx = np.zeros((N, 2)); wet = np.zeros((N, 2)); keys = np.zeros((N, 2))
ptr_note = {'lo': 76, 'hi': 79, 'mid': 72}
for e in EV:
    k, t0, v = e['type'], e['t'], e.get('v', 1.0)
    if k == 'key': add(keys, key_snd(1.0, v), t0, .30, rng.uniform(-.12, .12))
    elif k == 'space': add(keys, key_snd(1.4, v * .9), t0, .26, 0)
    elif k == 'enter': add(keys, key_snd(2.0, 1.3), t0, .34, 0); add(keys, tick(mtof(57), .08, .6), t0, .08)
    elif k == 'focus':
        w = whoosh(.16, 1400, 2600, .8) * .5; tk_ = np.pad(tick(mtof(93), .1, .35), (0, len(w) - int(.1 * SR))); add(fx, w + tk_, t0 - .02, .22, -.1)
    elif k == 'ptr':
        x = tick(mtof(ptr_note[e['f']] + 12), .45, 1.0); add(fx, x, t0, .26, {'lo': -.35, 'hi': .35, 'mid': 0}[e['f']]); add(wet, x, t0, .1)
    elif k == 'val': add(fx, tick(mtof(86), .12, .7), t0, .12, .2)
    elif k == 'cell': add(fx, tick(mtof(PEN[e['i'] % 6] + 12), .3, .9), t0, .14, -.5 + e['i'] / 6)
    elif k == 'chip': add(fx, tick(mtof(88 if e['kind'] != 'bad' else 79), .22, 1), t0, .2, .3); add(fx, whoosh(.12, 900, 3000, 1) * .3, t0 - .03, .1)
    elif k == 'swap': add(fx, whoosh(.9, 300, 2400, 1), t0 - .1, .5, 0); add(wet, whoosh(.9, 300, 2400, 1), t0 - .1, .12)
    elif k == 'zoom': add(fx, whoosh(.9, 700, 1700, 1), t0 - .1, .22 * v, 0)
    elif k == 'run': b = bell(mtof(84), 1.4, .35, 1); add(fx, b, t0, .24, .1); add(wet, b, t0, .16); add(fx, tick(mtof(60), .1, .8), t0 - .01, .2)
    elif k == 'thud': x = thud(v); add(fx, x, t0, .85, 0); add(wet, x, t0, .12)
    elif k == 'diffin': add(fx, tick(mtof(91), .4, 1), t0, .2, .3); add(fx, whoosh(.5, 600, 2200, 1), t0 - .05, .25, .2)
    elif k == 'fold': add(fx, paper(.6, True, 1), t0, .5, -.15); add(fx, tick(mtof(79), .3, .8), t0 + .5, .14, -.2)
    elif k == 'ding':
        n = e['n']; b = bell(mtof(88 + 3 * n), 1.8, .5, 1); add(fx, b, t0, .3, -.2 + .4 * n); add(wet, b, t0, .2); add(fx, bell(mtof(95 + 3 * n), 1.2, .3, .5), t0 + .09, .18, .2)
    elif k == 'blip': add(fx, tick(mtof(72), .35, 1), t0, .22, 0)
    elif k == 'flip':
        add(fx, whoosh(1.1, 400, 5200, 1), t0 - .1, .55, 0); add(wet, whoosh(1.1, 400, 5200, 1), t0 - .1, .2)
        for j, m in enumerate([84, 88, 91, 96]): add(fx, tick(mtof(m), .8, 1), t0 + .55 + j * .1, .12, -.3 + .2 * j)
    elif k == 'row': add(fx, tick(mtof(PEN[3] + 12), .35, 1), t0, .2, .1)
    elif k == 'chime':
        for j, m in enumerate([72, 76, 79, 84]): b = bell(mtof(m), 3.0, .8, 1); add(fx, b, t0 + j * .05, .22, -.3 + .2 * j); add(wet, b, t0 + j * .05, .16)

# a little room around the bells and ticks
irn = int(1.4 * SR); irx = np.arange(irn) / SR
ir = lp(noise(1.4), 5500) * np.exp(-irx / .32); ir[:int(.01 * SR)] = 0; a0, a1 = int(.01 * SR), int(.024 * SR); ir[a0:a1] *= np.linspace(0, 1, a1 - a0); ir /= np.sqrt((ir ** 2).sum())
wetr = np.stack([fftconvolve(wet[:, c], ir * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1)
room = (lp(noise(DUR), 420) * .016 + sum(a * np.sin(2 * np.pi * 50 * k * tt + k) for k, a in zip((1, 2), (1, .3))) * .004) * np.clip(tt / 1.5, 0, 1) * np.clip((DUR - tt) / 2.0, 0, 1)
room = np.stack([room, room], 1)

# ---------------------------------------------------------------- score
BPM = 88; BEAT = 60 / BPM; BAR = 4 * BEAT
def epiano(f, d=1.6, v=1.0):
    t = tv(d); I = 2.2 * np.exp(-t / .12) + .15
    tine = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * 14 * t) * .35) * np.exp(-t / (d * .38))
    body = (np.sin(2 * np.pi * f * t) + .22 * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t / (d * .5))
    return (tine * .5 + body * .6) * np.clip(t / .003, 0, 1) * np.clip((d - t) / .15, 0, 1) * v
def pad(fs, d, v=1.0, a=1.6, r=2.2):
    t = tv(d); env = np.clip(t / a, 0, 1) * np.clip((d - t) / r, 0, 1); x = 0
    for f in fs:
        for dt in (-.7, .0, .6): x = x + ((2 * (((f + dt) * t) % 1) - 1) * .22 + np.sin(2 * np.pi * (f + dt) * t) * .55)
    return lp(x, 1300, 2) * env * v / len(fs)
def sub(f, d=1.8, v=1.0):
    t = tv(d); return (np.sin(2 * np.pi * f * t) + .45 * np.sin(2 * np.pi * 2 * f * t) + .2 * np.sin(2 * np.pi * 3 * f * t)) * np.clip(t / .02, 0, 1) * np.exp(-t / (d * .6)) * np.clip((d - t) / .08, 0, 1) * v
def hat(v=1.0): d = .06; t = tv(d); return hp(noise(d), 7500) * np.exp(-t / .012) * v
CH = {'Am9': (45, [60, 64, 67, 71]), 'F': (41, [57, 60, 64, 67]), 'C': (48, [59, 64, 67, 71]), 'Em7': (40, [59, 62, 64, 67]), 'G': (43, [62, 65, 67, 72]), 'Dm9': (50, [57, 60, 64, 65])}
music = np.zeros((N, 2))
def bar(t0, ch, vel=.7, arp=True, pat=None, hats=False, subv=.7, pan=0.0, oct_=0):
    root, up = CH[ch]
    add(music, sub(mtof(root), BEAT * 2.6, subv), t0, .5, 0)
    if subv > .3: add(music, sub(mtof(root + (7 if ch not in ('F',) else 0)), BEAT * 1.2, subv * .7), t0 + 2.5 * BEAT, .38, 0)
    add(music, pad([mtof(m) for m in up], BAR + .6, .5, .5, 1.0), t0, .22, 0)
    if arp:
        pat = pat or [0, 2, 1, 3, 2, 1, 3, 2]
        for i, p in enumerate(pat):
            add(music, epiano(mtof(up[p] + 12 + 12 * oct_), 1.2, vel * (1 if i % 2 == 0 else .62)), t0 + i * BAR / len(pat), .2, -.35 + .7 * (i % 4) / 3 + pan)
    if hats:
        for i in range(8): add(music, hat(1 if i % 2 == 0 else .55), t0 + i * BEAT / 2, .07, .25 if i % 2 else -.25)
# 0 - 10.4: the typing is alone with the room, a pad breathes in under the last lines
add(music, pad([mtof(m) for m in [45, 52, 57, 60, 64]], 4.0, .5, 2.0, 1.4), 7.4, .2)
# S1 (10.5 - 18.7): the bug. A minor, sparse
t = 10.5
for k, ch in enumerate(['Am9', 'F']): bar(t + k * BAR, ch, .5, arp=(k > 0), pat=[0, 3, 1, 2, 3, 1, 2, 0][:8], subv=.6)
add(music, epiano(mtof(76), 2.4, .6), t + 2 * BAR + .2, .22)                      # a lone high note hangs over the thud's silence
# S2 (18.7 - 44.0): the trace. a curious 8th-note groove
t = 18.7; prog = ['Am9', 'F', 'C', 'Em7', 'Am9', 'F', 'C', 'Em7', 'Am9', 'F']
for k, ch in enumerate(prog): bar(t + k * BAR, ch, .52 + .02 * min(k, 6), arp=True, pat=[0, 2, 1, 3, 2, 1, 3, 2] if k % 2 == 0 else [1, 3, 2, 0, 3, 2, 1, 3], hats=(k >= 2), subv=.7)
# S3 (46.0 - 58.3): the fix. major lift, the same motif brighter
t = 46.0
for k, ch in enumerate(['F', 'C', 'G', 'C', 'F']): bar(t + k * BAR, ch, .62, arp=True, pat=[3, 1, 2, 0, 3, 2, 1, 3], hats=True, subv=.75, oct_=0)
# S4 (58.3 - end): the close. one slow chord, a few high notes
t = 58.3
add(music, pad([mtof(m) for m in [48, 55, 59, 64, 67]], DUR - t + 1, .6, .8, 3.0), t, .26)
add(music, sub(mtof(36), 6.0, .8), t, .4)
for j, m in enumerate([79, 83, 86, 91, 88]): add(music, epiano(mtof(m), 2.2, .6), t + 1.2 + j * .9, .16, -.4 + .2 * j)
irm = lp(noise(1.8), 4500) * np.exp(-tv(1.8) / .6); irm /= np.sqrt((irm ** 2).sum())
music = music + np.stack([fftconvolve(music[:, c], irm * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1) * .08
# holes in the music: before the thud, after "it quits without looking", and a breath before the flip; the typing opening has none to cut
def hole(a, b, fa=.3, fb=.06): return 1 - np.clip(np.minimum((tt - a) / fa, (b - tt) / fb), 0, 1) * ((tt > a) & (tt < b))
gate = hole(16.1, 18.7) * hole(43.9, 46.0, .25, .05) * hole(57.7, 58.6, .3, .05)
music *= gate[:, None]
music *= np.clip((tt - 7.0) / 1.5, 0, 1)[:, None]

# ---------------------------------------------------------------- voice
voice = np.zeros((N, 2)); vo = np.zeros(N)
for lid, t0 in AT.items():
    x, sr = sf.read(os.path.join(HERE, 'voices', lid + '.wav')); x = x if x.ndim == 1 else x.mean(1)
    x = soxr.resample(x, sr, SR).astype(np.float64); x = hp(x, 80, 2); x = lp(x, 9500, 2)
    x = sfx.compress(x / np.abs(x).max(), .18, 3.5, .004, .09); x /= np.abs(x).max()
    add(voice, x, t0, .8, 0); add(wet, x, t0, .03)
    vo[int(t0 * SR):int(t0 * SR) + len(x)] = 1
vo = uniform_filter1d(maximum_filter1d(vo, size=int(.5 * SR)), size=int(.3 * SR))

mix = (fx * (1 - .55 * vo[:, None]) * 1.5 + wetr * .7 + keys * (1 - .5 * vo[:, None]) * 1.4 + room * 3.0 + music * .20 * (1 - .55 * vo[:, None]) + voice * 1.25)
out = np.zeros_like(mix)
for c in (0, 1):
    y = sfx.compress(mix[:, c], .22, 3.0, .004, .12); k = .3; y = k * np.tanh(y / k); out[:, c] = sfx.limit(y, .3, .005)
sf.write(os.path.join(HERE, 'mix.wav'), out.astype(np.float32), SR)
rms = lambda a: 20 * np.log10(np.sqrt(np.mean(a ** 2)) + 1e-9)
print('mix.wav %.1f s | rms dB: fx %.1f keys %.1f music %.1f voice %.1f room %.1f mix %.1f peak %.2f' % (DUR, rms(fx), rms(keys), rms(music), rms(voice[voice != 0]), rms(room), rms(out), np.abs(out).max()))
if os.environ.get('DIAG'):
    for a in range(0, int(DUR), 3):
        s = slice(a * SR, (a + 3) * SR); print('%3d fx %6.1f keys %6.1f music %6.1f voice %6.1f mix %6.1f' % (a, rms(fx[s]), rms(keys[s]), rms(music[s]), rms(voice[s]), rms(out[s])))
