"""Build gallery/data.js, the data the gallery page reads.

Inputs:  styleboard/catalog.json   the 61 styles (names, category, film, line, uses, duration)
         styles/added.json         which of them were added in this repository
         gallery/talking-head.json the talking-head demos
         prompts/talking-head/*.md host-video prompts (front matter + the first ```text block)
Output:  gallery/data.js           window.GALLERY = {...}

Films of the original 43 styles are hosted by the original project (release assets of lemomo-ai/lemo-opuscar);
films of the styles added here and the talking-head demos are release assets of this repository.
Run:  python3 tools/build_gallery.py
"""
import json, os, re, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cat = json.load(open(os.path.join(ROOT, 'styleboard', 'catalog.json')))
added = json.load(open(os.path.join(ROOT, 'styles', 'added.json')))
talk = json.load(open(os.path.join(ROOT, 'gallery', 'talking-head.json')))
ADDED = set(added['slugs'])
UP = 'https://github.com/lemomo-ai/lemo-opuscar/releases/download/films'
MINE = talk['release']
REPO = 'https://github.com/zhgarylu/claude-video/blob/main'
styles = []
for c in cat:
    s = dict(c)
    s['added'] = c['slug'] in ADDED
    s['video'] = f"{MINE if s['added'] else UP}/{c['slug']}.mp4"
    s['frame'] = f"../docs/frames/{c['slug']}.jpg"
    s['style_md'] = f"{REPO}/styles/{c['slug']}/STYLE.md"
    s['demo_md'] = f"{REPO}/styles/{c['slug']}/DEMO.md"
    styles.append(s)
by = {s['slug']: s for s in styles}
demos = []
for d in talk['demos']:
    st = by[d['style']]
    demos.append({**d, 'video': f"{MINE}/{d['id']}.mp4", 'poster': f"../docs/talking-head/{d['id']}.jpg", 'source_url': f"https://github.com/zhgarylu/claude-video/tree/main/{d['source']}",
                  'style_en': st['en'], 'style_cn': st['cn']})
prompts = []
for fp in sorted(glob.glob(os.path.join(ROOT, 'prompts', 'talking-head', '*.md'))):
    if os.path.basename(fp) == 'README.md': continue
    raw = open(fp, encoding='utf8').read()
    m = re.match(r'---\n(.*?)\n---\n(.*)', raw, re.S)
    fm = {k.strip(): v.strip() for k, v in (l.split(':', 1) for l in m.group(1).splitlines() if ':' in l)}
    body = re.search(r'```text\n(.*?)\n```', m.group(2), re.S).group(1)
    prompts.append({**fm, 'text': body, 'url': f"{REPO}/prompts/talking-head/{os.path.basename(fp)}"})
order = {'used': 0, 'untested': 1, 'template': 2}
prompts.sort(key=lambda x: (order.get(x['status'], 9), x['id']))
missing = ADDED - set(by)
assert not missing, missing
out = {'styles': styles, 'demos': demos, 'prompts': prompts, 'counts': {'total': len(styles), 'added': len(ADDED), 'demos': len(demos)}}
open(os.path.join(ROOT, 'gallery', 'data.js'), 'w').write('window.GALLERY = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
print(f"gallery/data.js: {len(styles)} styles ({len(ADDED)} added here), {len(demos)} talking-head demos, {len(prompts)} prompts")
