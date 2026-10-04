# Manga Panel — Style Prompt

> A black-and-white Japanese manga page read in front of the camera: G-pen line with sharp weight changes, mechanical screentone, solid spot blacks, white speed and emotion backgrounds, vertical balloons and sound words drawn into the art. The film is the act of reading: panels are revealed right to left, top to bottom, and the camera travels across the page.
> References (grammar only, never copy): shonen and sports manga for focus lines and the impact page; shojo manga for flower, sparkle and tone-gradient backgrounds; the screentone sheet for pitch and angle; motion comics for panel-to-panel moves. Never copy a series' characters, layouts or lettering.

## 1. Essence, and what it is not

- **A page, read in order.** The frame is a manga spread (right page first): white paper, black ink, ruled panel borders of constant width, varied panel shapes (slanted gutters, a bleed panel cut by the paper edge). The eye path is the structure.
- **Line has weight.** Contours are G-pen strokes: thin on the lit side, heavy on the shadow side, tapering to points. No uniform outline except ruled borders.
- **Tone is a mechanical sheet.** No greys: every shade is a screentone (dot, line, sand, dot gradient) laid in page space, or solid black, with hard edges.
- **Emotion is background** (focus and speed lines, tone gradients, sparkles, flowers, sweat drops) and **lettering is drawn**: vertical balloons, sound words with a white rim that may break a border.
- **One spot colour, title page only.**

Not Comic Panel Pop Art (colour print, Ben-Day primaries, horizontal lettering, left to right). Not Halftone Dossier (archival cream paper, stamps, overprint). Panel borders, tone and a G-pen line are in every frame.

## 2. Materials & rendering

- **Paper** warm white (example `#fbfaf5`), flat; **ink** near-black (`#0e0d10`). The page is drawn in page space under a camera transform, so line width and tone pitch grow with zoom like a page under a lens.
- **G-pen** (`pen()`): a smoothed polyline becomes a polygon, width = base × pressure × direction term. Taper 10–25 % at the start, 20–30 % at the end. Edges facing the shadow side (lower right; one light per film) are 1.5–2× thicker than lit edges, so closed shapes get weight automatically. Width wobble ≤ 10 %. Fill characters paper-white first (tone behind must not show) and outline each limb or part once as a single polygon; never stroke segment by segment.
- **Screentone** (`tone()`), anchored in page space, clipped to a polygon:
  - *dot*: 45° lattice; **6–14 px on screen** at the framing used; radius = pitch × √(pct/π); above ~78 % switch to solid ink with paper holes. Gradients change radius, never pitch.
  - *line*: parallel at 0°, 15° or 75°, width = pct × pitch. *sand*: seeded stipple for stubble and grit. *solid*: spot blacks, hair, suits, cast shadows.
  - At most two tones overlap, at different angles; a tone begins and ends at an edge.
- **Effect lines** are filled wedges: *focus lines* converge on a point (clear inner ring, random lengths, a few thick ones); *speed lines* run parallel, tapered, with a clear halo around the subject; radial lines from a vanishing point give depth.
- **Panels**: ruled borders 3–4 units, mitred; gutters 14–16; slants ≤ 8°. The lettering layer is drawn after every border, unclipped.

## 3. Colour logic

- **Two values**: paper white and ink black. Antialiasing is the only grey; no grey fills, no opacity ramps.
- **Spot colour**: one flat hue (example `#f2891d`) only on a title page or chapter opener, under black line, with black dot tone for shading and paper-white lines for highlights. Story pages carry none.
- Outside the page: a flat very dark neutral, so the page reads as an object.
- Inversion (black ground, white lines) is for impact pages only, 2–4 frames.

## 4. Type & subtitles

- **Balloon text**: a bold gothic face, 20–30 units, **vertical**, columns right to left, upright characters on a fixed pitch (≈ 1.0 × size per character, 1.2 × per column); `、。，` hang to the upper right of their cell; `…` and `—` rotate 90°.
- **Balloons**: oval with a straight tail (speech); spiked burst (shout); tailless box (narration); paper fill, 2–3 unit outline.
- **Sound words**: a chunky display face, 90–420 units, per character with ±10 % size jitter, a small rotation fan and a slant; paper rim 12–16 % of the size, then solid ink (inverted on black); hollow letters for quiet or magic sounds.
- **Chinese type** (OFL, subset to the characters used per TECHNIQUE §11): Noto Sans SC Bold (balloons, narration) and Black (titles), ZCOOL QingKe HuangYou (sound words); for Japanese vertical lettering Noto Sans JP or Zen Maru Gothic, Rampart One for sound words. The engine places vertical text per character (canvas has no vertical text). Sound words are in the film's language (啪、嗖、哒 / ドン、バッ).
- **Subtitles are balloons and narration boxes**, held ≥ max(1.8 s, speech + 0.6 s); no separate subtitle bar. Page numbers sit in round tags at the outer bottom corners.

## 5. Motion quality

