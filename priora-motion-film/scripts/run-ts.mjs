// Bundles one of the TypeScript scripts in this folder with the film's own modules and runs it.
// Usage: node scripts/run-ts.mjs scripts/<name>.ts
import { build } from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const entry = path.resolve(process.argv[2]);
const runnable = path.join(ROOT, 'scripts', `.${path.basename(entry, '.ts')}-bundle.mjs`);
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: runnable, jsx: 'automatic', external: ['fontkit', 'react', 'react/jsx-runtime', 'remotion'], logLevel: 'error' });
try {
  await import(pathToFileURL(runnable).href);
} finally {
  fs.rmSync(runnable, { force: true });
}
