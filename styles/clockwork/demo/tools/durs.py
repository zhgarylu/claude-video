"""durs.py: voices/dur.json from the voice WAVs (the page reads it for caption lengths)."""
import json, os, soundfile as sf
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'voices')
d = {}
for f in sorted(os.listdir(H)):
    if f.startswith('v') and f.endswith('.wav'):
        w, sr = sf.read(os.path.join(H, f)); d[f[:-4]] = round(len(w) / sr, 3)
json.dump(d, open(os.path.join(H, 'dur.json'), 'w'), indent=1); print(d)
