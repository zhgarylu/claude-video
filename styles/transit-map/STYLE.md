# Transit Map — Style Prompt

> The schematic metro diagram as a film language: octilinear routes of uniform weight in a handful of line colours, ticks for stops, rings for changes, station names set flush to the line, and a legend that is the rulebook. Information is organised by connection, not by distance; the diagram is allowed to lie about geography so that it can tell the truth about how things join.
> References (grammar only): the 1930s London Underground diagram redesign (topology over geography; 0/45/90° only; interchange marks), Vignelli's 1970s New York subway diagram (strict angle discipline, colour-coded bullets, the relentless grid), and the family of schematic route maps of the twentieth century. Never use a real system, line name, station name, roundel, logo, typeface or colour assignment; the network in the film is always invented. Never copy a real diagram's layout.

## 1. Essence, and what it is not

- **A diagram language**: lines, stops and changes are the grammar. Anything the film explains is a network: a process, a pipeline, a learning path, an org flow, an itinerary, a "how X connects to Y".
- **The rules are the style, and they are visible**: only three angles (0°, 45°, 90°); one line = one colour = one weight; a tick is a stop and a ring is a change; a legend states these rules and builds with them.
- **The lie is the subject**: schematic means *less* information, chosen. A film in this style can show that choice (geography straightening into diagram) or simply obey it.
- **Colour is the data**: five or six line colours on quiet paper; colour is never decoration.

Not typography on a grid (that is Swiss Motion Graphics: one signal colour, type as hero; here lines are the hero and there are many colours), not a data chart (nothing is plotted to scale), not a GPS or street map, not a flowchart with boxes and arrows (connections are routes, not arrows), not a real city's map.

## 2. Materials & rendering

- **Flat vector on paper**: warm paper, ink, pale greys, line colours. No gradients, no shadows, no glow, no texture, no grain (mux grain 0).
- **The network** is a set of polylines on a coarse grid (a unit of 50–65 px). Every segment is horizontal, vertical or at 45°. Corners are rounded with one fixed radius (about one and a half to two line weights × 5), never sharp, never a free curve. Lines cross only at interchanges.
- **Line weight is one number** for the whole film, about 9–12 px at 1080p, constant along every line and across every line. Zoom scales it with the world; nothing ever thickens for emphasis (emphasis is made by dimming the rest).
- **Stops**: a tick perpendicular to the line (≈ 3.5× line weight long, 4–5 px wide, ink), at regular, not metric, spacing. **Interchanges**: a paper-filled ring with an ink outline, centred where lines meet. Two interchanges close together may merge into a pill.
- **Labels**: station names in a single grotesque, set horizontally, flush to the line at a fixed gap, one of a small set of anchors (above / below for horizontal lines, left / right for vertical, the four diagonal quadrants for 45° runs; terminals are named beyond their ends). Names get a paper-coloured halo so lines never strike through them. A label never touches a line, a tick or another label (check by script).
- **Quiet furniture**: a pale river or coastline band, also straightened to 45°, zone bands as flat tints with a large faint numeral, a cartouche (name plate) with the line key, a legend panel. All beneath or beside the lines, never competing with them.
- **Geography** (when the film shows it): the same network warped onto a curvy city with a river, parks and a street grid in pale greys, and lines drawn thin; it exists to be thrown away.
- **A 2D camera** (centre, zoom) for all moves; all lines, labels and ticks are drawn in world units so they scale together.

## 3. Colour logic

- **Paper** `#F4F0E8`-ish warm off-white, **ink** a blue-black `#1D2433`, pale greys for secondary structure (streets, dimmed lines), a pale blue for water, a pale green for parks, two or three warm tints for zones.
- **Line colours**: five or six distinct hues of similar weight in value, e.g. a vermilion copper, violet, green, cobalt, saffron. Check them for colour-blind separation (hue *and* value differ) and always pair them with numbered roundels so colour is never the only code.
- **Dimming is the highlight**: to focus a route, mix every other line, stop and name toward the paper colour (to about 12–25 % strength); the route stays at full colour. Never darken or recolour the route.
- Text is ink on paper; on an ink plate, paper-coloured. No pure black, no pure white fills except train cars and plate text.

