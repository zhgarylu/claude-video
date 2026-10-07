"""Prepare a demo-breakdown project: validate breakdown.json, make the voice, cut the footage into frames, compute the timeline.

  .venv/bin/python tools/breakdown/prep.py <project> [--no-voice] [--force]

Reads   <project>/breakdown.json                      the shot list (tools/breakdown/README.md has the schema)
Writes  work/voices/<shot>.wav, dur.json              narration (edge-tts, Yunxi by default) and its speech-to-text check
        work/frames/<shot>/NNNN.jpg + meta.json       every clip shot at the film's fps, original speed (and its picture-in-picture)
        work/stills/<shot>.jpg                        every freeze frame (full resolution, up to 2560 px wide)
        work/audio/<shot>.wav                         the source's own sound for each clip shot
        timeline.json                                 shot times, reveal times of every element, subtitle cues, voice and source-audio placement
        out/cues.json, CREDITS, FACTS.md              subtitles for srt.py; credits and a fact sheet skeleton (never overwritten)
        fonts/NotoSansSC.ttf                          fetched once (SIL OFL), or copied from another project of the library

The footage is the user's: the tool never downloads it (ingest.py --url does, only on request) and never refuses it; CREDITS records where it came from."""
import argparse, hashlib, json, math, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.path.dirname(os.path.dirname(HERE))
ap = argparse.ArgumentParser(); ap.add_argument('project'); ap.add_argument('--no-voice', action='store_true'); ap.add_argument('--force', action='store_true'); ap.add_argument('--model', default='small')
A = ap.parse_args()
P = os.path.abspath(A.project); PY = os.path.join(LIB, '.venv', 'bin', 'python')
if not os.path.exists(PY): PY = sys.executable
spec_path = os.path.join(P, 'breakdown.json')
if not os.path.exists(spec_path): sys.exit('no breakdown.json in %s (tools/breakdown/new.py creates a project)' % P)
spec = json.load(open(spec_path, encoding='utf8'))
FPS = int(spec.get('fps', 24)); LANG = spec.get('lang', 'zh'); V = spec.get('aspect', '16x9') == '9x16'
SHOTS = spec['shots']; SRC = spec.get('sources', {}); first_src = next(iter(SRC), None)
warns = []
def warn(m): warns.append(m); print('WARN ', m)
def sh(*c, **k): return subprocess.run(c, capture_output=True, text=True, **k)
def p(*a): return os.path.join(P, *a)
for d in ('work/voices', 'work/frames', 'work/stills', 'work/audio', 'out', 'fonts'): os.makedirs(p(*d.split('/')), exist_ok=True)

# ── validate
ids = set(); TYPES = {'hook', 'clip', 'freeze', 'explain', 'compare'}
for s in SHOTS:
    if s.get('type') not in TYPES: sys.exit('shot %r: type must be one of %s' % (s.get('id'), sorted(TYPES)))
    if not s.get('id') or not re.fullmatch(r'[A-Za-z0-9_-]+', s['id']) or s['id'] in ids: sys.exit('shot ids must be unique, letters/digits/-/_ only: %r' % s.get('id'))
    ids.add(s['id'])
    if s['type'] in ('clip', 'freeze') and not (s.get('src') or first_src): sys.exit('shot %s needs a source: add "sources" to breakdown.json' % s['id'])
    if s['type'] == 'clip' and not (s.get('out', 0) > s.get('in', 0) >= 0): sys.exit('clip %s: "in" and "out" (seconds in the source) are required, out > in' % s['id'])
    if s['type'] == 'freeze' and 't' not in s: sys.exit('freeze %s: "t" (seconds in the source) is required' % s['id'])
    if s['type'] == 'explain' and s.get('kind', 'flow') not in ('flow', 'list', 'beforeafter', 'number'): sys.exit('explain %s: kind is flow|list|beforeafter|number' % s['id'])
    if s['type'] in ('explain', 'compare') and not s.get('basis'): warn('%s: add "basis" (what in the source supports this drawing); it is printed under every interpretation' % s['id'])
