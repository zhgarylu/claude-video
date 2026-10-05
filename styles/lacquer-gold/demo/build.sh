#!/bin/sh
# One command, from anywhere: sh styles/lacquer-gold/demo/build.sh
# Needs the core + voice tiers: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice
# Set RENDER_SLOTS=3 (or your own limit) in the environment when other renders share the machine.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
[ -f "$HERE/fonts/CormorantGaramond-Italic.ttf" ] || { echo "download Cormorant Garamond (SIL OFL) into demo/fonts, see CREDITS"; exit 1; }
cd "$LIB"
PY="$LIB/.venv/bin/python"; NAME=lacquer-gold; O="$HERE/.."
mkdir -p "$HERE/out" "$HERE/voices" "$HERE/stills"
node "$HERE/tools/export_tl.mjs" "$HERE"                                  # 1. timeline.js -> timeline.json + lines.json
"$PY" core/tts/tts.py "$HERE/lines.json" "$HERE/voices"                    # 2. Kokoro voice (bf_emma), offline
"$PY" core/tts/asr_check.py "$HERE/lines.json" "$HERE/voices"              # 3. speech-to-text check of every line
node "$HERE/tools/make_subs.mjs" "$HERE"                                  # 4. captions: subs.json (burned in) + out/srt.json
"$PY" "$HERE/tools/cuecheck.py" "$HERE"                                    # 5. picture hits on the music grid
node core/render/events.mjs "$HERE"                                       # 6. window.EV -> events.json
node core/render/readcheck.mjs "$HERE"                                    # 7. every caption and title stays long enough
"$PY" "$HERE/mix.py" "$HERE"                                              # 8. score + foley + rain + voice -> out/mix.wav
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"   # 9. every frame
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$O/$NAME.mp4" 24 0   # 10. master: -14 LUFS, no grain (the lacquer must stay clean)
"$PY" core/render/srt.py "$HERE/out/srt.json" "$O/$NAME.srt"              # 11. .srt
node core/render/still.mjs "$HERE" 40.4 --q nosub=1 --out "$HERE/out" --prefix sf_ && cp "$HERE/out/sf_40.4.jpg" "$HERE/stills/styleframe.jpg"
node core/render/still.mjs "$HERE" 55 --q nosub=1 --out "$HERE/out" --prefix po_ && cp "$HERE/out/po_55.jpg" "$O/poster.jpg"
echo "done: styles/$NAME/$NAME.mp4"
