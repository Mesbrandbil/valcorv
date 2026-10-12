// Every world coordinate in the film, defined once. World units: 1 unit = 1 screen px at zoom 1.0.
// Angles are degrees clockwise from +x with y down (270 = 12 o'clock). Source: plan.md section 4.
import { Pt, cubic, polar } from './geometry';

export const WORLD = { width: 5760, height: 3240 } as const;

// ---------- Real world (lower centre) ----------
export const GROUND = { y: 2300, x0: 2260, x1: 3500 } as const;

export const WORKER = {
  feet: [2480, 2300] as Pt,
  height: 156,
  phoneRest: [2510, 2224] as Pt,
  phoneRaised: [2526, 2168] as Pt,
} as const;

export const SITE = {
  base: [2880, 2300] as Pt,
  hall: { x0: 2710, x1: 3070, roof: 2186 },
  serviceBlock: { x0: 2730, x1: 2812, top: 2096 },
  window: { c: [2990, 2236] as Pt, w: 32, h: 20 },
  roofEmit: [2890, 2186] as Pt,
} as const;

export const RISK_OWNER = {
  base: [3300, 2300] as Pt,
  deskTop: 2232,
  deskX0: 3226,
  deskX1: 3386,
  head: [3316, 2152] as Pt,
} as const;

/** The human decision line always starts here: the desk top, right corner. */
export const DESK_ORIGIN: Pt = [3386, 2232];
export const PACKET_DOCK: Pt = [3480, 2100];
export const RISK_OWNER_DECIDES: Pt = [3540, 2262];
export const SHORT_LIST: Pt = [3480, 1905]; // centred above the decision loop

export const REAL_LABELS = {
  y: 2352,
  worker: 2480,
  site: 2890,
  riskOwner: 3300,
  size: 24,
} as const;

export const RECORD = {
  y: 2440,
  x0: 2260,
  x1: 3500,
  mark1: 2990,
  mark2: 3300,
  markHeight: 24,
  keptLabel: [2990, 2494] as Pt,
} as const;

export const NO_ONE_DISTURBED: Pt = [3420, 2166];
export const SPARK: Pt = SITE.window.c;

// ---------- Sequence 1 overlay ----------
export const S1 = {
  sentence1: [2880, 1764] as Pt,
  sentence2: [2880, 1840] as Pt,
  sentenceSize: 52,
  priora: [2880, 1950] as Pt,
  orbit: { c: [2880, 2232] as Pt, rx: 780, ry: 282 },
  stations: [62, 128, 180, 232, 298], // degrees from the top of the ellipse, clockwise
} as const;

// ---------- Voice note and case assembly (Sequence 2) ----------
// Seen at S2_VOICE (zoom 1.8): 24.5 world units is 44 px on screen, the sentence minimum.
// Priora glides in from above the group to hover just above and to the right of the worker. The message sits to
// its right in three evenly broken lines, high enough that the dotted listening thread, from the bead down to the
// growing tip of the waveform, passes beneath every word.
export const VOICE = {
  textX: 2640,
  lines: ['Hey, the bracket by the packing line', 'has cracked again. We’re going to', 'weld it before the night shift.'],
  baselines: [1900, 1936, 1972],
  size: 24.5,
  waveY: 2046,
  waveX0: 2556,
  waveX1: 3060,
  waveAmp: 15,
  prioraListen: [2560, 1960] as Pt,
} as const;

export const CASE_A: Pt = [2890, 1750];
export const PRIORA_CASE: Pt = [2610, 1880];

// ---------- The case (local coordinates, never rotates) ----------
export const CASE = {
  coreR: 9,
  ringR: 34,
  ringW: 2.5,
  facetOpenR: 92,
  facetFoldedR: 52,
  facetTuckedR: 46,
  chipR: 16,
  findingsR: 70,
  packetR: 58,
  arcW: 9,
} as const;

/** Where the four dashed Transfer answers rest beside the packet: a 2 x 2 cluster, clear of the decision loop. */
export const ANSWER_ASIDE = { x: CASE.packetR + 64, y: -13, step: 26, size: 18 } as const;

export type FacetKey = 'repair' | 'nightShift' | 'hotWork' | 'conditions' | 'photo' | 'packingLine';
export const FACET_ANGLE: Record<FacetKey, number> = {
  repair: 270,
  nightShift: 330,
  hotWork: 30,
  conditions: 90,
  photo: 150,
  packingLine: 210,
};
export const FACET_LABEL: Record<FacetKey, string> = {
  repair: 'REPAIR',
  nightShift: 'BEFORE NIGHT SHIFT',
  hotWork: 'HOT WORK',
  conditions: 'SITE + INSURANCE CONDITIONS',
  photo: 'PHOTO',
  packingLine: 'PACKING LINE',
};

