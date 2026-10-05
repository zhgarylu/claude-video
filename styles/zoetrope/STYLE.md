# Zoetrope & Phenakistoscope: Style Prompt

> Pre-cinema optical toys as a film: a slotted paper disc, a slit drum, a mirror, a lamp. Victorian engraved line drawings in black-brown and sepia on yellowed card, brass fittings, one warm flame. The picture only moves when the toy spins.
> References (grammar only): 1830s-1890s phenakistoscope discs, zoetrope strips, praxinoscopes and flip books (the ring of figures, the slits at the rim, the printed instruction labels); wood-engraving practice (contour, parallel hatching, cross-hatching). Never copy a real disc or strip image, a real museum label or a real person; every drawing is invented. Not the film-stock look of the silent-film style, not cut paper or shadow puppets.

## 1. Essence, and what it is not

- **A mechanism that animates itself, shown as an object on a table.** At rest the toy shows a set of still drawings (twelve on a ring); spun up, the slits make one drawing at a time visible and the figures appear to move. The film is about that threshold.
- **The stroboscope is computed, not faked**: what the eye (or the camera) sees at time t is derived from the real rotation of the toy, so slow speeds flicker, the right speed fuses, reversed rotation plays the loop backwards, and the 24 fps frame rate beats against the slit rate honestly.
- **One loop of 12 drawings**, simple enough to read at thumbnail size (a bird's wing beat, a walker's stride, a flower opening, a bouncing ball, a day).
- Not a film-stock simulation (no scratches, gate weave, flicker of reels), not a puppet theatre, not a generic "vintage" filter over modern graphics, not a cartoon: the drawings are engravings.

## 2. Materials & rendering

- **Card**: cream, yellowed toward the edges, with fibres, foxing specks and a hand-worn centre; edges with a pale lip and a dark inner edge at every cut slit (card thickness).
- **Drawings are ink on transparent tiles**, rendered from code by an engraver's toolkit: a pen whose line swells and thins, and hatching whose line weight follows a shade function. Overlaps are knocked out of the ink behind, so a near wing hides a far wing. Faint oval vignettes of fine horizontal lines sit behind each figure.
- **Brass**: hub and pin, mirror frame (with a beaded ring), clip at the line of sight, speed dial, drum base and rims. Gradient from pale gold to umber, with a dark outline.
- **Wood**: dark walnut with grain lines, plank seams and scratches.
- **Light**: a single candle or gas lamp from the upper left, a deterministic slow flicker, a warm soft-light pool and a dark vignette; shadows fall to the lower right and grow with the height of the object.
- **Motion blur is the camera's shutter**, not a filter: sub-frames of the real rotation, averaged. A short shutter (about 3 % of a frame) is used on purpose when the film should show the aliasing.
- 1920x1080, 24 fps. Mux with a little grain (about 1); the paper carries the texture.

## 3. Colour logic

- **Ink and sepia on cream, with brass as the one accent.** No saturated colour. Dials may carry one muted red needle.
- Suggested: ink `#241509`, sepia `#6f4a2a`, card `#efe2bf`, shade `#e4d09b`, brass `#b98a3a` (highlight `#f0cd7a`, shadow `#6d4a1b`), walnut `#2a190d`-`#4a2d17`, lamp `#ffd9a0`.
- The dark of a slit drum is lacquer black-brown; what is seen through the slits is paper and ink, so the light lives in the slits.

## 4. Type & subtitles

- **One period face for everything**: an old-style roman and italic (IM FELL English, OFL). Italic for captions, roman small figures for numerals (Roman numerals I to XII by each drawing).
- **Captions are printed slips**: a cream label with a double hairline border and two dots, lower centre, ink-stamp entry (a short fade), full sentence at once. Hold at least 1.8 s and never less than speech + 0.6 s.
- **Fig. tags** are paper tags lying on the table, with a clipped corner and a shadow, set in italic ("Fig. II. Disc, slit and mirror."). They never sit under the slip or on the subject.
- Text printed on the toy (an inscription along a ring, numerals, a dial scale) turns with the toy and is decoration, not information.

## 5. Motion quality

- **Everything that turns follows one rotation table** (angle over time, integrated from a speed curve in revolutions per second). Picture, mirror, dial and sound are all derived from it.
- **Speeds are staged, not cut**: a hand's push, a rise through flicker to fusion, holds at an exact rate, a pass through zero when reversing, a run-down. Holds at an exact rate are **phase-locked** to the film frames (a small smooth correction in the ramp before the hold) so the slit always arrives just before the frame is taken; otherwise the picture beats or dims.
- Mechanical parts are exact and rigid. Paper bends in smooth curves; cards lift with a growing shadow; a sleeve of brass drops and settles with one small bounce.
- Smooth every frame; the drawings change only through the toy.

## 6. Camera grammar

A vocabulary, not a route. The camera is a top-down or low three-quarter view over a table.

