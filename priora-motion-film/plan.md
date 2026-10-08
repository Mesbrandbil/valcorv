# Priora motion film: plan

Step 1 of the production brief. Status: **draft for review. Nothing is built yet.**

Sources, in order of authority:

1. `Priora storyboard.md`: story, timing, copy and meaning. Saved verbatim from the file you sent.
2. `Production brief.md`: how to build it (your prompt, saved verbatim so the rules travel with the project).
3. This plan: how the two are reconciled, with every conflict flagged rather than silently resolved.

Conventions used below:

- **World units.** The world is one SVG sheet, 5760 × 3240 units, origin top left, y down. At camera zoom 1.0 one unit is one screen pixel at 1080p.
- **On screen size** = world size × zoom. Every text size in this plan is checked on screen, not in the world.
- **Angles** are degrees clockwise from +x (y down): 270 is 12 o'clock, 0 is 3 o'clock, 90 is 6 o'clock, 180 is 9 o'clock.
- **Frames** are absolute film frames, F0000 to F2699, 30 fps.
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
| Speed | 45 frames in about 8 s including bundling; a full 2700 frame pass should take minutes |
| Browser | the pre-installed Chromium headless shell (`--browser-executable`) |

**One deviation: fonts.** `@remotion/google-fonts` cannot load here. Remotion launches Chrome with the proxy disabled, so the font files fail certificate checks, and the only switch that gets past it disables TLS verification, which I will not do. The fix: the same IBM Plex Sans (variable, latin) and IBM Plex Mono 500 (latin) files are fetched once from Google Fonts and kept in `public/fonts`, loaded with `@remotion/fonts` and held with `delayRender` until they are ready. Identical glyphs, and renders no longer depend on the network. On your Mac either route works; the local files are the more reproducible one.

---

## 2. Architecture

One composition, `priora-film`, 1920 × 1080, 30 fps, 2700 frames, plus `priora-film-review` (same film with narration subtitles burned in). Composition IDs use hyphens because Remotion does not allow spaces in them.

