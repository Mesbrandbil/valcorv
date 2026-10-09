// Renders the film, a sequence or any frame range to H.264.
// Usage:
//   node scripts/render-video.mjs sequence <N> [scale]     half resolution review video of one sequence
//   node scripts/render-video.mjs film                     renders/Priora film master.mp4, full resolution, CRF 16
//   node scripts/render-video.mjs review                   renders/Priora film review with subtitles.mp4
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { ROOT, makeBundle } from './render-lib.mjs';

const SEQ = { 1: [0, 237], 2: [238, 653], 3: [654, 1123], 4: [1124, 1391], 5: [1392, 1690], 6: [1691, 2350], 7: [2351, 2529], 8: [2530, 2882] };
const [mode, arg, scaleArg] = process.argv.slice(2);
const browserExecutable = process.env.BROWSER_EXECUTABLE || null;
const concurrency = Math.max(1, Math.min(4, os.cpus().length - 1));

let id = 'priora-film';
let output;
let frameRange = null;
let scale = 1;
if (mode === 'sequence') {
  frameRange = SEQ[arg];
  scale = Number(scaleArg ?? 0.5);
  output = path.join(ROOT, `renders/review/sequence ${arg} half resolution.mp4`);
} else if (mode === 'film') {
  output = path.join(ROOT, 'renders/Priora film master.mp4');
} else if (mode === 'review') {
  id = 'priora-film-review';
  output = path.join(ROOT, 'renders/Priora film review with subtitles.mp4');
} else {
  console.error('usage: sequence <N> [scale] | film | review');
  process.exit(1);
}

fs.mkdirSync(path.dirname(output), { recursive: true });
const serveUrl = await makeBundle();
const composition = await selectComposition({ serveUrl, id, browserExecutable, logLevel: 'error' });
const t = Date.now();
let last = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  crf: 16,
  pixelFormat: 'yuv420p',
  outputLocation: output,
  frameRange,
  scale,
  concurrency,
  browserExecutable,
  logLevel: 'error',
  onProgress: ({ progress }) => {
    const p = Math.floor(progress * 10);
    if (p !== last) {
      last = p;
      console.log(`${(progress * 100).toFixed(0)}%  ${((Date.now() - t) / 1000).toFixed(0)} s`);
    }
  },
});
console.log(`${path.relative(ROOT, output)}  ${((Date.now() - t) / 1000).toFixed(0)} s`);
