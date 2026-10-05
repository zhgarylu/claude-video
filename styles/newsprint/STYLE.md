# Letterpress Newspaper — Style Prompt

> Ink on newsprint: a broadsheet front page set in hot metal, with column rules, a masthead, big condensed headlines, justified columns, halftone-dot photographs, stamps, and pages that stack as editions.
> References (grammar only): twentieth-century broadsheet front pages and newsreel inserts (headline swaps, spinning pages, stop-press bulletins) for hierarchy and pace; hand-set letterpress and the Linotype for how type is made; wire tickers and telex tape. Never copy a real masthead, headline, photograph, advertisement or typeface design, never name a real paper, person or firm in the film.

## 1. Essence, and what it is not

- **A page of type under ink**: warm grey newsprint, one black ink, hairline and heavy rules, justified columns of small serif text, one dominant headline.
- **Ranked hierarchy**: masthead, banner headline, deck, photograph with a cutline, columns, small heads. The eye lands on the headline first.
- **Halftone photographs**: every picture is a field of round dots on a 45-degree screen, never a continuous-tone image.
- **The type is made of objects**: headlines are set slug by slug, taken out the same way, and pages stack and are dealt out as editions.
- **One spot colour, rare**: a stamp red on stamps and tabs only.

Not a "retro" filter on a modern layout, not a vintage-paper background with a title on it, not a magazine (no colour photographs, no white space for its own sake), not an engraving (that is line work, this is dots and type), not the Halftone Dossier (a case file with grey halftones and redaction; here the unit is the front page and the edition).

## 2. Materials & rendering

- **Paper**: a pre-rendered texture per page (warm grey-cream base, long vertical fibres, shives, flecks, darker aged edges, a horizontal fold line). Pages are rectangles on a dark table (brushed steel or slate with fine scratches) with soft drop shadows; a page that is lifted or dropped has a larger, softer shadow.
- **Ink**: near-black with a warm cast (`#1b1814`). Large type is printed with a slight bleed (a thin stroke of the same ink) and a faint blue-grey ghost offset by 1–2 px, as if the plates were misregistered. Fresh impressions are darker for a few frames, then settle.
- **Halftone**: a lattice of round dots rotated 45 degrees, pitch chosen so dots are still seen at the closest camera distance (about 5 px of page per dot at full page size). Dot radius follows darkness, `r = rmax * sqrt(1 - lum)`. Photographs are painted in code as grey-scale and sampled at the dot centres. A second plate, offset by about 1 px, can sit under the first.
- **Slugs**: the metal bodies of the type: steel-grey rectangles with a bevel, the glyph cast in mirror on the face. A slug falls in, the glyph prints on landing.
- **World-anchored**: pages, rules, text, the table and the wire tape live in one world with one camera; shadows and the vignette are screen space.
- **Deterministic**: textures and scatter come from seeded generators; nothing depends on the previous frame.

## 3. Colour logic

- Paper (warm grey-cream, several slightly different stocks), ink (one near-black), the table (a dark neutral), and **one** stamp red.
- Red is reserved for stamps, tabs and their ink spatter; headlines, rules, photographs and body never take it.
- Values are ordered paper > mid-tone > ink; photographs span the full range but never go pure white (paper) or pure black (ink beyond the dots).
- The table is darker than every page so that a page reads as an object.
- Example (not a rule): paper `#d7cfb5`, ink `#1b1814`, red `#c0281d`, table `#292826`.

## 4. Type & subtitles

- **Four voices, all OFL**: a high-contrast display serif for the masthead (Cormorant Garamond Bold, capitals, wide tracking); a heavy old-style serif for headlines, squeezed horizontally to about 78 % for a condensed look (EB Garamond ExtraBold); a rough, inky text face for body copy and cutlines (IM Fell English roman and italic); a slab/typewriter face for datelines, stamps, tickers and wire tape (Courier Prime Bold). No other family.
- **Sizes**: banner headline 150–220 px of page height at full page size (a 1400 × 1900 page), deck 24–30 px italic, body 15–16 px with 19 px leading, datelines 12–14 px, masthead 110–160 px.
- **Columns**: six columns with 22 px gutters, justified text with word spacing (never letter spacing), a drop cap on the lead story, hairline column rules that grow down the page.
- **Headlines**: upper case, a few words, set in one or two lines, flush left on the column grid. A correction or notice may sit in a ruled box and uses the same size as the headline it answers.
- **Subtitles are galley slips**: a strip of proof paper pasted at the foot of the frame, slightly rotated, hairline rules above and below, text in the body face's italic. One cue per sentence, each held at least max(1.8 s, speech + 0.6 s).
- Text that is meant to be read (headlines, decks, cutlines, stamps, wire text) stays fully in frame for letters ÷ 15 + 1.5 s at least. Body copy is texture and may be mis-set, but must still be real, invented sentences.

