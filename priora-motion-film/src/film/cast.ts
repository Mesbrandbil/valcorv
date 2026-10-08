// Priora and the case across the whole film. Each is one object with one identity from its first frame
// to its last; these functions say where it is and what state it is in at any frame.
import type { CaseProps, FacetState, ArcState } from '../cast/Case';
import type { Pt } from '../lib/geometry';
import { arrive, keys, keysAngle, lerp, lerpAngle, prog } from '../lib/motion';
import {
  CASE_A,
  CASE_TABLE_SCALE,
  CASE_WAIT,
  MITIGATE_INSIDE,
  PACKET_DOCK,
  PANEL,
  PATH,
  PRIORA_CASE,
  PRIORA_PANEL,
  PRIORA_PAUSE,
  RETAIN_INSIDE,
  S1 as S1_LAYOUT,
  SEAT_OF,
  TRANSFER_INSIDE,
  VOICE,
  WORKER,
  seatPos,
  type AgentKey,
  type FacetKey,
} from '../lib/layout';
import { S1, S2, S3, S4, S5, S6, S7, S8 } from '../lib/timeline';
import { add, along, angleBetween, curve, line, track, type Journey } from './track';

// ---------------------------------------------------------------- places Priora visits
export const P = {
  s1: S1_LAYOUT.priora,
  listen: VOICE.prioraListen,
  case: PRIORA_CASE,
  panel: PRIORA_PANEL,
  pause: PRIORA_PAUSE,
  pickup: [2040, 1590] as Pt, // below the route, clear of NO HARD STOP CONFIGURED
  desk: [3600, 1960] as Pt,
  retainStop: [4440, 1390] as Pt,
  retainIn: RETAIN_INSIDE.prioraAt,
  mitigateWait: [4440, 1560] as Pt,
  mitigateIn: MITIGATE_INSIDE.prioraAt,
  transferWait: [4420, 1545] as Pt,
  transferIn: TRANSFER_INSIDE.prioraAt,
  mitigateDoor: [4530, 1520] as Pt,
  retainDoor: [4470, 1430] as Pt,
  deskFinal: [3740, 1990] as Pt,
  top: [2980, 1050] as Pt,
} as const;

// ---------------------------------------------------------------- places the case visits
export const C = {
  a: CASE_A,
  wait: CASE_WAIT,
  table: PANEL.c,
  escStart: [1960, 1500] as Pt,
  dock: PACKET_DOCK,
  retainWait: [4430, 1575] as Pt,
  retainIn: RETAIN_INSIDE.packet,
  mitigateWait: [4440, 1600] as Pt,
  mitigateIn: MITIGATE_INSIDE.packet,
  transferWait: [4520, 1620] as Pt,
  transferIn: TRANSFER_INSIDE.packet,
  mitigateDoor: [4440, 1610] as Pt,
  retainDoor: [4380, 1540] as Pt,
  record: [3300, 2400] as Pt,
} as const;

/** While carried along the escalation route, Priora floats just above and ahead of the packet. */
const carryOffset = (u: number): Pt => [lerp(80, 120, u), lerp(90, -140, u)];

