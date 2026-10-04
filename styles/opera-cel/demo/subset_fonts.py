#!/usr/bin/env python3
"""Subset the OFL fonts to the characters the film actually draws (timeline.js text + ASCII).
Full fonts are downloaded to a cache dir when missing; only the subsets in fonts/sub/ are used by the page."""
import os, urllib.request
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.environ.get('OPERA_FONT_CACHE', os.path.join(HERE, 'fonts'))
OUT = os.path.join(HERE, 'fonts', 'sub')
G = 'https://raw.githubusercontent.com/google/fonts/main/ofl/'
FONTS = {
    'MaShanZheng-Regular.ttf': G + 'mashanzheng/MaShanZheng-Regular.ttf',
    'ZCOOLXiaoWei-Regular.ttf': G + 'zcoolxiaowei/ZCOOLXiaoWei-Regular.ttf',
    'NotoSerifSC.ttf': G + 'notoserifsc/NotoSerifSC%5Bwght%5D.ttf',
}
os.makedirs(CACHE, exist_ok=True)
os.makedirs(OUT, exist_ok=True)
src = open(os.path.join(HERE, 'timeline.js'), encoding='utf8').read()
chars = set(chr(c) for c in range(32, 127)) | set(ch for ch in src if ord(ch) > 127) | set('，。！？、：；“”‘’（）…—×·')
text = ''.join(sorted(chars))
for name, url in FONTS.items():
    p = os.path.join(CACHE, name)
    if not os.path.exists(p):
        print('downloading', name)
        urllib.request.urlretrieve(url, p)
    f = TTFont(p)
    opts = subset.Options()
    opts.layout_features = ['*']
    opts.notdef_outline = True
    opts.name_IDs = ['*']
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(f)
    if 'fvar' in f:   # pin the weight after subsetting (fast)
        f = instancer.instantiateVariableFont(f, {'wght': 700})
    out = os.path.join(OUT, name.replace('.ttf', '.sub.ttf'))
    f.save(out)
    print(out, os.path.getsize(out) // 1024, 'KB')
