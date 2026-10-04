"""Write film.json for a new talking-head film from the host's transcript.
usage: python tools/talk/init_film.py <project> --layout split|pip|world [--aspect 9x16] --title "…" [--subtitle "…"]
Captions are made automatically from words.json (fix mishearings by hand: put the corrected cues in film.json under captions.cues).
For split / pip the first words of each spoken segment become bullet items; for world no cards are guessed (they need anchors in the video)."""
import argparse, json, os
ap = argparse.ArgumentParser(); ap.add_argument('project'); ap.add_argument('--layout', default='pip', choices=['split', 'pip', 'world'])
ap.add_argument('--title', default='Talking-head film'); ap.add_argument('--subtitle', default=''); ap.add_argument('--lang', default='zh'); ap.add_argument('--aspect', default='16x9', choices=['16x9', '9x16'])
a = ap.parse_args()
if a.aspect == '9x16': a.layout = 'world'     # portrait films use the portrait world layout
words = json.load(open(os.path.join(a.project, 'src', 'words.json')))
import re
def clean(t):
    t = re.sub(r'\s+', ' ', t).strip()
    if re.search(r'[\u4e00-\u9fff]', t): t = t.replace(',', '，').replace('?', '？').replace('!', '！')
    return re.sub(r'[，、,。.]+$', '', t)
cards = []
if a_layout := (a.layout != 'world'):
    for s_ in words:
        txt = clean(''.join(w['w'] for w in s_['words']))
        txt = txt if len(txt) <= 16 else txt[:16].rstrip() + '…'
        if txt: cards.append({'title': txt, 'hue': ['violet', 'teal', 'mustard', 'coral', 'sky'][len(cards) % 5], 't0': round(s_['t0'], 2)})
film = {'aspect': a.aspect, 'layout': a.layout, 'title': a.title, 'subtitle': a.subtitle, 'lang': a.lang, 'tail': 0,
        'captions': ({'cues': 'auto'} if a.aspect == '9x16' else {'style': 'pill' if a.layout == 'split' else 'card', 'cues': 'auto'}), 'theme': {}, 'cards': cards,
        'split': {'side': 'left'}, 'pip': {'corner': 'tr', 'width': 330}, 'world': {}}
json.dump(film, open(os.path.join(a.project, 'film.json'), 'w'), ensure_ascii=False, indent=1)
print(f'film.json: layout={a.layout}, {len(cards)} cards, captions from the transcript')
