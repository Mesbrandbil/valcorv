import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLOR } from '../lib/tokens';

// Rendered once by scripts/textures.mjs into public/textures. Fixed seeds; never animated.

/** A seamless 1024 px tile: paper colour with a faint, uneven, low-contrast grain baked in. */
export const PaperGrainTile: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.paper }}>
    <svg width={1024} height={1024} viewBox="0 0 1024 1024">
      <defs>
        <filter id="grain-fine" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves={3} seed={7} stitchTiles="stitch" result="n" />
          {/* dark specks where the noise is high, light specks where it is low */}
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.30  0 0 0 0 0.29  0 0 0 0 0.26  0 0 0 0.62 -0.33" result="dark" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 0.98  0 0 0 -0.62 0.27" result="light" />
          <feMerge>
            <feMergeNode in="dark" />
            <feMergeNode in="light" />
          </feMerge>
        </filter>
        <filter id="grain-uneven" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.16" numOctaves={2} seed={9} stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.38  0 0 0 0 0.36  0 0 0 0 0.32  0 0 0 0.12 -0.056" />
        </filter>
      </defs>
      <rect width={1024} height={1024} filter="url(#grain-uneven)" />
      <rect width={1024} height={1024} filter="url(#grain-fine)" />
    </svg>
  </AbsoluteFill>
);

/** One soft, low-frequency variation across the whole sheet (1440 x 810, laid over 5760 x 3240). Transparent. */
export const PaperMottle: React.FC = () => (
  <AbsoluteFill>
    <svg width={1440} height={810} viewBox="0 0 1440 810">
      <defs>
        <filter id="mottle" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.0045" numOctaves={4} seed={13} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.37  0 0 0 0 0.35  0 0 0 0 0.31  0 0 0 0.11 -0.042" />
        </filter>
      </defs>
      <rect width={1440} height={810} filter="url(#mottle)" />
    </svg>
  </AbsoluteFill>
);
