#!/bin/sh
# Rebuild "Print It True" from scratch: sh styles/newsprint/demo/build.sh   (from any directory)
# Needs the core + voice tiers: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice
# Set RENDER_SLOTS=3 (or what your machine can spare) when other renders run at the same time.
set -e
cd "$(dirname "$0")/../../.."
PY=.venv/bin/python; D=styles/newsprint/demo; O=styles/newsprint; NAME=newsprint
mkdir -p $D/out $D/voice
# fonts live in demo/fonts (EB Garamond, Cormorant Garamond, IM Fell English, Courier Prime; all SIL OFL 1.1, see CREDITS)
[ -f $D/fonts/EBGaramond.ttf ] || { echo "fonts missing: copy them as listed in demo/CREDITS"; exit 1; }
node $D/tools/export_tl.mjs $D                                      # 1. timeline.js -> timeline.json
$PY core/tts/tts.py $D/lines.json $D/voice                          # 2. Kokoro voice (bm_fable), offline
$PY core/tts/asr_check.py $D/lines.json $D/voice                    # 3. speech-to-text check of every line
node $D/tools/make_caps.mjs                                         # 4. galley-slip captions: caps.json + out/srt.json
$PY $D/tools/cuecheck.py                                            # 5. picture hits <-> music grid
$PY $D/mix.py                                                       # 6. score + foley + voice -> mix.wav
$PY core/render/srt.py $D/out/srt.json $O/$NAME.srt                 # 7. .srt
node core/render/readcheck.mjs $D                                   # 8. reading time of every headline / caption / stamp
node core/render/video.mjs $D --fps 24 --workers 3 --out $D/out/video.mp4   # 9. every frame
# 10. the paper texture moves with the camera and is costly to encode: a first lossy pass (same pixel format) keeps the final file near 70 MB
ffmpeg -hide_banner -loglevel error -y -i $D/out/video.mp4 -c:v libx264 -preset medium -crf 25 -pix_fmt yuvj420p -color_range pc -an $D/out/video_lite.mp4
sh core/render/mux.sh $D/out/video_lite.mp4 $D/mix.wav $O/$NAME.mp4 24 0       # 11. master: -14 LUFS, no grain (the paper carries the texture)
node core/render/still.mjs $D 26.4 --q nosub=1 --out $D/out --prefix sf_ && cp $D/out/sf_26.4.jpg $D/stills/styleframe.jpg
node core/render/still.mjs $D 51.5 --q nosub=1 --out $D/out --prefix po_ && cp $D/out/po_51.5.jpg $O/poster.jpg