def srcof(s):
    k = s.get('src') or first_src; return k, SRC[k]
def srcfile(k): return p(SRC[k]['file']) if not os.path.isabs(SRC[k]['file']) else SRC[k]['file']
probe = {}
for k, v in SRC.items():
    f = srcfile(k)
    if not os.path.exists(f): sys.exit('source %s: file not found: %s' % (k, f))
    j = json.loads(sh('ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', f).stdout)
    vs = next(x for x in j['streams'] if x['codec_type'] == 'video'); probe[k] = {'w': int(vs['width']), 'h': int(vs['height']), 'dur': float(j['format']['duration']), 'audio': any(x['codec_type'] == 'audio' for x in j['streams'])}
for s in SHOTS:
    if s['type'] in ('clip', 'freeze'):
        k, _ = srcof(s); end = s.get('out', s.get('t', 0))
        if end > probe[k]['dur'] + .05: sys.exit('shot %s asks for %.1f s but source %s is %.1f s long' % (s['id'], end, k, probe[k]['dur']))

# ── fonts
fp = p('fonts', 'NotoSansSC.ttf')
if not os.path.exists(fp):
    import glob
    local = glob.glob(os.path.join(LIB, 'styles', '*', 'demo', 'fonts', 'NotoSansSC.ttf')) + glob.glob(os.path.join(LIB, 'films', '*', 'fonts', 'NotoSansSC.ttf'))
    if local: shutil.copy(local[0], fp); print('font: copied', local[0])
    else:
        r = sh('curl', '-sfL', '-o', fp, 'https://github.com/google/fonts/raw/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf')
        if r.returncode or not os.path.getsize(fp): sys.exit('could not fetch Noto Sans SC (network). Put NotoSansSC.ttf in %s/fonts/' % P)
    sh('curl', '-sfL', '-o', p('fonts', 'OFL-notosanssc.txt'), 'https://github.com/google/fonts/raw/main/ofl/notosanssc/OFL.txt')

