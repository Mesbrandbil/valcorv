// Every free text item in the film comes from one registry (src/film/texts.ts), so the checker can
// read when each appears, where it sits and how big it is on screen. Room names, chip labels and
// agent names belong to their components; they are listed in the registry too, for the checks.
import React from 'react';
import { COLOR } from '../lib/tokens';
import { Label, Words, Wordmark } from '../lib/text';
import { arrive, prog } from '../lib/motion';

export type { TextItem, TextKind } from './items';
import { textOpacity, textPos, type TextItem } from './items';

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
