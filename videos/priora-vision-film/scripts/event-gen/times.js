// Evaluate the a1-world grid times in node (mirror of the scene's time table) for planning and events.
const path = require('path');
const T0 = process.argv[2];
global.window = globalThis;
require(path.join(T0, 'assets/js/cues.js'));
const BEAT = 60 / 92, HB = BEAT / 2;
const at = (a, off) => window.FL_T('a1-world', a, off || 0);
const snap = (abs, mode, sub) => { const q = BEAT / (sub || 1), k = abs / q; const kk = mode === 'prev' ? Math.floor(k + 1e-6) : mode === 'near' ? Math.round(k) : Math.ceil(k - 1e-6); return kk * q; };
const B = (a, off, mode, sub) => snap(at(a, off), mode || 'next', sub || 2);
const C = (a, off) => snap(at(a, off) - 0.12, 'near', 2);
module.exports = { at, snap, B, C, BEAT, HB };
if (require.main === module) {
  const r = (x) => x.toFixed(3);
  const list = {
    l01: at('l01'), beat4: B('l01', -0.05, 'prev', 1), contractorsCut: C('contractors'), LOTO_IN: C('equipment'), LOTO_OUT: C('workMoves'),
    insurance: B('insurance'), accepted: at('accepted'), SHEET_IN: snap(at('L03:accepted.end'), 'next', 2), SHEET_OUT: C('noOne'), head: B('head'),
    roof03Cut: C('roof03'), WORKER_IN: C('hotWork'), WORKER_OUT: C('certificate'), tick1: B('certificate', 0, 'near'), landing: at('landing'),
    settleEnd: B('landing', -0.3, 'prev'), SZ3_IN: C('then'), SZ3_OUT: C('L07.end', 0.25), offline: at('offline'), nothingCut: C('nothingLooks'),
    push9b: B('L08:conditions.start', 0, 'near'), changed: at('changed'), fray: C('nobody'), pull9c: B('nobodyEnd', 0, 'near'), AFTER: C('afterwards'),
    questions: at('L09:questions.start'), RS: at('rewindStart'), RE: at('rewindEnd'),
  };
  for (const k in list) console.log(k.padEnd(14), r(list[k]));
}
