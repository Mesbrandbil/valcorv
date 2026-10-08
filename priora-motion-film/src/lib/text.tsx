import React from 'react';
import { staticFile } from 'remotion';
import { loadFont } from '@remotion/fonts';
import { useCamera } from '../camera/Camera';
import { COLOR, FONT, MONO_TRACKING_EM, READABLE_EXPONENT } from './tokens';
import type { Pt } from './geometry';

let fontsRequested = false;
/** Self-hosted IBM Plex (fetched once from Google Fonts). loadFont holds the render until each file is ready. */
export const loadFonts = () => {
  if (fontsRequested) return;
  fontsRequested = true;
  loadFont({ family: FONT.sans, url: staticFile('fonts/ibm-plex-sans-latin.woff2'), weight: '100 700', format: 'woff2' });
  loadFont({ family: FONT.mono, url: staticFile('fonts/ibm-plex-mono-500-latin.woff2'), weight: '500', format: 'woff2' });
};

type Anchor = 'start' | 'middle' | 'end';

type Sizing = { size: number; readablePx?: never } | { readablePx: number; size?: never };

type BaseProps = {
  text: string;
  at: Pt;
  anchor?: Anchor;
  color?: string;
  opacity?: number;
  /** 0 to 1: the 6 px on-screen rise as the text arrives (0 = risen and settled). */
  rise?: number;
};

const useWorldSize = (s: Sizing) => {
  const { zoom } = useCamera();
  if (s.readablePx !== undefined) return (s.readablePx * Math.pow(zoom, READABLE_EXPONENT)) / zoom;
  return s.size as number;
};

/** Status label: IBM Plex Mono 500, uppercase, letter spacing 0.08 em. */
export const Label: React.FC<BaseProps & Sizing> = ({ text, at, anchor = 'middle', color = COLOR.ink, opacity = 1, rise = 0, ...sizing }) => {
  const size = useWorldSize(sizing as Sizing);
  const { zoom } = useCamera();
  const tracking = size * MONO_TRACKING_EM;
  // Letter spacing adds trailing space after the last glyph; shift so the anchor stays honest.
  const dx = anchor === 'middle' ? tracking / 2 : anchor === 'end' ? tracking : 0;
  return (
    <text
      x={at[0] + dx}
      y={at[1] + (rise * 6) / zoom}
      fontFamily={FONT.mono}
      fontWeight={500}
      fontSize={size}
      letterSpacing={tracking}
      textAnchor={anchor}
      fill={color}
      opacity={opacity}
      style={{ fontKerning: 'normal' }}
    >
      {text}
    </text>
  );
};

/** Names and sentences: IBM Plex Sans, Medium (500) or SemiBold (600). */
export const Words: React.FC<BaseProps & Sizing & { weight?: 500 | 600; lines?: string[]; lineHeight?: number }> = ({
  text,
  at,
  anchor = 'middle',
  color = COLOR.ink,
  opacity = 1,
  rise = 0,
  weight = 500,
  lines,
  lineHeight = 1.25,
  ...sizing
}) => {
  const size = useWorldSize(sizing as Sizing);
  const { zoom } = useCamera();
  const all = lines ?? [text];
  return (
    <text
      x={at[0]}
      y={at[1] + (rise * 6) / zoom}
      fontFamily={FONT.sans}
      fontWeight={weight}
      fontSize={size}
      textAnchor={anchor}
      fill={color}
      opacity={opacity}
    >
      {all.map((l, i) => (
        <tspan key={i} x={at[0]} dy={i === 0 ? 0 : size * lineHeight}>
          {l}
        </tspan>
      ))}
    </text>
  );
};
