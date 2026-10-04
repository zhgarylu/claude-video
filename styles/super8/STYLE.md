# Super 8 Home Movie — Style Prompt

> A 1970s family reel projected on a lounge wall: a simple domestic or travel moment, drawn in code and run through a film-emulation pipeline of warm faded dyes, soft focus, halation, grain, weave, light leaks and splices, with a handheld camera that wobbles, whips and hunts focus.
> References (grammar only): ordinary amateur 8 mm family and holiday reels of the 1960s-70s — the unplanned framing, the wave at the lens, the thumb over it, the refocus; Kodachrome-era colour (deep reds, cyan-green water, warm skin); home-movie title cards written with a felt pen. Never reuse real footage, shots or brand packaging.

## 1. Essence, and what it is not

- **A projected reel, 4:3, in a dark room**: a rounded aperture on a dark wall that catches its spill.
- **A stylised but believable world**: rooms, gardens, beaches, cars, flat expressive people, drawn in code (no photos), then *photographed* by the emulation.
- **Colour is warm, faded and punchy at once**: crushed toe, lifted brown blacks, red-orange halation, cyan-green water, a yellowed highlight.
- **The camera is a person**: it drifts, shakes, whips away, hunts for focus, catches a thumb, runs out of film.
- **Titles are hand-written**, on cards, in felt pen.

Not 1920s silent film (that is black-and-white, 4:3 intertitles, engraved ink drawing, a piano). Not a found-footage horror (no VHS tracking, no OSD, no dread: the artefacts here are emulsion and gate, and the mood is affection). Not a sepia filter on clean animation.

## 2. Materials & rendering

- **Two stages.** (1) A **scene canvas** at 960×720 drawn with Canvas 2D from code: flat colour with gradients, painted texture patterns (sand, brick, wood), soft cast shadows, simple joint-solved side-view figures. Low resolution is a feature. (2) A **film pass** (WebGL2) that turns it into a 1440×1080 frame inside 1920×1080.
- **Film pass, in this order**: gate weave and jitter (translation and a hair of rotation, per film frame) → lens (soft: mipmap blur, a little more at the edges, slight red/blue misregistration, focus as one number, horizontal smear for whips) → **halation** (a thresholded wide blur tinted red-orange, added before the curve) → exposure (lamp flicker, **light leaks**, burn flashes added as light) → **film curve** (crushed shadows, shoulder, a matrix that pushes reds, desaturation, lifted warm-brown blacks, yellowed whites) → gate hot spot and warm-dark corners → **print damage** → **grain** → fade → rounded aperture and room spill.
- **Grain** is coarse (cells of 1.5–2 px at 1080p), per film frame, heavier in shadows, a little chroma. Draw it in the pass, not in ffmpeg; mux with grain 0.
- **Print damage** is redrawn each film frame from a seed: dust (1–3 frames), one short hair (≈ 1.5 s) trembling, long broken scratches, a rare soft blotch. White = scraped emulsion, dark = dirt.
- **Splices and starts**: a slip (black frame line sliding through), a 1–3 frame burn flash, a leak from an edge.
- **World-anchored vs screen space**: the scene, its shadows and anything attached to the world move with the camera. Everything the camera *person* causes (the shadow of the filmmaker, a thumb, the shake) is attached to the camera. Grain, dust, weave and vignette are screen space.

## 3. Colour logic

- **One warm cast over everything** (Kodachrome-like), plus **one saturated pair** the scene chooses (typically a red-orange and a cyan-green). Neutral surfaces go yellow-brown; skies stay a little blue so the grade reads as faded, not sepia.
- Blacks inside the frame are lifted to warm brown; only the room is near-black.
- Highlights are cream and bloom red-orange; only burn flashes go warm white.
- Mood by grading: golden hour pushes warmth and halation; a damp morning pulls toward green-blue.

## 4. Type & subtitles

- **Cards are the type**: a cream card on a table, taped or held, written with a felt pen; later cards may be shot over a hand, a table or a page. Hand-lettering is jittered per glyph (rotation, baseline, size), filled and stroked in the same ink with a darker pooled edge, and can be **written on** glyph by glyph. Latin: Caveat Brush for the big word, Reenie Beanie for the small hand (OFL).
- **Date stamp**: a purple rubber stamp in a slab typewriter face (Courier Prime Bold, OFL), double rule, with ink starvation (dropout specks, a faint upper edge), slightly rotated, `DD MON YY`.
- **Chinese type** (OFL, subset to the characters used, per TECHNIQUE §11): hand-written titles in ZCOOL KuaiLe or Ma Shan Zheng (brush-pen) or Long Cang (pen script), 120–190 px for the big word and 70–90 px for the small hand, written on stroke group by stroke group with the same felt-pen fill, stroke and pooled edge; keep CJK heavier than Latin; stamp as `76.8.14` in Courier Prime.
- **Subtitles**: lines on a second card or a strip of masking tape in the same hand, never a font over the picture; hold ≥ max(1.8 s, speech + 0.6 s), title cards ≥ 4 s. Home movies are silent: prefer a few words on a card to a voice.

## 5. Motion quality

