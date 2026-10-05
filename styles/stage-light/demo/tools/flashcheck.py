"""Photosensitivity check on the final film: mean luminance per frame at 24 fps; counts large luminance swings (a rise of >=10% of the
range followed by a fall, WCAG-style general flash) in every 1-second window, and the biggest single-frame jump. Rule of the style: <= 3 per second.
usage: .venv/bin/python styles/stage-light/demo/tools/flashcheck.py film.mp4"""
import sys, subprocess, numpy as np
f = sys.argv[1]
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-vf', 'fps=24,scale=96:54,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, 54 * 96).astype(float) / 255; L = fr.mean(1)
print('frames', len(L), 'mean lum', L.mean().round(3), 'max', L.max().round(3), 'at', (L.argmax() / 24).round(2), 's; biggest 1-frame jump', np.abs(np.diff(L)).max().round(3))
# count direction changes whose swing is >= .10 in luminance
ext = []; last = L[0]; d = 0
for i in range(1, len(L)):
    dv = L[i] - last
    if d >= 0 and dv > .02: d = 1; last = L[i]
    elif d <= 0 and dv < -.02: d = -1; last = L[i]
    elif (d == 1 and L[i] > last) or (d == -1 and L[i] < last): last = L[i]
    elif (d == 1 and L[i] < last - .02) or (d == -1 and L[i] > last + .02): ext.append((i - 1, last)); d = -d; last = L[i]
sw = [(ext[i][0], abs(ext[i + 1][1] - ext[i][1])) for i in range(len(ext) - 1) if abs(ext[i + 1][1] - ext[i][1]) >= .10]
worst = 0
for s in range(0, len(L) - 24):
    n = sum(1 for i, a in sw if s <= i < s + 24) / 2        # a flash = one rise plus one fall
    worst = max(worst, n)
print('large swings (>=0.10):', len(sw), '; worst flashes in any 1 s window:', worst, '(limit 3)')
sys.exit(0 if worst <= 3 else 1)
