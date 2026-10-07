#!/usr/bin/env python3
"""Take a video apart into a time-anchored, machine-readable description (remake.json) that the three remake modes start from.

  .venv/bin/python tools/remake/remake.py analyze <video> --out <dir> [--lang zh|en|auto] [--model small] [--ocr-step 0.5] [--no-asr] [--no-ocr] [--reuse]
  .venv/bin/python tools/remake/remake.py restyle <remake dir> --film films/<name> [--max-chars 28]

`analyze` reuses tools/teardown/teardown.py (shots, camera, palette, tempo; run as a subprocess into <dir>/teardown/) and adds what a remake needs:
  words (word-level Whisper timestamps) and takes (sentences / pauses), on-screen text with boxes, colours and time ranges (Apple Vision, macOS only),
  per-shot motion, a loudness and energy curve, static overlays (logo / watermark / bar guesses). Everything carries seconds AND an anchor:
  {word_index, offset} (offset in seconds from that word's start, or from its end for an end anchor) or {shot_index, offset} when no word is near.
Output: <dir>/remake.json (schema "remake/1", documented in REMAKE.md), remake.md (read this), teardown/ (storyboard.jpg, shots/NN.jpg = the keyframes), texts/NN.png (crops).
`restyle` is the small glue for the restyle mode: it writes the film's src/words.json and captions.cues in the format tools/talk expects, from remake.json.
It measures; it does not judge. Rights: REMAKE.md, section 1."""
import argparse, json, os, re, shutil, subprocess, sys, time
from difflib import SequenceMatcher
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.path.dirname(os.path.dirname(HERE))
PY = os.path.join(LIB, '.venv/bin/python'); PY = PY if os.path.exists(PY) else sys.executable
SCHEMA = 'remake/1'
RIGHTS = ('Rights: use this only on video you own or are licensed to use. `structure` takes only the shape (nothing of the source is used); `exact` and `restyle` '
          'use the source footage, voice and music, so only for your own work. Record the answer in the project\'s CREDITS (REMAKE.md section 1).')

def run(*c, **k): return subprocess.run(c, capture_output=True, **k)
def log(*a): print(*a, flush=True)

def probe(video):
    j = json.loads(run('ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate,nb_frames:format=duration', '-of', 'json', video, text=True).stdout)
    v = next(s for s in j['streams'] if s['codec_type'] == 'video'); n, d = (v['r_frame_rate'].split('/') + ['1'])[:2]
    return {'w': int(v['width']), 'h': int(v['height']), 'fps': float(n) / float(d or 1), 'duration': float(j['format']['duration']), 'has_audio': any(s['codec_type'] == 'audio' for s in j['streams'])}

def ocr_binary():
    """The Apple Vision OCR tool of tools/teardown (compiled once into the cache). None when not on macOS / no swiftc."""
    if sys.platform != 'darwin' or not shutil.which('swiftc'): return None
    src = os.path.join(LIB, 'tools/teardown/ocr.swift'); binp = os.path.join(os.environ.get('XDG_CACHE_HOME', os.path.expanduser('~/.cache')), 'lemo-opuscar', 'ocr')
    os.makedirs(os.path.dirname(binp), exist_ok=True)
    if not os.path.exists(binp) or os.path.getmtime(binp) < os.path.getmtime(src): run('swiftc', '-O', src, '-o', binp)
    return binp if os.path.exists(binp) else None

def ocr_files(paths, chunk=60):
    binp = ocr_binary(); out = {}
    if not binp: return out
    for i in range(0, len(paths), chunk):
        r = run(binp, *paths[i:i + chunk], text=True)
        try: out.update(json.loads(r.stdout))
        except Exception: pass
    return out

# ─────────────────────────────────────────────────── helpers
def read_audio16(video):
    pcm = run('ffmpeg', '-v', 'error', '-i', video, '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-').stdout
    return np.frombuffer(pcm, np.float32)

