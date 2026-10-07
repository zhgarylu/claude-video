"""Read an article (and its pictures) into a compact project input: article.json (title, sections with paragraphs, figures) and article.md.

  .venv/bin/python tools/breakdown/article.py <file.md|.txt|.html> --out work/article [--lang zh|en] [--meta key=value ...]
  .venv/bin/python tools/breakdown/article.py --text - --out work/article < pasted.txt           # pasted text on stdin
  .venv/bin/python tools/breakdown/article.py --url https://example.com/post --out work/article     # only with your explicit --url: public http(s) pages only

Output (in --out): article.json, article.md, figures/f1.jpg ...  (pictures are validated and kept as png / jpg / webp, at most 6000 px a side, 25 MB each).
A local file's pictures are found next to it (relative paths inside the same folder tree; nothing outside it is read). With --url the page and every picture are
fetched through netguard.py: public hosts only, ports 80/443, every address checked after DNS and after each redirect, size / time / content-type caps.
`--meta title=… author=… site=… date=… url=… licence=…` overrides what the page says. `--max-images 12`, `--max-mb 25`.

Using an article and its pictures is the maker's responsibility (the owner's licence or permission, the site's terms, fair use where you publish): the film shows
the credit with every figure and CREDITS records the source; this tool prints the reminder and never refuses."""
import argparse, html, json, os, re, sys
from html.parser import HTMLParser
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from imgprep import IMAGE_EXT, check_image

RIGHTS = ('Rights: the article text and its pictures are not covered by this library\'s licences. You are responsible for having the right to use them '
          '(the owner\'s licence or permission, the site\'s terms, fair use where you publish). The film puts a credit on screen with every figure and CREDITS records the source; fill in its TODO fields.')
CJK = re.compile(r'[぀-鿿＀-￯]')
def norm(t): return re.sub(r'\s+', ' ', html.unescape(t or '')).strip()
def is_cjk(t): return len(CJK.findall(t)) > max(8, 0.2 * len(t)) if t else False

# ───────────────────────────── a tiny DOM
VOID = {'br', 'img', 'hr', 'meta', 'link', 'input', 'source', 'wbr', 'area', 'base', 'col', 'embed', 'track'}
DROP = {'script', 'style', 'noscript', 'svg', 'iframe', 'form', 'button', 'nav', 'footer', 'aside', 'template', 'dialog', 'select', 'canvas', 'audio', 'video'}
class Node:
    __slots__ = ('tag', 'attrs', 'kids', 'parent')
    def __init__(s, tag, attrs=None, parent=None): s.tag, s.attrs, s.kids, s.parent = tag, dict(attrs or {}), [], parent
    def text(s):
        out = []
        for k in s.kids:
            if isinstance(k, str): out.append(k)
            elif k.tag == 'br': out.append(' ')
            elif k.tag not in DROP: out.append(k.text())
        return ''.join(out)
    def walk(s):
        for k in s.kids:
            if isinstance(k, Node): yield k; yield from k.walk()
class DOM(HTMLParser):
    def __init__(s): super().__init__(convert_charrefs=True); s.root = Node('root'); s.cur = s.root; s.meta = {}; s.jsonld = []; s._ld = False; s.title = ''; s._t = False; s.lang = ''
    def handle_starttag(s, tag, attrs):
        a = {k: (v or '') for k, v in attrs}
        if tag == 'meta':
            k = (a.get('property') or a.get('name') or '').lower()
            if k and a.get('content') is not None: s.meta.setdefault(k, a['content'])
            return
        if tag == 'html' and a.get('lang'): s.lang = a['lang']
        if tag == 'title': s._t = True
        if tag == 'script' and 'ld+json' in a.get('type', ''): s._ld = True
        n = Node(tag, a, s.cur); s.cur.kids.append(n)
        if tag not in VOID: s.cur = n
    def handle_startendtag(s, tag, attrs): s.handle_starttag(tag, attrs); (s.handle_endtag(tag) if tag not in VOID else None)
    def handle_endtag(s, tag):
        if tag == 'title': s._t = False
        if tag == 'script': s._ld = False
        n = s.cur
        while n is not s.root and n.tag != tag: n = n.parent
        if n is not s.root: s.cur = n.parent
    def handle_data(s, d):
        if s._t: s.title += d
        elif s._ld: s.jsonld.append(d)
        else: s.cur.kids.append(d)

def hidden(n): return n.attrs.get('hidden') is not None or n.attrs.get('aria-hidden') == 'true' or 'display:none' in n.attrs.get('style', '').replace(' ', '')

