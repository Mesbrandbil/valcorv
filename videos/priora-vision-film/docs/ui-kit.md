# UI kit: the Priora interface at video scale (Acts II and III)

`assets/js/ui-kit.js` (window.UIKit) and `assets/css/film-ui.css` build the film's destination: the Priora end-state interface, composed for 1080p. The components are the demo's own (ported in `assets/css/product.css`, scoped under `.pui`, scaled with `--pui-scale`), with cobalt in place of the demo's orange, plus the film-only pieces the storyboard needs (capture strip, clause labels, statements, programme layer, chain, end card).

Style frames: `scratchpad/ui-kit/frames/` (session scratchpad). Test harness: `scratchpad/ui-kit/harness.html` + `shots.js` (one shot per `#shot=` hash), `shoot.mjs`, `verify.mjs`, `statecmp.mjs`.

## 1. Loading

```html
<link rel="stylesheet" href="assets/css/fonts.css">
<link rel="stylesheet" href="assets/css/product.css">
<link rel="stylesheet" href="assets/css/film-ui.css">   <!-- after product.css -->
<script src="assets/vendor/gsap/gsap.min.js"></script>
<script src="assets/vendor/gsap/DrawSVGPlugin.min.js"></script>
<script src="assets/js/site-data.js"></script>   <!-- SITE_SVG, SITE_MODEL, SITE_GLYPHS -->
<script src="assets/js/site-kit.js"></script>
<script src="assets/js/ui-kit.js"></script>      <!-- registers DrawSVG (and MotionPath / CustomEase if loaded) -->
```

The glyph sprite does not need to be inlined: `UIKit.glyph()` copies the symbol geometry from `window.SITE_GLYPHS` into each use site, so no shared ids exist between compositions.

## 2. Rules every helper keeps

- Seek-safe. Visual state is a pure function of timeline time. Helpers only add `fromTo` tweens with explicit from-states and `immediateRender: false` to the timeline you pass. No `onUpdate` / `onStart` / `onComplete` anywhere. The DOM a builder creates is the state at time 0.
- Stateful helpers (node states, swaps, counters, clock, choices, outcomes, sprinkler zone, crossing configuration) remember their current value at build time. Call them in time order per component.
- SVG transforms are tweened as explicit `transform` attribute strings (scale about a fixed point, translate), never with GSAP's SVG transform properties: GSAP's `smoothOrigin` makes an SVG origin depend on seek history (found and fixed during verification).
- No measurement. Layout that needs coordinates (transfer hairlines, chain arrows, brackets, plates) is computed from fixed sizes and IBM Plex Mono's exact 0.6 em advance, so fonts loading late cannot move anything.
- Deterministic. No `Math.random`, `Date`, `performance.now`. Seeds come from string hashes (`UIKit.rng('seed')`, mulberry32 as in SiteKit).
- Every element a builder creates gets an id starting with `opts.prefix` (the component root is `<prefix>-<component>`, children `<prefix>-<component>-eN`). A second builder of the same kind with the same prefix is numbered (`<prefix>-card2`).
- Every helper takes elements or handles, never selector strings.
- Sound events: `window.__filmEvents.push({ scene, type, t, dur, meta })`. `scene` is `opts.scene` (default: the prefix), `t` is the position on the timeline you passed plus `opts.eventOffset` (use it when building on a nested timeline). See section 6.
- `opts` are merged over defaults ignoring `undefined`, so callers can pass optional fields through.
- Positioning: HTML builders accept `parent` (appended) and `left / top / right / bottom / width / height` (numbers are px, absolute) or `style: { prop: value }`.

## 3. Coordinate spaces

