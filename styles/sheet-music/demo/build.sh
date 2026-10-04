#!/bin/sh
# Rebuild "Four Notes" from scratch: sh styles/sheet-music/demo/build.sh   (from any directory)
# Needs only the core tier: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps  (no voice, no samples)
set -e
cd "$(dirname "$0")/../../.."
PY=.venv/bin/python; D=styles/sheet-music/demo; O=styles/sheet-music; NAME=sheet-music
mkdir -p $D/out $D/fonts $D/stills
get() { [ -f "$D/fonts/$1" ] || curl -sfL -o "$D/fonts/$1" "$2" || { echo "download failed: $2"; exit 1; }; }
# 0. fonts (SIL OFL 1.1, not committed)
get Bravura.otf https://github.com/steinbergmedia/bravura/raw/master/redist/otf/Bravura.otf
get OFL-Bravura.txt https://raw.githubusercontent.com/steinbergmedia/bravura/master/redist/OFL.txt
get EBGaramond.ttf 'https://github.com/google/fonts/raw/main/ofl/ebgaramond/EBGaramond%5Bwght%5D.ttf'
get EBGaramond-Italic.ttf 'https://github.com/google/fonts/raw/main/ofl/ebgaramond/EBGaramond-Italic%5Bwght%5D.ttf'
get OFL-EBGaramond.txt https://github.com/google/fonts/raw/main/ofl/ebgaramond/OFL.txt
node core/render/events.mjs $D                                           # 1. the event list (notes, pen, ticks, slide, captions) -> events.json
node $D/tools/proof.mjs                                                  # 2. picture and event list agree (pixel proof, exit 1 if not)
$PY $D/mix.py                                                            # 3. score + foley + room, synthesised from events.json -> out/mix.wav
$PY $D/tools/cuecheck.py                                                 # 4. every attack within 12 ms of its event
$PY $D/tools/make_srt.py && $PY core/render/srt.py $D/out/srt.json $O/$NAME.srt   # 5. captions -> .srt
node core/render/readcheck.mjs $D                                        # 6. every on-screen text stays long enough
node core/render/video.mjs $D --fps 24 --workers 3 --out $D/out/video.mp4   # 7. every frame
sh core/render/mux.sh $D/out/video.mp4 $D/out/mix.wav $O/$NAME.mp4 24 0  # 8. master: -14 LUFS, no grain
node core/render/still.mjs $D 37.3 --q nosub=1 --out $D/out --prefix sf_ && cp $D/out/sf_37.3.jpg $D/stills/styleframe.jpg && cp $D/out/sf_37.3.jpg $O/poster.jpg
node core/render/still.mjs $D 11.5 --out $D/out --prefix fp_ && cp $D/out/fp_11.5.jpg $D/stills/frame_page.jpg
node core/render/still.mjs $D 46.5 --out $D/out --prefix fl_ && cp $D/out/fl_46.5.jpg $D/stills/frame_landscape.jpg
