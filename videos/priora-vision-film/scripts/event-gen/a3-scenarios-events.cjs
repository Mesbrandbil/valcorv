// Generates compositions/a3-scenarios.events.json from the same time formulas as the scene.
// Usage: node gen-events.cjs <project root>   (writes the events file, prints the resolved local times)
const path = require("path");
const fs = require("fs");
const T0 = process.argv[2];
globalThis.window = globalThis;
require(path.join(T0, "assets/js/cues.js"));
require(path.join(T0, "assets/js/film-lib.js"));
require(path.join(T0, "assets/js/site-data.js"));
const FL = globalThis.FL,
  M = globalThis.SITE_MODEL;
const ID = "a3-scenarios",
  clk = FL.clock(ID);
const T = (a, o) => clk.t(a, o),
  CUT = (a, o) => clk.c(a, o),
  BT = (a, o, m) => clk.b(a, o || 0, m || "next", 2);
const BEAT = FL.BEAT,
  HB = BEAT / 2;
const r3 = (x) => +x.toFixed(3);

// ---- the scene's key times (same formulas as compositions/a3-scenarios.html)
const t = {};
t.M1 = BT("everyKind");
t.Push1 = BT("L18a.end");
t.C2 = CUT("crane");
t.Move2 = BT("L18b:lift.start");
t.Wind = T("wind");
t.Cross = t.Wind + 0.4 * Math.sqrt(0.5);
t.Out2 = BT("L18b:picks.start");
t.C3 = CUT("gasDetector");
t.Byp = T("bypassed");
t.Key = t.Byp - 0.25;
t.Flip3 = BT("bypassed", 0, "near");
t.Push3 = BT("bypassed", 0.2);
t.Out3 = BT("L18c:maintenance.start");
t.C4 = CUT("confined");
t.Move4 = BT("L18d:entry.start");
t.Vent = T("ventilation");
t.Flip4 = BT("ventilation");
t.Out4 = BT("L18d:down.start");
t.C5 = CUT("L18e.start");
t.Few = BT("few");
t.Dec = CUT("decisionsL18");
t.Pulse = CUT("madeInTime");

// ---- SC5 ordinary passes (same seeded order as the scene)
const ACT = M.activities;
const KW = [M.anchors.roof03Centre.world, ACT.portfolio.find((a) => a.id === "d-04").world, ACT.portfolio.find((a) => a.id === "d-03").world, FL.iso(20, 31, 11)];
let ORD = [];
ACT.routine.forEach((a) => ORD.push(a.world));
ACT.portfolio.forEach((a) => {
  if (a.outcome === "inside") ORD.push(a.world);
});
ORD = ORD.filter((w) => !KW.some((k) => Math.hypot(k[0] - w[0], k[1] - w[1]) < 7));
// SC1 consumes its own generator; SC5's is independent
const r5 = FL.prng("a3s-sc5-ord");
const passes = [];
FL.shuffle(r5, ORD).forEach((w, j, arr) => {
  const ti = t.C5 + 0.25 + (j / arr.length) * (t.Few - t.C5 - 0.9) + r5() * 0.12;
  passes.push(ti + 0.4);
});
passes.sort((a, b) => a - b);

