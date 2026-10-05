"""Place every spoken line on the beat grid: anchor words land on their beats, the stretch between anchors stays inside +-15 %.
Reads lines.json, song.json, voices/lXX.wav; writes voices/placed/lXX.wav (starts at the line's bar, 24 kHz) and out/place_report.txt.
usage: .venv/bin/python styles/lyric-video/demo/tools/place.py"""
import os, sys, json, subprocess, tempfile
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from align import words_for
S = json.load(open(os.path.join(D, 'song.json'))); L = {l['id']: l for l in json.load(open(os.path.join(D, 'lines.json')))}
BEAT = 60 / S['bpm']; LEAD = .035      # a spoken word's onset leads its beat slightly so the vowel sits on it
SR = 24000; os.makedirs(os.path.join(D, 'voices', 'placed'), exist_ok=True)
def stretch(x, r):
    if abs(r - 1) < .005 or len(x) < 200: return x
    with tempfile.TemporaryDirectory() as td:
        a, b = os.path.join(td, 'a.wav'), os.path.join(td, 'b.wav'); sf.write(a, x, SR)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', a, '-filter:a', 'atempo=%.4f' % r, b], check=True)
        return sf.read(b)[0]
rep = []; WORDS = {}
for ln in S['lines']:
    i = ln['id']; y, sr = sf.read(os.path.join(D, 'voices', i + '.wav')); assert sr == SR
    W = words_for(os.path.join(D, 'voices', i + '.wav'), L[i]['text'])
    A = ln['a']; segs = []
    for k, (wi, beat) in enumerate(A):
        a0 = W[wi][1] if k else 0.0
        a1 = W[A[k + 1][0]][1] if k + 1 < len(A) else len(y) / SR
        segs.append((a0, a1, beat * BEAT - LEAD))
    out = np.zeros(int((3 * BEAT * 4 + 1) * SR)); log = []; seginfo = []
    for k, (a0, a1, tgt) in enumerate(segs):
        x = y[int(a0 * SR):int(a1 * SR)]; nat = a1 - a0
        if len(x) < 400: log.append("EMPTY seg%d %s" % (k, [(w[0], w[1], w[2]) for w in W])); continue
        avail = (segs[k + 1][2] - tgt) if k + 1 < len(segs) else nat
        r = nat / avail if avail > 0 else 1
        r = min(max(r, .87), 1.15) if r > .87 else 1.0     # pad with silence when there is room, squeeze up to 15 % when not
        if k + 1 < len(segs) and nat / r > avail + .02: log.append('OVERFLOW seg%d needs %.2fs has %.2fs' % (k, nat / r, avail))
        x = stretch(x, r) if r != 1 else x
        fi = int(.004 * SR); x = x.copy(); x[:fi] *= np.linspace(0, 1, fi); x[-fi:] *= np.linspace(1, 0, fi)
        s = max(0, int(tgt * SR)); out[s:s + len(x)] += x[:len(out) - s] if s + len(x) > len(out) else x
        log.append('seg%d %-14s r=%.2f' % (k, W[A[k][0]][0], r)); seginfo.append((a0, a1, tgt, r))
    end = np.where(np.abs(out) > 1e-4)[0][-1] + int(.1 * SR)
    sf.write(os.path.join(D, 'voices', 'placed', i + '.wav'), out[:end], SR)
    def mp(x, end=False):      # natural time -> time inside the placed line (each segment starts at its anchor and runs at rate 1/r)
        for (a0, a1, tgt, r) in seginfo:
            if (x <= a1 + 1e-6) if end else (x < a1 - 1e-6): return tgt + (min(max(x, a0), a1) - a0) / r
        a0, a1, tgt, r = seginfo[-1]; return tgt + (x - a0) / r
    t0 = ln['bar'] * BEAT * 4
    WORDS[i] = {'bar': ln['bar'], 'text': L[i]['text'], 'words': [[w, round(t0 + mp(a), 3), round(t0 + mp(b, True), 3)] for w, a, b in W]}
    rep.append('%s end=%.2fbeats  %s' % (i, end / SR / BEAT, '; '.join(log)))
    print(rep[-1])
open(os.path.join(D, 'out', 'place_report.txt'), 'w').write('\n'.join(rep)); json.dump(WORDS, open(os.path.join(D, 'words.json'), 'w'), indent=0)
