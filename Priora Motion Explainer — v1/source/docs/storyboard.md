# Timed storyboard and build contract (v1)

All times are absolute film seconds (30 fps, 90.0 s exactly). Voiceover word times come from `narration/timing.json` (use `PK.word("L06", "route")` in code, never a hard number for anything that syncs with the voice). The camera is `assets/js/camera.js` and belongs to the director; sections read it (`PK.cam.px(t, 20)` gives the world size of 20 screen px at time t) and never move it.

Read `docs/design.md` first. It defines the palette, type, cast, motion grammar and the honesty rules.

## Voiceover (161 narrator words, Kokoro guide voices `bf_isabella` narrator, `bm_daniel` worker)

| id | start | end | text |
| --- | --- | --- | --- |
| L01 | 0.90 | 4.71 | Real work in the middle: a worker, a site, a risk owner. |
| L02 | 5.45 | 7.51 | Priora places agents around them. |
| W01 | 8.55 | 13.85 | (worker, voice note) Hey, the bracket by the packing line has cracked again. We're going to weld it before the night shift. |
| L03 | 14.80 | 20.27 | Priora hears a repair, hot work, a place and a deadline. Then it asks for a photo. |
| L04 | 22.60 | 26.02 | Next, it summons only the specialists this site and job need. |
| L05 | 31.20 | 33.91 | Each checks its own conditions and reports back. |
| L06 | 38.60 | 44.69 | When everything holds, the route opens. Work goes on, the record is kept, no one is disturbed. |
| L07 | 47.30 | 51.89 | Then one condition slips. The fire watch is half what the policy asks. |
| L08 | 52.40 | 56.92 | Priora brings it to the risk owner. Agents prepare; the human decides. |
| L09 | 57.35 | 59.02 | Three decision rooms open. |
| L10 | 59.45 | 65.74 | Retain is never a default. Risk is kept on purpose, with exposure and authority explicit. |
| L11 | 66.40 | 70.62 | Mitigate compares safeguards, and checks whether the work is back inside. |
| L12 | 72.20 | 77.05 | Transfer, simulated for now, asks outside capacity for terms and a price. |
| L13 | 78.50 | 83.22 | Priora carries the case between rooms. The risk owner stays in control. |
| L14 | 84.40 | 89.03 | Priora turns physical work into explicit risk decisions, while the work happens. |

## Camera (from camera.js; [cx, cy, w], height = w x 9/16)

| time | shot | rect |
| --- | --- | --- |
| 0.0 to 7.7 | the real world, slow push | [960,652,900] to [960,646,862] |
| 7.7 to 9.3, drift to 21.6 | voice note and case | [945,562,930] to [950,558,905] |
| 21.7 to 23.6, drift to 29.3 | the panel and Priora at its door | [560,500,1060] to [548,505,1020] |
| 29.3 to 30.8, drift to 40.3 | the table | [425,512,860] to [420,514,846] |
| 40.3 to 42.2, drift to 46.8 | panel, route and the real world | [700,560,1300] to [706,562,1282] |
| 46.9 to 48.2, drift to 52.2 | the table again (deviation) | [430,520,900] to [432,520,884] |
| 52.2 to 54.4, drift to 55.8 | escalation to the risk owner | [920,560,1340] to [926,560,1322] |
| 55.8 to 57.6, drift to 59.2 | risk owner and the three rooms | [1420,510,1060] to [1422,510,1048] |
| 59.2 to 60.4, drift to 65.8 | Retain | [1530,330,640] to [1532,330,624] |
| 65.8 to 66.8, drift to 71.6 | Mitigate | [1530,508,640] to [1532,508,624] |
| 71.6 to 72.6, drift to 77.2 | Transfer | [1530,686,640] to [1532,686,624] |
| 77.2 to 78.8, drift to 82.8 | rooms and risk owner together | [1360,510,1180] to [1364,510,1162] |
| 82.8 to 84.6, then static | the complete system, 1:1 | [960,540,1920] |

## Section by section

### s1-world, 0 to 8 (built)
Ground draws from the middle (0.3). The site prints on "middle" (1.75), the worker on "worker" (2.6), the risk owner on "risk" (3.9); mono names under each. Statement "Real work in the middle." (0.95). "Agents around it." in rust (6.3) as a rust orbit draws around the real world and six small agent tokens ride it. 7.25 the statement and orbit fade; the Priora token leaves the orbit, grows to full size and flies to its listening point (1250, 380), arriving 9.4.

