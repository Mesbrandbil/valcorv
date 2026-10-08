import React from 'react';
import { COLOR, DASH_PX, READABLE_EXPONENT } from '../lib/tokens';
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
import { TransferAgent } from '../cast/agents';

/** Per room: print 0 to 1 (arrival), opacity (25 percent when another room is in focus), name and status label opacities, threshold 1 = closed, 0 = opened. */
export type RoomState = { print?: number; opacity?: number; name?: number; status?: number; threshold?: number };

export type DecisionRoomsProps = {
  opacity?: number;
  /** In a room close-up, the other rooms sit at 25 percent so there is one focal arrangement. */
  focus?: RoomKey;
  labels?: number;
  noInsurer?: number;
  /** CARRIER, CAPACITY and BROKER beside the three simulated agents: one opacity, or one each. */
  agentLabels?: number | number[];
  thresholdClosed?: Partial<Record<RoomKey, boolean>>;
  pathsOpacity?: number;
  /** Animated per-room state; overrides focus, labels and thresholdClosed where given. */
  rooms?: Partial<Record<RoomKey, RoomState>>;
  forecourt?: number;
  /** The simulated agents outside Transfer's wall. */
  agents?: number;
};

const NAME: Record<RoomKey, string> = { retain: 'Retain', mitigate: 'Mitigate', transfer: 'Transfer' };
const STATUS: Record<RoomKey, string> = { retain: 'DESIGN PROPOSAL', mitigate: 'DESIGN PROPOSAL', transfer: 'SIMULATED' };
const KEYS: RoomKey[] = ['retain', 'mitigate', 'transfer'];

const arcOuter = (c: readonly [number, number], r: number, a0: number, a1: number) => {
  const [x0, y0] = polar(c, r, a0);
  const [x1, y1] = polar(c, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

const Room: React.FC<{ k: RoomKey; closed: number }> = ({ k, closed }) => {
  const px = usePx();
  const c = roomCentre(k);
  const open = roomOpeningAngle(k);
  const half = ROOM.opening / 2;
  const r0 = ROOM.r - ROOM.band;
  const a0 = open + half;
  const a1 = open - half + 360;
  const dash = `${px(DASH_PX[0])} ${px(DASH_PX[1])}`;
  const rm = ROOM.r - ROOM.band / 2;
  const [t0x, t0y] = polar(c, rm, open - half);
  const [t1x, t1y] = polar(c, rm, open + half);
  const [mx, my] = [(t0x + t1x) / 2, (t0y + t1y) / 2];

  let band: React.ReactNode;
  if (k === 'transfer') {
    // small openings in the boundary, beside each simulated agent
    const norm = (a: number) => ((((a - a0) % 360) + 360) % 360) + a0;
    const cuts = TRANSFER_INSIDE.agents.map((a) => norm(a.angle)).sort((x, y) => x - y);
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
          <path key={`o${i}`} d={arcOuter(c, ROOM.r + px(3), p0, p1)} fill="none" stroke={COLOR.cobalt} strokeWidth={px(2)} strokeDasharray={dash} />
        ))}
      </g>
    );
  } else {
    band = (
      <path
        d={annulusSector(c, r0, ROOM.r, a0, a1)}
        fill={k === 'retain' ? COLOR.coral : COLOR.cobalt}
        filter={ink(k === 'retain' ? 'coral' : 'cobalt', k === 'retain' ? SEEDS.roomRetain : SEEDS.roomMitigate)}
      />
    );
  }
  return (
    <g>
      {band}
      {/* the fine closed threshold: it opens from the middle, each half drawing back to its band end */}
      {closed > 0 && (
        <g stroke={COLOR.ink} strokeWidth={px(1.5)} opacity={0.55}>
          <line x1={t0x} y1={t0y} x2={t0x + (mx - t0x) * closed} y2={t0y + (my - t0y) * closed} />
          <line x1={t1x} y1={t1y} x2={t1x + (mx - t1x) * closed} y2={t1y + (my - t1y) * closed} />
        </g>
      )}
    </g>
  );
};

