// Writes compositions/a1-world.events.json: every event anchored to a narration cue/word with the offset that
// lands it on the scene's grid time (the same formulas as the scene's shot clock).
const path = require('path'), fs = require('fs');
const T0 = process.argv[2];
const { at, snap, B, C, BEAT, HB } = require('./times.js');
const S = {
  l01: at('l01'), beat4: B('l01', -0.05, 'prev', 1), gateCut: C('contractors'), lotoIn: C('equipment'), lotoOut: C('workMoves'),
  insurance: B('insurance'), accepted: at('accepted'), sheetIn: snap(at('L03:accepted.end'), 'next', 2), sheetOut: C('noOne'), mind: B('head'),
  roofCut: C('roof03'), workerIn: C('hotWork'), workerOut: C('certificate'), tick1: B('certificate', 0, 'near'), settleEnd: B('landing', -0.3, 'prev'),
  sz3In: C('then'), sz3Out: C('L07.end', 0.25), nothingCut: C('nothingLooks'), push9b: B('L08:conditions.start', 0, 'near'), fray: C('nobody'),
  pull9c: B('nobodyEnd', 0, 'near'), after: C('afterwards'), questions: at('L09:questions.start'), offline: at('offline'),
  RS: at('rewindStart'), RE: at('rewindEnd'),
};
S.beat1 = Math.max(0, S.beat4 - 3 * BEAT); S.beat3 = S.beat4 - BEAT;
// anchor: express time t relative to an anchor string
const rel = (anchor, t) => { const d = t - at(anchor); const s = (d >= 0 ? '+' : '-') + Math.abs(d).toFixed(3); return (anchor.includes(':') || anchor.includes('.') ? anchor : 'cue:' + anchor) + (Math.abs(d) < 0.0005 ? '' : s); };
const r3 = (x) => +x.toFixed(3);
const E = [];
const ev = (name, anchor, t, kind, o) => E.push(Object.assign({ name, at: rel(anchor, t), kind }, o || {}));
// S1 macro stroke
ev('lead-1', 'l01', S.beat1, 'set-square', { gain_db: -7, dur: 0.95, what: 'S1: the first graphite stroke lands at the roof corner and crosses the frame (downbeat)' });
ev('lead-2', 'l01', S.beat3, 'pencil', { gain_db: -9, dur: 0.5, what: 'S1: the second edge meets it at the corner (beat 3)' });
ev('lead-over', 'l01', S.beat4, 'pencil', { gain_db: -15, dur: 0.26, light: true, what: 'S1: construction overshoot past the corner (beat 4)' });
// S2 the site appears
ev('pull', 'l01', S.l01, 'pull', { gain_db: -14, dur: r3(4.5 * BEAT), what: 'S2: continuous pull back from the corner to the whole site' });
ev('site-draw', 'l01', S.l01 + 0.05, 'pencil-scatter', { gain_db: -13, dur: 0.16, series: { count: 14, every: 0.17 }, what: 'S2: the site draws itself, radiating from Roof 03' });
ev('site-hatch', 'l01', S.l01 + 0.6, 'hatch', { gain_db: -17, dur: 2.4 });
// S3a contractors arrive
ev('gate', 'contractors', S.gateCut - 1.1, 'pencil', { gain_db: -16, dur: 0.5 });
ev('van', 'contractors', S.gateCut - 1.3, 'van', { gain_db: -10, dur: 1.9 });
ev('cut-gate', 'contractors', S.gateCut, 'cut', { gain_db: -12, material: 'paper', what: 'S3a: cut to the gate road medium-close' });
ev('route', 'contractors', S.gateCut - 0.2, 'pencil-scatter', { gain_db: -17, dur: 0.1, series: { count: 8, every: 0.13 } });
ev('footsteps', 'contractors', S.gateCut - 0.45, 'footsteps', { gain_db: -13, dur: 13.5, what: 'four contractors in file from the gate to the loading-area apron' });
ev('route-tag', 'contractors', S.gateCut + HB, 'pen', { gain_db: -15, dur: 0.9, lettering: true, what: 'CONTRACTORS · GATE 2 · 07:10' });
// S3c work moves
ev('cut-morning', 'workMoves', S.lotoOut, 'cut', { gain_db: -12, material: 'paper', what: 'S3c: cut back to the wide site from the LOTO insert' });
ev('markers', 'workMoves', S.lotoOut + HB, 'tick', { gain_db: -11, series: { count: 5, every: r3(HB) }, what: 'S3c: five activity markers pop in on consecutive half beats' });
ev('hse-loop', 'workMoves', S.lotoOut + 0.05, 'pencil-scatter', { gain_db: -17, dur: 0.1, series: { count: 10, every: 0.108 } });
ev('talk-label', 'workMoves', S.lotoOut + 0.15, 'pen', { gain_db: -17, dur: 0.8, lettering: true });
ev('hse-footsteps', 'workMoves', S.lotoOut + 0.2, 'footsteps', { gain_db: -20, dur: r3(S.mind - 0.2 - (S.lotoOut + 0.2)), what: 'the HSE site walk' });
// S4 the accepted envelope
ev('rise', 'insurance', S.insurance, 'pull', { gain_db: -20, dur: r3(2 * BEAT), what: 'S4: the camera rises to a clean overview' });
ev('envelope-construct', 'insurance', S.insurance, 'pencil', { gain_db: -14, dur: 1.3, light: true });
ev('envelope-firm', 'insurance', S.insurance + HB, 'pencil', { gain_db: -9, dur: r3(S.accepted - S.insurance - HB), what: "the firm pass closes on 'accepted'" });
ev('envelope-label', 'accepted', S.accepted - 0.35, 'pen', { gain_db: -15, dur: 0.7, lettering: true });
// S6 no one can hold a moving site in mind
ev('field', 'noOne', S.sheetOut - 3 * HB, 'pencil-scatter', { gain_db: -11, dur: 0.12, series: { count: 9, every: r3(HB) }, what: 'S6: the accumulation arrives in waves on half beats (the first three under the sheet)' });
ev('containment-01', 'noOne', S.sheetOut + HB, 'pencil', { gain_db: -12, dur: 0.6 });
ev('containment-02', 'noOne', S.sheetOut + 2 * HB, 'pencil', { gain_db: -12, dur: 0.6 });
ev('roof-marker', 'noOne', S.sheetOut + 3 * HB, 'pencil', { gain_db: -12, dur: 0.5, what: 'the ROOF 03 marker' });
ev('containment-03', 'noOne', S.sheetOut + 4 * HB, 'pencil', { gain_db: -13, dur: 0.6 });
// S7a / S7c Roof 03
ev('push-roof03', 'roof03', S.roofCut, 'push', { gain_db: -10, dur: r3(BEAT), what: 'S7a: one-beat push from the extreme wide to Roof 03' });
ev('hot-marker', 'roof03', S.roofCut + 0.08, 'pencil', { gain_db: -10, dur: 0.6, what: 'the ROOF 03 marker becomes the hot-work marker' });
ev('cut-roof03', 'certificate', S.workerOut, 'cut', { gain_db: -12, material: 'paper', what: 'S7c: cut back to Roof 03 from the worker insert' });
ev('safeguards-draw', 'certificate', S.tick1 - 0.75, 'pencil', { gain_db: -16, dur: 0.3, light: true, series: { count: 5, every: r3(HB) }, what: 'each safeguard draws where it stands before its tick' });
ev('ticks', 'certificate', S.tick1, 'tick', { gain_db: -8, series: { count: 5, every: r3(HB) }, what: 'CERTIFICATE, FIRE WATCH, EXTINGUISHER, AREA CLEARED, SPRINKLERS on consecutive half beats' });
// S8 the unnoticed change
ev('subtract', 'offline', S.offline, 'subtract-bed', { dur: r3(S.nothingCut - S.offline), what: 'the valve closes (a1-inserts): part of the bed is removed' });
ev('cut-sz3', 'L07.end', S.sz3Out, 'cut', { gain_db: -16, material: 'felt', what: 'S8b: cut to the zone 3 roof; the heads drain from water to grey one by one (silent)' });
ev('hold-sz3', 'L07.end', S.sz3Out, 'hold', { dur: r3(S.nothingCut - S.sz3Out), what: "S8b: the silence after 'offline'" });
// S9
ev('cut-nothing', 'nothingLooks', S.nothingCut, 'cut', { gain_db: -16, material: 'felt', what: 'S9a: Roof 03 and zone 3 together' });
ev('connection', 'nothingLooks', S.nothingCut + HB, 'pencil-scatter', { gain_db: -21, dur: 0.1, series: { count: 10, every: 0.1 } });
ev('push-edge', 'L08:conditions.start', S.push9b, 'push', { gain_db: -17, dur: r3(BEAT), what: 'S9b: a gentle push to the envelope edge beside Roof 03' });
ev('envelope-redraw', 'changed', S.push9b + BEAT, 'pencil', { gain_db: -17, dur: 1.5, light: true, what: 'the envelope quietly redrawn inward' });
ev('fray', 'nobody', S.fray, 'fray', { gain_db: -24, dur: 1.1 });
ev('pull-back', 'nobodyEnd', S.pull9c, 'pull', { gain_db: -18, dur: r3(3 * BEAT), what: 'S9c: slow pull back to Roof 03 and zone 3' });
ev('hold-9c', 'nobodyEnd', at('nobodyEnd'), 'hold', { dur: r3(S.after - at('nobodyEnd')), what: "S9c: hold into the silence before 'If'" });
// S10
ev('cut-after', 'afterwards', S.after, 'cut', { gain_db: -12, material: 'graphite', what: 'S10a: cut to Roof 03 medium-close' });
ev('incident', 'afterwards', S.after + 0.05, 'incident', { gain_db: -8, dur: 0.75, text: 'INCIDENT · ROOF 03 · 16:07' });
ev('incident-hatch', 'afterwards', S.after + 0.38, 'hatch', { gain_db: -18, dur: 0.16 });
ev('pull-after', 'L09:questions.start', S.questions, 'pull', { gain_db: -14, dur: r3(2 * BEAT), what: 'S10b: the site recedes as the camera pulls back to afterwardsWide' });
// S11
ev('rewind', 'rewindStart', S.RS, 'rewind', { dur: r3(S.RE - S.RS), what: 'the signature rewind: the story scrubs back to the landing' });
ev('latch', 'rewindEnd', S.RE, 'latch-soft', { gain_db: -6, what: 'the rewind lands on the landing frame' });
E.sort((a, b) => 0);
const doc = {
  note: "a1-world (cut 3): the sounds the Act I site makes. Every event is anchored to a narration cue or word; the offsets put it on the scene's 92 BPM grid time under the current narration (the scene computes the same times with FL.clock().b/.c and warns in the console when an event drifts more than 20 ms from its picture). After a narration re-lock, regenerate the offsets. Kinds from docs/sound-events.md only. a1-inserts owns handwheel, gauge, valve-clunk and arc; a1-paper owns the sheet-lay and paper-lift.",
  events: E,
};
fs.writeFileSync(path.join(T0, 'compositions/a1-world.events.json'), JSON.stringify(doc, null, 2) + '\n');
console.log('wrote', E.length, 'events');
