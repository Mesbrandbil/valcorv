# Cut 2: direction and shot plan

Owner: the orchestrator (director). Builders implement this plan; they do not change the story, the words, the order of beats or the claims. Where this plan and STORYBOARD.md disagree, this plan wins. STORYBOARD.md still holds the content details (clause wording, artefact contents, evidence fragments, card rows, carrier data, qualifier text) that this plan refers to.

## What the user asked for (their words, condensed)

- The first cut follows the demo HTML's layout and schematic presentation too closely; the eye tires because we look at the same kind of composition for too long.
- Premium Silicon Valley launch-film energy (Stripe, Linear): the HTML is the source of the product's logic and visual identity, the film has its own cinematic composition.
- More variation in scale: whole site, a worker, a specific safeguard, a policy clause, a tightly framed product detail. Every shot directs attention to one thing.
- Snappier editing with breathing room: short sequences of purposeful reveals, then hold the important moments. A quick transition can lead into a calm, readable shot. Energetic movement, never rushed storytelling.
- Better transitions built around the story: match cuts, a line becoming another object, a camera move that follows a connection, a close-up that pulls back to reveal the larger system. No constant zooming, no effects that compete with the story.
- Stronger product hero shots: enlarge and isolate the relevant interface element; a condition, an evidence record or a decision fills the frame when it matters. Never make the viewer scan a dashboard.
- More texture and depth: subtle paper grain, tactile ink and graphite, restrained shading, carefully layered foreground and background. Warm paper, black linework, blue accent. Crafted, and subtle enough to keep clarity.
- Deliberate sound accents on cuts, drawing gestures and changes of scale; silence gives the major moments weight.
- No fixed runtime. Narration at a natural, composed pace; the edit is built around phrases and a 92 BPM pulse. Give room to: the unnoticed condition change, the aftermath, the rewind, the three choices, Priora's recognition of the connection, and the complete RECORD to CAPACITY chain.

## The grid and the clock

- 92 BPM from film time 0: beat = 0.6522 s, bar = 2.609 s. Every narration line starts on a half beat (narration/lines.json pacing.grid). The guide narration is 126.53 s; the film ends there (END).
- Cuts that two scenes must agree on use the shared rule `FL.clock(id).c(anchor)` (the half beat nearest to 0.12 s before the word). Other cuts and move starts snap with `FL.clock(id).b(anchor, off, mode, sub)` or `FL.snapBeat`. Moves last whole or half beats where possible (0.33, 0.65, 0.98, 1.3 s...).
- Rhythm rule: reveals can be quick (a half beat to one beat), then the shot holds for at least two beats before anything else moves. Protected moments hold for four beats or more with nothing moving but a very slow drift.
- Camera language: cuts and deliberate moves, not constant zoom. A move either follows something (a line, a figure, a connection) or reveals something (a pull back). Eases: power3.inOut for snappy moves (one beat), power2.inOut for measured ones, sine.inOut for slow pulls. Drift during holds at most 1.5 percent per 4 s.

## Look for cut 2

- Paper: the index now carries a top surface layer (assets/textures/paper-tooth.png, uniform, about 1.6 percent graphite, plus a soft light falloff) above every scene. Do not add another full-frame grain; do add tactile detail where it belongs: graphite hatching on shaded faces, pencil pressure variation, construction overshoots, the product's restrained card shadow (var(--pui-shadow)).
- Depth: layer foreground, subject and background by scale and contrast. Background at 35 to 60 percent contrast; subject sharp and full contrast; an occasional large, pale foreground element (a pipe run, a roof edge, a sheet edge) passing the lens. Blur only on static layers and only lightly (up to 1.5 px); prefer contrast over blur.
- Type: a hero statement or row reads at 40 px or more; nothing required under 18 px; interface hero shots at 1.8x to 3x of the demo's native size (UIKit elements scale with --pui-scale or by the board camera).
- Blue: Act I never. Acts II and III only for a live connection, a changed condition or a decision state.
- No dashboard frames. Acts II and III do not show the demo's full header, rail and panels together. The END-STATE CONCEPT label stays on screen throughout Acts II and III as a small top-left lockup owned by compositions/chrome.html (Priora glyph, "Priora", chip "END-STATE CONCEPT"); keep the top-left 520 x 120 px and the top-right 420 x 140 px (site clock) free of important content.
- Exclusions (unchanged): stock footage, 3D, cartoons, whiteboard hands, neon, purple gradients, glassmorphism, card grids, flames, handshakes, shields, locks (no padlock drawing), floating documents (sheets lie flat on the drawing plane: no tilt, no float, only a restrained contact shadow).

