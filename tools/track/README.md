# tools/track: follow a surface through a host video

For a screen, board or sign in the footage that should show your content (TALKING-HEAD.md §3d).

```sh
# 1. frames (tools/talk/prep.sh does this): films/<name>/src/frames/*.jpg
# 2. track: the four inner corners of the surface in a frame where all of it is visible, TL TR BR BL, full-res px
.venv/bin/python tools/track/board.py films/<name> --corners "669,165,1021,37,1021,576,669,500" --ref 12
# 3. check before building on it: a contact sheet with the tracked quad drawn on 12 frames
.venv/bin/python tools/track/check.py films/<name> --n 12 --out track-check.jpg
```

`board.py` writes `src/track.json` (`ref`, `corners`, one 3×3 homography per frame, reference plane → frame, full-res). It matches the
split-flap film's own tracker exactly. In the page, warp a texture drawn in the surface's plane with each frame's `H` (see
`demos/talking-head/splitflap-intro/main.js`: `homography`, the triangle mesh).

**Platform:** pure Python (numpy, scipy, pillow: the core tier), so macOS, Linux and Windows all work; only `tools/matte` is macOS-only. About 0.3 s per frame at half resolution; 721 frames take a few minutes. It assumes a rigid, textured surface; a plain monitor without a frame needs corner markers.
If the quad slides in the check sheet, the surface was hidden for too long or the reference corners were off: pick another `--ref`.

`track_card.py` in `splitflap-intro` (a hand-held card found by colour) is film-specific and stays there as a recipe.
