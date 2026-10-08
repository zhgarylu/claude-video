"""Prepare a demo-breakdown project: validate breakdown.json, make the voice, cut the footage into frames, compute the timeline.

  .venv/bin/python tools/breakdown/prep.py <project> [--no-voice] [--force]

Reads   <project>/breakdown.json                      the shot list (tools/breakdown/README.md has the schema)
Writes  work/voices/<shot>.wav, dur.json              narration (edge-tts, Yunxi by default) and its speech-to-text check
        work/frames/<shot>/NNNN.jpg + meta.json       every clip shot at the film's fps, original speed (and its picture-in-picture)
        work/stills/<shot>.jpg                        every freeze frame (full resolution, up to 2560 px wide)
        work/images/<source>.jpg|png                  every still-image source (article figures), decoded, EXIF-rotated, at most 4096 px on a side
        work/audio/<shot>.wav                         the source's own sound for each clip shot
        timeline.json                                 shot times, reveal times of every element, subtitle cues, voice and source-audio placement
        out/cues.json, CREDITS, FACTS.md              subtitles for srt.py; credits and a fact sheet skeleton (never overwritten)
        fonts/NotoSansSC.ttf                          fetched once (SIL OFL), or copied from another project of the library

The footage is the user's: the tool never downloads it (ingest.py --url does, only on request) and never refuses it; CREDITS records where it came from."""
import argparse, hashlib, json, math, os, re, shutil, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from imgprep import IMAGE_EXT, check_image, prepare_image

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
# spoken stage directions: the freeze, the box and the callout are the film's own effects; the voice never announces them
_DIR = r'(?:停在这里|停在这儿|再停一下|先停一下|停一下|暂停一下|先暂停|定格在这里|定格一下|画面停住|看这里|请看这里|注意看|大家看|你看这里|我们来看一下|接下来看|Pause here|Hold on|Let\'s pause|Look here|Notice here)'
DIRECTION_LEAD = re.compile(r'^\s*' + _DIR + r'\s*[：:，,。.！!、\-—]*\s*', re.I)
DIRECTION_ANY = re.compile(_DIR, re.I)
def strip_directions(t):
    out = t
    for _ in range(3):
        n = DIRECTION_LEAD.sub('', out, count=1)
        if n == out: break
        out = n
    return out
def sh(*c, **k): return subprocess.run(c, capture_output=True, text=True, **k)
def p(*a): return os.path.join(P, *a)
for d in ('work/voices', 'work/frames', 'work/stills', 'work/images', 'work/audio', 'out', 'fonts'): os.makedirs(p(*d.split('/')), exist_ok=True)

