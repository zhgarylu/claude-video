"""Another language for a talking-head film: captions, and optionally a dubbed voice track.

  1. .venv/bin/python tools/talk/localize.py export <project>/src
       writes <src>/lines.json: [{id, t0, t1, text}], the host's sentences with their times (from words.json). Translate the `text` of each (you, or Claude).
  2. .venv/bin/python tools/talk/localize.py apply <project>/src --lang en --translations en.json [--dub] [--voice af_bella] [--speed 0.95]
       en.json is [{id, text}] or {"id": "text"}. Writes:
         <src>/captions.en.srt, <src>/cues.en.json     the captions at the host's times
         <src>/dub.en.wav    (with --dub) a mono 48 kHz track, each translated sentence spoken by Kokoro (offline) and fitted into its window

Limits, honestly: the host's lips still say the original language, so a dub works as a voice-over (turn the original voice down; keep the host small or
turned away), not as lip-synced dubbing. A translation that is longer than its window is sped up to at most 1.35x and reported if it still overruns;
shorten the text instead. Kokoro speaks English, French, Spanish, Italian, Portuguese, Japanese, Hindi and Mandarin (--lang en|fr|es|it|pt|ja|hi|zh, with a
voice that matches); other languages: captions only, or use core/tts/tts_zh.py (edge-tts, online) for the audio yourself.
The film's page and mix are yours to switch: read cues.<lang>.json instead of words.json, and put dub.<lang>.wav (original voice ducked about 18 dB) in mix.py."""
import argparse, json, os, subprocess, sys, tempfile, shutil
import numpy as np, soundfile as sf, soxr

LIB = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KOKORO = {'en': ('en-us', 'af_bella'), 'fr': ('fr-fr', 'ff_siwis'), 'es': ('es', 'ef_dora'), 'it': ('it', 'if_sara'), 'pt': ('pt-br', 'pf_dora'), 'ja': ('ja', 'jf_alpha'), 'hi': ('hi', 'hf_alpha'), 'zh': ('cmn', 'zf_xiaobei')}
ap = argparse.ArgumentParser(); ap.add_argument('cmd', choices=['export', 'apply']); ap.add_argument('src'); ap.add_argument('--lang', default='en'); ap.add_argument('--translations')
ap.add_argument('--dub', action='store_true'); ap.add_argument('--voice'); ap.add_argument('--speed', type=float, default=0.95); ap.add_argument('--merge-gap', type=float, default=0.35)
A = ap.parse_args(); S = A.src

def sentences():
    segs = json.load(open(os.path.join(S, 'words.json'))); out = []
    for s in segs:
        if out and s['t0'] - out[-1]['t1'] < A.merge_gap and len(out[-1]['text']) < 20: out[-1]['t1'] = s['t1']; out[-1]['text'] += ' ' + s['text']
        else: out.append({'t0': s['t0'], 't1': s['t1'], 'text': s['text']})
    return [{'id': 's%02d' % (i + 1), **o} for i, o in enumerate(out)]

if A.cmd == 'export':
    L = sentences(); json.dump(L, open(os.path.join(S, 'lines.json'), 'w'), ensure_ascii=False, indent=1)
    for l in L: print('%s  %5.2f–%5.2f  %s' % (l['id'], l['t0'], l['t1'], l['text']))
    print('→ %s/lines.json  (translate "text", save as {"id": "translation"} or [{id, text}], then run apply)' % S); sys.exit(0)

if not A.translations: sys.exit('apply needs --translations')
tr = json.load(open(A.translations)); tr = {x['id']: x['text'] for x in tr} if isinstance(tr, list) else tr
base = json.load(open(os.path.join(S, 'lines.json'))) if os.path.exists(os.path.join(S, 'lines.json')) else sentences()
missing = [b['id'] for b in base if not tr.get(b['id'], '').strip()]
if missing: sys.exit('no translation for: ' + ', '.join(missing))
cues = [{'id': b['id'], 't0': b['t0'], 't1': b['t1'], 'text': tr[b['id']].strip()} for b in base]
json.dump(cues, open(os.path.join(S, 'cues.%s.json' % A.lang), 'w'), ensure_ascii=False, indent=1)
def ts(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return ('%02d:%02d:%06.3f' % (h, m, s)).replace('.', ',')
with open(os.path.join(S, 'captions.%s.srt' % A.lang), 'w', encoding='utf8') as f:
    for i, c in enumerate(cues): f.write('%d\n%s --> %s\n%s\n\n' % (i + 1, ts(c['t0']), ts(c['t1']), c['text']))
print('wrote captions.%s.srt and cues.%s.json (%d cues)' % (A.lang, A.lang, len(cues)))
if not A.dub: sys.exit(0)

if A.lang not in KOKORO: sys.exit('Kokoro has no voice set for %r; captions are written. Make the audio with core/tts/tts_zh.py or your own TTS.' % A.lang)
lg, vc = KOKORO[A.lang]; vc = A.voice or vc; PY = os.path.join(LIB, '.venv/bin/python')
tmp = tempfile.mkdtemp(prefix='localize-'); lines = [{'id': c['id'], 'text': c['text'], 'voice': vc, 'speed': A.speed, 'lang': lg} for c in cues]
json.dump(lines, open(os.path.join(tmp, 'lines.json'), 'w'), ensure_ascii=False)
r = subprocess.run([PY, os.path.join(LIB, 'core/tts/tts.py'), os.path.join(tmp, 'lines.json'), os.path.join(tmp, 'v')], capture_output=True, text=True)
if r.returncode: sys.exit('tts failed:\n' + (r.stdout + r.stderr)[-800:])
total = max(c['t1'] for c in cues) + 2.0; SR = 48000; buf = np.zeros(int(total * SR), np.float32); over = []
for i, c in enumerate(cues):
    x, sr = sf.read(os.path.join(tmp, 'v', c['id'] + '.wav'), dtype='float32'); x = x.mean(1) if x.ndim > 1 else x; x = soxr.resample(x, sr, SR)
    room = (cues[i + 1]['t0'] - 0.15 if i + 1 < len(cues) else total - 0.2) - c['t0']; room = max(room, c['t1'] - c['t0'])   # may run into the pause that follows
    need = len(x) / SR
    if need > room:
        k = min(1.35, need / room); p = os.path.join(tmp, c['id'] + '_f.wav'); sf.write(p, x, SR)
        fr = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', p, '-af', 'atempo=%.4f' % k, os.path.join(tmp, c['id'] + '_g.wav')], capture_output=True)
        if fr.returncode == 0: x, _ = sf.read(os.path.join(tmp, c['id'] + '_g.wav'), dtype='float32')
        if len(x) / SR > room + 0.05: over.append((c['id'], len(x) / SR - room))
    a0 = int(c['t0'] * SR); buf[a0:a0 + len(x)] += x[:len(buf) - a0]
out = os.path.join(S, 'dub.%s.wav' % A.lang); sf.write(out, buf, SR); shutil.rmtree(tmp, ignore_errors=True)
print('wrote %s (%.1f s, voice %s)' % (out, total, vc))
for i_, o in over: print('  overruns its window by %.2f s: %s (shorten the translation)' % (o, i_))
