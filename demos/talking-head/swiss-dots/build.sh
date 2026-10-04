#!/bin/sh
# One command: sh demos/talking-head/swiss-dots/build.sh   (put the host video at src/host.mp4 first)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
[ -f "$HERE/src/host.mp4" ] || { echo "missing src/host.mp4 (the host video)"; exit 1; }
cd "$LIB"
mkdir -p "$HERE/out"
# footage: frames, voice, voice level (once). The transcript is then replaced by the hand-corrected one (words.fixed.json)
if [ ! -f "$HERE/src/frames/0001.jpg" ]; then
  sh "$LIB/tools/talk/prep.sh" "$HERE/src/host.mp4" "$HERE" --lang zh --prompt "OpenAI Dots ChatGPT Slack GPT-6"
fi
cp "$HERE/words.fixed.json" "$HERE/src/words.json"
"$LIB/.venv/bin/python" "$HERE/score.py"
node core/render/events.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"
node "$HERE/cues.mjs"
"$LIB/.venv/bin/python" core/render/srt.py "$HERE/out/cues.json" "$HERE/swiss-dots.srt"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/swiss-dots.mp4" 24 0
