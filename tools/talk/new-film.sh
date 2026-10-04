#!/bin/sh
# Start a talking-head film from a host video and render a first cut.
#   sh tools/talk/new-film.sh <host.mp4> films/<name> [--layout split|pip|world] [--title "…"] [--lang zh|en] [--prompt "terms the host says"] [--no-build]
# Creates the project from tools/talk/template, runs prep.sh (frames, voice, word timings), writes film.json, and builds <name>.mp4.
set -e
HOST=""; PROJ=""; LAYOUT=pip; TITLE="Talking-head film"; LANG_=zh; PROMPT=""; BUILD=1
while [ $# -gt 0 ]; do
  case "$1" in
    --layout) LAYOUT="$2"; shift 2;; --title) TITLE="$2"; shift 2;; --lang) LANG_="$2"; shift 2;; --prompt) PROMPT="$2"; shift 2;; --no-build) BUILD=0; shift;;
    *) if [ -z "$HOST" ]; then HOST="$1"; elif [ -z "$PROJ" ]; then PROJ="$1"; fi; shift;;
  esac
done
[ -f "$HOST" ] && [ -n "$PROJ" ] || { echo "usage: sh tools/talk/new-film.sh <host.mp4> films/<name> [--layout split|pip|world] [--title \"…\"] [--lang zh] [--no-build]"; exit 2; }
[ ! -e "$PROJ" ] || { echo "$PROJ already exists; choose a new folder"; exit 1; }
HERE=$(cd "$(dirname "$0")" && pwd); LIB=${LIB:-$(cd "$HERE/../.." && pwd)}; export LIB
mkdir -p "$PROJ" && cp "$HERE"/template/index.html "$HERE"/template/main.js "$HERE"/template/build.sh "$HERE"/template/mix.py "$HERE"/template/cues.mjs "$HERE"/template/README.md "$PROJ"/
sh "$HERE/prep.sh" "$HOST" "$PROJ" --lang "$LANG_" --prompt "$PROMPT"
"$LIB/.venv/bin/python" "$HERE/init_film.py" "$PROJ" --layout "$LAYOUT" --title "$TITLE" --lang "$LANG_"
if [ "$BUILD" = 1 ]; then sh "$PROJ/build.sh"; else echo "Next: edit $PROJ/film.json, then sh $PROJ/build.sh"; fi
