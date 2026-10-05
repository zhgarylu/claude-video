"""Audio sanity check for mix.wav: RMS per section, band balance, the two silences. usage: .venv/bin/python styles/stage-light/demo/tools/audiocheck.py [file]"""
import sys, os, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
f = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'mix.wav')
x, sr = sf.read(f); m = x.mean(1)
db = lambda v: 20 * np.log10(max(v, 1e-9))
def rms(a, b): s = m[int(a * sr):int(b * sr)]; return db(np.sqrt((s ** 2).mean()))
for n, a, b in [('intro', 0, 8), ('build', 8, 23.5), ('GAP 23.5-24', 23.5, 24), ('drop', 24, 40), ('SIL 40-41', 40, 41), ('bridge', 41, 48), ('finale', 48, 56), ('tail', 56.5, 60)]:
    print(f'{n:14s} {rms(a, b):7.1f} dB')
for n, lo, hi in [('20-120', 20, 120), ('120-500', 120, 500), ('500-2k', 500, 2000), ('2k-8k', 2000, 8000), ('8k+', 8000, 20000)]:
    s = sosfilt(butter(4, [lo, min(hi, sr / 2 - 100)], 'band', fs=sr, output='sos'), m[int(24 * sr):int(40 * sr)]); print(f'drop band {n:8s} {db(np.sqrt((s ** 2).mean())):6.1f} dB')
print('peak', db(np.abs(x).max()), 'clipped samples', int((np.abs(x) >= .999).sum()))
print('per-second RMS:', ' '.join(f'{rms(i, i + 1):.0f}' for i in range(int(len(m) / sr))))
