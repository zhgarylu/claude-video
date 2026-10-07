# Era Scroll Walk · 时代长卷 — Style Prompt

> One continuous horizontal scroll that a small character walks through at an even pace. The world around the walker is a chain of "eras", each drawn in the visual language of its own period, and one era gives way to the next through a torn-paper edge that sweeps in from the right. A year plate in the corner keeps count.
> References (grammar only): side-scrolling platform games and long picture scrolls (the world as one strip, a hero who never leaves screen-centre-left); museum timelines and "history of X" explainers (an era label, one object per period); the way printmakers, muralists and painters of every age each invented their own marks. Nothing is copied from these: no characters, artworks, scripts or type.

## 1. Essence, and what it is not

- **One strip, one walker, one pace.** The camera follows a single character at a constant speed. Nothing cuts; the world slides past.
- **Every era is a self-contained mini style**: its own palette, mark-making, ornament, type and sound. A frame from the middle of any era could be mistaken for a different style from this library.
- **The torn edge is the only transition.** A jagged paper edge with fibres and a shadow slides across the screen at the walker's pace; the old era is the sheet, the new one is revealed beneath it.
- **The walker keeps one silhouette and is re-lit by each era** (palette, line weight, pixel size), and always carries a small tag whose icon changes with the era.
- **A year plate** (big year, short caption) in the top-right corner flips as each edge passes it.

Not Webtoon Scroll (that strip is vertical, paged and read by a thumb; here the world is continuous and the viewer rides it), not a slideshow of period pictures (the walker and the edge are one object across all of them), not a side-scroller game (no score, no enemies, no HUD besides the plate).

## 2. Materials & rendering

- **The world** is a strip of era segments laid end to end in world coordinates; the screen shows a window onto it. Each segment is an independent painter function that draws only what is inside its own local x range, in layers with their own parallax (far 0.2 to 0.6, mid 0.8, ground 1.0). Layers are built from tiles chosen by a hash of the tile index, so any frame can be drawn alone and nothing repeats visibly.
- **The compositor** paints the visible eras right to left. Era k is clipped by the torn edge that bounds its right side, so the old era always lies over the new one. Before the clip it throws a soft shadow (stacked offset strokes along the edge); after its content it draws a paper rim (a pale band 20 to 24 px wide with an inner hairline) and loose fibres that stick out past the edge. The edge profile is a deterministic function of y and of the boundary's seed: large swells plus fine tearing.
- **The walker is drawn once per visible era**, inside that era's clip, so where an edge crosses the body the part behind it wears the old look and the part in front the new one.
- **Each era uses the marks of its own medium** (pigment spray, wedge impressions, woodcut hatching, rubricated type, engraved lines, whiplash curves, flat shapes, an LCD grid, flat vector), made procedurally (noise tiles, hash-placed motifs, hatching clipped to shapes), never imported images.
- **Texture is anchored to the world** (it scrolls with its layer); vignette, plate and subtitles live in screen space. Pixel eras draw small and scale up without smoothing; the walker is quantised to the same grid and palette.

## 3. Colour logic

- **Each era owns its palette** and keeps to it: an era may have two inks on paper, four LCD greens, or ten flat pastels, but never borrows another era's hues.
- **The walker's colours are mapped, not redrawn.** A style gives the walker a ramp (luminance to colour), a line colour and weight, a rim colour and optional overrides (scarf, cap) so that the silhouette stays readable against the busiest art. A walker that disappears into its background is a failure of the era, not of the walker.
- **Constant across eras**: the plate, the subtitles and the walker's silhouette.
- **Value order**: the walker is lighter or darker than what is directly behind it, never equal: a light rim on dark eras, a dark line on light ones. Neighbouring eras differ strongly in hue and value so the edge reads at a glance.

## 4. Type & subtitles

- **Plate**: a serif face for the year (Noto Serif SC Bold or similar, 44 to 56 px, shrunk to fit) over a small sans caption (Noto Sans SC Medium, about 23 px). The plate is an object in the world of the style (a cream card with a double rule); it does not change look per era.
- **Subtitles**: sans, 44 px, white on a dark rounded pill at the bottom, voice-synced, two lines at most, hold at least max(1.8 s, speech + 0.6 s).
- **Era type** lives inside the artwork and may be anything (blackletter, vertical brush-style serif, pixel font, rounded 70s sans). It is decoration unless the story needs it read; text that carries information (a message, a date) is held on screen for its reading time and reported to `readcheck`.
- Any inscription readable at full size must be real, correct text.

## 5. Motion quality

- **The walker never changes speed** except at a deliberate stop. The walk cycle is locked to world distance (one cycle per 250 px at 1080p), so the feet never slide. Footsteps land on a fixed half-beat grid.
- **Gags are functions of the walker's world position**, not of time: a prop reacts when the walker's x passes a mark, so any frame can be rendered alone. Anticipation and follow-through come from eased progress over the gag's length in px.
- Arms are solved to targets (a wall, a key, a handset); never snap a pose, blend with progress. Reacting props use a small overshoot or a spring.
- **Particles** at an era change are world-anchored, fan out forward and up for about 1.2 s, and take their shapes from the new era.
- Era art may animate slowly (torch flicker, steam, a drifting cloud) but never competes with the walker.

