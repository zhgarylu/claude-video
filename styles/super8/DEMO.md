# Super 8 Home Movie — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Dad Was Here Too* (56.67 s) · `super8.mp4` · source in [`demo/`](demo/)

## Story & structure

A father films his family's 1976 seaside day on one reel and is in none of it. His shadow is the only trace: the camera held to his eye on the sand. Late in the reel his daughter takes the camera, the picture drops to sand, sky and a thumb, and then finds him. He steps in, laughs, and the reel burns out on his face. A last card says what the reel could not show. Invented family, invented town (Aldersea), invented date; nothing real appears (see `demo/FACTS.md`).

Native moves spent: the leak start (card), the splice flash and slip (four cuts), hunting for focus (after every cut and whip), **the shadow in the picture** (the signature shot), **the camera handed over** (thumb, sand, sky, whip), **burn-out**, the title written on, the rubber date stamp.

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0–5.0 | Title card on a pine table | locked, tiny drift | leak start; card written on; stamp lands at 1.67 s |
| 2 | 5.0–9.7 | Packing the estate car | wide, slow push; mum waves "not me" | splice flash and slip at the cut |
| 3 | 9.7–13.3 | Whip to Pip with bucket | whip pan with smear, refocus hunt | camera attention moves to the child |
| 4 | 13.3–25 | Beach wide, Pip runs | handheld wide with a pan | shadow of the filmmaker with the camera in the foreground |
| 5 | 25–30 | Mum and Ned | zoomed medium, push | the second refusal (wave at the lens) |
| 6 | 30–36.7 | Golden hour, Pip beckons | medium push, low sun, strong halation | warmth before the turn |
| 7 | 36.7–43.3 | The handover | big Pip reaching; thumb over the lens; tilt to sand; swing to sky; whip | silence bar (projector alone), then the Pip-sized shadow |
| 8 | 43.3–50 | Dad finds the frame | handheld medium, hunt, slow push | he walks in from the right, waves, laughs |
| 9 | 50–52.5 | The reel runs out | speed-up, frame-line slips, white, burn | native move: burn-out |
| 10 | 52.5–56.7 | End card | locked, written on | "Dad was here too." with Pip's felt-pen doodle and a second stamp |

## Score structure

3/4 at 108 BPM (bar 1.667 s, 34 bars), C major, all synthesised: ukulele, music box, detuned upright piano and a reed (harmonica-like), played through a tape model (wow 0.55 Hz and flutter 6.8 / 11 Hz, roll-off above 5.6 kHz, saturation, hiss). Bars 1–2 music box on the stamp; 3–7 ukulele strums with a bass note on the tailgate thunk (5.83 s); 8–14 waltz (oom-pah-pah) with the reed theme; 15–17 theme in thirds; 18–21 music-box arpeggios; **bar 22 (36.67–38.33 s) silence: projector and hiss only**; 23–25 no music, one low piano pair on 40.0 s; **bar 26 (43.33 s) the theme returns as Dad appears**; 30–31 the tape slows to about 45 % speed with the burn; 31.5–34 two lone music-box notes (the second on the stamp at 54.17 s). Second silence: 38.3–43.3 s under the camera's tilt. Projector bed: motor and lamp hum, an 18 Hz claw tick (climbing to about 50 Hz during the burn), a take-up reel flap slowing from 3 to 1.6 per second after 52.5 s; surf and street air under the shots. Foley is sparse and room-sized: pen scratches, stamp, tailgate, whip, bucket, thumb rub, footsteps. Mix: one compressor and limiter over everything, −14 LUFS from `mux.sh` with grain 0 (the grain is in the picture).

## Palette & props

Sea `#1f6f95`, sand `#cfa56c`, turquoise car `#4fa59f` with a cream roof, brick `#a9573d`, mustard `#d9a336`, Pip's yellow swimsuit `#f6c431`, Mum's white hat and orange dress, Dad's slate-blue shirt `#5b82ae`. Props: a striped windbreak, a deckchair, a red gingham blanket and basket, a bucket, a beach ball, a pier with a pavilion, a roof rack with a suitcase and a striped rug, a felt pen, a shell, a rubber stamp. Cast: Pip (7), Ned (3), Mum, Dad (unseen until the end, shadow earlier).

## End card

The first card turned over: *Dad was here too.* in blue felt pen (Caveat Brush) over a red squiggle, a stick-figure doodle with a camera in orange, and the same stamp struck again, crooked. The film fades most of the way to dark and stops. No studio sign-off appears in the picture; it is in this file only: **LemoLab × Claude Opus 5.5** (the library's demo credit).

## Build notes

`sh demo/build.sh` renders everything: `events.mjs` (sound events from `window.EV`), `mix.py` (score, projector, foley → `out/mix.wav`; about 3 minutes, pure numpy), `cuecheck.py` (visual hits vs bar grid and vs the music cues: 0 ms), `readcheck.mjs`, `video.mjs` at 24 fps with 3 workers (the page holds every artefact on `floor(t * 18)`), `mux.sh` with grain 0, then the poster. Files: `timeline.js` (shots, splices, hit times), `main.js` (shot recipes, handheld, focus hunt, thumb overlay, splice effects, `TEXTS`, `EV`), `engine/film.js` (WebGL2 film pass, weave, damage), `engine/figure.js` (side-view rig, `blend`), `engine/beach.js`, `street.js`, `card.js`. Stills: `node core/render/still.mjs styles/super8/demo <t>` (absolute time).

Pitfalls tied to this demo's props: far strollers must be filtered out near a standing lead (`pip: 'stand'`) or they read as part of her; a figure scaled by `ppm(y)` at y ≈ 600 is too big for a medium (use y ≈ 520–530 for Dad and Pip close shots); the filmmaker's shadow is in screen space (it belongs to the camera), the sand shadows are in world space.
