"""Mostly Air: voice, score, foley and ambience, all synthesised (numpy/scipy) and placed on the timeline in events.json.
Run from the library root:  .venv/bin/python styles/felt/demo/mix.py   ->  out/mix.wav"""
import json, os, sys
import numpy as np
import soundfile as sf
import soxr
from scipy.signal import lfilter

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(LIB, 'core', 'audio'))
import sfx
from sfx import SR, t_, noise, bp, lp, hp, env_exp, add, norm, compress, limit

ev = json.load(open(os.path.join(HERE, 'events.json')))
DUR = ev['dur']; EV = ev['ev']
N = int((DUR + .6) * SR)
rng = np.random.default_rng(23)
sfx._rng = np.random.default_rng(5)
BPM = 108; BEAT = 60 / BPM; BAR = BEAT * 3; EIGHTH = BEAT / 2
mf = lambda m: 440 * 2 ** ((m - 69) / 12)
bar = lambda n, beat=0: n * BAR + beat * BEAT

# ---------------- instruments ----------------
def felt_piano(m, v=1., d=2.2):
    """A felt-damped upright: soft hammer thump, a few mellow partials, no bright attack."""
    f = mf(m); tt = t_(d)
    det = 1 + (rng.random() - .5) * .0016
    x = np.zeros_like(tt)
    for k, (a, tau) in enumerate([(1.0, .9), (.42, .5), (.2, .3), (.08, .18), (.04, .1)], 1):
        x += a * np.sin(2 * np.pi * f * k * det * tt + rng.random() * .3) * np.exp(-tt / (tau * (1 + .35 * (m < 55))))
    thump = lp(noise(d), 700) * np.exp(-tt / .012) * .5 + np.sin(2 * np.pi * f * .5 * tt) * np.exp(-tt / .04) * .15
    x = x + thump
    x = lp(x, 2600 + 900 * v, 1)
    return x * np.minimum(1, tt / .003) * v * .55

def music_box(m, v=1.):
    f = mf(m); d = 2.2; tt = t_(d)
    x = sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / tau) for r, a, tau in [(1, 1, 1.1), (2.99, .28, .35), (5.9, .1, .12)])
    x += hp(noise(d), 4000) * np.exp(-tt / .003) * .15
    return x * v * .30

def pad_note(m, d, v=1., att=.9, rel=1.2):
    tt = t_(d); f = mf(m)
    x = sum(np.sin(2 * np.pi * f * (1 + dd) * tt + p) for dd, p in [(-.003, 0), (.0, 1.3), (.0035, 2.4)])
    x += .3 * sum(np.sin(2 * np.pi * 2 * f * (1 + dd) * tt) for dd in (-.002, .002))
    x = lp(x, 1400, 1)
    e = np.minimum(1, tt / att) * np.minimum(1, np.maximum(0, (d - tt)) / rel)
    return x * e * v * .09

def hum(d, f0=100.):
    tt = t_(d); wob = 1 + .0004 * np.sin(2 * np.pi * .3 * tt)
    return (np.sin(2 * np.pi * f0 * wob * tt) + .5 * np.sin(2 * np.pi * 2 * f0 * tt + .5) + .25 * np.sin(2 * np.pi * 3 * f0 * tt + 1.1)) * .05 + lp(noise(d), 300) * .02

# ---------------- foley ----------------
def poke(v=1., kind='body'):
    d = .22; tt = t_(d)
    body_f = {'body': 130, 'neck': 150, 'beak': 210, 'wingL': 170, 'wingR': 170, 'breast': 140, 'eyeL': 600, 'eyeR': 600}.get(kind, 140)
    thud = lp(noise(d), 420) * np.exp(-tt / .018) * .9 + np.sin(2 * np.pi * body_f * tt * (1 - .2 * tt / d)) * np.exp(-tt / .03) * .5
    sk = bp(noise(d), 2800, 7200) * np.exp(-tt / .02) * (1 - np.exp(-tt / .003)) * .35        # barbs through fibre
    rustle = bp(noise(d), 700, 2400) * np.exp(-tt / .07) * np.minimum(1, tt / .02) * .25     # fibres settling
    tick = hp(noise(d), 5000) * np.exp(-tt / .0015) * .25
    return norm(thud + sk + rustle + tick) * v

