// The text registry's item type and timing: plain data and arithmetic, no React, so the checker can read it.
import { fade } from '../lib/motion';
import type { Pt } from '../lib/geometry';

export type TextKind = 'label' | 'sentence' | 'name' | 'wordmark';

export type TextItem = {
  id: string;
  text: string;
  /** Explicit line breaks for sentences; the text field holds them joined by a space. */
  lines?: string[];
  kind: TextKind;
  font: 'mono' | 'sans500' | 'sans600';
  /** Fixed position, or a function of the frame for text that rides with its subject. */
  at: Pt | ((f: number) => Pt);
  anchor?: 'start' | 'middle' | 'end';
  /** Plain world size, or readable sizing (on-screen px at zoom 1, damped with zoom). */
  size?: number;
  readablePx?: number;
  color?: string;
  lineHeight?: number;
  /** First frame of the fade in; the arrival lasts inDur frames with a 6 px rise. */
  in: number;
  inDur?: number;
  /** First frame of the fade out (null: stays to the end of the film). */
  out: number | null;
  outDur?: number;
  /** Drawn by its component rather than the text layer (listed for the checks only). */
  drawnBy?: 'component';
  /** An extra opacity multiplier, for dissolves shared with the drawing. */
  opacity?: (f: number) => number;
};

export const textOpacity = (t: TextItem, f: number) => fade(f, t.in, t.inDur ?? 10, t.out, t.outDur ?? 10) * (t.opacity ? t.opacity(f) : 1);
export const textPos = (t: TextItem, f: number): Pt => (typeof t.at === 'function' ? t.at(f) : t.at);

