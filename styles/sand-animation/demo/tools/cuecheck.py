"""cuecheck.py: every sweep starts on a bar downbeat and on a music onset (<= 1 frame); the gated silences are really silent."""
import json, os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = json.load(open(os.path.join(HERE, 'score.json')))
FR = 1 / 24; bad = 0
ons = np.array(sorted(c['t'] for c in S['cues']))
for t0, t1 in S['sweeps']:
    k = (t0 - S['bar0']) / S['bar']
    on_grid = abs(k - round(k)) * S['bar'] < 0.001
    near = float(np.min(np.abs(ons - t0)))
    ok = on_grid and near <= FR
    bad += not ok
    print(f"sweep {t0:7.3f}: downbeat={'yes' if on_grid else 'NO'}  nearest music onset {near * 1000:5.1f} ms  {'ok' if ok else 'FAIL'}")
m, sr = sf.read(os.path.join(HERE, 'out', 'music.wav'))
m = m.mean(axis=1) if m.ndim > 1 else m
for a, b in S['gates']:
    seg = m[int((a + .05) * sr):int((b - .05) * sr)]
    rms = float(np.sqrt(np.mean(seg ** 2)))
    ok = rms < 1e-4
    bad += not ok
    print(f"silence {a:6.2f}-{b:6.2f}: music rms {rms:.2e}  {'ok' if ok else 'FAIL'}")
sys.exit(1 if bad else 0)