const PRIORA_JOURNEYS: Journey[] = [
  { span: S2.prioraGlide, at: curve(P.s1, [2800, 1890], [2650, 1930], P.listen) },
  { span: S2.prioraToCase, at: line(P.listen, P.case) },
  { span: S3.travel, at: curve(P.case, [2400, 1660], [2160, 1460], P.panel) },
  { span: S4.prioraGlide, at: curve(P.panel, [2150, 1560], [2280, 1720], P.pause) },
  { span: S5.prioraToEntrance, at: curve(P.pause, [2250, 1700], [2100, 1620], P.pickup) },
  { span: S5.carry, at: (u) => add(along(PATH.escalateToDock)(u), carryOffset(u)) },
  { span: S6.carryToRetain, at: curve(P.desk, [3950, 1880], [4300, 1600], P.retainStop) },
  { span: S6.intoRetain, at: curve(P.retainStop, [4330, 1450], [4150, 1560], P.retainIn) },
  { span: S6.carryToMitigate, at: curve(P.retainIn, [4150, 1560], [4330, 1520], P.mitigateWait) },
  { span: S6.intoMitigate, at: curve(P.mitigateWait, [4440, 1700], [4440, 2000], P.mitigateIn) },
  { span: S6.carryToTransfer, at: curve(P.mitigateIn, [4440, 2000], [4440, 1700], P.transferWait) },
  { span: S6.intoTransfer, at: curve(P.transferWait, [4560, 1480], [4620, 1440], P.transferIn) },
  { span: [S6.outToForecourt[0], S7.toMitigateDoor[1]], at: curve(P.transferIn, [4620, 1460], [4570, 1500], P.mitigateDoor) },
  { span: S7.toRetainDoor, at: line(P.mitigateDoor, P.retainDoor) },
  { span: S7.toDesk, at: curve(P.retainDoor, [4200, 1600], [3950, 1900], P.deskFinal) },
  { span: S8.prioraRises, at: curve(P.deskFinal, [3650, 1700], [3250, 1150], P.top) },
];

const CASE_JOURNEYS: Journey[] = [
  // the case follows Priora on a short thread, starting a little after it
  { span: [S3.travel[0] + 6, S3.travel[1] + 6], at: along(PATH.caseToPanel) },
  { span: S3.caseIn, at: curve(C.wait, [2000, 1530], [1650, 1500], C.table) },
  { span: S5.packetOut, at: line(C.table, C.escStart) },
  { span: S5.carry, at: along(PATH.escalateToDock) },
  { span: [S6.carryToRetain[0] + 4, S6.carryToRetain[1] + 4], at: curve(C.dock, [3800, 2060], [4180, 1720], C.retainWait) },
  { span: S6.intoRetain, at: curve(C.retainWait, [4320, 1500], [4200, 1420], C.retainIn) },
  { span: S6.carryToMitigate, at: curve(C.retainIn, [4220, 1430], [4330, 1540], C.mitigateWait) },
  { span: S6.intoMitigate, at: curve(C.mitigateWait, [4440, 1720], [4400, 1820], C.mitigateIn) },
  { span: S6.carryToTransfer, at: curve(C.mitigateIn, [4430, 1800], [4440, 1700], C.transferWait) },
  { span: S6.intoTransfer, at: curve(C.transferWait, [4570, 1520], [4650, 1420], C.transferIn) },
  { span: [S6.outToForecourt[0], S7.toMitigateDoor[1]], at: curve(C.transferIn, [4620, 1440], [4480, 1520], C.mitigateDoor) },
  { span: S7.toRetainDoor, at: line(C.mitigateDoor, C.retainDoor) },
  { span: S7.toDesk, at: curve(C.retainDoor, [4200, 1720], [3800, 2080], C.dock) },
  { span: S8.caseLowers, at: along(PATH.recordDrop) },
];

export const prioraPos = (f: number): Pt => track(f, P.s1, PRIORA_JOURNEYS);
export const casePos = (f: number): Pt => track(f, C.a, CASE_JOURNEYS);

// ---------------------------------------------------------------- Priora's bead (it leads by about 6 frames)
const toCase = (f: number) => angleBetween(prioraPos(f), casePos(f));

