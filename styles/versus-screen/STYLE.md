# Versus Screen · 对战对比体

> The grammar of an arcade versus-fight screen, used to compare two things (two phones, two plans, two frameworks, two cities, two diets): a hard diagonal split, two contenders with name plates and class tags, a VS that slams in, one stat per round fought out on health-bar-style meters, win ticks, and a verdict with a score recap. Loud and fast, but the numbers must stay fair and readable.
> References (grammar only): the versus screens, round banners, life bars and character-select grids of arcade fighting games in general, and sports-broadcast comparison graphics. Never copy a real game's characters, logo, typeface, UI chrome, stage names, announcer lines or catchphrases; the contenders, the names and the numbers are invented.

## 1. What it is

A comparison staged as a match. Two contenders face each other across a diagonal slash; each round measures one stat, the meters fill, the better one lands a hit on the other's life bar, and after the last round a score recap crowns a winner. It is unmistakable in one frame: a frame cut by a bright diagonal, one team hue each side, a big slanted condensed VS or round banner, parallelogram meters.

Not a spec table (the stats arrive one at a time, with impact), not a game-show set (see game-show), not a shonen battle (see shonen-battle: nothing is drawn with ink effort or speed-line manga), not a sale promo (see flash-sale).

## 2. Look

- **Flat vector on a 2D canvas** with a thick near-black outline (`#07070c`, 6-10 px) and hard offset shadows. Surfaces get one soft metal or glass gradient at most; nothing is photographic.
- **The arena** is two halves split by the slash: each half is a deep tint of its team hue, with speed stripes parallel to the slash, two swinging light beams from the top corner, a perspective floor grid in the team hue and a silhouette crowd along the bottom edge with a few twinkling glow-sticks. A dark vignette closes the frame.
- **The slash** is a bright white-hot line from top to bottom leaning about 14 degrees (`slx(y)`), with a coral and a cyan fringe. Every parallelogram in the interface (meters, plates, chips, tick slots) leans at the same angle.
- **Contenders** are drawn objects, one per side, large (a third of the frame height at least), facing each other, lit by a team-hue spotlight, with a floor shadow. They idle with a tiny bob, lunge when they win a round, recoil, tilt and flash white when they lose one.
- **Meters**: life bars at the top (anchored at the centre, damage cuts from the outer end, a pale ghost segment trails the loss), stat bars at the bottom (segmented in twentieths, fill from the outer edge toward the centre, same scale from zero on both sides, scale labels at both ends).
- **Effects are shapes**: star-flash and radial spark lines at a hit, an expanding ring at a slam, radial speed lines behind VS and banners, a diagonal impact slash across the loser. No blur, no particles with soft edges. Confetti only at the verdict, thrown with gravity, gone within about 4 s.
- **Grain**: none (mux with 0).

## 3. Colour

- **Two team hues and a neutral arena.** Side A hot coral `#ff4d3a` (deep `#8c1b12`, dark `#2a0e12`), side B electric cyan `#25d6ee` (deep `#0b6070`, dark `#08222b`); the arena neutral is `#090a12`, ink `#07070c`. Hues swap sides in another film, but two far-apart hues always stay.
- **Signal gold `#ffd45a` and pale `#fff3c4`** are for what decides: the rule chip, the winning number, WINNER, the crown. White flashes mark impacts.
- **A side's colour only ever means that side**: its bar, plate, tick, name, hit-damage. Never colour a neutral element (a label, a caption) in a team hue, and never use a team hue for the other side.
- **Never put a team hue on the same hue**: coral text on the coral half becomes pale or white with an ink outline.
- The loser's bar and number dim to about 60 % after the hit; the winner's turn gold.

## 4. Type

- **A big condensed display face** (Big Shoulders Display, OFL, weights 800-900) for names, numbers, banners, VS, deltas and WINNER: capitals, an ink stroke of 7-14 % of the size, a hard offset shadow where it shouts, optional slant of 0.12-0.18 for VS and GO.
- **A technical UI sans** (Chakra Petch, OFL, 500-700) for rule chips, class tags, captions and scale labels, letter-spaced 1-6 px.
- **Sizes**: a stat number 130 px or more, the stat name 150 px, the delta 150 px, VS 450 px or more, banners 270 px; captions never below 28 px, scale labels 22 px.
- **Reading time**: every text that carries information stays at least (letters / 15 + 1.5) s. Counting numbers report their final value from the first frame. VS, countdown digits and GO are marks, not text.
- Names of contenders are short (two syllables plus a model code), so they fit a plate at 90 px.

## 5. Motion