```
priora-motion-film/
  Priora storyboard.md     Production brief.md     plan.md
  narration.srt            sound cues.md
  public/fonts/            public/textures/paper-grain.png (generated)
  public/audio/            empty slot: narration and sound drop in here
  src/index.ts             src/Root.tsx (compositions)
  src/lib/
    tokens.ts              colours, stroke weights, dash pattern, easing curves
    timeline.ts            every frame range, as named constants (SEQ1 … SEQ8 and every beat)
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
    qa.ts                  timeline lint (see section 10)
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
- **Readable labels.** Persistent labels that must survive big zoom changes (room names, SIMULATED, statuses) use a damped size: world size ∝ zoom^-0.8, so they grow a little as the camera approaches and never fall under 22 px. Transient labels use plain world size and are only shown while the camera is still.
- **Texture.** Paper grain is generated once with `feTurbulence` (fixed seed), saved as a tile and laid in world space, so it stays with the sheet and never changes. Ink texture is an SVG `feTurbulence` mask per coloured shape, fixed seed per shape, in that shape's own coordinates, so it moves with the shape and never boils. No film grain, no animated noise.
- **Audio slot.** Both compositions take optional `narration` and `sound` props; when a file is present in `public/audio` an `<Audio>` track plays it. With nothing there, the film renders silent.
- **Review subtitles.** The review composition draws the SRT lines in screen space, small, near the bottom edge.

---

## 3. Design tokens

As in the brief, tuned only after stills: Paper #F3EEE3, Ink #151515, Cobalt #2443B5, Coral #D9785F, Stone #C8C0B0, Cream #E9E2D2, Grey text #8C877D. One extra value: the welding spark is white #FFFFFF, as the storyboard asks.

Easing: default `cubic-bezier(0.45, 0, 0.15, 1)`; arrivals `cubic-bezier(0.2, 0.7, 0.2, 1)`; nothing else, no springs.

---

## 4. World layout

### 4.1 Territories

| Territory | Extent (world units) |
|---|---|
| Site panel (left) | circle centre (1300, 1500), radius 600, title above to y 790 |
| Real world (lower centre) | x 2260 to 3500, y 2104 (service block top) to 2352 (labels) |
| Record line (under the real world) | y 2440, x 2260 to 3500 |
| Decision rooms (right) | clover around a forecourt at (4440, 1560); x 3686 to 5194, y 985 to 2380, labels to about y 840 and 2470 |
| Margins | at least 380 units of empty paper to every sheet edge |

The full sheet view (Sequence 8) frames x 386 to 5575, so the sheet edge is never in frame.

### 4.2 Real world

| Name | Value |
|---|---|
| GROUND | y 2300, drawn from x 2260 to 3500 |
| WORKER | feet (2480, 2300), height 156 (hard hat top y 2144) |
| WORKER_PHONE_REST | (2510, 2224) |
| WORKER_PHONE_RAISED | (2526, 2168) |
| SITE | base centre (2880, 2300); hall x 2740 to 3040, roof y 2190; service block x 2756 to 2836, top y 2104 |
| SITE_WINDOW | centre (2950, 2240), 30 × 20 |
| SPARK | (2950, 2240), inside the window |
| SITE_ROOF_EMIT | (2890, 2190), where the conditions line leaves the factory |
| RISK_OWNER | base centre (3300, 2300); desk top y 2232, x 3226 to 3386; head centre (3316, 2152) |
| DESK_ORIGIN | (3386, 2232), desk top right corner. The human decision line starts here, always |
| PACKET_DOCK | (3480, 2100), where the packet stops at the desk |
| Labels WORKER, SITE, RISK OWNER | baselines y 2352, centred at x 2480, 2880, 3300; mono 24 |
| RECORD_LINE | y 2440, x 2260 to 3500 |
| RECORD_MARK_1 | x 2950 (under the window), 24 tall, Sequence 4 |
| RECORD_MARK_2 | x 3300 (under the risk owner), 24 tall, Sequence 8 |
| RECORD KEPT | centred (2950, 2494) |
| NO ONE DISTURBED | left aligned at (3420, 2166) |

### 4.3 Sequence 1 overlay

| Name | Value |
|---|---|
| SENTENCE_1 "Real work in the middle." | centred (2880, 1764) baseline, Plex Sans SemiBold 52 |
| SENTENCE_2 "Agents around it." | centred (2880, 1840) baseline, cobalt, 52 |
| PRIORA_S1 | (2880, 1950), the top of the orbit |
| ORBIT_S1 ellipse | centre (2880, 2232), rx 780, ry 282 |
| Specialist stations on the ellipse | 62°, 128°, 180°, 232°, 298° measured from the top, clockwise |

### 4.4 Voice note and case assembly (Sequence 2)

| Name | Value |
|---|---|
| VOICE_TEXT | left edge x 2540; line 1 baseline 1984, line 2 baseline 2030; Plex Sans Medium 30 (45 px at zoom 1.5) |
| Line breaks | "Hey, the bracket by the packing line has cracked again." / "We're going to weld it before the night shift." |
| VOICE_WAVE | baseline y 2072, grows from x 2556 to 3450, amplitude up to 16 |
| VOICE_STEM | short ink stem from WORKER_PHONE_RAISED up to (2556, 2072) |
| PRIORA_LISTEN | (3520, 1890), above and to the right |
| LISTEN_THREAD | from Priora's bead down the right side of the text, then left along the waveform baseline to its growing tip, so it never crosses a word |
| CASE_A | (2890, 1700), directly above the factory roof so the conditions line rises straight into the bottom facet |
| PRIORA_CASE | (2690, 1670), left of the case, so the photo request thread falls to the worker without crossing the case |

### 4.5 The case (local coordinates, never rotates)

| Part | Value |
|---|---|
| Core | ink dot, radius 9: the actual job |
| Thin ring | cobalt, radius 34, 2.5 wide |
| Facets | open radius 92 (chip: mark plus label), folded radius 52 (mark only), tucked radius 46 (packet) |
| Facet angles | REPAIR 270, BEFORE NIGHT SHIFT 330, HOT WORK 30, SITE + INSURANCE CONDITIONS 90, PHOTO 150, PACKING LINE 210 |
| Findings ring | radius 70 when assembled, 58 in the packet; stroke 9 |
| Arcs | Insurer conditions 66 to 114 (48°, the future gap); Evidence check 114 to 192; Risk engineering 192 to 270; Site rules 270 to 348; Fire 348 to 66 |
| The gap | centred at 90° (6 o'clock), 48° wide; coral caps at 66° and 114° |

Why these angles: in Sequence 2 the conditions line rises from the factory straight below (90°) and the photo comes up from the worker below left (150°). In the panel each facet sits next to the agent that examines it, Fire and Insurer conditions sit side by side for the FIRE WATCH? exchange, and every arc slides at most 29° to lock into the ring. Below the packet is where Mitigate's safeguards rise into the gap.

### 4.6 Site panel

| Name | Value |
|---|---|
| PANEL_CENTRE P | (1300, 1500) |
| Wall | circle radius 600, stone, 3 wide; entrance gap centred at 0°, ±14° (chord about 290) |
| PANEL_ENTRANCE | (1900, 1500) |
| Table | open ring, pale cream band 14 wide at radius 280; the inside is clean paper, so labels can sit there |
| Seats | 8 stone rings, radius 34, at radius 360 from P, at 22.5° + 45°·k |
| s0 22.5° (1633, 1638) | Fire |
| s1 67.5° (1438, 1833) | Insurer conditions |
| s2 112.5° (1162, 1833) | ghost: Electrical |
| s3 157.5° (967, 1638) | Evidence check |
| s4 202.5° (967, 1362) | Risk engineering |
| s5 247.5° (1162, 1167) | ghost: Structural |
| s6 292.5° (1438, 1167) | Site rules |
| s7 337.5° (1633, 1362) | ghost: Security |
| Agent names | Plex Sans Medium 34, on clean paper just outside each seat (below for bottom seats, above for top seats, beside for side seats), inside the wall |
| "Site panel" | centred (1300, 822) baseline, Plex Sans SemiBold 46 |
| "CONFIGURED FOR THIS SITE" | centred (1300, 866) baseline, mono 30 |
| PRIORA_PANEL | (2010, 1470), outside the entrance; Priora conducts, it is never seated |
| CASE_AT_TABLE | P |
| Fire watch rulers (Sequence 5) | inside the table, under the case: common origin x 1105; 30 MIN solid 150 long at y 1628, 60 MIN dashed 300 long at y 1686; labels above each, mono 24 |
| Barrier (Sequence 5) | pale incomplete outline across the route just outside the entrance, about (2080, 1560) |

The seats are balanced (five agents, three ghosts, no two ghosts adjacent), and the last two to arrive, Fire and Insurer conditions, take the seats nearest the entrance.

### 4.7 Decision rooms

| Name | Value |
|---|---|
| FORECOURT F | (4440, 1560), stone ring radius 110 |
| Rooms | radius 330 (outer), broad flat band 28 wide, paper inside, opening of 44° facing F |
| RETAIN | centre (4016, 1315), F + 490 at 210°; coral band |
| MITIGATE | centre (4440, 2050), F + 490 at 90°; cobalt band |
| TRANSFER | centre (4864, 1315), F + 490 at 330°; stone band with a dashed cobalt perimeter |
| Thresholds (opening mid points) | Retain (4302, 1480); Mitigate (4440, 1720); Transfer (4578, 1480) |
| PATH_DESK_FORECOURT | from DESK_ORIGIN (3386, 2232) to the forecourt rim (4345, 1615); cubic, controls (3700, 2232) and (4150, 1720) |
| Spurs | forecourt rim to each threshold, short and straight |
| Room labels | name (Plex Sans SemiBold 60, readable sizing) and status (mono 30) on the outer side of each room: above Retain and Transfer, below Mitigate |
| Transfer labels | SIMULATED and NO INSURER ON PRIORA YET stacked above Transfer |
| Mitigate interior | packet just inside the threshold (4440, 1880); SUGGESTIONS FROM A REVIEWED LIBRARY under it; three safeguards in a row near y 2150, each with name, disc stack (cost) and open clock arc (time) |
| Retain interior | packet at (4030, 1300); coral bridge across its gap; three small room agents; four leaders to EXPOSURE, AUTHORITY, CONDITIONS, EXPIRY |
| Transfer interior | packet at (4850, 1320); three dashed agents near the outer wall with small openings in the wall beside them |

Visiting order sweeps one way round the clover: Retain (upper left), across the forecourt to Mitigate (below), on to Transfer (upper right). Sequence 7 continues the same direction: Mitigate, Transfer, Retain. Transfer sits on the outer edge of the composition, which suits "outside capacity", and has clean paper above it for its two persistent labels.

### 4.8 Paths, defined once

| Path | From → to |
|---|---|
| ROUTE_CASE_TO_PANEL | CASE_A → PANEL_ENTRANCE, a gentle arc above the real world (Sequence 3) |
| ROUTE_WORK | from the closed ring at P, out through PANEL_ENTRANCE, down across the paper to SITE_WINDOW (Sequence 4). Drawn once, visible to the end |
| ROUTE_ESCALATE | PANEL_ENTRANCE → PACKET_DOCK, arcing above the worker and the factory (Sequence 5) |
| PATH_DESK_FORECOURT plus spurs | the risk owner to every room threshold (Sequences 6 and 7) |
| HUMAN_LINE | always starts at DESK_ORIGIN and runs along PATH_DESK_FORECOURT and the spurs |
| RECORD_DROP | PACKET_DOCK → RECORD_MARK_2 (Sequence 8) |

---

## 5. Cast

All glyphs are cobalt with ink texture unless noted. Sizes are world units.

| Character | Silhouette | Size | Movement signature |
|---|---|---|---|
| Priora | cobalt ring with a generous paper opening (outer radius 30, inner 14), fine orbit radius 50, one bead radius 6 | 112 across with orbit | long smooth glides; the bead turns to the target about 6 frames before the ring moves |
| Site rules | two stacked semicircles | 56 | aligns: pieces slide into register |
| Insurer conditions | two opposing brackets with a narrow opening | 56 | closes around a detail; from Sequence 5 its pieces stay a few units apart |
| Fire | disc with a clean wedge removed | 56 | turns its wedge towards the activity |
| Risk engineering | arch with a semicircular opening | 56 | opens out to examine its surroundings |
| Evidence check | softened square with a small round aperture | 56 | frames and settles over an image |
| Ghost agents (3) | dashed stone outlines in the same family, labelled Electrical, Structural, Security in grey | 56, about 20 percent opacity | still |
| Transfer agents (3) | dashed outline glyphs, lighter than the site agents | 50 | still; answer with hollow pieces |
| Room agents (Retain) | small cobalt dots and half rings | 24 | gather around the packet |
| Safeguards (Mitigate) | three small glyphs, each with a disc stack and an open clock arc | 48 | lift, try the gap, return |
| Case | see 4.5 | 124 open with arcs, 116 as packet | carried; never transforms into another symbol |
| Worker, site, risk owner | solid ink silhouettes with a worn texture and barely there contact shadows | as 4.2 | print-like arrivals; the risk owner never moves |
| Human decision line | ink, 5 px on screen | | draws from the desk; reaches each threshold before Priora crosses |
| Agent threads | cobalt, 2 px on screen, dotted where the storyboard says dotted | | dots travel at a steady speed |

A cast sheet (every agent side by side, at three zoom levels) is the first still of Step 2.

---

## 6. Camera

### 6.1 Named shots

Shot = centre (x, y) and zoom. View = 1920/zoom by 1080/zoom world units.

| Shot | Centre | Zoom | View (world) | Used for |
|---|---|---|---|---|
| S1_REAL | (2880, 2100) | 1.00 | x 1920–3840, y 1560–2640 | Sequence 1 |
| S2_VOICE | (2940, 2110) | 1.50 | x 2300–3580, y 1750–2470 | the voice note |
| S2_CASE | (2820, 1870) | 1.40 | x 2134–3506, y 1484–2256 | case assembly and the photo |
| S3_PANEL | (1460, 1490) | 0.72 | x 127–2793, y 740–2240 | panel arrives, specialists summoned |
| S3_TABLE | (1360, 1500) | 1.15 | x 525–2195, y 1030–1970 | checks at the table, Priora outside |
| S4_CASE | (1300, 1500) | 1.70 | x 735–1865, y 1182–1818 | arcs lock into the ring |
| S4_ROUTE | (2760, 2000) | 0.96 | x 1760–3760, y 1437–2563 | route to the work, record, no one disturbed |
| S5_GAP | (2050, 1800) | 0.95 | x 1040–3060, y 1232–2368 | the slip, rulers, barrier, spark in the distance |
| S5_DESK | (3330, 2120) | 1.30 | x 2592–4068, y 1705–2535 | the packet at the desk, the human line |
| S6_ROOMS | (4190, 1655) | 0.62 | x 2642–5738, y 784–2526 | rooms appear |
| S6_RETAIN | (4016, 1300) | 1.25 | x 3248–4784, y 868–1732 | Retain |
| S6_MITIGATE | (4440, 2040) | 1.25 | x 3672–5208, y 1608–2472 | Mitigate |
| S6_TRANSFER | (4864, 1260) | 1.25 | x 4096–5632, y 828–1692 | Transfer |
| S7_SYSTEM | (4190, 1655) | 0.62 | as S6_ROOMS | rooms working together, the desk |
| S8_SHEET | (2980, 1640) | 0.37 | x 386–5575, y 181–3099 | the whole system |

Text floors this implies (22 px labels, 44 px sentences): at zoom 0.62 a label needs world size 36 or more; at 0.37, 60 or more and sentences 119 or more. Labels sized for a close shot fade before the camera pulls back past their floor.

### 6.2 Keyframes

Frame accurate keyframes are in section 8 (one list per sequence) and are consolidated in `camera-keys.ts` at build time. Rules every keyframe obeys: every move eases in and out with the default curve and lasts at least 40 frames; the camera is fully still (no drift) whenever text is appearing, during agent checks and during decision moments.

---

## 7. Sequences at a glance

| Seq | Frames | Focal subject | On screen text (verbatim) |
|---|---|---|---|
| 1 Real work in the middle | F0000–0239 | worker, site and risk owner on the ground line; then Priora and the orbit of five specialists | Real work in the middle. · WORKER · SITE · RISK OWNER · Agents around it. |
| 2 A voice becomes a case | F0240–0659 | the worker's voice note, then the case assembling above the factory | the worker's message, word for word · REPAIR · HOT WORK · PACKING LINE · BEFORE NIGHT SHIFT · SITE + INSURANCE CONDITIONS · PHOTO · Photo of the bracket? · CASE |
| 3 The site chooses its cast | F0660–1139 | the site panel: specialists summoned through the entrance, checks at the table, Priora outside | Site panel · CONFIGURED FOR THIS SITE · Electrical · Structural · Security · Evidence check · Risk engineering · Site rules · Fire · Insurer conditions · FIRE WATCH? |
| 4 When the conditions hold | F1140–1409 | the ring locking, then the route to the work and the quiet desk | INSIDE THE CONDITIONS · RECORD KEPT · NO ONE DISTURBED |
| 5 A condition slips | F1410–1709 | the gap; the fire watch rulers; then the packet carried to the risk owner and the human line | FIRE WATCH PLANNED: 30 MIN · POLICY ASKS: 60 MIN · NO HARD STOP CONFIGURED · DECISION PACKET · RISK OWNER DECIDES |
| 6 Three decision rooms | F1710–2339 | the clover, then Retain, Mitigate and Transfer in turn | Retain · Mitigate · Transfer · R · M · T · DESIGN PROPOSAL (×2) · SIMULATED |
| 6 Retain | F1710–1919 | the closed threshold; the human line opens it; the bridged gap | AN AGENT CANNOT CHOOSE IT · NO ANSWER DOES NOT CHOOSE IT · RISK OWNER · EXPOSURE · AUTHORITY · CONDITIONS · EXPIRY |
| 6 Mitigate | F1920–2129 | three safeguards tried in the gap | Thermal check · Extend watch to 60 min · Move weld to workshop · SUGGESTIONS FROM A REVIEWED LIBRARY · PARTIAL · FULL · BACK INSIDE |
| 6 Transfer | F2130–2339 | the dashed room asking simulated capacity | SIMULATED · NO INSURER ON PRIORA YET · ELIGIBILITY · TERMS · SAFEGUARDS · PRICE ? |
| 7 The rooms work together | F2340–2519 | one packet moving through all three rooms, then the decision at the desk | MITIGATE PART · WHAT WOULD IT COST? · KEEP THE REST · RISK OWNER DECIDES |
| 8 The whole system | F2520–2699 | the whole sheet; then the final statement; then the name | THE COMPLETE SYSTEM IS A DESIGN PROPOSAL · ONE PRIORA AGENT · A CONFIGURABLE SITE PANEL · THREE DECISION ROOMS · FIRST: HOT WORK · POSSIBLY LATER: OTHER INSURED ACTIVITIES · Priora turns physical work / into explicit risk decisions, / while the work happens. · Priora |

---

## 8. Beat sheets

(Filled in from the per sequence analysis.)

---

## 9. Narration fit at 2.3 words per second

(Filled in.)

---

## 10. Review loop and automatic checks

### 10.1 The loop

Exactly the order in the brief, no skipping:

1. **This plan**, approved by you.
2. **Static world.** Every element in its final resting state. Stills: the whole sheet; each territory up close (real world and record line, site panel, the clover with its forecourt, each room); a cast sheet with every agent side by side at zoom 0.37, 1.0 and 1.7; a case sheet with every state of the case (first circle, open chips, folded, ring locked, gap, packet, bridged, decided). Proportions, spacing and colour are fixed here, before any animation.
3. **One sequence at a time.** Build; render at least 6 stills (start, end, every key moment in the storyboard) to `stills/sequence N`; render a half resolution MP4; write every problem into `stills/sequence N/review.md`; fix; re-render. A sequence is done only after it passes the checklist twice in a row.
4. **Full film** at half resolution, checking that the camera journeys feel continuous; then the masters.

### 10.2 Automatic checks (`npm run qa`)

The checklist is also enforced by a lint that reads the timeline, layout, camera keys and the text registry, so a broken rule fails before anything is rendered:

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
| Verbatim | every on screen string appears in the storyboard's bold text, and every bold string appears on screen |
| Numbers | no digits on screen except 30 MIN, 60 MIN and "60 min" |
| Gap | from F1410 until the decision closes in Sequence 7, the gap is drawn and unobstructed whenever the case is in frame |
| SIMULATED | whenever the Transfer room is in frame, its SIMULATED label is too, at 22 px or more |
| Human line | it reaches each threshold before Priora's crossing frame |
| Narration | no overlapping lines; `narration.srt` is generated from the same data as the timing |

Pixel checks on rendered stills: empty paper at least 40 percent of the frame (pixels within a small colour distance of paper), and a texture stability test (two consecutive frames with a still camera must be identical wherever nothing moves, so grain and ink texture provably never boil).

### 10.3 Renders

| Deliverable | Settings |
|---|---|
| `renders/Priora film master.mp4` | H.264, CRF 14 (better than the CRF 16 floor, so the grain survives), yuv420p |
| `renders/Priora film master.mov` | ProRes 422 HQ, 10 bit |
| `renders/Priora film review with subtitles.mp4` | H.264, the review composition with burned in narration subtitles |
| Review MP4s | half resolution (960 × 540), one per sequence while building |

## 12. Risks

| Risk | What I will do |
|---|---|
| The ProRes master is about 2 to 2.5 GB; GitHub refuses files over 100 MB | see decision D6 below |
| Ink texture filters can shimmer when shapes move by fractions of a pixel | test early in Step 2 with the stability check; lower the noise frequency or snap the texture to its shape if needed |
| Render time with many filters | measured in Step 2; the half resolution review renders keep iteration fast |
| Plex text widths in this plan are estimates | measured with `@remotion/layout-utils` in Step 2, line breaks fixed by hand |

---

## 11. Decisions I need from you

(Filled in.)