- **18 fps, on ones.** World and camera motion are sampled at 18 fps; grain, dust, weave, jitter and lamp flicker are functions of the film-frame index. Render the film at 18 fps (one output frame per film frame), or at 24 fps with every artefact held per film frame (frame = floor(t × 18)).
- **Weave and jitter**: a slow wander (≈ ±2.5 px) plus per-frame jitter (±1.5 px), a hair of rotation, a rare 1-frame perforation jump. Lamp flicker ±3–5 % per frame.
- **Handheld**: a slow drift, a fast tremor, a breath in zoom; pans start late and stop abruptly; a whip pan smears horizontally and lands out of focus.
- **Focus hunts**: out of focus → overshoot → settle, about 1 s; it happens after a whip, a cut or a subject change, never while nothing changed.
- **People** act with a few big gestures (wave, run, dig, point, turn to the lens): anticipation, follow-through, eased keyframes, no pose pops.

## 6. Camera grammar

A vocabulary, not a route. Opening and ending come from the topic.

| Move | What it expresses | Can serve |
|---|---|---|
| Wobbling wide | being there, no plan | a place; an outing |
| Pan after a mover, late and loose | chasing a child, a car, a ball | a journey; a runner; a delivery |
| Whip pan with smear and refocus | “look over there!” | a surprise; a change of subject; a joke |
| Wave at the lens | the subject knows the camera | a greeting; a refusal; a goodbye |
| Camera handed over | a new point of view, bad framing, the floor, a thumb | a child; a role reversal; an inheritance |
| Shadow or reflection of the filmmaker | the person behind the lens | credit; absence; humour |
| Reel runs out | the film is a thing with an end | a memory ending; a cliffhanger; a goodbye |

Framing: subjects fill at least a third of the frame height at key beats; heads can be cut, horizons tilt a little (≤ 2°); text lives on cards, never over the scene. Transitions: straight cut, splice flash and slip, whip, burn-out, a leak that carries one shot into the next. No dissolves, no digital wipes.

## 7. Sound palette

- **The projector is the ambience**: lamp hum, motor whirr, claw ticks at 18 per second, film flutter, a click at splices, a rattle on the take-up reel. Hiss of a cassette or reel-to-reel under everything.
- **Music is a home recording**: a ukulele, music box, detuned upright piano, accordion or harmonica played slightly out of time, on a tape with **wow and flutter** (slow and fast pitch wobble), tape saturation, a roll-off above 6 kHz and a lifted noise floor. Original music only.
- **Foley is sparse**, heard through the same tape; no clean voice.
- **Silence is the projector alone**: music out, hiss and motor remain. The reel end brings a speed-up, a pitch fall, then lamp and take-up flap.
- **Mix**: one band-limited tape chain, glue compression, −14 LUFS.

## 8. Native moves

- **The shadow in the picture.** The filmmaker's shadow falls into frame with the camera in its raised hand. *Fits content like:* a founder behind a product; a teacher in a classroom; a parent at a school play.
- **The splice.** The frame slips, a flash, the next shot is another day. *Fits content like:* a year in a few cuts; before and after a house move; a business's first and tenth shop.
- **Camera handed over.** The picture drops to feet and sky, then frames the filmmaker. *Fits content like:* a child filming a parent; an apprentice taking the lead; a customer's view of a service.
- **Burn-out.** The film sticks, goes white, burns. *Fits content like:* a closing shop; a last day; a goodbye.

## 9. Pitfalls of the medium

- **Too clean**: static grain, one dust pattern repeated, no flicker. Every artefact must differ frame to frame (check three consecutive frames).
- **Halation as fog**: threshold at the highlights only; red-orange, narrow.
- **Sepia**: keep blue sky and cyan water; fade dyes, don't tint brown.
- **Thick hairs**: hairs are short (≈ 100 px), scratches thin and broken.
- **A smooth pan** reads as CG: keep tremor and abrupt stops.
- **Scale chaos**: size people by depth (px per metre ∝ y − horizon).
- **Shadows that double-darken**: draw them opaque on one layer, lay it once.

## 10. Engine

In `demo/engine/`: `film.js` (`Film` WebGL2 pass with uniforms for focus, motion smear, flash, leaks, slip, grade; `mechanics(f)` weave, jitter and lamp per film frame; `damage(ctx, f)` dust, hair, scratches, blotch), `figure.js` (side-view joint rig `person()` with `POSE.walk/run/stand`), `util.js` (drawing helpers and the camera `view()`), `card.js` (`felt()` hand lettering with `wr` write-on, rubber stamp, table), `beach.js`, `street.js` (example worlds). `demo/main.js` shows the shot table, handheld, focus hunt and uniform assembly; stills come from `node core/render/still.mjs styles/super8/demo <t> --q 'shot=beach'` (also `card`, `street`, `golden`). Minimal use: draw any scene to a 960×720 canvas, then `film.draw(src, dmg, post)` with `mechanics(f)` and `damage(dctx, f)`.

## 11. Variation space

You decide the occasion, the people, the places, the cards, the grade per shot, the camera route and the ending. All far from our demo:

- Structures: **a day told in reels** (morning, noon, evening, each its own grade, spliced); **a house through the years** (one room at three Christmases, same camera spot, the child taller); **a trip as postcards** (each stop a card written on, then a short shot, a whip to the next).
- Openings: **a thumb over the lens** sliding off to reveal the scene; **the projector lamp** warming up on a blank wall; **a countdown leader** with the number jittering.
- Endings: **the film burns out** on a face; **a last card addressed to whoever is watching**; **the camera on a table** left running at an empty room, then the tail flap.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
