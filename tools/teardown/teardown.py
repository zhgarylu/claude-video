"""Take a video apart: shots, rhythm, camera, colours, speech, on-screen text, sound. Output is a brief you can remake the STRUCTURE from.

  .venv/bin/python tools/teardown/teardown.py <video.mp4> [--out dir] [--no-asr] [--no-ocr] [--lang zh|en|auto] [--fps 12]
  .venv/bin/python tools/teardown/teardown.py --url <page url> …      (needs yt-dlp on your PATH; see the rights note in tools/teardown/README.md)

Writes <out>/ (default <video>-teardown/):  teardown.md (read this), teardown.json, storyboard.jpg (one keyframe per shot with times), shots/NN.jpg.
It measures; it does not judge. Look at storyboard.jpg yourself. Remake the structure and rhythm in a library style on your own content; do not reuse
the source's footage, voice, music or characters unless they are yours (TEARDOWN.md)."""
import argparse, json, os, re, shutil, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser(); ap.add_argument('video', nargs='?'); ap.add_argument('--url'); ap.add_argument('--out'); ap.add_argument('--no-asr', action='store_true'); ap.add_argument('--no-ocr', action='store_true')
ap.add_argument('--lang', default='auto'); ap.add_argument('--fps', type=float, default=12); ap.add_argument('--model', default='base'); ap.add_argument('--report', action='store_true', help='also write the 拉片 report (report.html): 3 frames per shot, charts, a model reading of each shot (tools/teardown/lapian.py)')
A = ap.parse_args()
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.path.dirname(os.path.dirname(HERE))
def run(*c, **k): return subprocess.run(c, capture_output=True, **k)
if A.url:
    if not shutil.which('yt-dlp'): sys.exit('--url needs yt-dlp on your PATH (not installed here). Download the video yourself, if you are allowed to, and pass the file.')
    d = tempfile.mkdtemp(prefix='teardown-dl-'); r = run('yt-dlp', '-f', 'mp4/best', '-o', os.path.join(d, 'source.%(ext)s'), A.url, text=True)
    fs_ = [f for f in os.listdir(d)]
    if r.returncode or not fs_: sys.exit('download failed: ' + (r.stderr or '')[-300:])
    A.video = os.path.join(d, fs_[0]); print('downloaded to', A.video)
if not A.video or not os.path.isfile(A.video): sys.exit('usage: teardown.py <video file> (or --url)')
out = A.out or os.path.splitext(A.video)[0] + '-teardown'; os.makedirs(os.path.join(out, 'shots'), exist_ok=True)

# ── probe
j = json.loads(run('ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', A.video, text=True).stdout)
v = next(s for s in j['streams'] if s['codec_type'] == 'video'); has_a = any(s['codec_type'] == 'audio' for s in j['streams'])
W, H = int(v['width']), int(v['height']); dur = float(j['format']['duration']); n, d = (v['r_frame_rate'].split('/') + ['1'])[:2]; fps0 = float(n) / float(d or 1)
print('%dx%d  %.1f s  %s audio' % (W, H, dur, 'with' if has_a else 'no'))

