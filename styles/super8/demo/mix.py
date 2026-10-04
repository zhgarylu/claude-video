"""Score, projector and foley for the Super 8 demo -> out/mix.wav (48 kHz stereo).
Everything is synthesised with numpy: a 3/4 home-recording score at 108 BPM on a worn tape (wow, flutter, roll-off, hiss),
a running projector (motor, 18 Hz claw, flutter, splice clicks, speed-up at the burn, take-up flap) and sparse foley.
Times come from events.json (exported from the page, which reads timeline.js) and from the same bar grid."""
import json, os, sys
import numpy as np, soundfile as sf
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
sys.path.insert(0, os.path.join(LIB, 'core/audio'))
import sfx
from sfx import SR, lp, hp, bp, noise, norm, add, env_exp, t_

HERE = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(os.path.join(HERE, 'events.json')))
DUR = ev['dur']; N = int(DUR * SR) + SR
BEAT = 60 / 108; BAR = BEAT * 3
rng = np.random.default_rng(65)
ss = lambda x: (lambda u: u * u * (3 - 2 * u))(np.clip(x, 0, 1))
tt = np.arange(N) / SR

def sumx(a, b):
    o = np.zeros(max(len(a), len(b))); o[:len(a)] += a; o[:len(b)] += b; return o
def midi(n): return 440 * 2 ** ((n - 69) / 12)
def place(buf, x, at, g=1.0):
    s = int(at * SR)
    if s >= len(buf) or s < 0: return
    e = min(len(buf), s + len(x)); buf[s:e] += x[:e - s] * g

# ---------------- instruments (mono) ----------------
def uke(f, d=.7, v=1.0):
    t = t_(d); x = np.zeros_like(t)
    for k, a in [(1, 1), (2, .5), (3, .32), (4, .2), (5, .1)]:
        x += a * np.sin(2 * np.pi * f * k * t + rng.random() * 6) * np.exp(-t / (.30 / (1 + .35 * (k - 1))))
    x += hp(noise(d), 2500) * env_exp(d, .004) * .25                       # pick
    return x * v * .6
def musicbox(f, d=1.6, v=1.0):
    t = t_(d); x = np.zeros_like(t)
    for r, a, tau in [(1, 1, .9), (2.0, .35, .5), (3.01, .25, .3), (5.4, .12, .15), (8.9, .06, .08)]:
        x += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / tau)
    x += hp(noise(d), 4000) * env_exp(d, .002) * .12
    return x * v * .55
def piano(f, d=1.4, v=1.0):
    t = t_(d); x = np.zeros_like(t)
    for det in (-.0035, .0035):                                          # a detuned upright: two strings per note
        for k, a in [(1, 1), (2, .55), (3, .35), (4, .22), (5, .12), (6, .07)]:
            x += a * np.sin(2 * np.pi * f * (1 + det) * k * t + rng.random() * 6) * np.exp(-t / (.9 / (1 + .5 * (k - 1))))
    x *= (1 - np.exp(-t / .004)); x += lp(noise(d), 900) * env_exp(d, .01) * .2
    return x * v * .3
def reed(f, d=.5, v=1.0):
    t = t_(d); vib = 1 + .006 * np.sin(2 * np.pi * 5.3 * t) * ss(t / .25)
    ph = np.cumsum(f * vib) / SR; x = 2 * (ph % 1) - 1; x = .6 * x + .4 * np.sign(np.sin(2 * np.pi * ph))
    x = bp(x, 300, 3200, 2) * np.minimum(1, t / .05) * np.minimum(1, (d - t) / .08) * (.8 + .2 * np.exp(-t / .2))
    return x * v * .4

# ---------------- the score ----------------
C = {'C': [48, 60, 64, 67], 'Am': [45, 57, 60, 64], 'F': [41, 57, 60, 65], 'G': [43, 59, 62, 67]}
THEME = [  # (bar-in-theme, [(beat, scale-degree midi, beats)])
    [(0, 72, 2), (2, 76, 1)], [(0, 74, 1.5), (1.5, 72, .5), (2, 71, 1)], [(0, 69, 2), (2, 72, 1)], [(0, 67, 3)],
    [(0, 76, 2), (2, 79, 1)], [(0, 77, 1.5), (1.5, 76, .5), (2, 74, 1)], [(0, 72, 1), (1, 74, 1), (2, 71, 1)], [(0, 72, 3)]]
