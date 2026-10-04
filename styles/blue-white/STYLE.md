# Blue-and-White Porcelain — Style Prompt

> Cobalt painted under a thick clear glaze on white porcelain: every image is a graded blue wash laid by a brush onto a turning vessel, and the glaze makes it deep, wet and lustrous. The world is a vessel; scenes live on its curved skin.
> References (grammar only): Chinese Yuan-to-Qing blue-and-white ware (band layout, lotus scroll, wave and ruyi borders, the "heaped-and-piled" dark pooling); Jingdezhen painters' wash technique (outline first, then graded fill); studio photography of glazed ceramics (softbox highlights on a dark ground). Copy no existing vessel, inscription, reign mark or museum piece, and never name them in the film.

## 1. Essence, and what it is not

- **Cobalt under glaze.** Every mark is blue on white, graded from a pale wash to a deep, almost black blue. No second hue in the painting.
- **Outline, then fill.** A thin dark line draws the form; a broad hatched wash with pooled edges fills it. Light areas are bare white glaze.
- **Glaze is a layer above the painting**: soft bleed at edges, slight parallax at grazing angles, softbox highlights sliding over the blue.
- **The ground is a vessel** (vase, plate, bowl, jar) on a wheel, so painting wraps, foreshortens and distorts as it turns.
- **Made by the brush:** motifs appear stroke by stroke, in a painter's order.

Not Chinese ink wash (paper, black, no glaze), not ukiyo-e (flat woodblock colour), not stained glass (light passes through; here it reflects), not a flat "blue pattern" filter: vessel, wash and glaze must all be present.

## 2. Materials & rendering

- **Painting is a data texture** rasterised by code: R = wash pigment (additive, so overlaps pool), G = line pigment (denser per unit), B = wet sheen of fresh strokes. A stroke is soft dabs along a pressure curve (width and density per point, tapered ends) plus bristle streaks. A wash is hatch strokes clipped to a shape, graded along an axis, edge-pooled, two passes.
- **Mapping:** walls by angle × arc length; flat wells (plate centre, bowl medallion) by planar projection. Texel density is fixed from the belly circumference (≥ 4096 texels around) so macros keep painted detail.
- **Cobalt ramp** from density: white → pale grey-blue → sky → cobalt → sapphire → near black. Above half density the blue is "heaped and piled": dark blotches with a faint warm-brown iron halo and a fine black speckle; pigment load varies by low-frequency noise.
- **Glaze shading:** wrapped diffuse from one soft key above left and a cool fill; Fresnel reflection of a studio (tall softbox left, thin cool strip right, top bar) with soft-edged highlights; gentle orange-peel normals. Body colour: bluish white when fresh, warm ivory when aged, celadon where it pools (foot, concavities).
- **Crackle:** 3D Worley edges in object space, so it stays on the vessel as it turns: faint grey when fresh, tea-brown on white and blue-black over cobalt when aged; it breaks highlights.
- **Details:** grainy bare biscuit foot ring; iron-brown lip that wears with age; interior darkening with depth; contact shadow and faint mirrored reflection on a dark ground.
- **World vs screen:** painting, crackle, speckle and tint belong to the vessel; highlights belong to the studio; vignette and subtitle plate are screen space.

## 3. Colour logic

- **One pigment.** Painting is cobalt only. Warmth comes from glaze (ivory), biscuit (buff, iron-red) and the brass-and-bamboo brush; the room is dark.
- **Value is the drawing.** White glaze is the highlight; the focal motif has the deepest blue; borders and distance are paler. Far mountains pale, foreground rocks and pines dark and pooled.
- **Dark, quiet ground** (blue-black slate) so white reads. Pale grounds only for a title or world-scale shot.
- **Before firing, cobalt is dull grey-black on chalk**; after, vivid blue. A film may use that as its turn.
- Example palette (not a rule): glaze `#F1F3F1`, ivory `#E6DDC7`, wash `#8FB0DC`, cobalt `#2F55A8`, sapphire `#14296B`, pooled `#06103A`, ground `#171A21`, biscuit `#D9B79A`.

## 4. Type & subtitles

- **Subtitles are a porcelain label**: a small white-glaze plaque with a soft highlight, double cobalt rule, a dot at each end, deep-blue lettering. Latin in Cormorant Garamond 600 (OFL), 36–44 px at 1080p, one line, centred low, clear of the focal motif.
- **Titles and inscriptions are painted** on the vessel in brush calligraphy, written in reading order (columns top to bottom) with the same pooling; never a font drawn flat over the film.
- **Chinese type** (OFL, subset to the characters used, per TECHNIQUE §11): Ma Shan Zheng for calligraphy painted on vessels (≥ 120 texels per character), Noto Serif SC SemiBold for plaques and captions. Seal-like marks are original (a square frame of short strokes); never imitate a real reign mark, studio mark or artist's seal.
- Reading time: hold ≥ max(1.8 s, speech + 0.6 s). A plaque rises from the ground edge and sinks back.

## 5. Motion quality

- **24 fps, on ones.** The vessel turns with ease in and out; the brush is eased along each stroke.
- **A stroke has three phases:** the loaded tip lands, the stroke swells and tapers, the tip lifts with a small flick. Fresh blue is darker and shinier for about a second.
- **Painter's order is choreography:** rings first (the vessel spins under a still brush), then borders, then the main motif (vine, leaves, flowers), outline before fill, inscription last.
- **The vessel follows the brush:** it turns the painting spot to the front, with lag, then drifts.
- **Never moves:** laid paint (except wet to dry), crackle, studio highlights. Nothing glows.

