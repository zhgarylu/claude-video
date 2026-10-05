# Code Walkthrough · 代码讲解体

> A programming explainer drawn in code: a real code editor with real syntax colours, a focus system that lights the lines being discussed, typed code, red and green diffs that fold in and out, chips with leader lines, a call-stack and variable panel that updates step by step, a terminal for output, and a diagram that grows as the narration reaches each part. It is a film that **teaches** code, not one that shows a terminal or announces a product.
> References (grammar only): step-through visualisers of the Python Tutor kind, code-review screenshots with a diff gutter, the best conference talks that live-type and then zoom to one token. Never copy a product's editor skin, logo or theme name; the interface here is generic.

## 1. What it is
- **The editor is the page.** The film is one file of code, read in order. The viewer's question at every moment is "which line, and what is it doing to which value?". Everything else on screen answers that.
- **The code is true.** Every line shown was run by the real interpreter, and every output, variable value and trace step on screen was printed by that run, not typed by hand. A wrong or untested snippet is a failed film.
- **Attention is the animation.** Nothing moves for decoration. Things move to say "look here" (focus slide, zoom), "this changed" (diff fold, value flash), "this is where it points" (pointer glide), or "now something else" (pane swap).
- **Teaching, not tool demo.** Not an AI-terminal or CRT look (ascii-crt), not a product walkthrough with a cursor (living-screencast), not a keynote with big claims (dark-keynote). Those show that code exists; this one makes a viewer understand one piece of it.

## 2. Look
- **Panes, flat, on one 2D canvas.** Rounded panels (radius 16) with a 36 px title strip in spaced capitals, a 1.5 px hairline and a soft shadow, on a deep ground with a faint dot grid. Panes: **editor** (tab with the file name, line-number gutter, code, status bar with `Ln, Col` and the language version), **terminal**, **diagram**, **watch** (call stack frames with the active one marked, plus variable tiles).
- **Real syntax colouring, from a small tokenizer in the page** (no highlighter library, so every colour is deliberate). Roles: keyword, function being defined, function being called, builtin, number, string, comment, operator, identifier. A new language only needs a keyword list.
- **Characters are drawn one at a time, on a fixed grid.** Code fonts ligate `<=` into a single `≤` and `==` into one glyph; a teaching film must show the two characters the interpreter reads. Never rely on the font's ligatures.
- **Line numbers are real**: they follow the file, and a diff row has a `−` or `+` in the gutter instead of a number.
- **Chips and callouts** are pill labels in the editor's right margin tied to their line by a dotted leader with a dot at the end of the code; pointers in a diagram are a pill with a stem and arrow head. Chips are short (24 characters or fewer) and say a value or a verdict, not a paragraph.
- **The diagram pane** is boxes, arrows and pointers drawn from the same data as the code (an array of cells, a queue, a data-flow of boxes): it **grows** as the narration reaches each part (cells arrive one by one, a pointer appears when it is named) and cells that are ruled out dim instead of disappearing.
- Never allowed: a screenshot or an image of code, fake or gibberish code, pretty-printing that changes the code between shots, a terminal skin with scanlines or glow, window chrome borrowed from a real operating system.

## 3. Colour
Two themes are invariants. **Dark is the default; light is the "rule of thumb" ending** and may carry a whole film. Same structure and roles in both.

