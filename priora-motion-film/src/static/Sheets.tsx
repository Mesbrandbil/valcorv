import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLOR, HEIGHT, WIDTH } from '../lib/tokens';
import { ALL_INKS, InkDefs } from '../lib/texture';
import { ZoomBox } from '../camera/Camera';
import { Label } from '../lib/text';
import { EvidenceCheck, Fire, Ghost, InsurerConditions, Priora, RiskEngineering, RoomAgent, Safeguard, SiteRules, TransferAgent } from '../cast/agents';
import { Case, PhotoCard, type CaseProps } from '../cast/Case';
import { RiskOwner, Site, Worker } from '../cast/people';
import { CASE_TABLE_SCALE, FACET_ANGLE, TRANSFER_AGENT_LABEL_SIZE, TRANSFER_INSIDE, type FacetKey } from '../lib/layout';
import { PaperDefs } from '../world/Paper';

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ backgroundColor: COLOR.paper }}>
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <defs>
        <InkDefs seeds={ALL_INKS} />
        <PaperDefs />
      </defs>
      <rect width={WIDTH} height={HEIGHT} fill="url(#paper-grain)" />
      {children}
    </svg>
  </AbsoluteFill>
);

const CAST: Array<{ name: string; draw: React.ReactNode }> = [
  { name: 'Priora', draw: <Priora at={[0, 0]} beadAngle={-40} /> },
  { name: 'Site rules', draw: <SiteRules at={[0, 0]} /> },
  { name: 'Insurer conditions', draw: <InsurerConditions at={[0, 0]} /> },
  { name: 'Fire', draw: <Fire at={[0, 0]} rotation={-90} /> },
  { name: 'Risk engineering', draw: <RiskEngineering at={[0, 0]} /> },
  { name: 'Evidence check', draw: <EvidenceCheck at={[0, 0]} /> },
  { name: 'Electrical', draw: <Ghost kind="Electrical" at={[0, 0]} opacity={0.6} /> },
  { name: 'Structural', draw: <Ghost kind="Structural" at={[0, 0]} opacity={0.6} /> },
  { name: 'Security', draw: <Ghost kind="Security" at={[0, 0]} opacity={0.6} /> },
  {
    name: 'Transfer agents',
    // stacked, each with its role label at its film size and place (to its right)
    draw: (
      <g>
        {TRANSFER_INSIDE.agents.map((a, i) => (
          <g key={a.label}>
            <TransferAgent at={[-30, (i - 1) * 64]} variant={i as 0 | 1 | 2} />
            <Label text={a.label} at={[14, (i - 1) * 64 + 8]} anchor="start" size={TRANSFER_AGENT_LABEL_SIZE} color={COLOR.cobalt} />
          </g>
        ))}
      </g>
    ),
  },
];

/** Every agent side by side, at three zoom levels: the wide sheet (0.37), the base (1.0) and the closest shot (1.7). */
export const CastSheet: React.FC = () => {
  const zooms = [0.37, 1.0, 1.75];
  const rowY = [150, 420, 800];
  const colX = (i: number) => 160 + i * 163;
  return (
    <Frame>
      {zooms.map((z, r) => (
        <g key={z}>
          <text x={24} y={rowY[r] + 6} fontFamily="IBM Plex Mono" fontSize={18} fill={COLOR.greyText}>
            {z.toFixed(2)}
          </text>
          {CAST.map((c, i) => (
            <ZoomBox key={c.name} at={[colX(i), rowY[r]]} zoom={z}>
              {c.draw}
            </ZoomBox>
          ))}
        </g>
      ))}
      {CAST.map((c, i) => (
        <text key={c.name} x={colX(i)} y={1010} textAnchor="middle" fontFamily="IBM Plex Sans" fontWeight={500} fontSize={20} fill={COLOR.ink}>
          {c.name}
        </text>
      ))}
    </Frame>
  );
};

/** The real-world silhouettes and the safeguards and room agents, at base zoom. */
export const PeopleSheet: React.FC = () => (
  <Frame>
    <ZoomBox at={[960, 560]} zoom={1.3}>
      <g transform={`translate(${-2880} ${-2230})`}>
        <line x1={2260} y1={2300} x2={3500} y2={2300} stroke={COLOR.ink} strokeWidth={2} />
        <Worker />
        <Site />
        <RiskOwner />
        <Worker phone="raised" opacity={1} />
      </g>
    </ZoomBox>
    <ZoomBox at={[300, 900]} zoom={1.3}>
      <Safeguard variant="thermal" at={[0, 0]} cost={1} time={0.3} />
      <Safeguard variant="watch" at={[190, 0]} cost={2} time={0.6} />
      <Safeguard variant="workshop" at={[380, 0]} cost={3} time={0.85} />
      <RoomAgent at={[560, 0]} variant={0} />
      <RoomAgent at={[600, 0]} variant={1} />
      <RoomAgent at={[640, 0]} variant={2} />
      <PhotoCard at={[780, 0]} />
    </ZoomBox>
  </Frame>
);

