# Narration pipeline

ElevenLabs is the final voice of this film. The narration currently in place is a **guide** generated locally with Kokoro, because `api.elevenlabs.io` is not reachable from the build environment and no API key is set. The guide exists only so picture and sound can be built and reviewed against a real spoken performance. Everything made from it says `guide` (`timing.json` has `"engine": "guide"`, `"guide": true`). Before final delivery, generate the ElevenLabs takes and re-lock the edit (steps below).

## Files

| Path | What it is |
| --- | --- |
| `narration/lines.json` | The line table: ids, speaker, displayed text, spoken text per engine, pacing (lead-in, gaps, rewind pre-gap, end hold), pronunciations, engine settings. Single source of truth. |
| `SCRIPT.md` | The locked narration script with voice direction (generated from `lines.json`; times are from the guide). |
| `narration/takes/guide/<id>.wav, <id>.json` | Guide takes, 48 kHz 24-bit mono, word timings relative to the take start. |
| `narration/takes/guide/voice-selection.json` | Objective scoring behind the guide voice choice. |
| `narration/takes/elevenlabs/<id>.wav, <id>.json` | ElevenLabs takes (same format). Created by `elevenlabs-voice.py` or `align-uploaded.py`. |
| `narration/elevenlabs/voices.json` | ElevenLabs voice shortlist, scores and the chosen narrator and worker voices. |
| `assets/audio/voice.wav` | Assembled voice stem, 48 kHz 24-bit mono, -18 LUFS target with a -1 dBTP ceiling. |
| `narration/timing.json` | Line, sentence and word timings in absolute film seconds. The animation cues anchor to this. |
| `narration/captions.vtt` | Web captions, one cue per sentence. |

Scripts (all in `scripts/`, run from the project root `videos/priora-vision-film`):

| Script | Role |
| --- | --- |
| `elevenlabs-voice.py` | Final generator: voice selection, `/with-timestamps` synthesis, character alignment to word timings. |
| `align-uploaded.py` | Fallback: split and force-align one uploaded narration file into takes. |
| `guide-voice.py` | Local Kokoro guide voice, voice scoring, speed fitting. |
| `assemble-narration.py` | Trims, treats the worker line, places lines by the pacing plan, writes stem, timing and captions. |
| `narration-common.py` | Shared helpers (tokens, pocketsphinx alignment, verification, take format). |

## Regenerate with ElevenLabs (final)

1. **Network.** Allow outbound HTTPS to `api.elevenlabs.io`. In Claude Code on the web: the cloud environment menu in the session title bar, then Edit, then Network access: add `api.elevenlabs.io` to the allowed domains (or choose a broader access level).
2. **Key.** Store the API key as the environment variable `ELEVENLABS_API_KEY` in the same environment settings (never paste it into a chat or a file in the repo). A new session picks it up. The key needs text-to-speech and voices read access; voices write access too if a library voice should be added automatically.
3. **Optional overrides** (same place, or inline for one run):
   - `ELEVENLABS_NARRATOR_VOICE_ID`, `ELEVENLABS_WORKER_VOICE_ID` skip automatic voice selection.
   - `ELEVENLABS_MODEL_ID` (default `eleven_multilingual_v2`).
4. **Commands, in order:**

   ```bash
   cd videos/priora-vision-film
   python3 scripts/elevenlabs-voice.py --self-test          # offline: parsing, errors, scoring (no credits)
   python3 scripts/elevenlabs-voice.py --dry-run            # offline: shows every request body
   python3 scripts/elevenlabs-voice.py --fit-total 91       # selects voices, generates all 23 lines, tunes speed
   python3 scripts/assemble-narration.py --engine elevenlabs --strict
   ```

   `--fit-total` generates every line once at the configured speed, measures the assembled total, and if it is more than 0.5 s off target regenerates the narrator lines at a corrected `voice_settings.speed` (clamped to 0.7 to 1.2; at most `--max-passes 2` extra passes, about 1,300 characters each). Without it, pass `--speed` yourself and re-run individual lines with `--lines L14,L20`.
