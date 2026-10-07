"""Still images as sources: validate, decode and downscale them for the film (used by prep.py, article.py and the web service).

  from imgprep import check_image, prepare_image, IMAGE_EXT

check_image(path)    -> {w, h, bytes, format, alpha}   raises ValueError (a sentence for the person) for: svg, a wrong extension, a file over 25 MB,
                        a picture that does not decode, one over 6000 px on a side or under 64 px, animated GIF-like input, more than 40 megapixels.
prepare_image(path, out_dir, key, max_side=4096) -> {file, w, h, ow, oh, alpha}   writes <out_dir>/<key>.jpg (opaque) or .png (transparent), EXIF-rotated,
                        downscaled so the longest side is at most max_side (never enlarged), colour mode normalised to RGB.
Nothing here executes or fetches anything: a picture is only decoded by Pillow with a pixel cap."""
import os
from PIL import Image, ImageOps

IMAGE_EXT = ('.png', '.jpg', '.jpeg', '.webp')
MAX_BYTES = 25 * 1024 * 1024
MAX_SIDE = 6000
MIN_SIDE = 64
MAX_PIXELS = 40_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS

def check_image(path, max_bytes=MAX_BYTES):
    ext = os.path.splitext(path)[1].lower()
    if ext == '.svg' or ext == '.svgz': raise ValueError('SVG is not accepted (it can carry scripts): export it as PNG or JPEG first')
    if ext not in IMAGE_EXT: raise ValueError('only png / jpg / webp pictures are accepted (got %s)' % (ext or 'no extension'))
    size = os.path.getsize(path)
    if size > max_bytes: raise ValueError('the picture is %.1f MB; the limit is %d MB' % (size / 1048576, max_bytes // 1048576))
    if size < 100: raise ValueError('the picture file is empty or too small')
    try:
        with Image.open(path) as im:
            fmt = im.format; w, h = im.size
            if fmt not in ('PNG', 'JPEG', 'WEBP'): raise ValueError('the file content is %s, not png / jpg / webp' % fmt)
            if {'.png': 'PNG', '.jpg': 'JPEG', '.jpeg': 'JPEG', '.webp': 'WEBP'}[ext] != fmt: raise ValueError('the file content is %s but the name says %s' % (fmt, ext[1:]))
            if max(w, h) > MAX_SIDE: raise ValueError('the picture is %d x %d px; the longest side may be %d px' % (w, h, MAX_SIDE))
            if min(w, h) < MIN_SIDE: raise ValueError('the picture is too small (%d x %d px)' % (w, h))
            if w * h > MAX_PIXELS: raise ValueError('the picture has too many pixels')
            alpha = im.mode in ('RGBA', 'LA', 'PA') or 'transparency' in im.info
            im.verify()
    except ValueError: raise
    except Exception as e: raise ValueError('the picture cannot be decoded (%s)' % type(e).__name__)
    return {'w': w, 'h': h, 'bytes': size, 'format': fmt, 'alpha': bool(alpha)}

def prepare_image(path, out_dir, key, max_side=4096):
    info = check_image(path)
    os.makedirs(out_dir, exist_ok=True)
    with Image.open(path) as im:
        im.load(); im = ImageOps.exif_transpose(im); ow, oh = im.size
        alpha = info['alpha']
        if alpha:
            im = im.convert('RGBA')
            # a picture whose alpha is fully opaque is just an RGB picture
            if im.getchannel('A').getextrema()[0] >= 250: alpha = False
        im = im.convert('RGBA' if alpha else 'RGB')
        k = min(1.0, max_side / max(im.size))
        if k < 1: im = im.resize((max(1, round(im.size[0] * k)), max(1, round(im.size[1] * k))), Image.LANCZOS)
        out = os.path.join(out_dir, key + ('.png' if alpha else '.jpg'))
        for e in ('.png', '.jpg'):
            if os.path.exists(os.path.join(out_dir, key + e)) and os.path.join(out_dir, key + e) != out: os.remove(os.path.join(out_dir, key + e))
        if alpha: im.save(out, 'PNG', optimize=True)
        else: im.save(out, 'JPEG', quality=92, optimize=True, subsampling=0)
        return {'file': out, 'w': im.size[0], 'h': im.size[1], 'ow': ow, 'oh': oh, 'alpha': alpha}
