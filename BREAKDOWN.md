# Breaking down existing footage: launch events, keynotes, official demos, screen recordings

Use this when the user supplies **footage that already exists** (a launch event or keynote, an official demo, a product screen recording, a GitHub demo, a tutorial) and wants a news-style or product-introduction film that **uses that footage**, at its original speed and picture, and explains it: narration in their language, burned-in subtitles, pauses with zoom, highlight boxes and numbered callouts, drawings of our own that are always marked as interpretation, a source label, and a closing comparison or takeaway.

| If the user… | Use |
|---|---|
| has footage and wants it explained, annotated, summarised | **this guide** (style: [`styles/demo-breakdown/`](styles/demo-breakdown/)) |
| has an **article with its figures** (research post, news, product announcement, blog) and wants a film that quotes the text and shows the pictures, zoomed and annotated | **this guide, §8** (same style, same tools: `article.py`, `figure` and `quote` shots) |
| has a presenter talking to camera and wants explainer graphics drawn around them | [`TALKING-HEAD.md`](TALKING-HEAD.md) |
| admires a video and wants the *same shape* about their own topic, none of its footage | [`TEARDOWN.md`](TEARDOWN.md) |
| wants an existing video redone in a library style (REMAKE.md, if it exists in this checkout) | `REMAKE.md` |
| has no footage; wants a film about a topic | [`AGENTS.md`](AGENTS.md) workflow |

The footage is the user's. They are responsible for the right to use it: **put the rights note below in your delivery message, record source and licence in the project's `CREDITS`, and do not refuse or lecture.** If they gave no licence or permission, `CREDITS` says "TODO" in that field and you tell them to fill it in. Tools: [`tools/breakdown/README.md`](tools/breakdown/README.md). The normal directing and building rules still apply ([`DIRECTOR.md`](DIRECTOR.md), [`TECHNIQUE.md`](TECHNIQUE.md)); this guide is what changes.

> **Rights note (copy into the delivery message).** "The film uses footage you supplied. You are responsible for having the right to use it (the owner's licence or permission, platform terms, fair-use rules where you publish). `CREDITS` lists each clip's source and the licence or permission you gave; please check the TODO fields. Everything drawn on top (diagrams marked 解读示意, callouts, subtitles) is our own work and is not the source's."

## 1. The brief (one round of questions, DIRECTOR.md §1, plus)

Ask once, in one message; skip what the request already answers.

- **What footage?** File path(s). If they only have a link: say the tool can use `yt-dlp` only if it is already installed, platform terms are theirs to judge, and run it only when they say so (`ingest.py --url`). A video an hour long is normal (keynotes): then also ask for **3–5 moments** they care about, as times or as keywords you will search.
- **Which moments, and why?** The film is a selection, not a summary. Three to five moments, each answering "what happens on screen, what does the product or the AI do there, where does it apply".
- **The audience and the stance.** News brief (neutral: what was shown), product introduction (what it is for), or a critical read (what was shown and what was not). Default: neutral, with a "what was not shown" line at the end.
- **Language** for narration and subtitles (default: the one they write in; Chinese uses edge-tts Yunxi and needs a network connection) and the **aspect**: 16:9, 9:16, or both (`--vertical`).
- **Source sound**: keep the original speech under translated subtitles, duck it under the narration (default), or mute it.
- **Brand and logo material**: names as plain text are fine; their own logo files only if they say they have the right (DIRECTOR.md §12).
- **Length**: default 60–90 s; every extra minute is about 2 minutes of render and more checking.

## 2. Workflow

1. **Ingest** the footage: `.venv/bin/python tools/breakdown/ingest.py <video> --out work/<name> --lang zh|en` (transcript with times, scene cuts, on-screen text on macOS). Read `index.md`.
2. **Find the moments.** `find.py work/<name> "keyword" --top 5` for each topic; open the keyframes it prints; pick 10–30 s windows. Shorter is better: a clip should show one thing happening.
3. **Write the shot list as a triple for each moment**: *what happens* (the clip) → *what the AI or the product does* (the freeze, pointing at the evidence) → *where it applies* (an `explain` drawing, marked as interpretation). Then the hook, and a `compare` at the end.
4. **Write `TREATMENT.md`** (DIRECTOR.md §4): three candidate structures (for example: moment by moment; a before/after of one task; a question the footage answers), the one you chose, the shot list with seconds, and the narration. Do this before copying `breakdown.json`.
5. **Build.** `new.py films/<name> --source <video>`, edit `breakdown.json` (schema in the tools README), then `sh tools/breakdown/build.sh films/<name> [--vertical]`. Look at the first frames of each shot with `node core/render/still.mjs films/<name> <t> …` before the full render.
6. **Check** (DIRECTOR.md §11): read the build output (readcheck, lint, voice check, loudness), `<name>-check/check.md`, a contact sheet every 2 s, the freeze frames at full size; fill `FACTS.md` (every claim to its source time); listen once.
7. **Deliver**: `<name>.mp4`, `.srt`, posters, `CREDITS`, `FACTS.md`, `TREATMENT.md`, the project folder, and the rights note.

