"""One-command self-check of a finished film (DIRECTOR.md §11).

  .venv/bin/python tools/check.py <film.mp4> [--srt film.srt] [--page <demo dir>] [--out check-dir]

Measures the file (size, length, loudness, true peak, black frames, frozen stretches, a silent tail), checks the subtitles (overlaps, reading speed,
gaps), runs `readcheck.mjs` when --page is given, and writes a contact sheet of 12 frames and a short report into --out (default: next to the film,
<name>-check/). Prints the verdict. Exit code 0 = no problems, 1 = problems. It cannot hear or judge the film: look at the sheet, listen once."""
import argparse, json, os, re, subprocess, sys
ap = argparse.ArgumentParser(); ap.add_argument('film'); ap.add_argument('--srt'); ap.add_argument('--page'); ap.add_argument('--out'); ap.add_argument('--lufs', type=float, default=-14.0)
A = ap.parse_args()
LIB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if not os.path.isfile(A.film): sys.exit('no such file: %s' % A.film)
out = A.out or os.path.splitext(A.film)[0] + '-check'; os.makedirs(out, exist_ok=True)
def run(*c): return subprocess.run(c, capture_output=True, text=True)
problems, notes, lines = [], [], []
def say(s=''): lines.append(s); print(s)

j = json.loads(run('ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt:format=duration,size', '-of', 'json', A.film).stdout or '{}')
v = next((s for s in j.get('streams', []) if s['codec_type'] == 'video'), None); a = next((s for s in j.get('streams', []) if s['codec_type'] == 'audio'), None)
if not v: sys.exit('no video stream in %s' % A.film)
dur = float(j['format']['duration']); size = int(j['format']['size']) / 1e6
n, d = (v['r_frame_rate'].split('/') + ['1'])[:2]; fps = float(n) / float(d or 1)
say('# Check: %s' % os.path.basename(A.film)); say()
say('- picture: %dx%d, %.2f fps, %s, %.1f s, %.1f MB' % (v['width'], v['height'], fps, v.get('codec_name'), dur, size))
if not a: problems.append('no audio track'); say('- audio: NONE')
if v['width'] < 1280: notes.append('picture is under 1280 wide')
if v.get('pix_fmt') not in ('yuv420p', 'yuvj420p'): notes.append('pixel format %s may not play everywhere (use yuv420p)' % v.get('pix_fmt'))
if size > 100: notes.append('file is %.0f MB: GitHub Releases take it, but a web cut (tools/web_cuts.sh) is easier to share' % size)

if a:
    r = run('ffmpeg', '-hide_banner', '-nostats', '-i', A.film, '-af', 'ebur128=peak=true,silencedetect=n=-50dB:d=1.5', '-f', 'null', '-').stderr
    li = re.findall(r'I:\s+(-?[\d.]+) LUFS', r); lufs = float(li[-1]) if li else None
    tp = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r); peak = float(tp[-1]) if tp else None
    sil = [(float(x), float(y)) for x, y in zip(re.findall(r'silence_start: (-?[\d.]+)', r), re.findall(r'silence_duration: ([\d.]+)', r))]
    say('- loudness: %s LUFS (target %.0f), true peak %s dBFS' % (lufs, A.lufs, peak))
    if lufs is None or abs(lufs - A.lufs) > 1.0: problems.append('loudness %s LUFS is off the %.0f target by more than 1 LU (run core/render/mux.sh)' % (lufs, A.lufs))
    if peak is not None and peak > -1.0: problems.append('true peak %.1f dBFS is above -1.0' % peak)
    for s, dd in sil:
        if s + dd > dur - 0.2 and dd > 3: notes.append('the last %.1f s are silent' % dd)
        elif dd > 4: notes.append('%.1f s of near-silence at %.1f s (intended?)' % (dd, s))

