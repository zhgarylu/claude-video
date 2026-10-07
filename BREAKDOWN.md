# Breaking down existing footage: launch events, keynotes, official demos, screen recordings

Use this when the user supplies **footage that already exists** (a launch event or keynote, an official demo, a product screen recording, a GitHub demo, a tutorial) and wants a news-style or product-introduction film that **uses that footage**, at its original speed and picture, and explains it: narration in their language, burned-in subtitles, pauses with zoom, highlight boxes and numbered callouts, drawings of our own that are always marked as interpretation, a source label, and a closing comparison or takeaway.

| If the user… | Use |
|---|---|
| has footage and wants it explained, annotated, summarised | **this guide** (style: [`styles/demo-breakdown/`](styles/demo-breakdown/)) |
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
