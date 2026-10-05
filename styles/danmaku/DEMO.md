# Danmaku Comments: our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Day 3: I will not kill this starter* (60 s) · `danmaku.mp4` · source in [`demo/`](demo/)

## Story & structure

A nervous first-timer bakes a loaf of sourdough on one long kitchen counter, and a crowd of strangers types at the screen. The camera tracks along the counter, one station per chapter of the player's progress bar: STARTER, MIX, FOLD, PROOF, BAKE, CUT. The crowd moves through four roles: sceptics ("he looks flat...", "that is a puddle"), coaches (yellow tips, an argument over hydration that the uploader ends with a pinned "it is 75%"), a chorus that counts the four folds aloud ("1", "2", "3", "4") and a sleeping audience over the proof. A red comment at 0:04 says "SPOILER: wait for 0:44"; at 0:44 the loaf has sprung and the crowd's wall of "EARS!!", "HE LIVES", "6666" says so, with the comment layer zoomed into the wall and the loaf drawn in front of the comments. At 0:50, with the knife above the loaf, the player pauses and every comment hangs in the air for one bar of silence; the first sound after it is the knife through the crust. The crumb turns toward us, like, coin and favourite ring up and burst, someone types "Day 4: bagels?" and the line pins itself in gold, echoing the first pin ("If he dies I am moving to a boat").

Film length is 60 s: player time 57.5 s plus the 2.5 s pause (one bar), where the player's clock stops. Native moves used: doubt that turns, the counting chorus, the spoiler that comes true, the correction fight, the crowd falls asleep, the wall, the held breath, the press, the last bullet.

## Shots

Times are player time (the number on the progress bar); film time is the same until the pause.

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0-7.5 | the jar with a worried face; level and bubbles rise, the face smiles | wide to jar push (z 1.5 to 1.9) | doubt; spoiler planted at 4.4; comments already in flight at frame 0 |
| 2 | 7.5-15 | flour sack, water jug, spoon in a bowl | track right, medium | the correction fight; pinned bottom answer at 12.9 |
| 3 | 15-25 | dough on a board: puddle, four stretch-and-folds | close, locked, tiny drift | the counting chorus; dough strength rises per fold |
| 4 | 25-35 | proof: window sun sets, clock spins, dough rises, a poke | wide, slow push | the crowd falls asleep; silence 1 (clock only) |
| 5 | 35-45 | oven window: the loaf springs, the score opens | track right, push to z 2; comment layer zoom to 1.3 at 41-45 | the wall; comments pass behind the loaf (mask) |
| 6 | 45-50 | loaf cools on a board, crust cracks, knife hovers | track right, push | the warnings; crackle |
| pause | film 50-52.5 | the player pauses; comments frozen | locked | the held breath; silence 2 |
| 7 | 50-57.5 | knife saws, the half turns to the crumb, buttons burst, last pin | push to z 2.1 on the crumb | the press; the last bullet |

## Score structure

96 BPM, 4/4 (bar 2.5 s, 24 bars), F major pentatonic over F, Dm, Bb, C. Bars 1-3 electric piano alone; 4-6 bass and shaker; 7-10 the pulse thickens, a rising piano stab on each fold; 11-14 (proof) the music leaves after one held chord, the clock ticks on the sixteenth grid and a wind bed is all that is left, one note at the poke; 15-19 pad, bass, a riser under the spring, sixteenth arpeggios through the wall and a big chord on the 0:44 payoff; 20 tension drone; bar 21 is the pause (nothing but a quiet room); bar 22 the knife first, then pad and arpeggio at the turn; the burst is a major chord with sparkles; the last bars return to the opening motif. Comment blips: one per bullet, timbre by colour, pitch from the pentatonic by lane, time from the events (about 110). Mix: crowd under foley, no voice, −14 LUFS.

## Palette & props

Picture: teal wall (`#244a4e` to `#33646a`) with tiles, wood counter (`#c58b57`), cream dough (`#f0dcb0`), crust brown (`#8e4a18` to `#e6c58a`), oven steel (`#3e434d`) with orange glow. Roles: white `#fff`, yellow `#ffe14d`, cyan `#62e6ff`, pink `#ff8fc9`, green `#8bf59a`, red `#ff5a4f`, gold `#ffd36a`. Chrome near-black, accent coral `#ff6a5c`. Barlow Semi Condensed. Props: a jar with a face named Doughnald, a flour sack, a water jug, a bowl, a board, a glass tub, an oven, a bread knife.

## End card

None. The last image is the crumb under the crowd's last comments and the gold pin "Day 4: bagels?", held 2.5 s.

## Build notes

Files in `demo/`: `index.html`, `main.js` (page contract, layer order, TEXTS, events), `timeline.js` (player time against film time, pause, chapters, camera and zoom tracks), `comments.js` (the script of about 110 comments, generated walls, lane scheduler), `scene.js` (the kitchen), `ui.js` (the "chorus" player), `mix.py`, `build.sh`, `CREDITS`, `TREATMENT.md`.

`sh styles/danmaku/demo/build.sh` (core tier only; no voice) runs: events export, reading check, mix, render (about 1 minute with two workers), mux, styleframe and poster.

Pitfalls tied to this demo: the time stamp and the bullet counter change continuously and are left out of `TEXTS`; the typed line in the input box is reported in full from its first letter; wall comments are kept out of lanes the 1.3 zoom would crop (`zoomed` in `layout`); the last spawns must leave letters / 15 + 1.5 s before the film ends (the readcheck flags them); no subtitles file because there is no voice.
