#!/usr/bin/env node
/*
  build-cues.mjs: the cue compiler for the Priora vision film.

  Reads
    narration/timing.json      absolute word timings (schema: duration_total, lead_in, end_hold,
                               lines: { L01: { start, end, speaker, text, words: [{ w, start, end }] } })
    cues/cuesheet.json         cue, scene, audio and inline-asset definitions (schema below)
    compositions/<id>.events.json   optional per-scene sound events (schema below)

  Writes
    assets/js/cues.js          window.FILM, CUES, SCENES, NARRATION, FL_EVENTS, FL_T (scene-local time)
    assets/js/film-assets.js   window.FL_ASSETS { KEY: "<svg ...>" } (only when the cuesheet has "inline")
    cues/resolved.json         the same data for the audio engine (plus a flat, time-sorted event list)
    index.html                 regenerated between build-cues marker comments only:
                                 <!-- build-cues:root:begin --> ... <!-- build-cues:root:end -->
                                 <!-- build-cues:slots:begin --> ... <!-- build-cues:slots:end -->
                                 <!-- build-cues:audio:begin --> ... <!-- build-cues:audio:end -->
                               Everything outside the markers is hand-authored and preserved.

  Usage (from the project root)
    node scripts/build-cues.mjs                         build with cues/cuesheet.json
    node scripts/build-cues.mjs --cuesheet cues/cuesheet.proto.json
    node scripts/build-cues.mjs --timing /path/timing.json --check    validate only, write nothing
    node scripts/build-cues.mjs --init-index            write a fresh index.html template, then build
    node scripts/build-cues.mjs --allow-missing         missing composition files become warnings
    node scripts/build-cues.mjs --out-dir DIR           write every output under DIR (tests)
    node scripts/build-cues.mjs --quiet
    node scripts/build-cues.mjs --verify-fresh          exit 1 if any generated output (cues.js, resolved.json,
                                                        film-assets.js, index.html) differs from what this
                                                        build would write now (pre-render gate; pass the same
                                                        --cuesheet the outputs were built with)

  Exit code 1 (and nothing written) on any error: unresolved or ambiguous anchor, cue cycle,
  base scenes that leave a gap, overlap that is not a declared crossfade, scene outside the film,
  composition id mismatch, missing composition file, event outside its scene.

  Anchor grammar (strings; a bare number is absolute seconds)
    12.5                         absolute film seconds
    START | END                  0 and the film duration (film.duration or timing.duration_total)
    L07.start | L07.end          a narration line
    L07:offline.start            a word (case and punctuation ignored: "I'm" matches "im")
    L10:What#2.start             the 2nd occurrence of the word in that line (1-based); a word that
                                 occurs more than once MUST carry #n
    cue:rewindStart              another cue (names: letters, digits, underscore; no hyphen)
    scene:a1-world.end           a resolved scene boundary
    local:1.25                   events only: seconds from the start of the event's scene
    ...+0.4 / ...-0.3            any number of offsets after the base: "L11.end+0.6-0.1"

  Cuesheet schema (cues/cuesheet.json; see cues/cuesheet.example.json)
    {
      "schema": "priora-cuesheet/1",
      "fps": 30,
      "film": { "duration": "END" | number | anchor, "compositionId": "film" },
      "cues": { "name": "anchor" | { "at": "anchor", "note": "why" } },
      "scenes": [
        { "id": "a1-world", "src": "compositions/a1-world.html", "track": 1,
          "start": "anchor", "end": "anchor" (or "duration": seconds),
          "layer": "base" | "overlay",        base scenes must tile [0, END] (default base)
          "crossfade": true,                 incoming base scene may overlap the previous one
          "z": 10, "note": "..." }
      ],
      "audio": [ { "id": "voice", "src": "assets/audio/voice.wav", "track": 20, "volume": 1,
                   "start": "anchor" (default 0), "optional": true } ],
      "inline": { "SITE_PRECISE": "assets/site/site-precise.svg" }
    }

  Events sidecar (compositions/<scene-id>.events.json), resolved to absolute seconds
    { "events": [ { "name": "roof-edge-1", "at": "local:0.40", "kind": "pencil", "gain_db": -8,
                    "dur": 0.6, "series": { "count": 5, "every": 0.12 } } ] }
    series expands to name-01 .. name-NN at at + i * every.
    "snap" (optional) puts the event on the musical grid after the anchor is evaluated, so it
    stays on the grid when the narration re-locks (the picture uses the same rules in film-lib):
      "snap": "cut"                          FL.cutAbs: the half beat nearest to (t - 0.12)
      "snap": { "mode": "next"|"prev"|"near"|"cut", "sub": 2, "off": 0.652 }
    sub = grid points per beat (default 2, half beats); off = seconds added after snapping
    (keep it a multiple of the grid step to stay on the grid). The grid is narration/timing.json
    "grid" (bpm, offset), else 92 BPM from 0.
*/
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ------------------------------------------------------------------ args
const argv = process.argv.slice(2);
const opt = { cuesheet: "cues/cuesheet.json", timing: "narration/timing.json", index: "index.html", outDir: null, check: false, initIndex: false, allowMissing: false, quiet: false };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const next = () => {
    if (i + 1 >= argv.length) fail(`missing value after ${a}`);
    return argv[++i];
  };
  if (a === "--cuesheet") opt.cuesheet = next();
  else if (a === "--timing") opt.timing = next();
  else if (a === "--index") opt.index = next();
  else if (a === "--out-dir") opt.outDir = next();
  else if (a === "--check") opt.check = true;
  else if (a === "--init-index") opt.initIndex = true;
  else if (a === "--allow-missing") opt.allowMissing = true;
  else if (a === "--quiet") opt.quiet = true;
  else if (a === "--verify-fresh") opt.verifyFresh = true;
  else if (a === "-h" || a === "--help") {
    const src = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
    console.log(src.slice(src.indexOf("/*") + 2, src.indexOf("*/")));
    process.exit(0);
  } else fail(`unknown argument ${a}`);
}

