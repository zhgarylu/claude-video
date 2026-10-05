# Lemo-Opuscar: instructions for agents

This repository is a library of film styles. Each style has a `styles/<slug>/STYLE.md` (what the style is) and one demo film made entirely in code (`DEMO.md` and `demo/`). People pick a style and ask for a film about **their own** topic. Your job is to direct and produce that film.

| The request | Go to |
|---|---|
| A film about the user's topic (the normal case) | **Style and story**, **Workflow** below |
| "Which styles are there?" / no style chosen | **Finding the style** below |
| The user brings a presenter's video (talking head) and wants explainer graphics around it | [`TALKING-HEAD.md`](TALKING-HEAD.md), then the normal workflow |
| The user brings a video they want remade in a library style ("do one like this") | [`TEARDOWN.md`](TEARDOWN.md), then the normal workflow |
| Directing: story, sound, rhythm, camera, checks, delivery | [`DIRECTOR.md`](DIRECTOR.md) |
| Building: install, pages, voice, music, mix | [`TECHNIQUE.md`](TECHNIQUE.md) |
| Tool commands and flags | [`core/README.md`](core/README.md) |
| Adding a style to the library (owner only) | [`MAINTAINING.md`](MAINTAINING.md) |

**Films outside `styles/` are the user's: no LemoLab credit, no watermark.**

## Style and story

- **`STYLE.md` is fixed**: the style's invariants (look, colour, type, motion, camera grammar, sound palette, native moves, pitfalls). Keep all of it.
- **Everything else is yours to direct** from the user's topic: story, structure, characters, settings, shots, timings, references, how data is charted. Never bend the topic toward the demo.
- **Treatment first, demo later.** Write your own `TREATMENT.md`, with three candidate structures and your choice (DIRECTOR.md §4), before you open `DEMO.md` or the demo code. Then use the demo only to learn techniques (a brush engine, a rig, a shader, a mix), never its story, arc, shots, props or timeline.
- **Scene styles** (a set-up guide, a spec walkthrough, a museum plate, a trail guide) list use cases in their `STYLE.md`. Read them as grammar for the order in which information arrives and how long each part needs on screen, then build the user's content in your own structure. Swapping text into a demo's `content.json` is only a technical check, never the way to deliver.
- Never build inside `styles/`: copy what you need into the film's project folder.

## Finding the style

Users name a style by its gallery name in English or Chinese ("Impasto Oil Painting", "油画厚涂") or by its folder (`impasto`). Look it up in [`styles/README.md`](styles/README.md). If nothing matches clearly, show the closest two or three and ask.

If the user hasn't picked a style:
- Suggest two or three that fit their topic.
- Show them the full list below in the chat, in the user's language only: English names (and English category names) for someone writing in English, Chinese names for someone writing in Chinese. Don't drop, merge or rename anything.
- Link the gallery, where every style has its demo film: https://lemomo-ai.github.io/lemo-opuscar/

<!-- style-list:start -->
All 82 styles · 全部风格:

- **手绘与绘画 Hand-drawn & Painting** (10): 蜡笔儿童绘本 Crayon Picture Book, 水彩笔刷 Watercolor Brush, 中国水墨 Chinese Ink Wash, 油画厚涂 Impasto Oil Painting, 一笔画 One-line Drawing, 白板讲解 Whiteboard Explainer, 钢笔淡彩 Urban Sketch · Pen & Wash, 刺绣与针织 Embroidery & Knit, 木炭素描动画 Charcoal Sketch Animation, 沙画 Sand Animation
- **东方传统 East Asian Traditions** (8): 皮影戏 Shadow Puppetry, 浮世绘 Ukiyo-e, 红色窗花剪纸 Red Paper-cut, 纸雕灯影 Paper-cut Lightbox, 青花瓷 Blue-and-White Porcelain, 敦煌壁画 Dunhuang Mural, 漆器描金 Lacquer & Gold, 木版年画 Woodblock New Year Print
- **印刷与版画 Print & Printmaking** (9): Risograph 丝网印刷 Risograph Print, 复古半调案卷 Halftone Dossier, 木刻版画 Woodcut Print, 铜版画 Copperplate Engraving, 丝印旅行海报 Silkscreen Travel Poster, 博物图鉴 Natural History Plate, 活字报纸头版 Letterpress Newspaper, 塔罗牌 Tarot Cards, 蓝晒 Cyanotype
- **图形与排版 Graphic & Type** (16): 瑞士动态排版 Swiss Motion Graphics, 60s 间谍片头 60s Spy Title Sequence, 装饰艺术 Art Deco, 蓝图 / 工程制图 Blueprint, 彩色玻璃窗 Stained Glass, 象形运动图形 Pictogram Motion, ASCII / CRT 终端 ASCII / CRT Terminal, 霓虹灯牌 Neon Signage, 新艺术 Art Nouveau, 包豪斯构成主义 Bauhaus & Constructivist Poster, 蒸汽波与 Y2K Vaporwave & Y2K Chrome, 地铁线路图 Transit Map, 翻牌显示屏 Split-flap Board, 矢量示波器 Vector Oscilloscope, 歌词视频 Lyric Video, 闪购促销 Flash Sale Promo
- **信息与发布 Information & Keynote** (9): 数据叙事 Data Storytelling, 等距信息图 Isometric Infographic, 暗色科技发布 Dark Tech Keynote, 活体实机录屏 Living Screencast, 科幻全息界面 Sci-fi Hologram HUD, 乐谱音乐可视化 Sheet-music Motion, 聊天记录体 Chat Log, 弹幕体 Danmaku Comments, 语言学习微课 Language Micro-lesson
- **卡通与动画 Cartoon & Anime** (9): 1930s 橡皮管卡通 1930s Rubber Hose Cartoon, 80 年代赛璐璐动画 80s Cel Anime, 科幻情景喜剧卡通 Sci-Fi Sitcom Toon, 50s 扁平卡通 Mid-century Cartoon, 美漫分格波普 Comic Panel Pop Art, 国风戏曲动画 Peking Opera Cel Animation, 漫画黑白网点 Manga Panel, 热血少年漫 Shonen Battle, 航海冒险漫 Sea Adventure Manga
- **游戏 Games** (5): 16-bit 像素 RPG 16-bit Pixel RPG, HD-2D, 微游戏快闪（瓦里奥制造式） Microgame Frenzy, 综艺节奏扁平 Game Show Flat, 8-bit 红白机像素 8-bit Console Pixel
- **电影与时代 Cinema & Eras** (5): 1920s 默片 1920s Silent Film, 后室 / 新怪谈 Liminal Found Footage, 老胶片家庭录像 Super 8 Home Movie, 前电影光学玩具 Zoetrope & Phenakistoscope, 舞台灯光演出 Stage Light Performance
- **材质与 3D Materials & 3D** (11): 积木玩具 Brick Toy, 纸片立体书 Paper Pop-up Book, 移轴微缩 Tilt-Shift Miniature, 低多边形等距 Low-poly Isometric Island, 玻璃质感产品 Glass Product Render, 粘土定格动画 Claymation / Stop-motion, 折纸 Origami Fold, 发条机关 Clockwork & Chain Reaction, 羊毛毡 Needle Felting, 瓦楞纸手工 Corrugated Cardboard Craft, 产品英雄镜头 Product Hero Macro
<!-- style-list:end -->

## Workflow

1. **Brief.** Make sure the style and the topic are clear, then ask the user once, in a single message (DIRECTOR.md §1):
   - anything about the topic you can't decide yourself (facts; names, logos or products that must appear);
   - whether they have material of their own: a voice recording or a preferred voice, music, photos, logos, fonts;
   - the film's language, if it isn't obvious (default: the language they write in, for voice and subtitles);
   - whether they want to review a storyboard first (default: no);
   - anything missing on their machine: first run `sh plugin/skills/lemo-opuscar/scripts/setup.sh deps` from the library root (core only) and include what it reports. Add the voice and music tiers later, only if the film needs them (TECHNIQUE.md §1).

   Skip what their request already answers. Wait for the reply, fill every other gap with a sensible default, sum up the brief in a few lines and start. Don't come back with more questions.
2. **Treatment.** Write `TREATMENT.md` in the project folder (DIRECTOR.md §4), before you open the demo.
3. **Look.** Render style frames or a model sheet with the real drawing code and check them against `STYLE.md` (DIRECTOR.md §5).
4. **Storyboard, only if the user asked for it** (DIRECTOR.md §5). **Stop and wait for approval.** Otherwise don't stop.
5. **Produce.** Voice → check → score (can run in parallel) → animation → mix → render (TECHNIQUE.md).
6. **Self-check and deliver** (DIRECTOR.md §11).

Report progress in the user's language. If a step fails, read the error, fix the cause and retry; go back to the user only for a decision or something only they can provide.

## Where things go

- The film's project folder is `films/<name>/` in a clone (ignored by git), or `<name>/` in the user's folder in skill mode (see the skill's `SKILL.md`). Wherever a guide says `films/<name>/`, read "the project folder". Work only there, unless the user asks you to work in their own project.
- Run `node core/…` and `sh tools/…` from the library root (`$LIB` in skill mode).
- `core/` has ready-made tools (rendering, TTS, speech check, sampler, sfx, mux). Use them or your own stack, but don't edit `core/` or `styles/` for a user's film.
- Never kill processes you didn't start. Don't leave background processes running.
