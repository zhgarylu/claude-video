#!/usr/bin/env python3
"""Package a finished film for handing over: the master, other shapes, a size-capped copy, cover candidates, checks, and a plain-language note.

  .venv/bin/python tools/deliver.py films/x/x.mp4 [--srt x.srt] [--shape 9x16 --shape 1x1] [--fit pad|crop] [--focus 0.5]
                                    [--max-mb 50] [--out films/x/delivery]

Writes <out>/ (default: next to the film):
  <name>.mp4 (+ .srt)         the master, copied as it is
  <name>_9x16.mp4 ...         each --shape you ask for. pad = the whole picture on a blurred copy of itself (nothing is cut, but a 16:9 film in 9:16
                              fills a third of the screen); crop = a window of the picture, --focus 0..1 picks where (0.5 = centre). The .srt stays valid.
  <name>_max50mb.mp4          a copy re-encoded to fit --max-mb (bitrate from the length; it reports the real size and says if it missed)
  covers/                     five candidate frames (not near the start or end) and a sheet to choose from; poster.jpg is copied too if it exists
  check.md                    tools/check.py on the master (picture, loudness, black frames, subtitle timing)
  DELIVERY.md                 what is here, what was checked, and what was NOT (written for the person who receives it)
Every output is probed afterwards (duration within 0.1 s of the master, has audio, size). Limits: this ffmpeg build may lack libass, so subtitles are
never burned in here (a film that needs burned-in subtitles draws them in its page); platform rules (size, length, ratio) change, so none are
built in: pass what the platform asks for (--shape, --max-mb) and check its upload page. It never uploads or publishes."""
import argparse, json, os, shutil, subprocess, sys, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('film'); ap.add_argument('--srt'); ap.add_argument('--shape', action='append', default=[], choices=['9x16', '16x9', '1x1', '4x5'])
ap.add_argument('--fit', default='pad', choices=['pad', 'crop']); ap.add_argument('--focus', type=float, default=.5)
ap.add_argument('--max-mb', type=float); ap.add_argument('--out'); ap.add_argument('--title', default='')
A = ap.parse_args()
die = lambda m: sys.exit('deliver: ' + m)
run = lambda *c: subprocess.run(c, capture_output=True, text=True)
film = os.path.abspath(A.film)
if not os.path.isfile(film): die('no such film: ' + film)
if not shutil.which('ffmpeg'): die('ffmpeg is missing')
def probe(p):
    r = run('ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration,size', '-of', 'json', p)
    try: j = json.loads(r.stdout)
    except Exception: return None
    v = next((s for s in j['streams'] if s['codec_type'] == 'video'), None)
    if not v: return None
    return {'w': v['width'], 'h': v['height'], 'dur': float(j['format']['duration']), 'mb': int(j['format']['size']) / 1e6, 'audio': any(s['codec_type'] == 'audio' for s in j['streams'])}
M = probe(film)
if not M: die('ffprobe cannot read the film')
name = os.path.splitext(os.path.basename(film))[0]; src_dir = os.path.dirname(film)
OUT = os.path.abspath(A.out or os.path.join(src_dir, 'delivery')); os.makedirs(OUT, exist_ok=True)
srt = A.srt or os.path.join(src_dir, name + '.srt'); srt = srt if os.path.isfile(srt) else None
made = []; notes = []; bad = []
def rel(p): return os.path.relpath(p, OUT)
shutil.copy2(film, os.path.join(OUT, name + '.mp4')); made.append((name + '.mp4', f'母版 {M["w"]}×{M["h"]}，{M["dur"]:.1f} 秒，{M["mb"]:.1f} MB'))
if srt: shutil.copy2(srt, os.path.join(OUT, name + '.srt')); made.append((name + '.srt', '字幕文件（软字幕，播放器或平台上传时另传）'))
else: notes.append('没有 .srt：如果片子的字幕是画在画面里的就没问题；否则平台上要自己加字幕。')

