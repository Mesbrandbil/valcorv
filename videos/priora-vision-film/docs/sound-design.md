# Sound design and the audio engine

The film's score, sound design and mix are generated offline, deterministically, by the Python engine in `audio-engine/`. Nothing is sampled or downloaded: the score is generated MIDI rendered through fluidsynth with the MuseScore General soundfont, and every sound effect is synthesised from the physics of its material. Nobody on the project can listen, so every decision is checked by measurement (loudness, true peak, spectra, onset timing, phase, discontinuities, the grid heard back); the numbers are at the end of this page.

Cut 2: the score runs on the edit's 92 BPM grid from film time 0 (beat 0.652 s, bar 2.609 s; `narration/timing.json` "grid"). Every note and every pulse event starts on a bar, beat, half beat or sixteenth, sections change on the bar line nearest the story turn, and the film's length is whatever `END` is. The scenes' editorial accents (`cut`, `push`, `pull`, `whip`, `sheet-lay`, `focus`, `hold`, `arc`, `handwheel`, `gauge`) are part of the event vocabulary.

## One command

```bash
python3 audio-engine/build.py            # from the project root
```

Reads `cues/resolved.json`, `narration/timing.json` and `assets/audio/voice.wav`; writes `assets/audio/master-voice.wav`, `music.wav`, `sfx.wav` and `master.wav` (48 kHz, 24-bit, stereo) and a JSON report in `audio-engine/reports/`. A full build of the 126.5 s film takes about 3 minutes on the shared 4-CPU machine, a little more after a cue change moves notes (fluidsynth renders are cached by content hash in the system temp folder, or in `$PRIORA_AUDIO_CACHE`).

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

Duration comes from `duration` or `film.duration`. When `lines` carry no `words`, whole lines are taken from `narration/timing.json`. The grid comes from `narration/timing.json` "grid" (`bpm`, `offset`), else from a "grid" in `resolved.json`, else 92 BPM from 0.

The engine needs the cues below. It uses the cue sheet's own name when present (first name listed); otherwise it derives the time from the narration words with ordered fallbacks, and records the source of every cue in the report (`cue:<name>`, `derived:word`, `derived:... (fallback n)`). An unresolvable cue stops the build with a list. "Bar near" below means the bar line nearest the cue; "bar after" means the nearest bar line that is not earlier than the cue (used where a protected silence must finish first).