const errors = [];
const warnings = [];
function fail(msg) {
  console.error(`build-cues: ERROR ${msg}`);
  process.exit(1);
}
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
const log = (...m) => {
  if (!opt.quiet) console.log(...m);
};
const abs = (p) => (path.isAbsolute(p) ? p : path.join(ROOT, p));
const outPath = (p) => (opt.outDir ? path.join(path.resolve(opt.outDir), p) : path.join(ROOT, p));
const readJson = (p, what) => {
  const f = abs(p);
  if (!fs.existsSync(f)) fail(`${what} not found: ${p}`);
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch (e) {
    fail(`${what} is not valid JSON (${p}): ${e.message}`);
  }
};
const r3 = (v) => Math.round(v * 1000) / 1000;

// ------------------------------------------------------------------ anchor grammar (shared with the browser)
// These two functions are serialised verbatim into assets/js/cues.js, so they must stay
// self-contained (no closures, no node APIs).
function flNormWord(s) {
  return String(s)
    .toLowerCase()
    .replace(/[‘’']/g, "")
    .replace(/[^a-z0-9]/g, "");
}
function flParseAnchor(input) {
  if (typeof input === "number") {
    if (!isFinite(input)) throw new Error("anchor is not a finite number");
    return { kind: "abs", value: input, offset: 0, text: String(input) };
  }
  if (typeof input !== "string") throw new Error("anchor must be a string or number, got " + typeof input);
  var s = input.trim();
  var NUM = "(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
  var re = new RegExp(
    "^(?:" +
      "(" + NUM + ")" + // 1 absolute
      "|(START|END)" + // 2
      "|(L\\w+)\\.(start|end)" + // 3,4 line
      "|(L\\w+):([^#\\s+]+?)(?:#(\\d+))?\\.(start|end)" + // 5,6,7,8 word
      "|cue:([A-Za-z_][A-Za-z0-9_]*)" + // 9 cue
      "|scene:([a-z0-9][a-z0-9-]*)\\.(start|end)" + // 10,11 scene
      "|local:(-?" + NUM + ")" + // 12 local (events)
      ")((?:\\s*[+-]\\s*" + NUM + ")*)\\s*$",
  );
  var m = re.exec(s);
  if (!m) throw new Error("cannot parse anchor '" + input + "'");
  var offset = 0;
  (m[13] || "").replace(/([+-])\s*(\d+(?:\.\d*)?|\.\d+)/g, function (_, sign, n) {
    offset += (sign === "-" ? -1 : 1) * parseFloat(n);
    return _;
  });
  var a;
  if (m[1] != null) a = { kind: "abs", value: parseFloat(m[1]) };
  else if (m[2]) a = { kind: m[2] === "END" ? "end" : "abs", value: 0 };
  else if (m[3]) a = { kind: "line", line: m[3], edge: m[4] };
  else if (m[5]) a = { kind: "word", line: m[5], word: m[6], occ: m[7] ? parseInt(m[7], 10) : 0, edge: m[8] };
  else if (m[9]) a = { kind: "cue", cue: m[9] };
  else if (m[10]) a = { kind: "scene", scene: m[10], edge: m[11] };
  else a = { kind: "local", value: parseFloat(m[12]) };
  a.offset = offset;
  a.text = s;
  return a;
}
// env: { lines, end, cue(name) -> seconds, scene(id, edge) -> seconds, local(value) -> seconds }
function flEvalAnchor(a, env) {
  var base;
  if (a.kind === "abs") base = a.value;
  else if (a.kind === "end") base = env.end;
  else if (a.kind === "line" || a.kind === "word") {
    var L = env.lines[a.line];
    if (!L) throw new Error("unknown narration line " + a.line + " in '" + a.text + "'");
    if (a.kind === "line") base = L[a.edge];
    else {
      var want = flNormWord(a.word);
      var hits = [];
      for (var i = 0; i < L.words.length; i++) if (flNormWord(L.words[i].w) === want) hits.push(L.words[i]);
      if (!hits.length) throw new Error("word '" + a.word + "' not found in " + a.line + " ('" + a.text + "'). Words: " + L.words.map(function (w) { return w.w; }).join(" "));
      if (a.occ) {
        if (a.occ > hits.length) throw new Error("word '" + a.word + "' occurs " + hits.length + " time(s) in " + a.line + ", #" + a.occ + " requested ('" + a.text + "')");
        base = hits[a.occ - 1][a.edge];
      } else {
        if (hits.length > 1) throw new Error("word '" + a.word + "' is ambiguous in " + a.line + " (" + hits.length + " occurrences); write " + a.line + ":" + a.word + "#1." + a.edge + " .. #" + hits.length + " ('" + a.text + "')");
        base = hits[0][a.edge];
      }
    }
  } else if (a.kind === "cue") base = env.cue(a.cue);
  else if (a.kind === "scene") base = env.scene(a.scene, a.edge);
  else if (a.kind === "local") {
    if (!env.local) throw new Error("local: anchors are only valid in events ('" + a.text + "')");
    base = env.local(a.value);
  } else throw new Error("bad anchor kind " + a.kind);
  if (typeof base !== "number" || !isFinite(base)) throw new Error("anchor '" + a.text + "' did not resolve to a number");
  return base + a.offset;
}

// ------------------------------------------------------------------ inputs
const sheet = readJson(opt.cuesheet, "cuesheet");
const timing = readJson(opt.timing, "timing");
if (!timing.lines || typeof timing.lines !== "object") fail("timing.json has no 'lines' object");
if (!(timing.duration_total > 0)) fail("timing.json has no positive duration_total");
const fps = sheet.fps || 30;
const compId = (sheet.film && sheet.film.compositionId) || "film";
const lines = {};
for (const [id, L] of Object.entries(timing.lines)) {
  if (!(L.end >= L.start) || !Array.isArray(L.words)) err(`timing line ${id} is malformed`);
  lines[id] = { start: L.start, end: L.end, speaker: L.speaker || "narrator", text: L.text || "", words: (L.words || []).map((w) => ({ w: w.w, start: w.start, end: w.end })) };
}

// film end
let END;
{
  const d = sheet.film && sheet.film.duration != null ? sheet.film.duration : "END";
  try {
    const a = flParseAnchor(d);
    END = a.kind === "end" ? timing.duration_total + a.offset : flEvalAnchor(a, { lines, end: timing.duration_total, cue: () => fail("film.duration cannot reference cues"), scene: () => fail("film.duration cannot reference scenes") });
  } catch (e) {
    fail(`film.duration: ${e.message}`);
  }
}
const frames = Math.ceil(END * fps - 1e-6);
END = frames / fps;
// Scene boundaries are snapped to the frame grid and written slightly below the exact frame
// time (truncated to 6 decimals) so frame N is inside the scene that starts at frame N.
const snapFrame = (t) => Math.round(t * fps);
const frameTime = (f) => Math.floor((f / fps) * 1e6) / 1e6;
const endText = Number.isInteger(END * 1000) ? String(r3(END)) : String(frameTime(frames));

// ------------------------------------------------------------------ cues (lazy, cycle-safe)
const cueDefs = sheet.cues || {};
const cueNotes = {};
for (const [name, def] of Object.entries(cueDefs)) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) err(`cue name '${name}' is invalid (letters, digits, underscore; no hyphens)`);
  if (def && typeof def === "object" && def.note) cueNotes[name] = def.note;
}
const cueVal = {};
const sceneVal = {};
const stack = [];
const scenesById = {};
for (const s of sheet.scenes || []) {
  if (!s.id || !/^[a-z0-9][a-z0-9-]*$/.test(s.id)) err(`scene id '${s.id}' must be kebab-case`);
  if (scenesById[s.id]) err(`duplicate scene id '${s.id}'`);
  scenesById[s.id] = s;
}
const env = {
  lines,
  end: END,
  cue(name) {
    if (name in cueVal) return cueVal[name];
    if (!(name in cueDefs)) throw new Error(`unknown cue '${name}'`);
    const key = `cue:${name}`;
    if (stack.includes(key)) throw new Error(`cue cycle: ${[...stack, key].join(" -> ")}`);
    stack.push(key);
    try {
      const def = cueDefs[name];
      const anchor = def && typeof def === "object" ? def.at : def;
      return (cueVal[name] = flEvalAnchor(flParseAnchor(anchor), env));
    } catch (e) {
      throw new Error(stack.length > 1 ? e.message : `cue '${name}': ${e.message}`);
    } finally {
      stack.pop();
    }
  },
  scene(id, edge) {
    const s = scenesById[id];
    if (!s) throw new Error(`unknown scene '${id}'`);
    const key = `scene:${id}.${edge}`;
    if (sceneVal[key] != null) return sceneVal[key];
    if (stack.includes(key)) throw new Error(`scene cycle: ${[...stack, key].join(" -> ")}`);
    stack.push(key);
    try {
      let v;
      if (edge === "start") v = flEvalAnchor(flParseAnchor(s.start), env);
      else if (s.end != null) v = flEvalAnchor(flParseAnchor(s.end), env);
      else if (s.duration != null) v = env.scene(id, "start") + Number(s.duration);
      else throw new Error(`scene '${id}' needs "end" or "duration"`);
      v = snapFrame(v) / fps;
      return (sceneVal[key] = v);
    } finally {
      stack.pop();
    }
  },
};
for (const name of Object.keys(cueDefs)) {
  try {
    env.cue(name);
  } catch (e) {
    err(e.message.startsWith("cue '") ? e.message : `cue '${name}': ${e.message}`);
  }
}
for (const [name, v] of Object.entries(cueVal)) {
  if (v < 0 || v > END + 1e-6) err(`cue '${name}' = ${r3(v)} s is outside the film [0, ${r3(END)}]`);
}

