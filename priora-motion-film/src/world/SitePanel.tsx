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
  titleOpacity?: number;
  ghostOpacity?: number;
  ghostNameOpacity?: number;
  agents?: Partial<Record<AgentKey, AgentPlace>>;
};

/** Default resting orientation of a seated agent: Fire's wedge faces the table centre. */
export const seatedRotation = (k: AgentKey) => (k === 'fire' ? angleTo(seatPos(SEAT_OF.fire), PANEL.c) : 0);

export const SitePanel: React.FC<SitePanelProps> = ({ opacity = 1, titleOpacity = 1, ghostOpacity = 0.3, ghostNameOpacity = 1, agents = {} }) => {
  const px = usePx();
  const c = PANEL.c;
  return (
    <g opacity={opacity}>
      {/* the enclosure, with a generous entrance on the right */}
      <path d={arcPath(c, PANEL.wallR, PANEL.entranceHalf, 360 - PANEL.entranceHalf)} fill="none" stroke={COLOR.stone} strokeWidth={PANEL.wallW} strokeLinecap="round" />
      {/* the open circular table */}
      <path d={annulusSector(c, PANEL.tableR - PANEL.tableBand / 2, PANEL.tableR + PANEL.tableBand / 2, 0, 359.99)} fill={COLOR.cream} filter={ink('stone', SEEDS.table)} />
      <circle cx={c[0]} cy={c[1]} r={PANEL.tableR + PANEL.tableBand / 2} fill="none" stroke={COLOR.stone} strokeWidth={px(1.2)} />
      <circle cx={c[0]} cy={c[1]} r={PANEL.tableR - PANEL.tableBand / 2} fill="none" stroke={COLOR.stone} strokeWidth={px(1.2)} />
      {/* eight positions */}
      {Array.from({ length: 8 }, (_, k) => {
        const [x, y] = seatPos(k);
        return <circle key={k} cx={x} cy={y} r={PANEL.seatRingR} fill="none" stroke={COLOR.stone} strokeWidth={px(1.6)} />;
      })}
      {/* ghosts: other specialists this panel could hold */}
      {GHOSTS.map((g) => {
        const n = nameAnchor(g.seat);
        return (
          <g key={g.name}>
            <Ghost kind={g.name} at={seatPos(g.seat)} opacity={ghostOpacity} />
            <Words text={g.name} at={n.at} anchor={n.anchor} readablePx={PANEL.namePx} color={COLOR.greyText} opacity={ghostNameOpacity * Math.min(1, ghostOpacity * 4)} />
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
          <Label text="CONFIGURED FOR THIS SITE" at={PANEL.sub} size={PANEL.subSize} />
        </g>
      )}
    </g>
  );
};
