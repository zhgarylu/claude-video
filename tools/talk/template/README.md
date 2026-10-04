# Talking-head film template

Made by `sh tools/talk/new-film.sh <host.mp4> films/<name> --layout split|pip|world` (add `--aspect 9x16` for a portrait short video: always the `world` layout, karaoke captions, cards on the edges; see TALKING-HEAD.md §3c). It copies this folder, runs `prep.sh` on your host video, writes `film.json` with captions from the transcript, and renders a first cut.

- `film.json`: layout, title, theme, caption style, `cards` (the items that appear with the voice), per-layout options. Edit it, then `sh films/<name>/build.sh`.
- `main.js`: the page. `drawContent()` is a placeholder (title + bullets); replace it with your style's graphics. The layouts and captions come from `tools/talk/layouts.js`.
- `mix.py`: the voice bus; add a score and foley (see `tools/talk/mix_helpers.py`). `src/music.wav`, if present, is laid under the voice.
- Fonts: the template uses system fonts. For a release, subset a CJK font to the characters you use (TECHNIQUE.md §11).
- Read `TALKING-HEAD.md` for the whole method: choosing a style, the treatment, the checks, and what to tell the user.

Cards, by layout:
- `world`: `{ id, side:'L'|'R', hue, title, sub?, tag?, t0, t1, anchor:[[t, vx, vy]…], objEnd? }` (anchor in the host video's own pixels; overlay a coordinate grid on a few frames to read them)
- `split` / `pip`: `{ title, sub?, hue?, t0, t1? }` appear as bullets.
