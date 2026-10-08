import React from 'react';
import { COLOR, DASH_PX } from '../lib/tokens';
import { annulusSector, polar } from '../lib/geometry';
import {
  FORECOURT,
  PATH,
  ROOM,
  ROOM_LABEL,
  ROOM_NAME_PX,
  ROOM_STATUS_PX,
  TRANSFER_AGENT_LABEL_SIZE,
  TRANSFER_INSIDE,
  forecourtRimToward,
  roomCentre,
  roomOpeningAngle,
  threshold,
  type RoomKey,
} from '../lib/layout';
import { ink, SEEDS } from '../lib/texture';
import { Label, Words } from '../lib/text';
import { useCamera, usePx } from '../camera/Camera';
import { READABLE_EXPONENT } from '../lib/tokens';
import { TransferAgent } from '../cast/agents';

export type DecisionRoomsProps = {
  opacity?: number;
  /** In a room close-up, the other rooms sit at 25 percent so there is one focal arrangement. */
  focus?: RoomKey;
  labels?: number;
  /** CARRIER, CAPACITY and BROKER beside the three simulated agents. */
  agentLabels?: number;
  noInsurer?: number;
  thresholdClosed?: Partial<Record<RoomKey, boolean>>;
  pathsOpacity?: number;
};

const NAME: Record<RoomKey, string> = { retain: 'Retain', mitigate: 'Mitigate', transfer: 'Transfer' };
const STATUS: Record<RoomKey, string> = { retain: 'DESIGN PROPOSAL', mitigate: 'DESIGN PROPOSAL', transfer: 'SIMULATED' };

const Room: React.FC<{ k: RoomKey; closed: boolean }> = ({ k, closed }) => {
  const px = usePx();
  const c = roomCentre(k);
  const open = roomOpeningAngle(k);
  const half = ROOM.opening / 2;
  const r0 = ROOM.r - ROOM.band;
  const a0 = open + half;
  const a1 = open - half + 360;
  const dash = `${px(DASH_PX[0])} ${px(DASH_PX[1])}`;
  const [t0x, t0y] = polar(c, ROOM.r - ROOM.band / 2, open - half);
  const [t1x, t1y] = polar(c, ROOM.r - ROOM.band / 2, open + half);

  let band: React.ReactNode;
  if (k === 'transfer') {
    // small openings in the boundary, beside each simulated agent
    const gaps = TRANSFER_INSIDE.agents.map((a) => a.angle).sort((x, y) => x - y);
    const norm = (a: number) => ((a - a0) % 360 + 360) % 360 + a0;
    const cuts = gaps.map((g) => norm(g)).sort((x, y) => x - y);
    const pieces: Array<[number, number]> = [];
    let s = a0;
    for (const g of cuts) {
      pieces.push([s, g - 5]);
      s = g + 5;
    }
    pieces.push([s, a1]);
    band = (
      <g>
        {pieces.map(([p0, p1], i) => (
          <path key={i} d={annulusSector(c, r0, ROOM.r, p0, p1)} fill={COLOR.stone} filter={ink('stone', SEEDS.roomTransfer)} />
        ))}
        {pieces.map(([p0, p1], i) => (
          <path key={`o${i}`} d={annulusSectorOuter(c, ROOM.r + px(3), p0, p1)} fill="none" stroke={COLOR.cobalt} strokeWidth={px(2)} strokeDasharray={dash} />
        ))}
      </g>
    );
  } else {
    band = <path d={annulusSector(c, r0, ROOM.r, a0, a1)} fill={k === 'retain' ? COLOR.coral : COLOR.cobalt} filter={ink(k === 'retain' ? 'coral' : 'cobalt', k === 'retain' ? SEEDS.roomRetain : SEEDS.roomMitigate)} />;
  }
  return (
    <g>
      {band}
      {closed && <line x1={t0x} y1={t0y} x2={t1x} y2={t1y} stroke={COLOR.ink} strokeWidth={px(1.5)} opacity={0.55} />}
    </g>
  );
};

