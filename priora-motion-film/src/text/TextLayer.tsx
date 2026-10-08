// Every free text item in the film comes from one registry (src/text/registry.ts), so the checker can
// read when each appears, where it sits and how big it is on screen. Room names, chip labels and
// agent names belong to their components; they are listed in the registry too, for the checks.
import React from 'react';
import { COLOR } from '../lib/tokens';
import { Label, Words, Wordmark } from '../lib/text';
import { arrive, fade, prog } from '../lib/motion';
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

export const TextLayer: React.FC<{ items: TextItem[]; frame: number }> = ({ items, frame }) => (
  <g>
    {items.map((t) => {
      if (t.drawnBy === 'component') return null;
      const o = textOpacity(t, frame);
      if (o <= 0.001) return null;
      const rise = 1 - prog(frame, t.in, t.in + (t.inDur ?? 10), arrive);
      const at = textPos(t, frame);
      const sizing = t.readablePx !== undefined ? { readablePx: t.readablePx } : { size: t.size ?? 24 };
      if (t.kind === 'wordmark') return <Wordmark key={t.id} at={at} size={t.size ?? 100} opacity={o} />;
      if (t.font === 'mono') return <Label key={t.id} text={t.text} at={at} anchor={t.anchor} color={t.color ?? COLOR.ink} opacity={o} rise={rise} {...sizing} />;
      return (
        <Words
          key={t.id}
          text={t.text}
          lines={t.lines}
          at={at}
          anchor={t.anchor}
          weight={t.font === 'sans600' ? 600 : 500}
          color={t.color ?? COLOR.ink}
          opacity={o}
          rise={rise}
          lineHeight={t.lineHeight}
          {...sizing}
        />
      );
    })}
  </g>
);
