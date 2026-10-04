# Claymation / Stop-motion — Style Prompt

> Plasticine stop-motion shot on a hand-built miniature set: soft lumpy characters pressed together by hand, fingerprints in every surface, a faint boil in every silhouette, animated on twos under a warm studio lamp.
> References (grammar only): British and Scandinavian plasticine shorts and series (thumb-pressed surfaces, replacement mouths, held poses, small sets with real depth of field); puppet-animation studios that shoot on twos with a smooth moving camera. Copy none of their characters, sets or music, and never name them in the film.

## 1. Essence, and what it is not

A clay world that someone **touched**. One glance should show: soft rounded forms with slightly wrong proportions; fingerprint whorls and thumb dents on the skin; silhouettes that shimmer by a hair from one drawing to the next (boiling); a real-looking miniature set with a visible back and edges; shallow focus and a warm key light with soft shadows.

Characters are lumps with bead or ball eyes, rolled-worm brows, mouths and limbs. Nothing is perfectly round, straight or symmetrical. Faces are simple and held for several drawings.

Not a brick toy (clay deforms: it squashes, stretches, is poked, and becomes other shapes), not a clean 3D render with a "clay filter" (the imperfection is geometry and light, not an overlay), not a felt or paper-cut set (the surface is soft and glossy-waxy, not fibrous or flat), not a tilt-shift miniature of real things.

## 2. Materials & rendering

