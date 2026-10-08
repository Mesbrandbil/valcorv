import React from 'react';
import { COLOR } from '../lib/tokens';
import { ink, SEEDS } from '../lib/texture';
import { polar, type Pt } from '../lib/geometry';
import { usePx } from '../camera/Camera';
import type { AgentKey } from '../lib/layout';

type Place = { at: Pt; rotation?: number; scale?: number; opacity?: number };

const Placed: React.FC<Place & { children: React.ReactNode }> = ({ at, rotation = 0, scale = 1, opacity = 1, children }) => (
  <g transform={`translate(${at[0]} ${at[1]}) rotate(${rotation}) scale(${scale})`} opacity={opacity}>
    {children}
  </g>
);

// ---------------------------------------------------------------- Priora
/** A cobalt ring with a generous paper opening, a fine orbit and one bead that leads its attention. */
export const Priora: React.FC<Place & { beadAngle: number; orbitOpacity?: number }> = ({ beadAngle, orbitOpacity = 1, ...place }) => {
  const [bx, by] = polar([0, 0], 50, beadAngle);
  return (
    <Placed {...place} rotation={0}>
      <circle r={50} fill="none" stroke={COLOR.cobalt} strokeWidth={1.8} opacity={0.85 * orbitOpacity} />
      <g filter={ink('cobalt', SEEDS.priora)}>
        <path d="M 30 0 A 30 30 0 1 1 -30 0 A 30 30 0 1 1 30 0 Z M 14 0 A 14 14 0 1 0 -14 0 A 14 14 0 1 0 14 0 Z" fill={COLOR.cobalt} fillRule="evenodd" />
        <circle cx={bx} cy={by} r={6.5} fill={COLOR.cobalt} />
      </g>
    </Placed>
  );
};

// ---------------------------------------------------------------- Specialists (56 across)
/** Site rules: two stacked semicircles, flat to flat, a measured gap between. aligned 1 = in register; 0 = upper half slid aside. */
export const SiteRules: React.FC<Place & { aligned?: number }> = ({ aligned = 1, ...place }) => {
  const slide = (1 - aligned) * 14;
  return (
    <Placed {...place}>
      <g filter={ink('cobalt', SEEDS.siteRules)} fill={COLOR.cobalt}>
        <path d={`M ${-27 + slide} -4 A 27 27 0 0 1 ${27 + slide} -4 Z`} />
        <path d="M -27 4 A 27 27 0 0 0 27 4 Z" />
      </g>
    </Placed>
  );
};

/** Insurer conditions: two opposing brackets with a narrow opening. closed 0 = open, 1 = closed round a detail; apart = extra separation (the slip). */
export const InsurerConditions: React.FC<Place & { closed?: number; apart?: number }> = ({ closed = 0, apart = 0, ...place }) => {
  const half = 6 - closed * 4 + apart; // half of the opening between the inner tips
  const bracket = (s: 1 | -1) => {
    const tip = s * half;
    const back = s * (half + 22);
    const arm = s * (half + 10);
    return `M ${back} -27 L ${tip} -27 L ${tip} -17 L ${arm} -17 L ${arm} 17 L ${tip} 17 L ${tip} 27 L ${back} 27 Z`;
  };
  return (
    <Placed {...place}>
      <g filter={ink('cobalt', SEEDS.insurer)} fill={COLOR.cobalt}>
        <path d={bracket(-1)} />
        <path d={bracket(1)} />
      </g>
    </Placed>
  );
};

/** Fire: a disc with a clean wedge removed. The wedge faces direction 0 before rotation. */
export const Fire: React.FC<Place & { wedge?: number }> = ({ wedge = 40, ...place }) => {
  const [ax, ay] = polar([0, 0], 28, wedge / 2);
  const [bx, by] = polar([0, 0], 28, -wedge / 2);
  return (
    <Placed {...place}>
      <path filter={ink('cobalt', SEEDS.fire)} fill={COLOR.cobalt} d={`M 0 0 L ${ax.toFixed(2)} ${ay.toFixed(2)} A 28 28 0 1 1 ${bx.toFixed(2)} ${by.toFixed(2)} Z`} />
    </Placed>
  );
};

