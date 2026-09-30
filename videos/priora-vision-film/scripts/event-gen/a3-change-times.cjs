// Recomputes a3-change's picture times (same formulas as the scene) and prints events anchored to cues.
//   node scripts/event-gen/a3-change-times.cjs <project>          the time table (scene-local and absolute)
//   node scripts/event-gen/a3-change-times.cjs <project> json     compositions/a3-change.events.json content
// Then `node scripts/snap-events.mjs --scene a3-change` rewrites the grid events as snap anchors.
const path = require('path');
const T0 = process.argv[2];
globalThis.window = globalThis;
require(path.join(T0, 'assets/js/cues.js'));
require(path.join(T0, 'assets/js/film-lib.js'));
const FL = globalThis.FL, CUES = globalThis.CUES;
const ID = 'a3-change', clk = FL.clock(ID), S = clk.start;
const T = (a, o) => clk.t(a, o), CUT = (a, o) => clk.c(a, o), BT = (a, o, m) => clk.b(a, o, m || 'near', 2);
const HB = FL.BEAT / 2, BEAT = FL.BEAT;
const t = {};
t.tOff = CUT('offline2'); t.t18a = CUT('thisTime'); t.tSees = T('sees', -0.1); t.t18b = CUT('cross');
t.SNAP_AT = t.t18b + 3 * HB; t.STRETCH = t.SNAP_AT - 0.163 - t.t18b; t.tLand = t.SNAP_AT + 0.23;
t.t19a = CUT('riskOwner'); t.tPullA = BT('decides', 0, 'prev'); t.tChange = CUT('change'); t.tKnow = CUT('knowingly');
t.tRetainW = T('retain'); t.tInTime = CUT('inTime'); t.tAsk = CUT('ask'); t.tSend = t.tAsk + HB; t.tWhether = CUT('whether');
t.tResp = [0, 1, 2, 3].map(i => t.tWhether + i * BEAT); t.tLayer = t.tResp[3] + HB; t.tEnd = clk.duration;
t.tHold = t.tLayer + 0.2; // the temporary layer has landed (expo.out); the frame holds to the end of the slot
// anchors: cue + offset (absolute time minus cue)
const anc = (cue, local) => { const off = +(local + S - CUES[cue]).toFixed(3); return 'cue:' + cue + (off >= 0 ? '+' : '') + off; };
const ev = [];
const E = (name, cue, local, kind, extra) => ev.push(Object.assign({ name, at: anc(cue, local), kind }, extra || {}));
E('cut-in', 'l16', 0.02, 'cut', { material: 'paper', gain_db: -14 });
E('system-event', 'offline2', t.tOff, 'system-event', { gain_db: -8, dur: 0.6 });
E('cut-card', 'thisTime', t.t18a, 'cut', { material: 'felt', gain_db: -14 });
E('focus-row', 'thisTime', t.t18a + 0.02, 'focus', { gain_db: -16 });
E('row-unavailable', 'sees', t.tSees, 'row-unavailable', { gain_db: -9 });
E('cut-edge', 'cross', t.t18b, 'cut', { material: 'paper', gain_db: -16 });
E('node-stretch', 'cross', t.t18b, 'node-stretch', { gain_db: -10, dur: +t.STRETCH.toFixed(3) });
E('node-cross', 'cross', t.SNAP_AT, 'node-cross', { gain_db: -6, dur: 0.46 });
E('crossing-hold', 'cross', t.tLand, 'hold', { dur: +(t.t19a - t.tLand).toFixed(3) });
E('cut-sheet', 'riskOwner', t.t19a, 'cut', { material: 'paper', gain_db: -14 });
E('sheet-in', 'riskOwner', t.t19a, 'sheet-in', { gain_db: -12, dur: 0.4 });
E('focus-sheet', 'riskOwner', t.t19a + 0.02, 'focus', { gain_db: -16 });
E('pull-choices', 'decides', t.tPullA, 'pull', { gain_db: -14, dur: +BEAT.toFixed(3) });
E('push-change', 'change', t.tChange, 'push', { gain_db: -14, dur: +BEAT.toFixed(3) });
E('choice-01', 'change', t.tChange, 'choice-accent', { variant: 1, gain_db: -10 });
E('node-return', 'change', t.tChange + 0.3, 'node-return', { gain_db: -12, dur: 0.6 });
E('whip-retain', 'knowingly', t.tKnow, 'whip', { gain_db: -16, dur: +(1.5 * HB).toFixed(3) });
E('choice-02', 'retain', t.tRetainW - 0.05, 'choice-accent', { variant: 2, gain_db: -10 });
E('whip-transfer', 'inTime', t.tInTime, 'whip', { gain_db: -16, dur: +(1.5 * HB).toFixed(3) });
E('choice-03', 'inTime', t.tInTime + 0.04, 'choice-accent', { variant: 3, gain_db: -10 });
E('cut-packet', 'ask', t.tAsk, 'cut', { material: 'paper', gain_db: -14 });
E('focus-packet', 'ask', t.tAsk + 0.02, 'focus', { gain_db: -16 });
E('packet-send', 'ask', t.tSend, 'packet-send', { gain_db: -12, dur: 0.5 });
E('carrier-response', 'whether', t.tResp[0], 'carrier-response', { gain_db: -13, series: { count: 4, every: +BEAT.toFixed(4) } });
E('layer-slice', 'whether', t.tLayer, 'layer-slice', { gain_db: -12, dur: 0.5 });
E('programme-hold', 'whether', t.tHold, 'hold', { gain_db: -6, dur: +(t.tEnd - t.tHold).toFixed(3) });
const out = { note: "a3-change (Act III, S17 to S19e). Anchored to the same cues as the picture; each offset is the scene's beat-grid cut or move time minus its cue for the current narration timing (re-derive after a re-lock: scripts/event-gen/a3-change-times.cjs, then scripts/snap-events.mjs --scene a3-change).", events: ev };
if (process.argv[3] === 'json') console.log(JSON.stringify(out, null, 2).replace(/\n\s+("(?:material|gain_db|dur|variant|kind|at|series|count|every)")/g, ' $1'));
else { for (const k in t) console.log(k, Array.isArray(t[k]) ? t[k].map(v => (v + S).toFixed(3)).join(' ') : (typeof t[k] === 'number' ? t[k].toFixed(3) + '  abs ' + (t[k] + S).toFixed(3) : t[k])); }
