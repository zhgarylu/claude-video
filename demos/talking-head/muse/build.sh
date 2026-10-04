#!/bin/sh
# 一键出片：sh demos/talking-head/muse/build.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
[ -f "$HERE/src/host.mp4" ] || { echo "missing src/host.mp4 (the host video)"; exit 1; }
cd "$LIB"
mkdir -p "$HERE/out"
# footage: frames, voice, voice level (once). The host video is not in this repository: put yours at src/host.mp4
if [ ! -f "$HERE/src/frames/0001.jpg" ]; then
  sh "$LIB/tools/talk/prep.sh" "$HERE/src/host.mp4" "$HERE" --lang zh
  [ -f "$HERE/patch_calendar.py" ] && "$LIB/.venv/bin/python" "$HERE/patch_calendar.py"
fi
node core/render/readcheck.mjs "$HERE"
node core/render/events.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"
node "$HERE/cues.mjs"
"$LIB/.venv/bin/python" core/render/srt.py "$HERE/out/cues.json" "$HERE/muse.srt"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/muse.mp4" 24 0
