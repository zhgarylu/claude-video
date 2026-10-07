"""Index a video so you can find the 10-30 second moments in it: probe, transcript with word times, scene cuts, on-screen text (OCR).

  .venv/bin/python tools/breakdown/ingest.py <video> --out <dir> [--lang auto|zh|en] [--model small] [--no-asr] [--no-ocr]
  .venv/bin/python tools/breakdown/ingest.py --url <page> --out <dir>        (only if yt-dlp is on your PATH; never installed here)

Writes <dir>/index.json (everything), index.md (a readable outline: transcript with times, text seen on screen), transcript.txt, keyframes/*.jpg.
Then: .venv/bin/python tools/breakdown/find.py <dir> "a phrase or keyword" --top 5

Rights: the video is yours to use or to have permission to use; platform terms and copyright are yours to judge. This tool analyses and indexes it
locally and never uploads it. A keynote an hour long takes a few minutes (speech-to-text is the slow part: --model base is faster, small is better for Chinese).
On-screen text needs macOS (Vision); elsewhere the transcript alone is indexed."""
import argparse, json, os, re, shutil, subprocess, sys, tempfile
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.path.dirname(os.path.dirname(HERE))
ap = argparse.ArgumentParser(); ap.add_argument('video', nargs='?'); ap.add_argument('--url'); ap.add_argument('--out', required=True); ap.add_argument('--lang', default='auto'); ap.add_argument('--model', default='small')
ap.add_argument('--no-asr', action='store_true'); ap.add_argument('--no-ocr', action='store_true'); ap.add_argument('--scene', type=float, default=.28); ap.add_argument('--ocr-step', type=float, default=0, help='seconds between OCR keyframes (default: auto, 3-8 s)')
A = ap.parse_args()
def run(*c, **k): return subprocess.run(c, capture_output=True, **k)
OUT = os.path.abspath(A.out); os.makedirs(os.path.join(OUT, 'keyframes'), exist_ok=True)
NOTICE = 'Rights: use footage you own or have permission to use (platform terms and copyright are yours to judge). Indexing happens on this machine; nothing is uploaded.'
if A.url:
    if not shutil.which('yt-dlp'): sys.exit('--url needs yt-dlp on your PATH (it is not installed here and this tool never installs it). Download the video yourself, if you are allowed to, and pass the file.\n' + NOTICE)
    print(NOTICE); r = run('yt-dlp', '-f', 'mp4/best', '-o', os.path.join(OUT, 'source.%(ext)s'), A.url, text=True)
    fs_ = [f for f in os.listdir(OUT) if f.startswith('source.')]
    if r.returncode or not fs_: sys.exit('download failed: ' + (r.stderr or '')[-300:])
    A.video = os.path.join(OUT, fs_[0]); print('downloaded to', A.video)
if not A.video or not os.path.isfile(A.video): sys.exit('usage: ingest.py <video file> --out <dir>   (or --url <page>)')
V = os.path.abspath(A.video)
j = json.loads(run('ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration,format_name', '-of', 'json', V, text=True).stdout)
vs = next(s for s in j['streams'] if s['codec_type'] == 'video'); has_a = any(s['codec_type'] == 'audio' for s in j['streams']); DUR = float(j['format']['duration'])
print('%dx%d, %.1f s, %s audio' % (int(vs['width']), int(vs['height']), DUR, 'with' if has_a else 'no'))

# ── transcript
segments = []
if has_a and not A.no_asr:
    try:
        from faster_whisper import WhisperModel
        pcm = run('ffmpeg', '-v', 'error', '-i', V, '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-').stdout; x = np.frombuffer(pcm, np.float32)
        model = WhisperModel(A.model, compute_type='int8'); segs, info = model.transcribe(x, language=None if A.lang == 'auto' else A.lang, word_timestamps=True, vad_filter=True)
        nxt = 60
        for s in segs:
            if s.text.strip(): segments.append({'t0': round(s.start, 2), 't1': round(s.end, 2), 'text': s.text.strip(), 'words': [{'w': w.word.strip(), 't0': round(w.start, 2), 't1': round(w.end, 2)} for w in (s.words or [])]})
            if s.end > nxt: print('  transcribed to %d s of %d' % (s.end, DUR)); nxt += 60
        print('speech: %d segments, language %s' % (len(segments), info.language))
    except Exception as ex: print('speech: skipped (%s)' % str(ex)[:120])

