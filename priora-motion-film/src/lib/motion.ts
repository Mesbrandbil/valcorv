// Motion helpers. Two curves only (brief section 6): the default ease and the arrival ease.
// No springs, no overshoot. Everything here is a pure function of the frame.
import { EASE_ARRIVE, EASE_DEFAULT } from './tokens';
import type { Pt } from './geometry';

/** A CSS-style cubic-bezier timing function, solved for x by bisection (monotone, exact to 1e-6). */
export const cubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
  const bx = (s: number) => 3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s;
  const by = (s: number) => 3 * (1 - s) * (1 - s) * s * y1 + 3 * (1 - s) * s * s * y2 + s * s * s;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (bx(mid) < t) lo = mid;
      else hi = mid;
    }
    return by((lo + hi) / 2);
  };
};

export const ease = cubicBezier(...EASE_DEFAULT);
export const arrive = cubicBezier(...EASE_ARRIVE);
export type Easing = (t: number) => number;
export const linear: Easing = (t) => Math.max(0, Math.min(1, t));

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** 0 before a, 1 after b, eased in between. */
export const prog = (f: number, a: number, b: number, e: Easing = ease) => (f <= a ? 0 : f >= b ? 1 : e((f - a) / (b - a)));

/** Fade in over [a, a + inDur] (arrival curve), and out over [out, out + outDur] (default curve). */
export const fade = (f: number, a: number, inDur = 10, out?: number | null, outDur = 10) => {
  const i = prog(f, a, a + inDur, arrive);
  const o = out === undefined || out === null ? 0 : prog(f, out, out + outDur, ease);
  return i * (1 - o);
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpPt = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** Interpolate angles the short way round, in degrees. */
export const lerpAngle = (a: number, b: number, t: number) => {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return a + d * t;
};

/**
 * A value that moves through a list of keyframes [frame, value], easing between each pair.
 * Before the first key it holds the first value; after the last, the last.
 */
export const keys = (f: number, ks: Array<[number, number]>, e: Easing = ease) => {
  if (f <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    const [fa, va] = ks[i - 1];
    const [fb, vb] = ks[i];
    if (f <= fb) return fb === fa ? vb : lerp(va, vb, e((f - fa) / (fb - fa)));
  }
  return ks[ks.length - 1][1];
};

export const keysAngle = (f: number, ks: Array<[number, number]>, e: Easing = ease) => {
  if (f <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    const [fa, va] = ks[i - 1];
    const [fb, vb] = ks[i];
    if (f <= fb) return fb === fa ? vb : lerpAngle(va, vb, e((f - fa) / (fb - fa)));
  }
  return ks[ks.length - 1][1];
};

export const keysPt = (f: number, ks: Array<[number, Pt]>, e: Easing = ease): Pt => [
  keys(f, ks.map(([k, p]) => [k, p[0]]), e),
  keys(f, ks.map(([k, p]) => [k, p[1]]), e),
];

/** A fixed, hand-made flicker for the welding spark: never random, the same every render. */
const FLICKER = [0.9, 1, 0.55, 0.85, 1, 0.7, 0.95, 0.4, 0.8, 1, 0.65, 0.9, 1, 0.5, 0.75, 0.95, 0.85, 1, 0.6, 0.9, 0.7, 1, 0.45, 0.85];
export const sparkLevel = (f: number, start: number) => {
  if (f < start) return 0;
  const i = Math.floor((f - start) / 2) % FLICKER.length;
  const j = (i + 1) % FLICKER.length;
  const t = ((f - start) % 2) / 2;
  const v = lerp(FLICKER[i], FLICKER[j], t);
  return v * prog(f, start, start + 3, linear);
};
