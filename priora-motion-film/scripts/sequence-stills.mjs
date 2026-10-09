// Step 3: renders the review stills of one sequence from the film itself into "stills/sequence N".
// Usage: node scripts/sequence-stills.mjs <sequence> [frame ...]   (default: that sequence's key frames)
// Frames given by hand are checks, and go to stills/scratch, which git ignores.
import path from 'node:path';
import { ROOT, makeBundle, still } from './render-lib.mjs';

// key moments per sequence: start, end and every key beat in the storyboard (at least six each)
const KEY = {
  1: [[0, 'start, paper'], [40, 'ground line drawn'], [120, 'worker and site'], [160, 'Priora appears'], [196, 'specialists arriving'], [226, 'the whole relationship'], [237, 'end']],
  2: [[262, 'camera moving closer'], [300, 'Priora listening'], [380, 'message, underlines'], [470, 'message complete'], [500, 'phrases separate'], [520, 'camera rises'], [560, 'chips print'], [600, 'request'], [630, 'photo rises'], [647, 'facets fold'], [653, 'end, CASE']],
  3: [[680, 'travel left'], [730, 'panel and ghosts'], [800, 'first summons'], [870, 'summons'], [940, 'case enters'], [990, 'camera to the table'], [1030, 'checks'], [1068, 'findings gather'], [1090, 'FIRE WATCH'], [1112, 'waiting by the entrance'], [1123, 'marks leave']],
  4: [[1142, 'beside Priora'], [1170, 'marks go in'], [1200, 'round to their agents'], [1222, 'arcs slide in'], [1245, 'ring locks'], [1262, 'INSIDE THE CONDITIONS'], [1295, 'route'], [1330, 'record'], [1360, 'NO ONE DISTURBED'], [1391, 'end']],
  5: [[1420, 'back to the panel'], [1460, 'the gap'], [1500, 'rulers'], [1530, 'barrier'], [1565, 'packet'], [1600, 'carried'], [1650, 'at the desk'], [1690, 'RISK OWNER DECIDES']],
  6: [[1720, 'rooms print'], [1745, 'Transfer with SIMULATED'], [1760, 'labels'], [1800, 'to Retain'], [1850, 'AN AGENT CANNOT CHOOSE IT'], [1872, 'into Retain'], [1920, 'retained'], [1950, 'to Mitigate'], [2004, 'into Mitigate'], [2060, 'PARTIAL'], [2140, 'FULL BACK INSIDE'], [2200, 'to Transfer'], [2256, 'copies out'], [2310, 'answers'], [2345, 'gathered']],
  7: [[2375, 'widening'], [2412, 'MITIGATE PART'], [2442, 'KEEP THE REST'], [2460, 'back to the desk'], [2480, 'line closes'], [2500, 'RISK OWNER DECIDES'], [2529, 'end']],
  8: [[2550, 'withdraws'], [2575, 'whole system'], [2610, 'A DESIGN PROPOSAL'], [2660, 'statement'], [2790, 'statement holds'], [2826, 'statement to wordmark'], [2860, 'wordmark'], [2882, 'last frame']],
};

const [seq, ...frames] = process.argv.slice(2);
const list = frames.length ? frames.map((f) => [Number(f), 'check']) : KEY[seq];
const serveUrl = await makeBundle();
for (const [frame, what] of list) {
  // JPEG at quality 92: plenty for review, and a tenth of the size of PNG with the paper grain
  const name = `F${String(frame).padStart(4, '0')} ${what}.jpg`;
  await still(serveUrl, 'priora-film', path.join(ROOT, frames.length ? `stills/scratch/${name}` : `stills/sequence ${seq}/${name}`), {}, { frame, imageFormat: 'jpeg', jpegQuality: 92 });
}
