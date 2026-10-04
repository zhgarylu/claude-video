"""Voice envelope + word timings + pauses for a presenter video.
usage: python tools/talk/analyze.py <project>/src --fps 24 --lang zh --prompt "terms" --model large-v3-turbo
Reads <src>/voice.wav and <src>/frames/, writes env.json, words.json, meta.json and prints the cue sheet.
Why it loads the audio itself: faster-whisper's own decoder (PyAV) fails on some installs with
"open() got an unexpected keyword argument 'metadata_errors'"; passing a numpy array avoids it."""
import argparse, glob, json, os, subprocess
import numpy as np, soundfile as sf, soxr

ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('--fps', type=int, default=24)
ap.add_argument('--lang', default='auto'); ap.add_argument('--prompt', default=''); ap.add_argument('--model', default='large-v3-turbo')
ap.add_argument('--min-pause', type=float, default=0.8)
a = ap.parse_args()
S = a.src
x, sr = sf.read(os.path.join(S, 'voice.wav'), dtype='float32')
if x.ndim > 1: x = x.mean(1)
dur = len(x) / sr

# voice level per frame (smoothed, normalised by the 95th percentile of the speech)
n = int(dur * a.fps) + a.fps * 2
w = sr // a.fps; pad = np.pad(x, (0, n * w - len(x)))
r = np.sqrt((pad[:n * w].reshape(n, w) ** 2).mean(1) + 1e-12); r = np.convolve(r, [.25, .5, .25], mode='same')
live = r[:int(dur * a.fps)]
r = np.clip(r / (np.percentile(live, 95) + 1e-9), 0, 1)
json.dump([round(float(v), 3) for v in r], open(os.path.join(S, 'env.json'), 'w'))

# frame size
frames = sorted(glob.glob(os.path.join(S, 'frames', '*.jpg')))
wh = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', os.path.join(S, 'host.mp4')], capture_output=True, text=True).stdout.strip().split('x')
json.dump({'fps': a.fps, 'frames': len(frames), 'w': int(wh[0]), 'h': int(wh[1]), 'duration': round(dur, 3)}, open(os.path.join(S, 'meta.json'), 'w'))

# speech-to-text with word timestamps
from faster_whisper import WhisperModel
audio = soxr.resample(x, sr, 16000).astype('float32')
model = WhisperModel(a.model, compute_type='int8')
segs, info = model.transcribe(audio, language=None if a.lang == 'auto' else a.lang, word_timestamps=True, initial_prompt=a.prompt or None)
out = [{'t0': round(s.start, 2), 't1': round(s.end, 2), 'text': s.text.strip(), 'words': [{'w': w_.word, 't0': round(w_.start, 2), 't1': round(w_.end, 2)} for w_ in s.words]} for s in segs]
# drop the hallucinated tail Whisper adds after the speech ends
out = [s for s in out if s['t0'] < dur - 0.3 or s['t1'] - s['t0'] > 0.3]
json.dump(out, open(os.path.join(S, 'words.json'), 'w'), ensure_ascii=False, indent=1)

print(f'\nhost: {dur:.2f} s, {len(frames)} frames @ {a.fps} fps, {wh[0]}x{wh[1]}')
print('\n== cue sheet (listen to the video and fix mishearings in your own notes; the picture follows the host, not the text) ==')
for s in out:
    print(f"{s['t0']:6.2f} – {s['t1']:6.2f}  {s['text']}")
    print('        ' + ' '.join(f"{w_['w'].strip()}@{w_['t0']}" for w_ in s['words']))
words = [w_ for s in out for w_ in s['words']]
print(f'\n== pauses ≥ {a.min_pause} s: transition and camera windows ==')
prev = 0.0
for w_ in words:
    if w_['t0'] - prev >= a.min_pause: print(f'  {prev:6.2f} – {w_["t0"]:6.2f}  ({w_["t0"] - prev:.2f} s)')
    prev = max(prev, w_['t1'])
if dur - prev >= a.min_pause: print(f'  {prev:6.2f} – {dur:6.2f}  (tail, {dur - prev:.2f} s)')