CH = ['C', 'G', 'Am', 'C', 'C', 'F', 'G', 'C']
SCALE = [0, 2, 4, 5, 7, 9, 11]
def third(n):                                    # a diatonic third above (C major)
    o, p = divmod(n - 60, 12); i = min(range(7), key=lambda k: abs(SCALE[k] - p)); j = i + 2
    return 60 + o * 12 + SCALE[j % 7] + 12 * (j // 7)
music = np.zeros(N)
def strum(t0, ch, v=1.0, up=False):
    notes = C[ch][1:] if not up else C[ch][:0:-1][:3]
    for i, n in enumerate(notes): place(music, uke(midi(n + 12), .6, v * (.8 if up else 1)), t0 + i * .014)
def theme(bar0, nbars, inst='reed', thirds=False, v=1.0):
    for b in range(nbars):
        tb = bar0 + b
        for (beat, n, ln) in THEME[b % 8]:
            t0 = tb * BAR + beat * BEAT
            if inst == 'reed': place(music, reed(midi(n), ln * BEAT * .95, v), t0)
            else: place(music, musicbox(midi(n), 1.5, v), t0)
            if thirds: place(music, musicbox(midi(third(n)), 1.3, v * .6), t0 + .01)
def waltz(bar0, nbars, v=1.0, chords=None):
    for b in range(nbars):
        tb = (bar0 + b) * BAR; ch = (chords or CH)[(b) % 8]
        place(music, uke(midi(C[ch][0] + 12), .5, v * 1.15), tb)
        strum(tb + BEAT, ch, v * .8, True); strum(tb + 2 * BEAT, ch, v * .8)
def box_arp(bar0, nbars, v=1.0):
    for b in range(nbars):
        ch = CH[b % 8]; tb = (bar0 + b) * BAR
        place(music, piano(midi(C[ch][0]), 1.6, v * .7), tb)
        for k in range(3): place(music, musicbox(midi(C[ch][1 + k] + 12), 1.5, v * .8), tb + k * BEAT + (.0 if k else .01))

# card: music box takes the first two bars of the theme, entering on the stamp (bar 1)
theme(1, 2, 'box', v=.8)
# street: ukulele strums, bar 3-7 (C Am F G C)
for b, ch in zip(range(3, 8), ['C', 'Am', 'F', 'G', 'C']):
    tb = b * BAR; place(music, uke(midi(C[ch][0] + 12), .5, 1.1), tb)
    strum(tb + .001, ch, .9); strum(tb + BEAT, ch, .6, True); strum(tb + 2 * BEAT, ch, .75)
place(music, uke(midi(43 + 12), .5, 1.2), 3 * BAR + 1.5 * BEAT)          # bass note on the tailgate thunk
# beach: waltz with the reed, bars 8-14
waltz(8, 7, .9); theme(8, 7, 'reed', v=.9)
# medium: theme in thirds, bars 15-17
waltz(15, 3, .6); theme(15, 3, 'box', thirds=True, v=.9)
# golden hour: music box alone, bars 18-21
box_arp(18, 4, .9)
# silence bar 22; 23-25 hiss and projector; one low piano pair on the bar 24 downbeat (40.0 s)
place(music, piano(midi(36), 3.0, 1.6), 24 * BAR); place(music, piano(midi(43), 3.0, 1.1), 24 * BAR + .02)
# the theme returns as Dad enters (bar 26-29): music box melody over soft piano and a reed from bar 28
theme(26, 2, 'box', v=1.0); theme(28, 2, 'box', v=1.0); theme(28, 2, 'reed', v=.55)
for b in range(26, 32):
    ch = CH[(b - 26) % 8]; tb = b * BAR
    place(music, piano(midi(C[ch][0] + 12), 1.2, .9), tb)
    for k in (1, 2): place(music, piano(midi(C[ch][2 + k % 2]), .7, .45), tb + k * BEAT)
theme(30, 2, 'reed', v=.7)
# end: two lone music-box notes (card written, then the stamp)
place(music, musicbox(midi(79), 3.0, .9), 31.5 * BAR + .45)
place(music, musicbox(midi(72), 4.0, 1.0), 32.5 * BAR); place(music, piano(midi(48), 3.5, .8), 32.5 * BAR)

# tape: the slow-down at the burn, wow and flutter, roll-off, saturation, hiss
rate = 1 - .55 * ss((tt - 50.15) / 2.3) * (tt < 52.5)
rate = np.where(tt >= 52.5, 1.0, rate)
rate = rate * (1 + .0035 * np.sin(2 * np.pi * .55 * tt + 1) + .0016 * np.sin(2 * np.pi * 6.8 * tt) + .0009 * np.sin(2 * np.pi * 11.3 * tt + 2))
pos = np.cumsum(rate) / 1.0
music = np.interp(pos, np.arange(N), music, right=0)
music = hp(lp(music, 5600, 2), 70, 2); music = np.tanh(music * 1.5) / 1.5
music *= 1 - .45 * ss((tt - 52.5) / 1.0) * 0                            # (kept at full level; the notes themselves die away)
musicL = music * .92 + np.roll(music, int(.0007 * SR)) * .08

# ---------------- projector (bed) ----------------
bed = np.zeros(N)
ramp = ss(tt / .9)
hum = (np.sin(2 * np.pi * 100 * tt) * .5 + np.sin(2 * np.pi * 50 * tt) * .3 + np.sin(2 * np.pi * 150 * tt) * .15)
whirr = bp(noise(N / SR), 500, 1700, 2) * (.5 + .5 * np.sin(2 * np.pi * 18 * tt)) * .55
speed = 18 * (1 + 1.8 * ss((tt - 50.0) / 2.5) ** 2)
speed = np.where(tt >= 52.5, 1.0, speed)
flutter = lp(noise(N / SR), 40) * 1.2 + lp(noise(N / SR), 9) * 2.5
bed += (hum * .018 + whirr * .035) * ramp * (1 + .06 * np.sin(2 * np.pi * speed * tt / 18 * .6))
# claw ticks at film-frame rate: a click with a little body each 1/18 s (rate climbs during the burn)
ph = np.cumsum(speed) / SR; tick_idx = np.where(np.diff(np.floor(ph)) > 0)[0]
claw = hp(noise(.014), 900) * np.exp(-np.arange(int(.014 * SR)) / (.0025 * SR)); thud = np.sin(2 * np.pi * 140 * t_(.02)) * env_exp(.02, .006)
cl = np.zeros(N)
for i in tick_idx:
    if i / SR < .15: continue
    g = (.11 + .05 * rng.random()) * (.45 if i / SR > 52.5 else 1)
    cl[i:i + len(claw)] += claw[:N - i] * g if i + len(claw) <= N else 0
    cl[i:i + len(thud)] += thud[:N - i] * g * .5 if i + len(thud) <= N else 0
bed += cl * ramp
bed += bp(flutter * noise(N / SR), 60, 500, 1) * .004 * ramp
# after the film runs out: take-up reel flap, slowing down (52.5 s on); the lamp goes on glowing
t0 = 52.5; k = 0.0; tcur = t0
while tcur < DUR:
    f = np.exp(-1.0 * (tcur - t0) / 4.2) * 1.4 + 1.6
    fl = sumx(hp(noise(.03), 500) * env_exp(.03, .006) * .7, lp(noise(.05), 220) * env_exp(.05, .02) * .8)
    place(bed, fl, tcur, .13 * (.85 + .3 * rng.random())); tcur += 1 / f
bed *= 1 - .55 * ss((tt - 52.5) / .5) * 0                                # motor stays under the flap
# surf and street air, switched by the timeline
def band(a, b, fade=.5): return ss((tt - a) / fade) * (1 - ss((tt - b) / fade))
surf = lp(noise(N / SR), 700) * (.55 + .45 * np.sin(2 * np.pi * .11 * tt + 1)) + bp(noise(N / SR), 1500, 5000) * .15 * (.5 + .5 * np.sin(2 * np.pi * .11 * tt + 1.6))
air = bp(noise(N / SR), 200, 1800) * .3
amb = surf * .05 * (band(13.3, 36.5) + .65 * band(42.5, 52.4)) + air * .035 * band(5, 13.3)
amb *= 1 - .5 * band(36.7, 42.5, .2)
# hiss from the tape (always), a little more in silence
hiss = hp(noise(N / SR), 3500) * .006 + bp(noise(N / SR), 400, 2500) * .002

# ---------------- foley ----------------
fol = np.zeros((N, 2))
def mono(x, at, g=1.0, pan=0.0):
    sfx.add(fol, x, at, g, pan)
for e in ev['ev']:
    t, ty, v = e['t'], e['type'], e.get('v', 1.0)
    if ty == 'start':
        mono(sfx.click(.6, 1) , 0.02, .5); mono(sfx.thump(1, 55), 0.02, .5)
    elif ty == 'pen':
        d = .09 + .05 * rng.random(); x = bp(noise(d), 1800, 5500) * np.sin(np.pi * t_(d) / d) ** .7; mono(x, t, .1 * v, rng.random() - .5)
    elif ty == 'stamp':
        mono(sfx.thump(1, 95), t, .55); mono(bp(noise(.12), 600, 3000) * env_exp(.12, .03), t + .005, .25)
    elif ty == 'splice':
        a = e.get('amp', 1); mono(sfx.click(.8, 1), t, .5 * a); mono(sfx.clack(.7, 1), t + .03, .35 * a); mono(bp(noise(.08), 300, 1500) * env_exp(.08, .02), t + .02, .2 * a)
    elif ty == 'thunk':
        mono(sfx.thump(1, 60), t, .8 * v); mono(sfx.clack(.55, 1), t + .01, .45 * v); mono(bp(noise(.3), 1500, 4000) * env_exp(.3, .08), t + .02, .08 * v)
    elif ty == 'whip':
        mono(sfx.whoosh(.32, 1), t - .06, .55 * v)
    elif ty == 'bucket':
        mono(sfx.clack(.5, 1), t, .5); mono(sfx.clack(.45, 1), t + .22, .3)
    elif ty == 'thumb':
        x = bp(noise(.9), 150, 900) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 7 * t_(.9)))) * np.sin(np.pi * t_(.9) / .9); mono(x, t, .3)
        mono(sfx.thump(1, 80), t + .85, .35)
    elif ty == 'step':
        x = sumx(lp(noise(.12), 1800) * env_exp(.12, .03) * .8, hp(noise(.05), 2500) * env_exp(.05, .01) * .3); mono(x, t, .25, .3)
    elif ty == 'burn':
        d = 2.5; x = np.zeros(int(d * SR)); tl = t_(d)
        f = 90 * np.exp(1.9 * (tl / d) ** 2); ph2 = np.cumsum(f) / SR
        x += np.sin(2 * np.pi * ph2) * .5 + bp(noise(d), 800, 3500) * .4 * ss(tl / 1.5)
        x *= ss(tl / .3) * (1 - .2 * ss((tl - 2.1) / .4))
        mono(x, t, .2)
        for k in range(14): mono(sfx.clack(.6 + .05 * k, 1), t + 1.4 + .09 * k * (1 - k / 28), .22)
        mono(sfx.crash(1) * .5, t + 2.3, .12)
