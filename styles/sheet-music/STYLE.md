# Sheet-music Motion — Style Prompt

> The score is the picture. Engraved notation on warm manuscript paper plays itself: each note lights as it sounds, and the same event list that drives the sound blooms noteheads into shapes, bends staves into waves, draws melodies as ribbons and lets the page open into a landscape.
> References (grammar only): engraved and hand-copied manuscript scores (engraving rules, SMuFL shapes, analysis marginalia); score-follower videos (the playhead, notes lighting as they sound); the abstract sound-picture films of the 1930s–40s (voices as colours). Copy no piece, edition, typeface or film; never name them in the film.

## 1. Essence, and what it is not

A frame reads as this style when it has all of these:

- **Notation is the drawing**: five-line staves, clefs, key and time signatures, noteheads with stems, beams and flags, rests, bar lines, slurs, dynamics, all engraved to real rules and always legible.
- **Ink on paper**: warm paper with fibre and foxing, near-black brown ink; ink turns to colour only when its note sounds.
- **One event list**: every light, bloom, ripple and ribbon is computed from the same list of notes that is played. Nothing moves that is not a note or the pulse.
- **Voices are pigments**: each instrument owns one hue (notes, washes, ribbon, name).
- **Two states of one score**: *page* (systems on a sheet) and *landscape* (one long staff per voice), joined by a continuous unrolling.

Not a flash-card film (pictogram-motion: grid pattern, pictograms, colour fields). Not a HUD (hologram-hud: dark stage, additive light, wireframe; here light ground, multiply pigment, nothing glows). Not a terminal (ascii-crt: monospace glyph grid, phosphor, screen). Not a piano-roll: the notation never goes away.

## 2. Materials & rendering

- **Layers**: ground (optional dark desk) → paper (procedural tile, world-anchored, fibre and foxing) → blooms → staves and bar lines → glyphs → slurs and hairpins → ribbons → playhead → labels → vignette.
- **Ink and pigment multiply** over the paper (fibres show through, black over colour stays black). No additive blending, no glow.
- **Glyphs** are SMuFL symbols (Bravura, OFL) at font size = 4 × staff space. Everything else is a path with engraving-default thicknesses: staff line 0.13 sp, stem 0.12 sp, bar line 0.16 sp, ledger 0.16 sp, beam 0.5 sp, stem length 3.5 sp (≥ 2.6 sp when beamed). Stems point down from the middle line up; beams follow beat groups (slope ≤ 1.2 sp); slurs are filled crescents; every note outside the staff has ledger lines; accidentals once per bar; rests fill every gap.
- **Spacing is proportional to time** (x ∝ seconds, with room for accidentals), so playhead, notes, blooms and sound share one position.
- **Layout is a function**: each chord has a page and a landscape position; the frame blends them. Staff space: 14–18 px on a page, 22–26 px in the landscape (1080p).
- **Light model**: attack ≤ 50 ms, hold while sounding, release (≈ 0.45 s) to a ~60 % tint, so heard notes stay coloured. At onset the head pops to ×1.3 and a ring expands.
- **Blooms (under the ink)**: lead notes → orbs (radial wash, darker rim); fast notes → five-petal blossoms; low or long notes → hills as wide as the note lasts. Stains persist at ~30 % and spread slowly.
- **Waves**: each note sends a damped ripple through all staves (≈ 1 s, ≈ 330 px). Heads, stems, bar lines and ribbons ride the same displacement.
- **Ribbons**: a Catmull–Rom curve through a voice's heads, width from velocity, ending in a head that advances between onsets. **Screen space only**: vignette, subtitles.

## 3. Colour logic

- **Neutral ground**: warm paper (L ≈ 90 %), optional dark umber desk; ink near-black warm brown.
- **One pigment per voice, at most three in a frame**, hues far apart (example: vermilion, prussian blue, olive ochre). Colour is reserved for notes that have sounded and for their blooms, ribbons and names. Clefs, signatures, rests, bar lines, dynamics and staff stay ink.
- **Value order**: ink > pigment core > wash > paper; a wash stays ≤ 70 % alpha under a head.
- **The playhead is sepia**, a soft warm band, never a voice colour; annotations are umber (ink at ~70 %). Never grey or white paper, never a neon hue.

## 4. Type & subtitles

- **Notation**: Bravura only. **Text**: EB Garamond (OFL), italic for tempo, names, labels and subtitles, semibold italic for titles. Title 80–110 px, labels 28–40 px, subtitles 38–46 px (1080p).
- **Subtitles are performance directions**: one italic line in the lower margin, ink on paper (cream on the desk), 0.3 s fades; hold ≥ max(1.8 s, speech + 0.6 s). **Analysis labels** (bracket + numbered italic name) draw in just before their section.
- **Chinese type** (OFL, subset to the characters used, per TECHNIQUE §11): titles, labels and subtitles in Noto Serif SC (Medium; SemiBold for titles), upright with +0.04 em tracking (no italic); margin analysis may use LXGW WenKai. Notation, dynamics and numerals stay Bravura and Garamond.

## 5. Motion quality

