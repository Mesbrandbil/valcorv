import React from 'react';
import { COLOR } from '../lib/tokens';
import { ink, SEEDS } from '../lib/texture';
import type { Pt } from '../lib/geometry';
import { RISK_OWNER, SITE, WORKER } from '../lib/layout';

/** Soft, barely there contact shadow under a printed figure. */
export const ContactShadow: React.FC<{ at: Pt; w: number; opacity?: number }> = ({ at, w, opacity = 1 }) => (
  <ellipse cx={at[0]} cy={at[1] + 2} rx={w / 2} ry={5} fill="url(#contact-shadow)" opacity={opacity} />
);

export const ContactShadowDefs: React.FC = () => (
  <radialGradient id="contact-shadow">
    <stop offset="0" stopColor={COLOR.ink} stopOpacity={0.13} />
    <stop offset="1" stopColor={COLOR.ink} stopOpacity={0} />
  </radialGradient>
);

export type PhonePose = 'rest' | 'raised' | 'tilted';

/** The worker: hard hat, solid rounded stance, one arm near a phone. Feet at WORKER.feet. */
export const Worker: React.FC<{ phone?: PhonePose; opacity?: number }> = ({ phone = 'rest', opacity = 1 }) => {
  const [fx, fy] = WORKER.feet;
  const arm =
    phone === 'rest'
      ? 'M 21 -98 C 30 -92 34 -78 31 -60 L 23 -58 C 25 -72 22 -84 16 -90 Z'
      : 'M 20 -99 C 30 -104 36 -116 36 -128 L 28 -130 C 27 -120 23 -110 15 -104 Z';
  const phoneShape =
    phone === 'rest'
      ? <rect x={23} y={-64} width={10} height={16} rx={2} transform="rotate(-8 28 -56)" />
      : phone === 'raised'
        ? <rect x={27} y={-144} width={10} height={17} rx={2} transform="rotate(10 32 -136)" />
        : <rect x={27} y={-146} width={10} height={17} rx={2} transform="rotate(48 32 -137)" />;
  return (
    <g transform={`translate(${fx} ${fy})`} opacity={opacity}>
      <g filter={ink('ink', SEEDS.worker)} fill={COLOR.ink}>
        {/* hard hat: dome and brim */}
        <path d="M -22 -133 C -22 -150 -11 -157 0 -157 C 11 -157 22 -150 22 -133 Z" />
        <rect x={-28} y={-135} width={56} height={5} rx={2.5} />
        {/* head */}
        <circle cx={0} cy={-118} r={14} />
        {/* body: a slightly rounded stance */}
        <path d="M -24 -100 C -27 -84 -26 -60 -21 -40 L 21 -40 C 26 -60 27 -84 24 -100 C 14 -106 -14 -106 -24 -100 Z" />
        {/* legs */}
        <path d="M -19 -42 L -17 0 L -3 0 L -2 -42 Z" />
        <path d="M 2 -42 L 3 0 L 17 0 L 19 -42 Z" />
        {/* arm and phone */}
        <path d={arm} />
        {phoneShape}
      </g>
    </g>
  );
};

/** The industrial building: a low roofline, one taller service block and a small rectangular window. */
export const Site: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => {
  const { hall, serviceBlock, window: win, base } = SITE;
  return (
    <g opacity={opacity}>
      <g filter={ink('ink', SEEDS.site)} fill={COLOR.ink}>
        <path d={`M ${hall.x0} ${base[1]} V ${hall.roof + 4} L ${hall.x0 + 4} ${hall.roof} H ${hall.x1 - 4} L ${hall.x1} ${hall.roof + 4} V ${base[1]} Z`} />
        <rect x={serviceBlock.x0} y={serviceBlock.top} width={serviceBlock.x1 - serviceBlock.x0} height={base[1] - serviceBlock.top} />
      </g>
      {/* window: a fine paper frame round a deep interior, where the spark lives */}
      <rect x={win.c[0] - win.w / 2 - 2} y={win.c[1] - win.h / 2 - 2} width={win.w + 4} height={win.h + 4} fill={COLOR.paper} />
      <rect x={win.c[0] - win.w / 2} y={win.c[1] - win.h / 2} width={win.w} height={win.h} fill="#262422" />
    </g>
  );
};

/** The risk owner, seated behind a desk: a horizontal desktop and a curved shoulder. */
export const RiskOwner: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => {
  const { deskTop, deskX0, deskX1, head } = RISK_OWNER;
  const by = RISK_OWNER.base[1];
  return (
    <g opacity={opacity}>
      <g filter={ink('ink', SEEDS.riskOwner)} fill={COLOR.ink}>
        <circle cx={head[0]} cy={head[1]} r={17} />
        <path d={`M ${head[0] - 40} ${deskTop} C ${head[0] - 40} ${head[1] + 30} ${head[0] - 24} ${head[1] + 22} ${head[0]} ${head[1] + 22} C ${head[0] + 24} ${head[1] + 22} ${head[0] + 40} ${head[1] + 30} ${head[0] + 40} ${deskTop} Z`} />
        <rect x={deskX0} y={deskTop} width={deskX1 - deskX0} height={9} />
        <rect x={deskX0 + 8} y={deskTop + 9} width={7} height={by - deskTop - 9} />
        <rect x={deskX1 - 15} y={deskTop + 9} width={7} height={by - deskTop - 9} />
        <rect x={deskX0 + 15} y={deskTop + 9} width={deskX1 - deskX0 - 30} height={24} opacity={0.9} />
      </g>
    </g>
  );
};

/** The welding spark: white, tiny and alive. level 0 to 1 is set per frame from a fixed flicker table. */
export const Spark: React.FC<{ at: Pt; level: number }> = ({ at, level }) => {
  if (level <= 0) return null;
  const s = 4 + 5 * level;
  return (
    <g transform={`translate(${at[0]} ${at[1]})`}>
      <circle r={s * 1.4} fill={COLOR.spark} opacity={0.18 * level} />
      <path d={`M 0 ${-s} L ${s * 0.25} ${-s * 0.25} L ${s} 0 L ${s * 0.25} ${s * 0.25} L 0 ${s} L ${-s * 0.25} ${s * 0.25} L ${-s} 0 L ${-s * 0.25} ${-s * 0.25} Z`} fill={COLOR.spark} opacity={0.6 + 0.4 * level} />
    </g>
  );
};
