// Generates the two paper textures once, from fixed feTurbulence seeds. Never animated.
import path from 'node:path';
import { ROOT, makeBundle, still } from './render-lib.mjs';

const serveUrl = await makeBundle();
await still(serveUrl, 'paper-grain-tile', path.join(ROOT, 'public/textures/paper-grain.png'));
await still(serveUrl, 'paper-mottle', path.join(ROOT, 'public/textures/paper-mottle.png'));
