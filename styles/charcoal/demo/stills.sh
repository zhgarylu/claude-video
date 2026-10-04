#!/bin/sh
# Re-render the review stills with the real drawing code (one page load per still: the sheet replays up to t).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
cd "$LIB"
S="$HERE/stills"
shot() { # t, query, name
  node core/render/still.mjs "$HERE" "$1" --q "$2" --prefix "$3" --out "$S" >/dev/null
  mv "$S/$3$1.jpg" "$S/$3.jpg"
}
shot 31    'cam=1800,1000,0.58'          styleframe
shot 22.75 'cam=2190,780,1.45&nocap=1'   frame_house
shot 38.9  'cam=2450,880,1.25&nocap=1'   frame_ghost
shot 25.6  'cam=1750,1000,1.0&nocap=1'   shot_a_erase
shot 26.4  'cam=1750,1000,1.0&nocap=1'   shot_b_smudge
shot 28.0  'cam=1750,1000,1.0&nocap=1'   shot_c_redraw
shot 54.9  ''                             frame_end
ls "$S"