- **Clay is a 3D object.** Every part is a displaced lump: a high-resolution sphere or superellipsoid (round, boxy-with-soft-edges, cylindrical) stretched to its radii and displaced along the normal by multi-octave noise at the object's own scale (low amplitude, about 3–6 % of the radius, plus a finer layer). Limbs, brows, mouths, coils and cords are rolled worms: a tube along a curve with a radius profile, rounded ends and the same noise. Nothing is a primitive left clean.
- **Surface detail is a world-anchored bump, triplanar in object space**, so it never stretches or slides: fingerprint whorls and loops (one tile holds several prints at random angles), thumb dents, soft pits, hair-thin scratches, and fine grain. Ridge spacing is hand-scale (about one tenth of a small character's radius), strong on the skin, almost absent on eyes, glazed parts and subtitles. A cavity term darkens the dents a little. Sparse dark specks (lint, dust) go in the albedo.
- **Colour is marbled, not flat**: each piece mixes two or three pigment tones through low-frequency noise (the swirl of clay that was never kneaded fully), with a slight value wobble.
- **Shading**: a rough dielectric with a soft waxy sheen (sheen about 0.5, tinted warm), a faint clearcoat for the oily plasticine gloss (0.15–0.3, rough), higher gloss only on glazed, nail or bead parts. A low studio environment gives the sheen something to catch.
- **Light**: one warm soft key from above and to one side (large penumbra, soft contact shadows, no hard black), a coloured rim from the window or practical, a small warm practical (a bulb) in the set, and a cool hemisphere fill. Shadows are always cast on the set. Ambient occlusion in the seams and under every lump. Light and shadows are smooth every frame; they do not boil.
- **The set is hand-built and visibly so**: painted card with brush drags, clay trim pressed on, flour or crumbs as real small objects, a cardboard back and a dark studio floor visible at wide angles. Put a few clearly handmade irregularities in every shot: a wall dot that is a little off, a jar that leans.
- **Lens**: physical depth of field, always shallow (a small set, a macro-ish camera). Focus on the eyes, or the point of contact. Backgrounds fall to soft colour fields. Supersample 2× so the bump and edges do not shimmer.
- **Effects are made of clay too**: flour, steam, water, light rays, tears and sparkles are small clay or powder pieces, rolled strips, or painted card cut-outs, re-seeded per drawing, never a particle haze or a gradient glow.
- Grain is added in post and light. No film-damage look, no lens dirt.

## 3. Colour logic

- **Pigments, not pixels**: five or six clay colours per film, mixed by hand, so every one is slightly muted and slightly warm; one or two saturated "main" pigments for the hero and the props that matter. No pure RGB primaries, no neon, no digital gradient.
- **The set is a quieter chord than the characters**: a deep, cool or earthy painted wall against warm skin tones and a terracotta or wood work surface. The hero is the warmest and lightest thing in frame.
- **Value ordering**: the hero's face has the highest local contrast (dark bead eyes against pale whites); backgrounds are mid-value and soft.
- Reserve a single accent colour (a mustard, a pink) for the thing the story is about.
- Never colour with light alone (no teal-orange grade over everything); colour belongs to the clay, light only warms and cools it. Grade lightly: soft contrast, saturation lifted about 5–10 %.
- Example palette (ours, not a rule): dough cream `#ecd3a0`, terracotta `#b9674b`, deep teal wall `#3f7480`, mustard `#e0a62a`, rose `#e58c86`, sage `#93b08a`, bead ink `#2b2420`.

## 4. Type & subtitles

- A soft, rounded, chunky OFL face (Fredoka or similar; for Chinese a rounded subset such as ZCOOL KuaiLe or a rounded CJK face).
- Type is **clay**: titles are rolled-letter strokes or cut slabs, with a drop shadow and rounded relief; subtitles sit on a **clay plate** (a slab with softly irregular edges, a cool dark colour, letters in cream embossed by a blurred height map). The plate is a physical object but is drawn after the depth of field, so it is always sharp; it never covers the character or the point of contact.
- Letters boil with the same stepping as the characters (re-wobbled on twos) if they animate; static plates stay still.
- Hold every subtitle at least max(1.8 s, speech + 0.6 s); titles at least 4 s.
- **Chinese type** (OFL, subset to the characters used, per TECHNIQUE §11): ZCOOL KuaiLe for the clay-plate subtitles and titles. `core/fonts/` carries only ~200 of its glyphs, so fetch a full subset per film. Keep strokes thick and round; the embossed height map must not fill counters of dense characters, so use ≥ 44 px.

## 5. Motion quality

- **Characters, props and the maker's hand move on twos (12 drawings per second)**; the camera, focus and lights move on ones at 24 fps. A stepped camera reads as lag.
- **Boil**: re-seed the silhouette noise and shift the fine grain a little on every drawing (a few percent of the radius). It must be visible in a strip of consecutive drawings and calm at full speed; never so much that the face swims.
- **Squash and stretch with volume preserved** (scale y down, x and z up by the inverse root); anticipation, overshoot and settle; a held pose is held for 3–8 drawings. Clay can bulge, dent, and re-form: a poke leaves a dent that relaxes over several drawings.
- Faces change by **replacement** (swap in a brow, mouth or eye-lid shape between drawings) as well as by squash. Eyes may blink in 2–3 drawings.
- Weight comes from timing: heavy things ease in slowly and land with a settle; light things hop. No motion blur on twos, no tweened in-betweens on the character, no smooth eases.
- Things appear by being **placed**, pressed on, or popping up in 3–4 drawings; they disappear by squashing away or being pulled off. Never fade.

## 6. Camera grammar

A vocabulary, not a route. Opening and ending come from the topic.

| Move | What it expresses | Can serve |
|---|---|---|
| Eye-level medium on a character, slow push | Empathy, a thought | a worry; a decision; a quiet beat |
| Macro on the contact point, rack focus between two things | Touch, consequence | a poke; a mixing; a small repair |
| Wide of the whole set, slightly above | Where we are; a reveal that it is a handmade set | an intro; the scale of a task; a summing-up |
| Slow lateral track along the counter or street | Time passing, a journey across the set | a list; a night; a walk |
| Low angle, character against a big prop | Smallness, ambition | a challenge; a first day |
| Locked frame, held pose | Reading time, comedy timing | a gag landing; a stillness |
| Pull back through the edge of the set to the studio | The maker revealed | an ending; a hand-off |

Framing: the character fills at least a third of the frame height at key moments; eyes on the upper third; keep the set's edge out of frame unless the shot is the reveal; foreground clay may blur at the frame corners. Cut on actions. Transitions come from the medium: a clay lump or hand sweeps across the lens, a wipe by a pulled card, a squash-and-replace of the same shape into the next scene. No default dissolves.

## 7. Sound palette

- **Instruments**: small, acoustic, slightly clumsy: marimba, glockenspiel, ukulele, toy piano, pizzicato, kalimba, brushed snare or shaker, tuba or bassoon for comedy, clarinet for warmth; a single wordless voice (hum, whistle) is welcome. Played with a rubato that suits twos, not a quantised grid; edited to the picture.
- **Foley** (the matter of the style): soft wet pressing, thumb squelch, clay slap on wood, a squeaky roll of a worm, soft peels and pops when a piece is pulled off, tiny bead clicks for eyes, powdery flour puffs, wood and ceramic ticks on the set, a stop-motion "step" tick on drawing changes (very low) when it helps the pulse.
- **Ambience**: a quiet room tone with one living detail (a clock, a fridge hum, a bird). Studio rooms are close and dry.
- **Silence** is part of the timing: stop the music for held poses and small reactions; the first sound after a silence is the most important one.
- **Voice**: warm, close, unhurried; short lines; if characters speak, voices are naive and slightly nasal, with small mouth replacements; verified with speech-to-text.
- Mix: voice compressed, music ducked about 40 % under it, loudness −14 LUFS.

## 8. Native moves

- **The poke.** A finger (or tool) presses into the clay, the surface dents, relaxes, and the dent carries the fingerprint of the maker. *Fits content like:* a nervous character given courage; a product tested by touch; a first step taken.
- **Morph and replace.** One lump re-forms into another shape across a few drawings, or a face part is swapped for a new one. *Fits content like:* a recipe turning into a meal; a before and after; a character changing mood.
- **Rolling and pressing.** Clay coils are rolled, strips pressed, balls flattened, in front of the camera to build a letter, a path or a thing. *Fits content like:* a list built item by item; a name; a map.
- **The hand of the maker.** A hand enters to fix, move or take something. *Fits content like:* a hand-off; a correction; an ending that shows who is behind it.
- **Boiling the world.** A held shot where only the surface shimmers. *Fits content like:* waiting; fear; a heartbeat.
- **The set reveal.** The camera pulls out past the painted back of the set into the studio. *Fits content like:* a big wish that is a small thing; the end of a story; a year in review.

## 9. Pitfalls of the medium

- **Too clean** (smooth gradient shading, no bump, no noise in the silhouette, no marbling) reads as a plastic toy. Fix: displaced geometry, triplanar bump, marbled pigment, specks.
- **Fingerprints too regular or too strong** read as a fabric or fingerprint stamp. Fix: low amplitude on the face, several prints at random angles, none on eyes and glaze, noise on top.
- **Boil too strong** (the face swims) or **absent** (the clay looks 3D-printed). Fix: a few percent of the radius, grain and silhouette re-seeded together, check a strip of four drawings.
- **Stepped camera or light** reads as lag. Step only the clay.
- **Hard black shadows** or a flat even light kill softness. Fix: wide penumbra, warm fill, a rim, AO.
- **Too deep a focus** makes it look like a CG scene. Shrink the depth of field to the size of the set; check eyes are sharp.
- **A subtitle plate inside the set** (clipped by the counter, blurred by the lens). Draw it after the depth of field.
- **Pose popping**: clay is soft; use squash with preserved volume and replacement parts, not a rig that switches poses in an `if`.
- **Dent geometry that cuts through** a thin part: keep dents shallow relative to the lump radius and recompute normals.
- **A foreground lump eating the frame**: check the props against every camera.

## 10. Engine

Reusable recipes will live in `demo/`: `clay.js` (noise, the fingerprint height texture, the clay material with a triplanar bump, `lump` and `worm` builders with a per-drawing `build(k)` for the boil), `set.js` (painted card wall, clay trim, jars, window, lighting rig with a studio environment), `main.js` (a character built from lumps, the finger, the subtitle plate, shots, stepped drawing index, depth of field through `core/three/post.js`). Minimal start: a single `lump({ r: [1, 1, 1], c1: 0xe8c27a, c2: 0xc58a4a, marble: .7 }, clayMat())` on a card, lit by one warm spot, rendered with `core/render/still.mjs`.

## 11. Variation space

You decide the structure, the characters (a creature, a food, an object, a person, a pair), the room or landscape, the opening, the ending, the camera path, the pace, the score and the palette within the colour logic. All far from our demo:

- Structures: **a procession** (a chain of small creatures each handing something to the next, one clay shape morphing into another at every hand-off); **a recipe built from raw clay** (each ingredient is a lump, the final dish a cross-section); **a chase across a map** pressed into a clay table, ending where it started.
- Openings: **the maker's hands knead the first lump** into the character's shape; **a close-up of one bead eye** that blinks and racks out to the whole set; **a clay title rolled and pressed** letter by letter.
- Endings: **the lights of the studio go off** and only the practical bulb glows on the character; **the camera pulls through the back of the set** to a messy workbench with the next lump waiting; **a thumbprint pressed onto the last frame** as a signature.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
