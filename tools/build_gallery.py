"""Build gallery/data.js, the data the gallery page reads.

Inputs:  styleboard/catalog.json   the 61 styles (names, category, film, line, uses, duration)
         styles/added.json         which of them were added in this repository
         gallery/talking-head.json the talking-head demos
Output:  gallery/data.js           window.GALLERY = {...}

Films of the original 43 styles are hosted by the original project (release assets of lemomo-ai/lemo-opuscar);
films of the styles added here and the talking-head demos are release assets of this repository.
Run:  python3 tools/build_gallery.py
"""
import json, os
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
missing = ADDED - set(by)
assert not missing, missing
out = {'styles': styles, 'demos': demos, 'counts': {'total': len(styles), 'added': len(ADDED), 'demos': len(demos)}}
open(os.path.join(ROOT, 'gallery', 'data.js'), 'w').write('window.GALLERY = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
print(f"gallery/data.js: {len(styles)} styles ({len(ADDED)} added here), {len(demos)} talking-head demos")