export const beadAt = (f: number): number => {
  // Sequence 1: a short arc across the three, then it rests looking down at the work
  if (f < S1.beadArc[0]) return 150;
  if (f < S2.prioraBeadToWorker[0]) return keysAngle(f, [[S1.beadArc[0], 150], [S1.beadArc[1], 30]]);
  // towards the worker, then along the waveform's growing tip while the message plays
  if (f < S2.beadToWave[0]) return keysAngle(f, [[S2.prioraBeadToWorker[0], 30], [S2.prioraBeadToWorker[1], 165]]);
  if (f < S2.prioraBeadToCase[0]) {
    const toTip = angleBetween(prioraPos(f), waveTip(f));
    return f >= S2.beadToWave[1] ? toTip : lerpAngle(165, toTip, prog(f, S2.beadToWave[0], S2.beadToWave[1]));
  }
  // then to the case as it assembles
  if (f < S2.beadToWorker[0]) {
    const toC = angleBetween(prioraPos(f), C.a);
    return lerpAngle(angleBetween(P.listen, waveTip(S2.prioraBeadToCase[0])), toC, prog(f, S2.prioraBeadToCase[0], S2.prioraBeadToCase[1]));
  }
  if (f < 630) return keysAngle(f, [[S2.beadToWorker[0], angleBetween(P.case, C.a)], [S2.beadToWorker[1], angleBetween(P.case, WORKER.phoneRaised)]]);
  if (f < S3.travel[0] - 6) return keysAngle(f, [[630, angleBetween(P.case, WORKER.phoneRaised)], [640, angleBetween(P.case, C.a)]]);
  // Sequence 3: leads the travel left, then faces the panel; a brief look at the ghost seats
  if (f < S3.travel[1]) return keysAngle(f, [[S3.travel[0] - 6, angleBetween(P.case, C.a)], [S3.travel[0], 190], [S3.travel[1] - 8, 190], [S3.travel[1], toCase(S3.travel[1])]]);
  if (f < S3.beadToGhosts[0]) return toCase(f);
  if (f < S3.beadBack[1]) return keysAngle(f, [[S3.beadToGhosts[0], toCase(S3.beadToGhosts[0])], [S3.beadToGhosts[1], 200], [S3.beadBack[0], 200], [S3.beadBack[1], toCase(S3.beadBack[1])]]);
  if (f < S4.prioraBead[0]) return toCase(f);
  // Sequence 4: leads the glide to the pause point, then a small attentive turn to the work
  if (f < S4.beadToWork[0]) return keysAngle(f, [[S4.prioraBead[0], toCase(S4.prioraBead[0])], [S4.prioraBead[1], 40], [S4.prioraGlide[1], 40], [S4.prioraGlide[1] + 12, 120]]);
  if (f < S5.arcLoosens[0]) return keysAngle(f, [[S4.beadToWork[0], 120], [S4.beadToWork[1], 37]]);
  // Sequence 5: to the gap, then leading the carry to the desk
  if (f < S5.prioraToEntrance[0] - 6) return keysAngle(f, [[S5.arcLoosens[0], 37], [S5.arcLoosens[0] + 10, toCase(S5.arcLoosens[0] + 10)]]);
  if (f < S5.carry[0]) return keysAngle(f, [[S5.prioraToEntrance[0] - 6, toCase(S5.prioraToEntrance[0] - 6)], [S5.prioraToEntrance[0], 200], [S5.prioraToEntrance[1], 200], [S5.packetOut[1], toCase(S5.packetOut[1])]]);
  if (f < S6.carryToRetain[0] - 6) return keysAngle(f, [[S5.carry[0] - 6, toCase(S5.carry[0])], [S5.carry[0], 20], [S5.carry[1] - 10, 60], [S5.carry[1], toCase(S5.carry[1])]]);
  // Sequence 6: leads each journey; stops short at Retain, looks at the doorway, then at the risk owner
  if (f < S6.stopShort[0]) return keysAngle(f, [[S6.carryToRetain[0] - 6, toCase(S6.carryToRetain[0] - 6)], [S6.carryToRetain[0], 330], [S6.carryToRetain[1] - 8, 300]]);
  if (f < S6.intoRetain[0] - 6) return keysAngle(f, [[S6.stopShort[0], 300], [S6.stopShort[0] + 6, 160], [S6.stopShort[1], 160], [S6.stopShort[1] + 8, 140]]);
  if (f < S6.carryToMitigate[0] - 6) return keysAngle(f, [[S6.intoRetain[0] - 6, 140], [S6.intoRetain[0], 200], [S6.intoRetain[1], toCase(S6.intoRetain[1])]]);
  if (f < S6.thermalRise[0]) return keysAngle(f, [[S6.carryToMitigate[0] - 6, toCase(S6.carryToMitigate[0] - 6)], [S6.carryToMitigate[0], 20], [S6.carryToMitigate[1], 90], [S6.intoMitigate[1], toCase(S6.intoMitigate[1])]]);
  // Mitigate: attends to each option in turn
  if (f < S6.carryToTransfer[0] - 6)
    return keysAngle(f, [
      [S6.thermalRise[0] - 8, toCase(S6.thermalRise[0] - 8)],
      [S6.thermalRise[0], angleBetween(P.mitigateIn, MITIGATE_INSIDE.safeguards[0].at)],
      [S6.thermalBack[1], angleBetween(P.mitigateIn, MITIGATE_INSIDE.safeguards[0].at)],
      [S6.watchRise[0] + 4, angleBetween(P.mitigateIn, MITIGATE_INSIDE.safeguards[1].at)],
      [S6.proposalWithdraws[0], angleBetween(P.mitigateIn, MITIGATE_INSIDE.safeguards[1].at)],
      [S6.proposalWithdraws[0] + 8, toCase(S6.proposalWithdraws[0] + 8)],
    ]);
  if (f < S6.gather[0]) return keysAngle(f, [[S6.carryToTransfer[0] - 6, toCase(S6.carryToTransfer[0] - 6)], [S6.carryToTransfer[0], 270], [S6.carryToTransfer[1], 300], [S6.intoTransfer[0] - 6, 330], [S6.intoTransfer[1], toCase(S6.intoTransfer[1])]]);
  if (f < S7.toRetainDoor[0] - 6) return keysAngle(f, [[S6.gather[0], toCase(S6.gather[0])], [S6.outToForecourt[0] - 6, toCase(S6.outToForecourt[0] - 6)], [S6.outToForecourt[0], 200], [S7.toMitigateDoor[1], toCase(S7.toMitigateDoor[1])]]);
  if (f < S7.toDesk[0] - 6) return keysAngle(f, [[S7.toRetainDoor[0] - 6, toCase(S7.toRetainDoor[0] - 6)], [S7.toRetainDoor[0], 200], [S7.toRetainDoor[1], toCase(S7.toRetainDoor[1])]]);
  if (f < S8.prioraRises[0] - 6) return keysAngle(f, [[S7.toDesk[0] - 6, toCase(S7.toDesk[0] - 6)], [S7.toDesk[0], 210], [S7.toDesk[1] - 6, 200], [S7.toDesk[1], toCase(S7.toDesk[1])]]);
  // Sequence 8: rises to the upper centre; the bead settles between the panel and the rooms (straight down)
  return keysAngle(f, [[S8.prioraRises[0] - 6, toCase(S8.prioraRises[0] - 6)], [S8.prioraRises[0], 250], [S8.prioraRises[1] - 10, 250], [S8.prioraRises[1] + 6, 90]]);
};

