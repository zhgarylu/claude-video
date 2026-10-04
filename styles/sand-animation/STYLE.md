# Sand Animation — Style Prompt

> Fine sand on a backlit glass table. The picture is made of grains: poured, scattered, brushed and swiped by fingers, glowing amber-white where sand lies and dark where it has been swept away. Images never cut; each is the same sand moved into the next.
> References (grammar only): live sand-painting performance (a lit glass table, a camera above, pictures that morph without a break); sand-on-glass shorts, where a transformation is the transition; time-lapse of dunes and hourglass streams, for how sand falls and settles. Copy no performer's pictures, no film's imagery, no music, and never name them in the film.

## 1. Essence, and what it is not

- **Grains, not strokes**: every bright area is thousands of visible grains; density is brightness, so a picture is shaded by how thickly the sand lies.
- **Light from beneath**: warm white to amber on near-black glass; soft glow bleeds from dense areas; swept areas are dark.
- **Finger-made edges**: trails are a finger wide (≥ 22 px at 1080p), taper at their ends, have ragged edges with stray grains, and are raked in parallel when sand is dragged.
- **One continuous act**: no cut exists. A scene change is the sand of one picture flowing into the next; the table is never empty.
- **A fixed amount of sand**: grains are conserved, so a compact picture is dense and hot, a sprawling one thin and dim.

Not charcoal (dark marks on paper, erasing, no light), not a line drawing (one-line: one thin ink path; here masses and grain), not neon signage (glass tubes of constant width and flat colour; here no outline is uniform), not a hologram HUD (no UI, no flat additive vector lines).

## 2. Materials & rendering

- **The sand is a particle set, not a texture**: ~380,000 grains with fixed identity for the whole film; each has a position, a weight (log-normal ±36 %) and a target in every picture. Hidden grains rest below the table edge and flow in when needed.
- **Pictures are described, then sampled**: finger strokes (width profile, taper, wobble), heaps (soft ellipses), polygons (fuzzy edge) and clouds; the sampler gives constant areal density, a dense core and sparse tails. Pile noise (~60 and ~20 px) modulates grain weight so heaps look layered.
- **Additive light model**: bilinear-splat grains into a full-res density field → ¼-res mean → blurred at σ ≈ 2, 6.5, 22 (weights ≈ 0.42 : 0.24 : 0.11) as the glow → `e = 0.55·D + glow + lamp`, `L = 1 − exp(−e)` → colour ramp. The glow stays under ~30 % of core energy so grains stay readable.
- **Colour ramp = the sand's warmth**: brown-black → deep amber → gold → warm white (`#FFF7E2`). A faint lamp falloff (centre ~1.4× edge) is the only table feature: no paper, wood, frame or table edge.
- **Stray grains are real**: ≥ 5 % of the set lies across the glass, thicker near the picture; they move with the sand and the camera.
- **No hand is drawn**: the sand's motion shows the finger's work (rakes, ridges, comb-edged fronts). If a hand is wanted, a soft translucent flat shadow layer, composited once; hard dark capsules read as pipes.
- **Screen space only**: final tone curve and film grain (ffmpeg). Everything else is world space.

## 3. Colour logic

- **One lamp, one gel at a time.** Default warm gold-white; a gel may replace it (sunset orange, deep sea blue, moon green, rose). Changing it is a slow crossfade (≥ 4 s) while the sand moves; never a cut, never two gels in a frame.
- **Black is the swept glass**: near-black tinted by the gel, never flat `#000` or grey; nothing is dark-on-light.
- **Value order**: hot core > body (gold) > glow > stray grains > lamp > glass. Sand has no colour of its own; colour comes only from the lamp.
- At most ~12 % of the lit area clips to white; the rest keeps visible grain.

## 4. Type & subtitles

- **Words are sand**: titles and key words are rasterised from a font to a mask and sampled as grains (3–8 k per word), poured or swept in and swept away; never a flat overlay.
- **Captions**: a light serif (Cormorant Garamond Medium, OFL), 40–48 px, warm white ~88 %, in the dark lower fifth, formed by grains that scatter in over ~0.5 s and blow out over ~0.4 s. Hold ≥ max(1.8 s, speech + 0.6 s). Never over the picture's bright mass.
- **Titles in sand**: serif capitals or a soft brush face (OFL), ≥ 140 px so each stroke is ≥ 10 grains across.
- **Chinese type** (OFL, subset to the characters used, per TECHNIQUE §11): captions in Noto Serif SC Medium; titles drawn in sand in Noto Serif SC Black or Ma Shan Zheng (brush), ≥ 160 px, sampled from the glyph mask. Fetch a subset with the Google Fonts `&text=` API (`core/fonts/` has too few glyphs).

## 5. Motion quality

- **24 fps on ones; the sand is a pure function of time** (no state between frames), so any frame renders alone.
- **Hold**: a finished picture is never frozen: grains drift ≤ 1 px, brightness breathes ±10 %.
- **Pour**: a thin stream (≤ 8 px wide) falls from above the frame (`y ∝ p^1.8`), lands, and slides sideways only in the last 20 % of its flight; the heap grows from the base up.
- **Sweep (morph)**: a front crosses the picture along a chosen direction; grains behind it are in the next picture, grains ahead are not. The front is a comb: bands 55–70 px wide lag or lead by up to ~20 % of the sweep. Flights have a perpendicular bulge (≤ 100 px, constant per band, sharp band edges), a slow swirl (20–30 px) sampled at the grain's start so neighbours curl together, a sag of 20–50 px, ≤ 16 px of spray. Smoothstep with ±25 % duration spread per grain so tails lag.
- **Matching**: grain *i* of picture k+1 is matched to grain *i* of picture k by slicing along the sweep direction into ~26 strips and sorting by the perpendicular coordinate within each strip, so neighbours travel together. Random matching makes smoke.
- **Slow and fluid**: a morph 5–8 s, a pour 4–6 s; fast moves are scatters and blow-aways ≤ 1 s.

