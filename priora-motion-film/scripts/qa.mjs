// Bundles scripts/qa.ts with the film's own modules and runs it.
import { build } from 'esbuild';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'priora-qa-'));
const out = path.join(dir, 'qa.mjs');
await build({
  entryPoints: [path.join(ROOT, 'scripts/qa.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: out,
  jsx: 'automatic',
  external: ['fontkit', 'react', 'react/jsx-runtime', 'remotion'],
  logLevel: 'error',
});
// run it from inside the project so its dependencies resolve, and with the source tree as its location
const runnable = path.join(ROOT, 'scripts', '.qa-bundle.mjs');
fs.copyFileSync(out, runnable);
const src = fs.readFileSync(runnable, 'utf8').replaceAll('import.meta.url', JSON.stringify(pathToFileURL(path.join(ROOT, 'scripts/qa.ts')).href));
fs.writeFileSync(runnable, src);
try {
  await import(pathToFileURL(runnable).href);
} finally {
  fs.rmSync(runnable, { force: true });
}
