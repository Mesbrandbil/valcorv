// Sequence 5: the fire watch rulers inside the table, and the pale incomplete barrier on the route.
import React from 'react';
import { COLOR } from '../../lib/tokens';
import { prog } from '../../lib/motion';
import { BARRIER, RULERS } from '../../lib/layout';
import { S5 } from '../../lib/timeline';
import { usePx } from '../../camera/Camera';
import { DrawnLine } from '../../cast/lines';

export const Seq5Overlay: React.FC<{ f: number }> = ({ f }) => {
  const px = usePx();
  if (f < S5.ruler1[0] || f > S5.barrierOut + 12) return null;
  const rulersO = 1 - prog(f, S5.rulersOut, S5.rulersOut + 10);
  // the solid ruler draws to its endpoint; the dashed one runs twice as far at the same speed
  const r1 = prog(f, S5.ruler1[0], S5.ruler1[1], (t) => t);
  const r2 = prog(f, S5.ruler2[0], S5.ruler2[1], (t) => t);
  const barrier = prog(f, S5.barrier[0], S5.barrier[1]);
  const barrierO = 1 - prog(f, S5.barrierOut, S5.barrierOut + 10);
  const [x, y] = BARRIER;
  return (
    <g>
      {rulersO > 0 && (
        <g opacity={rulersO}>
          {r1 > 0 && (
            <g>
              <line x1={RULERS.x0} y1={RULERS.ruler1Y - 8} x2={RULERS.x0} y2={RULERS.ruler1Y + 8} stroke={COLOR.ink} strokeWidth={px(2)} />
              <line x1={RULERS.x0} y1={RULERS.ruler1Y} x2={RULERS.x0 + RULERS.short * r1} y2={RULERS.ruler1Y} stroke={COLOR.ink} strokeWidth={px(3)} strokeLinecap="round" />
            </g>
          )}
          {r2 > 0 && (
            <g>
              <line x1={RULERS.x0} y1={RULERS.ruler2Y - 8} x2={RULERS.x0} y2={RULERS.ruler2Y + 8} stroke={COLOR.ink} strokeWidth={px(2)} />
              <DrawnLine d={`M ${RULERS.x0} ${RULERS.ruler2Y} H ${RULERS.x0 + RULERS.long}`} progress={r2} dashed color={COLOR.ink} px={3} />
            </g>
          )}
        </g>
      )}
      {/* a pale gate across the route: two posts and a top rail, with a piece of the rail and of one post missing */}
      {barrier > 0 && barrierO > 0 && (
        <DrawnLine d={`M ${x - 36} ${y + 44} V ${y - 46} H ${x + 4} M ${x + 22} ${y - 46} H ${x + 36} V ${y + 6}`} progress={barrier} dashed color={COLOR.greyText} px={2.6} opacity={barrierO} />
      )}
    </g>
  );
};