5. **Check the output** before re-locking picture:
   - the generator table shows `Priora OK` for L14, L16 and L20 (pocketsphinx chose the pri-OR-a variant). If a line shows `CHECK`, set another respelling from `lines.json` `pronunciations.Priora.elevenlabs_alternates` in that line's `tts_text.elevenlabs` and regenerate just that line;
   - `xchk_ms` (median distance between ElevenLabs timings and forced alignment) is small, normally under 50 ms;
   - `assemble-narration.py` prints a total between 88 and 94 s (`--strict` exits 2 otherwise).
6. **Re-lock the film:** rebuild the cues and compositions from the new `narration/timing.json` (it keeps the same schema and line ids; only the times change), then re-render.

Voice selection when no id is given: account voices (`GET /v1/voices`) plus the shared library (`GET /v1/shared-voices`, gender, `accent=british`, `language=en`, use cases `narrative_story` and `informative_educational` for the narrator, `conversational` for the worker) are scored against the direction: warm, intelligent, composed, credible, conversational score up; aristocratic, posh, theatrical, breathy, seductive, announcer, commercial, non-standard accents score down. The ranked shortlist is printed and stored in `narration/elevenlabs/voices.json`; later runs reuse the choice unless `--reselect`. The generator never reports success it did not get: any HTTP error, undecodable audio or unusable alignment stops the run with the error body and a non-zero exit code.

Per-line requests use `voice_settings` from `lines.json` (narrator: stability 0.5, similarity_boost 0.8, style 0.1, use_speaker_boost true; worker: stability 0.45, style 0), a fixed `seed`, and `previous_text` / `next_text` from the neighbouring narrator lines so each line is read in context. Raw API audio (`<id>.source.mp3`) and the raw character alignment (`<id>.alignment.json`) are kept next to each take.

## Fallback: upload audio generated elsewhere

If the key cannot be used here, generate the narration in the ElevenLabs web app and upload it:

1. Use a female British voice matching the direction for the narrator and a British male voice for the worker line. Settings: model Multilingual v2, stability about 50, similarity about 80, style about 10, speaker boost on.
2. Paste the spoken text from `lines.json` (`tts_text.elevenlabs` where present, otherwise `text`), in order, one line per paragraph, with a clear pause between lines (a blank line, or `<break time="0.8s" />`). Keep `Pree-OR-uh` for Priora and `Roof oh-three`.
3. Export as WAV or MP3. Either one file with every line (worker line included, in its place), or a narrator file plus a separate worker file.
4. Put the files in the project (for example `narration/uploads/`) and run:

   ```bash
   python3 scripts/align-uploaded.py narration/uploads/narrator.mp3 --worker-audio narration/uploads/worker.mp3
   # or, one file holding every line in order:
   python3 scripts/align-uploaded.py narration/uploads/narration.mp3
   python3 scripts/assemble-narration.py --engine elevenlabs --strict
   ```

`align-uploaded.py` force-aligns the whole script against the file (pocketsphinx 5), cuts between lines at the quietest point of each gap, re-aligns every line on its own and writes `narration/takes/elevenlabs/` in the standard format. If whole-file alignment fails it falls back to choosing line boundaries among the file's silences (dynamic programming on expected line lengths) and repairs any boundary where a line does not align. The designed gaps come from `lines.json`, not from the pauses in the upload, so the upload's own spacing does not matter. Tested round trip on the assembled guide stem: word starts recovered within 20 ms (median 0 ms, p95 10 ms over 210 words); the silence fallback recovered every line boundary within 40 ms.

## Guide voice (local Kokoro)

```bash
python3 scripts/guide-voice.py --fit-total 91      # all lines, tunes narrator speed to the target total
python3 scripts/assemble-narration.py --engine guide
python3 scripts/guide-voice.py --select-voices     # re-run the objective voice selection
python3 scripts/guide-voice.py --lines L14,L20     # regenerate some lines at the stored speed
```