def flup(v=1.):     # the felt tag landing
    d = .3; tt = t_(d)
    x = np.sin(2 * np.pi * (320 - 120 * tt / d) * tt) * np.exp(-tt / .05) + lp(noise(d), 900) * np.exp(-tt / .03) * .7
    return norm(x) * v

def thud(v=1., f=85, d=.35):
    tt = t_(d); x = np.sin(2 * np.pi * f * (1 - .25 * np.minimum(1, tt / .1)) * tt) * np.exp(-tt / .07) + lp(noise(d), 320) * np.exp(-tt / .03) * .8 + bp(noise(d), 900, 2500) * np.exp(-tt / .08) * .15
    return norm(x) * v

def rustle(d, v=1., lo=500, hi=2800, rate=14):
    n = bp(noise(d), lo, hi); tt = t_(d)
    mod = .55 + .45 * np.abs(lp(noise(d), rate, 1)); mod /= mod.max()
    e = np.minimum(1, tt / .06) * np.minimum(1, (d - tt) / .12)
    return norm(n * mod * e) * v

def puff(v=1., d=.3):
    tt = t_(d); return norm(bp(noise(d), 800, 4500) * np.exp(-tt / .09) * np.minimum(1, tt / .01)) * v

def bead(v=1.):
    d = .18; tt = t_(d)
    x = sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt / tau) for f, a, tau in [(3300, 1, .02), (5150, .6, .012), (7400, .25, .008)]) + lp(noise(d), 500) * np.exp(-tt / .012) * .6
    return norm(x) * v

def blink(v=1.):
    d = .12; tt = t_(d); return norm(bp(noise(d), 1500, 5000) * np.exp(-tt / .02) * np.minimum(1, tt / .004)) * v

def peep(v=1.):
    """A small bird: two quick rising chirps with a flutter."""
    out = np.zeros(int(.42 * SR))
    for at, f0, f1, d in [(0.0, 2350, 3350, .13), (0.19, 2600, 3700, .16)]:
        tt = t_(d); f = f0 + (f1 - f0) * (tt / d) ** .7 + 60 * np.sin(2 * np.pi * 38 * tt)
        ph = 2 * np.pi * np.cumsum(f) / SR
        x = (np.sin(ph) + .22 * np.sin(2 * ph) + .08 * np.sin(3 * ph)) * np.sin(np.pi * tt / d) ** .8
        s = int(at * SR); out[s:s + len(x)] += x
    out = lp(out, 7000, 1)
    return norm(out) * v

def wipe_wool(d=1.1, v=1.):
    tt = t_(d); n = lp(noise(d), 900) * 1.2 + bp(noise(d), 1500, 4500) * .5
    e = np.sin(np.pi * tt / d) ** 2
    return norm(n * e) * v

def needle_in(v=1.):
    d = .5; tt = t_(d); x = bp(noise(d), 3000, 9000) * np.exp(-tt / .1) * .4 + np.sin(2 * np.pi * 4200 * tt) * np.exp(-tt / .06) * .2
    return norm(x) * v

def needle_down(v=1.):
    out = np.zeros(int(.8 * SR))
    for at, f, g in [(0.0, 2600, 1), (0.07, 2100, .6), (0.3, 520, .9)]:
        d = .25; tt = t_(d)
        x = (sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / tau) for r, a, tau in [(1, 1, .03), (2.3, .5, .02)]) if f > 1000 else
             lp(noise(d), 1500) * np.exp(-tt / .02) + np.sin(2 * np.pi * f * tt) * np.exp(-tt / .06))
        s = int(at * SR); out[s:s + len(x)] += norm(x) * g
    return norm(out) * v

