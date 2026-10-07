#!/usr/bin/env python3
"""Exact mode: duplicate YOUR OWN video as an editable, re-runnable project that the repo's deterministic renderer plays.

  .venv/bin/python tools/remake/exact.py build <video> <remake dir> --out films/<name> --rights own|"licensed: <who>" [--captions cover|keep|clean] [--clean clean.mp4] [--font name-or-path] [--fps N] [--roles caption,title,text]
  .venv/bin/python tools/remake/exact.py render <film> [--workers 3] [--keep-levels] [--no-mux]
  .venv/bin/python tools/remake/exact.py compare <film> [--out dir] [--no-ocr]
  .venv/bin/python tools/remake/exact.py sync <film>                          re-resolve word anchors into seconds (spec.json), after editing cuts or captions
  .venv/bin/python tools/remake/exact.py retext <film> <caption id> "new text"   change a caption; its timing follows the words it is anchored to

<remake dir> is the output of `tools/remake/remake.py analyze`. build writes the project: index.html + main.js (page contract of core/README.md), spec.json (the
editable description: shots, captions, overlays, audio), src/ (frames at the source's own rate, audio.wav, the source copy), fonts/, remake.json, CREDITS, build.sh.
Footage is the source's own frames, so cuts and footage are identical by construction. Captions are live text at the OCR'd boxes. Whether the source's burned-in
text can be removed is the limit: see --captions below and REMAKE.md ("Known limits"). `compare` renders nothing: it measures the finished film against the source.

--captions cover   (default) draw live text AND paint over the original text with a per-row gradient sampled beside the box (works on flat or smooth backgrounds, leaves a smear on busy ones)
--captions keep    do not draw captions: the source's pixels stay as they are (identical picture; the captions are only data in spec.json; editing them changes nothing)
--captions clean   --clean <video without the burned-in text>: the footage frames come from that file, live text is drawn on top (the right way if you have the clean master)
Rights: build refuses without --rights. It records your answer in CREDITS."""
import argparse, glob, json, math, os, re, shutil, subprocess, sys, time
from difflib import SequenceMatcher
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.path.dirname(os.path.dirname(HERE))
PY = os.path.join(LIB, '.venv/bin/python'); PY = PY if os.path.exists(PY) else sys.executable
sys.path.insert(0, HERE)
import remake as RM

def run(*c, **k): return subprocess.run(c, capture_output=True, **k)
def log(*a): print(*a, flush=True)
def even(n): return int(n) // 2 * 2
def jload(p): return json.load(open(p, encoding='utf8'))
def jsave(p, o): json.dump(o, open(p, 'w', encoding='utf8'), ensure_ascii=False, indent=1)

# ───────────────────────────────────────────── fonts: pick the closest OFL face in the repo
def font_candidates():
    """Every .ttf/.otf the library ships in its style demos and films (all Google Fonts under the SIL OFL). Deduplicated by file name."""
    seen = {}; pats = ['styles/*/demo/fonts/*.ttf', 'styles/*/demo/fonts/*.otf', 'films/*/fonts/*.ttf', 'films/*/fonts/*.otf', 'demos/*/fonts/*.ttf']
    for pat in pats:
        for p in sorted(glob.glob(os.path.join(LIB, pat))):
            b = os.path.basename(p)
            if b not in seen and not re.search(r'Bravura|\.sub\.|Silkscreen|PressStart|Rye|Pirata|Unifraktur', b): seen[b] = p
    return seen

_cov = {}
def coverage(path):
    if path not in _cov:
        from fontTools.ttLib import TTFont
        try: f = TTFont(path, lazy=True); _cov[path] = (set(f.getBestCmap().keys()), [(a.axisTag, a.minValue, a.maxValue) for a in f['fvar'].axes] if 'fvar' in f else [])
        except Exception: _cov[path] = (set(), [])
    return _cov[path]

def pil_font(path, size, weight=None):
    f = ImageFont.truetype(path, max(4, int(round(size))))
    if weight:
        try: f.set_variation_by_axes([weight])
        except Exception: pass
    return f

def variants(path):
    cm, axes = coverage(path); wa = next((a for a in axes if a[0] == 'wght'), None)
    if wa: return [(path, w) for w in (300, 400, 500, 700, 900) if wa[1] <= w <= wa[2]]
    return [(path, None)]

def _edges(gray_img):
    from scipy import ndimage as ndi
    g = ndi.gaussian_filter(gray_img.astype(np.float32), 1.0); e = np.hypot(ndi.sobel(g, 0), ndi.sobel(g, 1)); e = ndi.gaussian_filter(e, 1.2)
    return (e - e.mean()) / (e.std() + 1e-6)

