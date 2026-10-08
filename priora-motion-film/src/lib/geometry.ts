// Small geometry helpers. Angles in degrees, clockwise from +x with y down (270 is 12 o'clock).

export type Pt = readonly [number, number];

export const rad = (deg: number) => (deg * Math.PI) / 180;

export const polar = (c: Pt, r: number, deg: number): Pt => [c[0] + r * Math.cos(rad(deg)), c[1] + r * Math.sin(rad(deg))];

/** Open arc path from a0 to a1 degrees (clockwise when a1 > a0). */
export const arcPath = (c: Pt, r: number, a0: number, a1: number): string => {
  const [x0, y0] = polar(c, r, a0);
  const [x1, y1] = polar(c, r, a1);
  const sweep = a1 > a0 ? 1 : 0;
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

/** Filled annular sector (a ring segment), used for room bands and case arcs. */
export const annulusSector = (c: Pt, r0: number, r1: number, a0: number, a1: number): string => {
  const [ax, ay] = polar(c, r1, a0);
  const [bx, by] = polar(c, r1, a1);
  const [cx, cy] = polar(c, r0, a1);
  const [dx, dy] = polar(c, r0, a0);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return [
    `M ${ax.toFixed(2)} ${ay.toFixed(2)}`,
    `A ${r1} ${r1} 0 ${large} 1 ${bx.toFixed(2)} ${by.toFixed(2)}`,
    `L ${cx.toFixed(2)} ${cy.toFixed(2)}`,
    `A ${r0} ${r0} 0 ${large} 0 ${dx.toFixed(2)} ${dy.toFixed(2)}`,
    'Z',
  ].join(' ');
};

export const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt): string =>
  `M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}, ${p3[0]} ${p3[1]}`;

export const angleTo = (from: Pt, to: Pt) => (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