| Cue (names accepted) | Used for | Fallback |
| --- | --- | --- |
| `l01` | strings enter on the bar near it | first word "Every" |
| `hour`, `contractors`, `equipment`, `isolated`, `workMoves` | piano motif (one note per shot, on the nearest beat), the gentle pulse from the bar near `contractors`, radio, footsteps, lockout, machinery entrance | words in L01, L02 |
| `insurance`, `accepted`, `paperIn`, `translate`, `permits`, `checklists` | Act I chord changes on the bars near them; the pulse dims under the paper from `paperIn` | words in L03, L04 |
| `noOne` (`movingSite`) | the build under S6 starts on the bar near it | word "But" |
| `moving`, `head` | complexity waves | words, line end |
| `roof03`, `hotWork`, `safeguards`, `inPlace` | Roof 03, five ticks | words, fallbacks |
| `landing`, `then` | the story time the rewind lands on; the held high B enters on the bar near `then` | line after `inPlace` minus 0.25 s; `landing` + 0.25 |
| `offline` | the subtraction (on the word) and the valve clunk | word "offline" |
| `nothingLooks`, `changed`, `nobody`, `nobodyEnd` | the held B thins; it is gone by the bar after `nobodyEnd` | words in L08; end of L08 |
| `afterwards`, `q1`, `q3`, `gap`, `tooLate` | aftermath on the bar after `afterwards`, its chords and low piano | words in L09 to L11 |
| `rewindStart`, `rewindEnd` | the rewind window (landing at `rewindEnd`) | L11 end + 0.35; next line start - 0.3 |
| `l12`, `decisionWord`, `riskChanged` | clarity on the bar after the landing near `l12`; the quantised pulse on the bar after `riskChanged` | line after the rewind; end of L12 |
| `worker`, `six` | the roof air under the worker line | line after L12 |
| `connects`, `keepsRecord` | the ostinato from the bar near `connects`, record appends | words |
| `prevention`, `proof` | low accents on the nearest half beat | words |
| `l16`, `offline2`, `sees`, `cross` | step down on the beat near `offline2`, fade from `sees`, near silence from the bar near `cross` | words; `cross` = end of the line with "sees" + 0.1 |
| `riskOwner`, `change`, `retain`, `carriers` | momentum from the bar after `riskOwner`, three choice accents | words |
| `ordinary`, `decisionsL18`, `closeIn` | the swell from the bar near `ordinary`, cresting on the beat near `closeIn` | words; end of L18 + 0.1 |
| `chainRecord`, `chainTrust`, `chainDecision`, `chainPrice`, `chainCapacity`, `chainHold` | the five chain confirmations; chords on the bars near Record, Decision, Price; the resolution on the bar after `chainCapacity` | words; end of L19d |
| `priora`, `infrastructure` | the latch (nothing new in the music there) | words |

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
| `material` | `cut` only: `paper`, `felt`, `graphite` or `wood` (default: paper before `rewindEnd`, felt after) |
| `direction` | `whip`: +1 left to right (default), -1 right to left; `gauge`: -1 falling to the stop pin (default), +1 rising to a reading |

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
| `cut` | a picture cut: under a quarter of a second, energy at 90 to 250 Hz, rounded attack; paper (a card edge through a cushion of air), felt (a felt mallet on a padded surface, darkest), graphite (a pencil point set down, a faint dry tick), wood (a soft knock on a small block) |
| `push` | a push-in (`dur` = the move): a low, narrow air rising from about 230 Hz to 1.25 kHz, the image closing to centre, landing in a soft low bloom (86 to 62 Hz) at `dur` |
| `pull` | a pull-back (`dur` = the move): an air descending from about 1.45 kHz to 290 Hz, the image opening from centre to wide, over a gentle low swell; longer pulls are spread thinner (peak lowered by 10 log10(dur / 1.3) dB) |
| `whip` | a snappy lateral move (`dur` 0.12 to 0.6 s): a brief band of air (620, 1650, 900 Hz) crossing the image, low-passed at 3.6 kHz, the quietest accent |
| `sheet-lay` | a sheet laid flat: a paper slide (from the right by default, `pan0` 0.5 to `pan1` 0.05) and, at `dur`, the settle as its air cushion lets go |
| `focus` | an element isolated to a hero shot: a detent seating (a tiny click, a smaller one 6 ms later, a faint A5 body) |
| `hold` | control, no sound: thins the score and the beds over `dur` (see below) |
| `arc` | the welding arc (`dur`): sparse dry cracks in flickering bursts over a faint sizzle, 1.8 to 8.5 kHz, very quiet; no hum, no roar |
| `handwheel` | a valve handwheel turning (`dur`): low metal friction of the stem in its packing (90 Hz to 2.2 kHz), one effort swell per hand push (one per 0.6 s), the pipe body answering at about 240 and 620 Hz; no ratchet |
| `gauge` | a pressure-gauge needle (`dur` = its travel, default 0): a faint gear-train whirr, then at `dur` a small sprung-metal tick; falling it meets the stop pin and bounces once, rising it settles lighter |

`hold` (a held major moment, `dur` default one bar): over its span the score is thinned so silence gives the moment weight. Nothing new starts in the moving layers (the pulse events and the piano ostinato inside the hold are removed; their tails ring out), the sustained layers (strings, pad, cello, sub) are drawn down by the hold's `gain_db` (default -8 dB; -60 is silence) over a quarter of a second and come back over one beat after the hold, and every bed dips by 0.6 of that depth. A light hold (`gain_db` above -6) keeps the pulse, drawn down with the rest. The designed quiet of the protected moments is exempt and never touched: the held high B of the unnoticed change, the aftermath, the crossing's low D and the whole close (swell, chain, resolution, decay). The voice is never touched. A hold inside the rewind is ignored (listed in warnings). The report lists every hold (`score.holds`, with its bar and beat), what it removed (`score.removed_by_holds`) and the loudness before and inside it (`qa.silences.holds`).

Engine kinds can also be used directly: `pencil-stroke`, `pencil-tick`, `pencil-hatch`, `technical-pen`, `ruler-contact`, `set-square-tap`, `page-turn`, `paper-stack`, `radio-squelch`, `footstep`, `relay-click`, `solenoid-click`, `confirm`, `system-tick`, `response-tick`, `packet`, `align-snap`, `stretch`, `cross-snap`, `distant-clank`, `pump-thud`, the chain links `chain-record` to `chain-capacity`, and the rewind kit `rewind-paper`, `rewind-pencil`, `rewind-mechanism`, `rewind-whoosh`, `rewind-suction` (placed inside the rewind window they play backward with it). Unknown kinds are skipped and listed in the report's warnings.

