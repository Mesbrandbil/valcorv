// Sequence 1: Priora's fine elliptical path round the real world, and the five specialists along it.
import React from 'react';
import { COLOR, STROKE_PX } from '../../lib/tokens';
import { arrive, prog } from '../../lib/motion';
import { S1 as S1L, type AgentKey } from '../../lib/layout';
import { S1 } from '../../lib/timeline';
import { DrawnLine } from '../../cast/lines';
import { Specialist } from '../../cast/agents';
import type { Pt } from '../../lib/geometry';

const { c, rx, ry } = S1L.orbit;
const top: Pt = [c[0], c[1] - ry];
const bottom: Pt = [c[0], c[1] + ry];
const RIGHT = `M ${top[0]} ${top[1]} A ${rx} ${ry} 0 0 1 ${bottom[0]} ${bottom[1]}`;
const LEFT = `M ${top[0]} ${top[1]} A ${rx} ${ry} 0 0 0 ${bottom[0]} ${bottom[1]}`;

// arrival order round the ellipse: 62°, 298°, 128°, 232°, 180° (degrees from the top, clockwise)
const STATIONS: Array<{ k: AgentKey; deg: number; turn: number }> = [
  { k: 'siteRules', deg: 62, turn: -30 },
  { k: 'insurer', deg: 298, turn: 28 },
  { k: 'fire', deg: 128, turn: -60 },
  { k: 'riskEng', deg: 232, turn: 24 },
  { k: 'evidence', deg: 180, turn: 90 },
];
const onEllipse = (deg: number): Pt => [c[0] + rx * Math.sin((deg * Math.PI) / 180), c[1] - ry * Math.cos((deg * Math.PI) / 180)];

export const Seq1Overlay: React.FC<{ f: number }> = ({ f }) => {
  if (f < S1.ellipse[0] || f > S1.specialistsOut[1] + 2) return null;
  const grow = prog(f, S1.ellipse[0], S1.ellipse[1]) * (1 - prog(f, S1.ellipseOut[0], S1.ellipseOut[1]));
  const out = prog(f, S1.specialistsOut[0], S1.specialistsOut[1]);
  return (
    <g>
      {grow > 0 && (
        <g opacity={0.9}>
          <DrawnLine d={RIGHT} progress={grow} color={COLOR.cobalt} px={STROKE_PX.thread} />
          <DrawnLine d={LEFT} progress={grow} color={COLOR.cobalt} px={STROKE_PX.thread} />
        </g>
      )}
      {STATIONS.map((s, i) => {
        const a = S1.specialistsStart + i * S1.specialistStagger;
        const u = prog(f, a, a + S1.specialistDur, arrive);
        if (u <= 0) return null;
        const p = onEllipse(s.deg);
        // the exit: each drifts outwards towards the edge of the composition and softens out of view
        const dx = (p[0] - c[0]) * 0.35 * out;
        const dy = (p[1] - c[1]) * 0.6 * out + (s.deg > 90 && s.deg < 270 ? 60 : -60) * out;
        const facing = s.k === 'fire' ? (Math.atan2(c[1] - p[1], c[0] - p[0]) * 180) / Math.PI : 0;
        return (
          <Specialist
            key={s.k}
            kind={s.k}
            at={[p[0] + dx, p[1] + dy]}
            rotation={facing + s.turn * (1 - u)}
            scale={0.82 + 0.18 * u}
            opacity={u * (1 - out)}
            state={{ aligned: 1, closed: 0, open: 0.3 }}
          />
        );
      })}
    </g>
  );
};
