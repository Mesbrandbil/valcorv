// Review subtitles: the narration lines, small, near the bottom edge, in screen space.
import React from 'react';
import { COLOR, FONT, HEIGHT, WIDTH } from '../lib/tokens';
import { NARRATION } from '../lib/timeline';
import { fade } from '../lib/motion';

export const Subtitles: React.FC<{ f: number }> = ({ f }) => {
  const line = NARRATION.find((n) => f >= n.from - 2 && f <= n.to + 8);
  if (!line) return null;
  const o = fade(f, line.from - 2, 4, line.to + 4, 4);
  const who = 'who' in line ? 'Worker: ' : '';
  // a solid panel, only as wide as its words (they measure about 10.5 px a character at this size; 10.8 leaves
  // room), so the labels it covers near the bottom edge never show through and it clears the ones beside it
  const w = Math.min(1720, (who.length + line.text.length) * 10.8 + 56);
  return (
    <g opacity={o}>
      {/* tall enough that a label in the bottom band (RECORD KEPT, the agents' names) is either covered or clear */}
      <rect x={WIDTH / 2 - w / 2} y={HEIGHT - 92} width={w} height={64} rx={6} fill={COLOR.paper} />
      <text x={WIDTH / 2} y={HEIGHT - 51} textAnchor="middle" fontFamily={FONT.sans} fontWeight={500} fontSize={24} fill={COLOR.ink}>
        {who}
        {line.text}
      </text>
    </g>
  );
};
