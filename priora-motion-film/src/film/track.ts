// Tracks: where a travelling object is at any frame, from a list of timed journeys.
import { pointOn } from '../lib/paths';
import { ease, prog, type Easing } from '../lib/motion';
import type { Pt } from '../lib/geometry';

export type Journey = { span: readonly [number, number]; at: (u: number) => Pt; e?: Easing };

/** Holds still between journeys; during one, eases along it. */
export const track = (f: number, start: Pt, journeys: Journey[]): Pt => {
  let pos = start;
  for (const j of journeys) {
    if (f < j.span[0]) return pos;
    if (f < j.span[1]) return j.at(prog(f, j.span[0], j.span[1], j.e ?? ease));
    pos = j.at(1);
  }
  return pos;
};

/** True while any journey is under way. */
export const moving = (f: number, journeys: Journey[]) => journeys.some((j) => f > j.span[0] && f < j.span[1]);

const bez = (a: number, b: number, c: number, d: number, t: number) =>
  (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;

/** A cubic Bezier by arc length, so a journey's speed follows its easing and nothing else. */
export const curve = (p0: Pt, p1: Pt, p2: Pt, p3: Pt) => {
  const at = (t: number): Pt => [bez(p0[0], p1[0], p2[0], p3[0], t), bez(p0[1], p1[1], p2[1], p3[1], t)];
  const N = 64;
  const len = [0];
  let prev = at(0);
  for (let i = 1; i <= N; i++) {
    const p = at(i / N);
    len.push(len[i - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1]));
    prev = p;
  }
  const total = len[N] || 1;
  return (u: number): Pt => {
    const s = Math.min(1, Math.max(0, u)) * total;
    let i = 1;
    while (i < N && len[i] < s) i++;
    const k = len[i] > len[i - 1] ? (s - len[i - 1]) / (len[i] - len[i - 1]) : 0;
    return at((i - 1 + k) / N);
  };
};
export const line = (a: Pt, b: Pt) => (u: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
/** Along an SVG path by arc length. */
export const along = (d: string) => (u: number): Pt => pointOn(d, u);

export const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
export const angleBetween = (a: Pt, b: Pt) => (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
