# Paper Annotation · 论文解读体

> A real-looking page on a dark desk, read aloud: the camera pushes into the sentence being discussed, a highlighter sweeps it, a red pen rings the numbers that matter, and note cards beside the page say in one line what that part claims, how well it is supported and where it fails.
> References (grammar only):
> - Reading-group and journal-club screen recordings of annotated PDFs.
> - Academic typesetting: a serif face, a centred title block, an abstract, numbered sections, figures and tables with captions.
> - Study-video overlays: highlighter, margin notes, checklists.
>
> Nothing is copied from these: no real paper, journal template, logo or layout.

## 1. What it is

The document is the picture, and a **reader** works on it in front of the viewer. What you see in one frame: a dark charcoal desk with a soft light in the middle, an ivory page with a serif text block that is big enough to read, a yellow highlight under part of one sentence, a hand-drawn red ring, a stack of light note cards on the right with a coloured edge, and a dark caption pill at the bottom.

Not Code Walkthrough (code, a monospaced editor, line numbers), not Living Screencast (an app on screen), not Whiteboard Explainer (drawn from nothing; here the text already exists and is *read*). The style is for **critical reading**: every note names a claim, a piece of evidence or a limit.

## 2. Look

- **Desk**: near-black charcoal (`#14161a` to `#272b32`) with a radial lift in the centre and faint grain. Nothing else is on it; no props.
- **Page**: ivory (`#f7f4ea`), a soft diagonal sheen, a 40 px blurred shadow with a 14 px drop. About 720 × 930 units; real text is typeset in a serif face (17 to 27 units for body and title, 13 for footnotes), flowed word by word, so highlights can follow the exact words. Filler text is shown as **grey bars**, never as invented prose.
- **Typesetting**: a centred title in bold, authors in italic, a bold "Abstract" label, a justified-looking paragraph at 26-unit leading, numbered headings in bold, figure and table captions in italic, a table with three horizontal rules and no vertical ones, a footer with a page number.
- **Highlighter**: translucent yellow (`#ffe14d`, multiply, 0.75) rounded bars under the words, one per text line, swept left to right along the text in 1.5 to 3 s.
- **Red ring**: a hand-drawn ellipse (stroke 3.5, wobble about 3 %) round a number or a column header, drawn on in about 0.7 s and slightly overshooting its start.
- **Note cards** (screen space, not zoomed): off-white rounded cards (radius 18) with a soft shadow and a 12 px edge in the note's colour; a title in that colour, a body of one line in dark ink. The current note is large; earlier notes shrink to one-line **chips** in dark grey under it, newest first.
- **Anchor line**: a dotted curve from the card to the end of the highlighted text, ending in a dot.
- **Never**: the paper in any perspective tilt, a page filling the whole frame with unreadable text, invented body prose presented as real, highlights that cover the figure or table numbers they talk about.

## 3. Colour

- Desk and card ground: charcoal and ivory. **Ink** `#23262b`.
- **Roles**: yellow = the sentence under discussion; red = a number or a weak point (a ring, a warning card); blue = the method (a card edge, a bar); green = evidence and success (checks, the supported claim); amber = problem and limitation labels.
- One colour per role for the whole film. Text on cards is always dark ink; text on the desk is `#eef1f6`.

## 4. Type

- **Paper**: a text serif (Source Serif 4 or similar OFL) at the sizes above; the film zooms into it, so the text must be legible at 1.5 to 1.9×.
- **Notes and captions**: a CJK sans (Noto Sans SC or similar) at 700 for card titles (30 px) and 500 for bodies (34 px); big stat numbers at 76 px.
- **Caption pill**: 46 px, `rgba(8,10,14,.9)`, 2 px grey outline, centred at the bottom, at most two lines, cut at the punctuation nearest the middle.
- **HUD** (top-left, on a dark rounded plate so it reads over the page): the film title and the current step in amber. **Badge** (top-right) when the document is fictional: an amber pill saying so, present for the whole film.
- Reading-time rule applies to cards and badges; voice-synced captions follow the speech and are exempt (say so in the notes).

## 5. Motion

- The page rises into place (a 120 px drift and a fade, 1 s). A **page turn** slides the next page in from the right over the previous one (about 1 s, ease-out), with the camera pulling out to the overview at the same time.
- Highlights and rings are drawn on, never faded in. Note cards pop in with a slight scale (0.94 to 1) and a fade in 0.35 s; the previous card drops to a chip.
- Bars in a figure grow from the axis over 1.2 s, the second bar a little after the first.
- A slow drift of the camera (a couple of pixels, a sine) keeps a held shot alive.

## 6. Camera grammar

| Move | What it expresses |
|---|---|
| Overview (the whole page at about 1×) | the opening, the page turn, the summary |
| Push-in on a sentence (1.55 to 1.9×, centred on the text, shifted left so the note column is free) | "read this" |
| Slide along (the focus moves a few dozen units between sentences) | the next sentence of the same paragraph |
| Pull back | the end of a section, a new page |

The note column and the HUD are screen-space and do not zoom. No rotation, no shake.

## 7. Sound palette

- **Score**: warm and quiet: an electric-piano chord on each bar (a major-seventh family, 80 to 90 BPM), a soft bass on beats 1 and 3, a brush on the off-beats, a sparse upper figure; it ducks under the voice.
- **Foley**: a paper rustle when the page arrives, a marker squeak (band-passed noise with a stuttering envelope) under every highlight sweep, a pen scribble under every ring, a soft pop and a bell tone for a note card, a tick for a checked box, a page-flip swish for a turn, a thump for a stamp or badge, a plucked chord for the closing line.
- Voice: a clear, even narrator, compressed, about 10 dB above the music.

## 8. Native moves

- **Say the claim, then test it**: open on the headline claim, then take the reader through question, method, evidence, comparison, limit.
- **Mark, then ring**: sweep the sentence in yellow, then ring the number inside it in red.
- **Margin note**: a card states in six words what the sentence means; it does not repeat it.
- **Callout the baseline**: ring the column or word that shows what the result is compared to.
- **Chips as memory**: earlier notes shrink to a list so the viewer sees the argument accumulate.
- **Close on a checklist**: the questions the viewer can reuse, ticked one by one.

## 9. Pitfalls

- **Inventing a real paper**: a demo that looks like a real paper must be labelled fictional on screen and in the footer, with invented numbers made consistent (averages that match the table). A real paper needs its source, and only the parts the licence allows.
- **Unreadable text**: at 1× a paragraph of 17-unit type is too small; push in before reading it aloud.
- **The note column over the page**: at high zoom the page runs under the cards; cards and chips are opaque so nothing shows through.
- **Overlapping table captions and headers**: leave 10 units between caption, group header and rules; a zoom makes every collision obvious.
- **Highlights drawn over the wrong words**: lay out the text word by word and take the boxes from the layout, not from guessed coordinates.
- **A critique that is only decoration**: every card must say a claim, a support or a limit. If it only repeats the sentence, delete it.
- **HUD unreadable on the page**: put it on a dark plate.

## 10. Range of variation

You choose the document (a paper, a contract clause, a policy, a news article, a textbook page), the number of pages, the claims and notes, the colour roles within the palette, the voice and the length (45 to 90 s). The reading order can follow the document or jump to the most surprising line first.

Far from our demo:
- **A contract clause** where the reader rings the dates and the penalty, and the notes are "what it means for you" in plain words.
- **A news article** read for its sources: each quoted claim gets a card saying who said it and whether it can be checked.
- **Two pages side by side** (a claim and its rebuttal), the camera moving between them with a connecting line.

---

How our demo was made (story, pages, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
