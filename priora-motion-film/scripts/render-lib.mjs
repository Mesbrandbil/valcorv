// Shared helpers: bundle the project once, render named stills.
import path from 'node:path';
import fs from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const browserExecutable = process.env.BROWSER_EXECUTABLE || null;

export async function makeBundle() {
  return bundle({ entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: path.join(ROOT, 'public') });
}

export async function still(serveUrl, id, output, inputProps = {}, opts = {}) {
  const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable, logLevel: 'error' });
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const t = Date.now();
  await renderStill({ composition, serveUrl, output, inputProps, browserExecutable, imageFormat: opts.imageFormat ?? 'png', jpegQuality: opts.jpegQuality, scale: opts.scale ?? 1, logLevel: 'error', overwrite: true });
  console.log(`${path.relative(ROOT, output)}  ${((Date.now() - t) / 1000).toFixed(1)} s`);
}
