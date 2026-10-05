# 口播视频提示词 · Host-video prompts

给 AI 视频工具用的提示词，生成的讲者视频可以直接拿去做“口播 + 风格解说”（见 [`TALKING-HEAD.md`](../../TALKING-HEAD.md)，版式 `world`：视频当主画面，讲者站在风格世界里演内容，后期在旁边补上名字、日期、数字和引线）。

Prompts for AI video tools. The result is a presenter video you can bring to the talking-head workflow, in the `world` layout: the video is the main picture, the host acts the story out inside a style's world, and the film adds names, dates, numbers and leaders around it.

| 提示词 | 世界 | 状态 |
|---|---|---|
| [`swiss-dots`](swiss-dots.md) | 瑞士白棚 · 信号绿 · 地上绿点 | **已用它做成片**（Dots，30 s） |
| [`swiss-dots-vertical`](swiss-dots-vertical.md) | 同上，竖屏 9:16 构图 | 未试 |
| [`splitflap-project-landscape`](splitflap-project-landscape.md) | 科技感高铁站 · 翻牌显示屏，16:9 满屏，连续运镜 | **已用它做成片**（[`splitflap-intro`](../../demos/talking-head/splitflap-intro/)） |
| [`origami-hud-project-vertical`](origami-hud-project-vertical.md) | 折纸 + 科幻全息 | **已用它生成视频做成片**（本地，未作为 demo 发布） |
| [`swiss-gemini4`](swiss-gemini4.md) | 瑞士白棚 · 信号红 · 地面红线 | 未试 |
| [`swiss-devday-four`](swiss-devday-four.md) | 瑞士白棚 · 信号绿 · 四块色板 | 未试 |
| [`swiss-three-news`](swiss-three-news.md) | 瑞士白棚 · 信号红 | 未试 |
| [`iso-world`](iso-world.md) | 等距小岛 · 四个工位 | 未试（同类样片：`muse2`） |
| [`template-fill-in`](template-fill-in.md) | 任何风格 | 填空模板 |

“未试”的意思是：我们没有拿这条提示词去生成过视频。不同视频工具对手势、走位和“不要文字”的遵守程度不一样，生成后先抽帧看一遍再做后期。
事实类的提示词标了“事实截至”日期，来自二手报道，发布前请自己核对。

想要自己的口播稿对应的提示词：`python3 tools/prompt/gen.py --id … --title … --preset swiss --accent 信号绿 --lines "开场|要点一|要点二|收尾" --seconds 30`（按口播长度排时间；`--camera moving --surface blank-board` 用于要跟踪空白板的连续运镜）。生成的是起稿，拿去生成视频前请自己读一遍。

## 一条好提示词的共同点

1. **参考图 + “同一个人、同一套衣服、不换装”**：换装会让后期的人物位置和颜色跳变。
2. **世界是空白的**：色块、线框、牌子都不要字、不要标志；字由后期按风格画，才不会错字。
3. **只有一种点缀色**，和风格的信号色一致，后期的图形才会和画面连成一体。
4. **按口播分段写动作**：每个要点一个明确的手势（一、二、三根手指）；每两三句之间留 1.3–2.5 秒“不说话”，后期用来转场。
5. **固定机位，讲者不超过画面一半**：给左右或周围留出放说明的位置；讲者走位要慢、要清楚。
6. **口播自然偏快，别写太满**：30 秒大约 130–150 个汉字；立题在前 5 秒，收尾留问题。
7. **事实类内容用“据报道 / 预计”**，没有来源的数字别写。

## 做成片

生成好视频后：

```sh
sh tools/talk/new-film.sh host.mp4 films/my-film --layout world --lang zh
```

然后读 [`TALKING-HEAD.md`](../../TALKING-HEAD.md) §3b，选一个风格，把解说画在世界周围。