// ------------------------------------------------------------------ scenes
const scenes = [];
for (const s of sheet.scenes || []) {
  let start, end;
  try {
    start = env.scene(s.id, "start");
    end = env.scene(s.id, "end");
  } catch (e) {
    err(`scene '${s.id}': ${e.message}`);
    continue;
  }
  const layer = s.layer || "base";
  if (!["base", "overlay"].includes(layer)) err(`scene '${s.id}': layer must be base or overlay`);
  if (!(end > start)) err(`scene '${s.id}': end ${r3(end)} is not after start ${r3(start)}`);
  if (start < -1e-9) err(`scene '${s.id}' starts before 0 (${r3(start)})`);
  if (end > END + 1e-6) err(`scene '${s.id}' ends at ${r3(end)}, past the film end ${r3(END)}`);
  if (!s.src) err(`scene '${s.id}' has no src`);
  else {
    const f = abs(s.src);
    if (!fs.existsSync(f)) (opt.allowMissing ? warn : err)(`scene '${s.id}': composition file missing: ${s.src}`);
    else {
      const html = fs.readFileSync(f, "utf8");
      const ids = [...html.matchAll(/data-composition-id\s*=\s*"([^"]+)"/g)].map((m) => m[1]);
      if (!ids.includes(s.id)) err(`scene '${s.id}': ${s.src} declares data-composition-id ${ids.length ? ids.map((i) => `"${i}"`).join(", ") : "(none)"}, expected "${s.id}"`);
      if (!/window\.__timelines\s*\[\s*["']/.test(html) && !/window\.__timelines\.\w/.test(html)) warn(`scene '${s.id}': ${s.src} does not appear to register window.__timelines["${s.id}"]`);
      else if (!html.includes(`__timelines["${s.id}"]`) && !html.includes(`__timelines['${s.id}']`)) warn(`scene '${s.id}': timeline key in ${s.src} does not look like "${s.id}"`);
    }
  }
  scenes.push({ id: s.id, src: s.src, track: s.track ?? (layer === "base" ? 1 : 3), layer, crossfade: !!s.crossfade, z: s.z, note: s.note || "", start, end, duration: end - start, xfadeIn: 0, xfadeOut: 0 });
}

// Base scenes tile the film.
const base = scenes.filter((s) => s.layer === "base").sort((a, b) => a.start - b.start || a.end - b.end);
const eps = 0.5 / fps;
if (!base.length) err("no base scenes: the film must be covered by base-layer scenes");
else {
  if (base[0].start > eps) err(`gap at the start: first base scene '${base[0].id}' starts at ${r3(base[0].start)} s, not 0`);
  for (let i = 1; i < base.length; i++) {
    const a = base[i - 1],
      b = base[i];
    if (b.start > a.end + eps) err(`gap ${r3(a.end)} to ${r3(b.start)} s between base scenes '${a.id}' and '${b.id}'`);
    else if (b.start < a.end - eps) {
      if (!b.crossfade) err(`base scenes '${a.id}' and '${b.id}' overlap ${r3(b.start)} to ${r3(a.end)} s but '${b.id}' does not declare "crossfade": true`);
      else {
        const ov = a.end - b.start;
        b.xfadeIn = ov;
        a.xfadeOut = ov;
        if (b.end <= a.end) err(`base scene '${b.id}' lies entirely inside '${a.id}'; make it an overlay`);
      }
    } else if (b.crossfade) warn(`scene '${b.id}' declares crossfade but does not overlap '${a.id}'`);
    if (i >= 2 && b.start < base[i - 2].end - eps) err(`three base scenes overlap at ${r3(b.start)} s ('${base[i - 2].id}', '${a.id}', '${b.id}')`);
  }
  const last = base[base.length - 1];
  const coveredTo = Math.max(...base.map((s) => s.end));
  if (coveredTo < END - eps) err(`gap at the end: base scenes stop at ${r3(coveredTo)} s, film ends at ${r3(END)} s (last: '${last.id}')`);
}
// Overlays: inside the film; same-track overlays must not overlap unless declared.
const overlays = scenes.filter((s) => s.layer === "overlay").sort((a, b) => a.start - b.start);
for (let i = 0; i < overlays.length; i++)
  for (let j = i + 1; j < overlays.length; j++) {
    const a = overlays[i],
      b = overlays[j];
    if (a.track === b.track && b.start < a.end - eps && !b.crossfade) err(`overlay scenes '${a.id}' and '${b.id}' share track ${a.track} and overlap; move one to another track or declare crossfade`);
  }
// z-order: base in time order, overlays above (explicit z wins).
base.forEach((s, i) => (s.zIndex = s.z ?? 10 + i));
overlays.forEach((s, i) => (s.zIndex = s.z ?? 100 + i));

// ------------------------------------------------------------------ events
// The musical grid (cut 2): 92 BPM from 0 unless narration/timing.json says otherwise.
const GRID = timing.grid || { bpm: 92, offset: 0 };
const BEAT_S = 60 / (GRID.bpm || 92);
function gridSnap(abs, mode, sub) {
  if (mode === "cut") return gridSnap(abs - 0.12, "near", 2);
  const q = BEAT_S / (sub || 2),
    o = GRID.offset || 0,
    k = (abs - o) / q;
  const kk = mode === "prev" ? Math.floor(k + 1e-6) : mode === "near" ? Math.round(k) : Math.ceil(k - 1e-6);
  return o + kk * q;
}
const events = [];
const eventsByScene = {};
for (const s of scenes) {
  const f = abs(s.src ? s.src.replace(/\.html$/, ".events.json") : `compositions/${s.id}.events.json`);
  if (!fs.existsSync(f)) continue;
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(f, "utf8"));
  } catch (e) {
    err(`events for '${s.id}' are not valid JSON: ${e.message}`);
    continue;
  }
  const bag = (eventsByScene[s.id] = {});
  for (const ev of doc.events || []) {
    const envE = { ...env, local: (v) => s.start + v };
    let t0;
    try {
      t0 = flEvalAnchor(flParseAnchor(ev.at), envE);
    } catch (e) {
      err(`event '${s.id}/${ev.name}': ${e.message}`);
      continue;
    }
    if (ev.snap) {
      const sn = typeof ev.snap === "string" ? { mode: ev.snap } : ev.snap;
      if (!["cut", "next", "prev", "near"].includes(sn.mode)) {
        err(`event '${s.id}/${ev.name}': snap mode must be cut, next, prev or near`);
        continue;
      }
      t0 = gridSnap(t0, sn.mode, sn.sub) + (+sn.off || 0);
    }
    const count = ev.series ? ev.series.count : 1;
    const every = ev.series ? ev.series.every : 0;
    for (let k = 0; k < count; k++) {
      const name = ev.series ? `${ev.name}-${String(k + 1).padStart(2, "0")}` : ev.name;
      const t = t0 + k * every;
      if (t < s.start - 1e-6 || t > s.end + 1e-6) err(`event '${s.id}/${name}' at ${r3(t)} s is outside its scene [${r3(s.start)}, ${r3(s.end)}]`);
      if (bag[name]) err(`duplicate event name '${s.id}/${name}'`);
      const { series, at, ...meta } = ev;
      const rec = { ...meta, name, scene: s.id, t: r3(t), local: r3(t - s.start), at: String(ev.at) };
      bag[name] = rec;
      events.push(rec);
    }
  }
}
events.sort((a, b) => a.t - b.t || a.name.localeCompare(b.name));

// ------------------------------------------------------------------ audio
const audio = [];
const audioDefs = sheet.audio || [
  { id: "voice", src: "assets/audio/voice.wav", track: 20, volume: 1, optional: false },
  { id: "music", src: "assets/audio/music.wav", track: 21, volume: 1, optional: true },
  { id: "sfx", src: "assets/audio/sfx.wav", track: 22, volume: 1, optional: true },
];
const audioTracks = new Set();
for (const a of audioDefs) {
  if (!a.id || !a.src) {
    err(`audio entry needs id and src: ${JSON.stringify(a)}`);
    continue;
  }
  if (audioTracks.has(a.track)) err(`audio '${a.id}' reuses track ${a.track}`);
  audioTracks.add(a.track);
  let start = 0;
  try {
    start = a.start != null ? flEvalAnchor(flParseAnchor(a.start), env) : 0;
  } catch (e) {
    err(`audio '${a.id}': ${e.message}`);
  }
  const exists = fs.existsSync(abs(a.src));
  if (!exists) (a.optional ? warn : err)(`audio '${a.id}': file missing: ${a.src}${a.optional ? " (left out of index.html)" : ""}`);
  let media = null;
  if (exists) {
    try {
      media = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", abs(a.src)], { encoding: "utf8" }).trim());
    } catch (e) {
      warn(`audio '${a.id}': ffprobe failed (${e.message.split("\n")[0]}); using the film length`);
    }
  }
  const slot = END - start;
  if (media != null && Math.abs(media - slot) > 0.5 / fps) warn(`audio '${a.id}': ${a.src} is ${r3(media)} s but its slot from ${r3(start)} s to the film end is ${r3(slot)} s`);
  const duration = media != null ? Math.min(media, slot) : slot;
  audio.push({ id: a.id, src: a.src, track: a.track ?? 20, volume: a.volume ?? 1, start: r3(start), duration: Math.floor(duration * 1000) / 1000, media: media != null ? r3(media) : null, present: exists });
}

// ------------------------------------------------------------------ inline assets
const inline = {};
for (const [key, p] of Object.entries(sheet.inline || {})) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(key)) err(`inline key '${key}' must be UPPER_SNAKE`);
  const f = abs(p);
  if (!fs.existsSync(f)) {
    err(`inline asset '${key}' missing: ${p}`);
    continue;
  }
  let text = fs.readFileSync(f, "utf8");
  text = text.replace(/<\?xml[^>]*\?>\s*/g, "").replace(/<!DOCTYPE[^>]*>\s*/gi, "").trim();
  inline[key] = text;
}

