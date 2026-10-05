# tools/matte: a person matte for every frame (macOS only)

| | |
|---|---|
| **Works on** | macOS 12 or later with `swiftc` (Xcode or the Command Line Tools). `--instances` needs macOS 14 or later. Apple Silicon and Intel. |
| **Does not work on** | Linux, Windows, WSL. `run.sh` prints a notice and exits 3; nothing breaks, pages keep their colour key. |
| **Needs** | no download, no model file, no Python package. Compiles `person.swift` once (a few seconds) into `~/.cache/lemo-opuscar/`. |
| **Speed** | about 0.08 s per frame on an M-series Mac (721 frames in 55 s). |
| **Quality limits** | tested on one presenter against a bright station; the default mask leaves out a card or phone in the hand; fast hands can lose a fingertip in single frames; half-size edges are soft; more than one person in frame are all kept. |

Replaces the colour key in talking-head pages. Uses Apple's Vision framework, so nothing is downloaded and no model is bundled.

```sh
sh tools/matte/run.sh films/<name>            # reads src/frames/*.jpg, writes src/matte/*.png (RGBA, alpha = person, half size)
sh tools/matte/run.sh films/<name> --instances   # foreground-instance mask: also keeps what the host holds or leans on (macOS 14+)
```

About 0.08 s per frame (721 frames in 55 s on an M-series Mac). On other systems `run.sh` exits 3 and the page keeps its colour key.

In a page: `loadHost('src')` (tools/talk/host.js) loads the mattes when `src/matte/` exists; `host.matte[k]` / `hostMatteFrame(host, t)` is an image
whose alpha is the person. Draw it as `destination-out` on a layer that must sit behind the host, or as the cut of an overlay. `?colormatte=1` on
the page URL ignores the mattes (to compare). `splitflap-intro/main.js` uses it for the host-in-front-of-board cut and for the backdrop layer
(together with its own board mask), and falls back to its colour key when there are no mattes.

Limits: the default person mask does not include a card or phone in the hand (the colour key or `--instances` can); fast hand motion may
lose a few fingertips in single frames; edges are soft at half size. In the split-flap film the colour key already worked for a navy shirt,
so the gain there is cleaner hair and arm edges; the point is that other clothing and backgrounds no longer need new thresholds.
