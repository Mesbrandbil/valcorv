// Sequence 8: the drawing recedes in contrast beneath a paper-like atmosphere, the spark stays bright for
// one last moment beneath the words, and then everything dissolves to the paper and the wordmark.
import React from 'react';
import { prog, sparkLevel } from '../../lib/motion';
import { SPARK } from '../../lib/layout';
import { S4, S8 } from '../../lib/timeline';
import { Spark } from '../../cast/people';
import { Paper } from '../../world/Paper';

export const Seq8Overlay: React.FC<{ f: number }> = ({ f }) => {
  if (f < S8.recede[0]) return null;
  // the drawing keeps about 20 percent of its contrast, then dissolves fully
  const veil = 0.8 * prog(f, S8.recede[0], S8.recede[1]) + 0.2 * prog(f, S8.dissolve[0], S8.dissolve[1]);
  const spark = sparkLevel(f, S4.spark) * (1 - prog(f, S8.dissolve[0], S8.dissolve[0] + 30));
  return (
    <g>
      {/* the veil is the sheet itself, grain and all, so the closing wordmark still sits on paper */}
      <g opacity={veil}>
        <Paper />
      </g>
      {spark > 0 && <Spark at={SPARK} level={spark} />}
    </g>
  );
};