// ------------------------------------------------------------------ report errors
for (const w of warnings) console.warn(`build-cues: warning ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`build-cues: ERROR ${e}`);
  console.error(`build-cues: ${errors.length} error(s); nothing written.`);
  process.exit(1);
}

// ------------------------------------------------------------------ outputs
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
const sheetText = fs.readFileSync(abs(opt.cuesheet), "utf8");
const timingText = fs.readFileSync(abs(opt.timing), "utf8");
const FILM = {
  compositionId: compId,
  fps,
  duration: END,
  frames,
  width: 1920,
  height: 1080,
  timing: { file: path.relative(ROOT, abs(opt.timing)), sha: sha(timingText), engine: timing.engine || null, guide: !!timing.guide, lead_in: timing.lead_in ?? null, end_hold: timing.end_hold ?? null, duration_total: timing.duration_total },
  cuesheet: { file: path.relative(ROOT, abs(opt.cuesheet)), sha: sha(sheetText) },
};
const CUES = Object.fromEntries(Object.keys(cueDefs).map((k) => [k, r3(cueVal[k])]));
// One frame-exact table used by cues.js, resolved.json and index.html.
for (const s of scenes) {
  s.startFrame = Math.round(s.start * fps);
  s.endFrame = Math.round(s.end * fps);
  s.startText = frameTime(s.startFrame);
  s.durationText = Math.floor(((s.endFrame - s.startFrame) / fps) * 1e6) / 1e6;
}
const SCENES = Object.fromEntries(
  scenes
    .slice()
    .sort((a, b) => a.start - b.start)
    .map((s) => [s.id, { start: s.startText, duration: s.durationText, end: frameTime(s.endFrame), startFrame: s.startFrame, endFrame: s.endFrame, track: s.track, layer: s.layer, zIndex: s.zIndex, src: s.src, xfadeIn: r3(s.xfadeIn), xfadeOut: r3(s.xfadeOut) }]),
);
const NARRATION = lines;
const FL_EVENTS = eventsByScene;

const runtime = `
${flNormWord.toString()}
${flParseAnchor.toString()}
${flEvalAnchor.toString()}
/* FL_T(sceneId, anchor, offset): scene-local seconds for a cue name, an absolute number, or any
   cue-sheet anchor ("L07:offline.start+0.2", "cue:rewindStart-1", "scene:a2-resolve.start").
   Throws on unknown scenes, cues or words, so a stale reference fails loudly in check. */
window.FL_T = function (sceneId, anchor, offset) {
  var sc = window.SCENES[sceneId];
  if (!sc) throw new Error("FL_T: unknown scene '" + sceneId + "'");
  var abs;
  if (typeof anchor === "number") abs = anchor;
  else if (typeof anchor === "string" && Object.prototype.hasOwnProperty.call(window.CUES, anchor)) abs = window.CUES[anchor];
  else {
    abs = flEvalAnchor(flParseAnchor(anchor), {
      lines: window.NARRATION,
      end: window.FILM.duration,
      cue: function (n) {
        if (!Object.prototype.hasOwnProperty.call(window.CUES, n)) throw new Error("FL_T: unknown cue '" + n + "'");
        return window.CUES[n];
      },
      scene: function (id, edge) {
        var s = window.SCENES[id];
        if (!s) throw new Error("FL_T: unknown scene '" + id + "'");
        return edge === "start" ? s.start : s.end;
      },
    });
  }
  return abs - sc.start + (offset || 0);
};`;

const stamp = `generated by scripts/build-cues.mjs from ${FILM.cuesheet.file} (${FILM.cuesheet.sha}) and ${FILM.timing.file} (${FILM.timing.sha}); do not edit`;
const cuesJs = `/* assets/js/cues.js: ${stamp}. */
(function () {
window.FILM = ${JSON.stringify(FILM, null, 1)};
window.CUES = ${JSON.stringify(CUES, null, 1)};
window.CUE_NOTES = ${JSON.stringify(cueNotes)};
window.SCENES = ${JSON.stringify(SCENES, null, 1)};
window.NARRATION = ${JSON.stringify(NARRATION)};
window.FL_EVENTS = ${JSON.stringify(FL_EVENTS, null, 1)};
${runtime}
})();
`;
const resolved = {
  schema: "priora-cues-resolved/1",
  note: stamp,
  film: FILM,
  cues: CUES,
  cue_notes: cueNotes,
  scenes: SCENES,
  lines: Object.fromEntries(Object.entries(lines).map(([k, L]) => [k, { start: L.start, end: L.end, speaker: L.speaker, text: L.text }])),
  events,
  audio: audio.map(({ present, ...a }) => ({ ...a, present })),
};
const assetsJs = Object.keys(inline).length ? `/* assets/js/film-assets.js: ${stamp}. */\nwindow.FL_ASSETS = ${JSON.stringify(inline)};\n` : null;

// index.html regions
const rootTag = `<div id="root" data-composition-id="${compId}" data-start="0" data-duration="${endText}" data-width="1920" data-height="1080" data-fps="${fps}">`;
const slotHtml = scenes
  .slice()
  .sort((a, b) => a.zIndex - b.zIndex)
  .map(
    (s) =>
      `      <div id="el-${s.id}" class="clip fl-slot" data-composition-id="${s.id}" data-composition-src="${s.src}" data-start="${s.startText}" data-duration="${s.durationText}" data-track-index="${s.track}" data-width="1920" data-height="1080" style="z-index: ${s.zIndex}"></div>`,
  )
  .join("\n");
const audioHtml = audio
  .map((a) =>
    a.present
      ? `      <audio id="stem-${a.id}" src="${a.src}" data-start="${a.start}" data-duration="${a.duration}" data-track-index="${a.track}" data-volume="${a.volume}"></audio>`
      : `      <!-- stem-${a.id}: ${a.src} not found at build time; rerun build-cues when it exists -->`,
  )
  .join("\n");

const INDEX_TEMPLATE = `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Priora vision film</title>
    <!-- Shared runtime: local vendored GSAP 3.15 and plugins, the film library, generated cues. -->
    <script src="assets/vendor/gsap/gsap.min.js"></script>
    <script src="assets/vendor/gsap/DrawSVGPlugin.min.js"></script>
    <script src="assets/vendor/gsap/CustomEase.min.js"></script>
    <script src="assets/vendor/gsap/MorphSVGPlugin.min.js"></script>
    <script src="assets/vendor/gsap/MotionPathPlugin.min.js"></script>
    <script src="assets/js/film-lib.js"></script>
    <script src="assets/js/cues.js"></script>
    <script src="assets/js/film-assets.js"></script>
    <!-- Shared kits: the site (graphite twin + precise), the interface, the Act I sketch world. -->
    <script src="assets/js/site-data.js"></script>
    <script src="assets/js/site-kit.js"></script>
    <script src="assets/js/ui-kit.js"></script>
    <script src="assets/js/sketch-kit.js"></script>
    <link rel="stylesheet" href="assets/css/film.css" />
    <style>
      #root {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: var(--paper);
      }
      /* Untimed full-bleed paper: warm ground, static grain, very faint vignette. */
      #film-paper {
        position: absolute;
        inset: 0;
        z-index: 0;
        background-color: var(--paper-ground); /* grain darkens it to an average of --paper */
        pointer-events: none;
      }
      #film-paper-grain {
        position: absolute;
        inset: 0;
        background-image: url("assets/textures/paper-grain.png");
        background-size: 512px 512px;
        background-repeat: repeat;
      }
      #film-paper-vignette {
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse 75% 70% at 50% 48%, rgba(59, 58, 51, 0) 58%, rgba(59, 58, 51, 0.035) 82%, rgba(59, 58, 51, 0.07) 100%);
      }
      /* Surface above every scene (cut 2): one printed paper tooth and a restrained light falloff,
         so graphite, ink and interface share the same sheet. Uniform, so paper-filled shapes still
         match the ground. Untimed and never read by the layout checks. */
      #film-surface {
        position: absolute;
        inset: 0;
        z-index: 900;
        pointer-events: none;
      }
      #film-surface-tooth {
        position: absolute;
        inset: 0;
        background-image: url("assets/textures/paper-tooth.png");
        background-size: 1024px 1024px;
        background-repeat: repeat;
      }
      #film-surface-light {
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse 90% 85% at 46% 42%, rgba(59, 58, 51, 0) 55%, rgba(59, 58, 51, 0.03) 80%, rgba(59, 58, 51, 0.06) 100%);
      }
    </style>
  </head>
  <body>
    <!-- build-cues:root:begin -->
    ${rootTag}
    <!-- build-cues:root:end -->
      <div id="film-paper" aria-hidden="true" data-layout-ignore>
        <div id="film-paper-grain"></div>
        <div id="film-paper-vignette"></div>
      </div>
      <!-- build-cues:slots:begin -->