export type AgentKey = 'siteRules' | 'insurer' | 'fire' | 'riskEng' | 'evidence';
/** Findings arcs, degrees. Insurer conditions' arc becomes the gap. */
export const ARC_SPAN: Record<AgentKey, [number, number]> = {
  insurer: [66, 114],
  evidence: [114, 192],
  riskEng: [192, 270],
  siteRules: [270, 348],
  fire: [348, 426],
};
export const GAP = { centre: 90, half: 24 } as const;

// ---------- Site panel (left) ----------
export const PANEL = {
  c: [1300, 1500] as Pt,
  wallR: 600,
  wallW: 3,
  entranceHalf: 14,
  tableR: 330,
  tableBand: 14,
  seatR: 390,
  seatRingR: 42,
  title: [1300, 822] as Pt,
  titleSize: 46,
  sub: [1300, 868] as Pt,
  subSize: 32,
  nameSize: 34,
  namePx: 24,
} as const;
/** The case sits at the table a little larger than in travel, so its facets read at the table shots. */
export const CASE_TABLE_SCALE = 1.15;
export const PANEL_ENTRANCE: Pt = [1900, 1500];
export const PRIORA_PANEL: Pt = [2010, 1470];
export const CASE_WAIT: Pt = [2150, 1560];
export const PRIORA_PAUSE: Pt = [2370, 1770];

export const seatAngle = (k: number) => 22.5 + 45 * k;
export const seatPos = (k: number): Pt => polar(PANEL.c, PANEL.seatR, seatAngle(k));

export const SEAT_OF: Record<AgentKey, number> = { fire: 0, insurer: 1, evidence: 3, riskEng: 4, siteRules: 6 };
export const GHOSTS = [
  { seat: 2, name: 'Electrical' },
  { seat: 5, name: 'Structural' },
  { seat: 7, name: 'Security' },
] as const;

export const AGENT_NAME: Record<AgentKey, string> = {
  siteRules: 'Site rules',
  insurer: 'Insurer conditions',
  fire: 'Fire',
  riskEng: 'Risk engineering',
  evidence: 'Evidence check',
};

/** Where each seat's name sits, relative to the seat: below for bottom seats, above for top seats, beside for side seats. */
export const nameAnchor = (k: number): { at: Pt; anchor: 'start' | 'middle' | 'end' } => {
  const [x, y] = seatPos(k);
  switch (k) {
    case 0: return { at: [x + 60, y + 10], anchor: 'start' };
    case 7: return { at: [x + 60, y + 10], anchor: 'start' };
    // the two left seats: their long names shift outwards, clear of the table band and the wall
    case 3: return { at: [x - 50, y + 88], anchor: 'middle' };
    case 4: return { at: [x - 50, y - 64], anchor: 'middle' };
    case 1: case 2: return { at: [x, y + 88], anchor: 'middle' };
    default: return { at: [x, y - 64], anchor: 'middle' };
  }
};

export const RULERS = {
  x0: 1072,
  label1Y: 1632,
  ruler1Y: 1648,
  label2Y: 1688,
  ruler2Y: 1704,
  short: 150,
  long: 300,
  size: 27,
} as const;
export const BARRIER: Pt = [2070, 1494];
export const BARRIER_LABEL: Pt = [2050, 1408];

// ---------- Decision rooms (right) ----------
export const FORECOURT = { c: [4440, 1560] as Pt, r: 110 } as const;
export const ROOM = { r: 330, band: 28, opening: 44 } as const;
export type RoomKey = 'retain' | 'mitigate' | 'transfer';
export const ROOM_ANGLE: Record<RoomKey, number> = { retain: 210, mitigate: 90, transfer: 330 };
export const ROOM_DIST = 490;
export const roomCentre = (k: RoomKey): Pt => polar(FORECOURT.c, ROOM_DIST, ROOM_ANGLE[k]);
/** Direction from a room's centre to the forecourt: its opening faces this way. */
export const roomOpeningAngle = (k: RoomKey) => (ROOM_ANGLE[k] + 180) % 360;
/** The middle of the fine threshold line drawn across a room's opening. */
export const threshold = (k: RoomKey): Pt => polar(roomCentre(k), (ROOM.r - ROOM.band / 2) * Math.cos(((ROOM.opening / 2) * Math.PI) / 180), roomOpeningAngle(k));
export const forecourtRimToward = (k: RoomKey): Pt => polar(FORECOURT.c, FORECOURT.r, ROOM_ANGLE[k]);