export const prioraAt = (f: number) => {
  if (f < S1.priora[0]) return null;
  const a = prog(f, S1.priora[0], S1.priora[1], arrive);
  // Priora "rises slightly from the paper" as it attends to each Mitigate option
  const lift = prog(f, S6.thermalRise[0], S6.thermalRise[0] + 8) * (1 - prog(f, S6.thermalBack[0], S6.thermalBack[1])) + prog(f, S6.watchRise[0], S6.watchRise[0] + 8) * (1 - prog(f, S6.proposalWithdraws[0], S6.proposalWithdraws[1]));
  return {
    at: prioraPos(f),
    beadAngle: beadAt(f),
    opacity: a * (1 - prog(f, S8.dissolve[0], S8.dissolve[1])),
    scale: (0.85 + 0.15 * a) * (1 + 0.06 * Math.min(1, lift)),
  };
};

// ---------------------------------------------------------------- the waveform's growing tip (Sequence 2)
export const waveProgress = (f: number) => prog(f, S2.voice[0], S2.voice[1], (t) => t);
export const waveTip = (f: number): Pt => [lerp(VOICE.waveX0, VOICE.waveX1, waveProgress(f)), VOICE.waveY];

// ---------------------------------------------------------------- the case's state
const FACET_ORDER: FacetKey[] = ['repair', 'hotWork', 'packingLine', 'nightShift'];
const AGENT_FACET: Record<AgentKey, FacetKey> = { evidence: 'photo', riskEng: 'packingLine', siteRules: 'repair', fire: 'hotWork', insurer: 'conditions' };
export const SUMMON_ORDER: AgentKey[] = ['evidence', 'riskEng', 'siteRules', 'fire', 'insurer'];
export const summonT0 = (k: AgentKey) => S3.summonStart + S3.summonEvery * SUMMON_ORDER.indexOf(k);

