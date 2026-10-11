// Review subtitles: the narration lines, small, near the bottom edge, in screen space.
import React from 'react';
import { COLOR, FONT, HEIGHT, WIDTH } from '../lib/tokens';
import { NARRATION } from '../lib/timeline';

// lines whose single-line panel would cut a label beside it are set on two balanced lines (narrower)
const TWO_LINES = new Set(['N6T']);
const split = (text: string): string[] => {
  const words = text.split(' ');
  let best = 1;
  for (let i = 1; i < words.length; i++) {
    const d = (k: number) => Math.abs(words.slice(0, k).join(' ').length - words.slice(k).join(' ').length);
    if (d(i) < d(best)) best = i;
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
};

export const Subtitles: React.FC<{ f: number }> = ({ f }) => {
  // on 2 frames before the voice and off 3 frames after it, with no fade, so a covered label never prints
  // through the words and a line never rides into the next camera move
  const line = NARRATION.find((n) => f >= n.from - 2 && f <= n.to + 3);
  if (!line) return null;
  const who = 'who' in line ? 'Worker: ' : '';
  const rows = TWO_LINES.has(line.id) ? split(who + line.text) : [who + line.text];
  // a solid panel, only as wide as its words (they measure about 10.5 px a character at this size; 10.8 leaves
  // room), tall enough that a label in the bottom band (RECORD KEPT, the agents' names) is either covered or clear
  const w = Math.min(1720, Math.max(...rows.map((r) => r.length)) * 10.8 + 56);
  const h = 64 + (rows.length - 1) * 32;
  return (
    <g>
      <rect x={WIDTH / 2 - w / 2} y={HEIGHT - 28 - h} width={w} height={h} rx={6} fill={COLOR.paper} />
      {rows.map((r, i) => (
        <text key={r} x={WIDTH / 2} y={HEIGHT - 51 - (rows.length - 1 - i) * 32} textAnchor="middle" fontFamily={FONT.sans} fontWeight={500} fontSize={24} fill={COLOR.ink}>
          {r}
        </text>
      ))}
    </g>
  );
};
