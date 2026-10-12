// The five findings, from the end of Sequence 3 into Sequence 4. Each appears as a small mark by its agent
// when its check ends and moves round inside the table to wait near the entrance. When the fifth has
// joined them, the five leave through the entrance together and collect beside Priora. In Sequence 4 they
// come back in one after another, each swings round to its agent's side of the case, and there it becomes
// its arc, which slides the last short way into the ring: each arc arrives from the direction of its agent.
// Geometry only (no React), so the checker can follow the marks.
import { arrive, ease, lerpAngle, prog } from '../lib/motion';
import { polar, type Pt } from '../lib/geometry';
import { ARC_SPAN, CASE, CASE_TABLE_SCALE, PANEL, PANEL_ENTRANCE, SEAT_OF, seatAngle, seatPos, type AgentKey } from '../lib/layout';
import { S3, S4 } from '../lib/timeline';
import { curve } from './track';

// ---------------------------------------------------------------- the arcs
/** Where an arc arrives from: the direction of its agent's seat, in the case's own coordinates. */
export const arcFrom = (k: AgentKey): Pt => {
  const [sx, sy] = seatPos(SEAT_OF[k]);
  return [(sx - PANEL.c[0]) / CASE_TABLE_SCALE, (sy - PANEL.c[1]) / CASE_TABLE_SCALE];
};
/** Each arc starts its last slide this share of the way out towards its agent's seat. */
export const ARC_FROM = 0.3;
export const arcMidAngle = (k: AgentKey) => (ARC_SPAN[k][0] + ARC_SPAN[k][1]) / 2;
/** The middle of agent k's arc in world units, at slide progress u, round a case at the table centre. */
export const arcMidAt = (k: AgentKey, u: number, centre: Pt = PANEL.c): Pt => {
  const [fx, fy] = arcFrom(k);
  const [mx, my] = polar([0, 0], CASE.findingsR, arcMidAngle(k));
  const s = CASE_TABLE_SCALE;
  return [centre[0] + s * (fx * ARC_FROM * (1 - u) + mx), centre[1] + s * (fy * ARC_FROM * (1 - u) + my)];
};

// ---------------------------------------------------------------- the marks
/** A finding mark is a short piece of arc, like the arc it becomes; the piece sits MARK_R in front of its point. */
export const MARK_SCALE = 1.5;
const MARK_R = 14 * MARK_SCALE;
const behind = (p: Pt, facing: number): Pt => polar(p, -MARK_R, facing);

/** The order the marks wait in, from the entrance outwards, and so the order they go back in. Within each
 *  side of the case the mark with furthest to go leads, so no mark ever passes another. */
const ROW_ORDER: AgentKey[] = ['evidence', 'riskEng', 'insurer', 'siteRules', 'fire'];
/** Waiting inside the table near the entrance (degrees, at the marks' home radius), in the angular order
 *  of the homes they come from, so marks moving at the same time never cross. */
// parted round Priora's fine connection to the case, which leaves the table at about -2 degrees
const SLOT_ANGLE: Record<AgentKey, number> = { siteRules: -22, riskEng: -13, fire: 8, insurer: 16, evidence: 24 };
const HOME_R = 270;
/** Beside Priora, outside the entrance. */
const ROW: Pt[] = [[1944, 1552], [1984, 1564], [2024, 1568], [2064, 1564], [2104, 1552]];
const rowOf = (k: AgentKey) => ROW[ROW_ORDER.indexOf(k)];

const homeAngle = (k: AgentKey) => seatAngle(SEAT_OF[k]);
const markHome = (k: AgentKey): Pt => polar(PANEL.c, HOME_R, homeAngle(k));
const slot = (k: AgentKey): Pt => polar(PANEL.c, HOME_R, SLOT_ANGLE[k]);

const sstep = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
const shortest = (d: number) => ((((d % 360) + 540) % 360) - 180);

/** A path as a polyline, walked by arc length: its speed follows the easing alone. */
type Way = { at: (u: number) => Pt; len: number };
const walk = (pts: Pt[]): Way => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1] || 1;
  return {
    len,
    at: (u: number) => {
      const s = Math.max(0, Math.min(1, u)) * len;
      let i = 1;
      while (i < cum.length - 1 && cum[i] < s) i++;
      const k = cum[i] > cum[i - 1] ? (s - cum[i - 1]) / (cum[i] - cum[i - 1]) : 0;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
    },
  };
};

/** Round the table's centre from one point to another: in to the orbit radius, round, and out (or in) to the end. */
const roundCentre = (from: Pt, to: Pt, orbitR: number, sweep?: number): Pt[] => {
  const c = PANEL.c;
  const th0 = (Math.atan2(from[1] - c[1], from[0] - c[0]) * 180) / Math.PI;
  const r0 = Math.hypot(from[0] - c[0], from[1] - c[1]);
  const th1 = (Math.atan2(to[1] - c[1], to[0] - c[0]) * 180) / Math.PI;
  const r1 = Math.hypot(to[0] - c[0], to[1] - c[1]);
  const dth = sweep ?? shortest(th1 - th0);
  const pts: Pt[] = [];
  for (let i = 0; i <= 120; i++) {
    const s = i / 120;
    const r = r0 + (orbitR - r0) * sstep(s / 0.3) + (r1 - orbitR) * sstep((s - 0.7) / 0.3);
    pts.push(polar(c, r, th0 + dth * sstep((s - 0.15) / 0.7)));
  }
  return pts;
};
const sample = (fn: (u: number) => Pt, n = 60): Pt[] => Array.from({ length: n + 1 }, (_, i) => fn(i / n));

