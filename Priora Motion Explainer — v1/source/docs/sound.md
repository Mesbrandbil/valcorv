# Sound: design, music, mix and master (v1, cut 3)

Everything you hear apart from the voice is synthesised by one deterministic, offline script, `audio/build.py` (python3 with numpy, scipy, soundfile and pyloudnorm). There are no samples, no network calls and no hand edits. Every random choice is seeded, so two runs write bit-identical files.

```bash
python3 audio/build.py                  # extract the picture's events with headless Chrome, build everything
python3 audio/build.py --cached-events  # rebuild from audio/events.json without Chrome
```

`scripts/render-film.sh` runs the first form before it renders the picture. A build takes about 85 s. It exits non-zero if any QA check fails, and `audio/report.json` lists each check.

## 1. Inputs and outputs

| In | What it gives |
| --- | --- |
| `index.html` via `scripts/chrome/chrome-headless-shell --dump-dom` | the picture's sound events, JSON in `<script id="pk-events">` (declared in sections with `PK.sfx(kind, t, opts)`) |
| `narration/timing.json` | line and word times: ducking, and the music's turns, which sit on words rather than fixed seconds |
| `assets/audio/voice.wav` | narrator + worker (scripts/voice.py), mono, about -19 LUFS |
| `assets/audio/voice-worker.wav` | the worker's voice note alone (line W01) |

| Out (48 kHz, 24-bit PCM, stereo, exactly 4,320,000 samples = 90.000 s) | What it is |
| --- | --- |
| `assets/audio/master.wav` | voice + music + sfx, -16 LUFS integrated, true peak <= -1.0 dBTP |
| `assets/audio/master-no-narration.wav` | worker voice note + music + sfx, no narrator, -17 LUFS, <= -1.0 dBTP |
| `assets/audio/music.wav` | music stem, ducked as in the master, at its level inside the master |
| `assets/audio/sfx.wav` | sound-design stem, at its level inside the master |
| `audio/events.json` | the event list exactly as extracted from the page |
| `audio/report.json` | measurements, the music plan, every placed event and the pass/fail checks |

`master.wav = true-peak limiter(G * levelled voice + music.wav + sfx.wav)`, where G is the single master gain (about +0.2 dB). The voice is placed dual mono with a zero-phase 20 Hz DC block (`voice.wav` carries a DC offset of about -4e-4) and is levelled sentence by sentence in the mix (section 5). `voice.wav` itself stays the raw stem.

## 2. From an event to a sound

1. **Extract.** The DOM is dumped and the `pk-events` JSON is read with a regex, `html.unescape` and `json.loads`, then saved to `audio/events.json`. If Chrome fails, the build falls back to the cached file and warns.
2. **Clean.** Events without a kind or a finite `t` are dropped with a warning. Two events of the same kind within 12 ms are merged, keeping the louder; stacking them would only add level and phase. Events are sorted.
3. **Synthesise.** Each kind has its own synth (section 3). The seed comes from (kind, t, n), so adding events elsewhere never changes an existing sound. Optional fields shape it:
   - `dur`, clamped to 0.08 to 4 s
   - `pan`, -1 to 1, constant power
   - `size`, `material`, `part`, `agent`, `room` and `variant` are read as hints, e.g. `size: "case"`, `material: "pencil"`, `agent: "fire"`, `part: "reach"`, `room: "transfer"`, `variant: "timer"`
   - unknown hints are ignored; an unknown kind plays a soft facet tok and is reported
