"""Score + sound design + voice → mix.wav for "The Last Bowl on Pell Street".
Everything is synthesised in numpy (no samples). Reads timeline.json (export_tl.mjs) and voices/ (tts.py).
usage: .venv/bin/python styles/neon-sign/demo/mix.py [workdir]   (default: the demo folder)
"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
from scipy.signal import fftconvolve, sosfilt, butter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, t_, bp, lp, hp, env_exp, norm
_add = sfx.add
def add(buf, x, at, gain=1.0, pan=0.0):
    if x.ndim == 1: return _add(buf, x, at, gain, pan)
    s = int(at * SR)
    if s >= len(buf) or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); buf[s:e] += x[:e - s] * gain

W = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else HERE
TL = json.load(open(os.path.join(W, 'timeline.json')))
T, EV, HUM, MUS, VO = TL['T'], TL['EV'], TL['HUM'], TL['MUSIC'], TL['VO']
DUR, BEAT, BAR = TL['DUR'], TL['BEAT'], TL['BAR']
N = int(DUR * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(58)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def mono2(x): return np.stack([x, x], 1)
def bump(t, a, b, fa=.2, fb=.2):  # smooth window 0..1..0 over time array
    return np.clip((t - a) / fa, 0, 1) * np.clip((b - t) / fb, 0, 1)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)

# ----------------------------------------------------------------- beds (hum, room, traffic, rain, dawn)
level = np.interp(tt, [k[0] for k in HUM], [k[1] for k in HUM])
f0 = 55.0
ph = 2 * np.pi * np.cumsum(np.full(N, f0)) / SR
hum = sum(a * np.sin(k * ph + k * .7) for k, a in zip(range(1, 8), [1, .62, .38, .24, .14, .09, .05]))
buzz = bp(noise(DUR), 3600, 4800) * .05 + np.sin(2 * np.pi * 7900 * tt) * .006 * (1 + .3 * np.sin(2 * np.pi * .4 * tt))
bed_hum = (hum * .20 + buzz) * level
bed = np.stack([bed_hum, bed_hum], 1)
# the breaker: a dying hum gliding down
mask = tt >= T['breaker']; g = np.where(mask, tt - T['breaker'], 0)
dy = sum(a * np.sin(2 * np.pi * np.cumsum(np.where(mask, f0 * np.exp(-g * 1.3), 0)) / SR * k) for k, a in zip(range(1, 5), [1, .5, .3, .15])) * np.exp(-g / .55) * mask * .30
bed += mono2(dy)

room = lp(noise(DUR), 300, 2) * .05 + lp(np.cumsum(noise(DUR)) * 1e-4, 80) * .0
quiet = 1 - .8 * bump(tt, T['blackout'], T['restart'] - .02, .05, .02)   # near-silence during the blackout
traf_env = sum(np.exp(-((tt - c) / w) ** 2) * a for c, w, a in [(10, 1.8, .6), (16, 2, .8), (24, 1.8, .7), (31, 2.2, .6), (39.5, 2, .9), (46, 2.4, 1.0), (52, 2, .8)]) + .25
traf = lp(noise(DUR), 220, 2) * traf_env * .10
tyre = bp(noise(DUR), 900, 3200) * traf_env * .018 * np.clip((tt - T['rain0']) / 3, 0, 1)
rain_lvl = np.interp(tt, [T['rain0'], T['rain0'] + 2.5, T['rain1'], T['rain2']], [0, .85, .85, 0], left=0, right=0)
rain = (bp(noise(DUR), 1800, 9000, 2) * .045 + lp(hp(noise(DUR), 400), 1800) * .035) * rain_lvl
beds = (room + traf + tyre + rain) * quiet
bed += mono2(beds)
# rain drips on the street (random pops), pan spread
for i in range(260):
    t = T['rain0'] + 1 + rng.random() * (T['rain2'] - T['rain0'] - 1)
    add(bed, hp(noise(.03), 2500) * env_exp(.03, .004) * (.3 + .5 * rng.random()) + np.sin(2 * np.pi * (1500 + 2500 * rng.random()) * t_(.03)) * env_exp(.03, .006) * .2, t, .02 * quiet[min(N - 1, int(t * SR))], rng.random() * 2 - 1)
# birds at dawn: very quiet FM chirps
for k in range(34):
    t = 44.8 + rng.random() * 8.2
    if rng.random() < .6:
        d = .09 + rng.random() * .08; x = t_(d); f = 3400 + 1400 * rng.random(); ch = np.sin(2 * np.pi * (f * x + 900 * x ** 2 / d * (1 if rng.random() < .5 else -1)) + 3 * np.sin(2 * np.pi * 70 * x)) * np.hanning(len(x))
        add(bed, ch, t, .008 + .01 * rng.random() * min(1, (t - 44.8) / 3), rng.random() * 1.6 - .8)

# ----------------------------------------------------------------- foley
def tick(v=1.0):
    d = .05; x = t_(d); return norm(hp(noise(d), 2500) * env_exp(d, .0012) + np.sin(2 * np.pi * 3300 * x) * env_exp(d, .004) * .6) * v
def pop():
    d = .02; return hp(noise(d), 3000) * env_exp(d, .002)
def crackle(dur, g=1.0, pan0=-.4, pan1=.4):
    out = np.zeros((int(dur * SR) + 4000, 2)); n = int(dur * 70) + 3
    for i in range(n):
        u = rng.random() ** .7; t = u * dur; amp = (.3 + .7 * rng.random()) * (1 - .5 * u)
        add(out, pop() * amp * (1 + rng.random()), t, .7, pan0 + (pan1 - pan0) * u)
    fz = bp(noise(dur), 4500, 9500) * (np.minimum(1, t_(dur) / (dur * .25)) * np.exp(-t_(dur) / (dur * .6))) * .08 * (rng.random(int(round(dur * SR))) > .35)
    out[:len(fz), 0] += fz * .7; out[:len(fz), 1] += fz * .7
    return out * g
def sputter(g=1.0):
    d = .14; x = t_(d); gate = (np.sin(2 * np.pi * 90 * x) > -.2) * (rng.random(len(x)) > .35)
    s = bp(noise(d), 2200, 7000) * gate * np.exp(-x / .07)
    return norm(s) * g * .5
def relay(v=1.0):
    d = .22; x = t_(d); return norm(np.sin(2 * np.pi * 150 * x * (1 - .3 * x)) * env_exp(d, .05) * .9 + hp(noise(d), 1500) * env_exp(d, .004) * .6 + bp(noise(d), 600, 1500) * env_exp(d, .012) * .5) * v
def thump(v=1.0, big=0, f=58):
    d = 1.4 if big else .8; x = t_(d)
    sub = np.sin(2 * np.pi * f * x * (1 - .25 * np.minimum(x, .5))) * env_exp(d, .22 if big else .14)
    zz = np.sin(2 * np.pi * np.cumsum(np.interp(x, [0, .25], [260, 55])) / SR) * env_exp(d, .08) * .4
    return norm(sub * .95 + zz + hp(noise(d), 1200) * env_exp(d, .006) * .6 + bp(noise(d), 200, 800) * env_exp(d, .05) * .3) * v
def step(v=1.0, splash=False):
    d = .18; x = t_(d)
    s = bp(noise(d), 180, 800) * env_exp(d, .035) * 1.0 + bp(noise(d), 1400, 4200) * env_exp(d, .009) * .6
    if splash: s = s + bp(noise(d), 800, 6500) * env_exp(d, .09) * .5
    return norm(s) * v
def clack(v=1.0):
    d = .28; x = t_(d); return norm(hp(noise(d), 900) * env_exp(d, .006) * .9 + sum(a * np.sin(2 * np.pi * f * x) * env_exp(d, tau) for f, a, tau in [(740, .6, .03), (2300, .5, .012), (310, .6, .05)])) * v
def whine(d, f1, f2, v=1.0):
    x = t_(d); f = np.interp(x, [0, d], [f1, f2]); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / (d * .5)) * v
def rustle(d, v=1.0):
    x = t_(d); return bp(noise(d), 250, 1400) * np.minimum(1, x / .3) * np.minimum(1, (d - x) / .3) * (.5 + .5 * lp(noise(d), 7)) * v

fo = np.zeros((N, 2))
for e in EV:
    t, ty, g = e['t'], e['type'], e.get('g', 1.0)
    if ty == 'tick': add(fo, tick(), t, .55 * g, .1)
    elif ty == 'crackle': add(fo, crackle(e['dur'], g), t, .8, 0)
    elif ty == 'sputter': add(fo, sputter(g), t, .45, rng.random() * .6 - .3)
    elif ty == 'relay': add(fo, relay(), t, .35, -.1)
    elif ty == 'thump':
        add(fo, thump(1, e.get('big', 0)), t, .85 if e.get('big') else .55, .1)
        if e.get('big'): add(fo, relay(), t + .02, .3, 0)
        add(fo, sfx.lp(noise(.35), 2500) * env_exp(.35, .09), t, .12, 0)
    elif ty == 'whoosh':
        d = 2.8; x = t_(d); f = np.interp(x, [0, 1.2, d], [300, 1800, 400]); sig = bp(noise(d), 200, 2400) * (np.exp(-((x - 1.3) / .8) ** 2))
        add(fo, sig * .25, t, .6, 0)
    elif ty == 'dead':
        add(fo, tick(), t, .5, -.1); add(fo, whine(.7, 520, 70, 1) * .6, t + .02, .22, -.1); add(fo, sputter(.7), t + .1, .5, -.1)
    elif ty == 'blackout':
        add(fo, thump(1, 0, 52), t, .8, 0); add(fo, whine(.35, 900, 120, 1), t, .3, 0)
    elif ty == 'hand': add(fo, rustle(1.4), t, .35, -.6)
    elif ty == 'breaker':
        add(fo, clack(), t, .9, -.5); add(fo, thump(1, 1, 50), t + .02, .9, -.3); add(fo, whine(.9, 4200, 320, 1), t + .02, .18, 0); add(fo, relay(), t + .05, .5, -.3)
    elif ty == 'step': add(fo, step(1, e.get('splash')), t, .5, e.get('pan', 0))
# footsteps ride the rain: nothing else needed

# ----------------------------------------------------------------- music
musbus = np.zeros((N, 2))
def pad_note(m, d, vel=1.0, att=1.2, rel=1.6):
    n = int((d + rel) * SR); x = np.arange(n) / SR; out = np.zeros((n, 2))
    for ch, det in enumerate([-7, 7]):
        s = 0
        for dd in (-6, 0, 6):
            f = mtof(m) * 2 ** ((det + dd) / 1200)
            s = s + sum(np.sin(2 * np.pi * f * k * x + k) / k for k in range(1, 9))
        out[:, ch] = s
    e = np.minimum(1, x / att) * np.where(x < d, 1, np.exp(-(x - d) / (rel / 4)))
    out = np.stack([sosfilt(butter(2, 1300, 'low', fs=SR, output='sos'), out[:, c]) for c in (0, 1)], 1)
    return out * e[:, None] * vel * .035
def rhodes(m, d=1.6, vel=.7, pan=0):
    n = int(d * SR); x = np.arange(n) / SR; f = mtof(m)
    idx = (1.2 + 1.6 * vel) * np.exp(-x / .45)
    s = np.sin(2 * np.pi * f * x + idx * np.sin(2 * np.pi * f * x)) * np.exp(-x / .9) + .35 * np.sin(2 * np.pi * f * 4 * x + .8 * np.sin(2 * np.pi * f * 4 * x)) * np.exp(-x / .08)
    s = s * np.minimum(1, x / .003) * np.minimum(1, (d - x) / .25) * vel * .16
    trem = 1 + .14 * np.sin(2 * np.pi * 4.6 * x)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    return np.stack([s * trem * l * 1.4, s * (2 - trem) * r * 1.4], 1)
def bass(m, d, vel=1.0):
    n = int((d + .3) * SR); x = np.arange(n) / SR; f = mtof(m)
    s = np.sin(2 * np.pi * f * x) + .32 * np.sin(2 * np.pi * 2 * f * x) + .12 * np.sin(2 * np.pi * 3 * f * x)
    e = np.minimum(1, x / .012) * np.exp(-x / 1.6) * np.where(x < d, 1, np.exp(-(x - d) / .12))
    return mono2(s * e * vel * .17)
def hat(v=1.0):
    d = .09; return mono2(hp(noise(d), 6500) * env_exp(d, .03) * v * .04)
def lead(m, d, vel=.8):
    n = int((d + .5) * SR); x = np.arange(n) / SR; f = mtof(m)
    vib = np.sin(2 * np.pi * 5.1 * x) * 6 * np.minimum(1, np.maximum(0, x - .25) / .5) / 1200
    ph = 2 * np.pi * np.cumsum(f * (1 + vib)) / SR
    s = np.sin(ph) + .22 * np.sin(2 * ph) + .09 * np.sin(3 * ph)
    e = np.minimum(1, x / .06) * np.where(x < d, 1, np.exp(-(x - d) / .18))
    return mono2(s * e * vel * .13)
def tape_delay(buf, delay, fb=.45, rep=3):
    out = buf.copy(); cur = buf
    for i in range(rep):
        cur = np.stack([sfx.lp(np.roll(cur[:, c], int(delay * SR) + (3 if c else 0)), 2600) * fb for c in (0, 1)], 1); cur[:int(delay * SR)] = 0; out += cur
    return out

CH = [  # (pad notes, bass root midi)
    ([57, 60, 64, 67, 71], 33),   # Am9
    ([53, 57, 60, 64], 29),       # Fmaj7
    ([60, 64, 67, 71], 36),       # Cmaj7
    ([55, 59, 62, 64], 31),       # G6
]
AMAJ = ([57, 61, 64, 71, 73], 33)  # A add9 (the one major colour, at dawn)
def chord_at(t):
    b = int((t + 1e-6) // BAR); return CH[b % 4]
def play_pad(a, b, vel=1.0, att=1.3, chord=None):
    t = a
    while t < b - 1e-6:
        be = min(b, (int((t + 1e-6) // BAR) + 1) * BAR); ch = chord or chord_at(t)
        for m in ch[0]: add(musbus, pad_note(m, be - t, vel, att, 1.8), t, 1.0, 0)
        t = be
def play_rhodes(a, b, step=BEAT / 2, pat=(0, 2, 4, 2, 1, 3, 2, 1), vel=.62, chord=None, every=1):
    k = 0; t = a
    while t < b - 1e-6:
        if k % every == 0:
            ch = chord or chord_at(t); notes = ch[0]; m = notes[pat[k % len(pat)] % len(notes)] + 12 * (pat[k % len(pat)] // len(notes))
            add(musbus, rhodes(m, 1.7, vel * (.75 + .25 * ((k % 4) == 0)), -.3 + .6 * ((k % 2))), t, 1.0, 0)
        t += step; k += 1
def play_bass(a, b, beats=(0, 2), vel=1.0, chord=None):
    t0 = (int((a + 1e-6) // BAR)) * BAR; t = t0
    while t < b - 1e-6:
        ch = chord or chord_at(t)
        for bt in beats:
            tn = t + bt * BEAT
            if a - 1e-6 <= tn < b: add(musbus, bass(ch[1], 1.7 * BEAT, vel), tn, 1.0, 0)
        t += BAR
def play_hats(a, b):
    t = a
    while t < b:
        k = int(round((t - a) / (BEAT / 2)))
        if k % 2 == 1: add(musbus, hat(.9 + .2 * rng.random()), t, 1.0, .3 if k % 4 == 1 else -.3)
        t += BEAT / 2
def play_lead(notes):
    tl = np.zeros((N, 2))
    for t, m, d in notes: add(tl, lead(m, d), t, 1.0, 0)
    return tape_delay(tl, BEAT * .75, .42, 3)

# section 1: ignition and the street (5.0 .. gate at 20.0)
s1a, s1b = MUS['start'], MUS['gate1']
play_pad(s1a, s1b, .9, 1.8)
play_rhodes(2 * BAR, s1b, vel=.6)               # from bar 3 (6.667)
play_bass(2 * BAR, s1b, (0, 2), .85)
play_hats(4 * BAR, s1b)
lead1 = play_lead([(4 * BAR + 0 * BEAT, 76, 1.0 * BEAT), (4 * BAR + 2 * BEAT, 72, 1.5 * BEAT), (5 * BAR + 0 * BEAT, 71, 1.2 * BEAT), (5 * BAR + 2.5 * BEAT, 69, 1.4 * BEAT)])
# section 2: the flicker (23.33 .. gate at 33.33): pedal bass, swelling pad
s2a, s2b = MUS['back1'], MUS['gate2']
for i, (a, b) in enumerate([(s2a, s2a + BAR), (s2a + BAR, s2a + 2 * BAR), (s2a + 2 * BAR, s2b)]):
    play_pad(a, b, .8 + .25 * i, 1.2, chord=CH[0] if i != 1 else CH[1])
add(musbus, bass(33, s2b - s2a, 1.0), s2a, 1.0, 0)
play_rhodes(s2a, s2b, step=BEAT, pat=(4, 2), vel=.5, every=2)
add(musbus, rhodes(45, 2.6, .8, -.2), T['lDead'], 1.0, 0); add(musbus, rhodes(46, 2.6, .7, .2), T['lDead'], 1.0, 0)   # the cluster when the L dies
# section 3: the return (35.83 .. 43.33): one held chord, sparse
s3a, s3b = MUS['back2'], MUS['dawn']
play_pad(s3a, s3b, 1.0, 1.0, chord=CH[0])
play_rhodes(s3a + BEAT, s3b, step=BEAT, pat=(1, 3, 2, 4), vel=.5, chord=CH[0], every=1)
play_bass(s3a, s3b, (0,), .8, chord=CH[0])
lead3 = play_lead([(s3a + 2 * BAR + 1 * BEAT, 76, 1.3 * BEAT), (s3a + 2 * BAR + 3 * BEAT, 71, 1.6 * BEAT)])
# section 4: dawn (43.33 .. gate at 50.0): A add9, the only major colour, thinning
s4a, s4b = MUS['dawn'], MUS['end']
play_pad(s4a, s4b, 1.2, 1.4, chord=AMAJ)
play_rhodes(s4a, s4b, step=BEAT, pat=(0, 2, 3, 1), vel=.42, chord=AMAJ, every=2)
play_bass(s4a, s4b, (0,), .7, chord=AMAJ)
lead4 = play_lead([(s4a + 1 * BAR + 1 * BEAT, 80, 1.8 * BEAT)])
musbus += lead1 + lead3 + lead4

# reverb + gates
ir_n = int(2.4 * SR); irx = np.arange(ir_n) / SR; ir = lp(noise(2.4), 4500) * np.exp(-irx / .75); ir[:int(.012 * SR)] *= np.linspace(0, 1, int(.012 * SR))
wet = np.stack([fftconvolve(musbus[:, c], ir * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1) * .045
music = musbus + wet
gate = np.ones(N)
for a, b in [(MUS['gate1'], MUS['back1']), (MUS['gate2'], MUS['back2']), (MUS['end'], DUR + 1)]:
    ia, ib = int(a * SR), min(N, int(b * SR)); gate[ia:ib] = 0; fade = int(.03 * SR); gate[max(0, ia - fade):ia] = np.linspace(1, 0, ia - max(0, ia - fade))
music *= gate[:, None]
# fade-in of the first section
fi = np.clip((tt - MUS['start']) / 2.2, 0, 1); fi = np.where(tt < MUS['back1'], fi, 1.0); music *= fi[:, None]

# ----------------------------------------------------------------- voice
voice = np.zeros((N, 2)); vo_env = np.zeros(N)
dur = json.load(open(os.path.join(W, 'voices', 'dur.json'))) if os.path.exists(os.path.join(W, 'voices', 'dur.json')) else {}
for v in VO:
    p = os.path.join(W, 'voices', v['id'] + '.wav')
    if not os.path.exists(p): continue
    x, sr = sf.read(p); x = x if x.ndim == 1 else x.mean(1)
    x = soxr.resample(x, sr, SR).astype(np.float64)
    x = hp(x, 70, 2); x = sfx.compress(x / max(1e-6, np.abs(x).max()), .22, 3.5, .004, .09); x = x / max(1e-6, np.abs(x).max())
    # small room: a short slap
    x = x + .08 * np.pad(x, (int(.045 * SR), 0))[:len(x)]
    add(voice, x, v['t'], .85, 0)
    i0 = int(v['t'] * SR); vo_env[i0:i0 + len(x)] = np.maximum(vo_env[i0:i0 + len(x)], 1)
from scipy.ndimage import maximum_filter1d, uniform_filter1d
vo_env = uniform_filter1d(maximum_filter1d(vo_env, size=int(.5 * SR)), size=int(.25 * SR))

# ----------------------------------------------------------------- mix
duck_m = 1 - .5 * vo_env; duck_f = 1 - .25 * vo_env; duck_b = 1 - .15 * vo_env
mix = bed * 1.7 * duck_b[:, None] + fo * 1.05 * duck_f[:, None] + music * .07 * duck_m[:, None] + voice * 1.6
os.makedirs(os.path.join(W, 'out'), exist_ok=True)
sf.write(os.path.join(W, 'out', 'premix.wav'), mix.astype(np.float32), SR)
def master(m):
    # level-ride, then a soft clip: the film is sparse (hum and silences) with sharp hits; keep crest low enough for -14 LUFS at TP <= -1.2 dB
    out = np.zeros_like(m)
    for c in (0, 1):
        x = sfx.compress(m[:, c], .05, 4.0, .006, .2)
        k = .12; x = k * np.tanh(x / k)
        out[:, c] = sfx.limit(x, .1, .01)
    return out
mix = master(mix)
sf.write(os.path.join(W, 'mix.wav'), mix.astype(np.float32), SR)
def rms(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print('mix.wav', DUR, 's; rms dB: bed %.1f fo %.1f music %.1f voice %.1f mix %.1f' % (rms(bed), rms(fo), rms(music), rms(voice[voice != 0]) if np.any(voice) else -99, rms(mix)))
json.dump({'sections': MUS, 'bpm': TL['BPM']}, open(os.path.join(W, 'score.json'), 'w'))