const all = (filledPhoto = true) =>
  Object.fromEntries((Object.keys(FACET_ANGLE) as FacetKey[]).map((k) => [k, { visible: 1, filled: k === 'photo' ? filledPhoto : undefined }]));
const packet = { insurer: { opacity: 0 } };

const STATES: Array<{ name: string; zoom: number; props: Omit<CaseProps, 'at'> }> = [
  { name: 'first circle', zoom: 1.4, props: { facets: Object.fromEntries((Object.keys(FACET_ANGLE) as FacetKey[]).map((k) => [k, { visible: 0 }])) } },
  { name: 'chips, photo missing', zoom: 1.4, props: { facetMode: 'open', facets: all(false), chipLabels: { size: 18 } } },
  { name: 'folded: CASE', zoom: 1.4, props: { facetMode: 'folded', facets: all(true) } },
  { name: 'open at the table', zoom: 1.1, props: { facetMode: 'open', facets: all(true) } },
  { name: 'ring locked', zoom: 1.75, props: { facetMode: 'folded', findings: {} } },
  { name: 'the gap', zoom: 1.75, props: { facetMode: 'folded', findings: { arcs: { insurer: { dashed: true, rotate: 8, out: 6, opacity: 0.9 } } }, coralEnds: 1 } },
  { name: 'packet', zoom: 1.3, props: { facetMode: 'tucked', findings: { radius: 58, arcs: packet }, coralEnds: 1 } },
  { name: 'Retain: bridged', zoom: 1.25, props: { facetMode: 'tucked', findings: { radius: 58, arcs: packet }, coralEnds: 1, bridge: { opacity: 1 } } },
  { name: 'Mitigate: PARTIAL', zoom: 1.25, props: { facetMode: 'tucked', findings: { radius: 58, arcs: packet }, coralEnds: 1, piece: { span: 0.45, dashed: true } } },
  { name: 'Mitigate: FULL', zoom: 1.25, props: { facetMode: 'tucked', findings: { radius: 58, arcs: packet }, coralEnds: 1, piece: { span: 1, dashed: true } } },
  { name: 'Sequence 7: proposed', zoom: 0.62, props: { facetMode: 'tucked', findings: { radius: 58, arcs: packet }, piece: { span: 0.45, dashed: true }, bridge: { opacity: 1, dashed: true }, transferAside: 1 } },
  { name: 'decided', zoom: 0.62, props: { facetMode: 'tucked', findings: { radius: 58, arcs: packet }, piece: { span: 0.45, dashed: false }, bridge: { opacity: 1 }, transferAside: 1 } },
];

// Cell centres and caption offsets, in the order of STATES. The labelled open state gets a wide cell in the first row.
const CELLS: Array<[number, number, number]> = [
  [150, 200, 185], [620, 200, 185], [1340, 200, 185], [1720, 200, 185],
  [240, 540, 185], [720, 540, 185], [1200, 540, 185], [1680, 540, 185],
  [240, 880, 130], [720, 880, 130], [1200, 880, 130], [1680, 880, 130],
];
const TABLE_STATES = new Set(['open at the table', 'ring locked', 'the gap']);

/** Every state of the case, each at the zoom and scale it is seen at in the film. */
export const CaseSheet: React.FC = () => (
  <Frame>
    {STATES.map((s, i) => {
      const [x, y, captionDy] = CELLS[i];
      const scale = TABLE_STATES.has(s.name) ? CASE_TABLE_SCALE : 1;
      return (
        <g key={s.name}>
          <ZoomBox at={[x, y]} zoom={s.zoom}>
            <Case at={[0, 0]} scale={scale} {...s.props} />
            {s.name === 'folded: CASE' && <Label text="CASE" at={[0, 100]} size={26} />}
          </ZoomBox>
          <text x={x} y={y + captionDy} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize={18} fill={COLOR.greyText}>
            {`${s.name} · ${s.zoom}`}
          </text>
          {scale !== 1 && (
            <text x={x} y={y + captionDy + 24} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize={18} fill={COLOR.greyText}>
              {`case scale ${scale}`}
            </text>
          )}
        </g>
      );
    })}
  </Frame>
);