def switch_click(v=1.):
    d = .12; tt = t_(d); x = hp(noise(d), 1800) * np.exp(-tt / .003) + sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt / .01) for f, a in [(900, .7), (2400, .4)])
    return norm(x) * v

# ---------------- buffers ----------------
voice = np.zeros((N, 2)); music = np.zeros((N, 2)); fol = np.zeros((N, 2)); amb = np.zeros((N, 2))

# voice
vdir = os.path.join(HERE, 'out', 'voice'); vm = np.zeros(N)
for e in EV:
    if e['type'] != 'voice': continue
    w, sr = sf.read(os.path.join(vdir, e['id'] + '.wav'))
    if w.ndim > 1: w = w.mean(1)
    w = soxr.resample(w, sr, SR).astype(np.float64)
    w = hp(w, 90, 2); w = compress(w, .12, 3.2, .004, .09); w = norm(w, .8)
    # a touch of warmth: a little low-mid shelf
    w = w + .12 * lp(w, 380, 1)
    add(voice, w, e['t'], 1.0, 0.0); vm[int(e['t'] * SR):int(e['t'] * SR) + len(w)] = np.maximum(vm[int(e['t'] * SR):int(e['t'] * SR) + len(w)], np.abs(w))

# ambience: room tone, the lamp's hum (on at 0.14, off at 49.65)
room = lp(noise(DUR + .6), 380, 2) * .035 + bp(noise(DUR + .6), 1200, 3500) * .004
add(amb, room, 0, 1.0)
LAMP_OFF = next((e['t'] for e in EV if e['type'] == 'lamp_off'), 49.6) + .05
h = hum(LAMP_OFF - .14)
lvl = np.minimum(1, t_(LAMP_OFF - .14) / .5)
h = h * lvl * np.minimum(1, (LAMP_OFF - .14 - t_(LAMP_OFF - .14)) / .08 + .0)
add(amb, h, .14, 1.0)
# a slow breath of air through the room, and one far drawer in the silence
add(amb, lp(noise(2.2), 500) * np.sin(np.pi * t_(2.2) / 2.2) ** 2 * .02, 39.0, 1.0, -.4)
add(amb, thud(.12, 70, .3) * .5 + bp(noise(.3), 300, 900) * np.exp(-t_(.3) / .1) * .15, 39.9, 1.0, -.7)

# foley from the events
for e in EV:
    t = e['t']; ty = e['type']
    if ty == 'poke':
        v = .55 + .45 * rng.random(); add(fol, poke(1.0, e.get('target', 'body')), t, .55 * v, .12 + (rng.random() - .5) * .1)
    elif ty == 'land': add(fol, thud(1., 70, .5), t, .7); add(fol, puff(1., .6), t, .5); add(fol, rustle(.5, 1., 300, 1500, 8), t - .1, .3)
    elif ty == 'tag': add(fol, flup(), t, .3, -.55)
    elif ty == 'needle_in': add(fol, needle_in(), t, .35, .3)
    elif ty == 'bounce': add(fol, thud(1., 80), t, .75, 0); add(fol, rustle(.25, 1.), t, .15)
    elif ty == 'bounce_small': add(fol, thud(1., 105, .3), t, .5, 0)
    elif ty == 'roll': add(fol, rustle(e.get('dur', .8), 1., 400, 1800, 9), t, .35, .3)
    elif ty == 'hop': add(fol, thud(1., 95), t, .7); add(fol, rustle(.35, 1.), t - .35, .2)
    elif ty == 'beak': add(fol, thud(1., 230, .2), t, .5, .1); add(fol, puff(.7), t, .25)
    elif ty == 'wing': add(fol, thud(1., 130, .25), t, .55, .1); add(fol, puff(1.), t - .05, .3)
    elif ty == 'tuft': add(fol, puff(1., .45), t, .4, .2); add(fol, rustle(.4, 1., 400, 2200), t - .15, .2)
    elif ty == 'blend':
        d = e.get('dur', 5.0); r = rustle(d, 1., 900, 4800, 18); add(fol, r, t, .22, 0)
    elif ty == 'bead': add(fol, bead(), t, .5, .05)
    elif ty == 'blink': add(fol, blink(), t, .5)
    elif ty == 'peep': add(fol, peep(), t, .95, 0)
    elif ty == 'wipe': add(fol, wipe_wool(), t, .55, 0)
    elif ty == 'needle_down': add(fol, needle_down(), t, .6, .35)
    elif ty == 'lamp_on': add(fol, switch_click(), t, .5)
    elif ty == 'lamp_off': add(fol, switch_click(), t, .75); add(fol, switch_click(), t + .09, .35)

