// Sequence 6: what happens inside the rooms. Retain: room agents and four leaders. Mitigate: three
// safeguards, two tried in the gap, Evidence check's corners. Transfer: dashed copies of the gap travel
// out to the simulated agents, hollow answers return, and Priora gathers them.
import React from 'react';
import { COLOR, DASH_PX } from '../../lib/tokens';
import { arrive, ease, lerp, prog } from '../../lib/motion';
import { annulusSector, polar, type Pt } from '../../lib/geometry';
import { ANSWER_ASIDE, GAP, MITIGATE_INSIDE, RETAIN_INSIDE, ROOM, TRANSFER_INSIDE, CASE, roomCentre } from '../../lib/layout';
import { S6 } from '../../lib/timeline';
import { usePx } from '../../camera/Camera';
import { EvidenceCheck, RoomAgent, Safeguard } from '../../cast/agents';
import { DrawnLine } from '../../cast/lines';
import { casePos } from '../cast';

const ROOM_AGENTS: Pt[] = [[-96, 40], [92, 44], [8, -98]];

const Retain: React.FC<{ f: number }> = ({ f }) => {
  const px = usePx();
  const falls = 1 - prog(f, S6.retainFalls[0], S6.retainFalls[1]);
  if (f < S6.roomAgents[0] || falls <= 0) return null;
  const [cx, cy] = RETAIN_INSIDE.packet;
  const gather = prog(f, S6.roomAgents[0], S6.roomAgents[1], arrive);
  return (
    <g opacity={falls}>
      {ROOM_AGENTS.map(([dx, dy], i) => {
        const g = prog(f, S6.roomAgents[0] + i * 4, S6.roomAgents[1] + i * 4, arrive);
        const spread = lerp(1.8, 1, g);
        return <RoomAgent key={i} at={[cx + dx * spread, cy + dy * spread]} variant={i as 0 | 1 | 2} opacity={g * gather} />;
      })}
      {RETAIN_INSIDE.leaders.map((l, i) => {
        const a = S6.leaders[0] + i * 4;
        const p = prog(f, a, a + 10);
        if (p <= 0) return null;
        const tx = l.at[0] + (l.anchor === 'end' ? 8 : -8);
        const ty = l.at[1] - 8;
        const [sx, sy] = polar(RETAIN_INSIDE.packet, 80, (Math.atan2(ty - cy, tx - cx) * 180) / Math.PI);
        return <line key={i} x1={sx} y1={sy} x2={lerp(sx, tx, p)} y2={lerp(sy, ty, p)} stroke={COLOR.ink} strokeWidth={px(1.4)} />;
      })}
    </g>
  );
};

const Mitigate: React.FC<{ f: number }> = ({ f }) => {
  const px = usePx();
  if (f < S6.safeguards[0] || f > S6.proposalWithdraws[1] + 40) return null;
  const [cx, cy] = MITIGATE_INSIDE.packet;
  const out = 1 - prog(f, S6.proposalWithdraws[1], S6.proposalWithdraws[1] + 16);
  const gapPoint = (packetAt: Pt): Pt => polar(packetAt, 58 + 40, GAP.centre);
  return (
    <g opacity={out}>
      {MITIGATE_INSIDE.safeguards.map((s, i) => {
        const print = prog(f, S6.safeguards[0] + S6.safeguardDelay[i], S6.safeguards[0] + S6.safeguardDelay[i] + 12, arrive);
        let lift = 0;
        let move = 0;
        if (s.key === 'thermal') {
          lift = prog(f, S6.thermalRise[0], S6.thermalRise[0] + 8) * (1 - prog(f, S6.thermalBack[0] + 6, S6.thermalBack[1]));
          move = prog(f, S6.thermalRise[0] + 4, S6.thermalRise[1]) * (1 - prog(f, S6.thermalBack[0], S6.thermalBack[1]));
        }
        if (s.key === 'watch') {
          lift = prog(f, S6.watchRise[0], S6.watchRise[0] + 8) * (1 - prog(f, S6.proposalWithdraws[0] + 6, S6.proposalWithdraws[1]));
          move = prog(f, S6.watchRise[0] + 4, S6.watchRise[1]) * (1 - prog(f, S6.proposalWithdraws[0], S6.proposalWithdraws[1]));
        }
        const target = gapPoint(casePos(f));
        const offset: Pt = [(target[0] - s.at[0]) * ease(move), (target[1] - s.at[1]) * ease(move)];
        return <Safeguard key={s.key} variant={s.key as 'thermal' | 'watch' | 'workshop'} at={s.at} cost={s.cost} time={s.time} lift={lift} glyphOffset={offset} opacity={print} />;
      })}
      {/* Evidence check's corner marks settle round the result */}
      {(() => {
        const c = prog(f, S6.corners[0], S6.corners[1], arrive) * (1 - prog(f, S6.resultsOut, S6.resultsOut + 10));
        if (c <= 0) return null;
        const k = lerp(124, 96, c);
        const l = 16 * c;
        return (
          <g opacity={c}>
            <EvidenceCheck at={[cx - 150, cy - 40]} scale={0.5} opacity={1} />
            <g stroke={COLOR.cobalt} strokeWidth={px(2.4)} fill="none" strokeLinecap="round">
              {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], i) => (
                <path key={i} d={`M ${cx + sx * k} ${cy + sy * (k - l)} L ${cx + sx * k} ${cy + sy * k} L ${cx + sx * (k - l)} ${cy + sy * k}`} />
              ))}
            </g>
          </g>
        );
      })()}
    </g>
  );
};

