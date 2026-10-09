// The decision rooms, the routes and the human decision line across the film.
import type { DecisionRoomsProps } from '../world/DecisionRooms';
import { CONTEXT_OPACITY as DIM } from '../lib/tokens';
import { arrive, keys, prog } from '../lib/motion';
import { PATH, humanLoop, humanRimSpur, type RoomKey } from '../lib/layout';
import { S4, S5, S6, S7, S8 } from '../lib/timeline';

const dissolve = (f: number) => 1 - prog(f, S8.dissolve[0], S8.dissolve[1]);

export const roomsAt = (f: number): DecisionRoomsProps | null => {
  if (f < S6.forecourt[0]) return null;
  const KEYS: RoomKey[] = ['retain', 'mitigate', 'transfer'];
  const rooms: NonNullable<DecisionRoomsProps['rooms']> = {};
  for (const k of KEYS) {
    const [b0, b1] = S6.bands[k];
    let name = prog(f, S6.names[k], S6.names[k] + 10, arrive);
    let status = prog(f, S6.statuses[k], S6.statuses[k] + 10, arrive);
    let opacity = 1;
    if (k === 'retain') {
      // in the Transfer close-up Retain's edge is in frame: 25 percent, its labels hidden, back for Sequence 7
      opacity = keys(f, [[2154, 1], [2194, 0.25], [S7.roomsBack[0], 0.25], [S7.roomsBack[1], 1]]);
      const hidden = prog(f, S6.retainLabelsOut[0], S6.retainLabelsOut[1]) * (1 - prog(f, S7.retainLabelsBack, S7.retainLabelsBack + 10, arrive));
      name *= 1 - hidden;
      status *= 1 - hidden;
    }
    // thresholds: closed, opened by the human line, closed again as the line leaves
    let threshold = 1;
    if (k === 'retain') threshold = 1 - prog(f, S6.retainOpens[0], S6.retainOpens[1]) + prog(f, S6.lineLeavesRetain[0], S6.lineLeavesRetain[1]);
    if (k === 'mitigate') threshold = 1 - prog(f, S6.mitigateOpens[0], S6.mitigateOpens[1]) + prog(f, S6.lineLeavesMitigate[0], S6.lineLeavesMitigate[1]);
    if (k === 'transfer') threshold = 1 - prog(f, S6.transferOpens[0], S6.transferOpens[1]) + prog(f, S7.lineBack[0], S7.lineBack[0] + 12);
    // A DESIGN PROPOSAL says it once for the whole sheet: the two room statuses step aside first
    if (k !== 'transfer') status *= 1 - prog(f, S8.statusesOut[0], S8.statusesOut[1]);
    rooms[k] = { print: prog(f, b0, b1, arrive), opacity, name, status, threshold: Math.min(1, threshold) };
  }
  const agentLabelsOut = 1 - prog(f, S7.transferTextOut, S7.transferTextOut + 10);
  return {
    opacity: dissolve(f),
    rooms,
    forecourt: prog(f, S6.forecourt[0], S6.forecourt[1], arrive),
    pathsOpacity: prog(f, S6.paths[0], S6.paths[1]),
    agents: prog(f, S6.bands.transfer[0] + 4, S6.bands.transfer[1] + 4),
    // in the whole sheet these would run into Retain's status: they go, and Transfer keeps SIMULATED
    noInsurer: prog(f, S6.noInsurer, S6.noInsurer + 10, arrive) * (1 - prog(f, S8.textOut, S8.textOut + 10)),
    agentLabels: S6.agentLabels.map((a) => prog(f, a, a + 10, arrive) * agentLabelsOut),
    holdSimulated: true,
  };
};

export const routesAt = (f: number) => {
  // the work route stays to the end; it recedes to context at the desk and in the rooms
  // it goes completely as the drawing recedes, so the closing statement sits on clean paper
  const workOpacity = keys(f, [[1572, 1], [1626, DIM], [S8.contextBack[0], DIM], [S8.contextBack[1], 1], [S8.recede[0], 1], [S8.recede[1], 0]]) * dissolve(f);
  const escalate = prog(f, S5.carry[0], S5.carry[1]);
  // the escalation route has done its job once the packet is at the desk: it goes, so only the human line meets the packet
  const escalateOpacity = 0.5 * (1 - prog(f, S5.carry[1], S5.carry[1] + 16)) * dissolve(f);
  return { work: prog(f, S4.route[0], S4.route[1]), workOpacity, escalate, escalateOpacity };
};

type Line = { d: string; progress: number; opacity?: number; weight?: number };

/** The human decision line: always from the desk. Loops loosely in Sequence 5, reaches each doorway in Sequence 6, closes once in Sequence 7. */
export const humanLinesAt = (f: number): Line[] => {
  const out: Line[] = [];
  // Sequence 5: the loose loop round the packet, letting go as the rooms appear
  const loop = prog(f, S5.loop[0], S5.loop[1]) * (1 - prog(f, S6.loopLetsGo[0], S6.loopLetsGo[1]));
  if (loop > 0) out.push({ d: humanLoop(false), progress: loop });
  // Sequence 6: along the desk path, then round the forecourt rim and up a spur
  const desk = prog(f, S6.lineToRetain[0], S6.lineToRetain[0] + 12) * (1 - prog(f, S7.lineBack[0] + 12, S7.lineBack[1]));
  if (desk > 0) out.push({ d: PATH.deskToForecourt, progress: desk });
  const spurs: Array<[RoomKey, number]> = [
    ['retain', prog(f, S6.lineToRetain[0] + 12, S6.lineToRetain[1]) * (1 - prog(f, S6.lineLeavesRetain[0], S6.lineLeavesRetain[1]))],
    ['mitigate', prog(f, S6.lineToMitigate[0], S6.lineToMitigate[1]) * (1 - prog(f, S6.lineLeavesMitigate[0], S6.lineLeavesMitigate[1]))],
    ['transfer', prog(f, S6.lineToTransfer[0], S6.lineToTransfer[1]) * (1 - prog(f, S7.lineBack[0], S7.lineBack[0] + 12))],
  ];
  for (const [k, p] of spurs) if (p > 0) out.push({ d: humanRimSpur(k), progress: p });
  // Sequence 7: drawn once, from the desk round the chosen combination; one soft pulse; released as the case lowers
  const close = prog(f, S7.line[0], S7.line[1]) * (1 - prog(f, S8.caseLowers[0], S8.caseLowers[0] + 14));
  if (close > 0) {
    const pulse = prog(f, S7.pulse[0], S7.pulse[0] + 5) * (1 - prog(f, S7.pulse[0] + 5, S7.pulse[1]));
    out.push({ d: humanLoop(true), progress: close, weight: 1 + 0.35 * pulse });
  }
  return out;
};
