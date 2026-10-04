# Manga Panel — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *The Last Pineapple Bun* (最后一个菠萝包, 55 s) · `manga-panel.mp4` · `manga-panel.srt` · source in [`demo/`](demo/)

## Story & structure

Logline: a girl two minutes late for the last pineapple bun of the day races a middle-aged salaryman to the counter; both reach it in the same second, and the baker's answer is to cut it in half.

A spot-colour title page (the giant bun is the sun), a fold sweeps it away, then one spread of eight panels read right to left: page 1 (right) is the girl (clock at 17:58, shock, start, sprint), page 2 (left) is the bun, the rival, two hands, the impact page and a quiet last panel. No voice: balloons and sound words carry the film, foley and a 100 BPM score are the performance. Native moves spent: the reading slash (every panel), tone as emotion, speed lines with a clear halo and tone slide, breaking the border, the impact page, the spot-colour title page, the page-turn fold.

## Shots

| # | Time | Shot | Camera |
|---|---|---|---|
| 1 | 0–6.0 | title splash: giant bun in orange, black dot overprint, focus lines, runner | slow push |
| 2 | 6.0–7.2 | page-turn fold, empty spread | locked |
| 3 | 7.2–12.0 | panel A: clock tower 17:58, narration box | push to 2.85× |
| 4 | 12.0–15.6 | panel B: shock close-up, burst balloon 糟了！ | pan down-left |
| 5 | 15.6–18.0 | panel C (start of run) beside B | pull to 2.2× |
| 6 | 18.0–23.4 | panel D (bleed): sprint to the vanishing point, 哒哒哒哒 | pan down, drift |
| 7 | 23.4–27.0 | panel E: the last bun, sparkles, hanging sign | pan to the left page |
| 8 | 27.0–30.6 | panel F: the rival, 那个包是我的！ | pan left |
| 9 | 30.6–33.6 | panel G: both hands slide toward the bun, 我先！ ×2 | push |
| 10 | 33.6–34.0 | impact page: black burst with white 啪, one negative frame, shake | snap zoom 2.45→2.7× |
| 11 | 36.6–43.2 | panel H (bleed): bun cut in two, flowers, 一人一半？ …好。 ×2 | push 2.5× |
| 12 | 43.2–55.2 | shop bell, pull back to the whole spread, hold | pull to 1.0× |

## Score structure

100 BPM, 4/4, 23 bars (55.2 s), A minor pentatonic. Every reveal sits on a beat (7.2 s = bar 3, 12.0 = bar 5, …, impact 33.6 = bar 14, bell 43.2 = bar 18). Title: kit and shamisen-style pluck riff. Page 1: groove with slap bass, rim clicks on each reveal, rising run under D. Page 2: kit drops to blocks and rim, marimba for E, staccato pluck for F, a snare roll in G that stops 0.3 s before the hit, 0.3 s of full silence, then rim shot + low thump + kick + brass chord on the impact frame. H: flute and marimba, no kit. End: a shop bell, last chord, tail faded. Instruments are synthesised in `demo/mix.py` from `out/events.json`, the picture's own timeline.

## Palette & props

Ink `#0e0d10`, paper `#fbfaf5`, desk `#1b1a1f`; the spot colour `#f2891d` appears only on the title page. Props: the pineapple bun (dome with a crust lattice, tone-shaded, cut variant with a flat cut face), a clock tower at 17:58 (hands at the right angles), a tray, a hanging sign, flowers and sparkles. Characters: a girl (bob with a star hairpin, sailor uniform) and a salaryman (round glasses, moustache, suit); both are original.

## End card

None. The LemoLab × Claude Opus 5.5 sign-off is not part of the picture.

## Build notes

- `demo/index.html` loads `engine.js` (G-pen, screentone, effect lines, vertical balloons, sound-word lettering), `chars.js` (heads, runner rig, hands, bun), `panels.js` (panel `art` and `over`), `film.js` (layout polygons `PANELS`, camera keys `KEYS`, reveal slash, page fold, impact frames, `window.EV` and `window.TEXTS`).
- Tone is anchored in page space with a dot pitch of 4.4 page units (about 6–14 px on screen at the 1×–2.9× zoom used); impact uses `difference` blending for the negative frame.
- `demo/mix.py` reads `out/events.json` and writes `out/mix.wav` (numpy only, no samples). `demo/tools/cuecheck.py` checks every cue against the beat grid, the audio onset on the impact and the silence before it.
- `demo/cues.json` is the subtitle source (`srt.py`); the lines are the on-screen Chinese text.
- `sh demo/build.sh`: events, readcheck, video (about 10 min on 3 workers), mix, cuecheck, srt, mux (grain 0 so the tone stays crisp).
- Fonts are subset to the characters in `film.js` by `demo/fonts/fetch.sh` (needs a network connection) and are not committed; see `demo/CREDITS`.
- Pitfalls tied to this demo: `window.TEXTS` re-renders the frame to collect balloon boxes, so a balloon must be inside the camera frame for its whole hold time; keep camera holds at least as long as readcheck asks.
