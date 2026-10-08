// The whole film as a function of the frame: one camera, one world, every cast member in its state.
import React from 'react';
import type { WorldState } from '../world/World';
import { cameraAt } from '../camera/camera-keys';
import { realAt } from './real';
import { panelAt } from './panel';
import { roomsAt, routesAt, humanLinesAt } from './system';
import { caseAt, prioraAt } from './cast';
import { TEXTS } from './texts';
import { Seq1Overlay } from './overlays/s1';
import { Seq2Overlay } from './overlays/s2';
import { Seq3Overlay } from './overlays/s3';
import { Seq5Overlay } from './overlays/s5';
import { Seq6Overlay } from './overlays/s6';
import { Seq8Overlay } from './overlays/s8';

const Overlays: React.FC<{ f: number }> = ({ f }) => (
  <g>
    <Seq1Overlay f={f} />
    <Seq2Overlay f={f} />
    <Seq3Overlay f={f} />
    <Seq5Overlay f={f} />
    <Seq6Overlay f={f} />
    <Seq8Overlay f={f} />
  </g>
);

export const stateAt = (f: number): WorldState => ({
  shot: cameraAt(f),
  real: realAt(f),
  panel: panelAt(f),
  rooms: roomsAt(f),
  routes: routesAt(f),
  humanLines: humanLinesAt(f),
  priora: prioraAt(f),
  case: caseAt(f),
  overlay: <Overlays f={f} />,
  texts: TEXTS,
  frame: f,
});
