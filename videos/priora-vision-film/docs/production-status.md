# Production status and resume guide

Last updated: 2026-09-29, during foundation build.

## Where things stand

| Stage | State | Where |
| --- | --- | --- |
| Brief, design spec, storyboard | done | BRIEF.md, frame.md, STORYBOARD.md |
| Look development (graphite and precise site) | done | docs/look-development.md |
| Demo extraction (site geometry, glyphs, interface styles) | in progress | assets/site/, assets/css/product.css, docs/demo-map.md |
| Narration pipeline and guide voice | in progress | narration/, scripts/guide-voice.py, scripts/assemble-narration.py |
| HyperFrames pipeline prototype and cue compiler | queued | scripts/build-cues.mjs, assets/js/, docs/pipeline.md |
| Audio engine (score, sound design, mixer) | queued | audio-engine/, docs/sound-design.md |
| Scene compositions | not started | compositions/ |
| ElevenLabs narration | blocked | see below |
| Final render and delivery | not started | renders/ |

## The ElevenLabs blocker

The environment's egress policy answers 403 to CONNECT for elevenlabs.io, www.elevenlabs.io, api.elevenlabs.io, api.us.elevenlabs.io and api.eu.residency.elevenlabs.io, so neither the web app nor the API is reachable. The user is changing network access.

Agreed route: the ElevenLabs web app in the agent's own Playwright Chromium, the agreed narrator direction (female, clear international British English, warm, composed, credible) and the worker direction (a natural man on a roof, not a narrator). Pause only if sign-in needs the user. The API is not used without the user's approval. After download: scripts/align-uploaded.py aligns the audio, scripts/assemble-narration.py builds voice.wav and timing.json at exactly 90 s, scripts/build-cues.mjs re-locks every cue, the audio engine remixes, and the film re-renders.

## How to resume

1. Read BRIEF.md (decisions), STORYBOARD.md (the plan), this file (state), frame.md (look).
2. Everything built so far is committed on branch claude/new-session-81b4mg (draft PR Mesbrandbil/valcorv#2).
3. Tool setup a fresh container needs: apt ffmpeg sox fluidsynth musescore-general-soundfont; pip kokoro-onnx soundfile numpy scipy librosa pyloudnorm pocketsphinx; Kokoro model files from the kokoro-onnx GitHub release into /root/.cache/kokoro/; npx hyperframes@0.8.92 browser ensure.