- HTML panels (header, card, capture strip, record, sheet, transfer panel, readout, statements, chain, end card) live in 1920x1080 screen px.
- Site-bound pieces (node glyphs, crossing, connections, clause labels, plates) live in a SiteKit SVG, in world coordinates. Node glyphs, reticles, rings and plates are screen-constant (scaled by the site's `--sw`, set by SiteKit's camera). Clause labels are world-sized (they scale with the camera like annotations on the drawing); their hairlines stay screen-constant.
- `UIKit.overlay(site)` returns the overlay `<g>` (appended once, on top of the site) where nodes and connections go.
- `UIKit.siteLabels(site, k, [tl, t, dur])` draws the demo's 10 px zone labels k times larger: 1.8 (18 px, the default for close-ups), 1.2 to 1.4 in wide views where the labels are context. Seek-safe when given a timeline.
- `UIKit.CAMERAS` (world rects with `s` = px per world unit): `roof03Product` (s 11), `systemRoof` (s 8.83133, the demo's "Something changes" scale), `decision` (whole envelope framed left of the sheet, s 4.35), `wholeSite` (demo overview, centred). `UIKit.cam(cx, cy, s, sx, sy)` makes a rect that puts world (cx, cy) at screen (sx, sy). The system view computes its own camera.

## 4. Components

### 4.1 header(opts)

The product header strip (demo `#top` at `--pui-scale` 1.6, 109 px tall, 96 px side margins). Mark + `Priora`; chip `END-STATE CONCEPT`; `NORDHAVN BIOPROCESSING` / `Copenhagen · fictional site`; programme pill `PROPERTY + BI PROGRAMME` with its status line; `SITE TIME` clock (HH:MM, Plex Mono 35 px, per-digit odometer). No renewal field, no annual programme value, no lead carrier (density; and the renewal date is on the must-not-reuse list).

Options: `prefix`, `scene`, `parent`, position, `scale` 1.6, `chip` ('End-state concept' or false), `chipVisible` true, `status` 'inside', `statuses` (extra `{ key: [glyph, text, signal?] }`), `time` '14:18', `seconds` false (HH:MM:SS).

Status keys and texts (the demo's): `inside` All activity inside · `checking` Recalculating 1 activity · `outside` 1 activity outside conditions (cobalt glyph) · `retained` 1 increment retained · `cover` 1 slice on temporary cover · `changed` 1 decision recorded · back inside.

Helpers: `setClock(tl, t, 'HH:MM')` (instant) · `rollClock(tl, t, to, dur, ease, from)` odometer roll with mechanical carry (from the current value, or from `from`) · `setStatus(tl, t, key, dur)` · `showChip(tl, t, on, dur)` · `enter(tl, t, dur)` (hairline draws, items settle left to right) after `hideForEnter()`. Handles: `el`, `clock` (Odometer), `status` (Swap), `chip`.

The chip: the task asked for it, while demo-map section 5 lists `END-STATE CONCEPT` as demo chrome. It is on by default and switchable; the style frames show it in Act III only (Act II is "what Priora does today", so a concept chip there would contradict the claim). Decide in the scenes; see open issues.

### 4.2 nodeGlyph(svgParent, worldXY, state, opts)

The demo node (`nodeMarkup`) at screen-constant size, drawn in world coordinates. States: `checking` (dashed ring r 9, dot), `inside` (ring r 6.6 at .42, dot r 3.1), `outside` (cobalt ring r 8.5 at 1.7 px + four ticks 11.5 to 16 px, paper dot with cobalt stroke), `changed` (ink square 6.8 px, ring), `retained` (dashed owned disc r 14 with hatch, paper core, dot), `cover` (the transferred capsule with clock). Optional reticle (corner brackets at 22 px).

Options: `prefix`, `scene`, `name`, `k` glyph scale (1 routine, 1.5 hero as the demo), `kr` reticle scale (default max(1, 0.88 k)), `reticle` false, `visible` true, `events` true.

Helpers: `state(tl, t, to, dur)` (part opacities and dot colours; `outside` lands with a small ring settle) · `moveTo(tl, t, xy, dur, ease)` · `spin(tl, t0, t1)` (checking ring, 2.2 s per turn, as the demo) · `pulse(tl, t, dur)` (spawn ring) · `show(tl, t, on, dur)` · `quiet(tl, t, opacity, dur)` · `reticle(tl, t, on, dur)`. Handle: `el`, `parts`, `cur`, `pos`, `k`.

### 4.2b crossing(tl, t0, node, site, opts): the primary product reveal

The hero node (in `checking`, at `outsideState.heroOriginWorld` [38.971, 32.5]) stretches across the envelope and snaps outside:

1. Stretch (`stretch`, 1.5 s, easeInOutCubic as the demo): the dashed checking ring becomes a stadium capsule (paper fill, dashed hairline outline, hairline spine, a faint tail dot on the roof and the solid dot riding the head). The head follows the demo's exit path `heroDeviation(...).P(v)` (the ray from the envelope centre through the node, 16 px arc) to the settle point just outside the edge (`clamp(34 + 6.2 s, 58, 118)` px past it, exactly the demo's).
2. The membrane (`envelope-outline`, `envelope-outer`, and `envelope-fill` when it shares the outline) flexes with the demo's own Gaussian deformation driven by the head, up to the pinch point (44 px past the edge), and holds that tension while the head travels on.
3. When the head crosses the edge (`crossV`, 0.763 at s 8.83) the capsule turns cobalt (event `cross-edge`; drive the header, card footer and readout from `X.tCross`).
4. Hold (`hold`, 0.16 s), then snap (`snap`, 0.46 s, expo.out): the tail retracts to the head and leaves the dashed cobalt tether behind it, the membrane relaxes to the demo's 6 px notch with its two exit ticks, the node lands in `outside` with reticle and the slice ring growing 8 to 28 px, and the anchor ellipse marks the roof position. Event `snap` (meta.latch = landing time).

The landed geometry equals the demo's (`heroDeviation` at v = 1). The intermediate membrane uses the same function at a held progress (the film's tension choice); documented as a deliberate difference from the demo, where the membrane relaxes while the node is still travelling.

