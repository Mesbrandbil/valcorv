// The site panel and its specialists, from their summons in Sequence 3 to the end of the film.
import type { SitePanelProps, AgentPlace } from '../world/SitePanel';
import { seatedRotation } from '../world/SitePanel';
import type { Pt } from '../lib/geometry';
import { polar } from '../lib/geometry';
import { arrive, lerp, prog } from '../lib/motion';
import { CASE_TABLE_SCALE, FACET_ANGLE, PANEL, SEAT_OF, seatAngle, seatPos, type AgentKey } from '../lib/layout';
import { S3, S4, S5, S8 } from '../lib/timeline';
import { curve } from './track';
import { SUMMON_ORDER, summonT0 } from './cast';

// Each specialist arrives from beyond the frame, slides to the entrance, then runs round inside the wall
// to its seat, so the routes curve naturally round the table and round one another.
const START: Record<AgentKey, Pt> = {
  evidence: [2860, 1820],
  riskEng: [2860, 1180],
  siteRules: [2380, 560],
  fire: [2860, 2080],
  insurer: [2860, 1500],
};
// upper lane (above Priora) or lower lane (below the waiting case)
const LANE: Record<AgentKey, 'upper' | 'lower'> = { evidence: 'lower', riskEng: 'upper', siteRules: 'upper', fire: 'lower', insurer: 'lower' };
const LANE_APPROACH: Record<'upper' | 'lower', Pt> = { upper: [2090, 1330], lower: [2060, 1700] };
const LANE_ANGLE: Record<'upper' | 'lower', number> = { upper: -7, lower: 7 };
const RUN_R = 485; // the inside track between the table and the wall

const SLIDE = 18;
const RUN = 20;
const SETTLE = 8;

/** Position along the arrival: u in 0..1 over slide, run and settle. */
const arrivalPos = (k: AgentKey, phase: 'slide' | 'run', u: number): Pt => {
  const lane = LANE[k];
  const entry = polar(PANEL.c, PANEL.wallR, LANE_ANGLE[lane]);
  if (phase === 'slide') {
    const ap = LANE_APPROACH[lane];
    return curve(START[k], [lerp(START[k][0], ap[0], 0.6), START[k][1]], ap, entry)(u);
  }
  // run inside the wall: from the entry angle to the seat angle, radius from the wall in to the seat
  let a0 = LANE_ANGLE[lane];
  let a1 = seatAngle(SEAT_OF[k]);
  if (lane === 'upper') {
    a0 += 360;
    if (a1 > a0) a1 -= 360;
  }
  const a = lerp(a0, a1, u);
  const r = u < 0.6 ? lerp(PANEL.wallR, RUN_R, u / 0.6) : lerp(RUN_R, PANEL.seatR, (u - 0.6) / 0.4);
  return polar(PANEL.c, r, a);
};

export type AgentFrame = AgentPlace & { at: Pt; moving: boolean };

