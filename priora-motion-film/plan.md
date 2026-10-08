# Priora motion film: plan

Step 1 of the production brief. Status: **for your review. Nothing is built yet.**

## 0. Where it stands

| | |
|---|---|
| **Length** | **2988 frames, 99.6 seconds** (F0000–F2987) |
| Rules | every motion, text and composition rule in the brief, unchanged. A checker verifies each one frame by frame for the timings below |
| Sequences 1–5 | unchanged from the storyboard: F0000–F1709, every one fits |
| Sequence 6 | 660 frames instead of 630 (Retain 239, Mitigate 224, Transfer 197) |
| Sequence 7 | 225 frames instead of 180 |
| Sequence 8 | 393 frames instead of 180: a bare minimum of 348 plus 45 frames of room to breathe |

Your decisions, applied to the storyboard and to this plan:

1. Narration, Sequence 2: "Priora hears the job, and asks for a photo." The worker's phone message stays as written and is timed at 2.7 words per second; all narration is timed at 2.3.
2. Narration, Sequence 5: "One condition slips: the fire watch is half the policy. Priora brings it to the risk owner. Agents prepare, the human decides."
3. Retain: "NO ANSWER DOES NOT CHOOSE IT" and its clock arc are cut.
4. Mitigate: "SUGGESTIONS FROM A REVIEWED LIBRARY" is cut. PARTIAL, FULL and BACK INSIDE stay.
5. Sequence 7: the human line is drawn once, at the final close, and "WHAT WOULD IT COST?" is cut. To keep the brief's rule true (the black line reaches each threshold before Priora crosses it), Priora brings the packet *to* each doorway and does not cross; each room's proposal comes out to meet it there. The storyboard now says this.
6. Sequence 8: "FIRST: HOT WORK · POSSIBLY LATER: OTHER INSURED ACTIVITIES" and the approaching dashed glyph are cut. The sequence takes the length it needs: a half second of near silence after the voice, then the dissolve, then a full second of "Priora" alone.
7. The film is not forced to 2700 frames, and no rule was loosened to make anything fit.

Why the cuts saved less than they might seem to (108 frames in all): the cut labels mostly sat beside the action rather than in its path. What now sets each overrunning part:

| Part | What sets its length |
|---|---|
| Retain (+29) | the room reveal (40 frame move, then names and statuses on a still camera, read before the camera moves on) plus the 40 frame approach, before Retain's own action can start |
| Mitigate (+14) | two previews in sequence (thermal check, then the longer watch), each with its arrival, label, reading time and withdrawal |
| Sequence 7 (+45) | three doorway stops plus the decision ending: return, the line closing, marks turning solid, the pulse, then RISK OWNER DECIDES held still until read (the camera is still during decision moments) |
| Sequence 8 (+213) | the 40 frame withdrawal, "THE COMPLETE SYSTEM IS A DESIGN PROPOSAL" (7 words, 70 frames of reading), the narrated statement (157 frames), the 45 frame dissolve, and the 45 frames of air |

Section 12 lists the open questions; section 13 lists storyboard levers that would shorten the film further, if you want them.

Sources, in order of authority:

1. `Priora storyboard.md`: story, timing, copy and meaning. Saved from the file you sent, with your decisions above written into it.
2. `Production brief.md`: how to build it (your prompt, saved verbatim so the rules travel with the project).
3. This plan: how the two are reconciled, with every conflict flagged rather than silently resolved.

Conventions used below:

- **World units.** The world is one SVG sheet, 5760 × 3240 units, origin top left, y down. At camera zoom 1.0 one unit is one screen pixel at 1080p.
- **On screen size** = world size × zoom. Every text size in this plan is checked on screen, not in the world.
- **Angles** are degrees clockwise from +x (y down): 270 is 12 o'clock, 0 is 3 o'clock, 90 is 6 o'clock, 180 is 9 o'clock.
- **Frames** are absolute film frames, F0000 to F2987, 30 fps.
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

One composition, `priora-film`, 1920 × 1080, 30 fps, 2988 frames (the length comes from `timeline.ts`, never typed twice), plus `priora-film-review` (the same film with narration subtitles burned in). Composition IDs use hyphens because Remotion does not allow spaces in them.

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
| Decision rooms (right) | clover around a forecourt at (4440, 1560); x 3686 to 5194, y 985 to 2380; labels above Retain and Transfer to about y 830, Mitigate's to its right |
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
| Table | open ring, pale cream band 14 wide at radius 300; the inside (radius 293) is clean paper, so labels can sit there |
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
| "CONFIGURED FOR THIS SITE" | centred (1300, 868) baseline, mono 32 (23 px at zoom 0.72) |
| PRIORA_PANEL | (2010, 1470), outside the entrance; Priora conducts, it is never seated |
| CASE_AT_TABLE | P |
| Fire watch rulers (Sequence 5) | inside the table, under the case's gap: common origin x 1100; label baselines y 1610 and 1676 (mono 24, 23 px at zoom 0.95); 30 MIN ruler solid, 150 long, under the first label; 60 MIN ruler dashed, 300 long, under the second |
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
| Room labels | name (Plex Sans SemiBold, readable sizing, 40 to 46 px) and status (mono, readable sizing, 25 to 28 px): above Retain at (4016, 925) and (4016, 965); right of Mitigate at (4800, 2090) and (4800, 2132); above Transfer |
| Transfer labels | SIMULATED and NO INSURER ON PRIORA YET stacked above Transfer |
| Mitigate interior | packet just inside the threshold (4440, 1880); three safeguards in a row near y 2150, each with name, disc stack (cost) and open clock arc (time) |
| Retain interior | packet at (4030, 1300); coral bridge across its gap; three small room agents; four leaders to EXPOSURE, AUTHORITY, CONDITIONS, EXPIRY |
| Transfer interior | packet at (4850, 1320); three dashed agents near the outer wall with small openings in the wall beside them |

Visiting order sweeps one way round the clover: Retain (upper left), across the forecourt to Mitigate (below), on to Transfer (upper right). Sequence 7 continues the same direction, doorway to doorway without crossing: Mitigate, Transfer, Retain. Transfer sits on the outer edge of the composition, which suits "outside capacity", and has clean paper above it for its two persistent labels.

