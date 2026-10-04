# Blue-and-White Porcelain — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *The Blue Only Arrives in the Fire* (54 s) · `blue-white.mp4` · source in [`demo/`](demo/)

## Story & structure

A bare white vase turns in silence. A brush paints a river round it, the camera rises to its mouth and falls through the rim into the painted landscape, and the painting is the world for a moment. Back out, the vase goes into the kiln grey and chalky; the fire turns the grey strokes blue. The vase breaks and reassembles, aged, and ends on a shelf among others.

Native moves spent, in order: painted onto the turning vessel; through the rim into the painting; the fire; macro of the heaped-and-piled blue; shards reassemble; kiln-fresh to aged. The turn is the fire (before it, cobalt is grey on chalk). No voice-over: English subtitles on porcelain plaques, music and foley only.

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0–5.1 | bare vase turning, one low bowl, a drip | locked hero | silence before the first touch |
| 2 | 5.1–21 | rings, foot petals, lotus scroll, ruyi collar, neck, then a four-character inscription written stroke by stroke | hero; the vase turns to bring the brush to the front | painted onto the turning vessel |
| 3 | 21–25.8 | rise to the vase mouth, look down into it, an iris opens | rise, then top-down | through the rim |
| 4 | 23.4–31.2 | a plate landscape painted live inside the opening (mountains, pines, rocks, bamboo, boats, reeds), camera pushing in | top-down push-in | the painting is the world |
| 5 | 29.4–35.4 | iris closes back onto the vase, which stands in a kiln; heat swells, a white flash, grey becomes blue | pull-back to hero | the fire |
| 6 | 35.4–38.4 | macro over the fired glaze: dark pooled blue, speckle, crackle, the calligraphy | lateral glide | heaped-and-piled |
| 7 | 38.4–43.2 | the vase shatters into about 250 shards, which reassemble as the aged vase | locked hero | shards reassemble |
| 8 | 43.2–54 | aged vase beside a bamboo jar and a lotus bowl; pull-back; title plaque; fade | slow pull-back | one among many |

## Score structure

100 BPM (beat 0.6 s, bar 2.4 s), D pentatonic. Near-silence to 5.4 s (one bowl). 5.4–21: guqin alone, pipa joins at 13.2 s. 23.4–30.0: bamboo flute melody over soft frame drum. 30.0–33.6: only the kiln roar, then a held silence after the flash; the first sound is a tap on glaze at 33.6 s, with a guqin harmonic. 35.4–38.4: pipa arpeggio and flute. 38.4: a drum hit as the vase breaks. 43.2: a bowl strikes as it settles, the theme returns and thins to one guqin note. Hits sit on the beat grid (`demo/cuecheck.py`).

Foley: brush on biscuit (dry noise, brighter for thin strokes, louder on ring lines), wheel hum while painting, iris whoosh, kiln roar and cooling ticks, shard chimes, a glaze tap, room tone, a drip, distant birds at the end. All synthesised in `demo/mix.py` (numpy only).

## Palette & props

Cobalt ramp from `#D4E3F5` to `#06103A` over aged-ivory glaze `#E6DDC7`; dark slate ground; kiln orange only in the kiln. Props: a plum vase (`meiping`), a plate, a jar and a bowl (lathe profiles); a bamboo-and-brass brush; porcelain subtitle plaques.

## End card

The title is the last plaque, "The Blue Only Arrives in the Fire", over the shelf, and the film fades to dark. The sign-off "LemoLab × Claude Opus 5.5" is in `demo/CREDITS` only.

## Build notes

`sh styles/blue-white/demo/build.sh` (events, readcheck, picture with 3 workers, score and foley, cuecheck, master, subtitles, poster). Files in `demo/`: `index.html` (page contract), `film.js` (timeline, scenes, plaques, kiln, shards, brush overlay), `engine/` (see STYLE.md §10), `mix.py`, `cuecheck.py`, `cues.json`, `fonts/` (Cormorant Garamond subset), `FACTS.md`, `TREATMENT.md`.

Pitfalls tied to this demo's props: the iris must be centred on the screen-space mouth (the camera looks straight down at the mouth, so it is the centre); shards sample a vase-only render (no ground) and the ground is drawn separately so no shadow is carried off; wheel-turned rings take 0.45 s each, so the vase spins fast and the brush follows a smoothed target to avoid snapping.
