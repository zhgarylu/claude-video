# Charcoal Sketch Animation — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *The Bend* (57 s) · `charcoal.mp4` · source in [`demo/`](demo/)

## Story & structure

One sheet of paper is pinned to a board, and a river bend is drawn on it. Each spring the bank is rubbed out and drawn again nearer the one house, and the sheet keeps every earlier bank as a faint ghost. In the ninth year the river reaches the door: the house is lifted off the paper with the eraser and redrawn higher on the slope, in the same red chalk. The camera pulls back to the fan of nine years of banks, and the title is rubbed into the empty corner. The only warm colour is the sanguine door and window.

Four pencil slips act as the narrator's diary ("Year one. The river keeps to its bed." and so on). There is no voice-over. Native moves used: *the ghost stays* (every year), *light by erasing* (clouds, water glints, the lane), *the thumb wipe* (rubbing the water between banks), *accent in sanguine*, *tool on the paper*.

The film is fictional: no real place, person or brand appears, so there is no `demo/FACTS.md`.

## Shots

One sheet; the camera moves over it (z is the zoom on the 3600 × 2000 sheet).

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0 – 7 | wide, whole sheet with pins and board | slow push, z .54 → .64 | toning: side-of-the-stick sweeps, thumb wipes, clouds lifted |
| 2 | 7 – 12 | medium, ridge and distant trees | push and drift | one hard ridge line over a rubbed ground |
| 3 | 12 – 17 | medium, the bend | push toward the bend | river from broad strokes and a thumb; water glints lifted; reeds |
| 4 | 17 – 24 | medium to close, tree and house | lateral glide, settle | the red door and window arrive last and small |
| 5 | 24 – 25 | same | hold | near-silence; the clock stops |
| 6 | 25 – 33 | close on the bank, year three | hold, push | eraser lifts the old bank, thumb rubs, the new bank is drawn nearer; ghost visible |
| 7 | 33 – 41 | medium, year seven | slow glide | shorter, quicker marks; fence posts become soft grey after-images |
| 8 | 41 – 45 | medium, river at the door, year nine | push | the bank reaches the door |
| 9 | 45 – 51 | medium to close, the old site and the new one | push and hold | the house is erased and the ground rubbed back; the house is redrawn uphill |
| 10 | 51 – 57 | wide, whole sheet | pull-back, then a 4 s hold | the fan of ghost banks; the title written into the sheet |

## Score structure

60 BPM, 4/4, D Dorian; one beat is 1 s and one bar 4 s. Bars 1 – 2: bowed cello drone under the toning. Bars 3 – 6 (8 – 24): plucked bass on beats 1 and 3, a felted piano motif from 12 s that thins to two notes by 22 s. **Silence 24 – 25** (music and foley gated shut, room tone only, the clock stops). From 25 s: a frame drum and the low D land on every erasure (25, 33, 41, 45), bowed vibraphone on every new bank (27, 35, 43), the plucked bass resumes between. 36 – 41 s is the one acceleration: the plucked line divides into half-beats, then thirds. **Silence 44 – 45**. At 45 s the cello re-enters, at 47 s a piano melody rises while the red door is redrawn, and on 51 s (the title) a bowed vibraphone chord is held to the end. Every film hit is a score note on the beat grid; `demo/tools/cuecheck.py` checks 0 ms for all nine.

Foley is synthesised from the hand operations exported in `events.json` (stroke rasp by radius and layer, thumb whisper, eraser squeak and crumble, paper laid on and slid off), over a brown-noise room tone with a faint clock. The mix is foley first; the music sits about 5 dB under it and ducks under loud foley.

## Palette & props

Paper `#E2DAC8`, charcoal `#18171A`, graphite `#42454C`, sanguine about `#9C3A2A` on paper. Props: the stick (charcoal, sanguine, a pencil), a kneaded-eraser block, a spectral thumb, four steel pins, a wood board, the pencil slip. Subjects: a ridge, a river, reeds, a tree, bushes, a house with a smoking chimney, a fence, a lane lifted out with the eraser.

## End card

The "LemoLab × Claude Opus 5.5" sign-off does not appear on the film itself; the title *The Bend* is the last mark on the sheet.

## Build notes

`sh demo/build.sh` runs: `events.mjs` (the hand operations, the slips and the nine hits as `window.EV`), `readcheck.mjs`, `video.mjs` (3 workers), `mix.py`, `tools/cuecheck.py`, `mux.sh` (−14 LUFS, grain 0), `tools/mkcues.py` and `srt.py`.

- `demo/film.js` builds the whole film as one `Timeline` (recipes `tone`, `hills`, `riverMass`, `reeds`, `house`, `tree`, `bush`, `fence`, `scrub`, `ghost`) and the camera track; `demo/index.html` exposes `render(t)`, `EV` and `TEXTS`.
- **Replay and caching.** The sheet at *t* is a pure function of *t*, but replaying from 0 costs seconds. `video.mjs` gives each worker a contiguous range of frames, so a worker replays once to its first frame and afterwards only advances; stills in increasing order do the same. `Timeline.advance` resets only when asked for an earlier frame.
- `demo/stills.sh` re-renders the review stills (`styleframe`, `frame_house`, `frame_ghost`, `frame_end` and the erase / smudge / redraw proof triplet `shot_a/b/c`).
- Pitfalls tied to this demo: the pressure scale in `ops.js` (`0.12`) is calibrated with the flows in `film.js`; change one and the tone saturates. A thin mark erased on a toned ground leaves a white halo unless `ghost()` blends it back.
