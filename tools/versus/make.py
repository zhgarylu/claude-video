#!/usr/bin/env python3
"""One command from two product photos to a Versus Screen film, plus a fact-check sheet.

  .venv/bin/python tools/versus/make.py <name> --a a.jpg --b b.jpg --name-a "黑壶" --name-b "皮套壶" \\
      --price-a 49 --price-b 59 --noun 手冲壶 \\
      --round "手柄|裸金属|皮革包裹|B|photo" --round "容量|350|500|high|listing|商品页第 2 屏|ml" [--build]

Round = name|A|B|rule|basis[|source[|unit]]   (or --rounds-file rounds.csv with the same columns, one round per line)
  numbers  A and B are numbers, rule is low (lower wins) or high (higher wins); unit: ¥ $ € ￥ go in front, anything else (ml, g) after
  words    A and B are words, rule is A or B (who is better); the judgement is yours and shows in the fact sheet
  basis    user (the user gave it) | listing (the product page says so) | photo (judged from the picture, the film says "不是实测") | measured
           every round except photo needs a source; a missing source stops the build, not the film
2-4 rounds. A price round is added first when --price-a and --price-b are given.
Writes films/<name>/ (page, data.json, assets/, build.sh) and films/<name>/facts.md. --build also runs build.sh.
Cut-outs: Apple Vision (macOS 14+) via tools/matte/person.swift; elsewhere a flat light background is keyed out, and a PNG with alpha is used as is.
Texts are Chinese; override any of them with --text key=value (select, sub, ask, chip1, chip2)."""
import argparse, csv, json, math, os, shutil, subprocess, sys, tempfile
from PIL import Image, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERE = os.path.dirname(os.path.abspath(__file__))
BASIS = {'user': '用户提供', 'listing': '商品页', 'photo': '按图判断', 'measured': '实测'}
ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('name'); ap.add_argument('--a', required=True); ap.add_argument('--b', required=True)
ap.add_argument('--name-a', required=True); ap.add_argument('--name-b', required=True)
ap.add_argument('--cls-a', default=''); ap.add_argument('--cls-b', default='')
ap.add_argument('--price-a', type=float); ap.add_argument('--price-b', type=float); ap.add_argument('--price-source', default='用户提供')
ap.add_argument('--spec-a'); ap.add_argument('--spec-b'); ap.add_argument('--noun', default='商品')
ap.add_argument('--flip-a', action='store_true', help='the photo points right: mirror it (the film wants the spout / front to the left)')
ap.add_argument('--flip-b', action='store_true')
ap.add_argument('--round', action='append', default=[]); ap.add_argument('--rounds-file')
ap.add_argument('--text', action='append', default=[]); ap.add_argument('--build', action='store_true'); ap.add_argument('--force', action='store_true')
O = ap.parse_args()
die = lambda m: sys.exit('versus: ' + m)
OUT = os.path.join(ROOT, 'films', O.name)
if os.path.exists(OUT) and not O.force: die(f'{OUT} exists (--force to overwrite the page files)')

# ---- cut-outs
def cutout(src, dst, flip):
    im = Image.open(src).convert('RGBA')
    has_alpha = im.getchannel('A').getextrema()[0] < 250
    if not has_alpha:
        mask = None
        if sys.platform == 'darwin' and shutil.which('swiftc'):
            bn = os.path.join(os.environ.get('XDG_CACHE_HOME', os.path.expanduser('~/.cache')), 'lemo-opuscar', 'person'); os.makedirs(os.path.dirname(bn), exist_ok=True)
            sw = os.path.join(ROOT, 'tools/matte/person.swift')
            if not os.path.exists(bn) or os.path.getmtime(bn) < os.path.getmtime(sw): subprocess.run(['swiftc', '-O', sw, '-o', bn], check=True)
            with tempfile.TemporaryDirectory() as t:
                i, o = os.path.join(t, 'i'), os.path.join(t, 'o'); os.makedirs(i); im.convert('RGB').save(os.path.join(i, 'x.png'))
                r = subprocess.run([bn, i, o, '--instances', '--scale', '1'], capture_output=True, text=True)
                p = os.path.join(o, 'x.png')
                if os.path.exists(p): mask = Image.open(p).convert('RGBA').getchannel('A')
                else: print('versus: Vision gave no mask for', src, '- falling back to a background key', r.stderr[-200:])
        if mask is None:
            rgb = im.convert('RGB'); w, h = rgb.size; cs = [rgb.getpixel(p) for p in ((2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3))]
            bg = tuple(sorted(c[k] for c in cs)[1] for k in range(3))
            mask = Image.new('L', (w, h), 255); px = rgb.load(); mp = mask.load()
            for y in range(h):
                for x in range(w):
                    d = math.dist(px[x, y], bg); mp[x, y] = 0 if d < 28 else (255 if d > 60 else int((d - 28) / 32 * 255))
            print('versus: key-out by background colour for', src, '(check the cut-out; a busy background needs macOS Vision or a PNG with alpha)')
        mask = mask.filter(ImageFilter.GaussianBlur(.8)); im.putalpha(mask)
    bb = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    if not bb or (bb[2] - bb[0]) * (bb[3] - bb[1]) < 0.02 * im.width * im.height: die(f'no usable foreground found in {src}')
    pad = 6; im = im.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad)))
    if im.height > 900: im = im.resize((round(im.width * 900 / im.height), 900), Image.LANCZOS)
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im.save(dst)
    return im.size

