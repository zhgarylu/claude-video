"""Score and sfx for Dusklight, written with the five-channel chip in apu.py. Everything is placed on game frames (60 Hz);
the picture's events come from out/events.json (exported from window.EV, which is built from timeline.js), so sound and picture share one list.
Music: original, E minor pentatonic, 150 BPM (24 frames per beat, 96 per bar). Channels: p0 lead, p1 harmony and arpeggio, tri bass, noise drums.
SFX are written after the music, so they steal the channel from it, as on the hardware. Bar 25 (and the beat before the light) is true zero."""
import json, sys, os
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apu import Chip, SR
from scipy.signal import butter, sosfilt

here = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(os.path.join(here, 'out/events.json')))['ev']
FR = 3264
c = Chip(frames=FR + 30)
BAR, BEAT, S = 96, 24, 6
bar = lambda b: (b - 1) * BAR

def melody(f0, notes, ch=0, **kw):
    f = f0
    for n, m in notes:
        if m is not None: c.pulse(ch, f, m, max(1, n * S - 1), **kw)
        f += n * S
    return f
def bass(f0, pattern, root, gate=9, step=S):
    for i, o in enumerate(pattern):
        if o is not None: c.tri(f0 + i * step, root + o, gate)
def drums(f0, kick=(0, 8), snare=(4, 12), hat=range(0, 16, 2)):
    for s in kick: c.noise(f0 + s * S, 5, period=12, vol=14, env=1, slide=-1)
    for s in snare: c.noise(f0 + s * S, 7, period=7, vol=11, env=1)
    for s in hat: c.noise(f0 + s * S, 2, period=3, vol=5, env=1, mode=1)
def arp(f0, root, kind, vol=5, duty=2, dur=BAR - 2):
    c.pulse(1, f0, root, dur, vol=vol, duty=duty, arp={'m': [0, 3, 7], 'M': [0, 4, 7]}[kind])
EIGHTS = sum([[0, None, 12, None] if i % 2 == 0 else [0, None, 7, None] for i in range(4)], [])

# ---- title (bars 1-4): bar 1 wakes up, bars 2-3 the call, bar 4 the snare roll into START
for i in range(4): c.pulse(1, bar(1) + 24 * i, 64 + 7 * (i % 2) + 12, 6, vol=5, duty=2)
melody(bar(2), [(4, 76), (4, 79), (4, 83), (2, 81), (2, 79)], vol=11, duty=1, env=4, vib=0.2)
melody(bar(3), [(4, 76), (4, 74), (4, 71), (4, 67)], vol=11, duty=1, env=4, vib=0.2)
melody(bar(4), [(8, 76), (8, 71)], vol=11, duty=1, env=6, vib=0.25)
for b in (2, 3, 4): arp(bar(b), 64, 'm')
bass(bar(2), [0, None, None, None, 0, None, None, None, 7, None, None, None, 5, None, None, None], 40, 20)
bass(bar(3), [0, None, 0, None, 0, None, 7, None, 0, None, 0, None, 7, None, 5, None], 40, 12)
bass(bar(4), [0, None, 0, None, 0, None, 7, None, 0, None, 0, None, 7, None, 5, None], 40, 10)
for i in range(16): c.noise(bar(4) + 6 * i, 4, period=7, vol=4 + i * 0.5, env=2)

# ---- run at dusk (bars 5-11)
RUN = [(64, 40, 'm', [(2, 76), (2, 79), (4, 83), (2, 81), (2, 79), (4, 76)]), (64, 40, 'm', [(2, 83), (2, 86), (4, 83), (2, 81), (2, 79), (4, 81)]),
       (60, 36, 'M', [(2, 84), (2, 83), (4, 79), (2, 76), (2, 79), (4, 84)]), (62, 38, 'M', [(2, 86), (2, 81), (4, 78), (2, 81), (2, 86), (4, 90)]),
       (64, 40, 'm', [(4, 88), (4, 83), (4, 79), (4, 76)])]
for b, k in zip(range(5, 12), [0, 1, 2, 3, 0, 1, 4]):
    ar, br, kind, lead = RUN[k]; f0 = bar(b)
    melody(f0, lead, vol=11, duty=1, env=3, vib=0.15); arp(f0, ar, kind); bass(f0, EIGHTS, br, 10); drums(f0)

# ---- night run (bars 12-17): thinner, lower, brushed
for i, b in enumerate(range(12, 18)):
    ar, br, kind, lead = RUN[[0, 2, 1, 3, 0, 4][i]]; f0 = bar(b)
    melody(f0, [(n, m - 12) for n, m in lead], vol=8, duty=0, env=3, vib=0.1); arp(f0, ar, kind, vol=3, duty=0)
    bass(f0, [0, None, None, None, 0, None, None, None, 7, None, None, None, 0, None, None, None], br, 14)
    drums(f0, kick=(0,), snare=(), hat=range(0, 16, 4))

# ---- silence (bar 18): wind and one low note
c.tri(bar(18), 28, 18); c.noise(bar(18), BAR - 4, period=9, vol=2, env=None)