| Move | What it expresses | Can serve |
|---|---|---|
| Slow push on the object at rest | the still before the motion | an opening; a reveal of the set of drawings |
| Pan from the toy to the viewing arrangement | how it is used (disc, slit, mirror) | an explanation of a mechanism |
| Push to the mirror / the slit | what the eye gets | the moment the loop emerges or flickers |
| Close-up with a short shutter | what the camera sees | aliasing; the film talking about itself |
| Ring unrolling into a strip | the same drawings in another form | disc to strip; a cycle to a timeline |
| Strip curling into a drum, pitch from above to the slit side | a mechanism assembling | showing the object from the top and the side |
| Wide pull-back at rest | the toys as objects again | an ending |

Transitions are made of the objects: a camera slide along the table, cards lifting, a sleeve lowering. No dissolves between scenes.

## 7. Sound palette

- **Music box and its family**: comb tines (a sine with a short inharmonic overtone and a click), reed organ drone, a soft plucked bass, wood ticks on the beat. A waltz in 3/4 at a moderate tempo suits a toy that counts twelve. Run the whole score down (tempo and pitch falling) when the toy winds down.
- **The toy's own sound, generated from its rotation**: one click per slit crossing (a dry tick whose pitch is lower on a drum), a whir whose brightness follows the speed, a faint hum. At an exact rate the clicks form a steady rattle; at reversal they slow to nothing and start again.
- **Foley of the materials**: brass tink and bell, card slap and flip, paper bend, a brass sleeve scraping and landing, a clock tick, candle crackle, room tone.
- **Silence**: at least two real near-silences (room tone and candle only), one before the toy first turns and one after it stops; the first sound after each is the toy's own.
- Mix: voice compressed and about 8-10 dB above the music; music ducked under voice; -14 LUFS.
- **Voice**: clear, unhurried, slightly dry; a warm British lecturer's delivery suits it.

## 8. Native moves

A menu: use the ones the story needs.

- **Spin-up.** The disc, shown flat and still, starts to turn; the loop emerges in the mirror as the speed rises through flicker to fusion. *Fits content like:* how persistence of vision works; any "it only works when it moves" idea.
- **The slit strobe.** The line of sight is a gate; each crossing lights one drawing for an instant (a lamp under a numbered thumbnail row shows which). *Fits content like:* sampling, frames per second, a pulse.
- **Speed change.** Too slow it flickers; reversed it plays backwards. *Fits content like:* cause and effect of a parameter; rewinding.
- **Wagon wheel.** With a short shutter, the ring seems to stand still or creep backwards while the drawings keep changing. *Fits content like:* aliasing; why wheels turn backwards on film; sampling rates.
- **Stop on one frame.** A drum or disc halts and shows a single drawing. *Fits content like:* a pause; a decision; a photograph.
- **The wheel of frames unrolling into a strip.** Twelve cards lift off the ring and straighten; the strip curls into a drum. *Fits content like:* a cycle becoming a timeline; a loop becoming a film.
- **A drum seen from above and from the slit side.** *Fits content like:* the inside and the outside of a system.
- **A looped 12-frame cycle.** A bird, a walker, a flower, a ball, a day. Invent your own.

## 9. Pitfalls of the medium

- The drum is dim by nature (a slit lets in about a sixth of the light): brighten only what is seen through the slits, never the panels or the brass.
- Averaging over exactly one slit pitch makes the panels disappear into an even band; a shorter window keeps the slits as streaks but breaks the figure. Choose the window for what the shot must show.
- Without phase-locking a hold at 2 revolutions per second beats against 24 fps (the picture pulses or turns dim). Lock it.
- A mirror drawn as a perfect glass looks like a photograph; give it foxing and a faint gloss.
- Thin hatching vanishes when blurred: give drawings heavy contours and dark masses.
- Cards that carry the same paper as the disc show a patch when they lift: fade their border in with the lift.
- Do not put a caption on the thumbnails or the dial; keep the lower 150 px free for the slip.

## 10. Engine

In `demo/`: `timeline.js` (tempo grid, scene times, speed curve, rotation table with phase locks), `engine/ink.js` (pen, hatching, knock-out, feathers), `engine/art.js` (the two invented 12-frame loops), `engine/world.js` (paper, table, disc, cards, brass), `engine/eye.js` (the leaky integrator of slit flashes), `engine/drum.js` (strip curling into a shell, projection, averaging of sub-frames, brightening through the slits), `main.js` (scenes and camera), `mix.py` (score, rotation-driven foley, voice), `tools/` (timeline export, captions). File list and build steps: [DEMO.md](DEMO.md) "Build notes".

## 11. Variation space

You decide the loop, the toy, the story, the opening, the ending. All far from our demo:

- Loops: **a flower opening** over a day cycle; **a ball bouncing** and settling; **a clock face** with a missing frame; **a crowd** with one different figure; **the user's product** drawn as an engraving.
- Toys: a **praxinoscope** (a mirror prism at the centre of the drum, figures that stay put); a **flip book** whose thumb release is the shutter; a **thaumatrope**; a **slit disc with two rings** that play two loops in counterpoint.
- Structures: a **history** told by building each toy in turn; a **countdown** of frames per second from 4 to 48; a **mystery** of a drawing that only appears at one speed.
- Endings: **the lamp goes out** and all is still; **the disc spins by itself** in the empty room; **the last card turns face down**.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