# ---- rounds
def nice(v):
    if v <= 0: return 1
    e = 10 ** math.floor(math.log10(v)); 
    for m in (1, 2, 2.5, 5, 10):
        if m * e >= v: return m * e
def num(s):
    try: return float(s)
    except ValueError: return None
def fmtv(prefix, suffix, v): return prefix + (str(int(v)) if float(v).is_integer() else f'{v:g}') + suffix
rows = []
if O.price_a is not None and O.price_b is not None: rows.append(['价格', str(O.price_a), str(O.price_b), 'low', 'user', O.price_source, '¥'])
if (O.price_a is None) != (O.price_b is None): die('give both --price-a and --price-b')
for line in O.round: rows.append([c.strip() for c in line.split('|')])
if O.rounds_file:
    for r in csv.reader(open(O.rounds_file, encoding='utf8')):
        if r and r[0].strip() and r[0].strip() not in ('name', '名称'): rows.append([c.strip() for c in r])
if not 2 <= len(rows) <= 4: die(f'need 2-4 rounds, got {len(rows)}')
rounds = []; facts = []
for r in rows:
    r += [''] * (7 - len(r)); name, a, b, rule, basis, source, unit = r[:7]
    if basis not in BASIS: die(f'round {name}: basis must be one of {"/".join(BASIS)}')
    if basis != 'photo' and not source: die(f'round {name}: basis {basis} needs a source (where does the number come from?)')
    an, bn = num(a), num(b); d = {'name': name, 'basis': basis, 'source': source}
    if an is not None and bn is not None:
        if rule not in ('low', 'high'): die(f'round {name}: numbers need rule low or high')
        pre = unit if unit in ('¥', '$', '€', '￥') else ''; suf = '' if pre else unit
        mx = nice(max(an, bn) * 1.15)
        d.update(low=rule == 'low', a=an, b=bn, max=mx, prefix=pre, suffix=suf, scale=[fmtv(pre, suf, 0), fmtv(pre, suf, mx)], rule='越低越赢' if rule == 'low' else '越高越赢')
        if an == bn: die(f'round {name}: a tie has no winner in this style; drop the round or pick another measure')
        better = 'A' if (an < bn) == (rule == 'low') else 'B'
        d['diff'] = ('便宜 ' if rule == 'low' else '多 ') + fmtv(pre, suf, 1).replace('1', '{d}')
        if name == '价格' and rule == 'low': d['diff'] = '便宜 ' + fmtv(pre, suf, 1).replace('1', '{d}')
        shown = (fmtv(pre, suf, an), fmtv(pre, suf, bn))
    else:
        if rule not in ('A', 'B'): die(f'round {name}: words need rule A or B (who is better)')
        if a == b: die(f'round {name}: both sides say the same thing')
        worse, better_l = (b, a) if rule == 'A' else (a, b)
        d.update(low=False, labels=[worse, better_l], a=1 if rule == 'A' else 0, b=0 if rule == 'A' else 1, max=1, scale=[worse, better_l], rule='更好者赢', diff='更胜一筹')
        better = rule; shown = (a, b)
    d['cap'] = {'user': f'{name} · 来源：{source}', 'listing': f'{name} · 来源：{source}', 'measured': f'{name} · 实测：{source}', 'photo': f'按商品图：{name}（不是实测）'}[basis]
    rounds.append(d); facts.append((name, shown, better, basis, source))
wins = {'A': sum(1 for f in facts if f[2] == 'A'), 'B': sum(1 for f in facts if f[2] == 'B')}
if wins['A'] == wins['B']: die(f'the rounds end {wins["A"]}:{wins["B"]}: the film needs a winner; add or change a round')
win = 'A' if wins['A'] > wins['B'] else 'B'; wn = O.name_a if win == 'A' else O.name_b
lost = [f[0] for f in facts if f[2] != win]
photo = [f[0] for f in facts if f[3] == 'photo']; real = [f[0] for f in facts if f[3] != 'photo']
T = {'select': f'选择你的{O.noun}', 'sub': f'两位选手  ·  六个位置  ·  {"二三四"[len(rounds) - 2]}个回合', 'ask': '哪一个更值得选？',
     'chip1': f'{wn}拿下 {max(wins.values())}/{len(rounds)} 回合' + (f'，输在{"、".join(lost)}' if lost else ''),
     'chip2': (f'样片：{"、".join(real)}为实数，其余按图判断' if photo and real else ('样片：全部按图判断，不是实测' if photo else '数据来源见 facts.md'))}
