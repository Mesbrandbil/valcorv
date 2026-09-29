# SketchKit: the hand-drawn world of Act I

`assets/js/sketch-kit.js` (window.SketchKit) and `assets/css/film-sketch.css` draw everything in Act I that is not the site itself: people, the van, routes, tags, activity markers, safeguards, the condition connection and its fray, the redrawn envelope, the incident box, and on the paper around the site the Frame 2 detail sheet, the translation chain, the Frame 3 evidence fragments, the three questions and the gap timeline.

It lives in the same visual universe as the graphite site twin in `site-kit.js`: seeded vertex jitter (`SiteKit.jitter`), a 32 percent overdraw pass, construction overshoot on straight edges, paper-filled solids, clipped diagonal hatching, and Plex Mono uppercase lettering with a tiny seeded rotation (under 0.8 degrees) and slightly irregular letter spacing. Typeset clause and statement text is Plex Sans. Colours are graphite #3B3A36, lighter graphite #8F8C86, the greys #6A6863 and #9C9994 for thinned text, and paper #F5F3EE. There is no blue anywhere in the kit.

Architectural working drawing, technical editorial illustration, forensic reconstruction. Never a whiteboard explainer: no hands, no faces, no cartoon people, no flames, no floating documents, no shadows, no tilt.

## Loading

```html
<link rel="stylesheet" href="../assets/css/film.css">          <!-- tokens + fonts -->
<link rel="stylesheet" href="../assets/css/film-sketch.css">   <!-- required: stroke widths, lettering, px groups -->
<script src="../assets/vendor/gsap/gsap.min.js"></script>
<script src="../assets/vendor/gsap/DrawSVGPlugin.min.js"></script>
<script src="../assets/js/site-data.js"></script>   <!-- window.SITE_MODEL, window.SITE_SVG -->
<script src="../assets/js/site-kit.js"></script>    <!-- window.SiteKit (parseD, fmt, jitter, rect) -->
<script src="../assets/js/sketch-kit.js"></script>  <!-- window.SketchKit -->
```

The kit's CSS names only `IBM Plex Mono` and `IBM Plex Sans`, with no fallback families (the HyperFrames compiler would try to fetch a substitute for a named fallback). The kit registers DrawSVGPlugin itself if it is loaded. It never queries the document with selectors: every builder takes element handles or a context, so it is safe inside scoped scene documents.

## Contexts and positions

```js
const site = SiteKit.mount(svgEl, { prefix: 'a1', show: 'rough' });
const W = SketchKit.world(site, { prefix: 'a1', scene: 'a1-world', refScale: 7.1, annotations: 'screen' });
const P = SketchKit.paper(hostDiv, { prefix: 'a1p', scene: 'a1-paper' });
```

- WORLD mode draws inside the site SVG in world units. Two layers: `W.ground` is inserted just before the site's graphite layer, so buildings occlude routes and trails; `W.top` sits above everything (markers, tags, figures, lettering). Stroke widths are screen constants through `--sw`, exactly like the site.
- PAPER mode appends an `svg.skt-paper` (1920x1080, screen px, `--sw: 1`) to the host, or adopts an `<svg>` you pass.
- `prefix`: every id the kit writes is `<prefix>-sk-<kind>-<n>` (item roots, clip paths, masks). Elements without ids are never referenced by id. Two compositions on one page need different prefixes (verified: 0 duplicate ids, 0 broken references with two sites and two paper sheets mounted together).
- `scene`: written into every sound event (default: the prefix).
- `refScale`: screen px per world unit used to size screen-px parts at build time. Default: the site camera at build time. `SketchKit.scaleOf(site.cameras.roof03)` gives 16, siteOverview 7.1, siteWide 5.5, sz3 12, roof03AndSz3 10.5, afterwardsWide 7.4.
- `annotations`: `'screen'` (default) keeps lettering and marks at their screen size at any zoom, like the site's own labels. `'world'` authors them in px at `refScale` and scales them with the drawing, as if lettered on the paper. Strokes stay screen-constant either way. Any builder that letters accepts `{ scale: 'screen' | 'world', refScale }` per item. `safeguardItems` defaults to `'world'` at 16, so the Roof 03 cluster stays composed as the camera moves roof03, landing, sz3, roof03AndSz3.

World positions accept:

| Form | Example |
| --- | --- |
| world point | `[38.971, 32.5]` |
| plan point | `{ plan: [67, 22, 12] }` (world = `[(x - y) * 0.8660254, (x + y) * 0.5 - z]`) |
| anchor name | `'roof03Centre'`, `'hotWorkNode'`, `'sprinklerZone3Valve'`, `'loadingAreaCentre'`, `'heroExitPoint'`, `'envelopeCentre'` (SITE_MODEL.anchors) or a `SketchKit.PLACES` name |
| anchor + plan offset | `{ anchor: 'roof03Centre', plan: [-3, 5, 0] }` |

