"""lines.json -> out/lines_zh.json / out/lines_en.json (the speech check runs once per language)."""
import json, os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); L = json.load(open(os.path.join(D, 'lines.json'), encoding='utf-8')); os.makedirs(os.path.join(D, 'out'), exist_ok=True)
for name, sel in [('zh', lambda l: l.get('lang') == 'cmn'), ('en', lambda l: l.get('lang') != 'cmn')]:
    json.dump([l for l in L if sel(l)], open(os.path.join(D, 'out', f'lines_{name}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