# ── validate
ids = set(); TYPES = {'hook', 'clip', 'freeze', 'explain', 'compare', 'figure', 'quote'}
is_image = lambda k: os.path.splitext(SRC[k].get('file', ''))[1].lower() in IMAGE_EXT + ('.svg',)
IMG_SRC = [k for k in SRC if is_image(k)]; VID_SRC = [k for k in SRC if not is_image(k)]; first_src = VID_SRC[0] if VID_SRC else None
for s in SHOTS:
    if s.get('type') not in TYPES: sys.exit('shot %r: type must be one of %s' % (s.get('id'), sorted(TYPES)))
    if not s.get('id') or not re.fullmatch(r'[A-Za-z0-9_-]+', s['id']) or s['id'] in ids: sys.exit('shot ids must be unique, letters/digits/-/_ only: %r' % s.get('id'))
    ids.add(s['id'])
    if s['type'] in ('clip', 'freeze') and not (s.get('src') or first_src): sys.exit('shot %s needs a video source: add "sources" to breakdown.json' % s['id'])
    if s['type'] in ('clip', 'freeze') and s.get('src') and s['src'] not in SRC: sys.exit('shot %s: no source named %r' % (s['id'], s['src']))
    if s['type'] in ('clip', 'freeze') and s.get('src') in IMG_SRC: sys.exit('shot %s: source %s is a still image: use a figure shot for it' % (s['id'], s['src']))
    if s['type'] == 'figure':
        k = s.get('src') or (IMG_SRC[0] if len(IMG_SRC) == 1 else None)
        if not k or k not in IMG_SRC: sys.exit('figure %s: "src" must name an image source (png / jpg / webp) from "sources"%s' % (s['id'], '' if IMG_SRC else ': there is none'))
        s['src'] = k
    if s['type'] == 'quote':
        if not str(s.get('text') or '').strip(): sys.exit('quote %s: "text" (the sentence from the article) is required' % s['id'])
        if len(s['text']) > 260: warn('%s: the quoted text is %d characters; a quote card reads best under about 120 (zh) / 220 (latin)' % (s['id'], len(s['text'])))
    if '"TODO' in json.dumps(s, ensure_ascii=False): sys.exit('shot %s still has a "TODO ..." placeholder: write it or delete it' % s['id'])
    if re.match(r'\s*TODO', str(s.get('say') or '')): sys.exit('shot %s: the narration is still a TODO placeholder: write it (or delete the shot)' % s['id'])
    for _k in ('say', 'speak'):                                                  # stage directions are the film's own plan, never narration
        if s.get(_k):
            _new = strip_directions(str(s[_k]))
            if _new != s[_k]: warn('%s: removed a spoken stage direction from %s (%r -> %r): the pause is shown by the picture, the narration says what it means' % (s['id'], _k, str(s[_k])[:24], _new[:24])); s[_k] = _new
            _m = DIRECTION_ANY.search(s[_k])
            if _m: warn('%s: the narration says %r: that announces the film\'s own layout (pause, look here, next); say what the picture shows instead' % (s['id'], _m.group(0)))
    for ref_k in ((s.get('bg') or {}).get('src'),):
        if ref_k and ref_k not in SRC: sys.exit('shot %s: bg names an unknown source %r' % (s['id'], ref_k))
    if s['type'] == 'clip' and not (s.get('out', 0) > s.get('in', 0) >= 0): sys.exit('clip %s: "in" and "out" (seconds in the source) are required, out > in' % s['id'])
    if s['type'] == 'freeze' and 't' not in s: sys.exit('freeze %s: "t" (seconds in the source) is required' % s['id'])
    if s['type'] == 'explain' and s.get('kind') == 'list' and len(s.get('items', [])) > (3 if not V else 4): warn('%s: a list of %d items does not fit the explain area at %s (at most %d)' % (s['id'], len(s['items']), '9:16' if V else '16:9', 4 if V else 3))
    if s['type'] == 'explain' and s.get('kind', 'flow') not in ('flow', 'list', 'beforeafter', 'number'): sys.exit('explain %s: kind is flow|list|beforeafter|number' % s['id'])
    if s['type'] in ('explain', 'compare') and not s.get('basis'): warn('%s: add "basis" (what in the source supports this drawing); it is printed under every interpretation' % s['id'])