## 4. Type & subtitles

- **One grotesque family** for names, legend and captions (a DIN-like or neo-grotesque OFL face: Barlow, Inter, Public Sans…), medium weight; bold only by a thin same-colour stroke for interchange names and headings. Station names ≈ 20–25 px, interchanges one step larger; legend titles 24 px; small caps with generous letter-spacing for plate labels.
- **Numbers on lines** are roundels (a ring with the line's number), drawn in code.
- **Subtitles are station-sign plates**: a square-cornered ink plate at the bottom-left, a short vertical stripe at its left in the colour of the line the narration is about, text in paper colour, ≈ 30 px. A caption wipes in from the left and leaves quickly. Hold ≥ max(1.8 s, speech + 0.6 s).
- **Title card**: the same plate, large, with the line colours as a row of key bars under the title.

## 5. Motion quality

- **One curve family**: smooth ease-in-out for the camera and the morph; linear for something being drawn (a ruling pen) or a train at constant speed; nothing bounces except a single pin settling (a short squash, no overshoot beyond it).
- **Lines are drawn by a pen**: the stroke grows along its length with a small nib dot at the head, stations pop in as the pen reaches them.
- **Snaps**: a free stroke or a vertex that moves onto the grid does so in about 0.15 s with a click; vertices snap in a wave ordered by distance from a centre, quantised to the music's eighth notes.
- **Trains** accelerate and brake with a smootherstep profile, dwell at interchanges, and take on the colour of the line they join. A ripple ring marks the change.
- **Reveals**: panels wipe in from an edge with a ruled line; plates grow from the left; legend rows rise a few pixels as they appear.
- Smooth 24 fps, no stepping.

## 6. Camera grammar

A vocabulary, not a route. The camera is a flat 2D move over a large sheet.

| Move | What it expresses | Can serve |
|---|---|---|
| Pull-out from a point | the network is bigger than you thought | an origin, a first step, a scale reveal |
| Wide hold on the finished diagram | the whole system at once | a payoff after a build, a summary |
| Push-in to a junction | a rule or a detail at reading size | a transfer, a decision point, a definition |
| Lateral track along one line | continuity, one thing | a timeline, a pipeline, one actor's path |
| Follow-cam on the train | a journey with changes | an itinerary, a process run on real data |
| Crane out from the destination | arrival and context | an ending, a result in its system |
| Frame shift to make room for a legend | the rule set joins the picture | explainer structure |

Framing: the diagram is centred in the free area (not under the legend, not under captions); in close-ups the point of interest sits in the left two-thirds. Transitions are inside the medium: lines draw, vertices snap, panels wipe, the rest dims. No dissolves, no hard cuts.

## 7. Sound palette

- **Score**: wooden and metallic mallets (marimba, vibraphone), a soft sine or muted bass, a warm detuned pad, a bell or chime for stations; light percussion made from rail ticks (a short high noise burst on beats 2 and 4, then on every eighth when the journey starts). A kick only when something is moving. No piano-and-strings.
- **Picture and music share data**: the snaps of a straightening network can be the notes of an ascending pentatonic run (centre outward), legend swatches the notes of a scale, a train's speed the rate of the wheel clacks.
- **Foley follows the material**: ruling-pen hiss for lines being drawn, a felt thud for a plate or pin landing, paper slide for a panel, small clicks for ticks and snaps, a ratchet for a measuring guide, a two-note chime for a change, door-warning beeps (invented, not copied), pneumatic hiss, rail clack and rumble for the train.
- **Beds**: paper room tone and a faint city wash while the picture is geographic; a concourse hum (a harmonic drone with air) under the diagram; train rumble tied to speed.
- **Silence**: the best moment is the instant the network locks onto its grid: a bright chime, then everything stops for about a second. A second near-silence at an arrival.
- **Mix**: voice compressed and about 8–10 dB above the ducked music; −14 LUFS. Voice: calm, even, announcer-like but human; avoid a copy of any real system's announcer.

## 8. Native moves

A menu: use the ones your story needs.

- **Line growth.** A route is drawn station by station by a pen. *Fits content like:* a learning path; a pipeline; a project timeline.
- **Geography to diagram.** The real, curved layout straightens onto the grid in a wave, shedding streets and rivers. *Fits content like:* simplifying a messy process; "from chaos to a clear model".
- **Route highlight.** Everything else dims; one path glows. *Fits content like:* an itinerary; a user journey; a customer's order through a company.
- **Transfer at an interchange.** The train stops at a ring, a ripple expands, it takes on the next line's colour. *Fits content like:* a handoff between teams; a layover; a change of format.
- **The train.** A pulse travelling a line at a speed that means something. *Fits content like:* data moving through systems; a package; a signal.
- **Zone bands.** Concentric tints fill and the stations inside change meaning. *Fits content like:* pricing tiers; coverage; levels of access.
- **You are here.** A pin drops on a station with ripples. *Fits content like:* "where you are in the process"; onboarding.
- **The legend that builds.** A key panel gains one row per rule as the rule is shown on the map. *Fits content like:* explaining how to read anything.
- **Angle snap.** A free stroke at the wrong angle is shown, rejected and snapped to 45°. *Fits content like:* any normalisation rule; design constraints.

## 9. Pitfalls of the medium

- A line that is not on 0/45/90 anywhere, even for one frame at rest, breaks the style. In motion only the morph and the snap demo may leave the grid.
- Two lines crossing without an interchange read as a transfer that does not exist. Check with a script.
- Labels that overlap lines or each other make the diagram unreadable; place them by a script with a collision cost, not by eye, and keep names short (≤ 12 characters).
- Colours too close in value, or more than six lines, destroy the code.
- Highlighting by thickening the route breaks the "one weight" rule; dim the rest instead.
- Corner radius too small looks like a circuit board, too large like a roller coaster; keep one radius.
- Anything that follows a subject (a callout, a ring) must go through the same world → screen function as the camera.
- Text in world units shrinks with zoom: in wide shots names are small; plan the camera so that the part being narrated is read at ≥ 18 px.
- Dense interchanges (two close together) need diagonal label quadrants or pills; do not shrink the font.
- Labels that run under a legend panel read as errors: shift the camera when the panel is present.

## 10. Engine

In `demo/`: `network.js` (the invented network as pure data: lines, stations, river, zones; the geography warp; waypoints with morph delays; a self-check), `labelgeom.js` + `tools/placelabels.mjs` (label anchors and the collision-minimising placement, output `labels.json`), `tools/netcheck.mjs` (octilinear and interchange rules), `timeline.js` (all times, voice cues, train profile, sound events), `main.js` (page contract, rounded polyline builder, camera, morph, layers, legend, captions, `TEXTS` for the reading check), `mix.py` (score, foley, beds, voice). File list and build steps: [DEMO.md](DEMO.md) "Build notes".

## 11. Variation space

You decide the city (or company, or curriculum), the lines and what each line *means*, the colours, the story and the ending. All far from our demo:

- Structures: **a build-up** (one line, then a second, each station a step, until the network reads as a whole: a learning path); **a rush hour** (many trains at once on a finished network, with the camera on one commuter; a process under load); **a disruption** (a closed station: lines reroute, the diagram re-flows nearest first; an incident or change request); **a redesign** (two versions of the same network side by side, one leaving a station out).
- Openings: **the finished map already glowing**, then zoom to a single station; **a pin on blank paper**; **a list of stops** typed one under another that then become ticks on a line; **the legend alone** that grows a line out of its first swatch.
- Endings: **the pin on the last station with the map dimming around it**; **the whole network lit at once, every train home**; **the line continues off the edge of the sheet** (the next stop is not drawn yet); **a station renamed**.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
