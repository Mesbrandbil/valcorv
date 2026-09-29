# SCRIPT: priora-vision-film

Locked narration for the Priora vision film (Priora is the product, Valcorv the company). The argument and wording are the brief's locked script; the only changes are spoken forms for the engines (listed per line). `narration/lines.json` is the machine source of this script; `narration/timing.json` holds the authoritative word timings.

**Voice:** ElevenLabs, female, clear international British English (narrator); ElevenLabs British male for the worker line. Chosen and recorded by `scripts/elevenlabs-voice.py` in `narration/elevenlabs/voices.json`.
**Voice settings:** model eleven_multilingual_v2 · stability 0.5 · similarity 0.8 · style 0.1 · speaker boost on · speed tuned between 0.7 and 1.2 to land the total (never time-stretched)
**Voice direction:** Warm, intelligent, composed and credible. Calm authority without sounding aristocratic, theatrical, breathy, sentimental or like a commercial announcer. Natural conversational cadence with deliberate pauses around the condition failure, the rewind and the final chain. Underplay the vision: confidence comes from precision, not hype.
**Worker direction:** A real worker on site speaking into a phone. Natural, practical, close-mic. Not an actor performing a slogan. Treated in the mix with a subtle close-mic colour (high-pass, presence, faint small-room reflections, slightly under the narrator).
**Guide voice (build only, not final):** local Kokoro bf_isabella (narrator) and bm_daniel (worker), narrator speed 1.2325, chosen by objective measures in `narration/takes/guide/voice-selection.json`.
**Pronunciation:** Priora is pri-OR-a, IPA pɹiˈɔːɹə, stress on the middle syllable, never PRY-ora. ElevenLabs text uses the respelling `Pree-OR-uh` (alternates if needed: `Pree-ora`, `Pri-OR-ah`, `Pree-AW-ruh`); the guide uses a phoneme override. Roof 03 is said Roof oh-three.
**Pacing:** lead-in 1.2 s, designed silence after each line as listed, a 3.2 s rewind silence before L12, end hold 2.8 s. Total between 88 and 94 s, target 91 s. Guide total: 90.90 s, 210 words at 2.97 words per second of speech.

**Time** values below come from the guide performance and are a guide only; after the ElevenLabs take is assembled, `narration/timing.json` is the truth.

---

## Line 1 (L01): Site wakes up (Frame 1)

**Speaker:** Narrator
**Time:** 1.20 to 3.45 s (guide)
**Delivery:** Quiet, observational opening. Unhurried, no announcer lift.
**Silence after:** 0.35 s

    Every industrial site changes by the hour.

## Line 2 (L02): Site wakes up (Frame 1)

**Speaker:** Narrator
**Time:** 3.84 to 7.58 s (guide)
**Delivery:** Three plain observations, even weight, the site coming alive.
**Silence after:** 0.55 s

    Contractors arrive. Equipment is isolated. Work moves.

## Line 3 (L03): Insurance becomes workflow (Frame 2)

**Speaker:** Narrator
**Time:** 8.22 to 10.87 s (guide)
**Delivery:** Matter of fact. Slight weight on conditions and accepted.
**Silence after:** 0.25 s

    Insurance sets conditions under which risk is accepted.

## Line 4 (L04): Insurance becomes workflow (Frame 2)

**Speaker:** Narrator
**Time:** 11.13 to 13.98 s (guide)
**Delivery:** Respectful of the teams. The list is competent, not tired.
**Silence after:** 0.5 s

    Good teams translate them into permits, briefings and checklists.

## Line 5 (L05): Complexity outruns translation (Frame 3)

**Speaker:** Narrator
**Time:** 14.48 to 16.60 s (guide)
**Delivery:** The turn. Human and understanding, not critical.
**Silence after:** 0.6 s

    But no one can hold a moving site in their head.

## Line 6 (L06): Complexity outruns translation (Frame 3)

**Speaker:** Narrator
**Time:** 17.20 to 21.33 s (guide)
**Delivery:** Specific and calm. Everything is correct at this point.
**Silence after:** 0.45 s
**Spoken as:** ElevenLabs text: `On Roof oh-three, hot work begins. The certificate and safeguards are in place.`; guide text: `On Roof oh-three, hot work begins. The certificate and safeguards are in place.`

    On Roof 03, hot work begins. The certificate and safeguards are in place.

## Line 7 (L07): Invisible crossing (Frame 4)

**Speaker:** Narrator
**Time:** 21.78 to 23.48 s (guide)
**Delivery:** Understated. No drama in the voice; the silence after it does the work.
**Silence after:** 0.9 s

    Then a sprinkler zone goes offline.

## Line 8 (L08): Invisible crossing (Frame 4)

**Speaker:** Narrator
**Time:** 24.38 to 29.67 s (guide)
**Delivery:** Controlled tension. Short beats, then the quiet realisation on nobody sees it.
**Silence after:** 0.7 s

    Nothing looks different. Work continues. But the conditions have changed, and nobody sees it.

## Line 9 (L09): Afterwards (Frame 5)

**Speaker:** Narrator
**Time:** 30.37 to 32.72 s (guide)
**Delivery:** Restrained. Leads straight into the questions.
**Silence after:** 0.2 s

    If something goes wrong, questions begin afterwards:

## Line 10 (L10): Afterwards (Frame 5)

**Speaker:** Narrator
**Time:** 32.92 to 37.03 s (guide)
**Delivery:** Forensic. Each question stands alone, slightly more pointed each time.
**Silence after:** 0.6 s

    What was happening? Which condition applied? Can you prove what was true?

## Line 11 (L11): Afterwards (Frame 5)

**Speaker:** Narrator
**Time:** 37.67 to 39.75 s (guide)
**Delivery:** Land the idea. Plain, final, no sigh.
**Silence after:** 0.9 s

    Today, the gap is often discovered too late.

## Line 12 (L12): Rewind (Frame 6)

**Before:** 3.2 s rewind silence (picture and sound reverse to the instant before Sprinkler Zone 3 went offline).
**Speaker:** Narrator
**Time:** 43.85 to 46.11 s (guide)
**Delivery:** After the rewind silence. Open, curious, forward looking.
**Silence after:** 0.7 s

    What if the decision existed when the risk changed?

## Line 13 (L13): Speak the activity (Frame 7)

**Speaker:** Worker
**Time:** 46.81 to 49.20 s (guide)
**Delivery:** A real worker speaking into a phone on site. Natural, close-mic, practical, not a slogan.
**Silence after:** 0.55 s
**Spoken as:** ElevenLabs text: `I'm welding on Roof oh-three until six.`; guide text: `I'm welding on Roof oh-three until six.`

    I'm welding on Roof 03 until six.

## Line 14 (L14): Speak the activity (Frame 7)

**Speaker:** Narrator
**Time:** 49.76 to 56.49 s (guide)
**Delivery:** Clarity arrives. Precise, even, three clauses with light separation.
**Silence after:** 0.35 s
**Spoken as:** ElevenLabs text: `Pree-OR-uh connects the activity to the conditions that matter, verifies the certificate and safeguards, and creates the record while work happens.`; guide: Priora by phoneme override pɹiˈɔːɹə

    Priora connects the activity to the conditions that matter, verifies the certificate and safeguards, and creates the record while work happens.

## Line 15 (L15): Prevention and proof (Frame 8)

**Speaker:** Narrator
**Time:** 56.84 to 59.64 s (guide)
**Delivery:** Let each half stand. Confident through precision, not emphasis.
**Silence after:** 1.1 s

    Prevention before the work. Proof as it happens.

## Line 16 (L16): Priora sees the change (Frame 9)

**Speaker:** Narrator
**Time:** 60.83 to 63.89 s (guide)
**Delivery:** Calm certainty. Immediately is quiet, not triumphant.
**Silence after:** 1.2 s
**Spoken as:** ElevenLabs text: `When the sprinkler goes offline again, Pree-OR-uh sees it immediately.`; guide: Priora by phoneme override pɹiˈɔːɹə

    When the sprinkler goes offline again, Priora sees it immediately.

## Line 17 (L17): Change, retain, transfer (Frame 10)

**Speaker:** Narrator
**Time:** 65.09 to 71.99 s (guide)
**Delivery:** Three options with momentum. Eventually is honest and unhurried.
**Silence after:** 0.6 s

    Now the risk owner can change the activity, knowingly retain the exposure, or eventually ask selected carriers whether they will cover it.

## Line 18 (L18): Whole site and close (Frame 11)

**Speaker:** Narrator
**Time:** 72.59 to 76.64 s (guide)
**Delivery:** Pulling back. Reassuring, measured.
**Silence after:** 0.6 s

    Most work remains ordinary. A few changes become explicit decisions.

## Line 19 (L19a): Whole site and close (Frame 11)

**Speaker:** Narrator
**Time:** 77.24 to 78.52 s (guide)
**Delivery:** Chain link one. Even, deliberate.
**Silence after:** 0.3 s

    Record becomes trust.

## Line 20 (L19b): Whole site and close (Frame 11)

**Speaker:** Narrator
**Time:** 78.82 to 80.18 s (guide)
**Delivery:** Chain link two.
**Silence after:** 0.3 s

    Trust enables decisions.

## Line 21 (L19c): Whole site and close (Frame 11)

**Speaker:** Narrator
**Time:** 80.48 to 81.89 s (guide)
**Delivery:** Chain link three. Can is conditional, not a promise.
**Silence after:** 0.3 s

    Decisions can carry price.

## Line 22 (L19d): Whole site and close (Frame 11)

**Speaker:** Narrator
**Time:** 82.19 to 83.68 s (guide)
**Delivery:** Chain link four. Resolve downward.
**Silence after:** 0.8 s

    Price can connect to capacity.

## Line 23 (L20): Whole site and close (Frame 11)

**Speaker:** Narrator
**Time:** 84.48 to 88.10 s (guide)
**Delivery:** Calm, inevitable close. The name, a breath, the descriptor.
**Then:** end hold 2.8 s on the Priora mark and descriptor.
**Spoken as:** ElevenLabs text: `Pree-OR-uh. Infrastructure for activity-level physical risk.`; guide: Priora by phoneme override pɹiˈɔːɹə

    Priora. Infrastructure for activity-level physical risk.