/** Risk engineering: an arch with a semicircular opening. open 0 = at rest, 1 = opened out. */
export const RiskEngineering: React.FC<Place & { open?: number }> = ({ open = 0, ...place }) => {
  const w = 27 + open * 5;
  const hole = 12 + open * 6;
  const d = [
    `M ${-w} 26`,
    `L ${-w} 0`,
    `A ${w} ${w} 0 0 1 ${w} 0`,
    `L ${w} 26`,
    `L ${hole} 26`,
    `A ${hole} ${hole} 0 0 0 ${-hole} 26`,
    'Z',
  ].join(' ');
  return (
    <Placed {...place}>
      <path filter={ink('cobalt', SEEDS.riskEng)} fill={COLOR.cobalt} d={d} />
    </Placed>
  );
};

/** Evidence check: a softened square with a small round aperture. corners 0..1 draws its framing corner marks. */
export const EvidenceCheck: React.FC<Place & { corners?: number; cornerSpread?: number }> = ({ corners = 0, cornerSpread = 42, ...place }) => {
  const px = usePx();
  const c = cornerSpread;
  const l = 12 * corners;
  return (
    <Placed {...place}>
      <path
        filter={ink('cobalt', SEEDS.evidence)}
        fill={COLOR.cobalt}
        fillRule="evenodd"
        d="M -12 -26 H 12 A 14 14 0 0 1 26 -12 V 12 A 14 14 0 0 1 12 26 H -12 A 14 14 0 0 1 -26 12 V -12 A 14 14 0 0 1 -12 -26 Z M 8 -2 A 8 8 0 1 0 -8 -2 A 8 8 0 1 0 8 -2 Z"
      />
      {corners > 0 && (
        <g stroke={COLOR.cobalt} strokeWidth={px(2.4)} fill="none" strokeLinecap="round">
          {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], i) => (
            <path key={i} d={`M ${sx * c} ${sy * (c - l)} L ${sx * c} ${sy * c} L ${sx * (c - l)} ${sy * c}`} />
          ))}
        </g>
      )}
    </Placed>
  );
};

export const Specialist: React.FC<Place & { kind: AgentKey; state?: Record<string, number> }> = ({ kind, state = {}, ...place }) => {
  switch (kind) {
    case 'siteRules': return <SiteRules {...place} aligned={state.aligned} />;
    case 'insurer': return <InsurerConditions {...place} closed={state.closed} apart={state.apart} />;
    case 'fire': return <Fire {...place} />;
    case 'riskEng': return <RiskEngineering {...place} open={state.open} />;
    case 'evidence': return <EvidenceCheck {...place} corners={state.corners} />;
  }
};

// ---------------------------------------------------------------- Ghosts (other possible specialists)
export type GhostKind = 'Electrical' | 'Structural' | 'Security';
/** Barely visible: dashed stone outlines in the same family. */
export const Ghost: React.FC<Place & { kind: GhostKind }> = ({ kind, ...place }) => {
  const px = usePx();
  const common = { fill: 'none', stroke: COLOR.stone, strokeWidth: px(1.6), strokeDasharray: `${px(6)} ${px(5)}` };
  return (
    <Placed {...place}>
      {kind === 'Electrical' && (
        <>
          <circle r={26} {...common} />
          <path d="M 6 -26 L -6 -2 L 7 2 L -5 26" {...common} />
        </>
      )}
      {kind === 'Structural' && <path d="M -26 -26 H 26 V -16 H 6 V 16 H 26 V 26 H -26 V 16 H -6 V -16 H -26 Z" {...common} />}
      {kind === 'Security' && (
        <>
          <circle r={26} {...common} />
          <circle r={9} cy={-4} {...common} />
          <path d="M -4 5 L -6 18 H 6 L 4 5" {...common} />
        </>
      )}
    </Placed>
  );
};

