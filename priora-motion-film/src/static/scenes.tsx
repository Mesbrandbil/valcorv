import React from 'react';
import { SHOTS, type ShotName } from '../camera/shots';
import type { WorldState } from '../world/World';
import { COLOR, CONTEXT_OPACITY as DIM } from '../lib/tokens';
import { Label, Words, Wordmark } from '../lib/text';
import { polar } from '../lib/geometry';
import {
  BARRIER,
  BARRIER_LABEL,
  PRIORA_PAUSE,
  RISK_OWNER_DECIDES,
  SHORT_LIST,
  CASE_A,
  CASE_TABLE_SCALE,
  CASE_WAIT,
  FACET_ANGLE,
  MITIGATE_INSIDE,
  PACKET_DOCK,
  PANEL,
  PRIORA_CASE,
  PRIORA_PANEL,
  RECORD,
  RETAIN_INSIDE,
  RULERS,
  SEAT_OF,
  TRANSFER_INSIDE,
  VOICE,
  WORKER,
  humanLoop,
  humanPathTo,
  type AgentKey,
  type FacetKey,
} from '../lib/layout';
import { Thread } from '../cast/lines';
import { PhotoCard } from '../cast/Case';
import { RoomAgent, Safeguard } from '../cast/agents';
import { usePx } from '../camera/Camera';

type Seated = { opacity: number; nameOpacity: number; state?: Record<string, number> };
const allAgents = (nameOpacity = 1, extra: Partial<Record<AgentKey, Record<string, number>>> = {}): Record<AgentKey, Seated> =>
  Object.fromEntries((Object.keys(SEAT_OF) as AgentKey[]).map((k) => [k, { opacity: 1, nameOpacity, state: extra[k] }])) as unknown as Record<AgentKey, Seated>;

const allFacets = (filledPhoto = true) =>
  Object.fromEntries((Object.keys(FACET_ANGLE) as FacetKey[]).map((k) => [k, { visible: 1, filled: k === 'photo' ? filledPhoto : undefined }]));

const lockedArcs = {};
const gapArcs = { insurer: { dashed: true, rotate: 8, out: 6, opacity: 0.9 } };
const packetArcs = { insurer: { opacity: 0 } };

const shot = (n: ShotName) => SHOTS[n];

/** A small helper for world-space overlays that need screen-constant strokes. */
const Rulers: React.FC = () => {
  const px = usePx();
  return (
    <g>
      <Label text="FIRE WATCH PLANNED: 30 MIN" at={[RULERS.x0, RULERS.label1Y]} anchor="start" size={RULERS.size} color={COLOR.coral} />
      <line x1={RULERS.x0} y1={RULERS.ruler1Y} x2={RULERS.x0 + RULERS.short} y2={RULERS.ruler1Y} stroke={COLOR.ink} strokeWidth={px(3)} strokeLinecap="round" />
      <Label text="POLICY ASKS: 60 MIN" at={[RULERS.x0, RULERS.label2Y]} anchor="start" size={RULERS.size} color={COLOR.coral} />
      <line x1={RULERS.x0} y1={RULERS.ruler2Y} x2={RULERS.x0 + RULERS.long} y2={RULERS.ruler2Y} stroke={COLOR.ink} strokeWidth={px(3)} strokeDasharray={`${px(10)} ${px(7)}`} />
      {[RULERS.ruler1Y, RULERS.ruler2Y].map((y) => (
        <line key={y} x1={RULERS.x0} y1={y - 8} x2={RULERS.x0} y2={y + 8} stroke={COLOR.ink} strokeWidth={px(2)} />
      ))}
    </g>
  );
};

