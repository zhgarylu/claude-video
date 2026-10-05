#!/bin/sh
# Rebuild "Three Cards for a Yes" from scratch: sh styles/tarot/demo/build.sh   (from any directory)
# Needs the core + voice tiers: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice
set -e
cd "$(dirname "$0")/../../.."
PY=.venv/bin/python; D=styles/tarot/demo; O=styles/tarot; NAME=tarot
mkdir -p $D/out $D/voices
# fonts: IM Fell English (SIL OFL 1.1) comes with the library (core/fonts); the cards, the cloth, the seal and the ornaments are drawn in code
node $D/tools/export_tl.mjs $D                                   # 1. timeline.js -> timeline.json (events, voice cues) + lines.json
$PY core/tts/tts.py $D/lines.json $D/voices                      # 2. Kokoro voice (bf_emma), offline
$PY core/tts/asr_check.py $D/lines.json $D/voices                # 3. speech-to-text check of every line
node $D/tools/make_subs.mjs $D                                   # 4. captions: subs.json (burned in) + out/srt.json
$PY $D/mix.py $D                                                 # 5. score + foley + room + voice -> mix.wav
$PY core/render/srt.py $D/out/srt.json $O/$NAME.srt              # 6. .srt
node core/render/readcheck.mjs $D                                # 7. every on-screen text (captions, labels, seal, title) stays long enough to read
node core/render/video.mjs $D --fps 24 --workers 3 --out $D/out/video.mp4   # 8. every frame (set RENDER_SLOTS when other renders run)
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 0         # 9. master: -14 LUFS, no added grain (the cards carry their own paper texture)
node core/render/still.mjs $D 50.2 --q nosub=1 --out $D/out --prefix sf_ && cp $D/out/sf_50.2.jpg $D/stills/styleframe.jpg
node core/render/still.mjs $D 31.0 --q nosub=1 --out $D/out --prefix po_ && cp $D/out/po_31.0.jpg $O/poster.jpg
