"""Dots · Swiss pulse-grid score + print foley + the host's own voice → out/mix.wav
Tempo and every landing come from score.json (the same file main.js reads). A minor pentatonic; one instrument added per rule; at `clear` everything stops
(the voice keeps going); the green dot is the only element that sings (a sine glide that follows its position)."""
import os, sys, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, LIB); sys.path.insert(0, os.path.join(LIB, 'tools', 'talk'))
from mix_helpers import load_voice, voice_env, duck, gate, finish
from core.audio.sfx import SR, add, lp, hp, bp, noise, t_, click, whoosh
SC = json.load(open(os.path.join(HERE, 'score.json'))); E = SC['ev']; BEAT, G0 = SC['beat'], SC['g0']
meta = json.load(open(os.path.join(HERE, 'src', 'meta.json'))); DUR = meta['duration']; N = int(DUR * SR)
rng = np.random.default_rng(31)
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
def marimba(f, d=.7):
    t = t_(d); y = np.sin(2 * np.pi * f * t) * np.exp(-t / .3) + .33 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / .05) + .1 * np.sin(2 * np.pi * 9.2 * f * t) * np.exp(-t / .02)
    y[:int(.002 * SR)] *= np.linspace(0, 1, int(.002 * SR)); return y
def vibes(f, d=1.4):
    t = t_(d); y = (np.sin(2 * np.pi * f * t) + .25 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / .1)) * np.exp(-t / .8) * (1 + .12 * np.sin(2 * np.pi * 5 * t)); return y
def wood(f=900, d=.08): t = t_(d); return np.sin(2 * np.pi * f * t) * np.exp(-t / .016) + bp(noise(d), 1500, 4500) * np.exp(-t / .007) * .5
def bass(f, d=.55):
    t = t_(d); y = np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * 2 * f * t); return lp(y * np.exp(-t / .24) * np.minimum(1, t / .004), 700)
def tick(d=.03): return hp(noise(d), 4500) * np.exp(-t_(d) / .004)
def clack(v=1, f=1800):                                        # letterpress clack
    d = .07; t = t_(d); return (hp(noise(d), 1800) * np.exp(-t / .006) * .7 + np.sin(2 * np.pi * f * t) * np.exp(-t / .012) * .5) * v
def thunk(f0=150, f1=60, d=.28):
    t = t_(d); ph = 2 * np.pi * (f1 * t + (f0 - f1) * .05 * (1 - np.exp(-t / .05))); return np.sin(ph) * np.exp(-t / .09) + lp(noise(d), 900) * np.exp(-t / .02) * .4
def snick(d=.18):                                              # knife / guillotine
    t = t_(d); return bp(noise(d), 2500, 9000) * np.exp(-t / .03) * .8 + hp(noise(d), 6000) * np.exp(-t / .008) * .4
def tss(d=.4): t = t_(d); return bp(noise(d), 3500, 9000) * np.minimum(1, t / .02) * np.exp(-t / .22) * .5   # ruling pen
def slide(d=.4): t = t_(d); return bp(noise(d), 700, 4500) * np.sin(np.linspace(0, np.pi, len(t))) ** 2

