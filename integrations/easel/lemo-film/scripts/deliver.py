#!/usr/bin/env python3
"""lemo-film helper for Easel: check the machine, then hand a finished film over to Easel's outputs/ folder.

  deliver.py doctor
  deliver.py deliver --film films/x/x.mp4 --topic "主题名" --title "成片标题" [--srt x.srt] [--style slug] [--aspect 9x16]
                     [--cover poster.jpg] [--source "依据/链接" ...] [--note "…"] [--outputs outputs]

Standard library only. Finds the lemo-opuscar library from $LEMO_OPUSCAR_HOME, ~/lemo-opuscar, or by walking up from this file / the film.
`deliver` copies final.mp4 (+ final.srt), makes cover.jpg (the film's poster.jpg if there is one next to it, else a frame without trusting subtitles),
runs the library's tools/check.py when found, and writes meta.json and check.md. It never logs in anywhere, publishes, or edits titles."""
import argparse, json, os, shutil, subprocess, sys, re, time

def run(*c, **k): return subprocess.run(c, capture_output=True, text=True, **k)
def find_lib(hint=None):
    cands = [hint, os.environ.get('LEMO_OPUSCAR_HOME'), os.path.expanduser('~/lemo-opuscar')]
    p = os.path.abspath(os.path.dirname(__file__))
    for _ in range(8):
        cands.append(p); cands.append(os.path.join(p, 'lemo-opuscar')); p = os.path.dirname(p)
    for c in cands:
        if c and os.path.isfile(os.path.join(c, 'core', 'render', 'video.mjs')): return os.path.abspath(c)
    return None
def probe(path):
    r = run('ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration,size', '-of', 'json', path)
    try: j = json.loads(r.stdout)
    except Exception: return None
    v = next((s for s in j.get('streams', []) if s['codec_type'] == 'video'), None); a = any(s['codec_type'] == 'audio' for s in j.get('streams', []))
    if not v: return None
    return {'w': int(v['width']), 'h': int(v['height']), 'dur': float(j['format']['duration']), 'size_mb': round(int(j['format']['size']) / 1e6, 1), 'audio': a}

def doctor(a):
    ok = True; lib = find_lib(a.lib)
    def line(good, msg): 
        nonlocal ok; ok = ok and good; print(('  ok   ' if good else '  FAIL ') + msg)
    print('lemo-film environment')
    line(lib is not None, 'library: %s' % (lib or 'not found. Set LEMO_OPUSCAR_HOME or clone it and run: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps'))
    nv = run('node', '--version').stdout.strip() if shutil.which('node') else ''
    line(bool(nv) and int(re.sub(r'\D.*', '', nv.lstrip('v')) or 0) >= 20, 'node %s (need >= 20)' % (nv or 'missing'))
    line(bool(shutil.which('ffmpeg') and shutil.which('ffprobe')), 'ffmpeg / ffprobe %s' % ('found' if shutil.which('ffmpeg') else 'missing'))
    if lib:
        py = os.path.join(lib, '.venv', 'bin', 'python'); line(os.path.exists(py) or os.path.exists(py + '.exe'), 'library python (.venv): %s' % ('found' if os.path.exists(py) else 'missing: run setup.sh deps'))
        n = len([d for d in os.listdir(os.path.join(lib, 'styles')) if os.path.exists(os.path.join(lib, 'styles', d, 'style.json'))]) if os.path.isdir(os.path.join(lib, 'styles')) else 0
        line(n > 0, '%d styles found' % n)
        line(os.path.isdir(os.path.join(lib, 'node_modules', 'playwright-core')), 'headless browser package (npm install)' )
    print('\nready' if ok else '\nnot ready: fix the FAIL lines first (do not work around them)'); return 0 if ok else 1

