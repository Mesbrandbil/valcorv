# Priora motion film: plan

Step 1 of the production brief, kept up to date. Status: **the length is settled, Step 2 (static world) is built, and Step 3 (animation, sequence by sequence) is under way. This file matches what is built.**

## 0. Where it stands

| | |
|---|---|
| **Length** | **2883 frames, 96.1 seconds** (F0000–F2882) |
| Rules | every motion, text and composition rule in the brief, unchanged. The planning checker verified the timing and text rules sequence by sequence; Step 3's checker adds the composition rules and checks across the whole film (section 10.2) |
| Sequences 1–5 | the storyboard's beats at their tightest rule-clean length: 1691 frames (the storyboard had 1710) |
| Sequence 6 | 660 frames (Retain 239, Mitigate 224, Transfer 197) |
| Sequence 7 | 179 frames |
| Sequence 8 | 353 frames, including 45 frames to breathe |

Your decisions, all written into the storyboard and this plan:

1. Narration, Sequence 2: "Priora hears the job, and asks for a photo." The worker's phone message stays as written and is timed at 2.7 words per second; all narration is timed at 2.3.
2. Narration, Sequence 5: "One condition slips: the fire watch is half the policy. Priora brings it to the risk owner. Agents prepare, the human decides."
3. Retain: "NO ANSWER DOES NOT CHOOSE IT" and its clock arc are cut.
4. Mitigate: "SUGGESTIONS FROM A REVIEWED LIBRARY" is cut. PARTIAL, FULL and BACK INSIDE stay.
5. Sequence 7: the human line is drawn once, at the final close. "WHAT WOULD IT COST?" and the Transfer doorway stop are cut; the dashed Transfer answers travel with the packet and stay dashed, off to one side. Priora brings the packet *to* the Mitigate and Retain doorways and does not cross, so the brief's rule (the black line reaches each threshold before Priora crosses it) stays true. RISK OWNER DECIDES appears as the line closes, with the marks turning solid and the pulse under it.
6. Sequence 8: the four system labels become one restrained line, "A DESIGN PROPOSAL". The scope line and the approaching dashed glyph are cut. The sequence keeps its 45 frames of air: a half second of near silence after the voice, the dissolve, then a full second of "Priora" alone.
7. Sequences 1 to 5 are trimmed to their rule-clean length (the spare frames were at their ends).
8. The film is not forced to 2700 frames, no rule was loosened, and the length is settled: no more timing passes.
9. R · M · T is cut: the full room names are enough.
10. The Transfer agents are labelled CARRIER, CAPACITY and BROKER. No company names; all three stay dashed.
11. The closing "Priora" is the Priora wordmark: IBM Plex Sans SemiBold, tracking minus 15/1000 em, ink #111111. The film's ink token is #111111 and its paper #F5F3EE (the brief had #151515 and #F3EEE3).
12. `renders/` is ignored by git and no video goes into the repo. The H.264 film and the subtitled version are sent in the chat; ProRes is skipped for now.
13. The three-line voice note stays. Step 3 goes ahead without waiting for a review of the stills; wherever something does not fit, the option that keeps the most empty paper wins, and each such call is reported at the end.

One consequence to note: the brief names F1410 as the frame where the gap opens, which was the first frame of Sequence 5 in the original storyboard. With Sequences 1 to 5 trimmed, Sequence 5 now starts at F1392, so the gap opens at F1392. The rule's meaning (the gap opens as Sequence 5 begins and stays visible until the decision) is unchanged.

Section 12's four questions are answered (decisions 9 to 12).

**Step 2, what changed from the Step 1 numbers.** The stills showed collisions the Step 1 coordinates could not avoid: the rulers' first label did not fit inside the table under the case, the long left agent names touched the table band, and in centred Retain and Mitigate close-ups part of Transfer showed without its SIMULATED label. So the table grew to radius 330 with the seats at 390, shots were reframed (S2_VOICE, S3_PANEL, S3_TABLE, S6_RETAIN, S6_MITIGATE and S6_TRANSFER, with small shifts of S4_CASE, S5_GAP and the two wide room shots), and labels moved onto clean paper. The voice note now sits in three lines, so the camera can stay close on the worker and Priora can hover just above and to its right. No camera move changed its frames. Sections 4 to 6 hold the built values, and section 7.1 lists what Step 3 corrects inside the settled frames.

Sources, in order of authority:

1. `Priora storyboard.md`: story, timing, copy and meaning. Saved from the file you sent, with your decisions above written into it.
2. `Production brief.md`: how to build it (your prompt, saved verbatim so the rules travel with the project).
3. This plan: how the two are reconciled, with every conflict flagged rather than silently resolved.

Conventions used below:

- **World units.** The world is one SVG sheet, 5760 × 3240 units, origin top left, y down. At camera zoom 1.0 one unit is one screen pixel at 1080p.
- **On screen size** = world size × zoom. Every text size in this plan is checked on screen, not in the world.
- **Angles** are degrees clockwise from +x (y down): 270 is 12 o'clock, 0 is 3 o'clock, 90 is 6 o'clock, 180 is 9 o'clock.
- **Frames** are absolute film frames, F0000 to F2882, 30 fps.
- Every coordinate here is a starting value. Step 2 (static world stills) tunes proportions and spacing; this file is updated to match what is built.

---

## 1. Render check (done)

Tested in this container with a throwaway composition (outside the repo):

| Check | Result |
|---|---|
| Remotion | 4.0.534 (latest stable), React 19, TypeScript |
| Still frame, 1920 × 1080 | renders, IBM Plex Sans and Mono correct, `feTurbulence` grain correct |
| H.264, CRF 16 | renders, 30 fps, exact frame count |
| ProRes 422 HQ | renders, `yuv422p10le` |
| Speed | 45 frames in about 8 s including bundling; a full pass should take minutes |
| Browser | the pre-installed Chromium headless shell (`--browser-executable`) |

**One deviation: fonts.** `@remotion/google-fonts` cannot load here. Remotion launches Chrome with the proxy disabled, so the font files fail certificate checks, and the only switch that gets past it disables TLS verification, which I will not do. The fix: the same IBM Plex Sans (variable, latin) and IBM Plex Mono 500 (latin) files are fetched once from Google Fonts and kept in `public/fonts`, loaded with `@remotion/fonts` and held with `delayRender` until they are ready. Identical glyphs, and renders no longer depend on the network. On your Mac either route works; the local files are the more reproducible one.

---

## 2. Architecture

One composition, `priora-film`, 1920 × 1080, 30 fps, 2883 frames (the length comes from `timeline.ts`, never typed twice), plus `priora-film-review` (the same film with narration subtitles burned in). Composition IDs use hyphens because Remotion does not allow spaces in them.

```
priora-motion-film/
  Priora storyboard.md     Production brief.md     plan.md
  narration.srt            sound cues.md
  public/fonts/            public/textures/paper-grain.png (generated)
  public/audio/            empty slot: narration and sound drop in here
  src/index.ts             src/Root.tsx (compositions)
  src/lib/
    tokens.ts              colours, stroke weights, dash pattern, easing curves
    timeline.ts            every frame range, as named constants (SEQ1 … SEQ8, every beat, FILM_FRAMES)
    layout.ts              every world coordinate and every path, defined once
    narration.ts           narration lines with start frames and per-word frames (feeds the SRT)
    motion.ts              ease, arrive, draw-on, hold helpers; no spring, no overshoot
    text.ts                Label and Sentence: on screen size checks, line breaks, 6 px rise
    texture.ts             ink texture filters (fixed seed per shape)
  src/camera/
    shots.ts               named camera shots (x, y, zoom)
    camera-keys.ts         the only camera keyframe list in the film
    Camera.tsx             one transform for the whole world; exposes zoom to the cast
  src/world/
    World.tsx              the single SVG world, rendered once per frame
    Paper.tsx              paper grain, world space, static
    RealWorld.tsx  SitePanel.tsx  DecisionRooms.tsx  RecordLine.tsx  Paths.tsx
  src/cast/
    Priora.tsx  SiteRules.tsx  InsurerConditions.tsx  Fire.tsx  RiskEngineering.tsx
    EvidenceCheck.tsx  GhostAgent.tsx  TransferAgent.tsx  RoomAgent.tsx  Safeguard.tsx
    Case.tsx  Worker.tsx  Site.tsx  RiskOwner.tsx  HumanLine.tsx  Thread.tsx  Spark.tsx
  src/sequences/
    s1-real-work.ts … s8-whole-system.ts
                           choreography only: each maps the frame to cast state.
                           No sequence renders its own scene; World renders everything.
  scripts/
    qa.ts                  timeline lint (section 10), grown from the planning checker
    stills.ts              renders named stills into stills/sequence N
    contact-sheet.ts       tiles stills for review
    paper-grain.ts         generates the grain texture once, fixed seed
  stills/sequence 1 … stills/sequence 8, stills/world, stills/cast
  renders/
```

Key decisions:

