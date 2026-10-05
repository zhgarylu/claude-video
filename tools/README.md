# tools/: helpers around the films

Run from the library root with the library's Python (`.venv/bin/python`). The core tier (numpy, scipy, pillow, soundfile, soxr) is enough for all of them unless noted.

| Tool | What it does | Platform |
|---|---|---|
| `talk/hostcheck.py <host.mp4> [--board]` | Before you build: size, frame rate, sound, loudness, pauses, camera steadiness, how much of the frame the host fills; lists problems in plain words. `--board` also demands a slow, even camera (a tracked surface). | any; the host-share line needs macOS |
| `track/board.py`, `track/check.py` | Track a board or screen through the footage (a homography per frame) and draw the track on a contact sheet. [README](track/README.md) | any |
| `matte/run.sh` | A person matte per frame with Apple Vision. [README](matte/README.md) | **macOS 12+ with `swiftc` only** (exits 3 elsewhere; pages keep their colour key) |
| `prompt/gen.py` | A host-video prompt for an AI video tool from a style world and your spoken lines, timed to the length of the lines. Writes `prompts/talking-head/<id>.md`. | any (Python 3 only) |
| `talk/localize.py export\|apply` | Another language: translated captions at the host's times, and a Kokoro voice-over track fitted into each sentence's window. The host's lips stay in the original language. | any; the dub needs the voice tier (`setup.sh deps voice`) |
| `teardown/teardown.py <video>` | Take a video apart: shots and rhythm, camera, colours, speech, on-screen text, sound; writes a storyboard and `teardown.md`. For remaking a video's structure ([`TEARDOWN.md`](../TEARDOWN.md)). [README](teardown/README.md) | any; on-screen text needs macOS (Vision); speech needs the voice tier |
| `check.py <film.mp4> [--srt] [--page]` | After the film: loudness, true peak, black and frozen frames, subtitle overlaps and reading speed, `readcheck`, and a 12-frame contact sheet; writes `<name>-check/check.md`. It cannot hear the film: listen once. | any |
| `poster.py --image still.jpg --title …` | A 16:9 and a 9:16 poster from one subtitle-free still. Needs a CJK-capable font for Chinese titles (it looks for PingFang, Heiti, Noto CJK, Microsoft YaHei; or `--font`). | any |
| `web_cuts.sh`, `publish.sh`, `release.py`, `build_gallery.py` | Maintainer tools for the gallery and Releases ([`MAINTAINING.md`](../MAINTAINING.md)). | any |
