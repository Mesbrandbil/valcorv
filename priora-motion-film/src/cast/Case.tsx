import React from 'react';
import { COLOR, DASH_PX } from '../lib/tokens';
import { ink, SEEDS } from '../lib/texture';
import { annulusSector, arcPath, polar, type Pt } from '../lib/geometry';
import { ARC_SPAN, CASE, FACET_ANGLE, FACET_LABEL, GAP, type AgentKey, type FacetKey } from '../lib/layout';
import { usePx } from '../camera/Camera';
import { Label } from '../lib/text';

export type FacetMode = 'open' | 'folded' | 'tucked';
export type FacetState = { visible?: number; filled?: boolean };
export type ArcState = { opacity?: number; rotate?: number; out?: number; dashed?: boolean };

export type CaseProps = {
  at: Pt;
  scale?: number;
  opacity?: number;
  ring?: number; // thin ring draw progress, 0 to 1
  core?: number;
  facetMode?: FacetMode;
  facets?: Partial<Record<FacetKey, FacetState>>;
  chipLabels?: { size: number; opacity?: number };
  findings?: { radius?: number; opacity?: number; arcs?: Partial<Record<AgentKey, ArcState>> };
  coralEnds?: number;
  bridge?: { opacity: number; dashed?: boolean };
  piece?: { span: number; dashed: boolean; opacity?: number };
  transferAside?: number;
};

const JOINT = 0.7; // degrees trimmed from each end of a findings arc

const FACET_R: Record<FacetMode, number> = { open: CASE.facetOpenR, folded: CASE.facetFoldedR, tucked: CASE.facetTuckedR };
const CHIP_R: Record<FacetMode, number> = { open: CASE.chipR, folded: 7, tucked: 5.5 };

