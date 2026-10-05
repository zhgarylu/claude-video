"""Poster in two shapes (16:9 and 9:16) from one image.

  .venv/bin/python tools/poster.py --image still.jpg --title "CLAUDE VIDEO" --sub "口播视频 + 风格解说" \\
      --chips "75 种风格,横屏 · 竖屏,提示词 · 画廊" --footer github.com/you/repo [--crop x,y,w,h] [--accent F4B428] [--bg 0E0F12] [--out posters/ --name film]

--image   a frame WITHOUT subtitles: render it from the page (`node core/render/still.mjs <demo> <t> --q poster=1`), do not cut it from the mp4.
--crop    the part of the image the 9:16 poster shows (default: the middle, full height). Pick the subject, e.g. the host and the board.
--title   one or two words. Latin letters become split-flap tiles (--plain for ordinary type); CJK is set as type.
--font    a TTF/OTF/TTC with the glyphs you use (default: the first CJK-capable system font found). --font-latin for the tiles (default: first found).
Writes <name>_16x9.jpg (1920x1080) and <name>_9x16.jpg (1080x1920). The 16:9 poster is the image with a bottom band of title/sub/footer; the 9:16 one
is title on top, the cropped image in the middle (edges fade into --bg), sub, chips and footer below."""
import argparse, os, sys, glob
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument('--image', required=True); ap.add_argument('--title', required=True); ap.add_argument('--sub', default=''); ap.add_argument('--chips', default=''); ap.add_argument('--footer', default='')
ap.add_argument('--crop'); ap.add_argument('--accent', default='F4B428'); ap.add_argument('--bg', default='0E0F12'); ap.add_argument('--fg', default='F0ECE1'); ap.add_argument('--plain', action='store_true')
ap.add_argument('--font'); ap.add_argument('--font-latin'); ap.add_argument('--out', default='.'); ap.add_argument('--name', default='poster')
A = ap.parse_args()
hexc = lambda h: tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
ACC, BG, FG = hexc(A.accent), hexc(A.bg), hexc(A.fg)
CJK = ['/System/Library/Fonts/PingFang.ttc', '/System/Library/Fonts/STHeiti Medium.ttc', '/System/Library/Fonts/Hiragino Sans GB.ttc', '/Library/Fonts/Arial Unicode.ttf',
       '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', '/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc', '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyhbd.ttc', 'C:/Windows/Fonts/msyh.ttc']
