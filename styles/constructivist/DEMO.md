# Bauhaus & Constructivist Poster — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Thirty Metres* (52 s) · `constructivist.mp4` · `constructivist.srt` · source in [`demo/`](demo/)

## Story & structure

A four-runner relay team learns where the race is decided: not in the hundred metres, but in the thirty-metre zone where the baton must change hands. Structure: *a funnel*. The film starts at the whole event (4 × 100), narrows to the zone, to one hand-over, to three hand-overs in a row, to one pass that goes wrong, then opens out into a team and a locked title card. Seven poster sheets, joined by wedge wipes (one hard cut on the failure). No voice: on-screen type and drum hits carry the film. Every number on screen is checked in [`demo/FACTS.md`](demo/FACTS.md).

## Shots

| Time | Sheet | Camera | Native move / note |
|---|---|---|---|
| 0–7 | Title: megaphone, red sound cone, ochre disc, constructed 4×100, arc text, ledger bars, cut-out runner | locked, blocks slide on the −33° axis | assembly on the axis; first hit at 0.0 s |
| 7–8 | Wedge wipe (1.0 s) | wedge leads along the axis | wedge wipe |
| 8–15 | The box: diagonal lane, ochre zone with a 20 + 10 scale, a runner hands the baton to the next | wide, slow push 1.0 → 1.03 | photomontage paste; baton hops hands on the beat at 10.0 s |
| 15–22 | The zone as a quantity: "30", 20 m before the line, 10 m after, arrow, runner on a halftone disc | locked | scale ruler, constructed numeral |
| 22–30 | Three exchanges: four runners, a red trail that follows the baton, zones 1 2 3 | wide, runners move along the lane | the baton hops at 24.5, 26.0 and 27.5 s |
| 28.5–30 | Silence | the sheet holds | the first real silence |
| 30–38 | The failure: the pass happens past the zone's edge; red cross, "OUTSIDE THE BOX", "DISQUALIFIED"; plates torn apart | hard cut on the drum hit | register slam, sustained; second silence 31.5–35, ended by the baton's knock |
| 38–45 | The wall: the team and three rows of people behind it | slow lateral drift | photomontage paste, one figure per beat |
| 45–52 | Card: THIRTY METRES, baton bar, "PASS IT IN THE BOX"; plates drift into register at 48.0 s | locked | the plates settle once; title held 4 s |

## Score structure

- 120 BPM, 4/4 (beat 0.5 s, bar 2.0 s), E minor pentatonic, 26 bars. Drum-led: kick and snare from bar 0, pizzicato bass and muted trumpet stabs from bar 1, a hi-hat groove from 8 s, accordion pad from 15 s, four on the floor from 22 s. A snare roll rides every wedge wipe.
- Stop at 28.5 s; the failure at 30.0 s is the first sound back (kick, crash, E over F in the brass). A second silence 31.5–35.0 s leaves only room tone and rivet ticks; the wood knock of the dropped baton at 35.0 s is the first sound after it. The full band returns for the wall; at 48.0 s everything lands together and one E chord is held.
- Every picture hit is on the 16th-note grid and on a whole frame: `demo/tools/cuecheck.py` (0 ms). Foley per kind of hit: block slam (wood on felt), paper slap, letterpress clack, ruling-pen scratch, megaphone crackle, wood knock.

## Palette, props and end card

Paper `#e8dcc0`, red `#e03a1f`, black `#17130f`, ochre `#dba22c`. Props: megaphone, sound cone, disc and ring, lane with a zone, scale ruler, baton, riveted cut-out runners. The end card is the film's own title card; there is no sign-off line.

## Build notes

`sh demo/build.sh` from the library root: events, reading check, 24 fps frames (3 workers, about 3 minutes), score and foley, cue check, subtitles, mux (−14.2 LUFS). Entry points: `demo/engine.js` (plates, overprint, halftone, `runner`, `numeral`, `wedgeBands`), `demo/scenes.js` (the seven sheets, `SHEETS` timeline; each sheet is a function of local time with a recorder for hits and texts), `demo/index.html` (dry run for `EV` and `TEXTS`, wipe compositor), `demo/mix.py`. Fonts: Barlow Medium (OFL, `demo/fonts/`, not committed); the heavy letters and numerals are drawn.
