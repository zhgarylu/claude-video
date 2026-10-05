# Easel SKILL 元数据

| 字段 | 值 |
|------|-----|
| **SKILL 名称** | lemo-film |
| **所属层** | produce（编排型） |
| **来源类型** | 外部集成示例（非 Easel 官方技能） |
| **原始来源** | 本仓库 `integrations/easel/lemo-film/`；调用本机的 lemo-opuscar 库（zhgarylu/claude-video，MIT；衍生自 lemomo-ai/lemo-opuscar，MIT） |
| **依赖** | 本机 Node ≥ 20、ffmpeg/ffprobe、库的 Python `.venv`（`sh plugin/skills/lemo-opuscar/scripts/setup.sh deps`）；Python 标准库（deliver.py） |
| **API key** | 渲染本身不需要。配音（可选 Kokoro 离线；或 Easel 的 tts-voiceover）、音乐（可选）由对应技能提供 |
| **许可** | 本目录文件 MIT（随库）。不包含也不引用 Easel 的任何代码 |

> 用途: 让 Easel 的“创作”层多一条路——有风格的代码渲染成片，再交回 Easel 的“发布”层。
> 状态: 示例。`deliver.py` 在本仓库内用样片测试过；没有在真实的 Easel 工作台里安装测试过。Easel 的技能目录约定可能随版本变化，安装时请对照其 `docs/skill-function-mapping.md`。