# ── scene cuts and keyframes (one pass for the cuts, one for a regular grid)
step = A.ocr_step or min(8.0, max(3.0, DUR / 500)); scenes = []
r = run('ffmpeg', '-hide_banner', '-nostats', '-an', '-i', V, '-vf', "scale=320:-2,select='gt(scene,%g)',showinfo" % A.scene, '-f', 'null', '-', text=True)
scenes = [round(float(m), 2) for m in re.findall(r'pts_time:([\d.]+)', r.stderr)]
print('scenes: %d cuts' % len(scenes))
grid = os.path.join(OUT, 'keyframes', 'g_%05d.jpg')
run('ffmpeg', '-v', 'error', '-y', '-an', '-i', V, '-vf', "fps=1/%g,scale=960:-2" % step, '-q:v', '4', grid)
frames = []
for f in sorted(os.listdir(os.path.join(OUT, 'keyframes'))):
    m = re.match(r'g_(\d+)\.jpg', f)
    if m: frames.append({'t': round((int(m.group(1)) - 1) * step + step / 2, 2), 'file': 'keyframes/' + f, 'text': []})
print('keyframes: %d (every %.1f s)' % (len(frames), step))

# ── on-screen text (macOS Vision, the same helper tools/teardown uses)
if not A.no_ocr and sys.platform == 'darwin' and shutil.which('swiftc') and frames:
    binp = os.path.join(os.environ.get('XDG_CACHE_HOME', os.path.expanduser('~/.cache')), 'lemo-opuscar', 'ocr'); os.makedirs(os.path.dirname(binp), exist_ok=True); src = os.path.join(LIB, 'tools', 'teardown', 'ocr.swift')
    if not os.path.exists(binp) or os.path.getmtime(binp) < os.path.getmtime(src): run('swiftc', '-O', src, '-o', binp)
    got = {}
    for i in range(0, len(frames), 60):
        r = run(binp, *[os.path.join(OUT, f['file']) for f in frames[i:i + 60]], text=True)
        try: got.update(json.loads(r.stdout))
        except Exception: pass
        print('  ocr %d/%d' % (min(len(frames), i + 60), len(frames)))
    for f in frames: f['text'] = [{'text': t['text'], 'y': round(t['y'], 3)} for t in got.get(os.path.basename(f['file']), [])]
else: print('on-screen text: skipped (%s)' % ('--no-ocr' if A.no_ocr else 'needs macOS with swiftc'))

idx = {'file': V, 'duration': DUR, 'size': [int(vs['width']), int(vs['height'])], 'language': A.lang, 'step': step, 'segments': segments, 'scenes': scenes, 'frames': frames, 'notice': NOTICE}
json.dump(idx, open(os.path.join(OUT, 'index.json'), 'w'), ensure_ascii=False, indent=1)
mm = lambda s: '%d:%02d' % (s // 60, s % 60)
open(os.path.join(OUT, 'transcript.txt'), 'w', encoding='utf8').write('\n'.join('[%s] %s' % (mm(s['t0']), s['text']) for s in segments) + '\n')
md = ['# %s' % os.path.basename(V), '', '%dx%d, %s, %d scene cuts. %s' % (idx['size'][0], idx['size'][1], mm(DUR), len(scenes), NOTICE), '', '## Transcript']
md += ['- `%s` %s' % (mm(s['t0']), s['text']) for s in segments] or ['(none)']
md += ['', '## On screen (text that changed)']; prev = set()
for f in frames:
    cur = [t['text'] for t in f['text'] if len(t['text']) > 1]; new = [t for t in cur if t not in prev]
    if new: md.append('- `%s` %s' % (mm(f['t']), ' / '.join(new[:6])))
    prev = set(cur)
open(os.path.join(OUT, 'index.md'), 'w', encoding='utf8').write('\n'.join(md) + '\n')
print('→', os.path.join(OUT, 'index.json'), '\nnext: .venv/bin/python tools/breakdown/find.py', OUT, '"keyword"')