/** One specialist at frame f, or null before its summons. */
export const agentAt = (k: AgentKey, f: number): AgentFrame | null => {
  const t0 = summonT0(k);
  const slide0 = t0 + 12;
  const run0 = slide0 + SLIDE;
  const settle0 = run0 + RUN;
  const seated = settle0 + SETTLE;
  if (f < slide0) return null;
  const seat = seatPos(SEAT_OF[k]);
  const rest = seatedRotation(k);
  let at: Pt;
  let rotation = rest;
  const state: Record<string, number> = {};
  let moving = false;
  if (f < run0) {
    const u = prog(f, slide0, run0);
    at = arrivalPos(k, 'slide', u);
    moving = true;
    if (k === 'evidence') rotation = 90 * (1 - u); // a quarter turn that straightens as it nears the entrance
    if (k === 'fire') rotation = rest + 220 * (1 - u); // rotates until its opening faces the case
    if (k === 'riskEng') state.open = u; // opens towards the case
  } else if (f < settle0) {
    const u = prog(f, run0, settle0);
    at = arrivalPos(k, 'run', u);
    moving = true;
    if (k === 'riskEng') state.open = 1 - 0.7 * u;
  } else {
    at = seat;
    if (k === 'riskEng') state.open = 0.3;
  }
  if (k === 'siteRules') state.aligned = prog(f, run0 + RUN - 6, seated, arrive); // the two halves align as it settles
  if (k === 'insurer') state.closed = f < seated ? 0.4 : 0; // travelling together, a small precise gap
  const opacity = prog(f, slide0, slide0 + 6);

  // the checks at the table (Sequence 3)
  if (k === 'evidence') state.corners = 0;
  if (k === 'riskEng') state.open = (state.open ?? 0.3) + 0.7 * prog(f, S3.checkRiskEng[0], S3.checkRiskEng[0] + 10) * (1 - prog(f, S3.checkRiskEng[1], S3.checkRiskEng[1] + 12));
  if (k === 'fire') {
    // turns towards the hot work facet, then back to the table
    const hot = polar(PANEL.c, 92 * CASE_TABLE_SCALE, FACET_ANGLE.hotWork);
    const toHot = (Math.atan2(hot[1] - seat[1], hot[0] - seat[0]) * 180) / Math.PI;
    const turn = prog(f, S3.checkFire[0], S3.checkFire[0] + 10) * (1 - prog(f, S3.checkFire[1] + 10, S3.checkFire[1] + 22));
    rotation = lerp(rest, toHot, turn);
  }
  if (k === 'insurer') {
    const close = prog(f, S3.checkInsurer[0], S3.checkInsurer[0] + 12) * (1 - prog(f, S3.checkInsurer[1] + 6, S3.checkInsurer[1] + 18));
    state.closed = Math.max(state.closed ?? 0, close);
    state.apart = 4 * prog(f, S5.insurerApart[0], S5.insurerApart[1]); // the slip
  }
  const name = prog(f, seated + 5, seated + 15, arrive) * (1 - prog(f, S4.namesOut, S4.namesOut + 12));
  return { at, rotation, opacity, state, nameOpacity: name, moving };
};

export const panelAt = (f: number): SitePanelProps | null => {
  if (f < S3.wall[0]) return null;
  const agents: SitePanelProps['agents'] = {};
  for (const k of SUMMON_ORDER) {
    const a = agentAt(k, f);
    if (a) agents[k] = a;
  }
  const ghostNames = {
    Electrical: prog(f, S3.ghostNames[0], S3.ghostNames[0] + 10, arrive),
    Structural: prog(f, S3.ghostNames[1], S3.ghostNames[1] + 10, arrive),
    Security: prog(f, S3.ghostNames[2], S3.ghostNames[2] + 10, arrive),
  };
  const namesOut = 1 - prog(f, S4.namesOut, S4.namesOut + 12);
  return {
    opacity: 1 - prog(f, S8.dissolve[0], S8.dissolve[1]),
    wall: prog(f, S3.wall[0], S3.wall[1]),
    table: prog(f, S3.table[0], S3.table[1], arrive),
    seats: prog(f, S3.seats[0], S3.seats[1], arrive),
    // the title is above the table shots: it fades as the camera comes down to the table
    titleOpacity: prog(f, S3.title, S3.title + 10, arrive) * (1 - prog(f, 970, 986)),
    subOpacity: prog(f, S3.sub, S3.sub + 10, arrive) * (1 - prog(f, 970, 986)),
    ghostOpacity: 0.3 * prog(f, S3.ghosts[0], S3.ghosts[1]) * (1 - prog(f, S4.ghostsOut[0], S4.ghostsOut[1])),
    ghostNameOpacity: 0,
    ghostNames: {
      Electrical: ghostNames.Electrical * namesOut,
      Structural: ghostNames.Structural * namesOut,
      Security: ghostNames.Security * namesOut,
    },
    agents,
  };
};

/** Short-lived echoes behind a moving specialist: two faint copies, gone within 8 frames. */
export const echoesAt = (f: number) => {
  const out: Array<{ k: AgentKey; at: Pt; rotation: number; opacity: number; state?: Record<string, number> }> = [];
  for (const k of SUMMON_ORDER) {
    for (const [lag, o] of [[2, 0.22], [4, 0.1]] as const) {
      const now = agentAt(k, f);
      const then = agentAt(k, f - lag);
      if (!now || !then || !now.moving) continue;
      const d = Math.hypot(now.at[0] - then.at[0], now.at[1] - then.at[1]);
      if (d < 6) continue;
      out.push({ k, at: then.at, rotation: then.rotation ?? 0, opacity: o * (then.opacity ?? 1), state: then.state });
    }
  }
  return out;
};