/**
 * Room labels. For Retain and Transfer, `name` is where the lowest label line must sit above the room:
 * the name and its status lines stack upwards from it at every zoom. For Mitigate the stack runs
 * downwards from the name, beside the room.
 */
export const ROOM_LABEL: Record<RoomKey, { name: Pt; anchor: 'start' | 'middle' }> = {
  retain: { name: [4016, 950], anchor: 'middle' },
  mitigate: { name: [4800, 2070], anchor: 'start' },
  transfer: { name: [4864, 950], anchor: 'middle' },
};
export const ROOM_NAME_PX = 44; // readable sizing, base px at zoom 1
export const ROOM_STATUS_PX = 27;

export const RETAIN_INSIDE = {
  packet: [4040, 1320] as Pt,
  leaders: [
    { text: 'EXPOSURE', at: [3960, 1200] as Pt, anchor: 'end' as const },
    { text: 'AUTHORITY', at: [4110, 1200] as Pt, anchor: 'start' as const },
    { text: 'CONDITIONS', at: [3960, 1450] as Pt, anchor: 'end' as const },
    { text: 'EXPIRY', at: [4110, 1450] as Pt, anchor: 'start' as const },
  ],
  // inside the room, above the packet: the room's rule, readable before the threshold opens
  agentCannot: [4016, 1150] as Pt, // where the room is wide enough to leave paper at both ends
  // beside the black line where it comes in from the desk, right aligned, below Retain's band
  riskOwnerLabel: [4232, 1676] as Pt,
  prioraAt: [4016, 1545] as Pt,
};

export const MITIGATE_INSIDE = {
  packet: [4390, 1920] as Pt,
  safeguards: [
    { key: 'thermal', at: [4252, 2120] as Pt, name: ['Thermal', 'check'], cost: 1, time: 0.3 },
    { key: 'watch', at: [4440, 2120] as Pt, name: ['Extend watch', 'to 60 min'], cost: 2, time: 0.6 },
    { key: 'workshop', at: [4628, 2120] as Pt, name: ['Move weld', 'to workshop'], cost: 3, time: 0.85 },
  ],
  resultLabel: [4520, 1912] as Pt,
  resultSize: 22,
  prioraAt: [4440, 2298] as Pt, // below the names, with room for the bead
};

/** World size of the simulated agents' role labels: 29 px in the Transfer close-up; they fade before the wide shots. */
export const TRANSFER_AGENT_LABEL_SIZE = 24;
export const TRANSFER_INSIDE = {
  packet: [4800, 1340] as Pt,
  prioraAt: [4680, 1430] as Pt,
  // just outside the wall, on the side away from the forecourt and clear of the label stack above
  agents: ([[315, 'CARRIER'], [5, 'CAPACITY'], [50, 'BROKER']] as const).map(([a, label]) => {
    const at = polar(roomCentre('transfer'), ROOM.r + 70, a);
    return { angle: a, label, at, labelAt: [at[0] + 44, at[1] + 8] as Pt };
  }),
  answers: [4910, 1250] as Pt,
};

// ---------- Paths, defined once ----------
export const PATH = {
  caseToPanel: cubic(CASE_A, [2700, 1560], [2350, 1480], CASE_WAIT),
  work: `M ${PANEL.c[0] + CASE.findingsR * CASE_TABLE_SCALE} ${PANEL.c[1]} L ${PANEL_ENTRANCE[0]} ${PANEL_ENTRANCE[1]} C 2300 1500, 2660 1700, ${SITE.window.c[0]} ${SITE.window.c[1] - 14}`,
  // over the real world to the dock beside the risk owner, then down to the corner of the desk
  escalateToDock: cubic([1960, 1500], [2500, 1200], [3460, 1800], PACKET_DOCK),
  escalate: `${cubic([1960, 1500], [2500, 1200], [3460, 1800], PACKET_DOCK)} C ${PACKET_DOCK[0] + 4} ${PACKET_DOCK[1] + 60}, 3440 2226, ${DESK_ORIGIN[0] + 2} ${DESK_ORIGIN[1] - 3}`,
  deskToForecourt: cubic(DESK_ORIGIN, [3700, 2232], [4150, 1720], polar(FORECOURT.c, FORECOURT.r, 150)),
  // down past the end of the desk, then under the risk owner onto the record line
  // the decided case rests just above its record mark, so the new mark stays in view
  recordDrop: cubic(PACKET_DOCK, [3480, 2330], [3420, 2400], [RECORD.mark2, RECORD.y - 62]),
} as const;

