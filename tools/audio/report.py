"""Listen with numbers and pictures: a report on a film's sound, for the one who cannot hear it (and as a second opinion for the one who can).

  .venv/bin/python tools/audio/report.py <film.mp4|mix.wav> [--out dir] [--sections 0,12.5,30,45] [--voice voice.wav] [--srt film.srt]

Writes <out>/ (default <file>-audio/):  audio.md (read it), spectrogram.jpg (spectrogram with the loudness curve and section lines; open it and look),
bands.json. It reports: loudness per second and per section, tonal balance per section (low / low-mid / mid / presence / air), stereo width and
mono compatibility, clipping, DC offset, near-silent stretches, sudden jumps; and with --voice (the voice stem at the same time origin) how far the
voice sits above everything else, second by second, so a voice that the music or effects bury shows up.
It cannot judge taste, timbre or whether a sound is pleasant. Thresholds are rules of thumb: a flag means "listen here", not "wrong"."""
import argparse, json, os, re, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser(); ap.add_argument('file'); ap.add_argument('--out'); ap.add_argument('--sections'); ap.add_argument('--voice'); ap.add_argument('--srt')
A = ap.parse_args()
if not os.path.isfile(A.file): sys.exit('no such file: ' + A.file)
out = A.out or os.path.splitext(A.file)[0] + '-audio'; os.makedirs(out, exist_ok=True)
SR = 24000
def pcm(path, ch=2):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', str(ch), '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True)
    x = np.frombuffer(r.stdout, np.float32)
    if not len(x): sys.exit('no audio in ' + path)
    return x.reshape(-1, ch)
X = pcm(A.file); L, R = X[:, 0], X[:, 1]; M = X.mean(1); dur = len(M) / SR

# momentary loudness (ebur128) per 0.1 s
r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', A.file, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
mom = [(float(a), float(b)) for a, b in re.findall(r't:\s*([\d.]+)\s+TARGET:-?\d+ LUFS\s+M:\s*(-?[\d.]+|-inf)', r) if b != '-inf']
integ = re.findall(r'I:\s+(-?[\d.]+) LUFS', r); lra = re.findall(r'LRA:\s+([\d.]+) LU', r); tpk = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)
secs = max(1, int(np.ceil(dur))); acc = [[] for _ in range(secs)]
for t, m in mom: acc[min(secs - 1, int(t))].append(m)
loud = np.array([float(10 * np.log10(np.mean([10 ** (m / 10) for m in a]))) if a else -70.0 for a in acc])
bounds = [0.0] + sorted(float(x) for x in A.sections.split(',') if float(x) > 0) + [dur] if A.sections else [0.0, dur]
bounds = sorted(set(round(min(b, dur), 2) for b in bounds)); sec_list = list(zip(bounds[:-1], bounds[1:]))