/** A dashed copy of the gap: the same 48° piece of the packet's ring. */
const GapCopy: React.FC<{ at: Pt; opacity: number }> = ({ at, opacity }) => {
  const px = usePx();
  const r = CASE.packetR;
  return (
    <g transform={`translate(${at[0].toFixed(1)} ${at[1].toFixed(1)}) translate(0 ${-r})`} opacity={opacity}>
      <path d={annulusSector([0, 0], r - 4.5, r + 4.5, GAP.centre - GAP.half, GAP.centre + GAP.half)} fill="none" stroke={COLOR.cobalt} strokeWidth={px(1.6)} strokeDasharray={`${px(DASH_PX[0] * 0.6)} ${px(DASH_PX[1] * 0.6)}`} />
    </g>
  );
};

const Transfer: React.FC<{ f: number }> = ({ f }) => {
  const px = usePx();
  if (f < S6.copiesOut[0] || f > S6.gather[1] + 2) return null;
  const packet = TRANSFER_INSIDE.packet;
  const out = prog(f, S6.copiesOut[0], S6.copiesOut[1]);
  const back = prog(f, S6.answersBack[0], S6.answersBack[1]);
  const gather = prog(f, S6.gather[0], S6.gather[1]);
  const items: React.ReactNode[] = [];
  // fine dashed paths from the packet out through the small openings, then the copies travel along them
  // and come to rest just inside each agent, on the side facing the room, never on top of its glyph
  const [rcx, rcy] = roomCentre('transfer');
  TRANSFER_INSIDE.agents.forEach((a, i) => {
    const opening = polar([rcx, rcy], ROOM.r - ROOM.band / 2, a.angle);
    const land = polar([rcx, rcy], ROOM.r + 26, a.angle);
    const pathIn = prog(f, S6.copiesOut[0] - 8 + i * 3, S6.copiesOut[0] + 6 + i * 3);
    const pathOut = 1 - prog(f, S6.answersOut, S6.answersOut + 10);
    if (pathIn > 0 && pathOut > 0) {
      items.push(<DrawnLine key={`path-${i}`} d={`M ${packet[0]} ${packet[1]} L ${opening[0].toFixed(1)} ${opening[1].toFixed(1)} L ${land[0].toFixed(1)} ${land[1].toFixed(1)}`} progress={pathIn} dashed color={COLOR.cobalt} px={1.2} opacity={0.6 * pathOut} />);
    }
    if (out <= 0 || back >= 1) return;
    const u = ease(prog(f, S6.copiesOut[0] + i * 3, S6.copiesOut[1] + i * 3));
    const p: Pt = u < 0.6 ? [lerp(packet[0], opening[0], u / 0.6), lerp(packet[1], opening[1], u / 0.6)] : [lerp(opening[0], land[0], (u - 0.6) / 0.4), lerp(opening[1], land[1], (u - 0.6) / 0.4)];
    items.push(<GapCopy key={`copy-${i}`} at={p} opacity={(1 - prog(f, S6.answersBack[0], S6.answersBack[0] + 6)) * Math.min(1, u * 4)} />);
  });
  // hollow answers return, one square for each answer, and settle beside the packet
  const [ax, ay] = TRANSFER_INSIDE.answers;
  [0, 1, 2, 3].forEach((i) => {
    if (back <= 0) return;
    const agent = TRANSFER_INSIDE.agents[i % 3];
    const u = ease(prog(f, S6.answersBack[0] + i * 3, S6.answersBack[1] + i * 2));
    const home: Pt = [ax + 11, ay + i * 40 - 7];
    const opening = polar(roomCentre('transfer'), ROOM.r - ROOM.band / 2, agent.angle);
    const from = polar(roomCentre('transfer'), ROOM.r + 26, agent.angle);
    let p: Pt = u < 0.4 ? [lerp(from[0], opening[0], u / 0.4), lerp(from[1], opening[1], u / 0.4)] : [lerp(opening[0], home[0], (u - 0.4) / 0.6), lerp(opening[1], home[1], (u - 0.4) / 0.6)];
    // Priora gathers them into the packet, where they stay dashed off to one side
    if (gather > 0) {
      const aside: Pt = [packet[0] + ANSWER_ASIDE.x + (i % 2) * ANSWER_ASIDE.step, packet[1] + ANSWER_ASIDE.y + Math.floor(i / 2) * ANSWER_ASIDE.step];
      p = [lerp(home[0], aside[0], ease(gather)), lerp(home[1], aside[1], ease(gather))];
    }
    items.push(
      <rect key={`answer-${i}`} x={p[0] - 11} y={p[1] - 11} width={22} height={22} fill="none" stroke={COLOR.cobalt} strokeWidth={px(1.6)} strokeDasharray={`${px(DASH_PX[0] * 0.6)} ${px(DASH_PX[1] * 0.6)}`} opacity={Math.min(1, u * 3) * (1 - gather)} />,
    );
  });
  return <g>{items}</g>;
};

export const Seq6Overlay: React.FC<{ f: number }> = ({ f }) => (
  <g>
    <Retain f={f} />
    <Mitigate f={f} />
    <Transfer f={f} />
  </g>
);
