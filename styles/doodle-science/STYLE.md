# Doodle Science Explainer · 手绘科普体

> A cartoon explainer drawn on warm paper: a wobbling ink line, transparent colour dropped just off the line, a friendly guide who talks to the viewer, and an answer that is drawn page by page while it is spoken.
> References (grammar only):
> - Chinese short-video knowledge channels in the "draw it for you" format: a hook question, a talking guide, a subject drawn as a character with a face, one long take that fills with drawings, a question that turns the story, a one-line payoff.
> - Pen-and-wash cartoons and children's science books: black fineliner, flat watercolour, hand lettering.
> - Chat-room "comment" overlays: single words drifting across the picture.
>
> Nothing is copied from these: no characters, layouts, scripts or type.

## 1. What it is

A lesson drawn live on a sheet of cream paper. Every object is a doodle with an ink outline that wobbles and a thin wash of colour that sits slightly off it. Ideas that cannot be seen (light, heat, gravity, an argument) are drawn as small characters with faces, so a diagram has actors. A guide character, a different one in every film, talks to the viewer in short sentences and reacts. You recognise the style in one frame by three things: the paper, the off-register colour on a hand-drawn line, and a thick outlined caption at the bottom.

Not Whiteboard Explainer (no marker, no white board), not Urban Sketch (no place, no reportage: a cartoon cast, not a view) and not Crayon Picture Book (the line is fine and inked, the colour is transparent, the pictures explain something).

## 2. Look

- **Paper**: warm cream (about `#f4efe4`) with two scales of mottling and a fine tooth multiplied over everything, and a faint darker edge. The page is never white and never replaced by a flat colour; a whole scene sits on the same paper.
- **Ink**: one near-black warm colour (`#2b2622`) for every outline. Lines wobble by a pixel or two, vary in width (thick in the middle, tapered at the ends), and **boil**: the wobble is re-seeded 12 times a second on anything alive. They **draw on** from one end in stroke order; nothing outline-shaped just appears.
- **Wash**: transparent colour (multiply, alpha 0.5 to 0.8) in a blob that is **offset a few pixels from the line**, has a slightly darker dried rim and a second, smaller, shifted layer inside. Colour **blooms** from the centre of its shape after the line is drawn. Solid fills are allowed only for black hair, white speech bubbles, clouds and the white of an eye.
- **Cast**: a guide with a round head, two or three simple features, a plain sweater and one little emblem; and every non-human subject as an animated doodle with dot eyes and a mouth: the sun, a molecule, a drop, a photon. They bob, blink and react. Faces are always minimal: dots, one curve, rosy cheeks.
- **Charts** are hand-drawn: bars are washes in the spectrum or a few flat colours, the curve is an ink line over them, the axis is one stroke, arrows are curved and have two-stroke heads. Data shown is shape, not measurement, unless the film says it is measured.
- **Never**: gradients as fills, crisp vector edges, drop shadows, stock images, photographs, perfectly straight or perfectly round lines, or colour inside a shape that has no outline.

## 3. Colour

- **Paper** is the brightest value and the ground of every frame. **Ink** is one colour and never changes.
- **Palette of washes**: a few pigments mixed on the page: sky blue, leaf green, sun yellow, warm orange, red, violet, teal for clothes, skin tone, black for hair. Saturation stays moderate because the paper is warm and washes multiply into it.
- **Roles**: one colour per idea for the whole film (here blue light = blue, red light = red, violet = the odd one out). Colour carries the explanation; do not recolour a character between pages.
- **Mood by wash**: a big soft wash behind a page sets the weather (a blue sky at the start, an orange evening at the end). It is a low-alpha shape with an irregular edge, never a full-bleed fill.

## 4. Type

- **Captions**: a thick, rounded display face (ZCOOL QingKe HuangYou or similar OFL face) in ink with a **paper-white outline** about a quarter of the cap height thick, centred in the lower margin, one sentence at a time in step with the voice, two lines at most, cut at the punctuation nearest the middle, shrunk (not wrapped a third time) when still too wide.
- **Titles and big words**: the same face at 130 to 170 px on a 1080-wide page, with the outline, written on from left to right. The question the film answers is a title.
- **Labels**: a handwritten face (Ma Shan Zheng or similar OFL brush hand), 44 to 60 px, written on from left to right next to the thing they name, in the colour of the idea.
- **Comments**: single words in the hand face, dark grey, drifting across the picture for colour (a hook, a quip); they are decoration, not information.
- Reading-time rule applies to labels and titles (CJK 4.5 characters per second plus padding). Voice-synced captions follow the speech and are exempt: say so in the film's notes.

