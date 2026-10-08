// Step 2: renders every static world still into stills/world and the sheets into stills/cast.
// Usage: node scripts/world-stills.mjs [scene names...]   (default: all)
import path from 'node:path';
import { ROOT, makeBundle, still } from './render-lib.mjs';

const SCENES = ['sheet', 'real', 'voice', 'case assembly', 'panel', 'table', 'ring', 'route', 'gap', 'desk', 'rooms', 'retain', 'mitigate', 'transfer', 'system'];
const SHEETS = { 'cast-sheet': 'cast sheet', 'people-sheet': 'people sheet', 'case-sheet': 'case sheet' };
const only = process.argv.slice(2);
const want = (n) => only.length === 0 || only.includes(n);

const serveUrl = await makeBundle();
for (const s of SCENES) if (want(s)) await still(serveUrl, 'world-still', path.join(ROOT, `stills/world/${s}.png`), { scene: s });
for (const [id, name] of Object.entries(SHEETS)) if (want(name)) await still(serveUrl, id, path.join(ROOT, `stills/cast/${name}.png`));