Voice choice (nobody can listen here, so it is measured): each candidate voice reads seven script lines; the score combines pitch spread in semitones (target about 2.6 for composed but not monotone), speaking-rate stability across sentences, harmonic-to-noise ratio (clarity, the inverse of breathiness), spectral flatness of voiced frames (breath noise), presence versus warmth band balance, forced-alignment agreement, and the Kokoro model card quality grade. Result: narrator `bf_isabella` (0.781) over `bf_emma` (0.737), `bf_alice` (0.541), `bf_lily` (0.526); worker `bm_daniel` (0.698) over `bm_george` (0.693), `bm_fable` (0.548), `bm_lewis` (0.482). Details in `takes/guide/voice-selection.json`.

Each line is split into sentences; each sentence is synthesised, cut to its own speech and joined with the designed inner pause from `guide_inner_pauses` (pauses are measured speech to speech). Word timings come from pocketsphinx forced alignment of the known text, edges refined against signal energy. If alignment ever fails the take falls back to proportional timing over voiced regions and is flagged `"fallback": true`.

## Pronunciation

- **Priora**: pri-OR-a, IPA pɹiˈɔːɹə. Guide: espeak's default `pɹˈaɪɔːɹə` (PRY-ora) is replaced by `pɹiˈɔːɹə` at phoneme level. ElevenLabs: respelling `Pree-OR-uh` in `tts_text`.
- **Verification**: the aligner dictionary holds the intended variants (`P R IY AO R AH`, `P R IH AO R AH`) and the wrong ones (`P R AY AO R AH`, `P R AY ER AH`); whichever the audio supports wins. A control test with the uncorrected Kokoro pronunciation picked `P R AY AO R AH` (flagged), the corrected one picked `P R IY AO R AH` with the longest vowel on `AO` (stress on the middle syllable). All three guide occurrences (L14, L16, L20) pass.
- **Roof 03**: spoken `Roof oh-three` in both engines; displayed and timed as `Roof`, `03`.

## Timing data

Take JSON (`takes/<engine>/<id>.json`, schema `priora-narration-take/1`): `id`, `engine`, `guide`, `speaker`, `text` (displayed), `spoken_text`, `sample_rate`, `duration`, `speech_start`, `speech_end`, `words` (`{w, start, end}` plus `spoken` when the spoken form differs), `sentences`, `alignment` (method, fallback flag, quality evidence), `pronunciation_checks`, provider and voice metadata.

`timing.json` (schema `priora-narration-timing/1`), all times absolute film seconds:

```json
{
  "engine": "guide", "sample_rate": 48000, "duration_total": 90.9, "lead_in": 1.2, "end_hold": 2.8,
  "rewind": {"start": 39.75, "end": 43.85, "after_line": "L11", "before_line": "L12"},
  "sections": {"b01-site-wakes": {"start": 1.2, "end": 7.58, "lines": ["L01", "L02"]}},
  "line_order": ["L01", "..."],
  "lines": {"L07": {"start": 21.78, "end": 23.48, "speaker": "narrator", "text": "Then a sprinkler zone goes offline.",
                    "section": "b04-invisible-crossing", "pre_gap": 0.0, "gap_after": 0.9,
                    "clip": {"start": 21.74, "end": 23.52},
                    "words": [{"w": "Then", "start": 21.78, "end": 21.94}, "...", {"w": "offline", "start": 23.04, "end": 23.48}],
                    "sentences": [{"text": "Then a sprinkler zone goes offline.", "start": 21.78, "end": 23.48}]}}
}
```

Word `w` is the displayed word without surrounding punctuation (`Roof`, `03`, `I'm`, `activity-level`). A word's `end` is the end of its last phone; `clip` is the audio region placed on the timeline (speech plus the 40 ms pads).

## Runtime note

The locked script is 210 words and the pacing plan holds 20 s of designed silence (lead-in, gaps, rewind, end hold) plus the short pauses inside lines. Landing 91 s therefore needs about 2.95 words per second of speech. Kokoro reached that at speed 1.23. A typical ElevenLabs narration voice at speed 1.0 reads nearer 2.6 to 2.8 words per second, which would give roughly 94 to 98 s; expect `--fit-total 91` to settle around `voice_settings.speed` 1.1 to 1.2. If the chosen voice sounds rushed at that speed, prefer accepting a total up to 94 s over squeezing the designed silences.