def run_ratio(m):
    """Median horizontal run / median vertical run of a binary mask: ~1 for a monoline sans, 1.8+ for a Ming/Song serif (thin horizontals)."""
    def med(a):
        d = np.diff(np.pad(a.astype(np.int8), ((0, 0), (1, 1))), axis=1); st = np.where(d == 1); en = np.where(d == -1)
        L = en[1] - st[1]; return float(np.median(L)) if len(L) else 1.0
    return med(m) / max(0.5, med(m.T))

def render_candidate(path, weight, text, target_w, stroke=0):
    """Render `text` with the face at the size whose advance width is target_w. Returns (size, PIL font, ink bbox (l, top, r, bottom) from the left-baseline origin)."""
    f = pil_font(path, 100, weight); w100 = f.getlength(text) or 1; size = 100 * target_w / w100
    f = pil_font(path, size, weight); l, t, r, b = f.getbbox(text, anchor='ls')
    return (size, f, (l, t, r, b)) if r > l and b > t else None

def score_font(path, weight, text, tgt):
    """How well the face looks like the crop: correlation of the edge maps (colour and background independent), minus a penalty for a wrong ink height at the box width."""
    cm, _ = coverage(path)
    if not all(ord(c) in cm for c in text if not c.isspace()): return -9
    gimg, edges, (px, py, bw, bh), sw, dens_t, rr_t = tgt
    r = render_candidate(path, weight, text, max(8, bw))
    if not r: return -9
    size, f, (l, t, rr, bb) = r; im = Image.new('L', (gimg.shape[1], gimg.shape[0]), 128); d = ImageDraw.Draw(im)
    d.text((px - l, py - t), text, font=f, fill=255, anchor='ls', stroke_width=sw, stroke_fill=0)
    ce = _edges(np.asarray(im)); corr = float((ce * edges).mean()); hpen = abs(math.log(max(1, bb - t) / max(1, bh)))
    f2 = Image.new('L', im.size, 0); ImageDraw.Draw(f2).text((px - l, py - t), text, font=f, fill=255, anchor='ls'); fm_c = np.asarray(f2)[py:py + bh, px:px + bw] > 128; dens_c = float(fm_c.mean())
    return 1.0 * -abs(math.log(max(0.3, run_ratio(fm_c)) / max(0.3, rr_t))) + corr - 1.0 * hpen - 1.5 * min(1.0, abs(dens_c - dens_t) / (dens_t + 0.02))

def choose_fonts(texts, rdir, override=None):
    """One face per role (caption / title / text): the highest mean score over that role's text crops (edge-map correlation, ink height at the box width)."""
    cands = font_candidates(); out = {}
    if override:
        p = override if os.path.isfile(override) else next((v for k, v in cands.items() if override.lower() in k.lower()), None)
        if not p: sys.exit('--font: no such file or repo font: %s (repo fonts: %s)' % (override, ', '.join(sorted(cands))))
        v = variants(p); m = re.search(r'-(\d{3})\b', os.path.basename(p)); w = int(m.group(1)) if m and v[0][1] else None
        return {r: (p, w or (v[-1][1] if len(v) > 1 and v[-1][1] else v[0][1]), {'override': True}) for r in ('caption', 'title', 'text')}
    for role in ('caption', 'title', 'text'):
        ts = [t for t in texts if t['role'] == role and t.get('crop') and os.path.exists(os.path.join(rdir, t['crop'])) and len(t['text'].strip()) >= 2]
        if not ts: continue
        ts = sorted(ts, key=lambda t: -len(t['text']))[:8]; tot = {}; tg = []
        for t in ts:
            g = np.asarray(Image.open(os.path.join(rdir, t['crop'])).convert('L')); bx, by, bw, bh = t['box_px']
            rgb = np.asarray(Image.open(os.path.join(rdir, t['crop'])).convert('RGB')).astype(np.float32); px_, py_ = min(6, bx), min(6, by)
            dens = float((np.sqrt(((rgb[py_:py_ + bh, px_:px_ + bw] - RM.hex2rgb(t['color'])) ** 2).sum(2)) < 60).mean())
            fmt = np.sqrt(((rgb[py_:py_ + bh, px_:px_ + bw] - RM.hex2rgb(t['color'])) ** 2).sum(2)) < 60
            tg.append((t, (g, _edges(g), (px_, py_, bw, bh), int(t.get('stroke_px') or 0), dens, run_ratio(fmt))))
        for p in cands.values():
            for path, w in variants(p):
                sc = [score_font(path, w, t['text'].strip(), tgt) for t, tgt in tg]
                tot[(path, w)] = float(np.mean(sc))
        best = sorted(tot.items(), key=lambda kv: -kv[1])[:3]; out[role] = (best[0][0][0], best[0][0][1], {'score': round(best[0][1], 3), 'runners_up': [(os.path.basename(k[0]), k[1], round(v, 3)) for k, v in best[1:]], 'samples': len(ts)})
    for r in ('caption', 'title', 'text'):
        if r not in out: out[r] = next(iter(out.values())) if out else (cands.get('NotoSansSC-500.ttf') or next(iter(cands.values())), 500, {'fallback': True})
    return out