CJK += glob.glob('/System/Library/AssetsV2/com_apple_MobileAsset_Font*/*/AssetData/PingFang.ttc')
LAT = glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'styles', '*', 'demo', 'fonts', '*Medium.ttf')) + ['/System/Library/Fonts/Helvetica.ttc', '/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'C:/Windows/Fonts/arialbd.ttf']
def pick(c, what):
    for p in c:
        if p and os.path.exists(p): return p
    sys.exit('no %s font found: pass --font%s <file.ttf|ttc>' % (what, '' if what == 'CJK' else '-latin'))
FC = A.font or pick(CJK, 'CJK'); FL = A.font_latin or (A.font if A.font and not A.font_latin and False else pick(LAT, 'Latin'))
def font(p, s, idx=None):
    try: return ImageFont.truetype(p, s, index=idx) if idx is not None else ImageFont.truetype(p, s)
    except Exception: return ImageFont.truetype(p, s)
def cjk(s):
    f = font(FC, s)
    try: f.set_variation_by_name('Semibold')
    except Exception: pass
    return f
is_latin = lambda s: all(ord(c) < 0x250 for c in s)
os.makedirs(A.out, exist_ok=True)
img = Image.open(A.image).convert('RGB'); chips = [c.strip() for c in A.chips.split(',') if c.strip()]

def text_c(d, s, y, f, fill, W):
    w = d.textlength(s, font=f); d.text(((W - w) / 2, y), s, font=f, fill=fill)
def tiles(d, words, y, size, W):
    for k, word in enumerate(words):
        f = font(FL, int(size * 1.07)); n = len(word); tw = size * .62; gap = 8; tot = n * tw + (n - 1) * gap; x = (W - tot) / 2; col = FG if k == 0 else ACC
        for ch in word:
            d.rounded_rectangle([x, y, x + tw, y + size * 1.25], 10, fill=(28, 29, 34), outline=(60, 60, 66)); w = d.textlength(ch, font=f); d.text((x + (tw - w) / 2, y + size * .02), ch, font=f, fill=col)
            d.line([(x, y + size * .625), (x + tw, y + size * .625)], fill=BG, width=3); x += tw + gap
        y += size * 1.45
    return y

# 16:9
W, H = 1920, 1080; L = img.resize((W, H), Image.LANCZOS) if img.size != (W, H) else img.copy()
band = Image.new('RGBA', (W, H), (0, 0, 0, 0)); bd = ImageDraw.Draw(band)
for y in range(H):
    a = max(0, (y - H * .62) / (H * .38)); bd.line([(0, y), (W, y)], fill=BG + (int(235 * min(1, a ** 1.3)),))
L = Image.alpha_composite(L.convert('RGBA'), band).convert('RGB'); d = ImageDraw.Draw(L)
tf = cjk(104) if not is_latin(A.title) else font(FL, 118); d.text((90, H - 330), A.title, font=tf, fill=FG)
if A.sub: d.text((94, H - 190), A.sub, font=cjk(46), fill=ACC)
if A.footer: ff = font(FL, 34); d.text((W - 90 - d.textlength(A.footer, font=ff), H - 82), A.footer, font=ff, fill=(200, 200, 205))
L.save(os.path.join(A.out, A.name + '_16x9.jpg'), quality=93)

# 9:16
W, H = 1080, 1920
if A.crop: x, y, w, h = map(int, A.crop.split(','))
else: h = img.height; w = min(img.width, int(h * 1080 / 1250)); x = (img.width - w) // 2; y = 0
sh = int(W * h / w); sc = img.crop((x, y, x + w, y + h)).resize((W, sh), Image.LANCZOS); top = 500
im = Image.new('RGB', (W, H), BG); im.paste(sc, (0, top))
m = Image.new('L', (W, sh), 255); md = ImageDraw.Draw(m)
for i in range(min(90, sh // 3)): a = int(255 * i / 90); md.line([(0, i), (W, i)], fill=a); md.line([(0, sh - 1 - i), (W, sh - 1 - i)], fill=a)
im.paste(Image.new('RGB', (W, sh), BG), (0, top), Image.eval(m, lambda v: 255 - v)); d = ImageDraw.Draw(im)
words = A.title.split()
if is_latin(A.title) and not A.plain and all(len(wd) <= 9 for wd in words): tiles(d, words, 100, 110 if max(map(len, words)) <= 6 else 88, W)
else: text_c(d, A.title, 190, cjk(120 if len(A.title) <= 8 else 84), FG, W)
yb = top + sh + 60
if A.sub: text_c(d, A.sub, yb, cjk(64), FG, W); yb += 140
if chips:
    cf = cjk(40); cw = (W - 140 - 20 * (len(chips) - 1)) / len(chips)
    for i, c in enumerate(chips):
        x0 = 70 + i * (cw + 20); d.rounded_rectangle([x0, yb, x0 + cw, yb + 80], 40, outline=ACC, width=3); w_ = d.textlength(c, font=cf); d.text((x0 + (cw - w_) / 2, yb + 14), c, font=cf, fill=ACC)
    yb += 140
if A.footer: ff = font(FL, 40); text_c(d, A.footer, min(H - 110, yb + 20), ff, (150, 150, 158), W)
im.save(os.path.join(A.out, A.name + '_9x16.jpg'), quality=93)
print(os.path.join(A.out, A.name + '_16x9.jpg')); print(os.path.join(A.out, A.name + '_9x16.jpg'))
