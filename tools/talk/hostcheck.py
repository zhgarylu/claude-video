"""Check a presenter video before you build on it: will it work for a talking-head film?

  .venv/bin/python tools/talk/hostcheck.py <host.mp4> [--board]    # --board: a surface in the world will be replaced by tracking (TALKING-HEAD.md §3d)

Reports size, frame rate, length, sound, loudness, pauses, how steady the camera is, how sharp the picture is, and (on macOS) how much of the frame
the host fills. Then lists what to fix, in plain words, before you spend time on a film. It reads the video only; it writes nothing but a temporary folder.
Exit code: 0 = usable, 1 = at least one problem that will cost you, 2 = cannot read the file."""
import argparse, json, os, re, shutil, subprocess, sys, tempfile
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser(); ap.add_argument('video'); ap.add_argument('--board', action='store_true', help='a surface will be tracked and replaced: the camera must move slowly and evenly')
A = ap.parse_args()
if not os.path.isfile(A.video): sys.exit('no such file: %s' % A.video)
def run(*c): return subprocess.run(c, capture_output=True, text=True)
pr = run('ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate,nb_frames,channels:format=duration', '-of', 'json', A.video)
try: j = json.loads(pr.stdout)
except Exception: sys.exit('ffprobe cannot read %s' % A.video)
v = next((s for s in j['streams'] if s['codec_type'] == 'video'), None); a = next((s for s in j['streams'] if s['codec_type'] == 'audio'), None)
if not v: sys.exit('no video stream')
num, den = (v['r_frame_rate'].split('/') + ['1'])[:2]; fps = float(num) / float(den or 1); W, H = int(v['width']), int(v['height']); dur = float(j['format']['duration'])
problems, notes = [], []
def bad(msg): problems.append(msg)
def note(msg): notes.append(msg)

print('%s\n  %dx%d  %.2f fps  %.1f s  audio: %s' % (A.video, W, H, fps, dur, 'yes' if a else 'NO'))
if min(W, H) < 720: bad('the picture is under 720p: it will look soft next to drawn graphics. Generate or export at 1080p.')
elif min(W, H) < 1080: note('under 1080p: it is upscaled in a 1080p film (fine for a small window, soft when full-frame).')
if fps < 23 or fps > 61: bad('frame rate %.1f is unusual; export 24 or 30 fps.' % fps)
if dur < 8: bad('under 8 seconds: too short for an explainer.')
if dur > 120: note('over 2 minutes: the film will be long to render; consider cutting into episodes.')
if not a: bad('no audio track: nothing to transcribe or time the film to. Generate the video with the voice, or add a voice-over.')

# loudness and pauses
if a:
    r = run('ffmpeg', '-hide_banner', '-nostats', '-i', A.video, '-vn', '-af', 'ebur128=peak=true,silencedetect=n=-38dB:d=0.8', '-f', 'null', '-')
    t = r.stderr; m = re.findall(r'I:\s+(-?[\d.]+) LUFS', t); lufs = float(m[-1]) if m else None
    pk = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', t); peak = float(pk[-1]) if pk else None
    sil = [(float(x), float(y)) for x, y in zip(re.findall(r'silence_start: (-?[\d.]+)', t), re.findall(r'silence_duration: ([\d.]+)', t))]
    print('  loudness %s LUFS, peak %s dBFS' % (lufs, peak))
    print('  pauses ≥0.8 s: %s' % (', '.join('%.1f–%.1f' % (s, s + d) for s, d in sil) or 'none'))
    if lufs is not None and lufs < -32: bad('the voice is very quiet (%.0f LUFS): speech-to-text will miss words. Re-export louder or normalise.' % lufs)
    if peak is not None and peak > -0.3: note('the voice clips (peak %.1f dBFS).' % peak)
    if not sil: note('no pause longer than 0.8 s: there is no natural window for a transition or a camera move; film a breath between sections.')
    if sil and sil[0][0] < 0.05 and sil[0][1] > 3: note('the video starts with %.1f s of silence.' % sil[0][1])

