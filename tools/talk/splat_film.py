"""A presenter video placed in a Gaussian-splat world, in one command.

  .venv/bin/python tools/talk/splat_film.py <host.mp4> films/<name> --world demo-room|<file.splat|.spz|.ply|.ksplat>
        [--lang zh|en] [--aspect 16x9|9x16] [--title "…"] [--prompt "terms the host says"] [--orbit-deg 14]
        [--head-height 1.72] [--bottom-height 0.80] [--node-modules <dir>] [--no-build] [--force]

Steps (printed): hostcheck → copy the template → prep.sh (frames, voice, word timings) → person matte (macOS) → work out the host's crop and the billboard's
size in metres from the matte → the world file → the two npm packages into the film folder → film.json → build → check.py.
--world demo-room makes a synthetic room (no download). --node-modules <dir> links an existing node_modules (offline) instead of running `npm install`
(which fetches @sparkjsdev/spark@2.3.1 and three@0.180.0, about 50 MB, from the npm registry into the film folder; the library's own three stays 0.170).
The look is yours afterwards: film.json (world placement, camera, billboard, counter), see tools/talk/splat-template/README.md."""
import argparse, glob, json, os, shutil, subprocess, sys
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser(); ap.add_argument('host'); ap.add_argument('film'); ap.add_argument('--world', default='demo-room')
ap.add_argument('--lang', default='zh'); ap.add_argument('--aspect', default='16x9', choices=['16x9', '9x16']); ap.add_argument('--title', default=''); ap.add_argument('--prompt', default='')
ap.add_argument('--orbit-deg', type=float, default=14); ap.add_argument('--head-height', type=float, default=1.72); ap.add_argument('--bottom-height', type=float, default=.80)
ap.add_argument('--node-modules'); ap.add_argument('--no-build', action='store_true'); ap.add_argument('--force', action='store_true')
A = ap.parse_args()
LIB = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); PY = os.path.join(LIB, '.venv/bin/python'); PY = PY if os.path.exists(PY) else sys.executable
TPL = os.path.join(LIB, 'tools/talk/splat-template'); film = os.path.abspath(A.film); name = os.path.basename(film); env = dict(os.environ, LIB=LIB)
if not os.path.isfile(A.host): sys.exit('no such host video: ' + A.host)
if os.path.exists(film): sys.exit(film + ' already exists; choose a new folder')
def run(title, cmd, ok=(0,), **k):
    print('\n== %s ==\n$ %s' % (title, ' '.join(cmd)), flush=True); r = subprocess.run(cmd, cwd=k.pop('cwd', LIB), env=env, **k)
    if r.returncode not in ok: sys.exit('stopped at "%s" (exit %d)' % (title, r.returncode))
    return r.returncode

run('hostcheck', [PY, 'tools/talk/hostcheck.py', os.path.abspath(A.host)], ok=(0, 1) if A.force else (0,))
os.makedirs(film)
for f in ('index.html', 'main.js', 'build.sh', 'mix.py', 'cues.mjs'): shutil.copy2(os.path.join(TPL, f), film)
run('prep', ['sh', 'tools/talk/prep.sh', os.path.abspath(A.host), film, '--lang', A.lang, '--prompt', A.prompt])
if sys.platform != 'darwin': sys.exit('\nthe person matte needs macOS (tools/matte). Elsewhere, put your own mattes in %s/src/matte/NNNN.png (alpha = person) and run build.sh yourself.' % film)
run('matte', ['sh', 'tools/matte/run.sh', film])

# where does the host stand? a crop of fixed size that follows him (smoothed), so a walking host keeps walking inside the billboard
meta = json.load(open(os.path.join(film, 'src/meta.json'))); FW, FH, N = meta['w'], meta['h'], meta['frames']; per = {}
for i, f in enumerate(sorted(glob.glob(os.path.join(film, 'src/matte/*.png')))):
    im = Image.open(f); a = np.asarray(im.split()[-1]) > 128; ys, xs = np.where(a)
    if len(xs) < 50: continue
    sx, sy = FW / im.width, FH / im.height; per[i] = (xs.min() * sx, ys.min() * sy, (xs.max() + 1) * sx, (ys.max() + 1) * sy)
