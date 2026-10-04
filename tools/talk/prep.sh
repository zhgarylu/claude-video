#!/bin/sh
# Prepare a presenter ("talking head") video for a film.
#   sh tools/talk/prep.sh <host.mp4> <project-dir> [--lang zh|en|auto] [--prompt "terms the host says"] [--fps 24] [--model large-v3-turbo]
# Writes into <project-dir>/src/:
#   host.mp4      the user's video (copied, never modified)
#   frames/0001.jpg …   every frame at --fps (host.js reads these by time)
#   voice.wav     the host's voice, mono 48 kHz
#   env.json      voice level per frame, 0..1 (drives speaking indicators and ducking)
#   words.json    speech-to-text with word timestamps (the film's cue sheet)
#   meta.json     {fps, frames, w, h, duration}
# Prints the pauses in the speech: those are your transition and camera windows.
set -e
HOST=""; PROJ=""; FPS=24; LANG_=auto; PROMPT=""; MODEL=large-v3-turbo
while [ $# -gt 0 ]; do
  case "$1" in
    --lang) LANG_="$2"; shift 2;; --prompt) PROMPT="$2"; shift 2;; --fps) FPS="$2"; shift 2;; --model) MODEL="$2"; shift 2;;
    *) if [ -z "$HOST" ]; then HOST="$1"; elif [ -z "$PROJ" ]; then PROJ="$1"; fi; shift;;
  esac
done
[ -f "$HOST" ] && [ -n "$PROJ" ] || { echo "usage: sh tools/talk/prep.sh <host.mp4> <project-dir> [--lang zh|en|auto] [--prompt \"…\"] [--fps 24]"; exit 2; }
HERE=$(cd "$(dirname "$0")" && pwd); LIB=${LIB:-$(cd "$HERE/../.." && pwd)}
PY="$LIB/.venv/bin/python"; [ -x "$PY" ] || { echo "run: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice  (needs faster-whisper)"; exit 1; }
S="$PROJ/src"; mkdir -p "$S/frames"
[ "$(cd "$(dirname "$HOST")" && pwd)/$(basename "$HOST")" = "$(cd "$S" && pwd)/host.mp4" ] || cp "$HOST" "$S/host.mp4"
ffmpeg -v error -y -i "$S/host.mp4" -vf "fps=$FPS" -q:v 3 "$S/frames/%04d.jpg"
ffmpeg -v error -y -i "$S/host.mp4" -vn -ac 1 -ar 48000 -c:a pcm_s16le "$S/voice.wav"
"$PY" "$HERE/analyze.py" "$S" --fps "$FPS" --lang "$LANG_" --prompt "$PROMPT" --model "$MODEL"