# ---------------- the score: 108 BPM, 3/4, G major pentatonic (G A B D E) ----------------
G2, A2, B2, C3, D3, E3, G3, A3, B3, C4, D4, E4, G4, A4, B4, D5, E5, G5, A5 = 43, 45, 47, 48, 50, 52, 55, 57, 59, 60, 62, 64, 67, 69, 71, 74, 76, 79, 81
CHORDS = [  # (bass, dyad/triad above)
    (G2, [B3, D4, G4]), (E3 - 12 + 12, [G3, B3, E4]), (C3, [G3, C4, E4]), (D3, [A3, D4, A4]),
]
def note(buf, inst, m, at, v=1., pan=0.):
    add(buf, inst(m, v), at, 1.0, pan)

def waltz(b0, b1, vel=.8, bassv=.9, melody=None):
    for b in range(b0, b1):
        bass, up = CHORDS[b % 4]
        note(music, felt_piano, bass, bar(b), bassv * (.85 + .15 * rng.random()), -.15)
        note(music, felt_piano, bass + 12, bar(b), bassv * .35, -.1)
        for beat in (1, 2):
            for i, m in enumerate(up[:2] if beat == 1 else up[1:]):
                note(music, felt_piano, m, bar(b, beat) + i * .012, vel * (.62 + .2 * rng.random()), .12)

# bars 0-1: the lamp comes on; two single notes
note(music, felt_piano, D4, 1.05, .5, 0); note(music, felt_piano, B3, 2.3, .45, 0)
# bars 2-7: the waltz, sparse at first
waltz(2, 8, .75)
# a first melody on the felt piano (bars 4-7)
MEL_A = [(4, 1, D5, 1), (4, 2, B4, 1), (5, 0, A4, 2), (5, 2, G4, 1), (6, 1, E4, 1), (6, 2, G4, 1), (7, 0, A4, 1.5), (7, 1.5, B4, 1.5)]
for b, bt, m, dur in MEL_A: note(music, felt_piano, m, bar(b, bt), .8, .15)
# bars 8-11: music box joins
waltz(8, 12, .8)
MEL_B = [(8, 0, G5, 1), (8, 1, E5, 1), (8, 2, D5, 1), (9, 0, E5, 2), (9, 2, B4, 1), (10, 0, D5, 1.5), (10, 1.5, A4, 1.5), (11, 0, B4, 3)]
for b, bt, m, dur in MEL_B: note(music, music_box, m, bar(b, bt), .85, .3)
# bars 12-16: fuller; pad and arpeggios
waltz(12, 17, .85)
for b in range(12, 17):
    bass, up = CHORDS[b % 4]
    for i, m in enumerate([up[0] + 12, up[1] + 12, up[2] + 12]):
        note(music, music_box, m, bar(b, 1) + i * EIGHTH * .0 + i * BEAT * .333, .55, .35)
    add(music, pad_note(up[0] + 0, BAR * 1.15, .8), bar(b) - .05, 1.0, -.2)
MEL_C = [(14, 0, E5, 1), (14, 1, G5, 1), (14, 2, A5, 1), (15, 0, G5, 3), (16, 0, E5, 1.5), (16, 1.5, D5, 1.5)]
for b, bt, m, dur in MEL_C: note(music, music_box, m, bar(b, bt), .75, .3)
# bars 17-21: the blend. pad swells, waltz thinner, a rising line
waltz(17, 22, .6, .8)
for b in range(17, 22):
    bass, up = CHORDS[b % 4]
    for j, m in enumerate(up): add(music, pad_note(m, BAR * 1.2, 1.0 + .08 * (b - 17)), bar(b) - .1, 1.0, (j - 1) * .3)
