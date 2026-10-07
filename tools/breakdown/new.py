"""Start a demo-breakdown project: copies the page template, puts the footage in src/, writes a breakdown.json with one shot of each type to edit.

  .venv/bin/python tools/breakdown/new.py films/<name> --source <video> [--source name=<video> ...] [--aspect 16x9|9x16] [--theme dark|light] [--title "…"] [--link]

--link makes src/ a symlink to the original instead of copying it (for long videos). Nothing is downloaded or re-encoded; the footage is used as given."""
import argparse, json, os, shutil, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser(); ap.add_argument('project'); ap.add_argument('--source', action='append', required=True); ap.add_argument('--aspect', default='16x9', choices=['16x9', '9x16'])
ap.add_argument('--theme', default='dark', choices=['dark', 'light']); ap.add_argument('--title', default='实录解读'); ap.add_argument('--link', action='store_true')
A = ap.parse_args(); P = os.path.abspath(A.project)
if os.path.exists(os.path.join(P, 'breakdown.json')): sys.exit('%s already has a breakdown.json' % P)
os.makedirs(os.path.join(P, 'src'), exist_ok=True)
for f in ('index.html', 'main.js'): shutil.copy(os.path.join(HERE, 'template', f), os.path.join(P, f))
sources = {}; durs = {}
for i, s in enumerate(A.source):
    name, path = s.split('=', 1) if '=' in s and not os.path.exists(s) else (('main' if i == 0 else 'src%d' % (i + 1)), s)
    path = os.path.abspath(path)
    if not os.path.exists(path): sys.exit('no such file: ' + path)
    dst = os.path.join(P, 'src', os.path.basename(path))
    if not os.path.exists(dst): (os.symlink if A.link else shutil.copy)(path, dst)
    durs[name] = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout)
    sources[name] = {'file': 'src/' + os.path.basename(path), 'title': os.path.basename(path), 'url': '', 'licence': '', 'credit': ''}
k = next(iter(sources)); d = durs[k]
spec = {'title': A.title, 'series': '实录解读', 'lang': 'zh', 'aspect': A.aspect, 'fps': 24, 'theme': A.theme, 'voice': {'name': 'zh-CN-YunxiNeural', 'rate': '+0%'},
        'tag': '官方演示 · 节选', 'sources': sources, 'sections': ['第一个看点', '第二个看点'],
        'shots': [
          {'id': 'hook', 'type': 'hook', 'kicker': '实录解读', 'title': '一句话说清这段演示', 'sub': '来源与节选', 'meta': ['来源：…', '节选 30 秒'], 'say': '先看结论，再看它是怎么做到的。'},
          {'id': 'c1', 'type': 'clip', 'section': 1, 'in': 0, 'out': round(min(8, d), 1), 'sound': 'duck', 'lower': {'title': '产品名', 'sub': '一句话说明'}, 'say': '画面里发生了什么。'},
          {'id': 'f1', 'type': 'freeze', 'section': 1, 't': round(min(6, d - .1), 1), 'crop': [0.3, 0.3, 0.4, 0.4], 'boxes': [{'rect': [0.4, 0.4, 0.2, 0.2], 'label': '看这里'}],
           'markers': [{'n': 1, 'at': [0.5, 0.5], 'text': '关键一点', 'dir': 'r'}], 'card': {'side': 'r', 'title': '产品在做什么', 'body': '只写画面能证明的事。'}, 'say': '停一下，这一处是产品的工作。'},
          {'id': 'e1', 'type': 'explain', 'kind': 'flow', 'section': 1, 'title': '它大概是这样跑的', 'nodes': [{'label': '输入', 'sub': '用户给了什么'}, {'label': '处理', 'sub': '我们的推测'}, {'label': '结果', 'sub': '画面里看到的'}], 'basis': '演示片 0:00–0:08 · 内部流程为推测', 'say': '我们的理解是：输入、处理、结果。内部怎么做，演示里没说。'},
          {'id': 'cmp', 'type': 'compare', 'title': '看到的与没看到的', 'left': {'title': '演示里看到的', 'items': ['…']}, 'right': {'title': '演示里没说的', 'items': ['…']}, 'verdict': '一句话结论', 'basis': '演示片全程', 'say': '总结一下。'}]}
json.dump(spec, open(os.path.join(P, 'breakdown.json'), 'w'), ensure_ascii=False, indent=1)
print('project in %s\nnext: edit breakdown.json (see tools/breakdown/README.md), then sh tools/breakdown/build.sh %s' % (P, A.project))
