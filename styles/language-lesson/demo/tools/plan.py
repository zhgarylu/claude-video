"""The film's clock: lays the voice lines end to end (plus the think pauses) and writes timeline.json
{lines:{id:{t0,t1}}, marks:{name:t}, words:{id:[[t0,t1]..]}, mouth:{hz,v[]}, dur}. Picture, sound and captions all read it.
usage: .venv/bin/python styles/language-lesson/demo/tools/plan.py   (needs voices/*.wav, voices/dur.json, voices/words_en.json)"""
import json, os, re
import numpy as np, soundfile as sf
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); V = os.path.join(D, 'voices')
dur = {}   # measured from the wavs (tts.py and tts_zh.py each write their own dur.json)
lines = {L['id']: L for L in json.load(open(os.path.join(D, 'lines.json'), encoding='utf-8'))}
for _i in lines:
    _y, _sr = sf.read(os.path.join(V, _i + '.wav')); dur[_i] = round(len(_y) / _sr, 3)
wen = json.load(open(os.path.join(V, 'words_en.json'))) if os.path.exists(os.path.join(V, 'words_en.json')) else {}
LN, MK = {}, {}
cur = 0.0
def say(i, gap=.1):
    global cur
    LN[i] = {'t0': round(cur, 3), 't1': round(cur + dur[i], 3)}; cur += dur[i] + gap
def mark(n, at=None): MK[n] = round(cur if at is None else at, 3)
def skip(s):
    global cur; cur += s

# ---- cover
cur = .35
say('c1', .14); say('c3', .3)
mark('cover.out'); skip(.35); mark('A.in'); skip(.3)
# ---- loop A: in July
say('a1', .05); say('a2', .05); say('a3', .1)
skip(.05); mark('A.think0'); skip(2.0); mark('A.think1'); skip(.08)
say('a4', .02); say('a5', .3)
say('a6', .08); say('a7', .04); say('a8', .3)
say('a9', 0); say('a10', 1.2)
say('a11', .1); say('a12', .55); say('a14', .6)
mark('A.out'); skip(.4); mark('B.in'); skip(.2)
# ---- loop B: on Monday
say('b2', .05); say('b3', .1)
skip(.05); mark('B.think0'); skip(2.0); mark('B.think1'); skip(.08)
say('b4', .02); say('b5', .3)
say('b7', 0); say('b8', 1.2)
say('b9', .02); say('b10', .1); say('b11', .02); say('b12', 1.8)
mark('B.out'); skip(.4); mark('MON')
# ---- the same cards in other languages
t = cur + .15; LN['m1'] = {'t0': round(t, 3), 't1': round(t + dur['m1'], 3)}
mon1 = LN['m1']['t1'] - .25; CARD = [4.0, 4.0, 4.2]
MK['MON.1'] = round(mon1, 3); MK['MON.2'] = round(mon1 + CARD[0], 3); MK['MON.3'] = round(mon1 + CARD[0] + CARD[1], 3); MK['HOOK'] = round(mon1 + sum(CARD), 3)
for k, i in enumerate(['m2', 'm3', 'm4']):
    t0 = MK['MON.%d' % (k + 1)] + .35; LN[i] = {'t0': round(t0, 3), 't1': round(t0 + dur[i], 3)}
# ---- the next question
cur = MK['HOOK'] + .35
say('h1', .06); say('h2', .1)
mark('H.ring0'); say('h3', .2)
DUR = round(MK['H.ring0'] + 2.8, 2)

# ---- word timings of the repeated sentences (from the speech check; contiguous: a word lasts until the next begins)
def word_times(i, n):
    # Whisper's word ends, normalised to the length of the line (its starts are unreliable on padded TTS audio); even split as a fallback
    t0, t1 = LN[i]['t0'], LN[i]['t1']; w = wen.get(i, [])
    if len(w) == n and w[-1][2] > 0:
        ends = [t0 + (t1 - t0) * max(x[2], 0) / w[-1][2] for x in w]
    else:
        ends = [t0 + (t1 - t0) * (k + 1) / n for k in range(n)]
    st = [t0] + ends[:-1]
    return [[round(a, 3), round(b, 3)] for a, b in zip(st, ends)]
WORDS = {i: word_times(i, 5) for i in ['a12', 'a14']}
for i in WORDS:
    if len(wen.get(i, [])) != 5: print('warning: word timings of', i, 'are even (speech check gave', len(wen.get(i, [])), 'words)')

# ---- mouth: the voice envelope at 48 Hz (Pip's beak follows it)
HZ = 48; n = int(DUR * HZ) + 2; env = np.zeros(n)
for i, T in LN.items():
    y, sr = sf.read(os.path.join(V, i + '.wav'))
    if y.ndim > 1: y = y.mean(1)
    hop = sr // HZ; k = len(y) // hop
    r = np.sqrt(np.mean(y[:k * hop].reshape(k, hop) ** 2, axis=1))
    s = int(round(T['t0'] * HZ)); k = min(k, n - s); env[s:s + k] = np.maximum(env[s:s + k], r[:k])
ref = np.percentile(env[env > 0], 90); m = np.clip(env / ref, 0, 1) ** .8
m = np.convolve(m, np.array([.25, .5, .25]), mode='same')
json.dump({'lines': LN, 'marks': MK, 'words': WORDS, 'mouth': {'hz': HZ, 'v': [round(float(x), 2) for x in m]}, 'dur': DUR}, open(os.path.join(D, 'timeline.json'), 'w'), ensure_ascii=False)
print('dur', DUR, 'marks', {k: v for k, v in MK.items()})
