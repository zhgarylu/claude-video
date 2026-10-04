# Comic Panel Pop Art — Style Prompt

> A printed American comic page that builds itself in front of the camera: thick black ink keylines, flat primary colour that is a little out of register, Ben-Day dots for every tone, slanted panels that slam onto the page, caption boxes, speech balloons and giant onomatopoeia. The film is a page being laid out, panel by panel, and the camera moves from panel to panel.
> References (grammar only, never copy): Roy Lichtenstein-era pop-art comics for the dot-as-tone, the keyline and the one-colour-per-shape logic; Silver Age superhero and romance comic pages for panel rhythm, burst balloons and sound-effect lettering; the 1960s TV-adventure tradition of sound-word inserts that interrupt the picture; motion comics for panel-to-panel camera moves. Never copy their characters, panels, texts or lettering, and never name them in the film.

## 1. Essence, and what it is not

- **A page of panels.** The frame is a comic page: paper gutters, slanted panel borders, 10–14 px black keylines. Panels arrive, split, overlap, zoom to fill the frame.
- **Colour is ink, tone is dots.** Flat red, yellow and blue (plus white and black); every shade, glow and shadow is a Ben-Day dot field, never a gradient. Dots of one ink over another overprint (multiply): red over yellow reads orange.
- **Off-register print.** The colour layer sits 3–6 px away from the black line layer, so a sliver of the wrong colour (or paper) shows along every edge.
- **Lettering is a picture.** Caption boxes, balloons and a giant sound word per big event, with extruded black depth, a white rim and a colour fill.
- **Loud, clear, one beat per panel.** One idea per panel, one line of text per box, a subject that fills at least a third of its panel.

Not Halftone Dossier (that is archival, muted, one cream sheet with stamps; here the page is saturated primaries, panels and balloons). Not manga (no screentone greys, no right-to-left page, no speed-line-only drama; the look is American four-colour print with Ben-Day dots and bold lettering). Not Mid-century Cartoon or Rubber Hose (no outline-free flat-vector cast, no animated characters as the point). Not Game Show Flat (no UI, no candy sets). Dots, keylines and a visible panel grid appear in every frame.

## 2. Materials & rendering

- **Three passes per panel**, in this order: (1) **colour layer**: flat fills and dot fields, drawn translated by the register offset and clipped to the offset panel; (2) **line layer**: all black linework in its own transparent canvas, at true position; an opaque object first erases (`destination-out`) the lines behind it, then strokes its own outline, so nothing shows through; (3) **lettering layer**: captions, balloons and sound words on top, unclipped, so they may break the panel border.
- **Ben-Day dots**: a rotated grid of circles in **page space** (anchored to the page, not to the object), step 17–22 px at 1080p, radius = step × k × √density with k 0.5–0.7 (≈0.7 fills solid). Screen angles: 45° for the main field, other angles (15°, 30°) for a second ink so two layers do not align. Density fields: radial (glows, impact), linear ramp (lit from a corner), constant (a flat "tint" such as crust). Draw each field as one path with `multiply`. Dots must stay ≥ ~14 px apart at 1080p or they alias.
- **Keylines**: ~10 px for objects, 13 px for panel borders, ~7 px for small props, round joins; constant width, no wobble, no boil.
- **Paper**: warm newsprint under everything, with fine per-pixel noise and a slight vignette; ink specks and paper specks reseeded a few times a second sit in screen space on top.
- **Props**: simple silhouettes with a thick outline, a lighter inner area, one dot-tinted shade side and one white highlight streak. No gradients, no soft shadows, no textures.
- **Background vocabulary**: burst shapes (impact stars), sunburst wedges (alternating colours from a focus point), speed lines (thin black triangles pointing at the focus), radial impact lines, dot halos.

## 3. Colour logic

- **Three inks plus black and paper white.** Red, yellow and blue, saturated and slightly warm (example: `#e4372b`, `#ffd21f`, `#1a8fd8`, black `#16110f`, white `#fffaf0`, paper `#f3ead3`). A lighter tint of blue is allowed for a second plane; nothing else is.
- Every shape is one flat ink. Tone and secondary colours come only from dots and overprint (red dots on yellow = orange; blue dots on yellow = green, use sparingly).
- Adjacent areas must contrast in hue or value; **never red on red, blue on blue**. A lettering fill is an ink that the panel behind it is not.
- Yellow is the caption-box colour; white is the balloon colour; both with black text. Sound words are filled red or blue (yellow on a blue field).
- Night or mood: switch a panel's background to blue (or black with white dots), not to grey or to a gradient.
- Skin or object local colours are allowed only as dot tints of the same three inks.

## 4. Type & subtitles