// ---------- The human decision line ----------
/**
 * The human line beyond the desk path: it turns onto the forecourt's rim with a short fillet, rides the rim,
 * bends off it and runs up the spur to a room's threshold. One smooth line, no hard corners.
 */
const RIM_START = 150;
const FILLET_DEG = 18;
const f1 = (v: number) => v.toFixed(1);
const rimTail = (k: RoomKey): string => {
  const c = FORECOURT.c;
  const r = FORECOURT.r;
  const delta = k === 'mitigate' ? -60 : k === 'retain' ? 60 : 180;
  const dir = Math.sign(delta);
  const tangent = (a: number): Pt => (dir > 0 ? [-Math.sin((a * Math.PI) / 180), Math.cos((a * Math.PI) / 180)] : [Math.sin((a * Math.PI) / 180), -Math.cos((a * Math.PI) / 180)]);
  // onto the rim: leave the desk path along its own direction, join the rim along the rim's
  const p0 = polar(c, r, RIM_START);
  const inLen = Math.hypot(p0[0] - 4150, p0[1] - 1720);
  const din: Pt = [(p0[0] - 4150) / inLen, (p0[1] - 1720) / inLen];
  const a1 = RIM_START + dir * FILLET_DEG;
  const p1 = polar(c, r, a1);
  const t1 = tangent(a1);
  const onto = `C ${f1(p0[0] + din[0] * 16)} ${f1(p0[1] + din[1] * 16)}, ${f1(p1[0] - t1[0] * 16)} ${f1(p1[1] - t1[1] * 16)}, ${f1(p1[0])} ${f1(p1[1])}`;
  // round the rim, stopping a little short of the spur
  const aEnd = RIM_START + delta;
  const a2 = aEnd - dir * 12;
  const p2 = polar(c, r, a2);
  const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
  const round = `A ${r} ${r} 0 ${large} ${dir > 0 ? 1 : 0} ${f1(p2[0])} ${f1(p2[1])}`;
  // off the rim and up the spur
  const t2 = tangent(a2);
  const out = polar(c, r + 26, aEnd);
  const radial: Pt = [Math.cos((aEnd * Math.PI) / 180), Math.sin((aEnd * Math.PI) / 180)];
  const off = `C ${f1(p2[0] + t2[0] * 14)} ${f1(p2[1] + t2[1] * 14)}, ${f1(out[0] - radial[0] * 14)} ${f1(out[1] - radial[1] * 14)}, ${f1(out[0])} ${f1(out[1])}`;
  const [tx, ty] = threshold(k);
  return `${onto} ${round} ${off} L ${f1(tx)} ${f1(ty)}`;
};
/** From the desk, along the path to the forecourt, round its rim, and up the spur to a room's threshold. */
export const humanPathTo = (k: RoomKey): string => `${PATH.deskToForecourt} ${rimTail(k)}`;
/** The part of the human line beyond the desk path. */
export const humanRimSpur = (k: RoomKey): string => `M ${polar(FORECOURT.c, FORECOURT.r, RIM_START).map(f1).join(' ')} ${rimTail(k)}`;

export const LOOP = { c: PACKET_DOCK, r: 92, entry: 160 } as const;
/** The human line from the desk round the packet: loose (Sequence 5, a decision not yet made) or closed (Sequence 7). */
export const humanLoop = (closed: boolean): string => {
  const [ix, iy] = polar(LOOP.c, LOOP.r, LOOP.entry);
  // the rise from the desk arrives along the loop's own direction, so the two read as one loose curve
  const e = (LOOP.entry * Math.PI) / 180;
  const rise = `M ${DESK_ORIGIN[0]} ${DESK_ORIGIN[1]} C ${DESK_ORIGIN[0]} ${DESK_ORIGIN[1] - 42}, ${(ix + Math.sin(e) * 40).toFixed(1)} ${(iy - Math.cos(e) * 40).toFixed(1)}, ${ix.toFixed(1)} ${iy.toFixed(1)}`;
  if (!closed) {
    const [ex, ey] = polar(LOOP.c, LOOP.r, LOOP.entry + 320);
    return `${rise} A ${LOOP.r} ${LOOP.r} 0 1 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  }
  const [mx, my] = polar(LOOP.c, LOOP.r, LOOP.entry + 180);
  const [fx, fy] = polar(LOOP.c, LOOP.r, LOOP.entry + 372);
  return `${rise} A ${LOOP.r} ${LOOP.r} 0 0 1 ${mx.toFixed(1)} ${my.toFixed(1)} A ${LOOP.r} ${LOOP.r} 0 0 1 ${fx.toFixed(1)} ${fy.toFixed(1)}`;
};


