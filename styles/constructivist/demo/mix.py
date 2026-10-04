"""Score + foley for "Thirty Metres": reads out/events.json (the picture's own timeline) and writes out/mix.wav and out/score_cues.json.
A brass band playing a factory: drums, muted trumpet and trombone stabs, pizzicato bass, accordion; print-and-paper foley.
Everything is synthesised with numpy (no downloads, no samples, no voice)."""
import json, os, sys, zlib
import numpy as np, soundfile as sf
from scipy.signal import lfilter

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(LIB, 'core', 'audio'))
import sfx
from sfx import SR, t_, env_exp, lp, hp, bp, noise, add, thump, whoosh, norm

ev_all = json.load(open(os.path.join(HERE, 'out', 'events.json')))
DUR = ev_all['dur']; EV = ev_all['ev']
meta = [e for e in EV if e['type'] == 'meta'][0]
BPM = meta['bpm']; BEAT = 60 / BPM; BAR = BEAT * 4
N = int((DUR + 1.0) * SR)
rng = np.random.default_rng(23)
mtof = lambda m: 440.0 * 2 ** ((m - 69) / 12)
mus = np.zeros((N, 2)); fx = np.zeros((N, 2))
def put(x, t, g=1.0, pan=0.0, to=mus): add(to, x, t, g, pan)

# ---------- instruments ----------
def kick(v=1):
    d = .34; tt = t_(d); f = 46 + 95 * np.exp(-tt / .028)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .11) + hp(noise(d), 2200) * np.exp(-tt / .004) * .35) * v
def snare(v=1):
    d = .26; tt = t_(d)
    return (bp(noise(d), 1500, 7500) * np.exp(-tt / .075) + np.sin(2 * np.pi * 185 * tt) * np.exp(-tt / .05) * .6) * v
def rim(v=1):
    d = .08; tt = t_(d); return (np.sin(2 * np.pi * 1750 * tt) * np.exp(-tt / .012) + hp(noise(d), 3200) * np.exp(-tt / .006) * .6) * v
def hat(v=1, o=False):
    d = .2 if o else .05; return hp(noise(d), 7500) * np.exp(-t_(d) / (.07 if o else .014)) * v
def tom(f, v=1):
    d = .4; tt = t_(d); return (np.sin(2 * np.pi * f * (1 - .22 * tt) * tt) * np.exp(-tt / .13) + hp(noise(d), 1500) * np.exp(-tt / .01) * .2) * v
def crash(v=1):
    d = 2.0; return (hp(noise(d), 3800) * np.exp(-t_(d) / .6)) * v
def bass(f, d):
    tt = t_(d); saw = 2 * ((tt * f) % 1) - 1
    x = lp(saw * .5, 650) + np.sin(2 * np.pi * f * tt) * .9 + np.sin(2 * np.pi * 2 * f * tt) * .28 + np.sin(2 * np.pi * 3 * f * tt) * .14
    return x * np.exp(-tt / (d * .45)) * np.minimum(1, tt / .005)
def brass(f, d, v=1.0, mute=True):
    tt = t_(d); x = 0
    for dt in (-.005, 0, .005): x = x + (2 * ((tt * f * (1 + dt)) % 1) - 1)
    x = (lp(x / 3, 2600) * .55 + bp(x / 3, 1000, 3000) * .5) if mute else lp(x / 3, 2200)
    x = x * (1 + .06 * np.sin(2 * np.pi * 5.4 * tt)); e = np.minimum(1, tt / .014) * np.exp(-tt / (d * .5)); return x * e * v
def accordion(f, d, v=1.0):
    tt = t_(d); x = 0
    for dt in (-.007, .007): x = x + (2 * ((tt * f * (1 + dt)) % 1) - 1) + .5 * (2 * ((tt * f * 2 * (1 + dt)) % 1) - 1)
    x = bp(x, f * .8, 5200) * (1 + .12 * np.sin(2 * np.pi * 6.3 * tt))
    return x * np.minimum(1, tt / .06) * np.minimum(1, (d - tt) / .12) * v * .5

