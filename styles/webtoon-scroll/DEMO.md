# Webtoon Scroll: our demo

**One example among many. Don't reuse its story, arc, shots, props or timings.**

Demo: *The Umbrella Says No* (Little Weather, Ep. 07; 62.5 s, 1080 x 1920) · `webtoon-scroll.mp4` · source in [`demo/`](demo/)

## Story and structure

A silent comedy episode. Mina, a commuter, owns an umbrella (Dewey) that refuses to open on rainy days. She argues with it three ways (asking, pressing the button, pulling), loses, walks nine blocks in the rain, and when it slips out from under her arm she chases it down a long staircase and lands in a puddle. Then the rain stops, Dewey opens by himself, the hang tag reads PARASOL / sunny days only, and he says "I said no." Tomorrow's forecast is snow; Dewey gulps. The strip ends on the episode bar.

Why it fits: the story is made of the format's own timings. The refusals are gutter-length beats, the walk is a slow drift, the chase is a staircase so tall that only a whip scroll can read it, the pause after the splash is a tall white gutter, and the reveal is a second hard stop. The umbrella's only voice is a squared balloon.

Native moves used: tall gutter as silence (twice), whip down a tall borderless panel with speed lines and a ride-along sound word, hard stop with a jolt (twice), sound words breaking panel edges (CLICK CLICK, GRRRNK!, SPLOSH, SPLASH!!, FWOOMP!, GULP), walk through two panels with a dry stranger passing behind, zoom in place on the button panel, reveal on scroll, a palette turn when the sun comes out, a hang tag as an insert, a cliffhanger, the end bar with stars, a bursting like, a subscribe pill and three picture-only tiles, "swipe up" / "tap to continue" micro-UI and a scroll thumb at the edge.

## Shot list

Frames: [title](demo/stills/frame_title.jpg) · [hall](demo/stills/frame_hall.jpg) · [button](demo/stills/frame_close.jpg) · [walk](demo/stills/frame_walk.jpg) · [whip](demo/stills/frame_whip.jpg) · [stop](demo/stills/frame_stop.jpg) · [parasol](demo/stills/frame_sun.jpg) · [punchline](demo/stills/frame_punch.jpg) · [cliffhanger](demo/stills/frame_cliff.jpg) · [end bar](demo/stills/frame_end.jpg)

| # | Time | Panel | Scroll | Note |
|---|---|---|---|---|
| 1 | 0 to 2.5 | title: umbrella in a stand under a rain window | drift 36 px | hook: the umbrella's face; title pops at 0.35 s |
| 2 | 2.5 to 10 | hall: Mina, forecast box, "Okay, buddy. Be normal today." | glide, then drift | page holds for the two texts |
| 3 | 10 to 17.5 | tall gutter with "drip... drip...", then the button close-up | glide, drift | CLICK, "No.", CLICK CLICK, "NO."; zoom in place 1.00 to 1.13 |
| 4 | 17.5 to 24.4 | tug of war, "...Fine." | glide, drift | GRRRNK! breaks the top edge |
| 5 | 24.4 to 30.6 | street walk, then boots in a puddle | slow drift (130 px/s), parallax | narration, thought cloud, a stranger with a real umbrella, SPLOSH |
| 6 | 30.6 to 33.1 | top of the staircase: the umbrella slips | glide, hold | "HEY!" |
| 7 | 33.1 to 36.25 | the staircase (one 4,200 px panel) | **whip**, hard stop with a jolt | DOKA x3 ride along at parallax 0.12; Dewey tumbles ahead, Mina chases, grows with depth |
| 8 | 36.25 to 41.25 | SPLASH!! in the puddle, then white | hold, slow drift | silence 1 starts at the stop; rain tapers; "(the rain stops.)" in the gutter |
| 9 | 41.25 to 44.4 | sky and street in sun, rainbow | glide, drift | FWOOMP!, the parasol opens (spring), palette turns warm |
| 10 | 44.4 to 50 | punchline panel | **stop** (accelerating hard stop) | tag insert, "...It's a parasol.", silence 2, "I said no." |
| 11 | 50 to 55 | cliffhanger: tomorrow's forecast | glide, drift | phone buzz, SNOW, GULP, "To be continued..." |
| 12 | 55 to 62.5 | end bar | glide, drift | next-episode card, stars, like, subscribe, tiles |

## Score structure

96 BPM (bar 2.5 s), C major pentatonic with a minor colour for the walk. Original, synthesised: kalimba melody and soft bass in the hall; ticks and a tightening A / E ostinato for the tug with a sad slide for "...Fine."; a dragging off-beat stroll for the walk; a drone and an accelerating tick before the whip; 16th-note kalimba arpeggios with kick and snare on the whip, **cut dead on the stop at 36.25 s**; silence until a warm pad on the sun (41.9 s); the full loop returns with FWOOMP; **everything out from 46.95 to 47.58 s**; the loop returns in half-light under "I said no."; a suspended chord that does not resolve for the cliffhanger; the bright loop for the end bar with stars as a pentatonic ladder and a long final chord.

## Palette and props

Page `#f7f5ee`; ink `#1b2340`; rain blues `#8da6c0` to `#dbe5ee`, slate `#5a7391`, deep `#35496b`; Mina's coat mustard `#f2b632` (shade `#d38f1c`), boots teal `#2f9a94`, hair `#2a2236`; Dewey coral `#ef6b5a` (shade `#cd4a3d`) and cream; sun `#ffd45a`, warm sky `#ffe9ae`, peach `#ffc79c`. Props: a steel umbrella stand, a hang tag, a rain window, a station staircase with rails, a puddle, a rainbow, a phone showing the forecast, a dry stranger with a navy umbrella. All drawn in code.

## End card

None beyond the episode's own end bar (a next-episode card, stars, like, comments, share, subscribe, three picture-only tiles). It is part of the format, not a sign-off.

## Build notes and code entry points

`sh styles/webtoon-scroll/demo/build.sh` rebuilds everything (core tier only; fonts are downloaded once). Rendering takes about two minutes with two workers (plus the mux), because the whip and the zoom-in-place blocks are heavy.

- `demo/timeline.js`: the panel list (heights and gutters), the camera (`SEGS`: drift, glide, whip, stop; `IMPACT` jolts), `enterT` (the moment a position enters the screen), all story cues (`CUE`), the rain curve.
- `demo/art.js`: palette, outline helpers, Mina (`mina`), Dewey (`dewey`), balloons, narration boxes, sound words, bursts.
- `demo/panels.js`: the eleven panel drawers and Dewey's fall path.
- `demo/main.js`: layout, clipping, borderless fade, the over-pass for things that break panel edges, motion blur on a whip (7 sub-frame samples), speed lines, reader UI overlay, the sound events, `TEXTS`, and `wide()` for the 16:9 gallery card (three screens of the strip side by side).
- `demo/mix.py`: the whole sound track (beds, foley, score, silence gates, master).

Pitfalls tied to this demo: a text must stay fully in the frame for its reading time, so texts that would scroll away during the whip ("HEY!", DOKA) are drawn on the 0.12 parallax layer; the end page has no `weekly` caption because it could not be held long enough; `readcheck` needs `--size 1080x1920`; the card is rendered with `--size 1920x1080` and ignores the time given to `still.mjs`.
