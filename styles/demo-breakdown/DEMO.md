# Demo Breakdown — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *One Button, Sorted Notes* (75 s) · `demo-breakdown.mp4` · source in [`demo/`](demo/)

## Story & structure

Logline: a viewer sees an invented note app tidy eight messy notes with one click, then learns what the clip proves, what is only our guess, and what the demo never said.

The film is made the way a user's film is: a `breakdown.json` over supplied footage. The footage (`demo/src/footage.mp4`, 30 s, 1.3 MB) is itself drawn in code by `demo/footage/` so that the library holds no third-party material; the app, its name ("小格笔记", Kege Notes) and its notes are invented, and every tag says "演示原片 · 虚构产品".

Arc: hook → three moments, each as *what happens* (clip) → *what the product does* (freeze) → *where it applies* (explain) → a closing comparison.

| Moment | What happens (clip) | What the product does (freeze) | Where it applies (explain) |
|---|---|---|---|
| 01 点一下就归类 | the button is pressed, eight notes get labels | boxes on the sidebar counts and the label column, a card "画面能确认的" | a three-node flow, stamped as a guess |
| 02 它先问你 | a suggestion pops up, the user accepts | zoom into the popover, two numbered markers, a card "先问，再动手" | – |
| 03 以后自动做 | settings, switch on (source sound kept, own subtitles), a new note gets its label by itself | – | a list of three sentences |

Native moves spent: *pause on the evidence* (c1→f1, c2→f2), *zoom into the detail* (f2), *number the parts* (f2), *redraw it as a flow and say it is a guess* (e1), *close on what was not shown* (cmp). A highlight box on a clip (c2), a lower third (c1), source sound `keep` with own subtitles (c3), `duck` under narration (the rest).

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| hook | 0.0–6.0 | title card over a dimmed frame of the footage | locked | kicker, title, sub, two meta chips |
| c1 | 6.0–13.0 | clip 0:02–0:09: the button, the spinner, labels appear | locked, original speed | lower third "小格笔记 · 智能归类" |
| f1 | 13.0–22.3 | freeze 0:10.9, two spotlight boxes, a card | pause + flash | pause on the evidence |
| e1 | 22.3–31.4 | explain / flow: 读便签 → 猜分类 → 贴标签、分组 | – | stamped 解读示意; basis "内部流程为推测" |
| c2 | 31.4–37.0 | clip 0:12.8–0:18.4: suggestion, accept | locked | highlight box "接受" |
| f2 | 37.0–45.2 | freeze 0:15.5 zoomed into the popover, two markers, a card | zoom 0.95 s | zoom + number the parts |
| c3 | 45.2–50.4 | clip 0:19–0:24.2: settings, switch on | locked | source sound kept, own subtitles |
| c4 | 50.4–56.0 | clip 0:24.4–0:30: a new note is typed, labelled by itself | locked | – |
| e2 | 56.0–66.5 | explain / list: what happened, what the product did, where it applies | – | the triple, stamped |
| cmp | 66.5–75.1 | compare: seen vs not said, verdict plate | – | close on what was not shown |

## Score structure

A minor, 92 BPM, no drums: a soft pad on Am9 – Fmaj7 – C – G6, a slow pluck line from bar 2, a sub on the bar, brush ticks from bar 3. The bed sits 8 dB under the narration and a further 12 dB under c3, whose own UI sounds (clicks, key taps, a toast ding; made in `demo/footage/mix.py`) are kept. Foley: a shutter click and thump on each freeze, ticks on boxes, pops on markers, a short ding on cards and the verdict, soft whooshes on cuts and the zoom. Narration: edge-tts `zh-CN-YunxiNeural`, levelled to RMS 0.11.

## Palette & props

Dark theme: ground `#08110D` / `#102019`, panel `#13241B`, ink `#EEF6EF`, accent lime `#B8F03C`, interpretation amber `#F6C453`. The invented app uses cream paper `#FBF8F1`, teal `#1FA38A` and four label colours (work blue, life orange, idea violet, to-do red). No real brand, logo or UI is imitated.

## End card

None: the film ends on the verdict plate. Unlike a user's film this library demo carries no sign-off on screen; credits are in `demo/CREDITS`.

## Build notes

- `demo/footage/` is the source footage's own page (`render(t)`, events, UI sounds): `sh styles/demo-breakdown/demo/footage/build.sh` writes `demo/src/footage.mp4`. This stands in for the screen recording a user would supply.
- `demo/breakdown.json` is the film; `demo/index.html` + `main.js` are the template page (`tools/breakdown/template/`). `sh styles/demo-breakdown/demo/build.sh` runs `tools/breakdown/build.sh` and copies the outputs to the style folder.
- Voice lines that Whisper mis-hears ("便签" → "变迁", "归类" → "规类") carry an `asr` field with what the model heard; the narration itself was not listened to by the person who wrote the tool.
- Pitfall specific to this demo: the fictional app's controls sit in the middle of its toolbar and its logo at the bottom of the sidebar, because the film's tags and timecode cover the top-left and top-right corners of every clip. A real recording has no such courtesy: pick windows where the action is not under a tag, or move the film's tag with a different `tag` text and shorter section labels.

---

# The article demo — *两种数法，一张风险图* (67 s) · `demo-breakdown-article.mp4` · source in [`demo/article/`](demo/article/)

The second film of this style shows the **article-and-figures** mode (BREAKDOWN.md §8). Nothing in it is third-party: the article (`demo/article/source/article.md`, "潮汐笔记", about a made-up bay and two ways of counting its reefs) is invented text, and its two figures are drawn in code by `demo/article/make_figures.py` (an overlap diagram with 44 / 30 / 17 points, and a twelve-zone map coloured by invented risk). Every tag says so ("虚构"). The first demo film above is untouched.

