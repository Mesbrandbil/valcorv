# Assumptions note: Priora motion explainer v1

What I decided on my own while making v1, and what you may want to change.

## Sources

- **Operating model:** *Priora playground definition.pdf* (7 October 2026), read in full. Cross-checked against VISION, STATUS and Brand direction in the Valcorv Drive, all updated 7 October 2026.
- **Visual language:** the folder "Priora Brand System — Working Direction — 2026-10-07" is on your Mac's Desktop. The cloud session that made v1 could not reach it. The look is built instead from:
  - the Brand direction doc: black and white, the agents carry the colour, simple line characters, living lines with trails;
  - the playground definition PDF: warm paper, black for the real world, one rust working colour (#C4441C) for Priora's agents, IBM Plex Sans and Mono;
  - the earlier vision film: paper grain and the Plex font files.

  I read "B+C" as tactile die-cut agent tokens (B) moving inside clear hairline decision chambers (C). If the brand system names a different working colour (for example one deep green, or one colour per agent), it is a single token: `--rust` in `source/assets/css/film.css` and `PK.C.rust` in `source/assets/js/pk-kit.js`.
- **Brand mark:** the only mark is the type-led Priora wordmark from the Logo Pack in your Drive (`Logo Pack/Priora/Priora wordmark.svg`). The copy in `source/assets/brand/` is byte-identical to it. It is ink on paper and still, at the very end. No emblem is used anywhere. The Priora agent's glyph is a character in the film, not a logo. If the Desktop brand folder holds a newer canonical wordmark, replace that SVG and the inline copy in `source/sections/s8-system.js`.

## Delivery

- **Location:** the brief asked for a Desktop folder. A cloud session cannot write to your Mac, so the folder "Priora Motion Explainer — v1" is in the `valcorv` repository on branch `claude/elegant-johnson-k6cn23` (draft PR Mesbrandbil/valcorv#4). Pull it and move the folder to your Desktop.
- **Format:** 1920 x 1080, 30 fps, exactly 90.000 s (2700 frames), H.264 with AAC 48 kHz.
- **The version without narration:** keeps the worker's voice message, the music and the sound design, and removes only the narrator. The worker's message is part of the story itself (its words are on screen), not narration.

## Voice

- **Voices:** ElevenLabs could not be reached from the build environment (network policy), so v1 uses local neural voices (Kokoro): `bf_isabella`, a British female narrator, and `bm_daniel` for the worker, treated as a phone voice message. Priora is said *pree-OH-ruh*, as agreed for the vision film.
- **Re-recording:** the script is final and every line has a time window, so a professional or ElevenLabs recording can replace it without re-cutting the picture (see `Voiceover script.md`).
- **Length:** 160 narrator words, within the 150 to 165 asked for.

## Content decisions

- **Deviation example:** the fire watch is planned for 30 minutes and the policy asks for 60. This is the playground definition's own hot-work example, which it marks as illustrative. On screen it reads 30 MIN / 60 MIN; the voice says "half what the policy asks".
- **Safeguards in Mitigate:** extend the watch to 60 minutes, a thermal check, and move the weld to the workshop, from the playground definition's Mitigate example. They are labelled suggestions from a reviewed library, and the comparison is marked as a preview. Cost and time are shown only as relative marks (small discs and a clock arc), never as prices.
- **Transfer:**
  - The room is dashed and always marked SIMULATED, with "No insurer on Priora yet".
  - Its agents are unnamed dashed "CARRIER · SIM" and "CAPACITY · SIM" hexagons.
  - Its answers are eligibility, terms, safeguards and a price shown only as "?". No insurer is named and no number appears.
- **How the rooms work together:** the risk owner mitigates part of the deviation with the thermal check, asks what transfer would cost for the rest, keeps the rest on purpose in Retain, then decides. The brief's "may" allows other combinations; this is one illustration.
- **Who decides:**
  - Only the risk owner's black line opens a decision room; agents check, ask, prepare and carry.
  - Retain is shown as never chosen by an agent (Priora is refused at the door) and never applied by silence (a timer runs out and the door stays shut).
  - No hard stop is shown; an unengaged outline reads "No hard stop configured".
- **Maturity:** "Design proposal" appears the first time the three rooms appear and again in the final frame. Nothing is marked as live or available today.
- **Other insured activities:** shown as "LATER" examples: lifting, confined space, work at height. They are illustrations of what the mechanism could be configured for, not decisions. Hot work is marked FIRST.
- **Ghost specialists:** in the site panel they appear briefly and are not chosen (Electrical, Structural, Security). They only show that the panel is configured per site and job.
- **Language:** "playground" is never used on screen or in the voice. The three spaces are the decision rooms. No revenue model, prices, internal names, responsibilities or open questions appear.
- **Final line:** the tagline is set in two lines without a dash ("Priora turns physical work into explicit risk decisions / while the work happens."), following your no-em-dash preference. The voice reads it with a comma.

## Sound

Everything except the voices is synthesised offline, with no samples. It is quiet physical sound design (paper, felt, wood, fine threads, soft tines) over a calm harmonic bed in D, with no trailer music. The masters are -16 LUFS (with narration) and -17 LUFS (without), true peak at most -1 dBTP. Nobody has listened to the mix in a studio; it was checked by measurement. Give it one headphone and one laptop-speaker pass.

## Rebuilding

See `source/README.md`. In short:
- `python3 scripts/voice.py` rebuilds the voice;
- `python3 audio/build.py` rebuilds the sound;
- `scripts/render-film.sh` renders and muxes both MP4s.
