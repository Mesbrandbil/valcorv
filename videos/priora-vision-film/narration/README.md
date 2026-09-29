# Narration pipeline

ElevenLabs is the final voice of this film. The narration currently in place is a **guide** generated locally with Kokoro, because ElevenLabs (web app and API) is not reachable from the build environment. The guide exists only so picture and sound can be built and reviewed against a real spoken performance. Everything made from it says `guide` (`timing.json` has `"engine": "guide"`, `"guide": true`). Before final delivery, generate the ElevenLabs takes and re-lock the edit (steps below).

**Agreed route (user decision, 2026-09-29, see BRIEF.md):** generate the narrator and worker audio in the ElevenLabs **web app** using the agent's own browser (Playwright Chromium in the container), then align it locally with `scripts/align-uploaded.py`. The API generator `scripts/elevenlabs-voice.py` is built and tested offline but is **not used without the user's approval**. Record the selected voices and every generation setting in this file when the takes are made.

## Files

| Path | What it is |
| --- | --- |
| `narration/lines.json` | The line table: ids, speaker, displayed text, spoken text per engine, pacing (lead-in, gaps, rewind pre-gap, end hold, allowed total), pronunciations, engine settings. Single source of truth. |
| `SCRIPT.md` | The locked narration script with voice direction (generated from `lines.json` and `timing.json` by `scripts/write-script-md.py`; times are from the current assembly). |
| `narration/takes/guide/<id>.wav, <id>.json` | Guide takes, 48 kHz 24-bit mono, word timings relative to the take start. The WAVs are not tracked in git (regenerate with `guide-voice.py`). |
| `narration/takes/guide/voice-selection.json` | Objective scoring behind the guide voice choice. |
| `narration/takes/elevenlabs/<id>.wav, <id>.json` | ElevenLabs takes (same format). Created by `align-uploaded.py` (agreed route) or `elevenlabs-voice.py` (API, only with approval). |
| `narration/elevenlabs/voices.json` | API route only: ElevenLabs voice shortlist, scores and the chosen narrator and worker voices. |
| `assets/audio/voice.wav` | Assembled voice stem, 48 kHz 24-bit mono, -18 LUFS target with a -1 dBTP ceiling (the ceiling wins: the guide stem sits at about -19.9 LUFS). |
| `narration/timing.json` | Line, sentence and word timings in absolute film seconds. The animation cues anchor to this. |
| `narration/captions.vtt` | Web captions, one cue per sentence. |

Scripts (all in `scripts/`, run from the project root `videos/priora-vision-film`):

