# Look development: graphite Act I, precise Acts II and III

Tested on the demo's real site geometry (90 paths, 31 ellipses, world units scaled about 8x at the overview). Reference renders live in the session scratchpad (`lookdev/ld-rough.png`, `ld-rough-wobble-crop.png`, `ld-precise.png`).

## Graphite (Act I)

- Same geometry as the demo. Every stroked path keeps its exact command structure; only coordinates are jittered with a seeded PRNG (mulberry32), about 0.16 world units on the main pass (about 1.3 px at the overview), so the precise path can be reached later by a plain attribute tween.
- Main pass: graphite #3B3A36, 1.5 px on silhouette and face edges, 1.0 px in a lighter graphite (#8F8C86) on details, grid crosses, dashed and faint lines.
- Overdraw pass: a second jitter (about 0.22 units) of every main edge at 1.1 px, 32 percent opacity. This is what makes the line read as drawn, not rendered.
- Construction overshoot: each straight face edge longer than 3 units gets short extensions past both ends (0.5 to 1.4 units), 0.9 px at 28 percent.
- Shade: left-facing faces get diagonal hatching clipped to the face (spacing about 0.75 units, 0.7 px at 35 percent). Right faces get sparser hatching or none. Top faces stay clean.
- Occlusion: faces are filled with paper #F5F3EE (not transparent), otherwise hidden lines show through buildings and the drawing reads as a wireframe.
- Arcs: the tanks use arc commands; jitter only their end points and keep radii. The first test dropped them; any generator must verify the tanks render.
- Tremor: an feTurbulence (fractalNoise, baseFrequency 0.018, 2 octaves, fixed seed) plus feDisplacementMap at scale about 2 screen px. Apply it in screen space (CSS filter on the HTML wrapper of the SVG), never on a group inside the zooming viewBox, or the wobble scales with the camera.
- Stroke widths are screen-space constants: use vector-effect non-scaling-stroke, or scale widths by the inverse camera zoom as the demo does with its --sw variable. Test draw-on with whichever is chosen: dash lengths behave differently under non-scaling-stroke.
- Labels: Plex Mono uppercase in graphite, each rotated by a small seeded amount (under 0.8 degrees) and letterspaced slightly irregularly. No handwriting fonts.

## Precise (Acts II and III)

- The demo's own style: edges #5E5D59 at 1 px, details #A9A6A0, faces #FBFAF6 top, #EAE6DD right, #E1DCD1 left, ground #EFECE5, labels Plex Mono 500 letterspaced 0.14em.

## The resolve (graphite to precise)

Tween every main path's d from jitter to exact (expo.out, staggered by building), fade the overdraw, shorten the construction overshoots to zero, fade the hatching while face fills warm from paper to the demo tones, crossfade labels in place, and step the tremor scale from about 2 to 0. The stroke colour moves from graphite #3B3A36 to #5E5D59. Nothing changes position except by the tiny jitter distance, so it reads as the same drawing snapping into precision.