## 5. Motion

- A scene is a **page that fills up**: the camera does not move; things are added as they are talked about, each drawn on over 0.5 to 1.5 s, then colour blooms.
- **Easing**: draw-on and bloom use smoothstep; pop-in characters overshoot slightly. Float and bob are sinusoids with different phases per object, never a loop that visibly repeats within a scene.
- **Characters boil** at 12 fps; the paper does not. The guide's mouth opens and closes while the voice speaks and shuts in silence.
- **Travellers** (photons, balls, arrows of influence) move in straight lines or deliberate bounces, with a short tail; a repeated trip is a loop with a phase offset per traveller so they never move in lockstep.
- **Page change** is a paper-coloured band with an ink edge sweeping across, carrying the next page behind its edge. Nothing dissolves.

## 6. Camera grammar

Locked. The picture is a page, so there is no zoom, pan or shake; the sense of motion comes from the drawing and the characters. If a film needs to show more than one page can hold, it changes the page (a sweep) rather than moving a camera. Scale emphasis is done by drawing the thing bigger or by a stamp that slams in.

| Move | What it expresses |
|---|---|
| Fill the page | the explanation building up, one drawn idea per spoken sentence |
| Sweep to the next page | a new question or condition |
| Stamp | the verdict or the answer, rotated a few degrees with a hard overshoot |
| Guide enters bigger | the turn: the guide fills the page when the story needs a question |

## 7. Sound palette

- **Music**: bright and small: a marimba figure on a pentatonic scale, plucked bass, a shaker on the eighths; major key, 100 to 115 BPM; it thickens over the first eight bars and **ducks under the voice** by about 6 dB.
- **Voice**: one friendly narrator, close and even, compressed, 10 dB above the music; every line checked back with speech-to-text.
- **Foley**: pen scratch while a line is drawn (band-passed noise, bursts that follow the stroke), a soft pop when a character appears, a springy boing for a bounce, a bell for a key point, a stamp thump with two bright notes for the verdict, a whoosh on each page change, a sparkle run for a big reveal.
- **Silence** is not used; this style keeps talking.

## 8. Native moves

- **Hook, then promise**: a question to the viewer, then "don't swipe away, I'll draw it for you", while the guide gestures.
- **Subject with a face**: the thing being explained is drawn as a character (an air molecule, a wave, a number) so it can react to what happens to it.
- **Two actors, two behaviours**: show a rule as two characters behaving differently in the same space (one bounces, one goes straight through).
- **Turn by question**: the guide asks the question the viewer is about to ask, in a speech bubble, which sets up the second half.
- **Charts as sketches**: a small hand-drawn plot beside a heading with a circled number, one per reason.
- **Stamp the answer**: a rotated white card with a thick outline and the answer in big type.
- **Payoff page**: the same actors in a changed condition (the evening sky) show that the rule explains a second thing.

## 9. Pitfalls

- **A flat wash that looks like a vector shape**: keep the offset, the rim and the second layer, and let big washes have irregular edges. Scaling a wash polygon about its centre while it blooms looks like a stamped rectangle if the polygon is clipped; build it from a smooth closed spline.
- **A mottled-paper multiply that darkens the page**: noise tiles must be centred near white (about 245 to 250), not mid-grey.
- **Pen lines that look like a ruler**: add the slow wobble, vary the width, taper the ends; never draw a long line as a single segment.
- **The guide's face goes blank** when the mouth is only a curve: switch to an open ellipse while speaking.
- **Text hidden under a drawing**: captions are drawn last, on top, with the paper outline.
- **Charts that invent data**: label what is a sketch. A curve that looks like measurement will be read as measurement.
- **Portrait versus landscape**: one page layout does not fit both. Lay out each aspect on its own (the demo does) and keep the voice, timing and score identical.
- **The drawing outruns the voice**: draw on for at most 1.5 s per object and add objects at the sentence that names them.

## 10. Range of variation

You choose the topic, the guide (looks, clothes, emblem), the subject characters, the colour roles, the number of pages (three to seven), the voice, the music colour and the length (45 to 90 s). The hook can be a question, a claim to disprove or an object in a close-up that gets drawn; the payoff can be a second case, a surprising number or a call to look at something in the real world.

Far from our demo:
- A history "why" (why did a city sit on a river?) with maps drawn on the paper and a guide who is an old map-maker; the subject characters are towns that hold hands.
- A body explainer (why do we yawn?) where organs are characters in an office and the colour roles are the signals.
- A kitchen-science film where the guide is a cook and the page is a recipe card: ingredients with faces, chart = temperature curve.

---

How our demo was made (story, pages, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