- **One world, one camera.** `World.tsx` renders every territory at its fixed coordinate in every frame. `Camera.tsx` applies one `translate · scale` transform. There are no cuts and no per-sequence scenes; `src/sequences` only computes state.
- **Cast as stateful components.** Each recurring object is one component with state props (position, rotation, open or closed, dashed or solid, opacity, bead angle and so on). The case is one `Case` component from its first circle in Sequence 2 to its record mark in Sequence 8.
- **Timeline and layout are the only sources of numbers.** Components never contain frame numbers or coordinates.
- **Screen-constant line weights.** Agent threads 2 px and the human line 5 px on screen at every zoom (world width = px ÷ zoom). The dash pattern is one token, 10 px on and 7 px off on screen, so it reads the same everywhere.
- **Readable labels.** Persistent labels that must survive big zoom changes (room names, SIMULATED, statuses, RISK OWNER DECIDES) use a damped size: world size ∝ zoom^-0.8, so they grow a little as the camera approaches and never fall under 22 px. Transient labels use plain world size and are only shown while the camera is still.
- **Texture.** Paper grain is generated once with `feTurbulence` (fixed seed), saved as a tile and laid in world space, so it stays with the sheet and never changes. Ink texture is an SVG `feTurbulence` mask per coloured shape, fixed seed per shape, in that shape's own coordinates, so it moves with the shape and never boils. No film grain, no animated noise.
- **Audio slot.** Both compositions take optional `narration` and `sound` props; when a file is present in `public/audio` an `<Audio>` track plays it. With nothing there, the film renders silent.
- **Review subtitles.** The review composition draws the SRT lines in screen space, small, near the bottom edge.

---

## 3. Design tokens

As in the brief except where the director changed them: Paper #F5F3EE (brief: #F3EEE3), Ink #111111 (brief: #151515), Cobalt #2443B5, Coral #D9785F, Stone #C8C0B0, Cream #E9E2D2, Grey text #8C877D. One extra value: the welding spark is white #FFFFFF, as the storyboard asks.

Easing: default `cubic-bezier(0.45, 0, 0.15, 1)`; arrivals `cubic-bezier(0.2, 0.7, 0.2, 1)`; nothing else, no springs.

---

## 4. World layout

Every value below is what `src/lib/layout.ts` and `src/camera/shots.ts` hold after Step 2. Those two files are the source; this section mirrors them.

### 4.1 Territories

| Territory | Extent (world units) |
|---|---|
| Site panel (left) | circle centre (1300, 1500), wall radius 600, title above to about y 790 |
| Real world (lower centre) | x 2260 to 3500, y 2096 (service block top) to 2352 (labels) |
| Record line (under the real world) | y 2440, x 2260 to 3500 |
| Decision rooms (right) | clover round a forecourt at (4440, 1560); rooms x 3686 to 5194, y 985 to 2380; Transfer's simulated agents outside its wall to x 5292; labels above Retain and Transfer to about y 770, Mitigate's to its right |
| Margins | at least 380 units of empty paper to every sheet edge |

The full sheet view (Sequence 8) frames x 386 to 5575, so the sheet edge is never in frame.

### 4.2 Real world

| Name | Value |
|---|---|
| GROUND | y 2300, drawn from x 2260 to 3500 |
| WORKER | feet (2480, 2300), height 156 (hard hat top y 2143); phone at rest (2510, 2224), raised (2526, 2168) |
| SITE | base centre (2880, 2300); hall x 2710 to 3070, roof y 2186 with chamfered corners; one taller service block x 2730 to 2812, top y 2096; no chimney |
| SITE_WINDOW | centre (2990, 2236), 32 × 20, a fine paper frame round a deep interior |
| SPARK | inside the window, white |
| SITE_ROOF_EMIT | (2890, 2186), where the conditions line leaves the factory |
| RISK_OWNER | base centre (3300, 2300); desk top y 2232, x 3226 to 3386; head centre (3316, 2152) |
| DESK_ORIGIN | (3386, 2232), desk top right corner. The human decision line always starts here, and the escalation route ends here |
| PACKET_DOCK | (3480, 2100), where the packet stops beside the risk owner (on the escalation route) |
| Labels WORKER, SITE, RISK OWNER | baselines y 2352, centred at x 2480, 2890, 3300; mono 24 |
| RECORD_LINE | y 2440, x 2260 to 3500 |
| RECORD_MARK_1 | x 2990 (under the window), 24 tall, Sequence 4 |
| RECORD_MARK_2 | x 3300 (under the risk owner), 24 tall, Sequence 8 |
| RECORD KEPT | centred (2990, 2494) |
| NO ONE DISTURBED | left aligned at (3420, 2166) |
| RISK OWNER DECIDES | left aligned at (3590, 2306), right of the desk and below the desk path, readable sizing |

### 4.3 Sequence 1 overlay

| Name | Value |
|---|---|
| SENTENCE_1 "Real work in the middle." | centred (2880, 1764) baseline, Plex Sans SemiBold 52 |
| SENTENCE_2 "Agents around it." | centred (2880, 1840) baseline, cobalt, 52 |
| PRIORA_S1 | (2880, 1950) |
| ORBIT_S1 ellipse | centre (2880, 2232), rx 780, ry 282 |
| Specialist stations on the ellipse | 62°, 128°, 180°, 232°, 298° measured from the top, clockwise |

### 4.4 Voice note and case assembly (Sequence 2)

| Name | Value |
|---|---|
| VOICE_TEXT | left edge x 2640; baselines 1900, 1936, 1972; Plex Sans Medium 24.5 (44 px at zoom 1.8) |
| Line breaks | "Hey, the bracket by the packing line" / "has cracked again. We’re going to" / "weld it before the night shift." (401, 375 and 324 units wide). Three lines rather than two keep the close framing on the worker and leave room for Priora on the worker's side |
| VOICE_WAVE | baseline y 2046, grows from x 2556 to 3060, amplitude up to 15; clear of the service block top (2096) |
| VOICE_STEM | a fine ink stem from the raised phone up to the start of the waveform |
| PRIORA_LISTEN | (2560, 1960): just above and to the right of the worker, so the end of Sequence 1 is a glide towards the worker. The dotted listening thread runs from the bead down to the growing tip of the waveform and passes beneath every word |
| CASE_A | (2890, 1750), directly above the factory roof, so the conditions line rises straight into the bottom facet |
| PRIORA_CASE | (2610, 1880), left of the case; "Photo of the bracket?" ends at (2540, 1890) |
| PHOTO | the photo card settles at (2690, 2020), scale 0.8, before it shrinks into its facet |

### 4.5 The case (local coordinates, never rotates)

