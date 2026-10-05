# Clockwork & Chain Reaction — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *The Slowest Link* (57 s) · `clockwork.mp4` · source in [`demo/`](demo/)

## Story & structure

**Logline.** A chain of eight brass-and-steel links starts with a clock's tick and ends with a bell; one link, a 16:1 gear train, makes everything after it stand and wait, and swapping a single pair of gears gives the same chain back six seconds.

**Structure: run, wait, diagnose, change one link, run again, reset.** The chain runs once in real time (hook: the escapement ticks from the first frame). A cam that turns 16 times slower than its spring motor holds the rest of the machine still for 8.7 s, the longest silence in the film; then the dominoes fall in slow motion. A cause map traces the run to scale (the long link is 57 % of the time), the chain rewinds, the second gear pair is swapped for equal gears (ratio 4 instead of 16), and the same chain runs again, 6.1 s shorter. A second rewind returns to the first tick; the title plate is screwed on over the clock.

Native moves spent: trigger → chain (all), the ratio (shot 4), the wait (5–6), the tick (the whole film's beat), the cascade (7, the peak), the cause map (8), swap one part (10), the reset (9, 13).

Why it fits: the topic (a chain runs at the pace of its slowest link) is itself a mechanism; the gear ratio is the reason the link is slow, and the fix is one pair of gears.

## Shots

3D, one scene, one camera path; every shot change is a camera move.

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0–2.5 | the escapement, pendulum and release pin | slow push-in, slight orbit | the tick; the 4th tick lifts the gate |
| 2 | 2.5–3.9 | the first marble on its plank and ramp | follow shot, leading the ball | trigger → chain |
| 3 | 3.9–5.4 | marble lands in the brass cup; the long latch lifts | slide right, push in | cause visible before effect |
| 4 | 5.4–9.0 | the gear train, 12:48 twice, ÷16 tags | push-in with an orbit | the ratio; subtitle and tags on brass plates |
| 5 | 9.0–11.5 | the waiting dominoes, corkscrew, gong | pull back and a slow pan right | the wait; ratchet clicks only |
| 6 | 11.5–13.0 | the cam lifts the follower, plank 2 tips | whip back to the cam | the first sound after the silence |
| 7 | 13.0–17.8 | marble 2 down the corkscrew; the cascade at 0.3× speed; the hammer strikes the gong | follow, then low tracking | the signature shot: release after a wait |
| 8 | 17.8–25.4 | the whole board dimmed, cause map traced | pull out to the full board | the long link reveals itself |
| 9 | 25.4–28.6 | the chain run backwards | the action camera follows in reverse | reset |
| 10 | 28.6–32.8 | the 48-tooth wheel and 12-tooth pinion lift out, 30:30 drop in | orbit on the train | swap one part |
| 11 | 32.8–42.4 | the same chain, wait shortened | wide follow of the action front | same route, faster |
| 12 | 42.6–48.0 | before/after bars, −6.1 s | pull out | the cause map as a comparison |
| 13 | 48.0–50.6 | rewind to the first tick | action camera backwards, then to the clock | reset |
| 14 | 51.8–57.2 | the escapement again, title plate | slow push-in | echo of shot 1: the ball is released again |

## Score structure

96 BPM (beat 0.625 s, the half period of a 38.8 cm pendulum), D, minor pentatonic while stuck and major pentatonic after the fix. The escapement's ticks (tick/tock, two pitches) are the pulse in every section; music is a music-box comb with a plucked bass and a very soft pad.

- 0–3.7: ticks and a faint D–A pad; the first tick at frame 0.
- 3.75–10.6 (beats 6–17): the music box enters at the latch on beat 7, a two-bar ostinato over plucked bass; it stops dead on beat 17.
- 10.6–13: **silence 1**: ratchet clicks, room tone; the cam lifts at 12.5 (beat 20) with a hollow brass knock, the first sound after the silence.
- 14.26–17.5: each domino is a note up the scale (the picture is the score); at the bell the tonic (D5) rings.
- 18–25.4: the cause map has one box note per link as the tracer reaches it (the 8.7 s link is a long pause between two notes) over a pad.
- 25.4–28.6: reversed swell; 28.6–32.8: sparse notes with the gear swap's scrapes and clacks.
- 32.8–42: the same ostinato, now in the major mode, never stops (no wait); dominoes and the bell again.
- 42.6–48: a D major arpeggio on the result; 48–50.6 rewind swell.
- 50.6–51.8: **silence 2** (room tone only); the first tick at 51.8 is the loudest sound of the section; a single box note when the ball is released; open fifth pad under the title.

Balance: the voice about 10 dB above the music, music ducked 7 dB under it, band energy 5 % under 120 Hz.

## Palette & props

Board `#3f332c` (walnut veneer, darkened), brass `#f2c872`/`#d09a48`, polished steel for the marbles and the rods, blackened iron for the movement plate, bone-white dominoes with brass caps, a brass ruler along the bottom rail, numbered brass plates under each link. Voice: Kokoro `bm_george`.

Props: pendulum (38.8 cm, ticks every 0.625 s), 30-tooth escape wheel with a release pin, tilting plank, 110 cm ramp, brass cup on a tipper beam, a 29 cm latch lever, spring barrel with a stop pin, a two-bladed governor, 12T→48T and 12T→48T gears (module 0.5 cm), a 16-tooth ratchet, a cam with a 3.4 cm lift, a follower rod, a second plank, a two-turn corkscrew, 26 dominoes on a shelf, a hammer and a hanging gong.

## End card

A brass plate "THE SLOWEST LINK — a chain runs at the pace of its slowest link", screwed on above the clock for the last 4.5 s. No sign-off.

## Build notes

`sh demo/build.sh` regenerates everything after the voice (the WAVs in `demo/voices/`, made with Kokoro from `demo/lines.json`).

| File | Role |
|---|---|
| `engine/gears.js` | involute outlines, meshing law, overlap test |
| `engine/machine.js` | the chain as `state(tau)`, events, durations |
| `engine/parts.js`, `engine/scene.js`, `engine/world.js` | materials and meshes, the scene, renderer and lights |
| `timeline.js` | machine time → film time (one slow-motion window), the schedule, the voice lines |
| `main.js` | camera shots, overlay (subtitle plates, tags, cause map), `render(t)`, `EV`, `TEXTS` |
| `mix.py` | score, foley, voice, mix, `clockwork.srt` |
| `tools/mechcheck.mjs`, `tools/durs.py` | physics gates and caption lengths |

Order: voice → `durs.py` → `asr_check.py` → `events.mjs` → `mechcheck.mjs` → `video.mjs` (3 workers; about 1 s per frame on an M-series Mac) → `mix.py` → `readcheck.mjs` → `mux.sh`.

Pitfalls tied to this demo: the machine's layout is derived (the ramp length is solved so that the marble lands in the cup on beat 6), so changing one length shifts everything after it; the film's time warp is applied to the sound events through `tauToFilm`, so anything added to `EV` must go through it; the slow-motion window sits at machine time 14.15–15.05.
