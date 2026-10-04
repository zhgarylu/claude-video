# Bauhaus & Constructivist Poster — Style Prompt

> A 1920s avant-garde poster that assembles itself: red, black and cream paper plus one accent ink, geometric blocks on a steep diagonal axis and overprinted, cut-out halftone figures pasted on top, heavy type set on the slant and in rotated bars. Every move is a drum beat: a block slides along the axis and snaps, a wedge sweeps in, the plates jump out of register and settle.
> References (grammar only): 1920s Soviet and Central European poster design for the diagonal, wedge, megaphone and photomontage cut-out; Bauhaus print experiments for constructed letters and reserved paper; period film posters for tight cropping. Never copy a known poster's layout, figure or lettering; never show a real party, leader, regime, slogan or emblem (no stars, hammers, sickles, flags); never name them in the film.

## 1. Essence, and what it is not

- **Three inks and the paper.** Red, black, one accent (ochre or pale blue) and cream paper, printed as separate plates that overprint where blocks overlap.
- **One steep axis.** Nearly everything is built along one diagonal at 30–45° and its perpendicular, with at most one counter-diagonal. Blocks: circles, rings, wedges, triangles, bars, ruled hatch.
- **Cut-out photomontage, drawn in code.** Figures and objects are straight-edged pieces of halftone dots pasted on top with a thin paper edge. Never a real photograph.
- **Type is structure.** Heavy sans in rotated bars, on the diagonal and on arcs, plus giant constructed numerals.
- **Misprint is part of the look.** Plates sit a few pixels off register, ink is worn by paper tooth, a drum hit jolts them.

Not Swiss Motion (no neutral grid or calm flush-left column; the axis is violent, the plates misregister). Not Silkscreen Travel Poster (no stepped gradients, no landscape). Not Art Deco (no centre axis, gold, airbrush). Not a political pastiche: a language of shapes, the content is the user's.

## 2. Materials & rendering

- **Plate model.** Draw into three transparent canvases (accent, red, black), each one flat ink. Print them onto the paper in that order with `multiply`, each at its own offset (about 4 px red, 3 px accent, black zero). Overlaps mix honestly: red over ochre is deep red-orange, black over anything is black.
- **Reserved paper.** A cut-out erases its shape from every plate drawn so far (`destination-out`), so a pasted figure or a text box is clean paper under its own ink. Letters on a bar are erased from that bar's own plate only, after clearing the box, so small text has no colour fringes.
- **One transform for all plates.** Anything drawn through several plates goes through one shared transform helper; transforming a single plate scatters its colours.
- **Wear.** Each plate is eroded by a fixed speckle and scuff texture (paper tooth), offset per plate. Paper: cream, fine noise, fibres, darker edge. Mux grain 0–2.
- **Halftone cut-outs.** Polygons (tapered limbs, torso, circle head) filled with a 45° black dot screen, step 6–17 px at 1080p, density from a light direction, in the cut-out's own space so it travels with it. Flat red or accent may sit under the dots. Each piece has a 3–5 px paper edge.
- **Diagonal frame.** Compositions are laid out in a rotated frame (origin, angle); bars, scales, lanes and text run along its u axis. Never drawn as a grid.
- **Blocks** are flat fills: circle, ring, wedge, bar, hatch, tick scale, arrow, megaphone. No gradient, shadow or glow; tone comes only from dots or overprint.

## 3. Colour logic

- **Paper, red, black and exactly one accent**, chosen once per film; never both accents, never a fifth hue.
- Black carries structure and type; red carries energy and the one thing to follow; the accent fills large calm areas (a disc, a ring, a band). Cream is the ground and the reserved colour.
- **Black on red is invisible (multiply):** cut the detail from the paper or move it. Red on red and accent on accent likewise.
- Overprint is the extra colour: use it on purpose (red cone over ochre disc), never under text.
- Example: paper `#e8dcc0`, red `#e03a1f`, black `#17130f`, ochre `#dba22c` (or pale blue `#9db8c6`).

## 4. Type & subtitles

- **Latin heavy sans:** a condensed or extended grotesque in the heaviest weight, upper case, tight tracking, 36–90 px in bars. Preferred (OFL): Anton, Archivo Black, Barlow Condensed ExtraBold, Oswald 700; a heavy slab (Alfa Slab One) for one word at most. If a family lacks a heavy weight, thicken it with a same-colour stroke and mitred joins. Key words may be drawn as a block alphabet.
- **Constructed type.** Giant numerals and key words drawn from strokes with butt ends and mitred corners (not a font), 190–520 px high, black or red.
- **Chinese type** (OFL, subset to the characters used, per TECHNIQUE §11): Noto Sans SC Black (900) for bars and headlines; ZCOOL QingKe HuangYou or Noto Serif SC Black for one slab-like word. Set CJK as square blocks, 2–6 characters per bar on the axis, tracking +4–8 %, or stacked in a vertical bar; same knock-out rules.
- **Placement:** type sits in bars on the axis (cream out of black or red, black on accent), on an arc around a disc, or as a giant numeral.
- **Subtitles are bars.** Each line is a short bar laid along the axis (cream text out of black, one line, ≤ 40 Latin or ≤ 16 Chinese characters), arriving with a slide and a plate jolt; hold ≥ max(1.8 s, speech + 0.6 s). Never a plain strip at the bottom.

## 5. Motion quality

