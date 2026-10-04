# Neon Signage — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *The Last Bowl on Pell Street* (54 s) · `neon-sign.mp4` · source in [`demo/`](demo/)

## Story & structure

A noodle bar's sign is lit every evening by its owner. Tube by tube it wakes, the neighbours on the street go dark one after another, and in the small hours one stroke of the L in NOODLES stops for good. A short blackout, the sign returns without that stroke, the owner leaves it, and at dawn the daylight wins over the glow and a hand throws the breaker. What is left is grey glass with one dark gap.

Structure: *a single night told by the sign's states* (ignition → the street goes dark → flicker and dead segment → blackout and return → a passer-by in the wet street → dawn → breaker). The street of neighbours is a short lateral pass inside it. Native moves spent: *the tube lights along its path* (opening and the ignition), *a dead segment* (the turn), *the street answers* (the reflection carries a passer-by under an umbrella), *power cut and restart*.

The world is one continuous wall and street (about 4 800 world px wide) with one camera path. There is no cut except in the dark: the blackout hides the jump from the macro on the dead L back to the wide.

## Shots

| Time | Shot | Camera | Native move / note |
|---|---|---|---|
| 0–5 | Black, then the frame tube's end catches, fails, catches again; electrode boots, cables and clips show as the first light spreads | locked close, z 3.4, slow 2 % drift | tube lights along its path; hook inside 3 s |
| 5–12 | Pull-back while the sign lights: frame, bowl, NOODLES letter by letter, OPEN 24 HOURS | pull-back z 3.3 → 1.0 (monotone ease), then a slight push | the ignition front crosses the whole sign |
| 12–23 | Lateral pass right along the wall: 24H arrow and cup go dark, then BAR, then HOTEL; the camera waits on each switch-off, then glides back to the lit noodle sign | lateral track 3 300 px, dwell on each neighbour, return glide | a list that turns; rain begins at 21 s |
| 23–28 | Flicker: E starts sputtering, L's lower stroke fails and stays out | push z 1.0 → 1.9 | the turn |
| 28–33.3 | Macro of the dead L: boots, cable, junction box, rail and clips; the dead glass sputters twice | push z 1.9 → 3.2, hold | dead segment, hardware legible |
| 33.3–37.5 | Blackout and return, locked wide (the cut is made in the dark) | locked z 1.0 | power cut and restart |
| 37.5–43.5 | Tilt down to the wet street; a passer-by with an umbrella crosses in front of the wall and in the reflection | tilt cy 430 → 705, hold | the street answers |
| 43.5–54 | Dawn: ambient rises, glow loses, rain stops; a hand comes into frame, throws the breaker, everything goes out to grey glass | tilt up and pull back to z 1.0, slight push | breaker at 50.0 s, hold to the end |

## Score structure

- 72 BPM, 4/4 (beat 0.8333 s, bar 3.333 s), A minor; chords Am9 → Fmaj7 → Cmaj7 → G6, one per bar. All picture hits are on the beat grid (`demo/tools/cuecheck.py`, offset 0 ms).
- Section 1 (5.0–20.0): pad from the first pull-back, electric piano arpeggios from bar 3, sine bass, brush hats and a sparse tape-delayed lead on the street pass. The music is **gated** at the third switch-off (20.0 s), tail included.
- Section 2 (23.3–33.3): bass pedal on A, swelling pad, sparse piano; a minor-second cluster when the L dies (27.5 s). Gated at the blackout.
- Blackout (33.3–35.8): hum and rain only. The first sound after the silence is the restart thump on beat 1 of bar 11 (35.83 s).
- Section 3 (35.8–43.3): one held chord (Am9), slow piano, two lead notes under the passer-by.
- Section 4 (43.3–50.0): A add9, the only major colour, once; thinning, gated at the breaker (50.0 s); the transformer whine and the hum fall away and the film ends on room tone and birds.
- Silences: the 5 s of hum alone before the music starts, 20.0–23.3 (rain, hum, the camera whoosh), the blackout, and the last 4 s.
- Voice: Kokoro `bm_george`, speed 0.9, six short lines; music ducks about −6 dB, foley −2.5 dB under it. J-cut: the camera whoosh starts at 20.35 s, before the neighbours' last switch-off settles; L-cut: the hum and rain run through the blackout cut.

## Palette & props

- Gases: red-orange (letters), argon blue (frame, HOTEL, steam), warm white (the bowl), green (OPEN line, 24H arrow), pink (BAR), orange (cup). At most three on screen at once except in the neighbour pass.
- The noodle sign: a rounded frame tube with a 120 px gap and two boots; a bowl icon with chopsticks and two steam tubes; NOODLES at 190 px letter height; OPEN 24 HOURS at 60 px on thinner tube (7.5 px). The L has its own electrodes and a junction box under the word.
- Hardware: clips every ~170 px, rails behind the letters, a breaker box at the left with a red lever, cables, pipes between signs.
- The passer-by: a black silhouette with an umbrella, a rim of sign light on the umbrella and head; its reflection is darker than the mirror around it.
- Wall: running-bond brick with damp blotches and plaster patches; street: wet asphalt with rippled, streak-broken reflection, puddles with rain rings.

## End card

None. The film ends on the grey sign and room tone, with no card and no sign-off in the picture; the credits live in `demo/CREDITS`.

## Build notes

File map of `demo/`:

| File | Role |
|---|---|
| `neon.js` | renderer: albedo + light map, emitters, glass, bloom, hardware layer, wet street, rain, day / dawn, subtitles hook |
| `glyphs.js` | single-stroke tube alphabet, icons, frame tube, `fillet` |
| `main.js` | the scene: signs and their life (ignition, flicker, dead stroke, blackout, restart, breaker), hardware, camera tracks, passer-by, hand, captions |
| `timeline.js` | one timeline for picture, sound and subtitles (times, voice lines, hum curve, sound events, music gates) |
| `mix.py` | score + beds + foley + voice → `mix.wav` (numpy only) |
| `tools/` | `export_tl.mjs` (timeline → json, lines), `make_subs.mjs` (captions), `cuecheck.py` |
| `build.sh` | one command: `sh styles/neon-sign/demo/build.sh` |
| `fonts/` | Barlow Medium (OFL); not committed, `build.sh` fetches it |

Order: `export_tl.mjs` → `tts.py` → `asr_check.py` → `make_subs.mjs` → `cuecheck.py` → `mix.py` → `srt.py` → `readcheck.mjs` → `video.mjs` → `mux.sh` (no grain) → stills. The mix takes a few minutes (reverb and many synthesised notes); the picture is about 1.3 s per frame per worker.

Pitfalls tied to this demo's props:
- A clip disc sized for the title tube hides a 7.5 px tube: clip radius scales with the sign's own tube diameter.
- The reflection's streak mask must be built on a separate canvas: `destination-in` with several rectangles erases everything outside the last one.
- The passer-by is drawn after the street, and its reflection is a flipped, dark copy about its feet, not about the kerb.
- In daylight the white-hot cores wash the tubes pale; that is intended at dawn, and the lit sign must still read against the sunlit wall.
