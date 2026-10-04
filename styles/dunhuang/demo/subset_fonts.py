#!/usr/bin/env python3
"""Fetch OFL fonts subset to the characters the film uses, through the Google Fonts CSS API (&text=).
Output: fonts/sub/*.ttf (only these are loaded by the page). Needs a network connection the first time (uses curl)."""
import os, re, subprocess, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'fonts', 'sub'); os.makedirs(OUT, exist_ok=True)
src = ''.join(open(os.path.join(HERE, n), encoding='utf8').read() for n in ('film.js', 'timeline.js'))
chars = ''.join(sorted(set(chr(c) for c in range(32, 127)) | set(ch for ch in src if ord(ch) > 127) | set('，。！？、：；“”‘’…—·')))
FONTS = {'MaShanZheng.ttf': 'Ma+Shan+Zheng', 'NotoSerifSC.ttf': 'Noto+Serif+SC:wght@600'}
curl = lambda *a: subprocess.run(['curl', '-fsSL', '-A', 'Mozilla/5.0', *a], check=True, capture_output=True).stdout
for name, fam in FONTS.items():
    p = os.path.join(OUT, name)
    if os.path.exists(p): continue
    css = curl('https://fonts.googleapis.com/css2?family=%s&text=%s' % (fam, urllib.parse.quote(chars))).decode()
    open(p, 'wb').write(curl(re.search(r'url\((https://[^)]+)\)', css).group(1))); print('wrote', p)
