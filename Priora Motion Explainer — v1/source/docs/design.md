# Design bible: Priora motion explainer v1

The governing brief is `docs/brief.md` (the user's request, verbatim). The operating model comes from `Priora playground definition.pdf` (7 October 2026). This file turns both into rules a builder can follow without guessing. If a rule here and the brief disagree, the brief wins and this file is fixed.

## 1. The idea in one picture

Real work sits in the middle, printed in black ink on paper. Priora's agents are rust coloured tokens that move over the paper around it. Everything the agents do is about one object, the **case**, and one mark, **the gap**:

- The case is a small ring (Priora's structure) around a black core (the real activity). Six facets sit on the ring: what the worker's sentence means.
- When the specialists agree that the work is inside the conditions, their five arcs join into one **closed ring** around the case.
- A deviation is a **gap** in that ring: one arc slips out of line.
- The three decision rooms are three different ways of handling the gap: keep it on purpose with its terms written on it (Retain), fill it with a safeguard (Mitigate: fully closes it or only narrows it), or hand it to outside capacity to price (Transfer, simulated).
- Black means a person or a place. Only the risk owner's **black line** opens a decision room. Agents never open one.

## 2. Palette (tokens in `assets/css/film.css`, mirrored in `PK.C`)

| Token | Hex | Use |
| --- | --- | --- |
| `--paper-ground` | `#F7F5F0` | base under the grain; composite reads about `#F3F1EC` |
| `--paper` | `#F3F1EC` | paper-filled shapes (apertures, door gaps, masks) |
| `--ink` | `#111111` | the real world (worker, site, risk owner, ground), the human decision line, main type |
| `--ink-2` | `#3A3936` | secondary type |
| `--grey` | `#8F8C86` | tertiary type, ghost outlines |
| `--hair` | `#CFCBC3` | hairlines, inactive slots |
| `--rust` | `#C4441C` | every agent, every agent thread, agent findings (from the playground definition: "Black is the real world. Colour is Priora's agents.") |
| `--rust-deep` | `#9E3514` | token edge and pressed state |
| `--rust-pale` | `#F0DDD3` | soft fills (Priora's home field, active slot) |
| `--rust-wash` | `rgba(196,68,28,0.10)` | trails |

One working colour only. No gradients, no glow, no neon, no blue. The deviation is never shown with a new colour: it is shown by geometry (an arc out of line, a gap, a tilt, a dashed segment).

## 3. Type

IBM Plex Sans and IBM Plex Mono, self hosted (`assets/fonts`). Never write a family name in a style; use `var(--sans)` / `var(--mono)` in CSS and the `PK.text()` helper in SVG (it sets `font-family` from the variable at runtime).

| Role | Face | Screen size | Notes |
| --- | --- | --- | --- |
| Statement (opening line, tagline) | Plex Sans 400 | 52 to 60 px | sentence case, tracking -0.015em |
| Spoken sentence (worker transcript) | Plex Sans 400 | 30 px | ink, as speech |
| Names (agents, rooms, real world) | Plex Sans 500 | 22 to 26 px | sentence case: "Site rules", "Retain" |
| Status labels | Plex Mono 500 | 18 to 20 px | UPPERCASE, tracking 0.12em: "INSIDE THE CONDITIONS", "SIMULATED" |

Text lives inside the world SVG and scales with the camera, so a label's font size in world units is `screenPx / zoom` for the shot it is read in. Nothing meant to be read is under 18 px on screen at the moment it is read. On-screen language is sparse: names, short actions, status labels. Never the narration.

## 4. Space: one world, one camera

The film is one continuous drawing on one sheet. The world is 1920 x 1080 units; at the end the camera shows it 1:1. During the film the camera (the SVG `viewBox`, see `PK.camera`) moves between regions. There are no slide transitions and no cuts: every change of view is a camera move or a movement of things.

Layout at 1:1 (world units, y down):

| Element | Position |
| --- | --- |
| Priora home | (960, 175), radius 17 |
| Real world ground line | y 760, x 690 to 1230 |
| Worker | centre x 775, stands on the ground, about 125 tall |
| Site (building, sawtooth roof) | x 880 to 1040, roof top y 636, packing line point (1012, 735) |
| Risk owner (figure behind a desk block) | centre x 1148 |
| Real world labels | y 784, mono |
| Record spine | y 812, x 700 to 1220 |
| Case formation point | (1000, 410) |
| Site panel chamber | x 140 to 620, y 250 to 760, door on the right wall at y 505 |
| Panel table centre / slot ring | (380, 520), slot radius 150, 8 slots |
| Retain room | x 1300 to 1780, y 250 to 410, door on the left wall |
| Mitigate room | x 1300 to 1780, y 428 to 588 |
| Transfer room | x 1300 to 1780, y 606 to 766 (dashed walls: simulated) |

## 5. The cast

### The real world (people and places, never agents)

Flat solid ink, no shadow, standing on one ground line, never moving on their own except the worker's small gestures (a voice note) and the risk owner's decision line. They are printed on the paper; agents move over it.

- **Worker**: head and a rounded body, a hard-hat brim. Label "Worker".
- **Site**: an industrial building with a sawtooth roof and a door. The packing line is a point inside it. When work runs, a small black spark flickers there (welding, real world, so ink not rust). Label "Site".
- **Risk owner**: head and body behind a solid desk block. Label "Risk owner". Their **decision line** is a black line (2.5 px screen) that reaches out from the desk. It is the only thing that opens a decision room.

### Agents (rust tokens)

Every agent is a solid rust token with a cut-out **aperture** (the paper shows through) and a soft contact shadow, so it reads as a physical piece resting on paper. Character comes from shape, aperture, one small cue and one repeatable behaviour. No faces, no limbs, no eyes, no mouths, no wedge mouths, no ghost silhouettes.

| Agent | Shape | Aperture | Cue | Behaviour |
| --- | --- | --- | --- | --- |
| **Priora agent** (conductor) | disc, radius 17 | concentric ring cut | an orbit ring with one bead that turns to whoever Priora addresses | listens, summons (threads leave from the bead), carries the case, gathers findings. Never sits in a panel slot or inside a room |
| Site rules | rounded square | one horizontal slit | moves only in straight orthogonal steps | inspects by drawing a straight ruled line |
| Insurer conditions | pair of square brackets | the open middle | brackets open and close | embraces what it checks; can fail to close (the deviation) |
| Fire | triangle, apex up | small round hole | three small dots above the apex when it checks | pings concentric arcs (alarms, sprinklers) |
| Risk engineering | diamond | plus cut | turns 45 degrees while measuring | draws a dashed exposure radius |
| Evidence | disc | square cut (lens) | four viewfinder corner ticks | corners contract onto evidence, then a small tick |
| Retain room: Policy, Authority, Record | small squares (room family) | slit, notch, three slits | | establish exposure, authority, conditions, expiry |
| Mitigate room: risk engineering | small diamonds | plus | | bring safeguards from the reviewed library, compare, verify |
| Transfer room: carrier and capacity agents | hexagons drawn as **dashed outlines only** | | label carries "SIM" | simulated: dashed is the visual rule for simulated |

### The case

A rust ring (radius 22) around a black core (radius 5). Six facets sit on the ring. In close-up the facets stand out on short spokes with labels; travelling, they fold onto the ring.

| Facet | Mark | Label |
| --- | --- | --- |
| Activity | small L bracket with a crack | REPAIR |
| Hazard | four point spark | HOT WORK |
| Place | crosshair pin | PACKING LINE |
| Time | crescent | BEFORE NIGHT SHIFT |
| Conditions | small brackets | SITE + INSURANCE CONDITIONS |
| Evidence | square, dashed and hollow until the photo arrives | PHOTO |

### Chambers

Thin ink hairlines (1.5 px on screen at any zoom: `PK.hair`), rounded corners, a door gap in one wall. Doors open by sliding their two wall segments apart and close by sliding back. A chamber accepts (door opens, something enters), rejects (door shudders 3 px and stays closed), redirects (a thread bends to another door). The Transfer room is drawn with dashed walls and carries a rust outlined "SIMULATED" chip.

### Lines

- Agent threads: rust, 1.75 px screen, round caps, drawn on with DrawSVG. Information travels along them as small rust beads.
- Requests: dashed rust while waiting, solid once answered.
- Human decision line: black, 2.5 px.
- Trails: when something travels farther than about 150 world units, a dashed rust trail at 30 % opacity marks its path and fades within 1.2 s. Trails are controlled and purposeful, never decorative swirls.

## 6. Motion grammar

| Movement | How it looks | Default timing and ease |
| --- | --- | --- |
| summon | Priora's bead turns to the target; a thread draws from the bead toward an empty slot | thread 0.45 s `power2.out` |
| enter | the agent appears at the far end of the thread, outside the chamber, travels in through the door and lands in its slot with a small settle | travel 0.55 s `power3.out`, settle 0.25 s |
| inspect | the agent's own behaviour (table above) | 0.6 to 1.0 s |
| request | a hollow bead travels out along a dashed thread; the line turns solid when answered | 0.6 s each way |
| return | a small rust bead runs back to Priora or the case; a tick lands on the case ring | 0.45 s `power2.inOut` |
| align | tokens slide along the slot ring to even spacing; their arcs extend and join; the joined ring pulses once | 1.2 s `power3.inOut`, pulse 0.3 s |
| deviate | one arc rotates out of line and drifts outward; its agent tilts 12 degrees; the arc turns dashed; a gap opens | 1.0 s `power2.inOut` |
| assemble | findings and the ring draw inward into one compact packet with the gap visible | 0.9 s `power3.inOut` |
| escalate | Priora carries the packet along a long path with a trail to the risk owner | 1.6 to 2.4 s `power2.inOut` |
| route | a path opens from a door to a destination; a bead runs along it; the destination accepts | 0.8 s |
| compare | safeguard tokens line up and are tried against the gap one by one | 0.5 s per try |
| resolve | the ring closes, everything settles, one soft pulse | 0.6 s `power2.out` |

General rules: calm, weighted, no bounce beyond one small settle (back.out(1.4) at most), no spinning for its own sake, nothing moves without a reason. Hold important states for at least 0.8 s. Camera moves are `power2.inOut`, 1.0 to 1.8 s, and never overlap a move of the thing the viewer must read.

## 7. Honesty rules (from the brief; every builder checks these)

- The whole system is a design proposal. The film says so once, at the end ("DESIGN PROPOSAL").
- No "TODAY" or "LIVE" label on Retain or Mitigate. Nothing implies they are deployed.
- Transfer is labelled SIMULATED wherever it is on screen, its agents are dashed and marked SIM, and no insurer is named or implied to take part. No prices, no numbers in the Transfer room: price is a facet without a value.
- The risk owner always decides. No agent opens a room, picks an option, accepts a risk or stops the work. The work route stays open while the decision travels. A hard stop appears only as an unengaged dashed outline labelled as not configured.
- Retain is never selected by an agent and never applied because nobody answered: shown by an agent failing to open the Retain door and a timer running out with the door still shut.
- Safeguards in Mitigate are labelled as suggestions from a reviewed library.
- Hot work is the first decided use case. Other activities appear only as faint, labelled "LATER".
- No revenue model, no prices, no internal names or responsibilities, no open questions, no "playground" on screen.
- Never: robots, humanoid AI, faces, glowing networks, futuristic UI, dashboards, permits, checklists, forms, documents, flames, 3D spectacle, slide transitions, the Valcorv emblem, any emblem used as a logo. The only brand mark is the Priora wordmark (`assets/brand/priora-wordmark.svg`), ink on paper, still, at the very end.
- No em dashes anywhere on screen.

## 8. Sound (the picture declares it)

Each section declares its sound-worthy events in `sections/<id>.events.json` with times in absolute film seconds. Kinds: `print` (a real-world form pressed onto the paper), `speech-fragment`, `summon`, `arrive`, `move`, `thread`, `packet`, `inspect`, `evidence`, `request`, `return`, `align`, `lock`, `deviate`, `assemble`, `escalate`, `door-open`, `door-close`, `reject`, `route`, `record`, `compare`, `resolve`, `decision`, `simulated`, `title`, `wordmark`. The audio engine (`audio/build.py`) synthesises every sound from these. The story must read without sound.