| # | Time | Shot | What it shows |
|---|---|---|---|
| hook | 0.0–6.3 | hook | the finding as a promise: 91 points counted, only 30 by both methods |
| q1 | 6.3–15.8 | quote | the article's sentence, "只有 30 个两边都数到了" and "约三分之一" swept by the highlighter as the voice reads them (the card is the subtitle, so the burned-in one is hidden) |
| fig1 | 15.8–27.9 | figure (the overlap diagram, layout `side`) | a box on the overlap, three numbered markers listed beside it, a card; the credit plate under it |
| q2 | 27.9–36.7 | quote | the next claim; two highlights; the voice introduces it ("文章接着说：…") |
| fig2 | 36.7–49.3 | figure (the zone map) | a box on the red column, a marker on a white dot (covered by both methods) and one on the red zone without a dot |
| e1 | 49.3–56.9 | explain / list, stamped | a three-step way to read the map: our reading, the basis says so |
| take | 56.9–67.5 | compare | what the article said / did not say, the verdict, the source line |

Structure used: *one claim, then the proof* (two times), our own reading, takeaways. Native moves spent: *say it in the author's words, then show it* (q1→fig1, q2→fig2), *zoom the author's picture to the part that carries the claim* (the overlap box, the red column), *close on what was not shown* (take). The same film exists in 9:16 (picture on top, credit plate, card and legend below).

Build: `sh styles/demo-breakdown/demo/article/build.sh` (figures → `article.py` → project → `tools/breakdown/build.sh`, 16:9 and 9:16, about 3.5 minutes). Narration: edge-tts `zh-CN-YunxiNeural` (two lines carry numerals in `speak`); the speech check mis-hears "无人机" and "潜水员" and was not overruled with `asr`, because the narration was not listened to by the person who wrote the tool. The quote highlights are timed from the voice file's pauses (`align.py`), which is an estimate.

---

# The news-digest demo — *絮语 Mini：官方演示速读* (70.7 s, −14.2 LUFS, true peak −1.1 dB) · `demo-breakdown-news.mp4` · source in [`demo/news/`](demo/news/)

The third film of this style shows the **news-digest** way of working (BREAKDOWN.md §9): a fresh official release read in 71 seconds (70.7 s), with the source and date on screen, the source's own number attributed, and a conclusion that splits what the source says from what is still to verify. **Everything is invented**: the company (岚屿实验室, Lanyu Labs), the product (絮语 Mini, an on-device transcription app), the release page, the date (2026-09-18) and every number. The "official demo clip" (`demo/news/src/footage.mp4`, 19 s, 1080x1920 portrait, a phone showing the app) is drawn in code by `demo/news/footage/`, the same way the first demo's footage is; the film pillar-boxes it on the blurred backdrop like any portrait phone clip. Every tag and chip says "虚构". The other demos are untouched.

Structure used: hook (what and who, source and date) → two key points, each *clip → freeze on the source's own evidence* → a stamped diagram of how it probably works → a conclusion with the claims split and one action line.

| # | Time | Shot | What it shows |
|---|---|---|---|
| hook | 0.0–10.1 | hook | kicker "岚屿实验室 · 絮语 Mini（虚构）", the headline, "官方说：全程在手机本地完成", chips: source and publish date, tag "2 个看点" |
| c1 | 10.1–18.1 | clip 1.6–9.6 s (portrait) | choose a 2:40 recording, tap, the transcript fills; lower third names the demo and its input; a highlight on the button |
| f1 | 18.1–28.7 | freeze 9.4 s, zoom | boxes on the airplane-mode icon with the 离线运行 badge and on the "用时 6 秒" banner; callout "官方演示的读数 — 6 秒是演示机型上的，不是我们测的" |
| c2 | 28.7–35.9 | clip 10.8–18.0 s | tap 生成纪要, the minutes sheet slides up: one decision, three to-dos with source timestamps |
| f2 | 35.9–44.4 | freeze 17.8 s, zoom | box on the three to-dos; a box on the three to-dos labelled "每条都带原文时间" (no card: the card would cover the timestamps); the voice says the quality of the minutes cannot be judged from the demo |
| e1 | 44.4–55.3 | explain / flow, stamped | file → local transcription → text, then minutes; basis "官方发布页「工作方式」一节；内部流程为推测；非独立实测" |
| cmp | 55.3–70.5 | compare, stamped | 官方说的 / 要自己验证的, verdict plate "先用自己的一段录音试一轮", basis "官方发布页与演示片；非独立实测" |

Native moves spent: *say whose number it is* (f1), *pause on the evidence*, *zoom into the detail*, *redraw it as a flow and say it is a guess* (e1), *close on what was not shown* (cmp). The narration says openly, in the conclusion, "这是官方演示解读，不是我们的实测". `prep.py`'s news-digest check passes with no warnings on this film (`demo/news/out/news-check.txt`).

Build: `sh styles/demo-breakdown/demo/news/build.sh` (footage → `tools/breakdown/build.sh` → the style folder; about 3 minutes; the invented footage is skipped when `demo/news/src/footage.mp4` exists). Narration: edge-tts `zh-CN-YunxiNeural`; the speech check mis-hears the invented names (岚屿 → 蓝宇, 絮语 → 序语) and "纪要", and was not overruled with `asr`, because the narration was not listened to by the person who wrote the tool. Sound: the footage's own UI sounds are ducked under the voice; music and foley as in the other demos.

