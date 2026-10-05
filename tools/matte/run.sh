#!/bin/sh
# Person mattes for a host video's frames: sh tools/matte/run.sh films/<name> [--scale 0.5] [--instances]
# Reads <film>/src/frames/*.jpg, writes <film>/src/matte/*.png (RGBA, alpha = person). macOS only (Apple Vision); elsewhere it exits 3
# and a page falls back to its colour key. Compiles person.swift once into the user cache.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; FILM="$1"; shift || true
[ -n "$FILM" ] && [ -d "$FILM/src/frames" ] || { echo "usage: sh tools/matte/run.sh <film dir> [--scale 0.5] [--instances]  (needs <film>/src/frames, from tools/talk/prep.sh)"; exit 2; }
[ "$(uname)" = Darwin ] && command -v swiftc >/dev/null || { echo "matte: needs macOS with swiftc; the page keeps its colour key"; exit 3; }
BIN="${XDG_CACHE_HOME:-$HOME/.cache}/lemo-opuscar/person"; mkdir -p "$(dirname "$BIN")"
[ "$BIN" -nt "$HERE/person.swift" ] || swiftc -O "$HERE/person.swift" -o "$BIN"
[ "$(printf '%s ' "$@" | grep -c -- --scale)" = 0 ] && set -- --scale 0.5 "$@"
"$BIN" "$FILM/src/frames" "$FILM/src/matte" "$@"