const annulusSectorOuter = (c: readonly [number, number], r: number, a0: number, a1: number) => {
  const [x0, y0] = polar(c, r, a0);
  const [x1, y1] = polar(c, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

export const DecisionRooms: React.FC<DecisionRoomsProps> = ({ opacity = 1, focus, labels = 1, agentLabels = 0, noInsurer = 0, thresholdClosed = {}, pathsOpacity = 1 }) => {
  const px = usePx();
  const { zoom } = useCamera();
  const dim = (k: RoomKey) => (focus && focus !== k ? 0.25 : 1);
  // in a close-up, the other rooms' labels are hidden: they would only ever be cut by the frame edge
  const showLabel = (k: RoomKey) => (focus && focus !== k ? 0 : 1);
  // readable label sizes in world units at this zoom, so stacked lines never collide
  const statusW = (ROOM_STATUS_PX * Math.pow(zoom, READABLE_EXPONENT)) / zoom;
  const keys: RoomKey[] = ['retain', 'mitigate', 'transfer'];
  return (
    <g opacity={opacity}>
      {/* fine paths: the forecourt to the risk owner, and short spurs to each doorway */}
      <g opacity={pathsOpacity} stroke={COLOR.stone} strokeWidth={px(2)} fill="none" strokeLinecap="round">
        <path d={PATH.deskToForecourt} />
        {keys.map((k) => {
          const [ax, ay] = forecourtRimToward(k);
          const [bx, by] = threshold(k);
          return <line key={k} x1={ax} y1={ay} x2={bx} y2={by} />;
        })}
      </g>
      <circle cx={FORECOURT.c[0]} cy={FORECOURT.c[1]} r={FORECOURT.r} fill="none" stroke={COLOR.stone} strokeWidth={px(2)} />
      {keys.map((k) => (
        <g key={k} opacity={dim(k)}>
          <Room k={k} closed={thresholdClosed[k] ?? true} />
        </g>
      ))}
      {/* the simulated capacity outside Transfer's wall */}
      <g opacity={dim('transfer')}>
        {TRANSFER_INSIDE.agents.map((a, i) => (
          <TransferAgent key={i} at={a.at} variant={i as 0 | 1 | 2} />
        ))}
      </g>
      {/* the simulated roles, named in plain words: no company names, always dashed */}
      {agentLabels > 0 && (
        <g opacity={agentLabels * showLabel('transfer')}>
          {TRANSFER_INSIDE.agents.map((a) => (
            <Label key={a.label} text={a.label} at={a.labelAt} anchor="start" size={TRANSFER_AGENT_LABEL_SIZE} color={COLOR.cobalt} />
          ))}
        </g>
      )}
      {labels > 0 && (
        <g opacity={labels}>
          {keys.map((k) => {
            const { name, anchor } = ROOM_LABEL[k];
            const [x, y] = name;
            const gapNameStatus = statusW * 1.55;
            const gapStatus = statusW * 1.4;
            // Above Retain and Transfer the stack grows upwards from y, with Transfer's second line reserved,
            // so nothing moves when NO INSURER ON PRIORA YET arrives. Beside Mitigate it grows downwards.
            const lines = k === 'transfer' ? 2 : 1;
            const lastY = y;
            const firstStatusY = k === 'mitigate' ? y + gapNameStatus : lastY - gapStatus * (lines - 1);
            const nameY = k === 'mitigate' ? y : firstStatusY - gapNameStatus;
            return (
              <g key={k} opacity={showLabel(k)}>
                <Words text={NAME[k]} at={[x, nameY]} anchor={anchor} readablePx={ROOM_NAME_PX} weight={600} />
                <Label text={STATUS[k]} at={[x, firstStatusY]} anchor={anchor} readablePx={ROOM_STATUS_PX} color={k === 'transfer' ? COLOR.cobalt : COLOR.ink} />
                {k === 'transfer' && noInsurer > 0 && (
                  <Label text="NO INSURER ON PRIORA YET" at={[x, firstStatusY + gapStatus]} anchor={anchor} readablePx={ROOM_STATUS_PX} opacity={noInsurer} color={COLOR.cobalt} />
                )}
              </g>
            );
          })}
        </g>
      )}
    </g>
  );
};