def deliver(a):
    film = os.path.abspath(a.film)
    if not os.path.isfile(film): sys.exit('no such film: ' + film)
    info = probe(film)
    if not info: sys.exit('ffprobe cannot read the film')
    aspect = '9x16' if info['h'] > info['w'] else '1x1' if info['h'] == info['w'] else '16x9'
    if a.aspect and a.aspect != aspect: sys.exit('the film is %s (%dx%d) but the confirmed aspect was %s: do not deliver a mismatched film; re-render or ask the user.' % (aspect, info['w'], info['h'], a.aspect))
    lib = find_lib(a.lib); safe = re.sub(r'[\\/:*?"<>|]+', '_', a.topic).strip() or 'film'
    out = os.path.join(a.outputs, safe); os.makedirs(out, exist_ok=True)
    shutil.copy2(film, os.path.join(out, 'final.mp4'))
    srt = a.srt or os.path.splitext(film)[0] + '.srt'
    if os.path.isfile(srt): shutil.copy2(srt, os.path.join(out, 'final.srt'))
    cover = a.cover or os.path.join(os.path.dirname(film), 'poster.jpg')
    if os.path.isfile(cover): shutil.copy2(cover, os.path.join(out, 'cover.jpg')); cover_from = os.path.basename(cover)
    else:
        t = info['dur'] * .35; r = run('ffmpeg', '-v', 'error', '-y', '-ss', '%.2f' % t, '-i', film, '-frames:v', '1', '-q:v', '3', os.path.join(out, 'cover.jpg')); cover_from = 'frame at %.1f s (may carry burned-in subtitles)' % t
    check = {'ran': False}
    if lib:
        py = os.path.join(lib, '.venv', 'bin', 'python'); py = py if os.path.exists(py) else sys.executable
        cmd = [py, os.path.join(lib, 'tools', 'check.py'), os.path.join(out, 'final.mp4'), '--out', os.path.join(out, '_check')]
        if os.path.isfile(os.path.join(out, 'final.srt')): cmd += ['--srt', os.path.join(out, 'final.srt')]
        if os.path.exists(os.path.join(lib, 'tools', 'check.py')):
            r = run(*cmd); md = os.path.join(out, '_check', 'check.md')
            if os.path.exists(md): shutil.copy2(md, os.path.join(out, 'check.md'))
            m = re.search(r'loudness: (-?[\d.]+) LUFS', r.stdout); check = {'ran': True, 'exit': r.returncode, 'lufs': float(m.group(1)) if m else None, 'verdict': 'problems found' if r.returncode else 'no measurable problems'}
            shutil.rmtree(os.path.join(out, '_check'), ignore_errors=True)
    style = None
    if a.style and lib and os.path.isfile(os.path.join(lib, 'styles', a.style, 'style.json')):
        s = json.load(open(os.path.join(lib, 'styles', a.style, 'style.json'), encoding='utf8')); style = {'slug': a.style, 'en': s.get('en'), 'cn': s.get('cn')}
    elif a.style: style = {'slug': a.style}
    commit = run('git', '-C', lib, 'rev-parse', '--short', 'HEAD').stdout.strip() if lib and shutil.which('git') else ''
    meta = {'title': a.title or a.topic, 'topic': a.topic, 'style': style, 'aspect': aspect, 'size': [info['w'], info['h']], 'duration_s': round(info['dur'], 1), 'file_mb': info['size_mb'], 'has_audio': info['audio'],
            'cover': cover_from, 'check': check, 'sources': a.source or [], 'notes': a.note or [], 'made_with': {'tool': 'lemo-opuscar', 'commit': commit or None},
            'credit': 'none: this film belongs to the user; no watermark or sign-off was added',
            'unverified': ['the sound was not listened to by a person', 'facts and on-screen text were not independently reviewed unless listed in sources'], 'delivered_at': time.strftime('%Y-%m-%d %H:%M:%S')}
    json.dump(meta, open(os.path.join(out, 'meta.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('delivered to %s' % out)
    for f in sorted(os.listdir(out)): print('  ' + f)
    print('check: %s%s' % (check.get('verdict', 'not run (library not found)'), ' (%.1f LUFS)' % check['lufs'] if check.get('lufs') else ''))
    print('next: tell the user what is unverified (see meta.json), and hand the files to Easel\'s publish center. This tool does not publish.')
    return 0

ap = argparse.ArgumentParser(); sp = ap.add_subparsers(dest='cmd', required=True)
d = sp.add_parser('doctor'); d.add_argument('--lib'); d.set_defaults(fn=doctor)
e = sp.add_parser('deliver'); e.add_argument('--film', required=True); e.add_argument('--topic', required=True); e.add_argument('--title'); e.add_argument('--srt'); e.add_argument('--style'); e.add_argument('--aspect', choices=['16x9', '9x16', '1x1'])
e.add_argument('--cover'); e.add_argument('--source', action='append'); e.add_argument('--note', action='append'); e.add_argument('--outputs', default='outputs'); e.add_argument('--lib'); e.set_defaults(fn=deliver)
a = ap.parse_args(); sys.exit(a.fn(a))