# ---- swarm (bars 19-24): the climb, then a tremolo that tightens
for i, b in enumerate(range(19, 25)):
    f0 = bar(b)
    bass(f0, [0, None] * 8, 28 if i < 2 else 40, 6, S)
    for s in range(16): c.pulse(0, f0 + s * S, 71 + (i >= 3) * 3, 4, vol=5 + i, duty=2)
    for s in range(16): c.noise(f0 + s * S, 4, period=max(2, 9 - i - s // 8), vol=2 + s * 0.4 + i * 0.6, env=None)
    if i >= 2: arp(f0, 64, 'm', vol=4, duty=1)
# ---- bar 25 and the beat before the light: nothing at all

# ---- light (bars 26-29): the same call in E major, full band
VIC = [(64, 40, [(2, 76), (2, 80), (4, 83), (2, 85), (2, 83), (4, 80)]), (69, 45, [(2, 85), (2, 88), (4, 85), (2, 83), (2, 81), (4, 83)]),
       (71, 47, [(2, 86), (2, 83), (4, 80), (2, 83), (2, 86), (4, 90)]), (64, 40, [(4, 88), (4, 83), (4, 80), (4, 76)])]
for b, (ar, br, lead) in zip(range(26, 30), VIC):
    f0 = bar(b); melody(f0, lead, vol=11, duty=2, env=4, vib=0.2); arp(f0, ar, 'M', vol=5, duty=1); bass(f0, EIGHTS, br, 10); drums(f0, hat=range(0, 16, 4))

# ---- tally (bars 30-33): the call slows down, one voice leaves each bar
TALLY = [[(4, 88), (4, 83), (8, 80)], [(6, 85), (6, 81), (4, 83)], [(8, 88), (8, 80)], [(16, 76)]]
for i, b in enumerate(range(30, 34)):
    f0 = bar(b); melody(f0, TALLY[i], vol=10, duty=2, env=None if i == 3 else 5, vib=0.25)
    if i < 3: bass(f0, [0, None, None, None, None, None, None, None, 7, None, None, None, None, None, None, None], 40, 20)
    if i < 2: arp(f0, 64, 'M', vol=4, duty=1)
    if i < 1: drums(f0, kick=(0, 8), snare=(), hat=())

# ---- bookend (bar 34): the call, once, and the hard cut
melody(bar(34), [(4, 76), (4, 79), (4, 83), (2, 81), (2, 79)], vol=11, duty=1, env=4, vib=0.2); arp(bar(34), 64, 'm')
bass(bar(34), [0, None, None, None, 0, None, None, None, 7, None, None, None, 5, None, None, None], 40, 20)

# ---- sfx from the event list (written last: they steal channels)
for e in ev:
    f, t = e['f'], e['type']
    if f >= FR or 2304 <= f < 2400 and t not in ('sec', 'msg', 'text'): continue
    if t == 'fadestep': c.noise(f, 3, period=2, vol=4, env=1)
    elif t == 'menu': c.pulse(0, f, 86, 3, vol=8, duty=2)
    elif t == 'start': melody(f, [(1, 72), (1, 76), (1, 79), (1, 84), (2, 88)], vol=11, duty=2, env=None)
    elif t == 'step': c.noise(f, 2, period=4, vol=3, env=None)
    elif t == 'coin': melody(f, [(1, 76), (1, 88)], ch=1, vol=9, duty=2, env=None)
    elif t == 'raise': c.pulse(1, f, 64, 22, vol=7, duty=1, slide=0.4)
    elif t == 'spark': c.pulse(1, f, 72, 26, vol=8, duty=2, slide=0.45)
    elif t == 'lamp': c.noise(f, 10, period=6, vol=10, env=1); melody(f + 2, [(1, 76), (1, 83), (2, 88), (3, 95)], vol=11, duty=2, env=None)
    elif t == 'night': c.noise(f, 22, period=3, vol=7, env=1, slide=0.4)
    elif t == 'climb': c.noise(f, 2, period=6, vol=4, env=None)
    elif t == 'wave': c.noise(f, 8, period=8, vol=11, env=1, slide=0.4); c.tri(f, 40, 8, slide=-0.8)
    elif t == 'flutter': c.noise(f, 3, period=6 + (f // 6) % 2, vol=min(10, 2 + e['n'] * 0.4), env=None, mode=1)
    elif t == 'flood': c.noise(f, 26, period=13, vol=13, env=None, slide=-0.5)
    elif t == 'ignite': melody(f, [(1, 64), (1, 71), (1, 76), (1, 83), (1, 88), (3, 95)], vol=12, duty=2, env=None); melody(f, [(1, 52), (1, 59), (1, 64), (1, 71), (1, 76), (3, 83)], ch=1, vol=8, duty=1, env=None)
    elif t == 'flee': c.noise(f, 22, period=3, vol=6, env=1)
    elif t == 'tick': c.pulse(1, f, 72 + min(24, e['v'] / 100 * 0.3), 1, vol=6, duty=2)
    elif t == 'hop': c.pulse(1, f, 74, 5, vol=7, duty=2, slide=1.2)
    elif t == 'hiscore': melody(f, [(2, 84), (2, 88), (2, 91), (8, 96)], vol=11, duty=2, env=None)

w = c.render()
w = w - 0.45 * sosfilt(butter(2, 150, 'low', fs=SR, output='sos'), w)       # the triangle bass is the loudest voice on the chip: ease the low end
n = int(FR / 60 * SR); w = w[:n]
if len(w) < n: w = np.pad(w, (0, n - len(w)))
w[int(2304 / 60 * SR): int(2400 / 60 * SR)] = 0.0                           # the zero: bar 25 (no filter tail either)
os.makedirs(os.path.join(here, 'out'), exist_ok=True)
sf.write(os.path.join(here, 'out/mix.wav'), np.stack([w, w], 1), SR)
print('mix.wav', len(w) / SR, 's, peak', float(np.abs(w).max()), 'rms', float(np.sqrt((w ** 2).mean())))