### 4.8 Paths, defined once

| Path | From → to |
|---|---|
| ROUTE_CASE_TO_PANEL | CASE_A → PANEL_ENTRANCE, a gentle arc above the real world (Sequence 3) |
| ROUTE_WORK | from the closed ring at P, out through PANEL_ENTRANCE, down across the paper to SITE_WINDOW (Sequence 4). Drawn once, visible to the end |
| ROUTE_ESCALATE | PANEL_ENTRANCE → PACKET_DOCK, arcing above the worker and the factory (Sequence 5) |
| PATH_DESK_FORECOURT plus spurs | the risk owner to every room threshold (Sequence 6), and the route back to the desk (Sequence 7) |
| DOORWAY_TOUR | forecourt → Mitigate doorway → Transfer doorway → Retain doorway → PACKET_DOCK (Sequence 7; Priora stops at each threshold and never crosses) |
| HUMAN_LINE | always starts at DESK_ORIGIN; runs along PATH_DESK_FORECOURT and the spurs in Sequence 6; in Sequence 7 it is drawn once, from the desk round the decided packet at PACKET_DOCK |
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
| Ghost agents (3) | dashed stone outlines in the same family, labelled Electrical, Structural, Security in grey | 56, about 20 percent opacity | still; fade during Sequence 4's first move |
| Transfer agents (3) | dashed outline glyphs, lighter than the site agents; role labels pending question Q2 | 50 | still; answer with hollow pieces |
| Room agents (Retain) | small cobalt dots and half rings | 24 | gather around the packet |
| Safeguards (Mitigate) | three small glyphs, each with a disc stack and an open clock arc | 48 | lift, try the gap, return |
| Case | see 4.5 | 124 open with arcs, 116 as packet | carried; never transforms into another symbol |
| Worker, site, risk owner | solid ink silhouettes with a worn texture and barely there contact shadows | as 4.2 | print-like arrivals; the risk owner never moves |
| Human decision line | ink, 5 px on screen | | draws from the desk; in Sequence 6 reaches each threshold before Priora crosses; in Sequence 7 drawn once, at the final close |
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
| S3_PANEL | (1460, 1440) | 0.72 | x 127–2793, y 690–2190 | panel arrives, specialists summoned |
| S3_TABLE | (1360, 1500) | 1.15 | x 525–2195, y 1030–1970 | checks at the table, Priora outside |
| S4_CASE | (1300, 1500) | 1.70 | x 735–1865, y 1182–1818 | arcs lock into the ring |
| S4_ROUTE | (2760, 2000) | 0.96 | x 1760–3760, y 1437–2563 | route to the work, record, no one disturbed |
| S5_GAP | (2050, 1800) | 0.95 | x 1040–3060, y 1232–2368 | the slip, rulers, barrier, spark in the distance |
| S5_DESK | (3330, 2120) | 1.30 | x 2592–4068, y 1705–2535 | the packet at the desk, the human line |
| S6_ROOMS | (4190, 1610) | 0.62 | x 2642–5738, y 739–2481 | rooms appear |
| S6_RETAIN | (3990, 1300) | 1.25 | x 3222–4758, y 868–1732 | Retain |
| S6_MITIGATE | (4440, 2040) | 1.25 | x 3672–5208, y 1608–2472 | Mitigate |
| S6_TRANSFER | (4864, 1260) | 1.25 | x 4096–5632, y 828–1692 | Transfer |
| S7_SYSTEM | (4190, 1610) | 0.62 | as S6_ROOMS | rooms working together, the desk |
| S8_SHEET | (2980, 1640) | 0.37 | x 386–5575, y 181–3099 | the whole system |

Text floors this implies (22 px labels, 44 px sentences): at zoom 0.62 a label needs world size 36 or more; at 0.37, 60 or more and sentences 119 or more. Labels sized for a close shot fade before the camera pulls back past their floor.

### 6.2 Keyframes

Every move eases in and out with the default curve and lasts at least 40 frames. Between moves the camera is completely still (no drift), so text can appear, checks can be read and decisions can land. These become `camera-keys.ts`.

| # | Frames | Camera | Shot (centre x, y, zoom) |
|---|---|---|---|
| 1 | F0000 | at S1_REAL | 2880, 2100, 1 |
| 2 | F0240–F0280 (40 f) | move S1_REAL → S2_VOICE | 2940, 2110, 1.5 |
| 3 | F0480–F0520 (40 f) | move S2_VOICE → S2_CASE | 2820, 1870, 1.4 |
| 4 | F0660–F0716 (56 f) | move S2_CASE → S3_PANEL | 1460, 1440, 0.72 |
| 5 | F0976–F1020 (44 f) | move S3_PANEL → S3_TABLE | 1360, 1500, 1.15 |
| 6 | F1140–F1184 (44 f) | move S3_TABLE → S4_CASE | 1300, 1500, 1.7 |
| 7 | F1264–F1316 (52 f) | move S4_CASE → S4_ROUTE | 2760, 2000, 0.96 |
| 8 | F1410–F1456 (46 f) | move S4_ROUTE → S5_GAP | 2050, 1800, 0.95 |
| 9 | F1586–F1640 (54 f) | move S5_GAP → S5_DESK | 3330, 2120, 1.3 |
| 10 | F1710–F1750 (40 f) | move S5_DESK → S6_ROOMS | 4190, 1610, 0.62 |
| 11 | F1793–F1833 (40 f) | move S6_ROOMS → S6_RETAIN | 3990, 1300, 1.25 |
| 12 | F1949–F1989 (40 f) | move S6_RETAIN → S6_MITIGATE | 4440, 2040, 1.25 |
| 13 | F2173–F2213 (40 f) | move S6_MITIGATE → S6_TRANSFER | 4864, 1260, 1.25 |
| 14 | F2370–F2410 (40 f) | move S6_TRANSFER → S7_SYSTEM | 4190, 1610, 0.62 |
| 15 | F2595–F2635 (40 f) | move S7_SYSTEM → S8_SHEET | 2980, 1640, 0.37 |
| 16 | to F2987 | hold S8_SHEET to the end | |

---

## 7. Sequences at a glance

