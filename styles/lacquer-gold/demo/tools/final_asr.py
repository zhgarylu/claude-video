"""Whisper on the finished film's audio: every voice line must still be heard through the mix.
usage: .venv/bin/python styles/lacquer-gold/demo/tools/final_asr.py <film.mp4> [workdir]"""
import sys, os, json, re, subprocess, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
film = sys.argv[1]; W = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.join(HERE, '..')
TL = json.load(open(os.path.join(W, 'timeline.json')))
wav = os.path.join(W, 'out', 'final_audio.wav')
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', film, '-vn', '-ac', '1', '-ar', '16000', wav], check=True)
from faster_whisper import WhisperModel
m = WhisperModel(os.environ.get('WHISPER_MODEL', 'base.en'), device='cpu', compute_type='int8')
import soundfile as sf
audio, _sr = sf.read(wav, dtype='float32')
segs, _ = m.transcribe(audio, language='en', word_timestamps=True, vad_filter=False)
words = [(w.start, w.end, re.sub(r"[^a-z0-9']", '', w.word.lower())) for s in segs for w in s.words]
norm = lambda s: [re.sub(r"[^a-z0-9']", '', x.lower()) for x in s.split() if re.sub(r"[^a-z0-9']", '', x.lower())]
bad = 0
for v in TL['VO']:
    want = norm(v['text']); win = [w[2] for w in words if v['t'] - 1.6 <= w[0] <= v['t'] + 6]
    hit = sum(1 for x in want if x in win or (x == 'thirty' and '30' in win)); ok = hit >= len(want) - 1
    bad += not ok; print(('OK  ' if ok else 'FAIL'), v['id'], f'{hit}/{len(want)}', v['text'], '' if ok else '| heard: ' + ' '.join(win))
sys.exit(1 if bad else 0)