`SketchKit.PLACES` (plan units) adds what the demo lacks: `gate` (112, 40, 0), the east end of the main road, since the demo draws no gate; `gateOutside` (121, 40, 0); `contractorsStop` (95.5, 53, 0); `vanParked` (104.5, 45.5, 0); `lotoValve` (21, 24.6, 2.4), on the Utilities south face between tank 2 and the Production Hall, the only Utilities face visible at the overview; `toolboxTalk` (22, 63.5, 0), in front of the Laboratory; `hseWalkLoop` (a closed loop round the Warehouse on its ring roads).

## Items

Every builder returns an item handle:

| Member | Meaning |
| --- | --- |
| `h.root`, `h.id`, `h.parts` | the root `<g>`, its prefixed id, named elements |
| `h.drawOn(tl, t, { speed, scene, events, eventOffset })` | draws it stroke by stroke from `t`, logs sound events, returns the end time. `speed` 2 halves every duration |
| `h.undraw(tl, t, { dur, sound })` | reverses the strokes (for explicit exits; a scrubbed story timeline needs none) |
| `h.fade(tl, t, from, to, dur, ease)` | root opacity (dim to 25 percent, recede, clear) |
| `h.slide(tl, t, { dx, dy, dur, fade })` | root translates and fades (the Frame 2 chain exit), logs `paper-slide` |
| `h.duration` | length of `drawOn` at speed 1 |
| `h.children` (groups) | child items, each with its own `drawOn` so a scene can place each on its cue word |

Drawing primitives: a hand line is a main pass (1.5 px graphite), an overdraw pass (1.1 px at 32 percent, a second jitter), optional construction overshoot (0.9 px at 28 percent, 3 to 9 px past each end of straight edges) and optional paper fill behind it. Lettering reveals with a left-to-right wipe (a clip rect width tween). Dots and dashes are tiny subpaths revealed in order by DrawSVG.

## Builders

