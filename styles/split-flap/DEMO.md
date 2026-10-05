# Split-flap Board — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *The Long Way Round* (60 s) · `split-flap.mp4` · source in [`demo/`](demo/)

## Story & structure

A departure board at an invented night station, Marlow Central, starts up: every cell cycles the whole wheel in a wave, the header settles, four departures write themselves. The narrator says that every change on this board is a journey, and the camera dives into the hinge of the B in HARBOUR; the gap between the two halves opens like a shutter into a section drawing: two stacks of flaps on a spool, a ratchet and pawl, the wheel's 40 characters laid out in order, and the same cell seen from the front. B to A is one step on the wheel's ordering, but the pawl refuses it: the long way is thirty-nine flaps, an accelerando that lands on the downbeat, counted on a two-digit counter. Back at the board, the 23:50 to Harbour is delayed: its status block turns amber, its time rolls round past midnight to 00:40, and the three lines above it re-write themselves upward to make room. The narrator announces ten seconds to the last train; a clock on a digit wheel counts down on the beat, the stamp turns green at zero under a horn, and the board stays silent for two seconds before every cell falls blank. The film ends on a sentence spelled cell by cell, "GOING BACK MEANS GOING ROUND.", while the voice says the same thing.

Why it fits: the cost of a step back is the mechanism's own rule, so the explanation (the dive), the plot (a delay forces a rewrite) and the last line are one idea; every picture event has a sound, and the clatter is derived from them. Native moves used: power-on test, scramble-to-settle, the status stamp, rows shift up, the countdown clock, the alphabet wheel in section, the sentence spelled cell by cell, the board falls blank.

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0.0-4.8 | the dark board; every cell cycles in a wave; header settles | wide, slow push 1.00 to 1.05 | power-on test; the caption strip cycles too |
| 2 | 4.8-9.6 | four departures and the ticker write themselves, one row per beat | wide, tilt down | scramble-to-settle; voice 1 |
| 3 | 9.6-12.4 | push into the hinge of the B; the gap opens as a shutter | exponential push 1x to 14x about the hinge | transition made from the medium |
| 4 | 12.4-25.5 | section drawing: wheel strip, stacks of flaps, ratchet, pawl, front cell, counter. Two slow flaps, a silence, the pawl's refusal, then 39 flaps landing on bar 11 | locked drawing, slow 5 % push | alphabet wheel in section; voices 2 and 3 |
| 5 | 25.5-28.2 | the gap closes, whip pull-out to the board | pull-out about the hinge, then slow push | the room comes back before the picture |
| 6 | 28.2-34.2 | chime; HARBOUR's status block turns amber; its time rolls to 00:40 | push to z=1.1 centred on the top rows, hold | status stamp; voice 4 |
| 7 | 34.2-38.4 | the lines re-write upward, HARBOUR moves to the bottom | pull back to medium wide, drift | rows shift up |
| 8 | 38.4-45.6 | LAST TRAIN IN 00:10 counting down on the beat | push to z=2.5 on the clock, shaking with the flap density | countdown clock; voice 5 |
| 9 | 45.6-49.2 | zero: horn, the status block turns green; then two seconds of room tone | fast pull-back to wide | stamp; silence 2 |
| 10 | 49.2-60 | the board falls blank; the sentence is spelled | slow push on rows 2 and 3 | board falls blank; sentence cell by cell; voice 6 |

## Score structure

Tempo 100 BPM, 4/4 (bar 2.4 s), D dorian. A dark sub swell under the power-on test; from bar 3 soft bass on beats 1 and 3 and a mallet arpeggio in eighths over Dm; the music thins during the dive and stops at the shutter. Inside the case: a held D pad, then nothing; the pawl's tink is the first sound after the silence; a rising sine under the 39-flap accelerando lands on a low D with the thunk. Back in the hall the mallet and bass return over Dm, G, Dm, C, Am; the countdown has a bass pulse on every beat and the arpeggios climbing; zero is a Dm9 stab with the horn; then 2.2 s with no music (silence 2) until the board falls; the sentence gets one mallet note per word and ends on a D major pad. Clatter is not scored by hand: mix.py reads `events.json` (one event per flap landing, about 24 000) and places a click for each. Mix: flap bus compressed and ducked 6 dB under the voice, voice compressed, −14 LUFS at the mux.

## Palette & props

Warm near-black housing with bevel, bolts and two hanger rods; cards `#302c28` over `#1e1c19`, type `#f3e7ca`; amber `#f3b63c` status cards; green `#3aa86e` for DEPARTED; amber numerals for the clock and the counter. Barlow Medium, thickened. The invented lines: 23:50 HARBOUR, 23:58 OLD MILL, 00:12 EAST QUAY, 00:25 LANTERN BAY.

## End card

None. The last image is the sentence on the board, held for about 3.5 s after the last letter lands.

## Build notes

Files in `demo/`: `index.html`, `main.js` (page contract, camera shake from flap density, TEXTS for the reading check), `flap.js` (wheel, Cell, `write`), `film.js` (board geometry, the whole script of writes, camera table, shutter), `draw.js` (card faces, the hinged fall, housing, the section drawing), `timeline.js` (key times, voice lines, caption rows), `mix.py`, `tools/export_tl.mjs`, `build.sh`, `lines.json`, `CREDITS`, `TREATMENT.md`.

`sh styles/split-flap/demo/build.sh` (needs the core and voice tiers) runs: voice, speech check, timeline export (it checks the voice lengths and that the key times are on the eighth-note grid), events export, reading check, mix, srt, render (about three minutes with three workers), mux, styleframe and poster.

Pitfalls tied to this demo: flap duration must not equal the frame time (here 0.04-0.06 s with per-cell jitter); countdown digits and the 39-flap counter change faster than a reading time, so they are left out of `TEXTS` (the voice and caption carry the number); the caption strip is drawn over the board in screen space, so `TEXTS` skips any board text below y=880; the character `B` is transcribed "be" by the speech check, so line 3 carries an `asr` override.
