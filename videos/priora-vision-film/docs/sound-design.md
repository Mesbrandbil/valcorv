# Sound design and the audio engine

The film's score, sound design and mix are generated offline, deterministically, by the Python engine in `audio-engine/`. Nothing is sampled or downloaded: the score is generated MIDI rendered through fluidsynth with the MuseScore General soundfont, and every sound effect is synthesised from the physics of its material. Nobody on the project can listen, so every decision is checked by measurement (loudness, true peak, spectra, onset timing, phase, discontinuities); the numbers are at the end of this page.

## One command

```bash
python3 audio-engine/build.py            # from the project root
```

Reads `cues/resolved.json`, `narration/timing.json` and `assets/audio/voice.wav`; writes `assets/audio/master-voice.wav`, `music.wav`, `sfx.wav` and `master.wav` (48 kHz, 24-bit, stereo) and a JSON report in `audio-engine/reports/`. A full build takes about 90 s (the first build after a cue change adds about 60 s of fluidsynth rendering; renders are cached by content hash in the system temp folder, or in `$PRIORA_AUDIO_CACHE`).

Re-run it whenever `cues/resolved.json`, the scene events, the narration timing or `voice.wav` change. Re-runs are bit-identical: two independent builds produced the same samples in all four files (checked by SHA-256 of the PCM data).

| Option | Effect |
| --- | --- |
| `--cues FILE` | another resolved cue file (default `cues/resolved.json`) |
| `--timing FILE` | word timings, used when `resolved.json` lines carry no words (default `narration/timing.json`) |
| `--voice FILE` | the voice stem (default `assets/audio/voice.wav`) |
| `--events FILE` | extra events, added to the events in `resolved.json` (repeatable) |
| `--out DIR` | output folder (default `assets/audio`) |
| `--qa DIR` | report folder (default `audio-engine/reports`); `--qa ''` skips it |
| `--pngs` | also draw spectrograms, per-section spectrograms and long-term spectra into the report folder |
| `--no-auto` | no default drawing events for scenes that have not published their own |
| `--target-lufs X` | master loudness (default -16) |
| `--voice-passthrough` | leave the voice untouched; the master's loudness then follows the voice stem |
| `--ceiling X` | true-peak ceiling in dBTP (default -1) |
| `--library DIR` | also write every library sound as a WAV plus spectrogram sheets |

Dependencies: python3 with numpy, scipy, soundfile, matplotlib (pictures only); fluidsynth and `/usr/share/sounds/sf3/MuseScore_General_Full.sf3` (apt `fluidsynth musescore-general-soundfont`). No MIDI library is needed: the engine writes Standard MIDI Files itself.

## What it writes, and how to place it

| File | Content |
| --- | --- |
| `assets/audio/master.wav` | the mix: -16 LUFS integrated, true peak at or under -1 dBTP |
| `assets/audio/master-voice.wav` | the voice exactly as it sits in the master (stereo) |
| `assets/audio/music.wav` | the score, carved under the voice |
| `assets/audio/sfx.wav` | sound design: beds, one-shots, the rewind |
| `audio-engine/reports/report.json` | every measurement, every cue with its source, event counts, warnings |
| `audio-engine/reports/events-used.json` | every sound placed: time, kind, seed, gain, origin (designed, scene or auto) |

`master.wav` equals `master-voice.wav + music.wav + sfx.wav` sample for sample (verified on every build; the only difference is 24-bit rounding, measured at -132.5 dBFS).

