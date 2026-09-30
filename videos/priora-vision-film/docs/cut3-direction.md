# Cut 3: direction

Owner: the orchestrator (director). Cut 2 (docs/cut2-direction.md) is the base: its shots, pacing, grid and craft rules stay unless this document changes them. Where the two disagree, this document wins.

## What the user asked for (their words, condensed)

- "It pronounced Priora weird." (guide voice; fixed in the narration)
- "The music is a bit off. Don't make the cuts between them so choppy."
- "Go into a bit more detail and deviate from the HTML a bit more": more detail on scenarios other than hot work.
- The slogan "Infrastructure for activity-level physical risk" can be done better.
- The audience is investors and, above all, the ICP: whoever carries the risk.
- "At the end, 5 things: too much. It should be simple. Something someone can show someone on a lunch break."
- "The pacing is really nice." (keep it)
- "Visually more striking. I like the drawn aspect. But use colour. Smartly. The full thing in colour."

## 1. Colour, everywhere, with meaning

Tokens: assets/css/film-color.css (the only source; never hard-code another hex in a scene). The index loads it; scenes may link it inside their template too.

The principle: the world is drawn and washed in pale, muted materials; strong colour is reserved for meaning, and at most two or three strong colours share a frame. Colour is how a viewer on a phone reads the story at a glance.

| Meaning | Token | Where |
| --- | --- | --- |
| The world's materials | --c-slate-*, --c-sand-*, --c-sage-*, --c-stone-*, --c-steel*, --c-terracotta, --c-ground, --c-paving | pale watercolour washes on buildings (roof, lit wall, shadow wall), tanks, containers, roads, the apron |
| Accepted conditions | --c-envelope-line, --c-envelope-field | the envelope line (deep teal-green) and a very pale wash inside it |
| Hot work | --c-hot (--c-hot-soft) | the hot-work marker and ring, the welder's arc glow (never a flame shape) |
| Crane lift | --c-lift | the crane, lift markers |
| Gas detection | --c-gas | the gas detector, its markers |
| Confined space and air | --c-air | the ventilation, the tank entry, their markers |
| Ordinary activity | --c-general | the many quiet markers |
| Fire protection | --c-water | sprinkler heads, the sprinkler main, SZ3; when offline they drain to --c-offline one by one (the unnoticed change becomes visible to the viewer, never to the people in the story) |
| People | --c-hivis, --c-helmet, --c-leather | hi-vis vests and white hard hats on every worker, so people read at any scale |
| Verified, inside | --c-ok | ticks, VERIFIED, INSIDE ENVELOPE, a node inside |
| Changed, outside | --c-alert | the condition that changed, UNAVAILABLE, OUTSIDE AGREED CONDITIONS, the crossing, CONDITION CHANGED on the gap |
| Priora | --c-priora | the live connection lines, the product's own marks, the selected choice, the closed gap, the Priora mark's dot |

Grading by act:
- Act I: colour pencil and watercolour over graphite. Washes at --c-wash-act1 (a little softer), pencil-textured edges, colour hatching on shadow sides. Workers in hi-vis. The aftermath drains toward grey (--c-wash-after): proof reconstructed afterwards is colourless.
- The rewind: colour bleeds out as it runs back, and floods back in as it lands.
- Acts II and III: the same hues, clean and flat, with ink lines (the precise drawing). Interface pieces are paper-white cards whose colour is only their meaning (bands, ticks, states).
- The tremor filter (feDisplacementMap on the rough site) is removed: it made frames depend on the seek order. The rough twin's jittered geometry and pencil strokes carry the hand.

Premium restraint: pale washes, never saturated fills on buildings; strong colours small and exact; black linework always on top. No gradients except the paper's own light; no neon; no purple gradients (the violet is one flat accent for gas only).

## 2. Deviate from the HTML

Keep the product's logic and words; give it the film's own graphics. Cards become film-native: larger type, one colour band keyed to the category (water band for protection conditions, amber for hot work, yellow for lifts), states as coloured pills and ticks, fewer tiny demo labels and hairlines. Connections are drawn cobalt lines over the coloured site. The site in Acts II and III is the precise drawing in flat colour (materials, envelope, activities), not the demo's grey map.

## 3. Sequence changes

Acts I, II and III (to the programme layer after L17c) keep cut 2's shots, recoloured. Then:

### a3-change (ends at cue scenariosIn + 0.4)
Ends on the programme layer hold after L17c (the temporary layer beside the annual programme). Its cut 2 S20 (the whole-site pull back, nodes and counters) moves to a3-scenarios. Hand off with a 0.4 s crossfade.

