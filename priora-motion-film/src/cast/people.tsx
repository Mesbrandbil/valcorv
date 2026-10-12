import React, { useId } from 'react';
import { COLOR } from '../lib/tokens';
import { ink, SEEDS } from '../lib/texture';
import type { Pt } from '../lib/geometry';
import { DESK_ORIGIN, RISK_OWNER, SITE, WORKER } from '../lib/layout';

// The real world: three black silhouettes, printed and cut. Articulation comes from posture, curve and overlap,
// and from fine real cuts (gaps of about 2 units where one piece lies over another), never from outlines.

type V = [number, number];

const r2 = (v: number) => (Math.round(v * 100) / 100).toString();
const P = (p: V) => `${r2(p[0])} ${r2(p[1])}`;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const smooth = (t: number) => {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const along = (a: V, b: V, t: number): V => [mix(a[0], b[0], t), mix(a[1], b[1], t)];
const rotAbout = (p: V, c: V, deg: number): V => {
  const a = (deg * Math.PI) / 180;
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
};
/** Unit vector along a direction given in degrees clockwise from 12 o'clock. */
const axis = (deg: number): V => [Math.sin((deg * Math.PI) / 180), -Math.cos((deg * Math.PI) / 180)];

/**
 * A tapered limb segment: the hull of a circle of radius ra at a and one of radius rb at b, its sides
 * swelling by `bulge`. Two segments that share a joint radius meet in a smooth round joint.
 */
const limb = (a: V, ra: number, b: V, rb: number, bulge = 0): string => {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 0.001;
  const u: V = [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
  const s = Math.max(-0.95, Math.min(0.95, (ra - rb) / d));
  const c = Math.sqrt(1 - s * s);
  const n1: V = [u[0] * s - u[1] * c, u[1] * s + u[0] * c];
  const n2: V = [u[0] * s + u[1] * c, u[1] * s - u[0] * c];
  const a1: V = [a[0] + ra * n1[0], a[1] + ra * n1[1]];
  const b1: V = [b[0] + rb * n1[0], b[1] + rb * n1[1]];
  const b2: V = [b[0] + rb * n2[0], b[1] + rb * n2[1]];
  const a2: V = [a[0] + ra * n2[0], a[1] + ra * n2[1]];
  const m1: V = [(a1[0] + b1[0]) / 2 + n1[0] * bulge, (a1[1] + b1[1]) / 2 + n1[1] * bulge];
  const m2: V = [(a2[0] + b2[0]) / 2 + n2[0] * bulge, (a2[1] + b2[1]) / 2 + n2[1] * bulge];
  return `M ${P(a1)} Q ${P(m1)} ${P(b1)} A ${r2(rb)} ${r2(rb)} 0 ${s < 0 ? 1 : 0} 0 ${P(b2)} Q ${P(m2)} ${P(a2)} A ${r2(ra)} ${r2(ra)} 0 ${s > 0 ? 1 : 0} 0 ${P(a1)} Z`;
};

/**
 * The cut a limb leaves on the body behind it: the limb's own hull, but starting from nothing part way down,
 * so the joint stays joined to the body and the cut opens gradually below it, like a fold.
 */
const limbCut = (a: V, b: V, rb: number, from: number) => limb(along(a, b, from), 0.2, b, rb);

/** Two-bone reach: the elbow for a shoulder s and a wrist w, bending to the (-dy, dx) side of s to w. */
const elbowFor = (s: V, w: V, l1: number, l2: number): V => {
  const dx = w[0] - s[0];
  const dy = w[1] - s[1];
  const d0 = Math.hypot(dx, dy) || 0.001;
  const d = Math.min(Math.max(d0, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const ux = dx / d0;
  const uy = dy / d0;
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  return [s[0] + a * ux - h * uy, s[1] + a * uy + h * ux];
};

/** An ellipse as a path, centred at c, turned by deg (clockwise). */
const ellipse = (c: V, rx: number, ry: number, deg: number): string => {
  const p0 = rotAbout([c[0], c[1] - ry], c, deg);
  const p1 = rotAbout([c[0], c[1] + ry], c, deg);
  return `M ${P(p0)} A ${r2(rx)} ${r2(ry)} ${r2(deg)} 0 1 ${P(p1)} A ${r2(rx)} ${r2(ry)} ${r2(deg)} 0 1 ${P(p0)} Z`;
};

/** A rounded rectangle as a path, centred at c, w across and h along, turned by deg (clockwise). */
const roundRect = (c: V, w: number, h: number, rr: number, deg: number): string => {
  const x0 = c[0] - w / 2;
  const x1 = c[0] + w / 2;
  const y0 = c[1] - h / 2;
  const y1 = c[1] + h / 2;
  const pts: Array<[V, V]> = [
    [[x1 - rr, y0], [x1, y0 + rr]],
    [[x1, y1 - rr], [x1 - rr, y1]],
    [[x0 + rr, y1], [x0, y1 - rr]],
    [[x0, y0 + rr], [x0 + rr, y0]],
  ];
  const t = (p: V) => P(rotAbout(p, c, deg));
  return `M ${t([x0 + rr, y0])} ${pts.map(([e, n]) => `L ${t(e)} A ${rr} ${rr} 0 0 1 ${t(n)}`).join(' ')} Z`;
};

/** A stable, unique id for this instance's cut masks (the worker can appear twice in a sheet). */
const useCutId = (name: string) => `${name}-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;

/**
 * A cut: the mask removes every shape in `children`, widened by `gap` on each side, from what it is applied to.
 * The paper shows through: a real gap, not a drawn line.
 */
const CutMask: React.FC<{ id: string; box: [number, number, number, number]; gap?: number; children: React.ReactNode }> = ({ id, box, gap = 0, children }) => (
  <mask id={id} maskUnits="userSpaceOnUse" x={box[0]} y={box[1]} width={box[2]} height={box[3]}>
    <rect x={box[0]} y={box[1]} width={box[2]} height={box[3]} fill="#fff" />
    <g fill="#000" stroke="#000" strokeWidth={gap * 2} strokeLinejoin="round" strokeLinecap="round">
      {children}
    </g>
  </mask>
);

/** Soft, barely there contact shadow under a printed figure. */
export const ContactShadow: React.FC<{ at: Pt; w: number; opacity?: number }> = ({ at, w, opacity = 1 }) => (
  <ellipse cx={at[0]} cy={at[1] + 2} rx={w / 2} ry={5} fill="url(#contact-shadow)" opacity={opacity} />
);

export const ContactShadowDefs: React.FC = () => (
  <radialGradient id="contact-shadow">
    <stop offset="0" stopColor={COLOR.ink} stopOpacity={0.13} />
    <stop offset="1" stopColor={COLOR.ink} stopOpacity={0} />
  </radialGradient>
);

export type PhonePose = 'rest' | 'raised' | 'tilted';

// ---------------------------------------------------------------- the worker
// Local units, feet at the origin, y up is negative. A gentle three-quarter view towards the site: the weight on the
// back leg, the free knee a little bent and the foot a little ahead, the shoulders softly rounded. The hard hat's
// peak, the chin and the boots all point the same way, so the figure reads as one person turned to the work.

const W_GAP = 2;
const W_HIP: V = [0, -56]; // the upper body leans about this point
const W_NECK: V = [0.5, -118]; // the head turns about this point
const W_SHOULDER: V = [11.8, -109.8]; // the phone arm's shoulder; it lifts a little as the arm comes up
const W_SHOULDER_UP: V = [1.2, -1.6];
const W_UPPER = 25;
const W_FORE = 24;
// the hand holds the phone low, near its bottom end, the way one holds it to speak into it
const PHONE = { len: 19, w: 8.2, grip: 5.4, wrist: 13.5 } as const;
// the phone's centre and angle (degrees clockwise from upright), feet-relative. At rest it sits in the hand in front
// of the stomach; raised, it is held up before the face with its top exactly where the waveform stem begins.
const PHONE_REST: { c: V; a: number } = { c: [WORKER.phoneRest[0] - WORKER.feet[0] + 1, WORKER.phoneRest[1] - WORKER.feet[1] - 2], a: 40 };
const PHONE_UP_A = 34;
const STEM: V = [WORKER.phoneRaised[0] - WORKER.feet[0] + 8, WORKER.phoneRaised[1] - WORKER.feet[1] - 12];
const PHONE_UP: { c: V; a: number } = {
  c: [STEM[0] - 0.4 - axis(PHONE_UP_A)[0] * (PHONE.len / 2), STEM[1] + 0.8 - axis(PHONE_UP_A)[1] * (PHONE.len / 2)],
  a: PHONE_UP_A,
};
// on its way up the hand passes out in front of the chest, never through the body, and draws in to the face
const PHONE_ARC: V = [54, -104];

const W_DOME = 'M -13.6 -141.2 C -14.1 -150.6 -7.6 -157 1.5 -157 C 10.6 -157 16.7 -150.8 16.3 -141.6 Z';
const W_BRIM =
  'M -16 -141 C -16 -142.2 -15 -142.8 -13.5 -142.8 L 15.6 -142.8 C 19.9 -142.8 23.7 -142.2 25.5 -140.6 C 26.2 -139.9 25.8 -139 24.7 -139.1 C 21.5 -139.3 18.5 -139.5 15.1 -139.5 L -14.2 -139.5 C -15.4 -139.5 -16 -140 -16 -141 Z';
const W_HEAD =
  'M -10.4 -141 C -11.9 -133.6 -11.3 -127.4 -7.7 -123.6 C -4.7 -120.8 1.6 -119.8 6.4 -121 C 10 -122 12.2 -124.8 12.6 -128.8 C 13 -132.6 12.6 -136.4 12 -141 Z';
const W_NECK_SHAPE = 'M -6.4 -126 C -6.8 -121 -7.6 -117 -8.8 -113 L 7.6 -113 C 6.8 -116.6 6.6 -120 6.8 -124 Z';
// a softly rounded work jacket: sloping shoulders, the upper back curving over the shoulder blade, a little shape at
// the waist, and a hem that tips with the hips (the weight-bearing hip, at the back, sits higher)
const W_TORSO =
  'M -6.4 -116.2 C -10.6 -115.6 -14.6 -114 -17.2 -110.8 C -19.6 -107.6 -20.2 -102.4 -19.8 -97 C -19.4 -90.6 -17.4 -85 -16.9 -79 C -16.5 -72.6 -17.6 -64.4 -18.6 -58.4 C -7.6 -56.4 6.2 -55.6 17.8 -56.4 C 17.9 -62.6 16.8 -69.6 16.8 -76 C 16.8 -83.4 18.9 -90.6 19 -97.8 C 19.1 -104.4 17.4 -109.4 14.6 -112.2 C 11.9 -114.8 9 -116 6.2 -116.6 Z';
// the near arm hangs relaxed at the back of the figure: its outer edge is the figure's back
const NA = { s: [-13.4, -109.2] as V, e: [-20.4, -86.6] as V, w: [-19.4, -67.2] as V, h: [-18.8, -62.8] as V };
const W_NEAR_ARM = [limb(NA.s, 5.2, NA.e, 4.4, 0.5), limb(NA.e, 4.4, NA.w, 3.5, 0.25), ellipse(NA.h, 3.8, 4.7, -6)];
const W_NEAR_ARM_CUT = [limbCut(NA.s, NA.e, 4.4, 0.2), limb(NA.e, 4.4, NA.w, 3.5, 0.25), ellipse(NA.h, 3.8, 4.7, -6)];
// weight on the back leg, which stands straight under the hip; the free leg rests a little ahead with a soft knee
const W_BACK_LEG =
  'M -17.4 -60 L -1.8 -60 C -2.2 -49 -3.2 -39 -3.8 -31 C -4.3 -24 -5 -16 -5.6 -9.6 C -1.6 -9 2.6 -6.8 3.6 -3.2 C 4 -1.4 3.2 0 1.6 0 L -15.6 0 C -16.8 0 -17.2 -1 -16.9 -2.4 C -16.5 -4.6 -15.4 -7.4 -14 -9.8 C -14.6 -16 -16 -22 -15.8 -28 C -15.6 -34 -16.4 -46 -17.4 -60 Z';
const W_FRONT_LEG =
  'M 1.4 -60 L 16.6 -60 C 17.6 -51 18.6 -40 19 -32 C 19.2 -26 18 -17 17.6 -9.8 C 21.6 -9.2 25.6 -6.8 26.4 -3.2 C 26.8 -1.4 26 0 24.4 0 L 8 0 C 6.8 0 6.4 -1 6.7 -2.4 C 7.1 -4.6 8 -7.4 9.4 -9.8 C 8.6 -16 7 -22 6.4 -27 C 5.8 -32 4.6 -36 3.6 -40 C 2.6 -46 1.8 -53 1.4 -60 Z';

const workerPose = (raise: number, tilt: number) => {
  const r = clamp01(raise);
  const tl = smooth(tilt);
  // at rest the weight sits back, relaxed; as the phone comes up the body shifts forward and leans into it,
  // while the head stays level, turned up to the phone
  const lean = mix(-1.2, 2, smooth((r - 0.1) / 0.9));
  const head = -2 * smooth((r - 0.35) / 0.65) - 1.5 * tl;
  // the phone follows a soft arc out and up, arriving a little ahead of the end of the raise so it is already in
  // place as the waveform stem begins; it turns upright a beat after the arm leads
  const u = 1 - (1 - r) ** 1.6;
  const world: V = [
    (1 - u) * (1 - u) * PHONE_REST.c[0] + 2 * (1 - u) * u * PHONE_ARC[0] + u * u * PHONE_UP.c[0],
    (1 - u) * (1 - u) * PHONE_REST.c[1] + 2 * (1 - u) * u * PHONE_ARC[1] + u * u * PHONE_UP.c[1],
  ];
  let a = mix(PHONE_REST.a, PHONE_UP.a, smooth((r - 0.1) / 0.9));
  // everything above the hips is drawn in the leaned frame: bring the world target into it
  const c = rotAbout(world, W_HIP, -lean);
  const ax0 = axis(a);
  let wrist: V = [c[0] - ax0[0] * PHONE.wrist, c[1] - ax0[1] * PHONE.wrist];
  // tilting: the hand turns about the wrist so the screen faces up and to the right, towards Priora
  a += 40 * tl;
  const ax = axis(a);
  const lift = smooth(r);
  const shoulder: V = [W_SHOULDER[0] + W_SHOULDER_UP[0] * lift, W_SHOULDER[1] + W_SHOULDER_UP[1] * lift];
  const elbow = elbowFor(shoulder, wrist, W_UPPER, W_FORE);
  // keep the wrist on the forearm even if the reach were ever exceeded
  const fd = Math.hypot(wrist[0] - elbow[0], wrist[1] - elbow[1]) || 1;
  wrist = [elbow[0] + ((wrist[0] - elbow[0]) / fd) * W_FORE, elbow[1] + ((wrist[1] - elbow[1]) / fd) * W_FORE];
  const phoneC: V = [wrist[0] + ax[0] * PHONE.wrist, wrist[1] + ax[1] * PHONE.wrist];
  const grip: V = [wrist[0] + ax[0] * (PHONE.wrist - PHONE.grip), wrist[1] + ax[1] * (PHONE.wrist - PHONE.grip)];
  return { lean, head, a, shoulder, elbow, wrist, phoneC, grip, tl };
};

/**
 * The worker: hard hat, solid rounded stance, one arm near a phone. Feet at WORKER.feet.
 * raise 0 to 1 lifts the phone from the stomach to the face along a soft arc, the elbow swinging forward and up;
 * tilt 0 to 1 turns the phone so its screen faces up and to the right.
 */
export const Worker: React.FC<{ phone?: PhonePose; raise?: number; tilt?: number; opacity?: number }> = ({ phone = 'rest', raise, tilt, opacity = 1 }) => {
  const [fx, fy] = WORKER.feet;
  const r = raise ?? (phone === 'rest' ? 0 : 1);
  const tl = tilt ?? (phone === 'tilted' ? 1 : 0);
  const pose = workerPose(r, tl);
  const torsoCut = useCutId('worker-torso');
  const screenCut = useCutId('worker-screen');
  const legCut = useCutId('worker-legs');
  const headCut = useCutId('worker-head');
  const upper = limb(pose.shoulder, 5, pose.elbow, 4.4, 0.5);
  const upperCut = limbCut(pose.shoulder, pose.elbow, 4.4, 0.4);
  const fore = limb(pose.elbow, 4.4, pose.wrist, 3.5, 0.25);
  const hand = ellipse(pose.grip, 4.2, 5.1, pose.a);
  // seen nearly edge on while it is held to the face, the phone opens to its full width as the screen turns out
  const phoneW = mix(PHONE.w, 10, pose.tl);
  const phoneShape = roundRect(pose.phoneC, phoneW, PHONE.len, 2.1, pose.a);
  // as the phone turns, its screen opens as one fine paper cut, so it reads as a phone showing a picture
  const screen = roundRect(pose.phoneC, phoneW - 3.6, PHONE.len - 6, 1.2, pose.a);
  // at rest the arm lies across the body: a finer cut there, so the figure stays one solid shape from a distance
  const torsoGap = mix(1.3, W_GAP, smooth(r));
  const box: [number, number, number, number] = [-60, -200, 160, 220];
  const leanT = `rotate(${r2(pose.lean)} ${W_HIP[0]} ${W_HIP[1]})`;
  return (
    <g transform={`translate(${fx} ${fy})`} opacity={opacity}>
      <defs>
        <CutMask id={headCut} box={box} gap={W_GAP}>
          <path d={W_BRIM} />
        </CutMask>
        <CutMask id={torsoCut} box={box} gap={torsoGap}>
          {W_NEAR_ARM_CUT.map((d, i) => (
            <path key={i} d={d} />
          ))}
          <path d={upperCut} />
          <path d={fore} />
          <path d={hand} />
          <path d={phoneShape} />
        </CutMask>
        {pose.tl > 0 && (
          <CutMask id={screenCut} box={box}>
            <path d={screen} fillOpacity={pose.tl} />
          </CutMask>
        )}
        <CutMask id={legCut} box={box} gap={W_GAP}>
          <g transform={leanT}>
            <path d={W_NEAR_ARM[2]} />
            <path d={hand} />
            <path d={phoneShape} />
          </g>
        </CutMask>
      </defs>
      <g filter={ink('ink', SEEDS.worker)} fill={COLOR.ink}>
        <g mask={`url(#${legCut})`}>
          <path d={W_BACK_LEG} />
          <path d={W_FRONT_LEG} />
        </g>
        <g transform={leanT}>
          <path d={W_TORSO} mask={`url(#${torsoCut})`} />
          <g transform={`rotate(${r2(pose.head)} ${W_NECK[0]} ${W_NECK[1]})`}>
            <path d={W_NECK_SHAPE} />
            <path d={W_HEAD} mask={`url(#${headCut})`} />
            <path d={W_DOME} />
            <path d={W_BRIM} />
          </g>
          {W_NEAR_ARM.map((d, i) => (
            <path key={i} d={d} />
          ))}
          <path d={upper} />
          <path d={fore} />
          <path d={phoneShape} mask={pose.tl > 0 ? `url(#${screenCut})` : undefined} />
          <path d={hand} />
        </g>
      </g>
    </g>
  );
};

// ---------------------------------------------------------------- helpers for the site and the risk owner
/** The width of a paper cut between two pieces, world units. */
const CUT = 2.5;

const f2 = (n: number) => n.toFixed(2);
const pt = (p: V) => `${f2(p[0])} ${f2(p[1])}`;
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k];
/** The right-hand normal of an axis (the axis turned a quarter clockwise). */
const side = (u: V): V => [-u[1], u[0]];

/** A tapered capsule: two circles joined by their outer tangents. Limbs and sleeves are built from these. */
const capsule = (a: V, ra: number, b: V, rb: number): string => {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (L < 1e-3) {
    const r = Math.max(ra, rb);
    return `M ${f2(a[0] - r)} ${f2(a[1])} a ${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0 a ${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0 Z`;
  }
  const d: V = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  const n = side(d);
  const c = Math.max(-0.99, Math.min(0.99, (ra - rb) / L));
  const s = Math.sqrt(1 - c * c);
  const o1 = add(mul(d, c), mul(n, s));
  const o2 = add(mul(d, c), mul(n, -s));
  const th = Math.acos(c);
  const largeB = 2 * th > Math.PI ? 1 : 0;
  const largeA = 2 * Math.PI - 2 * th > Math.PI ? 1 : 0;
  return [
    `M ${pt(add(a, mul(o1, ra)))}`,
    `L ${pt(add(b, mul(o1, rb)))}`,
    `A ${f2(rb)} ${f2(rb)} 0 ${largeB} 0 ${pt(add(b, mul(o2, rb)))}`,
    `L ${pt(add(a, mul(o2, ra)))}`,
    `A ${f2(ra)} ${f2(ra)} 0 ${largeA} 0 ${pt(add(a, mul(o1, ra)))}`,
    'Z',
  ].join(' ');
};


// ---------------------------------------------------------------- the site
// A hall with a sawtooth roof of three north-light bays, a taller service block at its left end with a short stack,
// and the one small window. The block is a separate piece: a fine cut runs down where it stands against the hall.

const SAW = { eave: 2204, x0: 2830, bay: 80, bays: 3 };
// The first bay's slope passes exactly through SITE.roofEmit, where the conditions line leaves the roof.
const SAW_PEAK = SAW.eave - (SAW.eave - SITE.roofEmit[1]) / ((SITE.roofEmit[0] - SAW.x0) / SAW.bay);
const BLOCK = { x0: 2722, x1: 2804, top: 2112, r: 2 };
const STACK = { x: 2737, w: 9, top: 2092 };

const hallPath = () => {
  const by = SITE.base[1];
  const teeth = Array.from({ length: SAW.bays }, (_, i) => {
    const xa = SAW.x0 + i * SAW.bay;
    const xb = xa + SAW.bay;
    return `L ${xa} ${SAW.eave} L ${xb} ${f2(SAW_PEAK)}${i === SAW.bays - 1 ? '' : ` V ${SAW.eave}`}`;
  }).join(' ');
  const right = SAW.x0 + SAW.bays * SAW.bay;
  return `M ${BLOCK.x0 + 10} ${by} V ${SAW.eave} ${teeth} L ${right} ${by} Z`;
};
const blockPath = (g = 0) => {
  const { x0, x1, top, r } = BLOCK;
  const by = SITE.base[1];
  return `M ${x0 - g} ${by + g} V ${top + r} Q ${x0 - g} ${top - g} ${x0 + r} ${top - g} H ${x1 - r} Q ${x1 + g} ${top - g} ${x1 + g} ${top + r} V ${by + g} Z`;
};
/** The stack: slightly tapered, its top softly rounded. */
const stackPath = () => {
  const { x, w, top } = STACK;
  const b = BLOCK.top + 1;
  return `M ${x} ${b} L ${x + 0.8} ${top + 1.6} Q ${x + 0.9} ${top} ${x + 2.5} ${top} H ${x + w - 2.5} Q ${x + w - 0.9} ${top} ${x + w - 0.8} ${top + 1.6} L ${x + w} ${b} Z`;
};

/** The industrial building: a low roofline, one taller service block and a small rectangular window. */
export const Site: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => {
  const { window: win } = SITE;
  const hallCut = useCutId('site-hall');
  return (
    <g opacity={opacity}>
      <defs>
        <CutMask id={hallCut} box={[2690, 2060, 400, 250]}>
          <path d={blockPath(CUT)} stroke="none" />
        </CutMask>
      </defs>
      <g filter={ink('ink', SEEDS.site)} fill={COLOR.ink}>
        <path d={hallPath()} mask={`url(#${hallCut})`} />
        <path d={blockPath()} />
        <path d={stackPath()} />
      </g>
      {/* window: a fine paper frame round a deep interior, where the spark lives */}
      <rect x={win.c[0] - win.w / 2 - 2} y={win.c[1] - win.h / 2 - 2} width={win.w + 4} height={win.h + 4} fill={COLOR.paper} />
      <rect x={win.c[0] - win.w / 2} y={win.c[1] - win.h / 2} width={win.w} height={win.h} fill={COLOR.windowInterior} />
    </g>
  );
};

// ---------------------------------------------------------------- the risk owner
// Seated behind the desk in a three-quarter turn to the right, towards the decision: the head, a jacket with one
// round, curved shoulder, the high back of the chair showing behind that shoulder, the near forearm resting on the
// desktop beside a slim open laptop. The desk is a slab on two slender legs with a modesty panel; below it the chair's
// column and base. The slab's top right corner is the exact start of the human decision line.

const OWNER = (() => {
  const { deskTop, deskX0, deskX1, head } = RISK_OWNER;
  const by = RISK_OWNER.base[1];
  const [hx, hy] = head;
  const seat = deskTop - CUT; // everything above the desk stops a fine cut short of it
  const slabB = deskTop + 7;
  const under = slabB + CUT;
  const panelB = under + 15;
  const collar = hy + 22;
  const headPath = `M ${hx - 1} ${hy - 16.2} C ${hx + 8.6} ${hy - 16.2}, ${hx + 14.6} ${hy - 9.8}, ${hx + 14.6} ${hy - 1} C ${hx + 14.6} ${hy + 6.6}, ${hx + 11} ${hy + 13}, ${hx + 4.4} ${hy + 15.2} L ${hx + 3.6} ${hy + 25} H ${hx - 8.4} L ${hx - 8.8} ${hy + 12.4} C ${hx - 12.8} ${hy + 9}, ${hx - 15.2} ${hy + 4.2}, ${hx - 15.2} ${hy - 1.4} C ${hx - 15.2} ${hy - 10.4}, ${hx - 9.8} ${hy - 16.2}, ${hx - 1} ${hy - 16.2} Z`;
  const torso = [
    `M ${hx - 9} ${collar}`,
    `C ${hx - 20} ${collar}, ${hx - 29} ${collar + 1.6}, ${hx - 35} ${collar + 7.4}`,
    // the curved shoulder: one full, round line from the neck down the back
    `C ${hx - 40.6} ${collar + 12.8}, ${hx - 42.8} ${collar + 21}, ${hx - 42.6} ${collar + 31}`,
    `C ${hx - 42.4} ${collar + 41}, ${hx - 41} ${collar + 49}, ${hx - 39.6} ${seat}`,
    `H ${hx + 24}`,
    `C ${hx + 25.4} ${collar + 42}, ${hx + 27.6} ${collar + 30}, ${hx + 28} ${collar + 17}`,
    `C ${hx + 28.2} ${collar + 8}, ${hx + 20} ${collar + 0.6}, ${hx + 6} ${collar}`,
    `Q ${hx - 1.5} ${collar + 2}, ${hx - 9} ${collar} Z`,
  ].join(' ');
  // the near arm: upper arm down the front of the jacket, forearm laid along the desktop
  const shoulder: V = [hx + 21, collar + 11];
  const elbow: V = [hx + 25, seat - 5.4];
  const hand: V = [hx + 38, seat - 4];
  const arm = (g = 0, fromShoulder = 0) => {
    const se = sub(elbow, shoulder);
    const L = Math.hypot(se[0], se[1]);
    const start = add(shoulder, mul(se, fromShoulder / L));
    return [capsule(start, 6.2 + g, elbow, 5.4 + g), capsule(elbow, 5.4 + g, hand, 4 + g)];
  };
  // the chair's high back, behind the curved shoulder
  const chair = `M ${hx - 53} ${seat} V ${hy + 22} C ${hx - 53} ${hy + 12}, ${hx - 47} ${hy + 6}, ${hx - 37} ${hy + 6} H ${hx - 24} C ${hx - 19} ${hy + 6}, ${hx - 16} ${hy + 9}, ${hx - 16} ${hy + 14} V ${seat} Z`;
  const [cx, cy] = DESK_ORIGIN; // kept sharp and exact
  const slab = `M ${cx} ${cy} V ${slabB} H ${deskX0 + 2} Q ${deskX0} ${slabB} ${deskX0} ${slabB - 2} V ${deskTop + 1.6} Q ${deskX0} ${deskTop} ${deskX0 + 1.6} ${deskTop} Z`;
  const leg = (x: number) => `M ${x} ${under} H ${x + 5.4} L ${x + 4.9} ${by} H ${x + 0.5} Z`;
  const panel = `M ${deskX0 + 16} ${under} H ${deskX1 - 16} V ${panelB} H ${deskX0 + 16} Z`;
  // the chair's column and base, seen under the panel
  const col = hx - 14;
  const chairBase = `M ${col - 1.8} ${panelB + CUT} H ${col + 1.8} V ${by - 7.4} C ${col + 8} ${by - 7.2}, ${col + 15} ${by - 6.4}, ${col + 17.6} ${by - 4.6} C ${col + 18.6} ${by - 3.9}, ${col + 18.2} ${by - 2.6}, ${col + 17} ${by - 2.8} C ${col + 12} ${by - 3.8}, ${col + 6} ${by - 4.2}, ${col} ${by - 4.2} C ${col - 6} ${by - 4.2}, ${col - 12} ${by - 3.8}, ${col - 17} ${by - 2.8} C ${col - 18.2} ${by - 2.6}, ${col - 18.6} ${by - 3.9}, ${col - 17.6} ${by - 4.6} C ${col - 15} ${by - 6.4}, ${col - 8} ${by - 7.2}, ${col - 1.8} ${by - 7.4} Z`;
  // a slim laptop, open, in profile: the base under the hand, the lid leaning back from the far hinge
  const lap = { x0: hx + 27, x1: hx + 51, t: 3.6 };
  const laptopBase = `M ${lap.x0} ${seat} V ${seat - lap.t + 0.8} Q ${lap.x0} ${seat - lap.t} ${lap.x0 + 0.8} ${seat - lap.t} H ${lap.x1} V ${seat} Z`;
  const lidLean = 16;
  const lidLen = 20;
  const lu = axis(lidLean);
  const hinge: V = [lap.x1 - 1.4, seat - lap.t - CUT * 0.5];
  const lid = capsule(hinge, 2.6, add(hinge, mul(lu, lidLen)), 2.2);
  return { headPath, torso, arm, chair, slab, leg, panel, chairBase, laptopBase, lid, deskX0, deskX1 };
})();

/** The risk owner, seated behind a desk: a horizontal desktop and a curved shoulder. */
export const RiskOwner: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => {
  const o = OWNER;
  const chairCut = useCutId('risk-owner-chair');
  const torsoCut = useCutId('risk-owner-torso');
  const laptopCut = useCutId('risk-owner-laptop');
  return (
    <g opacity={opacity}>
      <defs>
        <CutMask id={chairCut} box={[3200, 2120, 220, 190]}>
          <path d={o.torso} strokeWidth={CUT * 2} />
          <path d={o.headPath} strokeWidth={CUT * 2} />
        </CutMask>
        <CutMask id={torsoCut} box={[3200, 2120, 220, 190]}>
          {o.arm(CUT, 9).map((d, i) => (
            <path key={i} d={d} stroke="none" />
          ))}
        </CutMask>
        <CutMask id={laptopCut} box={[3200, 2120, 220, 190]}>
          {o.arm(CUT).map((d, i) => (
            <path key={i} d={d} stroke="none" />
          ))}
        </CutMask>
      </defs>
      <g filter={ink('ink', SEEDS.riskOwner)} fill={COLOR.ink}>
        <path d={o.chair} mask={`url(#${chairCut})`} />
        <path d={o.headPath} />
        <path d={o.torso} mask={`url(#${torsoCut})`} />
        <g mask={`url(#${laptopCut})`}>
          <path d={o.laptopBase} />
          <path d={o.lid} />
        </g>
        {o.arm().map((d, i) => (
          <path key={i} d={d} />
        ))}
        <path d={o.slab} />
        <path d={o.leg(o.deskX0 + 8)} />
        <path d={o.leg(o.deskX1 - 13.4)} />
        <path d={o.panel} />
        <path d={o.chairBase} />
      </g>
    </g>
  );
};

/** The welding spark: white, tiny and alive. level 0 to 1 is set per frame from a fixed flicker table. */
export const Spark: React.FC<{ at: Pt; level: number }> = ({ at, level }) => {
  if (level <= 0) return null;
  const s = 4 + 5 * level;
  return (
    <g transform={`translate(${at[0]} ${at[1]})`}>
      <circle r={s * 1.4} fill={COLOR.spark} opacity={0.18 * level} />
      <path d={`M 0 ${-s} L ${s * 0.25} ${-s * 0.25} L ${s} 0 L ${s * 0.25} ${s * 0.25} L 0 ${s} L ${-s * 0.25} ${s * 0.25} L ${-s} 0 L ${-s * 0.25} ${-s * 0.25} Z`} fill={COLOR.spark} opacity={0.6 + 0.4 * level} />
    </g>
  );
};
