#!/bin/sh
# One command: font subsets, voices (when missing), events, picture, score and mix, mux, subtitles, poster.
# Run from anywhere:  sh styles/dunhuang/demo/build.sh   (needs: setup.sh deps and deps voice; network for the fonts and edge-tts the first time)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
PY="$LIB/.venv/bin/python"
OUT="$HERE/out"; mkdir -p "$OUT"
# 1. fonts: OFL subsets only (Google Fonts CSS API, &text=)
"$PY" "$HERE/subset_fonts.py"
# 2. voice: Yunxi (edge-tts), then the speech-to-text check (the model hears homophones of 丝带 and 醒, so lines.json carries asr fields)
if [ ! -f "$HERE/voices/dur.json" ]; then "$PY" core/tts/tts_zh.py "$HERE/lines.json" "$HERE/voices"; fi
WHISPER_MODEL=${WHISPER_MODEL:-small} "$PY" core/tts/asr_check.py "$HERE/lines.json" "$HERE/voices" --lang zh
# 3. events, checks, picture (3 workers), score and mix, master
node core/render/events.mjs "$HERE"
"$PY" "$HERE/cuecheck.py" > "$OUT/cuecheck.txt"
node core/render/readcheck.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$OUT/video.mp4"
"$PY" "$HERE/mix.py"
sh core/render/mux.sh "$OUT/video.mp4" "$OUT/mix.wav" "$HERE/../dunhuang.mp4" 24 1
"$PY" "$HERE/make_srt.py" "$HERE/../dunhuang.srt"
node core/render/still.mjs "$HERE" 36.5 --prefix poster_ --out "$OUT"
cp "$OUT/poster_36.5.jpg" "$HERE/../poster.jpg"