// ---------------------------------------------------------------- Transfer agents (simulated)
/** Dashed outline glyphs, lighter than the site agents: simulated carrier and capacity roles. */
export const TransferAgent: React.FC<Place & { variant: 0 | 1 | 2 }> = ({ variant, ...place }) => {
  const px = usePx();
  const common = { fill: 'none', stroke: COLOR.cobalt, strokeWidth: px(2), strokeDasharray: `${px(10)} ${px(7)}`, opacity: 0.8 };
  const hex = (r: number) =>
    Array.from({ length: 6 }, (_, i) => polar([0, 0], r, 30 + 60 * i))
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(' ') + ' Z';
  return (
    <Placed {...place}>
      <path d={hex(25)} {...common} />
      {variant === 0 && <circle r={9} {...common} />}
      {variant === 1 && <path d="M -9 0 H 9" {...common} />}
      {variant === 2 && <path d={hex(11)} {...common} />}
    </Placed>
  );
};

// ---------------------------------------------------------------- Retain's room agents
export const RoomAgent: React.FC<Place & { variant: 0 | 1 | 2 }> = ({ variant, ...place }) => (
  <Placed {...place}>
    <g filter={ink('cobalt', SEEDS.roomAgents)} fill={COLOR.cobalt}>
      {variant === 0 && <circle r={10} />}
      {variant === 1 && <path d="M -12 5 A 12 12 0 0 1 12 5 Z" />}
      {variant === 2 && <rect x={-9} y={-9} width={18} height={18} rx={5} />}
    </g>
  </Placed>
);

// ---------------------------------------------------------------- Mitigate's safeguards
export type SafeguardKind = 'thermal' | 'watch' | 'workshop';
/**
 * A safeguard proposal: its glyph, a stack of discs for cost and an open clock arc for time.
 * cost is 1 to 3 discs; time 0 to 1 of a turn. No numbers anywhere.
 */
export const Safeguard: React.FC<Place & { variant: SafeguardKind; cost: number; time: number; lift?: number }> = ({ variant, cost, time, lift = 0, ...place }) => {
  const px = usePx();
  return (
    <Placed {...place}>
      <g transform={`translate(0 ${-lift * 10})`}>
        <g filter={ink('cobalt', SEEDS.safeguards)} fill={COLOR.cobalt}>
          {variant === 'thermal' && <path fillRule="evenodd" d="M 18 0 A 18 18 0 1 1 -18 0 A 18 18 0 1 1 18 0 Z M 7 0 A 7 7 0 1 0 -7 0 A 7 7 0 1 0 7 0 Z" />}
          {variant === 'watch' && <rect x={-24} y={-9} width={48} height={18} rx={9} />}
          {variant === 'workshop' && <path d="M -17 16 V -4 L 0 -18 L 17 -4 V 16 Z" />}
        </g>
      </g>
      {/* cost: a stack of discs, left */}
      <g fill={COLOR.ink} transform="translate(-46 14)">
        {Array.from({ length: cost }, (_, i) => (
          <ellipse key={i} cx={0} cy={-i * 7} rx={8} ry={3.2} opacity={0.85} />
        ))}
      </g>
      {/* time: an open clock arc, right */}
      <g transform="translate(46 4)" fill="none" stroke={COLOR.ink} strokeLinecap="round">
        <circle r={10} stroke={COLOR.stone} strokeWidth={px(1.2)} />
        <path d={arcSweep(10, time)} strokeWidth={px(2)} />
      </g>
    </Placed>
  );
};

const arcSweep = (r: number, t: number) => {
  const a = Math.max(0.02, Math.min(0.98, t)) * 360;
  const [x, y] = polar([0, 0], r, -90 + a);
  return `M 0 ${-r} A ${r} ${r} 0 ${a > 180 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
};
