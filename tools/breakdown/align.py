"""Word timing for a narrated line, without a recogniser: where in the voice file does each character of the text start?

  from align import char_times, time_of
  t = char_times(text, wav_path)        # seconds from the start of the (already trimmed) voice file, one value per character of `text`
  time_of(text, t, 'key phrase')        # the time the phrase starts, or None

Method: the text is cut into clauses at punctuation; the voice file's silences (an energy envelope, 10 ms frames) are the clause boundaries when there are
enough of them (the longest ones are taken), otherwise the boundaries are spread by weight. Inside a clause, characters are weighted (a CJK character 1, a Latin
letter or digit 0.5, other marks 0.1). It is an estimate that is usually within 0.1-0.2 s for a line of a sentence or two; nothing here is checked against a recogniser."""
import re
import numpy as np, soundfile as sf

PUNCT = '，。；：！？、,.;:!?…—'
def _w(ch):
    if re.match(r'[぀-鿿＀-￯가-힯]', ch): return 1.0
    if ch.isalnum(): return .5
    return .1

def _gaps(y, sr, min_gap=.10):
    hop = int(.01 * sr); n = len(y) // hop
    if n < 5: return [], len(y) / sr
    e = np.sqrt((y[:n * hop].reshape(n, hop) ** 2).mean(1)); thr = max(e.max() * .045, 1e-4); sil = e < thr
    i = 0; gaps = []
    # leading/trailing silence is not a gap
    while i < n and sil[i]: i += 1
    last = n
    while last > i and sil[last - 1]: last -= 1
    while i < last:
        if sil[i]:
            j = i
            while j < last and sil[j]: j += 1
            if (j - i) * .01 >= min_gap: gaps.append(((i + j) / 2 * .01, (j - i) * .01))
            i = j
        else: i += 1
    return gaps, (last) * .01

def char_times(text, wav, lead_trim=True):
    y, sr = sf.read(wav, dtype='float32'); y = y.mean(1) if y.ndim > 1 else y
    nz = np.where(np.abs(y) > np.abs(y).max() * .03)[0] if len(y) else []
    t0 = nz[0] / sr if len(nz) else 0.0; t1 = (nz[-1] / sr) if len(nz) else len(y) / sr
    gaps, _ = _gaps(y, sr)
    gaps = [g for g in gaps if t0 + .05 < g[0] < t1 - .05]
    # clauses
    clauses = []; cur = 0
    for m in re.finditer(r'[%s]+' % re.escape(PUNCT), text):
        clauses.append((cur, m.end())); cur = m.end()
    if cur < len(text): clauses.append((cur, len(text)))
    if not clauses: return [t0] * len(text)
    wts = [sum(_w(c) for c in text[a:b]) + (1.4 if re.search(r'[。！？.!?]$', text[a:b]) else .8 if re.search(r'[，；：、,;:]$', text[a:b]) else 0) for a, b in clauses]
    tot = sum(wts) or 1; need = len(clauses) - 1
    # proportional boundaries first
    acc = np.cumsum([0] + wts) / tot; bounds = [t0 + (t1 - t0) * a for a in acc]
    if need and len(gaps) >= need:
        # take the `need` longest silences, in time order; they replace the estimated boundaries, in order
        pick = sorted(sorted(gaps, key=lambda g: -g[1])[:need], key=lambda g: g[0])
        # keep only a pick that is plausible (within 35% of the clause weight from the estimate); else keep the estimate
        for k, g in enumerate(pick):
            if abs(g[0] - bounds[k + 1]) < .35 * (t1 - t0) / max(1, len(clauses)) * 1.6 + .3: bounds[k + 1] = g[0]
    out = [0.0] * len(text)
    for k, (a, b) in enumerate(clauses):
        s, e = bounds[k], bounds[k + 1]
        # the clause's trailing pause belongs to the boundary: speech ends a little before the next clause starts
        if k < len(clauses) - 1: e = max(s + .1, e - .12)
        ws = [_w(c) for c in text[a:b]]; tw = sum(ws) or 1; c0 = s
        for i, w in zip(range(a, b), ws): out[i] = c0; c0 += (e - s) * w / tw
    return out

def time_of(text, times, phrase, ratio=1.0):
    if not phrase: return None
    i = text.find(phrase)
    if i < 0: i = text.lower().find(phrase.lower())
    if i < 0: return None
    return times[min(len(times) - 1, int(i * ratio))]
