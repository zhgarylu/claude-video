"""拉片 (shot-by-shot study report) of a video: shot table with 3 frames per shot, rhythm / loudness / colour strips, and a per-shot reading
(scale, angle, movement, composition, light, subject, what it says, how it is cut in) written by a vision model as a FIRST DRAFT for a person to correct.

  .venv/bin/python tools/teardown/lapian.py <video> [--dir <teardown dir>] [--lang zh|en|auto] [--no-vision] [--max-vision 120] [--workers 4] [--model ID]
  (or: teardown.py <video> --report)

Needs <dir>/teardown.json from teardown.py (it is made for you if --dir is absent). Writes into the same folder:
  report.html   open this: facts, charts, then every shot with its first / middle / last frame and the readings (click a frame to enlarge; filter by scale/movement)
  lapian.csv    the shot table (open in Excel)         lapian.md   the same as text         frames/NNN_{a,b,c}.jpg   the three frames of each shot
The vision reading needs an Ark key: env ARK_API_KEY, or ARK_KEY_FILE pointing at a file with a line 火山引擎key：<key>. Without it (or with --no-vision) the report still
has everything measured. The reading is a draft: the model is weaker than a person at cinematography. This is analysis: the report holds your own words and small
stills, never the video itself. Whether you may analyse a given film is yours to judge."""
import argparse, base64, concurrent.futures as cf, csv, html, io, json, os, re, subprocess, sys, urllib.request
import ssl
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser(); ap.add_argument('video'); ap.add_argument('--dir'); ap.add_argument('--lang', default='auto'); ap.add_argument('--no-vision', action='store_true')
ap.add_argument('--max-vision', type=int, default=120); ap.add_argument('--workers', type=int, default=4); ap.add_argument('--model', default=os.environ.get('LAPIAN_MODEL', 'doubao-seed-2-1-pro-260915'))
A = ap.parse_args(); HERE = os.path.dirname(os.path.abspath(__file__))
D = A.dir or os.path.splitext(A.video)[0] + '-teardown'
if not os.path.isfile(os.path.join(D, 'teardown.json')):
    subprocess.run([sys.executable, os.path.join(HERE, 'teardown.py'), A.video, '--out', D, '--lang', A.lang, '--no-ocr'], check=True)
T = json.load(open(os.path.join(D, 'teardown.json'), encoding='utf8')); facts, shots, speech = T['facts'], T['shots'], T.get('speech', [])
def run(*c, **k): return subprocess.run(c, capture_output=True, **k)
os.makedirs(os.path.join(D, 'frames'), exist_ok=True)

# ── 3 frames per shot (first / middle / last, a little inside the cut)
def grab(t, p):
    if not os.path.isfile(p): run('ffmpeg', '-v', 'error', '-y', '-ss', '%.3f' % max(t, 0), '-i', A.video, '-frames:v', '1', '-vf', 'scale=720:-2', '-q:v', '4', p)
for s in shots:
    L = s['len']; ts = [s['t0'] + min(.12, L * .15), (s['t0'] + s['t1']) / 2, s['t1'] - min(.12, L * .15) - .04]
    s['frames'] = []
    for k, t in zip('abc', ts):
        p = 'frames/%03d_%s.jpg' % (s['n'], k); grab(t, os.path.join(D, p)); s['frames'].append(p)
print(len(shots), 'shots,', len(shots) * 3, 'frames')

