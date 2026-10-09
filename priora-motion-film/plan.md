# Priora motion film: plan

Step 1 of the production brief, kept up to date. Status: **Step 3 is done. All eight sequences are animated and have been through two review passes with stills, and the full film is rendered as an H.264 master and a review version with burned-in subtitles. ProRes is skipped for now, as you asked. This file matches what is built.**

## 0. Where it stands

| | |
|---|---|
| **Length** | **2883 frames, 96.1 seconds** (F0000–F2882) |
| Rules | every motion, text and composition rule in the brief, unchanged. The planning checker verified the timing and text rules sequence by sequence; Step 3's checker checks the whole film in one pass, and every check passes (section 10.2) |
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
13. The three-line voice note stays. Step 3 goes ahead without waiting for a review of the stills; wherever something does not fit, the option that keeps the most empty paper wins, and each such call is reported in section 7.1.

One consequence to note: the brief names F1410 as the frame where the gap opens, which was the first frame of Sequence 5 in the original storyboard. With Sequences 1 to 5 trimmed, Sequence 5 starts at F1392. The gap opens at F1440, after the camera settles on S5_GAP at F1438. The storyboard orders the camera's return before the slip, and a slip during the move could not be read. From F1440 the gap stays readable until the decision; the checker verifies this from F1468, once the coral ends are fully in.

Section 12's four questions are answered (decisions 9 to 12).

**Step 2, what changed from the Step 1 numbers.** The stills showed collisions the Step 1 coordinates could not avoid: the rulers' first label did not fit inside the table under the case, the long left agent names touched the table band, and in centred Retain and Mitigate close-ups part of Transfer showed without its SIMULATED label. So the table grew to radius 330 with the seats at 390, shots were reframed (S2_VOICE, S3_PANEL, S3_TABLE, S6_RETAIN, S6_MITIGATE and S6_TRANSFER, with small shifts of S4_CASE, S5_GAP and the two wide room shots), and labels moved onto clean paper. The voice note now sits in three lines, so the camera can stay close on the worker and Priora can hover just above and to its right. No camera move changed its frames in Step 2.

**Step 3, what changed.** No sequence changed length. Inside the sequences, four camera moves shifted (section 6.2), S3_PANEL and S6_RETAIN were reframed, and several labels moved onto clean paper. Sections 4 to 6 hold the built values, and section 7.1 lists what Step 3 built and where it departs from the storyboard or the brief.

Sources, in order of authority:

1. `Priora storyboard.md`: story, timing, copy and meaning. Saved from the file you sent, with your decisions above written into it.
2. `Production brief.md`: how to build it (your prompt, saved verbatim so the rules travel with the project).
3. This plan: how the two are reconciled, with every conflict flagged rather than silently resolved.

Conventions used below:

- **World units.** The world is one SVG sheet, 5760 × 3240 units, origin top left, y down. At camera zoom 1.0 one unit is one screen pixel at 1080p.
- **On screen size** = world size × zoom. Every text size in this plan is checked on screen, not in the world.
- **Angles** are degrees clockwise from +x (y down): 270 is 12 o'clock, 0 is 3 o'clock, 90 is 6 o'clock, 180 is 9 o'clock.
- **Frames** are absolute film frames, F0000 to F2882, 30 fps.
- Every coordinate here is the built value, from `src/lib/layout.ts` and `src/camera/shots.ts`.

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

One composition, `priora-film`, 1920 × 1080, 30 fps, 2883 frames (the length comes from `timeline.ts`, never typed twice), plus `priora-film-review` (the same film with narration subtitles burned in). Composition IDs use hyphens because Remotion does not allow spaces in them. `Root.tsx` also holds the Step 2 compositions: the world stills, the three sheets and the two texture generators.

```
priora-motion-film/
  Priora storyboard.md     Production brief.md     plan.md
  narration.srt            written by npm run srt from the narration table
  sound cues.md            every sound moment, on the film's frames
  public/fonts/            IBM Plex Sans (variable) and IBM Plex Mono 500, latin
  public/textures/         paper-grain.png, paper-mottle.png (generated once)
  public/audio/            empty slot: narration.wav and sound.wav drop in here (README.md)
  src/index.ts             src/Root.tsx (compositions)
  src/lib/
    tokens.ts              colours, stroke weights, dash pattern, easing curves, text floors
    timeline.ts            every frame range as named constants (SEQ, S1 … S8, FILM_FRAMES) and NARRATION
    layout.ts              every world coordinate and every path, defined once
    motion.ts              ease, arrive, prog, fade, keys, the spark's fixed flicker; no spring, no overshoot
    geometry.ts paths.ts   points, arcs and sectors; points along SVG paths
    text.tsx               fonts, Label, Words, Wordmark: readable sizing and the 6 px rise
    texture.tsx            ink texture filters (fixed seed per shape)
    simulated.ts           where SIMULATED holds while any of Transfer is in frame
  src/camera/
    shots.ts               named camera shots (x, y, zoom)
    camera-keys.ts         the only camera move list in the film (MOVES)
    Camera.tsx             one transform for the whole world; exposes zoom to the cast
  src/world/
    World.tsx              the single SVG world, drawn from one state per frame
    Paper.tsx              paper grain and mottle, world space, static
    RealWorld.tsx  SitePanel.tsx  DecisionRooms.tsx
  src/cast/
    agents.tsx             Priora, the five specialists, ghosts, Transfer agents, room agents, safeguards
    Case.tsx               the case in every state, and the photo card
    people.tsx             worker, site, risk owner, spark, contact shadows
    lines.tsx              drawn lines, threads and dotted threads, screen-constant weights
  src/film/
    Film.tsx               the film: World, review subtitles, optional audio
    state.tsx              the whole film as a function of the frame (stateAt)
    real.ts                the real world: figures, phone, record line, spark, context fades
    panel.ts               the site panel and the specialists: summons, checks, echoes
    cast.ts                Priora, its bead and the case: journeys and states
    findings.ts            the five finding marks, from their checks into the ring
    system.ts              the rooms, the routes and the human decision line
    track.ts               timed journeys along curves, walked by arc length
    texts.ts               the text registry: every string, when and where
    Subtitles.tsx          the review subtitles, from NARRATION
    overlays/              s1 s2 s3 s5 s6 s8: world-space extras for one sequence each
                           (the orbit; the voice note, waveform, threads and photo; summons, checks
                           and finding marks; rulers and gate; the room interiors; the closing veil)
  src/text/
    items.ts               the text item type and its timing (plain data, read by the checker)
    TextLayer.tsx          draws the registry's free text
  src/static/
    scenes.tsx  Sheets.tsx  Textures.tsx
                           Step 2: world stills, the cast, people and case sheets, the textures
  src/sequences/           empty: the choreography lives in src/film
  scripts/
    qa.ts  qa.mjs          the checker (section 10.2); qa.mjs bundles qa.ts with esbuild and runs it
    sequence-stills.mjs    review stills of one sequence into stills/sequence N
    render-video.mjs       half resolution sequence reviews, the master, the review film
    render-lib.mjs         shared bundling and still rendering
    write-srt.ts           writes narration.srt from NARRATION
    run-ts.mjs             bundles and runs one TypeScript script (used by npm run srt)
    textures.mjs           Step 2: generates the paper textures once
    world-stills.mjs       Step 2: world stills and sheets
  stills/world  stills/cast  stills/sequence 1 … stills/sequence 8   (stills/scratch is git-ignored)
  renders/                 git-ignored: the master, the review film and renders/review
```

npm scripts: `qa` (the checker), `stills:sequence` (`npm run stills:sequence -- N`, or with frame numbers for check stills in `stills/scratch`), `render:sequence` (`npm run render:sequence -- N`, half resolution), `render:film` (the master), `render:review` (the subtitled film), `srt` (writes `narration.srt`). Also `studio`, `typecheck`, `textures` and `stills:world`.

Key decisions:

- **One world, one camera.** `World.tsx` renders every territory at its fixed coordinate in every frame. `Camera.tsx` applies one `translate · scale` transform. There are no cuts and no per-sequence scenes.
- **State modules and overlays.** Each recurring object is one component with state props (position, rotation, open or closed, dashed or solid, opacity, bead angle and so on). The modules in `src/film` compute those props for any frame, and `state.tsx` gathers them into one `WorldState`. The overlays add the world-space extras that belong to one sequence. The case is one `Case` component from its first circle in Sequence 2 to its record mark in Sequence 8.
- **Where the numbers live.** Frames come from `timeline.ts` and `camera-keys.ts`, coordinates from `layout.ts` and `shots.ts`. The world and cast components hold no frame numbers. A few context fades in the state modules are keyed directly to camera move frames (F0498, F1392, F1438, F1572, F1626, F2154, F2194), and the waypoints Priora and the case visit sit with their journeys in `cast.ts`.
- **One text registry.** Every string is listed in `src/film/texts.ts` with when and where it appears. `TextLayer.tsx` draws the free text. Text that belongs to a component (the voice note, the chip labels) is listed too, marked as drawn by its component, so the checker sees it.
- **The checker reads the film's own modules.** `findings.ts`, `items.ts`, `simulated.ts`, the timeline, the camera keys and the cast tracks are plain functions, so `scripts/qa.ts` follows exactly what the film draws.
- **Screen-constant line weights.** Agent threads 2 px and the human line 5 px on screen at every zoom (world width = px ÷ zoom). The dash pattern is one token, 10 px on and 7 px off on screen, so it reads the same everywhere.
- **Readable labels.** Persistent labels that must survive big zoom changes (room names, SIMULATED, statuses, RISK OWNER DECIDES, agent names) use a damped size: world size ∝ zoom^-0.8, so they grow a little as the camera approaches and never fall under 22 px. Transient labels use plain world size and are only shown while their shot holds them above the floor.
- **Texture.** Paper grain is generated once with `feTurbulence` (fixed seed), saved as a tile and laid in world space, so it stays with the sheet and never changes. Ink texture is an SVG `feTurbulence` mask per coloured shape, fixed seed per shape, in that shape's own coordinates, so it moves with the shape and never boils. No film grain, no animated noise.
- **Audio slot.** Both compositions take optional `narration` and `sound` props, each the name of a file in `public/audio` (`narration.wav` and `sound.wav`; see `public/audio/README.md`). With a name given, an `<Audio>` track plays it; with none, the film renders silent. `scripts/render-video.mjs` checks `public/audio` before each film render and passes whichever of the two files is there, so dropping them in is enough (tested with a tone: the render gains an AAC track).
- **Review subtitles.** The review composition draws the NARRATION lines in screen space, small, near the bottom edge, on a pale band; the worker's message is marked "Worker:".

---

## 3. Design tokens

As in the brief except where the director changed them: Paper #F5F3EE (brief: #F3EEE3), Ink #111111 (brief: #151515), Cobalt #2443B5, Coral #D9785F, Stone #C8C0B0, Cream #E9E2D2, Grey text #8C877D. One extra value: the welding spark is white #FFFFFF, as the storyboard asks.

