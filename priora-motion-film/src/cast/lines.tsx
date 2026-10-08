import React from 'react';
import { COLOR, DASH_PX, STROKE_PX } from '../lib/tokens';
import { usePx } from '../camera/Camera';

/**
 * A line that draws on with stroke-dashoffset. progress 0 to 1. A tiny round cap at the
 * leading edge feels like ink arriving. pathLength is normalised to 1000 so progress is easy.
 */
export const DrawnLine: React.FC<{
  d: string;
  progress?: number;
  color: string;
  px: number;
  dashed?: boolean;
  opacity?: number;
  cap?: 'round' | 'butt';
}> = ({ d, progress = 1, color, px: widthPx, dashed = false, opacity = 1, cap = 'round' }) => {
  const px = usePx();
  if (progress <= 0) return null;
  const w = px(widthPx);
  if (dashed) {
    // Dashed lines reveal through a mask so the dash pattern stays fixed to the path.
    const id = `reveal-${Math.abs(hash(d))}`;
    return (
      <g opacity={opacity}>
        <mask id={id} maskUnits="userSpaceOnUse">
          <path d={d} pathLength={1000} stroke="#fff" strokeWidth={w * 3} fill="none" strokeDasharray={`${progress * 1000} 1000`} />
        </mask>
        <path d={d} stroke={color} strokeWidth={w} fill="none" strokeDasharray={`${px(DASH_PX[0])} ${px(DASH_PX[1])}`} mask={`url(#${id})`} strokeLinecap="butt" />
      </g>
    );
  }
  return (
    <path
      d={d}
      pathLength={1000}
      stroke={color}
      strokeWidth={w}
      fill="none"
      strokeLinecap={cap}
      strokeLinejoin="round"
      strokeDasharray={progress >= 1 ? undefined : `${progress * 1000} 1000`}
      opacity={opacity}
    />
  );
};

/** The human decision line: ink, about 5 px on screen, visibly heavier than any agent thread. */
export const HumanLine: React.FC<{ d: string; progress?: number; opacity?: number }> = (p) => <DrawnLine {...p} color={COLOR.ink} px={STROKE_PX.humanLine} />;

/** An agent thread: cobalt, about 2 px on screen. */
export const Thread: React.FC<{ d: string; progress?: number; opacity?: number; dashed?: boolean }> = (p) => <DrawnLine {...p} color={COLOR.cobalt} px={STROKE_PX.thread} />;

/** A dotted thread: dots travel along it at a steady speed (phase in path units, 0 to 1000). */
export const DottedThread: React.FC<{ d: string; progress?: number; opacity?: number; phase?: number; spacingPx?: number }> = ({ d, progress = 1, opacity = 1, phase = 0, spacingPx = 9 }) => {
  const px = usePx();
  if (progress <= 0) return null;
  const id = `dots-${Math.abs(hash(d))}`;
  return (
    <g opacity={opacity}>
      <mask id={id} maskUnits="userSpaceOnUse">
        <path d={d} pathLength={1000} stroke="#fff" strokeWidth={px(8)} fill="none" strokeDasharray={`${progress * 1000} 1000`} />
      </mask>
      <path d={d} stroke={COLOR.cobalt} strokeWidth={px(2.6)} fill="none" strokeLinecap="round" strokeDasharray={`0.01 ${px(spacingPx)}`} strokeDashoffset={-phase} mask={`url(#${id})`} />
    </g>
  );
};

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
};