def loudness(video):
    r = run('ffmpeg', '-hide_banner', '-nostats', '-i', video, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-', text=True).stderr
    tail = r[r.rfind('Summary:'):] if 'Summary:' in r else ''
    g = lambda k: (re.search(r'^\s*%s:\s+(-?[\d.]+)' % k, tail, re.M) or [None, None])[1]
    f = lambda v: round(float(v), 1) if v is not None else None
    return {'lufs': f(g('I')), 'lra': f(g('LRA')), 'true_peak_db': f(g('Peak'))}

def decode_small(video, w, h, fps, sw):
    sh = max(2, int(sw * h / w) // 2 * 2)
    raw = run('ffmpeg', '-v', 'error', '-i', video, '-an', '-vf', 'fps=%g,scale=%d:%d' % (fps, sw, sh), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-').stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, sh, sw, 3)

def grab(video, t, path, q=2):
    run('ffmpeg', '-v', 'error', '-y', '-ss', '%.3f' % max(0, t), '-i', video, '-frames:v', '1', '-q:v', str(q), path)
    return os.path.exists(path)

def has_cjk(s): return bool(re.search(r'[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]', s))

# ─────────────────────────────────────────────────── words and takes
def transcribe(audio, lang, model_name, dur):
    from faster_whisper import WhisperModel
    m = WhisperModel(model_name, compute_type='int8')
    segs, info = m.transcribe(audio, language=None if lang == 'auto' else lang, word_timestamps=True, vad_filter=True)
    words = []
    for s in segs:
        for w in s.words or []:
            if w.word.strip(): words.append({'i': len(words), 'w': w.word.strip() if has_cjk(w.word) else w.word, 't0': round(float(w.start), 3), 't1': round(float(w.end), 3)})
    return words, info.language

def join_words(ws):
    """Join word tokens: a space only between two Latin / digit tokens (CJK tokens are glued)."""
    out = ''
    for w in ws:
        w = w.strip()
        if out and re.search(r'[A-Za-z0-9]$', out) and re.match(r'[A-Za-z0-9]', w): out += ' '
        out += w
    return out

def make_takes(words, gap=0.7, max_len=6.0):
    """Semantic takes: a take ends at sentence-final punctuation or at a pause longer than `gap` seconds."""
    takes = []; cur = []
    end = re.compile(r'[。！？.!?…]$')
    for w in words:
        if cur and w['t0'] - cur[-1]['t1'] > gap: takes.append(cur); cur = []
        cur.append(w)
        if end.search(w['w'].strip()): takes.append(cur); cur = []
    if cur: takes.append(cur)
    def split(ws):                       # a take longer than max_len seconds is cut at the longest pause near its middle
        if len(ws) < 6 or ws[-1]['t1'] - ws[0]['t0'] <= max_len: return [ws]
        mid = (ws[0]['t0'] + ws[-1]['t1']) / 2
        k = max(range(1, len(ws)), key=lambda j: (ws[j]['t0'] - ws[j - 1]['t1']) - 0.04 * abs(ws[j]['t0'] - mid))
        return split(ws[:k]) + split(ws[k:])
    takes = [p for ws in takes for p in split(ws)]
    out = []
    for k, ws in enumerate(takes):
        txt = join_words([w['w'] for w in ws])
        out.append({'index': k, 'w0': ws[0]['i'], 'w1': ws[-1]['i'], 't0': ws[0]['t0'], 't1': ws[-1]['t1'], 'text': txt.strip(), 'chars': len(re.sub(r'\s', '', txt))})
        for w in ws: words[w['i']]['take'] = k
    return out

# ─────────────────────────────────────────────────── anchors
class Anchors:
    def __init__(self, words, shots): self.words = words; self.shots = shots
    def at(self, t, edge='start', tol=0.5):
        """{word_index, offset}: offset = t minus that word's start (edge 'start') or end ('end'); else {shot_index, offset from the shot start}."""
        best, bd = None, 1e9
        for w in self.words:
            d = abs(t - w['t0' if edge == 'start' else 't1'])
            if d < bd: best, bd = w, d
        if best is not None and bd <= tol: return {'word_index': best['i'], 'offset': round(t - best['t0' if edge == 'start' else 't1'], 3)}
        k = max([s['index'] for s in self.shots if s['t0'] <= t + 1e-6] or [0])
        return {'shot_index': k, 'offset': round(t - self.shots[k]['t0'], 3)}
    def resolve(self, a, edge='start'):
        if 'word_index' in a: w = self.words[a['word_index']]; return w['t0' if edge == 'start' else 't1'] + a['offset']
        return self.shots[a['shot_index']]['t0'] + a['offset']

# ─────────────────────────────────────────────────── on-screen text
def norm(s): return re.sub(r'\s+', '', s).lower()
def same_text(a, b):
    a, b = norm(a), norm(b)
    if not a or not b: return False
    if a == b or a.startswith(b) or b.startswith(a): return True
    return SequenceMatcher(None, a, b).ratio() >= 0.78

def merge_observations(obs, step):
    """obs: [(t, text, x, y, w, h, conf)] sorted by t → records of the same text at the same place across frames."""
    recs = []; gap = step * 1.9
    for t in sorted({o[0] for o in obs}):
        cur = [o for o in obs if o[0] == t]; used = set()
        for o in sorted(cur, key=lambda o: -o[6]):
            _, text, x, y, w, h, conf = o
            best, bs = None, 0
            for r in recs:
                if r['last'] < t - gap or id(r) in used: continue
                lo = r['obs'][-1]; cy_ok = abs((y + h / 2) - (lo[3] + lo[5] / 2)) < max(0.05, h * 1.2); ov = min(x + w, lo[2] + lo[4]) - max(x, lo[2])
                if cy_ok and ov > -0.02 and same_text(text, lo[1]):
                    sc = SequenceMatcher(None, norm(text), norm(lo[1])).ratio() + 0.2
                    if sc > bs: best, bs = r, sc
            if best is None: best = {'obs': [], 'last': t}; recs.append(best)
            best['obs'].append(o); best['last'] = t; used.add(id(best))
    return recs

def edge_time(video, box, lo, hi, fps, W, H, rising):
    """Frame-accurate time of a change inside `box` (normalised) between lo and hi (seconds): the largest frame-to-frame difference in that region."""
    if hi - lo < 1.5 / fps: return None
    x, y, w, h = [int(round(v)) for v in (box['x'] * W, box['y'] * H, box['w'] * W, box['h'] * H)]; pad = 3
    x = max(0, x - pad); y = max(0, y - pad); w = min(W - x, w + 2 * pad) // 2 * 2; h = min(H - y, h + 2 * pad) // 2 * 2
    if w < 4 or h < 4: return None
    raw = run('ffmpeg', '-v', 'error', '-ss', '%.3f' % lo, '-t', '%.3f' % (hi - lo + 1.0 / fps), '-i', video, '-an', '-vf', 'fps=%g,crop=%d:%d:%d:%d,scale=%d:-2' % (fps, w, h, x, y, min(w, 160)), '-f', 'rawvideo', '-pix_fmt', 'gray', '-').stdout
    sw = min(w, 160); sh = max(2, int(h * sw / w) // 2 * 2); n = len(raw) // (sw * sh)
    if n < 2: return None
    F = np.frombuffer(raw[:n * sw * sh], np.uint8).reshape(n, sh, sw).astype(np.float32)
    d = np.abs(np.diff(F, axis=0)).mean((1, 2)); k = int(d.argmax())
    if d[k] < max(1.5, 2.5 * float(np.median(d)) + 0.5): return None
    return lo + (k + 1) / fps

def kmeans(px, k, it=10):
    px = px.astype(np.float32); rng = np.random.default_rng(0)
    cen = px[rng.choice(len(px), k, replace=False)]
    for _ in range(it):
        lab = ((px[:, None] - cen[None]) ** 2).sum(2).argmin(1)
        for i in range(k):
            if (lab == i).any(): cen[i] = px[lab == i].mean(0)
    return cen, np.bincount(lab, minlength=k)

def hexc(c): return '#%02x%02x%02x' % tuple(int(max(0, min(255, round(v)))) for v in c)
def hex2rgb(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32)
def lum(c): return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]

def style_of(frame_path, box, W, H):
    """Guess fill colour, highlight colour, outline colour and width, background and plate of a text box from one full-resolution frame.
    Method: the background is the median of a ring around the box; ink = pixels far from it and flat (inside a glyph, not on an anti-aliased edge); k-means on the ink;
    an outline is the cluster that sits next to nearly all the other ink; if it is too close to the background to count as ink (black on a dark photo) it is found by walking out from the fill."""
    from scipy import ndimage as ndi
    im = np.asarray(Image.open(frame_path).convert('RGB')); ih, iw = im.shape[:2]
    x0, y0, x1, y1 = int(box['x'] * iw), int(box['y'] * ih), int((box['x'] + box['w']) * iw), int((box['y'] + box['h']) * ih)
    x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(iw, max(x1, x0 + 2)), min(ih, max(y1, y0 + 2))
    cimg = im[y0:y1, x0:x1].astype(np.float32); crop = cimg.reshape(-1, 3); m = 8
    ring = np.concatenate([im[max(0, y0 - m):y0, max(0, x0 - m):x1 + m].reshape(-1, 3), im[y1:y1 + m, max(0, x0 - m):x1 + m].reshape(-1, 3),
                           im[y0:y1, max(0, x0 - m):x0].reshape(-1, 3), im[y0:y1, x1:x1 + m].reshape(-1, 3)]).astype(np.float32)
    bg = np.median(ring, 0) if len(ring) else np.median(crop, 0); busy = float(ring.std(0).mean()) if len(ring) else 0.0
    dist = np.sqrt(((cimg - bg) ** 2).sum(2)); far = dist > 70
    mean = np.stack([ndi.uniform_filter(cimg[..., c], 5) for c in range(3)], 2); var = sum(ndi.uniform_filter(cimg[..., c] ** 2, 5) - mean[..., c] ** 2 for c in range(3))
    sel = far & (var < 3 * 10 ** 2)
    if sel.sum() < 12: sel = far
    fill, hot, outline, stroke_px = None, None, None, 0
    if (y1 - y0) < 45 or sel.sum() < 80:           # small or thin text has no flat interior: take the farthest 8 % of the pixels (the glyph cores)
        o_ = np.argsort(-dist.ravel())[:max(6, int(0.08 * dist.size))]; fill = crop[o_].mean(0)
    elif sel.sum() >= 12:
        px = cimg[sel]; sm = px[::max(1, len(px) // 3000)]; cen, cnt = kmeans(sm, 3) if len(sm) > 30 else kmeans(sm, 1)
        cl = []
        for i in [i for i in np.argsort(-cnt) if cnt[i] >= 0.08 * cnt.sum()]:
            if all(np.sqrt(((cen[i] - cen[j]) ** 2).sum()) > 45 for j in cl): cl.append(i)
        lab = np.stack([np.sqrt(((cimg - cen[i]) ** 2).sum(2)) for i in cl], 2).argmin(2); masks = [sel & (lab == k) for k in range(len(cl))]; fills = list(range(len(cl)))
        if len(cl) >= 2:
            best, bc = None, 0.0
            for o in range(len(cl)):
                oth = np.any([masks[j] for j in range(len(cl)) if j != o], 0)
                if not oth.any() or not masks[o].any(): continue
                cov = float((ndi.distance_transform_edt(~masks[o])[oth] <= 4).mean())
                if cov > bc: best, bc = o, cov
            if best is not None and bc >= 0.6:
                rest = [k for k in range(len(cl)) if k != best]; big = max(rest, key=lambda k: masks[k].sum())
                if abs(lum(cen[cl[best]]) - lum(cen[cl[big]])) > 60: outline = cen[cl[best]]; fills = sorted(rest, key=lambda k: -masks[k].sum())
        fill = cen[cl[fills[0]]]; hot = cen[cl[fills[1]]] if len(fills) > 1 else None
        fm = np.any([np.sqrt(((cimg - cen[cl[k]]) ** 2).sum(2)) < 50 for k in fills], 0)
        if fm.sum() > 20:
            ring1 = ndi.binary_dilation(fm, iterations=2) & ~fm; rc = cimg[ring1]
            if len(rc) > 20:
                oc = np.median(rc, 0)
                if outline is None and abs(lum(oc) - lum(fill)) > 90 and float(np.sqrt(((rc - oc) ** 2).sum(1)).mean()) < 55: outline = oc
                if outline is not None:
                    stroke_px = 1
                    for r_ in range(2, 11):
                        rr_ = ndi.binary_dilation(fm, iterations=r_) & ~ndi.binary_dilation(fm, iterations=r_ - 1)
                        if rr_.sum() and float((np.sqrt(((cimg[rr_] - outline) ** 2).sum(1)) < 70).mean()) >= 0.55: stroke_px = r_
                        else: break
    if fill is None: fill = crop[dist.argmax()] if len(crop) else bg
    plate = None
    if busy < 14 and len(ring):
        far_ring = np.concatenate([im[max(0, y0 - 40):max(0, y0 - 30), x0:x1].reshape(-1, 3), im[y1 + 30:y1 + 40, x0:x1].reshape(-1, 3)]).astype(np.float32)
        if len(far_ring) and np.sqrt(((np.median(far_ring, 0) - bg) ** 2).sum()) > 45: plate = hexc(bg)
    return {'color': hexc(fill), 'hot': hexc(hot) if hot is not None else None, 'outline': hexc(outline) if outline is not None else None, 'stroke_px': stroke_px, 'bg': hexc(bg), 'bg_busy': round(busy, 1), 'plate': plate}

def crop_png(frame_path, box, out, pad=6):
    im = Image.open(frame_path).convert('RGB'); iw, ih = im.size
    c = im.crop((max(0, int(box['x'] * iw) - pad), max(0, int(box['y'] * ih) - pad), min(iw, int((box['x'] + box['w']) * iw) + pad), min(ih, int((box['y'] + box['h']) * ih) + pad))); c.save(out)

# ─────────────────────────────────────────────────── analyze
def cmd_analyze(A):
    video = os.path.abspath(A.video)
    if not os.path.isfile(video): sys.exit('no such video: ' + A.video)
    out = os.path.abspath(A.out); os.makedirs(out, exist_ok=True); t_start = time.time(); warnings = []
    info = probe(video); W, H, dur, fps = info['w'], info['h'], info['duration'], info['fps']
    log('%dx%d  %.1f s  %.2f fps  %s audio' % (W, H, dur, fps, 'with' if info['has_audio'] else 'no'))
    log(RIGHTS)

    # 1. shots, camera, palette, tempo: tools/teardown (not duplicated)
    td = os.path.join(out, 'teardown'); tdj = os.path.join(td, 'teardown.json')
    if not (A.reuse and os.path.exists(tdj)):
        log('== teardown (shots, camera, palette, tempo) =='); r = subprocess.run([PY, os.path.join(LIB, 'tools/teardown/teardown.py'), video, '--out', td, '--no-asr', '--no-ocr'], capture_output=True, text=True)
        if r.returncode: sys.exit('teardown failed:\n' + (r.stdout + r.stderr)[-600:])
    T = json.load(open(tdj, encoding='utf8')); shots = []
    for i, s in enumerate(T['shots']):
        shots.append({'index': i, 't0': s['t0'], 't1': s['t1'], 'len': s['len'], 'camera': s['camera'], 'pan': s['pan'], 'zoom': s['zoom'], 'brightness': s['brightness'],
                      'palette': s['palette'], 'palette_share': s['palette_share'], 'keyframe': 'teardown/' + s['keyframe']})

    # 2. small frames: motion per shot, static overlays
    log('== motion and overlays ==')
    SW = 192; Fm = decode_small(video, W, H, 6, SW); nf = len(Fm); G = Fm.astype(np.float32).mean(3)
    md = np.abs(np.diff(G, axis=0)).mean((1, 2)) / 255 if nf > 1 else np.zeros(1)
    for s in shots:
        a, b = int(s['t0'] * 6), max(int(s['t0'] * 6) + 2, int(s['t1'] * 6)); seg = md[a:min(b - 1, len(md))]
        s['motion'] = round(float(seg.mean()), 4) if len(seg) else 0.0
        s['motion_curve'] = [round(float(v), 3) for v in seg[::max(1, len(seg) // 24)]][:24]
        s['activity'] = 'still' if s['motion'] < 0.006 else 'calm' if s['motion'] < 0.02 else 'busy'
    overlays = []
    if nf >= 12:
        sd = G.std(0); gmed = float(np.median(sd))
        if gmed > 12:
            from scipy import ndimage
            lab, n = ndimage.label(ndimage.binary_opening(sd < 3.0, iterations=1)); sh_ = G.shape[1]
            for k in range(1, n + 1):
                ys, xs = np.where(lab == k); area = len(xs) / (SW * sh_)
                if area < 0.0008 or area > 0.4: continue
                bx = {'x': round(float(xs.min()) / SW, 3), 'y': round(float(ys.min()) / sh_, 3), 'w': round(float(xs.max() - xs.min() + 1) / SW, 3), 'h': round(float(ys.max() - ys.min() + 1) / sh_, 3)}
                kind = 'bar' if (bx['w'] > .85 or bx['h'] > .85) else 'static overlay (logo / watermark / sticker guess)'
                if kind == 'bar' and not (ys.min() == 0 or ys.max() >= sh_ - 1 or xs.min() == 0 or xs.max() >= SW - 1): continue
                cx, cy = xs.mean() / SW, ys.mean() / sh_
                if kind != 'bar' and not (area < 0.06 and (cx < .2 or cx > .8) and (cy < .15 or cy > .85)): continue
                overlays.append({'id': 'ov%d' % len(overlays), 'type': 'bar' if kind == 'bar' else 'static', 'note': kind, 'box': bx, 't0': 0.0, 't1': round(dur, 2),
                                 'color': hexc(Fm[:, ys, xs].reshape(-1, 3).mean(0)), 'anchor': {'shot_index': 0, 'offset': 0.0}})

    # 3. speech: words and takes
    words, takes, lang = [], [], A.lang; audio = {}
    if info['has_audio']:
        x = read_audio16(video)
        if len(x) > 16000:
            hop = 4000; e = np.sqrt((x[:len(x) // hop * hop].reshape(-1, hop) ** 2).mean(1) + 1e-12); db = 20 * np.log10(e + 1e-9)
            audio = {'hop_s': 0.25, 'energy_db': [round(float(v), 1) for v in db], 'mean_db': round(float(db.mean()), 1), 'loud_range_db': round(float(np.percentile(db, 95) - np.percentile(db, 10)), 1)}
            audio.update(loudness(video)); audio['bpm_guess'] = (T['facts'].get('audio') or {}).get('tempo_bpm_guess')
            old = os.path.join(out, 'remake.json')
            if A.reuse and os.path.exists(old) and not A.no_asr and json.load(open(old, encoding='utf8')).get('words'):
                Ro = json.load(open(old, encoding='utf8')); words = Ro['words']; takes = make_takes(words); lang = Ro['audio'].get('language') or A.lang; log('== speech: reusing the words of the previous remake.json ==')
            elif not A.no_asr:
                log('== speech (faster-whisper %s, word timestamps) ==' % A.model)
                try: words, lang = transcribe(x, A.lang, A.model, dur); takes = make_takes(words)
                except Exception as ex: warnings.append('speech skipped: %s' % str(ex)[:160]); log(warnings[-1])
            if words:
                sp = sum(w['t1'] - w['t0'] for w in words); chars = sum(len(re.sub(r'\s', '', w['w'])) for w in words)
                audio['speech_share'] = round(sp / dur, 2); audio['chars_per_sec'] = round(chars / max(sp, 1e-6), 1); audio['speech_starts_s'] = words[0]['t0']
    audio['language'] = lang if lang != 'auto' else None
    AN = Anchors(words, shots)
    for s in shots:
        ws = [w['i'] for w in words if w['t0'] < s['t1'] and w['t1'] > s['t0']]; s['words'] = [ws[0], ws[-1]] if ws else None
        s['said'] = join_words([w['w'] for w in words if s['t0'] <= w['t0'] < s['t1']])
        s['anchor'] = AN.at(s['t0'], 'start', tol=0.12) if s['index'] else {'shot_index': 0, 'offset': 0.0}

    # 4. on-screen text
    texts = []
    if not A.no_ocr and ocr_binary():
        log('== on-screen text (Apple Vision) =='); od = os.path.join(out, 'ocr_frames'); os.makedirs(od, exist_ok=True)
        step = A.ocr_step; ts = set([0.05, max(0.05, dur - 0.1)])
        for s in shots: ts.update(t for t in (s['t0'] + 0.1, s['t0'] + 0.4, s['t1'] - 0.15) if s['t0'] <= t < s['t1'])
        t = 0.05
        while t < dur: ts.add(round(t, 3)); t += step
        ts = sorted(round(min(t_, dur - 0.05), 3) for t_ in ts); ts = sorted(set(ts)); files = []
        for t_ in ts:
            p = os.path.join(od, 'f%07.3f.jpg' % t_)
            if not os.path.exists(p): grab(video, t_, p)
            if os.path.exists(p): files.append(p)
        res = ocr_files(files); obs = []
        for p in files:
            tt = float(os.path.basename(p)[1:-4])
            for it in res.get(os.path.basename(p), []):
                if it['conf'] >= 0.45 and it['text'].strip() and it['w'] * it['h'] > 0.00005: obs.append((tt, it['text'].strip(), it['x'], it['y'], it['w'], it['h'], it['conf']))
        recs = merge_observations(obs, step); texts_raw = []
        for r in recs:
            o = r['obs']; n = len({x_[0] for x_ in o})
            if n < 2 and not (o[0][6] >= 0.8 and len(o[0][1]) >= 3): continue
            best = max(o, key=lambda z: (len(z[1]), z[6])); xs = np.median([z[2] for z in o]); ys = np.median([z[3] for z in o]); ws_ = np.median([z[4] for z in o]); hs = np.median([z[5] for z in o])
            texts_raw.append({'text': best[1], 'box': {'x': round(float(xs), 4), 'y': round(float(ys), 4), 'w': round(float(ws_), 4), 'h': round(float(hs), 4)}, 'conf': round(float(np.mean([z[6] for z in o])), 2),
                              'seen': n, 'first': min(z[0] for z in o), 'last': max(z[0] for z in o), 'best_t': best[0], 'mid_t': float(np.median([z[0] for z in o]))})
        texts_raw.sort(key=lambda r: (r['first'], r['box']['y']))
        sample_ts = ts
        for k, r in enumerate(texts_raw):
            prev = max([x_ for x_ in sample_ts if x_ < r['first'] - 1e-6] or [0.0]); nxt = min([x_ for x_ in sample_ts if x_ > r['last'] + 1e-6] or [dur])
            t0 = r['first']; t1 = r['last']
            e0 = edge_time(video, r['box'], prev, r['first'], fps, W, H, True) if r['first'] > 0.1 else 0.0
            e1 = edge_time(video, r['box'], r['last'], nxt, fps, W, H, False) if r['last'] < dur - 0.2 else dur
            t0 = e0 if e0 is not None else (prev + r['first']) / 2 if r['first'] > 0.1 else 0.0
            t1 = e1 if e1 is not None else (r['last'] + nxt) / 2 if r['last'] < dur - 0.2 else dur
            if e0 is None and prev == 0.0 and r['first'] <= step + 0.1: t0 = 0.0
            fp = os.path.join(od, 'f%07.3f.jpg' % r['best_t']); st = style_of(fp, r['box'], W, H) if os.path.exists(fp) else {}
            cp = os.path.join(out, 'texts', 't%02d.png' % k); os.makedirs(os.path.dirname(cp), exist_ok=True)
            if os.path.exists(fp): crop_png(fp, r['box'], cp)
            texts.append({'id': 't%02d' % k, 'text': r['text'], 't0': round(t0, 3), 't1': round(t1, 3), 'box': r['box'], 'box_px': [int(r['box']['x'] * W), int(r['box']['y'] * H), int(r['box']['w'] * W), int(r['box']['h'] * H)],
                          'size_px': int(round(r['box']['h'] * H)), 'conf': r['conf'], 'frames_seen': r['seen'], 'crop': 'texts/t%02d.png' % k if os.path.exists(cp) else None,
                          'edge_exact': bool(e0 is not None and e1 is not None), **st})
        for tx in texts:
            cy = tx['box']['y'] + tx['box']['h'] / 2; speech = sum(max(0, min(tx['t1'], w['t1']) - max(tx['t0'], w['t0'])) for w in words); span = max(tx['t1'] - tx['t0'], 1e-3)
            cap = bool(words) and cy > 0.5 and speech / span > 0.35 and tx['t1'] - tx['t0'] < 8 and tx['box']['w'] < 0.97
            tx['caption'] = cap; tx['burned_in'] = True
            tx['role'] = 'caption' if cap else ('title' if tx['box']['h'] > 0.045 and tx['t0'] < 3 else 'text')
            tx['align'] = 'center' if abs(tx['box']['x'] + tx['box']['w'] / 2 - 0.5) < 0.04 else 'left' if tx['box']['x'] < 0.5 - tx['box']['w'] / 2 + 0.02 else 'center'
            if tx['caption'] and tx.get('outline') is None and tx.get('hot') and abs(lum(hex2rgb(tx['color'])) - lum(hex2rgb(tx['hot']))) > 150:      # burned-in captions are light text with a dark outline
                a_, b_ = (tx['color'], tx['hot']) if lum(hex2rgb(tx['color'])) > lum(hex2rgb(tx['hot'])) else (tx['hot'], tx['color']); tx['color'], tx['outline'], tx['hot'] = a_, b_, None; tx['stroke_px'] = max(tx.get('stroke_px') or 0, round(tx['box']['h'] * H * 0.06))
            if tx['caption'] and tx.get('outline') is None and abs(lum(hex2rgb(tx['color'])) - lum(hex2rgb(tx['bg']))) < 140:       # a caption that would not be readable without an outline has one
                tx['outline'] = '#111111' if lum(hex2rgb(tx['color'])) > 128 else '#f5f5f5'; tx['stroke_px'] = max(2, round(tx['box']['h'] * H * 0.06)); tx['outline_guess'] = True
            if tx.get('stroke_px'): tx['stroke_px'] = int(min(tx['stroke_px'], max(2, round(tx['box']['h'] * H * 0.08))))
            tx['anchor'] = AN.at(tx['t0'], 'start'); tx['anchor_end'] = AN.at(tx['t1'], 'end')
            tx['shot_index'] = max([s['index'] for s in shots if s['t0'] <= tx['t0'] + 0.05] or [0])
        if not A.keep_frames: shutil.rmtree(od, ignore_errors=True)
    else:
        warnings.append('on-screen text not read (needs macOS with swiftc; or --no-ocr): look at teardown/shots/*.jpg yourself') if not A.no_ocr else None
        if warnings: log(warnings[-1])
    for s in shots:
        s['texts'] = [t['id'] for t in texts if t['t0'] < s['t1'] and t['t1'] > s['t0']]
    caps = [t for t in texts if t['caption']]
    facts = dict(T['facts']); facts.update({'w': W, 'h': H, 'fps': round(fps, 3), 'duration': round(dur, 3), 'words': len(words), 'takes': len(takes), 'texts': len(texts), 'burned_captions': len(caps) >= 2, 'language': lang if lang != 'auto' else None})
    R = {'schema': SCHEMA, 'tool': 'tools/remake/remake.py', 'made': time.strftime('%Y-%m-%d %H:%M:%S'), 'source': {'file': os.path.basename(video), 'path': video, 'w': W, 'h': H, 'fps': round(fps, 3), 'duration': round(dur, 3), 'has_audio': info['has_audio']},
         'facts': facts, 'shots': shots, 'words': words, 'takes': takes, 'texts': texts, 'overlays': overlays, 'audio': audio, 'warnings': warnings}
    json.dump(R, open(os.path.join(out, 'remake.json'), 'w'), ensure_ascii=False, indent=1)
    # keep teardown.json current so tools/teardown/treatment.py works on this folder (speech segments and on-screen text per shot)
    T['speech'] = [{'t0': k['t0'], 't1': k['t1'], 'text': k['text']} for k in takes]
    for s, r_ in zip(T['shots'], shots): s['text'] = [{'text': t['text'], 'y': round(t['box']['y'] + t['box']['h'] / 2, 2), 'h': t['box']['h']} for t in texts if t['id'] in r_['texts']]; s['speech'] = r_['said']
    T['facts'].update({'audio': dict(T['facts'].get('audio') or {}, language=lang if lang != 'auto' else None, **({k: audio[k] for k in ('speech_share', 'chars_per_sec') if k in audio})), 'speech_starts_s': audio.get('speech_starts_s'),
                       'burned_captions_guess': facts['burned_captions'], 'shots_with_text': sum(1 for s in shots if s['texts'])})
    json.dump(T, open(tdj, 'w'), ensure_ascii=False, indent=1)
    write_md(out, R); log('\ndone in %.0f s → %s/remake.json, remake.md' % (time.time() - t_start, out))

def write_md(out, R):
    f = R['facts']; au = R['audio']; md = ['# Remake brief: %s' % R['source']['file'], '', '%dx%d, %.1f s, %s fps, %d shots, %d words in %d takes, %d on-screen texts (%d caption lines).' % (f['w'], f['h'], f['duration'], f['fps'], len(R['shots']), len(R['words']), len(R['takes']), len(R['texts']), sum(1 for t in R['texts'] if t['caption'])), '',
          '> ' + RIGHTS, '', '## Sound', '- ' + ', '.join('%s %s' % (k, au[k]) for k in ('lufs', 'lra', 'true_peak_db', 'mean_db', 'loud_range_db', 'bpm_guess', 'speech_share', 'chars_per_sec', 'language') if au.get(k) is not None) if au else '- no audio', '']
    if R['warnings']: md += ['## Warnings'] + ['- ' + w for w in R['warnings']] + ['']
    md += ['## Shots', '', '![storyboard](teardown/storyboard.jpg)', '', '| # | time | len | camera | motion | words said | on-screen text ids |', '|---|---|---|---|---|---|---|']
    for s in R['shots']: md.append('| %d | %.2f–%.2f | %.2f | %s | %s | %s | %s |' % (s['index'], s['t0'], s['t1'], s['len'], s['camera'], s['activity'], s['said'][:60].replace('|', '/'), ' '.join(s['texts'])))
    md += ['', '## Takes', '', '| # | time | words | text |', '|---|---|---|---|'] + ['| %d | %.2f–%.2f | %d–%d | %s |' % (k['index'], k['t0'], k['t1'], k['w0'], k['w1'], k['text'][:90].replace('|', '/')) for k in R['takes']]
    md += ['', '## On-screen text', '', '| id | role | time | anchor (start → end) | box (px x,y,w,h) | colour | text |', '|---|---|---|---|---|---|---|']
    fa = lambda a: ('word %d%+.2f' % (a['word_index'], a['offset'])) if 'word_index' in a else ('shot %d%+.2f' % (a['shot_index'], a['offset']))
    for t in R['texts']: md.append('| %s | %s | %.2f–%.2f | %s → %s | %s | %s%s | %s |' % (t['id'], t['role'], t['t0'], t['t1'], fa(t['anchor']), fa(t['anchor_end']), ','.join(map(str, t['box_px'])), t.get('color', ''), '/' + t['outline'] if t.get('outline') else '', t['text'].replace('|', '/')))
    if R['overlays']: md += ['', '## Static overlays (guesses)', ''] + ['- %s %s box %s, colour %s' % (o['id'], o['note'], o['box'], o['color']) for o in R['overlays']]
    md += ['', 'Fields and the three modes: REMAKE.md. Keyframes: `teardown/shots/NN.jpg`; text crops: `texts/`.']
    open(os.path.join(out, 'remake.md'), 'w', encoding='utf8').write('\n'.join(md) + '\n')

# ─────────────────────────────────────────────────── restyle glue
def cmd_restyle(A):
    """remake.json words → the film's src/words.json (the format tools/talk/prep.sh writes) and film.json captions.cues (what cuesFromWords would make)."""
    d = A.remake; R = json.load(open(d if d.endswith('.json') else os.path.join(d, 'remake.json'), encoding='utf8'))
    if not R['words']: sys.exit('restyle: remake.json has no words (analyze without --no-asr, voice tier installed)')
    film = os.path.abspath(A.film); os.makedirs(os.path.join(film, 'src'), exist_ok=True)
    segs = []
    for k in R['takes']:
        ws = R['words'][k['w0']:k['w1'] + 1]; segs.append({'t0': k['t0'], 't1': k['t1'], 'text': k['text'], 'words': [{'w': w['w'], 't0': w['t0'], 't1': w['t1']} for w in ws]})
    json.dump(segs, open(os.path.join(film, 'src', 'words.json'), 'w'), ensure_ascii=False, indent=1)
    node = shutil.which('node'); cues = None
    if node:
        js = "import('%s/tools/talk/layouts.js').then(m=>{const s=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(JSON.stringify(m.cuesFromWords(s,{maxChars:%d,balance:%s})))})" % (LIB, A.max_chars, 'true' if A.balance else 'false')
        r = subprocess.run([node, '-e', js, os.path.join(film, 'src', 'words.json')], capture_output=True, text=True)
        try: cues = json.loads(r.stdout.strip().splitlines()[-1])
        except Exception: cues = None
    if cues is None: cues = [{'t0': k['t0'], 't1': round(k['t1'] + 0.4, 2), 'text': k['text']} for k in R['takes']]; log('(node could not load layouts.js: cues are the takes, one per sentence)')
    fj = os.path.join(film, 'film.json'); F = json.load(open(fj, encoding='utf8')) if os.path.exists(fj) else {}
    F.setdefault('captions', {})['cues'] = cues; json.dump(F, open(fj, 'w'), ensure_ascii=False, indent=1)
    src_caps = [{'id': t['id'], 'text': t['text'], 't0': t['t0'], 't1': t['t1'], 'anchor': t['anchor']} for t in R['texts'] if t['caption']]
    json.dump(src_caps, open(os.path.join(film, 'src', 'source-captions.json'), 'w'), ensure_ascii=False, indent=1)
    log('wrote %s/src/words.json (%d takes, %d words), film.json captions.cues (%d cues), src/source-captions.json (%d burned-in lines of the source, for reference)' % (film, len(segs), len(R['words']), len(cues), len(src_caps)))
    log('next: put the host video in as src/host.mp4 and make frames/voice/env/meta WITHOUT re-running the transcript: see REMAKE.md, mode restyle.')

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter); sp = ap.add_subparsers(dest='cmd', required=True)
    a = sp.add_parser('analyze'); a.add_argument('video'); a.add_argument('--out', required=True); a.add_argument('--lang', default='auto'); a.add_argument('--model', default='small')
    a.add_argument('--ocr-step', type=float, default=0.5); a.add_argument('--no-asr', action='store_true'); a.add_argument('--no-ocr', action='store_true'); a.add_argument('--reuse', action='store_true', help='reuse an existing teardown/ folder and the words of an existing remake.json'); a.add_argument('--keep-frames', action='store_true')
    r = sp.add_parser('restyle'); r.add_argument('remake'); r.add_argument('--film', required=True); r.add_argument('--max-chars', type=int, default=28); r.add_argument('--balance', action='store_true')
    A = ap.parse_args()
    {'analyze': cmd_analyze, 'restyle': cmd_restyle}[A.cmd](A)

if __name__ == '__main__': main()
