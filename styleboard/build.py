# Lemo-Opuscar gallery: styles/*/style.json → catalog.json, index.html, and the generated parts of README.md, styles/README.md, AGENTS.md
# Local:          python3 styleboard/build.py                 (also refreshes each style.json "dur" from its mp4)
# GitHub Pages:   python3 styleboard/build.py --site _site
# README frames:  python3 styleboard/build.py --frames <slug>… (docs/frames/<slug>.jpg at the style's frame_sec)
import argparse, json, re, html, os, glob, shutil, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
CATALOG = os.path.join(HERE, 'catalog.json')   # generated; CI and tools/release.py read it

REPO = 'lemomo-ai/lemo-opuscar'
FILMS_URL = f'https://github.com/{REPO}/releases/download/films'   # full films live on the "films" release as <slug>.mp4
BLOB_URL = f'https://github.com/{REPO}/blob/main'

# The nine categories, in gallery order. A style.json must name one of them (both languages, exactly).
CATEGORIES = [('手绘与绘画', 'Hand-drawn & Painting'), ('东方传统', 'East Asian Traditions'), ('印刷与版画', 'Print & Printmaking'),
              ('图形与排版', 'Graphic & Type'), ('信息与发布', 'Information & Keynote'), ('卡通与动画', 'Cartoon & Anime'),
              ('游戏', 'Games'), ('电影与时代', 'Cinema & Eras'), ('材质与 3D', 'Materials & 3D')]
FIELDS = ('slug', 'num', 'en', 'cn', 'category_en', 'category_cn', 'film', 'line', 'line_cn', 'uses', 'frame_sec', 'dur')


def film_seconds(mp4):
    """Length of a film in seconds, or None when ffprobe can't read it (a half-rendered file, no ffprobe installed)."""
    try:
        d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], capture_output=True, text=True).stdout)
    except (ValueError, OSError): return None
    return d if d > 0 else None


def load_styles(refresh_dur):
    """Every styles/<slug>/style.json (folders starting with _ are templates). Fails loudly on a missing field or an unknown category.
    With refresh_dur, "dur" is re-read from styles/<slug>/<slug>.mp4 and written back when it changed; without the mp4
    (another machine, CI) or when ffprobe can't read it, the stored value is kept, never zeroed (0 = no video in the gallery)."""
    out, bad = [], []
    for p in sorted(glob.glob(os.path.join(ROOT, 'styles', '*', 'style.json'))):
        slug = os.path.basename(os.path.dirname(p))
        if slug.startswith('_'): continue
        j = json.load(open(p, encoding='utf-8'))
        miss = [f for f in FIELDS if f not in j]
        if miss: bad.append(f'styles/{slug}/style.json: missing {", ".join(miss)}'); continue
        if j['slug'] != slug: bad.append(f'styles/{slug}/style.json: slug is "{j["slug"]}", folder is "{slug}"')
        if (j['category_cn'], j['category_en']) not in CATEGORIES:
            bad.append(f'styles/{slug}/style.json: unknown category "{j["category_en"]} / {j["category_cn"]}" (see CATEGORIES in styleboard/build.py)')
        mp4 = os.path.join(ROOT, 'styles', slug, slug + '.mp4')
        if refresh_dur and os.path.exists(mp4):
            d = film_seconds(mp4)
            if d is None:
                print(f'WARNING: styles/{slug}/{slug}.mp4 exists but ffprobe cannot read its duration (half-rendered? no ffprobe?); keeping dur={j["dur"]}')
            elif round(d, 1) != j['dur']:
                j['dur'] = round(d, 1)
                open(p, 'w', encoding='utf-8').write(json.dumps(j, ensure_ascii=False, indent=1) + '\n')
        out.append(dict(slug=slug, num=j['num'], en=j['en'], cn=j['cn'], cat=j['category_cn'], cat_en=j['category_en'],
                        film=j['film'], line=j['line'], line_cn=j['line_cn'], uses=j['uses'], dur=j['dur'], frame_sec=j['frame_sec']))
    if bad: raise SystemExit('styleboard/build.py:\n  ' + '\n  '.join(bad))
    order = {c: i for i, c in enumerate(CATEGORIES)}
    out.sort(key=lambda s: (order.get((s['cat'], s['cat_en']), 99), int(re.match(r'\d+', s['num']).group()), s['num']))
    return out


