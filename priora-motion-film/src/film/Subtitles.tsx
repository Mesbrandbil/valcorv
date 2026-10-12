// Review subtitles: the narration lines, small, near the bottom edge, in screen space.
import React from 'react';
import { COLOR, FONT, HEIGHT, WIDTH } from '../lib/tokens';
import { NARRATION } from '../lib/timeline';
import { SUBTITLE_PLACES } from '../lib/subtitle-places';

// where each subtitle sits and how it breaks into rows, measured on the rendered master so that its panel never
// slices a label, an icon or a figure (scripts/place-subtitles.py); a line not placed there sits at the bottom
const placeOf = (id: string, text: string) => {
  const p = SUBTITLE_PLACES[id];
  return p && p.rows.join(' ') === text ? p : { at: 'bottom' as const, edge: 28, rows: [text] };
};

export const Subtitles: React.FC<{ f: number }> = ({ f }) => {
  // exactly while the voice speaks (each window already holds a breath of silence at both ends), with no fade,
  // so a covered label never prints through the words and a line never rides into the next camera move
  const line = NARRATION.find((n) => f >= n.from && f <= n.to);
  if (!line) return null;
  const who = 'who' in line ? 'Worker: ' : '';
  const { at, edge, rows } = placeOf(line.id, who + line.text);
  // a solid panel, only as wide as its words (they measure about 10.5 px a character at this size; 10.8 leaves
  // room); the geometry matches scripts/place-subtitles.py
  const w = Math.min(1720, Math.max(...rows.map((r) => r.length)) * 10.8 + 56);
  const h = 64 + (rows.length - 1) * 32;
  const y0 = at === 'bottom' ? HEIGHT - edge - h : edge;
  return (
    <g>
      <rect x={WIDTH / 2 - w / 2} y={y0} width={w} height={h} rx={6} fill={COLOR.paper} />
      {rows.map((r, i) => (
        <text key={r} x={WIDTH / 2} y={y0 + 41 + i * 32} textAnchor="middle" fontFamily={FONT.sans} fontWeight={500} fontSize={24} fill={COLOR.ink}>
          {r}
        </text>
      ))}
    </g>
  );
};