# ── news digest (spec "preset": "news"): extra guard rails, printed as warnings, never a hard failure (BREAKDOWN.md section 9)
NEWS = spec.get('preset') == 'news'; NEWS_NOTES = []
def news_warn(m): NEWS_NOTES.append(m); warn('news: ' + m)
if NEWS:
    for k_ in ('news', 'sections'):
        if '"TODO' in json.dumps(spec.get(k_), ensure_ascii=False): sys.exit('"%s" in breakdown.json still has a "TODO ..." placeholder: write it (the source and the date go on screen)' % k_)
    NW = spec.get('news') or {}; NKEYS = {'id', 'type', 'kind', 'src', 'file', 'dir', 'side', 'pos', 'sound', 'layout', 'rect', 'at', 'from', 'to', 'crop', 'n'}
    def strings(o, key=''):
        if isinstance(o, str):
            if key not in NKEYS: yield o
        elif isinstance(o, dict):
            for k_, v_ in o.items(): yield from strings(v_, k_)
        elif isinstance(o, list):
            for v_ in o: yield from strings(v_, key)
    hooks = [s for s in SHOTS if s['type'] == 'hook']
    DATE_RE = r'\d{4}\s*[./\-年]\s*\d{1,2}|\d{1,2}\s*[./\-月]\s*\d{1,2}\s*日?|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}'
    if not hooks: news_warn('there is no hook shot, so the source and the date are not on screen')
    else:
        metas = [m_ for hk in hooks for m_ in (hk.get('meta') or [])]
        if not re.search(DATE_RE, ' '.join(metas), re.I): news_warn('the hook has no publication date chip in "meta" (for example "2026.10.06 发布"): the viewer must see when the source was published')
        if not any(re.search(r'来源|出自|发布方|官方|source|official|via|from|by ', m_, re.I) for m_ in metas): news_warn('the hook has no source chip in "meta" (for example "来源：某公司发布页"): name the source on screen')
        if not hooks[0].get('kicker'): news_warn('the hook has no "kicker" (company and product name)')
    if not NW.get('published'): news_warn('"news.published" (the publication date of the source) is missing')
    if not (NW.get('title') or NW.get('url')): news_warn('"news.title" / "news.url" (what the source is) is missing')
    if not NW.get('claims'): news_warn('"news.claims" is empty: list the official claims the film is allowed to repeat, and check FACTS.md against them')
    if not 2 <= len(spec.get('sections') or []) <= 4: news_warn('a news digest has 2-4 key points ("sections"), this one has %d' % len(spec.get('sections') or []))
    for s in SHOTS:
        if s['type'] in ('explain', 'compare') and not s.get('basis'): news_warn('%s: no "basis" line: every explain and conclusion shot names what in the source supports it (printed as 依据：…)' % s['id'])
        if s.get('verified') and s['type'] in ('clip', 'freeze') and '官方' in (s.get('tag') or spec.get('tag') or '') + '': news_warn('%s: marked verified but its tag still says it is the official demo: give it its own "tag" (for example 我们的实测)' % s['id'])
    NOT_OURS = r'(不是|并非|非|并不是)[^，。；,.;]{0,8}(实测|测试|评测)|not\s+(an?\s+|our\s+)?(own\s+|independent\s+)?(test|measurement|benchmark|review)|(reading|read) of (an?|the) official'
    say_all = ' '.join(str(s.get('say') or '') + ' ' + str(s.get('verdict') or '') for s in SHOTS)
    if not any(s.get('verified') for s in SHOTS) and not re.search(NOT_OURS, say_all, re.I): news_warn('no narration line says this is a reading of an official demo and not our own test (for example "这是官方演示解读，不是我们的实测"), and no key point is marked "verified": true')
    cmps = [s for s in SHOTS if s['type'] == 'compare']
    if not any(len(s.get('cols') or [c_ for c_ in (s.get('left'), s.get('right')) if c_]) >= 2 for s in cmps): news_warn('the conclusion has no claims split: a compare shot with two columns, what the source says / what is still to verify')
    elif not any(s.get('verdict') for s in cmps): news_warn('the conclusion has no "verdict" (the one action line the viewer can take away)')
    HYPE = r'颠覆|革命性|史诗|碾压|吊打|炸裂|王炸|史无前例|划时代|秒杀|遥遥领先|重磅|震撼|惊艳|完爆|无敌|天花板|吊炸天|yyds|revolutionary|game[- ]?chang|groundbreaking|jaw[- ]?dropping|mind[- ]?blowing|insane|unprecedented|best ever|crush(es|ed|ing)? |blazing'
    for s in SHOTS:
        m_ = re.search(HYPE, ' '.join(strings(s)), re.I)
        if m_: news_warn('%s: hype word "%s": say what the source shows, not how impressive it is' % (s['id'], m_.group(0).strip()))
    for k_, v_ in SRC.items():
        if not is_image(k_) and not (v_.get('credit') or v_.get('url')): news_warn('source %s has no "credit" or "url": the source is credited on screen and in CREDITS, and the licence or permission is the maker\'s to fill in' % k_)
def srcof(s):
    k = s.get('src') or first_src; return k, SRC[k]
