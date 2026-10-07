# Priora motion explainer v1: voiceover script

Final script, 160 narrator words over 90.0 seconds, plus the worker's voice note. Times are where each line starts and ends in the finished film (seconds). The picture is synchronised to these word times, so a re-recorded voice should keep each line inside its window.

| Start | End | Voice | Line |
| --- | --- | --- | --- |
| 0.90 | 4.71 | Narrator | Real work in the middle: a worker, a site, a risk owner. |
| 5.45 | 7.59 | Narrator | Priora places agents around it. |
| 8.55 | 13.85 | Worker (voice note) | Hey, the bracket by the packing line has cracked again. We're going to weld it before the night shift. |
| 14.80 | 20.27 | Narrator | Priora hears a repair, hot work, a place and a deadline. Then it asks for a photo. |
| 23.40 | 26.82 | Narrator | Next, it summons only the specialists this site and job need. |
| 31.20 | 33.91 | Narrator | Each checks its own conditions and reports back. |
| 38.60 | 44.69 | Narrator | When everything holds, the route opens. Work goes on, the record is kept, no one is disturbed. |
| 47.30 | 51.89 | Narrator | Then one condition slips. The fire watch is half what the policy asks. |
| 52.40 | 56.92 | Narrator | Priora brings it to the risk owner. Agents prepare; the human decides. |
| 57.70 | 59.41 | Narrator | Three decision rooms open. |
| 60.25 | 61.94 | Narrator | Retain is never a default. |
| 62.60 | 65.68 | Narrator | Risk is kept on purpose, with its terms explicit. |
| 66.95 | 71.17 | Narrator | Mitigate compares safeguards, and checks whether the work is back inside. |
| 72.25 | 77.10 | Narrator | Transfer, simulated for now, asks outside capacity for terms and a price. |
| 78.60 | 83.32 | Narrator | Priora carries the case between rooms. The risk owner stays in control. |
| 83.75 | 88.43 | Narrator | Priora turns physical work into explicit risk decisions, while the work happens. |

## As one read

Real work in the middle: a worker, a site, a risk owner. Priora places agents around it.

*(Worker, voice note)* Hey, the bracket by the packing line has cracked again. We're going to weld it before the night shift.

Priora hears a repair, hot work, a place and a deadline. Then it asks for a photo.

Next, it summons only the specialists this site and job need. Each checks its own conditions and reports back.

When everything holds, the route opens. Work goes on, the record is kept, no one is disturbed.

Then one condition slips. The fire watch is half what the policy asks. Priora brings it to the risk owner. Agents prepare; the human decides.

Three decision rooms open. Retain is never a default. Risk is kept on purpose, with its terms explicit. Mitigate compares safeguards, and checks whether the work is back inside. Transfer, simulated for now, asks outside capacity for terms and a price.

Priora carries the case between rooms. The risk owner stays in control.

Priora turns physical work into explicit risk decisions, while the work happens.

## Direction

- **Narrator**: calm, clear, unhurried British English; composed and credible, never a presenter or a trailer voice. Leave the pauses in: the picture explains in them.
- **Worker**: an ordinary man at work recording a quick voice message on his phone; natural, slightly quick, not performed. It is heard as a phone voice note (band-limited, a little room around it).
- **Priora** is said *pree-OH-ruh*, stress on the middle syllable.
- Public words only: the three spaces are the decision rooms. The internal name for the whole system is not used.

## The voice in v1

The ElevenLabs service could not be reached from the build environment, so v1 uses local neural voices (Kokoro: `bf_isabella` for the narrator at 0.92 to 0.96 speed, `bm_daniel` for the worker). Each line was synthesised, word-aligned and placed at its start time; the source of truth is `source/narration/lines.json` and `source/narration/timing.json`. To replace the voice, record each line inside its window and rerun the alignment, or regenerate with `python3 source/scripts/voice.py` after editing `lines.json`.
