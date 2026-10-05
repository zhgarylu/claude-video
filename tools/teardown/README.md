# tools/teardown: take a video apart

```sh
.venv/bin/python tools/teardown/teardown.py <video.mp4> [--out dir] [--lang zh|en|auto] [--model base|small] [--no-asr] [--no-ocr]
```

Writes `<video>-teardown/`: `teardown.md` (read it), `teardown.json`, `storyboard.jpg` (a keyframe per shot with its times and camera), `shots/NN.jpg`.

| It measures | How | Needs |
|---|---|---|
| Shots and rhythm (shot lengths, cuts per minute, what happens in the first 3 s) | colour-histogram and frame differences at 12 fps, adaptive threshold | core tier |
| Camera per shot (static, pan, zoom, subject motion) | phase correlation and a scale search between the shot's first and last quarter | core tier |
| Colours | 4-colour palette of each shot | core tier |
| Sound (level, dynamic range, a tempo guess) | energy envelope | core tier |
| Speech (what is said in each shot, how fast, how much of the time) | faster-whisper, word timestamps | voice tier (`setup.sh deps voice`); `--no-asr` skips |
| On-screen text per shot, and whether it looks like burned-in captions | Apple Vision OCR on the keyframes | **macOS 12+ with `swiftc` only**; elsewhere skipped |

Limits: shot detection misses soft dissolves and counts a hard change inside one continuous take as a shot; the camera label is a rough guess from two frames; the tempo guess is `null` when there is no clear beat; Whisper `base` mishears names (use `--model small`); OCR sees the keyframe (the middle of a shot), not every frame, and reads Chinese and English only; speech is not separated from music. It does not tell you why a video works: that is your reading of the storyboard.

`--url <page>` downloads the video first with `yt-dlp` if you have it on your PATH (the tool does not install it). Whether you may download and analyse a given video is for you to decide (platform terms, copyright). Prefer a file you own or are licensed to use.

How to use the result to make a film: [`TEARDOWN.md`](../../TEARDOWN.md).