## Tools (assets/js/film-lib.js)

- `FL.clock(id).t(anchor, off)`: scene-local time of any narration anchor. `.c(anchor)`: the shared cut. `.b(anchor, off, mode, sub)`: beat-snapped.
- `FL.boardCam(boardEl, { rects })`: a DOM camera over a large board (Acts II and III and any DOM insert): `apply`, `cut`, `to`, `drift`, `follow`, `toScreen`. Seek-safe (flBoard plugin), text stays crisp.
- SiteKit's SVG camera for the site (`site.camera`, SiteKit.CAMERAS, SiteKit.rect(cx, cy, s)); FL.camera for other SVG worlds. A hard cut on an SVG camera is a camera set on the timeline (SiteKit: a move with duration 0.001 and ease "steps(1)" from the previous rect, so backward seeks restore the earlier framing).

## Shot plan

Times are the guide narration's; always anchor to the words, never to these numbers. "Cut" means a hard cut on the shared cut time unless stated.

### Act I: the site today (a1-world, a1-inserts, a1-paper, a1-after)

S1. Macro stroke (0 to l01, one bar of lead-in). a1-world. Extreme close on the paper at a roof corner of the Production Hall: on the downbeat a single graphite stroke crosses the frame with visible grain and pressure; on beat 3 a second stroke meets it at the corner; a construction overshoot on beat 4. Clock 06:00. Sound: set-square, pencil.