/** Where an arc arrives from: the direction of its agent's seat, in the case's own coordinates. */
const arcFrom = (k: AgentKey): Pt => {
  const [sx, sy] = seatPos(SEAT_OF[k]);
  return [(sx - PANEL.c[0]) / CASE_TABLE_SCALE, (sy - PANEL.c[1]) / CASE_TABLE_SCALE];
};
const ARC_ORDER: AgentKey[] = ['evidence', 'riskEng', 'siteRules', 'fire', 'insurer'];

export const caseAt = (f: number): CaseProps | null => {
  if (f < S2.circle[0]) return null;
  const at = casePos(f);

  // scale: 1 when assembled, the table scale inside the panel, back to 1 as it becomes the packet, half on the record
  const scale = keys(f, [
    [S3.caseIn[0], 1],
    [S3.caseIn[1], CASE_TABLE_SCALE],
    [S5.fold[0], CASE_TABLE_SCALE],
    [S5.fold[1], 1],
    [S8.caseLowers[0], 1],
    [S8.caseLowers[1], 0.5],
  ]);

  // facet radius: open in Sequence 2, folded for travel, open at the table, folded for the ring, tucked in the packet
  const facetR = keys(f, [
    [S3.travel[0], 92],
    [S3.travel[0] + 40, 52],
    [S3.caseOpen[0], 52],
    [S3.caseOpen[1], 92],
    [S4.fold[0], 92],
    [S4.fold[1], 52],
    [S5.fold[0], 52],
    [S5.fold[1], 46],
  ]);
  const chipR = keys(f, [
    [S3.travel[0], 16],
    [S3.travel[0] + 40, 7],
    [S3.caseOpen[0], 7],
    [S3.caseOpen[1], 16],
    [S4.fold[0], 16],
    [S4.fold[1], 7],
    [S5.fold[0], 7],
    [S5.fold[1], 5.5],
  ]);
  const marks = keys(f, [
    [S3.travel[0], 1],
    [S3.travel[0] + 24, 0],
    [S3.caseOpen[0] + 10, 0],
    [S3.caseOpen[1], 1],
    [S4.fold[0], 1],
    [S4.fold[0] + 12, 0],
  ]);

  // facets arrive one by one in Sequence 2
  const facets: Partial<Record<FacetKey, FacetState>> = {};
  FACET_ORDER.forEach((k, i) => {
    const a = S2.chipsStart + i * S2.chipStagger;
    facets[k] = { visible: prog(f, a, a + S2.chipDur, arrive) };
  });
  facets.conditions = { visible: prog(f, S2.conditionsChip[0], S2.conditionsChip[1], arrive) };
  facets.photo = { visible: prog(f, S2.photoFacet[0], S2.photoFacet[1], arrive), solid: prog(f, S2.photoSettle[0], S2.photoSolid[1]) };
  // summons: each agent's facet pulses once
  for (const k of SUMMON_ORDER) {
    const t0 = summonT0(k);
    const fk = AGENT_FACET[k];
    const pulse = prog(f, t0, t0 + 4) * (1 - prog(f, t0 + 4, t0 + 10));
    facets[fk] = { ...facets[fk], pulse };
  }

  const chipLabelEach: Partial<Record<FacetKey, number>> = {};
  FACET_ORDER.forEach((k, i) => {
    const a = S2.chipsStart + i * S2.chipStagger + S2.chipDur + S2.chipLabelDelay;
    chipLabelEach[k] = prog(f, a, a + 10, arrive);
  });
  chipLabelEach.conditions = prog(f, S2.conditionsLabel, S2.conditionsLabel + 10, arrive);
  chipLabelEach.photo = prog(f, S2.photoLabel, S2.photoLabel + 10, arrive);
  const chipLabelsOut = 1 - prog(f, S2.chipLabelsOut, S2.chipLabelsOut + 10);

  // findings: the five arcs arrive in Sequence 4, the Insurer conditions arc slips in Sequence 5
  let findings: CaseProps['findings'] | undefined;
  if (f >= S4.arcsStart) {
    const arcs: Partial<Record<AgentKey, ArcState>> = {};
    ARC_ORDER.forEach((k, i) => {
      const a = S4.arcsStart + i * S4.arcStagger;
      const u = prog(f, a, a + S4.arcDur, arrive);
      const [fx, fy] = arcFrom(k);
      const slide = 1 - prog(f, S4.arcsSlide[0], S4.arcsSlide[1]);
      arcs[k] = { opacity: Math.min(1, u * 1.5), dx: fx * 0.8 * (1 - u), dy: fy * 0.8 * (1 - u), trim: 5 * slide };
    });
    // the slip: the Insurer conditions arc loosens, rotates, drifts out and turns dashed, then leaves the packet
    const loose = prog(f, S5.arcLoosens[0], S5.arcLoosens[1]);
    arcs.insurer = {
      ...arcs.insurer,
      rotate: 8 * loose,
      out: 6 * loose,
      dashed: f >= S5.arcDashed,
      opacity: (arcs.insurer?.opacity ?? 1) * (f >= S5.arcDashed ? 0.9 : 1) * (1 - prog(f, S5.fold[0], S5.fold[1])),
    };
    const lockPulse = prog(f, S4.lock[0], S4.lock[0] + 4) * (1 - prog(f, S4.lock[0] + 4, S4.lock[1]));
    findings = { radius: keys(f, [[S5.fold[0], 70], [S5.fold[1], 58]]), arcs, pulse: lockPulse };
  }

  // Retain: the coral bridge; Mitigate: the previewed pieces; Sequence 7: proposed, then decided
  const retainBridge = prog(f, S6.bridge[0], S6.bridge[1]) * (1 - prog(f, S6.retainFalls[0], S6.retainFalls[1]));
  const s7Bridge = prog(f, S7.bridge[0], S7.bridge[1]);
  const bridge = s7Bridge > 0 ? { opacity: s7Bridge, dashed: f < S7.solid[0] + 4 } : retainBridge > 0 ? { opacity: retainBridge } : undefined;

  const thermal = prog(f, S6.thermalPiece[0], S6.thermalPiece[1]) * (1 - prog(f, S6.thermalBack[0], S6.thermalBack[0] + 10));
  const watch = prog(f, S6.watchPiece[0], S6.watchPiece[1]) * (1 - prog(f, S6.proposalWithdraws[0], S6.proposalWithdraws[0] + 12));
  const s7Piece = prog(f, S7.safeguardPiece[0], S7.safeguardPiece[1]);
  let piece: CaseProps['piece'];
  if (s7Piece > 0) piece = { span: 0.45 * s7Piece, dashed: f < S7.solid[0] + 4 };
  else if (watch > 0) piece = { span: watch, dashed: true };
  else if (thermal > 0) piece = { span: 0.45 * thermal, dashed: true };

  return {
    at,
    scale,
    opacity: 1 - prog(f, S8.dissolve[0], S8.dissolve[1]),
    ring: prog(f, S2.circle[0], S2.circle[1]),
    core: prog(f, S2.core[0], S2.core[1], arrive),
    facetMode: f < S3.travel[0] ? 'open' : 'folded',
    facetR,
    chipR,
    marks,
    facets,
    chipLabels: f < S2.chipLabelsOut + 10 ? { size: 18, opacity: chipLabelsOut, each: chipLabelEach } : undefined,
    findings,
    coralEnds: prog(f, S5.coralEnds[0], S5.coralEnds[1]),
    bridge,
    piece,
    transferAside: prog(f, S6.gather[0], S6.gather[1]),
  };
};