def srcfile(k): return p(SRC[k]['file']) if not os.path.isabs(SRC[k]['file']) else SRC[k]['file']
probe = {}
for k, v in SRC.items():
    f = srcfile(k)
    if not os.path.exists(f): sys.exit('source %s: file not found: %s' % (k, f))
    if k in IMG_SRC:
        try: im_ = check_image(f)
        except ValueError as e: sys.exit('image source %s (%s): %s' % (k, v['file'], e))
        probe[k] = {'w': im_['w'], 'h': im_['h'], 'dur': 0, 'audio': False, 'image': True, 'alpha': im_['alpha']}; continue
    j = json.loads(sh('ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', f).stdout)
    vs = next(x for x in j['streams'] if x['codec_type'] == 'video'); probe[k] = {'w': int(vs['width']), 'h': int(vs['height']), 'dur': float(j['format']['duration']), 'audio': any(x['codec_type'] == 'audio' for x in j['streams'])}
for s in SHOTS:
    if s['type'] in ('clip', 'freeze'):
        k, _ = srcof(s); end = s.get('out', s.get('t', 0))
        if end > probe[k]['dur'] + .05: sys.exit('shot %s asks for %.1f s but source %s is %.1f s long' % (s['id'], end, k, probe[k]['dur']))

# ── still images (article figures): decoded, rotated, downscaled to at most 4096 px; the page loads these
for k in IMG_SRC:
    out = None
    for e_ in ('.jpg', '.png'):
        c_ = p('work', 'images', k + e_)
        if os.path.exists(c_) and os.path.getmtime(c_) >= os.path.getmtime(srcfile(k)) and os.path.exists(p('work', 'images', k + '.json')): out = c_
    if out: m_ = json.load(open(p('work', 'images', k + '.json')))
    else:
        try: m_ = prepare_image(srcfile(k), p('work', 'images'), k)
        except ValueError as e: sys.exit('image source %s: %s' % (k, e))
        json.dump(m_, open(p('work', 'images', k + '.json'), 'w'))
    probe[k].update(alpha_out=m_['alpha'], ow=m_['ow'], oh=m_['oh'], w=m_['w'], h=m_['h'])
for s in SHOTS:
    if s['type'] == 'figure' and s.get('crop'):
        c_ = s['crop']; pk = probe[s['src']]; shown = 1100 / max(1e-3, c_[2] * pk['ow'])
        if shown > 2.5: warn('%s: the crop shows only %d px of the original %s across a ~1100 px wide area (%.1fx): it will look soft' % (s['id'], c_[2] * pk['ow'], s['src'], shown))
    if s['type'] == 'figure':
        cap_ = s.get('caption') or (SRC.get(s['src']) or {}).get('caption') or ''; cred_ = (SRC.get(s['src']) or {}).get('credit') or s.get('credit') or ''
        est = lambda t: sum(32 if re.match(r'[\u3000-\u9fff\uff00-\uffef]', ch) else 17 for ch in t)
        if cap_ and est('图源：' + cred_) + est(cap_) > 1040: warn('%s: credit and caption together are about %d px wide; the plate under a figure is 1000-1160 px, so the caption will be shortened with "…": shorten it' % (s['id'], est('图源：' + cred_) + est(cap_)))
    if s['type'] == 'figure' and not (s.get('card') or s.get('markers') or s.get('boxes') or s.get('crop')): warn('%s: a figure with no box, marker, card or crop is only shown, not explained' % s['id'])

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
    tts = 'tts_volc.py' if os.environ.get('BREAKDOWN_TTS') == 'volc' else 'tts_zh.py'      # web build: BREAKDOWN_TTS=volc uses the Doubao voice of the job (same lines.json format)
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
        r = subprocess.run([PY, os.path.join(LIB, 'core', 'tts', 'asr_check.py'), p('work', 'lines.json'), p('work', 'voices'), '--lang', os.environ.get('BREAKDOWN_ASR_LANG') or (LANG if LANG in ('zh', 'en') else 'auto'), '--model', A.model] + (['--threshold', os.environ['BREAKDOWN_ASR_THRESHOLD']] if os.environ.get('BREAKDOWN_ASR_THRESHOLD') else []))
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
    elif ty in ('freeze', 'figure'):
        for i, b in enumerate(s.get('boxes', [])): items.append(('box:%d' % i, [b.get('label', '')]))
        for i, a in enumerate(s.get('arrows', [])): items.append(('arrow:%d' % i, [a.get('label', '')]))
        for i, m in enumerate(s.get('markers', [])): items.append(('mark:%d' % i, [m.get('text', '')]))
        if s.get('card'): items.append(('card', [s['card'].get('title', ''), s['card'].get('body', '')]))
    elif ty == 'quote':
        fixed['text'] = (.15, [s['text']])
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
LEAD = {'hook': .6, 'clip': .4, 'freeze': .5, 'explain': .6, 'compare': .6, 'figure': .6, 'quote': .8}; TAIL = .7; MINDUR = {'hook': 4.2, 'freeze': 3.6, 'explain': 4.5, 'compare': 5.0, 'figure': 5.0, 'quote': 5.0}
def tag_text(s, ty):
    if ty in ('clip', 'freeze'): return s.get('tag') or spec.get('tag') or '官方演示 · 节选'
    if ty in ('explain', 'compare'): return '解读示意 · 非官方画面'
    if ty in ('figure', 'quote'): return s.get('tag') or lab_[ty]
    return spec.get('series', '实录解读')
