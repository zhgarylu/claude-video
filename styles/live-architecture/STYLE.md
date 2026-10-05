# Live Architecture Diagram · 动态架构图体

> A system diagram that explains itself: boxes and orthogonal connectors on a dark dotted grid, small labelled packets that travel along the connectors, nodes that light up when something reaches them, and a voice that names each step as it happens.
> References (grammar only):
> - Engineering architecture diagrams and network-flow animations in tech talks and documentation.
> - Dark-mode developer tools: dotted canvases, pill badges, monospaced labels.
> - Subway-style route highlighting: the path being followed is lit, the rest is dim.
>
> Nothing is copied from these: no product icons, logos, layouts or type.

## 1. What it is

The diagram is the whole picture. It is drawn once, in layers (zones), and then **something moves through it**: a request, a message, a unit of data. Each step is a leg of that journey, named by the voice and shown by a packet that carries a short label. What you see in one frame: dark navy dotted ground, rounded node cards with a line icon and a name, soft dashed zones that group nodes, thin muted connectors, one lit connector with a glowing packet on it, and a pill-shaped caption at the bottom.

Not Blueprint (that is a drawing of a thing, white on blue, with dimension lines), not Sci-fi Hologram HUD (no scan lines, no readouts), not Dark Tech Keynote (no stage, no product hero). Nodes are generic parts, never brand marks.

## 2. Look

- **Ground**: near-black navy (`#0d1220`) with a faint radial lift in the centre and a grid of small dots every 40 px; a few very faint particles drift so a held frame is never dead.
- **Node card**: rounded rectangle (about 230 × 130), dark panel fill, a 3 px outline in the node's colour at about half strength, a 56 px line icon in that colour, the name in a bold sans below it, a small grey tag under the card. **Active** nodes get a full-strength outline, a tinted fill and an outer glow that decays over about half a second. At rest every node breathes very slightly.
- **Zones**: dashed rounded rectangles in a barely tinted fill, titled in small grey caps-height text in the top-left. They group nodes by who owns them or where they are (you / the edge / the machine room), never by colour.
- **Connectors**: orthogonal polylines with rounded corners (radius about 22), 4 px, muted blue-grey until used; **the connector in use** is drawn on in its packet's colour with a glow. Connectors appear just before their first use and then stay.
- **Packets**: a 26 px rounded square in the message colour with a dark core, a short fading trail, and a small monospaced label in a dark pill above it. Labels are 2 to 12 characters.
- **Badges**: pill tags (outline and a 18 % fill in one colour) pinned beside a node for a result: a hit, a miss, a role.
- **Never**: gradients as fills (except the one closing bar), shadows other than glows, skeuomorphic server racks, brand logos, curved bezier connectors, connectors crossing a node.

## 3. Colour

One role per colour for the whole film, and the legend is the film itself:
- **Cyan** `#4cd3f2`: a request going in, the user's side.
- **Amber** `#ffb454`: a response or data coming back.
- **Mint** `#55e3ab`: success, a hit, a secure channel.
- **Coral** `#ff7b7b`: a miss, the expensive path, the end of the line.
- **Violet** `#a98bff`: a credential or a lookup.
- Text `#eaf0fb`, secondary `#8d9bb8`. Never more than five accents in one film.

## 4. Type

- **Sans** (Noto Sans SC or similar OFL face, 700 for node names and captions, 500 for tags) and **mono** (JetBrains Mono or similar, 600) for packet labels only.
- Node names 30 px, tags 22 px, badges 24 to 26 px, zone titles 26 px, the step line 30 px, the film title 36 px, the caption 46 px, on a 1920-wide frame.
- **Caption**: one sentence at a time in step with the voice, in a dark pill (`rgba(8,12,22,.88)`, 2 px grey outline, 22 px radius) centred at the bottom, at most two lines, cut at the punctuation nearest the middle.
- **Step line** (top-left, under the title): a numbered circle and a three- to six-word name of the current step.
- Reading-time rule applies to badges and titles; voice-synced captions follow the speech and are exempt (say so in the notes).

