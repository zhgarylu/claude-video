# Remaking a video's structure in a library style

The user brings a video they admire (their own, or one they have the right to study) and wants something like it: a film of the same shape, in one of the library's styles, about **their** topic.

## What to take and what to leave

| Take (structure) | Leave (the source's own material) |
|---|---|
| the hook: what happens in the first 3 seconds | its footage, stills and screen recordings |
| how information arrives, in what order, at what pace | its voice, its script wording, its music |
| shot lengths and where the pauses and the payoff sit | its characters, brand marks and distinctive designs |
| how text sits on screen (burned-in captions, lower third, big words) | its exact on-screen text |
| the camera grammar (static, push-ins, cuts on the beat) | |

A "full copy" of someone else's video is a copy of their work. Rebuild the **shape** with new content; the film is the user's own. If the user owns the source and wants it changed (re-captioned, restyled) or duplicated as an editable project, that is a different job: [`REMAKE.md`](REMAKE.md) (modes `restyle` and `exact`; `structure` is this page with a precise per-beat sheet, `tools/remake/structure.py`).

## Steps

1. **Get the file.** Ask the user for the video file. Do not download from a platform on your own: tell the user it needs `yt-dlp`, that platform terms and copyright are theirs to judge, and run it only if they say so (`teardown.py --url`).
2. **Take it apart.** `.venv/bin/python tools/teardown/teardown.py <video> --lang <zh|en>` (add `--model small` for Chinese). On non-macOS machines the on-screen text is not read: look at the keyframes yourself.
3. **Look at `storyboard.jpg` and read `teardown.md`.** Open the keyframes you need (`shots/NN.jpg`) and read the transcript in the table. Write down, in your own words: the hook, the beats (each with a purpose and a length), the pacing curve, what is said versus shown, the sound.
3b. **Draft the treatment.** `.venv/bin/python tools/teardown/treatment.py <teardown dir> --topic "…" [--style slug] [--target 60]` writes a `TREATMENT.md` skeleton next to the teardown: beats, numbers to carry, structure A with a seconds and character budget per beat. Roles are guesses; fill the blanks and write structures B and C yourself.
4. **Choose the style and the topic.** The style is the user's pick, or two or three suggestions from `styles/README.md` that suit the source's feel (a fast cut-driven explainer, a slow essay, a chat story, a ranking). The topic is the user's. Ask once, in one message (AGENTS.md workflow step 1).
5. **Write `TREATMENT.md`** (DIRECTOR.md §4): three structures, one chosen, each beat mapped to the source's beat and length; say what you kept and what you changed. Then the normal workflow (look, produce, check with `tools/check.py`, deliver).
6. **Tell the user** what the source's structure was, what the remake kept, and that none of the source's material is in it.
