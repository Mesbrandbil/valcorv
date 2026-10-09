import React from 'react';
import { COLOR } from '../lib/tokens';
import { annulusSector, arcPath, angleTo, type Pt } from '../lib/geometry';
import { AGENT_NAME, GHOSTS, PANEL, SEAT_OF, nameAnchor, seatPos, type AgentKey } from '../lib/layout';
import { ink, SEEDS } from '../lib/texture';
import { Label, Words } from '../lib/text';
import { usePx } from '../camera/Camera';
import { Ghost, Specialist } from '../cast/agents';

export type AgentPlace = { at?: Pt; rotation?: number; opacity?: number; state?: Record<string, number>; nameOpacity?: number };

export type SitePanelProps = {
  opacity?: number;
  /** Arrival: the wall draws round from the entrance, the table and the seats print in. */
  wall?: number;
  table?: number;
  seats?: number;
  titleOpacity?: number;
  subOpacity?: number;
  ghostOpacity?: number;
  ghostNameOpacity?: number;
  /** Per ghost name, overriding ghostNameOpacity (they appear one by one). */
  ghostNames?: Partial<Record<'Electrical' | 'Structural' | 'Security', number>>;
  agents?: Partial<Record<AgentKey, AgentPlace>>;
};

/** Default resting orientation of a seated agent: Fire's wedge faces the table centre. */
// Fire faces the table; Risk engineering's arch opens towards it (its opening faces down at rotation 0)
export const seatedRotation = (k: AgentKey) => (k === 'fire' ? angleTo(seatPos(SEAT_OF.fire), PANEL.c) : k === 'riskEng' ? angleTo(seatPos(SEAT_OF.riskEng), PANEL.c) - 90 : 0);

export const SitePanel: React.FC<SitePanelProps> = ({ opacity = 1, wall = 1, table = 1, seats = 1, titleOpacity = 1, subOpacity, ghostOpacity = 0.3, ghostNameOpacity = 1, ghostNames, agents = {} }) => {
  const px = usePx();
  const c = PANEL.c;
  return (
    <g opacity={opacity}>
      {/* the enclosure, with a generous entrance on the right */}
      {wall > 0 && (
        <path
          d={arcPath(c, PANEL.wallR, PANEL.entranceHalf, 360 - PANEL.entranceHalf)}
          pathLength={1000}
          strokeDasharray={`${(wall * 1000).toFixed(1)} 1000`}
          fill="none"
          stroke={COLOR.stone}
          strokeWidth={PANEL.wallW}
          strokeLinecap="round"
        />
      )}
      {/* the open circular table */}
      <g opacity={table}>
        <path d={annulusSector(c, PANEL.tableR - PANEL.tableBand / 2, PANEL.tableR + PANEL.tableBand / 2, 0, 359.99)} fill={COLOR.cream} filter={ink('stone', SEEDS.table)} />
        <circle cx={c[0]} cy={c[1]} r={PANEL.tableR + PANEL.tableBand / 2} fill="none" stroke={COLOR.stone} strokeWidth={px(1.2)} />
        <circle cx={c[0]} cy={c[1]} r={PANEL.tableR - PANEL.tableBand / 2} fill="none" stroke={COLOR.stone} strokeWidth={px(1.2)} />
      </g>
      {/* eight positions */}
      {Array.from({ length: 8 }, (_, k) => {
        const [x, y] = seatPos(k);
        return <circle key={k} cx={x} cy={y} r={PANEL.seatRingR} fill="none" stroke={COLOR.stone} strokeWidth={px(1.6)} opacity={seats} />;
      })}
      {/* ghosts: other specialists this panel could hold */}
      {GHOSTS.map((g) => {
        const n = nameAnchor(g.seat);
        return (
          <g key={g.name}>
            <Ghost kind={g.name} at={seatPos(g.seat)} opacity={ghostOpacity} />
            <Words text={g.name} at={n.at} anchor={n.anchor} readablePx={PANEL.namePx} color={COLOR.greyText} opacity={(ghostNames?.[g.name] ?? ghostNameOpacity) * Math.min(1, ghostOpacity * 4)} />
          </g>
        );
      })}
      {/* the specialists */}
      {(Object.keys(SEAT_OF) as AgentKey[]).map((k) => {
        const a = agents[k];
        if (!a || (a.opacity ?? 1) <= 0) return null;
        const at = a.at ?? seatPos(SEAT_OF[k]);
        const n = nameAnchor(SEAT_OF[k]);
        return (
          <g key={k}>
            <Specialist kind={k} at={at} rotation={a.rotation ?? seatedRotation(k)} opacity={a.opacity ?? 1} state={a.state} />
            {(a.nameOpacity ?? 0) > 0 && <Words text={AGENT_NAME[k]} at={n.at} anchor={n.anchor} readablePx={PANEL.namePx} opacity={a.nameOpacity} />}
          </g>
        );
      })}
      {/* title */}
      {titleOpacity > 0 && (
        <g opacity={titleOpacity}>
          <Words text="Site panel" at={PANEL.title} size={PANEL.titleSize} weight={600} />
          <Label text="CONFIGURED FOR THIS SITE" at={PANEL.sub} size={PANEL.subSize} opacity={subOpacity === undefined ? 1 : subOpacity / Math.max(0.001, titleOpacity)} />
        </g>
      )}
    </g>
  );
};
