import sys
from PIL import Image
out, *ims = sys.argv[1:]
cols = 2; w = 960
imgs = [Image.open(p).convert('RGB') for p in ims]
imgs = [i.resize((w, int(i.height * w / i.width))) for i in imgs]
rows = (len(imgs) + cols - 1) // cols
S = Image.new('RGB', (w * cols, imgs[0].height * rows))
for k, i in enumerate(imgs): S.paste(i, ((k % cols) * w, (k // cols) * i.height))
S.save(out, quality=88)