wb = (noise(N / SR) * 0)  # placeholder to keep arrays aligned
# ---------------- mix ----------------
out = np.zeros((N, 2))
out[:, 0] += musicL * .55 + bed * 1.0 + amb + hiss
out[:, 1] += music * .55 + np.roll(bed, 40) * 1.0 + np.roll(amb, 90) + np.roll(hiss, 130)
out += fol * 1.0
# silence bar: projector alone, hiss up a touch
out *= 1.0
sil = band(36.7, 38.3, .08); out[:, 0] += hiss * 1.5 * sil; out[:, 1] += np.roll(hiss, 130) * 1.5 * sil
# tape glue: compress, soft clip, limit
for c in range(2):
    out[:, c] = sfx.compress(out[:, c], .22, 2.6, .006, .12); out[:, c] = sfx.limit(out[:, c], .30)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
out = out[:int(DUR * SR) + int(.2 * SR)]
sf.write(os.path.join(HERE, 'out/mix.wav'), out.astype('float32'), SR)
json.dump({'bpm': 108, 'music_hits': {'theme_return': 26 * BAR, 'strum_thunk': 3 * BAR + 1.5 * BEAT, 'low_note': 24 * BAR, 'end_note': 32.5 * BAR, 'card_notes': 1 * BAR, 'waltz': 8 * BAR}}, open(os.path.join(HERE, 'score.json'), 'w'))
print('mix', out.shape, 'peak', float(np.abs(out).max()))
