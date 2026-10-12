// The real world across the whole film: ground, worker, site, risk owner, record line, spark.
import type { RealWorldProps } from '../world/RealWorld';
import { CONTEXT_OPACITY as DIM } from '../lib/tokens';
import { arrive, keys, prog, sparkLevel } from '../lib/motion';
import { S1, S2, S4, S6, S8 } from '../lib/timeline';

/** One focal arrangement at a time: context elements ease to 28 percent during camera moves only (plan 7.1). */
const worker = (f: number) =>
  prog(f, S1.worker[0], S1.worker[1], arrive) *
  keys(f, [
    [654, 1],
    [710, DIM], // Sequence 3 is the panel's: the real world steps back as the camera travels there
    [1264, DIM],
    [1324, 1], // and comes forward again as the camera follows the route to the factory
    [1392, 1],
    [1438, DIM], // S5_GAP: the worker is context
    [S8.contextBack[0], DIM],
    [S8.contextBack[1], 1],
  ]);

const site = (f: number) =>
  prog(f, S1.site[0], S1.site[1], arrive) *
  keys(f, [
    [654, 1],
    [710, DIM],
    [1264, DIM],
    [1324, 1],
    [1572, 1],
    [1626, DIM], // S5_DESK and the rooms: the factory is context
    [S8.contextBack[0], DIM],
    [S8.contextBack[1], 1],
  ]);

const riskOwner = (f: number) =>
  prog(f, S1.riskOwner[0], S1.riskOwner[1], arrive) *
  keys(f, [
    [498, 1],
    [538, DIM], // the case assembles above the factory: the risk owner is not part of it yet
    [1264, DIM],
    [1324, 1],
  ]);

export const realAt = (f: number): RealWorldProps => {
  // phone: raised for the message, tilted to send the photo, lowered as the camera leaves
  const raise = prog(f, S2.raisePhone[0], S2.raisePhone[1]) * (1 - prog(f, 654, 684));
  const tilt = prog(f, S2.tiltPhone[0], S2.tiltPhone[1]) * (1 - prog(f, 654, 684));
  const contextGround = keys(f, [
    [S6.contextDim[0], 1],
    [S6.contextDim[1], DIM],
    [S8.contextBack[0], DIM],
    [S8.contextBack[1], 1],
  ]);
  const recordOpacity = keys(f, [
    [1392, 1],
    [1438, DIM],
    [S8.contextBack[0], DIM],
    [S8.contextBack[1], 1],
  ]);
  return {
    ground: prog(f, S1.ground[0], S1.ground[1]),
    groundOpacity: contextGround,
    figures: { worker: worker(f), site: site(f), riskOwner: riskOwner(f) },
    raise,
    tilt,
    labels: 0, // the WORKER, SITE and RISK OWNER labels are drawn from the text registry
    record: {
      line: prog(f, S4.record[0], S4.record[1]),
      marks: prog(f, S4.mark1[0], S4.mark1[1]) + prog(f, S8.mark2[0], S8.mark2[1]),
      keptLabel: 0,
      opacity: recordOpacity,
    },
    noOneDisturbed: 0,
    spark: sparkLevel(f, S4.spark) * (1 - prog(f, S8.dissolve[0], S8.dissolve[0] + 30)),
  };
};

