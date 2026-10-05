# Sea Adventure Manga: Style Prompt

> The visual grammar of a seafaring-adventure serial in manga and anime: bold uneven ink linework with hatching and screentone, rubbery faces and wild proportions, a crew of very different silhouettes, wanted posters, hand-drawn sea charts, waves drawn as curled repeating shapes, saturated tropical colour on warm paper, laughing feasts, cut-in panels and big hand-lettered sound effects.
> References (grammar only): weekly adventure manga and their anime adaptations for the line, the cut-in panel, the sound effect and the poster; old sea charts and treasure maps for the chart; woodcut waves for the water. Never copy a real series' characters, crew, hats, flags, logos, abilities, lettering or music. Invent the crew, the ship, the flag and the world.

## 1. Essence, and what it is not

- **A line that wobbles on purpose.** Ink outlines vary in weight (thick on the shadow side, thin where the pen lifts), never mechanical.
- **Faces carry the comedy.** Eyes bulge, mouths open to half the head, heads change size within a shot. The humour comes from the distortion and its timing, not from the gag text.
- **A crew of silhouettes.** Five or so people who can be told apart as black shapes: a tiny head on a big body, a huge head on a small one, all legs, all beard.
- **The page is the screen.** Panels cut in, speed lines fire, sound effects are lettered into the picture, a map is a set.
- Not a flat kids' cartoon (no clean vector outline), not a comic-book halftone pop-art page (see comic-pop), not a black-and-white manga page (see manga-panel): this is colour, with ink, on warm paper.

## 2. Materials & rendering

- **Paper.** Warm cream with soft stains and fibres, a vignette; used as the base of every shot that is not a full-colour scene.
- **Line.** Every outline is a filled polygon of varying width (pen pressure noise, thick on the side away from the light, tapered ends), not a constant stroke. It wavers at 12 fps ("boils") by a pixel or two. Keep a floor on line weight when the camera is far (scale ink with 1/zoom) so it stays legible.
- **Colour.** Flat fills, offset from the line by 2-4 px like a slightly misregistered print. No gradients on characters.
- **Shade.** A crescent on the side away from the light, filled with hatching (parallel strokes of uneven length, sometimes cross-hatched) or screentone (a dot lattice at 45 degrees). Tone does the work of a gradient.
- **Water.** Flat bands darkening with depth, horizontal hatch lines, and rows of curled-wave glyphs that are small near the horizon and large near the viewer, each with its own bob.
- **Speed lines, radial bursts, impact puffs** are drawn with the same pen.

## 3. Colour logic

- **Saturated tropical hues on warm paper**: sea teal, sun yellow, coral, leaf green, a purple for flags and storms. Five to seven hues in a shot; ink is the only black.
- A character is a colour plus a silhouette: no two crew share a main colour.
- **Mood by value shift, not by hue**: a storm pulls the same palette toward violet and navy and adds hatching, it does not change style.
- Examples (not rules): teal `#16a6a3`, sun `#ffc531`, coral `#f0503e`, leaf `#3fb04a`, purple `#6a4bb7` on paper `#f4e6c4`, ink `#1d1612`.

## 4. Type & subtitles

- **Sound effects** are drawn as images: a heavy comic display face (Bangers or a similar OFL face) with a thick ink outline, an offset coloured shadow, each letter slightly tilted and bobbing. They pop in with a squash and stay long enough to read (letters / 15 + 1.5 s).
- **Posters** use a slab or blackletter display face (Rye, Pirata One) for headers and names, a hand face for the crime line.
- **Chart labels** in a brush hand.
- **Subtitles are narration boxes**: a cream rectangle with a double ink border in a corner, in a hand face, 40-48 px. Hold at least 1.8 s and speech + 0.6 s.

## 5. Motion quality

- **Squash and stretch on every pop**: sound effects, posters, panels and faces enter with overshoot (ease-out-back), then shiver.
- **On the beat.** Bounces, laughs and slams land on the music grid; characters hop in time.
- **Boiling line**, 12 fps, while the camera and the sea move smoothly every frame.
- **Waves loop**: each glyph bobs on its own phase; the sea never sits still, except when the story holds its breath.
- **Faces are blended** between expressions with easing, with an occasional one-frame pop; never switch expressions in an if.
- Nothing moves at constant speed; impacts shake the camera and decay.

