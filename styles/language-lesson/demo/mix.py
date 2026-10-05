"""Foley, score and voice -> mix.wav for "Three Little Words" (language-lesson demo).
Everything is numpy synthesis: no samples. The score is a soft marimba/bass/pad loop (C major, 96 BPM, 2.5 s bars) that
thins out for the questions, drops to silence during every think pause (only the ticking is left), and opens up for the
montage. Sound effects are placed from events.json (core/render/events.mjs); the voice from timeline.json + voices/*.wav.
usage: .venv/bin/python styles/language-lesson/demo/mix.py
"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
from scipy.ndimage import uniform_filter1d
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, bp, lp, hp

TL = json.load(open(os.path.join(HERE, 'timeline.json')))
EVJ = json.load(open(os.path.join(HERE, 'events.json')))
EV, DUR = EVJ['ev'], TL['dur']
M, LN = TL['marks'], TL['lines']
N = int((DUR + .5) * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(93)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def tv(d): return np.arange(int(round(d * SR))) / SR
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def add(buf, x, at, gain=1.0, pan=0.0):
    s = int(round(at * SR))
    if s >= len(buf) or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[s:e, 0] += x[:e - s] * gain * l * 1.414; buf[s:e, 1] += x[:e - s] * gain * r * 1.414
def evs(type_): return [e for e in EV if e['type'] == type_]
def curve(pts):
    xs, ys = zip(*pts); return np.interp(tt, xs, ys)

# ---------------------------------------------------------------- instruments
def marimba(m, d=.8, v=1.0):
    f = mtof(m); t = tv(d)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / .34) + .32 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t / .07) + .1 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t / .03)
    x += hp(noise(d), 3000) * np.exp(-t / .004) * .05
    return x * np.clip(t / .002, 0, 1) * v
def bass(m, d=1.0, v=1.0):
    f = mtof(m); t = tv(d)
    x = np.sin(2 * np.pi * f * t) + .45 * np.sin(2 * np.pi * 2 * f * t) + .18 * np.sin(2 * np.pi * 3 * f * t)
    return x * np.exp(-t / .55) * np.clip(t / .01, 0, 1) * np.clip((d - t) / .05, 0, 1) * v
def pad(ms, d, v=1.0):
    t = tv(d); x = np.zeros_like(t)
    for m in ms:
        for det in (-.004, .004):
            f = mtof(m) * (1 + det); x += 2 * ((t * f) % 1) - 1
    x = lp(x / (len(ms) * 2), 1100, 2)
    return x * np.clip(t / .9, 0, 1) * np.clip((d - t) / .9, 0, 1) * v
def shaker(v=1.0):
    d = .09; t = tv(d); return bp(noise(d), 5500, 9500) * np.exp(-t / .02) * np.clip(t / .003, 0, 1) * v
CH = [  # chord roots (bass) and eighth-note patterns for each bar of the 4-bar loop
    (36, [72, 76, 79, 84, 79, 76, 79, 76], [60, 64, 67]),
    (33, [69, 72, 76, 81, 76, 72, 76, 72], [57, 60, 64]),
    (29, [65, 69, 72, 77, 72, 69, 72, 69], [53, 57, 60]),
    (31, [67, 71, 74, 79, 74, 71, 74, 71], [55, 59, 62]),
]
BAR = 2.5; EIGHTH = BAR / 8

# ---------------------------------------------------------------- the score
sec = {  # layer gain over time: (time, gain) points; think pauses are muted below
    'mar':  [(0, 0), (.3, 1), (M['cover.out'], .9), (M['cover.out'] + .5, .45), (M['A.out'], .4), (M['A.out'] + .5, .45), (M['B.out'], .45), (M['MON'], 1), (M['HOOK'], 1), (M['HOOK'] + .6, .35), (DUR, .2)],
    'bass': [(0, 0), (.4, 1), (M['cover.out'], 1), (M['A.in'], .7), (M['MON'], .9), (M['HOOK'] + .6, .6), (DUR, .5)],
    'pad':  [(0, 0), (M['B.out'], 0), (M['MON'], 1), (M['HOOK'] - .1, 1), (M['HOOK'] + .6, .8), (DUR, .8)],
    'shk':  [(0, 0), (.3, 1), (M['cover.out'], 1), (M['cover.out'] + .4, 0), (M['MON'] - .2, 0), (M['MON'] + .3, 1), (M['HOOK'], 1), (M['HOOK'] + .5, 0), (DUR, 0)],
}
mute = np.ones(N)
for k in ['A', 'B']:
    a, b = M[k + '.think0'], M[k + '.think1']; mute *= 1 - np.clip((tt - a + .12) / .12, 0, 1) * np.clip((b + .12 - tt) / .1, 0, 1)
for a in [M['H.ring0'] - .4]:          # the hook: the music steps back for the ticking and stays down to the end
    mute *= 1 - .75 * np.clip((tt - a) / .4, 0, 1)
for a in [(m, m + 1.0) for m in [M['MON.1'], M['MON.2'], M['MON.3']]]:
    pass
# montage think moments (about 1 s each) get a short dip as well
for m in [M['MON.1'], M['MON.2']]:
    a, b = m + 1.0, m + 2.0; mute *= 1 - .7 * np.clip((tt - a + .1) / .1, 0, 1) * np.clip((b + .1 - tt) / .1, 0, 1)

MUS = np.zeros((N, 2))
bars = int(np.ceil((DUR + .5) / BAR))
for b in range(bars):
    t0 = b * BAR; bass_m, pat, ch = CH[b % 4]
    add(MUS, bass(bass_m + 12 if bass_m < 33 else bass_m + 12, BAR * .46, .5), t0, curve(sec['bass'])[int(t0 * SR)] if t0 < DUR else 0, -.1)
    add(MUS, bass(bass_m + 12, BAR * .46, .38), t0 + BAR / 2, curve(sec['bass'])[min(N - 1, int((t0 + BAR / 2) * SR))], -.1)
    gm = curve(sec['mar']); busy = t0 + 0.1 >= M['MON'] and t0 < M['HOOK']
    for i, n in enumerate(pat):
        tt0 = t0 + i * EIGHTH
        g = gm[min(N - 1, int(tt0 * SR))]
        if g <= .01: continue
        quiet = g < .6
        if quiet and i % 2: continue                                    # in the quizzes the marimba plays quarters only
        vel = (.34 if i % 4 else .44) * (1.0 if not quiet else .9)
        add(MUS, marimba(n, .8, vel), tt0, g, -.35 + .7 * (i % 3) / 2)
        if busy and i % 2 == 0: add(MUS, marimba(n + 12, .5, .13), tt0 + EIGHTH / 2, g, .4)   # montage: a shimmer on the off-eighths
    gs = curve(sec['shk'])
    for i in range(16):
        t1 = t0 + i * EIGHTH / 2
        if t1 < DUR and gs[int(t1 * SR)] > .05 and (i % 2 == 1 or busy): add(MUS, shaker(.5 if i % 4 == 3 else .28), t1, gs[int(t1 * SR)] * .6, .3)
    gp = curve(sec['pad'])[min(N - 1, int(t0 * SR))]
    if gp > .02: add(MUS, pad(ch + [ch[0] + 12], BAR + .6, .55), t0, gp * .5, 0)
MUS *= mute[:, None]

# ---------------------------------------------------------------- the sounds of the cards
def whoosh(d, up=True, v=1.0):
    t = tv(d); x = bp(noise(d), 500, 3800, 2); f = (t / d) if up else 1 - t / d
    return x * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.6 * (.4 + .6 * f) * v
def pat_snd(v=1.0):          # a card settling on the desk
    d = .16; t = tv(d); return (lp(noise(d), 700) * np.exp(-t / .03) + np.sin(2 * np.pi * 120 * t * (1 - .3 * t / d)) * np.exp(-t / .05) * .8) * v
def slide_in(): d = .5; w = whoosh(d, True, .5); p = pat_snd(.7); out = np.zeros(int(.62 * SR)); out[:len(w)] += w; out[int(.4 * SR):int(.4 * SR) + len(p)] += p; return out
def slide_out(): return whoosh(.38, False, .4)
def pop(i=0, v=1.0):
    d = .14; t = tv(d); f0 = 380 * 2 ** (i * 2 / 12); f = f0 * (1 + 1.4 * (1 - np.exp(-t / .02)))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .05) + .3 * np.sin(2 * np.pi * np.cumsum(f * 2) / SR) * np.exp(-t / .02)) * np.clip(t / .002, 0, 1) * v
def tick(k, last=False, v=1.0):   # tick-tock on a wood block
    d = .09; t = tv(d); f = (1250 if k % 2 == 0 else 900) * (1.25 if last else 1)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / .014) + .5 * np.sin(2 * np.pi * f * 2.4 * t) * np.exp(-t / .007) + hp(noise(d), 2500) * np.exp(-t / .003) * .3) * np.clip(t / .0008, 0, 1) * v
def tickend(v=1.0):
    d = .25; t = tv(d); f = 520 + 380 * (1 - np.exp(-t / .03)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .07) * np.clip(t / .003, 0, 1) * v
def ribbon_snd(v=1.0):
    w = whoosh(.28, True, .5); d = .45; t = tv(d); b = np.sin(2 * np.pi * 659 * t) * np.exp(-t / .12) * .6 + np.sin(2 * np.pi * 988 * t) * np.exp(-t / .1) * .3
    out = np.zeros(int(.75 * SR)); out[:len(w)] += w; out[int(.22 * SR):int(.22 * SR) + len(b)] += b; return out * v
def tag_snd(v=1.0):
    d = .3; t = tv(d); a = np.sin(2 * np.pi * 784 * t) * np.exp(-t / .07); b = np.sin(2 * np.pi * 1175 * t) * np.exp(-t / .09)
    out = a * .6; sft = int(.09 * SR); out[sft:] += b[:len(out) - sft] * .7; return out * np.clip(t / .003, 0, 1) * v
def scratch(d, v=1.0):       # a pencil writing: short strokes of band-passed noise, direction changing
    n = int(d * SR); x = np.zeros(n); t = np.arange(n) / SR; k = 0; pos = 0
    while pos < n:
        L = int(rng.uniform(.045, .09) * SR); seg = bp(noise(L / SR), 1800 + rng.uniform(-300, 600), 6500, 2) * np.hanning(L) * rng.uniform(.5, 1)
        e = min(n, pos + L); x[pos:e] += seg[:e - pos]; pos += int(L * .8)
    return x / (np.abs(x).max() + 1e-9) * v * np.clip(t / .03, 0, 1) * np.clip((d - t) / .05, 0, 1)
def ding(v=1.0):             # a small bright bell in C, with a sparkle run
    d = 1.6; t = tv(d); x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / tau) for f, a, tau in [(1046.5, 1, .55), (2093, .45, .3), (3136, .22, .18), (1568, .3, .45), (4186, .1, .08)])
    sp = np.zeros_like(t)
    for k, f in enumerate([1568, 2093, 2637, 3136]):
        s0 = int((.05 + .06 * k) * SR); u = tv(.4); sp[s0:s0 + len(u)] += (np.sin(2 * np.pi * f * u) * np.exp(-u / .08))[:len(sp) - s0] * .25
    return (x * .7 + sp) * np.clip(t / .002, 0, 1) * v
def flip(v=1.0):
    d = .36; t = tv(d); x = bp(noise(d), 1200, 7000, 2) * np.sin(np.pi * t / d) ** 2 * .8; sft = int(.17 * SR); x[sft:sft + 400] += hp(noise(400 / SR), 2000) * .5
    return x * v
def word_snd(i, slow, v=1.0):
    return marimba([72, 74, 76, 79, 81][i % 5], .35, .5) * v
def dot_snd(v=1.0): return pop(4, v * .7)
def title_snd(v=1.0): return whoosh(.3, True, .35) * v
def hop_snd(v=1.0):
    d = .22; t = tv(d); f = 320 * np.exp(-t / .12) + 140; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .09) * np.clip(t / .004, 0, 1) * v

FOL = np.zeros((N, 2))
wi = {}
for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'slide': add(FOL, slide_in() if e.get('dir') == 'in' else slide_out(), t, .5 if e.get('dir') == 'in' else .35, 0)
    elif ty == 'chip': add(FOL, pop(e.get('i', 0)), t, .42, (e.get('i', 0) - 1) * .2)
    elif ty == 'tick': add(FOL, tick(e['k'], False), t, .5, .1)
    elif ty == 'tickend': add(FOL, tickend(), t + .02, .35, 0)
    elif ty == 'ribbon': add(FOL, ribbon_snd(), t, .5, 0)
    elif ty == 'tag': add(FOL, tag_snd(), t, .42, .15)
    elif ty == 'scratch': add(FOL, scratch(e['d']), t, .55, -.1)
    elif ty == 'ding': add(FOL, ding(), t, .55, 0)
    elif ty == 'flip': add(FOL, flip(), t, .4, 0)
    elif ty == 'word':
        k = round(t * 100); g = wi.setdefault('w', []); g.append(t); idx = 0
        # index within its pass: words of one pass are < 1.2 s apart
        idx = 0
        for u in reversed(g[:-1]):
            if t - u < 1.2: idx += 1
            else: break
        add(FOL, word_snd(idx, e.get('slow', 0)), t, .16, .2)
    elif ty == 'dot': add(FOL, dot_snd(), t + .1, .3, 0)
    elif ty == 'title': add(FOL, title_snd(), t - .3, .35, 0)
    elif ty == 'hop': add(FOL, hop_snd(), t, .3, 0)

# ---------------------------------------------------------------- the voice
VOI = np.zeros((N, 2))
VD = os.path.join(HERE, 'voices')
for i, T in LN.items():
    y, sr = sf.read(os.path.join(VD, i + '.wav'))
    if y.ndim > 1: y = y.mean(1)
    y = soxr.resample(y, sr, SR, quality='HQ')
    y = hp(y, 70, 2); rms = np.sqrt(np.mean(y ** 2)) + 1e-9; y = y * (.115 / rms)           # even loudness per line
    y = sfx.compress(y, thr=.18, ratio=3.0, att=.004, rel=.08); y = sfx.limit(y, .5)
    fade = np.ones(len(y)); n = int(.012 * SR); fade[:n] = np.linspace(0, 1, n); fade[-n:] = np.linspace(1, 0, n)
    add(VOI, y * fade, T['t0'], 1.0, 0)
vact = uniform_filter1d(np.abs(VOI[:, 0]), int(.25 * SR))
duck = 1 - .55 * np.clip(vact / .03, 0, 1)
duck = uniform_filter1d(duck, int(.12 * SR))
FOLD = 1 - .35 * np.clip(vact / .03, 0, 1)                                                      # effects sit a little under the voice

mix = VOI * 1.0 + MUS * 0.30 * duck[:, None] + FOL * 0.9 * FOLD[:, None]
# low end: 20-120 Hz kept around -3 dB under the rest (no sub rumble)
for c in range(2): mix[:, c] = hp(mix[:, c], 45, 2)
for c in range(2): mix[:, c] = sfx.limit(mix[:, c], .92)
sf.write(os.path.join(HERE, 'mix.wav'), mix[:int(DUR * SR)].astype(np.float32), SR)
def db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
print('mix.wav', round(DUR, 2), 's | rms dB: voice', round(db(VOI[:, 0]), 1), 'music', round(db(MUS[:, 0] * .3 * duck), 1), 'fx', round(db(FOL[:, 0] * .9), 1))
if os.environ.get('MIXDEBUG'):
    act = vact > .03
    def r(x): return round(db(x[act]), 1)
    print('in speech: voice', r(VOI[:, 0]), 'music', r(MUS[:, 0] * .3 * duck), 'fx', r(FOL[:, 0] * .9 * FOLD), '| outside speech: music', round(db((MUS[:, 0] * .3 * duck)[~act]), 1), 'fx', round(db((FOL[:, 0] * .9)[~act]), 1))
    for a, b, nm in [(M['A.think0'], M['A.think1'], 'think A'), (M['H.ring0'], DUR, 'hook end')]:
        s0, s1 = int(a * SR), int(b * SR); print(nm, 'music', round(db(MUS[s0:s1, 0] * .3), 1), 'fx', round(db(FOL[s0:s1, 0]), 1))
