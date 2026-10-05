# Easel × lemo-opuscar

[Easel](https://github.com/ZJU-REAL/Easel)（浙大 REAL 实验室，Apache-2.0）是社交媒体运营助手：发现热点、策划、创作、发布、归因。它的 `auto-short-video` 做图片轮播式的短视频；这里的 `lemo-film` 技能让它多一条路：**一个风格从头到尾导演的、逐帧代码渲染的成片**。

```
Easel：发现 → 策划（选题、脚本）          lemo-film：选风格 → 导演 → 渲染 → 自检          Easel：发布 → 归因
                      └──── 主题 / 口播稿 ────▶                      └──── final.mp4 + srt + cover ────▶
```

## 安装（示例，未在真实 Easel 工作台里测试）

1. 装好本库：`sh plugin/skills/lemo-opuscar/scripts/setup.sh deps`，并设置 `LEMO_OPUSCAR_HOME=<库路径>`。
2. 把 `integrations/easel/lemo-film/` 复制到 Easel 的 `skills/openclaw/lemo-film/`。
3. 在 Easel 里说“用 lemo-film 做一条关于……的片子”。先跑 `deliver.py doctor`，它会说缺什么。

## 它做什么、不做什么

- 做：风格推荐（`tools/style/recommend.py`）、按库的工作流导演和渲染、自检（`tools/check.py`、`tools/audio/report.py`）、把成片、字幕、封面和 `meta.json` 放进 Easel 的 `outputs/<主题名>/`。
- 不做：登录平台、发布、改标题话术、选题。这些是 Easel 的事；小红书等平台的自动发布有风控风险，请由用户确认后发布。
- 不依赖任何 API key 渲染；配音和音乐可以用库里的离线方案，也可以让 Easel 的 `tts-voiceover`、`ai-music` 来做（需要它们各自的 key）。

## 与 Easel 其他技能的搭配

| Easel 技能 | 怎么用 |
|---|---|
| `video-script`、选题与日历 | 给 lemo-film 提供主题和口播稿 |
| `tts-voiceover`（云端有情感的声音） | 想要比库里 Kokoro 更有表现力的旁白时，把音频交给库的 `mix.py` |
| `ai-music`（可选歌曲生成） | 歌词视频想要真唱时的人声来源（库里的人声是念白） |
| `chromakey.py`（绿幕抠像） | 非 macOS 上口播视频的抠像回退（库的 Apple Vision 抠像只支持 macOS） |
| 发布中心 | 接 `outputs/<主题名>/` 里的成片 |
