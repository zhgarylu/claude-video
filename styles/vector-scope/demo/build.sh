#!/bin/sh
# Rebuild "Hold the Fifth" from scratch: sh styles/vector-scope/demo/build.sh   (from any directory)
# Needs the core + voice tiers: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice
# Set RENDER_SLOTS=3 (or what your machine can spare) when other renders run at the same time.
set -e
cd "$(dirname "$0")/../../.."
PY=.venv/bin/python; D=styles/vector-scope/demo; O=styles/vector-scope; NAME=vector-scope
mkdir -p $D/out $D/voice
python3 $D/tools/gen_font.py                                            # 1. the single-stroke vector font -> vfont.json (ours, drawn for this film)
$PY core/tts/tts.py $D/lines.json $D/voice                              # 2. Kokoro voice (bm_george), offline
$PY core/tts/asr_check.py $D/lines.json $D/voice                        # 3. speech-to-text check of every line
node $D/tools/make_caps.mjs                                             # 4. captions: caps.json + out/srt.json
$PY $D/mix.py                                                           # 5. the scope stem (out/scope.bin), score, foley, voice -> out/mix.wav
$PY core/render/srt.py $D/out/srt.json $O/$NAME.srt                     # 6. .srt
node core/render/events.mjs $D                                          # 7. events.json
node core/render/readcheck.mjs $D                                       # 8. reading time of every label
node core/render/video.mjs $D --fps 24 --workers 3 --out $D/out/video.mp4   # 9. every frame, drawn from the samples in out/scope.bin
sh core/render/mux.sh $D/out/video.mp4 $D/out/mix.wav $O/$NAME.mp4 24 0     # 10. master: -14 LUFS, no grain (a vector display has none)
node core/render/still.mjs $D 21.9 --q nosub=1 --out $D/out --prefix sf_ && cp $D/out/sf_21.9.jpg $D/stills/styleframe.jpg
node core/render/still.mjs $D 53.4 --out $D/out --prefix po_ && cp $D/out/po_53.4.jpg $O/poster.jpg