def best_srcset(v, base):
    best, bw = None, -1
    for part in (v or '').split(','):
        bits = part.strip().split()
        if not bits: continue
        w = 0
        if len(bits) > 1 and bits[1].endswith('w') and bits[1][:-1].isdigit(): w = int(bits[1][:-1])
        elif len(bits) > 1 and bits[1].endswith('x'):
            try: w = int(float(bits[1][:-1]) * 1000)
            except ValueError: pass
        if w >= bw: best, bw = bits[0], w
    return best

def img_of(n, base):
    """the best URL an <img> / <picture> offers (largest srcset entry, data-src for lazy images), as given (not yet joined)."""
    cand = []
    if n.tag == 'picture':
        for k in n.kids:
            if isinstance(k, Node) and k.tag == 'source' and k.attrs.get('srcset'): cand.append(best_srcset(k.attrs['srcset'], base))
        for k in n.walk():
            if k.tag == 'img': cand.append(img_of(k, base))
    else:
        for key in ('data-srcset', 'srcset'):
            if n.attrs.get(key): cand.append(best_srcset(n.attrs[key], base))
        for key in ('data-src', 'data-original', 'src'):
            if n.attrs.get(key): cand.append(n.attrs[key])
    cand = [c for c in cand if c]
    return cand[0] if cand else None

def parse_html(raw, base_url=''):
    d = DOM(); d.feed(raw); d.close(); R = d.root
    def prune(n):
        n.kids = [k for k in n.kids if isinstance(k, str) or (k.tag not in DROP and not hidden(k))]
        for k in n.kids:
            if isinstance(k, Node): prune(k)
    prune(R)
    meta = {}
    for ld in d.jsonld:
        try: j = json.loads(ld)
        except ValueError: continue
        for o in (j if isinstance(j, list) else j.get('@graph', [j]) if isinstance(j, dict) else []):
            if not isinstance(o, dict): continue
            a = o.get('author')
            if a and 'author' not in meta: meta['author'] = norm(a.get('name') if isinstance(a, dict) else ', '.join(x.get('name', '') if isinstance(x, dict) else str(x) for x in a) if isinstance(a, list) else str(a))
            if o.get('datePublished') and 'date' not in meta: meta['date'] = str(o['datePublished'])[:10]
            if o.get('headline') and 'title' not in meta: meta['title'] = norm(o['headline'])
    m = d.meta
    meta.setdefault('title', norm(m.get('og:title') or m.get('twitter:title') or ''))
    meta.setdefault('author', norm(m.get('author') or m.get('article:author') or ''))
    meta.setdefault('date', (m.get('article:published_time') or m.get('date') or m.get('publication_date') or '')[:10])
    meta['site'] = norm(m.get('og:site_name') or '')
    meta['description'] = norm(m.get('og:description') or m.get('description') or '')
    # the main container: the <article> / <main> with the most text
    def tl(n): return len(norm(n.text()))
    cands = [n for n in R.walk() if n.tag in ('article', 'main') or n.attrs.get('role') == 'main']
    main = max(cands, key=tl) if cands and max(tl(c) for c in cands) > 500 else next((n for n in R.walk() if n.tag == 'body'), R)
    blocks = []                                           # ('h', level, text) ('p', text, kind) ('fig', url, alt, caption)
    seen_img = set()
    def add_img(n, caption=''):
        u = img_of(n, base_url)
        if not u or u.startswith('data:'): return
        full = urllib.parse.urljoin(base_url, u) if base_url else u
        if full in seen_img: return
        seen_img.add(full)
        im = n if n.tag == 'img' else next((k for k in n.walk() if k.tag == 'img'), n)
        try: wa, ha = int(re.sub(r'\D', '', im.attrs.get('width', '')) or 0), int(re.sub(r'\D', '', im.attrs.get('height', '')) or 0)
        except ValueError: wa = ha = 0
        if (wa and wa < 120) or (ha and ha < 80): return
        if re.search(r'(logo|icon|avatar|sprite|favicon|badge|tracking|pixel)', full, re.I) and not caption: return
        blocks.append(('fig', full, norm(im.attrs.get('alt', '')), norm(caption)))
    def walk(n):
        for k in n.kids:
            if isinstance(k, str): continue
            t = k.tag
            if re.fullmatch(r'h[1-4]', t):
                x = norm(k.text())
                if x: blocks.append(('h', int(t[1]), x))
            elif t == 'p':
                x = norm(k.text())
                if x: blocks.append(('p', x, 'p'))
                for im in [q for q in k.walk() if q.tag in ('img', 'picture')]:
                    if im.tag == 'img' and im.parent is not None and im.parent.tag == 'picture': continue
                    add_img(im)
            elif t == 'li':
                x = norm(k.text())
                if x: blocks.append(('p', x, 'li'))
            elif t == 'blockquote':
                x = norm(k.text())
                if x: blocks.append(('p', x, 'quote'))
            elif t == 'figure':
                cap = next((norm(q.text()) for q in k.walk() if q.tag == 'figcaption'), '')
                ims = [q for q in k.walk() if q.tag in ('picture', 'img') and not (q.tag == 'img' and q.parent is not None and q.parent.tag == 'picture')]
                for im in ims[:2]: add_img(im, cap)
            elif t in ('img', 'picture'): add_img(k)
            elif t in ('pre', 'table', 'code'): pass
            else: walk(k)
    walk(main)
    return meta, blocks, d