### s2-case, 8 to 22 (built)
The worker's voice note: an ink line from the head, a waveform of ink bars drawn from the real audio envelope, the words appearing as spoken (ink, Plex Sans, 30 px). "Priora agent" label (9.45 to 12.7). Priora's bead turns to the speech. Rust underlines land under what Priora hears: "packing line", "bracket ... cracked", "weld", "before the night shift". 14.05 the other words grey and fall away. A rust ring with a black core draws at (1000, 410) (14.55). On each narrated word ("repair", "hot work", "place", "deadline") the phrase flies into the ring and becomes a facet on a spoke with a mono label (REPAIR, HOT WORK, PACKING LINE, BEFORE NIGHT SHIFT). A thread rises from the site building and brings SITE + INSURANCE CONDITIONS. The PHOTO facet appears dashed and empty, "PHOTO ?". On "Then it asks for a photo" Priora's bead turns to the worker, a dashed request thread runs from Priora past the empty facet to the worker, "PHOTO OF THE BRACKET?" appears beside the worker; the worker sends a small ink picture up the thread; the facet fills (about 20.5). 21.0 labels go, the facets fold onto the ring, "CASE" appears under it; Priora moves to (1150, 400) facing the case.

**Contract at 22.0**: Priora `W.priora.g` at (1150, 400), body scale 1, beadG rotation 180, orbit and bead visible, label hidden. Case `W.caseT.g` at (1000, 410), opacity 1, all six facets folded (chipG x = R = 22) and visible, photo mark visible. `W.caseLabel` (mono "Case", at (1000, 452)) visible. All s2 transient elements gone.

### s3-panel, 22 to 38 (builder B)
- 22.0 to 23.5: Priora docks the case at its side and both travel to the panel door's outside (Priora to (700, 470), the case riding with it), with a trail. `W.caseLabel` fades (22.2).
- On L04 ("Next, it summons", 22.6): the panel chamber draws (walls 22.6 to 23.6, door leaves and jambs appear closed), "Site panel" and "CONFIGURED FOR THIS SITE" (23.4).
- 23.7 to 24.3: the eight slot circles appear (dashed). Inside several of them faint dashed ghost outlines of other possible specialists show with small grey names (for example "Lifting", "Confined space", "Electrical"), then fade, leaving those slots empty: the panel is configured per site and job; it is not a permanent cast.
- Summon and enter, one every 0.9 s from about 24.3: Site rules (slot 225), Insurer conditions (270), Fire (315), Risk engineering (135), Evidence (90). For each: the door opens (keep it open through the summons), Priora's bead turns, a thread draws from the bead through the door to the slot, the token travels in along it and settles, its name appears. Unused slots stay dashed and empty.
- About 29.0 to 29.8: the case goes in through the door to the table centre (380, 520) and its facets unfold as marks (no labels). Priora stays outside the door: it conducts, it is not on the panel. Door closes about 30.0.
- 29.8 to 31.2 distribute: from Priora a pulse into the case, then threads fan out from the case to each agent carrying the relevant facet (Fire gets HOT WORK; Site rules gets PACKING LINE and CONDITIONS; Insurer conditions gets HOT WORK and CONDITIONS; Risk engineering gets PACKING LINE; Evidence gets PHOTO).
- On L05 ("Each checks", 31.2) inspect, staggered: Site rules draws a straight ruled line with end ticks; Insurer conditions opens and closes its brackets around a copy of HOT WORK; Fire shows its three dots and pings two arcs; Risk engineering turns 45 degrees and draws a dashed exposure radius around the place facet; Evidence's corners contract onto the photo facet and a small tick appears.
- 32.6 to 33.6 focused signals: one short thread between Fire and Insurer conditions with a bead going across and back, a tiny mono label "FIRE WATCH" on it; one between Evidence and Site rules.
- On "reports back" (about 33.0 to 35.6): each agent returns a small rust tick-bead out through the door to Priora; five small marks gather on Priora's orbit. Hold, nothing else moving, to 37.8.

### s4-inside, 38 to 47 (builder B)
- 38.0 to 38.6: the five marks on Priora are absorbed (Priora reconciled them).
- 38.4 to 39.6 align: the five agents slide along the slot ring (motion along the arc, not a chord) to even spacing (GEO.agents[*].aligned: insurer 270, fire 342, evidence 54, risk engineering 126, site rules 198). Each extends one rust arc (radius `GEO.alignR` = 40 around the case, its own 72 degree sector less a small gap); on "holds" (39.29) the gaps close and the ring locks with one pulse. All slot circles fade.
- 39.5: "INSIDE THE CONDITIONS" (mono rust) below the table.
- On "route opens" (40.26): the panel door opens and `W.route` draws from the case through the door down to the packing line in the site, a bead running along it. The camera pulls out to show the real world.
- On "Work goes on" (41.35): the small ink spark in the site window starts to flicker (welding) and keeps flickering until 88.2 (deterministic keyframes, built by B for the whole film). "WORK CONTINUES" (mono, ink 2) near the site.
- On "record is kept" (42.3): `W.record.spine` draws under the ground; one tick lands at its left end; "RECORD KEPT".
- On "no one is disturbed" (43.3): "NO ONE DISTURBED" near the risk owner, who does not change.
- 45.6 to 46.3: the four status labels fade.

