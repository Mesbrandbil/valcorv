// Sequence 3 and the start of Sequence 4: the fine connection between Priora and the case, the summons
// threads, short echoes behind moving agents, the five checks at the table, and the five findings that
// leave through the entrance, collect beside Priora and each become an arc of the ring (src/film/findings.ts).
import React from 'react';
import { COLOR, STROKE_PX } from '../../lib/tokens';
import { arrive, ease, lerp, prog } from '../../lib/motion';
import { annulusSector, polar, type Pt } from '../../lib/geometry';
import { CASE, CASE_TABLE_SCALE, FACET_ANGLE, PANEL, type AgentKey, type FacetKey } from '../../lib/layout';
import { S3, S4 } from '../../lib/timeline';
import { usePx } from '../../camera/Camera';
import { DrawnLine } from '../../cast/lines';
import { Specialist } from '../../cast/agents';
import { caseAt, casePos, prioraPos, SUMMON_ORDER, summonT0 } from '../cast';
import { findingMarksAt, LAST_ARC_FRAME, MARK_SCALE } from '../findings';
import { echoesAt, agentAt } from '../panel';

const START: Record<AgentKey, Pt> = {
  evidence: [2860, 1820],
  riskEng: [2860, 1180],
  siteRules: [2380, 560],
  fire: [2860, 2080],
  insurer: [2860, 1500],
};

const facetAtTable = (k: FacetKey, r = CASE.facetOpenR): Pt => polar(PANEL.c, r * CASE_TABLE_SCALE, FACET_ANGLE[k]);

/** A fine straight connection between two round things, from edge to edge. */
const between = (a: Pt, ra: number, b: Pt, rb: number) => {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const ux = (b[0] - a[0]) / d;
  const uy = (b[1] - a[1]) / d;
  return `M ${(a[0] + ux * ra).toFixed(1)} ${(a[1] + uy * ra).toFixed(1)} L ${(b[0] - ux * rb).toFixed(1)} ${(b[1] - uy * rb).toFixed(1)}`;
};

const Mark: React.FC<{ at: Pt; facing: number; opacity: number }> = ({ at, facing, opacity }) => (
  <g transform={`translate(${at[0].toFixed(1)} ${at[1].toFixed(1)}) rotate(${facing.toFixed(1)}) scale(${MARK_SCALE})`} opacity={opacity}>
    <path d={annulusSector([0, 0], 11, 17, -28, 28)} fill={COLOR.cobalt} />
  </g>
);