- **The slam**: an element arrives at 2-3x scale in about 0.1 s, lands on the beat (the landing is the sound event), squashes and settles in 0.25 s. Sounds and hit-stop are timed to the landing, not the start.
- **Hit-stop is frame-skip**: on a key impact the picture holds the impact frame for 2-3 frames (at 24 fps), the music is cut for the same frames, then the picture jumps ahead on real time. No slow motion. Use it on VS, GO, a round's hit, the score and the winner, and nowhere else.
- **Meters fill in steps**: one step per eighth note (16 steps for a round), a tick per step that rises in pitch, ending on a lock; the number counts with the bar. Life drops in a 0.25 s slide after the hit, with the ghost trailing 0.5 s later.
- **Everything is on a tempo grid** (one stat per bar pair, a round per 4 bars). Only the arena (stripes, beams, floor lines, crowd bob) moves freely.
- **Cuts**: a slash wipe. A white bar with a team-colour trail sweeps left to right across the frame in 0.4 s and erases the round's interface; the next round's banner slams as it leaves. Entry into the arena is the slash itself drawn top to bottom in 0.15 s with the halves wiping outward. The film closes with the same sweep in black.
- At most three simultaneous motions besides the arena.

## 6. Camera grammar

A **locked arena**: no pans, no tilts. The camera does only this: a base zoom of 1.025 (so shake never shows an edge), **punch-ins** (3-10 % that decay in about 0.35 s, pivoting toward the loser on a round's hit), **shake** (up to 30 px on VS, 24 px on a hit, deterministic), a **chromatic split** (up to about 10 px) on the heaviest hits, a **slow drift** (about 2 %) while a result is read, and one **push-in** (about 3.5 %) on the winner. Keep important type at least 60 px inside the frame so a punch never crops it.

## 7. Sound palette

- **Score**: an original loop in a minor key at 120 BPM (a bar is 2 s): four-on-the-floor kick, clap on 2 and 4, 8th-note hats with an open hat, a mono saw-plus-sub bass on the root, saw-chord stabs on the offbeats, square-pluck arpeggios (lead) entering later in the film. The verdict turns to the relative major. A different tempo or key is fine; the structure is not: build per round, drop, silence.
- **Foley** per event: cursor tick, lock ding, slam thump with crunch, banner boom, plate clank, bar-fill tick rising in pitch, hit (sub thump, noise crunch, metal ping, high zing), spark hiss, life chunk, pip pop, tick-mark chime, countdown beeps and a higher GO, riser, gong (inharmonic partials, 6 s), slash sweep (a whoosh with a high crack).
- **Silence**: at least two near-silences before the biggest hits (before VS and before WINNER, each about 1 s). The music is also cut for the frames of every hit-stop and ducks under the impact. The first sound after the silence is the biggest sound in the film.
- Keep 20-120 Hz about 3 dB under the rest; synthetic kicks and subs pile up fast.

## 8. Native moves

- **Select grid**: a grid of candidate contenders; two cursors hop and lock. Use it to say what the film is about before anything is compared.
- **The slash cut and the VS slam**: the entrance of the two contenders, ending in near-silence and then VS with shake, colour split and a white flash.
- **One stat per round**: banner, stat name, a rule chip (LOWER WINS or HIGHER WINS), a one-line test condition, bars that fill, a hit.
- **The delta slam**: the difference between the two numbers, in words ($15 LESS, 38 s FASTER), is the headline of the round.
- **Damage as life**: a round lost costs a quarter of the life bar; the win ticks show who took what.
- **The tally**: a table of the rounds (value, stat, value) with a tick on each winner, then the score.
- **WINNER**: gong, sunburst, crown, confetti, and one line for the people who should still choose the other contender.

## 9. Pitfalls

- **Fairness first.** Both sides get the same test, the same unit and the same scale from zero; each round states its rule (lower or higher wins) and its test conditions on screen. Never move a scale to make a gap look bigger.
- **Numbers must agree everywhere.** Compute the winner, the delta, the life, the ticks and the score from one data table. A film with 3 of 4 rounds must show 3 and 1 in the ticks, the life bars and the score.
- **The verdict follows from the numbers shown.** If a decisive factor is not a round, add a round for it. A tie needs a stated tiebreak.
- **Stats must be readable long enough.** The number, its unit and the delta are on screen for at least (letters / 15 + 1.5) s each; do not cut to the next round while the delta is landing.
- **Do not imply a real product is worse.** Use invented contenders unless the numbers are official and sourced (FACTS.md); the fan-film rule applies.
- **Do not let the genre eat the data**: spark effects must not sit on a number; a hit-stop that lasts more than 3 frames reads as a freeze; more than one shake per second turns to noise.
- Keep the loser dignified: dim, not mocked; end on the one reason to pick it.

## 10. Range of variation

- **Contenders**: objects drawn in code, product silhouettes, logos the user owns, or portraits; two or three-way (add a third lane and a three-hue palette only with care).
- **Rounds**: 3 to 6; more than 6 repeats itself. One stat per round, always. A best-of format can end early with a K.O. screen if one side already has the majority.
- **Hues**: any two far-apart hues; the arena neutral stays dark.
- **Tone**: a serious head-to-head (calm hues, fewer effects, the same grammar) up to a full carnival (more crowd, confetti, announcer voice-over).
- **Length**: 40-90 s; a round takes about 8 s at 120 BPM.

[Demo](DEMO.md)
