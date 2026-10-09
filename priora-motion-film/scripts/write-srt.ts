// Writes narration.srt from the narration table the film itself uses (src/lib/timeline.ts), so the
// subtitles, the burned-in review captions and the timeline can never disagree. Run with: npm run srt
import fs from 'node:fs';
import path from 'node:path';
import { NARRATION } from '../src/lib/timeline';
import { FPS } from '../src/lib/tokens';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const stamp = (frame: number) => {
  const ms = Math.round((frame / FPS) * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
const blocks = NARRATION.map((n, i) => {
  const who = 'who' in n ? 'WORKER (phone message): ' : '';
  return `${i + 1}\n${stamp(n.from)} --> ${stamp(n.to + 1)}\n${who}${n.text}\n`;
});
fs.writeFileSync(path.join(ROOT, 'narration.srt'), blocks.join('\n'));
console.log(`narration.srt: ${blocks.length} lines`);
