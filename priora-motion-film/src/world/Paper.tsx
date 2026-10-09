import React from 'react';
import { staticFile } from 'remotion';
import { COLOR } from '../lib/tokens';
import { WORLD } from '../lib/layout';

// The sheet. Two textures, both generated once with feTurbulence (fixed seeds) by scripts/textures.mjs:
//  - paper-grain.png: a seamless 1024 px tile of fine grain with the paper colour baked in, laid at
//    2 tile pixels per world unit so it stays sharp in close shots;
//  - paper-mottle.png: one soft low-frequency variation across the whole sheet, so the paper still
//    reads as paper in the widest shot.
// Both live in world space: the paper stays still beneath the drawing. Nothing here changes per frame.
export const GRAIN_TILE_PX = 1024;
export const GRAIN_TILE_WORLD = 512;

export const PaperDefs: React.FC = () => (
  <pattern id="paper-grain" patternUnits="userSpaceOnUse" width={GRAIN_TILE_WORLD} height={GRAIN_TILE_WORLD}>
    <image href={staticFile('textures/paper-grain.png')} width={GRAIN_TILE_WORLD} height={GRAIN_TILE_WORLD} preserveAspectRatio="none" />
  </pattern>
);

export const Paper: React.FC<{ textured?: boolean }> = ({ textured = true }) => (
  <g>
    <rect x={-WORLD.width} y={-WORLD.height} width={WORLD.width * 3} height={WORLD.height * 3} fill={COLOR.paper} />
    {textured && (
      <>
        <rect x={0} y={0} width={WORLD.width} height={WORLD.height} fill="url(#paper-grain)" />
        <image href={staticFile('textures/paper-mottle.png')} x={0} y={0} width={WORLD.width} height={WORLD.height} preserveAspectRatio="none" />
      </>
    )}
  </g>
);