${slotHtml}
      <!-- build-cues:slots:end -->
      <div id="film-surface" aria-hidden="true" data-layout-ignore>
        <div id="film-surface-tooth" data-layout-ignore></div>
        <div id="film-surface-light" data-layout-ignore></div>
      </div>
      <!-- build-cues:audio:begin -->
${audioHtml}
      <!-- build-cues:audio:end -->
    </div>
    <script>
      window.__timelines["${compId}"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;

function replaceRegion(html, name, body) {
  const re = new RegExp(`(<!-- build-cues:${name}:begin -->)[\\s\\S]*?(\\n?[ \\t]*<!-- build-cues:${name}:end -->)`);
  if (!re.test(html)) fail(`index.html has no <!-- build-cues:${name}:begin/end --> markers (run with --init-index once)`);
  return html.replace(re, (_, a, b) => `${a}\n${body}${b}`);
}
const indexFile = abs(opt.index);
function buildIndex() {
  if (opt.initIndex || !fs.existsSync(indexFile)) return INDEX_TEMPLATE;
  let html = fs.readFileSync(indexFile, "utf8");
  html = replaceRegion(html, "root", `    ${rootTag}`);
  html = replaceRegion(html, "slots", slotHtml);
  html = replaceRegion(html, "audio", audioHtml);
  return html;
}

// ------------------------------------------------------------------ write
const table = scenes
  .slice()
  .sort((a, b) => a.start - b.start || a.zIndex - b.zIndex)
  .map((s) => `  ${s.layer.padEnd(7)} ${s.id.padEnd(22)} ${r3(s.start).toFixed(3).padStart(8)} -> ${r3(s.end).toFixed(3).padStart(8)}  (${r3(s.duration).toFixed(3)} s, frames ${Math.round(s.start * fps)}-${Math.round(s.end * fps) - 1}, track ${s.track}, z ${s.zIndex}${s.xfadeIn ? `, xfade in ${r3(s.xfadeIn)}` : ""})`)
  .join("\n");
log(`build-cues: film ${r3(END)} s = ${frames} frames at ${fps} fps; ${Object.keys(CUES).length} cues, ${scenes.length} scenes, ${events.length} events, ${audio.filter((a) => a.present).length}/${audio.length} stems${timing.guide ? " (GUIDE timing)" : ""}`);
log(table);
if (opt.check && !opt.verifyFresh) {
  log("build-cues: --check: valid, nothing written.");
  process.exit(0);
}
const indexHtml = buildIndex();
const writes = [
  [outPath("assets/js/cues.js"), cuesJs],
  [outPath("cues/resolved.json"), JSON.stringify(resolved, null, 2) + "\n"],
  [outPath("assets/js/film-assets.js"), assetsJs || `/* assets/js/film-assets.js: ${stamp}. No inline assets declared. */\nwindow.FL_ASSETS = window.FL_ASSETS || {};\n`],
  [opt.outDir ? outPath("index.html") : indexFile, indexHtml],
];
if (opt.verifyFresh) {
  // Every generated output must equal what this build would write now. This also catches
  // changes that do not touch the cue sheet or timing: an events.json edit, a stem that
  // appeared or changed length, an edited inline SVG, a hand edit inside the index markers.
  // Studio's data-hf-id stamps are ignored.
  const noHf = (s) => s.replace(/\sdata-hf-id="[^"]*"/g, "");
  const stale = [];
  for (const [f, text] of writes) {
    const old = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
    if (old == null || noHf(old) !== noHf(text)) stale.push(path.relative(ROOT, f) || f);
  }
  if (stale.length) {
    console.error(`build-cues: STALE ${stale.join(", ")} (current cuesheet ${FILM.cuesheet.sha}, timing ${FILM.timing.sha}). Run node scripts/build-cues.mjs${opt.cuesheet !== "cues/cuesheet.json" ? ` --cuesheet ${opt.cuesheet}` : ""}.`);
    process.exit(1);
  }
  log("build-cues: cues.js, resolved.json, film-assets.js and index.html are fresh.");
  process.exit(0);
}
for (const [f, text] of writes) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, text);
  log(`build-cues: wrote ${path.relative(process.cwd(), f) || f} (${text.length} bytes)`);
}
