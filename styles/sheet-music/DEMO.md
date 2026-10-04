# Sheet-music Motion — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Four Notes* (50 s) · `sheet-music.mp4` · source in [`demo/`](demo/)

## Story & structure

A short lesson in making one idea last. A four-note seed is engraved on a manuscript page and played; then it is repeated, turned upside down and stretched to double length. At the end of the stretch the page unrolls into a landscape, where the same moves return layered, mirrored (contrary motion) and louder, and the film closes on a held chord while the camera pulls back over the colour the score has left on the paper.

Structure: *a lesson with a turn* (seed, repeat, invert, stretch on the page; layered, contrary motion, louder, home in the landscape). Native moves spent: *the note lights as it sounds*, *a notehead blooms*, *the staff bends*, *the melody is a ribbon*, *the page opens into a landscape* (the signature shot), *mirror* (bar 11), *marginalia* (the brackets). One composition, one event list: the notation, the picture and the soundtrack all read it.

## Shots

| Time | Shot | Camera | Native move / note |
|---|---|---|---|
| 0–3 | A blank page on a dark desk; the title writes in, two systems are engraved left to right under a pen scratch | locked, flat | marginalia; sound starts at 0.5 s with the pen, the hook |
| 3–21.4 | The seed and its answer, the repeat, the inversion, the stretch on system 1 and 2; the playhead glides along, fades at the line break; brackets label each move | locked | the note lights as it sounds; a blossom blooms under each mallet note |
| 21.4–24.8 | The unroll: systems slide right (x), then the rows merge (y); staves start to bend; the page edge leaves | pan right while the rows merge | the page opens into a landscape |
| 24.8–40 | Layered, contrary motion (two ribbons mirror), louder (hairpin) | playhead follow, playhead at 30 % of the width | blooms, ripples, ribbons; hills for the bass |
| 40–44.8 | Home: D sharp resolves to E under a fermata; the camera zooms out to 0.5× and the staves drift apart over the last 8 bars | pull-back | the panorama: red clouds, blue hedge, olive hills |
| 44.8–50 | The held chord rings out; one caption; the room fades | locked panorama | silence after the last note |

## Score structure

- 92 BPM, 4/4 (beat 0.652 s, bar 2.609 s), E minor; first downbeat at 3.00 s, last bar line at 44.74 s; 16 bars, three voices. Chords per bar: Em Am Em Am C G Em Em G C Am D Em Em B Em.
- Bars 1–2 lead alone (p); 3–6 mallets enter with an eight-note arpeggio (mp, mf); 7–8 the bass enters with whole notes; 9–16 half-note roots and fifths, f from bar 9, a hairpin to ff in bars 13–14, a B major cadence with D sharp in bar 15, a fermata chord in bar 16 (decays 2 s past the last bar line).
- Silences: the half rests in bars 2, 4, 6, 10, 12 are real silence; the 3 s before the first note hold only pen and room; after the chord only room tone.
- No voice-over: seven italic captions. J-cut: the paper-slide noise starts 0.4 s before the unroll; L-cut: the last chord rings over the pull-back.
- Everything audible is in the event list (`events.json`: notes, pen strokes, label ticks, the slide, the captions); `demo/tools/cuecheck.py` finds every attack within 12 ms of its event.

## Palette & props

- Paper #efe3c6 with fibre and foxing, desk dark umber, ink #2a2118, umber annotations; pigments: vermilion #c8432a (lead), prussian blue #256a8c (mallets), olive ochre #8a7418 (bass); playhead sepia #8d4423.
- Props: the manuscript page with two systems, instrument names in their pigment, a metronome mark, section brackets, a legend in the landscape.

## End card

None in the picture. The sign-off for the library demo, kept here only: LemoLab × Claude Opus 5.5 (also the first line of `demo/CREDITS`).

## Build notes

File map of `demo/`:

| File | Role |
|---|---|
| `score.js` | the composition and the single event list: `EV`, `RESTS`, `CHORDS`, motif tools (`phrase`, `invert`, `stretch`, `shift`), `sounding(t)` |
| `engrave.js` | SMuFL glyph codes, chord, beam and slur drawing, page and landscape layouts, playhead mapping |
| `main.js` | `render(t)`: paper, layout blend (x then y), waves, blooms, ribbons, playhead, labels, captions, `TEXTS`, the sound events in `window.EV` |
| `mix.py` | synthesises lead, mallets, bass, foley and room from `events.json` → `out/mix.wav` and stems |
| `tools/` | `proof.mjs` (pixel proof that heads change exactly at their onsets), `cuecheck.py`, `make_srt.py`, `sheet.py` (contact sheets) |
| `build.sh` | one command: `sh styles/sheet-music/demo/build.sh` |
| `fonts/` | Bravura and EB Garamond (OFL); not committed, `build.sh` fetches them |

Order: `events.mjs` → `proof.mjs` → `mix.py` → `cuecheck.py` → `make_srt.py` + `srt.py` → `readcheck.mjs` → `video.mjs` (3 workers, about 2.5 min) → `mux.sh` (no grain) → stills.

Pitfalls tied to this demo's props:
- A bass hill under a long note must be as wide as the note: width = seconds × pixels per second of the current layout, which changes during the unroll.
- The page rectangle must grow faster than the staves slide off it, or staves run onto the desk.
- Whole rests hang from the fourth line, half rests sit on the middle line; both need their own offsets.
- The fermata notes last 1.9× their length so the final chord can decay; the picture reads the same longer duration.
