# Doodle Science Explainer — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Why Is the Sky Blue?* (62 s, 9:16) · `doodle-science.mp4` (also built in 16:9 with `ASPECT=16x9`) · source in [`demo/`](demo/)

## Story & structure

Logline: a kid with round glasses asks why the sky is blue, then draws it: light hits air molecules, blue gets knocked about, violet loses for three reasons, and the same rule makes the evening red.

Arc: **hook** (question, "don't swipe away, I'll draw it") → **the mechanism** drawn on one page (sun, seven-colour beam, molecules, two travellers that behave differently, blue everywhere into an eye) → **turn** (the guide asks the next question in a bubble) → **three reasons** as three small charts → **stamp** ("blue wins!") → **second case** (sunset) → one-line sign-off. Shaped after a short-video explainer format (hook, a subject with a face, one long drawing take, a question that turns the story, a condition page); none of that video's material is used (see `teardown/` in the film project, not in the library).

Native moves spent: hook then promise, subject with a face (molecules, sun), two actors two behaviours (blue bounces, red goes straight), turn by question, charts as sketches, stamp the answer, payoff page.

## Pages

Five pages; the page sweep (a paper-coloured band with an ink edge) is the only transition.

| Page | Time | Content | Camera |
|---|---|---|---|
| A hook | 0 to 7 | blue wash blooms as the sky, title written on, the guide points up then waves; comment words drift by | locked |
| B mechanism | 7 to 32 | sun and seven-colour beam, label; 24 molecules pop in; wavelength legend (short blue wave, long red wave); a blue and a red traveller cross the air, the blue one bounces; blue photons scatter in all directions, some into an eye; "this is called scattering" | locked |
| C question | 32 to 37 | violet wave and label; the guide with a hand on the chin; speech bubble "then why isn't the sky violet?" and an orange question mark | locked |
| R reasons | 37 to 51 | three numbered charts appear one per sentence (sunlight spectrum with little violet, eye sensitivity, upper air absorbing violet); the stamp "Blue wins!" | locked |
| S sunset | 51 to 62 | orange wash, the sun low, the guide small on the ground; a band of thick air between them, a long double arrow, blue travellers peeling away, red and orange ones arriving; the sign-off | locked |

The line starts come from the voice durations (`voices/dur.json`) plus gaps in `timeline.js`, so the film re-times itself when a line changes.

## Score structure

108 BPM, C major pentatonic. Pluck bass on beats 1 and 3, a marimba figure on the off-beats from bar 2, a shaker on the eighths, a marimba chord every second bar; the level ramps up over the first five bars. Music ducks about 6 dB under the voice. Foley per event: pen scratch, pops, boings, a bell, the stamp, whooshes. -14 LUFS, true peak about -2 dBFS.

## Palette & props

Paper `#f4efe4`, ink `#2b2622`, sky `#74b8e8`, grass `#a9cb8c`, sun `#f6c545` / `#ee8a3a`, sweater teal `#58aaa3`, skin `#f1c9a0`, hair `#2a2630`; the spectrum for charts: violet `#8f6bc9`, blue `#3f86d6`, cyan `#4cb7d1`, green `#6dbb6a`, yellow `#f0c93e`, orange `#ee8a3a`, red `#e0483f`.

Props, all drawn in code: the guide "Xiao Man" (bob hair, round glasses, teal hoodie with a star; poses point, wave, think, talk), the sun with a face and rays, an air molecule, a photon (a bullet with eyes and a tail), an eye, clouds, a ground line, a speech bubble, a rotated stamp card, bar charts.

## Build notes

`sh styles/doodle-science/demo/build.sh` (needs a network once, for the edge-tts voice and the two Google Fonts); `ASPECT=16x9 …` builds the landscape film from the same page (`?aspect=16x9`), the same voice and score.

- `ink.js` is the engine: `pen` (wobble, boil, taper, draw-on), `wash` (offset, rim, second layer, bloom), `shape`, `paper`, `write` (written-on text), `host`, `sun`, `molecule`, `photon`, `eye`, `wavy`, plus spline helpers (`loop`, `smooth`, `blob`, `ell`, `bez`, `quad`).
- `main.js` holds the five scenes and the layout for both aspects (`pick(portrait, landscape)`), the sound events and the subtitle.
- `timeline.js` turns `lines.json` and `voices/dur.json` into start times and the scene boundaries.
- `mix.py` places the narration (events of type `voice`), the score and the foley from `events.json`.
- Voice: edge-tts `zh-CN-YunxiNeural`; one line (`h2`) has an `asr` field because the speech check hears "划" as "画".
- `readcheck` flags the voice-synced captions and the drifting comments as shorter than reading time; this is known, not a bug.

Pitfalls met here: the paper noise tile multiplied the page to grey until it was centred near white; a wash polygon scaled about its centre showed as an inner rectangle until the second layer was offset instead of shrunk; the narrow subtitle line ran off the frame until it was shrunk to fit; the facts on the charts are sketches, not data (see `FACTS.md`).
