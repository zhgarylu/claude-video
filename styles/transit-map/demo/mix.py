"""Score + foley + beds + voice -> mix.wav for "Three Angles to Anywhere".
Everything is synthesised in numpy (no samples). Reads timeline.json (tools/export_tl.mjs) and voices/ (core/tts/tts.py).
usage: .venv/bin/python styles/transit-map/demo/mix.py [workdir]   (default: the demo folder)
"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
from scipy.signal import fftconvolve
from scipy.ndimage import maximum_filter1d, uniform_filter1d
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, t_, bp, lp, hp, env_exp, norm

W = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else HERE
TL = json.load(open(os.path.join(W, 'timeline.json')))
T, EV, VO, LEGS, LEGLEN = TL['T'], TL['EV'], TL['VO'], TL['LEGS'], TL['legLen']
DUR, BEAT, BAR = TL['DUR'], TL['BEAT'], TL['BAR']
N = int(DUR * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(76)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def stereo(): return np.zeros((N, 2))
def bump(t, a, b, fa=.2, fb=.2): return np.clip((t - a) / fa, 0, 1) * np.clip((b - t) / fb, 0, 1)
def add(buf, x, at, gain=1.0, pan=0.0): sfx.add(buf, x, at, gain, pan)

# ------------------------------------------------------------------------------------------------ instruments
def marimba(m, d=.6, v=1.0):
    f = mtof(m); n = int(max(d, .5) * SR); x = np.arange(n) / SR
    tau = np.clip(.55 - .0045 * (m - 48), .12, .5)
    body = np.sin(2 * np.pi * f * x) * np.exp(-x / tau) + .38 * np.sin(2 * np.pi * f * 3.97 * x) * np.exp(-x / (tau * .22)) + .12 * np.sin(2 * np.pi * f * 9.2 * x) * np.exp(-x / .02)
    tk = hp(rng.standard_normal(int(.02 * SR)), 1800) * np.exp(-np.arange(int(.02 * SR)) / SR / .003)
    body[:len(tk)] += tk * .35
    return body * v * np.minimum(1, x / .002)
def vibes(m, d=1.6, v=1.0):
    f = mtof(m); n = int(d * SR); x = np.arange(n) / SR
    trem = 1 + .22 * np.sin(2 * np.pi * 4.6 * x)
    y = (np.sin(2 * np.pi * f * x) + .22 * np.sin(2 * np.pi * f * 4.0 * x) * np.exp(-x / .25) + .08 * np.sin(2 * np.pi * f * 10.0 * x) * np.exp(-x / .05)) * np.exp(-x / (1.1 if m < 80 else .7)) * trem
    return y * v * np.minimum(1, x / .004) * np.minimum(1, (d - x) / .15)
def bell(f, d=2.2, v=1.0, bright=1.0):
    n = int(d * SR); x = np.arange(n) / SR; env = np.exp(-x / (d * .32))
    mod = bright * 2.6 * np.exp(-x / .35)
    y = np.sin(2 * np.pi * f * x + mod * np.sin(2 * np.pi * f * 3.5 * x)) * env + .25 * np.sin(2 * np.pi * f * 2.0 * x) * np.exp(-x / (d * .2))
    return y * v * np.minimum(1, x / .002)
def bass(m, d=.9, v=1.0):
    f = mtof(m); n = int(d * SR); x = np.arange(n) / SR
    y = np.sin(2 * np.pi * f * x) + .45 * np.sin(2 * np.pi * 2 * f * x) * np.exp(-x / .3) + .18 * np.sin(2 * np.pi * 3 * f * x) * np.exp(-x / .18)
    return y * v * np.minimum(1, x / .005) * np.exp(-x / (d * .8)) * np.minimum(1, (d - x) / .05)
def pad(ms, d, v=1.0, cut=1400):
    n = int(d * SR); x = np.arange(n) / SR; y = np.zeros(n)
    for m in ms:
        for det in (-.07, 0, .07):
            f = mtof(m + det); ph = 2 * np.pi * np.cumsum(np.full(n, f)) / SR
            y += 2 * ((ph / (2 * np.pi)) % 1) - 1
    y = lp(y, cut, 2) / (len(ms) * 3)
    a = min(1.6, d * .4); r = min(1.8, d * .4)
    return y * v * np.minimum(1, x / a) * np.minimum(1, (d - x) / r)
def tick(v=1.0, f=6500):
    d = .03; return norm(hp(noise(d), f * .5) * env_exp(d, .0035)) * v
def kick(v=1.0):
    d = .22; x = t_(d); f = 52 + 70 * np.exp(-x / .03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / .09) * v
def felt(v=1.0, f=95):
    d = .25; x = t_(d); return (np.sin(2 * np.pi * f * x * (1 - .2 * x)) * np.exp(-x / .06) + lp(noise(d), 500) * np.exp(-x / .015) * .5) * v
def paper(d=.4, v=1.0):
    x = t_(d); e = np.sin(np.pi * x / d) ** 2
    return bp(noise(d), 900, 6500) * e * v
def shimmer(d, v=1.0, f0=3000):
    x = t_(d); return bp(noise(d), f0, f0 * 2.2) * np.exp(-x / (d * .35)) * v

# ------------------------------------------------------------------------------------------------ busses
foley = stereo(); musbus = stereo(); bed = stereo(); belbus = stereo()
PENT = [67, 69, 71, 74, 76, 79, 81, 83, 86, 88]       # G A B D E, two octaves up from G4
LINEPAN = {'copper': -.4, 'violet': 0, 'fern': -.6, 'ring': .2, 'saffron': .6}

# ---------------------------------------------------------------- beds
# paper room and city wash, thinning as the map straightens; a concourse hum under the silence; the rails during the trip
room = lp(noise(DUR), 420, 2) * .035
city = bp(noise(DUR), 180, 1800, 2) * (.05 * bump(tt, 0, 13.0, 3.0, 4.0)) * (1 + .4 * np.sin(2 * np.pi * .13 * tt))
f0 = 98.0; ph = 2 * np.pi * np.cumsum(np.full(N, f0)) / SR
hum = (np.sin(ph) + .5 * np.sin(2 * ph + .4) + .25 * np.sin(3 * ph + 1.1) + .12 * np.sin(5 * ph)) * .05
hum_lvl = np.interp(tt, [0, 14.5, 15.2, 16.5, 29.5, 31.5, 33.5, 45.5, 46.3, 54], [0, 0, .18, .5, .5, .25, .25, .25, 0, 0]) \
    + .5 * bump(tt, 46.6, 54.5, 2.5, 3.0)
air = hp(lp(noise(DUR), 3000), 600) * .012
bed_mono = room + city + air * .6
# silence: near-nothing from 14.1 to 15.0 and 45.7 to 46.6
quiet = 1 - .92 * bump(tt, 14.1, 15.0, .08, .25) - .85 * bump(tt, 45.7, 46.6, .15, .3)
bed += np.stack([bed_mono * quiet + hum * hum_lvl] * 2, 1)

# the rails: wheels follow the train's speed; leg length from timeline.json
def train_state(t):
    for i, L in enumerate(LEGS):
        if L['t0'] <= t < L['t1']:
            u = (t - L['t0']) / (L['t1'] - L['t0']); sm = u ** 3 * (u * (6 * u - 15) + 10); dsm = 30 * u * u * (1 - u) ** 2
            return i, sm, dsm / (L['t1'] - L['t0'])
    return -1, 0, 0
dts = np.arange(0, DUR, .005); spd = np.zeros_like(dts); cumd = 0.0; clack_t = []; last = 0.0
for k, t in enumerate(dts):
    i, f, s = train_state(t); su = s * LEGLEN[i] if i >= 0 else 0.0   # units / second
    spd[k] = su; cumd += su * .005
    if cumd - last >= 1.15: clack_t.append((t, min(1.0, su / 3.0))); last = cumd
spd_a = np.interp(tt, dts, spd)
rum = lp(noise(DUR), 160, 2) * (.18 * np.clip(spd_a / 4.0, 0, 1.4)) + np.sin(2 * np.pi * 47 * tt) * .02 * np.clip(spd_a / 4, 0, 1)
rum += bp(noise(DUR), 700, 2400) * .018 * np.clip(spd_a / 4.0, 0, 1.4)
rum = sfx.hp(rum, 30)
rum *= np.minimum(1, np.interp(tt, [T['dep1'] - .3, T['dep1'] + .5, 45.5, 46.4], [0, 1, 1, 0]))
bed += np.stack([rum, rum], 1)
for i, (t, v) in enumerate(clack_t):
    for k, dt in enumerate((0, .075)):
        x = (hp(noise(.05), 900) * env_exp(.05, .006) + np.sin(2 * np.pi * (170 + 20 * k) * t_(.05)) * env_exp(.05, .012) * .7) * (1 if k == 0 else .6)
        add(foley, x, t + dt, .11 * v, (-.18 if i % 2 else .18))

# ---------------------------------------------------------------- foley from the picture's events
snaps = [e for e in EV if e['type'] == 'snap']
for e in EV:
    ty, t = e['type'], e['t']
    if ty == 'ping':
        f = e['f']; x = bell(f, 3.2, 1.0, .35) + .5 * np.sin(2 * np.pi * f * .5 * t_(3.2)) * env_exp(3.2, .9)
        add(belbus, x, t, .20, 0)
        for k in range(1, 4): add(belbus, bell(f * 2, 1.6, .5, .2), t + .28 * k, .05 / k, .0)   # the rings of the ping
    elif ty == 'pen':
        d = e['d']; x = bp(noise(d), 3200, 8000) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 13 * t_(d)))) * np.minimum(1, np.minimum(t_(d) / .05, (d - t_(d)) / .12))
        add(foley, x, t, .05, LINEPAN[e['line']])
    elif ty == 'river':
        d = e['d']; x = bp(noise(d), 260, 1400) * (.5 + .5 * np.sin(2 * np.pi * .9 * t_(d))) * np.minimum(1, np.minimum(t_(d) / .4, (d - t_(d)) / .6))
        add(foley, x, t, .085, -.2)
    elif ty == 'snap':
        k = snaps.index(e); m = PENT[min(k, len(PENT) - 1)] if k < len(PENT) else PENT[(k * 2) % len(PENT)] - 12 * (k % 2)
        add(foley, tick(1.0, 3000) * 1.2, t, .18, e['x'] * .8)
        add(musbus, marimba(m, .5, .8), t, .30, e['x'] * .7)
    elif ty == 'tickset':
        add(foley, tick(1.0, 4500 + (e['i'] % 5) * 600), t, .10, e['x'] * .8)
    elif ty == 'ringset':
        add(belbus, bell(mtof(88 + (e['i'] % 3) * 2), .6, .6, .3), t, .05, e['x'] * .8)
    elif ty == 'lock':
        for k, (m, dt) in enumerate([(79, 0), (83, .14), (86, .28), (91, .42)]):
            add(belbus, bell(mtof(m), 1.5, 1.0, 1.0), t + dt, .17 - .02 * k, 0)
        add(belbus, bell(mtof(85), 1.4, .5, .6), t + .42, .06, .2)    # the C sharp: lydian lift
        add(foley, felt(1.0, 70), t, .25, 0)
    elif ty == 'wipe':
        add(foley, paper(.55, 1.0), t, .22, 0.2)
        add(foley, hp(noise(.5), 1500) * env_exp(.5, .1), t, .018, 0)
    elif ty == 'ghost':
        add(foley, bp(noise(.5), 2500, 7000) * (np.abs(np.sin(2 * np.pi * 9 * t_(.5))) ** 2) * np.minimum(1, t_(.5) / .1), t, .06, -.3)
    elif ty == 'angsnap':
        add(foley, tick(1.0, 2200) * 2.0, t, .32, 0); add(foley, felt(1.0, 120), t, .25, 0)
        add(musbus, vibes(79, .9, 1.0), t + .02, .28, 0); add(belbus, bell(mtof(91), 1.4, .6, .5), t + .02, .08, 0)
    elif ty == 'spoke':
        add(foley, tick(1.0, 3800), t, .15, -.2 + .2 * e['k']); add(musbus, marimba([79, 83, 86][e['k']], .5, .85), t, .26, -.2 + .2 * e['k'])
    elif ty == 'swatch':
        k = e['k']; add(foley, tick(1.0, 5200) * .8, t, .12, -.5 + .25 * k); add(musbus, marimba(PENT[k] - 12 + 12, .45, .8), t, .24, -.5 + .25 * k)
    elif ty == 'caliper':
        for j in range(10):
            add(foley, tick(1.0, 2600 + 120 * j), t + j * .1, .07, -.3 + .06 * j)
    elif ty == 'pop':
        add(foley, paper(.18, 1.0), t, .12, .4); add(musbus, marimba([71, 76, 74][e['k']], .4, .7), t, .16, .4)
    elif ty == 'callout':
        add(foley, felt(1.0, 160), t, .15, 0)
        if e['k'] == 0: add(belbus, bell(mtof(88), 1.4, .8, .5), t, .15, -.2)
        else: add(belbus, bell(mtof(86), 1.2, .8, .5), t, .13, .1); add(belbus, bell(mtof(95), 1.6, .8, .5), t + .22, .13, .1)
    elif ty == 'zone':
        k = e['k']; add(foley, paper(.9, 1.0), t - .1, .14, 0); add(musbus, pad([43 + 12 * k, 50 + 12 * k, 55 + 12 * k], 2.8, 1.0, 900), t, .28, 0)
        add(foley, felt(1.0, 60 + 18 * k), t + .05, .22, 0)
    elif ty == 'drop':
        add(foley, felt(1.0, 85), t + .45, .35, 0); add(foley, paper(.3, 1.0), t + .1, .08, 0); add(belbus, bell(mtof(79), 1.8, .7, .4), t + .45, .12, 0)
    elif ty == 'flag':
        for j, m in enumerate([91, 95, 98, 91, 100]):
            add(belbus, bell(mtof(m), .9, .6, .3), t + .09 * j, .05, .6)
    elif ty == 'dim':
        x = bp(noise(.9), 300, 3500) * np.sin(np.pi * t_(.9) / .9) ** 2; add(foley, x, t, .12, 0)
    elif ty == 'doors':
        if not e['open']:
            for j in range(3):
                x = np.sin(2 * np.pi * 1320 * t_(.07)) * np.minimum(1, t_(.07) / .004) * np.minimum(1, (.07 - t_(.07)) / .01); add(foley, x, t - .15 + .19 * j, .05, 0)
        else:
            add(foley, hp(noise(.5), 3000) * env_exp(.5, .13), t, .06, 0); add(foley, felt(1.0, 110), t, .1, 0)
    elif ty == 'chime':
        k = e['k']; notes = [(79, 86), (74, 83)][k]
        add(belbus, bell(mtof(notes[0]), 1.8, 1.0, .5), t, .17, 0); add(belbus, bell(mtof(notes[1]), 2.2, 1.0, .5), t + .24, .17, 0)
    elif ty == 'arrive':
        add(foley, hp(noise(1.2), 2500) * env_exp(1.2, .35), t - .3, .07, 0); add(foley, felt(1.0, 70), t, .3, 0)
        add(belbus, bell(mtof(67), 1.8, 1.0, .35), t, .2, 0)
    elif ty == 'plate':
        add(foley, paper(.5, 1.0), t, .16, 0); add(foley, felt(1.0, 80), t + .3, .22, 0)

# ---------------------------------------------------------------- music
CH = {  # chord per bar: bass root, pad tones, arp tones (MIDI)
    'G':  dict(r=43, pad=[59, 62, 66, 67], arp=[67, 71, 74, 78]),
    'Em': dict(r=40, pad=[55, 59, 62, 64], arp=[64, 67, 71, 74]),
    'C':  dict(r=36, pad=[52, 55, 59, 66], arp=[67, 71, 72, 76]),
    'D':  dict(r=38, pad=[54, 57, 59, 62], arp=[66, 69, 74, 78]),
}
PROG = ['G', 'Em', 'C', 'D']
def bar_t(n): return (n - 1) * BAR
# section A: the tangle (0-8): a drone and a marimba that never plays the same bar twice
add(musbus, pad([43, 50], 14.0, 1.0, 700), 0.8, .14, 0)
a_notes = [(1.0, 79), (2.35, 74), (3.1, 83), (4.4, 71), (5.05, 76), (5.9, 67), (6.55, 79), (7.3, 74), (7.6, 86)]
for i, (t, m) in enumerate(a_notes):
    add(musbus, marimba(m, .6, .5 + .05 * (i % 3)), t + (0.03 if i % 2 else -0.02), .22, -.4 + .1 * (i % 9))
# section B: straightening (8-14): the ostinato locks to eighths, then everything stops on 14.0
PATS = [[67, 74, 71, 74, 67, 74, 71, 74], [67, 74, 71, 76, 67, 74, 71, 76], [67, 74, 71, 76, 79, 76, 74, 71]]
for b in range(3):
    t0 = T['morph0'] - .5 + b * BAR
    for j, m in enumerate(PATS[b]):
        t = t0 + j * BEAT / 2
        if t >= T['lock'] - .01: continue
        add(musbus, marimba(m, .4, .45 + .15 * b + (.1 if j % 2 == 0 else 0)), t, .30, -.3 + .08 * j)
for j in range(int((T['lock'] - 9.0) / BEAT)):
    t = 9.0 + j * BEAT; add(foley, tick(1.0, 7000), t, .05 + .01 * j, .3)
for t in np.arange(10.0, T['lock'], BAR): add(musbus, bass(43, 1.8, 1.0), t, .30, 0); add(musbus, bass(43, .5, .8), t + BEAT * 2, .22, 0)
add(musbus, pad([55, 62, 66, 71], 5.0, 1.0, 1300), 9.0, .2, 0)       # swell (cut at the lock)
# section C: rules (16-30): vibes, bass and soft rail ticks, one chord per bar
def play_chord_bar(n, vib=True, rail=1, bassn=True, arp=None, pads=True, pv=1.0):
    ch = CH[PROG[(n - 9) % 4]]; t0 = bar_t(n)
    if bassn:
        add(musbus, bass(ch['r'], 1.4, 1.0), t0, .30 * pv, 0); add(musbus, bass(ch['r'] + (7 if n % 2 else 0), .5, .8), t0 + 2 * BEAT, .24 * pv, 0)
    if pads: add(musbus, pad(ch['pad'], BAR + .8, 1.0, 1100), t0 - .1, .16 * pv, 0)
    if vib:
        tones = ch['arp']; seq = [(0, tones[0], .7), (1.5, tones[2], .55), (2, tones[1], .55), (3, tones[3], .5)]
        for b_, m, v in seq: add(musbus, vibes(m - 12 if m > 78 else m, 1.4, v), t0 + b_ * BEAT, .22 * pv, -.2 + .1 * b_)
    if rail:
        for b_ in ([1, 3] if rail == 1 else range(4)):
            add(foley, tick(1.0, 6200), t0 + b_ * BEAT, .035 if rail == 1 else .03, .35)
            if rail == 2: add(foley, tick(.7, 6800), t0 + b_ * BEAT + BEAT / 2, .02, .35)
for n in range(9, 16):                     # bars 9-15: 16.0 .. 30.0
    play_chord_bar(n, vib=True, rail=1, pv=.85 if n < 11 else 1.0)
# section D: the journey (30 - 45.5): full band, marimba arps on eighths, kick, 8th rail ticks
for n in range(16, 24):
    ch = CH[PROG[(n - 9) % 4]]; t0 = bar_t(n)
    for j in range(8):
        t = t0 + j * BEAT / 2
        if t >= T['arr3'] - .01: break
        m = ch['arp'][[0, 2, 1, 3, 2, 1, 3, 2][j]] + (12 if j in (4, 6) else 0) - 12
        add(musbus, marimba(m, .35, .5 + (.15 if j % 2 == 0 else 0)), t, .27, -.35 + .1 * j)
    for b_ in (0, 2):
        if t0 + b_ * BEAT < T['arr3'] - .1: add(musbus, kick(1.0), t0 + b_ * BEAT, .30, 0)
    for j in range(8):
        t = t0 + j * BEAT / 2
        if t < T['arr3'] - .05: add(foley, tick(1.0, 6800), t, .03 + (.015 if j % 2 else 0), .35)
    if t0 < T['arr3'] - .5:
        add(musbus, bass(ch['r'], BEAT * 1.9, 1.0), t0, .32, 0); add(musbus, bass(ch['r'] + 12, BEAT * .9, .8), t0 + BEAT * 2.5, .20, 0); add(musbus, bass(ch['r'] + 7, BEAT * .9, .8), t0 + BEAT * 3.5, .2, 0)
        add(musbus, pad(ch['pad'], BAR + .8, 1.0, 1500), t0 - .1, .17, 0)
# section E: arrival. Silence, then the voice, a pad swell and the last chord
add(musbus, pad([43, 55, 62, 66, 71, 74], 7.6, 1.0, 1100), 46.7, .30, 0)
for t, m, v in [(47.5, 86, .5), (48.5, 83, .5), (49.0, 79, .5)]: add(musbus, vibes(m, 2.2, v), t, .18, .2)
for m, dt in [(67, 0), (71, .0), (74, .0), (79, .0), (86, .05)]: add(musbus, vibes(m, 3.6, 1.0), T['finalPulse'] + dt, .20, 0)
add(musbus, bass(43, 4.0, 1.0), T['finalPulse'], .33, 0)

# reverbs: a short room on the music, a long hall on the bells
def verb(bus, sec, tau, wet):
    n = int(sec * SR); ir = lp(rng.standard_normal(n), 5200) * np.exp(-np.arange(n) / SR / tau); ir[:int(.01 * SR)] *= np.linspace(0, 1, int(.01 * SR)); ir /= np.sqrt(np.sum(ir ** 2))
    return np.stack([fftconvolve(bus[:, c], ir * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1) * wet
music = musbus + verb(musbus, 1.6, .45, .30)
bells = belbus + verb(belbus, 2.6, .9, .45)

# hard stops: music out on the lock; out at the arrival; both leave only the tails of the bells
def gate(buf, a, b, fade=.03):
    g = np.ones(N); ia, ib = int(a * SR), int(b * SR); g[ia:ib] = 0; f = int(fade * SR); g[max(0, ia - f):ia] = np.linspace(1, 0, ia - max(0, ia - f)); return buf * g[:, None]
music = gate(music, T['lock'] + .0, 15.9); music = gate(music, T['arr3'] - .02, 46.6)
bells = gate(bells, 14.6, 15.0, .25); bells = gate(bells, 45.9, 46.6, .25)
foley_g = gate(foley, T['lock'] + .25, 14.95, .02)

# ---------------------------------------------------------------- voice
voice = stereo(); vo_env = np.zeros(N)
for v in VO:
    p = os.path.join(W, 'voices', v['id'] + '.wav')
    x, sr = sf.read(p); x = x if x.ndim == 1 else x.mean(1)
    x = soxr.resample(x, sr, SR).astype(np.float64)
    x = hp(x, 80, 2); x = sfx.compress(x / max(1e-6, np.abs(x).max()), .22, 3.5, .004, .09); x = x / max(1e-6, np.abs(x).max())
    x = x + .06 * np.pad(x, (int(.04 * SR), 0))[:len(x)]
    add(voice, x, v['t'], .85, 0)
    i0 = int(v['t'] * SR); i1 = min(N, i0 + len(x)); vo_env[i0:i1] = 1
vo_env = uniform_filter1d(maximum_filter1d(vo_env, size=int(.45 * SR)), size=int(.25 * SR))

# ---------------------------------------------------------------- mix
duck_m = 1 - .55 * vo_env; duck_b = 1 - .3 * vo_env; duck_f = 1 - .2 * vo_env
mix = bed * 1.5 * duck_b[:, None] + foley_g * 2.4 * duck_f[:, None] + music * 1.0 * duck_m[:, None] + bells * 1.0 * (1 - .4 * vo_env)[:, None] + voice * 1.7
os.makedirs(os.path.join(W, 'out'), exist_ok=True)
def master(m):
    out = np.zeros_like(m)
    for c in (0, 1):
        x = sfx.compress(m[:, c], .5, 2.5, .006, .25); k = .6; x = k * np.tanh(x / k); out[:, c] = sfx.limit(x, .9, .01)
    return out
mix = master(mix)
# fade-out over the last second
mix *= np.clip((DUR - tt) / 1.0, 0, 1)[:, None]
sf.write(os.path.join(W, 'mix.wav'), mix.astype(np.float32), SR)
def rms(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
def band(x, lo, hi): return rms(bp(x[:, 0], lo, hi))
print('mix.wav %.1f s; rms dB: bed %.1f foley %.1f music %.1f bells %.1f voice %.1f mix %.1f' % (DUR, rms(bed), rms(foley_g), rms(music), rms(bells), rms(voice[voice != 0]), rms(mix)))
print('bands (dB): 20-120 %.1f | 120-800 %.1f | 800-4k %.1f | 4k-12k %.1f' % (band(mix, 20, 120), band(mix, 120, 800), band(mix, 800, 4000), band(mix, 4000, 12000)))
# the score as data for the cue check: onsets of music events by section
json.dump({'bpm': TL['BPM'], 'clacks': len(clack_t), 'silences': [[T['lock'] + .1, 15.0], [T['arr3'] + .2, 46.6]]}, open(os.path.join(W, 'score.json'), 'w'))
