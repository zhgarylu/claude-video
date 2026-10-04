"""Fix the desk calendar in the host video: it shows "13" while the host says September 8th (9月8日).
Detects the dark digits on the calendar's white page in frames 1.2 s – 6.9 s, paints them out with the page colour
(row-wise interpolation) and draws "9/8" in the same place, same size and colour. Writes into src/frames/ only;
src/host.mp4 stays untouched. Re-run after prep.sh:  .venv/bin/python films/muse2/patch_calendar.py"""
import os, sys, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy.ndimage import binary_dilation, median_filter, label

HERE = os.path.dirname(os.path.abspath(__file__)); FR = os.path.join(HERE, 'src', 'frames')
FONT = next((p for p in ['/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/System/Library/Fonts/Supplemental/Verdana Bold.ttf', '/Library/Fonts/Arial Bold.ttf'] if os.path.exists(p)), None)
if not FONT: sys.exit('no bold font found for the patch')
WIN = (110, 400, 320, 545)                       # x0,y0,x1,y1: where the calendar lives
t0, t1 = 0.45, 6.9
idx = range(int(t0 * 24) + 1, int(t1 * 24) + 2)

def analyse(i):
    im = np.asarray(Image.open(os.path.join(FR, f'{i:04d}.jpg')).convert('RGB')).astype(int)
    x0, y0, x1, y1 = WIN; w = im[y0:y1, x0:x1]
    lum = w.mean(2); sat = w.max(2) - w.min(2)
    face = (lum > 205) & (sat < 20)
    lab, n = label(face)
    if n == 0: return None
    sizes = [(lab == k).sum() for k in range(1, n + 1)]; k = int(np.argmax(sizes)) + 1
    if sizes[k - 1] < 2500: return None
    fm = lab == k; ys, xs = np.where(fm); fx0, fx1, fy0, fy1 = xs.min(), xs.max(), ys.min(), ys.max()
    inner = np.zeros_like(fm); inner[fy0 + 4:fy1 - 3, fx0 + 4:fx1 - 3] = True
    dark = inner & (w.mean(2) < 150) & (sat < 45)
    if dark.sum() < 120: return None
    ds, dx = np.where(dark)
    return dict(i=i, dark=dark, fm=fm, bbox=(dx.min(), ds.min(), dx.max(), ds.max()), col=w[dark].mean(0))

res = {i: analyse(i) for i in idx}
good = [i for i in idx if res[i]]
print(f'detected the calendar in {len(good)} of {len(list(idx))} frames')
# smooth centre / height so "9/8" does not jitter
cx = {i: (res[i]['bbox'][0] + res[i]['bbox'][2]) / 2 for i in good}; cy = {i: (res[i]['bbox'][1] + res[i]['bbox'][3]) / 2 for i in good}
hh = {i: res[i]['bbox'][3] - res[i]['bbox'][1] + 1 for i in good}
def sm(d): a = np.array([d[i] for i in good], float); return dict(zip(good, median_filter(a, size=7, mode='nearest')))
cx, cy, hh = sm(cx), sm(cy), sm(hh)
for i in good:
    r = res[i]; path = os.path.join(FR, f'{i:04d}.jpg'); im = Image.open(path).convert('RGB'); a = np.asarray(im).astype(float)
    x0, y0, x1, y1 = WIN; w = a[y0:y1, x0:x1].copy()
    m = binary_dilation(r['dark'], iterations=3) & r['fm']
    ys, xs = np.where(m)
    lo, hi = xs.min() - 2, xs.max() + 2
    for y in range(ys.min(), ys.max() + 1):                       # row-wise fill from the clean pixels left and right of the digits
        l = w[y, max(lo, 0)]; rr = w[y, min(hi, w.shape[1] - 1)]
        row = np.where(m[y])[0]
        if len(row) == 0: continue
        for x in range(row.min() - 1, row.max() + 2):
            u = (x - lo) / max(1, hi - lo); w[y, x] = l * (1 - u) + rr * u
    a[y0:y1, x0:x1] = w
    layer = Image.new('L', im.size, 0); d = ImageDraw.Draw(layer)
    size = int(hh[i] * 1.0); f = ImageFont.truetype(FONT, size)
    d.text((x0 + cx[i], y0 + cy[i] + hh[i] * .02), '9/8', font=f, fill=255, anchor='mm')
    layer = layer.transform(im.size, Image.AFFINE, (1, 0.10, -0.10 * (y0 + cy[i]), 0, 1, 0), resample=Image.BICUBIC).filter(ImageFilter.GaussianBlur(.5))
    base = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)); col = tuple(int(v) for v in r['col'])
    base.paste(Image.new('RGB', im.size, col), (0, 0), layer)
    base.save(path, quality=92)
print('patched', len(good), 'frames')