b = run('ffmpeg', '-hide_banner', '-nostats', '-i', A.film, '-vf', 'blackdetect=d=0.15:pix_th=0.04,freezedetect=n=0.003:d=2.5', '-an', '-f', 'null', '-').stderr
blk = re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', b); frz = list(zip(re.findall(r'freeze_start: ([\d.]+)', b), re.findall(r'freeze_duration: ([\d.]+)', b)))
for s, e in blk:
    if float(s) > 0.5 and float(e) < dur - 0.5: problems.append('black frames %.1f–%.1f s in the middle of the film' % (float(s), float(e)))
    else: notes.append('black at %.1f–%.1f s (start/end)' % (float(s), float(e)))
for s, dd in frz:
    if float(dd) > 3: notes.append('picture frozen for %.1f s at %.1f s (a held frame, or a stuck render?)' % (float(dd), float(s)))
say('- black frames: %s; frozen stretches over 2.5 s: %d' % ('none' if not blk else ', '.join('%s–%s' % x for x in blk), len(frz)))

if A.srt:
    cues = []
    for blk_ in re.split(r'\n\s*\n', open(A.srt, encoding='utf8').read().strip()):
        ls = blk_.strip().split('\n'); m = re.search(r'(\d+):(\d+):(\d+)[,.](\d+) --> (\d+):(\d+):(\d+)[,.](\d+)', blk_)
        if m: g = list(map(int, m.groups())); cues.append((g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000, g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000, ' '.join(ls[2:] if len(ls) > 2 else ls[1:])))
    say('- subtitles: %d cues' % len(cues)); fast = 0
    for i, (t0, t1, tx) in enumerate(cues):
        cjk = len(re.findall(r'[\u3000-\u9fff\uff00-\uffef]', tx)); oth = len(re.sub(r'\s', '', tx)) - cjk; need = cjk / 4.5 + oth / 15
        if t1 - t0 < min(need, 1.0): fast += 1
        if i and t0 < cues[i - 1][1] - 0.01: problems.append('subtitle %d overlaps the one before it' % (i + 1))
        if t1 > dur + 0.1: problems.append('subtitle %d ends after the film (%.1f s)' % (i + 1, t1))
    if fast: notes.append('%d subtitle cues are on screen for less than their reading time (of speech they follow, that can be fine)' % fast)

if A.page:
    r = run('node', os.path.join(LIB, 'core/render/readcheck.mjs'), A.page); tail = (r.stdout + r.stderr).strip().split('\n')[-3:]
    say('- readcheck: ' + ('passed' if r.returncode == 0 else 'FAILED' if r.returncode == 1 else 'could not run (exit %d)' % r.returncode)); say('  ' + ' | '.join(tail)[:300])
    if r.returncode == 1: problems.append('readcheck: some on-screen text is too short or never fully visible')

sheet = os.path.join(out, 'sheet.jpg'); tmp = os.path.join(out, '_f'); os.makedirs(tmp, exist_ok=True)
for i in range(12):
    run('ffmpeg', '-v', 'error', '-y', '-ss', '%.2f' % (dur * (i + .5) / 12), '-i', A.film, '-frames:v', '1', '-vf', 'scale=640:-2', os.path.join(tmp, 'f%02d.jpg' % i))
sp = run(os.path.join(LIB, '.venv/bin/python') if os.path.exists(os.path.join(LIB, '.venv/bin/python')) else sys.executable, os.path.join(LIB, 'core/render/sheet.py'), sheet, *[os.path.join(tmp, 'f%02d.jpg' % i) for i in range(12)], '--cols', '4', '--w', '480')
import shutil; shutil.rmtree(tmp, ignore_errors=True)
say('- contact sheet: %s' % (sheet if os.path.exists(sheet) else 'not made (%s)' % sp.stderr.strip()[-120:]))
say()
for p in problems: say('PROBLEM  ' + p)
for x in notes: say('note     ' + x)
say('verdict: ' + ('problems found' if problems else 'no measurable problems (still look at the sheet and listen once)'))
open(os.path.join(out, 'check.md'), 'w', encoding='utf8').write('\n'.join(lines) + '\n')
sys.exit(1 if problems else 0)
