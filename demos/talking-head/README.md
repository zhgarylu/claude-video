# Talking-head demos · 口播加解说 demo

The source of the three demo films shown in the [gallery](https://zhgarylu.github.io/claude-video/gallery/). They are complete, hand-made projects: the page (`main.js`), the timeline (`timeline.js`: captions, camera, events), the mix (`mix.py`), the build script, the treatment (`TREATMENT.md`) and the credits. Use them to see how a finished film is put together; to start your own, use [`tools/talk/new-film.sh`](../../tools/talk/new-film.sh) and the layouts in [`tools/talk/layouts.js`](../../tools/talk/layouts.js).
三条 demo 的完整源码：页面、时间线（字幕、镜头、事件）、混音、构建脚本、创作说明和来源。看它们是怎么做出来的；要做自己的，用 `tools/talk/new-film.sh` 和 `tools/talk/layouts.js`。

| Demo | Style · layout | What it shows |
|---|---|---|
| [`claude-mods/`](claude-mods/) | Dark Tech Keynote · split panel · 左右分栏 | host on the left; an original UI window gains a pane, a command guard and slash commands as they speak · 讲者在左，界面窗口随口播装上面板、拦截命令、斜杠命令 |
| [`muse/`](muse/) | Isometric Infographic · corner window · 角落小窗 | the host in a corner while the camera travels along a diorama of four stations · 讲者在角落，镜头沿沙盘横移 |
| [`muse2/`](muse2/) | Isometric Infographic · video as the world · 视频即世界 | the host video is itself a styled world and the main picture; callout cards add names, dates, sources · 视频本身是风格世界，两侧用标签卡补名字、日期、来源 |

The films: [release `films`](https://github.com/zhgarylu/claude-video/releases/tag/films) (`claude-mods.mp4`, `muse.mp4`, `muse2.mp4`).

## What is not here · 这里没有的

The host videos (supplied by the user, AI-generated fictional people), their frames, voice tracks and every render are not in git (`.gitignore`). The timings in each `timeline.js` were made for the original host video, so a rebuild needs that same video. To try one with your own host video, copy the folder, put your video at `src/host.mp4`, and rewrite `timeline.js` for its words; or start from the template instead.
口播视频（用户提供，AI 生成的虚构人物）、逐帧图、人声和所有渲染产物都不在 git 里。每个 `timeline.js` 里的时间是按原视频做的，所以重新构建需要同一条视频。用你自己的视频：复制整个文件夹，把视频放到 `src/host.mp4`，按它的口播重写 `timeline.js`；或者直接从模板开始。

## Rebuild · 重新构建

```sh
cp <host video> demos/talking-head/muse2/src/host.mp4
sh demos/talking-head/muse2/build.sh        # prepares the footage (tools/talk/prep.sh), renders, mixes, writes muse2.mp4 and .srt
```

`muse2/patch_calendar.py` fixes a prop in that host video (its calendar says 13 while the host says September 8th) in the extracted frames only; the video file is never changed. · `patch_calendar.py` 只改提取出来的帧里的一个道具（日历显示 13，口播说 9 月 8 日），不会改视频文件本身。
`muse/` and `muse2/` look for the user's own logos in `src/brand/<name>.png` (muse, meta, slack, canva, asana, zoom, intuit, box); without them the brand names are plain text. · 如果 `src/brand/` 里有你有权使用的 logo，会自动替换品牌名字牌；没有就用文字。