## 6. Camera grammar

A vocabulary, not a route.

| Move | What it expresses | Can serve |
|---|---|---|
| Face fills the frame, pop-in | a shout, the stake | an opening; a punchline |
| Slanted cut-in panel over the scene | a reaction or a detail | a character spots something; a close look at a hand |
| Row of tall panels, one per face | a group reacts at once | panic, surprise, introductions |
| Sweeping track beside the ship | travel, distance | a journey; a delivery; a plan in progress |
| Push to the deck | who is on board and what they do | a team at work |
| Close on a chart, then pull out | the plan, then the world | a route; a roadmap |
| Locked wall with impacts | list items arriving | wanted posters; a ranking |
| Exponential pull-back | scale revealed | the joke or the horror of how small it was |

Transitions come from the medium: a slash with an ink border, a curled wave sweeping the frame, a slanted panel growing to full screen, an iris from a face. No dissolves.

## 7. Sound palette

- **Sea**: a low brown-noise swell, creaking wood, gulls, rope, splash; rain and thunder in a storm.
- **Music**: an original jig or shanty-like tune on accordion-like reeds, a bowed fiddle, a plucked string, tuba bass, stomps and tambourine, in 6/8 or 2/4; a minor, tremolo version for danger. No existing tune.
- **Comic sounds**: rubber squeaks, boings, thwacks, a stylised laugh on the beat.
- **Silence**: at least one held breath before the biggest sound.
- Duck the music under narration; keep foley close and dry, add a short room for chests, tiles and drips.

## 8. Native moves

A menu.

- **The cut-in face.** A slanted panel with a huge reaction. *Fits content like:* a surprise; a character's stake; a punchline.
- **The wanted poster.** A paper card slams on a wall with a portrait, a name, a crime and a bounty. *Fits content like:* a team; a ranking; a cast of suspects.
- **The chart.** A map unrolls, a compass draws itself, a dotted route grows to an X. *Fits content like:* a plan; a journey; a timeline.
- **The sea curl.** A wall of curled water carries the next scene in. *Fits content like:* a change of place or chapter.
- **The panic montage.** A row of tall panels, one face each, popping on the beat. *Fits content like:* a crisis; a deadline; an alarm.
- **The giant.** A figure ten times too big rises and turns out to be harmless. *Fits content like:* a feared obstacle that only wanted something small.
- **The feast.** Everyone laughing at once around food. *Fits content like:* a launch; a win; a thank-you.
- **The scale reveal.** The camera pulls back until the sea is something small. *Fits content like:* a punchline about proportion.

## 9. Pitfalls of the medium

- **Copying a known design.** Straw hats, skull flags, rubber-limbed fruit powers, particular crew compositions: all off limits. Invent the hats, the flag and the world.
- Constant-width outlines read as a vector cartoon. Vary the weight, taper the ends, put the weight on the shadow side.
- Too many panels at once hide the story. Hold one reaction per beat.
- Lettering that leaves before it can be read fails the reading check; leave sound effects up for letters / 15 + 1.5 s.
- A face drawn small has no joke. Faces in cut-ins fill a third of the frame height or more.
- Hatching that is too dense turns sails and skies to grey. Keep it as a shade, 30-50 % alpha.
- Hats that sit on the eyes: put the brim above the brows.

## 10. Engine

In `demo/`: `ink.js` (variable-width pen, rings, shade crescents, hatching, screentone, speed lines, sound-effect lettering, panels), `chars.js` (one rubber rig, expressions, five invented characters), `props.js` (sky, waves, ship, duck, island, chest, sock, tub, food), `scenes.js` (every shot and the wipes), `script.js` (timeline, cues, sound events), `main.js` (page contract), `mix.py`, `tools/export_tl.mjs`. Build steps: [DEMO.md](DEMO.md).

## 11. Variation space

You choose the world, the crew, the hats, the flag, the palette and the story. All far from our demo:

- Structures: a **heist plan** told as a chart that the crew fails to follow; a **tournament** of wanted posters that re-rank; a **supply run** in which the feast is the whole film; a **ghost-ship** story in storm palette.
- Openings: a poster slammed over a map; the sound effect alone on black; a crow's-nest view of an empty sea.
- Endings: the chart with one extra dot; a poster with a new bounty; a pull-back that shows the sea is something else.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
