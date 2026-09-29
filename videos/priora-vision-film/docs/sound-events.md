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