for kv in O.text:
    k, _, v = kv.partition('='); 
    if k not in T: die(f'--text key must be one of {", ".join(T)}')
    T[k] = v
spec = lambda p, s: s or (fmtv('¥', '', p) if p is not None else '')
data = {'text': T,
        'a': {'name': O.name_a, 'cls': O.cls_a, 'spec': spec(O.price_a, O.spec_a), 'hue': '#ff4d3a', 'deep': '#8c1b12', 'dark': '#2a0e12', 'image': 'assets/a.png'},
        'b': {'name': O.name_b, 'cls': O.cls_b, 'spec': spec(O.price_b, O.spec_b), 'hue': '#25d6ee', 'deep': '#0b6070', 'dark': '#08222b', 'image': 'assets/b.png'},
        'rounds': rounds}
# ---- write the film
os.makedirs(os.path.join(OUT, 'assets'), exist_ok=True); os.makedirs(os.path.join(OUT, 'fonts'), exist_ok=True)
sa = cutout(O.a, os.path.join(OUT, 'assets/a.png'), O.flip_a); sb = cutout(O.b, os.path.join(OUT, 'assets/b.png'), O.flip_b)
for f in os.listdir(os.path.join(HERE, 'template')): shutil.copy(os.path.join(HERE, 'template', f), os.path.join(OUT, f))
open(os.path.join(OUT, 'data.json'), 'w', encoding='utf8').write(json.dumps(data, ensure_ascii=False, indent=1))
bs = open(os.path.join(HERE, 'build.sh.in'), encoding='utf8').read().replace('@NAME@', O.name)
open(os.path.join(OUT, 'build.sh'), 'w').write(bs); os.chmod(os.path.join(OUT, 'build.sh'), 0o755)
h = open(os.path.join(OUT, 'index.html'), encoding='utf8').read().replace('<title>Versus</title>', f'<title>{O.name_a} vs {O.name_b}</title>')
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf8').write(h)
# ---- fact sheet
L = [f'# 事实核对表：{O.name_a} vs {O.name_b}', '', f'片中每个数字与结论都从这张表来（`data.json`），胜负由数字推出，不是手填。核对后再对外发布。', '',
     '| 回合 | ' + O.name_a + ' | ' + O.name_b + ' | 规则 | 胜 | 依据 | 来源 | 片中字幕 |', '|---|---|---|---|---|---|---|---|']
for d, (n, shown, better, basis, source) in zip(rounds, facts):
    L.append(f'| {n} | {shown[0]} | {shown[1]} | {d["rule"]} | {O.name_a if better == "A" else O.name_b} | {BASIS[basis]} | {source or "—"} | {d["cap"]} |')
L += ['', f'**结果**：{wins["A"]} : {wins["B"]}，{wn}获胜。片尾字条：「{T["chip1"]}」「{T["chip2"]}」', '', '## 需要你核对的', '']
if photo: L.append(f'- 按图判断的回合（{"、".join(photo)}）：只依据商品图里看得见的东西，没有实测；片中已标"不是实测"。能换成商品页参数或实测就换。')
for n, shown, better, basis, source in facts:
    if basis in ('user', 'listing'): L.append(f'- 「{n}」{shown[0]} / {shown[1]}：来源「{source}」，我没有独立核实；{"请确认是当前价格" if n == "价格" else "请对照原页面"}。')
    if basis == 'measured': L.append(f'- 「{n}」实测：请附测试条件（温度、水量、次数）。')
L += ['- 片中没有写任何表里以外的规格、功效或"最好"之类的断言。', '- 品牌与外观来自你提供的商品图，注意商品图的版权与平台规则。',
      '', f'## 画面', f'- 抠图 {sa[0]}×{sa[1]} / {sb[0]}×{sb[1]} px，看一眼 `assets/a.png`、`assets/b.png` 的边缘有没有毛边或缺口。']
open(os.path.join(OUT, 'facts.md'), 'w', encoding='utf8').write('\n'.join(L) + '\n')
print('\n'.join(L)); print('\nwrote', OUT)
if O.build: sys.exit(subprocess.run(['sh', os.path.join(OUT, 'build.sh')], cwd=ROOT).returncode)
print('next: sh films/%s/build.sh' % O.name)
