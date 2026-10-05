# Corrugated Cardboard Craft — Style Prompt

> The world is built by hand from corrugated board on a cutting mat under one warm desk lamp: thick cut-outs whose edges show the wave between two liners, joined with tabs and slots, tape, staples and hot glue, labelled with marker. It moves like stop-motion on twos, with small handmade irregularities.
> References (grammar only): maker and prototyping videos shot at desk height; stop-motion craft shorts (place, wait, react); flat-pack assembly sheets (numbered steps, tab and slot). Never copy a maker's build, a brand's carton, or a published jingle, and never name them in the film.

## 1. Essence, and what it is not

- **The cut edge is the signature.** Every board edge that crosses the flutes shows the profile: outer liner, a sine-wave medium, inner liner, the hollow dark between. Thickness is real (4 mm is exaggerated to read), never a stroke or an outline.
- **Brown, ridged, taped.** Kraft brown outside, a paler liner inside; faint flute ridges print through the faces; tape (cream masking, tan packing), marker lettering, hot-glue blobs and craft-knife lines are the only other marks.
- **A cutting mat and one lamp.** A dark green self-healing mat with a pale grid, a steel rule, a knife, offcuts; one warm key from the front-left, soft shadows, a glint on steel and tin.
- **Handmade, on twos.** Objects step at 12 drawings a second with a few hundredths of a centimetre of wobble each drawing; camera and lamp stay smooth.

Not paper-popup (thin coloured card, no thickness, no tape), not origami (one sheet, no knife, no glue), not brick-toy (moulded plastic with studs). If the frame has no visible flute edge and no tape or marker, it is not this style.

## 2. Materials & rendering

- **Geometry.** Boards are triangulated polygons (holes allowed) extruded to a real thickness; a board that bends is a strip subdivided along its span, with its section kept perpendicular to the centre line. Hinged pieces are nested pivot groups; valley folds on the face that ends inside.
- **Flute profile as texture on real side walls.** Side walls get a tileable profile texture (one wave per tile, `u` = position across the flutes in pitches). Edges that cross the flutes use it; edges that run along the flutes use a plain three-band texture. Flutes run along the fold lines and along a bridge's span.
- **Faces.** Seeded canvas textures: base kraft colour, tileable value noise, short fibre strokes, dark flecks, soft bands one pitch wide (colour and bump) so the ridges print through. Outer face darker, inner face paler.
- **Tape and decals.** Tape is a strip following a 3D path (wraps corners, lifted a hair off the surface, torn ends for masking, gloss for packing), drawn on progressively. Marker text is a canvas decal repainted from a single-stroke alphabet with per-glyph wobble; hide every decal that is not in use (a blank transparent plane still disturbs the depth pass).
- **Light.** One warm spot with a wide penumbra and a large soft shadow map, a cool weak fill, a dim studio environment, neutral tone mapping (ACES shifts kraft colours), ambient occlusion with a centimetre radius, physical depth of field, 2x supersampling so the ridges do not shimmer. Macro shots add a non-shadowing fill.
- **Screen space vs world.** Boards, tape, lettering are world objects; vignette is screen space; subtitles are a 2D layer drawn as tape.

## 3. Colour logic

- **Browns do the work**: 2–3 kraft tones (outer, inner, medium) plus cream for tape and labels. The mat is the one cool field (dark green); it must never take the hue of the board.
- **One accent**, reserved for the load or the answer (a red-orange tin, red marker). Ink is a deep blue-black, never pure black; whites are cream.
- **Value order**: cut edges and tape are the lightest and darkest things next to each other, so the flute reads; faces sit in the middle.
- **Never coloured**: the flute medium (always paler than the liners), the glue (cream, translucent), steel (grey).
- Example palette (not a rule): outer kraft `#8c6a43`, inner `#b39468`, medium `#d9b27a`, masking `#e6d6a8`, mat `#2c5a4b`, ink `#1d2733`, accent `#c2412c`.

## 4. Type & subtitles

- **Typeface**: Caveat Bold (OFL), a marker hand, for subtitles, labels and tags; Barlow Medium (OFL) only for rule and mat graduations. Hand-lettering may also come from a single-stroke alphabet written stroke by stroke.
- **Subtitles are strips of masking tape on the lens**: cream, torn ends, a hairline shadow, 52–60 px at 1080p, low and centred, a degree off level, stepping on twos. Hold ≥ max(1.8 s, speech + 0.6 s) and ≥ characters ÷ 15 + 1.5 s.
- **Labels are tape flags and tags** stuck to the thing they name, written when the line is spoken, never a font flat over the film. Titles, if any, are marker on tape or board and hold ≥ 4 s.
- Chinese: an OFL bold sans or brush face subset to the characters used (TECHNIQUE §11), ≥ 56 px, on the same strip.

## 5. Motion quality

- **24 fps output, objects on twos.** A moving piece holds each pose two frames; the camera and lamp never step.
- **Weight.** Pieces lift, travel on an arc and land with a small settle (two drawings of a few millimetres). Thin card sags and snaps; stiff board barely moves; a tin lands once and stays. Nothing squashes or stretches, boards bend only as boards do.
- **Wobble.** Per drawing, a seeded offset of ≈ 0.02–0.05 cm and ≈ 0.2° on moving pieces only; what rests stays dead still.
- **Hinges and joins.** Folds are exact and eased and stop dead on landing. Tape is laid at constant speed and ends with a pat.
- **What never moves**: the mat, the lamp, anything finished and taped.

## 6. Camera grammar

A real lens at desk height: macro, low oblique, top-down for plans, three-quarter for forms.

