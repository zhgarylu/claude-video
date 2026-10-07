# tools/breakdown: films that break down existing footage

Footage the user supplies (a launch event, a keynote, an official demo, a product recording, a GitHub demo, a tutorial) is used **at its original speed and picture**. The film adds Chinese narration (or another language), burned-in subtitles, freeze-frame breakdowns (pause, zoom, highlight box, numbered callouts), original explanatory drawings that are always stamped as interpretation, a source label and a closing comparison. The agent guide is [`BREAKDOWN.md`](../../BREAKDOWN.md); the style is [`styles/demo-breakdown/`](../../styles/demo-breakdown/).

```sh
.venv/bin/python tools/breakdown/ingest.py <video> --out work/keynote            # transcript, scene cuts, on-screen text → index.json
.venv/bin/python tools/breakdown/find.py work/keynote "agent" --top 5            # candidate in/out seconds, sentence, keyframe
.venv/bin/python tools/breakdown/new.py films/<name> --source <video>            # project: page template + breakdown.json with one shot of each type
sh tools/breakdown/build.sh films/<name> [--vertical]                            # everything below, one command
```

| File | What it does |
|---|---|
| `ingest.py <video>\|--url … --out dir` | Probe; transcript with word times (faster-whisper, `--lang`, `--model small`); scene cuts; keyframes every 3-8 s; OCR of on-screen text (macOS Vision, the helper `tools/teardown/ocr.swift`; skipped elsewhere); writes `index.json`, `index.md`, `transcript.txt`. `--url` runs `yt-dlp` only if it is already on the PATH (never installed) and prints the rights note. |
| `find.py <dir> "phrase" [--top 5] [--min 8] [--max 30] [--json]` | Searches speech and screen text (Chinese by characters and pairs, others by words), clusters hits, snaps to scene cuts, prints `{"in","out"}` seconds, the sentence, the on-screen text and a keyframe path. |
| `new.py <project> --source <video>…` | Copies `template/` (`index.html`, `main.js`), puts the footage in `src/` (`--link` links instead of copying), writes a first `breakdown.json`. |
| `prep.py <project>` | Validates the spec; voice (`core/tts/tts_zh.py`, edge-tts Yunxi by default) and its speech-to-text check; cuts every clip to JPEG frames at 24 fps and every freeze to one still; extracts each clip's own sound; computes `timeline.json` (shot times, reveal time of every element, subtitle cues) from the narration lengths and the reading-time rule; writes `CREDITS` and a `FACTS.md` skeleton (never overwritten). A clip whose narration is too long is sped up to +22 % and re-voiced; beyond that it warns. |
| `mix.py <project>` | Voice, each clip's own sound (`mute`, `duck` = 13 dB down under the voice, `keep`), a quiet music bed (A minor pad, soft pluck, sub; ducked 8 dB under the voice, 12 dB more under a kept clip), light foley from the page's events (shutter, ticks, whooshes, pops). |
| `lint.mjs <project>` | Samples the page every 0.25 s; reports text boxes that overlap, leave the frame, or run into the subtitle band. |
| `build.sh <project> [--vertical]` | prep, events, readcheck, lint, mix, `.srt`, render, master to −14 LUFS, a 16:9 and a 9:16 poster, `tools/check.py`. `--vertical` also renders the 9:16 film. Environment: `NAME`, `OUT_DIR`, `NOVOICE=1`, `WORKERS`. |
| `lib/` | The page code: `render.js` (assembles the film and the fixed chrome), `shots.js` (the five shot types), `footage.js` (zoomed views, boxes, spotlight), `source.js` (lazy frame loader; PiP via `tools/talk/host.js drawPip`), `layout.js` (16:9 and 9:16 geometry), `theme.js`, `draw.js`. |

## The fixed layout

Every shot shares it, so nothing jumps. 16:9 (1920×1080): tag plate top-left (what the picture is: the source label on footage, the amber **解读示意 · 非官方画面** on our own drawings, the series name on the hook); section tag and progress bar top-right; a small timecode chip under the tag (the running source time, or "已暂停"); picture-in-picture under the section tag; lower third bottom-left and callout cards in two fixed slots above the subtitle band; subtitles in a fixed band at the bottom. 9:16 (1080×1920): footage in a band at the top, annotations (cards, marker legend) under it, subtitles at y ≈ 1500 above the platform UI, nothing text-like in the bottom 330 px. Body text is 36–40 px at 1080p (annotation cards 40, subtitles 54), tags 32–34.

## breakdown.json

```jsonc
{ "title": "…", "series": "实录解读", "lang": "zh", "aspect": "16x9", "fps": 24,
  "theme": "dark",                       // "dark" | "light" | { "base": "dark", "accent": "#7CE0FF", "accentInk": "#04121A", … } (theme.js lists every key)
  "voice": { "name": "zh-CN-YunxiNeural", "rate": "+0%" },
  "music": { "bpm": 92, "level": 1.0 },
  "tag": "官方演示 · 节选",               // the default source label on clip and freeze shots; a shot's own "tag" overrides
  "sources": { "main": { "file": "src/talk.mp4", "title": "…", "url": "…", "licence": "…", "credit": "…", "note": "…" } },   // → CREDITS
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

Coordinates are fractions of the source frame (`[0.5, 0.5]` is the middle), so boxes and arrows follow the zoom. Look at the freeze still (`work/stills/<id>.jpg`) to read them.

## Outputs

`<name>.mp4` (−14 LUFS), `<name>.srt`, `poster.jpg`, `poster-9x16.jpg`, `<name>-9x16.mp4` with `--vertical`, `CREDITS`, `FACTS.md`, `timeline.json`, `<name>-check/check.md`. Not committed anywhere by the tools.

## What the web version needs

Inputs: the footage file(s) (mp4/mov/webm, any length; for hour-long files the user also gives in/out seconds or a keyword), a `breakdown.json` (or a request to write one from a keyword search), a theme and aspect. Runtime: Node 20 with headless Chrome (a render of a 70 s film is about 2 minutes on 3 workers), ffmpeg, Python with numpy/scipy/soundfile/soxr/pillow; faster-whisper (voice tier) for ingest and the voice check, an internet connection for edge-tts, Noto Sans SC (17 MB, cached); on-screen text search needs macOS Vision, so a Linux server should skip OCR (transcript only) or add an OCR engine. Outputs: the files above. Disk: about 1.5 MB of JPEG frames per second of clip at 1080p during the render (deletable afterwards).
