# Assembly Manual: the demo film

**One example among many. Don't reuse its story, arc, shots, props or timings.**

"Drip 1: Assembly Guide" (58 s, 1920x1080, 24 fps, narrated in English, captioned). An invented pour-over coffee stand, "Drip 1, model PO-1", is built from eight parts (A base, B pole, C arm, D ring, E cone, F carafe, G four screws, H hex key). No real brand, product or manual layout.

## Story and structure
The exploded cover is a promise made of dotted lines; each of five steps spends one dotted line; after the last click the page goes quiet; then one drop falls into the carafe and the done page is the cover again, assembled and working. The pace tightens from three-bar pages to a two-bar page (step 4), then holds a bar of stillness before the payoff.

## Shot list (one page = one shot; 100 BPM, bar 2.4 s)
| Time | Page | What happens |
|---|---|---|
| 0.0-4.8 | cover | Six parts fly in and snap into an exploded stack on beats 1-4 (a click each, in near-silence); dotted lines join them to where they will go |
| 4.8-12.0 | parts | Eight cells snap in on eighths; a blue tick lands on each as the narration counts "six pieces, four screws, one key" |
| 12.0-19.2 | step 1 | Pole drops on the base; two screws drop in; a zoom circle opens on the flange and a hex key turns each screw in ratchet steps, then clicks |
| 19.2-28.8 | step 2 | Arm slides down the pole; a person pictogram presses the base; a zoom circle opens on the knob, which ratchets round |
| 28.8-36.0 | step 3 | Ring slides onto the arm; the wrong way (notch up) is circle-slashed with a thud; the right way is ticked; two screws drop in |
| 36.0-40.8 | step 4 | Cone lowers into the ring (the shortest page) |
| 40.8-48.0 | step 5 | Carafe slides under; a zoom circle measures the 2 cm gap; the circle closes and the music ends: 3 s of quiet |
| 48.0-58.0 | done | Page slides in almost silently; the first drop plinks; a check badge and "Done"; five progress ticks; drops every two beats fill the carafe; a zoom circle on the liquid |

## Score structure
Original loop in C major pentatonic, 100 BPM, I - vi - IV - V. Silence for the first 2.4 s except the part clicks; quarter-note marimba arpeggio from bar 1; bass from the parts page; eighth-note arpeggio, bass on 1 and 3 and brushed shaker from step 1 (12 s); thinned to bass and half the arpeggio on the last bar of step 4 and step 5 (43.2 s); out at 45.6 s; the loop returns with a warm pad at 50.4 s. The narration ducks the music by 5 dB.

## Palette and props
Paper `#f6f3ec`, ink `#1d1f24`, signal blue `#1f6bff` for motion only, warning red for the one "do not". Parts: wood base and arm, steel pole and collar, dark ring, ceramic cone, glass carafe, coffee `#6a3f26`. Props: eight parts, quantity boxes, a person pictogram, a circle-slash, five progress ticks.

## End card
None. The last page is the finished object dripping; it fades to paper in the last 0.5 s. (No LemoLab sign-off in this film, per MAINTAINING.md the sign-off lives only in the library's demos that carry one.)

## Build notes and code entry points
`sh styles/assembly-manual/demo/build.sh` rebuilds everything (core + voice tiers; fonts are fetched). A crash mid-render loses nothing: run it again (`video.mjs --resume`).
- `demo/timeline.js`: pages, narration start times, per-page motion times `T`, and the sound events derived from the same numbers; captions.
- `demo/draw.js`: the parts and pictograms, outline width compensation (`setZ`/`lw`), the snap ring, dotted lines.
- `demo/main.js`: the page layouts, `figState` (what the stand looks like on each page at time u), the zoom circle (`bubble`: a clipped redraw at 3x), the page slide, captions, `window.TEXTS`.
- `demo/mix.py`: loop, foley, narration, ducking, limiter (keeps the true peak under -1.2 dB so `mux.sh` passes).
- `demo/tools/export_srt.mjs`: the caption cues, shared with the page.
