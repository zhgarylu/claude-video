# Demo Breakdown · 实录解读 — Style Prompt

> A news or product-introduction film built **on top of existing material**: the user's launch event, keynote, official demo or screen recording plays at its original speed and picture, or the user's **article and its own figures** are quoted and shown; the film adds narration, burned-in subtitles, freeze-frame breakdowns (pause, zoom, highlight box, numbered callout) or annotated figures and quote cards, drawings of its own that are always stamped as interpretation, a source label and a closing comparison. It reads as a careful explainer that never lets you forget which pixels are the source's and which are the explainer's.
> References (grammar only): the "official demo, explained" explainers of tech news channels; a magazine's "figure, annotated" page with its credit line; a broadcast lower third and source bug; a sports-analysis telestrator (pause, circle, number); a museum label that says "interpretation". Take the labelling discipline and the pause-and-point rhythm; never copy a channel's logo, template, music or wording.
> Not a talking-head film (that keeps a presenter on screen and draws around them: `TALKING-HEAD.md`), not a remake of a video's structure (`TEARDOWN.md`), not a keynote slide deck, not a screencast we record ourselves (Living Screencast).

The footage (or the article and its pictures) is the user's and is **not** part of the library; this style's demos use an invented app recorded in code, an invented article with two figures drawn in code, and an invented "official release" clip (a made-up phone app) drawn in code. How to work with it: [`BREAKDOWN.md`](../../BREAKDOWN.md) (§8 for articles, §9 for a news digest) and [`tools/breakdown/`](../../tools/breakdown/README.md).

## 1. Essence, and what it is not

Five traits make a frame read as this style:

1. **The source is untouched.** Clips play at original speed, in their own picture, never recoloured, never re-timed; a figure from an article is shown whole, never stretched, never redrawn, and carries its credit for as long as it is on screen; a quote is the author's sentence, verbatim. Everything else sits around or beside them in a fixed system.
2. **Seven shot types and no others:** `hook` (title card), `clip` (source segment), `freeze` (pause on a frame with zoom, highlight, markers, a callout card), `figure` (a picture from an article, pushed in or scrolled, with boxes, a numbered legend, a card and the credit plate), `quote` (the article's own sentence typeset big, key words swept with a highlighter in step with the voice), `explain` (our own diagram), `compare` (comparison, takeaways or verdict). A footage film alternates *what happens* (clip) → *what the product does* (freeze) → *where it applies* (explain); an article film alternates *what the author says* (quote) → *what the picture shows* (figure) → *our reading* (explain).
3. **A fixed frame of labels** that never moves between shots: the source or interpretation tag top-left (原文配图 / 原文摘录 on article shots), the section tag and progress bar top-right, the subtitle band at the bottom, two card slots, a lower-third slot, a picture-in-picture slot; a figure's credit plate sits directly under the picture.
4. **Interpretation is always marked.** Any picture that is ours (explain, compare) wears an amber tag, a dashed frame, a stamp and a `basis` line naming what in the source supports it.
5. **A calm dark-green ground with one lime accent**; the lime means "the thing the product does / the thing to look at".

It is not a hype trailer: no shake, no glitch, no speed ramps on the source.

## 2. Materials & rendering

Everything is canvas 2D drawn per frame from a timeline; footage comes from pre-extracted JPEG frames (clips, at the film's fps) and one full-resolution still per freeze, so any frame can be rendered alone. Layers, back to front: ground (vertical gradient and a 96 px hairline grid at low contrast) → footage (contain-fitted; bars filled with a blurred, dimmed copy of the picture) → shot graphics (spotlight dim, boxes, arrows, markers, cards, diagrams) → bottom scrim → tags, timecode and subtitles. Boxes, arrows and markers are placed in **source-frame coordinates** and mapped through the current zoom, so they follow it. Shadows are soft and small; panels are flat with a 2.5 px line. Footage is never filtered except a vignette and a shutter flash on a freeze. A figure sits on a plate with a 2.5 px line; the picture inside is drawn at one scale on both axes, and where it does not fill the plate the plate shows (no stretching, no cropping to fit); outside a box the picture dims by a fifth, not more.

## 3. Colour logic

Three colour families, each with one job: **ground and panels** (dark green-black, and a lighter green for panel faces), **accent** (lime on dark, deep green on light: boxes, markers, arrows, the product's step, verdict plates) and **interpretation** (amber: the tag, stamp and dashed frame of our own drawings, and nothing else). Text is near-white (ink) or a quiet green-grey (muted). Footage is the only source of other hues; our graphics add none. A light theme swaps the values, not the roles. One palette object in `lib/theme.js` drives all of it. Example (dark): ground `#08110D`, panel `#13241B`, ink `#EEF6EF`, accent `#B8F03C`, interpretation `#F6C453`.

## 4. Type & subtitles

One family, Noto Sans SC (SIL OFL), weights 500–900; Latin and Chinese share it. Sizes at 1080p: hook title 92–112 px (a `big` word 210), explain headings 64, node labels 44, annotation cards and marker labels 38–48, list and compare text 40, tags 32–34, timecode and stamp 30, basis line 32. **Body annotations never go below 36 px.** Article shots: quote text 74 px (46 minimum), attribution 36, figure card title 46 and body 40, marker legend 40, box labels 38, credit plate 32. Subtitles: 54 px (50 in 9:16), weight 800, white with a dark outline on footage, in a fixed band at the bottom, at most two lines, cues of about 20 characters held at least 1.4 s (hold ≥ max(1.8 s, speech + 0.6 s) where the next cue allows). Text that must be read stays on screen CJK ÷ 4.5 + other ÷ 15 + 1.5 s: `prep.py` lengthens non-clip shots to fit, `readcheck.mjs` verifies.

## 5. Motion quality

On twos nowhere: everything moves smoothly at 24 fps. Elements **arrive** with a 0.45 s slide-up and fade, in the order the narration mentions them (spread automatically over the voice, or at an explicit `at`); boxes grow from 60 % to 100 % around their target, arrows draw along their length, markers pop and send out one ring, cards slide in from their side. A freeze opens with a 0.45 s white shutter flash and a pause glyph, then (if there is a crop) zooms 0.95 s with an ease in-out. Shots meet through a 0.14 s dip to the ground; between a clip and the freeze of its own last frame the picture is identical, only the flash tells you it paused. The source itself is never eased, slowed or sped. A figure arrives with the shot's fade, zooms (`crop`) over 0.95 s with the same ease in-out as a freeze, then keeps pushing in by 3 % until the shot ends; a tall or very wide picture scrolls instead (a slow ease between two fixed positions, timed by `scroll_t`). A quote's highlighter sweeps over 0.45 s from left to right when the narration says the phrase.

## 6. Camera grammar

The camera is the zoom and the cut.

| Move | What it expresses | Can serve |
|---|---|---|
| Clip at full frame | "this is what happened" | any evidence the viewer must trust; the first look at a demo |
| Pause + shutter flash | "stop here" | the frame where the result first appears; before explaining |
| Pause + zoom into a rect | "look at this detail" | a small control, a number, a line of code, a label |
| Spotlight (dim all but boxes) | "only this part matters" | two or three places to compare in one frame |
| Numbered markers | "these parts, in this order" | steps of an interface, parts of a diagram |
| Arrow between two points | "this causes that" | an input leading to an output on the same screen |
| Picture-in-picture | "and here is who says it" | a presenter or a second source |
| Figure with crop + boxes | "this part of the author's picture" | the overlap in a diagram, one region of a map, one panel of a composite chart |
| Figure scroll (tall or wide picture) | "and now the rest of it" | a long infographic, a chart with a key on the left and the data on the right |
| Quote with a highlighted phrase | "in the author's own words" | the claim a figure then proves; a number the narration repeats |
| Cut to explain / compare | "now our reading" | the moment the film stops showing and starts interpreting |

Framing rules that always hold: on article shots the picture sits in its own plate and text never lies on it: the card and the numbered legend go beside it (16:9 `side`), under it (`wide`, 9:16), and the only labels on the picture are box labels, placed where they cover no other box or marker; footage fills the stage (16:9: the full frame; 9:16: a band at the top with annotations below); nothing of ours covers the part of the picture the narration is about (cards go to the other side, labels have `dir`); the subtitle band and the 330 px bottom area of 9:16 stay clear of everything but subtitles. Allowed transitions: the ground dip, and the cut from a clip to a freeze of the same frame. No wipes, no zoom-through, no whip.

## 7. Sound palette

Voice first: a calm, close, steady narrator (Chinese: edge-tts Yunxi; the voice is cast for the film, not fixed by the style), compressed and levelled, about 10 dB above everything else. Under it: **the source's own sound** (muted, ducked 13 dB while the narrator speaks, or kept whole for a clip that carries its own meaning, with subtitles instead of narration), **a quiet music bed** (a soft pad, a slow pluck line and a sub; no drums; 8 dB down under the voice, 12 dB further down under a kept clip) and **light foley** tied to what appears: a camera shutter on every freeze, a tick on every box, a pop on every marker, a soft whoosh on arrows and cuts, a short ding on cards and the verdict. Silence is used before the verdict (the bed thins, the last clip ends clean). Loudness −14 LUFS, true peak ≤ −1 dB.

## 8. Native moves

- **Pause on the evidence.** A clip ends on the frame that matters; the next shot is that frame, frozen, with a shutter flash. *Fits content like:* a model's answer appearing in a chat window; a build turning green; a price on a slide.
- **Zoom into the detail.** The freeze zooms to a `crop` while the rest dims. *Fits content like:* a line of code in an editor; one setting in a long menu; a number on a keynote chart.
- **Number the parts.** Markers with short labels, in the order of the narration. *Fits content like:* the three steps of an onboarding flow; the panels of a dashboard; the parts of a hardware render.
- **Say it with an arrow.** An arrow between two regions of the same frame. *Fits content like:* a prompt and its output; a toggle and the toast it triggers; an input field and the result list.
- **Redraw it as a flow, and say it is a guess.** An `explain` shot with nodes and arrows, stamped, with a basis line. *Fits content like:* how a feature probably works inside; the stages of a pipeline the speaker only mentions; a before/after of a workflow.
- **Say it in the author's words, then show it.** A `quote` card with the key phrase highlighted as the voice reaches it, then the `figure` that proves it. *Fits content like:* a research post's central claim and its chart; a product announcement's headline number and the screenshot behind it.
- **Zoom the author's picture to the part that carries the claim.** `crop` plus `boxes`, a numbered legend beside the picture. *Fits content like:* the overlap region of a Venn-style diagram; the south-east of a coloured map; one panel of a multi-panel figure.
- **Travel through a long picture.** A tall infographic or a key-plus-chart composite scrolled once, boxes appearing where the narration arrives. *Fits content like:* a timeline graphic; a ternary key beside the map it colours.
- **Say whose number it is.** In a news digest the freeze stops on a figure the source gives and the callout says so ("官方演示的读数，不是我们测的"), then the conclusion splits the claims into *what the source says* and *what is still to verify*. *Fits content like:* a launch clip's "6 seconds" readout; a keynote's benchmark bar; a teaser's "works offline" badge.
- **Close on what was not shown.** The `compare` shot puts "seen in the footage" next to "not said", then a verdict the viewer can act on. *Fits content like:* a launch with no benchmarks; a GitHub demo without failure cases; a tutorial that skips setup.

## 9. Pitfalls of the medium

- **A drawing mistaken for the source.** Our diagrams must differ in ground, type and stamp from anything the footage shows; the tag changes colour for the same reason.
- **Claims beyond the footage.** Narration describes what the clip shows and says "我们的理解是" for the rest; numbers and names come from the source's speech or screen, listed in `FACTS.md`.
- **Labels that jump.** Tag, progress, subtitles, cards and lower third live in fixed slots; if a label does not fit, shorten the label.
- **Small text.** Annotation text under 36 px at 1080p is unreadable on a phone (the credit plate and the quote attribution are the only text allowed down to 30 px; `lint.mjs` reports anything smaller); diagram pages are the usual offenders: fewer words, larger type.
- **Freezing a blurred frame.** Pick the frame after the UI settles; the film cannot sharpen it.
- **A box on the wrong place after a zoom.** Coordinates are fractions of the source frame; read them from the freeze still.
- **Voice longer than the clip.** A clip is never extended; shorten the line.
- **A marker on top of what it marks.** In a figure the marker's text lives in the legend; put the numbered disc next to the thing, not over it.
- **Magnifying a small picture.** A crop that shows only a few hundred pixels of the original looks soft; prep warns above 2.5×.
- **A credit that vanishes.** The credit plate is shortened last and never dropped; keep the source's name short, put long captions in the narration.
- **An official claim passing as our measurement.** A source's number, speed or comparison is quoted as the source's, with its conditions, on screen and in the voice; the film says once, near the end, that it is a reading of an official demo and not our test (`prep.py` checks it in a news digest).
- **A paraphrase on a quote card.** The card's text must be in the article word for word (an ellipsis may skip the middle); anything else is narration.

## 10. Engine

`tools/breakdown/lib/`: `render.js` (`createFilm({canvas, spec, tl, query})` builds `window.render/TEXTS/EV/DUR`), `shots.js` (`hook`, `clip`, `freeze`, `explain`, `compare` and their parts), `figure.js` (`figure`, `quote`, the figure view and layouts), `footage.js` (`drawView`, `box`, `spotlight`), `source.js` (lazy `Clip` loader), `layout.js` (`layoutFor(W,H)`), `theme.js` (palettes), `draw.js` (wrapping, chips, badges, arrows). Reveal times and durations come from `prep.py` (`timeline.json`); the sound from `mix.py`. A minimal use that is not in the demo: a project with one clip and one freeze, `new.py films/x --source talk.mp4`, then delete the other shots from `breakdown.json`.

## 11. Variation space

The agent decides, for each film: which moments, how many (three to five), the order, the hook, the narration, the explain kinds, the theme within the colour logic, 16:9 or 9:16 or both. Three structures far from the demo: **a day-in-the-life** (one product used across three hours of screen time, one freeze per task); **a claim-and-check** (the speaker's claim as a `big` hook, then the evidence clip, then a `compare` of claim against what was shown); **a release-notes tour** (each new feature is a clip, a freeze with markers and a one-line explain, numbered as the section tag). Three openings: the strongest clip with no title; a `number` explain ("3 倍") before any footage; a `big` series word over a dimmed frame. An article film adds: **one picture, then the proof** (the article's central figure first, then its evidence), **claim and check** (the author's sentence as a quote, then the figure that does or does not bear it out), **section by section** (only for a short article). A **news digest** (`BREAKDOWN.md` §9) is a fourth kind: one fresh official clip, two to four key points, each as clip then freeze with the source's number or badge boxed and attributed, one stamped diagram with its basis line, and a conclusion that splits *what the source says* from *what to verify* and ends on an action line; the hook carries the source and the publish date. Three endings: a verdict plate; a `number` that sums up; the last clip frozen with a card saying what to try first.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