4. **Space.** Every event gets its own short warm room reverb (RT60 0.7 / 0.55 / 0.35 s low / mid / high, early reflections, send per kind). Anything simulated is low-passed at 1.5 kHz, its dry sound drops by 3 dB and it goes into a larger, darker space (RT60 2.2 s, 30 ms pre-delay). This applies to the kind `simulated` and to any event whose hints contain `sim` or `transfer`.
5. **Level.** Dry and reverb together are calibrated to a target loudness: the loudest 100 ms K-weighted window equals `-21 LUFS + trim(kind) + gain_db + jitter`. The jitter is a seeded +-0.6 dB. Simulated events sit another 3 dB down. So `gain_db` means relative loudness on one scale for every kind; it is not a raw multiplier. Then the hierarchy (cut 3):
   - every event is capped at -28 LUFS (100 ms), so the opening print thuds sit at about -28
   - the two key moments, the deviation and the human's decision (the first full `decision`, not a `reach`), sit at least 2.5 dB above the cap (about -25.5), so they are the loudest sounds of the film
   - in s7 (78 to 84 s, the densest passage, under "The risk owner stays in control") lock, decision and resolve are a further 3 dB softer
6. **Place.** The main transient sits on `t`. Sounds with a small pre-roll (the lock's latch) start just before it. Nothing starts before 0: such events move to 0 and are reported. Nothing runs past 89.95 s. A tail that would is cleaned up with a 20 ms fade if it is already 50 dB down (the wordmark's), otherwise faded over up to 0.5 s.
7. **Bus.** A 30 Hz high-pass, then a slow leveller that holds momentary loudness under -25 LUFS. It is a safety net for future pile-ups and is inactive today (0.0 dB). Speech fragments and packets go to a separate "small" sub-bus, which is not lifted with the background in the no-narration master.

Every pitched sound is in the music's key, D major at A = 440. Tines, mallets and bars use exact pitches; wooden toks, felt thuds and hollow toks are snapped to the nearest D major pitch, with a few cents of seeded variation.

## 3. What each kind sounds like

Materials: paper, felt, wood, soft graphite, a fine thread, glass or metal tines struck very softly. Nothing cartoonish, nothing sci-fi: no whooshes, risers, impacts or glitches. Noise layers never sweep in pitch, which is what makes a whoosh.

