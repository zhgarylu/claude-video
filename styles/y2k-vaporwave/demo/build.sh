#!/bin/sh
# Rebuild "Installing Summer" from scratch: sh styles/y2k-vaporwave/demo/build.sh   (from any directory)
# Needs the core tier only (no voice, no samples): sh plugin/skills/lemo-opuscar/scripts/setup.sh deps
set -e
cd "$(dirname "$0")/../../.."
PY=.venv/bin/python; D=styles/y2k-vaporwave/demo; O=styles/y2k-vaporwave; NAME=y2k-vaporwave
mkdir -p $D/out $D/fonts
# 0. fonts (SIL OFL 1.1, not committed): Unbounded, Silkscreen, VT323
G=https://github.com/google/fonts/raw/main/ofl
[ -f $D/fonts/Unbounded.ttf ] || curl -sL -o $D/fonts/Unbounded.ttf "$G/unbounded/Unbounded%5Bwght%5D.ttf"
[ -f $D/fonts/Silkscreen-Bold.ttf ] || curl -sL -o $D/fonts/Silkscreen-Bold.ttf "$G/silkscreen/Silkscreen-Bold.ttf"
[ -f $D/fonts/Silkscreen-Regular.ttf ] || curl -sL -o $D/fonts/Silkscreen-Regular.ttf "$G/silkscreen/Silkscreen-Regular.ttf"
[ -f $D/fonts/VT323-Regular.ttf ] || curl -sL -o $D/fonts/VT323-Regular.ttf "$G/vt323/VT323-Regular.ttf"
[ -f $D/fonts/OFL.txt ] || curl -sL -o $D/fonts/OFL.txt "$G/unbounded/OFL.txt"
node core/render/events.mjs $D                                   # 1. window.EV -> events.json
$PY $D/tools/cuecheck.py                                         # 2. picture hits on the 68 BPM half-beat grid
$PY $D/mix.py                                                    # 3. score + foley + hiss -> mix.wav (numpy only)
$PY $D/tools/make_srt.py && $PY core/render/srt.py $D/out/srt.json $O/$NAME.srt   # 4. the one caption as .srt
node core/render/readcheck.mjs $D                                # 5. every window text stays long enough
node core/render/video.mjs $D --fps 24 --workers 3 --out $D/out/video.mp4   # 6. every frame (about 6 min on 3 workers)
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 0         # 7. master: -14 LUFS, no grain
node core/render/still.mjs $D 42.8 --out $D/out --prefix sf_ && cp $D/out/sf_42.8.jpg $D/stills/styleframe.jpg
node core/render/still.mjs $D 43.6 --out $D/out --prefix po_ && cp $D/out/po_43.6.jpg $O/poster.jpg