LAB = {'zh': {'figure': '原文配图', 'quote': '原文摘录', 'credit': '图源：', 'from': '出自：', 'unknown': '未注明'}, 'en': {'figure': 'Figure from the article', 'quote': 'Quote from the article', 'credit': 'Source: ', 'from': 'From: ', 'unknown': 'not stated'}}
lab_ = {**LAB['zh' if LANG in ('zh', 'yue', 'ja') else 'en'], **(spec.get('labels') or {})}
ART = spec.get('article') or {}
def credit_of(s):
    src = SRC.get(s.get('src')) or {}; return lab_['credit'] + (s.get('credit') or src.get('credit') or src.get('title') or lab_['unknown'])
def attr_of(s):
    by = s.get('by') or ' \u00B7 '.join(x for x in (ART.get('title'), ART.get('site'), ART.get('author'), ART.get('date')) if x); return (lab_['from'] + by) if by else ''
# narration timing for highlighted words of a quote (see align.py)
sys.path.insert(0, HERE)
from align import char_times, time_of

seen_chrome = set(); tl_shots = []; t_cursor = 0.0
for n, s in enumerate(SHOTS):
    ty = s['type']; vdur = vd.get(s['id'], 0.0) if s.get('say') else 0.0
    lead = s.get('say_at', LEAD[ty]); vend = lead + vdur
    fixed, items = texts_and_items(s); sched = {}; need = []   # need: (reveal time, text)
    # chrome texts: only the first appearance of each distinct text is read (readcheck ignores later runs)
    ctag = ('tag', tag_text(s, ty))
    chrome = [ctag]
    if ty in ('explain', 'compare'): chrome += [('stamp', '解读示意')]
    if s.get('section'): chrome += [('prog', ' '.join(['%02d' % s['section'], (spec.get('sections') or [''])[s['section'] - 1]]))]
    for key, text in chrome:
        if (key, text) not in seen_chrome: seen_chrome.add((key, text)); need.append((0.0, text))
    if s.get('basis') and ty in ('explain', 'compare'): need.append((0.0, '依据：' + s['basis']))
    if ty == 'figure':
        need.append((0.0, credit_of(s)))
        if s.get('caption') or (SRC.get(s['src']) or {}).get('caption'): need.append((0.0, s.get('caption') or SRC[s['src']]['caption']))
    if ty == 'quote' and attr_of(s): need.append((0.0, attr_of(s)))
    for key, (t, ts) in fixed.items(): sched[key] = round(t, 2); need += [(t, x) for x in ts if x]
    if ty in ('freeze', 'figure'):
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
    if ty == 'quote':          # highlighted words: swept in when the narration says them (estimated from the voice file's pauses; see align.py)
        marks = []; anchors = []          # a mark is a phrase of the quote ("text"); in a translated film it may carry "at": the phrase of the NARRATION that says it
        for m in s.get('marks', []):
            mt = m.get('text') if isinstance(m, dict) else m; at = (m.get('at') if isinstance(m, dict) else None) or mt
            if mt and (mt in s['text'] or mt.lower() in s['text'].lower()): marks.append(mt); anchors.append(at)
            elif mt: warn('%s: highlighted phrase %r is not in the quoted text' % (s['id'], mt))
        wav = p('work', 'voices', s['id'] + '.wav'); say_ = s.get('say') or ''; tt = None
        if marks and vdur and os.path.exists(wav) and say_:
            spoken = s.get('speak') or say_
            try: tt = char_times(spoken, wav)
            except Exception as ex: warn('%s: could not time the highlights from the voice (%s); they are spread evenly' % (s['id'], type(ex).__name__))
        prev_t = lead
        for i, m in enumerate(marks):
            t = time_of(say_, tt, anchors[i], (len(s.get('speak') or say_) / max(1, len(say_)))) if tt is not None else None
            if t is None: t = prev_t + (max(vdur, 3.0) * .8) / max(1, len(marks)) * (1 if i else .3)
            else: t = lead + t - .05
            t = max(t, .9, prev_t + .35 if i else .9); sched['hl:%d' % i] = round(t, 2); prev_t = t
        s['_marks_used'] = marks
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
    if ty == 'figure':
        e['src'] = s['src']; e['img'] = {'file': 'work/images/%s.%s' % (s['src'], 'png' if probe[s['src']].get('alpha_out') else 'jpg'), 'w': probe[s['src']]['w'], 'h': probe[s['src']]['h'], 'alpha': bool(probe[s['src']].get('alpha_out'))}
    if ty == 'quote' and s.get('_marks_used') is not None: e['marks'] = s['_marks_used']
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
def hide_sub(s):      # a quote card that is read aloud shows the sentence itself: the burned-in subtitle would only repeat it (the .srt keeps the cue)
    flat = lambda t: re.sub(r'[\s，。；：！？、,.;:!?“”"\'’‘]+', '', t or '').lower()
    return s['type'] == 'quote' and (s.get('nosub') or flat(s.get('say')) == flat(s.get('text')))
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
            d = e['voice']['dur'] * wi / tot; cues.append({'t0': round(c0, 3), 't1': round(c0 + d, 3), 'text': x, **({'hide': True} if hide_sub(s) else {})}); c0 += d
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
    elif ty == 'hook' and s.get('bg') and (s['bg'].get('src') in IMG_SRC):
        bk = s['bg']['src']; ip_ = p('work', 'images', bk + ('.png' if probe[bk].get('alpha_out') else '.jpg'))
        def mk_bg(ip_=ip_, bid=s['id']):
            from PIL import Image
            im_ = Image.open(ip_).convert('RGB'); k_ = min(1, 1920 / max(im_.size)); im_ = im_.resize((round(im_.size[0] * k_), round(im_.size[1] * k_)), Image.LANCZOS); im_.save(p('work', 'stills', bid + '_bg.jpg'), quality=88)
        once('b:' + s['id'], [bk, 'img'], [p('work', 'stills', s['id'] + '_bg.jpg')], mk_bg)
    elif ty == 'hook' and s.get('bg'):
        bk = s['bg'].get('src') or first_src; bf = srcfile(bk); bt = s['bg'].get('t', 0)
        once('b:' + s['id'], [bk, bt], [p('work', 'stills', s['id'] + '_bg.jpg')], lambda: cut_still(bf, bt, p('work', 'stills', s['id'] + '_bg.jpg'), 1920))
