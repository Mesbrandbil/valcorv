# Cut 2 plan: what changes after the first review

Five reviewers (story without sound, honesty, craft, motion, sync) watched draft 1. This file is the director's decision on every finding. It supersedes `docs/storyboard.md` wherever the two differ. Builders: read this whole file, then your section list, then fix. Keep every rule in `docs/design.md`.

## 1. Global changes already made by the director (do not redo)

- **Voiceover retimed** (narration/timing.json and assets/js/pk-cues.js are regenerated; PK.word() follows automatically). New lines and times:
  - L02 "Priora places agents around it." 5.45-7.59
  - L04 now 23.40-26.82 (summons 23.96, only 24.41, specialists 24.79, job 26.19)
  - L09 "Three decision rooms open." 57.70-59.41
  - L10 is now only "Retain is never a default." 60.25-61.94 (never 60.92, default 61.32)
  - **new L10b** "Risk is kept on purpose, with its terms explicit." 62.60-65.68 (Risk 62.60, kept 63.10, purpose 63.53, terms 64.56, explicit 64.90). The words "exposure" and "authority" no longer exist in the VO: any PK.word("L10", "exposure"/"authority"/"risk") will throw and must be changed.
  - L11 66.95-71.17 (compares 67.41, safeguards 67.87, checks 69.09, back 70.19, inside 70.49)
  - L12 72.25-77.10 (simulated 72.87, outside 74.66, capacity 75.21, terms 75.92, price 76.55)
  - L13 78.60-83.32 (carries 79.07, case 79.61, rooms 80.29, risk 81.38, stays 82.03, control 82.64)
  - L14 83.75-88.43 (explicit 85.50, risk 86.11, decisions 86.36, while 87.39, happens 87.86)
- **Camera rewritten** (assets/js/camera.js). No drifts any more: the camera holds perfectly still between short moves, and no move overlaps a beat the viewer must read:
  - 7.6-8.6 to [950,548,980] (voice note and case), hold to 22.3
  - 22.3-23.9 to [530,510,1044] (the panel, with the worker and part of the site in the lower right), hold to 39.65
  - 39.65-40.85 to [700,560,1300] (route), hold to 46.9
  - 46.9-48.1 back to [530,510,1044] (deviation; the site window stays in frame), hold to 52.75
  - 52.75-53.95 to [930,560,1340] (escalation, in a still frame), hold to 56.95
  - 56.95-57.95 to [1420,515,1060] (risk owner and rooms), hold to 59.2
  - 59.2-60.2 to [1500,330,760] Retain; 65.95-66.9 to [1500,508,760] Mitigate; 71.3-72.2 to [1500,686,760] Transfer (zoom about 2.53, x 1120 to 1880: the doors and the space outside them are in frame)
  - 77.6-78.9 to [1420,515,1170] (cooperation; the worker is out of frame), hold to 83.1
  - 83.1-84.4 to [960,540,1920] (the whole sheet), hold to 90