- **The ink never moves**: no line boil, no wobble.
- **Contents animate on twos** (12 fps): run cycles, sweat, sparkle, effect lines reseeded every 2 frames. **Camera and reveals are smooth.**
- **Reading reveal**: a slanted slash sweeps right to left across the panel in 0.25–0.35 s, border included; lettering follows with a 1.1 → 1 pop. Panels never fade.
- **Tone slide**: for speed, slide a tone's phase along the motion at 40–140 units/s while the subject stays put.
- **Impact page**, 2–3 frames: a black page with white focus lines and the sound word in white, one negative of the page, then the page again with a decaying shake (≤ 16 px, 0.5–0.8 s) and a zoom kick.
- Anticipation and follow-through live in the drawing (a lean, a held pose, a shake); speed is lines and dust puffs, never blur. Poses blend by keyframes.

## 6. Camera grammar

A smooth 2D camera over a flat page. A vocabulary, not a route.

| Move | What it expresses | Can serve |
|---|---|---|
| Full spread, locked | overview; everything at once | a summary; a final beat; a reveal |
| Push into a panel until it fills the frame | "look here" | a decision; a key fact; a face |
| Pan panel to panel along the reading path | the next beat | steps; cause and effect; a journey |
| Pull back to the page | one of many; consequence | a punchline; scale |
| Snap zoom on the hit | impact | a collision; an error; a number landing |
| Page turn (a fold sweeps right to left) | new page, new situation | a time jump; a reveal after suspense |

Rules: a close-up subject fills ≥ 1/3 of its panel; text stays inside the page margin unless a sound word breaks out; the camera never rotates; zoom 1×–2.6× so tone stays 6–14 px. Transitions: reveal slash, page turn, push or pull, hard cut on a hit; no dissolves, 3D flips or curls.

## 7. Sound palette

- **Studio foley**: pen scratch for line reveals, burnisher rub and sheet peel for tone, ruler taps for borders, paper flick for page turns.
- **Music**: lean and rhythmic, like a school-comedy or sports-anime cue: tight kit with rim clicks and wood blocks, plucked or slapped bass, shamisen or guitar riffs, short brass hits, flute or marimba for gags. Sound words get matching hits (啪 = rim shot over a low thump; 嗖 = filtered whoosh).
- **Silence**: an empty panel is a bar of near-silence; cut the music 3–6 frames before an impact page; the sound word is the first sound back.
- **Mix**: hits in front of the music, ducking 3–6 dB under dialogue; −14 LUFS, true peak ≤ −1 dB.

## 8. Native moves

- **The reading slash.** Panels arrive in reading order and the camera follows. *Fits content like:* a recipe in steps; a product's four selling points; stages of a trip.
- **The impact page.** A black burst with one white word breaks the rhythm. *Fits content like:* a collision; a product's moment of truth; a score reveal.
- **Tone as emotion.** Dots swell into a halo, flowers bloom, hatching falls down a forehead. *Fits content like:* a surprise discount; a bad review; a first taste.
- **Breaking the border.** A word, limb or balloon crosses the gutter. *Fits content like:* a rumour spreading; a ball leaving frame; a headline too big for its box.
- **The silent panel.** No text, no effect lines, held. *Fits content like:* a pause before a decision; a quiet detail; the end of a list.

## 9. Pitfalls of the medium

- **Greys** (fills, opacity) turn the page into an illustration.
- **Tone moiré**: pitch under ~5 px aliases after encoding; over ~16 px it reads as pop-art. Keep the zoom range or change pitch on a hard cut.
- **Tone anchored to the object** swims: anchor in page space, slide the phase only on purpose.
- **Uniform line weight** looks like clip art; **seams at joints** come from stroking limbs in pieces.
- **Line boil** and **colour creep** (a second hue, or the spot colour on a story page) end the print logic.
- **Balloons over faces**: use top and outer corners, tails at the mouth; split balloons over 3 columns.
- **Western reading order**: panels, balloons and camera go right to left, top to bottom.
- **Fonts not loaded** before layout: preload every family. **Everything at full intensity**: keep a quiet panel per page.

## 10. Engine

Reusable recipes in `demo/`: `engine.js` (`pen`, `shape`, `tone` dot / line / sand / solid with `gradLin` and `gradRad` fields, `focusLines`, `speedLines`, `sweat`, `sparkle`, `flower`, vertical `balloon` and `narration`, `sfx`); `chars.js` (`girlHead`, `manHead` with expression parameters, `runner`, `hand`, `bun`); `panels.js` (a panel is `art(ctx, P)` clipped to its polygon plus `over(ctx, P)` for lettering); `film.js` (layout, camera keys, reveal slash, page turn, impact frames). Minimal example not in the demo: a polygon panel with `ruler()`, a sky from `tone(ctx, poly, {k:'dot', f: gradLin(...)})`, a figure filled white by `shape` and outlined by `pen`, then `sfx(ctx, '轰', x, y, 200, {seed: 3})`. See [DEMO.md](DEMO.md#build-notes).

## 11. Variation space

You decide the story, page layout (4-panel strip, 6–8 panel spread, splash, tall phone scroll), cast, spot colour, language and length. Latin-script films keep the reading order and may set text horizontally.

All far from our demo:

- Structures: **a how-to in numbered panels** ending on a silent panel; **a countdown** where panels shrink toward a splash; **a quiz** answered after a page turn.
- Openings: **a splash page** with one giant sound word; **a blank page** where the first border is ruled in; **a lone balloon** with panels growing around it.
- Endings: **the page closes into a book cover** and the spot colour returns; **the last panel runs off the page**; **an empty panel with one sound word**.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