In HyperFrames, either place `master.wav` as the only audio track, or place the three stems `master-voice.wav`, `music.wav`, `sfx.wav` at `data-volume` 1 (the pipeline's render sums stems linearly and sample-aligned, docs/pipeline.md section 10). Do not combine `voice.wav` with `music.wav` and `sfx.wav`: in the default mode the master's voice is `voice.wav` with +0.86 dB of gain, DC removed and 1.3 dB of peak limiting on a few syllables, so that sum would be about 0.9 dB off in balance and would not be guaranteed under -1 dBTP. With `--voice-passthrough` the voice is untouched and `voice.wav + music.wav + sfx.wav` is exact, at the cost of loudness (the current guide voice then gives a -17 LUFS master). Do not add `data-fx-carve` to `music.wav`: the carve is already in the file, a runtime carve would take it twice.

## Input contract

### Cues

`cues/resolved.json` in the shape written by `scripts/build-cues.mjs`:

```json
{ "cues": { "offline": 22.28, "...": 0 },
  "scenes": { "a1-world": { "start": 0, "end": 42.76 } },
  "lines": { "L07": { "start": 20.94, "end": 22.78, "words": [ { "w": "offline", "start": 22.28, "end": 22.7 } ] } },
  "events": [ { "t": 12.88, "kind": "stamp", "scene": "a1-paper", "gain_db": 0 } ],
  "film": { "duration": 90 } }
```

Duration comes from `duration` or `film.duration`. When `lines` carry no `words`, whole lines are taken from `narration/timing.json`.

The engine needs the cues below. It uses the cue sheet's own name when present (first name listed); otherwise it derives the time from the narration words with ordered fallbacks, and records the source of every cue in the report (`cue:<name>`, `derived:word`, `derived:... (fallback n)`). An unresolvable cue stops the build with a list.

| Cue (names accepted) | Used for | Fallback |
| --- | --- | --- |
| `l01` | the first strokes and the opening fade | first word "Every" |
| `hour`, `contractors`, `isolated`, `workMoves` | piano motif, radio, footsteps, lockout, machinery entrance | words in L01, L02 |
| `insurance`, `accepted`, `translate`, `permits`, `checklists` | chord changes of Act I, the paper scene | words in L03, L04 |
| `noOne` (`movingSite`) | start of the rhythmic system (a bar line lands here) | word "But" |
| `moving`, `head` | complexity waves | words, line end |
| `roof03`, `hotWork`, `safeguards`, `inPlace` | Roof 03 push, five ticks | words, fallbacks |
| `landing` | the story time the rewind lands on | line after `inPlace` minus 0.25 s |
| `offline` | the subtraction and the valve clunk (impact on the word) | word "offline" |
| `nothingLooks`, `changed`, `nobody` | the thinning after the failure | words in L08 |
| `afterwards`, `q1`, `q3`, `gap`, `tooLate` | aftermath chords and low piano | words in L09 to L11 |
| `rewindStart`, `rewindEnd` | the rewind window (landing at `rewindEnd`) | L11 end + 0.35; next line start - 0.3 |
| `l12`, `decisionWord` | first notes after the rewind, alignment snaps | line after the rewind |
| `worker`, `six` | the roof air under the worker line | line after L12 |
| `connects`, `keepsRecord` | Act II pulse (a bar line lands on `connects`), record appends | words |
| `prevention`, `proof` | low accents on the two statements | words |
| `l16`, `offline2`, `sees`, `cross` | step-down, valve, system tick, the crossing | words; `cross` = end of the line with "sees" + 0.1 |
| `riskOwner`, `change`, `retain`, `carriers` | momentum (a bar line lands on `change`), three choice accents | words |
| `ordinary`, `decisionsL18` | quiet flow, two decision accents | words |
| `chainRecord`, `chainTrust`, `chainDecision`, `chainPrice`, `chainCapacity` | the five chain confirmations, the closing harmony | words |
| `priora`, `infrastructure` | the latch and the final D chord | words |

### Events

Events come from `resolved.json` (`events`, compiled from `compositions/<scene>.events.json`) and from any `--events` file. Each event needs a time and a kind:

| Field | Meaning |
| --- | --- |
| `t` | absolute film seconds (as written by the cue compiler) |
| `at` | alternative to `t`: `cue:<name>+0.2` or `local:1.25` with `scene` |
| `kind` | a kind from docs/sound-events.md or any engine kind below |
| `scene` | the scene id that publishes it |
| `gain_db` | relative to the kind's designed level (default 0) |
| `dur` | for continuous kinds (strokes, lines, hatching, stretches, van) |
| `pan` | -1 left to 1 right (default 0) |
| `seed` | variation (default derived from the event's position) |
| `name` | a series suffix `-01` to `-05` selects the variant (verify ticks, choice accents, chain links) |
| `series` | `{ "count", "every" }`, expanded if the compiler has not already |

Every kind in docs/sound-events.md is supported and mapped as follows:

| Vocabulary kind | Engine sound |
| --- | --- |
| `pencil` | graphite stroke (`dur`; optional `pressure`, `speed`) |
| `pencil-scatter` | a burst of short strokes and ticks over `dur` |
| `pen` | technical pen line (`dur`) |
| `ruler` | ruler contact, then a ruled graphite line (`dur`) |
| `set-square` | acrylic set-square double tap, then the first stroke (`dur`) |
| `hatch` | hatching (`dur`, `rate`) |
| `tick` | graphite check mark |
| `stamp`, `paper-slide`, `paper-lift` | rubber stamp; sheet sliding (`dur`); sheet lifted |
| `pin` | fragment pinned: a flutter and a pin seating |
| `footsteps` | sparse steps on gravel (`dur` gives the count; `surface` gravel or concrete) |
| `van` | a distant van arriving (`dur`) |
| `radio-click`, `valve-clunk` | radio push-to-talk; muted sprinkler valve with flow settling |
| `subtract-bed` | control: removes the machinery bed and thins the ventilation at `t` (`dur` = fade) |
| `fray` | near-silent parting of fibres |
| `incident` | far, muffled low thud and a short low swell |
| `question` | a very soft paper touch |
| `gap-rule` | ruler contact, then a technical pen line (`dur`) |
| `rewind` | control only: the rewind is built from `rewindStart` and `rewindEnd` |
| `latch-soft` | the catch of the latch alone, small |
| `precision-snap` | a cluster of alignment snaps over `dur` |
| `header-in` | a soft panel air and two snaps |
| `capture-start`, `word-token` | soft felt tick; a quieter snap per token |
| `connect-line`, `layer-slice` | a fine narrow air rising to a tick (`dur`) |
| `verify-tick` | felt-metal confirmation, five variants rising D5 E5 F#5 A5 B5 |
| `record-append`, `system-event` | paper click on a low tuned body; the same plus a relay |
| `row-unavailable` | two falling felt notes, not an alarm |
| `node-stretch`, `node-cross` | the tightening stretch (`dur`); the crossing snap |
| `sheet-in`, `node-return` | panel air landing on a tick; snap plus a soft confirmation |
| `choice-accent` | change (wood dyad), retain (felt over a string), transfer (tine) by series index |
| `packet-send`, `carrier-response`, `node-pass`, `decision-accent` | rising air to a tick; small wood tick at its own pitch; softest felt tick; felt over a hammered string |
| `chain-confirm-1` to `-5` | RECORD paper (A4), TRUST wood (D5), DECISION felt-hammer string (E5), PRICE steel bar (F#5), CAPACITY resonant block (A3) |
| `latch` | the Priora latch: bolt slide, catch, a low D resonance |

Engine kinds can also be used directly: `pencil-stroke`, `pencil-tick`, `pencil-hatch`, `technical-pen`, `ruler-contact`, `set-square-tap`, `page-turn`, `paper-stack`, `radio-squelch`, `footstep`, `relay-click`, `solenoid-click`, `confirm`, `system-tick`, `response-tick`, `packet`, `align-snap`, `stretch`, `cross-snap`, `distant-clank`, `pump-thud`, the chain links `chain-record` to `chain-capacity`, and the rewind kit `rewind-paper`, `rewind-pencil`, `rewind-mechanism`, `rewind-whoosh`, `rewind-suction` (placed inside the rewind window they play backward with it). Unknown kinds are skipped and listed in the report's warnings.

### Who owns a sound

Three sources are merged:

1. **Scene events** always play.
2. **Designed events** are story sounds the engine places from cues: radio squelch nudged into a pause after "Contractors arrive", six footsteps on gravel, the lockout solenoid on "isolated", two distant clanks and a radio click in pauses, the valve clunk with its impact on "offline" (all `a1-world`); the quieter valve on the second "offline", the system tick on "sees", the stretch and crossing snap after L16, the three choice accents on "change", "retain", "carriers", two decision accents on "decisions" (all `a3-change`); the five chain links and the latch (`a3-close`). A designed sound is dropped when its scene publishes the same kind, or when any scene event of that kind lands within 0.3 s.
3. **Auto events** are a full default set of drawing and interface sounds for every scene (strokes, rules, envelope passes, stamps, fragments, snaps, verify ticks, packets, node passes). A scene's auto events switch off as soon as that scene publishes any event, so each scene should then declare all of its sounds. `--no-auto` disables them everywhere.

## The sound plan

Key D major and its relative B minor throughout, slow harmonic rhythm (one chord per bar or two), 96 BPM wherever there is a pulse. Nothing is time-stretched: each phrase starts at a cue, and inside a phrase the grid is anchored so a bar line falls on the cue (`noOne`, `connects`, `change`).

| Beat | Music | Sound design |
| --- | --- | --- |
| 0 to L05: the site wakes, insurance becomes workflow | Dsus2 on slow strings with a warm D pedal, a sparse felt-piano motif (A4, F#4, E4, D4), then Bm7, Gmaj7, Asus4 on the insurance lines | ventilation fades in; first edge with a set-square tap; the site draws itself in graphite; radio, footsteps on gravel, the lockout; distant machinery enters on "isolated"; paper, pen, stamp and ticks for the programme clause becoming procedure, permit, briefing, checklist |
| L05 to "offline": complexity | the quiet rhythmic system: distant pump strokes on 1 and 3, relay ticks on the off-beats, conveyor sixteenths and a valve breath every other bar, all synthesised operational sounds; piano two-note figure; D then Gmaj7; sub on the root | overlapping waves of ticks and short strokes, three containment lines, the five safeguard ticks, the zone hatched |
| "offline" to L09: the unnoticed failure | subtraction on the word: pump, conveyor, pad, sub, cello and piano removed (pad 0.35 s, cello 0.3 s, piano and sub 0.12 s); relays continue at half time and fade out by "nobody"; one high held B4 and E5 thins away | the valve clunks behind a wall (muted, no alarm); the machinery bed is removed and the ventilation drops 3 dB |
| L09 to L11: afterwards | contrabass B1, cello F#2, strings F#3 B3 D4 then Gmaj7 on "gap"; single low piano notes | evidence fragments slide and pin; the gap rule drawn with a pen against a ruler |
| the rewind | the Act I music and ambience run backward with the picture (see below) | reversed paper, pencil and the sprinkler valve; suction into near silence |
| L12 to L15: Priora today | a clean A3 E4 fifth, one D5 piano note on "decision", a precise wood tick alone on the grid; from "connects" an 8th-note felt ostinato over Dadd9, A/C#, Bm7, Gmaj7 with a soft low pulse and relays; low piano accents on "Prevention" and "Proof" | fourteen alignment snaps as the graphite resolves, roof air under the worker line, four field snaps, two connection packets, five verify ticks rising, two record appends |
| L16 to the crossing | the ostinato steps down on "offline"; near silence and one low D for the crossing | quieter valve, system tick on "sees", a tightening stretch and the crossing snap (10 to 14 dB above the stretch) |
| L17, L18: three choices, the whole site | momentum on "change": Bm, G, D, A with ticks, pulse and relays; from "ordinary" a thinner flow | three materially distinct choice accents, packet and four carrier responses, sparse node passes, two decision accents |
| the chain and the mark | pulse stops; Gadd9, Asus4 on "price", D add9 (wide) on "Priora"; long natural decay, silent at the end | five chain confirmations tuned into the closing D major (A4, D5, E5, F#5, A3), one clean latch |

Levels, as mixed: music sits about 13.8 LU under the voice while it speaks (bed median -29.8 LUFS momentary against a voice median of -16.0) and is carved as below; one-shots are designed to peak between -13 dBFS (the latch) and -33 dBFS (distant clanks) before per-event gains, against voice peaks at -1.4 dBTP; the beds are designed quiet (ventilation -41 LUFS before the carve).

### Instruments and sounds

Score: MuseScore General "Grand Piano" played at velocities 23 to 44, low-passed at 2.9 kHz with a felt-hammer thock added under each note (the felt piano); "Strings Slow" with CC11 swells; "Warm Pad", "Cello" and "Contrabass"; a sine sub kept between 45 and 90 Hz; plate and hall reverbs synthesised as deterministic impulse responses. Each family is calibrated to a loudness target before mixing (piano -26.5, strings -27.5, pad -35, cello -34, contrabass -38, sub -47, pulse -30 LUFS), and the music bus gets a 32 Hz 24 dB per octave high-pass and a -4 dB shelf at 110 Hz.

Material sounds (all in `engine/library.py`): graphite is dense heavy-tailed micro-fractures through a 1.4 to 7.6 kHz band over a quieter friction hiss, with slow paper-fibre pressure texture, hand speed wander, corner lifts, a faint desk body and a 3 dB dip at 3.3 kHz; the technical pen is denser, finer and smoother with faint nib resonances; paper is band-limited friction with moving pan, crackle made of sparse cracks through a bright resonant body, and air sweeps; impacts are a contact pulse exciting a few damped modes, with the mallet contact time scaled to the pitch (felt is a long contact, so round and dark); the valve is a heavy damped metal impact with pipe resonance and a settling flow, low-passed at 2.6 kHz; relays are an armature click with a contact bounce; confirmations are tuned bars (wood 1:4:10, felt vibraphone-like, free-free steel 1:2.76:5.40, tine, felt-hammer string with slight inharmonicity, resonant block) under a small precision tick. Beds: ventilation (coloured air, duct modes, a faint 118 Hz blade tone), distant plant machinery (50 Hz mains harmonics at 100 to 300 Hz, a cyclic load, heard mostly through a hall), roof air, a near-silent room tone for the product space.

### The rewind

The picture scrubs the story backward from `rewindStart` to `landing` over the rewind window with a slow start, a fast middle and a very hard deceleration (`ease(u) = 1 - (1 - u^1.7)^4.5`); the sound does the same from the film's own Act I audio:

1. The forward sound falls away in 0.3 s.
2. Granular reverse: 75 ms Hann grains, each played backward, read from the story time the picture is showing (four-way overlap, small jitter against combing). Pitch is preserved, there is no varispeed and no tape-stop. The music stem reverses the music, the SFX stem reverses the ambience and effects. The texture follows a designed loudness arc relative to the Act I bed (peak in the fast middle, then -15 dB and -32 dB), whatever material lies under the scrub, and in the deceleration it is drawn thin from both ends (top closing from 14 kHz to 900 Hz, bottom rising from 40 to 300 Hz).
3. Suction: the last 1.2 s of the Act I bed, convolved with a long synthetic space and reversed, swells into the landing at 4 dB under the Act I bed's level and is cut clean (8 ms) exactly at `rewindEnd`.
4. A reverse whoosh: a narrowing band rising from 260 Hz to 5.2 kHz, the image collapsing from wide to centre, clean stop.
5. The sprinkler valve and its room reversed, its impact placed where the picture passes the story time of "offline"; reversed paper as the evidence clears; five reversed pencil strokes as the sprinkler heads re-ink.

After the landing: near silence (room tone at about -58 LUFS) for the 0.3 s hold, then L12.

### The mix

- **Carve** (music and ambience beds, never the voice and never the sync one-shots): voice activity from the voice's own 150 Hz to 5 kHz level in 10 ms frames, 60 ms look-ahead, 25 ms attack, 420 ms release. One smooth time-varying spectral gain (STFT 2048, 75 percent overlap) combines a broadband duck, a dip centred at 2.2 kHz spanning about 1 to 4.5 kHz and a small dip at 450 Hz. Measured on pink noise at full activity, music: -4.5 dB at 100 Hz, -7.1 at 450 Hz, -7.6 at 1 kHz, -10.5 at 2.2 kHz, -8.1 at 4 kHz, -5.1 at 8 kHz; beds: -2.5, -4.1, -4.5, -6.5, -4.9, -2.9 dB. The duck starts 35 ms before the first word.
- **Loudness**: one gain for the whole mix to -16.0 LUFS integrated (EBU R128, web). The voice is DC-blocked (the guide voice carries a -65 dBFS DC offset) and only where that gain pushes it over -1.4 dBTP is it held by a look-ahead true-peak limiter (1.5 ms look-ahead, 60 ms release).
- **Ceiling**: a look-ahead limiter on music and SFX only, computed from the 4x oversampled sum with the voice, holds the master at or under -1 dBTP; the same gain curve on both stems keeps the sum exact.
- **Hygiene**: SFX bus high-passed at 30 Hz (24 dB per octave), one-shots at 28 Hz, 4 ms fade-in at the head, the last 0.2 s faded so the final sample is exactly zero, every placed sound and every automation edge on raised-cosine ramps.

## Measured QA (build of 2026-09-29 against the guide voice)

Cues: `cues/cuesheet.json` evaluated against the current `narration/timing.json` (90.00 s). The live `cues/resolved.json` was still the prototype sheet at the time, so these stems are provisional: re-run the command above once `scripts/build-cues.mjs` writes the real sheet and whenever the ElevenLabs voice replaces the guide.

| Measure | Value |
| --- | --- |
| Master integrated loudness | -16.0 LUFS (engine), -16.0 (ffmpeg ebur128), -16.05 (pyloudnorm) |
| Master true peak | -1.05 dBTP (engine, 4x oversampled), -1.1 dBTP (ffmpeg) |
| Master loudness range | 2.8 LU; short-term maximum -14.8 LUFS |
| Master crest factor | 18.4 dB |
| Stems sum to master | maximum difference 2.4e-7 (-132.5 dBFS, 24-bit rounding) |
| Voice gain and limiting | +0.86 dB; limiter at most 1.29 dB, over 0.5 dB for 58 ms in total |
| Bed ceiling | at most 4.0 dB of reduction, 0.48 s in total, all under voice peaks |
| Music stem / SFX stem | -28.1 LUFS, -7.3 dBTP / -38.1 LUFS, -13.2 dBTP |
| Bed under speech / voice | -29.8 / -16.0 LUFS momentary medians |
| DC offset | 2e-7 or less on every stem |
| Energy below 30 Hz | -44.3 dB (master), -48.9 dB (music), -42.0 dB (SFX), relative to the full band |
| 2 to 5 kHz against 200 Hz to 2 kHz (music plus SFX) | Act I -15.9 dB, rewind -10.9, Act II -19.9, Act III -22.1, close -20.0: no build-up in the harsh band |
| Stereo | master L/R correlation 0.97, mono fold-down loss 0.05 dB; music plus SFX correlation 0.39 to 0.70 per section, fold-down loss at most 1.6 dB (rewind) |
| Sync onsets | 27 sharp sync sounds measured in the rendered SFX stem: all within 1.5 ms of their cue (0.5 ms frames), median 1.0 ms |
| Discontinuities | no step at any edit point in music or master; the one flagged step in SFX (76.49 s) is the intended onset of the RECORD confirmation; no sound starts abruptly out of silence; no high-frequency clicks in the pitched music layers (fluidsynth note-offs included) |
| Head and tail | first and last samples exactly 0; last 50 ms peak -100.6 dBFS |
| Determinism | two independent builds: identical PCM in all four files |

Per section (music plus SFX, integrated): Act I -28.3 LUFS, rewind -30.9, Act II -26.7, Act III -26.9, close -29.8.

Pictures of the demo build (spectrograms of the whole film, of each section, long-term spectra, and spectrogram sheets of every library sound) were inspected during development; re-create them with `--pngs --library DIR`.

## Open points

- Re-run after the real `cues/resolved.json` lands, after scenes publish their events, and after the ElevenLabs voice is assembled; review `reports/report.json` (cue sources, warnings, onset timing, loudness) each time.
- The cue compiler's index currently places `voice.wav` as the voice stem; for the review mix to equal the master it should place `master-voice.wav` (or `master.wav` alone).
- The score's low end is deliberately warm (a distant pump and a sine sub in Act I); if the film is judged on small speakers only, `TARGET_LUFS` in `engine/score.py` and the 110 Hz shelf in `engine/pipeline.py` are the two controls.
