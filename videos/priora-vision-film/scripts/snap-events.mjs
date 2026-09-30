#!/usr/bin/env node
/*
  snap-events.mjs: rewrite scene sound events that sit on the musical grid as
  { at: <base anchor>, snap: { mode, off } } so they stay on the grid when the narration
  re-locks (build-cues evaluates snap with the same rules as film-lib's FL.cutAbs/FL.snapBeat).

    node scripts/snap-events.mjs [--scene a1-world,...] [--dry]

  Reads cues/resolved.json (current event times) and assets/js/cues.js (anchor evaluation), so
  run node scripts/build-cues.mjs first. Converts only events that
    - have an offset on their anchor ("cue:x+0.326"), not a pure word anchor,
    - resolve to a half-beat grid point (within 1.5 ms),
  choosing the snap of the base anchor (cut, near, next, prev) with the smallest offset. Every
  converted event is checked to resolve to the same time as before. Word-synced sounds (pure
  anchors, or offsets that are off the grid) are left as they are.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const only = (() => {
  const i = args.indexOf("--scene");
  return i >= 0 ? new Set(args[i + 1].split(",")) : null;
})();

globalThis.window = globalThis;
require(path.join(ROOT, "assets/js/cues.js"));
const resolved = JSON.parse(fs.readFileSync(path.join(ROOT, "cues/resolved.json"), "utf8"));
const timing = JSON.parse(fs.readFileSync(path.join(ROOT, "narration/timing.json"), "utf8"));
const GRID = timing.grid || { bpm: 92, offset: 0 };
const BEAT = 60 / GRID.bpm,
  HB = BEAT / 2,
  O = GRID.offset || 0;
const snap = (abs, mode, sub) => {
  if (mode === "cut") return snap(abs - 0.12, "near", 2);
  const q = BEAT / (sub || 2),
    k = (abs - O) / q;
  const kk = mode === "prev" ? Math.floor(k + 1e-6) : mode === "near" ? Math.round(k) : Math.ceil(k - 1e-6);
  return O + kk * q;
};
const onGrid = (t) => Math.abs(t - snap(t, "near", 2)) < 0.0015;
const byName = {};
for (const e of resolved.events) byName[`${e.scene}/${e.name}`] = e.t;

let total = 0,
  converted = 0;
for (const [id, sc] of Object.entries(resolved.scenes)) {
  if (only && !only.has(id)) continue;
  const f = path.join(ROOT, sc.src.replace(/\.html$/, ".events.json"));
  if (!fs.existsSync(f)) continue;
  const doc = JSON.parse(fs.readFileSync(f, "utf8"));
  let n = 0;
  for (const ev of doc.events || []) {
    total++;
    if (ev.snap || typeof ev.at !== "string" || ev.at.startsWith("local:")) continue;
    const m = /^(.*?[^+\-\d.])((?:\s*[+-]\s*\d*\.?\d+)+)$/.exec(ev.at);
    if (!m) continue;
    const base = m[1].trim();
    const key = `${id}/${ev.series ? ev.name + "-01" : ev.name}`;
    const t = byName[key];
    if (t == null || !onGrid(t)) continue;
    let b;
    try {
      b = window.FL_T(id, base) + sc.start;
    } catch (e) {
      continue;
    }
    let best = null;
    for (const mode of ["cut", "near", "next", "prev"]) {
      const off = +(t - snap(b, mode, 2)).toFixed(4);
      if (!best || Math.abs(off) < Math.abs(best.off) - 1e-6) best = { mode, off };
    }
    const check = snap(b, best.mode, 2) + best.off;
    if (Math.abs(check - t) > 0.0015) continue;
    const steps = best.off / HB;
    if (Math.abs(steps - Math.round(steps)) > 0.01) continue;
    ev.at = base;
    ev.snap = best.off === 0 ? (best.mode === "cut" ? "cut" : { mode: best.mode }) : { mode: best.mode, off: best.off };
    n++;
  }
  converted += n;
  if (n && !dry) fs.writeFileSync(f, JSON.stringify(doc, null, 2) + "\n");
  console.log(`${id}: ${n} event(s) snapped to the grid${dry ? " (dry run)" : ""}`);
}
console.log(`snap-events: ${converted} of ${total} events now carry a grid snap`);
