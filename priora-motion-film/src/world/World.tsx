import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Camera } from '../camera/Camera';
import type { Shot } from '../camera/shots';
import { COLOR, HEIGHT, WIDTH } from '../lib/tokens';
import { ALL_INKS, InkDefs } from '../lib/texture';
import { PATH } from '../lib/layout';
import type { Pt } from '../lib/geometry';
import { Paper, PaperDefs } from './Paper';
import { RealWorld, type RealWorldProps } from './RealWorld';
import { SitePanel, type SitePanelProps } from './SitePanel';
import { DecisionRooms, type DecisionRoomsProps } from './DecisionRooms';
import { ContactShadowDefs } from '../cast/people';
import { Priora } from '../cast/agents';
import { Case, type CaseProps } from '../cast/Case';
import { DrawnLine, Thread } from '../cast/lines';
import { STROKE_PX } from '../lib/tokens';
import { TextLayer, type TextItem } from '../text/TextLayer';

/** Everything the world shows in one frame. Sequences compute this; World only draws it. */
export type WorldState = {
  shot: Shot;
  textured?: boolean;
  real?: RealWorldProps;
  panel?: SitePanelProps | null;
  rooms?: DecisionRoomsProps | null;
  routes?: { work?: number; workOpacity?: number; escalate?: number; escalateOpacity?: number };
  humanLines?: Array<{ d: string; progress?: number; opacity?: number; weight?: number }>;
  priora?: { at: Pt; beadAngle: number; opacity?: number; scale?: number } | null;
  case?: CaseProps | null;
  /** World-space extras for a given moment (labels, threads, rulers): drawn above the territories. */
  overlay?: React.ReactNode;
  /** Free text from the registry, drawn at this frame. */
  texts?: TextItem[];
  frame?: number;
  /** World-space extras drawn above the text (the Sequence 8 veil and spark). */
  top?: React.ReactNode;
  /** Screen-space extras (review subtitles). */
  screen?: React.ReactNode;
};

export const World: React.FC<{ state: WorldState }> = ({ state }) => {
  const { shot, textured = true } = state;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.paper }}>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: 'block' }}>
        <defs>
          <InkDefs seeds={ALL_INKS} zoom={shot.zoom} />
          <PaperDefs />
          <ContactShadowDefs />
        </defs>
        <Camera shot={shot}>
          <Paper textured={textured} />
          {state.routes?.work ? <Thread d={PATH.work} progress={state.routes.work} opacity={state.routes.workOpacity ?? 1} /> : null}
          {state.routes?.escalate ? <Thread d={PATH.escalate} progress={state.routes.escalate} opacity={state.routes.escalateOpacity ?? 1} /> : null}
          {state.rooms !== null && state.rooms !== undefined && <DecisionRooms {...state.rooms} />}
          {state.panel !== null && state.panel !== undefined && <SitePanel {...state.panel} />}
          <RealWorld {...(state.real ?? {})} />
          {(state.humanLines ?? []).map((h, i) => (
            <DrawnLine key={i} d={h.d} progress={h.progress ?? 1} opacity={h.opacity ?? 1} color={COLOR.ink} px={STROKE_PX.humanLine * (h.weight ?? 1)} />
          ))}
          {state.case && <Case {...state.case} />}
          {state.priora && <Priora at={state.priora.at} beadAngle={state.priora.beadAngle} opacity={state.priora.opacity ?? 1} scale={state.priora.scale ?? 1} />}
          {state.overlay}
          {state.texts && <TextLayer items={state.texts} frame={state.frame ?? 0} />}
          {state.top}
        </Camera>
        {state.screen}
      </svg>
    </AbsoluteFill>
  );
};
