#!/usr/bin/env python3
"""Structure mode: remake the SHAPE of a reference video in a library style with NEW content. Nothing of the source (footage, voice, music, characters, wording) is used.

  .venv/bin/python tools/remake/structure.py plan <remake dir> --topic "…" [--style slug] [--target 60] [--out films/<name>/TREATMENT.md] [--lang zh|en]

Runs tools/teardown/treatment.py on <remake dir>/teardown/ (beats, numbers to carry over, structure A with seconds and characters per beat, the empty sections of
DIRECTOR.md §4) and appends "A remake sheet": one row per source beat with the source's length, the word / character budget for YOUR script at the target length,
the role of the on-screen text (caption, title, label), the camera move, how busy the shot is, and an empty column for your new content. Also writes
structure-plan.json next to it (the same rows, for tools). It prints the rights reminder and refuses nothing: the rule is that the source's own material stays out."""
import argparse, json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.path.dirname(os.path.dirname(HERE))
PY = os.path.join(LIB, '.venv/bin/python'); PY = PY if os.path.exists(PY) else sys.executable
sys.path.insert(0, HERE)
import remake as RM

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter); sp = ap.add_subparsers(dest='cmd', required=True)
p = sp.add_parser('plan'); p.add_argument('remake'); p.add_argument('--topic', required=True); p.add_argument('--style'); p.add_argument('--target', type=float); p.add_argument('--out'); p.add_argument('--lang', choices=['zh', 'en'])
A = ap.parse_args()
d = A.remake if os.path.isdir(A.remake) else os.path.dirname(A.remake)
R = json.load(open(os.path.join(d, 'remake.json'), encoding='utf8')); td = os.path.join(d, 'teardown')
print(RM.RIGHTS); print('For structure mode: take the beats, the lengths, the text roles and the camera grammar; leave the footage, voice, music, characters and wording behind.\n')
lang = A.lang or ('zh' if (R['audio'].get('language') or 'en').startswith('zh') else 'en'); zh = lang == 'zh'
out = os.path.abspath(A.out or os.path.join(d, 'TREATMENT.md'))
cmd = [PY, os.path.join(LIB, 'tools/teardown/treatment.py'), td, '--topic', A.topic, '--out', out, '--lang', lang] + (['--style', A.style] if A.style else []) + (['--target', str(A.target)] if A.target else [])
r = subprocess.run(cmd, capture_output=True, text=True); print(r.stdout.strip())
if r.returncode: sys.exit(r.stderr[-500:])
out = next((l.split('wrote ')[-1].split(' (')[0] for l in r.stdout.splitlines() if l.startswith('wrote ')), out); out = r.stdout.split('writing ')[1].split(' (')[0] if 'writing ' in r.stdout else out

# same beat rule as treatment.py: shots shorter than 2 s join the next one
dur = R['source']['duration']; target = A.target or round(dur); k = target / dur; aud = R['audio']
cps = aud.get('chars_per_sec') or (5.0 if zh else 14.0); share = aud.get('speech_share') or .9
beats = []; cur = None
for s in R['shots']:
    if cur is None: cur = dict(t0=s['t0'], t1=s['t1'], shots=[s])
    else: cur['t1'] = s['t1']; cur['shots'].append(s)
    if cur['t1'] - cur['t0'] >= 2.0: beats.append(cur); cur = None
if cur:
    if beats: beats[-1]['t1'] = cur['t1']; beats[-1]['shots'] += cur['shots']
    else: beats.append(cur)
rows = []
for i, b in enumerate(beats):
    ids = [t for s in b['shots'] for t in s['texts']]; T = [t for t in R['texts'] if t['id'] in set(ids)]; roles = {}
    for t in T: roles[t['role']] = roles.get(t['role'], 0) + 1
    ws = [w for w in R['words'] if b['t0'] <= w['t0'] < b['t1']]; chars = sum(len(re.sub(r'\s', '', w['w'])) for w in ws); big = max(b['shots'], key=lambda s: s['len'])
    ys = [t['box']['y'] + t['box']['h'] / 2 for t in T if t['role'] == 'caption']
    rows.append({'beat': i + 1, 't0': round(b['t0'], 2), 't1': round(b['t1'], 2), 'source_len': round(b['t1'] - b['t0'], 2), 'target_len': round((b['t1'] - b['t0']) * k, 2), 'source_words': len(ws), 'source_chars': chars,
                 'char_budget': round((b['t1'] - b['t0']) * k * cps * share), 'text_roles': roles, 'caption_y': round(sum(ys) / len(ys), 2) if ys else None, 'camera': big['camera'], 'activity': big['activity'], 'shots': len(b['shots']), 'new_content': ''})
unit = '字' if zh else 'chars'
md = ['', '## ' + ('11. 重制表（结构模式）' if zh else '11. Remake sheet (structure mode)'), '',
      ('每个节拍一行：参考片的长度、你的脚本的%s预算（目标 %.0f 秒，语速 %s %s/秒）、画面文字的角色、镜头。最后一列写**你自己的**内容。' if zh else 'One row per source beat: its length, the %s budget for your script (target %.0f s, %s %s/s), the roles of the on-screen text, the camera. Write YOUR content in the last column.') % (unit, target, cps, unit), '',
      '| # | source s | target s | ' + unit + ' budget | on-screen text roles | caption line y | camera / activity | ' + ('你的内容' if zh else 'your content') + ' |', '|---|---|---|---|---|---|---|---|']
for r_ in rows: md.append('| %d | %.1f–%.1f (%.1f) | %.1f | %d | %s | %s | %s / %s | TODO |' % (r_['beat'], r_['t0'], r_['t1'], r_['source_len'], r_['target_len'], r_['char_budget'], ', '.join('%s×%d' % kv for kv in r_['text_roles'].items()) or '-', r_['caption_y'] if r_['caption_y'] is not None else '-', r_['camera'], r_['activity']))
md += ['', ('参考片的画面文字只用来看它在画面上扮演什么角色（字幕、标题、标签），不要用它的字。' if zh else 'The source\'s on-screen text is listed only for the role it plays (caption, title, label). Do not reuse its words.'), '']
open(out, 'a', encoding='utf8').write('\n'.join(md) + '\n'); json.dump({'topic': A.topic, 'style': A.style, 'target': target, 'beats': rows}, open(os.path.join(os.path.dirname(out), 'structure-plan.json'), 'w'), ensure_ascii=False, indent=1)
print('appended the remake sheet (%d beats) to %s, and wrote structure-plan.json' % (len(rows), out))