export const DecisionRooms: React.FC<DecisionRoomsProps> = ({
  opacity = 1,
  focus,
  labels = 1,
  agentLabels = 0,
  noInsurer = 0,
  thresholdClosed = {},
  pathsOpacity = 1,
  rooms,
  forecourt = 1,
  agents = 1,
}) => {
  const px = usePx();
  const { zoom } = useCamera();
  const st = (k: RoomKey): Required<RoomState> => {
    const r = rooms?.[k] ?? {};
    const dimmed = focus && focus !== k;
    return {
      print: r.print ?? 1,
      opacity: r.opacity ?? (dimmed ? 0.25 : 1),
      // in a close-up, the other rooms' labels are hidden: they would only ever be cut by the frame edge
      name: r.name ?? (dimmed ? 0 : labels),
      status: r.status ?? (dimmed ? 0 : labels),
      threshold: r.threshold ?? ((thresholdClosed[k] ?? true) ? 1 : 0),
    };
  };
  // readable label sizes in world units at this zoom, so stacked lines never collide
  const statusW = (ROOM_STATUS_PX * Math.pow(zoom, READABLE_EXPONENT)) / zoom;
  return (
    <g opacity={opacity}>
      {/* fine paths: the forecourt to the risk owner, and short spurs to each doorway */}
      {pathsOpacity > 0 && (
        <g opacity={pathsOpacity} stroke={COLOR.stone} strokeWidth={px(2)} fill="none" strokeLinecap="round">
          <path d={PATH.deskToForecourt} />
          {KEYS.map((k) => {
            const [ax, ay] = forecourtRimToward(k);
            const [bx, by] = threshold(k);
            return <line key={k} x1={ax} y1={ay} x2={bx} y2={by} />;
          })}
        </g>
      )}
      {forecourt > 0 && <circle cx={FORECOURT.c[0]} cy={FORECOURT.c[1]} r={FORECOURT.r} fill="none" stroke={COLOR.stone} strokeWidth={px(2)} opacity={forecourt} />}
      {KEYS.map((k) => {
        const s = st(k);
        if (s.print <= 0) return null;
        const [cx, cy] = roomCentre(k);
        // a print-like arrival: the band settles from 3 percent larger as it inks in
        const sc = 1 + 0.03 * (1 - s.print);
        return (
          <g key={k} opacity={s.opacity * Math.min(1, s.print * 1.4)} transform={`translate(${cx} ${cy}) scale(${sc}) translate(${-cx} ${-cy})`}>
            <Room k={k} closed={s.threshold} />
          </g>
        );
      })}
      {/* the simulated capacity outside Transfer's wall */}
      {agents > 0 && (
        <g opacity={agents * st('transfer').opacity * Math.min(1, st('transfer').print * 1.4)}>
          {TRANSFER_INSIDE.agents.map((a, i) => (
            <TransferAgent key={i} at={a.at} variant={i as 0 | 1 | 2} />
          ))}
        </g>
      )}
      {/* the simulated roles, named in plain words: no company names, always dashed */}
      {TRANSFER_INSIDE.agents.map((a, i) => {
        const o = typeof agentLabels === 'number' ? agentLabels : (agentLabels[i] ?? 0);
        if (o <= 0) return null;
        return <Label key={a.label} text={a.label} at={a.labelAt} anchor="start" size={TRANSFER_AGENT_LABEL_SIZE} color={COLOR.cobalt} opacity={o} rise={1 - Math.min(1, o)} />;
      })}
      {KEYS.map((k) => {
        const s = st(k);
        if (s.name <= 0 && s.status <= 0 && !(k === 'transfer' && noInsurer > 0)) return null;
        const { name, anchor } = ROOM_LABEL[k];
        const [x, y] = name;
        const gapNameStatus = statusW * 1.55;
        const gapStatus = statusW * 1.4;
        // Above Retain and Transfer the stack grows upwards from y, with Transfer's second line reserved,
        // so nothing moves when NO INSURER ON PRIORA YET arrives. Beside Mitigate it grows downwards.
        const lines = k === 'transfer' ? 2 : 1;
        const firstStatusY = k === 'mitigate' ? y + gapNameStatus : y - gapStatus * (lines - 1);
        const nameY = k === 'mitigate' ? y : firstStatusY - gapNameStatus;
        return (
          <g key={k}>
            {s.name > 0 && <Words text={NAME[k]} at={[x, nameY]} anchor={anchor} readablePx={ROOM_NAME_PX} weight={600} opacity={s.name} rise={1 - Math.min(1, s.name)} />}
            {s.status > 0 && (
              <Label text={STATUS[k]} at={[x, firstStatusY]} anchor={anchor} readablePx={ROOM_STATUS_PX} color={k === 'transfer' ? COLOR.cobalt : COLOR.ink} opacity={s.status} rise={1 - Math.min(1, s.status)} />
            )}
            {k === 'transfer' && noInsurer > 0 && (
              <Label text="NO INSURER ON PRIORA YET" at={[x, firstStatusY + gapStatus]} anchor={anchor} readablePx={ROOM_STATUS_PX} opacity={noInsurer} rise={1 - Math.min(1, noInsurer)} color={COLOR.cobalt} />
            )}
          </g>
        );
      })}
    </g>
  );
};