export const Seq3Overlay: React.FC<{ f: number }> = ({ f }) => {
  const px = usePx();
  if (f < 640 || f > LAST_ARC_FRAME + 2) return null;
  const pr = prioraPos(f);
  const cs = casePos(f);
  // the fine connection ends on the case's thin ring, between its facets
  const caseR = CASE.ringR * (caseAt(f)?.scale ?? 1) + 1;
  // the fine connection: from the travel, through the wait outside, to the case at the table
  const link = prog(f, S3.travel[0], S3.travel[0] + 10) * (1 - prog(f, S4.linkOut[0], S4.linkOut[1]));
  const items: React.ReactNode[] = [];
  if (link > 0) items.push(<path key="link" d={between(pr, 54, cs, caseR)} stroke={COLOR.cobalt} strokeWidth={px(STROKE_PX.thread * 0.75)} fill="none" opacity={0.7 * link} />);

  // summons threads: the facet pulses and a thread reaches outwards to where the agent will come from
  for (const k of SUMMON_ORDER) {
    const t0 = summonT0(k);
    const reach = prog(f, t0 + 4, t0 + 16) * (1 - prog(f, t0 + 26, t0 + 34));
    if (reach > 0) {
      // from the case's edge towards where the agent comes from; once the agent is in view the tip meets it
      const ag = agentAt(k, f);
      const target = ag ? ag.at : START[k];
      const dir = (Math.atan2(target[1] - cs[1], target[0] - cs[0]) * 180) / Math.PI;
      const from = polar(cs, CASE.ringR * (caseAt(f)?.scale ?? 1) + 3, dir);
      const meet = ag ? prog(f, t0 + 12, t0 + 18) : 0;
      const tip = polar(target, -40, dir);
      const to: Pt = [lerp(lerp(from[0], START[k][0], 0.55), tip[0], meet), lerp(lerp(from[1], START[k][1], 0.55), tip[1], meet)];
      const d = `M ${from[0].toFixed(1)} ${from[1].toFixed(1)} L ${to[0].toFixed(1)} ${to[1].toFixed(1)}`;
      items.push(<DrawnLine key={`summon-${k}`} d={d} progress={reach} color={COLOR.cobalt} px={STROKE_PX.thread * 0.75} opacity={0.8} />);
    }
  }

  // short-lived echoes behind moving agents
  for (const [i, e] of echoesAt(f).entries()) {
    items.push(<Specialist key={`echo-${i}`} kind={e.k} at={e.at} rotation={e.rotation} opacity={e.opacity} state={e.state} />);
  }

  // the checks
  // Evidence check frames the bracket image
  const ev = prog(f, S3.checkEvidence[0], S3.checkEvidence[0] + 14, arrive) * (1 - prog(f, S3.marksLeave[0], S3.marksLeave[0] + 10));
  if (ev > 0) {
    const [x, y] = facetAtTable('photo');
    const c = 30;
    const l = 10 * ev;
    items.push(
      <g key="ev" stroke={COLOR.cobalt} strokeWidth={px(2.2)} fill="none" strokeLinecap="round" opacity={ev}>
        {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], i) => (
          <path key={i} d={`M ${x + sx * c} ${y + sy * (c - l)} L ${x + sx * c} ${y + sy * c} L ${x + sx * (c - l)} ${y + sy * c}`} />
        ))}
        {/* the aperture centres on the crack */}
        <circle cx={x - 3} cy={y + 3} r={4 + 2 * (1 - ev)} strokeWidth={px(1.6)} />
      </g>,
    );
  }
  // Risk engineering draws a fine dashed radius round the packing line facet
  const re = prog(f, S3.checkRiskEng[0] + 4, S3.checkRiskEng[1]) ;
  const reOut = 1 - prog(f, S3.marksLeave[0], S3.marksLeave[0] + 10);
  if (re > 0 && reOut > 0) {
    const [x, y] = facetAtTable('packingLine');
    const r = 30;
    items.push(<DrawnLine key="re" d={`M ${x} ${y - r} A ${r} ${r} 0 1 1 ${x - 0.01} ${y - r}`} progress={re} dashed color={COLOR.cobalt} px={1.6} opacity={reOut} />);
  }
  // Site rules places a short horizontal mark beside the job
  const sr = prog(f, S3.checkSiteRules[0] + 6, S3.checkSiteRules[1]) * (1 - prog(f, S3.marksLeave[0], S3.marksLeave[0] + 10));
  // under the core, inside the thin ring and off the line of Priora's connection
  if (sr > 0) items.push(<line key="sr" x1={PANEL.c[0] - 11 * sr} y1={PANEL.c[1] + 20} x2={PANEL.c[0] + 11 * sr} y2={PANEL.c[1] + 20} stroke={COLOR.cobalt} strokeWidth={px(3)} strokeLinecap="round" />);
  // Fire sends a small pulse along its edge
  const firePulse = prog(f, S3.checkFire[0] + 8, S3.checkFire[1]);
  const fire = agentAt('fire', f);
  if (fire && firePulse > 0 && firePulse < 1) {
    const a0 = (fire.rotation ?? 0) + 30 + 300 * ease(firePulse);
    items.push(<path key="fp" d={`M ${polar(fire.at, 34, a0).join(' ')} A 34 34 0 0 1 ${polar(fire.at, 34, a0 + 40).join(' ')}`} stroke={COLOR.cobalt} strokeWidth={px(2.2)} fill="none" strokeLinecap="round" opacity={Math.sin(Math.PI * firePulse)} />);
  }
  // Insurer conditions closes its two brackets round the conditions facet
  const ins = prog(f, S3.checkInsurer[0] + 4, S3.checkInsurer[0] + 16, arrive) * (1 - prog(f, S3.marksLeave[0], S3.marksLeave[0] + 10));
  if (ins > 0) {
    const [x, y] = facetAtTable('conditions');
    const g = lerp(34, 26, ins);
    items.push(
      <g key="ins" stroke={COLOR.cobalt} strokeWidth={px(2.4)} fill="none" opacity={ins}>
        <path d={`M ${x - g + 7} ${y - 20} H ${x - g} V ${y + 20} H ${x - g + 7}`} />
        <path d={`M ${x + g - 7} ${y - 20} H ${x + g} V ${y + 20} H ${x + g - 7}`} />
      </g>,
    );
  }

  // the five findings (src/film/findings.ts)
  for (const m of findingMarksAt(f)) items.push(<Mark key={`mark-${m.k}`} at={m.at} facing={m.facing} opacity={m.opacity} />);

  return <g>{items}</g>;
};