- **Sound words and titles**: a fat, chunky display face (e.g. Lilita One, Bangers, Luckiest Guy, Bowlby One; for CJK a black-weight sans such as Noto Sans SC Black, or a brush-block face), 120–330 px. Built per letter: size alternates ±8 %, a small random tilt, baseline on a gentle arc, a fan of rotation across the word; then black extrusion (10–24 px, one fixed direction for the whole film), a 10–16 px white rim, the colour fill, a black inner line. Always in the language of the film (BAM, POW, SPLAT for English; 砰、啪、嗖、轰 for Chinese).
- **Caption boxes**: a yellow (or white) rectangle, 6 px keyline, a hard black offset shadow (9 px), two lines at most, 32–46 px, upright or tilted ≤ 2°. They carry narration and the keyword.
- **Balloons**: a white ellipse, 7 px keyline, offset black shadow, one tail pointing at the speaker or off the panel edge; 36–44 px bold all-caps in Latin scripts; at most 3 short lines.
- **Subtitles are the caption boxes and balloons.** With a voice-over, the box carries the spoken line; hold ≥ max(1.8 s, speech + 0.6 s). Burned-in subtitles never sit as a separate bar on the page.
- A Latin line runs 2–3× longer than CJK: shorter lines, smaller boxes, one word per sound effect.
- **Chinese type** (OFL, subset to the characters used, per TECHNIQUE §11): ZCOOL QingKe HuangYou (or Noto Sans SC Black) for sound words and titles, Noto Sans SC Bold for captions and balloons. Apply the same per-character tilt, extrusion and rim as the Latin rule; one character per beat (砰、啪、嗖).

## 5. Motion quality

- **Animate on twos**: panel contents (spinning props, sunburst turn) step at 12 fps; the **camera and panel slams stay smooth**.
- **Panel slam**: a panel appears from scale ~1.3 above the page, hits down in ~0.15 s (ease-in), with a tiny rotation that resolves, a white flash (≤ 0.7) on the landing frame, and a decaying shake (≤ 12 px). Its lettering pops in 0.15 s later with an overshoot (back ease).
- **Gutter reveal**: panels never fade. The paper gutter appears because panels arrive or move away; a split opens by sliding the two halves apart (20–40 px) so the gutter grows.
- **Impact**: shake with quadratic decay, a short freeze (2–4 frames) on the hit, the sound word scales 1.4 → 1 with overshoot.
- **Props move with anticipation and follow-through** (a small wind-up, a squash on landing preserving volume, a damped settle), but inside the panel they are drawn flat, never blurred: speed is shown by speed lines, echo trails or dotted paths.
- **Nothing fades or dissolves.** Things cut, slam, wipe along a panel diagonal or are covered by the next panel.
- Idle: dots and colour stay perfectly still; only the ink-speck layer flickers.

## 6. Camera grammar

The page is a flat sheet; the camera is a 2D transform over it. A vocabulary, not a route; opening and ending come from the topic.

| Move | What it expresses | Can serve |
|---|---|---|
| Locked full page | the overview, the laid-out argument | a summary; a map of steps; a reveal that everything is connected |
| Push into one panel until its border leaves the frame | "this is the moment", the panel becomes the world | an impact; a decision; the key number |
| Pull back from a panel to the full page | the panel was one of many; consequence | a punchline; a scale reveal |
| Panel-to-panel slide (diagonal, along the gutter) | reading order, next beat | a sequence of steps; cause and effect |
| Snap zoom to a dot detail until dots are huge | look closer; abstraction | a microscopic detail; a number; a glance |
| Split | one idea becomes two (before / after, cause / effect) | a comparison; a twist; a pair of facts |
| Overlap and break the frame (an object leaves its panel) | energy, something too big for the box | a leap; an explosion; an escape |
| Shake and flash | impact | a landing; a hit; an error |

Framing rules: the subject fills ≥ 1/3 of its panel height; panels are slanted by no more than ~8° so text boxes stay readable; a gutter is 30–45 px; text stays inside the page margin (50 px) unless it is a sound word breaking out. Transitions: panel slam, split, push into / pull out of a panel, wipe along a panel diagonal, hard cut on a hit. No dissolves, no 3D flips, no page curls.

## 7. Sound palette

- **Brassy pop-jazz and surf**: tight drum kit (snare cracks, rim shots, floor-tom fills), fuzzy or twangy electric guitar, upright or plucked bass in short staccato lines, stabs of brass and a Hammond-style organ, a vibraphone or xylophone for lightness. Saturday-morning adventure and quick-cut spy-pop, not orchestral.
- **Foley is the lettering**: every sound word has a hit that matches it (SPLAT = wet slap plus a short low thump; FLIP = a quick whoosh with a rising pitch; BAM = bass drum with a sharp transient). Panel slams are page slaps (paper smack + a short thump). Caption boxes pop (a woodblock or soft click), balloons plop. Page sweeps and wipes are fast whooshes.
- **Silence as a tool**: cut everything for 3–6 frames right after a slam or before a punchline; the first sound back is the sound word.
- **Voice** is optional; the caption boxes can carry the film. If narrated: a clear, slightly dry, confident announcer, never breathless, with room before each box lands.
- **Mix**: SFX in front of the music on every slam; music ducks 3–6 dB under a voice reading a caption; soft-clip master; −14 LUFS, true peak ≤ −1 dB.