SHAPES = {'9x16': (1080, 1920), '16x9': (1920, 1080), '1x1': (1080, 1080), '4x5': (1080, 1350)}
def verify(p, label):
    q = probe(p)
    if not q: bad.append(f'{label}: 无法读取'); return None
    if abs(q['dur'] - M['dur']) > .1: bad.append(f'{label}: 时长 {q["dur"]:.2f} s 与母版 {M["dur"]:.2f} s 不一致')
    if M['audio'] and not q['audio']: bad.append(f'{label}: 丢了音轨')
    return q
for sh in dict.fromkeys(A.shape):
    W, H = SHAPES[sh]
    if abs(M['w'] / M['h'] - W / H) < .01: notes.append(f'--shape {sh}: 母版已经是这个比例，没有重复生成。'); continue
    outp = os.path.join(OUT, f'{name}_{sh}.mp4')
    if A.fit == 'pad':
        fc = f'[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=40:6,eq=brightness=-0.08[bg];[0:v]scale={W}:{H}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[o]'
        # the share of the screen the film keeps
        sc = min(W / M['w'], H / M['h']); share = (M['w'] * sc * M['h'] * sc) / (W * H)
        desc = f'整幅画面放在模糊底上，只占屏幕 {share * 100:.0f}%'
        if share < .45: notes.append(f'{sh}（pad）：原片只占屏幕 {share * 100:.0f}%，字幕和细节会很小；要做竖屏，重新按 --aspect {sh} 做片效果好得多。')
    else:
        cw = min(M['w'], round(M['h'] * W / H)); ch = min(M['h'], round(M['w'] * H / W)); cw -= cw % 2; ch -= ch % 2
        fc = f'[0:v]crop={cw}:{ch}:max(0\\,min(iw-{cw}\\,(iw-{cw})*{A.focus})):max(0\\,min(ih-{ch}\\,(ih-{ch})*{A.focus})),scale={W}:{H},format=yuv420p[o]'
        desc = f'裁出画面 {cw}×{ch}（焦点 {A.focus}），两侧或上下的内容被切掉'
        notes.append(f'{sh}（crop）：被裁掉的部分看不到；字幕画在画面里的片子，字幕可能被裁。请看一遍。')
    r = run('ffmpeg', '-v', 'error', '-y', '-i', film, '-filter_complex', fc, '-map', '[o]', '-map', '0:a?', '-c:v', 'libx264', '-crf', '19', '-preset', 'medium', '-c:a', 'copy', '-movflags', '+faststart', outp)
    if r.returncode: bad.append(f'{sh}: ffmpeg 失败 {r.stderr[-200:]}'); continue
    q = verify(outp, sh)
    if q: made.append((os.path.basename(outp), f'{W}×{H}，{desc}，{q["mb"]:.1f} MB'))

