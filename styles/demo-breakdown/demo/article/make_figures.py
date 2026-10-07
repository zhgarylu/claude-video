"""Draws the two invented figures of the article demo: source/venn.png (an overlap diagram) and source/map.png (a colour-coded zone map).
  python3 make_figures.py      (Pillow; uses demo/fonts/NotoSansSC.ttf when present, else any CJK font it can find)
Everything on them is invented (a made-up bay, made-up counts); nothing is copied from anywhere. CC0."""
import os, glob
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'source'); os.makedirs(OUT, exist_ok=True)
cands = [os.path.join(HERE, '..', 'fonts', 'NotoSansSC.ttf'), os.path.join(HERE, 'fonts', 'NotoSansSC.ttf')] + glob.glob('/System/Library/Fonts/PingFang.ttc') + glob.glob('/Library/Fonts/*.ttf')
FONT = next((f for f in cands if os.path.exists(f)), None)
def F(size, wght=500):
    f = ImageFont.truetype(FONT, size) if FONT else ImageFont.load_default()
    try: f.set_variation_by_axes([wght])
    except Exception: pass
    return f
def text_c(d, xy, t, font, fill, anchor='mm'): d.text(xy, t, font=font, fill=fill, anchor=anchor)

# ── figure 1: two overlapping circles (drone counts, diver counts) and what they share
W, H = 1500, 1000
im = Image.new('RGBA', (W, H), (250, 249, 244, 255)); d = ImageDraw.Draw(im)
d.text((70, 60), '雾湾浅礁：两种数法各数到哪些点位', font=F(46, 700), fill=(40, 48, 56))
d.text((70, 122), '示意图 · 数据虚构', font=F(30, 500), fill=(120, 126, 132))
cA, cB, r = (600, 520), (900, 520), 270
for c, col in ((cA, (76, 141, 219, 150)), (cB, (242, 155, 75, 150))):
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(lay).ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=col); im = Image.alpha_composite(im, lay)
d = ImageDraw.Draw(im)
for c, col in ((cA, (46, 100, 170)), (cB, (190, 110, 30))): d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], outline=col, width=6)
text_c(d, (cA[0] - 100, 470), '44', F(120, 800), (20, 40, 80)); text_c(d, (cA[0] - 100, 570), '只有无人机数到', F(34, 600), (20, 40, 80))
text_c(d, (750, 470), '30', F(110, 800), (60, 30, 10)); text_c(d, (750, 566), '两边都数到', F(30, 700), (60, 30, 10))
text_c(d, (cB[0] + 100, 470), '17', F(120, 800), (90, 45, 5)); text_c(d, (cB[0] + 100, 570), '只有潜水员数到', F(34, 600), (90, 45, 5))
text_c(d, (cA[0], 190), '无人机照片', F(44, 800), (46, 100, 170)); text_c(d, (cB[0], 190), '潜水员样线', F(44, 800), (190, 110, 30))
d.rounded_rectangle([70, 850, 1430, 940], radius=22, fill=(235, 236, 228)); text_c(d, (750, 895), '共 91 个点位，两边都数到的有 30 个（约三分之一）', F(40, 700), (40, 48, 56))
im.convert('RGB').save(os.path.join(OUT, 'venn.png'), optimize=True)

# ── figure 2: twelve zones of a made-up bay, colour-coded by bleaching risk; a dot marks the zones both methods covered
W, H = 1800, 900
im = Image.new('RGB', (W, H), (246, 248, 250)); d = ImageDraw.Draw(im)
d.text((60, 36), '雾湾十二个小区的白化风险（去年数据）', font=F(44, 700), fill=(34, 44, 56)); d.text((60, 96), '示意图 · 数据虚构', font=F(28, 500), fill=(120, 126, 132))
d.polygon([(0, 150), (330, 150), (300, 330), (360, 520), (280, 700), (330, 900), (0, 900)], fill=(222, 214, 190)); text_c(d, (150, 520), '陆地', F(34, 600), (130, 120, 90))
GREEN, YEL, RED = (96, 176, 110), (240, 200, 70), (214, 80, 70); INK = (24, 30, 34)
zones = [GREEN, GREEN, YEL, RED, GREEN, YEL, RED, RED, GREEN, YEL, YEL, RED]; both = {1, 3, 4, 6, 8, 11}
x0, y0, cw, ch, gx, gy = 400, 160, 300, 190, 24, 24
for i, col in enumerate(zones):
    r_, c_ = divmod(i, 4); x = x0 + c_ * (cw + gx); y = y0 + r_ * (ch + gy) + (c_ % 2) * 18
    d.rounded_rectangle([x, y, x + cw, y + ch], radius=26, fill=col, outline=(255, 255, 255), width=5)
    text_c(d, (x + 56, y + 40), 'Z%d' % (i + 1), F(40, 800), INK)
    if i in both: d.ellipse([x + cw - 62, y + 22, x + cw - 22, y + 62], fill=(255, 255, 255), outline=INK, width=4)
lx = 400; ly = 842
for col, name in ((GREEN, '低风险'), (YEL, '中风险'), (RED, '高风险')):
    d.rounded_rectangle([lx, ly - 22, lx + 44, ly + 22], radius=8, fill=col); d.text((lx + 58, ly), name, font=F(34, 600), fill=INK, anchor='lm'); lx += 270
d.ellipse([lx, ly - 18, lx + 36, ly + 18], fill=(255, 255, 255), outline=INK, width=4); d.text((lx + 50, ly), '两种数法都覆盖', font=F(34, 600), fill=INK, anchor='lm')
d.text((1740, 120), '湾口 →', font=F(34, 700), fill=(34, 44, 56), anchor='rm')
im.save(os.path.join(OUT, 'map.png'), optimize=True)
print('wrote', os.listdir(OUT))