const Barrier: React.FC = () => {
  const px = usePx();
  const [x, y] = BARRIER;
  return (
    <g>
      {/* an incomplete barrier across the route: one post, half a bar, the second post never drawn */}
      <path d={`M ${x - 22} ${y + 46} V ${y - 46} H ${x + 6}`} stroke={COLOR.greyText} strokeWidth={px(2.4)} strokeDasharray={`${px(10)} ${px(7)}`} fill="none" />
      <Label text="NO HARD STOP CONFIGURED" at={BARRIER_LABEL} anchor="start" size={28} color={COLOR.greyText} />
    </g>
  );
};

const VoiceNote: React.FC = () => {
  const px = usePx();
  const bars = Array.from({ length: 112 }, (_, i) => {
    const x = VOICE.waveX0 + (i * (VOICE.waveX1 - VOICE.waveX0)) / 112;
    const env = Math.sin((i / 112) * Math.PI) ** 0.5 * (0.45 + 0.55 * Math.abs(Math.sin(i * 0.71) * Math.cos(i * 0.23)));
    const h = 3 + VOICE.waveAmp * env;
    return <line key={i} x1={x} y1={VOICE.waveY - h} x2={x} y2={VOICE.waveY + h} stroke={COLOR.ink} strokeWidth={px(2.2)} strokeLinecap="round" />;
  });
  return (
    <g>
      <path d={`M ${WORKER.phoneRaised[0] + 8} ${WORKER.phoneRaised[1] - 12} C ${WORKER.phoneRaised[0] + 10} ${VOICE.waveY + 30}, ${VOICE.waveX0 - 14} ${VOICE.waveY}, ${VOICE.waveX0} ${VOICE.waveY}`} stroke={COLOR.ink} strokeWidth={px(2)} fill="none" />
      {bars}
      {VOICE.lines.map((t, i) => (
        <Words key={t} text={t} at={[VOICE.textX, VOICE.baselines[i]]} anchor="start" size={VOICE.size} />
      ))}
    </g>
  );
};

const RetainInside: React.FC = () => {
  const px = usePx();
  const [cx, cy] = RETAIN_INSIDE.packet;
  return (
    <g>
      {[[-96, 40], [92, 44], [8, -98]].map(([dx, dy], i) => (
        <RoomAgent key={i} at={[cx + dx, cy + dy]} variant={i as 0 | 1 | 2} />
      ))}
      {RETAIN_INSIDE.leaders.map((l, i) => {
        const tx = l.at[0] + (l.anchor === 'end' ? 8 : -8);
        const ty = l.at[1] - 8;
        const [sx, sy] = polar(RETAIN_INSIDE.packet, 80, (Math.atan2(ty - cy, tx - cx) * 180) / Math.PI);
        return (
          <g key={i}>
            <line x1={sx} y1={sy} x2={tx} y2={ty} stroke={COLOR.ink} strokeWidth={px(1.4)} />
            <Label text={l.text} at={l.at} anchor={l.anchor} size={24} />
          </g>
        );
      })}
      <Label text="AN AGENT CANNOT CHOOSE IT" at={RETAIN_INSIDE.agentCannot} size={24} />
      <Label text="RISK OWNER" at={RETAIN_INSIDE.riskOwnerLabel} anchor="start" size={24} />
    </g>
  );
};

const MitigateInside: React.FC<{ corners?: boolean }> = ({ corners }) => {
  const px = usePx();
  const [cx, cy] = MITIGATE_INSIDE.packet;
  return (
    <g>
      {MITIGATE_INSIDE.safeguards.map((s) => (
        <g key={s.key}>
          <Safeguard variant={s.key as 'thermal' | 'watch' | 'workshop'} at={s.at} cost={s.cost} time={s.time} />
          <Words text={s.name[0]} lines={s.name} at={[s.at[0], s.at[1] + 62]} size={22} />
        </g>
      ))}
      {corners && (
        <g stroke={COLOR.cobalt} strokeWidth={px(2.4)} fill="none" strokeLinecap="round">
          {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], i) => {
            const c = 96;
            return <path key={i} d={`M ${cx + sx * c} ${cy + sy * (c - 16)} L ${cx + sx * c} ${cy + sy * c} L ${cx + sx * (c - 16)} ${cy + sy * c}`} />;
          })}
        </g>
      )}
      <Label text="FULL" at={MITIGATE_INSIDE.resultLabel} anchor="start" size={MITIGATE_INSIDE.resultSize} />
      <Label text="BACK INSIDE" at={[MITIGATE_INSIDE.resultLabel[0], MITIGATE_INSIDE.resultLabel[1] + 34]} anchor="start" size={MITIGATE_INSIDE.resultSize} />
    </g>
  );
};