## 5. Motion quality

- **24 fps, smooth.** The press is a machine: motion is deterministic and weighted, without bounce.
- **Types arrive by falling**: a slug drops from about a headline's height above, accelerating (`t²`), and prints on the frame it lands. Several in a row are paced on a regular grid (a sixteenth or thirty-second of a bar).
- **Types leave by lifting**: the slug re-forms, rises and fades; a faint blind impression stays in the paper.
- **Rules grow** from their centre (horizontal) or from the top (vertical) in about half a second with a smooth ease. **Casting**: justified lines appear top to bottom, a few frames apart.
- **Halftones develop**: dots grow from nothing, darkest areas first, with a per-dot jitter; a photograph can turn into another in place (dots swell or shrink, swept diagonally).
- **Pages** drop with acceleration, land with a very short damped settle, and carry a camera nudge. Pages are dealt out by sliding along the table with a slight tilt.
- **Stamps** strike: scale 1.4 → 1 in 3–4 frames, a hard camera shake that dies in half a second, a spatter of ink dots.
- Nothing eases in from transparency. Things are made, struck, lifted or slid.

## 6. Camera grammar

2D camera over a table (centre, scale, small rotation). Smooth, deliberate; fast moves get motion blur by averaging sub-frames.

| Move | What it expresses | Can serve |
|---|---|---|
| Macro on a few slugs, then pull back | something small becomes a whole page | an opening; a reveal of scale; a first fact |
| Push into the photograph until dots show | looking closely at evidence | a claim being checked; a detail that matters |
| Tilt down off the page to the table | leaving the printed version for the source | a telephone call; a wire; a document trail |
| Whip back to the page, landing on a hit | the news arrives | a stop-press; a reversal; a deadline |
| Pull out to a row of editions | the whole day or history at once | a timeline; a before/after; a series |
| Slow push on a boxed notice | the one thing to remember | a correction; a pull quote; a rule |
| Slow drift along a column | reading | an essay; a list; a decree |

Framing: the headline or photograph fills at least a third of the frame height at its key moment; text that must be read is fully inside the frame. Transitions are made from the medium: a page dropped on a stack, a page slid away, type lifted out and set again, a stamp, a camera whip. No dissolves.

## 7. Sound palette

- **Foley is metal, paper and ink**: slug clack (steel on steel with a short ring), line-casting ticks, rule "tss" from a pen, paper slap and slide, rubber-and-metal stamp thud, telephone bell (two interleaved tones), telegraph key, the dry ticks of dots developing. Close, dry, little reverb.
- **Ambience**: a rotary press thrum as a rhythmic bed (chug per beat), low motor hum, a quiet room.
- **Music**: a small newsroom band: tine or upright piano comping on the off-beats, walking upright bass, brushes with swing, a struck bell for a notice. Minor for urgency, major for resolution. Samples are not needed; synthesise.
- **Silence**: at least two real silences (no bed, no music); the next sound should be the most important one in the film, such as a stamp or a deal of paper. Foley and bed are gated hard at the cut; music stops on a beat.
- **Mix**: voice compressed and about 10 dB above music; music ducked ~8 dB under voice; −14 LUFS. The press bed stays audible below the voice and is the pulse that the cuts lock to.
- **Voice**: a measured newsreel or reading-room narrator; plain, dry sentences; no sing-song.

## 8. Native moves

