import React from 'react';
import { COLOR } from '../lib/tokens';
import { GROUND, NO_ONE_DISTURBED, REAL_LABELS, RECORD, RISK_OWNER, SITE, SPARK, WORKER } from '../lib/layout';
import { Label } from '../lib/text';
import { usePx } from '../camera/Camera';
import { ContactShadow, RiskOwner, Site, Spark, Worker, type PhonePose } from '../cast/people';
import { DrawnLine } from '../cast/lines';

export type RealWorldProps = {
  ground?: number;
  /** Opacity of the ground line, so it can recede with the figures it carries. */
  groundOpacity?: number;
  figures?: { worker?: number; site?: number; riskOwner?: number };
  phone?: PhonePose;
  raise?: number;
  tilt?: number;
  labels?: number | { worker?: number; site?: number; riskOwner?: number };
  record?: { line: number; marks: number; keptLabel?: number; opacity?: number };
  noOneDisturbed?: number;
  spark?: number;
};

export const RealWorld: React.FC<RealWorldProps> = ({
  ground = 1,
  groundOpacity = 1,
  figures = { worker: 1, site: 1, riskOwner: 1 },
  phone = 'rest',
  raise,
  tilt,
  labels = 1,
  record = { line: 1, marks: 2, keptLabel: 0 },
  noOneDisturbed = 0,
  spark = 0,
}) => {
  const px = usePx();
  const markTop = RECORD.y - RECORD.markHeight / 2;
  return (
    <g>
      <DrawnLine d={`M ${GROUND.x0} ${GROUND.y} H ${GROUND.x1}`} progress={ground} color={COLOR.ink} px={2.6} opacity={groundOpacity} />
      <ContactShadow at={WORKER.feet} w={70} opacity={figures.worker ?? 1} />
      <ContactShadow at={[SITE.base[0] + 8, SITE.base[1]]} w={330} opacity={figures.site ?? 1} />
      <ContactShadow at={[RISK_OWNER.base[0] + 6, RISK_OWNER.base[1]]} w={190} opacity={figures.riskOwner ?? 1} />
      <Worker phone={phone} raise={raise} tilt={tilt} opacity={figures.worker ?? 1} />
      <Site opacity={figures.site ?? 1} />
      <RiskOwner opacity={figures.riskOwner ?? 1} />
      <g opacity={figures.site ?? 1}>
        <Spark at={SPARK} level={spark} />
      </g>
      {(['worker', 'site', 'riskOwner'] as const).map((k) => {
        const o = typeof labels === 'number' ? labels : (labels[k] ?? 0);
        if (o <= 0) return null;
        const text = k === 'worker' ? 'WORKER' : k === 'site' ? 'SITE' : 'RISK OWNER';
        const x = k === 'worker' ? REAL_LABELS.worker : k === 'site' ? REAL_LABELS.site : REAL_LABELS.riskOwner;
        const rise = typeof labels === 'number' ? 0 : 1 - Math.min(1, o);
        return <Label key={k} text={text} at={[x, REAL_LABELS.y]} size={REAL_LABELS.size} opacity={o} rise={rise} />;
      })}
      {record.line > 0 && (
        <g opacity={record.opacity ?? 1}>
          <DrawnLine d={`M ${RECORD.x0} ${RECORD.y} H ${RECORD.x1}`} progress={record.line} color={COLOR.ink} px={1.4} opacity={0.85} />
          {/* marks print downwards onto the line: marks 1.5 = the first mark in full, the second half drawn */}
          {[RECORD.mark1, RECORD.mark2].map((x, i) => {
            const m = Math.max(0, Math.min(1, record.marks - i));
            if (m <= 0) return null;
            return <rect key={x} x={x - px(1.5)} y={markTop} width={px(3)} height={RECORD.markHeight * m} fill={COLOR.ink} />;
          })}
        </g>
      )}
      {(record.keptLabel ?? 0) > 0 && <Label text="RECORD KEPT" at={RECORD.keptLabel} size={25} opacity={record.keptLabel} />}
      {noOneDisturbed > 0 && <Label text="NO ONE DISTURBED" at={NO_ONE_DISTURBED} anchor="start" size={25} opacity={noOneDisturbed} />}
    </g>
  );
};
