"""Foley, score and voice -> mix.wav for "She Knows" (chat-log).
Every message, key, typing blip, reaction and recall is a sound placed from events.json (core/render/events.mjs); the received
messages are also the melody (a pentatonic note per sender). The score is numpy synthesis (kalimba, soft bass, pad); it leaves the
two typing passages to the room and the keys. Nana's voice message is voices/nana.wav (Kokoro), placed on the 'voice' event.
usage: .venv/bin/python styles/chat-log/demo/mix.py
"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
from scipy.signal import fftconvolve
from scipy.ndimage import maximum_filter1d, uniform_filter1d
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, bp, lp, hp

EVJ = json.load(open(os.path.join(HERE, 'events.json')))
EV, DUR = EVJ['ev'], EVJ['dur']
N = int(DUR * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(85)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def tv(d): return np.arange(int(round(d * SR))) / SR
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def add(buf, x, at, gain=1.0, pan=0.0):
    s = int(round(at * SR))
    if s >= len(buf) or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[s:e, 0] += x[:e - s] * gain * l * 1.414; buf[s:e, 1] += x[:e - s] * gain * r * 1.414
def ev_t(type_): return [e['t'] for e in EV if e['type'] == type_]
def window(a, b, fa=.3, fb=.3): return np.clip((tt - a) / fa, 0, 1) * np.clip((b - tt) / fb, 0, 1)

# ---------------------------------------------------------------- the sounds of the app
SCALE = [62, 64, 66, 69, 71, 74, 76, 78]        # D major pentatonic: any pop fits any chord of the score
WHO = {'tomas': 0, 'jun': 2, 'bee': 4, 'nana': 1, 'me': 3}
def pop(note, d=.5, bright=1.0, v=1.0):
    """a bubble 'pop' with a kalimba ring: the tuned tail is what makes the messages a melody"""
    t = tv(d); f = mtof(note)
    sw = np.sin(2 * np.pi * np.cumsum(f * (.55 + .45 * np.exp(-t / .012))) / SR) * np.exp(-t / .05)         # the pop: pitch falls onto the note
    ring = (np.sin(2 * np.pi * f * t) * np.exp(-t / .22) + .22 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t / .05) + .08 * np.sin(2 * np.pi * f * 9.5 * t) * np.exp(-t / .02))
    tick = hp(noise(d), 3500) * np.exp(-t / .002) * .25 * bright
    return (sw * .8 + ring * .55 + tick) * np.clip(t / .0015, 0, 1) * v
def send_snd(note):
    d = .5; t = tv(d); x = pop(note + 12, d, 1.2, .9)
    wh = bp(noise(.16), 900, 4200) * np.sin(np.pi * tv(.16) / .16) ** 2 * .18
    return x + np.pad(wh, (0, len(x) - len(wh)))
def key_snd():
    d = .03; t = tv(d); f = rng.uniform(2300, 3600)
    return (bp(noise(d), f * .7, f * 1.4) * np.exp(-t / .0035) + np.sin(2 * np.pi * rng.uniform(380, 520) * t) * np.exp(-t / .006) * .35) * np.clip(t / .0006, 0, 1)
def typing_blip(n):
    d = .16; t = tv(d); f = 330 * (1 + .12 * (n % 3 == 1)); f0 = f * np.exp(-t / .05) + f * .6 * 0
    return np.sin(2 * np.pi * np.cumsum(f * (.7 + .3 * np.exp(-t / .025))) / SR) * np.exp(-t / .045) * np.clip(t / .004, 0, 1)
def bell(f, d=1.4, tau=.4, v=1.0):
    t = tv(d); return v * sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (tau * s)) for m, a, s in [(1, 1, 1), (2.76, .3, .35), (5.4, .12, .15), (8.9, .05, .1)]) * np.clip(t / .002, 0, 1)
def recall_snd(k):
    d = .5; t = tv(d); sweep = bp(noise(d), 300, 6000) * np.exp(-t / .16); f = 900 * np.exp(-t * 5) + 120
    drop = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .12) * .6
    crinkle = hp(noise(d), 2500) * (rng.random(len(t)) > .93) * np.exp(-t / .18) * .8
    return (lp(sweep, 5000) * .8 + drop + crinkle) * np.clip(t / .003, 0, 1)
def react_snd(p):
    d = .3; t = tv(d); f = 1500 * p; return (np.sin(2 * np.pi * np.cumsum(f * (1 + .5 * (1 - np.exp(-t / .03)))) / SR) * np.exp(-t / .06) + .3 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t / .03)) * np.clip(t / .002, 0, 1)
def pin_snd():
    d = .3; t = tv(d); return (np.sin(2 * np.pi * 150 * np.exp(-t / .05) * t) * np.exp(-t / .07) + hp(noise(d), 2000) * np.exp(-t / .004) * .5 + bell(1760, .3, .08, .25)[:len(t)]) * np.clip(t / .001, 0, 1)
def shutter_snd():
    d = .5; t = tv(d); a = hp(noise(.02), 1500) * np.exp(-tv(.02) / .004); out = np.zeros(len(t))
    for off, g in [(0, 1.0), (.055, .8)]: out[int(off * SR):int(off * SR) + len(a)] += a * g
    out += lp(noise(d), 500) * np.exp(-t / .03) * .4; out += np.sin(2 * np.pi * 90 * t) * np.exp(-t / .08) * .5
    return out
def swish_snd(dirn, d=.7):
    t = tv(d); n = noise(d); out = np.zeros_like(n)
    for i in range(0, len(n), 480):
        hi = min(len(n), i + 480); fr = 500 + 3000 * (i / len(n) if dirn > 0 else 1 - i / len(n))
        out[i:hi] = bp(n[max(0, i - 2000):hi], fr * .7, fr * 1.4)[-(hi - i):]
    return sfx.norm(out * np.sin(np.pi * t / d) ** 2)
def air(d, up=True):
    t = tv(d); x = lp(noise(d), 1800) * (np.sin(np.pi * t / d) ** 2); return sfx.norm(x)

fx = np.zeros((N, 2)); wet = np.zeros((N, 2)); keys = np.zeros((N, 2)); blips = np.zeros((N, 2))
ins = [e for e in EV if e['type'] == 'in']
for e in EV:
    k, t0 = e['type'], e['t']
    if k == 'in':
        note = SCALE[(WHO.get(e['who'], 0) + e['n'] * 3) % len(SCALE)] - (12 if e['who'] == 'nana' else 0)
        x = pop(note); add(fx, x, t0, .42, -.25); add(wet, x, t0, .12, -.25)
    elif k == 'send':
        x = send_snd(SCALE[3]); add(fx, x, t0, .42, .3); add(wet, x, t0, .1, .3)
    elif k == 'key': add(keys, key_snd(), t0, .26, .15 if e['k'] < 40 else 0)
    elif k == 'tt': add(blips, typing_blip(e['n']), t0, .22, 0)
    elif k == 'ping':
        add(fx, bell(mtof(88), 2.0, .5, .5), t0, .5, -.1); add(fx, bell(mtof(81), 2.4, .6, .5), t0 + .16, .5, .1)
        add(wet, bell(mtof(88), 2.0, .5), t0, .3); add(wet, bell(mtof(81), 2.4, .6), t0 + .16, .3)
    elif k == 'sys': add(fx, pop(SCALE[0] + 12, .3, .6, .6), t0, .3)
    elif k == 'recall':
        x = recall_snd(0); add(fx, x, t0, .55, {'tomas': -.35, 'jun': .3}.get(e['who'], 0)); add(wet, x, t0, .1)
    elif k == 'react': add(fx, react_snd(1 + .12 * WHO.get(e['who'], 0)), t0, .35, .2)
    elif k == 'pin': add(fx, pin_snd(), t0, .45, 0)
    elif k == 'seen': add(fx, pop(SCALE[5] + 12, .25, .5, .4), t0, .22, .4)
    elif k == 'swish': add(fx, swish_snd(e['dir'], .8), t0, .5, 0)
    elif k == 'banner':
        add(fx, bell(mtof(81 + 2 * (len([b for b in ev_t('banner') if b < t0]))), 1.4, .3, .5), t0, .35, .5); add(wet, bell(mtof(81), 1.4, .3), t0, .15, .5)
        add(fx, pop(SCALE[4] + 12, .3, .5, .5), t0 - .03, .25, .5)
    elif k == 'crop':
        for j in range(4): add(fx, key_snd() * 1.8, t0 + j * .05, .25, -.4 + .27 * j)
    elif k == 'shutter': add(fx, shutter_snd(), t0, .8, 0); add(wet, shutter_snd(), t0, .15)
    elif k == 'zoom' and e['t'] > 1: add(fx, air(1.1), t0, .1, 0)

# a small room for the pops and the bells
irn = int(1.3 * SR); irx = np.arange(irn) / SR
ir = lp(noise(1.3), 5000) * np.exp(-irx / .3); ir[:int(.012 * SR)] = 0; k0, k1 = int(.012 * SR), int(.025 * SR); ir[k0:k1] *= np.linspace(0, 1, k1 - k0); ir /= np.sqrt((ir ** 2).sum())
wetr = np.stack([fftconvolve(wet[:, c], ir * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1)

# ---------------------------------------------------------------- the room: a quiet flat at night, always there (the typing passages stand on it)
hum = sum(a * np.sin(2 * np.pi * 50 * k * tt + k) for k, a in zip((1, 2, 3), (1, .4, .15))) * .006
bed = (lp(noise(DUR), 380) * .02 + hum) * np.clip(tt / 1.5, 0, 1)
bed = np.stack([bed, bed], 1)

# ---------------------------------------------------------------- score: kalimba, soft bass, a pad. D major, 100 BPM; music-box at heart
BPM = 100; BEAT = 60 / BPM; BAR = 4 * BEAT
CH = {'D': (38, [62, 66, 69, 73]), 'Bm': (35, [59, 62, 66, 69]), 'G': (43, [59, 62, 67, 71]), 'A': (45, [61, 64, 69, 73]), 'Em': (40, [64, 67, 71, 74])}
def kalimba(f, d=1.4, v=1.0):
    t = tv(d); return (np.sin(2 * np.pi * f * t) * np.exp(-t / .5) + .3 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / .045) + .1 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / .2)) * np.clip(t / .002, 0, 1) * v
def bass(f, d=1.2, v=1.0):
    t = tv(d); env = np.clip(t / .015, 0, 1) * np.exp(-t / (d * .55)) * np.clip((d - t) / .06, 0, 1)
    return (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * 2 * f * t) + .22 * np.sin(2 * np.pi * 3 * f * t)) * env * v
def pad(fs, d, v=1.0, a=1.5, r=2.0):
    t = tv(d); env = np.clip(t / a, 0, 1) * np.clip((d - t) / r, 0, 1); x = 0
    for f in fs:
        for dt in (-.6, 0, .7): x = x + ((2 * (((f + dt) * t) % 1) - 1) * .25 + np.sin(2 * np.pi * (f + dt) * t) * .5)
    return lp(x, 1200, 2) * env * v / len(fs)
def shaker(v=1.0):
    d = .07; t = tv(d); return hp(noise(d), 6500) * np.exp(-t / .018) * v
music = np.zeros((N, 2))
def bar_play(t0, ch, vel=.6, arps=True, bassv=.8, fast=False, shk=False, oct_=0):
    root, notes = CH[ch]
    add(music, bass(mtof(root), BEAT * 1.9, bassv), t0, .5, 0); add(music, bass(mtof(root + (7 if ch != 'Bm' else 5)), BEAT * 1.4, bassv * .8), t0 + 2 * BEAT, .45, 0)
    if arps:
        pat = [0, 2, 1, 3, 2, 1, 3, 2] if not fast else [0, 1, 2, 3, 2, 3, 1, 2, 0, 1, 2, 3, 2, 3, 1, 2]
        step = BAR / len(pat)
        for i, p in enumerate(pat):
            add(music, kalimba(mtof(notes[p] + 12 + 12 * oct_), 1.1, vel * (1 if i % 2 == 0 else .7)), t0 + i * step, .2, -.35 + .7 * (i % 4) / 3)
    if shk:
        for i in range(8): add(music, shaker(1 if i % 2 == 0 else .6), t0 + i * BEAT / 2, .1, .3 if i % 2 else -.3)

PROG = ['D', 'Bm', 'G', 'A']
# 0 - 11.1: the banter, light (bars of 2.4 s from t = 0.0; the first bars thin)
bar_play(0.0, 'D', .5, arps=False, bassv=.6)
for k in range(1, 5): bar_play(k * BAR, PROG[k % 4], .55 + .03 * k, arps=True)
# 11.1: Nana is added: the ping, then the mood tightens (tempo feel doubles), a held pad underneath
t = 12.0
add(music, pad([mtof(50), mtof(57), mtof(62)], 6.0, .6, 1.0, 1.8), 11.2, .3)
for k in range(2): bar_play(t + k * BAR, ['Bm', 'Em'][k], .6, arps=True, fast=True, shk=True)
bar_play(t + 2 * BAR, 'A', .65, fast=True, shk=True, oct_=0)            # up to the scroll-back at 17.0
# 17.0 - 22: the scribble of recalls: a falling pluck line, each hit on the recall
for et in ev_t('recall'):
    for j, m in enumerate([81, 79, 76, 74]): add(music, kalimba(mtof(m - 12 * 0), .7, .6), et + .02 + j * .07, .16, .4 - .25 * j)
# the first silence 22.4-28.4: nothing but the keys, the room and Nana's blips. (the gate below)
# 28.5: the voice. A held D under it, very low, then the warm return once she has finished
add(music, pad([mtof(50), mtof(57), mtof(62), mtof(66)], 9.0, .7, .9, 2.4), 28.6, .22)
vend = max(ev_t('voice')) + 6.4
for k, ch in enumerate(['D', 'G', 'Bm', 'A', 'D', 'G']):
    bar_play(vend + .15 + k * BAR, ch, .55 + .03 * k, arps=True, shk=(k > 1), bassv=.8)
# 44.8 - 47.6: second silence (gate). 47.6: Nana's reply lands on a D major chord, the banners ring above it
t_n = ev_t('in')[-1]
add(music, pad([mtof(50), mtof(57), mtof(62), mtof(66), mtof(74)], DUR - t_n + 1.0, .9, .8, 3.0), t_n - .05, .38)
add(music, bass(mtof(38), 4.0, .9), t_n, .5)
for j, m in enumerate([74, 78, 81, 86]): add(music, kalimba(mtof(m), 2.2, .6), t_n + .3 + j * .45, .22, -.4 + .27 * j)
shutter = ev_t('shutter')[0]
add(music, kalimba(mtof(86), 3.0, .8), shutter + .3, .3, 0); add(music, bass(mtof(26), 3.0, .9), shutter + .3, .4)
irm = lp(noise(1.8), 4500) * np.exp(-tv(1.8) / .6); irm /= np.sqrt((irm ** 2).sum())
music = music + np.stack([fftconvolve(music[:, c], irm * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1) * .06
gate = np.ones(N)
tys = sorted(ev_t('tt')); ty1 = [e for e in tys if 22.8 < e < 28.6]; ty3 = [e for e in tys if 45 < e < 47.8]
for a, b in [(min(ty1) - .45, 28.45), (min(ty3) - .4, t_n - .02)]:
    gate *= 1 - np.clip(np.minimum((tt - a) / .25, (b - tt) / .03), 0, 1) * ((tt > a) & (tt < b))
music *= gate[:, None]
# the same hole for the room's pops are not needed: only keys and blips are in those passages

# ---------------------------------------------------------------- voice
voice = np.zeros((N, 2)); vo = np.zeros(N)
x, sr = sf.read(os.path.join(HERE, 'voices', 'nana.wav')); x = x if x.ndim == 1 else x.mean(1)
x = soxr.resample(x, sr, SR).astype(np.float64); x = hp(x, 90, 2); x = lp(x, 9000, 2)
x = sfx.compress(x / np.abs(x).max(), .2, 3.5, .004, .09); x /= np.abs(x).max()
tv0 = ev_t('voice')[0]; add(voice, x, tv0 + .02, .85, 0); add(wet, x, tv0 + .02, .05)
vo[int((tv0) * SR):int((tv0) * SR) + len(x)] = 1
vo = uniform_filter1d(maximum_filter1d(vo, size=int(.4 * SR)), size=int(.25 * SR))

# ---------------------------------------------------------------- mix
mix = (fx * (1 - .45 * vo[:, None]) * 1.5 + wetr * .8 + keys * (1 - .5 * vo[:, None]) * 1.5 + blips * .85 + bed * 3.0
       + music * .17 * (1 - .5 * vo[:, None]) + voice * 1.25)
sf.write(os.path.join(HERE, 'out', 'premix.wav'), mix.astype(np.float32), SR)
out = np.zeros_like(mix)
for c in (0, 1):
    y = sfx.compress(mix[:, c], .22, 3.0, .004, .12); k = .3; y = k * np.tanh(y / k); out[:, c] = sfx.limit(y, .3, .005)
sf.write(os.path.join(HERE, 'mix.wav'), out.astype(np.float32), SR)
rms = lambda a: 20 * np.log10(np.sqrt(np.mean(a ** 2)) + 1e-9)
print('mix.wav', DUR, 's | rms dB: fx %.1f keys %.1f blips %.1f music %.1f voice %.1f bed %.1f mix %.1f peak %.2f' % (rms(fx), rms(keys), rms(blips), rms(music), rms(voice[voice != 0]), rms(bed), rms(out), np.abs(out).max()))
if os.environ.get('DIAG'):
    for a in range(0, int(DUR), 3):
        s = slice(a * SR, (a + 3) * SR)
        print('%3d fx %6.1f keys %6.1f blip %6.1f music %6.1f voice %6.1f bed %6.1f mix %6.1f' % (a, rms(fx[s]), rms(keys[s]), rms(blips[s]), rms(music[s]), rms(voice[s]), rms(bed[s]), rms(out[s])))
