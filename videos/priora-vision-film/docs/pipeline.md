# Pipeline guide: how scenes are built, timed, checked and rendered

Verified on 2026-09-29 with HyperFrames CLI 0.8.92, GSAP 3.15.0 (vendored), Chromium headless shell, this 4-core container. Every claim marked **verified** was tested in the prototype (`compositions/zz-proto.html`) or a scratch project; the evidence is in section 12.

Read this before writing a scene. The contract is short: one sub-composition per scene, local vendored libraries from `index.html`, every sync time from `window.CUES`, every property owned by exactly one timeline.

## 1. How the film is assembled

```
inputs                                  scripts/build-cues.mjs        outputs
narration/timing.json          --+                                +-> assets/js/cues.js         window.FILM, CUES, SCENES, NARRATION, FL_EVENTS, FL_T
cues/cuesheet.json             --+--> resolve, validate, snap ----+-> assets/js/film-assets.js window.FL_ASSETS (inline SVG strings)
compositions/<id>.events.json  --+                                +-> cues/resolved.json        the same data for the audio engine
                                                                  +-> index.html                slot and stem regions between markers
```

`index.html` is a thin orchestrator:

- `<head>` loads, in order: `assets/vendor/gsap/gsap.min.js`, `DrawSVGPlugin`, `CustomEase`, `MorphSVGPlugin`, `MotionPathPlugin`, then `assets/js/film-lib.js` (window.FL, registers the plugins), `assets/js/cues.js`, `assets/js/film-assets.js`, the shared kits `assets/js/site-data.js`, `site-kit.js`, `ui-kit.js`, `sketch-kit.js` (window.SITE_MODEL / SITE_SVG, SiteKit, UIKit, SketchKit; see docs/ui-kit.md and docs/sketch-kit.md), and `assets/css/film.css` (which imports `fonts.css`). Scenes use these globals and never load them again with `<script src>`.
- An untimed full-bleed paper layer `#film-paper` (base `--paper-ground` #F9F7F2, static grain `assets/textures/paper-grain.png`, faint vignette). The grain darkens the base by about 4 levels, so the composite averages #F5F3EE (**verified**: centre mean 244.6, 242.6, 237.5). Paper-filled shapes in scenes therefore match the ground.
- One slot per scene, `<div id="el-<scene>" class="clip fl-slot" data-composition-id="<scene>" data-composition-src="compositions/<scene>.html" ...>`, with `data-start`, `data-duration`, `data-track-index` and `z-index` written by the compiler.
- Three stems on tracks 20, 21, 22: `stem-voice`, `stem-music`, `stem-sfx` (`assets/audio/voice.wav`, `music.wav`, `sfx.wav`). A stem file that does not exist yet is left out as an HTML comment.
- An empty root timeline `window.__timelines["film"]`. All animation lives in the scenes.

Only the regions between `<!-- build-cues:root|slots|audio:begin -->` and `...:end -->` are regenerated. Everything else in `index.html` is hand-authored and preserved. `--init-index` writes a fresh template.

## 2. The daily loop

Run everything from `/home/user/valcorv/videos/priora-vision-film`.

| Step | Command | Time |
| --- | --- | --- |
| Rebuild cues and index after any change to timing, cue sheet or events | `node scripts/build-cues.mjs` | < 1 s |
| Validate the cue sheet without writing | `node scripts/build-cues.mjs --check` (add `--allow-missing` while scenes do not exist) | < 1 s |
| Pre-render gate: are cues.js, resolved.json, film-assets.js and index current? | `node scripts/build-cues.mjs --verify-fresh` (exit 1 when any generated file differs from a fresh build: timing, cue sheet, events, stems, inline SVGs; pass the same `--cuesheet`) | < 1 s |
| Static lint | `npx --yes hyperframes@0.8.92 lint` | 2 s |
| Full gate (lint, runtime, layout, motion, contrast) | `npx --yes hyperframes@0.8.92 check` (`--json` for machines) | 15 s |
| Look at frames of a time range | `npx --yes hyperframes@0.8.92 snapshot --at 40.2,40.8,41.4,42.0 --no-end -o /tmp/<you>/snaps` | 10 s for 9 frames |
| Zoom crop at 3x density | `npx --yes hyperframes@0.8.92 snapshot --at 51 --zoom "700,300,480,270"` | 10 s |
| Watch motion (whole film, fast) | `npx --yes hyperframes@0.8.92 render --quality draft --output /tmp/<you>/film-draft.mp4` | about 3 min |
| Cut a segment out of that for review | `ffmpeg -ss 38 -to 47 -i film-draft.mp4 -c copy seg.mp4` | instant |
| Studio (human review) | `npx --yes hyperframes@0.8.92 preview --background --port 3017`, then `preview --stop` | |

Snapshots are the fastest honest view: they run the same producer as the render (**verified** identical to Studio preview pixels, and to render frames up to H.264 loss). Put throwaway output in your scratchpad, never in `renders/` or `snapshots/`.

Studio preview writes to your sources: while `preview` runs it stamps `data-hf-id` attributes into `index.html` and every composition it opens (its stable edit targets, **seen** on this project) and keeps copies under `.hyperframes/preview/`. They are harmless; build-cues rewrites its marker regions without them. Do not hand-edit around them, and re-read a file before editing it if Studio was open.

There is no time-range render. A wrapper index with a negative `data-start` does not offset the scene (**verified**: the start is clamped, local time still begins at 0) and a second root HTML file fails lint. Use snapshots, or a draft render plus `ffmpeg -ss/-to`.

## 3. The scene template (copy this)

Replace `SCENE` with the scene id everywhere (kebab-case, for example `a2-resolve`). The id must equal the file name, the slot's `data-composition-id`, the template root's `data-composition-id` and the `window.__timelines` key; `build-cues.mjs` refuses a mismatch.

```html
<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="UTF-8" />
    <title>SCENE: one-line purpose</title>
    <!-- Ignored by the assembler. Everything that must exist at render time is inside <template>. -->
  </head>
  <body>
    <template id="SCENE-template">
      <style>
        /* Style the root only as #root (lint: subcomposition_root_styled_by_class). The assembler
           scopes every rule in this block to this scene and rewrites #root to the slot. */
        #root {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
        #SCENE-fade,
        #SCENE-stage-wrap {
          position: absolute;
          inset: 0;
        }
        /* Strokes inside a camera-framed SVG: width in screen px via --sw (see section 6). */
        #SCENE-stage .SCENE-line {
          fill: none;
          stroke: var(--graphite);
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: calc(var(--sw, 0.1664) * 1.5px);
        }
        #SCENE-title {
          position: absolute;
          left: 96px;
          bottom: 150px;
          width: 1200px;
          opacity: 0;
        }
      </style>

      <div id="root" data-composition-id="SCENE" data-width="1920" data-height="1080">
        <!-- Anything outside this root (except style, script, link) is dropped by the assembler,
             so filter <defs> live in an invisible SVG inside the root. -->
        <svg id="SCENE-defs" width="0" height="0" style="position: absolute" aria-hidden="true"><defs></defs></svg>
        <div id="SCENE-fade">
          <div id="SCENE-stage-wrap" data-layout-ignore></div>
          <p id="SCENE-title" class="fl-display">Prevention before the work.</p>
        </div>
      </div>

      <script>
        // Globals from index.html <head>: gsap (+ plugins), FL, CUES, SCENES, NARRATION, FL_EVENTS,
        // FL_T, FL_ASSETS. Do not add <script src> for them here (see section 4).
        var ID = "SCENE";
        var clk = FL.clock(ID); // clk.t("cueName"), clk.t("L07:offline.start", 0.2), clk.ev("event")
        var T = function (anchor, off) {
          return clk.t(anchor, off);
        };

        // document is scoped to this scene: getElementById / querySelector only see this scene.
        var fade = document.getElementById("SCENE-fade");
        var wrap = document.getElementById("SCENE-stage-wrap");

        // The site drawing, inline, ids prefixed "SCENE-" so two scenes can show it at once.
        var site = FL.mountSvg(wrap, "SITE_PRECISE", { prefix: ID });
        site.setAttribute("preserveAspectRatio", "xMidYMid meet");

        // Camera: named world rects (see assets/site/site-model.json "cameras").
        var cam = FL.camera(site, {
          rects: {
            overview: "-143.269 -56.345 319.447 179.689",
            roof03: "-45.901 -25.015 192 108",
          },
        });
        cam.apply("overview"); // the static first frame

        var tl = gsap.timeline({ paused: true });
        FL.sceneFade(tl, fade, ID); // fades over the declared crossfades, if any
        cam.set(tl, "overview", 0);
        cam.to(tl, "roof03", T("roof03"), 2.2, "power2.inOut");
        tl.fromTo("#SCENE-title", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }, T("prevention"));

        window.__timelines["SCENE"] = tl; // last line: register only after the build is complete
      </script>
    </template>
  </body>
</html>
```

The rewind scene (a1-world) adds the story pattern of section 8. The prototype `compositions/zz-proto.html` is a complete, checked example of every technique in this guide over the full 90 s (delete it before the final build).

## 4. Rules

Must:

- Asset paths inside compositions are root-relative: `assets/css/film.css`, never `../assets/...` (lint error `invalid_parent_traversal_in_asset_path`, **hit**). Relative `url()` inside a linked stylesheet resolves against the stylesheet (**verified**).
- Prefix every id and scene class with the scene id (`#a2-resolve-card`). The assembled page holds every scene at once.
- Register exactly one paused timeline, as the last statement, under the scene id.
- Use `fromTo` (or the FL helpers, which carry both ends) for anything that can be seeked backwards.
- Keep chained tweens on one property continuous: the next tween starts from the value the previous one ended on, and text formats agree at the boundary. When seeking backwards GSAP renders the later tween at its start value last, so a jump there shows up as a wrong frame (**hit**: the camera after a drift, and the clock format at the landing). `cam.to()` chains camera moves automatically.
- One property, one owner. A story timeline and the registered timeline must never animate the same property of the same element. Give each its own wrapper (story fades the inner `<g>`, the registered timeline fades the outer `<div>`), and for the camera use layers (section 6) (**hit**: a wrong camera rect after an out-of-order seek until layers were added).
- First `FL.drawOn` of a path renders its undrawn state at build time (default). A later draw of the same path passes `immediateRender: false` (FL.drawOff already does).
- Text meant to be read is at least 18 px. Use the classes in `film.css` (`fl-display`, `fl-heading`, `fl-body`, `fl-label`); `fl-meta` (16 px) is decorative only.
- Fonts through `var(--sans)` / `var(--mono)` (or the `fl-*` classes). Every font is IBM Plex from `assets/fonts` (**verified** by Chrome's platform-font report: Plex Sans Light/SemiBold, Plex Mono Medium, no fallback).
- Declare every sound-worthy visual event in `compositions/<scene>.events.json` (section 5).

Never:

- `<script src>` for GSAP, plugins or film-lib inside a template. It executes again and replaces `window.gsap` with a second instance (**verified**: `window.gsap` changed identity); timelines built on the first instance are no longer driven by the runtime's copy.
- A named fallback font in a font stack (`Helvetica Neue`, `Arial`, `Menlo`, `Consolas`). The compiler "helpfully" injects `@font-face` rules for any named family it cannot see declared and fetched Inter and JetBrains Mono from Google Fonts (**hit**, fixed in film.css: stacks end in `sans-serif` / `monospace`).
- Any family name written literally in a template `<style>` or a `style=""` attribute, not even `"IBM Plex Sans"` or `"IBM Plex Mono"`. The render compiler reads only the HTML text, not linked stylesheets, so it does not see the `@font-face` rules in `fonts.css`: it fetches the named family from Google Fonts and injects its own `@font-face` rules after every stylesheet, where they override the self-hosted demo fonts (**verified** with `render --debug`: `font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif` in a template style injected 9 Google faces for IBM Plex Sans plus Inter under the other two names). Always write `var(--sans)` / `var(--mono)`. Names inside linked stylesheets (`film-sketch.css`, `product.css`) are not read by the render compiler (**verified**: nothing injected), and runtime-generated SVG attributes are never seen.
- Functions directly inside a GSAP plugin's vars object. GSAP treats them as function-based values and calls them with `(index, target)` (**hit** in flText; FL wraps formatters as `{ fn }`).
- `vector-effect: non-scaling-stroke` on a path you draw on. As a CSS property, DrawSVG measures user units while the browser dashes in screen units: at 50 % the whole line is drawn (**verified**). As an attribute, DrawSVG measures with the screen CTM at the tween's first render, which depends on where the camera was at that moment. Use `--sw` widths (film.css `.fl-pencil` etc.).
- DrawSVG on a dashed path: it overwrites `stroke-dasharray`, so the dash pattern disappears. Reveal dashed lines with opacity or a clip.
- `Math.random`, `Date.now`, `performance.now`, `repeat: -1`, timers, event handlers, `fetch`. Use `FL.prng(seed)`.
- Tweening `display`, `visibility` or `autoAlpha` on a `.clip` or the scene root (lint `gsap_animates_clip_element`). Fade a wrapper inside the root.
- A CSS `transform` on an element that GSAP also transforms (lint `gsap_css_transform_conflict`).
- A filter per path, or a filter on a group inside a zooming SVG (cost in section 11, and the wobble would scale with the camera).
- `will-change: transform` on anything that zooms (it freezes the raster and blurs). Zoom with the viewBox camera.
- Hard-coded seconds for anything that should sync with the voice. Every such time is a cue.
- A tween at a negative position (a time before the scene's own start). GSAP does not clip it: it shifts every child of that timeline later by that amount, so the whole scene drifts off its cues (**verified**: one tween at -0.0067 moved a tween authored at 2.0 to 2.0067). Scene starts are frame-snapped and cues are not, so `clk.t()` returns 0 for the scene's own start cue when it lands less than half a frame below 0; anything earlier is an authoring bug. For a pre-roll, start at 0 with a `fromTo` whose from-state is already part way.

Check-time findings you may meet:

| Code | Meaning here |
| --- | --- |
| `console_error` "[HyperFrames] composition script error: <id> ..." | your scene script threw; nothing after the throw ran |
| `sweep_static` | the timeline never advanced; almost always the script threw before registering |
| `check_runtime_failure` / "did not become render-ready" | same cause, or registration never happened |
| `console_error` "Expected arc flag" | a path d with non-integer arc flags (FL.normalizePath keeps them integers) |
| `clip_media_fit` warning | a stem shorter than its slot; build-cues now sets the stem duration from ffprobe |
| `text_occluded` info | text under an opaque layer; fade the text out instead of covering it |

## 5. Time: cues, words and sound events

All sync times come from `narration/timing.json` through the cue sheet. After ElevenLabs is re-locked, only `node scripts/build-cues.mjs` has to run; every scene follows.

Anchor grammar (cue sheet values, `clk.t()` arguments, event `at` values):

| Form | Meaning |
| --- | --- |
| `12.5` | absolute film seconds |
| `START`, `END`, `END-2.0` | 0, film end |
| `L07.start`, `L07.end` | a narration line (ids as in timing.json: `L14a`, `L19c`) |
| `L07:offline.start` | a word, case and punctuation ignored (`L13:I'm.start`, `L20:activity-level.start`) |
| `L10:what#2.start` | the 2nd occurrence in that line; a word that occurs twice without `#n` is an error |
| `cue:rewindStart+3.2` | another cue (cue names: letters, digits, underscore) |
| `scene:a2-resolve.start` | a resolved scene boundary |
| `local:1.25` | events only: seconds from the scene's start |
| any `+0.4-0.1` tail | offsets |

The compiler fails loudly (exit 1, nothing written) on: unknown line, word or cue; an ambiguous word; an occurrence past the count; cue cycles; a cue outside the film; base scenes with a gap, an undeclared overlap, or three overlapping; overlays sharing a track while overlapping; a scene past the film end; a composition file whose `data-composition-id` differs from the scene id; a missing composition (warning with `--allow-missing`); an event outside its scene. 25 fixture cases were run (section 12).

Scenes: `layer: "base"` scenes must tile `[0, END]`; an overlap is allowed only when the incoming scene declares `"crossfade": true`, and the overlap length is exported as `SCENES[id].xfadeIn` / `xfadeOut` (`FL.sceneFade` uses it). `layer: "overlay"` scenes (frame furniture, the paper callout, evidence) sit on top anywhere inside the film. Scene boundaries are snapped to the frame grid and written a hair below the exact frame time, so frame N belongs to the scene that starts at frame N. Stacking order: base scenes by start time (z 10, 11, ...), overlays above (z 100+), or an explicit `"z"`.

In a scene:

```js
var clk = FL.clock("a1-world");
clk.t("offline");                 // scene-local seconds of cue "offline"
clk.t("L07:offline.start", 0.2);  // any anchor, plus an offset
clk.ev("heads-off");              // scene-local time of a declared sound event
FL.lineWords("a1-world", "L06");  // [{ w, t, end }] in scene-local seconds
window.FL_T("a1-world", "cue:landing-0.4"); // the same resolver, without FL
```

Sound events (single source for picture and sound): `compositions/<scene>.events.json`

```json
{ "events": [
  { "name": "roof-edge", "at": "local:0.40", "kind": "set-square", "gain_db": -10, "dur": 0.5 },
  { "name": "ticks", "at": "L06:safeguard.start", "kind": "tick", "series": { "count": 5, "every": 0.18 } }
] }
```

`kind` must be one of the shared vocabulary in `docs/sound-events.md`. `series` expands to `ticks-01` .. `ticks-05`. Resolved events land in `cues/resolved.json` (`events`, a flat list sorted by absolute time with scene, name, t, local and your fields) for the audio engine, and in `window.FL_EVENTS` so the scene animates on exactly the same times (`clk.ev("ticks-03")`).

## 6. Camera

Frame the site by tweening the SVG `viewBox` with `FL.camera`. The `flCamera` plugin writes the viewBox and `--sw` (world units per screen px) on every render, so hairlines drawn with `calc(var(--sw) * 1px)` stay 1 px at any zoom (**verified** at 6x the overview scale: crisp, 1 px lines, dashes intact).

Compared at 6x zoom, 180 frames, 1 worker (**verified**): viewBox 106 ms/frame; transform on a `<g>` 106 ms/frame (same crispness, but lines thicken 6x because `--sw` is non-linear in the scale); CSS `scale` on the HTML wrapper 169 ms/frame (60 % slower, lines thicken, and the screen-space wobble scales with it). Use the viewBox.

```js
var cam = FL.camera([roughSvg, preciseSvg], { rects: { overview: "...", roof03: "..." }, layer: "story" });
cam.apply("overview");                        // build-time first frame
cam.set(story, "overview", 0);                // timeline start
cam.to(story, "roof03", T("roof03"), 2.2);    // chained from the previous end
cam.drift(story, null, T("roof03", 2.2), 4);  // 1.2 % slow push, from the previous end
```

Several SVGs can share one camera (rough and precise twins stay registered). Camera layers: each flCamera tween stores its rect under a layer name on the `<svg>`, and the viewBox is the composite. One timeline owns one layer. The rewind scene moves layer `"story"` from the story; after the landing the registered timeline moves layer `"main"` and hands over with `cam.mix(tl, "story", "main", T("rewindEnd"), 0)` (a cut; make both layers show the same rect at that instant, or give it a duration for a blend). `FL.worldToScreen(p, rect)` places HTML overlays on world points for a given rect.

## 7. Drawing: draw-on, rough to precise, tremor

- `FL.drawOn(tl, els, { at, duration, stagger, ease })` uses DrawSVG (fallback: dashoffset). `FL.sortByDistance(els, FL.iso(67, 22, 12))` radiates a draw from Roof 03.
- Rough twin: `var twin = FL.roughen(precisePaths, group, { seed, amount: 0.16, overdraw: 0.22, overClass })` makes jittered copies with the same command structure (arc radii and flags kept), each carrying `el.__precise`. The resolve is a plain attribute tween: `FL.morphD(tl, el, el.getAttribute("d"), el.__precise, at, 1.4, "expo.out")` (**verified** over 218 paths, no MorphSVG needed).
- Tremor: `FL.wobbleFilter(defs, id, { seed, baseFrequency: 0.018, octaves: 2, scale: 2 })` and `filter: url(#id)` on the HTML wrapper of the rough SVG (screen space). Resolve with `FL.wobbleScale(tl, filter, 2, 0, at, 1.2)`, then `tl.set(wrapper, { filter: "none" }, afterEnd)` so the inert filter stops costing. The fixed seed gives a static hand tremor; a "boiling" line would need a stepped seed, not used here.

## 8. The rewind: a scrubbed story timeline

Build everything that happens on the site as one paused, unregistered timeline, then let the registered timeline drive its time. Forward play is a linear scrub, so story time equals film time until the rewind starts; the rewind scrubs backwards with a custom ease and lands on the story time of cue `landing`.

```js
var RS = T("rewindStart"), RE = T("rewindEnd"), LAND = T("landing");
var story = FL.story();                          // gsap.timeline({ paused: true }), not registered
// ... every Act I tween goes on `story`, at scene-local times (T(...)) ...
var tl = gsap.timeline({ paused: true });
FL.scrub(tl, story, { at: 0,  from: 0,  to: RS,   duration: RS,      ease: "none" });
FL.scrub(tl, story, { at: RS, from: RS, to: LAND, duration: RE - RS, ease: FL.rewindEase() });
// after RE: the registered timeline owns new wrappers and camera layer "main"
window.__timelines["a1-world"] = tl;
```

`FL.rewindEase()` is a CustomEase: 0, .008, .044, .134, .294, .51, .737, .916, .979, .997, 1 at tenths (slow catch, fast middle, very hard stop, no overshoot, so story time never passes the landing). Everything inside the story reverses by construction: draws un-draw, heads re-ink, the clock runs back (`FL.textTo` inside the story), the camera returns.

Seek safety (**verified**, all at 1920x1080):

- DOM state after seeking the rewind at 10 film times, visited out of order with jumps to 0, 5, 12, 30, 70 and 88 in between, equals the state after seeking forward to the same story time: every viewBox, `--sw`, dash array and offset of 218 paths, head opacities, clock text. 0 mismatches.
- Pixels: 6 rewind frames versus the forward frames at the same fractional story time: max difference 0 outside the film-time readout.
- Snapshots of 7 times taken in two different orders in separate runs: pixel-identical (max difference 0).
- The same 3 times in Studio preview and in `snapshot`: pixel-identical.

Note that `snapshot --at` and the Studio player quantise to the frame grid (floor), so a pixel test of "same story time" needs exact timeline seeks, as above.

## 9. Text and fonts

- `assets/fonts/ibm-plex-sans-{300,400,500,600}.woff2` and `ibm-plex-mono-{400,500,600}.woff2` are byte-exact extracts of the demo's embedded fonts (Latin subset, 232 glyphs; no italics exist).
- The subset lacks arrows, check marks and sub/superscripts, so each weight has `-symbols.woff2` (from the official @ibm/plex-sans 1.1.0 and @ibm/plex-mono 2.5.0, SIL OFL, `assets/fonts/ofl-license.txt`) bound by `unicode-range`. `RECORD → TRUST` renders in Plex (**verified**).
- Site clock and counters: `FL.textTo(tl, el, { from, to, format: FL.hhmm, at, duration })`, `FL.textSet(tl, el, "text", at)`.
- Statements: `fl-display` (Plex Sans Light 96 px, -0.02em). Labels: `fl-label` (Plex Mono 500, 18 px, uppercase, 0.12em).

## 10. Audio: stems in the render, and the delivery path

Measured with test tones and noise, 5 s, three stems at `data-volume` 1 (**verified**):

- The render's audio is the linear sum of the stems: overall -0.10 dB, per stem voice -0.02 dB, music -0.05 dB, sfx -0.42 dB (AAC loss on pink noise), sample-aligned (lag 0). In the full prototype render the voice stem came back at -0.01 dB, lag 0.
- The mixer is ffmpeg `amix` (normalised) followed by `volume = N`, no limiter. With three stems peaking at -3 dBFS (sum far above 0 dBFS) the output was not a clean sum (projection gain 0.61 instead of 2.5, peak -1.6 dBFS): hot sums are not safe.
- `data-volume` is linear gain.
- Output: AAC-LC, 48 kHz, stereo, `-b:a 192k` (measured 150 to 192 kbps), native ffmpeg AAC encoder, fixed by the renderer.

Recommended delivery path (better than trusting the render mix):

1. Keep the three stems in `index.html` for review and Studio, at `data-volume` 1, with the audio engine guaranteeing their sum stays below -1 dBTP.
2. The audio engine produces the mastered `master.wav` (limiter, loudness target) from the same stems.
3. Final MP4: render once at high quality, then replace the audio with the master:
   `ffmpeg -i film-video.mp4 -i master.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart priora-film.mp4`
4. WebM from the same master (section 11).

## 11. Measured render costs and budgets

Heavy Act I test scene: precise site (about 170 shapes) plus 218 rough paths (main and overdraw) and 300 hatch strokes, all drawing on, camera zooming, 6 s = 180 frames at 1920x1080, 30 fps. Renderer line on this machine: `beginframe capture · software gpu` (llvmpipe; no hardware GPU; BeginFrame path, the fast one available here).

| Configuration | Capture time | Per frame |
| --- | --- | --- |
| 1 worker, no filter | 15.9 s | 88 ms |
| 1 worker, screen-space wobble filter on the wrapper | 18.8 s | 104 ms (+16 ms, +18 %) |
| 1 worker, the same filter on each of 520 paths | 39.6 s | 220 ms (2.5x) |
| 2 workers (auto), draft, filter | 11.8 s | 66 ms |
| 2 workers (auto), draft, no filter | 10.0 s | 56 ms |
| 3 workers, draft, filter | 11.8 s | 66 ms |
| 4 workers, draft, filter | 11.2 s | 62 ms |
| 2 workers, `--quality looks` (CRF 16, High) | 16.8 s | 93 ms |
| 2 workers, `--quality delivery` (High) | 22.6 s | 126 ms |
| Full 90 s prototype, draft, auto (resolved to 1 worker: calibration p95 118 ms) | 170.8 s capture, 3 min 1 s total | 63 ms |

Workers: `auto` calibrates per render. It picked 2 for the heavy 6 s test (calibration p95 156 ms) but only 1 for the full prototype (p95 118 ms; `worker_resolution` in the render log). On the heavy test 2 workers took 37 % less time per frame than 1 (66 against 104 ms); 3 or 4 gain at most 6 % more because capture and x264 compete for the same cores. For full-film renders pass `--workers 2` explicitly and check the log line `worker_resolution ... workerCount`. Projected full film with scenes as heavy as the test at 2 workers: draft about 3 min, looks about 4.5 min, delivery about 6 min; at 1 worker expect about 1.5x that.

Budgets per scene (keep a whole-film delivery render under 10 minutes):

- At most one screen-space filtered layer on screen at a time (about 16 ms per frame per worker at full frame). Never per path. Remove the filter once its scale reaches 0.
- About 1000 simultaneously visible stroked paths in camera-framed SVGs, 2 full-frame SVG layers at once (rough and precise twins during a resolve).
- No blur filters or `backdrop-filter` over full frame; no `mix-blend-mode` on large layers (not measured; they force the same kind of full-frame pass as the filter).

Output formats (**verified**):

- MP4 `draft`: H.264 Constrained Baseline (about 2 Mbps on the mostly static prototype, visibly smears grain; review only). `looks` (default): H.264 High, CRF 16. `delivery`: H.264 High, a little higher bitrate. All yuv420p, 30/1.
- `--format webm`: VP9 with an alpha plane (`ALPHA_MODE=1`) and Opus audio, through the slower screenshot capture path (5 s took 16 s against 8.5 s for MP4). For the website, derive WebM from a high-quality MP4 instead:
  `ffmpeg -i priora-film-hq.mp4 -i master.wav -map 0:v -map 1:a -c:v libvpx-vp9 -b:v 0 -crf 30 -row-mt 1 -pix_fmt yuv420p -c:a libopus -b:a 160k priora-film.webm` (two-pass optional). libvpx-vp9, libopus, libx264, libsvtav1 and prores are available in this ffmpeg.
- A mezzanine: `render --quality delivery --crf 10` (or `--format mov`, ProRes 4444) gives a near-lossless master to encode both web files from.

## 12. Evidence

| Question | Result | How |
| --- | --- | --- |
| Sub-comp scripts see head globals (gsap, plugins, FL, CUES, window.X) | yes, in check, snapshot, render, Studio preview and Studio's isolated sub-composition view (it reuses the index head) | text readout in a scratch scene; `/api/projects/<id>/preview/comp/compositions/zz-proto.html` loads with zero errors |
| Build-time inlining needed as a fallback | no: no path renders a templated scene without the index head (`render -c` refuses templates) | CLI help, route code, tests above |
| `<link rel=stylesheet>` in a template | hoisted to the page head, de-duplicated, applied; its relative `url()` fonts resolve | scratch scene rendered blue Plex Mono 600 from a link only it had |
| `<script src>` in a template | re-executes (second gsap instance) | `window.gsap` identity check |
| What survives from a template | its root's children, plus every style, script and link; siblings of the root are dropped; styles are scoped to the scene | assembler source (compositionAssembly, inlineSubCompositions) |
| Preview vs snapshot vs render | preview and snapshot pixel-identical; render equals snapshot up to H.264 (PSNR 36.5 to 39.8 dB at draft) | Playwright screenshots, snapshot PNGs, frames from the MP4 |
| Rewind seek safety | exact, any order | section 8 |
| Fonts | IBM Plex only, no fallback | CDP `CSS.getPlatformFontsForNode` |
| 6x zoom crispness | crisp, 1 px hairlines via `--sw` | full-resolution crops |
| Audio sum | linear within 0.1 dB, aligned | section 10 |
| Compiler failures | 25 fixture cases behave as specified | scratch `cuetests/run.py` |

## 13. Re-lock after the ElevenLabs narration

1. `scripts/align-uploaded.py` and `scripts/assemble-narration.py` write `narration/timing.json` and `assets/audio/voice.wav`.
2. `node scripts/build-cues.mjs`. Any word anchor that no longer exists (for example a line reworded) fails loudly with the line's actual words listed; fix the cue sheet, not the scenes.
3. `npx --yes hyperframes@0.8.92 check`, snapshots at the key cues, then render.
4. `node scripts/build-cues.mjs --verify-fresh` before every final render.

## Appendix A: paper grain generator

`assets/textures/paper-grain.png` is a seamless 512x512 RGBA tile (graphite #3B3A33, texture in alpha, mean 2.2 %, max 9.8 %), reproducible bit for bit (md5 411a012b662fa6695c54df78686e8729) with numpy only:

```python
# python3 make-paper-grain.py assets/textures/paper-grain.png
import numpy as np, zlib, struct, sys
N = 512
rng = np.random.default_rng(20260929)
fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.fftfreq(N)[None, :]
f = np.sqrt(fx**2 + fy**2)
def band(lo, hi, power=0.0):
    F = np.fft.fft2(rng.standard_normal((N, N)))
    mask = ((f >= lo) & (f <= hi)) * np.maximum(f, 1e-6) ** (-power)
    o = np.real(np.fft.ifft2(F * mask)); return (o - o.mean()) / o.std()
tooth, mottle, cloud = band(0.18, 0.5), band(0.02, 0.12, 0.6), band(0.004, 0.02, 1.0)
F = np.fft.fft2(rng.standard_normal((N, N)))
fib = np.real(np.fft.ifft2(F * np.exp(-(fx / 0.01) ** 2 - (fy / 0.12) ** 2))); fib = (fib - fib.mean()) / fib.std()
v = 0.55 * tooth + 0.30 * mottle + 0.25 * cloud + 0.12 * fib; v = (v - v.mean()) / v.std()
alpha = np.clip(0.022 + 0.011 * v, 0, 0.08)
fl = rng.random((N, N)) < 0.00035; alpha[fl] = np.clip(alpha[fl] + 0.05, 0, 0.10)
rgba = np.zeros((N, N, 4), np.uint8); rgba[..., 0], rgba[..., 1], rgba[..., 2] = 0x3B, 0x3A, 0x33
rgba[..., 3] = np.round(alpha * 255).astype(np.uint8)
def png(path, a):
    h, w, _ = a.shape
    raw = b"".join(b"\x00" + a[y].tobytes() for y in range(h))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
png(sys.argv[1] if len(sys.argv) > 1 else "paper-grain.png", rgba)
```
