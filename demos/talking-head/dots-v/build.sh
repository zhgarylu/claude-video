#!/bin/sh
# One command: sh demos/talking-head/dots-v/build.sh   (put the host video at src/host.mp4 first; it is not in this repository)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
[ -f "$HERE/src/host.mp4" ] || { echo "missing src/host.mp4 (the host video)"; exit 1; }
cd "$LIB"
mkdir -p "$HERE/out"
# footage: frames, voice, voice level (once); then the hand-corrected transcript replaces the speech-to-text result
if [ ! -f "$HERE/src/frames/0001.jpg" ]; then
  sh "$LIB/tools/talk/prep.sh" "$HERE/src/host.mp4" "$HERE" --lang zh --prompt "OpenAI Dots ChatGPT Slack GPT-6"
fi
cp "$HERE/words.fixed.json" "$HERE/src/words.json"
[ -f "$HERE/src/music.wav" ] || "$LIB/.venv/bin/python" "$HERE/music.py"
node core/render/readcheck.mjs "$HERE" --size 1080x1920
node core/render/events.mjs "$HERE" --size 1080x1920
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --size 1080x1920 --out "$HERE/out/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"
node "$HERE/cues.mjs"
"$LIB/.venv/bin/python" core/render/srt.py "$HERE/out/cues.json" "$HERE/dots-v.srt"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/dots-v.mp4" 24 0