# STFT for spectrogram and bands
N = 2048; hop = 512; win = np.hanning(N); nfr = (len(M) - N) // hop
S = np.empty((nfr, N // 2 + 1), np.float32)
for i in range(nfr): S[i] = np.abs(np.fft.rfft(M[i * hop:i * hop + N] * win))
S = S / (N / 4); fr = np.fft.rfftfreq(N, 1 / SR); tt = (np.arange(nfr) * hop + N / 2) / SR
bands = {'low 20-120': (20, 120), 'low-mid 120-500': (120, 500), 'mid 0.5-2k': (500, 2000), 'presence 2-6k': (2000, 6000), 'air 6k+': (6000, 12000)}
def band_db(t0, t1):
    sel = (tt >= t0) & (tt < t1)
    if not sel.any(): return {k: -120.0 for k in bands}
    p = (S[sel] ** 2).mean(0); return {k: round(float(10 * np.log10(p[(fr >= lo) & (fr < hi)].sum() + 1e-12)), 1) for k, (lo, hi) in bands.items()}

flags = []; lines = []
def say(s=''): lines.append(s)
say('# Audio report: ' + os.path.basename(A.file)); say()
say('- duration %.1f s; integrated %s LUFS, loudness range %s LU, true peak %s dBFS' % (dur, integ[-1] if integ else '?', lra[-1] if lra else '?', tpk[-1] if tpk else '?'))
clip = int((np.abs(X) >= 0.999).sum()); dc = float(M.mean()); sil = float((loud < -55).sum())
say('- clipped samples: %d; DC offset %.4f; seconds below -55 LUFS: %d' % (clip, dc, sil))
if clip > 10: flags.append('%d samples reach full scale (clipping)' % clip)
if abs(dc) > 0.01: flags.append('DC offset %.3f' % dc)
mid, side = (L + R) / 2, (L - R) / 2; width = float(np.sqrt((side ** 2).mean()) / (np.sqrt((mid ** 2).mean()) + 1e-9)); corr = float(np.corrcoef(L[::4], R[::4])[0, 1]) if L.std() > 1e-6 and R.std() > 1e-6 else 1.0
say('- stereo: side/mid %.2f, L/R correlation %.2f%s' % (width, corr, ' (mono)' if width < .02 else ''))
if corr < 0: flags.append('left and right are anti-correlated (%.2f): the sound partly cancels in mono' % corr)
say(); say('## Loudness per section (momentary LUFS, power-averaged per second; median and range of those seconds)'); say()
say('| section | median | min | max | note |'); say('|---|---|---|---|---|')
med_all = float(np.median(loud[loud > -60])) if (loud > -60).any() else -70
sec_rows = []
for a, b in sec_list:
    v = loud[int(a):max(int(a) + 1, int(np.ceil(b)))]; vv = v[v > -60]; md = float(np.median(vv)) if len(vv) else -70.0; note = ''
    if len(vv) and md < med_all - 7: note = 'much quieter than the film (%.0f dB)' % (md - med_all)
    elif len(vv) and md > med_all + 5: note = 'louder than the film (+%.0f dB)'; note = note % (md - med_all)
    if len(vv) == 0: note = 'silent'
    if len(vv) > 4 and (vv.max() - vv.min()) < 1.5 and b - a > 8: note = (note + '; ' if note else '') + 'level almost constant (flat?)'
    sec_rows.append((a, b, md, float(v.min()), float(v.max()), note)); say('| %.1f-%.1f | %.1f | %.1f | %.1f | %s |' % (a, b, md, v.min(), v.max(), note))
    if note and 'quieter' in note and not A.sections: pass
jumps = [(i, float(loud[i] - loud[i - 1])) for i in range(1, secs) if loud[i] > -60 and loud[i - 1] > -60 and abs(loud[i] - loud[i - 1]) > 8]
if jumps: say(); say('- level jumps over 8 dB between neighbouring seconds: ' + ', '.join('%ds (%+.0f dB)' % (i, d) for i, d in jumps[:12])); flags.append('%d sudden level jumps (see the list): intended hits, or a cut?' % len(jumps))
say(); say('## Tonal balance per section (dB, relative to the loudest band of that section)'); say()
say('| section | ' + ' | '.join(bands) + ' | note |'); say('|---|' + '---|' * (len(bands) + 1))
allb = []
for a, b in sec_list:
    bd = band_db(a, b); top = max(bd.values()); rel = {k: round(v - top, 1) for k, v in bd.items()}; note = ''
    if rel['low 20-120'] > -1.0 and rel['low-mid 120-500'] < -9: note = 'very low-heavy (rumble?)'
    if rel['presence 2-6k'] > -3 and rel['mid 0.5-2k'] < -10: note = 'presence-heavy, thin mid (harsh?)'
    if rel['air 6k+'] < -50 and b - a > 3: note = (note + '; ' if note else '') + 'almost nothing above 6 kHz (dull, or band-limited)'
    allb.append({'t0': a, 't1': b, 'bands': bd, 'rel': rel}); say('| %.1f-%.1f | ' % (a, b) + ' | '.join('%.0f' % rel[k] for k in bands) + ' | %s |' % note)
    if note: flags.append('%.1f-%.1f s: %s' % (a, b, note))

# voice versus the rest
if A.voice:
    V = pcm(A.voice, 1)[:, 0]; n = len(M); Mm = M
    hopE = SR // 100; env = lambda x: np.sqrt((x[:len(x) // hopE * hopE].reshape(-1, hopE) ** 2).mean(1))
    ea, eb = env(Mm), env(V); ea = ea - ea.mean(); eb = eb - eb.mean(); nfft = 1 << int(np.ceil(np.log2(len(ea) + len(eb))))
    cc = np.fft.irfft(np.fft.rfft(ea, nfft) * np.conj(np.fft.rfft(eb, nfft)))[:len(ea)]; lag = int(np.argmax(cc)) * hopE            # envelope lag survives filtering and reverb
    best, bl = -1.0, lag                                                                                                        # refine on the waveform, +-20 ms
    seg_ = V[:min(len(V), SR * 8)]
    for dl in range(-480, 481, 8):
        l0 = lag + dl
        if l0 < 0 or l0 + len(seg_) > len(Mm): continue
        c = abs(float((Mm[l0:l0 + len(seg_)] * seg_).sum()))
        if c > best: best, bl = c, l0
    lag = bl; Vs = np.zeros(n, np.float32); m_ = max(0, min(len(V), n - lag)); Vs[lag:lag + m_] = V[:m_]
    sp_ = slice(lag, lag + m_); g = float((Mm[sp_] * Vs[sp_]).sum() / ((Vs[sp_] ** 2).sum() + 1e-9)); g = max(0.0, min(g, 3.0))
    res = Mm - g * Vs; w = SR; nsec = n // w; rows = []
    vdb = lambda x: 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-6)
    for s in range(nsec):
        sl = slice(s * w, (s + 1) * w); v_, r_ = vdb(g * Vs[sl]), vdb(res[sl])
        if v_ > -45: rows.append((s, v_ - r_))
    say(); say('## Voice against everything else'); say()
    if not rows: say('- the voice stem is silent or did not line up (estimated lag %.2f s, gain %.2f).' % (lag / SR, g))
    else:
        rat = np.array([x for _, x in rows]); low = [s for s, x in rows if x < 6]
        say('- note: the rest is computed as mix minus the voice stem, so any filtering, compression or reverb applied to the voice in the mix is counted as "the rest": the figures are a lower bound.')
        say('- estimated alignment: voice stem starts %.2f s in the film, gain %.2f in the mix.' % (lag / SR, g))
        say('- while the voice speaks, it sits %.0f dB above the rest on average (median %.0f, lowest %.0f).' % (rat.mean(), np.median(rat), rat.min()))
        say('- seconds where the voice is under 6 dB above the rest (the music or effects may bury it): %s' % (', '.join(str(s) for s in low[:30]) or 'none'))
        if low: flags.append('voice buried (under +6 dB over the rest) in %d of %d spoken seconds, e.g. at %s s' % (len(low), len(rows), ', '.join(str(s) for s in low[:5])))
        if g < .05: flags.append('the voice stem does not seem to be in the mix (gain %.2f)' % g)

# spectrogram picture
fmax = 8000; fbin = fr <= fmax; img = 20 * np.log10(S[:, fbin].T + 1e-6)[::-1]; img = np.clip((img + 100) / 70, 0, 1); H_, W_ = img.shape
cols = np.array([[0, 0, 4], [40, 11, 84], [101, 21, 110], [159, 42, 99], [212, 72, 66], [245, 125, 21], [250, 193, 39], [252, 255, 164]], np.float32)
idx = img * (len(cols) - 1); lo_ = np.floor(idx).astype(int); hi_ = np.minimum(lo_ + 1, len(cols) - 1); f_ = (idx - lo_)[..., None]; rgb = (cols[lo_] * (1 - f_) + cols[hi_] * f_).astype(np.uint8)
PW, PH = 1800, 520; sp = Image.fromarray(rgb).resize((PW, PH), Image.BILINEAR); canvas = Image.new('RGB', (PW + 60, PH + 190), (16, 16, 18)); canvas.paste(sp, (50, 20)); d = ImageDraw.Draw(canvas)
for f_hz in (100, 500, 1000, 2000, 4000, 8000):
    y = 20 + PH - int(PH * np.log1p(f_hz) / np.log1p(fmax)) if False else 20 + PH - int(PH * (f_hz / fmax)); d.text((4, y - 5), '%dk' % (f_hz // 1000) if f_hz >= 1000 else '%d' % f_hz, fill=(190, 190, 190)); d.line([(46, y), (50, y)], fill=(190, 190, 190))
y0 = 20 + PH + 20; d.text((50, y0), 'momentary loudness (LUFS), -50 to -5', fill=(200, 200, 200))
for k in range(secs):
    x = 50 + int(PW * k / dur); v = loud[k]
    if v > -60: h = int((np.clip(v, -50, -5) + 50) / 45 * 110); d.rectangle([x, y0 + 130 - h, x + max(1, int(PW / dur)) - 1, y0 + 130], fill=(80, 200, 160))
d.line([(50, y0 + 130 - int((-14 + 50) / 45 * 110)), (50 + PW, y0 + 130 - int((-14 + 50) / 45 * 110))], fill=(200, 80, 80))
for a, b in sec_list[1:] if len(sec_list) > 1 else []: x = 50 + int(PW * a / dur); d.line([(x, 20), (x, y0 + 130)], fill=(255, 255, 255)); d.text((x + 3, 22), '%.0fs' % a, fill=(255, 255, 255))
for t in range(0, int(dur) + 1, 5): x = 50 + int(PW * t / dur); d.text((x, y0 + 134), '%ds' % t, fill=(160, 160, 160))
canvas.save(os.path.join(out, 'spectrogram.jpg'), quality=90)

say(); say('## To look at'); say(); say('- `spectrogram.jpg`: time across, frequency up (0-8 kHz), brighter = louder; below it the loudness curve with the -14 LUFS target in red. Look for: a band that never moves (a drone), gaps that are not silent, a wall of energy where the voice should stand out, a cut-off at a fixed frequency.')
say(); say('## Flags (listen here)'); say()
for f in flags: say('- ' + f)
if not flags: say('- nothing measurable stands out. That is not the same as sounding good: listen once.')
open(os.path.join(out, 'audio.md'), 'w', encoding='utf8').write('\n'.join(lines) + '\n'); json.dump({'sections': allb, 'loud_per_second': [round(float(v), 1) for v in loud], 'flags': flags}, open(os.path.join(out, 'bands.json'), 'w'), indent=1)
print('\n'.join(lines[:6])); print('...'); print('flags:'); [print(' -', f) for f in flags]; print('→', os.path.join(out, 'audio.md'))