## 5. Motion

- Nodes **pop in** (scale from 0.85 with a slight overshoot, opacity in 0.25 s) at the moment the voice first names them, never earlier; their zone fades in with the first node.
- A packet moves along its connector with smoothstep easing in 0.8 to 1.3 s; on arrival the target node lights, a small tick sounds and the glow decays. A reply goes back along the **same** connector in the opposite direction in the reply colour.
- A badge fades in 0.3 s, holds long enough to read, and fades out; it never moves.
- Several packets never move at once unless the sentence says so (two requests in parallel is a sentence).
- **Repeat journeys**: the same path later in the film is travelled in a different colour (the return).

## 6. Camera grammar

Mostly a **locked overview** so the whole map is visible. The only moves are:

| Move | What it expresses |
|---|---|
| Dive into a zone (1.2 to 1.4×, eased over 1.2 s) | the journey goes somewhere that needs more room: the machine room, a subsystem |
| Pull back to the overview | the journey ends or the summary starts |
| Nothing | most of the film |

No shake, no rotation, no parallax. The HUD (title, step line, caption) is screen-space and does not zoom.

## 7. Sound palette

- **Score**: a soft pad on slow chords (A minor family), a plucked bass on beats 1 and 3, a plucked eighth-note figure that arrives in the second bar and thickens; 90 to 110 BPM; it ducks under the voice.
- **Foley is a UI language**: a rising blip when a packet leaves, a short falling blip and a tick when it arrives, two rising notes for a hit, one low falling note for a miss, a glassy pop when a node appears, a small click for a badge, a whoosh for a camera dive, a plucked chord for the closing resolve.
- **Pan** follows the x position of the node that makes the sound.
- Voice: one clear, even narrator, compressed, about 10 dB above the music.

## 8. Native moves

- **Light the path**: the connector in use lights and the rest stays muted, so the route reads as one line through the map.
- **Same road, other colour**: a reply travels the connector backwards in the reply colour.
- **Hit and miss**: a short badge beside a node says what the node did with the request.
- **Fork**: one connector splits to two nodes; the second packet is dimmer ("the next request goes here").
- **Dive and resurface**: the camera enters a zone for the detailed part and pulls back for the summary.
- **Closing bar**: a one-line gradient bar with two labels states the rule the whole journey followed.

## 9. Pitfalls

- **Connectors crossing nodes or each other** read as data flow that does not exist: route them by hand, one bend at a time.
- **A glow that does not decay** makes every node look active; let it fall in about half a second.
- **Labels on packets that overlap the node they are going to**: put the label above the packet and keep it short.
- **Too many nodes**: ten is the limit on a 1080p frame; beyond that, dive into a subsystem on a second page.
- **Camera dives that cut off the caption or hide the target**: keep the target node in the middle half of the frame and the HUD in screen space.
- **Pretending to measure**: do not put milliseconds or percentages on screen unless they are real and sourced.
- **Brand marks**: use generic names ("cache", "database"); a named product needs a source and the right to show its mark.

## 10. Range of variation

You choose the system, the nodes and their icons (add shapes to the icon set), the zones, the colour roles, how many journeys there are (one request, a batch, a failure and a retry), the voice and the score. The journey can be a request, a message, a payment, a file, a bug, a person through a process.

Far from our demo:
- **A failure story**: the same diagram, a packet that dies at one node, the retry, the circuit breaker lights, the user sees an error page.
- **A data pipeline** that is a horizontal assembly line: sources, a queue, workers, a warehouse; many small packets move at once and a counter climbs.
- **An AI service**: a prompt packet, a gateway, a model box that splits into layers when the camera dives in, tokens returning one by one.

---

How our demo was made (story, scenes, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