def chord(notes, t, d, fn, g=1.0, pan=0.0, to=mus):
    for k, m in enumerate(notes): put(fn(mtof(m), d), t, g / len(notes) ** .5, pan + (k - len(notes) / 2) * .08, to)

# ---------- foley: print and paper ----------
def pageslap(v=1):
    d = .3; tt = t_(d); return norm(bp(noise(d), 250, 3500) * np.exp(-tt / .04) + np.sin(2 * np.pi * 85 * tt * (1 - .3 * tt)) * np.exp(-tt / .09)) * v
def felt(v=1):                                    # wood block landing on felt
    d = .22; tt = t_(d); return norm(np.sin(2 * np.pi * 120 * tt * (1 - .2 * tt)) * np.exp(-tt / .06) + lp(noise(d), 900) * np.exp(-tt / .02) * .7) * v
def clack(v=1, p=1.0):
    d = .1; tt = t_(d); return norm(hp(noise(d), 1500) * np.exp(-tt / .004) + np.sin(2 * np.pi * 1250 * p * tt) * np.exp(-tt / .02) * .6 + np.sin(2 * np.pi * 2400 * p * tt) * np.exp(-tt / .012) * .4) * v
def scratch(d=.35, v=1):                          # ruling pen
    tt = t_(d); return norm(bp(noise(d), 2500, 7000) * (.5 + .5 * np.sin(2 * np.pi * 38 * tt)) * np.minimum(1, tt / .02) * np.minimum(1, (d - tt) / .05)) * v
def crackle(d=.5, v=1):                           # megaphone
    tt = t_(d); x = bp(noise(d), 700, 3200); x = np.tanh(x * 9) * (.6 + .4 * np.sign(np.sin(2 * np.pi * 70 * tt))); return norm(x * np.minimum(1, tt / .01) * np.exp(-tt / (d * .5))) * v
def wood(v=1, f=820):
    d = .14; tt = t_(d); return norm(np.sin(2 * np.pi * f * tt) * np.exp(-tt / .02) + np.sin(2 * np.pi * f * 1.7 * tt) * np.exp(-tt / .012) * .5 + hp(noise(d), 2000) * np.exp(-tt / .004) * .4) * v
def rivet(v=1):
    d = .1; tt = t_(d); return norm(hp(noise(d), 3000) * np.exp(-tt / .006) + np.sin(2 * np.pi * 3400 * tt) * np.exp(-tt / .015) * .5) * v
def sweep(d, v=1):
    n = noise(d); tt = t_(d); out = np.zeros_like(n)
    for i in range(0, len(n), 960):
        hi = min(len(n), i + 960); f = 500 + 3800 * (i / len(n)) ** 1.5; out[i:hi] = bp(n[max(0, i - 3000):hi], f * .7, f * 1.3)[-(hi - i):]
    return norm(out * (tt / d) ** 1.5 * np.minimum(1, (d - tt) / .05)) * v
def whistle(v=1):
    d = .42; tt = t_(d); f = 2700 + 160 * np.sin(2 * np.pi * 14 * tt); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .25) * .5 * v

# ---------- the score (drums, bass, brass, accordion) ----------
cues = []
def T(bar, beat=0): return bar * BAR + beat * BEAT
E2, G2, A2, B2, D3, E3 = 40, 43, 45, 47, 50, 52
silent = [(e['t'], e['t'] + e['d']) for e in EV if e['type'] == 'quiet']
hard_stop = 28.5                               # music stops here; the first sound after the second silence is the baton knock at 35.0
def live(t): return not any(a <= t < b for a, b in silent) and not (28.5 <= t < 30.0)

