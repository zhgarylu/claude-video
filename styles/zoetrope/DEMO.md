# Zoetrope & Phenakistoscope: our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Nothing Moves* (54 s) · `zoetrope.mp4` · source in [`demo/`](demo/)

## Story & structure

Logline: twelve drawings of a bird do not move; a spin, a slit and a mirror make them fly, and the same trick, aliased by the film's own 24 frames a second, shows that everything on a screen is stillness shown fast.

An explainer by experiment, in four acts: the disc at rest and its first turn (0-8 s); the viewing arrangement and the three speeds, slow / right / backwards (8-25 s); the camera joins in and the wheel creeps backwards while the birds keep flapping (25-33 s); the ring unrolls, bends into a drum and a gentleman walks (33-46 s); it stops and the bookend comes back (46-54 s). Native moves spent: spin-up (the loop emerges in the mirror), the slit strobe (a row of numbered thumbnails lights one drawing per flash), speed change and reversal, the wagon wheel (the ring stands still at exactly 2 turns a second = 30 degrees per frame, then creeps backwards at 1.9), the wheel of frames unrolling into a strip (and the cards flipping to the walker), the drum from above and from the slit side, stop.

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0-7.5 | the disc at rest on a walnut table, "Nothing here moves." | slow push 1.0 to 1.1 | twelve stills; first silence from 5.8 s |
| 2 | 7.5-16.3 | the disc starts; slides left in the frame as the mirror, thumbnails and dial slide in | pan right | spin-up; slit strobe |
| 3 | 16.3-24.5 | push to the mirror at the slow speed (flicker), pull back (fusion), reversal | push 1.2, pull, push 1.15 | speed change |
| 4 | 24.5-33.5 | close-up of the disc, shutter shortened from 55 % to 3 % of a frame | push to 1.7, rotate -5 deg | wagon wheel |
| 5 | 33.5-36 | twelve cards lift off the disc and unroll into a strip across the table | pan along the strip, pull out | ring to strip |
| 6 | 36-47.5 | the strip flips to the walker, curls into a ring seen from above, a brass sleeve lowers, the drum tilts to the slit side and turns | pitch 0 to 52 to 10 degrees, push to 1.55 | strip to drum; stop |
| 7 | 47.5-54 | the drum at rest; pull back to the table with the disc (its birds restored) beside it | pull to 0.84 | echo of shot 1 |

## Score structure

3/4 waltz at 96 BPM (1 beat = 15 frames, 1 bar = 1.875 s, 29 bars), E minor / G major. Music box, reed organ, soft bass, wood ticks. Bars 0-3: no music (room tone, candle, a clock once a bar); the first near-silence 5.8-7.5 s ends with the pin click. Bars 4-7: broken Em chord on the box with the reed under the spin-up. Bars 8-15: phrase A (Em C G D) then phrase B (Em Am B7 Em), phrase B's notes reversed within each bar for bars 12-13 as the disc is turned the other way. Bars 14-17: thin repeating high tines while the clockwork ticks accelerate into the lock. Bars 18-23: full waltz for the unroll and the drum. From bar 24 the clock slows (time stretched, pitch down up to 1.6 semitones). Second near-silence 48.0-50.2 s after the drum stops. Three last tines after the final line. The whir and every slit click are generated from the same rotation table as the picture, so the lock at 2 turns a second is a 24 Hz rattle.

## Palette & props

Card `#efe2bf`, ink `#241509`, sepia `#6f4a2a`, brass `#b98a3a`, walnut `#2a190d`; one bird (side view, wing as a fan of 14 feathers, tail fan, hatching on the belly), one gentleman (frock coat, top hat, cane, moustache), a disc with a ring inscription and a guilloche centre, an oval brass mirror, a clip at the line of sight, a speed dial with a red needle, a numbered thumbnail rail, paper tags, a drum with gilt dots on lacquer panels.

## End card

None: the last image is the two toys at rest on the table with the line "Nothing moves. We only look quickly." The disc's birds are back (the swap happens off screen, while the camera is on the drum).

## Build notes

`sh styles/zoetrope/demo/build.sh` renders the whole film (about 10 minutes with three workers; set `RENDER_SLOTS`). Files:

- `timeline.js`: BPM grid, scene times, speed keys (rev/s), the rotation table at 1920 Hz, phase locks on the plateaus at plus or minus 2 turns a second (`LOCKS`: a smooth correction in the ramp before the plateau so that `theta(n/24) mod 30` equals a chosen 3 degrees).
- `engine/eye.js`: the mirror image. A leaky integrator (tau 0.04 s) stepped every 0.52 ms through the rotation table; a slit crossing at theta = 30 degrees x m adds light to drawing (m - 3) mod 12.
- `engine/drum.js`: strip cards curling (arc-length parameter, curvature 0 to 2 pi / 12 pitches), orthographic pitch, shell panels between slits; the frame is the mean of sub-frames over one slit pitch of rotation (capped at 0.12 s), then the pixels seen through the slits are rescaled around the paper level so figures keep their contrast.
- `engine/art.js`, `engine/ink.js`, `engine/world.js`: the drawings, the engraver's pen and hatching, paper, table, disc, cards, brass.
- `main.js`: camera keys, scenes, disc shutter (`meanRender`), ring pose during the unroll (`ringPose`), tags, slips, light.
- `mix.py`, `tools/export_tl.mjs`, `tools/make_caps.mjs`, `lines.json`, `caps.json`, `CREDITS`, `TREATMENT.md`.

Pitfalls tied to this demo: the drum direction is negative (counter-clockwise from above) so that the walker's frames play forward through the front slit; the disc's tiles are laid tangentially (up toward the counter-clockwise neighbour) because the line of sight is at 3 o'clock; `proof/` (a tile contact sheet page) is a development aid.