## 6. Camera grammar

A product photographer's camera: long lens (about 22° field of view), low-to-medium elevation, dark ground.

| Move | What it expresses | Can serve |
|---|---|---|
| Locked hero, vessel turning | the object itself | a title; a finished piece |
| Orbit following the brush | the making | a process; a story told around the vessel |
| Macro glide over the glaze | pigment, pooling, crackle | a material close-up; age |
| Push-in to a rim or well | falling into the painting | entering a story world; a reveal |
| Top-down on a plate | a scene seen whole | a map; a landscape; a list in a circle |
| Pull-back to a shelf | one among many | a collection; a series |

At key moments the vessel or motif fills ≥ 1/3 of frame height; the brush tip stays in frame while painting; subtitles stay off the motif. Transitions are ceramic: through a rim into a painted world, a turn that swaps vessels, shards reassembling into the next form. No default fades.

## 7. Sound palette

- **Music:** guqin and pipa (plucked, with slides), bamboo dizi or xiao, a small frame drum, a low struck bowl; sparse, pentatonic. No synth pads or cinematic strings.
- **Foley:** brush on biscuit (dry whisper, pitch rising with speed), a wet stroke (damp swish), the wheel (low hum, a faint click per turn), a fingernail tap on glaze (bright ping), a bowl set down, kiln roar and tick as it cools, shards (small glass chimes).
- **Ambience:** quiet workshop, water dripping into a basin, distant birds.
- **Silence** before the first brush touch and before the kiln door opens; the first sound after is a tap on glaze.
- **Mix:** music ducks ~5 dB under voice, ~3 dB under key foley; −14 LUFS; grain ≤ 2. **Voice:** calm, close, few lines on stroke beats.

## 8. Native moves

- **Painted onto the turning vessel.** The brush draws while the vase spins and the motif wraps. *Fits:* a timeline once round a jar; recipes on a tea set; a poem down a vase.
- **Through the rim into the painting.** The camera pushes through a rim or well and the landscape becomes the world. *Fits:* introducing a place; a memory; a product's origin.
- **The fire.** Grey-black strokes bloom to blue and the glaze turns glossy. *Fits:* a result after waiting; before and after; a promise kept.
- **Kiln-fresh to aged.** Glaze warms to ivory, crackle appears, the lip browns. *Fits:* a heritage brand; an heirloom; time passing.
- **Shards reassemble.** A vessel breaks and flies back into the next form. *Fits:* a repair; a scene change; a rebuilt place.
- **Macro of the heaped-and-piled blue.** Glide over blotches, speckle and crackle. *Fits:* craft detail; a texture lesson; a quiet interlude.

## 9. Pitfalls of the medium

- **Flat blue vector art:** fills without hatching, pooling or bleed look like a sticker. Every wash needs stroke direction, uneven load and a pooled edge.
- **Glaze as a plain gloss pass:** add parallax and bleed under the coat, crackle, orange-peel normals, Fresnel at the silhouette.
- **Broad bright highlights** bury pale washes: narrow softboxes, soft edges, diffuse white below clipping.
- **Stretched textures on necks and shoulders:** author for the belly, simplify on the shoulder, keep text off steep slopes.
- **Doubled washes where petals overlap:** paint the back first and stop each wash at the shapes in front.
- **Floating brush:** project the surface point through the same camera and give it a contact shadow.
- **A real reign mark, inscription or museum piece:** never.

## 10. Engine

In `demo/engine/`: `vessel.js` (`buildVessel('meiping'|'guan'|'bowl'|'plate')`: profile → lathe mesh, `surfaceAt`, `vAtY`; matrix kit `M`), `cobalt.js` (`Paint`: `render(t)`, `tip(t)`, `fit`, `retime`; `Pen`: `stroke`, `line`, `wash`, `dot`, `occlude`), `glaze.js` (`Glaze.render({items: [{vessel, wrap, disc, model, fire, age, heat, crack}], cam, ground})`, `project`; textures upload only when a painting changes), `motifs.js` (lotus, leaf, curls, rings, petal panels, ruyi collar, waves, meander, calligraphy strokes, seal-like mark, the vase), `landscape.js` (mountains, pines, rocks, bamboo, boats, birds, plate, jar, bowl). `film.js` is one timeline: `node core/render/still.mjs styles/blue-white/demo <t>`. Minimal use: `const p = new Paint(4096, 2500); const pen = new Pen(p, 0, 500, 1); pen.line([[300,900],[900,600],[1500,900]], {w: 10}); pen.wash(poly, {angle: 0, dens: [.5, .2]});` then `glaze.render({vessel, wrap: p.render(3), …})`.

## 11. Variation space

You decide the subject, vessel, band order, motif (lotus, waves, bamboo, landscape, your own), ground, glaze age and camera. All far from our demo:

- Structures: **a river around one jar** (source, village, sea, one turn per chapter); **a tea set telling a day** (cup, pot, saucer, each a scene); **a broken plate repaired** (shards, rebuilt, aged).
- Openings: **a bare white bowl turning in silence** until the first touch; **a kiln door opening** on rows of vessels; **a plate from above** crossed by one stroke.
- Endings: **the fired vessel set on a shelf among others**; **pull-back from the plate through a window into a street**; **the brush lifts and the last line of an inscription dries**.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