if A.max_mb:
    br = int(A.max_mb * 8192 * .96 / M['dur']) - (128 if M['audio'] else 0)
    if br < 300: notes.append(f'--max-mb {A.max_mb:g}: 按 {M["dur"]:.0f} 秒算，视频只剩 {br} kbps，画质会很差。')
    outp = os.path.join(OUT, f'{name}_max{A.max_mb:g}mb.mp4'); br = max(br, 150)
    r = run('ffmpeg', '-v', 'error', '-y', '-i', film, '-c:v', 'libx264', '-b:v', f'{br}k', '-maxrate', f'{int(br * 1.25)}k', '-bufsize', f'{br * 2}k', '-preset', 'slow', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', outp)
    if r.returncode: bad.append('max-mb: ffmpeg 失败 ' + r.stderr[-200:])
    else:
        q = verify(outp, 'max-mb')
        if q:
            ok = q['mb'] <= A.max_mb; made.append((os.path.basename(outp), f'{q["w"]}×{q["h"]}，{q["mb"]:.1f} MB，视频码率 {br} kbps' + ('' if ok else f'，超出 {A.max_mb:g} MB 上限')))
            if not ok: bad.append(f'max-mb: 实际 {q["mb"]:.1f} MB，超过 {A.max_mb:g} MB；换更低的 --max-mb 目标或缩短时长')

# cover candidates
cd = os.path.join(OUT, 'covers'); os.makedirs(cd, exist_ok=True); n = 0
for k, f in enumerate((.15, .3, .45, .6, .8)):
    r = run('ffmpeg', '-v', 'error', '-y', '-ss', f'{M["dur"] * f:.2f}', '-i', film, '-frames:v', '1', '-q:v', '2', os.path.join(cd, f'cover_{k + 1}.jpg')); n += r.returncode == 0
poster = os.path.join(src_dir, 'poster.jpg')
if os.path.isfile(poster): shutil.copy2(poster, os.path.join(cd, 'poster.jpg'))
made.append(('covers/', f'{n} 张候选封面' + ('，另有 poster.jpg' if os.path.isfile(poster) else '') + '。封面取自成片，带着字幕的帧不要直接拿去当封面（用 tools/poster.py 做无字幕海报）'))
try:
    from PIL import Image
    ims = [Image.open(os.path.join(cd, f)) for f in sorted(os.listdir(cd)) if f.startswith('cover_')]
    if ims:
        tw = 480; th = round(tw * ims[0].height / ims[0].width); sheet = Image.new('RGB', (tw * len(ims), th))
        for i, im in enumerate(ims): sheet.paste(im.resize((tw, th)), (i * tw, 0))
        sheet.save(os.path.join(cd, 'sheet.jpg'), quality=85)
except Exception as e: notes.append('封面对照图没做成：' + str(e)[:80])

# check on the master
py = os.path.join(ROOT, '.venv', 'bin', 'python'); py = py if os.path.exists(py) else sys.executable
verdict = '未运行'; lufs = None
chk = os.path.join(ROOT, 'tools', 'check.py')
if os.path.exists(chk):
    cmd = [py, chk, film, '--out', os.path.join(OUT, '_check')] + (['--srt', srt] if srt else [])
    r = run(*cmd); md = os.path.join(OUT, '_check', 'check.md')
    if os.path.exists(md):
        shutil.copy2(md, os.path.join(OUT, 'check.md')); t = open(md, encoding='utf8').read()
        m = re.search(r'loudness: (-?[\d.]+) LUFS', t); lufs = m.group(1) if m else None
        verdict = 'PROBLEM' in t and '有问题' or ('no measurable problems' in t and '没有可测的问题' or '见 check.md')
    shutil.rmtree(os.path.join(OUT, '_check'), ignore_errors=True)
    made.append(('check.md', f'自动检查：{verdict}' + (f'，响度 {lufs} LUFS' if lufs else '')))

# the note
L = [f'# 交付说明：{A.title or name}', '', '## 文件', '', '| 文件 | 说明 |', '|---|---|'] + [f'| `{a}` | {b} |' for a, b in made]
L += ['', '## 没有核实的（请知悉）', '', '- 声音没有人听过，只有响度、削波、静音这些可测项的检查。', '- 画面里的事实、数字、名称没有逐条核对；有事实核对表（`facts.md`）的片子以它为准。',
      '- 平台的尺寸、时长、码率规则会变，这里没有内置；上传前请对照平台页面，必要时用 `--shape`、`--max-mb` 重新出。', '- 字幕没有烧进画面（`.srt` 是软字幕）；画在画面里的字幕不受影响。']
if notes: L += ['', '## 这次的提醒', ''] + [f'- {x}' for x in notes]
if bad: L += ['', '## 出现的问题', ''] + [f'- **{x}**' for x in bad]
L += ['', '素材与授权见项目目录里的 `CREDITS`；你使用的图片、音乐、商标的权利由你自己负责。']
open(os.path.join(OUT, 'DELIVERY.md'), 'w', encoding='utf8').write('\n'.join(L) + '\n')
print('\n'.join(f'  {a:<28} {b}' for a, b in made)); [print('  note:', x) for x in notes]; [print('  PROBLEM:', x) for x in bad]
print('wrote', os.path.join(OUT, 'DELIVERY.md')); sys.exit(1 if bad else 0)
