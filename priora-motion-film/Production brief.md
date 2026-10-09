# Prompt: build the Priora motion film

Paste everything below into Claude Code, in an empty project folder on your Mac. Put the storyboard in the same folder as `Priora storyboard.md`.

---

You are a senior motion designer and a careful React engineer. You will build a 90 second motion film for Priora in Remotion, from the storyboard in `Priora storyboard.md`. The storyboard is the source of truth for story, timing, copy and meaning. This prompt tells you how to build it so it looks like a studio made it.

Read the whole storyboard before writing any code.

## 1. The standard

The reference is high end explainer animation: printed, tactile, calm. Think risograph print on warm paper, moved by a patient camera. The quality comes from three things:

1. Precise timing and easing. Nothing pops, nothing bounces, everything settles.
2. Restraint. One idea on screen at a time, lots of empty paper.
3. Iteration. You render, look at the frames, criticise them honestly, and fix them. Many times.

You do not get to call a sequence done until you have looked at rendered stills of it and they pass the checklist in section 9.

## 2. Technical setup

- Remotion, latest stable, TypeScript, React.
- One composition: 1920 × 1080, 30 fps, 2700 frames.
- Fonts: IBM Plex Sans and IBM Plex Mono, loaded with `@remotion/google-fonts`. Wait for fonts before rendering.
- All drawing in SVG. No raster images except the paper grain, which you generate yourself.
- File and folder names use hyphens or spaces. Never underscores.
- Final render: H.264, CRF 16 or better, plus a ProRes 422 HQ master.

## 3. Architecture

Build the film as one large world, not as scenes.

- **World.** One SVG world, about 5760 × 3240 units. Every territory has a fixed position in it: the real world in the lower centre, the site panel to the left, the three decision rooms to the right, the record line beneath the real world. Nothing is ever moved to fake a cut.
- **Camera.** A single camera component applies one transform (x, y, zoom) to the world. The camera is keyframed in one file. There are no cuts anywhere in the film.
- **Cast.** Every recurring object is one component with props for state: Priora, the five specialist agents, the three ghost agents, the three simulated transfer agents, the case, the worker, the site, the risk owner, the human decision line, the record line. The case keeps the same component and identity from Sequence 2 to the end.
- **Timeline.** One file holds every frame range from the storyboard, as named constants. For example `SEQ5 = { start: 1410, end: 1709 }`. All animation reads from these constants. No magic frame numbers inside components.
- **Layout.** One file holds every world coordinate. Paths between places are defined once and reused, so the case always travels along the same visible routes.

Suggested folders: `src/world`, `src/cast`, `src/camera`, `src/sequences`, `src/lib`, `stills`, `renders`.

## 4. Design tokens

Start with these values. Tune them only after looking at rendered stills.

| Token | Value | Use |
|---|---|---|
| Paper | #F3EEE3 | The sheet |
| Ink | #151515 | Physical world, human authority, main type |
| Cobalt | #2443B5 | Priora and its agents |
| Coral | #D9785F | Questions, exceptions, the gap |
| Stone | #C8C0B0 | Unoccupied places, structures |
| Cream | #E9E2D2 | Inactive possibilities, room interiors |
| Grey text | #8C877D | Faded words |

Rules:

- Colour never carries meaning alone. Shape and label always do the work too.
- Dashed outline means proposed, incomplete or simulated. Dash pattern is the same everywhere.
- The human decision line is ink, and visibly heavier than any agent thread. Agent threads about 2 px at 1080p. Human line about 5 px.

## 5. Texture

Texture must be static. It is the most common way these films look cheap.

- Paper grain: generate once with SVG `feTurbulence`, fixed seed, low contrast. It never changes between frames.
- Ink texture: each coloured shape gets a fixed noise mask that adds small cream flecks and slight density variation. Fixed seed per shape. The mask moves with the shape, it does not boil.
- Edges stay clean. The texture lives inside the shapes.
- No film grain overlay, no flicker, no animated noise. Ever.

## 6. Motion rules

Easing:

- Default ease: cubic bezier (0.45, 0, 0.15, 1). Slow out, slower in.
- Arrivals: ease out only, about (0.2, 0.7, 0.2, 1).
- No spring overshoot. No bounce. No elastic. If you use `spring()`, set damping so there is zero overshoot.

Timing:

- Small elements arrive over 12 to 18 frames. Large elements over 20 to 30.
- Stagger groups by 4 to 8 frames.
- After anything important arrives, hold it still for at least 20 frames.
- Labels appear 4 to 6 frames after the thing they describe, with a short fade and a 6 px rise.

Camera:

- Every camera move eases in and eases out. Minimum move length 40 frames.
- The camera is still during agent checks and decision moments, so the viewer can read them.
- Never move the camera and introduce new text at the same time.

Line drawing:

- Lines draw with stroke dash offset. The leading edge gets a tiny round cap that feels like ink arriving.
- Dotted threads have dots that travel along them at a steady speed.

Character:

- Priora glides on a longer, smoother curve than any agent. Its bead leads: the bead turns towards the target about 6 frames before the ring starts moving.
- Each agent keeps its own movement signature from the storyboard: Site rules aligns, Insurer conditions closes, Fire turns, Risk engineering opens, Evidence check frames and settles.
- Agents are never rotated or scaled so much that their silhouettes become hard to tell apart.
- Motion trails are short echoes only, fading within 8 frames.

## 7. Typography

- Sentences and names: IBM Plex Sans, Medium or SemiBold.
- Status labels: IBM Plex Mono, uppercase, letter spacing about 0.08 em.
- Minimum size at 1080p on screen after camera zoom: 22 px for labels, 44 px for sentences. Calculate the on screen size, not the world size.
- Centred lines break evenly. No orphans, no lone words on a line.
- Text sits on clean paper, never on top of a line or a shape.
- On screen text is copied exactly from the storyboard. Do not add words.

## 8. Composition rules

- One focal arrangement at a time. Everything else is either off frame or below 30 percent opacity.
- At least 40 percent of every frame is empty paper.
- Contact shadows are soft and barely there.
- The gap in the case, once it opens at F1410, is visible in every frame where the case is on screen, until the risk owner closes the decision in Sequence 7.
- The Transfer room and everything from it stay dashed and keep the SIMULATED label every time they are on screen.
- The black decision line always starts at the risk owner's desk and visibly reaches each threshold before Priora crosses it.
- No numbers that are not in the storyboard. Cost and time in Mitigate are shown as disc stacks and clock arcs only.

## 9. The review loop

Work in this order. Do not skip ahead.

**Step 1. Plan.** Write `plan.md` with: the world layout as a list of coordinates, the camera keyframes, and a table of every sequence with frame range, focal subject and on screen text. Show me the plan before building.

**Step 2. Static world.** Build the full world with every element in its final resting state. Render stills of: the whole sheet, each territory up close, and a cast sheet with every agent side by side. Look at them. Fix proportions, spacing and colour before any animation.

**Step 3. Animate one sequence at a time.** For each sequence:

1. Build it.
2. Render stills at the start, the end, and every key moment listed in the storyboard. At least 6 stills per sequence. Save them to `stills/sequence N`.
3. Render a half resolution MP4 of that sequence.
4. Open the stills and review them against the checklist below. Write down every problem you find.
5. Fix them and render again.
6. Only move on when a sequence passes the checklist twice in a row.

**Step 4. Full film.** Render the whole film at half resolution. Check that the camera journeys between sequences feel continuous. Then render the final masters.

Checklist for every still:

- Is there one clear focal point?
- Is at least 40 percent of the frame empty paper?
- Is every piece of text readable, evenly broken and on clean paper?
- Does every agent still read as itself by silhouette alone?
- Is the case recognisable as the same object?
- If the gap should be visible, is it?
- Is anything crowded, clipped at the frame edge by accident, or overlapping?
- Does the colour use match the rules in section 4?

Checklist for every MP4:

- Does anything bounce, pop, jitter or flicker?
- Does every important arrival get a still hold?
- Does the camera ever move while new text appears?
- Is anything too fast to read? A label needs about 1 second per 3 words on screen.

Be strict. If a still looks like a generic template, say so and fix it.

## 10. Narration and sound

You cannot record the voice or the sound design, so prepare for them.

- Write `narration.srt` with every narration line from the storyboard, timed to its sequence. Assume a calm pace of about 2.3 words per second. If a line does not fit its window at that pace, flag it in `plan.md`. Do not speed up the animation to fit it.
- Write `sound cues.md` listing every sound moment from the storyboard with its exact frame: paper contacts, wooden ticks, thread plucks, the weld, the music changes.
- Leave an audio track slot in the composition so the voice and sound can be dropped in later.
- Render one version with the narration burned in as small subtitles for review, and one clean master without.

## 11. Deliverables

- `renders/Priora film master.mp4`
- `renders/Priora film master.mov` (ProRes)
- `renders/Priora film review with subtitles.mp4`
- `narration.srt`
- `sound cues.md`
- `stills/` with the final review stills for every sequence
- `plan.md`, updated to match what was built

When you finish, tell me in a few sentences what you built, which parts you are least happy with, and what you would improve with another pass.