## 8. Native moves

A menu: use the ones your story needs.

- **The slam-in page.** A grid of panels lands one after another, each with flash and shake, until the page is complete. *Fits content like:* a recipe in four steps; the four phases of a product launch; a city's five landmarks.
- **Push into the panel.** The camera pushes into one panel until its border leaves the frame, which makes that panel the whole scene. *Fits content like:* the moment a bug is found; the final step of a how-to; the one number that matters.
- **The sound word as subject.** A giant lettered word does the narration for a beat, with extrusion and burst. *Fits content like:* a product's one-word promise; an error code; a sports result.
- **Split panel.** A panel opens along a line into two, each with its own caption. *Fits content like:* before and after; two sides of an argument; a myth and the fact.
- **Breaking the frame.** An object or a word leaves its panel, over the gutter into the next. *Fits content like:* a ball flying through a sequence; a rising price; a rumour spreading.
- **Dot density as emotion.** Dots swell into a halo, crowd the border for tension, thin out for calm. *Fits content like:* a sudden shock; a slow reveal; a victory.
- **Caption boxes chaining.** Boxes stack across panels like a sentence read aloud. *Fits content like:* a timeline; a bit of history; a rule with three exceptions.
- **The off-panel voice.** A balloon whose tail leaves the panel: the speaker is never shown. *Fits content like:* a boss calling; a smart speaker; the narrator interrupting.

## 9. Pitfalls of the medium

- **Hidden-line errors.** If outlines are drawn in one pass over all colour, lines of objects behind show through objects in front. Keep the line layer separate and erase behind each opaque shape (see §2); never stroke on top of colour with no occlusion.
- **Dots anchored to the object** shimmer or swim when it rotates → always compute dots in page space and clip to the object.
- **Dots too fine** (< 14 px step at 1080p) alias to moiré after encoding; too coarse (> 26 px) looks like polka-dot wallpaper.
- **Too many inks.** A fourth hue (green, purple, orange as a flat colour) breaks the print logic; get them from overprint only.
- **Gradients and soft shadows** turn the page into a vector illustration. Use dots and hard offset shadows only.
- **Lettering hidden by the picture.** A sound word needs a quiet area (flat colour, a burst) behind it; use the same black extrusion direction in every panel.
- **Register offset too big** (> 8 px) looks like a rendering error; too small (< 3 px) disappears. Keep it constant for the whole film, except a deliberate jolt on an impact.
- **Text too long.** Boxes of more than two lines, balloons with more than three: split into more panels.
- **Every panel slamming at once.** Stagger slams; leave one panel static (or one gap) so the page has a rhythm.
- **Fonts not loaded before layout** (measure + per-letter placement use a fallback font) → preload each family, and use only characters that appear in the page.
- **Timed panels** invisible before their cue need explicit skipping for `t < t0`.

## 10. Engine

Reusable recipes in `demo/index.html`: `shape()` (colour pass / line pass, with occlusion), `dots()` (page-space Ben-Day fields; `radial`, `ramp`, `flat` density helpers), `burst()`, `rays()` (sunburst wedges), `speedLines()`, `blob()` (puddle), `toast()` (an example prop built from paths), `caption()`, `balloon()`, `sfx()` (per-letter onomatopoeia with extrusion), `drawPanel()` (slam, shake, flash, split, three passes), `camera()` (push into a panel). Minimal example that draws something not in the demo: a panel polygon + `shape()` for a flat red circle, `dots(…, radial(...), INK.b)` for its shade, `sfx(ctx, 'BAM!', …)` over it. Entry points and line ranges are in [DEMO.md](DEMO.md#build-notes).

## 11. Variation space

You decide the story, the page layout (3-panel strip, 6-panel grid, one splash page, vertical scroll), the hero prop or character, the inks within the colour logic, the language of the sound words, the voice, and the length.

All far from our demo:

- Structures: **a how-to in numbered panels** where each step's panel slams in and a final panel splits into "expected" and "actual"; **a countdown page** where panels shrink from a splash page to a strip; **a debate** between two balloon colours across a split page that ends with the gutter closing.
- Openings: **a splash page** of one huge panel with only a sound word; **an empty page** with a single caption box and a dot grid filling in; **a balloon alone** on paper, panels sliding in around it.
- Endings: **the page turns into the cover** (the whole page shrinks into a title panel); **a panel that does not fit** and breaks the grid; **a last silent panel** with only a caption and the dots still.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