def grab_frames(styles, slugs):
    """docs/frames/<slug>.jpg for the README grid: one frame of the film at the style's frame_sec."""
    by = {s['slug']: s for s in styles}
    os.makedirs(os.path.join(ROOT, 'docs', 'frames'), exist_ok=True)
    for slug in slugs:
        s = by.get(slug) or exit(f'no style "{slug}"')
        mp4 = os.path.join(ROOT, 'styles', slug, slug + '.mp4')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(s['frame_sec']), '-i', mp4, '-frames:v', '1', '-vf', 'scale=800:450', '-q:v', '3',
                        os.path.join(ROOT, 'docs', 'frames', slug + '.jpg')], check=True)
        print(f'docs/frames/{slug}.jpg ← {slug}.mp4 @ {s["frame_sec"]}s')


ap = argparse.ArgumentParser()
ap.add_argument('--site', help='build the GitHub Pages site into this folder (films from Releases)')
ap.add_argument('--frames', nargs='+', metavar='SLUG', help='only re-grab docs/frames/<slug>.jpg from the film at frame_sec, then stop')
args = ap.parse_args()
site = args.site

styles = load_styles(refresh_dur=not site and not args.frames)
if args.frames: grab_frames(styles, args.frames); raise SystemExit
if not site:
    json.dump([{k: v for k, v in s.items() if k != 'frame_sec'} for s in styles], open(CATALOG, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

if site:   # the public gallery only lists finished styles (with a STYLE.md)
    styles = [s for s in styles if os.path.exists(os.path.join(ROOT, 'styles', s['slug'], 'STYLE.md'))]
for s in styles:
    slug = s['slug']
    s['imgs'] = sorted(os.path.basename(p) for p in glob.glob(os.path.join(HERE, 'img', slug + '_*.jpg')))
    has_poster = os.path.exists(os.path.join(ROOT, 'styles', slug, 'poster.jpg'))
    has_md = os.path.exists(os.path.join(ROOT, 'styles', slug, 'STYLE.md'))
    if site:
        s['video'] = f'films/{slug}.mp4' if s['dur'] else ''          # 720p web cut, served by Pages as video/mp4 (Safari needs it)
        s['full'] = f'{FILMS_URL}/{slug}.mp4' if s['dur'] else ''       # full quality on Releases
        s['poster'] = f'posters/{slug}.jpg' if has_poster else ''
        s['stylemd'] = f'{BLOB_URL}/styles/{slug}/STYLE.md' if has_md else ''
    else:
        s['video'] = f'../styles/{slug}/{slug}.mp4' if os.path.exists(os.path.join(ROOT, 'styles', slug, slug + '.mp4')) else ''
        s['poster'] = f'../styles/{slug}/poster.jpg' if has_poster else ''
        s['stylemd'] = f'../styles/{slug}/STYLE.md' if has_md else ''

esc = lambda t: html.escape(t or '')

def laurel_symbol():
    # laurel: two branches, 9 leaves each along an arc
    import math
    leaves = []
    for side in (-1, 1):
        for i in range(9):
            a = math.radians(200 - i * 17) if side < 0 else math.radians(-20 + i * 17)
            cx, cy = 59 + 44 * math.cos(a), 34 + 27 * math.sin(a)
            rot = math.degrees(a) + (90 if side > 0 else -90) + side * 28
            leaves.append(f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="2.3" ry="5.6" transform="rotate({rot:.1f} {cx:.1f} {cy:.1f})"/>')
    stems = '<path d="M22 50 Q10 30 24 10" fill="none" stroke="currentColor" stroke-width="1"/><path d="M96 50 Q108 30 94 10" fill="none" stroke="currentColor" stroke-width="1"/>'
    return f'<symbol id="laurel" viewBox="0 0 118 62"><g fill="currentColor">{"".join(leaves)}</g>{stems}</symbol>'

def mmss(d): return f'{int(d // 60)}:{int(round(d) % 60):02d}'

def card(s):
    img = f'img/{s["imgs"][0]}' if s['imgs'] else s.get('poster', '')
    vid = bool(s.get('video'))
    film = s.get('film') or s['en']
    main = f'<img class="still" src="{esc(img)}" alt="{esc(s["en"])} — {esc(film)}" loading="lazy">' if img else '<div class="empty">Coming soon</div>'
    play = (f'<button class="play" type="button" data-src="{esc(s["video"])}" data-poster="{esc(s.get("poster", ""))}" '
            f'aria-label="Play {esc(film)}"><i></i><span>{mmss(s["dur"])}</span></button>') if vid else ''
    uses = ''.join(f'<li>{esc(u)}</li>' for u in s.get('uses', []))
    links = []
    if vid: links.append(f'<a class="watch" href="{esc(s.get("full") or s["video"])}" data-play>Watch the film</a>')
    if s.get('stylemd'): links.append(f'<a href="{esc(s["stylemd"])}" target="_blank" rel="noopener">STYLE.md</a>')
    return (f'<article class="nominee" data-slug="{esc(s["slug"])}" data-en="{esc(s["en"])}" data-cn="{esc(s["cn"])}" data-film="{esc(film)}">\n'
            f'  <div class="screen">{main}{play}</div>\n'
            f'  <div class="plate">\n'
            f'    <h3>{esc(s["en"])}</h3><p class="cn">{esc(s["cn"])}</p>\n'
            f'    <p class="for">for <em>{esc(film)}</em></p>\n'
            f'    <p class="line">{esc(s.get("line", ""))}</p><p class="line-cn">{esc(s.get("line_cn", ""))}</p>\n'
            f'    {f"<ul class=uses aria-label=\"Best for\">{uses}</ul>" if uses else ""}\n'
            f'    <nav class="links">{"".join(links)}</nav>\n'
            f'  </div>\n</article>')

cats = [c for c in CATEGORIES if any((s['cat'], s['cat_en']) == c for s in styles)]
sections, tabs = [], []
for i, (cn, en) in enumerate(cats, 1):
    group = [s for s in styles if s['cat'] == cn]
    sid = re.sub(r'[^a-z0-9]+', '-', en.lower()).strip('-')
    tabs.append(f'<button data-f="{sid}">{esc(en)}<small>{esc(cn)}</small></button>')
    sections.append(
        f'<section class="category" id="{sid}">\n'
        f'  <header class="cat-head"><svg class="lf"><use href="#laurel"/></svg>'
        f'<div><p class="cat-no">Category {i:02d}</p><h2>{esc(en)}</h2><p class="cat-cn">{esc(cn)} · {len(group)} nominees</p></div>'
        f'<svg class="lf"><use href="#laurel"/></svg></header>\n'
        f'  <div class="grid">\n' + '\n'.join(map(card, group)) + '\n  </div>\n</section>')

# the feature presentation above the nominees: Opuscar 98 (the film lives in promo/, which is not in the repo;
# the gallery streams the 720p web cut from Pages, the 1080p file is on the "films" release, the poster is styleboard/img)
FEATURE = dict(poster='img/feature_opuscar98.jpg', dur='6:25',
               src='films/opuscar98.mp4' if site else '../.release/web/opuscar98.mp4', full=f'{FILMS_URL}/opuscar98.mp4')
n_vid = sum(bool(s.get('video')) for s in styles)
minutes = sum(s.get('dur', 0) for s in styles) / 60
page = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read()
for k, v in {'{{LAUREL}}': laurel_symbol(), '{{SECTIONS}}': '\n'.join(sections), '{{TABS}}': ''.join(tabs),
             '{{N_ALL}}': str(len(styles)), '{{N_VID}}': str(n_vid), '{{N_CAT}}': str(len(cats)), '{{MIN}}': f'{minutes:.0f}',
             '{{REPO_URL}}': f'https://github.com/{REPO}', '{{REPO}}': REPO,
             '{{FEATURE_POSTER}}': FEATURE['poster'], '{{FEATURE_SRC}}': FEATURE['src'], '{{FEATURE_FULL}}': FEATURE['full'], '{{FEATURE_DUR}}': FEATURE['dur']}.items():
    page = page.replace(k, v)
out_dir = site or HERE
os.makedirs(out_dir, exist_ok=True)
open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8').write(page)
if site:   # Pages site: page + style frames + posters
    shutil.copytree(os.path.join(HERE, 'img'), os.path.join(site, 'img'), dirs_exist_ok=True)
    os.makedirs(os.path.join(site, 'posters'), exist_ok=True)
    for s in styles:
        if s['poster']: shutil.copy(os.path.join(ROOT, 'styles', s['slug'], 'poster.jpg'), os.path.join(site, 'posters', s['slug'] + '.jpg'))


# styles added in this repository (not in lemomo-ai/lemo-opuscar at c4bc370): listed in styles/added.json, marked in the README grid and the style index
_added_p = os.path.join(ROOT, 'styles', 'added.json')
ADDED = set(json.load(open(_added_p, encoding='utf-8'))['slugs']) if os.path.exists(_added_p) else set()
BADGE = '<sup><b>★ Added here · 本仓库新增</b></sup><br>'


def readme_grid():
    """README, between <!-- styles:start --> and <!-- styles:end -->: image grid by category (docs/frames/<slug>.jpg), both languages."""
    out = []
    for cn, en in cats:
        group = [x for x in styles if x['cat'] == cn and x['stylemd']]
        if not group: continue
        out.append(f'\n### {en} · {cn}\n\n<table>')
        for i in range(0, len(group), 3):
            out.append('<tr>')
            for s in group[i:i + 3]:
                cn_name = f' · {s["cn"]}' if s['cn'] != s['en'] else ''
                out.append(f'<td width="33%" valign="top"><a href="styles/{s["slug"]}/STYLE.md"><img src="docs/frames/{s["slug"]}.jpg" alt="{html.escape(s["en"])}"></a><br>'
                           f'{BADGE if s["slug"] in ADDED else ""}<b>{html.escape(s["en"])}</b>{html.escape(cn_name)}<br><i>{html.escape(s["film"])}</i><br>'
                           f'<sub>{html.escape(s["line"])}<br>{html.escape(s["line_cn"])}</sub></td>')
            out.append('</tr>')
        out.append('</table>')
    return '\n'.join(out) + '\n'


for fn in ('README.md',):
    p = os.path.join(ROOT, fn)
    if not os.path.exists(p) or site: continue
    t = open(p, encoding='utf-8').read()
    t2 = re.sub(r'(<!-- styles:start -->\n).*?(<!-- styles:end -->)', lambda m: m.group(1) + readme_grid() + m.group(2), t, flags=re.S)
    t2 = re.sub(r'<!--n-->\d+<!--/n-->', f'<!--n-->{sum(1 for x in styles if x["stylemd"])}<!--/n-->', t2)    # the headline count
    if t2 != t: open(p, 'w', encoding='utf-8').write(t2)


def style_index():
    """styles/README.md: style name (English / Chinese) → folder. Agents look up the STYLE.md for the name a user gives here."""
    out = ['# Style index · 风格索引', '',
           'Users may name a style in English, in Chinese, or by its folder. Find it here, then read `styles/<folder>/STYLE.md`.',
           '用户可能用英文名、中文名或文件夹名来指定风格。在这里查到文件夹，再读 `styles/<文件夹>/STYLE.md`。', '<!-- generated by styleboard/build.py from styles/*/style.json and styles/added.json; do not edit by hand -->',
           '★ = a style added in this repository (listed in `added.json`); the others come from lemomo-ai/lemo-opuscar. ★ = 本仓库新增的风格，其余来自原项目。', '']
    for cn, en in cats:
        group = [x for x in styles if x['cat'] == cn and x['stylemd']]
        if not group: continue
        out += [f'## {en} · {cn}', '', '| Style | 风格 | Folder | Our demo | Origin · 来源 |', '|---|---|---|---|---|']
        out += [f'| {s["en"]} | {s["cn"]} | [`{s["slug"]}`]({s["slug"]}/STYLE.md) | *{s["film"]}* | {"★ added here · 本仓库新增" if s["slug"] in ADDED else "Lemo-Opuscar"} |' for s in group]
        out.append('')
    return '\n'.join(out)


def style_list():
    """AGENTS.md, between <!-- style-list:start --> and <!-- style-list:end -->: the full list an agent shows a user who has not picked a style."""
    out = [f'All {sum(1 for x in styles if x["stylemd"])} styles · 全部风格:', '']
    for cn, en in cats:
        group = [x for x in styles if x['cat'] == cn and x['stylemd']]
        if not group: continue
        names = ', '.join(s['en'] if s['cn'] == s['en'] else f'{s["cn"]} {s["en"]}' for s in group)
        out.append(f'- **{cn} {en}** ({len(group)}): {names}')
    return '\n'.join(out) + '\n'


if not site:
    open(os.path.join(ROOT, 'styles', 'README.md'), 'w', encoding='utf-8').write(style_index())
    p = os.path.join(ROOT, 'AGENTS.md')
    t = open(p, encoding='utf-8').read()
    t2 = re.sub(r'(<!-- style-list:start -->\n).*?(<!-- style-list:end -->)', lambda m: m.group(1) + style_list() + m.group(2), t, flags=re.S)
    if t2 != t: open(p, 'w', encoding='utf-8').write(t2)

print(f'{len(styles)} styles ({n_vid} with film, {minutes:.0f} min) → {os.path.relpath(os.path.join(out_dir, "index.html"), ROOT)}')
for s in styles:
    if not s['imgs']: print('  no image:', s['slug'])
    if not s.get('line'): print('  no card copy (style.json line):', s['slug'])