## 3. Shot types and how to use them

- **hook** (4–6 s). A promise in one line, over a dimmed frame of the footage if you like. A `big` word or number ("DAY 2.4") when the source has a series.
- **clip**. The source at its original speed, never re-timed, never cut inside (cut means two clips). 5–10 s each: a tag says what it is, a lower third names the product, a timecode runs under the tag. Use `highlights` for a box that follows nothing but marks a place for a while; use `pip` for a presenter in the corner. Total untouched footage should be roughly a third to a half of the film.
- **freeze**. Pause on the frame where the evidence is, and say so. Zoom with `crop` when the thing is small; dim the rest with `boxes`; number the parts with `markers`; use `arrows` for "this causes that"; put the one-sentence finding in the `card`. A freeze answers "what exactly are we looking at", not "what could this be".
- **explain**. Our own diagram: `flow` (nodes and arrows), `list`, `beforeafter`, `number`. It is **always** stamped 解读示意 (tag top-left in amber, dashed frame, stamp bottom-right) and carries a `basis` line saying which part of the source supports it. If something in it is a guess ("how it might work inside"), the basis says "推测". Never draw anything that could pass for the source's own slide or UI: different ground, different type, stamped.
- **compare**. The closing shot: what the footage showed against what it did not, a table, or a verdict. End on something the viewer can take away or check.

## 4. Narration rules

- **Say what the picture shows, then what part is the product's job, then where it applies.** In that order, in short sentences (about 4–5 characters a second; one idea per line; at most ~40 characters on a clip, because the clip's length is fixed).
- **Never attribute more than the footage proves.** "It reads the note and picks one of four labels" is a reading; "it uses a large language model" is a claim: leave it out unless the source says it, and then cite the second. Use "画面里", "演示里", "我们的理解是" for what you saw or inferred; use the source's own words for numbers, names and dates, from the transcript, checked against `FACTS.md`.
- **Label interpretation** every time: in the voice ("我们的理解是…", "演示里没说") and on screen (the stamp). A drawing never states a number the source did not.
- **Do not read the screen aloud.** The viewer sees the text; say what it means.
- **Keep dates, versions and prices out of the narration unless the source shows them**; if you add them, they come from an official page and are listed in `FACTS.md`.
- **Spell numbers the way they are said** (`speak`), keep them as digits in the subtitles (`say`). Listen to product names: Latin brand names are often mispronounced by the voice.
- Subtitle length is handled for you: cues are cut at punctuation to at most ~20 characters and held at least 1.4 s.

## 5. Look and layout

The layout is fixed (tools README: *The fixed layout*): do not move tags or subtitles per shot, and do not add text outside the system. Body text at least 36 px at 1080p. Dark green-black with a lime accent is the default, a light theme exists (`"theme": "light"`), and one palette object recolours everything. In 9:16 the footage is stacked above the annotations and the subtitles sit clear of the platform UI; check both with `lint.mjs`.

## 6. Pitfalls

- **Too much untouched footage, or too little.** A film of only clips is a repost; only drawings is a lie about the source. Alternate: clip (what), freeze (evidence), explain (so what).
- **Freezing a frame that is mid-transition** (blur, fade): scrub with `find.py` keyframes, then pick `t` on a frame where the UI has settled; check `work/stills/<id>.jpg`.
- **Normalised coordinates are fractions of the source frame**, not of the film: open the still and read them off; boxes near the edge of a 4:3 source sit inside bars.
- **Narration longer than the clip.** The tool speeds the line up to +22 % and warns beyond that: shorten the line or choose a longer window.
- **A drawing that looks official.** If a viewer could mistake it for a slide from the source, change its ground, its type or its stamp.
- **Voice mishears numbers and names** (speech-to-text check fails): put what it heard in `asr` only after you listened and the voice is right.
- **Rights.** Footage is not covered by the library's CC licences; the film is the user's, with their footage in it. Do not put LemoLab sign-offs or the library's logo on it.
- **Source audio**: a clip with `sound: keep` should not have narration over it (it is rarely intelligible); give it `subs` instead.

## 7. Commands in one place

```sh
.venv/bin/python tools/breakdown/ingest.py clip.mp4 --out work/clip --lang zh
.venv/bin/python tools/breakdown/find.py work/clip "关键词" --top 5
.venv/bin/python tools/breakdown/new.py films/<name> --source clip.mp4 [--aspect 9x16] [--theme light]
sh tools/breakdown/build.sh films/<name> --vertical
node core/render/still.mjs films/<name> 12.5 30 --size 1920x1080     # look at frames
node tools/breakdown/lint.mjs films/<name> --size 1920x1080
```