const TransferInside: React.FC = () => {
  const px = usePx();
  const [ax, ay] = TRANSFER_INSIDE.answers;
  const items = ['ELIGIBILITY', 'TERMS', 'SAFEGUARDS', 'PRICE ?'];
  return (
    <g>
      {TRANSFER_INSIDE.agents.map((a, i) => (
        <Thread key={i} d={`M ${TRANSFER_INSIDE.packet[0]} ${TRANSFER_INSIDE.packet[1]} L ${a.at[0]} ${a.at[1]}`} dashed opacity={0.5} />
      ))}
      {items.map((t, i) => (
        <g key={t}>
          <rect x={ax} y={ay + i * 40 - 18} width={22} height={22} fill="none" stroke={COLOR.cobalt} strokeWidth={px(1.6)} strokeDasharray={`${px(4)} ${px(3)}`} />
          <Label text={t} at={[ax + 34, ay + i * 40]} anchor="start" size={24} color={COLOR.cobalt} />
        </g>
      ))}
    </g>
  );
};

/** Every Step 2 still: the world at rest, plus representative moments for checking placement. */
export const SCENES: Record<string, WorldState> = {
  sheet: {
    shot: shot('S8_SHEET'),
    real: { labels: 0, record: { line: 1, marks: 2 }, spark: 0.8 },
    panel: { titleOpacity: 0, ghostOpacity: 0, agents: allAgents(0) },
    rooms: { labels: 1 },
    routes: { work: 1, escalate: 1, escalateOpacity: 0.5 },
    priora: { at: [2980, 1050], beadAngle: 90 },
    case: { at: [RECORD.mark2, RECORD.y - 40], scale: 0.5, facetMode: 'tucked', findings: { radius: 58, arcs: packetArcs }, piece: { span: 0.45, dashed: false }, bridge: { opacity: 1 } },
    overlay: <Label text="A DESIGN PROPOSAL" at={[2980, 560]} size={62} />,
  },
  real: {
    shot: shot('S1_REAL'),
    real: { labels: 1, record: { line: 1, marks: 2, keptLabel: 0 }, spark: 0.9 },
    panel: null,
    rooms: null,
  },
  voice: {
    shot: shot('S2_VOICE'),
    real: { labels: 1, phone: 'raised', record: { line: 0, marks: 0 } },
    panel: null,
    rooms: null,
    // the message is complete, so the listening thread has already withdrawn
    priora: { at: VOICE.prioraListen, beadAngle: 45 },
    overlay: <VoiceNote />,
  },
  'case assembly': {
    shot: shot('S2_CASE'),
    real: { labels: 0, phone: 'tilted', record: { line: 0, marks: 0 }, figures: { worker: 1, site: 1, riskOwner: DIM } },
    panel: null,
    rooms: null,
    priora: { at: PRIORA_CASE, beadAngle: 120 },
    case: { at: CASE_A, facetMode: 'open', facets: allFacets(false), chipLabels: { size: 18 } },
    overlay: (
      <g>
        <Thread d={`M ${2890} ${2186} L ${2890} ${CASE_A[1] + 108}`} />
        <Words text="Photo of the bracket?" at={[2540, 1890]} anchor="end" size={32} />
        <PhotoCard at={[2690, 2020]} scale={0.8} />
      </g>
    ),
  },
  panel: {
    shot: shot('S3_PANEL'),
    real: { labels: 0, record: { line: 0, marks: 0 } },
    panel: { agents: allAgents(1) },
    rooms: null,
    priora: { at: PRIORA_PANEL, beadAngle: 180 },
    case: { at: CASE_WAIT, facetMode: 'folded' },
  },
  table: {
    shot: shot('S3_TABLE'),
    real: { labels: 0, record: { line: 0, marks: 0 } },
    panel: { titleOpacity: 0, agents: allAgents(1, { insurer: { closed: 1 }, riskEng: { open: 1 } }) },
    rooms: null,
    priora: { at: PRIORA_PANEL, beadAngle: 180 },
    case: { at: PANEL.c, scale: CASE_TABLE_SCALE, facetMode: 'open', facets: allFacets(true) },
    overlay: <Label text="FIRE WATCH?" at={[1560, 1770]} anchor="start" readablePx={25} />,
  },
  ring: {
    shot: shot('S4_CASE'),
    real: { labels: 0, record: { line: 0, marks: 0 } },
    panel: { titleOpacity: 0, ghostOpacity: 0, agents: allAgents(0) },
    rooms: null,
    case: { at: PANEL.c, scale: CASE_TABLE_SCALE, facetMode: 'folded', findings: { arcs: lockedArcs } },
    overlay: <Label text="INSIDE THE CONDITIONS" at={[PANEL.c[0], 1660]} size={24} />,
  },
  route: {
    shot: shot('S4_ROUTE'),
    real: { labels: 1, record: { line: 1, marks: 1, keptLabel: 1 }, noOneDisturbed: 1, spark: 1 },
    panel: { titleOpacity: 0, ghostOpacity: 0, agents: allAgents(0) },
    rooms: null,
    routes: { work: 1 },
    priora: { at: PRIORA_PAUSE, beadAngle: 40 },
    case: { at: PANEL.c, scale: CASE_TABLE_SCALE, facetMode: 'folded', findings: { arcs: lockedArcs } },
  },
  gap: {
    shot: shot('S5_GAP'),
    real: { labels: 0, record: { line: 1, marks: 1, opacity: DIM }, spark: 1, figures: { worker: DIM, site: 1, riskOwner: DIM } },
    panel: { titleOpacity: 0, ghostOpacity: 0, agents: { ...allAgents(0), insurer: { opacity: 1, nameOpacity: 0, state: { apart: 4 } } } },
    rooms: null,
    routes: { work: 1 },
    priora: { at: PRIORA_PAUSE, beadAngle: 200 },
    case: { at: PANEL.c, scale: CASE_TABLE_SCALE, facetMode: 'folded', findings: { arcs: gapArcs }, coralEnds: 1 },
    overlay: (
      <g>
        <Rulers />
        <Barrier />
      </g>
    ),
  },
  desk: {
    shot: shot('S5_DESK'),
    routes: { work: 1, workOpacity: DIM },
    real: { labels: 0, record: { line: 1, marks: 1, opacity: DIM }, spark: 1, figures: { worker: DIM, site: DIM, riskOwner: 1 } },
    panel: null,
    rooms: null,
    humanLines: [{ d: humanLoop(false) }],
    priora: { at: [3600, 1960], beadAngle: 140 },
    case: { at: PACKET_DOCK, facetMode: 'tucked', findings: { radius: 58, arcs: packetArcs }, coralEnds: 1 },
    overlay: <Label text="RISK OWNER DECIDES" at={RISK_OWNER_DECIDES} anchor="start" readablePx={27} />,
  },
  rooms: {
    shot: shot('S6_ROOMS'),
    real: { labels: 0, record: { line: 1, marks: 1, opacity: DIM }, spark: 1, groundOpacity: DIM, figures: { worker: DIM, site: DIM, riskOwner: 1 } },
    panel: null,
    rooms: { labels: 1 },
    humanLines: [{ d: humanLoop(false) }],
    priora: { at: [3600, 1960], beadAngle: 30 },
    case: { at: PACKET_DOCK, facetMode: 'tucked', findings: { radius: 58, arcs: packetArcs }, coralEnds: 1 },
  },
  retain: {
    shot: shot('S6_RETAIN'),
    real: { labels: 0, record: { line: 1, marks: 1 } },
    panel: null,
    rooms: { labels: 1, focus: 'retain', thresholdClosed: { retain: false } },
    humanLines: [{ d: humanPathTo('retain') }],
    priora: { at: RETAIN_INSIDE.prioraAt, beadAngle: 200 },
    case: { at: RETAIN_INSIDE.packet, facetMode: 'tucked', findings: { radius: 58, arcs: packetArcs }, coralEnds: 1, bridge: { opacity: 1 } },
    overlay: <RetainInside />,
  },
  mitigate: {
    shot: shot('S6_MITIGATE'),
    real: { labels: 0, record: { line: 1, marks: 1 } },
    panel: null,
    rooms: { labels: 1, focus: 'mitigate', thresholdClosed: { mitigate: false } },
    humanLines: [{ d: humanPathTo('mitigate') }],
    priora: { at: MITIGATE_INSIDE.prioraAt, beadAngle: 120 },
    case: { at: MITIGATE_INSIDE.packet, facetMode: 'tucked', findings: { radius: 58, arcs: packetArcs }, coralEnds: 1, piece: { span: 1, dashed: true } },
    overlay: <MitigateInside corners />,
  },
  transfer: {
    shot: shot('S6_TRANSFER'),
    real: { labels: 0, record: { line: 1, marks: 1 } },
    panel: null,
    rooms: { labels: 1, focus: 'transfer', noInsurer: 1, agentLabels: 1, thresholdClosed: { transfer: false } },
    humanLines: [{ d: humanPathTo('transfer') }],
    priora: { at: TRANSFER_INSIDE.prioraAt, beadAngle: 330 },
    case: { at: TRANSFER_INSIDE.packet, facetMode: 'tucked', findings: { radius: 58, arcs: packetArcs }, coralEnds: 1 },
    overlay: <TransferInside />,
  },
  system: {
    shot: shot('S7_SYSTEM'),
    real: { labels: 0, record: { line: 1, marks: 1, opacity: DIM }, spark: 1, groundOpacity: DIM, figures: { worker: DIM, site: DIM, riskOwner: 1 } },
    panel: null,
    rooms: { labels: 1, noInsurer: 1 },
    humanLines: [{ d: humanLoop(true) }],
    priora: { at: [3740, 1990], beadAngle: 200 },
    case: { at: PACKET_DOCK, facetMode: 'tucked', findings: { radius: 58, arcs: packetArcs }, piece: { span: 0.45, dashed: false }, bridge: { opacity: 1 }, transferAside: 1 },
    overlay: (
      <g>
        <Label text="MITIGATE PART" at={SHORT_LIST} size={38} />
        <Label text="KEEP THE REST" at={[SHORT_LIST[0], SHORT_LIST[1] + 46]} size={38} />
        <Label text="RISK OWNER DECIDES" at={RISK_OWNER_DECIDES} anchor="start" readablePx={27} />
      </g>
    ),
  },
  // the last second of the film: only the wordmark on the paper
  closing: {
    shot: shot('S8_SHEET'),
    real: { ground: 0, labels: 0, figures: { worker: 0, site: 0, riskOwner: 0 }, record: { line: 0, marks: 0 } },
    panel: null,
    rooms: null,
    overlay: <Wordmark at={[SHOTS.S8_SHEET.x, SHOTS.S8_SHEET.y + 92]} size={260} />,
  },
};

export const SCENE_NAMES = Object.keys(SCENES);