# ───────────────────────────────────────────── spec helpers (also used by sync / compare)
def shot_len(s): return (s['src_t1'] - s['src_t0']) / (s.get('speed') or 1)
def src_to_film(spec, ts, tol=0.0):
    for s in spec['shots']:
        if s['src_t0'] - 1e-6 <= ts < s['src_t1'] + tol: return s['t0'] + (ts - s['src_t0']) / (s.get('speed') or 1)
    return None
def film_to_src(spec, t):
    for s in spec['shots']:
        if s['t0'] - 1e-6 <= t < s['t0'] + shot_len(s) - 1e-6: return s['src_t0'] + (t - s['t0']) * (s.get('speed') or 1)
    return None
def anchor_time(spec, a):
    if not a: return None
    if a.get('word') is not None and a['word'] < len(spec['words']):
        w = spec['words'][a['word']]; ts = w['t1' if a.get('edge') == 'end' else 't0'] + a.get('off', 0)
        r = src_to_film(spec, ts); return r if r is not None else src_to_film(spec, ts, 0.05)
    if a.get('shot') is not None and a['shot'] < len(spec['shots']): return spec['shots'][a['shot']]['t0'] + a.get('off', 0)
    return None
def resolve(spec):
    for c in spec['captions']:
        if c.get('lock'): continue
        if not c.get('from') and not c.get('to'): continue
        a, b = anchor_time(spec, c.get('from')), anchor_time(spec, c.get('to'))
        if c.get('from') and a is None and b is not None: a = 0.0
        c['hidden'] = a is None or b is None                      # its words were cut out of the timeline (the page hides it)
        if not c['hidden']: c['t0'], c['t1'] = round(a, 3), round(b, 3)
    return spec
def spec_end(spec): return max([s['t0'] + shot_len(s) for s in spec['shots']] or [0]) + spec.get('tail', 0)

def pin(a, edge):
    if 'word_index' in a: return {'word': a['word_index'], 'edge': edge, 'off': a['offset']}
    return {'shot': a['shot_index'], 'off': a['offset']}