json.dump(state, open(state_path, 'w'))

# ── write
tl = {'fps': FPS, 'dur': DUR, 'aspect': spec.get('aspect', '16x9'), 'shots': tl_shots, 'cues': cues, 'music': spec.get('music', {})}
json.dump(tl, open(p('timeline.json'), 'w'), ensure_ascii=False, indent=1); json.dump([{'t0': c['t0'], 't1': c['t1'], 'text': c['text']} for c in cues], open(p('out', 'cues.json'), 'w'), ensure_ascii=False, indent=1)
if not os.path.exists(p('CREDITS')) or A.force:
    L_ = []
    if VID_SRC:
        L_.append('Footage (supplied by the film\'s maker, who is responsible for the right to use it; every clip is shown at its original speed, with the source named on screen):')
        for k in VID_SRC:
            v = SRC[k]; used = ['%s %s' % (s['id'], ('%.1f–%.1f s' % (s['in'], s['out'])) if s['type'] == 'clip' else ('frame at %.1f s' % s['t'])) for s in SHOTS if s['type'] in ('clip', 'freeze') and (s.get('src') or first_src) == k]
            L_.append('  - %s: %s | source: %s | licence / permission: %s | credit: %s | used: %s' % (k, v.get('title', '(title?)'), v.get('url') or v.get('file'), v.get('licence') or 'TODO: write the licence or the permission here', v.get('credit', ''), '; '.join(used)))
            if v.get('note'): L_.append('    note: ' + v['note'])
    if ART or IMG_SRC or any(s['type'] == 'quote' for s in SHOTS):
        L_.append('Article (its text is quoted or paraphrased in the narration and on quote cards; supplied by the film\'s maker, who is responsible for the right to use it and must keep the credit on screen):')
        L_.append('  - %s | site: %s | author: %s | date: %s | source: %s | licence / permission: %s' % (ART.get('title') or '(title?)', ART.get('site') or '', ART.get('author') or '', ART.get('date') or '', ART.get('url') or '(no URL given)', ART.get('licence') or 'TODO: write the licence or the permission here'))
        if ART.get('note'): L_.append('    note: ' + ART['note'])
        qs = [s['id'] for s in SHOTS if s['type'] == 'quote']
        if qs: L_.append('    quoted on screen in: ' + ', '.join(qs))
    if IMG_SRC:
        L_.append('Pictures from the article (shown zoomed and annotated; the source is on screen as long as each picture is):')
        for k in IMG_SRC:
            v = SRC[k]; used = [s['id'] for s in SHOTS if s['type'] == 'figure' and s['src'] == k] + [s['id'] + ' (background)' for s in SHOTS if s['type'] == 'hook' and (s.get('bg') or {}).get('src') == k]
            L_.append('  - %s: %s | source: %s | licence / permission: %s | credit: %s | used: %s' % (k, v.get('title') or v.get('caption') or v.get('alt') or '(title?)', v.get('url') or v.get('file'), v.get('licence') or ART.get('licence') or 'TODO: write the licence or the permission here', v.get('credit') or '(none given)', '; '.join(used) or '(not used)'))
        L_.append('  Rights: the pictures and the article text are not covered by this library\'s licences; the film is the maker\'s, with the article\'s material in it. Check every TODO above before publishing.')
    if NEWS:
        nw_ = spec.get('news') or {}
        L_.append('News digest: the film reads %s%s, published %s. The claims are the source\'s, repeated as such; nothing in the film is our own measurement unless a shot says so. The source is credited on screen (hook) and here.' % (nw_.get('title') or 'the source', (' (' + nw_['url'] + ')') if nw_.get('url') else '', nw_.get('published') or '(date?)'))
    L_ += ['Interpretation drawings (stamped "解读示意" on screen): drawn in code for this film; they are not part of the source material and show our reading of it',
           'Font: Noto Sans SC (SIL OFL 1.1, google/fonts; licence text in fonts/)',
           ('Voice: Doubao speech synthesis (Volcengine), voice %s' % VNAME) if os.environ.get('BREAKDOWN_TTS') == 'volc' else 'Voice: Microsoft Edge neural voice %s via edge-tts (online service: check Microsoft\'s terms before commercial use)' % VNAME,
           ('Music: %s | source: %s | licence: %s (the sound effects are generated in code, tools/breakdown/mix.py)' % (' - '.join(x for x in ((spec.get('music') or {}).get('title'), (spec.get('music') or {}).get('artist')) if x) or (spec.get('music') or {}).get('file'), (spec.get('music') or {}).get('source') or (spec.get('music') or {}).get('url') or 'TODO: source URL', (spec.get('music') or {}).get('licence') or 'TODO: licence name')) if (spec.get('music') or {}).get('file') else 'Music and sound effects: generated in code (tools/breakdown/mix.py, numpy); no samples',
           'Facts: FACTS.md']
    open(p('CREDITS'), 'w', encoding='utf8').write('\n'.join(L_) + '\n')