| Part | Value |
|---|---|
| Core | ink dot, radius 9: the actual job |
| Thin ring | cobalt, radius 34, 2.5 wide |
| Facets | open radius 92, folded radius 52, tucked radius 46 (packet). In Sequence 2 the open chips carry mark and label; at the table (Sequence 3) the open chips show their marks only, the labels having faded at F0650 |
| Facet angles | REPAIR 270, BEFORE NIGHT SHIFT 330, HOT WORK 30, SITE + INSURANCE CONDITIONS 90 (its label sits to the right of the chip), PHOTO 150, PACKING LINE 210 |
| Findings ring | radius 70 when assembled, 58 in the packet; band 9 wide; a hairline joint (0.7° each side) between arcs so the five findings read as five pieces |
| Arcs | Insurer conditions 66 to 114 (48°, the future gap); Evidence check 114 to 192; Risk engineering 192 to 270; Site rules 270 to 348; Fire 348 to 66 |
| The gap | centred at 90° (6 o'clock), 48° wide; coral caps at 66° and 114° |
| Scale | 1.0 in Sequence 2, 1.15 at the table (Sequences 3 to 5, CASE_TABLE_SCALE), back to 1.0 as it folds into the packet |

### 4.6 Site panel

| Name | Value |
|---|---|
| PANEL_CENTRE P | (1300, 1500) |
| Wall | circle radius 600, stone, 3 wide; entrance gap centred at 0°, ±14° |
| PANEL_ENTRANCE | (1900, 1500) |
| Table | open ring, pale cream band 14 wide at radius 330, with two fine stone edges; the inside (radius 323) is clean paper |
| Seats | 8 stone rings, radius 42, at radius 390 from P, at 22.5° + 45°·k |
| s0 22.5° (1660, 1649) | Fire |
| s1 67.5° (1449, 1860) | Insurer conditions |
| s2 112.5° (1151, 1860) | ghost: Electrical |
| s3 157.5° (940, 1649) | Evidence check |
| s4 202.5° (940, 1351) | Risk engineering |
| s5 247.5° (1151, 1140) | ghost: Structural |
| s6 292.5° (1449, 1140) | Site rules |
| s7 337.5° (1660, 1351) | ghost: Security |
| Agent names | Plex Sans Medium, readable sizing 24 px base; below the bottom seats, above the top seats, to the right of the right seats. The two left seats' names shift 50 units outwards, so the long names clear both the table band and the wall |
| "Site panel" | centred (1300, 822) baseline, Plex Sans SemiBold 46 |
| "CONFIGURED FOR THIS SITE" | centred (1300, 868) baseline, mono 32 (23 px at zoom 0.72) |
| PRIORA_PANEL | (2010, 1470), outside the entrance; Priora conducts, it is never seated |
| CASE_WAIT | (2150, 1560), where the case waits outside before Priora brings it in |
| FIRE WATCH? | at rest left aligned at (1560, 1770), between Fire and Insurer conditions, clear of the band and the wall |
| Fire watch rulers (Sequence 5) | inside the table under the case: common origin x 1072; FIRE WATCH PLANNED: 30 MIN baseline 1632, solid ruler 150 long at y 1648; POLICY ASKS: 60 MIN baseline 1688, dashed ruler 300 long at y 1704; mono 26.8 (22 px at zoom 0.82), coral |
| Barrier (Sequence 5) | an incomplete dashed grey post and half bar across the route at (2070, 1500); NO HARD STOP CONFIGURED left aligned at (2050, 1420), above the route |
| PRIORA_PAUSE | (2370, 1770), beside the work route, clear of it by 150 units |

Why the panel grew in Step 2: with the table at radius 300, the rulers' first label (472 units wide at the 22 px floor) could not sit inside the table under the case, and the long left names touched the table band. A table of 330 and seats at 390 fix both without changing the wall or any camera move.

### 4.7 Decision rooms

| Name | Value |
|---|---|
| FORECOURT F | (4440, 1560), stone ring radius 110 |
| Rooms | radius 330 (outer), broad flat band 28 wide, paper inside, opening of 44° facing F |
| RETAIN | centre (4016, 1315), F + 490 at 210°; coral band |
| MITIGATE | centre (4440, 2050), F + 490 at 90°; cobalt band |
| TRANSFER | centre (4864, 1315), F + 490 at 330°; stone band with a dashed cobalt perimeter and three small openings beside its agents |
| Thresholds (opening mid points) | Retain (4290, 1473); Mitigate (4440, 1734); Transfer (4590, 1473); a fine ink line across each while it is closed |
| PATH_DESK_FORECOURT | from DESK_ORIGIN (3386, 2232) to the forecourt rim at 150° (4345, 1615); cubic, controls (3700, 2232) and (4150, 1720) |
| Spurs | forecourt rim to each threshold, short and straight; the human line follows the rim from 150° to the right spur |
| Room labels | names Plex Sans SemiBold, readable sizing 44 px base; statuses mono, readable sizing 27 px base. The stacks are spaced from the actual size at each zoom, so they never collide. Above Retain and Transfer the stack grows upwards from y 950 (Transfer keeps a line reserved for NO INSURER ON PRIORA YET, so nothing moves when it arrives); Mitigate's sits to its right from (4800, 2070), growing downwards |
| Focus | in a room close-up the other rooms sit at 25 percent and their labels are hidden |
| Retain interior | packet (4040, 1320) with the coral bridge; three small room agents; four leaders to EXPOSURE (3960, 1200), AUTHORITY (4110, 1200), CONDITIONS (3960, 1450), EXPIRY (4110, 1450); AN AGENT CANNOT CHOOSE IT centred (4016, 1110) inside the room above the packet; RISK OWNER left aligned at (4325, 1432) in the mouth of the doorway, where the black line arrives; Priora inside at (4016, 1545) |
| Mitigate interior | packet (4390, 1920); Evidence check's corner marks 96 out from it; FULL and BACK INSIDE left aligned from (4520, 1912), 34 apart; safeguards at (4270, 2120), (4440, 2120), (4610, 2120), names below in one or two lines (Thermal check / Extend watch, to 60 min / Move weld, to workshop), each with a disc stack (cost, left) and an open clock arc (time, right); Priora inside at (4440, 2275) |
| Transfer interior | packet (4800, 1340); answers ELIGIBILITY, TERMS, SAFEGUARDS, PRICE ? each with a small dashed square, left aligned from (4910, 1250), 40 apart; Priora inside at (4680, 1430) |
| Transfer agents | three dashed hexagonal glyphs 400 from Transfer's centre at 315°, 5° and 50°: (5147, 1032), (5262, 1350), (5121, 1621); outside the wall, away from the forecourt, clear of the label stack. Labels CARRIER, CAPACITY, BROKER in cobalt mono 24 (29 px at zoom 1.2), left aligned 44 to the right of each glyph |
| SHORT_LIST (Sequence 7) | MITIGATE PART and KEEP THE REST centred above the packet at (3480, 1925) and (3480, 1971), mono 38 |

Visiting order sweeps one way round the clover: Retain (upper left), across the forecourt to Mitigate (below), on to Transfer (upper right). Sequence 7 continues the same direction, doorway to doorway without crossing: Mitigate, then Retain.

### 4.8 Paths, defined once

| Path | From → to |
|---|---|
| ROUTE_CASE_TO_PANEL | CASE_A → CASE_WAIT, a gentle arc above the real world (Sequence 3); controls (2700, 1560), (2350, 1480) |
| ROUTE_WORK | from the closed ring at P (x 1380), out through PANEL_ENTRANCE, then C 2300 1500, 2660 1700 down to the window (Sequence 4). Drawn once, visible to the end |
| ROUTE_ESCALATE | from (1960, 1500) over the real world to PACKET_DOCK (controls (2500, 1200), (3460, 1800)), then down to the desk corner, so it ends on the desk and not in the air (Sequence 5) |
| PATH_DESK_FORECOURT plus spurs | the risk owner to every room threshold (Sequence 6), and the route back to the desk (Sequence 7) |
| DOORWAY_TOUR | forecourt → Mitigate doorway → Retain doorway → PACKET_DOCK (Sequence 7; Priora stops at each threshold and never crosses) |
| HUMAN_LINE | always starts at DESK_ORIGIN; in Sequence 5 it loops round the packet at PACKET_DOCK (radius 92); in Sequence 6 it runs along PATH_DESK_FORECOURT, the rim and a spur; in Sequence 7 it is drawn once, round the decided packet |
| RECORD_DROP | PACKET_DOCK straight down past the end of the desk, then under the risk owner to RECORD_MARK_2 (controls (3480, 2330), (3420, 2400)), the case at half scale (Sequence 8) |

---

## 5. Cast

All glyphs are cobalt with ink texture unless noted. Sizes are world units. `stills/cast/cast sheet.png` shows every agent at zoom 0.37, 1.0 and 1.75; `stills/cast/case sheet.png` every state of the case; `stills/cast/people sheet.png` the silhouettes, safeguards, room agents and the photo.

| Character | Silhouette | Size | Movement signature |
|---|---|---|---|
| Priora | cobalt ring with a generous paper opening (outer radius 30, inner 14), fine orbit radius 50, one bead radius 6.5 | 112 across with orbit | long smooth glides; the bead turns to the target about 6 frames before the ring moves |
| Site rules | a disc split into two halves by a paper band; the upper half slides into register | 54 | aligns: pieces slide into register |
| Insurer conditions | two opposing brackets with a narrow opening | 56 | closes round a detail; from Sequence 5 its pieces stay a few units apart |
| Fire | disc with a clean 40° wedge removed | 56 | turns its wedge towards the activity |
| Risk engineering | arch with a semicircular opening | 56 | opens out to examine its surroundings |
| Evidence check | softened square with a small round aperture | 56 | frames and settles over an image |
| Ghost agents (3) | dashed stone outlines in the same family, names in grey | 56, 30 percent opacity | still; fade during Sequence 4's first move |
| Transfer agents (3) | dashed hexagons with a small dashed inner mark, lighter than the site agents; labelled CARRIER, CAPACITY, BROKER | 50 | still; answer with hollow pieces |
| Room agents (Retain) | small cobalt dot, half dome and rounded square | 24 | gather round the packet |
| Safeguards (Mitigate) | ring (thermal check), capsule (longer watch), small house (workshop), each with a disc stack and an open clock arc | 48 | lift, try the gap, return |
| Case | see 4.5 | 124 open with arcs, 116 as packet | carried; never transforms into another symbol |
| Worker, site, risk owner | solid ink silhouettes with a fine worn texture and barely there contact shadows | as 4.2 | print-like arrivals; the risk owner never moves |
| Human decision line | ink, 5 px on screen | | draws from the desk; in Sequence 6 reaches each threshold before Priora crosses; in Sequence 7 drawn once, at the final close |
| Agent threads | cobalt, 2 px on screen, dotted where the storyboard says dotted | | dots travel at a steady speed |

Texture, as built: paper is a seamless 1024 px grain tile (512 world units a tile) plus one whole-sheet low-frequency mottle, both generated once from `feTurbulence` with fixed seeds (`npm run textures`). Ink is one SVG filter per shape and seed: fine flecks cut only inside an eroded copy of the shape (so edges stay clean) and a slow density variation. Fleck strength follows the zoom (full from 1.0 up, none at 0.6 and below), because sub-pixel flecks would shimmer in wide shots; the pattern itself never changes.

---

## 6. Camera

### 6.1 Named shots

Shot = centre (x, y) and zoom. View = 1920/zoom by 1080/zoom world units.

| Shot | Centre | Zoom | View (world) | Used for |
|---|---|---|---|---|
| S1_REAL | (2880, 2100) | 1.00 | x 1920–3840, y 1560–2640 | Sequence 1 |
| S2_VOICE | (2672, 2075) | 1.80 | x 2139–3205, y 1775–2375 | the voice note: close on the worker, the factory to the right, the risk owner just off frame |
| S2_CASE | (2800, 1950) | 1.38 | x 2104–3496, y 1559–2341 | case assembly and the photo; the risk owner in frame at context opacity |
| S3_PANEL | (1390, 1390) | 0.72 | x 57–2723, y 640–2140 | panel arrives, specialists summoned; the worker and the factory stay just off frame |
| S3_TABLE | (1360, 1507) | 1.10 | x 487–2233, y 1016–1998 | checks at the table, Priora outside |
| S4_CASE | (1300, 1500) | 1.75 | x 751–1849, y 1191–1809 | arcs lock into the ring; the top and bottom seats stay off frame |
| S4_ROUTE | (2760, 2000) | 0.96 | x 1760–3760, y 1437–2563 | route to the work, record, no one disturbed |
| S5_GAP | (1930, 1720) | 0.82 | x 759–3101, y 1061–2379 | the slip, rulers, barrier, the spark in the distance |
| S5_DESK | (3330, 2120) | 1.30 | x 2592–4068, y 1705–2535 | the packet at the desk, the human line |
| S6_ROOMS | (4190, 1555) | 0.62 | x 2642–5738, y 684–2426 | rooms appear |
| S6_RETAIN | (3785, 1272) | 1.30 | x 3047–4523, y 857–1687 | Retain; Transfer stays off frame |
| S6_MITIGATE | (4440, 2110) | 1.25 | x 3672–5208, y 1678–2542 | Mitigate; Retain, Transfer and the forecourt stay off frame |
| S6_TRANSFER | (4864, 1245) | 1.20 | x 4064–5664, y 795–1695 | Transfer; Retain's edge in frame at 25 percent |
| S7_SYSTEM | (4190, 1555) | 0.62 | as S6_ROOMS | rooms working together, the desk |
| S8_SHEET | (2980, 1640) | 0.37 | x 386–5575, y 181–3099 | the whole system |

Text floors this implies (22 px labels, 44 px sentences): at zoom 0.62 a label needs world size 36 or more; at 0.37, 60 or more and sentences 119 or more. Labels sized for a close shot fade before the camera pulls back past their floor (section 7.1).

Why S6_RETAIN and S6_MITIGATE frame off centre: the brief keeps the SIMULATED label with Transfer every time Transfer is on screen. In a centred Retain or Mitigate close-up, part of Transfer's band shows while its label is off frame. These framings keep Transfer completely out of those two close-ups instead.

### 6.2 Keyframes

Every move eases in and out with the default curve and lasts at least 40 frames. Between moves the camera is completely still (no drift), so text can appear, checks can be read and decisions can land. These become `camera-keys.ts`. The frames are settled; Step 2 changed only shot positions and zooms.

| # | Frames | Camera |
|---|---|---|
| 1 | F0000 | at S1_REAL |
| 2 | F0238–F0278 (40 f) | move S1_REAL → S2_VOICE |
| 3 | F0478–F0518 (40 f) | move S2_VOICE → S2_CASE |
| 4 | F0654–F0710 (56 f) | move S2_CASE → S3_PANEL |
| 5 | F0970–F1014 (44 f) | move S3_PANEL → S3_TABLE |
| 6 | F1124–F1168 (44 f) | move S3_TABLE → S4_CASE |
| 7 | F1248–F1300 (52 f) | move S4_CASE → S4_ROUTE |
| 8 | F1392–F1438 (46 f) | move S4_ROUTE → S5_GAP |
| 9 | F1568–F1622 (54 f) | move S5_GAP → S5_DESK |
| 10 | F1691–F1731 (40 f) | move S5_DESK → S6_ROOMS |
| 11 | F1774–F1814 (40 f) | move S6_ROOMS → S6_RETAIN |
| 12 | F1930–F1970 (40 f) | move S6_RETAIN → S6_MITIGATE |
| 13 | F2154–F2194 (40 f) | move S6_MITIGATE → S6_TRANSFER |
| 14 | F2351–F2391 (40 f) | move S6_TRANSFER → S7_SYSTEM |
| 15 | F2530–F2570 (40 f) | move S7_SYSTEM → S8_SHEET |
| 16 | to F2882 | hold S8_SHEET to the end |

---

## 7. Sequences at a glance

| Seq | Frames | Focal subject | On screen text (verbatim) |
|---|---|---|---|
| 1 Real work in the middle | F0000–F0237 | worker, site and risk owner on the ground line; then Priora and the orbit of five specialists | Real work in the middle. · WORKER · SITE · RISK OWNER · Agents around it. |
| 2 A voice becomes a case | F0238–F0653 | the worker's voice note, then the case assembling above the factory | the worker's message, word for word · REPAIR · HOT WORK · PACKING LINE · BEFORE NIGHT SHIFT · SITE + INSURANCE CONDITIONS · PHOTO · Photo of the bracket? · CASE |
| 3 The site chooses its cast | F0654–F1123 | the site panel: specialists summoned through the entrance, checks at the table, Priora outside | Site panel · CONFIGURED FOR THIS SITE · Electrical · Structural · Security · Evidence check · Risk engineering · Site rules · Fire · Insurer conditions · FIRE WATCH? |
| 4 When the conditions hold | F1124–F1391 | the ring locking, then the route to the work and the quiet desk | INSIDE THE CONDITIONS · RECORD KEPT · NO ONE DISTURBED |
| 5 A condition slips | F1392–F1690 | the gap; the fire watch rulers; then the packet carried to the risk owner and the human line | FIRE WATCH PLANNED: 30 MIN · POLICY ASKS: 60 MIN · NO HARD STOP CONFIGURED · DECISION PACKET · RISK OWNER DECIDES |
| 6 Three decision rooms | F1691–F2350 | the clover, then Retain, Mitigate and Transfer in turn | Retain · Mitigate · Transfer · DESIGN PROPOSAL (×2) · SIMULATED |
| 6 Retain | F1691–F1929 | the closed threshold; the human line opens it; the bridged gap | AN AGENT CANNOT CHOOSE IT · RISK OWNER · EXPOSURE · AUTHORITY · CONDITIONS · EXPIRY |
| 6 Mitigate | F1930–F2153 | two safeguards tried in the gap | Thermal check · Extend watch to 60 min · Move weld to workshop · PARTIAL · FULL · BACK INSIDE |
| 6 Transfer | F2154–F2350 | the dashed room asking simulated capacity | SIMULATED · NO INSURER ON PRIORA YET · ELIGIBILITY · TERMS · SAFEGUARDS · PRICE ? · (the three agents' role labels, wording open: question Q2) |
| 7 The rooms work together | F2351–F2529 | one packet at the Mitigate and Retain doorways, then the decision at the desk | MITIGATE PART · KEEP THE REST · RISK OWNER DECIDES |
| 8 The whole system | F2530–F2882 | the whole sheet; then the final statement; then the name | A DESIGN PROPOSAL · Priora turns physical work / into explicit risk decisions, / while the work happens. · Priora |

Rules that span sequences, and where they hold:

- **The gap** opens at F1392, the first frame of Sequence 5, and is visible whenever the case is on screen until the human line closes round the decision in Sequence 7 (F2465–F2485). In Retain it is bridged with the original gap readable beneath; in Mitigate's preview the filling piece is dashed, so the gap still reads.
- **SIMULATED** is a persistent, readable sized label: visible and at least 22 px whenever Transfer is in frame, including the wide shots of Sequences 7 and 8. It arrives 4 to 6 frames after Transfer's band first prints, and Transfer stays off frame in the Retain and Mitigate close-ups (section 6.1).
- **The human line** always starts at DESK_ORIGIN. In Sequence 6 it reaches each doorway before Priora crosses; in Sequence 7 Priora does not cross, and the line is drawn once, at the close.
- **The spark** flickers from F1274 to the final dissolve, from a fixed, hand-made flicker pattern (no random noise).
- **The ghosts** fade during Sequence 4's first move and are gone well before Sequence 8.

### 7.1 Corrections Step 3 makes inside the settled frames

An independent check of this plan against the storyboard and the brief found beats in the wrong order and rules the Step 1 beat sheets did not cover yet. Each fix below is made inside the sequence's settled frame range when that sequence is built in Step 3, and the checker then verifies it. No sequence changes length. If a fix cannot fit inside its sequence, I will tell you rather than change a length.

**Order inside the sequences**

- Sequence 1: the five specialists settle before "Agents around it." appears, and the bead's short arc comes before the ellipse grows. The ellipse withdraws and Priora glides towards the worker (to PRIORA_LISTEN, just above and to its right) across Sequence 1's last frames and the first camera move, when no text is appearing.
- Sequence 2: the bead turns to the waveform about 6 frames before the listening thread extends. The conditions line and its facet (the fifth) arrive before the empty PHOTO position (the sixth). The facets fold to their travelling radius before CASE appears, so CASE never meets the open chip labels. The camera rises only after the voice has ended, the words have faded to grey and the phrases have separated; the grey words are gone before the zoom would take them under 44 px.
- Sequence 3: short echoes, fading within 8 frames, follow the agents as they enter. The fifth finding joins the others before the marks leave through the entrance. FIRE WATCH? travels on a path clear of Fire's glyph and name.
- Sequence 4: each finding travels from its mark beside Priora into the ring, arriving from the direction of its agent (the storyboard's image). The facets do not fold here; they fold in Sequence 5.
- Sequence 5: the slip (the arc loosening, the Insurer conditions glyph separating) starts once the camera has settled on S5_GAP, so the key moment is seen with a still camera.
- Sequence 6: the room names and statuses arrive 4 to 6 frames after their bands. Priora takes the packet from the desk only after the Sequence 5 loop has let go. Retain's closed threshold line is drawn before Priora stops short. At Mitigate the black line visibly opens the threshold, and at Transfer it authorises the inquiry there, each with a still camera and at least 6 frames before Priora crosses. At Transfer, SIMULATED and NO INSURER ON PRIORA YET are both up before the line arrives. In Mitigate, Priora's bead turns to each option as it attends to it, with a slight lift.
- Between Sequences 6 and 7: the human line draws back to the desk during the widening move, so the single Sequence 7 line is the only one on screen.
- Sequence 7: the proposed coral bridge is dashed, with the gap's coral ends visible beneath, until the decision; it turns solid at F2485 together with the mitigation piece.
- Sequence 8: the decided case lowers and leaves its record mark, the window flickers, and only then does Priora rise.
- Everywhere: Priora's bead leads each glide by about 6 frames. The Priora component applies the lead to every move, so no beat says "at once".

**One focal arrangement at a time**

Everything outside the current arrangement is off frame or at 28 percent (`CONTEXT_OPACITY`), and opacities change only during camera moves.

| Shot | At context opacity (or off frame) |
|---|---|
| S1_REAL, S4_ROUTE, S8_SHEET | nothing: the whole real world is the subject |
| S2_VOICE | the risk owner is off frame |
| S2_CASE | the risk owner |
| S3_PANEL, S3_TABLE, S4_CASE | the real world is off frame; the ghosts sit at 30 percent |
| S5_GAP | the worker and the record line (the site and its spark stay: the spark "continues in the distance") |
| S5_DESK | the site, its spark, the work route and the record line |
| S6_ROOMS, S7_SYSTEM | the site, the ground line and the record line; the risk owner and the desk stay, as the origin of the human line |
| S6_RETAIN, S6_MITIGATE, S6_TRANSFER | the other rooms at 25 percent with their labels hidden; Transfer is entirely off frame in the Retain and Mitigate close-ups |

**Text exits** (no label shrinks under its floor in a wide shot)

- The specialist and ghost names fade with the ghosts in Sequence 4's first move.
- Retain's leaders, AN AGENT CANNOT CHOOSE IT and RISK OWNER fade as the retained treatment falls away, in the move to Mitigate.
- The safeguard names and PARTIAL, FULL, BACK INSIDE fade as the proposal withdraws, before the move to Transfer.
- The Transfer answers' labels and CARRIER, CAPACITY, BROKER fade before Sequence 7's widening; the dashed answer pieces travel with the packet.
- MITIGATE PART, KEEP THE REST and RISK OWNER DECIDES fade during Sequence 8's first move (at zoom 0.37 RISK OWNER DECIDES would cross Mitigate's band).
- SIMULATED never fades while Transfer is in frame. In Sequence 8's recession and dissolve it fades with the room at exactly the room's contrast, never fainter. The dashed Transfer answers carry no label of their own: the room's SIMULATED stays in frame through Sequences 7 and 8 and the answers stay dashed.

**The final statement** sits over the receded drawing, as the storyboard asks. The drawing recedes to 20 percent contrast or less, the spark and the room labels stay clear of the statement's text boxes, and the clean paper check treats the receded layer as paper. In Sequence 8 the drawing keeps ROUTE_WORK, ROUTE_ESCALATE and the desk path with its spurs; the travel-only paths are gone.

**Small items resolved by recommendation** (say if you want otherwise): AN AGENT CANNOT CHOOSE IT is set in Mono capitals like every other all-capitals string; the Transfer agents sit outside the wall; Evidence check's corner marks in Mitigate come from a small Evidence check glyph among Mitigate's room agents, not from a trip across the sheet.

---

## 8. Timeline and beat sheets

Generated from the same data the checker reads, so the numbers here are the checked ones. These are the Step 1 beat sheets: section 7.1 lists the order fixes Step 3 makes inside the same frames, and the sheets are regenerated as each sequence is built. Frame ranges are inclusive. "Readable" is the number of frames each text item is fully visible, inside the frame with a 40 px margin and at or above its size floor; "needed" is 10 frames per word, minimum 20. Positions marked "set in Step 2" have their timing checked here and their exact place fixed against the stills.

| Part | Storyboard as first written | Rule-clean length | Final range | Length |
|---|---|---|---|---|
| Sequence 1: Real work in the middle | F0000–F0239 (240 f) | 238 f | F0000–F0237 | 238 f, 0:00.0–0:07.9 |
| Sequence 2: A voice becomes a case | F0240–F0659 (420 f) | 416 f | F0238–F0653 | 416 f, 0:07.9–0:21.8 |
| Sequence 3: The site chooses its cast | F0660–F1139 (480 f) | 470 f | F0654–F1123 | 470 f, 0:21.8–0:37.5 |
| Sequence 4: When the conditions hold | F1140–F1409 (270 f) | 268 f | F1124–F1391 | 268 f, 0:37.5–0:46.4 |
| Sequence 5: A condition slips | F1410–F1709 (300 f) | 299 f | F1392–F1690 | 299 f, 0:46.4–0:56.4 |
| Sequence 6, opening and Retain | F1710–F1919 (210 f) | 239 f | F1691–F1929 | 239 f, 0:56.4–1:04.3 |
| Sequence 6, Mitigate | F1920–F2129 (210 f) | 224 f | F1930–F2153 | 224 f, 1:04.3–1:11.8 |
| Sequence 6, Transfer | F2130–F2339 (210 f) | 197 f | F2154–F2350 | 197 f, 1:11.8–1:18.4 |
| Sequence 7: The rooms work together | F2340–F2519 (180 f) | 179 f | F2351–F2529 | 179 f, 1:18.4–1:24.3 |
| Sequence 8: The whole system | F2520–F2699 (180 f) | 308 f, 353 with air | F2530–F2882 | 353 f, 1:24.3–1:36.1 |
| **Film** | F0000–F2699 (2700 f, 90.0 s) | | F0000–F2882 | **2883 f, 96.1 s** |

### Sequence 1: Real work in the middle

F0000–F0237, 238 frames (0:00.0–0:07.9). Tightest rule-clean need 238 frames.

Camera: F0000 S1_REAL · hold to F0237

Narration: N1 "Real work in the middle: a worker, a site, a risk owner. Priora places agents around it." F0008–F0229 (17 words at 2.3 wps, 222 f)

| Frames | Beat |
|---|---|
| F0000–F0034 | ground line draws left to right, ink cap on the leading edge |
| F0010–F0019 | text **Real work in the middle.** (sentence, 52 px, readable 221 f, 50 needed) |
| F0084–F0104 | worker prints in on "worker" (large arrival, contact shadow) |
| F0109–F0118 | text **WORKER** (label, 24 px, readable 126 f, 20 needed) |
| F0110–F0130 | site prints in on "site" |
| F0135–F0144 | text **SITE** (label, 24 px, readable 100 f, 20 needed) |
| F0136–F0156 | risk owner prints in on "risk owner" |
| F0161–F0170 | text **RISK OWNER** (label, 24 px, readable 74 f, 20 needed) |
| F0164–F0180 | Priora appears above the group on "Priora" (small arrival) |
| F0178–F0204 | orbit ellipse grows both ways from the ring |
| F0182–F0200 | bead sweeps a short arc across the three |
| F0186–F0218 | five specialists arrive along it (62°, 298°, 128°, 232°, 180°), stagger 4 to 6, each with its own small turn |
| F0200–F0209 | text **Agents around it.** (sentence, 52 px, readable 31 f, 30 needed) |
| F0218–F0237 | hold: the whole relationship visible |

Hand-off: Over the first 26 frames of Sequence 2, under its opening camera move: the ellipse withdraws, the specialists drift to the edges and soften out, both sentences and the three labels fade. The bead turns to the worker at once and Priora glides on through the first 56 frames. No new text.

Checker: every rule passes.

### Sequence 2: A voice becomes a case

F0238–F0653, 416 frames (0:07.9–0:21.8). Tightest rule-clean need 416 frames.

Camera: F0238 S1_REAL · move to S2_VOICE F0238–F0278 (40 f) · hold to F0478 · move to S2_CASE F0478–F0518 (40 f) · hold to F0653

Narration: W1 "Hey, the bracket by the packing line has cracked again. We’re going to weld it before the night shift." F0272–F0483 (19 words at 2.7 wps, 212 f); N2 "Priora hears the job, and asks for a photo." F0506–F0623 (9 words at 2.3 wps, 118 f)

| Frames | Beat |
|---|---|
| F0238–F0278 | camera closer to the worker (Sequence 1 exit runs under it) |
| F0260–F0276 | worker raises the phone |
| F0272–F0487 | waveform grows from the phone with the voice; listening thread from the bead down the right side and along the baseline to the tip; cobalt dots travel back in small groups |
| F0280–F0289 | text **Hey, the bracket** (sentence, 44 px, readable 201 f, 30 needed) |
| F0302–F0314 | underline "bracket" |
| F0307–F0316 | text **by the packing line** (sentence, 44 px, readable 174 f, 40 needed) |
| F0336–F0350 | underline "packing line" |
| F0352–F0361 | text **has cracked again.** (sentence, 44 px, readable 129 f, 30 needed) |
| F0369–F0381 | coral underline "cracked" |
| F0385–F0394 | text **We’re going to weld it** (sentence, 44 px, readable 96 f, 50 needed) |
| F0424–F0436 | underline "weld" |
| F0441–F0450 | text **before the night shift.** (sentence, 44 px, readable 40 f, 40 needed) |
| F0478–F0518 | camera rises with the phrases (no new text: the last words appeared 28 frames earlier) |
| F0480–F0494 | underline "before the night shift" |
| F0482–F0518 | Priora: bead leads, glides to the case position |
| F0488–F0503 | remaining words fade to pale grey |
| F0492–F0512 | phrases separate gently |
| F0504–F0524 | grey words and waveform fade fully out |
| F0508–F0538 | phrases glide to positions around the core |
| F0510–F0530 | Priora draws the thin circle |
| F0526–F0536 | core dot prints |
| F0528–F0537 | text **REPAIR** (label, 25 px, readable 113 f, 20 needed) |
| F0528–F0549 | four phrases become chips REPAIR, HOT WORK, PACKING LINE, BEFORE NIGHT SHIFT |
| F0532–F0541 | text **HOT WORK** (label, 25 px, readable 109 f, 20 needed) |
| F0534–F0556 | conditions line rises from the factory roof into the bottom facet |
| F0536–F0545 | text **PACKING LINE** (label, 25 px, readable 105 f, 20 needed) |
| F0540–F0549 | text **BEFORE NIGHT SHIFT** (label, 25 px, readable 101 f, 30 needed) |
| F0540–F0552 | PHOTO facet draws dashed with a question mark |
| F0556–F0565 | text **PHOTO** (label, 25 px, readable 85 f, 20 needed) |
| F0560–F0566 | bead turns to the worker |
| F0561–F0570 | text **SITE + INSURANCE CONDITIONS** (label, 25 px, readable 80 f, 30 needed) |
| F0566–F0584 | dotted thread descends carrying the request |
| F0570–F0579 | text **Photo of the bracket?** (sentence, 45 px, readable 57 f, 40 needed) |
| F0586–F0598 | worker tilts the phone |
| F0600–F0622 | photo travels up |
| F0622–F0634 | photo settles into the facet |
| F0630–F0642 | dashed perimeter becomes continuous |
| F0634–F0653 | hold on the filled facet (the fold now rides in Sequence 3's travel) |
| F0638–F0647 | text **CASE** (label, 45 px, readable 71 f, 20 needed) |

Hand-off: Ends with the case, its six facets and "CASE" beneath it, camera still at S2_CASE. The fold onto the core happens during Sequence 3's travel.

Checker: every rule passes.

### Sequence 3: The site chooses its cast

F0654–F1123, 470 frames (0:21.8–0:37.5). Tightest rule-clean need 470 frames.

Camera: F0654 S2_CASE · move to S3_PANEL F0654–F0710 (56 f) · hold to F0970 · move to S3_TABLE F0970–F1014 (44 f) · hold to F1123

Narration: N3a "Next, it summons only the specialists this site and job need." F0756–F0899 (11 words at 2.3 wps, 144 f); N3b "Each checks its own conditions and reports back." F0988–F1092 (8 words at 2.3 wps, 105 f)

| Frames | Beat |
|---|---|
| F0654–F0710 | Priora glides left along ROUTE_CASE_TO_PANEL, the case behind on a short thread; facets fold onto the core in flight; "CASE" rides along (23 px) and fades at 60 |
| F0714–F0723 | text **Site panel** (name, 33 px, readable 247 f, 20 needed) |
| F0714–F0749 | panel title, sub and the three ghost names appear (camera still) |
| F0720–F0729 | text **CONFIGURED FOR THIS SITE** (label, 23 px, readable 241 f, 40 needed) |
| F0728–F0737 | text **Electrical** (name, 24 px, readable 457 f, 20 needed) |
| F0734–F0743 | text **Structural** (name, 24 px, readable 451 f, 20 needed) |
| F0740–F0749 | text **Security** (name, 24 px, readable 445 f, 20 needed) |
| F0744–F0758 | bead turns to the ghost seats |
| F0764–F0778 | bead returns to the case |
| F0782–F0920 | summons, one every 18 frames: facet pulses (8), thread reaches out (12), the specialist slides in with its signature (18), passes the entrance to its seat (20), settles (8). Order: Evidence check, Risk engineering, Site rules, Fire, Insurer conditions |
| F0853–F0862 | text **Evidence check** (name, 24 px, readable 332 f, 20 needed) |
| F0871–F0880 | text **Risk engineering** (name, 24 px, readable 314 f, 20 needed) |
| F0889–F0898 | text **Site rules** (name, 24 px, readable 296 f, 20 needed) |
| F0907–F0916 | text **Fire** (name, 24 px, readable 278 f, 20 needed) |
| F0924–F0948 | the case passes through the entrance and settles at the table centre; Priora stays outside, a fine connection between them |
| F0925–F0934 | text **Insurer conditions** (name, 24 px, readable 260 f, 20 needed) |
| F0948–F0970 | hold: Priora conducts from outside |
| F0970–F1014 | camera to the table; the case opens into its facets in the move |
| F1016–F1040 | Evidence check frames the bracket image, aperture centres on the crack |
| F1028–F1052 | Risk engineering opens, draws a dashed radius round the packing line facet |
| F1040–F1060 | Site rules places a short horizontal mark beside the job |
| F1052–F1072 | Fire turns to the hot work symbol and pulses along its edge |
| F1064–F1084 | Insurer conditions closes its brackets round the conditions facet |
| F1076–F1085 | text **FIRE WATCH?** (label, 28 px, readable 39 f, 20 needed) |
| F1086–F1106 | "FIRE WATCH?" travels from Fire to Insurer conditions |
| F1094–F1123 | five small marks leave through the entrance and collect beside Priora |
| F1106–F1114 | their answer joins the findings |

Hand-off: The hold on the five marks beside Priora runs on under Sequence 4's first camera move (no new text).

Checker: every rule passes.

### Sequence 4: When the conditions hold

F1124–F1391, 268 frames (0:37.5–0:46.4). Tightest rule-clean need 268 frames.

Camera: F1124 S3_TABLE · move to S4_CASE F1124–F1168 (44 f) · hold to F1248 · move to S4_ROUTE F1248–F1300 (52 f) · hold to F1391

Narration: N4 "When everything holds, the route opens. Work goes on, the record is kept, no one is disturbed." F1170–F1391 (17 words at 2.3 wps, 222 f)

| Frames | Beat |
|---|---|
| F1124–F1140 | the five marks beside Priora are taken into it |
| F1134–F1154 | facets fold to radius 52 |
| F1138–F1176 | five arcs arrive, each from the direction of its agent (stagger 5, 18 frames each) |
| F1176–F1196 | arcs slide into one continuous ring |
| F1196–F1204 | the ring locks, one soft pulse (on "holds") |
| F1204–F1224 | hold the closed ring |
| F1208–F1217 | text **INSIDE THE CONDITIONS** (label, 41 px, readable 31 f, 30 needed) |
| F1224–F1274 | the route draws from the ring through the entrance to the window |
| F1248–F1300 | camera follows the route, widening to the real world |
| F1254–F1304 | Priora glides to its pause point between the site and the panel |
| F1274–F1276 | route reaches the window: the spark starts flickering (to the end of the film) |
| F1302–F1322 | record line extends under the ground |
| F1322–F1330 | first record mark |
| F1334–F1343 | text **RECORD KEPT** (label, 24 px, readable 51 f, 20 needed) |
| F1346–F1355 | text **NO ONE DISTURBED** (label, 24 px, readable 39 f, 30 needed) |
| F1360–F1376 | Priora's bead turns attentively to the work |

Checker: every rule passes.

### Sequence 5: A condition slips

F1392–F1690, 299 frames (0:46.4–0:56.4). Tightest rule-clean need 299 frames.

Camera: F1392 S4_ROUTE · move to S5_GAP F1392–F1438 (46 f) · hold to F1568 · move to S5_DESK F1568–F1622 (54 f) · hold to F1690

Narration: N5 "One condition slips: the fire watch is half the policy. Priora brings it to the risk owner. Agents prepare, the human decides." F1404–F1690 (22 words at 2.3 wps, 287 f)

| Frames | Beat |
|---|---|
| F1392–F1422 | the gap opens at F1392: the Insurer conditions arc loosens, rotates about 8°, drifts out and turns dashed |
| F1392–F1438 | camera follows the route back to the panel |
| F1398–F1416 | the Insurer conditions glyph separates its two pieces |
| F1412–F1424 | coral at the two exposed ends |
| F1442–F1451 | text **FIRE WATCH PLANNED: 30 MIN** (label, 23 px, readable 71 f, 50 needed) |
| F1444–F1458 | solid 30 MIN ruler draws |
| F1458–F1467 | text **POLICY ASKS: 60 MIN** (label, 23 px, readable 55 f, 40 needed) |
| F1460–F1488 | dashed 60 MIN ruler draws, twice as long, same speed (completes on "half") |
| F1472–F1490 | pale incomplete barrier outline on the route |
| F1494–F1503 | text **NO HARD STOP CONFIGURED** (label, 25 px, readable 65 f, 40 needed) |
| F1522–F1534 | rulers fade |
| F1528–F1552 | facets fold inward, the ring contracts, the gap kept |
| F1556–F1565 | text **DECISION PACKET** (label, 27 px, readable 22 f, 20 needed) |
| F1566–F1592 | the packet comes out through the entrance to Priora |
| F1592–F1642 | Priora carries it along ROUTE_ESCALATE to the desk; camera follows |
| F1642–F1662 | hold the packet at the desk |
| F1650–F1676 | the human line draws from the desk and loops loosely round the packet (low wooden note as it arrives) |
| F1680–F1689 | text **RISK OWNER DECIDES** (label, 47 px, readable 33 f, 30 needed) |

Hand-off: "RISK OWNER DECIDES" stays readable into Sequence 6's first move (47 px falling to 22 px).

Checker: every rule passes.

### Sequence 6, opening and Retain

F1691–F1929, 239 frames (0:56.4–1:04.3). Tightest rule-clean need 239 frames.

Camera: F1691 S5_DESK · move to S6_ROOMS F1691–F1731 (40 f) · hold to F1774 · move to S6_RETAIN F1774–F1814 (40 f) · hold to F1929

Narration: N6R-a "Retain is never a default." F1745–F1810 (5 words at 2.3 wps, 66 f); N6R-b "Risk is kept on purpose, with its terms explicit." F1811–F1928 (9 words at 2.3 wps, 118 f)

| Frames | Beat |
|---|---|
| F1691–F1731 | camera right and up; forecourt, paths and the three room bands print during the move (stagger 6, 26 frames each) |
| F1735–F1744 | text **Retain** (name, 40 px, readable 45 f, 20 needed) |
| F1735–F1744 | text **R** (name, 55 px, readable 47 f, 20 needed) |
| F1737–F1746 | text **DESIGN PROPOSAL** (label, 25 px, readable 244 f, 20 needed) |
| F1739–F1748 | text **Mitigate** (name, 40 px, readable 39 f, 20 needed) |
| F1739–F1748 | text **M** (name, 55 px, readable 39 f, 20 needed) |
| F1741–F1750 | text **DESIGN PROPOSAL** (label, 25 px, readable 36 f, 20 needed) |
| F1741–F1757 | the human loop around the packet lets go |
| F1743–F1752 | text **Transfer** (name, 40 px, readable 238 f, 20 needed; exact position set in Step 2) |
| F1743–F1752 | text **T** (name, 55 px, readable 39 f, 20 needed) |
| F1745–F1754 | text **SIMULATED** (label, 25 px, readable 236 f, 20 needed; exact position set in Step 2) |
| F1751–F1811 | Priora carries the packet from the desk along the path, across the forecourt, to the Retain doorway |
| F1774–F1814 | camera approaches Retain; the large initials fade |
| F1809–F1841 | the human line extends from the desk along the path and reaches the doorway, after AN AGENT CANNOT CHOOSE IT has appeared |
| F1814–F1828 | Priora stops short at the closed threshold; bead to the doorway, then to the risk owner |
| F1820–F1829 | text **AN AGENT CANNOT CHOOSE IT** (label, 30 px, readable 161 f, 50 needed; exact position set in Step 2) |
| F1841–F1849 | the line opens the threshold and holds it clear |
| F1845–F1854 | text **RISK OWNER** (label, 30 px, readable 76 f, 20 needed; exact position set in Step 2) |
| F1849–F1867 | Priora carries the packet inside |
| F1863–F1877 | small room agents gather |
| F1871–F1885 | coral bridge across the gap, the gap still readable beneath |
| F1881–F1899 | four leader lines draw |
| F1885–F1905 | hold the bridged packet |
| F1889–F1898 | text **EXPOSURE** (label, 30 px, readable 92 f, 20 needed; exact position set in Step 2) |
| F1893–F1902 | text **AUTHORITY** (label, 30 px, readable 88 f, 20 needed; exact position set in Step 2) |
| F1897–F1906 | text **CONDITIONS** (label, 30 px, readable 84 f, 20 needed; exact position set in Step 2) |
| F1901–F1910 | text **EXPIRY** (label, 30 px, readable 80 f, 20 needed; exact position set in Step 2) |
| F1910–F1929 | the arrangement holds while the narration finishes |

Checker: every rule passes.

### Sequence 6, Mitigate

F1930–F2153, 224 frames (1:04.3–1:11.8). Tightest rule-clean need 224 frames.

Camera: F1930 S6_RETAIN · move to S6_MITIGATE F1930–F1970 (40 f) · hold to F2153

Narration: N6M "Mitigate compares safeguards, and checks whether the work is back inside." F1982–F2125 (11 words at 2.3 wps, 144 f)

| Frames | Beat |
|---|---|
| F1930–F1946 | the retained treatment falls away; the packet is unresolved again |
| F1930–F1964 | Priora carries the packet across the forecourt to the Mitigate doorway |
| F1944–F1962 | the human line leaves Retain and reaches the Mitigate doorway, before Priora crosses |
| F1964–F1982 | Priora crosses (during the last frames of the move, no text); packet inside |
| F1974–F1983 | text **Thermal check** (name, 28 px, readable 231 f, 20 needed; exact position set in Step 2) |
| F1978–F1987 | text **Extend watch to 60 min** (name, 28 px, readable 227 f, 50 needed; exact position set in Step 2) |
| F1982–F1991 | text **Move weld to workshop** (name, 28 px, readable 223 f, 40 needed; exact position set in Step 2) |
| F1982–F1998 | Thermal check rises from the paper and moves to the packet |
| F1998–F2010 | its dashed piece fills part of the gap |
| F2010–F2030 | hold |
| F2014–F2023 | text **PARTIAL** (label, 30 px, readable 36 f, 20 needed; exact position set in Step 2) |
| F2043–F2059 | it withdraws |
| F2049–F2065 | Extend watch rises and moves to the packet |
| F2065–F2079 | it extends across the whole opening; the ring is continuous in preview |
| F2079–F2138 | hold the previewed ring |
| F2083–F2092 | text **FULL** (label, 30 px, readable 46 f, 20 needed; exact position set in Step 2) |
| F2089–F2105 | Evidence check's corner marks settle round the result |
| F2109–F2118 | text **BACK INSIDE** (label, 30 px, readable 20 f, 20 needed; exact position set in Step 2) |
| F2138–F2153 | the proposal withdraws; the packet is unresolved again |

Checker: every rule passes.

### Sequence 6, Transfer

F2154–F2350, 197 frames (1:11.8–1:18.4). Tightest rule-clean need 197 frames.

Camera: F2154 S6_MITIGATE · move to S6_TRANSFER F2154–F2194 (40 f) · hold to F2350

Narration: N6T "Transfer, simulated for now, asks outside capacity for terms and a price." F2194–F2350 (12 words at 2.3 wps, 157 f)

| Frames | Beat |
|---|---|
| F2154–F2194 | Priora carries the packet to Transfer |
| F2168–F2192 | the human line reaches the Transfer doorway, before Priora crosses |
| F2194–F2212 | Priora crosses; packet inside |
| F2198–F2207 | text **NO INSURER ON PRIORA YET** (label, 28 px, readable 204 f, 50 needed; exact position set in Step 2) |
| F2212–F2242 | dashed copies of the gap travel out through small openings to the three dashed agents |
| F2242–F2270 | hollow answers return |
| F2274–F2283 | text **ELIGIBILITY** (label, 30 px, readable 128 f, 20 needed; exact position set in Step 2) |
| F2278–F2287 | text **TERMS** (label, 30 px, readable 124 f, 20 needed; exact position set in Step 2) |
| F2282–F2291 | text **SAFEGUARDS** (label, 30 px, readable 120 f, 20 needed; exact position set in Step 2) |
| F2286–F2295 | text **PRICE ?** (label, 30 px, readable 116 f, 20 needed; exact position set in Step 2) |
| F2315–F2331 | Priora gathers them |
| F2331–F2350 | Priora brings the packet back to the forecourt, towards the risk owner |

Checker: every rule passes.

### Sequence 7: The rooms work together

F2351–F2529, 179 frames (1:18.4–1:24.3). Tightest rule-clean need 179 frames.

Camera: F2351 S6_TRANSFER · move to S7_SYSTEM F2351–F2391 (40 f) · hold to F2529

Narration: N7-a "Priora carries the case between rooms." F2363–F2441 (6 words at 2.3 wps, 79 f); N7-b "The risk owner stays in control." F2451–F2529 (6 words at 2.3 wps, 79 f)

| Frames | Beat |
|---|---|
| F2351–F2391 | camera widens to all three rooms and the desk; Priora brings the packet, with the dashed Transfer answers gathered at its side, to the Mitigate doorway (stops at the threshold, does not cross) |
| F2391–F2403 | a dashed safeguard comes out and fills part of the gap |
| F2403–F2421 | on to the Retain doorway |
| F2407–F2416 | text **MITIGATE PART** (label, 24 px, readable 174 f, 20 needed; exact position set in Step 2) |
| F2421–F2433 | a proposed coral bridge spans the rest of the gap |
| F2437–F2446 | text **KEEP THE REST** (label, 24 px, readable 144 f, 30 needed; exact position set in Step 2) |
| F2437–F2463 | Priora returns to the desk with the packet and its short list |
| F2463–F2483 | the final arrival pauses |
| F2465–F2485 | the human line draws from the desk, once, and closes round the chosen combination |
| F2485–F2495 | mitigation and retention marks turn solid; the dashed Transfer inquiry stays dashed, off to one side |
| F2489–F2498 | text **RISK OWNER DECIDES** (label, 25 px, readable 92 f, 30 needed) |
| F2495–F2507 | one soft pulse through the human line |
| F2498–F2529 | the camera stays still while RISK OWNER DECIDES is read and the voice finishes (a decision moment) |

Checker: every rule passes.

### Sequence 8: The whole system

F2530–F2882, 353 frames (1:24.3–1:36.1). Bare minimum 308 frames; 45 frames of air kept (a moment on the whole system, a half second of near silence after the voice, a full second of the name alone).

Camera: F2530 S7_SYSTEM · move to S8_SHEET F2530–F2570 (40 f) · hold to F2882

Narration: N8 "Priora turns physical work into explicit risk decisions, while the work happens." F2636–F2792 (12 words at 2.3 wps, 157 f)

| Frames | Beat |
|---|---|
| F2530–F2570 | camera withdraws to the whole sheet; Priora rises to the upper centre, its bead settling between the panel and the rooms |
| F2538–F2562 | the decided case lowers to the record line |
| F2562–F2570 | the second record mark (faint paper contact) |
| F2574–F2583 | text **A DESIGN PROPOSAL** (label, 23 px, readable 40 f, 30 needed) |
| F2603–F2623 | the drawing recedes in contrast |
| F2613–F2623 | breathing room: the whole system, read |
| F2623–F2633 | A DESIGN PROPOSAL fades |
| F2633–F2642 | text **Priora turns physical work** (sentence, 61 px, readable 166 f, 120 needed) |
| F2633–F2642 | text **into explicit risk decisions,** (sentence, 61 px, readable 166 f, 120 needed) |
| F2633–F2642 | text **while the work happens.** (sentence, 61 px, readable 166 f, 120 needed) |
| F2793–F2808 | breathing room: the statement holds in near silence after the voice |
| F2808–F2853 | drawing and statement dissolve; "Priora" fades in during the second half |
| F2828–F2837 | text **Priora** (name, 111 px, readable 106 f, 20 needed) |
| F2853–F2882 | breathing room: "Priora" alone, still |

Checker: every rule passes.

---

## 9. Narration fit

Calm narration at 2.3 words per second; the worker's phone message at 2.7. Every line fits inside its sequence, no two lines overlap, and the animation is never sped up to fit a line. Retain's and Sequence 7's narration are each one storyboard line in two sentences, placed so their key words land with the picture ("kept on purpose" with the bridge, "stays in control" with the line closing).

| Line | Text | Words | Pace | Frames | Placed | Its sequence | Gap to next line |
|---|---|---|---|---|---|---|---|
| N1 | "Real work in the middle: a worker, a site, a risk owner. Priora places agents around it." | 17 | 2.3 | 222 | F0008–F0229 | F0000–F0237 | 42 f |
| W1 | "Hey, the bracket by the packing line has cracked again. We’re going to weld it before the night shift." | 19 | 2.7 | 212 | F0272–F0483 | F0238–F0653 | 22 f |
| N2 | "Priora hears the job, and asks for a photo." | 9 | 2.3 | 118 | F0506–F0623 | F0238–F0653 | 132 f |
| N3a | "Next, it summons only the specialists this site and job need." | 11 | 2.3 | 144 | F0756–F0899 | F0654–F1123 | 88 f |
| N3b | "Each checks its own conditions and reports back." | 8 | 2.3 | 105 | F0988–F1092 | F0654–F1123 | 77 f |
| N4 | "When everything holds, the route opens. Work goes on, the record is kept, no one is disturbed." | 17 | 2.3 | 222 | F1170–F1391 | F1124–F1391 | 12 f |
| N5 | "One condition slips: the fire watch is half the policy. Priora brings it to the risk owner. Agents prepare, the human decides." | 22 | 2.3 | 287 | F1404–F1690 | F1392–F1690 | 54 f |
| N6R-a | "Retain is never a default." | 5 | 2.3 | 66 | F1745–F1810 | F1691–F1929 | 0 f |
| N6R-b | "Risk is kept on purpose, with its terms explicit." | 9 | 2.3 | 118 | F1811–F1928 | F1691–F1929 | 53 f |
| N6M | "Mitigate compares safeguards, and checks whether the work is back inside." | 11 | 2.3 | 144 | F1982–F2125 | F1930–F2153 | 68 f |
| N6T | "Transfer, simulated for now, asks outside capacity for terms and a price." | 12 | 2.3 | 157 | F2194–F2350 | F2154–F2350 | 12 f |
| N7-a | "Priora carries the case between rooms." | 6 | 2.3 | 79 | F2363–F2441 | F2351–F2529 | 9 f |
| N7-b | "The risk owner stays in control." | 6 | 2.3 | 79 | F2451–F2529 | F2351–F2529 | 106 f |
| N8 | "Priora turns physical work into explicit risk decisions, while the work happens." | 12 | 2.3 | 157 | F2636–F2792 | F2530–F2882 | 90 f to the end |

These placements become `narration.ts`, which also writes `narration.srt`. When the real voice is recorded, its word timings replace the calculated ones and the checker runs again.

---

## 10. Review loop and automatic checks

### 10.1 The loop

Exactly the order in the brief, no skipping:

1. **This plan**, approved by you.
2. **Static world.** Every element in its final resting state. Stills: the whole sheet; each territory up close (real world and record line, site panel, the clover with its forecourt, each room); a cast sheet with every agent side by side at zoom 0.37, 1.0 and 1.7; a case sheet with every state of the case (first circle, open chips, folded, ring locked, gap, packet, bridged, decided). Proportions, spacing and colour are fixed here, before any animation.
3. **One sequence at a time.** Build; render at least 6 stills (start, end, every key moment in the storyboard) to `stills/sequence N`; render a half resolution MP4; write every problem into `stills/sequence N/review.md`; fix; re-render. A sequence is done only after it passes the checklist twice in a row.
4. **Full film** at half resolution, checking that the camera journeys feel continuous; then the masters.

### 10.2 Automatic checks (`npm run qa`)

The checklist is also enforced by a lint that reads the timeline, layout, camera keys and the text registry, so a broken rule fails before anything is rendered. A working prototype produced every number in sections 8 and 9, but it checks each sequence on its own and covers the timing and text rules only. `scripts/qa.ts` checks the whole film in one pass, follows text that persists into later shots, and adds the composition rules below (focus, empty paper, clean paper, the gap, SIMULATED, the human line's lead, the bead's lead).

| Check | Rule |
|---|---|
| Camera moves | every move at least 40 frames, zero velocity at both ends |
| Camera vs text | no frame where the camera moves while any text is fading or rising in |
| Still moments | camera still across every declared check and decision window |
| Text size | every visible text item at or above 22 px (labels) or 44 px (sentences) on screen, every frame |
| Text in frame | every visible text item inside the frame with a 40 px margin |
| Reading time | each text item fully readable for at least 10 frames per word, minimum 20 |
| Label delay | each label starts 4 to 6 frames after its subject arrives |
| Clean paper | text boxes (measured with `@remotion/layout-utils`) never intersect a registered line or shape |
| Verbatim | every on screen string comes from one text registry, compared character for character (curly apostrophes included) with an explicit list of the storyboard's on-screen strings. Bold alone is not the test: the storyboard also bolds words that never appear on screen, and the ghost names are not bold |
| Numbers | no digits on screen except 30 MIN, 60 MIN and "60 min" |
| Gap | from F1392 (the first frame of Sequence 5) until the decision closes in Sequence 7, the gap is drawn and unobstructed whenever the case is in frame |
| SIMULATED | whenever the Transfer room is in frame, its SIMULATED label is too, at 22 px or more |
| Human line | it reaches each threshold before Priora's crossing frame (Sequence 6); no crossing in Sequence 7 |
| Narration | no overlapping lines; `narration.srt` is generated from the same data as the timing |

Pixel checks on rendered stills: empty paper at least 40 percent of the frame (pixels within a small colour distance of paper), and a texture stability test (two consecutive frames with a still camera must be identical wherever nothing moves, so grain and ink texture provably never boil).

### 10.3 Renders

| Deliverable | Settings |
|---|---|
| `renders/Priora film master.mp4` | H.264, CRF 16, yuv420p, 1920 × 1080, 30 fps; sent in the chat, not committed |
| `renders/Priora film master.mov` | ProRes 422 HQ, 10 bit: skipped for now (decision 12) |
| `renders/Priora film review with subtitles.mp4` | H.264, the review composition with burned in narration subtitles |
| Review MP4s | half resolution (960 × 540), one per sequence while building |

---

## 11. Risks

| Risk | What I will do |
|---|---|
| Video files are large; GitHub refuses files over 100 MB | `renders/` is ignored by git; the films are sent in the chat (decision 12) |
| Ink texture filters can shimmer when shapes move by fractions of a pixel | handled in Step 2: fine flecks fade out below zoom 1.0 and are gone at 0.6, and every pattern is fixed to its shape. The stability check still runs on every Step 3 render |
| Render time with many filters | measured in Step 2; the half resolution review renders keep iteration fast |
| Text widths come from the Plex font files (Medium and SemiBold estimated from the variable font's default instance) | the Step 2 stills confirmed every placement on screen; `@remotion/layout-utils` measures exactly in the Step 3 checker |
| The recorded voice will not match 2.3 words per second exactly | the timeline reads word times from `narration.ts`; a recording replaces them and the checker reruns |

---

## 12. Questions, answered

| # | Question | Answer |
|---|---|---|
| Q1 | "R · M · T" beneath the room names | Cut. The full room names are enough. |
| Q2 | Words for the three simulated Transfer agents | CARRIER, CAPACITY and BROKER. No company names; all three stay dashed. |
| Q3 | The closing "Priora" | The Priora wordmark: IBM Plex Sans SemiBold, tracking minus 15/1000 em, ink #111111. Ink token #111111, paper #F5F3EE. |
| Q4 | Where the masters go | `renders/` is ignored by git. The H.264 film and the subtitled version are sent in the chat; ProRes is skipped for now. |