### a3-scenarios (new; cue scenariosIn to closeIn + 0.4)
"Every kind of work carries its own conditions. A crane lift, as the wind picks up. A gas detector, bypassed for maintenance. A confined space entry, while the ventilation is down. Most work stays ordinary. The few changes that matter become decisions, made in time."
- SC1 (L18a, 'everyKind'): the whole precise site in colour, a calm wide; activity markers appear in their colours across it (hot work on Roof 03 amber, a crane at Production Hall 2 yellow, the laboratory's gas detection violet, the tank's confined space teal, ordinary grey markers elsewhere), each with a small condition tag in its colour. The camera begins a push toward the crane.
- SC2 (L18b, 'crane', 'wind'): a close vignette in the drawn style, in colour: a mobile crane (yellow) lifting a load over the production hall; a wind sock and an anemometer; gust lines. A film-native Priora card beside it: condition "LIFTS OVER PROCESS PLANT · WIND BELOW 9 M/S"; the live reading counts up on "wind" (7 to 11 m/s) and crosses the limit (the number turns --c-alert); the outcome settles: "LIFT PAUSED · RESCHEDULED 16:30" (change the work). Hold two beats.
- SC3 (L18c, 'gasDetector', 'bypassed'): the laboratory wall: a gas detector (violet accent) with a maintenance bypass key and tag. Card: "GAS DETECTION IN SERVICE" becomes "BYPASSED" on "bypassed" (--c-alert); outcome: "RETAINED UNTIL 17:30 · PORTABLE DETECTOR · OWNED BY THE LAB LEAD" (knowingly retained, owned, time-bound). Hold.
- SC4 (L18d, 'confined', 'ventilation'): a tank manhole with a rescue tripod, a worker in hi-vis at the entry, a ventilation fan and duct (teal) whose blades stop on "ventilation". Card: "FORCED VENTILATION AND GAS TEST BEFORE ENTRY"; "VENTILATION DOWN" (--c-alert); outcome: "ENTRY HELD · PREVENTION BEFORE THE WORK". Hold.
- SC5 (L18e, 'ordinary', 'few', 'decisionsL18'): a continuous pull back to the whole site in colour: many ordinary markers pass quietly inside the envelope with small green ticks; on "few" the four decisions of the film (hot work, crane, gas, confined space) resolve as distinct glyphs in their colours with short labels; on "made in time" a single cobalt pulse runs the envelope line once. Handoff at closeIn: the bare coloured site at SiteKit.CAMERAS.wholeSite (write the exact state as a comment at the top).
- Vignettes transition by match or by following: a move from the crane's hook line into the card's rule, a cut on the beat between vignettes, never a zoom montage.

### a3-close (new close; cue closeIn to END)
"For everyone who carries the risk, the gap closes. Priora. <line>."
- CL1 (L19): the coloured site recedes to paper; Act I's gap timeline returns in the Act I drawn language: the rule, "14:42 · CONDITION CHANGED" (--c-alert) and "DAY +2 · FOUND", the bracket "THE GAP". On "closes" the found end slides left along the rule until it meets the change: the bracket shrinks to nothing and the two marks become one cobalt point with "14:42 · DECIDED" (the decision exists when the risk changes). Hold.
- CL2 (L20): the cobalt point becomes the dot of the Priora mark (the g-mark glyph: the rounded square with its dot), the wordmark sets beside it on "Priora", and the line sets beneath on 'tagline'. The qualifier (18 px) fades in about a second later and holds to END; nothing moves in the last 2 s. Qualifier: "Conceptual future-state demonstration. Risk transfer, carrier quotes, prices, people, carriers, scenarios and the Nordhavn site are illustrative. Priora today focuses on prevention and proof."
- The line is "Know the risk you carry, while the work happens." (provisional; read it from a single constant so a change is one edit).

## 4. Music

One continuous piece in D at 92 BPM, never a hard stop: section changes crossfade over one to two bars, a sustained harmonic bed ties everything together, and the quiet moments are dips inside the same sound, not cuts to silence. Fewer layers entering and leaving; no pulse that starts and stops abruptly. The same editorial accents, quieter. Cut 3 story turns: the scenario run (L18a to L18d) gets a light, forward pulse; the pull back (L18e) opens up; the close resolves warmly under "the gap closes" and the Priora line, then decays naturally.

## 5. Ownership (cut 3 build)

| File | Owner |
| --- | --- |
| assets/js/site-kit.js, sketch-kit.js, ui-kit.js, assets/css/film-sketch.css, film-ui.css, product.css (colour and film-native restyle), docs/*-kit.md | kit builder K |
| compositions/a3-scenarios.html, .events.json | builder S |
| compositions/a3-close.html, .events.json | builder C |
| audio-engine/**, docs/sound-design.md | builder G |
| compositions/a1-*.html, a2-resolve, a3-change (recolour pass, after the kits land) | phase 2 builders |
| assets/css/film-color.css, chrome, cues, index, narration, film-lib, docs | orchestrator |
