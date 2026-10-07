"""First-draft shot list for an article project (called by new.py --article). Structure: hook -> for each of up to four sections a quote and its figures
-> after the first figure an original diagram (stamped) -> takeaways with the source. Everything the author must write is a "TODO ..." string."""
import json, os, re, shutil

def _shorten(t, n):
    t = re.sub(r'\s+', ' ', t or '').strip()
    return t if len(t) <= n else t[:n - 1].rstrip() + '…'
def _sentences(t): return [x.strip() for x in re.split(r'(?<=[。！？!?；])|(?<=[.!?])\s+(?=[A-Z0-9“"(])', t) if x and x.strip()]
def _pick_quote(sec, zh):
    lo, hi = (18, 90) if zh else (60, 190); best = None
    for p in sec['paragraphs']:
        for s in _sentences(p['text']):
            if lo <= len(s) <= hi and (best is None or (re.search(r'\d', s) and not re.search(r'\d', best[0]))): best = (s, p['id'])
            if best and p['id'] == sec['paragraphs'][0]['id']: break
        if best: break
    if not best:
        p = sec['paragraphs'][0]; best = (_shorten(_sentences(p['text'])[0] if _sentences(p['text']) else p['text'], hi), p['id'])
    return best

def make(art_dir, P, A):
    ad = art_dir if os.path.exists(os.path.join(art_dir, 'article.json')) else os.path.join(art_dir, 'article')
    art = json.load(open(os.path.join(ad, 'article.json'), encoding='utf8')); film_lang = (getattr(A, 'lang', '') or art.get('lang', 'en')); zh = film_lang in ('zh', 'yue', 'ja')
    os.makedirs(os.path.join(P, 'article'), exist_ok=True)
    for f in ('article.json', 'article.md'):
        if os.path.abspath(os.path.join(ad, f)) != os.path.abspath(os.path.join(P, 'article', f)): shutil.copy(os.path.join(ad, f), os.path.join(P, 'article', f))
    sources = {}; figs = {f['id']: f for f in art['figures'] if f.get('file')}
    for fid, f in figs.items():
        dst = os.path.join(P, 'src', fid + os.path.splitext(f['file'])[1]); src = os.path.join(ad, f['file'])
        if not os.path.exists(dst): (os.symlink if getattr(A, 'link', False) else shutil.copy)(os.path.abspath(src), dst)
        sources[fid] = {'file': 'src/' + os.path.basename(dst), 'title': f.get('caption') or f.get('alt') or ('Figure ' + fid[1:]), 'caption': _shorten(f.get('caption') or f.get('alt') or '', 70), 'url': art.get('url', ''),
                        'credit': art.get('site') or art.get('title') or '', 'licence': ''}
    secs = [s for s in art['sections'] if s['paragraphs']][:4]
    names = [_shorten(s['heading'], 6 if zh else 14) or ('TODO 章节' if zh else 'TODO part') for s in secs]
    T = (lambda zhs, ens: ('TODO ' + zhs) if zh else ('TODO ' + ens))
    shots = [{'id': 'hook', 'type': 'hook', 'kicker': '图文解读' if zh else 'Article, explained', 'title': _shorten(art.get('title'), 30 if zh else 48), 'sub': T('一句话说清这篇文章讲了什么', 'one line: what the article says'),
              'meta': [x for x in (art.get('site'), art.get('date')) if x][:3], 'say': T('开场：先给结论。', 'opening: the finding first.')}]
    used_fig = 0; diagram_done = False
    for i, sec in enumerate(secs):
        text, ref = _pick_quote(sec, zh)
        shots.append({'id': 'q%d' % (i + 1), 'type': 'quote', 'section': i + 1, 'text': text, 'ref': ref, 'marks': [], 'say': T('用自己的话带出这句原文，或朗读它。', 'introduce the sentence in your own words, or read it.')})
        for fid in sec['figures']:
            if fid not in figs or used_fig >= 4: continue
            used_fig += 1
            shots.append({'id': 'fig%d' % used_fig, 'type': 'figure', 'section': i + 1, 'src': fid, 'crop': None, 'boxes': [{'rect': [0.1, 0.1, 0.3, 0.3], 'label': T('看这里', 'look here')}],
                          'markers': [{'n': 1, 'at': [0.25, 0.25], 'text': T('这一处说明什么', 'what this shows')}], 'card': {'title': T('图里的发现', 'what the figure shows'), 'body': T('只写图能证明的一句话。', 'one sentence the figure proves.')}, 'say': T('先说图画了什么，再说它支持哪句话。', 'what the figure draws, then which sentence it supports.')})
            if not diagram_done:
                diagram_done = True
                shots.append({'id': 'e1', 'type': 'explain', 'kind': 'flow', 'section': i + 1, 'title': T('我们的示意', 'our diagram'), 'nodes': [{'label': T('输入', 'in'), 'sub': ''}, {'label': T('过程', 'how')}, {'label': T('结果', 'out')}],
                              'basis': _shorten(art.get('title'), 30) + ' · TODO', 'say': T('用一张自己的图把原文的道理画出来，并说明哪部分是我们的理解。', 'redraw the article\'s idea in our own diagram and say what is our reading.')})
    shots.append({'id': 'take', 'type': 'compare', 'title': T('带走的三点', 'three takeaways'), 'left': {'title': T('原文说了', 'the article says'), 'items': ['TODO']}, 'right': {'title': T('原文没说', 'it does not say'), 'items': ['TODO']},
                  'verdict': T('一句话结论', 'one-line verdict'), 'basis': _shorten(art.get('title'), 30) + ((' · ' + art['site']) if art.get('site') else ''), 'say': T('总结，并交代出处。', 'sum up and name the source.')})
    # a crop of None is not a crop
    for s in shots:
        if s.get('crop') is None: s.pop('crop', None)
    voice = {'name': 'zh-CN-YunxiNeural' if zh else 'en-US-GuyNeural', 'rate': '+0%'}
    return {'title': _shorten(art.get('title') or A.title, 30), 'series': '图文解读' if zh else 'Article, explained', 'lang': 'zh' if zh else film_lang, 'aspect': A.aspect, 'fps': 24, 'theme': A.theme, 'voice': voice, 'music': {'bpm': 92, 'level': 1.0},
            'article': {'title': art.get('title', ''), 'author': art.get('author', ''), 'site': art.get('site', ''), 'url': art.get('url', ''), 'date': art.get('date', ''), 'licence': ''}, 'sources': sources, 'sections': names, 'shots': shots}