Easing: default `cubic-bezier(0.45, 0, 0.15, 1)`; arrivals `cubic-bezier(0.2, 0.7, 0.2, 1)`; nothing else, no springs.

---

## 4. World layout

Every value below is what `src/lib/layout.ts` and `src/camera/shots.ts` hold after Step 3. Those two files are the source; this section mirrors them.

### 4.1 Territories

| Territory | Extent (world units) |
|---|---|
| Site panel (left) | circle centre (1300, 1500), wall radius 600, title above to about y 790 |
| Real world (lower centre) | x 2260 to 3500, y 2096 (service block top) to 2352 (labels) |
| Record line (under the real world) | y 2440, x 2260 to 3500 |
| Decision rooms (right) | clover round a forecourt at (4440, 1560); rooms x 3686 to 5194, y 985 to 2380; Transfer's simulated agents outside its wall to x 5292, their labels to about x 5436; labels above Retain and Transfer to about y 700 at the widest zoom, Mitigate's to its right |
| Margins | at least 320 units of empty paper to every sheet edge; the nearest is the CAPACITY label, about 324 from the right edge |

The full sheet view (Sequence 8) frames x 385 to 5575, so the sheet edge is never in frame.

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
| RECORD KEPT | centred (2990, 2494); mono 25 (24 px at S4_ROUTE) |
| NO ONE DISTURBED | left aligned at (3420, 2166); mono 25 (24 px at S4_ROUTE) |
| RISK OWNER DECIDES | left aligned at (3540, 2262), right of the desk and just below the desk path; readable sizing 27 px base (28.5 px at S5_DESK, 24.5 px at S7_SYSTEM) |

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
| PRIORA_LISTEN | (2560, 1960): just above and to the right of the worker, so the end of Sequence 1 is a glide towards the worker. The dotted listening thread runs from the bead down to the growing tip of the waveform; its long run sits halfway between the last line of the message and the top of the waveform, beneath every word |
| CASE_A | (2890, 1750), directly above the factory roof, so the conditions line rises straight into the bottom facet |
| PRIORA_CASE | (2610, 1880), left of the case; "Photo of the bracket?" ends at (2540, 1890), Plex Sans Medium 32 (44 px at zoom 1.38) |
| PHOTO | the photo card rises from the phone on a curve that comes up from below its facet, so it never crosses the PHOTO label; it grows to scale 0.8 in flight and shrinks into the facet as it settles |
| CASE label | mono 32, 150 below the case centre (44 px at S2_CASE); it rides with the case into Sequence 3's travel |

### 4.5 The case (local coordinates, never rotates)

