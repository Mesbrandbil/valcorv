// The only camera keyframe list in the film (plan section 6.2). Between moves the camera is completely
// still. Every move eases in and out with the default curve and lasts at least 40 frames.
import { SHOTS, type Shot, type ShotName } from './shots';
import { ease } from '../lib/motion';

export type Move = { from: number; to: number; shot: ShotName };

export const FIRST_SHOT: ShotName = 'S1_REAL';

export const MOVES: Move[] = [
  { from: 238, to: 278, shot: 'S2_VOICE' },
  // starts after the voice ends and the grey words are gone, so the rise carries the phrases (plan 7.1)
  { from: 498, to: 538, shot: 'S2_CASE' },
  { from: 654, to: 710, shot: 'S3_PANEL' },
  { from: 970, to: 1014, shot: 'S3_TABLE' },
  { from: 1124, to: 1168, shot: 'S4_CASE' },
  { from: 1248, to: 1300, shot: 'S4_ROUTE' },
  { from: 1392, to: 1438, shot: 'S5_GAP' },
  // starts once DECISION PACKET is up, so the label appears with a still camera
  { from: 1584, to: 1638, shot: 'S5_DESK' },
  { from: 1691, to: 1731, shot: 'S6_ROOMS' },
  { from: 1774, to: 1814, shot: 'S6_RETAIN' },
  { from: 1930, to: 1970, shot: 'S6_MITIGATE' },
  { from: 2154, to: 2194, shot: 'S6_TRANSFER' },
  { from: 2351, to: 2391, shot: 'S7_SYSTEM' },
  { from: 2530, to: 2570, shot: 'S8_SHEET' },
];

const mix = (a: Shot, b: Shot, t: number): Shot => {
  const e = ease(t);
  // zoom moves geometrically, so a pull back and an approach feel equally paced
  const zoom = a.zoom * Math.pow(b.zoom / a.zoom, e);
  // the centre is blended so the world point under the screen centre travels smoothly at any zoom
  const w = a.zoom === b.zoom ? e : (1 / a.zoom - 1 / zoom) / (1 / a.zoom - 1 / b.zoom);
  return { x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w, zoom };
};

export const cameraAt = (f: number): Shot => {
  let current: Shot = SHOTS[FIRST_SHOT];
  for (const m of MOVES) {
    const target = SHOTS[m.shot];
    if (f < m.from) return current;
    if (f < m.to) return mix(current, target, (f - m.from) / (m.to - m.from));
    current = target;
  }
  return current;
};

/** True while the camera is moving at frame f. */
export const cameraMoving = (f: number) => MOVES.some((m) => f > m.from && f < m.to);