**Contract at 47.0 (B to C)**: Priora at (700, 470), scale 1, beadG rotation 180, five marks gone. Case at (380, 520), facets folded or unfolded as marks (B decides, documents it), `W.caseLabel` hidden. `W.align = { arcs: { siteRules, insurer, fire, riskEng, evidence } }`: five arc paths inside `W.caseT.arcsG`, radius 40 (local), fully drawn, opacity 1, closed ring. Agents at their aligned angles on the slot ring, opacity 1, names visible, body rotation 0. Panel drawn, title and sub visible, door open, all slot circles hidden. `W.route` fully drawn. Spark flickering. `W.record.spine` drawn with one tick in `W.record.ticks`. No status labels. Rooms and `W.decision` hidden.

### s5-deviation, 47 to 57 (builder C)
- On "slips" (48.34) deviate: the Insurer conditions arc rotates about 9 degrees out of line, drifts outward and turns dashed; the Insurer conditions token tilts 12 degrees and slides 8 units outward. The ring now has a gap at the top.
- 49.3 to 51.9 ("The fire watch is half what the policy asks"): beside the gap, two mono lines in rust: "FIRE WATCH PLANNED: 30 MIN" / "POLICY ASKS: 60 MIN". Fire pings once toward Insurer conditions.
- About 50.3: on the route just outside the door, a dashed ink barrier outline appears, unengaged, with grey mono "NO HARD STOP CONFIGURED"; the spark keeps flickering; the route stays drawn. Fades by 53.5.
- On "Priora brings it" (52.4) assemble: the case and its arcs contract into one compact packet: arcsG scales to 0.75, the insurer arc disappears so the packet shows a clean gap at the top, facets fold, the finding text collapses into the gap. The packet moves out through the door to Priora; "DECISION PACKET" (mono) beside Priora, gone by 55.0.
- On "to the risk owner" (53.36) escalate: Priora carries the packet along a curved path with a trail to the risk owner, arriving about 54.5: Priora at (1060, 600), the packet docked at (1098, 662) in front of the desk.
- "Agents prepare" (54.78): the packet settles; nothing is stopped, the route and spark stay.
- On "the human decides" (55.72): the risk owner's black decision line reaches out of the desk: `W.decision` d = "M1174 710 H1226", drawn. "RISK OWNER DECIDES" (mono, ink) near the risk owner.

**Contract at 57.0 (C to D)**: Priora at (1060, 600), scale 1, beadG rotation 60. Packet = `W.caseT.g` at (1098, 662), body scale 1, `W.caseT.arcsG` scale 0.75, insurer arc opacity 0, the other four arcs opacity 1 and solid, facets folded, no finding text. `W.gap = { a0: 234, a1: 306, r: 40 }` (local arc coordinates inside arcsG). `W.decision` d "M1174 710 H1226" drawn, opacity 1. `W.ownerDecides` label visible (D fades it). Panel as at 47 except: the Insurer conditions token tilted 12 degrees and 8 units outward, its name still visible. No barrier, no other labels. Rooms hidden.