/** The small paper-coloured mark inside each facet chip. Drawn for a chip of radius 16. */
const FacetMark: React.FC<{ k: FacetKey; filled?: boolean }> = ({ k, filled }) => {
  const s = { fill: 'none', stroke: COLOR.paper, strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (k) {
    case 'repair': return <path d="M -5 -7 V 5 H 7" {...s} />;
    case 'hotWork': return <path d="M 0 -8 L 2 -2 L 8 0 L 2 2 L 0 8 L -2 2 L -8 0 L -2 -2 Z" fill={COLOR.paper} />;
    case 'packingLine': return <path d="M -7 -1 V -7 H -1 M 7 1 V 7 H 1" {...s} />;
    case 'nightShift': return <path d={`${arcPath([0, 0], 7, -70, 200)} M 0 0 V -5`} {...s} />;
    case 'conditions': return <path d="M -7 -3.5 H 7 M -7 3.5 H 3" {...s} />;
    case 'photo': return filled ? <PhotoMini /> : null;
  }
};

/** The bracket photo, shrunk into its facet. */
const PhotoMini: React.FC = () => (
  <g>
    <rect x={-9} y={-7} width={18} height={14} fill={COLOR.paper} />
    <path d="M -5 -4 V 4 H 5" fill="none" stroke={COLOR.ink} strokeWidth={2.4} />
    <path d="M -6.5 3 L -3.5 5.5" stroke={COLOR.paper} strokeWidth={1.2} />
  </g>
);

const chipAnchor = (a: number): 'start' | 'middle' | 'end' => {
  if (a === 90) return 'start';
  const x = Math.cos((a * Math.PI) / 180);
  return x > 0.3 ? 'start' : x < -0.3 ? 'end' : 'middle';
};

/** Where a chip's label sits: outward from the chip, except the bottom chip, whose label sits to its right. */
const chipLabelAt = (fr: number, cr: number, a: number, size: number): Pt => {
  if (a === 90) {
    const [x, y] = polar([0, 0], fr, a);
    return [x + cr + 12, y + size * 0.36];
  }
  const [x, y] = polar([0, 0], fr + cr + 10, a);
  return [x, y + size * 0.36];
};

export const Case: React.FC<CaseProps> = ({
  at,
  scale = 1,
  opacity = 1,
  ring = 1,
  core = 1,
  facetMode = 'folded',
  facets = {},
  chipLabels,
  findings,
  coralEnds = 0,
  bridge,
  piece,
  transferAside = 0,
}) => {
  const px = usePx();
  const dash = `${px(DASH_PX[0]) / scale} ${px(DASH_PX[1]) / scale}`;
  const fr = FACET_R[facetMode];
  const cr = CHIP_R[facetMode];
  const R = findings?.radius ?? CASE.findingsR;
  const half = CASE.arcW / 2;
  const g0 = GAP.centre - GAP.half;
  const g1 = GAP.centre + GAP.half;
  const ringLen = 2 * Math.PI * CASE.ringR;

  return (
    <g transform={`translate(${at[0]} ${at[1]}) scale(${scale})`} opacity={opacity}>
      {/* findings ring */}
      {findings && (findings.opacity ?? 1) > 0 && (
        <g opacity={findings.opacity ?? 1}>
          {(Object.keys(ARC_SPAN) as AgentKey[]).map((k) => {
            const st = findings.arcs?.[k] ?? {};
            if ((st.opacity ?? 1) <= 0) return null;
            const [a0, a1] = ARC_SPAN[k];
            const rot = st.rotate ?? 0;
            const rr = R + (st.out ?? 0);
            if (st.dashed) {
              return (
                <path key={k} d={arcPath([0, 0], rr, a0 + rot + 2, a1 + rot - 2)} fill="none" stroke={COLOR.cobalt} strokeWidth={CASE.arcW * 0.42} strokeDasharray={dash} opacity={st.opacity ?? 1} />
              );
            }
            // a hairline joint between neighbouring arcs keeps the five findings readable as five pieces
            return <path key={k} d={annulusSector([0, 0], rr - half, rr + half, a0 + rot + JOINT, a1 + rot - JOINT)} fill={COLOR.cobalt} filter={ink('cobalt', SEEDS.caseArcs)} opacity={st.opacity ?? 1} />;
          })}
          {coralEnds > 0 && (
            <g fill={COLOR.coral} opacity={coralEnds} filter={ink('coral', SEEDS.coralBridge)}>
              <path d={annulusSector([0, 0], R - half - 0.5, R + half + 0.5, g0 - 6, g0)} />
              <path d={annulusSector([0, 0], R - half - 0.5, R + half + 0.5, g1, g1 + 6)} />
            </g>
          )}
          {piece && (piece.opacity ?? 1) > 0 && (
            <path
              d={annulusSector([0, 0], R - half, R + half, g0, g0 + (g1 - g0) * piece.span)}
              fill={COLOR.cobalt}
              fillOpacity={piece.dashed ? 0.28 : 1}
              stroke={piece.dashed ? COLOR.cobalt : 'none'}
              strokeWidth={px(2) / scale}
              strokeDasharray={piece.dashed ? dash : undefined}
              filter={piece.dashed ? undefined : ink('cobalt', SEEDS.caseArcs)}
              opacity={piece.opacity ?? 1}
            />
          )}
          {bridge && bridge.opacity > 0 && (
            <g opacity={bridge.opacity}>
              <path
                d={annulusSector([0, 0], R + half + 4, R + half + 11, g0 - 3, g1 + 3)}
                fill={COLOR.coral}
                fillOpacity={bridge.dashed ? 0.2 : 1}
                stroke={bridge.dashed ? COLOR.coral : 'none'}
                strokeWidth={px(1.6) / scale}
                strokeDasharray={bridge.dashed ? dash : undefined}
                filter={bridge.dashed ? undefined : ink('coral', SEEDS.coralBridge)}
              />
              {[g0 - 1, g1 + 1].map((a, i) => {
                const [x0, y0] = polar([0, 0], R + half + 4, a);
                const [x1, y1] = polar([0, 0], R - half + 1, a);
                return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={COLOR.coral} strokeWidth={3} strokeLinecap="round" />;
              })}
            </g>
          )}
        </g>
      )}

      {/* the thin ring and the core: the actual job */}
      <circle
        r={CASE.ringR}
        fill="none"
        stroke={COLOR.cobalt}
        strokeWidth={CASE.ringW}
        strokeDasharray={`${ringLen * ring} ${ringLen}`}
        transform="rotate(-90)"
        strokeLinecap="round"
      />
      <circle r={CASE.coreR} fill={COLOR.ink} opacity={core} />

      {/* facets */}
      {(Object.keys(FACET_ANGLE) as FacetKey[]).map((k) => {
        const st = facets[k];
        const vis = st?.visible ?? 1;
        if (vis <= 0) return null;
        const a = FACET_ANGLE[k];
        const [x, y] = polar([0, 0], fr, a);
        // the photo position stays empty only until the photo arrives in Sequence 2
        const empty = k === 'photo' && st?.filled === false;
        return (
          <g key={k} opacity={vis}>
            <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
              {empty ? (
                <g>
                  <circle r={cr} fill="none" stroke={COLOR.cobalt} strokeWidth={px(2) / scale} strokeDasharray={dash} />
                  {facetMode === 'open' && (
                    <text y={6} textAnchor="middle" fontFamily="IBM Plex Mono" fontWeight={500} fontSize={16} fill={COLOR.coral}>
                      ?
                    </text>
                  )}
                </g>
              ) : (
                <g>
                  <circle r={cr} fill={COLOR.cobalt} filter={ink('cobalt', SEEDS.caseChips)} />
                  {facetMode === 'open' && <FacetMark k={k} filled={st?.filled} />}
                </g>
              )}
            </g>
            {chipLabels && facetMode === 'open' && (
              <Label
                text={FACET_LABEL[k]}
                at={chipLabelAt(fr, cr, a, chipLabels.size)}
                anchor={chipAnchor(a)}
                size={chipLabels.size}
                opacity={chipLabels.opacity ?? 1}
              />
            )}
          </g>
        );
      })}

      {/* the dashed answers from the Transfer inquiry, kept off to one side */}
      {transferAside > 0 && (
        <g opacity={transferAside} transform={`translate(${R + 40} ${-34})`}>
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={-9}
              y={-9 + i * 22}
              width={18}
              height={18}
              fill="none"
              stroke={COLOR.cobalt}
              strokeWidth={px(1.8) / scale}
              strokeDasharray={`${px(4) / scale} ${px(3) / scale}`}
            />
          ))}
        </g>
      )}
    </g>
  );
};

/** The photo the worker sends: a monochrome L-shaped bracket with a clear crack at its bend. */
export const PhotoCard: React.FC<{ at: Pt; scale?: number; opacity?: number; rotation?: number }> = ({ at, scale = 1, opacity = 1, rotation = 0 }) => (
  <g transform={`translate(${at[0]} ${at[1]}) rotate(${rotation}) scale(${scale})`} opacity={opacity}>
    <rect x={-44} y={-33} width={88} height={66} fill={COLOR.paper} stroke={COLOR.ink} strokeWidth={2.5} />
    <rect x={-38} y={-27} width={76} height={54} fill={COLOR.cream} />
    <path d="M -18 -18 V 14 H 22" fill="none" stroke={COLOR.ink} strokeWidth={10} strokeLinejoin="miter" />
    <circle cx={-18} cy={-9} r={2.4} fill={COLOR.cream} />
    <circle cx={12} cy={14} r={2.4} fill={COLOR.cream} />
    {/* the crack, clear at the bend */}
    <path d="M -25 6 L -19.5 9.5 L -17 7 L -11.5 13 L -9 11 L -6 19" fill="none" stroke={COLOR.cream} strokeWidth={2.6} strokeLinejoin="miter" />
  </g>
);
