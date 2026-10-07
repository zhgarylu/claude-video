# tools/breakdown: films that break down existing footage

**Footage or an article.** Footage the user supplies (a launch event, a keynote, an official demo, a product recording, a GitHub demo, a tutorial) is used **at its original speed and picture**. The film adds Chinese narration (or another language), burned-in subtitles, freeze-frame breakdowns (pause, zoom, highlight box, numbered callouts), original explanatory drawings that are always stamped as interpretation, a source label and a closing comparison. The same tools also make a film from an **article and its pictures** (quote cards from the article's text, its figures shown zoomed and annotated with the credit on screen: [`BREAKDOWN.md`](../../BREAKDOWN.md) §8). The agent guide is [`BREAKDOWN.md`](../../BREAKDOWN.md); the style is [`styles/demo-breakdown/`](../../styles/demo-breakdown/).

```sh
.venv/bin/python tools/breakdown/ingest.py <video> --out work/keynote            # transcript, scene cuts, on-screen text → index.json
.venv/bin/python tools/breakdown/find.py work/keynote "agent" --top 5            # candidate in/out seconds, sentence, keyframe
.venv/bin/python tools/breakdown/new.py films/<name> --source <video>            # project: page template + breakdown.json with one shot of each type
sh tools/breakdown/build.sh films/<name> [--vertical]                            # everything below, one command

# an article and its pictures instead of footage
.venv/bin/python tools/breakdown/article.py post.md --out work/article            # or --text - (stdin), or --url https://… (explicit flag, public pages only)
.venv/bin/python tools/breakdown/find.py work/article "keyword" --top 5           # sentences, paragraph ids, nearby figures
.venv/bin/python tools/breakdown/new.py films/<name> --article work/article [--lang zh]   # first-draft shot list, every narration a TODO
```

| File | What it does |
|---|---|
| `ingest.py <video>\|--url … --out dir` | Probe; transcript with word times (faster-whisper, `--lang`, `--model small`); scene cuts; keyframes every 3-8 s; OCR of on-screen text (macOS Vision, the helper `tools/teardown/ocr.swift`; skipped elsewhere); writes `index.json`, `index.md`, `transcript.txt`. `--url` runs `yt-dlp` only if it is already on the PATH (never installed) and prints the rights note. |
| `find.py <dir> "phrase" [--top 5] [--min 8] [--max 30] [--json]` | Searches speech and screen text (Chinese by characters and pairs, others by words), clusters hits, snaps to scene cuts, prints `{"in","out"}` seconds, the sentence, the on-screen text and a keyframe path. |
| `new.py <project> --source <video>…` | Copies `template/` (`index.html`, `main.js`), puts the footage in `src/` (`--link` links instead of copying), writes a first `breakdown.json`. |
| `prep.py <project>` | Validates the spec; voice (`core/tts/tts_zh.py`, edge-tts Yunxi by default) and its speech-to-text check; cuts every clip to JPEG frames at 24 fps and every freeze to one still; extracts each clip's own sound; computes `timeline.json` (shot times, reveal time of every element, subtitle cues) from the narration lengths and the reading-time rule; writes `CREDITS` and a `FACTS.md` skeleton (never overwritten). A clip whose narration is too long is sped up to +22 % and re-voiced; beyond that it warns. |
| `mix.py <project>` | Voice, each clip's own sound (`mute`, `duck` = 13 dB down under the voice, `keep`), a quiet music bed (A minor pad, soft pluck, sub; ducked 8 dB under the voice, 12 dB more under a kept clip), light foley from the page's events (shutter, ticks, whooshes, pops). |
| `lint.mjs <project>` | Samples the page every 0.25 s; reports text boxes that overlap, leave the frame, or run into the subtitle band, text set under 30 px, and text that covers a figure's boxes or markers (`window.FOCUS`). |
| `build.sh <project> [--vertical]` | prep, events, readcheck, lint, mix, `.srt`, render, master to −14 LUFS, a 16:9 and a 9:16 poster, `tools/check.py`. `--vertical` also renders the 9:16 film. Environment: `NAME`, `OUT_DIR`, `NOVOICE=1`, `WORKERS`. |
| `article.py <file\|--text -\|--url …> --out dir` | An article (.md / .txt / .html, pasted text, or with the explicit `--url` flag a public http(s) page) -> `article.json` (title, author, date, site, sections with headings and paragraphs with ids `s2p3`, figures with file, alt, caption, size, section), `article.md` and `figures/f1.png …`. Local pictures are read only from the article's own folder tree; with `--url` the page and each picture go through `netguard.py`. `--meta title=… site=… author=… date=… url=… licence=…` overrides what the page says; `--max-images 12 --max-mb 25`. Prints the rights reminder. |
| `find.py <article dir> "phrase"` | On a folder with `article.json` it finds **sentences**: paragraph id, section, the sentence to paste into a `quote` shot, the figures in that section. |
| `new.py <project> --article dir [--lang zh]` | Project with a first-draft shot list that follows the guide's structure (hook, then per section a quote and its figures, one original diagram, takeaways with the source). Every narration and label is `TODO …`: `prep.py` refuses to build until they are replaced. |
| `imgprep.py` | Still-image sources: `check_image` (png / jpg / webp only; svg refused; at most 6000 px a side, 25 MB, 40 megapixels, must decode and the content must match the extension) and `prepare_image` (EXIF-rotated, downscaled to 4096 px, jpg or png when it has real transparency). |
| `netguard.py` | The fetcher behind `--url`: http / https, ports 80 / 443, no credentials, the host resolved here and **every** address must be public (private, loopback, link-local, CGNAT, multicast, mapped IPv6 and odd numeric hosts are refused), the connection goes to the checked address, redirects re-checked hop by hop (4 max), `Accept-Encoding: identity`, byte cap, deadline, content-type allow-list. |
| `align.py` | Word timing without a recogniser: clauses at punctuation matched to the voice file's pauses, characters weighted inside a clause. Used for the highlight sweep of `quote` marks (an estimate, usually within 0.1-0.2 s). |
| `lib/` | The page code: `render.js` (assembles the film and the fixed chrome), `shots.js` (hook, clip, freeze, explain, compare), `figure.js` (the article shots `figure` and `quote`), `footage.js` (zoomed views, boxes, spotlight), `source.js` (lazy frame loader; PiP via `tools/talk/host.js drawPip`), `layout.js` (16:9 and 9:16 geometry), `theme.js`, `draw.js`. |

## The fixed layout

Every shot shares it, so nothing jumps. 16:9 (1920×1080): tag plate top-left (what the picture is: the source label on footage, the amber **解读示意 · 非官方画面** on our own drawings, the series name on the hook); section tag and progress bar top-right; a small timecode chip under the tag (the running source time, or "已暂停"); picture-in-picture under the section tag; lower third bottom-left and callout cards in two fixed slots above the subtitle band; subtitles in a fixed band at the bottom. 9:16 (1080×1920): footage in a band at the top, annotations (cards, marker legend) under it, subtitles at y ≈ 1500 above the platform UI, nothing text-like in the bottom 330 px. Body text is 36–40 px at 1080p (annotation cards 40, subtitles 54), tags 32–34.

## breakdown.json

```jsonc
{ "title": "…", "series": "实录解读", "lang": "zh", "aspect": "16x9", "fps": 24,
  "theme": "dark",                       // "dark" | "light" | { "base": "dark", "accent": "#7CE0FF", "accentInk": "#04121A", … } (theme.js lists every key)
  "voice": { "name": "zh-CN-YunxiNeural", "rate": "+0%" },
  "music": { "bpm": 92, "level": 1.0 },
  "tag": "官方演示 · 节选",               // the default source label on clip and freeze shots; a shot's own "tag" overrides
  "sources": { "main": { "file": "src/talk.mp4", "title": "…", "url": "…", "licence": "…", "credit": "…", "note": "…" },   // → CREDITS
               "f1": { "file": "src/f1.png", "caption": "…", "credit": "Site · Article", "url": "…", "licence": "…" } },       // a still image (png / jpg / webp) is a source too: used by figure shots; "credit" is printed on screen
  "article": { "title": "…", "author": "…", "site": "…", "date": "…", "url": "…", "licence": "…", "note": "…" },          // article films: the attribution of quote cards and the CREDITS entry
  "labels": { "figure": "…", "quote": "…", "credit": "图源：", "from": "出自：" },                                        // optional: the fixed labels of figure and quote shots (default: Chinese or English by "lang")
  "sections": ["第一个看点", "第二个看点"],    // the top-right tag; a shot says which with "section": 1
  "shots": [ … ] }
```

Common to every shot: `id` (unique, `[A-Za-z0-9_-]`), `type`, `section`, `say` (the narration, also the subtitle text), `speak` (how to read it aloud when different: numbers, names), `asr` (what speech-to-text is allowed to hear), `rate`, `say_at` (seconds into the shot where the voice starts), `dur` (minimum length for non-clip shots), `src` (which source; default the first). Times in `sched` are computed; give an item its own `time` (seconds from the shot start) to override the automatic spread over the narration.

| `type` | Fields |
|---|---|
| `hook` | `kicker`, `big` (a very large word or number: "DAY 2.4"), `title`, `sub`, `meta` (chips: source, date), `bg: {src, t}` (a dimmed footage frame behind) |
| `clip` | `in`, `out` (source seconds; the clip plays exactly this, at original speed), `sound`: `mute` \| `duck` (default with narration) \| `keep`, `lower: {title, sub}`, `highlights: [{t0, t1, rect:[x,y,w,h], label}]` (rect normalised 0–1 in the source frame; t relative to the clip), `pip: {src, in, label}`, `subs: [{at, to, text}]` (your own subtitles for the clip's speech; relative seconds) |
| `freeze` | `t` (source second), `crop: [x,y,w,h]` (zoom into this normalised rect), `boxes: [{rect, label, pos:"b", time}]` (the rest of the picture is dimmed; `spot: false` turns that off), `arrows: [{from:[x,y], to:[x,y], label, time}]`, `markers: [{n, at:[x,y], text, dir:"r\|l\|u\|d"}]` (in 9:16 they become a numbered list under the picture), `card: {side:"l\|r", title, body, time}` |
| `explain` | `kind`: `flow` (`nodes: [{id, label, sub, emph}]`, `edges: [[from,to,label]]`; default chain), `list` (`items: [{head, body}]`), `beforeafter` (`before`/`after: {title, lines[]}`), `number` (`value`, `label`, `note`); `title`; **`basis`** (what in the source supports it: printed under the drawing) |
| `compare` | `title`; `left`/`right` or `cols: [{title, items[], hot}]`, or `table: {head[], rows[][]}`; `verdict`; `basis` |
| `figure` | `src` (an image source; default: the only one), `crop: [x,y,w,h]` (zoom into this part; fractions of the whole picture), `boxes: [{rect, label, time}]` (the rest dims; `spot: false` turns it off), `arrows: [{from, to, label}]`, `markers: [{n, at:[x,y], text}]` (numbered; the texts are listed beside / under the picture), `card: {title, body, time}`, `caption` (default: the source's), `credit` (default: the source's `credit`), `pan: "auto"\|"push"\|"scroll"`, `scroll: [a,b]` (the part of a tall / wide picture to travel through), `layout: "side"\|"wide"\|"full"`, `matte: "white"` (white backing for a transparent picture). The credit plate is always drawn. |
| `quote` | `text` (the sentence, verbatim), `ref` (paragraph id), `marks: ["phrase" \| {text, at}]` (highlighted when the narration says it; `at` = the words of the narration, for a translated film), `by` (attribution override), `nosub: true` (hide the burned-in subtitle; automatic when `say` equals `text`), `size` (start size). |

Coordinates are fractions of the source frame (`[0.5, 0.5]` is the middle), so boxes and arrows follow the zoom. Look at the freeze still (`work/stills/<id>.jpg`) to read them.

## The layout of an article film

The same fixed frame (tag plate with 原文配图 / 原文摘录, section tag, subtitle band). **figure**: the picture sits in a plate and is never stretched; `side` (16:9, picture left 1160×672, card and the numbered legend in a column on the right), `wide` (picture across the frame, card and legend in a row under it) or `full` (nothing to annotate), whichever shows the focus largest; 9:16 stacks the picture on top, the credit plate under it, then card and legend above the subtitle area. The only labels on the picture are box labels, placed beside their box where they cover no other box or marker. **quote**: one panel, the sentence at 74 px (46 px minimum in 16:9; 62 / 44 in 9:16), an oversized opening mark, a rule and the attribution line.

## Outputs

`<name>.mp4` (−14 LUFS), `<name>.srt`, `poster.jpg`, `poster-9x16.jpg`, `<name>-9x16.mp4` with `--vertical`, `CREDITS`, `FACTS.md`, `timeline.json`, `<name>-check/check.md`. Not committed anywhere by the tools.

## What the web version needs

Inputs: the footage file(s) (mp4/mov/webm, any length; for hour-long files the user also gives in/out seconds or a keyword), a `breakdown.json` (or a request to write one from a keyword search), a theme and aspect. Runtime: Node 20 with headless Chrome (a render of a 70 s film is about 2 minutes on 3 workers), ffmpeg, Python with numpy/scipy/soundfile/soxr/pillow; faster-whisper (voice tier) for ingest and the voice check, an internet connection for edge-tts, Noto Sans SC (17 MB, cached); on-screen text search needs macOS Vision, so a Linux server should skip OCR (transcript only) or add an OCR engine. Outputs: the files above. Disk: about 1.5 MB of JPEG frames per second of clip at 1080p during the render (deletable afterwards).
