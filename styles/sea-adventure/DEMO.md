# Sea Adventure Manga: our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Five Hats and One Sock* (60 s) · `sea-adventure.mp4` · source in [`demo/`](demo/)

## Story & structure

Captain Pip, a tiny man with a soup pot for a hat, shouts into the frame: he has lost one sock. A sea chart unrolls, its compass draws itself, labels and a dotted route grow to an X. Five wanted posters slam onto a plank wall (Pip, Brisket the cook, Longshanks the navigator, Dot the lookout, Barnacle the shipwright); the last one's nail pops and it swings. A curled wave carries the film to the ship, which sails with a crew on deck, one of whom reads the chart upside down. Dot sees a cloud; a storm comes with five tall panic panels and a lightning strike; then the sea goes flat and the sound stops. A giant rubber duck bursts up with a squeak; Brisket offers a sandwich; the duck swallows it and becomes a friend. On the island the crew dig, the chest opens in a burst of light, and inside is a sock: the left one. Pip cries; the film irises into a laughing feast with the duck as a guest, then pulls back and up until the ocean is a bathtub, the right sock hangs on the tap, a drop falls, there is a silence, and the last chord lands under "TO BE CONTINUED...".

Why it fits: the stake (a sock) is a punchline from the first frame, the chart is the promise, the posters introduce five silhouettes, and the pull-back changes the size of everything that came before. Native moves used: the cut-in face, the chart, the wanted poster, the sea curl, the panic montage, the giant, the feast, the scale reveal.

## Shots

| # | Time | Shot | Camera | Note |
|---|---|---|---|---|
| 1 | 0-3 | Pip's face, a cut-in of his feet | pop-in, shake | hook |
| 2 | 3-9 | chart, compass, route | close, pull out, slow push | slash wipe in, grow wipe out |
| 3 | 9-22.5 | five posters | locked, impact shakes | slams on 9.0, 11.25, 13.5, 15.75, 18.0 |
| 4 | 22.5-30 | sailing, deck, Dot's cut-in | track, push | wave-curl wipe in; sea sound 0.9 s early |
| 5 | 30-34.5 | storm, five tall panels | tossed | lightning on 32.25 |
| 6 | 34.5-36 | flat sea, ripples | slow push | silence 1 |
| 7 | 36-42 | the duck, the sandwich | pull wide, push to bow | squeak on bar 24 |
| 8 | 42-47.5 | island, dig, chest, sock, Pip | wide, close, close | slash wipe in |
| 9 | 47.5-52.5 | the feast | push | iris in |
| 10 | 52.5-60 | pull back to a bathtub | exponential pull-out | silence 2, final chord on 57.0 |

## Score structure

6/8, 120 bpm in quarter notes (eighth 0.25 s, bar 1.5 s), D major. Stomps and reed shouts under the face; sparse plucks on the chart; the eight-bar jig builds under the posters (bass and stomps first, then reeds, then the fiddle tune); full jig on the voyage; D minor with tremolo fiddle and a thump per beat in the storm; nothing from 34.5 to 36.0; tuba oom-pah for the duck; minor pizzicato on the island with a chord stab and sparkle on the chest; a deflating slide for the left sock; the jig a register up for the feast; a slow reed pad on the pull-out; nothing but drips from 55.5 to 57.0; a D major chord with fiddle, stomp and low bass. Mix: music ducks 45 % under narration, bed and foley close, −14 LUFS at the mux.

## Palette & props

Paper `#f4e6c4`, ink `#1d1612`, sea teal `#16a6a3` / `#0d7f94`, sun `#ffc531`, coral `#f0503e`, leaf `#3fb04a`, purple `#6a4bb7`. The ship has a painted grin and portholes for eyes; its flag is a yellow sock over two crossed spoons on purple. Crew: Pip (soup pot with a spoon), Brisket (striped beanie, moustache), Longshanks (stovepipe hat, telescope, goatee), Dot (bucket hat, gull), Barnacle (bald, great white beard, hammer). Sea: the Warm Wide Sea; places: Home Dock, Mutton Rocks, Sleepy Reef, Sock Rock.

## End card

None. The last image is the bathtub with "TO BE CONTINUED..." for three seconds.

## Build notes

Files in `demo/`: `index.html`, `main.js`, `ink.js`, `chars.js`, `props.js`, `scenes.js`, `script.js`, `mix.py`, `tools/export_tl.mjs`, `build.sh`, `lines.json`, `CREDITS`, `TREATMENT.md`.

`sh styles/sea-adventure/demo/build.sh` (needs the core and voice tiers) runs: fonts, voice, speech check, timeline export, events export, reading check, mix, srt, render (two workers), mux, styleframe, poster.

Pitfalls tied to this demo: the narration boxes are not in `TEXTS` (the `.srt` carries them); sound effects are registered for their whole life and last letters / 15 + 1.5 s or more; poster text must stay inside the frame while the last poster swings, so the poster row is 340 px apart; the tile wall behind the "sky" is only faintly drawn until the pull-back so the reveal is fair; `DURS` in `script.js` must match `voices/dur.json` (export_tl.mjs checks).