if not os.path.exists(p('FACTS.md')):
    rows = ['# Facts: every claim the narration and the screen make about the source', '', 'Fill the last two columns from the official source before delivery; delete rows that make no claim. Never state more than the footage shows.', '',
            '| shot | what the film says | source time | official source (URL or document) | checked |', '|---|---|---|---|---|']
    if NEWS:
        nw_ = spec.get('news') or {}
        rows[2:2] = ['News digest: for every row say whose claim it is: **official** (the source says it: quote it exactly, with its page), **on screen** (the frame shows it: give the time), or **ours** (a reading, or something we tested: say how). Numbers are exactly as the source gives them; estimates are marked. An official claim is never presented as our measurement.', '',
                     'Source: %s | %s | published %s' % (nw_.get('title', ''), nw_.get('url', ''), nw_.get('published', '')), 'Official claims the film may repeat (news.claims): ' + ('; '.join(str(c_) for c_ in nw_.get('claims', [])) or '(none listed)'), '']
    for s in SHOTS:
        if s.get('say'): rows.append('| %s | %s | %s |  |  |' % (s['id'], s['say'].replace('|', '/'), ('%.1f–%.1f s' % (s['in'], s['out'])) if s['type'] == 'clip' else ('%.1f s' % s['t']) if s['type'] == 'freeze' else ('figure %s (%s)' % (s['src'], (SRC[s['src']].get('caption') or SRC[s['src']].get('title') or '').replace('|', '/')[:60])) if s['type'] == 'figure' else ('quote %s: %s' % (s.get('ref', ''), s['text'][:50].replace('|', '/'))) if s['type'] == 'quote' else s.get('basis', '')))
    open(p('FACTS.md'), 'w', encoding='utf8').write('\n'.join(rows) + '\n')