| Role | Dark | Light | Means |
|---|---|---|---|
| Ground / panel / strip | `#0a0d13`→`#131925` / `#161b26` / `#1b2231` | `#e6e9f0`→`#f4f5f9` / `#ffffff` / `#eff2f8` | |
| Ink / dim / gutter | `#e4e8ef` / `#7e89a0` / `#4c576d` | `#1c2230` / `#667087` / `#a4acbd` | |
| **Add / right** | green `#3ddc84` | `#10a04e` | the new line, the correct result, a found value |
| **Remove / wrong / error** | red `#ff5d73` | `#d92d4a` | the old line (with a strike), a wrong result, an exit or crash |
| **Focus** | amber `#ffcc4d` | `#e8a000` | the band and left rail behind the lines being discussed; a ring on the one thing to look at |
| Explain | blue `#5aa9ff` | `#1d6fe0` | a chip that explains a value |
| Syntax | keyword `#c792ff`, function/call `#6cb6ff`, builtin `#4fd6c4`, number `#ff9e64`, string `#e6cf8b`, comment `#6e7a92`, operator `#93a4c4` | `#7c3aed`, `#0b5fd1`, `#007f74`, `#c2410c`, `#8a6300`, `#8791a5`, `#55638a` | |

- **Green, red and amber carry meaning only.** They never colour syntax, decoration or a pane. Syntax colours never carry meaning beyond the token's kind.
- **A name keeps one colour everywhere** (one hue per pointer or variable: code chip, diagram pointer and watch tile match).
- **Red is never alone**: wrong results also carry a word ("expected 4"), removed lines a `−` and a strike, so the film reads for colour-blind viewers.
- Dim lines drop to 28–35 % opacity, never to invisible.

## 4. Type
- **Mono: JetBrains Mono** (OFL), 24 px at 1080p for code with a 36 px line (1.5), 40 px for the big values in the watch tiles and the diagram cells. **UI sans: Inter** (OFL) for pane titles (14 px capitals, tracked), chips (21 px), notes under the diagram (23 px), tags, captions (34 px).
- Code is never below 22 px at 1080p. When it must be read in detail the camera zooms (about 2×); it is never shrunk to fit more.
- At most **16 code lines** are on screen, none longer than about 45 columns. A longer program is shown a function at a time.
- Reading time for any chip, note or label: non-space characters ÷ 15 + 1.5 s, fully in frame. Captions are burned in, 34 px on a rounded plate, one line, at the bottom, clear of every pane.

## 5. Motion
- **Typing is keystroke-timed**, with a caret. Code the viewer does not need to read yet (the first show of a file) may be typed at up to about 45 characters a second, with a beat of thought before each new block and a longer pause after each line. **Anything the viewer must read as it appears is typed no faster than 12 characters a second.** Indentation arrives with the new line; it is not typed.
- **Focus**: the band and rail slide to the next lines in 0.38 s (ease in/out) while everything else dims. There is a slide for every change of subject, and none inside a thought.
- **Value change**: a pointer glides in 0.5 s; the watch tile flashes amber and fades in 0.9 s; the variable and the diagram change together.
- **Chips** arrive in 0.3 s with a 16 px slide and leave the same way; they live at least their reading time.
- **Diff**: the new row grows in 0.6 s (green plate, `+`), both rows stay in view for at least 2 s, then the old row folds out (scale on its own centre, 0.7 s) and the new row's plate fades to a thin rail. The changed characters get a green underline or box. Line numbers stay stable.
- **Pane swap** (a new subject needs another pane): the editor slides left, new panes slide in from the right with a short stagger, 0.9 s. **Terminal split** (before / after): the old output keeps its place, the new run appears beside it.
- **Theme flip**: a diagonal wipe in 0.9 s, the same scene re-lit. Used once, as the turn from the story to the rule.
- Everything is a pure function of time; the same frame renders the same on any worker.

## 6. Camera grammar
- **The editor is locked.** No pans, no drift, no shake except one: a 3–5 px decaying jolt on the error.
- **Zoom on a token** (2.0–2.3×, 1.0 s in, 0.8 s out, ease in/out) to show one character or one condition. The zoom always keeps the whole line and its chip in frame and the zoom marker (amber ring) on the token; it goes through the same world-to-screen function as every pane.
- Pane swaps are the only other camera. No cuts, no fades between scenes inside the story; the end may fade to the ground colour.
- Zoom only when the subject is a few characters. If the viewer needs the whole function, focus, not zoom.