| Script | Role |
| --- | --- |
| `align-uploaded.py` | Agreed route: split and force-align the audio exported from the ElevenLabs web app into takes. |
| `assemble-narration.py` | Trims, treats the worker line, places lines by the pacing plan, writes stem, timing and captions. |
| `guide-voice.py` | Local Kokoro guide voice, voice scoring, speed fitting. |
| `elevenlabs-voice.py` | API generator (only with the user's approval): voice selection, `/with-timestamps` synthesis, character alignment to word timings. |
| `write-script-md.py` | Regenerates `SCRIPT.md` from `lines.json` and `timing.json`. |
| `narration-common.py` | Shared helpers (tokens, pocketsphinx alignment, verification, take format). |

## Final voice: ElevenLabs web app (agreed route)

1. **Network.** The browser must reach `elevenlabs.io` (the web app). Today the egress policy answers 403 for every ElevenLabs host; the user is changing network access. Pause only if sign-in needs the user.
2. **Voices.** Narrator: female, clear international British English, warm, intelligent, composed, credible; not aristocratic, theatrical, breathy or an announcer. Worker (L13): a natural British man on a roof speaking into a phone, not a narrator. Record both voice names and ids here.
3. **Settings.** Model Multilingual v2, stability about 50, similarity about 80, style about 10, speaker boost on, speed 1.0 to start (see the runtime note: the 90 s edit will probably need a speed above 1.0). Record the final values here.
4. **Text.** Paste the spoken text from `lines.json` (`tts_text.elevenlabs` where present, otherwise `text`), in order, one line per paragraph, with a clear pause between lines (a blank line, or `<break time="0.8s" />`). Keep `Pree-OR-uh` for Priora and `Roof oh-three`. The narrator file holds every narrator line (L01 to L20 without L13); the worker line goes in its own file, or in its place in one combined file.
5. **Export** WAV or MP3 into the project, for example `narration/uploads/`, then:

   ```bash
   cd videos/priora-vision-film
   python3 scripts/align-uploaded.py narration/uploads/narrator.mp3 --worker-audio narration/uploads/worker.mp3
   # or, one file holding every line in order:
   python3 scripts/align-uploaded.py narration/uploads/narration.mp3
   python3 scripts/assemble-narration.py --engine elevenlabs --strict
   python3 scripts/write-script-md.py
   node scripts/build-cues.mjs
   ```

6. **Check the output** before re-locking picture:
   - `align-uploaded.py` exits 0 and its table shows `Priora OK` for L14a, L16 and L20 (pocketsphinx chose the pri-OR-a variant) and no `CHECK alignment` or `FALLBACK timing`. It exits 3 when a line fails the alignment quality check (a Priora `CHECK` is printed but does not change the exit code, so read the table). If Priora shows `CHECK`, regenerate that line in the web app with another respelling from `pronunciations.Priora.elevenlabs_alternates` in `lines.json`, and put the same respelling in that line's `tts_text.elevenlabs`;
   - `assemble-narration.py --strict` prints a total inside `pacing.min_total` to `pacing.max_total` (89.8 to 90.2 s) and exits 2 otherwise. The designed gaps are fixed, so the only lever is the voice's own pace: regenerate the narrator at a corrected web-app speed (see the runtime note), or take the total decision back to the user;
   - `timing.json` says `"engine": "elevenlabs"`, `"guide": false`.
7. **Re-lock the film:** `node scripts/build-cues.mjs` rebuilds every cue from the new `narration/timing.json` (same schema and line ids; only the times change), then the audio engine remixes and the film re-renders.

`align-uploaded.py` force-aligns the whole script against the file (pocketsphinx 5), cuts between lines at the quietest point of each gap, re-aligns every line on its own and writes `narration/takes/elevenlabs/` in the standard format. If whole-file alignment fails it falls back to choosing line boundaries among the file's silences (dynamic programming on expected line lengths) and repairs any boundary where a line does not align. The designed gaps come from `lines.json`, not from the pauses in the upload, so the upload's own spacing does not matter. Per-line alignment runs on the raw signal first; when that leaves an energy pause inside a word (a low noise floor in the pauses can cause this), it retries with the pauses gated to digital silence and keeps the better result.

Tested:
- round trip on the assembled guide stem (`voice.wav`, 201 words): word starts recovered within 20 ms (median 0 ms, p95 10 ms);
- a simulated web-app export (guide lines as a 128 kbps MP3 at 44.1 kHz, random 0.5 to 1.3 s gaps, random plus or minus 3 dB per line, a -80 dBFS noise floor, the worker line as a separate file): all 24 lines verified, word starts within 30 ms of the guide timings (p95 10 ms), assembled total 90.01 s;
- 144 noisy variants of the guide takes (noise floor -80 to -60 dBFS, two gains): all aligned with no pause inside a word and word starts within 100 ms.

## API generator (only with the user's approval)

Not part of the agreed route. If the user approves it:

1. **Network.** Allow outbound HTTPS to `api.elevenlabs.io` (cloud environment settings, Network access).
2. **Key.** Store the API key as the environment variable `ELEVENLABS_API_KEY` in the environment settings (never paste it into a chat or a file in the repo). The key needs text-to-speech and voices read access; voices write access too if a library voice should be added automatically.
3. **Optional overrides:** `ELEVENLABS_NARRATOR_VOICE_ID`, `ELEVENLABS_WORKER_VOICE_ID` skip automatic voice selection; `ELEVENLABS_MODEL_ID` (default `eleven_multilingual_v2`).
4. **Commands, in order:**

   ```bash
   cd videos/priora-vision-film
   python3 scripts/elevenlabs-voice.py --self-test          # offline: parsing, errors, scoring (no credits)
   python3 scripts/elevenlabs-voice.py --dry-run            # offline: shows every request body
   python3 scripts/elevenlabs-voice.py --fit-total 90       # selects voices, generates all 24 lines, tunes speed
   python3 scripts/assemble-narration.py --engine elevenlabs --strict
   ```

   `--fit-total` generates every line once at the configured speed, measures the assembled total, and if it is more than 0.5 s off target regenerates the narrator lines at a corrected `voice_settings.speed` (clamped to 0.7 to 1.2; at most `--max-passes 2` extra passes, about 1,300 characters each). Its 0.5 s tolerance is wider than the assembly's 89.8 to 90.2 s window, so a last pass with `--speed` may be needed. Without `--fit-total`, pass `--speed` yourself and re-run individual lines with `--lines L14a,L20`.
5. Check `Priora OK` for L14a, L16 and L20, and `xchk_ms` (median distance between ElevenLabs timings and forced alignment, normally under 50 ms).

Voice selection when no id is given: account voices (`GET /v1/voices`) plus the shared library (`GET /v1/shared-voices`, gender, `accent=british`, `language=en`, use cases `narrative_story` and `informative_educational` for the narrator, `conversational` for the worker) are scored against the direction: warm, intelligent, composed, credible, conversational score up; aristocratic, posh, theatrical, breathy, seductive, announcer, commercial, non-standard accents score down. The ranked shortlist is printed and stored in `narration/elevenlabs/voices.json`; later runs reuse the choice unless `--reselect`. The generator never reports success it did not get: any HTTP error, undecodable audio or unusable alignment stops the run with the error body and a non-zero exit code. Without a key it exits 1 and writes nothing.

Per-line requests use `voice_settings` from `lines.json` (narrator: stability 0.5, similarity_boost 0.8, style 0.1, use_speaker_boost true; worker: stability 0.45, style 0), a fixed `seed`, and `previous_text` / `next_text` from the neighbouring narrator lines so each line is read in context. Raw API audio (`<id>.source.mp3`) and the raw character alignment (`<id>.alignment.json`) are kept next to each take.

## Guide voice (local Kokoro)

```bash
python3 scripts/guide-voice.py --fit-total 90      # all lines, tunes narrator speed to the target total
python3 scripts/assemble-narration.py --engine guide
python3 scripts/guide-voice.py --select-voices     # re-run the objective voice selection
python3 scripts/guide-voice.py --lines L14a,L20    # regenerate some lines at the stored speed
```

Current guide: narrator `bf_isabella` at speed 1.1569, worker `bm_daniel` at 1.0, with the per-line `pace` factors in `lines.json` (slower on L01, L07, L08, L11, L12, L14a, L15, L16, L19a to L19d and L20). Synthesis is deterministic: regenerating a line reproduces the take to within 24-bit quantisation.

Voice choice (nobody can listen here, so it is measured): each candidate voice reads eight script lines; the score combines pitch spread in semitones (target about 2.6 for composed but not monotone), speaking-rate stability across sentences, harmonic-to-noise ratio (clarity, the inverse of breathiness), spectral flatness of voiced frames (breath noise), presence versus warmth band balance, forced-alignment agreement, and the Kokoro model card quality grade. Result (scored before the L14 split, on the earlier seven-line set): narrator `bf_isabella` (0.781) over `bf_emma` (0.737), `bf_alice` (0.541), `bf_lily` (0.526); worker `bm_daniel` (0.698) over `bm_george` (0.693), `bm_fable` (0.548), `bm_lewis` (0.482). Details in `takes/guide/voice-selection.json`.

Each line is split into sentences; each sentence is synthesised, cut to its own speech and joined with the designed inner pause from `guide_inner_pauses` (pauses are measured speech to speech). Word timings come from pocketsphinx forced alignment of the known text, edges refined against signal energy. If alignment ever fails the take falls back to proportional timing over voiced regions and is flagged `"fallback": true`.

## Pronunciation

- **Priora**: pri-OR-a, IPA pɹiˈɔːɹə. Guide: espeak's default `pɹˈaɪɔːɹə` (PRY-ora) is replaced by `pɹiˈɔːɹə` at phoneme level. ElevenLabs: respelling `Pree-OR-uh` in `tts_text`; the alternates in `lines.json` map to the same aligner word, so the check below also covers them.
- **Verification**: the aligner dictionary holds the intended variants (`P R IY AO R AH`, `P R IH AO R AH`) and the wrong ones (`P R AY AO R AH`, `P R AY ER AH`); whichever the audio supports wins. A control test with the uncorrected Kokoro pronunciation picked `P R AY AO R AH` (flagged), the corrected one picked `P R IY AO R AH` with the longest vowel on `AO` (stress on the middle syllable). All three guide occurrences (L14a, L16, L20) pass. An independent formant track of the first vowel (F1 about 300 to 400 Hz, F2 about 2,400 to 2,650 Hz, no low-F2 AY onset) confirms /i/, not /aɪ/.
- **Roof 03**: spoken `Roof oh-three` in both engines; displayed and timed as `Roof`, `03`.

## Timing data

Take JSON (`takes/<engine>/<id>.json`, schema `priora-narration-take/1`): `id`, `engine`, `guide`, `speaker`, `text` (displayed), `spoken_text`, `sample_rate`, `duration`, `speech_start`, `speech_end`, `words` (`{w, start, end}` plus `spoken` when the spoken form differs), `sentences`, `alignment` (method, fallback flag, quality evidence), `pronunciation_checks`, provider and voice metadata.

`timing.json` (schema `priora-narration-timing/1`), all times absolute film seconds (values below are the current guide assembly):

```json
{
  "engine": "guide", "guide": true, "sample_rate": 48000, "duration_total": 90.0, "lead_in": 0.8, "end_hold": 1.98,
  "rewind": {"start": 38.66, "end": 42.66, "designed_pre_gap": 3.1, "after_line": "L11", "before_line": "L12"},
  "sections": {"b01-site-wakes": {"start": 0.8, "end": 7.74, "lines": ["L01", "L02"]}},
  "line_order": ["L01", "..."],
  "lines": {"L07": {"start": 20.94, "end": 22.78, "speaker": "narrator", "text": "Then a sprinkler zone goes offline.",
                    "section": "b04-invisible-crossing", "pre_gap": 0.0, "gap_after": 1.2,
                    "clip": {"start": 20.9, "end": 22.82}, "gain_db": -0.22,
                    "words": [{"w": "Then", "start": 20.94, "end": 21.1}, "...", {"w": "offline", "start": 22.28, "end": 22.78}],
                    "sentences": [{"text": "Then a sprinkler zone goes offline.", "start": 20.94, "end": 22.78}]}}
}
```

Word `w` is the displayed word without surrounding punctuation (`Roof`, `03`, `I'm`, `activity-level`). A word's `end` is the end of its last phone; `clip` is the audio region placed on the timeline (speech plus the 40 ms pads; the worker clip also carries its 0.22 s room tail).

## Runtime note

The locked script is 201 words in 24 lines. The pacing plan holds 19.17 s of designed silence between lines (lead-in 0.8 s, gaps, the 4.0 s rewind silence, end hold 1.98 s), which leaves 70.8 s for the lines themselves (68.4 s narrator, 2.4 s worker, inner pauses included) to land exactly 90.0 s: about 2.84 words per second. The Kokoro guide needed speed 1.1569 for that. A typical ElevenLabs narration voice at speed 1.0 reads nearer 2.6 to 2.8 words per second, which would give roughly 91 to 97 s.

With the web app there is no automatic speed fit. After the first export and assembly, the narrator speed that lands 90.0 s is about `speed_now * N / (N - (total - 90.0))`, where `N` is the summed narrator speech (line start to line end in `timing.json`, about 68 s). Example: a first pass at 1.0 that assembles to 93.0 s needs about 1.0 * 68 / 65 = 1.05. The web app allows 0.7 to 1.2. If the voice sounds rushed at the speed that fits, the options are a total up to 94 s (the brief's allowed range, but the user confirmed 90 s) or smaller designed gaps; both are decisions for the user, not for the pipeline.
