# Sound events: the shared vocabulary

Scenes declare the sounds their pictures make in `compositions/<scene-id>.events.json` (schema in `scripts/build-cues.mjs`: `{ "events": [ { "name", "at", "kind", "gain_db", "dur", "series": { "count", "every" } } ] }`). `at` is a cue anchor (`cue:offline`, `L07:offline.start+0.1`) or scene-local seconds (`local:1.25`). `scripts/build-cues.mjs` resolves them into `cues/resolved.json`, which the audio engine reads. Use only these kinds, so the engine can place every one.

Act I (graphite, no product sounds):

| kind | use |
| --- | --- |
| `pencil` | one graphite stroke of a building edge or prop (dur = stroke time) |
| `pencil-scatter` | a burst of many short strokes (use series) |
| `pen` | technical pen line, ink detail, handwriting of a label |
| `ruler` | a long straight rule drawn against a straight edge |
| `set-square` | the first stroke, a hard edge contact |
| `hatch` | hatching a shaded face (dur) |
| `tick` | a pencil tick on a checklist or safeguard |
| `stamp` | an approval stamp |
| `paper-slide` | a sheet or callout arriving |
| `paper-lift` | a sheet leaving |
| `pin` | an evidence fragment pinned to the board |
| `footsteps` | contractors walking (dur) |
| `van` | the contractors' van arriving (dur) |
| `radio-click` | a site radio click |
| `valve-clunk` | a valve closing: muted, mechanical, not an alarm |
| `subtract-bed` | remove part of the ambience bed (dur): the unnoticed change |
| `fray` | the condition connection parting, near silent |
| `incident` | the restrained incident annotation (low, no alarm) |
| `question` | a question setting on screen (very soft) |
| `gap-rule` | the gap timeline drawing across |
| `rewind` | the signature rewind (dur = cue:rewindEnd minus cue:rewindStart) |
| `latch-soft` | the rewind landing |

Acts II and III (precise, product):

| kind | use |
| --- | --- |
| `precision-snap` | graphite resolving into precise geometry (dur) |
| `header-in` | the product header assembling |
| `capture-start` | the voice capture strip opening |
| `word-token` | a transcript token recognised and underlined (series) |
| `connect-line` | a live connection line drawing (dur) |
| `verify-tick` | a check row resolving to VERIFIED (series, five, subtly different) |
| `record-append` | a trusted record entry appending |
| `system-event` | a system event entering the record (sprinkler offline) |
| `row-unavailable` | a check flipping to UNAVAILABLE |
| `node-stretch` | the hot-work node stretching toward the envelope (dur) |
| `node-cross` | the node crossing and snapping outside |
| `sheet-in` | the decision sheet arriving |
| `choice-accent` | a choice highlighting (series of three, distinct) |
| `node-return` | the node returning inside after the change |
| `packet-send` | the trusted observed state packet travelling |
| `carrier-response` | a carrier answer arriving |
| `layer-slice` | the temporary layer drawing alongside the programme |
| `node-pass` | an ordinary node passing quietly (series; sparse) |
| `decision-accent` | a node becoming an explicit decision |
| `chain-confirm-1` to `chain-confirm-5` | the five chain words, each materially distinct |
| `latch` | the clean mechanical latch under the Priora mark |

Cut 2 editorial accents (any act; the audio engine renders them on the 92 BPM grid feel, restrained, never a cinematic whoosh):

| kind | use |
| --- | --- |
| `cut` | a hard picture cut: a very short, soft transient (paper or felt), felt more than heard. Optional `material`: `paper`, `felt`, `graphite`, `wood` |
| `push` | a fast push-in or punch-in to a closer shot (dur = the move): a short rising air texture ending in a soft low bloom |
| `pull` | a pull-back reveal to a wider shot (dur = the move): a soft descending air with a gentle low swell |
| `whip` | a snappy lateral camera move of half a second or less (dur): brief, filtered, very quiet air |
| `sheet-lay` | a paper sheet laid flat over the drawing: slide plus a soft settle |
| `focus` | an interface element isolated to a hero shot: a tiny precise click |
| `hold` | a held major moment (dur): the engine thins the score and beds for the duration so silence gives it weight |
| `arc` | the welding arc: a very quiet dry crackle (dur); never an alarm, never a flame roar |
| `handwheel` | a valve handwheel turning (dur): metal ratchet-free friction, low |
| `gauge` | a pressure-gauge needle falling or rising: a small sprung-metal tick |

Optional fields on the cut 2 kinds (the engine reads them):

- `cut`: `material` (`paper`, `felt`, `graphite`, `wood`); default paper in Act I, felt after the rewind.
- `whip`: `direction` (+1 left to right, -1 right to left). `gauge`: `direction` (-1 falling, +1 rising).
- `hold`: `gain_db` is the dip (negative, default -8 dB; above -6 dB the pulse keeps going, only quieter); `dur` defaults to one bar.
- Where the audible moment sits: the `push` bloom, the `sheet-lay` settle and the `gauge` tick land at the end of `dur`; put `at` at the start of the gesture.
- Grid: events land exactly where `at` says. Anchor them with the same beat-snapped times the picture uses (an event generator per scene, as in scripts/event-gen/, keeps them on the grid after a narration re-lock).