// ---- events: anchored to the cue the picture uses, with the same grid rule
const ev = [];
const E = (name, at, kind, extra) => ev.push(Object.assign({ name, at, kind }, extra || {}));
const off = (x) => (x >= 0 ? "+" : "") + r3(x);
// SC1
E("markers", "cue:everyKind", "node-pass", { snap: { mode: "next" }, gain_db: -16, series: { count: 4, every: r3(HB) } });
E("push-crane", "L18a.end", "push", { snap: { mode: "next" }, gain_db: -14, dur: r3(BEAT) });
// SC2
E("cut-crane", "cue:crane", "cut", { snap: "cut", material: "felt", gain_db: -14 });
E("gusts", "cue:crane", "pencil-scatter", { snap: { mode: "cut", off: 0.05 }, gain_db: -24, series: { count: 6, every: 0.16 } });
E("pull-card", "L18b:lift.start", "pull", { snap: { mode: "next" }, gain_db: -14, dur: r3(BEAT) });
E("connect-wind", "L18b:lift.start", "connect-line", { snap: { mode: "next", off: 0.05 }, gain_db: -12, dur: r3(BEAT * 0.72) });
E("focus-card-crane", "L18b:lift.start", "focus", { snap: { mode: "next", off: r3(BEAT) }, gain_db: -16 });
E("wind-limit", "cue:wind" + off(t.Cross - t.Wind), "row-unavailable", { gain_db: -9 });
E("outcome-change", "L18b:picks.start", "choice-accent", { snap: { mode: "next" }, variant: 1, gain_db: -10 });
// SC3
E("cut-gas", "cue:gasDetector", "cut", { snap: "cut", material: "paper", gain_db: -14 });
E("connect-gas", "cue:gasDetector", "connect-line", { snap: { mode: "cut", off: r3(HB + 0.05) }, gain_db: -12, dur: r3(0.55 * 0.72) });
E("key-turn", "cue:bypassed-0.25", "handwheel", { gain_db: -16, dur: 0.26 });
E("bypassed", "cue:bypassed", "row-unavailable", { snap: { mode: "near" }, gain_db: -9 });
E("push-card-gas", "cue:bypassed+0.2", "push", { snap: { mode: "next" }, gain_db: -14, dur: r3(BEAT) });
E("outcome-retain", "L18c:maintenance.start", "choice-accent", { snap: { mode: "next" }, variant: 2, gain_db: -10 });
// SC4
E("cut-tank", "cue:confined", "cut", { snap: "cut", material: "paper", gain_db: -14 });
E("pull-fan", "L18d:entry.start", "pull", { snap: { mode: "next" }, gain_db: -14, dur: r3(BEAT) });
E("connect-fan", "L18d:entry.start", "connect-line", { snap: { mode: "next", off: 0.25 }, gain_db: -12, dur: r3(BEAT * 0.72) });
E("focus-card-tank", "L18d:entry.start", "focus", { snap: { mode: "next", off: r3(BEAT) }, gain_db: -16 });
E("fan-stops", "cue:ventilation", "subtract-bed", { gain_db: -10, dur: 0.62 });
E("ventilation-down", "cue:ventilation", "row-unavailable", { snap: { mode: "next" }, gain_db: -9 });
E("outcome-prevent", "L18d:down.start", "choice-accent", { snap: { mode: "next" }, variant: 3, gain_db: -10 });
// SC5
E("cut-site", "L18e.start", "cut", { snap: "cut", material: "paper", gain_db: -14 });
E("pull-site", "L18e.start", "pull", { snap: { mode: "cut", off: 0.002 }, gain_db: -12, dur: r3(t.Dec - t.C5 - 0.002) });
passes
  .filter((p, i) => i % 4 === 1)
  .forEach((p, i) => E("node-pass-0" + (i + 1), "L18e.start", "node-pass", { snap: { mode: "cut", off: r3(p - t.C5) }, gain_db: -20 }));
E("decisions", "cue:few", "decision-accent", { snap: { mode: "next" }, gain_db: -9, series: { count: 4, every: r3(HB) } });
E("envelope-pulse", "cue:madeInTime", "connect-line", { snap: "cut", gain_db: -12, dur: r3(3 * HB) });

const out = {
  note: "a3-scenarios (cut 3, SC1 to SC5). Generated from the scene's own time formulas (scratch gen-events.cjs): every grid-synced sound is its picture's cue plus the same snap rule, so it stays on the picture after a narration re-lock.",
  events: ev,
};
fs.writeFileSync(path.join(T0, "compositions/a3-scenarios.events.json"), JSON.stringify(out, null, 2) + "\n");
const S = clk.start;
for (const k in t) console.log(k.padEnd(8), r3(t[k]), " abs", r3(t[k] + S));
console.log("passes", passes.map(r3).join(" "));
