"""Word alignment for the spoken lines: faster-whisper word stamps, refined to the nearest energy minimum.
usage as a module: words_for(wav_path, script_text) -> [(token, t0, t1)] one entry per script token (whitespace split)."""
import re, numpy as np, soundfile as sf
NUM = {'0':'zero','1':'one','2':'two','3':'three','4':'four','5':'five','6':'six','7':'seven','8':'eight','9':'nine','10':'ten'}
_model = None
def model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        _model = WhisperModel('small', compute_type='int8')
    return _model
norm = lambda s: re.sub(r'[^a-z]', '', NUM.get(s.strip().strip('.,!?'), s).lower())
def asr_tokens(y, sr):
    import soxr
    y = soxr.resample(y, sr, 16000); pad = np.zeros(int(.6 * 16000), dtype=np.float32)
    segs, _ = model().transcribe(np.concatenate([pad, y.astype(np.float32), pad]), beam_size=5, language='en', word_timestamps=True)
    return [(norm(w.word), w.start - .6, w.end - .6) for s in segs for w in s.words if norm(w.word)]
def envelope(y, sr, win=.02):
    e = np.sqrt(np.convolve(y ** 2, np.ones(int(win * sr)) / int(win * sr), 'same'))
    return e
def words_for(path, text):
    y, sr = sf.read(path); y = y if y.ndim == 1 else y.mean(1)
    toks = text.split(); toks_n = [norm(t) for t in toks]
    asr = asr_tokens(y, sr)
    # greedy character coverage: script word i takes ASR tokens until it has at least as many letters
    spans, j = [], 0
    for i, tn in enumerate(toks_n):
        if j >= len(asr): spans.append(None); continue
        first = j; acc = 0
        while j < len(asr) and (acc < len(tn) or j == first):
            acc += len(asr[j][0]); j += 1
        spans.append((first, j - 1))
    for i in range(len(spans)):               # words the greedy pass starved: borrow the previous word's tail
        if spans[i] is None: spans[i] = spans[i - 1]
    e = envelope(y, sr); thr = e.max() * .04
    nz = np.where(e > thr)[0]; s0, s1 = nz[0] / sr, nz[-1] / sr
    starts = [asr[a][1] for a, b in spans]; ends = [asr[b][2] for a, b in spans]
    bounds = []
    for i in range(len(toks) - 1):
        mid = (ends[i] + starts[i + 1]) / 2
        lo, hi = int(max(0, (mid - .09)) * sr), int(min(len(y) / sr, mid + .09) * sr)
        k = lo + int(np.argmin(e[lo:hi])) if hi > lo else int(mid * sr)
        bounds.append(k / sr)
    out = []
    for i, t in enumerate(toks):
        a = s0 if i == 0 else bounds[i - 1]; b = s1 if i == len(toks) - 1 else bounds[i]
        out.append((t, round(float(a), 3), round(float(b), 3)))
    return out