- **Smooth 24 fps, never on twos.** Roughness comes from misregister and wear, not stepping.
- **One curve: the drum hit.** Exponential-out, 0.2–0.28 s: a fast arrival that stops dead. No overshoot, spring, bounce or fade.
- **Everything arrives along the axis** (or its perpendicular): blocks slide in from off-frame, bars from below the baseline, numerals drop one per beat.
- **Register slam.** On a hit the red and accent plates jump 8–14 px and settle within about 3 frames (quadratic decay); black stays put.
- **Wedge wipe.** A triangle (half-angle ~30°) leads along the axis and reveals the next sheet behind it; its edges are a black rule on a 60 px red rule.
- **Deletions are covers** (a bar slides over, a wedge passes); nothing dissolves.
- **Rest is still.** Between hits nothing moves; the camera may drift 1–3 % along the axis.

## 6. Camera grammar

A 2D transform over a flat sheet; it moves on beats, along the axis.

| Move | What it expresses | Can serve |
|---|---|---|
| Locked sheet | the finished poster, reading time | a result; a summary; a title |
| Slide along the axis | the next step of one line of thought | stages; a route; a sequence |
| Wedge wipe to the next sheet | a new chapter, same energy | parts of a report; change of subject |
| Push along the axis into one block | the detail that matters | a number; a hand-over; a part |
| Hard cut on a drum hit | impact, a turn | a reveal; an error; a win |

Framing: the subject fills at least a third of the frame height; blocks may bleed, but never crop a word mid-letter; text stays 60 px inside unless it is a bleeding bar. Transitions: wedge wipe, bar sweep, block cover, hard cut. No dissolves, 3D or page curls.

## 7. Sound palette

- **Drum-led, brassy:** snare, rim shots, floor tom, bass drum on the beat, muted trumpet and trombone stabs, pizzicato bass, an accordion for air; a machine-shop layer (anvil, rivets, sheet metal) is native. A brass band playing a factory; not an anthem or any real march.
- **Foley is print and paper:** block slam (wood on felt), paper slap for a pasted cut-out, ruling-pen scratch, stamp, letterpress clack, megaphone crackle for a cone.
- **Every plate jolt has a drum hit** on the same frame; bars with text land on the snare.
- **Silence:** a hard stop before a turn; the first sound back is the most important block landing.
- **Mix:** SFX in front on every slam, music ducked 6–10 dB under voice, voice compressed and ≥ 6 dB above music, −14 LUFS. Voice: clear, declarative, slightly clipped.

## 8. Native moves

A menu: use the ones your story needs.

- **Assembly on the axis.** A poster builds from blocks sliding in one per beat until the composition locks. *Fits content like:* a recipe in stages; a product's parts; a team introduced.
- **Register slam.** Plates jump apart on a hit. *Fits content like:* a deadline passing; a price change; a score.
- **Wedge wipe.** A wedge sweeps one sheet away. *Fits content like:* chapters of a report; a timetable; the next level of a game.
- **Photomontage paste.** A halftone cut-out lands with its paper edge. *Fits content like:* a person at work; a tool; a bus.
- **Megaphone cone.** A cone grows from a megaphone and carries a message. *Fits content like:* an announcement; a campaign; an alarm.
- **Overprint meaning.** Where two blocks overlap the mixed colour is the point. *Fits content like:* two datasets with one cause; two teams on one field; a before/after.
- **Constructed numeral.** A number built stroke by stroke as the hero. *Fits content like:* a record; a countdown; an anniversary.

## 9. Pitfalls of the medium

- **Black on red disappears** → cut cream or move it.
- **Many diagonals at different angles** read as noise → one master axis, one counter-axis at most.
- **Colour fringes in small text** → clear the box, erase letters from the bar's own plate.
- **Dots with step under 6 px** alias after encoding; over 18 px they read as pattern, not photo.
- **Bounce, fade, glow, gradient, soft shadow** → none, ever.
- **Real photos, emblems or slogans** → draw everything.

## 10. Engine

In `demo/`: `engine.js` (`begin`, `ink`, `cut`, `T`, `print`: plate model and overprint; `onGrid`, `pt`: diagonal frame; `poly`, `circle`, `ring`, `arrow`, `megaphone`, `hatch`; `halftone`; `runner`, `skeleton`: riveted cut-out figure with a face; `numeral`, `heavy`, `textOnPath`, `arcPath`; `hit`, `slam`, `wedgePoly`), `scenes.js` (compositions as functions of local time), `index.html` (timeline, wipe, fonts). Minimal example: `begin(); T(960,540,-35,()=>{ ink('r').fillRect(0,-60,900,120); cut(g=>g.fillRect(300,-8,500,16)); }); print(ctx,{jolt:slam(t,[0,1])})`.

## 11. Variation space

You decide the subject, accent, axis angle (30–45°), figures, type language, voice and length. All far from our demo:

- Structures: **a bridge built in four stages**, one sheet each, joined by wedge wipes; **two timetables overprinted**, the clash is the story; **an inventory** where one numeral per beat adds to a sum.
- Openings: **a single circle** off-centre, then the axis drawn through it; **a megaphone cone** growing alone on blank paper; **a numeral built bar by bar**.
- Endings: **the poster dismantles** into blocks and one stays; **a wedge wipe to blank paper**; **the plates drift into perfect register** for the first and only time.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