# sample frames: camera motion, sharpness, host share
tmp = tempfile.mkdtemp(prefix='lemo-inspect-')
try:
    step = 4; run('ffmpeg', '-v', 'error', '-y', '-i', A.video, '-vf', 'fps=%d,scale=320:-2' % step, '-q:v', '4', os.path.join(tmp, 's_%04d.jpg'))
    fr = sorted(f for f in os.listdir(tmp) if f.startswith('s_'))
    G = [np.asarray(Image.open(os.path.join(tmp, f)).convert('L'), np.float32) for f in fr]
    def shift(p, q):
        win = np.outer(np.hanning(p.shape[0]), np.hanning(p.shape[1])); P = np.fft.fft2((p - p.mean()) * win); Q = np.fft.fft2((q - q.mean()) * win)
        R = P * np.conj(Q); R /= np.abs(R) + 1e-9; c = np.fft.ifft2(R).real; y, x = np.unravel_index(c.argmax(), c.shape)
        if y > p.shape[0] // 2: y -= p.shape[0]
        if x > p.shape[1] // 2: x -= p.shape[1]
        return float(np.hypot(x, y)) * (W / 320) , float(c.max())
    sp = [shift(G[i], G[i + 1]) for i in range(len(G) - 1)]; speed = np.array([s for s, _ in sp]) * step     # px/s at full width
    sharp = np.array([np.var(np.diff(g, axis=0)) + np.var(np.diff(g, axis=1)) for g in G])
    if len(speed):
        med = float(np.median(speed)); mx = float(speed.max()); p95 = float(np.percentile(speed, 95))
        print('  camera/subject motion: median %.0f px/s, 95th %.0f, max %.0f (full-frame px)' % (med, p95, mx))
        if A.board:
            if mx > 0.5 * W: bad('the picture jumps (%.0f px between samples): a cut or a whip-pan. A tracked surface needs one continuous, slow, even move; regenerate with "no cuts, constant slow speed".' % (mx / step))
            elif p95 > 6 * max(med, 15) and p95 > 150: bad('the camera speed is uneven (95th %.0f vs median %.0f px/s): tracking will drift on the fast parts. Ask for constant speed.' % (p95, med))
            elif med > 0.25 * W: note('the camera moves fast (median %.0f px/s): tracking works but a slow move holds a texture longer.' % med)
    if sharp.min() < 0.35 * np.median(sharp): note('some frames are much softer than the rest (motion blur or a focus pull); a tracked texture is least reliable there.')
finally:
    pass

# host share (macOS Vision, if available)
mt = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'matte', 'run.sh')
if sys.platform == 'darwin' and shutil.which('swiftc') and os.path.exists(mt):
    proj = os.path.join(tmp, 'p'); os.makedirs(os.path.join(proj, 'src', 'frames'))
    for i, f in enumerate(fr[::max(1, len(fr) // 12)][:12]): shutil.copy(os.path.join(tmp, f), os.path.join(proj, 'src', 'frames', '%04d.jpg' % (i + 1)))
    if subprocess.run(['sh', mt, proj, '--scale', '1'], capture_output=True).returncode == 0:
        md = os.path.join(proj, 'src', 'matte'); sh = []
        for f in sorted(os.listdir(md)): sh.append(np.asarray(Image.open(os.path.join(md, f)).split()[-1], np.float32).mean() / 255)
        if sh:
            m_, lo, hi = float(np.mean(sh)), float(np.min(sh)), float(np.max(sh)); print('  host fills %.0f%% of the frame on average (%.0f%%–%.0f%%)' % (m_ * 100, lo * 100, hi * 100))
            if hi < 0.01: bad('Vision finds no person in the sampled frames: a person matte will not work on this video; the colour key is the fallback.')
            elif lo < 0.01 and hi > 0.05: note('the host leaves the frame in some samples.')
            if hi > 0.55: note('the host fills over half the frame at times; there is little room for graphics around them.')
else: print('  host share: skipped (needs macOS with swiftc)')
shutil.rmtree(tmp, ignore_errors=True)

print()
for p in problems: print('  PROBLEM  ' + p)
for n in notes: print('  note     ' + n)
if not problems and not notes: print('  looks fine.')
elif not problems: print('  usable; the notes above are things to watch.')
sys.exit(1 if problems else 0)