- **24 fps. The world is still**: staves and notes move only through the layout blend and the camera. What animates is light, bloom, ripple, ribbon, playhead.
- **Playhead**: constant speed; on a page it hops with a fade at a line break, never diagonally. **Onsets are snaps** (50 ms attack, spring pop), releases exponential; easing is for layout and camera only.
- **Layout blend** (≈ 3 s) in two phases: x first (systems unroll side by side, still on different rows), then y (rows merge), so no two systems cross. Staff spacing and waves follow the second phase.
- **Reveal**: staves engrave left to right, items fading in at the front edge.

## 6. Camera grammar

| Move | What it expresses | Can serve |
|---|---|---|
| Locked page | A structure to read at once | a lesson; a list of parts; a form |
| Playhead follow (playhead at ~30 % width) | Time passing, listening | an unfolding explanation; a sound demo |
| Push into a bar | The one detail that matters | a rule; a motif; a brand mark |
| Unroll | Scope widening, unit to context | a step becoming the process; a pattern becoming a piece |
| Pull back to the panorama (staves drift apart) | The shape of the whole | a summary; the last look |

No row names the opening or the ending. Framing: in reading states staff height ≥ 60 px, noteheads ≥ 16 px wide; in the landscape the staves span ≥ half the frame height; text never covers notation. Transitions are made of the medium (engraving, unrolling, drifting staves); no crossfades or wipes.

## 7. Sound palette

- **Everything audible is in the event list**: each note plays at its onset with its velocity and duration; rests are real silence, so a script can prove picture and audio share the list.
- **Timbres (original, synthesised or sampled)**: glass or celesta-like lead (near-sine, bright 3rd–5th partial, vibrato only on long notes); marimba or vibraphone-like mallets (sine plus an inharmonic partial, fast decay); soft sine or upright bass with 2nd and 3rd harmonics. One clear timbre per colour.
- **Foley**: pen scratch along each staff as it engraves, paper slide for the unroll, a small ink tick on a bloom; room tone and paper air as the bed.
- **Silence**: a rest is shown and heard; a fermata note decays with no fade. At least two moments where only the page is heard.
- **Mix**: the music carries the film; voice (if any) ~10 dB above it, dry, close, warm; −14 LUFS; no grain.

## 8. Native moves

- **The note lights as it sounds.** Head, stem and beam take the voice colour at the onset and keep a tint. *Fits content like:* a rhythm lesson; a podcast intro; an intonation drill.
- **A notehead blooms.** The head becomes an orb, blossom or hill sized by velocity and duration. *Fits content like:* a brand sting whose notes become product shapes; a timbre lesson.
- **The staff bends.** Ripples run through the lines from each note. *Fits content like:* a sea piece; a heartbeat read as music; a crowd falling quiet.
- **The melody is a ribbon.** One curve through the heads shows contour. *Fits content like:* speech intonation; a sonified chart; a hiking route as pitch.
- **The page opens into a landscape.** *Fits content like:* a motif becoming a piece; one step becoming the system; a day becoming a week.
- **Mirror.** Two ribbons move in opposite directions. *Fits content like:* before/after; two voices in a debate; a symmetry lesson.
- **Marginalia.** Brackets and numbered labels draw in with each section. *Fits content like:* steps, rules, the parts of any form.

## 9. Pitfalls of the medium

- **Almost-right engraving** (stems on the wrong side, beams across beat groups, missing ledger lines) reads as fake. Draw a glyph test sheet first.
- **Colour everywhere** kills the ink-on-paper logic: only sounded things carry pigment. **Glow temptation**: washes are multiplied pigment with a darker rim.
- **Crossing during the unroll**: blending x and y together makes systems cross; move x first.
- **Tiny notation in the panorama**: below ~0.4× zoom let washes carry the picture.
- **Hard-edged playhead band**: use soft ellipses. **Hollow heads**: never fill half and whole notes.
- **Fake sync**: never derive the picture from the audio; one list drives both.
- **Fonts not ready**: load Bravura before the first frame.

## 10. Engine

In `demo/`: `score.js` (the composition and the one event list `EV`, `RESTS`, `CHORDS`; `phrase`, `invert`, `stretch`, `shift`, `sounding(t)`), `engrave.js` (SMuFL codes `G`, `glyph`, `drawChord`, `drawBeam`, `drawSlur`, layouts `pageX`, `landX`, `pagePlayhead`), `main.js` (`render(t)`: paper, layout blend, waves, blooms, ribbons, playhead, labels), `tools/proof.mjs` (pixel proof that heads change exactly at their onsets). A new bar:

```js
const sp = 20, yc = 540;
for (let i = -2; i <= 2; i++) line(ctx, 300, yc + i * sp, 1600, yc + i * sp, .13 * sp, INK);
[0, 2, 4, 5, 7].forEach((pos, k) => glyph(ctx, G.head, 400 + k * 200, yc + 2 * sp - pos * sp / 2, sp, k <= playing ? '#256a8c' : INK));
```

## 11. Variation space

You decide the music (mode, tempo, metre, 1–5 voices), pigments (within §3), structure, opening, ending, camera path and native moves. Far from our demo:

- Structures: **a six-second sting** heard three times (plain, scored, landscape); **a sentence as melody** (speech pitch becomes a ribbon, then bars); **a checklist as a form** (each item one bar, ticked off by the playhead).
- Openings: **a single dropped note** on a blank staff; **a pen engraving a line and a half**; **a page turn** onto a score already playing.
- Endings: **the staves flatten into one line** holding a chord; **the panorama pulls back** until the colour is a small stain on the paper; **the last bar frozen** with the fermata ringing.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
