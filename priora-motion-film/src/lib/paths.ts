// Travel along the paths defined once in layout.ts.
import { getLength, getPointAtLength, getSubpaths } from '@remotion/paths';
import type { Pt } from './geometry';

const lengths = new Map<string, number>();
export const pathLength = (d: string) => {
  let l = lengths.get(d);
  if (l === undefined) {
    l = getLength(d);
    lengths.set(d, l);
  }
  return l;
};

/** The point at fraction t (0 to 1) of a path's length. */
export const pointOn = (d: string, t: number): Pt => {
  const l = pathLength(d);
  const p = getPointAtLength(d, Math.max(0, Math.min(1, t)) * l);
  return p ? [p.x, p.y] : [0, 0];
};

/** The point a fixed distance (world units) behind fraction t, clamped to the start: for things that follow. */
export const pointBehind = (d: string, t: number, behind: number): Pt => {
  const l = pathLength(d);
  return pointOn(d, Math.max(0, t * l - behind) / l);
};

export { getSubpaths };
