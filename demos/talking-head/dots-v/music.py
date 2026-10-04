"""A light bed for the Dots portrait film → src/music.wav (A minor pentatonic, 114 BPM): soft ticks, marimba ostinato, plucked bass. The template's mix.py lays it under the voice."""
import os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '..', '..', '..')); sys.path.insert(0, LIB)
from core.audio.sfx import SR, add, lp, hp, noise, t_
DUR, BPM, G0 = 30.08, 114.0, 0.4; BEAT = 60 / BPM; hz = lambda m: 440 * 2 ** ((m - 69) / 12)
def marimba(f, d=.7):
    t = t_(d); y = np.sin(2 * np.pi * f * t) * np.exp(-t / .3) + .33 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / .05); y[:96] *= np.linspace(0, 1, 96); return y
def bass(f, d=.55): t = t_(d); return lp((np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t)) * np.exp(-t / .24) * np.minimum(1, t / .004), 700)
def tick(d=.03): return hp(noise(d), 4500) * np.exp(-t_(d) / .004)
buf = np.zeros((int(DUR * SR), 2), np.float32); PENT = [57, 60, 62, 64, 67, 69, 72, 74]
for n in range(int((DUR - G0) / BEAT) - 1):
    t0 = G0 + n * BEAT; add(buf, tick(), t0, .14, 0); add(buf, tick(), t0 + BEAT / 2, .07, .2)
    if n >= 2:
        for h in range(2): add(buf, marimba(hz(PENT[((n - 2) * 2 + h + (n // 8) * 3) % 8])), t0 + h * BEAT / 2, .2, -.3 + .3 * h)
    if n >= 6 and n % 2 == 0: add(buf, bass(hz(45 if (n // 2) % 2 == 0 else 50)), t0, .3, 0)
fo = int(1.2 * SR); buf[-fo:] *= np.linspace(1, 0, fo)[:, None]
os.makedirs(os.path.join(HERE, 'src'), exist_ok=True); sf.write(os.path.join(HERE, 'src', 'music.wav'), buf, SR); print('music ok')