S2. The site appears (l01 to contractors). a1-world. A continuous pull back from the corner to the whole site (siteOverview) over about five beats while the site draws itself radiating from Roof 03 (the first cut's draw-on, tightened so every building resolves in under a second). Clock 06:00 to 07:00 on "hour". Sound: pull, pencil-scatter.

S3a. "Contractors arrive." a1-world. Cut to a medium-close framing of the road from Gate 2 to the loading area (the site at about 3x the overview scale). The van arrives and four entourage figures walk the dotted path with a natural alternating gait and slight rise and fall; the camera drifts with them in their walking direction. Tag "CONTRACTORS · GATE 2 · 07:10". Sound: cut, van, footsteps.

S3b. "Equipment is isolated." a1-inserts. Cut (on `equipment`) to a close-up insert: a technical line illustration of a valve on a pipe run at the utilities (flanged body, bolts, handwheel, hatch shading on the shadow side, a large pale pipe segment passing in the foreground for depth). The handwheel turns a quarter turn; a hand-lettered tag drops on its string: "ISOLATED · UTILITIES · 07:40" (small "LOTO" above). No padlock. Hold two beats. Sound: cut, handwheel, tick.

S3c. "Work moves." a1-world. Cut (on `workMoves`) back to the wide site: five activity markers pop in on consecutive half beats with short labels (LIFT · LOADING AREA, ELECTRICAL · UTILITIES, INSPECTION · WAREHOUSE, MAINTENANCE · PH2), the HSE site-walk loop draws, the toolbox-talk group stands in its semicircle. Clock rolls 07:10 to 08:30. Sound: cut, pencil ticks on the beat.

S4. "Insurance sets conditions under which risk is accepted." a1-world. The camera rises slightly to a clean overview while the envelope of accepted conditions is drawn around the whole site in one continuous stroke (construction pass, then the firm pass), closing exactly on "accepted", lettered along it. Hold one beat.

S5. The clause and its translation (paperIn to noOne + 1.0). a1-paper.
- 5a. On the beat after "accepted" a paper sheet slides in from the right and lies flat over the drawing (sheet-lay), covering about 92 by 88 percent of the frame; the drawing stays visible at the margins, dimmed (a1-world dims itself to about 40 percent while the sheet is down). A restrained contact shadow only. Inside the sheet a board camera frames clause 4.3 close: "PROPERTY + BI PROGRAMME · CONDITIONS" (mono label), clause 4.2 above in grey, and clause 4.3 as the hero in Plex Sans at about 64 px: "4.3 Automatic sprinkler protection must remain in service." A graphite underline draws under "sprinkler protection ... in service" on the beat.
- 5b. "Good teams translate them into permits, briefings and checklists." On "translate" the underline extends into a hand-drawn arrow and the camera follows the line right to PROCEDURE; on "permits" a one-beat move to PERMIT (the APPROVED · HSE stamp lands on a beat); on "briefings" to BRIEFING; on "checklists" to CHECKLIST. Each artefact is framed medium-close (about 60 percent of the frame) as its word lands, then holds. The sprinkler condition visibly thins at each handoff (full sentence, short line, tick, spoken note, question mark; arrows solid, dashed, dotted). Competence stays visible: signatures, times, stamps, tidy hands.
- 5c. After "checklists": a pull back (about two beats) reveals the whole sheet, the clause and the four artefacts in a row with the thinning line across them; hold on the question mark.
- Exit on the cut at `noOne` ("But"): the sheet lifts off to the left, fast and flat (paper-lift), revealing S6 underneath.

S6. "But no one can hold a moving site in mind." a1-world. Revealed at extreme wide (siteWide), the site already busy; about 36 markers, tags and trails arrive in waves on half beats; the clock accelerates 09:00 to 14:00; three attempts at a containment line are overtaken. On "mind" everything drops to 25 percent except the Roof 03 marker; hold one beat of stillness.

S7. Roof 03 (L06 to landing).
- 7a. a1-world. On `roof03` a one-beat push (power3.inOut) from extreme wide to Roof 03 (roof03 framing); the ROOF 03 marker becomes the hot-work marker. Sound: push.
- 7b. "hot work begins". a1-inserts. Cut on `hotWork` to the worker close-up: a welder kneeling on the roof, an architect's entourage figure drawn at about 560 px tall in clean graphite contour (helmet with the mask down, jacket, gloves, torch, the hose curling back to a small bottle trolley), no face detail, not a cartoon. The arc is a tiny bright point with four to six short radial graphite ticks that flicker deterministically; no flame shapes. The fire-watch figure stands in the mid-ground, lighter (about 45 percent), holding an extinguisher; the roof parapet crosses the foreground, large and pale. Natural movement: the torch hand travels slowly along the seam, the fire watch shifts weight. About two beats. Sound: cut, arc.
- 7c. "every safeguard in place". a1-world. Cut on `certificate` back to Roof 03, slightly tighter than 7a: the safeguard schedule (the reviewed SketchKit schedule with its HOT WORK / ROOF 03 · 14:18 header) ticks its five items on consecutive half beats: certificate on "every", then fire watch, extinguisher, area cleared, sprinklers; the loop round the sprinkler heads ties to the last tick. Clock 14:18 rolls to 14:41:59. The camera settles on SiteKit.CAMERAS.landing by `landing` and holds still. THE LANDING FRAME is the rewind target and a2-resolve's first frame: keep the handoff contract written at the top of compositions/a1-world.html exactly.

S8. The unnoticed change (L07 and the silence after it). Protected.
- 8a. "Then a sprinkler zone goes offline." a1-inserts. Cut on `then` to the SZ3 valve close-up, drawn in the same style as S3b: the sprinkler control valve on its riser (rising stem, handwheel, a pressure gauge, a small plate "SZ3 · PRODUCTION HALL 2"). Over "sprinkler zone" the handwheel turns closed; on "goes offline" the gauge needle falls to zero; the valve clunk lands on "offline" (muted, mechanical, no alarm); a second hand in different lettering hangs the tag "SZ3 ISOLATED · MAINTENANCE · 14:42". Clock 14:42. Sound: cut, handwheel, gauge, valve-clunk, subtract-bed.
- 8b. The cut on the beat after "offline" ends: a1-world, the zone 3 roof in medium (sz3 framing): the sprinkler heads go from ink to grey one by one across the zone on half beats; no colour, no alarm. Then nothing moves for at least two beats. The score has thinned (hold).

S9. "Nothing looks different. The conditions have changed, and nobody sees it." a1-world. Protected.
- 9a. "Nothing looks different." Roof 03 and zone 3 together (roof03AndSz3): the small welder keeps working (arc point flickering), the fire watch stands, everything looks normal. Camera almost still.
- 9b. "The conditions have changed," a gentle one-beat push to a close framing of the envelope boundary beside Roof 03 (the hot-work marker and the envelope line fill the frame): the envelope line is quietly redrawn inward so the marker now sits just outside it. Graphite only.
- 9c. "and nobody sees it." The thin dotted condition connection frays and parts silently in the close framing; then a slow pull back (about three beats, sine.inOut) to roof03AndSz3 with the figures still working. Hold into the silence to `afterwards`.

S10. Afterwards (L09 to L11). Protected.
- 10a. "If something goes wrong," a1-world. Cut on `afterwards` to Roof 03 medium-close: the restrained incident annotation draws (hatched box "INCIDENT · ROOF 03 · 16:07"); clock 16:07. No flames, no people in distress.
- 10b. "questions begin afterwards:" The site recedes (35 percent, a slight blur) while the camera pulls back to afterwardsWide (a1-world); clock DAY +2 · 09:15 on "afterwards"; a1-after's first fragments pin.
- 10c. The three questions. a1-after. A lateral dolly across an evidence board with parallax: two depth planes of fragments (foreground larger and paler, background smaller and sharp) over the receded site. Each question is its own composed shot, set large (Plex Sans Light about 84 px) in clear negative space and paired with the fragment that embodies it: "What was happening?" with PHOTO · ROOF 03 · 16:09 and STATEMENT · FIRE WATCH · "I thought the sprinklers were on"; "Which condition applied?" with PROGRAMME · 4.3 · SPRINKLER PROTECTION; "Can you prove what was true?" with PERMIT HW-0412 · SIGNED 14:12 · SPRINKLERS ✓ (true at 14:12, not at 14:42). One-beat dolly moves between them, each question holding at least two beats; the previous question falls back to 30 percent and leaves with the dolly. Fragments crowd in behind, but the paired fragment and its question always read first.
- 10d. "Today, the gap is often discovered too late." A pull back reveals the whole board; fragments and questions fall back to 30 percent; the gap timeline draws across the lower third on "gap": "14:42 · CONDITION CHANGED" to "DAY +2 · FOUND", bracket "THE GAP", and small beneath "Insurance position may have changed at 14:42." Hold still to `rewindStart`.

S11. The rewind (rewindStart to rewindEnd, then the landing holds to L12). Protected. a1-world, a1-after and a1-inserts scrub their story timelines backward with FL.rewindEase(): the board clears, the camera travels back through the shots in reverse (cuts included), the incident box un-draws, the fray rejoins, the envelope returns, the heads re-ink, the SZ3 valve reopens (needle rises, handwheel turns back, tag lifts off) and the frame lands hard on the landing frame at 14:41:59. The chrome shows the rewind counter. Hold the landing (about two beats) before L12.

### Act II: with Priora (a2-resolve)

Work on a board: the precise site and every interface piece are laid out spatially on one large board (for example 5760 x 3240 board px) with the site at its centre; FL.boardCam frames it. The site SVG uses SiteKit's own camera only for the opening handoff; once the resolve is done, frame everything with the board camera (the site can be an element of the board at a fixed viewBox).

S12. "What if the decision existed when the risk changed?" The landing frame resolves into the precise drawing (site.resolve: lines snap, graphite becomes ink, faces fill), finishing on "changed". The chrome clock rolls back to 14:18:00 with "REPLAY · WITH PRIORA". Then a push (about one and a half beats) toward the worker's position on Roof 03.

S13. "I'm welding on Roof 03 until six." Match: the worker's point on Roof 03 becomes the start of the waveform line (a line becoming another object); the voice capture fills the frame width (about 2.2x): "VOICE · ROOF 03 · 14:18", a waveform from the real worker amplitude, the transcript setting word by word on the worker's word times in large type. On the last word the key tokens underline in blue in sequence (welding, Roof 03, until six) and each token drops into its structured field beneath: ACTIVITY Hot work (welding) · LOCATION Roof 03 · WINDOW 14:18 to 18:00 · BY Contractor, certified operator. Hold one beat.

S14. "Priora connects the work to the conditions that matter." Protected. From the ACTIVITY field a blue connection line draws out and the camera follows it across the board (about one and a half beats) to the clause card "4.2 Hot work requires a permit, a certified operator and a fire watch." (the Act I clause, now in precise product type, at about 2x); a second blue line runs on to "4.3 Automatic sprinkler protection must remain in service." and to SPRINKLER ZONE 3 · ACTIVE on the site. On "matter" the camera pulls back to reveal the whole connection (node on Roof 03, 4.2, 4.3, Sprinkler Zone 3): the connection that silently broke in Act I, now drawn. Hold still through the pause after L14a (slow drift only).

S15. "It checks the certificate and safeguards, and keeps the record."
- 15a. Cut on "It" to the activity card as a hero (about 2.4x, the checklist fills the frame): the five rows resolve to VERIFIED, certificate first on "certificate", the rest on the following beats; footer "5 OF 5 VERIFIED · INSIDE ENVELOPE".
- 15b. On `keeps` the last row's check mark becomes the record entry's marker (match) as the camera slides one beat to the trusted record as a hero (about 2.2x); two entries append inside "record": "14:18 Hot work started · Roof 03 · inside envelope · REC-0403-AA9A" and "14:18 5 of 5 conditions verified · REC-0404-E3F8".

S16. "Prevention before the work. Proof as it happens." A pull back to a calm two-up: the verified card left, the record right (about 1.4x), statements in Plex Sans Light about 64 px set on their words, "Prevention before the work." over the card and "Proof as it happens." over the record, with the small label "TODAY · PREVENTION AND PROOF". Hold still with a slow drift to the hard cut at `l16`.

### Act III: the change seen live (a3-change)

Same board approach as Act II (a3-change builds its own board; it may reuse the same layout ideas).

S17. "The sprinkler goes offline again." Hard cut at `l16` to a close framing of the Sprinkler Zone 3 roof in the precise style: a deliberate echo of S8b's framing. The heads get the demo's offline marks one by one on half beats; the label reads "SPRINKLER ZONE 3 · OFFLINE" in blue; a single system event line slides in at the bottom as a hero line: "14:42 Sprinkler Zone 3 offline · Production Hall 2 · SYSTEM".

S18. "This time, Priora sees it at once." and the crossing. Protected.
- 18a. Cut on `thisTime` to a close-up of the card's last row (about 3x): "Automatic sprinkler protection · VERIFIED" flips to "UNAVAILABLE" in blue on "sees"; footer "4 OF 5 HOLD · RECALCULATING".
- 18b. On `cross` (the silence after L16): cut to the envelope boundary beside Roof 03 in the precise style (a deliberate echo of S9b): the hot-work node stretches toward the boundary and snaps outside (blue reticle, dashed lead line); the tooltip sets beside it: "HOT WORK · ROOF 03 / OUTSIDE AGREED CONDITIONS / Decision required / EXPOSURE · TEMPORARY · 3H 18M · 14:42 to 18:00" (use the demo's own formatting). Near silence, then the latch-like snap. Hold still: this is the primary product reveal.

S19. The three choices (L17a, L17b, L17c). Protected: each choice gets its own composed shot and at least two beats of hold after its words.
- 19a. "The risk owner decides:" The decision sheet's head as a hero (about 1.8x): "14:43 · DECISION REQUESTED · SITE RISK MANAGER", "Risk state changed", "Roof hot work is continuing while sprinkler protection in the affected zone is unavailable." A one-beat pull back reveals the three choice cards beneath.
- 19b. "change the work," The camera frames CHANGE ACTIVITY as a hero: it selects; its outcome reads "Restore sprinkler protection · Reopen the Zone 3 valve"; a small inset of Roof 03 shows the node returning inside the envelope in ink; "INCREMENTAL DKK 0". The most ordinary resolution.
- 19c. "knowingly retain the risk," A snappy one-beat lateral move to RETAIN RISK as a hero: "Nordhavn Bioprocessing knowingly carries this incremental exposure until 18:00." with "OWNED AND RECORDED" and "DECIDED BY ANNA MØLLER · SITE RISK MANAGER · RATIONALE RECORDED".
- 19d. "or, in time, ask selected carriers whether they will cover it." A one-beat move to TRANSFER RISK with its "FUTURE STATE" tag (on "in time"); on `ask` the TRUSTED OBSERVED STATE packet card; the camera follows the packet's line to the responses; on `whether` the answers arrive one per beat in arrival order only (never sorted, never ranked, arrival order is not price order): Northstar Commercial "DECLINED · OUTSIDE APPETITE" 14:44 (dashed), Boreal Risk DKK 1,240 14:45, Atlas Specialty DKK 980 14:46, Helvetic Industrial DKK 1,680 14:47, each with its own terms; the note "Carriers set appetite and price. The risk owner chooses." Then a move down to the programme diagram: the long bar "ANNUAL PROGRAMME · PROPERTY + BI" with the thin "TEMPORARY LAYER · ROOF 03 HOT WORK · 14:42 to 18:00" alongside it. Hold.

S20. "Most work remains ordinary. A few changes become explicit decisions." A close-up that pulls back to reveal the system: from the temporary layer slice, one continuous decelerating pull back (about two bars) to the whole precise site as an object on paper (no dashboard panels): about 30 nodes arrive and pass quietly inside the envelope in ink (sparse ticks); on "few" and "explicit decisions" two nodes turn blue and resolve into decision glyphs (one changed, one retained) with small labels; a small counter lockup (OBSERVED · INSIDE · DECISIONS) at lower left. Handoff: from `closeIn` minus 0.6 s the nodes, labels and counters fade out, so at `closeIn` the frame is the bare precise site at SiteKit.CAMERAS.wholeSite (write the exact state as a handoff comment at the top of the file).

### Close (a3-close)

S21. The chain (closeIn to the lift before "Priora"). a3-close crossfades in over 0.4 s on the identical bare site frame. In the pause after L18 the site recedes and its envelope, the one continuous line of accepted conditions, straightens into a single horizontal hairline across the frame (a line becoming another object). RECORD sets large on "Record" at the left of the line with "what was true"; on "trust" the arrow draws right and the camera rides it (one beat) to TRUST; likewise DECISION, PRICE, CAPACITY, each on its word. Only the arrow being drawn is blue. After CAPACITY a pull back (one and a half beats) reveals the full chain at a readable size with its descriptors and brackets ("TODAY · PREVENTION AND PROOF" under RECORD and TRUST; dashed "OVER TIME" under DECISION, PRICE, CAPACITY). The full chain then holds perfectly still (at least 2.2 s) until the lift.

S22. "Priora. Infrastructure for activity-level physical risk." The chain lifts and fades; the wordmark rises out of its hairline with one clean latch; the descriptor sets on "Infrastructure"; the qualifier (18 px) fades in about a second later and holds about six seconds to END. Nothing moves in the final two seconds.

## Sound direction (audio engine)

- Score at 92 BPM, sections change on bar lines near the story turns. Act I: sparse, built from operational textures, a gentle pulse; builds under S6; at S8 the bed is subtracted to one sustained tone and near silence; the aftermath holds a low tension; the rewind reverses; the landing is silence. Act II: clarity, a quantised pulse enters after the resolve. Act III: near silence at the crossing, momentum returns with the choices (three distinct accents on their words), responses tick on beats; a swell under the pull back of S20. Close: five materially distinct confirmations on the chain words, the score resolves under the full-chain hold, one clean latch on the wordmark, a long natural decay.
- Accents come from the scenes' events: cut, push, pull, whip, sheet-lay, focus, hold, arc, handwheel, gauge (docs/sound-events.md), plus the existing kinds. Restrained: felt more than heard; never cinematic whooshes or risers.

## Ownership (cut 2 build)

| File | Owner |
| --- | --- |
| compositions/a1-world.html, .events.json | builder A |
| compositions/a1-inserts.html, .events.json | builder B |
| compositions/a1-paper.html, .events.json | builder B |
| compositions/a1-after.html, .events.json | builder C |
| compositions/a2-resolve.html, .events.json | builder D |
| compositions/a3-change.html, .events.json | builder E |
| compositions/a3-close.html, .events.json | builder F |
| audio-engine/**, docs/sound-design.md | builder G |
| compositions/chrome.html, cues, index, kits, film-lib, CSS, narration, docs | orchestrator |

Builders work only in isolated copies and hand back files; the orchestrator integrates. A builder that needs a kit or film-lib change works around it inside its scene and reports the exact change it needs.
