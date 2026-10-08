import React from 'react';

// Ink texture (brief section 5): each coloured shape gets a fixed noise mask with a fixed seed.
// The filter works in the shape's own user space (primitiveUnits userSpaceOnUse), so the texture
// moves, turns and scales with the shape and never boils. Edges stay clean: flecks are only cut
// inside an eroded copy of the shape.

export type InkKind = 'cobalt' | 'ink' | 'coral' | 'stone';

const PROFILE: Record<InkKind, { fleckFreq: number; fleckCut: number; fleckGain: number; densFreq: number; densLow: number; erode: number }> = {
  // cobalt: tiny cream flecks, slight density variation
  cobalt: { fleckFreq: 0.62, fleckCut: 0.735, fleckGain: 40, densFreq: 0.03, densLow: 0.88, erode: 2.2 },
  // ink: a fine worn texture, fewer flecks
  ink: { fleckFreq: 0.75, fleckCut: 0.785, fleckGain: 40, densFreq: 0.02, densLow: 0.92, erode: 1.8 },
  // coral: softer variations in density, very few flecks
  coral: { fleckFreq: 0.6, fleckCut: 0.77, fleckGain: 36, densFreq: 0.035, densLow: 0.8, erode: 2 },
  stone: { fleckFreq: 0.6, fleckCut: 0.78, fleckGain: 30, densFreq: 0.03, densLow: 0.88, erode: 1.4 },
};

/**
 * Flecks finer than a screen pixel would shimmer as the camera moves, so their strength follows
 * the zoom: full from 1.0 up, gone at 0.6 and below. The pattern itself never changes or moves.
 */
export const fleckStrength = (zoom: number) => Math.max(0, Math.min(1, (zoom - 0.6) / 0.4));

export const inkId = (kind: InkKind, seed: number) => `ink-${kind}-${seed}`;
export const ink = (kind: InkKind, seed: number) => `url(#${inkId(kind, seed)})`;

const InkFilter: React.FC<{ kind: InkKind; seed: number; strength: number }> = ({ kind, seed, strength }) => {
  const p = PROFILE[kind];
  // alpha = clamp(gain * (noise - cut)) * strength: where the noise peaks (the flecks), 0 elsewhere
  const fleck = `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${p.fleckGain * strength} ${-p.fleckGain * p.fleckCut * strength}`;
  // density between densLow and 1
  const span = 1 - p.densLow;
  const dens = `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${span * 2.4} ${p.densLow - span * 0.7}`;
  return (
    <filter id={inkId(kind, seed)} x="-5%" y="-5%" width="110%" height="110%" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency={p.fleckFreq} numOctaves={2} seed={seed} result="fineNoise" />
      <feColorMatrix in="fineNoise" type="matrix" values={fleck} result="flecks" />
      <feMorphology in="SourceAlpha" operator="erode" radius={p.erode} result="inner" />
      <feComposite in="flecks" in2="inner" operator="in" result="innerFlecks" />
      <feComposite in="SourceGraphic" in2="innerFlecks" operator="out" result="speckled" />
      <feTurbulence type="fractalNoise" baseFrequency={p.densFreq} numOctaves={2} seed={seed + 101} result="lowNoise" />
      <feColorMatrix in="lowNoise" type="matrix" values={dens} result="density" />
      <feComposite in="speckled" in2="density" operator="in" />
    </filter>
  );
};

/** All ink filters used in a frame, declared once in the world's <defs>. */
export const InkDefs: React.FC<{ seeds: Array<[InkKind, number]>; zoom?: number }> = ({ seeds, zoom = 1 }) => {
  const strength = fleckStrength(zoom);
  return (
    <>
      {seeds.map(([k, s]) => (
        <InkFilter key={`${k}-${s}`} kind={k} seed={s} strength={strength} />
      ))}
    </>
  );
};

/** Seeds in use. Every textured shape draws its seed from here, so the defs list is complete. */
export const SEEDS = {
  priora: 11,
  siteRules: 21,
  insurer: 22,
  fire: 23,
  riskEng: 24,
  evidence: 25,
  caseRing: 31,
  caseArcs: 32,
  caseChips: 33,
  coralBridge: 34,
  worker: 41,
  site: 42,
  riskOwner: 43,
  roomRetain: 51,
  roomMitigate: 52,
  roomTransfer: 53,
  roomAgents: 54,
  safeguards: 55,
  transferAgents: 56,
  table: 61,
} as const;

export const ALL_INKS: Array<[InkKind, number]> = [
  ['cobalt', SEEDS.priora],
  ['cobalt', SEEDS.siteRules],
  ['cobalt', SEEDS.insurer],
  ['cobalt', SEEDS.fire],
  ['cobalt', SEEDS.riskEng],
  ['cobalt', SEEDS.evidence],
  ['cobalt', SEEDS.caseRing],
  ['cobalt', SEEDS.caseArcs],
  ['cobalt', SEEDS.caseChips],
  ['coral', SEEDS.coralBridge],
  ['ink', SEEDS.worker],
  ['ink', SEEDS.site],
  ['ink', SEEDS.riskOwner],
  ['coral', SEEDS.roomRetain],
  ['cobalt', SEEDS.roomMitigate],
  ['stone', SEEDS.roomTransfer],
  ['cobalt', SEEDS.roomAgents],
  ['cobalt', SEEDS.safeguards],
  ['cobalt', SEEDS.transferAgents],
  ['stone', SEEDS.table],
];