def groove(t0, bars, kit='basic', bassp=True, hats=True, stabs=False, accord=False, fill=False):
    for b in range(bars):
        tb = t0 + b * BAR
        for beat in range(4):
            t = tb + beat * BEAT
            if not live(t): continue
            if kit == 'floor' or beat in (0, 2): put(kick(.95 if beat in (0, 2) else .6), t, .9)
            if beat in (1, 3): put(snare(1.0), t, .8)
            if kit != 'basic' and beat == 3: put(rim(.7), t + BEAT * .5, .5)
            if hats:
                put(hat(.45), t, .35); put(hat(.3), t + BEAT * .5, .3)
                if kit == 'floor': put(hat(.2), t + BEAT * .25, .2); put(hat(.2), t + BEAT * .75, .2)
        if kit != 'basic': put(kick(.7), tb + 1.5 * BEAT, .7) if live(tb + 1.5 * BEAT) else None
        if bassp:
            pat = [(0, E2, .9), (1, E2, .45), (1.5, G2, .4), (2, A2, .9), (3, B2 if b % 2 else G2, .9), (3.5, A2, .4)]
            for beat, m, d in pat:
                t = tb + beat * BEAT
                if live(t): put(bass(mtof(m), d * BEAT * 1.6), t, .75, -.1)
        if stabs and b % 2 == 0:
            for beat, notes in [(0, [64, 67, 71]), (2.5, [62, 67, 69])]:
                t = tb + beat * BEAT
                if live(t): chord(notes, t, BEAT * .7, brass, .65, .15)
        if accord and live(tb): chord([52, 59, 64, 67] if b % 2 == 0 else [57, 64, 69, 72], tb, BAR * .98, accordion, .6, -.15)
def roll(t0, t1, v0=.35, v1=1.0, step=.125):
    n = int(round((t1 - t0) / step))
    for i in range(n): put(snare(v0 + (v1 - v0) * i / max(1, n - 1)), t0 + i * step, .7)

groove(T(0), 1, 'basic', bassp=False, hats=False)                    # bars 0: kick + snare enter
groove(T(1), 2, 'basic', bassp=True, hats=False, stabs=True)         # bars 1-2: bass, stabs
put(tom(130, .9), T(3, 0), .8); [put(tom(f, .9), T(3, b), .8) for b, f in [(.5, 105), (1, 90), (1.25, 80), (1.5, 130), (1.75, 105)]]
roll(7.0, 8.0, .3, 1.0)                                              # wipe 1
groove(8.0, 3, 'groove', stabs=True, accord=False)                   # sheet 2 (8-14)
roll(14.0, 15.0, .3, 1.0)                                            # wipe 2
groove(15.0, 3, 'groove', stabs=True, accord=True)                   # sheet 3: + accordion pad
roll(21.0, 22.0, .3, 1.0)                                            # wipe 3 (overlaps bar 10 of the groove)
groove(22.0, 3, 'floor', stabs=True, accord=True)                    # sheet 4: four on the floor
put(snare(1.2), 28.0, .9); roll(28.125, 28.5, .5, 1.0, .0625)        # the crack and the roll, then the stop
# the fail: first sound back after the first silence
fail_t = 30.0
put(kick(1.3), fail_t, 1.0); put(crash(1.0), fail_t, .9); put(thump(1.0, 48), fail_t, 1.0)
chord([64, 65, 71, 77], fail_t, 1.4, lambda f, d: brass(f, d, 1.2, False), .8)          # E over F: a wrong note
put(bass(mtof(E2), 1.5), fail_t, .9)
# return: after the second silence, one wood knock (35.0, from events), then the band builds
for i, b in enumerate([0, 1, 2, 3]): put(tom(95, .6 + .1 * i), 35.5 + b * BEAT, .6) if True else None
for i in range(8): put(bass(mtof([E2, E2, G2, A2][i % 4]), .45), 36.0 + i * BEAT, .7, -.1)
roll(37.0, 38.0, .3, 1.0)                                            # wipe 4
groove(38.0, 3, 'floor', stabs=True, accord=True)                    # the wall
groove(44.0, 1, 'floor', stabs=True, accord=True)
roll(45.0, 46.0, .3, 1.0)                                            # wipe 5
put(crash(.9), 46.0, .7)
groove(46.0, 1, 'basic', hats=False, stabs=True)                     # the card builds
# register moment at 48.0: everything together, then a held chord
put(kick(1.3), 48.0, 1.0); put(crash(1.1), 48.0, .9); put(snare(1.2), 48.0, .8)
chord([52, 59, 64, 67, 71], 48.0, 3.9, accordion, .9, -.1)
chord([64, 67, 71, 74], 48.0, 3.0, lambda f, d: brass(f, d, 1.0), .6, .15)
put(bass(mtof(E2 - 12 + 12), 3.8), 48.0, .85, -.1)
[put(hat(.35), 48.0 + k * BEAT, .25) for k in range(1, 7)]
put(kick(1.0), 51.5, .9); put(tom(80, 1.0), 51.5, .8)