### s6-rooms, 57 to 78 (builder D)
- On "Three decision rooms open" (57.35): three faint rust guide lines run from the packet's gap toward the three doors, then the three chambers draw (57.4, 57.75, 58.1) with names Retain, Mitigate, Transfer; Transfer's walls are dashed and its "SIMULATED" chip appears. The risk owner's black line extends to a branch point, and three dashed black branches run to the three doors: the doors are the risk owner's to open. Room agents print in, quiet: Retain: Policy, Authority, Record (`PK.glyph.roomAgent` policy, authority, record) with small names; Mitigate: two risk engineering diamonds, a short "reviewed library" shelf holding three safeguard pieces; Transfer: three dashed carrier hexagons near the right wall, dashed ports in that wall leading outside. `W.ownerDecides` fades 57.4.
- Retain, 59.2 to 65.8 (L10). "Retain is never a default": a Retain agent pushes the closed door from inside: it shudders and stays shut (`chamber.reject`), "AN AGENT CANNOT CHOOSE IT"; then a dashed timer ring runs out around the door and the door still stays shut: "SILENCE DOES NOT CHOOSE IT". Then the black line runs along its branch into the door, which opens for it alone. Priora sends a copy of the packet in along a thread. On "kept on purpose" the three agents attach four small rust tags around the gap: EXPOSURE (on "exposure"), AUTHORITY (on "authority"), CONDITIONS, EXPIRY; a rust clamp spans the gap: the gap is kept, on purpose, with its terms on it. The black line withdraws to the branch point; the door closes (65.5).
- Mitigate, 65.8 to 71.6 (L11). The black line opens the Mitigate door. Grey mono "SUGGESTIONS FROM A REVIEWED LIBRARY" under the shelf. Compare: three safeguard pieces slide onto a rail, each with a short name ("Extend watch to 60 min", "Thermal check", "Move weld to workshop") and two tactile measures: cost as one to three small ink coins, time as a small arc; the reduction is shown by trying the piece in the gap. Thermal check: a dashed copy fills about half the gap: "PARTIAL: REST MOVES ON". Extend watch: fills it fully, the ring closes: "FULL". On "checks whether the work is back inside" a verifier's corners land on the closed ring, a tick: "BACK INSIDE". These are previews: the pieces return to the rail and the gap is open again by 71.4. Door closes.
- Transfer, 71.6 to 77.4 (L12). The black line opens the Transfer door. On "simulated for now" the SIMULATED chip pulses and grey mono "NO INSURER ON PRIORA YET" appears. On "outside capacity" dashed threads carry a dashed copy of the gap to the three dashed hexagons labelled "CARRIER · SIM", "CARRIER · SIM", "CAPACITY · SIM"; on "terms and a price" each returns four small tags: ELIGIBILITY, TERMS, SAFEGUARDS, PRICE, every value an empty line, no numbers. Door closes (77.2); the room's labels fade by 77.8.
- 76.8 to 78.0: Priora collects the packet back to (1200, 480).

**Contract at 78.0 (D to E)**: Priora at (1200, 480), beadG rotation 0. Packet `W.caseT.g` at (1200, 528), arcsG scale 0.75, insurer arc hidden: the gap open. All three rooms drawn, doors closed, names visible, SIMULATED chip visible. `W.roomAgents = { retain: [3 tokens], mitigate: [2 tokens], transfer: [3 tokens] }` visible and still. `W.safeguards = { watch, thermal, workshop }` on the Mitigate rail, each `{ g, piece }` where piece is the gap-filling arc shape. `W.decision` d from the hand to the branch point, drawn; `W.branches = { retain, mitigate, transfer }` dashed black paths drawn. No transient labels.

### s7-cooperate, 78 to 84 (builder E)
The same case moves between the rooms; the human stays in control.
- 78.3: the black line opens Mitigate; Priora carries the packet in; the thermal check piece fills part of the gap (the gap narrows to about 40 percent): "MITIGATE PART".
- 79.4: the remaining gap, a small dashed rust sliver, detaches; Priora carries it to Transfer (the black line opens that door); the dashed hexagons return a PRICE tag with an empty value: "WHAT WOULD IT COST?".
- 80.5: Priora carries the sliver to Retain (the black line opens it); the Retain agents clamp it with its terms: "KEEP THE REST".
- On "The risk owner stays in control" (81.14): the black line draws decisively to the packet and closes a small loop around it: "RISK OWNER DECIDES". The packet is whole again (part mitigated, rest kept on purpose).
- 82.6 to 83.2: labels fade, doors close; the camera pulls out to the whole sheet (82.8 to 84.6).

### s8-system, 84 to 90 (builder E)
- 83.2 to 85.0: Priora flies home to (960, 175); the decided case drops into the record as a second tick; the Insurer conditions token returns upright to its aligned place; the decision line rests.
- 84.7, 85.1, 85.5: three mono labels, 18 px or more: "ONE PRIORA AGENT" above Priora, "A CONFIGURABLE SITE PANEL" above the panel, "THREE DECISION ROOMS" above the rooms.
- 85.4 to 86.6: under the panel a row of tabs: "HOT WORK" (solid, "FIRST") and dashed grey "LIFTING", "CONFINED SPACE", "WORK AT HEIGHT" with "LATER"; the panel's agents briefly dim to ghost outlines and back, as if the panel could be configured for them.
- 85.9: "DESIGN PROPOSAL" small grey mono, bottom left.
- 85.8 to 88.3: the tagline, centred under the system, Plex Sans 400 about 34 px, two lines, no dash: "Priora turns physical work into explicit risk decisions" / "while the work happens."
- 88.2 to 88.7: the world, the labels and the tagline fade to paper. 88.4 to 89.0: the Priora wordmark (`assets/brand/priora-wordmark.svg`, ink, about 440 px wide) fades in at the centre, still. Hold to 90.0.
