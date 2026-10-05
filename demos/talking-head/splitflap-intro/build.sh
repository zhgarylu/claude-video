#!/bin/sh
# One command: sh films/splitflap-intro/build.sh   (host video at src/host.mp4)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../.." && pwd)}
export LIB
NAME=$(basename "$HERE")
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
[ -f "$HERE/src/host.mp4" ] || { echo "missing src/host.mp4"; exit 1; }
cd "$LIB"
mkdir -p "$HERE/out"
if [ ! -f "$HERE/src/frames/0001.jpg" ]; then sh "$LIB/tools/talk/prep.sh" "$HERE/src/host.mp4" "$HERE" --lang zh --prompt "claude-video GitHub"; fi
[ -f "$HERE/words.fixed.json" ] && cp "$HERE/words.fixed.json" "$HERE/src/words.json"
[ -f "$HERE/src/track.json" ] || "$LIB/.venv/bin/python" "$HERE/track_board.py"
[ -f "$HERE/src/card.json" ] || "$LIB/.venv/bin/python" "$HERE/track_card.py"
node core/render/events.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"
node "$HERE/cues.mjs"
"$LIB/.venv/bin/python" core/render/srt.py "$HERE/out/cues.json" "$HERE/$NAME.srt"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/$NAME.mp4" 24 0