// when each agent's check ends, its finding appears just inside the table band, by its seat
const FINDING_AT: Record<AgentKey, number> = {
  evidence: S3.checkEvidence[1],
  riskEng: S3.checkRiskEng[1],
  siteRules: S3.checkSiteRules[1],
  fire: S3.checkFire[1],
  insurer: S3.answerJoins[0],
};
/** Sequence 3: to the waiting place near the entrance, round inside the table, a little in from the band. */
const toSlot = (k: AgentKey) => walk(roundCentre(markHome(k), slot(k), k === 'riskEng' ? 205 : 232));
const toSlotFrames = (k: AgentKey) => (k === 'insurer' ? S3.insurerToSlot[1] - S3.insurerToSlot[0] : S3.markToSlot);
const toSlotStart = (k: AgentKey) => (k === 'insurer' ? S3.insurerToSlot[0] : FINDING_AT[k] + S3.markWaits);
/** Out through the entrance to beside Priora. */
const leaveWay = (k: AgentKey) => {
  const a = slot(k);
  const b = rowOf(k);
  return walk(sample(curve(a, [PANEL_ENTRANCE[0] - 150, 1500 + (a[1] - 1500) * 0.5], [PANEL_ENTRANCE[0] - 10, 1500 + (b[1] - 1500) * 0.4], b)));
};
const leaveStart = (k: AgentKey) => S3.marksLeave[0] + ROW_ORDER.indexOf(k) * S3.leaveStagger;

/** Sequence 4: back in through the entrance, then round the case to the start of its arc's slide. */
const inWay = (k: AgentKey) => {
  const m = arcMidAngle(k);
  const end = behind(arcMidAt(k, 0), m);
  const gate: Pt = [PANEL_ENTRANCE[0] - 30, 1500];
  const line = sample((u) => [rowOf(k)[0] + (gate[0] - rowOf(k)[0]) * u, rowOf(k)[1] + (gate[1] - rowOf(k)[1]) * u], 12);
  // each mark keeps its own orbit, so the five never overlap on their way round
  const orbit = 188 + 14 * ROW_ORDER.indexOf(k);
  return walk([...line, ...roundCentre(gate, end, orbit).slice(1)]);
};
const inStart = (k: AgentKey) => S4.marksIn + ROW_ORDER.indexOf(k) * S4.marksInStagger;
const inFrames = (k: AgentKey) => Math.round(inWay(k).len / S4.markSpeed);

/** When agent k's arc begins its slide into the ring: the moment its mark arrives. */
export const arcStartFrame = (k: AgentKey) => inStart(k) + inFrames(k);
export const arcProgress = (k: AgentKey, f: number) => prog(f, arcStartFrame(k), arcStartFrame(k) + S4.arcDur, arrive);
export const LAST_ARC_FRAME = Math.max(...ROW_ORDER.map((k) => arcStartFrame(k) + S4.arcDur));

export type MarkState = { k: AgentKey; at: Pt; facing: number; opacity: number };

const linear = (t: number) => t;

/** Every finding mark on screen at frame f. */
export const findingMarksAt = (f: number): MarkState[] => {
  const out: MarkState[] = [];
  for (const k of ROW_ORDER) {
    const appear = prog(f, FINDING_AT[k], FINDING_AT[k] + 10, arrive);
    if (appear <= 0) continue;
    let at = markHome(k);
    let facing = homeAngle(k);
    let opacity = appear;
    // round to the waiting place, turning to face the way out
    const t1 = prog(f, toSlotStart(k), toSlotStart(k) + toSlotFrames(k), linear);
    if (t1 > 0) {
      at = toSlot(k).at(ease(t1));
      facing = lerpAngle(homeAngle(k), 0, sstep(t1));
    }
    // out together, collecting beside Priora
    const t2 = prog(f, leaveStart(k), leaveStart(k) + S3.leaveFrames, linear);
    if (t2 > 0) {
      at = leaveWay(k).at(ease(t2));
      facing = 0;
    }
    // back in and round to its agent's side, turning to face outwards the way its arc does
    const t3 = prog(f, inStart(k), arcStartFrame(k), linear);
    if (t3 > 0) {
      at = inWay(k).at(ease(t3));
      facing = lerpAngle(0, arcMidAngle(k), sstep((t3 - 0.2) / 0.8));
    }
    // it becomes its arc: a quick cross-fade as the arc starts to slide
    const u = arcProgress(k, f);
    if (u > 0) {
      facing = arcMidAngle(k);
      at = behind(arcMidAt(k, u), facing);
      opacity *= 1 - Math.min(1, u * 3.3);
    }
    if (opacity > 0) out.push({ k, at, facing, opacity });
  }
  return out;
};
