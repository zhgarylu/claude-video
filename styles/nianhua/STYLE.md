# Woodblock New Year Print — Style Prompt

> Chinese folk New Year prints made by machine-free hands: a bold black key-line block, then flat saturated colour blocks printed one pass at a time, each a hair out of register, on a warm absorbent paper that shows its fibre.
> References (grammar only): the folk woodblock traditions of Yangliuqing, Taohuawu and Mianzhu, for the layered printing, the symmetrical door pairs, the plump children with fish and lotus, and the auspicious motifs (peony, bat, coin, cloud). Never trace an existing print, name a real deity, quote a real couplet verse or copy a workshop's seal.

## 1. Essence, and what it is not

- **A black key-line drawing, filled with flat colour.** One heavy outline block holds the drawing; each colour block is a flat shape that never shades.
- **The picture is built, not shown.** The colour passes land one at a time, so the image goes from line drawing to full colour in visible steps. That sequence is the film's engine.
- **Everything is a little off.** Each pass is mis-registered by a few units; the colour spills across or stops short of the line. The error is the charm, and it settles only when the last block lands.
- **Symmetry and auspicious puns.** Door guardians come in mirrored pairs; fish, lotus, bat, coin and peony stand for surplus, continuity, luck, wealth and abundance.
- **Paper, ink and wood are visible.** Fibre in the paper, ink thinner in streaks where the wood grain lifts it, ink pooled darker at the edge of every shape.

Not a vector flat illustration (the texture and the registration error are the point), not a papercut (papercut is cut from one sheet and has no line drawing), not ukiyo-e (no gradation, no bokashi, no Japanese compositions), not a lantern-festival motion poster (no glow, no gradients).

## 2. Materials & rendering

- **Run one drawing function once per pass.** Declare each shape once, in painter's order, with its colour block. In the key pass a shape knocks out the lines behind it and gets its outline; in its own colour pass it is filled; in every other pass it knocks out what is behind it (a cut block leaves a gap). Shapes meant to overprint (a cheek on skin, a stud on a belt) are flagged and knock nothing out.
- **Bake each pass to a transparent layer; multiply the layers onto the paper in print order.** Two inks overlapping mix like inks.
- **Roughen every layer like inked wood:** cut a seeded grain mask (streaks along the plank, fine speckle) and a faint low-frequency blotch mask out of it, with a different offset per pass. The key layer takes less, so lines stay bold. Pool the ink: stroke a darker, half-transparent line along the inside edge of each shape (clipped to it).
- **Mis-register every pass** by a fixed few units and a fraction of a degree, larger at the moment of printing and decaying as the sheet is pressed.
- **Hand-cut edges:** jitter every vertex a unit or two (seeded by position, identical in every pass) and curve through the points.
- **Paper** is a tiled texture (warm base, long fibres, flecks); **wood** an anisotropic noise ramp along the grain. Make textures once from fixed seeds; nothing is random between frames.
- **Cache the composites** (paper plus passes 1 to k): a frame draws the cached sheet and only the pass in progress, masked. Add little or no film grain on top (mux grain 0 to 1).

## 3. Colour logic

- **Key-line black plus five printing inks:** vermilion, leaf green, mustard yellow, indigo, peach pink. Nothing else is invented; a sixth colour would be a sixth block.
- **Paper is the white.** Never print white. A highlight is a hole left in the ink.
- **Each ink is flat.** No gradients inside a shape. Value comes from overlap (indigo over peach is a dark violet) and from the edge pooling.
- **Vermilion is the climax colour.** Print it last. It carries the frame band, the bib, the carp and the door leaves, and its arrival is the loudest visual event.
- **Backgrounds that are not the print** (table, wall, interior) are dark and desaturated so the print is the brightest and most saturated thing in the frame.
- Example only: key `#1c1713`, vermilion `#dc3a1f`, green `#3d8c4d`, yellow `#eaae28`, indigo `#2a4a90`, peach `#f5a78b`, paper `#f1e4c6`.

## 4. Type & subtitles

- **Latin type** is a heavy, rounded display face (Lilita One, OFL) used the way a printer's shop uses a block-cut headline: very few words, big, black, with a vermilion second pass offset a few pixels down and right as the mis-registered shadow.
- **Chinese characters** only if drawn in code from a handful of block-cut strokes (round caps, one stroke width) or taken from a font that is on disk and holds the glyph. Keep them to one or two characters. Never run Chinese text.
- **Subtitles are a paper slip** with a heavy double key-line frame, set on the table or wall plane, slightly crooked, slapped on with a 0.1 s pop and removed without a fade longer than 0.12 s. Hold at least max(1.8 s, speech + 0.6 s). Place it where it covers no face and no key action; move it between corners per scene if needed.
- **Titles** are a slip lying in the world (it moves with the camera), not an overlay.

## 5. Motion quality

- **Smooth 24 fps, no stepping.** The medium is static; the motion is the printing and the camera.
- **A pass is revealed by a baren sweep:** the layer is masked by a soft-edged front travelling across the sheet while a round baren pad follows the front in a zigzag. The front never shows a hard edge longer than a frame.
- **Everything that lands is a block, a sheet or a stamp:** a short anticipation (up and slightly large), a hard landing, a damped settle of 1 to 2 percent, a few pixels of camera shake that die in 0.4 s. Nothing floats down.
- **Paper behaves like paper:** a sheet lifts at one edge, flips by narrowing to a line and widening again, and carries a growing shadow while it is in the air.
- **Transitions are sheets sliding over or off the scene**, with a bright paper edge and a shadow, never dissolves.
- **What never moves:** the printed image. Once a pass has landed it is part of the sheet; only the camera, the sheet as a whole and the printer's tools move.

