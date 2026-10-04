# 8-bit Console Pixel — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Dusklight* (54.4 s) · `pixel-8bit.mp4` · source in [`demo/`](demo/)

## Story & structure

A lamplighter called Wick has to light three lamps before night. The sunset is the clock: the picture steps down one palette level when dusk becomes night. Two lamp posts on the forest path are lit with a spark thrown from the lantern; the third light is the beacon at the top of a tower. Wick climbs the ladder (the camera follows by vertical scroll), moths gather around the dark lamp room until more than eight share a scanline and the picture breaks into flicker, the music drops to true zero for two beats, and then the lantern's spark lights the beacon in a flood of palette steps. The score tallies, passes the high score from the title screen, and the title screen returns with the new number.

Structure: *a stage clock* (title → dusk run → night run → silence → climb → swarm → silence → light → tally → title again). Native moves spent: split-scroll parallax (five bands), palette fade by steps (fades, dusk to night, the white flood), palette cycling (the lamp room), sprite dropout as drama (the swarm), attract screen with blinking cursor (the bookends), an integer-scale cut-in twice (×6 window, hard cut), a vertical scroll up a tall nametable (the climb).

## Shots

Camera = the scroll register. Frames are at 60 Hz; the film is rendered at 30 fps.

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0–1.6 | title, letters of DUSKLIGHT, HI 012400 | palette fade-in, 5 steps | fade |
| 2 | 1.6–6.4 | title with menu, Wick walks the street | locked; cloud band drifts; cursor blinks, START flashes | attract screen |
| 3 | 6.4–7.0 | stage change | palette fade out and in | fade |
| 4 | 7.0–13.7 | forest at dusk, Wick runs, coins | side-scroll, five parallax bands | split-scroll |
| 5 | 13.7–15.4 | stop at a dark lamp post; Wick raises the lantern, a spark flies to the lamp | locked; hard cut to a ×6 window on Wick and lantern | cut-in; lamp lit |
| 6 | 15.4–17.6 | run on, lamp 1 shines; the sun sets | side-scroll | dusk |
| 7 | 17.6–27.2 | night: every palette two levels lower; second lamp lit at ~24.6 s | side-scroll; stop and spark again | palette step |
| 8 | 27.2–28.8 | foot of the tower, dark lamp room far above | locked, near-silence | breath |
| 9 | 28.8–33.2 | Wick climbs the ladder | vertical scroll, the tall nametable follows him | climb |
| 10 | 31.2–38.4 | moths arrive in waves (3 → 22), flicker; lantern raised at 36 s | locked at the lamp room; scroll jolt on each wave | sprite dropout |
| 11 | 38.4–40.0 | everything freezes; zero sound | locked | silence |
| 12 | 40.0–40.4 | the beacon lights | white flood in 3 palette steps, ×6 cut-in on Wick and the lamp room | flood |
| 13 | 40.4–50.0 | beam, moths flee, score tally, Wick hops with each bonus step, captions | locked | palette cycling |
| 14 | 51.8–52.8 | fade out by steps | palette fade | fade |
| 15 | 52.8–54.4 | title again, HI 016400 | locked; hard cut at the end | bookend |

## Score structure

150 BPM, 4/4, 24 game frames per beat (96 per bar), 34 bars = 54.4 s, E minor pentatonic. Bars 1–4 title (bar 1 wakes with bleeps, bar 4 a snare roll into START), 5–11 the run, 12–17 the night run (octave lower, 12.5 % duty, brushed drums), 18 near-silence (wind and one gated triangle note), 19–24 the climb and swarm (tremolo that tightens, a noise roll rising each bar), 25 **true zero**, 26–29 the light (the call in E major, full band), 30–33 the tally (the call slows, one voice leaves per bar), 34 the call once, then a hard cut. Sfx steal channels from the music as on the hardware: shots-like blips and coins take pulse 2, blasts and ticks take the noise drums. Written in `demo/mix.py` with `demo/apu.py`; loudness about −14 LUFS.

## Palette & props

Master palette of 54 colours (`palette.js`). Forest: indigo, violet, magenta, orange sky bands (backdrop splits), green foliage, brick path. Night is the same art with every background palette lowered; sprites are protected so Wick and the lights keep their colour. Tower: greys with one red-and-gold lamp room, a ladder, a rock cliff. Wick: red hat, blue coat, a lantern; a back-view climb frame (mirrored for the other limb) and a raised-arm pose. Props: 16×16 spinning coins, a four-point spark, a 24×24 lamp glow, 16×8 moths (two wing frames), the 8×8 tile font.

## End card

None drawn: the film ends on its own title screen with the new high score. The library's sign-off lives here only: **LemoLab × Claude Opus 5.5**.

## Build notes

`sh styles/pixel-8bit/demo/build.sh` runs everything: `check.mjs` (hardware audit of every video frame), events, `.srt`, frames, mix, mux, `readcheck`, `blackdetect`, poster and `stills/styleframe.jpg`. Files in `demo/`: `palette.js`, `ppu.js` (paper, compiler, scanline unit, validator; overlay banks switch a second background bank for the HUD and the caption strip), `font.js`, `sprites.js`, `scenes.js` (forest, tall tower in dark and lit variants, title, HUD, caption strip), `timeline.js` (all events and choreography), `game.js` (per-frame state and the event list), `main.js` (page contract, ×4 and ×6 presentation, `?f=<game frame>` renders any frame), `mix.py`, `apu.py`, `mksrt.py`, `check.mjs`. Pitfalls tied to this demo's props: lamp glass is the backdrop colour on the painted post and a glow sprite goes over it (a lit lamp is a sprite, not a palette entry, so each post can be lit on its own); text captions are tile text on a 16-scanline strip bank, so they never cost the stage's 256 tiles; the title is shown again at the end for only 1.6 s, too short for the reading-time check, so its words are reported once, at the start.