Options: `s` (the camera scale the shot holds, default 8.83133), `stretch`, `hold`, `snap`, `ease`, `tether` true, `ring` true. Returns `{ t0, tCross, tSnap, tLand, tEnd, A, T, E, dir, vPinch }` plus:
- `back(tl, t, dur, ease)`: the change branch. The node travels back to its roof position, the tether retracts with it, the notch heals (notchK 1 to 0), ring and anchor fade. Then call `node.state(..., 'changed')`.
- `outside(tl, t)`: a clean state swap back to the landed configuration (retain and transfer branches).

`UIKit.heroDeviation(...)` is the verified port (max error against the demo's 21 precomputed samples: node 0.0007, outline 0.001 world units; settle point [75.024, 10.084] vs the demo's [75.018, 10.083]).

### 4.2c sprinkler(tl, site, t, to, opts)

Sprinkler Zone 3 on a SiteKit site: `offline` (heads hollow in the demo's ripple order from the valve, 55 ms per step, crosses on, hatch in after 350 ms, outline to the darker 2 2 dashes, label `ACTIVE` to `OFFLINE` in cobalt), `restored` (reverse ripple, label `RESTORED` in ink), `active`. Adds its clones (offline outline, two status texts) to the site once. Options: `step` 0.055, `labelSignal` true. Events: `zone-offline`, `zone-restored`, `zone-active`.

### 4.3 activityCard(opts)

The demo's activity card at `--pui-scale` 1.8 (612 px wide, every label 18 px or more): `ACTIVITY · ACT-1418-R03` with its state glyph, `Hot work`, `ROOF 03 · 14:18–18:00`, `Contractor · certified operator`, rows `Certified operator`, `Extinguishing equipment`, `Fire watch`, `Combustibles cleared`, `Automatic sprinkler protection`, each `VERIFIED` or `UNAVAILABLE` (cobalt, crossed circle). Footer left `CHECKING N OF 5` / `5 OF 5 VERIFIED` / `4 OF 5 HOLD`, right `CHECKING STATE` / `INSIDE ENVELOPE` / `RECALCULATING` / `OUTSIDE ENVELOPE`.

Options: `prefix`, `scene`, `parent`, position, `scale` 1.8, `state` 'waiting' | 'verified', `data` (override texts).

Helpers: `verifyRows(tl, t0, stagger)` (default 0.6 s, the demo's; each check draws, the row text switches, the footer counts, the top glyph turns `inside`; returns the end time) · `setRowState(tl, i, state, t, dur)` with `waiting | checking | verified | unavailable` · `conditionLost(tl, t, i)` (row i, default the fifth, to UNAVAILABLE; footer `4 OF 5 HOLD · RECALCULATING`; glyph `checking`) · `setFooter(tl, t, leftKey, rightKey)` (left `c0..c4 | v5 | h4`, right `checking | inside | recalc | outside`) · `setGlyph(tl, t, 'checking' | 'inside' | 'outside')` · `enter(tl, t, dur)` after `hideForEnter()`.

### 4.4 captureStrip(opts)

Speech intake: `VOICE · ROOF 03 · 14:18` (state `LISTENING` then `STRUCTURED`), a fine waveform line drawn from an amplitude envelope, the transcript `I'm welding on Roof 03 until six.` setting word by word, then four fields, each underlined in cobalt as recognised: `ACTIVITY` Hot work (welding) · `LOCATION` Roof 03 · `WINDOW` 14:18–18:00 · `BY` Contractor, certified operator. On recognition the matched transcript words return to ink and the rest recede (`BY` has no spoken match: it comes from the permit).

Options: `prefix`, `scene`, `parent`, position, `width` 1040, `waveH` 64, `words` [{w, start, end}], `envelope` (array of 0..1, e.g. RMS of the worker take), `text`, `fields`, `label`. Without an envelope, `UIKit.envelopeFromWords(words, dur, n, seed)` makes a deterministic one.

Helpers: `play(tl, offset, words)` (waveform draws over the take, playhead hairline, each word sets at `start + offset`) · `resolve(tl, t, stagger)` · `enter(tl, t)` after `hideForEnter()`.

### 4.5 conditionLabel(svgParent, opts) and connect(tl, t, svgParent, from, to, opts)

Clause labels on the drawing: a terminal, a short lead, the clause number in a hairline box (Act I's detail tag, made precise), the text in Plex Mono 500 uppercase, a hairline rule. Texts: `4.2` HOT WORK · PERMIT · CERTIFIED OPERATOR · FIRE WATCH, `4.3` SPRINKLER PROTECTION IN SERVICE. Wraps on the middle dots (then on spaces) to `maxChars` 32.

Options: `num`, `text`, `at` (world point of the terminal), `s` (reference camera scale: `size` is px at that scale; the label is world-sized), `size` 21, `align` 'left' (text to the right of the terminal) or 'right', `lead` 22, `maxChars`. Helpers: `reveal(tl, t, dur)`, `live(tl, t, on)` (terminal and number box take the cobalt), `fade(tl, t, to, dur)`.

`connect(...)`: a cobalt 2 px live connection drawn on (DrawSVG), world coordinates, with screen-constant terminals. `shape`: 'straight' | 'elbow' (horizontal first) | 'elbow-v' (vertical first; `bend` 1 gives a clean L) | 'arc'. Options `dur` 0.8, `bend`, `fromTerminal`, `toTerminal`, `name`. Returns `{ el, path, end, fade(tl, t, dur, to), ink(tl, t, dur) }`. Because both ends are world points, the line stays attached through any camera move.

### 4.5b readout(opts)

The node's tooltip at `--pui-scale` 1.8: `HOT WORK · ROOF 03` then one of `checking` (CHECKING STATE / Verifying 5 conditions), `inside` (INSIDE PROGRAMME / DKK 0 incremental), `recalc` (RECALCULATING RISK STATE / Sprinkler Zone 3 offline), `outside` (OUTSIDE AGREED CONDITIONS in cobalt / Decision required, with the slice `EXPOSURE · TEMPORARY · 3H 18M` hatched cobalt from 14:42 to 18:00), `back` (BACK INSIDE ACCEPTED ENVELOPE / DKK 0 incremental), `retained` (RISK RETAINED · NORDHAVN / Owned and recorded · until 18:00; the demo's "no insurance purchased" line is not used). Helpers `set(tl, t, key)`, `enter`.

### 4.6 recordColumn(opts)

The trusted record: `TRUSTED RECORD · APPEND-ONLY` and `N ENTRIES` (odometer), entries with time, marker on the rail (event hollow, dev heavier, decision filled square with the ink bar and tint, sched dashed), title, subtitle, `REC-… · hash`. Appending opens the row (grid 0fr to 1fr, so older entries move without measurement), draws the rail segment, lands the marker, fades the text up 12 px; event `append`.

Options: `scale` 1.8, `width` 560, `entries` (initial, visible), `tail` (bottom-anchored with a top fade; needs `height`), `height`, `panel` (paper card behind it, for a free-floating column over the drawing), `title`, `sub` ('Append-only' or false). Helpers `append(tl, t, entry, dur)` where entry is a `UIKit.DATA.records` key or `{ t, kind, x, s, i, sig }`, `enter`.

Record keys (demo texts): `open` 08:55 Day opened · site baseline verified · `hotStart` 14:18 Hot work started · Roof 03 · inside envelope (REC-0403-AA9A · e0b9 4d12) · `verified` 14:18 5 of 5 conditions verified (REC-0404-E3F8 · 6721 7a99) · `szOffline` 14:42 Sprinkler Zone 3 taken offline · `outside` 14:42 Risk state moved outside annual programme conditions (cobalt marker) · `requested` 14:43 Decision requested · Site Risk Manager · `restored` 14:47 Sprinkler Zone 3 restored · `changed` 14:48 Risk state returned inside annual programme · Incremental price DKK 0 · `retained` 14:46 Incremental risk retained by Nordhavn Bioprocessing · `requestedCapacity`, `responses` (transfer, future state) · `craneLift` 15:12 · `gasBypass` 15:41.

### 4.7 decisionSheet(opts)

The demo's sheet at video scale (980 px wide, film sizes: title 62 px Light, text 26 px, labels 18 px; full sheet 874 px tall, fits the safe area at top 96): eyebrow `14:43 · DECISION REQUESTED · SITE RISK MANAGER` (cobalt dot), `Risk state changed`, `Roof hot work is continuing while sprinkler protection in the affected zone is unavailable.`, facts `EXISTING PROGRAMME` Outside agreed conditions | `INCREMENTAL EXPOSURE` TEMPORARY | `EXPECTED DURATION` 3h 18m 14:42–18:00, timeline `14:18 · OBSERVED` Inside · 5 of 5 verified → `14:42 · CHANGED` Sprinkler Zone 3 offline → `14:43 · NOW` Outside · your decision (cobalt glyph), `WHAT DO YOU WANT TO DO?`, the three choices (keyboard hints removed):
- `CHANGE ACTIVITY` Modify the work or restore a safeguard until it returns inside the envelope. `INCREMENTAL DKK 0`
- `RETAIN RISK` Knowingly carry the incremental exposure. Priora records who, what and for how long. `OWNED AND RECORDED`
- `TRANSFER RISK` Ask the market whether a carrier will cover this temporary slice. `CARRIER PRICED`
- foot: Priora supplies the observed state. The decision stays with the risk owner.

Helpers: `highlight(tl, t, key)` (ink border, white, lifted 3 px; the others to .42) · `focus(tl, t, on)` (folds facts and timeline away so the outcome fits) · `outcome(tl, t, key)` opens that choice's panel under the choices (closes the previous) · `resolveChange(tl, t)` · `resolveRetain(tl, t)` · `enter`.

Outcome panels:
- change: `Restore sprinkler protection` / Reopen the Zone 3 valve. Protection back within minutes. Then `BACK INSIDE ACCEPTED ENVELOPE` and `INCREMENTAL DKK 0`. Pair with `sprinkler(..., 'restored')`, `crossing.back()`, `node.state('changed')`.
- retain: the acknowledgement (dashed box to solid, filled check) `Nordhavn Bioprocessing knowingly carries this incremental exposure until 18:00.` then `DECIDED BY ANNA MØLLER · SITE RISK MANAGER · RATIONALE RECORDED` and `OWNED AND RECORDED · UNTIL 18:00` with the retained glyph. (The demo's ", outside the annual programme." is not used.)
- transfer (in the sheet): the dashed `FUTURE STATE` tag, `Priora shares the trusted observed state with selected carriers.` and `CARRIERS SET APPETITE AND PRICE. THE RISK OWNER CHOOSES.` The full transfer view is `transferPanel`.

### 4.7b transferPanel(opts)

The transfer outcome at video scale (1728 px wide): `TRANSFER RISK` + `FUTURE STATE` + `Selected carriers see the trusted observed state and answer on their own terms.`; the packet `TRUSTED OBSERVED STATE` · `PKT-0412` with the demo's nine fields (Activity Hot work, Location Roof 03, Duration 3h 18m, Current protection Sprinkler Zone 3 offline, Operator Certified, Fire watch Active, Extinguishing equipment Confirmed, Asset exposure Production Hall 2, Existing programme Outside accepted conditions) and `OBSERVED STATE · SEALED  f230 b4aa`; hairlines to the carriers; `RESPONSES · IN ORDER OF ARRIVAL`; carriers in arrival order only: Northstar Commercial (Existing carrier, DECLINED, OUTSIDE APPETITE, Declined · no quote), Atlas Specialty (QUOTE · 14:47, Until 18:00, deductible DKK 100,000, capacity DKK 25m, DKK 980), Boreal Risk (DKK 1,240, DKK 50,000), Helvetic Industrial (DKK 1,680, DKK 25,000). No Select pills, no selection, no best mark; the note `Carriers set appetite and price. The risk owner chooses.`

Helpers: `enter(tl, t)` (packet rows settle; `packet-seal`) · `send(tl, t, stagger, dur)` (hairlines draw, a token rides each drawn tip on arc-length keyframes; `send` per carrier; rows go WAITING to EVALUATING) · `respond(tl, times[4])` (each carrier answers at its own time, in arrival order; `response` with meta.order) · `hideForEnter()`.

### 4.8 programmeLayer(opts)

`ANNUAL PROGRAMME · PROPERTY + BI`: a long bar over a day axis (00:00 to 24:00, 6 h ticks) whose outline continues past both ends in dashes (the programme runs all year); alongside it, a thin hatched cobalt slice `TEMPORARY LAYER · ROOF 03 HOT WORK · 14:42–18:00` with its lead. The layer sits alongside, it does not replace. Options `width` 1728, `from`, `to`, `axis`. Helper `reveal(tl, t)` (bar draws, then the slice grows; events `programme-bar`, `layer`).

### 4.9 systemView(opts)

The wide whole-site product composition (a 1920x1080 root): SiteKit site in precise mode (or `opts.site`), labels at 18 px, the envelope centred in the free region; the header; the right rail (`--pui-scale` 1.7, 560 px) with `LIVE ACTIVITY` · `NORDHAVN · TODAY`, counters `OBSERVED`, `INSIDE`, `DECISIONS` (per-digit odometers, leading digits collapse), and the trusted record (tail mode). Options: `railW`, `headerScale`, `railScale`, `status`, `time`, `counts` [190, 189, 0], `chip`, `labels`, `entries`, `recordH`, `nodes` 30, `s`, `dy`.

Helpers:
- `scatter(tl, t0, dur, o)`: about 30 activities (the demo's routine and portfolio positions, then ambient spots) arrive in a seeded order: pulse, checking ring turning for `o.check` 0.7 s, inside, then quiet (.55). OBSERVED and INSIDE follow the arrivals and passes as a sum of 0.16 s smooth steps (one continuous odometer track; returns its end). Events `node-pass` (every third node).
- `decide(tl, t, 'changed' | 'retained', o)`: a node arrives, turns cobalt `outside`, holds `o.hold` 1 s, resolves to its glyph; DECISIONS steps; a plate (`DECISION MADE · CHANGED / CRANE LIFT / RESCHEDULED OUTSIDE WIND LIMIT` or `RISK RETAINED · NORDHAVN / GAS DETECTOR BYPASS / RETAINED UNTIL 17:30`) with a leader, `o.side` and `o.dy`; the record appends 15:12 / 15:41. Events `decision-flip`, `decision-resolve`. Call it after the scatter's counter window if it should add to OBSERVED (it does not touch OBSERVED).
- Handles: `site`, `header`, `rail`, `counters[3]`, `record`, `nodes`, `decNodes`, `camera`, `overlay`.

### 4.10 chain(opts)

`RECORD → TRUST → DECISION → PRICE → CAPACITY` in Plex Mono 500 44 px, 0.16 em tracking, placed with equal gaps (mono widths are exact), descriptors in Plex Sans 22 px grey: what was true · shared observed state · owned and explicit · the carrier's own terms · a layer alongside the programme. Hairline bracket `TODAY · PREVENTION AND PROOF` under RECORD and TRUST, dashed bracket `OVER TIME` under DECISION, PRICE, CAPACITY (dashes are discrete segments so they draw on).

Helpers: `reveal(tl, t, i)` (the arrow before word i draws in cobalt, then settles to grey; the word lands with its tracking closing from 0.3 em; the descriptor follows; event `confirm-N`, N = i + 1) · `bracket(tl, t, 'today' | 'overtime')` · `lift(tl, t, dur)`. Options `width` 1728, `size` 44, `bracketY` 176.

### 4.11 endCard(opts)

The Priora wordmark (assets/brand/priora-wordmark.svg, embedded) centred at 653 px (34 percent of the width); `Infrastructure for activity-level physical risk` in Plex Sans 36 px; the qualifier in Plex Mono 17 px, grey-2: `Conceptual future-state demonstration. Risk transfer, carrier quotes, prices, people, carriers, and the Nordhavn site are illustrative. Priora today focuses on prevention and proof.` Helper `reveal(tl, t, { descriptorAt, qualifierAt })`: a hairline draws, the wordmark rises out of it (clip) and latches (event `latch` at t + 0.48); descriptor and qualifier follow.

### 4.12 Extras

- `statements(opts)`: the Frame 4.4 beat. `label` (WHAT PRIORA DOES TODAY, `labelAt`), `items: [{ text, at: [x, y], align, link: 'svg path in screen px' }]`, statements in Plex Sans Light 64 px; `reveal(tl, t, i)` (event `statement`).
- `plate(svgParent, world, lines, opts)`: a demo node plate in screen-constant px with a leader (`side`, `gap`, `dy`, `size`).
- `Swap(parent, variants, initial)`: stacked variants in one grid cell (no reflow), `to(tl, t, key, dur)`; the outgoing text clears before the incoming lands.
- `Odometer(parent, { units, seps, lh, value, blankLeading })`, `clockOdo`, `counterOdo`: per-digit strips tweened by y, one sample per frame, split at cycle boundaries; `set`, `roll`, `track(tl, t0, t1, fn)`.
- `glyph(name, cls, parent, color)`, `hhmm('14:42')`, `rng(seed)`, `hashStr`, `mulberry32`, `stadium`, `EASE`, `C` (colours), `DATA` (every text above).

## 5. Composition notes from the style frames

- Frame 4.2 (01): `CAMERAS.roof03Product`, capture strip at (96, 700), node `k` 1.5 with reticle.
- Frame 4.3 (02): clause 4.2 at screen (1150, 250), 4.3 at (1110, 812) via `[cam.x + sx / cam.s, cam.y + sy / cam.s]`; connections node to 4.2 `elbow-v bend 1`, node to the Zone 3 valve anchor straight, valve to 4.3 `elbow-v bend 1`; card at (96, 190).
- Frame 4.4 (03): clause labels and connections fade, site to .32, card down 120 px, record as a panel at (1204, 318, 620 wide, scale 1.7), statements at (96, 176) and right-aligned at 1824.
- Frames 5.1 and 5.2 (04 to 07): `CAMERAS.systemRoof`, card at (96, 190), record panel top right (1244, 136); the record leaves before the crossing; readout at (1262, 250) after `X.tLand`.
- Frame 5.3 (08 to 10): `CAMERAS.decision`, `siteLabels(site, 1.25)`, site precise layer at .6, sheet at (844, 96).
- Transfer (11): panel at (96, 96), programme layer at (96, 848). System view (12): as built. Chain (13): (96, 392). End card (14): full frame.

## 6. Sound events

| type | from | when | meta |
| --- | --- | --- | --- |
| `header-assemble` | header.enter | assembly start | |
| `clock-roll` | header.rollClock | roll start, dur | from, to |
| `status` | header.setStatus | swap | status |
| `node-outside` `node-changed` `node-retained` `node-cover` | node.state | state change | from |
| `stretch` | crossing | stretch start, dur | from, to |
| `cross-edge` | crossing | head crosses the envelope | |
| `snap` | crossing | snap start, dur | latch (landing time) |
| `return-inside` | crossing.back | travel back | |
| `zone-offline` `zone-restored` `zone-active` | sprinkler | ripple start, dur | from |
| `card-enter` | card.enter | | |
| `verify` | card rows | each tick (five, distinct rows) | row, label |
| `verified-all` | card.verifyRows | 5 of 5 | n |
| `row-unavailable` | card | the fifth condition fails | row, label |
| `voice-in` | capture.play | take start, dur | words |
| `field` | capture.resolve | each field recognised | key, value |
| `clause` | clause.reveal | | num |
| `connect` | connect | line draw start, dur | name |
| `append` | record.append | marker lands | id, kind |
| `sheet-enter` `choice` `outcome-change` `outcome-retain` | decision sheet | | choice |
| `packet-seal` `send` `response` | transfer panel | | carrier, kind, order |
| `programme-bar` `layer` | programme layer | | from, to |
| `node-pass` | systemView.scatter | every third pass | i |
| `decision-flip` `decision-resolve` | systemView.decide | | outcome |
| `confirm-1` .. `confirm-5` | chain.reveal | each word | word |
| `bracket` | chain.bracket | | which |
| `latch` | endCard.reveal | wordmark latches | |
| `statement` | statements.reveal | | i, text |

## 7. Verification (2026-09-29)

- Seek safety: for every style frame and 13 evenly spaced times per shot (109 times in 7 shots), the computed state of every visible element (opacity, transform, colours, dash offsets, grid rows, letter spacing, clip, sizes, custom properties and all geometry attributes) after a direct seek equals the state after a scrambled history (end, 0, 0.37 T, T + 1.3, T - 2.1, 0.8 end, 0.01, T / 2, end, T). Pixel diffs between the two paths are 0 except text and hairline antialiasing where a GSAP transform exists on one path only (max 23 of 255 on faint lines, invisible).
- Ids: every element inside the kit's roots has an id starting with its prefix; no duplicate ids on the page. No em dashes on screen.
- Text: no HTML text in the kit renders under 18 px (the qualifier is 17 px by specification).
- Geometry: see 4.2b.
