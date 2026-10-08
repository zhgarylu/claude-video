"""Sound for a demo-breakdown film: narration, the source's own sound (muted, ducked under the voice, or kept, per clip), a quiet music bed and light foley.

  .venv/bin/python tools/breakdown/mix.py <project>        (after prep.py and `node core/render/events.mjs <project>`)

Reads   timeline.json (voice and source-audio placement), events.json (the page's visual cues: freeze shutter, boxes, arrows, markers, cards, nodes…), breakdown.json
Writes  out/mix.wav (48 kHz stereo). Loudness (-14 LUFS) is mux.sh's job.
Bus balance: voice RMS about 10 dB above the music; the music goes down another 8 dB under the voice and 12 dB under a clip whose own sound is kept;
foley goes down 3 dB under the voice. A clip's own sound is levelled to a fixed RMS first, then follows its mode: keep = as is, duck = 13 dB down while the voice speaks, mute = absent."""
import json, os, sys
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, LIB); sys.path.insert(0, os.path.join(LIB, 'tools', 'talk'))
from core.audio import sfx
from core.audio.sfx import SR
from mix_helpers import load_voice, voice_env, duck, finish
P = os.path.abspath(sys.argv[1]); tl = json.load(open(os.path.join(P, 'timeline.json'))); spec = json.load(open(os.path.join(P, 'breakdown.json')))
ev = json.load(open(os.path.join(P, 'events.json')))['ev'] if os.path.exists(os.path.join(P, 'events.json')) else []
DUR = tl['dur']; N = int((DUR + .6) * SR)
def stereo(x): return np.stack([x, x], 1) if x.ndim == 1 else x
def put(buf, x, at, g=1.0):
    s = int(round(at * SR)); e = min(len(buf), s + len(x))
    if 0 <= s < len(buf): buf[s:e] += x[:e - s] * g

# ── voice
voice = np.zeros((N, 2), np.float32)
for s in tl['shots']:
    v = s.get('voice')
    if not v: continue
    f = os.path.join(P, v['file'])
    if not os.path.exists(f): print('no voice file', f); continue
    w = load_voice(f); sr = sf.info(f).samplerate
    if sr != SR: w = soxr.resample(w, sr, SR)
    put(voice, stereo(w.astype(np.float32)), s['t0'] + v['t0'])
env = voice_env(voice)

# ── the source's own sound
src = np.zeros((N, 2), np.float32); keep_env = np.zeros(N, np.float32)
for s in tl['shots']:
    a = s.get('audio')
    if not a or a['mode'] == 'mute': continue
    f = os.path.join(P, a['file'])
    if not os.path.exists(f): continue
    w, sr = sf.read(f, dtype='float32'); w = stereo(w) if w.ndim == 1 else w
    if sr != SR: w = soxr.resample(w, sr, SR)
    rms = float(np.sqrt((w ** 2).mean()) + 1e-9); w = w * (0.09 / rms) if rms > 1e-4 else w          # level every clip to the same RMS first
    n = len(w); fade = int(.06 * SR); w[:fade] *= np.linspace(0, 1, fade)[:, None]; w[-fade:] *= np.linspace(1, 0, fade)[:, None]
    a0 = int(round(s['t0'] * SR)); seg = slice(a0, min(N, a0 + n)); m = len(range(*seg.indices(N)))
    if a['mode'] == 'duck': src[seg] += w[:m] * .7 * duck(env, 13)[seg][:, None]
    else: src[seg] += w[:m]; keep_env[seg] = 1.0
keep_env = np.convolve(keep_env, np.ones(int(.3 * SR)) / int(.3 * SR), 'same')

# ── music bed: a soft pad, a slow pluck line and a sub; A minor, 92 BPM by default
M = spec.get('music', {}) or {}; BPM = M.get('bpm', 92); LEVEL = M.get('level', 1.0); BEAT = 60 / BPM; rng = np.random.default_rng(11)
mus = np.zeros((N, 2), np.float32)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def pad(f, d, v=1.0):
    t = np.arange(int(d * SR)) / SR; x = sum(np.sin(2 * np.pi * f * (1 + dt) * t) * a for dt, a in ((0, 1), (.004, .7), (-.004, .7))) + .25 * np.sin(2 * np.pi * f * 2 * t)
    return x * np.minimum(1, t / .9) * np.minimum(1, (d - t) / 1.2) * v / 3
