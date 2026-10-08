// Step 3: renders the review stills of one sequence from the film itself into "stills/sequence N".
// Usage: node scripts/sequence-stills.mjs <sequence> [frame ...]   (default: that sequence's key frames)
import path from 'node:path';
import { ROOT, makeBundle, still } from './render-lib.mjs';

// key moments per sequence: start, end and every key beat in the storyboard (at least six each)
const KEY = {
  1: [[0, 'start, paper'], [40, 'ground line drawn'], [120, 'worker and site'], [175, 'Priora appears'], [212, 'specialists arriving'], [237, 'end, the whole relationship']],
  2: [[262, 'camera moving closer'], [300, 'Priora listening'], [380, 'message, underlines'], [470, 'message complete'], [500, 'phrases separate'], [520, 'camera rises'], [560, 'chips print'], [600, 'request'], [632, 'photo arrives'], [653, 'end, CASE']],
  3: [[680, 'travel left'], [730, 'panel and ghosts'], [800, 'first summons'], [870, 'summons'], [940, 'case enters'], [990, 'camera to the table'], [1030, 'checks'], [1090, 'FIRE WATCH'], [1120, 'marks leave']],
  4: [[1140, 'into the ring'], [1170, 'arcs arrive'], [1200, 'ring locks'], [1230, 'INSIDE THE CONDITIONS'], [1270, 'route'], [1320, 'record'], [1360, 'NO ONE DISTURBED'], [1391, 'end']],
  5: [[1420, 'back to the panel'], [1460, 'the gap'], [1500, 'rulers'], [1530, 'barrier'], [1565, 'packet'], [1600, 'carried'], [1650, 'at the desk'], [1690, 'RISK OWNER DECIDES']],
  6: [[1720, 'rooms print'], [1760, 'labels'], [1800, 'to Retain'], [1840, 'AN AGENT CANNOT CHOOSE IT'], [1870, 'line opens'], [1920, 'retained'], [1960, 'to Mitigate'], [2000, 'into Mitigate'], [2060, 'PARTIAL'], [2140, 'FULL BACK INSIDE'], [2200, 'to Transfer'], [2260, 'copies out'], [2310, 'answers'], [2345, 'gathered']],
  7: [[2375, 'widening'], [2400, 'Mitigate doorway'], [2430, 'Retain doorway'], [2460, 'back to the desk'], [2480, 'line closes'], [2500, 'RISK OWNER DECIDES'], [2529, 'end']],
  8: [[2550, 'withdraws'], [2575, 'whole system'], [2610, 'A DESIGN PROPOSAL'], [2660, 'statement'], [2790, 'statement holds'], [2830, 'dissolve'], [2860, 'wordmark'], [2882, 'last frame']],
};

const [seq, ...frames] = process.argv.slice(2);
const list = frames.length ? frames.map((f) => [Number(f), 'check']) : KEY[seq];
const serveUrl = await makeBundle();
for (const [frame, what] of list) {
  // JPEG at quality 92: plenty for review, and a tenth of the size of PNG with the paper grain
  const name = `F${String(frame).padStart(4, '0')} ${what}.jpg`;
  await still(serveUrl, 'priora-film', path.join(ROOT, `stills/sequence ${seq}/${name}`), {}, { frame, imageFormat: 'jpeg', jpegQuality: 92 });
}
