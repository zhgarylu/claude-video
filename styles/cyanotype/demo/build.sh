#!/bin/sh
# Rebuild "Reading the Sun" from scratch: sh styles/cyanotype/demo/build.sh   (from any directory)
# Needs the core + voice tiers: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice
# RENDER_SLOTS limits concurrent full renders when other renders run on the same machine.
set -e
cd "$(dirname "$0")/../../.."
PY=.venv/bin/python; D=styles/cyanotype/demo; O=styles/cyanotype; NAME=cyanotype
export RENDER_SLOTS=${RENDER_SLOTS:-3}
mkdir -p $D/out $D/voice $D/stills
[ -f $D/fonts/Caveat-700.ttf ] || { echo "fonts missing: copy them as listed in demo/CREDITS"; exit 1; }
node $D/tools/export_tl.mjs                                         # 1. timeline.js -> timeline.json
$PY core/tts/tts.py $D/lines.json $D/voice                          # 2. Kokoro voice (bf_emma), offline
$PY core/tts/asr_check.py $D/lines.json $D/voice                    # 3. speech-to-text check of every line
node $D/tools/make_caps.mjs                                         # 4. paper-slip captions: caps.json + out/srt.json
$PY $D/tools/cuecheck.py                                            # 5. picture hits <-> music grid
$PY $D/mix.py                                                       # 6. score + foley + voice -> mix.wav
$PY core/render/srt.py $D/out/srt.json $O/$NAME.srt                 # 7. .srt
node core/render/readcheck.mjs $D                                   # 8. reading time of every pen label
node core/render/video.mjs $D --fps 24 --workers 3 --out $D/out/video.mp4   # 9. every frame
# 10. paper fibre moves with the camera and is costly to encode: a first lossy pass keeps the final file small
ffmpeg -hide_banner -loglevel error -y -i $D/out/video.mp4 -c:v libx264 -preset medium -crf 23 -pix_fmt yuvj420p -color_range pc -an $D/out/video_lite.mp4
sh core/render/mux.sh $D/out/video_lite.mp4 $D/mix.wav $O/$NAME.mp4 24 1     # 11. master: -14 LUFS, a little grain
node core/render/still.mjs $D 49.2 --q nosub=1 --out $D/out --prefix sf_ && cp $D/out/sf_49.2.jpg $D/stills/styleframe.jpg
node core/render/still.mjs $D 57.6 --q nosub=1 --out $D/out --prefix po_ && cp $D/out/po_57.6.jpg $O/poster.jpg