def pluck(f, d=.9):
    t = np.arange(int(d * SR)) / SR; x = (np.sin(2 * np.pi * f * t) + .35 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t / .08)) * np.exp(-t / .28)
    return sfx.lp(x, 2600, 2) * np.minimum(1, t / .004)
def sub(f, d):
    t = np.arange(int(d * SR)) / SR; return (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * f * 2 * t)) * np.minimum(1, t / .03) * np.minimum(1, (d - t) / .15)
CH = [(45, [57, 60, 64, 71]), (41, [57, 60, 65, 69]), (48, [55, 60, 64, 67]), (43, [55, 59, 62, 69])]      # Am9, Fmaj7, C, G6
bars = int(DUR / (4 * BEAT)) + 2 if not M.get('file') else 0      # a music file replaces the synthesised bed (see below)
for b in range(bars):
    root, ch = CH[b % 4]; t0 = b * 4 * BEAT; ramp = min(1.0, .35 + b / 6)
    for k, n in enumerate(ch): put(mus, stereo(pad(mtof(n), 4 * BEAT + 1.0)) * np.array([1 - .12 * k, .88 + .12 * k]), t0 + .02 * k, .5 * ramp)
    put(mus, stereo(sub(mtof(root), 3.4 * BEAT)), t0, .55 * ramp)
    if b >= 1:
        pat = [0, 2, 4, 3, 5, 3, 2, 1]
        for i, k in enumerate(pat):
            if i % 2 == 0 or i == 5: put(mus, stereo(pluck(mtof(ch[k % 4] + 12))) * np.array([.7 + .02 * k, .9 - .02 * k]), t0 + i * BEAT / 2, .2 * ramp)
    if b >= 2:
        for i in range(8):
            if i % 2 == 1: put(mus, stereo(sfx.hp(sfx.noise(.05), 6000, 2) * np.exp(-np.arange(int(.05 * SR)) / SR / .015)), t0 + i * BEAT / 2, .05 * ramp)
vm0 = np.abs(voice[:, 0]) > 1e-3
if M.get('file'):
    # a supplied track: decoded by ffmpeg, trimmed from `start` (s), looped if shorter than the film, levelled to sit MUSIC_DB under the voice (before the extra ducking), faded in 1.5 s and out over `fade_out` s
    import subprocess, tempfile
    mf = M['file'] if os.path.isabs(M['file']) else os.path.join(P, M['file'])
    if not os.path.exists(mf): sys.exit('music file not found: ' + mf)
    tmp = os.path.join(tempfile.gettempdir(), 'bd_music_%d.wav' % os.getpid())
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(M.get('start', 0)), '-i', mf, '-vn', '-ac', '2', '-ar', str(SR), '-c:a', 'pcm_f32le', tmp], capture_output=True, text=True)
    if r.returncode: sys.exit('ffmpeg could not read the music file: ' + r.stderr[-300:])
    raw, _ = sf.read(tmp, dtype='float32'); os.remove(tmp); raw = stereo(raw)
    if len(raw) < N: raw = np.tile(raw, (int(np.ceil(N / len(raw))), 1))             # loop (the seam is covered by the 0.5 s crossfade below only if the track is long enough; a film longer than the track repeats it)
    raw = raw[:N].copy(); fl = int(.02 * SR)
    k = int(3.0 * SR); e = np.sqrt(np.convolve((raw ** 2).mean(1), np.ones(k) / k, 'same') + 1e-9)      # slow envelope of the track
    tgt = float(np.median(e[vm0])) if vm0.any() else float(np.median(e))
    raw *= np.clip((tgt / e) ** .6, .5, 2.0)[:, None].astype(np.float32)                                # flatten a crescendo partly, so the voice stays on top late in the film
    ref = float(np.sqrt((raw[vm0] ** 2).mean() if vm0.any() else (raw ** 2).mean()) + 1e-9)
    vdb = 20 * np.log10(np.sqrt((voice[vm0] ** 2).mean()) + 1e-9) if vm0.any() else -20.0
    mus = raw / ref * 10 ** ((vdb - float(M.get('under_db', 8))) / 20) * LEVEL         # bed RMS = voice RMS - under_db; the 8 dB duck below makes it ~16 dB under the voice while speaking
    mus *= (duck(env, 8) * (1 - .75 * keep_env))[:, None]
    fi = int(1.5 * SR); fo = int(float(M.get('fade_out', 3)) * SR); end = int(DUR * SR)
    mus[:fi] *= np.linspace(0, 1, fi)[:, None]; mus[end - fo:end] *= np.linspace(1, 0, fo)[:, None]; mus[end:] = 0
