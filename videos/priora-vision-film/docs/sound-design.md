# Sound design and the audio engine

The film's score, sound design and mix are generated offline, deterministically, by the Python engine in `audio-engine/`. Nothing is sampled or downloaded: the score is generated MIDI rendered through fluidsynth with the MuseScore General soundfont plus a synthesised harmonic bed (the thread), and every sound effect is synthesised from the physics of its material. Nobody on the project can listen, so every decision is checked by measurement (loudness, true peak, spectra, tuning, section transitions, onset timing, phase, discontinuities, the grid heard back); the numbers are at the end of this page.

Cut 3: the score is one continuous piece in D at 92 BPM. A sustained harmonic bed, the thread, runs from the first frame to END and carries one chord timeline through the whole film; every other layer enters and leaves on level curves of one to two bars, so a section change is a crossfade and a quiet moment is a dip inside the same sound, never a cut to silence. Every pitched source is tuned to A = 440 Hz equal temperament, the soundfont note by note. The score runs on the edit's grid from film time 0 (beat 0.652 s, bar 2.609 s; `narration/timing.json` "grid"): every note and every pulse event starts on a bar, beat, half beat or sixteenth, chords change on the bar line nearest the story turn, and the film's length is whatever `END` is.

## What cut 2 got wrong, and what cut 3 changes

The user's note on cut 2: "The music is a bit off. Don't make the cuts between them so choppy." Measured on the delivered cut 2 stems:

| Cause | Measured in cut 2 | Cut 3 |
| --- | --- | --- |
| Hard stops and hard entries | in the music stem, 400 ms loudness changes over half a second of +41 LU (the entry after the landing), +38 LU (the aftermath after digital silence), -32 LU (into the landing), -19 LU (the subtraction on "offline"), +27 LU (the momentum out of the crossing); 12 s of the film under -50 LUFS-M, three stretches of digital silence | largest change anywhere in the music stem +8.8 / -7.5 LU (the rewind's designed inhale); every section boundary within 5 LU median to median; nothing under -50 LUFS-M after the first 1.3 s |
| A bed tuned against the score | the machinery bed under all of Act I stood 17 to 30 dB out of its noise on real 50 Hz mains harmonics: G2 +35 cents, G3 +35, D4 +37 and a whine at D#5 -29, under a D major score whose D drone was in tune; the ventilation's fan tone sat on a B flat (118 Hz) | the machinery is tuned to D2, A2, D3, A3 and a D5 whine (all within 0.5 cent); the fan to A2 (110 Hz) |
| Pitched pulses on the wrong notes | the Act II and III soft pulse settled on B1 -9 cents on every beat, under A and G chords; the pump on G1 -12 cents with glide energy on G#1 and A#1 | both thumps now settle on the chord's own bass (D, A, G, B, E, F#, C#) with a shallower pitch fall |
| Soundfont intonation | measured on the notes cut 2 used: piano G2 -12.1 cents, cello F#2 +10.5 against its G2 -6.8 (17 cents between two cello notes), cello D2 -6.1 against the exact sine sub; the slow strings' low zone wobbles by 20 cents with 20 dB of beating between its layers | every soundfont note is measured and bent to A = 440 (residual at most 1.1 cents over 68 pitches); the strings stay at G3 and above; the warm pad (its layers about 10 cents either side of the note) is replaced by the thread, in exact tuning |
| Too many layers entering and leaving | each section had its own parts that faded out in 0.25 to 0.6 s at the next section (23 fluidsynth parts), and each started from nothing | one chord timeline, voice-led: tones common to two chords are held, the rest move by the smallest step; one part per instrument per side of the rewind; entries and exits are level ramps of one to three bars |
| The removal at "offline" | everything but one high B removed in 0.12 to 0.35 s on the word, then silence to "afterwards" | on the word the pump (the sprinkler's own pulse) winds down over a bar; strings, cello, sub and the piano's figure thin over a bar and a half; the relays thin over three bars ("work continues"); the thread dips 7 dB and holds, the high B stays, the harmony darkens to Em9 |
| Holds that stop time | a hold at -6 dB or deeper removed every pulse event and piano note in its span | a hold is a dip (default -5 dB, at most -12), nothing is removed |
| Grid against voice phrasing | sections started on a bar line up to four beats after the story turn (the momentum began a bar after "The risk owner") | changes are crossfades that straddle the turn; the crossfade begins before the bar line and completes after it |
| Accents that punctuate | editorial accents at -26 to -35 dBFS designed peaks, bodies on random pitches (the paper cut settled on a G sharp or B flat) | 3 to 4 dB quieter (focus 2 dB), longer contacts, bodies tuned to the key |

## One command

```bash
python3 audio-engine/build.py            # from the project root
```

Reads `cues/resolved.json`, `narration/timing.json` and `assets/audio/voice.wav`; writes `assets/audio/master-voice.wav`, `music.wav`, `sfx.wav` and `master.wav` (48 kHz, 24-bit, stereo) and a JSON report in `audio-engine/reports/`. A full build of the 136.97 s film takes about 3 minutes on the shared 4-CPU machine (fluidsynth renders and the tuning measurements are cached by content hash in the system temp folder, or in `$PRIORA_AUDIO_CACHE`; a cold cache adds about a minute).

Re-run it whenever `cues/resolved.json`, the scene events, the narration timing or `voice.wav` change. Re-runs are bit-identical: two independent builds produce the same samples in all four files (checked by SHA-256 of the PCM data).

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
| `audio-engine/reports/report.json` | every measurement, every cue with its source, the chord timeline and voicings, the tuning table, section transitions, event counts, warnings |
| `audio-engine/reports/events-used.json` | every sound placed: time, kind, seed, gain, origin (designed, scene or auto) |

`master.wav` equals `master-voice.wav + music.wav + sfx.wav` sample for sample (verified on every build; the only difference is 24-bit rounding, measured at -132.5 dBFS).

In HyperFrames, either place `master.wav` as the only audio track, or place the three stems `master-voice.wav`, `music.wav`, `sfx.wav` at `data-volume` 1 (the pipeline's render sums stems linearly and sample-aligned, docs/pipeline.md section 10). Do not combine `voice.wav` with `music.wav` and `sfx.wav`: in the default mode the master's voice is `voice.wav` with about +0.9 dB of gain, DC removed and at most 1.3 dB of peak limiting on a few syllables, so that sum would be about 0.9 dB off in balance and would not be guaranteed under -1 dBTP. With `--voice-passthrough` the voice is untouched and `voice.wav + music.wav + sfx.wav` is exact, at the cost of loudness. Do not add `data-fx-carve` to `music.wav`: the carve is already in the file, a runtime carve would take it twice.

## Input contract

### Cues

`cues/resolved.json` in the shape written by `scripts/build-cues.mjs`:

```json
{ "cues": { "offline": 30.53, "...": 0 },
  "scenes": { "a1-world": { "start": 0, "end": 59.13 } },
  "lines": { "L07": { "start": 29.02, "end": 31.06, "words": [ { "w": "offline", "start": 30.53, "end": 31.0 } ] } },
  "events": [ { "t": 12.88, "kind": "stamp", "scene": "a1-paper", "gain_db": 0 } ],
  "film": { "duration": 136.97 } }
```

Duration comes from `duration` or `film.duration`. When `lines` carry no `words`, whole lines are taken from `narration/timing.json`. The grid comes from `narration/timing.json` "grid" (`bpm`, `offset`), else from a "grid" in `resolved.json`, else 92 BPM from 0.

The engine needs the cues below. It uses the cue sheet's own name when present (first name listed); otherwise it derives the time from the narration words with ordered fallbacks, and records the source of every cue in the report (`cue:<name>`, `derived:word`, `derived:... (fallback n)`). An unresolvable cue stops the build with a list. "Bar near" means the bar line nearest the cue; "bar after" the nearest bar line not earlier than the cue.

| Cue (names accepted) | Used for | Fallback |
| --- | --- | --- |
| `l01` | Dsus2 strings from the bar near it | first word "Every" |
| `hour`, `contractors`, `equipment`, `isolated`, `workMoves` | piano motif (one note per shot, on the nearest beat), the pulse fades in from the bar near `contractors`, radio, footsteps, lockout, machinery entrance | words in L01, L02 |
| `insurance`, `accepted`, `paperIn`, `translate`, `permits`, `checklists` | Act I chord changes on the bars near them; the pulse dims under the paper from `paperIn` | words in L03, L04 |
| `noOne` (`movingSite`) | the build under S6 from the bar near it | word "But" |
| `moving`, `head` | complexity waves | words, line end |
| `roof03`, `hotWork`, `safeguards`, `inPlace` | Roof 03, five ticks | words, fallbacks |
| `landing`, `then` | the story time the rewind lands on; the high B enters on the bar near `then` | line after `inPlace` minus 0.25 s; `landing` + 0.25 |
| `offline` | the unnoticed change (on the word) and the valve clunk | word "offline" |
| `nothingLooks`, `changed`, `nobody`, `nobodyEnd` | Em9 on the bar near `changed`; the held B thins; the deepest point of the dip at `nobodyEnd` | words in L08; end of L08 |
| `afterwards`, `q1`, `q3`, `gap`, `tooLate` | B minor from the bar after `afterwards`, its strings and low piano, Gmaj7 near `gap` | words in L09 to L11 |
| `rewindStart`, `rewindEnd` | the rewind window (landing at `rewindEnd`); the thread moves to Dsus2 on the bar nearest its middle | L11 end + 0.35; next line start - 0.3 |
| `l12`, `decisionWord`, `riskChanged` | clarity on the bar after the landing near `l12`; the wood tick fades in from the bar after `riskChanged` | line after the rewind; end of L12 |
| `worker`, `six` | the roof air under the worker line | line after L12 |
| `connects`, `keepsRecord` | the ostinato from the bar near `connects`, record appends | words |
| `prevention`, `proof` | low accents on the nearest half beat | words |
| `l16`, `offline2`, `sees`, `cross` | the ostinato thins from the beat near `offline2`, falls away from `sees`, the crossing's dip from the bar near `cross` | words; `cross` = end of the line with "sees" + 0.1 |
| `riskOwner`, `change`, `retain`, `carriers` | momentum from the bar near `riskOwner`, grown over two bars; three choice accents | words |
| `scenariosIn`, `everyKind` | the scenario run from the bar near `everyKind`: a light, forward pulse | L18a start - 0.33; L18a start |
| `crane`, `wind`, `gasDetector`, `bypassed`, `confined`, `ventilation` | the vignettes (default card, condition and outcome sounds for a scene that has published none) | words in L18b to L18d |
| `ordinary`, `few`, `decisionsL18`, `madeInTime` | the pulse thins over the bar before the bar near `ordinary`; the harmony opens there; Em9 near `decisionsL18`; two decision accents (on `few`, softer on `decisionsL18`) | words in L18e |
| `l19`, `closeIn`, `gapCloses` | Asus4 on the bar near `closeIn`; the resolution to D add9 on the bar near `gapCloses` | L19 start; L19 start - 0.65; word "closes" |
| `priora`, `tagline` | the latch on `priora` (nothing new in the music); G/D on the bar near `tagline`, D again on the bar after the line ends; a natural decay to END | words in L20 |

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
| `name` | a series suffix `-01` to `-05` selects the variant (verify ticks, choice accents) |
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
| `subtract-bed` | control: fades the machinery bed out and thins the ventilation from `t` (`dur` = fade, at least one beat) |
| `fray` | near-silent parting of fibres |
| `incident` | far, muffled low thud (settling on B1) and a short low swell |
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
| `latch` | the Priora latch: bolt slide, catch (its body on F#3 and A4), a low D resonance |
| `cut` | a picture cut: under a quarter of a second, energy at 90 to 250 Hz, rounded attack, its body falling from D3 to A2; paper (a card edge through a cushion of air), felt (a felt mallet on a padded surface, darkest), graphite (a pencil point set down, a faint dry tick), wood (a soft knock on a small block tuned to A4) |
| `push` | a push-in (`dur` = the move): a low, narrow air rising from about 230 Hz to 1.25 kHz, the image closing to centre, landing in a soft low bloom (G2 falling to D2) at `dur` |
| `pull` | a pull-back (`dur` = the move): an air descending from about 1.45 kHz to 290 Hz, the image opening from centre to wide, over a gentle low swell; longer pulls are spread thinner (peak lowered by 10 log10(dur / 1.3) dB) |
| `whip` | a snappy lateral move (`dur` 0.12 to 0.6 s): a brief band of air (620, 1650, 900 Hz) crossing the image, low-passed at 3.6 kHz, the quietest accent |
| `sheet-lay` | a sheet laid flat: a paper slide (from the right by default, `pan0` 0.5 to `pan1` 0.05) and, at `dur`, the settle as its air cushion lets go |
| `focus` | an element isolated to a hero shot: a detent seating (a tiny click, a smaller one 6 ms later, a faint A5 body), softened by a half-millisecond contact |
| `hold` | control, no sound: a dip in the score and the beds over `dur` (see below) |
| `arc` | the welding arc (`dur`): sparse dry cracks in flickering bursts over a faint sizzle, 1.8 to 8.5 kHz, very quiet; no hum, no roar |
| `handwheel` | a valve handwheel turning (`dur`): low metal friction of the stem in its packing (90 Hz to 2.2 kHz), one effort swell per hand push (one per 0.6 s), the pipe body answering at about 240 and 620 Hz; no ratchet |
| `gauge` | a pressure-gauge needle (`dur` = its travel, default 0): a faint gear-train whirr, then at `dur` a small sprung-metal tick; falling it meets the stop pin and bounces once, rising it settles lighter |

`hold` (a held major moment, `dur` default one bar) is a dip, never a stop: over its span every music family is drawn down by a share of the hold's `gain_db` (default -5 dB; anything deeper than -12 dB is drawn to -12 and listed in the warnings): the pulse and the piano by the full depth, strings, cello, contrabass and sub by 0.7 of it, the thread by 0.45, every bed by 0.5. Nothing is removed: the pulse keeps its pattern and every note sounds. The dip comes in over one beat (a third of a shorter hold) and goes back over a beat and a half, on raised-cosine curves. The voice is never touched. A hold inside the rewind is ignored (listed in warnings). The report lists every hold (`score.holds`, with its bar and beat and the dip of each family) and the loudness before and inside it (`qa.silences.holds`). Because the carve lets the music up when a line ends, a hold placed at the end of a line reads as a level plateau rather than a drop: it supports the moment rather than punctuating it.

Engine kinds can also be used directly: `pencil-stroke`, `pencil-tick`, `pencil-hatch`, `technical-pen`, `ruler-contact`, `set-square-tap`, `page-turn`, `paper-stack`, `radio-squelch`, `footstep`, `relay-click`, `solenoid-click`, `confirm`, `system-tick`, `response-tick`, `packet`, `align-snap`, `stretch`, `cross-snap`, `distant-clank`, `pump-thud`, and the rewind kit `rewind-paper`, `rewind-pencil`, `rewind-mechanism`, `rewind-whoosh`, `rewind-suction` (placed inside the rewind window they play backward with it). The cut 2 chain kinds (`chain-confirm-1` to `-5`, `chain-record` to `chain-capacity`) are gone with the chain. Unknown kinds are skipped and listed in the report's warnings.

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
| `cut`, `focus` | at +0.001 to +0.004 s |
| `push` | the bloom at `dur` (the end of the move) |
| `sheet-lay` | the settle at `dur` |
| `gauge` | the tick at `dur` (at +0 when `dur` is 0); the bounce 30 to 40 ms later when falling |

Editorial accents are not moved by the engine: they sound where the scene puts them, so picture and sound share one time. The report's `editorial_grid` lists each `cut`, `push`, `pull`, `whip`, `sheet-lay`, `focus` and `hold` with its offset from the nearest half beat, so an accent that missed the grid shows up there.

### Who owns a sound

Three sources are merged:

1. **Scene events** always play.
2. **Designed events** are story sounds the engine places from cues: radio squelch nudged into a pause after "Contractors arrive", six footsteps on gravel, the lockout solenoid on "isolated", two distant clanks and a radio click in pauses, the valve clunk with its impact on "offline" (all `a1-world`); the quieter valve on the second "offline", the system tick on "sees", the stretch and crossing snap after L16, the three choice accents on "change", "retain", "carriers" (all `a3-change`); two decision accents, on "few" and, softer, on "decisions" (`a3-scenarios`); the latch on "Priora" (`a3-close`). A designed sound is dropped when its scene publishes the same kind, or when any scene event of that kind lands within 0.3 s; the lockout is also dropped when a scene turns a `handwheel` within 1.5 s of it.
3. **Auto events** are a full default set of drawing and interface sounds for every scene (strokes, rules, envelope passes, stamps, fragments, snaps, verify ticks, packets, node passes; for `a3-scenarios` markers appearing on "Every kind", a card, a condition turning and an outcome settling for each vignette, ordinary node passes and one connection pulse on "made in time"; for `a3-close` the gap rule and the two marks becoming one). A scene's auto events switch off as soon as that scene publishes any event, so each scene should then declare all of its sounds. `--no-auto` disables them everywhere.

## The sound plan

One key family (D major and its relative B minor), one chord a bar or two, on the edit's 92 BPM grid. Nothing is time-stretched and nothing is humanised in time: every note and every pulse event starts on a bar, beat, half beat or sixteenth, and the report proves it (`score.grid_check`: the coarsest grid unit of every onset, and the largest offset from a sixteenth, 0.0 ms). Each change sits on the bar line nearest the cue that turns the story (`score.sections` lists each with its cue and the distance in beats); the thread's chord changes are crossfades that begin a quarter beat before the bar line.

With the guide narration (136.97 s), bars 0 to 52:

| Section (bar) | Music | Sound design |
| --- | --- | --- |
| A, 0 to 8: the site wakes | the thread's D pedal rises from the first frame; Dsus2 strings from bar 1 (near "Every"); the felt piano motif, one note per shot on the beat nearest its word; Bm7, Gmaj7, Asus4 on the bars near "insurance", "accepted", "checklists"; from bar 2 (near "Contractors") the pulse fades in over three bars: a distant pump on each bar and a relay on beat 3, tuned to the chord's bass; from "Work moves" a late relay on 4-and; 4 dB quieter under the paper sheet | ventilation fades in; the first edge with a set-square; the site draws itself; van, footsteps, radio; machinery enters on "isolated"; paper, pen, stamp and ticks |
| B, 8 to "offline": the S6 build, then Roof 03 | from the bar near "But": D, D, Gmaj7, Gmaj7; pump strokes on 1 and 3 growing over two bars, relays on the off-beats, the piano's two-note figure, cello and sub on the roots; on bar 11 (near "Then") one high B enters inside the texture | waves of ticks and strokes, containment lines, the push to Roof 03, the arc, five safeguard ticks |
| C, "offline" to bar 16: the unnoticed change | on the word the pump winds down over a bar (two strokes, -4 and -16 dB, then none); strings, cello, sub and the figure thin over a bar and a half; the relays thin over three bars; the thread dips 7 dB and holds Gmaj7, then Em9 on bar 14 (near "changed"); the high B rises a little, then thins; the lowest point is at the end of L08, about 11 dB under the build | the handwheel, the gauge, the valve behind a wall (no alarm); the machinery bed fades out over the scene's three seconds, the ventilation down 3 dB; the fray |
| D, bar 16 to the rewind: afterwards | B minor from the bar after "afterwards", grown over a bar and a half: contrabass B1, cello F#2, the thread; strings B3 D4 F#4 from the bar near the first question; Gmaj7 near "gap"; single low piano notes near "afterwards", the first and third questions and "gap"; a faint heartbeat on each bar tuned to the bass | the incident annotation, evidence fragments slide and pin, the gap rule |
| the rewind | the Act I music and ambience run backward with the picture (below); underneath, the thread continues and moves from Gmaj7 to Dsus2 over a bar, dipping to its low point at the landing | reversed paper, pencil and the sprinkler valve; the inhale into the landing; the landing latch |
| E, bar 23: clarity | out of the thread's low point: a clean A3 E4 fifth in the strings and one soft D5 piano note on the bar after the landing; from bar 24 (after "changed") the wood tick fades in over two bars, a soft pulse from its second bar | alignment snaps as the graphite resolves, roof air under the worker line, the push to the worker |
| F, bar 26 to "offline" again: Priora today | from the bar near "connects": an 8th-note felt ostinato over Dadd9, A/C#, Bm7, Gmaj7 (a chord a bar); a soft pulse on 1 and 3, relays on 2 and 4 (both grown over a bar); low piano accents on the half beats nearest "Prevention" and "Proof" | connection lines, the pull back of S14 and its hold, five verify ticks rising, record appends |
| G, bars 31 to 34: the change seen live | from the beat near the second "offline" the ostinato thins to quarters over a bar and falls away by "sees"; the pulse falls away to the crossing; the crossing is the thread's dip on a bare D-A fifth with the cello's low D, about 8 LU under the ostinato | the quieter valve, the system tick, the row turning UNAVAILABLE, the stretch and the crossing snap |
| H, bars 34 to 39: three choices | from the bar near "The risk owner", grown over two bars out of the crossing's dip (the piano in half notes, then quarters, then eighths): Bm, G, D, A, then Gadd9 into the scenarios | three choice accents on their words, the packet, the carrier responses |
| S, bars 39 to 44: the scenarios | a light, forward pulse over a rising bass, one chord a bar: D add9 (Every kind), Em7 (the crane lift), F#m7 (the wind, the gas detector), G (bypassed), A (the confined space, the ventilation down); the felt ostinato and the wood tick accent 3 + 3 + 2 (eighths 1, 4 and 7), soft tuned thumps on the same three, ghost sixteenths leaning into the second and third; the relays of H are gone | the scenes' vignettes: cards, the conditions turning, the outcomes |
| O, bars 44 to 47: the pull back | the bar before the bar near "ordinary" the pulse thins to quarters and falls away over a bar and a half; Bm7, then Gmaj9 wide on the bar near "ordinary" with the contrabass entering underneath (faded in from the bar before), Em9 near "decisions"; the upper strings open | ordinary node passes, two decision accents, the pulse along the envelope |
| K, bar 47 to the end: the close | Asus4 on the bar near closeIn; the resolution to D add9 (a low piano D chord, contrabass D2, the widest thread voicing) on the bar near "closes"; the music swells in the pause after L19, then sits lower under L20; nothing new on "Priora" (the latch stays clean); G/D on the bar near the line, D add9 again on the bar after it ends, then a natural decay to END (straight in dB, about 8 dB a second in the last three seconds) | the gap timeline returning, the two marks becoming one, one clean latch |

Levels, as mixed: music sits about 13 LU under the voice while it speaks (bed momentary median -28.9 LUFS against a voice median of -15.4) and is carved as below; in the pauses the bed median is -33.9 (the quiet moments are in the pauses). One-shots peak between -15 dBFS (the latch) and -40 dBFS (whip) before per-event gains, against voice peaks at -1.4 dBTP.

### Instruments and sounds

The thread (`engine/thread.py`): each chord tone a band-limited harmonic tone in exact equal temperament at A = 440 Hz, two single-cycle tables per channel (dark: harmonics falling at 2.2 per octave over a 2.6 kHz roll-off; bright: 1.4 per octave over 4.2 kHz), mixed by a brightness curve that follows the story (0.1 at the landing, 0.55 at the pull back); a pitch drift of about 1 cent (mean zero) and a slow amplitude drift of 0.5 dB for life, never a detune; its stereo image from static phase offsets of the upper harmonics between the channels, the fundamental identical in both. Voicing: a bass on the chord's bass note (D2 to C#3), its fifth or octave, and four upper voices from D3 to B4 (five up to E5 from the pull back on), chosen by voice leading: each voice moves at most a fifth, the chord's colour tones are covered, no unisons, no seconds below C4, the smallest total movement wins. A tone common to two chords is held; the others cross over one and a quarter beats (two beats at section changes, a bar inside the rewind) on equal-power curves. The report's `score.chords` lists every voicing.

Soundfont (MuseScore General): "Grand Piano" at velocities 19 to 45, low-passed at 2.9 kHz with a felt-hammer thock under each note (the felt piano); "Slow Strings", G3 and above only (the patch's low zone beats against itself); "Cello" and "Contrabass" on the roots. Every note is tuned: `midi.measure_tuning()` renders each pitch a part uses (cached), reads its sustained pitch (the median of a 0.25 s pitch track on the strongest of harmonics 1 to 4), and the MIDI writer spreads the part over channels, one per correction, each with a pitch bend that brings its notes to A = 440 (the report's `score.tuning` lists every measured offset, its spread and the bend). A sine sub on the bass note between 45 and 90 Hz, crossfaded over a beat at a change. Plate and hall reverbs synthesised as deterministic impulse responses; the thread has its own hall, which is not muted in the rewind. Each family is calibrated to a loudness target before mixing (thread -30.5, piano -28, strings -30, cello -34.5, contrabass -38.5, sub -46, pulse -31.5 LUFS), and the music bus gets a 32 Hz 24 dB per octave high-pass and a -4 dB shelf at 110 Hz.

The pulse: a distant pump stroke and a soft felt thump, each settling on the current chord's bass note (the pump from 18 percent above it, the thump from 25 percent above), a control-room relay (low-passed at 6.5 kHz), a precise wood tick on D6, A6 and E6. Every entrance and exit of a pulse pattern is a level ramp of one to three bars.

Material sounds (all in `engine/library.py`): graphite is dense heavy-tailed micro-fractures through a 1.4 to 7.6 kHz band over a quieter friction hiss, with slow paper-fibre pressure texture, hand speed wander, corner lifts, a faint desk body and a 3 dB dip at 3.3 kHz; the technical pen is denser, finer and smoother with faint nib resonances; paper is band-limited friction with moving pan, crackle made of sparse cracks through a bright resonant body, and air sweeps; impacts are a contact pulse exciting a few damped modes, with the mallet contact time scaled to the pitch; the valve is a heavy damped metal impact with pipe resonance and a settling flow, low-passed at 2.6 kHz; relays are an armature click with a contact bounce; confirmations are tuned bars (wood 1:4:10, felt vibraphone-like, free-free steel 1:2.76:5.40, tine, felt-hammer string with slight inharmonicity) under a small precision tick. Beds, tuned to the key: ventilation (coloured air, duct modes, a faint fan tone on A2 with its harmonics), distant plant machinery (a hum on D2, A2, D3 and A3 with a cyclic load and a faint D5 whine, heard mostly through a hall), roof air, a near-silent room tone for the product space, a quiet site air from the worker line to the close.

The editorial accents are built to be felt more than heard: short, low-mid, rounded attacks, no bright transients, no risers, no booms. Their designed levels (before the event's `gain_db`), with the short-term loudness of one sound at that level: `cut` -30 dBFS peak (about -50 to -52 LUFS), `push` and `pull` -34 (-44.5), `whip` -39 (-51), `sheet-lay` -28 (-38), `focus` -29 (-54), `arc` -32 (-59), `handwheel` -31 (-45), `gauge` -28 (-53). A camera move's air (`push`, `pull`, `whip`) is a texture, so it is carved under the voice like the beds; every other accent is a sync sound and is not.

### The rewind

The picture scrubs the story backward from `rewindStart` to `landing` over the rewind window with a slow start, a fast middle and a very hard deceleration: `FL.rewindEase()` in `assets/js/film-lib.js`, the CustomEase path `M0,0 C0.18,0 0.26,0.06 0.36,0.22 0.5,0.46 0.62,0.86 0.74,0.96 0.84,0.995 0.9,1 1,1`. The sound reads story time through the same path (`EASE_PATH` in `engine/rewind.py`), so if one changes, change both. The sound is built from the film's own Act I audio:

1. The forward sound falls away in 0.3 s, except the thread, which continues underneath through the whole rewind (Gmaj7 to Dsus2 over a bar) and dips to its low point at the landing.
2. Granular reverse: 75 ms Hann grains, each played backward, read from the story time the picture is showing (four-way overlap, small jitter against combing). Pitch is preserved, there is no varispeed and no tape-stop. The music stem reverses the music (without the thread), the SFX stem the ambience and effects. The texture follows a designed loudness arc relative to the Act I bed (peak in the fast middle, then -15 dB and -32 dB), and in the deceleration it is drawn thin from both ends (top closing from 14 kHz to 900 Hz, bottom rising from 40 to 300 Hz).
3. The inhale: the last 1.2 s of the Act I bed, convolved with a long synthetic space and reversed, swells into the landing 9 dB under the Act I bed's level and closes over 30 ms exactly at `rewindEnd`, onto the thread.
4. A reverse whoosh: a narrowing band rising from 260 Hz to 5.2 kHz, the image collapsing from wide to centre.
5. The sprinkler valve and its room reversed, its impact placed where the picture passes the story time of "offline"; reversed paper as the evidence clears; five reversed pencil strokes as the sprinkler heads re-ink.

After the landing: the thread alone at its low point (about -39 LUFS-M with the room tone) until clarity grows out of it on the bar after the landing.

### The mix

- **Carve** (music, ambience beds and the camera-move air, never the voice and never the sync one-shots): voice activity from the voice's own 150 Hz to 5 kHz level in 10 ms frames, 60 ms look-ahead, 30 ms attack, 650 ms release (slower than cut 2's 420 ms: the music is continuous now, so every release is heard). One smooth time-varying spectral gain (STFT 2048, 75 percent overlap) combines a broadband duck (music 3 dB, beds 2.5), a dip centred at 2.2 kHz spanning about 1 to 4.5 kHz (music 7 dB, beds 4) and a small dip at 450 Hz (music 3 dB, beds 1.5). Measured on pink noise at full activity, music: -3.0 dB at 100 Hz, -6.2 at 450 Hz, -6.7 at 1 kHz, -10.0 at 2.2 kHz, -7.2 at 4 kHz, -3.6 at 8 kHz (cut 2: -4.5, -7.1, -7.6, -10.5, -8.1, -5.1: less broadband pumping, the same clearance where the voice lives); beds unchanged: -2.5, -4.1, -4.5, -6.5, -4.9, -2.9 dB. The duck starts 30 ms before the first word.
- **Loudness**: one gain for the whole mix to -16.0 LUFS integrated (EBU R128, web). The voice is DC-blocked and only where that gain pushes it over -1.4 dBTP is it held by a look-ahead true-peak limiter (1.5 ms look-ahead, 60 ms release).
- **Ceiling**: a look-ahead limiter on music and SFX only, computed from the 4x oversampled sum with the voice, holds the master at or under -1 dBTP; the same gain curve on both stems keeps the sum exact.
- **Holds**: dips of the score's families and the beds (above), on raised-cosine ramps; the voice is never touched.
- **Hygiene**: SFX bus high-passed at 30 Hz (24 dB per octave), one-shots at 28 Hz, 4 ms fade-in at the head, the last 0.2 s faded so the final sample is exactly zero, every placed sound and every automation edge on raised-cosine ramps.

## Measured QA (cut 3 engine, build of 2026-09-30 against the guide voice)

Inputs: `cues/resolved.json` compiled from the cut 3 cue sheet and `narration/timing.json` (136.97 s, 92 BPM grid), with the scenes' events as they stood (cut 2's; `a3-scenarios` and `a3-close` had published none, so their auto defaults played). A second build added 13 test events near the new cues (cuts, a push, a whip, a focus, a two-bar pull, five holds including a -30 dB request). These numbers are the engine's, not the final film's: re-run once the scenes land and when the ElevenLabs voice replaces the guide.

| Measure | Value |
| --- | --- |
| Master integrated loudness | -16.02 LUFS |
| Master true peak | -1.05 dBTP (4x oversampled) |
| Master loudness range | 4.91 LU; short-term maximum -14.5 LUFS; crest factor 18.7 dB |
| Stems sum to master | maximum difference 2.4e-7 (-132.5 dBFS, 24-bit rounding) |
| Voice gain and limiting | +0.88 dB; limiter at most 1.27 dB, over 0.5 dB for 0.32 s in total |
| Bed ceiling | at most 3.4 dB of reduction, 2.6 s in total, all under voice peaks |
| Music stem / SFX stem | -27.6 LUFS, -7.0 dBTP / -43.2 LUFS, -15.2 dBTP |
| Bed under speech / in pauses / voice | -28.9 / -33.9 / -15.4 LUFS momentary medians |
| Transitions (music stem, 400 ms loudness) | largest change over half a second anywhere after the first second: +8.8 LU, -7.5 LU (both inside the rewind and its landing; cut 2: +40.9, -32.5); at every section's bar line, median over the bar before against the bar after within 5 LU except the film's opening bars (the site waking, -52.6 to -38.5 and -38.5 to -30.2), the rewind's landing (-6.9, onto the thread) and the step down after the second "offline" (-5.4, the ostinato thinning over a bar); longest stretch under -50 LUFS-M: 1.3 s, the film's first second (cut 2: digital silence at 38.5 to 41.7 s and at the landing). Per section in `qa.transitions` |
| Quiet moments (music plus SFX, momentary medians) | the unnoticed change -34.0 (cut 2 -40.6); after L08 -36.5 (cut 2 -48.0, with digital silence); the landing -39.0 (cut 2 -56.1); the crossing -35.4 (cut 2 -44.3); for reference the Act II ostinato -27.0, the scenarios -26.9, the pull back -27.9, the resolution -24.3; the final 2 s -41.0 |
| Holds | inside against the 2 s before (music plus SFX, momentary medians): after "offline" -26.0 to -30.9; after L08 -36.7 to -36.4 (already the dip); the gap -28.4 to -31.9; the connection hold at the end of L14a -29.1 to -27.2 (the carve lets the music up as the line ends, the hold keeps it level); the crossing -35.1 to -38.4; test holds at the ends of the scenario lines 0.7 to 1.5 LU down; a -30 dB request drawn to -12: -7.9 LU. Nothing removed |
| Tuning | 68 soundfont pitches measured, raw offsets up to 12.1 cents (piano G2); after the per-note bend, re-rendered and measured again: at most 1.1 cents; thread partials within 2 cents of equal temperament; beds on D2, D3, A3, D5 within 0.5 cent; no pitch class outside the current chord stands above the broadband floor except the piano motif's passing notes |
| Grid, as written | 543 onsets (194 on a bar, 181 on a beat, 158 on a half beat, 10 on a sixteenth); largest offset from the grid 0.0 ms |
| Grid, as heard | the pulse and the piano together: 155 attacks, median 1.2 ms from the grid, 84.5 percent within 5 ms, 95.5 percent within 20 ms; piano note-ons meet their attack a median 5.0 ms later (the soft hammer) |
| Sections on the story | every chord change on a bar line; distance from its cue between -1.9 and +2.6 beats, except the thinning (the bar before "ordinary" by design) and the return to D after the line |
| Sync onsets | 31 sharp sync sounds read in the SFX stem; the 19 clear of other sounds are within 10.5 ms of their cue (median 0.5 ms). The quietest accents (`focus` at the scenes' -16 dB) sit at the level of the air beds and read their neighbour |
| Accents, dry at their designed level | against cut 2: peaks 3 to 4 dB lower (focus 2), short-term loudness 3 to 4.7 LU lower; the paper cut's attack 1.4 to 4.0 ms, the graphite cut's 0.8 to 3.5 ms |
| DC offset | 2.6e-7 or less on every stem |
| Energy below 30 Hz | -44.8 dB (master), -49.7 dB (music), -43.0 dB (SFX), relative to the full band |
| 2 to 5 kHz against 200 Hz to 2 kHz (music plus SFX) | Act I -16.8 dB, rewind -16.0, Act II -18.7, Act III -21.1, scenarios -21.0, close -14.8 |
| Stereo | master L/R correlation 0.96, no mono fold-down loss; music plus SFX correlation 0.56 to 0.66 per section, fold-down loss at most 1.24 dB |
| Discontinuities | no step at any edit point in music, SFX or master; no sound starts abruptly out of silence; no high-frequency clicks in the pitched music layers |
| Head and tail | first and last samples exactly 0; last 50 ms peak -70.7 dBFS |
| Determinism | two builds of the same inputs: identical PCM in all four files (SHA-256 of the samples) |
| Test events near the new cues | -16.03 LUFS, -1.05 dBTP, stem sum -132.5 dBFS; one warning (the -30 dB hold drawn to -12) |

Per section (music plus SFX, integrated): Act I -28.4 LUFS, rewind -28.1, Act II -27.7, Act III -27.5, scenarios -26.7, close -26.7.

Pictures (spectrograms of the whole film, of each section, long-term spectra) are written with `--pngs`; spectrogram sheets of every library sound with `--library DIR`.

## Open points

- Re-run after `a3-scenarios` and `a3-close` publish their events and after the ElevenLabs voice is assembled; review `reports/report.json` each time: cue sources, warnings, `score.sections`, `score.chords`, `qa.transitions` (a section whose median changes by more than 5 LU, or a half-second change over 9 LU, has an abrupt entry or stop), `score.holds` and `qa.silences.holds`, `editorial_grid` (accents off the half beat), onset timing, loudness.
- The quiet moments are dips of 8 to 12 LU under their surroundings. If the unnoticed change or the crossing should read closer to silence, lower the thread's anchors at `off + BAR`, `tLow`, `bG` and `bH` in `engine/score.py`; keep them above -16 dB so the sound stays one sound.
- The close swells in the pause between L19 and L20 (music plus SFX -24.3 LUFS-M, the film's warmest point) and sits 2 to 3 dB lower under the line. If CL1's hold should thin it, a hold at `gapCloses` does that; if the resolution should be quieter overall, the anchors at `bRes + B` and `tPri` are the controls.
- The film's last 3.9 s (after the D add9 on the bar after the line) decay straight in dB from about -30 to below -48 LUFS-M: a natural release under the qualifier. If it reads as the sound dropping out, raise `db_end` in `release()` in `engine/score.py`.
- In the current scene events, `a1-paper`'s three whips and its pull sit 163 ms before the half beat (the scene's local times are counted from its own start, which is not on the grid); the report's `editorial_grid` shows them.