## 6. Camera grammar

The camera is a rig that rides the walker. Moves are small and motivated.

| Move | What it expresses | Can serve |
|---|---|---|
| Constant track | time passing, a journey | any walk; the default state |
| Push-in on a gag | the one action that matters in this era | a hand reaching, a key tapped, a call made |
| Edge sweep | the world changing | every era change |
| Stop and hold | arrival, a decision | the end of the walk, a payoff |
| Rise into a screen | the walk becomes an object | collecting the walk in a frame, a phone, a window, a page |

Framing rules: the walker fills at least a third of the frame height, stands at screen centre-left (about a third of the width), and nothing important sits between the walker and the right edge in the last second before an edge arrives. Subtitles and the plate keep their corners; art there stays quiet. Allowed transitions: the torn edge only (plus a stop). No fades, no cuts, no wipes.

## 7. Sound palette

- **One tune, many orchestrations.** A single short melody keeps going through the whole film while each era plays it on that period's instruments (drums and bone flute, lyre, plucked zither, organ and harpsichord, struck bells, electric piano, chip lead, soft pad). The tempo is locked to the walk: one footstep per eighth note.
- **Beds**: every era has its own ambience; the next one arrives 1 to 2 s before its edge (a J-cut) and the old one leaves just after.
- **Foley**: every step sounds like the ground under it; the torn edge is a paper rip plus a low thump; every gag has a sound in the era's material.
- **Silence** is a tool: stopping the music and the footsteps for a beat before a payoff makes the next sound the loudest thing in the film.
- Voice: a calm narrator, one short sentence per era, ahead of the edge; the score ducks about 10 dB under it. Loudness −14 LUFS.

## 8. Native moves

- **Edge sweep.** The next era enters from the right as a torn sheet; the walker walks into it; a burst of the new era's particles marks the crossing. *Fits content like:* a city's hundred years, decade by decade; a recipe moving through five cuisines; a company's logo and office through its founding, boom and reinvention.
- **Re-tint through the body.** The walker is cut by the edge and wears the old look behind it and the new look in front. *Fits content like:* a language moving between alphabets; a person growing up through photographs, sketches and renders; a coin passing through the mints of different empires.
- **Stamp behind the walker.** Marks appear on the wall in the walker's wake (writing, prints, footprints), so the world records the walk. *Fits content like:* the history of a trade route with a stamp for every port; a signature collecting visas; a river map gaining names.
- **Message along a wire.** A signal leaves the walker and travels ahead along something in the scene (a wire, a pipe, a rope). *Fits content like:* electricity from power station to socket; a rumour crossing a village; water from mountain spring to tap.
- **Rise into a screen.** At the end, one object from the scene lifts out, fills the frame and shows the whole walk as a grid of thumbnails. *Fits content like:* a camera roll, a museum catalogue, a shelf of albums, a family tree of portraits.

## 9. Pitfalls of the medium

- **Seams.** Two eras whose ground lines or horizons sit at different heights make the edge look like a cut. Keep the walker's ground line the same in every era and let only the sky and the background change.
- **Busy art swallows the walker.** Rim, line weight and value are chosen per era against that era's densest background, not against the demo's.
- **Texture that swims.** Anything that scrolls must be tied to its layer's parallax; screen-space noise on world art makes it slide.
- **Text that scrolls away.** A text the viewer must read cannot sit on a layer that leaves the frame before its reading time; pin it to the walker's frame or give it a long stretch.
- **Eras that are only a colour block.** An era needs at least three layers, one set piece and one gag; count them.
- **Wrong history.** A period look must be right in its details (materials, architecture, script direction); check facts.
- **A gag driven by a timer** breaks when frames render out of order; tie it to the walker's world x.

## 10. Engine

`demo/scroll.js` is the reusable part: `drawWorld(g, {t, wx, eras, zoom})` (compositor, edge, shadow, rim, fibres), `walker(g, o)` (rig and styles), `burst(...)` (era particles), `plate(...)` (year plate), helpers `bake`, `noiseTile`, `texFill`, `hatch`, `blob`, `rr`, `tagCard`, `bell`. An era painter is a plain object (`bg`, `fg`, `pose`, `held`, `token`, `walk`, `burst`, `gags`, `events`); `demo/eras1.js` to `eras3.js` hold nine of them, `demo/timeline.js` the pace, era boundaries, voice-driven schedule and plate texts. See `demo/RECIPE-NOTES.md` for the API and a minimal example that adds a tenth era (a seed catalogue era with a green palette, two layers and one gag).

## 11. Variation space

The agent decides: the subject, the walker's design (always one character, always the same one), the number of eras (6 to 10; depth beats count), each era's period look, the gags, the order of facts, the voice, the instruments, and the ending.

- **Three structures:** a chronology (years on the plate); a geography (places on the plate: a river from source to sea, a city's districts); a growth (ages or stages: a plant, a company, a person).
- **Three openings:** the walker steps into frame while the first era is already drawn; a blank sheet that is torn open by the first edge; the walker already mid-stride under a title written into the first era.
- **Three endings:** a stop at an object that gathers the whole walk into a gallery; the walker walks off the last sheet into the viewer's own screen; the final era is blank paper on which the walker leaves one mark.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