# ── voice
VOICE = (spec.get('voice') or {}); VNAME = VOICE.get('name', 'zh-CN-YunxiNeural' if LANG == 'zh' else 'en-US-GuyNeural'); VRATE = VOICE.get('rate', '+0%'); VPITCH = VOICE.get('pitch', '+0Hz')
lines = [{'id': s['id'], 'text': s['say'], 'voice': VNAME, 'rate': s.get('rate', VRATE), 'pitch': VPITCH, **({'say': s['speak']} if s.get('speak') else {}), **({'asr': s['asr']} if s.get('asr') else {})} for s in SHOTS if s.get('say')]
vd = {}
def synth(lines):
    json.dump(lines, open(p('work', 'lines.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    if A.no_voice: return
    tts = 'tts_zh.py'
    r = subprocess.run([PY, os.path.join(LIB, 'core', 'tts', tts), p('work', 'lines.json'), p('work', 'voices')]);
    if r.returncode: sys.exit('voice failed (edge-tts needs a network connection; exit %d)' % r.returncode)
if lines:
    synth(lines)
    vd = json.load(open(p('work', 'voices', 'dur.json'))) if os.path.exists(p('work', 'voices', 'dur.json')) else {}
    # a narration that overruns its clip is sped up (up to +22%) and re-voiced; longer than that is the author's to cut
    changed = False
    for s in SHOTS:
        if s['type'] == 'clip' and s.get('say') and s['id'] in vd:
            avail = (s['out'] - s['in']) - s.get('say_at', .4) - .2; need = vd[s['id']]
            if need > avail:
                cur = int(re.sub(r'[^-\d]', '', next(l for l in lines if l['id'] == s['id'])['rate']) or 0); up = math.ceil((need / avail - 1) * 100) + 3 + cur
                if up > 22: warn('%s: narration is %.1f s but the clip leaves %.1f s: shorten the line or use a longer clip' % (s['id'], need, avail))
                else:
                    next(l for l in lines if l['id'] == s['id'])['rate'] = '%+d%%' % up; changed = True; print('voice: %s sped up to +%d%% to fit its clip' % (s['id'], up))
    if changed and not A.no_voice: synth(lines); vd = json.load(open(p('work', 'voices', 'dur.json')))
    lh = hashlib.md5(json.dumps(lines, sort_keys=True).encode()).hexdigest(); okf = p('work', 'voices', '.asr_ok')
    if not A.no_voice and not (os.path.exists(okf) and open(okf).read() == lh):
        r = subprocess.run([PY, os.path.join(LIB, 'core', 'tts', 'asr_check.py'), p('work', 'lines.json'), p('work', 'voices'), '--lang', LANG if LANG in ('zh', 'en') else 'auto', '--model', A.model])
        if r.returncode: warn('asr_check: some lines are not heard as written. Listen to them; if they are right, put what the model heard in the shot\'s "asr" field')
        else: open(okf, 'w').write(lh)

# ── reading time (the same rule as core/render/readcheck.mjs)
def read_s(t):
    t = re.sub(r'\s', '', t or ''); cjk = len(re.findall(r'[　-鿿＀-￯]', t)); return max(1.5, cjk / 4.5 + (len(t) - cjk) / 15 + 1.5)

# ── schedule: reveal times and the texts that appear with them
def texts_and_items(s):
    """-> (fixed: {key: (t, [texts])}, items: [(key, [texts])] spread over the narration)"""
    ty = s['type']; fixed = {}; items = []
    if ty == 'hook':
        t0 = .15
        for key in ('kicker', 'big', 'title', 'sub'):
            if s.get(key): fixed[key] = (t0, [s[key]]); t0 += .25 if key != 'title' else .4
        for i, m in enumerate(s.get('meta', [])): fixed['meta:%d' % i] = (t0 + .25 * i + .3, [m])
    elif ty == 'clip':
        lw = s.get('lower')
        if lw: fixed['lower'] = (.5, [lw.get('title', ''), lw.get('sub', '')])
    elif ty == 'freeze':
        for i, b in enumerate(s.get('boxes', [])): items.append(('box:%d' % i, [b.get('label', '')]))
        for i, a in enumerate(s.get('arrows', [])): items.append(('arrow:%d' % i, [a.get('label', '')]))
        for i, m in enumerate(s.get('markers', [])): items.append(('mark:%d' % i, [m.get('text', '')]))
        if s.get('card'): items.append(('card', [s['card'].get('title', ''), s['card'].get('body', '')]))
    elif ty == 'explain':
        k = s.get('kind', 'flow')
        if s.get('title'): fixed['title'] = (.1, [s['title']])
        if k == 'flow':
            for i, n in enumerate(s.get('nodes', [])): items.append(('node:%d' % i, [n.get('label', ''), n.get('sub', '')]))
        elif k == 'list':
            for i, it in enumerate(s.get('items', [])): items.append(('item:%d' % i, [it.get('head', ''), it.get('body', '')]))
        elif k == 'beforeafter':
            for i, side in enumerate((s.get('before'), s.get('after'))):
                if side: items.append(('panel:%d' % i, [side.get('title', '')] + side.get('lines', [])))
        elif k == 'number':
            items += [('value', [s.get('value', '')]), ('label', [s.get('label', '')])] + ([('note', [s['note']])] if s.get('note') else [])
    elif ty == 'compare':
        if s.get('title'): fixed['title'] = (.1, [s['title']])
        if s.get('table'):
            t = s['table']; fixed['head'] = (.3, t['head'])
            for k_, r in enumerate(t['rows']): items.append(('row:%d' % k_, r))
        else:
            cols = s.get('cols') or [c for c in (s.get('left'), s.get('right')) if c]
            for i, c in enumerate(cols): items.append(('col:%d' % i, [c.get('title', '')] + c.get('items', [])))
        if s.get('verdict'): items.append(('verdict', [s['verdict']]))
    return fixed, items
LEAD = {'hook': .6, 'clip': .4, 'freeze': .5, 'explain': .6, 'compare': .6}; TAIL = .7; MINDUR = {'hook': 4.2, 'freeze': 3.6, 'explain': 4.5, 'compare': 5.0}
seen_chrome = set(); tl_shots = []; t_cursor = 0.0
for n, s in enumerate(SHOTS):
    ty = s['type']; vdur = vd.get(s['id'], 0.0) if s.get('say') else 0.0
    lead = s.get('say_at', LEAD[ty]); vend = lead + vdur
    fixed, items = texts_and_items(s); sched = {}; need = []   # need: (reveal time, text)
    # chrome texts: only the first appearance of each distinct text is read (readcheck ignores later runs)
    ctag = ('tag', '官方演示 · 节选' if ty in ('clip', 'freeze') else '解读示意 · 非官方画面' if ty in ('explain', 'compare') else spec.get('series', '实录解读'))
    if ty in ('clip', 'freeze') and (s.get('tag') or spec.get('tag')): ctag = ('tag', s.get('tag') or spec['tag'])
    chrome = [ctag]
    if ty in ('explain', 'compare'): chrome += [('stamp', '解读示意')]
    if s.get('section'): chrome += [('prog', ' '.join(['%02d' % s['section'], (spec.get('sections') or [''])[s['section'] - 1]]))]
    for key, text in chrome:
        if (key, text) not in seen_chrome: seen_chrome.add((key, text)); need.append((0.0, text))
    if s.get('basis') and ty in ('explain', 'compare'): need.append((0.0, '依据：' + s['basis']))
    for key, (t, ts) in fixed.items(): sched[key] = round(t, 2); need += [(t, x) for x in ts if x]
    if ty == 'freeze':
        zoom0 = .55; sched['zoom0'] = zoom0; sched['zoom1'] = zoom0 + .95 if s.get('crop') else zoom0
        first = max(lead + .1, sched['zoom1'] + .15 if s.get('crop') else lead + .1)
    else: first = max(lead + .1, max([v[0] for v in fixed.values()] or [0]) + .5) if items else 0
    if items:
        n_ = len(items); target = max(first, lead + max(vdur, 1.0) * .6); step = 0 if n_ == 1 else min(2.2, max(.5, (target - first) / (n_ - 1)))
        explicit = {}
        for i, (key, ts) in enumerate(items):
            base = {'mark': 'markers', 'box': 'boxes', 'arrow': 'arrows'}.get(key.split(':')[0])
            at = None
            if base: at = s[base][int(key.split(':')[1])].get('time')
            elif key == 'card': at = s['card'].get('time')
            elif key.startswith('node'): at = s['nodes'][int(key.split(':')[1])].get('time')
            elif key.startswith('item'): at = s['items'][int(key.split(':')[1])].get('time')
            t = at if at is not None else first + i * step
            sched[key] = round(t, 2); need += [(t, x) for x in ts if x]
        if ty == 'explain' and s.get('kind', 'flow') == 'flow':
            nodes = s.get('nodes', []); idx = {str(n.get('id', i)): i for i, n in enumerate(nodes)}
            edges = s.get('edges') or [[str(nodes[i].get('id', i)), str(nodes[i + 1].get('id', i + 1))] for i in range(len(nodes) - 1)]
            for k_, e in enumerate(edges):
                tt = sched.get('node:%d' % idx.get(str(e[1]), 0), first); sched['edge:%d' % k_] = round(max(.2, tt - .35), 2)
                if len(e) > 2 and e[2]: need.append((tt, e[2]))
        if ty == 'explain' and s.get('kind') == 'beforeafter': sched.setdefault('panel:1', sched.get('panel:0', first) + .8)
    if ty == 'clip':
        base = s['out'] - s['in']; dur = base
        lw = s.get('lower')
        if lw: sched['lower_hold'] = round(min(max(read_s(lw.get('title', '')), read_s(lw.get('sub', '')) if lw.get('sub') else 0) + .3, dur - .5 - .6), 2)
        for h in s.get('highlights', []):
            if h.get('label') and (h.get('t1', dur) - h.get('t0', 0)) < read_s(h['label']) + .3: warn('%s: highlight "%s" is shown for less than its reading time' % (s['id'], h['label']))
        if vend > dur: warn('%s: narration ends at %.1f s but the clip is %.1f s long' % (s['id'], vend, dur))
        if dur < read_s(ctag[1]) + .5 and ('tag', ctag[1]) in seen_chrome and need and need[0][0] == 0: warn('%s: clip is shorter than the time its tag needs to be read' % s['id'])
    else:
        dur = max(MINDUR[ty], vend + TAIL, s.get('dur', 0), max([t + .3 + read_s(x) + .15 for t, x in need] or [0]))
        if s.get('dur') and s['dur'] < dur - 1e-6: warn('%s: "dur" %.1f s is shorter than needed (%.1f s) for the narration and reading time' % (s['id'], s['dur'], dur)); dur = s['dur']
    dur = math.ceil(dur * FPS) / FPS
    e = {'id': s['id'], 'type': ty, 't0': round(t_cursor, 3), 'dur': round(dur, 3), 'sched': sched, 'section': s.get('section')}
    if ty == 'clip': e['in'] = s['in']; e['out'] = s['out']
    if ty == 'freeze': e['t'] = s['t']
    if s.get('say') and vdur: e['voice'] = {'file': 'work/voices/%s.wav' % s['id'], 't0': round(lead, 3), 'dur': round(vdur, 3)}
    tl_shots.append(e); t_cursor += dur
DUR = round(t_cursor, 3)

# ── subtitle cues (narration, split at punctuation, timed by character count; or the author's own `subs` for a clip's original speech)
MAXC = 20
def split_cues(text):
    parts = [x for x in re.split(r'(?<=[，。；：！？、,.;:!?])', text) if x.strip()]; out = []
    for x in parts:
        if out and len(re.sub(r'[，。；：！？、,.;:!?]', '', out[-1])) + len(re.sub(r'[，。；：！？、,.;:!?]', '', x)) <= MAXC and (len(re.sub(r'[，。；：！？、,.;:!?]', '', x)) < 6 or len(re.sub(r'[，。；：！？、,.;:!?]', '', out[-1])) < 6 or re.search(r'[、，,]$', out[-1])): out[-1] += x
        else: out.append(x)
    res = []
    for x in out:      # too long: break at the middle
        core = re.sub(r'[，。；：！？、,.;:!?]$', '', x)
        while len(core) > MAXC + 4: res.append(core[:MAXC]); core = core[MAXC:]
        res.append(core)
    return [re.sub(r'[，。；：、,;:]+$', '', r).strip() for r in res if r.strip()]
cues = []
for s, e in zip(SHOTS, tl_shots):
    if s.get('subs'):
        for c in s['subs']: cues.append({'t0': round(e['t0'] + c['at'], 3), 't1': round(e['t0'] + c['to'], 3), 'text': c['text']})
    elif e.get('voice'):
        pieces = split_cues(s['say']); w = [max(2, len(re.sub(r'[，。；：！？、,.;:!?]', '', x))) + (2.2 if re.search(r'[。！？.!?]$', x) else 1.2 if re.search(r'[，；：、,;:]$', x) else 0) for x in pieces]
        # keep each piece's own pause weight: punctuation was stripped by split_cues, so recompute from the raw split
        raw = [x for x in re.split(r'(?<=[，。；：！？、,.;:!?])', s['say']) if x.strip()]
        v0 = e['t0'] + e['voice']['t0']; tot = sum(w); c0 = v0
        for x, wi in zip(pieces, w):
            d = e['voice']['dur'] * wi / tot; cues.append({'t0': round(c0, 3), 't1': round(c0 + d, 3), 'text': x}); c0 += d
# hold at least 1.4 s where the next cue allows it; never overlap
cues.sort(key=lambda c: c['t0'])
for i, c in enumerate(cues):
    nxt = cues[i + 1]['t0'] if i + 1 < len(cues) else DUR
    c['t1'] = round(min(max(c['t1'] + .12, c['t0'] + 1.4), nxt, DUR), 3)

# ── cut the footage
def sig(*a): return hashlib.md5(json.dumps(a, sort_keys=True, default=str).encode()).hexdigest()
state_path = p('work', '.prep.json'); state = json.load(open(state_path)) if os.path.exists(state_path) and not A.force else {}
def once(key, params, outputs, fn):
    h = sig(params, [os.path.getmtime(srcfile(k)) for k in SRC])
    if state.get(key) == h and all(os.path.exists(o) for o in outputs): return
    fn(); state[key] = h
def cut_frames(f, t0, dur, outdir, width):
    shutil.rmtree(outdir, ignore_errors=True); os.makedirs(outdir)
    r = sh('ffmpeg', '-v', 'error', '-y', '-ss', '%.3f' % t0, '-t', '%.3f' % (dur + .05), '-i', f, '-an', '-vf', "fps=%d,scale='min(%d,iw)':-2" % (FPS, width), '-q:v', '3', os.path.join(outdir, '%04d.jpg'))
    if r.returncode: sys.exit('ffmpeg failed: ' + r.stderr[-300:])
    n = len([x for x in os.listdir(outdir) if x.endswith('.jpg')]); from PIL import Image
    w, h = Image.open(os.path.join(outdir, '0001.jpg')).size; json.dump({'frames': n, 'fps': FPS, 'w': w, 'h': h, 'duration': round(n / FPS, 3)}, open(os.path.join(outdir, 'meta.json'), 'w'))
def cut_still(f, t, out, width=2560):
    r = sh('ffmpeg', '-v', 'error', '-y', '-ss', '%.3f' % t, '-i', f, '-frames:v', '1', '-vf', "scale='min(%d,iw)':-2" % width, '-q:v', '2', out)
    if r.returncode: sys.exit('ffmpeg failed: ' + r.stderr[-300:])
for s, e in zip(SHOTS, tl_shots):
    ty = s['type']
    if ty == 'clip':
        k, _ = srcof(s); f = srcfile(k); d = s['out'] - s['in']
        once('f:' + s['id'], [k, s['in'], s['out'], FPS], [p('work', 'frames', s['id'], 'meta.json')], lambda: cut_frames(f, s['in'], d, p('work', 'frames', s['id']), 1920))
        if s.get('pip'):
            pk = s['pip'].get('src') or k; pf = srcfile(pk); pin = s['pip'].get('in', s['in'])
            once('p:' + s['id'], [pk, pin, d, FPS], [p('work', 'frames', s['id'] + '_pip', 'meta.json')], lambda: cut_frames(pf, pin, d, p('work', 'frames', s['id'] + '_pip'), 640))
        ap_ = p('work', 'audio', s['id'] + '.wav')
        if probe[k]['audio'] and s.get('sound', 'duck') != 'mute':
            once('a:' + s['id'], [k, s['in'], s['out']], [ap_], lambda: sh('ffmpeg', '-v', 'error', '-y', '-ss', '%.3f' % s['in'], '-t', '%.3f' % d, '-i', f, '-vn', '-ac', '2', '-ar', '48000', ap_))
            e['audio'] = {'file': 'work/audio/%s.wav' % s['id'], 'mode': s.get('sound', 'duck' if s.get('say') else 'keep')}
        elif s.get('sound') in ('keep', 'duck'): warn('%s: source %s has no audio track' % (s['id'], k))
    elif ty == 'freeze':
        k, _ = srcof(s); f = srcfile(k)
        once('s:' + s['id'], [k, s['t']], [p('work', 'stills', s['id'] + '.jpg')], lambda: cut_still(f, s['t'], p('work', 'stills', s['id'] + '.jpg')))
    elif ty == 'hook' and s.get('bg'):
        bk = s['bg'].get('src') or first_src; bf = srcfile(bk); bt = s['bg'].get('t', 0)
        once('b:' + s['id'], [bk, bt], [p('work', 'stills', s['id'] + '_bg.jpg')], lambda: cut_still(bf, bt, p('work', 'stills', s['id'] + '_bg.jpg'), 1920))
json.dump(state, open(state_path, 'w'))

# ── write
tl = {'fps': FPS, 'dur': DUR, 'aspect': spec.get('aspect', '16x9'), 'shots': tl_shots, 'cues': cues, 'music': spec.get('music', {})}
json.dump(tl, open(p('timeline.json'), 'w'), ensure_ascii=False, indent=1); json.dump([{'t0': c['t0'], 't1': c['t1'], 'text': c['text']} for c in cues], open(p('out', 'cues.json'), 'w'), ensure_ascii=False, indent=1)
if not os.path.exists(p('CREDITS')) or A.force:
    L_ = ['Footage (supplied by the film\'s maker, who is responsible for the right to use it; every clip is shown at its original speed, with the source named on screen):']
    for k, v in SRC.items():
        used = ['%s %s' % (s['id'], ('%.1f–%.1f s' % (s['in'], s['out'])) if s['type'] == 'clip' else ('frame at %.1f s' % s['t'])) for s in SHOTS if s['type'] in ('clip', 'freeze') and (s.get('src') or first_src) == k]
        L_.append('  - %s: %s | source: %s | licence / permission: %s | credit: %s | used: %s' % (k, v.get('title', '(title?)'), v.get('url') or v.get('file'), v.get('licence') or 'TODO: write the licence or the permission here', v.get('credit', ''), '; '.join(used)))
        if v.get('note'): L_.append('    note: ' + v['note'])
    L_ += ['Interpretation drawings (stamped "解读示意" on screen): drawn in code for this film; they are not part of the source material and show our reading of it',
           'Font: Noto Sans SC (SIL OFL 1.1, google/fonts; licence text in fonts/)',
           'Voice: Microsoft Edge neural voice %s via edge-tts (online service: check Microsoft\'s terms before commercial use)' % VNAME,
           'Music and sound effects: generated in code (tools/breakdown/mix.py, numpy); no samples',
           'Facts: FACTS.md']
    open(p('CREDITS'), 'w', encoding='utf8').write('\n'.join(L_) + '\n')
if not os.path.exists(p('FACTS.md')):
    rows = ['# Facts: every claim the narration and the screen make about the source', '', 'Fill the last two columns from the official source before delivery; delete rows that make no claim. Never state more than the footage shows.', '',
            '| shot | what the film says | source time | official source (URL or document) | checked |', '|---|---|---|---|---|']
    for s in SHOTS:
        if s.get('say'): rows.append('| %s | %s | %s |  |  |' % (s['id'], s['say'].replace('|', '/'), ('%.1f–%.1f s' % (s['in'], s['out'])) if s['type'] == 'clip' else ('%.1f s' % s['t']) if s['type'] == 'freeze' else s.get('basis', '')))
    open(p('FACTS.md'), 'w', encoding='utf8').write('\n'.join(rows) + '\n')
print('timeline: %d shots, %.1f s, %d subtitle cues; %d warning(s)' % (len(tl_shots), DUR, len(cues), len(warns)))
for s in tl_shots: print('  %-10s %-8s %6.1f - %6.1f  (%4.1f s)%s' % (s['id'], s['type'], s['t0'], s['t0'] + s['dur'], s['dur'], '  voice %.1f s' % s['voice']['dur'] if s.get('voice') else ''))