| Seq | Frames | Focal subject | On screen text (verbatim) |
|---|---|---|---|
| 1 Real work in the middle | F0000–F0239 | worker, site and risk owner on the ground line; then Priora and the orbit of five specialists | Real work in the middle. · WORKER · SITE · RISK OWNER · Agents around it. |
| 2 A voice becomes a case | F0240–F0659 | the worker's voice note, then the case assembling above the factory | the worker's message, word for word · REPAIR · HOT WORK · PACKING LINE · BEFORE NIGHT SHIFT · SITE + INSURANCE CONDITIONS · PHOTO · Photo of the bracket? · CASE |
| 3 The site chooses its cast | F0660–F1139 | the site panel: specialists summoned through the entrance, checks at the table, Priora outside | Site panel · CONFIGURED FOR THIS SITE · Electrical · Structural · Security · Evidence check · Risk engineering · Site rules · Fire · Insurer conditions · FIRE WATCH? |
| 4 When the conditions hold | F1140–F1409 | the ring locking, then the route to the work and the quiet desk | INSIDE THE CONDITIONS · RECORD KEPT · NO ONE DISTURBED |
| 5 A condition slips | F1410–F1709 | the gap; the fire watch rulers; then the packet carried to the risk owner and the human line | FIRE WATCH PLANNED: 30 MIN · POLICY ASKS: 60 MIN · NO HARD STOP CONFIGURED · DECISION PACKET · RISK OWNER DECIDES |
| 6 Three decision rooms | F1710–F2369 | the clover, then Retain, Mitigate and Transfer in turn | Retain · Mitigate · Transfer · R · M · T · DESIGN PROPOSAL (×2) · SIMULATED |
| 6 Retain | F1710–F1948 | the closed threshold; the human line opens it; the bridged gap | AN AGENT CANNOT CHOOSE IT · RISK OWNER · EXPOSURE · AUTHORITY · CONDITIONS · EXPIRY |
| 6 Mitigate | F1949–F2172 | two safeguards tried in the gap | Thermal check · Extend watch to 60 min · Move weld to workshop · PARTIAL · FULL · BACK INSIDE |
| 6 Transfer | F2173–F2369 | the dashed room asking simulated capacity | SIMULATED · NO INSURER ON PRIORA YET · ELIGIBILITY · TERMS · SAFEGUARDS · PRICE ? · (the three agents' role labels, wording open: question Q2) |
| 7 The rooms work together | F2370–F2594 | one packet visiting the three doorways, then the decision at the desk | MITIGATE PART · KEEP THE REST · RISK OWNER DECIDES |
| 8 The whole system | F2595–F2987 | the whole sheet; then the final statement; then the name | THE COMPLETE SYSTEM IS A DESIGN PROPOSAL · ONE PRIORA AGENT · A CONFIGURABLE SITE PANEL · THREE DECISION ROOMS · Priora turns physical work / into explicit risk decisions, / while the work happens. · Priora |

Rules that span sequences, and where they hold:

- **The gap** opens at F1410 and is visible whenever the case is on screen until the human line closes round the decision in Sequence 7 (F2510–F2530). In Retain it is bridged with the original gap readable beneath; in Mitigate's preview the filling piece is dashed, so the gap still reads.
- **SIMULATED** is a persistent, readable sized label: visible and at least 22 px whenever Transfer is in frame, from F1764 to the end of the film, including the wide shots of Sequences 7 and 8.
- **The human line** always starts at DESK_ORIGIN. In Sequence 6 it reaches each doorway before Priora crosses; in Sequence 7 Priora does not cross, and the line is drawn once, at the close.
- **The spark** flickers from F1290 to the final dissolve, from a fixed, hand-made flicker pattern (no random noise).
- **The ghosts** fade during Sequence 4's first move and are gone well before Sequence 8.

---

## 8. Timeline and beat sheets

Generated from the same data the checker reads, so the numbers here are the checked ones. "Readable" is the number of frames each text item is fully visible, inside the frame with a 40 px margin and at or above its size floor; "needed" is 10 frames per word, minimum 20. Positions marked "set in Step 2" have their timing checked here and their exact place fixed against the stills.

| Part | Storyboard as first written | Tightest rule-clean length | New range | Length |
|---|---|---|---|---|
| Sequence 1: Real work in the middle | F0000–F0239 (240 f) | 238 f | F0000–F0239 | 240 f, 0:00.0–0:08.0 |
| Sequence 2: A voice becomes a case | F0240–F0659 (420 f) | 416 f | F0240–F0659 | 420 f, 0:08.0–0:22.0 |
| Sequence 3: The site chooses its cast | F0660–F1139 (480 f) | 470 f | F0660–F1139 | 480 f, 0:22.0–0:38.0 |
| Sequence 4: When the conditions hold | F1140–F1409 (270 f) | 268 f | F1140–F1409 | 270 f, 0:38.0–0:47.0 |
| Sequence 5: A condition slips | F1410–F1709 (300 f) | 297 f | F1410–F1709 | 300 f, 0:47.0–0:57.0 |
| Sequence 6, opening and Retain | F1710–F1919 (210 f) | 239 f | F1710–F1948 | 239 f, 0:57.0–1:05.0 |
| Sequence 6, Mitigate | F1920–F2129 (210 f) | 224 f | F1949–F2172 | 224 f, 1:05.0–1:12.4 |
| Sequence 6, Transfer | F2130–F2339 (210 f) | 197 f | F2173–F2369 | 197 f, 1:12.4–1:19.0 |
| Sequence 7: The rooms work together | F2340–F2519 (180 f) | 225 f | F2370–F2594 | 225 f, 1:19.0–1:26.5 |
| Sequence 8: The whole system | F2520–F2699 (180 f) | 348 f, 393 with air | F2595–F2987 | 393 f, 1:26.5–1:39.6 |
| **Film** | F0000–F2699 (2700 f, 90.0 s) | | F0000–F2987 | **2988 f, 99.6 s** |

### Sequence 1: Real work in the middle

F0000–F0239, 240 frames (0:00.0–0:08.0). Tightest rule-clean need 238 frames; the storyboard's 240 frames are kept, so 2 frames of air.

Camera: F0000 S1_REAL · hold to F0239

Narration: N1 "Real work in the middle: a worker, a site, a risk owner. Priora places agents around it." F0008–F0230 (17 words at 2.3 wps, 222 f)

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
| F0218–F0238 | hold: the whole relationship visible |

Hand-off: F240 to F266, under Sequence 2's opening camera move: the ellipse withdraws, the specialists drift to the edges and soften out, both sentences and the three labels fade, the bead turns to the worker (F240) and Priora glides on (F246 to F296). No new text.

Checker: every rule passes.

### Sequence 2: A voice becomes a case

F0240–F0659, 420 frames (0:08.0–0:22.0). Tightest rule-clean need 416 frames; the storyboard's 420 frames are kept, so 4 frames of air.

Camera: F0240 S1_REAL · move to S2_VOICE F0240–F0280 (40 f) · hold to F0480 · move to S2_CASE F0480–F0520 (40 f) · hold to F0660

Narration: W1 "Hey, the bracket by the packing line has cracked again. We're going to weld it before the night shift." F0274–F0486 (19 words at 2.7 wps, 212 f); N2 "Priora hears the job, and asks for a photo." F0508–F0626 (9 words at 2.3 wps, 118 f)

| Frames | Beat |
|---|---|
| F0240–F0280 | camera closer to the worker (Sequence 1 exit runs under it) |
| F0262–F0278 | worker raises the phone |
| F0274–F0489 | waveform grows from the phone with the voice; listening thread from the bead down the right side and along the baseline to the tip; cobalt dots travel back in small groups |
| F0282–F0291 | text **Hey, the bracket** (sentence, 44 px, readable 201 f, 30 needed) |
| F0304–F0316 | underline "bracket" |
| F0309–F0318 | text **by the packing line** (sentence, 44 px, readable 174 f, 40 needed) |
| F0338–F0352 | underline "packing line" |
| F0354–F0363 | text **has cracked again.** (sentence, 44 px, readable 129 f, 30 needed) |
| F0371–F0383 | coral underline "cracked" |
| F0387–F0396 | text **We're going to weld it** (sentence, 44 px, readable 96 f, 50 needed) |
| F0426–F0438 | underline "weld" |
| F0443–F0452 | text **before the night shift.** (sentence, 44 px, readable 40 f, 40 needed) |
| F0480–F0520 | camera rises with the phrases (the last words appeared at F452) |
| F0482–F0496 | underline "before the night shift" |
| F0484–F0520 | Priora: bead leads, glides to the case position |
| F0490–F0505 | remaining words fade to pale grey |
| F0494–F0514 | phrases separate gently |
| F0506–F0526 | grey words and waveform fade fully out |
| F0510–F0540 | phrases glide to positions around the core |
| F0512–F0532 | Priora draws the thin circle |
| F0528–F0538 | core dot prints |
| F0530–F0539 | text **REPAIR** (label, 25 px, readable 113 f, 20 needed) |
| F0530–F0551 | four phrases become chips REPAIR, HOT WORK, PACKING LINE, BEFORE NIGHT SHIFT |
| F0534–F0543 | text **HOT WORK** (label, 25 px, readable 109 f, 20 needed) |
| F0536–F0558 | conditions line rises from the factory roof into the bottom facet |
| F0538–F0547 | text **PACKING LINE** (label, 25 px, readable 105 f, 20 needed) |
| F0542–F0551 | text **BEFORE NIGHT SHIFT** (label, 25 px, readable 101 f, 30 needed) |
| F0542–F0554 | PHOTO facet draws dashed with a question mark |
| F0558–F0567 | text **PHOTO** (label, 25 px, readable 85 f, 20 needed) |
| F0562–F0568 | bead turns to the worker |
| F0563–F0572 | text **SITE + INSURANCE CONDITIONS** (label, 25 px, readable 80 f, 30 needed) |
| F0568–F0586 | dotted thread descends carrying the request |
| F0572–F0581 | text **Photo of the bracket?** (sentence, 45 px, readable 57 f, 40 needed) |
| F0588–F0600 | worker tilts the phone |
| F0602–F0624 | photo travels up |
| F0624–F0636 | photo settles into the facet |
| F0632–F0644 | dashed perimeter becomes continuous |
| F0636–F0656 | hold on the filled facet (the fold now rides in Sequence 3's travel) |
| F0640–F0649 | text **CASE** (label, 45 px, readable 71 f, 20 needed) |

Hand-off: Ends with the case, six facets and "CASE" beneath (fully visible from F649), camera still at S2_CASE. The fold onto the core happens during Sequence 3's travel.

Checker: every rule passes.

### Sequence 3: The site chooses its cast

F0660–F1139, 480 frames (0:22.0–0:38.0). Tightest rule-clean need 470 frames; the storyboard's 480 frames are kept, so 10 frames of air.

Camera: F0660 S2_CASE · move to S3_PANEL F0660–F0716 (56 f) · hold to F0976 · move to S3_TABLE F0976–F1020 (44 f) · hold to F1140

Narration: N3a "Next, it summons only the specialists this site and job need." F0762–F0906 (11 words at 2.3 wps, 144 f); N3b "Each checks its own conditions and reports back." F0994–F1099 (8 words at 2.3 wps, 105 f)

| Frames | Beat |
|---|---|
| F0660–F0716 | Priora glides left along ROUTE_CASE_TO_PANEL, the case behind on a short thread; facets fold onto the core in flight; "CASE" rides along (23 px) and fades at 60 |
| F0720–F0729 | text **Site panel** (name, 33 px, readable 247 f, 20 needed) |
| F0720–F0755 | panel title, sub and the three ghost names appear (camera still) |
| F0726–F0735 | text **CONFIGURED FOR THIS SITE** (label, 23 px, readable 241 f, 40 needed) |
| F0734–F0743 | text **Electrical** (name, 24 px, readable 457 f, 20 needed) |
| F0740–F0749 | text **Structural** (name, 24 px, readable 451 f, 20 needed) |
| F0746–F0755 | text **Security** (name, 24 px, readable 445 f, 20 needed) |
| F0750–F0764 | bead turns to the ghost seats |
| F0770–F0784 | bead returns to the case |
| F0788–F0926 | summons, one every 18 frames: facet pulses (8), thread reaches out (12), the specialist slides in with its signature (18), passes the entrance to its seat (20), settles (8). Order: Evidence check, Risk engineering, Site rules, Fire, Insurer conditions |
| F0859–F0868 | text **Evidence check** (name, 24 px, readable 332 f, 20 needed) |
| F0877–F0886 | text **Risk engineering** (name, 24 px, readable 314 f, 20 needed) |
| F0895–F0904 | text **Site rules** (name, 24 px, readable 296 f, 20 needed) |
| F0913–F0922 | text **Fire** (name, 24 px, readable 278 f, 20 needed) |
| F0930–F0954 | the case passes through the entrance and settles at the table centre; Priora stays outside, a fine connection between them |
| F0931–F0940 | text **Insurer conditions** (name, 24 px, readable 260 f, 20 needed) |
| F0954–F0976 | hold: Priora conducts from outside |
| F0976–F1020 | camera to the table; the case opens into its facets in the move |
| F1022–F1046 | Evidence check frames the bracket image, aperture centres on the crack |
| F1034–F1058 | Risk engineering opens, draws a dashed radius round the packing line facet |
| F1046–F1066 | Site rules places a short horizontal mark beside the job |
| F1058–F1078 | Fire turns to the hot work symbol and pulses along its edge |
| F1070–F1090 | Insurer conditions closes its brackets round the conditions facet |
| F1082–F1091 | text **FIRE WATCH?** (label, 28 px, readable 39 f, 20 needed) |
| F1092–F1112 | "FIRE WATCH?" travels from Fire to Insurer conditions |
| F1100–F1130 | five small marks leave through the entrance and collect beside Priora |
| F1112–F1120 | their answer joins the findings |

Hand-off: Hold to local 490 runs under Sequence 4's first camera move (no new text).

Checker: every rule passes.

### Sequence 4: When the conditions hold

F1140–F1409, 270 frames (0:38.0–0:47.0). Tightest rule-clean need 268 frames; the storyboard's 270 frames are kept, so 2 frames of air.

Camera: F1140 S3_TABLE · move to S4_CASE F1140–F1184 (44 f) · hold to F1264 · move to S4_ROUTE F1264–F1316 (52 f) · hold to F1410

Narration: N4 "When everything holds, the route opens. Work goes on, the record is kept, no one is disturbed." F1186–F1408 (17 words at 2.3 wps, 222 f)

| Frames | Beat |
|---|---|
| F1140–F1156 | the five marks beside Priora are taken into it |
| F1150–F1170 | facets fold to radius 52 |
| F1154–F1192 | five arcs arrive, each from the direction of its agent (stagger 5, 18 frames each) |
| F1192–F1212 | arcs slide into one continuous ring |
| F1212–F1220 | the ring locks, one soft pulse (on "holds") |
| F1220–F1240 | hold the closed ring |
| F1224–F1233 | text **INSIDE THE CONDITIONS** (label, 41 px, readable 31 f, 30 needed) |
| F1240–F1290 | the route draws from the ring through the entrance to the window |
| F1264–F1316 | camera follows the route, widening to the real world |
| F1270–F1320 | Priora glides to its pause point between the site and the panel |
| F1290–F1292 | route reaches the window: the spark starts flickering (to the end of the film) |
| F1318–F1338 | record line extends under the ground |
| F1338–F1346 | first record mark |
| F1350–F1359 | text **RECORD KEPT** (label, 24 px, readable 51 f, 20 needed) |
| F1362–F1371 | text **NO ONE DISTURBED** (label, 24 px, readable 39 f, 30 needed) |
| F1376–F1392 | Priora's bead turns attentively to the work |

Checker: every rule passes.

### Sequence 5: A condition slips

F1410–F1709, 300 frames (0:47.0–0:57.0). Tightest rule-clean need 297 frames; the storyboard's 300 frames are kept, so 3 frames of air.

Camera: F1410 S4_ROUTE · move to S5_GAP F1410–F1456 (46 f) · hold to F1586 · move to S5_DESK F1586–F1640 (54 f) · hold to F1710

Narration: N5 "One condition slips: the fire watch is half the policy. Priora brings it to the risk owner. Agents prepare, the human decides." F1420–F1707 (22 words at 2.3 wps, 287 f)

| Frames | Beat |
|---|---|
| F1410–F1440 | the gap opens from F1410: the Insurer conditions arc loosens, rotates about 8°, drifts out and turns dashed |
| F1410–F1456 | camera follows the route back to the panel |
| F1416–F1434 | the Insurer conditions glyph separates its two pieces |
| F1430–F1442 | coral at the two exposed ends |
| F1460–F1469 | text **FIRE WATCH PLANNED: 30 MIN** (label, 23 px, readable 71 f, 50 needed) |
| F1462–F1476 | solid 30 MIN ruler draws |
| F1476–F1485 | text **POLICY ASKS: 60 MIN** (label, 23 px, readable 55 f, 40 needed) |
| F1478–F1506 | dashed 60 MIN ruler draws, twice as long, same speed (completes on "half") |
| F1490–F1508 | pale incomplete barrier outline on the route |
| F1512–F1521 | text **NO HARD STOP CONFIGURED** (label, 25 px, readable 65 f, 40 needed) |
| F1540–F1552 | rulers fade |
| F1546–F1570 | facets fold inward, the ring contracts, the gap kept |
| F1574–F1583 | text **DECISION PACKET** (label, 27 px, readable 22 f, 20 needed) |
| F1584–F1610 | the packet comes out through the entrance to Priora |
| F1610–F1660 | Priora carries it along ROUTE_ESCALATE to the desk; camera follows |
| F1660–F1680 | hold the packet at the desk |
| F1668–F1694 | the human line draws from the desk and loops loosely round the packet (low wooden note as it arrives) |
| F1698–F1707 | text **RISK OWNER DECIDES** (label, 47 px, readable 33 f, 30 needed) |

Hand-off: "RISK OWNER DECIDES" stays readable into Sequence 6's first move (47 px falling to 22 px).

Checker: every rule passes.

### Sequence 6, opening and Retain

F1710–F1948, 239 frames (0:57.0–1:05.0). Tightest rule-clean need 239 frames.

Camera: F1710 S5_DESK · move to S6_ROOMS F1710–F1750 (40 f) · hold to F1793 · move to S6_RETAIN F1793–F1833 (40 f) · hold to F1949

Narration: N6R-a "Retain is never a default." F1764–F1830 (5 words at 2.3 wps, 66 f); N6R-b "Risk is kept on purpose, with its terms explicit." F1830–F1948 (9 words at 2.3 wps, 118 f)

| Frames | Beat |
|---|---|
| F1710–F1750 | camera right and up; forecourt, paths and the three room bands print during the move (stagger 6, 26 frames each) |
| F1754–F1763 | text **Retain** (name, 40 px, readable 45 f, 20 needed) |
| F1754–F1763 | text **R** (name, 55 px, readable 47 f, 20 needed) |
| F1756–F1765 | text **DESIGN PROPOSAL** (label, 25 px, readable 244 f, 20 needed) |
| F1758–F1767 | text **Mitigate** (name, 40 px, readable 39 f, 20 needed) |
| F1758–F1767 | text **M** (name, 55 px, readable 39 f, 20 needed) |
| F1760–F1769 | text **DESIGN PROPOSAL** (label, 25 px, readable 36 f, 20 needed) |
| F1760–F1776 | the human loop around the packet lets go |
| F1762–F1771 | text **Transfer** (name, 40 px, readable 238 f, 20 needed; exact position set in Step 2) |
| F1762–F1771 | text **T** (name, 55 px, readable 39 f, 20 needed) |
| F1764–F1773 | text **SIMULATED** (label, 25 px, readable 236 f, 20 needed; exact position set in Step 2) |
| F1770–F1830 | Priora carries the packet from the desk along the path, across the forecourt, to the Retain doorway |
| F1793–F1833 | camera approaches Retain; the large initials fade |
| F1828–F1860 | the human line extends from the desk along the path and reaches the doorway, after AN AGENT CANNOT CHOOSE IT has appeared |
| F1833–F1847 | Priora stops short at the closed threshold; bead to the doorway, then to the risk owner |
| F1839–F1848 | text **AN AGENT CANNOT CHOOSE IT** (label, 30 px, readable 161 f, 50 needed; exact position set in Step 2) |
| F1860–F1868 | the line opens the threshold and holds it clear |
| F1864–F1873 | text **RISK OWNER** (label, 30 px, readable 76 f, 20 needed; exact position set in Step 2) |
| F1868–F1886 | Priora carries the packet inside |
| F1882–F1896 | small room agents gather |
| F1890–F1904 | coral bridge across the gap, the gap still readable beneath |
| F1900–F1918 | four leader lines draw |
| F1904–F1924 | hold the bridged packet |
| F1908–F1917 | text **EXPOSURE** (label, 30 px, readable 92 f, 20 needed; exact position set in Step 2) |
| F1912–F1921 | text **AUTHORITY** (label, 30 px, readable 88 f, 20 needed; exact position set in Step 2) |
| F1916–F1925 | text **CONDITIONS** (label, 30 px, readable 84 f, 20 needed; exact position set in Step 2) |
| F1920–F1929 | text **EXPIRY** (label, 30 px, readable 80 f, 20 needed; exact position set in Step 2) |
| F1929–F1949 | the arrangement holds while the narration finishes |

Checker: every rule passes.

### Sequence 6, Mitigate

F1949–F2172, 224 frames (1:05.0–1:12.4). Tightest rule-clean need 224 frames.

Camera: F1949 S6_RETAIN · move to S6_MITIGATE F1949–F1989 (40 f) · hold to F2173

Narration: N6M "Mitigate compares safeguards, and checks whether the work is back inside." F2001–F2145 (11 words at 2.3 wps, 144 f)

| Frames | Beat |
|---|---|
| F1949–F1965 | the retained treatment falls away; the packet is unresolved again |
| F1949–F1983 | Priora carries the packet across the forecourt to the Mitigate doorway; the human line leaves Retain and reaches the Mitigate doorway (14 to 32) before Priora crosses |
| F1983–F2001 | Priora crosses (during the last frames of the move, no text); packet inside |
| F1993–F2002 | text **Thermal check** (name, 28 px, readable 231 f, 20 needed; exact position set in Step 2) |
| F1997–F2006 | text **Extend watch to 60 min** (name, 28 px, readable 227 f, 50 needed; exact position set in Step 2) |
| F2001–F2010 | text **Move weld to workshop** (name, 28 px, readable 223 f, 40 needed; exact position set in Step 2) |
| F2001–F2017 | Thermal check rises from the paper and moves to the packet |
| F2017–F2029 | its dashed piece fills part of the gap |
| F2029–F2049 | hold |
| F2033–F2042 | text **PARTIAL** (label, 30 px, readable 36 f, 20 needed; exact position set in Step 2) |
| F2062–F2078 | it withdraws |
| F2068–F2084 | Extend watch rises and moves to the packet |
| F2084–F2098 | it extends across the whole opening; the ring is continuous in preview |
| F2098–F2157 | hold the previewed ring |
| F2102–F2111 | text **FULL** (label, 30 px, readable 46 f, 20 needed; exact position set in Step 2) |
| F2108–F2124 | Evidence check's corner marks settle round the result |
| F2128–F2137 | text **BACK INSIDE** (label, 30 px, readable 20 f, 20 needed; exact position set in Step 2) |
| F2157–F2173 | the proposal withdraws; the packet is unresolved again |

Checker: every rule passes.

### Sequence 6, Transfer

F2173–F2369, 197 frames (1:12.4–1:19.0). Tightest rule-clean need 197 frames.

Camera: F2173 S6_MITIGATE · move to S6_TRANSFER F2173–F2213 (40 f) · hold to F2370

Narration: N6T "Transfer, simulated for now, asks outside capacity for terms and a price." F2213–F2370 (12 words at 2.3 wps, 157 f)

| Frames | Beat |
|---|---|
| F2173–F2213 | Priora carries the packet to Transfer; the human line reaches the Transfer doorway (14 to 38) before Priora crosses |
| F2213–F2231 | Priora crosses; packet inside |
| F2217–F2226 | text **NO INSURER ON PRIORA YET** (label, 28 px, readable 204 f, 50 needed; exact position set in Step 2) |
| F2223–F2232 | text **(carrier and capacity role labels: words not in the storyboard)** (label, 30 px, readable 198 f, 20 needed; exact position set in Step 2) |
| F2231–F2261 | dashed copies of the gap travel out through small openings to the three dashed agents |
| F2261–F2289 | hollow answers return |
| F2293–F2302 | text **ELIGIBILITY** (label, 30 px, readable 128 f, 20 needed; exact position set in Step 2) |
| F2297–F2306 | text **TERMS** (label, 30 px, readable 124 f, 20 needed; exact position set in Step 2) |
| F2301–F2310 | text **SAFEGUARDS** (label, 30 px, readable 120 f, 20 needed; exact position set in Step 2) |
| F2305–F2314 | text **PRICE ?** (label, 30 px, readable 116 f, 20 needed; exact position set in Step 2) |
| F2334–F2350 | Priora gathers them |
| F2350–F2370 | Priora brings the packet back to the forecourt, towards the risk owner |

Checker: every rule passes.

### Sequence 7: The rooms work together

F2370–F2594, 225 frames (1:19.0–1:26.5). Tightest rule-clean need 225 frames.

Camera: F2370 S6_TRANSFER · move to S7_SYSTEM F2370–F2410 (40 f) · hold to F2595

Narration: N7-a "Priora carries the case between rooms." F2410–F2489 (6 words at 2.3 wps, 79 f); N7-b "The risk owner stays in control." F2510–F2589 (6 words at 2.3 wps, 79 f)

| Frames | Beat |
|---|---|
| F2370–F2410 | camera widens to all three rooms and the desk; Priora brings the packet to the Mitigate doorway (stops at the threshold, does not cross) |
| F2410–F2422 | a dashed safeguard comes out and fills part of the gap |
| F2422–F2438 | on to the Transfer doorway |
| F2426–F2435 | text **MITIGATE PART** (label, 24 px, readable 220 f, 20 needed; exact position set in Step 2) |
| F2438–F2450 | a hollow question mark returns from the simulated inquiry |
| F2450–F2466 | on to the Retain doorway |
| F2466–F2478 | a proposed coral bridge spans the rest of the gap |
| F2482–F2491 | text **KEEP THE REST** (label, 24 px, readable 164 f, 30 needed; exact position set in Step 2) |
| F2482–F2508 | Priora returns to the desk with the packet and its short list |
| F2508–F2528 | the final arrival pauses |
| F2510–F2530 | the human line draws from the desk, once, and closes round the chosen combination |
| F2530–F2540 | mitigation and retention marks turn solid; the transfer inquiry stays dashed, off to one side |
| F2540–F2552 | one soft pulse through the human line |
| F2556–F2565 | text **RISK OWNER DECIDES** (label, 25 px, readable 90 f, 30 needed) |
| F2565–F2595 | the camera stays still while RISK OWNER DECIDES is read (a decision moment) |

Checker: every rule passes.

### Sequence 8: The whole system

F2595–F2987, 393 frames (1:26.5–1:39.6). Bare minimum 348 frames; 45 frames of air added (a half second of near silence after the voice, a full second of the name alone).

Camera: F2595 S7_SYSTEM · move to S8_SHEET F2595–F2635 (40 f) · hold to F2988

Narration: N8 "Priora turns physical work into explicit risk decisions, while the work happens." F2741–F2898 (12 words at 2.3 wps, 157 f)

| Frames | Beat |
|---|---|
| F2595–F2635 | camera withdraws to the whole sheet; the decided case lowers to the record line (8 to 32) and leaves the second mark (32 to 40, faint paper contact); Priora rises to the upper centre, its bead settling between the panel and the rooms |
| F2639–F2648 | text **THE COMPLETE SYSTEM IS A DESIGN PROPOSAL** (label, 23 px, readable 80 f, 70 needed) |
| F2645–F2654 | text **ONE PRIORA AGENT** (label, 23 px, readable 74 f, 30 needed) |
| F2649–F2658 | text **A CONFIGURABLE SITE PANEL** (label, 23 px, readable 70 f, 40 needed) |
| F2653–F2662 | text **THREE DECISION ROOMS** (label, 23 px, readable 66 f, 30 needed) |
| F2708–F2728 | the drawing recedes in contrast |
| F2718–F2728 | breathing room: the whole system, read |
| F2738–F2747 | text **Priora turns physical work** (sentence, 61 px, readable 166 f, 120 needed) |
| F2738–F2747 | text **into explicit risk decisions,** (sentence, 61 px, readable 166 f, 120 needed) |
| F2738–F2747 | text **while the work happens.** (sentence, 61 px, readable 166 f, 120 needed) |
| F2898–F2913 | breathing room: the statement holds in near silence after the voice |
| F2913–F2958 | drawing and statement dissolve; "Priora" fades in during the second half |
| F2933–F2942 | text **Priora** (name, 111 px, readable 106 f, 20 needed) |
| F2958–F2988 | breathing room: "Priora" alone, still |

Checker: every rule passes.

---

## 9. Narration fit

Calm narration at 2.3 words per second; the worker's phone message at 2.7. Every line now fits inside its sequence, no two lines overlap, and the animation is never sped up to fit a line. Retain's narration is one storyboard line in two sentences, placed so "kept on purpose" lands with the bridge and "terms explicit" with the leaders.

| Line | Text | Words | Pace | Frames | Placed | Its sequence | Gap to next line |
|---|---|---|---|---|---|---|---|
| N1 | "Real work in the middle: a worker, a site, a risk owner. Priora places agents around it." | 17 | 2.3 | 222 | F0008–F0229 | F0000–F0239 | 44 f |
| W1 | "Hey, the bracket by the packing line has cracked again. We're going to weld it before the night shift." | 19 | 2.7 | 212 | F0274–F0485 | F0240–F0659 | 22 f |
| N2 | "Priora hears the job, and asks for a photo." | 9 | 2.3 | 118 | F0508–F0625 | F0240–F0659 | 136 f |
| N3a | "Next, it summons only the specialists this site and job need." | 11 | 2.3 | 144 | F0762–F0905 | F0660–F1139 | 88 f |
| N3b | "Each checks its own conditions and reports back." | 8 | 2.3 | 105 | F0994–F1098 | F0660–F1139 | 87 f |
| N4 | "When everything holds, the route opens. Work goes on, the record is kept, no one is disturbed." | 17 | 2.3 | 222 | F1186–F1407 | F1140–F1409 | 12 f |
| N5 | "One condition slips: the fire watch is half the policy. Priora brings it to the risk owner. Agents prepare, the human decides." | 22 | 2.3 | 287 | F1420–F1706 | F1410–F1709 | 57 f |
| N6R-a | "Retain is never a default." | 5 | 2.3 | 66 | F1764–F1829 | F1710–F1948 | 0 f |
| N6R-b | "Risk is kept on purpose, with its terms explicit." | 9 | 2.3 | 118 | F1830–F1947 | F1710–F1948 | 53 f |
| N6M | "Mitigate compares safeguards, and checks whether the work is back inside." | 11 | 2.3 | 144 | F2001–F2144 | F1949–F2172 | 68 f |
| N6T | "Transfer, simulated for now, asks outside capacity for terms and a price." | 12 | 2.3 | 157 | F2213–F2369 | F2173–F2369 | 40 f |
| N7-a | "Priora carries the case between rooms." | 6 | 2.3 | 79 | F2410–F2488 | F2370–F2594 | 21 f |
| N7-b | "The risk owner stays in control." | 6 | 2.3 | 79 | F2510–F2588 | F2370–F2594 | 152 f |
| N8 | "Priora turns physical work into explicit risk decisions, while the work happens." | 12 | 2.3 | 157 | F2741–F2897 | F2595–F2987 | 90 f to the end |

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

The checklist is also enforced by a lint that reads the timeline, layout, camera keys and the text registry, so a broken rule fails before anything is rendered. A working prototype of it already produced every number in sections 8 and 9.

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
| Human line | it reaches each threshold before Priora's crossing frame (Sequence 6); no crossing in Sequence 7 |
| Narration | no overlapping lines; `narration.srt` is generated from the same data as the timing |

Pixel checks on rendered stills: empty paper at least 40 percent of the frame (pixels within a small colour distance of paper), and a texture stability test (two consecutive frames with a still camera must be identical wherever nothing moves, so grain and ink texture provably never boil).

### 10.3 Renders

| Deliverable | Settings |
|---|---|
| `renders/Priora film master.mp4` | H.264, CRF 14 (better than the CRF 16 floor, so the grain survives), yuv420p |
| `renders/Priora film master.mov` | ProRes 422 HQ, 10 bit |
| `renders/Priora film review with subtitles.mp4` | H.264, the review composition with burned in narration subtitles |
| Review MP4s | half resolution (960 × 540), one per sequence while building |

---

## 11. Risks

| Risk | What I will do |
|---|---|
| The ProRes master is about 2.5 to 3 GB; GitHub refuses files over 100 MB | see question Q4 |
| Ink texture filters can shimmer when shapes move by fractions of a pixel | test early in Step 2 with the stability check; lower the noise frequency or snap the texture to its shape if needed |
| Render time with many filters | measured in Step 2; the half resolution review renders keep iteration fast |
| Text widths in this plan come from the Plex font files (Medium and SemiBold estimated from the variable font's default instance) | measured exactly with `@remotion/layout-utils` in Step 2, line breaks fixed by hand |
| The recorded voice will not match 2.3 words per second exactly | the timeline reads word times from `narration.ts`; a recording replaces them and the checker reruns |

---

## 12. Open questions

| # | Question | My recommendation |
|---|---|---|
| Q1 | "R · M · T": the storyboard says the room names "appear in full, with large, spare letters beneath". Is that one line reading R · M · T, or each room's own initial? | Each room's own initial, set large and pale inside its empty room (R in Retain, M in Mitigate, T in Transfer), seen only in the overview and fading as the camera approaches Retain. It gives each room an identity at a glance and leaves the interiors clean for the action. |
| Q2 | The three dashed Transfer agents need "short labels identifying simulated carrier and capacity roles", but the storyboard gives no words, and the brief says not to add any. | Give me the words (for example "Carrier" twice and "Capacity" once). Until then they stay unlabelled; their dashed, lighter shapes and the room's SIMULATED label already mark them as simulated. |
| Q3 | The closing "Priora": the storyboard asks for black type. An earlier branch of this repo has a Priora wordmark SVG. | Black IBM Plex Sans SemiBold, as written. I will only use the wordmark if you ask. |
| Q4 | The ProRes 422 HQ master will be about 2.5 to 3 GB, and GitHub refuses files over 100 MB. | I render and verify it here, and commit a one-command script that renders the identical file on your Mac. The two H.264 files (expected 30 to 60 MB) go in the repo. If Git LFS is enabled on this repository, the ProRes can go there instead. |

---

## 13. If you want it shorter

None of these are applied. Each is a storyboard choice, not a rule change, and each would be verified with the checker before I commit to it.

| Lever | Frames saved | What it costs the story | Checked |
|---|---|---|---|
| Sequence 8: drop the 45 frames of air | 45 | the ending feels hurried; the name gets only the minimum 20 frame hold | yes |
| Sequence 8: replace "THE COMPLETE SYSTEM IS A DESIGN PROPOSAL" and the three structure labels with one honesty line of about three words (your words) | 40 | the closing names (one agent, one panel, three rooms) go; the honesty statement gets shorter | yes, with a three word placeholder |
| Sequence 7: skip the Transfer doorway (the packet goes Mitigate, then Retain) | 28 | the hollow question mark from the simulated inquiry no longer appears in the combination | yes |
| Sequence 7: show RISK OWNER DECIDES as the line closes, with the marks turning solid and the pulse under it | 22 | the label arrives a moment before the pulse instead of after it | yes |
| Sequences 1 to 5: trim the spare frames each sequence has beyond its rule-clean need | 21 | slightly less air at the ends of Sequences 1 to 5 | yes |

All five together would save about 156 frames (5.2 s) and bring the film to about 2832 frames (94.4 s). The two Sequence 7 levers have only been checked one at a time.