voice_b = np.zeros((N, 2), np.float32); music = np.zeros((N, 2), np.float32); foley = np.zeros((N, 2), np.float32)
v = load_voice(os.path.join(HERE, 'src', 'voice.wav'))[:N]; voice_b[:len(v), 0] = voice_b[:len(v), 1] = v
beat = lambda n: G0 + n * BEAT; B = lambda t: int(round((t - G0) / BEAT))
PENT = [57, 60, 62, 64, 67, 69, 72, 74]                         # A minor pentatonic: A C D E G a c d
# rule entries (beat numbers): 0 opening · 1 the numerals · 2 rule 1 · 3 rule 2 · 4 rule 3 · 5 notes
b_open, b_a, b_r1, b_r2, b_r3, b_n, b_clear = B(E['dot']), B(E['n24']), B(E['r1']), B(E['r2']), B(E['r3']), B(E['note1']), B(E['clear'])
def mar(t, m, g=.3, pan=0): add(music, marimba(hz(m)), t, g, pan)
for n in range(b_open, b_clear):
    t0 = beat(n)
    if n >= b_open: add(music, tick(), t0, .16, 0); add(music, tick(), t0 + BEAT / 2, .08, .2)       # the pulse
    if n >= b_a and n < b_r1 - 1: mar(t0, PENT[(n * 3) % 8], .24, -.2)                              # numerals: single marimba line
    if n >= b_r1:                                                                                     # rule 1: ostinato of eighths + woodblock
        for h in range(2): mar(t0 + h * BEAT / 2, PENT[((n - b_r1) * 2 + h) % 8 + (0 if h == 0 else 0)], .22, -.3 + .3 * h)
        if n % 2 == 1: add(music, wood(), t0, .18, .2)
    if n >= b_r2 and n % 2 == 0: add(music, bass(hz(45 if (n // 2) % 2 == 0 else 50)), t0, .34, 0)  # rule 2 adds the bass
    if n >= b_r3 and n % 4 == 0: add(music, vibes(hz(PENT[(n // 4) % 8] + 12)), t0, .16, .3)          # rule 3 adds vibes
    if n >= b_n and n % 2 == 0 and n < b_clear - 1: add(music, bass(hz(45)), t0, .26, 0)             # notes: thin, bass only after the vibes stop
    if n >= b_n and n < b_clear and n % 4 == 2: add(music, vibes(hz(81)), t0, .1, .3)
# foley by event (dry, close)
f_ = lambda x, t, g, p=0: add(foley, x, t, g, p)
f_(clack(1, 2000), E['dot'], .5); f_(tss(.5), E['ripple'], .25)
for i in range(1, 9): f_(tick(), E['ripple'] + i * .1, .15 - .01 * i, rng.uniform(-.3, .3))
f_(thunk(), E['title'], .55); f_(thunk(), E['n24'], .6)
for i in range(8): f_(clack(.6, 1500 + 150 * i), E['n24'] - .5 + i * .07, .2)
f_(tss(.7), E['bar'], .22)
for i in range(24): f_(tick(), E['bar'] + i * .03, .1)
f_(snick(), E['cut1'], .6); f_(slide(.4), E['wipe1'], .22)
for k in ('r1', 'r2', 'r3'): f_(thunk(), E[k], .6)
f_(clack(1, 1700), E['pc'], .45); f_(clack(1, 1900), E['br'], .45)
for i in range(40): f_(tick(), E['grid'] + i * .045, .09 + .003 * i, rng.uniform(-.3, .3))
f_(clack(1, 2300), E['slack'], .4)
f_(snick(), 12.6, .5); f_(snick(), 19.95, .5); f_(snick(), 24.95, .5)
for k in ('s1', 's2', 's3'): f_(clack(1.2, 1500), E[k], .5)
for k in ('row1', 'row2', 'row3'): f_(thunk(120, 55, .22), E[k], .45)
f_(snick(), E['knife'], .7); f_(clack(1, 1800), E['note1'], .4); f_(clack(1, 1800), E['note2'], .4)
f_(snick(), E['clear'], .6)
# the dot sings: a sine glide following its x position, only while it travels linearly
KEYS = [(E['dot'], 114, 120), (3.9, 114, 120), (4.2, 114, 698), (5.2, 1038, 698), (5.95, 1038, 698), (6.95, 1020, 96), (14.3, 1020, 96), (14.62, 270, 440), (16.2, 270, 440), (16.98, 574, 440), (18.3, 574, 440), (18.83, 878, 440), (19.7, 878, 440), (20.5, 1020, 96), (28.2, 1020, 96), (E['qdot'], 330, 668)]
sing = np.zeros(N, np.float32)
for (ta, xa, ya), (tb, xb, yb) in zip(KEYS, KEYS[1:]):
    if (xa, ya) == (xb, yb) or tb - ta < .2: continue
    d = tb - ta; tt = np.arange(int(d * SR)) / SR; u = tt / d
    f0 = 220 * 2 ** ((xa + .4 * ya) / 1100); f1 = 220 * 2 ** ((xb + .4 * yb) / 1100); ph = 2 * np.pi * np.cumsum(f0 + (f1 - f0) * u) / SR
    env = np.minimum(1, tt / .05) * np.minimum(1, (d - tt) / .08); a = int(ta * SR); y = np.sin(ph) * env * .6; sing[a:a + len(y)] += y[:N - a]
add(foley, sing, 0, .22, 0)
# final: the dot lands and the question hangs on one bell tone
t = t_(2.2); bell = sum(a * np.sin(2 * np.pi * hz(81) * m * t) * np.exp(-t / tau) for m, a, tau in [(1, 1, 1.2), (2.76, .35, .6), (5.4, .15, .25)])
add(music, bell, E['qdot'], .22, 0); add(music, bass(hz(45), 1.2), E['qdot'], .34, 0)
# everything stops on the downbeat; the voice keeps going
for bus in (music, foley): gate(bus, [(E['clear'] - .02, E['qdot'] - .02)] if False else [(E['clear'], E['q'])])
env = voice_env(voice_b)
mix = voice_b + music * duck(env, 8)[:, None] * .6 + foley * duck(env, 3)[:, None] * .6
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True); sf.write(os.path.join(HERE, 'out', 'mix.wav'), finish(mix).astype(np.float32), SR); print('mix ok', N / SR, 's')
