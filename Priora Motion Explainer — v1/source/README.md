# Priora motion explainer v1: source project

The editable source of the 90-second film. It is a [HyperFrames](https://hyperframes.heygen.com) composition: one HTML page whose picture is drawn in SVG and animated by one paused GSAP timeline, rendered frame by frame by headless Chrome. Every frame is deterministic, so the same source always renders the same film.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The composition: loads the kit, builds the world, runs the eight sections, registers the master timeline. |
| `assets/js/pk-kit.js` | The glyph kit: Priora and the specialist agents, the case token, chambers, threads, trails, text helpers, the camera plugin. |
| `assets/js/world.js` | The layout of the world (`PK.GEO`) and every persistent element. |
| `assets/js/camera.js` | The single camera track. Sections never move the camera themselves. |
| `sections/s1-world.js` ... `s8-system.js` | One file per beat of the storyboard (0 to 8, 8 to 22.3, 22.3 to 38, 38 to 47, 47 to 57, 57 to 78, 78 to 84, 84 to 90 s). |
| `assets/css/film.css` | Colour tokens and line styles. The working colour is `--rust`. |
| `assets/brand/priora-wordmark.svg` | The canonical Priora wordmark (the only brand mark used). |
| `narration/lines.json` | The voiceover text and the start time of every line. |
| `narration/timing.json`, `assets/js/pk-cues.js` | Word-level timings, generated; the picture reads them so motion lands on words. |
| `audio/build.py`, `docs/sound.md` | The sound engine (all sound design and music synthesised offline) and its description. |
| `docs/` | The brief, the design bible, the storyboard and the cut 2 notes. |

## Tools

- Node 22 or later (for `npx hyperframes@0.8.92`), Chrome or Chromium, ffmpeg.
- Python 3.11 with `numpy scipy soundfile pyloudnorm`; for the voice also `kokoro-onnx` (with its model files) and `pocketsphinx`.

## Rebuilding

From this folder:

```bash
python3 scripts/voice.py          # 1. voice: synthesise, align, write timing.json and pk-cues.js
scripts/render-film.sh            # 2. sound (audio/build.py), lint, picture, both MP4s, checks
```

`render-film.sh` writes `Priora Motion Explainer v1.mp4` and `Priora Motion Explainer v1 no narration.mp4` into the parent folder and fails unless each is exactly 90.000 s and 2700 frames. Use `--skip-audio` to keep the current mixes, or `--quality draft` for a quick pass.

For review, `scripts/review-sheets.sh OUTDIR` renders a draft and cuts it into timestamped contact sheets.

To preview and scrub in the browser: `npx hyperframes@0.8.92 preview`.

## Changing things

- **Replacing the voice:** record each line inside its window (see `Voiceover script.md`), put the takes in `narration/takes/`, rerun the alignment in `scripts/voice.py`, then `scripts/render-film.sh`. The picture follows the new word times on its own as long as each line keeps its start.
- **Working colour:** `--rust` in `assets/css/film.css` and `PK.C.rust` in `assets/js/pk-kit.js`.
- **Wording on screen:** in the section that shows it; the camera and the word times stay as they are.
- **Timing of a beat:** the camera moves are in `assets/js/camera.js`; the hand-offs between sections (what is on screen at 22.3, 47, 57 and 78 s) are listed in `docs/cut2-plan.md`.
