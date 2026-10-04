"""Voice bus for a talking-head film. The host's audio is the voice; add a score and foley here (see tools/talk/mix_helpers.py:
duck, gate, fit_grid). If src/music.wav exists it is laid under the voice at -8 dB while the host speaks. Loudness is mux.sh's job."""
import os, sys, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, LIB); sys.path.insert(0, os.path.join(LIB, 'tools', 'talk'))
from mix_helpers import load_voice, voice_env, duck, finish
from core.audio.sfx import SR
film = json.load(open(os.path.join(HERE, 'film.json'))); meta = json.load(open(os.path.join(HERE, 'src', 'meta.json')))
N = int((meta['duration'] + film.get('tail', 0)) * SR)
voice = np.zeros((N, 2), np.float32); v = load_voice(os.path.join(HERE, 'src', 'voice.wav'))[:N]; voice[:len(v), 0] = voice[:len(v), 1] = v
mix = voice.copy()
m = os.path.join(HERE, 'src', 'music.wav')
if os.path.exists(m):
    mu, sr = sf.read(m, dtype='float32'); mu = (mu if mu.ndim > 1 else np.stack([mu, mu], 1))[:N]
    bus = np.zeros((N, 2), np.float32); bus[:len(mu)] = mu * .35
    mix += bus * duck(voice_env(voice), 8)[:, None]
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), finish(mix).astype(np.float32), SR)
print('mix ok', N / SR, 's')
