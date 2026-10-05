---
name: lemo-film
description: "把一个主题或口播稿做成有明确风格的成片：从 75 种用代码逐帧渲染的影片风格里选一种（水墨、翻牌显示屏、歌词视频、舞台灯光、产品英雄镜头、语言学习微课……），产出 final.mp4、字幕、封面海报和检查报告。适合需要‘有设计感、可复现’的单条视频，不是图片轮播。需要本机装有 lemo-opuscar 库（Node + ffmpeg + Python）。**先确认画幅；不自动发布。**"
layer: produce
---

# lemo-film：有风格的成片（代码渲染）

> 与 `auto-short-video` 的分工：后者把图片、配音、字幕拼成 Ken Burns 图片视频；本技能让一个**风格**从头到尾导演一条片子（动效、转场、拟音、配乐都是该风格自己的），画面逐帧由代码渲染，结果可复现。选题、脚本、发布、复盘仍由 Easel 的其他技能负责。

## 输入

- 主题，或已写好的口播稿 / 脚本（必填）。
- 风格（可选）：风格名或目录名（如 `lyric-video`、`翻牌显示屏`）。不给就先运行推荐，**把三个候选和原因告诉用户，等用户选**。
- **画幅确认硬门**：横版 16:9、竖版 9:16，用户没明确说就先问，确认后才开工（风格库默认横版 1080p；竖版见各风格的 STYLE.md，`language-lesson`、`chat-log`、`lyric-video` 适合竖版）。
- 语言（默认和用户写的语言一致）、时长（默认 45–60 秒）、有没有自己的配音/音乐/图片/logo。
- 用户自带的博主口播视频：这不是本技能的主线，按库里的 `TALKING-HEAD.md` 走（`tools/talk/film.py`）。

## 前置检查

```bash
python skills/openclaw/lemo-film/scripts/deliver.py doctor
```

查找库目录（环境变量 `LEMO_OPUSCAR_HOME`，或 `~/lemo-opuscar`，或本仓库同级的 `lemo-opuscar`），检查 Node ≥ 20、ffmpeg、库的 `.venv`。缺什么就如实告诉用户怎么装（`sh plugin/skills/lemo-opuscar/scripts/setup.sh deps`），不要绕过。

## 步骤

1. **选风格**（没指定时）：
   ```bash
   python <库>/tools/style/recommend.py "<主题>" --aspect 9x16
   ```
   它只做第一轮筛选。给用户看三个候选的样片（库里 `styles/<slug>/<slug>.mp4` 或画廊页），**由用户定**。
2. **按库的流程做**：读 `<库>/AGENTS.md` 的 Workflow：简报（一次问清，不反复问）→ 写 `TREATMENT.md`（三种结构选一）→ 风格帧 → 制作 → 自检。**风格的 `STYLE.md` 是固定的，故事和结构按用户的主题自己导演，不套用库里的样片情节。**成片放在库的 `films/<名字>/`。
3. **自检**（库里的工具，不能代替听一遍）：
   ```bash
   python <库>/tools/check.py films/<名字>/<名字>.mp4 --srt films/<名字>/<名字>.srt --page films/<名字>
   python <库>/tools/audio/report.py films/<名字>/<名字>.mp4
   ```
4. **交付到 Easel 的 outputs**：
   ```bash
   python skills/openclaw/lemo-film/scripts/deliver.py deliver \
     --film <库>/films/<名字>/<名字>.mp4 --topic "<主题名>" --title "<成片标题>" \
     --srt <库>/films/<名字>/<名字>.srt --style <风格slug> --aspect 9x16
   ```
   会写出 `outputs/<主题名>/final.mp4`、`final.srt`、`cover.jpg`（取自成片的一帧，不带字幕）、`meta.json`（标题、风格、画幅、时长、响度、检查结论、来源和署名说明）和 `check.md`。
5. **告诉用户**：用了哪个风格、为什么；成片长度和响度；检查里的提醒；**哪些没验证**（声音没人听过、外语句子需母语者复核等）。然后把发布交回 Easel 的发布中心：本技能不登录、不发布、不改标题话术。

## 输出

- `outputs/主题名/final.mp4`、`final.srt`、`cover.jpg`、`meta.json`、`check.md`
- 制作过程文件在库的 `films/<名字>/`（TREATMENT.md、源码，可单独改了重渲）

## 规则

- 这是**用户的片子**：不加 LemoLab 署名，不加水印（库的规则：`styles/` 之外的片子归用户）。
- 事实类题材（新闻、数据、产品参数）先查来源，把依据写进 `meta.json` 的 `sources`；查不到的写“未核实”，不要编。
- 不用现成动漫/影视角色、真实品牌和真实人物的形象；品牌用用户提供的或虚构的。
- 涉及外部付费接口（配音、音乐、生视频）时先说明会调用什么、大致花费，用户确认后再做；库本身的渲染、配乐和拟音不需要任何 key。
- 渲染占用较多 CPU：用 `RENDER_SLOTS` 限制并发，别在用户机器很忙时开多路。