RISE = [(18, 0, G4), (18, 1.5, A4), (19, 0, B4), (19, 1.5, D5), (20, 0, E5), (20, 1.5, G5), (21, 0, A5)]
for b, bt, m in RISE: note(music, music_box, m, bar(b, bt), .7 + .02 * (b - 18), .25)
# bar 22 (36.67): the last chord is held and falls away before the silence
for j, m in enumerate([G3, D4, B4]): add(music, pad_note(m, 2.0, 1.2, att=.2, rel=1.6), bar(22), 1.0, (j - 1) * .3)
note(music, felt_piano, G2, bar(22), .8, -.1)
# silence: no music from 38.7 to 41.67; the peep is the first sound.
# bars 25-29: the theme returns, softer and warmer
waltz(25, 30, .62, .75)
THEME = [(25, 2, D5, 1), (26, 0, B4, 1), (26, 1, A4, 1), (26, 2, G4, 1), (27, 0, A4, 2), (27, 2, B4, 1), (28, 0, D5, 1.5), (28, 1.5, E5, 1.5), (29, 0, G5, 3)]
for b, bt, m, _d in THEME: note(music, music_box if b >= 28 else felt_piano, m, bar(b, bt), .85, .2)
for b in range(26, 30):
    bass, up = CHORDS[b % 4]
    for j, m in enumerate(up): add(music, pad_note(m, BAR * 1.2, .9), bar(b) - .1, 1.0, (j - 1) * .3)
# the last chord rings through the lamp going out
for m, v in [(G2, .9), (D3, .5), (G3, .7), (B3, .5), (D4, .5), (G4, .6)]: note(music, felt_piano, m, bar(30), v, 0)
note(music, music_box, G5, bar(30) + .02, .7, .3)
# silence window: zero the music exactly (soft edges)
S0, S1 = 38.75, 41.65
mask = np.ones(N)
a, b = int(S0 * SR), int(S1 * SR)
mask[a:b] = 0
fade = int(.35 * SR); mask[a - fade:a] = np.linspace(1, 0, fade);
music *= mask[:, None]

# sidechain: the music sits under the voice
vm_s = np.convolve(vm, np.ones(int(.05 * SR)) / int(.05 * SR), 'same'); vm_s = np.minimum(1, vm_s * 6)
duck = 1 - .5 * np.clip(np.convolve(vm_s, np.hanning(int(.4 * SR)) / np.hanning(int(.4 * SR)).sum(), 'same'), 0, 1)
music *= duck[:, None]

# balance: voice about 10 dB over the music
def rms(x): return np.sqrt((x ** 2).mean() + 1e-12)
vo = voice * (0.20 / max(rms(voice[voice.any(1)]), 1e-6) if voice.any() else 1)
mus = music * (0.085 / max(rms(music[np.abs(music).sum(1) > 1e-4]), 1e-6))
fo = fol * (0.5 / max(np.abs(fol).max(), 1e-6)) * 1.15
am = amb * 1.0
mixd = vo + mus + fo + am
if os.environ.get('STEMS'):
    for nme, s in [('voice', vo), ('music', mus), ('foley', fo), ('amb', am)]: sf.write(os.path.join(HERE, 'out', 'stem_' + nme + '.wav'), s.astype(np.float32), SR)
# low end: roll off below 40 Hz
mixd = np.stack([hp(mixd[:, 0], 40, 2), hp(mixd[:, 1], 40, 2)], 1)
# light master compression/limit
for c in (0, 1): mixd[:, c] = limit(mixd[:, c], .9)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mixd.astype(np.float32), SR, subtype='FLOAT')
print('mix', mixd.shape, 'rms voice %.3f music %.3f foley %.3f' % (rms(vo), rms(mus), rms(fo)))
