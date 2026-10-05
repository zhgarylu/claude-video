# Stage Light Performance — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Second Sunrise* (60 s) · `stage-light.mp4` · source in [`demo/`](demo/)

## Story & structure

An invented band, Vanta Harbor, plays an invented instrumental, "Second Sunrise". The film is told through the rig: a dark stage, one follow spot on a singer at a mic stand (0.5 s), a four-click stick count-in that wakes one lamp per click while the camera whips to the drummer and back, then the build in blue only (equaliser on the LED wall, sweeps that double in speed at bar 9, every head converging on the singer in bar 12). Beat 4 of bar 12 is a blackout and silence with one pin spot on the singer's raised hand; the drop is a full-stage flash while the camera snaps from a close shot to a wide crane, magenta and violet, rings on the wall and the title *SECOND SUNRISE* in the wall's own LED dots. The break (bars 21-24) opens with a second near-silence, then one bell note, and strips the stage to amber: a sun rises on the LED wall and the foreground fills with phone lights. The finale brings back all three hues with confetti cannons and a cathedral of converging beams; the last hit at 56.0 s is a flash and a blackout, and the film ends on the act's end card under one spot, echoing the opening.

Why it fits: light is the subject and the grid is the story, so every cue (lamp, sweep, flash, blackout, sun) lands on a beat of the song; the palette arc (white, blue, magenta-violet, amber, all three) is the song's arc. Native moves spent: count-in wakes the rig, blackout before the drop, the LED wordmark, one colour and a rising sun, crowd of phone lights, confetti and cold sparks, the cathedral, ending on one spot.

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0.0-5.7 | the singer at the mic in a single spot; stage and crowd dark | medium, slow crane up and push-in | spot snaps on at 0.5 s |
| 2 | 5.7-8.0 | whip to the drummer's overhead stick clicks, one lamp wakes per click, whip back | two whips with motion blur | count-in wakes the rig |
| 3 | 8.0-16.0 | wide, blue rig sweeps; lower-third at 9-14 s | high wide, slow drift | build; the equaliser wall |
| 4 | 16.0-23.4 | orbit left to right round the singer, push-in to a close shot; sweeps double, then converge | orbit + dolly | build tightens |
| 5 | 23.5-24.0 | blackout, one pin spot on the raised hand | locked close | silence 1 |
| 6 | 24.0-28.0 | full-stage flash, camera snaps to a wide crane; spark fountains; wall title | crash pull-back + crane | the drop |
| 7 | 28.0-32.0 | whip to the guitarist (low), track across to the bassist | whip + low track | musicians' moment; sky-fan beams |
| 8 | 32.0-36.0 | whip back, fast orbit round the singer | orbit +/-45 deg | fast crossing sweeps |
| 9 | 36.0-40.0 | dolly in on the singer, heads converge | push-in | end of the drop |
| 10 | 40.0-48.0 | dark; one bell; amber lamps wake one every half second; sun rises on the wall; phone lights | slow pull-out, crane up over the crowd | silence 2, single colour |
| 11 | 48.0-52.0 | zoom-out into a high wide, flash, confetti | crash zoom-out, crane down | finale |
| 12 | 52.0-56.0 | push-in to the singer, all heads converge | fast push-in | cathedral |
| 13 | 56.0-60.0 | final flash and blackout; one spot, falling confetti, phone lights; end card | slow pull-out | echo of the opening |

## Score structure

120 BPM, 4/4 (bar 2.0 s), A minor, 30 bars. Chords Am F C G (break: F G Dm E). Intro bars 1-4: A drone swell, a heartbeat kick, plucks, the stick count-in on bar 4. Build bars 5-12: kick on every beat, offbeat hats, pumping eighth bass, arpeggio plucks; snare from bar 7, 16th hats from bar 9; a noise riser and a snare roll in bar 12 that ends at 23.44 s, then **0.5 s of silence** (music, bed and reverb gated). Drop bars 13-20: full kit with crashes, offbeat bass, palm-muted guitar eighths, original lead melody (two 4-bar phrases, the second an octave higher), chord stab on the downbeat, kick-sidechained pads; tom fills in bars 16 and 20. Break bars 21-24: **1.0 s of silence** at 40.0 s, a bell, then an electric-piano arpeggio, a slow lead, a pad, a heartbeat kick and rim ticks. Finale bars 25-28: the drop again with the lead in its higher answer and a crash at the start. Bar 29: one big chord, kick and crash on 56.0 s, a ring-out, the crowd roar and applause. Everything is synthesised; picture and music read the same `score.json`.

## Palette & props

Black ground with blue-black haze. Intro: white-blue spot. Build: electric blue `#2878ff`/`#3ca0ff`. Drop: magenta `#ff2da0` and violet `#8c3cff`. Break: amber `#ffac34`. Finale: blue, magenta and amber on alternating heads, white at the cores. Twelve moving heads on a back truss, a front follow spot, one drum riser and two dancer risers, a drum kit seen from the front, two guitars, a mic stand. Six faceless silhouettes: singer, drummer, guitarist, bassist, two dancers. Crowd of about 480 silhouettes (windowed by distance from the camera), with raised arms and phone lights in the break and the outro.

## End card

The act's name "VANTA HARBOR" in large Bebas Neue and "SECOND SUNRISE · LIVE" under it, over one spot on the singer, falling confetti and phone lights, 56.8-60 s. No library sign-off (the band is invented; this card is the demo's own).

## Build notes

Files in `demo/`: `index.html`; `main.js` (frame order, bloom, motion blur on the whips, titles, `TEXTS`, the event list `EV`); `cam.js` (shot list as monotone keyframes, projection); `cues.js` (the light cue stack, flash list, aim modes); `lights.js` (haze, beams, LED wall, floor, lamps); `rig.js`, `band.js` (skeleton, poses, drummer); `fx.js` (crowd, confetti, sparks); `score.py` (arrangement, writes `score.json`); `mix.py`; `tools/` (`audiocheck.py`, `flashcheck.py`, `srt.mjs`, `dbg.mjs`, `sheet.sh`); `build.sh`; `CREDITS`; `TREATMENT.md`.

`sh styles/stage-light/demo/build.sh` (core tier only) runs: score, events, reading check, mix, audio check, subtitles, render (about three minutes with two workers), mux, flash-rate check, styleframe and poster.

Pitfalls tied to this demo: the wall title is part of the wall texture, so `TEXTS` projects its rectangle through the camera and the title is shown only while the camera keeps it fully in frame (24.55-28.0 s); the flash list is on beats only and its closest pair is 0.5 s apart; crowd rows are windowed by distance from the camera, so close shots have no crowd; the bridge camera is high so the crowd's heads fall below the frame and only hands and phones show.
