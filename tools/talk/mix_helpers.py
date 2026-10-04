"""Mix helpers for films with a presenter's voice. Import from a film's mix.py:

    sys.path.insert(0, os.path.join(LIB, 'tools', 'talk')); from mix_helpers import *

voice = load_voice('src/voice.wav')                     # high-passed, lightly compressed, set to a fixed RMS
env   = voice_env(voice_bus)                            # 0..1 follower of the voice
mix   = voice + music*duck(env, 8) + foley*duck(env, 3) + amb   # music ≈ −8 dB and foley ≈ −3 dB under speech
gate(bus, [(28.02, 28.20)])                             # digital silence on a bus (the voice keeps going)
bpm, g0, errs = fit_grid([7.72, 14.22, 20.68])          # a tempo whose beats land on your scene starts
"""
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfiltfilt
from core.audio.sfx import SR, hp, compress, limit


def load_voice(path, rms=0.11):
    v = sf.read(path, dtype='float32')[0]
    if v.ndim > 1: v = v.mean(1)
    v = compress(hp(v, 70), thr=.18, ratio=2.6)
    return v * (rms / max(1e-6, float(np.sqrt((v ** 2).mean()))))


def voice_env(bus):
    """0..1 envelope of a (N,2) or (N,) voice bus, smoothed to ~9 Hz."""
    x = np.abs(bus[:, 0] if bus.ndim > 1 else bus)
    e = np.clip(sosfiltfilt(butter(2, 9, 'low', fs=SR, output='sos'), x), 0, None)
    return np.clip(e / (np.percentile(e, 95) + 1e-9), 0, 1)


def duck(env, db):
    """Gain curve that lowers a bus by about `db` dB while the voice is up (linear approximation)."""
    return 1 - (1 - 10 ** (-db / 20)) * env


def gate(bus, spans, fade=.003):
    """Digital zero on `bus` ((N,2)) for each (t0, t1) span, with 3 ms ramps. Use it on music, foley and ambience, not the voice."""
    f = int(fade * SR); g = np.ones(len(bus), np.float32)
    for t0, t1 in spans:
        a, b = int(t0 * SR), int(t1 * SR); g[a:b] = 0; g[a - f:a] = np.linspace(1, 0, f); g[b:b + f] = np.linspace(0, 1, f)
    bus *= g[:, None]
    return bus


def finish(mix, tail=.8, ceil=.92):
    """Fade the last `tail` s and limit each channel. mux.sh does the loudness (−14 LUFS)."""
    fo = int(tail * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
    for c in range(mix.shape[1]): mix[:, c] = limit(mix[:, c], ceil)
    return mix


def fit_grid(starts, bpm_range=(90, 130), beats_per_unit=1):
    """Find (bpm, g0) so that every scene start in `starts` falls near a beat.
    Returns (bpm, g0, errors_in_seconds). Beat n is at g0 + n*60/bpm."""
    best = None
    for bpm in np.arange(bpm_range[0], bpm_range[1], .01):
        b = 60 / bpm; g0 = starts[0] % b
        errs = [min((s - g0) % b, b - (s - g0) % b) for s in starts]
        score = max(errs)
        if best is None or score < best[0]: best = (score, bpm, g0, errs)
    return round(float(best[1]), 2), round(float(best[2]), 4), [round(float(e), 3) for e in best[3]]