Between `rewindStart` and `rewindEnd` every one-shot falls away (0.3 s) and stays muted, because the rewind replaces the forward sound; only the `rewind-*` kinds play there. A scene event of any other kind inside that window is faded or silent and the report lists it under warnings. Place the landing sound (`latch-soft`) at `cue:rewindEnd` or later.

Where the audible transient sits inside a sound, for syncing picture to it (the event's time is the start of the sound):

| Kind | Transient |
| --- | --- |
| `valve-clunk` | impact at +0.15 s (handle turn and ratchet before it) |
| `packet-send` (`packet`) | tick at +0.19 s |
| `sheet-in` | tick at +0.30 s |
| `header-in` | snaps at +0.25 and +0.40 s (each locks 0.028 s after it starts), tick at +0.30 s |
| `connect-line`, `layer-slice` | tick at `dur` (air rising before it) |
| `precision-snap`, `word-token` (`align-snap`) | each lock at +0.028 s |
| `latch` | catch at +0.036 s |
| `pin` | pin seats at +0.06 s |
| `row-unavailable` | second note at +0.09 s |
| `ruler`, `gap-rule`, `set-square` | contact at +0, the stroke or pen line from +0.03 to +0.04 s |
| `node-stretch` | ends abruptly at `dur` (place `node-cross` there) |
| `cut`, `focus` | at +0.001 to +0.002 s |
| `push` | the bloom at `dur` (the end of the move) |
| `sheet-lay` | the settle at `dur` |
| `gauge` | the tick at `dur` (at +0 when `dur` is 0); the bounce 30 to 40 ms later when falling |

Editorial accents are not moved by the engine: they sound where the scene puts them, so picture and sound share one time. The report's `editorial_grid` lists each `cut`, `push`, `pull`, `whip`, `sheet-lay`, `focus` and `hold` with its offset from the nearest half beat, so an accent that missed the grid shows up there.

### Who owns a sound

Three sources are merged:

1. **Scene events** always play.
2. **Designed events** are story sounds the engine places from cues: radio squelch nudged into a pause after "Contractors arrive", six footsteps on gravel, the lockout solenoid on "isolated", two distant clanks and a radio click in pauses, the valve clunk with its impact on "offline" (all `a1-world`); the quieter valve on the second "offline", the system tick on "sees", the stretch and crossing snap after L16, the three choice accents on "change", "retain", "carriers", two decision accents on "decisions" (all `a3-change`); the five chain links and the latch (`a3-close`). A designed sound is dropped when its scene publishes the same kind, or when any scene event of that kind lands within 0.3 s; the lockout (solenoid and relay on "isolated") is also dropped when a scene turns a `handwheel` within 1.5 s of it (cut 2's valve insert).
3. **Auto events** are a full default set of drawing and interface sounds for every scene (strokes, rules, envelope passes, stamps, fragments, snaps, verify ticks, packets, node passes). A scene's auto events switch off as soon as that scene publishes any event, so each scene should then declare all of its sounds. `--no-auto` disables them everywhere.

## The sound plan

Key D major and its relative B minor throughout, slow harmonic rhythm (one chord per bar or two), on the edit's 92 BPM grid from film time 0. Nothing is time-stretched and nothing is humanised in time: every note and every pulse event starts on a bar, beat, half beat or sixteenth, and the report proves it (`score.grid_check`: the coarsest grid unit of every onset, and the largest offset from a sixteenth, 0.0 ms). Each section starts on the bar line nearest the cue that turns the story (`score.sections` lists each with its cue and the distance in beats); where the nearest bar would sound before a protected silence has finished (the aftermath, the landing, the choices, the resolution), the next bar is taken. The one gesture timed to a word rather than to the grid is the subtraction on "offline": it is a removal, not an onset (the next grid events simply do not happen), and it lands with the valve's impact.

With the guide narration (126.53 s), bars 0 to 48:

| Section (bar.beat) | Music | Sound design |
| --- | --- | --- |
| A, 0.1 to 8.1: the site wakes, insurance becomes workflow | a warm D drone rising from the first downbeat; Dsus2 strings from bar 1 (near "Every"); a felt-piano motif, one note per shot on the beat nearest its word (A4 "hour", F#4 "Contractors", E4 "Equipment", D4 and A3 "Work moves", D5 and B3 "accepted", C#5 "permits", A4 "checklists"); Bm7, Gmaj7, Asus4 on the bars near "insurance", "accepted", "checklists"; from bar 2 (near "Contractors") a gentle operational pulse: a distant pump on each bar, a relay on beat 3, from "Work moves" a late relay on 4-and and a valve breath every other bar; 4 dB quieter under the paper sheet | ventilation fades in; the first edge with a set-square; the site draws itself; van, footsteps, radio; machinery enters on "isolated"; paper, pen, stamp and ticks for the clause becoming procedure; the scenes' cuts, the pull back of S2, the sheet laid over the drawing |
| B, 8.1 to "offline": builds under S6, then Roof 03 | from the bar near "But": pump strokes on 1 and 3 growing over two bars, relays on every off-beat, then conveyor sixteenths, a valve breath every other bar and the piano's two-note figure; D, D, Gmaj7, Gmaj7; sub on the roots; on bar 11 (near "Then") one high B enters inside the texture | waves of ticks and strokes, containment lines, the push to Roof 03, the arc, five safeguard ticks |
| C, "offline" to bar 15: the unnoticed change | subtraction on the word: pulse, strings, pad, cello, piano and sub removed (0.12 to 0.35 s); the high B remains alone, rises a little, thins by "nobody" and is gone on the bar after L08; then silence to the aftermath | the handwheel, the gauge, the valve behind a wall (no alarm); the machinery bed removed, the ventilation down 3 dB; the fray |
| D, bar 16 to the rewind: afterwards | a low tension from the bar after "afterwards" (the silence after L08 is kept whole): contrabass B1, cello F#2, strings F#3 B3 D4 from the bar near the first question, Gmaj7 on the bar near "gap"; single low piano notes on the beats nearest "afterwards", the first and third questions and "gap"; a faint felt heartbeat on each bar | the incident annotation, evidence fragments slide and pin, the gap rule |
| the rewind | the Act I music and ambience run backward with the picture (below); the landing is silent | reversed paper, pencil and the sprinkler valve; suction into near silence; the landing latch |
| E, bar 23: clarity | on the bar after the landing (near L12): a clean A3 E4 fifth and one D5 piano note; from bar 24 (after "changed", the resolve) the precise wood tick enters alone on the eighths, a soft felt pulse from its second bar | alignment snaps as the graphite resolves, roof air under the worker line, the push to the worker |
| F, bar 26 to "offline" again: Priora today | from the bar near "connects": an 8th-note felt ostinato over Dadd9, A/C#, Bm7, Gmaj7 (a chord a bar), a soft pulse on 1 and 3, relays on 2 and 4; low piano accents on the half beats nearest "Prevention" and "Proof" | connection lines, the pull back of S14 and its hold, five verify ticks rising, record appends |
| G, bars 31 to 34: the change seen live | on the beat nearest the second "offline" the piano and cello step out and the tick thins to quarters; from "sees" the pad and strings fall away, gone on the bar near the crossing; one low D (cello and sub) holds through the crossing, near silence | the quieter valve, the system tick, the row turning UNAVAILABLE, the stretch and the crossing snap |
| H, bar 34 to bar 39: three choices | momentum from the bar after "The risk owner" (its first bar grows in from 7 dB down): Bm, G, D, A, one a bar; ostinato, ticks on eighths with sixteenth ghosts, soft pulse, relays | three materially distinct choice accents on their words, the packet, the carrier responses on beats, holds after each choice |
| I, bar 39 to bar 40: the pull back | from the bar near "ordinary" the pulse thins to quarters and falls away; D/F# strings and a D and A pedal swell, cresting on the beat nearest `closeIn` | sparse node passes, two decision accents, the two-bar pull |
| J, bar 40 to the end: the chain and the mark | Gmaj7 on the bar near `closeIn`, G add9 near "Record", Em7 near "decisions", A sus4 near "price"; on the bar after "capacity" the score resolves to D add9 (wide, with a low piano D chord and contrabass) and stays still under the full-chain hold; nothing new at "Priora" (the latch stays clean); a long natural decay to silence at `END` | five chain confirmations tuned into the closing harmony (A4, D5, E5, F#5, A3), one clean latch |

Levels, as mixed: music sits about 15 LU under the voice while it speaks (bed median about -30.7 LUFS momentary against a voice median of -15.6) and is carved as below; one-shots are designed to peak between -13 dBFS (the latch) and -33 dBFS (distant clanks) before per-event gains, against voice peaks at -1.4 dBTP; the beds are designed quiet (ventilation -41 LUFS before the carve).

### Instruments and sounds

Score: MuseScore General "Grand Piano" played at velocities 23 to 44, low-passed at 2.9 kHz with a felt-hammer thock added under each note (the felt piano); "Strings Slow" with CC11 swells; "Warm Pad", "Cello" and "Contrabass"; a sine sub kept between 45 and 90 Hz; plate and hall reverbs synthesised as deterministic impulse responses. Each family is calibrated to a loudness target before mixing (piano -26.5, strings -27.5, pad -35, cello -34, contrabass -38, sub -47, pulse -30 LUFS), and the music bus gets a 32 Hz 24 dB per octave high-pass and a -4 dB shelf at 110 Hz.

Material sounds (all in `engine/library.py`): graphite is dense heavy-tailed micro-fractures through a 1.4 to 7.6 kHz band over a quieter friction hiss, with slow paper-fibre pressure texture, hand speed wander, corner lifts, a faint desk body and a 3 dB dip at 3.3 kHz; the technical pen is denser, finer and smoother with faint nib resonances; paper is band-limited friction with moving pan, crackle made of sparse cracks through a bright resonant body, and air sweeps; impacts are a contact pulse exciting a few damped modes, with the mallet contact time scaled to the pitch (felt is a long contact, so round and dark); the valve is a heavy damped metal impact with pipe resonance and a settling flow, low-passed at 2.6 kHz; relays are an armature click with a contact bounce; confirmations are tuned bars (wood 1:4:10, felt vibraphone-like, free-free steel 1:2.76:5.40, tine, felt-hammer string with slight inharmonicity, resonant block) under a small precision tick. Beds: ventilation (coloured air, duct modes, a faint 118 Hz blade tone), distant plant machinery (50 Hz mains harmonics at 100 to 300 Hz, a cyclic load, heard mostly through a hall), roof air, a near-silent room tone for the product space.

The cut 2 editorial accents are built to be felt more than heard: short, low-mid, rounded attacks, no bright transients, no risers, no booms. Their designed levels (before the event's `gain_db`), with the short-term loudness of one sound at that level: `cut` -26 dBFS peak (about -45 to -48 LUFS), `push` and `pull` -30 (-43 to -44; a two-bar pull -50), `whip` -35 (-47), `sheet-lay` -25 (-37), `focus` -27 (-52), `arc` -30 (-58), `handwheel` -28 (-42), `gauge` -25 (-51). A camera move's air (`push`, `pull`, `whip`) is a texture, so it is carved under the voice like the beds; every other accent is a sync sound and is not.

### The rewind

The picture scrubs the story backward from `rewindStart` to `landing` over the rewind window with a slow start, a fast middle and a very hard deceleration: `FL.rewindEase()` in `assets/js/film-lib.js`, the CustomEase path `M0,0 C0.18,0 0.26,0.06 0.36,0.22 0.5,0.46 0.62,0.86 0.74,0.96 0.84,0.995 0.9,1 1,1` (0, .008, .044, .134, .294, .51, .737, .916, .979, .997, 1 at tenths). The sound reads story time through the same path (`EASE_PATH` in `engine/rewind.py`, within 0.0013 of GSAP's own values at 201 points), so if one changes, change both. The sound is built from the film's own Act I audio:

1. The forward sound falls away in 0.3 s.
2. Granular reverse: 75 ms Hann grains, each played backward, read from the story time the picture is showing (four-way overlap, small jitter against combing). Pitch is preserved, there is no varispeed and no tape-stop. The music stem reverses the music, the SFX stem reverses the ambience and effects. The texture follows a designed loudness arc relative to the Act I bed (peak in the fast middle, then -15 dB and -32 dB), whatever material lies under the scrub, and in the deceleration it is drawn thin from both ends (top closing from 14 kHz to 900 Hz, bottom rising from 40 to 300 Hz).
3. Suction: the last 1.2 s of the Act I bed, convolved with a long synthetic space and reversed, swells into the landing at 4 dB under the Act I bed's level and is cut clean (8 ms) exactly at `rewindEnd`.
4. A reverse whoosh: a narrowing band rising from 260 Hz to 5.2 kHz, the image collapsing from wide to centre, clean stop.
5. The sprinkler valve and its room reversed, its impact placed where the picture passes the story time of "offline"; reversed paper as the evidence clears; five reversed pencil strokes as the sprinkler heads re-ink.

After the landing: near silence (room tone at about -58 LUFS) until the first notes of Act II on the bar after the landing.

### The mix

- **Carve** (music, ambience beds and the camera-move air, never the voice and never the sync one-shots): voice activity from the voice's own 150 Hz to 5 kHz level in 10 ms frames, 60 ms look-ahead, 25 ms attack, 420 ms release. One smooth time-varying spectral gain (STFT 2048, 75 percent overlap) combines a broadband duck, a dip centred at 2.2 kHz spanning about 1 to 4.5 kHz and a small dip at 450 Hz. Measured on pink noise at full activity, music: -4.5 dB at 100 Hz, -7.1 at 450 Hz, -7.6 at 1 kHz, -10.5 at 2.2 kHz, -8.1 at 4 kHz, -5.1 at 8 kHz; beds: -2.5, -4.1, -4.5, -6.5, -4.9, -2.9 dB. The duck starts 35 ms before the first word.
- **Loudness**: one gain for the whole mix to -16.0 LUFS integrated (EBU R128, web). The voice is DC-blocked (the guide voice carries a -65 dBFS DC offset) and only where that gain pushes it over -1.4 dBTP is it held by a look-ahead true-peak limiter (1.5 ms look-ahead, 60 ms release).
- **Ceiling**: a look-ahead limiter on music and SFX only, computed from the 4x oversampled sum with the voice, holds the master at or under -1 dBTP; the same gain curve on both stems keeps the sum exact.
- **Holds**: the score's sustained layers and the beds are drawn down under each `hold` (above), on raised-cosine ramps; the voice is never touched.
- **Hygiene**: SFX bus high-passed at 30 Hz (24 dB per octave), one-shots at 28 Hz, 4 ms fade-in at the head, the last 0.2 s faded so the final sample is exactly zero, every placed sound and every automation edge on raised-cosine ramps.

## Measured QA (cut 2 engine, build of 2026-09-29 against the guide voice)

Inputs: `cues/resolved.json` compiled from the current cue sheet and `narration/timing.json` (126.53 s, 92 BPM grid), with the scenes' events as they stood (mostly cut 1) plus a test set of 34 cut 2 events placed the way the plan places them (cuts on the shared-cut rule, moves in whole or half beats, seven holds: after "mind", after "offline", S14, the crossing, after two choices, the full-chain hold). The engine was also run on the untouched cut 1 events. These numbers are the engine's, not the final film's: re-run once the scenes land and when the ElevenLabs voice replaces the guide.

| Measure | Value |
| --- | --- |
| Master integrated loudness | -16.01 LUFS |
| Master true peak | -1.05 dBTP (4x oversampled) |
| Master loudness range | 4.85 LU; short-term maximum -14.7 LUFS; crest factor 18.9 dB |
| Stems sum to master | maximum difference 2.4e-7 (-132.5 dBFS, 24-bit rounding) |
| Voice gain and limiting | +0.59 dB; limiter at most 0.99 dB, over 0.5 dB for 139 ms in total |
| Bed ceiling | at most 4.6 dB of reduction, 0.49 s in total, all under voice peaks |
| Music stem / SFX stem | -27.4 LUFS, -6.7 dBTP / -40.7 LUFS, -13.8 dBTP |
| Bed under speech / in pauses / voice | -30.7 / -36.2 / -15.7 LUFS momentary medians |
| Grid, as written | 492 onsets (200 on a bar, 132 on a beat, 112 on a half beat, 48 on a sixteenth); largest offset from the grid 0.0 ms |
| Grid, as heard | attacks detected in the rendered score (a 6 dB rise within 24 ms, detector offset measured on sharp clicks): the pulse, 187 attacks, median 0.3 ms from the grid; pulse and piano together, median 1.2 ms, 77 percent within 5 ms, 87 percent within 20 ms (random onsets would read about 41 ms); piano note-ons meet their attack a median 5.0 ms later (the soft hammer); the delivered music stem (carved, with the sustained layers) median 7.7 ms |
| Sections on the story | every section starts on a bar line; distance from its cue between -1.1 and +2.0 beats (`score.sections`) |
| Protected quiet (music plus SFX, momentary) | the unnoticed change -40.2 LUFS median; after L08 -43.2; the landing -55.4; the crossing -43.0; the final 2 s -53.0; for reference, the Act II ostinato -27.5 |
| Holds | music plus SFX inside each hold against the 2 s before (momentary medians): after "offline" (-10 dB) -32.2 to -36.7; the S14 hold -27.1 to -33.5; after the two choices -29.4 to -35.5 and -26.3 to -33.2; the crossing (-14 dB, already near silence) -39.8 to -43.1; the one-beat hold after "mind" reads no change at the 400 ms meter's scale (the scenes' drawing continues through it); the full-chain hold is exempt and carries the resolution at -26.6. 28 pulse events and 14 piano notes removed |
| Editorial accents | 30 test accents, all within 4.3 ms of a half beat (`editorial_grid`) |
| Sync onsets | 31 sharp sync sounds read in the SFX stem; the 19 clear of other sounds are within 2.5 ms of their cue except one record-append (+53 ms, the same reading as before cut 2: it is quiet and the meter reads its neighbour); the gauge's tick at `dur` reads -2.5 ms. The `cut` is soft by design and is verified dry: first sample within 6 dB of its peak at +1 to +2 ms |
| DC offset | 2e-7 or less on every stem |
| Energy below 30 Hz | -44.6 dB (master), -48.0 dB (music), -41.4 dB (SFX), relative to the full band |
| 2 to 5 kHz against 200 Hz to 2 kHz (music plus SFX) | Act I -17.6 dB, rewind -14.4, Act II -20.3, Act III -21.5, close -15.3 |
| Stereo | master L/R correlation 0.96, no mono fold-down loss; music plus SFX correlation 0.45 to 0.63 per section, fold-down loss at most 1.5 dB (rewind) |
| Discontinuities | no step at any edit point in music, SFX or master; no sound starts abruptly out of silence; no high-frequency clicks in the pitched music layers |
| Head and tail | first and last samples exactly 0; last 50 ms peak -113.4 dBFS |
| Determinism | two builds of the same inputs: identical PCM in all four files (SHA-256 of the samples) |
| Cut 1 events only | the same engine on the untouched cut 1 events: -16.01 LUFS, -1.05 dBTP, stem sum -132.5 dBFS, no warnings; pulse attacks a median 0.26 ms from the grid |

Per section (music plus SFX, integrated): Act I -27.8 LUFS, rewind -30.9, Act II -26.3, Act III -26.2, close -29.6.

The cut 2 kinds, measured dry at their designed level (one sound, short-term loudness; transient; where the energy sits): `cut` paper -47 LUFS, felt -45, graphite -46, wood -48, attack at +1 to +2 ms, 80 to 250 Hz (wood 250 Hz to 1 kHz); `push` (one beat) -44, bloom peak at `dur`, below 80 Hz with the air at 250 Hz to 4 kHz 9 to 10 dB under it; `pull` (1.3 s) -43, a two-bar pull -50; `whip` -47, 1 to 4 kHz; `sheet-lay` -37, settle at `dur`; `focus` -52; `arc` -58, above 1 kHz; `handwheel` -42, 80 Hz to 1 kHz; `gauge` -51, tick at `dur`.

Pictures (spectrograms of the whole film, of each section, long-term spectra) are written with `--pngs`; spectrogram sheets of every library sound with `--library DIR`.

## Open points

- Re-run after the scenes publish their cut 2 events and after the ElevenLabs voice is assembled; review `reports/report.json` each time: cue sources, warnings, `score.sections` (each section's bar and its distance from its cue), `score.holds` and `qa.silences.holds`, `editorial_grid` (accents off the half beat), onset timing, loudness.
- Holds are the scenes' decision. A hold after each of the three choices stops the momentum's pulse for its span (stop time); if that reads as too much, give those holds `gain_db` -3 to -5 (a light hold keeps the pulse, drawn down) or shorten them.
- The film's last 4 s (after the final word) decay from about -37 to below -50 LUFS momentary: the D add9 is left to ring out under the descriptor and qualifier. This is deliberate; if it reads as the sound dropping out, raise the `s4`, `d4` and `b4` expression points before `end` in `engine/score.py`.
- The score's low end is deliberately warm (a distant pump and a sine sub in Act I); if the film is judged on small speakers only, `TARGET_LUFS` in `engine/score.py` and the 110 Hz shelf in `engine/pipeline.py` are the two controls.