| Move | What it expresses | Can serve |
|---|---|---|
| Macro push along a line | the exact place something is cut, joined or bent | a cut; a seam; a detail that explains |
| Orbit from top-down to three-quarter | layers, depth, a thing seen from all sides | an exploded stack; an assembly; a reveal |
| Lateral dolly side-on | comparison across a row, deflection | two tests; a timeline laid out in space |
| Locked top-down | a plan, a flat-pack, an instruction sheet | a count; a before/after; reading time |
| Crane down into a fold | a flat becoming a form | assembly; unboxing |
| Pull-up and out | scale, the whole bench | an ending; a summary |

Framing: at key beats the subject fills at least a third of the frame height; the lens sits above any foreground board so the cut edge is never hidden; subtitles sit low on the lens, never over the action. Transitions are made of cardboard: a board panel slides across the lens (leading edge tilted), or a piece lifts out of the flat into the next scene. No dissolves, no wipes that are not board.

## 7. Sound palette

- **Foley carries the film**: knife on steel (dry metallic scrape) and through board (low grainy crunch); corrugated rasp (noise pulsed at the flute rate) for sliding, parting and unfolding; tape rip (comb-pulsed hiss) ending in a pat; felt-marker squeaks, one per stroke; a tin on board (ring plus soft pat); stick-slip creak as board flexes; snap and crumple; tab pressed into slot; hot-glue squelch with tiny string ticks.
- **Music**: small, dry, wooden and hollow: kalimba, marimba, pizzicato bass, knuckle taps and palm booms on empty cartons, a card shaker. Pentatonic or modal, plucked and tapped attacks; no strings or pads except one quiet drone used for tension.
- **Ambience**: a quiet room and a lamp hum under everything. **Silence** before the break and before the proof; the first sound after it is the object (a tin, a crack).
- **Mix**: voice high-passed and compressed, ≈ 10 dB over the music, music ducked under speech; keep 20–120 Hz about 3 dB under the rest; −14 LUFS; grain ≤ 1.5. Voice: calm, plain, a workshop teacher's.

## 8. Native moves

A menu: use the ones your story needs.

- **The knife line that opens the flute.** A blade runs along a steel rule, the piece parts and the profile fills the frame. *Fits content like:* how a material is made; a cutaway of a product; what is inside a wall, a battery or a cake.
- **Exploded layers on one axis.** Liners and wave lift apart in stagger, tape flags label them, they drop back together. *Fits content like:* a software stack; the layers of soil; parts of a pen.
- **Flat-pack to form.** A cross-shaped net on the mat, numbered, folded in order into a tube, tabs pressed through slots. *Fits content like:* an assembly guide; unboxing; a recipe's steps made physical.
- **Tape across the seam.** A strip follows the corners, grows at constant speed and is patted down. *Fits content like:* a repair; sealing a decision; connecting two teams.
- **Marker label written live.** A word appears stroke by stroke with a squeak per stroke. *Fits content like:* a name; a verdict; a score.
- **Parallax diorama.** Offcuts and tape rolls at different depths as the camera pulls up. *Fits content like:* a map; a workspace; an ending that shows scale.
- **Hot-glue string.** A blob spreads, the gun lifts and the string thins until it breaks. *Fits content like:* a quick fix; a bond forming; something that holds by a thread.

## 9. Pitfalls of the medium

- **The key's shadow falls across the cut edge** → macro shots add a non-shadowing fill and the foreground board does not cast.
- **Blank transparent decals ruin the depth pass** (a vertical seam across the frame) → hide every unused decal.
- **Coplanar tape and decals z-fight** → polygon offset, a lift of 0.02 cm, depth write off.
- **Flute texture shimmers at distance** → mipmaps, anisotropy 16, 2x supersampling.
- **Camera inside a foreground board** → keep the lens above any board between it and the cut.
- **Everything perfectly square looks CG** → rotate piers and boxes a degree or two, vary tape lengths, tear the ends.

## 10. Engine

In `demo/engine/` (three.js r170 + Canvas2D): `tex.js` (`faceTextures`, `edgeTextures`, `matTexture`, `tapeTexture`; constants `PITCH`, `TH`, `LINER`), `board.js` (`makeBoard({poly, holes, th, flute, top, bottom})`, `makeBend({L, W, th})` with `.userData.set(yOfS, {sx})`, `rectPoly`), `stroke.js` (`layout`, `drawMarker`, `Decal`), `props.js` (`makeTin`, `makeRule`, `makeKnife`, `makeBox`, `makeTape({pts, wdir, wid, kind})` with `.userData.grow(p)`, `makeWave`, `makeGlue`, `makeGlueGun`, `makeMarker`, `scrapPoly`), `world.js` (`makeWorld`: lamp, mat, desk, camera, post). `demo/timeline.js` holds the beat grid, camera keys, wipes and sound events; `demo/film.js` the per-frame state; `demo/mix.py` the instruments and foley. Minimal example: `scene.add(makeBoard({ poly: rectPoly(-5, -3, 5, 3), flute: 'x' })); scene.add(makeTape({ pts: [[-4, .4, 0], [4, .4, 0]], wid: 2, kind: 'mask' }));`.

## 11. Variation space

You decide the subject, the structure, the objects, the palette within the colour logic, the camera path, the score and the ending. All far from our demo:

- Structures: **a build diary** (numbered steps, each ending on a held model); **a prototype that fails three times** and wins on the fourth; **one flat sheet, several boxes**, each reached through the flat sheet.
- Openings: **a flat-pack lying on the mat**, a hand-lettered "1" appearing; **a stack of identical cartons**, one sliding out; **a tape strip being pulled across the frame** to reveal the scene.
- Endings: **the finished form stands alone** under the lamp; **the model flattens back into its net**, the pattern the last image; **a hand-lettered tag lands** and the camera lifts to the whole bench.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