## 7. Sound palette
- **Foley is the keyboard and the machine**: soft key clicks (a band of noise around 2–3 kHz plus a 150–200 Hz thock, each key a little different), a deeper space bar and enter; a faint airy tick for every focus slide; glassy marimba-style ticks for pointer moves and chips, tuned to a pentatonic scale; a paper fold for the diff; a whoosh for pane swaps and zooms.
- **Verdicts are single sounds**: a bell for "it ran" and for each correct result (rising by a third each time), a low thud (about 50–120 Hz, dull noise tail, 0.9 s) for the error.
- **Score: an original calm loop**, about 88 BPM, in the instruments a late-night coding session would have: a soft electric piano (tine and body), a warm detuned pad, a rounded sub bass with upper harmonics so it speaks on laptops, quiet hats. Minor and sparse while the code is wrong, a curious eighth-note groove while it is traced, brighter and major once it is fixed, one held chord at the close.
- **Silence is a tool**: the typing opens on keys and room tone alone; the music drops out before the error lands, and again after the conclusion that the loop never looked.
- The voice is a calm, close narrator; music ducks about 5 dB under it; the film masters at −14 LUFS.

## 8. Native moves
- **Type it live** (caret, keystrokes) to introduce code. **Run it** (command typed in the terminal, output appears, a bell) to prove a claim.
- **Focus slide**: dim the world to light two lines. **Step trace**: pointer, value tile and focus line change in lockstep. **Chip with leader**: the number the line produces, beside the line.
- **Zoom on a token**: the one character that matters. **Diff fold**: old row struck and red, new row green, old folds out.
- **Before → after split** in the terminal, the same command twice. **Pane swap** when the subject moves from the code to the data it moves.
- **Theme flip** to the rule of thumb. **A rule table** (three rows, one verdict each) as the last image.

## 9. Pitfalls
- **The code must be correct and runnable exactly as shown.** Run it with the real interpreter, put the real output on screen (generate it from the run, as `verify.py` does), and assert in that script every number the voice-over mentions. If you cannot verify a snippet, do not show it.
- **Never type faster than it can be read** if the viewer is meant to read it as it appears; fast typing is for code that will be read after, line by line, with focus.
- **Never show real secrets**: keys, tokens, passwords, real hostnames, e-mail addresses, personal data. Use `example.com`, `sk-…`-free placeholders, and obviously invented values.
- Real products, libraries and logos appear only as imports and names in code; no logos, no screenshots of real sites.
- **Don't change the code between shots** except through a visible diff.
- Too many things at once: one idea per scene; at most three annotations (chips, pointers, ring) alive together.
- Red on red (a red chip on a red row), amber text on an amber band, a caption over the zoomed token.
- Ligatures that merge `<=`, `==`, `->`, `!=`: draw characters one at a time.
- Off-by-one in the film itself: keep the line numbers in the voice-over, chips and watch tiles consistent with the file (generate them from the trace).
- Reading time: a chip, note or tile that changes faster than non-space characters ÷ 15 + 1.5 s.

## 10. Range of variation
- Other languages (the tokenizer takes a keyword list and a comment marker), other problems: a function explained, an algorithm traced, a bug post-mortem, a code review (several diff hunks, comments as chips), an API tutorial (request in the editor, response in the terminal), an architecture tour (the diagram pane takes the lead and grows into boxes and arrows, the editor shows the file behind each box).
- Dark all the way, or light all the way, or dark with the light flip; vertical 1080×1920 with the panes stacked; no narration (captions and sound only); a longer film as a series of scenes on the same panes.
- Different diagrams: arrays and pointers, trees, call graphs, queues, request flows, a state machine. They must grow with the narration and dim what is ruled out.
- What may not change: real syntax colours, a focus system, the green / red / amber meanings, code that was run, characters drawn one at a time.

[Demo](DEMO.md)
