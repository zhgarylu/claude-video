# Vector Oscilloscope: Style Prompt

> A vector display in X-Y mode: one bright beam draws glowing phosphor lines on black glass, the lines decay behind it, and the beam jumps between strokes without drawing. The signature idea: the picture is the sound. The film's own left and right channels are X and Y, so the shapes on the glass are literally drawn by the score.
> References (grammar only): bench oscilloscopes in X-Y mode and Lissajous demonstrations, 1970s vector arcade monitors and lab-instrument title sequences, oscilloscope music. Never copy a specific instrument's panel, a brand's name or logo, a title sequence's artwork, or an existing oscilloscope-music piece.

## 1. Essence, and what it is not

- **One beam, one phosphor, black glass.** Everything bright on the screen is a line the beam drew a moment ago.
- **The picture is the sound.** The trace is rendered from the real stereo samples of the film's score (left = X, right = Y, plus a third intensity channel). The score and the shape are one object; a change of interval changes the shape, a detuned pair turns it, silence parks the beam as a dot.
- **Analogue line-drawing with memory**: persistence, brightness that depends on beam speed, blanking between strokes, a graticule, a bezel.

Not a terminal (`ascii-crt` is a text grid with scanlines), not a hologram HUD (`hologram-hud` is volumetric panels), not notation (`sheet-music`), not a generic "audio visualiser" of bars and waveforms drawn from an FFT. If the shape was not computed from samples that you can also hear, it is not this style.

## 2. Materials & rendering

- **Glass and graticule**: black glass with a barely lit haze, a 10 x 8 division graticule in dim green, brighter centre axes with 0.2-division ticks, tick marks along the frame. Edge-lit: it brightens when the instrument powers on.
- **Instrument**: a bezel around the tube and a dark charcoal front panel with etched labels, LED level meters, lamps, knobs. The panel is a world the camera can pull back to; the beam never leaves the glass.
- **The beam**: additive strokes in three passes (wide glow, mid, white-hot core), a head dot at the newest sample, and a bloom made by blurred, down-scaled copies of the beam layer added back. Round caps and joins.
- **Persistence** is a function of the sample history at frame time t: each sample is weighted by `0.7 e^(-age/45 ms) + 0.3 e^(-age/200 ms)`, binned by age. Never carry pixels from the previous frame; any frame must render alone.
- **Dwell**: brightness per unit length falls with beam speed (fast moves are dim, turning points are bright), done by binning segments by length.
- **Blanking**: a third channel (Z) switches the beam off during jumps; the jump may show as a very faint ghost line. A beam at rest burns a dot.
- **No raster**: no scanlines, no shadow mask, no film grain, no chromatic aberration (mux grain 0).
- **Camera matrix** (centre, scale) for every move; line widths scale with the square root of the zoom so close-ups stay thin.

## 3. Colour logic

- **One phosphor hue.** P31 green: glow `#19D264`, mid `#50FF96`, hot core `#E1FFEC`. The graticule and the panel's lit parts are the same hue at low brightness; the panel itself is cold charcoal `#161E19` (never pure black, so a lit-but-empty frame is not a black frame).
- **Brightness is the only emphasis**: a locked, stable trace is brighter (beam current up, core whiter); a dying one dims. Amber (P3) or blue-white (P11) can replace the green for a whole film, never mixed with it.
- No second accent colour, no red alert state, no gradients other than glow.

## 4. Type & subtitles

- **One single-stroke vector font**, drawn as polylines on a 4 x 6 unit grid (capitals, digits, a few signs), uniform advance. No outline fonts. In `demo/tools/gen_font.py`; the same glyph paths can be turned into the signal that makes the beam write a word.
- **Text is written, not set**: strokes are drawn in order, a bright head runs ahead of them, then the finished glyphs idle at steady brightness with a faint flicker. Words appear on their voice timestamps.
- **Subtitles** live in a readout strip (a second small display with its own bezel), capitals, at most two lines of 42 characters, each word written as it is spoken. Hold at least max(1.8 s, speech + 0.6 s).
- Labels on the glass are short (a ratio, a lock stamp); counters and etched panel marks are instrument chrome, not content.

## 5. Motion quality

- **The beam has no easing**: it does exactly what the samples say. Shapes change because the audio changes (a slide, a detune, a gate).
- **Everything else eases**: the camera and gains use smooth in-out curves; no overshoot except one small thump on a note or a lock (scale +3 %).
- **Turning** is the only continuous motion of a stable figure; its speed is the difference between two frequencies, so slow it down and it stops.
- **Gating**: tones start and stop with 10 to 40 ms raised-cosine fades, so the beam parks cleanly between notes.
- Smooth 24 fps; no stepping.

## 6. Camera grammar

A vocabulary, not a route. The camera is a slow eased move on one instrument.