if not per: sys.exit('Vision found no person in the video: this template needs the host in frame.')
idx = np.array(sorted(per)); B = np.array([per[i] for i in idx]); full = np.arange(N)
cxs = np.interp(full, idx, (B[:, 0] + B[:, 2]) / 2); tops_all = np.interp(full, idx, B[:, 1]); bots_all = np.interp(full, idx, B[:, 3])
k = np.ones(25) / 25; sm = lambda v: np.convolve(np.pad(v, (12, 12), mode='edge'), k, mode='valid')
cxs, tops_s, bots_s = sm(cxs), sm(tops_all), sm(bots_all)
bw = np.percentile(B[:, 2] - B[:, 0], 92) * 1.12; bh = np.percentile(B[:, 3] - B[:, 1], 92) * 1.10
cw = int(min(FW, max(bw, 0.5 * (B[:, 3] - B[:, 1]).max())) // 2 * 2); ch = int(min(FH, bh) // 2 * 2)
full_body = float(np.percentile(B[:, 3], 50)) < FH - 6
track = []
for i in range(N):
    x = int(round(min(max(0, cxs[i] - cw / 2), FW - cw))); y = int(round(min(max(0, (FH if not full_body else bots_s[i] + 0.03 * ch) - ch), FH - ch))); track.append([x, y])
head_rel = float(np.median([tops_s[i] - track[i][1] for i in range(N)]))
if full_body: bottom_h = 0.0; mpp = A.head_height / max(1.0, float(np.median([bots_s[i] - tops_s[i] for i in range(N)])))
else: bottom_h = A.bottom_height; mpp = (A.head_height - bottom_h) / max(1.0, ch - head_rel)
HW, HH = cw * mpp, ch * mpp
print('crop %dx%d following the host; head %.0f px below the crop top; %s; billboard %.2f x %.2f m' % (cw, ch, head_rel, 'full body: feet on the floor' if full_body else 'cut by the frame bottom: a counter hides the cut', HW, HH))
cx0, cy0 = track[0]

# the world
os.makedirs(os.path.join(film, 'world'))
if A.world == 'demo-room': run('demo world', [PY, os.path.join(TPL, 'make-room.py'), os.path.join(film, 'world/room.splat')]); wurl = 'world/room.splat'
else:
    if not os.path.isfile(A.world): sys.exit('no such world file: ' + A.world)
    shutil.copy2(A.world, os.path.join(film, 'world')); wurl = 'world/' + os.path.basename(A.world)

# the renderer's packages, into the film folder
nm = os.path.join(film, 'node_modules')
if A.node_modules: os.symlink(os.path.abspath(A.node_modules), nm); print('\nlinked node_modules ->', A.node_modules)
else: run('npm install', ['npm', 'install', '--prefix', film, '@sparkjsdev/spark@2.3.1', 'three@0.180.0', '--no-audit', '--no-fund'])

V = A.aspect == '9x16'
fj = {'aspect': A.aspect, 'title': A.title or name, 'lang': A.lang, 'tail': 0, 'captions': {'style': 'card', 'cues': 'auto'},
      'world': {'url': wurl, 'flipY': False, 'background': '#101418'},
      'host': {'crop': {'x': cx0, 'y': cy0, 'w': cw, 'h': ch, 'track': track}, 'plane': {'width': round(HW, 3), 'height': round(HH, 3), 'bottom': round(bottom_h, 3), 'x': .2, 'z': -2.6}, 'tone': .6, 'wrap': .25, 'soft': True, 'erodePx': 2, 'featherPx': 1},
      'counter': {'on': not full_body, 'width': round(max(1.4, HW * 1.25), 2), 'height': round(bottom_h + .15, 2), 'depth': .5},
      'camera': {'orbitDeg': A.orbit_deg, 'orbitCycles': 1, 'rStart': 2.2 if V else 2.7, 'rEnd': 1.6 if V else 2.0, 'height': 1.45, 'bob': .1, 'fov': 58 if V else 50}}
json.dump(fj, open(os.path.join(film, 'film.json'), 'w'), ensure_ascii=False, indent=1); print('\nwrote film.json')
if A.no_build: print('\nNext: edit %s/film.json, then  sh %s/build.sh' % (film, film)); sys.exit(0)
run('build', ['sh', os.path.join(film, 'build.sh')])
run('check', [PY, 'tools/check.py', os.path.join(film, name + '.mp4'), '--srt', os.path.join(film, name + '.srt'), '--out', os.path.join(film, 'check')], ok=(0, 1))
print('\ndone: %s/%s.mp4 and %s/check/check.md (look at the contact sheet, then listen once)' % (film, name, film))
