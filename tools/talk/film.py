"""A talking-head film in one command: check the host video, prepare it, matte, track, build, check.

  .venv/bin/python tools/talk/film.py <host.mp4> films/<name> [--layout split|pip|world] [--aspect 16x9|9x16] [--title "…"] [--lang zh|en]
        [--prompt "terms the host says"] [--corners "x,y,x,y,x,y,x,y" [--ref 12]] [--fx halftone|pixel|ascii|engrave|comic|duotone|ink|neon [--fx-cutout]] [--no-build] [--force] [--from step]

Steps, each printed with its command and time: hostcheck → new-film (frames, voice, word timings, template) → matte (macOS only, skipped elsewhere) →
track (only with --corners: a surface to follow, then a contact sheet to look at) → build (render, mix, subtitles, master) → check (tools/check.py and
tools/audio/report.py). It stops at the first failing step and says how to carry on (`--from <step>`). `hostcheck` problems stop the run unless --force.
Writes <film>/pipeline.json (what ran, how long, what it said). The film's own look still comes from film.json / main.js, as in TALKING-HEAD.md: this tool
saves the typing, not the directing. Resuming is safe: finished work (frames, track, matte) is not redone."""
import argparse, json, os, subprocess, sys, time

ap = argparse.ArgumentParser(); ap.add_argument('host'); ap.add_argument('film')
ap.add_argument('--layout', default='world'); ap.add_argument('--aspect', default='16x9'); ap.add_argument('--title', default='Talking-head film'); ap.add_argument('--lang', default='zh'); ap.add_argument('--prompt', default='')
ap.add_argument('--fx', default=''); ap.add_argument('--fx-cutout', action='store_true'); ap.add_argument('--corners'); ap.add_argument('--ref', type=int, default=12); ap.add_argument('--no-build', action='store_true'); ap.add_argument('--force', action='store_true')
ap.add_argument('--from', dest='frm', default='hostcheck', choices=['hostcheck', 'new-film', 'matte', 'track', 'build', 'check'])
A = ap.parse_args()
LIB = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); PY = os.path.join(LIB, '.venv/bin/python'); PY = PY if os.path.exists(PY) else sys.executable
film = os.path.abspath(A.film); name = os.path.basename(film); order = ['hostcheck', 'new-film', 'matte', 'track', 'build', 'check']; log = []
if not os.path.isfile(A.host): sys.exit('no such host video: ' + A.host)
env = dict(os.environ, LIB=LIB)
def step(nm, cmd, ok=(0,), stop=True, cwd=LIB):
    if order.index(nm) < order.index(A.frm): return None
    print('\n== %s ==\n$ %s' % (nm, ' '.join(cmd)), flush=True); t0 = time.time()
    r = subprocess.run(cmd, cwd=cwd, env=env); dt = round(time.time() - t0, 1)
    log.append({'step': nm, 'cmd': cmd, 'code': r.returncode, 'seconds': dt})
    if os.path.isdir(film) and nm != 'hostcheck' and (nm != 'new-film' or r.returncode == 0): json.dump(log, open(os.path.join(film, 'pipeline.json'), 'w'), indent=1)   # not before new-film: it wants to create the folder itself
    if r.returncode not in ok and stop: sys.exit('\nstopped at "%s" (exit %d). Fix it and carry on with:  film.py %s %s --from %s ...' % (nm, r.returncode, A.host, A.film, nm))
    return r.returncode

step('hostcheck', [PY, 'tools/talk/hostcheck.py', os.path.abspath(A.host)] + (['--board'] if A.corners else []), ok=(0, 1) if A.force else (0,))
if os.path.exists(os.path.join(film, 'film.json')) and A.frm == 'hostcheck': A.frm = 'matte'; print('\n%s already exists: skipping new-film (use --from new-film on a new folder to start over)' % name)
step('new-film', ['sh', 'tools/talk/new-film.sh', os.path.abspath(A.host), film, '--layout', A.layout, '--aspect', A.aspect, '--title', A.title, '--lang', A.lang, '--prompt', A.prompt, '--no-build'] + (['--fx', A.fx] if A.fx else []) + (['--fx-cutout'] if A.fx_cutout else []))
if sys.platform == 'darwin': step('matte', ['sh', 'tools/matte/run.sh', film], ok=(0, 3), stop=False)
else: print('\n== matte == skipped (macOS only)')
if A.corners:
    tj = os.path.join(film, 'src', 'track.json')
    if os.path.exists(tj) and A.frm in ('hostcheck', 'new-film', 'matte'): print('\n== track == src/track.json exists: kept (delete it to track again)')
    else: step('track', [PY, 'tools/track/board.py', film, '--corners', A.corners, '--ref', str(A.ref)])
    step('track', [PY, 'tools/track/check.py', film, '--n', '12', '--out', 'track-check.jpg']) if os.path.exists(tj) or order.index(A.frm) <= 3 else None
    print('look at %s/track-check.jpg: the green quad must sit on the surface in every cell before you build on it' % film)
if A.no_build: print('\nNext: edit %s/film.json (and main.js), then:  sh %s/build.sh' % (film, film)); sys.exit(0)
step('build', ['sh', os.path.join(film, 'build.sh')])
mp4 = os.path.join(film, name + '.mp4'); srt = os.path.join(film, name + '.srt')
rc = step('check', [PY, 'tools/check.py', mp4, '--srt', srt, '--out', os.path.join(film, 'check')], ok=(0, 1), stop=False)
step('check', [PY, 'tools/audio/report.py', mp4, '--voice', os.path.join(film, 'src', 'voice.wav'), '--out', os.path.join(film, 'check', 'audio')], ok=(0,), stop=False) if os.path.exists(os.path.join(film, 'src', 'voice.wav')) else None
print('\ndone: %s\n  film      %s\n  checks    %s/check/check.md and %s/check/audio/audio.md (open the contact sheet and the spectrogram; then listen once)' % (name, mp4, film, film))
