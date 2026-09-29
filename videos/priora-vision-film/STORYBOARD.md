---
format: 1920x1080
fps: 30
duration: 91s
mode: autonomous
message: "Today the gap between physical work and insurance conditions is discovered afterwards. Priora makes the connection live, so the decision exists when the risk changes."
arc: "The world today (drawn by hand) → the gap found afterwards → rewind → the same moment with Priora (prevention and proof) → the change seen live → three choices → record to capacity → Priora"
audience: "Industrial sites, HSE, risk owners, operations leaders; also carriers, partners, investors and future colleagues"
music: "restrained modern score, built from operational sounds; subtraction at the failure; reversed at the rewind; clarity with Priora; calm resolution"
timing: "Every time below is a CUE NAME anchored to narration words (see cues/cuesheet.json). Absolute seconds come only from narration/timing.json. Never hard-code seconds for a sync event."
---

# Priora vision film: storyboard and shot plan

This film tells a normal intelligent viewer that today the gap between physical work and insurance conditions is discovered afterwards, and that Priora makes the connection live, so the decision exists when the risk changes.

One continuous story on the fictional Nordhavn Bioprocessing site, told twice. The same isometric site geometry as the Priora end-state demo is drawn in graphite in Act I and resolves into the demo's precise interface in Acts II and III. The rough-to-precise resolution is the drawing becoming the product.

| Scene | Beat | On screen | Why |
| --- | --- | --- | --- |
| 1 a1-world | Act I, the site today, and the rewind | The site drawn by hand; contractors, isolations, work; the envelope of accepted conditions; Roof 03 hot work; Sprinkler Zone 3 offline, unnoticed; then the whole drawing reverses | Establishes who this is for and the invisible crossing; carries the signature rewind |
| 2 a1-paper | Insurance becomes workflow | A programme clause drawn as a detail callout, copied by hand into procedure, permit, briefing and checklist; the sprinkler condition thins at every handoff | Shows competence and the structural weakness without blaming anyone |
| 3 a1-after | Afterwards | Evidence fragments crowd the page; three questions; the gap drawn as the distance between 14:42 and the day it was found | Lands "Today, the gap is often discovered too late" |
| 4 a2-resolve | Priora today | Rewind lands; lines resolve into the interface; the worker speaks; Priora connects, verifies, records; "Prevention before the work. Proof as it happens." | The value a sceptic can accept today |
| 5 a3-change | What trusted state makes possible | Sprinkler offline again; the node stretches across the envelope; three choices owned by the risk owner; transfer as future state alongside the annual programme; pull back to the whole site | The vision, shown with restraint and correct claims |
| 6 a3-close | The close | RECORD → TRUST → DECISION → PRICE → CAPACITY; Priora; descriptor; qualifier | Inevitable end state and honest labelling |
| 7 chrome | Frame furniture | Registration marks, sheet border and title block in Act I, site clock, rewind counter | Depth and continuity; the clock carries the story's time |

Style: frame.md (paper, ink, graphite, one cobalt signal). Duration: set by the ElevenLabs performance, 88 to 94 s, target about 91 s.

## Global rules for every scene