- **Headline set slug by slug.** Slugs fall into the forme one by one, a clack each. *Fits content like:* a statement of fact opening a story; a name or a number being fixed; a title that arrives letter by letter.
- **Type pulled and re-set.** The headline's slugs lift out, leaving ghosts, and a new headline is set in the same place. *Fits content like:* a correction; a rumour replaced by a fact; a draft revised into a decision.
- **Halftone developing and morphing.** Dots grow into a picture, and later swell or shrink into another picture. *Fits content like:* evidence appearing; a before/after of a place; a suspect turning out to be innocent.
- **Stop-press stamp.** A red stamp strikes the page, with a camera hit. *Fits content like:* breaking news; a recall; a verdict.
- **Stack of editions.** Pages drop on a pile and the headline on top changes; later they are dealt out in a row. *Fits content like:* a history of a decision; a day-by-day outbreak; a product's versions.
- **Wire tape.** A strip on the table prints a message letter by letter as the tape feeds. *Fits content like:* an incoming call; a telegram; a notification.
- **Column rules growing.** Hairlines grow down the page and build the grid. *Fits content like:* a list of rules; an agenda; an index.
- **Boxed notice at headline size.** A ruled box answering a headline. *Fits content like:* an apology; a warning; a promise.

## 9. Pitfalls of the medium

- **Everything a different weight of black** looks digital: keep one ink and let paper, not opacity, make the greys.
- **Dots too fine** vanish at normal framing and become a grey smear; too coarse and the picture is unreadable. Choose a pitch for the closest shot and paint the photograph with big, simple shapes and strong contrast (the dots cannot carry detail).
- **A halftone photograph made dark overall** turns into a black block: lift the mid-tones (gamma) and keep skies and walls above 0.5.
- **Text running past a page edge or over the footer**: set columns with a computed line budget.
- **A drop cap whose letter is also in the text** (or an indent repeated on every line): remove the letter from the copy and apply the indent only to the lines it affects.
- **Headline wider than its box** after squeezing: squeeze more (scale x), do not shrink the size when a notice must match another headline.
- **Stamps over the very text they should leave readable**: place a stamp on the empty part of the headline block.
- **Motion blur on a whip** smears small text: average sub-frames only when the camera moves faster than about 70 px per frame, and never at rest.
- **Real names**: invented masthead, town, firms, streets; check that none is a real paper or business.

## 10. Engine

In `demo/`: `engine/type.js` (font loading, `flow` and `fillColumn` for justified columns with a drop-cap indent, `layoutHead` and `drawHead` for slug-by-slug headlines with falling, lifting and ink states), `engine/halftone.js` (`paintScene` for grey-scale photographs, `makeScreen` for the 45-degree dot lattice, `drawScreen(dev, morph)` for developing and morphing), `engine/page.js` (`buildPage`, `drawPage`, `makePaper`, `makeStamp`), `main.js` (world, camera with shake and motion blur, stack and deal placement, wire tape, galley-slip subtitles, `TEXTS`), `timeline.js` (all times, the camera keys, the sound events), `mix.py` (score, foley, voice).

Minimal example, a one-line front page: build a page with `layoutHead(['STORM SPARES THE PIER'], 'head', 184, 0.78, {x: -640, align: 'left'}, [-576], 0)`, then call `drawHead(c, H, t, tIn, 0.125)` inside a camera transform; add `makeScreen(w, h, 5.4, paintScene('smoke'))` and `drawScreen(c, S, dev, 0, '#1b1814')` for the picture. Details: [DEMO.md](DEMO.md) "Build notes".

## 11. Variation space

You decide the paper (its name, town, year, language), the story, the number of editions, the order information arrives, the headline words and sizes, the photographs (as many scenes as the story needs, painted in code), the camera path and the ending. Red may be swapped for another single spot colour if the story asks (blue for a weather bulletin), still on stamps only. All far from our demo:

- Structures: **a history in front pages** (ten pages across a century, each dropped on the pile with the headline that people believed then); **one headline, many readers** (the same page seen over four shoulders with different things underlined); **a ticking bulletin** (a single wire tape that prints, and each message is set as a headline and ruled away).
- Openings: **the pile of newspapers on a doorstep** thrown from the dark; **the empty forme** and a hand-set date; **a stamp** striking a blank sheet.
- Endings: **the page folded into a paper hat or boat**; **the presses stopping** with the last page held in the light; **tomorrow's page**, empty except a masthead and a date.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