## 6. Camera grammar

A vocabulary, not a route. The camera is a 2D matrix (centre, scale, slight rotation) over a flat table or wall.

| Move | What it expresses | Can serve |
|---|---|---|
| Top-down locked on a block or a sheet | the craft, a flat object studied | an object being made; a recipe; a spec |
| Push into one part of the sheet | the detail a pass has just changed | a face; a feature; a data point |
| Pull back to the whole sheet | the picture assembled | an overview; a result |
| Pan following a lifted sheet | carrying the work to its place | a handover; a journey between places |
| Symmetric locked wide | a pair, a threshold, balance | two sides; a decision; a gate |
| Dolly through an opening | entering the picture's world | an arrival; a reveal; a change of state |
| Close-up of a tool and the paper | touch and texture | glue, ink, a brush, a seal |

Framing: the print fills at least a third of the frame height at its key moments; text and subtitles stay out of faces; the print is always the brightest object. Transitions are paper slides, page peels and camera moves inside one world.

## 7. Sound palette

- **Foley follows the materials:** wood on wood (a plank set down), a rubber roller dragging ink, damp paper laid and lifted, a bamboo baren rubbing in strokes, a paste brush sloshing, a sheet peeling off the wood, a paper slap, a tear, door timber and hinges, firecrackers.
- **Music in the instruments of a folk New Year:** plucked zither (guzheng) and lute strings, a bamboo flute, a wooden fish (muyu) and a clapper (bangzi), small and large gongs, a big drum. Pentatonic. Synthesised (modal or Karplus-Strong plucks, additive flute, inharmonic gong partials); no samples are needed.
- **Build one voice per pass:** wood tick, then bass pluck, then arpeggio, then drum, then the full band when the red lands.
- **Silence is a tool.** Strip the score to nothing before the burst of firecrackers; let the room tone or wind carry the near-silence.
- **Mix:** voice 10 dB above the music, music ducked under the voice, foley never over it; keep 20 to 120 Hz audible with harmonics on the bass; about -14 LUFS.
- **Voice:** warm, unhurried, storyteller register; short declarative sentences with a breath between them.

## 8. Native moves

A menu: use the ones your story needs.

- **Colour passes, one at a time:** line drawing to full colour block by block, each with its own sweep and sound. *Fits:* a build-up; a recipe; layers of a plan.
- **The key-line snap:** the black block lands and everything finds its place; the last pass makes the picture still. *Fits:* a design locking; a launch.
- **Mis-register and settle:** the error is shown, named, forgiven. *Fits:* handmade goods; imperfection as character.
- **The mirrored pair:** one block printed twice, once reversed, colours swapped. *Fits:* two sides; a gate; before and after.
- **Door reveal:** a pair of leaves opens onto a lit interior. *Fits:* arrival; a welcome; an unboxing.
- **Paste and press:** paste brushed on, sheet laid, smoothed. *Fits:* installation; a manual step.
- **The tear:** the print is used up by the act it was made for, and the block survives. *Fits:* renewal; yearly cycles; a tool that outlasts its product.
- **Firecracker red:** a burst of vermilion paper bits as punctuation. *Fits:* a milestone; a celebration.

## 9. Pitfalls of the medium

- **Hidden lines showing through:** strokes of a shape behind another show unless every front shape knocks them out first. Draw in strict painter's order.
- **A colour bleeding into the wrong block:** overlapping shapes of different colours print both unless the front one knocks the others out.
- **Too much grain looks like crayon.** Keep the streak mask faint.
- **Registration too tidy or too wild:** a few units is charm, a dozen is a mistake. Show the error on purpose in a close-up, then let it settle.
- **Mirrored art on a block:** a block is the reverse of its print; show it reversed and flip the sheet when it is peeled.
- **Resolution:** bake layers at least at the highest zoom times the world scale. Never re-bake per frame.
- **Text on the print:** do not invent Chinese. One drawn character on a banner is enough.
- **Camera shake as a constant:** it is a reaction to a landing, not a mood.

## 10. Engine

In `demo/`: `engine/printer.js` (the pass machine), `engine/sheet.js` (layers, cached composites, registration, sweep reveal), `engine/core.js` (seeded textures), `engine/motifs.js` and `art_*.js` (the drawings), `engine/scene_*.js` (scenes and cameras), `timeline.js` (the single source of times and sound events), `mix.py`, `tools/cuecheck.py`. Build steps: [DEMO.md](DEMO.md) "Build notes".

## 11. Variation space

You decide the subject, the pun, the pair (or none), the number of blocks, the setting and the ending. All far from our demo:

- Structures: **a proverb illustrated** (a four-character saying split into four images, one per block); **motifs stacked** (peony, then peony with bat, then with coin, each printed over the last); **a printmaker's day** (dawn carving, noon printing, dusk pasting).
- Openings: **a gouge** cutting through the plank as the line grows; **the finished print hung**, then taken apart into its blocks; **a blank door** in the snow with a brush and a bucket of paste.
- Endings: **last year's print peeled off in strips**; **the block put away** in a rack among many; **a child's finger** tracing the line.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