else:
    mus *= LEVEL * 0.1 * (duck(env, 8) * (1 - .75 * keep_env))[:, None]
    fi, fo = int(1.2 * SR), int(2.2 * SR); mus[:fi] *= np.linspace(0, 1, fi)[:, None]; end = int(DUR * SR); mus[end - fo:end] *= np.linspace(1, 0, fo)[:, None]; mus[end:] = 0

# ── foley from the page's events
fx = np.zeros((N, 2), np.float32); last = {}
def fxput(x, t, g, pan=0.0):
    if g <= 0: return
    tmp = np.zeros((N, 2), np.float32); sfx.add(tmp, x, t, g, pan); fx[:] += tmp
SND = {
    'cut': lambda t, e: fxput(sfx.whoosh(.32, .5), t - .08, .22) if t > .1 else None,
    'shutter': lambda t, e: (fxput(sfx.click(.8, .9), t, .55), fxput(sfx.thump(.8, 90), t + .01, .35)),
    'box': lambda t, e: (fxput(sfx.click(1.5, .7), t + .02, .3, .15), fxput(sfx.whoosh(.22, .4), t - .05, .12)),
    'arrow': lambda t, e: fxput(sfx.whoosh(.4, .6), t - .05, .2, -.1),
    'mark': lambda t, e: fxput(sfx.pop(.9), t, .4, .2),
    'card': lambda t, e: (fxput(sfx.ding(.6), t + .1, .22, .2), fxput(sfx.whoosh(.28, .4), t - .04, .15)),
    'zoom': lambda t, e: fxput(sfx.whoosh(.8, .6), t, .2),
    'node': lambda t, e: fxput(sfx.click(1.2, .7), t, .28, -.15), 'item': lambda t, e: fxput(sfx.click(1.1, .7), t, .26), 'panel': lambda t, e: fxput(sfx.click(1.0, .7), t, .3),
    'col': lambda t, e: fxput(sfx.click(1.0, .7), t, .3), 'row': lambda t, e: fxput(sfx.click(1.3, .6), t, .2),
    'edge': lambda t, e: fxput(sfx.whoosh(.25, .45), t, .12),
    'verdict': lambda t, e: (fxput(sfx.ding(.9), t + .05, .32), fxput(sfx.thump(1.0, 70), t, .4)),
    'value': lambda t, e: fxput(sfx.thump(1.0, 80), t, .4),
    'hit': lambda t, e: fxput(sfx.click(.7, .8), t, .3), 'tick': lambda t, e: fxput(sfx.click(1.4, .5), t, .18), 'lower': lambda t, e: fxput(sfx.whoosh(.25, .4), t, .12),
}
for e in ev:
    f = SND.get(e['type'])
    if not f: continue
    k = (e['type'], round(e['t'], 1))
    if k in last: continue                      # no doubled hits
    last[k] = 1; f(e['t'], e)
fx *= duck(env, 3)[:, None]

mix = voice + src + mus + fx
sf.write(os.path.join(P, 'out', 'mix.wav'), finish(mix, tail=.7).astype(np.float32), SR)
def db(x): return 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
vm = np.abs(voice[:, 0]) > 1e-3
print('mix ok %.1f s | RMS dB: voice %.1f (while speaking), music %.1f, source %.1f, foley %.1f' % (DUR, db(voice[vm]) if vm.any() else -99, db(mus[vm]) if vm.any() else -99, db(src[vm]) if vm.any() else -99, db(fx[vm]) if vm.any() else -99))
