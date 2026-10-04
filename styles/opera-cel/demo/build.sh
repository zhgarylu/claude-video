#!/bin/sh
# One command: font subsets, voices (when missing), events, picture, score and mix, mux, subtitles, poster.
# Run from anywhere:  sh styles/opera-cel/demo/build.sh   (needs: setup.sh deps, plus `pip install fonttools brotli` in the library's .venv;
# the voices use edge-tts and need a network connection the first time)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
PY="$LIB/.venv/bin/python"
OUT="$HERE/out"; mkdir -p "$OUT"
# 1. fonts: download the OFL fonts to a cache and subset them to the characters the film draws (only fonts/sub/ is used by the page)
"$PY" "$HERE/subset_fonts.py"
# 2. voices: Yunxi for Shigong, Xiaoxiao for Qingluan, then the speech-to-text check
if [ ! -f "$HERE/voices/dur.json" ]; then
  "$PY" core/tts/tts_zh.py "$HERE/lines.json" "$HERE/voices"
fi
WHISPER_MODEL=${WHISPER_MODEL:-small} "$PY" core/tts/asr_check.py "$HERE/lines.json" "$HERE/voices" --lang zh
# 3. timeline events, picture, sound
node core/render/events.mjs "$HERE"
node core/render/readcheck.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$OUT/video.mp4"
"$PY" "$HERE/mix.py"
sh core/render/mux.sh "$OUT/video.mp4" "$OUT/mix.wav" "$HERE/../opera-cel.mp4" 24 1
"$PY" "$HERE/make_srt.py" "$HERE/../opera-cel.srt"
node core/render/still.mjs "$HERE" 18.1 --prefix poster_ --out "$OUT"
cp "$OUT/poster_18.1.jpg" "$HERE/../poster.jpg"