- Geometry: the site always comes from assets/site (precise) and its generated rough twin. Never redraw the site freehand; never invent buildings.
- Camera: frame the site by tweening the SVG viewBox between named camera rects (assets/js/cameras.js). Camera moves are measured: power2.inOut or sine.inOut, 1.2 to 3.5 s, with a very slow drift (under 1.5 percent scale per 4 s) during holds so no frame is dead.
- Blue (signal #1F47D6) never appears in Act I. In Acts II and III it marks only a live connection, a changed condition or a decision state.
- Text meant to be read is at least 18 px, usually 24 px or more. Labels in Plex Mono uppercase.
- Seek safety: fromTo only, no random, no clocks. Sync events use cues from window.CUES converted to scene-local time.
- Sound events: every visual event that should make a sound (a stroke, a tick, a stamp, a click) is listed in the scene's exported events (see docs/pipeline.md) so the audio engine can place it.

## Frame 1 — Act I world: the site today, and the rewind

- src: compositions/a1-world.html
- scene: The Nordhavn site drawn in graphite; the invisible crossing; the full drawing runs backward to 14:41:59
- starts: 0
- ends: cue rewindEnd + 0.4 (crossfades into Frame 4)
- transition_in: none (film opens on paper)
- blueprint: camera-journey (cursorless flight) composed with svg-path-draw, multi-phase-camera, overwhelm-surround (accumulation only)
- voiceover: L01 to L11 (under Frames 2 and 3 where they overlap)
- status: outline

Structure: build everything that happens on the site as one inner paused timeline called story, then drive it from the registered timeline: forward from 0 to the end of the afterwards beat, then scrub story backward to the story time of the landing moment (cue landing, just before the zone goes offline) over the rewind window with a custom ease (slow start, fast middle, very hard deceleration into the landing). The rewind is literally the drawing un-drawing.

Shot sequence:

1.1 Lead-in (0 to cue l01). Blank paper, registration marks already present (Frame 7). Camera starts close on the production hall's north roof edge (camera rect roofEdgeMacro). The first graphite stroke draws a roof edge with a set-square contact sound; construction overshoot at both ends. Two more edges follow. Clock top right reads 06:00.

1.2 L01 "Every industrial site changes by the hour." The camera pulls back continuously (roofEdgeMacro → siteOverview, about 4 s, power2.inOut) while the whole site draws itself in graphite: production hall, production hall 2, warehouse, laboratory, utilities with stack, tanks, loading area with containers, ground crosses, leader lines and hand-lettered labels. Draw order radiates from Roof 03 outward, strokes staggered so each building resolves in about 0.8 s. On "hour" the clock sweeps one hour (06:00 → 07:00, odometer roll).

1.3 L02 "Contractors arrive." A dotted path draws in from the site gate to the loading area; a van outline and a short file of architectural scale figures (simple line silhouettes, 22 to 30 px tall, no faces, no cartoon) move along it. Hand-lettered tag: "CONTRACTORS · GATE 2 · 07:10". "Equipment is isolated." At utilities a valve symbol draws with a lockout tag: "ISOLATED · LOTO · 07:40". "Work moves." Five activity markers (graphite circles with a centre dot) appear across the site with hand-lettered labels: LIFT · LOADING AREA, ELECTRICAL · UTILITIES, INSPECTION · WAREHOUSE, MAINTENANCE · PH2, and a dotted HSE site-walk loop "HSE SITE WALK · 07:30". A toolbox-talk group of five figures in a semicircle near the laboratory: "TOOLBOX TALK · 07:15 · 11 PEOPLE". These tell the viewer who this is for without listing job titles.

1.4 L03 "Insurance sets conditions under which risk is accepted." The accepted envelope is drawn by hand around the whole site: a rounded boundary following the demo envelope's path, drawn in two passes (a light construction pass, then a firmer line), closing exactly on "accepted". Hand-lettered along it: "ACCEPTED CONDITIONS · PROPERTY + BI PROGRAMME". Camera eases left (siteOverview → siteLeft) to make room for Frame 2 on the right.

1.5 L04 (Frame 2 leads). The site stays at left, lines at 80 percent, markers breathing slightly (tiny scale drift, no pulse). A hand-drawn leader connects the envelope to Frame 2's clause callout.

1.6 L05 "But no one can hold a moving site in their head." Frame 2 clears. Camera pulls wider (siteLeft → siteWide, 2.5 s). Accumulation: about 36 further activity markers and tags appear in overlapping waves across the site (hot work, lifts, isolations, deliveries, confined space, scaffolding, permit numbers), with short dotted movement trails; the clock accelerates 09:00 → 14:00; an HSE containment line is drawn around clusters three times, each attempt overtaken by new markers. Busy, but still an elegant drawing, never chaos. On "head" everything except the Roof 03 marker drops to 25 percent.

1.7 L06 "On Roof 03, hot work begins." Measured push to Roof 03 (siteWide → roof03, 2.2 s, power2.inOut). The Roof 03 marker becomes the hot-work marker: hand-lettered "HOT WORK · ROOF 03 · 14:18". Clock settles to 14:18. "The certificate and safeguards are in place." Five small hand-drawn items appear around the marker, each receiving a graphite tick in sequence: CERTIFICATE (a small card), FIRE WATCH (one standing figure), EXTINGUISHER (line icon), AREA CLEARED (hatched ring), SPRINKLERS (the sprinkler heads across Roof 03 as small dots, ticked). The sprinkler zone 3 outline is drawn dashed and lettered "SPRINKLER ZONE 3".

1.8 Landing moment (story cue landing). The camera begins a slow lateral move toward production hall 2 (roof03 → sz3). Clock 14:41:59. This exact frame is where the rewind will land and where Frame 4 begins. Sprinkler heads are in ink, the envelope is intact, the permit tick for SPRINKLERS is visible.

1.9 L07 "Then a sprinkler zone goes offline." Lateral reveal to the zone's valve at production hall 2 (sz3 rect). A different hand draws a tag on the valve: "SZ3 ISOLATED · MAINTENANCE · 14:42". On "offline" the sprinkler heads in zone 3 fade from ink to 20 percent grey, one after another across the zone (subtraction, no alarm). Clock 14:42.

1.10 L08 "Nothing looks different. Work continues." Camera eases back to frame Roof 03 and the zone together (roof03AndSz3). The hot-work marker keeps its quiet life. "But the conditions have changed," the envelope line beside Roof 03 is quietly redrawn a few pixels inward, so the hot-work marker now sits just outside it. No colour, no emphasis. "and nobody sees it." The graphite tick beside SPRINKLERS remains. The thin dotted line that connected the envelope's condition to Roof 03 frays and parts silently.

1.11 L09 to L11 (Frame 3 leads). The site recedes: lines to 35 percent, a slight depth-of-field blur (2 px), camera a slow pull (roof03AndSz3 → afterwardsWide). Clock jumps: 14:42 → 16:07 → DAY +2 · 09:15 (never a calendar date). A restrained incident annotation near Roof 03: a hatched box "INCIDENT · ROOF 03 · 16:07". No flames, no people in distress.

1.12 Rewind (cue rewindStart to cue rewindEnd). The story timeline scrubs backward: evidence clears (Frame 3 reverses in sync), the clock runs back through 09:15, 16:07, 14:42 to 14:41:59, the incident box un-draws, the envelope line returns outward, the frayed connection rejoins, sprinkler heads re-ink one by one in reverse order, the valve tag un-draws, the camera travels back to the landing frame. Frame 7 shows a mono counter "REWIND · 16:07 → 14:41:59". Land and hold 0.3 s.

Handoff out (identical frame at cue rewindEnd, owned by Frame 4 from then): camera rect landing; rough style; visible: site linework, intact envelope with its hand lettering, hot-work marker and its label, the five ticked items, sprinkler zone 3 dashed outline with heads in ink, clock 14:41:59. Everything else at 0.

Sound: ventilation bed, distant machinery, a radio click at 1.3, footsteps under contractors, graphite and pen strokes on draws (events), ruler and set-square taps on long straight strokes, paper texture. During 1.6 the rhythm builds from operational sounds. At 1.9 part of the bed is removed (the machinery layer drops out on "offline"). At 1.12 everything is sucked backward: reversed paper and pencil, mechanical states in reverse, ambience inhaled to near silence at the landing.

## Frame 2 — Insurance becomes workflow

- src: compositions/a1-paper.html
- scene: A programme clause copied by capable hands into procedure, permit, briefing and checklist; the sprinkler condition thins at each handoff
- starts: cue insurance − 0.3
- ends: cue movingSite + 0.6
- transition_in: drawn on (strokes) over Frame 1
- blueprint: spatial-pan-stations (stations on one canvas, no camera flight; the eye travels the chain) composed with svg-path-draw and discrete-text-sequence
- voiceover: L03, L04
- status: outline

Right 58 percent of frame, drawn on the same paper in the same graphite and typeset Plex (this is a detail sheet within the drawing, not floating documents: no shadows, no tilt, no 3D).

2.1 L03. A detail callout box draws (hairline rectangle, a numbered detail tag "D1"): "PROPERTY + BI PROGRAMME · CONDITIONS". Two clauses typeset in Plex Sans 26 px: "4.2 Hot work requires a permit, a certified operator and a fire watch." "4.3 Automatic sprinkler protection must remain in service." A hand leader connects the callout to the envelope in Frame 1.

2.2 L04 "Good teams translate them into permits, briefings and checklists." A horizontal chain of four drawn artefacts beneath the callout, each arriving on its word, joined by hand-drawn arrows:
- PROCEDURE (arrives with "translate"): "HSE-PR-12 · Hot work", lines of text, one line reads "Confirm sprinklers in service".
- PERMIT (on "permits"): form with fields, "PERMIT HW-0412", a signature, "APPROVED · HSE" stamp (stamp sound), a row "Sprinklers ✓".
- BRIEFING (on "briefings"): five small figures around a point, "07:15 · TOOLBOX TALK", a speech note "sprinklers on".
- CHECKLIST (on "checklists"): three checkbox rows "Fire watch ☑", "Extinguisher ☑", "Sprinklers ?".
The sprinkler condition visibly thins: full sentence → short line → tick → spoken note → a question mark; and the arrows between artefacts go solid → dashed → dotted. Competence stays visible: signatures, times, stamps, tidy hands.

2.3 L05 start. The chain slides left and fades as Frame 1 pulls wide (0.8 s), graphite fading last.

Sound: paper slide on the callout, pen writing for clause text, stamp, pencil ticks, a page lift at the exit.

## Frame 3 — Afterwards

- src: compositions/a1-after.html
- scene: Evidence crowds the page; three questions; the gap drawn as distance in time
- starts: cue afterwards − 0.6
- ends: cue rewindEnd
- transition_in: drawn on over the receding site
- blueprint: overwhelm-surround (accumulation, no avatar) composed with discrete-text-sequence and svg-path-draw; reverses under the shared story-scrub pattern
- voiceover: L09, L10, L11
- status: outline

Same structure as Frame 1: an inner story timeline, played forward, then scrubbed back to 0 over the rewind window in sync with Frame 1.

3.1 L09 "If something goes wrong, questions begin afterwards:" Evidence fragments are pinned to the page with fine leader lines to places on the site, arriving in waves: PHOTO · ROOF 03 · 16:09 (a hatched frame with a lens crosshair, not a photograph); CALL LOG · 14:40 · VALVE ROOM · 2 MIN 13 S; PERMIT HW-0412 · SIGNED 14:12 · SPRINKLERS ✓; WORK ORDER WO-2291 · SZ3 ISOLATION · 14:42; PROGRAMME · 4.3 · SPRINKLER PROTECTION; STATEMENT · FIRE WATCH · "I THOUGHT THE SPRINKLERS WERE ON"; EMAIL · 15:02 · RE: ROOF WORK. Each fragment is drawn in graphite with Plex Mono metadata.

3.2 L10 "What was happening? Which condition applied? Can you prove what was true?" Each question sets on its first word in Plex Sans Light 76 px at left, stacking; fragments keep accumulating and crowd the frame edges; hand-drawn question marks and dashed investigation lines join fragments.

3.3 L11 "Today, the gap is often discovered too late." The questions and most fragments fall back to 30 percent. A clean timeline rule draws across the lower third: marker "14:42 · CONDITION CHANGED" at left and marker "DAY +2 · FOUND" at right; a bracket spans them labelled "THE GAP" on "gap". Beneath, small: "Insurance position may have changed at 14:42." Hold to the end of L11.

3.4 Rewind. Everything reverses in sync with Frame 1 and clears to nothing by cue rewindEnd.

Sound: fragments land with small paper and pin sounds; typing-free (type sets silently); a low tension held tone thinning; at the rewind, reversed paper.

## Frame 4 — Priora today: prevention and proof

- src: compositions/a2-resolve.html
- scene: Lines resolve into the interface; the worker speaks the activity; Priora connects, verifies, records
- starts: cue rewindEnd
- ends: cue again − 0.3
- transition_in: continuous (identical first frame to Frame 1's handoff, 0.4 s crossfade overlap)
- blueprint: prompt-type-submit-generate (speech in, structured activity out) and agent-progress-theater (checks resolve), composed with theme-crossfade-morph, svg-path-draw, waterfall-entry, asr-keyword-glow
- voiceover: L12, L13 (worker), L14, L15
- status: outline

4.1 L12 "What if the decision existed when the risk changed?" Starts on the handoff frame (rough, 14:41:59). As the line is spoken, the drawing resolves: jittered paths tween to their exact geometry, overdraw strokes fade, construction overshoots retract, hand lettering crossfades to Plex Mono labels in the same positions, graphite becomes ink, building faces fill with the demo's paper tones, the hand envelope becomes the demo's precise envelope with its label "ANNUAL PROGRAMME ENVELOPE · PROPERTY + BI". The pencil ticks disappear (Priora will verify them itself). Expo-out snaps, staggered by building, finishing on "changed". The clock rolls back to 14:18:00 (a quick odometer roll) as the product header assembles along the top edge (Frame 7 hands the clock to the header; see handoff).

4.2 L13 worker "I'm welding on Roof 03 until six." Camera: roof03Product (close on Roof 03, precise). A capture strip appears lower left: "VOICE · ROOF 03 · 14:18" with a fine waveform line drawn from the worker take's real amplitude envelope, and the transcript setting word by word on the worker's word timings. On the last word the transcript resolves into four structured fields, each underlined in signal blue as it is recognised: ACTIVITY Hot work (welding) · LOCATION Roof 03 · WINDOW 14:18–18:00 · BY Contractor, certified operator. The hot-work node (demo node glyph) appears on Roof 03 in the checking state.

4.3 L14 "Priora connects the activity to the conditions that matter," Two live connection lines draw in signal blue from the node: one to a precise clause label "4.2 HOT WORK · PERMIT · CERTIFIED OPERATOR · FIRE WATCH", one to sprinkler zone 3 (its outline turns precise and labelled "SPRINKLER ZONE 3 · ACTIVE") and the clause "4.3 SPRINKLER PROTECTION IN SERVICE". This is the connection that silently broke in Act I, now drawn. "verifies the certificate and safeguards," the demo's activity card enters at 1.6x on the left: "ACTIVITY · ACT-1418-R03 / Hot work / ROOF 03 · 14:18–18:00 / Contractor · certified operator", and its five rows resolve to VERIFIED one by one: Certified operator, Extinguishing equipment, Fire watch, Combustibles cleared, Automatic sprinkler protection; footer "5 OF 5 VERIFIED · INSIDE ENVELOPE". The node settles to the inside state. "and creates the record while work happens." A trusted record column enters on the right and appends two entries: "14:18 Hot work started · Roof 03 · inside envelope · REC-0403-AA9A" and "14:18 5 of 5 conditions verified · REC-0404-E3F8".

4.4 L15 "Prevention before the work. Proof as it happens." A composed typographic beat: two statements in Plex Sans Light 64 px, "Prevention before the work." aligned beside the verified checklist, "Proof as it happens." beside the record entries, each on its word, with a thin rule linking statement to evidence. Small mono label above: "WHAT PRIORA DOES TODAY". Hold to the end of the gap after L15, with slow drift.

Handoff out: product view, node inside, card and record visible; Frame 5 opens with a precise reframing (0.3 s overlap).

Sound: at 4.1 the rhythm gains clarity (quantised pulse enters), a soft mechanical alignment texture as lines snap; worker line close-mic with a hint of roof air; precise confirmation ticks for each VERIFIED (five, subtly different), a record-append click for each entry; the two statements land on the score, not on effects.

## Frame 5 — What trusted state makes possible

- src: compositions/a3-change.html
- scene: The sprinkler goes offline again and Priora sees it; the node crosses the envelope; three choices owned by the risk owner; pull back to the whole site
- starts: cue again − 0.3
- ends: cue chainRecord − 0.5
- transition_in: crossfade 0.3 s
- blueprint: camera-journey (action roundtrip) for the event and crossing, cursor-free decision presentation adapted from agent-progress-theater, zoom-out-workspace-reveal for the pull back
- voiceover: L16, L17, L18
- status: outline

5.1 L16 "When the sprinkler goes offline again," System view (camera systemRoof): Roof 03, zone 3, the card at left, the record at right. A system event enters the record: "14:42 Sprinkler Zone 3 offline · Production Hall 2 · SYSTEM". The zone's heads get the demo's offline marks; its label turns to "SPRINKLER ZONE 3 · OFFLINE" in signal blue. "Priora sees it immediately." The card's last row flips from VERIFIED to UNAVAILABLE (blue), footer "4 OF 5 HOLD · RECALCULATING"; the node goes to the checking state.

5.2 The crossing (cue cross, inside the silence after L16; give it about 1.2 s of screen time). The hot-work node stretches toward the envelope boundary: an elongating capsule from its position to a point just outside the envelope, the boundary flexing locally, then the node snaps outside into the demo's outside state (reticle, dashed lead line) in signal blue. Tooltip: "HOT WORK · ROOF 03 / OUTSIDE AGREED CONDITIONS / Decision required / EXPOSURE · TEMPORARY · 3H 18M · 14:42–18:00". This is the primary product reveal: hold, no other motion except slow drift.

5.3 L17 "Now the risk owner can change the activity," The decision sheet enters at right (demo's sheet at 1.4x): "14:43 · DECISION REQUESTED · SITE RISK MANAGER / Risk state changed / Roof hot work is continuing while sprinkler protection in the affected zone is unavailable." and the three choices. On "change": CHANGE ACTIVITY highlights; its micro-outcome plays: "Restore protection" → the node returns inside the envelope in ink, "Incremental DKK 0". This is the most ordinary resolution. "knowingly retain the exposure," the node returns to the outside state for this branch (a clean state swap), RETAIN RISK highlights: "Nordhavn Bioprocessing knowingly carries this incremental exposure until 18:00." with "DECIDED BY ANNA MØLLER · SITE RISK MANAGER · RATIONALE RECORDED", the retained glyph, and "OWNED AND RECORDED · UNTIL 18:00". "or eventually ask selected carriers whether they will cover it." TRANSFER RISK highlights with a clear tag "FUTURE STATE". A packet labelled "TRUSTED OBSERVED STATE" travels to the selected carriers from the demo's data (all fictional: Northstar Commercial, Atlas Specialty, Boreal Risk, Helvetic Industrial); each returns its own answer in its own time and is shown in arrival order, never sorted or marked best: Northstar Commercial "Declined · outside appetite", the others their own terms (the demo's illustrative figures, e.g. "DKK 980 · until 18:00"). A small note: "Carriers set appetite and price. The risk owner chooses." Beneath, a precise diagram: a long bar "ANNUAL PROGRAMME · PROPERTY + BI" and, alongside it, a thin slice "TEMPORARY LAYER · ROOF 03 HOT WORK · 14:42–18:00".

5.4 L18 "Most work remains ordinary." One continuous decelerating pull back to the whole-site system view (header, site, rail) at video scale: about 30 activity nodes arrive across the site and pass quietly inside the envelope in ink; counters rise (OBSERVED, INSIDE). "A few changes become explicit decisions." Two nodes briefly turn signal blue and resolve (one changed, one retained); DECISIONS counter steps; the trusted record appends entries in the rail.

Sound: at 5.1 a muted mechanical valve clunk and one bed layer steps down; "sees" gets a crisp system tick; 5.2 near silence with a single low sustained tone and a quiet stretch texture ending in a precise latch-like snap as the node crosses; 5.3 momentum returns: three distinct choice accents, packet and response ticks; 5.4 quiet rhythmic flow, soft ticks for passing nodes (sparse), two firmer decision accents.

## Frame 6 — Record to capacity, and Priora

- src: compositions/a3-close.html
- scene: RECORD → TRUST → DECISION → PRICE → CAPACITY, then Priora and the descriptor, with the qualifier
- starts: cue chainRecord − 0.5
- ends: END
- transition_in: crossfade 0.5 s (the interface recedes to paper)
- blueprint: kinetic-type-beats (statement built across beats) then logo-assemble-lockup (wordmark comes to exist) and titlecard-reveal (the held end card)
- voiceover: L19a to L19d, L20
- status: outline

6.1 L19a to L19d. On clean paper, the chain builds left to right in Plex Mono 500, 44 px, letterspaced, joined by precise arrows that draw: RECORD on "Record", TRUST on "trust", DECISION on "decisions", PRICE on "price", CAPACITY on "capacity". Under each word a one-line descriptor in Plex Sans 22 px grey: what was true · shared observed state · owned and explicit · the carrier's own terms · a layer alongside the programme. A hairline bracket under RECORD and TRUST reads "TODAY · PREVENTION AND PROOF"; a dashed bracket under DECISION, PRICE, CAPACITY reads "OVER TIME". Only the active arrow is blue while it draws; the finished chain is ink.

6.2 L20 "Priora. Infrastructure for activity-level physical risk." The chain lifts and fades; the Priora wordmark (assets/brand/priora-wordmark.svg) resolves at centre, about 34 percent of frame width, on "Priora", with one clean mechanical latch; the descriptor "Infrastructure for activity-level physical risk" sets beneath in Plex Sans 36 px on "Infrastructure". The qualifier fades in at the bottom in Plex Mono 17 px, grey-2: "Conceptual future-state demonstration. Risk transfer, carrier quotes, prices, people, carriers, and the Nordhavn site are illustrative. Priora today focuses on prevention and proof." Hold still to the end (end hold at least 2.5 s).

Sound: five quiet, materially distinct confirmations on the five words (paper, wood, felt, metal, glass-free resonant tick), the score resolving underneath; one clean mechanical latch on the wordmark; a long natural decay into silence.

## Frame 7 — Chrome: frame furniture and time

- src: compositions/chrome.html
- scene: Registration marks, Act I sheet border and title block, site clock, rewind counter
- starts: 0
- ends: cue chainRecord − 0.5
- transition_in: present from frame 0
- blueprint: none (fixed-anchor furniture); rules: svg-path-draw, vertical-spring-ticker for the clock digits
- status: outline

- Registration marks: four corner crosshairs inset 36 px, ink at 35 percent, present all film until Frame 6.
- Act I (0 to cue rewindEnd): a hairline sheet border inset 36 px and a title block bottom right in Plex Mono 15 px: "NORDHAVN BIOPROCESSING · SITE ACTIVITY · DRAWN HSE · SHEET 01 · FICTIONAL SITE". Site clock top right: label "SITE TIME" and HH:MM in Plex Mono 36 px, driven by a piecewise map of film time to site time (06:00 at start, 07:00 on "hour", ramp through the morning under L02 to L05, 14:18 on L06, 14:41:59 at landing, 14:42 on "offline", then 16:07 and "DAY +2 · 09:15" in the afterwards). During the rewind the digits run backward and a mono counter "REWIND · 16:07 → 14:41:59" appears top centre.
- Act II and III: the title block and border fade out as Frame 4's header assembles; the clock hands over to the header's clock at the same position, size and value at cue clockHandoff (both show 14:18:00).

## Timing budget (guide estimate, re-derived from the real voice)

Lead-in 1.2 s; Act I lines to the end of L11 about 41 s; rewind silence 3.2 s; Act II about 17 s; Act III about 19 s; chain and close about 9 s plus end hold 2.8 s. Total about 91 s.
