# Transit Map — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Three Angles to Anywhere* (54 s) · `transit-map.mp4` · source in [`demo/`](demo/)

## Story & structure

Halden is an invented city with five invented lines. A "you are here" dot sits on blank paper; the real city grows around it (river, parks, streets, five thin rail lines, crooked names) and, pulled back, it is unreadable. "So the map tells a useful lie": from the city centre outwards the lines straighten onto the 0/45/90° grid in a wave that clicks at every corner, the streets and parks fall away, stops become ticks, interchanges become rings, and names set themselves flush to the lines. The chime of the lock, then a second of silence. The legend then builds its rules while the camera shows each one obeyed on the map (a 30° stroke is refused and snapped to 45°; one weight along a whole line; a tick next to a ring; zone bands). The payoff is a journey: pin at Quill Lane, a lantern at Rook Point, everything but the route dims, a three-car train takes Fern, changes at Linden to the Ring, changes at Ember Wharf to Saffron and arrives. A last crane-out, and the dot returns as a pin at the end of the route.

Structure: *the honest lie* (tangle → straightening → the rules → one journey → arrival). It spends the geography-to-diagram morph at the peak (8.5–14 s), the legend that builds for the middle, and the route highlight, transfers, train and "you are here" for the payoff.

## Shots

| Time | Shot | Camera | Native move / note |
|---|---|---|---|
| 0–7 | A dot on blank paper pings; streets, a river, parks and five rail lines scribble outward from it | pull-out from 2.6× on the dot to the whole city | hook: the tangle's scale revealed by pulling back |
| 7–14 | The straightening wave from the city centre outward; hard stop at 14.0 on a chime | slow push 0.94 → 0.98, wide | geography → diagram; each corner snaps on an eighth note |
| 14–15 | The finished diagram, held in silence | locked wide | beauty shot |
| 15–19.4 | Legend panel wipes in; angle rosette builds; a 30° dashed stroke is snapped to 45° | frame shift (0.98 → 0.8), then push-in to Fern's elbow (2.3×) | rule 1 |
| 19.4–23 | Everything but Copper dims; caliper guides run along it; five swatches build | lateral track along Copper | rule 2 |
| 23–26.8 | A STOP at Pike Street, A CHANGE at Wren Junction | push-in (2.1×) | rule 3 |
| 26.8–30 | Zone 2 and zone 1 tints fill outward; faint numerals | pull-out to wide | zone bands |
| 30–34.5 | Pin drops on Quill Lane; lantern lands on Rook Point; all other lines dim | push to Quill Lane (2×), pull-out to wide | you are here / route highlight |
| 34.5–45.5 | Train leaves, ripples at each change, takes each line's colour, journey card ticks off legs | follow-cam on the train (1.7×) | transfer, train |
| 45.5–47 | Arrival; near-silence | follow-cam releases | second silence |
| 47–54 | Crane-out; the lines regain colour; the pin settles at Rook Point and pulses; title plate | pull-out to wide, shift to centre | echo of the opening dot |

## Score structure

- 120 BPM, 4/4 (beat 0.5 s, bar 2 s), G. Every visual hit sits on the eighth-note grid (`demo/tools/cuecheck.py`, offset 0 ms).
- 0–8: a drone (G + D) and a marimba that never plays the same bar twice. 8.5–14: a locked marimba ostinato on eighths, bass from 10, rail ticks on every beat; the 17 corner snaps of the straightening are the marimba notes of an ascending pentatonic run (centre outward) and the 36 stops set down as a roll of ticks and small bells. Hard stop on 14.0 with a four-note chime (G B D then a high G, with the C♯ lift).
- 14.1–15.0: silence (bed hum starts under it at 14.5, the J-cut). 16–30: vibraphone arpeggios over G – Em – C – D, one chord per bar, rail ticks on beats 2 and 4; the legend's events (spokes, swatches, chimes) are mallet notes in the same scale. 30–45.5: marimba arps on eighths, kick on 1 and 3, bass pulses, a rail tick on every eighth; wheel clacks locked to the train's speed profile.
- 45.5: a single G bell and the brake hiss, then near-silence until the voice at 46.7. Last bars: a pad swell under the voice, three sparse vibes notes, a G major chord with the final pulse at 50.0.
- Voice: Kokoro `bf_emma`, speed 0.95, eleven short lines; music ducks about −7 dB under it.

## Palette & props

Paper `#F4F0E8`, ink `#1D2433`, slate `#5A6170`, river `#CFE0E8`, parks `#D9E4CE`, zones `#E8DCBE` / `#EFE8D4`. Lines: Copper `#E2582C` (1), Violet `#7B3FA0` (2), Fern `#2E9B58` (3), Ring `#1E5BC6` (4, a closed octagon), Saffron `#EBA400` (5). 36 stations, 10 interchanges; line weight 11 px, corner radius 62 px, tick 34 × 4.5 px, ring radius 15.5 px. Props: the dot / pin, a lantern, a three-car train with a colour stripe, a cartouche ("Halden · Transit Diagram"), station-sign caption plates.

## End card

The title plate "Three Angles to Anywhere" with the five line colours as key bars under it, over the finished diagram. No sign-off.

## Build notes

- `sh demo/build.sh` rebuilds everything (≈ 20–25 min on an M-series laptop, most of it the 1 296-frame render). Needs the core and voice tiers. `demo/fonts/Barlow-Medium.ttf` is downloaded from google/fonts if absent.
- File map: `network.js` (data and geometry), `labelgeom.js`, `tools/placelabels.mjs` → `labels.json`, `tools/netcheck.mjs`, `timeline.js` → `tools/export_tl.mjs` → `timeline.json`, `lines.json` (voice lines) → `voices/`, `tools/make_subs.mjs` → `out/srt.json`, `mix.py` → `mix.wav`, `main.js` + `index.html` (the page), `tools/cuecheck.py`.
- Technique: one **rounded-polyline builder** draws every line from its waypoints each frame; waypoints interpolate between a geographic and a diagram position by a per-waypoint delay (quantised to eighth notes), and the corner radius lerps with them, so a shared interchange stays coincident through the whole morph. Stations are anchored to waypoints and read their position and tangent from the built path. The camera, labels, callouts and train all use one world → screen function.
- Reading check: station names, legend rows, callouts and the title are fed to `window.TEXTS`; captions are checked by the `.srt` rules.
- Pitfalls met: Whisper mis-hears invented names (Linden → "London"; `lines.json` carries an `asr` override for that line); a chime that rings through a silence must be shortened and gated; reverb impulse responses must be energy-normalised or the music swamps the voice.

Stills the docs link: [style frame](demo/stills/styleframe.jpg), [opening](demo/stills/doc_0.6.jpg), [morph](demo/stills/doc_10.5.jpg), [zones](demo/stills/doc_27.8.jpg), [journey](demo/stills/doc_36.8.jpg).
