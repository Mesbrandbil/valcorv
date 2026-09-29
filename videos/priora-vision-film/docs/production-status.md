# Production status and resume guide

Last updated: 2026-09-29, cut 2 in build (cinematic re-staging, natural narration on a 92 BPM grid).

## Where things stand

| Stage | State | Where |
| --- | --- | --- |
| Brief, design spec, storyboard | done; cut 2 direction added | BRIEF.md, frame.md, STORYBOARD.md, docs/cut2-direction.md |
| Look development | done; cut 2 adds a uniform paper-tooth surface above every scene | docs/look-development.md, assets/textures/paper-tooth.png |
| Demo extraction, site kit, interface kit, sketch kit | done (interface grey text raised to readable contrast in cut 2) | assets/, docs/ |
| Narration (guide) | cut 2: natural speed, lines on the 92 BPM half-beat grid, no fixed runtime (126.53 s); L17 split a/b/c with "whether they will cover it" | narration/, SCRIPT.md |
| Pipeline | done; film-lib gains the beat grid, shared cut times and a DOM board camera | scripts/build-cues.mjs, assets/js/film-lib.js |
| Scenes | cut 2 re-staging in progress (a1-world, a1-inserts (new), a1-paper, a1-after, a2-resolve, a3-change, a3-close); chrome updated | compositions/ |
| Audio engine | cut 2: 92 BPM score and editorial accents in progress | audio-engine/ |
| First cut (guide voice, 90 s) | delivered | renders/priora-vision-film-cut1.mp4 (not tracked), stills/cut1/ |
| Seek-order check | tool ready (scripts/seek-check.py); run on the full cut 2 | scripts/seek-check.py |
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

## Hard-won rules for every composition

- Never drive visual state from GSAP callbacks (onUpdate, onStart, onComplete). HyperFrames seeks timelines with callbacks suppressed, so callback-written state is stale. Tween attributes, CSS properties or custom properties directly. The site camera tweens the SVG viewBox and --sw this way.
- Everything deterministic: seeded jitter only (site-kit's hash-seeded mulberry32).
- Kit option shapes are contracts. a1-world was built against an older safeguardItems layout ({ plan, label }); the reviewed kit takes { px } and a schedule, and the old override crashed the scene. a1-world and a2-resolve now both use the kit default at the landing (refScale 14.5, size 18), which keeps the rewind handoff frame identical.