| Kind | Sounds like | How it is made | Trim dB |
| --- | --- | --- | --- |
| `print` | a real-world form pressed onto paper | felt thud (F#2 to A2, pitch settling from above) + paper contact noise + a faint peel. `size: small`: smaller and higher. `material: ghost`: paper only, muted | 0 |
| `speech-fragment` | a tiny soft paper flick, well under the worker's voice | paper noise with a 3.5 ms attack and about 15 ms of decay (gone by 18.5 ms), one or two micro-crackles, low-passed at 4.5 kHz (4th order). Cut 3: 8 dB lower than before | -10 |
| `summon` | Priora calls a specialist: one soft glass tine | cantilever tine (partials 1 : 2.76 : 6.27, soft 3 to 6 ms strike). Each agent has its own note of the D major pentatonic: Site rules D5, Insurer conditions E5, Fire F#5, Risk engineering A5, Evidence B5 (from `agent`/`part`, else in turn). `material: ghost`: muted, short | -6 |
| `arrive` | a soft felt or wooden "tok" | modal wood (1 : 2.57 : 4.21 : 6.3) + contact noise, felt adds a low thud. Size sets pitch, decay and felt: `small` F#6, `facet` B5, `agent`/`token` G5, `case` C#5 with felt body. With an `agent`, each specialist has its own token voice: Site rules F#5 (firmer), Insurer E5, Fire B5, Risk engineering A5, Evidence G5 (softer) | -2 |
| `move` | a very soft paper slide or air, low | `material: paper`: static 0.5 to 4 kHz band with slow grain. `case`/`packet`: lower, weighted slide. `step`: one 0.11 s slide and a tiny tick. `wood`: a wooden piece sliding (stick-slip friction). Default: a breath of 120 Hz to 1.1 kHz air. Envelope follows `dur` | -6 |
| `thread` | a fine thread pulled tight | narrow-band noise at about 2 kHz and its octave, rising 5 % in tension, with fine friction and a tiny pluck at the end. `material: pencil/graphite/line`: a soft graphite line (stick-slip scratch) for the length of `dur` | -6 |
| `packet` | a small bundle folded and set down | two paper flicks + a soft felt-wood tok (`size: small`: one flick, a lighter tok) | -4 |
| `inspect` | the agent's own way of checking | Site rules: a straight ruled graphite line with end ticks. Insurer: two soft wooden bracket clicks. Fire: three tiny dot ticks and a soft A5 ping. Risk engineering: a dry quarter-turn tick pair and a dashed radius of graphite dabs. Evidence: a soft latch and a tiny D6 tick. Default: two graphite dabs | -6 |
| `evidence` | a soft mechanical double click (no shutter) | two felt-damped latch clicks 78 ms apart (high modes at about 2.1 / 3.4 / 5.7 kHz + a 640 Hz body); `part: send` adds a paper whisper, `part: accept` a felt settle | -2 |
| `request` | a dashed question | four graphite dabs (the dashed thread), then a hollow wooden tok bending up 7 % into C#5, and a faint E5 tine. `variant: timer`: soft wooden ticks fading over `dur`, with nothing answering | -4 |
| `return` | a finding lands back | a small high wooden tik (A6) + a faint D6 tine | -6 |
| `align` | tines settling into consonance | D5, A5, F#5 struck 90 ms apart, each starting 14 to 22 cents off and gliding into tune (time constant 0.22 s). `size: small`: two tines, shorter | -3 |
| `lock` | a small, satisfying wooden click | a tiny latch 22 ms before + a firm small wooden click + a low felt body. `material: tick` / `size: small`: lighter and higher | -2 |
| `deviate` | serious, not alarming | a low soft felt thud on D2, D5 and A5 tines in tune, and an F#5 tine that starts 12 cents flat and drifts to 32 cents flat against them | -3 |
| `assemble` | findings drawn into one packet | a soft paper slide gathering inward (envelope weighted to the end) closing on a felt-wood tok | -4 |
| `escalate` | a slow, soft, low glide | a sine/triangle tone gliding D3 down to A2 over `dur`, low-passed at 650 Hz, arched envelope (never a riser), with a trace of paper carry | -4 |
| `door-open` | a soft wooden slide | stick-slip wood friction (250 Hz to 1.5 kHz) ending in a light F#4 tok | -4 |
| `door-close` | a soft wooden slide and thunk | shorter friction, then a low E3 wooden thunk with a felt body | -4 |
| `reject` | the door shudders and stays shut | three soft low wooden knocks, 48 ms apart, decaying | -4 |
| `route` | a gentle airy line | breathy narrow-band noise on A5 and its octave with a faint pure core, settling up into tune, over `dur` | -4 |
| `record` | a tick on the record | a pencil touch and two graphite strokes (a check mark) | -6 |
| `compare` | a small wooden token set down on paper | paper contact + a wooden tok stepping through G5, A5, B5 + a felt body | -4 |
| `resolve` | a warm consonant tone | soft felt mallets on D4, F#4, A4, 35 ms apart, warm partials, 1.5 s decay | -4 |
| `decision` | the human's black line: firm, low, wooden, distinct from every agent | a low wooden bar on D3 (marimba-like 1 : 4 : 10 modes), firm mallet, with a D2 body. `part: reach` (the line reaching to open a door): the same bar struck lighter and shorter | -4 |
| `simulated` | muted, hollow, a little distant | a hollow tube tok on E4 + a muted B4 tine, low-passed and placed in the far space | -5 |
| `title` | a statement laid on the page | a soft sheet of paper settling (150 Hz to 2.2 kHz) and a faint felt touch | -6 |
| `wordmark` | one soft low note, the last thing heard | a felt mallet on D3 over a D2 body, little reverb. Its decay is natural (exponential, never faded) and timed from its own level and start time, so it is under -60 dBFS by 89.9 s wherever the picture puts it | -2 |

The ringing kinds (align, deviate, resolve, decision) have lower trims because, at the same 100 ms peak, a ringing sound reads louder than a click.

## 4. Music

A calm, intelligent bed in D major at A = 440: no pulse, no drums, no trailer gestures. It has two voices.

- **Pad.** Every chord tone is three soft oscillators (sine blended with a band-limited triangle): a centre and two quieter side oscillators. Voices from 200 Hz up have sides at 0.6, detuned +-3.5 to 7 cents (a gentle chorus). Below 200 Hz the sides are at 0.15 and beat against the centre slower than 0.1 Hz (periods of 10 to 16 s). That way the chorus never cancels a note, and the bass never seems to breathe or pulse. Each oscillator has its own very slow amplitude motion (0.035 to 0.11 Hz, +-8 %) and its own place in the stereo field (bass near the centre, upper voices wider). Phase follows absolute time, so a note held across a chord change simply continues. Chords change by crossfades of 1 to 3.2 s: shared notes hold, entering and leaving notes use equal-power curves, so there is never a dip or a hole. Filtering is gentle: a zero-phase crossfade between a 600 Hz and a 2.4 kHz first-order low-pass, driven by a brightness curve.
- **Felt piano.** Sparse notes at section turns, additive synthesis:
  - up to 24 slightly stretched partials (inharmonicity B rising with pitch), each with its own two-stage decay
  - two strings 0.9 cents apart, so the note gently beats
  - a soft felt hammer: fast high roll-off, a 3.5 to 7.5 ms attack and a small low thump
  - a velocity-dependent felt low-pass
- **Space.** A synthetic hall (RT60 3.0 / 2.4 / 1.4 s, 22 ms pre-delay), with the send per section. The Transfer section and its piano notes are sent further away.
- **Level.** After rendering, each chord section is measured and trimmed (at most +-6 dB, crossfaded at its turn) so its loudness follows the plan's level column, read as LUFS offsets. Low voicings carry more energy than their level suggests. Without this trim a chord turn could add 2 to 3 dB to a duck, and the bed seemed to pump. The bed is then normalised to -28.5 LUFS integrated before ducking. Under the narration it sits 15.3 to 21.6 LU below the voice.

Times below are for the cut 3 narration; every turn sits on a word, so a re-timed voice moves the music with it.

| Turn (s) | Anchor | Chord (voicing) | Colour |
| --- | --- | --- | --- |
| 0 to 3.2 | fade in | D2 D3 A3 E4 | quiet open start: D, A, E, no third |
| 6.32 | L02 "agents" | + A4 E5 | a high open colour as the agents appear |
| 7.95 | before W01 | D2 A2 D3 A3 E4 | low and open under the voice note |
| 14.5 | L03 "Priora" (case forms) | D2 A2 F#3 A3 C#4 E4 (Dmaj9) | warmer: the third arrives |
| 18.67 | L03 "Then" | D2 A2 F#3 B3 E4 A4 (D6/9) | |
| 23.15 | L04 "Next" (the panel) | G2 D3 F#3 A3 B3 F#4 (Gmaj9) | steady, pulse-free calm, 22 to 38 |
| 27.33 | | E2 B2 F#3 G3 D4 (Em9) | |
| 31.0 | L05 "Each" | B1 B2 F#3 A3 D4 E4 (Bm11) | |
| 36.4 | L06 "When" - 2.2 | A1 A2 E3 B3 D4 (Asus) | waiting (after the L05 duck release, so the two never add) |
| 39.34 | L06 "holds" | D2 A2 F#3 A3 D4 F#4 (D) | the consonant lift |
| 40.41 | L06 "opens" | + A4 E5, brighter | the route opens: the harmony opens upward |
| 44.2 | L06 "disturbed" | D2 D3 G3 B3 F#4 A4 (G/D) | settled |
| 48.44 | L07 "slips" | B1 F#2 D3 A3 C#4 (Bm9), darker filter | darkens a little |
| 52.5 | L08 "Priora" | G1 G2 D3 F#3 C#4 (Gmaj7#11) | tension held through the escalation |
| 54.98 | L08 "Agents" | A1 A2 E3 G3 D4 (A7sus4) | unresolved |
| 57.7 | L09 "Three" | A1 A2 E3 B3 E4 (Asus2) | the rooms open |
| 60.1 | L10 "Retain" | G1 G2 D3 A3 B3 F#4 (Gmaj9, low) | Retain: grounded, warm, deliberate |
| 66.55 / 69.09 | L11 "Mitigate" / "checks" | E2 B2 F#3 G3 D4 B4 (Em9) then A3 replaces G3 | Mitigate: brighter, an inner voice moves |
| 71.95 | L12 "Transfer" | B2 E3 A3 D4 G4 (stacked fourths) | Transfer: hollow, darker, further away |
| 78.3 | L13 "Priora" | A1 A2 E3 G3 B3 D4 (A11) | between the rooms, wanting to resolve |
| 81.34 | L13 "The (risk owner)" | D2 A2 F#3 A3 D4 F#4 A4 (D) | resolution on the decision |
| 83.55 | L14 "Priora" | D2 A2 E3 A3 F#4 E5 (Dadd9) | the final open chord under the tagline |
| 86.4 to 89.4 | the end | D2 A2, 7 dB lower | the bed recedes under the wordmark |
| 88.7 to 89.9 | bed fade | | one 1.2 s raised-cosine fade of the whole bed: silent from 89.9 s |

The three rooms are related colours on the same scale: IV (G, low and warm), ii (Em, brighter and moving) and a quartal stack on B (hollow and distant).

Felt piano notes:

| Time (s) | Notes |
| --- | --- |
| 0.55 | D4 (the opening) |
| 14.55 | D4, F#4 (the case forms) |
| 23.15 | G3 + D4 (the panel) |
| 31.05 | F#4 (inspect) |
| 39.29 | D4 F#4 A4, rolled ("holds") |
| 40.26 | A4, D5 ("route opens") |
| 48.46 | low B2 ("slips") |
| 57.75, 58.1, 58.45 | E4, A4, B4, one per room as the chambers draw |
| 60.15 | G3 B3 (Retain) |
| 66.6 | E4, B4 (Mitigate) |
| 72.0 | muted, distant D4 G4 (Transfer) |
| 78.35 | A3 |
| 81.24 | D3 A3 F#4 (the decision) |
| 83.6 | D3, A4, E5 (the tagline) |

The sfx `wordmark` note is the film's single last low note. The piano adds a soft low D2 at 88.4 only if the picture declares no `wordmark` event.

**The end (cut 3).** The duck is never released after the last line, so nothing swells after the voice. The bed recedes to D2 + A2 from 86.4 and fades from 88.7 to silence at 89.9. The wordmark note (88.5 today) sits 3 to 7 dB above the fading bed, decays naturally (never faded) and is under -60 dBFS by 89.9: it is the last thing heard.

## 5. Mix and master

| Target | Value |
| --- | --- |
| Format | 48 kHz, 24-bit, stereo, 4,320,000 samples each |
| Narrator levelling (cut 3) | Each narrator sentence (`sentences` in narration/timing.json) gets the constant gain that puts it at -16 LUFS in the mix. The master gain then moves everything by G (+0.2 dB), so every sentence measures -15.6 to -16.0 LUFS in master.wav (it was -18.6 to -13.0 before). Gains change only inside the pauses between sentences (raised cosine, at most 0.25 s, centred in the pause). Gains today run from -2.5 dB (L02) to +3.1 dB (L03). The word "kept" (L06, 42.85 s) gets a +4 dB ride with 40 ms ramps |
| Worker (W01) | levelled to -16.5 LUFS in the mix (-3.2 dB), just under the narrator; the same gain in the no-narration master |
| Narrator duck (L01 to L14) | music -5 dB. Cosine ramps in dB: the 0.5 s attack ends at the line's first sound; the 1.5 s release starts 0.1 s after its last. Gaps under 2.0 s stay ducked, whoever speaks, so L01 to L03 and L07 to L14 are single spans. After the last line the duck is held to the end |
| Worker duck (W01) | music -5 dB in the master; -7 dB in the no-narration master, where the bed is raised |
| Music in pauses | capped at -26 LUFS momentary (master frame; a slow leveller, 0.5 s look-ahead and hold, 1.5 s recovery). The bed never moves more than 6 dB within 1 s (5.4 dB today) |
| `master.wav` | -16 LUFS +- 0.5 integrated (BS.1770-4, pyloudnorm), true peak <= -1.0 dBTP (4x oversampled), voice clearly on top |
| `master-no-narration.wav` | -17 LUFS +- 0.5, <= -1.0 dBTP. Kept at their master level: the worker's voice note, the speech fragments and the packets. Raised together to reach -17 (about +10.7 dB over the master): the music (ducked only under W01) and the other sounds. Under W01 the sfx bus also has a -20 dBFS peak ceiling |
| Limiter | look-ahead true-peak limiter: 4x oversampled detection, 2 ms look-ahead, 120 ms release, aiming at -1.3 dBTP. It is proven to keep every sample at or below its required gain. With the quiet sentences lifted it now catches a few voice peaks: at most 1.5 dB, more than 1 dB for 0.15 s in total |

Measured at the last build, on 124 events while the sections are being thinned (`audio/report.json` is the source of truth and is rewritten each run):

| File | Integrated | True peak | Loudest 400 ms momentary |
| --- | --- | --- | --- |
| master.wav | -16.00 LUFS | -1.30 dBTP | -10.9 LUFS |
| master-no-narration.wav | -17.00 LUFS | -2.61 dBTP | -12.4 LUFS |
| music.wav | -32.34 LUFS | -18.6 dBTP | -27.1 LUFS (46.8 s, the gap after L06) |
| sfx.wav | -35.82 LUFS | -15.5 dBTP | -26.8 LUFS (48.6 s, the deviation) |

ffmpeg's ebur128 agrees to within 0.1 dB.

**Voice versus background**, as integrated LU over each line: narrator over music is 15.3 to 21.6 LU; narrator over music + sfx is 14.1 to 20.1 LU (tightest is L06). In the no-narration version the worker is 10.7 LU over its background.

**Cut 2 to cut 3, measured on the same 187 events** (cut 2's engine run on today's events, then this one):

| | cut 2 | cut 3 |
| --- | --- | --- |
| narrator sentences in the master | -18.6 to -13.0 LUFS (5.6 LU spread) | -15.9 to -15.5 (0.4 LU) |
| worker note W01 | -12.8 LUFS (3 LU over the narrator) | -16.2 (0.5 under) |
| speech-fragment flicks (100 ms) | about -30 LUFS, energy above 4.5 kHz -3 dB | about -38.5, -12 dB |
| music, loudest momentary | -22.1 LUFS | -27.0 |
| music, largest move within 1 s | 11.6 dB | 5.4 |
| loudest sounds (100 ms) | the "holds" lock -24.6, then the deviation -25.0 | the deviation and the decision -25.2, then the lock -26.5 |
| opening prints | -27.5 to -27.9 | -27.7 to -28.2 |
| s7 passage (78 to 84 s), sfx | -32.2 LUFS, peak momentary -28.1 | -34.0, -30.6 |
| bed after the last line | swells 4.7 dB under the wordmark | holds, then fades 88.7 to 89.9 |
| wordmark tail | faded at 89.95 while still -49 dB | natural decay, under -60 dBFS by 89.9 |
| no-narration sfx peak under W01 | -4.7 dBFS | -20.3 dBFS |
| narrator over music / background, worst line | 14.4 / 12.1 LU | 15.3 / 14.0 LU |
| worker over background, no-narration master | 12.5 LU | 11.0 LU (the worker is 3.4 dB lower; the W01 duck there is now 7 dB) |
| master limiter, most gain reduction | 0.02 dB | 1.7 dB (lifted sentence peaks, over 1 dB for about 0.15 s in total) |

## 6. QA without listening (`audio/report.json`)

For every output, the report holds:
- length, rate, channels and format
- integrated loudness and true peak, cross-checked with ffmpeg ebur128
- sample peak and the loudest 400 ms momentary loudness, with its time
- clipped samples and DC offset per channel
- the first sample and the last 10 ms (both must be silent)
- a SHA-256 hash

It also records, per line:
- the voice, music, sfx and background loudness, and their margins
- the music duck actually achieved

Voice levelling (cut 3): every narrator sentence and the worker line, with their raw level, the gain applied and the level measured in master.wav; the word rides.

Mix behaviour (cut 3):
- the music's pause cap and its largest move within 1 s
- the loudness hierarchy: the key moments, the loudest other sounds, the opening prints and the flicks, all measured in the sfx stem
- the no-narration sfx peak under W01
- the ending: the duck after the last line, the bed fade, and the wordmark against the bed every 0.15 s

Music analysis, before ducking:
- loudness per section (the arc)
- the strongest notes per section, with their centre in cents against 12-TET at A = 440 (worst is 2.8 cents today)
- that every strong note is in D major
- the quietest momentary point between 3 and 88.8 s (-34 LUFS: never a hole)
- the largest fall within 100 ms (1.5 dB: no hard cuts)

Events:
- counts per kind and unknown kinds
- every placed event with its start, end and target level
- the earliest start and latest end (0.3 s and 89.95 s)
- events moved, faded or skipped, and all warnings

The `checks` list holds 42 pass/fail checks, and the build fails if any of them fails. Cut 3 added these:
- every narrator sentence -16 +- 1 LUFS
- the worker 0.2 to 1.5 LU under the narrator
- music pause cap
- music never moves more than 6 dB within 1 s
- the deviation and the human's decision are the loudest sounds
- opening prints about -28
- no-narration sfx under W01 <= -20 dBFS
- no duck release after the last line
- the bed fades out cleanly
- the wordmark under -60 dBFS by 89.9 s, without a fade
- the wordmark is the last thing heard: no event after it, and louder than the bed over the final 0.4 s

The narrator duck check is now -5 dB.

## 7. Notes for the picture

- Declare sounds with `PK.sfx(kind, t, { gain_db, pan, dur, size, material, part, agent, room, variant })`. `gain_db` is relative loudness on one scale for all kinds: -2 is a key moment, -10 is quiet, -16 is barely there.
- Put `t` on the moment of contact (a landing, a click, the start of a movement); the engine aligns the transient to it. For anything that travels and lands, `t` is the end of the travel.
- Keep passages calm: about one sound per beat, never more than about 3 events per second. The engine caps every sound but the deviation and the human's decision at -28 LUFS, so piling events up only adds density, not emphasis.
- Simulated things are heard as simulated automatically when a hint contains `sim` or `transfer`.
- Re-run `python3 audio/build.py` after any change to the events or the narration; the music's turns follow the words in `narration/timing.json`.

## 8. Known limits

- Nobody has listened. The checks prove level, timing, key, tuning, continuity and cleanliness, not taste. A human pass on good headphones and on a laptop speaker is still worth doing. Watch especially:
  - the thread pull
  - the escalate glide
  - the "kept" ride
  - the last two seconds
- Sentence levelling is by integrated loudness per sentence. Within a sentence the voice keeps its own dynamics. The limiter now trims up to 1.5 dB from a few lifted peaks (L03 at 19.0 s, L10b at 62.7 s, L12 at 74.7 s).
- "-60 dB by 89.9" is read as -60 dBFS. A note that must also be 60 dB below its own peak by then, starting at 88.5 to 88.75, would last about 0.7 s and drown under the fading bed; it could not be the last thing heard.
- The ringing kinds are tamed by trims and the hierarchy cap, not by a perceptual loudness model.
- Margins are integrated over each line. A single sfx transient can briefly sit closer to a word than the line figure suggests.
- The s7 softening is tied to the section's times (78 to 84 s). If s7 moves, update `S7_SOFTER` in build.py.
- `index.html` still plays `assets/audio/voice.wav` in preview. The delivered MP4s get `master.wav` and `master-no-narration.wav` through `scripts/render-film.sh`.
