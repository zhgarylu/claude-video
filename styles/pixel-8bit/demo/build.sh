#!/bin/sh
# One-command build of the Dusklight demo: hardware audit, events, subtitles, frames (30 fps), chip mix, mux, checks, poster.
# Clone mode: run from anywhere (LIB defaults to the repository root). Skill mode: put LIB=<path setup.sh printed> in the environment.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
STYLE=$(cd "$HERE/.." && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
PY="$LIB/.venv/bin/python"
mkdir -p "$HERE/out" "$HERE/stills"
node "$HERE/check.mjs" | tee "$HERE/stills/constraint_check.txt" | tail -3          # every scene and every video frame must satisfy the hardware limits
node core/render/events.mjs "$HERE" --out "$HERE/out/events.json"
"$PY" "$HERE/mksrt.py"                                                            # pixel-8bit.srt from the same event list
node core/render/video.mjs "$HERE" --fps 30 --workers 3 --out "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py"                                                              # chip score and sfx -> out/mix.wav
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$STYLE/pixel-8bit.mp4" 30 0
node core/render/readcheck.mjs "$HERE"
ffmpeg -nostats -v info -i "$STYLE/pixel-8bit.mp4" -vf blackdetect=d=0.05:pic_th=0.98 -an -f null - 2>&1 | grep blackdetect || echo "blackdetect: no black frames"
node core/render/still.mjs "$HERE" 0 --q "f=872" --prefix styleframe_tmp_ --out "$HERE/out" >/dev/null
cp "$HERE/out/styleframe_tmp_0.jpg" "$HERE/stills/styleframe.jpg"
ffmpeg -v error -y -ss 14.5 -i "$STYLE/pixel-8bit.mp4" -frames:v 1 "$STYLE/poster.jpg"
echo "done: $STYLE/pixel-8bit.mp4"
