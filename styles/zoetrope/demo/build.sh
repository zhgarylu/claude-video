#!/bin/sh
# One command: sh styles/zoetrope/demo/build.sh   (clone mode; set LIB=<library folder> in skill mode)
# Needs the core + voice tiers: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice
# Set RENDER_SLOTS=3 (or what your machine can spare) when other renders run at the same time.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
PY=$LIB/.venv/bin/python; D=$HERE; O=$HERE/..; NAME=zoetrope
mkdir -p $D/out $D/voice
[ -f $D/fonts/IMFellEnglish.woff2 ] || { echo "fonts missing: copy them as listed in demo/CREDITS"; exit 1; }
node $D/tools/export_tl.mjs                                         # 1. timeline.js -> timeline.json (incl. the rotation table the sound follows)
$PY core/tts/tts.py $D/lines.json $D/voice                          # 2. Kokoro voice (bf_emma), offline
$PY core/tts/asr_check.py $D/lines.json $D/voice                    # 3. speech-to-text check of every line (also writes words.json)
node $D/tools/make_caps.mjs                                         # 4. printed-slip captions: caps.json + out/srt.json
$PY $D/mix.py                                                       # 5. score + foley + voice -> mix.wav
$PY core/render/srt.py $D/out/srt.json $O/$NAME.srt                 # 6. .srt
node core/render/events.mjs $D                                      # 7. events.json
node core/render/readcheck.mjs $D                                   # 8. reading time of every label
node core/render/video.mjs $D --fps 24 --workers 3 --out $D/out/video.mp4   # 9. every frame
# 10. the paper texture is costly to encode: a first lossy pass (same pixel format) keeps the film under about 60 MB
nice -n 10 ffmpeg -hide_banner -loglevel error -y -i $D/out/video.mp4 -c:v libx264 -preset medium -crf 27 -pix_fmt yuvj420p -color_range pc -an $D/out/video_lite.mp4
sh core/render/mux.sh $D/out/video_lite.mp4 $D/mix.wav $O/$NAME.mp4 24 0 # 11. master: -14 LUFS, no grain (the paper carries the texture)
node core/render/still.mjs $D 43.0 --q nosub=1 --out $D/out --prefix sf_ && cp $D/out/sf_43.0.jpg $D/stills/styleframe.jpg
node core/render/still.mjs $D 12.9 --q nosub=1 --out $D/out --prefix po_ && cp $D/out/po_12.9.jpg $O/poster.jpg