# ───────────────────────────── markdown / plain text
def parse_text(raw, is_md):
    meta = {}; lines = raw.replace('\r\n', '\n').replace('\r', '\n').split('\n')
    if is_md and lines and lines[0].strip() == '---':
        for i in range(1, min(len(lines), 40)):
            if lines[i].strip() == '---':
                for ln in lines[1:i]:
                    m = re.match(r'(\w[\w-]*)\s*:\s*(.+)', ln)
                    if m: meta[m.group(1).lower()] = m.group(2).strip().strip('"\'')
                lines = lines[i + 1:]; break
    blocks = []; para = []; fence = False
    def flush(kind='p'):
        nonlocal para
        t = norm(' '.join(para))
        if t: blocks.append(('p', t, kind))
        para = []
    def inline(t):
        t = re.sub(r'!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)', '', t)
        t = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', t); t = re.sub(r'[*_`]{1,3}([^*_`]+)[*_`]{1,3}', r'\1', t)
        return t
    for ln in lines:
        s = ln.strip()
        if s.startswith('```'): fence = not fence; flush(); continue
        if fence: continue
        mi = re.findall(r'!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)', s) if is_md else []
        if mi:
            flush()
            for alt, src, ttl in mi: blocks.append(('fig', src, norm(alt), norm(ttl)))
            rest = inline(s).strip()
            if rest: para.append(rest); flush()
            continue
        mh = re.match(r'(#{1,4})\s+(.*)', s) if is_md else None
        if mh: flush(); blocks.append(('h', len(mh.group(1)), norm(inline(mh.group(2)))))
        elif not s: flush()
        elif is_md and s.startswith('>'): flush(); blocks.append(('p', norm(inline(s.lstrip('> '))), 'quote'))
        elif is_md and re.match(r'([-*+]|\d+[.)])\s+', s): flush(); blocks.append(('p', norm(inline(re.sub(r'^([-*+]|\d+[.)])\s+', '', s))), 'li'))
        else: para.append(inline(s) if is_md else s)
    flush()
    # a plain text file: the first short line before a blank line is the title
    if not any(b[0] == 'h' for b in blocks) and blocks and blocks[0][0] == 'p' and len(blocks[0][1]) < 90 and not re.search(r'[。.!?！？]$', blocks[0][1]) and len(blocks) > 2: blocks[0] = ('h', 1, blocks[0][1])
    return meta, blocks

# ───────────────────────────── blocks -> article
def build(meta, blocks, lang_hint=''):
    title = meta.get('title') or ''
    # first level-1 heading is the title (and not a section)
    for i, b in enumerate(blocks):
        if b[0] == 'h' and b[1] == 1:
            if not title: title = b[2]
            if b[2] == title or i == 0: blocks = blocks[:i] + blocks[i + 1:]
            break
    sections = []; figs = []; cur = None
    def sec(h='', lvl=2):
        nonlocal cur
        cur = {'id': 's%d' % (len(sections) + 1), 'heading': h, 'level': lvl, 'paragraphs': [], 'figures': []}; sections.append(cur); return cur
    for b in blocks:
        if b[0] == 'h':
            if cur is not None and not cur['paragraphs'] and not cur['figures'] and not cur['heading']: cur['heading'], cur['level'] = b[2], b[1]
            else: sec(b[2], b[1])
        elif b[0] == 'p':
            if cur is None: sec()
            if len(b[1]) < 2: continue
            cur['paragraphs'].append({'id': '%sp%d' % (cur['id'], len(cur['paragraphs']) + 1), 'text': b[1], **({'kind': b[2]} if b[2] != 'p' else {})})
        elif b[0] == 'fig':
            if cur is None: sec()
            fid = 'f%d' % (len(figs) + 1)
            f = {'id': fid, 'src': b[1], 'alt': b[2], 'caption': b[3], 'section': cur['id'], 'after_para': cur['paragraphs'][-1]['id'] if cur['paragraphs'] else None}
            figs.append(f); cur['figures'].append(fid)
    sections = [s for s in sections if s['paragraphs'] or s['figures']]
    text = ' '.join(p['text'] for s in sections for p in s['paragraphs'])
    lang = lang_hint or ('zh' if is_cjk(text) else 'en')
    words = len(re.findall(r'[぀-鿿]', text)) + len(re.findall(r'[A-Za-z0-9À-ɏ]+', text))
    return {'title': title, 'author': meta.get('author', ''), 'date': meta.get('date', ''), 'site': meta.get('site', ''), 'url': meta.get('url', ''), 'licence': meta.get('licence', meta.get('license', '')),
            'lang': lang, 'words': words, 'chars': len(text), 'sections': sections, 'figures': figs}

# ───────────────────────────── figures: fetch or copy, validate
def magic_ext(b):
    if b[:8] == b'\x89PNG\r\n\x1a\n': return '.png'
    if b[:3] == b'\xff\xd8\xff': return '.jpg'
    if b[:4] == b'RIFF' and b[8:12] == b'WEBP': return '.webp'
    return None

def collect_figures(art, out, base_file=None, base_url='', fetch_fn=None, max_images=12, max_bytes=25 * 1024 * 1024, log=print):
    fd = os.path.join(out, 'figures'); os.makedirs(fd, exist_ok=True); n_ok = 0
    root = os.path.realpath(os.path.dirname(base_file)) if base_file else None
    for f in art['figures']:
        f['file'] = None
        if n_ok >= max_images: f['error'] = 'skipped: more than %d pictures' % max_images; continue
        try:
            src = f['src']
            if re.match(r'https?://', src or ''):
                if not fetch_fn: raise ValueError('a remote picture: needs --url mode')
                _, ct, data = fetch_fn(src, max_bytes)
                ext = magic_ext(data)
                if not ext: raise ValueError('not a png / jpg / webp picture (content type %s)' % ct)
            else:
                if not root: raise ValueError('a local picture reference needs a file input')
                path = os.path.realpath(os.path.join(root, urllib.parse.unquote(src.split('#')[0].split('?')[0])))
                if not (path == root or path.startswith(root + os.sep)): raise ValueError('outside the article folder: not read')
                if not os.path.isfile(path): raise ValueError('file not found')
                if os.path.splitext(path)[1].lower() == '.svg': raise ValueError('SVG is not accepted: export it as PNG or JPEG')
                data = open(path, 'rb').read(max_bytes + 1); ext = magic_ext(data)
                if not ext: raise ValueError('not a png / jpg / webp picture')
            if len(data) > max_bytes: raise ValueError('larger than %d MB' % (max_bytes // 1048576))
            dst = os.path.join(fd, f['id'] + ext); open(dst, 'wb').write(data)
            try: info = check_image(dst, max_bytes)
            except ValueError as e: os.remove(dst); raise
            if max(info['w'], info['h']) < 200 or min(info['w'], info['h']) < 80: os.remove(dst); raise ValueError('too small to be a figure (%dx%d)' % (info['w'], info['h']))
            f.update(file='figures/' + f['id'] + ext, w=info['w'], h=info['h'], bytes=info['bytes'], alpha=info['alpha']); n_ok += 1
        except Exception as e:
            f['error'] = str(e)[:160]; log('  figure %s skipped: %s (%s)' % (f['id'], f['error'], (f.get('src') or '')[:80]))
    # renumber what survived? ids stay (a skipped figure leaves a gap on purpose: article.md says which ones are usable)
    return art

def write_out(art, out):
    json.dump(art, open(os.path.join(out, 'article.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    L = ['# ' + (art['title'] or '(untitled)'), '', ' · '.join(x for x in (art['site'], art['author'], art['date'], art['url']) if x) or '(no byline)', '', '%d words, language %s, %d section(s), %d usable figure(s)' % (art['words'], art['lang'], len(art['sections']), sum(1 for f in art['figures'] if f.get('file'))), '']
    for s in art['sections']:
        L.append(('#' * max(2, min(4, s['level'] + (0 if s['level'] >= 2 else 1)))) + ' [%s] %s' % (s['id'], s['heading'] or '(no heading)')); L.append('')
        figs = {f['id']: f for f in art['figures']}
        after = {}
        for fid in s['figures']: after.setdefault(figs[fid]['after_para'], []).append(figs[fid])
        for f in after.get(None, []): L += [fig_line(f), '']
        for p in s['paragraphs']:
            L += ['[%s] %s' % (p['id'], p['text']), '']
            for f in after.get(p['id'], []): L += [fig_line(f), '']
    open(os.path.join(out, 'article.md'), 'w', encoding='utf8').write('\n'.join(L).rstrip() + '\n\n' + RIGHTS + '\n')
def fig_line(f):
    if f.get('file'): return '> FIGURE %s: %s (%dx%d px) alt: %s | caption: %s' % (f['id'], f['file'], f['w'], f['h'], f.get('alt') or '-', f.get('caption') or '-')
    return '> FIGURE %s: not usable (%s)' % (f['id'], f.get('error', '?'))

def main():
    ap = argparse.ArgumentParser(description='article -> article.json + figures'); ap.add_argument('input', nargs='?'); ap.add_argument('--out', required=True)
    ap.add_argument('--text', help='"-" reads the article from stdin'); ap.add_argument('--url'); ap.add_argument('--lang', default=''); ap.add_argument('--meta', nargs='*', default=[])
    ap.add_argument('--max-images', type=int, default=12); ap.add_argument('--max-mb', type=int, default=25); ap.add_argument('--no-images', action='store_true'); ap.add_argument('--max-chars', type=int, default=200000)
    A = ap.parse_args(); out = os.path.abspath(A.out); os.makedirs(out, exist_ok=True)
    over = {}
    for kv in A.meta:
        if '=' in kv: k, v = kv.split('=', 1); over[k.strip().lower()] = v.strip()
    fetch_fn = None; base_file = None; base_url = ''
    if A.url:
        import netguard
        fetch_fn = lambda u, mb: netguard.fetch(u, max_bytes=mb, timeout=25, accept=('image/png', 'image/jpeg', 'image/webp', 'image/*'))
        try: final, ct, data = netguard.fetch(A.url, max_bytes=3_000_000, timeout=25)
        except netguard.NetError as e: sys.exit('url refused or failed: %s' % e)
        raw = data.decode('utf-8', 'replace'); base_url = final; is_html = 'html' in ct or '<html' in raw[:2000].lower() or '<p' in raw[:5000]
        if not is_html: meta, blocks = parse_text(raw, final.lower().endswith('.md'))
        else: meta, blocks, _ = parse_html(raw, final)
        over.setdefault('url', final)
    elif A.text == '-':
        raw = sys.stdin.read(A.max_chars * 2); is_html = bool(re.search(r'<(p|h[1-4]|article)[ >]', raw[:5000])); meta, blocks = (parse_html(raw)[:2] if is_html else parse_text(raw, True))
    elif A.input:
        base_file = os.path.abspath(A.input)
        if not os.path.isfile(base_file): sys.exit('no such file: ' + base_file)
        ext = os.path.splitext(base_file)[1].lower()
        if ext not in ('.md', '.markdown', '.txt', '.html', '.htm'): sys.exit('an article is a .md, .txt or .html file (got %s)' % (ext or 'no extension'))
        if os.path.getsize(base_file) > 5 * 1024 * 1024: sys.exit('the article file is over 5 MB')
        raw = open(base_file, encoding='utf-8', errors='replace').read()
        if ext in ('.html', '.htm'): meta, blocks, _ = parse_html(raw, over.get('url', ''))
        else: meta, blocks = parse_text(raw, ext != '.txt')
        base_url = over.get('url', '') if re.match(r'https?://', over.get('url', '')) else ''
    else: ap.error('give a file, --text - or --url')
    if len(raw) > A.max_chars * 2: print('note: the text is very long; only the first %d characters are read' % (A.max_chars * 2))
    meta = {**meta, **over}
    art = build(meta, blocks, A.lang or over.get('lang', ''))
    if A.url or base_url: art['url'] = over.get('url') or art['url']
    tot = 0
    for s in art['sections']:
        for p in s['paragraphs']:
            tot += len(p['text'])
            if tot > A.max_chars: p['text'] = p['text'][:max(0, len(p['text']) - (tot - A.max_chars))]
    if not A.no_images and art['figures']: collect_figures(art, out, base_file=base_file, base_url=base_url, fetch_fn=fetch_fn, max_images=A.max_images, max_bytes=A.max_mb * 1048576)
    elif A.no_images:
        for f in art['figures']: f['file'] = None; f['error'] = 'not collected (--no-images)'
    write_out(art, out)
    print('article: "%s" | %s | %d words | %d section(s) | %d/%d figure(s) usable | in %s' % (art['title'], art['lang'], art['words'], len(art['sections']), sum(1 for f in art['figures'] if f.get('file')), len(art['figures']), out))
    print(RIGHTS)

if __name__ == '__main__': main()