if ART or IMG_SRC:
    print('RIGHTS: the article text and its pictures are used on your responsibility (the owner\'s licence or permission, platform terms, fair use where you publish). CREDITS lists each source; fill in every TODO. The credit stays on screen with each figure.')
if NEWS:
    nw_ = spec.get('news') or {}; lines_ = ['News digest check for %s' % (spec.get('title') or os.path.basename(P)), 'Source: %s | %s | published %s' % (nw_.get('title', ''), nw_.get('url', ''), nw_.get('published', '')), '']
    lines_ += ['  - ' + m for m in NEWS_NOTES] if NEWS_NOTES else ['  (no warnings from the automatic rules)']
    lines_ += ['', 'Before publishing, check by hand: the source link opens and is the page you used; the publication date is right; every official claim in the film is in news.claims or on a source frame;', 'numbers are exactly as the source gives them (estimates marked); nothing the source did not say; what remains unverified is said aloud; the source is credited on screen and in CREDITS; the rights note went to the user.']
    open(p('out', 'news-check.txt'), 'w', encoding='utf8').write('\n'.join(lines_) + '\n')
    print('NEWS DIGEST: %d point(s) to settle before publishing (also in out/news-check.txt)' % len(NEWS_NOTES))
print('timeline: %d shots, %.1f s, %d subtitle cues; %d warning(s)' % (len(tl_shots), DUR, len(cues), len(warns)))
for s in tl_shots: print('  %-10s %-8s %6.1f - %6.1f  (%4.1f s)%s' % (s['id'], s['type'], s['t0'], s['t0'] + s['dur'], s['dur'], '  voice %.1f s' % s['voice']['dur'] if s.get('voice') else ''))
