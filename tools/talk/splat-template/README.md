# splat-template: a presenter standing in a Gaussian-splat world

The camera path is yours (frame-exact, repeatable); the host is a billboard cut out with the person matte, blended with soft edges, colour-matched to the world behind it, with a light wrap on the rim. Made with `tools/talk/splat_film.py`; this folder is what it copies into the film.

```sh
.venv/bin/python tools/talk/splat_film.py host.mp4 films/my-film --world demo-room        # a demo world, nothing to download except the two npm packages
.venv/bin/python tools/talk/splat_film.py host.mp4 films/my-film --world my-world.spz --lang zh --aspect 9x16
```

What the command does: host check → frames, voice and word timings (`prep.sh`) → person matte (`tools/matte/run.sh`, macOS only) → works out where the host stands in the frame (the crop) and how big the billboard is in metres → copies the world → installs `@sparkjsdev/spark@2.3.1` and `three@0.180.0` **into the film folder** (the library's own three stays at 0.170) → `film.json` → renders and checks.

## film.json

| key | meaning |
|---|---|
| `world.url`, `flipY`, `position`, `rotationDeg`, `scale` | the splat file (`.splat`, `.spz`, `.ply`, `.ksplat`); `flipY` for y-down files |
| `host.crop` | the part of the video that holds the host (frame pixels): `w`, `h` and `track` (the crop's top-left for every frame, smoothed, so the crop follows him); `host.plane`: billboard `width`, `height` (m), `bottom` (m above the floor), `x`, `z` |
| `host.tone` (0.6), `host.wrap` (0.25), `host.erodePx` (2), `host.featherPx` (1) | colour matching, rim light wrap, matte shrink and feather. `?tone=0&wrap=0&soft=0` on the page URL shows the plain cut-out |
| `counter` | the prop that hides the cut at the bottom of the video (`on:false` to remove) |
| `camera` | `orbitDeg` (14), `orbitCycles`, `rStart`/`rEnd` (m), `height`, `bob`, `fov`, `target` |

## Honest limits

- **Flat host.** A billboard shows its flatness when the camera swings more than about 15–20°. Keep `orbitDeg` small; push-ins and slow drifts are fine.
- **Hard to put things in front of the host.** Splats do not write depth, so a splat object cannot stand in front of him. Opaque meshes can (the counter does). Give a foreground splat object an invisible depth proxy mesh if you need it.
- **Needs the matte**: macOS only (`tools/matte`). Elsewhere, shoot on a green screen and key it into `src/matte/` yourself.
- **Light.** Colour matching is gentle and per-frame: skin can go slightly grey, and a big gesture can shift the correction a little from frame to frame. Check a continuous render, not only stills.
- Tested only in a synthetic room (`make-room.py`), not in a real World Labs world; speed on millions of splats is unmeasured.
- The renderer needs the two npm packages (about 50 MB), downloaded by `npm install` on first use.