# ── colour strip (mean colour each 0.5 s) and loudness curve (dB each 0.5 s)
dur = facts['duration']; step = 0.5
raw = run('ffmpeg', '-v', 'error', '-i', A.video, '-vf', 'fps=%g,scale=1:1' % (1 / step), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-').stdout
strip = np.frombuffer(raw, np.uint8).reshape(-1, 3) if raw else np.zeros((1, 3), np.uint8)
db = []
if facts.get('audio'):
    pcm = run('ffmpeg', '-v', 'error', '-i', A.video, '-vn', '-ac', '1', '-ar', '8000', '-f', 'f32le', '-').stdout; x = np.frombuffer(pcm, np.float32); h = int(8000 * step)
    if len(x) >= h: e = np.sqrt((x[:len(x) // h * h].reshape(-1, h) ** 2).mean(1) + 1e-12); db = [max(-60.0, float(20 * np.log10(v + 1e-9))) for v in e]

# ── the vision reading
def ctx():
    try:
        import certifi; return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context(cafile='/etc/ssl/cert.pem') if os.path.exists('/etc/ssl/cert.pem') else ssl.create_default_context()
def key():
    k = os.environ.get('ARK_API_KEY')
    if k: return k.strip()
    f = os.environ.get('ARK_KEY_FILE') or os.path.expanduser('~/aiCode/lemo-opuscar/火山引擎key.txt')
    try: m = re.search(r'火山引擎\s*key\s*[:：]\s*([A-Za-z0-9_\-]{16,})', open(f, encoding='utf8').read(), re.I); return m.group(1) if m else None
    except OSError: return None
K = None if A.no_vision else key()
if not A.no_vision and not K: print('vision reading skipped: no Ark key (ARK_API_KEY or ARK_KEY_FILE)')
LANG = 'English' if (A.lang == 'en' or facts.get('audio', {}).get('language') == 'en') else '中文'
SYS = ('You are a film editor writing a shot-by-shot study (拉片) note. You see 3 frames of ONE shot (first, middle, last), sometimes the last frame of the previous shot, and what is said. '
       'Describe only what you can see; if you cannot tell, say "无法判断". Reply with JSON only, keys: '
       'scale (one of: 大远景, 远景, 全景, 中景, 中近景, 近景, 特写, 大特写, 无人物/画面图形), angle (平视, 俯拍, 仰拍, 斜角, 顶拍, 无法判断), '
       'movement (固定, 推, 拉, 摇, 移, 跟, 升降, 手持, 主体运动, 无法判断), composition (one short sentence: where the subject sits, symmetry/thirds/leading lines/negative space), '
       'light (one short sentence: direction, hard/soft, colour temperature, mood), subject (who/what is in frame, 8 words max), '
       'what (one sentence: what happens), function (one short sentence: what the shot does in the story or argument), cut_in (how it is cut in from the previous shot: 硬切, 叠化, 淡入, 匹配剪辑, 跳切, 动作剪辑, 声音先行, 无法判断). Write the values in ' + LANG + '.')
def img(p):
    im = Image.open(os.path.join(D, p)).convert('RGB'); im.thumbnail((640, 640)); b = io.BytesIO(); im.save(b, 'JPEG', quality=78)
    return {'type': 'image_url', 'image_url': {'url': 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()}}
def read_shot(i):
    s = shots[i]; c = [{'type': 'text', 'text': 'Shot %d, %.1f s. Said: %s' % (s['n'], s['len'], s.get('speech') or '(nothing)')}] + [img(p) for p in s['frames']]
    if i: c += [{'type': 'text', 'text': 'Last frame of the previous shot:'}, img(shots[i - 1]['frames'][2])]
    body = json.dumps({'model': A.model, 'messages': [{'role': 'system', 'content': SYS}, {'role': 'user', 'content': c}], 'max_tokens': 700, 'thinking': {'type': 'disabled'}}).encode()
    for attempt in range(3):
        try:
            r = urllib.request.Request('https://ark.cn-beijing.volces.com/api/v3/chat/completions', body, {'Authorization': 'Bearer ' + K, 'Content-Type': 'application/json'})
            d = json.load(urllib.request.urlopen(r, timeout=180, context=ctx())); txt = d['choices'][0]['message']['content']; m = re.search(r'\{.*\}', txt, re.S)
            return i, json.loads(m.group(0)), d.get('usage', {})
        except Exception as e: err = str(e)[:100]
    return i, {'error': err}, {}
tok = {'p': 0, 'c': 0}
if K and shots:
    pick = sorted(range(len(shots)), key=lambda i: -shots[i]['len'])[:A.max_vision]; pick.sort(); print('vision reading of', len(pick), 'shots with', A.model)
    with cf.ThreadPoolExecutor(A.workers) as ex:
        for n, (i, r, u) in enumerate(ex.map(read_shot, pick)):
            shots[i]['read'] = r; tok['p'] += u.get('prompt_tokens', 0); tok['c'] += u.get('completion_tokens', 0)
            if n % 10 == 9: print('  ', n + 1, '/', len(pick), flush=True)
    bad = sum(1 for s in shots if 'error' in s.get('read', {})); print('read', len(pick) - bad, 'ok,', bad, 'failed; tokens in/out', tok['p'], tok['c'])
json.dump({'facts': facts, 'shots': shots, 'speech': speech, 'vision_model': A.model if K else None, 'tokens': tok}, open(os.path.join(D, 'lapian.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)

# ── tables
FIELDS = [('scale', '景别'), ('angle', '角度'), ('movement', '运镜'), ('composition', '构图'), ('light', '光线'), ('subject', '主体'), ('what', '内容'), ('function', '作用'), ('cut_in', '转场')]
def g(s, k): return str(s.get('read', {}).get(k, '') or '')
with open(os.path.join(D, 'lapian.csv'), 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f); w.writerow(['#', '起', '止', '时长s', '测得运镜', '台词'] + [b for _, b in FIELDS] + ['主色'])
    for s in shots: w.writerow([s['n'], s['t0'], s['t1'], s['len'], s['camera'], s.get('speech', '')] + [g(s, k) for k, _ in FIELDS] + [' '.join(s['palette'][:3])])
from collections import Counter
cnt = lambda k: Counter(g(s, k) for s in shots if g(s, k)).most_common()
md = ['# 拉片：%s' % facts['file'], '', '%d 个镜头，平均 %.2f 秒，中位 %.2f 秒，每分钟 %.1f 次切。（读数为模型初稿，需人工校对）' % (facts['shots'], facts['mean_shot_s'], facts['median_shot_s'], facts['cuts_per_min']), '']
for k, b in FIELDS[:3]:
    if cnt(k): md.append('- %s：' % b + '，'.join('%s %d' % kv for kv in cnt(k)))
md += ['', '| # | 时间 | 景别 | 角度 | 运镜 | 内容 | 作用 | 转场 | 台词 |', '|---|---|---|---|---|---|---|---|---|']
for s in shots: md.append('| %d | %.1f–%.1f | %s | %s | %s | %s | %s | %s | %s |' % (s['n'], s['t0'], s['t1'], g(s, 'scale'), g(s, 'angle'), g(s, 'movement') or s['camera'], g(s, 'what').replace('|', '/'), g(s, 'function').replace('|', '/'), g(s, 'cut_in'), (s.get('speech') or '')[:60].replace('|', '/')))
open(os.path.join(D, 'lapian.md'), 'w', encoding='utf8').write('\n'.join(md) + '\n')

# ── the report page
E = html.escape
def svg_bars():
    Wd, Hd = 1100, 90; mx = max(s['len'] for s in shots) or 1; out = ['<svg viewBox="0 0 %d %d" class="chart">' % (Wd, Hd)]
    for s in shots:
        x = s['t0'] / dur * Wd; w = max(1.2, s['len'] / dur * Wd - 1); h = max(3, s['len'] / mx * (Hd - 14))
        out.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#c9a24a" data-n="%d"><title>#%d  %.1f s</title></rect>' % (x, Hd - h, w, h, s['n'], s['n'], s['len']))
    return ''.join(out) + '</svg>'
def svg_db():
    if not db: return '<p class="dim">没有音轨</p>'
    Wd, Hd = 1100, 70; pts = ' '.join('%.1f,%.1f' % (i * step / dur * Wd, Hd - (v + 60) / 60 * (Hd - 6) - 3) for i, v in enumerate(db))
    return '<svg viewBox="0 0 %d %d" class="chart"><polyline points="%s" fill="none" stroke="#7fb7a4" stroke-width="1.4"/></svg>' % (Wd, Hd, pts)
def color_strip():
    n = len(strip); im = Image.fromarray(strip.reshape(1, n, 3)).resize((1100, 28), Image.NEAREST); b = io.BytesIO(); im.save(b, 'PNG')
    return '<img class="strip" src="data:image/png;base64,%s" alt="色彩条">' % base64.b64encode(b.getvalue()).decode()
def dist(k, b):
    c = cnt(k)
    if not c: return ''
    tot = sum(v for _, v in c); return '<div class="dist"><b>%s</b>' % b + ''.join('<span style="flex:%d" title="%s %d">%s <i>%d</i></span>' % (v, E(n), v, E(n), v) for n, v in c) + '</div>'
rows = []
for s in shots:
    r = s.get('read', {}); tags = ''.join('<span class="tag">%s</span>' % E(g(s, k)) for k in ('scale', 'angle', 'movement', 'cut_in') if g(s, k))
    det = ''.join('<dt>%s</dt><dd>%s</dd>' % (b, E(g(s, k))) for k, b in FIELDS[3:] if g(s, k))
    err = '<p class="dim">读数失败：%s</p>' % E(r['error']) if 'error' in r else ('' if r else '<p class="dim">未做模型读数</p>')
    rows.append('<article class="shot" data-scale="%s" data-move="%s"><div class="fr">%s</div><div class="meta"><h3>#%d <small>%.1f–%.1f s · %.1f s · 测得：%s</small></h3><div>%s</div><dl>%s</dl>%s%s%s<div class="pal">%s</div></div></article>' % (
        E(g(s, 'scale')), E(g(s, 'movement') or s['camera']), ''.join('<img loading="lazy" src="%s" alt="">' % p for p in s['frames']), s['n'], s['t0'], s['t1'], s['len'], E(s['camera']), tags, det, err,
        '<p class="said">“%s”</p>' % E(s['speech']) if s.get('speech') else '', '', ''.join('<i style="background:%s"></i>' % c for c in s['palette'][:4])))
page = """<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>拉片：%(title)s</title>
<style>:root{--bg:#14161a;--fg:#e9e4d8;--dim:#8d8a80;--card:#1d2026;--ac:#c9a24a}@media(prefers-color-scheme:light){:root{--bg:#f6f3ea;--fg:#23221e;--dim:#77736a;--card:#fff;--ac:#9a741b}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 -apple-system,"PingFang SC",sans-serif}.wrap{max-width:1180px;margin:0 auto;padding:24px 16px 80px}h1{margin:0 0 4px}.dim{color:var(--dim)}
.kpis{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}.kpis div{background:var(--card);border-radius:10px;padding:8px 14px}.kpis b{font-size:20px;display:block}.chart{width:100%%;background:var(--card);border-radius:8px}.strip{width:100%%;height:28px;border-radius:6px;display:block}
.dist{display:flex;gap:2px;margin:6px 0;font-size:13px}.dist b{width:48px;color:var(--dim);font-weight:500}.dist span{background:var(--card);padding:3px 8px;border-radius:5px;overflow:hidden;white-space:nowrap;min-width:46px}.dist i{color:var(--ac);font-style:normal}
.bar{position:sticky;top:0;background:var(--bg);padding:8px 0;z-index:3;display:flex;gap:8px;flex-wrap:wrap;align-items:center}.bar select{background:var(--card);color:var(--fg);border:1px solid var(--dim);border-radius:6px;padding:4px 8px}
.shot{display:grid;grid-template-columns:minmax(300px,520px) 1fr;gap:14px;background:var(--card);border-radius:12px;padding:12px;margin:12px 0}.fr{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px}.fr img{width:100%%;border-radius:6px;cursor:zoom-in}
h3{margin:0 0 6px}h3 small{color:var(--dim);font-weight:400;font-size:12px}.tag{display:inline-block;background:var(--ac);color:#111;border-radius:5px;padding:1px 8px;margin:0 6px 4px 0;font-size:12px}dl{margin:6px 0;display:grid;grid-template-columns:44px 1fr;gap:2px 8px;font-size:13px}dt{color:var(--dim)}dd{margin:0}
.said{color:var(--dim);font-size:13px;margin:4px 0}.pal i{display:inline-block;width:22px;height:10px;border-radius:2px;margin-right:3px}#zoom{position:fixed;inset:0;background:#000d;display:none;place-items:center;z-index:9;cursor:zoom-out}#zoom img{max-width:96vw;max-height:94vh}
@media(max-width:760px){.shot{grid-template-columns:1fr}}</style><div class="wrap"><h1>拉片：%(title)s</h1><p class="dim">模型读数是初稿，需人工校对。本报告只含小尺寸截图和分析文字，不含原片。</p>
<div class="kpis">%(kpis)s</div><h4>镜头长度（横轴为时间，柱高为镜头时长）</h4>%(bars)s<h4>响度</h4>%(db)s<h4>色彩条（每 0.5 秒平均色）</h4>%(strip)s<h4>分布</h4>%(dist)s
<div class="bar"><b>筛选</b><select id="fs"><option value="">景别：全部</option>%(os)s</select><select id="fm"><option value="">运镜：全部</option>%(om)s</select><span class="dim" id="cn"></span></div>%(rows)s</div>
<div id="zoom"><img alt=""></div><script>const z=document.getElementById('zoom');document.querySelectorAll('.fr img').forEach(i=>i.onclick=()=>{z.firstChild.src=i.src;z.style.display='grid'});z.onclick=()=>z.style.display='none';
function f(){const s=fs.value,m=fm.value;let n=0;document.querySelectorAll('.shot').forEach(e=>{const ok=(!s||e.dataset.scale==s)&&(!m||e.dataset.move==m);e.style.display=ok?'':'none';n+=ok});cn.textContent=n+' 个镜头'}fs.onchange=fm.onchange=f;f()</script></html>"""
kp = [('%d' % facts['shots'], '镜头'), ('%.2f s' % facts['mean_shot_s'], '平均镜头长 ASL'), ('%.2f s' % facts['median_shot_s'], '中位'), ('%.1f' % facts['cuts_per_min'], '每分钟切'), ('%.0f s' % dur, '时长'), (facts['aspect'], '画幅')]
opt = lambda k: ''.join('<option>%s</option>' % E(n) for n, _ in cnt(k))
open(os.path.join(D, 'report.html'), 'w', encoding='utf8').write(page % {'title': E(facts['file']), 'kpis': ''.join('<div><b>%s</b>%s</div>' % kv for kv in kp), 'bars': svg_bars(), 'db': svg_db(), 'strip': color_strip(),
    'dist': dist('scale', '景别') + dist('angle', '角度') + dist('movement', '运镜') + dist('cut_in', '转场'), 'os': opt('scale'), 'om': opt('movement'), 'rows': '\n'.join(rows)})
print('→', os.path.join(D, 'report.html'))