## 8. Articles with their pictures (图文解读)

The source is an **article and its figures** instead of footage: a research post, a news story, a product announcement, a blog post. The article's text becomes narration and **quote cards**; its own pictures (diagrams, charts, maps, screenshots, photos) are shown **zoomed and annotated** with the credit on screen. Everything else in this guide holds: fixed layout, `explain` drawings stamped 解读示意, narration that never claims more than the source, a closing takeaway with the source line. The article and its pictures are the user's responsibility (their licence or permission, the site's terms, fair use where they publish): put the rights note in the delivery message, keep `CREDITS` honest ("TODO" where no licence was given) and do not refuse or lecture.

**Brief** (one message): which article (a file, pasted text, or, only if the user says so, a URL: `article.py --url`), whose pictures (theirs, or from the page), who it is for and what to stress, the film language (quotes stay in the article's language), 16:9 / 9:16, length (default 60-90 s).

**Workflow**
1. `article.py <file.md|.txt|.html | --text - | --url …> --out work/article` → `article.json` (sections, paragraph ids `s2p3`, figures with captions and sizes) and `article.md`. Read `article.md`, then **look at every figure** (convert a webp to jpg to open it) and read coordinates off it.
2. Find the sentences worth quoting: `find.py work/article "keyword" --top 5` prints the sentence, its paragraph id and the figures near it. A quote's `text` must be the article's own words, verbatim.
3. Write `TREATMENT.md` (three candidate structures, DIRECTOR.md §4). Good shapes: *one picture, then the proof* (the article's central figure first, then its evidence); *section by section* (only for short articles); *claim and check*. About 6-8 shots in 75 s: hook → (quote → figure with callouts) × 2-3 → an original `explain` → takeaways (`compare`) with the source.
4. `new.py films/<name> --article work/article [--lang zh] [--aspect 9x16] [--theme light]` writes a first-draft shot list with every narration line a `TODO …`; replace them all (`prep.py` refuses to build while one is left), then `sh tools/breakdown/build.sh films/<name> [--vertical]`.
5. Check as in §2: `lint.mjs` (also reports text under 30 px and text covering a figure's boxes or markers), readcheck, the stills of every figure at full size (do the markers sit beside what they mark? is the zoom soft?), the credit under each figure, `FACTS.md` (every claim to its paragraph or figure).

**Shot types for articles**
- **`figure`**: one picture (`src` = its source id) on the fixed layout, never stretched. `crop [x,y,w,h]` zooms into a part (fractions of the whole picture); otherwise a slow push, or for a tall / very wide picture a deterministic scroll (`pan: "scroll"`, `scroll: [a,b]`). `boxes` (the rest dims), `arrows`, numbered `markers` (their texts are listed beside / under the picture, never on it), a `card` with the one-sentence finding, a `caption`. A credit plate ("图源：…") is on screen as long as the figure is; `layout` forces `side | wide | full` (default: whichever shows the focus largest). The narration of the section the picture illustrates goes in this shot's `say`.
- **`quote`**: one sentence of the article typeset big. `text` (verbatim), `ref` (paragraph id, for FACTS), `marks`: phrases of the text swept with a highlighter **when the narration says them** (timed from the voice file's pauses; in a translated film write `{ "text": "took me weeks", "at": "好几周" }`, `at` = the words of your narration). If `say` is the quote itself the burned-in subtitle is hidden (the `.srt` keeps it). The attribution (title · site · author · date) comes from `article`.
- `hook`, `explain`, `compare` as before; `hook.bg` may name an image source. `clip` and `freeze` stay available when the user also supplies footage.

**Narration.** Say what the picture shows, then what the article concludes from it; "the article says", "the figure shows", "our reading". Numbers, names and dates only from the text or from what is legible in a picture. A quote card is a claim by the author: never edit it, never merge two sentences, mark omissions with "…".

**Pitfalls.** Markers placed on top of what they mark (put them next to it); a crop of a small picture magnified past ~2.5× (prep warns: it will look soft); a long caption that squeezes the credit (the credit is shortened last); an extracted page that includes "related posts" at the end (delete those sections from `article.json` before `new.py`); narration longer than the quote's reading time says it needs; forgetting that pictures on a page are usually someone else's: fill in `licence` and `credit` in `breakdown.json`.

```sh
.venv/bin/python tools/breakdown/article.py post.md --out work/article --meta site=Example licence="CC BY 4.0"     # or --text - < pasted.txt, or --url https://… (explicit, public pages only)
.venv/bin/python tools/breakdown/find.py work/article "keyword" --top 5
.venv/bin/python tools/breakdown/new.py films/<name> --article work/article --lang zh
sh tools/breakdown/build.sh films/<name> --vertical
```

