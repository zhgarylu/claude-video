"""Every character the film can draw -> fonts/chars.txt (ASCII + all non-ASCII in the sources), for the font subsets."""
import os, re
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
chars = set(chr(c) for c in range(32, 127))
for f in ['script.js', 'cards.js', 'main.js', 'showcase.js', 'tools/plan.py', 'lines.json']:
    p = os.path.join(D, f)
    if os.path.exists(p): chars |= set(c for c in open(p, encoding='utf-8').read() if ord(c) > 126 and c not in '​')
chars -= set('­') if False else set()
open(os.path.join(D, 'fonts', 'chars.txt'), 'w', encoding='utf-8').write(''.join(sorted(chars)))
print(len(chars), 'characters')