# ---------- foley from the picture's events ----------
cue_list = []
for e in EV:
    t = e['t']
    if e['type'] == 'hit':
        k = e['kind']; q = round(t * 4) / 4
        cue_list.append({'id': e['id'], 't': q})
        if t >= 28.5 and t < 30.0: continue
        quiet = any(a <= t < b for a, b in silent)
        g = .35 if quiet else 1.0
        if k == 'slide': put(felt(.9), t, .7 * g, to=fx); put(clack(.5, .8), t, .25 * g, to=fx)
        elif k == 'paper': put(pageslap(.9), t, .75 * g, to=fx)
        elif k == 'type': put(clack(1.0, 1.0 + .1 * (zlib.crc32(e['id'].encode()) % 5) / 5), t, .55 * g, to=fx); put(felt(.6), t, .3 * g, to=fx)
        elif k == 'rule': put(scratch(.3, .9), t, .35 * g, to=fx)
        elif k == 'cone': put(crackle(.55, .9), t, .45 * g, to=fx)
        elif k == 'baton': put(wood(1.0), t, .55 * g, to=fx); put(pageslap(.5), t, .25 * g, to=fx)
        elif k == 'knock': put(wood(1.2, 640), t, .9, to=fx); put(thump(.9, 60), t, .6, to=fx)
        elif k == 'cut': put(pageslap(1.3), t, .9, to=fx)
        elif k == 'register': put(thump(1.0, 52), t, .9, to=fx)
        if quiet and k in ('type',): put(rivet(.8), t, .5, to=fx)
        # a drum accent on every picture hit that is not already carried by the score: a tom, tuned from the id
        if not quiet and k in ('slide', 'paper', 'type') and live(t): put(tom(150 + 18 * (zlib.crc32(e['id'].encode()) % 6), .5), t, .22)
    elif e['type'] == 'wipe':
        put(sweep(e['d'] + .1, 1.0), t - .05, .6, to=fx); put(whoosh(e['d'], .9), t, .35, to=fx)
    elif e['type'] == 'cut':
        pass
# ambience: room tone and a far crowd, thin in the silences; one far whistle before the cut
amb = np.zeros((N, 2)); room = lp(noise(DUR + 1), 500) * .02 + bp(noise(DUR + 1), 300, 1800) * .018
crowd_env = np.interp(np.arange(N) / SR, [0, 30, 36, 39, 45, 48, 52, 53], [.35, .35, .3, 1.0, 1.0, .5, .3, .2])
amb[:, 0] = room[:N] * crowd_env
amb[:, 1] = amb[:, 0] * .96
put(whistle(.7), 29.25, .35, 0.4, to=fx)

# ---------- balance ----------
gain = np.ones(N)
for a, b in silent + [(28.5, 30.0)]:                 # real silences: the band is gated, 30 ms edges
    r = int(.03 * SR); i, j = int(a * SR), int(b * SR) - r
    gain[i - r:i] *= np.linspace(1, 0, r); gain[i:j] = 0; gain[j:j + r] *= np.linspace(0, 1, r)
mus *= gain[:, None]
# the fail hit happens at the end of the first silence; keep it outside the gate
for e in EV:
    if e['type'] == 'hit' and e['id'] == 'e:cut': pass
echo = np.zeros_like(mus); d1 = int(.12 * SR); echo[d1:] += mus[:-d1] * .15
mus = mus + echo
mix = mus * .5 + fx * 1.0 + amb * 1.0
mix = np.tanh(mix * .9)
mix = np.stack([sfx.limit(sfx.compress(mix[:, c], thr=.3, ratio=3), ceil=.5) for c in (0, 1)], 1)
mix = mix[: int(DUR * SR) + 1]
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
json.dump(cue_list, open(os.path.join(HERE, 'out', 'score_cues.json'), 'w'))
print('mix.wav', len(mix) / SR, 's, peak', float(np.abs(mix).max()), 'cues', len(cue_list))
