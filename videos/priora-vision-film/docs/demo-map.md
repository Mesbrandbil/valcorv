# Demo map: priora-end-state-demo.html for scene builders

The Priora end-state demo (`../../priora-end-state-demo.html`, read-only) is the film's destination. This map lists everything the film reuses from it: the site geometry, the interface components, every on-screen text per scenario step, the data behind them, and what the film must not reuse.

Extracted by driving the demo in Playwright at a 1920x1080 viewport (the demo's own layout at that size: 68 px header, 356 px rail, 1564x1012 px canvas, 100 px economic logic bar). Extraction and verification scripts live in the session scratchpad (`scratchpad/demo-extraction/`), reference screenshots in `scratchpad/demo-ref/`.

## 1. What was extracted

| File | What it is |
| --- | --- |
| `assets/site/site-precise.svg` | The isometric Nordhavn site in world coordinates (camera removed), with envelope, zone labels, Sprinkler Zone 3 and anchors. Pixel-verified against the demo. |
| `assets/site/site-model.json` | Ids, roles, world bboxes, plan geometry, anchors, envelope points and normals, activity and ambient positions, camera framings, the outside-envelope geometry and a verified port of the demo's deformation code. |
| `assets/site/glyphs.svg` | Every `<symbol>` of the demo sprite plus node, reticle, anchor, slice ring, token and check-state symbols; signal via `currentColor` or `var(--signal)`. |
| `assets/css/product.css` | The interface components under `.pui`, scalable with `--pui-scale`, signal mapped to `var(--signal)`. |

### 1.1 Using site-precise.svg

- World coordinates: plan point (x, y, z) maps to world `[(x - y) * 0.8660254, (x + y) * 0.5 - z]`. The demo camera maps world to canvas px as `world * s + [tx, ty]`.
- Hairlines, dashes and labels are screen-constant, as in the demo, through one CSS variable on the root: `--sw` = 1 screen px in world units. Default `0.166379` = 1/6.01038, the overview camera. When a scene zooms to scale `s` (px per world unit), set `--sw: 1/s` (GSAP can tween it alongside the viewBox). Labels sit in `.px` groups scaled by `--sw`, so they stay 10 px.
- Default `viewBox` is 16:9 at the overview scale, centred on the envelope. Camera framings are in `site-model.json` under `cameras` (see 1.3).
- Styles are baked as classes under `.priora-site` (inline `<style>`): `f f-t/f-r/f-l` faces, `det` details, `e` pipe bridge, `faint` roads and bays, `dash` loading outline, `grid` ground crosses, `paint` roof numbers, `ground`, sprinkler `zf zx zo hd hx`, envelope `env-fill env env-a env-b`, labels `zl szl`.
- Sprinkler Zone 3 states: add class `off` to `#sprinkler-zone-3` for the demo's offline end state (heads hollow, crosses on, hatch on, darker tighter dashes); change `#sz3-label-status` text to `OFFLINE`, or `RESTORED` after the change option. Heads and crosses carry `data-i`, the demo's ripple order from the valve (55 ms per step).
- Path data is the demo's own output (`M/L/Z`, `A` arcs on the tanks), untouched, so a jitter pass can tween back to it exactly. `pathLength` was removed so DrawSVG measures real lengths. `data-draw-delay` (ms) and `data-draw` (`stroke` or `fade`) record the demo's draw order.
- Ids are plain (`production-hall`, `roof-zone-03`, `sprinkler-zone-3`, `envelope-outline` ...). HyperFrames needs ids unique across the assembled page, so a scene that inlines the SVG next to another copy must prefix them.
- Painter order matters (document order of `#world`); keep it.

Key ids: `envelope-fill`, `world`, `ground-crosses`, `roads`, `loading-area` (`-ground`, `-outline`, `-bays`), `utilities` (+ `utilities-stack`), `tanks` (`tank-1`, `tank-2`), `pipe-bridge`, `production-hall` (faces, `production-hall-roof-dividers`, `roof-zones` with `roof-zone-01/02/03` each holding `-area`, `-skylights` for 01 and 02, and `-label`), `production-hall-2`, `laboratory` (+ `laboratory-stacks` 1 to 3), `warehouse`, `loading-area-containers` (`container-1`, `container-2`, each `-trailer` and `-cab`), `sprinkler-zone-3` (`sz3-fill`, `sz3-hatch`, `sz3-outline`, `sz3-heads` with `sz3-head-00..30`, `sz3-crosses`), `envelope` (`envelope-outer`, `envelope-outline`, `envelope-label`), `envelope-label-path` (in defs, for textPath), `zone-labels` (`zone-label-utilities`, `-production-hall`, `-roof`, `-production-hall-2`, `-laboratory`, `-warehouse`, `-loading-area`, each with `-leader` and `-text`), `sz3-label` (`sz3-label-leader`, `sz3-label-name`, `sz3-label-status`), `anchors` (`anchor-hot-work`, `anchor-roof-01/02/03`, `anchor-roof-01-relocation`, `anchor-sz3-valve`, `anchor-envelope-centre`, `anchor-hero-exit`, `anchor-loading-area-centre`). 210 ids in total, all listed with bbox in `site-model.json` `elements`.

The demo draws no gate. Site access reads from the road ends (main road y=40 runs east past the loading area; west roads x=29 and x=32 run north).

### 1.2 Site facts in plan units

Envelope: superellipse centre (56, 37), a 74, b 60, n 3.6, 220 samples. Production Hall x 34 to 74, y 8 to 36, h 12; roof zones 01 (x 34 to 47), 02 (47 to 60), 03 (60 to 74). Production Hall 2 x 74 to 94, y 8 to 30, h 9. Utilities x 6 to 26, y 6 to 24, h 9, stack to z 21. Tanks at (11, 31) and (20, 31), r 3.3, h 11. Laboratory x 6 to 26, y 38 to 58, h 11, three fume stacks. Warehouse x 34 to 70, y 46 to 72, h 10. Loading area x 74 to 106, y 40 to 72, two trailers at the dock. Sprinkler Zone 3 covers Roof 03 (x 60.6 to 73.4, y 8.6 to 35.4, z 12) and the Production Hall 2 roof (x 74.6 to 93.4, y 8.6 to 29.4, z 9), 31 heads, valve at (74, 20). Hot-work node: Roof 03 centre (67, 22, 12), world `[38.971, 32.5]`. Change option "Move work outside affected zone" relocates it to (41, 20, 12) on Roof 01.

### 1.3 Camera framings

All framings are in `site-model.json` `cameras`, each with `s`, `tx`, `ty`, `sw`, `targetBox`, `pageViewBox` (pixel-registered to the demo screenshot at 1920x1080), `canvasViewBox` and `centredViewBox` (same zoom, target centred in a 1920x1080 frame).

| Key | Demo step | s | centredViewBox |
| --- | --- | --- | --- |
| `overview` | Stages 'intro', 'operating' (A site already has insurance / Physical work changes the real risk) and 'portfolio' (The site keeps operating) | 6.01038 | `-143.269 -56.345 319.447 179.689` |
| `roof03CloseUp` | Stage 'hero': Hot work begins on Roof 03 (zoom cap 10) | 10 | `-45.901 -25.015 192 108` |
| `somethingChanges` | Stage 'deviation': Something changes (zoom cap 9; the camera move runs 4200 ms, from 2000 ms into the stage) | 8.83133 | `-43.605 -33.161 217.408 122.292` |
| `decision` | Stage 'decision': The risk becomes a decision (whole envelope, node outside, framed left of the 600 px decision sheet; zoom cap 7.4) | 4.43059 | `-200.221 -80.22 433.351 243.76` |
| `transfer` | Stages 'transfer-packaging' / 'transfer-offers' / 'transfer-bound' (zoom cap 7; site pushed to the far left behind the packet and carriers) | 7 | `-86.044 -49.158 274.286 154.286` |

The demo camera moves are log-scale zoom with a linear centre path, easeInOutCubic: overview to Roof 03 over 2200 ms, Roof 03 to "Something changes" over 4200 ms (starting 2000 ms into the stage, together with the node's 3400 ms exit), to the decision view over 1900 ms, back to the overview over 2400 ms in the portfolio.

## 2. Scenario, step by step, with exact on-screen text

Texts are verbatim. The demo writes time ranges with an en dash (14:18–18:00) and separates fields with a middle dot (·). It contains no em dashes. Each chapter caption shows `NN` over `09`, then the layer track `PHYSICAL → STATE → DECISION → PRICE` (layers reached so far in ink, current one underlined).

### 2.0 Persistent frame

- Header: mark + `Priora`, tag `END-STATE CONCEPT`; `NORDHAVN BIOPROCESSING` / `Copenhagen · fictional site`; programme pill: `PROPERTY + BI PROGRAMME` with status, `ANNUAL PROGRAMME` `DKK 4.2bn insured value`, `LEAD CARRIER` `Northstar Commercial`, `RENEWAL` `01 JAN 2027` (do not reuse, see section 5); `SITE TIME` clock (08:55 at open); demo controls `Play` / `Pause` / `Resume` / `Replay` / `Awaiting decision` / `Awaiting selection`, `Rewind`, `Reset`.
- Programme status texts (glyph, text): `g-inside` `All activity inside`; `g-checking` `Recalculating 1 activity`; `g-outside` `1 activity outside conditions`; `g-retained` `1 increment retained`; `g-cover` `1 slice on temporary cover`; portfolio and end: `g-inside` `5 explicit decisions today`.
- Rail, live: `LIVE ACTIVITY` / `NORDHAVN · TODAY`; counters `OBSERVED`, `INSIDE`, `DECISIONS` (0/0/0 at intro, 12/12 at open, 28/28 at 10:03, 159/159 at 12:43, 190/189/0 at the decision, 214/209 at 16:40).
- Rail, record: `TRUSTED RECORD` / `APPEND-ONLY`, then `N ENTRIES`. Empty state: `Every important event will be appended here, in order.`
- Stream row: time, activity name, zone, state glyph and label. State labels: `Checking state`, `Inside envelope`, `Outside envelope`, `Changed · inside`, `Risk retained`, `Temporary cover`, `System`.
- Economic logic bar: `ECONOMIC LOGIC` / `Conceptual. Not actuarial.`; cells `NORMAL ACTIVITY` `Inside annual programme` `DKK 0 incremental` → `DEVIATION` `Decision required` (signal) → `CHANGE` `DKK 0` | `RETAIN` `Company carries` `incremental exposure` | `TRANSFER` `Market price` + `on request` / `requested` / `1 quote`, `3 quotes` / `DKK 980 bound`. The active cell gets a 2 px top bar (signal on DEVIATION); in the portfolio all but DEVIATION are on with counts `×209`, `×3`, `×1`, `×1`.

### 2.1 Intro (stage `intro`, caption 01)

- Lines: `Every site already has insurance.` then `But risk is not static.` / `It changes with every physical activity.` and `NORDHAVN BIOPROCESSING · COPENHAGEN · A FICTIONAL SITE`.
- Site draws (strokes 2400 ms staggered by `data-draw-delay`, fills after), envelope draws 1000 ms later (2600 ms).
- Caption 01: `A site already has insurance.` / `Nordhavn Bioprocessing operates inside an annual property and business interruption programme: the envelope drawn around the site.` Envelope label `ANNUAL PROGRAMME ENVELOPE · PROPERTY + BI`.
- Rail legend `HOW TO READ THE SITE`: `INSIDE ENVELOPE` Covered by the annual programme. Most activity. / `CHECKING STATE` Priora verifies the conditions it depends on. / `OUTSIDE ENVELOPE` (signal) A material deviation. A decision is required. / `CHANGED` Work modified until it is back inside. DKK 0. / `RISK RETAINED` Owned, explicit and time-bound. / `TEMPORARY COVER` A carrier covers the slice until it expires.
- CTA: `Play scenario` or press `Space`.

### 2.2 Operating (stage `operating`, captions 02 and 03, 21 s)

- Caption 02: `Physical work changes the real risk, all day.` / `Every activity is observed as it happens and checked against the conditions under which the risk was accepted.`
- Caption 03 (at 12.5 s): `Most activity stays inside the accepted envelope.` / `Nothing special happens. Ordinary work simply moves through the system.`
- Record: `08:55` `Day opened · site baseline verified` / `Annual programme conditions loaded · Property + BI`; `08:55` `Routine activity · 12 recorded inside envelope` (the count climbs with the counters).
- Routine activities (time, name, zone, location), each spawns `Checking state` then `Inside envelope` after 1.1 s; non-persistent ones fade after 7 s; persistent ones (P) stay:
  - `09:02` Pump inspection · Utilities · Pump house P2
  - `09:07` Filter replacement · Production Hall · Line 1 air handling
  - `09:13` Electrical inspection · Laboratory · Distribution board L1
  - `09:21` Roof repair · Roof · Roof 01
  - `09:28` Sprinkler isolation · Warehouse · Zone 7 · planned, fire watch posted
  - `09:46` Forklift maintenance · Loading Area · Bay 2
  - `10:04` Routine inspection · Warehouse · Aisle C
  - `10:19` Electrical cabinet opened · Utilities · MCC-3
  - `10:37` Valve replacement · Utilities · Steam header V-12 (P)
  - `10:58` Fume hood service · Laboratory · Lab 2 (P)
  - `11:16` Crane lift · Loading Area · Planned lift · inside wind limit
  - `11:34` Production line shutdown · Production Hall · Line 2 · planned stop (P)
  - `11:52` Pump maintenance · Utilities · Tank farm T2
  - `12:15` Racking inspection · Warehouse · Racks 14 to 22 (P)
  - `12:40` Sensor calibration · Laboratory · Bioreactor suite
  - `13:05` Conveyor service · Production Hall 2 · Packing conveyor (P)
  - `13:31` Dock leveller repair · Loading Area · Dock 3 (P)
  - `13:52` Roof drain clearing · Roof · Roof 02
  - `14:06` Compressor check · Utilities · Air compressor C1
- Ambient pulses (decorative rings, not activities) every 380 ms at 72 seeded spots, listed in `site-model.json`.

### 2.3 Hero: "Hot work begins on Roof 03" (stage `hero`, caption 04, 10.2 s)

- Caption 04: `Hot work begins on Roof 03.` / `Priora checks the conditions this activity depends on. All five hold, so it sits inside the envelope.`
- Sprinkler Zone 3 and its label appear: `SPRINKLER ZONE 3` / `ACTIVE`. Reticle on the node. Clock 14:18.
- Stream: `14:18` `Hot work · Roof 03` / `Roof` / `Checking state`.
- Activity card: `ACTIVITY · ACT-1418-R03`, `Hot work`, `ROOF 03 · 14:18–18:00`, `Contractor · certified operator`, checks (600 ms apart): `Certified operator`, `Extinguishing equipment`, `Fire watch`, `Combustibles cleared`, `Automatic sprinkler protection`, each gaining `VERIFIED`. Footer: `CHECKING N OF 5` / `CHECKING STATE`, then `5 OF 5 VERIFIED` / `INSIDE ENVELOPE`. A leader line runs from the card to the node.
- Readout at the node: `HOT WORK · ROOF 03`, then `CHECKING STATE` / `Verifying 5 conditions`, then `INSIDE PROGRAMME` / `DKK 0 incremental`.
- Record: `14:18` `Hot work started · Roof 03 · inside envelope` / `Contractor · certified operator · planned 14:18–18:00`; `14:18` `5 of 5 conditions verified`.

### 2.4 "Something changes" (stage `deviation`, caption 05, 7 s)

- Caption 05: `Something changes.` / `14:42 · Sprinkler Zone 3 is taken offline while hot work continues above it. The activity leaves the conditions of the annual programme.`
- 150 ms: Sprinkler Zone 3 goes offline (ripple from the valve), label `OFFLINE`; stream `14:42` `Sprinkler Zone 3 offline` / `Production Hall 2` / `System`; record `Sprinkler Zone 3 taken offline` / `Roof 03 and Production Hall 2 · automatic protection unavailable`.
- 1300 ms: the card's last row becomes `UNAVAILABLE` (crossed circle), footer `4 OF 5 HOLD` / `RECALCULATING`; node to `checking`; readout `RECALCULATING RISK STATE` / `Sprinkler Zone 3 offline`; header `Recalculating 1 activity`.
- 2000 ms: the node leaves the envelope (section 4). At the crossing: state `outside`, stream `Outside envelope`, card footer `OUTSIDE ENVELOPE`, readout `OUTSIDE AGREED CONDITIONS` (signal) / `Decision required` with the slice `EXPOSURE · TEMPORARY · 3H 18M` (hatched signal bar from 14:42 to 18:00 on a 14:00 to 18:30 axis), header `1 activity outside conditions`, economics DEVIATION on.
- Record: `14:42` `Risk state moved outside annual programme conditions` / `Hot work · Roof 03 · incremental exposure temporary, 3h 18m`; `14:43` `Decision requested · Site Risk Manager`.

### 2.5 Decision (stage `decision`, caption 06)

- Caption 06: `The risk becomes a decision.` / `Change the activity, retain the risk, or transfer it. The risk owner decides, not the system.` Site dims to 50 %, camera pulls back to the whole envelope, envelope label shortens to `ANNUAL PROGRAMME ENVELOPE`.
- Decision sheet:
  - Eyebrow: `14:43 · DECISION REQUESTED · SITE RISK MANAGER`
  - Heading: `Risk state changed`
  - Text: `Roof hot work is continuing while sprinkler protection in the affected zone is unavailable.`
  - Facts row: `EXISTING PROGRAMME` `Outside agreed conditions` | `INCREMENTAL EXPOSURE` `TEMPORARY` | `EXPECTED DURATION` `3h 18m` `14:42–18:00`
  - Timeline row: `14:18 · OBSERVED` `Inside · 5 of 5 verified` → `14:42 · CHANGED` `Sprinkler Zone 3 offline` → `14:43 · NOW` `Outside · your decision` (signal glyph)
  - `WHAT DO YOU WANT TO DO?`
  - Choice 1 (key 1, `g-changed`): `CHANGE ACTIVITY` / `Modify the work or restore a safeguard until it returns inside the envelope.` / `INCREMENTAL DKK 0`
  - Choice 2 (key 2, `g-retained`): `RETAIN RISK` / `Knowingly carry the incremental exposure. Priora records who, what and for how long.` / `OWNED AND RECORDED`
  - Choice 3 (key 3, `g-cover`): `TRANSFER RISK` / `Ask the market whether a carrier will cover this temporary slice.` / `CARRIER PRICED`
  - Foot: `Priora supplies the observed state. The decision stays with the risk owner.`
- Node detail card (click on the hero node): `OUTSIDE ENVELOPE`, `Hot work`, `ROOF · SINCE 14:18`, `WINDOW 14:18–18:00`, `LOCATION Roof 03`, `ZONE Roof`, `CONDITIONS 4 of 5 · sprinkler protection unavailable`, `RECORD REC-0404-E3F8`. A routine node shows e.g. `INSIDE ENVELOPE`, `Pump inspection`, `UTILITIES · SINCE 09:02`, `WINDOW 09:02 · ongoing`, `LOCATION Pump house P2`, `ZONE Utilities`, `RECORD REC-538D-3CB4`.

### 2.6 Change path (caption 06 `Change the activity.`)

- Caption: `Change the activity.` / `Often the simplest outcome: modify the work until it is back inside the envelope.`; while resolving: `The physical state is restored, then the risk state is recalculated.`
- Options sheet: eyebrow `CHANGE ACTIVITY · 4 CONTROLS AVAILABLE`, heading `Bring the work back inside the envelope`, text `Each control changes the physical state. Priora recalculates the risk state before the work continues.`, then:
  1. `Move hot work to tomorrow` / `Stop now and resume at 07:00 with Zone 3 active.` / `PAUSED · INSIDE`
  2. `Restore sprinkler protection` + tag `RECOMMENDED` (radio pre-marked, row tinted) / `Reopen the Zone 3 valve. Protection back within minutes.` / `INSIDE · DKK 0`
  3. `Add temporary suppression` / `Mobile suppression unit and a second fire watch.` / `INSIDE · DKK 0`
  4. `Move work outside affected zone` / `Relocate to Roof 01, covered by Sprinkler Zone 1.` / `INSIDE · DKK 0`
  - `BACK TO THE THREE CHOICES`
- Resolving sheet: eyebrow `CHANGE ACTIVITY · <option title>`, heading `Restoring protection` (restore) or `Changing the activity`, text `The physical state changes first. Then the risk state is recalculated against the annual programme.`, three steps with spinner then check: option step 1 (`Protection restoring...`, `Stopping hot work on Roof 03...`, `Temporary suppression deployed...`, `Relocating work to Roof 01...`), `State recalculated...`, `Back inside accepted envelope`. Restore sets the zone label to `RESTORED`; relocation moves the node to Roof 01 over 2600 ms. The node travels back inside (2600 ms) and becomes `changed`.
- Resolved sheet (caption 07 `The decision is recorded.` / `The incremental risk disappears back into the annual programme at DKK 0. The activity continues.`): eyebrow `14:48 · STATE RECALCULATED`, heading `Back inside accepted envelope`, text `<note>. The incremental risk has disappeared back into the annual programme and the activity continues.` where note is `Sprinkler Zone 3 restored` / `Rescheduled to tomorrow 07:00` / `Temporary suppression added` / `Relocated to Roof 01`; `INCREMENTAL PRICE` `DKK 0`; two record blocks (14:47 option record, 14:48 decision record); `NEXT · THE SITE KEEPS OPERATING` `Continue` `Rewind to decision`.
- Readout: `BACK INSIDE ACCEPTED ENVELOPE` / `DKK 0 incremental`, slice `14:42–14:48 · CLOSED · DKK 0`.

### 2.7 Retain path (caption 06 `Retain the risk.`)

- Caption: `Retain the risk.` / `A legitimate economic choice, made explicitly rather than by accident.`
- Confirm sheet: eyebrow `RETAIN RISK · CONFIRMATION REQUIRED`, heading `Retain incremental risk`, list `TEMPORARY EXPOSURE` `Roof hot work without automatic sprinkler protection` / `DURATION` `3h 18m · 14:42–18:00` / `DECISION OWNER` `Site Risk Manager · Anna Møller` / `ADDITIONAL INSURANCE` `None purchased`.
- Acknowledgement (dashed box, then solid with a filled check when ticked): `Nordhavn Bioprocessing knowingly carries this incremental exposure until 18:00, outside the annual programme.` Button `ACCEPT RETAINED RISK` (28 % opacity until ticked). `BACK TO THE THREE CHOICES`.
- Retained sheet (caption 07 `The decision is recorded.` / `Nordhavn knowingly carries the incremental exposure until 18:00. What, who, when and for how long are preserved.`): eyebrow `14:46 · DECISION RECORDED`, heading `Risk retained`, text `No additional insurance purchased. The exposure is explicit, owned and time-bound, not an accidental gap.`, record block `14:46` `Incremental risk retained by Nordhavn Bioprocessing` / `Decision: Anna Møller, Site Risk Manager` / `Exposure: roof hot work without automatic sprinkler protection · 3h 18m · until 18:00` / `REC-0408-48F6 · aaf8 08c5`, note `The activity continues. The record preserves what changed, who accepted it, when, for how long and what was retained.`
- Readout: `RISK RETAINED · NORDHAVN` / `14:46 to 18:00 · no insurance purchased` (see section 5), slice `RETAINED 14:46–18:00 · OWNED`. Header `1 increment retained`.

### 2.8 Transfer path (captions 06 and 07)

- Captions: `Transfer the risk.` / `Priora packages the observed activity-level state and asks the market. Carriers apply their own appetite and pricing.`; `The market responds.` / `Four carriers, their own terms. One declines as outside appetite. Priora does not price or rank the offers.`; `The decision is recorded.` / `Temporary capacity covers this slice of risk from 14:48 until 18:00, alongside the annual programme, not instead of it.`
- Risk packet `Requesting capacity` `PKT-0412`, fields appear 250 ms apart: `Activity` `Hot work`; `Location` `Roof 03`; `Duration` `3h 18m`; `Current protection` `Sprinkler Zone 3 offline` (underlined); `Operator` `Certified`; `Fire watch` `Active`; `Extinguishing equipment` `Confirmed`; `Asset exposure` `Production Hall 2`; `Existing programme` `Outside accepted conditions` (underlined). Sealed footer `OBSERVED STATE · SEALED` `f230 b4aa`. Folded token `PKT-0412 · 9 FIELDS`, sent along four hairlines to the carriers.
- Carriers (statuses `WAITING`, `EVALUATING`, then result): `NORTHSTAR COMMERCIAL` Existing carrier, `DECLINED`, `OUTSIDE APPETITE` / `No quote`; `ATLAS SPECIALTY` Temporary activity cover, `QUOTE · 14:47`, `DKK 980`, `DURATION Until 18:00`, `DEDUCTIBLE DKK 100,000`, `CAPACITY DKK 25m`, pill `SELECT`; `BOREAL RISK` `DKK 1,240`, deductible `DKK 50,000`; `HELVETIC INDUSTRIAL` `DKK 1,680`, deductible `DKK 25,000`. Arrival order: Northstar 700 ms, Atlas 1500, Boreal 2250, Helvetic 3050.
- Note under the packet: `Carriers set appetite and price. Priora supplies the observed state and does not rank offers.`
- After selecting (the reference shots select Atlas Specialty; the choice is arbitrary): card `SELECTED · BOUND`, others muted; plaque `CAPACITY BOUND` / `Atlas Specialty` / `DKK 980` / `VALID UNTIL 18:00 · FROM 14:48` / `TEMPORARY ACTIVITY COVER` / `ANNUAL PROGRAMME UNCHANGED` / `REC-0411-441D · 384a b936`; double hairline carrier to plaque to node. Readout `COVERED BY TEMPORARY CAPACITY` / `Atlas Specialty · DKK 980`, slice `COVERED 14:48–18:00 · DKK 980`. Header `1 slice on temporary cover`. Economics `DKK 980 bound`.

### 2.9 Portfolio: "The site keeps operating" (stage `portfolio`, caption 08)

- Caption 08: `The site keeps operating.` / `Hundreds of physical actions a day. Most disappear into the annual programme. A few become explicit decisions.`
- New activities every 720 ms (outcome and plate text):
  - `14:56` Pump inspection · Utilities · Pump house P1: inside, no plate
  - `15:08` Electrical cabinet opened · Laboratory · Panel L3: inside, no plate
  - `15:12` Crane lift · Loading Area · Loading Area: `DECISION MADE · CHANGED` / Crane lift / Rescheduled outside wind limit
  - `15:20` Filter replacement · Production Hall · Line 3: inside, no plate
  - `15:34` Grinding · Warehouse · Aisle F: `DECISION MADE · CHANGED` / Grinding / Moved outside Warehouse rack zone
  - `15:41` Gas detector bypass · Laboratory · Lab 1: `RISK RETAINED · NORDHAVN` / Gas detector bypass / Retained until 17:30
  - `15:47` Forklift maintenance · Loading Area · Bay 4: inside, no plate
  - `16:02` Roof inspection · Roof · Roof 01: inside, no plate
  - `16:05` Crane lift over Production Hall 2 · Production Hall 2 · Production Hall 2: `TEMPORARY COVER · BOREAL RISK` / Crane lift over Production Hall 2 / 2h cover · Boreal Risk · DKK 640 (not on the transfer path)
  - `16:05` Torch-on roofing · Roof · Roof 02: `DECISION MADE · CHANGED` / Torch-on roofing / Switched to cold-applied membrane (transfer path only)
- Hero plate: change `DECISION MADE · CHANGED` / `Hot work · Roof 03` / `Sprinkler Zone 3 restored`; retain `RISK RETAINED · NORDHAVN` / `Hot work · Roof 03` / `Anna Møller · until 18:00`; transfer `TEMPORARY COVER · ATLAS SPECIALTY` / `Hot work · Roof 03` / `DKK 980 · 14:48 to 18:00`.
- Rail summary `TODAY AT NORDHAVN` `08:55–16:40`: `214 OBSERVED TODAY`, `209 INSIDE ENVELOPE`, `Explicit decisions 5`, `Changed · back inside 3` (2 on the retain path), `Risk retained 1` (2), `Temporary cover 1`, `Incremental premium DKK 640` (DKK 980 on the transfer path), note `On the site now: 16 activities. 11 inside the envelope, 5 explicit decisions. Every decision is in the record.`
- Continue: `See the thesis` / `Rewind to decision` / `FROM RECORD TO CAPACITY`.

### 2.10 End (stage `end`, chapter 09 "From record to capacity.")

- `Physical risk used to be priced from what might happen.` (grey) then `Priora makes more of what is actually happening legible.`
- Chain (steps 520 ms apart), label / line / run figure:
  - `RECORD` / `Physical state observed as it happens` / `214 activities observed today`
  - `TRUST` / `Verified, ordered, fingerprinted` / `13 fingerprinted records` (change), `12` (retain), `16` (transfer)
  - `DECISION` / `Change, retain or transfer` / `5 explicit decisions · 3 changed, 1 retained, 1 transferred` (retain path: `2 changed, 2 retained, 1 transferred`)
  - `PRICE` / `Set by carriers on real state` / `Boreal Risk quote · DKK 640` (change, retain), `3 carrier quotes · DKK 980 selected` (transfer)
  - `CAPACITY` / `Bound only when needed` / `1 temporary cover bound · DKK 640 incremental` (DKK 980 on transfer)
- Mark + `Priora` | `Infrastructure for activity-level physical risk`.
- Disclaimer: `Conceptual future-state demonstration. Not current insurance functionality.` / `Nordhavn Bioprocessing, all carriers, people and prices are fictional.` Buttons `Rewind to decision`, `Replay`.

### 2.11 Trusted record per path (text / sub / id · fingerprint)

Shared opening (all paths):
- `08:55` [state] Day opened · site baseline verified / Annual programme conditions loaded · Property + BI · `REC-0401-46C5 · fd43 16b4`
- `08:55` [agg] Routine activity · N recorded inside envelope · `REC-0402-AED5 · f0dc c2fb`
- `14:18` [event] Hot work started · Roof 03 · inside envelope / Contractor · certified operator · planned 14:18–18:00 · `REC-0403-AA9A · e0b9 4d12`
- `14:18` [state] 5 of 5 conditions verified · `REC-0404-E3F8 · 6721 7a99`
- `14:42` [dev] Sprinkler Zone 3 taken offline / Roof 03 and Production Hall 2 · automatic protection unavailable · `REC-0405-0AF1 · 0d9b 70f9`
- `14:42` [dev] Risk state moved outside annual programme conditions / Hot work · Roof 03 · incremental exposure temporary, 3h 18m · `REC-0406-EFBE · a74b ec1f`
- `14:43` [event] Decision requested · Site Risk Manager · `REC-0407-A4EE · fe32 ac67`

Change, restore sprinkler protection:
- `14:47` [event] Sprinkler Zone 3 restored · `REC-0408-83D9 · efd1 8ae7`
- `14:48` [decision] Risk state returned inside annual programme · Incremental price DKK 0 / Decision: change activity · Restore sprinkler protection · Anna Møller · `REC-0409-CE15 · 9c21 55fb`

Other change options (14:47 entry differs; 14:48 entry keeps `REC-0409-CE15` with a different fingerprint):
- `14:47` [event] Hot work stopped · rescheduled to tomorrow 07:00 · `REC-0408-51CA · ba36 cfa1`
- `14:48` [decision] Risk state returned inside annual programme · Incremental price DKK 0 / Decision: change activity · Move hot work to tomorrow · Anna Møller · `REC-0409-CE15 · 232a f2b7`
- `14:47` [event] Temporary suppression added · Roof 03 · `REC-0408-DDD7 · 7749 28aa`
- `14:48` [decision] Risk state returned inside annual programme · Incremental price DKK 0 / Decision: change activity · Add temporary suppression · Anna Møller · `REC-0409-CE15 · 33b3 fa25`
- `14:47` [event] Hot work relocated · Roof 01 · `REC-0408-214E · 4a4b c3e9`
- `14:48` [decision] Risk state returned inside annual programme · Incremental price DKK 0 / Decision: change activity · Move work outside affected zone · Anna Møller · `REC-0409-CE15 · 4bca 3d8d`

Retain:
- `14:46` [decision] Incremental risk retained by Nordhavn Bioprocessing / Decision: Anna Møller · Site Risk Manager · 3h 18m · until 18:00 · no additional insurance purchased · `REC-0408-48F6 · aaf8 08c5`

Transfer (Atlas Specialty):
- `14:47` [event] Capacity requested · risk packet sent to 4 carriers / PKT-0412 · 9 fields of observed state · `REC-0408-D0B4 · f230 b4aa`
- `14:47` [event] 4 carrier responses · 3 quotes / Northstar Commercial declined · outside appetite · `REC-0409-4115 · 23a5 546e`
- `14:48` [event] Atlas Specialty selected / DKK 980 · deductible DKK 100,000 · capacity DKK 25m · `REC-0410-0D03 · e31f 894d`
- `14:48` [decision] Temporary capacity bound · DKK 980 / Atlas Specialty · 14:48 to 18:00 · decision: Anna Møller · `REC-0411-441D · 384a b936`
- `18:00` [sched] Temporary cover expires / Atlas Specialty · activity returns to annual programme terms · `REC-0412-63D0 · eeda 170e`

Portfolio additions (change path numbering; ids shift by path):
- `15:12` [decision] Crane lift rescheduled outside wind limit · `REC-0410-52FB · 838d ef09`
- `15:34` [decision] Grinding moved outside Warehouse rack zone · `REC-0411-5F70 · d06e 3edc`
- `15:41` [decision] Gas detector bypass retained · Laboratory / Decision: Mikkel Sørensen · Laboratory Manager · `REC-0412-3F2B · 074c 6cbd`
- `16:05` [decision] Crane lift over Production Hall 2 · Boreal Risk DKK 640 bound · `REC-0413-52E1 · 17b8 ad95`
- `16:05` [decision] Torch-on roofing switched to cold-applied membrane (transfer path only) · `REC-0416-1DBE · 9b15 fe73`

Kinds drive the timeline marker: `event` hollow dot, `dev` heavier dot, `decision` filled square with a 2 px ink bar and tinted row, `sched` dashed dot and grey text, pinned last with `· SCHEDULED`.

## 3. The DEMO data object, summarised

- `site`: Nordhavn Bioprocessing, Copenhagen. `programme`: Property + BI programme, DKK 4.2bn insured value, lead carrier Northstar Commercial, renewal 01 JAN 2027.
- `day`: open 08:55, hero start 14:18, hold 14:41, deviation 14:42, decision asked 14:43, retain 14:46, change 14:47, change inside 14:48, transfer request/quotes 14:47, bound 14:48, cover end 18:00, portfolio end 16:40.
- `counters`: 12 at open, 189 before the hero, 214 observed and 209 inside at the end.
- `owner`: Anna Møller, Site Risk Manager, Nordhavn Bioprocessing.
- `hero`: `act-hotwork-r03`, Hot work, Roof 03, loc (67, 22, 12), window 14:18–18:00, `Contractor · certified operator`, ref ACT-1418-R03, five conditions (the fifth depends on `sprinkler-zone-3`), deviation: cause `Sprinkler Zone 3 taken offline` at 14:42 until 18:00, 3h 18m, exposure `Roof hot work without automatic sprinkler protection`, asset exposure Production Hall 2.
- `changeOptions` (4), `packet` (9 fields), `carriers` (4), `routine` (19), `portfolio` (10, two path-dependent), all quoted in section 2.
- Record ids: `REC-` + sequence from 0401 + first 4 hex of an FNV hash of time and text; fingerprint: 8 hex of a chained FNV hash, shown as two groups of 4. Deterministic.

## 4. How node states and the outside-envelope moment are drawn

Node glyphs (screen px, drawn at scale 1, the hero at 1.5 in focus stages and 1.2 otherwise). Symbols `node-*` in `glyphs.svg` reproduce each at 60x60 per 1:1; `.pui .n` classes in `product.css` style the demo's own node markup.

| State | Drawing | Glyph |
| --- | --- | --- |
| inside | ink dot r 3.1 + ring r 6.6 at .42 | `g-inside`, `node-inside` |
| checking | ring hidden, dashed circle r 9 (2.2 2.9) spinning 2.2 s per turn | `g-checking`, `node-checking` |
| outside | signal ring r 8.5 (1.7 px) + four ticks 11.5 to 16 px (1.3 px), dot becomes paper with a signal stroke | `g-outside`, `node-outside` (colour: signal) |
| changed | ink square 6.8 px replaces the dot, ring stays | `g-changed`, `node-changed` |
| retained | dashed owned disc r 14 with diagonal hatch, paper core r 5.4, dot | `g-retained`, `node-retained` |
| transferred | capsule 40x20 with inner capsule and a small clock, dot at the left end | `g-cover`, `node-transferred` |
| system (stream only) | circle with a slash | `g-system` |

The outside-envelope moment (numbers from the live demo, geometry in `site-model.json` `outsideState`):

1. The node travels along the ray from the envelope centre through the node (exit direction world `[0.8492, -0.528]`, exit point world `[66.489, 15.39]`), easeInOutCubic over 3400 ms, on a 16 px arc, to `clamp(34 + 6.2 s, 58, 118)` px beyond the edge (88.75 px at the "Something changes" zoom, node settles at world `[75.018, 10.083]`).
2. The envelope membrane bulges with it: Gaussian displacement along the exit direction, sigma 26 px + 0.55 x bulge, bulge = distance past the edge + 11 px, until the node is 44 px out. Then it pinches off: the bulge relaxes to zero, a 6 px inward notch (sigma 16 px) remains, with two exit ticks 15 px either side of the exit point (from 5 px inside to 9 px outside, opacity .6).
3. The state flips to `outside` the instant the node crosses the edge (crossV 0.763 at that zoom): signal node, readout, stream label, card footer and header all change together.
4. In the hero stage a solid leader (ink, 1 px, .35) runs from the activity card's right edge, 58 px below its top, horizontally for 45 % of the way, then diagonally to 22 px left of the node; it disappears as soon as the node starts to leave. A dashed signal slice ring grows around the node to r 28 px (opacity .9). An anchor ellipse (7x4 px, dashed 2 2) stays on Roof 03 with a dashed signal tether (3 3.5) to the node. The reticle (corner brackets at 22 px) frames the node from the hero stage to the decision.
5. `outsideState.deformation.functionSource` is a verified port of this code (max error 0.005 world units against the demo at both the "Something changes" and decision zooms). `samplesAtSomethingChangesScale` holds 21 precomputed outline paths for v = 0 to 1.

## 5. What the film must not reuse, and cautions

Must not reuse:

- `01 JAN 2027`, the header renewal date. It is the only calendar date in the demo and it is in the future. Drop the whole `RENEWAL` field. (Other texts carry only clock times and the relative `tomorrow 07:00`.)
- `14:46 to 18:00 · no insurance purchased` (retained readout). It can read as "uninsured". If the retain state is shown, use the sheet's own wording: `No additional insurance purchased`.
- `Inside envelope: Covered by the annual programme. Most activity.` (legend). It implies anything outside is not covered. Prefer "inside the accepted conditions".
- The acknowledgement's `..., outside the annual programme.` and similar lines that equate outside the envelope with outside the programme's cover. The film says the activity moved outside the accepted conditions and the insurance position may have changed.
- Any ordering, highlight or pre-selection that ranks carriers. The demo lists carriers in arrival order, which happens to be ascending price, and offers a `SELECT` pill on each; the film must not suggest a best or cheapest offer or that Priora chose. Keep `Priora does not price or rank the offers.` if the transfer view is shown.
- Anything implying Priora prices risk or binds instantly: the request-to-bound sequence in one minute (14:47 to 14:48), `CAPACITY BOUND` shown as immediate, `Incremental premium`, economics `Market price` with a bound figure, and the end line `Physical risk used to be priced from what might happen.` Transfer, quotes, prices and capacity are future state and must be labelled so.
- Demo chrome: `END-STATE CONCEPT` tag, `Play/Pause/Resume/Replay`, `Rewind`, `Reset`, `Awaiting decision`, keyboard hints (`1`, `2`, `3`, `Space`).

Cautions:

- `RECOMMENDED` on "Restore sprinkler protection" is a configured control, not Priora deciding; keep the choice visibly with the risk owner.
- The demo's `<br>` line breaks (retained record block, plaque, economics heading, end disclaimer, intro line) break the HyperFrames layout rule against `<br>` in body text; use block elements.
- Nothing in the demo states outright that cover is lost; the risky phrasings are the four listed above.

Fictional values (all of them): Nordhavn Bioprocessing and its site (Copenhagen is real, the site is not), DKK 4.2bn insured value, Northstar Commercial, Atlas Specialty, Boreal Risk, Helvetic Industrial, Anna Møller, Mikkel Sørensen, every price (980, 1,240, 1,680, 640), deductible, capacity (DKK 25m), counter, clock time, ACT/PKT/REC id and fingerprint.

## 6. Component classes (product.css)

Every component is scoped under `.pui`. A demo id becomes a `pui-` class; inner class names are the demo's own. Components render visible and settled (the demo's entrance states are dropped; scenes animate with GSAP). `--pui-scale` on `.pui`, an ancestor, or a `.pui-*` root multiplies every size (1.4 to 1.8 for 1080p close-ups). Signal is `var(--signal)` (fallback cobalt #1F47D6); `--pui-signal-deep` and `--pui-signal-soft` are exposed. Inline `<svg><use href="#g-...">` needs `glyphs.svg` inlined once in the page; the readout slice uses its `#hatch` and `#hatch-ink` patterns. No `@font-face`: load `assets/css/fonts.css`.

| Demo | Film class | Notes |
| --- | --- | --- |
| `#top` | `.pui-top` | header bar, 68 px; `.brand`, `.hsep`, `.siteid`, `.clock`, `.ctrls`, `.btn` (`.primary`, `.wait`, `.is-hover`) |
| `#proghead` | `.pui-proghead` | programme pill; `.pf`, `.pf.pstat`; `#pstat` becomes `.pui-pstat` (`.sig` colours its glyph) |
| `#caption` | `.pui-caption` | `.cn` chapter, `.layers b.on/.cur`, `.ct` 38 px, `.cs` |
| `#intro` | `.pui-intro` | `.il1..il3` |
| `#herocard` | `.pui-herocard` | activity card: `.hc-top`, `.hc-title`, `.hc-sub`, `.hc-meta`, `.conds li` (`.ok` VERIFIED, `.bad` UNAVAILABLE, `.bad.sig` signal em), `.ck` check svg, `.hc-foot` |
| `#readout` | `.pui-readout` | `.sig` (signal state line), `.has-slice` shows the `.slice` svg |
| `.nlab` | `.nlab` | node plates, `.left` aligns right |
| `#detail` | `.pui-detail` | node tooltip / detail card |
| `#sheet` | `.pui-sheet` | 600 px; views `.sv`; `.eyebrow .sd` (`.sig` option), `.sheet-h` 44 px, `.sheet-p`, `.facts`, `.obs`/`.ob` timeline row, `.ask`, `.choices`/`.choice` (`.is-hover`, `.is-active`), `.sheet-foot`, `.opts`/`.opt` (`.rec`, `.tagr`), `.linkback`, `.steps li` (`.act`, `.done`), `.bigval`, `.dl2`, `.ack` (`.on`), `.acts`, `.bigbtn` (`[disabled]`/`.disabled`), `.recblock`, `.note`, `.sheet-cont` |
| `#packet` | `.pui-packet` | `.pk-in`, `.pk-h`, `.pk-t`, fields `li` (all visible), `.sealed` shows `.pk-f`, `.folded` becomes the 168x36 token `.pk-tok` |
| `#carriers` | `.pui-carriers` | `.carrier` with `.recv` (wait bar), `.quoted`, `.declined`, `.selected`, `.muted`, `.is-hover` |
| `#offnote` | `.pui-offnote` | |
| `#plaque` | `.pui-plaque` | `.p1..p6` |
| `#cont` | `.pui-cont` | `.col`, `.row`, `.sub` |
| `#econ` | `.pui-econ` | `.eh`, `.eq`, `.cell` (`.on`, `.sig`), `.op`, `.show-cnt` shows `.cnt` |
| `#rail` | `.pui-rail` | 356 px; sections `.pui-r-live`, `.pui-r-rec`, `.pui-r-sum` (include only those needed); `.is-focus`; `.r-head`, `.live` (`.on`), `.stats`, `.pui-stream` with `.srow` (`.hero`, `.sys`, `.st-outside`), `.pui-legend`, `.pui-record` (`.tail` keeps the newest entries in view) with `.rr` (`.k-event`, `.k-dev`, `.k-decision`, `.k-sched`, `.k-agg`), `.sum`, `.sum-big`, `.sum-list`, `.sum-note` |
| `#end` | `.pui-end` | `.end-in`, `.e1`, `.e2`, `.chain` (`.st`, `.ar`, `.st.sig` for a signal label), `.e3`, `.e4` |
| `#fx` overlays | `.pui .n`, `.teth`, `.anc`, `.pui-h-slice`, `.pui-reticle`, `.pui-lead`, `.xl`, `.tok`, `.tokr`, `.amb`, `.env-notch` | SVG overlays in screen px; `.n.st-*` state classes as in the demo |

Markup, taken from the demo and converted (ids to classes, script attributes removed):

Header (remove the renewal field before use):

```html
<header class="pui-top">
<div class="brand"><svg class="mk"><use href="#g-mark"></use></svg><span class="wm">Priora</span><span class="tag">End-state concept</span></div>
<div class="hsep"></div>
<div class="siteid"><div class="nm">Nordhavn Bioprocessing</div><div class="sb">Copenhagen · fictional site</div></div>
<div class="pui-proghead">
<div class="pf pstat"><em>Property + BI programme</em><b class="pui-pstat"><svg class="g"><use href="#g-outside"></use></svg><span>1 activity outside conditions</span></b></div>
<div class="pf"><em>Annual programme</em><b><span class="mono">DKK 4.2bn</span> insured value</b></div>
<div class="pf lead"><em>Lead carrier</em><b>Northstar Commercial</b></div>
<!-- RENEWAL field removed: the demo shows a future calendar date here -->
</div>
<div class="spacer"></div>
<div class="clock"><span class="lab">Site time</span><b>14:43</b></div>
<div class="ctrls">
<button class="btn primary wait"><span>Awaiting decision</span></button>
<button class="btn"><svg><use href="#g-rewind"></use></svg><span>Rewind</span></button>
<button class="btn"><svg><use href="#g-reset"></use></svg><span>Reset</span></button>
</div>
</header>
```

Activity card at the outside moment:

```html
<div class="pui-herocard"><div class="hc-top"><span class="lab">Activity · ACT-1418-R03</span><svg class="g"><use href="#g-outside"></use></svg></div>
<div class="hc-title">Hot work</div>
<div class="hc-sub">ROOF 03 · 14:18–18:00</div>
<div class="hc-meta">Contractor · certified operator</div>
<ul class="conds"><li class="ok"><svg class="ck" viewBox="0 0 16 16"><circle class="c-w" cx="8" cy="8" r="6"></circle><path class="c-p" pathLength="1" d="M3.4 8.4L6.6 11.4L12.8 4.6"></path><g class="c-x"><circle cx="8" cy="8" r="6"></circle><path d="M4 12L12 4"></path></g></svg><span>Certified operator</span><em>VERIFIED</em></li><li class="ok"><svg class="ck" viewBox="0 0 16 16"><circle class="c-w" cx="8" cy="8" r="6"></circle><path class="c-p" pathLength="1" d="M3.4 8.4L6.6 11.4L12.8 4.6"></path><g class="c-x"><circle cx="8" cy="8" r="6"></circle><path d="M4 12L12 4"></path></g></svg><span>Extinguishing equipment</span><em>VERIFIED</em></li><li class="ok"><svg class="ck" viewBox="0 0 16 16"><circle class="c-w" cx="8" cy="8" r="6"></circle><path class="c-p" pathLength="1" d="M3.4 8.4L6.6 11.4L12.8 4.6"></path><g class="c-x"><circle cx="8" cy="8" r="6"></circle><path d="M4 12L12 4"></path></g></svg><span>Fire watch</span><em>VERIFIED</em></li><li class="ok"><svg class="ck" viewBox="0 0 16 16"><circle class="c-w" cx="8" cy="8" r="6"></circle><path class="c-p" pathLength="1" d="M3.4 8.4L6.6 11.4L12.8 4.6"></path><g class="c-x"><circle cx="8" cy="8" r="6"></circle><path d="M4 12L12 4"></path></g></svg><span>Combustibles cleared</span><em>VERIFIED</em></li><li class="bad"><svg class="ck" viewBox="0 0 16 16"><circle class="c-w" cx="8" cy="8" r="6"></circle><path class="c-p" pathLength="1" d="M3.4 8.4L6.6 11.4L12.8 4.6"></path><g class="c-x"><circle cx="8" cy="8" r="6"></circle><path d="M4 12L12 4"></path></g></svg><span>Automatic sprinkler protection</span><em>UNAVAILABLE</em></li></ul>
<div class="hc-foot"><span>4 of 5 hold</span><b>Outside envelope</b></div></div>
```

Readout, outside:

```html
<div class="pui-readout sig has-slice"><div class="ro-name">Hot work · Roof 03</div>
<div class="ro-a swap">Outside agreed conditions</div>
<div class="ro-b  swap">Decision required</div>
<div class="slice st-outside"><svg viewBox="0 0 236 36"><text x="6" y="9">EXPOSURE · TEMPORARY · 3H 18M</text>
<line class="ax" x1="6" y1="20" x2="228" y2="20"></line>
<line class="ax" x1="6" y1="17" x2="6" y2="23"></line><line class="ax" x1="55.33333333333333" y1="17" x2="55.33333333333333" y2="23"></line><line class="ax" x1="104.66666666666666" y1="17" x2="104.66666666666666" y2="23"></line><line class="ax" x1="154" y1="17" x2="154" y2="23"></line><line class="ax" x1="203.33333333333331" y1="17" x2="203.33333333333331" y2="23"></line>
<rect class="seg dev" x="40.5" y="16" width="162.8" height="8" rx="1"></rect>
<text x="40.5" y="35">14:42</text><text x="173.3" y="35">18:00</text></svg></div></div>
```

Decision sheet:

```html
<div class="pui-sheet"><div class="sv"><div class="eyebrow"><span class="sd"></span>14:43 · Decision requested · Site Risk Manager</div>
<h2 class="sheet-h">Risk state changed</h2>
<p class="sheet-p">Roof hot work is continuing while sprinkler protection in the affected zone is unavailable.</p>
<dl class="facts">
<div><dt>Existing programme</dt><dd>Outside agreed conditions</dd></div>
<div><dt>Incremental exposure</dt><dd class="mono">TEMPORARY</dd></div>
<div><dt>Expected duration</dt><dd class="mono">3h 18m<small>14:42–18:00</small></dd></div>
</dl>
<div class="obs">
<div class="ob"><span class="t">14:18 · observed</span><span class="x"><svg class="g"><use href="#g-inside"></use></svg>Inside · 5 of 5 verified</span></div>
<svg class="oa"><use href="#g-arrow-s"></use></svg>
<div class="ob"><span class="t">14:42 · changed</span><span class="x"><svg class="g"><use href="#g-system"></use></svg>Sprinkler Zone 3 offline</span></div>
<svg class="oa"><use href="#g-arrow-s"></use></svg>
<div class="ob"><span class="t">14:43 · now</span><span class="x"><svg class="g" style="color:var(--signal)"><use href="#g-outside"></use></svg>Outside · your decision</span></div>
</div>
<div class="ask">WHAT DO YOU WANT TO DO?</div>
<div class="choices">
<button class="choice"><span class="kbd k">1</span><svg class="g"><use href="#g-changed"></use></svg><b>Change activity</b><span class="d">Modify the work or restore a safeguard until it returns inside the envelope.</span><span class="o">Incremental DKK 0</span></button>
<button class="choice"><span class="kbd k">2</span><svg class="g"><use href="#g-retained"></use></svg><b>Retain risk</b><span class="d">Knowingly carry the incremental exposure. Priora records who, what and for how long.</span><span class="o">Owned and recorded</span></button>
<button class="choice"><span class="kbd k">3</span><svg class="g"><use href="#g-cover"></use></svg><b>Transfer risk</b><span class="d">Ask the market whether a carrier will cover this temporary slice.</span><span class="o">Carrier priced</span></button>
</div>
<div class="sheet-foot">Priora supplies the observed state. The decision stays with the risk owner.</div></div></div>
```

Stream row and record entries:

```html
<li class="srow hero st-outside"><span class="t">14:18</span><span class="n">Hot work · Roof 03</span><span class="z"><span class="zn">Roof</span><i>·</i><span class="gs"><svg class="g"><use href="#g-outside"></use></svg></span><span class="sl">Outside envelope</span></span></li>
<li class="rr k-event"><span class="t">14:18</span><span class="m"></span><div><div class="x">Hot work started · Roof 03 · inside envelope</div><div class="s">Contractor · certified operator · planned 14:18–18:00</div><div class="i">REC-0403-AA9A · e0b9 4d12</div></div></li>
<li class="rr k-dev"><span class="t">14:42</span><span class="m"></span><div><div class="x">Sprinkler Zone 3 taken offline</div><div class="s">Roof 03 and Production Hall 2 · automatic protection unavailable</div><div class="i">REC-0405-0AF1 · 0d9b 70f9</div></div></li>
<li class="rr k-decision"><span class="t">14:46</span><span class="m"></span><div><div class="x">Incremental risk retained by Nordhavn Bioprocessing</div><div class="s">Decision: Anna Møller · Site Risk Manager · 3h 18m · until 18:00 · no additional insurance purchased</div><div class="i">REC-0408-48F6 · aaf8 08c5</div></div></li>
```

Retain acknowledgement (ticked):

```html
<button class="ack on"><span class="bx"><svg><use href="#g-check"></use></svg></span><span>Nordhavn Bioprocessing knowingly carries this incremental exposure until 18:00, outside the annual programme.</span></button>
```

Economic logic bar at the deviation:

```html
<div class="pui-econ">
<div class="eh"><span class="lab">Economic logic</span><span class="eh2">Conceptual.<br>Not actuarial.</span></div>
<div class="eq">
<div class="cell c-normal"><svg class="g"><use href="#g-inside"></use></svg><div><b>Normal activity<em class="cnt"></em></b><span>Inside annual programme</span><span class="mono">DKK 0 incremental</span></div></div>
<div class="op"><svg><use href="#g-arrow-s"></use></svg></div>
<div class="cell c-dev sig on"><svg class="g" style="color:var(--signal)"><use href="#g-outside"></use></svg><div><b>Deviation</b><span>Decision required</span></div></div>
<div class="op"><svg><use href="#g-arrow-s"></use></svg></div>
<div class="cell c-ch"><svg class="g"><use href="#g-changed"></use></svg><div><b>Change<em class="cnt"></em></b><span class="mono">DKK 0</span></div></div>
<div class="cell c-re"><svg class="g"><use href="#g-retained"></use></svg><div><b>Retain<em class="cnt"></em></b><span>Company carries</span><span>incremental exposure</span></div></div>
<div class="cell c-tr"><svg class="g"><use href="#g-cover"></use></svg><div><b>Transfer<em class="cnt"></em></b><span>Market price</span><span class="mono">on request</span></div></div>
</div>
</div>
```

Risk packet (folded state shown; remove `folded` for the open card) and two carriers:

```html
<div class="pui-packet on sealed folded"><div class="pk-in"><div class="pk-h"><span class="pk-t">Requesting capacity</span><span class="lab">PKT-0412</span></div>
<ul><li class="on"><span>Activity</span><b class="">Hot work</b></li><li class="on"><span>Location</span><b class="">Roof 03</b></li><li class="on"><span>Duration</span><b class="">3h 18m</b></li><li class="on"><span>Current protection</span><b class="sig">Sprinkler Zone 3 offline</b></li><li class="on"><span>Operator</span><b class="">Certified</b></li><li class="on"><span>Fire watch</span><b class="">Active</b></li><li class="on"><span>Extinguishing equipment</span><b class="">Confirmed</b></li><li class="on"><span>Asset exposure</span><b class="">Production Hall 2</b></li><li class="on"><span>Existing programme</span><b class="sig">Outside accepted conditions</b></li></ul>
<div class="pk-f"><span class="lab">Observed state · sealed</span><span class="lab">f230 b4aa</span></div></div>
<div class="pk-tok"><i></i>PKT-0412 · 9 FIELDS</div></div>
<div class="carrier in declined">
<div class="c-top"><span class="c-name">Northstar Commercial</span><span class="c-stat">Declined</span></div>
<div class="c-kind">Existing carrier</div>
<div class="c-body"><div class="c-dec">Outside appetite<small>No quote</small></div></div>
<div class="c-wait"><i></i></div></div>
<div class="carrier in quoted">
<div class="c-top"><span class="c-name">Atlas Specialty</span><span class="c-stat"><span class="q">Quote · </span>14:47</span></div>
<div class="c-kind">Temporary activity cover</div>
<div class="c-body"><div class="c-price"><span>DKK</span><b data-p="">980</b><span class="c-sel">Select</span></div>
<div class="c-facts"><div><em>Duration</em><b>Until 18:00</b></div><div><em>Deductible</em><b>DKK 100,000</b></div><div><em>Capacity</em><b>DKK 25m</b></div></div></div>
<div class="c-wait"><i></i></div></div>
```

Capacity plaque:

```html
<div class="pui-plaque on"><div class="p1">CAPACITY BOUND</div><div class="p2">Atlas Specialty</div><div class="p3">DKK 980</div><div class="p4">Valid until 18:00 · from 14:48<br>Temporary activity cover</div><div class="p6">Annual programme unchanged</div><div class="p5">REC-0411-441D · 384a b936</div></div>
```

End chain (transfer-path figures):

```html
<div class="chain"><div class="st on"><b>RECORD</b><span>Physical state observed as it happens</span><em>214 activities observed today</em></div><div class="ar on"><svg><use href="#g-arrow"></use></svg></div><div class="st on"><b>TRUST</b><span>Verified, ordered, fingerprinted</span><em>16 fingerprinted records</em></div><div class="ar on"><svg><use href="#g-arrow"></use></svg></div><div class="st on"><b>DECISION</b><span>Change, retain or transfer</span><em>5 explicit decisions · 3 changed, 1 retained, 1 transferred</em></div><div class="ar on"><svg><use href="#g-arrow"></use></svg></div><div class="st on"><b>PRICE</b><span>Set by carriers on real state</span><em>3 carrier quotes · DKK 980 selected</em></div><div class="ar on"><svg><use href="#g-arrow"></use></svg></div><div class="st on"><b>CAPACITY</b><span>Bound only when needed</span><em>1 temporary cover bound · DKK 980 incremental</em></div></div>
```

## 7. Reference screenshots

All at 1920x1080 in `scratchpad/demo-ref/` (session scratchpad), captured from the live demo at 3x speed, paused for each still.

| File | State |
| --- | --- |
| `01-intro-title-lines.png` | Intro title lines (stage `intro`, site time 08:55) |
| `02-intro-site-drawn-envelope-legend.png` | Site and envelope drawn, legend, caption 01, CTA (stage `intro`, site time 08:55) |
| `03-operating-live-activity.png` | Operating: live activity, stream, counters, economics NORMAL (stage `operating`, site time 10:03) |
| `04-operating-node-detail-card.png` | Operating: detail card on a routine node (stage `operating`, site time 10:03) |
| `05-operating-most-activity-inside.png` | Caption 03, most activity inside (stage `operating`, site time 12:44) |
| `06-hero-roof-03-checking-conditions.png` | Hot work on Roof 03: checking 3 of 5, readout Checking state (stage `hero`, site time 14:18) |
| `07-hero-roof-03-verified-inside.png` | Roof 03: 5 of 5 verified, inside (stage `hero`, site time 14:18) |
| `08-something-changes-sprinkler-zone-3-offline.png` | Something changes: Sprinkler Zone 3 offline, UNAVAILABLE, recalculating (stage `deviation`, site time 14:42) |
| `09-something-changes-node-crossing-envelope.png` | Node crossing the envelope (camera mid-move) (stage `deviation`, site time 14:42) |
| `10-something-changes-outside-envelope.png` | Outside envelope: notch, tether, slice ring, readout, DEVIATION (stage `deviation`, site time 14:43) |
| `11-decision-risk-state-changed-sheet.png` | Decision sheet, whole-site view (stage `decision`, site time 14:43) |
| `12-decision-hero-node-detail-card.png` | Decision: hero node detail card (stage `decision`, site time 14:43) |
| `13-change-options.png` | Change options (stage `change-options`, site time 14:43) |
| `14-change-resolving-restore-sprinkler.png` | Change resolving: restore sprinkler, step 2 active (stage `change-resolving`, site time 14:47) |
| `15-change-resolved-restore-sprinkler-dkk-0.png` | Change resolved: restore sprinkler, DKK 0, record blocks (stage `change-resolved`, site time 14:48) |
| `16-portfolio-after-change.png` | Portfolio after change: plates, summary rail (stage `portfolio`, site time 16:30) |
| `17-end-chain-after-change.png` | End chain after change (stage `end`, site time 16:40) |
| `18-change-resolved-move-tomorrow.png` | Change resolved: move to tomorrow (stage `change-resolved`, site time 14:48) |
| `19-change-resolved-temp-suppression.png` | Change resolved: temporary suppression (stage `change-resolved`, site time 14:48) |
| `20-change-resolved-move-zone.png` | Change resolved: relocate to Roof 01 (node on Roof 01) (stage `change-resolved`, site time 14:48) |
| `21-retain-confirm.png` | Retain confirm (unticked) (stage `retain-confirm`, site time 14:43) |
| `22-retain-confirm-acknowledged.png` | Retain confirm acknowledged (stage `retain-confirm`, site time 14:43) |
| `23-retained-decision-recorded.png` | Retained: decision recorded (stage `retained`, site time 14:46) |
| `24-portfolio-after-retain.png` | Portfolio after retain (stage `portfolio`, site time 16:30) |
| `25-end-chain-after-retain.png` | End chain after retain (stage `end`, site time 16:40) |
| `26-transfer-packet-building.png` | Transfer: packet building (stage `transfer-packaging`, site time 14:47) |
| `27-transfer-packet-sealed-carriers-arrive.png` | Transfer: packet sealed, carriers arrive (stage `transfer-packaging`, site time 14:47) |
| `28-transfer-packet-sent-to-carriers.png` | Transfer: packet folded and sent along the carrier lines (stage `transfer-packaging`, site time 14:47) |
| `29-transfer-carriers-evaluating.png` | Transfer: carriers evaluating (stage `transfer-offers`, site time 14:47) |
| `30-transfer-offers-three-quotes-one-declined.png` | Transfer: three quotes, one declined, note (stage `transfer-offers`, site time 14:47) |
| `31-transfer-bound-capacity-plaque.png` | Transfer bound: plaque, selected carrier, bound lines (stage `transfer-bound`, site time 14:48) |
| `32-portfolio-after-transfer.png` | Portfolio after transfer (stage `portfolio`, site time 16:30) |
| `33-end-chain-after-transfer.png` | End chain after transfer (stage `end`, site time 16:40) |
| `demo-overview-site-only.png` | Demo canvas at the overview camera, overlays hidden (verification reference) |
| `site-precise-overview-camera.png` | site-precise.svg at the same camera |
| `site-precise-vs-demo-diff.png` | Pixel difference of the two (red = differs) |
| `site-precise-render.png` | site-precise.svg alone at its default viewBox, 1920x1080, Plex fonts loaded |
| `site-precise-render-raw-file.png` | The raw .svg file opened directly (no web fonts, labels fall back to a system monospace) |
| `glyphs-sprite-render.png` | Every glyph symbol and pattern, ink and signal |

## 8. Verification done

- `site-precise.svg` rendered at the demo's overview camera against the demo canvas (overlays hidden, zone labels and Sprinkler Zone 3 shown): mean absolute difference 0.13 of 255, 0.32 % of pixels differ by more than 8 levels, all of them text antialiasing and envelope edge antialiasing; geometry is identical (`site-precise-vs-demo-diff.png`).
- The offline zone state with `--sw` at the Roof 03 zoom lines up with the demo shot 08 pixel for pixel; the outside-envelope geometry rebuilt from `site-model.json` and `glyphs.svg` lines up with shot 10.
- 210 ids, no duplicates. The deformation port matches the demo to 0.005 world units.
- `product.css`: csstree-validator clean, 406 rules parsed in Chromium, gallery of the demo's own markup rendered at `--pui-scale` 1 and 1.6 and compared with the demo shots.
- `glyphs.svg`: 32 symbols and 2 patterns render non-empty in ink and in signal.