# ───────────────────────────────────────────── build
def cmd_build(A):
    video = os.path.abspath(A.video); rdir = os.path.abspath(A.remake); out = os.path.abspath(A.out)
    if not os.path.isfile(video): sys.exit('no such video: ' + A.video)
    if not A.rights:
        sys.exit('exact mode copies footage, voice and music, so it is only for your own work.\nAsk the user once whether they own this video or have a licence for it, then run again with --rights own  or  --rights "licensed: <who>".\n' + RM.RIGHTS)
    R = jload(rdir if rdir.endswith('.json') else os.path.join(rdir, 'remake.json')); rdir = rdir if os.path.isdir(rdir) else os.path.dirname(rdir)
    if R.get('schema') != RM.SCHEMA: sys.exit('remake.json schema %s is not %s' % (R.get('schema'), RM.SCHEMA))
    S = R['source']; info = RM.probe(video); W, H = even(info['w']), even(info['h']); fps = A.fps or info['fps']
    name = os.path.basename(out.rstrip('/')); os.makedirs(os.path.join(out, 'src', 'frames'), exist_ok=True); os.makedirs(os.path.join(out, 'fonts'), exist_ok=True)
    ext = os.path.splitext(video)[1] or '.mp4'; srcp = os.path.join(out, 'src', 'source' + ext)
    if not os.path.exists(srcp): shutil.copy(video, srcp)
    footage = os.path.abspath(A.clean) if A.captions == 'clean' else video
    if A.captions == 'clean':
        if not A.clean or not os.path.isfile(A.clean): sys.exit('--captions clean needs --clean <video without the burned-in text>')
        ci = RM.probe(A.clean)
        if (ci['w'], ci['h']) != (info['w'], info['h']) or abs(ci['duration'] - info['duration']) > 0.2: sys.exit('the clean video must have the source\'s size and length: %s vs %s' % ((ci['w'], ci['h'], ci['duration']), (info['w'], info['h'], info['duration'])))
    log('== frames (%.3f fps, the source\'s own) ==' % fps)
    if not glob.glob(os.path.join(out, 'src', 'frames', '*.jpg')) or A.captions == 'clean':
        for f in glob.glob(os.path.join(out, 'src', 'frames', '*.jpg')): os.remove(f)
        r = run('ffmpeg', '-v', 'error', '-y', '-i', footage, '-an', '-vf', 'fps=%.6f,scale=%d:%d' % (fps, W, H) if (W, H) != (info['w'], info['h']) else 'fps=%.6f' % fps, '-q:v', '2', os.path.join(out, 'src', 'frames', '%04d.jpg'))
        if r.returncode: sys.exit('ffmpeg failed: ' + r.stderr.decode()[-300:])
    nfr = len(glob.glob(os.path.join(out, 'src', 'frames', '*.jpg'))); jsave(os.path.join(out, 'src', 'meta.json'), {'fps': fps, 'frames': nfr, 'w': W, 'h': H, 'duration': round(nfr / fps, 4)})
    if info['has_audio']: run('ffmpeg', '-v', 'error', '-y', '-i', video, '-vn', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', os.path.join(out, 'src', 'audio.wav'))
    shutil.copy(os.path.join(rdir, 'remake.json'), os.path.join(out, 'remake.json'))
    if os.path.isdir(os.path.join(rdir, 'texts')): shutil.copytree(os.path.join(rdir, 'texts'), os.path.join(out, 'remake-texts'), dirs_exist_ok=True)

    roles = set(A.roles.split(',')); texts = [t for t in R['texts'] if t['role'] in roles]
    log('== fonts: closest OFL face in the library, per role ==')
    F = choose_fonts(R['texts'], rdir, A.font) if texts else {}
    fonts, famof = [], {}
    for role, (path, w, why) in F.items():
        key = (path, w)
        if key not in famof:
            b = os.path.splitext(os.path.basename(path))[0]; fam = 'rm_%s%s' % (re.sub(r'\W', '', b), '_%d' % w if w else ''); famof[key] = fam
            shutil.copy(path, os.path.join(out, 'fonts', os.path.basename(path))); cm, axes = coverage(path); wa = next((a for a in axes if a[0] == 'wght'), None)
            fonts.append({'family': fam, 'file': 'fonts/' + os.path.basename(path), 'weight': ('%d %d' % (wa[1], wa[2])) if wa else '400', 'note': 'SIL OFL (Google Fonts), from the library'})
        log('  %-8s %s %s  %s' % (role, os.path.basename(path), w or '', why))
    spec_caps = []
    for t in texts:
        path, w, _ = F[t['role']]; fam = famof[(path, w)]; txt = t['text'].strip(); bx, by, bw, bh = t['box_px']
        r = render_candidate(path, w, txt, max(8, bw)); size = round(r[0], 1) if r else max(10, bh)
        f = pil_font(path, size, w); l, top, rr, bb = f.getbbox(txt, anchor='ls'); center = t['align'] == 'center'
        draw = A.captions != 'keep'
        spec_caps.append({'id': t['id'], 'role': t['role'], 'text': txt, 'from': pin(t['anchor'], 'start'), 'to': pin(t['anchor_end'], 'end'), 't0': t['t0'], 't1': t['t1'],
                          'box': {'x': bx, 'y': by, 'w': bw, 'h': bh}, 'align': 'center' if center else 'left', 'cx': round(bx + bw / 2, 1), 'x': round(bx - l, 1), 'baseline': round(by - top, 1),
                          'family': fam, 'weight': w or 400, 'size': size, 'max_w': round(bw * 1.12 + 20, 0), 'color': t['color'], 'stroke': {'color': t['outline'], 'w': round(2 * (t.get('stroke_px') or max(1, size * 0.04)), 1)} if t.get('outline') and t['role'] == 'caption' else None,
                          'draw': draw, 'burned': True, 'erase': 'cover' if A.captions in ('cover',) else 'none', 'erase_src': [t['t0'], t['t1']], 'cover_pad': 14, 'lock': False})
    shots = [{'id': 's%d' % s['index'], 'src_t0': s['t0'], 'src_t1': s['t1'] if s['index'] < len(R['shots']) - 1 else round(nfr / fps, 4), 't0': s['t0'], 'speed': 1.0, 'audio': True, 'label': (s.get('said') or '')[:40]} for s in R['shots']]
    shots[-1]['src_t1'] = round(min(shots[-1]['src_t1'], nfr / fps), 4)
    spec = {'schema': 'remake-exact/1', 'source': {'file': os.path.basename(video), 'w': S['w'], 'h': S['h'], 'fps': S['fps'], 'duration': S['duration']}, 'canvas': {'w': W, 'h': H, 'fps': fps}, 'frames': {'base': 'src', 'fps': fps, 'count': nfr},
            'captions_mode': A.captions, 'shots': shots, 'words': [{'i': w['i'], 'w': w['w'], 't0': w['t0'], 't1': w['t1']} for w in R['words']], 'captions': spec_caps, 'overlays': [], 'fonts': fonts,
            'audio': {'src': 'src/audio.wav' if info['has_audio'] else None, 'follow_shots': True, 'gain_db': 0.0, 'master': 'mux', 'extra': []}, 'tail': 0}
    resolve(spec); jsave(os.path.join(out, 'spec.json'), spec)
    for fn in ('index.html', 'main.js'): shutil.copy(os.path.join(HERE, 'template', fn), os.path.join(out, fn))
    open(os.path.join(out, 'build.sh'), 'w').write('#!/bin/sh\n# Re-render this project: sh films/%s/build.sh   (LIB = the library folder; default two levels up)\nset -e\nHERE=$(cd "$(dirname "$0")" && pwd)\nLIB=${LIB:-$(cd "$HERE/../.." && pwd)}\n"$LIB/.venv/bin/python" "$LIB/tools/remake/exact.py" render "$HERE" "$@"\n' % name)
    own = A.rights.strip()
    open(os.path.join(out, 'CREDITS'), 'w', encoding='utf8').write('Exact remake of %s\nRights (stated by the user, %s): %s\nFootage, voice and music are the source video\'s own.\nFonts: %s (SIL Open Font License 1.1, from the library; core/fonts/OFL.md)\nTool: tools/remake (exact mode)\n'
        % (os.path.basename(video), time.strftime('%Y-%m-%d'), own, ', '.join(sorted({os.path.basename(f['file']) for f in fonts})) or 'none'))
    log('\nproject: %s  (%d shots, %d captions, %d frames, %dx%d)\nedit %s/spec.json, then:  sh %s/build.sh   and   %s tools/remake/exact.py compare %s' % (out, len(shots), len(spec_caps), nfr, W, H, out, os.path.join(out, ''), os.path.relpath(PY, LIB) if PY.startswith(LIB) else PY, out))
    if A.captions == 'keep': log('captions are NOT drawn (--captions keep): the source pixels are untouched and spec captions are data only.')

# ───────────────────────────────────────────── render
def build_mix(film, spec, out_wav):
    import soundfile as sf
    a = spec['audio']; dur = spec_end(spec); sr = 48000; mix = np.zeros((int(math.ceil(dur * sr)) + sr, 2), np.float32)
    if a.get('src'):
        x, xsr = sf.read(os.path.join(film, a['src']), dtype='float32', always_2d=True)
        if xsr != sr: raise SystemExit('audio.wav must be 48 kHz')
        if x.shape[1] == 1: x = np.repeat(x, 2, 1)
        g = 10 ** (a.get('gain_db', 0) / 20)
        for s in spec['shots']:
            if not s.get('audio', True) or not a.get('follow_shots', True): continue
            seg = x[int(s['src_t0'] * sr):int(s['src_t1'] * sr)]
            if abs((s.get('speed') or 1) - 1) > 1e-6:
                tmp = out_wav + '.seg.wav'; sf.write(tmp, seg, sr, subtype='FLOAT')
                run('ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', 'atempo=%.4f' % s['speed'], tmp + '.o.wav'); seg, _ = sf.read(tmp + '.o.wav', dtype='float32', always_2d=True); os.remove(tmp); os.remove(tmp + '.o.wav')
            i0 = int(round(s['t0'] * sr)); n = min(len(seg), len(mix) - i0); mix[i0:i0 + n] += seg[:n] * g
        if not a.get('follow_shots', True): n = min(len(x), len(mix)); mix[:n] += x[:n] * g
    for e in a.get('extra', []):
        y, ysr = sf.read(os.path.join(film, e['src']), dtype='float32', always_2d=True)
        if ysr != sr: y = np.stack([__import__('soxr').resample(y[:, c], ysr, sr) for c in range(y.shape[1])], 1)
        if y.shape[1] == 1: y = np.repeat(y, 2, 1)
        i0 = int(round(e.get('at', 0) * sr)); n = min(len(y), len(mix) - i0)
        if n > 0: mix[i0:i0 + n] += y[:n] * 10 ** (e.get('gain_db', 0) / 20)
    mix = mix[:int(math.ceil(dur * sr))]; sf.write(out_wav, np.clip(mix, -1, 1), sr, subtype='PCM_16')

def cmd_render(A):
    film = os.path.abspath(A.film); name = os.path.basename(film.rstrip('/')); spec = resolve(jload(os.path.join(film, 'spec.json'))); jsave(os.path.join(film, 'spec.json'), spec)
    os.makedirs(os.path.join(film, 'out'), exist_ok=True); W, H, fps = spec['canvas']['w'], spec['canvas']['h'], spec['canvas']['fps']
    vid = os.path.join(film, 'out', 'video.mp4'); t0 = time.time()
    r = subprocess.run(['node', os.path.join(LIB, 'core/render/video.mjs'), film, '--fps', '%.6f' % fps, '--workers', str(A.workers), '--size', '%dx%d' % (W, H), '--out', vid] + (['--resume'] if A.resume else []), cwd=LIB)
    if r.returncode: sys.exit('render failed (exit %d)' % r.returncode)
    log('rendered in %.0f s' % (time.time() - t0)); mix = os.path.join(film, 'out', 'mix.wav'); final = os.path.join(film, name + '.mp4')
    if A.no_mux: return
    if not spec['audio'].get('src'):
        run('ffmpeg', '-v', 'error', '-y', '-i', vid, '-c', 'copy', final); log(final, '(no audio in the source)'); return
    build_mix(film, spec, mix)
    if A.keep_levels or spec['audio'].get('master') == 'keep':
        r = run('ffmpeg', '-y', '-v', 'error', '-i', vid, '-i', mix, '-map', '0:v', '-map', '1:a', '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-r', '%.6f' % fps, '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', final)
        if r.returncode: sys.exit(r.stderr.decode()[-400:])
        log(final, '(levels kept, no loudness mastering)')
    else:
        r = subprocess.run(['sh', os.path.join(LIB, 'core/render/mux.sh'), vid, mix, final, '%.6f' % fps, '0'], cwd=LIB)
        if r.returncode: sys.exit('mux failed')

# ───────────────────────────────────────────── compare
def read_frames(path, w, h, fps, sw):
    sh = even(sw * h / w); raw = run('ffmpeg', '-v', 'error', '-i', path, '-an', '-vf', 'fps=%.6f,scale=%d:%d:flags=area' % (fps, sw, sh), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-').stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, sh, sw, 3)

def ssim_gray(a, b, win=7):
    from scipy.ndimage import uniform_filter
    a = a.astype(np.float32); b = b.astype(np.float32); c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    ma, mb = uniform_filter(a, win), uniform_filter(b, win); saa = uniform_filter(a * a, win) - ma * ma; sbb = uniform_filter(b * b, win) - mb * mb; sab = uniform_filter(a * b, win) - ma * mb
    s = ((2 * ma * mb + c1) * (2 * sab + c2)) / ((ma * ma + mb * mb + c1) * (saa + sbb + c2)); return s
def gray(x): return (x.astype(np.float32) @ np.array([0.299, 0.587, 0.114], np.float32))
def psnr(a, b):
    m = float(((a.astype(np.float32) - b.astype(np.float32)) ** 2).mean()); return 99.0 if m < 1e-9 else 10 * math.log10(255 * 255 / m)

def cmd_compare(A):
    film = os.path.abspath(A.film); name = os.path.basename(film.rstrip('/')); spec = jload(os.path.join(film, 'spec.json')); out = os.path.abspath(A.out or os.path.join(film, 'compare')); os.makedirs(out, exist_ok=True)
    src = glob.glob(os.path.join(film, 'src', 'source.*'))[0]; res = os.path.join(film, name + '.mp4')
    if not os.path.exists(res): sys.exit('render first: ' + res)
    W, H, fps = spec['canvas']['w'], spec['canvas']['h'], spec['canvas']['fps']; SW = A.width; SH = even(SW * H / W)
    log('== decoding both at %dx%d, %.3f fps ==' % (SW, SH, fps)); FS = read_frames(src, W, H, fps, SW); FO = read_frames(res, W, H, fps, SW)
    n = len(FO); rows = []; sc = SW / W
    for k in range(n):
        ts = film_to_src(spec, k / fps)
        if ts is None: continue
        j = min(len(FS) - 1, int(round(ts * fps)))
        gs, go = gray(FS[j]), gray(FO[k]); s = ssim_gray(gs, go); rows.append({'k': k, 't': round(k / fps, 3), 'src_t': round(j / fps, 3), 'ssim': float(s.mean()), 'psnr': psnr(FS[j], FO[k]), 'map': s})
    ss = np.array([r['ssim'] for r in rows]); ps = np.array([r['psnr'] for r in rows])
    # timing check: does shifting the output by a frame match better? (a lag means the render is not frame-aligned)
    lag = {}
    for d in (-2, -1, 0, 1, 2):
        v = [ssim_gray(gray(FS[min(len(FS) - 1, max(0, r['k'] + d))]), gray(FO[r['k']])).mean() for r in rows[::max(1, len(rows) // 40)]]; lag[d] = float(np.mean(v))
    per = {}
    for r in rows: per.setdefault(int(r['t']), []).append(r)
    per_sec = [{'second': s, 'ssim_pct': round(100 * float(np.mean([r['ssim'] for r in v])), 2), 'psnr_db': round(float(np.mean([r['psnr'] for r in v])), 1), 'frames_ge_0.95_pct': round(100 * float(np.mean([r['ssim'] >= 0.95 for r in v])), 1)} for s, v in sorted(per.items())]
    worst = sorted(rows, key=lambda r: r['ssim'])[:A.worst]
    for i, r in enumerate(worst):
        a, b = FS[min(len(FS) - 1, int(round(r['src_t'] * fps)))], FO[r['k']]; d = np.clip(np.abs(a.astype(np.int16) - b.astype(np.int16)).sum(2) * 2, 0, 255).astype(np.uint8)
        Image.fromarray(np.concatenate([a, b, np.stack([d] * 3, 2)], 1)).save(os.path.join(out, 'worst_%d_t%.2f.jpg' % (i + 1, r['t'])), quality=88)
    # caption regions: the picture inside each live caption's box, over the time it is on screen
    capres = []
    for c in spec['captions']:
        if not c.get('draw') or c.get('hidden'): continue
        x0, y0, x1, y1 = [int(v * sc) for v in (c['box']['x'], c['box']['y'], c['box']['x'] + c['box']['w'], c['box']['y'] + c['box']['h'])]; vals = [float(r['map'][y0:y1, x0:x1].mean()) for r in rows if c['t0'] <= r['t'] < c['t1']]
        if vals: capres.append({'id': c['id'], 'text': c['text'], 't0': c['t0'], 't1': c['t1'], 'region_ssim_pct': round(100 * float(np.mean(vals)), 1)})
    ocr = []
    if not A.no_ocr and RM.ocr_binary():
        od = os.path.join(out, 'ocr'); os.makedirs(od, exist_ok=True); items = []
        for c in spec['captions']:
            if c.get('draw') and not c.get('hidden') and c['t1'] - c['t0'] > 0.15: t = (c['t0'] + c['t1']) / 2; p = os.path.join(od, '%s.jpg' % c['id']); RM.grab(res, t, p); items.append((c, p))
        got = RM.ocr_files([p for _, p in items])
        for c, p in items:
            seen = [x['text'] for x in got.get(os.path.basename(p), []) if abs((x['y'] + x['h'] / 2) - (c['box']['y'] + c['box']['h'] / 2) / H) < 0.04]; best = max([SequenceMatcher(None, RM.norm(c['text']), RM.norm(s)).ratio() for s in seen] or [0])
            ocr.append({'id': c['id'], 'text': c['text'], 'read_back': seen[:2], 'match_pct': round(100 * best)})
        shutil.rmtree(od, ignore_errors=True)
    # audio
    au = {}; sa = RM.loudness(src); oa = RM.loudness(res); au['source'] = {**sa, 'duration': RM.probe(src)['duration']}; au['output'] = {**oa, 'duration': RM.probe(res)['duration']}
    try:
        xs = RM.read_audio16(src); xo = RM.read_audio16(res); n_ = min(len(xs), len(xo)); hop = 160
        if n_ > 16000:
            es = np.sqrt((xs[:n_ // hop * hop].reshape(-1, hop) ** 2).mean(1)); eo = np.sqrt((xo[:n_ // hop * hop].reshape(-1, hop) ** 2).mean(1))
            best = (-2, 0)
            for L in range(-20, 21):
                a_, b_ = (es[L:], eo[:len(es) - L]) if L >= 0 else (es[:L], eo[-L:]); m = min(len(a_), len(b_)); c = float(np.corrcoef(a_[:m], b_[:m])[0, 1]) if m > 10 else -2
                if c > best[0]: best = (c, L)
            au['envelope_corr'] = round(best[0], 4); au['best_lag_ms'] = best[1] * 10
            m = n_; c = float(np.corrcoef(xs[:m], xo[:m])[0, 1]); au['waveform_corr_unshifted'] = round(c, 4)
    except Exception as ex: au['note'] = 'audio correlation skipped: %s' % ex
    J = {'film': res, 'source': src, 'frames_compared': len(rows), 'size_compared': [SW, SH], 'ssim_mean_pct': round(100 * float(ss.mean()), 2), 'ssim_min_pct': round(100 * float(ss.min()), 2), 'frames_ge_0.95_pct': round(100 * float((ss >= 0.95).mean()), 1),
         'frames_ge_0.90_pct': round(100 * float((ss >= 0.90).mean()), 1), 'psnr_mean_db': round(float(ps.mean()), 1), 'psnr_min_db': round(float(ps.min()), 1), 'lag_check_ssim': {str(k): round(v, 4) for k, v in lag.items()}, 'per_second': per_sec,
         'worst_frames': [{'t': r['t'], 'ssim_pct': round(100 * r['ssim'], 2), 'psnr_db': round(r['psnr'], 1)} for r in worst], 'captions': capres, 'caption_ocr_roundtrip': ocr, 'audio': au,
         'duration': {'source': au['source']['duration'], 'film': au['output']['duration']}}
    jsave(os.path.join(out, 'compare.json'), J)
    md = ['# Compare: %s against the source' % name, '', '%d frames compared at %dx%d (every frame of the film, matched to the source frame its shot points at).' % (len(rows), SW, SH), '',
          '- picture match (mean SSIM): **%.2f %%**; worst frame %.2f %%; frames with SSIM ≥ 0.95: %.1f %%, ≥ 0.90: %.1f %%; PSNR mean %.1f dB, min %.1f dB' % (J['ssim_mean_pct'], J['ssim_min_pct'], J['frames_ge_0.95_pct'], J['frames_ge_0.90_pct'], J['psnr_mean_db'], J['psnr_min_db']),
          '- frame alignment (mean SSIM when the film is shifted by -2…+2 frames; best must be 0): ' + ', '.join('%s: %.4f' % (k, v) for k, v in J['lag_check_ssim'].items()),
          '- duration: source %.2f s, film %.2f s' % (au['source']['duration'], au['output']['duration']),
          '- loudness: source %s LUFS (LRA %s, peak %s dB), film %s LUFS (LRA %s, peak %s dB)' % (sa['lufs'], sa['lra'], sa['true_peak_db'], oa['lufs'], oa['lra'], oa['true_peak_db']),
          '- audio envelope correlation %s at lag %s ms; waveform correlation without shifting %s' % (au.get('envelope_corr'), au.get('best_lag_ms'), au.get('waveform_corr_unshifted')), '', '## Per second', '', '| second | match % (SSIM) | PSNR dB | frames ≥ 0.95 % |', '|---|---|---|---|']
    md += ['| %d | %s | %s | %s |' % (p['second'], p['ssim_pct'], p['psnr_db'], p['frames_ge_0.95_pct']) for p in per_sec]
    md += ['', '## Worst frames (source | film | difference ×2)', ''] + ['- t = %.2f s: SSIM %.2f %%, PSNR %.1f dB → `worst_%d_t%.2f.jpg`' % (r['t'], 100 * r['ssim'], r['psnr'], i + 1, r['t']) for i, r in enumerate(worst)]
    if capres: md += ['', '## Live caption regions (picture inside each caption box while it is on screen)', '', '| id | time | region match % | text |', '|---|---|---|---|'] + ['| %s | %.2f–%.2f | %s | %s |' % (c['id'], c['t0'], c['t1'], c['region_ssim_pct'], c['text'].replace('|', '/')) for c in capres]
    if ocr: md += ['', '## Caption read-back (OCR of the film at each caption\'s middle; 100 = the text reads back exactly)', '', '| id | match % | caption | read as |', '|---|---|---|---|'] + ['| %s | %d | %s | %s |' % (o['id'], o['match_pct'], o['text'].replace('|', '/'), ' / '.join(o['read_back']).replace('|', '/')) for o in ocr]
    open(os.path.join(out, 'compare.md'), 'w', encoding='utf8').write('\n'.join(md) + '\n'); log('\n'.join(md[:12])); log('\n→ %s/compare.md' % out)

# ───────────────────────────────────────────── sync / retext
def cmd_sync(A):
    film = os.path.abspath(A.film); spec = resolve(jload(os.path.join(film, 'spec.json'))); jsave(os.path.join(film, 'spec.json'), spec)
    for c in spec['captions']: log('%-5s %7.2f–%7.2f  %s' % (c['id'], c['t0'], c['t1'], c['text']))
def cmd_retext(A):
    film = os.path.abspath(A.film); spec = jload(os.path.join(film, 'spec.json')); c = next((c for c in spec['captions'] if c['id'] == A.id), None)
    if not c: sys.exit('no caption %s (ids: %s)' % (A.id, ' '.join(x['id'] for x in spec['captions'])))
    from fontTools.ttLib import TTFont
    ff = next(f for f in spec['fonts'] if f['family'] == c['family']); cm = TTFont(os.path.join(film, ff['file']), lazy=True).getBestCmap(); miss = sorted({ch for ch in A.text if not ch.isspace() and ord(ch) not in cm})
    if miss: log('warning: the face has no glyph for %s: pick another face for this caption (spec.json: family, or rebuild with --font)' % ''.join(miss))
    c['text'] = A.text; c['draw'] = True; jsave(os.path.join(film, 'spec.json'), spec); log('%s → %s   (timing stays on words %s…%s; the page shrinks the text to max_w %s px if it is longer)' % (c['id'], A.text, c['from'], c['to'], c['max_w']))

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter); sp = ap.add_subparsers(dest='cmd', required=True)
    b = sp.add_parser('build'); b.add_argument('video'); b.add_argument('remake'); b.add_argument('--out', required=True); b.add_argument('--rights'); b.add_argument('--captions', choices=['cover', 'keep', 'clean'], default='cover'); b.add_argument('--clean')
    b.add_argument('--font'); b.add_argument('--fps', type=float); b.add_argument('--roles', default='caption,title,text')
    r = sp.add_parser('render'); r.add_argument('film'); r.add_argument('--workers', type=int, default=3); r.add_argument('--keep-levels', action='store_true'); r.add_argument('--no-mux', action='store_true'); r.add_argument('--resume', action='store_true')
    c = sp.add_parser('compare'); c.add_argument('film'); c.add_argument('--out'); c.add_argument('--no-ocr', action='store_true'); c.add_argument('--width', type=int, default=540); c.add_argument('--worst', type=int, default=5)
    s = sp.add_parser('sync'); s.add_argument('film')
    t = sp.add_parser('retext'); t.add_argument('film'); t.add_argument('id'); t.add_argument('text')
    A = ap.parse_args(); {'build': cmd_build, 'render': cmd_render, 'compare': cmd_compare, 'sync': cmd_sync, 'retext': cmd_retext}[A.cmd](A)

if __name__ == '__main__': main()
