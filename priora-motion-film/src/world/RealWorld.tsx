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
  labels?: number;
  record?: { line: number; marks: number; keptLabel?: number; opacity?: number };
  noOneDisturbed?: number;
  spark?: number;
};

export const RealWorld: React.FC<RealWorldProps> = ({
  ground = 1,
  groundOpacity = 1,
  figures = { worker: 1, site: 1, riskOwner: 1 },
  phone = 'rest',
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
      <Worker phone={phone} opacity={figures.worker ?? 1} />
      <Site opacity={figures.site ?? 1} />
      <RiskOwner opacity={figures.riskOwner ?? 1} />
      <g opacity={figures.site ?? 1}>
        <Spark at={SPARK} level={spark} />
      </g>
      {labels > 0 && (
        <g opacity={labels}>
          <Label text="WORKER" at={[REAL_LABELS.worker, REAL_LABELS.y]} size={REAL_LABELS.size} />
          <Label text="SITE" at={[REAL_LABELS.site, REAL_LABELS.y]} size={REAL_LABELS.size} />
          <Label text="RISK OWNER" at={[REAL_LABELS.riskOwner, REAL_LABELS.y]} size={REAL_LABELS.size} />
        </g>
      )}
      {record.line > 0 && (
        <g opacity={record.opacity ?? 1}>
          <DrawnLine d={`M ${RECORD.x0} ${RECORD.y} H ${RECORD.x1}`} progress={record.line} color={COLOR.ink} px={1.4} opacity={0.85} />
          {record.marks >= 1 && <rect x={RECORD.mark1 - px(1.5)} y={markTop} width={px(3)} height={RECORD.markHeight} fill={COLOR.ink} />}
          {record.marks >= 2 && <rect x={RECORD.mark2 - px(1.5)} y={markTop} width={px(3)} height={RECORD.markHeight} fill={COLOR.ink} />}
        </g>
      )}
      {(record.keptLabel ?? 0) > 0 && <Label text="RECORD KEPT" at={RECORD.keptLabel} size={25} opacity={record.keptLabel} />}
      {noOneDisturbed > 0 && <Label text="NO ONE DISTURBED" at={NO_ONE_DISTURBED} anchor="start" size={25} opacity={noOneDisturbed} />}
    </g>
  );
};