### label(ctx, at, text | lines, o)
Hand-lettered Plex Mono label. `leader: [dx, dy]` draws a dot and a leader and letters on its end; `size` (18, the film's minimum for anything meant to be read), `weight`, `anchor`, `tone` (`skt-t2`, `skt-t3`), `scale`. World labels get a paper halo so they read over linework.

### figure(ctx, at, o) and fig.walk(tl, t, route, o)
Architectural scale figure: a dignified line silhouette with a paper fill, no face. `pose`: `standing` (front), `standing-side`, `walking`, `carrying` (a toolbox by default, `carry: 'pipe'` for a pipe on the shoulder). `facing` 1 or -1, `heightPx` (28 at refScale, so 22 to 30 px at the overview; world height about 3.9 units), `tone: true` adds light hatching on one side. Small figures (under 46 px) use a finer line without overdraw.

`walk(tl, t, route, { dur | speedPx, startPx, stopShortPx, stepPeriod, ease, fadeIn, gait })` moves the figure along a smoothed route as a chain of short `fromTo` translate tweens (position is a pure function of time), flips it to face the direction of travel with explicit `fromTo` flips, and plays a two-step gait: the body and arm outlines morph between two leg poses of identical command structure with a finite `yoyo` repeat. Logs `footsteps`.

### groupFigures(ctx, spec)
- `{ kind: 'semicircle', centre, n: 5, radius, label, labelLeader, heightPx }`: the toolbox talk. Figures stand on the far half of a circle in plan (world) or an ellipse (paper), facing the talk point, depth sorted; a small ring marks the point. Label e.g. `['TOOLBOX TALK · 07:15', '11 PEOPLE']`.
- `{ kind: 'file', route, n: 5, gapPx: 12 }`: contractors in file. `grp.walk(tl, t, { speedPx, gapPx, dur, fadeIn })`: each figure appears at the gate and walks the route, stopping in file. Logs one `footsteps` event for the group.

### van(ctx, at, { heading, size }) and van.drive(tl, t, { from, dur, ease })
An isometric line van built from 3D faces on the site's own axes (cargo box, cab with a raked windscreen, wheels, side door, cab window), back-face culled and painter sorted, paper filled, left faces hatched like the buildings. `heading` in plan degrees (180 drives west along the main road from the gate). `drive` translates it in from `from` (default 14 units behind) with `power2.out` and logs `van`.

### gate(ctx, at, { label })
A boom barrier at the road end (`PLACES.gate`), arm raised, with its rest post. `label: false` when the contractors tag already names the gate.

### dottedPath(ctx, points, o)
A drawn dotted route with an arrowhead. `plan: true` when points are plan triples, `closed` for loops (a small gap is left where the pencil started, and the arrowhead sits at `arrowAt`), `spacingPx` (6.5), `dash: true` for dashes, `lite`, `jitterPx`, `label` (18 px), `labelFrac`, `labelLeader` (the label goes on the top layer even when the route is on the ground layer). Logs `pencil-scatter`.

```js
SketchKit.dottedPath(W, [{ plan: P.gateOutside.plan }, 'gate', { plan: [104, 41.4, 0] }, { plan: [99, 48, 0] }, 'contractorsStop'],
  { layer: 'ground', label: 'CONTRACTORS · GATE 2 · 07:10', labelFrac: 0.06, labelLeader: [20, -46] });
// the loop's label on open paper south-west of the Warehouse, clear of the containers and the contractors
SketchKit.dottedPath(W, SketchKit.PLACES.hseWalkLoop.plan, { plan: true, closed: true, layer: 'ground', label: 'HSE SITE WALK · 07:30', labelFrac: 0.68, labelLeader: [-40, 70] });
```

### valveTag(ctx, at, o)
A P&ID gate valve (pipe stubs, bow tie, stem, T handle) with a lockout tag on a short string. `text` is split on ` · ` into lines of at most `maxChars` (14), or pass `lines`. `hand: 'a'` (default: 1.5 px line, Plex Mono 400, overshoot, tag turned 4.5 degrees) or `hand: 'b'` (another hand: heavier 1.9 px line, different seeds, Plex Mono 500, a double outline, turned -3.2 degrees, lettering logged as `pen`). `side` left or right, `drop`, `reach`, `size` (18). A tag is paper-filled and hides what hangs behind it: choose the side that covers the least important drawing (at the overview, the LOTO tag hangs right over Roof 01/02, not over the Laboratory).

```js
SketchKit.valveTag(W, 'lotoValve', { text: 'ISOLATED · LOTO · 07:40', side: 'right', drop: 40, reach: 30 });
SketchKit.valveTag(W, 'sprinklerZone3Valve', { text: 'SZ3 ISOLATED · MAINTENANCE · 14:42', hand: 'b', side: 'right', drop: 52, reach: 40 });
```

### activityMarker(ctx, at, o) and m.breathe(tl, t, dur, { amp, period })
A graphite ring (an open hand circle that overshoots its start, paper inside) with a centre dot and a lettered label on a leader. `variant`: `small` (r 4.4, 14 px, texture only), `normal` (r 7.2, 18 px), `hot` (r 11.5, heavier, a second light ring). `dir` (ne, nw, e, w, se, sw, n, s) or `angle` in degrees, `leadPx`, or `labelAt` (a world point: a world-space leader to a lettered shelf, for callout columns). `breathe` is a finite `yoyo` scale drift of the ring only (default 6 percent, 2.6 s period), never `repeat: -1`.

The `hot` variant in WORLD mode letters its label as the header of the safeguard schedule (unless `dir`, `angle`, `labelAt` or `header: false` is given): `'HOT WORK · ROOF 03 · 14:18'` is split into a title (`HOT WORK`, 24 px, 600) and a line (`ROOF 03 · 14:18`, 19 px, 500), set on a flat paper plate at `SAFEGUARD_LAYOUT.header` (px at refScale 16 from the point, in the open paper east of the Production Hall), on a fine graphite leader from the ring. `safeguardItems` then letters its ticked rows directly under it, so the hot work and its checklist read as one note, like the permit it is. Pass `headerLayout` to move it.

```js
const hot = SketchKit.activityMarker(W, 'roof03Centre', { variant: 'hot', label: 'HOT WORK · ROOF 03 · 14:18', scale: 'world', refScale: 16 });
```

### activityField(ctx, o)
The accumulation for "no one can hold a moving site in their head": `count` (36) markers chosen with a seeded shuffle from the demo's 72 ambient spots, 19 routine and 10 portfolio positions, kept `minDist` apart and away from `exclude` (Roof 03 by default, which keeps its own marker). About half get a short dotted movement trail. `labelCount` (10) markers are lettered in callout columns in the side margins (`labelMode: 'columns'`, `columnPx` 610, `labelSize` 16) and about a dozen more get short tags near the marker (`FIELD_TAGS`: permit numbers, LOTO, LIFT, DELIVERY; `tagSize` 14). These are texture (metadata sizes), not required reading. `field.drawOn(tl, t, { span: 6, accel: 0.82 })` brings them in accelerating overlapping waves. `field.dim(tl, t, 0.25, dur, [roofMarker])` drops everything else to 25 percent.

### containment(ctx, points, o)
The HSE containment line: a loose pencil lasso round a cluster (a principal-axis ellipse for up to six points, a rounded padded hull beyond), drawn a little past one turn. `padPx`, `lite`, `dur`.

### safeguardItems(ctx, anchor = 'roof03Centre', { refScale: 16, layout, stagger, size })
The five safeguards of the hot work, each drawn where it stands and then ticked in one schedule under the hot-work header:

- drawn on Roof 03, all on the side of the point that faces the envelope edge (north-east), so the south-west stays clear for the envelope redraw (1.10) and the SZ3 valve at (+125, +40) px stays free for its tag (1.9): FIRE WATCH (one standing figure), EXTINGUISHER (a line icon), AREA CLEARED (a hatched ring on the roof plane round the point), SPRINKLERS (a loose loop on the roof plane round two of Roof 03's heads);
- CERTIFICATE is a small card drawn in front of its schedule row (a document, not a thing on the roof);
- the schedule: one row per item (`✓ CERTIFICATE`, `✓ FIRE WATCH`, `✓ EXTINGUISHER`, `✓ AREA CLEARED`, `✓ SPRINKLERS`), Plex Mono 500 at 22 px (at refScale 16), each lettered and then ticked when its item has drawn, on a flat paper plate so the site's ground crosses stay out of the lettering. SPRINKLERS is the last row, where the eye ends.

`grp.items.certificate`, `.fireWatch`, `.extinguisher`, `.areaCleared`, `.sprinklers` are separate items, so each can land on its word; `grp.drawOn` staggers them 0.6 s. `grp.items.sprinklers.centre` is the world point in the middle of the sprinkler loop (the condition connection's end). `grp.schedule` gives the first row's world point and the pitch. `SketchKit.SAFEGUARD_LAYOUT` holds every offset (`header`, `schedule`, `order`, `text`, `certificate`, `fireWatch`, `extinguisher`, `areaCleared`, `sprinklers`); override entries with `layout`. World-scaled by default (see Contexts): 22 px at roof03, 20 px at landing, 16.5 px at sz3, 14.4 px at roof03AndSz3.

### conditionConnection(ctx, from = 'heroExitPoint', to = 'roof03Centre', o)
The thin dotted line from the envelope's condition (a knot lettered `4.3`) to Roof 03. Recommended end: the sprinkler safeguard, `sg.items.sprinklers.centre` (condition 4.3 is sprinkler protection, and a line into the marker itself would run beside the hot-work header's leader). `breakAt` (0.52) and `gapPx` (44) fix where it will part. `c.fray(tl, t, { dur: 1.8, driftPx: 6, side })`: the dots at the break drift a few px and fade (the gap opens) and the far part turns about its Roof 03 end so the loose end drifts; logs `fray` with `meta.silent: true`. `c.rejoin(tl, t, { dur })` plays it back explicitly; a scrubbed story timeline rejoins by itself.

### envelopeRedraw(ctx, { mode, target = 'roof03Centre', marginPx, filletPx, refScale: 10.5, ghostOpacity: 0.22 })
The accepted envelope redrawn so the hot-work point ends up outside it. Roof 03 sits about 31 world units inside the demo envelope, so "a few px inward" cannot do it. Two modes:

- `mode: 'zone'` (default): the envelope is redrawn to leave out Sprinkler Zone 3, the zone that has just gone offline. The new line is a rounded offset (`marginPx` 54 at refScale 10.5, about 5 world units) of the zone's roofs (Roof 03 and Production Hall 2, from `SITE_MODEL.planGeometry`) on the side facing the envelope centre, joined to the old contour by two lines along the zone's own sides, with round fillets (`filletPx` 96) where it leaves and rejoins. Roof 03, the whole safeguard schedule, the valve and its tag all fall outside. At roof03AndSz3 the line passes between the `02` and `03` roof numerals; at afterwardsWide it reads as a clean notch in the envelope where the zone was. `zone: [points]` replaces the zone polygon.
- `mode: 'dent'`: a smooth membrane dent toward the envelope centre (the demo's Gaussian bulge turned inward, `sigmaK` 0.6 of the depth), its deepest point `marginPx` (64) inside the target; `depthPx` gives a literal few-px dent anywhere. Kept for comparison: at Roof 03 its flanks cut through the SZ3 tag or the schedule.

Either way it is drawn quietly in the envelope's own two passes (a light construction pass, then the firm line) while the old section fades to a 22 percent ghost through a mask on the site's graphite envelope (silent). `r.crossing(a, b)` returns where a segment crosses the new line (or null), `r.newPoints`, `r.oldPoints`, `r.exitPoint`, `r.mode`.

### incidentBox(ctx, at = 'roof03Centre', { offset, text, size: 20 })
`INCIDENT · ROOF 03 · 16:07` in a restrained box with a hatched band, on a leader to a small cross at the point. No flames, no people. By default the box sits up and to the left of the point (over the Roof 01/02 skylights), clear of the schedule, the tag and the redrawn envelope; `offset` is the box's top-left in px from the point, and the leader runs from the nearer bottom corner.

### detailCallout(ctx, box, o) (PAPER)
The Frame 2 detail: hairline frame with overshoot and paper inside, detail bubble `D1` over sheet `01`, heading `PROPERTY + BI PROGRAMME · CONDITIONS` (Plex Mono 500, 20 px), a light rule, and the clauses in Plex Sans 26 px with mono clause numbers:
4.2 "Hot work requires a permit, a certified operator / and a fire watch." and 4.3 "Automatic sprinkler protection must remain in service." Each line sets with a wipe (`pen`). Default box `{ x: 858, y: 172, w: 966 }` (the right half, below the chrome clock, which ends near y 136); the height fits the clauses unless `box.h` is given. `leaderTo: [x, y]` draws a hand leader with a ring to the envelope on the site. Children: `grp.head`, `grp.clauses[0..1]`, `grp.leader`, so each clause can land on its word. `grp.sprinklerAnchor` is a point under clause 4.3 for the chain's first arrow.

### translationChain(ctx, box, { from, arrowStyles, heights, conditionSize }) (PAPER)
Four artefacts on the same paper (hairline frames, paper inside, no shadow, no tilt), default box `{ x: 858, y: 512, w: 966, h: 352 }`, 46 px apart. They are four different documents, not a card grid: top-aligned, each with its own length (`heights`, fractions of `h`: 1, 1, 0.83, 0.93). The sprinkler condition sits on one shared row so the arrows run between its mentions and it visibly thins, at `conditionSize` 20 px (required reading); document ids 18 px; field captions 14 px (texture):

| Station | Sprinkler condition | Arrow out |
| --- | --- | --- |
| PROCEDURE `HSE-PR-12` / `Hot work`, lines of text | `Confirm sprinklers` / `in service`, Sans 20, underlined in pen | solid |
| PERMIT `HW-0412`, OPERATOR and FIRE WATCH fields, signature, `APPROVED · HSE` stamp below it | `Sprinklers` + a drawn tick | dashed |
| BRIEFING `07:15` / `TOOLBOX TALK`, five figures round a point | `sprinklers on` in a speech outline, grey | dotted |
| CHECKLIST `HOT WORK`: `Fire watch` ticked, `Extinguisher` ticked | `Sprinklers` in pale grey + a hand question mark | |

`from: [x, y]` adds the arrow from clause 4.3 down to the procedure (pass `callout.sprinklerAnchor`). `grp.procedure`, `grp.permit`, `grp.briefing`, `grp.checklist`, `grp.arrows[0..2]`, `grp.lead` are separate items (cue each on "translate", "permits", "briefings", "checklists"). Exit: `chain.slide(tl, t, { dx: -140, dur: 0.8 })`.

### evidence(ctx, kind, { x, y, w, h, pin, pinFrom }) and evidenceBoard(ctx, { pins, layout, extras, stagger, lines, questionMarks }) (PAPER)
Kinds and texts (`SketchKit.EVIDENCE`): `photo` PHOTO · ROOF 03 · 16:09 (a hatched frame with a lens crosshair and viewfinder corners, not a photograph), `call` CALL LOG · 14:40 · VALVE ROOM · 2 MIN 13 S (with a duration rule), `permit` PERMIT HW-0412 · SIGNED 14:12 · SPRINKLERS + tick + signature, `workorder` WORK ORDER WO-2291 · SZ3 ISOLATION · 14:42, `programme` PROGRAMME · 4.3 · SPRINKLER PROTECTION, `statement` STATEMENT · FIRE WATCH · "I THOUGHT THE SPRINKLERS WERE ON", `email` EMAIL · 15:02 · RE: ROOF WORK. Titles and lines are Plex Mono at 18 px. Each lands with `paper-slide`, draws its frame, lettering and marks, then a fine leader runs to `pin` (a screen point on the site) where a small ring lands (`pin`). Leaders use `pathLength="1"` dashes so they stay fully drawn when their end moves.

`evidenceBoard` places all seven in an arc round the pins, for the Frame 3 camera below: email, photo, statement across the top, programme, call and permit down the right edge, the work order under the pins. Every leader runs inward without crossing a fragment or the questions; everything is inside the 96 px safe area and clear of the chrome clock (top right, to y 136) and the title block (from y 1000). The three questions (left, x 96 to 1061, y 344 to 620) and the gap-timeline band (y 690 to 920) stay clear. It adds dashed investigation lines between neighbours and four hand question marks. `extras: SketchKit.EVIDENCE_EXTRAS` adds three film-invented fragments that bleed off the left and top edges for the crowding (texture, not in the storyboard list; opt-in). `SketchKit.followPin(tl, fragment, worldPoint, camFrom, camTo, t, dur, ease, steps = 16)` keeps a pin on its site point during a camera move (exact at 16 keyframes, linear between).

**Frame 3 camera.** At `afterwardsWide` Roof 03 lands at screen (1026, 484), inside the right end of the question block, so every pin and leader would sit on the questions. Use `SiteKit.rect(4, 42, 7.4)` for the evidence beat (same scale, the site 192 px to the right): Roof 03 lands near (1220, 470), the SZ3 valve near (1276, 488), the envelope's exit point near (1422, 343), which is what the default layout is built round. Recommended pins: photo, permit, statement, email to Roof 03 (a few px apart), call and work order to the valve, programme to the exit point.

### questionMark(ctx, at, { size, rot }) and investigationLine(ctx, a, b, { bend })
A hand question mark (a hook and a dot) and a light dashed line between fragments. `evidenceBoard` places its question marks at `questionMarks: [[x, y, size], ...]` (default four, in the gaps of the arc).

### gapTimeline(ctx, { y: 772, x0, x1, leftX: 330, rightX: 1590 }) (PAPER)
A clean ruled line across the lower third with light ticks, the markers `14:42 · CONDITION CHANGED` (left) and `DAY +2 · FOUND` (right), a dimension bracket between them lettered `THE GAP`, and beneath it, in Plex Sans 26 grey, `Insurance position may have changed at 14:42.` (exact wording; the kit never writes "uninsured"). Children `grp.left`, `grp.right`, `grp.bracket`, `grp.note` for cueing "gap" on the bracket. Lettering has a paper halo so it reads over the faded evidence.

### typeStack(ctx, at, lines, { size: 76, weight: 300, stagger }) (PAPER)
Typeset statements, one child per line, each set with a quick wipe and no sound (type sets silently). Used for the three questions at [96, 420].

## State helpers

- `SketchKit.sprinklerHeadsFade(tl, site, t, { to: 0.2, step: 0.055, dur: 0.45 })`: the site's graphite sprinkler heads fade from ink to 20 percent one after another in the demo's ripple order from the valve (`data-i`). Silent (subtraction).
- `SketchKit.scaleOf(rect)`, `SketchKit.iso(x, y, z)`, `SketchKit.planFromWorld(w, z)`.
- `SketchKit.util`: `rng`, `hashStr`, `smoothCmds`, `lineCmds`, `flatten`, `pointAt`, `plLen`, `hand`, `letters`, `sans`, `hatch`, `pxAt`, `monoWidth`, `sansWidth` for scenes that need a one-off drawn mark in the same hand.

## Sound events

Each drawOn pushes `{ scene, type, t, dur, meta }` to `window.__filmEvents` with `t` in the timeline you passed (add `eventOffset` when building inside a nested story timeline, or `events: false` to stay silent). `meta.item` is the item id. Every `type` is a kind from the shared vocabulary in `docs/sound-events.md`, so a scene can copy the events into `compositions/<scene-id>.events.json` unchanged (`t` becomes `local:<t>`).

| type | when | meta |
| --- | --- | --- |
| `pencil` | a graphite stroke: outlines, leaders, figures, markers, lassos, the redrawn envelope | `light: true` for light detail strokes (lite lines, greeked text, the construction pass) |
| `pencil-scatter` | a dotted or dashed route, trail, connection or arrow being tapped out; the accumulation bed | `series: { count, every }`, `dots`, `dashed`, `style` |
| `pen` | pen on paper: clause lines, permit fields, signatures, and hand lettering of labels and tags | `lettering: true` for labels, `text` |
| `ruler` | a long straight rule against a straight edge (frames, straight lines of 160 px or more) | |
| `hatch` | hatching (van faces, the area ring, the incident band, the photo frame) | |
| `tick` | a graphite check mark (safeguards, permit, checklist, evidence); the two gap-timeline markers | |
| `stamp` | the APPROVED · HSE stamp | `text` |
| `paper-slide` | a sheet, callout or fragment arriving | `what` |
| `paper-lift` | the chain sliding out (`slide`), or `undraw(..., { sound: true })` | |
| `pin` | an evidence leader landing on its site point | `kind` |
| `footsteps` | a figure or a file of figures walking | `figures`, `stepPeriod`, `lengthPx` |
| `van` | the van rolling in | |
| `fray` | the condition connection parting | `silent: true` (near silent by design) |
| `incident` | the incident box starting to draw | `text` |
| `question` | a typeStack line setting (the three questions; very soft) | `text` |
| `gap-rule` | the gap timeline's rule drawing across | |
| `subtract-bed` | `sprinklerHeadsFade`: the heads fade and part of the bed is removed | `heads` |

The envelope's ghosting is silent. `set-square`, `radio-click`, `valve-clunk`, `rewind` and `latch-soft` belong to the scenes and the site kit, not to this kit.

## Seek safety and determinism

- Visual state is a pure function of timeline time. Everything is a `fromTo` with explicit from-states: DrawSVG, `attr` (clip widths, transforms, `d` for the gait), CSS opacity. No `onUpdate`, `onStart` or `onComplete`, no `Math.random`, `Date` or `performance.now`, no `repeat: -1` (breathing and gait use finite `yoyo` repeats).
- The first tween of a property on an element uses `immediateRender: true` (so the element is hidden before its draw); later tweens on the same property (`fade`, `fray`, `undraw`, `slide`, head fades) use `immediateRender: false`. Call `drawOn` before the helpers that act on the same element later in time.
- Seeds come from content (kind, text, position), never from the prefix or build order, so the Act I landing frame and the Act II handoff frame draw identically when both scenes build the same items.
- Chromium quirk found here: a multi-subpath dash pattern disappears when its dash offset is negative, which is what a DrawSVG range such as `'40% 100%'` produces. The kit only ever draws dotted paths from 0 percent and parts the connection by moving and fading separate dots. Scenes should not apply DrawSVG ranges with a start above 0 to `skt-d` paths.
- Chromium on Linux rounds each monospace advance to whole pixels in the unscaled paper overlay (16 px Plex Mono advances 10, not 9.6); under the world camera's scaling it does not. The kit lays out with the rounded advance and gives every wipe clip a margin that covers both (measured: no lettering overruns its clip at rest in any style frame).

Verification (review harness in the session scratchpad, `sketch-kit-review/`):

- Seek safety: one 38.4 s timeline built only from kit calls (907 tweens: gate, route, van drive, file walk with gait, both valve tags, markers with breathe, toolbox talk, HSE loop, activity field with dim, containment, hot header, safeguards, connection with fray, heads fade, zone redraw, incident, detail callout and chain with slide, evidence board with followPin, questions, fades, gap timeline, five site camera moves and a CSS blur on the site). 20 seeded times were reached in a shuffled order with direct jumps (callbacks suppressed), then again in the reverse order, each via the end, time 0 and the middle with callbacks enabled. All 20 pairs of screenshots are byte-identical and all 20 DOM fingerprints (every attribute of every element, numbers rounded to 0.01) match. The timeline carries 0 callbacks and 0 infinite repeats.
- Two compositions on one page (two sites, four paper sheets, the full Roof 03 state, the zone redraw, detail, evidence and gap in both): 696 ids, 0 duplicates, 0 unprefixed kit ids, 0 broken clip, mask or href references, identical drawings in both.
- No blue anywhere (the kit's only colours are graphite #3B3A36, lighter graphite #8F8C86, grey-2 #6A6863, grey-3 #9C9994, paper #F5F3EE, and black and white inside masks), no em dashes, no `Math.random`, `Date` or `performance.now`.

## Recipes (storyboard beats)

Tested values; every one of these is in the review style frames.

- 1.3 (siteOverview) Contractors: `gate(W, 'gate', { label: false })`, `dottedPath(W, route, { layer: 'ground', label: 'CONTRACTORS · GATE 2 · 07:10', labelFrac: 0.06, labelLeader: [20, -46] })` with `route = [{ plan: PLACES.gateOutside.plan }, 'gate', { plan: [104, 41.4, 0] }, { plan: [99, 48, 0] }, 'contractorsStop']`, `van(W, 'vanParked', { heading: 180 })` + `drive`, `groupFigures(W, { kind: 'file', n: 5, route })` + `walk(tl, t, { speedPx: 34 })`. Isolation: `valveTag(W, 'lotoValve', { text: 'ISOLATED · LOTO · 07:40', side: 'right', drop: 40, reach: 30 })`. Markers: `activityMarker(W, { plan: [96, 64, 0] }, { label: 'LIFT · LOADING AREA', dir: 'se' })`, `{ plan: [16, 12, 9] }` ELECTRICAL · UTILITIES `nw`, `{ plan: [58, 72, 5] }` INSPECTION · WAREHOUSE `sw`, `{ plan: [94, 20, 4.5] }` MAINTENANCE · PH2 `e`, each with `breathe`. `groupFigures(W, { kind: 'semicircle', centre: 'toolboxTalk', label: ['TOOLBOX TALK · 07:15', '11 PEOPLE'] })`. HSE walk as in `dottedPath` above.
- 1.6 (siteWide) Accumulation: `activityField(W, { count: 36 })` with `drawOn(tl, t, { span: 6 })`, three `containment` attempts round `field.points` near a spot, then `field.dim(tl, t, 0.25, 0.6, [roofMarker])` on "head".
- 1.7 (roof03) The hot marker (`variant: 'hot'`, `scale: 'world'`, `refScale: 16`) on "hot work begins": its label becomes the schedule header. `safeguardItems(W, 'roof03Centre', { refScale: 16 })` on "the certificate and safeguards are in place", each item on its word if wanted.
- 1.8 (landing) Build `conditionConnection(W, 'heroExitPoint', sg.items.sprinklers.centre)` and draw it before the landing frame, so it is part of the handoff frame.
- 1.9 (sz3) `valveTag(W, 'sprinklerZone3Valve', { text: 'SZ3 ISOLATED · MAINTENANCE · 14:42', hand: 'b', side: 'right', drop: 52, reach: 40 })`, then `sprinklerHeadsFade(tl, site, t)` on "offline".
- 1.10 (roof03AndSz3) `envelopeRedraw(W, {})` on "the conditions have changed" (the zone drops out of the envelope), then `connection.fray(tl, t)` on "nobody sees it". The SPRINKLERS tick stays.
- 1.11 (to afterwardsWide) `incidentBox(W, 'roof03Centre')`. For the pull, the valve tag reads better world-scaled (`scale: 'world', refScale: 12`) so it recedes with the site.
- Frame 2: `const callout = detailCallout(P, {}, { leaderTo })` with `leaderTo` a point on the envelope's right flank at siteLeft, `translationChain(P, {}, { from: callout.sprinklerAnchor })`, each station on its word, exit with `slide`. The site at siteLeft shows through the gaps between the documents; fade the site to about 0.8 or less there.
- Frame 3: camera `SiteKit.rect(4, 42, 7.4)` (see evidence above), `evidenceBoard(P, { pins })` with `followPin` during the camera pull, `typeStack(P, [96, 420], [...])` for the three questions, then fade the board and questions to 0.3 and `gapTimeline(P, {})`.
- Rewind: build all of it on the story timeline and scrub it; everything reverses by itself.

## Style frames

Review frames in the session scratchpad, `sketch-kit-review/after/` (the kit as it stands; `before/` has the same scenes rendered with the kit as first built): `01-overview.png`, `01-overview-arrivals.png`, `02-busy.png`, `02b-busy-dimmed.png`, `03-roof03.png`, `04-sz3-fading.png`, `04-sz3.png`, `05-before.png`, `05-redrawn.png`, `05-frayed.png`, `06-detail-mid.png`, `06-detail.png`, `07-evidence-mid.png`, `07-evidence.png`, `08-gap.png`, `09-incident.png`, `10-study.png`, `11-landing.png`, `12-afterwards.png`. The harness (`harness.html` with a static stand-in for the chrome layer, `scenes.js`, `shoot.mjs`, `shootq.mjs`, `seektest.mjs`, `pixcmp.py`, `twintest.mjs`) loads everything through file:// URLs and seeks a paused timeline.

## Known limits

- The site's tremor filter (site-kit applies `feDisplacementMap` at scale 2 to the whole site SVG) also moves the kit's WORLD lettering, which sits inside that SVG: thin vertical stems (I, 1) get a 1 px kink that reads as a torn glyph at 20 px and up (visible in the schedule). The paper overlays are not affected. Fixing it needs a site-kit or scene change (a lower `wobble`, about 1.2, or the filter on the rough layer only); the kit cannot opt its lettering out of a filter on an ancestor.
- Screen-constant lettering (`annotations: 'screen'`) crowds when the camera pulls back over a cluster authored for a close camera; use `scale: 'world'` for such clusters (the safeguards, the hot header and, for the pull to afterwardsWide, the SZ3 tag) or fade the lettering during the pull. World lettering falls below 18 px at the wide cameras by design (it recedes with the site).
- The zone redraw is a large change in extent (it has to be: Roof 03 is 31 units inside the envelope). It is quiet in line and colour and follows the zone's own geometry, so it reads as the zone leaving the accepted envelope rather than as a new shape.
- The van translates along straight segments only (its faces are projected once for one heading).
- `SketchKit.PLACES.gate` and the three `EVIDENCE_EXTRAS` fragments are film inventions (the demo has no gate).
