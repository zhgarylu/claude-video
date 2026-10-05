# Assembly Manual · 步骤说明书体

> The wordless flat-pack and brick-set instruction booklet: one numbered action per page, one clean drawing, parts that fly along dotted lines and click into place, circles that zoom in on the click. It teaches any how-to (a recipe, a set-up, a workout, a craft) without needing a single sentence.
> References (grammar only): flat-pack furniture and brick-set instruction booklets in general, hardware set-up guides, safety pictograms. Never copy a real company's page layout, numeral shapes, mascot, colours, part names or logos; the product, its codes and its brand are invented.

## 1. What it is
A pale printed page with a thick-outlined drawing of the thing being built, a big rounded step numeral top left, a box of "what you need" top right (part letter, picture, "2×"), and an arrow made of a dotted travel line and a chunky head. The part you add is the only thing that moves. If you freeze any frame you should be able to say what to do next without reading.

Not a UI walkthrough (see living-screencast), not a technical drawing (see blueprint), not an infographic (see isometric-infographic): here the story is *building*, in order, and the drawing changes by exactly one part per step.

## 2. Look
- **Flat vector on a 2D canvas.** Every shape has a 6 px ink outline (`#1d1f24`, round joins and caps), flat fills, one darker band down the shaded side (right or bottom), at most one thin white highlight line. No gradients, no textures, no blur.
- **Orthographic, front-on with a slightly tilted ground**: cylinders are drawn as a body plus ellipses, never a perspective grid. A pale floor shadow sits under the object.
- **The page**: warm paper, a hairline inset border, a footer with a product code (left) and a page number (right). Pages are full-bleed; the paper edge appears only while pages turn.
- **Kit of shapes**: numbered rounded numeral; quantity box (rounded rectangle, letter badge, part picture, "2×"); part-inventory cell with a 6-digit code; dotted travel line + block arrowhead; zoom circle with a connecting line; person pictogram (solid ink, round limbs); "do not" circle-slash in red; check mark in the accent.
- **Line weights stay constant** when a zoom circle magnifies the drawing: the inner view is the same drawing at 3x with outlines compensated, so the zoom shows detail, not fat lines.
- Nothing is photographic, glossy or hand-drawn. No characters with faces.

## 3. Colour
- **Ground** paper `#f6f3ec`, backdrop while turning `#dcd7ca`. **Ink** `#1d1f24` for outlines, numerals and pictograms.
- **One accent for motion**: signal blue `#1f6bff` is for dotted lines, arrowheads, snap rings, rotation arrows and check marks. Nothing static is blue except the numeral's underline and the tick badges.
- **Parts use a restrained, material-based palette** (wood `#e2b27c`, steel `#bcc4cd`, dark plastic `#515862`, ceramic `#fbf8f1`, glass tint) and keep their colour on every page: a part's identity is its colour and silhouette, never changed between steps.
- **Warning red** `#e5372b` only for "do not" marks. Never red for an ordinary part, never blue for a part.
- Never put the accent on a part, or two accents on one page.

## 4. Type
- **Hanken Grotesk** (OFL), a clean grotesque, for part codes, captions and any word the page needs. **Nunito ExtraBold** (OFL), rounded, for step numerals, quantities and page numbers. Numerals are about 280-300 px high on a step page; quantities 54 px; codes 26 px.
- The manual is wordless by nature: a page carries a numeral, quantities and codes, not sentences. Any spoken line is captioned in a white pill at the bottom, kept clear of the drawing.
- Hold a numeral or quantity at least (characters / 15 + 1.5) s; a page is never shorter than 4.8 s.

## 5. Motion
- **Everything is on the tempo grid.** Page starts sit on bar lines; the numeral pops on beat 1; the quantity box on beat 2; a part lands on a beat and the click is on that frame.
- **The flight**: the dotted line draws first (0.35 s), the part hovers, then flies 0.3-0.6 s with ease-in (it accelerates into the join) or ease-in-out for slides, and **stops dead: no overshoot, no bounce**. At the snap a thin blue ring opens and fades (0.35 s).
- **Page turn**: the new page slides in from the right over the old one in 0.55 s (ease-out), a soft shadow on its edge; the old page moves 12 % left and dims. It is the only transition.
- **Zoom circle**: a thin ring appears on the spot, then a circle grows out of it while travelling to its resting place (0.5 s); a line keeps them joined. It closes the same way.
- **Turning is stepped**: a screw or knob turns in ratchet steps with a click each, then a final, brighter click.
- At most three things move at once.

## 6. Camera grammar
The page is locked. The only "lens" is the zoom circle (a clipped, magnified redraw of the same drawing), and the only "cut" is the page slide. No push-ins, no pans, no shake. Keep layout 60 px inside the frame.

## 7. Sound palette
- **Foley is small and dry**: plastic or wood clicks for snaps, a tighter higher click per ratchet step, a pop for numerals, boxes and zoom circles (and its reverse when a circle closes), a low thud for a stamped "do not", a soft paper whoosh for page turns (starting 0.1 s early), a wood slide for sliding parts, a water plink for a drop.
- **Score**: a gentle, original loop: a soft marimba arpeggio in a major pentatonic key (C), a round bass note per bar with 2nd and 3rd harmonics, brushed shaker on eighths once the work gets going. 90-110 BPM. Thin it to bass only before the end, and let it stop.
- **Silence is the payoff**: leave the page quiet after the last click, then let one drop be the first sound back. The narration, if any, is calm and short, one line per page.

## 8. Native moves
- **Dotted line becomes a solid join**: a part flies the dotted line and snaps; use it for every step.
- **Exploded cover**: the finished object as a hovering stack of parts joined by dotted lines; the film's last page can be the same composition, assembled.
- **Zoom circle on a click**: when a detail decides whether the step worked (a screw, a knob, a gap).
- **Parts page**: a grid of cells with letter, picture, code and quantity, ticked in the order the narration counts them.
- **The person pictogram**: for "hold this", "two people", "careful".
- **The crossed-out mistake**: show the wrong way, circle-slashed, before the right way.
- **Progress dots**: five check marks at the end that read as "every page done".

## 9. Pitfalls
- **More than one action per page.** Split it, or the viewer cannot tell what the arrow means.
- **A part that changes identity** (colour, size, orientation) between pages. Draw each part once and reuse it.
- **Arrows crossing text or other parts.** Put the arrowhead in free space beside or above the landing spot and fade the arrow once the part has landed.
- **Lines that get fat in the zoom circle.** Divide the line width by the zoom.
- **A zoom circle that hides the thing it magnifies**, or sits on the arrow. Park it in the empty side of the page.
- **Overshoot and bounce**: a part that bounces looks like a toy, not hardware.
- **Real brands, logos, part numbers or layouts.** Invent everything.
- **Captions over the base or the footer.** Keep the bottom 120 px for them.

## 10. Range of variation
Any physical or procedural how-to works: flat-pack furniture, a camera rig, a recipe (ingredients are the parts page, quantities are grams), a workout (poses replace parts, the person pictogram carries the page), a craft, a safety drill. The palette can change its material colours and its single accent; the paper can be warmer or cooler; the page can be landscape or portrait. It stops being this style when the drawing turns perspective or shaded-3D, when more than one thing moves, or when sentences replace pictures.

[Demo](DEMO.md)