| Move | What it expresses | Can serve |
|---|---|---|
| Macro on the graticule, pull out | scale; a thing coming into being | an opening; a zoom from signal to context |
| Slow push on the figure | attention narrowing | a lock; a convergence; a proof |
| Hard thump of scale on a beat | an event | a new note; a state change |
| Pull back to the whole instrument | the context; the machine behind the picture | a reveal; a credit moment |
| Hold on a parked dot | silence | a breath before the turn; an ending |
| Close on the panel's readouts | a number that matters | a measurement; a frequency; a count |
| Push into the mess | what failure looks like | noise; error; chaos |

Transitions are made by the beam: the tone gates off, the beam parks as a dot, the camera moves in that gap, the next figure draws in. No dissolves, no wipes.

## 7. Sound palette

- **The scope stem is the score's tone layer**: sine pairs (optionally with a few percent of harmonics), glides, detunes, gated notes; hard-panned so left = X and right = Y. Everything on it is drawn. Write it with numpy: the page reads the very same samples.
- **Off the scope** (heard, not drawn): voice (mono, centre), bass (sine with 2nd/3rd partials), kick and hat, short sine blips with a ping-pong echo, mains hum and a faint high-voltage fizz, foley.
- **Foley follows the instrument**: relay clack, key ticks, rotary-switch detents, a lamp tick, a struck-bell ding on a lock, a degauss thump at power-on, a falling-sweep collapse and a last relay at power-off.
- **Silence is a state of the instrument**: tones off, beam parked, only the hum (dipped 12 dB). The first sound after it should matter.
- **Mix**: voice about 10 dB above any tone, music ducked while talking, -14 LUFS. Balance the low end (bass with upper partials).
- **Voice**: calm, exact, a little dry; English offline voices with clear consonants.

## 8. Native moves

A menu: use the ones your story needs.

- **Sound draws the picture.** Show what two tones look like; let the viewer see each channel alone (a horizontal and a vertical line), then both. *Fits content like:* audio basics; stereo; phase; a synthesiser patch; a chord.
- **Drift and lock.** Two frequencies approach a simple ratio; the figure turns, slows, stops, brightens. *Fits content like:* tuning; synchronisation; resonance; a clock catching a signal; two teams agreeing.
- **Counting by touches.** Mark where the curve touches the box; the counts are the ratio. *Fits content like:* reading an instrument; a proof by counting.
- **Memory rack.** Frozen figures replayed from earlier samples as thumbnails. *Fits content like:* a catalogue of cases; a glossary.
- **Out of ratio.** A tangle where there was a figure. *Fits content like:* noise; interference; a failure mode.
- **Text written by the score.** The signal's cycle is the path of the letters, growing stroke by stroke. *Fits content like:* a title; a punch line; a name.
- **Level meter and frequency ruler.** LED columns and a log ruler computed from the same samples. *Fits content like:* any measurement.
- **Power-on and collapse.** Relay, hum, dot, line; and at the end the collapse to a dot. *Fits content like:* openings and endings of any instrument story.

## 9. Pitfalls of the medium

- A figure that is not closed (irrational ratio) smears into a mesh; that is a feature when the story says "tangle", a bug when it says "stable". Check closure and phase in a quick Python preview before drawing.
- Pick the relative phase of each locked figure on purpose (0 gives the symmetrical pretzel for 3:2, a figure of eight for 2:1).
- Persistence must come from the sample history, not from the previous canvas, or parallel rendering breaks.
- Low-passing the stem rounds corners and rings after jumps in written text; keep the stem unfiltered and filter only the heard copy.
- A zero-length beam draws nothing; draw the parked dot explicitly.
- The camera and the caption strip can hide the figure: check the lowest and highest edge of the figure at the camera scale of every shot.
- A fully black first frame reads as a failed render; keep the graticule lit.
- Counters that change every frame cannot be read; they are chrome, not content.

## 10. Engine

In `demo/`: `scope.py` (the stem: tones, glides, drift and lock solved for a given end phase, the text cycle, the Z channel), `mix.py` (score, foley, voice; writes `out/scope.bin` and `out/scope.json`), `engine/beam.js` (persistence-binned trace, parked dot, head, frozen figures), `engine/vtext.js` (the vector font as paths with a write-on fraction), `main.js` (panel, tube, graticule, meters, camera, captions, labels), `tools/gen_font.py`, `tools/make_caps.mjs`, `tools/preview_scope.py` (draw the stem at chosen times). File list and build steps: [DEMO.md](DEMO.md) "Build notes".

## 11. Variation space

You decide the topic's signal, the ratios or figures, the opening, the ending, the phosphor and the instrument. All far from our demo:

- Structures: **a spectrum walk** (a sweep up a filter, the figure morphing as a bandwidth narrows); **an echo** (a delay line: the figure repeated and fading, rotated by each reflection); **a heartbeat or any real waveform** (X = signal, Y = its derivative, a phase portrait).
- Openings: **a swept line** (time-base mode, then switch to X-Y); **static** (noise on both channels collapsing to a figure); **a spiral** from a decaying tone.
- Endings: **the beam walks off the glass**; **a lone dot with the hum fading**; **the score writes the film's last word and the power cuts mid-stroke**.
- Other looks: an amber P3 tube with long persistence; a green tube with a coloured overlay; a vector display game cabinet bezel; a wall of small tubes.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