| Part | Value |
|---|---|
| Core | ink dot, radius 9: the actual job |
| Thin ring | cobalt, radius 34, 2.5 wide |
| Facets | open radius 92 with chips 16 (Sequence 2); folded slightly to 80 (chips 14) as CASE appears; travel radius 56 (chips 11) in Sequence 3; open again at the table, 92 (16); drawn in to 50 (11) in Sequence 4, clear of the findings ring at 70; tucked to 46 (5.5) as the packet. The chip labels fade at F0626; the marks inside the chips stay until the packet folds in Sequence 5 |
| Facet angles | REPAIR 270, BEFORE NIGHT SHIFT 330, HOT WORK 30, SITE + INSURANCE CONDITIONS 90 (its label sits to the right of the chip), PHOTO 150, PACKING LINE 210 |
| Findings ring | radius 70 when assembled, 58 in the packet; band 9 wide; a hairline joint (0.7° each side) between arcs while they arrive, so the five findings read as five pieces; the joints close as the ring locks |
| Arcs | Insurer conditions 66 to 114 (48°, the future gap); Evidence check 114 to 192; Risk engineering 192 to 270; Site rules 270 to 348; Fire 348 to 66 |
| The gap | centred at 90° (6 o'clock), 48° wide; coral caps at 66° and 114° |
| Answers aside | the four dashed Transfer answers rest beside the packet as a 2 × 2 cluster of 18 unit squares, 26 apart, from (122, -13); clear of the decision loop |
| Scale | 1.0 in Sequence 2, 1.15 at the table (Sequences 3 to 5, CASE_TABLE_SCALE), back to 1.0 as it folds into the packet, 0.5 on the record line |

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
| Agent names | Plex Sans Medium, readable sizing 24 px base (22.5 px at S3_PANEL, 24.5 px at S3_TABLE); below the bottom seats, above the top seats, to the right of the right seats. The two left seats' names shift 50 units outwards, so the long names clear both the table band and the wall |
| Seated agents | Fire's wedge faces the table; Risk engineering's arch opens towards it |
| "Site panel" | centred (1300, 822) baseline, Plex Sans SemiBold 46 (33 px at zoom 0.72) |
| "CONFIGURED FOR THIS SITE" | centred (1300, 868) baseline, mono 32 (23 px at zoom 0.72) |
| PRIORA_PANEL | (2010, 1470), outside the entrance; Priora conducts, it is never seated |
| CASE_WAIT | (2150, 1560), where the case waits outside before Priora brings it in |
| FIRE WATCH? | coral, left aligned, readable sizing 25 px base (25.5 px at S3_TABLE); appears at (1620, 1745), between Fire and Insurer conditions, and travels to (1510, 1800), towards Insurer conditions, clear of Fire's glyph and name |
| Finding marks | small cobalt arc pieces, about 24 across. Each appears just inside the table band by its seat (radius 270 from P), waits near the entrance at radius 270 between -22° and 24° (parted round Priora's fine connection, which leaves the table at about -2°), then rests beside Priora in a row from (1944, 1552) through (2024, 1568) to (2104, 1552) |
| INSIDE THE CONDITIONS | centred (1300, 1660) baseline, under the ring; mono 24 (42 px at S4_CASE) |
| Fire watch rulers (Sequence 5) | inside the table under the case: common origin x 1072; FIRE WATCH PLANNED: 30 MIN baseline 1632, solid ruler 150 long at y 1648; POLICY ASKS: 60 MIN baseline 1688, dashed ruler 300 long at y 1704; mono 27 (22 px at zoom 0.82), coral |
| Barrier (Sequence 5) | a pale dashed grey broken gate across the route at (2070, 1494): two posts and a top rail, with a piece of the rail and of one post missing. NO HARD STOP CONFIGURED left aligned at (2050, 1408), above the gate; grey mono 28 (23 px at zoom 0.82) |
| DECISION PACKET | mono 27, 108 below the case (22 px at S5_GAP); rides with the packet |
| PRIORA_PAUSE | (2370, 1770), beside the work route, clear of it by 150 units |
| Priora's pickup point | (2040, 1640), below the route and clear of the gate (Sequence 5) |

Why the panel grew in Step 2: with the table at radius 300, the rulers' first label (472 units wide at the 22 px floor) could not sit inside the table under the case, and the long left names touched the table band. A table of 330 and seats at 390 fix both without changing the wall or any camera move.

### 4.7 Decision rooms

| Name | Value |
|---|---|
| FORECOURT F | (4440, 1560), stone ring radius 110 |
| Rooms | radius 330 (outer), broad flat band 28 wide, paper inside, opening of 44° facing F |
| RETAIN | centre (4016, 1315), F + 490 at 210°; coral band |
| MITIGATE | centre (4440, 2050), F + 490 at 90°; cobalt band |
| TRANSFER | centre (4864, 1315), F + 490 at 330°; stone band with a dashed cobalt perimeter and three small openings beside its agents |
| Thresholds (the middle of the fine threshold line across each opening) | Retain (4269, 1462); Mitigate (4440, 1757); Transfer (4611, 1462). The fine ink line is drawn while the room is closed, and opens from the middle, each half drawing back to its band end |
| PATH_DESK_FORECOURT | from DESK_ORIGIN (3386, 2232) to the forecourt rim at 150° (4345, 1615); cubic, controls (3700, 2232) and (4150, 1720) |
| Spurs | forecourt rim to each threshold, straight, 87 units long |
| Human line on the rim | it turns onto the rim at 150° on a smooth fillet, rides it (clockwise to Retain's spur at 210° and on over the top to Transfer's at 330°, anticlockwise to Mitigate's at 90°), and leaves it for the spur on a second fillet |
| Room labels | names Plex Sans SemiBold, readable sizing 44 px base (40 px at zoom 0.62, 46 px at 1.25); statuses mono, readable sizing 27 px base (24.5 px at 0.62, 22 px at 0.37). The stacks are spaced from the actual size at each zoom, so they never collide. Above Retain and Transfer the stack grows upwards from y 950 (Transfer's lowest line is kept for NO INSURER ON PRIORA YET, so nothing moves when it arrives); Mitigate's sits to its right from (4800, 2070), growing downwards |
| Focus | in the Retain and Mitigate close-ups the other rooms are off frame. In the Transfer close-up Retain's edge is in frame: it sits at 25 percent with its labels hidden (F2154 to F2392) |
| Retain interior | packet (4040, 1320) with the coral bridge; three small room agents round it; four leaders to EXPOSURE (3960, 1200), AUTHORITY (4110, 1200), CONDITIONS (3960, 1450), EXPIRY (4110, 1450), mono 24 (30 px at 1.25); AN AGENT CANNOT CHOOSE IT centred (4016, 1150) inside the room above the packet, where the room is wide enough to leave paper at both ends; RISK OWNER right aligned at (4232, 1676), below Retain's band, beside the black line where it comes in from the desk; Priora inside at (4016, 1545) |
| Mitigate interior | packet (4390, 1920); Evidence check's corner marks 96 out from it, from a small Evidence check glyph at (4240, 1880); PARTIAL, then FULL and BACK INSIDE, left aligned from (4520, 1912), 34 apart, mono 22 (27.5 px at 1.25); safeguards at (4252, 2120), (4440, 2120), (4628, 2120), names 62 below in two lines (Thermal / check, Extend watch / to 60 min, Move weld / to workshop), Plex Sans Medium 22 (27.5 px), each with a disc stack (cost, left) and an open clock arc (time, right); Priora inside at (4440, 2298), below the names |
| Transfer interior | packet (4800, 1340); answers ELIGIBILITY, TERMS, SAFEGUARDS, PRICE ? left aligned at x 4944 from y 1250, 40 apart, cobalt mono 24 (29 px at 1.2), each with a small dashed square at x 4921; Priora inside at (4680, 1430) |
| Transfer agents | three dashed hexagonal glyphs 400 from Transfer's centre at 315°, 5° and 50°: (5147, 1032), (5263, 1350), (5121, 1621); outside the wall, away from the forecourt, clear of the label stack. Labels CARRIER, CAPACITY, BROKER in cobalt mono 24 (29 px at zoom 1.2), left aligned 44 to the right of each glyph and 8 below its centre |
| SHORT_LIST (Sequence 7) | MITIGATE PART and KEEP THE REST centred above the decision loop at (3480, 1905) and (3480, 1951), mono 38 (24 px at zoom 0.62). They build at the desk, not beside the packet (section 7.1) |
| Doorway stops (Sequence 7) | the packet stops at (4440, 1610) for Mitigate and (4380, 1540) for Retain, with Priora at (4530, 1520) and (4470, 1430); both packet stops overlap the forecourt's stone rim |

Visiting order sweeps one way round the clover: Retain (upper left), across the forecourt to Mitigate (below), on to Transfer (upper right). Sequence 7 continues the same direction, doorway to doorway without crossing: Mitigate, then Retain.

### 4.8 Paths, defined once

| Path | From → to |
|---|---|
| ROUTE_CASE_TO_PANEL | CASE_A → CASE_WAIT, a gentle arc above the real world (Sequence 3); controls (2700, 1560), (2350, 1480) |
| ROUTE_WORK | from the closed ring at P (x 1380), out through PANEL_ENTRANCE, then C 2300 1500, 2660 1700 down to just above the window (Sequence 4). Drawn once (F1244–F1292); it steps back to context at the desk and in the rooms, and goes completely as the drawing recedes in Sequence 8 |
| ROUTE_ESCALATE | from (1960, 1500) over the real world to PACKET_DOCK (controls (2500, 1200), (3460, 1800)), then down to the desk corner, so it ends on the desk and not in the air (Sequence 5). It fades once the packet is at the desk (F1644–F1660) |
| PATH_DESK_FORECOURT plus spurs | the risk owner to every room threshold (Sequence 6), and the route back to the desk (Sequence 7); they stay faintly visible to the dissolve |
| DOORWAY_TOUR | Transfer → Mitigate doorway → Retain doorway → PACKET_DOCK (Sequence 7; Priora stops at each doorway and never crosses) |
| HUMAN_LINE | always starts at DESK_ORIGIN. In Sequence 5 it rises from the desk, tangent to the loop it joins, and loops loosely round the packet at PACKET_DOCK (radius 92, entering at 160°, 320° of arc). In Sequence 6 it runs along PATH_DESK_FORECOURT, onto the rim, round it and up a spur. In Sequence 7 it is drawn once, round the decided packet, and closes |
| RECORD_DROP | PACKET_DOCK straight down past the end of the desk, then under the risk owner to rest just above RECORD_MARK_2, at (3300, 2378) (controls (3480, 2330), (3420, 2400)), the case at half scale (Sequence 8) |

---

## 5. Cast

All glyphs are cobalt with ink texture unless noted. Sizes are world units. `stills/cast/cast sheet.png` shows every agent at zoom 0.37, 1.0 and 1.75; `stills/cast/case sheet.png` every state of the case; `stills/cast/people sheet.png` the silhouettes, safeguards, room agents and the photo.

| Character | Silhouette | Size | Movement signature |
|---|---|---|---|
| Priora | cobalt ring with a generous paper opening (outer radius 30, inner 14), fine orbit radius 50, one bead radius 6.5 | 112 across with orbit | long smooth glides; the bead turns to the target about 6 frames before the ring moves, smoothed so it never snaps; a slight lift as it attends to each Mitigate option |
| Site rules | a disc split into two halves by a paper band; the upper half slides into register | 54 | aligns: pieces slide into register as it settles |
| Insurer conditions | two opposing brackets with a narrow opening | 56 | closes round a detail; from Sequence 5 its pieces stay 4 units apart |
| Fire | disc with a clean 40° wedge removed | 56 | turns its wedge towards the activity |
| Risk engineering | arch with a semicircular opening | 56 | opens out to examine its surroundings; seated, its arch opens towards the table |
| Evidence check | softened square with a small round aperture | 56 | frames and settles over an image |
| Ghost agents (3) | dashed stone outlines in the same family, names in grey | 56, 30 percent opacity | still; fade at the start of Sequence 4 (F1124–F1150) |
| Transfer agents (3) | dashed hexagons with a small dashed inner mark, lighter than the site agents; labelled CARRIER, CAPACITY, BROKER | 50 | still; answer with hollow pieces |
| Room agents (Retain) | small cobalt dot, half dome and rounded square | 24 | gather round the packet |
| Safeguards (Mitigate) | ring (thermal check), capsule (longer watch), small house (workshop), each with a disc stack and an open clock arc | 48 | lift, try the gap, return |
| Finding marks (5) | small cobalt arc pieces, like the arcs they become | about 24 across | appear by their agents, wait near the entrance, leave together, go back in at an even pace and become the arcs |
| Case | see 4.5 | 124 open with arcs, 116 as packet | carried; never transforms into another symbol |
| Worker, site, risk owner | solid ink silhouettes with a fine worn texture and barely there contact shadows | as 4.2 | print-like arrivals; the risk owner never moves |
| Human decision line | ink, 5 px on screen | | draws from the desk; loops loosely round the packet in Sequence 5; in Sequence 6 reaches each threshold before Priora crosses; in Sequence 7 drawn once, at the final close |
| Agent threads | cobalt, 2 px on screen, dotted where the storyboard says dotted | | dots travel at a steady speed |

Texture, as built: paper is a seamless 1024 px grain tile (512 world units a tile) plus one whole-sheet low-frequency mottle, both generated once from `feTurbulence` with fixed seeds (`npm run textures`). Ink is one SVG filter per shape and seed: fine flecks cut only inside an eroded copy of the shape (so edges stay clean) and a slow density variation. Fleck strength follows the zoom (full from 1.0 up, none at 0.6 and below), because sub-pixel flecks would shimmer in wide shots; the pattern itself never changes. On the black shapes the charcoal flecks are fewer and open only halfway to the paper (45 percent), so the shapes read warm grey and the welding spark stays the one bright point.

---

## 6. Camera

### 6.1 Named shots

Shot = centre (x, y) and zoom. View = 1920/zoom by 1080/zoom world units.

| Shot | Centre | Zoom | View (world) | Used for |
|---|---|---|---|---|
| S1_REAL | (2880, 2100) | 1.00 | x 1920–3840, y 1560–2640 | Sequence 1 |
| S2_VOICE | (2672, 2075) | 1.80 | x 2139–3205, y 1775–2375 | the voice note: close on the worker, the factory to the right, the risk owner just off frame |
| S2_CASE | (2800, 1950) | 1.38 | x 2104–3496, y 1559–2341 | case assembly and the photo; the risk owner in frame at context opacity |
| S3_PANEL | (1390, 1436) | 0.72 | x 57–2723, y 686–2186 | panel arrives, specialists summoned; even margins above the title and below the wall. The factory stays off frame; the top of the worker's hard hat shows at the bottom right edge, at context opacity (the real world steps back during the move here) |
| S3_TABLE | (1360, 1507) | 1.10 | x 487–2233, y 1016–1998 | checks at the table, Priora outside |
| S4_CASE | (1300, 1500) | 1.75 | x 751–1849, y 1191–1809 | arcs lock into the ring; the top and bottom seats stay off frame |
| S4_ROUTE | (2760, 2000) | 0.96 | x 1760–3760, y 1438–2563 | route to the work, record, no one disturbed |
| S5_GAP | (1930, 1720) | 0.82 | x 759–3101, y 1061–2379 | the slip, rulers, barrier, the spark in the distance |
| S5_DESK | (3330, 2120) | 1.30 | x 2592–4068, y 1705–2535 | the packet at the desk, the human line |
| S6_ROOMS | (4190, 1555) | 0.62 | x 2642–5738, y 684–2426 | rooms appear |
| S6_RETAIN | (3760, 1288) | 1.25 | x 2992–4528, y 856–1720 | Retain; Transfer and Mitigate stay just off frame |
| S6_MITIGATE | (4440, 2110) | 1.25 | x 3672–5208, y 1678–2542 | Mitigate; Retain, Transfer and the forecourt stay off frame |
| S6_TRANSFER | (4864, 1245) | 1.20 | x 4064–5664, y 795–1695 | Transfer; Retain's edge in frame at 25 percent |
| S7_SYSTEM | (4190, 1555) | 0.62 | as S6_ROOMS | rooms working together, the desk |
| S8_SHEET | (2980, 1640) | 0.37 | x 385–5575, y 181–3099 | the whole system |

Text floors this implies (22 px labels, 44 px sentences): at zoom 0.62 a label needs world size 36 or more; at 0.37, 60 or more and sentences 119 or more. Labels sized for a close shot fade before the camera pulls back past their floor (section 7.1).

Why S6_RETAIN and S6_MITIGATE frame off centre: the brief keeps the SIMULATED label with Transfer every time Transfer is on screen. In a centred Retain or Mitigate close-up, part of Transfer's band shows while its label is off frame. These framings keep Transfer completely out of those two close-ups instead. In the pans between the close-ups a sliver of Transfer can still enter the frame; SIMULATED then holds just inside the frame edge (section 7.1).

### 6.2 Camera moves

`MOVES` in `src/camera/camera-keys.ts` is the only camera list in the film. The camera starts at S1_REAL and, between moves, is completely still (no drift), so text can appear, checks can be read and decisions can land. Every move eases in and out with the default curve, so it starts and ends at rest, and lasts at least 40 frames. Zoom changes geometrically, and the centre is blended so the world point under the screen centre travels smoothly at any zoom.

| # | From | To | Length | Shot |
|---|---|---|---|---|
| 1 | F0238 | F0278 | 40 f | S1_REAL → S2_VOICE |
| 2 | F0498 | F0538 | 40 f | S2_VOICE → S2_CASE |
| 3 | F0654 | F0710 | 56 f | S2_CASE → S3_PANEL |
| 4 | F0970 | F1014 | 44 f | S3_PANEL → S3_TABLE |
| 5 | F1148 | F1192 | 44 f | S3_TABLE → S4_CASE |
| 6 | F1264 | F1324 | 60 f | S4_CASE → S4_ROUTE |
| 7 | F1392 | F1438 | 46 f | S4_ROUTE → S5_GAP |
| 8 | F1590 | F1644 | 54 f | S5_GAP → S5_DESK |
| 9 | F1691 | F1731 | 40 f | S5_DESK → S6_ROOMS |
| 10 | F1774 | F1814 | 40 f | S6_ROOMS → S6_RETAIN |
| 11 | F1930 | F1970 | 40 f | S6_RETAIN → S6_MITIGATE |
| 12 | F2154 | F2194 | 40 f | S6_MITIGATE → S6_TRANSFER |
| 13 | F2351 | F2391 | 40 f | S6_TRANSFER → S7_SYSTEM |
| 14 | F2530 | F2570 | 40 f | S7_SYSTEM → S8_SHEET |

From F2570 the camera holds S8_SHEET to F2882.

Four moves shifted in Step 3, each inside its own sequence: the rise to S2_CASE starts after the voice ends and the grey words are going, so the rise carries the phrases (F0498, was F0478); the approach to the case starts as the five marks reach Priora (F1148, was F1124); the widening to the route starts at F1264 and runs 60 frames (was F1248 to F1300, 52 frames); the move to the desk starts once DECISION PACKET is up, so the label appears with a still camera (F1590, was F1568). The other ten moves are as planned.

---

## 7. Sequences at a glance

| Seq | Frames | Focal subject | On screen text (verbatim) |
|---|---|---|---|
| 1 Real work in the middle | F0000–F0237 | worker, site and risk owner on the ground line; then Priora and the orbit of five specialists | Real work in the middle. · WORKER · SITE · RISK OWNER · Agents around it. |
| 2 A voice becomes a case | F0238–F0653 | the worker's voice note, then the case assembling above the factory | the worker's message, word for word · REPAIR · HOT WORK · PACKING LINE · BEFORE NIGHT SHIFT · SITE + INSURANCE CONDITIONS · PHOTO · Photo of the bracket? · CASE |
| 3 The site chooses its cast | F0654–F1123 | the site panel: specialists summoned through the entrance, checks at the table, Priora outside | Site panel · CONFIGURED FOR THIS SITE · Electrical · Structural · Security · Evidence check · Risk engineering · Site rules · Fire · Insurer conditions · FIRE WATCH? |
| 4 When the conditions hold | F1124–F1391 | the findings becoming the ring, then the route to the work and the quiet desk | INSIDE THE CONDITIONS · RECORD KEPT · NO ONE DISTURBED |
| 5 A condition slips | F1392–F1690 | the gap; the fire watch rulers; then the packet carried to the risk owner and the human line | FIRE WATCH PLANNED: 30 MIN · POLICY ASKS: 60 MIN · NO HARD STOP CONFIGURED · DECISION PACKET · RISK OWNER DECIDES |
| 6 Three decision rooms | F1691–F2350 | the clover, then Retain, Mitigate and Transfer in turn | Retain · Mitigate · Transfer · DESIGN PROPOSAL (×2) · SIMULATED |
| 6 Retain | F1691–F1929 | the closed threshold; the human line opens it; the bridged gap | AN AGENT CANNOT CHOOSE IT · RISK OWNER · EXPOSURE · AUTHORITY · CONDITIONS · EXPIRY |
| 6 Mitigate | F1930–F2153 | two safeguards tried in the gap | Thermal check · Extend watch to 60 min · Move weld to workshop · PARTIAL · FULL · BACK INSIDE |
| 6 Transfer | F2154–F2350 | the dashed room asking simulated capacity | SIMULATED · NO INSURER ON PRIORA YET · CARRIER · CAPACITY · BROKER · ELIGIBILITY · TERMS · SAFEGUARDS · PRICE ? |
| 7 The rooms work together | F2351–F2529 | one packet at the Mitigate and Retain doorways, then the decision at the desk | MITIGATE PART · KEEP THE REST · RISK OWNER DECIDES |
| 8 The whole system | F2530–F2882 | the whole sheet; then the final statement; then the name | A DESIGN PROPOSAL · Priora turns physical work / into explicit risk decisions, / while the work happens. · Priora |

Rules that span sequences, and where they hold:

- **The gap** opens at F1440, two frames after the camera settles on S5_GAP, and is readable whenever the case is on screen until the decision in Sequence 7: the human line closes F2465–F2485 and the marks turn solid at F2489. In Retain it is bridged with the original gap readable beneath; in Mitigate's preview the filling piece is dashed, so the gap still reads; in Sequence 7 the piece and the bridge stay dashed until the decision.
- **SIMULATED** is a persistent, readable sized label: visible and at least 22 px whenever any of Transfer is in frame, including the wide shots of Sequences 7 and 8. It arrives 6 frames after Transfer's band starts to print (F1733, F1739). In the pans it holds just inside the frame edge, and Transfer stays off frame in the Retain and Mitigate close-ups (section 6.1).
- **The human line** always starts at DESK_ORIGIN. In Sequence 6 it reaches each doorway before Priora crosses; in Sequence 7 Priora does not cross, and the line is drawn once, at the close.
- **The spark** flickers from F1292 to the final dissolve (it goes F2808–F2838), from a fixed, hand-made flicker pattern (no random noise).
- **The ghosts** fade at the start of Sequence 4 (F1124–F1150), before its first move, and are gone well before Sequence 8.

### 7.1 What Step 3 built, and where it departs from the storyboard or brief

Step 3 built every sequence inside its settled frames, and no sequence changed length. Below: what was built, sequence by sequence; the focus and text exit rules as built; and every place the build departs from the storyboard or the brief. Where something did not fit, the option that keeps the most empty paper won (decision 13), and each such call is listed here.

**Built, sequence by sequence**

- **Sequence 1** is tightened: worker F0080–F0100, site F0104–F0124, risk owner F0128–F0148, Priora F0152–F0168, the specialists from F0176. The five settle by F0204, when "Agents around it." starts, and the bead's short arc (F0160–F0178) leads the ellipse (F0172–F0190) by 12 frames. So the whole relationship holds still from F0216 to F0238 (22 frames). The ellipse withdraws and Priora glides towards the worker under the first camera move, when no text is appearing.
- **Sequence 2** ends in storyboard order. The bead turns to the waveform (F0298–F0304) before the listening thread extends. The camera rises at F0498, after the voice has ended and the words have greyed; the grey words fade out F0494–F0504, so they are gone as the zoom first takes them under 44 px. The selected phrases each travel in their own 20-frame window, in a set order (packing line, bracket, cracked, before the night shift, weld), so no two touch. "cracked" comes to rest beside "bracket" and dissolves into REPAIR. The sentence's full stop greys out with the ordinary words. The conditions line and its facet (the fifth) arrive before the empty PHOTO position (the sixth). The photo rises from below the facet, so it never crosses the PHOTO label. The chip labels fade at F0626. Then the photo settles F0638–F0644 and turns solid F0640–F0646, the facets fold slightly (radius 92 to 80) F0642–F0652, and CASE appears at F0648 with a 6-frame fade, in before the camera moves at F0654.
- **Sequence 3**: the summons threads start at the case's edge, and their tips meet the arriving agent. Short echoes, 2 and 4 frames behind, follow the agents as they enter. Risk engineering's arch opens towards the table. Site rules' mark sits under the core. FIRE WATCH? is coral and travels on a path clear of Fire's glyph and name.
- **The findings** (`src/film/findings.ts`). Each finding appears as a small arc-shaped mark by its agent when its check ends, and moves round inside the table to wait near the entrance (the slots are parted round Priora's fine connection line). The fifth (Insurer conditions) joins them F1104–F1122. The five leave through the entrance together from F1120 (2 frames apart, 22 frames each) and rest beside Priora by F1150. From F1150 they go back in one after another (3 frames apart) at an even pace (16 world units a frame on average). Each swings round to its agent's side of the case, and there becomes its arc, which slides the last short way into the ring (arc starts F1207 to F1216, all in by F1228). The arcs close F1226–F1234, the ring locks F1234–F1242 and its hairline joints close on the lock, INSIDE THE CONDITIONS shows F1238–F1278, the route draws F1244–F1292, and the spark starts at F1292. This replaces the earlier version, in which the findings were taken into Priora.
- **The facets keep their marks** until the packet folds in Sequence 5: travel radius 56 with chips 11 (Sequence 3), open 92/16 at the table, 50/11 in Sequence 4 (clear of the findings ring at 70), 46/5.5 as the packet. The marks fade F1540–F1552.
- **One focal arrangement at the ring.** As the ring closes and locks (F1226–F1242) the seated agents and seats step back to context opacity (28 percent). They come forward again during the camera's return in Sequence 5 (F1392–F1438), in time for the slip. So the ring is the one focal arrangement.
- **Sequence 5**: the slip starts at F1440, once the camera has settled on S5_GAP. The barrier is a broken gate: two posts and a rail, with pieces missing. The escalation route fades once the packet is at the desk (F1644–F1660), so only the human line meets the packet. The human line's rise into the desk loop is tangent to the loop.
- **Sequence 6, the rooms.** The forecourt, the paths, Retain and Mitigate print during the move to S6_ROOMS. Transfer's band prints after the camera settles (F1733–F1755), so SIMULATED can arrive with it at F1739. The room names arrive once the camera is still (Retain F1731, Mitigate F1737, Transfer F1739), each 5 to 6 frames after its band, each status 2 frames after its name (SIMULATED with Transfer's name). Priora takes the packet from the desk only after the Sequence 5 loop has let go (F1741–F1757).
- **Sequence 6, the doorways.** Retain's threshold line is drawn closed before Priora stops short. The human line joins the forecourt rim and leaves it for each spur on smooth fillets. At each room the black line opens the threshold with a still camera before Priora crosses: 6 frames before at Retain and at Mitigate, 4 at Transfer. At Transfer, SIMULATED and NO INSURER ON PRIORA YET both arrive before the line. Priora enters Retain through the middle of the doorway, with the packet 8 frames behind.
- **Sequence 6, inside the rooms.** AN AGENT CANNOT CHOOSE IT sits lower, at (4016, 1150), and leaves at F1890, before the leaders arrive. In Mitigate the middle safeguard prints after Priora has passed it, and Priora's bead turns to each option as it attends to it, with a slight lift. The Transfer copies travel on fine dashed paths and land just inside each agent. The dashed answers rest as a 2 × 2 cluster beside the packet, clear of the decision loop.
- **SIMULATED in the pans.** In the close-up pans a sliver of Transfer can be in frame while the label's own place is not. So in the film SIMULATED holds just inside the frame edge while any of the room is in frame (`src/lib/simulated.ts`). In a still frame it is always in its place.
- **Between Sequences 6 and 7**: the human line draws back to the desk during the widening move (F2351–F2371), so the single Sequence 7 line is the only one drawn there.
- **Sequence 7**: the short list builds at the desk: MITIGATE PART at F2407 and KEEP THE REST at F2437, the moments each room's proposal meets the packet at its doorway. Beside the packet at the doorways there is no clean paper wide enough for a 22 px label at zoom 0.62, so the option that keeps the most empty paper won. The packet's doorway stops still overlap the forecourt's stone rim (the spurs are 87 units long and the packet is 124 across). The proposed coral bridge and the safeguard piece stay dashed, with the gap's coral ends visible beneath, until the decision; they turn solid at F2489, as RISK OWNER DECIDES appears.
- **Sequence 8**: the decided case lowers (F2532–F2554) and leaves its record mark (F2554–F2562), the window flickers, and only then does Priora rise (F2564). NO INSURER ON PRIORA YET leaves as the camera withdraws (F2530). The two DESIGN PROPOSAL room statuses step aside F2574–F2584, before A DESIGN PROPOSAL. The veil is the textured paper itself, so the wordmark sits on the grain. The work route recedes fully with the drawing. The statement leaves F2808–F2824, and the wordmark comes in from F2824.
- **Everywhere**: Priora's bead leads each glide by about 6 frames. The Priora state applies the lead to every move and smooths the bead over a short window, so no beat says "at once" and the bead never snaps. The charcoal flecks on the black shapes are fewer and half open, so the welding spark stays the one bright point.

**Departures from the storyboard or the brief**

| Where | Storyboard or brief | As built, and why |
|---|---|---|
| The gap | the brief: it opens at F1410 | it opens at F1440, after the camera settles on S5_GAP; a slip during the move could not be read |
| Transfer's band | the rooms print during the move to S6_ROOMS | Retain and Mitigate do; Transfer prints after the camera settles (F1733–F1755), so SIMULATED can arrive with it |
| SIMULATED | the brief: Transfer keeps its label every time it is on screen | in the pans the label holds just inside the frame edge, as near its place as it can, so a sliver of Transfer is never on screen without it |
| Transfer's threshold | the plan asked for 6 frames between the line opening a threshold and Priora crossing | 6 at Retain and Mitigate, 4 at Transfer; the line still reaches and opens it before Priora crosses |
| The short list | "A small label joins the packet" | MITIGATE PART and KEEP THE REST build at the desk, on clean paper, as each proposal meets the packet |
| The doorway stops | the packet at each doorway, without crossing | it does not cross, but the stops overlap the forecourt's stone rim |
| The routes in Sequence 8 | "routes remain faintly visible through the paper-like atmosphere" | the desk path and its spurs do; the escalation route went at F1644–F1660, and the work route goes with the recession, so the statement sits on clean paper |
| NO INSURER ON PRIORA YET | Transfer's labels stay with the room | it leaves at F2530: in the whole sheet it would run into Retain's status. SIMULATED stays |
| The room statuses | not mentioned | the two DESIGN PROPOSAL statuses step aside F2574–F2584, so A DESIGN PROPOSAL says it once for the whole sheet |
| The final dissolve | "the surrounding drawing and statement dissolve" | the drawing dissolves over the storyboard's second and a half (F2808–F2853); the statement leaves first (F2808–F2824), so the wordmark never sits on it |

**One focal arrangement at a time**

Everything outside the current arrangement is off frame or at 28 percent (`CONTEXT_OPACITY`). Opacities change during camera moves, with two exceptions: the seated agents step back as the ring locks (F1226–F1242), and the site, its spark and the work route step back from F1572, as the packet leaves the panel, 18 frames before the camera follows.

| Shot | At context opacity (or off frame) |
|---|---|
| S1_REAL, S4_ROUTE, S8_SHEET | nothing: the whole real world is the subject |
| S2_VOICE | the risk owner is off frame |
| S2_CASE | the risk owner (from F0498 to F0538) |
| S3_PANEL, S3_TABLE | the worker, the site and the risk owner step back to 28 percent during the move to the panel (F0654–F0710) and come forward again during the widening to the route (F1264–F1324); they are off frame here except the top of the worker's hard hat at S3_PANEL; the ghosts sit at 30 percent |
| S4_CASE | the real world is off frame; once the ring locks, the seated agents and seats sit at 28 percent |
| S5_GAP | the worker and the record line (the site and its spark stay: the spark "continues in the distance"); the agents and seats are back to full for the slip |
| S5_DESK | the site, its spark, the work route and the record line |
| S6_ROOMS, S7_SYSTEM | the worker, the site, the ground line, the record line and the work route; the risk owner and the desk stay, as the origin of the human line |
| S6_RETAIN, S6_MITIGATE | the other rooms are off frame |
| S6_TRANSFER | Retain's edge, at 25 percent with its labels hidden |

**Text exits** (no label shrinks under its floor in a wide shot)

- The specialist and ghost names fade F1124–F1136, and the ghosts F1124–F1150, before Sequence 4's first move.
- AN AGENT CANNOT CHOOSE IT leaves at F1890. Retain's leaders and RISK OWNER fade from F1933, at the start of the move to Mitigate, before the pan takes them to the frame edge.
- PARTIAL leaves at F2084 as Thermal check withdraws. The safeguard names leave at F2150, and FULL and BACK INSIDE at F2164, as the proposal withdraws.
- The Transfer answers' labels leave at F2330, as Priora gathers the answers. CARRIER, CAPACITY and BROKER leave at F2351, as Sequence 7's widening begins; the dashed answer pieces travel with the packet.
- MITIGATE PART, KEEP THE REST, RISK OWNER DECIDES and NO INSURER ON PRIORA YET leave as Sequence 8's camera withdraws (F2530). At zoom 0.37 RISK OWNER DECIDES would cross Mitigate's band, and NO INSURER ON PRIORA YET would run into Retain's status.
- The two DESIGN PROPOSAL statuses step aside F2574–F2584.
- SIMULATED never fades while Transfer is in frame. In Sequence 8 it recedes under the paper veil at exactly the room's contrast, and dissolves with the room. The dashed Transfer answers carry no label of their own: the room's SIMULATED stays in frame through Sequences 7 and 8 and the answers stay dashed.

**The final statement** sits over the receded drawing, as the storyboard asks. The drawing recedes to 20 percent contrast under a veil of the textured paper (F2610–F2640). The spark stays bright beneath the words until the dissolve. In Sequence 8 the drawing keeps the desk path with its spurs; the travel-only paths, the escalation route and the work route are gone.

**Small items resolved by recommendation** (say if you want otherwise): AN AGENT CANNOT CHOOSE IT is set in Mono capitals like every other all-capitals string; the Transfer agents sit outside the wall; Evidence check's corner marks in Mitigate come from a small Evidence check glyph among Mitigate's room agents, not from a trip across the sheet.

---

## 8. Timeline and beat sheets

Every frame here comes from `src/lib/timeline.ts` and `src/camera/camera-keys.ts`. Frame ranges are inclusive. "Readable" is the number of frames each text item is fully visible (95 percent opacity or more), inside the frame with a 40 px margin and at or above its size floor; "needed" is 10 frames per word, minimum 20. Text from the registry is measured exactly as the checker measures it. Text drawn by its component (the voice note, chip labels, panel, agent and room names, statuses and role labels) was measured the same way once, outside the checker. Sizes are on screen, at the shot where the text is read.

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

Camera: F0000 S1_REAL · hold to F0237 (the first move starts at F0238)

Narration: N1 "Real work in the middle: a worker, a site, a risk owner. Priora places agents around it." F0008–F0229 (17 words at 2.3 wps, 222 f)

| Frames | Beat |
|---|---|
| F0000–F0034 | ground line draws left to right, a tiny round ink cap on the leading edge |
| F0010–F0021 | text **Real work in the middle.** (sentence, 52 px, readable 231 f, 50 needed) |
| F0080–F0100 | worker prints in on "worker" (large arrival, contact shadow) |
| F0104–F0124 | site prints in on "site" |
| F0105–F0114 | text **WORKER** (label, 24 px, readable 135 f, 20 needed) |
| F0128–F0148 | risk owner prints in on "risk owner" |
| F0129–F0138 | text **SITE** (label, 24 px, readable 111 f, 20 needed) |
| F0152–F0168 | Priora appears above the group on "Priora" (small arrival) |
| F0153–F0162 | text **RISK OWNER** (label, 24 px, readable 87 f, 20 needed) |
| F0160–F0178 | bead sweeps a short arc across the three |
| F0172–F0190 | orbit ellipse grows both ways from Priora |
| F0176–F0204 | five specialists arrive along it (62°, 298°, 128°, 232°, 180°), stagger 4, 12 frames each, each with its own small turn |
| F0204–F0215 | text **Agents around it.** (sentence, 52 px, readable 39 f, 30 needed) |
| F0216–F0237 | hold: the whole relationship holds still, 22 frames to the camera move at F0238 |

Hand-off: Under Sequence 2's first camera move (F0238–F0278): the ellipse withdraws (F0240–F0258), the three labels fade from F0244 and the sentences from F0246 and F0248, and the specialists drift outwards and soften out (F0244–F0270). The bead turns to the worker (F0244–F0250) and Priora glides towards it (F0250–F0296). No new text.

Checker: every rule passes.

### Sequence 2: A voice becomes a case

F0238–F0653, 416 frames (0:07.9–0:21.8). Tightest rule-clean need 416 frames.

Camera: F0238 S1_REAL · move to S2_VOICE F0238–F0278 (40 f) · hold to F0498 · move to S2_CASE F0498–F0538 (40 f) · hold to F0653

Narration: W1 "Hey, the bracket by the packing line has cracked again. We’re going to weld it before the night shift." F0272–F0483 (19 words at 2.7 wps, 212 f); N2 "Priora hears the job, and asks for a photo." F0506–F0623 (9 words at 2.3 wps, 118 f)

| Frames | Beat |
|---|---|
| F0238–F0278 | camera closer to the worker (the Sequence 1 exit runs under it) |
| F0244–F0250 | bead turns to the worker |
| F0250–F0296 | Priora glides to PRIORA_LISTEN, just above and to the right of the worker |
| F0260–F0276 | worker raises the phone |
| F0266–F0276 | a fine ink stem draws from the phone to the start of the waveform |
| F0272–F0483 | waveform grows from the phone with the voice |
| F0276–F0283 | text **Hey, the bracket** (sentence, 44 px, readable 215 f, 30 needed) |
| F0298–F0304 | bead turns to the waveform |
| F0302–F0314 | underline "bracket" |
| F0304–F0314 | listening thread from the bead down to the waveform's growing tip; it follows the tip until the voice ends, cobalt dots travelling back in small groups |
| F0309–F0316 | text **by the packing line** (sentence, 44 px, readable 182 f, 40 needed) |
| F0336–F0350 | underline "packing line" |
| F0354–F0361 | text **has cracked again.** (sentence, 44 px, readable 137 f, 30 needed) |
| F0369–F0381 | coral underline "cracked" |
| F0387–F0394 | text **We’re going to** (sentence, 44 px, readable 104 f, 30 needed) |
| F0420–F0427 | text **weld it** (sentence, 44 px, readable 71 f, 20 needed) |
| F0424–F0436 | underline "weld" |
| F0443–F0450 | text **before the night shift.** (sentence, 44 px, readable 48 f, 40 needed) |
| F0447–F0475 | underline "before the night shift" |
| F0484–F0494 | remaining words fade to pale grey, the full stop with them; the listening thread lets go |
| F0488–F0504 | phrases separate gently |
| F0492–F0498 | bead turns to the case position |
| F0494–F0504 | grey words, waveform and underlines fade fully out |
| F0498–F0534 | Priora glides to PRIORA_CASE |
| F0498–F0538 | camera rises with the phrases (no new text: the last words appeared 55 frames earlier) |
| F0506–F0542 | each phrase travels in its own 20-frame window towards its chip: packing line from F0506, bracket F0508, cracked F0514, before the night shift F0518, weld F0522 |
| F0524–F0538 | Priora draws the thin circle |
| F0534–F0542 | core dot prints |
| F0534–F0546 | "cracked" comes to rest beside "bracket" and fades into it |
| F0540–F0564 | four chips print REPAIR, HOT WORK, PACKING LINE, BEFORE NIGHT SHIFT (stagger 4, 12 frames each); each phrase dissolves in the 8 frames before its chip's label prints |
| F0556–F0565 | text **REPAIR** (label, 25 px, readable 66 f, 20 needed) |
| F0558–F0574 | conditions line rises from the factory roof into the bottom facet (it goes F0600–F0614) |
| F0560–F0569 | text **HOT WORK** (label, 25 px, readable 62 f, 20 needed) |
| F0564–F0573 | text **PACKING LINE** (label, 25 px, readable 58 f, 20 needed) |
| F0568–F0577 | text **BEFORE NIGHT SHIFT** (label, 25 px, readable 54 f, 30 needed) |
| F0572–F0584 | the fifth facet, the conditions chip, prints |
| F0580–F0592 | the empty PHOTO position draws dashed with a question mark |
| F0588–F0597 | text **SITE + INSURANCE CONDITIONS** (label, 25 px, readable 34 f, 30 needed) |
| F0590–F0596 | bead turns to the worker |
| F0596–F0605 | text **PHOTO** (label, 25 px, readable 26 f, 20 needed) |
| F0596–F0605 | text **Photo of the bracket?** (sentence, 44 px, readable 46 f, 40 needed) |
| F0598–F0612 | dotted thread descends carrying the request |
| F0612–F0622 | worker tilts the phone |
| F0622–F0638 | photo travels up, rising from below the facet so it never crosses the PHOTO label |
| F0626–F0635 | the chip labels fade |
| F0630–F0640 | bead back to the case |
| F0638–F0644 | photo settles into the facet |
| F0640–F0646 | the facet turns solid: the dashed perimeter becomes continuous |
| F0642–F0652 | the six facets fold slightly closer to the centre (radius 92 to 80) |
| F0646–F0653 | "Photo of the bracket?" fades |
| F0648–F0653 | text **CASE** (label, 44 px, readable 40 f, 20 needed; a 6-frame fade, in before the camera moves at F0654) |

Hand-off: Ends with the case, its six facets slightly folded and CASE beneath it, the camera still at S2_CASE. The fold to the travel radius happens during Sequence 3's travel.

Checker: every rule passes.

### Sequence 3: The site chooses its cast

F0654–F1123, 470 frames (0:21.8–0:37.5). Tightest rule-clean need 470 frames.

Camera: F0654 S2_CASE · move to S3_PANEL F0654–F0710 (56 f) · hold to F0970 · move to S3_TABLE F0970–F1014 (44 f) · hold to F1123 (and on to F1148, in Sequence 4)

Narration: N3a "Next, it summons only the specialists this site and job need." F0756–F0899 (11 words at 2.3 wps, 144 f); N3b "Each checks its own conditions and reports back." F0988–F1092 (8 words at 2.3 wps, 105 f)

| Frames | Beat |
|---|---|
| F0648–F0654 | bead leads the travel |
| F0654–F0710 | Priora glides left; the case follows on a short thread along ROUTE_CASE_TO_PANEL (F0660–F0716); the fine connection appears between them (F0654–F0664); facets fold to the travel radius in flight (56, chips 11, F0654–F0694); CASE rides along (24 px by the end) and fades from F0690 |
| F0654–F0684 | the worker lowers the phone |
| F0654–F0710 | the worker, the site and the risk owner step back to context (28 percent): Sequence 3 belongs to the panel |
| F0672–F0706 | the wall draws round from the entrance |
| F0684–F0708 | the table prints |
| F0690–F0712 | the seats print |
| F0696–F0716 | the ghosts print at 30 percent |
| F0714–F0723 | text **Site panel** (name, 33 px, readable 253 f, 20 needed) |
| F0720–F0729 | text **CONFIGURED FOR THIS SITE** (label, 23 px, readable 247 f, 40 needed) |
| F0728–F0737 | text **Electrical** (name, 22.5 px, readable 392 f, 20 needed) |
| F0734–F0743 | text **Structural** (name, 22.5 px, readable 386 f, 20 needed) |
| F0740–F0749 | text **Security** (name, 22.5 px, readable 380 f, 20 needed) |
| F0744–F0758 | bead turns to the ghost seats |
| F0764–F0778 | bead returns to the case |
| F0782–F0912 | summons, one every 18 frames: the facet pulses (10 frames), a thread reaches out from the case's edge and its tip meets the arriving agent, the specialist slides in with its signature (18), runs round inside the wall to its seat (20), settles (8). Order: Evidence check (F0782), Risk engineering (F0800), Site rules (F0818), Fire (F0836), Insurer conditions (F0854). Short echoes, 2 and 4 frames behind, follow each moving agent |
| F0845–F0854 | text **Evidence check** (name, 22.5 px, readable 275 f, 20 needed) |
| F0863–F0872 | text **Risk engineering** (name, 22.5 px, readable 257 f, 20 needed) |
| F0881–F0890 | text **Site rules** (name, 22.5 px, readable 239 f, 20 needed) |
| F0899–F0908 | text **Fire** (name, 22.5 px, readable 221 f, 20 needed) |
| F0917–F0926 | text **Insurer conditions** (name, 22.5 px, readable 203 f, 20 needed) |
| F0918–F0950 | the case passes through the entrance and settles at the table centre (scale 1 to 1.15); Priora stays outside, the fine connection between them |
| F0950–F0970 | hold: Priora conducts from outside |
| F0970–F0986 | the title and sub fade (they sit above the table shots) |
| F0970–F1014 | camera to the table; the case opens into its facets in the move (F0976–F1008, radius 56 to 92) |
| F1016–F1040 | Evidence check frames the bracket image, aperture centres on the crack |
| F1028–F1052 | Risk engineering opens towards the table and draws a dashed radius round the packing line facet |
| F1040–F1060 | Site rules places a short horizontal mark under the core |
| F1040–F1106 | as each check ends, its finding appears as a small arc-shaped mark by its agent (Evidence check F1040, Risk engineering F1052, Site rules F1060, Fire F1072), waits 6 frames, then moves round inside the table for 28 frames to wait near the entrance |
| F1052–F1072 | Fire turns to the hot work facet and pulses along its edge |
| F1064–F1084 | Insurer conditions closes its brackets round the conditions facet |
| F1076–F1085 | text **FIRE WATCH?** (label, coral, 25.5 px, readable 28 f, 20 needed) |
| F1086–F1100 | FIRE WATCH? travels from Fire towards Insurer conditions; it fades from F1108 |
| F1100–F1110 | their answer joins the findings: the Insurer conditions mark appears |
| F1104–F1122 | the fifth mark joins the others near the entrance |
| F1120–F1150 | the five leave through the entrance together (2 frames apart, 22 frames each) and rest beside Priora; the check marks fade (F1120–F1130) |

Hand-off: The five marks finish leaving and rest beside Priora at F1150, inside Sequence 4. The camera stays still at S3_TABLE until F1148.

Checker: every rule passes.

### Sequence 4: When the conditions hold

F1124–F1391, 268 frames (0:37.5–0:46.4). Tightest rule-clean need 268 frames.

Camera: F1124 S3_TABLE · hold to F1148 · move to S4_CASE F1148–F1192 (44 f) · hold to F1264 · move to S4_ROUTE F1264–F1324 (60 f) · hold to F1391

Narration: N4 "When everything holds, the route opens. Work goes on, the record is kept, no one is disturbed." F1170–F1391 (17 words at 2.3 wps, 222 f)

| Frames | Beat |
|---|---|
| F1124–F1136 | the specialist and ghost names fade |
| F1124–F1150 | the ghosts fade; the five marks finish leaving and rest beside Priora |
| F1148–F1192 | camera closes on the case |
| F1150–F1216 | the marks go back in, starting 3 frames apart (F1150 to F1162), at an even pace (16 world units a frame on average); each swings round to its agent's side of the case |
| F1152–F1166 | Priora's fine connection to the case lets go |
| F1152–F1172 | the facets draw in (radius 92 to 50, chips 16 to 11), clear of the findings ring at 70; their marks stay |
| F1207–F1228 | each mark becomes its arc, which slides the last short way into the ring from its agent's direction, 12 frames each: Fire and Insurer conditions from F1207, Evidence check and Site rules from F1210, Risk engineering from F1216; all in by F1228 |
| F1226–F1234 | the arcs close into one continuous ring |
| F1226–F1242 | the seated agents and seats step back to context (28 percent) |
| F1234–F1242 | the ring locks with one soft pulse; its hairline joints close |
| F1238–F1247 | text **INSIDE THE CONDITIONS** (label, 42 px, readable 35 f, 30 needed) |
| F1244–F1292 | the route draws from the ring through the entrance to the window |
| F1264–F1324 | the worker, the site and the risk owner come back to full during the widening move |
| F1256–F1262 | bead turns ahead |
| F1262–F1312 | Priora glides to its pause point beside the route |
| F1264–F1324 | camera follows the route, widening to the real world |
| F1278–F1283 | INSIDE THE CONDITIONS fades |
| F1292 | route reaches the window: the spark starts flickering (to the dissolve) |
| F1302–F1322 | record line extends under the ground |
| F1322–F1330 | first record mark |
| F1334–F1343 | text **RECORD KEPT** (label, 24 px, readable 54 f, 20 needed) |
| F1346–F1355 | text **NO ONE DISTURBED** (label, 24 px, readable 42 f, 30 needed) |
| F1360–F1376 | Priora's bead turns attentively to the work |

Checker: every rule passes.

### Sequence 5: A condition slips

F1392–F1690, 299 frames (0:46.4–0:56.4). Tightest rule-clean need 299 frames.

Camera: F1392 S4_ROUTE · move to S5_GAP F1392–F1438 (46 f) · hold to F1590 · move to S5_DESK F1590–F1644 (54 f) · hold to F1690

Narration: N5 "One condition slips: the fire watch is half the policy. Priora brings it to the risk owner. Agents prepare, the human decides." F1404–F1690 (22 words at 2.3 wps, 287 f)

| Frames | Beat |
|---|---|
| F1392–F1401 | RECORD KEPT and NO ONE DISTURBED fade |
| F1392–F1438 | camera follows the route back to the panel; the worker and the record line step back to context; the seated agents and seats come forward again |
| F1440–F1466 | the gap opens at F1440: the Insurer conditions arc loosens, rotates 8°, drifts out and turns dashed (F1450) |
| F1440–F1450 | bead turns to the gap |
| F1444–F1460 | the Insurer conditions glyph separates its two pieces |
| F1458–F1468 | coral at the two exposed ends |
| F1470–F1479 | text **FIRE WATCH PLANNED: 30 MIN** (label, 22 px, readable 60 f, 50 needed) |
| F1472–F1486 | solid 30 MIN ruler draws |
| F1484–F1493 | text **POLICY ASKS: 60 MIN** (label, 22 px, readable 46 f, 40 needed) |
| F1486–F1514 | dashed 60 MIN ruler draws, twice as long at the same speed |
| F1496–F1512 | a pale broken gate draws across the route: two posts and a rail, with pieces missing |
| F1512–F1521 | text **NO HARD STOP CONFIGURED** (label, grey, 23 px, readable 46 f, 40 needed) |
| F1528–F1534 | bead leads |
| F1534–F1543 | rulers fade |
| F1534–F1560 | Priora moves to its pickup point below the route, clear of the gate |
| F1540–F1560 | facets fold inward (50 to 46, chips 11 to 5.5, their marks fading F1540–F1552), the ring contracts (70 to 58) and the case returns to scale 1; the loosened arc fades out; the gap kept |
| F1560–F1569 | text **DECISION PACKET** (label, 22 px, readable 28 f, 20 needed) |
| F1560–F1584 | the packet comes out through the entrance to Priora |
| F1562–F1571 | the gate and its label fade |
| F1572–F1626 | the site, its spark and the work route step back to context |
| F1584–F1644 | Priora carries the packet along ROUTE_ESCALATE to the dock beside the risk owner, floating just above and ahead of it; the route draws behind them |
| F1590–F1644 | camera follows to the desk |
| F1592–F1599 | DECISION PACKET fades, before the carry swings past it |
| F1644–F1660 | the escalation route fades: only the human line meets the packet |
| F1650–F1674 | the human line draws from the desk, its rise tangent to the loop, and loops loosely round the packet (low wooden note as it arrives) |
| F1678–F1687 | text **RISK OWNER DECIDES** (label, 28.5 px, readable 36 f, 30 needed) |

Hand-off: RISK OWNER DECIDES stays readable into Sequence 6's first move (28.5 px falling to 24.7 px) and fades from F1718.

Checker: every rule passes.

### Sequence 6, opening and Retain

F1691–F1929, 239 frames (0:56.4–1:04.3). Tightest rule-clean need 239 frames.

Camera: F1691 S5_DESK · move to S6_ROOMS F1691–F1731 (40 f) · hold to F1774 · move to S6_RETAIN F1774–F1814 (40 f) · hold to F1929

Narration: N6R-a "Retain is never a default." F1745–F1810 (5 words at 2.3 wps, 66 f); N6R-b "Risk is kept on purpose, with its terms explicit." F1811–F1928 (9 words at 2.3 wps, 118 f)

| Frames | Beat |
|---|---|
| F1691–F1731 | camera right and up; the ground line steps back to context |
| F1695–F1715 | the forecourt prints |
| F1697–F1721 | the paths print: the desk path and the three spurs |
| F1700–F1726 | Retain's band prints |
| F1706–F1732 | Mitigate's band prints |
| F1718–F1727 | RISK OWNER DECIDES fades |
| F1731–F1740 | text **Retain** (name, 40 px, 46 in the close-up, readable 194 f, 20 needed) |
| F1733–F1742 | text **DESIGN PROPOSAL** (Retain's status, label, 24.5 px, readable 198 f, 20 needed) |
| F1733–F1755 | Transfer's band prints, once the camera has settled |
| F1737–F1746 | text **Mitigate** (name, 40 px, readable 43 f, 20 needed) |
| F1739–F1748 | text **DESIGN PROPOSAL** (Mitigate's status, label, 24.5 px, readable 40 f, 20 needed) |
| F1737–F1759 | the three simulated agents print outside Transfer's wall |
| F1739–F1748 | text **Transfer** (name, 40 px, readable 43 f, 20 needed) |
| F1739–F1748 | text **SIMULATED** (label, 24.5 px, readable 217 f, 20 needed; then it holds inside the frame edge while any of Transfer is in frame) |
| F1741–F1757 | the human loop round the packet lets go |
| F1751–F1757 | bead leads |
| F1757–F1811 | Priora carries the packet from the desk along the path and across the forecourt, stopping short of Retain's doorway; the packet follows 4 frames behind |
| F1774–F1814 | camera approaches Retain |
| F1814–F1828 | Priora stops short at the closed threshold; bead to the doorway, then to the risk owner |
| F1830–F1839 | text **AN AGENT CANNOT CHOOSE IT** (label, 30 px, readable 56 f, 50 needed) |
| F1832–F1850 | the human line extends from the desk along the path, round the forecourt rim and up the spur, and reaches the doorway |
| F1850–F1856 | the line opens the threshold, from the middle |
| F1856–F1865 | text **RISK OWNER** (label, 30 px, readable 73 f, 20 needed) |
| F1862–F1886 | Priora carries the packet inside, through the middle of the doorway; the packet follows 8 frames behind (F1870–F1894) |
| F1880–F1902 | three small room agents gather round the packet |
| F1884–F1898 | coral bridge across the gap, the gap still readable beneath |
| F1890–F1897 | AN AGENT CANNOT CHOOSE IT leaves, before the leaders arrive |
| F1892–F1914 | four leader lines draw (10 frames each, 4 apart) |
| F1894–F1903 | text **EXPOSURE** (label, 30 px, readable 35 f, 20 needed) |
| F1897–F1906 | text **AUTHORITY** (label, 30 px, readable 32 f, 20 needed) |
| F1900–F1909 | text **CONDITIONS** (label, 30 px, readable 29 f, 20 needed) |
| F1903–F1912 | text **EXPIRY** (label, 30 px, readable 26 f, 20 needed) |
| F1914–F1929 | the arrangement holds while the narration finishes |

Checker: every rule passes.

### Sequence 6, Mitigate

F1930–F2153, 224 frames (1:04.3–1:11.8). Tightest rule-clean need 224 frames.

Camera: F1930 S6_RETAIN · move to S6_MITIGATE F1930–F1970 (40 f) · hold to F2153

Narration: N6M "Mitigate compares safeguards, and checks whether the work is back inside." F1982–F2125 (11 words at 2.3 wps, 144 f)

| Frames | Beat |
|---|---|
| F1928–F1934 | bead leads |
| F1930–F1946 | the retained treatment falls away (bridge, room agents, leaders); the packet is unresolved again |
| F1933–F1939 | RISK OWNER and the leaders fade, before the pan takes them to the frame edge |
| F1934–F1966 | Priora carries the packet across the forecourt to wait at the Mitigate doorway |
| F1936–F1950 | the human line leaves Retain, and Retain's threshold closes again |
| F1954–F1970 | the human line reaches the Mitigate doorway |
| F1970–F1978 | the line opens the threshold, with the camera still, 6 frames before Priora crosses |
| F1984–F2016 | Priora and the packet go down into the room, a long, even glide |
| F1998–F2020 | the safeguards print, 12 frames each, each after Priora has passed it: Thermal check from F1998, Move weld from F2002, Extend watch from F2008 |
| F2008–F2017 | text **Thermal check** (name, two lines, 27.5 px, readable 138 f, 20 needed) |
| F2012–F2021 | text **Move weld to workshop** (name, two lines, 27.5 px, readable 134 f, 40 needed) |
| F2018–F2026 | bead turns to Thermal check |
| F2018–F2027 | text **Extend watch to 60 min** (name, two lines, 27.5 px, readable 128 f, 50 needed) |
| F2026–F2040 | Thermal check rises from the paper (Priora lifts slightly) and moves to the packet |
| F2040–F2050 | its dashed piece fills part of the gap |
| F2054–F2063 | text **PARTIAL** (label, 27.5 px, readable 26 f, 20 needed) |
| F2084–F2098 | Thermal check withdraws; PARTIAL fades |
| F2086–F2100 | Extend watch rises and moves to the packet; the bead turns to it as Thermal check settles back |
| F2100–F2112 | its dashed piece extends across the whole opening; the ring reads continuous in preview, still dashed |
| F2116–F2125 | text **FULL** (label, 27.5 px, readable 44 f, 20 needed) |
| F2118–F2132 | Evidence check's corner marks settle round the result |
| F2134–F2143 | text **BACK INSIDE** (label, 27.5 px, readable 26 f, 20 needed) |
| F2150–F2166 | the proposal withdraws and the safeguard names fade; the packet is unresolved again |
| F2164–F2173 | FULL, BACK INSIDE and the corner marks fade (in the move to Transfer) |

Checker: every rule passes.

### Sequence 6, Transfer

F2154–F2350, 197 frames (1:11.8–1:18.4). Tightest rule-clean need 197 frames.

Camera: F2154 S6_MITIGATE · move to S6_TRANSFER F2154–F2194 (40 f) · hold to F2350

Narration: N6T "Transfer, simulated for now, asks outside capacity for terms and a price." F2194–F2350 (12 words at 2.3 wps, 157 f)

| Frames | Beat |
|---|---|
| F2154–F2160 | bead leads |
| F2154–F2163 | Retain's labels hide |
| F2154–F2194 | camera to Transfer; Retain steps to 25 percent (its edge is in the close-up) |
| F2160–F2174 | the human line leaves Mitigate, and its threshold closes |
| F2160–F2192 | Priora carries the packet up out of Mitigate to wait on the spur, short of Transfer's closed threshold |
| F2196–F2205 | text **NO INSURER ON PRIORA YET** (label, 28 px, readable 330 f, 50 needed), in the line kept for it under SIMULATED |
| F2198–F2212 | the human line reaches the Transfer doorway; SIMULATED and NO INSURER ON PRIORA YET are both up before it |
| F2212–F2218 | the line opens the threshold, authorising the inquiry |
| F2222–F2242 | Priora crosses; packet inside |
| F2234–F2254 | fine dashed paths draw from the packet out through the small openings, one for each agent |
| F2240–F2249 | text **CARRIER** (label, cobalt, 29 px, readable 107 f, 20 needed) |
| F2242–F2268 | dashed copies of the gap travel out along the paths and land just inside each agent |
| F2244–F2253 | text **CAPACITY** (label, cobalt, 29 px, readable 103 f, 20 needed) |
| F2248–F2257 | text **BROKER** (label, cobalt, 29 px, readable 99 f, 20 needed) |
| F2262–F2290 | hollow answers return and settle beside the packet |
| F2286–F2295 | text **ELIGIBILITY** (label, cobalt, 29 px, readable 40 f, 20 needed) |
| F2290–F2299 | text **TERMS** (label, cobalt, 29 px, readable 36 f, 20 needed) |
| F2294–F2303 | text **SAFEGUARDS** (label, cobalt, 29 px, readable 32 f, 20 needed) |
| F2298–F2307 | text **PRICE ?** (label, cobalt, 29 px, readable 28 f, 20 needed) |
| F2330–F2344 | Priora gathers the answers into the packet, a 2 × 2 dashed cluster at its side; the answer labels and the paths fade |
| F2344–F2350 | Priora starts back out of Transfer with the packet (the journey runs on into Sequence 7) |

Checker: every rule passes.

### Sequence 7: The rooms work together

F2351–F2529, 179 frames (1:18.4–1:24.3). Tightest rule-clean need 179 frames.

Camera: F2351 S6_TRANSFER · move to S7_SYSTEM F2351–F2391 (40 f) · hold to F2529

Narration: N7-a "Priora carries the case between rooms." F2363–F2441 (6 words at 2.3 wps, 79 f); N7-b "The risk owner stays in control." F2451–F2529 (6 words at 2.3 wps, 79 f)

| Frames | Beat |
|---|---|
| F2344–F2391 | Priora brings the packet, with the dashed Transfer answers at its side, out of Transfer and on to the Mitigate doorway (stops at the threshold, does not cross) |
| F2351–F2360 | CARRIER, CAPACITY and BROKER fade |
| F2351–F2371 | the human line draws back to the desk, quickly; Transfer's threshold closes (F2351–F2363) |
| F2351–F2391 | camera widens to all three rooms and the desk; Retain comes back to full |
| F2391–F2403 | a dashed safeguard piece comes out and fills part of the gap |
| F2392–F2401 | Retain's labels come back |
| F2397–F2403 | bead leads |
| F2403–F2421 | on to the Retain doorway |
| F2407–F2416 | text **MITIGATE PART** (label, 24 px, readable 119 f, 20 needed), at the desk |
| F2421–F2433 | a proposed coral bridge spans the rest of the gap, dashed |
| F2437–F2446 | text **KEEP THE REST** (label, 24 px, readable 89 f, 30 needed), at the desk under MITIGATE PART |
| F2437–F2463 | Priora returns to the desk with the packet and its short list |
| F2465–F2485 | the human line draws from the desk, once, and closes round the chosen combination |
| F2489 | the mitigation and retention marks turn solid; the dashed Transfer inquiry stays dashed, off to one side |
| F2489–F2498 | text **RISK OWNER DECIDES** (label, 24.5 px, readable 37 f, 30 needed) |
| F2495–F2507 | one soft pulse through the human line |
| F2507–F2529 | the camera stays still while RISK OWNER DECIDES is read and the voice finishes (a decision moment) |

Checker: every rule passes.

### Sequence 8: The whole system

F2530–F2882, 353 frames (1:24.3–1:36.1). Bare minimum 308 frames; 45 frames of air kept (a moment on the whole system, a half second of near silence after the voice, a full second of the name alone).

Camera: F2530 S7_SYSTEM · move to S8_SHEET F2530–F2570 (40 f) · hold to F2882

Narration: N8 "Priora turns physical work into explicit risk decisions, while the work happens." F2636–F2792 (12 words at 2.3 wps, 157 f)

| Frames | Beat |
|---|---|
| F2530–F2539 | MITIGATE PART, KEEP THE REST, RISK OWNER DECIDES and NO INSURER ON PRIORA YET fade |
| F2530–F2570 | camera withdraws to the whole sheet; the context comes back to full |
| F2532–F2554 | the decided case lowers to the record line, to half scale; the human line lets go (F2532–F2546) |
| F2554–F2562 | the second record mark (faint paper contact) |
| F2558–F2564 | bead leads |
| F2564–F2594 | Priora rises to the upper centre; its bead settles between the panel and the rooms (by F2600) |
| F2574–F2584 | the two DESIGN PROPOSAL room statuses step aside |
| F2596–F2605 | text **A DESIGN PROPOSAL** (label, 23 px, readable 36 f, 30 needed) |
| F2610–F2640 | the drawing recedes to about 20 percent contrast under a veil of the textured paper; the work route goes completely |
| F2636–F2645 | A DESIGN PROPOSAL fades |
| F2640–F2653 | text **Priora turns physical work** (sentence, 61 px, readable 163 f, 40 needed) |
| F2640–F2653 | text **into explicit risk decisions,** (sentence, 61 px, readable 163 f, 40 needed) |
| F2640–F2653 | text **while the work happens.** (sentence, 61 px, readable 163 f, 40 needed; the three lines together need 120) |
| F2793–F2807 | breathing room: the statement holds in near silence after the voice |
| F2808–F2823 | the statement leaves |
| F2808–F2853 | the drawing dissolves to the paper; the spark goes F2808–F2838 |
| F2824–F2843 | text **Priora** (wordmark, 96 px, readable 47 f, 20 needed) |
| F2853–F2882 | breathing room: "Priora" alone, still |

Checker: every rule passes.

---

## 9. Narration fit

Calm narration at 2.3 words per second; the worker's phone message at 2.7. Every line fits inside its sequence, no two lines overlap, and the animation is never sped up to fit a line. Retain's and Sequence 7's narration are each one storyboard line in two sentences, placed so their key words land with the picture ("kept on purpose" just before the bridge at F1884, "stays in control" as the line closes and the marks turn solid).

Checked against NARRATION in `src/lib/timeline.ts`, with each window = to − from + 1 frames: every line fits its window at its pace. N5 fits exactly (22 words need 287.0 frames and get 287). Every other line has less than a frame to spare, so each window is its line's length rounded up. No line is flagged.

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

These placements are NARRATION in `src/lib/timeline.ts`. `npm run srt` (`scripts/write-srt.ts`) writes `narration.srt` from the same table, and the review composition draws its subtitles from it, so the three can never disagree. The worker's message is spread evenly across W1's window (2.7 words per second), and the voice note's words and underlines are timed from it. When the real voice is recorded, its timings replace these windows, then `npm run srt` and `npm run qa` run again.

---

## 10. Review loop and automatic checks

### 10.1 The loop

Exactly the order in the brief, no skipping:

1. **This plan**, approved by you.
2. **Static world** (done in Step 2). Every element in its final resting state: the whole sheet, each territory up close, the cast, people and case sheets (`stills/world`, `stills/cast`, `npm run stills:world`). Proportions, spacing and colour were fixed here, before any animation.
3. **One sequence at a time** (done). Build; render the key stills (7 to 15 per sequence: start, end and every key moment in the storyboard) into `stills/sequence N` with `npm run stills:sequence -- N`; render a half resolution MP4 into `renders/review` with `npm run render:sequence -- N`; review; fix; re-render. Every sequence went through two review passes. The fixes of each pass are listed in its commit message; no separate `review.md` files were written.
4. **Full film** (done): the master and the review version (`npm run render:film`, `npm run render:review`).

### 10.2 Automatic checks (`npm run qa`)

`scripts/qa.ts` reads the film's own modules (the timeline, the camera moves, the cast tracks, the finding marks, the rooms and the text registry) and checks every frame of the film in one pass, so a broken rule fails before anything is rendered. `scripts/qa.mjs` bundles it with esbuild and runs it. Text widths come from the Plex font files through fontkit.

| Check | Rule |
|---|---|
| Camera moves | every move at least 40 frames; no two moves overlap |
| Text size | every text item the text layer draws is at or above 22 px (labels and names) or 44 px (sentences) on screen in every frame it is visible |
| Text margin | every such item sits inside the frame with a 40 px margin whenever its opacity is over 30 percent |
| Camera vs text | no text starts to appear while the camera moves |
| Reading time | each item fully readable (95 percent opacity, inside the margin, above its floor) for at least 10 frames per word, minimum 20 |
| Verbatim | every line of every registry item, including the voice note and chip labels drawn by their components, appears character for character (curly apostrophes included) in `Priora storyboard.md` |
| Numbers | no digits on screen except 30 and 60 |
| Motion jumps | Priora and the case: no single frame that moves more than 12 px and more than 2.5 times the frames round it |
| Too fast | things (Priora, the case and the finding marks): 90 px a frame at most, measured against the paper and against the frame, whichever is smaller, so a thing the camera follows is judged by how it moves on screen and a thing the camera pans past by the pan; the camera: 110 px a frame of pan or 6 percent zoom a frame at most; Priora's bead: 30 degrees a frame at most |
| Gap | from F1468 until the decision (F2485), whenever the case is drawn: the coral ends fully in, any filling piece dashed, and the Sequence 7 bridge dashed |
| SIMULATED | whenever Transfer's band has printed and any of the room is in frame, its label, at its held position, sits inside the 40 px margin, and after F1760 at 95 percent opacity or more |
| Human line | it opens each threshold before Priora's crossing: Retain before, Mitigate at least 6 frames before, Transfer before |

Every check passes on the final build (`npm run qa`: "every check passes").

Not automated: the label delay (4 to 6 frames), clean paper under text, the 40 percent of empty paper and texture stability, and the size and margin of text drawn by its component (room names and statuses, agent names, the voice note, chip labels and role labels). These were reviewed on the stills, and the component text was measured once for section 8. Room names and statuses cross the frame edge for a few frames during the pans between rooms.

### 10.3 Renders

| Deliverable | Settings |
|---|---|
| `renders/Priora film master.mp4` | H.264, CRF 16, yuv420p, 1920 × 1080, 30 fps, 2883 frames (`npm run render:film`); sent in the chat, not committed |
| `renders/Priora film master.mov` | ProRes 422 HQ, 10 bit: skipped for now (decision 12) |
| `renders/Priora film review with subtitles.mp4` | H.264, CRF 16, yuv420p, the review composition with burned in narration subtitles (`npm run render:review`) |
| `renders/review/sequence N half resolution.mp4` | half resolution (960 × 540), one per sequence, Sequence 6 as one video (`npm run render:sequence -- N`) |

`renders/` is ignored by git.

---

## 11. Risks

| Risk | What I will do |
|---|---|
| Video files are large; GitHub refuses files over 100 MB | `renders/` is ignored by git; the films are sent in the chat (decision 12) |
| Ink texture filters can shimmer when shapes move by fractions of a pixel | handled in Step 2: fine flecks fade out below zoom 1.0 and are gone at 0.6, and every pattern is fixed to its shape. There is no automated stability test; the half resolution reviews are where shimmer would show |
| Render time with many filters | measured in Step 2; the half resolution review renders keep iteration fast |
| Text widths come from the Plex font files (Medium and SemiBold estimated from the variable font's default instance) | the checker measures registry text with fontkit from the same files, Medium 3 percent and SemiBold 5 percent wider than the default instance; the stills confirm the placements on screen |
| The recorded voice will not match 2.3 words per second exactly | NARRATION in `timeline.ts` holds each line's window; a recording replaces them, then `npm run srt` and `npm run qa` run again |

---

## 12. Questions, answered

| # | Question | Answer |
|---|---|---|
| Q1 | "R · M · T" beneath the room names | Cut. The full room names are enough. |
| Q2 | Words for the three simulated Transfer agents | CARRIER, CAPACITY and BROKER. No company names; all three stay dashed. |
| Q3 | The closing "Priora" | The Priora wordmark: IBM Plex Sans SemiBold, tracking minus 15/1000 em, ink #111111. Ink token #111111, paper #F5F3EE. |
| Q4 | Where the masters go | `renders/` is ignored by git. The H.264 film and the subtitled version are sent in the chat; ProRes is skipped for now. |