## 6. Camera grammar

The camera looks straight down at the table; it pushes, pulls and drifts, but the table never rotates.

| Move | What it expresses | Can serve |
|---|---|---|
| Locked, full table | A complete picture, time to read | a reveal; a held image; a caption |
| Slow push into dense sand | Grain, texture, intimacy | a detail; the moment before a change |
| Slow pull back | Scale arriving | a final picture; a landscape resolving |
| Lateral drift with a sweep | The hand's travel, time passing | a journey; a list; months changing |
| Push into the sweep front | Becoming itself | the signature transformation |

Framing: the subject fills ≥ 40 % of frame width or height; bright mass avoids the outer 4 % except in a macro; keep a dark lower band for captions. **Transitions are sand**: a picture sweeps into the next, a pour fills a new heap, a blow-away clears the table. No dissolve, wipe, fade through black or cut.

## 7. Sound palette

- **Sand is the foley**: pour = a soft high hiss narrowing as the heap grows; sweep = a long dry brush swish, brighter at the front, with grain ticks whose density follows the number of moving grains; landing = faint patter; blow-away = a breath.
- **Music**: handpan or hang drum, kalimba, glass harmonica or bowed vibraphone, cello harmonics, breathy bamboo flute, brushed frame drum, singing bowl. Open modes (Dorian, pentatonic); not piano and strings. Long, flowing phrases that follow the morph.
- **Silence**: at least two near-silences (sand only) before the turn and the ending; gate the music including reverb tails; the first sound after silence is a single note or grain.
- **Mix**: music −8 dB under voice; sand follows motion energy; −14 LUFS; light grain in the mux. Voice warm, close, sparse.

## 8. Native moves

- **The pour.** A stream falls and builds a heap that is then shaped. *Fits content like:* a company's first idea; a seed fund; a birth or first day.
- **The morph.** One picture swept into the next, no cut. *Fits content like:* a life in ages; a product's evolution; a food chain; seasons.
- **The swept-dark drawing.** An even lit layer of sand; fingers wipe lines of darkness out of it and the picture appears as absence. *Fits content like:* a portrait emerging; a map being cleared; a lit window at night.
- **The blow-away.** A breath scatters the picture into grains that leave through the edge. *Fits content like:* a loss; the end of a chapter; a clearing before an idea.
- **The lamp changes colour.** The gel crossfades while the sand holds or moves. *Fits content like:* sunrise to night; hot and cold; a change of place.

## 9. Pitfalls of the medium

- **Neon wire**: thin uniform lines with a hot core read as neon or a HUD. Use widths ≥ 22 px, taper both ends (≥ 7 % of length), wobble ±10–20 %, stray grains; build rakes and feathers from overlapping broad strokes.
- **Blown out**: saturated centres make a white blob. Keep `kD` ≈ 0.55, small glow weights, `vis` < 1 for compact pictures (heaps 0.5); judge exposure at a 100 % crop.
- **Soup**: random matching, or a swirl > 40 px, is smoke. Match by strips; keep band structure visible mid-flight.
- **Clean-room black** looks like a render; keep stray grains ≥ 5 %.
- **Hard fills and blunt ends**: a sharp polygon or square stroke start reads as a flat shape; jitter edges ≥ 3 px and taper.
- **Dim sprawl**: a big thin picture is faint; shrink it or raise `vis`.

## 10. Engine

In `demo/`: `sand.js` (`Shape` with `stroke / blob / cloud / poly / place / sample`; `matchTo`, the strip matching; `Sand.at(t)`, every grain's position and weight as a pure function of time, with hold, sweep and pour; `Table.draw`, density, glow and the gel ramps `gold`, `sea`, `sunset`), `shapes.js` (pictures written as sand), `main.js` (pictures, the `trans` table, gel schedule, camera), `index.html`. Tune with the query string (`?kD=0.5&g2=0.3&gel=sea`). A picture not in the demo:

```js
const s = new SAND.Shape('moon'); s.vis = 0.7;
s.blob(960, 520, 230, 230, 1.3, { soft: 0.4 });               // a disc of sand
s.stroke([[620, 760], [960, 800], [1300, 750]], 40, 8, 1, {});  // a finger trail under it
```

## 11. Variation space

You decide the pictures, their order, each sweep's direction, where the sand pours from, the gel (within §3), the camera, the opening and the ending. All far from our demo:

- Structures: **a day as one table** (dawn heap → market → noon → dusk; the lamp is the clock); **a portrait through life** (a face morphing child → adult → elder, ending as a heap); **a map drawn by erasing** (a lit table swept into a coastline, then streets, then one address).
- Openings: **black glass, one grain, then a stream**; **a full lit table swept to a single line**; **settled sand that a breath starts to move**.
- Endings: **the sand drains off the table's edge** into black; **one grain left in the middle**; **the lamp dims and the last picture is its afterglow**.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
