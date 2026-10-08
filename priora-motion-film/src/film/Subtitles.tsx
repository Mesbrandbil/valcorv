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
  return (
    <g opacity={o}>
      <rect x={WIDTH / 2 - 860} y={HEIGHT - 78} width={1720} height={50} rx={6} fill={COLOR.paper} opacity={0.82} />
      <text x={WIDTH / 2} y={HEIGHT - 44} textAnchor="middle" fontFamily={FONT.sans} fontWeight={500} fontSize={24} fill={COLOR.ink}>
        {who}
        {line.text}
      </text>
    </g>
  );
};