- **Kit** (assets/js/pk-kit.js): `PK.trail(tl, layer, d, at, dur, ease)` now reveals the trail behind the traveller through a mask and fades it over 0.8 s from arrival. Pass the traveller's ease. Delete any local copy of a trail helper and use PK.trail. Risk engineering's aperture is now a ring (a measuring target), so a 45 degree turn never reads as an X. The Retain "record" room agent is now a square with a punched hole and one short slit (not three bars). `.pk-decision` (the human's black line) is now 3.5 px.
- **World** (assets/js/world.js): `GEO.caseForm` is now (1000, 455); `GEO.prioraListen` (1250, 430). `W.route` now lives in `W.L.threads` (above the real world) and ends inside the packing line window at (1012, 727.5), so it is seen arriving. New geometry: `GEO.dock` (1228, 680) where the decision packet waits beside the risk owner, `GEO.prioraDock` (1186, 612), `GEO.branch` (1276, 600) where the risk owner's black line splits to the three doors.
- s1 and s2 are being fixed by the director at the same time as you work (contract at 22.3 below).

## 2. Contracts (exact states at the hand-offs)

**22.3 (s2 to s3).** Priora at GEO.prioraListen moved to (1150, 445), scale 1, beadG rotation 180, orbit and bead visible, label hidden. Case W.caseT.g at (1000, 455), opacity 1, all facets folded (chipG x = 22) and visible, photo mark visible, W.caseLabel visible at (1000, 497). Nothing else. s3 starts moving things at 22.3, not 22.0 (s2 holds the finished case 21.6-22.3).

**47.0 (s4 to s5).** As before: Priora (700, 470) bead 180; case at the table (380, 520); W.align five arcs closed; agents at their aligned angles; panel drawn, door open; W.route drawn; spark flickering; record spine with one tick; no status labels.

**57.0 (s5 to s6), changed.** Priora at GEO.prioraDock (1186, 612), scale 1, bead pointing at the packet. Packet W.caseT.g at GEO.dock (1228, 680), body scale 1, arcsG scale 0.85 (not 0.75), insurer arc hidden, facets folded AND rotated so no facet sits inside the gap (rotate the facets group by 30 degrees or fold them to radius 14): the gap at the top must be the clearest negative space on the packet. Two small rust-deep ticks mark the gap's edges. `W.decision` is the human's black line, drawn: it leaves the risk owner (desk top right, about (1180, 711)), reaches the packet, loops once round it and ends at `W.decisionTip` = the packet's right side (about (1270, 680)). `W.ownerDecides` label visible (s6 fades it at 57.9). The panel and real world as at 47 except the insurer token tilted. No barrier, no other labels.

**78.0 (s6 to s7), changed.** Priora back at GEO.prioraDock (1186, 612); the packet back at GEO.dock (1228, 680) in its 57.0 state (gap open). Rooms drawn, doors closed, names visible, SIMULATED chip visible. `W.decision` still drawn (owner to the packet loop); the trunk from W.decisionTip to GEO.branch drawn solid black; `W.branches = { retain, mitigate, transfer }` drawn as fine dotted grey from GEO.branch to each door. `W.roomOwnerLines` (undrawn solid black lines from GEO.branch through each door). `W.roomAgents`, `W.safeguards` as before (the safeguard objects now carry their own measures, see s6). No transient labels.

## 3. Rules every builder applies

- A camera move never overlaps a movement the viewer must read. Check your beats against the camera list above and move beats out of the moves.
- Every important state holds still for at least 0.8 s; every label meant to be read is on screen and still for at least 1.2 s.
- Label sizes are authored for the shot they are read in: `PK.cam.px(t, 22)` for names, `PK.cam.px(t, 19)` for mono status labels. Nothing meant to be read is under 18 px on screen. Text that is not being read in a wide shot fades out rather than shrinking below 18 px.
- Nothing is cut off by the frame edge in a held shot. Status labels sit at least 60 px inside the frame.
- Black (ink) is only for people, places and the risk owner's decision line. Neutral marks (timers, coins, port ticks) are grey #8F8C86 or rust-deep; agent marks are rust.
- No UI furniture: no progress bars, no boxed form fields with blank underlines, no comparison tables with row headers, no app pictograms.
- Threads retract from their source end toward the agent (or fade in place); never leave detached fragments; clear a thread before the next one goes through the same door.
- Trails: PK.trail with the traveller's ease. No pre-drawn paths.

## 4. Section fix lists

### s3-panel and s4-inside (builder B)

1. Start at 22.3 (contract above; the camera move is 22.3-23.9). Priora carries the case to the door outside during the move (a follow move is fine), with PK.trail.
2. Panel walls draw after the camera lands: 23.6-24.4 ("summons" is 23.96). Slots and ghosts 24.3-24.8. Ghost candidates: raise them to about 45 percent grey with 1.5 px dashes, names radially outside the slot ring (slot radius + 45) with a paper knockout, the same anchor rule for all, held at least 1.2 s. Rename them so they do not repeat the activities shown later as LATER: use "Electrical", "Structural", "Security". Make selection visible: Priora's bead sweeps the ring; toward each ghost a short dashed thread starts, stops short and retracts, and the slot stays empty.
3. Summons from about 24.9, every 0.8 s. For each relevant specialist, pulse the matching case facet and send a bead from it into the summon thread (HOT WORK to Fire; CONDITIONS to Insurer conditions and Site rules; PACKING LINE to Risk engineering; PHOTO to Evidence), so relevance is shown, not told.
4. The case enters the table 28.9-29.6 (still camera now), unfolds 29.7, Priora's distribution pulse 30.0, distribution 30.2-31.1 staggered 0.15 s per agent so each copy can be followed.
5. Inspect on L05 (31.2) staggered so no more than two behaviours overlap, each behaviour clearly visible at this zoom (about 1.85): Site rules ruled line, Insurer brackets, Fire dots and pings, Risk engineering turns 45 degrees with a dashed exposure radius (its aperture is now a ring, so no X), Evidence corners and tick. Focused signals as before.
6. Returns on "reports back" (33.0); stretch the stagger so the last finding lands about 36.4; then the reconcile: the five marks on Priora's orbit turn slowly and are absorbed 36.6-37.9 (fill the old dead hold), bead turning toward the case.
7. s4: align 38.4-39.3 and the lock on "holds" (39.29) unchanged. Keep thin faint rust ties (1 px, 40 percent) from each agent to its arc from 39.3 until 47 so the ring visibly belongs to the five specialists (C will make the insurer tie go dashed with its arc).
8. INSIDE THE CONDITIONS appears 39.45 just under the ring (world y about 590), sized for the 40.85 wide shot (stay 19 px or more there).
9. Route: the door opens at 40.26 in the tail of the camera move; W.route draws 40.85-41.4 in the still frame and its bead lands in the packing line window as the spark starts (41.35 to 41.45). Make the spark larger and brighter (paper-coloured light in the window is allowed; the window is a cut-out) and never rotate it into an X: animate scale and opacity only, rotation within plus or minus 10 degrees, up to 88.2.
10. Labels in s4: keep INSIDE THE CONDITIONS and RECORD KEPT; drop WORK CONTINUES (the route landing and the spark show it); keep NO ONE DISTURBED but place it so it does not subtitle the VO: show it 0.4 s after "disturbed" (44.4) and hold it to 46.3. Size all for the 1300-wide shot (19 px or more).
11. In the wide shot (40.85-46.9) fade the panel agent names to 40 percent (they are not being read) and back to 100 percent at 46.9 for the deviation shot; keep them 22 px in the 1044-wide shot.
12. Remove any detached thread fragments (undraw toward the agent).

### s5-deviation (builder C)

1. Camera is now still 48.1-52.75 at [530,510,1044] (the site window is in frame on the right). Deviate on "slips" (48.34) as before; make the insurer tie (from B's s4, if present) go dashed with its arc.
2. Replace the progress-bar meter with two plain rust lengths stacked like rulers (a solid 30-unit line under a dashed 60-unit line, no capsule, no track), with the two mono lines FIRE WATCH PLANNED: 30 MIN / POLICY ASKS: 60 MIN. Gap-edge ticks in rust-deep, never black.
3. The unengaged dashed barrier "NO HARD STOP CONFIGURED" now shows 50.3-52.6 with the spark in the same frame (the site is visible at the right); label grey, 19 px or more.
4. Assemble 52.1-52.7 in the still close-up (start on "Priora" 52.40 minus 0.3): fade the finding text before it scales below 60 percent; arcsG to 0.85; facets rotate so none sits in the gap; gap edges ticked rust-deep; DECISION PACKET label held still 0.8 s next to the packet at the door.
5. Camera pulls out 52.75-53.95 while Priora and the packet wait just outside the door. Escalate 53.95-55.5 in the still frame (power2.inOut, PK.trail with the same ease) to GEO.prioraDock / GEO.dock (the packet waits beside the risk owner on the side toward the rooms, clear of the figure by at least 30 world units).
6. On "the human decides" (55.72 to 56.4): the risk owner's black line (W.decision, 3.5 px) leaves the desk top right, reaches the packet, loops once round it and ends at W.decisionTip (the packet's right side), with a round end dot. RISK OWNER DECIDES (ink mono, 19 px or more) above-right of the owner. Hold everything still to 56.95 (the camera leaves at 56.95).
7. Exact 57.0 contract above.

### s6-rooms (builder D)

1. Start at 57.0 from the new contract (packet at GEO.dock, Priora at GEO.prioraDock, W.decision ends at W.decisionTip). The camera moves 56.95-57.95: start building on the camera's landing.
2. The rooms open from the human's line, never from agent threads: delete the three rust guide lines. On "Three decision rooms open" (57.70): the black trunk draws from W.decisionTip to GEO.branch (57.75-58.0), the three branches draw as fine dotted grey lines to the doors (58.0-58.3), and each chamber draws from its door as its branch arrives (shortened to about 0.45 s each); the Transfer chamber's SIMULATED chip appears with (never after) its walls, and its name after the chip. Room agents print 58.3-58.6. The whole picture is complete by 58.6 and holds still to 59.2. Add one grey mono "DESIGN PROPOSAL" tag at the top right of the overview above the rooms (58.6-59.2): the qualifier sits on Retain and Mitigate the first time they appear. W.ownerDecides fades at 57.9.
3. Priora carries the case. In every room Priora (with the packet, the same case, not a copy from off-screen) flies from the dock to just outside that room's door, in frame, and hands the packet in through the door when the door is open; the packet returns to Priora at the door afterwards. Priora itself never enters a room. Between rooms Priora travels outside the rooms with a trail. At the end of s6 Priora and the packet return to the dock (77.0-77.6) before the camera pull-out.
4. Retain (camera lands 60.2). On "Retain is never a default" (60.25-61.94): Priora with the packet arrives outside the Retain door (60.3-60.7); Priora nudges toward the closed door and is refused: the door leaves shudder visibly (about 2 world units, 3 cycles), Priora bounces back 14 units (back.out(1.4)) and stays clearly outside; "AN AGENT CANNOT CHOOSE IT" next to the door, 19 px, held 1.3 s (60.7-62.0). Then the silence beat in the VO pause (61.95-62.6): a dashed grey timer ring around the door runs out and the door stays shut, "SILENCE DOES NOT CHOOSE IT", held to 62.9. On "Risk" (62.60): the risk owner's black line runs up its branch into the frame and through the door (it carries a small ink mono tag "RISK OWNER" at its tip as it enters, fading after 0.8 s); the door opens for it; the line holds 0.3 s and withdraws to the branch point; only then Priora passes the packet in through the door (never crossing the black line). On "kept on purpose" / "terms explicit" (63.1-65.0): the Retain agents attach the terms as plain mono labels on short leaders, two on each side, at least 12 px clear of the clamp: EXPOSURE, AUTHORITY, CONDITIONS, EXPIRY (no boxes); the clamp is a simple rust bar bridging the gap. Hold the kept state to 65.6, then the packet comes back out to Priora at the door (65.6-65.95), the door closes.
5. Mitigate (camera 65.95-66.9). Priora with the packet arrives at the Mitigate door; the black line opens it (same signature, tag only if needed); Priora passes the packet in. Grey mono "SUGGESTIONS FROM A REVIEWED LIBRARY" and a grey "PREVIEW" tag. Rebuild the comparison as tactile objects, not a table: no COST/TIME row headers, no grid. Each safeguard is an object on the shelf carrying its own measures: a small stack of 1 to 3 rust-deep discs (cost, each at least 28 px on screen) sitting on the piece and a small grey clock arc beside it (time, at least 30 px), with its short name. Space the three pieces at least 40 px apart. On "compares safeguards" (67.41-68.6) the pieces are tried in the gap one at a time, 0.5 s each, as dashed previews: Thermal check fills about 60 percent: "PARTIAL: REST MOVES ON" and the open remainder sends a small dashed sliver toward the door; then (after the sliver has gone) Extend watch fills it fully, the ring closes with one 0.3 s pulse: "FULL"; then on "checks whether the work is back inside" (69.09-70.6) the verifier's corners land (tick 16 px inside the bracket): "BACK INSIDE". Move weld to workshop is shown with its heavier cost and longer time and also tried (full). Previews revert (pieces back to the shelf) by 71.1; the packet comes back out to Priora; door closes.
6. Transfer (camera 71.3-72.2). Same arrival and black-line opening. The SIMULATED chip at 20 px type in this close-up (cap its scale, 1.5 px outline), pulse on "simulated" (72.87); grey mono "NO INSURER ON PRIORA YET". The three dashed hexagons at full token size (about 34 world units, 1.75 px dashed rust, full opacity, small dashed aperture) with names CARRIER · SIM, CARRIER · SIM, CAPACITY · SIM. On "outside capacity" (74.66-75.7) one dashed thread from the packet's gap to each hexagon carries a dashed copy of the gap out through the ports. Answers start on "capacity" end (75.7): each hexagon sends back small hollow dashed rust beads along its thread that land clustered at the packet with plain mono labels ELIGIBILITY, TERMS, SAFEGUARDS, PRICE; the price bead is hollow and marked "?" (never a number, never a blank fill-in line, no boxes). All landed by 76.6 ("price" 76.55) and held still to 77.3. Neutral port ticks grey, not black. Then the packet comes back to Priora, the door closes and Priora + packet return to the dock by 77.6.
7. Packet arrivals ease out (power3.out, at most back.out(1.4)), never a slam.
8. End exactly in the 78.0 contract.

### s7-cooperate and s8-system (builder E)

1. Start from the new 78.0 contract (Priora at the dock with the packet, gap open). The camera lands 78.9: start moving on "carries" (79.07).
2. The same case moves between the rooms, visibly and at a readable size: scale the packet up about 1.4x for s7. Priora carries the whole packet to each door (in frame) and hands it in when the black line has opened the door; each visit holds at least 0.6 s after its label lands; labels arrive with the result, not after.
   - Mitigate (79.1-80.2): the black line opens Mitigate; the Thermal check piece slides off the shelf into the gap (solid), the gap visibly narrows: "MITIGATE PART".
   - Redirect (80.2-80.9): a rust thread runs from the Mitigate door and bends into the Transfer door (the chamber redirects); the remaining gap (a dashed sliver, clearly visible, at least 40 px) rides it; the black line opens Transfer; a hollow dashed PRICE "?" bead comes back from the hexagons: "WHAT WOULD IT COST?".
   - Retain (80.9-81.9): the sliver goes up to Retain (black line opens it), the clamp bar bridges it: "KEEP THE REST"; the sliver seats back in the packet.
   - Decision (on "risk owner stays in control", 81.38-82.9): the black line runs from the branch to the packet and closes a loop round it; one soft 0.3 s resolve pulse on the whole ring; "RISK OWNER DECIDES". Hold the decided state still to 83.1.
3. Use PK.trail for every journey; no packet over a chamber wall (stay 30 world units inside or outside a door).
4. s8 (camera 83.1-84.4 to the whole sheet). Fade every label not meant to be read at 1:1 (agent names in the panel, CONFIGURED FOR THIS SITE, room agent names) during the pull-out. In the still 1:1 frame: 84.4-85.0 Priora flies home to (960, 175); the decided case drops into the record as a clearly visible second tick (held 0.6 s); the Insurer conditions token returns upright; W.route retracts into the panel door (it must not start from an empty table).
5. Text, staggered, nothing new after the tagline's second line: "ONE PRIORA AGENT" 84.6, "A CONFIGURABLE SITE PANEL" 84.9, "THREE DECISION ROOMS" 85.2 with "DESIGN PROPOSAL" (ink 2, mono, 20 px) centred under it at 85.2; "FIRST  HOT WORK" 85.4 and the LATER row (dashed grey LIFTING, CONFINED SPACE, WORK AT HEIGHT) 85.7, ending inside the panel width. Remove the agents' dim-to-ghost flicker; instead, as the LATER row prints, one dashed ghost token slides from the LIFTING tab into an empty panel slot and back (85.7-86.3).
6. Tagline: line 1 "Priora turns physical work into explicit risk decisions" on "risk" (86.11), line 2 "while the work happens." on "while" (87.39), Plex Sans 34 px or more, centred under the system.
7. End: fade the world, the labels and the tabs 88.0-88.5; keep the tagline until 88.5, fade it 88.5-88.8; the wordmark fades in 88.75-89.1 alone on the paper and holds still to 90.0. Keep the SIMULATED chip a single chip (no hand-over swap during a camera move).