# ── frames (small) for shot detection and motion
SW, SH = 160, int(160 * H / W) // 2 * 2 or 90
raw = run('ffmpeg', '-v', 'error', '-i', A.video, '-vf', 'fps=%g,scale=%d:%d' % (A.fps, SW, SH), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-').stdout
F = np.frombuffer(raw, np.uint8).reshape(-1, SH, SW, 3).astype(np.float32); nf = len(F); print(nf, 'frames sampled')
G = F.mean(3)
def hist(f): return np.concatenate([np.histogram(f[..., c], 16, (0, 255))[0] for c in range(3)]).astype(np.float32) / (SW * SH)
Hs = np.array([hist(f) for f in F]); diff = np.abs(np.diff(G, axis=0)).mean((1, 2)) / 255 + 0.5 * np.abs(np.diff(Hs, axis=0)).sum(1) / 3
med = np.median(diff); mad = np.median(np.abs(diff - med)) + 1e-4; thr = max(med + 8 * mad * 1.4826, 0.06)
cut = [i + 1 for i in range(len(diff)) if diff[i] > thr and (i == 0 or diff[i] >= diff[i - 1]) and (i + 1 >= len(diff) or diff[i] >= diff[i + 1])]
bounds = [0] + cut + [nf]; shots = []
for a, b in zip(bounds[:-1], bounds[1:]):
    if shots and (b - a) / A.fps < 0.3: shots[-1][1] = b; continue          # a flash, not a shot
    shots.append([a, b])
if len(shots) > 1 and (shots[0][1] - shots[0][0]) / A.fps < 0.3: shots[1][0] = 0; shots.pop(0)

# ── per-shot facts
def shift(p, q):
    win = np.outer(np.hanning(p.shape[0]), np.hanning(p.shape[1])); P = np.fft.fft2((p - p.mean()) * win); Q = np.fft.fft2((q - q.mean()) * win)
    R = P * np.conj(Q); R /= np.abs(R) + 1e-9; c = np.fft.ifft2(R).real; y, x = np.unravel_index(c.argmax(), c.shape)
    if y > p.shape[0] // 2: y -= p.shape[0]
    if x > p.shape[1] // 2: x -= p.shape[1]
    return x, y
def scale_est(p, q):                        # >1: q is zoomed in compared with p
    best, bs = -2, 1.0
    for s in (0.94, 0.97, 1.0, 1.03, 1.06):
        h, w = p.shape; ch, cw = int(h * .6), int(w * .6); y0, x0 = (h - ch) // 2, (w - cw) // 2; a = p[y0:y0 + ch, x0:x0 + cw]
        yy = (np.arange(ch) - ch / 2) / s + h / 2; xx = (np.arange(cw) - cw / 2) / s + w / 2; b = q[np.clip(yy.astype(int), 0, h - 1)][:, np.clip(xx.astype(int), 0, w - 1)]
        c = np.corrcoef(a.ravel(), b.ravel())[0, 1]
        if c > best: best, bs = c, s
    return bs
def palette(img, k=4):
    px = np.asarray(img.resize((48, 48))).reshape(-1, 3).astype(np.float32); rng = np.random.default_rng(0); cen = px[rng.choice(len(px), k, replace=False)]
    for _ in range(8):
        lab = ((px[:, None] - cen[None]) ** 2).sum(2).argmin(1)
        for i in range(k):
            if (lab == i).any(): cen[i] = px[lab == i].mean(0)
    cnt = np.bincount(lab, minlength=k); o = np.argsort(-cnt)
    return ['#%02x%02x%02x' % tuple(int(x) for x in cen[i]) for i in o], [round(float(cnt[i]) / len(px), 2) for i in o]
rows = []; kf = []
for i, (a, b) in enumerate(shots):
    t0, t1 = a / A.fps, b / A.fps; mid = (a + b) // 2; q = max(1, (b - a) // 4)
    if b - a >= 4:
        dx, dy = shift(G[a + q // 2], G[b - 1 - q // 2]); sc = scale_est(G[a + q // 2], G[b - 1 - q // 2]); span = (b - 1 - a - q) / A.fps or 1
        pan = float(np.hypot(dx, dy)) / SW / span; zoom = np.log(sc) / span
        jit = float(np.mean(np.abs(np.diff(G[a:b], axis=0)).mean((1, 2)))) / 255
        cam = 'zoom in' if zoom > .035 else 'zoom out' if zoom < -.035 else ('pan/track' if pan > .06 else 'static' if jit < .012 else 'subject motion')
    else: pan, zoom, cam = 0.0, 0.0, 'cut'
    t_key = (t0 + t1) / 2; kfp = os.path.join(out, 'shots', '%02d.jpg' % (i + 1)); run('ffmpeg', '-v', 'error', '-y', '-ss', '%.3f' % t_key, '-i', A.video, '-frames:v', '1', '-vf', 'scale=960:-2', '-q:v', '3', kfp)
    pal, share = palette(Image.fromarray(F[mid].astype(np.uint8))); rows.append({'n': i + 1, 't0': round(t0, 2), 't1': round(t1, 2), 'len': round(t1 - t0, 2), 'camera': cam, 'pan': round(pan, 3), 'zoom': round(float(zoom), 3),
        'brightness': round(float(G[a:b].mean()) / 255, 2), 'palette': pal, 'palette_share': share, 'keyframe': 'shots/%02d.jpg' % (i + 1), 'text': [], 'speech': ''})
lens = np.array([r['len'] for r in rows]); print(len(rows), 'shots, mean %.2f s' % lens.mean())

# ── on-screen text (macOS Vision)
ocr = {}
if not A.no_ocr and sys.platform == 'darwin' and shutil.which('swiftc'):
    binp = os.path.join(os.environ.get('XDG_CACHE_HOME', os.path.expanduser('~/.cache')), 'lemo-opuscar', 'ocr'); os.makedirs(os.path.dirname(binp), exist_ok=True)
    if not os.path.exists(binp) or os.path.getmtime(binp) < os.path.getmtime(os.path.join(HERE, 'ocr.swift')): run('swiftc', '-O', os.path.join(HERE, 'ocr.swift'), '-o', binp)
    r = run(binp, *[os.path.join(out, r_['keyframe']) for r_ in rows], text=True)
    try: ocr = json.loads(r.stdout)
    except Exception: ocr = {}
    for r_ in rows: r_['text'] = [{'text': t['text'], 'y': round(t['y'], 2), 'h': round(t['h'], 3)} for t in ocr.get(os.path.basename(r_['keyframe']), [])]
else: print('on-screen text: skipped (%s)' % ('--no-ocr' if A.no_ocr else 'needs macOS with swiftc'))

# ── sound and speech
audio = {}; words = []
if has_a:
    pcm = run('ffmpeg', '-v', 'error', '-i', A.video, '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-').stdout; x = np.frombuffer(pcm, np.float32)
    if len(x) > 16000:
        hop = 8000; e = np.sqrt((x[:len(x) // hop * hop].reshape(-1, hop) ** 2).mean(1) + 1e-12); db = 20 * np.log10(e + 1e-9)
        o = np.maximum(0, np.diff(e)); o = o - np.convolve(o, np.ones(5) / 5, 'same'); ac = np.correlate(o, o, 'full')[len(o) - 1:]
        lo, hi = int(60 / 180 / (hop / 16000)), int(60 / 60 / (hop / 16000)); bpm = None
        if hi < len(ac) and lo >= 1:
            k = lo + int(np.argmax(ac[lo:hi])); conf = float(ac[k] / (ac[0] + 1e-9)); bpm = round(60 / (k * hop / 16000), 0) if conf > .25 else None
        audio = {'mean_db': round(float(np.mean(db)), 1), 'loud_range_db': round(float(np.percentile(db, 95) - np.percentile(db, 10)), 1), 'tempo_bpm_guess': bpm}
    if not A.no_asr:
        try:
            from faster_whisper import WhisperModel
            m = WhisperModel(A.model, compute_type='int8'); segs, info = m.transcribe(x, language=None if A.lang == 'auto' else A.lang, word_timestamps=True, vad_filter=True)
            for s in segs:
                if s.text.strip(): words.append({'t0': round(s.start, 2), 't1': round(s.end, 2), 'text': s.text.strip()})
            audio['language'] = info.language
        except Exception as ex: print('speech: skipped (%s)' % str(ex)[:80])
for r_ in rows: r_['speech'] = ' '.join(w['text'] for w in words if w['t0'] < r_['t1'] and w['t1'] > r_['t0'])
if words:
    sp = sum(w['t1'] - w['t0'] for w in words); chars = sum(len(re.sub(r'\s', '', w['text'])) for w in words); audio['speech_share'] = round(sp / dur, 2); audio['chars_per_sec'] = round(chars / max(sp, 1), 1)

# ── storyboard
cols = 4; cw = 360; sh_ = int(cw * H / W); rowsn = (len(rows) + cols - 1) // cols; sb = Image.new('RGB', (cw * cols, (sh_ + 22) * rowsn), (18, 18, 20)); dd = ImageDraw.Draw(sb)
for i, r_ in enumerate(rows):
    im = Image.open(os.path.join(out, r_['keyframe'])).resize((cw, sh_)); x0, y0 = (i % cols) * cw, (i // cols) * (sh_ + 22); sb.paste(im, (x0, y0)); dd.text((x0 + 4, y0 + sh_ + 5), '%02d  %.1f-%.1f s  %s' % (r_['n'], r_['t0'], r_['t1'], r_['camera']), fill=(230, 230, 230))
sb.save(os.path.join(out, 'storyboard.jpg'), quality=88)

# ── structure facts and the brief
first3 = [r_ for r_ in rows if r_['t0'] < 3]; sp0 = words[0]['t0'] if words else None
txt_shots = sum(1 for r_ in rows if r_['text']); low_txt = sum(1 for r_ in rows if any(t['y'] > .62 for t in r_['text']))
facts = {'file': os.path.basename(A.video), 'size': [W, H], 'fps': round(fps0, 2), 'duration': round(dur, 2), 'aspect': 'portrait' if H > W else 'landscape' if W > H else 'square', 'shots': len(rows),
         'mean_shot_s': round(float(lens.mean()), 2), 'median_shot_s': round(float(np.median(lens)), 2), 'cuts_per_min': round((len(rows) - 1) / dur * 60, 1), 'first3s_shots': len(first3),
         'speech_starts_s': sp0, 'shots_with_text': txt_shots, 'burned_captions_guess': bool(rows and low_txt >= .6 * len(rows) and words), 'audio': audio}
json.dump({'facts': facts, 'shots': rows, 'speech': words}, open(os.path.join(out, 'teardown.json'), 'w'), ensure_ascii=False, indent=1)
md = ['# Teardown: %s' % facts['file'], '', '%s, %dx%d, %.1f s, %.1f fps.' % (facts['aspect'], W, H, dur, fps0), '',
      '## Rhythm', '- %d shots; mean %.2f s, median %.2f s, %.1f cuts/min.' % (len(rows), facts['mean_shot_s'], facts['median_shot_s'], facts['cuts_per_min']),
      '- Shortest %.2f s, longest %.2f s. %s' % (lens.min(), lens.max(), 'Fast, cut-driven.' if facts['mean_shot_s'] < 2.5 else 'Moderate.' if facts['mean_shot_s'] < 6 else 'Slow, long takes.'),
      '- First 3 s: %d shot(s)%s.' % (len(first3), ', speech starts at %.1f s' % sp0 if sp0 is not None else ', no speech found'), '']
if audio: md += ['## Sound', '- mean level %s dB, dynamic range %s dB%s%s.' % (audio.get('mean_db'), audio.get('loud_range_db'), ', tempo guess %s BPM' % audio['tempo_bpm_guess'] if audio.get('tempo_bpm_guess') else '', ', speech %.0f%% of the time at %s chars/s' % (audio['speech_share'] * 100, audio['chars_per_sec']) if 'speech_share' in audio else ''), '']
md += ['## On-screen text', '- text in %d of %d shots%s.' % (txt_shots, len(rows), '; looks like burned-in captions (lower third)' if facts['burned_captions_guess'] else '') if ocr or txt_shots else '- not read (needs macOS Vision).', '',
       '## Shot by shot', '', '![storyboard](storyboard.jpg)', '', '| # | time | len | camera | on screen | said |', '|---|---|---|---|---|---|']
for r_ in rows: md.append('| %02d | %.1f–%.1f | %.1f | %s | %s | %s |' % (r_['n'], r_['t0'], r_['t1'], r_['len'], r_['camera'], ' / '.join(t['text'] for t in r_['text'])[:70].replace('|', '/'), r_['speech'][:80].replace('|', '/')))
md += ['', '## Palette', ''] + ['- shot %02d: %s' % (r_['n'], ' '.join(r_['palette'])) for r_ in rows[:12]]
md += ['', '## To remake it', '', 'This measures the video; it does not say what it means. Look at storyboard.jpg, then write TREATMENT.md (DIRECTOR.md §4) for **your own content**:',
       '- keep the **structure** (hook in the first seconds, how information arrives, where the pauses and the payoff sit) and the **rhythm** (shot lengths above), in one library style (styles/README.md);',
       '- do not reuse the source footage, voice, music, characters or text unless you own them or have a licence (TEARDOWN.md).']
open(os.path.join(out, 'teardown.md'), 'w', encoding='utf8').write('\n'.join(md) + '\n'); print('→', os.path.join(out, 'teardown.md'))
if A.report: sys.exit(subprocess.run([sys.executable, os.path.join(HERE, 'lapian.py'), A.video, '--dir', out, '--lang', A.lang]).returncode)
