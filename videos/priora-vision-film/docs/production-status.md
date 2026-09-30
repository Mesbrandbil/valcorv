# Production status and resume guide

Last updated: 2026-09-29, cut 2 rendered and delivered as a preview (128.17 s, guide voice).

## Where things stand

| Stage | State | Where |
| --- | --- | --- |
| Brief, design spec, storyboard | done; cut 2 direction added | BRIEF.md, frame.md, STORYBOARD.md, docs/cut2-direction.md |
| Look development | done; cut 2 adds a uniform paper-tooth surface above every scene | docs/look-development.md, assets/textures/paper-tooth.png |
| Demo extraction, site kit, interface kit, sketch kit | done (interface grey text raised to readable contrast in cut 2) | assets/, docs/ |
| Narration (guide) | cut 2: natural speed, lines on the 92 BPM half-beat grid, no fixed runtime (126.53 s); L17 split a/b/c with "whether they will cover it" | narration/, SCRIPT.md |
| Pipeline | done; film-lib gains the beat grid, shared cut times and a DOM board camera | scripts/build-cues.mjs, assets/js/film-lib.js |
| Scenes | cut 2: all eight compositions re-staged and integrated (a1-world, a1-inserts, a1-paper, a1-after, a2-resolve, a3-change, a3-close, chrome); full HyperFrames check passes | compositions/ |
| Audio engine | cut 2: score on the 92 BPM grid, editorial accents, holds; master -16.0 LUFS, -1.05 dBTP | audio-engine/ |
| First cut (guide voice, 90 s) | delivered | renders/priora-vision-film-cut1.mp4 (not tracked), stills/cut1/ |
| Cut 2 (guide voice, 128.17 s) | rendered | renders/priora-vision-film-cut2.mp4 and -preview.mp4 (not tracked), stills/cut2/ |
| Seek-order check | run on cut 2: 83 of 97 sampled frames pixel-identical in any seek order; 14 differ only by text anti-aliasing and 1 to 3 px on graphite lines mid-draw (see below) | scripts/seek-check.py |
| ElevenLabs narration | blocked (network) | see below |
| Final render and delivery | not started | renders/ |

## Rebuild the film

```bash
node scripts/build-cues.mjs                 # cues, index, resolved events
python3 audio-engine/build.py               # music, sfx, master-voice, master (-16 LUFS, -1 dBTP)
scripts/render-film.sh --name <name>        # check, snapshots, picture, mux master.wav
python3 scripts/seek-check.py --out <scratch dir>   # frames identical in any seek order
```

## The ElevenLabs blocker

The environment's egress policy answers 403 to CONNECT for elevenlabs.io, www.elevenlabs.io, api.elevenlabs.io, api.us.elevenlabs.io and api.eu.residency.elevenlabs.io, so neither the web app nor the API is reachable. The user is changing network access.

Agreed route: the ElevenLabs web app in the agent's own Playwright Chromium, the agreed narrator direction (female, clear international British English, warm, composed, credible) and the worker direction (a natural man on a roof, not a narrator). Pause only if sign-in needs the user. The API is not used without the user's approval. After download: scripts/align-uploaded.py aligns the audio, scripts/assemble-narration.py builds voice.wav and timing.json at exactly 90 s, scripts/build-cues.mjs re-locks every cue, the audio engine remixes, and the film re-renders.

## How to resume

1. Read BRIEF.md (decisions), STORYBOARD.md (the plan), this file (state), frame.md (look).
2. Everything built so far is committed on branch claude/new-session-81b4mg (draft PR Mesbrandbil/valcorv#2).
3. Tool setup a fresh container needs: apt ffmpeg sox fluidsynth musescore-general-soundfont; pip kokoro-onnx soundfile numpy scipy librosa pyloudnorm pocketsphinx; Kokoro model files from the kokoro-onnx GitHub release into /root/.cache/kokoro/; npx hyperframes@0.8.92 browser ensure.

## Seek check on the assembled cut 2

Each scene was pixel-identical in any seek order on its own. Assembled, 14 of 97 sampled frames first differed between ascending and shuffled seeks. Causes found and fixed:
- Text anti-aliasing flipping between LCD and greyscale with the compositor layer history (a1-paper stamp, a2-resolve labels, a3-close crossfade): renders and checks now run Chrome with --disable-lcd-text through scripts/chrome/chrome-headless-shell (render-film.sh and seek-check.py use it by default).
- DrawSVG cap compensation measured from a camera-dependent stroke width at a tween's first render (a1-world): the story timeline is now initialised once at build time.
Remaining: 5 a1-world frames (11.1, 21.2, 21.4, 26.5, 33.1 s) where the sequential path differs from a direct seek by 1 to 3 px along lines. Cause: the site's tremor filter (feDisplacementMap); with the filter off, all 97 frames pass. Forcing filter invalidation per frame did not help. Plan for cut 3: drop the displacement filter (the rough twin's jittered geometry already carries the hand).
Rejected: `will-change: transform` on scene slots (worse: a promoted slot keeps its raster scale while board cameras zoom).

## Hard-won rules for every composition

- Never drive visual state from GSAP callbacks (onUpdate, onStart, onComplete). HyperFrames seeks timelines with callbacks suppressed, so callback-written state is stale. Tween attributes, CSS properties or custom properties directly. The site camera tweens the SVG viewBox and --sw this way.
- Everything deterministic: seeded jitter only (site-kit's hash-seeded mulberry32).
- Kit option shapes are contracts. a1-world was built against an older safeguardItems layout ({ plan, label }); the reviewed kit takes { px } and a schedule, and the old override crashed the scene. a1-world and a2-resolve now both use the kit default at the landing (refScale 14.5, size 18), which keeps the rewind handoff frame identical.
