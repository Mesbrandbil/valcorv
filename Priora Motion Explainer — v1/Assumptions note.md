# Assumptions note: Priora motion explainer v1

What I decided on my own while making v1, and what you may want to change.

## Sources and brand

- **Operating model:** *Priora playground definition.pdf* (7 October 2026), read in full and treated as the source of truth.
- **Visual language:** the Desktop folder "Priora Brand System — Working Direction — 2026-10-07" could not be reached from the cloud session. The look is built from the Brand direction doc in the Valcorv Drive (black and white, agents carry the colour, simple line characters with trails) and the playground PDF (warm paper, black ink, one rust working colour #C4441C, IBM Plex Sans and Mono). I read "B+C" as tactile die-cut agent glyphs (B) moving in clear hairline decision chambers (C). If the brand system names a different working colour, it is one token: `--rust` in `source/assets/css/film.css` and `PK.C.rust` in `source/assets/js/pk-kit.js`.
- **Brand mark:** only the Priora wordmark from the Drive Logo Pack (`Logo Pack/Priora/Priora wordmark.svg`, copied byte for byte), still and in ink, at the very end. No emblem anywhere. If the Desktop folder holds a newer wordmark, replace `source/assets/brand/` and the inline copy in `source/sections/s8-system.js`.

## Delivery

- The folder lives in the `valcorv` repository (branch `claude/elegant-johnson-k6cn23`, draft PR Mesbrandbil/valcorv#4) because a cloud session cannot write to your Desktop. Pull it and move it there.
- 1920 x 1080, 30 fps, exactly 90.000 s (2700 frames), H.264 and AAC.
- The version without narration keeps the worker's voice note (its words are on screen and it is part of the story), the music and the sound design.

## Voice

- ElevenLabs was blocked by the build environment's network policy, so v1 uses local neural voices (Kokoro): a calm British narrator and a male worker heard as a phone voice note. Priora is said *pree-OH-ruh*.
- 160 narrator words. The script is final and every line has a time window, so a studio or ElevenLabs recording can replace it without re-cutting the picture.

## Content choices

- **The deviation:** the fire watch is planned for 30 minutes and the policy asks for 60, the playground definition's own illustrative hot-work example.
- **Mitigate:** the safeguards (extend the watch, a thermal check, move the weld to the workshop) come from the definition's example and are labelled as suggestions from a reviewed library. Cost and time are relative marks, never prices.
- **Transfer:** dashed, always marked SIMULATED, with unnamed simulated capacity. Its answers are eligibility, terms, required safeguards and a price shown only as "?". No insurer is named or implied.
- **The specialists:** the panel shows five (Site rules, Insurer conditions, Fire, Risk engineering, Evidence check) and three it did not need (Electrical, Structural, Security), to show that the panel is configured per site and job. "Evidence check" is the brief's Evidence Checking, named so it reads as an agent that checks the photo.
- **Rooms together:** Priora carries the same case to each door in turn: mitigate part with the thermal check, ask what transfer would cost, keep the rest on purpose. One illustration of the combinations the brief allows.
- **Who decides:** black is the human, rust is the agents. Only the risk owner's black line opens a room, and what the rooms send back stays dashed (a proposal) until the owner's line closes round the case; only then does it turn solid. Retain is shown as never picked by an agent (Priora is refused at the door) and never applied when nobody answers (a timer runs out, the door stays shut). No hard stop is used: a dashed, unengaged outline on the route reads "No hard stop configured".
- **Maturity:** Retain and Mitigate carry a "Design proposal" tag in every shot they appear in, Transfer carries SIMULATED, and the closing view says "The complete system is a design proposal". Hot work is marked first; the only other mention is "Possibly later: other insured activities", with no specific activities named, because the definition leaves them to be chosen.
- **Language:** the word "playground" is never used; the three spaces are decision rooms. No revenue model, prices, internal names, responsibilities or open questions.
- **Last line:** set on two lines with a comma, no dash, following your no-em-dash preference.

## Sound

The narrator is levelled line by line in the mix and the worker's voice note sits just under it. Everything except the voices is synthesised offline: quiet physical sounds (paper, felt, wood, fine threads) over a calm bed, no trailer music. Masters are -16 LUFS (with narration) and -17 LUFS (without), true peak at most -1 dBTP. It was checked by measurement only; give it one headphone and one laptop-speaker listen.

## Rebuilding

See `source/README.md`.
